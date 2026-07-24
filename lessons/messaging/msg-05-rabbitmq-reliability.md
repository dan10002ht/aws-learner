# Bài 5 — RabbitMQ reliability: confirm, DLX, quorum queue

## 1. Mục tiêu
Sau bài này bạn có thể:
- Chỉ ra **mọi điểm message có thể mất** trên đường đi producer → broker → consumer, và bịt từng điểm.
- Bật **publisher confirms** (broker ack đã nhận) và **mandatory** (không route được thì trả lại) để producer biết chắc message đã an toàn.
- Dùng **manual ack** + **requeue/reject** ở consumer để không mất việc khi xử lý fail hay process chết.
- Cấu hình **durable queue + persistent message** để hàng đợi sống qua broker restart.
- Xây **Dead Letter Exchange (DLX) + message TTL** làm cơ chế **retry có delay** và **parking lot** cho message độc.
- Chọn **quorum queue** (Raft) thay classic mirrored queue để có **HA** đúng cách.
- Quyết định **RabbitMQ vs Kafka** theo bản chất bài toán (routing/task queue vs streaming/replay).

---

## 2. Lý thuyết

### 2.1 Message mất ở đâu? Ba khoảng hở

RabbitMQ mặc định **không** đảm bảo gì mạnh: producer bắn message đi, broker giữ trong RAM, consumer nhận là coi như xong. Bất kỳ khâu nào chết đều mất dữ liệu. Muốn "không mất message" phải bịt **cả ba khoảng hở** — thiếu một cái là chuỗi đứt.

<svg viewBox="0 0 680 210" role="img" aria-labelledby="gap-t gap-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="gap-t">Ba khoảng hở mất message và cơ chế bịt</title>
<desc id="gap-d">Từ producer tới broker cần confirm, trong broker cần durable và persistent, từ broker tới consumer cần manual ack</desc>
<rect x="20" y="80" width="90" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="65" y="100" text-anchor="middle" font-size="11" fill="currentColor">Producer</text>
<text x="65" y="116" text-anchor="middle" font-size="9" fill="currentColor">publish</text>
<rect x="290" y="70" width="110" height="66" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="345" y="92" text-anchor="middle" font-size="11" fill="currentColor">Broker</text>
<text x="345" y="108" text-anchor="middle" font-size="9" fill="currentColor">exchange→queue</text>
<text x="345" y="122" text-anchor="middle" font-size="9" fill="currentColor">(lưu trên đĩa)</text>
<rect x="580" y="80" width="90" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="625" y="100" text-anchor="middle" font-size="11" fill="currentColor">Consumer</text>
<text x="625" y="116" text-anchor="middle" font-size="9" fill="currentColor">xử lý</text>
<line x1="110" y1="103" x2="288" y2="103" stroke="currentColor" stroke-width="1.5" marker-end="url(#ga)"/>
<line x1="400" y1="103" x2="578" y2="103" stroke="currentColor" stroke-width="1.5" marker-end="url(#ga)"/>
<text x="199" y="60" text-anchor="middle" font-size="10" fill="currentColor">Hở 1: publisher</text>
<text x="199" y="74" text-anchor="middle" font-size="10" fill="currentColor">confirm + mandatory</text>
<text x="345" y="164" text-anchor="middle" font-size="10" fill="currentColor">Hở 2: durable queue</text>
<text x="345" y="178" text-anchor="middle" font-size="10" fill="currentColor">+ persistent message</text>
<text x="489" y="60" text-anchor="middle" font-size="10" fill="currentColor">Hở 3: manual ack</text>
<text x="489" y="74" text-anchor="middle" font-size="10" fill="currentColor">+ requeue on fail</text>
<defs><marker id="ga" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

| Khoảng hở | Rủi ro nếu bỏ trống | Cơ chế bịt |
|-----------|---------------------|-----------|
| Producer → Broker | Broker chưa nhận (mạng rớt, broker chết) mà producer tưởng đã gửi | **Publisher confirms** + **mandatory** |
| Trong Broker | Broker restart → mất message trong RAM | **Durable queue** + **persistent message** (`delivery_mode=2`) |
| Broker → Consumer | Consumer nhận rồi chết giữa chừng, chưa xử lý xong | **Manual ack** (ack sau khi xong), requeue khi fail |

### 2.2 Hở 1 — Publisher confirms và mandatory

Mặc định `basic_publish` là **fire-and-forget**: hàm trả về ngay, không nghĩa là broker đã nhận. Bật **confirm mode** trên channel → sau khi broker đã ghi message vào **mọi** queue đích (và fsync nếu persistent), nó gửi lại một `basic.ack` mang `delivery-tag`. Producer chỉ coi message an toàn khi nhận được ack này. Nếu broker không nhận được → `basic.nack` → producer **gửi lại**.

Confirm chỉ bảo đảm "broker đã nhận". Nhưng nếu message **không route được vào queue nào** (sai routing key, queue chưa tồn tại) thì broker vẫn... ack và **âm thầm vứt** message. Cờ **`mandatory=True`** buộc broker trả message về producer qua `basic.return` khi không route được — nhờ đó producer phát hiện lỗi cấu hình thay vì mất message trong im lặng.

```python
import pika

conn = pika.BlockingConnection(pika.ConnectionParameters("localhost"))
ch = conn.channel()

# Khai báo hạ tầng: exchange + durable queue + binding
ch.exchange_declare(exchange="orders", exchange_type="direct", durable=True)
ch.queue_declare(queue="orders.new", durable=True)          # queue sống qua restart
ch.queue_bind("orders.new", "orders", routing_key="new")

ch.confirm_delivery()   # BẬT publisher confirms trên channel này

try:
    ch.basic_publish(
        exchange="orders",
        routing_key="new",
        body=b'{"orderId":42}',
        properties=pika.BasicProperties(
            delivery_mode=2,        # 2 = persistent: ghi xuống đĩa
            content_type="application/json",
        ),
        mandatory=True,             # không route được → trả về, không nuốt
    )
    # BlockingConnection: publish trả về bình thường = đã nhận ack.
    # Nếu nack/return, pika raise UnroutableError / NackError ở đây.
    print("Broker đã xác nhận nhận message")
except pika.exceptions.UnroutableError:
    print("Không route được — kiểm tra routing key/binding")
```

> **Lưu ý hiệu năng:** confirm đồng bộ từng cái (chờ ack rồi mới gửi cái sau) rất chậm. Production nên dùng **confirm bất đồng bộ**: bắn nhiều message, gom `delivery-tag` chờ xác nhận theo lô — throughput cao hơn hàng chục lần.

### 2.3 Hở 2 — Durable queue + persistent message

Đây là chỗ hay nhầm nhất. Cần **cả hai**, độc lập nhau:
- **Durable queue** (`durable=True` lúc declare): định nghĩa queue tồn tại lại sau restart. Nếu queue không durable, khi broker khởi động lại queue **biến mất** cùng toàn bộ message trong nó.
- **Persistent message** (`delivery_mode=2`): từng message được ghi xuống đĩa. Nếu message không persistent, dù queue durable thì lúc restart message vẫn **bay hơi** (queue còn, nhưng rỗng).

Chỉ khi **queue durable VÀ message persistent** thì message mới thực sự sống qua restart. Ngay cả vậy vẫn có khe hẹp: message vừa vào, chưa kịp fsync xuống đĩa mà broker crash → mất. Để bịt hoàn toàn khe này cần **quorum queue** (mục 2.6) để đĩa được replicate sang node khác trước khi ack.

### 2.4 Hở 3 — Manual ack và requeue

Mặc định (`auto_ack=True`) broker coi message đã xong **ngay khi đẩy cho consumer** — nếu consumer chết trước khi xử lý xong, message **mất luôn**. Đúng phải là **manual ack**: consumer chỉ gửi `basic_ack` **sau khi** xử lý thành công. Chừng nào chưa ack, broker vẫn giữ message; nếu kết nối consumer đứt (process chết), broker **redeliver** message đó cho consumer khác.

Khi xử lý **fail**, có hai lựa chọn qua `basic_nack`/`basic_reject`:
- `requeue=True`: trả message về đầu queue để thử lại — hợp với lỗi tạm thời (DB nghẽn).
- `requeue=False`: bỏ message; nếu queue có DLX thì message **dead-letter** sang DLX (mục 2.5) — hợp với "poison message" xử lý mãi không xong.

```python
ch.basic_qos(prefetch_count=20)   # tối đa 20 message chưa-ack mỗi consumer → chia tải công bằng

def on_message(ch, method, props, body):
    try:
        process(body)                                  # xử lý nghiệp vụ
        ch.basic_ack(delivery_tag=method.delivery_tag) # XONG mới ack
    except TransientError:
        # lỗi tạm thời → trả lại queue để retry
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
    except PoisonError:
        # message hỏng vĩnh viễn → đẩy sang DLX, KHÔNG requeue
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

ch.basic_consume(queue="orders.new", on_message_callback=on_message, auto_ack=False)
ch.start_consuming()
```

> **`prefetch_count`** là "van" quan trọng: không đặt nó, một consumer sẽ ôm hết cả queue vào buffer, làm mất cân bằng và ngốn RAM. Giá trị 10–100 thường hợp lý; xử lý càng nặng thì đặt càng nhỏ.

Kết hợp manual ack với at-least-once (Bài 2) nghĩa là message **có thể bị xử lý lặp** (ack chưa kịp gửi thì consumer chết → redeliver). Vì vậy consumer phải **idempotent**.

### 2.5 Retry có delay bằng DLX + TTL

Requeue thẳng (`requeue=True`) có một cạm bẫy: message quay lại **ngay lập tức**, nếu lỗi vẫn còn thì tạo **vòng lặp nóng** ngốn CPU. Cách chuyên nghiệp là **retry có delay** dùng **Dead Letter Exchange** + **message TTL**.

**Dead Letter Exchange (DLX)** là exchange mà một message bị "chết" sẽ được tự động chuyển tới. Message dead-letter khi: bị `nack`/`reject` với `requeue=False`, hoặc **hết TTL**, hoặc queue đầy (max-length). Ghép DLX với TTL tạo ra **hàng đợi chờ**: message nằm trong queue chờ đúng N giây rồi tự động bật ngược về queue chính để thử lại.

<svg viewBox="0 0 660 260" role="img" aria-labelledby="dlx-t dlx-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="dlx-t">Vòng retry có delay bằng DLX và TTL</title>
<desc id="dlx-d">Message fail chuyển sang retry queue chờ hết TTL rồi dead-letter ngược về queue chính; quá số lần thì vào parking lot</desc>
<rect x="30" y="30" width="130" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="52" text-anchor="middle" font-size="11" fill="currentColor">orders.new</text>
<text x="95" y="68" text-anchor="middle" font-size="9" fill="currentColor">(queue chính)</text>
<rect x="30" y="150" width="130" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="172" text-anchor="middle" font-size="11" fill="currentColor">consumer</text>
<text x="95" y="188" text-anchor="middle" font-size="9" fill="currentColor">xử lý</text>
<rect x="380" y="150" width="150" height="56" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="455" y="172" text-anchor="middle" font-size="11" fill="currentColor">orders.retry</text>
<text x="455" y="188" text-anchor="middle" font-size="9" fill="currentColor">TTL=30s, DLX→orders</text>
<text x="455" y="200" text-anchor="middle" font-size="9" fill="currentColor">(hàng đợi chờ)</text>
<rect x="380" y="30" width="150" height="50" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="455" y="52" text-anchor="middle" font-size="11" fill="currentColor">orders.parking</text>
<text x="455" y="68" text-anchor="middle" font-size="9" fill="currentColor">(quá số lần retry)</text>
<line x1="95" y1="80" x2="95" y2="148" stroke="currentColor" stroke-width="1.5" marker-end="url(#da)"/>
<line x1="160" y1="175" x2="378" y2="175" stroke="currentColor" stroke-width="1.5" marker-end="url(#da)"/>
<text x="269" y="167" text-anchor="middle" font-size="9" fill="currentColor">nack requeue=false</text>
<path d="M455 150 Q455 110 200 70" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#da)"/>
<text x="300" y="104" text-anchor="middle" font-size="9" fill="currentColor">hết TTL → dead-letter về</text>
<line x1="455" y1="150" x2="455" y2="82" stroke="currentColor" stroke-width="1.5" marker-end="url(#da)"/>
<text x="530" y="118" text-anchor="middle" font-size="9" fill="currentColor">quá 5 lần</text>
<defs><marker id="da" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Khai báo qua `arguments` lúc declare queue (dùng lệnh `rabbitmqadmin` hoặc trong code):

```python
# Exchange nhận message chết; route sang retry queue
ch.exchange_declare(exchange="orders.dlx", exchange_type="direct", durable=True)

# Queue chính: khi message chết thì đẩy sang exchange "orders.dlx"
ch.queue_declare(queue="orders.new", durable=True, arguments={
    "x-dead-letter-exchange": "orders.dlx",
})

# Retry queue: giữ message 30s rồi tự dead-letter NGƯỢC về exchange chính.
# Phải bind vào orders.dlx thì message chết từ orders.new mới rơi vào đây.
ch.queue_declare(queue="orders.retry", durable=True, arguments={
    "x-message-ttl": 30000,                 # 30 giây
    "x-dead-letter-exchange": "orders",     # hết hạn → quay lại queue chính
    "x-dead-letter-routing-key": "new",
})
ch.queue_bind("orders.retry", "orders.dlx", routing_key="new")   # giữ nguyên routing key "new"

# Parking lot: message độc, giữ lại để người vào điều tra
ch.queue_declare(queue="orders.parking", durable=True)
```

**Đếm số lần retry:** RabbitMQ ghi lịch sử dead-letter vào header `x-death` (một mảng, tăng dần theo mỗi lần chết). Consumer đọc tổng `count` trong `x-death`; nếu vượt ngưỡng (vd 5) thì `nack` sang **parking lot** thay vì retry queue — tránh message độc quay vòng vô tận.

> Cần **delay theo cấp số nhân** (30s → 2m → 10m)? Tạo nhiều retry queue với TTL khác nhau, hoặc dùng plugin **`rabbitmq_delayed_message_exchange`** để đặt delay theo từng message.

### 2.6 HA đúng cách — Quorum queue thay classic mirrored queue

Một node RabbitMQ chết là queue trên nó không phục vụ được. Ngày xưa giải pháp HA là **classic mirrored queue** (`ha-mode`): queue có một master và các mirror sao chép. Cơ chế này **đã deprecated** vì nhiều lỗi khét tiếng: **split-brain**, mất message khi failover, phục hồi sau mạng phân mảnh không xác định.

Thay thế hiện đại là **quorum queue** — cài đặt trên thuật toán đồng thuận **Raft**. Queue có một **leader** và các **follower** trên các node khác; mỗi message chỉ được coi là committed khi **đa số (quorum)** node đã ghi vào log. Với cụm 3 node, quorum = 2 → chịu được **1 node chết** mà không mất message, không split-brain. Đây là lựa chọn mặc định nên dùng cho mọi queue cần bền/HA.

<svg viewBox="0 0 620 210" role="img" aria-labelledby="qq-t qq-d" style="width:100%;max-width:580px;height:auto;display:block;margin:1.25rem auto">
<title id="qq-t">Quorum queue trên Raft với leader và hai follower</title>
<desc id="qq-d">Message được commit khi đa số node ghi vào log; một node chết vẫn còn quorum</desc>
<rect x="240" y="20" width="140" height="50" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="310" y="42" text-anchor="middle" font-size="11" fill="currentColor">Leader (node A)</text>
<text x="310" y="58" text-anchor="middle" font-size="9" fill="currentColor">nhận publish</text>
<rect x="60" y="130" width="150" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="135" y="152" text-anchor="middle" font-size="11" fill="currentColor">Follower (node B)</text>
<text x="135" y="168" text-anchor="middle" font-size="9" fill="currentColor">replicate log ✓</text>
<rect x="410" y="130" width="150" height="50" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="485" y="152" text-anchor="middle" font-size="11" fill="currentColor">Follower (node C)</text>
<text x="485" y="168" text-anchor="middle" font-size="9" fill="currentColor">chết ✗</text>
<line x1="270" y1="70" x2="150" y2="128" stroke="currentColor" stroke-width="1.5" marker-end="url(#qa)"/>
<line x1="350" y1="70" x2="470" y2="128" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<text x="310" y="200" text-anchor="middle" font-size="10" fill="currentColor">A + B = quorum 2/3 → commit OK dù C chết</text>
<defs><marker id="qa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Tạo quorum queue chỉ là thêm một argument:

```python
ch.queue_declare(queue="orders.new", durable=True, arguments={
    "x-queue-type": "quorum",               # thay vì classic
    "x-dead-letter-exchange": "orders.dlx",
    "x-delivery-limit": 5,                   # quorum queue tự đếm redelivery,
                                             # quá 5 lần → tự dead-letter (khỏi tự đọc x-death)
})
```

Vài điểm cần nhớ về quorum queue:
- Queue **luôn durable** và message **luôn được replicate** rồi mới ack → bịt luôn khe "chưa fsync đã crash" của mục 2.3.
- Có **`x-delivery-limit`** sẵn: tự đếm số lần redeliver, vượt ngưỡng thì dead-letter — không cần tự parse header `x-death`.
- Nên chạy cụm **số lẻ node** (3 hoặc 5) để quorum rõ ràng; 3 node chịu 1 chết, 5 node chịu 2 chết.
- Đánh đổi: tốn đĩa/băng thông hơn (mỗi message nằm trên nhiều node), latency nhỉnh hơn classic queue. Đổi lại là an toàn thật.

### 2.7 Khi nào RabbitMQ, khi nào Kafka?

Cả hai đều là "broker" nhưng **mô hình lưu trữ** khác nhau tận gốc, dẫn tới thế mạnh khác nhau. RabbitMQ là **smart broker / dumb consumer**: broker định tuyến phức tạp, xoá message sau khi consumer ack. Kafka là **dumb broker / smart consumer**: broker chỉ là **log append-only** giữ message theo retention, consumer tự quản offset và tự đọc lại.

| Tiêu chí | **RabbitMQ** | **Kafka** |
|----------|--------------|-----------|
| Mô hình | Queue + exchange routing, xoá sau ack | Log phân partition, giữ theo thời gian |
| Đơn vị đảm bảo | **Per-message ack**, routing linh hoạt | **Offset per partition**, ordering trong partition |
| Routing | Rất mạnh (direct/topic/headers/fanout) | Chỉ theo topic + partition key |
| Replay lịch sử | Không (message biến mất sau ack) | Có — tua lại offset, nhiều consumer group |
| Throughput | Cao (chục–trăm nghìn msg/s) | Rất cao (triệu msg/s), tối ưu batch/sequential I/O |
| Hợp nhất với | **Task queue**, RPC, routing phức tạp, priority, delay | **Event streaming**, log, analytics, event sourcing |

Quy tắc chọn:
- **Dùng RabbitMQ** khi cần **task queue** (giao việc cho worker, mỗi việc xử lý đúng một lần rồi biến mất), **routing phức tạp** (định tuyến theo header/topic pattern), **per-message ack/retry/priority/delay**, hoặc luồng RPC request-reply.
- **Dùng Kafka** khi cần **streaming/replay** (nhiều hệ thống đọc cùng dòng sự kiện theo nhịp riêng, tua lại lịch sử), **throughput cực lớn**, **event sourcing**, hoặc giữ event làm nguồn sự thật lâu dài.

Không hiếm hệ thống dùng **cả hai**: Kafka làm xương sống event streaming, RabbitMQ làm task queue điều phối công việc — chọn theo bản chất từng luồng, không theo "công cụ yêu thích".

---

## 3. Tóm tắt
- "Không mất message" = bịt **ba khoảng hở**: publisher confirms + mandatory (producer→broker), durable queue + persistent message (trong broker), manual ack + requeue (broker→consumer). Thiếu một là đứt chuỗi.
- **Confirm** cho biết broker đã nhận; **mandatory** chống nuốt message không route được; production dùng confirm **bất đồng bộ** để nhanh.
- Cần **cả** durable queue **và** persistent message mới sống qua restart; khe "chưa fsync đã crash" chỉ đóng hẳn bằng **quorum queue**.
- Consumer phải **manual ack sau khi xử lý xong**, đặt **prefetch** hợp lý, và **idempotent** vì at-least-once.
- **DLX + TTL** tạo **retry có delay** và **parking lot**; đếm `x-death` (hoặc `x-delivery-limit` của quorum queue) để chặn poison message quay vòng.
- **Quorum queue (Raft)** thay classic mirrored queue: an toàn, không split-brain, chịu 1 node chết trên cụm 3.
- **RabbitMQ** cho task queue/routing/per-message ack; **Kafka** cho streaming/replay/throughput lớn — chọn theo bản chất luồng.

> **Bài tiếp theo:** đưa những đảm bảo này lên production — health check, monitoring (queue depth, unacked, consumer lag) và cách vận hành cụm broker an toàn.
