# Bài 19 — Dev Tools, End-User Computing, IoT, Frontend, Business Apps, Customer Engagement & Partner

> Map exam: **CLF-C02 Task 3.8 (other in-scope categories)** + **Task 4.3 (Support & Partner)**. Đây là "lesson dọn dẹp" — phủ những service còn lại trong scope mà các bài trước chưa chạm.

## 1. Mục tiêu
Sau bài này bạn có thể:
- Liệt kê **AWS Developer Tools** (CI/CD + IDE).
- Phân biệt **WorkSpaces / AppStream / WorkSpaces Web** trong End-User Computing.
- Hiểu **IoT Core, IoT Greengrass**.
- Phân biệt **Amplify, AppSync, Device Farm** trong Frontend/Mobile.
- Hiểu **SES, Connect** trong Business Applications.
- Hiểu vai trò **AWS Partner Network, AWS Marketplace, AWS IQ, Activate, AMS, Professional Services**.

---

## 2. Lý thuyết

### 2.1 AWS Developer Tools (CI/CD + IDE)

Bộ tools phục vụ DevOps lifecycle code → build → deploy → monitor.

| Service | Mục đích | Tương đương |
|---------|---------|-------------|
| **AWS CodeCommit** | Git repository managed | GitHub (private) — **đang sunset 2024**, new account không tạo được |
| **AWS CodeArtifact** | Artifact repository (npm, Maven, PyPI, NuGet) | Artifactory, Nexus |
| **AWS CodeBuild** | Managed build server (CI) | Jenkins, GitHub Actions |
| **AWS CodeDeploy** | Deploy code lên EC2 / ECS / Lambda / on-prem | Octopus Deploy |
| **AWS CodePipeline** | CI/CD orchestration pipeline | GitHub Actions, Jenkins Pipeline |
| **AWS CodeStar** | Wizard tạo project + Code* services | (đang deprecate 2024) |
| **AWS Cloud9** | Web-based IDE (collaborative) | VS Code Online (đang deprecate cho user mới 2024) |
| **AWS CloudShell** | Terminal trong browser, AWS CLI sẵn | (no equivalent direct) |
| **AWS AppConfig** | Feature flag + dynamic config | LaunchDarkly |
| **AWS X-Ray** | Distributed tracing | Jaeger, Honeycomb |
| **Amazon Q Developer** | AI code assistant (formerly CodeWhisperer) | GitHub Copilot |

**Lưu ý**: AWS đang **deprecate** CodeCommit, CodeStar, Cloud9 cho **new customer** (2024). Existing customer vẫn dùng được. Đề CLF v1.0 (2023) vẫn hỏi.

**Pipeline ví dụ**:
```
Code → CodeCommit / GitHub
        │
        ▼
CodeBuild (test + compile + Docker build)
        │
        ▼
CodeArtifact (lưu artifact)
        │
        ▼
CodeDeploy (deploy ECS/Lambda/EC2)
        │
        ▼
Production
        ▲
        │ (orchestrated by)
CodePipeline
```

---

### 2.2 End-User Computing (EUC)

| Service | Mục đích | Khi nào |
|---------|---------|---------|
| **Amazon WorkSpaces** | **Cloud desktop** Windows/Linux (DaaS - Desktop as a Service) | Thay laptop cho remote worker, contractor |
| **Amazon WorkSpaces Web** | Web-based isolated browser | Truy cập web internal an toàn từ browser ngoài |
| **Amazon AppStream 2.0** | **Stream desktop application** (1 app, không phải full OS) | Stream CAD/Photoshop cho user mọi nơi |
| **Amazon WorkDocs** | File share/sync (deprecated 2024) | — |

**WorkSpaces vs AppStream**:
- **WorkSpaces** = full Windows/Linux desktop (giống VDI).
- **AppStream** = 1 app streamed (giống Citrix XenApp).

---

### 2.3 Internet of Things (IoT)

| Service | Mục đích |
|---------|---------|
| **AWS IoT Core** | Connect & manage **billions of device**, MQTT/HTTPS pub/sub, device shadow, rules engine |
| **AWS IoT Greengrass** | Edge runtime — chạy Lambda/ML model trên device IoT khi mất Internet |
| **AWS IoT Analytics** | Analytics chuyên cho IoT data (deprecated 2024) |
| **AWS IoT SiteWise** | Industrial data ingest từ PLC/SCADA |
| **AWS IoT FleetWise** | Vehicle telemetry |
| **AWS IoT TwinMaker** | Digital twin |
| **AWS IoT Events** | Detect event từ IoT signal |
| **AWS IoT Device Defender** | Audit + security IoT device |
| **AWS IoT Device Management** | Onboard, monitor, OTA update device |

**In-scope cho CLF**: **IoT Core** + **Greengrass** (theo exam guide).

---

### 2.4 Frontend Web & Mobile

| Service | Mục đích |
|---------|---------|
| **AWS Amplify** | Full-stack mobile/web platform: hosting + CI/CD + auth (Cognito) + API (AppSync) + storage (S3) |
| **AWS AppSync** | Managed **GraphQL** API (real-time + offline sync) |
| **AWS Device Farm** | Test mobile app trên **real device** (iPhone, Android) cloud |
| **Amazon Pinpoint** | Push notification + email + SMS campaign + analytics |

**Amplify vs Beanstalk**:
- **Amplify** = full-stack frontend (React/Vue/Next.js + auth + API) + auto deploy từ Git.
- **Beanstalk** = backend web app PaaS.

---

### 2.5 Business Applications

| Service | Mục đích |
|---------|---------|
| **Amazon Simple Email Service (SES)** | Send bulk email (transactional + marketing), inbound email |
| **Amazon Connect** | Cloud **contact center / call center** (omnichannel), tích hợp Lex + Polly + Transcribe |
| **Amazon Chime** | Video meeting + chat + voice (giống Zoom/Teams) |
| **Amazon WorkMail** | Managed email + calendar (giống Exchange/Gmail) |
| **Amazon Honeycode** | No-code app builder (đang sunset) |

**SES** — pricing $0.10 / 1k email outbound, miễn phí 62k email/tháng nếu gửi từ EC2.

**Connect** — pay per minute call, không subscribe fixed.

---

### 2.6 Customer Engagement (in-scope explicit ở task 3.8)

| Service | Mục đích |
|---------|---------|
| **AWS Activate for Startups** | Chương trình credit AWS cho startup ($1k–$100k credit + support + technical guidance) |
| **AWS IQ** | Marketplace freelance AWS-certified expert ngắn hạn |
| **AWS Managed Services (AMS)** | AWS quản lý operation production của bạn (24/7), enterprise |
| **AWS Support** | 5 tier plan (Basic/Developer/Business/Enterprise On-Ramp/Enterprise) — đã học bài 8 |

**Phân biệt**:
- **Activate** = startup, credit + tech guide.
- **IQ** = thuê freelancer ngắn hạn (1 task).
- **AMS** = AWS-as-a-service vận hành cho enterprise.
- **Professional Services (ProServe)** = AWS team tư vấn dài hạn cho enterprise.

---

### 2.7 AWS Partner Network (APN)

**APN** = ecosystem partner.

**3 loại partner**:
- **Consulting Partner** — System Integrator (SI), tư vấn migrate, build.
- **Technology Partner / ISV** — Independent Software Vendor, bán product trên AWS Marketplace.
- **Training Partner** — đào tạo AWS certification.

**Partner tier**: Registered → Select → Advanced → Premier.

**Benefits**: training, certification, partner events, **volume discount**.

---

### 2.8 AWS Marketplace

- **Marketplace 3rd-party software** (AMI, container, SaaS, dataset, professional service).
- Vendor như Trend Micro, Palo Alto, MongoDB, Snowflake.
- Billing đi qua AWS (1 bill).
- **Private offers** — negotiated price cho enterprise.
- **Free trial** + **BYOL** support.

**Khác Data Exchange** — Data Exchange chỉ dataset, Marketplace là software + service + data.

---

### 2.9 AWS Professional Services (ProServe)

- **AWS team consulting** — kiến trúc, migration, training, run book.
- Project-based, paid.
- Phù hợp enterprise migration lớn (cùng MAP — Migration Acceleration Program).

---

### 2.10 AWS Solutions Architects

- **Pre-sales technical resource** từ AWS, **free** (kèm AWS account).
- Khi đang explore architecture có thể đặt lịch.
- Khác ProServe (paid project) và AWS IQ (freelance).

---

### 2.11 AWS technical resources & community

In-scope của **Task 4.3**:

| Resource | Mục đích |
|----------|---------|
| **AWS Whitepapers** | docs.aws.amazon.com/whitepapers — read 5–10 cái cốt lõi (WAF, security, pricing, …) |
| **AWS Blog** | aws.amazon.com/blogs/aws — announcement |
| **AWS Security Blog** | aws.amazon.com/blogs/security — security best practice |
| **AWS Knowledge Center** | repost.aws — Q&A đã giải |
| **AWS re:Post** | repost.aws — community Q&A (thay forum cũ) |
| **AWS Prescriptive Guidance** | aws.amazon.com/prescriptive-guidance — pattern + reference architecture |
| **AWS Security Center** | aws.amazon.com/security — Security info hub |
| **AWS Support Center** | console.aws.amazon.com/support — open ticket |
| **AWS Trust & Safety team** | report abuse từ AWS (spam, hack, …) |
| **AWS Solutions Architects** | pre-sales technical helper, free |
| **AWS Professional Services** | paid consulting |
| **AWS Training & Certification** | aws.amazon.com/training, Skill Builder, certification |

---

### 2.12 So sánh nhanh — chọn service nào

| Tình huống | Service |
|------------|---------|
| Build CI/CD pipeline native AWS | **CodePipeline + CodeBuild + CodeDeploy** |
| Quản artifact npm/Maven | **CodeArtifact** |
| Web IDE collaborative | **Cloud9** (deprecating new user) |
| Terminal AWS trong browser | **CloudShell** |
| Distributed tracing | **X-Ray** |
| AI code autocomplete | **Amazon Q Developer** |
| Feature flag + dynamic config | **AWS AppConfig** |
| Cloud Windows desktop cho remote | **WorkSpaces** |
| Stream 1 app (CAD) cho user mọi nơi | **AppStream 2.0** |
| Browser isolated cho truy cập web internal | **WorkSpaces Web** |
| Connect 1M IoT device | **IoT Core** |
| Edge compute cho IoT mất Internet | **IoT Greengrass** |
| Full-stack mobile/web với auth + API + hosting | **Amplify** |
| Managed GraphQL real-time | **AppSync** |
| Test mobile app trên real device | **Device Farm** |
| Push notification + SMS campaign | **Pinpoint** |
| Send bulk transactional email | **SES** |
| Cloud contact center | **Connect** |
| Video meeting | **Chime** |
| Email + calendar managed | **WorkMail** |
| Startup credit AWS | **Activate** |
| Thuê freelancer AWS-cert ngắn hạn | **AWS IQ** |
| AWS quản lý prod 24/7 | **AMS** |
| 3rd-party software AMI / SaaS | **AWS Marketplace** |
| Dataset third-party | **Data Exchange** |
| Pre-sales architect help free | **AWS Solutions Architects** |
| Paid consulting migrate | **AWS Professional Services** |
| Community Q&A | **AWS re:Post** |

---

## 3. Hands-on có account

### Lab 1 — CodePipeline đơn giản (45 phút)
1. GitHub repo (hoặc CodeCommit nếu account cũ) với 1 Lambda function.
2. CodePipeline → source GitHub → build CodeBuild → deploy CodeDeploy (Lambda).
3. Commit code → pipeline tự chạy.

### Lab 2 — Amplify hosting (30 phút)
1. Amplify Console → Host web app → connect GitHub repo Next.js.
2. Amplify tự build + deploy. URL https://main.xxx.amplifyapp.com.
3. Commit → auto re-deploy.

### Lab 3 — SES sandbox + send email (15 phút)
1. SES → verify email identity (your email).
2. Send test email từ console → vào inbox.
3. (Production access cần request riêng.)

### Lab 4 — Connect contact center (1h)
1. Connect → Create instance → claim 1 phone number (chỉ US/UK free trial).
2. Tạo contact flow → answer → play Polly message → route to queue.
3. Gọi vào số → nghe Polly.

---

## 4. Hands-on không tốn tiền

### Option A — Skill Builder
- "Introduction to AWS Developer Tools" (free, 1h).
- "Introduction to AWS Amplify" (free).

### Option B — AWS Activate
- Nếu là startup, apply credit AWS Activate (https://aws.amazon.com/activate).

### Option C — AWS re:Post explore
- repost.aws → đọc top question tuần — học pattern thực tế.

---

## 5. Tự kiểm tra (có đáp án)

1. Đề: *"CI/CD pipeline native AWS deploy Lambda từ Git commit."*
   <details><summary>Trả lời</summary>**CodePipeline + CodeBuild + CodeDeploy**.</details>

2. Đề: *"Stream Photoshop cho 100 designer remote không cần cài máy."*
   <details><summary>Trả lời</summary>**Amazon AppStream 2.0**.</details>

3. Đề: *"Cloud Windows desktop thay laptop cho contractor."*
   <details><summary>Trả lời</summary>**Amazon WorkSpaces**.</details>

4. Đề: *"Connect 1M smart sensor đẩy data về AWS với MQTT."*
   <details><summary>Trả lời</summary>**AWS IoT Core**.</details>

5. Đề: *"Run Lambda model ML trên Raspberry Pi khi mất Internet."*
   <details><summary>Trả lời</summary>**AWS IoT Greengrass**.</details>

6. Đề: *"Full-stack hosting React app + auth + API."*
   <details><summary>Trả lời</summary>**AWS Amplify** (tích hợp Cognito + AppSync + S3 + CloudFront).</details>

7. Đề: *"Send 100k transactional email/ngày từ app."*
   <details><summary>Trả lời</summary>**Amazon SES**.</details>

8. Đề: *"Cloud call center cho 50 agent, tự động phân route."*
   <details><summary>Trả lời</summary>**Amazon Connect**.</details>

9. Đề: *"Test mobile app trên iPhone + Samsung thực."*
   <details><summary>Trả lời</summary>**AWS Device Farm**.</details>

10. Đề: *"Thuê AWS expert freelance 5h fix CloudFormation."*
    <details><summary>Trả lời</summary>**AWS IQ**.</details>

11. Đề: *"AWS quản production 24/7 cho enterprise (NOC managed)."*
    <details><summary>Trả lời</summary>**AWS Managed Services (AMS)**.</details>

12. Đề: *"Buy Palo Alto firewall AMI để launch trong VPC."*
    <details><summary>Trả lời</summary>**AWS Marketplace**.</details>

13. Đề: *"Startup mới gọi vốn seed, muốn credit AWS."*
    <details><summary>Trả lời</summary>**AWS Activate for Startups**.</details>

14. Đề: *"Pre-sales architect AWS help free."*
    <details><summary>Trả lời</summary>**AWS Solutions Architects** (đi kèm AWS account).</details>

15. Đề: *"Managed GraphQL API real-time cho mobile app."*
    <details><summary>Trả lời</summary>**AWS AppSync**.</details>

---

## 6. Đối chiếu GCP & Azure

| Service | AWS | GCP | Azure |
|---------|-----|-----|-------|
| Git | CodeCommit (deprecating) | Cloud Source Repositories | Azure Repos |
| CI build | CodeBuild | Cloud Build | Azure Pipelines |
| Artifact | CodeArtifact | Artifact Registry | Azure Artifacts |
| Deploy | CodeDeploy | Cloud Deploy | Azure Pipelines |
| Pipeline | CodePipeline | Cloud Build / Workflows | Azure Pipelines / DevOps |
| IDE | Cloud9 (deprecating) | Cloud Shell Editor | (no equivalent) |
| Cloud desktop | WorkSpaces | Cloud Workstations | Windows 365 / AVD |
| App streaming | AppStream | (no direct) | Azure Virtual Desktop |
| IoT | IoT Core / Greengrass | IoT Core (deprecated 2024) / Edge | IoT Hub / IoT Edge |
| Full-stack | Amplify | Firebase | Static Web Apps |
| GraphQL | AppSync | Apollo on Cloud Run | (via Apollo) |
| Email send | SES | (via partners SendGrid) | (via Communication Services) |
| Contact center | Connect | Contact Center AI | Dynamics 365 |
| Marketplace | AWS Marketplace | Google Cloud Marketplace | Azure Marketplace |

---

## 7. Lưu ý khi thi CLF-C02

- **Code* tools** chuỗi: CodeCommit (git), CodeBuild (build), CodeDeploy (deploy), CodePipeline (pipeline), CodeArtifact (artifact), CodeStar (wizard).
- **WorkSpaces = full desktop**, **AppStream = 1 app stream**, **WorkSpaces Web = browser isolated**.
- **IoT Core = pub/sub MQTT cho device**, **Greengrass = edge runtime**.
- **Amplify = full-stack hosting**, **AppSync = managed GraphQL**, **Device Farm = test real device**.
- **SES = email**, **Connect = contact center**, **Chime = meeting**, **WorkMail = email/calendar**.
- **Activate (startup) / IQ (freelance) / AMS (managed ops) / ProServe (consulting paid) / Solutions Architects (pre-sales free)**.
- **Marketplace = software third-party**, **Data Exchange = data third-party**, **APN = partner ecosystem**.
- **AWS technical resources**: Whitepaper, Blog, Knowledge Center, re:Post, Prescriptive Guidance, Security Center, Support Center.

## 8. Lưu ý khi thi SAA-C03 (sâu hơn)

- **CodeDeploy strategies**: in-place, blue/green, canary, linear.
- **AppSync resolvers** + DynamoDB direct.
- **IoT rules engine** route message → Lambda/SQS/Kinesis.
- **Connect + Lex** chatbot integration.

## 9. Lưu ý khi đi làm

- **Native AWS Code* tools** đang bị thay thế bởi **GitHub Actions** + **Terraform** + **CloudFormation** trong nhiều team — đừng đầu tư sâu nếu start mới.
- **Amplify** rất tốt cho MVP startup (Next.js + auth + API + hosting trong 1 ngày).
- **SES production access** cần request — sandbox chỉ gửi đến verified email.
- **AppStream / WorkSpaces** đắt — chỉ bật khi cần (mỗi user $20–$50/tháng).
- **Marketplace private offer** + AWS Marketplace billing → tiết kiệm thủ tục mua software enterprise.
- **AWS IQ** rất tiện cho 1 task ngắn (vd "fix Terraform module này" $200).
- **Solutions Architect free** — đặt lịch khi đang explore architecture phức tạp.

---

## 10. Flashcard

- **Code* tools**: CodeCommit (git, sunset), CodeBuild (CI), CodeDeploy (deploy), CodePipeline (orchestrate), CodeArtifact (artifact), CodeStar (wizard, sunset).
- **Cloud9** (web IDE, sunset), **CloudShell** (browser terminal).
- **AppConfig** — feature flag.
- **Q Developer** — AI code autocomplete (formerly CodeWhisperer).
- **WorkSpaces** — cloud Windows/Linux desktop.
- **AppStream 2.0** — stream 1 app.
- **WorkSpaces Web** — browser isolated.
- **IoT Core** — MQTT pub/sub device.
- **IoT Greengrass** — edge runtime offline.
- **Amplify** — full-stack web/mobile.
- **AppSync** — managed GraphQL real-time.
- **Device Farm** — test mobile real device.
- **Pinpoint** — push/SMS/email campaign.
- **SES** — bulk email.
- **Connect** — cloud contact center.
- **Chime** — video meeting.
- **WorkMail** — managed email/calendar.
- **Activate** — startup credit.
- **AWS IQ** — freelance.
- **AMS** — managed operations.
- **ProServe** — paid consulting.
- **Solutions Architects** — pre-sales free.
- **AWS Partner Network (APN)** — consulting / ISV / training partner, tier Registered/Select/Advanced/Premier.
- **AWS Marketplace** — 3rd-party software/SaaS.
- **AWS Data Exchange** — 3rd-party data.
- **AWS resources**: Whitepapers, Blog, Knowledge Center, re:Post, Prescriptive Guidance, Security Center, Support Center, Trust & Safety.
