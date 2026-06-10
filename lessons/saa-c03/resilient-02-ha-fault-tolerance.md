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

> ⚠️ Bẫy: Nếu đề chỉ yêu cầu "chịu được lỗi của một datacenter / một AZ" → **Multi-AZ là đủ**, đừng chọn Multi-Region (thừa, đắt, sai). Multi-Region chỉ khi đề nói rõ "survive an entire region outage", "global users", hoặc "regulatory DR requirement".

## 8. RTO & RPO (gắn với DR strategies)

- **RTO (Recovery Time Objective)**: thời gian tối đa chấp nhận được để **khôi phục dịch vụ** sau sự cố. RTO thấp = phục hồi nhanh.
- **RPO (Recovery Point Objective)**: lượng **dữ liệu** tối đa chấp nhận mất, đo bằng thời gian. RPO thấp = mất ít dữ liệu (cần replicate thường xuyên/liên tục).

```
   <---- RPO ---->  sự cố   <------ RTO ------>
[last good backup]  [crash]            [service restored]
   mất dữ liệu                  thời gian downtime
```

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
