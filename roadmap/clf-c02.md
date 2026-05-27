# Lộ trình CLF-C02 (Cloud Practitioner) — Deep Dive

**Mục tiêu:** Thi đậu CLF-C02 (65 câu, 90 phút, passing ~700/1000, $100, có 15 câu unscored).

**Thời gian gợi ý:** 6–8 tuần, 1–2 giờ/ngày.

**Triết lý học:** CLF là exam "diện rộng, không sâu" — bạn cần **nhận diện service nào giải quyết vấn đề gì**, KHÔNG cần cấu hình chi tiết. Nhưng nếu học đúng cách ngay từ CLF, bạn sẽ tiết kiệm ~40% thời gian khi lên SAA.

## Map exam domain → lesson

| Domain (% scored) | Task statement | Lesson |
|---|---|---|
| **D1 Cloud Concepts (24%)** | 1.1 Benefits / 1.4 Cloud economics / 3.2 Global infra | [01-cloud-concepts](../lessons/clf-c02/01-cloud-concepts.md) |
| | 1.2 Design principles (Well-Architected) | [09-well-architected](../lessons/clf-c02/09-well-architected.md) |
| | 1.3 Migration & CAF | [10-migration-caf](../lessons/clf-c02/10-migration-caf.md) |
| **D2 Security & Compliance (30%)** | 2.1 Shared responsibility | [02-shared-responsibility](../lessons/clf-c02/02-shared-responsibility.md) |
| | 2.3 IAM / access management | [03-iam](../lessons/clf-c02/03-iam.md) |
| | 2.2 + 2.4 Security services (KMS, WAF, GuardDuty, …) | [18-security-extended](../lessons/clf-c02/18-security-extended.md) |
| **D3 Cloud Technology & Services (34%)** | 3.1 Deploy/IaC/CLI/SDK/Console | [13-deploy-iac](../lessons/clf-c02/13-deploy-iac.md) |
| | 3.3 EC2 + pricing | [04-ec2](../lessons/clf-c02/04-ec2.md) |
| | 3.3 Containers / Lambda / Beanstalk / ASG / ELB | [11-compute-extended](../lessons/clf-c02/11-compute-extended.md) |
| | 3.4 Databases | [07-databases](../lessons/clf-c02/07-databases.md) |
| | 3.5 VPC / Networking | [06-vpc](../lessons/clf-c02/06-vpc.md) |
| | 3.6 S3 | [05-s3](../lessons/clf-c02/05-s3.md) |
| | 3.6 EBS / EFS / FSx / Backup / Storage Gateway | [12-storage-extended](../lessons/clf-c02/12-storage-extended.md) |
| | 3.7 AI/ML | [15-ai-ml](../lessons/clf-c02/15-ai-ml.md) |
| | 3.7 Analytics | [16-analytics](../lessons/clf-c02/16-analytics.md) |
| | 3.8 App integration (SNS/SQS/EventBridge/Step Functions) | [14-app-integration](../lessons/clf-c02/14-app-integration.md) |
| | 3.8 Dev tools / EUC / IoT / SES / Connect / Amplify | [19-other-services](../lessons/clf-c02/19-other-services.md) |
| **D4 Billing, Pricing & Support (12%)** | 4.1 + 4.2 Pricing + billing tools | [08-billing](../lessons/clf-c02/08-billing.md) |
| | 4.3 Support + technical resources + Partner | [19-other-services](../lessons/clf-c02/19-other-services.md) |
| | Management & Governance (CloudWatch / CloudTrail / Config / Trusted Advisor / Organizations / Control Tower) | [17-monitoring-governance](../lessons/clf-c02/17-monitoring-governance.md) |

---

## ⚠️ Lưu ý tổng quát khi thi CLF-C02

### Bẫy hay gặp trong đề
1. **"AWS-managed" vs "Customer-managed"** — đề hay hỏi ai chịu trách nhiệm gì. Mặc định: data, IAM, encryption choice → **luôn là customer**.
2. **Từ khoá "most cost-effective"** → thường đáp án là **Serverless** (Lambda, DynamoDB on-demand, S3) hoặc **Spot**.
3. **Từ khoá "no operational overhead" / "fully managed"** → loại bỏ ngay EC2 tự quản, chọn service có chữ "managed" (RDS, Fargate, Lambda).
4. **"Global" / "low latency worldwide"** → CloudFront (static/cache) hoặc Global Accelerator (dynamic TCP/UDP).
5. **Support plan**: nhớ kỹ plan nào có **TAM (Technical Account Manager)** — chỉ **Enterprise** và **Enterprise On-Ramp** (on-ramp là pool TAM chung).
6. **Trusted Advisor full check** chỉ có ở **Business trở lên**. Basic/Developer chỉ có 7 core check.
7. **AWS Shield Standard** → **free cho mọi account**. Shield Advanced → $3,000/tháng.
8. **"Data tại Germany"** → compliance → chọn Region `eu-central-1`, KHÔNG phải vấn đề kỹ thuật.
9. **Phân biệt Cost Explorer (phân tích) vs Budgets (cảnh báo) vs CUR (report chi tiết CSV vào S3)**.
10. **Câu hỏi "what is BENEFIT of cloud"** → luôn chọn đáp án trong 6 benefit chính thức (CapEx→OpEx, economies of scale, stop guessing capacity, agility, stop maintaining DC, go global in minutes).

### Kỹ thuật làm bài
- **Loại trừ 2 đáp án sai hiển nhiên** trước → còn 50/50 thì đọc kỹ từ khoá.
- **Đánh dấu review** các câu phân vân, đừng dừng lâu (trung bình ~80 giây/câu).
- Chú ý các từ **NOT / EXCEPT / LEAST** trong đề — dễ đọc lướt mà sai.
- Đề tiếng Anh có thể đổi sang tiếng Nhật/Trung nhưng **không có tiếng Việt** — nên luyện quen thuật ngữ EN.

### Lưu ý khi thi online (Pearson VUE / PSI)
- Test phòng sạch, không giấy tờ, không tai nghe, không đồng hồ, không điện thoại.
- Phải check-in **trước 30 phút**, chuẩn bị CMND/CCCD + hộ chiếu (bắt buộc 2 giấy tờ).
- Webcam phải quay được toàn phòng 360°.
- Laptop phải disable virtual camera, VM, dual monitor.
- Mẹo: đặt lịch thi **buổi sáng sớm** server đỡ đông, đỡ lag.

---

## Tuần 1 — Nền tảng Cloud & AWS Global Infrastructure

**Mục tiêu:** Hiểu cloud là gì, 3 mô hình dịch vụ, 4 mô hình deployment, cấu trúc vật lý của AWS.

### Bài học
- [ ] Bài 1: Cloud computing là gì? On-prem vs Cloud → [lessons/clf-c02/01-cloud-concepts.md](../lessons/clf-c02/01-cloud-concepts.md)
- [ ] Bài 2: IaaS / PaaS / SaaS, Public / Private / Hybrid cloud.
- [ ] Bài 3: AWS Global Infrastructure — Region, AZ, Edge Location, Local Zone, Wavelength, Outposts.
- [ ] Bài 4: 6 lợi thế của cloud (thuộc lòng nguyên văn EN).

### Deep dive cần nhớ
- **Region code** phổ biến: `us-east-1` (N. Virginia, rẻ nhất, ra service sớm nhất), `us-west-2` (Oregon), `eu-west-1` (Ireland), `ap-southeast-1` (Singapore), `ap-northeast-1` (Tokyo).
- 1 Region có **≥ 3 AZ** (AWS thiết kế tối thiểu). Mỗi AZ là **1+ datacenter** cách nhau vài km–100km, nối fiber < 1ms latency.
- **Edge Location** (>400 global) ≠ **Regional Edge Cache** (mid-tier, lớn hơn Edge, cache lâu hơn).
- **Local Zone** = extension của 1 Region, có prefix như `us-west-2-lax-1a`.
- **Wavelength** nhúng vào mạng 5G (Verizon, KDDI, Vodafone).
- **Outposts** = rack AWS đặt on-prem, chạy như 1 AZ nối ngược về parent Region.

### Lưu ý khi đi làm
- Luôn chọn Region gần user nhất (latency) **trừ khi compliance yêu cầu**.
- `us-east-1` có nhiều **global service endpoint** (IAM, CloudFront, Route 53 control plane) → khi `us-east-1` down, các service global bị ảnh hưởng dù bạn ở region khác.
- **KHÔNG** đặt production tại region vừa ra mắt (preview) → service chưa đầy đủ, SLA thấp.

### Hands-on
- **Có account:** Đăng ký AWS Free Tier, bật MFA cho root, **tạo IAM user riêng để làm việc** (không dùng root), tạo billing alarm $1.
- **No account:** Đọc [AWS Global Infrastructure map](https://aws.amazon.com/about-aws/global-infrastructure/), vẽ sơ đồ Region/AZ của `ap-southeast-1`.

---

## Tuần 2 — IAM & Security cơ bản

**Mục tiêu:** Hiểu shared responsibility, IAM cơ bản, các dịch vụ security.

### Bài học
- [ ] Bài 5: Shared Responsibility Model → [lessons/clf-c02/02-shared-responsibility.md](../lessons/clf-c02/02-shared-responsibility.md)
- [ ] Bài 6: IAM — User, Group, Role, Policy, Root best practices → [lessons/clf-c02/03-iam.md](../lessons/clf-c02/03-iam.md)
- [ ] Bài 7: MFA, Access Key vs Session Token, IAM Identity Center (SSO, thay thế cho AWS SSO cũ).
- [ ] Bài 8: KMS, Secrets Manager, GuardDuty, Shield, WAF, Inspector, Macie, Artifact, Trusted Advisor, Security Hub, Detective.

### Deep dive security services (thuộc 1 dòng/service)
| Service | Mục đích (1 câu) | Exam keyword |
|---------|------------------|--------------|
| **IAM** | Ai được làm gì | Users, Groups, Roles, Policies |
| **IAM Identity Center** | SSO cho multi-account | Replace AWS SSO |
| **KMS** | Quản lý encryption key | CMK, rotate |
| **CloudHSM** | HSM dedicated phần cứng | FIPS 140-2 level 3 |
| **Secrets Manager** | Lưu secret, **auto-rotate** | Rotation, RDS integration |
| **Parameter Store** (SSM) | Lưu config/secret đơn giản, **rẻ hơn** | No auto-rotate built-in |
| **GuardDuty** | Threat detection bằng ML (VPC flow, DNS, CloudTrail) | Anomaly, threat |
| **Inspector** | Scan vulnerability EC2/ECR/Lambda | CVE, CIS |
| **Macie** | Phát hiện PII trong S3 | PII, GDPR |
| **Shield Standard** | Chống DDoS L3/L4, **free** | Auto |
| **Shield Advanced** | DDoS L3/L4/L7, $3000/tháng, có DRT | 24/7 response team |
| **WAF** | Chống L7 attack (SQLi, XSS) | Rules, ALB/CF/API GW |
| **Firewall Manager** | Quản lý WAF/Shield multi-account | Organizations |
| **Artifact** | Tải compliance report (SOC, ISO, PCI) | Compliance docs |
| **Trusted Advisor** | Gợi ý tối ưu 5 mảng | Cost, Perf, Security, FT, Limits |
| **Security Hub** | Dashboard tổng hợp findings | Aggregator |
| **Detective** | Điều tra root cause sau khi có alert | Investigation |
| **Config** | Theo dõi config thay đổi theo thời gian | Compliance rules |
| **CloudTrail** | Log mọi API call | Audit, who did what |

### Lưu ý khi thi
- **Root account** chỉ dùng để: billing, đổi plan, đóng account. Việc khác → IAM user.
- **IAM là global**, không theo region. Nhưng **IAM user sign-in endpoint** thì có URL region.
- Policy evaluation: **Explicit DENY > Explicit ALLOW > Default DENY**.
- **Access Key** = long-term credential (nguy hiểm) → ưu tiên **IAM Role + STS temporary credential**.

### Lưu ý khi đi làm
- **KHÔNG BAO GIỜ** commit access key vào Git. Dùng `git-secrets`, GitHub secret scanning.
- Tạo **IAM Role** cho EC2/Lambda, không gắn access key vào code.
- Bật **MFA** cho mọi user, bắt buộc rotate password 90 ngày.
- Dùng **IAM Identity Center** (SSO) thay vì tạo IAM user rời rạc, đặc biệt trong tổ chức đa account.
- Viết policy theo nguyên tắc **least privilege**, bắt đầu từ `Deny *` và mở dần.

### Hands-on
- **Có account:** Tạo IAM user `dev-user`, tạo group `Developers` gắn `ReadOnlyAccess`, enable MFA, login bằng user mới.
- **No account:** LocalStack `awslocal iam create-user --user-name test`. Viết JSON policy chỉ cho phép `s3:GetObject` trên bucket `my-logs/*`, chạy qua **IAM Policy Simulator** (trong docs có bản online).

---

## Tuần 3 — Compute & Storage

### Bài học
- [ ] Bài 9: EC2 — Instance families, AMI, pricing 4 loại → [lessons/clf-c02/04-ec2.md](../lessons/clf-c02/04-ec2.md)
- [ ] Bài 10: EBS vs Instance Store vs EFS vs FSx.
- [ ] Bài 11: Lambda, Fargate, ECS, EKS, Beanstalk, Lightsail, Batch — khi nào dùng gì.
- [ ] Bài 12: S3 — Storage classes, versioning, lifecycle, Glacier variants → [lessons/clf-c02/05-s3.md](../lessons/clf-c02/05-s3.md)

### Deep dive EC2 pricing (cực hay ra đề)
| Pricing | Giảm giá | Cam kết | Use case |
|---------|----------|---------|----------|
| **On-Demand** | 0% | Không | Dev/test, workload không dự đoán |
| **Reserved (RI)** | Tới 72% | 1 hoặc 3 năm | Steady workload (DB, prod web) |
| **Savings Plans** | Tới 72% | 1 hoặc 3 năm, commit $/h | Linh hoạt hơn RI, áp cho Lambda/Fargate luôn |
| **Spot** | Tới 90% | Không, có thể bị kill trong 2 phút | Batch, CI, fault-tolerant |
| **Dedicated Host** | Đắt nhất | — | License BYOL (Windows, Oracle) |
| **Dedicated Instance** | Đắt | — | Compliance không share hardware |
| **Capacity Reservation** | Không giảm | — | Đảm bảo có capacity khi cần |

### Deep dive S3 Storage Class
| Class | Durability | AZ | Retrieval | Use case |
|-------|-----------|-----|-----------|----------|
| **Standard** | 11 nines | ≥3 | tức thì | Access thường xuyên |
| **Intelligent-Tiering** | 11 nines | ≥3 | tức thì | Pattern không biết trước |
| **Standard-IA** | 11 nines | ≥3 | tức thì, phí retrieval | Ít access, cần nhanh khi cần |
| **One Zone-IA** | 11 nines nhưng 1 AZ | 1 | tức thì | Backup có thể tái tạo được |
| **Glacier Instant Retrieval** | 11 nines | ≥3 | ms | Archive access quý 1 lần |
| **Glacier Flexible Retrieval** | 11 nines | ≥3 | 1 phút – 12h | Archive, cũ là "Glacier" |
| **Glacier Deep Archive** | 11 nines | ≥3 | 12–48h | Compliance 7–10 năm, rẻ nhất |

**Mẹo thi:** từ khoá "cheapest + rarely access + OK wait hours" → **Deep Archive**. "Cheapest + access monthly + ms" → **Glacier Instant Retrieval**.

### Lưu ý khi thi
- **EBS** = block storage, gắn vào **1 EC2** (trừ io1/io2 Multi-Attach), **cùng AZ**.
- **EFS** = NFS, **multi-AZ**, share giữa nhiều EC2 Linux.
- **FSx for Windows** = SMB. **FSx for Lustre** = HPC. **FSx ONTAP** = NetApp. **FSx OpenZFS** = Linux NFS hiệu năng cao.
- **Instance Store** = ephemeral, mất khi stop/terminate — **không dùng** cho data cần giữ.
- **Lambda** max runtime **15 phút**, max 10GB memory, 10GB tmp, package 250MB unzipped.
- **Fargate** = serverless container, không quản EC2. **EKS** = managed Kubernetes.

### Lưu ý khi đi làm
- Luôn bật **EBS encryption by default** ở account level.
- Bật **S3 Block Public Access** ở account level → tránh leak.
- Bật **S3 Versioning + MFA Delete** cho bucket quan trọng.
- Spot chỉ nên dùng với workload **stateless, retryable**. Setup **Spot Fleet** + fallback On-Demand.
- Tag mọi resource (`Environment`, `Owner`, `CostCenter`) ngay từ ngày 1 → cost allocation về sau dễ hơn nhiều.

### Hands-on
- **Có account:** Launch `t2.micro` Amazon Linux 2023, SSH vào (Session Manager an toàn hơn SSH port 22), install nginx, terminate. Upload file lên S3, lifecycle → IA sau 30 ngày → Glacier sau 90 ngày.
- **No account:** LocalStack `awslocal s3 mb s3://test; awslocal s3 cp file.txt s3://test/`. Dùng Multipass/UTM làm EC2 giả để luyện SSH + user-data script.

---

## Tuần 4 — Network & Database

### Bài học
- [ ] Bài 13: VPC, Subnet, IGW, NAT GW, Route Table, SG vs NACL → [lessons/clf-c02/06-vpc.md](../lessons/clf-c02/06-vpc.md)
- [ ] Bài 14: Route 53, CloudFront, API Gateway, ELB (ALB/NLB/GLB).
- [ ] Bài 15: RDS, Aurora, DynamoDB, ElastiCache, Redshift, DocumentDB, Neptune, Timestream, QLDB → [lessons/clf-c02/07-databases.md](../lessons/clf-c02/07-databases.md)
- [ ] Bài 16: Direct Connect, Site-to-Site VPN, Transit Gateway, PrivateLink (khái niệm).

### Deep dive SG vs NACL
| | Security Group | NACL |
|--|---------------|------|
| Level | Instance (ENI) | Subnet |
| Stateful? | **Stateful** (reply tự allow) | **Stateless** (phải mở cả 2 chiều) |
| Rule | Chỉ **Allow** | Cả **Allow** và **Deny** |
| Evaluate | Tất cả rules | Theo **thứ tự số** rule |
| Default | Deny inbound, allow outbound | Allow all inbound + outbound |

### Deep dive Database lựa chọn
| Nhu cầu | Service |
|---------|---------|
| Relational, MySQL/PostgreSQL managed | **RDS** |
| Relational, hiệu năng cao, auto-scale storage | **Aurora** (5x MySQL, 3x PG) |
| Key-value/Document, single-digit ms, scale vô hạn | **DynamoDB** |
| In-memory cache | **ElastiCache** (Redis/Memcached) |
| Data warehouse, OLAP, PB-scale | **Redshift** |
| Document (MongoDB-compatible) | **DocumentDB** |
| Graph | **Neptune** |
| Time-series (IoT) | **Timestream** |
| Ledger bất biến | **QLDB** |

### Lưu ý khi thi
- **ALB** = L7 (HTTP/HTTPS, path/host routing). **NLB** = L4 (TCP/UDP, static IP, cực nhanh). **GLB** = L3 gateway cho third-party firewall.
- **Route 53 routing policies**: Simple, Weighted, Latency, Failover, Geolocation, Geoproximity, Multi-value.
- **CloudFront** cache ở Edge, giảm load origin, **HTTPS** end-to-end.
- **RDS Multi-AZ** = HA (failover tự động, **KHÔNG scale read**). **Read Replica** = scale read (async, có thể lag).
- **DynamoDB** = single-digit ms latency, **không cần VPC**.

### Lưu ý khi đi làm
- VPC nên thiết kế **multi-AZ** từ đầu: 3 public + 3 private + 3 DB subnet.
- **NAT Gateway** có phí **$0.045/h + $0.045/GB** → workload lớn cost có thể cao bất ngờ. Xem xét **VPC Endpoint** cho S3/DynamoDB để tránh qua NAT.
- KHÔNG mở SG `0.0.0.0/0` cho port 22/3389. Dùng **SSM Session Manager** hoặc **bastion + SG reference**.
- RDS luôn bật **Multi-AZ + automated backup + deletion protection** ở prod.

### Hands-on
- **Có account:** Tạo VPC 10.0.0.0/16, 2 AZ, 1 public + 1 private subnet mỗi AZ, IGW, NAT GW. Launch EC2 public, RDS MySQL free tier.
- **No account:** Vẽ diagram 3-tier (ALB → EC2 ASG → RDS Multi-AZ) trên Excalidraw. Chú thích từng SG cho phép port nào từ đâu.

---

## Tuần 5 — Billing, Pricing, Support, Management Tools

### Bài học
- [ ] Bài 17: AWS Pricing model, TCO Calculator, Pricing Calculator → [lessons/clf-c02/08-billing.md](../lessons/clf-c02/08-billing.md)
- [ ] Bài 18: AWS Organizations, Consolidated Billing, Control Tower, SCP, OU.
- [ ] Bài 19: Cost Explorer, Budgets, CUR (Cost & Usage Report), Savings Plans, Compute Optimizer.
- [ ] Bài 20: Support Plans (Basic, Developer, Business, Enterprise On-Ramp, Enterprise).
- [ ] Bài 21: CloudWatch, CloudTrail, Config, Systems Manager, Trusted Advisor, Health Dashboard.

### Deep dive Support Plans (cực hay ra)
| Plan | Giá/tháng | Response (prod down) | TAM | Trusted Advisor | Hỗ trợ third-party |
|------|-----------|---------------------|-----|-----------------|-------------------|
| **Basic** | $0 | Không | Không | 7 core | Không |
| **Developer** | $29+ | 12–24h business | Không | 7 core | Không |
| **Business** | $100+ (3% usage) | **< 1h** | Không | Full | Có (basic) |
| **Enterprise On-Ramp** | $5,500+ | < 30 phút | Pool TAM | Full | Có |
| **Enterprise** | $15,000+ | **< 15 phút** | Dedicated TAM | Full | Có (full) |

### Lưu ý khi thi
- **Free forever**: VPC, IAM, Organizations, Elastic Beanstalk (trả tiền resource bên trong thôi), CloudFormation, Auto Scaling.
- **Consolidated Billing** → volume discount tổng account, + share RI/Savings Plans.
- **SCP** = giới hạn quyền **tối đa** trong Organization, **KHÔNG grant quyền**, chỉ deny.
- **Control Tower** = tự động setup landing zone multi-account best-practice.
- **Cost Explorer** (phân tích quá khứ + forecast) ≠ **Budgets** (alert) ≠ **CUR** (CSV chi tiết xuất ra S3) ≠ **Billing Dashboard** (tổng quan).
- **Compute Optimizer** → gợi ý right-size EC2/EBS/Lambda/ASG.
- **AWS Pricing Calculator** (new, thay Simple Monthly Calculator) — ước tính chi phí trước khi deploy.
- **TCO Calculator** — so sánh cost on-prem vs AWS (giờ đã deprecated thành Migration Evaluator).

### Lưu ý khi đi làm
- Bật **Cost Anomaly Detection** (free) → alert khi có spike bất thường.
- Tag chuẩn từ đầu → CUR group theo tag → chia chi phí cho team.
- **Savings Plans** linh hoạt hơn RI (áp cho EC2 + Fargate + Lambda) → ưu tiên chọn Compute Savings Plan 1 năm no-upfront.
- Với multi-account: dùng **AWS Organizations + Control Tower + IAM Identity Center** làm nền tảng.

---

## Tuần 6 — Topics quan trọng còn lại (CLF-C02 đầy đủ)

> Đây là phần phủ các Task Statement của CLF-C02 mà 8 bài đầu chưa chạm tới. **Bắt buộc học** trước khi vào tuần 7 ôn tập.

### Design principles & Migration (Domain 1 còn lại)
- [ ] Bài 22: Well-Architected Framework — 6 pillar → [lessons/clf-c02/09-well-architected.md](../lessons/clf-c02/09-well-architected.md)
- [ ] Bài 23: Migration to AWS + CAF (7 R, Snow Family, MGN, DMS, SCT, DRS) → [lessons/clf-c02/10-migration-caf.md](../lessons/clf-c02/10-migration-caf.md)

### Compute & Storage mở rộng (Domain 3)
- [ ] Bài 24: Containers, Lambda, ASG, ELB → [lessons/clf-c02/11-compute-extended.md](../lessons/clf-c02/11-compute-extended.md)
- [ ] Bài 25: EBS, EFS, FSx, Storage Gateway, Backup, DRS → [lessons/clf-c02/12-storage-extended.md](../lessons/clf-c02/12-storage-extended.md)

### Deploy & Operate
- [ ] Bài 26: CLI, SDK, Console, IaC (CloudFormation/CDK/SAM), Systems Manager → [lessons/clf-c02/13-deploy-iac.md](../lessons/clf-c02/13-deploy-iac.md)

### Application Integration & AI/ML & Analytics (Domain 3.7, 3.8)
- [ ] Bài 27: SNS, SQS, EventBridge, Step Functions, MQ → [lessons/clf-c02/14-app-integration.md](../lessons/clf-c02/14-app-integration.md)
- [ ] Bài 28: SageMaker, Bedrock, Rekognition, Polly, Transcribe, Translate, Comprehend, Lex, Kendra, Personalize → [lessons/clf-c02/15-ai-ml.md](../lessons/clf-c02/15-ai-ml.md)
- [ ] Bài 29: Athena, Redshift, EMR, Glue, Kinesis, MSK, OpenSearch, QuickSight, Data Exchange, Lake Formation → [lessons/clf-c02/16-analytics.md](../lessons/clf-c02/16-analytics.md)

### Monitoring, Governance & Security mở rộng (Domain 2, 4)
- [ ] Bài 30: CloudWatch, CloudTrail, Config, X-Ray, Trusted Advisor, Compute Optimizer, Health Dashboard, Organizations, Control Tower, Service Catalog, Audit Manager → [lessons/clf-c02/17-monitoring-governance.md](../lessons/clf-c02/17-monitoring-governance.md)
- [ ] Bài 31: KMS, CloudHSM, Secrets Manager, ACM, Cognito, Directory Service, WAF, Shield, Network Firewall, GuardDuty, Inspector, Macie, Detective, Security Hub, RAM, Artifact → [lessons/clf-c02/18-security-extended.md](../lessons/clf-c02/18-security-extended.md)

### Other services (Domain 3.8 + 4.3)
- [ ] Bài 32: Dev Tools (Code*), WorkSpaces, AppStream, IoT Core, IoT Greengrass, Amplify, AppSync, Device Farm, SES, Connect, Activate, IQ, AMS, Marketplace, Partner Network, Solutions Architects → [lessons/clf-c02/19-other-services.md](../lessons/clf-c02/19-other-services.md)

---

## Tuần 7 — Ôn tập & Practice exam

- [ ] Review toàn bộ flashcard service (khoảng ~80 service hay ra).
- [ ] Làm **3 bộ practice exam**:
  - Tutorials Dojo (sát đề nhất, ~$15).
  - AWS Skill Builder "Official Practice Question Set" (free, 20 câu) + "Official Practice Exam" ($20).
  - ExamPro free practice.
- [ ] Review các câu sai, viết lại lý do đúng/sai vào file riêng.
- [ ] Target: **≥ 85%** 2 mock liên tiếp → đặt lịch thi.

### Checklist sẵn sàng thi
- [ ] Giải thích được 6 lợi thế của cloud (nguyên văn EN).
- [ ] Phân biệt Region / AZ / Edge Location / Local Zone.
- [ ] Vẽ Shared Responsibility với ví dụ EC2, S3, RDS, Lambda.
- [ ] Liệt kê 7 storage class S3 + use case.
- [ ] Phân biệt SG vs NACL (5 điểm khác nhau).
- [ ] So sánh 4 EC2 pricing (On-Demand, RI, Savings, Spot).
- [ ] So sánh 5 Support Plans về giá + SLA + TAM + TA.
- [ ] Phân biệt Cost Explorer / Budgets / CUR / Pricing Calculator.
- [ ] Nêu 5 dịch vụ security + mục đích (GuardDuty, Inspector, Macie, Shield, WAF).
- [ ] Làm practice exam ≥ 85% 2 bộ liên tiếp.

### Tài nguyên miễn phí (ưu tiên)
- **AWS Skill Builder**: "AWS Cloud Practitioner Essentials" — free, ~7h, chính chủ AWS.
- **FreeCodeCamp YouTube**: Andrew Brown CLF-C02 full course (~14h free).
- **ExamPro**: CLF-C02 free course + practice exam.
- **Tutorials Dojo cheat sheets**: https://tutorialsdojo.com/aws-cheat-sheets/ — free.
- **AWS Whitepapers bắt buộc đọc**:
  - *Overview of Amazon Web Services*
  - *AWS Well-Architected Framework* (6 pillars)
  - *How AWS Pricing Works*

### Tài nguyên paid đáng mua
- **Tutorials Dojo Practice Exam CLF-C02** (~$15) — sát đề nhất.
- **Stephane Maarek Udemy CLF-C02** (~$15 khi sale).

---

## Sau khi đậu CLF — cần làm gì trước khi học SAA?
1. **Nghỉ 1–2 tuần** cho não reset.
2. Cài **AWS CLI** + setup IAM user + làm thật ít nhất 3 mini-project:
   - Static website trên S3 + CloudFront.
   - Serverless API (Lambda + API Gateway + DynamoDB).
   - 3-tier web (VPC + ALB + EC2 ASG + RDS).
3. Đọc qua [saa-c03.md](saa-c03.md) để thấy mức độ sâu hơn CLF.
