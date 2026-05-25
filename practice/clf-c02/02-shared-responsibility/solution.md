# Solution — Practice 02

## Exercise 1 — Đáp án

| # | Tình huống | Ai? | Giải thích |
|---|------------|-----|------------|
| 1 | Datacenter cháy, ổ đĩa hỏng | **AWS** | Hạ tầng vật lý. |
| 2 | EC2 brute force SSH `0.0.0.0/0` | **Customer** | Security Group là customer config. |
| 3 | RDS engine CVE patch | **AWS** | Managed service, AWS auto-patch trong maintenance window. |
| 4 | SQL injection | **Customer** | App code = customer. |
| 5 | S3 public misconfig | **Customer** | Bucket policy là customer. |
| 6 | Lambda runtime EOL | **Customer** | AWS thông báo, customer phải migrate code. |
| 7 | EBS HW hỏng | **AWS** | AWS tự thay, data còn nguyên (RAID/replication). |
| 8 | Access key bị lộ trên GitHub | **Customer** | Credential mgmt = customer. |
| 9 | Hypervisor bug | **AWS** | Virtualization layer. |
| 10 | DynamoDB hot partition | **Customer** | Schema/key design là customer. |

## Exercise 3 — Encryption choice

| Loại | Ai giữ key | Ai rotate | Cost | Use case |
|------|------------|-----------|------|----------|
| **SSE-S3** | AWS, không expose | AWS auto | Free | Default, đủ cho hầu hết |
| **SSE-KMS (AWS-managed)** | AWS, key xuất hiện trong KMS console | AWS, 1 năm | Free key, $0.03/10k API call | Cần audit qua CloudTrail |
| **SSE-KMS (Customer-managed CMK)** | AWS lưu, bạn kiểm soát policy | Bạn bật, 1 năm | **$1/key/tháng** + API calls | Cần compliance, key policy, cross-account |
| **SSE-C** | **Bạn gửi key mỗi request** | Bạn | Free | Bạn không muốn AWS giữ key |
| **DSSE-KMS** (Dual layer) | KMS | KMS | $$$$ | Top secret |

**Lưu ý:**
- S3 từ 2023 mặc định bật SSE-S3 → encryption at rest mặc định.
- CMK có thể disable/delete → mất data vĩnh viễn (đó là feature, không phải bug — gọi là **crypto-shred**).

## Exercise 2 — Demo public bucket
1. **Customer lỗi** — Block Public Access bị tắt + bucket policy `Principal: "*"`.
2. Fix: Bật lại Block Public Access (account-level), thay policy bằng condition `aws:SourceVpce` để chỉ VPC endpoint truy cập, hoặc dùng presigned URL.
3. Xóa file **không đủ** — phải coi như data đã leak: rotate secret, key, password, audit log truy cập (CloudTrail data event), thông báo bên liên quan (GDPR/compliance).
