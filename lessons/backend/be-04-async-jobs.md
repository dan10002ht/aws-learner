# Async Processing & Background Jobs

Một request HTTP đồng bộ là một lời hứa: "tôi sẽ trả lời bạn ngay bây giờ, hoặc thất bại ngay bây giờ". Nhưng rất nhiều việc trong hệ thống thực tế không cần — và không nên — giữ lời hứa đó: gửi email, resize ảnh, đồng bộ dữ liệu sang hệ thống khác, tính toán báo cáo. Bài này nói về cách tách những việc đó sang xử lý bất đồng bộ một cách **đúng**, vì làm sai thì hậu quả không phải là bug UI mà là mất tiền, mất dữ liệu, hoặc gửi email cho khách hàng 7 lần.

## 1. Khi nào nên tách sang async?

Câu hỏi đầu tiên không phải "dùng queue gì" mà là "việc này có cần nằm trong request path không?". Dấu hiệu nên tách:

| Dấu hiệu | Ví dụ | Lý do tách |
|---|---|---|
| Người dùng không cần kết quả ngay | Gửi email xác nhận, push notification | Giảm latency, request chỉ cần biết "đã ghi nhận" |
| Việc chậm hoặc latency không đoán được | Gọi API bên thứ 3, render PDF, transcode video | Không để third-party kéo sập p99 của bạn |
| Việc có thể retry an toàn | Đồng bộ sang search index, warm cache | Retry trong worker dễ hơn retry trong request |
| Traffic spike vượt khả năng downstream | Flash sale ghi đơn hàng vào hệ thống kho cũ kỹ | Queue làm bộ đệm hấp thụ đỉnh tải (load leveling) |
| Cần fan-out 1 sự kiện → N việc | "Order created" → email, kho, analytics, loyalty | Pub/sub thay vì gọi tuần tự N service |

Dấu hiệu **không** nên tách:

- Người dùng cần kết quả để đi tiếp (kiểm tra tồn kho trước khi thanh toán). Async ở đây chỉ đổi 1 vấn đề latency lấy 1 vấn đề polling/notification phức tạp hơn.
- Việc cần strong consistency ngay trong response ("số dư còn lại của bạn là...").
- Hệ thống còn nhỏ và việc đó chỉ tốn 50ms. Queue thêm độ trễ, thêm hạ tầng, thêm chế độ lỗi mới. Đừng trả chi phí đó khi chưa cần.

> 💡 Ghi nhớ: tách sang async là **đổi latency lấy độ phức tạp về consistency**. Bạn không xoá việc khó đi — bạn chuyển nó từ "request chậm" thành "dữ liệu có thể trễ và message có thể lặp". Hãy chắc chắn vế sau dễ chịu hơn vế trước.

## 2. Queue worker pattern — giải phẫu cơ bản

```
Producer (API) ──▶ Queue ──▶ Worker pool ──▶ Side effects (DB, email, API ngoài)
                    │
                    └──▶ DLQ (message hỏng)
```

Vòng đời một message (mô hình kiểu SQS):

1. Producer **enqueue** message.
2. Worker **receive** — message không bị xoá, chỉ bị **ẩn** trong khoảng *visibility timeout*.
3. Worker xử lý xong → **ack/delete** message.
4. Worker chết hoặc xử lý quá lâu → hết visibility timeout → message **hiện lại**, worker khác nhận.

Bước 4 chính là nguồn gốc của mọi rắc rối thú vị: nó đảm bảo không mất message (at-least-once), nhưng đồng nghĩa message **có thể được xử lý nhiều lần**.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Vòng đời một message kiểu SQS</title>
  <desc>Máy trạng thái của message: từ Visible khi enqueue, sang In-flight (ẩn trong visibility timeout) khi worker receive, rồi Deleted khi ack. Nếu worker chết hoặc quá lâu thì hết timeout, message quay về Visible để worker khác nhận lại — đây là nguồn gốc của at-least-once và duplicate.</desc>
  <defs>
    <marker id="ah-life" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Vòng đời message (mô hình SQS)</text>
  <g stroke="currentColor" fill="none" marker-end="url(#ah-life)" stroke-width="1.4">
    <path d="M150 92 H300"/>
    <path d="M450 92 H560"/>
    <path d="M375 168 C 300 230, 180 200, 130 120"/>
  </g>
  <g font-size="11" fill="currentColor">
    <text x="225" y="84" text-anchor="middle">receive (worker nhận)</text>
    <text x="505" y="84" text-anchor="middle">ack / delete</text>
    <text x="245" y="222" text-anchor="middle" fill="#f59e0b">hết visibility timeout → hiện lại</text>
  </g>
  <g>
    <rect x="30" y="72" width="120" height="44" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="90" y="92" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Visible</text>
    <text x="90" y="108" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">chờ trong queue</text>
  </g>
  <g>
    <rect x="300" y="72" width="150" height="44" rx="10" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="375" y="92" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">In-flight (ẩn)</text>
    <text x="375" y="108" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">trong visibility timeout</text>
  </g>
  <g>
    <rect x="560" y="72" width="130" height="44" rx="10" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="625" y="92" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Deleted</text>
    <text x="625" y="108" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">xử lý xong</text>
  </g>
  <g>
    <text x="375" y="150" font-size="11.5" font-weight="700" text-anchor="middle" fill="#f59e0b">worker chết / xử lý quá lâu</text>
    <rect x="40" y="270" width="650" height="58" rx="10" fill="#8b5cf6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="56" y="293" font-size="11.5" font-weight="700" fill="currentColor">Hệ quả at-least-once:</text>
    <text x="56" y="312" font-size="11" fill="currentColor" opacity="0.8">message hiện lại → worker khác nhận lại cùng job → có thể xử lý nhiều lần → DUPLICATE. Mọi consumer phải idempotent.</text>
  </g>
</svg>

```python
# Vòng lặp worker điển hình
while True:
    messages = queue.receive(max=10, wait_seconds=20)  # long polling
    for msg in messages:
        try:
            handle(msg.body)          # side effects ở đây
            queue.delete(msg)         # CHỈ ack sau khi xong
        except RetryableError:
            pass                      # không ack → message tự quay lại sau timeout
        except FatalError:
            dlq.send(msg); queue.delete(msg)
```

> ⚠️ Bẫy production: visibility timeout ngắn hơn thời gian xử lý thực tế. Job mất 90 giây, timeout 30 giây → message hiện lại khi worker **vẫn đang chạy** → 2 worker xử lý song song cùng một job. Triệu chứng: "thỉnh thoảng email bị gửi đôi, không tái hiện được". Luôn đặt visibility timeout ≥ 2–6 lần thời gian xử lý p99, hoặc gia hạn (heartbeat) trong lúc chạy.

## 3. At-least-once và hệ quả tất yếu

Hầu hết queue (SQS standard, RabbitMQ, Kafka consumer mặc định) đảm bảo **at-least-once delivery**. Lý do mang tính nền tảng chứ không phải do nhà cung cấp lười: giữa "xử lý xong" và "ack" luôn có một khoảng hở. Crash trong khoảng hở đó → hệ thống không thể biết bạn đã xử lý chưa → buộc phải gửi lại. Lựa chọn duy nhất còn lại là at-most-once (ack trước, xử lý sau — crash thì **mất** message), gần như không bao giờ là thứ bạn muốn cho business logic.

Hệ quả: **mọi consumer phải chịu được message lặp**. Đây không phải edge case — duplicate xảy ra do retry của producer, do visibility timeout, do network partition, do bạn redeploy worker giữa chừng.

### Idempotent consumer

Idempotent = xử lý N lần cho kết quả y như xử lý 1 lần. Ba kỹ thuật theo thứ tự ưu tiên:

**a) Phép toán tự nhiên idempotent.** `SET status = 'shipped'` chạy 10 lần vẫn đúng. `UPDATE balance = balance - 100` chạy 2 lần là mất tiền. Khi thiết kế, ưu tiên *set tuyệt đối* thay vì *delta tương đối*.

**b) Dedup key + conditional write.** Mỗi message mang một `idempotency_key` (do producer sinh, gắn với *ý định nghiệp vụ*, ví dụ `order_id + "send_confirmation"`). Consumer ghi key vào bảng dedup **trong cùng transaction** với side effect:

```sql
BEGIN;
INSERT INTO processed_messages (idempotency_key) VALUES ($1);
  -- UNIQUE constraint: lần 2 sẽ fail ở đây → ROLLBACK → bỏ qua message
INSERT INTO shipments (...) VALUES (...);
COMMIT;
```

Vì cùng transaction nên không có trạng thái nửa vời: hoặc cả dedup-key lẫn nghiệp vụ cùng được ghi, hoặc không gì cả.

**c) Conditional write trên chính bản ghi nghiệp vụ.** Không cần bảng phụ nếu trạng thái nghiệp vụ tự nói lên việc đã xử lý:

```sql
UPDATE orders SET status = 'paid', paid_at = now()
WHERE id = $1 AND status = 'pending';
-- affected_rows = 0 → đã xử lý rồi (hoặc trạng thái không hợp lệ) → bỏ qua
```

> ⚠️ Bẫy production: side effect **ngoài** database (gửi email, gọi Stripe) không nằm trong transaction được. Mẫu đúng: claim trước bằng conditional write (`pending → sending`), gọi external API, rồi finalize (`sending → sent`). Crash giữa chừng vẫn có thể gửi đôi email — với external API, hãy truyền idempotency key xuống cho **họ** dedup (Stripe, SES đều hỗ trợ). Idempotency chỉ trọn vẹn khi xuyên suốt cả chuỗi.

> 💡 Ghi nhớ: dedup key phải đại diện cho **ý định nghiệp vụ**, không phải message ID. Message ID đổi mỗi lần producer retry → 2 message khác ID nhưng cùng một ý định → dedup theo message ID vẫn double-charge như thường.

## 4. Outbox pattern — vì sao "ghi DB rồi publish event" là sai

Tình huống kinh điển: tạo đơn hàng trong DB **và** publish event `OrderCreated` lên queue. Code ngây thơ:

```python
def create_order(data):
    db.transaction(lambda: orders.insert(data))   # bước 1
    queue.publish("OrderCreated", data)            # bước 2 — ❌
```

Hai hệ thống độc lập, không có transaction chung (dual-write problem):

- Crash giữa bước 1 và 2 → đơn hàng tồn tại nhưng **không ai biết** — kho không trừ, email không gửi. Lỗi này im lặng và chỉ lộ ra khi khách gọi điện.
- Đảo thứ tự (publish trước, commit sau)? Tệ hơn: consumer nhận event về một đơn hàng **chưa tồn tại** (hoặc transaction rollback → không bao giờ tồn tại).
- Bỏ publish vào trong transaction? Network call trong transaction kéo dài lock, và queue ack thành công không có nghĩa transaction sẽ commit.

Không có thứ tự nào đúng cả. Lời giải: **chỉ ghi vào một nơi** — chính DB của bạn — và để việc publish thành một bước async riêng.

### Transactional Outbox

```sql
BEGIN;
INSERT INTO orders (...) VALUES (...);
INSERT INTO outbox (event_type, payload, created_at)
       VALUES ('OrderCreated', $json, now());
COMMIT;  -- atomic: đơn hàng và "lời hứa publish" sống chết cùng nhau
```

Một **relay process** (poller hoặc CDC như Debezium đọc WAL/binlog) đọc bảng outbox, publish lên queue, đánh dấu đã gửi. Relay crash sau publish nhưng trước khi đánh dấu? Publish lại → duplicate → nhưng consumer của bạn đã idempotent (mục 3) nên vô hại. Mọi mảnh ghép khớp vào nhau: **outbox đảm bảo at-least-once publish, idempotent consumer hấp thụ duplicate**.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Transactional Outbox và relay process</title>
  <desc>Một transaction duy nhất ghi atomic cả bảng orders lẫn bảng outbox vào cùng database. Một relay (poller hoặc CDC) đọc outbox, publish event lên queue, rồi đánh dấu đã gửi. Vì chỉ ghi vào một nơi nên không còn dual-write làm mất event.</desc>
  <defs>
    <marker id="ah-ob" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Outbox + relay — chỉ ghi vào MỘT nơi</text>
  <g>
    <rect x="20" y="48" width="250" height="160" rx="12" fill="#3b82f6" fill-opacity="0.10" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="36" y="70" font-size="12" font-weight="700" fill="currentColor">1 TRANSACTION (atomic)</text>
    <rect x="40" y="84" width="210" height="44" rx="8" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="145" y="104" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">INSERT orders</text>
    <text x="145" y="120" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">dữ liệu nghiệp vụ</text>
    <rect x="40" y="140" width="210" height="44" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="145" y="160" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">INSERT outbox</text>
    <text x="145" y="176" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">"lời hứa publish"</text>
    <text x="145" y="200" font-size="10.5" font-style="italic" text-anchor="middle" fill="currentColor" opacity="0.8">COMMIT — cùng sống chết</text>
  </g>
  <g>
    <rect x="320" y="98" width="150" height="60" rx="10" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="395" y="124" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Relay / CDC</text>
    <text x="395" y="142" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">poller · Debezium</text>
  </g>
  <g>
    <rect x="520" y="98" width="180" height="60" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="610" y="124" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Queue</text>
    <text x="610" y="142" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">event đã publish</text>
  </g>
  <g stroke="currentColor" fill="none" marker-end="url(#ah-ob)" stroke-width="1.4">
    <path d="M270 162 C 290 175, 300 150, 318 135"/>
    <path d="M470 128 H516"/>
    <path d="M395 158 C 360 215, 320 215, 300 178"/>
  </g>
  <g font-size="10.5" fill="currentColor">
    <text x="293" y="195" text-anchor="middle">đọc outbox</text>
    <text x="493" y="118" text-anchor="middle">publish</text>
    <text x="340" y="222" fill="#10b981">đánh dấu sent</text>
  </g>
  <g>
    <rect x="20" y="248" width="680" height="52" rx="10" fill="#f59e0b" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="36" y="270" font-size="11.5" font-weight="700" fill="currentColor">Vì sao tránh dual-write:</text>
    <text x="36" y="288" font-size="11" fill="currentColor" opacity="0.8">"ghi DB rồi publish" = 2 hệ thống không transaction chung → crash giữa chừng làm MẤT event. Outbox gộp về 1 commit.</text>
  </g>
</svg>

| | Dual-write ngây thơ | Outbox + relay |
|---|---|---|
| Mất event | Có thể (crash giữa 2 bước) | Không (event commit cùng data) |
| Event ma (data rollback) | Có thể | Không |
| Duplicate event | Có thể | Có — nhưng đã được thiết kế để chịu |
| Chi phí | 0 | Bảng phụ + relay + dọn dẹp outbox |

## 5. Saga & compensation — transaction xuyên service

Khi một nghiệp vụ trải qua nhiều service (đặt vé = trừ tiền + giữ ghế + xuất vé), bạn không có distributed transaction tử tế (2PC chậm, fragile, hầu hết managed service không hỗ trợ). **Saga** = chuỗi local transaction, mỗi bước có một **compensating action** để "hoàn tác nghiệp vụ" nếu bước sau thất bại:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 280" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Saga: chuỗi forward và đường compensation</title>
  <desc>Hàng trên là chuỗi local transaction tiến tới: charge_payment, reserve_seat, issue_ticket. Khi issue_ticket fail, saga chạy ngược đường compensation: release_seat rồi refund_payment để hoàn tác nghiệp vụ các bước đã thành công.</desc>
  <defs>
    <marker id="ah-fwd" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#10b981"/>
    </marker>
    <marker id="ah-cmp" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#f59e0b"/>
    </marker>
  </defs>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Saga — forward và compensation</text>
  <text x="16" y="58" font-size="11.5" font-weight="700" fill="#10b981">Forward (chuỗi local transaction)</text>
  <g>
    <rect x="20" y="68" width="160" height="46" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="100" y="96" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">charge_payment</text>
    <rect x="280" y="68" width="160" height="46" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="360" y="96" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">reserve_seat</text>
    <rect x="540" y="68" width="160" height="46" rx="10" fill="#ef4444" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="620" y="92" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">issue_ticket</text>
    <text x="620" y="107" font-size="10" font-weight="700" text-anchor="middle" fill="#ef4444">✗ FAIL</text>
  </g>
  <g stroke="#10b981" fill="none" marker-end="url(#ah-fwd)" stroke-width="1.6">
    <path d="M180 91 H276"/>
    <path d="M440 91 H536"/>
  </g>
  <text x="16" y="166" font-size="11.5" font-weight="700" fill="#f59e0b">Compensation (chạy ngược — KHÔNG phải rollback)</text>
  <g>
    <rect x="20" y="176" width="160" height="46" rx="10" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="100" y="204" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">refund_payment</text>
    <rect x="280" y="176" width="160" height="46" rx="10" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="360" y="204" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">release_seat</text>
  </g>
  <g stroke="#f59e0b" fill="none" marker-end="url(#ah-cmp)" stroke-width="1.6">
    <path d="M620 114 V199 H444"/>
    <path d="M280 199 H184"/>
  </g>
  <text x="232" y="246" font-size="10.5" fill="currentColor" opacity="0.75">mỗi bước thành công có một hành động bù trừ; refund là giao dịch MỚI, không xoá lịch sử</text>
</svg>

Điểm cần khắc cốt: compensation **không phải rollback**. Tiền đã trừ thì refund là một giao dịch mới (khách có thể đã thấy SMS trừ tiền); email đã gửi thì chỉ có thể gửi email "xin lỗi". Saga chấp nhận hệ thống đi qua các trạng thái trung gian quan sát được — đó là cái giá của việc bỏ lock toàn cục.

Hai kiểu điều phối:

- **Choreography**: mỗi service nghe event của service trước, tự biết phải làm gì. Ít coupling, nhưng flow nằm rải rác — debug "đơn này kẹt ở đâu" là đi lần theo 5 service.
- **Orchestration**: một orchestrator giữ state machine, gọi từng bước, quyết định compensation. Dễ quan sát, dễ reason, đổi lại có một điểm tập trung. Với flow > 3 bước hoặc có nhánh, orchestration thường thắng.

> 💡 Ghi nhớ: thiết kế compensation **trước khi** viết happy path. Nếu một bước không thể bù trừ (gửi hàng rồi không lấy lại được), hãy đẩy nó xuống **cuối** saga — làm những việc dễ hoàn tác trước, việc không hoàn tác được sau cùng.

## 6. Scheduler & delayed jobs

Hai nhu cầu khác nhau, đừng nhập nhằng:

- **Recurring** (cron): "mỗi đêm 2h chạy báo cáo". Bẫy: chạy nhiều instance của scheduler → job chạy đôi. Cần leader election hoặc distributed lock (`SELECT ... FOR UPDATE SKIP LOCKED`, hoặc đơn giản hơn — một managed scheduler bên ngoài trigger qua queue, để chính queue + idempotency lo phần dedup).
- **Delayed/one-off**: "gửi nhắc nhở sau 24h nếu chưa thanh toán". Cách làm phổ biến: ghi `due_at` vào DB, một poller quét `WHERE due_at <= now() AND status = 'pending'` với `SKIP LOCKED`; hoặc dùng delay có sẵn của queue (SQS delay tối đa 15 phút — đủ cho retry backoff, không đủ cho 24h; với delay dài thì DB-poller hoặc EventBridge Scheduler là đúng bài).

> ⚠️ Bẫy production: delayed job kiểu "nhắc nếu chưa thanh toán" phải **kiểm tra lại điều kiện lúc chạy**, không phải lúc lên lịch. Giữa lúc đặt lịch và lúc chạy, thế giới đã đổi — khách có thể đã thanh toán. Job lên lịch là "đến giờ thì xem xét", không phải "đến giờ thì làm".

## 7. Poison message & Dead Letter Queue

Poison message = message mà worker xử lý kiểu gì cũng fail (payload hỏng, bug ở consumer, dữ liệu tham chiếu đã bị xoá). Không có DLQ, nó tạo vòng lặp vĩnh cửu: receive → throw → quay lại queue → receive... Worker pool của bạn dành 100% năng lực nhai đi nhai lại vài message hỏng, message lành mạnh phía sau **chết đói** — một message hỏng đánh sập throughput cả hệ thống.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Poison message và Dead Letter Queue</title>
  <desc>Message fail được retry và quay lại queue. Khi vượt maxReceiveCount, thay vì lặp vô hạn làm nghẽn worker pool, message bị chuyển sang DLQ. DLQ có alarm khi depth lớn hơn 0 và có quy trình redrive đẩy message về queue chính sau khi fix.</desc>
  <defs>
    <marker id="ah-dlq" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Poison message → DLQ (chặn vòng lặp vĩnh cửu)</text>
  <g>
    <rect x="30" y="56" width="150" height="56" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="105" y="80" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Queue chính</text>
    <text x="105" y="98" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">message</text>
    <rect x="290" y="56" width="150" height="56" rx="10" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="365" y="80" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Worker</text>
    <text x="365" y="98" font-size="10" text-anchor="middle" fill="#ef4444">xử lý → FAIL</text>
  </g>
  <g stroke="currentColor" fill="none" marker-end="url(#ah-dlq)" stroke-width="1.4">
    <path d="M180 84 H286"/>
    <path d="M365 112 C 320 165, 180 150, 105 116"/>
  </g>
  <g font-size="10.5" fill="currentColor">
    <text x="233" y="76" text-anchor="middle">receive</text>
    <text x="225" y="160" text-anchor="middle" fill="#f59e0b">quay lại (receiveCount++)</text>
  </g>
  <g>
    <rect x="540" y="56" width="160" height="56" rx="10" fill="#ef4444" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="620" y="80" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">DLQ</text>
    <text x="620" y="98" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">message hỏng</text>
  </g>
  <g stroke="currentColor" fill="none" marker-end="url(#ah-dlq)" stroke-width="1.6">
    <path d="M440 84 H536"/>
  </g>
  <text x="488" y="76" font-size="10.5" font-weight="700" text-anchor="middle" fill="#ef4444">&gt; maxReceiveCount</text>
  <g>
    <rect x="540" y="150" width="160" height="44" rx="9" fill="#ef4444" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="620" y="170" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Alarm</text>
    <text x="620" y="186" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">DLQ depth &gt; 0</text>
  </g>
  <g stroke="currentColor" fill="none" marker-end="url(#ah-dlq)" stroke-width="1.4" stroke-dasharray="5 4">
    <path d="M620 112 V146"/>
    <path d="M540 172 C 300 250, 160 200, 105 118"/>
  </g>
  <text x="300" y="240" font-size="10.5" font-weight="700" fill="#10b981">redrive sau khi fix bug/data (consumer idempotent → an toàn)</text>
  <g>
    <rect x="30" y="262" width="670" height="48" rx="10" fill="#8b5cf6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="46" y="291" font-size="11" fill="currentColor" opacity="0.85">Không có DLQ: receive → throw → quay lại → receive… vô hạn → worker pool nghẽn, message lành chết đói.</text>
  </g>
</svg>

Phòng tuyến chuẩn:

1. **maxReceiveCount** (ví dụ 3–5): message fail quá N lần → tự động chuyển sang **DLQ**.
2. **Alarm trên DLQ depth** — DLQ không có alarm là một cái hố chôn lỗi trong im lặng. `DLQ > 0` phải có người nhìn.
3. **Quy trình redrive**: phân loại nguyên nhân → fix bug/data → đẩy message từ DLQ về queue chính xử lý lại. Vì consumer idempotent (lại mục 3!) nên redrive cả lô là an toàn.
4. Phân biệt lỗi **retryable** (timeout, 503 — cứ để retry với backoff) và **fatal** (payload không parse được — đẩy thẳng DLQ ngay, đừng phí 5 lần retry).

> 💡 Ghi nhớ: retry phải có **exponential backoff + jitter**. Retry tức thì N lần đồng loạt từ cả worker pool chính là tự tổ chức một cuộc DDoS vào downstream đang ốm — và là cách biến sự cố 30 giây thành sự cố 30 phút.

## 8. Backpressure — khi producer nhanh hơn consumer

Queue là bộ đệm, không phải hố không đáy. Producer enqueue 1000 msg/s, worker xử lý 200 msg/s → queue dài ra 800 msg/s → **độ trễ end-to-end tăng vô hạn**: email xác nhận đến sau 4 tiếng vẫn là "hệ thống chạy bình thường" theo dashboard CPU.

Metric quan trọng nhất không phải queue depth tuyệt đối mà là **tuổi của message cũ nhất** (oldest message age) — nó đo trực tiếp điều người dùng cảm nhận.

Các tầng phản ứng, từ rẻ đến đắt:

| Chiến lược | Khi nào | Trade-off |
|---|---|---|
| **Scale worker** theo queue depth / message age | Consumer là bottleneck, downstream còn sức | Dễ — nhưng vô nghĩa nếu nghẽn ở DB phía sau (chỉ chuyển chỗ tắc) |
| **Batching** ở consumer | Side effect hỗ trợ batch (bulk insert, batch API) | Tăng throughput 10x với cùng tài nguyên; đổi lấy latency từng item |
| **Rate limit / shed load ở producer** | Downstream là tài nguyên cố định | Trả 429 cho việc không thiết yếu; cần phân loại độ ưu tiên |
| **Bounded queue + chặn producer** | Thà fail nhanh còn hơn hứa rồi trễ 4 tiếng | Đẩy backpressure ngược lên caller — đau, nhưng trung thực |
| **Drop / sample** | Dữ liệu chịu mất được (metrics, log) | Không bao giờ áp dụng cho business event |

> ⚠️ Bẫy production: autoscale worker theo queue depth khi bottleneck thật là database. Queue dài → scale 10x worker → 10x connection và 10x query đập vào DB đang nghẹt → DB sập hẳn → queue còn dài hơn → scale tiếp. Bạn vừa xây một vòng lặp tự huỷ. Luôn xác định bottleneck **thật** trước khi scale, và đặt trần concurrency của worker theo sức chịu của downstream.

## 9. "Exactly-once" là marketing

Bạn sẽ gặp các tuyên bố "exactly-once delivery". Hãy tách bạch hai khái niệm:

- **Exactly-once delivery** (giao đúng 1 lần qua network không tin cậy): bất khả thi về mặt lý thuyết — đây là biến thể của bài toán Two Generals. Ack có thể thất lạc, và khi đó người gửi buộc phải chọn gửi lại (→ duplicate) hoặc không (→ mất).
- **Exactly-once processing semantics** (hiệu ứng như thể xử lý đúng 1 lần): khả thi — và cách hiện thực luôn là **at-least-once delivery + dedup/idempotency ở đâu đó**. Kafka transactions, SQS FIFO dedup, Flink checkpointing — bóc lớp vỏ ra đều là cơ chế này.

Giới hạn thực tế cần biết: SQS FIFO dedup chỉ trong cửa sổ 5 phút; Kafka EOS chỉ trọn vẹn trong vòng đời Kafka→Kafka — bước cuối cùng ghi ra DB hay gọi API ngoài vẫn là việc của bạn. Hệ quả thực dụng:

> 💡 Ghi nhớ: đừng đi mua "exactly-once" từ hạ tầng — hãy **xây idempotency vào consumer** rồi dùng queue nào cũng được. Idempotent consumer là kỹ năng nền: nó cứu bạn khỏi duplicate của queue, của retry, của outbox relay, của redrive DLQ, và của cả đồng nghiệp bấm "chạy lại job" hai lần.

## 10. Checklist thiết kế một background job

1. Việc này có thật sự cần async không? (Mục 1)
2. Idempotency key là gì, gắn với ý định nghiệp vụ nào?
3. Consumer dedup bằng cách nào — conditional write hay bảng processed?
4. Event sinh ra cùng DB write có đi qua outbox không?
5. Visibility timeout ≥ thời gian xử lý p99 × hệ số an toàn?
6. Retry: phân loại retryable/fatal, backoff + jitter, maxReceiveCount?
7. DLQ có alarm và quy trình redrive chưa?
8. Metric oldest-message-age có trên dashboard và có ngưỡng cảnh báo?
9. Trần concurrency của worker có khớp sức chịu của downstream?
10. Flow nhiều bước: compensation cho từng bước là gì, bước không hoàn tác được có nằm cuối không?

## Liên hệ sang AWS

| Khái niệm trong bài | Service / tính năng AWS |
|---|---|
| Queue worker, visibility timeout, long polling | **SQS Standard** — at-least-once, scale gần như vô hạn; visibility timeout mặc định 30s, chỉnh theo p99 và có thể gia hạn bằng `ChangeMessageVisibility` |
| Dedup phía hạ tầng (cửa sổ 5 phút) + ordering | **SQS FIFO** — `MessageDeduplicationId` + `MessageGroupId`; throughput thấp hơn Standard, và vẫn nên idempotent ở consumer |
| Fan-out 1 event → N consumer | **SNS → nhiều SQS** (mỗi consumer một queue riêng để retry độc lập), hoặc **EventBridge** khi cần content-based routing, schema registry, tích hợp SaaS |
| Poison message & DLQ | **SQS redrive policy** (`maxReceiveCount` → DLQ) + DLQ redrive console/API để đẩy ngược về source queue; alarm CloudWatch trên `ApproximateNumberOfMessagesVisible` của DLQ |
| Backpressure & autoscale | Scale worker (ECS/Lambda) theo **`ApproximateAgeOfOldestMessage`** — đúng hơn là theo queue depth; Lambda event source mapping có `maximumConcurrency` để đặt trần bảo vệ downstream |
| Conditional write / idempotent consumer | **DynamoDB conditional writes** — `ConditionExpression: attribute_not_exists(pk)` làm bảng idempotency với TTL tự dọn; trên RDS là UNIQUE constraint + transaction |
| Saga orchestration | **Step Functions** — state machine có retry/catch từng bước, nhánh compensation tường minh, lịch sử execution để debug "đơn kẹt ở đâu"; Express workflow cho flow ngắn khối lượng lớn |
| Scheduler & delayed jobs | **EventBridge Scheduler** — cron lẫn one-time schedule (giải quyết giới hạn delay 15 phút của SQS), tự retry và có DLQ riêng |
| Outbox relay | Poller trên RDS/Aurora, hoặc **DynamoDB Streams / Aurora + Debezium trên MSK** làm CDC — commit và publish tách thành hai bước có đảm bảo |
| Email/notification idempotent ở đích | **SES**/Stripe-style API nhận idempotency key — truyền key xuyên suốt từ producer tới external call |

Sợi chỉ đỏ của toàn bài, và cũng là câu trả lời cho phần lớn câu hỏi thiết kế async trong phỏng vấn lẫn production: **at-least-once delivery + idempotent consumer + outbox cho dual-write + DLQ có người trông**. Bốn mảnh đó ghép lại cho bạn độ tin cậy "như exactly-once" mà không cần tin vào phép màu của bất kỳ vendor nào.
