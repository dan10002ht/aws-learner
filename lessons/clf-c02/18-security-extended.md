# Bài 18 — Security mở rộng (KMS, Secrets Manager, ACM, Cognito, Directory Service, WAF/Shield, GuardDuty, Inspector, Macie, Detective, Security Hub, Network Firewall, Firewall Manager, RAM, Artifact)

> Map exam: **CLF-C02 Task 2.2 + 2.4 + 2.3**. Bài 3 đã học IAM. Bài 6 đã học SG/NACL. Bài này phủ phần còn lại của Security category.

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân biệt **KMS / CloudHSM / Secrets Manager / Parameter Store / ACM**.
- Phân biệt **Cognito** vs **IAM** vs **Directory Service** vs **IAM Identity Center**.
- Hiểu **defense in depth**: WAF / Shield / Network Firewall / Firewall Manager.
- Phân biệt **GuardDuty / Inspector / Macie / Detective / Security Hub**.
- Hiểu **RAM, Artifact, Audit Manager** cho compliance.

---

## 2. Lý thuyết

### 2.0 Sơ đồ tổng — security stack 6 nhóm dịch vụ

Defense in depth là **bọc nhiều lớp quanh dữ liệu**: 4 vòng phòng thủ lồng nhau từ ngoài vào lõi — Edge → Network → Identity → Data (kẻ tấn công phải xuyên hết vòng ngoài mới chạm lõi). Riêng **Detect** (phát hiện) và **Audit** (kiểm toán) không phải một vòng phải đi xuyên qua, mà là **dải cắt ngang** quan sát/quản trị bao trùm mọi vòng.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Defense in depth trên AWS — 4 vòng phòng thủ lồng nhau cùng Detect và Audit cắt ngang</title>
  <desc>Bốn vòng phòng thủ lồng nhau từ ngoài vào lõi: Edge (WAF, Shield, CloudFront, Route 53) bọc Network (VPC, SG, NACL, Network Firewall, Firewall Manager) bọc Identity (IAM, IAM Identity Center, Cognito, Directory Service) bọc lõi trong cùng Data (KMS, CloudHSM, Secrets Manager, ACM, Macie). Hai dải dọc cắt ngang mọi vòng: Detect (GuardDuty, Inspector, Detective, Security Hub) phát hiện và phản ứng; Audit (Artifact, Audit Manager) kiểm toán và tuân thủ.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Defense in depth — 4 vòng bọc lõi + Detect &amp; Audit cắt ngang</text>

  <g stroke="currentColor" fill="none">
    <rect x="40" y="44" width="492" height="340" rx="16" fill="#3b82f6" fill-opacity="0.13" stroke-opacity="0.22"/>
    <rect x="80" y="84" width="412" height="260" rx="14" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.22"/>
    <rect x="120" y="124" width="332" height="180" rx="12" fill="#f59e0b" fill-opacity="0.15" stroke-opacity="0.22"/>
    <rect x="170" y="174" width="232" height="80" rx="10" fill="#10b981" fill-opacity="0.18" stroke-opacity="0.3"/>
  </g>

  <text x="52" y="62" font-size="12.5" font-weight="700" fill="currentColor">Edge — Biên (vòng ngoài cùng)</text>
  <text x="52" y="78" font-size="10.5" fill="currentColor" opacity="0.7">WAF · Shield · CloudFront · Route 53</text>

  <text x="92" y="102" font-size="12.5" font-weight="700" fill="currentColor">Network — Mạng</text>
  <text x="92" y="118" font-size="10.5" fill="currentColor" opacity="0.7">VPC · SG · NACL · Network Firewall · Firewall Manager</text>

  <text x="132" y="142" font-size="12.5" font-weight="700" fill="currentColor">Identity — Danh tính</text>
  <text x="132" y="158" font-size="10.5" fill="currentColor" opacity="0.7">IAM · IAM Identity Center · Cognito · Directory Service</text>

  <text x="286" y="207" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Data — Lõi dữ liệu</text>
  <text x="286" y="223" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.78">KMS · CloudHSM · Secrets</text>
  <text x="286" y="237" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.78">Manager · ACM · Macie</text>

  <g>
    <rect x="548" y="44" width="74" height="340" rx="12" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="5 4"/>
    <text x="585" y="206" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor" transform="rotate(-90 585 206)">Detect — Phát hiện</text>
    <text x="585" y="370" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.72">GuardDuty</text>
  </g>
  <g>
    <rect x="630" y="44" width="74" height="340" rx="12" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="5 4"/>
    <text x="667" y="206" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor" transform="rotate(-90 667 206)">Audit — Kiểm toán</text>
    <text x="667" y="370" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.72">Artifact</text>
  </g>

  <text x="585" y="400" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">Inspector · Detective · Security Hub</text>
  <text x="667" y="414" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">Audit Manager</text>
  <text x="40" y="408" font-size="10" fill="currentColor" opacity="0.6">Tấn công phải xuyên Edge → Network → Identity mới chạm lõi Data.</text>
</svg>

---

### 2.1 Identity services — 4 cái hay nhầm

| Service | Dành cho | Mục đích |
|---------|----------|----------|
| **IAM** | **AWS user / role** | Quản quyền AWS API |
| **IAM Identity Center** | **Nhân viên** đăng nhập AWS multi-account | SSO, federation |
| **Amazon Cognito** | **End user của app bạn build** | User pool (sign-up/sign-in), Identity pool (federated → AWS resource) |
| **AWS Directory Service** | **Microsoft Active Directory** | Managed AD, join domain |

**Khi đọc đề**:
- "user của AWS console" → **IAM** / **Identity Center**.
- "user của mobile/web app bạn build" → **Cognito**.
- "Active Directory cho EC2 Windows / RDS SQL Server" → **Directory Service**.

#### Amazon Cognito — sâu

- **User Pools** — directory user của app (sign-up, sign-in, MFA, social login Facebook/Google/Apple, SAML).
- **Identity Pools (Federated Identities)** — đổi token (Cognito/Google/Facebook/SAML) → **temporary AWS credentials** truy cập AWS resource (S3, DynamoDB).
- **Hosted UI** — login page có sẵn.
- Tích hợp Lambda trigger (pre-sign-up, post-confirmation, …).

#### AWS Directory Service — 3 loại

| Loại | Mô tả |
|------|------|
| **AWS Managed Microsoft AD** | Real AD (Windows Server) managed AWS. Trust với on-prem AD. |
| **AD Connector** | Proxy redirect AD query về on-prem AD. |
| **Simple AD** | Samba-based, cheap, limited features (cho test/dev). |

---

### 2.2 KMS, CloudHSM, ACM — encryption keys & cert

#### AWS KMS (Key Management Service)
- **Managed encryption key** (FIPS 140-2 Level 3 với HSM bên dưới).
- **CMK / KMS Key** — 3 loại:
  - **AWS managed** (`aws/s3`, `aws/ebs`, …) — AWS quản, free.
  - **Customer managed** — bạn tạo, $1/key/tháng + API call.
  - **AWS owned** — invisible, AWS tự quản (vd cho DynamoDB encryption default).
- **Symmetric** (AES-256) hoặc **Asymmetric** (RSA/ECC).
- **Auto rotation** annually.
- **Key policy** + IAM policy + grants.
- **Multi-region key** (2021) — replicate key qua region.

#### AWS CloudHSM
- **Dedicated hardware HSM** trong VPC, single-tenant.
- **FIPS 140-2 Level 3** đầy đủ.
- Bạn quản key, AWS không nhìn được.
- Đắt ($1.45/h ≈ $1000/tháng).
- Use case: compliance đòi single-tenant HSM (banking, healthcare).

**KMS vs CloudHSM**:
- KMS = multi-tenant managed, đơn giản, đủ cho 99% case.
- CloudHSM = single-tenant, control hoàn toàn, expensive.

#### AWS Certificate Manager (ACM)
- **TLS/SSL cert miễn phí** cho domain bạn own.
- Auto-renew.
- Tích hợp **ALB / NLB / CloudFront / API Gateway**.
- Cert public hoặc private (ACM Private CA — đắt, có hierarchy CA).
- ❌ Không xuất cert ra file (trừ Private CA).

---

### 2.3 Secrets Manager vs Parameter Store

| Feature | **Secrets Manager** | **SSM Parameter Store** |
|---------|---------------------|--------------------------|
| Auto rotation | ✅ Built-in (RDS, Aurora, Redshift, DocumentDB; custom Lambda cho khác) | ❌ Phải tự code Lambda |
| Pricing | $0.40/secret/tháng + API | Standard tier **free** (10k param) |
| Cross-region replication | ✅ | ❌ |
| Versioning | ✅ | ✅ |
| Encryption | KMS | KMS (SecureString type) |
| Generate password | ✅ | ❌ |
| Use case | RDS password rotate tự động, API key có rotation | Config app (DB host, feature flag), secret đơn giản |

**Mẹo**: Cần rotate? → **Secrets Manager**. Cần rẻ? → **Parameter Store**.

---

### 2.4 Edge defense — WAF, Shield, Network Firewall, Firewall Manager

#### AWS WAF (Web Application Firewall) — L7
- Bảo vệ ALB / CloudFront / API Gateway / AppSync khỏi **L7 attack**: SQLi, XSS, scrape, bot.
- **Rules**: managed (AWS, third-party) hoặc custom.
- **Rate-based rule** — block IP gửi quá nhiều request.
- **Bot Control**, **Account takeover prevention**.
- Tính tiền per rule + request.

#### AWS Shield — DDoS
- **Standard** — **free auto cho mọi account**, chống **L3/L4 DDoS** (SYN flood, UDP reflection).
- **Advanced** — **$3,000/tháng** (1 năm cam kết), chống L3/L4/L7, có **DDoS Response Team (DRT)** 24/7, **cost protection** (AWS hoàn tiền scale-out chi phí khi bị attack), Global Threat Environment Dashboard.

#### AWS Network Firewall
- **Stateful firewall ở VPC**, tích hợp với Suricata IDS/IPS rule.
- Bảo vệ traffic **trong VPC** (Internet → VPC, VPC → VPC, VPC → on-prem).
- Khác SG/NACL: Network Firewall **stateful + deep packet inspection** + IPS rule.
- Khác WAF: Network Firewall L3/L4 cho VPC traffic, WAF L7 cho web app.

#### AWS Firewall Manager
- **Quản WAF + Shield Advanced + Network Firewall + SG + DNS Firewall multi-account** qua Organizations.
- Apply policy 1 chỗ → áp ra tất cả account.
- Compliance audit (vd "tất cả ALB phải có WAF với rule X").

---

### 2.5 Detect & respond services

#### Amazon GuardDuty
- **Threat detection** dùng ML + threat intel.
- Phân tích **VPC Flow Logs, DNS query log, CloudTrail, EKS audit log, S3 data event, RDS login, Lambda Network**.
- Tìm: instance bị mine crypto, port scan, brute force SSH, communicate C&C server.
- Free 30 ngày trial, sau đó pay per GB log analyzed.

#### Amazon Inspector
- **Vulnerability scan**:
  - **EC2** — OS + package CVE.
  - **ECR container image** — package CVE.
  - **Lambda** — code + dependency CVE.
- Continuous scan, không cần schedule.
- Findings prioritize theo severity.

#### Amazon Macie
- **Phát hiện PII / sensitive data trong S3** (SSN, credit card, passport, …) bằng ML.
- Output finding + dashboard.
- Use case: GDPR audit, biết bucket nào chứa PII không nên public.

#### Amazon Detective
- **Investigate root cause** sau khi có alert.
- Visualize relationship: IAM principal ↔ resource ↔ network ↔ behavior change.
- Tự collect VPC Flow + CloudTrail + GuardDuty.

#### AWS Security Hub
- **Aggregator findings** từ GuardDuty, Inspector, Macie, Firewall Manager, IAM Access Analyzer, third-party.
- Check **security standard** (CIS, PCI DSS, AWS Foundational Best Practices).
- Cross-account aggregation.
- Output → EventBridge → SOAR (Splunk, PagerDuty).

**Phân biệt 5 service trên**:
- **GuardDuty** = threat detection (anomaly).
- **Inspector** = vulnerability scan (CVE).
- **Macie** = data discovery (PII trong S3).
- **Detective** = investigate root cause.
- **Security Hub** = aggregator dashboard.

---

### 2.6 AWS Resource Access Manager (RAM)

- **Share resource cross-account** mà không copy:
  - VPC subnet, Transit Gateway, Route 53 Resolver rule, License Manager license, …
- Tích hợp Organizations để share trong org.
- Use case: 1 VPC center share cho nhiều account dev/test/prod cùng dùng.

---

### 2.7 AWS Artifact

- **Compliance docs portal** — download report:
  - SOC 1/2/3, ISO 27001/27017/27018, PCI DSS, HIPAA BAA, FedRAMP.
- Free, trong console.
- Gửi cho auditor / customer.

---

### 2.8 AWS Audit Manager (re-cap từ bài 17)

- Tự collect evidence cho audit framework.
- Khác Artifact: Artifact = report AWS có sẵn cho **AWS infrastructure**. Audit Manager = audit **workload bạn build** trên AWS.

---

### 2.9 Encryption in transit vs at rest

**Skill bullet trong task 2.2** đề cập rõ:

| Loại | Mục đích | AWS service |
|------|---------|-------------|
| **In transit** | Bảo vệ data đi qua mạng | TLS (ACM), VPN, IPsec, Direct Connect MACsec |
| **At rest** | Bảo vệ data trên đĩa | KMS encrypt EBS, S3 SSE, RDS storage, DynamoDB, EFS, FSx |

**Đề bẫy**: "encrypt data at rest in S3" → **SSE-S3** / **SSE-KMS** / **SSE-C** / **DSSE-KMS**.
"encrypt data in transit" → **HTTPS / TLS** (ACM cert).

---

### 2.10 Penetration testing trên AWS

- AWS cho phép **pen test** một số service (EC2, RDS, CloudFront, API Gateway, Lambda, …) **mà KHÔNG cần xin phép trước**.
- DDoS test và load test cần **xin phép AWS** (vì có thể nhầm là attack).
- Hợp đồng AWS Customer Agreement quy định rõ.

---

## 3. Hands-on có account

### Lab 1 — KMS encrypt EBS (15 phút)
1. KMS → Create CMK → symmetric.
2. EC2 → Launch instance → EBS section → encrypt với CMK vừa tạo.
3. Snapshot → kiểm tra encrypted = true.

### Lab 2 — Secrets Manager rotate RDS password (30 phút)
1. RDS → create db.t3.micro MySQL.
2. Secrets Manager → store new secret → RDS credentials → chọn DB.
3. Bật rotation 30 ngày.
4. Code Lambda → đọc secret runtime thay vì hardcode.

### Lab 3 — ACM cert + ALB (20 phút)
1. ACM → request public cert → domain `*.example.com` (cần domain).
2. DNS validation → add CNAME ở Route 53.
3. ALB → HTTPS listener → cert ACM.

### Lab 4 — GuardDuty + finding giả (15 phút)
1. GuardDuty → Enable.
2. Settings → **Generate sample findings** → tạo finding giả.
3. Xem severity, recommendation.

### Lab 5 — Macie scan S3 PII (20 phút)
1. Upload 1 file CSV có credit card số giả → S3.
2. Macie → Enable → Create job → scan bucket.
3. Đợi finding → Macie phát hiện PII.

---

## 4. Hands-on không tốn tiền

### Option A — LocalStack
- `awslocal kms create-key …`
- `awslocal secretsmanager create-secret …`

### Option B — Skill Builder
- "AWS Security Fundamentals" (free, 6h).
- "Getting Started with AWS Security, Identity, and Compliance" (free).

### Option C — Đoán service
1. Web app bị SQL injection → **WAF**.
2. EC2 mine crypto → **GuardDuty**.
3. S3 chứa SSN → **Macie**.
4. Vulnerability CVE container image → **Inspector**.
5. Dashboard aggregator → **Security Hub**.
6. Investigate sau alert → **Detective**.
7. Encrypt S3 → **KMS**.
8. Rotate RDS password → **Secrets Manager**.
9. SSL cert miễn phí cho ALB → **ACM**.
10. Domain join AD cho Windows EC2 → **Directory Service Managed Microsoft AD**.

---

## 5. Tự kiểm tra (có đáp án)

1. KMS vs CloudHSM khác chính?
   <details><summary>Trả lời</summary>**KMS** = multi-tenant managed, đơn giản, đủ 99% case. **CloudHSM** = single-tenant hardware HSM, FIPS 140-2 Level 3 full, đắt ($1000/tháng), compliance đòi single-tenant.</details>

2. Đề: *"Rotate database password mỗi 30 ngày tự động."*
   <details><summary>Trả lời</summary>**AWS Secrets Manager** (built-in rotation cho RDS/Aurora/Redshift/DocumentDB).</details>

3. Đề: *"SSL cert miễn phí cho website."*
   <details><summary>Trả lời</summary>**AWS Certificate Manager (ACM)** — public cert miễn phí cho domain own, auto-renew.</details>

4. Đề: *"Cognito User Pool dùng làm gì?"*
   <details><summary>Trả lời</summary>**Directory user** cho **app bạn build** — sign-up, sign-in, MFA, social login. Khác IAM (cho AWS API user).</details>

5. Đề: *"App cần phát hiện PII trong S3 bucket."*
   <details><summary>Trả lời</summary>**Amazon Macie**.</details>

6. Đề: *"Block SQL injection và XSS vào API."*
   <details><summary>Trả lời</summary>**AWS WAF** với managed rule SQLi/XSS.</details>

7. Đề: *"DDoS L7 attack 100 Gbps, có response team 24/7."*
   <details><summary>Trả lời</summary>**AWS Shield Advanced**.</details>

8. Đề: *"Cross-account share VPC subnet cho 5 account dev/test."*
   <details><summary>Trả lời</summary>**AWS Resource Access Manager (RAM)**.</details>

9. Đề: *"Download SOC 2 compliance report cho auditor."*
   <details><summary>Trả lời</summary>**AWS Artifact**.</details>

10. Đề: *"Investigate root cause sau alert GuardDuty."*
    <details><summary>Trả lời</summary>**Amazon Detective**.</details>

11. Đề: *"Scan vulnerability CVE trong ECR image."*
    <details><summary>Trả lời</summary>**Amazon Inspector**.</details>

12. Đề: *"Dashboard tổng hợp finding của GuardDuty + Inspector + Macie."*
    <details><summary>Trả lời</summary>**AWS Security Hub**.</details>

---

## 6. Đối chiếu GCP & Azure

| Function | AWS | GCP | Azure |
|----------|-----|-----|-------|
| KMS | KMS | Cloud KMS | Key Vault |
| Hardware HSM | CloudHSM | Cloud HSM | Dedicated HSM / Managed HSM |
| Cert | ACM | Certificate Manager | Key Vault Certificates |
| Secret store | Secrets Manager | Secret Manager | Key Vault Secrets |
| Param store | SSM Parameter Store | Runtime Config | App Configuration |
| End-user identity | Cognito | Identity Platform / Firebase Auth | Azure AD B2C |
| AD managed | Directory Service | Managed Microsoft AD | Azure AD DS |
| WAF | AWS WAF | Cloud Armor | Application Gateway WAF / Front Door WAF |
| DDoS | Shield | Cloud Armor | Azure DDoS Protection |
| Threat detection | GuardDuty | Security Command Center | Microsoft Defender for Cloud |
| Vulnerability scan | Inspector | Web Security Scanner / Container Analysis | Defender for Containers |
| PII discovery | Macie | DLP | Purview |
| Aggregator | Security Hub | Security Command Center | Defender for Cloud |
| Investigate | Detective | Chronicle | Sentinel |
| Compliance docs | Artifact | Compliance Reports Manager | Service Trust Portal |

---

## 7. Lưu ý khi thi CLF-C02

- **IAM** = AWS user. **Cognito** = end-user app. **Directory Service** = AD. **IAM Identity Center** = SSO multi-account.
- **KMS managed** vs **CloudHSM single-tenant**.
- **ACM = free public cert** cho AWS service.
- **Secrets Manager rotate** vs **Parameter Store** (rẻ, no rotate built-in).
- **Shield Standard free auto**, **Advanced $3000/tháng có DRT**.
- **WAF L7**, **Network Firewall L3/L4 VPC**, **Firewall Manager multi-account**.
- **GuardDuty** = threat (anomaly). **Inspector** = vulnerability (CVE). **Macie** = PII trong S3. **Detective** = investigate. **Security Hub** = aggregator.
- **RAM** = cross-account share resource.
- **Artifact** = compliance report AWS có sẵn. **Audit Manager** = audit workload bạn build.
- **Pen test EC2/Lambda/RDS** — không cần xin phép (trong scope).

## 8. Lưu ý khi thi SAA-C03 (sâu hơn)

- **KMS key policy** + IAM policy + grant — evaluation logic.
- **Envelope encryption** (CMK → DEK → data).
- **VPC endpoint cho KMS** để tránh public Internet.
- **Multi-region KMS key** cho DR cross-region.
- **Cognito federation flows** (OAuth, SAML).
- **WAF + CloudFront + Shield Advanced** combo cho global app.

## 9. Lưu ý khi đi làm

- **Bật KMS encryption default** mọi storage (EBS, S3, RDS, DynamoDB).
- **Không hardcode credential** — luôn Secrets Manager / Parameter Store.
- **MFA root + IAM Identity Center** mọi account.
- **Bật GuardDuty + Security Hub** ở mọi account, aggregate về security account.
- **WAF managed rule cho AWS-managed top 10** ở mọi ALB public.
- **Shield Advanced cho production có SLA** — đắt nhưng cost protection trả lại nếu attack.
- **Artifact quý 1 lần** — download SOC 2 cho customer audit.

---

## 10. Flashcard

- **IAM** — AWS API user/role.
- **Cognito** — end-user app (User Pool, Identity Pool).
- **Directory Service** — managed AD (Managed Microsoft AD, AD Connector, Simple AD).
- **IAM Identity Center** — SSO multi-account.
- **KMS** — managed encryption key, $1/key/tháng + API.
- **CloudHSM** — single-tenant HSM, FIPS 140-2 Level 3 full.
- **ACM** — public TLS cert free + auto-renew.
- **Secrets Manager** — secret + auto rotation, $0.40/secret/tháng.
- **Parameter Store** (SSM) — config + secret rẻ, no rotate built-in.
- **WAF** — L7 web app firewall (SQLi, XSS, bot).
- **Shield Standard** — free DDoS L3/L4.
- **Shield Advanced** — $3000/tháng, L3/L4/L7 + DRT + cost protection.
- **Network Firewall** — L3/L4 VPC stateful + IPS Suricata.
- **Firewall Manager** — multi-account WAF/Shield/Network Firewall qua Organizations.
- **GuardDuty** — threat detection ML.
- **Inspector** — vulnerability CVE EC2/ECR/Lambda.
- **Macie** — PII discovery S3.
- **Detective** — investigate root cause.
- **Security Hub** — aggregator finding + compliance standard.
- **RAM** — share resource cross-account.
- **Artifact** — compliance report AWS.
- **Audit Manager** — audit workload.
- **In transit** (TLS/IPsec) vs **at rest** (KMS).
