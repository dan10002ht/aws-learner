# Solution — Practice 06

## Exercise 5 — IP planning

VPC `10.0.0.0/16` = 65,536 IP. Chia 12 subnet `/22` = 12 × 1024 = 12,288 IP.

Mỗi `/22` = 1024 IP, AWS reserve 5 → **1019 usable**.

Plan suggestion (3 AZ × 4 tier):

| Tier | AZ-a | AZ-b | AZ-c |
|------|------|------|------|
| Public | 10.0.0.0/22 | 10.0.4.0/22 | 10.0.8.0/22 |
| Private | 10.0.12.0/22 | 10.0.16.0/22 | 10.0.20.0/22 |
| DB | 10.0.24.0/22 | 10.0.28.0/22 | 10.0.32.0/22 |
| Mgmt | 10.0.36.0/22 | 10.0.40.0/22 | 10.0.44.0/22 |

Còn 10.0.48.0/20 (4096 IP) reserved cho future expansion.

## Lưu ý chung
- /22 hơi rộng cho hầu hết app. Dùng /24 (251 usable) là đủ cho Fargate/Lambda.
- Reserve /16 hoặc /17 cho future EKS/Fargate (mỗi pod ăn 1 IP, scale lớn).
