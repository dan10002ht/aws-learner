# Bài 12 — Transit, peering và IXP: cùng thành phố vẫn đi vòng

## 1. Mục tiêu

Sau bài này bạn có thể:

- Phân biệt dịch vụ transit, quan hệ peering và hạ tầng IXP bằng phạm vi route mà mỗi bên được phép xuất.
- Lần ngược từ một đường vòng tới chuỗi câu hỏi về kết nối, export, import và lựa chọn route.
- Giải thích tại sao hai mạng cùng có cổng tại một IXP vẫn chưa chắc trao đổi được lưu lượng trực tiếp.
- Tách đường trao đổi thông tin qua route server khỏi đường gói dữ liệu giữa hai router thành viên.
- Chạy lại lab FRR kế thừa bài 11, mở một export policy và đối chiếu BGP với bảng route Linux.
- Viết kết luận về đường vòng có giới hạn bằng chứng, không biến một traceroute thành bản hợp đồng giữa các ISP.

## 2. Triệu chứng

Server và người dùng cùng ở Hà Nội, nhưng một người báo request đi vòng qua Singapore. Đồng nghiệp đề nghị chuyển server sang datacenter gần hơn. Bạn hỏi lại: gần ai, và gần theo bản đồ hay theo đường mà mạng nguồn được phép dùng?

Ta chưa có phép đo Internet xác nhận ca Hà Nội–Singapore này. Thay vì gán địa danh cho một hostname trong traceroute, hãy dựng phần có thể kiểm chứng: r1 muốn tới `203.0.113.1` ở r4. Hai router có liên kết trực tiếp nhưng ban đầu r1 chỉ nhận đường `65002 65003 65004` qua r2. Sau khi mở export tại r4, r1 có thêm đường trực tiếp `65004`, rồi route Linux chuyển sang `10.112.14.4`.

Bản sửa sai sẽ là: “Có dây trực tiếp rồi thì gói chắc chắn đi dây đó; nếu đi vòng, dây hỏng.” Lab giữ nguyên dây và thay đúng quyền quảng bá prefix. Nếu lựa chọn thay đổi, bản sửa sai ấy không giải thích được kết quả.

> **Đo trên lab.** Bộ `net-lab/net-12`, FRRouting `10.2.1_git`, Linux `6.8.0-64-generic` aarch64 trong colima. `out/before.txt`, `out/after.txt` và `out/kernel-after.txt` ghi hai trạng thái. Đo lại bằng `./run.sh`; phiên bản và image digest ở `out/environment.txt`.

> **Chưa đo.** Chưa xác minh đường Internet thật Hà Nội–Singapore, độ trễ trên tuyến đó hoặc hợp đồng của bất kỳ nhà mạng nào. Tình huống mở bài là câu hỏi điều tra; topology lab không phải bản sao mạng địa lý ấy.

## ⏸ Dừng lại — đoán trước #1

r1 và r4 có kết nối trực tiếp. r1 vẫn dùng đường qua r2 và r3. Chứng cứ nào bác bỏ ngay kết luận “kết nối trực tiếp hỏng”?

- (a) Hai IP có cùng mã quốc gia trong cơ sở dữ liệu địa lý.
- (b) Chỉ đổi export policy tại r4, không thay liên kết, r1 bắt đầu dùng đường trực tiếp.
- (c) AS_PATH qua r2 có nhiều số hơn.
- (d) Cả hai tổ chức có tên trong danh sách thành viên một IXP.

## 3. Cơ chế

### 3.1 Một liên kết mang theo phạm vi trách nhiệm

Đáp án là **(b)**. Đường trực tiếp tồn tại chưa đủ: r1 cần được r4 thông báo prefix, chấp nhận thông báo đó và chọn nó để chuyển tiếp. [Bài 11](net-11-bgp-co-che.md) đã giải thích cơ chế lựa chọn; bài này gắn quyết định nhận/xuất route với quan hệ giữa các mạng. Ta dùng lại các thuộc tính của bài trước, không học lại cấu trúc UPDATE.

**Transit là dịch vụ một mạng cung cấp khả năng đi qua nó để tới những mạng khác trong phạm vi dịch vụ đã thỏa thuận.** Trong mô hình Internet transit thông thường, khách mua khả năng tới phần còn lại của Internet qua nhà cung cấp ([Internet Society](https://www.internetsociety.org/policybriefs/internetinterconnection/)). Nhà cung cấp có thể gửi bảng route đầy đủ, một phần bảng hoặc chỉ default route theo cách triển khai. “Mua transit” không đồng nghĩa router khách bắt buộc phải chứa toàn bộ bảng BGP toàn cầu.

Phía ngược lại cũng có trách nhiệm: nhà cung cấp nhận các prefix hợp lệ của khách và quảng bá chúng theo dịch vụ. Nếu khách gửi dữ liệu ra được nhưng prefix của khách không được bên ngoài biết đường về, dịch vụ hai chiều chưa hoàn thành. Ở lab, ta sẽ thấy vì sao phải kiểm riêng đường tới đích và đường tới địa chỉ nguồn của phép đo.

**Peering là thỏa thuận hai mạng trao đổi lưu lượng cho những prefix thuộc phạm vi đã thống nhất, thường là prefix của chính họ và khách hàng phía sau họ.** Peer không mặc nhiên nhận trách nhiệm đưa đối tác tới mọi mạng khác mà nó biết. Khác biệt gốc với transit là phạm vi được cung cấp, không phải giao thức trên dây: cả hai quan hệ đều có thể dùng eBGP và cùng loại cổng Ethernet.

**Customer cone là tập mạng khách hàng trực tiếp và gián tiếp mà một mạng cung cấp transit tới.** Trong mô hình peering thông thường, quảng bá customer cone giúp peer đưa lưu lượng đến khách của mình; nó không mở mọi đường mà mình học từ nhà cung cấp hoặc peer khác. Đây là mô hình chính sách phổ biến, không phải luật toán học áp đặt lên mọi hợp đồng Internet.

> **Nguồn.** RFC 7908 §3.2 mô tả phạm vi peering điển hình bằng cụm *“their respective customer prefixes”* ([RFC 7908](https://www.rfc-editor.org/rfc/rfc7908#section-3.2)). §2 gắn phạm vi route với chính sách và quan hệ kinh doanh. Bản tải đối chiếu: `src/rfc7908.txt`.

Vì vậy một mạng có thể biết đường tới prefix nhưng không được phép xuất đường ấy sang một peer. Thông tin ở trong bảng định tuyến và thông tin được phép giao cho hàng xóm là hai tập khác nhau. Muốn debug đúng, hỏi “route bị mất ở ranh giới export nào?” trước khi hỏi “router có biết prefix không?”.

Không suy tiền từ chữ peering. **Settlement-free peering** là hình thức hai bên không thanh toán tiền trao đổi lưu lượng cho nhau; **paid peering** là peering có thanh toán theo thỏa thuận. Ngay cả settlement-free vẫn có thể tốn cổng, đường truyền tới điểm trao đổi, thiết bị và vận hành. Tên quan hệ không cho bảng giá, tốc độ cam kết hay điều khoản SLA. Đối chiếu phân biệt thanh toán trong [APNIC](https://www.apnic.net/community/ecosystem/iorgs/number-misuse/internet-peering-and-settlements/) và chi phí hạ tầng trong [FRNIX](https://frnix.org/en/resources/common-misconceptions/).

Trong lab, gọi r2 là phía transit của r1, r4 là phía peer trực tiếp của r1. Đây là **vai trò mô hình hóa do ta đặt**, không phải FRR phát hiện hợp đồng. r2 nối qua r3 tới prefix r4. Các ASN dùng riêng, subnet nối router và prefix tài liệu chỉ có ý nghĩa trong bộ lab cô lập.

<svg font-family="ui-sans-serif, system-ui, sans-serif" viewBox="0 0 520 300" role="img" aria-labelledby="net12-a-t net12-a-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net12-a-t">Quan hệ trên topology bốn router</title>
<desc id="net12-a-d">r1 có đường qua r2 r3 tới r4 và một liên kết peer trực tiếp. Mũi tên chỉ hướng dữ liệu giả định.</desc>
<defs><marker id="net12-a-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="currentColor"/></marker></defs>
<circle cx="80" cy="100" r="28" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor"/><text x="80" y="105" fill="currentColor" font-size="14" text-anchor="middle">r1</text><circle cx="250" cy="40" r="28" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor"/><text x="250" y="45" fill="currentColor" font-size="14" text-anchor="middle">r2</text><circle cx="440" cy="100" r="28" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor"/><text x="440" y="105" fill="currentColor" font-size="14" text-anchor="middle">r3</text><circle cx="250" cy="220" r="28" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor"/><text x="250" y="225" fill="currentColor" font-size="14" text-anchor="middle">r4</text><path d="M105 85 L222 48" fill="none" stroke="currentColor" stroke-width="2"  marker-end="url(#net12-a-arrow)"/><path d="M277 48 L413 85" fill="none" stroke="currentColor" stroke-width="2"  marker-end="url(#net12-a-arrow)"/><path d="M420 121 L277 205" fill="none" stroke="currentColor" stroke-width="2"  marker-end="url(#net12-a-arrow)"/><path d="M104 120 L221 205" fill="none" stroke="#10b981" stroke-width="2"  marker-end="url(#net12-a-arrow)"/><text x="140" y="43" fill="currentColor" font-size="14" text-anchor="middle">transit</text><text x="136" y="193" fill="currentColor" font-size="14" text-anchor="middle">peer</text><text x="260" y="275" fill="currentColor" font-size="14" text-anchor="middle">Đích 203.0.113.1 tại r4; vị trí không phải địa lý</text>
</svg>

### 3.2 Export policy giải thích vì sao “biết đường” chưa thành “bán đường”

Giả sử A mua transit từ P và peering với Q. A nhận route của P để gửi lưu lượng của A ra ngoài. Nếu A đem mọi route ấy thông báo cho Q, Q có thể bắt đầu gửi lưu lượng tới các đích đó qua A. A vừa tự nhận vai trò trung chuyển giữa Q và P, dù không hề định cung cấp dịch vụ ấy.

BGP có thể vận chuyển quảng bá đó một cách hợp lệ ở mức giao thức. Vấn đề nằm ở phạm vi chính sách: A đã xuất route ngoài tập mà quan hệ với Q cho phép. **Route leak là việc quảng bá route lan vượt phạm vi được chủ định.** Bài 14 sẽ xét sự cố và biện pháp bảo vệ; ở đây chỉ cần thấy nguyên nhân khiến export filter là một phần của quan hệ kết nối.

Ở mô hình thông thường, route học từ khách có thể xuất tới nhà cung cấp, peer và khách khác; route học từ peer hoặc nhà cung cấp thường chỉ xuất xuống khách. Chuỗi này cho phép khách trả tiền để nhận khả năng đi ra ngoài, nhưng tránh biến một peer thành khách transit miễn phí. Có ngoại lệ theo hợp đồng; trước khi đánh dấu một đường là leak, phải biết chính sách mong muốn.

**Valley-free là tên mô hình đường đi theo quan hệ kinh tế: đi lên phía nhà cung cấp, có thể qua một quan hệ peer, rồi đi xuống phía khách.** Tên này chỉ giúp nhận ra hướng trách nhiệm; nó không phải trường có sẵn trong gói IP hay quy tắc tự động của BGP cơ sở. Mạng thật có quan hệ phức tạp và thỏa thuận đặc biệt, nên dùng mô hình để đặt giả thuyết, không dùng để kết tội một đường AS chỉ từ ảnh chụp bảng route.

Sau khi hiểu nhân quả, có thể dùng bảng nhỏ để đối chiếu mô hình:

| Route đã học từ | Xuất tới khách | Xuất tới peer/provider |
|---|---|---|
| Chính mình hoặc khách hợp lệ | Có, theo policy | Có, theo policy |
| Peer | Có, nếu dịch vụ cho phép | Thường không |
| Provider | Có, nếu dịch vụ cho phép | Thường không |

“Có” trong bảng vẫn đòi hỏi lọc prefix hợp lệ. Một khách khai prefix không thuộc phạm vi được cấp không tự động có quyền xuất chỉ vì nó trả tiền. Bảng cũng không mô tả thứ tự ưu tiên giữa những route đã được nhận; phần ấy đã đo ở bài 11.

Trong lab, route-map `OWN` tại r1 chỉ cho phép `198.51.100.0/24`, còn đích đang học là `203.0.113.0/24`. OWN còn yêu cầu đường có AS_PATH rỗng bằng bộ lọc LOCAL, chỉ xuất route khởi phát tại chỗ. OWN còn yêu cầu đường có AS_PATH rỗng bằng bộ lọc LOCAL, chỉ xuất route khởi phát tại chỗ. r1 không khởi phát prefix OWN ấy, nên sau khi áp route-map tới r4, tập advertised-routes phải rỗng. Ta dùng tập rỗng để thử một mệnh đề hẹp: r1 không tiếp tục xuất đích học từ transit sang peer. Đây chưa phải bộ filter production: chưa có customer cone, danh sách prefix của từng khách hoặc kiểm tra quyền khởi phát.

### 3.3 IXP nối cổng; thỏa thuận nối phạm vi route

**IXP — Internet Exchange Point — là hạ tầng trao đổi lưu lượng giữa các mạng, thường cung cấp một fabric chuyển mạch chung để router thành viên kết nối.** **Fabric** ở đây là hệ thống switch/liên kết tạo môi trường truyền giữa các cổng, không phải một AS transit mặc định. Nó giải bài toán nhiều mạng muốn gặp nhau mà không cần kéo một đường riêng tới từng đối tác.

**Public peering** là peering trên hạ tầng trao đổi dùng chung; **private peering** là kết nối dành riêng giữa các mạng. “Public” không có nghĩa người ngoài tự do gửi gói vào phiên BGP; “private” cũng không biến prefix công cộng thành IP riêng. Điểm khác nhau ở hạ tầng kết nối, còn phạm vi prefix vẫn do thỏa thuận và policy.

Cùng tham gia IXP mới chứng minh có khả năng gặp nhau trên hạ tầng đó. Muốn có đường dữ liệu trực tiếp còn phải có kết nối hoạt động, địa chỉ next hop tới được, cơ chế trao đổi route và policy cho phép. Có mạng chỉ peer có chọn lọc; có mạng chưa chấp nhận route của đối tác; có prefix chỉ quảng bá ở điểm khác. Danh sách thành viên không chứng minh một prefix cụ thể đang trao đổi tại IXP.

**Bilateral peering** là hai router thành viên thiết lập phiên trực tiếp với nhau. Với nhiều thành viên, quản lý nhiều phiên và nhiều policy lặp lại thành công việc vận hành. **Route server là hệ thống môi giới thông tin BGP giữa các thành viên, theo policy, để giảm nhu cầu thiết lập từng cặp phiên.** Nó không biến tập thành viên thành một nhà cung cấp transit chung.

## ⏸ Dừng lại — đoán trước #2

A và B trao đổi route thông qua route server R tại IXP. Theo mô hình RFC 7947, gói dữ liệu A gửi tới prefix của B đi đâu?

- (a) A → R → B vì R gửi thông tin route cho A.
- (b) A → router B qua fabric; R tham gia trao đổi thông tin, không chuyển tiếp dữ liệu đó.
- (c) A → mọi thành viên vì switch phải broadcast mọi gói IP.
- (d) A → nhà cung cấp transit của R trong mọi trường hợp.

### 3.4 Route server không phải hop dữ liệu ẩn

Đáp án là **(b)**. R nhận quảng bá từ B, áp policy rồi gửi thông tin phù hợp cho A. NEXT_HOP được giữ là router của B để A gửi frame qua fabric tới đúng hàng xóm dữ liệu. Muốn hiểu cách switch tìm cổng và cách host tìm MAC, dùng [net-02](net-02-ethernet-mac-switch.md) và [net-03](net-03-arp.md) nếu các bài ấy đã có; không cần mở lại toàn bộ lớp Ethernet ở đây.

> **Nguồn.** RFC 7947 §2.2.1 yêu cầu NEXT_HOP *“MUST be passed unmodified”*; §2.2.2.1 khuyến nghị route server không thêm ASN của chính nó ([RFC 7947](https://www.rfc-editor.org/rfc/rfc7947#section-2.2)). Bản tải: `src/rfc7947.txt`. Đây là đặc tính route server theo RFC, không phải kết quả chạy route server trong lab bài này.

Thông tin có thể đi qua R nhưng dữ liệu không đi qua R; do đó đừng đếm số phiên BGP để suy số router trên đường gói tin. Cũng đừng thấy thiếu ASN của IXP trong AS_PATH rồi kết luận không đi qua hạ tầng của IXP. Hạ tầng chuyển mạch chung không cần trở thành một hop AS trung chuyển.

<step-flow>
<svg font-family="ui-sans-serif, system-ui, sans-serif" viewBox="0 0 520 280" role="img" aria-labelledby="net12-b-t net12-b-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net12-b-t">Route qua R, dữ liệu không qua R</title>
<desc id="net12-b-d">Sơ đồ khái niệm RFC 7947, không phải route server đo trong lab.</desc>
<defs><marker id="net12-b-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="currentColor"/></marker></defs>
<circle cx="80" cy="190" r="28" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor"/><text x="80" y="195" fill="currentColor" font-size="14" text-anchor="middle">A</text><circle cx="440" cy="190" r="28" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor"/><text x="440" y="195" fill="currentColor" font-size="14" text-anchor="middle">B</text><circle cx="260" cy="50" r="28" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor"/><text x="260" y="55" fill="currentColor" font-size="14" text-anchor="middle">R</text><g data-step="1"><path d="M420 168 L283 69" fill="none" stroke="#8b5cf6" stroke-width="2"  marker-end="url(#net12-b-arrow)"/><text x="385" y="105" fill="currentColor" font-size="14" text-anchor="middle">route B → R</text></g><g data-step="2"><path d="M237 69 L101 168" fill="none" stroke="#8b5cf6" stroke-width="2"  marker-end="url(#net12-b-arrow)"/><text x="123" y="105" fill="currentColor" font-size="14" text-anchor="middle">next hop = B</text></g><g data-step="3"><path d="M109 190 L411 190" fill="none" stroke="#10b981" stroke-width="2"  marker-end="url(#net12-b-arrow)"/><text x="260" y="220" fill="currentColor" font-size="14" text-anchor="middle">Dữ liệu qua fabric A → B</text></g>
</svg>
<step-note data-step="1">B gửi thông tin prefix cho route server R; đây là control plane.</step-note>
<step-note data-step="2">R chuyển thông tin cho A theo policy, giữ next hop của B.</step-note>
<step-note data-step="3">A gửi dữ liệu tới B trên fabric, không gửi qua R.</step-note>
</step-flow>

Cơ chế này tạo một việc kiểm tra rất cụ thể. Nếu A nhận route từ R mà không chuyển tiếp được, hãy đọc NEXT_HOP và khả năng tới router B trên fabric. Ping được R chưa chứng minh tới được B. Ngược lại, R ngừng hoạt động không có nghĩa mọi frame A–B đang đi xuyên R rồi bị cắt; route có thể bị rút khi phiên mất, nhưng nguyên nhân mất route khác với một thiết bị chuyển tiếp dữ liệu bị hỏng.

Route server cũng phải áp policy giữa từng client. “Tôi kết nối route server” không có nghĩa mọi prefix của mọi client đều được gửi cho tôi. Lỗi import của A, export của B và policy của R đều có thể làm tập route nhỏ hơn danh sách thành viên. Khi điều tra, cần ghi prefix, client nguồn, client nhận và thời điểm; “route server đang up” quá chung để xác định một đường cụ thể.

### 3.5 Từ policy tới đường vòng: đặt địa lý vào đúng chỗ

Hãy đặt tên hai đầu là Hà Nội và một điểm trung chuyển là Singapore, nhưng ghi rõ đó là **suy luận topology**, không phải số đo của lab. Nếu mạng nguồn chỉ có route được chấp nhận qua upstream tại điểm trung chuyển, gói tin có thể đi ra đó rồi quay về mạng đích trong cùng thành phố. Router không tự thêm một đường vì hai địa chỉ cùng được gắn tọa độ Hà Nội.

Có nhiều cơ chế khác cũng tạo dấu hiệu tương tự: hai mạng có peering ở địa điểm khác, backbone nội bộ mang gói tới chỗ thoát, hoặc một đường địa phương bị rút khiến transit dự phòng được chọn. Cần dữ liệu tại thời điểm xảy ra để phân biệt. Một đường AS ngắn chưa đủ để xác định đoạn cáp, và hostname có tên thành phố chưa đủ để định vị thiết bị.

**Looking glass là giao diện công khai cho phép quan sát route hoặc chạy phép đo từ một mạng khác.** Nó hữu ích vì BGP là quyết định tại từng mạng: kết quả từ máy bạn chưa phản ánh kết quả từ ISP của người báo lỗi. Chọn điểm đo gần nguồn thật theo mạng, giữ thời gian và prefix để đối chiếu; một looking glass ở cùng quốc gia nhưng khác ISP vẫn là điểm nhìn khác.

Quy trình từ triệu chứng tới bằng chứng nên đi thành chuỗi. Trước hết cố định IP đích, vì DNS có thể trả địa chỉ khác giữa hai lần đo. Sau đó lấy traceroute và RTT từ đúng nguồn, cùng thời điểm kiểm route của ISP nguồn nếu có quyền hoặc looking glass. Tiếp theo hỏi đường trực tiếp có được quảng bá và chấp nhận không. Chỉ khi đã xác nhận route trực tiếp đủ điều kiện mà vẫn không thắng mới quay lại tiêu chí lựa chọn của bài 11.

Đường về cần bộ bằng chứng riêng. RTT là thời gian khứ hồi; forward traceroute không đo riêng chiều trả lời của toàn request. Khi RTT giảm sau khi mở peering, có thể cả hai chiều cùng thay đổi, hoặc chỉ một chiều. Không lấy một đường đi làm chứng cứ rằng cả hai chiều cùng chạy trên đó.

## 4. Lab

### 4.1 Dựng lại từ nền bài 11

Bộ thực hành ở `net-lab/net-12/`; `run.sh` dựng topology, chờ route, thu output và dọn các container/network có tiền tố `net12-` bằng trap. Chạy trên máy có Docker và image FRR đã nêu:

```bash
cd /path/to/net-lab/net-12
./run.sh | tee out/replay.txt
```

Script kế thừa bốn router và liên kết `12`, `23`, `34`, `14` từ `net-11`. Địa chỉ link đổi thành `10.112.<link>.<router>`, để hai lab không dùng chung subnet. r4 có `203.0.113.1/24` trên loopback và khởi phát prefix thật sự có trong kernel; bật IPv4 forwarding lúc tạo container. Mọi network Docker dùng `--internal`, không quảng bá prefix lab ra Internet.

Ta còn thêm route tĩnh chiều về từ r4 tới `10.112.12.0/24` qua r1, và từ r3 tới subnet đó qua r2. Địa chỉ nguồn khi r1 ping qua r2 nằm trên link `12`; nếu không có đường về thì ping có thể mất dù đường đi đã có. Sự bất đối xứng này là chủ ý để phép đo đơn giản; lab không đo cùng chiều dài hai đường khứ hồi. Nó cũng là lý do không dùng ping ở đây để suy ra vị trí hay khoảng cách vật lý.

Phạm vi export mô hình hóa: ban đầu r4 chặn đích tới r1 trên link `14`, nhưng vẫn xuất qua r3. r1 chặn xuất đích ấy về r2 bằng policy OWN. Các router còn lại là giàn thử nghiệm permissive; không coi chúng là mẫu policy Internet hoàn chỉnh. `no bgp ebgp-requires-policy` chỉ phục vụ lab cô lập.

### 4.2 Cho giả thuyết “có dây là có route” thất bại trước

Sau khi chờ r1 thấy đường dài, script chạy:

```bash
docker exec net12-r1 vtysh \
  -c 'show bgp ipv4 unicast 203.0.113.0/24'
```

Trích `out/before.txt`, chỉ giữ dòng quyết định:

```text
Paths: (1 available, best #1, table default)
  65002 65003 65004
    10.112.12.2 from 10.112.12.2 (10.255.0.2)
      Origin IGP, valid, external, best (First path received)
```

r1 có đúng một ứng viên. Kiểm dây trực tiếp không làm xuất hiện ứng viên thứ hai, vì r4 đang áp `BLOCK out` cho hàng xóm r1 trong address family IPv4. Đây là lỗi trong giả thuyết, chưa phải lỗi của router: route không thể thắng nếu chưa được nhận.

`ping-before.txt` ghi ba probe đều có phản hồi. Điều này kiểm tra khả năng chuyển tiếp tới địa chỉ loopback trong topology đang có, không kiểm chứng hợp đồng transit hay chứng minh mỗi hop thuộc thành phố nào. Muốn biết đường đi cụ thể từ data plane, cần thêm capture hoặc traceroute ở lab; bài này dựa vào bảng BGP và route kernel để chứng minh thay đổi policy.

### 4.3 Mở export, giữ nguyên link

Tại r4, thay `BLOCK` bằng `OWN` cho r1 rồi yêu cầu quảng bá lại. `OWN` tại r4 chỉ cho prefix đích đã khai báo:

```bash
docker exec net12-r4 vtysh -c 'conf t' \
  -c 'router bgp 65004' -c 'address-family ipv4 unicast' \
  -c 'neighbor 10.112.14.1 route-map OWN out'
docker exec net12-r4 vtysh -c 'clear bgp 10.112.14.1 soft out'
```

Script chờ best path mới, không lấy một lệnh ngủ cố định làm bằng chứng hội tụ. Trích `out/after.txt`:

```text
Paths: (2 available, best #1, table default)
  65004
    10.112.14.4 from 10.112.14.4 (10.255.0.4)
      Origin IGP, metric 0, valid, external, best (AS Path)
  65002 65003 65004
    10.112.12.2 from 10.112.12.2 (10.255.0.2)
```

Bảng giờ có hai đường, rồi quy tắc đã học ở bài 11 chọn đường trực tiếp với cấu hình hiện tại. Không có ưu tiên RTT tự động và không có phép đọc địa chỉ địa lý. Đối chiếu `out/kernel-after.txt`:

```text
203.0.113.0/24 nhid 8 via 10.112.14.4 dev eth1 proto bgp metric 20
```

`nhid` là định danh next-hop do kernel quản lý và có thể đổi giữa các lượt; điều phải giữ là prefix cùng next hop trực tiếp. Nếu best BGP đã đúng mà kernel chưa cài, ta chưa thể kết luận gói dữ liệu đã chuyển đường. Khi chạy lại, đợi route kernel khớp trước khi dùng phép đo ứng dụng để đưa ra kết luận.

<step-flow>
<svg font-family="ui-sans-serif, system-ui, sans-serif" viewBox="0 0 520 550" role="img" aria-labelledby="net12-c-t net12-c-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net12-c-t">Đường cũ biến mất khỏi lựa chọn khi đường trực tiếp thắng</title>
<desc id="net12-c-d">Topology cố định đủ bốn router và bốn link. Năm bước tách export đóng, UPDATE, hai ứng viên, kernel đổi và đường dự phòng còn tồn tại.</desc>
<defs><marker id="net12-rev-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="currentColor"/></marker></defs><g stroke="currentColor" stroke-opacity="0.25" stroke-width="2" fill="none"><path d="M118 130 H402 M430 158 V382 M402 410 H118 M90 382 V158"/></g><circle cx="90" cy="130" r="28" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor"/><text x="90" y="135" text-anchor="middle" fill="currentColor" font-size="14">r1</text><circle cx="430" cy="130" r="28" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor"/><text x="430" y="135" text-anchor="middle" fill="currentColor" font-size="14">r2</text><circle cx="430" cy="410" r="28" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor"/><text x="430" y="415" text-anchor="middle" fill="currentColor" font-size="14">r3</text><circle cx="90" cy="410" r="28" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor"/><text x="90" y="415" text-anchor="middle" fill="currentColor" font-size="14">r4</text><text x="260" y="34" text-anchor="middle" fill="currentColor" font-size="14">Đích tại r4: 203.0.113.0/24</text><text x="260" y="98" text-anchor="middle" fill="currentColor" font-size="14">transit</text><text x="475" y="275" text-anchor="middle" fill="currentColor" font-size="14">transit</text><text x="260" y="451" text-anchor="middle" fill="currentColor" font-size="14">transit</text><text x="40" y="275" text-anchor="middle" fill="currentColor" font-size="14">peer</text><g data-step="1" data-until="2"><path d="M118 130 H402" fill="none" stroke="#f59e0b" stroke-width="3"  marker-end="url(#net12-rev-arrow)"/><path d="M430 158 V382" fill="none" stroke="#f59e0b" stroke-width="3"  marker-end="url(#net12-rev-arrow)"/><path d="M402 410 H118" fill="none" stroke="#f59e0b" stroke-width="3"  marker-end="url(#net12-rev-arrow)"/></g><g data-step="1" data-until="1"><text x="260" y="215" text-anchor="middle" fill="currentColor" font-size="14">Export peer đóng</text><text x="260" y="246" text-anchor="middle" fill="currentColor" font-size="14">Gói: r1 → r2 → r3 → r4</text><text x="260" y="277" text-anchor="middle" fill="currentColor" font-size="14">65002 65003 65004</text></g><g data-step="2" data-until="2"><path d="M90 382 V158" fill="none" stroke="#8b5cf6" stroke-width="3" stroke-dasharray="6 4" marker-end="url(#net12-rev-arrow)"/><text x="260" y="215" text-anchor="middle" fill="currentColor" font-size="14">Mở export r4 → r1</text><text x="260" y="246" text-anchor="middle" fill="currentColor" font-size="14">UPDATE: 203.0.113.0/24</text><text x="260" y="277" text-anchor="middle" fill="currentColor" font-size="14">Đường dài vẫn là best cũ</text></g><g data-step="3" data-until="3"><text x="260" y="209" text-anchor="middle" fill="currentColor" font-size="14">Hai ứng viên tại r1</text><text x="260" y="241" text-anchor="middle" fill="currentColor" font-size="14">65004 thắng: best (AS Path)</text><text x="260" y="273" text-anchor="middle" fill="currentColor" font-size="14">65002 65003 65004 còn đó</text></g><g data-step="3"><path d="M90 158 V382" fill="none" stroke="#10b981" stroke-width="3"  marker-end="url(#net12-rev-arrow)"/></g><g data-step="4" data-until="4"><text x="260" y="209" text-anchor="middle" fill="currentColor" font-size="14">Đường trực tiếp là best</text><text x="260" y="241" text-anchor="middle" fill="currentColor" font-size="14">Kernel: via 10.112.14.4</text><text x="260" y="273" text-anchor="middle" fill="currentColor" font-size="14">Gói mới: r1 → r4</text></g><g data-step="5"><path d="M118 130 H402" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="5 5" opacity="0.45" marker-end="url(#net12-rev-arrow)"/><path d="M430 158 V382" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="5 5" opacity="0.45" marker-end="url(#net12-rev-arrow)"/><path d="M402 410 H118" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="5 5" opacity="0.45" marker-end="url(#net12-rev-arrow)"/><text x="260" y="209" text-anchor="middle" fill="currentColor" font-size="14">Đường dài: ứng viên dự phòng</text><text x="260" y="241" text-anchor="middle" fill="currentColor" font-size="14">Không bị rút khỏi BGP</text><text x="260" y="273" text-anchor="middle" fill="currentColor" font-size="14">Best/kernel vẫn qua r4</text></g><text x="260" y="503" text-anchor="middle" fill="currentColor" font-size="13">Liền xanh: đường chọn; đứt mờ: dự phòng</text>
</svg>
<step-note data-step="1">Export trực tiếp bị chặn nên r1 chỉ nhận đường <code>65002 65003 65004</code>. Gói đi qua r2 và r3 tới r4.</step-note>
<step-note data-step="2">Mở export trên link peer đưa UPDATE từ r4 tới r1; dây không thay đổi. Bước này tách việc nhận thông tin khỏi việc đổi đường chuyển tiếp.</step-note>
<step-note data-step="3"><code>out/after.txt</code> ghi hai ứng viên và <code>best (AS Path)</code> cho đường <code>65004</code>; không đặt LOCAL_PREF mới trong lab này.</step-note>
<step-note data-step="4">Đường dài không còn là đường được chọn; kernel cài <code>via 10.112.14.4</code> theo <code>out/kernel-after.txt</code>.</step-note>
<step-note data-step="5">Đường dài vẫn có trong bảng BGP, chỉ mất vai trò best. Nét đứt mờ biểu diễn ứng viên dự phòng, không phải route đã bị rút.</step-note>
</step-flow>

### 4.4 Thu hẹp quyền xuất tại r1

Cuối lab, script áp OWN của r1 tới peer r4. OWN này chỉ cho `198.51.100.0/24`, không cho đích đã học từ r2/r4. r1 cũng không khởi phát prefix được cho phép, nên tập xuất rỗng là kết quả mong đợi:

```bash
docker exec net12-r1 vtysh \
  -c 'show bgp ipv4 unicast neighbors 10.112.14.4 advertised-routes json'
```

Trích dòng kết quả ở `out/export.txt`:

```text
{"advertisedRoutes":{},"totalPrefixCounter":0,"filteredPrefixCounter":0}
```

Phải đọc advertised-routes theo đúng neighbor và address family. Dòng “Advertised to non peer-group peers” trong bản xem prefix không thay thế kiểm tra tập route được xuất sau policy cho từng neighbor. Lệnh cụ thể giúp tránh lấy trạng thái BGP tổng quát làm bằng chứng về quyền xuất.

Thí nghiệm cuối không cần tạo lưu lượng lớn hay để một leak lan ra ngoài. Nó cho thấy một router biết prefix vẫn có thể không xuất nó sang peer. Muốn mở rộng, thêm một prefix hợp lệ của r1, đưa vào OWN và xác nhận chỉ prefix ấy xuất hiện; đừng thay OWN bằng permit-all chỉ để bảng trông có dữ liệu.

> **Suy luận.** Lab chứng minh liên kết trực tiếp và route được phép nhận là hai điều kiện khác nhau. Nó không chạy fabric IXP hoặc route server; phần IXP/route server dựa RFC 7947. Nó cũng không đo giá transit, tốc độ cổng hay RTT xuyên quốc gia.

## 5. Tính tay

### 5.1 Bao nhiêu phiên nếu mọi cặp cùng peer?

Giả sử một fabric có tám router thành viên; mọi cặp đều muốn một phiên bilateral, không trùng cặp và không dùng route server. Có bao nhiêu phiên? Nếu mỗi thành viên dùng một phiên tới một route server thì còn bao nhiêu?

**Lời giải — suy luận tổ hợp:** mỗi router có bảy đối tác, nhưng đếm như vậy mỗi cặp bị tính hai lần. `8 × 7 / 2 = 28` phiên bilateral, so với `8` phiên client–server. Chênh `20` phiên. Đây là số phiên trong mô hình đề bài, không phải số cổng vật lý hoặc số hop dữ liệu. Nếu dùng hai route server để dự phòng và mỗi client nối cả hai, cần `8 × 2 = 16` phiên client–server, chưa tính việc quản lý policy khác.

### 5.2 Bao nhiêu lưu lượng chuyển sang peer?

Bài toán giả định: lưu lượng ra tổng cộng `600 Mbit/s`, trong đó `180 Mbit/s` tới customer cone được một peer quảng bá. Nếu toàn bộ phần đó chuyển từ transit sang peer và tổng tải không đổi, transit còn bao nhiêu? Có thể nói hóa đơn giảm cùng tỷ lệ không?

**Lời giải — suy luận theo giả thiết:** `600 − 180 = 420 Mbit/s`; phần được chuyển là `180 / 600 × 100 = 30%`. Không đủ dữ liệu để suy hóa đơn giảm `30%`: hợp đồng có thể có cam kết tối thiểu, cách tính đỉnh, và chi phí cổng peering. Bài tính chỉ bảo toàn lưu lượng ở thời điểm xét, không định giá dịch vụ.

### 5.3 Route tồn tại nhưng không được xuất

Giả sử A biết năm prefix: hai của khách, một của chính A, một học từ peer và một học từ provider. Theo mô hình export thông thường trong §3.2, tối đa bao nhiêu prefix trong tập này được xuất cho một peer khác, nếu mọi prefix đều hợp lệ và không có filter bổ sung?

**Lời giải — suy luận chính sách:** `2 + 1 = 3` prefix. Hai prefix học từ peer/provider không thuộc phạm vi được xuất trong giả thiết. Không suy ra số UPDATE hoặc số gói TCP từ con số này; nhiều prefix có thể được đóng gói hoặc gửi theo các thay đổi khác nhau. Kết quả là kích thước tập được phép xuất, không phải số thông điệp trên dây.

## 6. Chuyển giao

1. ISP nói đã mở peering nhưng route tới đúng IP dịch vụ vẫn qua transit. Bạn cần hỏi những tập prefix và policy nào ở hai đầu, thay vì chỉ yêu cầu ảnh phiên Established?
2. Một máy chủ nằm trong cùng tòa nhà với nguồn nhưng nằm sau mạng không có kết nối trực tiếp được chấp nhận. Những dữ kiện nào có thể khiến việc đổi tòa nhà không giảm đường vòng?
3. Ping route server thành công, còn router của peer không trả lời. Bạn thu gì để phân biệt filter ICMP với lỗi tới next hop? Gợi ý: cần kiểm dữ liệu tới prefix đích, không chỉ ICMP tới cổng quản trị.
4. ASN của IXP không có trong AS_PATH. Kết luận “lưu lượng không qua IXP” thiếu phân biệt nào giữa fabric, route server và mạng transit?
5. Sau khi mở peering, RTT khứ hồi giảm nhưng traceroute chiều đi gần như không đổi. Hãy đưa ra một giả thuyết về chiều về và nêu phép đo cần để kiểm, không coi giả thuyết là kết luận.
6. Bạn có dữ liệu BGP từ hai looking glass, traceroute từ ba ISP và một đợt đổi export trùng thời điểm nghẽn backbone. Thiết kế cách phân biệt tác động của export, điểm thoát nội bộ và nghẽn; nêu bằng chứng nào vẫn chưa cho phép khẳng định một tuyến vật lý qua Singapore. Đây là câu khó nhất, không có đáp án trong bài.

## 7. Tóm tắt

- Transit và peering khác nhau ở phạm vi khả năng tới mạng được cung cấp; cùng dùng eBGP không khiến hai quan hệ giống nhau.
- Prefix biết được chưa chắc được phép xuất; quan hệ thông thường cho phép xuất prefix của mình và khách tới peer, không xuất mọi route của provider.
- IXP cung cấp nơi trao đổi, không mặc nhiên cấp quyền peering hoặc full Internet transit cho mọi thành viên.
- Route server theo RFC 7947 trao đổi thông tin và giữ NEXT_HOP của client; dữ liệu đi giữa router thành viên qua fabric.
- Lab mở export r4 → r1 làm r1 có đường trực tiếp và cài next hop `10.112.14.4`, ghi tại `out/after.txt` và `out/kernel-after.txt`.
- Muốn khẳng định đường vòng địa lý phải thu bằng chứng theo nguồn, đích và thời điểm; quốc gia đăng ký IP không xác định đường gói tin.

→ **Bài 13 — Anycast: một IP ở nhiều nơi**: cùng cơ chế quảng bá và policy, nhưng nhiều điểm phục vụ đồng thời đưa ra đường tới cùng địa chỉ dịch vụ.
