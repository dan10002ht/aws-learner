# Bài 15 — Application Integration (SNS, SQS, EventBridge, Step Functions)

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

Nếu image processor chết / overload → web app cũng chết theo. So sánh hai kiểu kết nối:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Tightly coupled so với decoupled bằng SQS</title>
  <desc>Bên trái tightly coupled: Web App gọi trực tiếp Image Processor, khi processor chết thì Web App cũng chết theo. Bên phải decoupled: Web App ghi message vào SQS Queue, Image Processor pull khi rảnh; processor chết thì message vẫn nằm trong queue và Web App vẫn ghi bình thường.</desc>
  <defs>
    <marker id="diArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <text x="180" y="26" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">Tightly coupled (xấu)</text>
  <text x="540" y="26" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">Decoupled với SQS (tốt)</text>
  <line x1="360" y1="40" x2="360" y2="300" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="5 4"/>
  <rect x="30" y="56" width="120" height="46" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="90" y="84" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Web App</text>
  <rect x="210" y="56" width="120" height="46" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="270" y="78" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Image</text>
  <text x="270" y="93" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Processor</text>
  <line x1="150" y1="79" x2="206" y2="79" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#diArr)"/>
  <text x="178" y="71" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">HTTP trực tiếp</text>
  <text x="270" y="150" font-size="20" text-anchor="middle" fill="#ef4444" font-weight="700">✕</text>
  <text x="270" y="138" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">processor chết</text>
  <line x1="270" y1="158" x2="160" y2="158" stroke="#ef4444" stroke-opacity="0.6" stroke-dasharray="4 3" marker-end="url(#diArr)"/>
  <rect x="30" y="170" width="120" height="42" rx="9" fill="#ef4444" fill-opacity="0.12" stroke="#ef4444" stroke-opacity="0.4"/>
  <text x="90" y="190" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Web App</text>
  <text x="90" y="205" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.8">chết theo</text>
  <rect x="392" y="56" width="100" height="46" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="442" y="78" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Web App</text>
  <text x="442" y="93" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">(ghi message)</text>
  <rect x="528" y="50" width="84" height="58" rx="9" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="570" y="74" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">SQS</text>
  <text x="570" y="90" font-size="11" text-anchor="middle" fill="currentColor">Queue</text>
  <g stroke="currentColor" stroke-opacity="0.3" fill="none"><line x1="540" y1="100" x2="600" y2="100"/></g>
  <rect x="648" y="56" width="60" height="46" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="678" y="76" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Image</text>
  <text x="678" y="91" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Proc.</text>
  <line x1="492" y1="79" x2="524" y2="79" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#diArr)"/>
  <line x1="644" y1="86" x2="616" y2="86" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#diArr)"/>
  <text x="678" y="118" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">pull khi rảnh</text>
  <text x="678" y="160" font-size="18" text-anchor="middle" fill="#ef4444" font-weight="700">✕</text>
  <text x="678" y="174" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">processor chết</text>
  <rect x="504" y="196" width="132" height="58" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="570" y="218" font-size="10.5" text-anchor="middle" fill="currentColor">Message vẫn còn</text>
  <text x="570" y="234" font-size="10.5" text-anchor="middle" fill="currentColor">trong queue</text>
  <text x="570" y="249" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">không mất</text>
  <rect x="392" y="200" width="100" height="50" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="442" y="222" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Web App</text>
  <text x="442" y="237" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.8">vẫn ghi bình thường</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>SNS → SQS fan-out với DLQ riêng cho mỗi queue</title>
  <desc>Một sự kiện image uploaded publish vào SNS topic, fan-out đến ba SQS queue A, B, C; mỗi queue có DLQ riêng và đẩy sang một Lambda xử lý song song độc lập: Lambda A resize image, Lambda B extract metadata, Lambda C virus scan.</desc>
  <defs>
    <marker id="foArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <rect x="16" y="118" width="120" height="60" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="76" y="142" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">SNS topic</text>
  <text x="76" y="160" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.78">"image uploaded"</text>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <path d="M136 148 C 180 148, 190 50, 232 50" marker-end="url(#foArr)"/>
    <path d="M136 148 L 232 148" marker-end="url(#foArr)"/>
    <path d="M136 148 C 180 148, 190 246, 232 246" marker-end="url(#foArr)"/>
  </g>
  <text x="180" y="40" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">fan-out</text>
  <!-- Row A -->
  <rect x="236" y="28" width="92" height="44" rx="9" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="282" y="48" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">SQS A</text>
  <text x="282" y="63" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">+ DLQ A</text>
  <line x1="328" y1="50" x2="416" y2="50" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#foArr)"/>
  <rect x="420" y="28" width="284" height="44" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="436" y="48" font-size="11.5" font-weight="700" fill="currentColor">Lambda A</text>
  <text x="436" y="63" font-size="10" fill="currentColor" opacity="0.78">resize image</text>
  <!-- Row B -->
  <rect x="236" y="126" width="92" height="44" rx="9" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="282" y="146" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">SQS B</text>
  <text x="282" y="161" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">+ DLQ B</text>
  <line x1="328" y1="148" x2="416" y2="148" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#foArr)"/>
  <rect x="420" y="126" width="284" height="44" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="436" y="146" font-size="11.5" font-weight="700" fill="currentColor">Lambda B</text>
  <text x="436" y="161" font-size="10" fill="currentColor" opacity="0.78">extract metadata</text>
  <!-- Row C -->
  <rect x="236" y="224" width="92" height="44" rx="9" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="282" y="244" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">SQS C</text>
  <text x="282" y="259" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">+ DLQ C</text>
  <line x1="328" y1="246" x2="416" y2="246" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#foArr)"/>
  <rect x="420" y="224" width="284" height="44" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="436" y="244" font-size="11.5" font-weight="700" fill="currentColor">Lambda C</text>
  <text x="436" y="259" font-size="10" fill="currentColor" opacity="0.78">virus scan</text>
</svg>

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
