# Bài 10 — Kafka delivery: exactly-once & ordering

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **vì sao ordering chỉ được đảm bảo trong một partition**, không bao giờ cross-partition — và chọn key cho đúng.
- Hiểu bản chất **idempotent producer**: producer id + **sequence number** khử được message ghi trùng khi producer retry.
- Nắm **Kafka transactions**: ghi **atomic** nhiều partition, commit offset chung một transaction → mẫu **consume-transform-produce** đạt **exactly-once** (EOS) *trong biên Kafka*.
- Cấu hình đúng: `transactional.id`, `enable.idempotence`, và phía consumer **`isolation.level=read_committed`**.
- Nhìn rõ **giới hạn**: exactly-once end-to-end **rất khó ở biên ngoài Kafka** (sink external), và khi nào thực sự cần EOS so với **at-least-once + idempotent consumer**.

---

## 2. Lý thuyết

### 2.1 Ordering: chỉ trong một partition, không hơn

Hãy nhớ lại Bài 7: một topic gồm nhiều **partition**, mỗi partition là một **commit log** riêng đánh **offset** tăng dần. Kafka đảm bảo **thứ tự tuyệt đối bên trong một partition**: message ghi trước có offset nhỏ hơn, và mọi consumer đọc partition đó **luôn thấy đúng thứ tự** 0, 1, 2, 3...

Nhưng **giữa các partition thì KHÔNG có thứ tự toàn cục**. Ba partition là ba log độc lập, ghi song song trên các broker khác nhau. Không có đồng hồ chung nào nói "message ở P0 offset 5 xảy ra trước hay sau message ở P1 offset 2". Đây không phải khiếm khuyết — đó chính là **cái giá của việc scale ngang**: muốn xử lý song song trên N partition thì phải từ bỏ thứ tự toàn cục.

<svg viewBox="0 0 660 250" role="img" aria-labelledby="ord-t ord-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="ord-t">Ordering đảm bảo trong partition nhưng không cross-partition</title>
<desc id="ord-d">Cùng key đi vào cùng một partition giữ đúng thứ tự; các key khác nhau rải ra nhiều partition và mất thứ tự tương đối giữa chúng</desc>
<text x="330" y="22" text-anchor="middle" font-size="14" fill="currentColor">Cùng key A giữ thứ tự; giữa các partition thì không</text>
<rect x="30" y="45" width="80" height="120" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="70" y="70" text-anchor="middle" font-size="11" fill="currentColor">Producer</text>
<text x="70" y="90" text-anchor="middle" font-size="9" fill="currentColor">key=A: a1,a2,a3</text>
<text x="70" y="106" text-anchor="middle" font-size="9" fill="currentColor">key=B: b1,b2</text>
<text x="70" y="122" text-anchor="middle" font-size="9" fill="currentColor">hash(key)</text>
<text x="70" y="138" text-anchor="middle" font-size="9" fill="currentColor">% partitions</text>
<line x1="110" y1="90" x2="250" y2="80" stroke="currentColor" stroke-width="1" marker-end="url(#ao)"/>
<line x1="110" y1="120" x2="250" y2="150" stroke="currentColor" stroke-width="1" marker-end="url(#ao)"/>
<text x="270" y="60" font-size="11" fill="currentColor">P0 (chứa mọi message key=A)</text>
<rect x="255" y="70" width="40" height="26" rx="3" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="275" y="87" text-anchor="middle" font-size="9" fill="currentColor">a1</text>
<rect x="297" y="70" width="40" height="26" rx="3" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="317" y="87" text-anchor="middle" font-size="9" fill="currentColor">a2</text>
<rect x="339" y="70" width="40" height="26" rx="3" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="359" y="87" text-anchor="middle" font-size="9" fill="currentColor">a3</text>
<text x="390" y="87" font-size="9" fill="currentColor">→ đúng thứ tự a1&lt;a2&lt;a3</text>
<text x="270" y="135" font-size="11" fill="currentColor">P1 (chứa mọi message key=B)</text>
<rect x="255" y="145" width="40" height="26" rx="3" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/><text x="275" y="162" text-anchor="middle" font-size="9" fill="currentColor">b1</text>
<rect x="297" y="145" width="40" height="26" rx="3" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/><text x="317" y="162" text-anchor="middle" font-size="9" fill="currentColor">b2</text>
<text x="390" y="162" font-size="9" fill="currentColor">→ đúng thứ tự b1&lt;b2</text>
<text x="330" y="205" text-anchor="middle" font-size="11" fill="currentColor">Nhưng a2 so với b1: KHÔNG có thứ tự xác định (khác partition)</text>
<text x="330" y="228" text-anchor="middle" font-size="10" fill="currentColor">Muốn giữ thứ tự cho một thực thể → cho nó CÙNG key</text>
<defs><marker id="ao" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Hệ quả thực hành số một:** message vào partition nào là do **key** quyết định — mặc định `partition = hash(key) % số_partition`. Vậy muốn mọi sự kiện của **cùng một thực thể** giữ đúng thứ tự (mọi event của `order-123`, mọi thao tác của `account-42`), bạn phải cho chúng **cùng một key**. Cùng key → cùng partition → đúng thứ tự. Nếu để `key = null`, Kafka rải message quanh các partition (sticky/round-robin) và bạn **mất mọi đảm bảo thứ tự**.

> **Quy tắc vàng:** đơn vị thứ tự = partition; đơn vị thứ tự nghiệp vụ = **key**. Chọn key theo thực thể cần giữ trình tự (userId, orderId, accountId), đừng chọn key có cardinality quá thấp (dồn hết vào 1 partition → mất song song) hay quá "ngẫu nhiên" (phá thứ tự nghiệp vụ).

### 2.2 Vì sao retry sinh ra bản ghi trùng

Giờ tới chuyện **duplicate**. Producer gửi một batch tới broker, broker **ghi xong xuống log và replicate**, rồi gửi `ack` về. Nhưng nếu **`ack` bị mất trên đường về** (network chớp, broker rớt đúng lúc), producer **không biết** message đã được ghi hay chưa. Theo cấu hình `retries > 0`, nó **gửi lại**. Kết quả: message **đã nằm trong log**, nay bị ghi **thêm một lần nữa** → **trùng**.

Đây chính là ranh giới **at-least-once**: để không mất message, ta chấp nhận có thể gửi lại → có thể trùng. Câu hỏi của bài này: làm sao vừa **không mất** vừa **không trùng**?

### 2.3 Idempotent producer: sequence number khử trùng

Kafka giải bài toán trên bằng **idempotent producer**. Khi bật `enable.idempotence=true` (mặc định true từ Kafka 3.0), mỗi producer được cấp một **Producer ID (PID)**, và mỗi message trong mỗi partition được gắn một **sequence number** tăng dần liên tục: 0, 1, 2, 3...

Broker **ghi nhớ sequence number cuối cùng** nó đã chấp nhận cho từng `(PID, partition)`. Khi một batch tới:
- Nếu sequence **đúng bằng cái broker mong đợi** (last + 1) → ghi.
- Nếu sequence **nhỏ hơn hoặc bằng** cái đã ghi → đây là **retry của message đã ghi** → broker **âm thầm bỏ qua** và vẫn trả `ack` thành công. Producer yên tâm, log **không có bản trùng**.
- Nếu sequence **nhảy cóc** (lớn hơn mong đợi + 1) → có message bị mất giữa chừng → broker trả lỗi `OutOfOrderSequenceException` (để lộ vấn đề thay vì âm thầm sai).

<svg viewBox="0 0 660 230" role="img" aria-labelledby="idm-t idm-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="idm-t">Idempotent producer dùng PID và sequence number để loại retry trùng</title>
<desc id="idm-d">Broker ghi nhớ sequence đã nhận; một retry mang sequence cũ bị nhận diện và bỏ qua nên log không có bản trùng</desc>
<rect x="20" y="40" width="90" height="140" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="65" y="62" text-anchor="middle" font-size="11" fill="currentColor">Producer</text>
<text x="65" y="80" text-anchor="middle" font-size="9" fill="currentColor">PID=7</text>
<text x="130" y="78" font-size="9" fill="currentColor">seq=5 (msg mới)</text>
<line x1="110" y1="85" x2="400" y2="85" stroke="currentColor" stroke-width="1" marker-end="url(#ai)"/>
<text x="130" y="128" font-size="9" fill="currentColor">ack mất → gửi LẠI seq=5</text>
<line x1="110" y1="135" x2="400" y2="135" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3" marker-end="url(#ai)"/>
<rect x="405" y="40" width="235" height="150" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="522" y="62" text-anchor="middle" font-size="11" fill="currentColor">Broker (leader của partition)</text>
<text x="522" y="84" text-anchor="middle" font-size="9" fill="currentColor">nhớ: (PID=7) → last seq = 5</text>
<text x="522" y="108" text-anchor="middle" font-size="9" fill="currentColor">seq=5 lần 1: = mong đợi → GHI</text>
<text x="522" y="130" text-anchor="middle" font-size="9" fill="currentColor">seq=5 lần 2: ≤ đã ghi → BỎ QUA</text>
<text x="522" y="152" text-anchor="middle" font-size="9" fill="currentColor">vẫn trả ack OK</text>
<text x="522" y="176" text-anchor="middle" font-size="10" fill="currentColor">→ log chỉ có MỘT bản, không trùng</text>
<text x="330" y="216" text-anchor="middle" font-size="10" fill="currentColor">Idempotence = "gửi lại bao nhiêu lần cũng chỉ ghi một lần" (per producer session)</text>
<defs><marker id="ai" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Idempotent producer còn giữ **thứ tự khi có retry** ngay cả khi `max.in.flight.requests.per.connection` tới 5 — broker dùng sequence để sắp lại đúng trình tự trước khi ghi. (Không bật idempotence mà cho in-flight > 1 + retries > 0 thì một batch fail-retry có thể bị ghi **sau** batch kế → **đảo thứ tự**.)

**Giới hạn quan trọng:** idempotence chỉ đảm bảo **không trùng trong phạm vi MỘT partition và MỘT phiên producer**. Nó **không** chống trùng khi: (a) producer restart (PID mới) rồi gửi lại cùng dữ liệu ứng dụng; (b) bạn ghi cùng logic ra **nhiều partition** và cần "tất cả cùng thành công hoặc cùng không". Cho (b) ta cần **transactions**.

### 2.4 Cấu hình idempotent producer

```properties
# Producer — bật idempotence (mặc định true từ Kafka 3.0, nêu tường minh cho rõ)
enable.idempotence=true
acks=all                                   # bắt buộc: chờ mọi in-sync replica xác nhận
retries=2147483647                         # retry tối đa (an toàn vì đã khử trùng)
max.in.flight.requests.per.connection=5    # <=5 vẫn giữ thứ tự nhờ sequence
```

`enable.idempotence=true` **yêu cầu** `acks=all` và `retries>0`; nếu bạn set `acks=1` cùng lúc, producer sẽ báo lỗi cấu hình. Đây là "miễn phí" về mặt code: chỉ đổi config, không đổi logic. Vậy nên **hầu như luôn nên bật**.

---

## 3. Kafka transactions: atomic nhiều partition + offset

### 3.1 Vấn đề: consume-transform-produce

Mẫu phổ biến nhất trong stream processing: **đọc** từ topic A, **biến đổi**, **ghi** ra topic B (có khi nhiều topic/partition), rồi **commit offset** của topic A để đánh dấu "đã xử lý tới đây".

Nếu làm rời rạc, luôn có khe hở:
- Ghi B xong nhưng **crash trước khi commit offset** A → khi restart đọc lại → **xử lý lại → ghi B lần nữa → trùng**.
- Commit offset A xong nhưng **crash trước khi ghi B** → khi restart bỏ qua → **mất** kết quả ở B.

Không có cách nào chỉ bằng retry để đóng khe hở này, vì "ghi B" và "commit offset A" là **hai hành động ở hai nơi**. Ta cần biến chúng thành **một hành động atomic**: hoặc **cả** (ghi B + tiến offset A) cùng xảy ra, hoặc **không gì cả**.

### 3.2 Transaction = ghi nhiều partition + offset như một khối

Kafka transaction cho phép gộp **nhiều bản ghi ra nhiều partition khác nhau** *và* **việc tiến offset của input** vào **một transaction duy nhất**, `commit` hoặc `abort` như một khối nguyên tử. Mấu chốt: **commit offset cũng là một lần ghi vào Kafka** (topic nội bộ `__consumer_offsets`), nên nó có thể nằm chung transaction với các bản ghi output.

<svg viewBox="0 0 660 260" role="img" aria-labelledby="tx-t tx-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="tx-t">Transaction gộp ghi output nhiều partition và commit offset input thành một khối atomic</title>
<desc id="tx-d">Consumer đọc topic A, xử lý, trong một transaction ghi topic B và C rồi ghi offset của A vào consumer offsets, tất cả commit cùng lúc</desc>
<rect x="20" y="90" width="90" height="50" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="65" y="110" text-anchor="middle" font-size="10" fill="currentColor">Topic A</text>
<text x="65" y="126" text-anchor="middle" font-size="9" fill="currentColor">(input)</text>
<line x1="110" y1="115" x2="160" y2="115" stroke="currentColor" stroke-width="1.5" marker-end="url(#at)"/>
<rect x="163" y="70" width="120" height="90" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="223" y="95" text-anchor="middle" font-size="10" fill="currentColor">App EOS</text>
<text x="223" y="113" text-anchor="middle" font-size="9" fill="currentColor">read → transform</text>
<text x="223" y="129" text-anchor="middle" font-size="9" fill="currentColor">→ write</text>
<text x="223" y="147" text-anchor="middle" font-size="9" fill="currentColor">transactional.id=T1</text>
<rect x="330" y="30" width="310" height="200" rx="8" fill="#8b5cf6" fill-opacity="0.10" stroke="currentColor" stroke-dasharray="5 3"/>
<text x="485" y="50" text-anchor="middle" font-size="11" fill="currentColor">MỘT transaction (commit/abort cùng lúc)</text>
<line x1="283" y1="105" x2="360" y2="80" stroke="currentColor" stroke-width="1" marker-end="url(#at)"/>
<rect x="365" y="62" width="120" height="34" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="425" y="83" text-anchor="middle" font-size="10" fill="currentColor">ghi Topic B</text>
<line x1="283" y1="120" x2="360" y2="125" stroke="currentColor" stroke-width="1" marker-end="url(#at)"/>
<rect x="365" y="108" width="120" height="34" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="425" y="129" text-anchor="middle" font-size="10" fill="currentColor">ghi Topic C</text>
<line x1="283" y1="135" x2="360" y2="170" stroke="currentColor" stroke-width="1" marker-end="url(#at)"/>
<rect x="365" y="154" width="215" height="34" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="472" y="175" text-anchor="middle" font-size="10" fill="currentColor">commit offset A → __consumer_offsets</text>
<text x="485" y="212" text-anchor="middle" font-size="10" fill="currentColor">Cả 3 cùng thấy được, hoặc cả 3 cùng bị bỏ (abort)</text>
<defs><marker id="at" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 3.3 `transactional.id` và cơ chế fencing

`transactional.id` là **danh tính bền vững** của một producer *xuyên qua các lần restart*. Nó dùng để làm hai việc:

1. **Khôi phục trạng thái**: khi producer khởi động lại với cùng `transactional.id`, **transaction coordinator** của Kafka sẽ **abort mọi transaction dở dang** của id đó → dữ liệu "nửa vời" từ lần chạy trước không bao giờ bị commit.
2. **Fencing (rào cũ)**: mỗi lần `initTransactions()`, coordinator tăng một **epoch**. Nếu một **instance cũ bị treo** (zombie) sống dậy và cố commit bằng epoch cũ → bị **từ chối** (`ProducerFencedException`). Điều này chặn kịch bản "hai instance cùng transactional.id cùng ghi" — kinh điển trong lỗi split-brain.

Vì fencing dựa trên `transactional.id`, **mỗi luồng xử lý phải có một transactional.id ổn định và duy nhất** (ví dụ ghép theo `{app}-{input-partition}` khi tự phân shard). Đặt trùng id cho hai worker chạy song song thật sự → chúng sẽ **fence lẫn nhau**.

### 3.4 Phía consumer: `isolation.level=read_committed`

Transaction ở phía ghi mới xong một nửa. Nếu consumer đọc B mà **thấy cả những bản chưa commit** (hoặc thuộc transaction đã abort) thì công sức atomic vô nghĩa. Vì vậy consumer đọc output phải đặt:

```properties
isolation.level=read_committed
```

Với `read_committed`, consumer **chỉ trả về message thuộc transaction đã commit**; message của transaction đang mở hoặc đã abort bị **lọc bỏ**. Cụ thể hơn, consumer sẽ **không đọc vượt quá LSO (Last Stable Offset)** — offset mà trước nó mọi transaction đã kết thúc (commit/abort) — nên message trong transaction đang mở bị "giữ lại" cho tới khi transaction đó đóng. (Đánh đổi: có thể tăng độ trễ đọc một chút nếu transaction mở lâu.)

Mặc định là `read_uncommitted` — thấy mọi message kể cả chưa commit; **phải đổi tường minh** sang `read_committed` mới có EOS.

### 3.5 CODE: consume-transform-produce exactly-once (Java)

```java
// ---- Producer transaction: bắt buộc transactional.id + idempotence ----
Properties p = new Properties();
p.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "broker:9092");
p.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
p.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
p.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, "orders-enricher-1"); // danh tính bền vững
p.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);             // bắt buộc cho transaction
p.put(ProducerConfig.ACKS_CONFIG, "all");
KafkaProducer<String, String> producer = new KafkaProducer<>(p);

// ---- Consumer: TẮT auto-commit, đọc read_committed ----
Properties c = new Properties();
c.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "broker:9092");
c.put(ConsumerConfig.GROUP_ID_CONFIG, "orders-enricher");
c.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
c.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
c.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);           // offset do transaction lo
c.put(ConsumerConfig.ISOLATION_LEVEL_CONFIG, "read_committed");   // không đọc bản chưa commit
KafkaConsumer<String, String> consumer = new KafkaConsumer<>(c);
consumer.subscribe(List.of("orders"));

producer.initTransactions();   // đăng ký với coordinator, abort mọi tx dở, bump epoch (fencing)

while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(200));
    if (records.isEmpty()) continue;

    producer.beginTransaction();
    try {
        for (ConsumerRecord<String, String> rec : records) {
            String enriched = transform(rec.value());
            // ghi ra output (có thể nhiều topic/partition khác nhau)
            producer.send(new ProducerRecord<>("orders-enriched", rec.key(), enriched));
        }

        // Đưa offset của INPUT vào chính transaction này -> atomic với các send ở trên
        Map<TopicPartition, OffsetAndMetadata> offsets = new HashMap<>();
        for (TopicPartition tp : records.partitions()) {
            long lastOffset = records.records(tp)
                    .get(records.records(tp).size() - 1).offset();
            offsets.put(tp, new OffsetAndMetadata(lastOffset + 1)); // +1: offset sẽ đọc TIẾP
        }
        producer.sendOffsetsToTransaction(offsets, consumer.groupMetadata());

        producer.commitTransaction();   // output + offset commit CÙNG LÚC
    } catch (ProducerFencedException | OutOfOrderSequenceException e) {
        producer.close();               // bị fence hoặc hỏng -> thoát, để instance khác tiếp quản
        break;
    } catch (KafkaException e) {
        producer.abortTransaction();    // bỏ toàn bộ output + offset của vòng này
        // position trong bộ nhớ consumer đã nhảy qua batch -> phải seek lại
        // về đầu batch thì vòng sau mới xử lý lại đúng các record vừa abort
        for (TopicPartition tp : records.partitions()) {
            long firstOffset = records.records(tp).get(0).offset();
            consumer.seek(tp, firstOffset);
        }
    }
}
```

Ba điểm cốt tử của đoạn code:
1. **`sendOffsetsToTransaction`** — không dùng `consumer.commitSync()`. Chính lệnh này gộp "tiến offset input" vào transaction, nên offset và output **commit hoặc abort cùng nhau**.
2. **`enable.auto.commit=false`** — nếu để auto-commit, offset sẽ tiến **ngoài** transaction → phá vỡ atomic.
3. **`abortTransaction()` + `seek` khi lỗi** — vòng lặp đó xem như chưa từng xảy ra: output bị bỏ, offset input **chưa được commit**. Lưu ý: `abort` không tự lùi vị trí đọc — `consumer.position` trong bộ nhớ đã tiến qua batch, nên phải `seek` consumer về đầu batch thì các record vừa abort mới được **xử lý lại**, không mất, không để lại rác đã-commit ở output. (Kafka Streams tự làm bước rewind này cho bạn.)

> Trong thực tế, dùng **Kafka Streams** với `processing.guarantee="exactly_once_v2"` sẽ tự lo toàn bộ init/begin/sendOffsets/commit ở trên — bạn chỉ viết logic transform. Đoạn code raw ở đây để bạn **hiểu cái Streams giấu bên dưới**.

---

## 4. Giới hạn: exactly-once dừng ở biên Kafka

Đây là phần dễ ngộ nhận nhất. EOS của Kafka là **exactly-once trong phạm vi Kafka**: input là topic Kafka, output là topic Kafka, offset là của Kafka. Coordinator điều phối được vì **mọi thứ đều là ghi vào Kafka**.

Khoảnh khắc một đầu **ra khỏi Kafka** — ghi vào Postgres, gọi API bên thứ ba, gửi email, trừ tiền qua payment gateway — thì **Kafka không thể đưa hành động đó vào transaction của nó**. Không có "distributed transaction 2-phase-commit" chung giữa Kafka và hệ ngoài (và kể cả có, XA-style 2PC nổi tiếng mong manh & chậm). Vì vậy:

| Biên | Có EOS "thật" không? | Cách đạt hiệu ứng exactly-once |
|------|----------------------|-------------------------------|
| Kafka → Kafka (transform) | **Có** (transaction + read_committed) | Dùng transaction như mục 3 |
| Kafka → external sink (DB/API) | **Không tự động** | **Idempotent write** phía sink (upsert theo khoá) hoặc **transactional outbox** |
| External source → Kafka | Không | Producer idempotence + khoá khử trùng ở downstream |

**Nguyên tắc cứu cánh: at-least-once + idempotent consumer.** Với biên external, đừng cố ép "đúng một lần gửi". Thay vào đó **chấp nhận có thể xử lý message 2 lần**, nhưng thiết kế thao tác sao cho **làm 2 lần cũng ra kết quả như làm 1 lần (idempotent)**:
- Ghi DB bằng **`INSERT ... ON CONFLICT DO NOTHING/UPDATE`** theo một **business key** (vd `order_id`), hoặc lưu `processed_message_id` để bỏ qua bản đã xử lý.
- Gọi API bên ngoài kèm **idempotency key** (Stripe, PayPal đều hỗ trợ) — server ngoài tự khử trùng.
- Với "đọc Kafka rồi ghi DB", dùng **transactional outbox** đảo chiều: ghi DB (nghiệp vụ + bản ghi outbox) trong **một DB transaction**, rồi một tiến trình riêng đẩy outbox lên Kafka.

### 4.1 Khi nào thực sự cần EOS?

Transaction không miễn phí: thêm coordinator round-trip, tăng độ trễ, `read_committed` giữ message tới LSO, vận hành phức tạp hơn. Đừng bật EOS theo phản xạ.

| Tình huống | Lựa chọn nên dùng |
|-----------|-------------------|
| Đếm/tổng hợp tài chính, số dư, chống double-charge trong pipeline Kafka→Kafka | **EOS (transaction)** — trùng làm sai con số |
| Kafka Streams join/aggregate có state store | **EOS v2** — giữ state và output nhất quán |
| Ghi ra DB/search/cache bên ngoài | **At-least-once + idempotent upsert** (đơn giản & bền hơn EOS) |
| Gửi email/notification, cập nhật analytics gần đúng | **At-least-once**; trùng hiếm chấp nhận được hoặc khử bằng dedup nhẹ |
| Chỉ cần không mất message | **acks=all + idempotent producer** là đủ, chưa cần transaction |

Nói gọn: **exactly-once là tính chất end-to-end**, không phải một cái công tắc. Kafka cho bạn EOS *trong biên của nó*; phần còn lại của "đúng một lần" phải do **thiết kế idempotent ở các biên external** gánh. Rất nhiều hệ production chọn **at-least-once + idempotent consumer** vì nó **đơn giản, chịu lỗi tốt và đủ đúng** — chỉ nâng lên transaction ở đúng chỗ mà một bản trùng gây sai số liệu thật.

---

## 5. Tóm tắt
- **Ordering chỉ trong một partition**, không có thứ tự cross-partition. Muốn giữ trình tự cho một thực thể → cho nó **cùng key** (cùng key → cùng partition).
- **Idempotent producer** (`enable.idempotence=true`, mặc định) dùng **PID + sequence number** để broker **khử retry trùng** trong một partition — gần như luôn nên bật, chỉ tốn config.
- **Transaction** gộp **ghi nhiều partition + tiến offset input** thành một khối **atomic** → mẫu **consume-transform-produce** đạt **exactly-once trong Kafka**. Cần `transactional.id` (fencing chống zombie), `sendOffsetsToTransaction`, và consumer **`isolation.level=read_committed`**.
- EOS **dừng ở biên Kafka**. Với **sink external** không có transaction chung → dùng **at-least-once + idempotent write** (upsert theo business key, idempotency key, outbox).
- **Exactly-once là tính chất end-to-end, không phải công tắc.** Chỉ bật transaction ở chỗ một bản trùng thật sự gây sai (tài chính, đếm); phần lớn còn lại **at-least-once + idempotent consumer** là lựa chọn bền và đủ đúng.

> **Bài tiếp theo:** vận hành Kafka ở production — **replication, ISR, acks & min.insync.replicas**, và cách chọn giữa độ bền (durability) và độ sẵn sàng (availability) khi broker rớt.
