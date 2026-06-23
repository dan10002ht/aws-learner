# Bài 9 — AWS Well-Architected Framework (6 Pillars)

> Map exam: **CLF-C02 Task 1.2 — Identify design principles of the AWS Cloud**.

## 1. Mục tiêu
Sau bài này bạn có thể:
- Liệt kê **6 pillar** của Well-Architected (WAF) và đoán đúng pillar khi đề cho 1 keyword.
- Phân biệt **WAF (whitepaper / framework)** vs **AWS Well-Architected Tool** (dịch vụ trong console).
- Áp dụng 5–10 **design principles** mỗi pillar vào câu hỏi tình huống.
- Biết khi nào WAF Tool đưa ra **HRI (High Risk Issue)** và cách xử lý.

---

## 2. Lý thuyết

### 2.0 Analogy — WAF như "tiêu chí chấm điểm chung cư"

Khi bạn mua chung cư, có 6 thứ luôn cần đánh giá:

| Tiêu chí chung cư | Pillar WAF | Ý nghĩa |
|--------------------|------------|---------|
| Ban quản lý có quy trình rõ ràng? | **Operational Excellence** | Vận hành có quy trình, automation, learn from failure |
| Cửa khóa, camera, bảo vệ? | **Security** | Identity, encrypt, detect, respond |
| Có thang máy dự phòng, máy phát điện? | **Reliability** | HA, recover from failure |
| Internet nhanh, thang máy nhanh? | **Performance Efficiency** | Right resource cho đúng workload |
| Phí dịch vụ có hợp lý không? | **Cost Optimization** | Tránh lãng phí, mua đúng pricing |
| Toà có dùng năng lượng mặt trời, ít carbon? | **Sustainability** | Pillar **mới nhất** (2021), giảm carbon |

Không pillar nào "quan trọng nhất" — **trade-off** là khái niệm cốt lõi của WAF. Tăng Reliability thường tăng Cost, tăng Performance thường giảm Sustainability, v.v.

---

### 2.0.1 Câu chuyện — Tại sao AWS có WAF?

Trước 2015 AWS chỉ có docs lẻ tẻ. Solutions Architect đi tư vấn khách mỗi người nói 1 kiểu, khách hỏi "kiến trúc của tôi tốt chưa?" không ai trả lời được nhất quán.

→ AWS chuẩn hoá thành **5 pillar** (2015), thêm **Sustainability** (Dec 2021) → **6 pillar**.

Mỗi pillar có:
- **Design principles** (5–10 nguyên tắc thiết kế).
- **Best practices** (cụ thể, kiểm tra được).
- **Questions** trong **WAF Tool** để self-assess.

WAF không phải "luật bắt buộc" — nó là **checklist khuyến nghị**. Bạn có thể trade-off, nhưng phải **biết là mình đang trade-off**.

---

### 2.1 6 pillars — định nghĩa 1 câu (thuộc lòng)

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 716 300" role="img" style="width:100%;max-width:716px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>6 trụ cột của AWS Well-Architected Framework</title>
  <desc>Sáu trụ cột đỡ một hệ thống well-architected: Operational Excellence (Vận hành), Security (Bảo mật), Reliability (Tin cậy), Performance Efficiency (Hiệu năng), Cost Optimization (Chi phí), Sustainability (Bền vững).</desc>
  <rect x="16" y="36" width="684" height="26" rx="6" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="358" y="53" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Hệ thống Well-Architected</text>
  <g>
    <rect x="16" y="74" width="104" height="150" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.16"/>
    <text x="68" y="158" font-size="34" font-weight="700" text-anchor="middle" fill="#3b82f6" opacity="0.55">1</text>
    <text x="68" y="244" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Vận hành</text>
    <text x="68" y="259" font-size="8.5" text-anchor="middle" fill="currentColor" opacity="0.6">Operational Exc.</text>
  </g>
  <g>
    <rect x="132" y="74" width="104" height="150" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.16"/>
    <text x="184" y="158" font-size="34" font-weight="700" text-anchor="middle" fill="#10b981" opacity="0.55">2</text>
    <text x="184" y="244" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Bảo mật</text>
    <text x="184" y="259" font-size="8.5" text-anchor="middle" fill="currentColor" opacity="0.6">Security</text>
  </g>
  <g>
    <rect x="248" y="74" width="104" height="150" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.16"/>
    <text x="300" y="158" font-size="34" font-weight="700" text-anchor="middle" fill="#f59e0b" opacity="0.6">3</text>
    <text x="300" y="244" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Tin cậy</text>
    <text x="300" y="259" font-size="8.5" text-anchor="middle" fill="currentColor" opacity="0.6">Reliability</text>
  </g>
  <g>
    <rect x="364" y="74" width="104" height="150" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.16"/>
    <text x="416" y="158" font-size="34" font-weight="700" text-anchor="middle" fill="#8b5cf6" opacity="0.55">4</text>
    <text x="416" y="244" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Hiệu năng</text>
    <text x="416" y="259" font-size="8.5" text-anchor="middle" fill="currentColor" opacity="0.6">Performance</text>
  </g>
  <g>
    <rect x="480" y="74" width="104" height="150" rx="8" fill="#14b8a6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.16"/>
    <text x="532" y="158" font-size="34" font-weight="700" text-anchor="middle" fill="#14b8a6" opacity="0.6">5</text>
    <text x="532" y="244" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Chi phí</text>
    <text x="532" y="259" font-size="8.5" text-anchor="middle" fill="currentColor" opacity="0.6">Cost Opt.</text>
  </g>
  <g>
    <rect x="596" y="74" width="104" height="150" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.16"/>
    <text x="648" y="158" font-size="34" font-weight="700" text-anchor="middle" fill="#f43f5e" opacity="0.55">6</text>
    <text x="648" y="244" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Bền vững</text>
    <text x="648" y="259" font-size="8.5" text-anchor="middle" fill="currentColor" opacity="0.6">Sustainability</text>
  </g>
  <rect x="8" y="228" width="700" height="10" rx="3" fill="currentColor" fill-opacity="0.12"/>
  <text x="358" y="284" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">Không trụ nào "quan trọng nhất" — cốt lõi là trade-off giữa chúng</text>
</svg>

| # | Pillar | Định nghĩa 1 câu | Exam keyword |
|---|--------|------------------|---------------|
| 1 | **Operational Excellence** | Chạy + monitor + cải tiến hệ thống và quy trình | Runbook, automation, IaC, observability, learn from failure |
| 2 | **Security** | Bảo vệ data, system, asset; quản lý quyền | IAM, encrypt, MFA, audit, defense-in-depth |
| 3 | **Reliability** | Workload thực hiện đúng chức năng + recover khi fail | HA, Multi-AZ, backup, DR, auto-recovery |
| 4 | **Performance Efficiency** | Dùng đúng tài nguyên cho đúng workload, scale theo nhu cầu | Right-size, serverless, global, experiment |
| 5 | **Cost Optimization** | Đạt mục tiêu business với chi phí thấp nhất | Right pricing model, eliminate waste, measure |
| 6 | **Sustainability** | Giảm tác động môi trường (carbon, energy, water) của workload | Region carbon-aware, right-size, managed service |

**Mẹo nhớ**: **O-S-R-P-C-S** → "Operate, Secure, Reliable, Perform, Cost, Sustain". Hoặc câu mnemonic VN: *"Ổn — Sạch — Rắn — Phơi — Cạn — Sống"*.

---

### 2.2 Pillar 1 — Operational Excellence (vận hành xuất sắc)

**Design principles (7)**:
1. **Perform operations as code** — quản hạ tầng & quy trình bằng code (CloudFormation, CDK, Terraform).
2. **Make frequent, small, reversible changes** — deploy nhỏ thường xuyên, dễ rollback.
3. **Refine operations procedures frequently** — runbook update liên tục.
4. **Anticipate failure** — chaos engineering, game day, AWS Fault Injection Service.
5. **Learn from all operational failures** — post-mortem không đổ lỗi.
6. **Use managed services** — để giảm operational burden.
7. **Implement observability** — log, metric, trace.

**AWS services chính**:
- CloudWatch (log + metric + alarm), CloudTrail (audit), X-Ray (trace).
- CloudFormation, CDK, Systems Manager, OpsWorks.
- AWS Config (resource state), AWS Health Dashboard.

**Exam keyword → pillar này**:
- "automate deployments", "infrastructure as code", "runbook", "monitor performance"

---

### 2.3 Pillar 2 — Security (bảo mật)

**Design principles (7)**:
1. **Implement a strong identity foundation** — least privilege, central identity (IAM Identity Center), MFA.
2. **Enable traceability** — log + monitor + alert (CloudTrail + Config).
3. **Apply security at all layers** — defense in depth: edge (WAF/Shield) → VPC (SG/NACL/Network Firewall) → host → app → data.
4. **Automate security best practices** — Security Hub auto-check.
5. **Protect data in transit and at rest** — TLS + KMS encryption.
6. **Keep people away from data** — SSM Session Manager thay SSH, không cho ai sờ data trực tiếp.
7. **Prepare for security events** — incident response plan (Detective, GuardDuty).

**AWS services chính**:
- IAM, IAM Identity Center, Organizations + SCP.
- KMS, CloudHSM, Secrets Manager, ACM.
- GuardDuty, Inspector, Macie, Detective, Security Hub.
- WAF, Shield, Network Firewall, Firewall Manager.
- Artifact (compliance reports), Audit Manager.

**Exam keyword → pillar này**:
- "encrypt at rest", "least privilege", "centralized logging", "compliance"

---

### 2.4 Pillar 3 — Reliability (độ tin cậy)

**Design principles (5)**:
1. **Automatically recover from failure** — health check + auto-replace (ASG, ECS, RDS Multi-AZ).
2. **Test recovery procedures** — không chỉ test happy path; chaos engineering, restore from backup test.
3. **Scale horizontally** — nhiều instance nhỏ hơn 1 instance to (giảm blast radius).
4. **Stop guessing capacity** — auto-scale theo demand.
5. **Manage change in automation** — change qua pipeline, không thủ công.

**AWS services chính**:
- Multi-AZ (RDS, ElastiCache, ALB), Multi-Region (Route 53 failover, Aurora Global, S3 CRR).
- Auto Scaling, ELB, Route 53 health check.
- AWS Backup, Elastic Disaster Recovery.
- AWS Resilience Hub (đánh giá RTO/RPO).

**Khái niệm bắt buộc**:
- **RTO** (Recovery Time Objective) — bao lâu thì hồi phục được.
- **RPO** (Recovery Point Objective) — mất tối đa bao nhiêu data.
- **4 DR strategy** (Pilot Light → Warm Standby → Multi-Site Active-Active → Backup & Restore — sắp xếp theo RTO/RPO giảm dần, cost giảm dần).

**Exam keyword → pillar này**:
- "high availability", "fault tolerance", "disaster recovery", "Multi-AZ"

---

### 2.5 Pillar 4 — Performance Efficiency (hiệu năng)

**Design principles (5)**:
1. **Democratize advanced technologies** — dùng managed service (DynamoDB thay tự cluster, SageMaker thay tự train).
2. **Go global in minutes** — multi-region deploy nhanh.
3. **Use serverless architectures** — bỏ server quản lý → tập trung logic.
4. **Experiment more often** — A/B test, blue/green.
5. **Consider mechanical sympathy** — chọn đúng tool: SQL vs NoSQL vs cache, EC2 vs Lambda, EBS vs EFS.

**AWS services chính**:
- Auto Scaling, ELB, CloudFront, Global Accelerator.
- EC2 instance families (compute / memory / storage / GPU optimized).
- Lambda, DynamoDB, ElastiCache, Aurora.
- Compute Optimizer (gợi ý right-size).

**Exam keyword → pillar này**:
- "low latency", "scale on demand", "right-sized instance", "global users"

---

### 2.6 Pillar 5 — Cost Optimization (tối ưu chi phí)

**Design principles (5)**:
1. **Implement cloud financial management** — FinOps team, cost ownership.
2. **Adopt a consumption model** — chỉ trả cho thứ dùng.
3. **Measure overall efficiency** — cost/output (vd $/transaction).
4. **Stop spending money on undifferentiated heavy lifting** — managed service.
5. **Analyze and attribute expenditure** — tag + cost allocation.

**AWS services chính**:
- Cost Explorer, Budgets, CUR, Billing Conductor.
- Savings Plans, Reserved Instances, Spot.
- Trusted Advisor (cost check), Compute Optimizer.
- S3 Intelligent-Tiering, S3 Lifecycle.

**Exam keyword → pillar này**:
- "most cost-effective", "minimize cost", "reduce spending", "right pricing model"

---

### 2.7 Pillar 6 — Sustainability (bền vững) — MỚI từ Dec 2021

**Design principles (6)**:
1. **Understand your impact** — đo carbon (Customer Carbon Footprint Tool).
2. **Establish sustainability goals** — số % giảm carbon/năm.
3. **Maximize utilization** — right-size, container/serverless (share hardware tốt hơn EC2 tự quản).
4. **Anticipate and adopt new, more efficient hardware** — Graviton (ARM, tiết kiệm 60% energy so x86).
5. **Use managed services** — AWS tối ưu utilization cho nhiều khách → tổng carbon ít hơn.
6. **Reduce downstream impact** — giảm dữ liệu gửi xuống device (mobile), giảm CPU client phải xử lý.

**AWS services chính**:
- **Customer Carbon Footprint Tool** (trong Billing Console, miễn phí).
- **Graviton** instances (Arm), Lambda ARM.
- S3 Lifecycle → archive class (Glacier Deep Archive dùng ít energy).
- Region pick: chọn region dùng nhiều **renewable energy** (Ireland, Sweden, Oregon).

**Exam keyword → pillar này**:
- "reduce environmental impact", "carbon footprint", "sustainability", "energy efficiency"

---

### 2.8 Trade-off giữa các pillar (đề hay hỏi)

| Tăng pillar nào | Có thể giảm pillar nào | Ví dụ |
|------------------|------------------------|-------|
| Reliability ↑ | Cost ↑ | Multi-region active-active đắt gấp 2-3 lần Multi-AZ |
| Performance ↑ | Cost ↑, Sustainability ↓ | Provisioned IOPS đắt + ngốn energy |
| Security ↑ | Performance ↓ (chút) | TLS overhead, KMS encrypt thêm vài ms |
| Sustainability ↑ | Performance ↓ (chút) | Graviton chậm hơn vài app legacy chưa optimize |
| Cost ↓ (Spot) | Reliability ↓ | Spot có thể bị reclaim |

→ WAF khuyến khích **explicit trade-off**: ghi rõ "tôi chọn cost > reliability cho dev environment".

---

### 2.9 AWS Well-Architected Tool (dịch vụ trong Console)

**Khác với WAF (framework/whitepaper)**:
- **WAF** = lý thuyết, free đọc.
- **WAF Tool** = dịch vụ AWS, free, trong console, bạn trả lời ~50 câu hỏi cho workload của mình → output:
  - **HRI** (High Risk Issue) — cần fix sớm.
  - **MRI** (Medium Risk Issue).
  - **Improvement plan** với link tới best practice.

**Workflow**:
1. Define workload (account + region).
2. Chọn lens (default = 6-pillar WAF Lens; có Serverless Lens, Machine Learning Lens, SaaS Lens, …).
3. Trả lời câu hỏi, review.
4. Track milestone qua thời gian.

**Lens** = bộ câu hỏi chuyên biệt cho 1 domain (vd "Serverless Lens" có ~30 câu thêm về Lambda/API Gateway/DynamoDB).

---

### 2.10 6 R's của Cloud Migration (bonus — sẽ học sâu ở bài 10)

WAF có nhắc tới migration strategies. AWS chính thức list **7 R**:
- **Rehost** (lift-and-shift) — chuyển nguyên VM lên EC2.
- **Replatform** (lift-tinker-shift) — đổi DB sang RDS, vẫn giữ app.
- **Repurchase** — bỏ self-host, mua SaaS (Salesforce thay CRM tự code).
- **Refactor / Re-architect** — viết lại theo cloud-native (Lambda + DynamoDB).
- **Retire** — bỏ workload không cần.
- **Retain** — giữ on-prem (chưa migrate).
- **Relocate** — chuyển nguyên VMware sang VMware Cloud on AWS.

---

## 3. Hands-on có account

### Lab 1 — Chạy thử WAF Tool (30 phút)
1. Console → tìm **"Well-Architected Tool"**.
2. **Define workload** → name `learning-app`, region `ap-southeast-1`, environment `pre-production`.
3. Chọn lens **AWS Well-Architected Framework** (mặc định).
4. Trả lời 5–10 câu trong pillar Security: hệ thống có MFA root chưa? Có rotate access key không? Có log CloudTrail không?
5. Xem **Improvement plan** → click 1 HRI bất kỳ → đọc best practice docs link.

### Lab 2 — Customer Carbon Footprint Tool (5 phút)
1. Billing console → **Cost & Usage** → **Customer Carbon Footprint Tool**.
2. Xem báo cáo carbon (MTCO2e) theo region của account.
3. Note: AWS commit 100% renewable energy vào 2025.

### Lab 3 — Apply 1 nguyên tắc mỗi pillar (1 tuần, mini-project)
- **Operational**: chuyển 1 EC2 launch thủ công → CloudFormation template.
- **Security**: bật MFA + IAM Identity Center.
- **Reliability**: bật RDS Multi-AZ + tạo backup plan.
- **Performance**: chạy Compute Optimizer → right-size 1 EC2.
- **Cost**: setup Budget + check Trusted Advisor cost check.
- **Sustainability**: thử migrate 1 workload sang Graviton (`t4g.micro`) → so sánh giá vs `t3.micro`.

---

## 4. Hands-on không tốn tiền

### Option A — Đọc whitepaper
- https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html (HTML, miễn phí).
- Skim mỗi pillar 15 phút → highlight design principles.

### Option B — AWS Skill Builder
- Search "AWS Well-Architected" → khoá học **AWS Well-Architected Foundations** (free, 1h).

### Option C — Bài tập tư duy
Cho 1 architecture sau, đánh giá theo 6 pillar:
> 1 EC2 t2.micro chạy WordPress, dùng SQLite, public IP, password admin = `admin123`, không backup, không monitor, không tag, chạy 24/7.

→ Liệt kê **tối thiểu 2 HRI cho mỗi pillar**.

---

## 5. Tự kiểm tra (có đáp án)

1. Đề: *"Which pillar focuses on minimizing the environmental impact of workloads?"*
   <details><summary>Trả lời</summary>**Sustainability** — pillar mới nhất (Dec 2021).</details>

2. Đề: *"A company wants to ensure rapid recovery from AZ failure with RTO < 5 minutes. Which pillar is most relevant?"*
   <details><summary>Trả lời</summary>**Reliability** — RTO/RPO, Multi-AZ, auto-recovery thuộc pillar này.</details>

3. Đề: *"Which pillar recommends using managed services to reduce operational burden?"*
   <details><summary>Trả lời</summary>**Operational Excellence** (chính). Nhưng managed service cũng giúp Cost + Sustainability + Performance — đề thường rate option Op-Ex cao nhất nếu chỉ chọn 1.</details>

4. Đề: *"What is the AWS Well-Architected Tool?"*
   <details><summary>Trả lời</summary>1 service trong AWS Console (free) cho phép self-assess workload theo 6 pillar, output ra improvement plan với HRI/MRI.</details>

5. Đề: *"Which design principle of the Security pillar emphasizes layered defense?"*
   <details><summary>Trả lời</summary>**"Apply security at all layers"** — defense in depth: edge → VPC → host → app → data.</details>

6. Đề: *"A startup wants to reduce cost by using Spot Instances. Which pillar conflict?"*
   <details><summary>Trả lời</summary>**Cost ↑ nhưng Reliability ↓** — Spot có thể bị reclaim trong 2 phút → workload phải fault-tolerant. WAF khuyến khích explicit trade-off, không bắt phải tránh.</details>

7. Đề: *"Which AWS service helps visualize carbon footprint?"*
   <details><summary>Trả lời</summary>**Customer Carbon Footprint Tool** (trong Billing console, free).</details>

8. Đề: *"What is the newest pillar added to AWS Well-Architected Framework?"*
   <details><summary>Trả lời</summary>**Sustainability** (Dec 2021). 5 pillar gốc từ 2015.</details>

---

## 6. Đối chiếu GCP & Azure

| Framework tương đương | AWS | GCP | Azure |
|------------------------|-----|-----|-------|
| Whitepaper | **Well-Architected Framework** (6 pillar) | **Google Cloud Architecture Framework** (5 pillar: Op Ex, Security, Reliability, Cost, Performance — không có Sustainability riêng) | **Azure Well-Architected Framework** (5 pillar: Reliability, Security, Cost Optimization, Op Ex, Performance — không có Sustainability) |
| Self-assess tool | **AWS WAF Tool** | **Active Assist / Architecture Diagram tool** | **Azure Advisor + WAF Review** |

→ AWS là **cloud duy nhất tách Sustainability thành pillar riêng**.

---

## 7. Lưu ý khi thi CLF-C02

- Thuộc **tên 6 pillar** + **mục đích 1 câu** cho mỗi pillar.
- **Sustainability** là pillar **thứ 6, mới nhất** (2021) — đề hay hỏi "newest pillar".
- **WAF Tool** ≠ **WAF (framework)**. Đừng nhầm với **AWS WAF** (Web Application Firewall — chống L7 attack).
- Đề hỏi "which pillar" → match keyword:
  - Encrypt, IAM, MFA → **Security**
  - HA, Multi-AZ, recover, backup → **Reliability**
  - Right-size, latency, scale → **Performance Efficiency**
  - Right pricing, RI, Spot, waste → **Cost Optimization**
  - Runbook, automation, IaC, monitor → **Operational Excellence**
  - Carbon, energy, Graviton → **Sustainability**
- **Trade-off explicit** là tinh thần WAF — không pillar nào "luôn quan trọng nhất".

## 8. Lưu ý khi thi SAA-C03 (sâu hơn)

- SAA hỏi rất sâu **Reliability** + **Performance** + **Cost**. Phải biết chọn instance type, storage class, DB engine sao cho từng pillar.
- **DR strategies 4 tier** (backup-restore → pilot light → warm standby → multi-site) cần thuộc RTO/RPO.
- **WAF Lens** chuyên ngành: Serverless, ML, SaaS, IoT, Streaming — SAA có thể hỏi.

## 9. Lưu ý khi đi làm

- Mỗi quý chạy **WAF Tool review** cho từng workload production. Track HRI giảm dần.
- **Sustainability** dần thành tiêu chí mua hàng (RFP của khách lớn) — bắt đầu đo carbon ngay.
- Đừng "100% mọi pillar" — chọn 2–3 pillar chiến lược theo business, accept trade-off ở pillar còn lại.
- WAF Tool kết quả nên đưa vào quarterly architecture review.

---

## 10. Flashcard

- **6 pillar** (theo thứ tự AWS hay liệt kê):
  1. **Operational Excellence** — runbook, IaC, automation.
  2. **Security** — IAM, encrypt, defense in depth.
  3. **Reliability** — HA, recover, RTO/RPO.
  4. **Performance Efficiency** — right-size, serverless, global.
  5. **Cost Optimization** — right pricing, eliminate waste.
  6. **Sustainability** — carbon, Graviton, managed service. (mới 2021)
- **WAF Tool** — service free trong console, self-assess.
- **HRI** — High Risk Issue cần fix sớm.
- **Lens** — bộ câu hỏi chuyên biệt (Serverless, ML, SaaS, …).
- **Trade-off** là tinh thần WAF — Reliability ↑ thường Cost ↑.
- **7 R migration**: Rehost / Replatform / Repurchase / Refactor / Retire / Retain / Relocate.
- **Customer Carbon Footprint Tool** — free, trong Billing.
- **Graviton** — Arm-based EC2, tiết kiệm energy 60% so x86.
