# Bài 19 — Capstone: Thiết kế event-driven order pipeline

## 1. Mục tiêu
Đây là **dự án tổng kết** — ghép mọi thứ đã học (delivery semantics, ordering, Kafka partition, consumer group, Schema Registry, outbox, saga, DLQ) thành **một hệ thống hoàn chỉnh, có thể bảo vệ trong design review**. Sau bài này bạn có thể:
- Vẽ **kiến trúc end-to-end** của một order pipeline event-driven và giải thích **từng mũi tên tại sao tồn tại**.
- Giải quyết bài toán **dual-write** bằng **Transactional Outbox + CDC/relay**, hiểu vì sao không được `save(db)` rồi `producer.send()`.
- Chọn **partition key** để giữ **ordering per-order** mà vẫn scale ngang.
- Thiết kế consumer **idempotent** (dedup theo `eventId`) để sống chung với **at-least-once**.
- Điều phối **SAGA** với **compensation** khi payment fail, và đặt **DLQ** đúng chỗ.
- Trả lời được câu chốt: **exactly-once quyết định ở đâu, ở đâu chấp nhận at-least-once**.

---

## 2. Đề bài & ràng buộc

Xây pipeline xử lý đơn hàng cho một sàn TMĐT, cao điểm **8.000 đơn/giây**. Một đơn khi được đặt phải kéo theo ba việc, **theo thứ tự nghiệp vụ**:

1. **Payment** — trừ tiền / giữ tiền (authorize).
2. **Inventory** — trừ tồn kho.
3. **Shipping** — tạo lệnh giao hàng.

Ràng buộc thực tế:
- **Không được mất đơn** (mất tiền khách, mất uy tín). → cận dưới là **at-least-once**, tuyệt đối không at-most-once.
- **Không được trừ tiền / trừ kho hai lần** cho cùng một đơn, dù message bị gửi lại.
- **Thứ tự per-order phải giữ**: với *cùng một* `orderId`, sự kiện `OrderCreated` phải xử lý trước `OrderCancelled`. Nhưng đơn của khách A và khách B **không cần** thứ tự với nhau (đó là chỗ để scale).
- Payment có thể **fail** (thẻ bị từ chối) → phải **rollback nghiệp vụ** các bước đã làm.
- Message "độc" (poison) không được **chặn cả partition** mãi mãi.

Chính bốn từ khoá — **delivery, ordering, consistency, failure** — là bốn trục ta sẽ phân tích xuyên suốt.

---

## 3. Kiến trúc tổng thể

<svg viewBox="0 0 720 420" role="img" aria-labelledby="arch-t arch-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="arch-t">Kiến trúc event-driven order pipeline end-to-end</title>
<desc id="arch-d">Order service ghi DB và bảng outbox trong một transaction, CDC relay đọc outbox đẩy vào Kafka topic orders phân theo orderId, consumer group payment inventory shipping xử lý idempotent, saga orchestrator điều phối và compensation, message lỗi đi vào DLQ</desc>
<rect x="16" y="150" width="96" height="60" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="64" y="176" text-anchor="middle" font-size="11" fill="currentColor">Order</text>
<text x="64" y="192" text-anchor="middle" font-size="11" fill="currentColor">service</text>
<rect x="16" y="240" width="96" height="70" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="64" y="264" text-anchor="middle" font-size="10" fill="currentColor">DB (orders)</text>
<text x="64" y="282" text-anchor="middle" font-size="10" fill="currentColor">+ OUTBOX</text>
<text x="64" y="298" text-anchor="middle" font-size="9" fill="currentColor">1 transaction</text>
<line x1="64" y1="210" x2="64" y2="240" stroke="currentColor" stroke-width="1.5" marker-end="url(#pa)"/>
<rect x="150" y="245" width="88" height="60" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="194" y="270" text-anchor="middle" font-size="10" fill="currentColor">CDC /</text>
<text x="194" y="286" text-anchor="middle" font-size="10" fill="currentColor">relay</text>
<line x1="112" y1="275" x2="150" y2="275" stroke="currentColor" stroke-width="1.5" marker-end="url(#pa)"/>
<rect x="276" y="120" width="150" height="200" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="351" y="140" text-anchor="middle" font-size="11" fill="currentColor">Kafka topic 'orders'</text>
<text x="351" y="156" text-anchor="middle" font-size="9" fill="currentColor">key = orderId</text>
<rect x="292" y="168" width="118" height="30" rx="5" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="351" y="187" text-anchor="middle" font-size="10" fill="currentColor">partition 0</text>
<rect x="292" y="204" width="118" height="30" rx="5" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="351" y="223" text-anchor="middle" font-size="10" fill="currentColor">partition 1</text>
<rect x="292" y="240" width="118" height="30" rx="5" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="351" y="259" text-anchor="middle" font-size="10" fill="currentColor">partition 2</text>
<text x="351" y="292" text-anchor="middle" font-size="9" fill="currentColor">Schema Registry</text>
<text x="351" y="306" text-anchor="middle" font-size="9" fill="currentColor">giữ contract</text>
<line x1="238" y1="275" x2="276" y2="240" stroke="currentColor" stroke-width="1.5" marker-end="url(#pa)"/>
<rect x="470" y="70" width="130" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="535" y="90" text-anchor="middle" font-size="10" fill="currentColor">SAGA</text>
<text x="535" y="105" text-anchor="middle" font-size="10" fill="currentColor">orchestrator</text>
<rect x="470" y="140" width="130" height="36" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="535" y="163" text-anchor="middle" font-size="10" fill="currentColor">Payment consumer</text>
<rect x="470" y="188" width="130" height="36" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="535" y="211" text-anchor="middle" font-size="10" fill="currentColor">Inventory consumer</text>
<rect x="470" y="236" width="130" height="36" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="535" y="259" text-anchor="middle" font-size="10" fill="currentColor">Shipping consumer</text>
<line x1="426" y1="200" x2="470" y2="158" stroke="currentColor" stroke-width="1" marker-end="url(#pa)"/>
<line x1="426" y1="210" x2="470" y2="206" stroke="currentColor" stroke-width="1" marker-end="url(#pa)"/>
<line x1="426" y1="222" x2="470" y2="254" stroke="currentColor" stroke-width="1" marker-end="url(#pa)"/>
<line x1="535" y1="140" x2="535" y2="116" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#pa)"/>
<line x1="535" y1="116" x2="535" y2="140" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#pa)"/>
<rect x="470" y="320" width="130" height="42" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="535" y="340" text-anchor="middle" font-size="10" fill="currentColor">DLQ</text>
<text x="535" y="355" text-anchor="middle" font-size="9" fill="currentColor">(sau N retry)</text>
<line x1="535" y1="272" x2="535" y2="320" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3" marker-end="url(#pa)"/>
<text x="64" y="128" text-anchor="middle" font-size="9" fill="currentColor">HTTP đặt hàng</text>
<line x1="64" y1="132" x2="64" y2="150" stroke="currentColor" stroke-width="1" marker-end="url(#pa)"/>
<text x="360" y="400" text-anchor="middle" font-size="10" fill="currentColor">Ranh giới transaction chỉ nằm bên trái Kafka; từ Kafka trở đi là at-least-once + idempotent</text>
<defs><marker id="pa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Đọc kiến trúc theo dòng chảy: **ghi bền → phát ra Kafka → phân hoạch giữ thứ tự → nhiều consumer xử lý idempotent → saga điều phối → lỗi rớt vào DLQ**. Bốn mục tiếp theo mổ xẻ từng mắt xích.

---

## 4. Mắt xích 1 — Dual-write & Transactional Outbox

### 4.1 Cái bẫy kinh điển
Order service phải làm hai việc: **ghi đơn vào DB** và **phát event vào Kafka**. Cách ngây thơ:

```java
orderRepo.save(order);          // (1) commit DB
kafkaProducer.send("orders", event);  // (2) gửi Kafka
```

Đây là **dual-write** trên hai hệ thống không chung transaction. Có hai cửa tử:
- Crash **sau (1) trước (2)**: DB có đơn, Kafka không có event → payment/inventory **không bao giờ chạy**. Khách bị trừ... à không, khách *không* bị trừ nhưng đơn treo mãi.
- Đảo thứ tự (gửi Kafka trước, commit DB sau) rồi crash: Kafka có event, DB rollback → downstream xử lý một đơn **không tồn tại**.

Không có thứ tự nào của hai lệnh cứu được bạn. Đây là bản chất bài toán, không phải lỗi code.

### 4.2 Lời giải: ghi outbox trong CÙNG transaction

Thay vì ghi thẳng Kafka, ta ghi một dòng vào **bảng `outbox`** *trong chính transaction đã ghi đơn*. Vì cùng một DB, hai lần ghi này **atomic** — cùng commit hoặc cùng rollback.

```sql
BEGIN;
  INSERT INTO orders (id, customer_id, total, status)
  VALUES ('o-123', 'c-9', 250000, 'CREATED');

  INSERT INTO outbox (event_id, aggregate_id, type, payload, created_at)
  VALUES (gen_random_uuid(), 'o-123', 'OrderCreated',
          '{"orderId":"o-123","items":[...],"total":250000}', now());
COMMIT;
```

Sau đó một tiến trình riêng — **relay** — đọc `outbox` và đẩy vào Kafka. Có hai cách hiện thực relay:

| Cách | Cơ chế | Ưu / nhược |
|------|--------|------------|
| **Polling publisher** | Query `SELECT ... FROM outbox WHERE published=false`, gửi Kafka, đánh dấu đã gửi | Đơn giản, không cần hạ tầng CDC; nhược: có độ trễ poll, tải query lên DB |
| **CDC (log-based)** | Debezium đọc **WAL / binlog** của DB, stream mọi INSERT vào outbox thẳng lên Kafka | Độ trễ thấp, không đụng DB bằng query; chuẩn công nghiệp (đã học ở Bài 11 — Kafka Connect) |

Điểm cốt tử: relay đảm bảo **at-least-once** — nếu nó gửi Kafka xong nhưng crash trước khi đánh dấu `published=true`, lần sau nó **gửi lại**. Tức là **event có thể trùng**. Ta *cố ý chấp nhận* điều đó ở đây, và trả nợ bằng **idempotency** ở mắt xích 3. Đổi lại ta có đảm bảo mạnh nhất khả thi: **DB và Kafka luôn khớp nhau, không bao giờ mất event**.

> Vì sao không ép exactly-once giữa DB↔Kafka? Vì một **distributed transaction (2PC/XA)** ôm cả DB lẫn Kafka rất đắt, giòn, và Kafka không hỗ trợ tốt. Outbox + idempotent consumer cho *đúng cùng một hiệu quả nghiệp vụ* với chi phí thấp hơn nhiều. Đây là quyết định kiến trúc quan trọng nhất của cả pipeline.

---

## 5. Mắt xích 2 — Partition & ordering per-order

### 5.1 Vì sao dùng orderId làm key
Kafka **chỉ đảm bảo thứ tự trong một partition**, không đảm bảo giữa các partition. Producer chọn partition bằng `hash(key) % numPartitions`. Nếu ta đặt **`key = orderId`**, thì **mọi event của cùng một đơn luôn rơi vào cùng một partition** → được đọc theo đúng thứ tự ghi.

```java
ProducerRecord<String, OrderEvent> rec =
    new ProducerRecord<>("orders", order.getId() /* key */, event);
producer.send(rec);
```

Kết quả:
- `OrderCreated(o-123)` → `OrderCancelled(o-123)` luôn cùng partition → consumer thấy đúng chuỗi. **Không bao giờ** xử lý cancel trước create.
- Đơn `o-123` và `o-999` có thể ở khác partition → xử lý **song song**. Đây chính là chỗ ta lấy được **scale ngang**: 8.000 đơn/giây trải trên, ví dụ, 12 partition.

<svg viewBox="0 0 660 250" role="img" aria-labelledby="part-t part-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="part-t">Partition theo orderId giữ thứ tự per-order và scale song song giữa các đơn</title>
<desc id="part-d">Các event cùng orderId đi vào cùng một partition theo đúng thứ tự, các đơn khác nhau trải ra nhiều partition xử lý song song</desc>
<rect x="20" y="30" width="150" height="34" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="52" text-anchor="middle" font-size="10" fill="currentColor">hash(orderId) % N</text>
<rect x="230" y="24" width="200" height="40" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="330" y="40" text-anchor="middle" font-size="10" fill="currentColor">partition 0</text>
<text x="330" y="56" text-anchor="middle" font-size="9" fill="currentColor">o-123 Created → o-123 Cancelled</text>
<rect x="230" y="82" width="200" height="40" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="330" y="98" text-anchor="middle" font-size="10" fill="currentColor">partition 1</text>
<text x="330" y="114" text-anchor="middle" font-size="9" fill="currentColor">o-999 Created → o-999 Paid</text>
<line x1="170" y1="47" x2="230" y2="44" stroke="currentColor" stroke-width="1" marker-end="url(#pp)"/>
<line x1="170" y1="47" x2="230" y2="102" stroke="currentColor" stroke-width="1" marker-end="url(#pp)"/>
<rect x="470" y="24" width="170" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="555" y="48" text-anchor="middle" font-size="10" fill="currentColor">consumer C1</text>
<rect x="470" y="82" width="170" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="555" y="106" text-anchor="middle" font-size="10" fill="currentColor">consumer C2</text>
<line x1="430" y1="44" x2="470" y2="44" stroke="currentColor" stroke-width="1" marker-end="url(#pp)"/>
<line x1="430" y1="102" x2="470" y2="102" stroke="currentColor" stroke-width="1" marker-end="url(#pp)"/>
<text x="330" y="170" text-anchor="middle" font-size="11" fill="currentColor">Trong 1 partition: thứ tự tuyệt đối. Giữa partition: song song.</text>
<text x="330" y="200" text-anchor="middle" font-size="10" fill="currentColor">Số partition &gt;= số consumer active trong group thì mới scale hết mức</text>
<text x="330" y="222" text-anchor="middle" font-size="10" fill="currentColor">Một partition chỉ do MỘT consumer trong group đọc tại một thời điểm</text>
<defs><marker id="pp" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 5.2 Ba cái bẫy về ordering
- **Đổi số partition về sau** → hàm hash thay đổi → cùng `orderId` có thể nhảy partition khác → **vỡ thứ tự** cho các event mới so với cũ. Chốt số partition **rộng rãi từ đầu** (over-provision), đừng scale bằng cách tăng partition.
- **`max.in.flight.requests > 1` + retry** ở producer có thể **đảo thứ tự** khi gửi lại. Bật **idempotent producer** (`enable.idempotence=true`) — Kafka tự giữ thứ tự và khử trùng trong phạm vi producer.
- **Ordering không miễn phí về throughput**: một partition = một luồng xử lý tuần tự. Nếu một `orderId` "nóng" (nhiều event) nó không chia tải được. Với order pipeline điều này chấp nhận được vì một đơn hiếm khi là hot key.

---

## 6. Mắt xích 3 — Consumer idempotent (sống chung với at-least-once)

Từ Kafka trở đi, đảm bảo là **at-least-once**: consumer commit offset *sau khi* xử lý, nên nếu nó crash giữa "xử lý xong" và "commit offset", message sẽ được **giao lại**. Cộng thêm outbox relay cũng có thể phát trùng. Vậy **mỗi handler phải idempotent**: xử lý cùng một `eventId` nhiều lần cho **cùng một kết quả** như xử lý một lần.

Cách chuẩn: **dedup table** — trước khi thực thi side-effect, kiểm tra `eventId` đã xử lý chưa, và ghi "đã xử lý" **cùng transaction** với side-effect.

```sql
-- Trong Payment consumer, xử lý event OrderCreated một cách idempotent:
BEGIN;
  -- chốt cửa: nếu eventId đã có thì INSERT thất bại -> bỏ qua, coi như đã xử lý
  INSERT INTO processed_events (event_id, consumer, processed_at)
  VALUES ('e-abc', 'payment', now())
  ON CONFLICT (event_id, consumer) DO NOTHING;

  -- chỉ chạy side-effect nếu dòng trên VỪA được chèn (tức lần đầu)
  -- (app kiểm tra rowcount; nếu 0 -> ROLLBACK/skip, đã xử lý rồi)
  UPDATE accounts SET balance = balance - 250000
  WHERE customer_id = 'c-9' AND balance >= 250000;
COMMIT;
```

Nguyên tắc: **`eventId` là khoá idempotency**, sinh **một lần** tại Order service (chính là `event_id` trong bảng outbox) và đi cùng message suốt hành trình. Không sinh lại `eventId` ở giữa đường, nếu không dedup vô nghĩa.

Hai kiểu idempotency, chọn theo bản chất side-effect:
- **Natural idempotency**: bản thân thao tác vốn không đổi khi lặp — ví dụ `SET status='PAID'` (đặt trạng thái), `UPSERT`. Rẻ nhất, ưu tiên thiết kế nghiệp vụ về dạng này.
- **Dedup-based**: thao tác *không* tự nhiên idempotent (`balance = balance - X` cộng dồn theo số lần chạy) → phải chặn bằng dedup table như trên.

> Đây là câu trả lời cho "exactly-once quyết định ở đâu": ta **không** mua exactly-once từ hạ tầng cho phần side-effect nghiệp vụ (trừ tiền, trừ kho). Ta chọn **at-least-once transport + idempotent consumer** = **effectively-once** ở tầng ứng dụng. Rẻ hơn, rõ ràng hơn, và không phụ thuộc một tính năng broker mong manh.

---

## 7. Mắt xích 4 — SAGA & compensation

### 7.1 Vì sao cần saga
Ba bước Payment → Inventory → Shipping đụng **ba service, ba DB khác nhau** — không có một transaction ACID nào ôm cả ba. Nếu Payment OK, Inventory OK, nhưng Shipping fail (hết xe), ta không thể "rollback" Payment bằng DB. **SAGA** giải quyết: chia giao dịch dài thành chuỗi **local transaction**, mỗi bước có một **compensation** (hành động bù) để hoàn tác về mặt nghiệp vụ.

Ta dùng **orchestration** (một `SagaOrchestrator` trung tâm ra lệnh từng bước) thay vì choreography (mỗi service tự nghe và phản ứng), vì luồng order có **thứ tự rõ ràng và cần compensation phối hợp** — orchestrator giữ được state machine tường minh, dễ debug và dễ thêm bước.

<svg viewBox="0 0 680 300" role="img" aria-labelledby="saga-t saga-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="saga-t">SAGA orchestration với compensation khi payment fail</title>
<desc id="saga-d">Chuỗi bước authorize payment, reserve inventory, create shipping; khi một bước fail orchestrator chạy các compensation ngược lại release inventory và refund payment</desc>
<rect x="30" y="40" width="120" height="44" rx="7" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="60" text-anchor="middle" font-size="10" fill="currentColor">1. Authorize</text>
<text x="90" y="75" text-anchor="middle" font-size="10" fill="currentColor">Payment</text>
<rect x="200" y="40" width="120" height="44" rx="7" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="260" y="60" text-anchor="middle" font-size="10" fill="currentColor">2. Reserve</text>
<text x="260" y="75" text-anchor="middle" font-size="10" fill="currentColor">Inventory</text>
<rect x="370" y="40" width="120" height="44" rx="7" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="430" y="60" text-anchor="middle" font-size="10" fill="currentColor">3. Create</text>
<text x="430" y="75" text-anchor="middle" font-size="10" fill="currentColor">Shipping ✗ FAIL</text>
<line x1="150" y1="62" x2="200" y2="62" stroke="currentColor" stroke-width="1.5" marker-end="url(#sa)"/>
<line x1="320" y1="62" x2="370" y2="62" stroke="currentColor" stroke-width="1.5" marker-end="url(#sa)"/>
<text x="270" y="130" text-anchor="middle" font-size="11" fill="currentColor">Fail ở bước 3 → chạy compensation NGƯỢC chiều các bước đã commit</text>
<rect x="200" y="160" width="120" height="44" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="260" y="180" text-anchor="middle" font-size="10" fill="currentColor">C2. Release</text>
<text x="260" y="195" text-anchor="middle" font-size="10" fill="currentColor">Inventory</text>
<rect x="30" y="160" width="120" height="44" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="180" text-anchor="middle" font-size="10" fill="currentColor">C1. Refund</text>
<text x="90" y="195" text-anchor="middle" font-size="10" fill="currentColor">Payment</text>
<line x1="430" y1="84" x2="430" y2="182" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<line x1="430" y1="182" x2="320" y2="182" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3" marker-end="url(#sa)"/>
<line x1="200" y1="182" x2="150" y2="182" stroke="currentColor" stroke-width="1.5" marker-end="url(#sa)"/>
<text x="340" y="250" text-anchor="middle" font-size="10" fill="currentColor">Mỗi compensation cũng phải IDEMPOTENT (release/refund có thể bị retry)</text>
<text x="340" y="272" text-anchor="middle" font-size="10" fill="currentColor">Kết thúc: đơn về trạng thái FAILED, tiền đã hoàn, kho đã nhả — nhất quán nghiệp vụ</text>
<defs><marker id="sa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 7.2 Bảng bước & compensation

| Bước forward | Local transaction | Compensation (nếu bước sau fail) |
|--------------|-------------------|----------------------------------|
| Authorize Payment | Giữ tiền (authorize hold) | **Refund / void hold** |
| Reserve Inventory | Trừ tồn kho `stock -= qty` | **Release** `stock += qty` |
| Create Shipping | Tạo shipment | (bước cuối, không cần compensation nếu nó là bước fail) |

Điểm tinh tế thường bị bỏ sót:
- **Compensation không phải rollback**. Không có "undo" của DB ở đây — refund là một **giao dịch mới** hợp lệ về nghiệp vụ, có thể để lại dấu vết (audit). "Xoá như chưa từng xảy ra" là sai mô hình.
- **Compensation cũng at-least-once** → cũng phải **idempotent**: refund một `sagaId` hai lần không được hoàn tiền hai lần.
- Payment fail *ngay bước 1* thì đơn giản (chưa làm gì để bù) → chỉ set đơn `FAILED`. Đề bài nhấn "compensation khi payment fail" chính là kịch bản đơn giản nhất; kịch bản khó là **fail ở bước giữa/cuối** như hình trên.
- Orchestrator giữ **saga state** trong DB (persistent state machine). Nếu orchestrator crash, nó **khôi phục state** và tiếp tục — bản thân orchestrator cũng là một consumer idempotent.

---

## 8. Mắt xích 5 — DLQ cho poison message

Một message có thể **luôn fail**: payload sai schema cũ, dữ liệu bẩn, bug logic. Nếu cứ retry, nó **chặn cả partition** (vì partition đọc tuần tự) → mọi đơn phía sau kẹt theo. Giải pháp: **retry hữu hạn rồi chuyển sang Dead Letter Queue**.

```text
Nhận message → xử lý
  ├─ OK           → commit offset, đi tiếp
  ├─ Lỗi tạm thời → retry với backoff (vd 3 lần: 1s, 4s, 16s)
  └─ Vẫn fail sau N lần → produce sang topic 'orders.DLQ'
                          kèm header: nguyên nhân, stacktrace, số lần thử
                          → commit offset (KHÔNG chặn partition nữa)
```

Nguyên tắc thiết kế DLQ:
- Phân biệt **lỗi tạm thời** (DB timeout, service downstream 503 → **retry**) với **lỗi vĩnh viễn** (validation fail, deserialization lỗi → **DLQ ngay**, retry vô ích).
- DLQ **giàu ngữ cảnh**: đính kèm lý do, số lần thử, timestamp, offset gốc để điều tra và **replay** sau khi fix.
- DLQ phải **có người canh**: alert khi DLQ có message. DLQ đầy im lặng = đơn đang mất mà không ai biết.
- Với Kafka, "retry" thường dùng **retry topic bậc thang** (`orders.retry.5s`, `orders.retry.1m`) thay vì block consumer — giữ throughput cao (mở rộng của Bài 10).

---

## 9. Schema Registry — contract giữ cho pipeline không vỡ

Producer và ba consumer được deploy **độc lập**. Nếu Order service thêm/đổi field mà consumer chưa biết, message có thể **vỡ deserialization** hàng loạt. **Schema Registry** (Avro/Protobuf, Bài 12) là **hợp đồng cưỡng chế**:

- Mỗi message mang **schema ID**; consumer tra registry để giải mã đúng.
- Đặt **compatibility = BACKWARD**: schema mới phải đọc được dữ liệu cũ → producer có thể nâng cấp trước, consumer nâng sau, **không downtime**.
- Registry **từ chối** một schema phá vỡ tương thích ngay lúc producer đăng ký → lỗi bị chặn **trước khi** lên production, không phải lúc consumer nổ.

Trong capstone này, `OrderCreated`, `OrderPaid`, `OrderCancelled` đều là schema đăng ký; thêm field `couponCode` (optional, có default) là thay đổi BACKWARD-compatible an toàn.

---

## 10. Bảng quyết định tổng hợp — chốt cho design review

Đây là bảng bạn mang vào phòng review để bảo vệ từng lựa chọn:

| Trục | Vị trí trong pipeline | Đảm bảo chọn | Vì sao |
|------|----------------------|--------------|--------|
| **DB ↔ Kafka** | Order service → Outbox → relay | **At-least-once** (outbox) | 2PC/XA quá đắt & giòn; outbox cho atomicity trong 1 DB, không mất event |
| **Kafka transport** | topic 'orders' | **At-least-once** | Cận dưới an toàn; không được at-most-once (mất đơn = mất tiền) |
| **Ordering** | partition theo `orderId` | **Per-key order** | Giữ thứ tự trong một đơn, vẫn song song giữa các đơn để scale |
| **Consumer side-effect** | payment/inventory/shipping | **Effectively-once** (idempotent + dedup) | Trừ tiền/kho không được lặp; mua exactly-once từ broker đắt & mong manh |
| **Multi-service txn** | payment → inventory → shipping | **SAGA + compensation** | Không có ACID xuyên service; bù nghiệp vụ thay cho rollback |
| **Poison message** | mọi consumer | **Retry hữu hạn → DLQ** | Không để một message chặn cả partition; giữ throughput |
| **Contract** | producer ↔ consumer | **Schema Registry, BACKWARD** | Deploy độc lập không vỡ deserialization |

Câu chốt để nhớ: **exactly-once nghiệp vụ = at-least-once transport + idempotent consumer**. Ta **không** đi tìm một nút "exactly-once" trong hạ tầng; ta *thiết kế* nó ở tầng ứng dụng bằng `eventId` + dedup. Đó là điểm phân biệt kỹ sư đã hiểu bản chất với người chỉ nghe tên tính năng.

---

## 11. Phân tích failure — điều gì xảy ra khi từng chỗ chết

| Sự cố | Hệ quả tức thời | Cơ chế đã cứu | Trạng thái cuối |
|-------|-----------------|---------------|-----------------|
| Order service crash sau khi commit DB, trước khi relay chạy | Event chưa lên Kafka | Outbox còn dòng `published=false` → relay gửi khi sống lại | Không mất đơn |
| Relay gửi Kafka xong rồi crash trước khi đánh dấu | Event bị gửi **lại** (trùng) | Idempotent consumer dedup theo `eventId` | Không trừ tiền 2 lần |
| Payment consumer crash sau khi trừ tiền, trước khi commit offset | Message giao lại | Dedup table thấy `eventId` đã xử lý → skip | Không trừ tiền 2 lần |
| Shipping fail (hết xe) | Saga dở dang | Compensation: release inventory + refund payment | Đơn `FAILED`, nhất quán nghiệp vụ |
| Message payload bẩn | Handler luôn fail | Retry N lần → DLQ, commit offset | Partition không kẹt, đơn khác vẫn chảy |
| Consumer chậm hơn producer | Lag tăng | Buffering trong log + thêm consumer (tới số partition) | Bắt kịp, không mất message |

Đọc bảng này ngược lại chính là cách **kiểm chứng thiết kế**: với mỗi mắt xích, hỏi "nếu nó chết đúng lúc tệ nhất thì sao?" — nếu trả lời được bằng một cơ chế đã có, thiết kế mới đủ vững.

---

## 12. Tóm tắt
- **Outbox + CDC/relay** giải bài toán dual-write: DB và Kafka luôn khớp, đổi lại chấp nhận **at-least-once** (event có thể trùng).
- **Partition theo `orderId`** giữ **thứ tự per-order** mà vẫn **scale ngang** giữa các đơn — chốt số partition rộng từ đầu, bật idempotent producer.
- **Idempotent consumer** (dedup theo `eventId` sinh một lần tại nguồn) biến at-least-once thành **effectively-once** ở tầng nghiệp vụ — đây là nơi "exactly-once" thực sự được quyết định.
- **SAGA orchestration + compensation** thay cho ACID xuyên service; compensation là giao dịch bù, cũng phải idempotent.
- **DLQ sau N retry** chống poison message chặn partition; **Schema Registry (BACKWARD)** giữ contract cho các service deploy độc lập.
- Nắm chắc bảng quyết định ở mục 10 và bảng failure ở mục 11 là đủ để **thiết kế và bảo vệ** một event-driven pipeline production-grade.

> Đây là bài capstone khép lại course **Messaging & Event Streaming**. Bạn đã đi từ "vì sao async" (Bài 1) tới việc **ráp toàn bộ** thành một hệ thống chịu lỗi, giữ thứ tự, không mất và không nhân đôi — sẵn sàng cho design interview và cho production.
