# Developing AWS Lambda

Lambda là service compute serverless trung tâm của domain "Development with AWS Services". Trong đề DVA-C02, Lambda xuất hiện dày đặc: từ cấu hình memory/timeout, concurrency, cho tới cold start, VPC, error handling. Bài này tập trung vào góc nhìn của developer: bạn viết handler, đóng gói, cấu hình runtime và xử lý lỗi như thế nào trong thực tế — và những cái bẫy mà đề thi hay gài.

## 1. Mô hình thực thi & Handler

Một Lambda function gồm 3 phần bạn phải khai báo:

- **Runtime**: môi trường chạy (`nodejs20.x`, `python3.12`, `java21`, `go` qua `provided.al2023`, ...).
- **Handler**: điểm vào, theo format `file.method` (Node/Python) hoặc `package.Class::method` (Java).
- **Deployment package**: file `.zip` hoặc **container image** (tối đa 10 GB).

Ví dụ handler Node.js:

```javascript
// index.mjs  -> handler là "index.handler"
let dbConn; // KHỞI TẠO NGOÀI handler để tái dùng giữa các invocation

export const handler = async (event, context) => {
  if (!dbConn) {
    dbConn = await createConnection(); // chỉ chạy ở cold start
  }
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
```

`event` là payload đầu vào (đã parse JSON), `context` chứa metadata: `context.getRemainingTimeInMillis()`, `context.awsRequestId`, `context.functionName`.

> 💡 Mẹo thi: Code **ngoài** handler chạy một lần khi khởi tạo execution context và được tái dùng. Code **trong** handler chạy mỗi invocation. Đặt khởi tạo DB connection, SDK client, tải config ra ngoài handler để giảm latency.

## 2. Cấu hình cơ bản: Memory, Timeout, CPU

| Tham số | Giá trị | Ghi chú |
|---------|---------|---------|
| Memory | 128 MB – 10240 MB (bước 1 MB) | **CPU cấp tỉ lệ thuận với memory** |
| Timeout | tối đa 900 giây (15 phút) | mặc định 3s |
| `/tmp` | 512 MB – 10240 MB | ephemeral storage, cấu hình riêng |
| Payload | 6 MB (sync), 256 KB (async) | giới hạn cứng |

Điểm cực kỳ hay thi: **bạn không cấu hình CPU trực tiếp**. Tăng memory = tăng CPU (và network). Một function CPU-bound có thể chạy *nhanh hơn và rẻ hơn* khi tăng memory, vì thời gian chạy giảm nhiều hơn mức tăng giá/ms.

```bash
aws lambda update-function-configuration \
  --function-name my-func \
  --memory-size 1024 \
  --timeout 30 \
  --ephemeral-storage Size=2048
```

> 💡 Mẹo thi: Dùng **AWS Lambda Power Tuning** (state machine Step Functions) để tìm điểm memory tối ưu cost/performance. Câu hỏi kiểu "function chạy chậm, làm gì rẻ nhất?" thường có đáp án là tăng memory, không phải viết lại code.

## 3. Execution Context & /tmp

Sau một invocation, Lambda "đóng băng" (freeze) execution context và có thể tái dùng cho invocation sau (warm start). Hệ quả thực chiến:

- Biến global, SDK client, connection pool **vẫn còn** giữa các lần gọi → tái dùng được.
- Nội dung `/tmp` **vẫn còn** → có thể cache file (model ML, dữ liệu tải về) giữa các invocation cùng context.
- **Không** dựa vào việc context luôn được tái dùng — có thể bị tạo mới bất cứ lúc nào. Đừng lưu trạng thái business quan trọng ở đây.
- Background thread/process bị freeze khi invocation kết thúc, "rã đông" ở lần sau (đừng dựa vào nó chạy nền).

> ⚠️ Bẫy: `/tmp` là **ephemeral và cục bộ theo từng execution environment**, KHÔNG chia sẻ giữa các concurrent instance. Cần state chia sẻ → dùng S3, EFS, DynamoDB, ElastiCache. Cần dung lượng > 512MB → tăng `ephemeral-storage`, KHÔNG phải tăng memory.

## 4. Environment Variables & Encryption

Env vars là cách cấu hình runtime không cần sửa code:

```bash
aws lambda update-function-configuration \
  --function-name my-func \
  --environment "Variables={STAGE=prod,TABLE=orders}"
```

Cơ chế mã hóa env var (rất hay thi):

- Lambda **luôn** mã hóa env vars at rest bằng KMS (mặc định dùng AWS managed key `aws/lambda`).
- Có thể chỉ định **customer managed KMS key** (CMK) để kiểm soát quyền và rotation.
- Với secret nhạy cảm, bật **encryption helpers** trong console: giá trị được mã hóa và bạn phải **decrypt bằng KMS trong code** lúc runtime → không hiển thị plaintext trong console.

> ⚠️ Bẫy: Đề hay hỏi "lưu DB password an toàn cho Lambda thế nào?". Env var thường KHÔNG phải đáp án tốt nhất — ưu tiên **Secrets Manager** (có rotation tự động) hoặc **SSM Parameter Store SecureString**. Env var phù hợp config không nhạy cảm. Nếu bắt buộc dùng env var cho secret → bật encryption helper + CMK.

So sánh nhanh nơi lưu cấu hình:

| Nhu cầu | Giải pháp |
|---------|-----------|
| Config tĩnh, không nhạy cảm | Environment variables |
| Secret + auto-rotation | Secrets Manager |
| Param/secret, rẻ, phân cấp | SSM Parameter Store |
| Reference từ nhiều function | Parameter Store / AppConfig |

## 5. Layers & Extensions

**Layers**: gói thư viện/dependency/runtime dùng chung, tách khỏi code function.

- Tối đa **5 layers** mỗi function.
- Tổng dung lượng unzip (code + tất cả layers) ≤ **250 MB**.
- Được giải nén vào `/opt`. Thư viện đặt theo path runtime kỳ vọng (vd Python: `/opt/python`).
- Giúp giảm kích thước package, chia sẻ code, deploy nhanh hơn.

```bash
aws lambda publish-layer-version \
  --layer-name shared-deps \
  --zip-file fileb://layer.zip \
  --compatible-runtimes python3.12
```

**Extensions**: tích hợp tool (monitoring, observability, secrets, governance) vào lifecycle của Lambda.

- **Internal extension**: chạy trong cùng process runtime.
- **External extension**: chạy như process riêng song song với function, có lifecycle riêng (init → invoke → shutdown).

> 💡 Mẹo thi: Câu hỏi kiểu "chạy agent monitoring/secrets caching song song với function code mà không sửa handler" → đáp án là **Lambda Extension** (external). Container image dùng khi package > 250 MB hoặc cần custom OS dependency.

## 6. Concurrency: Reserved vs Provisioned

Đây là phần bị nhầm lẫn nhiều nhất. Phân biệt rõ:

| Khái niệm | Là gì | Mục đích | Giải quyết cold start? |
|-----------|-------|----------|------------------------|
| **Unreserved** (mặc định) | Pool chung của account (mặc định 1000/region) | Mặc định cho mọi function | Không |
| **Reserved concurrency** | Giới hạn *trần* số instance đồng thời 1 function được dùng | Bảo vệ downstream / giới hạn / cô lập | Không |
| **Provisioned concurrency** | Số instance được **khởi tạo trước, giữ ấm** | Loại bỏ cold start | **Có** |

Điểm mấu chốt:

- **Reserved** vừa là *trần* (function không vượt được) vừa *đảm bảo* (account giữ riêng chừng đó cho nó). Đặt reserved = 0 → **vô hiệu hóa function** (kill switch).
- **Provisioned** giữ sẵn các execution environment đã init → request không phải chịu cold start. Kết hợp **Application Auto Scaling** theo lịch/utilization.
- Reserved **miễn phí**; Provisioned **tốn tiền** (trả cho thời gian giữ ấm).

```bash
# Reserved: giới hạn trần
aws lambda put-function-concurrency \
  --function-name my-func --reserved-concurrent-executions 50

# Provisioned: giữ ấm 10 instance trên 1 alias/version
aws lambda put-provisioned-concurrency-config \
  --function-name my-func --qualifier PROD \
  --provisioned-concurrent-executions 10
```

> ⚠️ Bẫy: Khi vượt concurrency limit → lỗi **throttling (HTTP 429 / `TooManyRequestsException`)**. Với invoke async/event source, Lambda tự retry; với sync, caller nhận lỗi.
> ⚠️ Bẫy: Provisioned concurrency phải gắn với **alias hoặc version cụ thể** (qualifier), KHÔNG dùng được với `$LATEST`.

## 7. Cold Start & Tuning

Cold start = thời gian khởi tạo execution environment mới: tải code, khởi tạo runtime, chạy code init ngoài handler.

Yếu tố làm cold start tệ hơn:

- Package/dependency lớn → dùng layers, tree-shaking, ưu tiên SDK v3 modular (Node).
- Runtime nặng (Java, .NET) cold start lâu hơn Node/Python/Go.
- Code init ngoài handler nặng (tạo nhiều client, tải file lớn).
- **Đặt function trong VPC** (xem mục 8 — trước đây là thủ phạm chính, nay đã cải thiện nhiều).

Cách giảm cold start:

- **Provisioned concurrency** cho workload latency-sensitive, traffic dự đoán được.
- Giảm kích thước package; chỉ import thứ cần dùng.
- Tăng memory (CPU init nhanh hơn).
- Với Java: bật **SnapStart** (snapshot execution environment đã init) → giảm cold start mạnh, miễn phí.

> 💡 Mẹo thi: "Giảm cold start, traffic ổn định, sẵn sàng trả tiền" → **Provisioned concurrency**. "Java cold start, không muốn tốn thêm tiền" → **SnapStart**. "Function lâu lâu mới gọi, không quan tâm latency" → để mặc định.

## 8. Lambda trong VPC

Mặc định Lambda chạy trong VPC do AWS quản lý, có internet access. Để truy cập **private resource** (RDS, ElastiCache, internal ALB), bạn cấu hình VPC config: subnet + security group.

```bash
aws lambda update-function-configuration \
  --function-name my-func \
  --vpc-config SubnetIds=subnet-aaa,subnet-bbb,SecurityGroupIds=sg-123
```

Cơ chế & bẫy quan trọng:

- Lambda tạo **Hyperplane ENI** trong subnet bạn chỉ định để vào VPC. ENI này **dùng chung** giữa các function/instance (kiến trúc Hyperplane) → không còn tốn nhiều thời gian tạo ENI mỗi cold start như trước.
- **Đặt Lambda trong VPC sẽ MẤT internet access mặc định.** Cần ra internet (gọi API public, S3 qua public endpoint...) → phải có **NAT Gateway** ở public subnet, hoặc dùng **VPC Endpoint** (Gateway endpoint cho S3/DynamoDB, Interface endpoint cho service khác).
- Phải dùng **private subnet** + route qua NAT. KHÔNG gán public IP cho Lambda ENI được.
- IAM cần quyền tạo/xóa ENI (`ec2:CreateNetworkInterface`, ...) — managed policy `AWSLambdaVPCAccessExecutionRole`.

> ⚠️ Bẫy kinh điển: "Lambda trong VPC gọi DynamoDB/S3 bị timeout" → không có route ra internet. Sửa: thêm **VPC Gateway Endpoint** cho S3/DynamoDB (miễn phí), hoặc NAT Gateway. Đề rất hay hỏi câu này.
> ⚠️ Bẫy: "Connection pool tới RDS cạn (too many connections)" khi concurrency cao → mỗi instance mở connection riêng. Giải pháp: **RDS Proxy** (pool connection), không phải tăng memory.

## 9. Triggers (Event Sources)

Hai cách Lambda được gọi:

**Push (synchronous/asynchronous)** — service gọi trực tiếp Lambda:

| Trigger | Kiểu invoke | Ghi chú |
|---------|-------------|---------|
| API Gateway / ALB | Sync | caller chờ response |
| S3 events | Async | retry tự động |
| SNS | Async | retry tự động |
| EventBridge | Async | scheduled / pattern |
| Cognito, Lex | Sync | |

**Poll (Event Source Mapping)** — Lambda service tự *poll* nguồn rồi gọi function:

| Nguồn | Đặc điểm |
|-------|----------|
| SQS | Lambda poll queue, xóa message khi xử lý xong |
| Kinesis Data Streams | poll theo shard, giữ thứ tự trong shard |
| DynamoDB Streams | tương tự Kinesis |
| Kafka / MSK | poll partition |

```bash
aws lambda create-event-source-mapping \
  --function-name my-func \
  --event-source-arn arn:aws:sqs:...:my-queue \
  --batch-size 10
```

> 💡 Mẹo thi: Phân biệt **sync / async / poll** quyết định cách xử lý lỗi & retry. Sync → caller tự xử lý lỗi. Async → có retry + DLQ/Destinations. Poll (stream) → batch, retry cả batch, có thể chặn shard nếu xử lý lỗi (poison pill).

## 10. Error Handling: DLQ vs Destinations

Với **async invocation**, Lambda tự retry **2 lần** (tổng 3 lần) nếu function lỗi. Sau đó event bị bỏ — trừ khi bạn cấu hình điểm đến cho event thất bại.

**Dead Letter Queue (DLQ)** — cách cũ:

- Cấu hình SQS queue hoặc SNS topic nhận event **thất bại** (sau khi hết retry).
- Chỉ bắt được **failure**, không có context kết quả thành công.

```bash
aws lambda update-function-configuration \
  --function-name my-func \
  --dead-letter-config TargetArn=arn:aws:sqs:...:my-dlq
```

**Lambda Destinations** — cách mới, mạnh hơn:

- Định tuyến theo **cả thành công (onSuccess) và thất bại (onFailure)**.
- Target đa dạng: **SQS, SNS, EventBridge, Lambda khác**.
- Kèm thêm context (request/response payload, lý do lỗi) → dễ debug.

| Tiêu chí | DLQ | Destinations |
|----------|-----|--------------|
| Bắt failure | Có | Có (onFailure) |
| Bắt success | Không | Có (onSuccess) |
| Target | SQS, SNS | SQS, SNS, EventBridge, Lambda |
| Context payload | Ít | Đầy đủ |
| Khuyến nghị | Legacy | **Ưu tiên dùng** |

```bash
aws lambda put-function-event-invoke-config \
  --function-name my-func \
  --maximum-retry-attempts 1 \
  --destination-config '{
    "OnSuccess":{"Destination":"arn:aws:sqs:...:ok-queue"},
    "OnFailure":{"Destination":"arn:aws:sns:...:fail-topic"}
  }'
```

> 💡 Mẹo thi: AWS khuyến nghị **Destinations** thay cho DLQ cho async. Nhưng với **event source mapping kiểu SQS/Kinesis/DynamoDB**, bạn dùng **DLQ trên chính source** (redrive policy của SQS, hoặc `OnFailure` destination của ESM cho stream) — không phải Destinations của function.
> ⚠️ Bẫy: DLQ/Destinations chỉ áp dụng cho **async**. Lỗi ở **sync invoke** trả thẳng về caller, không vào DLQ.

## 11. Versions & Aliases

- **Version**: snapshot bất biến của code + config. `$LATEST` là bản đang sửa được; publish tạo version đánh số (1, 2, ...) bất biến.
- **Alias**: con trỏ tới một version (vd `PROD → v3`). Client gọi alias, bạn đổi version mà không sửa client.
- Alias hỗ trợ **weighted routing** → canary/blue-green deployment.

```bash
aws lambda publish-version --function-name my-func
aws lambda create-alias --function-name my-func \
  --name PROD --function-version 3

# Canary: 10% traffic sang version 4
aws lambda update-alias --function-name my-func --name PROD \
  --function-version 3 \
  --routing-config AdditionalVersionWeights={"4"=0.1}
```

> 💡 Mẹo thi: Provisioned concurrency và env var có thể khác nhau giữa các version. Trigger/permission gắn theo **qualifier** (alias/version). Canary deployment dùng **alias weighted routing** (hoặc CodeDeploy quản lý cho gọn).

## Tổng kết các bẫy hay gặp

- Tăng CPU = **tăng memory**, không cấu hình CPU riêng.
- `/tmp` ephemeral, cục bộ, **không** chia sẻ giữa instance; cần > 512MB thì tăng `ephemeral-storage` chứ không phải memory.
- **Reserved** = trần + cô lập (free); **Provisioned** = giữ ấm, chống cold start (tốn tiền, cần qualifier).
- Lambda trong VPC **mất internet** → cần NAT/VPC Endpoint; lỗi gọi S3/DynamoDB thường do thiếu Gateway Endpoint.
- Secret → **Secrets Manager/SSM**, không phải env var trần.
- DLQ/Destinations chỉ cho **async**; sync lỗi trả về caller.
- Provisioned concurrency & alias không dùng với `$LATEST`.
- Cold start Java → **SnapStart** (free) trước khi nghĩ tới provisioned.
