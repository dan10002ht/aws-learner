# Bài 2 — Shared Responsibility Model

## 1. Mục tiêu
- Biết cái gì là của AWS, cái gì là của bạn.
- Áp dụng đúng mô hình cho EC2, S3, RDS, Lambda.

## 2. Lý thuyết

> **AWS chịu trách nhiệm "Security OF the Cloud"**
> **Customer chịu trách nhiệm "Security IN the Cloud"**

### AWS lo (Security OF the Cloud)
- Hạ tầng vật lý: datacenter, điện, điều hoà, bảo vệ.
- Phần cứng: server, ổ đĩa, network thiết bị.
- Virtualization layer (hypervisor).
- Managed service internals (ví dụ OS của RDS, runtime của Lambda).

### Customer lo (Security IN the Cloud)
- **Data** (luôn luôn là của bạn).
- **IAM** — ai được làm gì.
- **OS patching** — nếu là EC2.
- **Network config** — SG, NACL, VPC.
- **App-level security** — code, dependency, input validation.
- **Encryption** — bật hay không, key quản lý thế nào (KMS vs CMK customer-managed).

### Khác nhau theo service
| Service | Bạn vẫn lo | AWS lo thêm |
|---------|-----------|-------------|
| **EC2** | OS patching, firewall, app, data | Hypervisor, hardware |
| **RDS** | DB user, schema, query, backup retention config, encryption choice | OS, DB engine patch, HW |
| **S3** | Bucket policy, ACL, encryption choice, object permission | Durability, HW |
| **Lambda** | Code, IAM role, env var (secret), VPC config | Runtime, OS, HW, scaling |

**Mẹo thi:** Càng "managed" thì AWS lo càng nhiều, bạn chỉ còn lo **data + IAM + config** (và code nếu có).

### Ví dụ thực tế
- S3 bucket bị leak data → **lỗi của customer** (bucket policy sai), không phải AWS.
- Datacenter cháy → AWS chịu, nhưng nếu bạn không bật replication thì mất data là bạn chịu ([RPO](https://en.wikipedia.org/wiki/Recovery_point_objective)).
- RDS engine có CVE → AWS tự patch trong **maintenance window** bạn chọn.

## 3. Hands-on
**Có account:** Mở 1 S3 bucket, bật **Block Public Access**, upload 1 file, thử `curl` URL public → 403. Đó là customer config đúng.

**Không account:** Tải 1 bucket policy mẫu "public read", đọc và sửa thành "chỉ cho IP văn phòng 203.0.113.0/24":
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::my-bucket/*",
    "Condition": { "IpAddress": { "aws:SourceIp": "203.0.113.0/24" } }
  }]
}
```

## 4. Tự kiểm tra
1. Trên EC2, ai chịu trách nhiệm patching OS?
2. Trên RDS, ai patching DB engine?
3. Bucket S3 public do sai policy — lỗi của ai?
4. AWS có thể thấy và đọc data của bạn không? (Gợi ý: có, nếu bạn không encrypt with your own key; họ có policy/access control, nhưng về mặt kỹ thuật data nằm trên hạ tầng của họ.)

## 5. Đối chiếu GCP
GCP cũng có **Shared Responsibility Model** tương tự (tên: "Shared fate" ở tài liệu mới). Nguyên lý giống nhau: cloud provider lo hạ tầng, bạn lo data + IAM + config.

Điểm khác thực tế:
- GCP có **Organization Policy** (constraints) áp từ trên xuống — AWS tương đương là **SCP (Service Control Policy)**.
- GCP bật **encryption at rest mặc định cho mọi service** (với Google-managed key). AWS **không bật mặc định cho mọi service** — ví dụ S3 từ 2023 mới mặc định SSE-S3, EBS bạn phải bật "encryption by default" ở account level. → **Bẫy:** trong AWS, đừng giả định "mọi thứ encrypted by default" như GCP.
- GCP "Access Transparency" log cả khi nhân viên Google truy cập data. AWS có tương đương trong whitepaper nhưng feature công khai ít hơn.

## 6. Flashcard
- **OF the Cloud** = AWS.
- **IN the Cloud** = Customer.
- **Always yours:** Data, IAM, Encryption choice.
