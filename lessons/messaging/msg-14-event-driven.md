# Bài 14 — Event-Driven Architecture: các kiểu event

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân biệt **event-driven** với **request-driven**, và hiểu vì sao messaging (Bài 1–13) là nền cho event-driven.
- Gọi đúng tên **COMMAND** (yêu cầu làm, có người nhận cụ thể) vs **EVENT** (đã xảy ra, broadcast) vs **MESSAGE** (từ bao trùm).
- Phân biệt **ba mức event**: *event notification*, *event-carried state transfer*, *event sourcing* — và khi nào dùng mức nào.
- Nói rõ **lợi ích** (decoupling, autonomy, scale) và **cái giá** (eventual consistency, khó truy vết luồng, thứ tự, buộc phải nghĩ về idempotency).
- Thiết kế payload event **đúng mức chi tiết**, không thiếu không thừa.

---

## 2. Lý thuyết

### 2.1 Request-driven vs Event-driven — đảo ngược sự phụ thuộc

**Request-driven** (mệnh lệnh): một service **ra lệnh** cho service khác làm gì đó và **chờ** kết quả. Bên gọi phải *biết* bên bị gọi (địa chỉ, hợp đồng API) và *chủ động điều phối* toàn bộ luồng. Đây là mô hình orchestration tập trung.

**Event-driven** (phản ứng): một service chỉ **công bố sự thật** "việc X đã xảy ra" rồi đi tiếp. Nó **không biết** ai quan tâm, không biết có bao nhiêu bên phản ứng, không chờ ai. Các service khác **tự đăng ký** nghe và tự quyết định phản ứng. Đây là mô hình choreography phân tán.

Điểm cốt lõi — **đảo chiều phụ thuộc (dependency inversion) ở mức kiến trúc**: trong request-driven, service nguồn phụ thuộc vào các service đích. Trong event-driven, service đích phụ thuộc vào *sự kiện* của service nguồn, còn nguồn **không biết gì** về đích. Muốn thêm hành vi mới → thêm một consumer nghe event có sẵn, **không đụng** vào nguồn.

> **Analogy:** Request-driven giống một quản lý gọi điện giao từng việc: "Kế toán, xuất hoá đơn đơn #123", "Kho, giữ hàng cho #123" — quản lý phải biết hết ai làm gì và chờ từng người. Event-driven giống dán một thông báo lên bảng tin công ty: "Đơn #123 đã đặt". Ai thấy liên quan tới mình thì tự làm phần của mình; ngày mai thêm phòng Loyalty, họ chỉ cần bắt đầu đọc bảng tin — người dán thông báo chẳng cần biết họ tồn tại.

### 2.2 COMMAND vs EVENT vs MESSAGE — ba khái niệm hay bị lẫn

Đây là phân biệt **nền tảng** nhưng cực hay bị nhầm. "Message" là từ *bao trùm* cho mọi đơn vị dữ liệu chạy qua broker. Bên trong nó có hai **ý định (intent)** rất khác nhau:

| | **COMMAND** | **EVENT** |
|--|-------------|-----------|
| Ý định | "Hãy **làm** việc X" | "Việc X **đã** xảy ra" |
| Thì | Tương lai / mệnh lệnh (`ReserveStock`) | Quá khứ (`StockReserved`, `OrderPlaced`) |
| Người nhận | **Một** đích cụ thể, đã biết | **0..N** subscriber, nguồn không biết trước |
| Ai quyết định kết quả | **Bên nhận** (có thể từ chối) | Đã rồi — không ai từ chối được sự thật |
| Coupling | Nguồn biết đích → coupling cao hơn | Nguồn không biết đích → coupling thấp nhất |
| Kênh điển hình | Queue point-to-point | Topic pub/sub (fan-out) |
| Có thể "quay lại"? | Chờ reply/kết quả | Fire-and-forget, không mong reply |

Còn **MESSAGE** ở nghĩa hẹp (khác command/event) đôi khi chỉ **document/dữ liệu thô** truyền đi mà không mang ý định mệnh lệnh cũng chẳng khẳng định một sự kiện — ví dụ đẩy một bản ghi để đồng bộ. Trong thực tế, ranh giới quan trọng nhất cần thuộc là **COMMAND vs EVENT**.

<svg viewBox="0 0 660 250" role="img" aria-labelledby="ce-t ce-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="ce-t">Command point-to-point vs Event broadcast</title>
<desc id="ce-d">Bên trái một command đi tới đúng một service đích đã biết; bên phải một event được phát cho nhiều subscriber mà nguồn không biết</desc>
<text x="160" y="20" text-anchor="middle" font-size="13" fill="currentColor">COMMAND — "hãy làm X"</text>
<rect x="30" y="95" width="90" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="75" y="112" text-anchor="middle" font-size="10" fill="currentColor">Order svc</text>
<text x="75" y="126" text-anchor="middle" font-size="9" fill="currentColor">(người gửi)</text>
<line x1="120" y1="115" x2="205" y2="115" stroke="currentColor" stroke-width="1.5" marker-end="url(#ae)"/>
<text x="162" y="108" text-anchor="middle" font-size="9" fill="currentColor">ReserveStock</text>
<rect x="208" y="95" width="95" height="40" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="255" y="112" text-anchor="middle" font-size="10" fill="currentColor">Inventory</text>
<text x="255" y="126" text-anchor="middle" font-size="9" fill="currentColor">(đích đã biết)</text>
<text x="160" y="165" text-anchor="middle" font-size="10" fill="currentColor">1 đích cụ thể · có thể từ chối</text>
<line x1="330" y1="30" x2="330" y2="210" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<text x="500" y="20" text-anchor="middle" font-size="13" fill="currentColor">EVENT — "X đã xảy ra"</text>
<rect x="352" y="95" width="90" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="397" y="112" text-anchor="middle" font-size="10" fill="currentColor">Order svc</text>
<text x="397" y="126" text-anchor="middle" font-size="9" fill="currentColor">(nguồn)</text>
<line x1="442" y1="115" x2="482" y2="115" stroke="currentColor" stroke-width="1.5" marker-end="url(#ae)"/>
<text x="470" y="88" text-anchor="middle" font-size="9" fill="currentColor">OrderPlaced</text>
<rect x="485" y="98" width="46" height="34" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="508" y="119" text-anchor="middle" font-size="9" fill="currentColor">Topic</text>
<line x1="531" y1="108" x2="575" y2="60" stroke="currentColor" stroke-width="1" marker-end="url(#ae)"/>
<line x1="531" y1="115" x2="575" y2="115" stroke="currentColor" stroke-width="1" marker-end="url(#ae)"/>
<line x1="531" y1="122" x2="575" y2="170" stroke="currentColor" stroke-width="1" marker-end="url(#ae)"/>
<rect x="578" y="45" width="70" height="28" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="613" y="63" text-anchor="middle" font-size="9" fill="currentColor">Email</text>
<rect x="578" y="101" width="70" height="28" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="613" y="119" text-anchor="middle" font-size="9" fill="currentColor">Inventory</text>
<rect x="578" y="157" width="70" height="28" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="613" y="175" text-anchor="middle" font-size="9" fill="currentColor">Analytics</text>
<text x="500" y="215" text-anchor="middle" font-size="10" fill="currentColor">0..N subscriber · nguồn không biết ai</text>
<defs><marker id="ae" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Một quy tắc đặt tên đơn giản mà đắt giá: **đặt tên event ở thì quá khứ** (`PaymentCaptured`, `UserRegistered`). Nếu bạn thấy mình muốn đặt tên ở thể mệnh lệnh (`SendEmail`, `ChargeCard`) thì đó là **command** trá hình — và nếu bạn broadcast một command qua topic pub/sub, bạn đang vô tình để *nhiều* consumer cùng thực thi một mệnh lệnh đáng lẽ chỉ chạy một lần. Đây là lỗi thiết kế event-driven phổ biến nhất.

### 2.3 Ba mức của event — bao nhiêu "sự thật" nên nhét vào payload?

Khi đã chọn broadcast event, câu hỏi tiếp theo là: **payload chứa gì?** Có ba mức, đi từ "gầy" tới "béo", mỗi mức đổi một trade-off khác nhau giữa **coupling**, **băng thông** và **độ mới của dữ liệu (staleness)**.

<svg viewBox="0 0 680 250" role="img" aria-labelledby="lv-t lv-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="lv-t">Ba mức event: notification, state transfer, event sourcing</title>
<desc id="lv-d">Notification payload nhỏ phải gọi ngược lấy chi tiết; state transfer mang đủ dữ liệu; event sourcing lưu chuỗi event làm nguồn sự thật</desc>
<text x="113" y="20" text-anchor="middle" font-size="12" fill="currentColor">1 · Notification</text>
<rect x="20" y="34" width="186" height="80" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="113" y="58" text-anchor="middle" font-size="10" fill="currentColor">OrderPlaced { id: 123 }</text>
<text x="113" y="76" text-anchor="middle" font-size="9" fill="currentColor">payload GẦY — chỉ báo</text>
<text x="113" y="92" text-anchor="middle" font-size="9" fill="currentColor">consumer gọi ngược</text>
<text x="113" y="106" text-anchor="middle" font-size="9" fill="currentColor">GET /orders/123</text>
<text x="340" y="20" text-anchor="middle" font-size="12" fill="currentColor">2 · State transfer</text>
<rect x="247" y="34" width="186" height="80" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="340" y="56" text-anchor="middle" font-size="10" fill="currentColor">OrderPlaced { id, items,</text>
<text x="340" y="70" text-anchor="middle" font-size="10" fill="currentColor">total, customer... }</text>
<text x="340" y="88" text-anchor="middle" font-size="9" fill="currentColor">payload BÉO — đủ data</text>
<text x="340" y="102" text-anchor="middle" font-size="9" fill="currentColor">không cần gọi ngược</text>
<text x="567" y="20" text-anchor="middle" font-size="12" fill="currentColor">3 · Event sourcing</text>
<rect x="474" y="34" width="186" height="80" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="567" y="54" text-anchor="middle" font-size="9" fill="currentColor">Created → ItemAdded →</text>
<text x="567" y="68" text-anchor="middle" font-size="9" fill="currentColor">Paid → Shipped ...</text>
<text x="567" y="86" text-anchor="middle" font-size="9" fill="currentColor">chuỗi event LÀ</text>
<text x="567" y="100" text-anchor="middle" font-size="9" fill="currentColor">nguồn sự thật</text>
<text x="113" y="150" text-anchor="middle" font-size="9" fill="currentColor">coupling thấp payload,</text>
<text x="113" y="164" text-anchor="middle" font-size="9" fill="currentColor">nhưng nguồn phải chịu tải đọc</text>
<text x="340" y="150" text-anchor="middle" font-size="9" fill="currentColor">consumer tự chủ, nhanh,</text>
<text x="340" y="164" text-anchor="middle" font-size="9" fill="currentColor">nhưng data có thể stale + béo</text>
<text x="567" y="150" text-anchor="middle" font-size="9" fill="currentColor">tái dựng state bất kỳ thời điểm,</text>
<text x="567" y="164" text-anchor="middle" font-size="9" fill="currentColor">audit đầy đủ, nhưng phức tạp</text>
<rect x="20" y="192" width="640" height="42" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="340" y="210" text-anchor="middle" font-size="10" fill="currentColor">Đi từ trái sang phải: payload càng đầy → càng ít gọi ngược, càng tự chủ</text>
<text x="340" y="226" text-anchor="middle" font-size="10" fill="currentColor">nhưng đổi lại băng thông lớn hơn, nguy cơ dữ liệu stale, và độ phức tạp tăng</text>
</svg>

**Mức 1 — Event notification.** Event chỉ mang **định danh + loại việc**, gần như không có dữ liệu: `OrderPlaced { orderId: 123 }`. Consumer nào cần chi tiết thì **gọi ngược** về nguồn (`GET /orders/123`).
- *Được*: payload nhỏ, coupling về *cấu trúc dữ liệu* thấp (consumer không phụ thuộc vào schema đầy đủ của order).
- *Mất*: mỗi consumer sinh một request gọi ngược → nguồn thành điểm nghẽn đọc; luồng khó truy vết (một event kéo theo N cuộc gọi HTTP ẩn); nếu nguồn chết thì consumer cũng kẹt.

**Mức 2 — Event-carried state transfer.** Event mang **đủ dữ liệu** để consumer xử lý mà **không cần gọi ngược**: `OrderPlaced { orderId, items[], total, customerId, shippingAddress }`. Consumer tự giữ một bản sao (read model) của phần dữ liệu nó cần.
- *Được*: consumer **tự chủ hoàn toàn** — nguồn có down thì consumer vẫn chạy; không có storm gọi ngược; giảm tải đọc lên nguồn.
- *Mất*: payload lớn hơn (băng thông, lưu trữ log); **dữ liệu có thể stale** (event chụp trạng thái tại thời điểm phát; nếu địa chỉ đổi sau đó, bản sao của consumer cũ đi cho tới event kế); nhiều consumer nhân bản dữ liệu → quản lý versioning/schema evolution khắt khe hơn.

**Mức 3 — Event sourcing.** Đây là bước nhảy về chất, không chỉ là "payload to hơn". Thay vì lưu **trạng thái hiện tại** rồi phát event như hệ quả, ta **lưu chính chuỗi event làm nguồn sự thật (source of truth)**. State hiện tại được **tính ra bằng cách replay** các event từ đầu: `Created → ItemAdded → ItemAdded → Paid → Shipped`. Không có bảng `orders` với cột `status` bị ghi đè — chỉ có một *log append-only* các sự kiện.
- *Được*: **audit trail hoàn hảo** (biết chính xác *chuyện gì đã xảy ra* và *khi nào*, không mất lịch sử vì ghi đè); tái dựng state ở **bất kỳ thời điểm quá khứ** (time-travel debugging, "đơn này trông thế nào lúc 10h?"); dễ tạo nhiều **read model/projection** khác nhau từ cùng một log; ăn khớp tự nhiên với CQRS.
- *Mất*: **phức tạp cao** — phải xử lý schema evolution của event cũ (event lưu *mãi mãi*, không sửa được), snapshotting để replay không quá chậm, và eventual consistency giữa write-side (log) và read-side (projection); tư duy khác hẳn CRUD, đội ngũ cần học lại.

Quy tắc chọn mức: **mặc định bắt đầu ở mức 2 (state transfer)** cho tích hợp giữa các service — nó cân bằng nhất giữa tự chủ và đơn giản. Dùng **mức 1** khi payload quá lớn/nhạy cảm để broadcast hoặc consumer hầu như luôn cần bản mới nhất. Chỉ dùng **mức 3** cho những domain mà **lịch sử là yêu cầu nghiệp vụ** (tài chính, kế toán, sổ cái, y tế, audit) — đừng "event-source hoá" cả hệ thống vì thấy hay.

### 2.4 Lợi ích — vì sao đáng đánh đổi

| Lợi ích | Bản chất |
|---------|----------|
| **Decoupling** | Nguồn không biết đích. Thêm/bớt consumer **không đụng** nguồn → hệ thống tiến hoá bằng cách *thêm*, không phải *sửa*. |
| **Autonomy** | Mỗi service deploy, scale, chọn công nghệ, thậm chí down độc lập. Với state transfer, consumer chạy được cả khi nguồn offline. |
| **Scale & khả năng chịu tải** | Event chảy qua broker (Kafka/SQS) → buffering spike, nhiều consumer chia partition để scale ngang (Bài 1, 3). |
| **Mở rộng hành vi** | Một event có sẵn (`OrderPlaced`) nuôi được vô số tính năng mới (loyalty, fraud, gợi ý) mà không ai chạm vào Order. |

### 2.5 Cái giá — bốn thứ buộc phải nghĩ tới

Event-driven **không miễn phí**, và cái giá của nó nằm đúng ở chỗ khó nhất của hệ phân tán:

1. **Eventual consistency.** Không có "một khoảnh khắc" mà toàn hệ đồng nhất. Sau `OrderPlaced`, inventory có thể đã trừ nhưng email chưa gửi. Nghiệp vụ và UX phải *chấp nhận* trạng thái trung gian ("đơn đang xử lý"). Nếu logic yêu cầu nhất quán tức thì (trừ số dư *trước khi* cho rút tiền), phần đó nên request-driven/transaction.
2. **Khó truy vết luồng.** Không còn một stack trace tuyến tính. Một event kích hoạt N reaction, mỗi reaction lại phát event khác → luồng nghiệp vụ **phân tán trong không gian và thời gian**. Bắt buộc phải có **correlation id / trace id** xuyên suốt và distributed tracing (Bài về observability) mới debug nổi "vì sao đơn này chưa ship?".
3. **Thứ tự (ordering).** Broadcast không đảm bảo consumer thấy event đúng thứ tự trừ khi bạn thiết kế cho nó. `OrderUpdated` tới trước `OrderCreated` là thảm hoạ. Giải pháp: **partition theo khoá thực thể** (mọi event của order 123 vào cùng partition → giữ thứ tự cho *thực thể đó*), kèm version/sequence number để consumer phát hiện event tới sai thứ tự (Bài 2, 3).
4. **Idempotency là bắt buộc.** Delivery gần như luôn là **at-least-once** (Bài 2) → consumer **sẽ** nhận trùng event (retry, rebalance, redelivery). Xử lý `PaymentCaptured` hai lần mà trừ tiền hai lần là mất tiền thật. Consumer phải **idempotent**: khử trùng theo `eventId` (bảng đã-xử-lý), hoặc thiết kế phép toán giao hoán/idempotent (set thay vì increment). Đây không phải tuỳ chọn — nó là điều kiện đúng đắn.

> **Quy tắc:** event-driven trả cho bạn decoupling và scale bằng cách *bắt bạn trả trước* chi phí về consistency, tracing, ordering và idempotency. Nếu domain của bạn không cần decoupling ở mức đó, một call request-driven đơn giản vẫn là câu trả lời đúng — đừng phân tán hoá thứ đáng lẽ là một transaction.

---

## 3. Ví dụ thực tế — cùng một luồng, ba cách viết

Cùng nghiệp vụ "khách đặt hàng", đặt cạnh nhau để thấy sự khác biệt.

**(a) Request-driven** — Order điều phối, biết hết, chờ hết:

```text
POST /orders
  Order → POST inventory/reserve   (chờ 200)
        → POST payment/charge      (chờ 200)
        → POST email/send          (chờ 200)
        → trả 201 cho client
# Order coupling với 3 service, latency = tổng, 1 service chết → cả đơn fail
```

**(b) Event-driven, notification (mức 1)** — Order chỉ phát định danh:

```json
// topic: orders.events
{ "type": "OrderPlaced", "eventId": "e-9f3a", "occurredAt": "2026-07-24T10:00:00Z",
  "data": { "orderId": 123 } }
```
```text
Inventory nhận → GET /orders/123 (gọi ngược lấy items) → trừ kho
Payment   nhận → GET /orders/123 → charge
# nguồn Order gánh N request đọc mỗi lần phát 1 event
```

**(c) Event-driven, state transfer (mức 2)** — event mang đủ dữ liệu, mỗi consumer tự chủ và idempotent theo `eventId`:

```json
// topic: orders.events   (partition key = orderId → giữ thứ tự cho từng đơn)
{ "type": "OrderPlaced", "eventId": "e-9f3a", "occurredAt": "2026-07-24T10:00:00Z",
  "version": 1,
  "data": {
    "orderId": 123, "customerId": 88,
    "items": [ { "sku": "A-1", "qty": 2 }, { "sku": "B-7", "qty": 1 } ],
    "total": 540000, "currency": "VND"
  } }
```
```python
# Consumer idempotent: đã thấy eventId thì bỏ qua (khử trùng at-least-once)
def handle(event):
    if seen_store.exists(event["eventId"]):
        return                       # trùng → no-op, an toàn
    with db.transaction():
        reserve_stock(event["data"]["items"])   # dùng data trong event, KHÔNG gọi ngược
        seen_store.add(event["eventId"])         # đánh dấu đã xử lý cùng transaction
```

Điểm mấu chốt trong (c): consumer **không gọi ngược** Order (tự chủ), **partition theo `orderId`** (giữ thứ tự cho từng đơn), và **khử trùng theo `eventId`** trong cùng transaction với side-effect (idempotency). Ba dòng đó chính là ba cái giá của event-driven được trả sòng phẳng.

---

## 4. Tóm tắt
- **Request-driven** = ra lệnh và chờ, nguồn biết đích. **Event-driven** = công bố sự thật rồi đi tiếp, nguồn *không* biết đích → đảo chiều phụ thuộc, tiến hoá bằng cách *thêm* consumer.
- **COMMAND** ("hãy làm X", 1 đích, có thể bị từ chối, thường qua queue) khác **EVENT** ("X đã xảy ra", 0..N subscriber, không ai từ chối được, thường qua topic). **MESSAGE** là từ bao trùm. Đặt tên event ở **thì quá khứ**.
- **Ba mức event**: *notification* (payload gầy, phải gọi ngược) → *state transfer* (payload đủ, consumer tự chủ, đánh đổi băng thông + staleness) → *event sourcing* (chuỗi event LÀ nguồn sự thật, audit + time-travel, đổi lấy độ phức tạp cao). Mặc định chọn mức 2.
- **Lợi ích**: decoupling, autonomy, scale, mở rộng hành vi.
- **Cái giá phải trả trước**: eventual consistency, khó truy vết luồng (cần correlation id + tracing), thứ tự (partition theo khoá + version), và **idempotency bắt buộc** (khử trùng theo `eventId` vì delivery at-least-once).

> **Bài tiếp theo (Bài 15):** đi sâu vào **event sourcing & CQRS** — cách lưu log append-only, dựng projection/read model, snapshot để replay nhanh, và xử lý schema evolution của event sống mãi mãi.
