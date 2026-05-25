# Solution — Practice 08

## Exercise 9 — FinOps quick wins checklist

1. **Tag mọi resource** với `Project`, `Owner`, `Environment` + bật **Cost Allocation Tags**.
2. **Stop dev/test ngoài giờ** (Instance Scheduler) → save ~60% EC2.
3. **Mua Compute Savings Plan 1y no-upfront** cho baseline → save 30–55%.
4. **Chuyển sang Graviton** (m7g, c7g, r7g) cho workload portable → save 20–40%.
5. **S3 Intelligent-Tiering** + lifecycle abort multipart cho mọi bucket.
6. **CloudWatch Logs retention** = 30 ngày (default vô tận).
7. **VPC Gateway Endpoint S3 + DynamoDB** thay traffic qua NAT GW.
8. **Release EIP idle** + delete EBS unattached + delete snapshot cũ.
9. **Right-size EC2** dựa trên Compute Optimizer (verify peak).
10. **Bật Cost Anomaly Detection** (free) + Budget alarm.

## Exercise 2 — Pricing (tham khảo 2026, ap-southeast-1, $/tháng)
| Scenario | EC2 (2×) | RDS Multi-AZ | EBS | S3 | Egress 1TB | Total |
|----------|----------|--------------|-----|-----|------------|-------|
| On-Demand m6i.large | $137 | $312 | $16 | $5 | $90 | **~$560** |
| 3y RI all-upfront | $53 | $130 | $16 | $5 | $90 | **~$294** |
| Compute SP 3y no-up | $62 | $130 | $16 | $5 | $90 | **~$303** |
| Graviton m7g + SP 3y | $43 | $130 | $16 | $5 | $90 | **~$284** |

→ Graviton + SP 3y = best (~49% saving so on-demand).
