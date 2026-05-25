# Lessons

Mỗi bài học có cấu trúc:

1. **Mục tiêu** — sau bài bạn nắm được gì.
2. **Lý thuyết** — tóm tắt, không dài dòng.
3. **Hands-on có account** — bước-by-bước với AWS Free Tier.
4. **Hands-on không tốn tiền** — dùng LocalStack / Console read-only / vẽ diagram.
5. **Câu hỏi tự kiểm tra** — 3–5 câu dạng exam.
6. **Flashcard** — key term cần thuộc lòng.

## Cấu trúc thư mục

```
lessons/
├── clf-c02/        # CLF-C02 (Foundational)
├── saa-c03/        # SAA-C03 (Associate) — sẽ thêm dần
└── foundations/    # Cross-cert: CAP, consistency, replication…
```

Lộ trình học chi tiết theo từng chứng chỉ: xem [../roadmap/](../roadmap/).

## CLF-C02

1. [clf-c02/01-cloud-concepts.md](clf-c02/01-cloud-concepts.md)
2. [clf-c02/02-shared-responsibility.md](clf-c02/02-shared-responsibility.md)
3. [clf-c02/03-iam.md](clf-c02/03-iam.md)
4. [clf-c02/04-ec2.md](clf-c02/04-ec2.md)
5. [clf-c02/05-s3.md](clf-c02/05-s3.md)
6. [clf-c02/06-vpc.md](clf-c02/06-vpc.md)
7. [clf-c02/07-databases.md](clf-c02/07-databases.md)
8. [clf-c02/08-billing.md](clf-c02/08-billing.md)

## SAA-C03

Sẽ tạo dần sau khi học xong CLF. Đọc [foundations/](foundations/README.md) song song.

## Foundations — Distributed Systems

Kiến thức nền tảng (CAP, consistency, replication, sharding…) gắn với AWS — đọc song song khi bước vào SAA. Xem [foundations/](foundations/README.md).

---

## Trước khi bắt đầu

- [ ] Cài [LocalStack](https://docs.localstack.cloud/getting-started/installation/) (khuyên: `pip install localstack awscli-local`).
- [ ] Cài AWS CLI: `brew install awscli`.
- [ ] (Tuỳ chọn) Tạo AWS Free Tier account, bật MFA root, tạo billing alarm $1.
- [ ] Cài [draw.io desktop](https://www.drawio.com/) hoặc dùng [excalidraw.com](https://excalidraw.com) để vẽ kiến trúc.
