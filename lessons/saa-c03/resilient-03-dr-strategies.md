# Disaster Recovery Strategies

Disaster Recovery (DR) là khả năng khôi phục hệ thống sau một sự cố nghiêm trọng: mất cả một AWS Region, hỏng database, ransomware, hoặc lỗi vận hành xóa nhầm dữ liệu. Trong SAA-C03, đây là chủ đề "ăn điểm" của Domain 2, và gần như mọi câu hỏi đều xoay quanh hai con số: **RTO** và **RPO**, cân với **chi phí**.

## Hai chỉ số nền tảng: RTO & RPO

| Chỉ số | Viết tắt của | Trả lời câu hỏi | Đo bằng |
|--------|--------------|-----------------|---------|
| **RTO** | Recovery Time Objective | "Hệ thống được phép *down* bao lâu trước khi phục hồi xong?" | Thời gian |
| **RPO** | Recovery Point Objective | "Được phép *mất bao nhiêu dữ liệu* (tính theo thời gian)?" | Thời gian |

- **RPO = 1 giờ** nghĩa là sau thảm họa, bạn chấp nhận mất tối đa 1 giờ dữ liệu gần nhất → cần backup/replicate ít nhất mỗi giờ.
- **RTO = 4 giờ** nghĩa là từ lúc sự cố đến lúc hệ thống chạy lại không quá 4 giờ.

> 💡 **Mẹo thi:** RTO gắn với *thời gian khôi phục* (downtime), RPO gắn với *điểm dữ liệu* (data loss). Đề hay đảo hai khái niệm này để gài bẫy. Nhớ: **R-P-O = Point = dữ liệu**, **R-T-O = Time = downtime**.

RTO/RPO càng nhỏ → chi phí càng lớn. Toàn bộ bài học này là bài toán đánh đổi giữa "nhanh + không mất dữ liệu" và "rẻ".

## 4 chiến lược DR (từ rẻ/chậm đến đắt/nhanh)

AWS định nghĩa 4 cấp độ. Hãy hình dung một thanh trượt: bên trái rẻ nhưng RTO/RPO cao, bên phải đắt nhưng RTO/RPO gần bằng 0.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Thang 4 chiến lược DR — chi phí tăng dần, RTO/RPO giảm dần</title>
  <desc>Bốn cột song song từ trái sang phải: Backup và Restore, Pilot Light, Warm Standby, Multi-Site Active-Active. Sang phải thì chi phí tăng dần và RTO/RPO giảm dần; trạng thái compute ở DR region lần lượt là không có, tắt, chạy nhỏ, chạy đầy đủ active.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">4 chiến lược DR — trượt từ rẻ/chậm sang đắt/nhanh</text>

  <g>
    <rect x="16" y="44" width="160" height="150" rx="10" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="96" y="66" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Backup &amp; Restore</text>
    <rect x="36" y="78" width="120" height="22" rx="11" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="96" y="93" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">DR compute: không có</text>
    <text x="96" y="120" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.75">RTO/RPO: giờ</text>
    <text x="96" y="138" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.75">Chi phí: $</text>
    <text x="96" y="170" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">chỉ backup ở S3/snapshot</text>
  </g>
  <g>
    <rect x="192" y="44" width="160" height="150" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="272" y="66" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Pilot Light</text>
    <rect x="212" y="78" width="120" height="22" rx="11" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="272" y="93" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">DR compute: tắt</text>
    <text x="272" y="120" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.75">RTO: 10–30 phút</text>
    <text x="272" y="138" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.75">Chi phí: $$</text>
    <text x="272" y="170" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">DB replicate, compute off</text>
  </g>
  <g>
    <rect x="368" y="44" width="160" height="150" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="448" y="66" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Warm Standby</text>
    <rect x="388" y="78" width="120" height="22" rx="11" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="448" y="93" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">DR compute: chạy nhỏ</text>
    <text x="448" y="120" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.75">RTO: vài phút</text>
    <text x="448" y="138" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.75">Chi phí: $$$</text>
    <text x="448" y="170" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">scaled-down, fully functional</text>
  </g>
  <g>
    <rect x="544" y="44" width="160" height="150" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="624" y="66" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Multi-Site Active</text>
    <rect x="564" y="78" width="120" height="22" rx="11" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="624" y="93" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">DR compute: đầy đủ, active</text>
    <text x="624" y="120" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.75">RTO/RPO: ~ 0</text>
    <text x="624" y="138" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.75">Chi phí: $$$$</text>
    <text x="624" y="170" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">cả 2 region nhận traffic</text>
  </g>

  <g stroke="currentColor" stroke-opacity="0.4" fill="none">
    <line x1="176" y1="119" x2="192" y2="119" marker-end="url(#drArr)"/>
    <line x1="352" y1="119" x2="368" y2="119" marker-end="url(#drArr)"/>
    <line x1="528" y1="119" x2="544" y2="119" marker-end="url(#drArr)"/>
  </g>
  <defs>
    <marker id="drArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>

  <line x1="16" y1="240" x2="704" y2="240" stroke="currentColor" stroke-opacity="0.35" marker-end="url(#drArr)"/>
  <text x="16" y="232" font-size="11" fill="currentColor" opacity="0.8">Chi phí tăng dần →</text>
  <line x1="704" y1="276" x2="16" y2="276" stroke="currentColor" stroke-opacity="0.35" marker-end="url(#drArr)"/>
  <text x="704" y="268" font-size="11" text-anchor="end" fill="currentColor" opacity="0.8">← RTO/RPO giảm dần</text>

  <text x="16" y="312" font-size="11" fill="currentColor" opacity="0.7">Trái: rẻ nhất, RTO/RPO cao (giờ) — DR region gần như trống.</text>
  <text x="16" y="332" font-size="11" fill="currentColor" opacity="0.7">Phải: đắt nhất, RTO/RPO ~ 0 — DR region chạy production thật.</text>
</svg>

### 1. Backup & Restore

Chỉ sao lưu dữ liệu sang Region khác. Khi thảm họa xảy ra mới *tạo mới* toàn bộ hạ tầng (provision infra) rồi restore dữ liệu.

- **Hạ tầng ở DR Region:** Không có gì chạy sẵn (chỉ có backup nằm trong S3/snapshot).
- **RTO:** Cao — hàng giờ (phải dựng infra + restore).
- **RPO:** Phụ thuộc tần suất backup (vài giờ tùy lịch).
- **Chi phí:** Thấp nhất — chỉ trả tiền lưu trữ backup.
- **Dùng khi:** Hệ thống không tối quan trọng, ngân sách hạn chế, chấp nhận downtime vài giờ.

**Công cụ:** AWS Backup, EBS/RDS snapshot copy cross-region, S3 + CRR, AMI copy.

### 2. Pilot Light

Một phần *lõi tối thiểu* luôn chạy ở DR Region — thường là **database được replicate liên tục**. Phần compute (EC2/ASG) đã chuẩn bị sẵn (AMI, launch template) nhưng **tắt hoặc scale = 0**. Khi cần, "bật lửa" lên (scale up compute, đổi DNS).

- **Hạ tầng ở DR Region:** DB chạy & đồng bộ; compute *tắt*, chỉ chờ khởi động.
- **RTO:** Hàng chục phút (chỉ cần start/scale compute).
- **RPO:** Thấp (DB replicate gần như realtime).
- **Chi phí:** Trung bình-thấp (trả tiền DB replica + storage, không trả compute).
- **Dùng khi:** Cần phục hồi nhanh hơn Backup & Restore nhưng vẫn tiết kiệm compute.

> ⚠️ **Bẫy:** Điểm phân biệt cốt lõi giữa Pilot Light và Warm Standby là **compute**. Pilot Light: compute *không chạy* (off). Warm Standby: compute *chạy ở quy mô nhỏ* (scaled-down nhưng đang phục vụ được). Đề thường mô tả "a scaled-down but fully functional copy is always running" → đó là **Warm Standby**, không phải Pilot Light.

### 3. Warm Standby

Một bản sao *thu nhỏ nhưng đầy đủ chức năng* của production luôn chạy ở DR Region. Nó có thể nhận traffic ngay (dù ở quy mô nhỏ), khi thảm họa thì **scale up** lên kích thước production.

- **Hạ tầng ở DR Region:** Chạy đầy đủ thành phần nhưng size nhỏ (vd ASG min=1).
- **RTO:** Vài phút (chỉ scale up + chuyển traffic).
- **RPO:** Rất thấp (gần realtime).
- **Chi phí:** Cao (luôn trả tiền compute đang chạy).
- **Dùng khi:** Business-critical, cần phục hồi nhanh nhưng chưa cần phục vụ traffic toàn phần ở cả hai bên.

### 4. Multi-Site Active-Active (Hot Standby)

Cả hai (hoặc nhiều) Region đều **chạy production đầy đủ và phục vụ traffic đồng thời**. Khi một Region chết, Region còn lại gánh toàn bộ tải — gần như không có downtime.

- **Hạ tầng ở DR Region:** Production đầy đủ, active, nhận traffic thật.
- **RTO:** Gần 0 (real-time failover).
- **RPO:** Gần 0.
- **Chi phí:** Cao nhất (chạy double infra + chi phí replicate hai chiều).
- **Dùng khi:** Yêu cầu near-zero downtime/data loss (tài chính, thanh toán, hệ thống global).

## Bảng so sánh tổng hợp (câu này hay ra thi)

| Chiến lược | Compute ở DR | RTO | RPO | Chi phí | Câu chốt nhận diện |
|------------|--------------|-----|-----|---------|--------------------|
| **Backup & Restore** | Không có | Giờ | Giờ | $ (thấp nhất) | "lowest cost", "restore from backup" |
| **Pilot Light** | Tắt (off) | 10–30 phút | Phút | $$ | "core/minimal running", "data replicated, servers off" |
| **Warm Standby** | Chạy nhỏ (scaled-down) | Phút | Giây–phút | $$$ | "scaled-down but fully functional", "always running" |
| **Multi-Site Active-Active** | Chạy đầy đủ, active | ~0 (giây) | ~0 | $$$$ (cao nhất) | "near-zero RTO/RPO", "both regions serve traffic" |

> 💡 **Mẹo thi — quy tắc chọn nhanh:**
> - Đề nhấn **"lowest cost" / "cost-effective"** + RTO cho phép tính bằng giờ → **Backup & Restore**.
> - Đề yêu cầu **RTO/RPO gần 0**, không quan tâm giá → **Multi-Site Active-Active**.
> - "Minimize cost *while* recovering in minutes" → thường là **Pilot Light** hoặc **Warm Standby**; phân biệt bằng việc compute có đang chạy hay không.

## Các AWS service phục vụ DR

### AWS Backup
Dịch vụ quản lý backup tập trung cho nhiều service (EBS, EFS, RDS, Aurora, DynamoDB, EC2, FSx, Storage Gateway, S3...). Hỗ trợ **backup policy/plan**, lịch tự động, lifecycle (chuyển cold storage), và **cross-region copy** + **cross-account copy** cho DR.

- Lựa chọn chính cho chiến lược **Backup & Restore** ở quy mô tổ chức.
- **Backup Vault Lock** (WORM) bảo vệ backup khỏi bị xóa — chống ransomware/insider, đáp ứng compliance.

> 💡 **Mẹo thi:** Câu hỏi "centralized, automated backup across many services and accounts" → chọn **AWS Backup**, đừng tự dựng script snapshot thủ công.

### S3 Cross-Region Replication (CRR)
Tự động replicate object sang bucket ở Region khác (bất đồng bộ).

- Yêu cầu: **bật Versioning** ở cả source và destination bucket; cần IAM role cho phép replicate.
- Chỉ replicate object *mới* sau khi bật CRR (object cũ cần S3 Batch Replication).
- RPO thường vài phút (async). Phục vụ DR cho dữ liệu trên S3; cũng dùng cho compliance/latency.
- **SRR** (Same-Region Replication) dùng cho log aggregation/compliance trong cùng Region, không phải DR cross-region.

### Snapshot copy cross-region (EBS / RDS / Aurora)
Copy snapshot sang Region khác để khôi phục khi mất Region gốc. Có thể tự động hóa bằng **Amazon Data Lifecycle Manager (DLM)** cho EBS, hoặc AWS Backup.

- Snapshot mã hóa: cần xử lý KMS key ở Region đích (re-encrypt với CMK của Region đích).
- Là nền tảng cho **Backup & Restore** với RDS/EBS.

### RDS Cross-Region Read Replica
Replica read-only ở Region khác, đồng bộ async từ primary.

- Khi thảm họa: **promote** replica thành standalone primary → trở thành DB chính ở DR Region.
- Phục vụ **Pilot Light** (DB luôn sống ở DR, compute tắt).
- RPO thấp (async, độ trễ replication); RTO = thời gian promote + chuyển traffic.

> ⚠️ **Bẫy:** Đừng nhầm **Multi-AZ** với DR cross-region. Multi-AZ là **High Availability trong cùng Region** (standby đồng bộ, tự failover khi AZ lỗi) — **không** bảo vệ khỏi mất cả Region. Multi-AZ standby **không** đọc được và **không** phục vụ DR khu vực. Khi đề nói "another Region" → cần Read Replica cross-region / Aurora Global Database, không phải Multi-AZ.

### Aurora Global Database
Một database Aurora trải trên tối đa 5–6 secondary Region, replicate qua hạ tầng storage chuyên dụng (không qua replication logic của DB).

- **RPO ~ 1 giây**, **RTO < 1 phút** cho cross-region failover — nhanh hơn nhiều so với RDS cross-region read replica.
- Replication lag điển hình < 1 giây; hỗ trợ **managed planned failover** và **unplanned failover** (promote secondary).
- Là lựa chọn hàng đầu cho **Warm Standby / Active-Active** ở tầng relational DB toàn cầu.

> 💡 **Mẹo thi:** Đề yêu cầu **relational DB**, **multi-region**, **RPO ~ 1s / RTO ~ 1 phút**, low-latency global reads → **Aurora Global Database** (không phải RDS read replica thường, vốn chậm hơn).

### DynamoDB Global Tables
Bảng DynamoDB **multi-region, multi-active** (active-active): mọi Region đều ghi/đọc được, replicate hai chiều với **last-writer-wins** để giải quyết xung đột.

- RPO/RTO gần như bằng 0 ở tầng NoSQL → trụ cột cho **Multi-Site Active-Active**.
- Yêu cầu bật **DynamoDB Streams**.

> 💡 **Mẹo thi:** "NoSQL key-value, multi-region, active-active, low latency global" → **DynamoDB Global Tables**. Ghép cặp tự nhiên với Aurora Global Database cho phần relational.

### Route 53 cho DR (DNS failover)
Route 53 là "công tắc traffic" chuyển hướng người dùng từ Region hỏng sang Region khỏe.

| Routing policy | Dùng cho DR khi | 
|----------------|-----------------|
| **Failover** | Primary/Secondary rõ ràng: khỏe thì gửi vào primary, primary fail thì sang secondary. Cần **health check**. |
| **Weighted** | Chia tải / canary / active-active có tỉ trọng. |
| **Latency-based** | Active-active, định tuyến theo Region gần nhất. |
| **Geolocation/Geoproximity** | Định tuyến theo vị trí địa lý người dùng. |

- **Health check** + **Failover routing** là tổ hợp kinh điển để tự động chuyển sang DR Region.
- Lưu ý **DNS TTL**: TTL cao làm chậm failover (client cache bản ghi cũ) → đặt TTL thấp (vd 60s) cho bản ghi DR.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Route 53 Failover sang DR region</title>
  <desc>app.example.com trong Route 53 với failover routing: bản ghi Primary trỏ tới ALB us-east-1 có health check HTTP 200; khi primary unhealthy, Route 53 chuyển traffic sang bản ghi Secondary trỏ tới ALB eu-west-1 ở region khác.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">Route 53 Failover sang DR region</text>

  <defs>
    <marker id="r53Arr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>

  <g>
    <rect x="24" y="110" width="170" height="64" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="109" y="138" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Route 53</text>
    <text x="109" y="157" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">app.example.com</text>
  </g>

  <g>
    <rect x="430" y="44" width="266" height="66" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <rect x="446" y="56" width="64" height="20" rx="10" fill="#10b981" fill-opacity="0.9"/>
    <text x="478" y="70" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">Primary</text>
    <text x="520" y="71" font-size="11.5" font-weight="700" fill="currentColor">ALB · us-east-1</text>
    <text x="446" y="95" font-size="10.5" fill="currentColor" opacity="0.78">health check: HTTP 200 / — khỏe</text>
  </g>

  <g>
    <rect x="430" y="160" width="266" height="66" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <rect x="446" y="172" width="78" height="20" rx="10" fill="#f59e0b" fill-opacity="0.9"/>
    <text x="485" y="186" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">Secondary</text>
    <text x="534" y="187" font-size="11.5" font-weight="700" fill="currentColor">ALB · eu-west-1</text>
    <text x="446" y="211" font-size="10.5" fill="currentColor" opacity="0.78">kích hoạt khi primary unhealthy</text>
  </g>

  <g fill="none">
    <path d="M194 134 C 320 120, 340 90, 430 80" stroke="#10b981" stroke-opacity="0.7" stroke-width="2" marker-end="url(#r53Arr)"/>
    <path d="M194 150 C 320 175, 340 200, 430 193" stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="5 4" marker-end="url(#r53Arr)"/>
  </g>
  <text x="300" y="96" font-size="10.5" fill="#10b981" opacity="0.95" font-weight="700">khỏe → primary</text>
  <text x="300" y="216" font-size="10.5" fill="currentColor" opacity="0.7">unhealthy → secondary</text>

  <text x="24" y="264" font-size="11" fill="currentColor" opacity="0.7">Thiếu health check ở primary → Route 53 không biết primary chết → không failover.</text>
  <text x="24" y="284" font-size="11" fill="currentColor" opacity="0.7">TTL thấp (vd 60s) → client cập nhật bản ghi mới nhanh, failover nhanh.</text>
</svg>

> ⚠️ **Bẫy:** Để Route 53 failover hoạt động, phải gắn **health check** vào primary record. Thiếu health check → Route 53 không biết primary chết → không chuyển. Ngoài ra **TTL cao** là thủ phạm khiến failover "chậm bất thường" trong đề.

## Ghép service vào từng chiến lược

| Chiến lược | Data tier điển hình | Traffic switch |
|------------|---------------------|----------------|
| Backup & Restore | AWS Backup, snapshot copy cross-region, S3 CRR | Tạo infra mới + đổi DNS thủ công |
| Pilot Light | RDS cross-region read replica (promote khi cần), DB luôn sống | Route 53 failover + start/scale compute |
| Warm Standby | Aurora Global Database, DynamoDB Global Tables | Route 53 failover, scale-up ASG |
| Multi-Site Active-Active | Aurora Global Database, DynamoDB Global Tables | Route 53 latency/weighted, cả hai Region active |

## Tình huống ra quyết định (giống đề thi)

**Tình huống 1 — Ngân sách thấp, downtime chấp nhận được.**
*"Một ứng dụng nội bộ, có thể chịu downtime tối đa 6 giờ và mất tối đa 4 giờ dữ liệu. Yêu cầu chi phí thấp nhất."*
→ RTO/RPO tính bằng giờ + "lowest cost" = **Backup & Restore** (AWS Backup cross-region + snapshot copy).

**Tình huống 2 — Cần phục hồi nhanh nhưng không muốn trả compute 24/7.**
*"E-commerce cần phục hồi trong ~20 phút, DB không được mất dữ liệu đáng kể, nhưng muốn tối ưu chi phí compute."*
→ DB replicate liên tục, compute tắt = **Pilot Light** (RDS/Aurora cross-region replica + ASG=0, Route 53 failover).

**Tình huống 3 — RTO vài phút, RPO vài giây.**
*"Hệ thống quan trọng, cần khôi phục trong vài phút, một bản sao thu nhỏ nhưng đầy đủ chức năng luôn chạy."*
→ Từ khóa "scaled-down but fully functional, always running" = **Warm Standby** (Aurora Global Database + ASG quy mô nhỏ).

**Tình huống 4 — Near-zero downtime, người dùng toàn cầu.**
*"Ứng dụng global yêu cầu near-zero RTO và RPO, phục vụ traffic từ nhiều Region đồng thời."*
→ **Multi-Site Active-Active** (DynamoDB Global Tables + Aurora Global Database + Route 53 latency-based).

## Tổng hợp các bẫy thường gặp

> ⚠️ **Bẫy 1:** Đảo RTO ↔ RPO. RPO = data loss, RTO = downtime.

> ⚠️ **Bẫy 2:** Multi-AZ ≠ DR. Multi-AZ là HA trong *một* Region; không bảo vệ khi mất Region. DR cần cross-region.

> ⚠️ **Bẫy 3:** Lẫn lộn Pilot Light vs Warm Standby — phân biệt ở chỗ compute có đang *chạy phục vụ được* hay không.

> ⚠️ **Bẫy 4:** Quên điều kiện của S3 CRR: phải bật **Versioning** hai bên; CRR không tự copy object cũ.

> ⚠️ **Bẫy 5:** Route 53 failover mà thiếu **health check** hoặc đặt **TTL cao** → failover không/chậm hoạt động.

> ⚠️ **Bẫy 6:** RDS cross-region read replica RPO/RTO chậm hơn **Aurora Global Database**. Đề đòi RPO ~1s / RTO ~1 phút cho relational → chọn Aurora Global Database.

> ⚠️ **Bẫy 7:** Chọn giải pháp đắt hơn yêu cầu. Nếu RTO/RPO cho phép hàng giờ mà đề nhấn "cost-effective", Active-Active là **sai** vì lãng phí — chọn Backup & Restore.

## Tóm tắt nhanh trước khi thi

- Luôn map **RTO/RPO + ngân sách** → 1 trong 4 chiến lược.
- Thang chi phí/tốc độ: Backup & Restore < Pilot Light < Warm Standby < Active-Active.
- **AWS Backup** = backup tập trung, đa service, cross-region/cross-account.
- **S3 CRR** = cần Versioning; **snapshot copy cross-region** cho EBS/RDS.
- **RDS cross-region read replica** (promote) = Pilot Light; **Aurora Global Database** = RPO~1s/RTO~1min cho relational.
- **DynamoDB Global Tables** = active-active NoSQL, RPO/RTO ~ 0.
- **Route 53 Failover + health check** = chuyển traffic sang DR Region; TTL thấp để failover nhanh.
