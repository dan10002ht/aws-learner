# Bài 6 — Router Linux bằng tay: bảng định tuyến và forwarding

## 1. Mục tiêu

Sau bài này bạn có thể:

- Phân biệt một gói gửi tới IP của router với một gói cần router chuyển tiếp, rồi chọn phép thử cho đúng loại.
- Đọc `via`, `dev`, `src`, `scope`, `proto` và `metric` của route mà không nhầm địa chỉ gateway với đích IP cuối cùng.
- Dự đoán kết quả khi một host route cụ thể nhưng sai cùng tồn tại với route mạng đang dùng được.
- Dùng `ip route get` với nguồn và interface đầu vào để tái hiện quyết định của gói thật, thay vì chỉ xem route cục bộ.
- Chứng minh đường đi và đường về riêng biệt bằng capture và lookup trên từng máy.
- Nhận ra khi cần đọc policy rule và table khác trước khi sửa route trong `main`.

## 2. Triệu chứng

Bạn biến một máy Linux có hai card mạng thành router. Client `10.6.1.2` ping được địa chỉ `10.6.1.1` của máy ấy. Trên router, `ip route get 10.6.2.2` cũng trả `dev right`; server đã gắn vào card `right` và có IP `10.6.2.2`. Nhưng client gửi một ping tới server thì mất **1/1**.

Bản sửa đầu tiên thường là thêm default route vào router hoặc cấu hình NAT. Trong lab này, **không làm cả hai**. Chỉ đổi `net.ipv4.ip_forward` từ 0 thành 1 thì cùng ping nhận đủ **1/1**. Capture thấy IP hai đầu không đổi, TTL giảm từ 64 xuống 63 khi gói đi qua router.

> **Đo trên lab.** `net-06/out/forward-off.txt`, `forward-on.txt`, `forward-capture.txt`; Docker `alpine:3.20`, Linux `6.8.0-64-generic`, aarch64. Khi forwarding tắt, ping địa chỉ router thành công nhưng ping xuyên router thất bại dù route tồn tại. Đo lại: `net-06/run.sh`. Mất 1/1 là kết quả phép thử có kiểm soát, không phải ước lượng xác suất mất gói của một mạng đang chạy.

Bài 5 đã tách chuyện gói có vừa MTU ra khỏi chuyện TLS. Bài này tách tiếp hai câu hỏi hay bị nhập làm một: **Linux biết đường nào** và **Linux có thực sự cho gói từ máy khác đi qua hay không**. CIDR và phép longest-prefix match đã có ở [[eng-02-cidr-subnetting]]; ở đây không tính subnet lại, mà cho những quy tắc ấy chạy trên kernel thật. NAT chỉ xuất hiện như một giả thuyết sai của ca này; cơ chế NAT và conntrack thuộc bài 7.

## ⏸ Dừng lại — đoán trước #1

Client ping được IP của router. Lookup trên router có route ra interface nối server. Vì sao vẫn chưa đủ chứng minh client tới được server?

- (a) Linux chỉ route được khi có NAT.
- (b) Lookup chứng minh có quyết định route cho bộ tham số hỏi; forwarding và các điều kiện chuyển tiếp vẫn có thể chặn gói thật.
- (c) Bắt buộc phải có default route dù cả hai mạng đều gắn trực tiếp.
- (d) Ping router thành công đã chứng minh forwarding, lỗi chỉ còn ở server.

## 3. Cơ chế

### 3.1 Gói gửi cho tôi khác với gói nhờ tôi chuyển hộ

Đáp án **(b)**. **Forwarding — chuyển tiếp — là nhận một gói có đích ở nơi khác rồi đưa nó sang chặng tiếp theo.** Router là vai trò của máy trong đường đi, không phải một loại phần cứng bắt buộc. Linux có thể có nhiều interface và nhiều route nhưng vẫn đang hành xử như host, không nhận làm trung chuyển.

C gửi Echo tới `10.6.1.1`, đó là một địa chỉ thuộc R. Gói được nhận cục bộ và R tạo Echo Reply. C gửi Echo tới `10.6.2.2`, đó là địa chỉ thuộc S. C vẫn gửi frame tới gateway R, nhưng header IP giữ đích S. Khi tới R, trường hợp này đòi hỏi forwarding. Hai phép ping có thể dùng cùng cổng vào và cùng MAC gateway mà đi hai nhánh xử lý khác nhau.

**Local delivery — nhận cục bộ — là đưa gói tới ngăn xếp giao thức/socket trên chính máy đang xử lý.** Linux giữ các route địa chỉ của mình trong table `local`. Gói khớp một route kiểu `local` được nhận tại máy; nó không trở thành transit chỉ vì interface còn lại có đường sang server. [ip-route(8), route types và routing tables](https://man7.org/linux/man-pages/man8/ip-route.8.html).

> **Nguồn.** Linux mô tả `ip_forward` bằng câu *“Forward Packets between interfaces.”* và các giá trị 0 tắt, 1 bật. Tài liệu còn nói đổi biến này có thể đặt lại cấu hình liên quan về mặc định host/router. Vì vậy script đặt `rp_filter` của router **sau** khi bật forwarding. ([Linux IP sysctl](https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html)).

Tại đây route là điều kiện để chọn chặng sau, không phải giấy phép vượt mọi bước khác. Firewall vẫn có thể loại; TTL hết thì không chuyển; MTU có thể không vừa; gateway được chọn có thể không trả ARP. Từng loại cần bằng chứng riêng. Lab đầu tiên giữ các biến ấy đủ đơn giản để thay đúng một biến forwarding.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 515" role="img" aria-labelledby="net06-forward-t net06-forward-d" style="width:100%;max-width:760px;height:auto;display:block;margin:1.25rem auto">
<title id="net06-forward-t">Forwarding không đổi IP hai đầu</title>
<desc id="net06-forward-d">C đi vào left; R tra route10.6.2.0/24, chọn right, giảm TTL64 thành63 rồi phát gói giữ nguyên IP. Reply có lookup riêng và giảm TTL tại R.</desc>
<defs><marker id="net06-forward-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="currentColor"/></marker></defs>
<rect x="10" y="20" width="140" height="470" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/>
<text x="80.0" y="46" font-size="16" text-anchor="middle" fill="currentColor">C</text>
<text x="80.0" y="70" font-size="14" text-anchor="middle" fill="currentColor">c0</text>
<text x="80.0" y="92" font-size="14" text-anchor="middle" fill="currentColor">10.6.1.2</text>
<rect x="270" y="20" width="220" height="470" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/>
<text x="380.0" y="46" font-size="16" text-anchor="middle" fill="currentColor">R</text>
<text x="380.0" y="70" font-size="14" text-anchor="middle" fill="currentColor">left 10.6.1.1</text>
<text x="380.0" y="92" font-size="14" text-anchor="middle" fill="currentColor">right 10.6.2.1</text>
<rect x="610" y="20" width="140" height="470" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/>
<text x="680.0" y="46" font-size="16" text-anchor="middle" fill="currentColor">S</text>
<text x="680.0" y="70" font-size="14" text-anchor="middle" fill="currentColor">s0</text>
<text x="680.0" y="92" font-size="14" text-anchor="middle" fill="currentColor">10.6.2.2</text>
<g data-step="1">
<path d="M150 150 L270 150" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#net06-forward-a)"/><text x="210" y="136" font-size="14" text-anchor="middle" fill="currentColor">IP C → S</text><text x="210" y="180" font-size="14" text-anchor="middle" fill="currentColor">TTL 64</text>
</g>
<g data-step="2">
<rect x="283" y="205" width="194" height="74" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="380" y="228" font-size="14" text-anchor="middle" fill="currentColor">LPM: 10.6.2.0/24</text><text x="380" y="250" font-size="14" text-anchor="middle" fill="currentColor">→ right</text><text x="380" y="270" font-size="14" text-anchor="middle" fill="currentColor">TTL 64 → 63</text>
</g>
<g data-step="3">
<path d="M490 312 L610 312" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#net06-forward-a)"/><text x="550" y="298" font-size="14" text-anchor="middle" fill="currentColor">IP C → S</text><text x="550" y="342" font-size="14" text-anchor="middle" fill="currentColor">TTL 63</text>
</g>
<g data-step="4">
<path d="M610 390 L490 390" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#net06-forward-a)"/><text x="550" y="376" font-size="14" text-anchor="middle" fill="currentColor">reply · 64</text><path d="M270 450 L150 450" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#net06-forward-a)"/><text x="210" y="436" font-size="14" text-anchor="middle" fill="currentColor">reply · 63</text>
</g>
</svg>
<step-note data-step="1">C gửi frame tới gateway; IP nguồn/đích vẫn là 10.6.1.2 → 10.6.2.2. Capture ở left của R ghi TTL 64.</step-note>
<step-note data-step="2">Với forwarding bật, R tra đích bằng longest prefix match (LPM) trong bảng được chọn: connected route 10.6.2.0/24 cho interface right. Trước khi chuyển tiếp, TTL giảm từ 64 xuống 63.</step-note>
<step-note data-step="3">R phát frame mới qua right, datagram vẫn mang IP C → S và TTL 63. Preferred source của route không thực hiện SNAT.</step-note>
<step-note data-step="4">S tra đường về C, phát reply qua R. Capture reply vào right TTL 64 và ra left TTL 63; request tới S chưa chứng minh reply có đường về.</step-note>
</step-flow>

Hình dùng các interface `left` và `right` của R trong lab. Gói request đi vào `left` có TTL 64, ra `right` còn 63; reply có TTL riêng, cũng giảm một đơn vị qua R. Đó là **hai datagram khác nhau**, không phải request biến thành reply. TTL — time to live — là trường giới hạn vòng đời gói IP; router phải giảm ít nhất một đơn vị khi chuyển tiếp theo [RFC 1812 §5.3.1](https://www.rfc-editor.org/rfc/rfc1812#section-5.3.1).

IP nguồn và đích của request vẫn là C và S. Router thay phần liên kết cho chặng kế, không mặc nhiên thay IP nguồn thành IP card ra. Trường `src` xuất hiện trong lookup cục bộ cũng không phải lệnh SNAT cho gói transit. Nếu nhầm điều này, bạn sẽ sửa đường về bằng NAT ngay cả khi chỉ cần thêm route rõ ràng.

### 3.2 Đọc một route như một quyết định có phạm vi

**Route — tuyến — là một bản ghi mô tả cách xử lý các đích khớp prefix trong một bảng định tuyến.** Với tuyến unicast thông thường, kết quả cần cho biết cổng ra và nếu có thì next hop. **Next hop — chặng kế — là địa chỉ router kế tiếp nhận gói trên link đang chọn, không nhất thiết là địa chỉ đích cuối.**

Trong lab, C có default route `via 10.6.1.1`. Nó không có nghĩa “đổi IP đích của mọi gói thành `10.6.1.1`”. C giữ IP đích `10.6.2.2`, tìm MAC của next hop ở link cục bộ rồi đóng frame gửi R. Khi tới R, R tra tiếp trên thông tin của gói. C không cần biết MAC của S và không ARP xuyên qua router để tìm S. Chi tiết ARP đã ở bài 3, cấu trúc frame ở bài 2.

Một route trực tiếp trên R có dạng thật trong `out/specific.txt`:

```text
10.6.2.0/24 dev right proto kernel scope link src 10.6.2.1
```

Nó xuất hiện khi script gán `10.6.2.1/24` lên interface đang hoạt động. `proto kernel` nói nguồn tạo bản ghi là kernel, không nói payload dùng một giao thức ứng dụng tên “kernel”. `scope link` nói đích thuộc link trực tiếp nên không cần khai báo gateway cho route ấy. `src 10.6.2.1` là **preferred source — địa chỉ nguồn ưu tiên khi máy tự khởi tạo lưu lượng theo route**, không phải địa chỉ thay thế nguồn của tất cả gói được chuyển tiếp. [ip-route(8), `protocol`, `scope`, `src`](https://man7.org/linux/man-pages/man8/ip-route.8.html).

Đặt các trường cạnh nhau sau khi đã theo đường gói:

| Trường | Câu hỏi nó trả lời | Chỗ hay đọc sai |
|---|---|---|
| Prefix | Đích nào khớp bản ghi? | Lấy thứ tự dòng output thay thứ tự chọn route |
| `via` | Chặng kế nhận gói là ai? | Cho rằng đó là IP đích mới |
| `dev` | Phát ra interface nào? | Cho rằng interface UP là next hop chắc chắn sống |
| `src` | Nguồn ưu tiên cho gói tạo cục bộ? | Cho rằng forwarding luôn SNAT sang nguồn này |
| `metric` | Ưu tiên giữa các route tương đương trong cùng ngữ cảnh? | So metric của /32 với /24 trước khi so độ cụ thể |
| `proto`, `scope` | Ai tạo route, phạm vi reachability của nó? | Coi đây là giao thức L4 hoặc nhãn firewall |

R không cần default route để chuyển giữa hai mạng trực tiếp. R có cả `10.6.1.0/24 dev left` và `10.6.2.0/24 dev right`, nên biết đường tới C và S. Default route chỉ là phương án cho những đích không có route cụ thể hơn trong lookup phù hợp. Thêm nó không thay được công tắc forwarding, cũng không chữa một /32 đang kéo gói vào nơi khác.

### 3.3 Route cụ thể sai có thể thắng route rộng đang đúng

Bản sai tiếp theo: **“Chỉ cần giảm metric của route tốt xuống thấp nhất là Linux sẽ dùng nó.”** Hãy cho nó gặp một host route — tuyến chỉ tới một địa chỉ — của lab:

```text
10.6.2.0/24 dev right proto kernel scope link src 10.6.2.1
10.6.2.2 via 10.6.99.2 dev dead metric 900
```

Dòng thứ hai là route `/32`; `ip route show` có thể bỏ phần `/32` khi in địa chỉ đơn. Đích `.2` khớp cả hai route, nhưng route host cụ thể hơn được chọn trước. Không có thao tác “thử route /32, không nhận ACK thì tự rơi xuống /24”. Một route đã cho kết quả thì tầng lookup không xem im lặng của ứng dụng là lý do để tìm tuyến rộng hơn. Route sai có thể giữ nguyên trong bảng dù gói không tới đích.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 315" role="img" aria-labelledby="net06-prefix-t net06-prefix-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net06-prefix-t">Route cụ thể bao trong route mạng</title>
<desc id="net06-prefix-d">Một vùng /32 nằm trong /24, trực quan hoá việc gói tới .2 khớp cả hai nhưng /32 thắng dù metric 900.</desc>
<defs><marker id="net06-prefix-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="currentColor"/></marker></defs>
<rect x="15" y="20" width="490" height="240" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/>
<text x="28" y="48" font-size="16" text-anchor="start" fill="currentColor">10.6.2.0/24 → right</text>
<text x="28" y="74" font-size="14" text-anchor="start" fill="currentColor">route trực tiếp · scope link</text>
<rect x="125" y="105" width="360" height="130" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/>
<text x="140" y="132" font-size="16" text-anchor="start" fill="currentColor">10.6.2.2/32</text>
<text x="140" y="157" font-size="14" text-anchor="start" fill="currentColor">via 10.6.99.2 → dead</text>
<text x="140" y="183" font-size="14" text-anchor="start" fill="currentColor">metric 900 vẫn thắng /24</text>
<text x="140" y="210" font-size="14" text-anchor="start" fill="currentColor">đích .2 nằm trong cả hai</text>
<text x="15" y="290" font-size="15" text-anchor="start" fill="currentColor">Bao phủ cụ thể hơn được xét trước metric.</text>
</svg>

**Metric** là giá trị ưu tiên của route; với các route IPv4 unicast cùng prefix trong bài này, số nhỏ hơn được ưu tiên. Lab còn tạo hai route cho `203.0.113.0/24`, metric 100 qua S và metric 200 qua `dead`: lookup chọn 100, xoá 100 thì chọn 200. Đó mới là phép so metric trong cùng ngữ cảnh. [ip-route(8), `metric`](https://man7.org/linux/man-pages/man8/ip-route.8.html).

> **Đo trên lab.** `specific.txt` ghi lookup của đích `10.6.2.2` từ nguồn C, vào `left`, chọn `via 10.6.99.2 dev dead` dù metric là 900 và route /24 trực tiếp vẫn tồn tại. `metric.txt` ghi hai lookup của `203.0.113.9` trước/sau xoá route metric 100. Chỉ đo lookup ở mạng tài liệu `203.0.113.0/24`, không phát probe ra Internet.

Interface `dead` là một **dummy interface — thiết bị ảo nhận các gói được phát vào nó mà không có peer mạng thật trong topology này**. Nó không phải card đang bị kernel đánh dấu `linkdown`; route vẫn đủ điều kiện được chọn. Vì dummy không mô phỏng một next hop Ethernet đang mất ARP, lab này không dùng việc bảng neighbor rỗng để kết luận ARP timeout.

Vận hành thật cần phân biệt route sai với neighbor sai: `ip route get` cho bạn next hop đã chọn, `ip neigh` và capture trên interface ấy giúp kiểm khả năng giao cho next hop. Có route không chứng minh next hop trả lời, có next hop trả lời cũng chưa chứng minh mạng phía sau nó có đường tới đích. Lần lượt chứng minh từng chặng, không dùng một dòng route để thay mọi phép đo.

## ⏸ Dừng lại — đoán trước #2

Xoá /32 sai, bật forwarding. Capture trên S đã thấy Echo Request từ C tới đúng IP của S, nhưng client vẫn timeout. Thay đổi nào **có thể** giải thích toàn bộ quan sát mà không cần đổ lỗi cho đường đi?

- (a) S thiếu route về `10.6.1.2`.
- (b) Request không qua được R.
- (c) R luôn đổi nguồn request thành IP `right`, nhưng tcpdump không hiện.
- (d) Nếu request tới S thì reply bắt buộc tự lần ngược đường cũ, nên chỉ còn lỗi client.

### 3.4 Chiều về là một lookup khác, trên một máy khác

Đáp án **(a)**. S nhận request có nguồn `10.6.1.2`, đích `10.6.2.2`. Khi tạo reply, IP nguồn/đích đảo vai, và S phải tìm route tới `10.6.1.2`. S biết mạng trực tiếp `10.6.2.0/24`; nó không tự học route tới mọi nguồn mà nó từng nhận gói. Route của R không được “truyền” sang S chỉ vì dây nối đã có.

Trong lab, script xoá route `10.6.1.0/24 via 10.6.2.1` ở S. Client không nhận được reply; capture của S vẫn thấy request; lookup của S tới C trả `Network unreachable`. Thêm lại route ấy thì chiều về có đường. Cơ chế không cần NAT: chỉ cần mỗi node ra quyết định cho đích của chính gói nó xử lý.

> **Đo trên lab.** `no-return.txt` chứa ping mất 1/1 và `RTNETLINK answers: Network unreachable`; `return-capture.txt` chứa đúng request `10.6.1.2 > 10.6.2.2` với TTL 63. Đó là bằng chứng request tới S trong lượt đo này. Riêng câu “reply không được tạo/gửi vì lookup nguồn trả lỗi” là diễn giải có kiểm soát từ hai quan sát, không phải tcpdump đọc được ý định của ứng dụng.

**Asymmetric routing — định tuyến bất đối xứng — là hai chiều một luồng đi qua các đường khác nhau.** Có đường về khác đường đi không tự nó là lỗi. Tuy nhiên firewall giữ state hoặc kiểm nguồn có thể yêu cầu điều kiện khác. Bài này chỉ dựng trường hợp **thiếu** đường về, chưa dựng topology nhiều router có đường về thay thế. Đừng gọi mọi timeout chiều về là “asymmetric routing”.

Một phép ping phát ngay trên R có thể làm bạn chẩn đoán sai: R tự chọn nguồn `10.6.2.1` khi ping S. S trả về IP cùng mạng trực tiếp nên không cần route tới C. Ping R → S thành công và C → S thất bại hoàn toàn có thể cùng đúng. Cần lưu nguồn thực tế cùng kết quả, thay vì ghi “server reachable” mà bỏ nguồn probe.

### 3.5 `ip route get` chỉ chính xác với câu hỏi bạn thực sự đã hỏi

**FIB — forwarding information base — là cấu trúc thông tin mà kernel dùng để quyết định xử lý/chuyển tiếp gói.** `ip route show` liệt kê bản ghi theo phạm vi table bạn yêu cầu. `ip route get` hỏi kernel một lookup đã resolve cho một bộ tham số. Lệnh này không gửi ping và không thực hiện chuyến đi đến gateway. [ip-route(8), `ip route get`](https://man7.org/linux/man-pages/man8/ip-route.8.html).

Hai câu hỏi sau khác nhau:

```bash
ip -n net06-r route get 10.6.2.2
ip -n net06-r route get 10.6.2.2 from 10.6.1.2 iif left
```

Câu đầu hỏi gói được tạo cục bộ và cho kernel chọn nguồn. Câu sau cung cấp nguồn C cùng **iif — input interface — là interface gói được giả định đi vào**, để lookup giống gói transit hơn. Nó không đảm bảo gói qua firewall, chỉ cho biết quyết định route ứng với các trường ấy. Với policy routing, thiếu `from` hoặc `iif` có thể làm câu đầu trả một kết quả đẹp nhưng không liên quan đến lỗi thật.

`src` trong output câu đầu thường là nguồn đã chọn. Trong câu thứ hai, nguồn của gói thật đã được cho sẵn; route không có quyền tự thay nó bằng preferred source chỉ để chuyển tiếp. Nếu cần kiểm một flow được đánh dấu, còn phải cung cấp `mark`; nếu policy chọn theo giao thức/cổng, công cụ cũng hỗ trợ `ipproto`, `sport`, `dport`. Bài này chưa đo các selector ấy, nên không dùng lookup thiếu chúng để bác bỏ một rule có selector ấy.

Đừng suy ra có bảng route cache toàn cục chỉ từ chữ `cache` trong output. Bài 5 dùng trường `mtu 1280` để nhận diện PMTU exception; ở đây ta đọc kết quả đường ra. [ip-route(8), NOTES](https://man7.org/linux/man-pages/man8/ip-route.8.html).

### 3.6 Policy rule chọn bảng trước khi bảng chọn đích

**Policy routing — định tuyến theo chính sách — là chọn cách tra route dựa trên các thuộc tính ngoài IP đích, chẳng hạn nguồn hoặc dấu mark.** **RPDB — routing policy database — là tập rule Linux quét để quyết định lookup bảng nào hoặc thực hiện hành động nào.** Chỗ này làm câu “longest prefix luôn thắng mọi route khác” cần thêm điều kiện: phải đang xét các ứng viên trong **bảng/ngữ cảnh lookup được chọn**, không gom tất cả table thành một bảng khổng lồ.

Lab ban đầu có ba rule in trong `policy.txt`: priority 0 tra `local`, 32766 tra `main`, 32767 tra `default`. Số priority nhỏ hơn được xử lý trước. Rule local nhận diện IP của chính R; nếu đích là S, lookup local không có kết quả phù hợp thì quá trình tiếp tục. `default` ở đây là **tên table**, không có nghĩa table ấy chắc chắn chứa default route. [ip-rule(8), DESCRIPTION](https://man7.org/linux/man-pages/man8/ip-rule.8.html).

Giờ script thêm table 106 có route `blackhole default`, rồi chèn rule priority 100: từ `10.6.1.2/32` tra table 106. **Blackhole route** là kết quả loại gói im lặng, khác với “không tìm thấy route để có thể xét rule tiếp”. Một gói C → S bỏ qua local vì S không phải R, khớp rule 100, tìm thấy blackhole và dừng. Route trực tiếp /24 vẫn nằm trong `main`, nhưng lookup chưa bao giờ cần tới nó. [ip-route(8), `blackhole`](https://man7.org/linux/man-pages/man8/ip-route.8.html).

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 275" role="img" aria-labelledby="net06-policy-t net06-policy-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net06-policy-t">Policy chọn table trước lookup đích</title>
<desc id="net06-policy-d">Hai nguồn đi xuống hai table khác nhau. Rule 100 đưa nguồn client vào blackhole, truy vấn local của router đi table main.</desc>
<defs><marker id="net06-policy-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="currentColor"/></marker></defs>
<rect x="15" y="15" width="190" height="50" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/>
<text x="110" y="45" font-size="15" text-anchor="middle" fill="currentColor">from 10.6.1.2</text>
<rect x="285" y="15" width="205" height="50" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/>
<text x="388" y="45" font-size="15" text-anchor="middle" fill="currentColor">from 10.6.2.1</text>
<rect x="15" y="145" width="190" height="65" rx="5" fill="#f43f5e" fill-opacity="0.15" stroke="currentColor"/>
<text x="110" y="170" font-size="15" text-anchor="middle" fill="currentColor">table 106</text>
<text x="110" y="195" font-size="14" text-anchor="middle" fill="currentColor">blackhole default</text>
<rect x="285" y="145" width="205" height="65" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/>
<text x="388" y="170" font-size="14" text-anchor="middle" fill="currentColor">main: /24 → right</text>
<text x="388" y="195" font-size="14" text-anchor="middle" fill="currentColor">đích 10.6.2.2</text>
<g data-step="1">
<path d="M110 65 L110 145" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net06-policy-a)"/><text x="123" y="108" font-size="13" text-anchor="start" fill="currentColor">rule 100 khớp</text>
</g>
<g data-step="2">
<path d="M388 65 L388 145" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net06-policy-a)"/><text x="401" y="100" font-size="13" text-anchor="start" fill="currentColor">đến rule</text><text x="401" y="120" font-size="13" text-anchor="start" fill="currentColor">32766</text>
</g>
<g data-step="3">
<text x="15" y="250" font-size="14" text-anchor="start" fill="currentColor">Không gom route của hai table để so prefix.</text>
</g>
</svg>
<step-note data-step="1">Nguồn C khớp rule 100. Blackhole là kết quả kết thúc tra cứu, không phải không tìm thấy route.</step-note>
<step-note data-step="2">Truy vấn local không dùng nguồn C nên bỏ qua rule 100 và tìm được route ở main.</step-note>
<step-note data-step="3">Route /24 ở main không cứu được gói đã có kết quả blackhole ở table 106.</step-note>
</step-flow>

**Gói tự tạo trên R và gói chuyển từ C không cùng policy input.** Lookup cục bộ chọn nguồn R nên không khớp `from 10.6.1.2`; nó tiếp tục tới main và cho `dev right`. Lookup có `from 10.6.1.2 iif left` khớp blackhole, trả lỗi. Bản chẩn đoán “route get tốt, chắc firewall” vì vậy bị phá bằng chính một lookup đầy đủ hơn.

Nếu table được chọn không có route khớp, việc xét rule tiếp theo có thể tiếp tục. `throw` là một loại route dùng để kết thúc lookup bảng như trường hợp không có route phù hợp; nó khác blackhole có kết quả loại gói. Bài không dựng `throw`; chỉ nêu để tránh suy ra “hễ rule lookup một table là chắc chắn kết thúc toàn bộ RPDB”. [ip-route(8), route type `throw`](https://man7.org/linux/man-pages/man8/ip-route.8.html).

### 3.7 Có route ra đúng mà gói vẫn không ra: kiểm phần ngoài lookup

Sau khi phân biệt rule và route, quay về điều kiện thực sự chuyển tiếp. **Reverse path filtering — kiểm đường ngược — là kiểm nguồn của gói đến bằng thông tin route ngược về nguồn đó.** Linux `rp_filter=1` là strict: interface nhận phải phù hợp đường ngược tốt nhất; mode 2 là loose: nguồn phải reachable qua một interface nào đó; 0 tắt kiểm này. Tài liệu còn quy định lấy giá trị lớn hơn giữa `conf/all` và interface để kiểm. [Linux IP sysctl, rp_filter](https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html).

Trong lab, sau khi bật forwarding, script đặt `all`, `default`, `left`, `right` của R về 0 để cô lập những lỗi đang dạy. Đây là cấu hình thí nghiệm, không phải đề xuất tắt xác minh nguồn cho mọi router. **Chưa đo drop do rp_filter**; nếu gặp một mạng nhiều card và đường về khác tuyến, phải đo cả rule, reverse lookup và cấu hình thực của interface trước khi khẳng định nó là thủ phạm.

Firewall có nhánh cho gói nhận tại máy và nhánh cho gói transit; cho phép ping IP của R không phải bằng chứng rule cho transit. Với ca này, script không thêm firewall vào namespace R. Khi debug hệ thật, đọc chính bộ luật đang hoạt động và counter tăng khi gửi probe; không thêm allow-all chỉ để “loại trừ firewall”. MTU đã có bài 5; TTL và thông báo ICMP sẽ được kiểm sâu ở bài 8. Bản đồ này để chọn phép đo tiếp theo, không phải danh sách yêu cầu sửa cùng lúc.

## 4. Lab

### 4.1 Dựng router không NAT và chạy lại được từ đầu

Bộ lab `net-lab/net-06/` gồm `run.sh`, `inside.sh`, `out/`, `src/`. Trên máy tác giả là `~/projects/net-lab/net-06/`. Chạy:

```bash
cd ~/projects/net-lab/net-06
./run.sh
```

`run.sh` tạo container `net06-lab`, cài iproute2, iputils, tcpdump, rồi gọi `inside.sh`; output đi qua `tee` vào `out/run.txt`. Trap xoá container khi script kết thúc. Namespace và veth thuộc container nên cũng biến mất; không sửa route của máy macOS. Quyền `--privileged` dùng để tạo các ngăn mạng trong lab.

C có `c0=10.6.1.2/24`, nối `left=10.6.1.1/24` của R. R có thêm `right=10.6.2.1/24`, nối `s0=10.6.2.2/24` của S. C có default route về `10.6.1.1`; S có route `10.6.1.0/24` qua `10.6.2.1`. R tự có connected route của hai mạng khi gán địa chỉ. Những địa chỉ này là tham số dựng lab, không phải số đo từ Internet.

Các lệnh dưới đây nằm trong `inside.sh`, chạy bên trong container khi namespace còn sống. Muốn làm từng bước thì dừng script ở bước tương ứng; sau khi `run.sh` hoàn tất, container đã được dọn.

### 4.2 Có route, ping router được, forwarding vẫn tắt

Script gán địa chỉ và đường về trước, rồi chủ động tắt forwarding ở R. Các phép đo chính:

```bash
ip netns exec net06-r sysctl -w net.ipv4.ip_forward=0
ip netns exec net06-c ping -c 1 -W 1 10.6.1.1
ip netns exec net06-c ping -c 1 -W 1 10.6.2.2
ip -n net06-r route get 10.6.2.2
```

Trích các dòng quyết định trong `out/forward-off.txt`, theo thứ tự ping router, ping S, lookup:

```text
1 packets transmitted, 1 received, 0% packet loss, time 0ms
1 packets transmitted, 0 received, 100% packet loss, time 0ms
10.6.2.2 dev right src 10.6.2.1 uid 0
```

Ta đã có cả route và local reachability nhưng chưa có transit. Bật forwarding:

```bash
ip netns exec net06-r sysctl -w net.ipv4.ip_forward=1
# Các giá trị lab được đặt sau khi bật ip_forward.
for i in all default left right; do
  ip netns exec net06-r sysctl -w net.ipv4.conf.$i.rp_filter=0
done
ip netns exec net06-c ping -c 1 -W 1 10.6.2.2
```

`out/forward-on.txt` ghi:

```text
1 packets transmitted, 1 received, 0% packet loss, time 0ms
```

Script ghi `out/forward-capture.txt` bằng tcpdump trên `any` của R, có tên interface và hướng In/Out. Trong file, cùng request có IP Identification giống nhau ở `left In` TTL 64 và `right Out` TTL 63. Số dòng capture không phải số request phát bởi client: cùng datagram được quan sát tại hai điểm. Reply cũng xuất hiện hai lần, tổng cộng bốn observation cho một ping request/reply. Không tính “4 packet” thành bốn Echo Request.

### 4.3 Gài host route sai dù metric 900

Script tạo dummy `dead=10.6.99.1/24`, thêm route host qua `10.6.99.2`, rồi đo:

```bash
ip -n net06-r route add 10.6.2.2/32 via 10.6.99.2 metric 900
ip -n net06-r route get 10.6.2.2 from 10.6.1.2 iif left
ip netns exec net06-c ping -c 1 -W 1 10.6.2.2
```

Trích `out/specific.txt`:

```text
10.6.2.2 from 10.6.1.2 via 10.6.99.2 dev dead
    cache iif left
1 packets transmitted, 0 received, 100% packet loss, time 0ms
```

Route /24 vẫn còn trong file đó. Xoá host route bằng đúng prefix `ip -n net06-r route del 10.6.2.2/32`; không flush cả bảng. Để kiểm riêng metric, script tạo hai route cùng prefix của dải tài liệu:

```bash
ip -n net06-r route add 203.0.113.0/24 via 10.6.2.2 metric 100
ip -n net06-r route add 203.0.113.0/24 via 10.6.99.2 metric 200
ip -n net06-r route get 203.0.113.9
ip -n net06-r route del 203.0.113.0/24 via 10.6.2.2 metric 100
ip -n net06-r route get 203.0.113.9
```

Trích `out/metric.txt`:

```text
203.0.113.9 via 10.6.2.2 dev right src 10.6.2.1 uid 0
203.0.113.9 via 10.6.99.2 dev dead src 10.6.99.1 uid 0
```

Đây chỉ là hai kết quả **lookup**. S không được cấu hình làm router cho `203.0.113.0/24`; bài không nói các đích của prefix này thật sự reachable qua S. Chính việc tách lookup khỏi reachability ngăn ta gọi nhầm một route được chọn là một đường truyền đã kiểm thành công.

### 4.4 Cho request tới server nhưng lấy mất đường về

Script bỏ route về client ở S, đồng thời capture `s0` của S:

```bash
ip -n net06-s route del 10.6.1.0/24
ip netns exec net06-c ping -c 1 -W 1 10.6.2.2
ip -n net06-s route get 10.6.1.2
```

`out/no-return.txt` có:

```text
1 packets transmitted, 0 received, 100% packet loss, time 0ms
RTNETLINK answers: Network unreachable
```

`out/return-capture.txt` có dòng request thật:

```text
    10.6.1.2 > 10.6.2.2: ICMP echo request, id 79, seq 1, length 64
```

ID ICMP 79 chỉ nhận diện phép ping của lượt chạy này, không phải một hằng số của topology. Đọc cùng file còn thấy TTL 63 ở header IP. Nếu chỉ capture ở C, bạn biết không có reply về nhưng chưa biết request đã tới S hay chưa; điểm đo thứ hai loại được giả thuyết đứt đường đi. Script thêm lại route về trước bước policy tiếp theo:

```bash
ip -n net06-s route add 10.6.1.0/24 via 10.6.2.1
```

### 4.5 `main` đúng nhưng rule chọn blackhole ở table khác

```bash
ip -n net06-r route add blackhole default table 106
ip -n net06-r rule add priority 100 from 10.6.1.2/32 lookup 106
ip -n net06-r rule show
ip -n net06-r route get 10.6.2.2
ip -n net06-r route get 10.6.2.2 from 10.6.1.2 iif left
```

Trích `out/policy.txt`, các rule sau khi thêm và hai kết quả lookup:

```text
0:      from all lookup local
100:    from 10.6.1.2 lookup 106
32766:  from all lookup main
32767:  from all lookup default
10.6.2.2 dev right src 10.6.2.1 uid 0
RTNETLINK answers: Invalid argument
```

Khoảng cách sau dấu `:` được trình bày lại cho dễ đọc; các field giữ nguyên log. Lỗi `Invalid argument` ở lookup thứ hai khớp với blackhole trong trường hợp này; không lấy thông báo chung ấy làm chữ ký duy nhất của policy routing. Ping từ C cũng thất bại; xoá rule priority 100 rồi ping lại thì nhận 1/1. Table 106 còn route nhưng không còn rule này chọn nó cho gói C, nên kết quả thay đổi. Main table không đổi.

**Đọc route có đủ ngữ cảnh trước khi sửa:** `ip rule show`; `ip route show table 106`; `ip route get ... from ... iif ...`. Nếu đang dùng namespace, thêm `-n` hoặc vào đúng namespace: route của container ngoài không phải route của R.

### 4.6 Địa chỉ local và gateway không tự thành hợp lệ

`out/local-gateway.txt` lưu table local của R, trong đó có các dòng `local 10.6.1.1`, `local 10.6.2.1`, cùng route broadcast và loopback.

Script còn thử thêm route qua một gateway nằm ngoài các link của R:

```bash
ip -n net06-r route add 198.51.100.0/24 via 10.6.88.1
```

Output thật:

```text
Error: Nexthop has invalid gateway.
```

Đây là lỗi khi **cài route**, trước khi gửi bất kỳ gói nào tới mạng ấy. `onlink` có thể yêu cầu kernel coi next hop là trực tiếp trên link dù không khớp prefix interface, theo [ip-route(8), `onlink`](https://man7.org/linux/man-pages/man8/ip-route.8.html). Nó không tạo dây nối, không làm next hop trả lời và không phải cách sửa mặc định cho một gateway gõ sai. Lab không ép `onlink`; điều cần học là phân biệt route chưa cài được, route cài được nhưng chọn sai, và route đúng nhưng forwarding không cho qua.

## 5. Tính tay

### 5.1 Đọc bảng trước khi đọc metric

**Đề giả định.** Trong một table có `/0 via A metric 5`, `10.6.0.0/16 via B metric 20`, `10.6.2.0/24 via C metric 300`, `10.6.2.2/32 via D metric 900`. Không có policy khác và mọi next hop đều hợp lệ. Gói tới `10.6.2.2`, `10.6.2.3`, `10.6.3.9`, `192.0.2.9` chọn đâu? Nếu D im lặng, gói đầu có tự chuyển qua C không?

**Lời giải.** Lần lượt D, C, B, A. Từng đích chọn prefix khớp cụ thể nhất trước khi metric có ý nghĩa giữa các ứng viên tương đương. D im lặng không phải sự kiện tự xoá route D; lookup tiếp vẫn có thể chọn /32 ấy. Muốn chuyển đường cần một cơ chế cập nhật/loại route hoặc policy failover, không thể suy ra failover chỉ từ metric. Các giá trị A–D và metric là dữ kiện bài tính; phần /32 metric 900 thắng /24 đã được kiểm riêng ở lab.

### 5.2 Đếm observation, không đếm nhầm số router

**Đề.** Capture `any` trên R thấy một Echo Request ở `left In` TTL 64, cũng request ấy ở `right Out` TTL 63; Echo Reply ở `right In` TTL 64, `left Out` TTL 63. Có bao nhiêu gói do endpoint khởi tạo, bao nhiêu observation và bao nhiêu lần giảm TTL? Nếu request tới R có TTL 1 thì có thể xuất hiện tại `right Out` với TTL 0 không?

**Lời giải.** Hai datagram do hai endpoint tạo: một request, một reply. Bốn observation tại các interface. Hai lần giảm TTL, mỗi datagram qua R một lần. Không cộng `64 − 63` của request với reply để nói giữa C và S có hai router. Với TTL 1, R không được forward datagram ra đường tiếp theo với TTL 0; nó loại gói, việc phát ICMP Time Exceeded có các điều kiện theo [RFC 1812 §5.3.1 và §4.3.3.4](https://www.rfc-editor.org/rfc/rfc1812#section-5.3.1). Trường hợp TTL 1 là **suy luận theo chuẩn, chưa đo trong bài này**; bài 8 sẽ dùng nó cho traceroute.

### 5.3 Cùng đích, khác nguồn, khác kết quả

**Đề.** Dùng các rule của lab: priority 0 lookup local; 100 từ C lookup 106; 32766 lookup main. Table 106 có blackhole `/0`; main có connected `10.6.2.0/24`. Xét gói từ C tới S, gói tạo trên R với nguồn `10.6.2.1` tới S, rồi gói từ C tới **IP của R** là `10.6.1.1`. Mỗi gói kết thúc ở đâu?

**Lời giải.** C → S: local không nhận diện S là địa chỉ của R; rule 100 khớp; blackhole ở 106 kết thúc. R → S: nguồn không khớp rule 100; main chọn right. C → IP R: local đã cho kết quả local delivery trước khi tới rule 100, nên rule source blackhole đó không chặn được gói theo đường lookup đang giả định. Hai trường hợp đầu có đối chứng lab; trường hợp thứ ba là **suy luận từ thứ tự rule và table local đã đo**, chưa có probe riêng khi blackhole đang bật. Không thay “rule 100 từ C” bằng kết luận “mọi traffic từ C đều bị chặn”.

## 6. Chuyển giao

1. Một máy backup có hai NIC, default route metric thấp đi qua card không muốn dùng cho mạng storage. Bạn sẽ kiểm prefix và nguồn nào trước khi đổi metric? Nêu lookup đủ tham số.
2. Ping do router tự phát thành công, ping từ container qua router thất bại. Hãy thiết kế hai điểm capture và một lookup để phân biệt thiếu đường về với policy theo nguồn.
3. Một route đã cài từ trước khi VPN ngắt vẫn tồn tại, và route Internet rộng hơn có metric thấp hơn. Điều gì phải thay đổi trong bảng hoặc policy để lưu lượng thực sự chuyển sang tuyến Internet?
4. Bạn thấy đích gateway có trong `ip neigh` nhưng HTTP vẫn timeout. Kết quả neighbor đã chứng minh tới chặng nào, và chưa chứng minh những gì ở các chặng tiếp theo?
5. Request vào card A, lookup ra card B, nhưng capture B không có gói. Hãy xếp các phép kiểm forwarding, firewall counter, reverse path filtering và MTU theo bằng chứng cần có; đừng sửa bốn thứ cùng lúc.
6. Một gateway nhiều card có policy theo source và mark, hai đường về hợp lệ, health check tự phát luôn xanh nhưng chỉ một nhóm flow transit mất sau khi đổi tuyến. Thiết kế thí nghiệm tách được policy sai, reverse path filtering và firewall state mà không dùng NAT hoặc tắt toàn bộ firewall để che triệu chứng. Nêu cả bằng chứng có thể bác bỏ từng giả thuyết và cách giữ nguyên nguồn probe.

## 7. Tóm tắt

- Gói tới IP của router là local delivery; ping IP ấy thành công không chứng minh transit đã hoạt động. Lab `forward-off.txt` cho thấy hai kết quả khác nhau.
- `ip_forward` điều khiển chuyển tiếp IPv4 giữa interface; route tồn tại không thay công tắc này. [Linux IP sysctl](https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html).
- Next hop là địa chỉ chặng kế; forwarding của lab giữ nguyên IP C → S và giảm TTL 64 xuống 63 (`forward-capture.txt`).
- Lab /32 metric 900 thắng /24 trực tiếp; hai route cùng /24 ưu tiên metric 100 hơn 200 (`specific.txt`, `metric.txt`).
- Reply có lookup riêng trên server; request tới S nhưng S thiếu route về C vẫn làm client timeout (`return-capture.txt`, `no-return.txt`).
- Rule chọn table; một blackhole đã khớp ở table 106 không bị route /24 trong main ghi đè (`policy.txt`).
- `ip route get` không gửi gói; thêm nguồn và interface đầu vào để hỏi đúng quyết định cho transit. [ip-route(8)](https://man7.org/linux/man-pages/man8/ip-route.8.html).

→ **Bài 7 — NAT và conntrack**: đã dựng được đường đi giữ nguyên IP, ta sẽ xem khi gateway phải đổi địa chỉ thì kernel nhớ ánh xạ và xử lý chiều về thế nào.
