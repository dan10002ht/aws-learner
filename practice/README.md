# Practice — Thực hành theo bài học

Folder này chứa bài tập thực hành cho từng lesson. Mỗi lesson có 1 folder riêng (`01-cloud-concepts/`, `02-shared-responsibility/`, …) với cấu trúc:

```
practice/0X-topic/
├── README.md           # Đề bài + tiêu chí pass + gợi ý
├── solution.md         # Lời giải / giải thích (mở sau khi tự làm)
├── localstack/         # Script chạy LocalStack (no-cost)
│   ├── setup.sh
│   ├── exercise-1.sh
│   └── teardown.sh
├── aws-cli/            # Script CLI cho account thật (Free Tier)
│   ├── setup.sh
│   ├── exercise-1.sh
│   └── teardown.sh    # ⚠️ luôn chạy để tránh charge
├── terraform/          # IaC version (cho SAA về sau)
│   └── main.tf
└── diagrams/           # Excalidraw / draw.io
    └── *.excalidraw
```

---

## Cách dùng

### Cấp độ 1 — Theory drill (không cần account)
- Đọc `README.md` của practice tương ứng.
- Tự trả lời câu hỏi / vẽ diagram trước khi xem `solution.md`.

### Cấp độ 2 — LocalStack (no-cost)
1. Cài 1 lần:
   ```bash
   pip install localstack awscli-local
   docker pull localstack/localstack
   ```
2. Mỗi exercise:
   ```bash
   cd practice/0X-topic/localstack
   localstack start -d        # Khởi động (chạy nền)
   ./setup.sh
   ./exercise-1.sh
   ./teardown.sh
   localstack stop
   ```
3. Toàn bộ dùng `awslocal` thay cho `aws` — endpoint tự trỏ về `localhost:4566`.

### Cấp độ 3 — AWS thật (Free Tier)
⚠️ **Trước khi chạy** — luôn:
- Đã bật MFA root.
- Đã set Budget alarm $1.
- Login bằng IAM user, **không phải root**.
- Đặt region cố định: `export AWS_DEFAULT_REGION=ap-southeast-1`.

```bash
cd practice/0X-topic/aws-cli
./setup.sh
./exercise-1.sh
./teardown.sh          # 🚨 ALWAYS run sau khi xong
```

Sau mỗi session, mở **Billing Dashboard** kiểm tra spend = $0.

---

## Quy ước đặt tên resource

Để dễ teardown và tránh đụng resource khác:
- Prefix tất cả: `learn-` (ví dụ `learn-bucket-iam-demo`, `learn-ec2-web`).
- Tag bắt buộc: `Project=aws-learner`, `Owner=<github-user>`, `Auto-Delete=true`.
- Vùng học: chỉ `ap-southeast-1` (Singapore, gần VN) hoặc `us-east-1` (rẻ nhất + đủ service).

### Script teardown khẩn cấp
Nếu lỡ quên xóa resource:
```bash
# Liệt kê mọi resource có tag Project=aws-learner
aws resourcegroupstaggingapi get-resources \
  --tag-filters Key=Project,Values=aws-learner \
  --region ap-southeast-1
```

---

## Roadmap practice

| # | Topic | Status |
|---|-------|--------|
| 01 | Cloud Concepts & Global Infrastructure | ✅ |
| 02 | Shared Responsibility | ✅ |
| 03 | IAM | ✅ |
| 04 | EC2 | ✅ |
| 05 | S3 | ✅ |
| 06 | VPC | ✅ |
| 07 | Databases | ✅ |
| 08 | Billing | ✅ |

---

## Quy tắc an toàn tuyệt đối

1. **KHÔNG commit access key / `.env` / `credentials`** → đã có `.gitignore`.
2. **KHÔNG dùng root account** chạy script.
3. **Teardown ngay sau khi xong**, không để qua đêm.
4. **Đặt Budget Alert $1** và bật email notification.
5. **Tag mọi resource** để dễ tìm và dọn.
6. **KHÔNG share account** trên Discord/Telegram khi hỏi bài.
