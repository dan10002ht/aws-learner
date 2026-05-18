# Solution — Practice 04

## Exercise 2 — User Data
1. Chạy với **root** (`whoami` → `root`).
2. Log: `/var/log/cloud-init-output.log` (tất cả stdout/stderr) + `/var/log/cloud-init.log`.
3. **Không** — user data chỉ chạy **lần đầu boot**. Reboot/stop/start không chạy lại. Muốn re-run: cấu hình `cloud-init` `runcmd` với `cloud-init clean` hoặc dùng SSM RunCommand.

## Exercise 5 — Spot
1. Spot `t3.micro` ở `ap-southeast-1` thường ~$0.003–0.005/h, On-Demand ~$0.0116/h → giảm 60–75%.
2. **2 phút** — IMDS endpoint `/latest/meta-data/spot/instance-action` trả về `stop` hoặc `terminate` + thời gian.
3. Graceful: drain connection khỏi LB, save state ra S3/DynamoDB, deregister consumer.

## Exercise 6 — Pricing (tham khảo, 2026)
| Model | $/h | $/3y | Saving |
|-------|-----|------|--------|
| On-Demand `m6i.xlarge` ap-southeast-1 | ~$0.214 | ~$5,624 | 0% |
| RI 3y all-upfront | ~$0.083 | ~$2,181 | 61% |
| Compute SP 3y no-upfront | ~$0.097 | ~$2,549 | 55% |
| EC2 SP 3y all-upfront | ~$0.083 | ~$2,181 | 61% |
| Spot avg | ~$0.04–0.07 | ~$1,500 | 70–80% |
| `m7g.xlarge` Graviton On-Demand | ~$0.171 | ~$4,494 | 20% so với m6i |
| `m7g.xlarge` Graviton SP 3y AU | ~$0.066 | ~$1,734 | **69%** |

→ **Best**: Graviton + EC2 SP 3y all-upfront ≈ $1,734 (69% saving). Nếu workload portable, **luôn dùng Graviton**.

## Anti-pattern review
- ❌ Hardcode access key user-data → dùng Instance Profile.
- ❌ Free Tier `t2.micro` + Unlimited mode → cost vọt nếu app CPU cao liên tục.
- ❌ EBS snapshot không cross-region → DR fail.
- ❌ SSH port 22 mở public → SSM Session Manager.
