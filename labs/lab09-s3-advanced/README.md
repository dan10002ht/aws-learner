# Lab 09 — S3 Advanced (Versioning + Lifecycle + Replication + Presigned + OAC)

> **Trạng thái:** Skeleton — chưa có `lab.sh`. Sẽ bổ sung sau.

Lesson: [../../lessons/saa-c03/14-storage-design.md](../../lessons/saa-c03/14-storage-design.md), [../../lessons/saa-c03/ch2-02-storage-performance.md](../../lessons/saa-c03/ch2-02-storage-performance.md)

## Mục tiêu
Tiếp nối [lab01](../lab01-s3-basics/), đi sâu các pattern **production** thường gặp:

- **Lifecycle policy** end-to-end (Standard → IA → Glacier → Expire)
- **Cross-Region Replication (CRR)** + Same-Region Replication (SRR)
- **Replication Time Control (RTC)** — 15 min SLA
- **Presigned URL** + presigned POST
- **CloudFront + S3 private** với **OAC** (Origin Access Control, mới thay OAI)
- **Multipart upload** cho file lớn
- **S3 Select** — query subset không tải full object
- **Object Lock** (compliance / governance mode) — WORM
- **Inventory + Storage Lens** (chỉ AWS thật, LocalStack giới hạn)

## Kiến thức SAA-C03 trọng tâm

| Khái niệm | Bẫy đề thi |
|---|---|
| **CRR pre-req** | Versioning **bật cả 2 bucket**, replication role có quyền |
| **RTC** | SLA 15 phút cho 99.99% object; thêm tiền |
| **Replicate object đã có sẵn** | Mặc định **chỉ replicate object MỚI**. Muốn cũ → **Batch Replication** |
| **Delete marker replication** | Optional, mặc định tắt — đề hay hỏi |
| **Lifecycle transition min** | 30 ngày ở Standard trước khi sang IA (nếu object < 128 KB không transition) |
| **Glacier restore** | Expedited (1-5 phút, đắt), Standard (3-5h), Bulk (5-12h, rẻ nhất) |
| **Presigned URL** | Max 7 ngày (signature v4). Cho upload/download tạm thời, không cần IAM |
| **OAC vs OAI** | OAC = mới, support SSE-KMS, IPv6, mọi region. OAI = legacy |
| **S3 Transfer Acceleration** | Upload qua CloudFront edge — kích hoạt tại bucket level, **không** cho China region |
| **Multipart upload** | Bắt buộc ≥ 5GB, khuyên ≥ 100MB. Part size 5MB-5GB, max 10000 part |
| **Object Lock Compliance** | Không ai (kể cả root) xóa được trước retention end |
| **Object Lock Governance** | Có IAM permission đặc biệt mới override được |

### Scenario hay gặp

**Q:** Bucket A (us-east-1) cần replicate sang bucket B (eu-west-1) cho DR, yêu cầu **15 phút SLA**. Bật gì?

<details><summary>Đáp án</summary>
CRR + **Replication Time Control (RTC)**. Cả 2 bucket bật versioning.
</details>

**Q:** CloudFront serve static asset từ S3. Bucket muốn **private hoàn toàn**, chỉ CloudFront access được, encrypt SSE-KMS. Cấu hình?

<details><summary>Đáp án</summary>
**OAC** (Origin Access Control) — OAI cũ **không** support SSE-KMS. Bucket policy chỉ allow principal `cloudfront.amazonaws.com` với condition `AWS:SourceArn = distribution-arn`.
</details>

**Q:** App upload file 3 GB từ mobile qua mạng yếu, hay bị fail giữa chừng. Giải pháp?

<details><summary>Đáp án</summary>
**Multipart upload** — chia part, fail part nào retry part đó. Kèm **Transfer Acceleration** nếu user xa region.
</details>

## Plan script (sẽ viết)

```bash
# 1. Tạo 2 bucket (source + replica), bật versioning cả 2
# 2. Tạo IAM role replication, bật CRR
# 3. Lifecycle: Standard → IA (30d) → Glacier Flexible (90d) → Expire (365d)
# 4. Presigned URL: upload + download
# 5. (Bonus) Multipart upload file 50MB tự tạo
# 6. Object Lock Governance mode, test xóa
```

## Câu hỏi tự kiểm tra

1. CRR có replicate object đã tồn tại trước khi bật replication không?
2. Presigned URL có thể có hiệu lực >7 ngày không? Vì sao?
3. OAC khác OAI ở điểm nào quan trọng nhất cho SSE-KMS?
