# Bài 21 — DNS khi vận hành: đổi IP, apex, view và chữ ký

## 1. Mục tiêu

Sau bài này bạn có thể:

- Lập mốc hạ TTL, đổi IP và giữ server cũ từ hạn của dữ liệu đã phát, thay vì từ lúc bấm lưu.
- Tách IP cũ do DNS cache khỏi kết nối đã mở tới IP cũ bằng những điểm quan sát khác nhau.
- Giải thích vì sao CNAME tại apex xung đột với dữ liệu bắt buộc của zone và chọn giải pháp có kiểm chứng.
- Kiểm tra cùng tên từ đúng resolver/view để phân biệt split-horizon với dữ liệu chưa cập nhật.
- Đọc RRSIG, DNSKEY, DS, DO, AD và CD theo đúng vai trò; không coi thấy chữ ký là đã xác thực.
- Dùng lỗi validation có chủ đích để chỉ rõ DNSSEC chặn sửa dữ liệu ở đâu và không bảo vệ điều gì.

## 2. Triệu chứng

Bạn chuyển `api.lab.test` từ `192.0.2.10` sang `192.0.2.20`. Để “đổi cho kịp”, bạn hạ TTL từ **30 giây** xuống **5 giây** cùng lúc thay IP. Hỏi authoritative thấy IP mới với TTL 5. Bạn đợi vài giây, tắt server cũ, nhưng resolver vừa được làm ấm vẫn trả IP cũ với TTL **28 giây**.

Một người kiểm từ mạng nội bộ lại thấy `10.20.0.10`, nên nhóm bắt đầu nghi record bị ghi đè. Trong khi đó, tên khác có chữ ký DNSSEC trả SERVFAIL sau khi sửa A bằng tay; hỏi trực tiếp authoritative vẫn có địa chỉ. Ba quan sát này không có chung một nguyên nhân, dù đều được gọi là “DNS chưa cập nhật”.

> **Đo trên lab.** `net-lab/net-21/out/lab.txt`: `prime old address`, `authority new address TTL lowered`, `resolver retains old TTL`, `external perspective`, `internal perspective`, `validator rejects tamper`. BIND 9.18.49, Unbound 1.20.0, Alpine 3.20 trên Linux aarch64. Đo lại bằng `./run.sh`; TTL còn lại phụ thuộc lịch thực thi, không phải cam kết đúng từng giây trên máy khác.

Bài [[net-20-dns-phan-giai]] đã tách recursive, authoritative và negative cache. Ta dùng lại mô hình ấy để ra quyết định vận hành: **thay dữ liệu ở đâu, ai vẫn được dùng bản cũ, và bằng chứng nào đủ để tắt đường cũ**. Không cần học lại DNS tổng quan hay chuỗi chứng chỉ TLS ở [[eng-03-tcp-tls]]. Chữ ký DNSSEC phía dưới không phải chứng chỉ TLS cho web server.

## ⏸ Dừng lại — đoán trước #1

Vừa đổi IP vừa hạ TTL từ 30 xuống 5, rồi chờ 5 giây. Resolver lấy A cũ ngay trước lần thay đổi. Điều nào đúng nếu resolver tuân thủ TTL thường và không serve-stale?

- (a) Mọi cache cũ đã bị đổi hạn thành 5 giây vì authoritative phát TTL mới.
- (b) Cache cũ có thể tiếp tục trả IP cũ tới hết hạn 30 giây tính từ khi nó nhận A cũ.
- (c) Resolver phải hỏi root để root xác nhận TTL mới.
- (d) Tăng serial SOA sẽ buộc mọi recursive xoá A cũ ngay.

## 3. Cơ chế

### 3.1 TTL là hạn của dữ liệu đã nhận, không phải nút thu hồi toàn cầu

Đáp án **(b)**. Khi resolver nhận RRset A với TTL 30, nó giữ một dữ liệu có hạn riêng. Sau đó bạn đổi A và TTL ở authoritative; resolver chưa hỏi lại thì chưa biết thay đổi. TTL 5 mới ràng buộc những lần nhận dữ liệu mới, không sửa từ xa bộ đếm của dữ liệu cũ.

**Cutover là thời điểm bắt đầu đưa các kết nối mới sang đích mới theo kế hoạch chuyển đổi.** Một kế hoạch dùng TTL cần làm theo quan hệ nhân quả: hạ TTL trước → chờ dữ liệu có TTL dài đã phát trước đó hết hạn → đổi địa chỉ → giữ cả hai đích phục vụ trong cửa sổ chuyển tiếp → kiểm lưu lượng và điều kiện ứng dụng trước khi dừng đích cũ.

Thời gian chờ trước cutover lấy từ **TTL cũ mà các authoritative vẫn có thể đã phát**, không chỉ giá trị vừa lưu trong control panel. Nếu có nhiều authoritative và một server chưa nạp cấu hình mới, một recursive vẫn có thể nhận TTL dài sau lúc bạn tưởng đã bắt đầu đếm. Vì thế kiểm trực tiếp từng authoritative phục vụ zone trước khi chốt mốc hạ TTL đã hoàn thành.

Đừng lấy serial SOA làm lệnh xoá cache recursive. Serial giúp xác định phiên bản zone trong việc đồng bộ authoritative; cache A thông thường không thăm dò SOA serial trước mỗi lần trả cached answer. Tăng serial đúng vẫn cần thiết cho quản lý zone, nhưng không thay cho chờ hạn đã phát.

> **Nguồn.** [RFC 1034 §4.2.1](https://www.rfc-editor.org/rfc/rfc1034#section-4.2.1) giải thích TTL và việc giảm trước thay đổi có thể dự đoán. [RFC 2181 §5 và §8](https://www.rfc-editor.org/rfc/rfc2181#section-5) làm rõ RRset và TTL. Lịch chuyển đổi dưới đây là **suy luận vận hành** từ hạn cache, không phải một giao thức phát invalidation.

<svg viewBox="0 0 520 290" role="img" aria-labelledby="net21-a-t net21-a-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net21-a-t">Hai mốc khác nhau khi đổi A</title>
<desc id="net21-a-d">Thanh cache vẫn dài tới hạn 30 giây dù authoritative đã đổi từ gần giây thứ hai.</desc>
<defs><marker id="net21-a-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="currentColor"/></marker></defs>
<text x="20" y="25" font-size="15" text-anchor="start" fill="currentColor">Đổi TTL không rút ngắn cache đã phát</text><text x="15" y="80" font-size="13" text-anchor="start" fill="currentColor">Authority</text><rect x="110" y="60" width="24" height="30" rx="6" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><rect x="134" y="60" width="361" height="30" rx="6" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="145" y="81" font-size="13" text-anchor="start" fill="currentColor">A .20 · các câu trả lời mới TTL 5</text><text x="15" y="150" font-size="13" text-anchor="start" fill="currentColor">Cache A</text><rect x="110" y="130" width="360" height="38" rx="6" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="155" y="154" font-size="14" text-anchor="start" fill="currentColor">192.0.2.10 · còn hạn cũ</text><path d="M134 45 L134 205 M470 110 L470 205" stroke="currentColor" stroke-dasharray="4 4"/><text x="134" y="225" font-size="13" text-anchor="middle" fill="currentColor">t≈2</text><text x="470" y="225" font-size="13" text-anchor="middle" fill="currentColor">t=30</text><text x="110" y="195" font-size="13" text-anchor="start" fill="currentColor">t=0</text><text x="20" y="265" font-size="13" text-anchor="start" fill="currentColor">Tại t≈2: authoritative TTL 5, cache còn ≈28 s</text>
</svg>

Một RRset có nhiều A không tạo ra phần trăm traffic cố định cho từng IP. Resolver có thể đổi thứ tự, client có thể chọn địa chỉ theo cách riêng, và connection pool làm nhiều request dùng chung một địa chỉ. Muốn chuyển một tỷ lệ lưu lượng có thể quan sát, cần cơ chế và số đo đúng ở tầng định tuyến/cân bằng tải; chỉ đếm tỷ lệ record trong zone chưa chứng minh tỷ lệ request.

Đổi A cũng không hoàn tất việc chuyển mọi loại client. Nếu tên còn AAAA trỏ đích cũ, client dual-stack có thể vẫn chọn đường IPv6. Nếu tên là CNAME, phải kiểm cả hạn bí danh và địa chỉ đích như bài 20. Nếu thay NS, đó là thay đường tìm dữ liệu, có cache delegation/glue riêng; không được dùng TTL A để tính toàn bộ kế hoạch chuyển nhà cung cấp DNS.

### 3.2 DNS hết hạn không đóng socket đã mở

**Connection pool là tập kết nối đã thiết lập được ứng dụng giữ lại để tái sử dụng cho các request sau.** Sau khi TCP hoặc QUIC đã có peer/state phù hợp, việc một RRset DNS hết hạn không tự gửi FIN, RST hay yêu cầu tạo socket mới cho pool. DNS giúp tìm địa chỉ khi cần phân giải; nó không phải cơ chế thu hồi mọi kết nối tới IP ấy.

Vì vậy có hai câu hỏi vận hành độc lập: “lần phân giải mới từ client này trả gì?” và “request này đang chạy trên connection nào?”. Một request sau mốc cutover vẫn tới server cũ có thể đang dùng socket mở trước đó. Flush DNS rồi thấy traffic cũ không chứng minh flush thất bại. Ngược lại, tạo socket mới cũng chưa chứng minh có phân giải mới nếu thư viện/app giữ cache riêng.

Đặt bằng chứng ở cả hai điểm: ghi resolver/QNAME/QTYPE/TTL của phép hỏi mới; ghi remote address, thời điểm mở connection và việc tái dùng pool của request thực. Có thể kiểm một process mới với resolver chỉ định để đối chiếu, nhưng không đánh đồng process mới ấy với mọi client đang giữ pool lâu đời.

> **Suy luận.** TTL điều khiển thời gian dùng dữ liệu cache DNS; vòng đời transport được quản lý riêng như [[net-18-dong-ket-noi]] và [[net-19-udp-quic]]. Vì vậy hết TTL không tự đóng pool. Lab bài này **chưa đo connection pool**. Kiểm bằng một client HTTP giữ keepalive, ghi socket peer trước/sau đổi DNS rồi so với một connection mới có phân giải được instrument riêng.

Thêm một ngoại lệ ở chính resolver: **serve-stale là chính sách cho phép trả dữ liệu DNS đã hết TTL trong những điều kiện được quy định để duy trì khả dụng**. “Đợi TTL cũ là tuyệt đối không còn client nào dùng IP cũ” vì thế quá mạnh. Còn cache của app, resolver có min-TTL, client ngoại tuyến và pool đều cần được xem xét theo hệ thống cụ thể.

> **Nguồn.** [RFC 8767 §4–5](https://www.rfc-editor.org/rfc/rfc8767#section-4) quy định phục vụ dữ liệu hết hạn và quản lý TTL trong cơ chế đó. Lab đặt `serve-expired: no`, `cache-min-ttl: 0`, tắt prefetch để đo TTL thường. Không dùng TTL trong lab làm SLA chuyển đổi cho mọi resolver Internet.

Giữ server cũ bao lâu vì thế phải có điều kiện rõ: hạn DNS cũ trong mô hình đã chọn, hạn pool/session do ứng dụng kiểm soát, và quan sát kết nối mới/cũ theo khoảng thời gian đủ đại diện. Nếu không biết client giữ pool tối đa bao lâu, bạn chưa có một cận trên đã chứng minh. Có thể cần draining ở LB hoặc chiến lược tương thích hai đích; bài 24 sẽ đo chuyện đó ở tầng cân bằng tải.

### 3.3 Apex bắt buộc có dữ liệu mà CNAME không được đứng cùng

**Apex là tên ở gốc một zone**, chẳng hạn `lab.test` của zone `lab.test`. Không đồng nhất nó với mọi tên đăng ký được: `team.lab.test` cũng có thể là apex nếu được uỷ quyền thành zone riêng. **CNAME là bản ghi đặt một tên làm bí danh của tên khác**, và tại owner của CNAME không được có dữ liệu thông thường khác; có ngoại lệ cho metadata DNSSEC theo chuẩn.

Một zone cần SOA và NS ở apex. Đặt CNAME chính tại tên đó gây xung đột: tên vừa phải mô tả zone qua SOA/NS vừa phải mang ngữ nghĩa chỉ là bí danh. Vấn đề gốc là luật dữ liệu tại **cùng owner name**, không phải trình duyệt không đọc được CNAME hay CNAME không hỗ trợ HTTPS.

Ở subdomain bình thường như `www.lab.test`, có thể dùng CNAME nếu không đặt thêm A, MX hoặc dữ liệu xung đột tại chính `www`. MX ở `lab.test` và CNAME ở `www.lab.test` không xung đột vì khác owner. Đừng đổi luật thành “zone nào có MX thì không dùng CNAME ở bất cứ đâu”.

> **Nguồn.** [RFC 2181 §10.1](https://www.rfc-editor.org/rfc/rfc2181#section-10.1): *“but may have no other data.”* RFC này có ngoại lệ cho metadata DNSSEC thời kỳ đó; bộ record hiện hành nằm trong RFC 4034. Quy tắc không cho CNAME đứng cùng SOA/NS ở apex vẫn áp dụng.

<svg viewBox="0 0 520 320" role="img" aria-labelledby="net21-b-t net21-b-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net21-b-t">Xung đột dữ liệu tại cùng tên apex</title>
<desc id="net21-b-d">SOA và NS ở cùng owner apex làm CNAME không hợp lệ. CNAME ở owner khác không chịu xung đột đó.</desc>
<defs><marker id="net21-b-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="currentColor"/></marker></defs>
<text x="20" y="25" font-size="15" text-anchor="start" fill="currentColor">Cùng owner: lab.test (apex)</text><rect x="30" y="50" width="460" height="120" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="50" y="77" font-size="14" text-anchor="start" fill="currentColor">Dữ liệu bắt buộc của zone</text><circle cx="130" cy="125" r="30" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="130" y="130" font-size="14" text-anchor="middle" fill="currentColor">SOA</text><circle cx="225" cy="125" r="30" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="225" y="130" font-size="14" text-anchor="middle" fill="currentColor">NS</text><path d="M310 98 L460 152 M310 152 L460 98" stroke="#f43f5e" stroke-width="2"/><text x="385" y="130" font-size="14" text-anchor="middle" fill="currentColor">CNAME</text><path d="M260 175 L260 215" stroke="currentColor" fill="none" marker-end="url(#net21-b-a)"/><rect x="65" y="225" width="390" height="45" rx="6" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="260" y="253" font-size="14" text-anchor="middle" fill="currentColor">BIND: CNAME and other data</text><text x="25" y="298" font-size="13" text-anchor="start" fill="currentColor">CNAME ở www là owner khác → không xung đột</text>
</svg>

Một nhà cung cấp có thể cho bạn nhập **Alias/ANAME/flattening — cơ chế của sản phẩm biến đích tên thành kết quả phù hợp để phục vụ ở tên đang hỏi**. Các nhãn đó không tự đồng nghĩa với một wire CNAME hợp lệ ở apex. Nếu sản phẩm trả A/AAAA tại apex thì client thấy bản ghi địa chỉ; công việc theo dõi tên đích có thể nằm ở nhà cung cấp.

Phải kiểm tài liệu chính thức và query thực của sản phẩm cụ thể: đích nào được hỗ trợ, loại record trả ra, TTL được quyết định ở đâu, có hỗ trợ AAAA không, và DNSSEC ký dữ liệu nào. Không tự copy một IP của dịch vụ cloud vào A rồi coi tương đương Alias: nếu phía dịch vụ đổi địa chỉ, A tĩnh của bạn không có cơ chế theo dõi đích tên.

> **Chưa đo.** Lab dùng BIND chuẩn, không có Alias/ANAME/flattening của nhà cung cấp. Kiểm một sản phẩm bằng tài liệu của chính nó và `dig apex A`, `AAAA`, `CNAME`, `SOA` từ authoritative rồi recursive. Không khẳng định mọi sản phẩm dùng cùng thuật toán, cùng TTL hay cùng danh sách đích.

Chuyển HTTP sang `www` cũng không làm DNS apex tự chạy. Muốn server tại apex trả redirect HTTP, client vẫn phải tìm được địa chỉ apex, mở kết nối và thực hiện TLS khi dùng HTTPS. Đây là một tầng khác; CNAME không gửi status HTTP và không thay URL trong thanh địa chỉ.

## ⏸ Dừng lại — đoán trước #2

Cùng `api.lab.test`, resolver ngoài trả `192.0.2.20`, resolver nội bộ trả `10.20.0.10`; cả hai NOERROR. Cách kiểm tiếp nào có ích nhất?

- (a) Flush cache hai bên liên tục tới khi hai IP giống nhau.
- (b) Chọn câu trả lời có TTL lớn hơn làm bản đúng.
- (c) Xác định resolver/view mà từng môi trường được thiết kế phải dùng, rồi kiểm authoritative và đường kết nối trong đúng view ấy.
- (d) Dùng `+trace` từ laptop để kết luận mọi client nội bộ phải nhận địa chỉ công cộng.

### 3.4 Split-horizon chia góc nhìn, không chỉ chia cache

Đáp án **(c)**. **Split-horizon DNS là việc cùng tên được trả bộ dữ liệu khác nhau theo ngữ cảnh truy vấn hoặc đường resolver được cấu hình.** **View là một góc nhìn dữ liệu/chính sách DNS áp dụng cho một nhóm truy vấn.** Nguyên nhân gốc khác cache cũ: hai view có thể cố ý giữ **hai dữ liệu hiện hành khác nhau**, không phải cùng dữ liệu tại hai thời điểm.

Ở lab, resolver ngoài được gắn với authoritative có A công cộng mẫu `192.0.2.20`; resolver nội bộ gắn với authoritative có A riêng `10.20.0.10`. Cả hai cấu hình đều mới, đều có thể trả đúng theo thiết kế. Không có một đợt “lan truyền xong” nào làm chúng phải hội tụ về cùng IP.

<svg viewBox="0 0 520 350" role="img" aria-labelledby="net21-c-t net21-c-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net21-c-t">Hai view không phải hai cache chưa đồng bộ</title>
<desc id="net21-c-d">Cùng câu hỏi đi theo hai đường tới hai nguồn dữ liệu riêng. Không có cạnh đồng bộ buộc IP giống nhau.</desc>
<defs><marker id="net21-c-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="currentColor"/></marker></defs>
<rect x="20" y="15" width="215" height="65" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="127" y="40" font-size="14" text-anchor="middle" fill="currentColor">Ngoài · authority</text><text x="127" y="65" font-size="15" text-anchor="middle" fill="currentColor">192.0.2.20</text><rect x="20" y="145" width="215" height="50" rx="6" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="127" y="175" font-size="14" text-anchor="middle" fill="currentColor">Resolver :5353</text><path d="M127 140 L127 85" stroke="currentColor" fill="none" marker-end="url(#net21-c-a)"/><rect x="285" y="15" width="215" height="65" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="392" y="40" font-size="14" text-anchor="middle" fill="currentColor">Nội bộ · authority</text><text x="392" y="65" font-size="15" text-anchor="middle" fill="currentColor">10.20.0.10</text><rect x="285" y="145" width="215" height="50" rx="6" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="392" y="175" font-size="14" text-anchor="middle" fill="currentColor">Resolver :5354</text><path d="M392 140 L392 85" stroke="currentColor" fill="none" marker-end="url(#net21-c-a)"/><rect x="150" y="260" width="220" height="45" rx="6" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor"/><text x="260" y="288" font-size="14" text-anchor="middle" fill="currentColor">api.lab.test A</text><path d="M200 255 L127 200" stroke="currentColor" fill="none" marker-end="url(#net21-c-a)"/><path d="M320 255 L392 200" stroke="currentColor" fill="none" marker-end="url(#net21-c-a)"/><text x="260" y="330" font-size="13" text-anchor="middle" fill="currentColor">Chọn đường resolver → chọn nguồn zone</text>
</svg>

Một phép debug cần mang theo ngữ cảnh: máy đang ở VPN hay ngoài VPN, resolver nào thực sự nhận query, app dùng resolver hệ điều hành hay dịch vụ riêng, và backend có đường tới địa chỉ được trả hay không. Laptop đổi VPN nhưng ứng dụng dùng DNS-over-HTTPS riêng có thể không đi theo resolver nội bộ. **DoH — DNS over HTTPS — là cách chở truy vấn DNS trong HTTPS** ([RFC 8484 §1](https://www.rfc-editor.org/rfc/rfc8484#section-1)), không phải tên khác của DNSSEC. Nó có thể thay đường đi và nơi thấy câu hỏi; nó không tự biết chính sách private zone bạn mong muốn.

Không phải split-horizon nào cũng triển khai bằng một named có `view` phân loại source IP. Có thể là private hosted zone chỉ gắn với mạng riêng, conditional forwarding theo suffix, hoặc hai resolver phục vụ hai tập dữ liệu. Lab dùng hai authoritative và hai resolver endpoint để cô lập nguyên lý; **chưa đo phân loại client theo source subnet** hay VPN thật. Lựa chọn này được ghi rõ để không biến sơ đồ “góc nhìn” thành tuyên bố đã kiểm ACL.

> **Nguồn.** Thuật ngữ split DNS/split-horizon và các vai resolver được chuẩn hoá trong [RFC 9499](https://www.rfc-editor.org/rfc/rfc9499). **Đo trên lab:** cùng QNAME/QTYPE, port recursive `5353` trả `192.0.2.20`, port `5354` trả `10.20.0.10`; log ở `out/lab.txt`. Hai endpoint cố ý đại diện hai view, không phải hai bản sao cần đồng bộ giống nhau.

Địa chỉ riêng cũng không thay cho authorization. Một client biết IP có thể thử kết nối trực tiếp nếu có đường mạng; chỉ giấu tên trong private DNS không xác thực người dùng hay quyền truy cập. Khi debug “DNS nội bộ hoạt động nhưng API không vào được”, kiểm route, firewall, transport, TLS và quyền theo các bài tương ứng; không ép DNS giải quyết mọi tầng.

Một bẫy khác là view nội bộ chỉ khai báo một phần tên trong một zone được coi là có thẩm quyền. Tên không có trong view đó có thể thành NXDOMAIN thay vì tự hỏi public zone như người vận hành tưởng. Kiểm cơ chế local-zone/forwarding của resolver cụ thể và truy vấn một tên tồn tại chỉ bên ngoài. Đừng khẳng định một private zone luôn tự ghép với public zone theo từng record.

### 3.5 DNSSEC xác thực dữ liệu theo chuỗi tin cậy

**DNSSEC là phần mở rộng DNS cung cấp xác thực nguồn gốc và tính toàn vẹn dữ liệu bằng chữ ký cùng chuỗi tin cậy.** Nó không mã hoá nội dung câu hỏi/câu trả lời. Một observer còn có thể đọc tên trong DNS thông thường; DNSSEC không biến UDP thành kênh riêng tư. DoT/DoH bảo vệ transport theo cách khác, với phạm vi tới endpoint của kênh đó.

**RRSIG là bản ghi chữ ký cho một RRset**, có loại dữ liệu được phủ, thông tin thuật toán/key và thời gian hiệu lực. **DNSKEY là bản ghi khoá công khai của zone dùng trong kiểm chữ ký.** Thấy RRSIG đi cùng A mới chỉ cho biết có vật liệu để kiểm; chữ ký có thể sai, hết hạn hoặc không nối tới một mốc tin cậy.

**DS — Delegation Signer — là bản ghi tại parent liên kết bằng digest tới DNSKEY của child.** **Trust anchor là khoá hoặc dữ liệu tin cậy được validator cấu hình làm mốc bắt đầu kiểm.** Với chuỗi DNSSEC công cộng thông thường, validator bắt đầu từ anchor root, kiểm dữ liệu root, qua DS và DNSKEY của các zone có delegation đã ký, rồi tới RRset cuối. Mỗi liên kết phải phù hợp; không chỉ kiểm một chữ ký ở cuối rồi tin khoá bất kỳ do chính bên trả lời đưa ra.

**Validator là thành phần kiểm chứng dữ liệu DNSSEC theo mốc và quy tắc tin cậy.** Cần phân biệt ba tình trạng: **secure** là đã kiểm thành công; **insecure** là biết không có chuỗi ký bắt buộc tới dữ liệu theo quy tắc kiểm; **bogus** là đáng lẽ phải kiểm được nhưng kiểm thất bại. “Zone chưa ký” không tự đồng nghĩa “zone bị sửa chữ ký”. Còn tình trạng chưa xác định được cần điều tra thêm; không tự gán secure chỉ vì query có dữ liệu.

> **Nguồn.** [RFC 4033 §2–5](https://www.rfc-editor.org/rfc/rfc4033#section-2) mô tả dịch vụ xác thực và các giới hạn; [RFC 4034 §2–5](https://www.rfc-editor.org/rfc/rfc4034#section-2) định nghĩa DNSKEY, RRSIG và DS; [RFC 4035 §5](https://www.rfc-editor.org/rfc/rfc4035#section-5) quy định validation. Chuỗi tin cậy là cơ chế DNSSEC, không phải chuỗi chứng chỉ HTTPS đã học ở bài TLS.

DNSSEC còn có **authenticated denial of existence — bằng chứng phủ định có xác thực**, dùng các record như NSEC/NSEC3 để chứng minh không có tên/loại dữ liệu theo quy tắc. Chỉ ký A mà bỏ qua phủ định sẽ làm mô hình bảo vệ thiếu một nửa: attacker có thể muốn bạn tin “không có tên”, không nhất thiết muốn thay IP. Chi tiết định dạng và suy diễn phủ định ngoài phạm vi lab này.

Đừng đọc DNSSEC thành sự bảo đảm địa chỉ ứng dụng “an toàn”. Nếu chủ zone hoặc kẻ đã lấy được quyền ký xuất bản IP xấu cùng chữ ký hợp lệ, DNSSEC có thể xác thực đúng dữ liệu xấu đó đến từ zone. Nó cũng không chứng minh web server ở IP ấy có đúng chứng chỉ, không có lỗi logic và đang sẵn sàng. DNSSEC xác thực dữ liệu trong mô hình khoá, không thay TLS, authorization hay health check.

### 3.6 DO, AD và CD là ba yêu cầu/khẳng định khác nhau

**DO — DNSSEC OK — là bit báo client có thể nhận các record DNSSEC trong phản hồi**, thường được dig bật bằng `+dnssec`. **AD — Authenticated Data — là cờ phản hồi cho biết resolver đã xác thực dữ liệu theo các quy tắc áp dụng.** **CD — Checking Disabled — là cờ yêu cầu resolver không chặn trả dữ liệu chỉ vì kiểm chứng thất bại**, hữu ích cho điều tra nhưng không phải cách sửa dữ liệu sai.

Thấy `+dnssec` không đồng nghĩa dig tự kiểm toàn bộ chuỗi tin cậy. Hỏi thẳng authoritative với DO có thể nhận A và RRSIG nhưng không có validation ở client. Hỏi recursive validator có thể nhận AD khi dữ liệu hợp lệ. Còn tin cờ AD phải xét độ tin cậy của đường tới resolver; một response từ nguồn không tin cậy không thành bằng chứng xác thực chỉ vì có một bit tự khai.

Lab ký `secure.test`, cấp trực tiếp DNSKEY làm trust anchor cho Unbound và dùng stub-zone tới authoritative riêng. Đây là chuỗi ngắn **anchor của chính zone → kiểm RRset của zone**; **không dựng chuỗi DS từ root công cộng**. Trước sửa, `api.secure.test` trả `192.0.2.30` kèm AD. Ta thay A thành `192.0.2.99` trong file zone đã ký nhưng giữ nguyên RRSIG; restart validator để bỏ cached answer hợp lệ cũ. Truy vấn thường nhận SERVFAIL; cùng câu hỏi với CD lấy được dữ liệu bị sửa để đối chiếu.

<step-flow>
<svg viewBox="0 0 650 380" role="img" aria-labelledby="net21-d-t net21-d-d" style="width:100%;max-width:650px;height:auto;display:block;margin:1.25rem auto">
<title id="net21-d-t">Validator chặn dữ liệu bị sửa</title>
<desc id="net21-d-d">Một validator đứng giữa client và authoritative, có trust anchor cục bộ. Dữ liệu hợp lệ được thay bằng A sai chữ ký; query thường bị chặn, CD chỉ phục vụ điều tra.</desc>
<defs><marker id="net21-d-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="currentColor"/></marker></defs>
<rect x="5" y="15" width="120" height="45" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="65" y="43" font-size="14" text-anchor="middle" fill="currentColor">dig</text><path d="M65 60 L65 360" stroke="currentColor" stroke-dasharray="4 4" opacity="0.35"/><rect x="260" y="15" width="120" height="45" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="320" y="43" font-size="14" text-anchor="middle" fill="currentColor">Validator</text><path d="M320 60 L320 360" stroke="currentColor" stroke-dasharray="4 4" opacity="0.35"/><rect x="515" y="15" width="120" height="45" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="575" y="43" font-size="14" text-anchor="middle" fill="currentColor">Authority</text><path d="M575 60 L575 360" stroke="currentColor" stroke-dasharray="4 4" opacity="0.35"/><text x="320" y="82" font-size="13" text-anchor="middle" fill="currentColor">anchor secure.test</text><g data-step="1" data-until="1"><path d="M575 120 L320 120" stroke="currentColor" fill="none" marker-end="url(#net21-d-a)"/><text x="330" y="110" font-size="13" text-anchor="start" fill="currentColor">A .30 + RRSIG hợp lệ</text></g><g data-step="1" data-until="1"><path d="M320 150 L65 150" stroke="currentColor" fill="none" marker-end="url(#net21-d-a)"/><text x="110" y="173" font-size="14" text-anchor="start" fill="currentColor">A .30 · AD</text></g><g data-step="2"><path d="M575 215 L320 215" stroke="currentColor" fill="none" marker-end="url(#net21-d-a)"/><text x="345" y="204" font-size="13" text-anchor="start" fill="currentColor">A .99 + RRSIG cũ</text></g><g data-step="2"><rect x="245" y="235" width="150" height="35" rx="6" fill="#f43f5e" fill-opacity="0.15" stroke="currentColor"/><text x="320" y="257" font-size="14" text-anchor="middle" fill="currentColor">Chữ ký sai</text></g><g data-step="3"><path d="M320 300 L65 300" stroke="currentColor" fill="none" marker-end="url(#net21-d-a)"/><text x="100" y="291" font-size="13" text-anchor="start" fill="currentColor">Query thường: SERVFAIL</text></g><g data-step="4"><path d="M320 350 L65 350" stroke="currentColor" fill="none" marker-end="url(#net21-d-a)"/><text x="90" y="340" font-size="13" text-anchor="start" fill="currentColor">CD: A .99, không AD</text></g>
</svg>
<step-note data-step="1">Anchor cục bộ cho phép kiểm RRset của secure.test; lab không dựng DS từ root công cộng.</step-note>
<step-note data-step="2">Sửa A mà giữ chữ ký cũ. Restart validator bỏ cache hợp lệ để phép thử thực sự nhìn dữ liệu mới.</step-note>
<step-note data-step="3">Query thường không chấp nhận dữ liệu bogus nên client nhận SERVFAIL.</step-note>
<step-note data-step="4">CD giúp xem dữ liệu lỗi để điều tra; không biến dữ liệu đó thành đã xác thực.</step-note>
</step-flow>

> **Đo trên lab.** `signed valid` có `flags: qr rd ra ad`; `tampered authority` có A `192.0.2.99` cùng RRSIG cũ; `validator rejects tamper` là SERVFAIL; `checking disabled diagnostic` trả dữ liệu với `cd`, không có AD. Các đoạn thuộc cùng `out/lab.txt`. Lab tạo khoá dùng riêng, xoá private key sau chạy, không dùng khoá thật hoặc xuất khoá bí mật vào bài.

**Vì sao phải xoá cache hợp lệ trước phép thử sửa chữ ký?** Nếu còn A hợp lệ đã kiểm, resolver có thể trả nó mà chưa hỏi authoritative vừa bị sửa. Bạn sẽ thấy query thành công và kết luận nhầm DNSSEC không phát hiện sửa dữ liệu. Thí nghiệm cần buộc validator thực sự nhìn dữ liệu bị can thiệp. Đây là cùng nguyên lý điểm quan sát từ bài 20, áp dụng cho bảo mật.

Một SERVFAIL ngoài đời chưa đủ kết luận DNSSEC sai. Có thể authoritative timeout, delegation hỏng hoặc lỗi xử lý khác. So query thường/CD chỉ là một nhánh khoanh vùng; đối chiếu log validator, DNSKEY/DS/RRSIG, thời gian máy và đường tới authoritative. Nếu CD vẫn timeout thì bạn chưa cô lập được validation. Nếu CD trả dữ liệu còn bình thường SERVFAIL, đó là dấu hiệu cần đào sâu kiểm chứng, không phải giấy phép bật CD cho production.

> **Suy luận.** Thay A nhưng giữ chữ ký phá tính toàn vẹn mà validator kiểm; lab chứng minh cơ chế chặn trường hợp cụ thể ấy. **Chưa đo:** hết hạn chữ ký, lệch đồng hồ, DS sai trong parent, rollover khoá, DNSSEC ở hai view, và DNSSEC qua mạng mất UDP/TCP. Muốn kết luận từng ca phải dựng phép thử riêng; không quy mọi SERVFAIL về một lỗi đã thấy.

## 4. Lab

### 4.1 Dựng các góc nhìn và một zone đã ký

Chạy từ thư mục `net-lab/net-21`:

```bash
./run.sh
```

Script dựng `net21-lab`, tạo loopback riêng và không publish port ra ngoài. Endpoint authoritative `127.0.0.4:53` phục vụ `lab.test` phía ngoài; `.5:53` phục vụ bản nội bộ; `.6:53` phục vụ `secure.test` có chữ ký. Unbound trên `127.0.0.1:5353` dùng phía ngoài và validator; port `5354` dùng phía nội bộ. Tên `.test` và các địa chỉ là dữ liệu thử nghiệm, không đổi DNS host.

`lab.py` dựng cấu hình từ đầu, tắt serve-expired/prefetch, không đặt min-TTL dương; mỗi lần chạy tạo chữ ký mới theo đồng hồ container. Thư mục `src/` giữ RFC và docs đã tải, `out/` giữ log. Các lệnh dig phía dưới được thực thi trong container qua script; `127.0.0.1` trên host không trỏ tới resolver trong container. Container được dọn khi xong; không để một open resolver trên Internet.

### 4.2 Cố tình hạ TTL quá muộn

Làm gì: làm ấm A cũ, sửa A/TTL ở authoritative, reload, hỏi trực tiếp authoritative rồi hỏi recursive. Lệnh hỏi recursive là:

```bash
dig @127.0.0.1 -p 5353 api.lab.test. A
```

Ba dòng kết quả quyết định từ `out/lab.txt`, theo thứ tự các đoạn đã đặt nhãn:

```text
api.lab.test.          30 IN A 192.0.2.10
api.lab.test.           5 IN A 192.0.2.20
api.lab.test.          28 IN A 192.0.2.10
```

**Thấy gì:** authoritative đã có IP mới nhưng recursive còn IP cũ với hạn lớn hơn TTL mới. **Vì sao:** hạ TTL không thu hồi câu trả lời đã phát. Script đợi thêm 30 giây rồi hỏi lại; đoạn `old cache expired` có:

```text
api.lab.test.           5 IN A 192.0.2.20
```

Không cần root biết IP mới. Trong lab này resolver dùng stub-zone tới đúng authoritative để cô lập cache; nó không đi lại cây root–TLD như bài 20. Đây cũng không phải phép đo thời gian đồng bộ nhiều secondary: lab chỉ có một authoritative cho mỗi view.

### 4.3 Kiểm góc nhìn trước khi xoá cache

Làm gì: hỏi cùng QNAME/QTYPE tới hai port recursive:

```bash
dig @127.0.0.1 -p 5353 api.lab.test. A
dig @127.0.0.1 -p 5354 api.lab.test. A
```

Output quyết định của `external perspective` và `internal perspective`:

```text
api.lab.test.           5 IN A 192.0.2.20
api.lab.test.          30 IN A 10.20.0.10
```

**Thấy gì:** hai bộ dữ liệu khác nhau ngay cả khi đều đang cập nhật. **Vì sao:** hai resolver được gắn với hai nguồn zone khác nhau. Đổi port ở đây chỉ là cách chọn ngữ cảnh trong lab; vận hành thật thường chọn qua resolver theo mạng, private zone association hoặc forwarding policy. Không suy từ lab rằng chỉ cần chọn port là có security boundary.

### 4.4 Cho CNAME ở apex thất bại ngay lúc kiểm zone

Làm gì: tạo zone có SOA/NS ở `lab.test`, thêm `@ IN CNAME target.test.`, chạy:

```bash
named-checkzone lab.test. /lab/work/bad-zone
```

Các dòng thật, bỏ dòng lỗi lặp cùng nội dung:

```text
dns_master_load: /lab/work/bad-zone:6: lab.test: CNAME and other data
zone lab.test/IN: loading from master file /lab/work/bad-zone failed: CNAME and other data
zone lab.test/IN: not loaded due to errors.
CHECKZONE exit=1
```

**Thấy gì:** trình kiểm zone từ chối trước cả việc phục vụ request web. **Vì sao:** dữ liệu DNS tại cùng owner xung đột. Script giữ zone sai riêng, không nạp nó đè lên zone đang phục vụ; lỗi có chủ đích này không làm phép thử TTL hoặc split view bị nhiễu.

### 4.5 Sửa A nhưng không ký lại: ai sẽ phát hiện?

Làm gì: tạo khoá ECDSA cho zone thử nghiệm, ký bằng `dnssec-signzone`, cấu hình trust anchor cục bộ trong Unbound, hỏi qua validator với DO. Đoạn `signed valid`:

```text
;; flags: qr rd ra ad; QUERY: 1, ANSWER: 2, AUTHORITY: 0, ADDITIONAL: 1
api.secure.test.       30 IN A 192.0.2.30
```

ANSWER thứ hai trong log là RRSIG. Không in nguyên chữ ký dài vì điều cần kiểm ở bước này là AD và A đã xác thực. Script sửa riêng `192.0.2.30` thành `.99` trong zone đã ký, reload authoritative rồi khởi động lại Unbound để bỏ cache hợp lệ cũ. Hỏi thẳng authoritative vẫn nhận dữ liệu:

```text
;; flags: qr aa; QUERY: 1, ANSWER: 2, AUTHORITY: 2, ADDITIONAL: 3
api.secure.test.       30 IN A 192.0.2.99
```

Hỏi qua validator:

```bash
dig @127.0.0.1 -p 5353 api.secure.test. A +dnssec
```

```text
;; ->>HEADER<<- opcode: QUERY, status: SERVFAIL
;; flags: qr rd ra; QUERY: 1, ANSWER: 0, AUTHORITY: 0, ADDITIONAL: 1
```

**Thấy gì:** AA và một record RRSIG ở authoritative không đủ làm dữ liệu bị sửa vượt validator. **Vì sao:** chữ ký cũ không xác thực RRset A mới. Header trích trên bỏ query ID của lần chạy, không đổi status.

### 4.6 Dùng CD để điều tra, giữ nguyên tiêu chuẩn chấp nhận dữ liệu

Làm gì: hỏi cùng validator với `+dnssec +cdflag`. Đoạn thật:

```text
;; flags: qr rd ra cd; QUERY: 1, ANSWER: 2, AUTHORITY: 0, ADDITIONAL: 1
api.secure.test.       60 IN A 192.0.2.99
```

**Thấy gì:** dữ liệu bị sửa xuất hiện để đối chiếu nhưng không có AD. **Vì sao:** phép hỏi đã yêu cầu không loại câu trả lời chỉ vì lỗi checking. Giá trị TTL **60** là output của nhánh dữ liệu bogus/CD trong Unbound của lần chạy, không phải TTL 30 từ authoritative được biến thành dữ liệu hợp lệ. Không dùng output với CD để tính thời gian cutover của cached answer đã xác thực; cơ chế xử lý dữ liệu bogus có cấu hình riêng trong [unbound.conf](https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html).

Đây là bản sai thứ hai cần phá: “nếu thêm CD thì chạy, giữ CD là sửa xong”. CD chỉ giúp nhìn vật liệu gây lỗi. Sửa đúng phải khôi phục RRset/chữ ký/chuỗi tin cậy hợp lệ rồi kiểm lại qua validator bình thường. Script cố ý kết thúc ở trạng thái lỗi đã chứng minh, dọn container và private key; không triển khai cấu hình bỏ validation ra một dịch vụ thật.

## 5. Tính tay

Các mốc dưới đây là **giả định của bài toán**; dùng quy tắc TTL thường, không serve-stale, không cache app vượt hạn, authoritative đã đồng bộ khi nói “hạ TTL xong”. Phép tính không tạo ra cận trên cho mọi client thật.

### 5.1 Hạ trước bao lâu mới có ý nghĩa?

A cũ có TTL **1800 s**, muốn hạ xuống **60 s** rồi cutover lúc **10:00**. Lúc muộn nhất hoàn thành hạ TTL ở mọi authoritative là khi nào nếu chỉ xét cận cache DNS? Nếu đợi đến **09:50** mới hạ thì một resolver vừa nhận TTL cũ trước đó còn có thể giữ tới mấy giờ?

**Giải:** `1800/60=30 phút`, nên phải hoàn thành chậm nhất **09:30** theo mô hình. Nếu một resolver nhận TTL 1800 sát 09:50, nó có thể giữ tới sát **10:20**, vượt cutover khoảng **20 phút**. TTL 60 sau lần hạ chỉ áp dụng các câu trả lời mới. Trong thực tế thêm biên cho việc triển khai/kiểm authoritative và không coi một mốc sát bằng là khoảng an toàn đã đo.

### 5.2 Cận DNS và cận pool không phải cùng đồng hồ

Giả sử TTL cũ còn tối đa **60 s** sau cutover, và một client có thể mở connection tới IP cũ ngay trước khi cache cũ hết hạn. Connection đó được ứng dụng cho tồn tại tối đa **300 s** từ lúc mở; không mở thêm connection cũ sau khi nhận DNS mới, không stale cache. Giữ server cũ **300 s tính từ cutover** đã bao phủ trường hợp xấu nhất chưa?

**Giải:** chưa. Connection cũ có thể được mở sát `t=60`, sống thêm 300 giây, tới sát `t=360`. Cận theo giả định là `60+300=360 s=6 phút`, không phải `max(60,300)=300 s`. Nguyên nhân là thời điểm bắt đầu đồng hồ pool có thể nằm **sau** cutover tới gần hết cửa sổ DNS. Nếu ứng dụng có hạn tuyệt đối cho mọi connection tính từ cutover thì mô hình khác; phải nêu đúng luật trước khi tính.

### 5.3 Trường hợp nào chữ ký giúp phát hiện?

Có ba thay đổi giả định: A bị sửa trên đường nhưng RRSIG giữ nguyên; chủ zone có khoá hợp lệ chủ động ký A mới trỏ sai backend; đối thủ làm mất mọi packet DNS. Validator có anchor/đồng hồ đúng và thuật toán được hỗ trợ. Trường hợp nào DNSSEC có thể xác định là dữ liệu chữ ký không hợp lệ, trường hợp nào cần kiểm ngoài DNSSEC?

**Giải:** A bị sửa mà RRSIG giữ nguyên không kiểm được chữ ký, như lab; đây là lỗi tính toàn vẹn. A được chủ khoá ký đúng có thể vẫn xác thực được dù cấu hình nghiệp vụ sai; cần kiểm change management, endpoint và TLS/app. Không nhận packet thì không có dữ liệu để xác thực; cần kiểm khả dụng/đường truyền. Không gộp “không có câu trả lời” với “có dữ liệu và đã chứng minh chữ ký sai”.

## 6. Chuyển giao

1. Hạ TTL đã đủ thời gian nhưng chỉ một nhóm client vẫn vào IP cũ. Bạn thiết kế log để tách cache app, resolver serve-stale và socket pool thế nào, không restart tất cả cùng lúc?
2. Một dịch vụ tên đích dùng cho apex thay đổi địa chỉ theo vùng. Bạn cần tài liệu và query nào để quyết định cơ chế Alias của nhà cung cấp phù hợp hơn A tĩnh, đồng thời kiểm được cả IPv6?
3. Laptop bật VPN dùng được tên private; một runtime container trên chính laptop vẫn nhận IP public. Hãy lập chuỗi kiểm resolver thực tế và forwarding, không chỉ kiểm file cấu hình VPN.
4. Private zone có một tên nội bộ nhưng làm một tên public cùng suffix thành NXDOMAIN. Bạn sẽ kiểm chính sách authority/fallback và negative cache ra sao trước khi thêm record chữa cháy?
5. Sau thay khoá, query thường SERVFAIL nhưng CD trả đủ A/RRSIG. Hãy nêu bộ bằng chứng cần để phân biệt DS ở parent còn cũ, DNSKEY mới thiếu và chữ ký hết hạn; vì sao chỉ nhìn A đúng là chưa đủ?
6. **Câu khó nhất, không có đáp án trong bài.** Thiết kế kế hoạch chuyển authoritative provider cho một zone có DNSSEC, split-horizon, apex Alias và client giữ connection tới hai region. Bạn phải đổi NS, glue nếu có, DS/khoá và dữ liệu theo thứ tự nào, giữ các trạng thái cũ bao lâu, đo ở những resolver/view nào, và đặt điều kiện rollback nào để không biến một lỗi cấu hình thành bogus trên diện rộng? Nêu cả một trường hợp DNS query đã xanh nhưng tắt backend cũ vẫn gây gián đoạn.

## 7. Tóm tắt

- TTL mới không sửa hạn của dữ liệu đã được cache; lab thấy authoritative TTL 5 trong lúc recursive còn A cũ TTL 28.
- Hạ TTL trước, chờ hạn dữ liệu cũ đã phát rồi cutover; kiểm mọi authoritative để xác lập mốc bắt đầu chờ.
- Hết TTL không tự đóng connection đã mở; cận chuyển đổi cần cả chính sách resolver và vòng đời pool/session.
- Apex cần SOA/NS nên không chứa CNAME thông thường; kiểm BIND trong lab báo `CNAME and other data`, exit 1.
- Hai view có thể cố ý trả hai IP hiện hành khác nhau; lab trả `192.0.2.20` và `10.20.0.10` cho cùng tên.
- DNSSEC xác thực nguồn gốc/tính toàn vẹn dữ liệu theo trust anchor; không mã hoá DNS và không chứng minh backend đúng nghiệp vụ.
- DO xin record DNSSEC, AD báo xác thực theo resolver, CD hỗ trợ xem dữ liệu khi checking thất bại; thêm CD không sửa chữ ký.
- Lab giữ RRSIG cũ rồi sửa A làm validator trả SERVFAIL; phép hỏi thẳng authoritative vẫn có dữ liệu, nên AA không thay validation.

→ **Bài 22 — HTTP/1.1 → 2 → 3: head-of-line ở tầng nào**: đã tìm đúng địa chỉ và biết giới hạn của DNS, ta theo các request đồng thời để đo chỗ một luồng chặn luồng khác.
