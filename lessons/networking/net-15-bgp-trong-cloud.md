# Bài 15 — BGP trong cloud: phiên đã UP, route đã đi đúng chưa?

## 1. Mục tiêu

Sau bài này bạn có thể:

- Chọn đúng Amazon-side ASN theo loại gateway/VIF thay vì lấy một ASN công cộng của AWS gắn cho mọi kết nối.
- Lần theo một prefix qua router tại chỗ, gateway và route table của cloud, chỉ ra bước nào chưa có bằng chứng.
- Áp dụng thứ tự route trong đúng phạm vi VPC, VGW, TGW hoặc Direct Connect, không trộn thành một bảng ưu tiên chung.
- Phân biệt điều kiện ECMP của VPN trên VGW, VPN trên TGW và Direct Connect private/transit VIF.
- Dùng quảng bá và policy theo đúng chiều traffic muốn tác động, kể cả khi hai chiều không cùng đường.
- Chạy lab hai phiên FRR, xác nhận hai next hop, gài route cụ thể sai và rút một ứng viên để kiểm dự phòng.

## 2. Triệu chứng

Hai phiên BGP từ router tại chỗ tới gateway đều nhận `10.80.0.0/16`. Bảng Linux đã có hai next hop `10.115.12.4` và `10.115.14.4`, weight cùng bằng 1. Bạn coi phần mạng đã xong. Nhưng khi thêm một route blackhole `10.80.1.0/24`, lookup `10.80.1.8` thất bại trong khi cả hai peer vẫn hiện một prefix nhận được.

Nếu đây là kết nối hybrid của ứng dụng tới một dịch vụ private trong VPC, dashboard tunnel xanh có thể dẫn bạn sang debug SDK hoặc database. Nó mới chứng minh một phần đường hầm và phiên điều khiển; chưa chứng minh gói của IP đang lỗi đi đúng bảng, đúng attachment và có đường về.

> **Đo trên lab.** `net-lab/net-15/out/ecmp-kernel.txt` ghi hai next hop cho `/16`; `out/static.txt` ghi blackhole `/24`; `out/static-lookup.txt` ghi `RTNETLINK answers: Invalid argument`; `out/summary-static.txt` vẫn ghi hai peer nhận một prefix. FRR `10.2.1_git`, Linux `6.8.0-64-generic` aarch64, image `quay.io/frrouting/frr:10.2.1`. Đo lại bằng `./run.sh` trong thư mục lab; digest image ở `out/environment.txt`.

Lab là hai router FRR qua hai mạng Docker, **không có tài nguyên AWS được tạo**. Nó cho phép thấy BGP và kernel hoạt động thật; những phần về dịch vụ AWS phía dưới được đối chiếu tài liệu chính thức riêng. Đây là ranh giới cần giữ khi đưa kết quả lab lên thiết kế cloud.

Bài [net-14](net-14-bgp-hijack-leak-rpki.md) vừa tách quyền origin khỏi policy truyền route. Bài này giả sử các prefix đã được cấp quyền, đi tiếp tới câu hỏi ai thực sự nhận và cài route trong hệ thống hybrid. AS/ASN, UPDATE, AS_PATH và LOCAL_PREF đã có ở net-10/net-11; không cần học lại để đọc các bảng ở đây.

## ⏸ Dừng lại — đoán trước #1

Một kết nối Site-to-Site VPN có hai tunnel, cả hai đang UP. Có thể kết luận AWS cộng băng thông cả hai cho chiều từ VPC về tại chỗ không?

- (a) Có, VPN nào cũng chia đều từng gói sang hai tunnel.
- (b) Có, miễn AS_PATH hai bên giống nhau.
- (c) Chưa: phải biết VGW hay TGW, cấu hình ECMP và điều kiện các route.
- (d) Không, AWS không có trường hợp VPN nào dùng ECMP.

## 3. Cơ chế

### 3.1 Cloud thêm các điểm ra quyết định, không xoá cơ chế BGP

Đáp án **(c)**. Trước hết xác định điểm kết thúc phiên. **CPE — Customer Premises Equipment — là thiết bị định tuyến phía mạng của bạn.** AWS gọi thiết bị thực là customer gateway device; **customer gateway resource** là đối tượng cấu hình đại diện cho đầu bên bạn trong AWS, không phải một router AWS nằm thêm trên đường gói.

**VGW — Virtual Private Gateway — là gateway VPN gắn với một VPC.** **TGW — Transit Gateway — là hub nối các attachment từ VPC và những loại kết nối khác.** **Attachment** là kết nối của một mạng hoặc tài nguyên vào TGW. TGW có route table riêng; VPC subnet vẫn có route table riêng. Khi packet đi qua hai nơi này, nó trải qua hai lần chọn đường, không đọc một bảng BGP xuyên suốt toàn hệ thống.

Với VPN định tuyến động, BGP trao đổi prefix trên kết nối trong tunnel; tunnel bảo vệ và chuyên chở traffic, còn BGP thông báo đường. Có thể tunnel tồn tại mà không nhận prefix, nhận prefix mà chưa propagation vào bảng cần dùng, hoặc bảng route có đích nhưng đường về ở đầu xa thiếu. [Tài liệu cách hoạt động VPN](https://docs.aws.amazon.com/vpn/latest/s2svpn/how_it_works.html) xác định một connection cung cấp hai tunnel và phân biệt các thành phần trên.

**Direct Connect — DX — là dịch vụ kết nối mạng chuyên dụng từ vị trí của bạn vào AWS.** **VIF — virtual interface — là giao diện logic trên Direct Connect dùng để thiết lập kết nối tới phạm vi tài nguyên tương ứng.** Public VIF phục vụ truy cập địa chỉ public của dịch vụ AWS; private VIF dùng cho tài nguyên private qua VGW/DX gateway; transit VIF nối qua DX gateway tới TGW. **DX gateway** là đối tượng nối các VIF với gateway liên quan, không đồng nghĩa với IGW của một VPC. Các kiểu liên kết được mô tả trong [tài liệu DX gateway](https://docs.aws.amazon.com/directconnect/latest/UserGuide/direct-connect-gateways-intro.html).

Vì sao phân biệt ngay từ đầu? Nếu đang dùng transit VIF mà bạn chỉ kiểm route table subnet, bạn chưa kiểm lựa chọn tại TGW. Nếu đang dùng public VIF mà lại tìm propagated route private trong VPC, bạn đang tìm ở sai đối tượng. Tên dịch vụ “Direct Connect” chưa nói đủ đường của prefix. Hãy vẽ các đối tượng thực đã được tạo, rồi đặt từng bảng route lên đường gói.

**Suy luận:** với hướng on-prem → EC2 qua TGW, chuỗi kiểm gồm route của CPE tới prefix VPC, kết nối mang traffic, route table TGW ứng với attachment vào, attachment tới VPC và route/security ở đầu đích. Chiều EC2 → on-prem bắt đầu từ route table subnet, qua TGW rồi tới một kết nối được chọn. Security Group/NACL vẫn có thể chặn dù mọi route đúng; cơ chế firewall đã có ở [intro-02](../foundations/intro-02-networking.md), không dùng BGP để thay thế kiểm tra đó.

### 3.2 “ASN phía Amazon” là thuộc tính của điểm kết nối cụ thể

Ở Internet công cộng, bạn có thể tra thấy các ASN của AWS. Nhưng số xuất hiện trong kết quả tra IP dịch vụ không tự trở thành remote-as cho VPN private. Với VGW mới, nếu không chỉ định ASN thì tài liệu ghi mặc định 64512; với DX gateway, API cũng ghi mặc định 64512. TGW có trường cấu hình AmazonSideAsn. Giá trị để cấu hình CPE phải lấy từ **gateway và cấu hình kết nối của bạn**, không đoán từ tên nhà cung cấp.

> **Nguồn.** [How Site-to-Site VPN works](https://docs.aws.amazon.com/vpn/latest/s2svpn/how_it_works.html) ghi VGW dùng *“the default ASN (64512)”* khi không chỉ định. [CreateDirectConnectGateway](https://docs.aws.amazon.com/directconnect/latest/APIReference/API_CreateDirectConnectGateway.html) cũng mô tả mặc định 64512. Đây là hai phạm vi cấu hình cụ thể, không phải một ASN duy nhất cho mọi bề mặt AWS.

Phạm vi AmazonSideAsn trong [API TGW](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_TransitGatewayRequestOptions.html) là `64512–65534` cho ASN 16 bit hoặc `4200000000–4294967294` cho ASN 32 bit. Đối với public VIF, [chính sách DX](https://docs.aws.amazon.com/directconnect/latest/UserGuide/routing-and-bgp.html) chỉ rõ phía AWS dùng AS7224. Private/transit VIF phải dùng ASN của điểm kết nối tương ứng. Đừng lấy “public VIF = 7224” áp sang private VIF, hoặc mặc định private gateway = 64512 áp ngược sang public VIF.

Tại sao chuyện này ảnh hưởng vận hành? CPE cần nhận đúng remote-as của peer để lập phiên. Sau khi lập phiên, cơ chế chống loop còn liên quan ASN xuất hiện trong path; trùng ASN ở những miền cần nối có thể khiến route bị bỏ dù kết nối vật lý không đổi. Net-10 đã bàn việc ASN private có thể lặp giữa các lab độc lập; khi nối chúng thành một mạng hybrid thì phải rà lại kế hoạch số và giới hạn sản phẩm. Không suy “cùng tổ chức nên dùng cùng ASN ở mọi gateway” thành một quy tắc thiết kế.

Lab đặt r1 AS65001, r4 AS64512 để giống hình thức một cặp CPE–gateway private, nhưng r4 vẫn là FRR. Chọn 64512 không khiến nó chạy policy VGW hoặc TGW. Mọi thí nghiệm dưới đây có hai phiên cùng remote-as 64512; không có kết luận về hành vi `as-override`, `allowas-in` hoặc sản phẩm AWS trong ca trùng ASN vì chưa đo các cấu hình đó.

### 3.3 Prefix tới gateway chưa chắc tới bảng quyết định của gói

**Propagation** là việc đưa route học được từ một kết nối vào route table cloud được cấu hình nhận nó. **Association** trên TGW là quan hệ xác định route table được dùng cho traffic đi vào từ một attachment. Hai khái niệm giải hai câu hỏi khác nhau: bảng này có route từ đâu, và packet này tra bảng nào? [Tài liệu TGW](https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-centralized-router.html) mô tả route table và association/propagation.

Ví dụ suy luận: attachment VPN đưa prefix on-prem vào bảng A, nhưng attachment VPC gửi packet vào bảng B. Bảng A có đúng route không làm packet đang tra B tự nhìn sang A. Đây là loại lỗi mà nhìn màn hình “BGP routes received” sẽ bỏ sót. Phải ghi ID bảng, attachment vào, destination và target được chọn. Không nói chung “TGW có route” khi có nhiều route table phục vụ các miền tách biệt.

Trong VPC dùng VGW, route propagation cũng phải vào đúng route table gắn với subnet đang gửi. Với TGW, subnet thường cần route tới TGW, rồi TGW cần route tới attachment đúng. Không có BGP process riêng trên từng EC2 chỉ vì VPC đang dùng VPN BGP; instance nhìn route và gateway của host, còn các quyết định managed nằm ngoài nó.

Một route có target nhưng target không hoạt động có thể mang trạng thái blackhole hoặc làm traffic không chuyển được. BGP peer Established nói về phiên; propagated route nói về thông tin tới bảng; packet capture/probe nói về data plane. Như lab net-11, best path và kernel là các bước riêng, nhưng trên cloud bạn còn phải tìm đúng bảng managed thay vì chỉ chạy `ip route` trong instance.

**Suy luận để debug:** lấy đúng IP đích đã resolve từ lỗi ứng dụng, nguồn, subnet, thời điểm và đường mong muốn. Sau đó đi từ điểm gửi tới điểm nhận, thu mỗi lookup liên quan. Nếu chỉ thử một IP khác cùng `/16`, bạn có thể đi qua aggregate bình thường trong khi IP lỗi nằm dưới `/24` sai. Phần tiếp theo dùng đúng bẫy ấy thay cho phán đoán “tunnel hỏng”.

### 3.4 Ưu tiên route phải gắn với nơi và điều kiện so sánh

Một gói khớp route cụ thể hơn thì dùng phạm vi đó; các luật ưu tiên giữa nguồn route chỉ được dùng khi phù hợp điều kiện, thường là **cùng destination prefix**. Net-14 vừa cho thấy tăng LOCAL_PREF của aggregate không thắng được prefix con. Đổi môi trường sang AWS không xoá ranh giới này.

<svg viewBox="0 0 520 300" role="img" aria-labelledby="net15-b-t net15-b-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net15-b-t">Một vùng cụ thể hơn che đường tổng hợp</title>
<desc id="net15-b-d">Thanh dài là khối /16; đoạn tô đỏ và đường phóng xuống biểu diễn /24 nằm trong nó. Kích thước hộp phóng to để đọc.</desc>
<defs><marker id="net15-b-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
<g fill="currentColor" font-family="sans-serif" font-size="14">
<rect x="20" y="35" width="480" height="70" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="260" y="63" text-anchor="middle">10.80.0.0/16 → hai next hop BGP</text><rect x="20" y="125" width="480" height="70" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/><text x="260" y="152" text-anchor="middle">10.80.1.0/24 → blackhole</text><path d="M30 90L490 90" stroke="currentColor" stroke-width="3"/><path d="M32 90L32 185" stroke="#f43f5e" stroke-width="3"/><text x="260" y="225" text-anchor="middle">10.80.1.8 khớp /24 → dừng ở blackhole</text><text x="260" y="260" text-anchor="middle">/24 chỉ chiếm 1/256 không gian của /16</text>
</g>
</svg>

Với route table VPC, [tài liệu route priority](https://docs.aws.amazon.com/vpc/latest/userguide/route-tables-priority.html) mô tả longest prefix match và khi destination giống nhau thì static có ưu tiên hơn propagated route. Đây là nguồn của câu “static thắng propagated”, nhưng câu ấy bị thiếu điều kiện nếu dùng cho mọi độ dài. Một static `/16` không tự đè propagated `/24` bên trong chỉ vì nó là static. Cũng không mở rộng bảng ưu tiên này thành mọi trường hợp route đặc biệt trong VPC; khi đích khớp local route hoặc prefix list phải đọc đúng mục tương ứng.

VGW còn có bước lựa chọn giữa những đường tới cùng prefix. Theo [VPN route priority](https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-route-priority.html), trong phạm vi được mô tả và khi endpoint khoẻ, BGP qua DX được ưu tiên trước static route của VPN, rồi tới BGP qua VPN. Đó là static route **của kết nối VPN tại VGW**, khác với static route trong bảng VPC trỏ tới một target khác. Hai câu có chữ “static” không được phép tráo tầng.

Với TGW, [route evaluation order](https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-centralized-router.html#tgw-route-evaluation-overview) xét route cụ thể nhất, rồi khi cùng CIDR xét loại nguồn/attachment. Trong phạm vi DX gateway propagated so với Site-to-Site VPN propagated, DX gateway được ưu tiên hơn. Vì vậy prepend trên DX chưa chắc khiến VPN được chọn: phép so giữa hai loại đã quyết định trước khi bạn hy vọng so độ dài path. Bảng dưới chỉ giữ các cặp cần cho tình huống này; không thay danh sách đầy đủ của AWS.

| Nơi quyết định | Điều kiện đang so | Quy tắc cần dùng |
|---|---|---|
| VPC route table | Static và propagated có cùng destination | Static ưu tiên hơn theo tài liệu VPC |
| VGW | Cùng prefix, các endpoint còn khoẻ | DX BGP trước VPN static, trước VPN BGP |
| TGW | Cùng CIDR, DX gateway propagated và VPN propagated | DX gateway trước VPN |
| Hai ứng viên VPN BGP trong phạm vi hỗ trợ | Cùng prefix và các bước ưu tiên trước chưa phân định | Xem thuộc tính BGP và điều kiện tunnel, không suy từ tên tunnel |

**Điểm hay sai:** route được nhìn thấy trong một bảng cloud có thể chỉ là route đang ưu tiên; không thấy dự phòng trên màn hình đó chưa đủ nói peer không nhận nó. Tài liệu TGW ghi route dự phòng có thể chỉ hiện khi đường ưu tiên không còn được quảng bá. Muốn kiểm backup trước sự cố, thu bằng chứng từ đầu quảng bá, telemetry phiên và bài thử rút đường có kiểm soát, thay vì chờ production tự hỏng để xem một dòng xuất hiện.

Một thiết kế “DX chính, VPN dự phòng” chỉ có ý nghĩa khi prefix quảng bá phù hợp. Nếu VPN lỡ mang `/24` trong khi DX chỉ mang `/16`, vùng `/24` có thể đi VPN ngay lúc DX vẫn khoẻ. Nguyên nhân là phạm vi prefix, không phải AWS quên luật ưu tiên DX. Ngược lại, route static sai có thể giữ traffic ở một target hỏng sau khi BGP dự phòng đã được học; kiểm bảng có quyền quyết định cuối cùng trước khi thay timer.

## ⏸ Dừng lại — đoán trước #2

CPE học prefix VPC qua cả hai đường và tăng LOCAL_PREF cho đường A. Traffic đi lên AWS chọn A, nhưng chiều trả về từ AWS vẫn chọn B. Giải thích nào đúng?

- (a) AWS buộc phải dùng cùng đường với request; B chắc do đo nhầm.
- (b) LOCAL_PREF cục bộ ở CPE quyết định chiều CPE gửi; AWS tự chọn đường tới prefix on-prem bằng thông tin nó nhận.
- (c) Chỉ cần tăng LOCAL_PREF ở CPE thêm lần nữa để sửa chiều AWS gửi.
- (d) Đổi ASN thành số lớn hơn sẽ đồng bộ hai chiều.

### 3.5 Chiều quảng bá quyết định bạn đang tác động ai

Đáp án **(b)**. Khi CPE nhận prefix VPC, policy nhập ở CPE ảnh hưởng traffic **từ CPE tới VPC**. Khi CPE xuất prefix on-prem cho AWS, thuộc tính gửi cùng route có thể ảnh hưởng traffic **từ AWS về on-prem**, trong phạm vi AWS chấp nhận và sử dụng. Chiều quảng bá thông tin tới một đích ngược chiều traffic tới đích ấy. Không có thuộc tính “đường đối xứng” tự lan theo request HTTP.

<svg viewBox="0 0 520 300" role="img" aria-labelledby="net15-c-t net15-c-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net15-c-t">Policy được áp ở bên nhận quảng bá</title>
<desc id="net15-c-d">Chiều quảng bá prefix ngược chiều traffic tới prefix đó. Community trên quảng bá on-prem tác động lựa chọn của AWS.</desc>
<defs><marker id="net15-c-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
<g fill="currentColor" font-family="sans-serif" font-size="14">
<rect x="20" y="25" width="150" height="55" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="95" y="48" text-anchor="middle">CPE / AS65001</text><text x="95" y="70" text-anchor="middle">chọn chiều đi</text><rect x="350" y="25" width="150" height="55" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="425" y="48" text-anchor="middle">AWS gateway</text><text x="425" y="70" text-anchor="middle">chọn chiều về</text><path d="M170 115L350 115" fill="none" stroke="#3b82f6" stroke-width="2" marker-end="url(#net15-c-a)"/><text x="260" y="100" text-anchor="middle">traffic → AWS</text><path d="M350 240L170 240" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#net15-c-a)"/><text x="260" y="265" text-anchor="middle">traffic → on-prem</text><path d="M170 205L350 205" fill="none" stroke="#f59e0b" stroke-width="2" marker-end="url(#net15-c-a)"/><text x="260" y="188" text-anchor="middle">quảng bá prefix on-prem + community</text><path d="M350 150L170 150" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net15-c-a)"/><text x="260" y="137" text-anchor="middle">quảng bá prefix AWS</text>
</g>
</svg>

**BGP community** là thuộc tính gắn nhãn route để bên nhận áp một policy đã quy ước. Nó không phải phép tăng điểm có nghĩa toàn cầu. Với DX private/transit VIF, AWS có bộ nhãn ưu tiên `7224:7100` thấp, `7224:7200` trung bình và `7224:7300` cao. Bạn gắn nhãn vào **prefix của mạng mình được xuất sang AWS**; AWS diễn giải nhãn để lựa chọn đường trả về. [Tài liệu DX communities](https://docs.aws.amazon.com/directconnect/latest/UserGuide/routing-and-bgp.html) quy định các giá trị và phạm vi này.

Nếu muốn active/passive cho cùng prefix trên hai private/transit VIF, nhãn cao cho đường chính và thấp cho đường dự phòng thể hiện ý định ở phía AWS. Trên CPE vẫn phải có policy riêng để chiều gửi chọn phù hợp. Giữ cả hai chiều trong một bảng thay đổi giúp tránh tình huống chỉ đổi quảng bá mà tưởng đã đổi lookup cục bộ.

Số 7224 trong community cũng không bắt buộc remote-as của private session là 7224. Đây là hai trường có vai trò khác nhau: community định danh một quy ước policy, còn remote-as xác định peer BGP. Cùng một chuỗi số xuất hiện trong tài liệu không làm hai trường có thể thay nhau.

Trong trường hợp private/transit DX cùng prefix, AWS xét local preference theo policy trước AS_PATH. Nếu đường A được AWS ưu tiên cao hơn bởi community, prepend ở A chưa chắc đẩy traffic sang B. Không cần dạy lại thứ tự LOCAL_PREF của net-11; điều mới là bạn gửi **nhãn để AWS đặt policy nội bộ**, thay vì tự đặt LOCAL_PREF tại CPE và mong nó được sao chép sang đầu kia.

Public VIF có bộ community cho phạm vi lan truyền và policy khác. Không sao chép các nhãn private/transit sang public VIF rồi coi như cùng ý nghĩa. Lab bên dưới không dựng bộ diễn giải community của AWS; những giá trị DX trong mục này là cấu hình theo tài liệu, chưa là kết quả đo private VIF thật.

### 3.6 Hai tunnel, hai next hop, hai đường lỗi độc lập là ba tuyên bố khác nhau

**ECMP — Equal-Cost Multipath — là việc dùng nhiều next hop đủ điều kiện ngang nhau cho cùng đích.** Có hai phiên BGP chưa chứng minh đã có ECMP: một đường có thể được chọn, đường kia chỉ dự phòng. Tập multipath được cài mới là bằng chứng tiếp theo cần tìm. Lab dùng `maximum-paths 2` và đối chiếu kernel để tránh nhầm “2 available” với “2 đang dùng”.

<step-flow>
<svg viewBox="0 0 720 590" role="img" aria-labelledby="net15-a-t net15-a-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto">
<title id="net15-a-t">Hai đường FRR rồi rút một đường</title>
<desc id="net15-a-d">r1 AS65001 bên trái nhận cùng prefix từ r4 AS64512 bên phải qua hai phiên BGP song song. Bảng BGP và kernel ở r1 có hai next hop, rồi còn một sau khi shutdown neighbor 10.115.12.4. Đây là FRR, không phải tunnel AWS thật.</desc>
<defs><marker id="net15-a-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
<g fill="currentColor" font-family="sans-serif" font-size="14">
<rect x="20" y="30" width="180" height="280" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="520" y="30" width="180" height="280" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="110" y="60" text-anchor="middle" font-weight="700">r1 · On-prem</text>
<text x="110" y="84" text-anchor="middle">AS65001</text>
<text x="610" y="60" text-anchor="middle" font-weight="700">r4 · Gateway FRR</text>
<text x="610" y="84" text-anchor="middle">AS64512</text>
<text x="610" y="112" text-anchor="middle">Khởi phát 10.80.0.0/16</text>
<text x="188" y="142" text-anchor="end">10.115.12.1</text>
<text x="532" y="142">10.115.12.4</text>
<text x="188" y="247" text-anchor="end">10.115.14.1</text>
<text x="532" y="247">10.115.14.4</text>
<g data-step="1" data-until="2">
<path d="M520 155H200" fill="none" stroke="#3b82f6" stroke-width="3" marker-end="url(#net15-a-a)"/>
<text x="360" y="130" text-anchor="middle">BGP session 12 · Established</text>
<text x="360" y="181" text-anchor="middle">UPDATE · 10.80.0.0/16</text>
</g>
<g data-step="1">
<path d="M520 260H200" fill="none" stroke="#3b82f6" stroke-width="3" marker-end="url(#net15-a-a)"/>
<text x="360" y="235" text-anchor="middle">BGP session 14 · Established</text>
<text x="360" y="286" text-anchor="middle">UPDATE · 10.80.0.0/16</text>
</g>
<g data-step="2">
<path d="M110 310V345" fill="none" stroke="currentColor" marker-end="url(#net15-a-a)"/>
<rect x="20" y="350" width="680" height="185" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="40" y="379" font-weight="700">Bảng tại r1 · 10.80.0.0/16 · AS_PATH 64512</text>
<text x="40" y="407">Next hop</text><text x="320" y="407">BGP / kernel Linux</text>
<g data-step="2" data-until="2">
<text x="40" y="436">10.115.12.4</text><text x="320" y="436">multipath, best / weight 1</text>
<text x="40" y="513">Kernel: hai next hop · maximum-paths 2</text>
</g>
<text x="40" y="466">10.115.14.4</text>
<g data-step="2" data-until="3"><text x="320" y="466">multipath / weight 1</text></g>
</g>
<g data-step="3" data-until="3">
<text x="360" y="155" text-anchor="middle" fill="#f43f5e">Shutdown neighbor .12.4 tại r1</text>
<text x="40" y="436" fill="#f43f5e">Ứng viên .12.4 đã rút</text>
</g>
<g data-step="4">
<text x="360" y="155" text-anchor="middle">Session 12 đã shutdown</text>
<text x="320" y="466">Đường còn lại được cài</text>
<text x="40" y="513">Kernel: via 10.115.14.4 dev eth1</text>
<text x="360" y="570" text-anchor="middle">Chưa đo thời gian phát hiện lỗi im lặng bằng DPD/BFD.</text>
</g>
</g>
</svg>
<step-note data-step="1">Hai phiên Established; r4 quảng bá cùng prefix về r1 trên hai làn có IP mỗi đầu. Đây là hai liên kết Docker chạy BGP, chưa có tunnel IPsec.</step-note>
<step-note data-step="2">Log ở r1 cho hai ứng viên multipath, trong đó một path được đánh dấu best; kernel cài cả hai next hop với weight 1. Bảng thuộc phía nhận r1, không phải gateway r4.</step-note>
<step-note data-step="3">Lệnh shutdown neighbor 10.115.12.4 tại r1 loại phiên trên và ứng viên của nó. Làn cùng dòng ứng viên cũ biến mất; không suy thời gian hội tụ từ bước minh hoạ.</step-note>
<step-note data-step="4">out/one-path.txt xác nhận chỉ còn via 10.115.14.4 dev eth1. Phép thử rút đường có chủ ý chưa đo thời gian phát hiện mất gói im lặng của DPD/BFD hay failover AWS.</step-note>
</step-flow>

Ở **VGW**, VPN không hỗ trợ ECMP; AWS chọn một tunnel làm egress theo phạm vi được tài liệu VPN mô tả. Hai tunnel phục vụ dự phòng, không được suy thành tổng băng thông cả hai. Ở **TGW**, VPN có tùy chọn VPN ECMP support; dùng BGP và những đường đủ điều kiện ngang nhau mới có cơ sở dùng nhiều tunnel. TGW không cung cấp phép AS-path multipath relax để coi những chuỗi ASN khác nhau là ngang nhau theo ý muốn. Đây là điều kiện sản phẩm, không phải chỉ thêm lệnh FRR.

Ở **DX private/transit VIF**, có ECMP khi các đường đáp ứng điều kiện prefix, độ dài AS_PATH và thuộc tính BGP của DX; policy theo associated Region và community cũng có thể phân biệt các đường. Đặc biệt, tài liệu DX nói ASN trong AS_PATH không nhất thiết phải giống nhau để ECMP qua các VIF này. Không đem điều kiện ở TGW VPN áp sang DX VIF, hoặc ngược lại. Trước khi khẳng định active/active, hãy ghi rõ “ECMP tại đối tượng nào, qua những kết nối nào”.

> **Nguồn.** [VPN route priority](https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-route-priority.html) nêu VGW không hỗ trợ VPN ECMP. [TGW routing](https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-centralized-router.html) mô tả tùy chọn VPN ECMP và giới hạn AS-path relax. [DX routing](https://docs.aws.amazon.com/directconnect/latest/UserGuide/routing-and-bgp.html) có điều kiện riêng cho private/transit VIF. Đây là ba phạm vi phải kiểm riêng; không có một nút “BGP active/active” chung cho mọi kết nối AWS.

ECMP cũng không có nghĩa chia từng gói xen kẽ và không bảo đảm một TCP flow nhận tổng dung lượng các đường. Với cách chọn next hop theo flow, các gói cùng flow cần giữ đường để hạn chế đảo thứ tự; nhiều flow có thể rải ra các nhánh. Trong lab, lặp lookup cùng tuple cho cùng next hop là một quan sát về lookup Linux ở cấu hình này. Nó chưa đo hàm hash của AWS, chưa đo phân phối nhiều flow và chưa chứng minh tỷ lệ traffic 50/50.

Cuối cùng, hai next hop không chứng minh độc lập lỗi. Trong lab chúng cùng tới r4; r4 chết là cả hai mất. Ngoài thực tế, hai đường có thể cùng router CPE, nguồn điện, vị trí DX hoặc thiết bị mạng trung gian. **Suy luận:** tính sẵn sàng phải xét miền lỗi chung và data plane, không nhân xác suất hai đường độc lập khi chưa có bằng chứng độc lập. Bài toán capacity sau mất một đường cũng cần tính theo tải còn lại, không theo tổng dung lượng lúc mọi thứ đều hoạt động.

### 3.7 Rút route có chủ ý khác với tunnel âm thầm mất gói

Khi peer gửi rút đường hoặc bị shutdown, router nhận có tín hiệu điều khiển rõ. Khi tunnel vẫn hiện UP nhưng một chiều mất gói, trạng thái và thời điểm loại route còn phụ thuộc cơ chế phát hiện của thiết bị và dịch vụ. Timer BGP, kiểm tra tunnel và probe ứng dụng không đo cùng thứ. Không lấy thời gian script chờ polling làm thời gian failover của AWS.

Vì vậy bộ bằng chứng nên có ba lớp: trạng thái kết nối/phiên; prefix và route được chọn ở từng bảng; probe từ đúng nguồn tới đúng đích có timestamp, kiểm cả chiều về. Lỗi app sau khi đã đổi next hop còn có thể do firewall stateful, NAT state hoặc phiên TCP cũ. Bài net-07 nói về state NAT; các bài TCP tiếp theo sẽ giải thích vì sao route phục hồi chưa đồng nghĩa socket cũ lập tức tiếp tục.

**Suy luận cho thiết kế thử lỗi:** đổi một yếu tố mỗi lần. Thử rút quảng bá để kiểm lựa chọn route dự phòng; thử hạ một kết nối để kiểm phát hiện; sau đó thử miền lỗi chung. Nếu vừa đổi prefix, vừa sửa community, vừa ngắt cả hai tunnel, kết quả mất request không phân biệt được nguyên nhân. Một kế hoạch failover cần tiêu chí “đủ tải sau mất đường” và “ứng dụng hoàn thành request”, chứ không chỉ “route backup đã hiện”.

## 4. Lab

### 4.1 Thu nhỏ phần có thể đo mà không tạo tài nguyên cloud

Đọc net-14 trước khi chạy: prefix đúng vẫn có thể đi sai vì policy, và output FRR `valid` không tự chứng minh RPKI. Bộ lab này dùng lại cách dựng FRR của net-11, nhưng rút vòng bốn AS thành hai router có hai cạnh song song. Tại `net-lab/net-15/`:

```bash
./run.sh | tee out/replay.txt
```

Script tạo `net15-r1` AS65001 và `net15-r4` AS64512; hai network nội bộ `net15-l12`, `net15-l14` lần lượt dùng `10.115.12.0/24`, `10.115.14.0/24`. Cả hai phiên có hai đầu `.1` và `.4`. r4 khởi phát `10.80.0.0/16`, r1 bật `maximum-paths 2`. Trap chỉ dọn đúng container/network tiền tố `net15-`; log và cấu hình còn trên đĩa.

Giống net-11, lab tắt import-check để phát route mà không cần dựng dịch vụ đích, và tắt yêu cầu policy eBGP để thu hẹp cấu hình. Đây không phải config production. Không có IPsec, VIF thật, VGW/TGW hay EC2; vì vậy kết quả đo là route control/lookup của FRR–Linux, còn quy tắc AWS ở §3 là từ nguồn.

Điều kiện sẵn sàng của script là kernel có **hai dòng next hop**, không chỉ ngủ một khoảng rồi chụp bảng. Nếu chưa đạt thì script thất bại và giữ `out/debug-summary.txt`, `out/debug-startup.txt` để phân biệt peer chưa lên với zebra chưa cài route. Không lấy file rỗng làm chứng minh “AWS không hỗ trợ ECMP” vì ở đây không có AWS nào được gọi.

### 4.2 Đếm đường đang dùng sau khi đếm ứng viên

Lệnh trong lúc container còn chạy:

```bash
docker exec net15-r1 vtysh -c 'show bgp ipv4 unicast 10.80.0.0/16'
docker exec net15-r1 ip route show 10.80.0.0/16
```

Trích `out/ecmp-bgp.txt`:

```text
Paths: (2 available, best #1, table default)
  64512
    10.115.12.4 from 10.115.12.4 (10.255.0.4)
      Origin IGP, metric 0, valid, external, multipath, best (Neighbor IP)
  64512
    10.115.14.4 from 10.115.14.4 (10.255.0.4)
      Origin IGP, metric 0, valid, external, multipath
```

Đã bỏ các dòng metadata không quyết định. Best vẫn được đánh dấu ở một path, nhưng cả hai có `multipath`. Kết quả cài thực trong `out/ecmp-kernel.txt`:

```text
10.80.0.0/16 nhid 8 proto bgp metric 20
        nexthop via 10.115.12.4 dev eth0 weight 1
        nexthop via 10.115.14.4 dev eth1 weight 1
```

`nhid` là ID next hop của lần chạy, không phải số hop. `weight 1` ở đây là trọng số next hop trong route Linux, không phải thuộc tính weight của best-path BGP. Việc hai chỗ cùng dùng từ weight không cho phép thay đổi chúng như cùng một tham số. Lần chạy lại có thể khác ID nhưng phải giữ được hai địa chỉ `via` nếu muốn kiểm cùng trạng thái ECMP.

### 4.3 Để bản sai “hai path là mỗi request gấp đôi tốc độ” tự lộ thiếu bằng chứng

Script lặp ba lần cùng lookup, không phát traffic:

```bash
docker exec net15-r1 ip route get 10.80.1.8 \
  from 10.115.12.1 ipproto tcp sport 40000 dport 443
```

Cả ba lần trong `out/same-flow.txt` cùng có dòng:

```text
10.80.1.8 from 10.115.12.1 via 10.115.14.4 dev eth1 uid 0
```

**Thấy gì:** ở cấu hình hiện tại, cùng câu hỏi lookup chọn cùng một next hop, dù route cài hai next hop. **Vì sao điều này hữu ích:** nó bác bỏ suy nghĩ phải nhìn thấy mỗi lần gọi xen kẽ hai nhánh chỉ vì có ECMP. Nó chưa cho throughput một flow, và cũng chưa đủ phân biệt mọi cơ chế hash/cache của kernel. Muốn đo phân phối cần thay tuple có kiểm soát, ghi next hop và đếm flow; muốn đo tải thật cần traffic đến một đích phục vụ thật với băng thông hai nhánh được kiểm soát.

> **Chưa đo.** Không có số throughput, RTT, thời gian failover AWS hoặc tỷ lệ flow rải qua hai đường trong bài. Không có probe dịch vụ ở đích prefix. Các con số capacity trong phần tính tay là giả định bài toán, không phải hiệu năng image FRR hay hạn mức tunnel của AWS.

### 4.4 Gài route cụ thể sai trong khi phiên vẫn xanh

Lệnh sau mô hình hoá một quyết định sai ở bảng forwarding cục bộ; không phải API tạo route TGW:

```bash
docker exec net15-r1 ip route add blackhole 10.80.1.0/24
docker exec net15-r1 ip route show 10.80.1.0/24
docker exec net15-r1 ip route get 10.80.1.8
docker exec net15-r1 vtysh -c 'show bgp ipv4 unicast summary'
```

`out/static.txt` và `out/static-lookup.txt`:

```text
blackhole 10.80.1.0/24
RTNETLINK answers: Invalid argument
```

Thông báo lỗi này là kết quả `ip route get` trên kernel/image của lần chạy, không phải log ứng dụng. Không kết luận mọi bản Linux phải trả cùng câu tiếng Anh. Bằng chứng nguyên nhân là có blackhole cho prefix cụ thể hơn, còn trạng thái trước khi gài đã có `/16` hai next hop.

Trong `out/summary-static.txt`, hai peer vẫn có `State/PfxRcd` là `1`; FRR dùng số ở cột này để biểu diễn phiên đã Established và số prefix nhận. **Thấy gì:** route control không mất prefix, nhưng một quyết định forwarding cụ thể hơn che nó. **Vì sao:** route `/24` khớp IP đang thử trước `/16`. Không phải vì static có “điểm cao hơn BGP” bất kể độ dài. Muốn thử ưu tiên static/propagated cùng destination của AWS phải dùng tài nguyên AWS và đúng hai route bằng CIDR, không đổi tên phép thử Linux thành phép thử cloud.

Sửa đúng thay đổi vừa gài:

```bash
docker exec net15-r1 ip route del blackhole 10.80.1.0/24
```

Đó là lý do phải kiểm lookup tới **IP lỗi cụ thể**, thay vì ping một gateway cùng mạng rồi báo hệ thống hybrid bình thường. Khi chuyển quy trình sang AWS, câu hỏi tương ứng là bảng nào đang được packet dùng, có route cụ thể hoặc static giữ target ngoài mong đợi không, và chiều về tra bảng nào.

### 4.5 Rút một ứng viên, xác nhận đường còn lại

Sau khi xoá blackhole, script shutdown đúng peer trên cạnh 12:

```bash
docker exec net15-r1 vtysh -c 'configure terminal' \
  -c 'router bgp 65001' -c 'neighbor 10.115.12.4 shutdown'
docker exec net15-r1 ip route show 10.80.0.0/16
```

`out/one-path.txt` ghi:

```text
10.80.0.0/16 nhid 10 via 10.115.14.4 dev eth1 proto bgp metric 20
```

> **Đo trên lab.** Từ hai dòng `nexthop` trong `out/ecmp-kernel.txt` tới một dòng `via 10.115.14.4` trong `out/one-path.txt`, r1 đã bỏ ứng viên của peer bị shutdown. Script polling theo trạng thái, không đo thời gian phát hiện lỗi. Đây là rút một path FRR có chủ ý; không phải mô phỏng IPsec âm thầm mất gói hoặc sự cố location DX.

Cả hai nhánh cùng tới một r4 là một giới hạn có chủ ý của bài. Muốn đánh giá miền lỗi độc lập cần tách router đầu xa và thành phần hạ tầng, rồi thử mất từng thành phần. Muốn đánh giá ứng dụng cần thêm một đích thực, route chiều về, probe có timestamp và tiêu chí tỷ lệ lỗi trong giai đoạn đổi đường. Chỉ một route dự phòng đã cài không thay được các bằng chứng đó.

## 5. Tính tay

Các phép tính được Python kiểm lại trong `out/arithmetic.txt`. Các tốc độ bên dưới là **giả định để suy luận**, không phải giới hạn Site-to-Site VPN hay đo được trên Direct Connect.

### 5.1 Tổng capacity khác trần một flow

Hai nhánh độc lập, mỗi nhánh giới hạn 100 Mbit/s; giả sử chọn next hop theo flow, đủ flow rải đều, bỏ qua overhead và bottleneck khác. Tổng trần lý tưởng là bao nhiêu? Một flow duy nhất có trần bao nhiêu? Mất một nhánh thì tải tổng 150 Mbit/s còn vừa không?

**Lời giải:** tổng trần lý tưởng `2 × 100 = 200 Mbit/s`; một flow gắn một nhánh có trần không quá `100 Mbit/s`. Còn một nhánh thì tổng trần chỉ `100 Mbit/s`, thấp hơn tải giả định 150. Bản thiết kế đang active/active không tự có đủ capacity dự phòng. Tỷ lệ sử dụng trước lỗi là `150 / 200 = 75%`, nhưng sau lỗi nhu cầu thành `150 / 100 = 150%` capacity còn lại. Không gọi 200 là throughput đã đo và không bảo đảm rải đều khi số flow ít.

### 5.2 Một prefix nhỏ gây lỗi rộng tới đâu?

`10.80.0.0/16` có đường đúng, `10.80.1.0/24` trỏ blackhole. Tỷ lệ địa chỉ bị che là bao nhiêu? Nếu toàn bộ dịch vụ backend cần gọi nằm ở `10.80.1.8`, tỷ lệ request có nhất thiết bằng tỷ lệ địa chỉ không?

**Lời giải:** `/16` có `65.536` địa chỉ, `/24` có `256`; `256 / 65536 × 100 = 0,390625%`. Nếu mọi request đều nhắm `10.80.1.8` thì toàn bộ các request đó nằm trong vùng lỗi. Tỷ lệ không gian địa chỉ không đại diện cho tỷ lệ traffic. Đổi blackhole thành một next hop có tồn tại nhưng không tới dịch vụ có thể đổi thông báo lỗi mà vẫn giữ cùng nguyên nhân lookup.

### 5.3 Chọn đúng bước trước khi tính thuộc tính

Bài toán giả định: TGW học `172.20.0.0/16` từ DX gateway và cũng từ VPN, path DX dài hơn path VPN; không có route đặc biệt khác, endpoint khoẻ. Sau đó VPN còn quảng bá thêm `172.20.8.0/24`. IP `172.20.8.10` và `172.20.9.10` đi theo loại kết nối nào? Nếu rút `/24`, thêm prepend ở DX có tự biến VPN thành chính cho `/16` không?

**Lời giải:** `.8.10` khớp `/24` nên theo VPN; `.9.10` chỉ khớp `/16`, trong cặp route propagated đã nêu TGW ưu tiên DX gateway. Khi rút `/24`, cả hai IP quay về phép chọn cho `/16`; prepend không tự vượt qua ưu tiên giữa hai loại attachment. Kết quả là suy luận từ phạm vi luật TGW đã dẫn, chưa là snapshot tài khoản AWS. Không dùng lời giải này cho VGW, Cloud WAN hoặc một route table có thêm static route mà chưa xét điều kiện riêng.

## 6. Chuyển giao

1. Tunnel UP, CPE nhận prefix VPC nhưng EC2 không về được mạng tại chỗ. Bạn thu những bảng nào ở subnet, TGW và CPE để tìm lookup thiếu, thay vì chỉ restart phiên BGP?
2. Hai VPN gắn TGW cùng quảng bá một prefix nhưng có AS_PATH khác ASN. Bạn kiểm điều kiện ECMP của TGW và thiết kế số AS ở đâu trước khi bật `multipath-relax` trên CPE?
3. Hai DX VIF ở các location khác nhau có path dài bằng nhau nhưng traffic chỉ về một phía. Những community và thuộc tính liên quan associated Region nào cần đối chiếu ở nguồn AWS trước khi nói ECMP lỗi?
4. Sau failover, ping hai chiều thành công nhưng một nhóm kết nối TCP cũ vẫn treo. Bạn tách lỗi route khỏi state của firewall/NAT và trạng thái transport bằng những phép thử nào?
5. Một static route và một propagated route không cùng CIDR, dashboard lại báo “static luôn thắng”. Bạn chọn hai địa chỉ đích nào để làm kết luận ấy có thể bị bác bỏ?
6. Thiết kế thử nghiệm một hệ thống hai CPE, hai location DX, VPN dự phòng trên TGW, hai route table tách môi trường và firewall stateful. Hãy tìm một lỗi đơn vẫn làm cả hai đường không phục vụ được, rồi xác định bằng chứng tối thiểu để phân biệt sai association, mất capacity, route cụ thể lọt vào và bất đối xứng qua firewall. Đây là câu khó nhất, không có đáp án trong bài.

## 7. Tóm tắt

- Amazon-side ASN phải lấy theo gateway/VIF thực; VGW và DX gateway có mặc định 64512, còn DX public VIF dùng phía AWS AS7224 theo tài liệu.
- Phiên BGP, prefix nhận, propagation, bảng lookup và traffic hai chiều là các lớp bằng chứng khác nhau.
- VPC, VGW, TGW và DX có phạm vi ưu tiên route riêng; điều kiện cùng prefix không được bỏ khỏi kết luận.
- VGW không hỗ trợ VPN ECMP; TGW VPN và DX private/transit VIF có điều kiện ECMP riêng.
- Policy nhập prefix VPC ở CPE ảnh hưởng chiều gửi tới AWS; community trên prefix on-prem ảnh hưởng lựa chọn chiều AWS gửi về theo policy hỗ trợ.
- Lab cài hai next hop, rồi blackhole `/24` làm lookup thất bại trong khi hai peer vẫn nhận một prefix; shutdown một peer để lại một next hop.

→ **Bài 16 — TCP từ bên trong: sequence, ACK, retransmission**: khi đường IP đã có, kiểm cách transport nhận ra và phục hồi những byte bị mất trên đường ấy.
