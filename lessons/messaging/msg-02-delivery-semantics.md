# Bài 2 — Delivery semantics, ordering & Dead Letter Queue

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân biệt rạch ròi **at-most-once / at-least-once / exactly-once** và biết *cái giá* của mỗi cái.
- Giải thích **vì sao trùng lặp (duplicate) là bản chất**, không phải "bug" — và tại sao **exactly-once thực chất = at-least-once + idempotent consumer**.
- Hiểu cơ chế **ack → redelivery → visibility timeout**, khi nào broker gửi lại một message.
- Nói rõ **ordering guarantee**: khi nào có thứ tự, khi nào *mất* thứ tự (nhiều partition / consumer song song).
- Xử lý **poison message** bằng **retry có backoff** rồi đẩy sang **Dead Letter Queue (DLQ)**.

---

## 2. Lý thuyết

### 2.1 Bài toán gốc: mạng không đáng tin

Mọi delivery semantics sinh ra từ **một sự thật khó chịu**: giữa producer, broker và consumer là **mạng có thể mất gói, chậm, hoặc nhân đôi**, và mỗi bên có thể **chết bất cứ lúc nào** — kể cả *ngay giữa hai thao tác*.

Xét consumer làm 2 việc: (a) xử lý message, (b) báo cho broker "đã xong" (**ack**). Câu hỏi chí mạng: **làm (a) trước hay (b) trước?** Không có lựa chọn nào an toàn tuyệt đối — và đó chính là nguồn gốc của at-most-once vs at-least-once.

<svg viewBox="0 0 660 250" role="img" aria-labelledby="da-t da-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="da-t">Ack trước hay xử lý trước quyết định delivery semantics</title>
<desc id="da-d">Nếu ack trước rồi crash thì mất message (at-most-once); nếu xử lý trước rồi crash trước khi ack thì broker gửi lại gây trùng (at-least-once)</desc>
<text x="165" y="22" text-anchor="middle" font-size="13" fill="currentColor">Ack TRƯỚC, xử lý sau</text>
<rect x="40" y="45" width="90" height="30" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="85" y="64" text-anchor="middle" font-size="10" fill="currentColor">nhận msg</text>
<line x1="85" y1="75" x2="85" y2="95" stroke="currentColor" stroke-width="1" marker-end="url(#ad)"/>
<rect x="40" y="97" width="90" height="30" rx="5" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="85" y="116" text-anchor="middle" font-size="10" fill="currentColor">ack ngay</text>
<line x1="85" y1="127" x2="85" y2="147" stroke="currentColor" stroke-width="1" marker-end="url(#ad)"/>
<rect x="30" y="149" width="110" height="34" rx="5" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="85" y="164" text-anchor="middle" font-size="10" fill="currentColor">CRASH khi</text>
<text x="85" y="177" text-anchor="middle" font-size="10" fill="currentColor">đang xử lý</text>
<text x="165" y="208" text-anchor="middle" font-size="11" fill="currentColor">Broker tưởng xong → không gửi lại</text>
<text x="165" y="224" text-anchor="middle" font-size="11" fill="currentColor">➜ MẤT message (at-most-once)</text>
<line x1="330" y1="40" x2="330" y2="200" stroke="currentColor" stroke-width="0.5" stroke-dasharray="3 3"/>
<text x="495" y="22" text-anchor="middle" font-size="13" fill="currentColor">Xử lý TRƯỚC, ack sau</text>
<rect x="450" y="45" width="90" height="30" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="495" y="64" text-anchor="middle" font-size="10" fill="currentColor">nhận msg</text>
<line x1="495" y1="75" x2="495" y2="95" stroke="currentColor" stroke-width="1" marker-end="url(#ad)"/>
<rect x="450" y="97" width="90" height="30" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="495" y="116" text-anchor="middle" font-size="10" fill="currentColor">xử lý xong</text>
<line x1="495" y1="127" x2="495" y2="147" stroke="currentColor" stroke-width="1" marker-end="url(#ad)"/>
<rect x="440" y="149" width="110" height="34" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="495" y="164" text-anchor="middle" font-size="10" fill="currentColor">CRASH trước</text>
<text x="495" y="177" text-anchor="middle" font-size="10" fill="currentColor">khi kịp ack</text>
<text x="495" y="208" text-anchor="middle" font-size="11" fill="currentColor">Broker chưa nhận ack → gửi LẠI</text>
<text x="495" y="224" text-anchor="middle" font-size="11" fill="currentColor">➜ TRÙNG message (at-least-once)</text>
<defs><marker id="ad" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.2 Ba delivery semantics

| Semantic | Đảm bảo | Rủi ro | Cách đạt được |
|----------|---------|--------|---------------|
| **At-most-once** | Không bao giờ trùng | **Có thể mất** | Ack *trước* khi xử lý (fire-and-forget) |
| **At-least-once** | Không bao giờ mất | **Có thể trùng** | Ack *sau* khi xử lý; broker gửi lại nếu thiếu ack |
| **Exactly-once** | Không mất, không trùng (*hiệu ứng*) | Phức tạp/tốn | At-least-once **+ khử trùng** (idempotency / transaction) |

Điểm mấu chốt mà nhiều người hiểu sai:

- **At-most-once** không phải "kém" — nó đúng cho dữ liệu *chấp nhận mất* và cần thông lượng cao: metric mẫu, log telemetry, vị trí GPS cập nhật liên tục (mất 1 điểm không sao, cái sau ghi đè).
- **At-least-once là mặc định thực tế** của hầu hết hệ nghiêm túc (SQS, RabbitMQ ack thủ công, Kafka). Vì mất dữ liệu thường tệ hơn xử lý lại, ta chọn "thà trùng còn hơn mất".
- **Exactly-once** như một *đảm bảo mạng đầu-cuối tuyệt đối* là **bất khả thi** (định lý Two Generals). Cái ta thật sự làm được là **exactly-once *processing effect***: message có thể *tới* nhiều lần, nhưng *hệ quả* lên trạng thái chỉ xảy ra **một lần**. Công thức: **at-least-once delivery + idempotent consumer**.

### 2.3 Vì sao trùng lặp là BẢN CHẤT

Tưởng tượng consumer xử lý xong, gọi ack, nhưng **gói ack bị rớt trên đường về broker** (hoặc consumer chết đúng mili-giây đó). Broker *không có cách nào phân biệt* hai tình huống:
1. Consumer chưa xử lý (phải gửi lại), hay
2. Consumer đã xử lý nhưng ack lạc mất (đừng gửi lại).

Vì không phân biệt được, và vì đã chọn "không mất", broker **buộc phải gửi lại** → message được xử lý **lần hai**. Đây không phải lỗi cấu hình; đây là hệ quả logic của "mạng bất định + ưu tiên không mất". **Kết luận vàng: hễ dùng at-least-once, consumer *phải* chịu được trùng.**

### 2.4 Ack, redelivery & visibility timeout

Cơ chế đằng sau redelivery: khi consumer nhận một message, broker **không xóa** nó mà chỉ *ẩn tạm* (SQS gọi là **visibility timeout**; RabbitMQ giữ ở trạng thái *unacked*). Trong cửa sổ đó:

- Consumer **ack** → broker xóa hẳn message. Xong.
- Hết timeout mà **chưa ack** → broker cho rằng consumer đã chết/treo → **hiện lại** message cho consumer khác lấy → redelivery.

<svg viewBox="0 0 620 210" role="img" aria-labelledby="vt-t vt-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="vt-t">Vòng đời một message với visibility timeout</title>
<desc id="vt-d">Message đi từ trạng thái sẵn sàng sang đang xử lý ẩn tạm; nếu ack thì xóa, nếu hết timeout thì hiện lại để gửi lại</desc>
<rect x="30" y="80" width="110" height="44" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="85" y="100" text-anchor="middle" font-size="11" fill="currentColor">Ready</text>
<text x="85" y="115" text-anchor="middle" font-size="9" fill="currentColor">(trong queue)</text>
<line x1="140" y1="102" x2="210" y2="102" stroke="currentColor" stroke-width="1" marker-end="url(#av)"/>
<text x="175" y="94" text-anchor="middle" font-size="9" fill="currentColor">nhận</text>
<rect x="212" y="78" width="130" height="48" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="277" y="98" text-anchor="middle" font-size="11" fill="currentColor">In-flight (ẩn)</text>
<text x="277" y="114" text-anchor="middle" font-size="9" fill="currentColor">visibility timeout chạy</text>
<line x1="342" y1="92" x2="470" y2="60" stroke="currentColor" stroke-width="1" marker-end="url(#av)"/>
<text x="408" y="66" text-anchor="middle" font-size="9" fill="currentColor">ack kịp</text>
<rect x="472" y="42" width="120" height="40" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="532" y="66" text-anchor="middle" font-size="11" fill="currentColor">Deleted ✓</text>
<path d="M277,126 C277,165 150,165 90,128" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3" marker-end="url(#av)"/>
<text x="200" y="172" text-anchor="middle" font-size="9" fill="currentColor">hết timeout, chưa ack → hiện lại (redelivery)</text>
<defs><marker id="av" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Bẫy kinh điển:** nếu xử lý *lâu hơn* visibility timeout (vd job nặng 40s nhưng timeout 30s), broker sẽ *hiện lại* message *trong khi bạn vẫn đang xử lý* → **hai consumer chạy cùng một message song song**. Cách chữa: đặt timeout > thời gian xử lý p99, hoặc *gia hạn* timeout định kỳ (SQS `ChangeMessageVisibility`, RabbitMQ heartbeat + prefetch hợp lý).

### 2.5 Exactly-once = at-least-once + idempotent consumer

Vì không xóa được trùng ở *tầng vận chuyển*, ta khử trùng ở *tầng xử lý* bằng **idempotency**: xử lý cùng một message *nhiều lần* cho ra *cùng một trạng thái* như xử lý một lần.

Cách làm chuẩn — mỗi message mang một **idempotency key** (message id hoặc business key như `orderId`), consumer ghi nhớ key đã xử lý và **bỏ qua nếu thấy lại**:

```sql
-- Khử trùng bằng chính DB nghiệp vụ, trong MỘT transaction:
BEGIN;
  -- Chèn dấu vết; nếu message_id đã tồn tại → xung đột → đã xử lý rồi
  INSERT INTO processed_messages (message_id, processed_at)
  VALUES ('msg-9f3a...', now())
  ON CONFLICT (message_id) DO NOTHING;

  -- Chỉ áp dụng hiệu ứng khi dòng trên thực sự chèn được (chưa từng xử lý)
  UPDATE orders SET status = 'PAID', paid_at = now()
  WHERE id = 'order-123'
    AND EXISTS (SELECT 1 FROM processed_messages WHERE message_id = 'msg-9f3a...');
COMMIT;
```

Điểm cốt lõi: **dấu vết idempotency và hiệu ứng nghiệp vụ được commit trong CÙNG một transaction**. Nhờ vậy dù message tới lần thứ hai, `INSERT ... ON CONFLICT DO NOTHING` chặn lại, `UPDATE` không chạy lại → tiền chỉ bị trừ một lần. Ack có thể gửi *sau* commit; nếu ack lạc và message quay lại, transaction lần hai là **no-op an toàn**.

> Với thao tác *tự nhiên idempotent* (SET giá trị tuyệt đối, `PUT` một key) thì không cần bảng dedup. Chỉ thao tác *tích lũy* (cộng dồn, `INCR`, gửi email, charge tiền) mới cần khử trùng tường minh. Bài về idempotency (Chương 6) sẽ đào sâu.

---

## 3. Ordering — khi nào giữ, khi nào mất

### 3.1 Đảm bảo thứ tự chỉ tồn tại trong một "làn"

Trực giác "message gửi trước thì xử lý trước" **chỉ đúng khi có đúng một đường đi tuần tự**. Thứ tự **vỡ** ngay khi xuất hiện **song song** ở bất kỳ đâu:

- **Nhiều partition** (Kafka) hoặc queue được **shard**: broker chỉ đảm bảo thứ tự *trong từng partition*, không xuyên partition. Message của cùng một `orderId` phải vào *cùng* partition (chọn partition theo key) thì mới giữ đúng thứ tự cho order đó.
- **Nhiều consumer song song** trên cùng queue: worker A lấy msg#1, worker B lấy msg#2; B có thể xong *trước* A → hiệu ứng ra *đảo thứ tự*.
- **Redelivery**: một message bị retry sẽ *quay lại sau* các message tới sau nó → xáo trộn thứ tự.

<svg viewBox="0 0 660 240" role="img" aria-labelledby="or-t or-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="or-t">Thứ tự giữ trong một partition, vỡ khi trải nhiều consumer song song</title>
<desc id="or-d">Một partition với một consumer giữ đúng thứ tự; một queue với nhiều consumer song song có thể hoàn tất lệch thứ tự</desc>
<text x="165" y="20" text-anchor="middle" font-size="13" fill="currentColor">1 partition → 1 consumer: GIỮ thứ tự</text>
<rect x="30" y="45" width="40" height="30" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="50" y="64" text-anchor="middle" font-size="10" fill="currentColor">m1</text>
<rect x="72" y="45" width="40" height="30" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="92" y="64" text-anchor="middle" font-size="10" fill="currentColor">m2</text>
<rect x="114" y="45" width="40" height="30" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="134" y="64" text-anchor="middle" font-size="10" fill="currentColor">m3</text>
<line x1="160" y1="60" x2="215" y2="60" stroke="currentColor" stroke-width="1" marker-end="url(#ao)"/>
<rect x="217" y="44" width="90" height="32" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/><text x="262" y="64" text-anchor="middle" font-size="10" fill="currentColor">consumer</text>
<text x="165" y="105" text-anchor="middle" font-size="11" fill="currentColor">Xử lý: m1 → m2 → m3 ✓</text>
<line x1="330" y1="35" x2="330" y2="220" stroke="currentColor" stroke-width="0.5" stroke-dasharray="3 3"/>
<text x="495" y="20" text-anchor="middle" font-size="13" fill="currentColor">1 queue → N consumer: VỠ thứ tự</text>
<rect x="360" y="45" width="40" height="30" rx="4" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/><text x="380" y="64" text-anchor="middle" font-size="10" fill="currentColor">m1</text>
<rect x="402" y="45" width="40" height="30" rx="4" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/><text x="422" y="64" text-anchor="middle" font-size="10" fill="currentColor">m2</text>
<line x1="448" y1="55" x2="500" y2="45" stroke="currentColor" stroke-width="1" marker-end="url(#ao)"/>
<line x1="448" y1="65" x2="500" y2="110" stroke="currentColor" stroke-width="1" marker-end="url(#ao)"/>
<rect x="502" y="30" width="120" height="30" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/><text x="562" y="49" text-anchor="middle" font-size="9" fill="currentColor">worker A: m1 (chậm)</text>
<rect x="502" y="96" width="120" height="30" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/><text x="562" y="115" text-anchor="middle" font-size="9" fill="currentColor">worker B: m2 (nhanh)</text>
<text x="495" y="160" text-anchor="middle" font-size="11" fill="currentColor">B xong trước A → hiệu ứng ra m2 rồi m1 ✗</text>
<text x="495" y="182" text-anchor="middle" font-size="10" fill="currentColor">Muốn giữ thứ tự cho 1 key: dồn cùng key</text>
<text x="495" y="198" text-anchor="middle" font-size="10" fill="currentColor">vào cùng partition/FIFO group</text>
<defs><marker id="ao" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 3.2 Đánh đổi cốt lõi: thứ tự ⟂ thông lượng

Thứ tự tuyệt đối và song song là **hai mục tiêu xung khắc**. Kỹ thuật thực dụng là **partition theo key nghiệp vụ**: bạn không cần *toàn bộ* stream có thứ tự, chỉ cần *mỗi thực thể* (mỗi `orderId`, mỗi `userId`) có thứ tự với chính nó.

- **Kafka**: `partition = hash(key) % numPartitions`. Cùng key → cùng partition → cùng thứ tự. Khác key → rải ra nhiều partition → chạy song song. Trong một consumer group, *một* partition chỉ được *một* consumer đọc (giữ tuần tự trong partition).
- **SQS FIFO**: dùng `MessageGroupId` làm "key". Cùng group xử lý tuần tự; khác group song song. Bù lại thông lượng FIFO thấp hơn standard queue.

```bash
# Kafka: gửi các event của cùng order vào cùng partition bằng key = orderId
kafka-console-producer.sh --bootstrap-server localhost:9092 \
  --topic orders --property "parse.key=true" --property "key.separator=:"
# nhập:  order-123:{"type":"created"}
#        order-123:{"type":"paid"}      # cùng key order-123 → cùng partition → đúng thứ tự
```

```java
// Producer Java: key quyết định partition, do đó quyết định thứ tự
producer.send(new ProducerRecord<>("orders",
        order.getId(),               // KEY = orderId → cùng order vào cùng partition
        toJson(event)));             // value
```

> Nếu **không đặt key** (key = null), Kafka rải message *xoay vòng* khắp partition → **không có đảm bảo thứ tự** giữa chúng. Đây là lỗi phổ biến khi "sao event cứ ra lộn xộn".

---

## 4. Poison message, retry & Dead Letter Queue

### 4.1 Poison message làm nghẽn cả hàng đợi

**Poison message** là message mà consumer **luôn fail khi xử lý** (JSON hỏng, thiếu field bắt buộc, tham chiếu bản ghi đã bị xóa, bug logic). Với at-least-once, kịch bản độc hại:

> Consumer fail → không ack → broker gửi lại → fail lại → gửi lại... **vòng lặp vô tận**. Message độc này *chiếm slot*, đốt CPU, và (với FIFO/partition có thứ tự) **chặn mọi message sau nó** — một message hỏng làm *đứng cả stream*.

Không thể retry mãi. Cần **giới hạn số lần thử** rồi *đưa message ra khỏi luồng chính*.

### 4.2 Retry có backoff

Không phải fail nào cũng vĩnh viễn. Nhiều fail là **tạm thời** (DB timeout, service phụ thuộc đang restart, rate limit). Với loại này, **retry với exponential backoff + jitter** giúp tự lành mà không dồn ép hệ thống đang yếu:

```text
lần thử 1: fail → chờ  1s   rồi thử lại
lần thử 2: fail → chờ  2s
lần thử 3: fail → chờ  4s
lần thử 4: fail → chờ  8s   (+ jitter ngẫu nhiên để tránh "thundering herd")
...
lần thử N (maxReceiveCount): vẫn fail → KHÔNG retry nữa → đẩy sang DLQ
```

Phân biệt hai loại lỗi để không phí công:
- **Transient (tạm thời)** → retry có backoff (đáng thử lại).
- **Permanent (dữ liệu/logic hỏng)** → **đừng retry**, gửi thẳng DLQ; retry chỉ tổ đốt tài nguyên.

### 4.3 Dead Letter Queue (DLQ)

**DLQ** là một queue *riêng* để chứa message đã thử đủ số lần mà vẫn fail. Vai trò: **cách ly** message độc khỏi luồng chính (để phần còn lại chạy tiếp), đồng thời **không vứt mất** (giữ lại để điều tra, sửa, và *replay*).

<svg viewBox="0 0 640 250" role="img" aria-labelledby="dl-t dl-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="dl-t">Luồng retry có giới hạn rồi chuyển sang Dead Letter Queue</title>
<desc id="dl-d">Message xử lý fail được retry đến ngưỡng maxReceiveCount, quá ngưỡng thì broker chuyển sang Dead Letter Queue để điều tra và replay</desc>
<rect x="30" y="95" width="90" height="44" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="75" y="113" text-anchor="middle" font-size="10" fill="currentColor">Main</text>
<text x="75" y="127" text-anchor="middle" font-size="10" fill="currentColor">queue</text>
<line x1="120" y1="117" x2="180" y2="117" stroke="currentColor" stroke-width="1" marker-end="url(#al)"/>
<rect x="182" y="93" width="100" height="48" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="232" y="112" text-anchor="middle" font-size="10" fill="currentColor">consumer</text>
<text x="232" y="127" text-anchor="middle" font-size="10" fill="currentColor">xử lý</text>
<path d="M232,141 C232,185 130,185 78,141" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3" marker-end="url(#al)"/>
<text x="155" y="192" text-anchor="middle" font-size="9" fill="currentColor">fail → không ack → retry (backoff)</text>
<text x="155" y="206" text-anchor="middle" font-size="9" fill="currentColor">đến khi đạt maxReceiveCount</text>
<line x1="282" y1="105" x2="360" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#al)"/>
<text x="321" y="98" text-anchor="middle" font-size="9" fill="currentColor">quá ngưỡng</text>
<rect x="362" y="82" width="110" height="48" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="417" y="101" text-anchor="middle" font-size="10" fill="currentColor">Dead Letter</text>
<text x="417" y="116" text-anchor="middle" font-size="10" fill="currentColor">Queue</text>
<line x1="472" y1="95" x2="540" y2="70" stroke="currentColor" stroke-width="1" marker-end="url(#al)"/>
<rect x="542" y="52" width="90" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="587" y="73" text-anchor="middle" font-size="9" fill="currentColor">alert + điều tra</text>
<line x1="472" y1="120" x2="540" y2="150" stroke="currentColor" stroke-width="1" marker-end="url(#al)"/>
<rect x="542" y="135" width="90" height="34" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="587" y="156" text-anchor="middle" font-size="9" fill="currentColor">sửa → replay</text>
<defs><marker id="al" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Cấu hình DLQ trên **AWS SQS** — gắn một *redrive policy* trỏ về DLQ, đặt `maxReceiveCount`:

```json
// Redrive policy trên main queue: sau 5 lần nhận mà chưa xóa → chuyển sang DLQ
{
  "deadLetterTargetArn": "arn:aws:sqs:ap-southeast-1:1234:orders-dlq",
  "maxReceiveCount": 5
}
```

Cấu hình DLQ trên **RabbitMQ** — dùng dead-letter-exchange; message bị `basic.nack(requeue=false)` hoặc hết TTL sẽ được route sang DLX:

```python
# RabbitMQ (pika): khai báo queue chính trỏ dead-letter sang exchange 'dlx'
channel.queue_declare(queue='orders', durable=True, arguments={
    'x-queue-type': 'quorum',                 # x-delivery-limit CHỈ có tác dụng trên quorum queue
    'x-dead-letter-exchange': 'dlx',          # message "chết" đẩy sang đây
    'x-delivery-limit': 5,                     # quá 5 lần deliver → tự dead-letter sang dlx
})

def on_message(ch, method, props, body):
    try:
        handle(body)
        ch.basic_ack(method.delivery_tag)           # xử lý xong → ack → xóa
    except PermanentError:
        ch.basic_nack(method.delivery_tag, requeue=False)  # lỗi vĩnh viễn → sang DLQ ngay
    except TransientError:
        ch.basic_nack(method.delivery_tag, requeue=True)   # lỗi tạm thời → requeue để retry
```

### 4.4 DLQ không phải "thùng rác" — phải giám sát

Một DLQ *đầy im lặng* là quả bom: dữ liệu đang mất mà không ai biết. Nguyên tắc vận hành:
- **Alert** ngay khi DLQ có message (số lượng > 0 là bất thường).
- **Điều tra** nguyên nhân (log, payload) — thường lộ ra bug hoặc contract sai giữa producer/consumer.
- **Sửa rồi replay**: sau khi vá, *redrive* message từ DLQ về queue chính xử lý lại (SQS có nút "Start DLQ redrive"). Nhờ **idempotent consumer** (mục 2.5), việc replay này *an toàn* dù message từng được xử lý một phần.

---

## 5. Tóm tắt
- Ba semantic sinh ra từ câu hỏi **ack trước hay xử lý trước**: **at-most-once** (ack trước → có thể mất), **at-least-once** (xử lý trước → có thể trùng), **exactly-once** (= at-least-once **+ idempotent consumer**).
- **Trùng lặp là bản chất**, không phải bug: broker không phân biệt được "chưa xử lý" với "đã xử lý nhưng ack lạc" nên **buộc gửi lại**. Consumer *phải* chịu được trùng.
- **Redelivery** vận hành qua **visibility timeout / unacked**: chưa ack trong cửa sổ → hiện lại. Đặt timeout > thời gian xử lý p99 để tránh xử lý song song trùng.
- **Khử trùng** bằng **idempotency key** commit *cùng transaction* với hiệu ứng nghiệp vụ → exactly-once *effect*.
- **Ordering** chỉ tồn tại trong *một làn*; vỡ khi có nhiều partition / consumer song song / redelivery. Giữ thứ tự *per-key* bằng **partition key** (Kafka) hoặc **MessageGroupId** (SQS FIFO) — đánh đổi với thông lượng.
- **Poison message** gây retry vô tận → dùng **retry có backoff (+jitter)** cho lỗi *tạm thời*, và **Dead Letter Queue** (kèm `maxReceiveCount`) để cách ly lỗi *vĩnh viễn*. **Giám sát DLQ**, sửa, rồi **replay** an toàn nhờ idempotency.

> **Bài tiếp theo (Bài 3):** đi sâu vào **Kafka** — log, partition, offset, consumer group — để thấy các khái niệm delivery/ordering ở bài này được hiện thực ra sao trong một broker thật.
