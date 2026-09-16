# SAA Ch2.7 — Hybrid Connectivity Deep Dive

> Mục tiêu: Đọc một đề nói "on-premises ↔ AWS" là chọn ngay được Direct Connect / Site-to-Site VPN / Client VPN / Transit Gateway / VPC endpoint — kèm đúng loại VIF, đúng mô hình resiliency, và biết tiền chảy đi đâu.

Tiền đề: [[ch2-04-network-performance]], [[ch3-02-network-security]].

---

## 1. Câu chuyện mở đầu — "Tuần sau go-live, DX vẫn chưa có"

Một team migrate ERP từ datacenter Hà Nội lên `ap-southeast-1`. Design doc ghi: "kết nối bằng AWS Direct Connect 1 Gbps". Sáu tuần sau, ngày go-live, cổng DX vẫn ở trạng thái `ordering`: partner còn đang kéo cross-connect trong colo, LOA-CFA vừa ký xong.

Câu trả lời đúng — và cũng là câu trả lời mà đề SAA lặp đi lặp lại: **dựng Site-to-Site VPN ngay hôm nay** (vài chục phút, chỉ cần một public IP ở đầu on-prem), chạy tạm trên VPN, rồi khi DX lên thì để BGP tự chuyển: DX thành đường chính, VPN thành backup. Không phải chọn một trong hai — chọn cả hai, theo thứ tự thời gian.

Ba điều cần thuộc:

- Site-to-Site VPN: dựng trong **phút**, mỗi tunnel giới hạn **~1.25 Gbps**, đi qua internet nên latency biến động.
- Direct Connect: provisioning tính bằng **tuần tới tháng** (hosted nhanh hơn dedicated), băng thông ổn định, latency đều.
- Không có bài thi nào nói "cần kết nối private ổn định **ngay lập tức**" mà đáp án là DX. "Ngay lập tức" = VPN.

---

## 2. Bức tranh tổng thể — ba trục quyết định

Mọi câu hỏi hybrid trong SAA đều rơi vào giao của ba trục:

1. **Đường vật lý**: internet (VPN) hay circuit riêng (DX)?
2. **Điểm cuối trong AWS**: một VPC (VGW) hay nhiều VPC/nhiều account (Transit Gateway)? hay chỉ cần chạm tới *service* AWS mà không cần vào VPC (public VIF / VPC endpoint)?
3. **Ai là client**: cả một site (Site-to-Site) hay từng laptop lẻ (Client VPN)?

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

| | **Dedicated connection** | **Hosted connection** |
|---|---|---|
| Mua từ | AWS trực tiếp (port vật lý cả cổng là của bạn) | APN Partner cắt một phần băng thông của họ |
| Băng thông | 1 / 10 / 100 Gbps (400 Gbps ở một số location) | dải rộng từ mức sub-gigabit lên tới nhiều Gbps, tuỳ partner |
| Số VIF | nhiều VIF trên một connection | thường **1 VIF** cho mỗi hosted connection |
| Lead time | dài nhất — phải kéo cross-connect | nhanh hơn, partner đã có sẵn hạ tầng ở colo |
| LAG | có (gộp nhiều dedicated) | không |
| MACsec | có trên các cổng tốc độ cao | thường không |
| **Khi nào chọn** | traffic lớn, ổn định, cần nhiều VIF/LAG/MACsec | cần nhanh, băng thông vừa, không muốn tự làm việc với colo |

Bẫy hay gặp: đề tả "cần 400 Mbps, muốn lên sớm, không có sẵn thiết bị ở DX location" → đáp án là **hosted connection qua partner**, không phải dedicated.

### 3.2 Virtual Interface (VIF) — phần bị hỏi nhiều nhất

Một circuit DX không tự biết đưa gói đi đâu. **VIF** là VLAN logic (802.1Q) chạy trên circuit, và loại VIF quyết định bạn tới được cái gì.

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
| **Transit VIF** | Transit Gateway | bắt buộc qua **Direct Connect Gateway** | hub-and-spoke: một circuit phục vụ nhiều VPC/nhiều account | chỉ tạo được trên connection tốc độ cao (từ 1 Gbps trở lên), và một DXGW không cho phép vừa gắn transit VIF vừa gắn private VIF |

**Direct Connect Gateway** là thành phần *global*: một circuit ở Singapore nói chuyện được với VPC ở Tokyo và Sydney, miễn là các VGW/TGW đó associate vào cùng DXGW. Nhưng hai VPC gắn cùng một DXGW **không** nói chuyện được với nhau qua DXGW — DXGW không phải router giữa các VPC. Muốn VPC-to-VPC thì dùng TGW hoặc peering.

### 3.3 LAG — Link Aggregation Group

LAG gộp nhiều dedicated connection thành một interface logic bằng LACP. Điều kiện: cùng **băng thông**, kết thúc trên **cùng một AWS device**, và số connection tối đa **phụ thuộc tốc độ cổng**: **4** với cổng 1 Gbps hoặc 10 Gbps, nhưng chỉ **2** với cổng 100 Gbps và 400 Gbps.

Hệ quả: LAG cho **băng thông**, không cho resiliency thật — vì cùng device, cùng location. Đề nói "tăng throughput" → LAG; đề nói "chịu được lỗi thiết bị/lỗi site" → nhiều connection ở **nhiều location**.

### 3.4 Mô hình resiliency chính thức của AWS

| Mô hình | Cấu hình | SLA | Khi nào chọn | Bẫy |
|---|---|---|---|---|
| **Development / test** | nhiều connection tại **1 location**, trên các device khác nhau | không có SLA cao | môi trường dev, POC | mất cả location là mất hết |
| **High resiliency** | 1 connection ở mỗi location, **2 location** | 99.9% | production thường | mất một device ở một site = mất nửa đường, không mất kết nối |
| **Maximum resiliency** | 2 connection ở mỗi location, **2 location**, device tách rời | 99.99% | workload critical, tài chính/y tế | đắt gấp đôi; phải test failover bằng **Resiliency Toolkit failover test** |

**Direct Connect Resiliency Toolkit** wizard hoá việc đặt hàng đúng mô hình, kèm chức năng chủ động hạ BGP session để diễn tập. Đề hay hỏi "làm sao xác nhận failover hoạt động mà không chờ sự cố" → đáp án là failover test của toolkit.

### 3.5 DX không mã hoá — và hai cách vá

Circuit DX là đường riêng ở tầng L2, nhưng **không có encryption**. Nếu compliance yêu cầu encryption in transit:

- **MACsec (IEEE 802.1AE)**: mã hoá ở L2, chỉ có trên dedicated connection tốc độ cao và ở location hỗ trợ. Không thêm latency đáng kể, nhưng chỉ bảo vệ chặng từ router của bạn tới router AWS.
- **VPN over DX**: có **hai biến thể**, đừng lẫn (bảng 2.1 nhắc biến thể thứ hai).
  - *IPsec qua public VIF* — cách kinh điển: chạy Site-to-Site VPN bên trong public VIF tới VPN
    public endpoint. Chạy được ở mọi location, nhưng traffic đi qua public endpoint của AWS.
  - *Private IP VPN over DX* — chạy Site-to-Site VPN trên **transit VIF + Direct Connect gateway**,
    terminate ở TGW bằng địa chỉ private, không cần public IP nào.
  Cả hai đều được encryption tới tận VGW/TGW, đổi lại mất throughput vì overhead IPsec và bị chặn
  bởi trần băng thông mỗi tunnel.

| Nhu cầu | Chọn | Bẫy |
|---|---|---|
| Private + băng thông tối đa, không bắt buộc encrypt | DX trần | trượt audit nếu policy nói "encrypt in transit" |
| Encrypt nhưng muốn giữ throughput cao | MACsec | phụ thuộc location & loại cổng, không phổ cập |
| Encrypt, cần chạy được ở mọi nơi | VPN over DX | trần băng thông theo tunnel, phức tạp hơn về routing |

---

## 4. Site-to-Site VPN

### 4.1 Cấu trúc không đổi: luôn là hai tunnel

Mỗi Site-to-Site VPN connection AWS tạo ra **2 tunnel IPsec** kết thúc ở hai AZ khác nhau. Đó là HA phía AWS. Phía bạn, nếu chỉ có **một** customer gateway vật lý thì thiết bị đó vẫn là single point of failure — muốn HA thật phải hai CGW, mỗi cái hai tunnel.

Mỗi tunnel có trần throughput khoảng **1.25 Gbps**. Với **VGW**, hai tunnel chạy active/standby — *không* cộng băng thông. Muốn vượt trần phải gắn VPN vào **Transit Gateway** và bật **ECMP**: nhiều tunnel song song, throughput cộng dồn. Vì thế gần như mọi đề "VPN throughput không đủ" đều có đáp án chứa TGW + ECMP.

### 4.2 Static routing vs BGP (dynamic)

| | Static | BGP (dynamic) |
|---|---|---|
| Cách khai route | khai tay prefix on-prem trong VPN connection | CGW advertise prefix, AWS advertise CIDR VPC |
| Failover giữa 2 tunnel | chậm, thường phải can thiệp | tự động khi BGP session down |
| ECMP trên TGW | không | có |
| Yêu cầu thiết bị | CGW không cần hỗ trợ BGP | CGW phải chạy BGP, cần ASN |
| **Khi nào chọn** | thiết bị cũ không nói BGP, mạng nhỏ tĩnh | mặc định cho production, bắt buộc nếu muốn DX+VPN failover tự động |

Bẫy: đề mô tả "muốn failover tự động giữa DX và VPN" → **phải BGP ở cả hai đường**. Static route không cho AWS biết đường nào chết.

### 4.3 VGW hay TGW làm điểm cuối?

| | **Virtual Private Gateway** | **Transit Gateway** |
|---|---|---|
| Phạm vi | gắn đúng **1 VPC** | hub cho nhiều VPC/nhiều account |
| VPN ECMP | không | có |
| Route table | dùng route table của VPC + propagation | **TGW route table riêng**, association + propagation |
| Accelerated VPN | không hỗ trợ | có |
| Chi phí | không có attachment-hour | trả theo attachment-hour + data processing |
| **Khi nào chọn** | 1 VPC duy nhất, đơn giản, rẻ | từ 3 VPC trở lên, hoặc cần ECMP/accelerated |

### 4.4 Accelerated Site-to-Site VPN

Bật accelerated VPN thì tunnel không đi thẳng qua internet tới region, mà vào **AWS Global Accelerator anycast edge** gần nhất rồi chạy trên backbone AWS — jitter và packet loss giảm rõ khi on-prem ở xa region.

Điều kiện cần nhớ: accelerated VPN **chỉ dùng được với Transit Gateway attachment**, không dùng được với VGW. Đề tả "VPN qua internet xuyên lục địa, chất lượng thất thường, muốn ổn định mà không mua DX" → accelerated VPN trên TGW.

### 4.5 Client VPN

Client VPN là dịch vụ **client-based** dựa trên OpenVPN: từng user cài client, authenticate rồi nhận IP từ một **client CIDR block** (không được trùng CIDR VPC, không sửa được sau khi tạo). Endpoint associate vào subnet của VPC; **authorization rule** quyết định user/group nào tới được network nào — phân quyền nằm ở authorization rule chứ không ở security group.

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

AWS quyết định gửi gói ra đâu theo thứ tự:

1. **Longest prefix match** trước tất cả. Nếu VPN advertise `10.1.1.0/24` còn DX advertise `10.1.0.0/16`, traffic tới `10.1.1.5` sẽ đi **VPN** — dù bạn muốn DX. Đây là lỗi thiết kế hay gặp ngoài đời và là bẫy đề: muốn DX thắng thì hai bên phải advertise **cùng độ dài prefix**.
2. **Local route của VPC luôn thắng**, kể cả khi route propagated từ DX/VPN cụ thể hơn.
3. **Static route bạn tự tay thêm vào route table** thắng mọi route được propagate vào.
4. Giữa các route **được propagate** cùng prefix trên virtual private gateway, thứ tự AWS quy định là:
   **DX BGP → static route của Site-to-Site VPN → VPN BGP**.
   Nhớ kỹ chiều này: DX (BGP) **thắng** VPN kể cả khi VPN dùng static routing — đây đúng là chỗ
   đề hay gài, vì trực giác "static thắng BGP" chỉ đúng với static bạn nhập tay ở bước 3,
   không đúng với static route của VPN được propagate.

Sức khoẻ tunnel được xét trước mọi thuộc tính routing khác — tunnel chết thì route của nó rụng
khỏi bảng bất kể ưu tiên.

Muốn chủ động điều chỉnh mà không đổi prefix: dùng **AS_PATH prepending** hoặc **BGP community (local preference)** trên các route advertise từ on-prem để làm đường backup "kém hấp dẫn" hơn.

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
- TGW hỗ trợ **multicast**, thứ mà VPC peering và PrivateLink không có.
- Khi TGW đặt ở account khác VPC, phải **share bằng AWS RAM** rồi VPC owner mới tạo attachment được — xem [[ch3-05-multi-account-governance]].
- Security group **không reference được** cross-VPC qua TGW như cách làm được qua peering cùng region.

### 6.3 Bảng ba cột kinh điển

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

Khi compliance bắt traffic đi qua **appliance bên thứ ba** (firewall Palo Alto, Fortinet, IDS/IPS), **Gateway Load Balancer** là load balancer L3 hoạt động như **bump-in-the-wire**: đóng gói gói tin nguyên vẹn bằng **GENEVE trên port 6081**, gửi tới fleet appliance, nhận lại và trả về đường cũ — IP nguồn/đích không đổi, appliance thấy gói gốc.

Phía consumer, bạn tạo **GWLB endpoint** (một dạng VPC endpoint) và trỏ route table vào nó. Kiến trúc chuẩn: một **inspection VPC** chứa GWLB + appliance; các VPC ứng dụng chỉ có GWLBe và gắn chung một TGW để mọi luồng đi vòng qua inspection VPC.

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

Tiền là tiêu chí phân biệt trong rất nhiều câu "which is the MOST cost-effective". Giá cụ thể đổi theo region và theo thời gian, nhưng **cấu trúc** tính tiền thì ổn định — và đó mới là thứ đề hỏi:

| Thành phần | Tính tiền theo | Lưu ý quyết định |
|---|---|---|
| **Direct Connect** | **port-hour** theo tốc độ cổng + **data transfer out** theo GB | DTO qua DX rẻ hơn rõ rệt so với DTO qua internet → traffic ra càng lớn, DX càng nhanh hoà vốn. Data **vào** AWS thường miễn phí ở cả hai đường. |
| **Site-to-Site VPN** | **giờ mỗi connection** + data transfer out | rẻ để dựng, nhưng trần 1.25 Gbps/tunnel khiến workload lớn buộc phải nhiều tunnel + TGW |
| **Transit Gateway** | **attachment-hour** mỗi attachment + **data processing** mỗi GB đi qua TGW | Mỗi VPC là một attachment tính tiền riêng. Traffic A→B qua TGW bị tính processing; peering thì không. Vì thế 2–3 VPC ổn định vẫn nên peering. |
| **NAT Gateway** | **giờ** + **mỗi GB xử lý** | đây là dòng hoá đơn gây sốc kinh điển |
| **Gateway endpoint (S3/DynamoDB)** | **miễn phí** | mọi byte S3 đi qua NAT Gateway là tiền vứt đi |
| **Interface endpoint** | giờ mỗi ENI mỗi AZ + mỗi GB | nhiều endpoint × nhiều AZ cộng lại không nhỏ; cân nhắc gom |
| **GWLB + GWLBe** | endpoint-hour + GB, cộng phí GWLB | đắt, chỉ dùng khi compliance bắt appliance |
| **Egress-only IGW** | không phí giờ | chỉ trả data transfer |

**Bẫy cost kinh điển của SAA**: EC2 trong private subnet đọc/ghi hàng chục TB lên S3 qua **NAT Gateway** → trả cả giờ NAT lẫn per-GB processing. Fix đúng một dòng: thêm **S3 gateway endpoint** vào route table của subnet. Nếu đề nói "truy cập từ **on-prem**" thì đáp án đổi thành **interface endpoint**.

Bẫy thứ hai: dựng TGW cho đúng 2 VPC "cho chuẩn kiến trúc" — thêm 2 attachment-hour và phí data processing mà peering không có. "Cost-effective nhất cho 2 VPC" → **peering**.

---

## 10. Bẫy thi thường gặp

1. **"Cần private connectivity ngay lập tức"** → VPN, **không** phải DX. DX mất hàng tuần.
2. **"DX đã là private nên đủ an toàn"** → Sai. DX không mã hoá; cần MACsec hoặc VPN over DX.
3. **"Một DX connection là đủ HA"** → Sai. Một connection, một location = không có SLA cao. High resiliency cần 2 location.
4. **LAG = resiliency** → Sai. LAG cùng device cùng location, nó cho **băng thông**.
5. **"Private VIF tới được S3"** → Sai với S3 public endpoint; muốn vậy thì public VIF, hoặc interface endpoint truy cập qua private VIF.
6. **"Transit VIF nối thẳng vào TGW"** → Sai. Transit VIF **bắt buộc** đi qua Direct Connect Gateway.
7. **"Hai VPC gắn cùng DXGW thì nói chuyện được với nhau"** → Sai. DXGW không route giữa các VPC.
8. **"Tăng throughput VPN bằng cách nâng cấp tunnel"** → Sai. Trần là ~1.25 Gbps/tunnel; cách đúng là TGW + nhiều tunnel + ECMP.
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
