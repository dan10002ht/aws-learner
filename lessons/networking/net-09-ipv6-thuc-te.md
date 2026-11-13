# Bài 9 — IPv6 khi chạy thật: có địa chỉ vẫn chậm một nhịp fallback

## 1. Mục tiêu

Sau bài này bạn có thể:

- Đọc một Router Advertisement và phân biệt thông tin tạo địa chỉ, xác định on-link và chọn default router.
- Dùng địa chỉ, route và neighbor cache để xác định IPv6 mới hoạt động tới đâu, thay vì kết luận từ một dòng `inet6`.
- Nhận diện Router Solicitation, Router Advertisement và Neighbor Solicitation dùng cho DAD trong capture của lab.
- Giải thích bằng timeline vì sao một request thành công qua IPv4 vẫn có thể trả giá cho đường IPv6 hỏng.
- Tách thời gian chờ Happy Eyeballs khỏi DNS, bắt tay TCP và xử lý HTTP bằng probe ép từng họ địa chỉ cùng trace có timestamp.
- Đề xuất phép kiểm sau sửa mà fallback IPv4 không che được lỗi IPv6.

## 2. Triệu chứng

Một API có cả địa chỉ IPv4 lẫn IPv6. Sau khi bật IPv6 cho mạng client, request vẫn trả HTTP 200 nhưng kết nối mới xuất hiện thêm khoảng **một phần tư giây**. Backend không đổi handler; ép client dùng IPv4 thì phần chờ biến mất. Client có địa chỉ IPv6 tự sinh, có default route và thấy router trong neighbor cache. Nhìn dashboard chỉ đếm tỷ lệ HTTP thành công, sự cố gần như vô hình.

> **Đo trên lab.** Alpine `3.20`, Linux `6.8.0-64-generic`, aarch64, curl `8.14.1`; `out/broken.txt` ghi request ép IPv4 thành công, request ép IPv6 hết hạn kết nối, còn request có hai ứng viên vẫn HTTP 200 qua IPv4. Delay Happy Eyeballs được **chủ động đặt 250 ms**, không lấy mặc định của curl. Số cụ thể và trace nằm ở §4; chạy lại bằng `net-lab/net-09/run.sh`.

Bản chẩn đoán đầu tiên: **“Có `inet6`, default route và HTTP 200 thì IPv6 đã tốt; phần chậm còn lại chắc do backend.”** Ta sẽ cho chính bản sai đó chạy trước. Một địa chỉ là state cục bộ, một route là quyết định chuyển tiếp, còn HTTP 200 có thể thuộc về một kết nối IPv4 hoàn toàn khác.

## ⏸ Dừng lại — đoán trước #1

Client có địa chỉ SLAAC và default route IPv6. API trả HTTP 200, `remote_ip` là `10.9.2.2`. Kết luận nào hợp lệ?

- (a) Địa chỉ IPv6 tự sinh chứng minh router đã kiểm tra Internet IPv6 giúp client.
- (b) HTTP 200 chứng minh cả IPv4 lẫn IPv6 của API đều hoạt động.
- (c) Kết nối thắng dùng IPv4; những state IPv6 cục bộ chưa chứng minh đường tới API.
- (d) Chỉ cần tăng timeout backend là loại được khoảng chờ trước khi TCP IPv4 bắt đầu.

## 3. Cơ chế

### 3.1 SLAAC cấp địa chỉ; nó không chạy health check đường xa

Đáp án là **(c)**. **SLAAC — Stateless Address Autoconfiguration — là cơ chế host tự hình thành địa chỉ IPv6 từ thông tin prefix do router quảng bá và phần định danh interface do host tạo.** Nó giải quyết việc cấu hình địa chỉ mà không cần server cấp riêng một lease cho từng host. Nó không kết nối thử tới API của bạn trước khi cho phép sử dụng địa chỉ. [RFC 4862 §1 và §5](https://www.rfc-editor.org/rfc/rfc4862#section-5).

Host trước hết có **link-local**, địa chỉ chỉ có ý nghĩa trên link gắn trực tiếp; trong lab, client dùng `fe80::ff:fe09:102` trên `c0`. Nhờ nó, client trao đổi điều khiển với router trước khi có địa chỉ cho mạng phía sau router. Một link-local xuất hiện không có nghĩa ISP đã cấp prefix để đi Internet. Khi ghi địa chỉ link-local cho công cụ, phải xác định đúng interface, chẳng hạn dạng `fe80::ff:fe09:101%c0`: cùng một giá trị địa chỉ có thể nằm ở những link khác nhau. Quy tắc scope và lựa chọn interface được mô tả trong [RFC 4007 §11](https://www.rfc-editor.org/rfc/rfc4007#section-11).

**NDP — Neighbor Discovery Protocol — là tập cơ chế ICMPv6 để tìm router, thông tin link và láng giềng trên link.** Trong phần cấu hình ban đầu, client có thể gửi **RS — Router Solicitation — thông điệp yêu cầu router quảng bá sớm**, thay vì chờ quảng bá định kỳ. Router gửi **RA — Router Advertisement — thông điệp mang thông tin router và các tùy chọn cấu hình link**. RS không xin một lease địa chỉ riêng; RA có thể phục vụ nhiều host trên cùng link. [RFC 4861 §3.1, §4.1–4.2](https://www.rfc-editor.org/rfc/rfc4861#section-4.2).

RA của lab chứa prefix `2001:db8:9:1::/64`; client kết hợp nó với phần định danh interface để tạo `2001:db8:9:1:0:ff:fe09:102/64`. Để output dễ đối chiếu, script cố định MAC client và chọn chế độ sinh định danh dựa trên MAC, đồng thời tắt địa chỉ tạm ở interface này. **Đây là lựa chọn của lab**: không được suy từ đuôi `ff:fe` trong bài rằng mọi điện thoại, laptop hay Linux production đều để lộ MAC trong địa chỉ SLAAC. Linux có các chế độ sinh địa chỉ khác; xem `addr_gen_mode`, `stable_secret`, `use_tempaddr` trong [tài liệu IP sysctl của kernel](https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html).

Trước khi dùng địa chỉ theo thủ tục thông thường, host thực hiện **DAD — Duplicate Address Detection — kiểm tra xem địa chỉ dự kiến có đang bị node khác dùng trên cùng link không**. Nó dùng **NS — Neighbor Solicitation — thông điệp hỏi về một địa chỉ láng giềng**; với DAD, source IPv6 là `::` vì địa chỉ đang thử chưa được coi là đã sở hữu. **NA — Neighbor Advertisement — thông điệp thông báo về địa chỉ láng giềng** có thể cho thấy địa chỉ đã bị chiếm. Không thấy xung đột trong thủ tục DAD không chứng minh máy có đường tới một server xa. [RFC 4862 §5.4](https://www.rfc-editor.org/rfc/rfc4862#section-5.4).

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 410" role="img" aria-labelledby="net09-slaac-t net09-slaac-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net09-slaac-t">Từ RA tới địa chỉ sử dụng được</title>
<desc id="net09-slaac-d">Host C và router R cố định; RS, RA, DAD rồi địa chỉ hết tentative. Trạng thái tentative biến mất ở bước cuối.</desc>
<defs><marker id="net09-slaac-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="currentColor"/></marker></defs>
<rect x="20" y="16" width="120" height="44" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/>
<rect x="380" y="16" width="120" height="44" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/>
<text x="80" y="44" font-size="14" text-anchor="middle" fill="currentColor">C · host</text>
<text x="440" y="44" font-size="14" text-anchor="middle" fill="currentColor">R · router</text>
<path d="M80 60 V325 M440 60 V325" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="5 5"/>
<g data-step="1">
<path d="M80 104 L440 104" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#net09-slaac-a)"/>
<text x="260" y="91" font-size="14" text-anchor="middle" fill="currentColor">RS → hỏi router trên link</text>
</g>
<g data-step="2">
<path d="M440 163 L80 163" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#net09-slaac-a)"/>
<text x="260" y="143" font-size="13" text-anchor="middle" fill="currentColor">RA · 2001:db8:9:1::/64 · A=1, L=1</text>
<text x="260" y="189" font-size="13" text-anchor="middle" fill="currentColor">Gateway lấy từ nguồn fe80::ff:fe09:101</text>
</g>
<g data-step="3">
<path d="M80 246 H220" fill="none" stroke="currentColor" marker-end="url(#net09-slaac-a)"/>
<text x="305" y="235" font-size="13" text-anchor="middle" fill="currentColor">DAD: NS source ::</text>
<text x="305" y="257" font-size="13" text-anchor="middle" fill="currentColor">multicast trên link</text>
</g>
<g data-step="2" data-until="3">
<rect x="30" y="340" width="460" height="50" rx="7" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/>
<text x="260" y="370" font-size="14" text-anchor="middle" fill="currentColor">Địa chỉ đang chờ kiểm trùng: tentative</text>
</g>
<g data-step="4">
<rect x="30" y="340" width="460" height="50" rx="7" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/>
<text x="260" y="360" font-size="14" text-anchor="middle" fill="currentColor">2001:db8:9:1:0:ff:fe09:102/64</text>
<text x="260" y="380" font-size="13" text-anchor="middle" fill="currentColor">Được dùng sau DAD; chưa kiểm server xa</text>
</g>
</svg>
<step-note data-step="1">RS giúp host yêu cầu quảng bá sớm; RA cũng có thể đến tự phát trước RS. Hình trình bày quan hệ phụ thuộc, không khẳng định mọi boot có cùng thứ tự packet.</step-note>
<step-note data-step="2">Tùy chọn prefix cho phép tạo địa chỉ và xác định on-link; thông tin default router đến từ nguồn RA và Router Lifetime, không từ việc ghép prefix.</step-note>
<step-note data-step="3">DAD kiểm trùng địa chỉ dự kiến trên link bằng NS với source chưa xác định. Nó không hỏi API ở phía sau router.</step-note>
<step-note data-step="4">Không phát hiện xung đột trong thủ tục thì địa chỉ hết tentative. State cũ được thay tại cùng vị trí; khả năng end-to-end vẫn phải đo riêng.</step-note>
</step-flow>

Cách viết địa chỉ và chia prefix nằm ở [[eng-02-cidr-subnetting]], mô hình tầng ở [[eng-osi-model]], TCP/TLS ở [[eng-03-tcp-tls]]. Bài này đi vào cấu hình host và lựa chọn đường kết nối.

### 3.2 Một RA tạo các state độc lập, không phải một cờ “IPv6 đã xong”

**Prefix Information Option — PIO — là tùy chọn trong RA mô tả một prefix cùng cờ và lifetime của nó.** Hai cờ cần đọc tách biệt: **A — Autonomous — cho phép dùng prefix để tự cấu hình địa chỉ**; **L — On-link — cho biết prefix có thể được dùng để xác định đích nằm trực tiếp trên link**. Một cờ trả lời “tôi được tự tạo địa chỉ từ đây không?”, cờ kia trả lời “đích này có cần qua router không?”. Không thay một câu hỏi bằng câu kia. [RFC 4861 §4.6.2](https://www.rfc-editor.org/rfc/rfc4861#section-4.6.2).

Với RA lab, cả A và L đều bật. Vì thế Linux vừa có địa chỉ global-scope tự sinh vừa có route on-link cho `2001:db8:9:1::/64`. Nhưng **default router không phải là prefix trong PIO**. Host học router từ địa chỉ nguồn link-local của RA, kết hợp Router Lifetime và các quy tắc xử lý RA. Bởi vậy dòng route là `default via fe80::ff:fe09:101 dev c0`, dù router còn có địa chỉ `2001:db8:9:1::1`. Hai cách đánh địa chỉ cùng tồn tại, không cần “sửa gateway sang địa chỉ global cho đẹp”. [RFC 4861 §6.3.4](https://www.rfc-editor.org/rfc/rfc4861#section-6.3.4).

> **Nguồn.** RFC 4861 §4.2: *“The Router Lifetime applies only to the router's usefulness as a default router”* ([RFC 4861](https://www.rfc-editor.org/rfc/rfc4861#section-4.2)). Thời hạn default router độc lập với thời hạn prefix và địa chỉ; RA có Router Lifetime bằng 0 không đồng nghĩa mọi địa chỉ tự sinh từ các tùy chọn của nó phải biến mất.

Ở phía địa chỉ còn có **preferred lifetime**, khoảng thời gian địa chỉ được ưu tiên dùng, và **valid lifetime**, khoảng thời gian địa chỉ còn hợp lệ. Hết preferred thì địa chỉ chuyển sang **deprecated**, vẫn hợp lệ nhưng nên tránh chọn cho kết nối mới khi có lựa chọn phù hợp khác; hết valid thì địa chỉ không còn hợp lệ. Đừng đọc `deprecated` thành “socket đang mở chắc chắn bị kernel đóng ngay”. Quy tắc sử dụng địa chỉ nằm trong [RFC 4862 §5.5.4](https://www.rfc-editor.org/rfc/rfc4862#section-5.5.4).

RA lab cấu hình Router Lifetime `1800 s`, preferred `1800 s`, valid `3600 s`. Hai giá trị đầu giống nhau chỉ vì file cấu hình chọn như vậy, không vì giao thức bắt buộc bằng nhau. Đầu ra lúc đọc thường đã trừ một vài giây kể từ RA cuối. Nếu router tiếp tục quảng bá prefix, các lifetime có thể được cập nhật; phép tính hết hạn phải nói rõ có còn RA mới hay không.

**Chỗ hay sai khi bật forwarding trên Linux:** `accept_ra=1` chấp nhận RA khi forwarding bị tắt; `accept_ra=2` cho phép chấp nhận RA ngay cả khi forwarding bật. Host/router có vai trò khác nhau. Trong lab client là host, nhận RA với forwarding tắt; R là router và được cấu hình route riêng. Nếu máy của bạn vừa chuyển tiếp vừa cần học RA ở uplink, đọc giá trị thực trên đúng interface trước khi quy lỗi cho prefix. Đây là **quy tắc từ tài liệu, chưa đo trường hợp forwarding/RA kết hợp trong lab này**. [Linux IP sysctl, `accept_ra`](https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html).

### 3.3 Dual-stack là hai đường có thể hỏng độc lập

**Dual-stack là việc cùng hỗ trợ IPv4 và IPv6 trên hệ thống.** Một tên DNS có thể trả bản ghi A cho IPv4 và AAAA cho IPv6; client vẫn phải chọn đích, chọn source phù hợp, lookup route rồi mở kết nối. Bản ghi AAAA là thông tin tên → địa chỉ, không phải chứng nhận server đang nghe hay firewall đang cho qua. Lựa chọn địa chỉ nguồn/đích còn chịu chính sách của hệ điều hành và ứng dụng; không có luật “AAAA luôn thắng trong mọi tình huống”. [RFC 6724 §5–6](https://www.rfc-editor.org/rfc/rfc6724#section-6).

Trong lab, C đi qua cùng router R tới cùng server S. Tuyến IPv4 dùng `10.9.1.2 → 10.9.2.2`; tuyến IPv6 dùng địa chỉ SLAAC của C tới `2001:db8:9:2::2`. Server mở socket cho từng địa chỉ, cùng port `8080`, cùng handler HTTP. Không NAT, không TLS, không DNS thật: ta cố ý bớt các biến để đo quyết định kết nối.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 415" role="img" aria-labelledby="net09-path-t net09-path-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net09-path-t">Một topology hai họ địa chỉ, chỉ một đường bị chặn</title>
<desc id="net09-path-d">Hai nhánh từ C qua R tới S. IPv4 đi liên tục; IPv6 có chỗ ngắt tại router cho TCP port 8080. RA và NDP ở link C R không bị luật này chặn.</desc>
<defs><marker id="net09-path-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="currentColor"/></marker></defs>
<rect x="145" y="10" width="230" height="65" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/>
<text x="260" y="35" font-size="14" text-anchor="middle" fill="currentColor">C · c0</text>
<text x="260" y="57" font-size="13" text-anchor="middle" fill="currentColor">10.9.1.2 + SLAAC</text>
<rect x="145" y="163" width="230" height="65" rx="7" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/>
<text x="260" y="187" font-size="14" text-anchor="middle" fill="currentColor">R · left ↔ right</text>
<text x="260" y="210" font-size="13" text-anchor="middle" fill="currentColor">forwarding hai họ</text>
<rect x="145" y="320" width="230" height="72" rx="7" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/>
<text x="260" y="342" font-size="14" text-anchor="middle" fill="currentColor">S · TCP 8080</text>
<text x="260" y="362" font-size="13" text-anchor="middle" fill="currentColor">10.9.2.2</text>
<text x="260" y="382" font-size="13" text-anchor="middle" fill="currentColor">2001:db8:9:2::2</text>
<path d="M145 44 H70 V180 H145 M145 210 H70 V355 H145" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net09-path-a)"/>
<text x="106" y="116" font-size="14" text-anchor="middle" fill="currentColor">IPv4</text>
<text x="106" y="138" font-size="13" text-anchor="middle" fill="currentColor">đi tới S</text>
<path d="M375 44 H450 V180 H375 M375 210 H450 V235 M450 278 V355 H375" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net09-path-a)"/>
<rect x="431" y="235" width="38" height="41" rx="7" fill="#f43f5e" fill-opacity="0.15" stroke="currentColor"/>
<text x="450" y="261" font-size="20" text-anchor="middle" fill="currentColor">✗</text>
<text x="410" y="116" font-size="14" text-anchor="middle" fill="currentColor">IPv6</text>
<text x="410" y="138" font-size="13" text-anchor="middle" fill="currentColor">tới R được</text>
<text x="260" y="265" font-size="13" text-anchor="middle" fill="currentColor">RA và neighbor C–R vẫn hoạt động</text>
<text x="260" y="288" font-size="13" text-anchor="middle" fill="currentColor">Chỉ TCP IPv6 qua R bị chặn</text>
</svg>

Luật DROP chỉ nằm trong IPv6 FORWARD trên R, khớp TCP destination port `8080`. Nó không xoá địa chỉ C, không xoá RA, không chặn mọi ICMPv6 và không làm IPv4 hỏng. Vì SYN biến mất mà không có lỗi trả về, client còn phải giữ lần thử IPv6 đang chờ. **Black hole** trong bài là kiểu mất gói im lặng ấy; nó khác trường hợp lỗi cục bộ `Network unreachable` hoặc RST từ port không có listener.

Trong vận hành, hai họ địa chỉ có thể khác route, firewall, listener, cấu hình LB và đường về, dù cùng tên miền và cùng application handler. Đây là **suy luận từ các điều kiện để một kết nối hoạt động**, không phải lab đã kiểm mọi cloud/LB. Cách bác bỏ suy luận “hai họ đều tốt” là ép từng họ kết nối tới đúng tên, đúng port và ghi địa chỉ thực sự được chọn.

Nếu IPv6 nối TCP được nhưng TLS với gói lớn mới treo, hãy quay lại [[net-05-mtu-pmtud]]: đường đã qua SYN không chứng minh PMTU/ICMPv6 Packet Too Big hoạt động. Router IPv6 không phân mảnh gói đang forward; fragmentation nếu cần do nguồn thực hiện. [RFC 8200 §5](https://www.rfc-editor.org/rfc/rfc8200#section-5). Lab bài này chỉ tạo lỗi SYN, không đo trường hợp lỗi sau bắt tay.

## ⏸ Dừng lại — đoán trước #2

Client bắt đầu TCP IPv6 ở thời điểm `t = 0`. Gói bị DROP im lặng. Delay Happy Eyeballs đặt `250 ms`, IPv4 vẫn tốt. Client phải làm gì để tránh chờ hết timeout IPv6?

- (a) Đợi IPv6 timeout rồi mới lấy bản ghi A.
- (b) Bắt đầu lần thử IPv4 khi tới lịch; lần thử IPv6 có thể còn đang chờ.
- (c) Gửi cùng request HTTP bằng cả hai đường ngay từ đầu.
- (d) Đổi toàn bộ địa chỉ IPv6 của server sang IPv4 ở router.

### 3.4 Happy Eyeballs đua các lần kết nối, không đua hai lần thanh toán

Đáp án là **(b)**. **Happy Eyeballs là thuật toán tổ chức các ứng viên địa chỉ và khởi động những lần thử kết nối có khoảng cách, để một họ địa chỉ hỏng không giữ ứng dụng chờ hết timeout của nó.** Theo RFC 8305, các lần thử tiếp theo được khởi động lần lượt nhưng có thể chồng thời gian với lần trước. Khi một kết nối thành công, những lần chưa thành công nên bị hủy. [RFC 8305 §4–5](https://www.rfc-editor.org/rfc/rfc8305#section-5).

Nếu client làm tuần tự “thử IPv6 tới hết hạn, sau đó mới thử IPv4”, tốc độ phục hồi bị trói vào timeout của kết nối hỏng. Với cách thử có khoảng cách, thời điểm IPv4 bắt đầu do lịch Happy Eyeballs quyết định, không cần chờ lần thử IPv6 chết. Hai lần thử **kết nối** đang chạy không có nghĩa gửi một POST nghiệp vụ hai lần. Trong lab, trace chỉ gửi HTTP sau khi TCP IPv4 thắng; không có cơ chế router dịch IPv6 sang IPv4 nào tham gia.

> **Nguồn.** RFC 8305 §5 gọi khoảng cách ấy là Connection Attempt Delay và viết: *“One recommended value for a default delay is 250 milliseconds.”* ([RFC 8305](https://www.rfc-editor.org/rfc/rfc8305#section-5)). Đó là một giá trị khuyến nghị cho thuật toán, không phải hằng số của IPv6. Tài liệu curl mô tả mặc định libcurl là **200 ms**; lab đặt **250 ms** bằng option để đo rõ giả thuyết. [curl man page](https://curl.se/docs/manpage.html#--happy-eyeballs-timeout-ms).

Cũng đừng gộp nó với **Resolution Delay**, khoảng chờ ngắn để AAAA có cơ hội về sau A trong quá trình phân giải; RFC 8305 §3 khuyến nghị `50 ms` cho loại delay này. Khởi động truy vấn DNS, xếp ứng viên địa chỉ và đua kết nối là các công đoạn khác nhau. [RFC 8305 §3](https://www.rfc-editor.org/rfc/rfc8305#section-3). Lab dùng `--resolve` đưa hai địa chỉ vào cache của curl, nên không đo Resolution Delay hay độ trễ DNS Internet.

Để đọc timeline có điều kiện rõ ràng, giả sử IPv6 là ứng viên đầu, IPv4 đã sẵn sàng và chưa có lỗi tức thì. Với delay D, thời gian thiết lập qua IPv4 xấp xỉ **D + thời gian bắt tay IPv4**, cộng phần lịch chạy và công việc cục bộ. Nếu IPv6 thắng trước khi tới D, không cần thử IPv4. Nếu lần đầu lỗi tức thì, lần sau có thể bắt đầu sớm hơn; không cộng máy móc D vào mọi request. Các trường hợp này nằm trong quy tắc connection attempts của RFC 8305 và được đối chiếu bằng hai phép thử khác nhau ở lab.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 430" role="img" aria-labelledby="net09-race-t net09-race-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net09-race-t">Kết nối IPv4 thắng sau khoảng chờ</title>
<desc id="net09-race-d">Ba lifeline cố định: client, đích IPv6 và đích IPv4. IPv6 bị drop, client chờ lịch rồi bắt đầu IPv4, sau khi kết nối mới gửi HTTP. Dải thời gian không có cùng tỷ lệ với đoạn TCP phóng đại.</desc>
<defs><marker id="net09-race-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="currentColor"/></marker></defs>
<rect x="5" y="15" width="90" height="42" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/>
<text x="50" y="41" font-size="14" text-anchor="middle" fill="currentColor">Client</text>
<rect x="218" y="15" width="112" height="42" rx="7" fill="#f43f5e" fill-opacity="0.15" stroke="currentColor"/>
<text x="274" y="41" font-size="14" text-anchor="middle" fill="currentColor">IPv6</text>
<rect x="405" y="15" width="110" height="42" rx="7" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/>
<text x="460" y="41" font-size="14" text-anchor="middle" fill="currentColor">IPv4</text>
<path d="M50 57 V357 M274 57 V357 M460 57 V357" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 5"/>
<g data-step="1">
<path d="M50 100 L274 100" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#net09-race-a)"/>
<text x="160" y="86" font-size="13" text-anchor="middle" fill="currentColor">Trying IPv6</text>
<rect x="264" y="106" width="20" height="30" rx="7" fill="#f43f5e" fill-opacity="0.15" stroke="currentColor"/>
<text x="332" y="128" font-size="13" text-anchor="middle" fill="currentColor">DROP SYN</text>
</g>
<g data-step="2">
<path d="M65 109 H75 M70 109 V239 M65 239 H75" fill="none" stroke="currentColor"/>
<text x="155" y="178" font-size="15" text-anchor="middle" fill="currentColor">255,631 ms</text>
<text x="155" y="200" font-size="13" text-anchor="middle" fill="currentColor">giữa hai Trying</text>
<path d="M50 252 L460 252" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#net09-race-a)"/>
<text x="350" y="238" font-size="13" text-anchor="middle" fill="currentColor">Trying IPv4</text>
</g>
<g data-step="1" data-until="2">
<rect x="20" y="377" width="480" height="32" rx="7" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/>
<text x="260" y="398" font-size="13" text-anchor="middle" fill="currentColor">Chưa có kết nối thắng; IPv6 đang chờ</text>
</g>
<g data-step="3">
<path d="M460 295 L50 295" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#net09-race-a)"/>
<text x="350" y="283" font-size="13" text-anchor="middle" fill="currentColor">TCP IPv4 xong</text>
</g>
<g data-step="4">
<path d="M50 340 L460 340" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#net09-race-a)"/>
<text x="350" y="327" font-size="13" text-anchor="middle" fill="currentColor">HTTP gửi qua IPv4</text>
<rect x="20" y="377" width="480" height="32" rx="7" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/>
<text x="260" y="398" font-size="13" text-anchor="middle" fill="currentColor">IPv4 được chọn; hủy lần IPv6 còn chờ</text>
</g>
</svg>
<step-note data-step="1">Lần thử IPv6 bắt đầu trước. Không có SYN-ACK hoặc lỗi tức thì, nên lần thử còn pending.</step-note>
<step-note data-step="2">Tới lịch, client mở thêm lần thử IPv4 mà không đợi timeout IPv6. Khoảng cách ghi trên hình lấy từ trace, không phải RTT.</step-note>
<step-note data-step="3">Bắt tay IPv4 hoàn tất trước; đây là lúc có đường thắng để chuyển cho ứng dụng. Đoạn TCP được phóng để đọc, không cùng tỷ lệ với dải chờ.</step-note>
<step-note data-step="4">Request HTTP chỉ được gửi trên kết nối chọn. Trạng thái chờ cũ biến mất; Happy Eyeballs không yêu cầu chạy hai bản sao nghiệp vụ.</step-note>
</step-flow>

Độ dài dải chờ trên hình biểu diễn khoảng cách giữa hai lần `Trying` trong trace lab; đoạn TCP IPv4 ngắn được phóng riêng để còn đọc được. Đây không phải thang tỷ lệ dùng để đo RTT bằng mắt. Dù API sau đó trả kết quả đúng, người dùng vẫn đã trả phần thời gian trước khi kết nối thắng được khởi động.

### 3.5 Đo đúng chặng trước khi chọn cách sửa

**`time_connect` của curl là thời gian từ đầu operation tới lúc kết nối TCP tới đích hoặc proxy hoàn tất**; nó không phải chỉ RTT của socket thắng. Nó có thể chứa DNS và khoảng chờ trước khi socket thắng bắt đầu. **`time_total`** là tổng thời gian operation; với HTTPS, **`time_appconnect`** cho mốc hoàn tất bắt tay TLS. Cần đọc chúng như các mốc tính từ đầu, không cộng các trường với nhau thành tổng. [curl man page, `--write-out`](https://curl.se/docs/manpage.html#-w).

Trong lab đã bỏ DNS và proxy, nên khi `time_connect` đi theo delay còn HTTP handler không đổi, ta có bằng chứng thu hẹp nguyên nhân. Trace cho thứ tự chọn đích; capture cho gói thật trên interface; counter DROP cho biết luật có bị chạm. Không một trường đơn lẻ đủ thay cả ba.

Với endpoint HTTPS thật, dùng tên miền gốc và ép họ địa chỉ; nếu pin IP thì dùng `--resolve` đúng host/port để giữ tên dùng cho TLS. Không thay URL bằng IP rồi tắt xác minh certificate: việc ấy đổi thêm một điều kiện của phép thử. Những lệnh dưới là **quy trình đề xuất, chưa đo trên Internet trong bài**:

```bash
curl --noproxy '*' -4 -sS -o /dev/null \
  -w 'ip=%{remote_ip} dns=%{time_namelookup} tcp=%{time_connect} tls=%{time_appconnect} total=%{time_total}\n' \
  https://api.example.com/
curl --noproxy '*' -6 -sS -o /dev/null \
  -w 'ip=%{remote_ip} dns=%{time_namelookup} tcp=%{time_connect} tls=%{time_appconnect} total=%{time_total}\n' \
  https://api.example.com/
```

Nếu ứng dụng dùng proxy, đo thêm chính đường proxy; lệnh bỏ proxy chỉ đo đường trực tiếp. Nếu request dùng lại socket, nó không mở cuộc đua TCP mới; đây là suy luận, lab chỉ dùng process curl mới.

**Sửa nguyên nhân** ở chỗ đường IPv6 mất: route, return path, firewall hoặc listener theo bằng chứng. Trong lab chỉ gỡ đúng luật DROP. Ép IPv4 có thể là biện pháp giảm ảnh hưởng khi chờ sửa, nhưng HTTP 200 sau khi ép không phải bằng chứng IPv6 đã phục hồi. Giảm timer cũng chỉ giảm phần chờ; nó không làm SYN IPv6 vượt được luật firewall.

## 4. Lab

### 4.1 Chạy bộ lab, giữ đủ log để kiểm lại

Bộ lab gồm `run.sh`, `inside.sh`, `radvd.conf`, `server.py`, `out/` và `src/`, đặt tại `~/projects/net-lab/net-09/` trên máy tác giả. Chạy trên máy có Docker:

```bash
cd ~/projects/net-lab/net-09
./run.sh
```

Script tạo container `net09-lab` từ `alpine:3.20` và ba namespace `net09-c`, `net09-r`, `net09-s`. Quyền privileged phục vụ namespace/veth bên trong container; trap dọn container và mạng bên trong khi kết thúc. Không cần IPv6 Internet. Phiên bản thực và gói cài nằm trong `out/state.txt`, `out/install.txt`; tag image không cố định phiên bản gói mãi mãi.

C có IPv4 `10.9.1.2/24`; R có `10.9.1.1/24` ở left, `10.9.2.1/24` ở right. R có IPv6 `2001:db8:9:1::1/64` và `2001:db8:9:2::1/64`; S dùng `10.9.2.2/24` và `2001:db8:9:2::2/64`. C tự nhận IPv6 từ RA; S có default route hai họ về R. Đây là **tham số cấu hình lab**, không phải địa chỉ production. Dải `2001:db8::/32` được dành cho tài liệu, không quảng bá ra Internet. [RFC 3849 §2–3](https://www.rfc-editor.org/rfc/rfc3849#section-2).

### 4.2 Xem RA trước khi xem địa chỉ

R chạy `radvd` — daemon phát RA — với prefix và lifetime đã nêu ở §3.2. C gọi công cụ yêu cầu RA rồi lưu các state:

```bash
ip netns exec net09-c rdisc6 -1 c0
ip -n net09-c -6 addr show dev c0
ip -n net09-c -6 route show
```

Trích `out/ra.txt`, chỉ giữ các dòng quyết định:

```text
Router lifetime           :         1800 (0x00000708) seconds
 Prefix                   : 2001:db8:9:1::/64
  On-link                 :          Yes
  Autonomous address conf.:          Yes
  Valid time              :         3600 (0x00000e10) seconds
  Pref. time              :         1800 (0x00000708) seconds
 from fe80::ff:fe09:101
```

Trích `out/state.txt`:

```text
    inet6 2001:db8:9:1:0:ff:fe09:102/64 scope global dynamic mngtmpaddr proto kernel_ra
       valid_lft 3599sec preferred_lft 1799sec
    inet6 fe80::ff:fe09:102/64 scope link proto kernel_ll
       valid_lft forever preferred_lft forever
default via fe80::ff:fe09:101 dev c0 proto ra metric 1024 expires 1798sec hoplimit 64 pref medium
```

### 4.3 Xem DAD trong capture, không gọi mọi NS là tìm MAC

Script capture ICMPv6 trên c0 vào `out/nd.pcap`, rồi giải mã bằng:

```bash
tcpdump -nn -vv -r out/nd.pcap
```

Trích `out/nd.txt`, giữ nguyên dòng mô tả gói, bỏ header và phần hex:

```text
05:04:13.957514 IP6 (hlim 255, next-header ICMPv6 (58) payload length: 16) fe80::ff:fe09:102 > ff02::2: [icmp6 sum ok] ICMP6, router solicitation, length 16
05:04:13.958010 IP6 (flowlabel 0xc0037, hlim 255, next-header ICMPv6 (58) payload length: 56) fe80::ff:fe09:101 > fe80::ff:fe09:102: [icmp6 sum ok] ICMP6, router advertisement, length 56
05:04:14.419238 IP6 (hlim 255, next-header ICMPv6 (58) payload length: 32) :: > ff02::1:ff09:102: [icmp6 sum ok] ICMP6, neighbor solicitation, length 32, who has 2001:db8:9:1:0:ff:fe09:102
```

NS hỏi địa chỉ đầy đủ vừa được tạo từ prefix, source là `::`; đó là dấu vết DAD. Capture bắt đầu sau khi bật interface nên không dùng file này để tuyên bố đã thấy toàn bộ quá trình tạo link-local. Sau khi request chạy, `out/neigh.txt` có router `fe80::ff:fe09:101` với MAC `02:00:00:09:01:01`; đó vẫn chỉ là bằng chứng về next hop trên link C–R.

### 4.4 Cho bản sai chạy: có địa chỉ, HTTP vẫn xanh, IPv6 đã mất

Trước khi gài lỗi, script xác nhận hai listener ở S bằng `ss -lntp`. `out/listen.txt` có cả `10.9.2.2:8080` và `[2001:db8:9:2::2]:8080`. Hai request ép từng họ đều HTTP 200 trong `out/healthy.txt`. Sau đó thêm đúng một luật trên R:

```bash
ip netns exec net09-r ip6tables -A FORWARD \
  -p tcp --dport 8080 -j DROP
```

Đây là **fault injection có chủ đích**, không phải cách cấu hình firewall mẫu. Địa chỉ, route, RA và listener được giữ nguyên. Một helper trong `inside.sh` gọi curl với các tham số chung sau; mỗi lượt thêm `-4`, `-6` hoặc tham số Happy Eyeballs tương ứng:

```bash
ip netns exec net09-c curl --noproxy '*' -sS -o /dev/null \
  --connect-timeout 2 --max-time 3 \
  --resolve 'api.test:8080:[2001:db8:9:2::2],10.9.2.2' \
  --happy-eyeballs-timeout-ms 250 \
  -w 'ip=%{remote_ip} connect=%{time_connect} total=%{time_total} http=%{http_code}\n' \
  http://api.test:8080/
```

`--resolve` đưa cả hai địa chỉ vào cache cho đúng host/port; **không dựng DNS server** và không tuyên bố đã đo việc truy vấn A/AAAA. `--noproxy '*'` giữ kết nối trực tiếp trong topology. Các timeout có đơn vị giây, delay có đơn vị mili giây. Server HTTP không chạy TLS, nên lab không có một khoảng `time_appconnect` để so sánh.

Trích `out/broken.txt`, theo thứ tự: ép IPv4, ép IPv6 và mã thoát, ba lượt delay 250 ms, một lượt delay 50 ms:

```text
ip=10.9.2.2 connect=0.000386 total=0.001713 http=200
ip= connect=0.000000 total=2.004026 http=000
forced-v6-exit=28
ip=10.9.2.2 connect=0.256060 total=0.259458 http=200
ip=10.9.2.2 connect=0.255666 total=0.256322 http=200
ip=10.9.2.2 connect=0.252796 total=0.253565 http=200
ip=10.9.2.2 connect=0.050740 total=0.051142 http=200
```

Số giây dùng dấu chấm trong code block vì đó là output nguyên văn của công cụ; phần giải thích dùng dấu phẩy. **HTTP 200 của những lượt có hai ứng viên thuộc về `10.9.2.2`.** Fallback đã che hỏng một họ địa chỉ. Counter rule trong cùng file tăng; đối chiếu capture để biết nó là SYN của những lượt đang thử, không suy từ việc rule tồn tại rằng rule chắc chắn đã gây lỗi.

### 4.5 Dùng timestamp để tìm phần chờ nằm trước socket thắng

`out/race.txt` giải mã capture C; ghép đúng tuple và timestamp với lượt có trace, vì capture còn chứa các lượt khác.

Lượt đầu có hai ứng viên ghi trace với `--trace-time --trace-ascii /lab/out/race-trace.txt`. Ba dòng quyết định trong file:

```text
05:04:23.609466 == Info:   Trying [2001:db8:9:2::2]:8080...
05:04:23.865097 == Info:   Trying 10.9.2.2:8080...
05:04:23.865451 == Info: Connected to api.test (10.9.2.2) port 8080
```

> **Đo trên lab.** Hiệu hai timestamp `Trying` của lượt có trace là **255,631 ms**. Đó là khoảng giữa hai lần ứng dụng báo bắt đầu thử, còn `time_connect` của cùng lượt là **256,060 ms** tính từ đầu operation. Chúng gần delay 250 ms nhưng không phải cùng đại lượng. Đo lại: `./run.sh`; đọc `out/race-trace.txt`, `out/race.txt`, `out/broken.txt`. Độ trễ lịch chạy của VM khiến số thực không đúng tròn tham số cấu hình.

Lượt đặt 50 ms có phần kết nối khoảng **50,740 ms** trong lần chạy này. Thay đổi một tham số làm khoảng chờ đi theo tham số là đối chứng cho cơ chế lập lịch; nó không làm IPv6 thành công. Đừng dùng một lượt đo ấy để chọn timer tối ưu cho Internet hay suy ra RTT tới API.

### 4.6 Phục hồi đúng đường, rồi đối chứng lỗi tức thì

Gỡ đúng luật đã gài, giữ delay 250 ms và chạy lại:

```bash
ip netns exec net09-r ip6tables -D FORWARD \
  -p tcp --dport 8080 -j DROP
```

`out/recovered.txt`:

```text
ip=2001:db8:9:2::2 connect=0.000159 total=0.002055 http=200
```

IPv6 thắng trước lịch thử IPv4: cùng port, cùng đích IPv6, cùng handler, chỉ bỏ nguyên nhân mất SYN. HTTP 200 trước/sau đều xanh; địa chỉ thắng mới phân biệt được việc sửa có hiệu quả.

Cuối bài thử một kiểu lỗi khác. Script đặt `accept_ra=0` trên c0 để tránh RA kế tiếp tự bổ sung lại route trong lúc đo, rồi xóa default IPv6 ở C. Địa chỉ global-scope vẫn còn nhưng không có route tới S:

```bash
ip netns exec net09-c sysctl -qw net.ipv6.conf.c0.accept_ra=0
ip -n net09-c -6 route del default
ip -n net09-c -6 route get 2001:db8:9:2::2
```

Trích kết quả lookup và request trong `out/no-default.txt`; file đầy đủ còn lưu địa chỉ SLAAC:

```text
RTNETLINK answers: Network unreachable
ip=10.9.2.2 connect=0.000117 total=0.002215 http=200
```

Không có route gây lỗi cục bộ thay vì đợi SYN biến mất ngoài mạng. Request vẫn được phép chuyển sang IPv4 và trong lượt này không trả đủ một delay 250 ms. **Có IPv6 hỏng** không đủ để dự đoán độ trễ; phải biết lỗi được phát hiện tức thì hay im lặng, client đang dùng thuật toán nào và còn ứng viên nào. Xóa route không tái hiện đúng black hole ngoài mạng.

## 5. Tính tay

### 5.1 Khoảng chờ đi vào latency ở đâu?

**Đề giả định.** Cả hai ứng viên đã có sẵn; IPv6 bắt đầu tại `0 ms` rồi black hole. Delay D là `250 ms`, bắt tay IPv4 cần `12 ms`, từ TCP xong tới HTTP xong cần thêm `18 ms`. Bỏ qua chi phí cục bộ và DNS. Nếu thử tuần tự với timeout IPv6 `2000 ms` thay vì Happy Eyeballs, thời gian hoàn tất mỗi cách là bao nhiêu?

**Lời giải.** Có Happy Eyeballs: `250 + 12 + 18 = 280 ms`. Tuần tự: `2000 + 12 + 18 = 2030 ms`. Chênh `1750 ms`; Happy Eyeballs vẫn tốn thêm `250 ms` so với ép IPv4 ngay từ đầu trong mô hình này. Đây là **suy luận theo lịch thử giả định**, không lấy các số RTT và HTTP giả định làm số đo của lab. Nếu IPv6 kết nối xong ở `20 ms`, thay giả thiết black hole, nó thắng trước mốc thử IPv4; không được giữ phép cộng 250 ms.

### 5.2 Lifetime nào hết trước?

**Đề giả định từ cấu hình RA lab.** Tại `t = 0`, host nhận RA với Router Lifetime `1800 s`, preferred `1800 s`, valid `3600 s`. Sau đó không có RA mới, không có router khác và không ai chỉnh cấu hình. Tại `t = 2000 s`, địa chỉ và khả năng gửi tới đích ngoài link có còn giống lúc đầu không? Có thể kết luận mọi kết nối đang mở đều bị đóng không?

**Lời giải.** Default router học từ RA đã hết hạn; địa chỉ đã deprecated nhưng vẫn valid. Địa chỉ còn `3600 − 2000 = 1600 s` hợp lệ theo dữ kiện. Không có default router hoặc route thay thế thì địa chỉ còn đó cũng không tạo được đường tới đích ngoài link. Không suy ra mọi socket đã bị đóng; state địa chỉ, route và transport là những việc khác nhau. Phép tính dựa vào quy tắc RFC 4861/4862 ở §3.2; **lab không đợi lifetime hết tự nhiên** mà chỉ đo xóa route trong khi giữ địa chỉ.

### 5.3 Đọc mốc trace, đừng gọi nó là RTT

**Đề từ số đo.** Trong trace ở §4.5, lấy thời điểm `Trying` IPv4 trừ `Trying` IPv6. So với `time_connect` của lượt ấy, phần nào chắc chắn không phải RTT IPv4? Từ những mốc đó có tính được thời gian handler không?

**Lời giải.** Khoảng giữa hai `Trying` là **255,631 ms**; IPv4 chưa bắt đầu thử trong phần lớn khoảng này, nên không thể quy toàn bộ nó thành RTT IPv4. `time_connect` **256,060 ms** bao gồm cả đoạn trước lần thử IPv4. Muốn đo RTT cần timestamp packet phù hợp; muốn đo riêng handler cần instrumentation phía server hoặc định nghĩa phép đo rõ hơn. `time_total − time_connect` chỉ là phần sau mốc TCP trong operation này, còn chứa truyền request/response và xử lý ở client/server. Không đổi một hiệu hai mốc thành “CPU handler” chỉ vì lab dùng HTTP thường.

## 6. Chuyển giao

1. Laptop chỉ có `fe80::...`, không có prefix khác; ping router link-local được nhưng API IPv6 ngoài mạng không tới. Bạn sẽ xin những output nào trước khi yêu cầu sửa AAAA?
2. Sau khi máy bật forwarding để chạy một chức năng mạng mới, default route học bằng RA không còn được cập nhật. Cần kiểm sysctl nào trên interface nào, và bằng chứng nào phân biệt không nhận RA với kernel không áp dụng RA?
3. Health check trả HTTP 200 nhưng phần lớn lượt đo có `remote_ip` IPv4. Hãy thiết kế probe buộc lộ lỗi IPv6, đồng thời không làm thay đổi host dùng cho kiểm tra certificate HTTPS.
4. Một runtime mở kết nối IPv6 được, sau đó TLS treo ở flight lớn. Vì sao hạ timer Happy Eyeballs có thể không giúp? Bạn cần quan sát thêm kích thước gói và ICMPv6 nào?
5. Sau deploy, một nhóm request chịu độ trễ phụ rồi phần chờ biến mất dù firewall chưa được sửa. Bạn sẽ kiểm việc tái sử dụng kết nối thế nào, thay vì kết luận mạng tự lành?
6. Một dịch vụ qua proxy có A/AAAA ở cả client→proxy và proxy→origin. Chỉ một vùng người dùng chậm ở kết nối mới; curl trực tiếp từ máy dev luôn tốt. Hãy thiết kế phép đo tách được hai chặng, thời gian phân giải, lịch thử từng họ và lỗi xảy ra sau TCP, trong khi giữ nguyên xác minh TLS và không gửi lặp request nghiệp vụ. Nêu dữ liệu phải có để bác bỏ từng giả thuyết, cả khi fallback khiến mọi HTTP response vẫn thành công.

## 7. Tóm tắt

- SLAAC tạo địa chỉ từ prefix và phần định danh interface; DAD kiểm trùng trên link, không kiểm reachability tới API. [RFC 4862 §5](https://www.rfc-editor.org/rfc/rfc4862#section-5).
- Cờ A, cờ L và Router Lifetime trả lời ba câu hỏi khác nhau; default router có lifetime riêng. [RFC 4861 §4.2, §4.6.2](https://www.rfc-editor.org/rfc/rfc4861#section-4.2).
- Trong lab, địa chỉ SLAAC vẫn tồn tại khi default IPv6 bị xóa; lookup tới S trả `Network unreachable` (`out/no-default.txt`).
- HTTP 200 qua IPv4 có thể che IPv6 black hole; ép từng họ và ghi `remote_ip` mới phân biệt được (`out/broken.txt`).
- RFC 8305 khuyến nghị một Connection Attempt Delay 250 ms; tài liệu curl nêu mặc định libcurl 200 ms. Lab đặt rõ 250 ms, không coi đó là hằng số IPv6. [RFC 8305 §5](https://www.rfc-editor.org/rfc/rfc8305#section-5), [curl](https://curl.se/docs/manpage.html#--happy-eyeballs-timeout-ms).
- Trong trace lab, hai lần thử bắt đầu cách nhau 255,631 ms; bỏ đúng luật DROP thì IPv6 lại thắng (`out/race-trace.txt`, `out/recovered.txt`).
- Neighbor cache chứng minh state của láng giềng trên link; muốn chứng minh đường tới API phải đo đúng đích, port và họ địa chỉ.

→ **Bài 10 — AS và ASN: ai sở hữu mạng nào**: sau khi kiểm được địa chỉ và đường ra khỏi host, ta lần theo tổ chức vận hành các mạng nối thành đường đi Internet.
