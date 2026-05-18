# Practice 02 — Shared Responsibility

Liên kết bài: [lessons/02-shared-responsibility.md](../../lessons/02-shared-responsibility.md)

## Mục tiêu
- Phân biệt được phần AWS lo vs Customer lo cho từng service.
- Thực hành **demo lỗ hổng** do customer config sai (S3 public).

---

## Exercise 1 — Phân loại trách nhiệm
Với mỗi tình huống, chọn **AWS** hay **Customer** chịu trách nhiệm:

| # | Tình huống | AWS / Customer? |
|---|------------|------------------|
| 1 | Datacenter cháy, ổ đĩa hỏng |  |
| 2 | EC2 bị brute force SSH port 22 mở `0.0.0.0/0` |  |
| 3 | RDS engine có CVE, cần patch |  |
| 4 | App SQL injection vì code không validate input |  |
| 5 | S3 bucket bị crawl public vì sai Block Public Access |  |
| 6 | Lambda runtime Node.js 18 EOL, cần upgrade |  |
| 7 | EBS volume hỏng vật lý → AWS thay HW |  |
| 8 | IAM user bị lộ access key vì commit lên GitHub |  |
| 9 | Hypervisor bug làm 2 VM cùng host nhìn thấy nhau |  |
| 10 | DynamoDB throttling vì design partition key sai |  |

→ Đáp án: [solution.md](solution.md).

---

## Exercise 2 — Demo S3 public misconfig (LocalStack)

```bash
cd practice/02-shared-responsibility/localstack
./exercise-public-bucket.sh
```

Script này sẽ:
1. Tạo bucket `learn-public-demo`.
2. Tắt **Block Public Access** (giả lập sai config).
3. Gắn bucket policy `"Principal": "*"` cho `s3:GetObject`.
4. Upload file `secret.txt`.
5. Curl URL public → đọc được.

**Câu hỏi:**
1. Đây là lỗi của ai theo Shared Responsibility?
2. Phải sửa thế nào để chỉ user trong VPC truy cập được?
3. Nếu file đã bị crawl, xóa file có đủ không?

---

## Exercise 3 — Encryption choice
Tạo S3 bucket với 3 setting encryption khác nhau và quan sát ai quản lý key:

```bash
# 1. SSE-S3 (AWS managed, default từ 2023)
aws s3api create-bucket --bucket learn-sse-s3-$(date +%s) --region ap-southeast-1 \
  --create-bucket-configuration LocationConstraint=ap-southeast-1

# 2. SSE-KMS với AWS managed key
aws s3api put-bucket-encryption --bucket <name> \
  --server-side-encryption-configuration '{
    "Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"aws:kms"}}]
  }'

# 3. SSE-KMS với Customer Managed Key (CMK) — bạn tạo + rotate
aws kms create-key --description "learner-cmk"
# Lấy KeyId, gắn vào bucket encryption
```

**So sánh:** Mỗi loại, ai giữ key? Ai rotate? Chi phí thế nào?

→ Đáp án: [solution.md § Ex3](solution.md#exercise-3).

---

## Exercise 4 — Vẽ Shared Responsibility cho 4 service
Trên 1 trang giấy / Excalidraw, vẽ bảng:

```
              | AWS lo                  | Customer lo
EC2           |                         |
RDS           |                         |
Lambda        |                         |
S3            |                         |
```

Điền vào ít nhất 4 mục mỗi ô.

---

## Teardown
```bash
./teardown.sh   # xóa bucket, KMS schedule deletion (7 ngày tối thiểu)
```
