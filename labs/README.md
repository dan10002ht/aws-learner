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

| # | Lab | Domain SAA | Service | Lesson liên quan |
|---|---|---|---|---|
| 01 | [S3 Basics](./lab01-s3-basics/) | Resilient + Secure | S3, versioning, lifecycle, encryption | [05-s3](../lessons/clf-c02/05-s3.md) |
| 02 | [S3 → Lambda Event](./lab02-s3-lambda/) | Resilient + High-Performing | S3 event, Lambda, IAM role | [13-decoupling](../lessons/saa-c03/13-decoupling.md) |
| 03 | [SQS Decoupling](./lab03-sqs-decoupling/) | Resilient | SQS Standard/FIFO, DLQ, visibility timeout, long polling | [13-decoupling](../lessons/saa-c03/13-decoupling.md) |
| 04 | [DynamoDB + Streams](./lab04-dynamodb-streams/) | High-Performing | DynamoDB, GSI, Streams → Lambda, On-demand | [15-db-design](../lessons/saa-c03/15-db-design.md) |
| 05 | [API Gateway + Lambda](./lab05-apigw-lambda/) | Secure + High-Performing | REST API, Lambda proxy, throttling, usage plan, API key | [13-decoupling](../lessons/saa-c03/13-decoupling.md) |
| 06 | [SNS Fan-out](./lab06-sns-fanout/) | Resilient | SNS → multi-SQS fan-out, filter policy, message attributes | [13-decoupling](../lessons/saa-c03/13-decoupling.md) |
| 07 | [KMS Encryption](./lab07-kms-encryption/) | Secure | Customer-managed CMK, envelope encryption, SSE-KMS, rotation | [11-kms](../lessons/saa-c03/11-kms.md) |
| 08 | [IAM Policies Deep](./lab08-iam-policies/) | Secure | Permission boundary, assume-role + MFA, condition keys, bucket policy | [10-iam-advanced](../lessons/saa-c03/10-iam-advanced.md) |
| 09 | [S3 Advanced](./lab09-s3-advanced/) | Resilient + Secure | Versioning + lifecycle + CRR + presigned + multipart + Object Lock | [14-storage-design](../lessons/saa-c03/14-storage-design.md) |
| 10 | [Step Functions](./lab10-step-functions/) | Resilient | Standard workflow, Choice/Parallel, Retry/Catch, error handling | [13-decoupling](../lessons/saa-c03/13-decoupling.md) |

> **Lưu ý:** LocalStack Community **không** mô phỏng đầy đủ EC2/ASG/ELB/RDS/Route53 production networking. Những phần đó học qua **architecture diagram + scenario question** trong [practice/saa-c03/](../practice/saa-c03/), không lab trực tiếp được.
>
> Mỗi lab có script `lab.sh`/`deploy.sh` (chạy 1 phát end-to-end) + `verify.sh` (kiểm tra hậu chạy). Một số dùng Lambda → có file `index.mjs`/`*.mjs` đi kèm.

## 4. SAA-C03 exam tóm tắt

- **65 câu, 130 phút, pass ≥ 720/1000**
- 4 domain:
  - Design Secure Architectures (**30%**)
  - Design Resilient Architectures (**26%**)
  - Design High-Performing Architectures (**24%**)
  - Design Cost-Optimized Architectures (**20%**)
- Câu hỏi dạng scenario: "Một công ty có X yêu cầu, kiến trúc nào MOST cost-effective / MOST highly available / LEAST operational overhead?"
