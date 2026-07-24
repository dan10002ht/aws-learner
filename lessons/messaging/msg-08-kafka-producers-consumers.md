# Bài 8 — Kafka producer, consumer group & rebalance

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **producer chọn partition thế nào**: theo key (hash) → cùng key vào cùng partition → **giữ thứ tự per-key**.
- Cân đối **acks=0/1/all** giữa durability và latency, và cấu hình cho đúng `min.insync.replicas`.
- Tối ưu throughput bằng **batching + linger.ms + compression** mà không phá vỡ latency SLA.
- Bật **idempotent producer** để tránh trùng khi retry, và hiểu vì sao nó cần thiết.
- Nắm **consumer group**: mỗi partition chỉ **một** consumer trong group → số partition là **trần song song**.
- Hiểu **rebalance** (stop-the-world vs cooperative), **assignment strategy**, và **offset commit** (auto/manual) quyết định **at-least-once vs at-most-once**.

---

## 2. Lý thuyết

### 2.1 Nhắc lại nền: topic là log chia thành partition

Một Kafka **topic** không phải một hàng đợi duy nhất — nó bị chẻ thành nhiều **partition**, mỗi partition là một **append-only log** có thứ tự riêng, đánh số bằng **offset** (0, 1, 2, ...). Thứ tự **chỉ được đảm bảo trong phạm vi một partition**, không phải toàn topic. Đây là điểm gốc rễ chi phối *toàn bộ* hành vi producer và consumer bên dưới: producer quyết định message rơi vào partition nào, consumer group quyết định ai đọc partition nào.

Analogy: topic giống một **dãy quầy thu ngân** trong siêu thị. Mỗi quầy (partition) phục vụ khách theo đúng thứ tự họ xếp hàng, nhưng giữa các quầy thì không có "thứ tự chung". Muốn một khách hàng (cùng key) luôn được cùng một quầy phục vụ để giữ trình tự, ta phải có quy tắc phân làn cố định.

---

### 2.2 Producer: chọn partition theo key

Khi bạn gửi một `ProducerRecord(topic, key, value)`, partitioner mặc định quyết định partition:

- **Có key** → `partition = hash(key) % numPartitions` (Kafka hiện dùng murmur2 trên bytes của key). Cùng một key → luôn cùng một partition → **các message cùng key được giữ đúng thứ tự tương đối**.
- **Không key** → phân bổ đều (sticky partitioner: gom vào một partition đến khi batch đầy rồi đổi, để batch to hơn), **không có đảm bảo thứ tự** giữa các message.

Đây là công cụ chính để có **ordering per-entity**: dùng `orderId` (hoặc `userId`, `accountId`) làm key thì mọi event của cùng một đơn hàng nằm chung partition, xử lý tuần tự đúng như xảy ra.

<svg viewBox="0 0 640 260" role="img" aria-labelledby="pk-t pk-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="pk-t">Producer băm key để chọn partition</title>
<desc id="pk-d">Các message cùng key được hash vào cùng một partition nên giữ nguyên thứ tự, key khác rơi vào partition khác</desc>
<rect x="20" y="30" width="120" height="200" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="52" text-anchor="middle" font-size="12" fill="currentColor">Producer</text>
<text x="80" y="80" text-anchor="middle" font-size="10" fill="currentColor">key=A v1</text>
<text x="80" y="100" text-anchor="middle" font-size="10" fill="currentColor">key=B v1</text>
<text x="80" y="120" text-anchor="middle" font-size="10" fill="currentColor">key=A v2</text>
<text x="80" y="140" text-anchor="middle" font-size="10" fill="currentColor">key=A v3</text>
<text x="80" y="160" text-anchor="middle" font-size="10" fill="currentColor">key=B v2</text>
<text x="80" y="196" text-anchor="middle" font-size="10" fill="currentColor">hash(key)</text>
<text x="80" y="212" text-anchor="middle" font-size="10" fill="currentColor">% numParts</text>
<line x1="140" y1="110" x2="230" y2="80" stroke="currentColor" stroke-width="1.2" marker-end="url(#pm)"/>
<line x1="140" y1="130" x2="230" y2="180" stroke="currentColor" stroke-width="1.2" marker-end="url(#pm)"/>
<rect x="235" y="55" width="370" height="50" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="255" y="45" text-anchor="middle" font-size="10" fill="currentColor">Partition 0</text>
<text x="290" y="85" text-anchor="middle" font-size="10" fill="currentColor">A v1</text>
<text x="360" y="85" text-anchor="middle" font-size="10" fill="currentColor">A v2</text>
<text x="430" y="85" text-anchor="middle" font-size="10" fill="currentColor">A v3</text>
<text x="560" y="85" text-anchor="middle" font-size="9" fill="currentColor">→ đúng thứ tự A</text>
<rect x="235" y="155" width="370" height="50" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="255" y="145" text-anchor="middle" font-size="10" fill="currentColor">Partition 1</text>
<text x="290" y="185" text-anchor="middle" font-size="10" fill="currentColor">B v1</text>
<text x="360" y="185" text-anchor="middle" font-size="10" fill="currentColor">B v2</text>
<text x="555" y="185" text-anchor="middle" font-size="9" fill="currentColor">→ đúng thứ tự B</text>
<defs><marker id="pm" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

> ⚠️ **Bẫy số partition**: thứ tự per-key chỉ vững nếu **số partition không đổi**. Tăng partition sau này → `hash(key) % N` đổi → key cũ có thể nhảy sang partition khác, phá thứ tự lịch sử. Vì vậy chọn số partition **rộng rãi từ đầu** hoặc dùng custom partitioner ổn định.

---

### 2.3 acks: đánh đổi durability ↔ latency

`acks` quy định producer coi là "đã ghi thành công" khi nào — leader và các follower replica đã nhận tới đâu:

| `acks` | Chờ đến khi | Durability | Latency | Rủi ro |
|--------|-------------|-----------|---------|--------|
| **0** | Gửi xong, **không chờ** ack | Thấp nhất | Thấp nhất | Mất message nếu leader chưa nhận (fire-and-forget) |
| **1** | **Leader** ghi xong | Trung bình | Trung bình | Mất nếu leader chết **trước khi** follower kịp sao chép |
| **all** (-1) | **Mọi in-sync replica** (ISR) ghi xong | Cao nhất | Cao nhất | Không mất khi còn ≥1 ISR sống |

`acks=all` chỉ thực sự an toàn khi đi kèm broker config **`min.insync.replicas=2`** (với replication factor 3). Nếu `min.insync.replicas=1`, "all" suy biến gần như "1" vì ISR có thể co lại còn mình leader. Bộ ba chuẩn cho dữ liệu quan trọng: **RF=3, min.insync.replicas=2, acks=all** — chịu được mất 1 broker mà không mất dữ liệu, vẫn ghi được.

```properties
# broker (server.properties) — áp cho topic dữ liệu quan trọng
default.replication.factor=3
min.insync.replicas=2
```

```java
Properties p = new Properties();
p.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "broker1:9092,broker2:9092");
p.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
p.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
p.put(ProducerConfig.ACKS_CONFIG, "all");           // chờ mọi ISR → không mất dữ liệu
p.put(ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE); // retry khi lỗi tạm thời
p.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 120000); // trần tổng thời gian gửi
```

---

### 2.4 Batching, linger.ms & compression — throughput

Producer **không gửi từng message một** qua mạng (sẽ tốn round-trip khủng khiếp). Nó gom message theo partition vào **batch** trong bộ nhớ rồi gửi cả cụm. Ba núm điều khiển:

- **`batch.size`** (bytes): kích thước tối đa một batch cho mỗi partition. Đầy batch → gửi ngay.
- **`linger.ms`**: chờ thêm tối đa bấy nhiêu ms để batch gom được nhiều hơn, *dù chưa đầy*. `linger.ms=0` (mặc định) = gửi ngay khi có thể → latency thấp nhưng batch nhỏ. Đặt `linger.ms=5..20` đánh đổi vài ms latency lấy batch to hơn → throughput cao hơn, nén tốt hơn.
- **`compression.type`**: `none | gzip | snappy | lz4 | zstd`. Nén **cả batch** (nén nhiều message chung → tỉ lệ nén tốt hơn nén lẻ). **lz4/zstd** thường là điểm ngọt: giảm mạnh băng thông và dung lượng đĩa với CPU vừa phải.

```java
p.put(ProducerConfig.BATCH_SIZE_CONFIG, 64 * 1024);   // 64 KB mỗi batch/partition
p.put(ProducerConfig.LINGER_MS_CONFIG, 10);           // chờ tối đa 10ms gom batch
p.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "lz4"); // nén cả batch
p.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 64 * 1024 * 1024); // 64MB buffer chờ gửi
```

Trực giác: `linger.ms` biến "gửi lắt nhắt" thành "gửi theo chuyến". Giống xe buýt đợi thêm vài giây để đón nhiều khách — mỗi khách trễ chút nhưng tổng số người chở/giờ tăng vọt. Với tải cao, `linger.ms` vài ms + compression có thể tăng throughput nhiều lần và giảm dung lượng lưu trữ 3–5 lần.

---

### 2.5 Idempotent producer — retry mà không nhân đôi

Vấn đề: producer gửi batch, broker ghi xong nhưng **ack bị mất trên đường về**. Producer tưởng lỗi → **retry** → message ghi **hai lần**. Retry + at-least-once vốn dĩ gây trùng.

**Idempotent producer** giải quyết tận gốc: mỗi producer được cấp một **PID (producer id)** và gắn **sequence number** tăng dần cho từng message trên mỗi partition. Broker nhớ sequence cuối cùng đã ghi cho `(PID, partition)`; nếu thấy message tới có sequence **đã ghi rồi** (do retry) → **loại bỏ trùng**, vẫn trả ack. Nhờ đó retry an toàn: **exactly-once trong phạm vi một session gửi tới Kafka**.

```java
p.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
// Bật idempotence tự động ép: acks=all, retries>0,
// max.in.flight.requests.per.connection<=5 (vẫn giữ thứ tự nhờ sequence number)
```

Lưu ý phạm vi: idempotence chống trùng **do retry của chính producer**, **không** chống trùng do *ứng dụng gửi lại* sau khi restart (PID mới). Muốn exactly-once xuyên nhiều topic/ghi kèm consume → cần **transactions** (`transactional.id`), là chủ đề nâng cao. Với hầu hết hệ thống, bật `enable.idempotence=true` (mặc định đã bật từ Kafka 3.0) là đủ và **nên luôn bật**.

---

### 2.6 Consumer group: song song bị chặn bởi số partition

Nhiều consumer cùng đặt **`group.id`** giống nhau tạo thành một **consumer group**. Kafka **phân chia partition** cho các thành viên: **mỗi partition được gán cho đúng một consumer trong group**. Hệ quả cốt lõi:

> Số consumer *hoạt động thực sự* trong một group **không thể vượt số partition**. Có 6 partition thì tối đa 6 consumer chạy song song; consumer thứ 7 trở đi **ngồi không** (idle), chờ chỗ trống.

Đây là lý do số partition = **trần độ song song** của một group. Muốn scale consume lên gấp đôi → phải có đủ partition. Ngược lại, *nhiều group khác nhau* mỗi group nhận **đủ bản sao** dữ liệu (mỗi group có offset riêng) — chính là pub/sub chồng lên queue.

<svg viewBox="0 0 640 250" role="img" aria-labelledby="cg-t cg-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="cg-t">Gán partition cho consumer trong group</title>
<desc id="cg-d">Bốn partition chia cho ba consumer, mỗi partition đúng một consumer, consumer thứ tư sẽ ngồi không nếu chỉ có bốn partition</desc>
<text x="90" y="24" text-anchor="middle" font-size="12" fill="currentColor">Topic (4 partition)</text>
<rect x="20" y="40" width="140" height="30" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="60" text-anchor="middle" font-size="10" fill="currentColor">P0</text>
<rect x="20" y="80" width="140" height="30" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="100" text-anchor="middle" font-size="10" fill="currentColor">P1</text>
<rect x="20" y="120" width="140" height="30" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="140" text-anchor="middle" font-size="10" fill="currentColor">P2</text>
<rect x="20" y="160" width="140" height="30" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="180" text-anchor="middle" font-size="10" fill="currentColor">P3</text>
<line x1="160" y1="55" x2="420" y2="70" stroke="currentColor" stroke-width="1.2" marker-end="url(#cm)"/>
<line x1="160" y1="95" x2="420" y2="80" stroke="currentColor" stroke-width="1.2" marker-end="url(#cm)"/>
<line x1="160" y1="135" x2="420" y2="140" stroke="currentColor" stroke-width="1.2" marker-end="url(#cm)"/>
<line x1="160" y1="175" x2="420" y2="205" stroke="currentColor" stroke-width="1.2" marker-end="url(#cm)"/>
<text x="500" y="24" text-anchor="middle" font-size="12" fill="currentColor">Group "orders"</text>
<rect x="425" y="55" width="150" height="40" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="500" y="79" text-anchor="middle" font-size="10" fill="currentColor">Consumer 1 (P0, P1)</text>
<rect x="425" y="120" width="150" height="40" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="500" y="144" text-anchor="middle" font-size="10" fill="currentColor">Consumer 2 (P2)</text>
<rect x="425" y="185" width="150" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="500" y="209" text-anchor="middle" font-size="10" fill="currentColor">Consumer 3 (P3)</text>
<defs><marker id="cm" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

```java
Properties c = new Properties();
c.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "broker1:9092");
c.put(ConsumerConfig.GROUP_ID_CONFIG, "orders");      // cùng group.id = cùng group
c.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
c.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
c.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest"); // group mới đọc từ đầu
```

---

### 2.7 Rebalance: chia lại partition khi thành viên đổi

Khi một consumer **join** (scale up), **leave/crash** (scale down, chết), hoặc topic **thêm partition**, group phải **chia lại** partition cho các thành viên còn lại — đó là **rebalance**.

**Eager rebalance (kiểu cũ, "stop-the-world")**: *tất cả* consumer **nhả hết** partition đang giữ, dừng xử lý, rồi mới nhận lại phân công mới. Cả group "đóng băng" vài giây → **latency spike**, đặc biệt đau khi group lớn và một consumer restart thường xuyên.

**Cooperative (incremental) rebalance (`CooperativeStickyAssignor`, mặc định các bản mới)**: chỉ **những partition cần đổi chủ** mới bị thu hồi; consumer nào giữ nguyên phân công thì **tiếp tục xử lý không gián đoạn**. Rebalance diễn ra theo nhiều vòng nhỏ, tránh stop-the-world. Đây là lựa chọn nên dùng cho production.

<svg viewBox="0 0 640 210" role="img" aria-labelledby="rb-t rb-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="rb-t">Eager vs cooperative rebalance</title>
<desc id="rb-d">Eager thu hồi toàn bộ partition làm cả group dừng, cooperative chỉ chuyển những partition cần đổi nên phần còn lại vẫn chạy</desc>
<text x="160" y="22" text-anchor="middle" font-size="12" fill="currentColor">Eager (stop-the-world)</text>
<rect x="30" y="40" width="120" height="130" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="70" text-anchor="middle" font-size="10" fill="currentColor">1. Nhả HẾT</text>
<text x="90" y="95" text-anchor="middle" font-size="10" fill="currentColor">2. Cả group</text>
<text x="90" y="112" text-anchor="middle" font-size="10" fill="currentColor">DỪNG xử lý</text>
<text x="90" y="140" text-anchor="middle" font-size="10" fill="currentColor">3. Nhận lại</text>
<text x="90" y="158" text-anchor="middle" font-size="10" fill="currentColor">phân công mới</text>
<text x="480" y="22" text-anchor="middle" font-size="12" fill="currentColor">Cooperative (incremental)</text>
<rect x="360" y="40" width="120" height="130" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="420" y="70" text-anchor="middle" font-size="10" fill="currentColor">Chỉ thu hồi</text>
<text x="420" y="88" text-anchor="middle" font-size="10" fill="currentColor">partition cần đổi</text>
<rect x="495" y="40" width="120" height="130" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="555" y="88" text-anchor="middle" font-size="10" fill="currentColor">Phần còn lại</text>
<text x="555" y="106" text-anchor="middle" font-size="10" fill="currentColor">VẪN chạy</text>
<text x="555" y="124" text-anchor="middle" font-size="10" fill="currentColor">liên tục</text>
</svg>

**Giảm đau rebalance trong thực tế**:
- Dùng **static membership** (`group.instance.id`): consumer restart nhanh (rolling deploy) **không** kích hoạt rebalance nếu quay lại trong `session.timeout.ms`.
- Chỉnh `session.timeout.ms` / `heartbeat.interval.ms` hợp lý để không bị đá nhầm khi GC pause.
- Giữ **`max.poll.interval.ms`** đủ lớn so với thời gian xử lý một batch — nếu xử lý lâu hơn ngưỡng này, broker tưởng consumer chết và rebalance.

```java
c.put(ConsumerConfig.PARTITION_ASSIGNMENT_STRATEGY_CONFIG,
      "org.apache.kafka.clients.consumer.CooperativeStickyAssignor");
c.put(ConsumerConfig.GROUP_INSTANCE_ID_CONFIG, "consumer-pod-3"); // static membership
c.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, 45000);
c.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, 300000); // trần thời gian xử lý 1 batch
```

**Assignment strategy** (ai giữ partition nào): `RangeAssignor` (chia theo dải, dễ lệch tải khi nhiều topic), `RoundRobinAssignor` (rải đều), `StickyAssignor` / `CooperativeStickyAssignor` (rải đều **và** cố giữ nguyên phân công cũ để ít xáo trộn). Production nên dùng cooperative sticky.

---

### 2.8 Offset commit: at-least-once vs at-most-once

Consumer đọc tới đâu được ghi lại bằng **committed offset** (lưu ở topic nội bộ `__consumer_offsets`). Khi rebalance hoặc restart, consumer đọc **tiếp** từ committed offset. **Thời điểm commit** so với **thời điểm xử lý xong** quyết định semantics:

| Chiến lược | Trình tự | Semantics | Khi lỗi giữa chừng |
|-----------|----------|-----------|--------------------|
| Commit **sau** khi xử lý | xử lý → commit | **at-least-once** | Xử lý xong nhưng chưa commit → đọc lại → **xử lý lặp** (cần idempotent) |
| Commit **trước** khi xử lý | commit → xử lý | **at-most-once** | Commit rồi crash trước khi xử lý → **mất message** |

**Auto commit** (`enable.auto.commit=true`) commit định kỳ mỗi `auto.commit.interval.ms` (mặc định 5s) **ở nền**, không liên quan tới việc bạn đã xử lý xong hay chưa → nguy hiểm: có thể commit **trước** khi xử lý xong (mất khi crash) *hoặc* xử lý xong nhưng chưa kịp commit (lặp). Với dữ liệu quan trọng nên **tắt auto commit** và commit **thủ công sau khi xử lý** để có at-least-once tường minh, rồi làm **consumer idempotent** (đã học ở Bài 2).

```java
// AT-LEAST-ONCE tường minh: tắt auto commit, commit thủ công SAU khi xử lý
c.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
c.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 500); // số record tối đa mỗi lần poll

try (KafkaConsumer<String,String> consumer = new KafkaConsumer<>(c)) {
    consumer.subscribe(List.of("orders"));
    while (running) {
        ConsumerRecords<String,String> records = consumer.poll(Duration.ofMillis(500));
        for (ConsumerRecord<String,String> r : records) {
            process(r);            // 1) XỬ LÝ trước (idempotent theo r.key())
        }
        consumer.commitSync();     // 2) chỉ commit khi cả batch đã xử lý xong
    }                              //    crash giữa chừng → đọc lại batch → an toàn nhờ idempotent
}
```

Muốn giảm latency commit mà vẫn an toàn: dùng `commitAsync()` trong vòng lặp và một `commitSync()` cuối cùng ở `finally` để chốt chắc trước khi đóng. Với xử lý per-partition chính xác, có thể commit theo `Map<TopicPartition, OffsetAndMetadata>` từng partition thay vì cả batch.

```java
// commitAsync cho throughput + commitSync khi đóng để chốt chắc
try {
    while (running) {
        var records = consumer.poll(Duration.ofMillis(500));
        records.forEach(this::process);
        consumer.commitAsync();          // nhanh, không chặn vòng lặp
    }
} finally {
    consumer.commitSync();               // chốt offset cuối trước khi thoát
    consumer.close();                    // đóng "sạch" → chủ động rời group, rebalance nhanh
}
```

> **Nguyên tắc vàng**: at-most-once gần như không ai muốn (mất dữ liệu âm thầm). Mặc định nên chọn **at-least-once (commit sau xử lý) + consumer idempotent**. "Exactly-once" đầu-cuối chỉ đạt được với Kafka **transactions** (read-process-write nguyên tử), là chủ đề nâng cao.

---

## 3. Bảng núm chỉnh nhanh

| Mục tiêu | Chỉnh gì |
|----------|----------|
| Không mất dữ liệu | `acks=all` + RF=3 + `min.insync.replicas=2` + `enable.idempotence=true` |
| Throughput cao | `linger.ms=10-20`, `batch.size` lớn, `compression.type=lz4/zstd` |
| Ordering per-entity | Đặt **key** = id thực thể; giữ **số partition cố định** |
| Song song cao | Tăng **số partition** (trần = số consumer chạy được) |
| Rebalance ít đau | `CooperativeStickyAssignor` + **static membership** |
| At-least-once tường minh | `enable.auto.commit=false`, `commitSync()` **sau** khi xử lý |

---

## 4. Tóm tắt
- Producer chọn partition **theo hash(key)** → cùng key vào cùng partition → **giữ thứ tự per-key**; không key thì rải đều, không đảm bảo thứ tự.
- **acks** đánh đổi durability↔latency: `0` nhanh-dễ-mất, `1` vừa, `all` an toàn nhất (đi kèm `min.insync.replicas=2`, RF=3).
- **Batching + linger.ms + compression** đổi vài ms latency lấy throughput lớn và tiết kiệm băng thông/đĩa.
- **Idempotent producer** (PID + sequence) chống trùng do retry — nên luôn bật.
- **Consumer group**: mỗi partition đúng một consumer → **số partition là trần song song**.
- **Rebalance** khi thành viên đổi: **cooperative** thay vì **stop-the-world**; giảm đau bằng static membership và timeout hợp lý.
- **Offset commit** định đoạt semantics: commit **sau** xử lý = **at-least-once** (nên dùng, kèm idempotent); commit **trước** = at-most-once (dễ mất).

> **Bài tiếp theo (Bài 9):** đảm bảo **exactly-once** thực sự với Kafka **transactions** và mẫu **read-process-write** — nối liền producer idempotent với offset commit nguyên tử.
