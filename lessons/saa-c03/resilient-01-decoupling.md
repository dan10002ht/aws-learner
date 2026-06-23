# Decoupling & Loosely Coupled Architectures

Trong Domain 2 (Design Resilient Architectures), tư duy cốt lõi là: **giảm sự phụ thuộc trực tiếp giữa các thành phần**. Khi component A gọi thẳng component B (synchronous, tight coupling), nếu B chậm hoặc chết thì A cũng kéo theo. Decoupling chèn một lớp trung gian (queue, topic, event bus) để các tier hoạt động độc lập, scale độc lập và chịu lỗi độc lập.

Đề thi SAA-C03 cực kỳ thích dạng câu hỏi: "Cho yêu cầu X (ordering / fan-out / event-driven / xử lý peak load), chọn dịch vụ decoupling phù hợp." Bài này giúp bạn ra quyết định nhanh và tránh các bẫy phổ biến.

## 1. Vì sao phải decouple?

- **Resilience**: producer không sập khi consumer lỗi — message nằm an toàn trong queue.
- **Scalability**: thêm/bớt consumer mà không động đến producer.
- **Queue-based load leveling**: queue hấp thụ spike traffic, consumer xử lý theo nhịp ổn định của nó → không cần over-provision.
- **Stateless design**: mỗi instance không giữ session/state cục bộ → có thể bị thay thế bất kỳ lúc nào (Auto Scaling, Spot termination) mà không mất dữ liệu.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 250" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Queue-based load leveling — SQS hấp thụ spike, consumer xử lý theo nhịp ổn định</title>
  <desc>Producer bắn traffic gập ghềnh (spike) vào hàng đợi SQS làm buffer; fleet consumer (Auto Scaling hoặc Lambda) scale theo độ sâu queue và xử lý với throughput ổn định.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">Queue-based load leveling</text>

  <defs>
    <marker id="llArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>

  <rect x="16" y="60" width="150" height="120" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="91" y="82" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Producer</text>
  <text x="91" y="100" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">traffic gập ghềnh</text>
  <polyline points="30,160 44,138 58,166 72,120 86,158 100,128 114,164 128,134 142,160 152,150" fill="none" stroke="#3b82f6" stroke-opacity="0.85" stroke-width="2"/>
  <text x="91" y="174" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">spike</text>

  <line x1="166" y1="120" x2="218" y2="120" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#llArr)"/>

  <rect x="224" y="60" width="200" height="120" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="324" y="82" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">SQS — buffer</text>
  <g stroke="currentColor" stroke-opacity="0.3" fill="#f59e0b" fill-opacity="0.5">
    <rect x="246" y="104" width="22" height="40" rx="3"/>
    <rect x="272" y="104" width="22" height="40" rx="3"/>
    <rect x="298" y="104" width="22" height="40" rx="3"/>
    <rect x="324" y="104" width="22" height="40" rx="3"/>
    <rect x="350" y="104" width="22" height="40" rx="3"/>
    <rect x="376" y="104" width="22" height="40" rx="3"/>
  </g>
  <text x="324" y="166" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">hấp thụ spike, giữ message an toàn</text>

  <line x1="424" y1="120" x2="476" y2="120" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#llArr)"/>
  <text x="450" y="112" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">poll</text>

  <rect x="482" y="60" width="222" height="120" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="593" y="82" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Fleet Consumer</text>
  <g fill="#10b981" fill-opacity="0.55" stroke="currentColor" stroke-opacity="0.3">
    <rect x="500" y="98" width="46" height="30" rx="5"/>
    <rect x="556" y="98" width="46" height="30" rx="5"/>
    <rect x="612" y="98" width="46" height="30" rx="5"/>
  </g>
  <text x="593" y="148" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">ASG / Lambda — scale theo queue depth</text>
  <text x="593" y="166" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">throughput ỔN ĐỊNH</text>
</svg>

> 💡 Mẹo thi: Hễ câu hỏi nhắc "spike traffic làm backend quá tải / mất request", đáp án gần như luôn là **đặt SQS ở giữa** (queue-based load leveling) để buffer.

### Stateless là gì và lưu state ở đâu?

Tier xử lý KHÔNG nên giữ state trên local disk/memory. Đẩy state ra ngoài:

| Loại state | Lưu ở đâu |
|---|---|
| Session người dùng | DynamoDB, ElastiCache (Redis/Memcached) |
| File upload tạm | S3 |
| Dữ liệu chia sẻ giữa instance | EFS, RDS, DynamoDB |
| Trạng thái workflow | Step Functions |

> ⚠️ Bẫy: ELB "sticky sessions" giúp giữ user trên một instance, nhưng KHÔNG phải giải pháp stateless thật sự — instance chết là mất session. Đề thường muốn câu trả lời "lưu session vào DynamoDB/ElastiCache".

## 2. Amazon SQS — hàng đợi message

SQS là **pull-based queue**: consumer chủ động poll message. Message được lưu tối đa 14 ngày, mặc định 4 ngày. Đây là dịch vụ decoupling "mặc định" cho point-to-point.

### Standard vs FIFO

| Tiêu chí | Standard | FIFO |
|---|---|---|
| Throughput | Gần như không giới hạn | 300 msg/s (3000 với batching), 70k/s với high throughput mode |
| Ordering | Best-effort, **không đảm bảo** | Đảm bảo thứ tự (theo MessageGroupId) |
| Delivery | **At-least-once** (có thể trùng) | **Exactly-once** (khử trùng) |
| Tên queue | bất kỳ | phải kết thúc `.fifo` |
| Dedup | không | MessageDeduplicationId hoặc content-based |

> 💡 Mẹo thi: "Order of transactions matters" / "no duplicates" → **SQS FIFO**. "Maximum throughput, order không quan trọng" → **SQS Standard**.

> ⚠️ Bẫy: Standard queue có thể giao **duplicate** và **out-of-order**. Nếu app không idempotent thì xử lý trùng sẽ sai. Đề hay gài "Standard nhưng yêu cầu no duplicates" — sai, phải FIFO.

### Visibility Timeout

Khi consumer nhận message, message bị "ẩn" trong khoảng **visibility timeout** (mặc định 30s, max 12h) để consumer khác không nhận trùng. Consumer xử lý xong phải gọi `DeleteMessage`. Nếu không xóa kịp (timeout hết), message **xuất hiện lại** và bị xử lý lần nữa.

- Timeout **quá ngắn** → message xử lý chưa xong đã hiện lại → xử lý trùng (double processing).
- Timeout **quá dài** → message lỗi (consumer crash) mất nhiều thời gian mới được retry.
- Consumer cần thêm thời gian → gọi `ChangeMessageVisibility` để gia hạn.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 330" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Vòng đời message SQS theo Visibility Timeout</title>
  <desc>Message ở trạng thái Available; khi consumer ReceiveMessage nó chuyển sang In-flight (ẩn trong visibility timeout); xử lý xong gọi DeleteMessage để xoá hẳn, còn nếu timeout hết thì quay lại Available; vượt maxReceiveCount thì chuyển sang Dead-Letter Queue.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">Vòng đời message — Visibility Timeout</text>

  <defs>
    <marker id="vtArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>

  <rect x="40" y="60" width="170" height="64" rx="10" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="125" y="90" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Available</text>
  <text x="125" y="108" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">sẵn sàng để nhận</text>

  <rect x="40" y="210" width="170" height="64" rx="10" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="125" y="238" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">In-flight (ẩn)</text>
  <text x="125" y="256" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">trong visibility timeout</text>

  <rect x="510" y="60" width="170" height="64" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="595" y="90" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Đã xoá</text>
  <text x="595" y="108" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">DeleteMessage → xong</text>

  <rect x="510" y="210" width="170" height="64" rx="10" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="595" y="238" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Dead-Letter Queue</text>
  <text x="595" y="256" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">vượt maxReceiveCount</text>

  <line x1="125" y1="124" x2="125" y2="208" stroke="currentColor" stroke-opacity="0.55" stroke-width="1.5" marker-end="url(#vtArr)"/>
  <text x="134" y="170" font-size="10.5" fill="currentColor" opacity="0.85">ReceiveMessage</text>

  <path d="M210 226 C 360 200, 360 90, 508 90" fill="none" stroke="currentColor" stroke-opacity="0.55" stroke-width="1.5" marker-end="url(#vtArr)"/>
  <text x="360" y="142" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">xử lý xong → DeleteMessage</text>

  <path d="M148 208 C 240 150, 240 130, 200 100" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#vtArr)"/>
  <text x="270" y="186" font-size="10" fill="currentColor" opacity="0.75">timeout hết / không xoá kịp → trở lại</text>

  <line x1="210" y1="242" x2="508" y2="242" stroke="currentColor" stroke-opacity="0.55" stroke-width="1.5" marker-end="url(#vtArr)"/>
  <text x="360" y="234" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">lỗi lặp lại quá N lần</text>
</svg>

> ⚠️ Bẫy kinh điển: "Message bị xử lý nhiều lần / xử lý trùng" trong khi consumer xử lý lâu → nguyên nhân là **visibility timeout quá ngắn**, tăng nó lên.

### Long Polling vs Short Polling

| | Short polling | Long polling |
|---|---|---|
| Hành vi | Trả lời ngay, có thể rỗng | Chờ tới khi có message (tối đa `WaitTimeSeconds`, max 20s) |
| Chi phí | Nhiều empty response → tốn API call/tiền | Giảm empty response, **rẻ hơn** |
| Khuyến nghị | Hiếm khi | Mặc định nên dùng |

> 💡 Mẹo thi: "Giảm số empty response / giảm chi phí SQS / giảm latency phát hiện message" → **Long Polling** (set `ReceiveMessageWaitTimeSeconds = 20`).

### Dead-Letter Queue (DLQ)

DLQ là queue riêng nhận các message **xử lý thất bại nhiều lần**. Cấu hình `maxReceiveCount`: sau N lần message bị nhận mà không delete (xử lý lỗi), nó được chuyển sang DLQ để điều tra, tránh "poison pill" làm tắc queue.

> 💡 Mẹo thi: "Message lỗi cứ retry vô hạn làm nghẽn queue" / "cần giữ lại message thất bại để debug" → cấu hình **DLQ** với `maxReceiveCount`.

### SQS — các tính năng khác hay hỏi

- **Delay queue**: trì hoãn message hiển thị (tối đa 15 phút).
- **Message size**: tối đa 256 KB. Payload lớn hơn → dùng **SQS Extended Client + S3** (lưu body ở S3, để con trỏ trong message).
- **Lambda trigger**: SQS có thể trigger Lambda (event source mapping) — pattern serverless decoupling rất phổ biến.

## 3. Amazon SNS — Pub/Sub

SNS là **push-based**, mô hình **publisher → topic → nhiều subscriber**. Một message publish lên topic được đẩy tới TẤT CẢ subscriber.

- Subscriber: SQS, Lambda, HTTP/S endpoint, Email, SMS, **Kinesis Data Firehose**.
- **SNS FIFO** tồn tại (ghép với SQS FIFO) để giữ ordering trong fan-out.
- SNS không lưu trữ message lâu — nếu subscriber lỗi và không có buffer, message có thể mất (trừ khi có DLQ/retry).

### Fan-out: SNS + SQS

Pattern kinh điển: publish **một** message lên SNS topic, topic fan-out tới **nhiều** SQS queue, mỗi queue cho một microservice xử lý độc lập.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 290" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Fan-out SNS + SQS — một message tới nhiều queue, mỗi service xử lý độc lập</title>
  <desc>Producer publish một message lên SNS topic; topic fan-out tới ba SQS queue (mỗi queue có buffer, retry và DLQ riêng); mỗi SQS queue đẩy cho một service xử lý độc lập.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">Fan-out: SNS → nhiều SQS → nhiều Service</text>

  <defs>
    <marker id="foArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>

  <rect x="16" y="118" width="116" height="54" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="74" y="142" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Producer</text>
  <text x="74" y="159" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">publish 1 lần</text>

  <line x1="132" y1="145" x2="178" y2="145" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#foArr)"/>

  <rect x="182" y="112" width="116" height="66" rx="10" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="240" y="140" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">SNS topic</text>
  <text x="240" y="158" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">fan-out</text>

  <path d="M298 130 C 340 92, 360 70, 408 64" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#foArr)"/>
  <path d="M298 145 H 408" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#foArr)"/>
  <path d="M298 160 C 340 198, 360 220, 408 226" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#foArr)"/>

  <g>
    <rect x="412" y="40" width="150" height="48" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="487" y="60" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">SQS queue A</text>
    <text x="487" y="77" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">buffer · retry · DLQ</text>
  </g>
  <g>
    <rect x="412" y="121" width="150" height="48" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="487" y="141" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">SQS queue B</text>
    <text x="487" y="158" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">buffer · retry · DLQ</text>
  </g>
  <g>
    <rect x="412" y="202" width="150" height="48" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="487" y="222" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">SQS queue C</text>
    <text x="487" y="239" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">buffer · retry · DLQ</text>
  </g>

  <line x1="562" y1="64" x2="606" y2="64" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#foArr)"/>
  <line x1="562" y1="145" x2="606" y2="145" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#foArr)"/>
  <line x1="562" y1="226" x2="606" y2="226" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#foArr)"/>

  <g fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22">
    <rect x="610" y="44" width="98" height="40" rx="9"/>
    <rect x="610" y="125" width="98" height="40" rx="9"/>
    <rect x="610" y="206" width="98" height="40" rx="9"/>
  </g>
  <text x="659" y="69" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Service A</text>
  <text x="659" y="150" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Service B</text>
  <text x="659" y="231" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Service C</text>
</svg>

Ưu điểm so với cho producer publish thẳng vào nhiều queue:
- Producer chỉ publish 1 lần.
- Thêm subscriber mới không cần sửa producer (loose coupling thật sự).
- Mỗi SQS queue cho khả năng **buffer + retry + DLQ** riêng — không mất message nếu một service down.

> 💡 Mẹo thi: "Một sự kiện cần được nhiều hệ thống xử lý song song, mỗi hệ thống độc lập và không được mất message" → **SNS fan-out tới nhiều SQS queue**. (SNS một mình không có buffer bền vững → ghép SQS để đảm bảo durability.)

> ⚠️ Bẫy: Câu hỏi muốn fan-out + đảm bảo không mất message → đừng chọn "SNS to multiple Lambda". Lambda có thể throttle/lỗi; **SNS → SQS → Lambda** mới có buffer an toàn.

## 4. Amazon EventBridge — Event Bus

EventBridge (tiền thân CloudWatch Events) là **serverless event bus** cho kiến trúc event-driven. Khác SNS ở chỗ: route message dựa trên **nội dung event** (content-based filtering rất mạnh), tích hợp sâu với **AWS services** và **SaaS partner**.

Thành phần chính:
- **Event bus**: default bus (AWS service events), custom bus (app của bạn), partner bus (Zendesk, Datadog...).
- **Rules**: pattern matching trên JSON event → route tới target (Lambda, SQS, SNS, Step Functions, Kinesis...).
- **Schema registry**: tự khám phá và lưu schema của event → generate code binding.
- **Scheduler / scheduled rules**: chạy theo cron (thay cron server).

```json
{
  "source": ["aws.s3"],
  "detail-type": ["Object Created"],
  "detail": { "bucket": { "name": ["my-bucket"] } }
}
```

### SNS vs EventBridge — phân biệt cho đề thi

| | SNS | EventBridge |
|---|---|---|
| Mô hình | Pub/sub đơn giản | Event bus + routing nâng cao |
| Filtering | Có (message attributes) | **Content-based mạnh hơn** (toàn bộ JSON) |
| Throughput/latency | Rất cao, độ trễ thấp | Cao hơn về tính năng, latency nhỉnh hơn |
| Tích hợp AWS services | Hạn chế | **90+ AWS service làm event source** |
| SaaS / third-party | Không | **Có (partner event source)** |
| Số target/rule | Nhiều subscriber | Tối đa 5 target/rule |
| Replay/Archive | Không | **Có archive & replay event** |

> 💡 Mẹo thi:
> - "React tới event từ AWS service (S3 upload, EC2 state change), hoặc từ SaaS, có filtering phức tạp, hoặc cần schedule (cron)" → **EventBridge**.
> - "Fan-out đơn giản, throughput cao, độ trễ thấp tới SQS/Lambda/email/SMS" → **SNS**.

## 5. Amazon Kinesis — Streaming dữ liệu

Kinesis dành cho **real-time streaming** với volume lớn, nhiều consumer đọc lại cùng dữ liệu, và cần **giữ thứ tự theo partition key**.

- **Kinesis Data Streams**: retention 1–365 ngày, nhiều consumer đọc **độc lập** (mỗi consumer giữ vị trí riêng), có thể **replay** dữ liệu.
- **Kinesis Data Firehose**: tự động deliver vào S3, Redshift, OpenSearch (near-real-time, không cần quản lý consumer).

### SQS vs SNS vs EventBridge vs Kinesis

| Yêu cầu | Chọn |
|---|---|
| Point-to-point queue, buffer load, retry, DLQ | **SQS** |
| Đảm bảo ordering + no duplicate, 1 consumer group | **SQS FIFO** |
| Fan-out 1→nhiều, pub/sub, throughput cao | **SNS** |
| Event-driven từ AWS services/SaaS, filtering phức tạp, schedule | **EventBridge** |
| Streaming real-time, nhiều consumer đọc lại, replay, big data, ordering theo shard | **Kinesis** |

> 💡 Mẹo thi: Tín hiệu nhận diện Kinesis: "real-time analytics", "clickstream", "IoT telemetry", "thousands of records/sec", "multiple consumers replaying data", "ordered per device". Nếu chỉ là "decouple 2 service / buffer task" thì **đừng** chọn Kinesis (overkill) → SQS.

> ⚠️ Bẫy: SQS message bị **xóa sau khi consume** và không replay được. Nếu đề yêu cầu "nhiều ứng dụng đọc cùng stream và có thể replay" → **Kinesis**, không phải SQS.

## 6. API Gateway + Lambda — decoupling tầng API

Pattern serverless điển hình: **API Gateway** (cửa ngõ HTTP) → **Lambda** (xử lý) → backend (DynamoDB...). Client tách hoàn toàn khỏi compute.

API Gateway cung cấp:
- **Throttling / rate limiting** & usage plans (bảo vệ backend khỏi quá tải).
- **Caching** để giảm tải và latency.
- **Authorization**: IAM, Cognito, Lambda authorizer.
- Tích hợp trực tiếp (service integration) tới SQS, Step Functions... mà không cần Lambda.

### Async decoupling với Lambda

- Lambda gọi async (SNS, S3 event, EventBridge) có **retry tự động** và có thể cấu hình **on-failure destination** (SQS/SNS).
- Để chống quá tải downstream: **API Gateway → SQS → Lambda** (queue làm buffer) thay vì API Gateway gọi thẳng Lambda khi traffic spike và backend chậm.

> ⚠️ Bẫy: API Gateway có timeout tích hợp **29 giây**. Tác vụ chạy lâu → trả về 202 ngay, đẩy job vào **SQS/Step Functions** xử lý bất đồng bộ, đừng giữ kết nối đồng bộ.

## 7. Microservices: ECS / EKS / Fargate

Decoupling ở tầng compute = tách monolith thành **microservices** độc lập, giao tiếp qua queue/event/API.

| | ECS (EC2 launch type) | ECS Fargate | EKS |
|---|---|---|---|
| Bản chất | Container orchestration của AWS, chạy trên EC2 bạn quản lý | Serverless container (không quản lý EC2) | Managed Kubernetes |
| Quản lý hạ tầng | Bạn quản lý EC2 (patch, scale node) | AWS quản lý, trả theo vCPU/RAM | Bạn (hoặc Fargate) quản lý node |
| Khi nào dùng | Cần kiểm soát instance, dùng Spot tiết kiệm | Không muốn quản lý server, workload biến động | Đã chuẩn Kubernetes, multi-cloud, hệ sinh thái K8s |

> 💡 Mẹo thi:
> - "Run containers without managing servers/EC2" → **Fargate**.
> - "Already using Kubernetes / cần portability K8s" → **EKS**.
> - "Cần kiểm soát instance hoặc tiết kiệm bằng Spot/Reserved" → **ECS on EC2**.

Microservices nên giao tiếp **bất đồng bộ qua SQS/SNS/EventBridge** thay vì gọi REST đồng bộ chuỗi dài (tránh cascade failure). Service discovery dùng **AWS Cloud Map**; cân bằng tải nội bộ dùng **ALB** (path/host-based routing).

## 8. Tổng hợp cây quyết định cho đề thi

Đọc câu hỏi và bắt từ khóa:

- "Order matters / no duplicates" → **SQS FIFO**
- "Buffer spike / smooth out load / decouple producer-consumer" → **SQS Standard**
- "Message xử lý trùng khi consumer chậm" → tăng **visibility timeout**
- "Message lỗi gây nghẽn / giữ lại để debug" → **DLQ**
- "Giảm empty response / chi phí poll" → **Long polling**
- "Một event → nhiều hệ thống độc lập, không mất message" → **SNS → nhiều SQS (fan-out)**
- "React tới AWS service event / SaaS / filtering phức tạp / cron schedule" → **EventBridge**
- "Real-time stream, replay, nhiều consumer, big data" → **Kinesis**
- "Run containers serverless" → **Fargate**
- "Long-running task qua API" → **API Gateway → SQS/Step Functions (async)**

## 9. Checklist các bẫy thường gặp

- ❌ Standard queue nhưng yêu cầu **no duplicate/ordering** → phải **FIFO**.
- ❌ Chọn SNS một mình cho fan-out cần **durability** → phải ghép **SQS**.
- ❌ Dùng SQS khi cần **replay/nhiều consumer độc lập** → phải **Kinesis**.
- ❌ Dùng Kinesis cho task decouple đơn giản → **overkill**, dùng **SQS**.
- ❌ Quên rằng SQS message tối đa **256 KB** → payload lớn dùng **S3 + Extended Client**.
- ❌ Giữ session trên instance (stateful) → đẩy ra **DynamoDB/ElastiCache**.
- ❌ Tác vụ > 29s qua API Gateway đồng bộ → chuyển **async**.
- ❌ Visibility timeout quá ngắn → **double processing**.

> 💡 Tư duy cốt lõi: Khi nghi ngờ giữa các lựa chọn, hỏi 3 câu — (1) Cần **ordering** không? (2) Cần **fan-out** tới nhiều consumer không? (3) Cần **replay/nhiều consumer độc lập** không? Trả lời 3 câu này gần như luôn dẫn thẳng tới SQS / SNS / EventBridge / Kinesis đúng.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cây quyết định chọn dịch vụ decoupling theo 3 câu hỏi</title>
  <desc>Cây quyết định: hỏi cần replay hoặc nhiều consumer độc lập thì chọn Kinesis; nếu cần fan-out tới nhiều consumer thì hỏi tiếp có cần filtering nâng cao hay event từ AWS/SaaS không — có thì EventBridge, không thì SNS (ghép SQS để durable); nếu không fan-out thì hỏi có cần ordering hoặc no-duplicate không — có thì SQS FIFO, không thì SQS Standard.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">Chọn dịch vụ decoupling — 3 câu hỏi</text>

  <defs>
    <marker id="dtArr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>

  <rect x="250" y="40" width="220" height="50" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="62" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">1. Cần replay / nhiều</text>
  <text x="360" y="79" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">consumer độc lập?</text>

  <path d="M470 65 H 640 V 110" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#dtArr)"/>
  <text x="556" y="58" font-size="10.5" fill="#10b981" opacity="0.95" font-weight="700">CÓ</text>
  <rect x="566" y="112" width="148" height="46" rx="10" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="640" y="140" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Kinesis</text>

  <path d="M360 90 V 130" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#dtArr)"/>
  <text x="370" y="116" font-size="10.5" fill="currentColor" opacity="0.7">KHÔNG</text>

  <rect x="250" y="132" width="220" height="50" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="154" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">2. Cần fan-out tới</text>
  <text x="360" y="171" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">nhiều consumer?</text>

  <path d="M470 157 H 540 V 175 H 607 V 198" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#dtArr)"/>
  <text x="500" y="150" font-size="10.5" fill="#10b981" opacity="0.95" font-weight="700">CÓ</text>

  <rect x="500" y="200" width="214" height="56" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="607" y="222" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Filtering nâng cao /</text>
  <text x="607" y="238" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">event AWS/SaaS /</text>
  <text x="607" y="251" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">cron?</text>

  <path d="M555 256 V 282" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#dtArr)"/>
  <text x="500" y="274" font-size="10" fill="currentColor" opacity="0.7">KHÔNG</text>
  <rect x="533" y="282" width="148" height="46" rx="10" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="607" y="304" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">SNS</text>
  <text x="607" y="320" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">+ SQS để durable</text>

  <path d="M698 256 V 348" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#dtArr)"/>
  <text x="703" y="290" font-size="10" fill="#10b981" opacity="0.95" font-weight="700">CÓ</text>
  <rect x="566" y="350" width="148" height="46" rx="10" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="640" y="378" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">EventBridge</text>

  <path d="M360 182 V 222" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#dtArr)"/>
  <text x="370" y="208" font-size="10.5" fill="currentColor" opacity="0.7">KHÔNG</text>

  <rect x="250" y="224" width="220" height="50" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="246" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">3. Cần ordering /</text>
  <text x="360" y="263" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">no-duplicate?</text>

  <path d="M250 249 H 170 V 290" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#dtArr)"/>
  <text x="180" y="242" font-size="10.5" fill="#10b981" opacity="0.95" font-weight="700">CÓ</text>
  <rect x="96" y="292" width="148" height="46" rx="10" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="170" y="320" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">SQS FIFO</text>

  <path d="M360 274 V 314" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#dtArr)"/>
  <text x="370" y="300" font-size="10.5" fill="currentColor" opacity="0.7">KHÔNG</text>
  <rect x="286" y="316" width="148" height="46" rx="10" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="344" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">SQS Standard</text>
</svg>
