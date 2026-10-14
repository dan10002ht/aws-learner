# Bài 13 — Decoupling: SQS, SNS, EventBridge, Kinesis, Step Functions

**Prerequisite foundations:** [[foundations-03-replication-and-quorum]], idempotency.

## 1. Mục tiêu
- Chọn đúng service decouple cho từng pattern: queue / pub-sub / event bus / stream / workflow.
- Hiểu **at-least-once** vs **exactly-once** vs **ordered**.
- Thiết kế **DLQ**, **visibility timeout**, **idempotent consumer**.
- Pattern fan-out, scatter-gather, choreography vs orchestration.

---

## 2. Tổng quan — chọn cái nào

### 2.1 Decoupling là gì, vì sao cần

Giả sử API đặt hàng gọi thẳng (HTTP, đồng bộ) sang service gửi email, service trừ kho và service tính điểm thưởng. Cách này gọi là **coupling chặt**, và nó có ba vấn đề:

- **Một service chết kéo cả chuỗi chết.** Service email treo 30 giây thì request đặt hàng cũng treo 30 giây, dù email chẳng liên quan gì tới việc ghi nhận đơn.
- **Tải dồn thẳng xuống dưới.** Flash sale đẩy 5.000 đơn/giây vào API thì service trừ kho cũng phải chịu đúng 5.000 lời gọi/giây ngay lúc đó, không có chỗ nào để "xếp hàng".
- **Thêm người nghe phải sửa người nói.** Muốn thêm service chống gian lận thì phải sửa code API đặt hàng để gọi thêm một nơi nữa.

**Decoupling** (tách rời) là chen một dịch vụ trung gian vào giữa: bên gửi (**producer**) chỉ ghi một **message** (một mẩu dữ liệu nhỏ, thường là JSON mô tả việc cần làm hoặc việc vừa xảy ra) vào trung gian rồi trả lời khách ngay; bên nhận (**consumer**) lấy message ra xử lý khi nó sẵn sàng. Kiểu giao tiếp này gọi là **bất đồng bộ (asynchronous)**: producer không chờ consumer làm xong.

Đổi lại ba thứ: consumer chết thì message nằm chờ chứ không mất; tải đột biến được trung gian **đệm lại** (buffer) để consumer xử lý theo tốc độ của mình; và thêm consumer mới không cần đụng vào producer.

Cái giá là producer không còn biết ngay kết quả, và message có thể tới **trùng** hoặc **lệch thứ tự**. Phần lớn bài này là về cách từng dịch vụ xử lý hai chuyện đó.

### 2.2 Năm kiểu trung gian

Các dịch vụ dưới đây khác nhau ở một câu hỏi: **message được giao cho ai, và giao xong thì còn hay mất?**

- **Queue (hàng đợi):** mỗi message chỉ **một** consumer xử lý, xong thì xoá. Dùng để chia việc cho một nhóm worker.
- **Pub-sub (publish–subscribe):** một message được **sao ra cho mọi bên đã đăng ký**. Dùng khi nhiều hệ thống cùng quan tâm một sự kiện.
- **Event bus:** giống pub-sub nhưng có **bộ lọc theo nội dung** đặt ở giữa, quyết định sự kiện nào đi tới đâu.
- **Stream:** message được **giữ lại theo thứ tự** trong một khoảng thời gian; nhiều bên đọc độc lập và đọc lại được.
- **Workflow:** không chỉ chuyển message mà **điều khiển cả chuỗi bước**: bước nào chạy trước, lỗi thì retry hay rẽ nhánh.

Bảng dưới là bản đồ để tra nhanh; từng dòng được giải thích ở các section sau.

| Pattern | Service |
|---------|---------|
| Queue 1 producer → 1 consumer pool | **SQS** |
| Pub-sub 1 → N subscriber | **SNS** |
| Event-driven schema + filter + schedule | **EventBridge** |
| Real-time stream replay, multiple consumer | **Kinesis Data Streams** |
| Stream → S3/Redshift/OpenSearch | **Kinesis Firehose** (tên mới: Amazon Data Firehose) |
| Workflow orchestration multi-step | **Step Functions** |
| Kafka managed | **MSK** |
| Real-time message bus IoT/chat | **IoT Core** / **AppSync** |

Hai dòng cuối chỉ cần nhận diện: **MSK** là Apache Kafka (hệ thống stream mã nguồn mở) do AWS vận hành hộ, chọn khi đề nói "đã có hệ Kafka" hoặc "cần Kafka API". **IoT Core** là message broker cho thiết bị IoT nói giao thức MQTT; **AppSync** là dịch vụ GraphQL có subscription đẩy dữ liệu real-time xuống web/mobile (chat, dashboard).

---

## 3. SQS

**SQS (Simple Queue Service)** là hàng đợi: producer gọi `SendMessage` để bỏ message vào, consumer gọi `ReceiveMessage` để lấy ra, xử lý xong thì gọi `DeleteMessage`. SQS **không tự đẩy** message tới consumer; consumer phải chủ động hỏi (gọi là **poll**). Nhiều worker cùng poll một queue thì mỗi message chỉ tới tay một worker tại một thời điểm, nên thêm worker là tăng tốc xử lý.

### 3.1 2 loại queue

**Standard queue — nhanh, nhưng có thể trùng và lệch thứ tự.** Để không mất message, SQS lưu mỗi message thành nhiều bản trên nhiều máy ở nhiều Availability Zone, và phục vụ `ReceiveMessage` từ một cụm máy lớn chạy song song. Kiến trúc phân tán đó cho thông lượng gần như không có trần, nhưng kéo theo hai hệ quả:

- **At-least-once (giao ít nhất một lần):** thỉnh thoảng một bản sao của message chưa kịp biết là message đã được nhận hoặc đã xoá, nên message được giao **thêm lần nữa**. Hiếm, nhưng chắc chắn sẽ xảy ra khi chạy đủ lâu.
- **Best-effort ordering:** SQS cố giữ thứ tự gửi nhưng không cam kết, vì các máy trả message ra độc lập với nhau.

"Thông lượng vô hạn" nghĩa là gì? AWS mô tả là *nearly unlimited* số lời gọi API mỗi giây: bạn không khai báo dung lượng, không có hạn mức mặc định phải xin nâng. Mốc so sánh: FIFO ngay bên dưới bị chặn ở 300 lời gọi/giây.

**FIFO queue — đúng thứ tự, không trùng, đổi lại chậm hơn.** FIFO (first-in-first-out) cam kết hai điều mà Standard không có:

- **Thứ tự chặt** trong từng **message group** (nhóm message cùng `MessageGroupId`, xem §3.3).
- **Exactly-once processing** nhờ khử trùng: mỗi message mang một **deduplication ID**; trong **5 phút** kể từ lần gửi đầu, message nào gửi lại với cùng ID sẽ được SQS nhận nhưng **không đưa vào queue**. Tình huống điển hình: producer gửi xong thì mạng rớt, không nhận được phản hồi nên gửi lại. Với Standard, queue có hai message; với FIFO, chỉ có một.

Vì sao FIFO bị giới hạn thông lượng? Muốn giữ thứ tự và nhớ các deduplication ID thì SQS phải xử lý message tuần tự và kiểm tra từng cái, không thể vung ra cả cụm máy như Standard. Hạn mức mặc định là **300 lời gọi API mỗi giây** cho mỗi loại thao tác (gửi, nhận, xoá). Mỗi lời gọi batch chở được tối đa 10 message, nên:

```
Không batch:  300 lời gọi/giây × 1 message   =   300 message/giây
Có batch:     300 lời gọi/giây × 10 message  = 3.000 message/giây
```

Đây là hai con số đề thi dùng. Thực tế hiện nay có **high throughput mode** cho FIFO, nâng trần lên tới 70.000 lời gọi/giây ở us-east-1 (700.000 message/giây nếu batch; các region nhỏ hơn thấp hơn, từ 2.400 lời gọi/giây), với điều kiện message trải ra nhiều message group.

| | Standard | FIFO |
|--|----------|------|
| Throughput | **Gần như không giới hạn** | 300 msg/s (3.000 với batch); high throughput mode cao hơn |
| Order | Best-effort | **Strict FIFO trong MessageGroupId** |
| Delivery | **At-least-once** (có thể trùng) | **Exactly-once** (5-min dedup window) |
| Tên | `<name>` | `<name>.fifo` (bắt buộc suffix) |
| Giá (us-east-1) | ~$0.40/triệu request | ~$0.50/triệu request |

Giá tính theo **request**, không theo message. Một message đi trọn vòng đời tốn ít nhất 3 request (gửi, nhận, xoá):

```
10 triệu đơn hàng/tháng × 3 request = 30 triệu request
30 triệu × $0,40/triệu              ≈ $12/tháng (Standard)
```

> 🪤 Bẫy thi: đề nói *"thứ tự phải đúng"* hoặc *"không được xử lý trùng"* → FIFO. Đề nói *"throughput cao nhất, thứ tự không quan trọng"* → Standard. Không đổi qua lại được giữa hai loại sau khi tạo queue; muốn đổi phải tạo queue mới.

### 3.2 Key concepts
- **Visibility Timeout** (default 30s) — consumer nhận message, message ẩn trong VT. Consumer phải `DeleteMessage` trước khi hết VT, nếu không visible lại → duplicate process. **Set > thời gian xử lý**.

  Vì sao lại "ẩn" mà không xoá luôn khi giao? Vì SQS không biết consumer có xử lý thành công hay không. Nếu worker chết giữa chừng, message hết thời gian ẩn sẽ hiện lại cho worker khác, nhờ đó không mất việc. Mặt trái là khi đặt VT ngắn hơn thời gian xử lý:

  ```
  t = 0s    Worker A nhận message, bắt đầu xử lý (cần 60s). VT = 30s.
  t = 30s   Hết VT, A chưa xong. Message hiện lại trong queue.
  t = 31s   Worker B nhận đúng message đó, bắt đầu xử lý.
  t = 60s   A xong.   t = 91s   B xong.   → khách bị trừ tiền hai lần.
  ```

  VT tối đa là 12 giờ. Việc dài và khó đoán thì dùng heartbeat ở §3.4.
- **Message Retention** — message chưa ai xoá sẽ nằm trong queue từ 1 phút → 14 ngày (default 4 ngày), quá hạn thì SQS tự xoá. Consumer sập cả cuối tuần vẫn không mất việc, miễn là sửa xong trước hạn này.
- **Long Polling** — `WaitTimeSeconds=20` giảm empty poll, giảm cost. Mặc định (short polling) `ReceiveMessage` trả về ngay kể cả khi queue rỗng, và lời gọi rỗng vẫn tính tiền. Long polling giữ kết nối tối đa 20 giây, có message là trả về liền:

  ```
  Short polling, 1 worker hỏi mỗi 100 ms, queue rỗng cả tháng:
    10 request/giây × 86.400 × 30  = 25.920.000 request  ≈ $10,37/tháng
  Long polling 20 giây:
    3 request/phút × 1.440 × 30    =    129.600 request  ≈ $0,05/tháng
  ```
- **Delay Queue** — delay tất cả message X giây (max 15 phút): message gửi vào chưa hiện ra cho consumer ngay. Dùng khi cần chờ một hệ thống khác kịp ghi xong dữ liệu.
- **Message Timer** — delay per-message (cũng tối đa 15 phút), thay vì cho cả queue.
- **DLQ (Dead Letter Queue)** — nhận message sau N lần failed (`maxReceiveCount`). **Bắt buộc** cho production. DLQ chỉ là một queue SQS thường được chỉ định làm "bãi chứa". Có những message không bao giờ xử lý được (JSON hỏng, tham chiếu tới đơn hàng không tồn tại), gọi là **poison message**: worker nhận, lỗi, message hiện lại, worker khác nhận, lại lỗi, cứ thế cho tới hết retention. Với `maxReceiveCount = 5`, sau lần nhận thứ 5 mà vẫn chưa bị xoá, SQS chuyển message sang DLQ để queue chính chạy tiếp và bạn có chỗ xem lại message lỗi.
- **Max message size** — đề thi và hầu hết tài liệu dùng **256KB**. Docs hiện tại đã nâng lên **1 MiB**. Lớn hơn nữa → lưu payload lên S3, message chỉ chứa reference (Extended Client Lib làm việc này tự động, payload tới 2 GB). SQS tính tiền theo khúc 64 KB, nên một message 1 MiB bị tính thành 16 request.

### 3.3 FIFO chi tiết

**MessageGroupId — thứ tự theo từng nhóm, không phải cả queue.** Bắt cả queue xử lý tuần tự thì chậm vô ích: đơn của khách A không cần chờ đơn của khách B. Vì vậy mỗi message FIFO bắt buộc mang một `MessageGroupId`, và SQS cam kết thứ tự **trong từng group**.

Lấy `MessageGroupId = customerId`:

```
Gửi vào:  [A: tạo đơn] [B: tạo đơn] [A: thanh toán] [B: huỷ đơn] [A: giao hàng]

Group A:  tạo đơn → thanh toán → giao hàng     (đúng thứ tự)
Group B:  tạo đơn → huỷ đơn                    (đúng thứ tự)
A và B được hai worker xử lý song song.
```

Cơ chế giữ thứ tự: khi một message của group A đang được xử lý (đã giao, chưa xoá), SQS **không giao message nào khác của group A** cho bất kỳ worker nào. Từ đó suy ra giới hạn theo group: trong một group, tốc độ bằng đúng tốc độ xử lý tuần tự từng message. Nếu mỗi message mất 200 ms thì group đó chạy tối đa 5 message/giây, bất kể có bao nhiêu worker.

Vậy "scale bằng nhiều groups" nghĩa là chọn group ID đủ mịn. Dùng một group ID chung cho cả queue thì cả hệ thống thành một làn duy nhất. Dùng `customerId` thì 10.000 khách là 10.000 làn chạy song song, mà thứ tự của từng khách vẫn đúng.

**Hai cách khử trùng** (cả hai đều trong cửa sổ 5 phút):
- **MessageDeduplicationId**: producer tự đặt, ví dụ `orderId`. Gửi lại cùng ID trong 5 phút thì bị bỏ.
- **Content-based dedup**: bật trên queue, SQS tự lấy mã băm SHA-256 của nội dung message làm ID. Tiện, nhưng hai message hợp lệ có nội dung giống hệt nhau gửi cách nhau dưới 5 phút sẽ bị coi là trùng.

> 🪤 Exactly-once của FIFO chỉ bao phần **gửi vào queue** trong 5 phút. Consumer nhận message, xử lý xong nhưng chết trước khi `DeleteMessage` thì message vẫn hiện lại sau visibility timeout. Consumer vẫn nên idempotent (§3.4).

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

**Idempotent** nghĩa là xử lý cùng một message hai lần cho ra kết quả giống xử lý một lần. Cách phổ biến là ghi lại ID đã xử lý, gặp lại thì bỏ qua.

#### Visibility timeout tăng động
```python
sqs.change_message_visibility(
    QueueUrl=q, ReceiptHandle=h, VisibilityTimeout=300)
```

Worker đang xử lý dở gọi lệnh này định kỳ để gia hạn thời gian ẩn, gọi là **heartbeat**. Hợp với việc khó đoán thời lượng: đặt VT vừa phải, còn sống thì còn gia hạn, worker chết thì message hiện lại sớm thay vì kẹt hàng giờ.

---

## 4. SNS

### 4.1 Đặc điểm

**SNS (Simple Notification Service)** là pub-sub: producer **publish** message vào một **topic**; mọi **subscription** của topic đó đều nhận một bản sao. Khác SQS ở hai điểm gốc: SNS **đẩy** message đi ngay (push) chứ không chờ ai poll, và SNS **không lưu** message. Subscriber nào không nhận được sau các lần retry thì message đó mất với subscriber ấy, trừ khi có DLQ.

- **Pub-sub fan-out** 1 → N. Một topic Standard có thể có tới 12,5 triệu subscription.
- Targets: SQS, Lambda, HTTP/S, email, SMS, Mobile push, Kinesis Firehose.
- **Filter Policy** per subscription — chỉ deliver message match điều kiện. Mặc định mọi subscription nhận mọi message. Filter policy là một đoạn JSON gắn vào subscription, ví dụ `{"event_type": ["order_cancelled"]}`: SNS so với message attribute (hoặc với body nếu cấu hình) và chỉ giao message khớp. Service hoàn tiền nhờ vậy không phải nhận rồi tự vứt 95% message không liên quan.
- **Standard** (best-effort order, at-least-once) + **FIFO** (ordered, khử trùng như SQS FIFO). Topic FIFO **chỉ giao được tới SQS queue** (FIFO hoặc Standard), không giao tới HTTP/S, email, SMS hay Lambda trực tiếp, và tối đa 100 subscription mỗi topic.
- **Message size** 256KB theo mặc định và theo đề thi; hiện có thể cấu hình topic lên 1 MiB.
- **Retry và DLQ theo từng subscription**: giao thất bại (HTTP endpoint trả lỗi) thì SNS retry theo delivery policy. Hết retry mà subscription có gắn DLQ (một SQS queue) thì message vào đó, không thì mất.

### 4.2 Fan-out pattern
```
Producer → SNS topic ─┬─→ SQS-A (worker A)
                      ├─→ SQS-B (worker B)
                      └─→ Lambda (audit log)
```

→ 1 publish, N consumer độc lập. Mỗi consumer có DLQ riêng.

Vì sao chen SQS vào giữa thay vì cho SNS gọi thẳng worker? Vì SNS không lưu message. Đặt một queue trước mỗi worker thì worker chậm hay sập, message nằm chờ trong queue của riêng nó (tới 14 ngày), các worker còn lại không bị ảnh hưởng.

### 4.3 SNS + SQS vs EventBridge

(Nếu chưa biết EventBridge, đọc §5 trước rồi quay lại bảng này.)

Cả hai đều giao một sự kiện tới nhiều nơi. Khác biệt gốc: **SNS là ống phát nhanh và đơn giản**, mỗi topic là một kênh và bộ lọc chỉ là điều kiện gắn trên từng subscription. **EventBridge là bộ định tuyến**: mọi sự kiện đổ vào một bus chung, rule soi vào nội dung JSON để quyết định đích, kèm các tính năng quản trị (schema, archive, lịch, nhận sự kiện từ dịch vụ AWS và SaaS). Nhiều tính năng hơn thì thông lượng mặc định thấp hơn và giá mỗi sự kiện cao hơn.

| | SNS+SQS | EventBridge |
|--|---------|-------------|
| Throughput mặc định (us-east-1, xin nâng được) | 30.000 message/giây publish vào SNS; SQS Standard phía sau gần như không giới hạn | 10.000 lời gọi `PutEvents`/giây (mỗi lời gọi tối đa 10 event); region nhỏ chỉ 400–2.400 |
| Schema | Không enforce | Có Schema Registry |
| Filter | Filter policy trên từng subscription (theo attribute hoặc body) | Event pattern soi mọi field của JSON: prefix, số, exists, anything-but |
| Số đích | Tới 12,5 triệu subscription/topic | 5 target/rule, 300 rule/bus |
| Schedule | Không | **Có** (cron, rate) |
| Cost (us-east-1) | ~$0.50/triệu publish; giao tới SQS/Lambda không tính thêm | $1/triệu custom event; event từ dịch vụ AWS miễn phí |
| Cross-account | SNS qua policy | Native event bus |
| Replay | Không (topic Standard) | **Archive + Replay** |
| Nguồn sự kiện | App của bạn tự publish | App của bạn, **hơn 200 dịch vụ AWS tự phát**, SaaS partner |
| Use case | High-throughput fan-out, app-to-app | Event-driven choreography, SaaS integration |

Tính thử với 100 triệu sự kiện/tháng:

```
SNS:          100 triệu × $0,50/triệu = $50/tháng
EventBridge:  100 triệu × $1,00/triệu = $100/tháng
```

> 🪤 Bẫy thi: *"fan-out throughput rất cao, đơn giản"* → SNS + SQS. *"phản ứng với sự kiện của dịch vụ AWS"* (EC2 đổi trạng thái, GuardDuty finding), *"lọc theo nội dung event"*, *"tích hợp SaaS"*, *"chạy theo lịch"* → EventBridge.

---

## 5. EventBridge

### 5.1 Components

**Event trông thế nào.** Một event là một JSON mô tả **việc vừa xảy ra**. Mọi event trong EventBridge có chung phần vỏ, còn `detail` là nội dung riêng của từng loại:

```json
{
  "id": "6a7e8feb-b491-4cf7-a9f1-bf3703467718",
  "source": "aws.ec2",
  "detail-type": "EC2 Instance State-change Notification",
  "account": "111122223333",
  "region": "us-east-1",
  "time": "2026-03-01T08:15:00Z",
  "detail": { "instance-id": "i-0abc1234", "state": "stopped" }
}
```

Khi một EC2 instance dừng, AWS tự phát event này; không ai phải viết code. Ứng dụng của bạn cũng phát event riêng bằng API `PutEvents`, ví dụ `"source": "shop.orders"`, `"detail-type": "OrderPlaced"`.

Đường đi của một event: **nguồn** phát vào **event bus**, các **rule** trên bus soi event, rule nào khớp thì giao event tới **target** của nó.

- **Event Bus**: nơi event đổ về. Có ba loại. **Default** bus có sẵn trong mỗi account, nhận event từ các dịch vụ AWS. **Custom** bus do bạn tạo cho event của ứng dụng mình. **Partner** bus nhận event từ SaaS (Datadog, Zendesk) mà không cần dựng webhook.
- **Rule**: một **event pattern** (điều kiện lọc, xem §5.2) kèm 1-5 targets. Một event có thể khớp nhiều rule, mỗi rule giao một bản.
- **Target**: Lambda, SQS, SNS, Step Functions, ECS task, Kinesis, API destination (HTTPS), cross-account event bus... **API destination** là một HTTP endpoint bên ngoài AWS; EventBridge lo phần xác thực và giới hạn tốc độ gọi.
- **Schema Registry**: **schema** là bản mô tả một loại event có những field nào, kiểu gì. Bật *schema discovery* thì EventBridge quan sát event đi qua bus và tự suy ra schema. Từ schema, bạn tải về **code binding**: class Java/Python/TypeScript sinh sẵn, để consumer dùng `event.detail.orderId` có kiểm tra kiểu thay vì dò key trong JSON. Lợi ích chính là team nhận event biết đúng hình dạng dữ liệu mà không phải hỏi team phát.
- **Archive + Replay**: bus bình thường không lưu event, giao xong là hết. Archive ghi lại event (tất cả hoặc theo pattern) trong số ngày bạn chọn, mặc định là vô thời hạn. Replay phát lại event của một khoảng thời gian vào chính bus đó, để chạy lại sau khi sửa bug ở consumer hoặc để test tính năng mới bằng dữ liệu thật. Replay không đảm bảo đúng thứ tự gốc.
- **Scheduler** (mới 2022): cron/rate trigger target — replace CloudWatch Events Scheduled. Hỗ trợ timezone, lịch chạy một lần, retry và DLQ.

**Độ tin cậy:** EventBridge giao at-least-once. Target lỗi thì retry với backoff tới 24 giờ; hết retry thì event vào DLQ của target nếu có cấu hình, không thì mất.

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

Cách đọc: các field khác nhau nối bằng **AND**, các giá trị trong cùng một mảng nối bằng **OR**. Pattern trên khớp event có `source` là `aws.ec2` **và** đúng `detail-type` đó **và** `state` là `running` **hoặc** `stopped`. Event mẫu ở §5.1 (`state: stopped`) khớp; event `state: pending` thì không. Field không nhắc tới trong pattern thì nhận giá trị nào cũng được.

### 5.3 Use cases
- React to AWS service events (EC2 state change, S3 object created, RDS event). Ví dụ: instance production bị stop thì rule gọi Lambda báo Slack.
- Cross-account event routing (security account aggregate findings): rule ở từng account thành viên có target là event bus của account security, nơi mọi GuardDuty finding được gom về một chỗ.
- Schedule task (replace CloudWatch Events cron).
- SaaS integration (PagerDuty alert → Lambda).

### 5.4 EventBridge Pipes (2022)

Event bus dành cho định tuyến nhiều-nhiều. **Pipes** dành cho nối **một nguồn với một đích**, việc mà trước đây phải viết một Lambda "keo dán" chỉ để đọc từ nguồn rồi ghi sang đích.

- Connect source → enrichment → target không cần Lambda glue code.
- Source: SQS, Kinesis, DDB Streams, MSK... Pipes tự poll nguồn hộ bạn.
- **Filter** (tuỳ chọn): chỉ cho event khớp pattern đi tiếp, và chỉ tính tiền event khớp.
- **Enrichment** (tuỳ chọn) là bước **bổ sung dữ liệu** cho event trước khi giao. Message trong SQS thường chỉ có `orderId`; bước enrichment gọi một Lambda, Step Functions, API Gateway hoặc API destination để lấy thêm tên khách và địa chỉ giao hàng, rồi gắn vào event.
- Target: Step Functions, Lambda, SNS, SQS, API destination...

Ví dụ: queue `order-received` → enrichment gọi API khách hàng lấy địa chỉ → target là state machine xử lý đơn.

---

## 6. Kinesis

### 6.1 4 variants

**Stream khác queue ở đâu.** Ở SQS, consumer xử lý xong thì **xoá** message, không ai đọc lại được. Một stream là một **log chỉ ghi nối đuôi** (append-only): **record** (một mẩu dữ liệu, ví dụ một cú click hay một dòng log) được ghi vào cuối và **nằm yên ở đó** theo đúng thứ tự cho tới khi hết hạn lưu. Đọc không làm mất dữ liệu; mỗi consumer chỉ tự nhớ mình đã đọc tới đâu. Từ một đặc điểm đó suy ra **nhiều consumer đọc độc lập** và **replay** (đọc lại từ một điểm cũ).

Họ Kinesis có bốn dịch vụ làm bốn việc khác nhau:

- **Kinesis Data Streams** *giữ* dữ liệu streaming để nhiều ứng dụng đọc real-time. Chi tiết ở §6.2.
- **Firehose** (tên mới: Amazon Data Firehose) *giao* dữ liệu vào kho. Nó không lưu, không có consumer: nhận record, gom thành lô, tự ghi vào S3, Redshift, OpenSearch hoặc Splunk. Bạn không viết code đọc và không tính shard. Vì phải gom lô nên chỉ là **near-real-time**: xả khi bộ đệm đủ dung lượng hoặc đủ thời gian, cái nào tới trước (với S3 mặc định 5 MB hoặc 300 giây; chỉnh được 1–128 MB và 0–900 giây). Đề thi coi độ trễ Firehose là khoảng 60 giây trở lên.
- **Managed Service for Apache Flink** (tên cũ: *Kinesis Data Analytics*, đề thi dùng cả hai) *tính toán* trên dữ liệu đang chảy, ví dụ "đếm số đơn trong từng cửa sổ 1 phút". AWS vận hành cụm Flink, bạn nộp code SQL/Java/Python.
- **Kinesis Video Streams** nhận và lưu luồng **video/audio** từ camera, thiết bị để phát lại hoặc đưa vào phân tích hình ảnh (Rekognition). Không dùng cho dữ liệu dạng record.

| | Data Streams | Firehose | Managed Service for Apache Flink (cũ: Data Analytics) | Video Streams |
|--|--------------|----------|----------------|---------------|
| Mục đích | Real-time stream | Near-real-time → S3/RS/OS | SQL/Apache Flink trên stream | Video ingest |
| Latency | Dưới 1 giây (~200 ms) | Vài giây → vài phút do gom lô (đề thi: ~60s) | Dưới giây → vài giây, theo cửa sổ tính | Thấp, đủ để xem trực tiếp |
| Storage | 1-365 ngày | None (pass-through) | None (chỉ giữ trạng thái tính toán) | Configurable |
| Replay | ✅ | ❌ | Phụ thuộc nguồn nó đọc | ✅ |
| Pricing | Shard-hour + PUT (hoặc theo GB ở on-demand) | Per GB ingested | Per KPU (đơn vị CPU + bộ nhớ của cụm Flink, tính theo giờ) | Per GB |

### 6.2 Data Streams chi tiết

**Shard — đơn vị thông lượng.** Một stream gồm nhiều **shard**; mỗi shard là một làn log riêng có hạn mức cố định:

- **Shard**: 1 MB/s in, 2 MB/s out, 1000 records/s in per shard. Chiều ghi chạm giới hạn nào trước (MB hay số record) thì bị chặn ở giới hạn đó.

Tổng thông lượng của stream bằng số shard nhân hạn mức trên, nên muốn nhiều hơn thì thêm shard. Tính số shard phải tính theo **cả hai** giới hạn rồi lấy số lớn hơn:

```
Tải: 5.000 record/giây, mỗi record 2 KB
  Dung lượng: 5.000 × 2 KB = 10 MB/giây
  Theo dung lượng:  10 MB/s ÷ 1 MB/s          = 10 shard
  Theo số record:   5.000 ÷ 1.000 record/s    =  5 shard
  → cần 10 shard

Tải: 100.000 record/giây, mỗi record 200 byte
  Dung lượng: 100.000 × 200 byte = 20 MB/giây  → 20 shard
  Theo số record: 100.000 ÷ 1.000              → 100 shard
  → cần 100 shard (record nhỏ thì giới hạn số record chạm trước)
```

Chiều ngược lại, câu tự kiểm tra số 8: stream 4 shard nhận tối đa 4 × 1 MB/s = 4 MB/s **và** 4 × 1.000 = 4.000 record/giây; đọc ra tối đa 4 × 2 MB/s = 8 MB/s.

Không muốn tự tính thì chọn chế độ **on-demand**: AWS tự thêm bớt shard theo tải và tính tiền theo GB; stream mới có sẵn 4 MB/s ghi. Chế độ **provisioned** (tự chọn số shard, trả theo shard-giờ) rẻ hơn khi tải đều và đoán trước được.

- **Partition Key** → hash → shard. Mỗi record gửi kèm một partition key (ví dụ `user_id`). Kinesis băm key ra một con số, mỗi shard phụ trách một khoảng số, nên **cùng key luôn vào cùng shard**. Hệ quả thứ nhất: thứ tự được đảm bảo theo từng key, không phải toàn stream. Hệ quả thứ hai: nếu 90% record dùng chung một key thì một shard quá tải trong khi các shard khác rảnh, gọi là **hot shard**. Chọn key có nhiều giá trị và phân bố đều.
- **Sequence Number** ordered trong shard: Kinesis gán cho mỗi record một số tăng dần trong shard của nó. Consumer lưu lại số của record cuối cùng đã xử lý (gọi là **checkpoint**) để lần sau đọc tiếp từ đó. Replay chính là đặt checkpoint lùi về một điểm cũ.
- **Consumer**: có hai cách đọc.
  - **Shared (classic)**: tất cả consumer share 2 MB/s/shard. Consumer tự **kéo** (pull) bằng API `GetRecords`, mỗi shard chỉ cho 5 lời gọi/giây tính chung mọi consumer.
  - **Enhanced Fan-out (EFO)**: mỗi consumer 2 MB/s/shard dedicated, push-based. **Push** nghĩa là consumer mở một kết nối giữ lâu và Kinesis tự đẩy record xuống ngay khi có, không phải hỏi theo chu kỳ, nên độ trễ giảm từ ~200 ms xuống ~70 ms. EFO tính phí thêm theo consumer và theo GB.

  ```
  1 shard, 3 consumer:
    Shared:  2 MB/s ÷ 3   ≈ 0,67 MB/s mỗi consumer, càng thêm consumer càng chậm
    EFO:     2 MB/s × 3   = 6 MB/s tổng, mỗi consumer vẫn đủ 2 MB/s
  ```

  Quy tắc nhớ: 1–2 consumer thì shared là đủ; từ 3 consumer trở lên hoặc cần độ trễ thấp thì EFO. Tối đa 20 consumer EFO mỗi stream.
- **Retention**: 24h default, max 365 ngày (lưu lâu hơn 24 giờ tính thêm tiền). Đây là giới hạn của replay: chỉ đọc lại được dữ liệu còn trong hạn lưu.
- **Record size**: đề thi dùng tối đa **1 MB/record**; docs hiện tại cho tới 10 MiB, nhưng hạn mức ghi của shard vẫn là 1 MB/s.

**Bạn phải tự dựng phần đọc.** Data Streams chỉ giữ dữ liệu. Consumer có thể là Lambda (gắn stream làm event source), ứng dụng dùng thư viện **KCL** (Kinesis Client Library, lo chia shard giữa các worker và lưu checkpoint vào DynamoDB), job Flink, hoặc Firehose gắn vào stream để đổ ra S3.

### 6.3 Kinesis vs SQS vs Kafka

Mọi dòng trong bảng dưới đều suy ra từ một khác biệt: **SQS là queue, giao xong thì xoá; Kinesis và Kafka là log, giữ lại và để mỗi consumer tự nhớ vị trí đọc.**

- Vì SQS xoá message sau khi xử lý nên không có gì để **replay**, và hai ứng dụng cùng poll một queue sẽ **giành nhau** message chứ không ai nhận đủ. Muốn nhiều ứng dụng cùng nhận thì phải fan-out SNS ra nhiều queue (§4.2).
- Vì log không xoá khi đọc nên team fraud và team analytics đọc cùng một stream, mỗi bên một checkpoint, không ảnh hưởng nhau. Sửa bug xong thì lùi checkpoint để chạy lại.
- Đổi lại, log phải chia làn (shard/partition) để giữ thứ tự, nên thông lượng bị tính theo số làn. SQS Standard không giữ thứ tự nên không cần khai báo dung lượng.

| | Kinesis Streams | SQS | Kafka (MSK) |
|--|-----------------|-----|-------------|
| Mô hình | Log, đọc không xoá | Queue, xử lý xong xoá | Log, đọc không xoá |
| Order | Per shard | Per FIFO group | Per partition |
| Replay | ✅ trong retention (tới 365 ngày) | ❌ đã xoá là hết | ✅ trong retention do bạn cấu hình |
| Multiple consumer | ✅ mỗi consumer một checkpoint | ❌ (1 consumer pool, các worker chia nhau message) | ✅ mỗi consumer group một offset |
| Throughput | Shard-based: 1 MB/s ghi mỗi shard | Gần như không giới hạn với Standard | Partition-based, phụ thuộc cỡ và số broker |
| Latency | Dưới 1 giây (~200 ms; ~70 ms với EFO) | Thường vài chục ms | Thường vài ms tới vài chục ms, tuỳ cấu hình cụm |
| Managed level | Full: chỉ chọn số shard hoặc on-demand | Full: không có gì để chọn dung lượng | AWS chạy cụm; bạn vẫn chọn số broker, loại máy, số partition (hoặc dùng MSK Serverless) |

Thuật ngữ Kafka tương ứng: **partition** giống shard, **offset** giống sequence number, **broker** là một máy chủ trong cụm Kafka.

> 🪤 Bẫy thi: *"mỗi message một worker xử lý, xong thì thôi"* → SQS. *"nhiều ứng dụng đọc cùng dữ liệu"*, *"replay"*, *"thứ tự theo key ở thông lượng lớn"* → Kinesis Data Streams. *"đang dùng Kafka, muốn chuyển lên AWS ít sửa code nhất"* → MSK.

---

## 7. Step Functions

**Step Functions** chạy một **state machine** (máy trạng thái): bản mô tả một quy trình dưới dạng các **state** (bước) và mũi tên nối giữa chúng, cho biết xong bước này thì sang bước nào, lỗi thì đi đâu. Bạn viết bản mô tả bằng JSON theo **Amazon States Language (ASL)**; Step Functions lo phần chạy: gọi từng bước, chuyền output của bước trước làm input bước sau, nhớ quy trình đang ở đâu, retry khi lỗi. Mỗi lần chạy một state machine gọi là một **execution**.

```json
{
  "StartAt": "ChargePayment",
  "States": {
    "ChargePayment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:111122223333:function:charge",
      "Retry": [{ "ErrorEquals": ["States.Timeout"], "IntervalSeconds": 2, "BackoffRate": 2, "MaxAttempts": 3 }],
      "Catch": [{ "ErrorEquals": ["States.ALL"], "Next": "CancelOrder" }],
      "Next": "ShipOrder"
    },
    "ShipOrder":   { "Type": "Task", "Resource": "arn:aws:lambda:us-east-1:111122223333:function:ship", "End": true },
    "CancelOrder": { "Type": "Task", "Resource": "arn:aws:lambda:us-east-1:111122223333:function:cancel", "End": true }
  }
}
```

Nó giải bài toán gì? Không có nó, bạn để Lambda A gọi Lambda B gọi Lambda C: logic "bước nào tiếp theo, lỗi thì retry mấy lần" nằm rải trong code từng hàm, Lambda A phải chạy (và tính tiền) suốt lúc chờ B và C, và khi hỏng giữa chừng không ai biết quy trình dừng ở đâu.

### 7.1 Standard vs Express

Hai loại workflow khác nhau ở một điểm gốc: **Standard ghi trạng thái xuống đĩa sau mỗi lần chuyển bước, Express thì không.**

- **Standard** lưu bền từng bước, nên một execution có thể chạy tới **1 năm** (kể cả đứng chờ ở state Wait hay chờ người duyệt), sống sót qua sự cố hạ tầng, và mỗi bước được chạy **đúng một lần** (exactly-once) trừ khi chính bạn khai báo Retry. Toàn bộ lịch sử từng bước xem được trên console và qua API tới 90 ngày sau khi execution kết thúc. Giá tính theo số **state transition** (lần chuyển bước).
- **Express** giữ trạng thái trong bộ nhớ, nên nhanh và rẻ khi chạy hàng loạt, nhưng mỗi execution tối đa **5 phút** và không có lịch sử lưu sẵn; muốn xem phải bật ghi ra CloudWatch Logs. Express có hai cách gọi: **asynchronous** (gọi xong trả về ngay, không chờ kết quả) là at-least-once, tức một execution có thể chạy lại nên các bước phải idempotent; **synchronous** (chờ chạy xong rồi trả kết quả, dùng sau API Gateway) là at-most-once, lỗi thì không tự chạy lại.

| | Standard | Express |
|--|----------|---------|
| Max duration | **1 năm** | 5 phút |
| Execution model | **Exactly-once** | Async: at-least-once. Sync: at-most-once |
| History | Full execution history (90 ngày) | CloudWatch Logs only |
| Pricing (us-east-1) | $25/M transitions ($0.025 mỗi 1.000) | $1/M req + $0.06/GB-giờ (≈ $0.00001667/GB-giây) |
| Use case | Long workflow, audit, bước không idempotent (thanh toán) | High-volume, IoT, streaming |

Tính thử 1 triệu execution/tháng, mỗi execution 5 transition, chạy 3 giây, dùng 64 MB bộ nhớ:

```
Standard:  1.000.000 × 5 transition = 5 triệu transition × $25/triệu  = $125

Express:   request:   1 triệu × $1/triệu                              = $1,00
           duration:  1.000.000 × 3 giây × 0,0625 GB = 187.500 GB-giây
                      187.500 × $0,00001667                           ≈ $3,13
           tổng                                                       ≈ $4,13
```

Chênh khoảng 30 lần ở khối lượng lớn. Vì vậy quy trình ngắn chạy hàng triệu lần chọn Express, còn quy trình dài, ít lần chạy, cần truy vết thì chọn Standard.

> 🪤 Loại workflow **không đổi được** sau khi tạo state machine. Đề cho quy trình *"chờ phê duyệt vài ngày"* hoặc *"6 tháng"* thì chỉ có Standard, dù khối lượng lớn.

### 7.2 States
- **Task** — làm một việc: invoke Lambda/ECS/SNS/SQS/DDB/... Step Functions gọi thẳng được nhiều dịch vụ AWS mà không cần Lambda trung gian.
- **Choice** — branching theo dữ liệu, ví dụ `amount > 1000` thì sang bước duyệt tay.
- **Parallel** — run branches concurrent, chờ tất cả các nhánh xong rồi mới đi tiếp.
- **Map** — iterate over array: chạy cùng một chuỗi bước cho từng phần tử, ví dụ xử lý từng file trong danh sách.
- **Wait** — delay một khoảng thời gian hoặc tới một thời điểm. Standard không tính tiền thời gian chờ, chỉ tính transition.
- **Pass** — pass-through: chuyền hoặc sửa dữ liệu mà không gọi gì, hay dùng khi test.
- **Succeed / Fail** — kết thúc execution với trạng thái thành công hoặc thất bại.

### 7.3 Error handling
- **Retry** with `IntervalSeconds`, `BackoffRate`, `MaxAttempts`. Trong ví dụ đầu §7: lần thử lại đầu sau 2 giây, mỗi lần sau nhân đôi (2, 4, 8 giây), tối đa 3 lần.
- **Catch** specific error → fallback state. Hết retry mà vẫn lỗi thì Catch chuyển execution sang một state khác (ở ví dụ là `CancelOrder`) thay vì để cả execution thất bại.
- Built-in error: `States.ALL` (khớp mọi lỗi), `States.Timeout` (bước chạy quá thời hạn), `Lambda.ServiceException`...

### 7.4 Orchestration vs Choreography

Có hai cách phối hợp nhiều service trong một quy trình nghiệp vụ.

**Orchestration (có nhạc trưởng):** một bộ điều phối trung tâm, ở đây là state machine, ra lệnh cho từng service theo thứ tự: gọi Inventory, chờ kết quả, gọi Payment, chờ kết quả, gọi Shipping. Toàn bộ quy trình nằm ở **một chỗ**, nhìn state machine là biết đơn hàng đang ở bước nào và hỏng ở đâu.

**Choreography (không có nhạc trưởng):** không ai ra lệnh. Order service phát event `OrderPlaced` lên EventBridge; Inventory nghe thấy thì trừ kho rồi phát `InventoryReserved`; Payment nghe event đó thì trừ tiền rồi phát `PaymentCharged`. Mỗi service chỉ biết event mình nghe và event mình phát. Quy trình tổng thể **không được viết ra ở đâu cả**; nó là kết quả của các phản ứng nối nhau.

| | Orchestration (Step Functions) | Choreography (EventBridge) |
|--|---------------------------------|-----------------------------|
| Control | Tập trung: state machine quyết định bước tiếp theo | Phân tán: mỗi service tự quyết khi nghe event |
| Visibility | Cao: console vẽ từng execution đang ở state nào | Thấp: phải ghép log của nhiều service mới lần ra một đơn hàng |
| Coupling | Chặt hơn: thêm hoặc đổi bước phải sửa state machine | Lỏng: thêm service mới chỉ cần thêm rule, không sửa ai |
| Testing | Dễ hơn: chạy một execution và xem kết quả từng bước | Khó hơn: phải dựng đủ các service để thấy chuỗi phản ứng |
| Xử lý lỗi / rollback | Khai báo Retry, Catch tại một chỗ | Mỗi service tự lo, phải phát thêm event bù trừ |
| Use case | Saga, transactional, quy trình có thứ tự chặt | Microservices, event-driven, nhiều team độc lập |

> 🪤 Bẫy thi: *"cần theo dõi trạng thái từng bước, retry, rollback"* → Step Functions. *"các service độc lập, thêm consumer mới không ảnh hưởng hệ thống hiện có"* → EventBridge. Hai cách hay đi cùng nhau: choreography giữa các domain, orchestration bên trong một domain.

---

## 8. Patterns thường gặp

### 8.1 Fan-out với SNS+SQS
```
S3 ObjectCreated → SNS → ┬→ SQS-thumbnail → Lambda resize
                          ├→ SQS-virus-scan → Lambda scan
                          └→ SQS-index → Lambda Elasticsearch
```

Một file upload kích hoạt ba việc độc lập. Mỗi việc có queue riêng nên Lambda scan chậm không làm chậm resize, và mỗi queue có DLQ riêng.

### 8.2 Saga pattern với Step Functions
```
[OrderPlaced] → ReserveInventory → ChargePayment → ShipOrder
                       ↓ fail                ↓ fail
                  CancelOrder           RefundPayment
```

Đặt hàng đụng tới ba service, mỗi service một database riêng, nên không có một transaction chung để rollback tất cả. **Saga** thay transaction lớn bằng chuỗi bước nhỏ, mỗi bước kèm một **compensating action** (hành động bù trừ) để huỷ tác dụng của nó: đã trừ kho thì trả kho, đã trừ tiền thì hoàn tiền. Bước nào lỗi thì chạy bù trừ của các bước đã xong, theo thứ tự ngược. Trong Step Functions, phần bù trừ là các state mà `Catch` trỏ tới.

### 8.3 ETL stream với Firehose
```
App → Kinesis Data Stream → Firehose → S3 Parquet → Athena
                              ↓
                           Lambda transform
```

Data Stream giữ dữ liệu cho các consumer real-time. Firehose gắn vào chính stream đó, cho từng lô đi qua Lambda để lọc hoặc đổi định dạng, chuyển sang **Parquet** (định dạng lưu theo cột, query rẻ hơn JSON) rồi ghi S3 để Athena query bằng SQL.

### 8.4 Outbox pattern (CDC)

**Bài toán dual-write.** Service Order cần làm hai việc: ghi đơn hàng vào database **và** phát event `OrderPlaced` cho các service khác. Đây là hai lời gọi tới hai hệ thống khác nhau, không nằm chung một transaction:

```
1. Ghi DB thành công
2. Gọi PutEvents → process chết đúng lúc này
→ Đơn hàng có trong DB nhưng không ai biết: kho không trừ, email không gửi.
```

Đảo thứ tự cũng hỏng theo kiểu ngược lại: event phát rồi mà ghi DB lỗi, các service khác xử lý một đơn không tồn tại.

**Cách giải.** Chỉ ghi vào **một nơi** là database, rồi để một cơ chế khác đọc thay đổi của database mà phát event. Cơ chế đó gọi là **CDC (change data capture)**: bắt từng thay đổi insert/update/delete của database thành một dòng sự kiện. Với DynamoDB, CDC có sẵn là **DynamoDB Streams**, một log ghi lại mọi thay đổi của bảng theo thứ tự, giữ 24 giờ.

```
DDB Streams → Lambda → EventBridge → consumer services
```

→ Việc ghi DB là atomic (ghi được hoặc không, không có trạng thái nửa vời). Event được phát **sau đó một nhịp** nhưng **chắc chắn được phát**: Lambda đọc stream lỗi thì retry cho tới khi thành công, nên không có đơn hàng nào bị bỏ sót. Các service khác thấy đơn hàng trễ vài trăm mili giây tới vài giây, tức **eventually consistent**. Hai từ này mô tả hai chặng khác nhau, không mâu thuẫn: atomic là chặng ghi DB, eventually consistent là chặng lan event ra ngoài.

Tên "outbox" đến từ bản gốc dùng database quan hệ: trong cùng một transaction, ghi đơn hàng vào bảng `orders` và ghi event vào bảng `outbox`; một tiến trình riêng đọc bảng `outbox` rồi publish. Với DynamoDB, stream đóng vai bảng outbox. Vì Lambda có thể retry nên event có thể phát trùng; consumer vẫn phải idempotent.

---

## 9. Tự kiểm tra

1. App publish 50k msg/s, cần fan-out 3 consumer độc lập. Service?
   <details><summary>Đáp án</summary>**SNS + 3 SQS subscribers**. Hoặc **EventBridge** nếu cần filter + schema + cross-account. Lưu ý quota mặc định: SNS ở us-east-1 là 30.000 message/giây, EventBridge là 10.000 lời gọi PutEvents/giây; 50k/giây phải xin nâng quota ở cả hai, và SNS rẻ hơn một nửa.</details>

2. Order processing cần strict ordering per customer. SQS loại?
   <details><summary>Đáp án</summary>**SQS FIFO** với `MessageGroupId = customerId`. Order across customer parallel.</details>

3. Workflow: process payment có 5 step, mỗi step có thể fail và cần rollback. Pattern?
   <details><summary>Đáp án</summary>**Step Functions** với Saga pattern — mỗi step có compensating action trong Catch.</details>

4. Stream click event 100k/s từ web, cần lưu vào S3 mỗi phút + analytics real-time. Service?
   <details><summary>Đáp án</summary>**Kinesis Data Stream** (real-time) + **Firehose** (batch to S3) + **Managed Service for Apache Flink** (tên cũ Kinesis Data Analytics; real-time SQL). Hoặc chỉ Firehose nếu không cần real-time analytics. Với 100k record/giây, provisioned cần ít nhất 100 shard (100.000 ÷ 1.000 record/s), hoặc dùng on-demand.</details>

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
| Managed Service for Apache Flink (cũ: Kinesis Data Analytics) | **Dataflow** (Apache Beam) |
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
- **DLQ** monitor (CloudWatch alarm `ApproximateNumberOfMessagesVisible` > 0).
- **Visibility timeout dynamic** với heartbeat cho long task.
- **Long polling** mặc định (`WaitTimeSeconds=20`).
- **Schema Registry** (EventBridge) cho cross-team contract.
- **Step Functions** thay Lambda chain (Lambda gọi Lambda) khi workflow > 3 step.
- **Outbox pattern** với DDB Streams cho microservice CDC.

### Anti-pattern
- ❌ Lambda gọi Lambda gọi Lambda → dùng Step Functions.
- ❌ SQS không DLQ → message poison loop cho tới hết retention, chặn worker xử lý việc khác.
- ❌ Visibility timeout < processing time → duplicate.
- ❌ Non-idempotent consumer → corrupt state khi retry.
- ❌ SNS subscription HTTP không có DLQ.
- ❌ Kinesis 1 shard cho 100k records/s → throttle, vì 1 shard chỉ nhận 1.000 record/giây. Tăng lên ~100 shard, dùng on-demand, hoặc dùng Firehose nếu chỉ cần đổ vào kho.

## 13. Foundations
- **At-least-once + idempotency** là chủ đề của replication. Đọc [[foundations-03-replication-and-quorum]] nếu chưa.
- **Exactly-once là illusion** — FIFO chỉ exactly-once trong 5-min dedup window, không phải end-to-end.

## 14. Flashcard

- **SQS Standard** — TPS gần như không giới hạn, at-least-once, best-effort order.
- **SQS FIFO** — 300/s (3000 batch), exactly-once 5min dedup, MessageGroupId order.
- **Visibility Timeout** — set > xử lý time. Default 30s, max 12 giờ.
- **Long Polling** — `WaitTimeSeconds=20` giảm cost.
- **DLQ** — sau `maxReceiveCount` lần fail.
- **SQS message size** — đề thi 256KB (hiện tại 1 MiB); lớn hơn → S3 + Extended Client.
- **SNS** — pub-sub fan-out, Filter Policy, FIFO topic (chỉ giao tới SQS).
- **EventBridge** — schema, pattern matching, archive/replay, schedule, partner bus.
- **EventBridge Pipes** — source → enrich → target.
- **Kinesis Data Stream** — shard 1MB/s in, 2MB/s out, 1000 rec/s.
- **EFO** — per-consumer dedicated 2MB/s.
- **Firehose** — buffer → S3/RS/OS, no replay.
- **Step Functions Standard** — 1 năm, exactly-once, $25/M transition.
- **Step Functions Express** — 5 phút, $1/M req.
- **Saga pattern** — Step Functions với compensating action.
- **Orchestration** (SF) vs **Choreography** (EB).
- **Outbox / CDC** — chỉ ghi DB, DDB Streams phát event → tránh dual-write.
- **At-least-once + idempotency** = "exactly-once" thực tế.
