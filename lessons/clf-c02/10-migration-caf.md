# Bài 10 — Migration to AWS & Cloud Adoption Framework (CAF)

> Map exam: **CLF-C02 Task 1.3 — Understand the benefits of and strategies for migration to the AWS Cloud**.
> **Đây là task MỚI thêm vào CLF-C02 so với CLF-C01** → tỷ lệ ra đề cao.

## 1. Mục tiêu
Sau bài này bạn có thể:
- Liệt kê **6 perspectives** của AWS CAF + 1 câu mục đích mỗi cái.
- Phân biệt **7 R's migration strategies** với use case rõ.
- Chọn đúng **AWS migration service** theo từng phase: Discovery → Mobilize → Migrate.
- Phân biệt **Snowcone / Snowball Edge / Snowmobile** theo dung lượng.
- Hiểu khi nào dùng **DMS** vs **SCT** vs **MGN** vs **Transfer Family**.

---

## 2. Lý thuyết

### 2.0 Analogy — Migration như chuyển nhà

Tưởng tượng bạn chuyển từ căn nhà cũ (on-prem datacenter) sang nhà mới (AWS):

| Tình huống chuyển nhà | Migration strategy | AWS service |
|------------------------|--------------------|-------------|
| Đóng tất cả vào thùng, chở qua | **Rehost** (lift-and-shift) | **MGN** (Application Migration Service) |
| Vứt giường cũ, mua giường mới nhưng giữ phòng | **Replatform** | DMS đổi DB engine |
| Bỏ luôn xe cũ, mua Grab | **Repurchase** (drop & shop) | Mua SaaS |
| Phá nhà cũ, xây nhà thông minh | **Refactor / Re-architect** | Lambda + DynamoDB |
| Bỏ luôn căn phòng không dùng | **Retire** | — |
| Giữ lại căn nhà cũ chưa chuyển | **Retain** | — |
| Chuyển nguyên căn villa modular | **Relocate** | VMware Cloud on AWS |

**Quan trọng**: hầu hết enterprise migrate **dùng kết hợp nhiều R**, không chỉ 1 chiến lược.

---

### 2.0.1 Câu chuyện — Ngân hàng VN migrate 1500 server lên AWS

Năm 2024, 1 ngân hàng VN có 1500 server on-prem trong 2 datacenter cũ:
- 200 server chạy core banking → **Retain** (compliance đòi on-prem 3 năm nữa).
- 100 server CRM cũ → **Repurchase** → bỏ, dùng Salesforce.
- 300 server file share Windows → **Replatform** → Amazon FSx for Windows.
- 600 server web/app Linux → **Rehost** với MGN, chuyển nguyên lên EC2.
- 200 server DB Oracle cũ → **Refactor** sang Aurora PostgreSQL bằng SCT + DMS.
- 100 server VMware → **Relocate** sang VMware Cloud on AWS.

Tổng dự án: 18 tháng, 1500 server → 800 EC2 + 50 RDS + 20 Lambda. Cost giảm ~30%, time-to-market tăng 4x.

→ Migration **không phải all-or-nothing**. Đề CLF có thể cho 1 tình huống cụ thể hỏi "which R", phải đọc keyword kỹ.

---

### 2.1 AWS Cloud Adoption Framework (CAF) — 6 Perspectives

CAF là **framework chiến lược** giúp tổ chức chuyển đổi sang cloud. Có **6 perspectives** chia 2 nhóm:

**Business capabilities** (3) — về tổ chức / con người / quy trình:
| Perspective | Stakeholder | Câu hỏi cốt lõi |
|--------------|-------------|------------------|
| **Business** | CFO, CIO | Cloud có align với business outcome không? Đo bằng KPI nào? |
| **People** | HR, COO, đào tạo | Đội ngũ có kỹ năng cloud chưa? Văn hoá có sẵn sàng đổi không? |
| **Governance** | CIO, Risk, Finance | Quản lý risk, compliance, portfolio cloud như nào? |

**Technical capabilities** (3) — về kỹ thuật:
| Perspective | Stakeholder | Câu hỏi cốt lõi |
|--------------|-------------|------------------|
| **Platform** | CTO, kiến trúc sư | Hạ tầng + architecture nào để deliver workload? |
| **Security** | CISO, compliance | Bảo vệ asset cloud bằng cách nào? |
| **Operations** | Head of Ops, SRE | Vận hành workload + đảm bảo SLA bằng cách nào? |

**Mẹo nhớ**: **B-P-G** (Business) — **P-S-O** (Tech). Hoặc câu: *"Business Người Quản — Platform Security Op"*.

**Benefits của CAF** (đề hỏi nguyên văn):
- **Reduced business risk**.
- **Improved environmental, social, and governance (ESG) performance**.
- **Increased revenue**.
- **Increased operational efficiency**.

---

### 2.2 7 R's Migration Strategies (cốt lõi của task 1.3)

Từ CLF-C01 chỉ có 6 R, AWS chính thức nâng lên **7 R** từ 2022:

| # | Strategy | Một câu | Ví dụ | AWS tool |
|---|----------|---------|-------|----------|
| 1 | **Rehost** ("lift-and-shift") | Chuyển nguyên VM lên EC2, không đổi gì | VMware → EC2 | **MGN** (Application Migration Service) |
| 2 | **Replatform** ("lift-tinker-shift") | Đổi vài component, giữ kiến trúc | MySQL self-host → RDS MySQL | DMS, Elastic Beanstalk |
| 3 | **Repurchase** ("drop-and-shop") | Bỏ self-host, mua SaaS | CRM tự code → Salesforce | AWS Marketplace |
| 4 | **Refactor / Re-architect** | Viết lại theo cloud-native | Monolith → Lambda + DynamoDB | Lambda, ECS, Step Functions |
| 5 | **Retire** | Workload không dùng → bỏ | App nội bộ 5 năm không ai login | Application Discovery Service (phát hiện) |
| 6 | **Retain** ("revisit") | Tạm giữ on-prem | Mainframe compliance giữ 3 năm | — |
| 7 | **Relocate** | Chuyển hypervisor giữ nguyên | VMware on-prem → VMware Cloud on AWS | VMware Cloud on AWS |

**Phân biệt nhanh khi đọc đề**:
- "no code change, fastest migration" → **Rehost**.
- "change DB engine but keep app" → **Replatform**.
- "switch to SaaS / abandon self-build" → **Repurchase**.
- "rewrite app to use Lambda / microservices" → **Refactor**.
- "decommission unused app" → **Retire**.
- "compliance requires on-prem" → **Retain**.
- "VMware to VMware Cloud on AWS" → **Relocate**.

**Trade-off**:
- Rehost = nhanh, ít risk, **ít benefit** cloud nhất.
- Refactor = chậm, nhiều risk, **nhiều benefit** cloud nhất (serverless, scale).
- Đa số enterprise bắt đầu bằng Rehost rồi dần Refactor.

---

### 2.3 Migration phases (3 phase chính)

```
┌─────────────┐    ┌──────────┐    ┌──────────────────┐
│  Assess     │ ─▶ │ Mobilize │ ─▶ │ Migrate &        │
│ (Discovery) │    │ (Plan)   │    │ Modernize        │
└─────────────┘    └──────────┘    └──────────────────┘
```

#### Phase 1 — Assess
- **AWS Application Discovery Service** — agent + agentless, scan on-prem → inventory server, dependency.
- **Migration Evaluator** (formerly TSO Logic) — TCO calculator + business case.
- **AWS Migration Hub** — dashboard tổng hợp tiến độ migration toàn portfolio.

#### Phase 2 — Mobilize
- Setup **Landing Zone** (AWS Control Tower) — multi-account best practice.
- Train team, build foundation (network, IAM, logging).

#### Phase 3 — Migrate & Modernize
- **AWS Application Migration Service (MGN)** — rehost server (VMware, physical, cloud khác) lên EC2.
- **AWS Database Migration Service (DMS)** — migrate DB nguồn → đích, kể cả live (CDC).
- **AWS Schema Conversion Tool (SCT)** — đổi schema giữa DB engine (Oracle → PostgreSQL).
- **AWS Snow Family** — transfer data dung lượng lớn offline.
- **AWS DataSync** — sync data online (NFS / SMB / S3 / EFS / FSx).
- **AWS Transfer Family** — managed SFTP / FTPS / FTP / AS2 → vào S3 / EFS.

---

### 2.4 AWS Snow Family (offline data transfer)

Khi data quá lớn để chuyển qua Internet (TB → PB), AWS gửi thiết bị vật lý đến site bạn.

| Thiết bị | Capacity | Dùng cho |
|----------|----------|----------|
| **Snowcone** | 8 TB HDD / 14 TB SSD | Edge compute nhỏ, IoT, môi trường khắc nghiệt; nặng 2.1 kg |
| **Snowball Edge Storage Optimized** | 80 TB | Migration data center, có 40 vCPU compute |
| **Snowball Edge Compute Optimized** | 42 TB + GPU | Edge ML inference, video |
| **Snowmobile** | **100 PB** | Datacenter cả tòa nhà; xe container 14m, có security guard + GPS |

**Quy trình**:
1. Order qua console → AWS gửi thiết bị.
2. Copy data → ship lại AWS → AWS upload vào S3.
3. **Mã hoá AES-256** mọi data, key qua KMS, thiết bị có tamper-resistant.

**Snowmobile** đã bị AWS deprecate (announced retiring) — nhưng vẫn có thể xuất hiện trong đề CLF v1.0.

---

### 2.5 Các migration tool khác

| Tool | Mục đích | Use case |
|------|---------|----------|
| **AWS Application Migration Service (MGN)** | Rehost server live (block-level replication) | Lift-and-shift hàng trăm VM trong tuần |
| **AWS Database Migration Service (DMS)** | Migrate DB (same engine or different), live CDC | MySQL on-prem → RDS MySQL, hoặc Oracle → Aurora PG |
| **AWS Schema Conversion Tool (SCT)** | Convert schema + stored proc giữa DB engine khác nhau | Oracle PL/SQL → PostgreSQL PL/pgSQL |
| **AWS DataSync** | Sync file online, có scheduling | NFS → S3 lặp đi lặp lại |
| **AWS Transfer Family** | Managed SFTP/FTPS/FTP/AS2 endpoint | Partner upload file SFTP → S3 |
| **AWS Elastic Disaster Recovery (DRS)** | DR + migrate (block-level) | Continuous replication on-prem → AWS, failover khi cần |
| **AWS Migration Hub** | Dashboard tổng hợp progress | Theo dõi 200 server đang migrate |
| **AWS Application Discovery Service** | Inventory + dependency map on-prem | Trước khi migrate cần biết gì có |
| **Migration Evaluator** | TCO calculator | Business case cho CFO |
| **Migration Hub Refactor Spaces** | Strangler-fig pattern (refactor incrementally) | Migrate monolith → microservices |

**Phân biệt MGN vs DRS**:
- **MGN** = **migrate 1 lần** (cutover xong là xong).
- **DRS** = **continuous replication** cho DR (luôn sẵn sàng failover).
- Cùng tech base (CloudEndure cũ), khác mục đích.

---

### 2.6 Migration Acceleration Program (MAP)

**MAP** là **chương trình AWS Pro Services + funding** giúp khách hàng enterprise migrate:
- 3 phase: Assess → Mobilize → Migrate & Modernize.
- AWS có thể fund 1 phần (rebate) khi cam kết migrate spending nhất định.
- Đi kèm AWS Pro Services + partner.
- Đề CLF có thể hỏi "what is MAP" → biết là chương trình funding + dịch vụ migration.

---

### 2.7 Hybrid & Edge cho migration

Workload chưa migrate hết → cần **hybrid** kết nối on-prem + AWS:

| Service | Mục đích |
|---------|----------|
| **AWS Outposts** | Rack AWS đặt on-prem, chạy như mini-region |
| **AWS Local Zones** | Mini-region gần metro (LA, Boston) |
| **AWS Wavelength** | Compute trong mạng 5G telco |
| **VMware Cloud on AWS** | Chạy VMware stack trên AWS hardware |
| **AWS Direct Connect** | Đường truyền dedicated on-prem ↔ AWS |
| **AWS Site-to-Site VPN** | VPN qua Internet |
| **AWS Storage Gateway** | NFS/SMB gateway cache, đẩy data lên S3 |

---

## 3. Hands-on có account

### Lab 1 — Application Discovery Service (30 phút)
1. Console → **Migration Hub** → **Discover** → **Discovery connector**.
2. Download **AWS Discovery Agent** (chạy được trên Linux/Windows). Cài lên 1 VM home lab.
3. Sau 24h, console hiện CPU, memory, dependency.
4. Note: free tier không có, charge theo agent.

### Lab 2 — DMS migrate MySQL nhỏ (45 phút)
1. Tạo RDS MySQL nhỏ làm source (db.t3.micro).
2. Tạo RDS PostgreSQL nhỏ làm target.
3. **DMS** → tạo replication instance (`dms.t3.micro`).
4. Tạo source endpoint + target endpoint → test connection.
5. Tạo **migration task** type "Full load + CDC" → start.
6. Theo dõi CloudWatch metric → kiểm tra row count match.

### Lab 3 — Snow Family simulation
- Không thể đặt thật để học (Snowball Edge $300 + ship), nhưng:
- Console → **Snow Family** → **Create job** → chọn **Import into Amazon S3** → đến bước "Review" thì hủy.
- Hiểu workflow: ship → copy → ship back → unlock → upload.

---

## 4. Hands-on không tốn tiền

### Option A — AWS Migration Hub Strategy Recommendations
- Console → Migration Hub → **Strategy** → answer 10 câu hỏi về workload → AWS gợi ý R nào.

### Option B — Đọc whitepaper
- **AWS Cloud Adoption Framework** (60 trang): https://aws.amazon.com/cloud-adoption-framework/
- **An Overview of the AWS Cloud Adoption Framework** (10 trang exec summary).
- **AWS Migration Whitepaper**.

### Option C — Bài tập tư duy
Cho 10 application của 1 doanh nghiệp, gán **R** phù hợp:
1. ERP SAP 15 năm tuổi, license đến 2027 → ?
2. WordPress nội bộ 50 user → ?
3. SQL Server 2008 chạy 1 batch hàng đêm → ?
4. App Java Spring Boot 5 năm tuổi, dev đông → ?
5. CRM tự code 10 năm → ?
6. App python cũ chỉ 2 user dùng → ?
7. Monolith PHP, muốn microservice → ?
8. VMware vSphere 100 VM → ?
9. Email server Exchange → ?
10. File share Windows → ?

<details><summary>Gợi ý đáp án</summary>
1. Retain (license đắt, đợi hết hợp đồng).
2. Rehost (đơn giản).
3. Replatform (RDS SQL Server).
4. Replatform hoặc Rehost (xem cost).
5. Repurchase (Salesforce).
6. Retire.
7. Refactor (ECS hoặc Lambda).
8. Relocate (VMware Cloud on AWS).
9. Repurchase (Microsoft 365 SaaS).
10. Replatform (FSx for Windows).
</details>

---

## 5. Tự kiểm tra (có đáp án)

1. CAF có bao nhiêu perspective? Liệt kê tên.
   <details><summary>Trả lời</summary>**6**: Business, People, Governance, Platform, Security, Operations.</details>

2. Migrate 1 monolith Java sang Lambda + DynamoDB gọi là R nào?
   <details><summary>Trả lời</summary>**Refactor / Re-architect** — viết lại cloud-native.</details>

3. Tool nào dùng cho **live block-level replication** từ on-prem lên EC2?
   <details><summary>Trả lời</summary>**AWS Application Migration Service (MGN)**. Nếu mục đích DR thì là **AWS Elastic Disaster Recovery (DRS)**.</details>

4. Cần migrate 50 PB data từ datacenter — không thể qua Internet. Dùng gì?
   <details><summary>Trả lời</summary>**Snowmobile** (100 PB capacity). Hoặc nhiều Snowball Edge song song.</details>

5. Đổi schema Oracle sang Aurora PostgreSQL, có nhiều stored procedure phức tạp. Tool nào?
   <details><summary>Trả lời</summary>**AWS Schema Conversion Tool (SCT)** convert schema + report phần không tự convert được. Kết hợp **DMS** để move data.</details>

6. Khách hàng muốn migrate nhanh nhất, "lift-and-shift" 200 VM VMware. Chiến lược + tool?
   <details><summary>Trả lời</summary>**Rehost** + **AWS MGN**. (Nếu muốn giữ VMware stack thì **Relocate** + **VMware Cloud on AWS**.)</details>

7. Partner cần upload daily file qua SFTP vào S3, không muốn quản EC2 SFTP. Dùng gì?
   <details><summary>Trả lời</summary>**AWS Transfer Family** — managed SFTP / FTPS / FTP / AS2.</details>

8. Đề: *"Which AWS framework helps organizations plan their cloud journey from a business and technical perspective?"*
   <details><summary>Trả lời</summary>**AWS Cloud Adoption Framework (CAF)** — 6 perspective: Business / People / Governance / Platform / Security / Operations.</details>

---

## 6. Đối chiếu GCP & Azure

| Khái niệm | AWS | GCP | Azure |
|------------|-----|-----|-------|
| Adoption framework | **CAF** (6 perspective) | **Google Cloud Adoption Framework** (4 themes × 3 phases) | **Microsoft Cloud Adoption Framework** (Strategy, Plan, Ready, Adopt, Govern, Manage) |
| Lift-and-shift | **MGN** | **Migrate to Virtual Machines** (Migrate for Compute Engine) | **Azure Migrate** + **Azure Site Recovery** |
| DB migrate | **DMS** + **SCT** | **Database Migration Service** | **Azure Database Migration Service** |
| Offline transfer | **Snow Family** | **Transfer Appliance** | **Azure Data Box** |
| Hybrid hardware | **Outposts** | **Anthos / Google Distributed Cloud** | **Azure Stack** |

---

## 7. Lưu ý khi thi CLF-C02

- Thuộc **7 R** với ví dụ keyword. Đề thường cho 1 tình huống, hỏi "best migration strategy".
- **CAF 6 perspective** — đề có thể hỏi "which perspective addresses workforce skills" → **People**.
- **CAF benefits 4 cái** (reduced risk, ESG, revenue, operational efficiency) — đề hỏi nguyên văn.
- **Snowmobile = 100 PB** (lớn nhất); **Snowball Edge = 80 TB**; **Snowcone = 8 TB**.
- **MGN** cho **rehost**, **DRS** cho **DR**. Đừng nhầm.
- **DMS** = move data; **SCT** = convert schema. Đa số đề kết hợp cả hai cho cross-engine migration.
- **Migration Hub** = dashboard, **Application Discovery** = tìm inventory, **Migration Evaluator** = TCO.
- Đề có thể hỏi "what is the AWS Cloud Adoption Framework" → biết là framework chiến lược 6 perspective.

## 8. Lưu ý khi thi SAA-C03 (sâu hơn)

- SAA hỏi sâu **DR strategies** (backup-restore / pilot light / warm standby / multi-site) + RTO/RPO mapping.
- **DMS replication instance sizing**, supported source/target engines list.
- Thiết kế **hybrid network**: Direct Connect + VPN + Transit Gateway.

## 9. Lưu ý khi đi làm

- Migration **bắt đầu bằng Discovery 4–8 tuần** — đừng skip, sẽ underestimate dependency.
- **Build Landing Zone (Control Tower) trước migrate** — không sửa nhà khi đang ở.
- 80% workload có thể **Rehost** trước (nhanh, an toàn), sau đó **Refactor** dần theo business value.
- **Đo TCO trước/sau** bằng Migration Evaluator + Cost Explorer → để CFO tin tưởng đầu tư.
- **AWS MAP funding** có thể bù 30–50% migration cost nếu enterprise — tham gia partner để claim.

---

## 10. Flashcard

- **CAF 6 perspective**: **B**usiness, **P**eople, **G**overnance, **P**latform, **S**ecurity, **O**perations.
- **CAF 4 benefits**: reduced risk · ESG · revenue · operational efficiency.
- **7 R**: Rehost · Replatform · Repurchase · Refactor · Retire · Retain · Relocate.
- **MGN** — Application Migration Service (rehost).
- **DRS** — Elastic Disaster Recovery (DR + migrate).
- **DMS** — Database Migration Service (move data).
- **SCT** — Schema Conversion Tool (convert schema).
- **DataSync** — sync file online NFS/SMB ↔ S3/EFS/FSx.
- **Transfer Family** — managed SFTP/FTPS/FTP/AS2.
- **Snow Family**: Snowcone (8 TB) → Snowball Edge (80 TB) → Snowmobile (100 PB, đang retire).
- **Migration Hub** — dashboard tổng.
- **Application Discovery Service** — inventory + dependency.
- **Migration Evaluator** — TCO calc.
- **MAP** — Migration Acceleration Program, có funding.
- **Landing Zone** — multi-account baseline (Control Tower).
