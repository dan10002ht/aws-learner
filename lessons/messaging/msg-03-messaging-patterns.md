# Bài 3 — Messaging patterns: work queue, fanout, request-reply

## 1. Mục tiêu
Sau bài này bạn có thể:
- Áp dụng **6 pattern lõi** của messaging: **work queue (competing consumers)**, **pub/sub fanout**, **request-reply bất đồng bộ**, **priority queue**, **delayed/scheduled message**, **claim-check**.
- Với mỗi pattern: nói rõ **giải quyết vấn đề gì**, **khi nào dùng / khi nào tránh**, và **vẽ được sơ đồ**.
- Hiểu cơ chế **correlation id + reply-to queue** để làm RPC trên hạ tầng bất đồng bộ.
- Biết vì sao **priority queue** dễ gây starvation và cách né; vì sao **claim-check** cần cho payload lớn.
- Ghép các pattern lại thành một pipeline thực tế.

---

## 2. Lý thuyết chung

Bài 1 dựng hai *mô hình nền* (queue vs pub/sub). Bài này là **bộ công thức áp dụng**: cùng một broker, nhưng cách bạn *bố trí* queue, consumer và metadata sẽ tạo ra những hành vi rất khác nhau. Coi mỗi pattern như một "khuôn" — nhận ra vấn đề của mình khớp khuôn nào thì lắp vào, khỏi phát minh lại.

Ba câu hỏi luôn phải trả lời khi chọn pattern:
1. **Một message tới nên đến *một* consumer hay *mọi* consumer?** (chia tải hay phát tin)
2. **Producer có cần *câu trả lời* không?** (fire-and-forget hay request-reply)
3. **Thứ tự xử lý theo FIFO, theo *độ ưu tiên*, hay theo *thời điểm hẹn*?**

---

## 3. Pattern 1 — Work queue (Competing Consumers)

### 3.1 Vấn đề & analogy
Một luồng công việc nặng (resize ảnh, render video, gửi hoá đơn) đổ vào nhanh hơn tốc độ một máy xử lý. Ta cần **nhiều worker chia nhau** để theo kịp và để **scale ngang**: thêm việc thì thêm worker.

Analogy: **một hàng người** xếp trước **nhiều quầy thu ngân**. Khách đứng chung một hàng; quầy nào rảnh gọi khách kế tiếp. Mỗi khách chỉ được **một** quầy phục vụ. Đây là điểm khác cốt tử với pub/sub: các worker **cạnh tranh** trên cùng một queue, mỗi message chỉ **một** worker lấy được.

<svg viewBox="0 0 640 210" role="img" aria-labelledby="wq-t wq-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="wq-t">Work queue với nhiều worker cạnh tranh</title>
<desc id="wq-d">Producer đẩy nhiều job vào một queue, ba worker cùng lấy từ queue mỗi job chỉ tới một worker</desc>
<rect x="20" y="82" width="76" height="44" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="58" y="102" text-anchor="middle" font-size="10" fill="currentColor">Producer</text>
<text x="58" y="117" text-anchor="middle" font-size="9" fill="currentColor">(nhiều job)</text>
<line x1="96" y1="104" x2="150" y2="104" stroke="currentColor" stroke-width="1.5" marker-end="url(#wa)"/>
<rect x="152" y="86" width="150" height="36" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<rect x="160" y="94" width="18" height="20" rx="2" fill="currentColor" fill-opacity="0.25" stroke="currentColor"/>
<rect x="182" y="94" width="18" height="20" rx="2" fill="currentColor" fill-opacity="0.25" stroke="currentColor"/>
<rect x="204" y="94" width="18" height="20" rx="2" fill="currentColor" fill-opacity="0.25" stroke="currentColor"/>
<rect x="226" y="94" width="18" height="20" rx="2" fill="currentColor" fill-opacity="0.25" stroke="currentColor"/>
<text x="278" y="108" text-anchor="middle" font-size="10" fill="currentColor">Queue</text>
<line x1="302" y1="94" x2="360" y2="55" stroke="currentColor" stroke-width="1" marker-end="url(#wa)"/>
<line x1="302" y1="104" x2="360" y2="104" stroke="currentColor" stroke-width="1" marker-end="url(#wa)"/>
<line x1="302" y1="114" x2="360" y2="153" stroke="currentColor" stroke-width="1" marker-end="url(#wa)"/>
<rect x="362" y="40" width="90" height="30" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="407" y="59" text-anchor="middle" font-size="10" fill="currentColor">Worker 1</text>
<rect x="362" y="89" width="90" height="30" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="407" y="108" text-anchor="middle" font-size="10" fill="currentColor">Worker 2</text>
<rect x="362" y="138" width="90" height="30" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="407" y="157" text-anchor="middle" font-size="10" fill="currentColor">Worker 3</text>
<text x="530" y="90" text-anchor="middle" font-size="10" fill="currentColor">Mỗi job →</text>
<text x="530" y="105" text-anchor="middle" font-size="10" fill="currentColor">đúng 1 worker</text>
<text x="530" y="128" text-anchor="middle" font-size="9" fill="currentColor">Thêm worker</text>
<text x="530" y="141" text-anchor="middle" font-size="9" fill="currentColor">= thêm throughput</text>
<defs><marker id="wa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 3.2 Cơ chế then chốt: prefetch + ack
Muốn chia tải **đều** và **an toàn**, hai núm phải chỉnh đúng:
- **Prefetch (QoS)**: giới hạn số message broker giao cho *một* worker khi worker chưa ack. Nếu prefetch = ∞, worker nhanh sẽ ôm hết cả queue vào buffer còn worker khác đói. Với job nặng, đặt `prefetch=1` để broker chỉ giao job kế khi worker đã ack job trước → **fair dispatch**.
- **Manual ack**: worker chỉ ack *sau khi làm xong*. Worker chết giữa chừng → broker thấy chưa ack → **requeue** cho worker khác (at-least-once, xem Bài 2).

```python
# RabbitMQ (pika) — work queue công bằng, an toàn khi worker chết
import pika

conn = pika.BlockingConnection(pika.ConnectionParameters("localhost"))
ch = conn.channel()
ch.queue_declare(queue="image_jobs", durable=True)   # queue sống qua restart broker
ch.basic_qos(prefetch_count=1)                        # fair dispatch: 1 job/worker/lần

def handle(ch, method, props, body):
    process_image(body)                              # việc nặng
    ch.basic_ack(delivery_tag=method.delivery_tag)   # ack SAU khi xong

ch.basic_consume(queue="image_jobs", on_message_callback=handle)  # auto_ack=False mặc định
ch.start_consuming()
```

**Khi dùng:** background job, xử lý theo lô, bất kỳ tác vụ nào cần **scale ngang theo throughput** và mỗi việc chỉ nên chạy **một lần**.
**Tránh khi:** nhiều bên *khác nhau* cần cùng dữ liệu (đó là pub/sub, không phải chia tải).

---

## 4. Pattern 2 — Publish/Subscribe fanout

### 4.1 Vấn đề & bản chất
Một **sự kiện** xảy ra (`OrderPlaced`) và **nhiều hệ độc lập** cần biết: Email, Inventory, Analytics, Loyalty... Producer **không nên biết** có bao nhiêu bên nghe. Fanout **sao mỗi message thành N bản**, mỗi subscriber một bản, xử lý độc lập.

Điểm phân biệt với work queue: ở fanout, mỗi subscriber có **queue riêng** của mình. Broker copy message vào *tất cả* queue đang bind vào topic/exchange. Trong *một* subscriber bạn vẫn có thể đặt nhiều worker cạnh tranh (kết hợp cả hai pattern).

```bash
# RabbitMQ: exchange kiểu fanout copy message ra mọi queue đã bind
rabbitmqadmin declare exchange name=order_events type=fanout
rabbitmqadmin declare queue name=q.email
rabbitmqadmin declare queue name=q.inventory
rabbitmqadmin declare queue name=q.analytics
rabbitmqadmin declare binding source=order_events destination=q.email
rabbitmqadmin declare binding source=order_events destination=q.inventory
rabbitmqadmin declare binding source=order_events destination=q.analytics
# Publish 1 lần -> RabbitMQ nhân bản vào cả 3 queue
```

Với **Kafka**, cùng hiệu ứng đạt bằng **consumer group**: mỗi group nhận đủ bản sao của topic (giữ offset riêng), trong group thì partition chia cho các member (chia tải). Một topic, ba group `email`/`inventory`/`analytics` = fanout ba chiều.

**Khi dùng:** event-driven, phát broadcast trạng thái, cache invalidation, audit.
**Tránh khi:** đây thực chất là chia tải một loại việc (dùng work queue để khỏi xử lý trùng N lần).

---

## 5. Pattern 3 — Request-Reply bất đồng bộ

### 5.1 Vấn đề: cần *câu trả lời* trên hạ tầng vốn một chiều
Messaging mặc định fire-and-forget: gửi rồi thôi. Nhưng đôi khi producer **cần kết quả** (kiểu RPC): "định giá đơn này giúp tôi". Ta muốn giữ **decoupling + buffering** của queue nhưng vẫn nhận được reply. Đây là **request-reply**.

Hai mảnh ghép làm nên phép màu:
- **reply-to**: request mang header ghi rõ **gửi trả lời về queue nào**. Client thường tạo một **reply queue riêng** (thường là temporary/exclusive) và lắng nghe ở đó.
- **correlation id**: một id duy nhất gắn vào request; server **copy nguyên** id đó vào reply. Nhờ vậy client — vốn gửi *nhiều* request song song về *cùng* một reply queue — biết **reply nào ứng với request nào**.

<svg viewBox="0 0 620 250" role="img" aria-labelledby="rr-t rr-d" style="width:100%;max-width:580px;height:auto;display:block;margin:1.25rem auto">
<title id="rr-t">Request-reply bất đồng bộ với correlation id và reply-to</title>
<desc id="rr-d">Client gửi request kèm correlation id và reply-to queue, server xử lý rồi gửi reply về đúng queue với cùng correlation id</desc>
<rect x="30" y="30" width="90" height="180" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="75" y="52" text-anchor="middle" font-size="11" fill="currentColor">Client</text>
<rect x="500" y="30" width="90" height="180" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="545" y="52" text-anchor="middle" font-size="11" fill="currentColor">Server</text>
<rect x="250" y="30" width="120" height="26" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="310" y="47" text-anchor="middle" font-size="9" fill="currentColor">rpc_queue</text>
<rect x="250" y="150" width="120" height="26" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="310" y="167" text-anchor="middle" font-size="9" fill="currentColor">reply_to (riêng)</text>
<line x1="120" y1="72" x2="250" y2="46" stroke="currentColor" stroke-width="1" marker-end="url(#ra)"/>
<text x="185" y="66" text-anchor="middle" font-size="8" fill="currentColor">1. request</text>
<text x="185" y="88" text-anchor="middle" font-size="8" fill="currentColor">corr_id=abc, reply_to=Q</text>
<line x1="370" y1="46" x2="500" y2="80" stroke="currentColor" stroke-width="1" marker-end="url(#ra)"/>
<text x="435" y="60" text-anchor="middle" font-size="8" fill="currentColor">2. consume</text>
<rect x="505" y="105" width="80" height="34" rx="4" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="545" y="126" text-anchor="middle" font-size="8" fill="currentColor">xử lý → kết quả</text>
<line x1="500" y1="150" x2="370" y2="160" stroke="currentColor" stroke-width="1" marker-end="url(#ra)"/>
<text x="435" y="146" text-anchor="middle" font-size="8" fill="currentColor">3. reply corr_id=abc</text>
<line x1="250" y1="163" x2="120" y2="180" stroke="currentColor" stroke-width="1" marker-end="url(#ra)"/>
<text x="185" y="196" text-anchor="middle" font-size="8" fill="currentColor">4. khớp corr_id → resolve</text>
<defs><marker id="ra" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

```python
# RabbitMQ RPC client — bản rút gọn
import pika, uuid

class RpcClient:
    def __init__(self, ch):
        self.ch = ch
        # reply queue riêng, tự sinh tên, tự xoá khi client ngắt
        self.callback_queue = ch.queue_declare("", exclusive=True).method.queue
        ch.basic_consume(self.callback_queue, self._on_reply, auto_ack=True)
        self.responses = {}

    def _on_reply(self, ch, method, props, body):
        self.responses[props.correlation_id] = body   # khớp theo corr_id

    def call(self, payload):
        corr_id = str(uuid.uuid4())
        self.ch.basic_publish(
            exchange="", routing_key="rpc_queue",
            properties=pika.BasicProperties(
                reply_to=self.callback_queue,          # bảo server trả về đây
                correlation_id=corr_id),               # để khớp reply
            body=payload)
        while corr_id not in self.responses:           # chờ (async bên dưới)
            self.ch.connection.process_data_events()
        return self.responses.pop(corr_id)
```

### 5.2 Lưu ý sống còn
- **Luôn đặt timeout**: server có thể chết/chậm; client không được chờ mãi. Hết hạn → coi như lỗi, retry hoặc fail nhanh.
- **Idempotency**: nếu timeout rồi retry, request có thể chạy 2 lần → thiết kế server idempotent (Bài 2).
- **Cân nhắc lại nhu cầu**: request-reply *đồng bộ hoá* client vào server, làm mất bớt lợi ích async. Nếu chỉ cần "kích hoạt rồi lấy kết quả sau", hãy dùng **callback event** thay vì chặn chờ.

**Khi dùng:** cần kết quả trả về nhưng muốn giữ buffering/decoupling của broker; offload việc nặng rồi lấy đáp án.
**Tránh khi:** độ trễ cực thấp là bắt buộc, hoặc call đơn giản — gRPC/HTTP đồng bộ gọn hơn.

---

## 6. Pattern 4 — Priority queue

### 6.1 Vấn đề
Không phải message nào cũng ngang nhau. Đơn của khách VIP, cảnh báo hệ thống, giao dịch hoàn tiền cần **được xử lý trước** dù vào sau. Priority queue cho phép gắn **mức ưu tiên**; broker giao message ưu tiên cao **trước** message ưu tiên thấp đang chờ.

```bash
# RabbitMQ: khai báo queue có ưu tiên tối đa 10, rồi publish kèm priority
rabbitmqadmin declare queue name=tasks arguments='{"x-max-priority":10}'
```
```python
# Message priority cao (9) sẽ vượt các message priority thấp còn trong queue
ch.basic_publish(exchange="", routing_key="tasks",
    properties=pika.BasicProperties(priority=9), body=b"VIP order")
ch.basic_publish(exchange="", routing_key="tasks",
    properties=pika.BasicProperties(priority=1), body=b"normal order")
```

### 6.2 Cạm bẫy: starvation
Ưu tiên chỉ so **trong những message *đang chờ*** tại thời điểm broker chọn — message ưu tiên cao đã nằm trong buffer prefetch của worker thì **không** chen được. Quan trọng hơn: nếu dòng message ưu tiên cao **không ngớt**, message ưu tiên thấp có thể **chờ mãi (starvation)**.

Cách né trong thực tế:
- **Prefetch thấp** (ví dụ 1) để broker luôn có cơ hội chọn message ưu tiên cao nhất cho lần giao kế.
- Thay priority queue bằng **nhiều queue riêng theo class** (`q.high`, `q.normal`, `q.low`) và cho worker **weighted polling** (đọc high nhiều hơn nhưng thỉnh thoảng vẫn ngó low) → kiểm soát được, không starvation.
- Số mức ưu tiên **ít thôi** (2-3): nhiều mức làm broker tốn bộ nhớ/CPU sắp xếp mà lợi ích không tăng.

**Khi dùng:** có phân lớp SLA rõ ràng và lượng ưu tiên cao *có giới hạn*.
**Tránh khi:** cần đảm bảo mọi message *cũng* được xử lý trong thời gian hữu hạn (dùng nhiều queue + weighting thay thế).

---

## 7. Pattern 5 — Delayed / Scheduled message

### 7.1 Vấn đề
Ta muốn message **được xử lý sau X phút/giờ**, không phải ngay: nhắc "giỏ hàng bỏ quên" sau 1 giờ, huỷ đơn chưa thanh toán sau 15 phút, **retry với backoff** (đợi 1s, 4s, 16s...). Producer publish *bây giờ* nhưng consumer chỉ *thấy* message khi tới hẹn.

<svg viewBox="0 0 620 170" role="img" aria-labelledby="dl-t dl-d" style="width:100%;max-width:580px;height:auto;display:block;margin:1.25rem auto">
<title id="dl-t">Delayed message qua delay buffer trước khi vào ready queue</title>
<desc id="dl-d">Producer gửi message với thời gian chờ, message nằm trong vùng delay rồi mới rơi vào queue sẵn sàng cho consumer khi hết hạn</desc>
<rect x="20" y="66" width="80" height="40" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="60" y="82" text-anchor="middle" font-size="10" fill="currentColor">Producer</text>
<text x="60" y="96" text-anchor="middle" font-size="8" fill="currentColor">delay=15m</text>
<line x1="100" y1="86" x2="150" y2="86" stroke="currentColor" stroke-width="1.5" marker-end="url(#da)"/>
<rect x="152" y="50" width="150" height="72" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="227" y="70" text-anchor="middle" font-size="10" fill="currentColor">Delay buffer</text>
<text x="227" y="86" text-anchor="middle" font-size="8" fill="currentColor">(TTL / DLX / plugin)</text>
<text x="227" y="104" text-anchor="middle" font-size="8" fill="currentColor">giữ tới khi hết hạn</text>
<line x1="302" y1="86" x2="352" y2="86" stroke="currentColor" stroke-width="1.5" marker-end="url(#da)"/>
<text x="327" y="78" text-anchor="middle" font-size="8" fill="currentColor">hết hạn</text>
<rect x="354" y="66" width="90" height="40" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="399" y="90" text-anchor="middle" font-size="9" fill="currentColor">Ready queue</text>
<line x1="444" y1="86" x2="494" y2="86" stroke="currentColor" stroke-width="1.5" marker-end="url(#da)"/>
<rect x="496" y="66" width="90" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="541" y="90" text-anchor="middle" font-size="10" fill="currentColor">Consumer</text>
<defs><marker id="da" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 7.2 Cách hiện thực
| Cơ chế | Cách làm | Ghi chú |
|--------|----------|---------|
| **RabbitMQ delayed plugin** | `x-delayed-message` exchange, header `x-delay` (ms) | Sạch nhất, delay theo *từng* message |
| **TTL + Dead Letter Exchange** | Message vào queue có `message-ttl`; hết hạn → DLX đẩy sang queue thật | Không cần plugin; nhưng TTL theo queue nên cần nhiều queue cho nhiều mốc delay |
| **SQS delay** | `DelaySeconds` tối đa **900s (15 phút)** | Đủ cho delay ngắn |
| **Scheduler ngoài** | Lưu "đến giờ thì gửi" vào DB, cron/worker quét & publish | Delay dài (ngày/tháng); linh hoạt nhất |

```bash
# RabbitMQ delayed-message plugin: message tới consumer sau 15 phút
rabbitmqadmin declare exchange name=delayed type=x-delayed-message \
  arguments='{"x-delayed-type":"direct"}'
```
```python
ch.basic_publish(exchange="delayed", routing_key="cancel_order",
    properties=pika.BasicProperties(headers={"x-delay": 900000}),  # 900_000 ms = 15'
    body=b'{"order_id": 42}')
```

**Cạm bẫy TTL+DLX**: TTL của queue chỉ "chín" theo *đầu hàng* (head). Nếu message TTL ngắn nằm *sau* message TTL dài, nó vẫn phải chờ tới lượt — nên **một queue cho một mốc delay**.

**Khi dùng:** retry backoff, timeout nghiệp vụ, nhắc lịch, throttle.
**Tránh khi:** delay rất dài & số lượng khổng lồ — dùng bảng DB + scheduler quét thay vì giữ trong broker.

---

## 8. Pattern 6 — Claim-Check (payload lớn để ngoài)

### 8.1 Vấn đề
Broker được tối ưu cho message **nhỏ**. Nhưng nghiệp vụ có khi cần đẩy **file lớn**: ảnh gốc 40MB, video, PDF, dataset. Nhồi payload lớn vào message gây: vượt **giới hạn kích thước** (Kafka mặc định `message.max.bytes` ~1MB; SQS tối đa **256KB**), phình bộ nhớ broker, chậm cả hàng đợi cho những message nhỏ đứng sau.

**Claim-check** (ẩn dụ *phiếu gửi đồ*): cất "đồ nặng" ở kho ngoài (S3/blob store), chỉ gửi qua broker **tấm phiếu** — một *tham chiếu* nhỏ (URL/key + metadata). Consumer cầm phiếu **tự lấy** payload từ kho.

<svg viewBox="0 0 620 220" role="img" aria-labelledby="cc-t cc-d" style="width:100%;max-width:580px;height:auto;display:block;margin:1.25rem auto">
<title id="cc-t">Claim-check gửi tham chiếu qua broker payload lớn để ở object store</title>
<desc id="cc-d">Producer lưu payload lớn vào object store rồi gửi message nhỏ chứa key qua broker, consumer đọc key và tải payload lớn từ store</desc>
<rect x="20" y="90" width="84" height="42" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="62" y="115" text-anchor="middle" font-size="10" fill="currentColor">Producer</text>
<line x1="62" y1="90" x2="62" y2="46" stroke="currentColor" stroke-width="1" marker-end="url(#ca)"/>
<text x="62" y="38" text-anchor="middle" font-size="8" fill="currentColor">1. PUT 40MB</text>
<rect x="150" y="18" width="160" height="40" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="230" y="35" text-anchor="middle" font-size="10" fill="currentColor">Object store (S3)</text>
<text x="230" y="49" text-anchor="middle" font-size="8" fill="currentColor">key = uploads/abc.jpg</text>
<line x1="104" y1="100" x2="150" y2="100" stroke="currentColor" stroke-width="1.5" marker-end="url(#ca)"/>
<text x="185" y="92" text-anchor="middle" font-size="8" fill="currentColor">2. gửi phiếu</text>
<rect x="152" y="82" width="120" height="38" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="212" y="98" text-anchor="middle" font-size="9" fill="currentColor">Broker</text>
<text x="212" y="112" text-anchor="middle" font-size="8" fill="currentColor">{ key } nhỏ xíu</text>
<line x1="272" y1="100" x2="330" y2="100" stroke="currentColor" stroke-width="1.5" marker-end="url(#ca)"/>
<rect x="332" y="82" width="90" height="38" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="377" y="105" text-anchor="middle" font-size="10" fill="currentColor">Consumer</text>
<line x1="377" y1="82" x2="300" y2="58" stroke="currentColor" stroke-width="1" marker-end="url(#ca)"/>
<text x="345" y="72" text-anchor="middle" font-size="8" fill="currentColor">3. GET theo key</text>
<text x="470" y="96" text-anchor="middle" font-size="9" fill="currentColor">Broker chỉ chở</text>
<text x="470" y="110" text-anchor="middle" font-size="9" fill="currentColor">vài trăm byte</text>
<defs><marker id="ca" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

```python
# Producer: cất payload lớn -> S3, chỉ publish tham chiếu
import boto3, json, uuid
s3 = boto3.client("s3")

key = f"uploads/{uuid.uuid4()}.jpg"
s3.put_object(Bucket="media-bucket", Key=key, Body=big_image_bytes)  # 40MB ở ngoài

ch.basic_publish(exchange="", routing_key="image_jobs",
    body=json.dumps({                       # message chỉ vài trăm byte
        "bucket": "media-bucket", "key": key,
        "size": len(big_image_bytes), "content_type": "image/jpeg"
    }).encode())
```
```python
# Consumer: đọc phiếu -> tự tải payload
msg = json.loads(body)
obj = s3.get_object(Bucket=msg["bucket"], Key=msg["key"])   # lấy 40MB khi cần
process_image(obj["Body"].read())
```

### 8.2 Lưu ý
- **Vòng đời & dọn rác**: đặt lifecycle policy xoá object cũ, tránh kho phình vô hạn khi message lỗi/không được tiêu thụ.
- **Bảo mật**: dùng **pre-signed URL** hạn giờ thay vì key trần nếu consumer nằm ngoài vùng tin cậy.
- **Nhất quán thứ tự**: PUT lên store *trước*, publish message *sau* — để consumer không bao giờ cầm phiếu trỏ vào object chưa tồn tại.

> **Mẹo**: Amazon SQS có **Extended Client Library** làm claim-check *tự động* — payload >256KB được đẩy sang S3 và thay bằng tham chiếu trong suốt với code.

**Khi dùng:** payload lớn/biến thiên, vượt giới hạn broker, hoặc muốn broker gọn nhẹ.
**Tránh khi:** payload luôn nhỏ (thêm round-trip tới store là chi phí thừa).

---

## 9. Bảng chọn nhanh

| Pattern | Câu hỏi nó trả lời | Metadata/hạ tầng lõi |
|---------|--------------------|----------------------|
| **Work queue** | Chia một loại việc cho nhiều worker | 1 queue + prefetch + ack |
| **Pub/Sub fanout** | Nhiều bên độc lập cùng cần một event | exchange fanout / nhiều consumer group |
| **Request-reply** | Cần *câu trả lời* mà vẫn qua broker | `correlation_id` + `reply_to` |
| **Priority queue** | Vài việc phải xử lý trước | `x-max-priority` / nhiều queue theo class |
| **Delayed/scheduled** | Xử lý *sau* một khoảng thời gian | delayed exchange / TTL+DLX / scheduler |
| **Claim-check** | Payload quá lớn cho broker | object store + tham chiếu trong message |

Thực tế bạn **ghép** chúng: một `ImageUploaded` event (**fanout**) → mỗi consumer là một **work queue** nhiều worker → payload ảnh dùng **claim-check** → job lỗi thì **delayed** retry backoff → job của khách VIP đi **priority** cao hơn.

---

## 10. Tóm tắt
- **Work queue (competing consumers)**: nhiều worker cạnh tranh trên *một* queue, mỗi message chỉ một worker; chỉnh **prefetch + manual ack** để chia tải công bằng và an toàn khi worker chết. Scale ngang = thêm worker.
- **Pub/Sub fanout**: sao message cho *mọi* subscriber độc lập (exchange fanout hoặc nhiều consumer group Kafka). Producer không cần biết ai nghe.
- **Request-reply**: làm RPC trên broker nhờ **correlation id** (khớp reply với request) và **reply-to** (biết trả về đâu); luôn đặt **timeout** và giữ idempotent.
- **Priority queue**: việc quan trọng lên trước, nhưng coi chừng **starvation** — prefetch thấp, ít mức, hoặc nhiều queue theo class + weighting.
- **Delayed/scheduled**: xử lý *sau* X thời gian (retry backoff, timeout nghiệp vụ) qua delayed exchange / TTL+DLX / SQS DelaySeconds / scheduler ngoài.
- **Claim-check**: payload lớn cất ở object store, broker chỉ chở **tham chiếu** nhỏ; nhớ lifecycle dọn rác và PUT-trước-publish-sau.
- Các pattern **kết hợp** được — nhận đúng vấn đề, lắp đúng khuôn, đừng phát minh lại.

> **Bài tiếp theo (Bài 4):** đi sâu vào **RabbitMQ** — exchange (direct/topic/fanout/headers), routing key, binding, và cách hiện thực đúng các pattern trên trong một broker thật.
