# Bài 17 — Saga & Outbox pattern trong hệ event-driven

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **vì sao không dùng 2PC (two-phase commit)** cho giao dịch trải qua nhiều microservice.
- Thiết kế **Saga**: chuỗi **local transaction** nối bằng event, mỗi bước có **compensating action** để "hoàn tác nghiệp vụ".
- Phân biệt **orchestration** (một điều phối trung tâm) với **choreography** (mỗi service phản ứng theo event) — biết chọn cái nào.
- Chỉ ra bài toán **dual-write** (ghi DB rồi publish event không atomic) và tại sao nó gây **lệch dữ liệu**.
- Cài **Outbox pattern**: ghi event vào bảng outbox **cùng transaction** với thay đổi nghiệp vụ, rồi một **relay/CDC** đọc outbox publish ra broker → atomic.
- Chống xử lý trùng ở consumer bằng **Inbox / dedup** (idempotent consumer).

---

## 2. Lý thuyết

### 2.1 Vấn đề: một nghiệp vụ, nhiều database

Trong monolith, đặt hàng là **một** transaction ACID: trừ kho, trừ tiền, tạo đơn — hoặc tất cả cùng thành công, hoặc cùng rollback. Database lo hết.

Khi tách microservice, mỗi service có **DB riêng** (database-per-service): `Order`, `Payment`, `Inventory` là ba DB độc lập. Bây giờ "đặt hàng" phải chạm cả ba. Không còn một transaction bao trùm được nữa vì không có DB nào nhìn thấy cả ba.

Giải pháp "sách giáo khoa" là **2PC (two-phase commit)**: một coordinator hỏi tất cả "prepare?", nếu tất cả OK thì bảo "commit". Nhưng 2PC gần như bị **loại bỏ** trong microservice hiện đại, vì:

| Vấn đề của 2PC | Hệ quả |
|----------------|--------|
| **Blocking** | Trong lúc "prepared", resource bị **khoá** chờ coordinator. Coordinator chậm/chết → khoá kéo dài, throughput sụp. |
| **Coordinator là SPOF** | Coordinator chết sau "prepare" → các participant treo, không biết commit hay abort (in-doubt). |
| **Không hợp broker/NoSQL** | Kafka, hầu hết NoSQL, REST API **không hỗ trợ** XA transaction. |
| **Coupling thời gian** | Cả ba service phải **sống cùng lúc** — mất hết lợi ích decoupling của messaging. |

Kết luận: ta **từ bỏ atomicity phân tán tức thì**, đổi lấy **eventual consistency** có kiểm soát. Đó chính là Saga.

### 2.2 Saga: chuỗi local transaction + compensation

**Ý tưởng cốt lõi:** thay vì một transaction lớn, chia thành **N transaction cục bộ** T1, T2, ..., Tn — mỗi cái chạy gọn trong DB của **một** service và commit ngay. Các bước nối nhau bằng **event/message**. Nếu bước Tk thất bại, ta không thể rollback các bước trước (chúng đã commit rồi!), nên ta chạy **compensating action** C(k-1), ..., C1 theo thứ tự **ngược lại** để "hoàn tác về mặt nghiệp vụ".

**Analogy đời thường:** đặt một chuyến du lịch gồm vé máy bay → khách sạn → thuê xe. Bạn đặt (và trả tiền) từng cái một, mỗi cái xác nhận ngay. Đến bước thuê xe thì hết xe → bạn **huỷ khách sạn** (bị/không bị phí) rồi **huỷ vé** (hoặc hoàn tiền). Bạn không "rollback" thời gian — bạn thực hiện **hành động bù trừ** ở đời thực. Compensation không phải undo hoàn hảo; nó là "làm điều ngược lại về nghiệp vụ".

Điểm mấu chốt: **compensation là nghiệp vụ, không phải kỹ thuật**. "Trừ tiền" bù bằng "hoàn tiền" (một giao dịch mới, có dấu vết), không phải xoá dòng như chưa từng xảy ra. Vì thế Saga chỉ đúng khi mỗi bước **có thể bù trừ được** về mặt nghiệp vụ.

<svg viewBox="0 0 680 250" role="img" aria-labelledby="sg-t sg-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="sg-t">Saga: chuỗi local transaction và compensation ngược khi lỗi</title>
<desc id="sg-d">Hàng trên T1 T2 T3 tiến tới thành công; khi T3 lỗi thì chạy C2 rồi C1 ngược lại để bù trừ</desc>
<text x="340" y="22" text-anchor="middle" font-size="13" fill="currentColor">Happy path: T1 → T2 → T3 commit lần lượt</text>
<rect x="40" y="40" width="120" height="42" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="100" y="60" text-anchor="middle" font-size="11" fill="currentColor">T1 Order</text>
<text x="100" y="75" text-anchor="middle" font-size="9" fill="currentColor">tạo PENDING</text>
<line x1="160" y1="61" x2="230" y2="61" stroke="currentColor" stroke-width="1.5" marker-end="url(#sa)"/>
<rect x="232" y="40" width="120" height="42" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="292" y="60" text-anchor="middle" font-size="11" fill="currentColor">T2 Payment</text>
<text x="292" y="75" text-anchor="middle" font-size="9" fill="currentColor">trừ tiền</text>
<line x1="352" y1="61" x2="422" y2="61" stroke="currentColor" stroke-width="1.5" marker-end="url(#sa)"/>
<rect x="424" y="40" width="120" height="42" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="484" y="60" text-anchor="middle" font-size="11" fill="currentColor">T3 Inventory</text>
<text x="484" y="75" text-anchor="middle" font-size="9" fill="currentColor">hết hàng ✗</text>
<text x="340" y="130" text-anchor="middle" font-size="13" fill="currentColor">Lỗi → compensation chạy NGƯỢC lại</text>
<rect x="232" y="150" width="120" height="42" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="292" y="170" text-anchor="middle" font-size="11" fill="currentColor">C2 Refund</text>
<text x="292" y="185" text-anchor="middle" font-size="9" fill="currentColor">hoàn tiền</text>
<rect x="40" y="150" width="120" height="42" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="100" y="170" text-anchor="middle" font-size="11" fill="currentColor">C1 Cancel</text>
<text x="100" y="185" text-anchor="middle" font-size="9" fill="currentColor">huỷ đơn</text>
<line x1="424" y1="171" x2="354" y2="171" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#sa)"/>
<line x1="232" y1="171" x2="162" y2="171" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#sa)"/>
<line x1="484" y1="82" x2="484" y2="150" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#sa)"/>
<text x="600" y="171" text-anchor="middle" font-size="9" fill="currentColor">(bù trừ nghiệp vụ)</text>
<defs><marker id="sa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Chi tiết Saga (ACD chứ không ACID — thiếu **I**solation) và các anomaly (dirty read giữa các bước, lost update) được đào sâu ở **[[ds-20-saga]]**; bài này ta tập trung phần **triển khai qua messaging**.

### 2.3 Orchestration vs Choreography

Có hai cách "điều khiển" một Saga:

**Choreography** — không ai chỉ huy. Mỗi service **lắng nghe event** của người trước, làm phần của mình, rồi **phát event** cho người sau. Logic Saga **rải** trong các service.

```text
Order  --OrderCreated-->  Payment --PaymentDebited--> Inventory --StockReserved--> Order (confirm)
                                                          |
                                                  (hết hàng) --StockFailed--> Payment (refund) --> Order (cancel)
```

**Orchestration** — một **Saga orchestrator** (một service/state machine) là "nhạc trưởng": nó gửi **command** ("hãy trừ tiền"), nhận **reply**, rồi quyết định bước kế / compensation. Logic Saga **tập trung** một chỗ.

```text
Orchestrator → command DebitPayment → Payment → reply PaymentDebited
Orchestrator → command ReserveStock → Inventory → reply StockFailed
Orchestrator → command RefundPayment → Payment  (compensation)
Orchestrator → command CancelOrder                (compensation)
```

<svg viewBox="0 0 680 220" role="img" aria-labelledby="oc-t oc-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="oc-t">Choreography phi tập trung vs Orchestration tập trung</title>
<desc id="oc-d">Bên trái các service nối chuỗi bằng event; bên phải một orchestrator ở giữa gửi command và nhận reply từng service</desc>
<text x="165" y="20" text-anchor="middle" font-size="13" fill="currentColor">Choreography (event nối chuỗi)</text>
<rect x="30" y="90" width="76" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="68" y="111" text-anchor="middle" font-size="10" fill="currentColor">Order</text>
<line x1="106" y1="107" x2="146" y2="107" stroke="currentColor" stroke-width="1.3" marker-end="url(#oa)"/>
<rect x="148" y="90" width="76" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="186" y="111" text-anchor="middle" font-size="10" fill="currentColor">Payment</text>
<line x1="224" y1="107" x2="264" y2="107" stroke="currentColor" stroke-width="1.3" marker-end="url(#oa)"/>
<rect x="266" y="90" width="76" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="304" y="111" text-anchor="middle" font-size="10" fill="currentColor">Inventory</text>
<text x="186" y="150" text-anchor="middle" font-size="9" fill="currentColor">event → event → event</text>
<text x="540" y="20" text-anchor="middle" font-size="13" fill="currentColor">Orchestration (điều phối trung tâm)</text>
<rect x="490" y="40" width="100" height="36" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="540" y="62" text-anchor="middle" font-size="10" fill="currentColor">Orchestrator</text>
<rect x="410" y="150" width="76" height="34" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="448" y="171" text-anchor="middle" font-size="10" fill="currentColor">Order</text>
<rect x="502" y="150" width="76" height="34" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="540" y="171" text-anchor="middle" font-size="10" fill="currentColor">Payment</text>
<rect x="594" y="150" width="76" height="34" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="632" y="171" text-anchor="middle" font-size="9" fill="currentColor">Inventory</text>
<line x1="520" y1="76" x2="448" y2="150" stroke="currentColor" stroke-width="1.2" marker-end="url(#oa)"/>
<line x1="540" y1="76" x2="540" y2="150" stroke="currentColor" stroke-width="1.2" marker-end="url(#oa)"/>
<line x1="560" y1="76" x2="632" y2="150" stroke="currentColor" stroke-width="1.2" marker-end="url(#oa)"/>
<text x="540" y="205" text-anchor="middle" font-size="9" fill="currentColor">command ↓ / reply ↑ (logic tập trung)</text>
<defs><marker id="oa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

| Tiêu chí | **Choreography** | **Orchestration** |
|----------|------------------|-------------------|
| Logic Saga | Rải khắp các service | Tập trung ở orchestrator |
| Coupling | Lỏng (chỉ biết event) | Service coupling với orchestrator |
| Dễ hiểu luồng | Khó — phải ghép từ nhiều nơi | Dễ — đọc một state machine |
| Số bước ít, đơn giản | **Tốt** — nhẹ, không thêm hạ tầng | Hơi nặng |
| Nhiều bước, nhánh phức tạp | Rối, dễ "cyclic event" | **Tốt** — quản lý được |
| Nguy cơ | Vòng lặp event, khó debug | Orchestrator thành SPOF / "God service" |

**Kinh nghiệm:** ≤ 3–4 bước tuyến tính → choreography. Nhiều bước, nhiều nhánh compensation, cần theo dõi trạng thái → orchestration (thường dùng state machine bền như Temporal, AWS Step Functions, Camunda, hoặc bảng `saga_state` tự viết).

---

## 3. Bài toán DUAL-WRITE

Cả Saga choreography lẫn hệ event-driven nói chung đều vấp một cái bẫy kinh điển: service phải **vừa cập nhật DB của mình, vừa publish event** ra broker. Đoạn code ngây thơ:

```java
// ❌ SAI: hai hệ thống, hai lần ghi, KHÔNG atomic
@Transactional
public void placeOrder(Order o) {
    orderRepository.save(o);          // (1) ghi vào Postgres
    kafkaTemplate.send("orders", evt); // (2) publish ra Kafka
}
```

`@Transactional` chỉ bao được (1) — nó là transaction của **Postgres**. Kafka **nằm ngoài** transaction đó. Ta có **hai** cửa ghi vào **hai** hệ thống khác nhau → có 4 kịch bản, 2 trong đó gây **lệch dữ liệu vĩnh viễn**:

| Thứ tự | (1) DB | (2) Publish | Kết quả |
|--------|--------|-------------|---------|
| A | commit ✓ | send ✓ | Đúng |
| B | commit ✓ | **send fail** ✗ | DB có đơn, **không có event** → downstream không bao giờ biết. Lệch! |
| C | rollback ✗ | (không gọi) | Đúng (không có gì xảy ra) |
| D | commit ✓ | send ✓ nhưng **app crash trước khi ack** | Có thể **gửi lại** → event trùng |

Đảo thứ tự (publish trước, save sau) cũng không cứu được: publish xong rồi DB rollback → có **event ma** cho một đơn không tồn tại. **Không có thứ tự nào đúng** vì hai lần ghi vào hai hệ thống không thể atomic nếu không có 2PC — mà ta vừa từ chối 2PC.

> Đây là **dual-write problem**: mỗi khi bạn thấy code "ghi DB **rồi** gọi ra ngoài (publish/HTTP)", hãy nghi ngờ. Đó là điểm rò rỉ nhất quán.

---

## 4. OUTBOX pattern — biến hai lần ghi thành một

**Ý tưởng:** đừng publish trực tiếp. Hãy ghi event vào một **bảng `outbox` nằm cùng DB nghiệp vụ**, trong **cùng một transaction** với thay đổi nghiệp vụ. Vì cả hai ghi vào **một** DB, transaction của DB đảm bảo **atomic**: hoặc cả đơn hàng lẫn dòng outbox cùng commit, hoặc cùng rollback. Không còn cửa lệch nào.

Sau đó một tiến trình riêng — **Message Relay** — đọc các dòng outbox chưa gửi và publish ra broker, đánh dấu đã gửi. Nếu relay chết giữa chừng, lần sau nó **đọc lại** dòng chưa gửi và thử tiếp → đảm bảo **at-least-once** (event chắc chắn ra broker, có thể trùng — xử lý ở mục 5).

<svg viewBox="0 0 680 250" role="img" aria-labelledby="ob-t ob-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="ob-t">Outbox pattern: ghi đơn hàng và event trong một transaction, relay publish sau</title>
<desc id="ob-d">Service ghi bảng orders và bảng outbox trong cùng transaction Postgres; relay đọc outbox rồi publish ra Kafka và đánh dấu đã gửi</desc>
<rect x="30" y="40" width="90" height="40" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="75" y="64" text-anchor="middle" font-size="11" fill="currentColor">Service</text>
<line x1="120" y1="60" x2="175" y2="60" stroke="currentColor" stroke-width="1.5" marker-end="url(#ba)"/>
<rect x="178" y="25" width="200" height="150" rx="8" fill="#3b82f6" fill-opacity="0.10" stroke="currentColor"/>
<text x="278" y="45" text-anchor="middle" font-size="11" fill="currentColor">Postgres — MỘT transaction</text>
<rect x="200" y="58" width="156" height="42" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="278" y="78" text-anchor="middle" font-size="10" fill="currentColor">INSERT orders</text>
<text x="278" y="92" text-anchor="middle" font-size="9" fill="currentColor">(thay đổi nghiệp vụ)</text>
<rect x="200" y="110" width="156" height="42" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="278" y="130" text-anchor="middle" font-size="10" fill="currentColor">INSERT outbox</text>
<text x="278" y="144" text-anchor="middle" font-size="9" fill="currentColor">(event, published=false)</text>
<text x="278" y="192" text-anchor="middle" font-size="9" fill="currentColor">commit atomic: cả hai hoặc không gì</text>
<line x1="356" y1="131" x2="430" y2="131" stroke="currentColor" stroke-width="1.5" marker-end="url(#ba)"/>
<rect x="432" y="110" width="90" height="42" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="477" y="130" text-anchor="middle" font-size="10" fill="currentColor">Relay</text>
<text x="477" y="144" text-anchor="middle" font-size="9" fill="currentColor">poll / CDC</text>
<line x1="522" y1="131" x2="580" y2="131" stroke="currentColor" stroke-width="1.5" marker-end="url(#ba)"/>
<rect x="582" y="110" width="80" height="42" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="622" y="130" text-anchor="middle" font-size="10" fill="currentColor">Kafka</text>
<text x="622" y="144" text-anchor="middle" font-size="9" fill="currentColor">broker</text>
<path d="M477,110 C477,95 380,95 356,120" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#ba)"/>
<text x="415" y="98" text-anchor="middle" font-size="8" fill="currentColor">mark published=true</text>
<defs><marker id="ba" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 4.1 Bảng outbox (SQL)

```sql
CREATE TABLE outbox (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type TEXT        NOT NULL,          -- 'Order'
    aggregate_id   TEXT        NOT NULL,          -- khoá dùng làm partition key
    event_type     TEXT        NOT NULL,          -- 'OrderPlaced'
    payload        JSONB       NOT NULL,          -- nội dung event
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    published      BOOLEAN     NOT NULL DEFAULT false,
    published_at   TIMESTAMPTZ
);
-- Chỉ index các dòng CHƯA gửi → poll rất rẻ dù bảng lớn
CREATE INDEX idx_outbox_unpublished ON outbox (created_at) WHERE published = false;
```

### 4.2 Ghi nghiệp vụ + event trong một transaction

```java
@Transactional                                   // MỘT transaction Postgres
public void placeOrder(Order o) {
    orderRepository.save(o);                      // (1) thay đổi nghiệp vụ
    outboxRepository.save(new OutboxEvent(        // (2) event — CÙNG transaction
        "Order", o.getId(),
        "OrderPlaced",
        toJson(new OrderPlacedEvent(o))
    ));
}   // commit: (1) và (2) atomic. KHÔNG chạm Kafka ở đây.
```

Điểm then chốt: **không còn lời gọi ra ngoài** trong đường ghi. Chỉ có DB. Atomicity do Postgres bảo đảm.

### 4.3 Message Relay — hai cách đọc outbox

**Cách A — Polling publisher** (đơn giản, tự viết được):

```java
@Scheduled(fixedDelay = 500)                      // mỗi 0.5s
@Transactional
public void relay() {
    List<OutboxEvent> batch = outboxRepo.findUnpublished(100); // ... WHERE published=false
                                                               //     ORDER BY created_at
                                                               //     LIMIT 100
                                                               //     FOR UPDATE SKIP LOCKED
    for (OutboxEvent e : batch) {
        kafka.send(e.getEventType(),
                   e.getAggregateId(),            // key = aggregate_id → giữ thứ tự per-order
                   e.getPayload())
             .get();                              // chờ ack của broker
        e.markPublished();                        // published=true, published_at=now()
    }
}
```
`FOR UPDATE SKIP LOCKED` cho phép **nhiều instance relay chạy song song** mà không giành cùng một dòng — mỗi instance khoá và lấy một lô khác nhau, tăng throughput mà vẫn an toàn. Đánh dấu `published=true` **sau khi broker ack**; nếu crash giữa chừng, lô đó chưa được đánh dấu → lần sau gửi lại (at-least-once).

**Cách B — CDC (Change Data Capture)** với Debezium — không cần cột `published`, không cần poll: Debezium **đọc Write-Ahead Log (WAL)** của Postgres, phát hiện mọi `INSERT` vào bảng `outbox` và tự động publish ra Kafka.

```json
// Debezium Outbox Event Router — cấu hình connector
{
  "name": "order-outbox-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres", "database.dbname": "orders",
    "table.include.list": "public.outbox",
    "transforms": "outbox",
    "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
    "transforms.outbox.route.by.field": "aggregate_type",
    "transforms.outbox.table.field.event.key": "aggregate_id",
    "transforms.outbox.table.field.event.payload": "payload"
  }
}
```

| | **Polling publisher** | **CDC / Debezium** |
|--|----------------------|--------------------|
| Độ trễ | ~ chu kỳ poll (100ms–vài s) | ~ thời gian thực (đọc WAL) |
| Tải DB | Query lặp lại (nhẹ nếu có partial index) | Đọc log, gần như không đụng bảng |
| Xoá dòng | Cần dọn (`published=true` rồi archive) | Có thể `DELETE` ngay sau `INSERT` (WAL vẫn ghi lại) |
| Hạ tầng | Không cần thêm | Cần Kafka Connect + Debezium |
| Thứ tự | Tự lo qua key | Debezium giữ theo thứ tự transaction log |

---

## 5. INBOX / dedup — idempotent consumer

Outbox cho **at-least-once**: event chắc chắn ra broker nhưng **có thể trùng** (relay crash sau khi broker ack nhưng trước khi đánh dấu; hoặc broker retry). Vậy **consumer phải chịu được message trùng** — gọi là **idempotent consumer**.

Cách chắc chắn nhất: **Inbox pattern** — consumer nhớ **id của mọi message đã xử lý**, và bỏ qua nếu thấy lại. Quan trọng: **ghi id vào inbox và làm nghiệp vụ trong CÙNG một transaction** (lại là outbox-tư-duy, nhưng phía nhận).

```sql
CREATE TABLE inbox_processed (
    message_id  UUID PRIMARY KEY,                 -- id duy nhất của event
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

```java
@Transactional
public void onOrderPlaced(Message msg) {
    // 1) chèn id — nếu trùng, PK vi phạm → đây là bản trùng, bỏ qua
    int inserted = inboxRepo.insertIfAbsent(msg.getId()); // INSERT ... ON CONFLICT DO NOTHING
    if (inserted == 0) return;                            // đã xử lý rồi → skip (idempotent)

    // 2) nghiệp vụ — cùng transaction với (1)
    reserveStock(msg.payload());
}   // commit: id + nghiệp vụ atomic. Retry lần sau chắc chắn thấy id → bỏ qua.
```

Vì `message_id` là primary key, hai lần xử lý cùng một event → lần hai `ON CONFLICT DO NOTHING` trả về 0 dòng → thoát. Và vì insert-id nằm **cùng transaction** với nghiệp vụ, không có khe hở "đã làm nghiệp vụ nhưng chưa kịp ghi id".

**Mẹo thực chiến:** nếu bản thân thao tác nghiệp vụ **tự nhiên idempotent** (vd `UPDATE orders SET status='PAID' WHERE id=? AND status='PENDING'`, hoặc `UPSERT` theo key) thì có khi không cần bảng inbox. Nhưng thao tác "cộng dồn" (`balance = balance - 10`) thì **bắt buộc** phải dedup, nếu không message trùng sẽ trừ tiền hai lần.

> **Bộ ba hoàn chỉnh:** Outbox (phía gửi, atomic DB+event) + broker at-least-once + Inbox/idempotent (phía nhận, chịu trùng) = luồng event-driven **không mất, không lệch, không nhân đôi tác dụng** — dù mọi thành phần đều có thể crash bất cứ lúc nào.

---

## 6. Ghép lại: Saga choreography chạy trên Outbox + Inbox

Một bước Saga đúng chuẩn, ví dụ `Payment` nhận `OrderPlaced` rồi phát `PaymentDebited`:

```java
@Transactional
public void handle(Message orderPlaced) {
    if (inboxRepo.insertIfAbsent(orderPlaced.getId()) == 0) return; // dedup (Inbox)
    debitAccount(orderPlaced.payload());                            // nghiệp vụ local
    outboxRepo.save(new OutboxEvent("Payment", accountId,           // event kế tiếp (Outbox)
        "PaymentDebited", ...));
}   // MỘT transaction: dedup + trừ tiền + ghi event ra kế tiếp — atomic
```

Mỗi service trong Saga đều theo khuôn này: **Inbox vào → nghiệp vụ → Outbox ra**, gói trong một local transaction. Relay lo việc đẩy event đi. Đây là "đơn vị nguyên tử" của một hệ event-driven đáng tin cậy.

---

## 7. Tóm tắt
- **2PC bị loại** trong microservice: blocking, coordinator là SPOF, không hợp broker/NoSQL → ta chọn **eventual consistency** có kiểm soát.
- **Saga** = chuỗi **local transaction** nối bằng event; lỗi thì chạy **compensating action** ngược lại (bù trừ nghiệp vụ, không phải undo kỹ thuật). Xem sâu **[[ds-20-saga]]**.
- **Orchestration** (điều phối trung tâm, logic tập trung, hợp luồng phức tạp) vs **Choreography** (mỗi service phản ứng event, hợp luồng ngắn).
- **Dual-write problem**: ghi DB **rồi** publish là **không atomic** → mất event hoặc event ma. Không thứ tự nào cứu được nếu không có 2PC.
- **Outbox**: ghi event vào bảng outbox **cùng transaction** với nghiệp vụ (atomic vì cùng một DB), rồi **relay** (polling hoặc CDC/Debezium) publish ra broker → **at-least-once**.
- **Inbox / idempotent consumer**: dedup theo `message_id` **cùng transaction** với nghiệp vụ → chịu được message trùng.
- Bộ ba **Outbox + broker + Inbox** cho luồng event **không mất, không lệch, không nhân đôi tác dụng**.

> **Bài tiếp theo:** quan sát & vận hành hệ event-driven — **consumer lag, tracing xuyên broker, và replay/DLQ** khi có sự cố.
