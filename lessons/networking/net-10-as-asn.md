# Bài 10 — AS và ASN: ai vận hành đường tới một địa chỉ IP?

## 1. Mục tiêu

Sau bài này bạn có thể:

- Tách ba câu hỏi khi tra một IP: ai được đăng ký tài nguyên, AS nào đang khởi phát quảng bá prefix, và gói tin của mình đi qua đâu.
- Nhận diện ranh giới AS bằng chính sách định tuyến, thay vì đếm router, datacenter hay pháp nhân.
- Giải thích vai trò của IANA, RIR, NIR/LIR và nhà vận hành mà không nhầm việc cấp số với việc dựng đường truyền.
- Phân biệt ASN công cộng, ASN dùng riêng và cách biểu diễn số AS hai hoặc bốn octet.
- Dùng RDAP và RIPEstat, giữ nguyên tập kết quả origin AS, thời điểm quan sát và prefix chứa địa chỉ cần tra.
- Viết một kết luận điều tra có giới hạn: dữ liệu nào đủ để kết luận, dữ liệu nào còn phải đo tại mạng nguồn.

## 2. Triệu chứng

Bạn cần biết mạng nào nhận trách nhiệm định tuyến tới một IP dịch vụ trước khi mở ticket với nhà cung cấp. Thử với `1.1.1.1`: bản ghi đăng ký trả về `APNIC-LABS`, `country AU`; dữ liệu định tuyến trả về prefix `1.1.1.0/24`, AS `13335`. Thử đối chứng `8.8.8.8`: prefix `8.8.8.0/24`, AS `15169`.

Bạn viết bản kết luận đầu tiên: “IP thứ nhất thuộc APNIC ở Australia; tên AS trong công cụ kia chắc chỉ là mạng trung gian.” Kết luận này có vẻ hợp lý: bản ghi đăng ký tài nguyên có tên và quốc gia, còn một mã số AS không nói được server ở đâu. Nhưng chính việc gộp các loại bằng chứng lại làm bạn hỏi nhầm bên.

> **Đo trên lab.** Ngày 13/11/2026 UTC, macOS arm64, `curl 8.7.1`; `out/lookup.txt` của lab `net-10` ghi các giá trị trên. Đây là phản hồi của API công khai, không phải bảng BGP đọc trực tiếp từ router tại máy nguồn. Đo lại: vào thư mục lab, chạy `./run.sh`.

Bài net-09 đã tách địa chỉ, route và kết nối thực sự ở host. Ở đây ta đi qua ranh giới host để xác định mạng nào xuất hiện trong thông tin định tuyến.

Ta sẽ cho bản kết luận sai đi hết quy trình: tra đăng ký trước, tra định tuyến sau, rồi kiểm xem mỗi dòng thực sự cho phép nói điều gì. Bài này chưa đo độ trễ dịch vụ và chưa xác định vị trí vật lý của điểm phục vụ.

## ⏸ Dừng lại — đoán trước #1

RDAP ghi `APNIC-LABS`, RIPEstat ghi `asns: ["13335"]`. Chọn kết luận đủ chặt:

- (a) Một trong hai nguồn sai vì mỗi IP chỉ có một loại chủ sở hữu.
- (b) APNIC-LABS là tên đăng ký của khối địa chỉ; AS13335 là origin AS mà nguồn định tuyến quan sát được.
- (c) AS13335 chắc chắn là AS của máy đang gửi truy vấn.
- (d) `country AU` chứng minh request phải vượt biển tới Australia.

## 3. Cơ chế

### 3.1 AS gom chính sách, không gom mọi thứ cùng thương hiệu

Đáp án là **(b)**. Muốn thấy vì sao, cần đổi đơn vị đang nhìn: từ một địa chỉ trên máy sang một mạng có quyền quyết định nhận và chuyển tiếp lưu lượng.

**AS — autonomous system — là một nhóm prefix kết nối với nhau, được vận hành theo một chính sách định tuyến thống nhất và xác định rõ.** **Prefix** là khối địa chỉ biểu diễn bằng địa chỉ mạng kèm độ dài; phần CIDR đã học ở [eng-02](../engineering/eng-02-cidr-subnetting.md), nên ở đây chỉ dùng prefix làm đối tượng được thông báo giữa các mạng.

**Chính sách định tuyến** là tập quyết định mạng chấp nhận thông tin đường đi nào, ưu tiên đường nào và thông báo đường nào cho hàng xóm. Hai đường cùng tới một đích không nhất thiết được coi ngang nhau: người vận hành có thể ưu tiên một hợp đồng kết nối, chặn một loại quảng bá hoặc giữ một đường để dự phòng. Cơ chế lựa chọn cụ thể thuộc bài 11; ở đây điểm cần giữ là quyền quyết định nằm trong từng AS.

> **Nguồn.** RFC 1930 §3 dùng cụm *“SINGLE and CLEARLY DEFINED”* để nhấn mạnh chính sách của AS ([RFC 1930](https://www.rfc-editor.org/rfc/rfc1930#section-3)). Bản tải `src/rfc1930.txt` là căn cứ cho định nghĩa ở trên.

**ASN — autonomous system number — là số nhận diện AS trong trao đổi định tuyến.** IP trả lời “đích nằm trong khối địa chỉ nào”; ASN trả lời “mạng nào xuất hiện trong thông tin đường tới khối ấy”. ASN không phải địa chỉ gửi gói dữ liệu, cũng không thay thế prefix. Router vẫn chuyển gói dựa trên địa chỉ IP đích.

Một AS có thể có router ở nhiều địa điểm, nhiều tuyến cáp nội bộ và nhiều prefix. Từ bên ngoài, nó vẫn trình bày một chính sách nhất quán. Ngược lại, một tổ chức có thể vận hành những miền chính sách khác nhau bằng các AS khác nhau. Vì vậy phép suy “một công ty = một ASN” không phải định nghĩa của AS. Quy tắc này đi từ chính sách tới số, không đi từ logo tới số.

Sơ đồ dưới dùng hai cặp prefix–origin đã tra được. Các vòng tròn chỉ là ký hiệu router để thấy ranh giới khái niệm, **không phải topology thật của hai mạng**; số router và liên kết bên trong chưa được đo.

<svg font-family="ui-sans-serif, system-ui, sans-serif" viewBox="0 0 520 245" role="img" aria-labelledby="net10-a-t net10-a-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net10-a-t">Ranh giới AS bao quanh hệ thống định tuyến nội bộ</title>
<desc id="net10-a-d">Hai miền chính sách chứa các router minh hoạ. Prefix 1.1.1.0/24 gắn với AS13335, prefix 8.8.8.0/24 gắn với AS15169 theo API đã tra; đường nối không khẳng định hai mạng peering trực tiếp.</desc>
<rect x="12" y="24" width="224" height="190" rx="28" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor"/>
<rect x="284" y="24" width="224" height="190" rx="28" fill="#10b981" fill-opacity="0.13" stroke="currentColor"/>
<g fill="currentColor" font-size="15" text-anchor="middle">
<text x="124" y="52">AS13335</text><text x="396" y="52">AS15169</text>
<text x="124" y="188">1.1.1.0/24</text><text x="396" y="188">8.8.8.0/24</text>
</g>
<g fill="none" stroke="currentColor" stroke-width="2"><path d="M72 108 L169 108 L121 146 Z"/><path d="M344 108 L441 108 L393 146 Z"/></g>
<g fill="#3b82f6" fill-opacity="0.16" stroke="currentColor"><circle cx="72" cy="108" r="14"/><circle cx="169" cy="108" r="14"/><circle cx="121" cy="146" r="14"/><circle cx="344" cy="108" r="14"/><circle cx="441" cy="108" r="14"/><circle cx="393" cy="146" r="14"/></g>
<text x="260" y="235" text-anchor="middle" font-size="13" fill="currentColor">Vòng bao = miền chính sách; vòng tròn = router minh hoạ</text>
</svg>

Tại sao phải có đơn vị này? Nếu mọi router Internet phải hiểu toàn bộ quy tắc nội bộ của mọi tổ chức khác, thay một đường nội bộ sẽ buộc những mạng không liên quan phải quan tâm. Ranh giới AS cho phép mạng bên ngoài chỉ nhận thông tin “prefix nào đi qua mạng nào”, còn cách đi trong miền đó do người vận hành giải quyết. Đây là sự tách trách nhiệm, không phải lời hứa rằng mạng nội bộ chỉ chạy một giao thức.

**Suy luận từ RFC 1930:** đếm hop trong traceroute không cho số AS. Nhiều router trả lời có thể cùng thuộc một miền chính sách; một số router không trả lời; địa chỉ trên liên kết cũng chưa chắc thuộc prefix mà bạn muốn gán cho AS. Bài net-08 dành cho cách đọc traceroute. Bài này không dùng traceroute làm bằng chứng cho origin.

### 3.2 Cấp ASN là cấp tài nguyên số, chưa phải nối vào Internet

**IANA — Internet Assigned Numbers Authority —** là cơ quan điều phối toàn cầu các tài nguyên số Internet, trong đó có không gian ASN. **RIR — regional Internet registry — là tổ chức đăng ký tài nguyên số theo khu vực.** IANA giao các dải ASN cho RIR; RIR xử lý việc cấp phát theo chính sách áp dụng tại khu vực.

**LIR — local Internet registry — là đơn vị đăng ký tài nguyên ở cấp địa phương, thường là nhà cung cấp dịch vụ; NIR — national Internet registry — là đơn vị đăng ký ở cấp quốc gia trong hệ thống có mô hình này.** Các tên này mô tả vai trò đăng ký, không mô tả hop trên đường đi của gói tin. Đường cấp địa chỉ IP có thể đi qua ISP, LIR hoặc NIR; với yêu cầu ASN cụ thể, phải xem quy trình của RIR/NIR và hình thức hỗ trợ tại khu vực. Không có quy tắc mọi ASN bắt buộc đi qua cùng một chuỗi IANA → RIR → LIR → khách hàng.

> **Nguồn.** IANA ghi *“AS Numbers can be obtained from the registry in your region.”* ([sổ ASN](https://www.iana.org/assignments/as-numbers/as-numbers.xhtml)). Trang [Number Resources](https://www.iana.org/numbers) liệt kê năm RIR và mô tả phân cấp đăng ký IP. Hai nguồn hỗ trợ hai phạm vi khác nhau; không lấy mô tả cấp IP làm bằng chứng rằng mọi ASN đều qua LIR.

Năm RIR trong bảng IANA đã tải là AFRINIC, APNIC, ARIN, LACNIC và RIPE NCC. APNIC phụ trách khu vực châu Á–Thái Bình Dương. Mục đích của việc phân cấp là phân phối và ghi nhận tài nguyên không trùng trong không gian công cộng; RIR không trở thành nhà mạng trung chuyển chỉ vì tên xuất hiện trong hồ sơ cấp phát.

<svg font-family="ui-sans-serif, system-ui, sans-serif" viewBox="0 0 520 310" role="img" aria-labelledby="net10-b-t net10-b-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net10-b-t">Phân cấp đăng ký và đường nối vật lý là hai việc riêng</title>
<desc id="net10-b-d">IANA phân phối dải số cho RIR. Registry có thể cấp tới nhà vận hành trực tiếp hoặc qua cơ chế NIR hay hỗ trợ tại khu vực. ASN được cấp không tự sinh liên kết giữa router và ISP.</desc>
<defs><marker id="net10-b-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="currentColor"/></marker></defs>
<g fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net10-b-arrow)"><path d="M260 62 V100"/><path d="M240 144 L120 206"/><path d="M280 144 L400 206"/></g>
<g fill="#3b82f6" fill-opacity="0.13" stroke="currentColor"><rect x="185" y="20" width="150" height="42" rx="8"/><rect x="175" y="100" width="170" height="44" rx="8"/><rect x="22" y="208" width="196" height="54" rx="8"/><rect x="302" y="208" width="196" height="54" rx="8"/></g>
<g fill="currentColor" font-size="14" text-anchor="middle"><text x="260" y="47">IANA</text><text x="260" y="128">RIR của khu vực</text><text x="120" y="230">Nhà vận hành</text><text x="120" y="249">đăng ký trực tiếp</text><text x="400" y="230">Qua NIR / hỗ trợ</text><text x="400" y="249">tuỳ quy trình khu vực</text><text x="365" y="87">phân phối dải ASN</text><text x="260" y="294">Mũi tên cấp số không phải cáp truyền dữ liệu</text></g>
</svg>

Giả sử bạn được cấp ASN nhưng chưa có hàng xóm chấp nhận phiên định tuyến, chưa được phép quảng bá prefix và chưa có liên kết hoạt động. Bạn mới có danh tính để dùng khi trao đổi route; người khác chưa có lý do gửi traffic tới bạn. Tương tự, có địa chỉ công cộng không đồng nghĩa địa chỉ đó đang được quảng bá hoặc có ứng dụng đang lắng nghe.

Đối chiếu hai thao tác cho rõ nguyên nhân: đăng ký cập nhật hồ sơ về tài nguyên; cấu hình định tuyến cập nhật thông tin đường đi giữa router. Hồ sơ có thể đứng yên trong khi route đổi, và route có thể rút dù hồ sơ vẫn tồn tại. Vì thế khi dịch vụ mất kết nối, chụp màn hình WHOIS không chứng minh được “đường vẫn còn”.

**WHOIS** là giao thức truy vấn thông tin đăng ký dạng văn bản; **RDAP — Registration Data Access Protocol — là giao thức truy vấn thông tin đăng ký có cấu trúc qua HTTP.** Trong lab ta chọn RDAP để đọc chính xác `name`, `startAddress`, `endAddress`, `country` bằng JSON. Việc công cụ trả JSON chỉ làm dữ liệu dễ xử lý hơn; nó không biến dữ liệu đăng ký thành dữ liệu định tuyến thời gian thực.

### 3.3 Hai octet, bốn octet và số dùng riêng

Một **octet** là nhóm tám bit. Không gian ASN ban đầu dùng hai octet; phần mở rộng BGP cho ASN bốn octet được chuẩn hoá trong RFC 6793. Hai cách có sức chứa số học lần lượt là `2^16` và `2^32` giá trị. **Sức chứa không phải số AS đang hoạt động**, vì có giá trị dành riêng, chưa cấp hoặc được cấp nhưng không quảng bá route.

> **Nguồn.** [RFC 6793](https://www.rfc-editor.org/rfc/rfc6793) mô tả mở rộng mang ASN dưới dạng bốn octet. [RFC 6996 §5](https://www.rfc-editor.org/rfc/rfc6996#section-5) dành các khoảng `64512–65534` và `4200000000–4294967294` cho Private Use; chúng không được coi là ASN duy nhất toàn Internet.

Tính bằng Python trong `out/arithmetic.txt`: hai octet có 65.536 giá trị biểu diễn, bốn octet có 4.294.967.296. Không được lấy các con số này trừ đi một cách tuỳ tiện để tuyên bố còn bao nhiêu ASN cấp được hôm nay; muốn biết phân bổ hiện tại phải đọc sổ IANA tại thời điểm hỏi.

**ASN dùng riêng** giải bài toán hai mạng cần trao đổi route trong phạm vi kiểm soát mà không cần nhận diện toàn cầu. Hai lab không kết nối nhau có thể cùng dùng AS65001. Khi ghép hai lab thành một miền trao đổi, việc trùng số trở thành vấn đề thực: thông tin đường đi có thể khiến router nhận diện nhầm đường quay lại AS của mình. Mã số có nghĩa trong ngữ cảnh định tuyến, không chỉ là nhãn trang trí.

ASN công cộng cũng không có tính chất “cứ gõ số đó là mạng khác tin bạn”. Số trong cấu hình có thể bị khai sai; việc có được phép khởi phát prefix cần cơ chế xác thực và policy riêng. Bài 14 dành cho hijack, leak và RPKI. Trong bài này chỉ cần giữ ranh giới: có số nhận diện không tương đương có quyền đối với mọi prefix.

| Loại | Khoảng / cách biểu diễn | Cách sử dụng trong bài |
|---|---|---|
| ASN hai octet | Giá trị biểu diễn từ 0 đến 65535; không phải toàn bộ đều cấp tự do | AS7552, AS13335, AS15169 đều biểu diễn được trong khoảng này |
| ASN bốn octet | Không gian từ 0 đến 4294967295, gồm cả số hai octet | Cùng một ASN có thể được in bằng các quy ước khác nhau |
| Private Use hai octet | 64512–65534, gồm hai đầu | Bài sau dùng 65001–65004 trong mạng Docker cô lập |
| Private Use bốn octet | 4200000000–4294967294, gồm hai đầu | Không dùng làm danh tính duy nhất ngoài phạm vi quản lý |

Bảng không liệt kê hết các giá trị đặc biệt; tham chiếu sổ IANA khi cấu hình thật. Hai khoảng dùng riêng khác nhau về không gian số, không khác nhau về quyền quảng bá trên Internet.

Đôi khi công cụ in dạng **ASDOT**, tức tách một ASN bốn octet thành hai phần thập phân `a.b`; **ASPLAIN** là cách in một số nguyên thập phân duy nhất. Quy đổi là `a × 65536 + b`. Theo [RFC 5396](https://www.rfc-editor.org/rfc/rfc5396), ASDOT dùng dạng có dấu chấm cho số từ 65536 trở lên; ASDOT+ dùng dạng đó cho cả số nhỏ. Các ví dụ dưới đều ở khoảng từ 65536 trở lên. Đây là quy ước hiển thị, không phải hai AS nối với nhau, cũng không phải một địa chỉ IPv4 bị mất octet. Phần tính tay sẽ đổi `1.10` để thấy tại sao tìm chuỗi nguyên văn trong log có thể bỏ sót cùng một ASN.

## ⏸ Dừng lại — đoán trước #2

Script tra IP đang viết `origin = data["asns"][0]`. API tình cờ trả hai ASN cho cùng prefix ở một thời điểm khác. Làm gì?

- (a) Cứ giữ phần tử đầu vì đó chắc là đường tốt nhất của router tại máy nguồn.
- (b) Sắp xếp số rồi chọn ASN nhỏ nhất vì nó lâu đời hơn.
- (c) Giữ cả tập ASN, thời điểm và nguồn quan sát; điều tra tiếp trước khi kết luận sự cố.
- (d) Đổi sang trường `country` để chọn một ASN duy nhất.

### 3.4 Một IP không mang sẵn một trường “AS của tôi”

Đáp án là **(c)**. **Origin AS** là AS khởi phát quảng bá một prefix trong thông tin BGP được quan sát. **BGP — Border Gateway Protocol — là giao thức trao đổi thông tin khả năng tới các prefix giữa các hệ thống định tuyến.** Ở bài 11 bạn sẽ nhìn đường quảng bá lớn dần qua từng AS; hiện tại chỉ cần phân biệt origin với các mạng trung chuyển.

**Route collector** là hệ thống thu thập thông tin định tuyến từ những mạng gửi dữ liệu cho nó. RIPE RIS là hệ thống collector của RIPE NCC. API `network-info` ánh xạ địa chỉ tới prefix và tập origin ASN dựa trên dữ liệu RIS. Tài liệu endpoint ghi dữ liệu dựa trên các bản dump RISwhois theo chu kỳ 8 giờ; thời gian truy vấn không bảo đảm route có độ mới từng giây. Nó không hỏi từng router trên toàn Internet, cũng không đọc bảng forwarding của laptop đang chạy `curl`.

Trình tự giải nghĩa phải giữ cả ba đầu mối:

1. Địa chỉ hỏi là `1.1.1.1`, không phải toàn bộ mạng của nhà cung cấp dịch vụ.
2. Prefix trả về là `1.1.1.0/24`; trường `asns` trong lần đo này có đúng `13335`.
3. Thời gian phản hồi của API trong log là dấu mốc truy vấn; muốn nghiên cứu lịch sử hay độ mới của dữ liệu phải đọc metadata endpoint, không gắn nhãn “route vừa đổi tại giây đó”.

**MOAS — multiple-origin AS — là tình huống một prefix được quan sát có nhiều origin AS.** Nó có thể cần điều tra thêm về vận hành, chuyển đổi hoặc quảng bá sai; bản thân tập có nhiều phần tử chưa đủ kết án hijack. Một API tổng hợp cũng chưa nói hai origin ấy có được chính router nguồn đồng thời nhìn thấy hay không. Bản sai `asns[0]` làm mất bằng chứng trước khi bạn kịp hỏi câu đúng.

> **Nguồn.** Tài liệu [RIPEstat network-info](https://stat.ripe.net/docs/data-api/api-endpoints/network-info) mô tả dữ liệu prefix và ASN từ RIS. Bản tải `src/ripe-doc.txt`; phản hồi thô của lần đo ở `out/1.1.1.1.json` và `out/8.8.8.8.json`. Hãy tách tài liệu về ý nghĩa trường khỏi chính giá trị quan sát được.

<step-flow>
<svg font-family="ui-sans-serif, system-ui, sans-serif" viewBox="0 0 520 300" role="img" aria-labelledby="net10-c-t net10-c-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net10-c-t">Cùng một IP đi vào hai nhánh tra cứu độc lập</title>
<desc id="net10-c-d">Từ 1.1.1.1 tách sang RDAP và RIPE RIS. RDAP trả APNIC-LABS và AU; RIS trả 1.1.1.0/24 và AS13335. Kết luận ban đầu chỉ theo hồ sơ đăng ký biến mất khi có kết quả định tuyến.</desc>
<defs><marker id="net10-c-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="currentColor"/></marker></defs>
<rect x="180" y="12" width="160" height="42" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor"/>
<text x="260" y="39" text-anchor="middle" font-size="16" fill="currentColor">1.1.1.1</text>
<g data-step="1"><path d="M220 54 L125 106" fill="none" stroke="currentColor" marker-end="url(#net10-c-arrow)"/><rect x="18" y="110" width="215" height="95" rx="8" fill="#f59e0b" fill-opacity="0.13" stroke="currentColor"/><g fill="currentColor" font-size="14" text-anchor="middle"><text x="125" y="136">RDAP / đăng ký</text><text x="125" y="164">APNIC-LABS</text><text x="125" y="189">country AU</text></g></g>
<g data-step="1" data-until="1"><text x="260" y="260" text-anchor="middle" font-size="14" fill="currentColor">Đã biết origin? Chưa có bằng chứng.</text></g>
<g data-step="2"><path d="M300 54 L395 106" fill="none" stroke="currentColor" marker-end="url(#net10-c-arrow)"/><rect x="287" y="110" width="215" height="95" rx="8" fill="#10b981" fill-opacity="0.13" stroke="currentColor"/><g fill="currentColor" font-size="14" text-anchor="middle"><text x="395" y="136">RIPE RIS / định tuyến</text><text x="395" y="164">1.1.1.0/24</text><text x="395" y="189">origin AS13335</text></g></g>
<g data-step="2"><path d="M125 205 L240 241 M395 205 L280 241" fill="none" stroke="currentColor" marker-end="url(#net10-c-arrow)"/><text x="260" y="268" text-anchor="middle" font-size="14" fill="currentColor">Hai kết quả trả lời hai câu hỏi</text><text x="260" y="289" text-anchor="middle" font-size="13" fill="currentColor">Chưa có đường đi từ máy nguồn hay vị trí server</text></g>
</svg>
<step-note data-step="1">Tra hồ sơ cho biết khối địa chỉ được ghi nhận thế nào. Dừng ở đây mà gán origin là nhảy qua loại bằng chứng còn thiếu.</step-note>
<step-note data-step="2">Dữ liệu RIS thêm lớp định tuyến mà không sửa tên đăng ký. Hai nhánh bổ sung nhau, chưa nhánh nào đo địa điểm thực sự nhận request.</step-note>
</step-flow>

### 3.5 Tra IP của mình: xác định “mình” trước

Ứng dụng thường chạy sau NAT, VPN hoặc proxy. **Địa chỉ nguồn quan sát ở đầu xa** là địa chỉ sau các bước biến đổi trên đường ra mà đầu xa nhìn thấy. Nếu lấy một IP riêng trên card mạng để hỏi origin Internet, bạn đang hỏi về tài nguyên không có cùng vai trò với IP công cộng của phiên kết nối. Phần NAT đã có ở [intro-02](../foundations/intro-02-networking.md); bài 7 đi xuống conntrack.

Quy trình cho chính máy của bạn là: chọn đúng luồng cần điều tra → lấy địa chỉ nguồn mà endpoint tin cậy ở đầu xa đã ghi → đưa địa chỉ đó vào truy vấn prefix–origin → đối chiếu đăng ký và thời điểm. Không cần công bố địa chỉ của bạn trong issue công khai. Trong bài này hai IP dịch vụ công cộng là dữ liệu kiểm soát; lab không gọi dịch vụ “what is my IP”, không ghi IP WAN của người chạy vào log.

**Đo trên lab:** truy vấn riêng AS7552 trả `VIETEL-AS-AP - Viettel Group`, `announced True`. Nó chứng minh API có thông tin về AS7552 trong lần truy vấn, **không chứng minh** một kết nối cụ thể của máy đang đi qua AS đó. Muốn chứng minh, cần thêm IP nguồn quan sát ở phía đích, bối cảnh VPN/proxy và bằng chứng đường đi tương ứng. Không dùng một thông tin bối cảnh mạng làm kết quả phép đo chưa chạy.

**Suy luận:** nếu thay VPN, IP nguồn đầu xa thấy có thể đổi; prefix–origin tra từ IP mới cũng có thể đổi. Điều đó không đòi hỏi card mạng vật lý hay ISP của đường truy nhập thay đổi. Kiểm bằng cách lấy log nguồn từ cùng endpoint trước và sau khi bật VPN. Đây là cách kiểm được đề xuất, không phải một số đo VPN đã thực hiện trong bài.

Sau khi hiểu cơ chế, bảng này giúp chọn đúng bằng chứng lúc debug:

| Bạn muốn biết | Bằng chứng cần ưu tiên | Một suy diễn phải tránh |
|---|---|---|
| Khối địa chỉ được đăng ký dưới tên nào | RDAP/WHOIS đúng registry và khối cụ thể | Tên đăng ký chính là máy chạy ứng dụng |
| Origin được collector thấy là gì | Prefix, toàn bộ `asns`, nguồn và thời điểm | Collector thấy tức mọi router đều chọn giống nhau |
| Request này ra Internet bằng IP nào | Log tại endpoint tin cậy, đúng phiên kết nối | IP trên Wi-Fi chính là IP nguồn ở server |
| Chặng nào đang làm request lỗi | Đo luồng dữ liệu, route ở mạng liên quan | Biết origin là đã khoanh được hop gây lỗi |
| Điểm phục vụ nằm ở đâu | Bằng chứng vận hành/đo riêng về điểm phục vụ | `country` trong RDAP là GPS của server |

## 4. Lab

### 4.1 Chuẩn bị và giữ bằng chứng

Lab chỉ đọc API công khai, không tạo container. Cần `bash`, `curl`, `python3` và Internet. Bộ script đi cùng bài đặt tại `net-lab/net-10/`; trong môi trường soạn bài nó nằm ở thư mục `projects/net-lab/net-10` cạnh repo. Người chạy chuyển cả thư mục đó tới nơi mình muốn rồi `cd` vào nó. Mọi đường `out/...` dưới đây tính từ thư mục lab; không cần sửa đường dẫn người dùng trong script.

```bash
chmod +x run.sh
./run.sh
cat out/lookup.txt
```

`run.sh` tạo `out/`, lưu JSON thô trước khi rút gọn, in môi trường và tính lại số học. Nếu API timeout hoặc HTTP lỗi, `curl -f` làm script thất bại; không thay log lỗi bằng kết quả chép từ bài. Không có container/network cần dọn ở bài này. Chạy lại ghi đè snapshot, nên sao chép `out/` sang một tên có ngày nếu cần so sánh lịch sử.

### 4.2 Cho bản sai chạy trước: chỉ đọc đăng ký

Lệnh trong script đã tải `https://rdap.apnic.net/ip/1.1.1.1` vào `out/rdap.json`. Đọc các trường xác định khối và tên:

```bash
python3 - <<'PY'
import json
r = json.load(open('out/rdap.json'))
print('RDAP', r['startAddress'], r['endAddress'],
      'name', r['name'], 'country', r.get('country'))
print('RDAP handle', r['handle'])
PY
```

Output thật, trích `out/lookup.txt`:

```text
RDAP 1.1.1.0 1.1.1.255 name APNIC-LABS country AU
RDAP handle 1.1.1.0 - 1.1.1.255
```

Đến đây bản sai “tra tên đăng ký là biết origin” có vẻ chạy được, vì luôn có một chuỗi tên để điền vào ticket. Nhưng JSON trên chưa có một thông tin quảng bá BGP nào. Không có bước xử lý chuỗi hay tra mã quốc gia nào khôi phục được thông tin mà đầu vào không chứa.

### 4.3 Thêm nguồn định tuyến, giữ cả tập ASN

Hai lệnh `curl` trong `run.sh` gọi cùng endpoint, chỉ thay `resource`. Bạn có thể chạy lại một truy vấn riêng, giữ body trước khi phân tích:

```bash
curl -fsSL --max-time 45 \
  'https://stat.ripe.net/data/network-info/data.json?resource=1.1.1.1' \
  -o out/1.1.1.1.json
```

Đoạn quyết định trong `out/lookup.txt` của lần chạy đã ghi:

```text
resource 1.1.1.1 status ok query_time 2026-11-13T04:21:49.761302
prefix 1.1.1.0/24 asns ['13335']
resource 8.8.8.8 status ok query_time 2026-11-13T04:22:11.829091
prefix 8.8.8.0/24 asns ['15169']
AS7552 holder VIETEL-AS-AP - Viettel Group announced True
```

**Thấy gì:** với IP thứ nhất, origin quan sát được có số 13335, trong khi tên đăng ký khối vẫn là APNIC-LABS. **Vì sao bản sai vỡ:** nó đánh đồng quan hệ đăng ký với thông tin khởi phát quảng bá. Không có mâu thuẫn cần “sửa” bằng cách loại một trong hai nguồn.

Đối chứng IP thứ hai kiểm rằng script không gán cứng ASN của IP thứ nhất cho mọi địa chỉ. Nó không kiểm được mọi trường hợp MOAS hay prefix không có route. Khi sửa script thành công cụ vận hành, xử lý tập rỗng, nhiều phần tử, trường thiếu và phản hồi lỗi; đừng biến một snapshot thành giả định dữ liệu luôn có đúng một phần tử.

### 4.4 Viết kết luận có thể kiểm lại

Kết luận đủ dùng cho snapshot này là: “Tra địa chỉ `1.1.1.1`, endpoint `network-info` trả `1.1.1.0/24`, tập origin `['13335']` tại thời điểm truy vấn ghi trong log. RDAP của khối ghi APNIC-LABS, AU. Chưa có phép đo đường đi của request hoặc vị trí điểm phục vụ.”

Để áp dụng cho IP của mình, thay `resource` bằng địa chỉ nguồn đã được đầu xa xác nhận, chạy lại và giữ dữ liệu nhạy cảm trong log riêng. Nếu kết quả không như kỳ vọng, trước tiên kiểm luồng ra có qua proxy/VPN không, rồi kiểm prefix và timestamp; chưa cần kết luận ISP hay API sai.

> **Chưa đo.** Lab này chưa chụp bảng BGP tại router nguồn, chưa đo latency tới hai dịch vụ, chưa thử một MOAS thực và chưa xác minh vị trí server. Đo đường nguồn bằng quyền đọc route/telemetry tại mạng liên quan; đo MOAS bằng endpoint lịch sử và nhiều vantage point; không suy ra các kết quả đó từ hai JSON trên.

## 5. Tính tay

Các phép tính dưới là **suy luận số học** từ độ rộng trường và khoảng số trong nguồn; Python đã kiểm lại tại `out/arithmetic.txt`. Không phải số lượng AS hoạt động đo trên Internet.

### 5.1 Khoảng dùng riêng có bao nhiêu giá trị?

Khoảng hai octet gồm `64512` tới `65534`, tính cả hai đầu. Một người lấy `65534 − 64512 = 1022` và báo đủ cho 1022 lab, mỗi lab một ASN. Sai ở đâu?

**Lời giải:** phép trừ đếm khoảng cách giữa hai đầu, thiếu một phần tử đầu tiên. Số giá trị là `65534 − 64512 + 1 = 1023`. Với khoảng bốn octet: `4294967294 − 4200000000 + 1 = 94967295`, tức 94.967.295 giá trị. Số lượng ấy không làm các giá trị trở thành duy nhất toàn cầu: hai tổ chức vẫn có thể chọn trùng.

### 5.2 Cùng ASN, hai kiểu in

Log A ghi `1.10`, log B ghi `65546`. Bạn đếm thành hai AS. Đổi về ASPLAIN rồi kiểm lại.

**Lời giải:** `1 × 65536 + 10 = 65546`. Hai chuỗi là cùng một ASN theo quy ước ASDOT, nên số danh tính trong phép so sánh này là một. Với `65535.65534`: `65535 × 65536 + 65534 = 4294967294`, trùng đầu trên của khoảng dùng riêng bốn octet. Không tách dấu chấm như danh sách đường đi.

### 5.3 Hai snapshot không thành một đường đi

Snapshot P của `1.1.1.1` trả tập `{13335}`, snapshot Q của `8.8.8.8` trả `{15169}`. Người trực ghép thành đường `13335 → 15169` cho request từ máy mình tới IP thứ hai. Có bao nhiêu cạnh của đường ấy đã được chứng minh?

**Lời giải:** không cạnh nào. Hai phép tra có hai đích và chỉ cho origin của từng prefix; không phép nào trả AS_PATH từ nguồn đang xét. Số ASN khác nhau trong hai tập là hai, nhưng số cạnh đường đi được chứng minh là không. Đếm được thực thể không có nghĩa biết quan hệ kết nối giữa chúng.

## 6. Chuyển giao

1. Một IP ứng dụng chuyển sang ASN khác sau khi nhà cung cấp đổi hạ tầng, còn tên RDAP giữ nguyên. Bạn cần bổ sung bằng chứng gì trước khi báo “tài nguyên bị chiếm”? Gợi ý: tách thay đổi origin khỏi quyền khởi phát và lịch sử chuyển đổi.
2. Laptop và một container cùng gọi endpoint ghi log nguồn, nhưng bạn chỉ tra IP private của container. Vì sao báo cáo origin không trả lời được nguồn của request? Gợi ý: bắt đầu từ địa chỉ mà endpoint thực sự thấy.
3. Một tổ chức có các router ở hai châu lục và nhiều prefix. Đồng nghiệp muốn cấp một ASN cho mỗi datacenter. Tiêu chí nào còn thiếu? Gợi ý: ranh giới policy, không phải số địa điểm.
4. Script trả tập ASN rỗng nhưng RDAP vẫn có dữ liệu. Cần phân biệt những khả năng nào trước khi kết luận địa chỉ chưa từng được dùng? Gợi ý: đăng ký, quan sát hiện tại và lịch sử là ba phạm vi khác nhau.
5. Hai mạng lab cùng dùng AS65001, nay muốn nối với nhau bằng BGP. Bạn sẽ kiểm và đổi những gì trước? Gợi ý: tính duy nhất trong miền kết nối và cơ chế nhận diện vòng lặp, không chỉ đổi tên container.
6. Một nguồn RIS thấy hai origin, router của ISP bạn chỉ thấy một, nhà cung cấp nói đang chuyển mạng, và RDAP vẫn mang tên cũ. Hãy thiết kế chuỗi bằng chứng để phân biệt chuyển đổi hợp lệ, sai cấu hình và hijack; nêu chính xác kết luận nào còn chưa thể đưa ra dù đã thu đủ dữ liệu bạn chọn. Đây là câu khó nhất, không có đáp án trong bài.

## 7. Tóm tắt

- AS được xác định bằng chính sách định tuyến thống nhất; số router hay datacenter không xác định số AS.
- ASN nhận diện AS; prefix mới là đối tượng đường tới được quảng bá và khớp với địa chỉ đích.
- IANA điều phối dải số, registry khu vực cấp theo quy trình; được cấp ASN chưa tạo kết nối hay route.
- RFC 6996 dành `64512–65534` và `4200000000–4294967294` cho Private Use; chúng không duy nhất toàn Internet.
- Snapshot lab `out/lookup.txt`: `1.1.1.0/24 → AS13335`, còn RDAP ghi APNIC-LABS; hai nguồn trả lời hai câu hỏi khác nhau.
- Giữ toàn bộ tập origin, prefix, nguồn và thời điểm; một tập origin không phải AS_PATH và không phải vị trí server.

→ **Bài 11 — BGP: các mạng thông báo đường cho nhau**: dựng bốn AS để nhìn AS_PATH lớn dần, rồi đổi policy làm đường dài hơn thắng.
