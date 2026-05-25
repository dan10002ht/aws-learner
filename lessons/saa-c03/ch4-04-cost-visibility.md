# SAA Ch4.4 — Cost Visibility & Governance

> Mục tiêu: Biết "tiền AWS chảy đi đâu" và **ngăn** chảy mất kiểm soát — Cost Explorer, Budgets, Anomaly Detection, tagging strategy, SCP guardrail, FinOps basics. Đây là chương cuối SAA-C03 — sau khi học design hệ thống resilient/performant/secure, phải có cách quản lý cost lâu dài.

Tiền đề: [[ch4-01-compute-cost]], [[ch4-02-storage-cost]], [[ch4-03-db-network-cost]], CLF [[08-billing]].

---

## 1. Câu chuyện mở đầu — "Bill tháng này nổ x3, không ai biết tại sao"

CFO gọi: bill AWS tháng trước $50k, tháng này $150k. Không có release lớn. Engineering hoang mang.

Sau 2 ngày dig:
- 1 dev tạo EKS cluster ở 3 region để test, quên xóa: $20k.
- 1 Lambda recursive bug (Lambda gọi S3, trigger Lambda lại): $30k Lambda + $5k S3.
- 1 SageMaker endpoint quên stop sau demo: $15k.
- 1 EC2 p4 instance dev train model 1 tuần: $25k.
- 1 NAT GW egress tăng do bug code download S3 qua NAT: $5k.

→ **Mỗi cái lẽ ra có alert trong 24h** nếu có visibility + alarm. Cost mất control vì **không ai nhìn**.

Bài này dạy cách **không bị bất ngờ**.

---

## 2. Stack visibility AWS

```
Real-time: Cost Anomaly Detection (ML-based alert)
Daily:     CloudWatch Billing Alarm
Weekly:    Cost Explorer review
Monthly:   AWS Budgets check
Yearly:    Cost & Usage Report (CUR) + Athena/QuickSight
```

---

## 3. AWS Cost Explorer

### 3.1 Core
- UI + API trên data billing 12-13 tháng (default).
- Granularity: hourly (14 ngày recent), daily (3 tháng), monthly (12 tháng).
- Group by: service, account, region, instance type, tag, usage type, …
- Filter: nhiều dimension.

### 3.2 Use case
- Trend: spend tăng/giảm theo thời gian.
- Anomaly: spike service nào?
- Forecast: 12 tháng tới.
- RI/Savings Plan recommendation.
- Rightsizing recommendation.

### 3.3 Best practices
- **Group by tag** quan trọng — cần tagging strategy (mục 7).
- Hourly granularity bật khi cần (chi phí thêm).
- Export view → share team.

---

## 4. AWS Budgets

### 4.1 Loại budget

| Type | Track |
|------|-------|
| **Cost budget** | Tiền chi tiêu |
| **Usage budget** | Số GB / hour / request |
| **RI/Savings Plan budget** | Utilization / coverage |

### 4.2 Alert
- Threshold: actual hoặc forecast.
- Notify: email, SNS, Chatbot (Slack/Teams).
- **Budget Actions**: tự apply IAM policy / SCP / dừng resource khi vượt budget. Use case: dev account hard cap $1000 → auto deny `RunInstances` khi đạt.

### 4.3 Patterns

- Mỗi team / project / environment → budget riêng.
- Budget Action: dev account vượt budget → SCP block expensive service.
- Budget forecast: alert sớm khi forecast > limit.

---

## 5. Cost Anomaly Detection

### 5.1 Cách hoạt động
- ML phân tích pattern spend.
- Tự detect deviation từ baseline.
- Granularity: service / account / linked account / tag.

### 5.2 Setup
- Tạo **cost monitor** (theo dimension).
- Tạo **alert subscription** (email/SNS, threshold $/%).

### 5.3 Use case
- Catch dev quên tắt resource.
- Catch billing spike service mới.
- Catch attack (crypto mining → EC2 bill spike).

→ **Khuyên dùng**: ít cấu hình, ROI cao. Bật cho mọi account.

---

## 6. Cost & Usage Report (CUR)

### 6.1 Format
- Detail cao nhất: per-line-item, per-hour.
- Output S3 (Parquet/CSV).
- Refresh mỗi vài giờ.

### 6.2 Analysis stack
- CUR → S3 → Glue Crawler → Athena → QuickSight.
- Hoặc CUR → Redshift cho high-volume.
- Hoặc 3rd-party (Vantage, CloudHealth, Apptio).

### 6.3 Use case
- Showback / chargeback theo team.
- Detail unit economics (cost per request, per customer).
- FinOps deep dive.

---

## 7. Tagging strategy

### 7.1 Vì sao quan trọng

Cost Explorer / Budgets / CUR group by **tag**. Không tag → không thấy chi tiết.

### 7.2 Tag tối thiểu enterprise

| Tag | Purpose |
|-----|---------|
| `Environment` | prod / staging / dev |
| `Team` / `Owner` | Ai sở hữu |
| `Project` / `CostCenter` | Cost allocation |
| `Application` | App name |
| `Compliance` | PCI / HIPAA / none |
| `DataClassification` | Public / Internal / Confidential |
| `BackupPolicy` | daily / weekly / none |

### 7.3 Enforcement
- **Tag Policies** trong Organizations: enforce key + allowed value.
- **SCP**: deny `RunInstances` nếu không có tag.
- **AWS Config rule**: flag resource không tag.
- **IAM condition**: `aws:RequestTag` bắt tag khi create.

### 7.4 Cost allocation tags
- Activate trong Billing console (1-day delay).
- Tag inheritance: tag resource → tag cost.
- AWS-generated tag (`aws:createdBy`) miễn phí, dùng được sau active.

### 7.5 Pitfalls
- Tag inconsistent: `prod` vs `Production` vs `PROD` → 3 nhóm khác nhau.
- Tag không inherit (vd EBS không tự tag từ EC2).
- AWS-generated cost data có lag → tag mới setup phải đợi.

---

## 8. SCP guardrails cho cost

```json
// Block expensive instance types ở dev
{
  "Effect": "Deny",
  "Action": "ec2:RunInstances",
  "Resource": "arn:aws:ec2:*:*:instance/*",
  "Condition": {
    "StringNotLike": {
      "ec2:InstanceType": ["t3.*", "t4g.*", "m6i.large", "m6i.xlarge"]
    }
  }
}

// Block expensive region (chỉ allow region chính)
{
  "Effect": "Deny",
  "Action": "*",
  "Resource": "*",
  "Condition": {
    "StringNotEquals": { "aws:RequestedRegion": ["us-east-1", "ap-southeast-1"] }
  }
}

// Block SageMaker training instance lớn
{
  "Effect": "Deny",
  "Action": "sagemaker:CreateTrainingJob",
  "Resource": "*",
  "Condition": {
    "StringLike": { "sagemaker:InstanceTypes": ["ml.p4*", "ml.p5*"] }
  }
}
```

Combine với Budget Action: vượt budget → apply restrictive SCP tự động.

---

## 9. Trusted Advisor — built-in checks

### 9.1 Free checks
- Service limits.
- Security group port open to world.
- Root MFA.
- S3 bucket permission.

### 9.2 Business/Enterprise Support checks
- Idle Load Balancers, Underutilized EC2.
- Reserved Instance opportunities.
- Lambda timeout.

### 9.3 Use case
- Weekly review.
- Integrate với Security Hub, automate remediation.

---

## 10. AWS Compute Optimizer

(Đã đề cập [[ch4-01-compute-cost]].)

- Free ML recommendation cho EC2, ASG, EBS, Lambda.
- Cost + performance suggestions.
- Setup minimal: bật service, đợi 14 ngày data → recommendation.

---

## 11. FinOps framework

### 11.1 3 phase

1. **Inform**: visibility — Cost Explorer, CUR, tagging.
2. **Optimize**: action — right-size, RI/SP, lifecycle, decommission.
3. **Operate**: continuous — budget, alarm, dashboard, KPI.

### 11.2 KPIs
- Cost per customer / per request / per GB.
- Savings Plan utilization (target > 95%) + coverage (target > 70%).
- % idle resource.
- Tag compliance rate.

### 11.3 Cultural
- Showback / chargeback per team → ownership.
- Cost dashboard chia team.
- Engineering cost vào OKR.

---

## 12. AWS Pricing tools

### 12.1 AWS Pricing Calculator
- Estimate trước deploy.
- Compare scenario.
- Export report cho stakeholder.

### 12.2 AWS Migration Hub Strategy
- Pre-migration TCO estimate.

### 12.3 AWS Customer Carbon Footprint Tool
- Cost optional dimension: carbon footprint của workload.

---

## 13. Patterns enterprise

### 13.1 Multi-account cost governance
- Org master account: Consolidated Billing, Budget central.
- Each team account: own budget + budget action.
- Centralize CUR ở account audit.
- IAM Identity Center: SSO cho cost console.

### 13.2 Showback workflow
1. CUR → Athena → daily query group by tag `Team`.
2. Output → email/Slack mỗi team weekly.
3. Quarterly: spend review meeting với engineering lead.

### 13.3 Cost gate trong CI/CD
- Infracost / OpenCost / cloud cost tool integrate với Terraform plan.
- PR review thấy cost diff trước merge.

---

## 14. Ví dụ setup cho 3 org

### 14.1 Startup 5 người
- Single account → multi account khi scale.
- Budget $500/tháng total + alert.
- Cost Anomaly Detection bật.
- Trusted Advisor weekly check.

### 14.2 Scale-up 50 người
- Org với account per env (prod/staging/dev).
- Budget per env.
- Cost Explorer dashboard cho engineering team.
- Tagging required (Config rule + SCP).
- Monthly FinOps review.

### 14.3 Enterprise 1000 người
- Org với 50+ account.
- CUR → Redshift → BI dashboard.
- FinOps team dedicated.
- EDP negotiate.
- Showback/chargeback per business unit.
- Cost dashboard per team trong internal portal.

---

## 15. Cạm bẫy đề thi (SAA)

1. **"AWS Budgets dừng resource khi vượt limit"** → **Sai mặc định**. Cần config Budget Action explicit.
2. **"Cost Explorer real-time"** → **Sai**, lag 24h.
3. **"Tag tự inherit từ parent resource"** → **Sai**, phải set explicit (vài service inherit như Auto Scaling).
4. **"Cost Anomaly Detection thay thế Budget"** → **Không**. Anomaly = unusual spike, Budget = absolute limit.
5. **"Consolidated Billing tự tier discount"** → **Đúng** cho service eligible (S3, data transfer).
6. **"Cost Explorer free unlimited"** → API call past 12 tháng tốn tiền.
7. **"Trusted Advisor full free"** → **Sai**, full checks cần Business/Enterprise Support.

---

## 16. Tóm tắt 1 dòng

> Cost không tự quản. Stack: **Cost Explorer** (trend), **Budgets** (limit + action), **Anomaly Detection** (spike), **CUR + Athena** (deep), **Tagging** (group by), **SCP** (guardrail), **FinOps process** (continuous). Inform → Optimize → Operate.

---

## 17. Bài tập tự kiểm tra

1. Startup vừa nhận seed $500k. Setup cost governance từ ngày 1 — minimum viable stack?
2. Dev team đốt $20k/tháng không ai biết. Plan để có visibility trong 1 tuần?
3. Tag inconsistent: 30% resource không tag, 20% tag sai key. Cleanup strategy?
4. Budget alert email không ai đọc. Cách make accountable?
5. Forecast Q4 spend vượt 30% budget. Cách action trước khi xảy ra?
6. Multi-account org, 1 account spike $10k 1 ngày. Detect/respond trong 1h thế nào?

---

## 18. Đọc thêm

- AWS Whitepaper — *Cost Optimization Pillar*, *Tagging Best Practices*.
- *AWS FinOps Foundation*.
- AWS Builder's Library — *Cost optimization* series.
- AWS docs — *Cost Explorer*, *Budgets*, *CUR* user guides.

---

**🎉 Chương 4 và SAA-C03 (chapter 1-4) hoàn thành!**

Bạn đã có nền tảng để:
- Đọc đề SAA với cách nhìn architect, không phải checklist.
- Áp dụng vào hệ thống thực tế.

Bước tiếp theo có thể:
- Làm SAA practice exam (Tutorials Dojo, Stephane Maarek).
- Review lại Foundation [[foundations-01-cap-theorem]] đến [[foundations-06-failure-modes]] sau khi qua chương 2-4 — sẽ "click" sâu hơn.
- Hands-on lab build 1 architecture end-to-end (multi-AZ web app, CI/CD, observability).
