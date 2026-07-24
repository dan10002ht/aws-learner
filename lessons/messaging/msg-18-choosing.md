# Bài 18 — Chọn đúng: Kafka vs RabbitMQ vs Pulsar vs NATS

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân biệt **bản chất kiến trúc** của bốn hệ: Kafka (distributed log), RabbitMQ (smart broker + queue), Pulsar (compute–storage tách rời trên BookKeeper), NATS/JetStream (lightweight messaging fabric).
- Ánh xạ **yêu cầu bài toán → tiêu chí kỹ thuật**: retention/replay, ordering, throughput vs latency, routing, delivery guarantee, chi phí vận hành.
- Nhận diện **anti-pattern** thường gặp: dùng Kafka làm task queue, dùng RabbitMQ để lưu event sourcing, chọn Pulsar khi không cần multi-tenancy.
- Dùng một **decision matrix** để bảo vệ lựa chọn trước kiến trúc sư/manager, không chọn theo cảm tính hay "vì hot".

---

## 2. Lý thuyết

### 2.1 Analogy: bốn "kho hàng và người đưa thư" khác nhau

Hình dung việc chuyển message như dịch vụ hậu cần:

- **Kafka** = một **cuốn nhật ký khổng lồ có đánh số dòng** (append-only log). Ai muốn đọc thì tự nhớ mình đọc tới dòng nào (offset). Nhật ký được giữ lại nhiều ngày → người tới sau vẫn đọc lại được từ đầu (replay). Cực nhanh vì chỉ ghi nối đuôi tuần tự.
- **RabbitMQ** = một **bưu cục thông minh** có nhân viên phân loại (exchange) định tuyến thư vào đúng ô (queue) theo quy tắc. Thư giao xong (ack) là **bỏ khỏi ô** — không lưu lại. Linh hoạt về định tuyến nhưng không phải chỗ để "đọc lại lịch sử".
- **Pulsar** = bưu cục thông minh **nhưng kho chứa nằm ở tòa nhà riêng** (Apache BookKeeper). Nhân viên xử lý (broker) và kho lưu (bookie) tách nhau → thêm nhân viên hay thêm kho độc lập; kho đầy thì đẩy phần cũ xuống hầm rẻ tiền (tiered storage, ví dụ S3).
- **NATS/JetStream** = một **người giao hàng chạy bộ siêu nhẹ**: gần như không cần cài đặt, độ trễ micro giây, hợp gọi nội bộ giữa microservice. JetStream là phần "có lưu và replay" gắn thêm để nó không chỉ là fire-and-forget.

Điểm mấu chốt: **không có hệ nào "tốt nhất"** — chúng tối ưu cho những đánh đổi khác nhau. Chọn sai là ép một con dao gọt hoa quả đi chặt củi.

### 2.2 Trục đánh đổi cốt lõi: Log-retained vs Broker-managed

Có một ranh giới kiến trúc chia bốn hệ thành hai nhóm tư duy:

<svg viewBox="0 0 680 250" role="img" aria-labelledby="ax-t ax-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="ax-t">Log-retained (Kafka, Pulsar) vs Broker-managed queue (RabbitMQ, NATS core)</title>
<desc id="ax-d">Bên trái mô hình log giữ lại message và consumer dùng offset; bên phải mô hình broker giữ queue và xóa message sau khi ack</desc>
<text x="170" y="22" text-anchor="middle" font-size="13" fill="currentColor">Log-retained (Kafka, Pulsar)</text>
<rect x="40" y="50" width="260" height="40" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<line x1="92" y1="50" x2="92" y2="90" stroke="currentColor" stroke-width="0.6"/>
<line x1="144" y1="50" x2="144" y2="90" stroke="currentColor" stroke-width="0.6"/>
<line x1="196" y1="50" x2="196" y2="90" stroke="currentColor" stroke-width="0.6"/>
<line x1="248" y1="50" x2="248" y2="90" stroke="currentColor" stroke-width="0.6"/>
<text x="66" y="75" text-anchor="middle" font-size="10" fill="currentColor">m0</text>
<text x="118" y="75" text-anchor="middle" font-size="10" fill="currentColor">m1</text>
<text x="170" y="75" text-anchor="middle" font-size="10" fill="currentColor">m2</text>
<text x="222" y="75" text-anchor="middle" font-size="10" fill="currentColor">m3</text>
<text x="274" y="75" text-anchor="middle" font-size="10" fill="currentColor">m4</text>
<text x="170" y="108" text-anchor="middle" font-size="10" fill="currentColor">message GIỮ LẠI theo retention (giờ/ngày/mãi mãi)</text>
<line x1="120" y1="118" x2="120" y2="150" stroke="currentColor" stroke-width="1" marker-end="url(#ar1)"/>
<text x="120" y="168" text-anchor="middle" font-size="9" fill="currentColor">offset=1</text>
<line x1="248" y1="118" x2="248" y2="150" stroke="currentColor" stroke-width="1" marker-end="url(#ar1)"/>
<text x="248" y="168" text-anchor="middle" font-size="9" fill="currentColor">offset=3</text>
<text x="170" y="192" text-anchor="middle" font-size="10" fill="currentColor">Consumer tự nhớ offset → REPLAY được</text>
<text x="510" y="22" text-anchor="middle" font-size="13" fill="currentColor">Broker-managed (RabbitMQ, NATS core)</text>
<rect x="400" y="50" width="220" height="40" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="440" y="75" text-anchor="middle" font-size="10" fill="currentColor">m3</text>
<text x="480" y="75" text-anchor="middle" font-size="10" fill="currentColor">m4</text>
<text x="520" y="75" text-anchor="middle" font-size="10" fill="currentColor">m5</text>
<text x="510" y="108" text-anchor="middle" font-size="10" fill="currentColor">queue: chỉ giữ message CHƯA xử lý</text>
<line x1="510" y1="118" x2="510" y2="150" stroke="currentColor" stroke-width="1" marker-end="url(#ar1)"/>
<rect x="452" y="152" width="116" height="30" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="510" y="171" text-anchor="middle" font-size="10" fill="currentColor">Consumer + ack</text>
<text x="510" y="200" text-anchor="middle" font-size="10" fill="currentColor">ack xong → XÓA, không replay</text>
<defs><marker id="ar1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Hiểu trục này là hiểu 80% quyết định:
- **Log-retained** (Kafka, Pulsar): message được **lưu lại** độc lập với việc ai đọc. Nhiều consumer group đọc cùng dữ liệu, mỗi group có offset riêng; đọc lại lịch sử (replay) là chuyện thường ngày. Trạng thái "đã đọc tới đâu" nằm ở **consumer**.
- **Broker-managed queue** (RabbitMQ, NATS core): broker giữ trạng thái từng message, giao xong + ack là **xóa**. Broker chủ động push, làm được routing tinh vi, priority, per-message TTL. Trạng thái nằm ở **broker**.

> Câu hỏi số 1 luôn hỏi: **"Tôi có cần đọc lại lịch sử / nhiều bên độc lập tiêu thụ cùng dữ liệu không?"** Có → nghiêng về log (Kafka/Pulsar). Không, chỉ cần "chia việc rồi quên" → nghiêng về queue (RabbitMQ/NATS).

### 2.3 Kafka — distributed commit log

**Bản chất**: một topic chia thành nhiều **partition**; mỗi partition là một file log append-only, replicate qua nhiều broker (leader + follower, ISR). Producer ghi nối đuôi; consumer đọc tuần tự theo **offset**.

- **Throughput cực cao**: ghi tuần tự trên đĩa + zero-copy + batch/compression. Một cluster tầm trung dễ đạt **hàng trăm nghìn tới hàng triệu msg/s**, băng thông GB/s.
- **Ordering theo partition**: chỉ đảm bảo thứ tự *trong một partition*. Muốn giữ thứ tự theo `user_id` → dùng nó làm partition key. Không có thứ tự tổng thể (global).
- **Retention & replay**: giữ theo thời gian/dung lượng (`retention.ms`) hoặc **log compaction** (giữ bản mới nhất mỗi key — nền của event sourcing/changelog). Consumer mới join có thể đọc từ `offset=0`.
- **Scale consumer = số partition**: parallelism tối đa của một consumer group = số partition. 12 partition → tối đa 12 consumer hoạt động song song.
- **Hợp cho**: streaming/analytics pipeline, event sourcing, CDC (Bài 11 Kafka Connect), log aggregation, metrics — nơi *dữ liệu là dòng chảy cần lưu & xử lý nhiều lần*.
- **Không hợp**: task queue cần priority/định tuyến phức tạp, RPC request-reply độ trễ thấp, hàng triệu queue nhỏ động (mô hình "một queue mỗi user").

```bash
# Tạo topic 12 partition, replication 3, giữ 7 ngày
kafka-topics.sh --create --topic orders \
  --partitions 12 --replication-factor 3 \
  --config retention.ms=604800000 \
  --bootstrap-server broker:9092

# Replay: consumer đọc lại TỪ ĐẦU (reset offset về earliest)
kafka-consumer-groups.sh --bootstrap-server broker:9092 \
  --group analytics --topic orders \
  --reset-offsets --to-earliest --execute
```

### 2.4 RabbitMQ — smart broker, dumb consumer

**Bản chất**: producer gửi tới **exchange**; exchange **định tuyến** message vào một hoặc nhiều **queue** theo binding + routing key; consumer nhận và **ack từng message**. Trí tuệ nằm ở broker (Bài 4–5).

- **Routing linh hoạt** — điểm mạnh không hệ nào theo kịp:
  - `direct`: khớp routing key chính xác.
  - `topic`: khớp pattern `order.*.vn`, `*.error`.
  - `fanout`: broadcast tất cả.
  - `headers`: định tuyến theo header.
- **Per-message control**: ack/nack/reject từng message, **priority queue**, per-message TTL, dead-letter exchange (DLX), delayed message. Đây là thứ log-based khó làm.
- **Delivery**: at-least-once mặc định; publisher confirms + consumer ack thủ công cho reliability. Push-based → độ trễ giao thấp khi có consumer sẵn.
- **Điểm yếu**: throughput thấp hơn Kafka đáng kể (chục nghìn msg/s/queue là vùng thoải mái); queue sâu (backlog lớn) làm giảm hiệu năng vì message nằm trong bộ nhớ/quản lý per-message; không có replay (ack là xóa). Quorum queue (Bài 5) tăng độ bền nhưng vẫn là mô hình queue.
- **Hợp cho**: **task/job queue** (gửi email, resize ảnh, xuất PDF), **RPC/request-reply**, workflow cần định tuyến/ưu tiên phức tạp, hệ có nhiều loại message với logic phân phối khác nhau.
- **Không hợp**: event sourcing, analytics cần đọc lại toàn bộ lịch sử, throughput streaming siêu cao.

```python
# RabbitMQ: topic exchange + routing linh hoạt + priority
channel.exchange_declare(exchange="orders", exchange_type="topic")
channel.queue_declare(queue="vn_orders", arguments={
    "x-max-priority": 10,                      # priority queue
    "x-dead-letter-exchange": "orders.dlx",    # DLX cho message lỗi
})
channel.queue_bind(queue="vn_orders", exchange="orders",
                   routing_key="order.*.vn")   # chỉ nhận đơn VN
channel.basic_publish(exchange="orders", routing_key="order.created.vn",
                      body=payload,
                      properties=pika.BasicProperties(priority=9))
```

### 2.5 Pulsar — tách compute và storage

**Bản chất**: **broker** (stateless, xử lý client) tách khỏi **storage** là Apache **BookKeeper** (các "bookie" lưu ledger). Broker không giữ dữ liệu → chết/restart/rebalance nhanh; muốn thêm dung lượng thì thêm bookie, muốn thêm throughput xử lý thì thêm broker — **scale hai chiều độc lập**.

<svg viewBox="0 0 620 250" role="img" aria-labelledby="pu-t pu-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="pu-t">Pulsar tách compute (broker) và storage (BookKeeper)</title>
<desc id="pu-d">Client nói chuyện với lớp broker stateless, broker ghi xuống lớp bookie BookKeeper, phần dữ liệu cũ đẩy xuống tiered storage như S3</desc>
<rect x="40" y="30" width="90" height="30" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="85" y="49" text-anchor="middle" font-size="10" fill="currentColor">Producer</text>
<rect x="490" y="30" width="90" height="30" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="535" y="49" text-anchor="middle" font-size="10" fill="currentColor">Consumer</text>
<rect x="140" y="90" width="340" height="44" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="310" y="108" text-anchor="middle" font-size="11" fill="currentColor">Broker layer (STATELESS — compute)</text>
<text x="310" y="124" text-anchor="middle" font-size="9" fill="currentColor">thêm broker = thêm throughput xử lý</text>
<line x1="100" y1="60" x2="180" y2="88" stroke="currentColor" stroke-width="1" marker-end="url(#ap1)"/>
<line x1="440" y1="88" x2="520" y2="60" stroke="currentColor" stroke-width="1" marker-end="url(#ap1)"/>
<rect x="140" y="158" width="340" height="44" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="310" y="176" text-anchor="middle" font-size="11" fill="currentColor">BookKeeper bookies (STATEFUL — storage)</text>
<text x="310" y="192" text-anchor="middle" font-size="9" fill="currentColor">thêm bookie = thêm dung lượng và bền</text>
<line x1="310" y1="134" x2="310" y2="156" stroke="currentColor" stroke-width="1.4" marker-end="url(#ap1)"/>
<rect x="205" y="216" width="210" height="26" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="310" y="233" text-anchor="middle" font-size="9" fill="currentColor">Tiered storage: đẩy segment cũ xuống S3/GCS (rẻ)</text>
<line x1="310" y1="202" x2="310" y2="214" stroke="currentColor" stroke-width="1" marker-end="url(#ap1)"/>
<defs><marker id="ap1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

- **Multi-tenancy nguyên bản**: cấu trúc `tenant/namespace/topic` với quota, ACL, isolation policy riêng từng tenant — hợp nền tảng dùng chung nhiều team/khách hàng.
- **Geo-replication tích hợp**: replicate topic giữa nhiều cluster/region ở tầng cấu hình, không cần công cụ ngoài (Kafka phải dùng MirrorMaker/Replicator).
- **Tiered storage**: tự động đẩy segment cũ xuống object storage (S3) → giữ dữ liệu "vô hạn" với chi phí thấp mà vẫn đọc lại được.
- **Hai kiểu API**: subscription **Exclusive/Failover/Shared/Key_Shared** — `Shared` cho phép chia tải kiểu queue *không* bị giới hạn "consumer ≤ partition" như Kafka; `Key_Shared` giữ ordering theo key mà vẫn nhiều consumer.
- **Cái giá**: vận hành **phức tạp hơn** — phải chạy thêm cụm BookKeeper và ZooKeeper/metadata, nhiều thành phần hơn Kafka. Cộng đồng/công cụ nhỏ hơn Kafka.
- **Hợp cho**: nền tảng multi-tenant lớn, cần cả queue lẫn streaming trong một hệ, geo-replication nhiều region, giữ dữ liệu lâu với tiered storage.
- **Không hợp**: đội nhỏ, use case đơn giản — độ phức tạp vận hành không đáng.

### 2.6 NATS / JetStream — siêu nhẹ, low-latency

**Bản chất**: **NATS core** là pub/sub fire-and-forget cực nhẹ (một binary Go ~15MB, không phụ thuộc), tối ưu **độ trễ thấp** và **thông lượng message nhỏ**. **JetStream** là lớp persistence gắn thêm: stream có lưu trữ, replay, consumer bền, exactly-once (dedup theo message ID).

- **Latency siêu thấp**: p99 thường **micro giây đến vài ms** trong mạng nội bộ — vì message nhỏ, giao thức tối giản, không nặng như JVM.
- **Mô hình subject phong phú**: subject phân cấp `orders.vn.created`, wildcard `orders.*.created`, `orders.>` — routing linh hoạt kiểu topic mà không cần khai báo exchange.
- **Request-reply nguyên bản**: NATS có primitive request/reply cực gọn → hợp làm **RPC nội bộ** giữa microservice.
- **JetStream** thêm: retention (limits/interest/workqueue), replay, ack policy, exactly-once publish (dedup window), mirror/source stream để nhân bản.
- **Vận hành nhẹ nhất nhóm**: dễ nhúng, dễ chạy edge/IoT, footprint nhỏ, cluster đơn giản (Raft cho JetStream).
- **Điểm yếu**: hệ sinh thái connector/analytics không sâu bằng Kafka; throughput bền vững cho message lớn/backlog khổng lồ không phải điểm mạnh nhất; JetStream trẻ hơn Kafka về "chiến trường thực tế" ở quy mô petabyte.
- **Hợp cho**: giao tiếp **microservice nội bộ**, service mesh messaging, **edge/IoT**, command/control độ trễ thấp, hệ cần footprint nhỏ.
- **Không hợp**: data lake/analytics lịch sử khổng lồ, hệ sinh thái streaming phức tạp (ksqlDB, Flink connector dày...).

```bash
# JetStream: tạo stream có lưu + replay, exactly-once qua dedup
nats stream add ORDERS \
  --subjects "orders.>" \
  --storage file --replicas 3 \
  --retention limits --max-age 168h \
  --dupe-window 2m          # cửa sổ khử trùng lặp theo Nats-Msg-Id

# Consumer bền, ack tường minh (giống queue workqueue)
nats consumer add ORDERS workers \
  --ack explicit --deliver all --max-deliver 5
```

---

## 3. Sáu tiêu chí quyết định

| Tiêu chí | Câu hỏi tự hỏi | Nghiêng về |
|----------|----------------|-----------|
| **Retention / replay** | Có cần đọc lại lịch sử, nhiều bên tiêu thụ độc lập? | Có → Kafka/Pulsar. Không → RabbitMQ/NATS |
| **Ordering** | Cần thứ tự? Theo key hay global? | Theo key → Kafka (partition key)/Pulsar (Key_Shared). Không cần → linh hoạt |
| **Throughput vs latency** | Ưu tiên GB/s hay p99 micro giây? | Throughput → Kafka/Pulsar. Latency thấp → NATS. Vừa → RabbitMQ |
| **Routing** | Định tuyến phức tạp, priority, per-message TTL? | Có → RabbitMQ (mạnh nhất), NATS subject. Không → Kafka |
| **Delivery** | At-least-once đủ hay cần exactly-once? | Exactly-once → Kafka (idempotent+tx), Pulsar, JetStream (dedup) |
| **Vận hành** | Đội bao lớn, chấp nhận phức tạp tới đâu? | Nhẹ nhất → NATS. Nặng nhất → Pulsar. Cloud-managed → SQS/MSK/EventBridge |

### 3.1 Con số tham khảo (bậc độ lớn, không phải tuyệt đối)

| Hệ | Throughput điển hình | Latency p99 điển hình | Retention/replay | Ordering |
|----|---------------------|----------------------|------------------|----------|
| **Kafka** | rất cao (100k–1M+ msg/s/cluster) | ms (2–10ms) | Có, cấu hình/log compaction | Theo partition |
| **RabbitMQ** | trung bình (10k–50k msg/s/queue) | thấp khi có consumer (sub-ms–ms) | Không (ack = xóa) | Theo queue (single active consumer) |
| **Pulsar** | rất cao, gần Kafka | ms | Có + tiered storage vô hạn | Partition / Key_Shared |
| **NATS core** | cao cho message nhỏ | **micro giây** | Không (core) | Không đảm bảo |
| **JetStream** | cao | thấp (ms) | Có, replay + dedup | Theo stream/subject |

> Cảnh báo: mọi benchmark phụ thuộc kích thước message, batching, ack mode, replication, phần cứng. Dùng bảng này để **định hướng**, luôn benchmark trên workload thật của bạn trước khi cam kết.

---

## 4. Decision matrix theo tình huống

| Tình huống thực tế | Chọn | Vì sao |
|--------------------|------|--------|
| Pipeline analytics/CDC, event sourcing, cần replay | **Kafka** | Log giữ lại + compaction + hệ sinh thái Connect/Streams/Flink |
| Task queue: gửi email, resize ảnh, xuất báo cáo | **RabbitMQ** | Per-message ack, priority, DLX, routing; không cần replay |
| RPC/request-reply nội bộ độ trễ thấp | **NATS** (hoặc RabbitMQ) | Request-reply nguyên bản, latency micro giây |
| Nền tảng dùng chung nhiều team/khách, nhiều region | **Pulsar** | Multi-tenancy + geo-replication + tiered storage sẵn |
| Microservice mesh, edge/IoT, footprint nhỏ | **NATS/JetStream** | Nhẹ, dễ nhúng, latency thấp |
| Giữ dữ liệu "vô hạn" chi phí thấp mà vẫn đọc lại | **Pulsar** (hoặc Kafka + tiered) | Tiered storage đẩy xuống S3 |
| Cần cả queue lẫn stream trong MỘT hệ | **Pulsar** | Shared subscription (queue) + replay (stream) |
| Đội nhỏ, muốn không phải tự vận hành broker | **SQS/SNS/EventBridge/MSK** (Bài 6) | Managed, giảm gánh vận hành |
| Định tuyến động hàng chục nghìn queue/user | **RabbitMQ** | Queue nhẹ, tạo động; Kafka bó buộc bởi số partition |
| Fan-out event cho nhiều consumer group độc lập | **Kafka/Pulsar** | Mỗi group offset riêng, đọc chung log |

### 4.1 Ba anti-pattern kinh điển

1. **Dùng Kafka làm task queue có priority**: Kafka không có priority per-message, không định tuyến động, parallelism bị chặn bởi số partition, và "một queue mỗi user" (hàng vạn queue nhỏ) là mô hình sai cho Kafka. → RabbitMQ.
2. **Dùng RabbitMQ để lưu event sourcing / replay**: ack là xóa; muốn "đọc lại 30 ngày event" phải tự bịa cơ chế lưu ngoài. → Kafka/Pulsar.
3. **Chọn Pulsar vì "nghe hiện đại"** khi chỉ có một team, một use case: gánh vận hành BookKeeper + metadata store không đáng. → Kafka hoặc NATS đơn giản hơn nhiều.

### 4.2 Khung ra quyết định nhanh (theo thứ tự câu hỏi)

<svg viewBox="0 0 640 300" role="img" aria-labelledby="dt-t dt-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="dt-t">Cây quyết định chọn hệ messaging theo câu hỏi</title>
<desc id="dt-d">Bắt đầu từ câu hỏi cần replay hay không, rồi tới routing, latency, multi-tenancy để dẫn tới Kafka, RabbitMQ, NATS hoặc Pulsar</desc>
<rect x="220" y="20" width="200" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="41" text-anchor="middle" font-size="11" fill="currentColor">Cần replay / nhiều consumer group?</text>
<line x1="270" y1="54" x2="150" y2="88" stroke="currentColor" stroke-width="1" marker-end="url(#ad1)"/>
<text x="195" y="74" text-anchor="middle" font-size="9" fill="currentColor">CÓ</text>
<line x1="370" y1="54" x2="470" y2="88" stroke="currentColor" stroke-width="1" marker-end="url(#ad1)"/>
<text x="440" y="74" text-anchor="middle" font-size="9" fill="currentColor">KHÔNG</text>
<rect x="40" y="90" width="220" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="150" y="111" text-anchor="middle" font-size="11" fill="currentColor">Multi-tenant / geo / lưu vô hạn?</text>
<line x1="110" y1="124" x2="80" y2="158" stroke="currentColor" stroke-width="1" marker-end="url(#ad1)"/>
<text x="82" y="144" text-anchor="middle" font-size="9" fill="currentColor">CÓ</text>
<line x1="190" y1="124" x2="230" y2="158" stroke="currentColor" stroke-width="1" marker-end="url(#ad1)"/>
<text x="228" y="144" text-anchor="middle" font-size="9" fill="currentColor">KHÔNG</text>
<rect x="30" y="160" width="100" height="30" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="179" text-anchor="middle" font-size="11" fill="currentColor">Pulsar</text>
<rect x="180" y="160" width="100" height="30" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="230" y="179" text-anchor="middle" font-size="11" fill="currentColor">Kafka</text>
<rect x="360" y="90" width="220" height="34" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="470" y="111" text-anchor="middle" font-size="11" fill="currentColor">Routing/priority phức tạp?</text>
<line x1="430" y1="124" x2="400" y2="158" stroke="currentColor" stroke-width="1" marker-end="url(#ad1)"/>
<text x="400" y="144" text-anchor="middle" font-size="9" fill="currentColor">CÓ</text>
<line x1="510" y1="124" x2="545" y2="158" stroke="currentColor" stroke-width="1" marker-end="url(#ad1)"/>
<text x="545" y="144" text-anchor="middle" font-size="9" fill="currentColor">KHÔNG</text>
<rect x="350" y="160" width="100" height="30" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="400" y="179" text-anchor="middle" font-size="11" fill="currentColor">RabbitMQ</text>
<rect x="495" y="160" width="120" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="555" y="181" text-anchor="middle" font-size="10" fill="currentColor">Latency micro giây?</text>
<line x1="540" y1="194" x2="510" y2="228" stroke="currentColor" stroke-width="1" marker-end="url(#ad1)"/>
<text x="510" y="214" text-anchor="middle" font-size="9" fill="currentColor">CÓ</text>
<line x1="575" y1="194" x2="575" y2="228" stroke="currentColor" stroke-width="1" marker-end="url(#ad1)"/>
<text x="600" y="214" text-anchor="middle" font-size="9" fill="currentColor">KHÔNG</text>
<rect x="455" y="230" width="100" height="30" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="505" y="249" text-anchor="middle" font-size="11" fill="currentColor">NATS</text>
<rect x="560" y="230" width="70" height="30" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="595" y="249" text-anchor="middle" font-size="9" fill="currentColor">RabbitMQ</text>
<text x="320" y="288" text-anchor="middle" font-size="9" fill="currentColor">Đội nhỏ, không muốn tự vận hành → cân nhắc bản managed (MSK / SQS / EventBridge)</text>
<defs><marker id="ad1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

---

## 5. Lưu ý thực chiến

- **Đừng chọn theo hype**: "ai cũng dùng Kafka" không phải lý do. Một hệ gửi 5.000 email/ngày không cần Kafka — RabbitMQ hay thậm chí SQS đơn giản và rẻ hơn nhiều.
- **Chi phí vận hành là chi phí thật**: Kafka/Pulsar cần đội hiểu ZooKeeper/KRaft/BookKeeper, monitoring, rebalance, disk. Nếu đội nhỏ → ưu tiên **managed** (MSK, Confluent Cloud, StreamNative, SQS/EventBridge) hoặc **NATS** (nhẹ nhất).
- **Có thể dùng nhiều hệ**: kiến trúc thực tế thường **kết hợp** — Kafka làm backbone streaming/analytics, RabbitMQ/NATS cho task queue & RPC nội bộ. Đừng ép một hệ gánh mọi vai.
- **Migration đắt**: chọn sai và đổi sau tốn kém (đổi client, semantics, ops). Bỏ công **benchmark + PoC** trên workload thật trước khi cam kết là rẻ nhất.
- **Xét delivery semantics thật sự cần** (Bài 2): nếu at-least-once + idempotent consumer là đủ thì đừng trả giá cho exactly-once.

---

## 6. Tóm tắt
- Bốn hệ chia hai nhóm tư duy: **log-retained** (Kafka, Pulsar — lưu lại, replay, offset ở consumer) vs **broker-managed queue** (RabbitMQ, NATS core — ack là xóa, routing/priority ở broker).
- **Kafka**: throughput rất cao, ordering theo partition, retention/replay, hệ sinh thái dày → streaming, event sourcing, analytics, CDC.
- **RabbitMQ**: routing linh hoạt nhất, per-message ack/priority/DLX → task queue, RPC, workflow phức tạp; không replay.
- **Pulsar**: tách compute–storage (BookKeeper), multi-tenancy, geo-replication, tiered storage → nền tảng dùng chung lớn, đa region, giữ dữ liệu lâu; đổi lại vận hành phức tạp.
- **NATS/JetStream**: siêu nhẹ, latency micro giây, request-reply → microservice nội bộ, edge/IoT; JetStream thêm lưu + replay + dedup.
- Quyết định theo **6 tiêu chí** (retention/replay, ordering, throughput vs latency, routing, delivery, vận hành) và **decision matrix** — không chọn theo hype; benchmark workload thật trước khi cam kết; dùng nhiều hệ nếu hợp.

> **Bài tiếp theo:** ghép các mảnh lại thành kiến trúc event-driven hoàn chỉnh — chọn hệ đúng chỉ là bước đầu, thiết kế schema, versioning và observability mới giữ hệ sống lâu.
