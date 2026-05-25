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

```
Activity log → CloudTrail
Resource state → AWS Config
Threat detection → GuardDuty
Vulnerability scan → Inspector
Sensitive data discovery → Macie
Aggregate findings → Security Hub
Investigation tool → Detective
VPC traffic → VPC Flow Logs
DNS query → Route 53 Resolver Query Logs
WAF events → WAF Logs
```

Mỗi cái 1 layer / 1 question.

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
