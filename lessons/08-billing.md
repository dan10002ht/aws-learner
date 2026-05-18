# Bài 8 — Billing, Pricing, Support & Management Tools

## 1. Mục tiêu
Sau bài này bạn có thể:
- Hiểu AWS pricing model + estimate cost với Pricing Calculator.
- Phân biệt Cost Explorer / Budgets / CUR / Trusted Advisor / Compute Optimizer.
- Biết các Support Plan (Basic → Enterprise).
- Sử dụng AWS Organizations, SCP, Control Tower (mức CLF).
- Đặt nền cho FinOps đi làm.

---

## 2. Lý thuyết

### 2.1 Mô hình pricing AWS — 3 dimension cốt lõi

1. **Compute** — pay per second/hour (EC2, Lambda invocation + duration).
2. **Storage** — pay per GB-tháng (S3, EBS, EFS).
3. **Data Transfer** — pay per GB egress (TRAP lớn).

**Free Tier** 3 loại:
- **12 months free** — EC2 t2/t3.micro 750h, RDS 750h, S3 5GB, ELB 750h…
- **Always free** — Lambda 1M req + 400k GB-s/tháng, DynamoDB 25GB, CloudWatch 10 metric…
- **Trials** — short-term (ví dụ Lightsail 1 tháng).

**Free service** (forever, chỉ tính resource bên trong):
- IAM, VPC, Organizations, Auto Scaling, CloudFormation, Beanstalk, OpsWorks.

### 2.2 EC2 pricing recap

(Đã nói chi tiết bài 4)

| Model | Saving | Use case |
|-------|--------|----------|
| On-Demand | 0% | Spike, unpredictable |
| Reserved Instance | 72% | Steady 1/3y |
| Compute Savings Plan | 66% | Flexible EC2+Fargate+Lambda |
| EC2 Instance SP | 72% | Fix family/region |
| Spot | 90% | Stateless, batch |
| Dedicated Host | đắt | BYOL license |
| Capacity Reservation | 0% | Đảm bảo HW, không discount |

### 2.3 Storage & Transfer pricing

- **S3**: $/GB-tháng tuỳ class (Standard $0.023 → Deep Archive $0.00099).
- **EBS**: gp3 ~$0.08/GB-tháng, io2 BX cao hơn nhiều.
- **EFS**: $0.30/GB Standard, $0.025 IA.
- **Data transfer**:
  - **In** → AWS: **free**.
  - **Out** → Internet: $0.09/GB (giảm theo volume).
  - **Cross-Region**: $0.02/GB (varies).
  - **Cross-AZ** trong region: **$0.01/GB mỗi chiều** (BẪY).
  - Same AZ same VPC private IP: **free**.
  - Qua **CloudFront**: rẻ hơn direct egress.

### 2.4 Cost Management tools

#### a) **AWS Pricing Calculator** (https://calculator.aws/)
- Estimate cost **trước khi deploy**.
- Save & share estimate với team.
- Replace "Simple Monthly Calculator" (deprecated).

#### b) **Billing Dashboard**
- Overview chi phí tháng, forecast.
- Bills (PDF), Invoice.

#### c) **Cost Explorer**
- Phân tích **lịch sử** chi phí + **forecast 12 tháng**.
- Group by service, region, tag, AZ…
- Filter, drill-down.
- **Rightsizing recommendations** built-in.
- **Reservation/SP recommendations**.

#### d) **AWS Budgets**
- Alert (email/SNS) khi:
  - Actual spend > X.
  - Forecast spend > X.
  - RI/SP utilization < X%.
- **Budgets Actions** (advanced): tự IAM deny / stop EC2 khi vượt budget.

#### e) **Cost & Usage Report (CUR)**
- CSV/Parquet detail từng line item → S3.
- Tích hợp Athena / QuickSight để build dashboard custom.
- Nguồn dữ liệu chính cho FinOps.

#### f) **Cost Anomaly Detection**
- ML-based, detect spike bất thường.
- Free.
- Alert qua email/SNS.

#### g) **Compute Optimizer**
- Recommend right-size EC2/EBS/Lambda/ASG.
- Dựa trên 14 ngày metric.
- Free (basic), enhanced có phí.

#### h) **Trusted Advisor**
- 5 categories: Cost, Performance, Security, Fault Tolerance, Service Limits.
- 7 core check free; full check **Business+ Support**.

#### i) **AWS Cost Categories** — tag/group cost theo logic kinh doanh (team, project, env).

### 2.5 Support Plans

| Plan | $/tháng | Response prod-down | TAM | TA | Use case |
|------|---------|--------------------|-----|----|----|
| **Basic** | $0 | Không | Không | 7 core | Everyone |
| **Developer** | $29+ | 12–24h business | Không | 7 core | Dev/test |
| **Business** | $100+ hoặc 3% usage | **< 1h** | Không | Full | Prod workload |
| **Enterprise On-Ramp** | $5,500+ | < 30 min | **Pool TAM** | Full | Mid-large enterprise |
| **Enterprise** | $15,000+ | **< 15 min** critical | **Dedicated TAM** | Full | Mission-critical |

**Key points đề thi:**
- **TAM** chỉ có ở **Enterprise** (dedicated) và **Enterprise On-Ramp** (pool).
- **Trusted Advisor full** từ **Business** trở lên.
- **Third-party software support** (OS, web server) từ **Business**.
- **Infrastructure Event Management (IEM)** ở Enterprise On-Ramp (request) và Enterprise (included).
- **Concierge billing** ở Enterprise.

### 2.6 AWS Organizations

- Quản lý **multi-account** từ 1 management account.
- **OU (Organizational Unit)** — group accounts (theo env, team).
- **SCP (Service Control Policy)** — chính sách giới hạn permission tối đa cho account/OU.
- **Consolidated Billing** — bill chung, share volume discount + RI/SP.
- Free.

**Features:**
- **Create account programmatically**.
- **Move accounts** giữa OU.
- **SCP** apply hierarchy: root → OU → account.
- **Service-linked roles** cho organization services (GuardDuty, Config, CloudTrail org trail…).

### 2.7 AWS Control Tower

- **Landing zone** automation: setup multi-account theo best practice.
- Tạo OU mặc định: Security (Audit + Log Archive), Sandbox, Workloads.
- **Guardrails** — preventive (SCP) hoặc detective (Config rule).
- **Account Factory** — vending machine tạo account chuẩn.
- Tích hợp **IAM Identity Center** cho SSO.

### 2.8 IAM Identity Center (recap)

- SSO cho multi-account + SaaS app.
- Replace AWS SSO cũ.
- Tích hợp IdP (Azure AD, Okta, Google Workspace).
- **Permission Set** gán user/group → account.

### 2.9 Management & Governance tools

| Tool | Mục đích |
|------|----------|
| **CloudWatch** | Metrics, logs, alarms, dashboards, events |
| **CloudTrail** | Audit log mọi API call, free 90 ngày management events |
| **AWS Config** | Track config change resource, compliance rules |
| **Systems Manager (SSM)** | Patch, Parameter Store, Session Manager, RunCommand |
| **Trusted Advisor** | Best practice checks |
| **Health Dashboard** | AWS service health + your resource events |
| **License Manager** | Track BYOL license |
| **Service Catalog** | IT-approved product portfolio |
| **Resource Access Manager (RAM)** | Share resource cross-account |
| **AWS Compute Optimizer** | Right-size recommendation |
| **AWS CloudShell** | Browser shell có AWS CLI, free |

### 2.10 Service Quotas
- Mỗi service có **limit** (e.g., VPC 5/region, EC2 vCPU 1152/region).
- Soft limit → request tăng qua **Service Quotas console** hoặc Support.
- Hard limit → không tăng được.

### 2.11 AWS Marketplace
- Mua software từ vendor (Bitnami, Palo Alto, Trend Micro…).
- Hourly / Annual / BYOL pricing.
- Bill chung vào AWS account.

---

## 3. Hands-on có account

### Lab 1 — Setup Budget alarm (5 phút, BẮT BUỘC)
Console: **Billing → Budgets → Create budget**:
- Type: Cost budget.
- Period: Monthly.
- Amount: $1 (hoặc $5 thực tế).
- Alert: actual > 80% → email.
- Alert: forecast > 100% → email.

CLI:
```bash
aws budgets create-budget --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget '{
    "BudgetName": "Monthly-1USD",
    "BudgetLimit": {"Amount": "1", "Unit": "USD"},
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' \
  --notifications-with-subscribers file://notifications.json
```

### Lab 2 — Cost Explorer (5 phút)
- Console → Cost Management → Cost Explorer.
- Enable lần đầu (free, mất 24h backfill).
- Filter: last 3 months, group by service.
- Export CSV.

### Lab 3 — Pricing Calculator (10 phút)
https://calculator.aws/:
- Add EC2 `t3.medium` 24/7 Linux ap-southeast-1.
- Add RDS `db.t3.medium` MySQL Multi-AZ.
- Add 200GB S3 Standard + 50GB egress.
- Save estimate share link.

### Lab 4 — Cost Anomaly Detection (5 phút, free)
Console → Cost Management → Cost Anomaly Detection:
- Create monitor: AWS services.
- Subscription: email khi anomaly > $10.

### Lab 5 — AWS Organizations (15 phút)
1. Console → Organizations → Create organization (management account).
2. Invite existing account hoặc create new member account.
3. Tạo OU `Sandbox`.
4. Apply SCP `DenyAllOutsideRegion` (chỉ allow `us-east-1`, `ap-southeast-1`):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyOtherRegions",
    "Effect": "Deny",
    "NotAction": ["iam:*","cloudfront:*","route53:*","support:*","organizations:*"],
    "Resource": "*",
    "Condition": {
      "StringNotEquals": {
        "aws:RequestedRegion": ["us-east-1","ap-southeast-1"]
      }
    }
  }]
}
```

### Lab 6 — Tag enforcement
Apply SCP yêu cầu mọi EC2 launch phải có tag `Project`:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Deny",
    "Action": "ec2:RunInstances",
    "Resource": "arn:aws:ec2:*:*:instance/*",
    "Condition": {
      "Null": {"aws:RequestTag/Project": "true"}
    }
  }]
}
```

---

## 4. Hands-on không tốn tiền

### Pricing Calculator exercise
Workload: web app 3-tier ap-southeast-1, traffic 100k user/tháng, ~50GB DB, ~200GB S3, ~500GB egress.

Tính cost cho 3 architecture:
1. **Self-managed**: 3 EC2 m6i.large + 1 RDS db.r6i.large Multi-AZ + 200GB S3.
2. **Serverless**: API GW + Lambda + DynamoDB On-Demand + S3.
3. **Container**: ECS Fargate + Aurora Serverless v2 + S3.

So sánh + chọn rẻ nhất + giải thích.

### Free Tier inventory
Liệt kê 10 service có free tier always-free + limit. Test bằng cách upload S3, invoke Lambda.

### CUR Athena
Free Tier không có. Bài tập: nếu có CUR, viết SQL Athena tính:
- Top 5 service tốn tiền nhất.
- Cost per tag `Environment`.
- Forecast cuối tháng dựa trên 15 ngày đầu.

---

## 5. Tự kiểm tra

1. Bạn cần TAM (Technical Account Manager) cá nhân hoá. Support plan nào?
   <details><summary>Đáp án</summary>**Enterprise** (dedicated TAM). Enterprise On-Ramp có pool TAM.</details>

2. Forecast spend tháng này > $100, muốn tự stop EC2. Dùng gì?
   <details><summary>Đáp án</summary>**AWS Budgets** với **Budgets Actions** — apply IAM policy hoặc stop EC2 tự động.</details>

3. Cost Explorer khác CUR ở chỗ nào?
   <details><summary>Đáp án</summary>**Cost Explorer**: console UI, filter/group, forecast, recommendation. **CUR**: file CSV/Parquet detail line item xuất ra S3, dùng cho dashboard custom Athena/QuickSight.</details>

4. Compute Optimizer khuyên down-size m6i.xlarge → m6i.large vì avg CPU < 10%. Áp dụng được không?
   <details><summary>Đáp án</summary>**Có thể**, nhưng cần verify peak (không chỉ avg) và workload có spike không. CPU 14 ngày không bao giờ phản ánh đủ.</details>

5. Free Tier "12 months free" áp dụng từ khi nào?
   <details><summary>Đáp án</summary>Từ **ngày tạo account**. Hết 12 tháng → mọi resource tính full price.</details>

6. Bạn có 5 account trong Organization. RI mua ở account A có chia sẻ với account B/C không?
   <details><summary>Đáp án</summary>**Có** — nếu bật **RI/SP sharing** (mặc định bật) trong Organizations. Account khác cùng AZ/instance type được hưởng.</details>

7. SCP có grant permission không?
   <details><summary>Đáp án</summary>**Không** — SCP chỉ **giới hạn trần**. User cần thêm IAM policy để có quyền. SCP allow + IAM deny = deny.</details>

8. Free service nào chỉ trả tiền resource bên trong?
   <details><summary>Đáp án</summary>VPC, IAM, Organizations, CloudFormation, Elastic Beanstalk, Auto Scaling. Bạn tạo VPC free nhưng EC2 trong VPC vẫn tính tiền.</details>

---

## 6. Đối chiếu GCP

| Khái niệm | AWS | GCP |
|-----------|-----|-----|
| Estimate trước | **Pricing Calculator** | **Pricing Calculator** |
| Cost analysis | **Cost Explorer** | **Cost Reports / Cost Table** |
| Budget alert | **AWS Budgets** | **Budgets** |
| Detail line item | **CUR (CSV/Parquet to S3)** | **BigQuery Billing Export** |
| Anomaly detection | **Cost Anomaly Detection** | **Cost Recommendations** |
| Right-size | **Compute Optimizer** | **Recommender** |
| Best-practice checker | **Trusted Advisor** | **Security Command Center + Recommender** |
| Multi-account container | **Organization + Account** | **Organization + Folder + Project** |
| Cross-account policy trần | **SCP** | **Organization Policy (constraints)** |
| Landing zone | **Control Tower** | **Cloud Foundation Toolkit (DIY) / Anthos** |
| SSO multi-account | **IAM Identity Center** | **Cloud Identity / Workforce IF** |
| Sustained discount auto | **không có** | **Sustained Use Discount** (free, auto) |
| Commit discount | **Reserved Instance / Savings Plan** | **Committed Use Discount (CUD)** |
| Spot | **Spot Instance** | **Spot VM / Preemptible** |
| Support plan | 5 tier (Basic→Enterprise) | 4 tier (Basic, Standard, Enhanced, Premium) |

**5 bẫy lớn:**
1. **Sustained Use Discount** GCP tự apply khi VM chạy > 25% tháng (free, không cần commit). AWS **không có**, phải chủ động mua SP/RI → tốn cost nếu quên.
2. **Multi-account model**: AWS có "Account" như isolation boundary (~= GCP Project). 1 dev team thường 3 account (dev/staging/prod), GCP thường 3 project trong cùng folder.
3. **Billing export**: GCP có **BigQuery Billing Export** built-in (SQL query ngay). AWS phải set up **CUR → S3 → Athena/QuickSight** (nhiều bước hơn).
4. **SCP** chỉ deny IAM action. **Org Policy GCP** rộng hơn (constraint cấu hình resource — VD `compute.disableSerialPortAccess`).
5. **Free tier always-free** AWS rộng (Lambda 1M req, DDB 25GB, CW 10 metric…). GCP cũng có (Cloud Run 2M req, Firestore 1GB, BQ 1TB query/tháng) nhưng workload "always free" mỗi bên khác nhau.

**Khi đi làm:**
- **FinOps** tool đa cloud: CloudHealth, Cloudability, Vantage, Apptio.
- Tag/Label chuẩn cross-cloud: `Environment`, `Owner`, `CostCenter`, `Project`.
- IaC quản lý budget: Terraform `aws_budgets_budget` + `google_billing_budget`.

---

## 7. Lưu ý khi thi CLF-C02

- **Free Tier 3 loại**: 12 months, always-free, trial.
- **Pricing Calculator** estimate trước.
- **Cost Explorer** phân tích quá khứ + forecast.
- **Budgets** alert + auto-action.
- **CUR** detail line item.
- **Cost Anomaly Detection** ML detect spike.
- **Trusted Advisor 5 categories**, 7 core free, full Business+.
- **Compute Optimizer** right-size, free.
- 5 **Support Plan**: Basic / Developer / Business / Enterprise On-Ramp / Enterprise.
- **TAM** chỉ Enterprise (dedicated) + On-Ramp (pool).
- **Trusted Advisor full** từ Business.
- **Organizations** free, consolidated billing, SCP giới hạn permission.
- **Control Tower** = landing zone automation.
- **Service Quotas** request tăng limit.

## 8. Lưu ý khi thi SAA-C03

- **Data transfer cost** (đặc biệt cross-AZ $0.01/GB mỗi chiều).
- **VPC Endpoint** giảm NAT cost.
- **CloudFront** giảm S3 egress.
- **Reserved Instance vs Savings Plan**: RI fix instance type; Compute SP linh hoạt EC2+Fargate+Lambda; EC2 SP fix family/region.
- **Spot Fleet capacity-optimized** strategy minimize interrupt.
- **S3 Intelligent-Tiering** auto move tier.
- **AWS Backup** centralize backup.
- **Resource Access Manager (RAM)** share VPC/subnet/TGW cross-account.

## 9. Lưu ý khi đi làm (FinOps)

### Tag strategy
- Bắt buộc tag từ ngày 1: `Environment`, `Owner`, `Project`, `CostCenter`.
- Apply SCP deny launch resource thiếu tag.
- Activate tag trong **Cost Allocation Tags** (Billing → Cost allocation tags).
- Báo cáo CUR group by tag → chargeback team.

### Quy trình FinOps
1. **Visibility** — tag + CUR + dashboard QuickSight.
2. **Optimization** — right-size + SP/RI + Spot + storage class.
3. **Governance** — Budgets + Anomaly Detection + SCP.

### Quick wins
- **Stop dev/test ngoài giờ** (Instance Scheduler) → save 60%.
- **Graviton (ARM)** → save 20–40%.
- **S3 Intelligent-Tiering** + **lifecycle** → save 30–80%.
- **VPC Endpoint** thay NAT GW data → save lớn.
- **CloudWatch Logs retention** = 30 ngày (default forever rất đắt).
- **Right-size** EC2 dựa trên Compute Optimizer.
- **Mua Compute SP 1 năm no-upfront** ngay khi workload ổn định 1 tháng.

### Anti-pattern
- ❌ Không tag → không biết tốn ở đâu.
- ❌ CloudWatch Logs retention "Never expire" → đắt theo thời gian.
- ❌ EIP idle / unused.
- ❌ EBS unattached → trả tiền vô ích.
- ❌ Snapshot không xóa → tích lũy theo thời gian.
- ❌ NAT GW serve S3 traffic → dùng Gateway Endpoint.
- ❌ Multi-AZ dev/test không cần thiết.
- ❌ Default CloudWatch detail monitoring trên mọi EC2 (1 phút) → tốn tiền.

---

## 10. Flashcard

- **Free Tier** — 12 months / always-free / trials.
- **Free service** — VPC, IAM, Org, CloudFormation, ASG, Beanstalk.
- **Pricing Calculator** — estimate trước deploy.
- **Cost Explorer** — phân tích + forecast.
- **Budgets** — alert + actions.
- **CUR** — detail line item → S3 → Athena/QuickSight.
- **Cost Anomaly Detection** — ML spike alert.
- **Compute Optimizer** — right-size recommendation.
- **Trusted Advisor** — 5 categories, full check Business+.
- **Support Plans** — Basic / Developer / Business / Enterprise On-Ramp / Enterprise.
- **TAM** — Enterprise (dedicated), On-Ramp (pool).
- **Organizations** — multi-account, consolidated billing, SCP.
- **SCP** — chỉ giới hạn trần, không grant.
- **Control Tower** — landing zone automation.
- **IAM Identity Center** — SSO multi-account.
- **Service Quotas** — request tăng limit.
- **AWS Marketplace** — mua software vendor.
- **Data transfer trap**: cross-AZ $0.01/GB, egress Internet $0.09/GB.
- **Tag from day 1** — bắt buộc cho FinOps.
