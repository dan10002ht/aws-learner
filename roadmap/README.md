# Roadmap AWS: CLF-C02 → SAA-C03

Tài liệu này là lộ trình học AWS từ con số 0 đến chứng chỉ **AWS Certified Cloud Practitioner (CLF-C02)** và mở rộng lên **AWS Certified Solutions Architect – Associate (SAA-C03)**.

Lộ trình được thiết kế cho trường hợp **có thể có hoặc không có tài khoản AWS / không có tiền charge**. Với mỗi dịch vụ sẽ có 2 lựa chọn:
- **Hands-on thật** (nếu bạn có Free Tier / tài khoản).
- **Hands-on thay thế** (LocalStack, simulator, AWS Console sandbox, AWS Skill Builder free labs, hoặc chỉ đọc docs + vẽ architecture).

---

## Tổng quan 2 giai đoạn

| Giai đoạn | Chứng chỉ | Thời gian gợi ý | Mục tiêu |
|-----------|-----------|-----------------|----------|
| 1 | CLF-C02 | 4–6 tuần (1–2h/ngày) | Hiểu cloud, mô hình dịch vụ, pricing, security cơ bản, các dịch vụ cốt lõi. |
| 2 | SAA-C03 | 8–12 tuần sau CLF | Thiết kế kiến trúc: HA, scalability, security, cost-optimized, resilient. |

---

## Giai đoạn 1 — CLF-C02 (Cloud Practitioner)

Xem chi tiết: [clf-c02.md](clf-c02.md)

4 domain chính của CLF-C02:
1. **Cloud Concepts** (24%)
2. **Security & Compliance** (30%)
3. **Cloud Technology & Services** (34%)
4. **Billing, Pricing & Support** (12%)

## Giai đoạn 2 — SAA-C03 (Solutions Architect Associate)

Xem chi tiết: [saa-c03.md](saa-c03.md)

4 domain chính của SAA-C03:
1. **Design Secure Architectures** (30%)
2. **Design Resilient Architectures** (26%)
3. **Design High-Performing Architectures** (24%)
4. **Design Cost-Optimized Architectures** (20%)

---

## Dành cho người đang dùng GCP

Nếu bạn đang làm việc trên GCP hằng ngày, đọc **[aws-vs-gcp.md](aws-vs-gcp.md)** trước — bảng đối chiếu service + các "bẫy" khi mindset GCP ôm sang AWS (VPC regional, IAM Role khác nghĩa, cross-AZ có phí, không có Global LB 1-click, v.v.).

## Cách dùng repo này

- `roadmap/` — lộ trình tổng thể, checklist, tài nguyên.
- `roadmap/aws-vs-gcp.md` — bảng map service AWS ↔ GCP (cho người đang làm GCP).
- `lessons/` — bài học chi tiết từng chủ đề, có lab hướng dẫn và lab thay thế (no-cost).
- `practice/` — bài tập thực hành theo lesson (LocalStack + AWS CLI + Terraform + diagrams).

Đọc theo thứ tự trong [clf-c02.md](clf-c02.md) trước, làm lab tương ứng trong `lessons/`, rồi mới sang SAA.

## Học không tốn tiền — nguyên tắc chung

1. **AWS Free Tier** — 12 tháng miễn phí cho nhiều dịch vụ (EC2 t2/t3.micro 750h/tháng, S3 5GB, RDS 750h, Lambda 1M requests…). Luôn **tắt/xoá resource** sau lab.
2. **Billing Alarm** — set cảnh báo $1, $5 ngay khi tạo account để không bị charge bất ngờ.
3. **LocalStack** (https://localstack.cloud) — emulator AWS chạy Docker local, miễn phí cho hầu hết các service cơ bản (S3, SQS, Lambda, DynamoDB, IAM…).
4. **AWS Skill Builder** (https://skillbuilder.aws) — có nhiều khoá **free**, một số lab cần subscription.
5. **AWS Workshops** (https://workshops.aws) — hướng dẫn chi tiết, nhưng thường cần account.
6. **Console mode "read-only"** — bạn có thể tạo account, đăng nhập, click xem các dịch vụ mà không tạo resource → không tốn tiền.
7. **Architecture diagram** — dùng draw.io / Excalidraw để vẽ lại kiến trúc sau mỗi bài học, đây là kỹ năng cốt lõi cho SAA.
