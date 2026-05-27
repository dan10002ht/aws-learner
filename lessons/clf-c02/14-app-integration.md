# Bài 14 — Application Integration (SNS, SQS, EventBridge, Step Functions)

> Map exam: **CLF-C02 Task 3.8 — Identify services from other in-scope AWS service categories (Application Integration)**. Đề CLF rất hay hỏi pattern "decouple".

## 1. Mục tiêu
Sau bài này bạn có thể:
- Hiểu pattern **decoupling** và lý do dùng message/event service.
- Phân biệt **SQS / SNS / EventBridge / Step Functions / Amazon MQ**.
- Chọn đúng service theo use case (queue vs pub/sub vs event router vs workflow).
- Hiểu **fan-out pattern SNS → SQS**.

---

## 2. Lý thuyết

### 2.0 Analogy — 4 cách giao tiếp giữa team

| Cách giao tiếp công ty | AWS service | Đặc tính |
|--------------------------|-------------|----------|
| Đặt thư vào hộp thư, ai rảnh thì lấy xử lý | **SQS (queue)** | 1 message → 1 consumer xử lý |
| Phát loa thông báo cho cả phòng | **SNS (pub/sub)** | 1 message → N subscriber nhận |
| Router thông minh dựa theo nội dung event | **EventBridge** | Route event theo rule + filter |
| Quy trình duyệt giấy tờ qua nhiều bước có thứ tự | **Step Functions** | State machine workflow |
| Email truyền thống RabbitMQ/ActiveMQ | **Amazon MQ** | JMS/AMQP cho app cũ |

---

### 2.0.1 Tại sao cần decouple?

**Tightly coupled** (xấu):
```
Web App ── HTTP gọi trực tiếp ──▶ Image Processor
                                     │
                                     ▼ (nếu chết)
                              Web App cũng chết theo
```

Nếu image processor chết / overload → web app cũng chết theo.

**Decoupled với SQS**:
```
Web App ──▶ SQS Queue ──▶ Image Processor
   (ghi message)             (pull khi rảnh)
```

→ Image processor chết, message vẫn còn trong queue, không mất. Web app vẫn ghi message bình thường. Đây là **một trong những exam pattern quan trọng nhất**.

---

### 2.1 Amazon SQS (Simple Queue Service)

**Đặc điểm**:
- **Fully managed queue**, không cần quản broker.
- **Pull model** — consumer chủ động `ReceiveMessage`.
- **Max 256 KB / message** (lớn hơn → dùng S3 + reference link).
- **Retention** 1 phút – 14 ngày (mặc định 4 ngày).
- **At-least-once delivery** (có thể duplicate, phải idempotent).

**2 loại queue**:

| Loại | Throughput | Order | Duplicate | Use case |
|------|------------|-------|-----------|----------|
| **Standard** | Gần unlimited | **Best-effort** order | Có thể duplicate | Đa số use case |
| **FIFO** | 300 msg/s (3000 với batching) | **Strict FIFO** | Exactly-once | Tài chính, log thứ tự nghiêm ngặt |

**Tính năng**:
- **Visibility timeout** — message ẩn khỏi queue khi consumer đang xử lý (default 30s).
- **Dead Letter Queue (DLQ)** — nơi chứa message fail sau N lần retry.
- **Delay queue** — message ẩn trong N giây trước khi available.
- **Long polling** — `WaitTimeSeconds` ≤ 20s, giảm cost API.

**Pricing**: $0.40 / 1M request. Free tier 1M request/tháng.

---

### 2.2 Amazon SNS (Simple Notification Service)

**Đặc điểm**:
- **Pub/Sub** — publisher push message vào **topic**, mọi subscriber nhận.
- **Push model** — SNS chủ động gửi đến subscriber.
- **Subscriber types**: Email, SMS, **HTTP/HTTPS endpoint, Lambda, SQS, Firehose, mobile push (APNS, FCM)**.
- **Fan-out**: 1 SNS topic → nhiều SQS queue (mỗi queue xử lý 1 mục đích khác nhau).

**FIFO topic** — cũng có như SQS FIFO, đảm bảo order.

**Use case**:
- Gửi alert khi CloudWatch alarm bật.
- Gửi notification về order mới cho team logistics + finance + email customer cùng lúc (fan-out).
- Gửi SMS OTP, mobile push.

**Pricing**: $0.50 / 1M request + $0.06 / 100k mobile push + SMS theo quốc gia.

---

### 2.3 SNS → SQS Fan-out pattern (đề hay hỏi)

```
              ┌──▶ SQS A ──▶ Lambda A (resize image)
SNS topic ───┼──▶ SQS B ──▶ Lambda B (extract metadata)
              └──▶ SQS C ──▶ Lambda C (virus scan)
```

1 sự kiện "image uploaded" → SNS publish → 3 SQS nhận đồng thời → 3 processor chạy song song độc lập.

Lợi ích:
- Mỗi consumer **decoupled**.
- Mỗi consumer có DLQ riêng.
- Thêm consumer mới không ảnh hưởng publisher.

---

### 2.4 Amazon EventBridge (formerly CloudWatch Events)

**Đặc điểm**:
- **Event router serverless** — kết event source → target dựa theo **rule** (JSON pattern).
- **Event source**:
  - AWS service (S3, EC2 state, CodePipeline, …).
  - **SaaS partner** (Zendesk, Datadog, MongoDB Atlas, …) qua **Partner Event Bus**.
  - Custom application qua `PutEvents` API.
- **Target**: Lambda, SQS, SNS, Step Functions, Kinesis, ECS task, API Gateway, …
- **Schedule** — chạy cron-like (replace CloudWatch Events scheduling).

**EventBridge vs SNS**:
- **SNS** = pub/sub đơn giản, subscriber phải tự filter.
- **EventBridge** = **content-based routing** với JSON pattern, multi-source, **schema registry**, **archive + replay**.

**EventBridge Pipes** (2022) — connect source → enrichment → target, ETL serverless cho event.

**Use case**:
- "Khi EC2 chuyển state stopped → gửi Slack notification" — rule match event source EC2, target Lambda.
- "Khi GitHub PR merge → trigger CodePipeline" — partner event bus.
- "Mỗi giờ chạy Lambda backup" — schedule rule.

---

### 2.5 AWS Step Functions

**State machine workflow** serverless, viết bằng **ASL (Amazon States Language)** JSON.

**Use case**:
- Quy trình check-out e-commerce: validate cart → check inventory → charge payment → create order → send email. Mỗi bước = 1 state, có retry + catch error.
- ML pipeline: prepare data → train → evaluate → deploy.
- Long-running approval workflow (chờ human approve).

**2 loại workflow**:

| Loại | Use case | Duration | Pricing |
|------|----------|----------|---------|
| **Standard** | Long-running, human approval | Tới 1 năm | Per state transition ($25 / 1M) |
| **Express** | High-volume short workflow | < 5 phút | Per duration + memory |

**Tính năng quan trọng**:
- **Visual editor** trong console — kéo thả state.
- **Built-in retry / catch** error.
- **Parallel state** chạy song song.
- **Map state** lặp qua collection.
- **Wait state** — chờ thời gian hoặc timestamp.
- **Activity** — pause workflow chờ external worker.

**Step Functions vs Lambda chain**:
- Lambda gọi Lambda → mất orchestration view, khó retry, khó debug.
- Step Functions → visual, retry built-in, error handling, audit.

---

### 2.6 Amazon MQ

**Managed message broker** cho **Apache ActiveMQ** và **RabbitMQ**.

**Khi nào dùng**:
- App **legacy** dùng giao thức **JMS, AMQP, MQTT, STOMP, OpenWire** — không muốn rewrite sang SNS/SQS.
- Migrate on-prem RabbitMQ → cloud.

**Khác SNS/SQS**:
- MQ = broker truyền thống, có UI quản, queue + topic.
- SNS/SQS = AWS-native, scale tốt hơn, không quản broker.

**Pricing**: theo instance hour + storage.

---

### 2.7 So sánh nhanh — chọn service nào?

| Tình huống | Service |
|------------|---------|
| 1 producer → 1 consumer (queue) | **SQS** |
| 1 producer → N subscriber (broadcast) | **SNS** |
| 1 producer → N consumer, mỗi consumer có queue riêng (fan-out + durable) | **SNS + SQS** |
| Event nhiều source, filter content, route đa target | **EventBridge** |
| Workflow nhiều bước, retry, parallel, human approval | **Step Functions** |
| App legacy JMS/AMQP/MQTT | **Amazon MQ** |
| Streaming data (telemetry, click stream, log) | **Kinesis** (xem bài 16 Analytics) |

---

### 2.8 Streaming vs Messaging (đề bẫy)

| | Messaging (SQS, SNS) | Streaming (Kinesis, MSK) |
|--|---------------------|-------------------------|
| Đơn vị | Message rời rạc | Record trong stream liên tục |
| Retention | 14 ngày max (SQS) | 1–365 ngày (Kinesis Data Streams) |
| Re-read | Không (consume xong là delete) | Có (đọc lại từ offset) |
| Throughput | Cao | Rất cao (MB/s per shard) |
| Use case | Decouple, task queue | Click stream, IoT, log aggregation |

---

## 3. Hands-on có account

### Lab 1 — SQS căn bản (15 phút)
1. SQS console → Create queue → Standard → name `learner-queue`.
2. Send message → input "hello world".
3. Poll → receive message → delete.
4. Tạo DLQ + cấu hình maxReceiveCount=3.

### Lab 2 — SNS fan-out SNS → 2 SQS (30 phút)
1. SNS → create topic `orders`.
2. SQS → tạo 2 queue `orders-warehouse`, `orders-email`.
3. SNS topic → subscribe 2 SQS.
4. Publish message vào SNS → kiểm tra cả 2 SQS đều nhận.

### Lab 3 — EventBridge schedule (10 phút)
1. EventBridge → Create rule → Schedule cron `0/5 * * * ? *` (mỗi 5 phút).
2. Target = Lambda log "hello".
3. Đợi 10 phút → CloudWatch Logs thấy 2 invocation.

### Lab 4 — Step Functions visual workflow (30 phút)
1. Step Functions → Create state machine → Visual editor.
2. Tạo workflow: Lambda A (validate) → Choice (success/fail) → Lambda B (charge) hoặc Pass (fail).
3. Start execution → xem graph màu xanh từng state.

---

## 4. Hands-on không tốn tiền

### Option A — LocalStack
- `awslocal sqs create-queue …`
- `awslocal sns publish …`
- `awslocal events put-rule …`
- `awslocal stepfunctions create-state-machine …`

### Option B — AWS Skill Builder
- "Amazon SQS Getting Started".
- "Decoupling Workloads with Amazon SNS and SQS".

---

## 5. Tự kiểm tra (có đáp án)

1. Đề: *"1 photo upload → 3 system xử lý song song độc lập (resize, virus scan, metadata extract). Pattern nào?"*
   <details><summary>Trả lời</summary>**SNS fan-out → 3 SQS → 3 Lambda**.</details>

2. SQS Standard vs FIFO khác chính ở điểm gì?
   <details><summary>Trả lời</summary>**Standard** = throughput cao, best-effort order, có thể duplicate. **FIFO** = strict order, exactly-once, throughput thấp hơn (300 msg/s không batching).</details>

3. Đề: *"Cần workflow check-out 5 bước với retry tự động, audit log đầy đủ."*
   <details><summary>Trả lời</summary>**AWS Step Functions**.</details>

4. Đề: *"Route event từ Datadog SaaS vào Lambda."*
   <details><summary>Trả lời</summary>**EventBridge Partner Event Bus** (Datadog là partner) → rule → Lambda.</details>

5. Đề: *"Legacy Java app dùng JMS, migrate lên cloud không muốn rewrite."*
   <details><summary>Trả lời</summary>**Amazon MQ** (ActiveMQ engine hỗ trợ JMS).</details>

6. SQS retention max?
   <details><summary>Trả lời</summary>**14 ngày**, default 4 ngày.</details>

7. Đề: *"Gửi SMS OTP cho 1M user."*
   <details><summary>Trả lời</summary>**SNS** với SMS subscriber (hoặc **Pinpoint** cho campaign phức tạp).</details>

8. Visibility timeout SQS dùng để làm gì?
   <details><summary>Trả lời</summary>Ẩn message khỏi queue trong N giây khi consumer đang xử lý, tránh consumer khác cũng nhận. Nếu consumer xử lý xong → delete message. Nếu chưa kịp → message tái xuất hiện cho retry.</details>

9. Đề: *"1 sự kiện CodeBuild fail → notify Slack + tạo ticket Jira + log."*
   <details><summary>Trả lời</summary>**EventBridge** rule match build-failed → 3 target (Lambda Slack, Lambda Jira, CloudWatch Logs).</details>

10. Step Functions Standard vs Express?
    <details><summary>Trả lời</summary>**Standard** = long-running tới 1 năm, per state transition pricing, có human-approval. **Express** = high-volume < 5 phút, pricing theo duration + memory.</details>

---

## 6. Đối chiếu GCP & Azure

| Service | AWS | GCP | Azure |
|---------|-----|-----|-------|
| Queue | SQS | Pub/Sub (queue mode) | Service Bus / Storage Queue |
| Pub/Sub | SNS | Pub/Sub | Service Bus topics |
| Event router | EventBridge | Eventarc | Event Grid |
| Workflow | Step Functions | Workflows | Logic Apps / Durable Functions |
| Legacy broker | Amazon MQ | (không có equivalent native) | Service Bus (AMQP) |
| Streaming | Kinesis | Pub/Sub (stream) / Dataflow | Event Hubs |

---

## 7. Lưu ý khi thi CLF-C02

- **SQS = queue**, **SNS = pub/sub**, **EventBridge = event router**, **Step Functions = workflow**, **MQ = legacy broker**.
- **SNS + SQS fan-out** = pattern hay ra đề.
- **SQS retention 14 ngày max**.
- **Step Functions Standard tới 1 năm**, Express < 5 phút.
- **EventBridge** thay thế **CloudWatch Events** (cùng service, renamed).
- **EventBridge Schedule** = cron job serverless.
- **Decouple** = từ khoá → loại SQS/SNS/EventBridge.
- **Order strict** = từ khoá → **SQS FIFO**.

## 8. Lưu ý khi thi SAA-C03 (sâu hơn)

- **SQS long polling** giảm cost vs short polling.
- **DLQ** strategy cho cả SQS + SNS + Lambda.
- **Message filtering** SNS theo attribute.
- **EventBridge archive + replay** cho disaster recovery event.
- **Step Functions Express** với API Gateway cho serverless API workflow.

## 9. Lưu ý khi đi làm

- **Đừng chain Lambda → Lambda → Lambda** — dùng Step Functions, retry built-in.
- **Mọi SQS production phải có DLQ**.
- **SNS FIFO + SQS FIFO** nếu cần strict order — đắt + thấp throughput.
- **EventBridge cho cross-service event** thay vì viết Lambda polling.
- **EventBridge schedule** thay cron EC2 — không quản server.
- **Idempotent consumer** — message có thể duplicate, code phải xử lý được.

---

## 10. Flashcard

- **SQS** — queue, pull, 1 message → 1 consumer, 14 ngày retention.
- **SQS Standard** vs **FIFO** (300 msg/s, strict order, exactly-once).
- **SNS** — pub/sub, push, fan-out tới Email/SMS/HTTP/Lambda/SQS/mobile push.
- **SNS → SQS fan-out** = pattern decouple đa consumer.
- **EventBridge** — event router, content-based routing JSON pattern, SaaS partner support, schedule.
- **Step Functions** — workflow state machine, ASL JSON, visual editor, retry built-in.
- **Step Functions Standard** (1 năm) vs **Express** (< 5 phút).
- **Amazon MQ** — managed ActiveMQ / RabbitMQ cho legacy.
- **DLQ** — Dead Letter Queue, chứa message fail sau N retry.
- **Visibility timeout** SQS — ẩn message khi consumer đang xử lý.
- **Streaming** (Kinesis) ≠ **Messaging** (SQS/SNS).
