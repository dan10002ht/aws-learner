# Practice 06 — VPC

Liên kết bài: [lessons/06-vpc.md](../../lessons/06-vpc.md)

## Exercise 1 — Tạo VPC 3-tier multi-AZ (AWS thật, có phí NAT)
```bash
cd practice/06-vpc/aws-cli && ./create-vpc.sh
```
Tạo:
- VPC 10.0.0.0/16
- 3 AZ × (public + private + DB) subnet
- IGW, 3 NAT GW (1/AZ)
- Route tables, SG ALB/App/DB chain

🚨 **Cost ~$0.135/h cho 3 NAT GW** — nhớ `./teardown.sh` ngay.

## Exercise 2 — Gateway Endpoint S3 (free, save NAT cost)
```bash
./add-s3-endpoint.sh
```
Verify private EC2 access S3 không qua NAT (xem CloudWatch metric NAT GW bytes).

## Exercise 3 — SG chain (10 phút)
Tạo:
- `alb-sg`: inbound 80/443 từ 0.0.0.0/0
- `app-sg`: inbound 8080 từ `alb-sg`
- `db-sg`: inbound 5432 từ `app-sg`

Test: app EC2 chỉ accept request đến từ ALB.

## Exercise 4 — NACL Deny IP (5 phút)
Block IP attacker `198.51.100.0/24`:
```bash
aws ec2 create-network-acl-entry --network-acl-id $NACL \
  --rule-number 100 --protocol -1 --rule-action deny \
  --cidr-block 198.51.100.0/24 --ingress
```
Note: SG không có Deny → NACL là chỗ duy nhất block IP.

## Exercise 5 — IP planning (giấy)
VPC `10.0.0.0/16` chia 12 subnet `/22`:
- 3 public + 3 private + 3 DB + 3 management.
- Mỗi subnet bao nhiêu IP usable?
- Liệt kê CIDR từng subnet.

→ [solution.md](solution.md)

## Exercise 6 — Route 53 + ALB
1. Đăng ký domain (hoặc dùng `learn.example.com` fake).
2. Hosted zone.
3. Alias record A → ALB DNS.
4. Health check fail → failover policy sang secondary ALB.

## Exercise 7 — VPC Flow Logs analysis
Bật Flow Logs → CloudWatch, query:
```
fields @timestamp, srcAddr, dstAddr, action, bytes
| filter action = "REJECT"
| stats count() by srcAddr
| sort by count() desc
| limit 20
```
Tìm top 20 IP bị reject nhiều nhất.

## Exercise 8 — Diagram (no-cost)
Vẽ Excalidraw kiến trúc đầy đủ: VPC, 3 AZ, ALB, ASG, RDS Multi-AZ, NAT GW, Gateway Endpoint, CloudFront, Route 53. Lưu `diagrams/3-tier-full.excalidraw`.

## Teardown ⚠️
```bash
./teardown.sh
```
Verify NAT GW đã delete trong console (mất 1–2 phút). Release EIP để không bị charge $0.005/h.
