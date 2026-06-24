# High Availability & Fault Tolerance

Trong Domain 2 (Design Resilient Architectures), đây là bài "xương sống". Đề SAA-C03 cực kỳ thích các tình huống kiểu *"website downtime khi một AZ chết, làm sao khắc phục?"* hoặc *"giảm RTO/RPO xuống mức nào?"*. Nắm chắc bài này bạn xử lý được khoảng 15-20% câu hỏi resilience.

## 1. Phân biệt khái niệm: HA vs Fault Tolerance vs DR

Đề thi thường trộn ba khái niệm này để gài bẫy. Phải tách bạch rõ.

| Khái niệm | Ý nghĩa | Khi component lỗi thì... | Ví dụ AWS |
|---|---|---|---|
| **High Availability (HA)** | Hệ thống *recover nhanh* khi có sự cố, downtime tối thiểu | Có gián đoạn ngắn rồi tự phục hồi | RDS Multi-AZ (failover ~60-120s) |
| **Fault Tolerance (FT)** | Hệ thống chạy *liên tục không gián đoạn* dù component lỗi | Người dùng không nhận ra có lỗi | Aurora với nhiều replica + ELB |
| **Disaster Recovery (DR)** | Khôi phục sau thảm họa lớn (mất cả region) | Khôi phục theo RTO/RPO định trước | Multi-Region, Pilot Light, backups |

> 💡 Mẹo thi: HA = "phục hồi nhanh, chấp nhận downtime ngắn". FT = "không downtime, không mất dữ liệu/giao dịch". Nếu đề nhấn mạnh "no interruption", "zero downtime" → hướng Fault Tolerance (thường cần redundancy nhiều hơn, đắt hơn).

### Single Point of Failure (SPOF)

SPOF = một thành phần mà nếu nó chết thì cả hệ thống chết. Mục tiêu thiết kế resilient là **loại bỏ SPOF**.

Các SPOF kinh điển trong đề:
- EC2 instance đơn lẻ (không Auto Scaling) → giải pháp: ASG qua nhiều AZ.
- RDS Single-AZ → giải pháp: Multi-AZ.
- NAT Instance đơn lẻ → giải pháp: NAT Gateway (managed, redundant trong AZ) hoặc nhiều NAT Gateway ở mỗi AZ.
- Một AZ duy nhất → giải pháp: deploy qua ≥2 AZ.

> ⚠️ Bẫy: NAT Gateway **bản thân nó đã redundant trong AZ đó**, nhưng nó vẫn nằm trong MỘT AZ. Nếu cả AZ đó chết, NAT Gateway chết theo. Kiến trúc HA thật sự cần **một NAT Gateway cho mỗi AZ**, và route table của mỗi private subnet trỏ về NAT Gateway cùng AZ.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 410" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Kiến trúc khử SPOF — VPC trải 2 AZ, NAT Gateway riêng mỗi AZ</title>
  <desc>Một VPC gồm hai Availability Zone. Mỗi AZ có một public subnet chứa NAT Gateway riêng và một private subnet; route table của private subnet trỏ về NAT Gateway cùng AZ. Auto Scaling Group trải instance qua cả hai AZ. Nếu một AZ chết, AZ còn lại vẫn phục vụ — không còn điểm lỗi đơn.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Khử SPOF: NAT Gateway riêng mỗi AZ + ASG trải đa AZ</text>
  <rect x="14" y="38" width="692" height="356" rx="12" fill="#3b82f6" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="5 4"/>
  <text x="28" y="58" font-size="11.5" font-weight="700" fill="currentColor" opacity="0.75">VPC</text>
  <g>
    <rect x="32" y="70" width="316" height="312" rx="10" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="48" y="90" font-size="12" font-weight="700" fill="currentColor">Availability Zone A</text>
    <rect x="48" y="102" width="284" height="78" rx="8" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="62" y="120" font-size="10.5" fill="currentColor" opacity="0.7">Public subnet A</text>
    <rect x="62" y="128" width="120" height="40" rx="7" fill="#f59e0b" fill-opacity="0.9"/>
    <text x="122" y="145" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">NAT GW A</text>
    <text x="122" y="160" font-size="9.5" text-anchor="middle" fill="#fff" opacity="0.9">(trong AZ A)</text>
    <rect x="48" y="196" width="284" height="170" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="62" y="214" font-size="10.5" fill="currentColor" opacity="0.7">Private subnet A — RT → NAT GW A</text>
    <rect x="68" y="226" width="116" height="36" rx="7" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="126" y="249" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">EC2</text>
    <rect x="196" y="226" width="116" height="36" rx="7" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="254" y="249" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">EC2</text>
  </g>
  <g>
    <rect x="372" y="70" width="316" height="312" rx="10" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="388" y="90" font-size="12" font-weight="700" fill="currentColor">Availability Zone B</text>
    <rect x="388" y="102" width="284" height="78" rx="8" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="402" y="120" font-size="10.5" fill="currentColor" opacity="0.7">Public subnet B</text>
    <rect x="402" y="128" width="120" height="40" rx="7" fill="#f59e0b" fill-opacity="0.9"/>
    <text x="462" y="145" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">NAT GW B</text>
    <text x="462" y="160" font-size="9.5" text-anchor="middle" fill="#fff" opacity="0.9">(trong AZ B)</text>
    <rect x="388" y="196" width="284" height="170" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="402" y="214" font-size="10.5" fill="currentColor" opacity="0.7">Private subnet B — RT → NAT GW B</text>
    <rect x="408" y="226" width="116" height="36" rx="7" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="466" y="249" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">EC2</text>
    <rect x="536" y="226" width="116" height="36" rx="7" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="594" y="249" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">EC2</text>
  </g>
  <defs>
    <marker id="spofArr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <path d="M126 226 V190 H122 V172" marker-end="url(#spofArr)"/>
    <path d="M466 226 V190 H462 V172" marker-end="url(#spofArr)"/>
  </g>
  <rect x="32" y="330" width="656" height="44" rx="8" fill="#10b981" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="360" y="349" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Auto Scaling Group — trải instance qua AZ A và AZ B</text>
  <text x="360" y="366" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">AZ A chết → ASG launch bù ở AZ B, NAT GW B vẫn sống → không còn SPOF</text>
</svg>

## 2. Multi-AZ: nền tảng của HA trong một Region

### RDS Multi-AZ

- AWS duy trì một **standby replica đồng bộ (synchronous)** ở AZ khác.
- Standby **KHÔNG phục vụ traffic** (không đọc, không ghi) — nó chỉ chờ failover. Đây là điểm khác cốt lõi với Read Replica.
- Failover tự động khi: AZ primary lỗi, instance lỗi, mất kết nối mạng, đổi instance type, patching.
- Failover dùng **DNS CNAME** trỏ sang standby → ứng dụng không cần đổi endpoint, chỉ cần reconnect.
- Thời gian failover thường **60-120 giây**.

| Tiêu chí | Multi-AZ | Read Replica |
|---|---|---|
| Mục đích | High Availability | Scale read (offload đọc) |
| Replication | Synchronous | Asynchronous |
| Phục vụ traffic? | Không (standby im lặng) | Có (read-only) |
| Cross-Region? | Không (cùng region)\* | Có |
| Tự động failover? | Có | Không (phải promote thủ công) |

\* *RDS có tùy chọn Multi-AZ DB cluster (3 instance: 1 writer + 2 readable standby) — readable standby có thể phục vụ đọc, nhưng đây không phải mặc định.*

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>RDS Multi-AZ (standby im lặng) so với Read Replica (phục vụ đọc)</title>
  <desc>Bên trái: Multi-AZ — primary sao chép đồng bộ sang standby ở AZ khác; standby không nhận traffic, chỉ chờ failover. Bên phải: Read Replica — primary sao chép bất đồng bộ sang replica; ứng dụng đọc trực tiếp từ replica để giảm tải đọc.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Multi-AZ (HA) vs Read Replica (scale đọc)</text>
  <g>
    <rect x="14" y="38" width="338" height="262" rx="11" fill="#3b82f6" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="30" y="60" font-size="12.5" font-weight="700" fill="currentColor">RDS Multi-AZ — High Availability</text>
    <rect x="40" y="76" width="120" height="50" rx="8" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="100" y="98" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Primary</text>
    <text x="100" y="114" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">AZ A · read+write</text>
    <rect x="206" y="76" width="120" height="50" rx="8" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 3"/>
    <text x="266" y="98" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Standby</text>
    <text x="266" y="114" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">AZ B · IM LẶNG</text>
    <g stroke="currentColor" stroke-opacity="0.55" fill="none">
      <path d="M160 101 H200" marker-end="url(#rdsArr)"/>
    </g>
    <text x="183" y="92" font-size="9" text-anchor="middle" fill="#10b981" opacity="0.95" font-weight="700">sync</text>
    <rect x="40" y="150" width="76" height="30" rx="7" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="78" y="170" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">App</text>
    <g stroke="currentColor" stroke-opacity="0.5" fill="none">
      <path d="M100 150 V130" marker-end="url(#rdsArr)"/>
    </g>
    <line x1="266" y1="150" x2="266" y2="135" stroke="#ef4444" stroke-opacity="0.6" stroke-width="2"/>
    <line x1="258" y1="140" x2="274" y2="148" stroke="#ef4444" stroke-opacity="0.7" stroke-width="2"/>
    <line x1="274" y1="140" x2="258" y2="148" stroke="#ef4444" stroke-opacity="0.7" stroke-width="2"/>
    <text x="266" y="170" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.65">không đọc</text>
    <rect x="30" y="206" width="308" height="80" rx="8" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="44" y="226" font-size="10.5" fill="currentColor" opacity="0.85">• Sao chép ĐỒNG BỘ (synchronous)</text>
    <text x="44" y="244" font-size="10.5" fill="currentColor" opacity="0.85">• Standby chỉ chờ failover (60–120s)</text>
    <text x="44" y="262" font-size="10.5" fill="currentColor" opacity="0.85">• Failover qua DNS CNAME, tự động</text>
    <text x="44" y="280" font-size="10.5" fill="currentColor" opacity="0.85">• Mục đích: chống mất AZ, KHÔNG scale đọc</text>
  </g>
  <g>
    <rect x="368" y="38" width="338" height="262" rx="11" fill="#10b981" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="384" y="60" font-size="12.5" font-weight="700" fill="currentColor">Read Replica — Scale đọc</text>
    <rect x="394" y="76" width="120" height="50" rx="8" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="454" y="98" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Primary</text>
    <text x="454" y="114" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">read+write</text>
    <rect x="560" y="76" width="120" height="50" rx="8" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="620" y="98" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Read Replica</text>
    <text x="620" y="114" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">read-only</text>
    <g stroke="currentColor" stroke-opacity="0.55" fill="none">
      <path d="M514 101 H554" marker-end="url(#rdsArr)"/>
    </g>
    <text x="537" y="92" font-size="9" text-anchor="middle" fill="#f59e0b" opacity="0.95" font-weight="700">async</text>
    <rect x="394" y="150" width="76" height="30" rx="7" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="432" y="170" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">App</text>
    <g stroke="currentColor" stroke-opacity="0.5" fill="none">
      <path d="M454 150 V130" marker-end="url(#rdsArr)"/>
      <path d="M470 165 H560 V130" marker-end="url(#rdsArr)"/>
    </g>
    <text x="540" y="160" font-size="9" text-anchor="middle" fill="#10b981" opacity="0.95" font-weight="700">đọc</text>
    <rect x="384" y="206" width="308" height="80" rx="8" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="398" y="226" font-size="10.5" fill="currentColor" opacity="0.85">• Sao chép BẤT ĐỒNG BỘ (asynchronous)</text>
    <text x="398" y="244" font-size="10.5" fill="currentColor" opacity="0.85">• Replica PHỤC VỤ đọc (offload truy vấn)</text>
    <text x="398" y="262" font-size="10.5" fill="currentColor" opacity="0.85">• Không tự failover (promote thủ công)</text>
    <text x="398" y="280" font-size="10.5" fill="currentColor" opacity="0.85">• Có thể cross-region</text>
  </g>
  <defs>
    <marker id="rdsArr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
</svg>

> ⚠️ Bẫy phổ biến: "Tăng khả năng đọc + đảm bảo HA" → cần **CẢ HAI**: Multi-AZ (cho HA) và Read Replica (cho scale read). Đề hay cho đáp án chỉ một trong hai để bẫy.

### Aurora

- Storage tự động replicate **6 bản qua 3 AZ** → bền vững và HA ở tầng storage sẵn có.
- Có thể có tới **15 Aurora Replicas**, mỗi replica vừa scale read vừa làm failover target.
- Failover sang replica rất nhanh (thường **< 30 giây**) vì replica đã sẵn sàng.
- **Aurora Global Database**: replicate sang region khác, độ trễ thường < 1s, dùng cho DR cross-region với RPO thấp. Promote secondary region trong < 1 phút (RTO thấp).

> 💡 Mẹo thi: Đề muốn "RPO gần 0 + đọc toàn cầu + failover cross-region nhanh" → **Aurora Global Database**. Đề muốn HA trong region + scale đọc, không cần global → Aurora với nhiều replica.

### ELB Cross-AZ

- **Cross-Zone Load Balancing**: cho phép LB phân phối traffic đều tới **tất cả target ở mọi AZ**, không chỉ AZ của node nhận traffic.
- **ALB**: cross-zone **luôn bật**, miễn phí.
- **NLB & GWLB**: cross-zone **mặc định TẮT**, bật lên sẽ **tính phí data transfer giữa các AZ**.

> ⚠️ Bẫy: Nếu target không phân bố đều (AZ-A có 8 instance, AZ-B có 2) và cross-zone TẮT, traffic vào AZ-B sẽ dồn nặng lên 2 instance đó. Đề hỏi "vì sao tải không đều" → nghĩ tới cross-zone đang tắt (NLB).

## 3. Auto Scaling cho High Availability

Auto Scaling Group (ASG) không chỉ để scale theo tải — nó là **trụ cột HA**: tự thay thế instance chết và phân bố qua nhiều AZ.

Vai trò HA của ASG:
- **Health check + tự thay thế**: instance fail health check → ASG terminate và launch instance mới.
- **Multi-AZ distribution**: ASG cân bằng instance qua các AZ được cấu hình. AZ chết → ASG launch bù ở AZ còn sống.
- **Min capacity**: đặt `min` ≥ 2 và trải qua ≥ 2 AZ để luôn còn instance khi một AZ sập.

Các loại health check:
- **EC2 health check** (mặc định): chỉ kiểm tra trạng thái hardware/hypervisor của instance.
- **ELB health check**: kiểm tra ứng dụng có thực sự phản hồi (HTTP 200). **Nên bật** để ASG biết loại instance "máy sống nhưng app chết".

> ⚠️ Bẫy: ASG mặc định chỉ dùng EC2 health check. Nếu app crash nhưng OS vẫn chạy, ASG **không** thay thế instance. Giải pháp đề thi: bật **ELB health check** cho ASG.

Chiến lược tránh SPOF với ASG:
- Đặt `min capacity` đủ để chịu mất 1 AZ (ví dụ cần 4 instance phục vụ → set min 6 qua 3 AZ, mất 1 AZ còn 4).
- Dùng **Launch Template** (khuyến nghị, thay cho Launch Configuration đã cũ).

## 4. Stateless & Session Externalization

Để ASG thay thế instance tự do (và để HA hoạt động), instance phải **stateless** — không lưu state cục bộ trên đĩa/RAM của instance đó.

Vấn đề: session người dùng lưu trên instance → instance chết → người dùng bị logout. Đây là **SPOF ở tầng session**.

Các cách externalize session:

| Giải pháp | Đặc điểm | Khi nào dùng |
|---|---|---|
| **ElastiCache (Redis)** | In-memory, latency cực thấp, hỗ trợ replication/Multi-AZ | Session store hiệu năng cao, phổ biến nhất trong đề |
| **DynamoDB** | Serverless, scale tự động, TTL tự xóa session hết hạn | Session store không cần quản lý, tích hợp tốt serverless |
| **ALB Sticky Sessions** | Gắn user vào 1 instance qua cookie | Giải pháp "tạm", KHÔNG phải externalize thật — instance chết vẫn mất session |

> 💡 Mẹo thi: "Làm sao để user không mất session khi instance bị thay thế?" → externalize ra **ElastiCache** hoặc **DynamoDB**. Sticky session là **bẫy** — nó chỉ định tuyến, không bảo toàn session khi instance chết.

> ⚠️ Bẫy: Lưu dữ liệu lên đĩa local của EC2 cũng là anti-pattern. Cần dùng **S3** (object) hoặc **EFS** (shared file system gắn nhiều AZ) để dữ liệu sống độc lập với instance.

## 5. Route 53 Routing Policies & Health Checks

Route 53 là tầng DNS — nơi điều phối HA/DR ở mức **toàn cục (cross-region)**. Phải thuộc lòng khi nào dùng policy nào.

| Routing Policy | Mục đích | Tình huống điển hình trong đề |
|---|---|---|
| **Simple** | Một record, không health check | Trường hợp cơ bản nhất |
| **Failover** | Active-Passive: primary chết → chuyển sang secondary | **DR**, standby site. Cần health check trên primary |
| **Weighted** | Chia traffic theo tỉ lệ % | A/B testing, canary deploy, dịch chuyển traffic dần |
| **Latency** | Route tới region có độ trễ thấp nhất | Tối ưu **performance** cho user toàn cầu |
| **Geolocation** | Route theo **vị trí địa lý** của user | Tuân thủ pháp lý (data residency), nội dung theo quốc gia |
| **Geoproximity** | Route theo khoảng cách địa lý + bias dịch chuyển | Cần dịch chuyển traffic giữa region theo "bias" |
| **Multivalue Answer** | Trả nhiều IP healthy, client tự chọn | HA đơn giản kiểu round-robin có health check |

> ⚠️ Bẫy Latency vs Geolocation: **Latency** = tối ưu *tốc độ* (gần về độ trễ mạng, không nhất thiết gần địa lý). **Geolocation** = dựa trên *vị trí user* (cho compliance/nội dung). Đề mô tả "tuân thủ luật, user EU phải vào server EU" → **Geolocation**. Đề mô tả "user truy cập nhanh nhất có thể" → **Latency**.

> ⚠️ Bẫy Failover vs Multivalue: **Failover** là active-passive (1 primary, 1 standby). **Multivalue** là active-active nhiều endpoint cùng phục vụ. Đề "active-passive DR site" → Failover, không phải Multivalue.

### Health Checks

- Route 53 health check giám sát endpoint (HTTP/HTTPS/TCP); endpoint unhealthy → Route 53 ngừng trả record đó.
- Loại health check:
  - **Endpoint** monitoring (check IP/domain).
  - **Calculated** (kết hợp nhiều health check con bằng AND/OR).
  - **CloudWatch Alarm** based (dùng cho resource private không expose ra internet).
- Health check là điều kiện để **Failover** và **Multivalue** hoạt động đúng.

> 💡 Mẹo thi: Failover routing **bắt buộc** gắn health check vào primary record thì mới biết khi nào chuyển sang secondary.

## 6. ELB Types: ALB vs NLB vs GWLB

| Tiêu chí | **ALB** | **NLB** | **GWLB** |
|---|---|---|---|
| Layer | 7 (HTTP/HTTPS) | 4 (TCP/UDP/TLS) | 3 (IP / GENEVE) |
| Định tuyến theo | Path, host, header, query | IP + port | Toàn bộ packet tới appliance |
| Hiệu năng | Cao | **Cực cao, latency thấp** | Cho security appliance |
| Static IP | Không (dùng DNS) | **Có (Elastic IP mỗi AZ)** | — |
| Use case | Web app, microservices, container | Gaming, IoT, throughput cực lớn, cần static IP | Firewall/IDS/IPS của bên thứ ba |
| WebSocket/gRPC | Có | TCP passthrough | — |

Cách chọn nhanh:
- Cần **routing theo HTTP path/host**, host nhiều microservice sau 1 LB → **ALB**.
- Cần **static IP**, **độ trễ siêu thấp**, **traffic non-HTTP (TCP/UDP)**, hàng triệu request/giây → **NLB**.
- Cần đưa traffic qua **virtual appliance bảo mật** (firewall) → **GWLB**.

> ⚠️ Bẫy: "Cần whitelist một địa chỉ IP cố định cho LB" → **NLB** (có Elastic IP). ALB chỉ có DNS name thay đổi, không có static IP — đây là đáp án bẫy hay gặp.

> 💡 Mẹo thi: ALB chỉ hỗ trợ HTTP/HTTPS. Nếu đề nói "TCP", "UDP", "MQTT", "không phải HTTP" → loại ALB ngay, nghĩ NLB.

## 7. Multi-AZ vs Multi-Region (bẫy lớn nhất của bài)

Đây là chỗ thí sinh hay sai nhất. Phải phân biệt **phạm vi** và **chi phí/độ phức tạp**.

| | **Multi-AZ** | **Multi-Region** |
|---|---|---|
| Bảo vệ chống | Lỗi 1 AZ (datacenter) | Lỗi cả region, thảm họa diện rộng |
| Độ trễ replication | Rất thấp (cùng region) | Cao hơn (đường truyền liên vùng) |
| Mục tiêu chính | **High Availability** | **Disaster Recovery**, global latency |
| Chi phí/độ phức tạp | Vừa phải | Cao |
| Ví dụ service | RDS Multi-AZ, ASG đa AZ | Aurora Global DB, S3 CRR, Route 53 failover |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 330" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Phạm vi bảo vệ: Multi-AZ (chống lỗi 1 AZ) vs Multi-Region (chống lỗi cả region)</title>
  <desc>Bên trái: Multi-AZ nằm trong một Region, gồm nhiều AZ — chịu được lỗi của một AZ, nhưng nếu cả Region chết thì sập. Bên phải: Multi-Region trải qua hai Region — chịu được lỗi của toàn bộ một Region.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Phạm vi bảo vệ khác nhau</text>
  <g>
    <text x="30" y="56" font-size="12.5" font-weight="700" fill="currentColor">Multi-AZ — phạm vi 1 Region</text>
    <rect x="14" y="66" width="338" height="180" rx="11" fill="#3b82f6" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="30" y="86" font-size="11" font-weight="700" fill="currentColor" opacity="0.75">Region (vd us-east-1)</text>
    <rect x="32" y="98" width="142" height="130" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="103" y="118" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">AZ A</text>
    <rect x="48" y="130" width="110" height="34" rx="7" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="103" y="152" font-size="10" text-anchor="middle" fill="currentColor">app + DB</text>
    <rect x="192" y="98" width="142" height="130" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="263" y="118" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">AZ B</text>
    <rect x="208" y="130" width="110" height="34" rx="7" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="263" y="152" font-size="10" text-anchor="middle" fill="currentColor">standby</text>
    <text x="183" y="244" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">✔ AZ A chết → AZ B gánh</text>
  </g>
  <rect x="14" y="262" width="338" height="56" rx="9" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="183" y="285" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">✘ Cả Region chết → toàn bộ sập</text>
  <text x="183" y="303" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">Multi-AZ không bảo vệ được cấp Region</text>
  <g>
    <text x="384" y="56" font-size="12.5" font-weight="700" fill="currentColor">Multi-Region — phạm vi nhiều Region</text>
    <rect x="368" y="66" width="160" height="180" rx="11" fill="#3b82f6" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="384" y="86" font-size="10.5" font-weight="700" fill="currentColor" opacity="0.75">Region 1</text>
    <rect x="384" y="96" width="128" height="60" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="448" y="120" font-size="10" text-anchor="middle" fill="currentColor">AZ A · AZ B</text>
    <text x="448" y="138" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">app + DB (primary)</text>
    <text x="448" y="174" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">site chính</text>
    <rect x="546" y="66" width="160" height="180" rx="11" fill="#3b82f6" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="562" y="86" font-size="10.5" font-weight="700" fill="currentColor" opacity="0.75">Region 2</text>
    <rect x="562" y="96" width="128" height="60" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="626" y="120" font-size="10" text-anchor="middle" fill="currentColor">AZ A · AZ B</text>
    <text x="626" y="138" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">app + DB (DR)</text>
    <text x="626" y="174" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">site dự phòng</text>
    <g stroke="currentColor" stroke-opacity="0.55" fill="none">
      <path d="M512 126 H544" marker-end="url(#mrArr)"/>
    </g>
    <text x="528" y="118" font-size="8.5" text-anchor="middle" fill="#f59e0b" opacity="0.95" font-weight="700">replicate</text>
    <text x="537" y="218" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">Route 53 failover giữa region</text>
  </g>
  <rect x="368" y="262" width="338" height="56" rx="9" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="537" y="285" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">✔ Cả Region 1 chết → Region 2 gánh</text>
  <text x="537" y="303" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">Chống thảm họa diện rộng — đắt &amp; phức tạp hơn</text>
  <defs>
    <marker id="mrArr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
</svg>

> ⚠️ Bẫy: Nếu đề chỉ yêu cầu "chịu được lỗi của một datacenter / một AZ" → **Multi-AZ là đủ**, đừng chọn Multi-Region (thừa, đắt, sai). Multi-Region chỉ khi đề nói rõ "survive an entire region outage", "global users", hoặc "regulatory DR requirement".

## 8. RTO & RPO (gắn với DR strategies)

- **RTO (Recovery Time Objective)**: thời gian tối đa chấp nhận được để **khôi phục dịch vụ** sau sự cố. RTO thấp = phục hồi nhanh.
- **RPO (Recovery Point Objective)**: lượng **dữ liệu** tối đa chấp nhận mất, đo bằng thời gian. RPO thấp = mất ít dữ liệu (cần replicate thường xuyên/liên tục).

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 230" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>RTO vs RPO trên trục thời gian</title>
  <desc>Trục thời gian đi từ trái sang phải. Mốc 1: backup tốt cuối cùng. Mốc 2: sự cố (crash). Mốc 3: dịch vụ phục hồi. Khoảng từ backup tới sự cố là RPO — lượng dữ liệu bị mất. Khoảng từ sự cố tới phục hồi là RTO — thời gian downtime.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">RTO vs RPO trên trục thời gian</text>
  <line x1="40" y1="120" x2="700" y2="120" stroke="currentColor" stroke-opacity="0.5" stroke-width="2"/>
  <defs>
    <marker id="tlArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
  <line x1="690" y1="120" x2="704" y2="120" stroke="currentColor" stroke-opacity="0.55" stroke-width="2" marker-end="url(#tlArr)"/>
  <text x="700" y="140" font-size="10" text-anchor="end" fill="currentColor" opacity="0.6">thời gian →</text>
  <g>
    <circle cx="150" cy="120" r="7" fill="#10b981" fill-opacity="0.9"/>
    <line x1="150" y1="120" x2="150" y2="92" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="150" y="84" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Backup tốt cuối</text>
    <text x="150" y="68" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">last good backup</text>
  </g>
  <g>
    <circle cx="370" cy="120" r="7" fill="#ef4444" fill-opacity="0.85"/>
    <line x1="370" y1="120" x2="370" y2="92" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="370" y="84" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">SỰ CỐ</text>
    <text x="370" y="68" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">crash</text>
  </g>
  <g>
    <circle cx="620" cy="120" r="7" fill="#3b82f6" fill-opacity="0.9"/>
    <line x1="620" y1="120" x2="620" y2="92" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="620" y="84" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Dịch vụ phục hồi</text>
    <text x="620" y="68" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">service restored</text>
  </g>
  <g>
    <rect x="150" y="150" width="220" height="30" rx="7" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="260" y="170" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">RPO — dữ liệu bị mất</text>
    <text x="260" y="200" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">replicate càng dày → RPO càng nhỏ</text>
  </g>
  <g>
    <rect x="370" y="150" width="250" height="30" rx="7" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="495" y="170" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">RTO — thời gian downtime</text>
    <text x="495" y="200" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">phục hồi càng nhanh → RTO càng nhỏ</text>
  </g>
</svg>

Bốn chiến lược DR (RTO/RPO giảm dần, chi phí tăng dần):

| Strategy | RTO/RPO | Mô tả | Chi phí |
|---|---|---|---|
| **Backup & Restore** | Cao (giờ) | Backup ra S3, khi cần thì restore | Thấp nhất |
| **Pilot Light** | Trung bình (chục phút) | Core tối thiểu luôn chạy (vd: DB replicate), app scale lên khi cần | Thấp |
| **Warm Standby** | Thấp (phút) | Bản thu nhỏ của toàn hệ thống luôn chạy, scale lên khi failover | Trung bình |
| **Multi-Site / Active-Active** | Gần 0 | Hai site chạy full song song | Cao nhất |

> 💡 Mẹo thi:
> - Đề nhấn "minimize cost, có thể chấp nhận downtime vài giờ" → **Backup & Restore**.
> - Đề nhấn "RTO/RPO thấp, chi phí hợp lý, DB đã replicate sẵn" → **Pilot Light** hoặc **Warm Standby**.
> - Đề nhấn "near-zero RTO/RPO, không downtime" → **Multi-Site Active-Active** (vd Aurora Global DB + Route 53).

> ⚠️ Bẫy: RTO ≠ RPO. RTO nói về **thời gian phục hồi (downtime)**; RPO nói về **dữ liệu bị mất**. Đề hỏi "tối đa được mất 5 phút dữ liệu" → đó là **RPO = 5 phút** (cần replication, không phải backup hằng đêm).

## 9. Tổng kết quyết định nhanh (cheat sheet)

- "HA cho RDS" → **Multi-AZ**. "Scale đọc" → **Read Replica**. Cần cả hai → dùng cả hai.
- "Failover cực nhanh + global + RPO~0" → **Aurora Global Database**.
- "User mất session khi instance chết" → externalize ra **ElastiCache/DynamoDB**, KHÔNG phải sticky session.
- "Cần static IP cho LB" → **NLB**. "Routing theo URL path" → **ALB**. "Chèn firewall appliance" → **GWLB**.
- "Active-passive DR" → Route 53 **Failover**. "Compliance theo quốc gia" → **Geolocation**. "Nhanh nhất cho user" → **Latency**. "% traffic" → **Weighted**.
- "Chịu lỗi 1 AZ" → **Multi-AZ là đủ**. "Chịu lỗi cả region" → **Multi-Region**.
- "Mất tối đa X phút dữ liệu" = **RPO**. "Phục hồi trong tối đa X phút" = **RTO**.
- Loại bỏ SPOF: ASG đa AZ, NAT Gateway mỗi AZ, RDS Multi-AZ, dữ liệu trên S3/EFS thay vì đĩa local.

> 💡 Nguyên tắc vàng cho phần resilience: **Design for failure** — luôn giả định mọi component sẽ chết, và thiết kế để hệ thống vẫn sống. Khi phân vân giữa hai đáp án, chọn đáp án **loại bỏ SPOF** mà **không over-engineer** (đừng chọn Multi-Region khi đề chỉ cần Multi-AZ).
