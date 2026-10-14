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

**Vì sao RTO tính bằng giờ.** Lúc sự cố xảy ra, ở DR Region chưa có VPC, load balancer, server hay database nào. Bạn phải làm lần lượt ba việc, và cả ba đều tốn thời gian:

1. **Dựng lại hạ tầng.** Nếu hạ tầng được mô tả sẵn bằng **IaC** (Infrastructure as Code — hạ tầng viết thành file template, ví dụ **CloudFormation** hoặc Terraform) thì chỉ cần chạy template ở Region mới và chờ AWS tạo xong tài nguyên. Nếu trước giờ toàn bấm tay trên console thì phải nhớ lại và bấm lại từng thứ: chậm hơn nhiều và dễ sai. Đề thi coi "IaC + AMI đã copy sẵn sang DR Region" là cách làm đúng của chiến lược này.
2. **Restore dữ liệu.** Tạo database mới từ snapshot, tạo EBS volume từ snapshot. Thời gian tăng theo dung lượng: database càng lớn restore càng lâu.
3. **Chuyển traffic.** Đổi bản ghi DNS trỏ sang hạ tầng mới.

**Vì sao RPO phụ thuộc lịch backup.** Dữ liệu ghi sau bản backup cuối cùng là dữ liệu mất. Tính thử với lịch backup mỗi ngày một lần lúc 02:00:

```
Backup gần nhất:   02:00
Sự cố xảy ra:      23:00 cùng ngày
Dữ liệu mất:       23:00 − 02:00 = 21 giờ
Trường hợp xấu nhất (sự cố ngay trước lần backup kế tiếp): gần 24 giờ

→ Lịch backup 24 giờ/lần chỉ đáp ứng được RPO ≥ 24 giờ.
  Muốn RPO = 4 giờ thì phải backup ít nhất 4 giờ/lần (6 lần/ngày).
```

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
- **Chi phí:** Cao hơn Pilot Light, thấp hơn Active-Active: ngoài DB replica còn luôn trả tiền cho một cụm compute nhỏ chạy 24/7.
- **Dùng khi:** Business-critical, cần phục hồi nhanh nhưng chưa cần phục vụ traffic toàn phần ở cả hai bên.

### 4. Multi-Site Active-Active (Hot Standby)

Cả hai (hoặc nhiều) Region đều **chạy production đầy đủ và phục vụ traffic đồng thời**. Khi một Region chết, Region còn lại gánh toàn bộ tải — gần như không có downtime.

- **Hạ tầng ở DR Region:** Production đầy đủ, active, nhận traffic thật.
- **RTO:** Gần 0 (real-time failover).
- **RPO:** Gần 0.
- **Chi phí:** Cao nhất (chạy double infra + chi phí replicate hai chiều).
- **Dùng khi:** Yêu cầu near-zero downtime/data loss (tài chính, thanh toán, hệ thống global).

## Bảng so sánh tổng hợp (câu này hay ra thi)

Ký hiệu `$` → `$$$$` trong bảng và trong sơ đồ phía trên chỉ là **thứ hạng** chi phí, không phải số tiền. Cái cần nhớ là mỗi bậc **trả thêm tiền cho thứ gì** ở DR Region:

| Chiến lược | Ở DR Region bạn trả tiền cho |
|------------|------------------------------|
| Backup & Restore (`$`) | Chỉ dung lượng lưu backup |
| Pilot Light (`$$`) | Như trên + một database replica chạy 24/7 |
| Warm Standby (`$$$`) | Như trên + một cụm compute nhỏ chạy 24/7 |
| Active-Active (`$$$$`) | Một bản production đầy đủ thứ hai |

Tính thử với một hệ thống **giả định** (số tiền chỉ để minh hoạ tỉ lệ, không phải bảng giá AWS): production tốn 1.000 USD/tháng cho compute (10 server), 500 USD/tháng cho database, 50 USD/tháng cho lưu backup.

```
Production đang chạy: 1.000 + 500 = 1.500 USD/tháng (mốc 100%)

Backup & Restore:  50                              =    50 USD/tháng  (~3% production)
Pilot Light:       50 + 500 (DB replica)           =   550 USD/tháng  (~37%)
Warm Standby:      50 + 500 + 200 (2/10 server)    =   750 USD/tháng  (50%)
Active-Active:     500 + 1.000 (đủ 10 server)      = 1.500 USD/tháng  (100%, tức tổng chi gấp đôi)
```

Bước nhảy lớn nhất là từ Backup & Restore lên Pilot Light, vì database replica phải chạy liên tục. Phí truyền dữ liệu replicate giữa hai Region chưa tính ở đây và cộng thêm vào cả ba bậc trên.

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

**Vault là gì.** Mỗi bản backup mà AWS Backup tạo ra gọi là một *recovery point*, và nó được cất trong một **backup vault** — một "két" logic có khoá mã hoá (KMS key) và chính sách truy cập riêng. Cross-region copy thực chất là chép recovery point từ vault ở Region này sang vault ở Region khác.

**Backup Vault Lock** biến vault thành kho **WORM** (*write once, read many* — ghi một lần, đọc nhiều lần): recovery point đã vào vault thì **không ai xoá hay rút ngắn thời hạn lưu được** cho tới khi hết hạn. Bài toán nó giải quyết: kẻ tấn công ransomware (hoặc nhân viên có quyền admin) thường xoá backup trước rồi mới mã hoá dữ liệu, để nạn nhân hết đường khôi phục. Vault Lock có hai chế độ:

| Chế độ | Ai gỡ được khoá | Dùng khi |
|--------|------------------|----------|
| **Governance** | Người có đủ quyền IAM | Chống xoá nhầm, vẫn cần đường lui cho admin |
| **Compliance** | **Không ai**, kể cả root user và AWS, sau khi hết *grace time* | Quy định pháp lý bắt buộc dữ liệu bất biến |

*Grace time* là khoảng "suy nghĩ lại" ngay sau khi bật compliance mode, tối thiểu **3 ngày** (72 giờ). Trong thời gian đó còn gỡ hoặc sửa được khoá; hết thời gian đó thì vault bất biến vĩnh viễn.

> 🪤 **Bẫy:** Đề nói "backup không được phép bị xoá bởi bất kỳ ai, kể cả root" → **Vault Lock compliance mode**. Governance mode sai vì admin đủ quyền vẫn gỡ được. Đây cũng **không** phải S3 Object Lock (dành cho object trong S3) hay Glacier Vault Lock (dành cho S3 Glacier).

> 💡 **Mẹo thi:** Câu hỏi "centralized, automated backup across many services and accounts" → chọn **AWS Backup**, đừng tự dựng script snapshot thủ công.

### S3 Cross-Region Replication (CRR)
Tự động replicate object sang bucket ở Region khác (bất đồng bộ).

- Yêu cầu: **bật Versioning** ở cả source và destination bucket; cần IAM role cho phép replicate.
- Chỉ replicate object *mới* sau khi bật CRR (object cũ cần S3 Batch Replication).
- RPO thường vài phút (async), nhưng mặc định **không có cam kết** về thời gian: phần lớn object sang đích nhanh, nhưng object lớn hoặc lúc tải dồn có thể lâu hơn nhiều. Cần con số cam kết thì bật **S3 Replication Time Control (RTC)**: 99,9% object được replicate trong **15 phút**, có SLA và metric theo dõi (trả thêm phí).
- Phục vụ DR cho dữ liệu trên S3; cũng dùng cho compliance/latency.
- **SRR** (Same-Region Replication) dùng cho log aggregation/compliance trong cùng Region, không phải DR cross-region.

### Snapshot copy cross-region (EBS / RDS / Aurora)
Copy snapshot sang Region khác để khôi phục khi mất Region gốc. Có thể tự động hóa bằng **Amazon Data Lifecycle Manager (DLM)** cho EBS, hoặc AWS Backup.

- Là nền tảng cho **Backup & Restore** với RDS/EBS.

**Snapshot là gì và vì sao phải copy.** Snapshot là bản chụp dữ liệu của một EBS volume hoặc một database tại một thời điểm. Nó được lưu **trong chính Region tạo ra nó**, nên nếu cả Region đó sập thì snapshot cũng không truy cập được. Copy sang Region khác tạo ra một bản độc lập, restore được ngay tại đó. Lần copy đầu tiên sang một Region là bản **đầy đủ**; các lần sau chỉ chép phần thay đổi (*incremental*) nếu bản copy trước còn tồn tại và dùng cùng khoá mã hoá, nên nhanh và rẻ hơn.

**Snapshot mã hoá: vì sao phải chỉ định khoá mới.** Snapshot mã hoá được khoá bằng một **KMS key** (khoá mã hoá do dịch vụ AWS KMS quản lý; tài liệu cũ gọi khoá do bạn tự tạo là **CMK** — *customer master key*, nay gọi là *customer managed key*). KMS key **chỉ tồn tại trong Region tạo ra nó**: KMS ở `eu-west-1` không có và không dùng được khoá của `us-east-1`. Hệ quả:

```
Snapshot ở us-east-1, mã hoá bằng khoá K1 (chỉ có ở us-east-1)
        │  copy sang eu-west-1, chỉ định khoá K2 của eu-west-1
        ▼
AWS giải mã bằng K1, mã hoá lại bằng K2 (re-encrypt), lưu ở eu-west-1
→ Khi us-east-1 sập, bản copy vẫn restore được vì K2 nằm ở eu-west-1.
```

Nếu bản copy vẫn phụ thuộc K1 thì mất Region nguồn là mất luôn khả năng giải mã, tức backup vô dụng đúng lúc cần. Lựa chọn thay thế là **multi-Region key**: một khoá KMS được nhân bản sang nhiều Region với cùng key material, dùng được ở cả hai nơi.

> 🪤 **Bẫy:** Copy snapshot mã hoá cross-region mà không chỉ định KMS key ở Region đích → lệnh copy **lỗi**. Snapshot đã mã hoá thì bản copy cũng bắt buộc mã hoá; không có đường "copy ra bản không mã hoá".

### RDS Cross-Region Read Replica
Replica read-only ở Region khác, đồng bộ async từ primary.

- Khi thảm họa: **promote** replica thành standalone primary → trở thành DB chính ở DR Region.
- Phục vụ **Pilot Light** (DB luôn sống ở DR, compute tắt).
- RPO thấp (async, độ trễ replication); RTO = thời gian promote + chuyển traffic.

> ⚠️ **Bẫy:** Đừng nhầm **Multi-AZ** với DR cross-region. Multi-AZ là **High Availability trong cùng Region** (standby đồng bộ, tự failover khi AZ lỗi) — **không** bảo vệ khỏi mất cả Region. Multi-AZ standby **không** đọc được và **không** phục vụ DR khu vực. Khi đề nói "another Region" → cần Read Replica cross-region / Aurora Global Database, không phải Multi-AZ.

### Aurora Global Database
**Nó là gì.** Một database Aurora trải trên nhiều Region: **một primary Region** nhận mọi lệnh ghi, và các **secondary Region chỉ đọc** nhận bản sao. Ứng dụng ở châu Âu đọc từ cluster châu Âu với độ trễ nội vùng, còn khi primary Region sập thì một secondary được nâng lên làm primary.

**Vì sao nhanh hơn RDS cross-region read replica.** Khác biệt nằm ở *tầng nào* làm việc replicate:

- **RDS read replica** replicate ở tầng **database engine**. Primary ghi lại từng thay đổi vào log của engine (binlog của MySQL, WAL của PostgreSQL), gửi sang replica, và replica phải **chạy lại** các thay đổi đó bằng CPU của chính nó. Khi primary ghi dồn dập, replica chạy lại không kịp, độ trễ (*replication lag*) phình ra từ vài giây lên vài phút.
- **Aurora** tách compute khỏi storage: các DB instance chỉ xử lý query, còn dữ liệu nằm trong một *cluster volume* dùng chung. Global Database replicate ngay ở **tầng storage** đó qua hạ tầng riêng của AWS, không bắt DB instance làm thêm việc gì. Vì vậy primary gần như không chậm đi, và lag **thường dưới 1 giây** kể cả khi tải ghi lớn.

**Con số cần nhớ:**

| | Con số |
|--|--------|
| Số secondary Region | Tối đa **10** theo docs hiện tại (đề thi và tài liệu cũ: **5**) |
| Replication lag | Thường **dưới 1 giây** (bất đồng bộ) |
| RPO khi failover do sự cố | Tính bằng **giây**, đúng bằng lag tại thời điểm sập |
| RTO khi failover | Đề thi quen dùng **"dưới 1 phút"**; docs hiện tại viết thận trọng hơn là secondary nhận vai primary "trong vòng vài phút" |

**Hai thao tác đổi primary — tên dễ nhầm:**

| Thao tác | Dùng khi | Mất dữ liệu? | Cơ chế |
|----------|----------|--------------|--------|
| **Switchover** (tên cũ: *managed planned failover*) | Có kế hoạch, mọi Region đang khoẻ: diễn tập DR, bảo trì, chuyển primary về lại Region gốc | **Không** (RPO = 0) | Aurora **chờ** secondary đồng bộ xong với primary rồi mới đổi vai |
| **Failover** (*unplanned*) | Primary Region sập thật | **Có thể**, cỡ vài giây | **Không chờ** đồng bộ (primary đã chết, không còn gì để chờ); những gì chưa kịp replicate thì mất |

Cả hai đều **do bạn kích hoạt** (console, CLI hoặc tự động hoá riêng). Aurora Global Database không tự failover sang Region khác khi primary sập. Điểm này khác Multi-AZ, vốn tự failover trong cùng Region.

Ứng dụng nên kết nối qua **global writer endpoint**: địa chỉ này luôn trỏ tới primary hiện tại, nên sau khi đổi vai không phải sửa connection string.

- Là lựa chọn hàng đầu cho **Warm Standby / Active-Active** ở tầng relational DB toàn cầu.

> 🪤 **Bẫy:** Aurora Global Database **không phải multi-writer**. Chỉ primary Region ghi được; secondary chỉ đọc (có thể bật *write forwarding* để secondary chuyển tiếp lệnh ghi về primary, nhưng người ghi thật vẫn là primary). Cần ghi được ở mọi Region cùng lúc → DynamoDB Global Tables.

> 💡 **Mẹo thi:** Đề yêu cầu **relational DB**, **multi-region**, **RPO ~ 1s / RTO ~ 1 phút**, low-latency global reads → **Aurora Global Database** (không phải RDS read replica thường, vốn chậm hơn).

### DynamoDB Global Tables
Bảng DynamoDB **multi-region, multi-active** (active-active): mọi Region đều ghi/đọc được, replicate hai chiều với **last-writer-wins** để giải quyết xung đột.

- RPO/RTO gần như bằng 0 ở tầng NoSQL → trụ cột cho **Multi-Site Active-Active**.

**Cơ chế.** Mỗi Region có một *replica table* — một bảng DynamoDB đầy đủ, cùng tên, cùng schema. Ứng dụng ở Region nào ghi vào replica của Region đó; DynamoDB tự chép thay đổi sang mọi replica còn lại, **bất đồng bộ, thường trong khoảng 1 giây**. "Active-active" nghĩa là không có khái niệm primary: Region nào sập thì chỉ cần lái traffic sang Region khác, **không có bước promote** nào cả. Đó là lý do RTO gần bằng 0, còn RPO bằng đúng phần chưa kịp replicate (cỡ một vài giây).

**DynamoDB Streams để làm gì.** Streams là nhật ký ghi lại mọi thay đổi của từng item theo thứ tự. Global Tables **đọc nhật ký đó** ở mỗi replica rồi áp thay đổi sang các replica khác, tức Streams chính là đường ống replicate. Với phiên bản Global Tables hiện tại, Streams được **bật tự động** trên mọi replica và không tắt được; đề thi cũ diễn đạt là "phải bật DynamoDB Streams trước khi tạo global table".

**Last-writer-wins: hai Region cùng sửa một item thì sao?** Vì replicate bất đồng bộ, trong khoảng 1 giây đó hai Region có thể cùng ghi lên một item mà chưa biết về nhau. DynamoDB giải quyết bằng cách giữ lại bản ghi có **timestamp muộn hơn**, bản kia bị ghi đè **mà không báo lỗi cho ai**:

```
Item: cart#42, quantity = 1

10:00:00.100  Region us-east-1 ghi  quantity = 2
10:00:00.400  Region eu-west-1 ghi  quantity = 5   (chưa nhận được thay đổi của us-east-1)

Sau khi replicate xong, CẢ HAI Region đều có quantity = 5.
Bản ghi quantity = 2 biến mất; client ở us-east-1 vẫn nhận "ghi thành công".
```

Cả hai Region hội tụ về cùng một giá trị (không bị lệch nhau), nhưng một lần ghi đã mất. Với giỏ hàng thì chấp nhận được; với số dư tài khoản thì không. Cách tránh thường dùng là thiết kế để mỗi item chỉ được ghi ở **một Region "nhà"** (ví dụ theo vùng của user).

> 📏 Chế độ mặc định mô tả ở trên gọi là **MREC** (*multi-Region eventual consistency*). DynamoDB nay có thêm chế độ **MRSC** (*multi-Region strong consistency*): ghi được replicate **đồng bộ** sang ít nhất một Region khác trước khi trả về thành công, nên **RPO = 0**, đổi lại độ trễ ghi cao hơn và phải triển khai trên **đúng 3 Region**. Đề thi SAA-C03 mặc định hiểu Global Tables là kiểu bất đồng bộ, last-writer-wins.

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

## AWS Elastic Disaster Recovery (AWS DRS)

Service DR chuyên dụng, kế thừa CloudEndure Disaster Recovery. Cài agent lên server **nguồn**
(on-premises, VMware, hoặc EC2 ở cloud khác), agent **replicate liên tục ở mức block** sang một
**staging area** giá rẻ trong AWS — staging chỉ chạy instance nhỏ + EBS rẻ, nên chi phí lúc "chờ"
thấp hơn hẳn việc dựng sẵn cả hệ thống standby.

Khi có sự cố, DRS **launch instance thật** từ dữ liệu đã replicate. Đổi lại: RPO tính bằng **giây**,
RTO tính bằng **phút** — tốt hơn Backup & Restore nhiều mà không phải trả tiền cho Warm Standby
chạy 24/7.

| Đề mô tả | Chọn | Vì sao |
|---|---|---|
| DR cho server **on-premises** (kể cả SQL Server, app cũ) lên AWS, không muốn đổi kiến trúc | **Elastic Disaster Recovery** | Replicate block-level, không cần refactor, không cần bản sao chạy sẵn |
| **Di cư** một lần lên AWS rồi thôi | **Application Migration Service (MGN)** | Cùng gốc công nghệ nhưng dành cho migrate, không phải DR lặp lại |
| Chỉ cần khôi phục dữ liệu, chịu được hàng giờ | **AWS Backup** | Rẻ nhất, nhưng RTO/RPO kém xa |

> 🪤 Bẫy: đề nói "DR cho on-prem, RPO vài giây, không muốn trả tiền cho môi trường chạy sẵn"
> → **DRS**. Không phải Warm Standby (tốn tiền chạy sẵn), cũng không phải MGN (đó là để migrate).

## Ghép service vào từng chiến lược

| Chiến lược | Data tier điển hình | Traffic switch |
|------------|---------------------|----------------|
| Backup & Restore | AWS Backup, snapshot copy cross-region, S3 CRR | Tạo infra mới + đổi DNS thủ công |
| Pilot Light | RDS cross-region read replica (promote khi cần), DB luôn sống | Route 53 failover + start/scale compute |
| Warm Standby | Aurora Global Database, DynamoDB Global Tables | Route 53 failover, scale-up ASG |
| Multi-Site Active-Active | Aurora Global Database, DynamoDB Global Tables | Route 53 latency/weighted, cả hai Region active |

Hai hàng cuối dùng **cùng data tier**, vì dữ liệu ở cả hai chiến lược đều phải được replicate liên tục sang Region kia. Chỗ khác nhau nằm ở compute và traffic:

| | Warm Standby | Multi-Site Active-Active |
|--|--------------|--------------------------|
| Compute ở DR Region | Cụm nhỏ (vd 2/10 server), phải **scale up** khi failover | Đủ kích thước production, không cần scale |
| Traffic lúc bình thường | 100% vào primary; DR Region không phục vụ người dùng thật | Chia cho cả hai Region (latency/weighted) |
| Route 53 | **Failover** routing (primary/secondary) | **Latency** hoặc **weighted** routing |
| Aurora Global Database | Secondary chỉ chờ, promote khi sự cố | App ở Region phụ **đọc** tại chỗ, lệnh **ghi** vẫn về primary Region |
| DynamoDB Global Tables | Chỉ ghi ở một Region, replica kia để dự phòng | Ghi ở **cả hai** Region |

Lưu ý hệ quả từ hàng Aurora: với database quan hệ, "active-active" trên AWS thực chất là *đọc ở mọi nơi, ghi ở một nơi*. Khi primary Region sập vẫn phải failover Aurora (RTO cỡ một vài phút), nên RTO thật sự gần 0 cho cả đọc lẫn ghi chỉ đạt được với DynamoDB Global Tables.

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
