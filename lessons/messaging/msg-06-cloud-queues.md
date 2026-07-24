# Bài 6 — Cloud queues: SQS, SNS & managed messaging

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân biệt **SQS Standard** (at-least-once, unordered, throughput gần như vô hạn) và **SQS FIFO** (ordered theo `MessageGroupId`, exactly-once processing, throughput có trần).
- Giải thích **bản chất visibility timeout**: message bị "ẩn" khi đang xử lý và **tự hiện lại** nếu consumer không kịp `DeleteMessage`.
- Dùng **long polling** để giảm empty receive và tiết kiệm tiền; chỉnh đúng vòng `Receive → xử lý → Delete`.
- Cấu hình **DLQ + `maxReceiveCount`** để cô lập message độc (poison message).
- Ghép **SNS pub/sub** với SQS để làm **fan-out** một event tới nhiều queue.
- Quyết định **khi nào dùng managed (SQS/SNS) thay vì tự host Kafka/RabbitMQ**.

---

## 2. Lý thuyết

### 2.1 "Managed" nghĩa là gì — và vì sao nó đổi cách bạn suy nghĩ

Ở các bài trước bạn *vận hành* broker: dựng cluster RabbitMQ/Kafka, lo replication, disk, quorum, nâng cấp, vá lỗi, cân dung lượng. **SQS/SNS là dịch vụ managed**: bạn không thấy server nào cả. Không có "cluster" để SSH vào, không có broker để restart, không có disk để theo dõi. Bạn chỉ gọi API: `SendMessage`, `ReceiveMessage`, `DeleteMessage`, `Publish`. AWS lo phần còn lại — nhân bản dữ liệu qua nhiều Availability Zone, tự scale, tính tiền **theo số request** (pay-per-use), không theo giờ máy chạy.

Analogy: tự host Kafka giống **mua xe và tự lái, tự bảo dưỡng, tự đổ xăng** — toàn quyền tinh chỉnh nhưng gánh mọi việc. SQS giống **gọi taxi/grab** — không sở hữu xe, trả tiền mỗi chuyến, đổi lại không phải lo gara. Với phần lớn ứng dụng "gửi việc vào hàng đợi cho worker xử lý", cái bạn cần là **đi tới nơi**, không phải sở hữu chiếc xe.

Hệ quả tư duy: với SQS **không có khái niệm "queue đầy sập server"** — nó co giãn gần như vô hạn; không có "broker down lúc 2 giờ sáng phải dậy trực". Đổi lại bạn **mất quyền kiểm soát** vài thứ (không tùy biến giao thức, không stream-replay tùy ý như Kafka log, có giới hạn cứng về kích thước message 256 KB).

### 2.2 SQS Standard vs FIFO — hai loại queue, hai tập đảm bảo

Đây là quyết định kiến trúc đầu tiên và **không đổi được sau khi tạo queue**. Bản chất khác nhau ở ba trục: **thứ tự, trùng lặp, throughput**.

| | **Standard** | **FIFO** (tên queue phải kết thúc `.fifo`) |
|--|-------------|--------------------------------------------|
| Thứ tự | **Best-effort**, không đảm bảo | **Đúng thứ tự** trong cùng `MessageGroupId` |
| Giao hàng | **At-least-once** (có thể nhận lại 1 message ≥1 lần) | **Exactly-once processing** (khử trùng lặp bằng dedup) |
| Throughput | Gần như **vô hạn** (số TPS không giới hạn thực tế) | **300 msg/s** (hoặc 3.000/s với batch); với **high throughput mode** lên tới hàng chục nghìn/s tùy region |
| Cơ chế song song | Tất cả message một "pool" | Chia theo `MessageGroupId` — mỗi group xử lý tuần tự, các group **song song** nhau |
| Chi phí | Rẻ hơn | Đắt hơn một chút |

**Vì sao Standard không giữ thứ tự?** Vì để đạt throughput khổng lồ, SQS lưu message phân tán trên **nhiều máy chủ song song**. Message được nhân bản qua nhiều máy để bền; khi consumer gọi `ReceiveMessage`, SQS lấy mẫu một *tập con* máy chủ → có thể trả về không đúng thứ tự gửi, và thỉnh thoảng trả **một message hai lần** (một bản sao "sống sót" ở máy chưa kịp cập nhật trạng thái đã-nhận). Đây chính là gốc rễ của **at-least-once**: bạn **buộc phải làm consumer idempotent** (Bài 2).

**FIFO đánh đổi throughput lấy đảm bảo.** `MessageGroupId` là chìa khóa: các message *cùng group* được xử lý tuần tự đúng thứ tự (vd cùng `order-123` → mọi sự kiện của đơn đó theo trình tự); các group *khác nhau* chạy song song. Đây giống hệt ý tưởng **partition key** của Kafka. Khử trùng lặp dựa trên `MessageDeduplicationId` (hoặc content-based hash) trong **cửa sổ 5 phút**: gửi lại cùng dedup-id trong 5 phút → SQS lặng lẽ bỏ bản thứ hai.

> **Chọn:** mặc định dùng **Standard** (rẻ, khỏe, đa số việc không cần thứ tự tuyệt đối). Chỉ dùng **FIFO** khi thứ tự *trong một thực thể* là bắt buộc: xử lý giao dịch tài khoản, cập nhật trạng thái đơn hàng theo bước, event-sourcing per-aggregate.

### 2.3 Visibility timeout — trái tim của SQS

Đây là khái niệm bị hiểu sai nhiều nhất. SQS **không** đẩy message tới bạn và xóa ngay. Vòng đời là **pull + xác nhận bằng cách xóa**:

1. Consumer gọi `ReceiveMessage` → SQS trả message **và bắt đầu đếm giờ** visibility timeout (mặc định 30s).
2. Trong khoảng đó, message **không biến mất khỏi queue** — nó chỉ **bị ẩn** (invisible) để consumer *khác* không lấy trùng.
3. Consumer xử lý xong → gọi `DeleteMessage`. **Xóa mới là "ack".**
4. Nếu consumer **crash / xử lý quá lâu / quên delete** → hết timeout, message **hiện lại** (visible) và một consumer khác lấy về xử lý.

<svg viewBox="0 0 640 260" role="img" aria-labelledby="vt-t vt-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="vt-t">Vòng đời một message với visibility timeout</title>
<desc id="vt-d">Message từ trạng thái hiện, sang ẩn khi được receive, rồi hoặc bị xóa hoặc hiện lại nếu hết timeout</desc>
<rect x="30" y="100" width="120" height="56" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="124" text-anchor="middle" font-size="12" fill="currentColor">Visible</text>
<text x="90" y="142" text-anchor="middle" font-size="9" fill="currentColor">(trong queue)</text>
<rect x="270" y="100" width="130" height="56" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="335" y="122" text-anchor="middle" font-size="12" fill="currentColor">In-flight</text>
<text x="335" y="140" text-anchor="middle" font-size="9" fill="currentColor">(ẩn, đang xử lý)</text>
<rect x="510" y="40" width="110" height="48" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="565" y="68" text-anchor="middle" font-size="11" fill="currentColor">Deleted (ack)</text>
<rect x="510" y="168" width="110" height="48" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="565" y="190" text-anchor="middle" font-size="10" fill="currentColor">Hết timeout</text>
<text x="565" y="205" text-anchor="middle" font-size="9" fill="currentColor">→ hiện lại</text>
<line x1="150" y1="128" x2="266" y2="128" stroke="currentColor" stroke-width="1.2" marker-end="url(#av)"/>
<text x="208" y="120" text-anchor="middle" font-size="9" fill="currentColor">ReceiveMessage</text>
<line x1="400" y1="118" x2="506" y2="70" stroke="currentColor" stroke-width="1.2" marker-end="url(#av)"/>
<text x="452" y="88" text-anchor="middle" font-size="9" fill="currentColor">DeleteMessage</text>
<line x1="400" y1="140" x2="506" y2="190" stroke="currentColor" stroke-width="1.2" marker-end="url(#av)"/>
<text x="452" y="176" text-anchor="middle" font-size="9" fill="currentColor">crash / timeout</text>
<path d="M560,168 C560,110 300,60 210,96" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3" marker-end="url(#av)"/>
<text x="330" y="66" text-anchor="middle" font-size="9" fill="currentColor">message quay lại Visible (redelivery)</text>
<defs><marker id="av" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Bản chất:** visibility timeout là một **lease (thuê có hạn)**. Consumer "thuê" độc quyền message trong X giây; không trả kết quả (delete) đúng hạn thì lease hết, message thuộc về người khác. Cơ chế này cho SQS tính **chịu lỗi**: consumer chết giữa chừng không làm mất việc.

**Chỉnh timeout sao cho đúng?** Đặt lớn hơn **thời gian xử lý p99** của bạn. Quá **ngắn** → message hiện lại *khi bạn vẫn đang xử lý* → hai worker cùng làm một việc (double processing). Quá **dài** → message chết (consumer crash) phải chờ lâu mới được retry. Nếu một task thỉnh thoảng lâu bất thường, đừng đặt timeout khổng lồ cho mọi message — hãy gọi `ChangeMessageVisibility` để **gia hạn lease động** khi cần.

### 2.4 Long polling — đừng hỏi dồn dập vào khoảng không

`ReceiveMessage` mặc định là **short polling**: SQS trả lời *ngay*, kể cả queue rỗng (trả về rỗng). Với worker chạy vòng lặp liên tục, bạn bắn hàng nghìn request rỗng/phút → **tốn tiền** (SQS tính theo request) và **tăng tải vô ích**.

**Long polling**: đặt `WaitTimeSeconds` (tối đa **20s**). SQS **giữ kết nối chờ** tới khi có message *hoặc* hết thời gian chờ, rồi mới trả. Lợi ích kép: giảm mạnh empty receive, và giảm khả năng "false empty" của short polling (short poll chỉ hỏi tập con máy chủ nên có thể báo rỗng dù queue có message). **Luôn bật long polling** — set `ReceiveMessageWaitTimeSeconds` ở cấp queue hoặc `--wait-time-seconds 20` mỗi lần gọi.

### 2.5 DLQ & maxReceiveCount — cô lập poison message

Điều gì xảy ra nếu một message **luôn làm consumer crash** (dữ liệu hỏng, bug)? Với vòng redelivery ở 2.3, nó sẽ **quay lại mãi mãi**, chặn queue và đốt tài nguyên — gọi là **poison message**.

Giải pháp: gắn một **Dead Letter Queue** (là một SQS queue thường) làm nơi "lưu đày". Đặt **redrive policy** với `maxReceiveCount` = N: sau khi một message được **receive N lần mà chưa bị delete**, SQS tự **chuyển nó sang DLQ**. Ở đó bạn điều tra, sửa, rồi có thể **redrive** (đẩy lại) về queue chính.

<svg viewBox="0 0 640 200" role="img" aria-labelledby="dlq-t dlq-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="dlq-t">Main queue với redrive policy sang Dead Letter Queue</title>
<desc id="dlq-d">Message thất bại được retry tới maxReceiveCount rồi chuyển sang DLQ để điều tra</desc>
<rect x="30" y="70" width="120" height="56" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="94" text-anchor="middle" font-size="12" fill="currentColor">Main queue</text>
<text x="90" y="112" text-anchor="middle" font-size="9" fill="currentColor">maxReceive=5</text>
<rect x="250" y="70" width="120" height="56" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="310" y="102" text-anchor="middle" font-size="12" fill="currentColor">Consumer</text>
<rect x="480" y="70" width="130" height="56" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="545" y="94" text-anchor="middle" font-size="12" fill="currentColor">DLQ</text>
<text x="545" y="112" text-anchor="middle" font-size="9" fill="currentColor">(điều tra / redrive)</text>
<line x1="150" y1="88" x2="246" y2="88" stroke="currentColor" stroke-width="1.2" marker-end="url(#ad)"/>
<text x="198" y="80" text-anchor="middle" font-size="9" fill="currentColor">receive</text>
<path d="M250,110 C200,150 200,150 152,112" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3" marker-end="url(#ad)"/>
<text x="200" y="162" text-anchor="middle" font-size="9" fill="currentColor">fail → hiện lại (retry)</text>
<line x1="370" y1="88" x2="476" y2="88" stroke="currentColor" stroke-width="1.2" marker-end="url(#ad)"/>
<text x="423" y="80" text-anchor="middle" font-size="9" fill="currentColor">lần thứ 6</text>
<defs><marker id="ad" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Đặt **alarm CloudWatch** trên `ApproximateNumberOfMessagesVisible` của DLQ > 0 — có message rơi vào DLQ là tín hiệu "có gì đó hỏng", cần người xem.

### 2.6 SNS & fan-out — khi một event cần tới nhiều nơi

SQS thuần là **queue point-to-point**: mỗi message chỉ một consumer group lấy. Muốn **pub/sub** (một event → nhiều bên nhận, mỗi bên một bản), ta thêm **SNS (Simple Notification Service)** — một **topic** dạng push.

Điểm mạnh kinh điển: **SNS → nhiều SQS (fan-out)**. Producer `Publish` **một** message vào topic; SNS **sao message** tới *mọi* queue đã subscribe. Mỗi queue là một buffer bền cho một consumer độc lập, xử lý theo nhịp riêng — kết hợp được **decoupling của pub/sub** và **độ bền + retry của queue**.

<svg viewBox="0 0 620 230" role="img" aria-labelledby="fo-t fo-d" style="width:100%;max-width:580px;height:auto;display:block;margin:1.25rem auto">
<title id="fo-t">Fan-out: SNS topic phát tới nhiều SQS queue</title>
<desc id="fo-d">Một message publish vào SNS được sao tới ba SQS queue độc lập, mỗi queue có consumer riêng</desc>
<rect x="20" y="94" width="90" height="44" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="65" y="120" text-anchor="middle" font-size="11" fill="currentColor">Producer</text>
<rect x="160" y="90" width="90" height="52" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="205" y="112" text-anchor="middle" font-size="11" fill="currentColor">SNS topic</text>
<text x="205" y="128" text-anchor="middle" font-size="9" fill="currentColor">OrderPlaced</text>
<line x1="110" y1="116" x2="156" y2="116" stroke="currentColor" stroke-width="1.3" marker-end="url(#af)"/>
<text x="133" y="108" text-anchor="middle" font-size="8" fill="currentColor">Publish</text>
<line x1="250" y1="104" x2="330" y2="50" stroke="currentColor" stroke-width="1" marker-end="url(#af)"/>
<line x1="250" y1="116" x2="330" y2="116" stroke="currentColor" stroke-width="1" marker-end="url(#af)"/>
<line x1="250" y1="128" x2="330" y2="182" stroke="currentColor" stroke-width="1" marker-end="url(#af)"/>
<rect x="333" y="34" width="86" height="34" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="376" y="55" text-anchor="middle" font-size="10" fill="currentColor">SQS email</text>
<rect x="333" y="99" width="86" height="34" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="376" y="120" text-anchor="middle" font-size="10" fill="currentColor">SQS invent.</text>
<rect x="333" y="164" width="86" height="34" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="376" y="185" text-anchor="middle" font-size="10" fill="currentColor">SQS analytics</text>
<line x1="419" y1="51" x2="500" y2="51" stroke="currentColor" stroke-width="1" marker-end="url(#af)"/>
<line x1="419" y1="116" x2="500" y2="116" stroke="currentColor" stroke-width="1" marker-end="url(#af)"/>
<line x1="419" y1="181" x2="500" y2="181" stroke="currentColor" stroke-width="1" marker-end="url(#af)"/>
<rect x="503" y="36" width="100" height="30" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="553" y="55" text-anchor="middle" font-size="9" fill="currentColor">Email worker</text>
<rect x="503" y="101" width="100" height="30" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="553" y="120" text-anchor="middle" font-size="9" fill="currentColor">Invent. worker</text>
<rect x="503" y="166" width="100" height="30" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="553" y="185" text-anchor="middle" font-size="9" fill="currentColor">Analyt. worker</text>
<defs><marker id="af" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Vì sao **không** cho các consumer subscribe thẳng SNS (SNS đẩy HTTP/Lambda trực tiếp)? Vì SNS push là **fire-and-forget best-effort** — nếu consumer đang down, message có thể mất (SNS có retry nhưng hữu hạn). Chèn **SQS làm đệm** giữa SNS và consumer để message **nằm chờ bền** cho tới khi consumer sẵn sàng, và có sẵn DLQ/retry. Đây là mẫu **"SNS+SQS fan-out"** chuẩn mực. SNS còn có **subscription filter policy** để mỗi queue chỉ nhận đúng loại message nó quan tâm (lọc theo attribute), tránh consumer phải nhận rồi vứt.

> **Quy tắc chọn:** cần **một-tới-một / chia tải** → SQS. Cần **một-tới-nhiều** (mỗi bên một bản) → SNS. Cần **một-tới-nhiều + đệm bền + retry per-consumer** → **SNS fan-out ra nhiều SQS** (mẫu hay dùng nhất trong production).

---

## 3. Thực hành — CLI & SDK

### 3.1 Tạo queue, DLQ, gắn redrive policy (AWS CLI)

```bash
# 1. Tạo DLQ trước
aws sqs create-queue --queue-name orders-dlq

# Lấy ARN của DLQ (redrive policy cần ARN, không phải URL)
DLQ_ARN=$(aws sqs get-queue-attributes \
  --queue-url https://sqs.ap-southeast-1.amazonaws.com/123456789012/orders-dlq \
  --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

# 2. Tạo main queue: bật long polling 20s, visibility 60s, gắn DLQ maxReceiveCount=5
aws sqs create-queue --queue-name orders \
  --attributes '{
    "ReceiveMessageWaitTimeSeconds": "20",
    "VisibilityTimeout": "60",
    "RedrivePolicy": "{\"deadLetterTargetArn\":\"'"$DLQ_ARN"'\",\"maxReceiveCount\":\"5\"}"
  }'
```

### 3.2 Gửi & nhận đúng vòng Receive → xử lý → Delete (Python boto3)

```python
import boto3

sqs = boto3.client("sqs", region_name="ap-southeast-1")
QUEUE_URL = "https://sqs.ap-southeast-1.amazonaws.com/123456789012/orders"

# --- Producer ---
sqs.send_message(
    QueueUrl=QUEUE_URL,
    MessageBody='{"orderId": "A-123", "amount": 250000}',
    MessageAttributes={"eventType": {"DataType": "String", "StringValue": "OrderPlaced"}},
)

# --- Consumer: vòng lặp long-poll ---
while True:
    resp = sqs.receive_message(
        QueueUrl=QUEUE_URL,
        MaxNumberOfMessages=10,     # batch tới 10 message/lần gọi (rẻ hơn)
        WaitTimeSeconds=20,         # LONG POLLING: chờ tới 20s
        VisibilityTimeout=60,       # lease 60s cho mỗi message nhận được
    )
    for msg in resp.get("Messages", []):
        try:
            handle(msg["Body"])                 # xử lý (phải IDEMPOTENT — at-least-once!)
            sqs.delete_message(                 # DELETE = ack. Chỉ xóa khi chắc chắn xong
                QueueUrl=QUEUE_URL,
                ReceiptHandle=msg["ReceiptHandle"],
            )
        except Exception:
            # KHÔNG delete → message tự hiện lại sau visibility timeout để retry
            # Nếu task còn lâu, gia hạn lease thay vì để nó hết hạn giữa chừng:
            # sqs.change_message_visibility(QueueUrl=QUEUE_URL,
            #     ReceiptHandle=msg["ReceiptHandle"], VisibilityTimeout=120)
            pass
```

Hai điểm sinh tử: **(1)** `ReceiptHandle` — không phải message id — là "vé" để delete/gia hạn, chỉ hợp lệ cho lần receive này. **(2)** Chỉ `delete_message` **sau khi** xử lý thành công; delete trước rồi crash = **mất message**.

### 3.3 FIFO queue: MessageGroupId & dedup

```bash
aws sqs create-queue --queue-name payments.fifo \
  --attributes '{"FifoQueue":"true","ContentBasedDeduplication":"true"}'
```

```python
# Mọi event của cùng một tài khoản dùng chung MessageGroupId → xử lý TUẦN TỰ đúng thứ tự;
# các tài khoản khác nhau chạy SONG SONG.
sqs.send_message(
    QueueUrl="https://sqs.ap-southeast-1.amazonaws.com/123456789012/payments.fifo",
    MessageBody='{"acct":"U-9","op":"debit","amt":100}',
    MessageGroupId="U-9",                    # khóa thứ tự (giống partition key của Kafka)
    MessageDeduplicationId="U-9-tx-8842",    # trùng id trong 5 phút → bị bỏ, đảm bảo once
)
```

### 3.4 SNS fan-out ra nhiều SQS (Terraform, gọn & tái lập)

```hcl
resource "aws_sns_topic" "orders" { name = "order-events" }

resource "aws_sqs_queue" "email"     { name = "order-email" }
resource "aws_sqs_queue" "inventory" { name = "order-inventory" }

# Subscribe mỗi queue vào topic; raw_message_delivery = giữ nguyên body, không bọc envelope SNS
resource "aws_sns_topic_subscription" "email_sub" {
  topic_arn            = aws_sns_topic.orders.arn
  protocol             = "sqs"
  endpoint             = aws_sqs_queue.email.arn
  raw_message_delivery = true
  # Lọc: queue email chỉ nhận message có eventType = OrderPlaced
  filter_policy        = jsonencode({ eventType = ["OrderPlaced"] })
}

# BẮT BUỘC: cấp quyền cho SNS được SendMessage vào queue, nếu không message rơi vào hư không
resource "aws_sqs_queue_policy" "email_policy" {
  queue_url = aws_sqs_queue.email.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.email.arn
      Condition = { ArnEquals = { "aws:SourceArn" = aws_sns_topic.orders.arn } }
    }]
  })
}
```

```bash
# Producer chỉ cần publish MỘT lần → SNS tự sao tới mọi queue đã subscribe
aws sns publish --topic-arn arn:aws:sns:ap-southeast-1:123456789012:order-events \
  --message '{"orderId":"A-123"}' \
  --message-attributes '{"eventType":{"DataType":"String","StringValue":"OrderPlaced"}}'
```

---

## 4. Managed vs tự host Kafka/RabbitMQ — quyết định thế nào

| Tiêu chí | **SQS/SNS (managed)** | **Tự host Kafka / RabbitMQ** |
|----------|----------------------|------------------------------|
| Vận hành | AWS lo hết, không có server để trực | Bạn lo cluster, replication, nâng cấp, on-call |
| Mô hình chi phí | Pay-per-request, ~0 khi idle | Trả tiền máy chạy 24/7 dù rảnh |
| Throughput | Standard gần vô hạn; FIFO có trần | Kafka đạt hàng triệu msg/s nếu chỉnh đúng |
| Retention / replay | SQS: xóa sau khi consume (tối đa giữ 14 ngày) | Kafka: **log giữ lại**, replay tùy ý, nhiều consumer group |
| Thứ tự | Chỉ FIFO, per-MessageGroupId | Kafka: per-partition, mạnh & rẻ |
| Kích thước message | Trần **256 KB** | Cấu hình được lớn hơn |
| Đa cloud / on-prem | Khóa vào AWS | Chạy đâu cũng được |
| Tính năng stream | Không (SQS là queue thuần) | Stream processing, compaction, Kafka Streams |

**Chọn managed (SQS/SNS) khi:** bạn đã ở trên AWS; nhu cầu là **task queue / fan-out event** đơn giản; đội nhỏ, không muốn nuôi hạ tầng; tải thất thường (pay-per-use thắng lớn). Đây là **mặc định hợp lý** cho đa số dịch vụ.

**Chọn tự host (hoặc MSK — Kafka managed của AWS) khi:** cần **replay/log retention** (event sourcing, feed lại data lake); **throughput cực cao** với chi phí/đơn vị thấp; cần **stream processing** (join, window, aggregate); cần **thứ tự mạnh trên throughput lớn** (Kafka partition rẻ hơn FIFO nhiều); hoặc phải **đa cloud/on-prem** tránh khóa nhà cung cấp.

Lối giữa thực tế: nhiều hệ dùng **cả hai** — SQS/SNS cho fan-out lệnh và task nội bộ, Kafka cho luồng sự kiện cần replay và phân tích. Đừng ép một công cụ làm mọi việc.

---

## 5. Tóm tắt
- **Managed** (SQS/SNS): không server để vận hành, gọi API, trả tiền theo request — đổi lấy sự mất quyền kiểm soát và vài giới hạn cứng (256 KB, không replay tùy ý).
- **SQS Standard**: at-least-once + unordered + throughput gần vô hạn → **consumer phải idempotent**. **FIFO**: ordered per-`MessageGroupId` + exactly-once (dedup 5 phút) nhưng throughput có trần.
- **Visibility timeout** là một **lease**: message bị ẩn khi đang xử lý, **hiện lại nếu không `DeleteMessage`** kịp → chịu lỗi khi consumer crash. Đặt > p99 thời gian xử lý; gia hạn động bằng `ChangeMessageVisibility`.
- **Long polling** (`WaitTimeSeconds` ≤ 20) diệt empty receive, tiết kiệm tiền, tránh false-empty — luôn bật.
- **DLQ + `maxReceiveCount`** cô lập poison message; alarm khi DLQ > 0.
- **SNS fan-out ra nhiều SQS** là mẫu pub/sub chuẩn: một `Publish` → nhiều queue bền, mỗi consumer retry/DLQ độc lập; nhớ **queue policy** cho SNS và **filter policy** để lọc.
- **Managed vs tự host**: managed thắng khi cần đơn giản/decoupling trên AWS; Kafka thắng khi cần replay, stream, throughput cực lớn, đa cloud.

> **Bài tiếp theo:** đảm bảo tính đúng đắn đầu-cuối — **idempotency, outbox pattern & exactly-once trên thực tế** khi ghép producer, broker và consumer.
