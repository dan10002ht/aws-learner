# SAA Ch3.4 — Detective Controls & Compliance

> Mục tiêu: Hiểu các service "phát hiện" (CloudTrail, Config, GuardDuty, Security Hub, Macie, Inspector, Detective) — vai trò mỗi cái, khi nào dùng cái nào, và design **audit + incident response** không bị mù khi sự cố xảy ra.

Tiền đề: [[ch3-01-iam-deep-dive]], [[ch3-02-network-security]], [[ch3-03-data-protection]].

---

## 1. Câu chuyện mở đầu — "Có ai xóa CloudTrail không?"

3h sáng, alert: production DB bị drop table. CEO gọi. Bạn check CloudTrail → **không có log nào trong 6 giờ qua**. Ai đã ngắt CloudTrail? Không biết, vì log dừng từ trước đó.

→ **Detective control là dùng được khi vẫn còn log để xem**. Phải:
1. Bật CloudTrail **org-wide**, log đến account audit riêng.
2. Bucket log **không cho ai trong account chính delete** (SCP + bucket policy).
3. Có **alarm** khi CloudTrail bị stop.

Đây là bài học cơ bản nhưng nhiều công ty học bằng máu.

---

## 2. Spectrum detective services

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 460" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Mapping detective service theo câu hỏi cần trả lời</title>
  <desc>Mỗi service trả lời một câu hỏi: CloudTrail (ai làm gì), Config (trạng thái resource), GuardDuty (threat), Inspector (vulnerability), Macie (sensitive data), Security Hub (aggregate findings), Detective (investigate), VPC Flow Logs (network traffic).</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Mỗi service = 1 câu hỏi</text>
  <text x="232" y="24" font-size="11.5" fill="currentColor" opacity="0.6">Câu hỏi cần trả lời</text>
  <text x="540" y="24" font-size="11.5" fill="currentColor" opacity="0.6">Service</text>

  <g>
    <rect x="16" y="38" width="500" height="44" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="30" y="65" font-size="12.5" fill="currentColor">"Ai đã làm gì, khi nào?" (API call)</text>
    <line x1="520" y1="60" x2="540" y2="60" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="540" y="46" width="164" height="28" rx="14" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="622" y="65" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">CloudTrail</text>
  </g>
  <g>
    <rect x="16" y="90" width="500" height="44" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="30" y="117" font-size="12.5" fill="currentColor">"Resource cấu hình ra sao, đổi khi nào?"</text>
    <line x1="520" y1="112" x2="540" y2="112" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="540" y="98" width="164" height="28" rx="14" fill="#10b981" fill-opacity="0.95"/>
    <text x="622" y="117" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">AWS Config</text>
  </g>
  <g>
    <rect x="16" y="142" width="500" height="44" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="30" y="169" font-size="12.5" fill="currentColor">"Có hành vi đe doạ / bị xâm nhập không?"</text>
    <line x1="520" y1="164" x2="540" y2="164" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="540" y="150" width="164" height="28" rx="14" fill="#f59e0b" fill-opacity="0.95"/>
    <text x="622" y="169" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">GuardDuty</text>
  </g>
  <g>
    <rect x="16" y="194" width="500" height="44" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="30" y="221" font-size="12.5" fill="currentColor">"Có lỗ hổng (CVE) trên EC2/ECR/Lambda?"</text>
    <line x1="520" y1="216" x2="540" y2="216" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="540" y="202" width="164" height="28" rx="14" fill="#8b5cf6" fill-opacity="0.95"/>
    <text x="622" y="221" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">Inspector</text>
  </g>
  <g>
    <rect x="16" y="246" width="500" height="44" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="30" y="273" font-size="12.5" fill="currentColor">"S3 có chứa dữ liệu nhạy cảm (PII)?"</text>
    <line x1="520" y1="268" x2="540" y2="268" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="540" y="254" width="164" height="28" rx="14" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="622" y="273" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">Macie</text>
  </g>
  <g>
    <rect x="16" y="298" width="500" height="44" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="30" y="325" font-size="12.5" fill="currentColor">"Gom mọi finding về 1 chỗ để xem?"</text>
    <line x1="520" y1="320" x2="540" y2="320" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="540" y="306" width="164" height="28" rx="14" fill="#10b981" fill-opacity="0.95"/>
    <text x="622" y="325" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">Security Hub</text>
  </g>
  <g>
    <rect x="16" y="350" width="500" height="44" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="30" y="377" font-size="12.5" fill="currentColor">"Đào sâu: entity nào liên quan nhau?"</text>
    <line x1="520" y1="372" x2="540" y2="372" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="540" y="358" width="164" height="28" rx="14" fill="#f59e0b" fill-opacity="0.95"/>
    <text x="622" y="377" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">Detective</text>
  </g>
  <g>
    <rect x="16" y="402" width="500" height="44" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="30" y="429" font-size="12.5" fill="currentColor">"Traffic mạng vào/ra (ACCEPT/REJECT)?"</text>
    <line x1="520" y1="424" x2="540" y2="424" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="540" y="410" width="164" height="28" rx="14" fill="#8b5cf6" fill-opacity="0.95"/>
    <text x="622" y="429" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">VPC Flow Logs</text>
  </g>
</svg>

Mỗi cái 1 layer / 1 question. Ngoài ra: DNS query → Route 53 Resolver Query Logs; WAF events → WAF Logs.

---

## 3. CloudTrail — "ai làm gì khi nào"

### 3.1 3 loại events

| Type | Mô tả | Default |
|------|-------|---------|
| **Management events** | Control plane operation (CreateBucket, RunInstances, AssumeRole) | Bật, 90 ngày retention free trong console |
| **Data events** | Data plane (S3 GetObject, Lambda Invoke, DynamoDB GetItem) | Tắt mặc định (volume khổng lồ, tính tiền) |
| **Insights events** | Anomaly detection (unusual API call pattern) | Tắt, ML-based |

### 3.2 Trail types

- **Single-region trail**: legacy.
- **Multi-region trail**: log tất cả region — **luôn chọn cái này**.
- **Organization trail**: log mọi account trong Org → ship vào account audit central.

### 3.3 Patterns audit-grade

1. **Organization trail** ở account audit, log đến S3 bucket dedicated.
2. Bucket **MFA Delete** + **Object Lock** (governance/compliance mode).
3. SCP cấm `cloudtrail:StopLogging`, `cloudtrail:DeleteTrail` cho mọi account.
4. Log integrity validation (CloudTrail option) → detect tampering.
5. CloudTrail → CloudWatch Logs → metric filter → alarm khi action nhạy cảm.

### 3.4 CloudTrail Lake

- Managed data lake cho CloudTrail event.
- SQL query trên log (giống Athena nhưng built-in).
- Retention dài (tới 7 năm).
- Cost: per ingest + query.

---

## 4. AWS Config — "resource state changed when, conform compliance?"

### 4.1 Core
- Snapshot **configuration** của resource theo thời gian.
- **Config rule**: đánh giá resource có conform policy không (managed hoặc custom Lambda).
- **Remediation**: auto-fix qua SSM Automation.

### 4.2 Use case
- Audit: "30 ngày trước SG `sg-xxx` config ra sao?"
- Compliance: "mọi EBS phải encrypted" → Config rule + remediation.
- Drift detection: tài nguyên thay đổi outside IaC.

### 4.3 Conformance packs
- Collection of Config rules theo framework (HIPAA, PCI, NIST, CIS).
- Deploy 1 click → đánh giá toàn account/org.

### 4.4 Aggregator
- Centralize Config data across account/region trong Org.

### 4.5 Cost
- Per configuration item recorded.
- Heavy-changing resource (Auto Scaling, Lambda version) → cost lên nhanh. Cấu hình recording selective.

---

## 5. GuardDuty — threat detection

### 5.1 Cách hoạt động
- Phân tích **CloudTrail, VPC Flow Logs, DNS query logs, S3 data events, EKS audit logs, Lambda execution logs, RDS login attempts** với ML + threat intel.
- Generate **finding** với severity (Low/Medium/High).
- Không cần agent.

### 5.2 Finding types phổ biến
- `Recon:IAMUser/UserPermissions` — IAM enumeration suspicious.
- `UnauthorizedAccess:EC2/SSHBruteForce` — SSH brute force.
- `CryptoCurrency:EC2/BitcoinTool.B` — instance mining bitcoin (compromise).
- `Trojan:EC2/DNSDataExfiltration` — DNS tunneling.
- `Policy:S3/BucketAnonymousAccessGranted` — bucket vô tình public.

### 5.3 Best practice
- Bật ở **mọi region** (attack có thể vào region không dùng).
- Org-level master account → centralize findings.
- Integrate với Security Hub + EventBridge → auto-remediate.

### 5.4 Cost
- Per GB CloudTrail / Flow Logs / DNS log analyzed.
- Free trial 30 ngày để estimate.

---

## 6. AWS Inspector

### 6.1 Vulnerability scan
- EC2: scan OS package + network reachability.
- ECR container image: scan vuln known CVE.
- Lambda function: scan dependency.

### 6.2 Continuous vs on-demand
- Inspector v2 (current): continuous scan, auto khi resource thay đổi.
- Findings → Security Hub.

### 6.3 Use case
- Compliance scan định kỳ.
- CI/CD: scan image trước deploy.

---

## 7. Macie — sensitive data discovery

Đã giới thiệu [[ch3-03-data-protection]]. Quick:
- Scan S3 cho PII (SSN, credit card, name, address, phone).
- Generate findings, gửi Security Hub.
- Pricing: per GB analyzed + bucket inventory.

---

## 8. Security Hub — aggregator

### 8.1 Role
- Aggregate findings từ GuardDuty, Inspector, Macie, IAM Access Analyzer, Firewall Manager, 3rd-party (Snyk, Wiz, …).
- Dashboard + reporting.
- Standards check: AWS Foundational, CIS, PCI-DSS, NIST.

### 8.2 Workflow
- Findings → assign → resolve / suppress.
- EventBridge → auto-ticket Jira / Slack alert / Lambda remediate.

### 8.3 Best practice
- Master account (security/audit) → invited member accounts.
- Org-wide enable qua Firewall Manager / delegated admin.

---

## 9. AWS Detective

- Investigation tool. Khác Security Hub (aggregator):
  - Detective build graph relationships giữa entity (IP, user, instance, role) từ CloudTrail + VPC Flow Logs + GuardDuty.
  - Khi GuardDuty báo finding → bấm "Investigate in Detective" → thấy relationship.
- Use case: SOC analyst dig deeper sau initial detection.

---

## 10. VPC Flow Logs

### 10.1 Cấu hình
- Bật ở VPC, subnet, hoặc ENI level.
- Output: S3, CloudWatch Logs, Kinesis Data Firehose.
- Format: 5-tuple + action (ACCEPT/REJECT) + bytes/packets.

### 10.2 Use case
- Audit traffic pattern.
- GuardDuty input (auto).
- Network troubleshooting.
- Compliance (PCI-DSS yêu cầu).

### 10.3 Cost
- Free if to S3; CloudWatch Logs $$$.
- Best practice: S3 + Athena query.

---

## 11. Other logs đáng nhớ

| Log | Service | Bật khi cần |
|-----|---------|-------------|
| **ALB / NLB access logs** | ELB | Audit HTTP/TCP traffic, integrate Athena |
| **CloudFront access logs** | CloudFront | Audit edge traffic |
| **S3 access logs** | S3 | Audit object access (alternative: CloudTrail data events) |
| **WAF logs** | WAF | Detail per request block/allow |
| **Route 53 query logs** | Route 53 | DNS audit, GuardDuty input |
| **RDS audit logs** | RDS | SQL query audit (Oracle Audit, MySQL audit plugin) |

---

## 12. Compliance frameworks AWS support

| Framework | Use case |
|-----------|----------|
| **HIPAA** | Healthcare US |
| **PCI-DSS** | Payment card |
| **SOC 1/2/3** | Financial reporting, service org |
| **ISO 27001/27017/27018** | Information security |
| **FedRAMP** | US Gov |
| **GDPR** | EU privacy |
| **NIST 800-53** | US Federal |
| **CIS Benchmarks** | Hardening guideline |

AWS có **AWS Artifact** — repository chứa compliance report của AWS, download để audit team.

→ AWS chứng nhận **of** the cloud. **In** the cloud là trách nhiệm bạn (shared responsibility).

---

## 13. AWS Audit Manager

- Automate evidence collection cho audit.
- Templates cho HIPAA, PCI, GDPR…
- Map AWS Config / CloudTrail / Security Hub findings → control framework.

---

## 14. Incident response patterns

### 14.1 Playbook cơ bản

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 250" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Luồng incident response playbook 7 bước</title>
  <desc>Chuỗi xử lý sự cố từ trái qua phải: Detect, Triage, Investigate, Contain, Eradicate, Recover, Post-mortem; mỗi bước kèm service AWS tương ứng.</desc>
  <text x="16" y="22" font-size="14" font-weight="700" fill="currentColor">Playbook ứng cứu sự cố — chuỗi 7 bước</text>

  <defs>
    <marker id="irArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>

  <g>
    <rect x="16" y="40" width="150" height="56" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="28" y="62" font-size="13" font-weight="700" fill="currentColor">1. Detect</text>
    <text x="28" y="80" font-size="10" fill="currentColor" opacity="0.7">GuardDuty / Config</text>
    <text x="28" y="92" font-size="10" fill="currentColor" opacity="0.7">CloudWatch alarm</text>
  </g>
  <line x1="166" y1="68" x2="190" y2="68" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#irArr)"/>
  <g>
    <rect x="194" y="40" width="150" height="56" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="206" y="62" font-size="13" font-weight="700" fill="currentColor">2. Triage</text>
    <text x="206" y="80" font-size="10" fill="currentColor" opacity="0.7">Security Hub</text>
    <text x="206" y="92" font-size="10" fill="currentColor" opacity="0.7">đánh giá severity</text>
  </g>
  <line x1="344" y1="68" x2="368" y2="68" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#irArr)"/>
  <g>
    <rect x="372" y="40" width="150" height="56" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="384" y="62" font-size="13" font-weight="700" fill="currentColor">3. Investigate</text>
    <text x="384" y="80" font-size="10" fill="currentColor" opacity="0.7">Detective + CloudTrail</text>
    <text x="384" y="92" font-size="10" fill="currentColor" opacity="0.7">+ VPC Flow Logs</text>
  </g>
  <line x1="522" y1="68" x2="546" y2="68" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#irArr)"/>
  <g>
    <rect x="550" y="40" width="154" height="56" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="562" y="62" font-size="13" font-weight="700" fill="currentColor">4. Contain</text>
    <text x="562" y="80" font-size="10" fill="currentColor" opacity="0.7">isolate SG, revoke</text>
    <text x="562" y="92" font-size="10" fill="currentColor" opacity="0.7">cred, snapshot</text>
  </g>

  <line x1="627" y1="96" x2="627" y2="120" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#irArr)"/>

  <g>
    <rect x="550" y="124" width="154" height="56" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="562" y="146" font-size="13" font-weight="700" fill="currentColor">5. Eradicate</text>
    <text x="562" y="164" font-size="10" fill="currentColor" opacity="0.7">terminate resource</text>
    <text x="562" y="176" font-size="10" fill="currentColor" opacity="0.7">bị xâm nhập, patch</text>
  </g>
  <line x1="550" y1="152" x2="526" y2="152" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#irArr)"/>
  <g>
    <rect x="372" y="124" width="150" height="56" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="384" y="146" font-size="13" font-weight="700" fill="currentColor">6. Recover</text>
    <text x="384" y="164" font-size="10" fill="currentColor" opacity="0.7">restore từ backup</text>
    <text x="384" y="176" font-size="10" fill="currentColor" opacity="0.7">rotate secret</text>
  </g>
  <line x1="372" y1="152" x2="348" y2="152" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#irArr)"/>
  <g>
    <rect x="194" y="124" width="150" height="56" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="206" y="146" font-size="13" font-weight="700" fill="currentColor">7. Post-mortem</text>
    <text x="206" y="164" font-size="10" fill="currentColor" opacity="0.7">root cause +</text>
    <text x="206" y="176" font-size="10" fill="currentColor" opacity="0.7">cải thiện</text>
  </g>

  <text x="16" y="216" font-size="11" fill="currentColor" opacity="0.65">Detect → Triage → Investigate → Contain (chứa thiệt hại) → Eradicate → Recover → học từ sự cố.</text>
</svg>

1. **Detect**: GuardDuty / Config / CloudWatch alarm.
2. **Triage**: Security Hub aggregate, severity.
3. **Investigate**: Detective + CloudTrail + Flow Logs.
4. **Contain**: isolate instance (SG = deny all), revoke credentials, snapshot for forensics.
5. **Eradicate**: terminate compromised resource, patch.
6. **Recover**: restore từ backup, rotate secret.
7. **Post-mortem**: root cause + improvement.

### 14.2 Automation
- **EventBridge** trigger Lambda khi GuardDuty finding severity > 7.
- Lambda: snapshot instance → quarantine SG → tag for forensics → notify SOC.
- **SSM Incident Manager**: managed incident workflow.

### 14.3 Forensic acquisition
- Instance compromised → đừng stop (mất memory state).
- Snapshot EBS, memory dump qua SSM, isolate SG.
- Copy log to forensics account.

---

## 15. Patterns enterprise — landing zone

**AWS Control Tower** scaffold landing zone với:
- Multi-account Organization.
- SCP guardrails.
- CloudTrail + Config org-wide.
- Security Hub + GuardDuty enabled all account.
- Centralized log archive account.
- Audit account read-only access.
- IAM Identity Center cho user.

→ Best practice ra hộp: dùng Control Tower thay vì build from scratch.

---

## 16. Cạm bẫy đề thi (SAA)

1. **"CloudTrail bật mặc định 90 ngày retention"** → Đúng cho **management event console view**. Trail xuất xuống S3 retention bao lâu tùy bạn.
2. **"CloudTrail log mọi API"** → **Sai mặc định**, data event (S3 GetObject, Lambda Invoke) phải bật riêng.
3. **"Config detect VPC Flow"** → **Sai**, Config detect **resource state**. Network flow là VPC Flow Logs / GuardDuty.
4. **"GuardDuty cần agent"** → **Sai**, agentless, dùng log AWS.
5. **"Inspector scan running EC2 chỉ"** → **Sai (Inspector v2)**, scan EC2 + ECR + Lambda continuous.
6. **"Security Hub thay thế GuardDuty"** → **Sai**, Security Hub aggregate, GuardDuty là detector.
7. **"Macie scan EBS"** → **Sai**, chỉ S3.
8. **"Detective replace SIEM"** → Partial. Detective tốt cho AWS-native; SIEM enterprise cần broader log source.
9. **"Org trail tự log mọi account mới"** → **Đúng**, account mới join Org → auto-include.

---

## 17. Tóm tắt 1 dòng

> Detective = **biết khi nào có chuyện**. Stack: **CloudTrail** (ai làm gì), **Config** (resource trạng thái), **GuardDuty** (threat), **Inspector** (vuln), **Macie** (sensitive data), **Security Hub** (aggregate), **Detective** (investigate), **VPC Flow Logs** (traffic). Centralize ở audit account, alarm chỗ nhạy cảm.

---

## 18. Bài tập tự kiểm tra

1. Production breach. Bạn cần biết: (a) attacker IP, (b) account compromised, (c) bucket bị access, (d) data exfil time. Service nào trả lời từng câu?
2. Compliance PCI-DSS yêu cầu log mọi S3 access. So sánh CloudTrail data event vs S3 access logs — chọn cái nào & vì sao?
3. Org 50 account. Cần đảm bảo mọi account bật CloudTrail multi-region, log đến central bucket, không ai disable được. Plan?
4. EBS volume vô tình public (snapshot share to ALL). Service phát hiện và remediate auto?
5. GuardDuty báo finding `Backdoor:EC2/C&CActivity.B` — instance gọi C2 server. Bước response trong 15 phút đầu?
6. Cost CloudTrail data event $5000/tháng. Bạn analyze gì để giảm mà không mất visibility?

---

## 19. Đọc thêm

- AWS Whitepaper — *AWS Security Incident Response Guide*, *Logical Separation*.
- AWS Builder's Library — *Operational excellence*.
- AWS docs — *CloudTrail*, *Config*, *GuardDuty*, *Security Hub* user guides.

---

**Chương 3 hoàn thành.** Tiếp theo: chương 4 — Design Cost-Optimized Architectures.
