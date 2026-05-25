# Practice 08 — Billing & Cost Management

Liên kết bài: [lessons/08-billing.md](../../lessons/08-billing.md)

## Exercise 1 — Setup Budget (BẮT BUỘC, làm 1 lần)
Console: Billing → Budgets → Create budget.
- Cost budget $5/tháng.
- Alert actual > 80%, forecast > 100%.
- Subscriber: email.

CLI:
```bash
aws budgets create-budget --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget file://budget.json --notifications-with-subscribers file://notifications.json
```

## Exercise 2 — Pricing Calculator
https://calculator.aws/

Estimate 1 month cho 3-tier web app:
- 2 EC2 m6i.large 24/7 (ap-southeast-1)
- 1 RDS db.r6i.large MySQL Multi-AZ
- 200GB EBS gp3
- 500GB S3 Standard
- 1TB egress

So sánh 4 scenario:
1. On-Demand
2. 3-year RI all-upfront
3. Compute SP 3-year no-upfront
4. Graviton m7g.large + EC2 SP 3-year all-upfront

## Exercise 3 — Cost Explorer drill
Sau 2–3 ngày dùng AWS:
- Group by Service → top 3 service tốn nhất.
- Filter EC2 → group by Instance Type.
- Add forecast 30 ngày.
- Export CSV.

## Exercise 4 — Cost Anomaly Detection
Console → Cost Management → Anomaly Detection:
- Monitor: AWS services.
- Subscription email khi anomaly > $5.

## Exercise 5 — Tag enforcement với SCP (advanced)
Trong Organization, tạo SCP deny EC2 launch không có tag `Project`:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Deny",
    "Action": "ec2:RunInstances",
    "Resource": "arn:aws:ec2:*:*:instance/*",
    "Condition": { "Null": {"aws:RequestTag/Project": "true"} }
  }]
}
```

Apply lên Sandbox OU. Test: launch EC2 không tag → bị deny.

## Exercise 6 — Trusted Advisor review
Console → Trusted Advisor:
- Cost Optimization: idle EC2, EBS unattached, EIP idle, RI underutilized.
- Action plan: list 5 thứ cần fix.

## Exercise 7 — CUR + Athena (advanced)
1. Bật CUR → S3 bucket `learn-cur-bucket`.
2. Athena CREATE TABLE pointing to CUR Parquet.
3. Query:
   ```sql
   SELECT line_item_product_code, SUM(line_item_unblended_cost) AS cost
   FROM cur
   WHERE bill_billing_period_start_date = DATE '2026-05-01'
   GROUP BY line_item_product_code
   ORDER BY cost DESC LIMIT 10;
   ```
4. Tạo QuickSight dashboard.

## Exercise 8 — Compute Optimizer
Đợi 14 ngày sau khi launch EC2 → Console → Compute Optimizer → Recommendations.
- Down-size candidate?
- Saving estimate?
- Verify peak CPU/RAM trước khi apply.

## Exercise 9 — FinOps checklist (giấy)
List 10 quick wins cho account hiện tại:
1. ___
2. ___
…

→ [solution.md](solution.md)
