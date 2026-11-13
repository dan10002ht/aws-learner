# Bài 28 — Mạng cloud dưới nắp: VPC không phải switch kéo dài

## 1. Mục tiêu

Sau bài này bạn có thể:

- Theo dấu một packet từ địa chỉ trong VPC tới vị trí vật lý, phân biệt route của khách hàng với ánh xạ do AWS quản lý.
- Giải thích vì sao thấy ARP trong guest vẫn không chứng minh broadcast đã lan tới các ENI khác.
- Dự đoán kết quả xóa một luật security group đối với kết nối tracked, untracked và kết nối mới.
- Chọn bằng chứng để phân biệt cạn conntrack của security group với cạn bảng conntrack Linux hay giới hạn socket ứng dụng.
- Tính kích thước payload qua đường MTU 9.001 và 1.500 byte, rồi kiểm giả thuyết bằng probe đặt DF.
- Đọc ba phép thử cục bộ đúng phạm vi, và thiết kế bước kiểm tiếp trên EC2 mà không gán kết quả Linux cho AWS.

## 2. Triệu chứng

Một service chuyển từ máy ảo trên bridge nội bộ lên EC2. Mọi thứ trông quen: guest có `eth0`, MAC, IP private và route tới subnet. Dev mang theo cách kiểm cũ: “Cùng subnet thì ARP hỏi trực tiếp máy kia; xóa luật mở port thì socket đang mở phải chết.”

Ta cho cách nghĩ thứ hai chạy trước trong lab thu nhỏ: client `10.28.0.10` đã nối TCP tới `10.28.0.20:8080`; router có luật cho kết nối mới vào port đó. Sau khi xóa luật, output vẫn là:

```text
TCP before-revoke
TCP after-revoke
new: timed out
```

Socket cũ vẫn nhận echo, socket mới timeout. Đây là **output thật của mô hình Linux**, trích `net-28/out/run.txt`; chưa phải một sự cố EC2 đã đo. Nếu chỉ mở lại đúng luật rồi báo “firewall đã hết cache”, ta bỏ qua nguyên nhân: một quyết định dựa trên state tồn tại qua thay đổi cấu hình.

> **Đo trên lab.** Alpine 3.20.10, kernel Linux 6.8.0-64-generic, Docker trên VM aarch64. `./run.sh` trong thư mục lab `net-28` dựng namespace, proxy ARP và firewall stateful rồi ghi `out/run.txt`. Cặp dòng `after-revoke` và `new: timed out` đến từ cùng lượt thử, sau cùng một lần xóa luật cho NEW. Không dùng số thời gian trong ping làm latency AWS.

[Bài VPC cho SAA](../saa-c03/16-networking.md) đã dạy subnet, route table, SG và NACL. Ở đây ta không dựng lại sơ đồ public/private subnet. [Bài bridge](net-04-bridge-veth-vlan.md), [router Linux](net-06-routing-forwarding.md), [NAT và conntrack](net-07-nat-conntrack.md) và [BGP trong cloud](net-15-bgp-trong-cloud.md) cũng là kiến thức đầu vào. Câu hỏi mới là: **những đối tượng trông giống mạng Ethernet trong guest được dịch thành hành vi gì ở hạ tầng cloud?**

## ⏸ Dừng lại — đoán trước #1

A và B là hai EC2 trong cùng subnet. A thấy một ARP reply cho IP B. Kết luận nào có đủ cơ sở?

- (a) ARP request đã được flood tới tất cả EC2 trong subnet.
- (b) B chắc chắn đã tự phát reply đó từ kernel của nó.
- (c) Guest A đã nhận được thông tin dùng để tạo frame; chưa biết request có tới B hay không.
- (d) Toàn bộ VPC là một Linux bridge có bật VLAN filtering.

## 3. Cơ chế

### 3.1 Overlay giữ địa chỉ của workload độc lập với dây vật lý

Đáp án là **(c)**. Giao diện mà guest nhìn thấy không buộc mạng vật lý phải thực hiện đúng thuật toán của một switch Ethernet. **Overlay là mạng logic có địa chỉ và chính sách riêng, được thực hiện bên trên một mạng vận chuyển khác.** **Underlay là mạng vận chuyển bên dưới, chịu trách nhiệm đưa dữ liệu tới các vị trí vật lý.** Hai tên này phân biệt hai không gian quyết định, không chỉ hai lớp header trong một capture.

Ở bridge bài 4, một MAC được học trên cổng vì frame nguồn đã đi vào cổng đó. Khi chuyển workload sang host khác, vị trí học được phải thay đổi. Với cloud, địa chỉ private và chính sách của khách hàng phải còn ý nghĩa dù hạ tầng quản lý vị trí host riêng. Vì vậy cần một bước chuyển từ “đích logic nào trong mạng của khách hàng” sang “đưa packet tới vị trí hạ tầng nào”.

**Mapping service là dịch vụ ánh xạ route/IP thuộc mạng logic sang đích vật lý để lớp thực thi mạng biết nơi chuyển dữ liệu.** Đây không phải Route 53, không đổi hostname thành IP, cũng không phải bảng ARP của hệ điều hành guest. Tài liệu kiến trúc AWS mô tả mapping service phân tán; mapping được cache tại nơi sử dụng và bị invalidated khi thay đổi. **Cache invalidation là việc làm mất hiệu lực bản ánh xạ cũ để nó không tiếp tục được dùng như dữ kiện hiện hành.**

> **Nguồn.** AWS re:Inforce NIS201, phần “VPC Isolation”, mô tả ánh xạ từ route/IP VPC sang đích vật lý và cơ chế cache/invalidation. Cũng trong tài liệu này, AWS viết: *“ARP packets don’t traverse the network”*. Xem [slide kiến trúc AWS](https://d1.awsstatic.com/events/Summits/awsreinforce2023/NIS201_Behind-the-scenes-AWS-investments-in-security-innovation.pdf). Bài dùng mô hình công khai này để giải thích, không khẳng định chi tiết triển khai nội bộ không được công bố.

<step-flow>
<svg viewBox="0 0 520 460" role="img" aria-labelledby="net28-a-t net28-a-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net28-a-t">Từ đích logic tới nơi vận chuyển</title>
<desc id="net28-a-d">Mô hình AWS công khai: mapping được cache tại nơi dùng. Packet không đi xuyên dịch vụ mapping như router trung gian.</desc>
<defs><marker id="net28-a-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="currentColor"/></marker></defs>
<g fill="currentColor" font-size="14" font-family="sans-serif">
<rect x="30" y="25" width="200" height="55" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="130.0" y="57.5" text-anchor="middle">A · 10.28.0.10</text><rect x="290" y="25" width="200" height="55" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="390.0" y="57.5" text-anchor="middle">B · 10.28.0.20</text><rect x="30" y="180" width="200" height="65" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="130.0" y="217.5" text-anchor="middle">Lớp thực thi nguồn</text><rect x="290" y="180" width="200" height="65" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="390.0" y="217.5" text-anchor="middle">Lớp thực thi đích</text><rect x="130" y="315" width="260" height="60" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="260.0" y="350.0" text-anchor="middle">Mapping service</text>
<g data-step="1"><path d="M130,80 L130,180" fill="none" stroke="currentColor" marker-end="url(#net28-a-arrow)"/><text x="260" y="115" text-anchor="middle">Đích logic trong ngữ cảnh VPC</text></g>
<g data-step="2"><path d="M80,245 L140,315" fill="none" stroke="currentColor" marker-end="url(#net28-a-arrow)"/><text x="325" y="285" text-anchor="middle">Cache mapping tại nơi dùng</text></g>
<g data-step="3"><path d="M230,212 L290,212" fill="none" stroke="currentColor" marker-end="url(#net28-a-arrow)"/><path d="M390,180 L390,80" fill="none" stroke="currentColor" marker-end="url(#net28-a-arrow)"/><text x="260" y="425" text-anchor="middle">Đường dữ liệu qua underlay</text></g>
</g>
</svg>
<step-note data-step="1">Guest dùng địa chỉ logic; không cần biết IP của host vật lý. Đây là hình kiến trúc, không phải topology AWS đã đo.</step-note>
<step-note data-step="2">Dịch vụ phân tán cung cấp mapping; cache không buộc mỗi packet phải đi qua một máy mapping trung tâm.</step-note>
<step-note data-step="3">Lớp thực thi chuyển dữ liệu tới vị trí đích. Không gán định dạng tunnel hay thời gian hội tụ chưa được nguồn công bố.</step-note>
</step-flow>

Ví dụ trong hình dùng IP `10.28.0.10` và `.20` của lab để đối chiếu địa chỉ; nhánh mapping là mô hình kiến trúc AWS, **không có mapping service AWS chạy trong lab**. Hai mạng logic tách biệt có thể dùng cùng một IP private mà không vì thế cùng là một endpoint: lookup phải giữ ngữ cảnh mạng. Cách viết “ngữ cảnh VPC + địa chỉ” là mô hình giải thích sự cô lập, không phải định dạng key của một API công khai.

**Suy luận:** Khi workload đổi vị trí vật lý mà vẫn giữ danh tính mạng logic hợp lệ, hạ tầng cần cập nhật nơi chuyển dữ liệu thay vì đòi mọi guest học địa chỉ underlay. Điều này suy từ vai trò mapping và invalidation; slide không cho thời gian hội tụ hay TTL cache để ta hứa “chuyển host mất bao nhiêu mili giây”. Muốn kiểm thời gian gián đoạn phải đo từ nguồn tới workload trong một thử nghiệm được hỗ trợ, đồng thời ghi thay đổi ENI/IP và trạng thái ứng dụng.

### 3.2 ARP được đáp ứng, broadcast không biến thành miền LAN chung

**ENI — elastic network interface — là interface mạng logic AWS gắn với thuộc tính như địa chỉ và security group.** Guest vẫn chạy IP stack quen thuộc và có thể phát ARP để tìm thông tin tầng liên kết. Hạ tầng có thể đáp ứng chức năng ấy mà không phát bản sao ARP request tới từng ENI trong subnet. Đây là điểm phân biệt “guest nói ARP” với “mạng cloud là một miền broadcast”.

Trong mô hình Linux ở lab, A mang `10.28.0.10/24`, B mang `.20/24`, nhưng hai đầu dây của chúng kết thúc ở **hai interface router khác nhau**, không cắm chung bridge. A coi B on-link nên hỏi ARP cho B. Router có route `/32` tới B qua interface bên kia và bật proxy ARP, vì thế trả lời thay. **Proxy ARP là việc một node trả lời ARP cho địa chỉ khác để nhận frame rồi chuyển tiếp packet tới đích.**

A nhận MAC của đầu router phía mình. Sau đó frame gửi tới MAC ấy, trong khi IP đích vẫn là B. Router dùng bảng route đưa IP packet sang phía B. Không có nghịch lý: địa chỉ tầng liên kết chỉ cần tới bên nhận frame ở đoạn hiện tại. Trong lúc `arping` diễn ra, capture phía B không thấy ARP nào. Phép thử nhỏ này làm kết luận “nhận ARP reply nghĩa là peer đã nghe broadcast” mất hiệu lực.

<svg viewBox="0 0 520 360" role="img" aria-labelledby="net28-b-t net28-b-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net28-b-t">Proxy ARP trên hai link tách biệt</title>
<desc id="net28-b-d">A và B cùng prefix nhưng không có bridge chung. Router trả lời ARP cho B ở link A và định tuyến IP qua link B.</desc>
<defs><marker id="net28-b-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="currentColor"/></marker></defs>
<g fill="currentColor" font-size="14" font-family="sans-serif">
<rect x="70" y="15" width="380" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="260.0" y="45.0" text-anchor="middle">A · 10.28.0.10/24</text><path d="M80,65 L80,130" fill="none" stroke="currentColor" marker-end="url(#net28-b-arrow)"/><text x="260" y="96" text-anchor="middle">ARP hỏi 10.28.0.20</text><rect x="45" y="130" width="430" height="90" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="260.0" y="180.0" text-anchor="middle">Router · proxy ARP bật</text><text x="260" y="195" text-anchor="middle">MAC phía A: 02:00:00:28:01:10</text><path d="M80,220 L80,290" fill="none" stroke="currentColor" marker-end="url(#net28-b-arrow)"/><text x="260" y="254" text-anchor="middle">IP được route; ARP không flood</text><rect x="70" y="290" width="380" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="260.0" y="320.0" text-anchor="middle">B · 10.28.0.20/24</text>
</g>
</svg>

> **Nguồn.** [Linux IP sysctl, `proxy_arp`](https://docs.kernel.org/networking/ip-sysctl.html) mô tả cờ proxy ARP theo interface. Phần mô phỏng dùng cơ chế này; **không khẳng định AWS chạy Linux proxy_arp**. [AWS: Layer 2 networking trên EC2](https://aws.amazon.com/blogs/networking-and-content-delivery/setting-up-layer-2-networking-on-amazon-ec2/) xác nhận VPC là mạng Layer 3 và mặc định không chuyển broadcast/multicast frame giữa các ENI.

Hệ quả vận hành là một chương trình khám phá peer bằng UDP broadcast không tự hoạt động chỉ vì hai EC2 có cùng prefix. Tương tự, một cơ chế failover dựa duy nhất vào gratuitous ARP không tự đăng ký lại quyền sở hữu IP với AWS. **Gratuitous ARP là thông báo ARP không xuất phát từ một truy vấn thông thường, thường dùng để cập nhật ánh xạ địa chỉ ở các peer.** Muốn đổi nơi nhận traffic, phải dùng cách quản lý địa chỉ/route/endpoint mà nền tảng hỗ trợ và kiểm trạng thái thật, thay vì chỉ đổi cache trong guest.

Cũng không suy “không broadcast mặc định” thành “không có giải pháp multicast hoặc L2 nào trên AWS”. AWS có multicast qua Transit Gateway và có thể dựng mạng L2 riêng bằng tunnel giữa các instance; chúng có topology, chính sách và chi phí vận chuyển riêng. Bài này xét mạng VPC/ENI thông thường, không xét miền L2 do bạn tự bọc thêm. Tắt source/destination check để làm router cũng không biến ENI thành cổng switch tùy ý.

**Suy luận cho debug:** capture ARP ở A chưa chứng minh B đã nhận. Cần capture tại B, xác nhận đúng interface/filter bằng traffic kiểm soát rồi đối chiếu thời gian. Capture rỗng riêng lẻ chưa đủ để quy nguyên nhân.

## ⏸ Dừng lại — đoán trước #2

Một kết nối TCP **đang được SG theo dõi** đã vào service qua luật inbound. Bạn xóa luật cho nguồn đó, không đổi thành phần khác. Điều gì xảy ra?

- (a) SG luôn phát TCP RST cho socket cũ.
- (b) Socket cũ có thể tiếp tục nhờ state; kết nối mới không còn được luật vừa xóa cho phép.
- (c) Socket cũ bắt buộc chết khi ứng dụng gọi `recv` tiếp theo.
- (d) Xóa luật SG xóa luôn state của mọi NAT gateway trên đường.

### 3.3 SG stateful giữ quyền cho traffic trả lời của kết nối

Đáp án là **(b)**, với điều kiện tracked đã ghi trong câu hỏi. **Stateful filtering là quyết định cho phép packet có xét trạng thái một luồng đã biết, thay vì chỉ so từng packet với bộ luật chiều hiện tại.** **Connection tracking là cơ chế giữ thông tin luồng để nhận ra packet tiếp theo hoặc traffic trả lời thuộc trao đổi đã được chấp nhận.** Khái niệm theo dõi ở bài NAT vẫn dùng được; điểm mới là SG có state do hạ tầng AWS quản lý, nằm ngoài bảng kernel của guest.

Ví dụ client mở TCP tới server port `8080`: luật inbound cho phép lượt khởi đầu; state giúp SG nhận ra response của server. Response ấy được phép ở SG dù outbound SG không có luật độc lập cho việc mở kết nối theo chiều đó. Đây là lý do không phải thêm một outbound rule cho từng ephemeral port chỉ để cho response của kết nối inbound đã được SG theo dõi.

Nhưng “được SG cho qua” không tạo route chiều về, không mở firewall của hệ điều hành và không vượt một NACL đang deny. SG stateful giải quyết **một điểm kiểm chính sách**, không bảo đảm đường đi cuối cùng. **NACL — network access control list — là bộ luật lọc stateless ở ranh giới subnet.** Stateless nghĩa là packet chiều về vẫn phải qua phép kiểm luật của chiều đó, không được tự cho qua nhờ state của chiều đi.

<step-flow>
<svg viewBox="0 0 520 410" role="img" aria-labelledby="net28-c-t net28-c-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net28-c-t">State còn sau khi xóa luật NEW</title>
<desc id="net28-c-d">Mô hình lab: thay rule không xóa state ESTABLISHED. Kết nối mới bị DROP; payload trên socket cũ vẫn echo.</desc>
<defs><marker id="net28-c-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="currentColor"/></marker></defs>
<g fill="currentColor" font-size="14" font-family="sans-serif">
<rect x="30" y="20" width="200" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="130.0" y="50.0" text-anchor="middle">A · client</text><rect x="290" y="20" width="200" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="390.0" y="50.0" text-anchor="middle">B · TCP 8080</text><rect x="35" y="170" width="450" height="70" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="260.0" y="192" text-anchor="middle">Bộ lọc tại router</text><rect x="35" y="305" width="450" height="60" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="260.0" y="340.0" text-anchor="middle">State: flow A → B đã có</text>
<g data-step="1" data-until="1"><path d="M230,45 L290,45" fill="none" stroke="currentColor" marker-end="url(#net28-c-arrow)"/><text x="260" y="110" text-anchor="middle">Luật NEW cho phép mở socket</text><text x="260" y="215" text-anchor="middle">NEW + ESTABLISHED được phép</text></g>
<g data-step="2" data-until="2"><text x="260" y="110" text-anchor="middle">Xóa rule NEW; không xóa state</text><text x="260" y="215" text-anchor="middle">Chỉ còn accept ESTABLISHED</text></g>
<g data-step="3"><path d="M230,45 L290,45" fill="none" stroke="currentColor" marker-end="url(#net28-c-arrow)"/><text x="260" y="110" text-anchor="middle">Socket cũ: after-revoke được echo</text><text x="260" y="215" text-anchor="middle">Socket mới: không khớp → DROP</text></g>
</g>
</svg>
<step-note data-step="1">Lượt mở đầu được rule cho phép, tạo state để các packet tiếp theo được nhận ra.</step-note>
<step-note data-step="2">Phần rule cũ biến mất ở bước sau; bản ghi flow còn. Đổi cấu hình và xóa state là hai thao tác khác nhau.</step-note>
<step-note data-step="3">Gửi dữ liệu mới trên socket cũ và thử socket mới cho hai kết quả khác nhau. Hình chưa mô phỏng ngoại lệ untracked của AWS.</step-note>
</step-flow>

> **Nguồn.** [EC2 connection tracking](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-connection-tracking.html) xác nhận response được cho phép bất kể luật SG chiều đối diện và thay đổi rule không lập tức ngắt kết nối tracked. Tài liệu cũng nêu NACL có thể chặn traffic của kết nối hiện hữu. Không suy rằng đổi SG sẽ phát RST hoặc rằng app đang chờ chắc chắn nhận lỗi tức thì.

Khi thu hồi quyền một client, phải nói rõ bạn đang chặn **lượt mở mới** hay muốn **ngắt trao đổi đã tồn tại**. Chỉ xóa luật SG chưa thực hiện được mục tiêu thứ hai cho tracked flow còn hiệu lực. Dùng cơ chế ngắt có chủ đích ở ứng dụng/proxy hoặc chính sách stateless thích hợp cần tính cả phạm vi ảnh hưởng; không dùng timeout ngẫu nhiên làm bằng chứng đã thu hồi xong.

### 3.4 “SG stateful” không có nghĩa mọi flow đều được tracked

AWS có ngoại lệ quan trọng: TCP/UDP được hai chiều rule cho phép đủ rộng có thể không cần state để quyết định packet trả lời. Tài liệu gọi đó là **untracked connection — luồng được cho qua bằng rule phù hợp trực tiếp, không nhờ bản ghi theo dõi SG**. Khi xóa rule đang cho phép một luồng như vậy, luồng hiện hữu có thể bị ngắt ngay bởi chính thay đổi rule; kết quả khác câu hỏi trước vì **điều kiện tracked đã thay đổi**.

Ví dụ AWS nêu inbound TCP port `22` từ `0.0.0.0/0` cùng outbound mở toàn bộ: một kết nối trực tiếp đủ điều kiện có thể untracked. Inbound thu hẹp về một IP `/32` làm kết nối trong ví dụ cần tracking. Phải giữ cả chiều rule, giao thức và đường đi trong kết luận; không phải cứ nhìn thấy outbound all là nói toàn bộ SG không stateful.

NAT gateway, NLB và interface VPC endpoint nằm trong nhóm **automatically tracked** của AWS, kể cả khi rule đủ rộng. Đổi đường qua chúng có thể đổi nhu cầu tracking mà số request không đổi. Không mở all để thử né conntrack: vừa mở quyền vừa không bảo đảm bỏ tracking.

Các ví dụ, điều kiện untracked và danh sách automatically tracked đều lấy từ [EC2 connection tracking](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-connection-tracking.html), mục tương ứng. Đây là hành vi AWS từ nguồn; lab Linux chỉ dựng một luồng **có tracked**, chưa mô phỏng bộ điều kiện tự động của AWS.

| Tình trạng trước khi đổi luật | Xóa rule cho phép khởi đầu | Phép kiểm cần làm |
|---|---|---|
| Flow tracked, state còn hiệu lực | Trao đổi cũ có thể còn đi | Gửi dữ liệu trên socket cũ và mở socket mới riêng |
| Flow untracked, rule đó đang cho traffic qua | Traffic cũ mất quyền theo rule | Kiểm đủ hai chiều rule và đường có tự động tracked không |
| Kết nối mới, không còn rule nào cho phép | Không được SG chấp nhận theo rule đã xóa | Phân biệt rule khác còn cho phép với retry trên socket cũ |

### 3.5 Có hai bảng conntrack khác nhau, tăng một bảng không nới bảng kia

Bài 7 đo conntrack của Linux để giải thích NAT. Trên EC2 cần vẽ thêm một tầng: **guest Linux có bảng của kernel; SG có allowance tracking do AWS áp cho instance**. Allowance là số lượng tối đa được phép sử dụng của một tài nguyên, ở đây là kết nối tracked. `nf_conntrack_max` không phải nút điều chỉnh allowance của SG.

CPU rảnh vẫn có thể rơi packet của kết nối mới vì hạ tầng hết chỗ tracking. Ngược lại, guest có thể đầy bảng conntrack dù SG còn headroom. **Headroom là phần dung lượng còn trống trước khi chạm giới hạn.** `ss` chỉ cho trạng thái socket mà guest thấy; một SYN bị chặn trước guest không nhất thiết tạo socket để `ss` đếm. Số socket ứng dụng, số flow kernel và số entry tracking SG không được coi là ba tên cho cùng một counter.

> **Nguồn.** [ENA network performance metrics](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitoring-network-performance-ena.html) định nghĩa `conntrack_allowance_available` là số kết nối tracked còn có thể thiết lập trước allowance của loại instance, và `conntrack_allowance_exceeded` là packet bị drop khi vượt mức tracking khiến không lập được kết nối mới. Metric available hỗ trợ trên instance Nitro theo bảng của AWS. Không có một con số allowance chung áp cho mọi EC2 trong bài này.

Muốn tìm nguyên nhân cạn state, trước hết xem metric available đang giảm hay ổn định, và counter exceeded có tăng đúng cửa sổ lỗi không. Sau đó đối chiếu tốc độ mở kết nối, thời gian giữ idle và retry. Nếu app tạo nhiều kết nối ngắn rồi để thiết bị mạng giữ state lâu, state còn chiếm chỗ sau khi app đã ngừng dùng nó. Giảm request rate không nhất thiết giải phóng state cũ ngay tại thời điểm ấy.

**Idle timeout là khoảng không hoạt động sau đó một bản ghi kết nối có thể hết hiệu lực.** Timeout SG, NAT, LB và pool ứng dụng có thể khác nhau. Pool còn giữ socket không chứng minh state mạng còn; cần thử dùng lại socket sau idle.

Không chép một giá trị mặc định cho tất cả Nitro. Tại thời điểm tải nguồn, [EC2 connection tracking, Idle timeout](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-connection-tracking.html) ghi TCP established idle có thể cấu hình từ **60 đến 432.000 giây**; mặc định **350 giây cho Nitro v6, trừ P6e-GB200**, còn các loại khác trong mô tả dùng **432.000 giây**, gồm P6e-GB200. Đó là số **từ docs AWS**, chưa được kiểm bằng ENI thật ở lab. Khi áp dụng phải kiểm loại instance và thuộc tính ENI thực tế; đây không phải tuổi thọ tối đa của một TCP socket đang hoạt động.

**Suy luận capacity:** số state đang chiếm chỗ gần bằng tốc độ tạo state nhân thời gian lưu trung bình nếu tải ổn định. Muốn dùng công thức phải nêu giả định: mỗi flow tạo bao nhiêu entry, có traffic làm mới idle không, state được xóa sớm bằng đóng kết nối không, đường có NAT/LB không. Công thức ấy giúp đặt câu hỏi, không biến một timeout cấu hình thành phép đo lifetime thực.

### 3.6 MTU của guest không phải cam kết của cả đường

**MTU — maximum transmission unit — là kích thước IP packet lớn nhất được phép qua một đoạn kết nối trong ngữ cảnh đang xét.** Guest có MTU `9001` không có nghĩa mọi target từ guest đều nhận IP packet 9.001 byte. Path MTU là giới hạn nhỏ nhất trên đường cụ thể, có thể thay đổi khi chọn đường ra khác.

> **Nguồn.** [EC2 network MTU](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/network_mtu.html) ghi mọi loại EC2 hỗ trợ MTU **1.500 byte**, các loại current generation hỗ trợ jumbo **9.001 byte**; internet gateway chỉ forward packet tới **1.500 byte**. Phải kiểm component trên đường thay vì áp 9.001 cho mọi traffic private hoặc áp 1.500 cho mọi dịch vụ AWS.

Mạng bên dưới đã lo việc vận chuyển của AWS; không lấy một overhead VXLAN đo trên Linux rồi trừ nó khỏi 9.001 như thể đó là MTU ENI được AWS công bố. **Encapsulation là bọc dữ liệu bên trong bằng header vận chuyển bên ngoài.** Nếu **bạn tự dựng thêm tunnel** trên ENI, phần bọc do bạn tạo chiếm chỗ trong packet mà ENI vận chuyển; lúc đó phải tính overhead của đúng tunnel của bạn. Hai phép tính thuộc hai ranh giới khác nhau. Gọi VPC là overlay không xác nhận AWS dùng VXLAN; không tự điền port, VNI hay overhead nội bộ từ một lab Linux.

Trong lab, hai đầu guest ban đầu đều có MTU 9.001 và đường router tương ứng cho qua cùng kích thước. Sau đó ta hạ **chỉ interface router đi về B** xuống 1.500; guest A vẫn là 9.001. Ping với DF cho thấy packet IP 1.500 đi được, 1.501 nhận “Frag needed”. Như vậy việc nhìn `ip link` ở A và ở B chưa chứng minh đoạn giữa không thấp hơn.

<svg viewBox="0 0 520 380" role="img" aria-labelledby="net28-d-t net28-d-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net28-d-t">MTU guest và MTU đoạn giữa</title>
<desc id="net28-d-d">Lab giữ guest MTU 9001, hạ interface router phía B xuống 1500. Packet IPv4 DF 1501 byte bị từ chối.</desc>
<defs><marker id="net28-d-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="currentColor"/></marker></defs>
<g fill="currentColor" font-size="14" font-family="sans-serif">
<rect x="60" y="15" width="400" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="260.0" y="45.0" text-anchor="middle">Guest A · MTU 9001</text><path d="M260,65 L260,125" fill="none" stroke="currentColor" marker-end="url(#net28-d-arrow)"/><rect x="60" y="125" width="400" height="55" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="260.0" y="157.5" text-anchor="middle">Router đi B · MTU 1500</text><path d="M260,180 L260,240" fill="none" stroke="currentColor" marker-end="url(#net28-d-arrow)"/><rect x="60" y="240" width="400" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="260.0" y="270.0" text-anchor="middle">Guest B · MTU 9001</text><text x="260" y="325" text-anchor="middle">1472 + 28 = 1500: đi được</text><text x="260" y="352" text-anchor="middle">1473 + 28 = 1501: DF → báo lỗi</text>
</g>
</svg>

Không lặp thuật toán PMTUD đã có ở [bài MTU](net-05-mtu-pmtud.md); phần cần mang sang cloud là kiểm ranh giới. Một SYN nhỏ đi qua không xác nhận đường đủ MTU cho dữ liệu lớn. Một ICMP nhỏ thành công cũng không xác nhận ICMP báo lỗi cần thiết quay về được. Với IPv4, đặt DF và tăng payload có kiểm soát giúp tìm ngưỡng; phải trừ IP/ICMP header thay vì coi `ping -s` là kích thước cả packet.

Tài liệu [EC2 network MTU, PMTUD](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/network_mtu.html) cũng lưu ý ICMP có thể bị NACL chặn dù SG cho phép. Do đó đừng chữa mọi lỗi HTTPS treo bằng một rule SG mở all. Ghi lại đường egress, kích thước packet bị lỗi, phản hồi ICMP hoặc sự thiếu phản hồi ở đúng điểm capture, rồi thay một điều kiện mỗi lần. Hạ MTU để thử có thể giúp xác định nhóm nguyên nhân; nó chưa tự chỉ ra thiết bị nào chặn phản hồi.

## 4. Lab

### 4.1 Một router nhỏ thay cho ba khẳng định quá rộng

Thư mục lab là `net-lab/net-28/`, chứa `run.sh`, `lab.py`, `src/` và `out/`. Từ thư mục ấy chạy:

```bash
./run.sh
```

Script tự ghi stdout phép đo bằng `tee out/run.txt`, tạo đúng container `net28-model` rồi dọn bằng trap. Container Alpine cần quyền privileged để dựng network namespace; cấu hình này dành cho lab cục bộ. Không đổi sysctl host macOS, không thay firewall VM chung và không đụng container lane khác. Cần Docker cùng kết nối tải package Alpine; lỗi cài package làm script thất bại trước khi đo.

Topology không dùng bridge: namespace `net28-a` nối router qua `net28-va`, namespace `net28-b` qua `net28-vb`. Guest A/B dùng cùng `/24`; router có route `/32` tới từng guest, bật IP forwarding và proxy ARP ở hai cổng. MAC `net28-va` được đặt cố định `02:00:00:28:01:10` để đối chiếu, không phải địa chỉ thật của ENI AWS. Router có địa chỉ `.1` phía A và `.254` phía B để phát phản hồi ICMP rõ nguồn.

Ba phép thử được thực hiện lần lượt: đáp ứng ARP mà không flood sang B; giảm MTU ở đoạn giữa; xóa luật NEW trong khi giữ luật cho ESTABLISHED. Chúng nối các quan sát về mạng logic với cơ chế có thể tự tái tạo. **Không có tunnel underlay AWS, mapping service thật, SG thật hay thử cạn allowance AWS** trong container này.

### 4.2 ARP reply do ai phát?

Lệnh chính trong `lab.py`, khi namespace còn tồn tại:

```bash
ip netns exec net28-a arping -c 1 -I eth0 10.28.0.20
tcpdump -nn -i net28-vb arp
cat /sys/class/net/net28-va/address
```

Script khởi động capture phía B trước khi chạy `arping`; cửa sổ này chưa có ping hay traffic ứng dụng. Trích các dòng quyết định từ `out/run.txt`, bỏ RTT không dùng để kết luận:

```text
ARP REQUEST ARPING 10.28.0.20 from 10.28.0.10 eth0
Unicast reply from 10.28.0.20 [02:00:00:28:01:10]  689.115ms
Sent 1 probes (1 broadcast(s))
Received 1 response(s)
0 packets captured
0 packets received by filter
0 packets dropped by kernel
ROUTER MAC 02:00:00:28:01:10
```

**Thấy gì:** ARP reply nhận về mang MAC đúng đầu router phía A, dù địa chỉ được hỏi là IP B. Phía B không nhận packet qua filter ARP trong cửa sổ ấy. **Vì sao:** router có đường tới B và được phép proxy ARP; A không cần cùng một bridge vật lý với B để được cung cấp thông tin tạo frame.

Dòng `Sent 1 probes (1 broadcast(s))` không hề mâu thuẫn với capture phía B rỗng. Broadcast đã được phát **trên đoạn A–router**; bài toán là nó có được lan tiếp hay không. Không đọc một counter phát ở A như counter nhận của B. `arping` dùng giao diện riêng để hỏi ARP; đừng đòi ngay sau đó `ip neigh` phải có entry mà một ping thông thường sẽ tạo.

Script kiểm dương ở cửa sổ riêng bằng ARP từ B hỏi địa chỉ router `.254`. Cùng interface và filter ghi được request/reply; `out/run.txt` có:

```text
2 packets captured
2 packets received by filter
0 packets dropped by kernel
```

Phép kiểm dương xác nhận capture nhìn được ARP trên link B. Kết hợp topology hai link không bridge và MAC router, ta có cơ sở quy reply ban đầu cho proxy ARP. Trên AWS không lấy MAC trong lab làm quy luật MAC ARP reply của ENI.

### 4.3 Cùng guest MTU, khác đoạn giữa

Lệnh thử lần lượt trong script:

```bash
ip netns exec net28-a ping -c 1 -M do -s 8973 10.28.0.20
ip link set net28-vb mtu 1500
ip netns exec net28-a ping -c 1 -M do -s 1472 10.28.0.20
ip netns exec net28-a ping -c 1 -W 1 -M do -s 1473 10.28.0.20
```

Trích `out/run.txt`:

```text
JUMBO PING 10.28.0.20 (10.28.0.20) 8973(9001) bytes of data.
8981 bytes from 10.28.0.20: icmp_seq=1 ttl=63 time=1293 ms
1500 OK PING 10.28.0.20 (10.28.0.20) 1472(1500) bytes of data.
1480 bytes from 10.28.0.20: icmp_seq=1 ttl=63 time=0.030 ms
1501 FAIL PING 10.28.0.20 (10.28.0.20) 1473(1501) bytes of data.
From 10.28.0.1 icmp_seq=1 Frag needed and DF set (mtu = 1500)
```

**Thấy gì:** packet jumbo đi được ở cấu hình đầu; sau khi hạ đoạn giữa, 1.472 byte ICMP data vẫn đi, thêm một byte thì lỗi có ICMP nêu MTU. **Vì sao:** IPv4 không options cộng ICMP Echo header thêm tổng 28 byte. Dòng “8981 bytes from” tính ICMP header nhưng chưa tính IPv4 header; đừng đọc nó thành kích thước IP packet khác với số 9.001 trong dòng đầu.

### 4.4 Xóa quyền khởi đầu, gửi tiếp trên socket cũ

Sau phép đo MTU, script đặt default policy FORWARD DROP, thêm accept cho ESTABLISHED/RELATED và một rule NEW TCP tới `8080`. Server B echo lại nội dung; client A giữ cùng một socket qua hai lượt gửi. Chỉ giữa hai lượt, script chạy:

```bash
iptables -D FORWARD -p tcp --dport 8080 \
  -m conntrack --ctstate NEW -j ACCEPT
```

Sau lượt gửi thứ hai, client khác thử mở kết nối mới có timeout. Trích phần cuối `out/run.txt`:

```text
TCP before-revoke
TCP after-revoke
new: timed out
FORWARD -P FORWARD DROP
-A FORWARD -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
```

**Thấy gì:** rule NEW đã biến mất, payload mới vẫn echo trên socket cũ, còn socket mới không nối được trong thời hạn phép thử. **Vì sao:** state của socket cũ cho packet khớp ESTABLISHED; SYN mới không được rule còn lại cho qua. Không cần NAT ở đây để minh họa stateful filtering.

> **Chưa đo.** Lab không đo rule propagation của AWS, thời gian xóa state SG, allowance của loại EC2 cụ thể hay hành vi untracked của AWS. Muốn kiểm trên cloud: dùng hai instance test, luật nguồn thu hẹp để flow được tracked, giữ một socket gửi marker trước–sau, đồng thời mở socket mới và ghi timestamp. Kiểm riêng một cấu hình untracked đủ điều kiện theo docs; không đổi đường qua NLB/NAT giữa hai lượt rồi quy mọi khác biệt cho rule.

### 4.5 Mang phép phân biệt sang instance thật

Đây là lệnh **đề xuất, chưa chạy trên EC2 trong bài**. Chọn interface ENA thực tế từ `ip link`; không mặc định mọi máy tên `eth0`:

```bash
ip link show
ethtool -S <interface-ENA>
sysctl net.netfilter.nf_conntrack_count net.netfilter.nf_conntrack_max
ss -s
```

Tìm hai metric `conntrack_allowance_available` và `conntrack_allowance_exceeded` trong output ENA, ghi hai snapshot để xem biến thiên; counter exceeded tích lũy không phải tỷ lệ lỗi của giây hiện tại. Nếu driver/instance không hỗ trợ hoặc chưa nạp module conntrack guest, thiếu dòng metric/sysctl **không tương đương giá trị bằng không**. Không cài hay nạp module trên production chỉ để làm output giống bài.

## 5. Tính tay

Các số dưới đây là **suy luận từ giả định bài toán**, không phải benchmark EC2. Phép tính được chạy bằng Python ở cuối `lab.py`, ghi dưới nhãn `ARITHMETIC` trong `out/run.txt`.

### 5.1 Chọn payload theo ranh giới nào?

Giả sử IPv4 không options: header 20 byte, ICMP Echo header 8 byte; TCP cơ bản không options có header 20 byte theo [RFC 791 §3.1](https://www.rfc-editor.org/rfc/rfc791#section-3.1), [RFC 792, Echo](https://www.rfc-editor.org/rfc/rfc792) và [RFC 9293 §3.1](https://www.rfc-editor.org/rfc/rfc9293#section-3.1). Với MTU 9.001 và 1.500, `ping -s` tối đa bao nhiêu? Payload TCP tối đa theo mô hình header cơ bản là bao nhiêu?

**Lời giải:** ICMP data là `9001 − 20 − 8 = 8973` và `1500 − 20 − 8 = 1472` byte. TCP data là `9001 − 20 − 20 = 8961` và `1500 − 20 − 20 = 1460` byte. Giả định header được ghi ngay đề; TCP options hoặc IPv6 làm phép trừ khác. Không lấy 8.961 làm payload cố định của mọi TCP packet dùng jumbo.

Nếu gửi 1.460.000 byte dữ liệu, bỏ qua options, retransmission và mọi giới hạn khác, đoạn 1.500 cần `1.460.000 / 1.460 = 1.000` packet dữ liệu; đoạn 9.001 cần `ceil(1.460.000 / 8.961) = 163`. Ít packet hơn không bảo đảm request nhanh hơn cùng tỷ lệ: RTT, congestion window, pacing, CPU và bottleneck đường khác còn tồn tại.

### 5.2 Timeout dài giữ bao nhiêu state?

Giả định một workload làm phát sinh đều **200 flow tracked/giây**, mỗi flow chiếm một entry, không xóa sớm và không làm mới timer; entry tồn tại đúng **60 giây** hoặc **300 giây**. Đây là mô hình capacity giả định, không phải default AWS hay lifetime đã đo. Số entry ổn định và headroom 30.000 entry sẽ thay đổi thế nào?

**Lời giải:** occupancy lần lượt là `200 × 60 = 12.000` và `200 × 300 = 60.000` entry. Cùng tốc độ đến mà thời gian giữ tăng thì áp lực state tăng. Nếu lúc đầu còn 30.000 entry và chưa có entry nào rời đi, headroom cạn sau `30000 / 200 = 150 giây`. Ở tải thực có giải phóng/làm mới, phải tính tốc độ thay đổi ròng; không lấy 150 giây làm thời gian sự cố tất yếu.

Mô hình một entry/flow cũng phải được kiểm theo đường thực. Ví dụ docs AWS nêu riêng DynamoDB gateway endpoint có mức dùng hai conntrack entry mỗi connection; bài không dùng ngoại lệ ấy để nhân đôi mọi kết nối EC2. Nếu flow tạo nhiều entry hơn giả định, công thức phải đổi trước khi quyết định scale.

### 5.3 Cùng packet, hai phép kiểm khác nhau

Bài toán giả định: một flow đã tracked, response server được SG chấp nhận; đường về có đoạn MTU 1.500 và packet IPv4 DF dài 1.501 byte. Sau đó xóa rule inbound khởi đầu, giữ nguyên mọi thứ khác. Có thể dùng sự kiện “response không tới client” để chứng minh SG đã thu hồi flow cũ không?

**Lời giải:** không. Packet vượt đoạn MTU một byte nên có thể thất bại ở ranh giới kích thước dù SG vẫn chấp nhận theo state. Phải thử payload nhỏ trên **cùng socket cũ**, theo dõi phản hồi ICMP và kiểm một kết nối mới riêng. Trả lời bằng một phép ping nhỏ từ socket khác không phân biệt state của kết nối TCP đang xét. Kích thước và chính sách là hai điều kiện cùng cần thỏa trên đường.

## 6. Chuyển giao

1. Một agent khám phá service bằng UDP broadcast chạy được trên bridge của laptop nhưng không tìm được peer EC2 cùng subnet. Bạn thu bằng chứng nào để phân biệt giới hạn mạng VPC với việc ứng dụng bind sai interface, rồi chọn cơ chế đăng ký peer nào?
2. Hai workload ở hai VPC tách biệt đều dùng `10.28.0.20`. Vì sao bảng IP→MAC của guest không đủ giải thích sự cô lập, và khi có đường kết nối mới giữa hai VPC bạn cần xét lại điều kiện nào?
3. API bắt đầu đi qua NLB; số request và CPU gần như giữ nguyên, available tracking giảm. Bạn kiểm thay đổi đường nào và thuộc tính nào trước khi chỉnh `nf_conntrack_max`?
4. Sau khi thu hẹp inbound SG, một số client cũ mất kết nối ngay, một số vẫn gửi được. Bạn lập bảng rule/đường đi/tracked thế nào để kiểm ngoại lệ untracked, thay vì kết luận AWS cập nhật rule ngẫu nhiên?
5. Pool database dùng tốt khi có tải đều nhưng lỗi ở lượt gọi sau một quãng idle. Bạn thu timeout và marker traffic ở những tầng nào để phân biệt socket app còn mở với state mạng còn hiệu lực?
6. Bạn chuyển một appliance có hai ENI sang loại instance mới, đồng thời thêm overlay của ứng dụng. Sau triển khai, flow ngắn thành công, flow idle cũ treo, payload lớn mất và exceeded thỉnh thoảng tăng. Thiết kế chuỗi thử thay một biến mỗi lần để tách bất đối xứng, thay default timeout theo thế hệ Nitro, overhead tunnel và thiếu allowance; nêu bằng chứng nào có thể bác bỏ từng giả thuyết. Đây là câu khó nhất, không có lời giải trong bài.

## 7. Tóm tắt

- Địa chỉ và route logic không phải vị trí vật lý; mapping service là phần nối hai không gian theo mô hình kiến trúc AWS công khai ở §3.1.
- Nhận ARP reply không chứng minh broadcast tới peer; mạng VPC thông thường không flood frame giữa ENI như bridge ở bài 4.
- SG tracked flow có thể tồn tại sau khi xóa rule khởi đầu; untracked và automatically tracked phải được kiểm riêng theo docs ở §3.4.
- `nf_conntrack_max` của Linux không nới allowance SG; hai metric ENA ở §3.5 cung cấp bằng chứng cho tracking phía instance AWS.
- MTU guest 9.001 không vượt ranh giới internet gateway 1.500 byte; các số này từ EC2 network MTU, không phải suy từ overhead VXLAN.
- Lab quan sát proxy ARP, ngưỡng DF và socket cũ sống sau khi xóa rule NEW; chưa đo mapping, SG hay allowance AWS thật.

→ **Bài 29 — Bộ đồ nghề và quy trình khoanh vùng**: ghép các điểm quan sát ở guest, đường mạng và dịch vụ thành một chuỗi kiểm giả thuyết từ triệu chứng.
