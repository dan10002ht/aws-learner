# Bài 24 — Load balancer L4 và L7 từ bên trong

## 1. Mục tiêu

Sau bài này bạn có thể:

- Dự đoán backend nhận từng request khi giữ nguyên một kết nối TCP, rồi kiểm bằng cùng một client ở hai chế độ cân bằng.
- Vẽ đường đi và đường về của NAT, DSR và TCP proxy; chỉ ra máy nào thực sự kết thúc TCP.
- Chọn khoá hash theo thứ cần giữ ổn định, đo số key đổi chủ khi bỏ một backend và tách ổn định định tuyến khỏi độ bền dữ liệu.
- Phân biệt port mở, endpoint sẵn sàng và request nghiệp vụ thành công bằng phép thử có thể bác bỏ từng giả thuyết.
- Sắp thứ tự ngừng nhận việc, đợi việc cũ và dừng process để deploy; nhận ra trường hợp drain chưa đủ.
- Khoanh vùng request rớt bằng backend ID, trạng thái health và sự kiện đóng session thay vì chỉ nhìn CPU trung bình.

## 2. Triệu chứng

Bạn có hai backend `a` và `b`. Cấu hình đều ghi `balance roundrobin`, không trọng số khác nhau, không cookie ghim phiên. Client gửi **6 request HTTP/1.1 tuần tự trên cùng một kết nối**. Qua cổng `8004`, output là:

```text
ONE_CLIENT_CONNECTION 8004 a,a,a,a,a,a
```

Đổi sang cổng `8007`, vẫn client ấy và số request ấy:

```text
ONE_CLIENT_CONNECTION 8007 a,b,a,b,a,b
```

Trong một phép thử deploy khác, request đang chạy ở `a` trả `200` nếu cho drain, nhưng trả `502` nếu cưỡng bức đóng session. Người vận hành đã viết “LB chia đều, health check xanh, deploy cứ tắt một node”. Cả ba vế nghe hợp lý, nhưng không vế nào nói rõ **đơn vị được chọn backend** và **thời điểm được phép tắt**.

> **Đo trên lab.** Các dòng trên trích `net-lab/net-24/out/lab.txt`: Linux colima aarch64, Alpine 3.20, HAProxy 2.8.22, hai HTTP server Python trên loopback. Chạy lại bằng `./run.sh` trong thư mục lab; không publish cổng ra host. Đây là phép đo cơ chế chọn backend, không phải benchmark năng lực phục vụ.

## ⏸ Dừng lại — đoán trước #1

Vì sao cùng round-robin mà một cổng dồn cả 6 request vào `a`?

- (a) Round-robin chỉ hoạt động nếu số backend lớn hơn số request.
- (b) Cổng ấy chọn backend theo kết nối TCP; cả 6 request nằm trong cùng lần chọn.
- (c) HTTP/1.1 bắt buộc mọi load balancer giữ một backend cho cả phiên người dùng.
- (d) Backend `b` bị down trong cả hai phép đo.

## 3. Cơ chế

### 3.1 Đừng đọc tên thuật toán trước khi xác định đơn vị chọn

Đáp án là **(b)**. **Load balancer — bộ cân bằng tải — là thành phần chọn một đích trong tập backend để nhận một đơn vị lưu lượng.** Đơn vị ấy có thể là kết nối hoặc request; bỏ qua khác biệt này thì mọi phép tính “chia đều” phía sau đều có thể sai.

Ở lab, cổng `8004` dùng HAProxy `mode tcp`: proxy nhận một kết nối TCP phía client, chọn backend, mở kết nối TCP phía server rồi chuyển byte hai chiều. Nó không dùng ranh giới từng request HTTP để chạy lại round-robin. HTTP keep-alive — tái sử dụng kết nối cho các request tiếp theo — giữ các request đó trong cùng đường chuyển byte. Giữ kết nối còn sống không có nghĩa tạo lượt cân bằng mới.

Cổng `8007` dùng `mode http`: HAProxy phân tích HTTP nên có điểm quyết định theo request. Lab còn đặt `option http-server-close`, cho phép phía client giữ kết nối nhưng phía backend đóng sau mỗi response. Với round-robin, hai server bằng trọng số và không persistence, các lượt trong lần chạy này xen kẽ `a,b`. Không phải mọi cấu hình L7 bắt buộc xen kẽ: cookie, hash, luật `use-server`, hàng đợi hay trạng thái health đều có thể đổi lựa chọn.

**L4** là cách gọi xử lý theo thông tin giao vận như IP/port/kết nối; **L7** là cách gọi xử lý theo giao thức ứng dụng như HTTP method, host, path. Hai tên này nói về thông tin và ranh giới ra quyết định, chưa nói đủ cách chuyển packet. Bản đồ tầng đã có ở [[eng-osi-model]]; ta không dựng lại OSI ở đây.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 410" role="img" aria-labelledby="net24-a-t net24-a-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="net24-a-t">Một kết nối client, hai ranh giới chọn backend</title>
<desc id="net24-a-d">Cổng TCP chọn a một lần; HTTP có thể chọn a hoặc b theo request.</desc>
<defs><marker id="net24-a-arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker></defs>
<rect x="20" y="30" width="120" height="44" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="80.0" y="57.0" font-size="14" text-anchor="middle" fill="currentColor">Client</text><rect x="250" y="30" width="130" height="44" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="315.0" y="57.0" font-size="14" text-anchor="middle" fill="currentColor">HAProxy</text><rect x="490" y="30" width="120" height="44" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="550.0" y="57.0" font-size="14" text-anchor="middle" fill="currentColor">a :9001</text><rect x="490" y="310" width="120" height="44" rx="7" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="550.0" y="337.0" font-size="14" text-anchor="middle" fill="currentColor">b :9002</text><line x1="80" y1="74" x2="80" y2="285" stroke="currentColor" stroke-dasharray="4 4" opacity="0.4"/><line x1="315" y1="74" x2="315" y2="285" stroke="currentColor" stroke-dasharray="4 4" opacity="0.4"/><line x1="550" y1="74" x2="550" y2="285" stroke="currentColor" stroke-dasharray="4 4" opacity="0.4"/><g data-step="1"><path d="M80 112 L315 112" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net24-a-arr)"/><text x="197.5" y="100" font-size="14" text-anchor="middle" fill="currentColor">TCP :8004</text><path d="M315 150 L550 150" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net24-a-arr)"/><text x="432.5" y="138" font-size="14" text-anchor="middle" fill="currentColor">chọn a một lần</text></g><g data-step="2"><path d="M80 202 L315 202" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net24-a-arr)"/><text x="197.5" y="190" font-size="14" text-anchor="middle" fill="currentColor">6 HTTP request</text><path d="M315 242 L550 242" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net24-a-arr)"/><text x="432.5" y="230" font-size="14" text-anchor="middle" fill="currentColor">cùng stream → a</text></g><g data-step="3"><path d="M315 275 L490 332" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net24-a-arr)"/><text x="402.5" y="290" font-size="14" text-anchor="middle" fill="currentColor">HTTP :8007</text><text x="240" y="385" font-size="14" text-anchor="middle" fill="currentColor">L7: chọn lại theo request → a,b,a,b,a,b</text></g>
</svg>
<step-note data-step="1">Cổng 8004 chọn backend lúc nhận connection; điểm quyết định nằm trước các request HTTP.</step-note>
<step-note data-step="2">Các request giữ nguyên stream nên không tạo lượt round-robin mới.</step-note>
<step-note data-step="3">Cổng 8007 phân tích HTTP; cấu hình lab bỏ persistence và đóng connection upstream sau mỗi response.</step-note>
</step-flow>

Từ đó suy ra một lỗi scale cụ thể: nếu một client trung gian chỉ mở ít TCP connection nhưng gửi phần lớn request qua chúng, tăng backend không tự phân phối lại các connection đang tồn tại. Backend mới có thể rảnh dù tổng CPU cả cụm còn dư. Cần đo số connection, request và thời gian phục vụ **trên từng backend**, rồi hỏi bộ cân bằng đang phân phối đại lượng nào. “Số connection ngang nhau” cũng không chứng minh số byte hoặc CPU bằng nhau.

**TCP proxy** là thiết bị kết thúc một TCP connection và mở connection khác để chuyển dữ liệu. Vì có hai connection, proxy có thể nhận ACK từ client trong lúc chặng backend còn chờ. Nó không làm hai chặng có chung sequence number. Lab HAProxy chính là kiểu này ở cả hai mode. **TCP passthrough** thường dùng để nói TLS/ứng dụng được chuyển dưới dạng byte không giải mã ở proxy; đừng suy rằng không có TCP termination. Một thiết bị chuyển packet ở kernel lại là kiến trúc khác.

> **Nguồn.** HAProxy mô tả round-robin: *“Each server is used in turns, according to their weights.”* ([manual 2.8, `balance`](https://docs.haproxy.org/2.8/configuration.html#4.2-balance)). Cần đọc cùng `mode` và chính sách persistence; câu ấy không hứa mọi HTTP request đi qua TCP mode đều có một lượt chọn riêng.

### 3.2 NAT và DSR khác nhau ở đường trả, không phải tên tầng

**VIP — virtual IP — là địa chỉ dịch vụ mà client kết nối thay vì chọn trực tiếp địa chỉ một backend.** Xét client C gửi tới VIP V, backend được chọn là R. Đây là ký hiệu mô hình, không phải các IP đã đo trong lab.

Trong mô hình **NAT — dịch địa chỉ mạng — dùng cho cân bằng packet**, thiết bị sửa địa chỉ đích V thành R ở chiều vào, và phải có đường trả phù hợp để khôi phục địa chỉ nguồn thành V ở chiều ra. Nếu đồng thời SNAT chiều vào, backend thấy nguồn là LB; nếu giữ nguồn C thì routing chiều về vẫn phải được bố trí để phép dịch ngược xảy ra. Bài [[net-07-nat-conntrack]] đã đi vào state ánh xạ; ở đây điểm cần giữ là client chờ response thuộc đúng endpoint mình đã kết nối.

Vì response đi qua thiết bị dịch ngược, một mô hình tải có response lớn hơn request sẽ làm LB gánh nhiều byte chiều về. Không cần đoán bằng tính từ: mục tính tay sẽ giả định request 2 KB, response 100 KB rồi tính tải qua LB. Đó là phép tính theo mô hình, không phải kết quả benchmark của HAProxy.

**DSR — direct server return — là cách cho backend trả response trực tiếp tới client, bỏ LB khỏi đường trả.** Trong **LVS-DR cổ điển**, LB vẫn nhận packet gửi tới V, chọn backend, đổi địa chỉ MAC đích để frame tới R nhưng giữ địa chỉ IP đích V. R phải chấp nhận V là địa chỉ local và dùng V làm nguồn response. Nếu R trả bằng IP riêng của nó thì không còn khớp endpoint client đã gọi. Client không được yêu cầu biết R chỉ vì hạ tầng muốn bỏ qua LB ở chiều về.

LVS-DR còn đòi hỏi bố trí cùng miền L2 cho bước chuyển frame này và xử lý việc nhiều máy có cùng VIP mà không cùng giành trả lời ARP. “Cứ gắn VIP lên mọi backend” có thể khiến client đi thẳng tới một backend ngoài bộ chọn. Học ARP/VIP ở [[net-03-arp]] giúp nhìn ra lỗi ấy. Một số kiến trúc DSR dùng tunnel thay vì cùng L2; không lấy điều kiện của LVS-DR để áp cho mọi sản phẩm gọi mình là DSR.

<ab-toggle data-labels="NAT|DSR">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 310" role="img" aria-labelledby="net24-b-nat-t net24-b-nat-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net24-b-nat-t">NAT: đường request và response</title>
<desc id="net24-b-nat-d">Vị trí cố định, đường trả đổi từ qua LB sang trực tiếp client.</desc>
<defs><marker id="net24-b-nat-arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker></defs>
<rect x="20" y="40" width="110" height="46" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="75.0" y="68.0" font-size="14" text-anchor="middle" fill="currentColor">C — client</text><rect x="195" y="40" width="120" height="46" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="255.0" y="68.0" font-size="14" text-anchor="middle" fill="currentColor">LB — VIP V</text><rect x="390" y="180" width="110" height="46" rx="7" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="445.0" y="208.0" font-size="14" text-anchor="middle" fill="currentColor">R — server</text><path d="M130 63 L195 63" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net24-b-nat-arr)"/><text x="162.5" y="29" font-size="14" text-anchor="middle" fill="currentColor">tới V</text><path d="M255 86 L445 180" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net24-b-nat-arr)"/><text x="415" y="120" font-size="14" text-anchor="middle" fill="currentColor">V → R</text><path d="M390 203 L255 86" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net24-b-nat-arr)"/><path d="M195 77 L130 77" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net24-b-nat-arr)"/><text x="260" y="280" font-size="14" text-anchor="middle" fill="currentColor">Response qua LB: khôi phục nguồn V</text>
</svg>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 310" role="img" aria-labelledby="net24-b-dsr-t net24-b-dsr-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net24-b-dsr-t">DSR: đường request và response</title>
<desc id="net24-b-dsr-d">Vị trí cố định, đường trả đổi từ qua LB sang trực tiếp client.</desc>
<defs><marker id="net24-b-dsr-arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker></defs>
<rect x="20" y="40" width="110" height="46" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="75.0" y="68.0" font-size="14" text-anchor="middle" fill="currentColor">C — client</text><rect x="195" y="40" width="120" height="46" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="255.0" y="68.0" font-size="14" text-anchor="middle" fill="currentColor">LB — VIP V</text><rect x="390" y="180" width="110" height="46" rx="7" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="445.0" y="208.0" font-size="14" text-anchor="middle" fill="currentColor">R — server</text><path d="M130 63 L195 63" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net24-b-dsr-arr)"/><text x="162.5" y="29" font-size="14" text-anchor="middle" fill="currentColor">tới V</text><path d="M255 86 L445 180" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net24-b-dsr-arr)"/><text x="415" y="120" font-size="14" text-anchor="middle" fill="currentColor">IP vẫn là V</text><path d="M390 203 L75 86" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net24-b-dsr-arr)"/><text x="232.5" y="220" font-size="14" text-anchor="middle" fill="currentColor">response nguồn V</text><text x="260" y="280" font-size="14" text-anchor="middle" fill="currentColor">LB chỉ nằm trên đường request</text>
</svg>
<ab-note>Thiết bị trên đường về thực hiện dịch ngược để client thấy response từ VIP.</ab-note>
<ab-note>Backend nhận VIP như local và trả bằng VIP; đường chéo bỏ qua LB ở chiều về.</ab-note>
</ab-toggle>

Nguyên nhân gốc của khác biệt: **NAT cần khôi phục địa chỉ bằng thiết bị trên đường về; DSR bố trí để backend trả đúng danh tính VIP ngay từ đầu**. DSR giảm byte response phải qua LB, đổi lại ràng buộc địa chỉ, ARP, routing và khả năng quan sát đường về. Không có cơ sở từ bài này để kết luận CPU hay độ trễ của DSR tốt hơn một mức cụ thể.

| Cách triển khai | Ai giữ TCP endpoint? | Đường response của mô hình | Điểm dễ nhầm |
|---|---|---|---|
| Packet NAT | Client và backend | Qua thiết bị dịch ngược | L4 không bắt buộc phải SNAT |
| LVS-DR | Client và backend mang VIP | Backend tới client | IP đích vẫn là VIP khi tới backend |
| TCP proxy của lab | Client–proxy và proxy–backend là hai connection | Qua proxy | `mode tcp` không biến HAProxy thành NAT router |
| HTTP proxy của lab | Hai chặng TCP, thêm phân tích HTTP | Qua proxy | Một connection client không bắt buộc một backend |

> **Nguồn.** Dự án Linux Virtual Server mô tả LVS-DR: *“The load balancer simply changes the MAC address of the data frame”* ([Direct Routing](https://www.linuxvirtualserver.org/VS-DRouting.html)). Trang có cả lệnh cho kernel cũ; bài chỉ dùng mô tả đường packet, không khuyên sao chép phần cài kernel ấy.

> **Chưa đo.** Lab bài này không dựng IPVS NAT/DR và không capture MAC/IP trước–sau. Kiểm bằng một lab riêng có client, director và real server; bắt cùng packet hai phía, đối chiếu MAC đích, IP đích và đường response. Không dùng output HAProxy để chứng minh hiệu năng hoặc tính đúng của một cấu hình DSR.

### 3.3 Hash giữ cái gì ở nguyên chỗ?

**Persistence là chính sách giữ các lượt truy cập liên quan tới cùng backend.** Cần nó khi backend giữ state cục bộ hoặc muốn tăng cơ hội trúng cache. Nhưng chọn cố định theo IP nguồn có thể gom cả một nhóm người dùng sau NAT vào một backend. Chọn theo TCP source port thì mỗi connection mới lại có thể đổi chỗ. Muốn giữ theo tài nguyên, khoá phải phản ánh tài nguyên; muốn giữ theo phiên, cần khoá phiên có vòng đời và ranh giới tin cậy phù hợp.

Bản sai tiếp theo là dùng `hash(key) % N`, thấy cùng key luôn ra cùng số, rồi gọi đó là ổn định khi scale. Khi N thay đổi, phép chia đổi và nhiều key có thể đổi owner, dù backend cũ vẫn sống. **Consistent hashing là họ cách ánh xạ key tới backend nhằm hạn chế phần key đổi chủ khi tập backend thay đổi.** Một mô hình để hình dung là đặt key và các điểm đại diện backend lên vòng hash, rồi chọn owner theo một quy tắc cố định. Khi bỏ một điểm, chỉ miền owner liên quan phải đổi; bản triển khai có thể dùng cây và nhiều điểm đại diện, không phải đúng một điểm mỗi server.

HAProxy cho chọn `hash-type consistent`; lab dùng URI nguyên vẹn làm key qua `balance uri whole`. Tập key cụ thể là `/item/0` tới `/item/99`; server có ID cố định `a=1`, `b=2`. Ta ghi mapping trước, disable `a` riêng ở backend `hashed`, rồi hỏi lại mọi key. Kết quả: ban đầu `a` nhận 43, `b` nhận 57; sau bỏ `a`, **43 key đổi chủ, mọi key vốn ở `b` vẫn ở `b`**. Mapping đầy đủ nằm ở `out/hash.json`, nên người đọc kiểm được từng key thay vì tin một tỷ lệ chung.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 245" role="img" aria-labelledby="net24-c-t net24-c-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net24-c-t">43 key chuyển, 57 key giữ nguyên</title>
<desc id="net24-c-d">Hai phần có chiều rộng tỷ lệ 43 và 57; cả hai về b sau bỏ a.</desc>
<defs><marker id="net24-c-arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker></defs>
<text x="20" y="25" font-size="14" text-anchor="start" fill="currentColor">100 URI đo thật: diện tích theo số key</text><rect x="20" y="55" width="206.4" height="44" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><rect x="226.4" y="55" width="273.6" height="44" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="123" y="83" font-size="14" text-anchor="middle" fill="currentColor">a: 43</text><text x="363" y="83" font-size="14" text-anchor="middle" fill="currentColor">b: 57</text><path d="M123 99 L123 177" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net24-c-arr)"/><text x="175" y="143" font-size="14" text-anchor="middle" fill="currentColor">đổi chủ</text><path d="M363 99 L363 177" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net24-c-arr)"/><text x="415" y="143" font-size="14" text-anchor="middle" fill="currentColor">giữ chủ</text><rect x="20" y="177" width="480" height="44" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="260" y="205" font-size="14" text-anchor="middle" fill="currentColor">b: 100 sau khi bỏ a</text>
</svg>

Không suy ra “bỏ một trong hai server luôn chuyển 43%”. Đó là mẫu 100 URI với đúng phiên bản, ID và cấu hình này. Đổi hash function, trọng số, server ID hoặc tập URI có thể đổi tỷ lệ. Với ít key, hai backend bằng trọng số cũng không bắt buộc chia đúng nửa. Và 43 key có thể gây tải lớn hơn 57 key nếu chúng được gọi thường xuyên hơn hoặc tốn CPU hơn.

**Suy luận từ luật ánh xạ:** khi một key chuyển chủ, dữ liệu trong RAM backend cũ không đi theo. Nếu key là một giỏ hàng đang giữ cục bộ thì consistent hashing không sao chép giỏ hàng. Nếu key là object cache thì backend mới có thể miss và kéo tải về nguồn. Cần quyết định state được lưu bền ở đâu, có thể tái tạo hay không, và điều gì xảy ra trong cửa sổ chuyển chủ; một thuật toán định tuyến không giải thay bài toán đó.

Tương tự, thuật toán chỉ quyết định lựa chọn mới. Không thể đưa nửa byte stream TCP đã tới `a` sang `b` rồi mong `b` có state TCP và state ứng dụng tương ứng. Một L7 proxy có thể chọn lại cho một request thích hợp nếu chính sách retry cho phép; việc gửi lại request có side effect lại là bài toán khác. Bài 25 sẽ tách timeout khỏi quyền retry.

### 3.4 Health check đo một đường cụ thể, không đo mọi điều đúng

**Health check là phép thử định kỳ hoặc dựa trên lưu lượng để quyết định backend còn được nhận lượt chọn mới hay không.** Active check chủ động gửi probe; passive check suy từ các lỗi phục vụ thật. Ở lab ta dùng active HTTP check, không dùng lỗi request thật làm tín hiệu đổi state.

Một TCP connect thành công chỉ chứng minh có thành phần chấp nhận kết nối ở địa chỉ/port ấy. Nó chưa chứng minh worker nhận việc được, pool DB còn slot, schema tương thích hoặc đường nghiệp vụ trả kết quả đúng. Vì thế lab cố ý giữ listener của `a` mở nhưng đổi `/health` sang `503`. Check HTTP đòi `200`, nên HAProxy loại `a` khỏi lượt chọn dù kết nối trực tiếp tới port của nó vẫn thành công.

**Readiness — khả năng sẵn sàng nhận việc mới — khác liveness — khả năng tiến trình còn hoạt động.** Nếu health endpoint xanh khi worker chưa nhận được việc, LB không có thông tin để tránh node ấy. Ngược lại, nếu cứ một dependency chung lỗi là mọi backend cùng đỏ, bộ cân bằng có thể hết đích trong lúc vẫn có request có thể phục vụ từ cache. Nội dung check phải phù hợp phần việc mà backend hứa nhận; đây là quyết định hệ thống cần thử bằng failure injection, không phải thêm một câu SQL bất kỳ là xong.

Lab đặt `inter 100ms`, `fall 2`, `rise 2`: check lặp theo cấu hình 100 ms, cần chuỗi lỗi/thành công để chuyển trạng thái. Các ngưỡng này chống dao động vì một probe lẻ, nhưng cũng tạo cửa sổ giữa sự cố và việc đổi lựa chọn. Ta đợi 500 ms trước khi đo trạng thái sau đổi; **không đo được cận phát hiện chính xác** từ phép thử này. Mất mạng, check treo và scheduler đều ảnh hưởng mốc quan sát.

Có hai sự kiện khác nhau cần ghi log: “backend bắt đầu không nhận được request” và “LB đã ngừng chọn backend”. Request lọt giữa hai sự kiện có thể lỗi. Đối với deploy có kế hoạch, đừng dựa vào health check tự phát hiện sau khi bạn giết process. Bạn đã biết trước ý định tắt; hãy rút node khỏi lượt chọn trước.

## ⏸ Dừng lại — đoán trước #2

`a` đang chạy một request cần 1,2 s. Bạn cho nó drain và ngay sau đó tắt process. Điều gì được bảo đảm?

- (a) LB tự chuyển request đang chạy sang `b` cùng toàn bộ state.
- (b) Chỉ request mới bị ngừng chọn `a`; request cũ vẫn cần `a` sống cho tới khi xong.
- (c) Drain đồng nghĩa hủy toàn bộ connection ngay.
- (d) Check `200` khiến process đã tắt vẫn trả response được.

### 3.5 Drain là một trạng thái chuyển tiếp, không phải lệnh kết thúc công việc

Đáp án là **(b)** trong điều kiện lab: không persistence, không luật ép chọn server. **Draining là giai đoạn ngừng phân công việc mới theo chính sách đã chọn nhưng cho công việc đang tồn tại có cơ hội kết thúc.** HAProxy còn phân biệt `drain`, `maint` và thao tác đóng session; không gộp ba thứ thành “tắt server”. Với persistence, một server drain vẫn có thể nhận traffic được ghim; phải đọc đúng hành vi của sản phẩm và cấu hình đang dùng.

Ta bắt đầu `/slow` ở `a`, dùng marker của server để xác nhận request đã vào handler, rồi đặt `a` drain và đưa `b` về ready. Request mới tới `b`; request cũ còn đường tới `a`, đợi xong rồi trả `200`. Sau đó lab chạy nhánh sai: khi request đã bắt đầu nhưng chưa có header response, gửi `shutdown sessions server web/a`. Client nhận `502`. Đây là **cưỡng bức đóng session bằng runtime API**, không phải phép đo `SIGKILL` của backend; hai thao tác có thể tạo dấu vết socket khác nhau.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 405" role="img" aria-labelledby="net24-d-t net24-d-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="net24-d-t">Drain giữ đường về của request cũ</title>
<desc id="net24-d-d">a đổi ready sang drain, request mới tới b, response cũ vẫn từ a.</desc>
<defs><marker id="net24-d-arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker></defs>
<text x="20" y="25" font-size="14" text-anchor="start" fill="currentColor">/slow đã bắt đầu → mới drain → cũ hoàn thành</text><rect x="20" y="60" width="110" height="40" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="75.0" y="85.0" font-size="14" text-anchor="middle" fill="currentColor">Client</text><rect x="225" y="60" width="110" height="40" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="280.0" y="85.0" font-size="14" text-anchor="middle" fill="currentColor">HAProxy</text><rect x="440" y="60" width="110" height="40" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="495.0" y="85.0" font-size="14" text-anchor="middle" fill="currentColor">a</text><rect x="370" y="250" width="110" height="40" rx="7" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="425.0" y="275.0" font-size="14" text-anchor="middle" fill="currentColor">b</text><line x1="75" y1="100" x2="75" y2="320" stroke="currentColor" stroke-dasharray="4 4" opacity="0.4"/><line x1="280" y1="100" x2="280" y2="320" stroke="currentColor" stroke-dasharray="4 4" opacity="0.4"/><line x1="495" y1="100" x2="495" y2="350" stroke="currentColor" stroke-dasharray="4 4" opacity="0.4"/><g data-step="1"><path d="M75 130 L280 130" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net24-d-arr)"/><text x="177.5" y="118" font-size="14" text-anchor="middle" fill="currentColor">/slow</text><path d="M280 168 L495 168" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net24-d-arr)"/><text x="387.5" y="156" font-size="14" text-anchor="middle" fill="currentColor">đang xử lý</text></g><g data-step="1" data-until="1"><rect x="440" y="205" width="110" height="32" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="495.0" y="226.0" font-size="14" text-anchor="middle" fill="currentColor">ready</text></g><g data-step="2"><rect x="440" y="205" width="110" height="32" rx="7" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="495.0" y="226.0" font-size="14" text-anchor="middle" fill="currentColor">drain</text></g><g data-step="2"><path d="M280 270 L370 270" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net24-d-arr)"/><text x="325" y="258" font-size="14" text-anchor="middle" fill="currentColor">request mới</text></g><g data-step="3"><path d="M495 340 L75 340" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net24-d-arr)"/><text x="285.0" y="328" font-size="14" text-anchor="middle" fill="currentColor">200 từ a: việc cũ xong</text></g>
</svg>
<step-note data-step="1">Marker server xác nhận request đã vào a trước khi đổi trạng thái.</step-note>
<step-note data-step="2">Trạng thái ready biến mất; drain ngừng lượt chọn thường tới a nhưng giữ session cũ.</step-note>
<step-note data-step="3">Chỉ sau khi việc cũ xong mới có bằng chứng cho phép tắt a trong mô hình này.</step-note>
</step-flow>

Trình tự deploy vì thế phải có các điểm quan sát: xác nhận backend mới sẵn sàng; ngừng phân công thêm cho backend cũ; xác nhận chính sách ấy đã có hiệu lực trên mọi LB liên quan; đợi công việc cũ kết thúc hoặc chạm hạn đã định; cuối cùng mới dừng process. Với HTTP proxy cần quan sát active request/stream; với cân bằng TCP cần cả vòng đời connection. Một connection WebSocket có thể tồn tại cho tới khi client rời phiên: thời gian grace hữu hạn không biến thành lời hứa “không rớt”.

**Grace period là khoảng thời gian cho phép hoàn thành sau khi bắt đầu shutdown.** Nếu app còn cho nhận việc suốt cửa sổ chờ rồi mới đóng listener, bạn có thể tự kéo dài đuôi công việc. Nếu orchestrator giết process khi grace hết nhưng LB vẫn chọn nó, readiness xanh trước đó không giúp được. Nếu LB đã dừng chọn nhưng app đóng socket ngay khi nhận tín hiệu, drain phía LB cũng không cứu response đang làm.

> **Suy luận.** Với mô hình “phải chờ xác nhận mọi LB ngừng gửi, rồi chờ request nhận cuối cùng hoàn thành”, thời gian giữ app sống phải bao phủ cả độ trễ rút đích và thời gian việc còn lại. Lab chứng minh lợi ích của giữ session; chưa đo thời gian lan truyền trạng thái qua nhiều LB hoặc orchestrator. Kiểm thực tế bằng trace request bắt đầu sát lúc rút đích, timestamp từng LB và log shutdown của app.

`502` ở đây cũng không chứng minh backend chưa thực hiện side effect. RFC 9110 phân loại nó là lỗi gateway khi response upstream không hợp lệ; code nghiệp vụ có thể đã ghi dữ liệu trước khi response bị cắt. Mỗi request lỗi cần ghép với log backend và ID thao tác. Không dùng retry mù để biến lỗi deploy thành thao tác bị thực hiện hai lần.

## 4. Lab

### 4.1 Dựng hai backend, giữ nguyên điều kiện phía client

Các file cần có trong `net-lab/net-24/`: `run.sh`, `lab.py`; script sinh `haproxy.cfg`. Chạy:

```bash
./run.sh
```

Script dựng container `net24-lab` từ `alpine:3.20`, cài Python/HAProxy, đo rồi dọn bằng trap. Tất cả listener gắn `127.0.0.1` **bên trong container**, không publish cổng. Không chạy `curl localhost:8007` trên host rồi coi đó là cùng đường mạng. Log cài đặt nằm ở `out/install.txt`; log dịch vụ HAProxy ở `out/haproxy.txt`; console đo ở `out/lab.txt`.

Cấu hình tối thiểu để hiểu biến độc lập:

```text
frontend tcpin
 bind 127.0.0.1:8004
 mode tcp
 default_backend tcpbe
backend tcpbe
 mode tcp
 balance roundrobin
 server a 127.0.0.1:9001
 server b 127.0.0.1:9002
```

Nhánh HTTP là frontend `8007`, backend `web`, có `mode http`, round-robin và `option http-server-close`. Cấu hình đầy đủ sinh ra giữ cả hai nhánh; đừng chỉ đổi port trong một frontend mà quên mode backend.

### 4.2 Chạy bản sai “mỗi request được một lượt cân bằng”

Trong `lab.py`, mỗi cổng nhận một đối tượng `HTTPConnection` và gọi `request/getresponse/read` 6 lần. Phải đọc hết response trước lần kế tiếp để không biến phép đo thành lỗi client parser. Kết quả thật:

```text
ONE_CLIENT_CONNECTION 8004 a,a,a,a,a,a
ONE_CLIENT_CONNECTION 8007 a,b,a,b,a,b
```

**Thấy gì:** cùng số request và cùng một connection client, khác ranh giới chọn backend. **Vì sao:** TCP mode chuyển cả stream; HTTP mode có quyết định theo request trong cấu hình đã cô lập. Muốn kiểm thêm kết nối TCP mới, hãy tạo `HTTPConnection` mới cho từng lượt và ghi backend nhận; bài không lấy kết quả nhánh ấy khi chưa đo.

### 4.3 Đối chiếu hash từng key, không chỉ đếm tổng

Backend `hashed` trên `8008` dùng:

```text
balance uri whole
hash-type consistent
option http-server-close
server a 127.0.0.1:9001 id 1
server b 127.0.0.1:9002 id 2
```

Sau khi lưu mapping, script gửi `disable server hashed/a` qua Unix socket `/tmp/admin.sock`, rồi hỏi lại cùng 100 URI. Output:

```text
HASH_REMOVE_A {"keys": 100, "before": {"b": 57, "a": 43}, "moved": 43, "b_stayed": true}
```

**Thấy gì:** mọi key đổi chủ đúng là key vốn thuộc `a`. **Vì sao:** với cấu hình consistent của lần chạy này, việc bỏ `a` không đổi owner của các key đang ở `b`. Mở `out/hash.json` để xác nhận từng cặp before/after. Socket quản trị chỉ tồn tại trong container lab; không mở nó cho client Internet.

### 4.4 Làm health sai mà không đóng port

Script đổi biến readiness của server `a`; `/health` trả `503`, còn listener vẫn mở. HAProxy có check HTTP với expected status `200`. Sau thời gian chờ của phép thử:

```text
HEALTH_A 503 TCP_CONNECT OK
AFTER_HEALTH_FAIL b,b,b,b,b,b
```

**Thấy gì:** port mở và readiness của HTTP không tương đương. **Vì sao:** phép connect không gọi endpoint kiểm; LB được cấu hình dùng endpoint nên loại được `a`. Đây không phải TCP connect timeout, cũng không phải kiểm DB thật. Bạn có thể sửa handler để nó giả lập pool cạn, nhưng phải ghi riêng phép đo ấy.

### 4.5 Giữ việc cũ rồi cố tình phá nó

Script dùng hai lượt `/slow` khác nhau, mỗi lượt đợi marker chứng minh handler đã bắt đầu. Trong lượt drain, điều khiển qua socket:

```text
set server web/a state drain
set server web/b state ready
```

Nhánh cưỡng bức dùng `shutdown sessions server web/a` sau khi đưa `a` về ready và cô lập nó cho phép thử. Kết quả trích nguyên dòng:

```text
DRAIN_NEW (200, 'b')
DRAIN_INFLIGHT (200, 'a')
FORCE_SHUTDOWN_INFLIGHT 502
```

**Thấy gì:** giữ backend cho request cũ và không chọn nó cho request mới là hai điều có thể đồng thời đúng. **Vì sao:** runtime state điều khiển phân công, còn session cũ vẫn tồn tại. Đóng session phá đường trả response. Lab tắt retries để không che sự cố bằng một lượt gửi lại; handler `/slow` chỉ ngủ và trả tên, không có giao dịch hay side effect.

## 5. Tính tay

Các số dưới đây là **giả định bài toán**, trừ mẫu hash đã gắn nhãn lab. Phép tính được kiểm bằng Python, lưu `out/calculations.txt`; không dùng chúng như thông số giới hạn sản phẩm.

### 5.1 Đường trả nào làm LB phải chuyển thêm byte?

Giả sử 1.000 request/s, mỗi request 2 KB và mỗi response 100 KB; KB/MB thập phân, bỏ header và retransmit. Chỉ cộng payload đi qua LB **một lần cho mỗi chiều**, không tính tổng I/O đọc cộng ghi của NIC/process. NAT cần chuyển bao nhiêu MB/s? LVS-DR cần bao nhiêu payload request qua director?

**Giải:** NAT: `1000 × (2+100) = 102000 KB/s = 102 MB/s`. DSR: `1000 × 2 = 2000 KB/s = 2 MB/s` đi qua director trong mô hình. Response vẫn tiêu băng thông backend và đường tới client; nó không biến mất. Hai số không phải phép đo CPU, cũng không được đem so trực tiếp với counter tổng ingress+egress chưa định nghĩa cách cộng.

### 5.2 Bao nhiêu key di chuyển, và điều đó chưa trả lời gì?

Từ output hash, bỏ `a` làm 43/100 key đổi chủ. Tỷ lệ là bao nhiêu? Nếu 43 key ấy chiếm phần lớn request thật thì có thể kết luận `b` chỉ tăng 43% tải không?

**Giải:** tỷ lệ key chuyển là `43/100 × 100 = 43%`; 57% key giữ nguyên owner. Không đủ dữ kiện tính tăng tải: cần tần suất và chi phí của từng key, tải nền của `b`, ảnh hưởng cache miss sau chuyển. Một tỷ lệ trên không gian key không phải tỷ lệ CPU hoặc request/s.

### 5.3 Đợi tính từ mốc nào?

Giả sử sau lệnh rút đích, phải tới `t=0,5 s` mọi LB mới ngừng giao request mới cho `a`. Request cuối nhận sát mốc ấy mất tối đa 1,2 s còn lại. Không có phiên dài, không persistence, không request mới sau xác nhận. Tắt process ở `t=1,2 s` có đủ không? Một sự cố ngoài kế hoạch với 10.000 request/s và cửa sổ phát hiện 0,2 s có thể có bao nhiêu request lọt cửa sổ, nếu mọi request đó vẫn được gửi tới đích lỗi?

**Giải:** theo giả định thứ nhất, cận là `0,5+1,2=1,7 s` kể từ lệnh rút, chưa có biên vận hành. Tắt ở 1,2 s có thể cắt request nhận cuối. Theo giả định thứ hai, `10000×0,2=2000` request bị phơi trước lựa chọn lỗi; đây là cận theo giả định mọi request đều đi đích đó, không phải dự đoán số lỗi của cụm hai backend. Không cộng một health interval đoán trước vào mọi hệ thống rồi gọi nó là thời gian deploy an toàn.

## 6. Chuyển giao

1. Thêm backend thứ ba nhưng request/s của nó gần bằng không; phía trước LB là một proxy có pool TCP sống lâu. Bạn đo gì để phân biệt thiếu connection mới với health/persistence sai?
2. Một node nhận ít request nhưng CPU cao nhất cụm. Thiết kế phép đo để phân biệt key nóng, response lớn và thuật toán chia theo connection.
3. DSR hoạt động với một client cùng mạng nhưng thất bại qua router khác. Những packet, địa chỉ nguồn và bảng route nào phải đối chiếu trước khi đổi thuật toán cân bằng?
4. Check `/ready` xanh trong khi mọi request cần DB đều lỗi; app vẫn phục vụ được nội dung cache. Bạn xác định hợp đồng readiness ra sao để không tự loại cả cụm chỉ vì một dependency chung?
5. Drain có hiệu lực nhưng vài request mới vẫn tới node cũ. Bạn tìm bằng chứng cho cookie persistence, connection còn sống và luật ép backend thế nào?
6. **Câu khó nhất, không có đáp án trong bài.** Thiết kế rolling deploy một dịch vụ có HTTP/2 stream, WebSocket, request ghi dữ liệu và cache cục bộ, phía trước là hai LB giữ state riêng. Hãy chọn điều kiện ngừng nhận việc, cách đồng bộ rút đích, mốc được phép giết process, cơ chế cho client nối lại và bằng chứng không lặp side effect. Phân tích cả một LB bị partition đúng lúc drain; chỉ ra lời hứa nào bạn phải bỏ nếu grace period luôn hữu hạn.

## 7. Tóm tắt

- Round-robin phải đọc cùng đơn vị chọn: lab TCP giữ 6 request ở `a`; HTTP cho `a,b,a,b,a,b`.
- HAProxy `mode tcp` của lab vẫn là TCP proxy có hai chặng kết nối; tên L4 không quyết định NAT hay DSR.
- LVS-DR giữ IP đích VIP, chuyển frame tới backend và cho backend trả trực tiếp; đó là cơ chế từ nguồn LVS, chưa đo ở lab này.
- Consistent hashing hạn chế đổi owner theo cấu hình, không sao chép state; mẫu lab chuyển 43/100 key khi bỏ `a` và giữ mọi key của `b`.
- TCP port mở không chứng minh readiness: lab có `/health=503` đồng thời connect TCP thành công.
- Drain cần backend tiếp tục sống cho công việc cũ: lab trả `200` cho request cũ, cưỡng bức đóng session trả `502`.
- Thời gian rút đích và thời gian hoàn thành việc cuối có thể nối tiếp; mốc tắt process cần bằng chứng ở cả LB và app.

→ **Bài 25 — Proxy và chuỗi timeout**: đã biết backend nào nhận việc, ta theo hai chặng kết nối để xác định ai hết hạn trước, vì sao có `502/504`, và IP client được truyền qua các proxy như thế nào.
