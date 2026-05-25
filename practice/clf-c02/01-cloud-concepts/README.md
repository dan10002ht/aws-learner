# Practice 01 — Cloud Concepts & Global Infrastructure

Liên kết bài: [lessons/01-cloud-concepts.md](../../lessons/01-cloud-concepts.md)

## Mục tiêu
- Quen với AWS console + CLI cơ bản.
- Hiểu region/AZ qua thao tác thực tế.
- Setup an toàn (MFA, Budget, IAM user) trước khi học các bài sau.

---

## Exercise 1 — Setup account an toàn (BẮT BUỘC, làm 1 lần)
**Tiêu chí pass:**
- [ ] MFA bật cho root.
- [ ] IAM user `learner` với `AdministratorAccess` + MFA.
- [ ] Budget $1 alert tới email.
- [ ] Không còn login bằng root cho việc thường ngày.

Xem hướng dẫn step-by-step: [solution.md § Ex1](solution.md#exercise-1).

---

## Exercise 2 — Region & AZ exploration (no-cost)
Trả lời bằng AWS CLI:

```bash
# 1. List tất cả region khả dụng
aws ec2 describe-regions --query 'Regions[].RegionName' --output table

# 2. List AZ trong region ap-southeast-1
aws ec2 describe-availability-zones --region ap-southeast-1 \
  --query 'AvailabilityZones[].[ZoneName,ZoneId,State]' --output table

# 3. Region nào có Local Zone?
aws ec2 describe-availability-zones --all-availability-zones \
  --filters Name=zone-type,Values=local-zone \
  --query 'AvailabilityZones[].[ZoneName,RegionName]' --output table
```

**Câu hỏi:**
1. `ap-southeast-1` có bao nhiêu AZ?
2. `us-east-1` có nhiều AZ hơn không? Tại sao AWS thiết kế vậy?
3. Region nào gần Việt Nam nhất nếu user ở Hà Nội?
4. ZoneId (như `apse1-az1`) khác ZoneName (`ap-southeast-1a`) ở chỗ nào? (Hint: stable mapping giữa các account)

---

## Exercise 3 — Vẽ kiến trúc (no-cost)
Dùng [excalidraw.com](https://excalidraw.com) vẽ:
1. Region `ap-southeast-1` chứa 3 AZ, mỗi AZ có 2 datacenter.
2. Edge Location ở Hà Nội, TP.HCM, Bangkok.
3. User ở Hà Nội request `app.example.com` → đi qua Edge Location HN → CloudFront cache miss → về ALB ở ap-southeast-1 AZ-a → EC2.

Lưu file `.excalidraw` vào `diagrams/`.

---

## Exercise 4 — Pricing Calculator
Mở https://calculator.aws/ và estimate cost 1 tháng cho:
- 1 EC2 `t3.micro` Linux On-Demand chạy 24/7 ở `ap-southeast-1`.
- 1 RDS `db.t3.micro` MySQL Multi-AZ.
- 100GB EBS gp3.
- 50GB S3 Standard.
- 10GB egress ra Internet.

Ghi total vào `solution.md § Ex4`. So sánh với Free Tier — phần nào miễn phí năm đầu?

---

## Exercise 5 — Lab CLI cài đặt
```bash
# Cài AWS CLI
brew install awscli

# Configure với IAM user (KHÔNG dùng root key)
aws configure
# AWS Access Key ID: AKIA...
# AWS Secret Access Key: ****
# Default region: ap-southeast-1
# Default output: json

# Verify
aws sts get-caller-identity
# → trả về ARN của user `learner`, KHÔNG phải root
```

**Tiêu chí pass:** `aws sts get-caller-identity` trả về user `learner`.

---

## Mở rộng (Bonus)
- Cài [aws-vault](https://github.com/99designs/aws-vault) để không lưu access key plaintext trong `~/.aws/credentials`.
- Bật **CloudShell** trong console (free, có sẵn AWS CLI) — không cần cài máy local.

## Teardown
Bài này không tạo resource có phí, không cần teardown. Nhưng **lưu Budget alert** vĩnh viễn.
