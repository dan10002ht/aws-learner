# AWS SAA-C03 Practice Lab (LocalStack)

Môi trường lab AWS local để ôn thi **AWS Certified Solutions Architect - Associate (SAA-C03)**.

## 1. Setup môi trường (chỉ làm 1 lần)

### 1.1. Cài AWS CLI v2

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
unzip /tmp/awscliv2.zip -d /tmp
sudo /tmp/aws/install
aws --version   # phải >= aws-cli/2.x
```

### 1.2. Cài `awslocal` wrapper (gọi LocalStack tiện hơn)

```bash
sudo apt update && sudo apt install -y pipx
pipx ensurepath
pipx install awscli-local
# mở terminal mới hoặc: source ~/.bashrc
awslocal --version
```

> `awslocal s3 ls` ≡ `aws --endpoint-url=http://localhost:4566 s3 ls`. Hai cách đều dùng được.

### 1.3. Config AWS CLI cho LocalStack (credentials giả)

```bash
aws configure --profile localstack
# AWS Access Key ID:     test
# AWS Secret Access Key: test
# Default region:        ap-southeast-1
# Default output:        json
```

## 2. Khởi động LocalStack

```bash
cd ~/projects/aws-practice
docker compose up -d
docker compose logs -f localstack   # xem log (Ctrl+C để thoát, container vẫn chạy)

# Kiểm tra healthy
curl -s http://localhost:4566/_localstack/health | python3 -m json.tool
```

Tắt khi không lab:
```bash
docker compose down          # giữ data trong .localstack-data/
docker compose down -v       # xoá sạch (làm lại từ đầu)
```

## 📖 [CLI + jq Cheat Sheet](./CLI_CHEATSHEET.md) — đọc trước khi lab

## 3. Lộ trình lab (SAA-C03)

| # | Lab | Domain SAA | Service |
|---|---|---|---|
| 01 | [S3 Basics](./lab01-s3-basics/) | Resilient + Secure | S3, versioning, lifecycle, encryption |
| 02 | [S3 → Lambda Event](./lab02-s3-lambda/) | Resilient + High-Performing | S3 event, Lambda, IAM role |
| 03 | SQS Decoupling *(coming)* | Resilient | SQS, dead-letter queue |
| 04 | DynamoDB + Lambda *(coming)* | High-Performing | DynamoDB streams, GSI |
| 05 | API Gateway + Lambda *(coming)* | Secure + High-Performing | REST API, throttling |

> **Lưu ý:** LocalStack không mô phỏng tốt VPC/EC2/ELB/RDS networking. Những phần đó mình sẽ học qua **architecture diagram + scenario question** ở module riêng, không lab được trên LocalStack Community.

## 4. SAA-C03 exam tóm tắt

- **65 câu, 130 phút, pass ≥ 720/1000**
- 4 domain:
  - Design Secure Architectures (**30%**)
  - Design Resilient Architectures (**26%**)
  - Design High-Performing Architectures (**24%**)
  - Design Cost-Optimized Architectures (**20%**)
- Câu hỏi dạng scenario: "Một công ty có X yêu cầu, kiến trúc nào MOST cost-effective / MOST highly available / LEAST operational overhead?"
