# Bài 13 — Decoupling: SQS, SNS, EventBridge, Kinesis, Step Functions

**Prerequisite foundations:** [[foundations-03-replication-and-quorum]], idempotency.

## 1. Mục tiêu
- Chọn đúng service decouple cho từng pattern: queue / pub-sub / event bus / stream / workflow.
- Hiểu **at-least-once** vs **exactly-once** vs **ordered**.
- Thiết kế **DLQ**, **visibility timeout**, **idempotent consumer**.
- Pattern fan-out, scatter-gather, choreography vs orchestration.

---

## 2. Tổng quan — chọn cái nào

| Pattern | Service |
|---------|---------|
| Queue 1 producer → 1 consumer pool | **SQS** |
| Pub-sub 1 → N subscriber | **SNS** |
| Event-driven schema + filter + schedule | **EventBridge** |
| Real-time stream replay, multiple consumer | **Kinesis Data Streams** |
| Stream → S3/Redshift/OpenSearch | **Kinesis Firehose** |
| Workflow orchestration multi-step | **Step Functions** |
| Kafka managed | **MSK** |
| Real-time message bus IoT/chat | **IoT Core** / **AppSync** |

---

## 3. SQS

### 3.1 2 loại queue

| | Standard | FIFO |
|--|----------|------|
| Throughput | **Vô hạn** | 300 msg/s (3000 với batch) |
| Order | Best-effort | **Strict FIFO trong MessageGroupId** |
| Delivery | **At-least-once** (có thể trùng) | **Exactly-once** (5-min dedup window) |
| Tên | `<name>` | `<name>.fifo` (bắt buộc suffix) |
| Giá | $0.40/M | $0.50/M |

### 3.2 Key concepts
- **Visibility Timeout** (default 30s) — consumer nhận message, message ẩn trong VT. Consumer phải `DeleteMessage` trước khi hết VT, nếu không visible lại → duplicate process. **Set > thời gian xử lý**.
- **Message Retention** — 1 phút → 14 ngày (default 4 ngày).
- **Long Polling** — `WaitTimeSeconds=20` giảm empty poll, giảm cost.
- **Delay Queue** — delay tất cả message X giây (max 15 phút).
- **Message Timer** — delay per-message.
- **DLQ (Dead Letter Queue)** — nhận message sau N lần failed (`maxReceiveCount`). **Bắt buộc** cho production.
- **Max message size** 256KB. Lớn hơn → S3 + reference (Extended Client Lib).

### 3.3 FIFO chi tiết
- **MessageGroupId**: messages cùng group → ordered, khác group → parallel.
- **MessageDeduplicationId** hoặc content-based dedup → exactly-once trong 5 phút.
- Throughput limit per group. Scale bằng nhiều groups.

### 3.4 Patterns

#### Idempotent consumer (BẮT BUỘC với at-least-once)
```python
def handle(msg):
    msg_id = msg['MessageId']
    if seen.contains(msg_id):   # DynamoDB conditional put
        return
    process(msg)
    seen.add(msg_id, ttl=86400)
```

#### Visibility timeout tăng động
```python
sqs.change_message_visibility(
    QueueUrl=q, ReceiptHandle=h, VisibilityTimeout=300)
```

---

## 4. SNS

### 4.1 Đặc điểm
- **Pub-sub fan-out** 1 → N.
- Targets: SQS, Lambda, HTTP/S, email, SMS, Mobile push, Kinesis Firehose.
- **Filter Policy** per subscription — chỉ deliver message match attribute.
- **Standard** (best-effort) + **FIFO** (ordered, chỉ deliver tới SQS FIFO hoặc HTTPS).
- **Message size** 256KB.

### 4.2 Fan-out pattern
```
Producer → SNS topic ─┬─→ SQS-A (worker A)
                      ├─→ SQS-B (worker B)
                      └─→ Lambda (audit log)
```

→ 1 publish, N consumer độc lập. Mỗi consumer có DLQ riêng.

### 4.3 SNS + SQS vs EventBridge

| | SNS+SQS | EventBridge |
|--|---------|-------------|
| Throughput | Cực cao | Cao nhưng có limit |
| Schema | Không enforce | Có Schema Registry |
| Filter | Basic attribute match | Powerful pattern matching, content-based |
| Schedule | Không | **Có** (cron, rate) |
| Cost | Rẻ ($0.50/M publish) | $1/M event |
| Cross-account | SNS qua policy | Native event bus |
| Replay | Không | **Archive + Replay** |
| Use case | High-throughput fan-out, app-to-app | Event-driven choreography, SaaS integration |

---

## 5. EventBridge

### 5.1 Components
- **Event Bus**: default (AWS service events), custom (your events), partner (SaaS: Datadog, Zendesk).
- **Rule**: pattern matching → 1-5 targets.
- **Target**: Lambda, SQS, SNS, Step Functions, ECS task, Kinesis, API destination (HTTPS), cross-account event bus...
- **Schema Registry**: auto-discover schema từ events, generate code binding.
- **Archive + Replay**: lưu events, replay khi cần test.
- **Scheduler** (mới 2022): cron/rate trigger target — replace CloudWatch Events Scheduled.

### 5.2 Pattern matching
```json
{
  "source": ["aws.ec2"],
  "detail-type": ["EC2 Instance State-change Notification"],
  "detail": {
    "state": ["running", "stopped"]
  }
}
```

### 5.3 Use cases
- React to AWS service events (EC2 state change, S3 object created, RDS event).
- Cross-account event routing (security account aggregate findings).
- Schedule task (replace CloudWatch Events cron).
- SaaS integration (PagerDuty alert → Lambda).

### 5.4 EventBridge Pipes (2022)
- Connect source → enrichment → target không cần Lambda glue code.
- Source: SQS, Kinesis, DDB Streams, MSK...
- Target: Step Functions, Lambda, SNS, SQS, API destination...

---

## 6. Kinesis

### 6.1 4 variants

| | Data Streams | Firehose | Data Analytics | Video Streams |
|--|--------------|----------|----------------|---------------|
| Mục đích | Real-time stream | Near-real-time → S3/RS/OS | SQL/Apache Flink trên stream | Video ingest |
| Latency | < 1s | 60s buffer | depends | low |
| Storage | 1-365 ngày | None (pass-through) | None | configurable |
| Replay | ✅ | ❌ | depends | ✅ |
| Pricing | Shard-hour + PUT | Per GB ingested | Per KPU | Per GB |

### 6.2 Data Streams chi tiết
- **Shard**: 1 MB/s in, 2 MB/s out, 1000 records/s in per shard.
- **Partition Key** → hash → shard.
- **Sequence Number** ordered trong shard.
- **Consumer**:
  - **Shared (classic)**: tất cả consumer share 2 MB/s/shard.
  - **Enhanced Fan-out (EFO)**: mỗi consumer 2 MB/s/shard dedicated, push-based.
- **Retention**: 24h default, max 365 ngày.

### 6.3 Kinesis vs SQS vs Kafka

| | Kinesis Streams | SQS | Kafka (MSK) |
|--|-----------------|-----|-------------|
| Order | Per shard | Per FIFO group | Per partition |
| Replay | ✅ | ❌ | ✅ |
| Multiple consumer | ✅ | ❌ (1 consumer pool) | ✅ |
| Throughput | Shard-based | Vô hạn standard | Partition-based |
| Latency | < 1s | < 100ms | < 10ms |
| Managed level | Full | Full | Cluster managed, broker manageable |

---

## 7. Step Functions

### 7.1 Standard vs Express

| | Standard | Express |
|--|----------|---------|
| Max duration | **1 năm** | 5 phút |
| Execution model | At-most-once | At-least-once (Express Sync) hoặc Async |
| History | Full execution history | CloudWatch Logs only |
| Pricing | $25/M transitions | $1/M req + $0.06/GB-s |
| Use case | Long workflow, audit | High-volume, IoT, streaming |

### 7.2 States
- **Task** — invoke Lambda/ECS/SNS/SQS/DDB/...
- **Choice** — branching.
- **Parallel** — run branches concurrent.
- **Map** — iterate over array.
- **Wait** — delay.
- **Pass** — pass-through.
- **Succeed / Fail**.

### 7.3 Error handling
- **Retry** with `IntervalSeconds`, `BackoffRate`, `MaxAttempts`.
- **Catch** specific error → fallback state.
- Built-in error: `States.ALL`, `States.Timeout`, `Lambda.ServiceException`...

### 7.4 Orchestration vs Choreography

| | Orchestration (Step Functions) | Choreography (EventBridge) |
|--|---------------------------------|-----------------------------|
| Control | Central | Decentralized |
| Visibility | High (state machine UI) | Low (logs scattered) |
| Coupling | Tight (workflow knows steps) | Loose (services react events) |
| Testing | Easier | Harder |
| Use case | Saga, transactional | Microservices, event-driven |

---

## 8. Patterns thường gặp

### 8.1 Fan-out với SNS+SQS
```
S3 ObjectCreated → SNS → ┬→ SQS-thumbnail → Lambda resize
                          ├→ SQS-virus-scan → Lambda scan
                          └→ SQS-index → Lambda Elasticsearch
```

### 8.2 Saga pattern với Step Functions
```
[OrderPlaced] → ReserveInventory → ChargePayment → ShipOrder
                       ↓ fail                ↓ fail
                  CancelOrder           RefundPayment
```

### 8.3 ETL stream với Firehose
```
App → Kinesis Data Stream → Firehose → S3 Parquet → Athena
                              ↓
                           Lambda transform
```

### 8.4 Outbox pattern (CDC)
```
DDB Streams → Lambda → EventBridge → consumer services
```

→ Đảm bảo write DB + publish event atomic (eventually consistent).

---

## 9. Tự kiểm tra

1. App publish 50k msg/s, cần fan-out 3 consumer độc lập. Service?
   <details><summary>Đáp án</summary>**SNS + 3 SQS subscribers**. Hoặc **EventBridge** nếu cần filter + schema + cross-account.</details>

2. Order processing cần strict ordering per customer. SQS loại?
   <details><summary>Đáp án</summary>**SQS FIFO** với `MessageGroupId = customerId`. Order across customer parallel.</details>

3. Workflow: process payment có 5 step, mỗi step có thể fail và cần rollback. Pattern?
   <details><summary>Đáp án</summary>**Step Functions** với Saga pattern — mỗi step có compensating action trong Catch.</details>

4. Stream click event 100k/s từ web, cần lưu vào S3 mỗi phút + analytics real-time. Service?
   <details><summary>Đáp án</summary>**Kinesis Data Stream** (real-time) + **Firehose** (batch to S3) + **Kinesis Data Analytics** (real-time SQL). Hoặc chỉ Firehose nếu không cần real-time analytics.</details>

5. SQS standard. Consumer xử lý 60s. VT = 30s. Vấn đề?
   <details><summary>Đáp án</summary>VT hết trước khi consumer xong → message visible lại → consumer khác process duplicate. **Fix**: VT > xử lý time, hoặc `change_message_visibility` heartbeat.</details>

6. Cần schedule job 9AM mỗi sáng. Replace CloudWatch Events Scheduled?
   <details><summary>Đáp án</summary>**EventBridge Scheduler** (2022) — replace CW Events Scheduled, có timezone, one-time, retry, DLQ.</details>

7. Cross-account event routing: account A muốn nhận event từ account B. Cách?
   <details><summary>Đáp án</summary>**EventBridge** — B có rule target = event bus của A (cross-account permission). A có rule trên bus đó.</details>

8. Kinesis stream với 4 shard. Throughput max in?
   <details><summary>Đáp án</summary>4 MB/s (4 × 1 MB/s) và 4000 records/s. Output 8 MB/s shared (hoặc 8 MB/s per consumer với EFO).</details>

9. SNS deliver tới HTTP endpoint thỉnh thoảng fail. Đảm bảo retry?
   <details><summary>Đáp án</summary>SNS retry policy + **DLQ** (subscription-level từ 2019). Sau N retry vào DLQ SQS.</details>

10. Step Functions long workflow 6 tháng (subscription expiry). Standard hay Express?
    <details><summary>Đáp án</summary>**Standard** — max 1 năm. Express max 5 phút.</details>

---

## 10. Đối chiếu GCP

| AWS | GCP |
|-----|-----|
| SQS Standard | **Pub/Sub** (queue subscription) |
| SQS FIFO | **Pub/Sub ordering key** |
| SNS | **Pub/Sub** (topic + multi-subscription) |
| EventBridge | **Eventarc** |
| EventBridge Scheduler | **Cloud Scheduler** |
| Kinesis Data Streams | **Pub/Sub** (with seek) |
| Firehose | **Pub/Sub → Dataflow → BigQuery/GCS** |
| Kinesis Data Analytics | **Dataflow** (Apache Beam) |
| Step Functions | **Workflows** (GA 2021) |
| MSK | **Confluent Cloud trên GCP** hoặc **GKE Kafka** |
| EventBridge Pipes | **Eventarc + Workflows** |

**Bẫy:**
1. GCP **Pub/Sub** là 1 service "đa năng" (queue + pub-sub + stream). AWS tách rõ SQS/SNS/Kinesis — mỗi service chuyên một thứ. Đề thi hay hỏi distinguish.
2. **Ordering ở Pub/Sub** đơn giản hơn SQS FIFO + dedup window.
3. AWS **Step Functions visual** đẹp hơn GCP Workflows YAML.
4. **EventBridge Schema Registry + Archive/Replay** đặc thù AWS — GCP không có equivalent.

---

## 11. Lưu ý SAA

- **Decouple keyword** → SQS hoặc EventBridge.
- **Fan-out** → SNS hoặc EventBridge.
- **Real-time stream** → Kinesis Data Streams.
- **Near-real-time to S3** → Firehose.
- **Orchestrate workflow** → Step Functions.
- **High-volume short workflow** → Step Functions Express.
- **Long workflow audit** → Step Functions Standard.
- **DLQ** bắt buộc với mọi async.
- **Visibility timeout > processing time**.
- **FIFO** giới hạn throughput, dùng nhiều MessageGroupId để scale.
- **EFO** cho Kinesis multi-consumer.
- **EventBridge Pipes** = source → enrich → target không Lambda glue.

## 12. Lưu ý đi làm

### Best practice
- **Idempotent consumer** — DDB conditional put MessageId làm key.
- **DLQ** monitor (CloudWatch alarm `ApproximateNumberOfMessages` > 0).
- **Visibility timeout dynamic** với heartbeat cho long task.
- **Long polling** mặc định (`WaitTimeSeconds=20`).
- **Schema Registry** (EventBridge) cho cross-team contract.
- **Step Functions** thay Lambda chain (Lambda gọi Lambda) khi workflow > 3 step.
- **Outbox pattern** với DDB Streams cho microservice CDC.

### Anti-pattern
- ❌ Lambda gọi Lambda gọi Lambda → dùng Step Functions.
- ❌ SQS không DLQ → message poison loop vĩnh viễn.
- ❌ Visibility timeout < processing time → duplicate.
- ❌ Non-idempotent consumer → corrupt state khi retry.
- ❌ SNS subscription HTTP không có DLQ.
- ❌ Kinesis 1 shard cho 100k records/s → throttle. Tăng shard hoặc dùng Firehose.

## 13. Foundations
- **At-least-once + idempotency** là chủ đề của replication. Đọc [[foundations-03-replication-and-quorum]] nếu chưa.
- **Exactly-once là illusion** — FIFO chỉ exactly-once trong 5-min dedup window, không phải end-to-end.

## 14. Flashcard

- **SQS Standard** — vô hạn TPS, at-least-once, best-effort order.
- **SQS FIFO** — 300/s (3000 batch), exactly-once 5min dedup, MessageGroupId order.
- **Visibility Timeout** — set > xử lý time. Default 30s.
- **Long Polling** — `WaitTimeSeconds=20` giảm cost.
- **DLQ** — sau `maxReceiveCount` lần fail.
- **SNS** — pub-sub fan-out, Filter Policy, FIFO topic.
- **EventBridge** — schema, pattern matching, archive/replay, schedule, partner bus.
- **EventBridge Pipes** — source → enrich → target.
- **Kinesis Data Stream** — shard 1MB/s in, 2MB/s out, 1000 rec/s.
- **EFO** — per-consumer dedicated 2MB/s.
- **Firehose** — buffer → S3/RS/OS, no replay.
- **Step Functions Standard** — 1 năm, $25/M transition.
- **Step Functions Express** — 5 phút, $1/M req.
- **Saga pattern** — Step Functions với compensating action.
- **Orchestration** (SF) vs **Choreography** (EB).
- **At-least-once + idempotency** = "exactly-once" thực tế.
