# Bài 11 — BGP: các mạng thông báo đường cho nhau

## 1. Mục tiêu

Sau bài này bạn có thể:

- Đọc một UPDATE để tách prefix được quảng bá, thuộc tính đường đi và thông tin rút route.
- Lần theo AS_PATH từ AS khởi phát qua các hàng xóm eBGP, xác định origin và next hop ở từng router.
- Giải thích vì sao một đường có ba ASN thắng đường có một ASN khi policy ưu tiên nó.
- Áp dụng thứ tự chọn đường của FRRouting trong phạm vi cấu hình đã nêu, thay vì thuộc một danh sách chung cho mọi router.
- Kiểm riêng phiên BGP, route nhận được, best path và route được cài trong Linux.
- Dựng lại lab bốn AS, đổi policy, rút prefix và phân biệt “phiên còn lên” với “đích còn đường tới”.

## 2. Triệu chứng

Bạn có hai đường tới `203.0.113.0/24` trên router r1, AS65001. Một đường nhận trực tiếp từ AS65004, AS_PATH chỉ có `65004`. Đường kia nhận qua r2 và r3, AS_PATH là `65002 65003 65004`. Ban đầu r1 chọn đường trực tiếp, log ghi `best (AS Path)`.

Bạn đặt một policy nhận route từ r2. Không thay cáp, không thay prefix, không kéo dài AS_PATH. Sau đó r1 chọn đường có ba ASN, log chuyển sang `best (Local Pref)`, còn bảng route Linux trỏ `via 10.111.12.2`.

Bản giải thích đầu tiên thường là: “BGP đã chọn nhầm, phải chọn đường ít AS nhất.” Nếu tự động hoá bằng niềm tin ấy, bạn sẽ liên tục sửa ngược quyết định mà chính cấu hình vừa yêu cầu router thực hiện.

> **Đo trên lab.** FRRouting `10.2.1_git`, Linux `6.8.0-64-generic` aarch64 trong colima; bốn container AS65001–AS65004, các network Docker có `--internal`. Hai trạng thái nằm ở `out/r1-before.txt` và `out/policy.txt`, route Linux ở `out/kernel-policy.txt`. Đo lại: trong bộ lab `net-lab/net-11`, chạy `./run.sh`.

## ⏸ Dừng lại — đoán trước #1

Vì sao đường ba ASN có thể thắng đường một ASN?

- (a) BGP cộng độ trễ từng hop và thấy đường ba ASN có RTT nhỏ hơn.
- (b) LOCAL_PREF đặt tại mạng nhận được so trước độ dài AS_PATH.
- (c) ASN 65002 nhỏ hơn 65004 nên tự động có quyền ưu tiên cao hơn.
- (d) Router luôn chọn UPDATE đến sau cùng để thông tin mới hơn.

## 3. Cơ chế

### 3.1 Hàng xóm trao đổi thông tin đường đi, không xin đường cho từng request

Đáp án là **(b)**. Để thấy một con số policy đi vào quyết định ra sao, trước hết cần biết BGP trao đổi cái gì và lưu ở đâu.

Bài [10](net-10-as-asn.md) đã xác định **AS** là miền chính sách và **ASN** là số nhận diện miền đó. **BGP — Border Gateway Protocol — là giao thức trao đổi thông tin khả năng tới các prefix giữa các hệ thống định tuyến.** **BGP speaker** là hệ thống chạy BGP; **peer** là hàng xóm mà nó thiết lập phiên BGP để trao đổi thông tin. **eBGP** là phiên giữa speaker thuộc các AS khác nhau; **iBGP** là phiên giữa speaker trong cùng AS.

Lab có một router mỗi AS, chỉ dùng eBGP. Điều này cố ý bỏ bài toán phân phối thông tin bên trong một AS; không được suy rằng mạng thật cũng chỉ cần một router hay không cần iBGP.

BGP dùng TCP và lắng nghe ở cổng 179 theo RFC 4271 §1. Sau khi kết nối TCP được tạo, hai bên trao đổi **OPEN**, tức thông điệp mở phiên BGP và thông số của speaker; **KEEPALIVE** xác nhận/duy trì phiên theo bộ định thời đã thương lượng. Khi phiên đi tới trạng thái **Established**, hai bên mới có thể trao đổi thông tin route bằng **UPDATE**. **NOTIFICATION** là thông điệp báo lỗi khiến phiên BGP đóng theo cơ chế của giao thức. Đây là trạng thái BGP, không phải tên các TCP state trong bài [eng-03](../engineering/eng-03-tcp-tls.md).

> **Nguồn.** RFC 4271 §1: *“BGP uses TCP [RFC793] as its transport protocol.”* ([RFC 4271](https://www.rfc-editor.org/rfc/rfc4271#section-1)). Các thông điệp và xử lý phiên ở §4 và §8; bản tải `src/rfc4271.txt`.

Khi phiên bắt đầu, speaker gửi phần bảng route được policy cho phép xuất. Sau đó thông tin thay đổi được gửi tăng dần: thêm, thay thuộc tính, rút route. Không có bước “HTTP request tới thì hỏi lại mọi AS xem đi đường nào”. Quyết định điều khiển đã tạo ra bảng để chuyển tiếp từng gói dữ liệu.

**Control plane** là phần trao đổi và lựa chọn thông tin đường đi; **data plane** là phần dùng bảng chuyển tiếp để xử lý gói dữ liệu. BGP nằm ở control plane. Vì hai phần có trạng thái riêng, phiên BGP lên không bảo đảm đã có route, và có route cũng không bảo đảm ứng dụng phía sau đang phục vụ. Lab sẽ tạo trực tiếp tình huống phiên còn lên nhưng prefix biến mất.

### 3.2 UPDATE có hai công việc trong cùng một khung

**UPDATE** là thông điệp BGP dùng để quảng bá route khả thi hoặc rút route đã thông báo. Trong BGP cơ sở cho IPv4 unicast, nó chứa vùng **Withdrawn Routes** cho các prefix bị rút, vùng **Path Attributes** cho thuộc tính dùng chung và vùng **NLRI — Network Layer Reachability Information —** mô tả các prefix được quảng bá.

Nhóm prefix được quảng bá trong một UPDATE dùng chung tập thuộc tính của thông điệp đó. Vì vậy không nên hình dung mỗi UPDATE luôn là một prefix, cũng không nghĩ UPDATE chỉ có thêm route mà không có xoá. Khi một peer rút một prefix, nó rút đường mà chính peer ấy đã quảng bá; router nhận còn phải xem các peer khác có đường thay thế hay không.

**AS_PATH** là thuộc tính ghi đường AS của thông tin quảng bá; **NEXT_HOP** là địa chỉ IP mà router nhận phải giải được đường tới để sử dụng route. **ORIGIN** là mã mô tả kiểu hình thành thông tin route, gồm IGP, EGP và Incomplete trong BGP cơ sở. **IGP — interior gateway protocol — là giao thức định tuyến dùng trong một AS; EGP trong mã ORIGIN là giao thức Exterior Gateway Protocol lịch sử**, không phải cách gọi chung mọi giao thức định tuyến liên AS. `Origin IGP` trong output lab là mã thuộc tính, không chứng minh r4 học prefix bằng OSPF hay một giao thức nội bộ nào khác. Ta đã dùng lệnh `network` để khởi phát prefix tại r4.

Ở r1, đường trực tiếp có NEXT_HOP `10.111.14.4`, AS_PATH `65004`, ORIGIN hiển thị `IGP`. Đường vòng có NEXT_HOP `10.111.12.2`, AS_PATH `65002 65003 65004`. NEXT_HOP là IP hàng xóm cần đi tới trong topology này; AS cuối đường là origin. Chúng ở hai đầu khác nhau của câu hỏi “gửi tới ai tiếp theo” và “ai khởi phát prefix”.

Hình sau là **cấu trúc theo RFC**, không phải bản giải mã byte từ pcap của lab. Các phần có độ dài cố định được vẽ theo độ dài tương đối; phần biến đổi dùng dấu lượn để tránh giả một kích thước đã đo.

<svg font-family="ui-sans-serif, system-ui, sans-serif" viewBox="0 0 520 300" role="img" aria-labelledby="net11-a-t net11-a-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net11-a-t">Bố cục UPDATE IPv4 cơ sở</title>
<desc id="net11-a-d">Header BGP 19 octet có ba trường Marker 16, Length 2, Type 1. Thân UPDATE có độ dài withdrawn 2 octet, các prefix bị rút, độ dài attributes 2 octet, attributes dùng chung, rồi NLRI. Thân biến đổi không được vẽ theo tỉ lệ byte.</desc>
<g stroke="currentColor"><rect x="22" y="34" width="400" height="46" fill="#3b82f6" fill-opacity="0.13"/><rect x="422" y="34" width="50" height="46" fill="#10b981" fill-opacity="0.13"/><rect x="472" y="34" width="25" height="46" fill="#f59e0b" fill-opacity="0.13"/></g>
<g fill="currentColor" font-size="14" text-anchor="middle"><text x="260" y="20">Header: 19 octet</text><text x="222" y="63">Marker: 16</text><text x="447" y="63">2</text><text x="484" y="63">1</text></g>
<g fill="none" stroke="currentColor"><path d="M446 80 V96 H382"/><path d="M484 80 V112 H382"/><path d="M260 120 V142"/></g>
<g fill="currentColor" font-size="13"><text x="286" y="100">Length</text><text x="270" y="118">Type = UPDATE</text></g>
<rect x="22" y="145" width="475" height="53" fill="#f59e0b" fill-opacity="0.13" stroke="currentColor"/>
<rect x="22" y="209" width="475" height="53" fill="#10b981" fill-opacity="0.13" stroke="currentColor"/>
<g fill="currentColor" font-size="14" text-anchor="middle"><text x="260" y="167">Withdrawn length (2) + prefix bị rút ~</text><text x="260" y="188">Attribute length (2) + tập attributes ~</text><text x="260" y="232">NLRI: prefix được quảng bá ~</text><text x="260" y="252">dùng chung AS_PATH, NEXT_HOP, ORIGIN</text><text x="260" y="287" font-size="13">~ = độ dài thay đổi; không phải byte đã đo trên dây</text></g>
</svg>

Theo RFC 4271 §4.1 và §4.3, header chung có 19 octet; hai trường độ dài trong thân UPDATE mỗi trường hai octet. Một NLRI IPv4 `/24` dùng một octet độ dài prefix cộng ba octet phần địa chỉ có nghĩa. Bài tính tay sẽ dùng đúng cấu trúc này; chưa tính TCP/IP/Ethernet hoặc thuộc tính khác. Các mở rộng mang họ địa chỉ khác không bắt buộc đặt NLRI ở đúng chỗ như sơ đồ IPv4 cơ sở này.

Trong lab, `debug bgp updates in` trên r1 ghi được UPDATE có `nexthop 10.111.14.4, origin i, metric 0, path 65004`. Đây là log sau khi parser FRR đọc thông điệp; nó chứng minh những thuộc tính FRR nhận và in ra. Nó không cung cấp kích thước gói trên dây hay cách TCP chia các thông điệp vào segment.

### 3.3 AS_PATH lớn lên ngược chiều gói dữ liệu sẽ đi

**AS_SEQUENCE** là đoạn có thứ tự trong AS_PATH, ghi chuỗi AS mà thông tin route đã đi qua. Với lab không aggregation, không confederation, không thay AS và không prepend thủ công, khi speaker gửi route tới peer eBGP, nó thêm ASN của mình vào **đầu** AS_SEQUENCE. Quy tắc này nằm ở RFC 4271 §5.1.2.

Tại nơi khởi phát r4, route có đường AS cục bộ rỗng, output ghi `Local`. Khi r4 quảng bá cho r3, r3 nhận `[65004]`. r3 quảng bá cho r2 thì r2 nhận `[65003, 65004]`. r2 quảng bá cho r1 thì r1 nhận `[65002, 65003, 65004]`. Phần tử đầu gần người nhận hơn; phần tử cuối trong AS_SEQUENCE đơn giản này là origin.

Mũi tên quảng bá đi **r4 → r3 → r2 → r1**, trong khi gói dữ liệu sử dụng đường ấy sẽ đi **r1 → r2 → r3 → r4**. Chỉ nhìn mũi tên trên một hình mà không biết loại lưu lượng đang vẽ là cách đọc ngược topology.

<step-flow>
<svg font-family="ui-sans-serif, system-ui, sans-serif" viewBox="0 0 640 340" role="img" aria-labelledby="net11-b-t net11-b-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="net11-b-t">Prefix lan từ r4 và AS_PATH dài dần</title>
<desc id="net11-b-d">Bốn router cố định thành hình chữ nhật: r1 trái trên, r2 phải trên, r3 phải dưới, r4 trái dưới. Quảng bá đi r4 tới r3 tới r2 tới r1 và có nhánh trực tiếp r4 tới r1. Nhãn là AS_PATH tại router nhận.</desc>
<defs><marker id="net11-b-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="currentColor"/></marker></defs>
<g fill="none" stroke="currentColor" opacity="0.25" stroke-width="2"><path d="M255 82 H385 M480 112 V212 M385 242 H255 M160 212 V112"/></g>
<g fill="#3b82f6" fill-opacity="0.13" stroke="currentColor"><rect x="65" y="52" width="190" height="60" rx="10"/><rect x="385" y="52" width="190" height="60" rx="10"/><rect x="385" y="212" width="190" height="60" rx="10"/><rect x="65" y="212" width="190" height="60" rx="10"/></g>
<g fill="currentColor" font-size="15" text-anchor="middle"><text x="160" y="77">r1 · AS65001</text><text x="480" y="77">r2 · AS65002</text><text x="480" y="237">r3 · AS65003</text><text x="160" y="237">r4 · AS65004</text><text x="160" y="260">203.0.113.0/24</text></g>
<g data-step="1"><path d="M255 243 H382" stroke="currentColor" stroke-width="3" marker-end="url(#net11-b-arrow)"/><text x="480" y="260" fill="currentColor" text-anchor="middle" font-size="14">65004</text><text x="320" y="290" fill="currentColor" text-anchor="middle" font-size="13">r3 nhận đường tới origin 65004</text></g>
<g data-step="2"><path d="M480 210 V115" stroke="currentColor" stroke-width="3" marker-end="url(#net11-b-arrow)"/><text x="480" y="100" fill="currentColor" text-anchor="middle" font-size="14">65003 65004</text></g>
<g data-step="3"><path d="M383 82 H258" stroke="currentColor" stroke-width="3" marker-end="url(#net11-b-arrow)"/><text x="160" y="100" fill="currentColor" text-anchor="middle" font-size="14">65002 65003 65004</text><text x="320" y="35" fill="currentColor" text-anchor="middle" font-size="14">Quảng bá: ngược chiều gói tới đích</text></g>
<g data-step="4"><path d="M160 210 V115" stroke="currentColor" stroke-width="3" marker-end="url(#net11-b-arrow)"/><text x="168" y="157" fill="currentColor" font-size="14">Nhánh trực tiếp: 65004</text><text x="168" y="179" fill="currentColor" font-size="13">r1 có hai ứng viên cùng prefix</text></g>
</svg>
<step-note data-step="1">r4 khởi phát prefix và thêm AS65004 khi gửi sang eBGP. Chuỗi tại r3 chỉ có origin.</step-note>
<step-note data-step="2">r3 thêm số của mình ở đầu, nên origin vẫn ở cuối. Đây không phải phép đếm router trong mạng nội bộ.</step-note>
<step-note data-step="3">r2 thêm AS65002 rồi gửi cho r1. r1 biết đường qua ba AS mà không nhận danh sách từng router bên trong chúng.</step-note>
<step-note data-step="4">Liên kết r4–r1 cung cấp thêm ứng viên có cùng đích. Các bước chỉ lần theo quan hệ nhân quả; lab không khẳng định hai nhánh đến theo thứ tự bấm trên hình.</step-note>
</step-flow>

**Đo trên lab:** `out/r4-before.txt`, `out/r3-before.txt`, `out/r2-before.txt` và `out/r1-before.txt` ghi lần lượt các đường trên. Không suy rằng từng lần thêm ASN tốn một khoảng thời gian cố định: log này ghi trạng thái route, chưa đo thời gian lan truyền.

Để hai ứng viên cùng tới r1, lab chặn toàn bộ export từ r1 sang r2 bằng `route-map BLOCK deny 10`. Nếu bỏ chặn, r2 có thể chọn đường ngắn nhận từ r1, thay vì đường qua r3, rồi không còn quảng bá đường vòng như thí nghiệm cần. Đây là một policy dựng tình huống, không phải quy tắc mặc định rằng r1 không được gửi route cho r2.

AS_PATH còn hỗ trợ kiểm vòng lặp: ở hoạt động thông thường, router thấy ASN của mình trong đường nhận được thì loại đường ấy theo xử lý vòng AS. Nó nhận ra “thông tin này đã qua AS của tôi”, không cần biết mọi router nội bộ. Nhưng danh sách không phải chứng thư số: bên gửi có thể khai sai, policy có thể cho phép ngoại lệ; cũng không ngăn được mọi vòng chuyển tiếp do những thành phần ngoài BGP. Phần cơ chế theo RFC đã biết; bài này chưa dựng riêng một phép đo drop do vòng AS.

## ⏸ Dừng lại — đoán trước #2

Bạn thấy r1 có hai đường hợp lệ tới cùng `/24`; đường qua r2 được đặt LOCAL_PREF 200. Chọn câu đúng trước khi xem lab:

- (a) Con số 200 sẽ đi nguyên sang mọi AS khác để họ ưu tiên chiều về cho bạn.
- (b) 200 là RTT mục tiêu nên đường nào vượt 200 ms sẽ bị rút.
- (c) Nó tác động lựa chọn bên trong AS nhận; không tự bắt mạng bên ngoài chọn đường chiều về.
- (d) Nó thay đổi prefix `/24` thành `/200`.

### 3.4 Policy so trước độ dài đường, không cộng điểm tất cả thuộc tính

Đáp án là **(c)**. **LOCAL_PREF — local preference — là thuộc tính dùng để biểu thị mức ưu tiên đường trong một AS; giá trị lớn hơn được ưu tiên.** Theo RFC 4271 §5.1.5, nó được dùng giữa các speaker nội bộ; speaker không gửi thuộc tính này tới external peer thông thường, trừ phạm vi ngoại lệ confederation của RFC. Lab không có confederation.

**Weight** là giá trị ưu tiên cục bộ trên router trong FRR; nó không phải thuộc tính BGP chuẩn gửi tới peer. **MED — multi-exit discriminator — là thuộc tính gợi ý mức ưu tiên giữa các điểm vào một AS, ưu tiên giá trị thấp hơn khi các đường đủ điều kiện so sánh.** MED không phải tổng độ trễ đường đi, cũng không được mặc định so giữa mọi AS hàng xóm.

FRR không cộng weight, LOCAL_PREF, số ASN và MED thành một điểm chung. Nó so theo thứ tự, dừng ở tiêu chí phân biệt được. Vì vậy tăng LOCAL_PREF có thể quyết định xong trước khi AS_PATH được xét. Một con số MED nhỏ hơn không “bù lại” LOCAL_PREF thấp hơn.

**Next-hop reachability** là khả năng giải được đường tới địa chỉ NEXT_HOP. Trước khi tranh best path, route cần hợp lệ, không bị policy loại và có next hop sử dụng được. Một route bị loại không được cứu bằng AS_PATH ngắn; việc kiểm hợp lệ không nên bị bỏ ra khỏi mô hình chọn đường.

> **Nguồn.** Tài liệu [FRR stable-10.2, Route Selection](https://docs.frrouting.org/en/stable-10.2/bgp.html#route-selection) nói so từ đầu danh sách tới khi có yếu tố quyết định; phần LOCAL_PREF ghi *“Prefer higher local preference routes to lower.”* Bản tải `src/frr-bgp.txt`. Đây là thứ tự của FRR được dùng làm nguồn cho lab, không phải lời tuyên bố mọi hãng đều có cùng tie-breaker.

Sau lời giải thích đó, bảng sau giúp đọc output tới đúng tiêu chí. Phạm vi: các đường đang xét cùng prefix, đã đủ điều kiện sử dụng, cấu hình không đổi thứ tự bằng các tuỳ chọn bestpath. Lab không bật AIGP hay multipath; **AIGP** là thuộc tính mang metric tích luỹ theo cơ chế mở rộng, không phải dữ liệu RTT mà lab đã đo.

| Thứ tự trong docs FRR 10.2 | Tiêu chí | Điều kiện / hướng chọn |
|---|---|---|
| 1 | Weight | Giá trị cục bộ lớn hơn |
| 2 | LOCAL_PREF | Lớn hơn |
| 3 | Route khởi phát cục bộ | Ưu tiên static/aggregate/redistributed cục bộ theo docs; AIGP có nhánh xét khi bật và có đủ thuộc tính |
| 4 | AS_PATH length | Ngắn hơn; chỉ là đếm theo quy tắc thuộc tính, không phải đo RTT |
| 5 | ORIGIN | IGP trước EGP trước Incomplete |
| 6 | MED | Thấp hơn, mặc định so các đường từ cùng AS theo docs |
| 7 | Loại peer | eBGP được ưu tiên hơn đường từ loại peer khác |
| 8 | Chi phí IGP tới next hop | Thấp hơn; đây là cost nội bộ, không phải RTT end-to-end |
| 9 | Multipath | Nếu bật, xét các ứng viên còn ngang nhau có thể cùng sử dụng không |
| 10 | Đường external đã được chọn | Giữ đường eBGP đang chọn nếu áp dụng; có tuỳ chọn bỏ qua kiểm này |
| 11 | Router ID | Thấp hơn; route reflection có quy tắc ORIGINATOR_ID |
| 12 | Cluster list | Danh sách ngắn hơn khi có route reflection |
| 13 | Địa chỉ peer | Docs bản này ghi địa chỉ transport lớn hơn làm tie-breaker cuối |

**Router ID** là mã nhận diện speaker, không đồng nghĩa IP next hop. **Route reflection** là cơ chế phân phối route iBGP qua router phản xạ; **ORIGINATOR_ID** và **cluster list** giúp theo dõi nguồn và đường phản xạ để tránh vòng trong cơ chế đó. [RFC 4456 §4](https://www.rfc-editor.org/rfc/rfc4456#section-4) mô tả hai thuộc tính này. Chúng xuất hiện ở cuối bảng để bạn biết chỗ phải mở docs khi hai đường còn bằng nhau, không phải phần được dựng trong lab eBGP này.

Ở r1, cả hai đường là external, không khởi phát cục bộ, không có weight tuỳ biến. Ban đầu output xác nhận AS_PATH là tiêu chí quyết định. Sau khi gắn policy vào đường nhận từ r2, output xác nhận LOCAL_PREF quyết định. Ta không cần suy đoán tie-breaker ở cuối bảng cho hai trạng thái mà router đã báo lý do ở đầu.

> **Suy luận.** Từ thứ tự và số đo: AS_PATH ba phần tử thắng một phần tử không chứng minh đường ba AS có RTT thấp hơn. BGP lab không có phép đo RTT đầu vào. Muốn kiểm sự tương quan, phải đo data plane riêng; không đọc LOCAL_PREF 200 thành mili giây. Cũng không dùng thay đổi này để bảo đảm đường từ đích quay về: AS bên kia chạy policy của họ.

### 3.5 Route nhận được, best path và bảng Linux là các bước riêng

**RIB — routing information base — là tập thông tin đường đi mà hệ thống định tuyến lưu để lựa chọn route.** Trong mô hình RFC 4271, **Adj-RIB-In** là thông tin route học từ peer, **Loc-RIB** là những route được chọn theo policy cục bộ, **Adj-RIB-Out** là thông tin chọn để thông báo cho peer. Đây là mô hình xử lý; không ép mọi implementation phải có ba bản sao vật lý tách biệt trong RAM.

**FIB — forwarding information base — là bảng phục vụ chuyển tiếp gói.** Trong lab, bgpd chọn đường, **zebra** là thành phần FRR phối hợp route với hệ thống ([docs zebra 10.2](https://docs.frrouting.org/en/stable-10.2/zebra.html)), rồi Linux có route để forwarding. Đánh dấu `best` trong BGP là một bằng chứng; `ip route` có next hop tương ứng là bằng chứng khác. Nếu hệ thống còn route từ nguồn khác hoặc next hop không cài được, phải kiểm tiếp bước cài route, không nhìn mỗi best rồi kết luận gói chắc chắn được chuyển đúng.

<svg font-family="ui-sans-serif, system-ui, sans-serif" viewBox="0 0 520 260" role="img" aria-labelledby="net11-c-t net11-c-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net11-c-t">Hai ứng viên thu về một đường trong kernel của lab</title>
<desc id="net11-c-d">Hai đường BGP đi vào lựa chọn. Sau policy, best qua 10.111.12.2 được cài sang Linux. Mũi tên thu hẹp hai ứng viên thành một route thể hiện hai bước kiểm khác nhau.</desc>
<defs><marker id="net11-c-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="currentColor"/></marker></defs>
<g fill="#3b82f6" fill-opacity="0.13" stroke="currentColor"><rect x="16" y="30" width="205" height="60" rx="8"/><rect x="16" y="126" width="205" height="60" rx="8"/></g>
<g fill="currentColor" font-size="14" text-anchor="middle"><text x="118" y="55">65004</text><text x="118" y="77">qua 10.111.14.4</text><text x="118" y="151">65002 65003 65004</text><text x="118" y="173">qua 10.111.12.2 · LP 200</text></g>
<g fill="none" stroke="currentColor" marker-end="url(#net11-c-arrow)"><path d="M221 60 L281 104" opacity="0.35"/><path d="M221 156 L281 111" stroke-width="3"/></g>
<rect x="285" y="78" width="220" height="80" rx="8" fill="#10b981" fill-opacity="0.13" stroke="currentColor"/>
<g fill="currentColor" font-size="14" text-anchor="middle"><text x="395" y="103">Linux: 203.0.113.0/24</text><text x="395" y="126">via 10.111.12.2</text><text x="395" y="148">proto bgp · metric 20</text><text x="260" y="216">show bgp: kiểm quyết định</text><text x="260" y="241">ip route: kiểm kết quả cài vào kernel</text></g>
</svg>

**Đo trên lab:** `out/kernel-policy.txt` ghi `proto bgp metric 20`. Giá trị 20 là metric của route Linux hiển thị trong lần chạy; nó không phải LOCAL_PREF 200 bị chia mười, không phải ba ASN cộng trọng số, không phải RTT. Bài này không thay metric Linux để kiểm cạnh tranh giữa nhiều giao thức.

## ⏸ Dừng lại — đoán trước #3

r4 thực hiện `no network 203.0.113.0/24`, không tắt các phiên BGP. Sau khi mọi đường tới prefix đã bị rút, r1 sẽ thế nào?

- (a) BGP bắt buộc chuyển tất cả peer về Idle.
- (b) Peer có thể vẫn Established nhưng prefix không còn trong bảng.
- (c) KEEPALIVE khôi phục prefix vì router còn sống.
- (d) Giữ vĩnh viễn best cũ vì không mất TCP.

### 3.6 Rút route khác với làm phiên chết

Đáp án là **(b)**. **Withdrawal** là thông tin rút một route mà peer đã quảng bá; nó không yêu cầu đóng phiên. r4 có thể rút prefix khi thay cấu hình, thay policy hoặc mất điều kiện khởi phát trong khi hàng xóm và TCP vẫn hoạt động.

Trong thí nghiệm, r4 rút cùng prefix ở cả hai hướng. r1 có đường trực tiếp từ r4 và đường qua r2. Khi một đường rút, router phải bỏ ứng viên tương ứng và xét phần còn lại; khi mọi ứng viên đã mất, không còn route BGP cho prefix. KEEPALIVE chỉ chứng minh trao đổi duy trì phiên, không chứa một lời quảng bá lại prefix bị rút.

Hình gộp hai thay đổi đã đo: policy đổi best và withdrawal xoá ứng viên. Nhánh trực tiếp bị rút trước theo thứ tự dòng log ở r1; hình không gán thời gian hội tụ và không khẳng định đã đọc được một snapshot CLI tại trạng thái trung gian.

<step-flow>
<svg font-family="ui-sans-serif, system-ui, sans-serif" viewBox="0 0 520 320" role="img" aria-labelledby="net11-d-t net11-d-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net11-d-t">Ứng viên và best thay đổi, các phiên vẫn lên</title>
<desc id="net11-d-d">Hai hàng cố định cho đường trực tiếp và đường vòng. Ban đầu best là đường trực tiếp; policy chuyển best sang đường vòng. Sau hai withdrawal, hai giá trị biến mất và bảng không còn prefix. Nhãn phiên Established giữ nguyên.</desc>
<rect x="12" y="34" width="496" height="202" rx="8" fill="none" stroke="currentColor"/>
<path d="M12 87 H508 M12 160 H508" stroke="currentColor"/>
<g fill="currentColor" font-size="14"><text x="28" y="65">r1 · prefix 203.0.113.0/24</text><text x="28" y="115">r4 / trực tiếp</text><text x="28" y="188">r2 / qua r3</text></g>
<g data-step="1" data-until="2"><text x="230" y="115" fill="currentColor" font-size="14">65004</text></g>
<g data-step="1" data-until="3"><text x="230" y="188" fill="currentColor" font-size="14">65002 65003 65004</text></g>
<g data-step="1" data-until="1"><rect x="20" y="93" width="480" height="59" rx="6" fill="#10b981" fill-opacity="0.13"/><text x="230" y="142" fill="currentColor" font-size="14">BEST · AS Path</text><text x="260" y="263" text-anchor="middle" fill="currentColor" font-size="14">2 ứng viên · chọn đường trực tiếp</text></g>
<g data-step="2" data-until="3"><rect x="20" y="166" width="480" height="59" rx="6" fill="#10b981" fill-opacity="0.13"/><text x="230" y="215" fill="currentColor" font-size="14">BEST · Local Pref 200</text></g>
<g data-step="2" data-until="2"><text x="260" y="263" text-anchor="middle" fill="currentColor" font-size="14">2 ứng viên · policy đổi best</text></g>
<g data-step="3" data-until="3"><text x="230" y="115" fill="currentColor" font-size="14">đã rút từ r4</text><text x="260" y="263" text-anchor="middle" fill="currentColor" font-size="14">Còn đường qua r2 · suy từ UPDATE thứ nhất</text></g>
<g data-step="4"><text x="230" y="115" fill="currentColor" font-size="14">không còn route</text><text x="230" y="188" fill="currentColor" font-size="14">không còn route</text><text x="260" y="263" text-anchor="middle" fill="currentColor" font-size="14">0 ứng viên · Network not in table</text></g>
<text x="260" y="299" text-anchor="middle" fill="currentColor" font-size="14">Hai peer vẫn Established sau withdrawal</text>
</svg>
<step-note data-step="1">Route hợp lệ chưa chắc được chọn. Snapshot đầu ghi đường trực tiếp thắng theo AS_PATH.</step-note>
<step-note data-step="2">Policy nhận từ r2 đặt LOCAL_PREF 200, khiến quyết định kết thúc trước khi xét chiều dài đường.</step-note>
<step-note data-step="3">UPDATE từ r4 rút ứng viên trực tiếp. Trạng thái giữa hai UPDATE được suy từ cơ chế xử lý, không có phép đo thời gian hay snapshot CLI riêng.</step-note>
<step-note data-step="4">UPDATE từ r2 rút đường còn lại. CLI xác nhận mất prefix nhưng các peer vẫn có phiên và nhận không prefix nào.</step-note>
</step-flow>

**Suy luận:** nếu chỉ rút đường đang chọn mà một đường khác còn hợp lệ, router có thể chọn đường còn lại. Lab này rút tại origin nên cuối cùng **cả hai** đều mất; nó không đo failover sang đường dự phòng còn sống. Không lấy kết quả mất route hoàn toàn để ước lượng thời gian khôi phục của một tình huống khác.

## 4. Lab

### 4.1 Dựng đúng phạm vi, không quảng bá ra Internet

Bộ lab `net-lab/net-11/` có `run.sh`, `config/`, `out/`, `src/`. Chuyển cả thư mục tới máy có Docker, `bash`, `python3`. Image là `quay.io/frrouting/frr:10.2.1`. Script đặt prefix container và network là `net11-`, chỉ dọn đúng bốn router và bốn network của bài bằng trap lúc kết thúc. Không cần chạy lệnh dọn tài nguyên toàn Docker.

```bash
chmod +x run.sh
./run.sh
cat out/r1-before.txt
cat out/policy.txt
cat out/withdraw.txt
```

Network Docker đều có `--internal`, mỗi link dùng một `/24` trong `10.111.0.0/16`. Đầu nối được gán như sau; gateway Docker là `.254` để không tranh `.1` với r1:

| Link | Đầu thứ nhất | Đầu thứ hai |
|---|---|---|
| r1–r2 | 10.111.12.1 | 10.111.12.2 |
| r2–r3 | 10.111.23.2 | 10.111.23.3 |
| r3–r4 | 10.111.34.3 | 10.111.34.4 |
| r1–r4 | 10.111.14.1 | 10.111.14.4 |

Các địa chỉ và ASN là **tham số lab**, kiểm lại ở `config/r1.conf` đến `config/r4.conf` và lệnh tạo network trong `run.sh`; không phải địa chỉ mạng công cộng đã khảo sát. ASN 65001–65004 thuộc khoảng Private Use của bài 10. Prefix đích `203.0.113.0/24` dùng cho tài liệu theo [RFC 5737 §3](https://www.rfc-editor.org/rfc/rfc5737#section-3), chỉ quảng bá bên trong topology cô lập.

Image trong lần đo cần `NET_ADMIN` và `SYS_ADMIN` cho các daemon FRR khởi động; script cấp hai capability cho container, không thay cấu hình colima. Dòng `no bgp network import-check` cho phép r4 khởi phát prefix dù không có route nền tương ứng. **Không có server ứng dụng đích**: lab chứng minh control plane và route cài ở r1, không chứng minh ping hay HTTP tới prefix sẽ thành công.

Dòng `no bgp ebgp-requires-policy` bỏ yêu cầu policy bắt buộc để giảm số cấu hình trong mạng cô lập; `BLOCK` là policy riêng phục vụ giữ đường vòng như mục 3.3. Theo [RFC 8212 §3](https://www.rfc-editor.org/rfc/rfc8212#section-3), mặc định không có import/export policy thì route eBGP không đủ điều kiện nhận/xuất. Không sao chép lựa chọn mở của lab thành cấu hình biên Internet.

### 4.2 Kiểm phiên, rồi nhìn chuỗi AS lớn lên

`run.sh` chờ có đúng hai ứng viên ở r1 bằng JSON, với số lần thử hữu hạn; không coi một khoảng `sleep` là bằng chứng BGP đã hội tụ. Nó ghi phiên vào `out/summary.txt`, rồi đọc cùng prefix tại từng router. Các dòng quyết định trích từ `out/r4-before.txt`, `out/r3-before.txt`, `out/r2-before.txt`:

```text
  Local
    0.0.0.0 from 0.0.0.0 (10.255.0.4)
      Origin IGP, metric 0, weight 32768, valid, sourced, local, best (First path received)
```

```text
  65004
    10.111.34.4 from 10.111.34.4 (10.255.0.4)
      Origin IGP, metric 0, valid, external, best (First path received)
```

```text
  65003 65004
    10.111.23.3 from 10.111.23.3 (10.255.0.3)
      Origin IGP, valid, external, best (First path received)
```

r4 hiển thị `Local`, không hiển thị `65004` như đường nhận bên ngoài. r3 mới nhìn thấy `65004` sau khi r4 gửi sang eBGP. `weight 32768` ở r4 là giá trị route cục bộ trong số đo, **không được mang sang các router khác như một attribute**. Việc r4 nhận diện route cục bộ cũng giải thích tại sao không lấy best tại r4 để mô tả tiêu chí chọn giữa hai ứng viên external ở r1.

Tại r1, `out/r1-before.txt` ghi:

```text
Paths: (2 available, best #1, table default)
  Advertised to non peer-group peers:
  10.111.14.4
  65004
    10.111.14.4 from 10.111.14.4 (10.255.0.4)
      Origin IGP, metric 0, valid, external, best (AS Path)
```

Phần còn lại của cùng file là ứng viên không được chọn:

```text
  65002 65003 65004
    10.111.12.2 from 10.111.12.2 (10.255.0.2)
      Origin IGP, valid, external
```

Bản sai “AS_PATH ngắn nhất luôn thắng” vừa dự đoán đúng một lần. Chưa có gì trong snapshot này phân biệt được bản sai đó với mô hình đúng “xét policy trước, nếu còn ngang nhau mới tới AS_PATH”. Phải thay đúng một yếu tố để hai mô hình cho dự đoán khác nhau.

### 4.3 Đổi policy nhận, không đổi topology

Đây là các lệnh thực thi trong script, trước khi container được dọn:

```bash
docker exec net11-r1 vtysh \
  -c 'configure terminal' \
  -c 'route-map PREFER-LONG permit 10' \
  -c 'set local-preference 200' \
  -c 'router bgp 65001' \
  -c 'address-family ipv4 unicast' \
  -c 'neighbor 10.111.12.2 route-map PREFER-LONG in'
docker exec net11-r1 vtysh -c 'clear bgp 10.111.12.2 soft in'
```

**Route-map** là tập luật có thứ tự để cho phép/chặn và sửa thuộc tính route khi policy được áp dụng. `in` gắn nó vào chiều nhận từ r2. `soft in` yêu cầu áp dụng lại thông tin nhận theo cơ chế hỗ trợ mà không reset toàn phiên; lab này dùng các peer FRR hỗ trợ cập nhật lại route. Không nhầm “clear soft” với ngắt TCP để ép một cuộc bầu chọn đường hoàn toàn mới.

`out/policy.txt` ghi:

```text
Paths: (2 available, best #1, table default)
  Advertised to non peer-group peers:
  10.111.14.4
  65002 65003 65004
    10.111.12.2 from 10.111.12.2 (10.255.0.2)
      Origin IGP, localpref 200, valid, external, best (Local Pref)
```

**Thấy gì:** ứng viên vòng không chỉ tồn tại, nó có LOCAL_PREF 200 và đã thắng vì tiêu chí đó. **Vì sao:** LOCAL_PREF nằm trước AS_PATH trong chuỗi so sánh của cấu hình FRR này. Lúc này bản sai dự đoán ngược kết quả, còn mô hình có policy dự đoán đúng.

Lệnh `ip route show 203.0.113.0/24` trong script đọc riêng kết quả kernel; `out/kernel-policy.txt` ghi:

```text
203.0.113.0/24 nhid 8 via 10.111.12.2 dev eth0 proto bgp metric 20
```

`nhid 8` là định danh next hop trong lần chạy này, không phải số AS/hop. Chạy lại có thể đổi định danh; phần cần đối chiếu với quyết định BGP là prefix và `via 10.111.12.2`. Không cần suy từ tên interface về thiết bị vật lý của máy macOS: interface này ở namespace container Linux.

### 4.4 Xem UPDATE và rút prefix trong khi peer còn sống

Script bật debug nhận UPDATE tại r1, yêu cầu r4 gửi lại thông tin sang r1 bằng `clear ... soft out`, rồi r4 thực hiện `no network`. Các dòng thuộc tính thật, trích `out/updates.txt`:

```text
2026/11/13 05:53:20 BGP: [XXWBM-V772F] 10.111.14.4(fb52de2fbb36) rcvd UPDATE w/ attr: nexthop 10.111.14.4, origin i, metric 0, path 65004
2026/11/13 05:53:20 BGP: [NJYMB-R5FFH] 10.111.14.4(fb52de2fbb36) rcvd 203.0.113.0/24 IPv4 unicast...duplicate ignored
```

Thông tin gửi lại giống route đã nhận nên FRR in `duplicate ignored`; có UPDATE không đồng nghĩa có thay đổi bảng. Đây là lý do không lấy số UPDATE làm số lần traffic đổi đường.

Lệnh rút prefix tại r4:

```bash
docker exec net11-r4 vtysh \
  -c 'configure terminal' -c 'router bgp 65004' \
  -c 'address-family ipv4 unicast' \
  -c 'no network 203.0.113.0/24'
```

Hai dòng rút trong `out/updates.txt`:

```text
2026/11/13 05:53:21 BGP: [PAPP6-VDAWM] 10.111.14.4(fb52de2fbb36) rcvd UPDATE about 203.0.113.0/24 IPv4 unicast -- withdrawn
2026/11/13 05:53:21 BGP: [PAPP6-VDAWM] 10.111.12.2(47a381cdc8b4) rcvd UPDATE about 203.0.113.0/24 IPv4 unicast -- withdrawn
```

Tên hostname trong ngoặc là ID container lần chạy, không phải ASN thêm vào AS_PATH. Chúng thay đổi khi dựng lại. Sau đó `out/withdraw.txt` ghi:

```text
% Network not in table
```

Trong `out/summary-after.txt`, cột `State/PfxRcd` của cả peer `10.111.12.2` và `10.111.14.4` đều là số `0`, không phải tên trạng thái Idle/Active. Theo cách hiển thị summary FRR, một số ở cột này là số prefix nhận trong phiên đã Established; `0` nghĩa phiên vẫn lên nhưng không có prefix nhận. Nếu chỉ xem hai peer “xanh”, bạn sẽ bỏ qua đúng lỗi route đã biến mất.

> **Chưa đo.** Không có pcap, RTT, throughput hay phép đo thời gian hội tụ trong bài. Timestamp giây và polling một giây không đủ suy ra mất traffic bao nhiêu mili giây. Muốn đo failover data plane, thêm đích phục vụ thật, luồng probe có timestamp và capture đồng hồ đồng bộ; cần một thí nghiệm khác với rút toàn bộ prefix tại origin.

## 5. Tính tay

Các kết quả số học đã được Python tính lại ở `out/arithmetic.txt`. Chúng là **suy luận** từ cấu trúc và policy, trừ các giá trị thuộc tính đã ghi rõ là số đo ở trên.

### 5.1 Đếm đường, rồi áp thứ tự

r1 có đường X là `[65004]`, đường Y là `[65002,65003,65004]`. Weight ngang nhau, cả hai external và hợp lệ, không có ưu tiên cục bộ khác. Đầu tiên LOCAL_PREF ngang nhau; sau đó chỉ Y được tăng lên 200, lớn hơn X. Ai thắng ở mỗi thời điểm? Nếu gán MED của X bằng 0 thì có lấy lại best không?

**Lời giải:** chiều dài AS_SEQUENCE của X là một, Y là ba. Khi các tiêu chí trước AS_PATH ngang nhau, X thắng. Sau thay đổi LOCAL_PREF, Y thắng ngay trước khi xét AS_PATH. MED đứng sau nên chỉ đặt MED X bằng 0 không đảo được kết quả trong điều kiện này. Không được biến bài so thứ tự thành biểu thức `200 − 3` so với `0 − 1`.

### 5.2 Một UPDATE rút đúng một `/24` tối thiểu dài bao nhiêu?

Chỉ xét dạng IPv4 cơ sở của RFC 4271: rút `203.0.113.0/24`, không quảng bá NLRI mới, không có path attributes. Bỏ qua header TCP/IP và các mở rộng. Cần bao nhiêu octet cho NLRI bị rút, rồi cho toàn UPDATE?

**Lời giải:** một octet độ dài prefix + `24 / 8 = 3` octet địa chỉ = bốn octet. Toàn UPDATE là `19 + 2 + 4 + 2 = 27` octet: header chung, Withdrawn Routes Length, route bị rút, Total Path Attribute Length bằng không. Hai trường độ dài vẫn tồn tại dù một vùng dữ liệu rỗng. Mức tối thiểu của UPDATE không mang route là `19 + 2 + 2 = 23` octet theo RFC; không lấy 23 làm kích thước mọi UPDATE. **Chưa capture byte thật** của hai withdrawal trong lab, nên 27 là kết quả bài tính với điều kiện đã cho, không phải số đo gói thực tế.

### 5.3 Rút một ứng viên khác rút một đích

r1 đang có hai ứng viên cho một prefix. Peer trực tiếp rút đường của nó; sau đó peer r2 rút đường còn lại. Bỏ qua mọi thay đổi khác, có bao nhiêu ứng viên sau mỗi sự kiện? Có suy được thời gian mất route từ hai dòng log cùng giây không?

**Lời giải:** sau sự kiện đầu còn một, sau sự kiện sau còn không. Prefix biến mất khi không còn ứng viên đủ điều kiện. Hai dòng cùng giây chỉ cho thứ tự dòng trong log đã thu; độ phân giải ấy không cho khoảng thời gian chính xác giữa hai lần xử lý, càng không cho thời gian app bị gián đoạn. Trạng thái “còn một” trong hình là suy từ phép xử lý tuần tự, không phải một snapshot CLI đã lấy ở giữa.

## 6. Chuyển giao

1. Hai đường có AS_PATH bằng nhau, nhưng đường weight thấp hơn có LOCAL_PREF cao hơn. Theo bảng FRR, bạn phải kiểm gì đầu tiên? Gợi ý: đi từ đầu danh sách, không chọn thuộc tính có con số lớn nhất nhìn thấy.
2. Peer Established, cột nhận prefix vẫn hiện `(Policy)` thay vì một số. Bạn kiểm lớp nào trước khi thay dây mạng? Gợi ý: đối chiếu import/export policy và chế độ `ebgp-requires-policy`.
3. Đồng nghiệp thấy `Origin IGP` rồi tìm log OSPF trên router chỉ dùng `network` để khởi phát prefix. Sai ở bước suy luận nào? Gợi ý: phân biệt mã thuộc tính ORIGIN với giao thức đã vận chuyển route tới router.
4. r1 đã có best BGP đúng nhưng Linux vẫn dùng một route từ nguồn khác. Bạn cần thu thêm những bảng và trạng thái nào? Gợi ý: tách lựa chọn trong BGP khỏi lựa chọn/cài đặt của hệ thống.
5. Đội vận hành prepend ASN để kéo dài đường quảng bá ra ngoài nhưng lưu lượng chiều vào không đổi. Những policy nào của mạng bên ngoài có thể quyết định trước AS_PATH? Gợi ý: bạn kiểm soát thuộc tính gửi đi, chưa kiểm soát bộ tiêu chí của bên nhận.
6. Một prefix có hai upstream, hai router biên trong cùng AS, một kết nối iBGP và một next hop mất khả năng tới trong khi phiên BGP vẫn Established. Hãy thiết kế lab phân biệt route bị policy loại, next hop không giải được, route chưa cài kernel và lỗi forwarding chiều về; nêu bằng chứng đủ bác bỏ từng giả thuyết. Đây là câu khó nhất, không có đáp án trong bài.

## 7. Tóm tắt

- UPDATE có thể quảng bá hoặc rút route; KEEPALIVE không quảng bá lại prefix đã rút.
- Trong AS_SEQUENCE đơn giản của lab, eBGP thêm ASN bên gửi ở đầu; chuỗi quảng bá lớn lên ngược chiều gói tới đích.
- FRR lab chọn AS_PATH một phần tử trước policy, rồi chọn đường ba phần tử sau LOCAL_PREF 200; bằng chứng ở `out/r1-before.txt` và `out/policy.txt`.
- LOCAL_PREF tác động trong AS và được xét trước AS_PATH; nó không đo RTT hoặc buộc mạng ngoài chọn đường chiều về.
- Best BGP và route kernel là hai bước kiểm; lab cài `via 10.111.12.2` sau thay đổi policy.
- Sau withdrawal tại origin, r1 không còn prefix nhưng hai peer vẫn Established; `out/withdraw.txt` và `out/summary-after.txt` xác nhận hai trạng thái riêng.

→ **Bài 12 — Transit, peering và IXP**: gắn những policy lựa chọn và quảng bá vừa đo với quan hệ kết nối giữa các mạng.
