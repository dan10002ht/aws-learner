# Bài 17 — Monitoring & Governance (CloudWatch, CloudTrail, Config, Trusted Advisor, Organizations, Control Tower, Service Catalog, …)

> Map exam: **CLF-C02 Task 2.2 (governance/compliance/logging), Task 4.3 (Trusted Advisor/Health), và Management & Governance category**.

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân biệt **3 trụ cột observability**: CloudWatch (metric/log) / CloudTrail (audit) / X-Ray (trace).
- Phân biệt **CloudTrail vs Config vs CloudWatch** (rất hay nhầm).
- Hiểu **AWS Organizations + SCP + Control Tower** cho multi-account governance.
- Biết khi nào dùng **Trusted Advisor / Health Dashboard / Compute Optimizer / Well-Architected Tool**.
- Liệt kê các service quản trị in-scope khác: Service Catalog, License Manager, Resource Groups, Audit Manager, Launch Wizard.

---

## 2. Lý thuyết

### 2.0 Phân biệt 4 service hay nhầm — CloudWatch / CloudTrail / Config / X-Ray

| Service | Trả lời câu hỏi gì | Loại data |
|---------|---------------------|-----------|
| **CloudWatch** | "Hệ thống đang **hoạt động** như nào? Có bị overload không?" | **Metric + Log + Alarm** |
| **CloudTrail** | "**Ai** đã làm **cái gì** lúc nào?" | **API call audit log** |
| **AWS Config** | "Resource đang ở **trạng thái config** gì? Có lệch baseline không?" | **Config snapshot + change history** |
| **X-Ray** | "Request **đi qua** những service nào? Bottleneck ở đâu?" | **Distributed trace** |

→ **Bẫy đề**: "audit who deleted S3 bucket" → **CloudTrail**, KHÔNG phải CloudWatch.

---

### 2.1 Amazon CloudWatch

**3 sub-service chính**:

#### CloudWatch Metrics
- Số liệu time-series (CPU, network, disk, request count, …).
- **Default metric** từ AWS (CPU, network). Detailed monitoring = 1 phút (extra cost), basic = 5 phút.
- **Custom metric** đẩy từ app qua API hoặc CloudWatch Agent.
- **Metric Math** + dashboard.

#### CloudWatch Logs
- Tập trung log từ EC2 (CW Agent), Lambda, ECS, RDS, VPC Flow Logs, Route 53 query log, …
- **Log group** → **Log stream** → **events**.
- **Log Insights** — query log bằng custom syntax.
- **Subscription filter** → Lambda / Kinesis / Firehose.

#### CloudWatch Alarms
- Trigger khi metric vượt threshold → SNS notification / Lambda / Auto Scaling action.
- States: OK / ALARM / INSUFFICIENT_DATA.
- **Composite alarm** = AND/OR nhiều alarm.

**Khác**:
- **CloudWatch Synthetics** — canary monitor URL.
- **CloudWatch RUM** (Real User Monitoring) — đo trải nghiệm thực user trên web.
- **CloudWatch Evidently** — A/B test + feature flag.
- **CloudWatch Contributor Insights** — top N từ log.

---

### 2.2 AWS CloudTrail

**Log mọi API call** (Console click cũng là API call) trong account.

**3 loại event**:
- **Management events** — CRUD trên resource (CreateBucket, DeleteUser, …). **Mặc định bật**, lưu 90 ngày miễn phí.
- **Data events** — S3 object access, Lambda invoke. **Mặc định tắt** (vì volume cao).
- **Insights events** — phát hiện activity bất thường bằng ML.

**Trail** — config CloudTrail ghi log vào S3 (giữ > 90 ngày, có thể vĩnh viễn).

**Multi-account** với **Organizations trail** — 1 trail cho cả org.

**Use case**:
- Compliance audit ("ai xoá user vào lúc 3 giờ sáng?").
- Incident response.
- Detect unauthorized API call.

---

### 2.3 AWS Config

**Theo dõi trạng thái config resource theo thời gian + check rule compliance**.

**Khái niệm**:
- **Configuration item** — snapshot config 1 resource tại 1 thời điểm.
- **Configuration recorder** — bật để Config bắt đầu ghi.
- **Rule** — quy tắc compliance (managed hoặc custom Lambda).
  - VD: "all S3 buckets must have versioning enabled".
- **Conformance pack** — bộ rule (CIS, PCI, …).
- **Aggregator** — gom Config từ nhiều account.

**Khác CloudTrail**:
- CloudTrail = **ai làm gì** (action).
- Config = **resource giờ ra sao + có vi phạm rule không** (state).

**Khác Security Hub**:
- Config rule = compliance config.
- Security Hub = aggregator finding cross-service.

---

### 2.4 AWS X-Ray

- **Distributed tracing** — theo dõi request qua nhiều service (Lambda → API GW → DynamoDB).
- **Service map** visual.
- **Trace** với segment + subsegment.
- Tích hợp Lambda, ECS, EC2, Beanstalk SDK.

---

### 2.5 AWS Trusted Advisor

**Service free** check best practice cho account.

**5 mảng**:
1. **Cost optimization** — idle EC2, unused EBS, low utilization RDS.
2. **Performance** — overutilized EC2, EBS throughput.
3. **Security** — MFA root chưa bật, SG mở port 22 quá rộng, S3 bucket public.
4. **Fault tolerance** — Multi-AZ chưa bật, snapshot không có.
5. **Service limits** — quota gần hết.

**Free tier (Basic + Developer support)** chỉ có **7 core check**.
**Business + Enterprise support** có **full check** (~100+).

---

### 2.6 AWS Health Dashboard

- **Personal Health Dashboard** (cũ) → giờ là **AWS Health Dashboard**.
- 2 tab:
  - **Service health** — sự cố region (giống status.aws).
  - **Your account health** — issue ảnh hưởng cụ thể account bạn (EC2 retire, maintenance window).
- **AWS Health API** — pull event programmatically.
- Tích hợp **EventBridge** để auto trigger Lambda khi có event.

---

### 2.7 AWS Compute Optimizer

- **ML gợi ý right-sizing** EC2 / EBS / Lambda / ASG / ECS Fargate.
- Free, phân tích metric CloudWatch 14 ngày.
- Output: "downsize EC2 m5.large → m5.medium tiết kiệm 40%".

---

### 2.8 AWS Organizations (multi-account governance)

**Cấu trúc**: cây phân cấp — Root (Management Account) chứa các OU, mỗi OU chứa các account. SCP gắn ở root/OU/account và **chảy xuống dưới** (chỉ hạ trần quyền, không cấp quyền); billing thì **gộp ngược lên** management account.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 430" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cấu trúc AWS Organizations — cây Root/OU/Account với SCP và consolidated billing</title>
  <desc>Cây phân cấp: Root (Management Account) ở trên, ba OU bên dưới (Production, Development, Sandbox), mỗi OU chứa các account. SCP gắn ở root/OU/account và chảy xuống dưới chỉ giới hạn trần quyền không cấp quyền. Consolidated billing gộp hoá đơn mọi account về management account.</desc>

  <defs>
    <marker id="orgDown" markerWidth="10" markerHeight="10" refX="5" refY="8" orient="auto"><path d="M0 0 L5 8 L10 0" fill="none" stroke="#f59e0b" stroke-width="1.4"/></marker>
    <marker id="orgUp" markerWidth="10" markerHeight="10" refX="5" refY="2" orient="auto"><path d="M0 10 L5 2 L10 10" fill="none" stroke="#10b981" stroke-width="1.4"/></marker>
  </defs>

  <text x="16" y="22" font-size="13.5" font-weight="700" fill="currentColor">Cấu trúc AWS Organizations</text>

  <g stroke="currentColor" stroke-opacity="0.35" fill="none">
    <path d="M360 78 V100 H140 V120"/>
    <path d="M360 100 H360 V120"/>
    <path d="M360 100 H584 V120"/>
    <path d="M140 188 V206 H92 V222"/>
    <path d="M140 206 H188 V222"/>
    <path d="M360 188 V222"/>
    <path d="M584 188 V222"/>
  </g>

  <rect x="232" y="40" width="256" height="38" rx="9" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="58" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Root</text>
  <text x="360" y="72" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">Management Account (payer)</text>

  <g>
    <rect x="56" y="120" width="168" height="40" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="140" y="138" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">OU: Production</text>
    <text x="140" y="153" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">Organizational Unit</text>
  </g>
  <g>
    <rect x="276" y="120" width="168" height="40" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="138" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">OU: Development</text>
    <text x="360" y="153" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">Organizational Unit</text>
  </g>
  <g>
    <rect x="500" y="120" width="168" height="40" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="584" y="138" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">OU: Sandbox</text>
    <text x="584" y="153" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">Organizational Unit</text>
  </g>

  <g>
    <rect x="36" y="222" width="100" height="36" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="86" y="244" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Account A</text>
    <rect x="144" y="222" width="100" height="36" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="194" y="244" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Account B</text>
    <rect x="310" y="222" width="100" height="36" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="244" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Account C</text>
    <rect x="534" y="222" width="100" height="36" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="584" y="244" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Account D</text>
  </g>

  <g>
    <line x1="694" y1="50" x2="694" y2="248" stroke="#f59e0b" stroke-opacity="0.65" stroke-width="2" marker-end="url(#orgDown)"/>
    <text x="700" y="120" font-size="11" font-weight="700" fill="#f59e0b" transform="rotate(90 700 120)" text-anchor="middle">SCP chảy XUỐNG</text>
  </g>
  <g>
    <line x1="26" y1="248" x2="26" y2="62" stroke="#10b981" stroke-opacity="0.65" stroke-width="2" marker-end="url(#orgUp)"/>
    <text x="20" y="150" font-size="11" font-weight="700" fill="#10b981" transform="rotate(-90 20 150)" text-anchor="middle">Billing gộp LÊN</text>
  </g>

  <rect x="16" y="288" width="336" height="120" rx="9" fill="#f59e0b" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="32" y="310" font-size="12" font-weight="700" fill="#f59e0b">SCP (Service Control Policy)</text>
  <text x="32" y="330" font-size="11" fill="currentColor" opacity="0.85">Gắn ở Root / OU / Account.</text>
  <text x="32" y="348" font-size="11" fill="currentColor" opacity="0.85">Đặt **trần** quyền tối đa cho mọi account dưới.</text>
  <text x="32" y="366" font-size="11" fill="currentColor" opacity="0.85">Chỉ DENY/giới hạn — KHÔNG grant permission.</text>
  <text x="32" y="384" font-size="11" fill="currentColor" opacity="0.85">IAM policy trong account vẫn cần để cấp quyền.</text>
  <text x="32" y="402" font-size="10.5" fill="currentColor" opacity="0.62">Quyền thực tế = SCP (trần) ∩ IAM policy.</text>

  <rect x="368" y="288" width="336" height="120" rx="9" fill="#10b981" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="384" y="310" font-size="12" font-weight="700" fill="#10b981">Consolidated billing</text>
  <text x="384" y="330" font-size="11" fill="currentColor" opacity="0.85">1 hoá đơn duy nhất cho cả tổ chức.</text>
  <text x="384" y="348" font-size="11" fill="currentColor" opacity="0.85">Management account = payer trả tiền.</text>
  <text x="384" y="366" font-size="11" fill="currentColor" opacity="0.85">Gộp usage → share volume discount.</text>
  <text x="384" y="384" font-size="11" fill="currentColor" opacity="0.85">Chia sẻ RI / Savings Plan toàn org.</text>
  <text x="384" y="402" font-size="10.5" fill="currentColor" opacity="0.62">Mỗi account vẫn xem được chi phí riêng.</text>
</svg>

**Tính năng**:
- **Consolidated billing** — 1 bill cho cả org, share volume discount + RI/Savings Plan.
- **Service Control Policy (SCP)** — giới hạn quyền **tối đa** ở account/OU. SCP **chỉ deny**, không grant.
- **Tag policy** — bắt buộc tag format.
- **Backup policy**, **AI service opt-out policy**.
- **Trusted access** cho service như Config Aggregator, Security Hub, Audit Manager.
- **Delegated administrator** — chuyển quản trị 1 service cho account khác (không phải management account).

**SCP ví dụ**: deny tất cả region trừ `ap-southeast-1` + `us-east-1` cho cả org.

**Lưu ý exam**: SCP **không grant** permission, chỉ giới hạn. IAM policy vẫn cần.

---

### 2.9 AWS Control Tower

- **Wizard tự setup landing zone** multi-account best practice.
- Auto provision: management account + audit account + log archive account + Organizations + SCP + Config + CloudTrail.
- **Account Factory** — tạo account mới theo template.
- **Guardrails** (preventive + detective) = SCP + Config rule có sẵn.
- Tích hợp **IAM Identity Center** cho SSO.

**Use case**: enterprise cần multi-account chuẩn → bật Control Tower 1 lần thay setup tay.

---

### 2.10 IAM Identity Center (formerly AWS SSO)

- **SSO cho multi-account**.
- Tích hợp Azure AD, Okta, Google Workspace, on-prem AD.
- User login 1 lần → chọn account + role.
- Thay thế việc tạo IAM user trong từng account.
- **Default identity store** built-in nếu không có IdP.

---

### 2.11 AWS Service Catalog

- Admin tạo **products** (CloudFormation template được duyệt).
- End-user (dev, BU) self-service launch product.
- Đảm bảo compliance + governance khi nhân viên dùng AWS tự do.
- Tích hợp Organizations để share portfolio.

---

### 2.12 AWS Resource Groups & Tag Editor

- Group resource theo tag/query, dễ quản tập trung.
- **Tag Editor** — bulk add/edit tag cross-service.
- Foundation cho cost allocation, automation.

---

### 2.13 AWS License Manager

- Quản license **BYOL** (Microsoft, Oracle, SAP, IBM, …) trên AWS.
- Định nghĩa **license rule**, track usage.
- Tránh vi phạm license khi auto-scale.

---

### 2.14 AWS Launch Wizard

- Wizard hướng dẫn deploy workload phức tạp (SAP, SQL Server Always-On, Active Directory) theo best practice.
- Output: CloudFormation template + deployed environment.
- Free, chỉ trả resource.

---

### 2.15 AWS Audit Manager

- **Tự động collect evidence** cho audit compliance (SOC 2, PCI DSS, HIPAA, GDPR, ISO 27001).
- Framework có sẵn + custom framework.
- Output evidence package cho auditor.

---

### 2.16 AWS Well-Architected Tool

- Đã đề cập ở Bài 9.
- Self-assess workload theo 6 pillar, output HRI/MRI improvement plan.

---

### 2.17 So sánh nhanh — chọn service nào

| Tình huống | Service |
|------------|---------|
| Monitor CPU EC2, log ứng dụng, alarm SMS | **CloudWatch** |
| Audit ai xoá resource lúc nào | **CloudTrail** |
| Check S3 bucket có versioning chưa, vi phạm rule | **Config** |
| Distributed tracing microservice | **X-Ray** |
| Best practice check tự động | **Trusted Advisor** |
| Right-size EC2/Lambda tiết kiệm cost | **Compute Optimizer** |
| Sự cố AWS region | **AWS Health Dashboard** |
| Setup landing zone multi-account chuẩn | **Control Tower** |
| Multi-account billing, SCP, OU | **Organizations** |
| SSO cho multi-account | **IAM Identity Center** |
| Approved CF template self-service | **Service Catalog** |
| Wizard deploy SAP/SQL/AD best practice | **Launch Wizard** |
| Quản license BYOL Microsoft/Oracle | **License Manager** |
| Tự động collect evidence compliance | **Audit Manager** |
| Self-assess workload 6 pillar | **Well-Architected Tool** |
| Group resource theo tag | **Resource Groups** |

---

## 3. Hands-on có account

### Lab 1 — CloudWatch alarm SMS (20 phút)
1. CloudWatch → Alarms → Create alarm trên EC2 CPU > 70% 5 phút.
2. Action: SNS topic → email/SMS subscribe.
3. Stress test EC2 → đợi email alert.

### Lab 2 — CloudTrail event history (10 phút)
1. CloudTrail → Event history.
2. Filter "Event name = DeleteBucket" → xem ai đã xoá bucket nào.

### Lab 3 — Config rule (20 phút)
1. Config → bật Configuration recorder.
2. Add rule managed: **s3-bucket-versioning-enabled**.
3. Tạo 1 S3 bucket không versioning → Config mark **NON_COMPLIANT**.

### Lab 4 — Organizations + SCP (30 phút)
1. Organizations → Enable.
2. Tạo OU `Sandbox`, mời 1 account vào.
3. Tạo SCP deny `s3:DeleteBucket` cho OU `Sandbox`.
4. Login account sandbox → thử delete bucket → bị deny.

### Lab 5 — Trusted Advisor + Compute Optimizer (10 phút)
1. Trusted Advisor → review 7 core check.
2. Compute Optimizer → enroll → đợi 14 ngày → check recommendation.

---

## 4. Hands-on không tốn tiền

### Option A — LocalStack
- `awslocal cloudwatch put-metric-data …`
- `awslocal logs describe-log-groups`

### Option B — Skill Builder
- "Cloud Operations on AWS" (free).
- "AWS Well-Architected Foundations" (free).

---

## 5. Tự kiểm tra (có đáp án)

1. Đề: *"Audit ai xoá IAM user."*
   <details><summary>Trả lời</summary>**AWS CloudTrail** event history.</details>

2. Đề: *"Check S3 bucket có encryption không, alert nếu không."*
   <details><summary>Trả lời</summary>**AWS Config** với managed rule **s3-bucket-server-side-encryption-enabled**.</details>

3. Đề: *"Best practice check 5 mảng (cost, perf, security, FT, limits)."*
   <details><summary>Trả lời</summary>**AWS Trusted Advisor**.</details>

4. CloudTrail mặc định giữ event bao lâu?
   <details><summary>Trả lời</summary>**90 ngày** trong Event history (free). Muốn lâu hơn → tạo Trail vào S3.</details>

5. SCP có grant permission không?
   <details><summary>Trả lời</summary>**Không**. SCP chỉ **deny / giới hạn** quyền tối đa. IAM policy vẫn cần để grant.</details>

6. Đề: *"Multi-account landing zone với best practice tự setup."*
   <details><summary>Trả lời</summary>**AWS Control Tower**.</details>

7. Đề: *"Right-size 200 EC2, gợi ý xuống type rẻ hơn."*
   <details><summary>Trả lời</summary>**AWS Compute Optimizer**.</details>

8. Đề: *"Collect evidence cho SOC 2 audit tự động."*
   <details><summary>Trả lời</summary>**AWS Audit Manager**.</details>

9. Đề: *"Track license Oracle BYOL khi auto-scale."*
   <details><summary>Trả lời</summary>**AWS License Manager**.</details>

10. Đề: *"Service health của AWS region đang up hay down?"*
    <details><summary>Trả lời</summary>**AWS Health Dashboard** (Service health tab).</details>

---

## 6. Đối chiếu GCP & Azure

| Service | AWS | GCP | Azure |
|---------|-----|-----|-------|
| Metric + Log | CloudWatch | Cloud Monitoring + Cloud Logging | Monitor + Log Analytics |
| Audit log | CloudTrail | Cloud Audit Logs | Activity Log |
| Config compliance | AWS Config | Asset Inventory + Policy | Policy + Resource Graph |
| Tracing | X-Ray | Cloud Trace | Application Insights |
| Multi-account | Organizations | Organization + Folders | Management Groups |
| Landing zone | Control Tower | Cloud Foundation Toolkit | Cloud Adoption Framework + Bicep |
| SSO | IAM Identity Center | Cloud Identity | Entra ID (Azure AD) |
| Best practice check | Trusted Advisor | Recommender | Advisor |
| Right-size | Compute Optimizer | Recommender | Advisor |
| Service catalog | Service Catalog | Private Catalog | Managed Applications |
| Audit | Audit Manager | Audit Logs + Assured Workloads | Compliance Manager |
| License | License Manager | License Manager | Hybrid Benefit |

---

## 7. Lưu ý khi thi CLF-C02

- **CloudWatch (monitor) ≠ CloudTrail (audit) ≠ Config (state)**. Đề luôn bẫy phân biệt 3 cái này.
- **Trusted Advisor 5 mảng**: cost, perf, security, FT, limits. **7 core check free**, full với Business+.
- **Health Dashboard** vs status.aws.com — Health có info **riêng cho account bạn**.
- **Organizations** = multi-account + consolidated billing + SCP.
- **SCP không grant**, chỉ deny.
- **Control Tower** = wizard setup landing zone.
- **IAM Identity Center** = SSO (formerly AWS SSO).
- **Service Catalog** = approved CF template.
- **License Manager** = BYOL track.
- **Audit Manager** = compliance evidence.
- **Compute Optimizer** = right-size gợi ý.

## 8. Lưu ý khi thi SAA-C03 (sâu hơn)

- CloudWatch **EMF (Embedded Metric Format)** để emit metric từ log.
- **CloudWatch Logs Insights query language**.
- **Config remediation** tự fix non-compliant.
- **Organizations + Resource Access Manager (RAM)** share resource.
- **Delegated administrator** pattern cho Security Hub, Config, Audit Manager.

## 9. Lưu ý khi đi làm

- **CloudTrail Trail vào S3 bật cho mọi account** từ ngày 1 — không có log = không debug được.
- **CloudWatch Logs retention** mặc định **vô hạn** → set retention (vd 30 ngày) để giảm cost.
- **CloudWatch metric custom** không free — cẩn thận emit metric quá nhiều.
- **Config recorder bật cho production** — không bật dev (cost).
- **Compute Optimizer + Trusted Advisor quý 1 lần** — quick win cost.
- **Control Tower từ ngày đầu** nếu sẽ có > 5 account — không retrofit về sau khó.

---

## 10. Flashcard

- **CloudWatch** — metric + log + alarm (monitor).
- **CloudTrail** — API call audit, 90 ngày free, trail vào S3 để giữ lâu.
- **AWS Config** — config state + compliance rule.
- **X-Ray** — distributed tracing.
- **Trusted Advisor** — 5 mảng best practice, 7 core check free.
- **Compute Optimizer** — ML right-size gợi ý.
- **Health Dashboard** — service health AWS + account health.
- **Organizations** — multi-account, consolidated billing, SCP, OU.
- **SCP** — chỉ deny, không grant.
- **Control Tower** — wizard landing zone multi-account.
- **IAM Identity Center** — SSO cho multi-account.
- **Service Catalog** — approved CF template self-service.
- **Launch Wizard** — wizard SAP/SQL/AD.
- **License Manager** — BYOL track.
- **Audit Manager** — compliance evidence tự động.
- **Resource Groups + Tag Editor** — group + bulk tag.
- **Well-Architected Tool** — self-assess 6 pillar.
