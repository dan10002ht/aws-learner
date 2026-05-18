# Lab 01 — S3 Basics

## Mục tiêu
Hiểu các khái niệm S3 được hỏi NHIỀU trong SAA-C03:
- Bucket, object, key, prefix
- **Versioning** (suspended → enabled → MFA Delete)
- **Storage classes** (Standard, IA, One Zone-IA, Glacier Instant/Flexible/Deep Archive)
- **Lifecycle policy** (transition + expiration)
- **Server-Side Encryption** (SSE-S3 / SSE-KMS / SSE-C)
- **Presigned URL**
- **Block Public Access**

## Kiến thức SAA-C03 trọng tâm

| Khái niệm | Câu hỏi exam hay gặp |
|---|---|
| **Standard-IA vs One Zone-IA** | "Data ít truy cập, có thể recreate được, rẻ nhất?" → One Zone-IA |
| **Glacier Flexible vs Deep Archive** | "Restore 12h chấp nhận được, rẻ nhất?" → Deep Archive (retrieve 12h, $1/TB/tháng) |
| **Glacier Instant Retrieval** | "Archive nhưng đôi khi cần truy cập ms" → Instant Retrieval |
| **Intelligent-Tiering** | "Access pattern không đoán được" → Intelligent-Tiering |
| **Lifecycle transition** | Object phải ≥ 30 ngày ở Standard trước khi chuyển sang IA |
| **MFA Delete** | Phải bật bởi root user, dùng để chống xoá nhầm version |
| **Cross-Region Replication (CRR)** | Yêu cầu: versioning bật ở cả 2 bucket |
| **S3 Transfer Acceleration** | Upload từ xa nhanh hơn qua CloudFront edge |
| **Block Public Access** | 4 setting; override bucket policy nếu bật |
| **Presigned URL** | Cấp quyền tạm cho object không cần IAM |

## Chạy lab

```bash
cd ~/projects/aws-practice/lab01-s3-basics
bash lab.sh
```

Hoặc copy từng lệnh chạy thủ công để hiểu rõ.

## Câu hỏi tự kiểm tra (SAA-style)

1. Một công ty lưu log truy cập, **truy cập thường xuyên trong 30 ngày đầu**, sau đó hiếm khi truy cập trong 60 ngày, sau 90 ngày archive lâu dài (chấp nhận retrieve vài giờ). **Lifecycle policy nào rẻ nhất?**
   - <details><summary>Đáp án</summary>Standard (0–30) → Standard-IA (30–90) → Glacier Flexible Retrieval (>90). Lưu ý: không transition trực tiếp Standard → Glacier nếu < 30 ngày ở Standard.</details>

2. Yêu cầu: encryption ở rest, **AWS quản lý key, audit được key usage**. Chọn loại SSE nào?
   - <details><summary>Đáp án</summary>SSE-KMS (CloudTrail log từng request decrypt). SSE-S3 không audit được. SSE-C bạn quản lý key.</details>

3. Bucket public bị Block Public Access (BPA) bật ở **account level**. Bucket policy `Principal: "*"` Allow `s3:GetObject`. Object có public không?
   - <details><summary>Đáp án</summary>Không. BPA override mọi bucket policy / ACL public. BPA ở account level = trùm.</details>
