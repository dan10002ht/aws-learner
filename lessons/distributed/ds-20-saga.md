# Bài 20 — Saga pattern & compensation

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích vì sao **2PC không hợp** cho giao dịch dài (long-lived transaction) trải nhiều service, và **Saga** thay thế nó thế nào.
- Mô tả bản chất Saga: **chuỗi local transaction** + **compensating action** (hành động bù) khi có lỗi giữa chừng.
- Phân biệt hai kiểu điều phối: **choreography** (event-driven, mỗi service tự phản ứng) vs **orchestration** (một điều phối viên trung tâm) — và chọn đúng.
- Hiểu Saga **hy sinh isolation** như thế nào, và các kỹ thuật bù lại: **semantic lock**, **commutative update**, **reread / re-validate**.
- Thiết kế được một Saga đặt hàng thật (payment → inventory → shipping) kèm nhánh hoàn tác, và cân nhắc trade-off với 2PC.

---

## 2. Lý thuyết

### 2.1 Vấn đề: giao dịch trải nhiều service

Ở Bài 7 ta thấy **2PC (two-phase commit)** cho phép nhiều node **commit-hoặc-abort cùng nhau** một cách atomic. Nhưng 2PC giữ **lock trên tất cả participant** suốt từ lúc `prepare` đến lúc `commit`, và **chặn (blocking)** nếu coordinator chết đúng lúc participant đang ở trạng thái *prepared*.

Với một giao dịch **ngắn** trong một database thì ổn. Nhưng hãy tưởng tượng một đơn hàng đi qua **Payment**, **Inventory**, **Shipping** — ba service, ba database riêng, có khi gọi cả **cổng thanh toán bên thứ ba** mất vài giây. Nếu dùng 2PC:

- Lock hàng tồn kho bị giữ suốt thời gian chờ cổng thanh toán → **throughput sụp**, hàng "kẹt" không ai mua được.
- Cổng thanh toán bên thứ ba **không nói được ngôn ngữ 2PC** — nó không có nút "prepare rồi chờ tôi".
- Coordinator chết giữa chừng → participant kẹt ở *prepared*, **giữ lock vô thời hạn**.

> **Long-lived transaction (LLT)**: giao dịch kéo dài (giây → phút → giờ, thậm chí ngày) và/hoặc trải nhiều hệ thống độc lập. Giữ lock suốt thời gian đó là **không chấp nhận được**.

Khái niệm Saga ra đời từ đúng bài toán này (Garcia-Molina & Salem, 1987): thay vì **một** giao dịch atomic khổng lồ giữ lock lâu, ta chẻ nó thành **nhiều giao dịch nhỏ commit ngay**, và chuẩn bị sẵn cách **hoàn tác** nếu về sau hỏng.

### 2.2 Saga là gì — bản chất

> **Saga** = một chuỗi các **local transaction** `T1, T2, …, Tn`. Mỗi `Ti` commit **ngay và độc lập** trong database của service của nó. Với mỗi `Ti` ta định nghĩa một **compensating transaction** `Ci` có tác dụng **hoàn tác về mặt ngữ nghĩa** (semantically undo) những gì `Ti` đã làm.

Một Saga chạy được đúng **một trong hai kết cục**:

- **Thành công**: `T1, T2, …, Tn` chạy hết → coi như giao dịch tổng hoàn tất.
- **Thất bại** tại `Tk`: chạy các compensation **theo thứ tự ngược** `C(k-1), C(k-2), …, C1` để trả hệ thống về trạng thái nhất quán về mặt nghiệp vụ.

Điểm mấu chốt phải khắc cốt ghi tâm: **compensation KHÔNG phải rollback**. Rollback của database xoá sạch dấu vết như chưa từng xảy ra. Compensation là một giao dịch **mới**, chạy **sau** khi `Ti` đã commit và **đã hiện ra bên ngoài**. Bạn không thể "chưa từng trừ tiền" — bạn chỉ có thể **hoàn tiền**, và bản ghi hoàn tiền đó là một sự kiện có thật trong lịch sử.

<svg viewBox="0 0 720 250" role="img" aria-labelledby="sg-t sg-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="sg-t">Saga: chuỗi local transaction xuôi và chuỗi compensation ngược</title>
<desc id="sg-d">T1 T2 T3 chạy xuôi, khi T3 lỗi thì chạy C2 rồi C1 theo thứ tự ngược lại</desc>
<rect x="30" y="30" width="120" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="52" text-anchor="middle" font-size="13" fill="currentColor">T1 Payment</text>
<text x="90" y="68" text-anchor="middle" font-size="11" fill="currentColor">trừ tiền</text>
<rect x="200" y="30" width="120" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="260" y="52" text-anchor="middle" font-size="13" fill="currentColor">T2 Inventory</text>
<text x="260" y="68" text-anchor="middle" font-size="11" fill="currentColor">giữ hàng</text>
<rect x="370" y="30" width="120" height="46" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="430" y="52" text-anchor="middle" font-size="13" fill="currentColor">T3 Shipping</text>
<text x="430" y="68" text-anchor="middle" font-size="11" fill="#f43f5e">LỖI ✗</text>
<line x1="150" y1="53" x2="198" y2="53" stroke="currentColor" stroke-width="1.5" marker-end="url(#sga)"/>
<line x1="320" y1="53" x2="368" y2="53" stroke="currentColor" stroke-width="1.5" marker-end="url(#sga)"/>
<rect x="200" y="150" width="120" height="46" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="260" y="172" text-anchor="middle" font-size="13" fill="currentColor">C2 Inventory</text>
<text x="260" y="188" text-anchor="middle" font-size="11" fill="currentColor">nhả hàng</text>
<rect x="30" y="150" width="120" height="46" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="172" text-anchor="middle" font-size="13" fill="currentColor">C1 Payment</text>
<text x="90" y="188" text-anchor="middle" font-size="11" fill="currentColor">hoàn tiền</text>
<line x1="430" y1="78" x2="430" y2="120" stroke="#f43f5e" stroke-width="1.5"/>
<line x1="430" y1="120" x2="322" y2="120" stroke="#f43f5e" stroke-width="1.5"/>
<line x1="322" y1="120" x2="270" y2="148" stroke="#f43f5e" stroke-width="1.5" marker-end="url(#sgr)"/>
<line x1="200" y1="173" x2="152" y2="173" stroke="#f59e0b" stroke-width="1.5" marker-end="url(#sgr)"/>
<text x="360" y="138" text-anchor="middle" font-size="11" fill="#f43f5e">compensate ngược</text>
<defs><marker id="sga" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker><marker id="sgr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#f59e0b"/></marker></defs>
</svg>

### 2.3 Analogy đời thường

Hãy nghĩ tới việc **đi du lịch tự đặt**: bạn (1) đặt vé máy bay, (2) đặt khách sạn, (3) thuê xe. Không có "quầy nào" khoá cả ba lại rồi commit chung. Bạn đặt từng cái một, mỗi cái **xác nhận ngay**. Đến bước thuê xe mà hết xe, bạn **không** giả vờ như chưa từng đặt vé — bạn phải **huỷ vé (chịu phí huỷ)** và **huỷ khách sạn**. Việc "huỷ vé" chính là **compensation**: một hành động bù có thật, có khi tốn phí, chứ không phải phép màu xoá lịch sử.

Chi tiết này lộ ra bản chất Saga: bạn đánh đổi tính atomic tức thời để lấy **không giữ khoá** — cái giá là phải **thiết kế đường lùi cho từng bước** và chấp nhận rằng ở giữa chừng hệ thống **tạm thời không nhất quán** (vé đã đặt nhưng đơn du lịch cuối cùng sẽ bị huỷ).

### 2.4 Hai kiểu điều phối: Choreography vs Orchestration

Saga cần một "bộ não" quyết định bước nào chạy tiếp và khi nào bù. Có hai kiến trúc:

**Choreography** — không có bộ não trung tâm. Mỗi service **phát event** khi làm xong local transaction, và các service khác **lắng nghe event** để tự kích hoạt bước của mình. Logic Saga **nằm rải** trong các service, kết nối qua một message broker (Kafka, RabbitMQ...).

**Orchestration** — có một **orchestrator** (điều phối viên) trung tâm giữ **state machine** của Saga. Nó **ra lệnh** cho từng service ("Payment, hãy trừ tiền"), nhận reply, rồi quyết định lệnh kế tiếp hoặc lệnh compensation. Logic Saga **tập trung một chỗ**.

<svg viewBox="0 0 720 300" role="img" aria-labelledby="co-t co-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="co-t">Choreography event-driven so với Orchestration tập trung</title>
<desc id="co-d">Bên trái các service nối nhau qua event broker, bên phải một orchestrator điều khiển ba service</desc>
<text x="180" y="24" text-anchor="middle" font-size="14" fill="currentColor">Choreography (event-driven)</text>
<rect x="40" y="45" width="90" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="85" y="70" text-anchor="middle" font-size="12" fill="currentColor">Payment</text>
<rect x="130" y="120" width="110" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="185" y="142" text-anchor="middle" font-size="11" fill="currentColor">Event broker</text>
<rect x="40" y="190" width="90" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="85" y="215" text-anchor="middle" font-size="12" fill="currentColor">Inventory</text>
<rect x="230" y="190" width="90" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="275" y="215" text-anchor="middle" font-size="12" fill="currentColor">Shipping</text>
<line x1="130" y1="72" x2="150" y2="118" stroke="currentColor" stroke-width="1.3" marker-end="url(#coa)"/>
<line x1="160" y1="154" x2="115" y2="188" stroke="currentColor" stroke-width="1.3" marker-end="url(#coa)"/>
<line x1="215" y1="154" x2="260" y2="188" stroke="currentColor" stroke-width="1.3" marker-end="url(#coa)"/>
<text x="175" y="255" text-anchor="middle" font-size="10" fill="currentColor">mỗi service tự phản ứng theo event</text>
<line x1="360" y1="30" x2="360" y2="270" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" opacity="0.4"/>
<text x="545" y="24" text-anchor="middle" font-size="14" fill="currentColor">Orchestration (tập trung)</text>
<rect x="490" y="55" width="110" height="42" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="545" y="80" text-anchor="middle" font-size="12" fill="currentColor">Orchestrator</text>
<rect x="410" y="190" width="86" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="453" y="215" text-anchor="middle" font-size="11" fill="currentColor">Payment</text>
<rect x="502" y="190" width="86" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="545" y="215" text-anchor="middle" font-size="11" fill="currentColor">Inventory</text>
<rect x="594" y="190" width="86" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="637" y="215" text-anchor="middle" font-size="11" fill="currentColor">Shipping</text>
<line x1="520" y1="97" x2="460" y2="188" stroke="currentColor" stroke-width="1.3" marker-end="url(#coa)"/>
<line x1="545" y1="97" x2="545" y2="188" stroke="currentColor" stroke-width="1.3" marker-end="url(#coa)"/>
<line x1="570" y1="97" x2="630" y2="188" stroke="currentColor" stroke-width="1.3" marker-end="url(#coa)"/>
<text x="545" y="255" text-anchor="middle" font-size="10" fill="currentColor">orchestrator ra lệnh + nhận reply</text>
<defs><marker id="coa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

| Tiêu chí | Choreography | Orchestration |
|----------|--------------|---------------|
| Vị trí logic | Rải trong các service | Tập trung ở orchestrator |
| Coupling | Loose — service chỉ biết event | Service phụ thuộc orchestrator gọi |
| Nhìn ra flow | Khó — phải đọc nhiều service mới hình dung được | Dễ — flow nằm gọn một state machine |
| Điểm lỗi tập trung | Không có (phi tập trung) | Orchestrator là chỗ cần HA |
| Hợp khi | Saga ngắn 2–4 bước, ít nhánh | Saga nhiều bước, nhiều nhánh, cần audit |
| Rủi ro | "Cyclic dependency" giữa event, khó debug | Orchestrator phình thành "God service" |

> **Quy tắc chọn trong thực tế:** Saga đơn giản, ít bước, team muốn dịch vụ tự trị → **choreography**. Saga phức tạp, nhiều điều kiện rẽ nhánh, cần quan sát/audit rõ trạng thái → **orchestration**. Đa số hệ thống nghiêm túc (dùng Temporal, Camunda, AWS Step Functions, hay orchestrator tự viết) nghiêng về **orchestration** vì khả năng quan sát và kiểm soát vượt trội.

### 2.5 Saga thiếu Isolation — và cách bù

Đây là phần khó nhất và hay bị bỏ qua. Saga cho ta **A**tomicity (qua compensation), **C** và **D** (mỗi local transaction đã ACID). Nhưng nó **KHÔNG có I (Isolation)**.

Vì mỗi `Ti` commit **ngay**, kết quả của nó **hiện ra ngoài trước khi Saga kết thúc**. Một giao dịch khác có thể **đọc thấy trạng thái nửa vời** của Saga đang chạy. Các bất thường điển hình:

- **Dirty read**: Saga B đọc dữ liệu Saga A vừa ghi, rồi A bị compensate → B đã hành động trên dữ liệu "ma".
- **Lost update**: A và B cùng cập nhật một bản ghi giữa các bước Saga, ghi đè nhau.
- **Fuzzy / non-repeatable read**: một Saga đọc cùng dữ liệu hai lần ở hai bước, giá trị đổi giữa chừng.

Không có khoá dài để chống, ta dùng các **counter-measure ở tầng ứng dụng**:

| Kỹ thuật | Ý tưởng | Ví dụ |
|----------|---------|-------|
| **Semantic lock** | Đặt một **cờ trạng thái** đánh dấu bản ghi "đang trong Saga", các actor khác thấy cờ thì chờ/từ chối/xử lý đặc biệt | Order để `status = PENDING`; compensation đổi thành `CANCELLED`; đơn khác không đụng vào đơn `PENDING` |
| **Commutative update** | Thiết kế thao tác **giao hoán** để thứ tự áp dụng không đổi kết quả → hết lo lost update | Dùng `balance += -100` (delta) thay vì `SET balance = 900`; hai delta cộng kiểu gì cũng đúng tổng |
| **Reread / re-validate** | Trước khi ghi, **đọc lại** và kiểm tra dữ liệu chưa đổi (optimistic, so version); đổi rồi thì abort/retry | So `version` trước khi trừ kho; lệch thì làm lại |
| **Pessimistic view** | Sắp xếp lại thứ tự bước để **giảm cửa sổ** dữ liệu rủi ro bị đọc bẩn | Đưa bước dễ-fail lên sớm, để trạng thái "chắc ăn" xuất hiện muộn |
| **By value** | Chọn choreography/orchestration & mức đối phó **theo giá trị/rủi ro nghiệp vụ** của từng request | Đơn 10 triệu xử lý chặt hơn đơn 10 nghìn |

**Semantic lock** là công cụ chủ lực: nó là một "khoá mềm" ở tầng nghiệp vụ (`PENDING`, `RESERVED`, `AUTHORIZED`) thay cho khoá cứng của DB. Nó không chặn ghi ở tầng storage, nhưng **báo cho logic nghiệp vụ biết dữ liệu đang bất định** để hành xử cho đúng — và compensation có nhiệm vụ **giải phóng cờ đó**.

---

## 3. Ví dụ thực chiến: Saga đặt hàng (orchestration)

Đơn hàng đi qua **Payment → Inventory → Shipping**. Ta thiết kế đầy đủ mỗi bước, compensation, và semantic lock.

| Bước | Local transaction `Ti` | Compensation `Ci` | Semantic lock |
|------|------------------------|-------------------|---------------|
| 1 | `Order`: tạo đơn `status=PENDING` | `Order.status = CANCELLED` | cờ `PENDING` |
| 2 | `Payment`: authorize + charge, ghi `payment_id` | `Payment`: refund theo `payment_id` | `AUTHORIZED` |
| 3 | `Inventory`: `reserved += qty` (delta) | `Inventory`: `reserved -= qty` | bản ghi `RESERVED` |
| 4 | `Shipping`: tạo lệnh giao, `Order.status=CONFIRMED` | `Shipping`: huỷ lệnh giao | — (bước cuối) |

Định nghĩa bảng và các thao tác **commutative** (dùng delta, không `SET` tuyệt đối) để tránh lost update khi nhiều Saga đụng cùng SKU:

```sql
-- Inventory: giữ hàng bằng DELTA (commutative), có guard chống âm kho
UPDATE inventory
   SET reserved = reserved + :qty
 WHERE sku = :sku
   AND available - reserved >= :qty;   -- guard: đủ hàng mới cho giữ
-- rowcount = 0  => hết hàng => Saga fail => chạy compensation ngược

-- Compensation của bước Inventory: nhả đúng lượng đã giữ (giao hoán)
UPDATE inventory
   SET reserved = reserved - :qty
 WHERE sku = :sku;
```

Mỗi lệnh và mỗi compensation phải **idempotent** (Bài 7): message có thể tới hai lần. Cách chuẩn là ghi một **saga log / inbox** theo `(saga_id, step)` để bỏ qua lần lặp:

```sql
-- Chặn xử lý lặp cùng một bước của cùng một saga
INSERT INTO saga_step_log (saga_id, step, applied_at)
VALUES (:saga_id, 'INVENTORY_RESERVE', now())
ON CONFLICT (saga_id, step) DO NOTHING;   -- đã áp dụng rồi -> no-op
```

Orchestrator giữ một **state machine** rõ ràng. Dạng giả mã điều phối:

```python
# Orchestrator: state machine của Order Saga
def handle(saga):
    match saga.state:
        case "STARTED":
            send(PaymentCharge(saga.id, saga.amount));  saga.state = "PAYING"
        case "PAYING" if reply.ok:
            send(InventoryReserve(saga.id, saga.sku, saga.qty)); saga.state = "RESERVING"
        case "RESERVING" if reply.ok:
            send(ShippingCreate(saga.id, saga.addr));    saga.state = "SHIPPING"
        case "SHIPPING" if reply.ok:
            saga.state = "COMPLETED"                     # thành công cả chuỗi
        # ---- nhánh lỗi: đi ngược, chỉ bù các bước ĐÃ hoàn tất ----
        case _ if reply.failed:
            saga.state = "COMPENSATING"
            for step in reversed(saga.completed_steps):  # C(k-1)...C1
                send(compensation_for(step, saga.id))
            saga.state = "ABORTED"
```

Điểm thiết kế cần nhớ:
- **Orchestrator phải bền (durable) & tự phục hồi**: state Saga ghi xuống DB sau mỗi bước; nếu orchestrator restart, nó **đọc lại state và tiếp tục**. Đây là lý do người ta dùng Temporal/Step Functions — chúng lo sẵn phần durable state + retry.
- **Compensation phải luôn "thành công cuối cùng"**: nếu refund thất bại tạm thời, **retry mãi** (with backoff); Saga không có khái niệm "bỏ cuộc để trạng thái treo". Thứ không thể compensate (email đã gửi) thì đặt ở **bước cuối cùng** — gọi là **pivot transaction / retriable step**.
- **Pivot transaction**: bước mà sau nó Saga **chỉ tiến, không lùi** (các bước sau đều retriable). Đặt hành động **không thể bù** (gửi mail, in vé) sau pivot để không bao giờ phải hoàn tác chúng.

Bản choreography tương đương: Payment sau khi charge phát event `PaymentCharged`; Inventory nghe event đó, giữ hàng, phát `StockReserved`; Shipping nghe `StockReserved`... Khi Inventory hết hàng, nó phát `StockReserveFailed`; Payment nghe event này và **tự chạy refund**. Không ai "ra lệnh" — chuỗi tự chảy theo event.

---

## 4. Trade-off: Saga vs 2PC

| Tiêu chí | 2PC (2-phase commit) | Saga |
|----------|----------------------|------|
| Atomicity | Thật sự atomic (all-or-nothing tức thời) | "Atomic nghiệp vụ" qua compensation |
| Isolation | Có (giữ lock tới khi commit) | **Không** — phải tự bù (semantic lock...) |
| Giữ lock | Lâu, suốt prepare→commit | Ngắn, chỉ trong từng local txn |
| Blocking | Có — coordinator chết làm participant kẹt | Không blocking; luôn tiến hoặc bù |
| Độ trễ / throughput | Kém khi giao dịch dài hoặc đông | Cao — không chờ nhau giữ lock |
| Hợp với LLT / bên thứ ba | Không (cần mọi bên nói 2PC) | Có — chỉ cần commit cục bộ + bù |
| Độ phức tạp code | Thấp (DB lo) | Cao (tự thiết kế compensation, idempotency, isolation) |
| Trạng thái trung gian lộ ra ngoài | Không | Có — hệ tạm thời không nhất quán |

Tóm ý: **2PC đổi throughput lấy sự đơn giản và isolation mạnh**, chỉ hợp giao dịch ngắn trong hạ tầng bạn kiểm soát cả hai đầu. **Saga đổi isolation và độ phức tạp code lấy khả năng chạy dài, không blocking, xuyên nhiều service/bên thứ ba** — đúng gu của kiến trúc microservice hiện đại. Không có cái nào "tốt hơn" tuyệt đối; chọn theo **thời lượng giao dịch và ranh giới sở hữu hệ thống**.

> **Bẫy thường gặp:** dùng Saga nhưng **quên rằng nó không có isolation** → sinh dirty read, lost update rồi đổ cho "bug ngẫu nhiên". Hễ chọn Saga là **bắt buộc** ngồi liệt kê các anomaly và gắn counter-measure ở mục 2.5 — đó là phần việc thật, không phải tuỳ chọn.

---

## 5. Tóm tắt
- **Saga** thay 2PC cho **long-lived / cross-service transaction**: chuỗi **local transaction commit ngay** + **compensating action** hoàn tác về mặt ngữ nghĩa khi lỗi. Compensation là giao dịch **mới**, không phải rollback.
- Lỗi tại bước `Tk` → chạy `C(k-1)…C1` **theo thứ tự ngược**.
- **Choreography** (event-driven, phi tập trung, loose coupling, hợp Saga ngắn) vs **orchestration** (một orchestrator giữ state machine, dễ quan sát/audit, hợp Saga phức tạp).
- Saga **mất Isolation**; bù bằng **semantic lock** (cờ `PENDING/RESERVED`), **commutative update** (delta thay SET), **reread/re-validate** (so version), reorder giảm cửa sổ rủi ro.
- Mọi bước và compensation phải **idempotent**; đặt hành động không-thể-bù sau **pivot transaction**; orchestrator phải **durable + tự phục hồi** và **retry compensation tới cùng**.
- So với 2PC: Saga **không blocking, throughput cao, xuyên nhiều bên** nhưng **code phức tạp, trạng thái trung gian lộ ra, tự lo isolation**.

> **Bài tiếp theo (Bài 21):** khi Saga và mọi thao tác qua mạng có thể bị lặp/mất reply — ta cần **idempotency & exactly-once (semantics)** ở tầng message: dedup key, outbox pattern, và vì sao "exactly-once delivery" là ảo tưởng còn "exactly-once processing" thì làm được.
