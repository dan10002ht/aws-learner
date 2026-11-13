# Bài 13 — Anycast: cùng một IP, request tới site nào?

## 1. Mục tiêu

Sau bài này bạn có thể:

- Giải thích cách các điểm phục vụ khác nhau nhận lưu lượng gửi tới cùng một IP mà không có bộ chuyển tiếp trung tâm bắt buộc.
- Dự đoán site được chọn từ route và policy tại nguồn, thay vì lấy khoảng cách địa lý làm tiêu chí mặc định.
- Phân biệt thay đổi đường đi, thay đổi câu trả lời DNS và thay đổi backend sau một load balancer.
- Dựng hai dịch vụ cùng địa chỉ trong lab FRR, đọc định danh site trước và sau thay đổi quảng bá.
- Chứng minh ứng dụng chết không tự làm BGP rút route, rồi thử rút quảng bá để request mới chuyển site.
- Nêu giới hạn của failover anycast đối với kết nối đang mở, dữ liệu cục bộ và năng lực chịu tải của site còn lại.

## 2. Triệu chứng

Bạn gọi `http://203.0.113.1:8080` từ r1. Lần đầu response là `site-3`. Sau khi mở quảng bá trên liên kết trực tiếp, cùng URL trả `site-4`. Bạn dừng HTTP server ở site-4: request mới báo `Connection refused`, trong khi route kernel vẫn trỏ tới site-4. Chỉ khi rút prefix do site-4 khởi phát, request mới lại trả `site-3`.

Địa chỉ đích không đổi, không sửa DNS, không có reverse proxy đứng giữa hai site để chuyển HTTP request. Lời giải sai thường là: “Anycast tự kiểm tra ứng dụng, nên một IP nhiều nơi đồng nghĩa failover ứng dụng tự động.” Lab cho phiên bản sai ấy chạy trước: tắt ứng dụng và giữ nguyên quảng bá. Nó thất bại ngay ở ranh giới giữa khả năng định tuyến và khả năng phục vụ.

> **Đo trên lab.** Bộ `net-lab/net-13`, FRRouting `10.2.1_git`, Linux `6.8.0-64-generic` aarch64 trong colima, dịch vụ HTTP chạy bằng image `node:22-bookworm-slim` trong network namespace của từng site. Chuỗi bằng chứng ở `out/site-before.txt`, `out/site-direct.txt`, `out/app-down.txt`, `out/route-app-down.txt` và `out/site-failover.txt`. Đo lại: `./run.sh`.

Bài [12](net-12-transit-peering-ixp.md) đã cho thấy có link chưa đủ có đường tới prefix. Bài này đi thêm một bước: cùng prefix có thể dẫn tới các điểm phục vụ độc lập; việc chọn đường có thể đồng thời trở thành việc chọn site.

## ⏸ Dừng lại — đoán trước #1

Hai site cùng phục vụ một IP. Site đang được chọn dừng HTTP server, còn router và phiên BGP tiếp tục hoạt động. Nếu không có hệ thống gắn health check với quảng bá, điều gì chắc chắn xảy ra?

- (a) BGP tự gửi HTTP request rồi bỏ site lỗi.
- (b) Resolver đổi câu trả lời DNS sang một IP khác.
- (c) Không có bảo đảm đổi site; route vẫn có thể đưa request tới nơi không phục vụ.
- (d) Mỗi request được nhân đôi tới cả hai site để chọn response thành công.

## 3. Cơ chế

### 3.1 Một địa chỉ dịch vụ, nhiều nơi nhận gói

Đáp án là **(c)**. BGP không biết HTTP server có đang listen hay trả dữ liệu đúng. Nó xử lý thông tin khả năng tới prefix; muốn thông tin ấy phản ánh sức khỏe dịch vụ, cần một cơ chế nối hai trạng thái.

**Anycast là cách làm cho cùng một địa chỉ dịch vụ có mặt ở nhiều địa điểm độc lập, để hệ thống định tuyến đưa gói tới một trong các địa điểm có thể tới.** Địa chỉ trong gói IP không cần chứa tên site. Router chỉ làm việc đã học: tra bảng chuyển tiếp cho địa chỉ đích rồi gửi tới next hop được chọn.

**Service address là địa chỉ IP mà client dùng để gọi dịch vụ; anycast node là một điểm phục vụ độc lập tham gia cung cấp dịch vụ tại địa chỉ ấy.** Trong bài, gọi node là **site** để tránh nhầm với một tiến trình Node.js. Một site có thể chứa nhiều host, router và load balancer nội bộ; một site không nhất thiết chỉ là một server.

> **Nguồn.** RFC 4786 §2 định nghĩa anycast qua cụm *“multiple, discrete, autonomous locations”* ([RFC 4786](https://www.rfc-editor.org/rfc/rfc4786#section-2)). §3.1 giải thích hệ thống định tuyến chọn điểm phục vụ theo topology và điểm xuất phát. Bản tải: `src/rfc4786.txt`.

Hai site cùng cấu hình địa chỉ dịch vụ không có nghĩa chúng tranh địa chỉ trên cùng một LAN. Trong lab, IP `203.0.113.1/24` được gắn loopback ở hai container có network namespace riêng. Chúng không cùng phát ARP để giành một IP trên cùng bridge dịch vụ. Mỗi site khởi phát route tới cùng prefix; các router bên ngoài nhận đường tới prefix đó qua những hàng xóm khác nhau.

Mạng công cộng có thể triển khai nhiều site trong cùng một AS, với cùng origin ASN nhìn từ bên ngoài. Lab dùng AS65003 và AS65004 làm hai origin riêng để nhìn được đường dẫn tới từng site bằng FRR. Đây là lựa chọn sư phạm trong môi trường cô lập, không phải yêu cầu anycast phải có nhiều origin ASN. Cũng không được lấy “cùng origin” làm chứng cứ tất cả gói tới một datacenter.

**Unicast** theo cách đối chiếu ở đây là một địa chỉ dịch vụ gắn với một điểm đến được định tuyến; **multicast** là phân phối tới một nhóm người nhận theo cơ chế nhóm; anycast chọn một điểm phục vụ bằng định tuyến, không nhân bản request tới mọi site. Nếu router dùng multipath, các flow có thể tới site khác nhau; điều đó vẫn không phải gửi mọi gói tới mọi site.

Trong lab, r3 và r4 cùng sở hữu địa chỉ dịch vụ. Đường tới r3 là r1 → r2 → r3; đường tới r4 có nhánh trực tiếp r1 → r4. Ban đầu export trực tiếp của r4 bị chặn nên r1 chọn site-3 qua r2. Khi mở export, đường trực tiếp thắng với cấu hình hiện tại và request mới tới site-4. Không cần sửa tham số nào trong HTTP client.

<svg font-family="ui-sans-serif, system-ui, sans-serif" viewBox="0 0 520 300" role="img" aria-labelledby="net13-a-t net13-a-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net13-a-t">Cùng địa chỉ tại hai site độc lập</title>
<desc id="net13-a-d">r1 có thể tới cùng service address qua r2 r3 hoặc tới r4 trực tiếp. Hai địa chỉ dịch vụ không nằm trên cùng LAN.</desc>
<defs><marker id="net13-a-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="currentColor"/></marker></defs>
<circle cx="70" cy="65" r="28" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor"/><text x="70" y="70" fill="currentColor" font-size="14" text-anchor="middle">r1</text><circle cx="260" cy="65" r="28" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor"/><text x="260" y="70" fill="currentColor" font-size="14" text-anchor="middle">r2</text><circle cx="440" cy="190" r="28" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor"/><text x="440" y="195" fill="currentColor" font-size="14" text-anchor="middle">r3</text><circle cx="70" cy="190" r="28" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor"/><text x="70" y="195" fill="currentColor" font-size="14" text-anchor="middle">r4</text><path d="M99 65 H231" fill="none" stroke="currentColor" stroke-width="2"  marker-end="url(#net13-a-arrow)"/><path d="M282 84 L416 172" fill="none" stroke="currentColor" stroke-width="2"  marker-end="url(#net13-a-arrow)"/><path d="M70 94 V161" fill="none" stroke="currentColor" stroke-width="2"  marker-end="url(#net13-a-arrow)"/><text x="240" y="150" fill="currentColor" font-size="14" text-anchor="middle">Bảng route chọn một đường</text><text x="440" y="240" fill="currentColor" font-size="14" text-anchor="middle">203.0.113.1</text><text x="90" y="240" fill="currentColor" font-size="14" text-anchor="middle">203.0.113.1</text><text x="260" y="275" fill="currentColor" font-size="14" text-anchor="middle">Hai loopback ở hai namespace riêng</text>
</svg>

Phần “cùng dịch vụ” thuộc trách nhiệm vận hành ứng dụng. Site phải có listener, cấu hình chứng chỉ nếu dùng TLS, dữ liệu và logic đủ để phục vụ request được đưa tới. Quảng bá một IP ở nơi chưa có dịch vụ sẽ thu hút gói tới một chỗ chưa sẵn sàng. Có route là điều kiện đưa request đến, không phải giấy chứng nhận response đúng.

### 3.2 “Gần nhất” là kết quả định tuyến, chưa phải số kilomet

**Catchment là tập nguồn mà hệ thống định tuyến hiện tại đưa tới cùng một anycast site.** Ranh giới catchment có thể đổi khi policy, kết nối hoặc tập quảng bá thay đổi. Nó không phải một vòng tròn địa lý vẽ quanh datacenter.

Nếu ISP A thích đường peer tới site X hơn đường transit tới site Y, người dùng của A có thể tới X dù Y gần hơn theo bản đồ. [Bài 11](net-11-bgp-co-che.md) đã đo tác động ưu tiên policy trước độ dài đường AS; không có bước mặc định nào trong lab đo RTT HTTP để tìm site. Vì vậy cụm “anycast tới server gần nhất” chỉ dùng được khi nói rõ gần theo đường được hệ thống chọn, không mặc nhiên là latency nhỏ nhất.

> **Suy luận.** Ghép cơ chế lựa chọn route đã đo ở bài 11 với định nghĩa catchment của RFC 4786 §2: đổi policy tại một mạng nguồn có thể đổi site cho tập người dùng của mạng đó mà không di chuyển server. Kiểm bằng thay policy trong lab và giữ nguyên service address; chưa đo catchment trên Internet thật.

Sự thay đổi còn có thể chỉ xảy ra ở một nhóm nguồn. Một site rút quảng bá ở một điểm kết nối chưa chắc rút mọi quảng bá của site ấy ở mọi điểm khác. Một mạng nguồn học route mới chưa chắc mạng khác đã hội tụ cùng lúc. Bởi vậy báo cáo sự cố cần ghi nguồn đo, site ID và thời điểm, thay vì viết “IP này đang ở site X” như một thuộc tính toàn cầu.

**Site ID là định danh ứng dụng trả về để nhận biết điểm phục vụ request cụ thể.** Lab dùng body `site-3` và `site-4`. Production có thể dùng header hoặc endpoint chẩn đoán theo thiết kế; định danh phải tương ứng nơi xử lý thật, không chỉ tên của một proxy chung. Site ID bổ sung một bằng chứng mà IP đích không cung cấp: cùng địa chỉ nhưng request vừa được xử lý tại đâu.

Bảng đối chiếu chỉ có ý nghĩa sau khi xác định lớp quyết định:

| Cách phân phối | Điều thay đổi để chọn điểm phục vụ | Client thấy gì |
|---|---|---|
| Anycast trong bài | Route tới cùng service address | IP đích giữ nguyên, site có thể đổi |
| DNS-based routing | Câu trả lời DNS và thời gian cache | Client có thể nhận IP khác |
| Load balancer ở một site | Backend được LB chọn | Route tới frontend có thể giữ nguyên |

Ba cách có thể kết hợp. Một IP anycast có thể tới load balancer của site, rồi LB chọn backend; DNS vẫn có thể trả IP anycast đó. Không có mâu thuẫn vì mỗi lớp giải một quyết định khác. Bài này không dạy lại DNS, không đo cache DNS và không giải thuật chọn backend của LB; các cơ chế ấy thuộc bài 20–21 và 24.

### 3.3 Địa chỉ nổi tiếng không cho bạn một số lượng site cố định

`1.1.1.1` được nhà vận hành mô tả là chạy trên mạng anycast của họ ([bài công bố của Cloudflare](https://blog.cloudflare.com/dns-resolver-1-1-1-1/)); RFC 4786 §1 ghi nhận việc dùng anycast ở DNS root. Nhưng một địa chỉ không mã hóa số instance, và danh sách instance là dữ liệu vận hành có thể đổi. Ở đây không gắn một con số “hàng trăm điểm” với phép đo từ máy lab, vì lab chỉ dựng hai site và chưa kiểm kê mạng công cộng.

Muốn kiểm chứng một triển khai cụ thể, lấy tài liệu của chính nhà vận hành, ghi ngày tra và tách số location, số máy chủ, số instance. Một điểm địa lý có thể chứa nhiều server; một tên DNS root không tương đương một máy vật lý. Chỉ đếm địa chỉ trả về từ DNS sẽ bỏ qua sự nhân rộng phía dưới cùng một IP.

> **Chưa đo.** Lab không truy vấn để xác định instance phục vụ `1.1.1.1` hoặc một DNS root, không đếm số site công cộng và không đo độ ổn định catchment. Muốn bổ sung, dùng endpoint nhận diện do nhà vận hành công bố và quan sát từ nhiều mạng nguồn; một điểm đo không đủ để suy tổng số site.

Để cơ chế không phụ thuộc tên dịch vụ, hãy giữ hai tình huống đối chiếu. Một truy vấn ngắn, độc lập có thể được xử lý ở site mới nếu client gửi lại sau khi đường đổi. Một stream dài đã có trạng thái tại site cũ thì site mới không tự có trạng thái đó. Bài toán không nằm ở tên DNS hay HTTP, mà nằm ở lượng trạng thái cần giữ qua thời gian route có thể thay đổi.

### 3.4 Mất đường và mất dịch vụ là hai tín hiệu khác nhau

Khi liên kết xuống hoặc phiên BGP mất, hệ thống định tuyến có cơ chế loại đường theo cấu hình và các bộ định thời tương ứng. Nhưng khi tiến trình HTTP dừng, loopback, route connected và phiên BGP có thể vẫn sống. Nếu quảng bá còn, router từ xa vẫn làm đúng khi gửi tới site ấy.

**Health check là phép kiểm dịch vụ có đáp ứng một điều kiện phục vụ được định nghĩa hay không.** Nó có thể chỉ kiểm cổng TCP, hoặc thực sự gọi một thao tác ứng dụng. Kiểm cổng phát hiện không có listener; nó chưa chứng minh database, nội dung, quyền truy cập hay dependency hoạt động đúng. Thiết kế phải nói điều gì đủ để tiếp tục nhận lưu lượng.

Muốn sức khỏe ảnh hưởng anycast, bộ điều khiển cần chuyển kết quả health check thành hành động quảng bá: site sẵn sàng thì được xuất route, site không phục vụ thì rút route hoặc ngừng xuất theo phạm vi phù hợp. Việc này có thể nằm trên host dịch vụ hoặc trong hệ thống điều khiển riêng. BGP không tự suy ra từ việc HTTP trả lỗi.

> **Nguồn.** RFC 4786 §4.4.1 bàn việc gắn khả năng phục vụ với quảng bá và rút route; §4.8 nêu khó khăn khi một prefix bao nhiều dịch vụ ([RFC 4786](https://www.rfc-editor.org/rfc/rfc4786#section-4.4.1)). Bản tải: `src/rfc4786.txt`. Lab dưới đây dùng thao tác thủ công để tách rõ hai trạng thái, chưa triển khai bộ health controller.

**Hysteresis là việc dùng điều kiện vào/ra khác nhau hoặc yêu cầu tín hiệu ổn định trước khi đổi trạng thái, để tránh dao động quanh ngưỡng.** Với anycast, một probe lỗi không nhất thiết nên lập tức làm toàn site rút prefix; một probe thành công chưa chắc đủ để nhận lại tải. Chính sách giữ/rút phải cân bằng thời gian phát hiện và nguy cơ route flapping, tức quảng bá/rút lặp lại khiến tập đường thay đổi liên tục.

Các ngưỡng kiểm tra, thời gian chờ và phạm vi rút là quyết định thiết kế, không có một hằng số phù hợp mọi dịch vụ. Lab không đưa một thời gian failover mặc định; script chờ kết quả có giới hạn và chỉ kiểm trạng thái sau cùng. Thời gian chờ của shell không phải phép đo thời gian hội tụ BGP.

## ⏸ Dừng lại — đoán trước #2

Một prefix đang mang nhiều IP dịch vụ. Một IP có HTTP lỗi, các IP còn lại vẫn phục vụ. Rút cả prefix ngay sẽ gây hậu quả nào cần xét trước?

- (a) Chỉ flow tới IP lỗi đổi site, vì router hiểu HTTP health.
- (b) Toàn bộ đích nằm trong prefix có thể đổi đường, kể cả dịch vụ đang tốt.
- (c) Không dịch vụ nào đổi vì prefix chỉ là nhãn quản trị.
- (d) Router tự chia prefix thành các route nhỏ và quảng bá Internet thay ta.

### 3.5 Đơn vị rút route có thể lớn hơn đơn vị lỗi

Đáp án là **(b)**. Router dùng prefix trong bảng định tuyến. Nếu bạn rút đường của cả prefix tại site, hành động ấy không chỉ ảnh hưởng listener vừa chết. Những địa chỉ khác đi theo cùng đường cũng chịu thay đổi. Đây là nguyên nhân gốc khiến “health check lỗi thì rút route” chưa phải một thiết kế đầy đủ.

Trong lab có một địa chỉ ứng dụng cần xét nằm trong prefix `203.0.113.0/24`, nên thao tác rút đơn giản. Việc dùng `/24` ở đây kế thừa lab trước; không có nghĩa mọi anycast triển khai phải dùng `/24`, và không có nghĩa Internet nhận mọi route host `/32`. Prefix nào được bên ngoài nhận còn tùy chính sách lọc; một route hợp lệ trong Docker không tự đủ điều kiện được quảng bá toàn cầu.

Có thể tách nhóm dịch vụ vào các prefix khác nhau, hoặc giữ quảng bá và chuyển tiếp nội bộ tới site khác cho phần lỗi. Mỗi hướng đổi phạm vi và dependency: tách prefix thêm đối tượng định tuyến; chuyển tiếp nội bộ làm site lỗi còn phải có khả năng gửi dữ liệu tới nơi khỏe. Bài này chỉ kiểm trường hợp rút quảng bá cho một dịch vụ, không khẳng định đó là thiết kế tốt nhất cho một hệ thống đa dịch vụ.

Một bẫy khác nằm ngay trong lab: `no network` loại route khởi phát cục bộ, nhưng router có thể học lại cùng prefix từ site khác. Nếu export cho phép mọi route học được, site vừa rút origin vẫn có thể gửi đường học lại sang hàng xóm. Bởi vậy route-map `OWN` kiểm cả prefix lẫn đường AS rỗng trước khi xuất trên link trực tiếp. Ta dùng thuộc tính đã học ở bài 11 để giới hạn export, không cho phép học lại từ site khác rồi quảng bá như một đường site trực tiếp.

Ngay cả khi đã rút đường trực tiếp, phải kiểm toàn bộ những đường khác tới site lỗi. Một site có nhiều uplink cần chính sách ngừng nhận tải nhất quán theo thiết kế. Chỉ quan sát route không còn ở một neighbor chưa chứng minh site không còn nằm trên đường từ các nguồn khác.

<step-flow>
<svg font-family="ui-sans-serif, system-ui, sans-serif" viewBox="0 0 520 560" role="img" aria-labelledby="net13-b-t net13-b-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net13-b-t">App lỗi rồi mới rút quảng bá</title>
<desc id="net13-b-d">Hai site đúng lab là r3 và r4, cùng prefix anycast. Năm bước phân biệt app dừng, route còn, rút thủ công, hội tụ và giới hạn TCP state.</desc>
<defs><marker id="net13-rev-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="currentColor"/></marker></defs><g stroke="currentColor" stroke-opacity="0.25" stroke-width="2" fill="none"><path d="M118 130 H402 M430 158 V382 M402 410 H118 M90 382 V158"/></g><circle cx="90" cy="130" r="28" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor"/><text x="90" y="135" text-anchor="middle" fill="currentColor" font-size="14">r1</text><circle cx="430" cy="130" r="28" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor"/><text x="430" y="135" text-anchor="middle" fill="currentColor" font-size="14">r2</text><circle cx="430" cy="410" r="28" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor"/><text x="430" y="415" text-anchor="middle" fill="currentColor" font-size="14">r3</text><circle cx="90" cy="410" r="28" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor"/><text x="90" y="415" text-anchor="middle" fill="currentColor" font-size="14">r4</text><text x="260" y="30" text-anchor="middle" fill="currentColor" font-size="14">Cùng prefix: 203.0.113.0/24</text><text x="90" y="457" text-anchor="middle" fill="currentColor" font-size="14">site-4 / AS65004</text><text x="430" y="457" text-anchor="middle" fill="currentColor" font-size="14">site-3 / AS65003</text><text x="90" y="482" text-anchor="middle" fill="currentColor" font-size="13">203.0.113.1:8080</text><text x="430" y="482" text-anchor="middle" fill="currentColor" font-size="13">203.0.113.1:8080</text><g data-step="1" data-until="2"><path d="M76 386 V154" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#net13-rev-arrow)"/></g><g data-step="1"><path d="M444 386 V154" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#net13-rev-arrow)"/><path d="M406 116 H114" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#net13-rev-arrow)"/></g><g data-step="1" data-until="2"><path d="M90 158 V382" fill="none" stroke="#10b981" stroke-width="3"  marker-end="url(#net13-rev-arrow)"/></g><g data-step="1" data-until="1"><text x="260" y="203" text-anchor="middle" fill="currentColor" font-size="14">Hai site đã quảng bá</text><text x="260" y="234" text-anchor="middle" fill="currentColor" font-size="14">r1 chọn r4: best (AS Path)</text><text x="260" y="265" text-anchor="middle" fill="currentColor" font-size="14">Request mới → site-4</text></g><g data-step="2" data-until="2"><text x="260" y="203" text-anchor="middle" fill="currentColor" font-size="14">App site-4 dừng; route còn</text><text x="260" y="234" text-anchor="middle" fill="currentColor" font-size="14">Request vẫn tới site-4</text><text x="260" y="265" text-anchor="middle" fill="currentColor" font-size="14">Connection refused</text></g><g data-step="3" data-until="3"><text x="260" y="194" text-anchor="middle" fill="currentColor" font-size="14">Rút origin tại r4</text><text x="260" y="225" text-anchor="middle" fill="currentColor" font-size="14">Thủ công, mô phỏng hành động</text><text x="260" y="256" text-anchor="middle" fill="currentColor" font-size="14">của health controller</text><text x="260" y="294" text-anchor="middle" fill="currentColor" font-size="13">Chưa khẳng định r1 đã hội tụ</text></g><g data-step="4"><path d="M118 130 H402" fill="none" stroke="#10b981" stroke-width="3"  marker-end="url(#net13-rev-arrow)"/><path d="M430 158 V382" fill="none" stroke="#10b981" stroke-width="3"  marker-end="url(#net13-rev-arrow)"/></g><g data-step="4" data-until="4"><text x="260" y="203" text-anchor="middle" fill="currentColor" font-size="14">r1 còn đường qua r2 tới r3</text><text x="260" y="234" text-anchor="middle" fill="currentColor" font-size="14">Request mới → site-3</text><text x="260" y="265" text-anchor="middle" fill="currentColor" font-size="14">out/site-failover.txt</text></g><g data-step="5"><text x="260" y="203" text-anchor="middle" fill="currentColor" font-size="14">Request mới đã tới site-3</text><text x="260" y="234" text-anchor="middle" fill="currentColor" font-size="14">TCP state cũ không tự chuyển</text><text x="260" y="265" text-anchor="middle" fill="currentColor" font-size="14">Flow dài: chưa đo trong lab</text></g><text x="260" y="522" text-anchor="middle" fill="currentColor" font-size="13">Tím đứt: quảng bá; xanh: request mới</text>
</svg>
<step-note data-step="1">Bắt đầu sau khi mở export trực tiếp: r3/site-3 và r4/site-4 cùng quảng bá prefix. r1 chọn r4 theo BGP trong cấu hình lab, không theo phép đo khoảng cách địa lý.</step-note>
<step-note data-step="2">Chỉ dừng <code>net13-app4</code>: quảng bá còn, request mới vẫn tới site-4 và bị từ chối. Đây là bản sai “app chết thì route tự mất”.</step-note>
<step-note data-step="3">Lab chạy <code>no network 203.0.113.0/24</code> thủ công tại r4, mô phỏng hành động rút của health controller; chưa có bộ phát hiện lỗi tự động. OWN ngăn xuất lại đường học từ site khác trên link trực tiếp.</step-note>
<step-note data-step="4">Sau hội tụ, request mới đi r1 → r2 → r3 và trả <code>site-3</code>. Việc hoàn tất hội tụ được xác nhận bằng response, không suy từ khoảng ngủ.</step-note>
<step-note data-step="5">Kết quả chỉ xác nhận kết nối mới. TCP state cũ không được BGP tự chuyển sang site-3; xem hình “Đường mới không chuyển trạng thái socket”, phần flow dài vẫn chưa đo.</step-note>
</step-flow>

### 3.6 Route mới không mang theo socket cũ

Một TCP connection đã thiết lập chứa trạng thái ở hai endpoint. Nếu gói tiếp theo bị chuyển từ site X tới site Y mà Y không có trạng thái transport tương ứng, địa chỉ IP giữ nguyên không làm Y biết số sequence, cửa sổ hay dữ liệu mà X đã xử lý. Nhắc lại phần TCP ở [eng-03](../engineering/eng-03-tcp-tls.md) và bài 16 khi cần; ở đây chỉ xét hậu quả của việc thay điểm nhận gói.

**Connection affinity là tính chất các gói thuộc một kết nối tiếp tục tới cùng điểm xử lý trong khoảng thời gian cần thiết.** Route ổn định và cơ chế phân phối theo flow có thể giúp giữ affinity, nhưng một thay đổi routing vẫn có thể làm flow đổi site. Không được kết luận mọi gói anycast nhảy site ngẫu nhiên; cũng không được hứa một flow không bao giờ đổi đường.

Kết nối dài không bị cấm dùng anycast. Tuy nhiên triển khai phải xử lý trạng thái: giữ đường về site cũ qua lớp điều phối, thiết kế reconnect, hoặc có cơ chế đồng bộ/định tuyến nội bộ thích hợp. Một request mới thành công sau failover không chứng minh WebSocket đang mở được tiếp tục. Trong lab, mỗi `wget` mở kết nối mới; ta không giữ một TCP stream qua thời điểm rút route.

**Retry là thử lại một thao tác sau khi chưa nhận kết quả chắc chắn; idempotency là tính chất thử lại không tạo tác dụng thêm ngoài một lần thành công.** Khi site cũ đã ghi dữ liệu nhưng response thất lạc lúc route đổi, gửi lại sang site mới có thể tạo thao tác lặp nếu ứng dụng thiếu khóa idempotency hoặc cơ chế tương đương. Anycast giải chọn nơi nhận gói, không tự giải tính đúng của giao dịch phân tán.

Dữ liệu cũng cần kế hoạch riêng. Hai site có thể trả cùng format nhưng khác độ mới dữ liệu. Thấy `200 OK` tại site mới không chứng minh nó có phiên đăng nhập cũ hoặc đã nhận bản ghi vừa ghi tại site trước. Trong bài, body khác nhau chỉ là dụng cụ nhận diện; không phải ví dụ về đồng bộ dữ liệu production.

> **Suy luận.** Từ trạng thái kết nối TCP và các giới hạn của phân phối anycast trong RFC 4786 §4.1, §4.6: cần đánh giá riêng request mới, connection đang mở và tính đúng dữ liệu. **Chưa đo** khả năng giữ một kết nối TCP qua chuyển site; kiểm bằng mở stream dài, đổi quảng bá rồi capture ở cả hai site.

### 3.7 Site còn lại phải chịu được tải chuyển sang

Khi một catchment chuyển từ X sang Y, tải không biến mất mà được dồn sang nơi còn đường tới. Nếu Y không đủ năng lực, failover định tuyến thành công có thể dẫn tới thất bại ứng dụng tiếp theo. Đây là chuỗi nhân quả cần kiểm bằng capacity và admission control, tức giới hạn tiếp nhận việc mới theo khả năng phục vụ, thay vì chỉ đếm số site đang quảng bá.

Các site không nhất thiết nhận tải đều. Catchment phụ thuộc mạng nguồn và policy, nên hai site cùng cấu hình máy chưa chắc mỗi nơi nhận một nửa request. Sau một withdrawal, tải chuyển cũng không nhất thiết chỉ tới site gần nhất về địa lý. Phải đo từ các nguồn và xem phân bố site ID trước/sau; dashboard tổng request thành công có thể che một nhóm ISP vẫn tới site lỗi.

RFC 4786 §4.7 bàn tính tự chủ và nguy cơ lỗi lan giữa các node. Cùng một bản cấu hình lỗi có thể tác động nhiều site; nhiều địa điểm vật lý không tự tạo sự độc lập với cùng dependency hoặc cùng đợt deploy. Đây là phần vận hành ở trên định tuyến, không phải một thuộc tính thêm vào gói IP.

## 4. Lab

### 4.1 Giữ client, thêm một origin và một dịch vụ tại mỗi site

Bộ `net-lab/net-13/` kế thừa script của net-11 và mô hình export của net-12. Bốn router dùng ASN cũ, link chuyển thành `10.113.<link>.<router>` để tránh trùng lab khác. r3 và r4 cùng có `203.0.113.1/24` trên loopback và cùng khai `network 203.0.113.0/24`. Các network Docker đều internal.

Chạy từ thư mục lab, không cần DNS công cộng:

```bash
cd /path/to/net-lab/net-13
./run.sh | tee out/replay.txt
```

Script dùng hai container Node chia sẻ namespace bằng `--network container:net13-r3` và `--network container:net13-r4`. HTTP server bind đúng `203.0.113.1:8080`; site được nhận diện bằng response body. Đây là cách đặt ứng dụng vào cùng không gian mạng với router để giữ lab ngắn, không phải yêu cầu chạy application ngay trên router ngoài đời.

Node được khởi chạy bằng module HTTP chuẩn, mỗi request trả tên site tương ứng. Trong file script có đầy đủ lệnh Docker và cấu hình FRR được sinh vào `config/`; output quyết định ghi trong `out/`. Script chỉ xóa các container `net13-*` và bốn network của chính bài khi kết thúc, kể cả khi assertion thất bại.

Các route chiều về từ bài 12 vẫn được giữ: r3 biết tới subnet nguồn link `12` qua r2; r4 biết tới subnet ấy qua r1. Thiết kế này bảo đảm phép gọi ứng dụng có đường trả lời, nhưng không phải mô hình mọi chiều đều đối xứng. Khi sửa topology, đừng quên địa chỉ nguồn mà Linux thực sự chọn theo interface ra.

### 4.2 Đọc response và route cùng nhau

Ban đầu r4 chưa xuất prefix cho r1 trên link trực tiếp. `out/before.txt` ghi:

```text
Paths: (1 available, best #1, table default)
  65002 65003
    10.113.12.2 from 10.113.12.2 (10.255.0.2)
      Origin IGP, valid, external, best (First path received)
```

Script gọi cùng URL bằng client trong r1:

```bash
docker exec net13-r1 sh -c \
  'wget -T 2 -qO- http://203.0.113.1:8080'
```

Trích `out/site-before.txt`:

```text
site-3
```

Route qua r2 dẫn tới origin r3, còn body xác nhận tiến trình của site-3 thực sự đã trả lời. Hai bằng chứng có vai trò khác nhau: bảng route cho biết đường điều khiển, response cho biết điểm xử lý lần gọi cụ thể. Đừng chỉ dựa ping: cả hai site cùng có thể phản hồi ICMP nhưng một listener ứng dụng có thể đã dừng.

### 4.3 Giữ IP, đổi đường và site

Giống bài 12, script đổi export tại r4 sang OWN, rồi soft out và chờ route trực tiếp thắng. OWN chỉ chấp nhận prefix dịch vụ và AS_PATH rỗng để xuất route khởi phát tại site. Không có sửa URL, file hosts hay câu trả lời DNS.

```bash
docker exec net13-r4 vtysh -c 'conf t' \
  -c 'router bgp 65004' -c 'address-family ipv4 unicast' \
  -c 'neighbor 10.113.14.1 route-map OWN out'
docker exec net13-r4 vtysh -c 'clear bgp 10.113.14.1 soft out'
```

Lần gọi mới ghi trong `out/site-direct.txt`:

```text
site-4
```

Địa chỉ và port chưa đổi mà site đổi, đúng điều anycast cần kiểm. Ta chưa đo RTT site-3 so với site-4 dưới độ trễ giả lập; topology ít hop hơn không tự tạo một cam kết latency Internet. Lab chỉ dùng selection đã biết, tránh trộn lựa chọn route với tối ưu ứng dụng.

### 4.4 Để bản sai “app chết thì route tự mất” thất bại

Script dừng riêng container HTTP ở site-4; router r4 vẫn chạy:

```bash
docker stop net13-app4
```

Trích `out/app-down.txt`:

```text
wget: can't connect to remote host (203.0.113.1): Connection refused
```

Ngay sau đó kiểm `out/route-app-down.txt`:

```text
203.0.113.0/24 nhid 8 via 10.113.14.4 dev eth1 proto bgp metric 20
```

`nhid` có thể khác ở lượt chạy lại; next hop r4 mới là dữ kiện cần so. Kết nối bị từ chối chứ không timeout trong lượt này vì không còn listener tại địa chỉ/port đó; không suy mọi kiểu app lỗi đều cho cùng thông báo. Nếu listener còn nhưng dependency chết, lỗi có thể ở HTTP response hoặc ở timeout sau khi TCP đã lên.

Đây là phép thử tách biến: dịch vụ đổi trạng thái, định tuyến chưa đổi. Nếu dùng một container duy nhất rồi dừng cả router, bạn sẽ không chứng minh được khoảng trống giữa hai lớp; cả hai cùng chết khiến người đọc tưởng BGP có health check HTTP tích hợp.

### 4.5 Làm thủ công hành động mà health controller cần quyết định

Rút origin tại r4, giữ router và kết nối còn lại:

```bash
docker exec net13-r4 vtysh -c 'conf t' \
  -c 'router bgp 65004' -c 'address-family ipv4 unicast' \
  -c 'no network 203.0.113.0/24'
```

Route-map OWN trên link trực tiếp ngăn r4 quảng bá lại route học từ site khác như đường trực tiếp tới dịch vụ. Script thử request mới có giới hạn cho tới khi body xác nhận site-3; `out/site-failover.txt` ghi:

```text
site-3
```

`out/after-withdraw.txt` cho phép đối chiếu lại đường còn được r1 chọn. Kết quả này chứng minh request mới từ r1 tới một site khác sau hành động điều khiển. Nó không chứng minh bộ health check tự phát hiện, không đo thời gian mất dịch vụ theo mili giây và không chứng minh connection cũ sống tiếp.

Hình dưới là suy luận về trạng thái, không phải capture của flow đang mở trong lab. Mũi tên xanh biểu diễn request mới đã đo; phần socket cũ biểu diễn thứ mà thao tác đổi route không tự sao chép.

<svg font-family="ui-sans-serif, system-ui, sans-serif" viewBox="0 0 520 285" role="img" aria-labelledby="net13-c-t net13-c-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net13-c-t">Đường mới không chuyển trạng thái socket</title>
<desc id="net13-c-d">r1 gửi request mới qua r2 tới r3. Socket cũ nếu đã có tại r4 vẫn thuộc trạng thái site cũ; trạng thái ấy không được BGP tự sao chép sang r3. Chưa đo flow cũ.</desc>
<defs><marker id="net13-c-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="currentColor"/></marker></defs>
<g fill="#3b82f6" fill-opacity="0.13" stroke="currentColor"><circle cx="65" cy="70" r="28"/><circle cx="230" cy="70" r="28"/><rect x="352" y="40" width="150" height="90" rx="10"/><rect x="352" y="180" width="150" height="80" rx="10"/></g>
<g fill="currentColor" text-anchor="middle" font-size="14"><text x="65" y="75">r1</text><text x="230" y="75">r2</text><text x="427" y="63">r3 / site-3</text><text x="427" y="88">Request mới</text><text x="427" y="111">Socket mới</text><text x="427" y="204">r4 / site-4</text><text x="427" y="230">Socket cũ, nếu có</text><text x="427" y="250">không tự chuyển</text><text x="176" y="155">BGP đổi next hop</text><text x="176" y="178">không sao chép TCP state</text></g>
<g fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#net13-c-arrow)"><path d="M94 70 H201"/><path d="M259 70 H350"/></g>
</svg>

> **Đo trên lab.** Chuỗi ứng dụng trả site-3 → site-4 → lỗi kết nối → site-3 được ghi từ các lần gọi mới, không có flow dài được giữ qua withdrawal. Lệnh `wget -T 2` đặt timeout hai giây cho client, không phải số đo thời gian failover. `out/route-app-down.txt` chứng minh app đã dừng mà route vẫn còn.

Muốn mở rộng thành thử nghiệm hội tụ, thêm timestamp đơn điệu cho từng probe, tần suất probe xác định và capture thời điểm quảng bá/rút ở cả hai đầu. Khi báo khoảng gián đoạn, nêu độ phân giải lấy mẫu và phân biệt thời điểm thao tác điều khiển với lúc FIB đổi. Không dùng thời gian chạy toàn script, vì nó còn chứa thời gian tạo container, chờ khởi động và dọn dẹp.

## 5. Tính tay

### 5.1 Tải sau khi một catchment đổi site

Giả định A và B cùng chịu tối đa `12.000 request/s`. Trước sự cố, A nhận `8.000`, B nhận `9.000 request/s`. Nếu A rút quảng bá và toàn bộ tải của A chuyển sang B, B nhận bao nhiêu và vượt mức giả định bao nhiêu phần trăm?

**Lời giải — suy luận theo tải giả định:** B nhận `8.000 + 9.000 = 17.000 request/s`. Vượt `17.000 − 12.000 = 5.000 request/s`, tương đương `5.000 / 12.000 × 100 = 41,67%` năng lực đã cho. Đây không phải số đo server Node trong lab. Đường tới B hợp lệ vẫn có thể đưa B vào quá tải; failover route không chứng minh failover ứng dụng thành công.

### 5.2 Ngân sách phát hiện khác thời gian hội tụ

Bài toán thiết kế giả định: health check bắt đầu đều mỗi hai giây, yêu cầu ba lần thất bại liên tiếp. Mỗi probe trả kết quả tức thời; ứng dụng hỏng ở thời điểm bất kỳ, trước đó probe đều thành công. Bỏ qua thời gian xử lý controller. Khoảng thời gian phát hiện là bao nhiêu? Nếu mỗi probe có timeout thì còn dùng kết quả này nguyên vẹn được không?

**Lời giải — suy luận lấy mẫu:** từ lúc hỏng tới probe thất bại đầu tiên nằm trong khoảng gần `0` tới `2 s`; cần thêm hai khoảng kiểm, tổng thêm `4 s`. Thời gian phát hiện nằm xấp xỉ `4–6 s`, tùy pha lỗi so với lịch probe. Đây mới là phát hiện, chưa cộng thời gian hành động và hội tụ. Nếu probe chờ timeout hoặc lịch check được tính từ lúc probe trước kết thúc, cần đưa các thời gian ấy vào mô hình; đề bài tức thời không còn áp nguyên vẹn.

### 5.3 Một prefix, nhiều listener

Giả sử một prefix tại site chứa bốn IP dịch vụ, mỗi IP có một listener; một listener lỗi và cả prefix bị rút khỏi site. Bao nhiêu dịch vụ đang tốt cũng chịu thay đổi khả năng tới site này? Có thể tính số TCP connection bị mất từ dữ kiện ấy không?

**Lời giải — suy luận phạm vi:** ba dịch vụ còn tốt cũng nằm trong prefix bị tác động. Không tính được số connection bị mất: chưa biết bao nhiêu client đang tới site, connection có đổi đường không, có lớp giữ affinity không và site mới xử lý trạng thái thế nào. Đếm địa chỉ bị ảnh hưởng là bài toán định tuyến; đếm giao dịch thất bại cần dữ liệu ở transport và ứng dụng.

## 6. Chuyển giao

1. Hai ISP gọi cùng IP nhưng thấy site ID khác nhau. Dữ kiện nào phải có trước khi kết luận DNS trả sai? Gợi ý: giữ địa chỉ đích thực tế và xác định lớp chọn site.
2. Một site rút quảng bá ở một điểm peering nhưng vẫn nhận request từ một nhóm người dùng. Bạn sẽ tìm những đường quảng bá và đường chuyển tiếp còn lại nào?
3. Health check chỉ kiểm TCP connect thành công trong khi database đã mất kết nối. Thiết kế phép kiểm nào phản ánh điều kiện phục vụ tối thiểu mà vẫn tránh biến một dependency chập chờn thành route flapping?
4. Một luồng WebSocket rớt lúc route đổi, nhưng request HTTP mới thành công. Cần thu trạng thái/capture nào để chứng minh gói của flow cũ đã tới site không có socket tương ứng?
5. Site mới trả kết quả cũ sau chuyển tuyến dù RTT giảm. Những bằng chứng nào tách được replication lag, cache cục bộ và việc client thực ra vẫn tới site trước?
6. Ba site có catchment chồng theo mạng nguồn, capacity không đều và một prefix mang nhiều dịch vụ. Thiết kế health policy, điều kiện quảng bá lại và phép thử failover sao cho không tạo vòng lỗi lan khi một dependency chung suy giảm; nêu cả giới hạn bằng chứng đối với giao dịch đang dở. Đây là câu khó nhất, không có đáp án trong bài.

## 7. Tóm tắt

- Anycast dùng định tuyến để đưa gói tới một trong nhiều nơi phục vụ cùng địa chỉ; nó không nhân request tới mọi site.
- Catchment là tập nguồn đi tới một site theo trạng thái định tuyến; ranh giới không bắt buộc trùng địa lý hoặc latency nhỏ nhất.
- Lab giữ URL `203.0.113.1:8080`, đổi quảng bá và quan sát body chuyển site-3 sang site-4 tại `out/site-direct.txt`.
- Dừng HTTP tại site-4 không tự rút route: lỗi ở `out/app-down.txt`, next hop còn ở `out/route-app-down.txt`.
- Sau withdrawal thủ công, request mới trả site-3; lab không đo bảo toàn TCP connection hoặc tự động health checking.
- Route failover, sức chịu tải và tính đúng dữ liệu là ba điều phải kiểm riêng; cùng IP không tự đồng bộ trạng thái.

→ **Bài 14 — Khi BGP sai: hijack, leak và RPKI**: phân biệt nhiều điểm quảng bá có chủ đích với quảng bá sai chủ thể hoặc sai phạm vi.
