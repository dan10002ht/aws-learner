# Bài 4 — Bridge, veth, VLAN: dựng mạng bằng tay

## 1. Mục tiêu

Sau bài này bạn có thể:

- Từ một interface trong namespace, tìm đúng đầu veth ở ngoài bằng peer index rồi xác định bridge chứa nó.
- Dựng một mạng dùng namespace, veth và Linux bridge mà bridge không cần có địa chỉ IP.
- Giải thích vì sao cùng subnet và cùng bridge vẫn có thể không liên lạc được khi hai cổng thuộc hai VLAN khác nhau.
- Kiểm riêng ba cấu hình: có membership VLAN, đã bật VLAN filtering, và quy tắc ingress/egress trên từng cổng.
- Bắt một frame ở trunk để đối chiếu VLAN tag với subinterface nhận nó, thay vì kết luận từ capture trên interface bất kỳ.
- Tạo lỗi thiếu membership trên trunk rồi phân biệt nó với sai ARP cache và sai route bằng output trước–sau.

## 2. Triệu chứng

Bạn tạo hai namespace như hai container: A là `10.4.0.10/24`, B là `10.4.0.20/24`. Hai đầu dây ảo phía ngoài đã cắm vào `net04-br`. Bảng cấu hình ghi cổng A thuộc VLAN `10`, cổng B thuộc VLAN `20`. Bạn cho rằng chúng đã tách mạng, nhưng A vẫn ping được B:

```text
64 bytes from 10.4.0.20: icmp_seq=1 ttl=64 time=0.089 ms
```

Đây là dòng thật từ phần `VLAN RULES BUT FILTER OFF` của `net-04/out/run.txt`. Không có router nối hai VLAN, không có NAT. Thay đổi duy nhất tiếp theo là bật `vlan_filtering`; giữ nguyên địa chỉ và route, ping thất bại, neighbor đi tới `FAILED`.

> **Đo trên lab.** Alpine 3.20, iproute2 6.9.0, Linux 6.8.0-64-generic aarch64 trong Docker/colima. `./run.sh` ở thư mục lab `net-04` dựng topology, đo, ghi `out/run.txt` cùng `out/trunk.txt`, rồi dọn container `net04-lab`. Số `0,089 ms` thuộc một echo trong VM, không đại diện latency production. Phép thử quan trọng là chuyển từ thông sang chặn khi chỉ đổi cờ lọc VLAN.

Bài [ARP](net-03-arp.md) vừa cho thấy một gói có thể chờ ngay trước lúc gửi vì thiếu MAC. Bài này lùi thêm một bước: **request ARP được phép đi qua những cổng nào để tìm MAC đó?** Không có đường tầng liên kết thì chỉnh cache hay tăng timeout HTTP đều không tạo ra đường đi.

## ⏸ Dừng lại — đoán trước #1

Vì sao A/B vẫn ping được dù bảng VLAN đã có hai dòng khác nhau?

- (a) IP cùng subnet luôn thắng cấu hình VLAN.
- (b) `bridge vlan add` chỉ tạo cấu hình; bridge còn đang tắt VLAN filtering nên chưa dùng cấu hình ấy để cô lập frame.
- (c) Ping không chịu tác động của VLAN vì ICMP nằm dưới Ethernet.
- (d) Mọi Linux bridge tự định tuyến giữa các VLAN.

## 3. Cơ chế

### 3.1 Namespace là ngăn mạng, veth là dây nối hai interface

Đáp án là **(b)**. Nhưng trước khi bật một cờ, cần vẽ đúng nơi interface sống. **Network namespace là không gian mạng riêng của Linux, tách thiết bị mạng, stack giao thức, route, luật firewall và socket khỏi namespace khác.** Tạo namespace chưa tạo dây dẫn tới nó. Nó có một loopback riêng; interface muốn xuất hiện ở đó phải được tạo trong đó hoặc chuyển vào.

**Veth — virtual Ethernet — là cặp thiết bị Ethernet ảo nối với nhau: frame gửi vào một đầu được nhận ở đầu còn lại.** Nó không phải “hai tên của cùng card”. Hai đầu là hai interface có index riêng, có thể đặt ở hai namespace khác nhau. Chuyển một đầu vào A không kéo đầu kia đi cùng; chính sự tách vị trí này tạo ra đường qua ranh giới namespace.

Lab tạo cặp `net04-a` ↔ `net04-ea`, rồi chuyển `net04-ea` vào namespace `net04-a`. Namespace và đầu dây phía ngoài trùng tên là cách đặt tên của lab, không phải Linux buộc chúng là một đối tượng. Khi đọc lệnh, phân biệt `ip netns exec net04-a ...` chọn namespace với `ip link set net04-a ...` chọn interface trong namespace hiện tại.

> **Nguồn.** [veth(4)](https://man7.org/linux/man-pages/man4/veth.4.html) nêu thiết bị veth luôn được tạo theo cặp nối với nhau; [network_namespaces(7)](https://man7.org/linux/man-pages/man7/network_namespaces.7.html) liệt kê tài nguyên mạng được cô lập. Vì cặp dây có hai đầu độc lập, quyền nhìn interface hay chạy tcpdump phải đặt trong đúng namespace, không chỉ dùng đúng chuỗi tên.

Địa chỉ IP thuộc `net04-ea` ở A; đầu `net04-a` bên ngoài không cần có IP để chuyển frame. Khi A phát một ARP request, frame xuất hiện ở đầu bên kia. Chỉ tới đó thôi: nếu đầu ngoài chưa cắm vào bridge hoặc đường khác, không có phép nối tự động từ cặp A sang cặp B.

**Ifindex là chỉ số định danh interface trong một namespace.** Khi `ip link` hiện `net04-ea@if5`, phần `if5` trỏ tới index của peer, không bảo rằng A đang có một interface tên `if5`. Lấy `peer_ifindex` bằng `ethtool -S`, rồi tìm index ấy ở namespace chứa peer. Index không phải ID toàn hệ thống duy nhất để đem tra bừa mọi namespace; context đi kèm mới giúp tìm đúng đầu.

<svg viewBox="0 0 520 430" role="img" aria-labelledby="net04-a-t net04-a-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net04-a-t">Namespace, hai đầu veth và bridge</title>
<desc id="net04-a-d">Endpoint A nối qua một cặp veth tới cổng bridge. Bridge nối thêm B và C; không có IP trên bridge.</desc>
<defs><marker id="net04-a-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<rect x="10" y="10" width="500" height="80" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="260" y="35" font-size="14" text-anchor="middle" fill="currentColor">Namespace net04-a</text><rect x="160" y="48" width="200" height="32" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="260.0" y="69.0" font-size="14" text-anchor="middle" fill="currentColor">net04-ea · 10.4.0.10</text><line x1="260" y1="80" x2="260" y2="130" stroke="currentColor" stroke-width="2" marker-end="url(#net04-a-arrow)"/><text x="325" y="112" font-size="13" text-anchor="middle" fill="currentColor">cặp veth</text><rect x="160" y="130" width="200" height="32" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="260.0" y="151.0" font-size="14" text-anchor="middle" fill="currentColor">net04-a · cổng bridge</text><rect x="40" y="180" width="440" height="85" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/><text x="260" y="210" font-size="14" text-anchor="middle" fill="currentColor">net04-br · không có IPv4</text><text x="260" y="240" font-size="14" text-anchor="middle" fill="currentColor">FDB: MAC + VLAN → cổng</text><line x1="260" y1="162" x2="260" y2="180" stroke="currentColor" stroke-width="2" marker-end="url(#net04-a-arrow)"/><line x1="130" y1="265" x2="130" y2="315" stroke="currentColor" stroke-width="2" marker-end="url(#net04-a-arrow)"/><line x1="390" y1="265" x2="390" y2="315" stroke="currentColor" stroke-width="2" marker-end="url(#net04-a-arrow)"/><rect x="30" y="315" width="200" height="32" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="130.0" y="336.0" font-size="14" text-anchor="middle" fill="currentColor">net04-b ↔ net04-eb</text><rect x="290" y="315" width="200" height="32" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="390.0" y="336.0" font-size="14" text-anchor="middle" fill="currentColor">net04-c ↔ net04-ec</text><text x="130" y="375" font-size="14" text-anchor="middle" fill="currentColor">B · VLAN 20</text><text x="390" y="375" font-size="14" text-anchor="middle" fill="currentColor">C · trunk 10 / 20</text><text x="260" y="410" font-size="14" text-anchor="middle" fill="currentColor">Mỗi nét nối là đường frame, không phải route IP</text>
</svg>

### 3.2 Bridge là bộ chuyển frame, không phải gateway bắt buộc

**Linux bridge là thiết bị phần mềm nối các đoạn Ethernet bằng việc lọc và chuyển frame theo MAC đích.** Nó đảm nhận vai trò switch trong lab. Lệnh `ip link set net04-a master net04-br` gắn đầu veth phía ngoài thành một cổng của bridge. Khi đó frame từ A tới cổng này có thể được bridge chuyển sang cổng khác đủ điều kiện.

[Bài 2](net-02-ethernet-mac-switch.md) đã đi sâu switch học MAC; ở đây ta dùng kết quả đó để dựng dây. **FDB — forwarding database — là bảng ánh xạ MAC và, khi có nhận biết VLAN, ngữ cảnh VLAN sang cổng bridge.** Bridge học từ MAC nguồn của frame đi vào. Nó không cần A chạy DHCP và không cần biết HTTP path; frame ARP cũng mang MAC nguồn để học.

Khi MAC đích đã có vị trí hợp lệ, bridge có thể chuyển unicast tới cổng đó. Broadcast được lan tới các cổng thuộc miền được phép; unknown unicast — frame có MAC đích chưa có trong FDB — cũng có thể bị flood tùy cấu hình cổng. **Flood là sao chép frame ra nhiều cổng đủ điều kiện**, không phải gửi vòng qua mọi node theo một chuỗi. Trong bài này ta không thay các cờ flood hay bật STP; topology không có vòng lặp.

Tách hai luồng việc trong đầu: chuyển frame xuyên bridge, và host tham gia mạng bằng chính interface bridge. Luồng thứ nhất không đòi bridge có IP. Luồng thứ hai có thể cần IP trên bridge hoặc VLAN interface tương ứng để host làm một endpoint/gateway. Gán IP để ping từ host khác với điều kiện để A/B được bridge chuyển frame qua.

> **Nguồn.** [Linux Ethernet Bridging](https://docs.kernel.org/networking/bridge.html) mô tả bridge là thiết bị hoạt động ở tầng liên kết, chuyển theo MAC đích; mục VLAN nói khi bật filtering, forwarding xét cả MAC đích và VLAN tag. [bridge(8), FDB](https://man7.org/linux/man-pages/man8/bridge.8.html) phân biệt entry local/permanent với dynamic có thể lão hóa.

Vì vậy không đọc mọi dòng `bridge fdb show` như “MAC một container vừa được học”. Output còn có địa chỉ local, multicast và entry permanent. Với lab, MAC endpoint được gán cố định `02:00:00:04:00:0a`, `...:0b`, `...:0c`; các dòng chứa chúng là nơi đối chiếu traffic. MAC đầu veth ngoài và MAC của bridge có thể do hệ thống sinh, không được đánh đồng với endpoint.

Cũng không nhìn `ip neigh` trên namespace chứa bridge rồi kết luận “switch chưa học container”. Neighbor cache phục vụ IP → MAC của chính IP stack đó, còn FDB phục vụ MAC → cổng của bridge. Một bridge không có IP vẫn có thể có FDB đã học và chuyển traffic giữa các namespace; lab sẽ cho thấy đúng trường hợp này.

<step-flow>
<svg viewBox="0 0 500 400" role="img" aria-labelledby="net04-b-t net04-b-d" style="width:100%;max-width:500px;height:auto;display:block;margin:1.25rem auto">
<title id="net04-b-t">Bridge học từ nguồn rồi lan broadcast</title>
<desc id="net04-b-d">Topology cố định A tới bridge, hai nhánh B C. Khi chưa lọc VLAN request được lan tới B C; reply từ B làm bridge học cổng B.</desc>
<defs><marker id="net04-b-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<rect x="10" y="120" width="115" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="67.5" y="150.0" font-size="14" text-anchor="middle" fill="currentColor">A · …:0a</text><rect x="185" y="120" width="130" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="250.0" y="150.0" font-size="14" text-anchor="middle" fill="currentColor">net04-br</text><rect x="385" y="30" width="105" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="437.5" y="60.0" font-size="14" text-anchor="middle" fill="currentColor">B · …:0b</text><rect x="385" y="220" width="105" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="437.5" y="250.0" font-size="14" text-anchor="middle" fill="currentColor">C · …:0c</text><g data-step="1">
<line x1="125" y1="145" x2="185" y2="145" stroke="currentColor" stroke-width="2" marker-end="url(#net04-b-arrow)"/><rect x="130" y="305" width="260" height="32" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/><text x="260.0" y="326.0" font-size="14" text-anchor="middle" fill="currentColor">FDB: …:0a → net04-a</text>
</g><g data-step="2">
<line x1="315" y1="135" x2="385" y2="65" stroke="currentColor" stroke-width="2" marker-end="url(#net04-b-arrow)"/><line x1="315" y1="155" x2="385" y2="235" stroke="currentColor" stroke-width="2" marker-end="url(#net04-b-arrow)"/><text x="270" y="50" font-size="14" text-anchor="middle" fill="currentColor">ARP broadcast · filtering 0</text>
</g><g data-step="3">
<line x1="385" y1="65" x2="315" y2="130" stroke="#10b981" stroke-width="2" marker-end="url(#net04-b-arrow)"/><line x1="185" y1="155" x2="125" y2="155" stroke="#10b981" stroke-width="2" marker-end="url(#net04-b-arrow)"/><rect x="130" y="350" width="260" height="32" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/><text x="260.0" y="371.0" font-size="14" text-anchor="middle" fill="currentColor">FDB: …:0b → net04-b</text>
</g>
</svg>
<step-note data-step="1">Frame từ A đi vào cổng ngoài; bridge học vị trí MAC nguồn, không cần IP trên bridge.</step-note>
<step-note data-step="2">Ở lượt filter tắt, broadcast lan qua hai nhánh. Đây không phải một chuỗi A–B–C.</step-note>
<step-note data-step="3">Reply của B cung cấp nguồn mới cho FDB; đường về A đã có từ bước đầu.</step-note>
</step-flow>

### 3.3 VLAN chia miền frame, không chia địa chỉ bằng phép tính subnet

**VLAN — virtual LAN — là miền tầng liên kết được phân biệt bằng VLAN ID trên hệ thống bridge nhận biết VLAN.** Đường đi của một frame phụ thuộc miền ấy trước khi host đích được thấy payload IP. Có thể cấu hình hai máy cùng `/24` vào hai VLAN khác nhau; điều đó không kéo broadcast qua ranh giới VLAN.

Ngược lại, đặt hai máy vào hai IP subnet trên cùng một miền Ethernet không tự biến chúng thành hai VLAN. Chia subnet là quyết định của IP stack; VLAN quyết định cổng nào có thể nhận frame. Phần tính CIDR ở [bài CIDR](../engineering/eng-02-cidr-subnetting.md) không lặp lại ở đây. Ta cố ý giữ A/B cùng subnet để loại giả thuyết “đổi prefix nên route đổi”.

Khi filter hoạt động, frame A gửi vào cổng được xếp VLAN 10 không được bridge phát ra một cổng chỉ có membership VLAN 20. Nếu đó là ARP broadcast thì B không có cơ hội trả MAC; A có route trực tiếp tới IP B mà vẫn không học được neighbor. Gói IP còn chưa đi được nên cũng chưa tới giai đoạn một router phải xử lý TTL.

`vlan_filtering 0` làm bridge không xét tag VLAN khi xử lý packet. Tạo bảng membership mà chưa bật filtering không bật được sự cô lập bạn đang kỳ vọng. Đây là nguyên nhân gốc của triệu chứng đầu bài; không phải ICMP có ngoại lệ và không phải subnet “ghi đè” VLAN.

> **Nguồn.** [Linux bridge, `IFLA_BR_VLAN_FILTERING`](https://docs.kernel.org/networking/bridge.html) ghi mặc định `0`, khi tắt thì không xét VLAN tag trong xử lý packet. Lab đặt rõ giá trị ấy khi dựng để cho bản sai chạy trước, rồi đổi sang `1`; kết quả trước–sau nằm trong `out/run.txt`.

<ab-toggle data-labels="Lọc tắt|Lọc bật">
<svg viewBox="0 0 500 205" role="img" aria-labelledby="net04-d-0-t net04-d-0-d" style="width:100%;max-width:500px;height:auto;display:block;margin:1.25rem auto">
<title id="net04-d-0-t">Cờ filtering thay kết quả với cùng bảng VLAN</title>
<desc id="net04-d-0-d">Cùng bố cục và địa chỉ; tắt filtering cho A tới B, bật filtering chặn frame giữa hai miền.</desc>
<defs><marker id="net04-d-0-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<rect x="15" y="50" width="130" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="80.0" y="80.0" font-size="14" text-anchor="middle" fill="currentColor">A · VLAN 10</text><rect x="185" y="50" width="130" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="250.0" y="80.0" font-size="14" text-anchor="middle" fill="currentColor">net04-br</text><rect x="355" y="50" width="130" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="420.0" y="80.0" font-size="14" text-anchor="middle" fill="currentColor">B · VLAN 20</text><line x1="145" y1="75" x2="185" y2="75" stroke="currentColor" stroke-width="2" marker-end="url(#net04-d-0-arrow)"/><text x="250" y="25" font-size="14" text-anchor="middle" fill="currentColor">vlan_filtering 0</text><line x1="315" y1="75" x2="355" y2="75" stroke="currentColor" stroke-width="2" marker-end="url(#net04-d-0-arrow)"/><text x="250" y="145" font-size="14" text-anchor="middle" fill="currentColor">A → B: có echo reply</text><text x="250" y="180" font-size="14" text-anchor="middle" fill="currentColor">Cùng IP / cùng route / cùng membership</text>
</svg>
<svg viewBox="0 0 500 205" role="img" aria-labelledby="net04-d-1-t net04-d-1-d" style="width:100%;max-width:500px;height:auto;display:block;margin:1.25rem auto">
<title id="net04-d-1-t">Cờ filtering thay kết quả với cùng bảng VLAN</title>
<desc id="net04-d-1-d">Cùng bố cục và địa chỉ; tắt filtering cho A tới B, bật filtering chặn frame giữa hai miền.</desc>
<defs><marker id="net04-d-1-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<rect x="15" y="50" width="130" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="80.0" y="80.0" font-size="14" text-anchor="middle" fill="currentColor">A · VLAN 10</text><rect x="185" y="50" width="130" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="250.0" y="80.0" font-size="14" text-anchor="middle" fill="currentColor">net04-br</text><rect x="355" y="50" width="130" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="420.0" y="80.0" font-size="14" text-anchor="middle" fill="currentColor">B · VLAN 20</text><line x1="145" y1="75" x2="185" y2="75" stroke="currentColor" stroke-width="2" marker-end="url(#net04-d-1-arrow)"/><text x="250" y="25" font-size="14" text-anchor="middle" fill="currentColor">vlan_filtering 1</text><line x1="320" y1="55" x2="320" y2="95" stroke="#f43f5e" stroke-width="4"/><text x="250" y="145" font-size="14" text-anchor="middle" fill="currentColor">A → B: ARP không học được MAC</text><text x="250" y="180" font-size="14" text-anchor="middle" fill="currentColor">Cùng IP / cùng route / cùng membership</text>
</svg>
<ab-note>Bảng VLAN đã có nhưng bridge chưa xét miền khi xử lý frame.</ab-note>
<ab-note>Cờ lọc làm membership có tác dụng: broadcast từ miền 10 không ra cổng chỉ thuộc miền 20.</ab-note>
</ab-toggle>

Không dùng VLAN như bằng chứng đủ cho mọi mục tiêu bảo mật. Nó kiểm đường chuyển frame theo cấu hình; node được phép vào nhiều VLAN vẫn có thể nối các miền bằng IP forwarding, proxy hoặc chương trình chuyển tiếp. Trong lab, C có hai VLAN interface nhưng tắt IPv4 forwarding; không có chính sách router được dựng ở giữa chúng. Bài này chứng minh cô lập tầng liên kết trong topology ấy, không chứng minh cô lập mọi ứng dụng có quyền trên host.

## ⏸ Dừng lại — đoán trước #2

A gửi frame không tag. Ta cấu hình cổng A `vid 10 pvid untagged`. Hai từ cuối làm gì?

- (a) Cả hai đều xóa tag khi frame đi vào bridge.
- (b) `pvid` gán VLAN 10 cho frame ingress không tag; `untagged` quyết định bỏ tag khi frame VLAN 10 đi ra cổng ấy.
- (c) Chúng đổi IP A sang subnet của VLAN 10.

### 3.4 PVID chọn miền lúc vào, untagged chọn hình dạng lúc ra

Đáp án là **(b)**. **Ingress là hướng frame đi từ một cổng vào bridge; egress là hướng từ bridge đi ra cổng.** Không dùng hai từ ấy mà quên nêu điểm quan sát: với endpoint, cùng một frame lại đang đi theo hướng đối nghịch trên interface của nó.

**PVID — port VLAN ID — là VLAN được gán cho ingress không tag trên cổng.** Frame của A không cần mang trường VLAN trên dây ảo A–bridge: bridge biết nó thuộc VLAN 10 vì cấu hình cổng nhận. **Egress untagged là quy tắc xuất frame của VLAN ấy khỏi cổng mà không giữ tag VLAN trên đoạn nối tới endpoint.** Nó không tự gán miền cho một frame đi vào. Hai chiều xử lý giải hai câu hỏi khác nhau, nên cần kiểm riêng hai cờ.

**Access port** trong bài là cổng nối endpoint không xử lý tag, dùng một VLAN với PVID và egress untagged. **Trunk** là đoạn nối mang nhiều VLAN được phân biệt bằng tag; trong lab nó chở VLAN 10 và 20 tới C. Đây là cách bố trí cổng, không phải có một loại thiết bị Linux riêng tên “access” khác hẳn “trunk”.

Ví dụ đường tới C: A phát ARP không tag; cổng `net04-a` xếp nó vào VLAN 10; bridge thấy `net04-c` có membership VLAN 10 và không đặt egress untagged cho VLAN ấy, nên frame qua đầu dây C có tag 10. Ở C, VLAN interface `net04-ec.10` nhận miền 10 và giao payload lên IP stack. Chiều reply diễn ra ngược lại: C xuất tag 10, bridge nhận vào miền 10 rồi xuất không tag qua cổng A.

**VLAN subinterface là interface logic gắn với interface cha và một VLAN ID để nhận/phát traffic của VLAN đó.** Tên `.10` chỉ là convention; tham số `type vlan id 10` mới đặt ID. Đổi tên thành `.20` không đổi ID nếu lệnh vẫn ghi `id 10`. Đọc `ip -d link` để kiểm giá trị thật, không đoán từ tên.

> **Nguồn.** [bridge(8), `bridge vlan add`](https://man7.org/linux/man-pages/man8/bridge.8.html) mô tả PVID áp dụng cho ingress không tag và `untagged` áp dụng ở egress. [ip-link(8), VLAN Type Support](https://man7.org/linux/man-pages/man8/ip-link.8.html) mô tả interface cha, `type vlan`, `id` và ảnh hưởng của `reorder_hdr` tới việc nhìn tag bằng công cụ bắt gói.

Bây giờ mới dùng bảng để đọc lại cấu hình sau cơ chế:

| Cổng bridge | Membership | Ingress không tag | Egress của miền được phép |
|---|---|---|---|
| net04-a | VLAN 10 | Xếp vào 10 nhờ PVID | VLAN 10 xuất không tag |
| net04-b | VLAN 20 | Xếp vào 20 nhờ PVID | VLAN 20 xuất không tag |
| net04-c | VLAN 10 và 20 | Không có PVID trong lab | Giữ tag tương ứng 10 hoặc 20 |

Lab dựng bridge với `vlan_default_pvid 0` để cổng không tự nhận PVID mặc định, sau đó khai rõ từng membership cần dùng. Tài liệu kernel ghi giá trị mặc định thông thường là `1`; đặt `0` khiến các cổng không có PVID mặc định. Việc đó giúp tránh còn một VLAN chung ngoài ý muốn trong topology cần kiểm. Không biến mẹo này thành lệnh xóa VLAN mặc định trên một mạng đang hoạt động mà chưa kiểm đường quản trị.

<step-flow>
<svg viewBox="0 0 660 380" role="img" aria-labelledby="net04-c-t net04-c-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="net04-c-t">PVID và untagged ở hai chiều</title>
<desc id="net04-c-d">A phát không tag, bridge gán miền 10 rồi trunk xuất tag 10 tới C. Reply có tag về bridge, cổng A xuất không tag.</desc>
<defs><marker id="net04-c-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<rect x="15" y="20" width="130" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="80.0" y="47.5" font-size="14" text-anchor="middle" fill="currentColor">A · .0.10</text><rect x="230" y="20" width="150" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="305.0" y="47.5" font-size="14" text-anchor="middle" fill="currentColor">net04-br</text><rect x="475" y="20" width="160" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="555.0" y="47.5" font-size="14" text-anchor="middle" fill="currentColor">C · net04-ec</text><line x1="80" y1="65" x2="80" y2="355" stroke="currentColor" stroke-dasharray="5 4"/><line x1="305" y1="65" x2="305" y2="355" stroke="currentColor" stroke-dasharray="5 4"/><line x1="555" y1="65" x2="555" y2="355" stroke="currentColor" stroke-dasharray="5 4"/><g data-step="1">
<line x1="80" y1="115" x2="305" y2="115" stroke="currentColor" stroke-width="2" marker-end="url(#net04-c-arrow)"/><text x="193" y="100" font-size="14" text-anchor="middle" fill="currentColor">frame không tag</text><rect x="215" y="135" width="180" height="32" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/><text x="305.0" y="156.0" font-size="14" text-anchor="middle" fill="currentColor">PVID 10 → miền 10</text>
</g><g data-step="2">
<line x1="305" y1="215" x2="555" y2="215" stroke="currentColor" stroke-width="2" marker-end="url(#net04-c-arrow)"/><text x="430" y="200" font-size="14" text-anchor="middle" fill="currentColor">trunk: tag 10</text><rect x="465" y="240" width="180" height="32" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/><text x="555.0" y="261.0" font-size="14" text-anchor="middle" fill="currentColor">net04-ec.10 nhận</text>
</g><g data-step="3">
<line x1="555" y1="315" x2="305" y2="315" stroke="#10b981" stroke-width="2" marker-end="url(#net04-c-arrow)"/><line x1="305" y1="345" x2="80" y2="345" stroke="#10b981" stroke-width="2" marker-end="url(#net04-c-arrow)"/><text x="425" y="301" font-size="14" text-anchor="middle" fill="currentColor">reply: tag 10</text><text x="188" y="330" font-size="13" text-anchor="middle" fill="currentColor">egress bỏ tag</text>
</g>
</svg>
<step-note data-step="1">PVID phân loại ingress không tag; nó không đổi địa chỉ IP.</step-note>
<step-note data-step="2">Membership cho miền 10 ra trunk; VLAN interface tương ứng ở C nhận payload.</step-note>
<step-note data-step="3">Ở chiều về, egress untagged trên cổng A bỏ tag để endpoint A nhận như Ethernet thường.</step-note>
</step-flow>

### 3.5 Một MAC trên trunk có thể xuất hiện trong nhiều VLAN

C có hai interface logic dùng cùng MAC endpoint `...:0c`: `net04-ec.10` nhận `10.4.0.30/24`, `net04-ec.20` nhận `10.4.20.30/24`. A ở VLAN 10 ping `.0.30`; B nhận thêm `10.4.20.20/24` và ping `.20.30` trong VLAN 20. Route của mỗi phép thử chọn đúng interface/subnet, không dùng hai route cùng prefix ở C để rồi phải giải thích lựa chọn ngoài phạm vi bài.

FDB cuối log có hai dòng MAC C, cùng cổng `net04-c` nhưng VLAN khác nhau. Đó là dữ kiện hợp lệ, không phải dấu hiệu duplicate IP. Ngữ cảnh VLAN là một phần của quyết định chuyển frame. Khi đọc MAC trùng trong hệ thống nhiều miền, phải giữ cả VLAN và cổng trong bằng chứng.

VLAN tag cũng không “mã hóa IP subnet”: số 10 không buộc địa chỉ phải có octet 10, số 20 không buộc có octet 20. Lab chọn tên dễ đọc, nhưng membership và prefix là hai cấu hình độc lập. A/B cùng prefix mà khác VLAN bị chặn; A/C đúng miền và có địa chỉ phù hợp thì chạy. Hai phép thử kết hợp mới tách được hai lớp cấu hình.

### 3.6 Có MAC vẫn chưa đủ nếu trunk không cho VLAN đi qua

Ta đã học MAC C bằng ping thành công, rồi xóa membership VLAN 10 trên cổng trunk. A vẫn có thể biết MAC C, nhưng bridge không được phép phát frame của VLAN ấy ra cổng C. Kết quả ping thất bại. Thêm membership lại, giữ nguyên IP/MAC và dây, ping chạy lại.

Đây là bản sai thứ hai: “ARP học được rồi thì L2 chắc chắn ổn.” Ánh xạ IP → MAC chỉ trả lời tên người nhận. Cổng chuyển frame còn phải có trạng thái phù hợp và cho phép miền đó. Neighbor cũ không sửa được membership thiếu; xóa cache còn có thể đổi triệu chứng từ gửi unicast không tới thành broadcast không nhận reply.

> **Suy luận.** So sánh phép xóa/thêm chỉ một membership với ping trước–sau cho phép quy lỗi trong lab vào đường VLAN qua trunk. Log không có counter drop ở từng hook, nên ta không tuyên bố đo chính xác dòng code kernel nào drop frame. Kiểm sâu hơn bằng capture hai đầu và counter/trace của bridge nếu cần xác định vị trí nội bộ.

Bắt trên `net04-ec` — interface cha của trunk — giúp thấy cả tag 10 lẫn tag 20. Bắt trên `.10` có thể thấy frame sau khi đã xử lý tag, nên “không thấy tag” tại đó không đủ nói frame qua trunk không tag. Offload và `reorder_hdr` cũng ảnh hưởng biểu diễn capture; lab thử tắt RX/TX VLAN offload ở interface cha rồi kiểm output thật. Không lấy một ảnh capture ở sai hook làm hình dạng tuyệt đối trên dây vật lý.

## ⏸ Dừng lại — đoán trước #3

C có cả `.10` và `.20`, mỗi interface có IP. Chỉ như vậy, A/B có chắc nói chuyện xuyên VLAN được không?

- (a) Có, vì cùng một kernel sẽ tự chuyển mọi IP packet giữa interface.
- (b) Không; phải có đường route, bật forwarding và các chính sách cho phép, hoặc một chương trình làm trung gian.
- (c) Có, vì FDB của C chứa cùng MAC trên hai VLAN.

Đáp án là **(b)**. Có endpoint ở hai miền không tự biến việc chuyển frame của bridge thành việc chuyển IP giữa miền. Bài 6 mới bật forwarding và dựng router bằng tay; bài này giữ nó tắt để đo từng cơ chế riêng.

## 4. Lab

### 4.1 Ba endpoint, ba cặp veth, một bridge

Script đầy đủ ở thư mục lab `net-04`: `run.sh`, `lab.sh`, `out/run.txt`, `out/trunk.txt`. Chạy `./run.sh` trên máy có Docker; wrapper dùng Alpine 3.20, mount thư mục vào `/lab` và `tee` log ra ngoài container. Container `net04-lab` được dọn bằng trap khi kết thúc. Không thao tác container/network ngoài tiền tố `net04-`.

`--privileged` dùng cho mount namespace và quản trị interface trong container dùng một lần; không chạy với host network. Topology là namespace lồng trong container, mô phỏng các endpoint; ta chưa dựng runtime container hay CNI thật. Mục tiêu là nhìn dây, không giải thích object Kubernetes; phần đó dành cho bài 27.

Lệnh dựng cốt lõi, trích từ `lab.sh`:

```sh
ip link add net04-br type bridge vlan_filtering 0 vlan_default_pvid 0
ip link set net04-br up
ip netns add net04-a
ip link add net04-a type veth peer name net04-ea
ip link set net04-ea netns net04-a
ip link set net04-a up
ip -n net04-a link set lo up
ip -n net04-a link set net04-ea up
ip -n net04-a addr add 10.4.0.10/24 dev net04-ea
```

Script lặp mô hình cho B/C, gán MAC cố định vào endpoint và tắt IPv4 forwarding ở từng namespace. Nó tắt IPv6 trên các namespace endpoint trước khi đo; capture vẫn có thể có frame IPv6 sinh từ interface khác lúc dựng topology. Chỉ đọc các ARP/ICMP IPv4 và VLAN liên quan, không nói rằng log hoàn toàn không có IPv6.

Ở lượt đầu **chưa gắn các đầu ngoài vào bridge**. Có cặp veth không đồng nghĩa mọi cặp veth đã nối nhau:

Trích nguyên dòng từ log:

```text
1 packets transmitted, 0 received, 100% packet loss, time 0ms
10.4.0.20 dev net04-ea INCOMPLETE
```

Neighbor còn `INCOMPLETE` ở thời điểm chụp vì phép ping chờ ngắn hơn toàn bộ vòng phân giải. Không có reply ngay không nhất thiết bảng đã sang FAILED. Dữ kiện này bổ sung cho bài ARP: thời điểm lấy snapshot là một phần của số đo.

### 4.2 Cắm dây, khai VLAN, nhưng để cấu hình sai chạy

```sh
ip link set net04-a master net04-br
ip link set net04-b master net04-br
ip link set net04-c master net04-br
bridge vlan add dev net04-a vid 10 pvid untagged
bridge vlan add dev net04-b vid 20 pvid untagged
bridge vlan add dev net04-c vid 10
bridge vlan add dev net04-c vid 20
bridge vlan show
```

Trích nguyên dòng từ log:

```text
port              vlan-id
net04-a           10 PVID Egress Untagged
net04-b           20 PVID Egress Untagged
net04-c           10
                  20
```

Chưa bật filtering. `ip -d link show net04-br` trong log vẫn ghi `vlan_filtering 0`; giữ nguyên các dòng cấu hình này, ping A → B thành công như triệu chứng đầu bài. Xem FDB ngay sau traffic:

Trích nguyên dòng từ log:

```text
02:00:00:04:00:0a dev net04-a master net04-br
02:00:00:04:00:0b dev net04-b master net04-br
```

Đây là MAC nguồn endpoint học trên đúng đầu ngoài, không phải MAC quản trị của bridge. Cùng lúc, lệnh dưới **không in dòng nào** trong `out/run.txt`:

```sh
ip -4 addr show dev net04-br
```

Phần `FDB AND BRIDGE ADDRESS` kết thúc ngay trước `NAMESPACE AND PEER`, không có `inet` của bridge. Như vậy lab đã chuyển frame A/B khi bridge không có IPv4. Kết luận này chỉ về forwarding tầng liên kết, không nói host có thể tự dùng bridge làm default gateway hay cấp DHCP cho các endpoint.

### 4.3 Đi từ interface trong namespace tới đầu dây ngoài

```sh
ip -n net04-a -o link show
ip -o link show net04-a
ip netns exec net04-a ethtool -S net04-ea
```

Trích nguyên dòng từ log:

```text
4: net04-ea@if5: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP mode DEFAULT group default qlen 1000\    link/ether 02:00:00:04:00:0a brd ff:ff:ff:ff:ff:ff link-netnsid 0
5: net04-a@if4: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master net04-br state UP mode DEFAULT group default qlen 1000\    link/ether ba:bf:e0:20:6a:78 brd ff:ff:ff:ff:ff:ff link-netns net04-a
     peer_ifindex: 5
```

Trong lần chạy này, A thấy endpoint index `4` với peer index `5`; namespace ngoài có interface index `5`, peer quay lại `4`, và `master net04-br`. Index phụ thuộc thứ tự tạo thiết bị, nên chạy lại có thể khác. Ba trường liên kết bằng chứng: peer index, namespace chứa peer, bridge master. Đừng viết script production tra cố định số `5` chỉ vì log mẫu có nó.

Với một tiến trình thật, trước hết phải xác định network namespace mà nó đang dùng rồi mới đọc interface/route bên trong. Tên `eth0` ở hai container khác nhau không cho phép ghép thành một dây. Lab dùng tên khác để bạn thấy rõ endpoint nào thuộc namespace nào; không có quy tắc Linux nào đòi endpoint trong container phải tên `eth0`.

### 4.4 Chỉ bật lọc, giữ nguyên prefix

```sh
ip link set net04-br type bridge vlan_filtering 1
ip -n net04-a neigh flush dev net04-ea
ip netns exec net04-a ping -n -c 1 -W 4 10.4.0.20
ip -n net04-a neigh show 10.4.0.20
ip -n net04-a route get 10.4.0.20
```

Lệnh flush ở đây là kiểm soát thí nghiệm: bỏ ánh xạ đã học trong lượt chưa lọc để kiểm ARP trong miền mới. Đầu ra ping/neighbor và dòng route ở cuối log:

Trích nguyên dòng từ log:

```text
From 10.4.0.10 icmp_seq=1 Destination Host Unreachable
10.4.0.20 dev net04-ea FAILED
10.4.0.20 dev net04-ea src 10.4.0.10 uid 0
```

Route vẫn chọn link trực tiếp tới `.20`; không có `via` gateway. A broadcast hỏi B trong VLAN 10, nhưng cổng B chỉ thuộc VLAN 20. Với topology này, request không qua được ranh giới miền nên A không học MAC B. Đổi subnet mask để “cùng mạng hơn” không thay membership bridge; cần sửa cấu hình miền hoặc dựng router đúng mục tiêu, không chỉnh CIDR theo cảm giác.

### 4.5 Cho một trunk chở hai miền có thể kiểm riêng

Ở C, tạo VLAN interface; ở B, thêm IP phù hợp cho phép thử VLAN 20:

```sh
ip -n net04-c link add link net04-ec name net04-ec.10 type vlan id 10
ip -n net04-c link add link net04-ec name net04-ec.20 type vlan id 20
ip -n net04-c link set net04-ec.10 up
ip -n net04-c link set net04-ec.20 up
ip -n net04-c addr add 10.4.0.30/24 dev net04-ec.10
ip -n net04-c addr add 10.4.20.30/24 dev net04-ec.20
ip -n net04-b addr add 10.4.20.20/24 dev net04-eb
```

Bắt trên interface cha ở C rồi ping từ từng miền. Đây là hai luồng độc lập, không phải một ping xuyên VLAN:

```sh
ip netns exec net04-c tcpdump -l -n -e -i net04-ec
ip netns exec net04-a ping -n -c 1 -W 1 10.4.0.30
ip netns exec net04-b ping -n -c 1 -W 1 10.4.20.30
```

Trích nguyên dòng từ log:

```text
64 bytes from 10.4.0.30: icmp_seq=1 ttl=64 time=1.42 ms
64 bytes from 10.4.20.30: icmp_seq=1 ttl=64 time=4.21 ms
```

Bản bắt `out/trunk.txt` có ARP của hai luồng:

Trích nguyên dòng từ log:

```text
05:50:04.381133 02:00:00:04:00:0a > ff:ff:ff:ff:ff:ff, ethertype 802.1Q (0x8100), length 46: vlan 10, p 0, ethertype ARP (0x0806), Request who-has 10.4.0.30 tell 10.4.0.10, length 28
05:50:04.390221 02:00:00:04:00:0b > ff:ff:ff:ff:ff:ff, ethertype 802.1Q (0x8100), length 46: vlan 20, p 0, ethertype ARP (0x0806), Request who-has 10.4.20.30 tell 10.4.20.20, length 28
```

Ở đoạn trunk, frame vẫn mang MAC gốc của A/B; bridge không NAT MAC nguồn thành MAC bridge. Tag 10/20 chọn interface logic tương ứng ở C. Hai trường nguồn và tag cho phép đối chiếu cùng một broadcast trước khi nó được giao lên IP stack của C.

FDB cuối phép thử xác nhận MAC C được học theo hai miền:

Trích nguyên dòng từ log:

```text
02:00:00:04:00:0c dev net04-c vlan 10 master net04-br
02:00:00:04:00:0c dev net04-c vlan 20 master net04-br
```

Không suy từ hai dòng này rằng có hai node trùng MAC trong cùng broadcast domain: chính VLAN phân biệt hai ngữ cảnh. Có hai interface logic ở C cũng không bật forwarding; phép ping A tới B vẫn không có một router được dựng để nối hai miền.

### 4.6 Cố ý làm mất một VLAN trên trunk rồi sửa

```sh
bridge vlan del dev net04-c vid 10
ip netns exec net04-a ping -n -c 1 -W 1 10.4.0.30
bridge vlan add dev net04-c vid 10
ip netns exec net04-a ping -n -c 1 -W 1 10.4.0.30
```

Trích nguyên dòng từ log:

```text
1 packets transmitted, 0 received, 100% packet loss, time 0ms
```

Sau khi thêm lại membership:

Trích nguyên dòng từ log:

```text
64 bytes from 10.4.0.30: icmp_seq=1 ttl=64 time=0.090 ms
```

Lượt đầu không có reply; lượt sau trở lại thành công. Đừng gắn hai tỷ lệ mất gói này thành thống kê độ tin cậy: mỗi lượt chỉ có một echo nhằm kiểm thay đổi membership. Muốn kiểm mất gói ngẫu nhiên phải chạy mẫu dài và giữ cấu hình cố định; ở đây chủ động đổi điều kiện giữa hai lượt.

Khi gặp lỗi tương tự, truy theo đường đi: đọc route trong endpoint, nhìn trạng thái hai đầu veth, xác định master, kiểm cờ filtering, rồi đọc membership/PVID/egress ở cổng vào và cổng ra. Cuối cùng bắt ở trunk đúng miền. Thứ tự ấy giữ mỗi giả thuyết gắn với một đoạn đường; một ảnh `bridge vlan show` đơn lẻ không cho biết filtering đã bật, còn một ảnh `ip neigh` không cho biết cổng ra được phép chở VLAN.

> **Chưa đo.** Lab không có STP, bond, VXLAN, bridge firewall, router xuyên VLAN hoặc switch vật lý. Không dùng kết quả này để khẳng định mọi mạng Docker/CNI đều dùng bridge, hoặc để quy một timeout production về VLAN khi chưa lấy topology thật. Những cấu hình ấy có thể thêm đường đi hoặc điểm lọc cần đo riêng.

## 5. Tính tay

### 5.1 Đếm cổng, không đếm tên thiết bị tùy ý

**Dữ kiện lab:** ba namespace endpoint, mỗi namespace một cặp veth nối ra cùng bridge. Có `3 × 2 = 6` đầu veth, trong đó ba đầu là cổng bridge, ba đầu ở endpoint. Thêm hai VLAN interface trên C không tạo hai cặp veth mới: chúng dùng chung interface cha. Bridge vẫn có ba cổng veth trong topology này.

Nếu thêm namespace D theo cùng mẫu, cần một cặp nữa: tổng tám đầu veth, bốn cổng bridge. Đây là phép đếm thiết bị từ thiết kế, không là giới hạn số cổng của Linux bridge.

### 5.2 ARP broadcast của A sẽ có bao nhiêu bản sao ra cổng khác?

**Dữ kiện lab, khi đã bật filtering:** A thuộc VLAN 10; B chỉ VLAN 20; C cho 10/20. Bỏ qua bản giao nội bộ cho host và mọi luồng multicast khác. ARP broadcast đi vào từ A được phép ra **một cổng khác là C**, không ra B và không phản xạ lại cổng vào trong cấu hình mặc định của phép thử.

Xóa VLAN 10 khỏi C thì tập cổng ra đủ điều kiện trong ba cổng này rỗng: `0` bản sao forwarding tới endpoint khác. Tắt filtering ở giai đoạn đầu làm mất ràng buộc VLAN đang kiểm: trong topology không lọc, broadcast của A có đường ra B/C. Phép đếm là suy luận từ membership và topology, không phải counter frame đã đo ở từng cổng.

### 5.3 Cùng một capture có hai MAC giống nhau là bao nhiêu máy?

**Dữ kiện log:** FDB có `.0c` ở `net04-c vlan 10` và `.0c` ở `net04-c vlan 20`. Số entry theo miền là hai; số MAC phân biệt là một; số endpoint namespace tương ứng trong thiết kế là một C. Không có công thức “số dòng FDB = số container”. Các entry local/permanent còn khiến phép đếm ấy sai ngay cả khi chưa có VLAN.

Phần tính không cần đổi byte tag hay suy throughput từ số ping. Ta chưa đo overhead trên đường vật lý, nên không lấy chiều dài capture ở VM để tính phần trăm băng thông sử dụng trên một NIC thật.

## 6. Chuyển giao

1. Trong container bạn thấy `eth0@ifN`, nhưng host có nhiều network namespace. Bạn cần dữ kiện nào để biết phải tìm index N ở namespace nào, thay vì tra toàn bộ interface chỉ theo tên?
2. Bridge có IP nhưng không có cổng nào làm member. Vì sao gán IP đó không nối được hai cặp veth? Bạn sẽ đưa ra bằng chứng nào từ `ip link`?
3. Hai endpoint dùng hai subnet khác nhau trên một bridge không lọc VLAN. Bạn có thể khẳng định broadcast của chúng đã tách chưa? Cần phân biệt lỗi route với miền Ethernet thế nào?
4. Host gửi không tag, cổng có membership VLAN đúng nhưng thiếu PVID. Frame có thể bị chặn trước khi tới trunk ở đâu? Bạn sẽ kiểm ingress và egress bằng hai phép thử nào?
5. Capture ở VLAN subinterface không thấy tag nhưng capture ở interface cha thấy tag. Bạn cần xác định những điểm quan sát và setting nào trước khi gọi đó là lỗi bridge?
6. Namespace C thấy cả hai miền nhưng A/B chỉ mở kết nối được khi bật một tiến trình proxy ở C. Điều đó thay đổi kết luận về cô lập frame hay chỉ thêm một đường ở tầng ứng dụng? Bạn sẽ đo hai đường ấy thế nào?
7. **Câu khó nhất, tự điều tra:** một host có bridge nhiều VLAN và một uplink vật lý; sau đổi switch, chỉ traffic không tag chạy, VLAN có tag đều mất. Bạn chỉ được đọc host và bắt ở hai đầu uplink trong một khoảng ngắn. Thiết kế phép đo phân biệt thiếu allowed VLAN, sai native/PVID, tag bị xử lý bởi offload và sai cấu hình VLAN interface; dữ kiện nào đủ bác bỏ từng khả năng mà không tắt toàn bộ lọc?

## 7. Tóm tắt

- Namespace tách mạng; veth nối hai interface; chỉ tạo cả hai chưa tự nối các cặp dây vào một LAN.
- Bridge chuyển frame qua các cổng member bằng FDB; lab chuyển A/B khi bridge không có IPv4.
- Bảng membership VLAN không thay cho `vlan_filtering 1`; lab để filter tắt thì A/B khác VLAN vẫn ping được.
- PVID chọn VLAN cho ingress không tag; egress untagged quyết định cách frame của VLAN đi ra cổng.
- Cùng subnet không vượt ranh giới VLAN; route on-link vẫn có thể kết thúc bằng neighbor FAILED.
- Trunk có thể mang cùng MAC trong nhiều miền; đọc FDB phải giữ cả VLAN và cổng.
- Có MAC trong neighbor cache không cứu được một VLAN thiếu membership trên cổng ra.
- Vị trí bắt gói và offload ảnh hưởng cách nhìn tag; kiểm interface cha và interface VLAN trước khi kết luận.

→ **Bài 5 — MTU, phân mảnh và PMTUD**: khi đường frame đã nối đúng, kiểm vì sao gói nhỏ qua được nhưng gói lớn làm kết nối treo.
