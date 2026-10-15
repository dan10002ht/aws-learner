# SAA Ch2.7 — Hybrid Connectivity Deep Dive

> Mục tiêu: Đọc một đề nói "on-premises ↔ AWS" là chọn ngay được Direct Connect / Site-to-Site VPN / Client VPN / Transit Gateway / VPC endpoint — kèm đúng loại VIF, đúng mô hình resiliency, và biết tiền chảy đi đâu.

Tiền đề: [[ch2-04-network-performance]], [[ch3-02-network-security]].

---

## 1. Câu chuyện mở đầu — "Tuần sau go-live, DX vẫn chưa có"

Một team migrate ERP từ datacenter Hà Nội lên `ap-southeast-1`. Design doc ghi: "kết nối bằng AWS Direct Connect 1 Gbps". Sáu tuần sau, ngày go-live, cổng DX vẫn ở trạng thái `ordering`.

Vì sao lâu vậy? Direct Connect (DX) là một **sợi cáp thật**, không phải một lệnh API. AWS không kéo cáp tới datacenter của bạn; AWS chỉ có sẵn router đặt trong một số toà nhà trung lập gọi là **DX location**. Toà nhà đó là một **colo** (colocation facility): nơi nhiều nhà mạng và doanh nghiệp cùng thuê chỗ đặt thiết bị. Để nối vào, cần ba việc mà không việc nào làm trong một buổi chiều:

- Có thiết bị của bạn (hoặc của một nhà mạng đối tác) nằm trong đúng colo đó.
- AWS cấp một tờ **LOA-CFA** (Letter of Authorization – Connecting Facility Assignment): giấy uỷ quyền ghi rõ cổng nào trên router AWS đã dành cho bạn.
- Cầm tờ giấy đó, nhân viên colo đi một sợi cáp quang giữa hai tủ rack, nối thiết bị của bạn với cổng của AWS. Sợi cáp nối trong toà nhà này gọi là **cross-connect**.

Từ datacenter Hà Nội tới colo còn phải thuê thêm một đường truyền của nhà mạng. Trong câu chuyện, đối tác vẫn đang đi cross-connect, còn LOA-CFA thì vừa ký xong.

Câu trả lời đúng, cũng là câu trả lời đề SAA lặp đi lặp lại: **dựng Site-to-Site VPN ngay hôm nay**. VPN là một đường hầm mã hoá chạy trên internet sẵn có, nên chỉ cần một public IP ở đầu on-prem và vài chục phút cấu hình. Chạy tạm trên VPN; khi DX lên thì hai đường cùng tồn tại, DX làm đường chính, VPN làm dự phòng. Việc chuyển qua lại giữa hai đường do **BGP** lo: đó là giao thức để hai router tự báo cho nhau "tôi tới được những dải IP nào", nên khi một đường chết thì router bên kia tự biết và đổi sang đường còn lại (§4.2 và §5 nói kỹ). Không phải chọn một trong hai mà chọn cả hai, theo thứ tự thời gian.

Ba điều cần thuộc:

- Site-to-Site VPN dựng trong **phút**. Mỗi tunnel chuẩn có trần **~1,25 Gbps**, và vì đi qua internet nên latency lúc nhanh lúc chậm.
- Direct Connect cần **vài tuần tới vài tháng** để có (hosted nhanh hơn dedicated, xem §3.1). Đổi lại băng thông và latency ổn định vì không đi chung đường với internet.
- Không có bài thi nào nói "cần kết nối private ổn định **ngay lập tức**" mà đáp án là DX. "Ngay lập tức" = VPN.

---

## 2. Bức tranh tổng thể — ba trục quyết định

### 2.0 Từ vựng dùng suốt bài

Bài này dùng khá nhiều từ của dân network. Mỗi từ dưới đây chỉ cần hiểu ở mức một câu là đọc tiếp được; các section sau sẽ quay lại từng thứ.

| Thuật ngữ | Một câu |
|---|---|
| **On-premises (on-prem)** | Hạ tầng bạn tự vận hành ngoài AWS: datacenter, văn phòng, chi nhánh. |
| **CIDR / prefix** | Một dải IP viết gọn, ví dụ `10.1.0.0/16`. Số sau dấu `/` càng lớn thì dải càng hẹp và càng "cụ thể": `/24` có 256 địa chỉ, `/16` có 65.536. |
| **Route / route table** | Một dòng luật "gói tới dải X thì gửi cho Y". Router tra bảng này cho từng gói. |
| **IPsec tunnel** | Đường hầm mã hoá giữa hai router: gói tin gốc được mã hoá rồi bọc trong một gói khác để đi qua internet. VPN của AWS dùng IPsec. |
| **Customer gateway (CGW)** | Router hoặc firewall **phía bạn**, đầu on-prem của VPN. Trong AWS nó chỉ là một bản ghi chứa public IP của thiết bị đó. |
| **Virtual private gateway (VGW)** | "Cổng sau" của **đúng một VPC**: thứ bạn gắn vào VPC để VPN hoặc DX có chỗ cắm vào. Internet gateway là cổng ra internet, VGW là cổng về on-prem. |
| **Transit Gateway (TGW)** | Một router do AWS quản lý, đứng giữa làm trung tâm (hub). Nhiều VPC, VPN và DX cùng cắm vào nó, mỗi lần cắm là một **attachment**. |
| **DX location** | Toà nhà colo có sẵn router của AWS, nơi circuit Direct Connect kết thúc (§1). |
| **VIF (virtual interface)** | Một "làn" logic chạy trên circuit DX. Một circuit chở được nhiều làn, mỗi làn dẫn tới một nơi khác nhau (§3.2). |
| **Direct Connect gateway (DXGW)** | Bộ chia toàn cầu đặt giữa VIF và các VGW/TGW, giúp một circuit với tới VPC ở nhiều region (§3.2). |
| **BGP** | Border Gateway Protocol: giao thức để hai router **tự trao đổi danh sách dải IP** mỗi bên tới được, thay cho việc gõ route bằng tay. Cả internet chạy bằng giao thức này. |
| **ASN** | Autonomous System Number: "số định danh" của một mạng khi nói chuyện BGP. Mạng on-prem có một số, phía AWS có một số. Dùng nội bộ thì lấy số private trong khoảng `64512–65534`. |
| **Advertise** | Hành động một router nói qua BGP: "dải `10.1.0.0/16` nằm sau tôi, gửi cho tôi". |
| **Propagate / propagation** | Route học được qua BGP (hoặc từ một attachment) được **tự động chép** vào route table, bạn không phải nhập tay. |

Với bộ từ đó, mọi câu hỏi hybrid trong SAA đều rơi vào giao của ba trục:

1. **Đường vật lý.** Đi nhờ internet bằng đường hầm mã hoá (VPN), hay thuê hẳn một circuit riêng (DX)?
2. **Điểm cuối trong AWS.** Chỉ cần vào **một** VPC thì cắm vào VGW của VPC đó. Cần vào nhiều VPC ở nhiều account thì cắm vào Transit Gateway. Còn nếu chỉ cần gọi *service* của AWS (S3, DynamoDB, các API) mà không cần vào VPC nào thì dùng public VIF hoặc VPC endpoint.
3. **Ai là client.** Cả một site với router của nó (Site-to-Site VPN), hay từng laptop lẻ của nhân viên (Client VPN)?

Sơ đồ dưới đặt các mảnh đó vào đúng chỗ: bên trái là phía bạn, ở giữa là đường đi, bên phải là điểm cuối trong AWS.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 400" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Bức tranh hybrid connectivity — từ on-premises và người dùng tới AWS</title>
  <desc>Datacenter on-premises có hai đường lên AWS: Site-to-Site VPN đi qua internet với hai tunnel IPsec, và Direct Connect đi qua location DX bằng circuit riêng. Người dùng cá nhân dùng Client VPN. Cả ba đổ vào điểm cuối AWS: Virtual Private Gateway gắn vào một VPC, hoặc Transit Gateway làm hub nối nhiều VPC. Direct Connect qua Direct Connect Gateway có thể tới VGW bằng private VIF hoặc tới Transit Gateway bằng transit VIF, còn public VIF đi thẳng tới các public endpoint như S3.</desc>
  <defs>
    <marker id="hcArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <text x="16" y="22" font-size="14" font-weight="700" fill="currentColor">Hybrid connectivity — ai nối vào đâu</text>
  <rect x="16" y="52" width="150" height="70" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="91" y="78" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">On-premises DC</text>
  <text x="91" y="96" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">router + BGP ASN</text>
  <text x="91" y="112" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">10.1.0.0/16</text>
  <rect x="16" y="300" width="150" height="62" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="91" y="324" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Laptop / remote</text>
  <text x="91" y="342" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">OpenVPN client</text>
  <rect x="216" y="44" width="150" height="54" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="291" y="66" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Internet</text>
  <text x="291" y="84" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">2 tunnel IPsec</text>
  <rect x="216" y="128" width="150" height="54" rx="10" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="291" y="150" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">DX location</text>
  <text x="291" y="168" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">cross-connect + LAG</text>
  <line x1="166" y1="72" x2="210" y2="72" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#hcArr)"/>
  <line x1="166" y1="100" x2="210" y2="150" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#hcArr)"/>
  <line x1="166" y1="326" x2="210" y2="90" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="4 3" marker-end="url(#hcArr)"/>
  <rect x="402" y="128" width="140" height="54" rx="10" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="472" y="150" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">DX Gateway</text>
  <text x="472" y="168" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">global, cross-region</text>
  <line x1="366" y1="155" x2="396" y2="155" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#hcArr)"/>
  <text x="381" y="146" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">VIF</text>
  <rect x="402" y="44" width="140" height="54" rx="10" fill="#8b5cf6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="472" y="66" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">public VIF</text>
  <text x="472" y="84" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">S3, DynamoDB public</text>
  <line x1="366" y1="140" x2="398" y2="92" stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="4 3" marker-end="url(#hcArr)"/>
  <rect x="578" y="200" width="126" height="56" rx="10" fill="#3b82f6" fill-opacity="0.85"/>
  <text x="641" y="224" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">Transit GW</text>
  <text x="641" y="242" font-size="9.5" text-anchor="middle" fill="#fff" opacity="0.9">hub nhiều VPC</text>
  <rect x="402" y="252" width="140" height="52" rx="10" fill="#10b981" fill-opacity="0.85"/>
  <text x="472" y="274" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">VGW</text>
  <text x="472" y="292" font-size="9.5" text-anchor="middle" fill="#fff" opacity="0.9">gắn đúng 1 VPC</text>
  <line x1="472" y1="182" x2="472" y2="246" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#hcArr)"/>
  <text x="486" y="216" font-size="9" fill="currentColor" opacity="0.7">private VIF</text>
  <line x1="542" y1="155" x2="600" y2="196" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#hcArr)"/>
  <text x="586" y="170" font-size="9" fill="currentColor" opacity="0.7">transit VIF</text>
  <line x1="366" y1="70" x2="576" y2="206" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 3"/>
  <rect x="560" y="284" width="144" height="78" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="632" y="306" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">VPC A · VPC B · VPC C</text>
  <text x="632" y="324" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">nhiều account, nhiều region</text>
  <text x="632" y="344" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">attachment qua RAM share</text>
  <line x1="641" y1="256" x2="641" y2="278" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#hcArr)"/>
  <text x="16" y="386" font-size="10" fill="currentColor" opacity="0.8">Nét liền = đường dữ liệu chính · nét đứt = đường thay thế / tạm thời</text>
</svg>

### 2.1 Bảng quyết định gốc — chọn đường nào

Bảng này là bản đồ của cả bài: mỗi dòng là một kiểu đề, cột "Vì sao" là lý do ngắn, và mỗi dòng đều được giải thích đầy đủ ở các section sau (§3 cho DX, §4 cho VPN, §6 cho TGW, §7 cho endpoint). Đọc lướt một lần bây giờ, quay lại sau khi học xong.

| Yêu cầu trong đề | Chọn | Vì sao | Bẫy |
|---|---|---|---|
| "Cần kết nối private **trong vài ngày**" | Site-to-Site VPN | dựng bằng API, chỉ cần public IP + thiết bị IPsec | chọn DX = sai vì lead time hàng tuần |
| "Băng thông ổn định, latency **consistent**, traffic lớn ra AWS" | Direct Connect | circuit riêng, không đụng internet | DX **không mã hoá** mặc định |
| "Vừa cần private, vừa cần **encrypted in transit**" | VPN over DX (private/transit VIF + IPsec) hoặc MACsec | DX chỉ là L2 riêng, không phải encryption | "DX là private nên an toàn" là sai |
| "Nối **hàng chục VPC** ở nhiều account" | Transit Gateway | hub-and-spoke, một attachment mỗi VPC | VPC peering full-mesh không scale |
| "Chỉ 2 VPC nói chuyện, muốn rẻ nhất" | VPC peering | không phí attachment-hour | peering không transitive |
| "Nhân viên remote truy cập resource nội bộ" | Client VPN | client-based, auth AD/SAML/cert | Site-to-Site không dành cho từng laptop |
| "Chỉ cần đọc S3 từ on-prem, không cần vào VPC" | DX **public VIF** (hoặc interface endpoint qua private VIF) | không cần VGW/TGW | gateway endpoint **không** dùng được từ on-prem |
| "Expose service của mình cho VPC khách hàng, không qua internet" | PrivateLink (endpoint service) | one-way, không route CIDR | TGW mở cả hai chiều theo route table |

---

## 3. Direct Connect

### 3.1 Dedicated vs Hosted

Có hai cách để có một circuit DX, khác nhau ở chỗ **ai sở hữu cổng vật lý** trên router của AWS.

**Dedicated connection**: bạn đặt thẳng với AWS và nhận nguyên một cổng Ethernet vật lý, chỉ mình bạn dùng. Tốc độ cổng chỉ có bốn mức: **1, 10, 100 hoặc 400 Gbps**. Vì là cổng thật nên bạn (hoặc nhà mạng bạn thuê) phải có thiết bị trong colo và phải đi cross-connect, đây là phần tốn thời gian nhất. Đổi lại bạn có toàn quyền trên cổng: tạo nhiều VIF, gộp nhiều cổng thành LAG (§3.3), bật MACsec (§3.5).

**Hosted connection**: một **AWS Direct Connect Partner** (thường là nhà mạng) đã có sẵn cổng dung lượng lớn nối với AWS, và họ **cắt cho bạn một lát** băng thông trên cổng đó. Lát cắt có 11 mức: **50, 100, 200, 300, 400, 500 Mbps và 1, 2, 5, 10, 25 Gbps** (các mức từ 1 Gbps trở lên chỉ một số partner đủ điều kiện mới bán). Vì hạ tầng trong colo đã có sẵn, partner chỉ cần cấu hình nên lên nhanh hơn dedicated. Cái giá là bạn dùng chung cổng vật lý của người khác: mỗi hosted connection chỉ mang **1 VIF**, không tạo LAG được, không có MACsec. AWS còn cắt thẳng tay phần traffic vượt mức đã mua (traffic policing), nên tải giật cục sẽ đạt throughput thấp hơn tải đều.

Hệ quả hay bị hỏi: nhu cầu **dưới 1 Gbps** thì dedicated không có mức nào vừa. Cổng dedicated nhỏ nhất là 1 Gbps, trả tiền cả cổng dù chỉ dùng 400 Mbps.

```
Giá port-hour, ~us-east-1, tính 730 giờ/tháng:
  Dedicated 1 Gbps:  ~$0,30/giờ × 730 ≈ $219/tháng
  Hosted 500 Mbps:   ~$0,20/giờ × 730 ≈ $146/tháng
  Hosted 50 Mbps:    ~$0,03/giờ × 730 ≈ $22/tháng
(chưa gồm tiền thuê đường truyền/partner và tiền data transfer out — xem §9)
```

| | **Dedicated connection** | **Hosted connection** |
|---|---|---|
| Mua từ | AWS trực tiếp (port vật lý cả cổng là của bạn) | APN Partner cắt một phần băng thông của họ |
| Băng thông | 1 / 10 / 100 / 400 Gbps (100 và 400 Gbps chỉ có ở một số location) | 50 Mbps → 25 Gbps, 11 mức; từ 1 Gbps trở lên tuỳ partner |
| Số VIF | nhiều VIF trên một connection | **1 VIF** cho mỗi hosted connection |
| Lead time | dài nhất — phải kéo cross-connect | nhanh hơn, partner đã có sẵn hạ tầng ở colo |
| LAG | có (gộp nhiều dedicated) | không |
| MACsec | có trên cổng 10 / 100 / 400 Gbps, ở location hỗ trợ | không |
| **Khi nào chọn** | traffic lớn, ổn định, cần nhiều VIF/LAG/MACsec | cần nhanh, băng thông vừa, không muốn tự làm việc với colo |

> Bẫy hay gặp: đề tả "cần 400 Mbps, muốn lên sớm, không có sẵn thiết bị ở DX location" → đáp án là **hosted connection qua partner**, không phải dedicated. Hai tín hiệu: 400 Mbps là một mức của hosted (dedicated bắt đầu từ 1 Gbps), và "không có thiết bị ở colo" loại luôn dedicated.

### 3.2 Virtual Interface (VIF) — phần bị hỏi nhiều nhất

Một circuit DX không tự biết đưa gói đi đâu. **VIF** là VLAN logic (802.1Q) chạy trên circuit: mỗi gói mang một nhãn số (VLAN tag) để router hai đầu biết nó thuộc làn nào, nhờ vậy một sợi cáp chở được nhiều làn tách biệt. Loại VIF quyết định bạn tới được cái gì. Trên mỗi VIF, router của bạn và router AWS mở một phiên BGP để trao đổi route.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 330" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Ba loại Virtual Interface của Direct Connect và đích đến của từng loại</title>
  <desc>Một Direct Connect connection mang ba loại VLAN logic. Public VIF đi tới các public endpoint của AWS ở mọi region, ví dụ S3, DynamoDB, API endpoint. Private VIF đi tới Virtual Private Gateway của một VPC, hoặc qua Direct Connect Gateway tới nhiều VPC ở nhiều region. Transit VIF bắt buộc đi qua Direct Connect Gateway rồi tới Transit Gateway, từ đó toả ra toàn bộ VPC gắn vào hub.</desc>
  <defs>
    <marker id="vifArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <text x="16" y="22" font-size="14" font-weight="700" fill="currentColor">Ba loại VIF — mỗi loại tới được gì</text>
  <rect x="16" y="120" width="128" height="90" rx="10" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="80" y="152" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">DX connection</text>
  <text x="80" y="172" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">1 cổng vật lý</text>
  <text x="80" y="190" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">nhiều VLAN</text>
  <line x1="144" y1="142" x2="196" y2="70" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#vifArr)"/>
  <line x1="144" y1="165" x2="196" y2="165" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#vifArr)"/>
  <line x1="144" y1="188" x2="196" y2="262" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#vifArr)"/>
  <rect x="200" y="44" width="150" height="52" rx="9" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="275" y="66" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">public VIF</text>
  <text x="275" y="84" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">public IP hai đầu</text>
  <rect x="200" y="139" width="150" height="52" rx="9" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="275" y="161" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">private VIF</text>
  <text x="275" y="179" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">IP private hai đầu</text>
  <rect x="200" y="236" width="150" height="52" rx="9" fill="#8b5cf6" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="275" y="258" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">transit VIF</text>
  <text x="275" y="276" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">bắt buộc qua DXGW</text>
  <line x1="350" y1="70" x2="418" y2="70" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#vifArr)"/>
  <line x1="350" y1="165" x2="418" y2="165" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#vifArr)"/>
  <line x1="350" y1="262" x2="418" y2="262" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#vifArr)"/>
  <rect x="422" y="44" width="282" height="52" rx="9" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="438" y="66" font-size="11" font-weight="700" fill="currentColor">Public endpoint mọi region</text>
  <text x="438" y="84" font-size="9.5" fill="currentColor" opacity="0.75">S3, DynamoDB, API endpoint — không vào được VPC</text>
  <rect x="422" y="139" width="282" height="52" rx="9" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="438" y="161" font-size="11" font-weight="700" fill="currentColor">VGW của VPC (hoặc DXGW → nhiều VPC)</text>
  <text x="438" y="179" font-size="9.5" fill="currentColor" opacity="0.75">tới IP private trong VPC, không tới public endpoint</text>
  <rect x="422" y="236" width="282" height="52" rx="9" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="438" y="258" font-size="11" font-weight="700" fill="currentColor">Transit Gateway → toàn bộ VPC gắn hub</text>
  <text x="438" y="276" font-size="9.5" fill="currentColor" opacity="0.75">một VIF phục vụ hàng chục VPC</text>
  <text x="16" y="316" font-size="10" fill="currentColor" opacity="0.8">Muốn vừa vào VPC vừa chạm S3 public: tạo cả private (hoặc transit) VIF lẫn public VIF trên cùng circuit.</text>
</svg>

| Loại VIF | Tới được gì | Điểm cuối | Khi nào chọn | Bẫy |
|---|---|---|---|---|
| **Private VIF** | IP private trong VPC | VGW của một VPC, hoặc Direct Connect Gateway để với tới nhiều VPC/nhiều region | on-prem cần gọi EC2/RDS/ENI bằng IP nội bộ | không chạm được public endpoint S3 qua đường này |
| **Public VIF** | Toàn bộ public endpoint AWS ở **mọi region** | không cần gateway | on-prem cần S3/DynamoDB/API với băng thông DX và không muốn dựng VPC | cần IP public do bạn sở hữu để BGP advertise; không phải "internet access" |
| **Transit VIF** | Transit Gateway | bắt buộc qua **Direct Connect Gateway** | hub-and-spoke: một circuit phục vụ nhiều VPC/nhiều account | một DXGW không cho phép vừa gắn transit VIF vừa gắn private VIF |

> Về tốc độ cho transit VIF: docs hiện tại ghi transit VIF dùng được với **mọi** connection dedicated lẫn hosted, ở **mọi tốc độ**. Tài liệu ôn thi cũ thường ghi "hosted connection phải từ 1 Gbps trở lên mới có transit VIF" (quy định trước đây). Nếu gặp đáp án dựa vào giới hạn đó, hiểu là đề viết theo quy định cũ.

**Direct Connect Gateway** là thành phần *global*: một circuit ở Singapore nói chuyện được với VPC ở Tokyo và Sydney, miễn là các VGW/TGW đó associate vào cùng DXGW. Nhưng hai VPC gắn cùng một DXGW **không** nói chuyện được với nhau qua DXGW — DXGW không phải router giữa các VPC. Muốn VPC-to-VPC thì dùng TGW hoặc peering.

### 3.3 LAG — Link Aggregation Group

LAG gộp nhiều dedicated connection thành một interface logic bằng LACP (Link Aggregation Control Protocol, giao thức để hai thiết bị thoả thuận coi nhiều sợi cáp song song như một đường). Điều kiện: cùng **băng thông**, kết thúc trên **cùng một AWS device**, và số connection tối đa **phụ thuộc tốc độ cổng**: **4** với cổng 1 Gbps hoặc 10 Gbps, nhưng chỉ **2** với cổng 100 Gbps và 400 Gbps.

```
4 cổng × 10 Gbps  = LAG 40 Gbps
2 cổng × 100 Gbps = LAG 200 Gbps
```

Hệ quả: LAG cho **băng thông**, không cho resiliency thật — vì cùng device, cùng location. Thiết bị đó hỏng hoặc toà nhà đó mất điện thì cả bốn sợi chết cùng lúc. Đề nói "tăng throughput" → LAG; đề nói "chịu được lỗi thiết bị/lỗi site" → nhiều connection ở **nhiều location**.

### 3.4 Mô hình resiliency chính thức của AWS

Một circuit DX có ba thứ có thể hỏng: **sợi cáp** (hoặc đường truyền của nhà mạng), **router AWS** mà nó cắm vào, và **cả toà nhà** DX location. AWS định nghĩa ba mô hình, khác nhau ở chỗ chịu được tới mức hỏng nào:

- **Development / test**: hai connection trở lên, cùng một location nhưng cắm vào hai router AWS khác nhau. Chịu được hỏng một router, không chịu được hỏng location.
- **High resiliency**: hai location, mỗi nơi một connection. Chịu được đứt cáp, hỏng router, và cả hỏng một location.
- **Maximum resiliency**: hai location, mỗi nơi hai connection trên hai router khác nhau, tổng cộng bốn. Khi một location sập, location còn lại vẫn còn dự phòng ở mức router.

Con số SLA đi kèm nghĩa là gì trong thực tế:

```
Một tháng 30 ngày = 43.200 phút
SLA 99,9%  → được phép gián đoạn 0,1%  = ~43 phút/tháng
SLA 99,99% → được phép gián đoạn 0,01% = ~4,3 phút/tháng
```

| Mô hình | Cấu hình | SLA | Khi nào chọn | Bẫy |
|---|---|---|---|---|
| **Development / test** | nhiều connection tại **1 location**, trên các device khác nhau | không có SLA cao | môi trường dev, POC | mất cả location là mất hết |
| **High resiliency** | 1 connection ở mỗi location, **2 location** | 99.9% | production thường | mất một device ở một site = mất nửa đường, không mất kết nối |
| **Maximum resiliency** | 2 connection ở mỗi location, **2 location**, device tách rời | 99.99% | workload critical, tài chính/y tế | đắt gấp đôi; phải test failover bằng **Resiliency Toolkit failover test** |

**Direct Connect Resiliency Toolkit** là một wizard trong console: bạn chọn mô hình, nó dẫn từng bước đặt đúng số connection ở đúng số location và không cho hai connection kết thúc trên cùng một device. Nó kèm chức năng **failover test**: chủ động hạ phiên BGP của một VIF để xem traffic có tự chuyển sang đường dự phòng không. Đề hay hỏi "làm sao xác nhận failover hoạt động mà không chờ sự cố" → đáp án là failover test của toolkit.

### 3.5 DX không mã hoá — và hai cách vá

"Private" và "encrypted" là hai chuyện khác nhau. Circuit DX là đường riêng ở tầng L2 (tầng liên kết: cáp và Ethernet frame giữa hai thiết bị nối trực tiếp), tức là không ai khác dùng chung sợi cáp với bạn. Nhưng dữ liệu chạy trên đó **không được mã hoá**: ai chạm được vào đường truyền, ví dụ trong colo hay ở nhà mạng trung gian, về nguyên tắc đọc được gói tin. Nếu compliance yêu cầu encryption in transit, có hai cách vá:

- **MACsec (IEEE 802.1AE)**: mã hoá từng Ethernet frame ngay ở L2, giữa router của bạn và router AWS. Chỉ có trên **dedicated connection 10, 100 hoặc 400 Gbps** ở location hỗ trợ; hosted connection không dùng được. Mã hoá làm bằng phần cứng của cổng nên gần như không mất throughput. Giới hạn: chỉ bảo vệ đúng chặng cross-connect từ router của bạn tới router AWS, không phải end-to-end.
- **VPN over DX**: chạy đường hầm IPsec *bên trong* circuit DX, coi DX như đường vận chuyển thay cho internet. Có **hai biến thể**, đừng lẫn (bảng 2.1 nhắc biến thể thứ hai).
  - *IPsec qua public VIF* — cách kinh điển: chạy Site-to-Site VPN bên trong public VIF tới VPN
    public endpoint. Chạy được ở mọi location, nhưng traffic đi qua public endpoint của AWS.
  - *Private IP VPN over DX* — chạy Site-to-Site VPN trên **transit VIF + Direct Connect gateway**,
    terminate ở TGW bằng địa chỉ private, không cần public IP nào.

  Cả hai đều mã hoá tới tận VGW/TGW, tức là xa hơn MACsec. Đổi lại throughput bị chặn bởi trần của tunnel IPsec: thuê circuit 10 Gbps nhưng mỗi tunnel chuẩn chỉ qua được ~1,25 Gbps (§4.1), muốn hơn phải chạy nhiều tunnel song song.

| Nhu cầu | Chọn | Bẫy |
|---|---|---|
| Private + băng thông tối đa, không bắt buộc encrypt | DX trần | trượt audit nếu policy nói "encrypt in transit" |
| Encrypt nhưng muốn giữ throughput cao | MACsec | phụ thuộc location & loại cổng, không phổ cập |
| Encrypt, cần chạy được ở mọi nơi | VPN over DX | trần băng thông theo tunnel, phức tạp hơn về routing |

---

## 4. Site-to-Site VPN

### 4.1 Cấu trúc không đổi: luôn là hai tunnel

Site-to-Site VPN nối **cả một mạng** on-prem với AWS bằng **IPsec**: router phía bạn (customer gateway) mã hoá từng gói, bọc nó trong một gói mới rồi gửi qua internet tới một endpoint của AWS, nơi gói được mở ra và đưa vào VPC. Hai đầu thấy nhau như đang nối trực tiếp, internet ở giữa chỉ thấy dữ liệu đã mã hoá.

Mỗi VPN connection AWS tạo ra **2 tunnel IPsec**, mỗi tunnel có public IP riêng và kết thúc ở một AZ khác nhau. Đó là HA phía AWS: AWS bảo trì một endpoint thì tunnel kia vẫn chạy. Phía bạn, nếu chỉ có **một** customer gateway vật lý thì thiết bị đó vẫn là single point of failure — muốn HA thật phải hai CGW, mỗi cái một VPN connection (hai tunnel).

**Trần throughput.** Mỗi tunnel chuẩn có trần khoảng **1,25 Gbps**. Đây là hạn mức cố định của endpoint phía AWS (không xin tăng được), không liên quan tới đường internet của bạn. Vì thế nâng gói internet lên 10 Gbps cũng không làm VPN nhanh hơn.

Có hai tunnel, vậy được 2,5 Gbps? Còn tuỳ điểm cuối:

- Cắm vào **VGW**: chiều từ AWS về on-prem chỉ đi **một** tunnel, tunnel kia để dự phòng. Hai tunnel *không* cộng băng thông, trần thực tế vẫn là ~1,25 Gbps.
- Cắm vào **Transit Gateway** và bật **ECMP** (Equal-Cost Multi-Path): khi router thấy nhiều đường tới cùng một đích với "chi phí" bằng nhau, nó **chia traffic đều** lên tất cả thay vì chọn một. TGW coi các tunnel là những đường ngang giá và dùng hết cùng lúc, nên throughput cộng dồn. ECMP đòi VPN chạy **BGP**, static routing không dùng được.

```
Cần ~5 Gbps qua VPN, chưa có DX:
  5 Gbps ÷ 1,25 Gbps mỗi tunnel = 4 tunnel
  4 tunnel ÷ 2 tunnel mỗi VPN connection = 2 VPN connection
→ 2 VPN connection gắn vào TGW, routing BGP, bật ECMP: 4 × 1,25 ≈ 5 Gbps
```

Một lưu ý khi đọc con số này: ECMP chia theo **flow** (một kết nối TCP/UDP). Mọi gói của cùng một flow luôn đi cùng một tunnel để giữ thứ tự, nên **một kết nối đơn lẻ** vẫn không vượt được trần của một tunnel. 5 Gbps ở trên là tổng của nhiều kết nối song song.

Vì thế gần như mọi đề "VPN throughput không đủ" đều có đáp án chứa TGW + ECMP.

> Con số đề thi là **1,25 Gbps/tunnel**. Từ cuối 2025 AWS có thêm tuỳ chọn **Large Bandwidth Tunnel** tới **5 Gbps/tunnel**, chỉ cho VPN gắn vào Transit Gateway hoặc Cloud WAN (VGW không có), không dùng chung với accelerated VPN, giá ~$0,60/giờ mỗi connection thay vì ~$0,05. Kết luận của đề không đổi: muốn vượt 1,25 Gbps thì phải rời VGW sang TGW.

### 4.2 Static routing vs BGP (dynamic)

Dựng xong tunnel mới là một nửa. Hai bên còn phải biết **dải IP nào nằm ở phía bên kia** thì mới gửi gói vào tunnel. Có hai cách cho biết.

**Static**: bạn gõ tay. Khai trong VPN connection "on-prem có `10.1.0.0/16`", và khai trên router on-prem "VPC là `10.0.0.0/16`, đi qua tunnel". Dễ, thiết bị nào cũng làm được. Nhược điểm: route là thứ bạn gõ, nó không tự biết đường còn sống hay không. On-prem thêm một dải mới thì phải nhớ sửa cả hai đầu.

**BGP (dynamic)**: trên mỗi tunnel, router của bạn và AWS mở một phiên BGP. Router của bạn **advertise** các prefix on-prem, AWS advertise CIDR của VPC, và route học được sẽ tự **propagate** vào route table. Mỗi bên tự xưng bằng một **ASN**. Hai router gửi tin "tôi còn sống" cho nhau liên tục; khi một tunnel chết, phiên BGP trên nó rớt, các route học qua nó bị rút khỏi bảng và traffic tự chuyển sang tunnel còn lại. Không ai phải can thiệp.

| | Static | BGP (dynamic) |
|---|---|---|
| Cách khai route | khai tay prefix on-prem trong VPN connection | CGW advertise prefix, AWS advertise CIDR VPC |
| Failover giữa 2 tunnel | chậm, thường phải can thiệp | tự động khi BGP session down |
| ECMP trên TGW | không | có |
| Yêu cầu thiết bị | CGW không cần hỗ trợ BGP | CGW phải chạy BGP, cần ASN |
| **Khi nào chọn** | thiết bị cũ không nói BGP, mạng nhỏ tĩnh | mặc định cho production, bắt buộc nếu muốn DX+VPN failover tự động |

> Bẫy: đề mô tả "muốn failover tự động giữa DX và VPN" → **phải BGP ở cả hai đường**. DX lúc nào cũng chạy BGP; nếu VPN dùng static thì không có gì báo cho AWS biết đường nào vừa chết.

### 4.3 VGW hay TGW làm điểm cuối?

Đầu AWS của một VPN connection cắm vào một trong hai thứ. **VGW** thuộc về đúng một VPC: route học được từ VPN được propagate thẳng vào route table của VPC đó, không có gì thêm để cấu hình và không tốn phí theo giờ. **TGW** là router trung tâm đứng ngoài VPC: VPN là một attachment, mỗi VPC là một attachment khác, và TGW có route table riêng quyết định attachment nào thấy attachment nào (§6.2). Linh hoạt hơn, nhưng mỗi attachment trả tiền theo giờ và mỗi GB đi qua trả thêm phí xử lý.

| | **Virtual Private Gateway** | **Transit Gateway** |
|---|---|---|
| Phạm vi | gắn đúng **1 VPC** | hub cho nhiều VPC/nhiều account |
| VPN ECMP | không | có |
| Route table | dùng route table của VPC + propagation | **TGW route table riêng**, association + propagation |
| Accelerated VPN | không hỗ trợ | có |
| Chi phí | không có attachment-hour | trả theo attachment-hour + data processing |
| **Khi nào chọn** | 1 VPC duy nhất, đơn giản, rẻ | từ 3 VPC trở lên, hoặc cần ECMP/accelerated |

### 4.4 Accelerated Site-to-Site VPN

VPN thường đi internet công cộng **suốt quãng đường** từ on-prem tới region. Văn phòng ở Hà Nội nối về `us-east-1` thì gói tin qua hàng chục nhà mạng trung gian, chỗ nào nghẽn là latency nhảy (jitter) và rớt gói.

Bật accelerated VPN thì tunnel không kết thúc ở region nữa mà ở **AWS Global Accelerator**. Global Accelerator cấp cho mỗi tunnel một IP **anycast**: cùng một địa chỉ IP được quảng bá từ rất nhiều edge location trên thế giới, nên gói tin tự chui vào mạng AWS ở edge **gần router của bạn nhất**. Từ đó nó chạy trên backbone riêng của AWS tới region. Quãng đường qua internet công cộng co lại còn đoạn từ on-prem tới edge gần nhất. AWS tự tạo và quản lý hai accelerator, mỗi tunnel một cái; bạn trả thêm phí giờ cho hai accelerator đó cùng phí data transfer premium theo GB.

Điều kiện cần nhớ:

- Accelerated VPN **chỉ dùng được với Transit Gateway attachment**, không dùng được với VGW.
- Không bật hay tắt được trên VPN connection có sẵn. Phải tạo connection mới.
- Càng xa region thì lợi càng rõ. On-prem ở ngay cạnh region thì gần như không khác.

Đề tả "VPN qua internet xuyên lục địa, chất lượng thất thường, muốn ổn định mà không mua DX" → accelerated VPN trên TGW.

### 4.5 Client VPN

Site-to-Site nối hai **mạng** qua hai router. Client VPN nối **từng người** vào VPC: nhân viên làm ở nhà không có router doanh nghiệp nào cả, chỉ có một cái laptop.

Client VPN là dịch vụ **client-based** dựa trên OpenVPN (một giao thức VPN mã nguồn mở, chạy trên TLS). Luồng hoạt động:

1. Bạn tạo một **Client VPN endpoint** và **associate** nó vào một hoặc vài subnet của VPC. Mỗi subnet được associate là một "cửa vào" VPC.
2. User cài phần mềm client, kết nối và **authenticate** theo một trong ba cách: tài khoản Active Directory, **SAML** (chuẩn đăng nhập một lần, tức là đăng nhập bằng tài khoản công ty qua IAM Identity Center, Okta…), hoặc certificate cài sẵn trên máy (mutual authentication).
3. Laptop nhận một IP từ **client CIDR block**. Dải này phải rộng từ `/22` tới `/12`, **không được trùng** CIDR của VPC và **không sửa được** sau khi tạo.
4. **Authorization rule** quyết định user hoặc group nào tới được dải mạng nào, ví dụ "group `dev` được vào `10.0.1.0/24`".

Bước 4 hay bị nhầm: phân quyền theo người nằm ở authorization rule chứ không ở security group. Security group lọc theo IP và port, nó không biết ai đang ngồi sau laptop.

```
Chi phí, ~us-east-1: 50 nhân viên, endpoint associate 2 subnet (2 AZ)
  Subnet association: 2 × ~$0,10/giờ × 730 giờ           ≈ $146/tháng (chạy 24/7)
  Client connection:  50 người × 8 giờ × 22 ngày × ~$0,05 ≈ $440/tháng
  Tổng                                                    ≈ $586/tháng
```

| Chiều | Site-to-Site VPN | Client VPN |
|---|---|---|
| Đối tượng | cả một site / datacenter | từng thiết bị người dùng |
| Thiết bị cần | customer gateway hỗ trợ IPsec | phần mềm client OpenVPN |
| Auth | pre-shared key / certificate | Active Directory, SAML (IAM Identity Center), mutual cert |
| Route | BGP hoặc static prefix | authorization rule + route table của endpoint |
| Tính tiền | theo giờ mỗi connection + data | theo **giờ mỗi subnet association** + **giờ mỗi client connection** |
| **Khi nào chọn** | branch office, DC, workload always-on | nhân viên remote, contractor, truy cập admin lẻ |

---

## 5. DX + VPN: pattern failover và thứ tự route

Pattern chuẩn cho production: **DX làm primary, Site-to-Site VPN làm backup**, cả hai chạy BGP tới cùng một VGW hoặc TGW.

Khi cả hai đường cùng sống, phía AWS học được **cùng một dải on-prem từ hai nguồn**: phiên BGP trên DX nói "`10.1.0.0/16` đi qua tôi", phiên BGP trên VPN cũng nói vậy. AWS phải chọn một. Toàn bộ section này là về luật chọn đó. Khi DX chết, phiên BGP của nó rớt, route qua DX biến mất, chỉ còn route qua VPN nên traffic tự đổi đường mà không ai phải làm gì.

AWS quyết định gửi gói ra đâu theo thứ tự:

1. **Longest prefix match** trước tất cả: trong các route khớp với IP đích, route có dải **hẹp nhất** (số sau `/` lớn nhất) thắng, bất kể nó đến từ đâu. Nếu VPN advertise `10.1.1.0/24` còn DX advertise `10.1.0.0/16`, traffic tới `10.1.1.5` sẽ đi **VPN** — dù bạn muốn DX — vì `/24` cụ thể hơn `/16`. Đây là lỗi thiết kế hay gặp ngoài đời và là bẫy đề: muốn DX thắng thì hai bên phải advertise **cùng độ dài prefix**.
2. **Local route của VPC luôn thắng**, kể cả khi route propagated từ DX/VPN cụ thể hơn. Local route là dòng có sẵn trong mọi route table, trỏ tới chính CIDR của VPC.
3. **Static route bạn tự tay thêm vào route table** thắng mọi route được propagate vào.
4. Giữa các route **được propagate** cùng prefix trên virtual private gateway, thứ tự AWS quy định là:
   **DX BGP → static route của Site-to-Site VPN → VPN BGP**.
   Nhớ kỹ chiều này: DX (BGP) **thắng** VPN kể cả khi VPN dùng static routing — đây đúng là chỗ
   đề hay gài, vì trực giác "static thắng BGP" chỉ đúng với static bạn nhập tay ở bước 3,
   không đúng với static route của VPN được propagate.

Sức khoẻ tunnel được xét trước mọi thuộc tính routing khác — tunnel chết thì route của nó rụng
khỏi bảng bất kể ưu tiên.

**Chủ động chỉnh đường mà không đổi prefix.** Hai công cụ, cả hai đều là thuộc tính bạn gắn vào route khi advertise từ on-prem:

- **AS_PATH prepending.** Mỗi route BGP mang theo AS_PATH, là danh sách các ASN nó đã đi qua. BGP ưa đường có danh sách **ngắn hơn**. "Prepend" là cố tình chèn ASN của chính mình thêm vài lần vào route advertise qua đường dự phòng, ví dụ `65000 65000 65000` thay vì `65000`, cho đường đó trông dài hơn và kém hấp dẫn hơn.
- **BGP community (local preference).** Community là một nhãn gắn kèm route. Trên private VIF và transit VIF của DX, AWS định nghĩa sẵn ba nhãn: `7224:7100` (ưu tiên thấp), `7224:7200` (vừa), `7224:7300` (cao). Thấy nhãn nào, AWS đặt mức ưu tiên (local preference) tương ứng cho route đó. Gắn `7224:7300` lên route đi qua circuit chính và `7224:7100` lên circuit phụ là có active/passive. Local preference được xét **trước** AS_PATH, nên đây là cách AWS khuyên dùng khi có nhiều circuit DX. Không cần thuộc ba con số, chỉ cần nhớ có công cụ này.

Cả hai chỉ điều khiển chiều **AWS → on-prem**, vì chúng tác động lên cách AWS chọn đường. Chiều on-prem → AWS do router của bạn quyết định, cấu hình ngay trên thiết bị đó.

| Tình huống | Cấu hình | Bẫy |
|---|---|---|
| DX chính, VPN dự phòng, chuyển tự động | BGP cả hai, cùng prefix length, VPN prepend AS_PATH | quên prepend → traffic chia đôi bất thường |
| DX chưa lên, chạy tạm VPN | VPN trước, thêm DX sau, không đổi kiến trúc | dựng VPN vào VGW rồi sau phải migrate sang TGW |
| Cần encrypt mà vẫn dùng DX | VPN over DX (IPsec trên public VIF) | tưởng "DX + VPN" luôn nghĩa là failover |
| Hai DX ở hai location + 1 VPN | maximum resiliency + VPN backup cuối | chi phí port-hour nhân lên |

---

## 6. Transit Gateway

### 6.1 Vì sao peering không đủ

**VPC peering không transitive**: A↔B và B↔C thì A **không** tới được C, không có "đi nhờ" qua B. Cũng không có edge-to-edge routing: A không dùng được IGW, NAT Gateway hay VPN của B. Muốn N VPC full-mesh cần **N×(N−1)/2** peering — 10 VPC là 45 kết nối, mỗi VPC sửa route table cho từng peer. Đó là bài toán TGW sinh ra để giải.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>So sánh VPC peering full-mesh và Transit Gateway hub-and-spoke</title>
  <desc>Bên trái: sáu VPC nối nhau bằng VPC peering full-mesh, mỗi cặp một kết nối, tổng cộng mười lăm kết nối và mỗi VPC phải sửa route table cho từng peer. Bên phải: sáu VPC cùng gắn vào một Transit Gateway ở giữa, mỗi VPC chỉ có một attachment và một route duy nhất trỏ về hub, tổng cộng sáu kết nối; hub còn nhận thêm attachment của VPN và Direct Connect.</desc>
  <text x="16" y="22" font-size="14" font-weight="700" fill="currentColor">Full-mesh peering vs hub-and-spoke Transit Gateway</text>
  <text x="170" y="46" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">6 VPC peering = 15 kết nối</text>
  <g stroke="currentColor" stroke-opacity="0.35">
    <line x1="170" y1="86" x2="248" y2="131"/><line x1="170" y1="86" x2="248" y2="221"/>
    <line x1="170" y1="86" x2="170" y2="266"/><line x1="170" y1="86" x2="92" y2="221"/>
    <line x1="170" y1="86" x2="92" y2="131"/>
    <line x1="248" y1="131" x2="248" y2="221"/><line x1="248" y1="131" x2="170" y2="266"/>
    <line x1="248" y1="131" x2="92" y2="221"/><line x1="248" y1="131" x2="92" y2="131"/>
    <line x1="248" y1="221" x2="170" y2="266"/><line x1="248" y1="221" x2="92" y2="221"/>
    <line x1="248" y1="221" x2="92" y2="131"/>
    <line x1="170" y1="266" x2="92" y2="221"/><line x1="170" y1="266" x2="92" y2="131"/>
    <line x1="92" y1="221" x2="92" y2="131"/>
  </g>
  <g>
    <circle cx="170" cy="86" r="16" fill="#f59e0b" fill-opacity="0.85"/><circle cx="248" cy="131" r="16" fill="#f59e0b" fill-opacity="0.85"/>
    <circle cx="248" cy="221" r="16" fill="#f59e0b" fill-opacity="0.85"/><circle cx="170" cy="266" r="16" fill="#f59e0b" fill-opacity="0.85"/>
    <circle cx="92" cy="221" r="16" fill="#f59e0b" fill-opacity="0.85"/><circle cx="92" cy="131" r="16" fill="#f59e0b" fill-opacity="0.85"/>
  </g>
  <text x="170" y="90" font-size="9.5" font-weight="700" text-anchor="middle" fill="#fff">A</text>
  <text x="248" y="135" font-size="9.5" font-weight="700" text-anchor="middle" fill="#fff">B</text>
  <text x="248" y="225" font-size="9.5" font-weight="700" text-anchor="middle" fill="#fff">C</text>
  <text x="170" y="270" font-size="9.5" font-weight="700" text-anchor="middle" fill="#fff">D</text>
  <text x="92" y="225" font-size="9.5" font-weight="700" text-anchor="middle" fill="#fff">E</text>
  <text x="92" y="135" font-size="9.5" font-weight="700" text-anchor="middle" fill="#fff">F</text>
  <line x1="352" y1="60" x2="352" y2="280" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="5 4"/>
  <text x="540" y="46" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">6 VPC + TGW = 6 attachment</text>
  <g stroke="currentColor" stroke-opacity="0.45">
    <line x1="540" y1="176" x2="540" y2="86"/><line x1="540" y1="176" x2="618" y2="131"/>
    <line x1="540" y1="176" x2="618" y2="221"/><line x1="540" y1="176" x2="540" y2="266"/>
    <line x1="540" y1="176" x2="462" y2="221"/><line x1="540" y1="176" x2="462" y2="131"/>
  </g>
  <g>
    <circle cx="540" cy="86" r="16" fill="#10b981" fill-opacity="0.85"/><circle cx="618" cy="131" r="16" fill="#10b981" fill-opacity="0.85"/>
    <circle cx="618" cy="221" r="16" fill="#10b981" fill-opacity="0.85"/><circle cx="540" cy="266" r="16" fill="#10b981" fill-opacity="0.85"/>
    <circle cx="462" cy="221" r="16" fill="#10b981" fill-opacity="0.85"/><circle cx="462" cy="131" r="16" fill="#10b981" fill-opacity="0.85"/>
  </g>
  <text x="540" y="90" font-size="9.5" font-weight="700" text-anchor="middle" fill="#fff">A</text>
  <text x="618" y="135" font-size="9.5" font-weight="700" text-anchor="middle" fill="#fff">B</text>
  <text x="618" y="225" font-size="9.5" font-weight="700" text-anchor="middle" fill="#fff">C</text>
  <text x="540" y="270" font-size="9.5" font-weight="700" text-anchor="middle" fill="#fff">D</text>
  <text x="462" y="225" font-size="9.5" font-weight="700" text-anchor="middle" fill="#fff">E</text>
  <text x="462" y="135" font-size="9.5" font-weight="700" text-anchor="middle" fill="#fff">F</text>
  <circle cx="540" cy="176" r="30" fill="#3b82f6" fill-opacity="0.9"/>
  <text x="540" y="173" font-size="10" font-weight="700" text-anchor="middle" fill="#fff">TGW</text>
  <text x="540" y="187" font-size="8" text-anchor="middle" fill="#fff" opacity="0.9">hub</text>
  <text x="688" y="176" font-size="9.5" text-anchor="end" fill="currentColor" opacity="0.8">+ VPN / DX attachment</text>
  <text x="16" y="292" font-size="10" fill="currentColor" opacity="0.8">Peering: mỗi VPC sửa route table cho từng peer, không transitive · TGW: mỗi VPC một route trỏ hub</text>
</svg>

### 6.2 Association vs propagation — cơ chế route của TGW

TGW có **route table riêng**, tách hẳn khỏi route table của VPC. Hai động từ phải phân biệt:

- **Association**: gắn một attachment vào *một* TGW route table. Attachment sẽ **tra cứu** bảng này khi gửi gói đi. Mỗi attachment associate được đúng một bảng.
- **Propagation**: cho attachment **bơm route của nó** vào một hoặc nhiều TGW route table, để các attachment khác thấy nó.

Từ đó ra toàn bộ pattern segmentation: muốn Prod và Dev cùng nói chuyện với Shared Services nhưng **không** thấy nhau, tạo hai route table — bảng "Prod/Dev" chỉ nhận propagation từ attachment Shared, bảng "Shared" nhận propagation từ cả Prod lẫn Dev. Không có route đi ngang → hai môi trường cách ly dù cùng hub.

Một số tính chất nữa hay bị hỏi:

- TGW hoạt động trong **một region**; nối hai region bằng **TGW peering attachment**, và traffic qua peering đi trên backbone AWS, được mã hoá.
- TGW peering **không hỗ trợ route propagation tự động** — phải khai static route trỏ sang peer.
- TGW hỗ trợ **multicast** (một nguồn gửi một gói tới cả nhóm máy nhận cùng lúc, hay gặp ở hệ thống phát video và báo giá chứng khoán), thứ mà VPC peering và PrivateLink không có.
- Khi TGW đặt ở account khác VPC, phải **share bằng AWS RAM** rồi VPC owner mới tạo attachment được — xem [[ch3-05-multi-account-governance]].
- Security group **không reference được** cross-VPC qua TGW như cách làm được qua peering cùng region.

### 6.3 Bảng ba cột kinh điển

Cột thứ ba cần một câu giới thiệu trước khi so sánh. **PrivateLink** không nối hai mạng với nhau. Nó đặt vào VPC của bên dùng (consumer) một card mạng có IP private, và mọi gói gửi tới IP đó được chuyển sang **đúng một service** nằm sau một load balancer trong VPC của bên cung cấp. Bên dùng không thấy gì khác của VPC kia, bên cung cấp không tự mở kết nối ngược lại được, và vì không có route nào giữa hai dải CIDR nên hai VPC trùng dải IP vẫn dùng được. Peering và TGW thì ngược lại: chúng nối route, cho hai mạng thấy nhau ở mức IP.

| | **VPC peering** | **Transit Gateway** | **PrivateLink / endpoint service** |
|---|---|---|---|
| Mô hình | 1-1, không transitive | hub-and-spoke, transitive theo route table | one-way: consumer → một service cụ thể |
| Cấp độ | toàn bộ CIDR hai bên | toàn bộ CIDR theo route table | đúng **một endpoint** (một NLB/GWLB) |
| CIDR trùng nhau | **không được** | không được (cùng route table) | **được** — không route CIDR |
| Số lượng | bùng nổ theo N² | một attachment mỗi VPC | một endpoint mỗi consumer |
| SG reference cross-VPC | có (cùng region) | không | không (dùng SG trên endpoint ENI) |
| Chi phí | không có phí giờ, chỉ data transfer | attachment-hour + data processing | endpoint-hour + data processing |
| **Khi nào chọn** | 2–3 VPC ổn định, muốn rẻ nhất | ≥ 4 VPC, nhiều account, cần cả VPN/DX vào chung hub | expose SaaS cho khách, hoặc CIDR bị trùng |
| Bẫy | không transitive, không edge-to-edge | quên association/propagation → "ping không tới" dù attachment xanh | không dùng để cho hai mạng nói chuyện hai chiều |

---

## 7. VPC endpoint — ba loại, đừng lẫn

### 7.1 Gateway endpoint

Chỉ có cho **S3 và DynamoDB**. Không phải ENI — nó là một **prefix list** thêm vào **route table** của subnet. **Miễn phí**, chịu được traffic lớn.

Điểm chí tử: gateway endpoint chỉ phục vụ traffic **phát sinh trong VPC**. Gói từ on-prem qua DX/VPN, hoặc từ VPC khác qua peering/TGW, **không** dùng được nó — đề rất hay đặt nó làm đáp án mồi cho tình huống "on-prem cần S3 private".

### 7.2 Interface endpoint (PrivateLink)

Là **ENI có IP private** trong subnet bạn chọn, kèm DNS name riêng (tuỳ chọn private DNS để ghi đè tên public của service). Có **security group**, có **endpoint policy**, tính tiền theo **giờ mỗi ENI mỗi AZ** + **mỗi GB xử lý**.

Vì là IP private trong VPC, interface endpoint **tới được từ on-prem** qua DX private VIF hoặc VPN — đó là cách đúng cho "datacenter cần gọi API AWS mà không ra internet".

### 7.3 Gateway Load Balancer endpoint (GWLBe)

**Bài toán.** Compliance bắt mọi traffic phải đi qua **appliance bên thứ ba**: một firewall hoặc IDS/IPS của Palo Alto, Fortinet… chạy dưới dạng EC2. Một máy thì không đủ tải và là single point of failure, nên cần cả một fleet. Nhưng load balancer thông thường không dùng được ở đây: ALB/NLB **tự mở kết nối mới** tới target, nên firewall sẽ thấy gói đến từ load balancer chứ không thấy IP nguồn và IP đích thật. Mất hai thông tin đó thì không còn gì để kiểm tra.

**Gateway Load Balancer (GWLB)** giải bài này. Nó là load balancer tầng 3 (tầng IP): nhận **mọi** gói IP trên mọi port, không quan tâm bên trong là giao thức gì, và có hai đặc điểm:

- **Bump-in-the-wire** ("cục u trên sợi dây"): appliance được chèn vào giữa đường đi mà hai đầu không hề biết. Client và server vẫn thấy mình nói chuyện trực tiếp với nhau, không ai phải đổi IP đích hay cấu hình proxy.
- **GENEVE trên UDP port 6081**: GENEVE là một giao thức đóng gói (encapsulation). GWLB bỏ **nguyên gói gốc**, còn đủ IP nguồn và IP đích, vào trong một gói UDP mới rồi gửi tới appliance. Appliance mở lớp vỏ, kiểm tra gói gốc, cho qua thì bọc lại gửi về GWLB, và gói đi tiếp như chưa có gì xảy ra. Nhờ lớp vỏ này mà gói gốc không bị sửa một byte nào.

GWLB còn giữ cho mọi gói của cùng một flow luôn tới **cùng một appliance**, điều kiện cần để firewall theo dõi được trạng thái kết nối.

**Phía consumer** bạn tạo **GWLB endpoint** (một dạng VPC endpoint) và sửa route table để next hop là endpoint đó. Chính dòng route này "bẻ lái" traffic vào đường kiểm tra, ứng dụng không phải đổi gì. Kiến trúc chuẩn: một **inspection VPC** chứa GWLB + appliance; các VPC ứng dụng gắn chung một TGW, và route table của TGW đưa mọi luồng vòng qua inspection VPC trước khi tới đích.

Sau khi đã biết từng loại, đặt ba loại endpoint cạnh nhau:

| Loại endpoint | Service hỗ trợ | Hình thái | Từ on-prem dùng được? | Chi phí | Khi nào chọn | Bẫy |
|---|---|---|---|---|---|---|
| **Gateway endpoint** | S3, DynamoDB | route table entry (prefix list) | **không** | miễn phí | VPC cần S3/DynamoDB private, traffic lớn, muốn cắt phí NAT | không có SG, không dùng được qua DX/VPN/peering |
| **Interface endpoint** | hầu hết service AWS + service PrivateLink của bên thứ ba | ENI + IP private, có SG và endpoint policy | **có** (qua DX/VPN) | giờ/ENI/AZ + GB | on-prem hoặc VPC cần gọi API AWS không qua internet; S3 khi cần truy cập từ on-prem | bật private DNS sẽ ghi đè tên public, ảnh hưởng mọi client trong VPC |
| **GWLB endpoint** | GWLB đứng trước appliance bên thứ ba | endpoint trong VPC, route table trỏ vào | gián tiếp qua TGW | endpoint-hour + GB + phí GWLB | bắt buộc inspect L3/L4 bằng appliance thương mại | GENEVE 6081 phải được SG/NACL của appliance cho qua |

---

## 8. IPv6 và Egress-Only Internet Gateway

IPv6 trong AWS **luôn là địa chỉ public, globally routable** — không có "IPv6 private". Vì thế NAT Gateway, vốn để dịch nhiều IP private thành một IP public, **không có việc gì làm với IPv6**.

Nhưng bạn vẫn cần hiệu ứng phụ của NAT: cho instance **đi ra** internet mà không cho internet **đi vào**. Đó là **Egress-Only Internet Gateway** — chỉ cho IPv6, **stateful**, cho outbound và response quay về, chặn mọi kết nối khởi tạo từ ngoài. **Không phí giờ**, khác hẳn NAT Gateway.

Một chi tiết riêng cần tách bạch: NAT Gateway có hỗ trợ **NAT64**, dùng khi client **IPv6-only** cần gọi tới dịch vụ **IPv4-only** (kết hợp với DNS64 của Route 53 Resolver). Đó là bài toán translation giữa hai họ địa chỉ, không phải "NAT cho IPv6".

| Nhu cầu | Dùng | Bẫy |
|---|---|---|
| IPv4 private subnet ra internet | NAT Gateway (hoặc NAT instance, đã lỗi thời) | tính tiền theo giờ + mỗi GB xử lý |
| IPv6 subnet ra internet, chặn inbound | **Egress-Only IGW** | chọn NAT Gateway = sai |
| IPv6 subnet vừa ra vừa nhận inbound | Internet Gateway + SG/NACL siết | IGW là hai chiều |
| Client IPv6-only gọi service IPv4-only | NAT Gateway với **NAT64** + DNS64 | nhầm với egress-only IGW |
| Dual-stack: vừa IPv4 vừa IPv6 | IGW cho IPv4 public + EIGW cho IPv6 outbound | route table phải có cả hai entry `0.0.0.0/0` và `::/0` |

---

## 9. Cost — chỗ đề thi giấu đáp án

Tiền là tiêu chí phân biệt trong rất nhiều câu "which is the MOST cost-effective". Giá cụ thể đổi theo region và theo thời gian, nên đừng học thuộc con số. Thứ đề hỏi là **cấu trúc** tính tiền, và cấu trúc thì ổn định: hầu hết thành phần network tính theo hai chiều, **phí giờ** (trả vì nó tồn tại, kể cả khi không có byte nào chạy qua) và **phí theo GB** (trả theo lượng dữ liệu). Trong phí theo GB, cần tách hai loại hay bị gộp làm một:

- **Data transfer out (DTO)**: tiền cho mỗi GB **rời khỏi AWS**, ra internet hoặc về on-prem. Chiều **vào** AWS gần như luôn miễn phí.
- **Data processing**: tiền cho mỗi GB **đi xuyên qua** một thiết bị managed (NAT Gateway, TGW, endpoint), bất kể chiều nào.

Đơn giá tham khảo để thấy tỉ lệ, đều là ~us-east-1:

| Thành phần | Phí giờ | Phí theo GB |
|---|---|---|
| Direct Connect, dedicated 1 Gbps | ~$0,30/giờ mỗi cổng (10 Gbps: ~$2,25) | DTO ~$0,02 |
| Site-to-Site VPN | ~$0,05/giờ mỗi connection | DTO theo giá ra internet, ~$0,09 |
| Ra internet trực tiếp | không | DTO ~$0,09 (10 TB đầu mỗi tháng) |
| Transit Gateway | ~$0,05/giờ mỗi attachment | processing ~$0,02 |
| NAT Gateway | ~$0,045/giờ | processing ~$0,045 |
| Interface endpoint | ~$0,01/giờ mỗi ENI mỗi AZ | processing ~$0,01 |
| GWLB endpoint | ~$0,01/giờ mỗi endpoint | processing ~$0,0035, cộng phí của GWLB |
| Gateway endpoint, Egress-only IGW, VPC peering | không | không có phí processing |

**DX hoà vốn ở đâu so với VPN/internet?** DX có phí cổng cố định nhưng mỗi GB ra rẻ hơn khoảng 4,5 lần ($0,02 so với $0,09). Vậy câu hỏi là mỗi tháng đẩy ra bao nhiêu thì khoản tiết kiệm theo GB bù được phí cổng:

```
Phí cổng DX 1 Gbps:        $0,30 × 730 giờ        = $219/tháng
Tiết kiệm mỗi GB ra:       $0,09 − $0,02          = $0,07
Điểm hoà vốn:              $219 ÷ $0,07           ≈ 3.130 GB ≈ 3,1 TB/tháng

Thử với 10 TB ra mỗi tháng:
  Qua VPN:   $0,05 × 730 + 10.000 GB × $0,09      ≈ $937
  Qua DX:    $219 + 10.000 GB × $0,02             = $419
```

Con số 3,1 TB là cho **một** cổng và chưa tính tiền thuê đường truyền từ datacenter tới DX location (trả cho nhà mạng, thường lớn hơn phí cổng). Làm đúng mô hình high resiliency với hai cổng thì ngưỡng lên ~6,3 TB. Dù vậy quy luật đề thi cần vẫn đúng: **traffic ra càng lớn và càng đều, DX càng có lợi; traffic nhỏ hoặc thất thường thì VPN rẻ hơn**.

Bảng cấu trúc tính tiền đầy đủ, kèm hệ quả cho việc chọn đáp án:

| Thành phần | Tính tiền theo | Lưu ý quyết định |
|---|---|---|
| **Direct Connect** | **port-hour** theo tốc độ cổng + **data transfer out** theo GB | DTO qua DX ~$0,02/GB so với ~$0,09/GB qua internet → traffic ra càng lớn, DX càng nhanh hoà vốn. Data **vào** AWS miễn phí ở cả hai đường. |
| **Site-to-Site VPN** | **giờ mỗi connection** + data transfer out | rẻ để dựng (~$36,5/tháng mỗi connection), nhưng trần 1,25 Gbps/tunnel khiến workload lớn buộc phải nhiều tunnel + TGW |
| **Transit Gateway** | **attachment-hour** mỗi attachment + **data processing** mỗi GB đi qua TGW | Mỗi VPC là một attachment tính tiền riêng. Traffic A→B qua TGW bị tính processing; peering thì không. Vì thế 2–3 VPC ổn định vẫn nên peering. |
| **NAT Gateway** | **giờ** + **mỗi GB xử lý** | đây là dòng hoá đơn gây sốc kinh điển |
| **Gateway endpoint (S3/DynamoDB)** | **miễn phí** | mọi byte S3 đi qua NAT Gateway là tiền vứt đi |
| **Interface endpoint** | giờ mỗi ENI mỗi AZ + mỗi GB | nhiều endpoint × nhiều AZ cộng lại không nhỏ; cân nhắc gom |
| **GWLB + GWLBe** | endpoint-hour + GB, cộng phí GWLB | đắt, chỉ dùng khi compliance bắt appliance |
| **Egress-only IGW** | không phí giờ | chỉ trả data transfer |

**Bẫy cost kinh điển của SAA**: EC2 trong private subnet đọc/ghi hàng chục TB lên S3 qua **NAT Gateway** → trả cả giờ NAT lẫn per-GB processing.

```
10 TB/tháng giữa EC2 và S3, cùng region:
  Qua NAT Gateway:          $0,045 × 730 + 10.000 GB × $0,045 ≈ $483/tháng
  Qua S3 gateway endpoint:  $0
```

Fix đúng một dòng: thêm **S3 gateway endpoint** vào route table của subnet. Nếu đề nói "truy cập từ **on-prem**" thì đáp án đổi thành **interface endpoint**, vì gateway endpoint không nhận traffic từ ngoài VPC (§7.1).

Bẫy thứ hai: dựng TGW cho đúng 2 VPC "cho chuẩn kiến trúc" — thêm 2 attachment-hour và phí data processing mà peering không có.

```
2 VPC trao đổi 1 TB/tháng:
  Qua TGW:      2 attachment × $0,05 × 730 + 1.000 GB × $0,02 = $73 + $20 = $93/tháng
  Qua peering:  không phí giờ, không phí processing
                (chỉ trả data transfer nếu hai đầu nằm khác AZ)
```

"Cost-effective nhất cho 2 VPC" → **peering**.

Interface endpoint cũng cộng dồn nhanh hơn người ta nghĩ, vì nhân theo cả số service lẫn số AZ: 6 service × 3 AZ = 18 ENI × $0,01 × 730 giờ ≈ $131/tháng trước khi có byte nào chạy qua.

---

## 10. Bẫy thi thường gặp

1. **"Cần private connectivity ngay lập tức"** → VPN, **không** phải DX. DX mất hàng tuần.
2. **"DX đã là private nên đủ an toàn"** → Sai. DX không mã hoá; cần MACsec hoặc VPN over DX.
3. **"Một DX connection là đủ HA"** → Sai. Một connection, một location = không có SLA cao. High resiliency cần 2 location.
4. **LAG = resiliency** → Sai. LAG cùng device cùng location, nó cho **băng thông**.
5. **"Private VIF tới được S3"** → Sai với S3 public endpoint; muốn vậy thì public VIF, hoặc interface endpoint truy cập qua private VIF.
6. **"Transit VIF nối thẳng vào TGW"** → Sai. Transit VIF **bắt buộc** đi qua Direct Connect Gateway.
7. **"Hai VPC gắn cùng DXGW thì nói chuyện được với nhau"** → Sai. DXGW không route giữa các VPC.
8. **"Tăng throughput VPN bằng cách nâng cấp đường internet"** hoặc "nâng cấp tunnel trên VGW" → Sai. Trần là ~1,25 Gbps/tunnel và nằm ở phía AWS; cách đúng là TGW + nhiều tunnel + ECMP.
9. **"Accelerated VPN dùng với VGW"** → Sai. Chỉ với TGW attachment.
10. **"VPC peering transitive nếu bật đúng route"** → Sai, vĩnh viễn không transitive, và không có edge-to-edge routing.
11. **"Attachment TGW đã tạo là thông"** → Chưa. Thiếu **association** hoặc **propagation** là im lặng không tới.
12. **"Gateway endpoint cho on-prem truy cập S3"** → Sai. Gateway endpoint chỉ phục vụ traffic trong VPC.
13. **"Dùng NAT Gateway cho IPv6"** → Sai. IPv6 outbound-only là **Egress-Only IGW**.
14. **"DX luôn thắng VPN"** → Chỉ khi cùng prefix length. **Longest prefix match luôn thắng trước.**
15. **"Client VPN và Site-to-Site VPN thay thế được cho nhau"** → Không. Một cái cho site, một cái cho từng thiết bị.

---

## 11. Tóm tắt 1 dòng

> Cần **ngay** → VPN; cần **ổn định/băng thông** → DX (nhớ resiliency 2 location và chuyện DX không mã hoá); **nhiều VPC/nhiều account** → TGW với association/propagation; chỉ chạm **service AWS** → gateway endpoint (trong VPC, free) hay interface endpoint (từ on-prem, trả tiền); **appliance bên thứ ba** → GWLB + GWLBe GENEVE 6081; **IPv6 outbound** → Egress-Only IGW.

---

## 12. Bài tập tự kiểm tra

1. Công ty có DX 10 Gbps private VIF tới VPC Prod. Giờ họ cần từ datacenter gọi được **cả** Amazon S3 lẫn EC2 private IP, không đi internet. Có hai cách; mô tả cả hai và so sánh chi phí lẫn độ phức tạp.
2. Site-to-Site VPN hiện đạt ~1.1 Gbps và nghẽn. Đã nâng bandwidth đường internet nhưng không cải thiện. Nguyên nhân là gì, và thiết kế lại thế nào để đạt ~5 Gbps mà chưa mua DX?
3. Có 12 VPC ở 4 account, cần full-mesh, và hai trong số đó phải **không** thấy nhau. Thiết kế bằng TGW: cần bao nhiêu route table, mỗi attachment association/propagation vào đâu, và RAM đóng vai trò gì?
4. Traffic tới `10.20.5.0/24` đang chạy qua VPN dù DX đang up và đã advertise `10.20.0.0/16`. Giải thích và đưa ra hai cách sửa khác nhau.
5. Compliance yêu cầu mọi luồng east-west giữa các VPC phải qua firewall của hãng thứ ba. Vẽ luồng gói tin: VPC A → ? → VPC B, chỉ rõ vai trò TGW, inspection VPC, GWLB, GWLBe và GENEVE.
6. Một private subnet IPv6-only cần gọi API của một đối tác chỉ có IPv4, đồng thời phải tải package từ repo IPv6 công cộng. Bạn cần những gateway nào và route table trông ra sao?

---

## 13. Đọc thêm

- AWS Whitepaper — *Hybrid Connectivity*, *AWS Direct Connect Resiliency Recommendations*, *Building a Scalable and Secure Multi-VPC AWS Network Infrastructure*.
- AWS docs — *AWS Direct Connect User Guide* (virtual interfaces, LAG, Resiliency Toolkit), *Site-to-Site VPN User Guide* (tunnel options, accelerated VPN), *Transit Gateway Guide* (route tables, association & propagation), *Gateway Load Balancer Guide* (GENEVE).
- AWS re:Invent — các session `NET3xx` về Transit Gateway design pattern và inspection architecture.

---

**Bài liên quan**: [[ch2-04-network-performance]] cho phần latency/throughput, [[ch3-02-network-security]] cho SG/NACL/Network Firewall, [[ch4-03-db-network-cost]] cho tối ưu chi phí network, [[resilient-03-dr-strategies]] cho DR dùng kênh hybrid.
