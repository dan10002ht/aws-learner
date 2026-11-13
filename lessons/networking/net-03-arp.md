# Bài 3 — ARP: gói đầu tiên vì sao chậm

## 1. Mục tiêu

Sau bài này bạn có thể:

- Tách thời gian phân giải MAC khỏi thời gian truyền gói IP bằng một bản bắt gói có timestamp.
- Dùng kết quả `ip route get` để chọn đúng IP cần tìm trong `ip neigh`, kể cả khi gọi server ngoài subnet.
- Phân biệt entry `INCOMPLETE`, `REACHABLE`, `STALE`, `DELAY`, `PROBE`, `FAILED` bằng hành vi gửi gói, thay vì coi chúng là một TTL.
- Đọc ARP request, reply và announcement theo địa chỉ Ethernet, địa chỉ sender/target và opcode.
- Tái hiện một VIP chuyển chủ nhưng client vẫn gửi về MAC cũ, rồi kiểm chứng gratuitous ARP sửa ánh xạ nào.
- Khoanh vùng lỗi ARP bằng ba bằng chứng: route đã chọn, frame đã phát và trạng thái neighbor sau phép thử.

## 2. Triệu chứng

Bạn viết một probe tới backend bằng địa chỉ IP trực tiếp. Hai lần ping liên tiếp tới `10.3.0.20` trên cùng mạng lab trả về thời gian khác nhau: lần đầu phải tìm MAC, lần sau có sẵn ánh xạ. Để khoảng chênh lệch đọc được, lab cố ý thêm `25 ms` vào chiều phát của mỗi đầu A và B. Đây là độ trễ do cấu hình, không phải tốc độ một LAN vật lý.

Bạn đoán: “Gói đầu chậm vì TCP phải bắt tay; thêm keepalive là xong.” Nhưng phép đo đang dùng ICMP, chưa có TCP, TLS hay DNS. Trong bản bắt gói, trước echo request còn có một câu hỏi `who-has 10.3.0.20 tell 10.3.0.10`.

> **Đo trên lab.** Alpine 3.20, Linux aarch64 trong Docker/colima; hai qdisc egress `netem delay 25ms`. Log `net-03/out/run.txt` và `capture.txt` được tạo bởi `./run.sh` trong thư mục lab `net-03`. Mọi IP, MAC và thời gian output ở bài này thuộc đúng topology đó; không dùng các số này làm ngưỡng cảnh báo cho mạng thật.

Câu hỏi vận hành không phải “ARP là gì” — phần giới thiệu ở [bản đồ OSI](../engineering/eng-osi-model.md) đã có. Câu hỏi là: **gói IP của bạn đang chờ ánh xạ nào, chờ ở máy nào, và sau khi đổi chủ IP thì ai còn giữ ánh xạ cũ?**

## ⏸ Dừng lại — đoán trước #1

A là `10.3.0.10`; default route đi qua `10.3.0.20`. App gọi `203.0.113.9`, neighbor cache đang trống. Trước gói IP đầu tiên, A cần tìm MAC của ai?

- (a) `203.0.113.9`, vì đó là IP đích trong request.
- (b) `10.3.0.20`, vì đó là next hop đã được route chọn.
- (c) DNS resolver, vì mọi IP đều phải qua DNS trước.
- (d) Không cần MAC khi đã có default route.

## 3. Cơ chế

### 3.1 Route chọn người nhận frame trước khi ARP hỏi

Đáp án là **(b)**. **Next hop** là nút kế tiếp mà máy gửi phải giao gói tới trên đường đã chọn. Với đích trực tiếp cùng link, next hop chính là đích; với route `via`, next hop là gateway. **ARP — Address Resolution Protocol — là giao thức tìm địa chỉ liên kết của một địa chỉ giao thức trên cùng link**; trong phạm vi bài này đó là IPv4 → Ethernet MAC.

Kernel tra route trước. Kết quả route cung cấp interface đi ra và địa chỉ neighbor cần phân giải. ARP không tự chọn gateway, cũng không tìm một MAC “ở cuối Internet”. Nếu route không tồn tại, sửa ARP cache không tạo ra đường đi. Ngược lại, có route hợp lệ vẫn có thể đứng ở bước chưa biết MAC.

Trong lab, `ip route get 203.0.113.9` trả `via 10.3.0.20 dev net03-ea src 10.3.0.10`. Vì vậy entry cần kiểm tra là `10.3.0.20 dev net03-ea`. IP đích trong packet vẫn là `203.0.113.9`; chỉ địa chỉ Ethernet của chặng đầu thuộc gateway. Chia subnet và longest prefix match đã học ở [CIDR và subnetting](../engineering/eng-02-cidr-subnetting.md); ở đây ta chỉ dùng kết quả đã chọn.

**Neighbor cache** là bảng ánh xạ địa chỉ giao thức sang địa chỉ liên kết, kèm interface và trạng thái xác nhận. Đừng đọc nó như một dictionary toàn máy chỉ có khóa IP: cùng một IP gắn với các link khác nhau không nhất thiết chỉ cùng neighbor. Trên Linux, IPv4 ARP table là một trường hợp của bảng neighbor; IPv6 dùng cơ chế khác, dành cho bài 9.

<svg viewBox="0 0 500 250" role="img" aria-labelledby="net03-a-t net03-a-d" style="width:100%;max-width:500px;height:auto;display:block;margin:1.25rem auto">
<title id="net03-a-t">Route chọn neighbor của chặng đầu</title>
<desc id="net03-a-d">Đích packet là 203.0.113.9 nhưng frame chặng đầu được giao cho gateway 10.3.0.20 trên net03-ea.</desc>
<defs><marker id="net03-a-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<rect x="15" y="65" width="130" height="65" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="80.0" y="102.5" font-size="14" text-anchor="middle" fill="currentColor">A · 10.3.0.10</text><rect x="230" y="65" width="245" height="65" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="352.5" y="102.5" font-size="14" text-anchor="middle" fill="currentColor">Gateway · 10.3.0.20</text><line x1="145" y1="97" x2="230" y2="97" stroke="currentColor" stroke-width="2" marker-end="url(#net03-a-arrow)"/><text x="250" y="30" font-size="14" text-anchor="middle" fill="currentColor">ip route get 203.0.113.9</text><text x="250" y="165" font-size="14" text-anchor="middle" fill="currentColor">Packet IP đích: 203.0.113.9</text><text x="250" y="192" font-size="14" text-anchor="middle" fill="currentColor">Frame chặng đầu: MAC gateway</text><text x="250" y="220" font-size="14" text-anchor="middle" fill="currentColor">Neighbor cần tra: 10.3.0.20 dev net03-ea</text>
</svg>

### 3.2 Trước IP có thể là một lượt hỏi–đáp ARP

**ARP request** là thông điệp hỏi ai có target IP; request phân giải ban đầu được gửi tới MAC broadcast `ff:ff:ff:ff:ff:ff`, để cả vùng quảng bá nhận được dù người hỏi chưa biết MAC đích. **ARP reply** là thông điệp trả ánh xạ; trong lượt hỏi–đáp thông thường, chủ IP trả unicast về MAC người hỏi đã có trong request.

**Broadcast domain** là tập các interface có thể nhận cùng một frame broadcast ở tầng liên kết. Switch lan request trong miền đó; router thông thường không chuyển nó sang LAN khác như một packet IP. Broadcast không có nghĩa “mọi máy trên Internet đều nghe”. Cũng đừng nhầm target hardware address trong payload ARP với Ethernet destination của frame: đây là hai trường riêng, phục vụ hai bước khác nhau.

Trong một request A hỏi B, sender IP là `10.3.0.10`, sender MAC là `02:00:00:03:00:0a`, target IP là `10.3.0.20`. A đã tự giới thiệu ánh xạ của mình trong lúc hỏi. B có đủ dữ kiện để trả lời và học A; không bắt buộc phải phát thêm một request đối xứng mới gửi được reply.

> **Nguồn.** RFC 826, phần “Packet Generation” và “Packet Reception”, quy định các trường sender/target và thuật toán cập nhật bảng. Phần tiếp nhận cho phép địa chỉ phần cứng mới thay địa chỉ cũ của một cặp đã có ([RFC 826](https://www.rfc-editor.org/rfc/rfc826.txt)). Điều này giải thích vì sao nhận một ARP mới có thể sửa entry đã có, không chỉ tạo entry sau một câu hỏi do chính mình phát.

Kernel chưa biết MAC thì chưa ghép được frame unicast cho gói IP đang đợi. Nó tạo quá trình phân giải, giữ dữ liệu chờ trong giới hạn của triển khai và phát request. Nhận reply hợp lệ thì cập nhật neighbor rồi cho dữ liệu đi. Nếu không nhận reply sau các lần thử, phân giải thất bại; ứng dụng có thể thấy timeout hoặc lỗi mà kernel báo về. Thời gian chờ của ứng dụng không bắt buộc bằng một hằng số ARP.

Đây là bản sai cần bỏ: **“ARP nằm trong gói IP đầu tiên.”** ARP được chở trực tiếp trong Ethernet với loại payload riêng; echo request là frame khác xuất hiện sau đó. Trong tcpdump có dòng ARP rồi mới đến IP. Thêm TCP keepalive có thể giảm số lần mở kết nối nhưng không biến một ARP frame thành TCP payload.

Một lần cache lạnh có thêm một lượt phân giải; không suy ra mọi request đầu đều chậm bằng nhau. Nếu ARP đã được traffic khác làm nóng, lượt hỏi không còn trên đường đi của request bạn đang đo. Nếu reply mất, chênh lệch có thể chịu retry timer. Nếu đích là gateway, truy cập một server Internet khác thường vẫn dùng cùng entry gateway. Khóa “địa chỉ IP mới của app” và khóa “neighbor mới của kernel” không đồng nhất.

### 3.3 Đọc thời gian đúng chỗ: ping RTT và timestamp capture

**RTT — round-trip time — là thời gian đo cho một lượt đi và về giữa hai đầu quan sát**. Với ping trong lab này, nó bao gồm thời gian gói echo phải chờ ARP ở đầu gửi. Đó là hành vi đã đo của công cụ này, không phải cam kết mọi bộ đo ứng dụng đều bắt đầu đồng hồ ở cùng vị trí.

Qdisc là hàng đợi/luật xử lý packet trên interface Linux. Lab gắn qdisc `netem` để trì hoãn chiều phát A và B. Request ARP từ A chịu một lần trì hoãn; reply từ B chịu một lần nữa. Sau đó echo request và echo reply cũng đi qua hai chiều ấy. Khi cache nóng, chỉ còn lượt echo. Vì thế mô hình lý tưởng dự đoán cache lạnh tốn hai lượt khứ hồi cục bộ, cache nóng tốn một lượt.

> **Suy luận.** Với hai qdisc `25 ms`, mô hình bỏ qua scheduling và thời gian xử lý cho `T_nóng = 25 + 25 = 50 ms`, `T_lạnh = 50 + 50 = 100 ms`. Đây là phép tính từ cấu hình, không phải hai số đo. Kiểm bằng hai dòng ping đầu và thứ tự ARP/ICMP trong capture; số đo thật nằm ở mục lab.

Capture ở interface gửi không nhất thiết là đồng hồ “bit vừa rời dây”: hook bắt gói có thể thấy packet trước khi qdisc cho nó đi. Vì vậy không lấy khoảng cách từ timestamp outgoing đến incoming để kết luận toàn bộ trễ nằm trên một hướng. Ta dùng capture để chứng minh **quan hệ trước–sau**, còn qdisc và ping để kiểm mô hình tổng thời gian. Muốn đo chính xác một chiều cần thống nhất vị trí bắt và đồng hồ hai đầu; bài này chưa làm phép đo đó.

<step-flow>
<svg viewBox="0 0 600 325" role="img" aria-labelledby="net03-b-t net03-b-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="net03-b-t">Cache lạnh giữ IP chờ MAC</title>
<desc id="net03-b-d">Hai lifeline cố định: ARP hỏi rồi trả lời trước khi echo request được giao. Ô cache đổi ở bước hai.</desc>
<defs><marker id="net03-b-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<rect x="20" y="15" width="140" height="42" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="90.0" y="41.0" font-size="14" text-anchor="middle" fill="currentColor">A · .10</text><rect x="410" y="15" width="160" height="42" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="490.0" y="41.0" font-size="14" text-anchor="middle" fill="currentColor">B · .20</text><line x1="90" y1="57" x2="90" y2="310" stroke="currentColor" stroke-dasharray="5 4"/><line x1="490" y1="57" x2="490" y2="310" stroke="currentColor" stroke-dasharray="5 4"/><g data-step="1" data-until="1">
<line x1="90" y1="105" x2="490" y2="105" stroke="currentColor" stroke-width="2" marker-end="url(#net03-b-arrow)"/><text x="290" y="90" font-size="14" text-anchor="middle" fill="currentColor">ARP request · broadcast</text><text x="290" y="135" font-size="14" text-anchor="middle" fill="currentColor">who-has .20 tell .10</text><rect x="190" y="270" width="220" height="35" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/><text x="300.0" y="292.5" font-size="14" text-anchor="middle" fill="currentColor">.20 → chưa có MAC</text>
</g><g data-step="2">
<line x1="490" y1="180" x2="90" y2="180" stroke="currentColor" stroke-width="2" marker-end="url(#net03-b-arrow)"/><text x="290" y="166" font-size="14" text-anchor="middle" fill="currentColor">ARP reply · .20 is-at …:0b</text><rect x="190" y="270" width="220" height="35" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/><text x="300.0" y="292.5" font-size="14" text-anchor="middle" fill="currentColor">.20 → 02:00:00:03:00:0b</text>
</g><g data-step="3">
<line x1="90" y1="225" x2="490" y2="225" stroke="currentColor" stroke-width="2" marker-end="url(#net03-b-arrow)"/><text x="290" y="214" font-size="14" text-anchor="middle" fill="currentColor">IP / ICMP · unicast tới …:0b</text>
</g>
</svg>
<step-note data-step="1">Chưa có MAC nên frame ARP phải dùng broadcast; gói IP vẫn chờ.</step-note>
<step-note data-step="2">Reply cung cấp địa chỉ liên kết và thay ô chưa phân giải trong cache.</step-note>
<step-note data-step="3">Gói IP mới được đóng frame unicast; lượt echo sau dùng lại ánh xạ.</step-note>
</step-flow>

## ⏸ Dừng lại — đoán trước #2

`ip neigh` đang ghi `10.3.0.20 ... STALE`. Gửi một ping ngay lúc ấy sẽ thế nào?

- (a) Kernel bỏ MAC cũ, chờ broadcast ARP rồi mới gửi.
- (b) Kernel có thể dùng MAC đang có để gửi, đồng thời bắt đầu quá trình kiểm tra lại khả năng tới neighbor.
- (c) Kernel cấm gửi vì STALE tương đương FAILED.

### 3.4 STALE là hết xác nhận gần đây, chưa phải hết địa chỉ

Đáp án là **(b)**, và lab cố tình ép entry sang STALE rồi gửi để kiểm chứng. **NUD — Neighbor Unreachability Detection — là cơ chế theo dõi khả năng tới neighbor**. Tên này xuất hiện trong tham số `nud` của `ip neigh`. Nó tách hai việc: có MAC để thử gửi, và có bằng chứng gần đây rằng neighbor còn tới được.

`INCOMPLETE` nghĩa là quá trình phân giải chưa có địa chỉ liên kết dùng được. `REACHABLE` nghĩa là có bằng chứng gần đây rằng neighbor tới được. Khi bằng chứng không còn đủ mới, entry có thể thành `STALE` nhưng MAC vẫn còn. Dùng một entry STALE có thể đưa nó sang `DELAY`: gửi dữ liệu trước và chờ phản hồi xác nhận, rồi mới đi vào `PROBE` nếu cần. `PROBE` là đang chủ động kiểm tra lại. `FAILED` là các lần kiểm tra đã thất bại. `PERMANENT` là entry quản trị ghim cố định, không có cùng vòng đời như entry động.

Bảng sau chỉ để đọc output sau khi đã biết cơ chế, không phải sơ đồ bao trùm mọi chuyển trạng thái:

| Trạng thái thấy trên Linux | Câu hỏi cần trả lời khi debug |
|---|---|
| INCOMPLETE | Request có ra đúng link không; reply có quay lại không? |
| REACHABLE | MAC hiện tại thuộc đúng chủ IP không, nhất là ngay sau failover? |
| STALE | MAC còn đó; lần gửi tiếp theo đi đâu? |
| DELAY / PROBE | Có traffic xác nhận hoặc phản hồi probe không? |
| FAILED | Hết các lần thử trong cấu hình hiện tại; tại sao không học được MAC? |
| PERMANENT | Ai ghim entry; cơ chế cập nhật động còn được phép thay nó không? |

Thông số `base_reachable_time_ms` không phải TTL cố định mà mọi entry bị xóa đúng hạn. `arp(7)` mô tả khoảng reachable được chọn ngẫu nhiên quanh giá trị cơ sở, và phản hồi từ tầng trên có thể kéo dài tính hợp lệ. Garbage collection — thu hồi entry — lại là công việc khác. “Hết reachable”, “chuyển STALE”, “bắt đầu probe”, “xóa khỏi bảng” là các sự kiện khác nhau.

> **Nguồn.** [arp(7)](https://man7.org/linux/man-pages/man7/arp.7.html) mô tả phản hồi dương từ tầng trên và khoảng ngẫu nhiên từ một nửa tới một lần rưỡi `base_reachable_time`; [ip-neighbour(8)](https://man7.org/linux/man-pages/man8/ip-neighbour.8.html) định nghĩa các trạng thái. Lab đọc được cơ sở `30000 ms`, delay trước probe `5 s`, retransmit `1000 ms`, multicast solicit `3`; đó là tham số trên interface lab, không phải timeout phổ quát của ARP.

Với entry không có MAC từ đầu, chờ phân giải khác với STALE dùng MAC cũ rồi kiểm lại. Đây là lý do nhìn một ảnh chụp `ip neigh` không đủ kết luận request phải bị giữ lại. Cần ghép với capture và thời điểm gửi.

<svg viewBox="0 0 500 255" role="img" aria-labelledby="net03-c-t net03-c-d" style="width:100%;max-width:500px;height:auto;display:block;margin:1.25rem auto">
<title id="net03-c-t">Có địa chỉ và có xác nhận là hai việc khác nhau</title>
<desc id="net03-c-d">Nhánh trên thể hiện phép thử STALE sang DELAY vẫn giữ MAC. Nhánh dưới chưa có MAC và phân giải thất bại.</desc>
<defs><marker id="net03-c-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="250" y="24" font-size="14" text-anchor="middle" fill="currentColor">Phép thử giữ nguyên MAC …:0b</text><rect x="15" y="55" width="150" height="46" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/><text x="90.0" y="83.0" font-size="14" text-anchor="middle" fill="currentColor">STALE</text><rect x="330" y="55" width="150" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/><text x="405.0" y="83.0" font-size="14" text-anchor="middle" fill="currentColor">DELAY</text><line x1="165" y1="78" x2="330" y2="78" stroke="currentColor" stroke-width="2" marker-end="url(#net03-c-arrow)"/><text x="250" y="64" font-size="13" text-anchor="middle" fill="currentColor">gửi IP</text><text x="250" y="130" font-size="14" text-anchor="middle" fill="currentColor">Dữ liệu được gửi bằng MAC đang có</text><rect x="15" y="175" width="150" height="46" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/><text x="90.0" y="203.0" font-size="14" text-anchor="middle" fill="currentColor">INCOMPLETE</text><rect x="330" y="175" width="150" height="46" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/><text x="405.0" y="203.0" font-size="14" text-anchor="middle" fill="currentColor">FAILED</text><line x1="165" y1="198" x2="330" y2="198" stroke="currentColor" stroke-width="2" marker-end="url(#net03-c-arrow)"/><text x="250" y="184" font-size="13" text-anchor="middle" fill="currentColor">hết thử</text><text x="250" y="248" font-size="14" text-anchor="middle" fill="currentColor">Nhánh dưới: chưa phân giải được địa chỉ</text>
</svg>

### 3.5 Failover VIP: địa chỉ không đổi, người nhận frame đã đổi

**VIP — virtual IP — là địa chỉ dịch vụ có thể được chuyển giữa các node**. Trong lab, `10.3.0.99` ban đầu ở B có MAC kết thúc `0b`, rồi được xóa ở B và gán sang C có MAC kết thúc `0c`. A không thấy API thay đổi cấu hình trên hai node ấy; nó chỉ thấy các frame đến mình. Nếu neighbor còn ánh xạ `.99 → ...:0b`, gói tiếp theo vẫn được đóng frame cho B.

[Bài 2](net-02-ethernet-mac-switch.md) đã đo cách switch học MAC. Đừng lẫn bảng này với **FDB — forwarding database — là bảng MAC → cổng của bridge/switch**. Neighbor cache nằm ở host, trả lời “IP này giao cho MAC nào”; FDB nằm ở bridge/switch, trả lời “MAC này ở cổng nào”. Di chuyển VIP giữa hai MAC thì cần sửa neighbor. Nếu hệ HA giữ nguyên một MAC ảo nhưng chuyển nó sang cổng khác, vấn đề chính có thể là FDB. Một ARP broadcast từ chủ mới có ích ở cả hai nơi vì sender MAC đi qua switch và sender IP/MAC đi tới host, nhưng hai bảng không phải một.

**Gratuitous ARP — ARP gửi chủ động không nhằm trả lời một câu hỏi đang chờ — thường được dùng để thông báo ánh xạ hiện tại**. Kiểu announcement theo RFC 5227 là ARP request broadcast có sender IP và target IP cùng là địa chỉ đang thông báo. Nó nhìn như tự hỏi chính mình, nhưng trường sender mang dữ kiện mà peer cần để cập nhật entry cũ.

**ARP probe** theo RFC 5227 lại có sender IP bằng `0.0.0.0`, target là địa chỉ định dùng; nó kiểm tra xung đột trước khi nhận địa chỉ, tránh quảng bá nhầm rằng mình đã là chủ IP ấy. Probe và announcement có thể đều là request broadcast nhưng không có cùng ý nghĩa. Chỉ nhìn chữ `Request` không đủ phân biệt; phải đọc sender/target.

## ⏸ Dừng lại — đoán trước #3

A còn `.99 → ...:0b`. Sau khi C nhận VIP, C gửi announcement `.99 → ...:0c`. Điều nào được chứng minh nếu ping từ A chạy lại?

- (a) Tất cả client trong mạng đã chuyển chủ thành công và socket cũ vẫn sống.
- (b) Neighbor entry ở A đã đổi và ICMP mới đi được trong điều kiện phép thử.
- (c) DNS TTL của VIP vừa hết hạn.

### 3.6 Announcement sửa ánh xạ, không chuyển toàn bộ trạng thái dịch vụ

Đáp án **(b)**. Lab đọc entry ở A trước/sau và thấy ping phục hồi. Nó không đo mọi peer, không dựng TCP session, không chuyển state của backend. Một kết nối còn phụ thuộc socket, firewall, conntrack và ứng dụng. Với TLS và TCP hãy dùng bài [TCP/TLS](../engineering/eng-03-tcp-tls.md) làm nền; không suy từ một echo reply ra tính liên tục của phiên.

> **Nguồn.** [RFC 5227 §1.1 và §2.3](https://www.rfc-editor.org/rfc/rfc5227.txt) phân biệt probe và announcement. [Linux ip-sysctl, `arp_accept`](https://docs.kernel.org/networking/ip-sysctl.html) phân biệt tạo entry mới với cập nhật entry đã có: setting này điều khiển việc học các địa chỉ chưa nằm trong bảng, không đồng nghĩa “tắt mọi cập nhật GARP”. `drop_gratuitous_arp` là một điều khiển khác có thể loại frame gratuitous ARP.

Vì thế câu “cứ gửi GARP là cả mạng sửa ngay” vượt quá bằng chứng. Frame có thể mất, bị lọc, nằm sai VLAN, hoặc peer dùng entry cố định/chính sách khác. Đã có `.99` trong bảng A ở lab là một điều kiện quan trọng. Muốn kiểm riêng việc học địa chỉ hoàn toàn mới phải xóa entry và đọc `arp_accept`, không dùng kết quả cập nhật entry cũ để trả lời.

Cũng không bật hai chủ VIP rồi mong announcement quyết định node nào đúng. ARP không có chữ ký hay quyền sở hữu dịch vụ trong các trường vừa xem; nó mang lời khai ánh xạ. Hai node cùng quảng bá có thể làm cache đổi qua lại. Chính hệ thống bầu chủ và loại chủ cũ phải đảm bảo quyền dùng VIP, còn ARP chỉ giúp neighbor biết đường giao frame sau đó.

> **Chưa đo.** Lab không triển khai fencing, VRRP, mất announcement, client khác Linux hay chuyển trạng thái TCP. Để đánh giá HA cần chạy traffic dịch vụ liên tục, đo thời điểm chủ cũ dừng, thời điểm peer đổi MAC và thời điểm request mới thành công; không lấy số RTT ở đây làm thời gian failover production.

<step-flow>
<svg viewBox="0 0 500 325" role="img" aria-labelledby="net03-d-t net03-d-d" style="width:100%;max-width:500px;height:auto;display:block;margin:1.25rem auto">
<title id="net03-d-t">VIP đổi chủ và cache ở A đổi sau announcement</title>
<desc id="net03-d-d">B và C cố định vị trí. VIP rời B sang C, entry ở A vẫn cũ tới bước ba rồi thay ngay tại cùng tọa độ.</desc>
<defs><marker id="net03-d-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<rect x="15" y="35" width="150" height="60" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="90.0" y="70.0" font-size="14" text-anchor="middle" fill="currentColor">A · .10</text><rect x="330" y="35" width="150" height="60" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="405.0" y="70.0" font-size="14" text-anchor="middle" fill="currentColor">B · …:0b</text><rect x="330" y="235" width="150" height="60" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="405.0" y="270.0" font-size="14" text-anchor="middle" fill="currentColor">C · …:0c</text><g data-step="1" data-until="1">
<rect x="330" y="105" width="150" height="32" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/><text x="405.0" y="126.0" font-size="14" text-anchor="middle" fill="currentColor">VIP .99</text>
</g><g data-step="1" data-until="2">
<rect x="15" y="145" width="205" height="35" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/><text x="117.5" y="167.5" font-size="14" text-anchor="middle" fill="currentColor">.99 → …:0b</text>
</g><g data-step="2" data-until="2">
<rect x="330" y="195" width="150" height="32" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/><text x="405.0" y="216.0" font-size="14" text-anchor="middle" fill="currentColor">VIP .99</text><line x1="165" y1="65" x2="330" y2="65" stroke="currentColor" stroke-width="2" marker-end="url(#net03-d-arrow)"/><text x="250" y="50" font-size="13" text-anchor="middle" fill="currentColor">gửi nhầm B</text>
</g><g data-step="3">
<rect x="330" y="195" width="150" height="32" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/><text x="405.0" y="216.0" font-size="14" text-anchor="middle" fill="currentColor">VIP .99</text><rect x="15" y="145" width="205" height="35" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/><text x="117.5" y="167.5" font-size="14" text-anchor="middle" fill="currentColor">.99 → …:0c</text><line x1="330" y1="265" x2="90" y2="185" stroke="currentColor" stroke-width="2" marker-end="url(#net03-d-arrow)"/><text x="155" y="260" font-size="13" text-anchor="middle" fill="currentColor">announcement .99</text><line x1="165" y1="80" x2="330" y2="250" stroke="#10b981" stroke-width="2" marker-end="url(#net03-d-arrow)"/>
</g>
</svg>
<step-note data-step="1">A đã học VIP thuộc MAC của B.</step-note>
<step-note data-step="2">Chỉ đổi chủ IP; A vẫn giao frame cho B vì chưa có ánh xạ mới.</step-note>
<step-note data-step="3">C quảng bá sender IP/MAC; entry cũ ở A được thay và frame mới tới C.</step-note>
</step-flow>

## 4. Lab

### 4.1 Dựng đúng phạm vi để đo

Toàn bộ script và log ở thư mục lab `net-03`: `run.sh`, `lab.sh`, `out/run.txt`, `out/capture.txt`; bản nguồn tải bằng curl nằm trong `src/`. Trên máy có Docker, lưu hai script vào cùng thư mục rồi chạy `./run.sh`. Wrapper mount thư mục hiện tại thành `/lab`, chạy Alpine 3.20 và ghi stdout/stderr bằng `tee`; trap dọn đúng container `net03-lab`. Không dùng script trên host Linux production: các lệnh quản trị mạng phải nằm trong container lab riêng.

Container cần `--privileged` để tạo và gắn network namespace; chỉ `NET_ADMIN` chưa giải quyết việc mount namespace trong cách dựng này. Không dùng `--network host`; cả ba namespace và bridge nằm trong mạng riêng của container. Mọi tên thiết bị/namespace có tiền tố `net03-` và biến mất khi container bị dọn.

Một **network namespace** là không gian mạng riêng của Linux có interface, route và bảng neighbor riêng. Ở bài này, coi A/B/C là ba máy tách biệt; bài 4 sẽ dựng dây ảo nối chúng. Các lệnh quyết định trong `lab.sh`:

```sh
ip netns add net03-a
ip link add net03-a type veth peer name net03-ea
ip link set net03-ea netns net03-a
ip link set net03-a master net03-br
ip -n net03-a addr add 10.3.0.10/24 dev net03-ea
ip netns exec net03-a tc qdisc add dev net03-ea root netem delay 25ms
```

Script bật link ở cả hai đầu, cấu hình B `.20` và C `.30`, gán MAC cố định lần lượt kết thúc `0a`, `0b`, `0c`. Nó tắt IPv6 để giảm frame ngoài phép thử và **tắt IPv4 forwarding trong mỗi namespace** để chủ VIP cũ không vô tình đóng vai router. Nếu bỏ điều kiện này, gói gửi nhầm B có thể vẫn được B chuyển tới C, che mất lỗi neighbor muốn quan sát.

### 4.2 Cho giả thuyết “chậm do TCP” thất bại

Bắt gói ở A trước, đợi tcpdump sẵn sàng rồi gửi hai echo. Lệnh chạy thật:

```sh
ip netns exec net03-a tcpdump -l -n -e -tttt \
  -i net03-ea 'arp or icmp'
ip netns exec net03-a ping -n -c 2 -i 0.3 10.3.0.20
ip -n net03-a neigh show
```

Dòng `-e` giữ Ethernet header để thấy MAC; `-n` không phân giải tên, tránh thêm một phụ thuộc DNS vào việc đọc log. Tcpdump chạy nền trong script và nhận SIGINT khi đo xong, để flush capture trước lúc container bị dọn.

Trích nguyên dòng từ log lab:

```text
64 bytes from 10.3.0.20: icmp_seq=1 ttl=64 time=105 ms
64 bytes from 10.3.0.20: icmp_seq=2 ttl=64 time=59.4 ms
10.3.0.20 dev net03-ea lladdr 02:00:00:03:00:0b REACHABLE
```

Bốn frame đầu trong `out/capture.txt`:

```text
2026-11-13 04:23:04.750416 02:00:00:03:00:0a > ff:ff:ff:ff:ff:ff, ethertype ARP (0x0806), length 42: Request who-has 10.3.0.20 tell 10.3.0.10, length 28
2026-11-13 04:23:04.775618 02:00:00:03:00:0b > 02:00:00:03:00:0a, ethertype ARP (0x0806), length 42: Reply 10.3.0.20 is-at 02:00:00:03:00:0b, length 28
2026-11-13 04:23:04.800880 02:00:00:03:00:0a > 02:00:00:03:00:0b, ethertype IPv4 (0x0800), length 98: 10.3.0.10 > 10.3.0.20: ICMP echo request, id 56, seq 1, length 64
2026-11-13 04:23:04.829788 02:00:00:03:00:0b > 02:00:00:03:00:0a, ethertype IPv4 (0x0800), length 98: 10.3.0.20 > 10.3.0.10: ICMP echo reply, id 56, seq 1, length 64
```

Đọc thứ tự chứ không chỉ hai số RTT: request ARP broadcast hỏi `.20`, reply từ `...:0b`, rồi echo request tới `...:0b` và echo reply. Lần echo sau không phải hỏi lại ngay. Đó là bằng chứng bác bỏ TCP handshake: không có TCP trong phép thử mà hiệu ứng vẫn tồn tại. Không được biến một cặp mẫu thành thống kê p95; muốn phân phối phải lặp lại với cache reset có kiểm soát và giữ riêng từng lượt.

### 4.3 Ép STALE, rồi gửi trước khi phán entry hỏng

```sh
ip -n net03-a neigh replace 10.3.0.20 \
  lladdr 02:00:00:03:00:0b nud stale dev net03-ea
ip -n net03-a neigh show
ip netns exec net03-a ping -n -c 1 10.3.0.20
ip -n net03-a neigh show
```

Trích nguyên dòng từ log lab:

```text
10.3.0.20 dev net03-ea lladdr 02:00:00:03:00:0b STALE
64 bytes from 10.3.0.20: icmp_seq=1 ttl=64 time=52.1 ms
10.3.0.20 dev net03-ea lladdr 02:00:00:03:00:0b DELAY
```

Đây là chuyển trạng thái do ta chủ động tạo để tách cơ chế, không phải bằng chứng đã chờ đủ thời gian tự nhiên cho entry lão hóa. MAC trước và sau giữ nguyên; trạng thái đổi. Ghép với capture để thấy dữ liệu không phải chờ một broadcast phân giải mới chỉ vì chữ STALE.


### 4.4 Chuyển VIP, giữ bản sai chạy trước

Script thêm `.99` vào B và ping từ A để cache có entry. Sau đó chỉ xóa/gán địa chỉ, **chưa thông báo**:

```sh
ip -n net03-b addr del 10.3.0.99/24 dev net03-eb
ip -n net03-c addr add 10.3.0.99/24 dev net03-ec
ip netns exec net03-a ping -n -c 1 -W 1 10.3.0.99
ip -n net03-a neigh show 10.3.0.99
```

Trích nguyên dòng từ log lab:

```text
1 packets transmitted, 0 received, 100% packet loss, time 0ms
10.3.0.99 dev net03-ea lladdr 02:00:00:03:00:0b REACHABLE
```

Cả hai node đã được cấu hình địa chỉ đúng nhưng A vẫn giao frame cho MAC cũ. Một lần thất bại chưa chứng minh mạng sẽ treo vô hạn: entry có thể được kiểm tra lại sau. Nó chứng minh riêng **đổi IP trên server không đồng bộ tức thì neighbor cache của client**.

Bây giờ C chủ động thông báo:

```sh
ip netns exec net03-c arping -U -c 2 -I net03-ec 10.3.0.99
ip -n net03-a neigh show 10.3.0.99
ip netns exec net03-a ping -n -c 1 10.3.0.99
```

Trích nguyên dòng từ log lab:

```text
Sent 2 probes (2 broadcast(s))
Received 0 response(s)
10.3.0.99 dev net03-ea lladdr 02:00:00:03:00:0c STALE
64 bytes from 10.3.0.99: icmp_seq=1 ttl=64 time=55.2 ms
```

`arping -U` ở bộ iputils trong lab tạo request announcement; đọc capture sẽ thấy `who-has 10.3.0.99 tell 10.3.0.99`. “Received 0 response(s)” của arping không làm phép thử thất bại: mục tiêu của thông báo là peer học sender, không phải thu một ARP reply. Kết quả cần đo nằm ở entry của A và ping sau đó. C không có qdisc `25 ms` như B, nhưng capture còn cho thấy C phải hỏi MAC của A trước khi trả echo. Không so trực tiếp RTT sau failover với lượt cache nóng ở B để kết luận GARP “tăng tốc mạng”.

### 4.5 Đích không tồn tại và chuỗi khoanh vùng

Cuối cùng gửi tới `.77`, địa chỉ không được gán cho namespace nào:

```sh
ip netns exec net03-a ping -n -c 1 -W 4 10.3.0.77
ip -n net03-a neigh show 10.3.0.77
```

Trích nguyên dòng từ log lab:

```text
From 10.3.0.10 icmp_seq=1 Destination Host Unreachable
10.3.0.77 dev net03-ea FAILED
```

Thấy `FAILED` thì bắt đầu từ link, không sửa HTTP timeout. Đọc route để xác định neighbor phải hỏi; bắt đúng interface để biết request có ra; bắt ở đầu bên kia để biết request có tới và reply có phát; so lại MAC/IP/VLAN để biết reply có về đúng link. Khi có reply mà không học, mới kiểm chính sách neighbor, entry quản trị và frame có hợp lệ không.

Đổi timeout ứng dụng trong khi chưa có MAC không làm server nhận request. Xóa toàn bộ neighbor cache có thể tạm che entry sai nhưng cũng làm các kết nối khác phải phân giải lại; trong chẩn đoán nên thao tác đúng entry trong namespace lab, ghi trạng thái cũ trước khi xóa. Bảng cache là bằng chứng, không chỉ là thứ cần “clear cho sạch”.

## 5. Tính tay

### 5.1 Chênh lệch cache lạnh lấy từ đâu?

**Dữ kiện suy luận:** A và B đều thêm `25 ms` chiều phát, không mất frame; bỏ qua xử lý. ARP request/reply tốn `25 + 25 = 50 ms`. Echo request/reply cũng tốn `50 ms`. Vậy lần lạnh `100 ms`, lần nóng `50 ms`, chênh `50 ms`; lạnh bằng `2` lần nóng. Đây là mô hình đường đi tuần tự, không phải phép cộng thêm một TCP handshake.

Nếu đo thật lệch vài ms, chưa đủ nói mô hình sai: qdisc và scheduler có sai số. Nếu capture cho thấy echo đã phát trước khi nhận ARP reply, cần xem entry có thật sự bị xóa, packet đang dùng link nào, hay có cơ chế khác cấp MAC; mô hình “cache lạnh” chưa đúng điều kiện.

### 5.2 Có bao nhiêu entry chỉ từ route?

**Dữ kiện giả định:** A có một gateway, app gọi `40` IP Internet khác nhau, tất cả route qua cùng gateway trên cùng interface; không có proxy ARP hoặc route on-link bổ sung. Hỏi cần `40` neighbor entry cho các IP đó không?

Không. Với các luồng ấy, A cần ánh xạ của **một next hop**. Đổi IP đích ở tầng ứng dụng không đổi neighbor của chặng đầu. Nếu app còn gọi hai host trực tiếp cùng LAN thì đó là hai neighbor khác; tổng có thể là ba entry liên quan, không phải số domain hay socket đang mở.

### 5.3 Tại sao số `30000` không phải lệnh chờ đúng 30 giây?

**Dữ kiện nguồn:** `base_reachable_time_ms = 30000` trong log; `arp(7)` mô tả khoảng một nửa tới một lần rưỡi giá trị cơ sở. Đổi đơn vị: `30000 / 1000 = 30 s`; khoảng tính tay là `15–45 s`. Đây là khoảng reachable theo cơ chế được mô tả, không là thời điểm xóa entry hay thời gian failover tối đa. Phản hồi xác nhận có thể làm thay đổi diễn biến; lần dùng STALE và các bước probe còn là phần khác.


## 6. Chuyển giao

1. Một worker gọi hàng trăm endpoint Internet nhưng chỉ request đầu sau khi reboot chậm. Bạn sẽ xem IP nào trong neighbor cache, và cần bằng chứng route nào trước khi chọn nó?
2. App báo connect timeout; capture thấy ARP request lặp lại mà không có SYN. Bạn cần bắt thêm ở đâu để phân biệt sai VLAN với target không chạy?
3. Hai client cùng LAN sau failover: một client thành công, một client timeout. Bạn sẽ lấy những trường nào từ `ip neigh`, cấu hình link và capture ở mỗi client? Vì sao ping từ chính node mới không đủ chứng minh?
4. IP dịch vụ giữ nguyên, MAC ảo cũng giữ nguyên nhưng vị trí cổng đổi. Bảng nào có khả năng cũ? Một frame do chủ mới phát giúp switch biết điều gì?
5. Sau khi xóa entry, GARP không tạo lại entry; khi entry đã tồn tại, GARP lại sửa được. Bạn sẽ đọc setting nào trước khi kết luận kernel bỏ mọi GARP?
6. Một hệ HA chuyển VIP và MAC thành công, client mở kết nối mới được nhưng socket cũ mất. Bạn cần thêm những lớp trạng thái nào để giải thích mà không đổ lại lỗi cho ARP?
7. **Câu khó nhất, để tự điều tra:** hai node cùng quảng bá một VIP, trong khi hai nhóm client nằm sau hai switch khác nhau. Thiết kế phép đo để phân biệt cache cập nhật qua lại, vòng lặp tầng liên kết và forwarding bất đối xứng, chỉ với quyền bắt gói ở các node và đọc bảng ở hai switch. Dữ kiện nào đủ bác bỏ từng giả thuyết?

## 7. Tóm tắt

- Route quyết định next hop và interface trước khi phân giải MAC; MAC chặng đầu có thể thuộc gateway, không thuộc IP đích cuối.
- ARP request/reply là frame riêng; cache lạnh có thể giữ gói IP chờ một lượt phân giải.
- STALE vẫn có MAC; lab ép STALE rồi gửi thành công và thấy DELAY, không cần coi STALE như FAILED.
- Reachable timer, quá trình probe và thu hồi entry là các việc khác nhau; `30000 ms` không đồng nghĩa xóa đúng sau `30 s`.
- Chuyển VIP sang MAC mới đòi peer biết ánh xạ mới; gratuitous ARP trong lab cập nhật entry đã tồn tại ở A.
- Neighbor cache ánh xạ IP → MAC, FDB ánh xạ MAC → cổng; chúng trả lời hai câu hỏi khác nhau.
- ICMP phục hồi không chứng minh phiên TCP cũ hay mọi client đã failover thành công.

→ **Bài 4 — Bridge, veth, VLAN: dựng mạng bằng tay**: tháo topology lab thành từng interface và theo một frame qua các cổng để thấy miền broadcast thực sự nằm ở đâu.
