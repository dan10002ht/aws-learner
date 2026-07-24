# Structured logging và log aggregation (Loki/ELK)

Lúc 3 giờ sáng, error rate tăng vọt. Bạn SSH vào một pod, `grep ERROR` trong `/var/log/app.log`, thấy vài dòng — nhưng traffic đã chia trên 40 pod, mỗi pod một file, log xoay vòng mỗi giờ, và pod gây lỗi có thể đã bị Kubernetes giết và tạo lại. `grep` trên một máy là vô nghĩa. Bài này dạy hai thứ đi liền nhau: **viết log sao cho máy query được** (structured logging) và **gom log của cả fleet về một chỗ để truy vấn** (aggregation) — cùng với cái giá phải trả để nó không phá sản ngân sách.

> 💡 **Nguyên tắc:** Log không phải để con người đọc từng dòng — ở quy mô production, log là **dữ liệu có cấu trúc để máy lọc, nhóm và đếm**. Nếu bạn còn phải `grep` bằng regex để tách field ra khỏi một chuỗi text tự do, bạn đang trả tiền lưu trữ cho dữ liệu mà mình không query được.

## Mục tiêu

- Phân biệt **text tự do** vs **structured logging** (JSON), và vì sao message phải **cố định** còn biến số phải tách thành field để query được.
- Dùng **`request_id` + `trace_id`** làm correlation id: sinh ở edge, **forward qua mọi service**, để ghép các mảnh log của một request rải trên nhiều máy.
- Dùng đúng **log levels** như trục filter (`error`/`warn`/`info`/`debug`) và tránh các **anti-pattern** đắt/nguy hiểm: log PII/secret, log quá nhiều, log trong hot loop.
- Nắm kiến trúc **log aggregation** bốn tầng: app → **agent** (Fluent Bit/Promtail) → **buffer** (Kafka) → **store** → **query** (Grafana/Kibana).
- So sánh hai triết lý index **Loki** (chỉ index label, rẻ) vs **ELK** (full-text, mạnh nhưng nặng), và điều khiển chi phí qua **cardinality của label** và **retention theo tier**.

## 1. Structured logging: JSON thay vì text tự do

So sánh hai cách log cùng một sự kiện:

```
# Text tự do — con người đọc được, máy thì không
2026-07-24 09:12:03 ERROR Payment failed for user 8842 order A-1993 amount 50 currency USD after 3 retries

# Structured — mỗi thông tin là một field có tên
{"ts":"2026-07-24T09:12:03.114Z","level":"error","msg":"payment failed",
 "user_id":"8842","order_id":"A-1993","amount":50,"currency":"USD",
 "retries":3,"request_id":"7f9c2ba4","trace_id":"4bf92f3577b34da6a3ce929d0e0e4736"}
```

Dòng text tự do buộc bạn viết regex mong manh để trích `user_id` — và regex vỡ ngay khi ai đó đổi câu chữ log. Với JSON, mọi field có **tên và kiểu**: bạn lọc `user_id="8842"`, nhóm theo `currency`, tính `avg(amount)` mà không parse chuỗi. Đó là khác biệt giữa "đọc log" và "query log".

Một dòng structured log tốt gồm:

| Thành phần | Vai trò | Ví dụ |
|---|---|---|
| `timestamp` | Thời điểm chính xác, ISO-8601 + timezone (UTC) | `2026-07-24T09:12:03.114Z` |
| `level` | Mức độ nghiêm trọng, để filter/route | `error`, `warn`, `info` |
| `message` | Mô tả ngắn, **cố định** (không nhét biến vào) | `"payment failed"` |
| Context fields | Biến số của sự kiện — đây là phần giá trị nhất | `user_id`, `order_id`, `amount` |
| Correlation ids | Nối các log cùng một request/trace | `request_id`, `trace_id` |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" aria-labelledby="t1 d1" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title id="t1">Text tự do vs structured log: cùng sự kiện, khả năng query khác nhau</title>
  <desc id="d1">Bên trái log text tự do phải dùng regex mong manh mới tách được field và dễ vỡ. Bên phải structured JSON có field tên và kiểu rõ ràng nên lọc, nhóm, đếm trực tiếp được.</desc>
  <text x="360" y="24" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Cùng một sự kiện — hai cách ghi, hai khả năng query</text>
  <g>
    <rect x="20" y="42" width="330" height="234" rx="10" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="185" y="66" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Text tự do</text>
    <rect x="36" y="80" width="298" height="52" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.12"/>
    <text x="46" y="100" font-size="9.5" fill="currentColor" opacity="0.8">ERROR Payment failed for user 8842</text>
    <text x="46" y="115" font-size="9.5" fill="currentColor" opacity="0.8">order A-1993 amount 50 after 3 retries</text>
    <text x="185" y="158" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.75">Muốn lọc theo user?</text>
    <text x="185" y="178" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">grep -oP 'user \d+' | ...</text>
    <text x="185" y="206" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.9" font-weight="700">Regex vỡ khi đổi câu chữ</text>
    <text x="185" y="228" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">Không nhóm, không đếm, không avg</text>
    <text x="185" y="252" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">được theo field</text>
  </g>
  <g>
    <rect x="370" y="42" width="330" height="234" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="535" y="66" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Structured (JSON)</text>
    <rect x="386" y="80" width="298" height="66" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.12"/>
    <text x="396" y="98" font-size="9" fill="currentColor" opacity="0.85">{ "level":"error", "msg":"payment failed",</text>
    <text x="396" y="112" font-size="9" fill="currentColor" opacity="0.85">  "user_id":"8842", "amount":50,</text>
    <text x="396" y="126" font-size="9" fill="currentColor" opacity="0.85">  "retries":3, "trace_id":"4bf9..." }</text>
    <text x="535" y="170" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.9" font-weight="700">Field có tên và kiểu</text>
    <text x="535" y="192" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">lọc: user_id = "8842"</text>
    <text x="535" y="210" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">nhóm: by currency</text>
    <text x="535" y="228" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">đếm/avg: avg(amount)</text>
    <text x="535" y="252" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">nối trace: join trace_id</text>
  </g>
</svg>

> ⚠️ **Bẫy:** Đừng nhét biến vào `message` (`"payment failed for user 8842"`). Message phải **cố định** để bạn nhóm được "tất cả payment failed" thành một nhóm; biến số (`user_id`) tách ra field riêng. Message động làm mỗi log là một chuỗi duy nhất — không nhóm, không đếm được.

### Viết structured log trong code

Dùng thư viện logging structured, không tự nối chuỗi. Ví dụ Python với `structlog`:

```python
import structlog

log = structlog.get_logger()

# Bind context một lần, mọi log sau đó tự kèm theo
log = log.bind(request_id=req.id, trace_id=req.trace_id, user_id=user.id)

log.info("payment started", order_id=order.id, amount=order.amount)
try:
    charge(order)
except PaymentError as e:
    # KHÔNG nội suy biến vào message; đưa vào field
    log.error("payment failed", order_id=order.id, retries=e.retries,
              error_code=e.code)
```

Go với `slog` (thư viện chuẩn từ Go 1.21):

```go
logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
// Tạo logger con mang sẵn context của request
reqLog := logger.With("request_id", reqID, "trace_id", traceID, "user_id", userID)

reqLog.Error("payment failed",
    "order_id", orderID,
    "retries", retries,
    "error_code", code)
```

Điểm chung: **bind context một lần đầu request**, mọi log trong request đó tự kế thừa — bạn không phải nhớ đính `request_id` ở từng dòng.

## 2. Correlation id và trace id: nối các mảnh của một request

Một request đi qua gateway → service A → service B → DB. Mỗi chặng log vài dòng, trên các máy khác nhau. Không có khóa chung, bạn không thể ghép chúng lại. Hai khóa cứu bạn:

- **`request_id` (correlation id):** sinh ở **điểm vào** (gateway/edge), truyền xuống mọi service qua HTTP header (`X-Request-Id`). Gắn vào mọi log của request đó. Đây là "chỉ một request này".
- **`trace_id`:** khóa của distributed tracing (OpenTelemetry / W3C `traceparent`). Rộng hơn — nối cả log **và** span trace. Có `trace_id` trên log nghĩa là từ một dòng log lỗi, bạn nhảy thẳng sang trace để xem request đó chậm/hỏng ở span nào.

```python
# Middleware: lấy id từ header hoặc sinh mới, đặt vào context
def middleware(request):
    request_id = request.headers.get("X-Request-Id") or uuid4().hex
    trace_id = extract_traceparent(request.headers)  # W3C traceparent
    with structlog.contextvars.bound_contextvars(
            request_id=request_id, trace_id=trace_id):
        response = handler(request)
    response.headers["X-Request-Id"] = request_id   # trả lại cho client
    return response
```

Khi service A gọi service B, **phải forward header** `X-Request-Id` và `traceparent` — nếu quên, chuỗi đứt tại đó. Đây là lỗi phổ biến nhất: chuỗi correlation chỉ bền bằng mắt xích yếu nhất — chỉ **một** service quên forward là đứt từ đó trở đi.

> 💡 **Nguyên tắc:** Trả `request_id` về trong response (header hoặc body lỗi). Khi khách báo "đơn của tôi lỗi lúc 9h", họ đưa bạn `request_id` từ màn hình lỗi — bạn query đúng một request thay vì mò trong hàng triệu dòng.

## 3. Log levels: dùng đúng để lọc được tín hiệu

Level không phải để trang trí — nó là **trục filter chính** và quyết định cái gì đánh thức người on-call.

| Level | Ý nghĩa | Có nên alert? |
|---|---|---|
| `error` | Một thao tác **thất bại**, cần người xem (payment lỗi, không ghi được DB) | Có (theo tỷ lệ/ngưỡng) |
| `warn` | Bất thường nhưng hệ thống tự xử lý (retry thành công, gần chạm quota) | Không trực tiếp; theo dõi xu hướng |
| `info` | Sự kiện nghiệp vụ đáng ghi (request xong, order tạo, job chạy) | Không |
| `debug` | Chi tiết cho dev khi điều tra (giá trị biến, nhánh rẽ) | Không — thường tắt ở prod |
| `trace` | Cực chi tiết (dump payload) — chỉ bật tạm | Không |

Hai lỗi hay gặp: (1) log mọi thứ ở `error` → alert nhiễu, người on-call tê liệt (alert fatigue); (2) log lỗi thật ở `info` → không ai thấy. Quy tắc: **`error` = có người cần làm gì đó; `warn` = ghi lại nhưng hệ thống tự lo; còn lại là `info`/`debug`.** Level nên **cấu hình được lúc runtime** (đổi từ `info` xuống `debug` khi điều tra mà không cần deploy lại).

## 4. Anti-pattern: những thứ làm cháy ví và lộ dữ liệu

### Log PII và secret

```python
log.info("user login", email=user.email, password=pw, card=card_number)  # THẢM HỌA
```

Log thường **ít được kiểm soát quyền** hơn database, được nhân bản sang nhiều nơi (aggregator, backup, SIEM), và giữ lâu. Log mật khẩu, số thẻ, token, PII (email, số điện thoại, địa chỉ) là vi phạm GDPR/PCI-DSS và là mỏ vàng khi hệ thống log bị lộ. Biện pháp: **redact ở tầng logging** (allow-list field được phép log, hoặc masking pattern cho số thẻ/token), và không bao giờ log nguyên `request.body`/`headers` (chứa `Authorization`).

### Log quá nhiều — chi phí bùng nổ

Log tính tiền theo **khối lượng ingest (GB/ngày)**. Một dòng log ~1KB, ở 10.000 RPS mà log 3 dòng info mỗi request = 30.000 dòng/s ≈ **2.5 TB/ngày**. Với giá ingest cỡ vài USD/GB, đó là hàng nghìn USD/ngày cho log mà 99.9% không ai đọc. Kỷ luật: log **sự kiện**, không log **mỗi bước**; sampling cho log info khối lượng lớn (giữ 100% error, 1% info); đừng log cả object lớn.

### Log trong hot loop

```python
for row in ten_million_rows:      # vòng lặp nóng
    log.debug("processing row", id=row.id)   # 10 triệu dòng log cho MỘT job
```

Log trong vòng lặp chạy hàng triệu lần vừa làm ngập storage vừa **làm chậm chính code** (mỗi lần log là serialize JSON + I/O). Log **tổng kết ngoài vòng lặp** (`log.info("processed", count=n, failed=k, duration_ms=t)`), hoặc log theo mẫu (mỗi 10.000 dòng một lần), hoặc dùng metric (counter) thay vì log cho thứ đếm được.

> ⚠️ **Bẫy:** Đừng để log I/O nằm trên đường đi nóng và **đồng bộ**. Ghi log chặn (blocking) trong request handler làm p99 latency phình lên khi backend log chậm. Log phải **async / non-blocking**: app ghi ra stdout, một agent riêng lo phần đẩy đi — app không bao giờ chờ mạng để log.

## 5. Kiến trúc log aggregation: agent → buffer → store → query

App không tự gửi log tới nơi lưu trữ. Kiến trúc chuẩn tách 4 tầng, mỗi tầng một trách nhiệm:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" aria-labelledby="t2 d2" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title id="t2">Pipeline log aggregation bốn tầng: agent thu gom, buffer chịu tải, store lưu, query truy vấn</title>
  <desc id="d2">App ghi log ra stdout. Agent chạy cạnh app (Fluent Bit hoặc Promtail) thu gom, gắn nhãn, parse. Buffer (Kafka hoặc bộ nhớ/đĩa của agent) hấp thụ burst và tách rời tốc độ. Store lưu trữ đã đánh index. Lớp query và dashboard đọc từ store để điều tra và cảnh báo.</desc>
  <text x="360" y="22" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">Log đi từ app tới nơi query được — mỗi tầng một việc</text>
  <defs>
    <marker id="lah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <rect x="18" y="60" width="120" height="150" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke-opacity="0.2"/>
    <text x="78" y="82" text-anchor="middle" stroke="none" font-weight="700">App pods</text>
    <text x="78" y="102" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.7">ghi JSON ra</text>
    <text x="78" y="115" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.7">stdout (non-block)</text>
    <rect x="34" y="128" width="88" height="20" rx="4" fill="currentColor" fill-opacity="0.06" stroke-opacity="0.12"/>
    <text x="78" y="142" text-anchor="middle" stroke="none" font-size="9">pod A</text>
    <rect x="34" y="154" width="88" height="20" rx="4" fill="currentColor" fill-opacity="0.06" stroke-opacity="0.12"/>
    <text x="78" y="168" text-anchor="middle" stroke="none" font-size="9">pod B</text>
    <rect x="34" y="180" width="88" height="20" rx="4" fill="currentColor" fill-opacity="0.06" stroke-opacity="0.12"/>
    <text x="78" y="194" text-anchor="middle" stroke="none" font-size="9">pod C</text>
  </g>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <rect x="178" y="60" width="130" height="150" rx="9" fill="#10b981" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="243" y="82" text-anchor="middle" stroke="none" font-weight="700">Agent</text>
    <text x="243" y="100" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.75">Fluent Bit /</text>
    <text x="243" y="113" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.75">Promtail (DaemonSet)</text>
    <text x="243" y="138" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.7">tail file/stdout</text>
    <text x="243" y="154" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.7">parse + gắn nhãn</text>
    <text x="243" y="170" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.7">(pod, ns, level)</text>
    <text x="243" y="190" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.7">buffer đĩa cục bộ</text>
  </g>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <rect x="348" y="60" width="120" height="150" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke-opacity="0.2"/>
    <text x="408" y="82" text-anchor="middle" stroke="none" font-weight="700">Buffer</text>
    <text x="408" y="102" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.75">Kafka / bộ đệm</text>
    <text x="408" y="132" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.7">hấp thụ burst</text>
    <text x="408" y="150" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.7">tách rời tốc độ</text>
    <text x="408" y="168" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.7">store sập vẫn</text>
    <text x="408" y="184" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.7">không mất log</text>
  </g>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <rect x="508" y="60" width="120" height="150" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="568" y="82" text-anchor="middle" stroke="none" font-weight="700">Store</text>
    <text x="568" y="102" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.75">Loki / Elastic</text>
    <text x="568" y="132" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.7">index + nén</text>
    <text x="568" y="150" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.7">retention theo tier</text>
    <text x="568" y="168" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.7">object storage (S3)</text>
  </g>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <rect x="640" y="60" width="66" height="150" rx="9" fill="#14b8a6" fill-opacity="0.15" stroke-opacity="0.2"/>
    <text x="673" y="120" text-anchor="middle" stroke="none" font-weight="700" font-size="10">Query</text>
    <text x="673" y="140" text-anchor="middle" stroke="none" font-size="9" opacity="0.7">Grafana</text>
    <text x="673" y="154" text-anchor="middle" stroke="none" font-size="9" opacity="0.7">Kibana</text>
    <text x="673" y="172" text-anchor="middle" stroke="none" font-size="9" opacity="0.7">alert</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.55">
    <line x1="138" y1="135" x2="176" y2="135" marker-end="url(#lah)"/>
    <line x1="308" y1="135" x2="346" y2="135" marker-end="url(#lah)"/>
    <line x1="468" y1="135" x2="506" y2="135" marker-end="url(#lah)"/>
    <line x1="628" y1="135" x2="638" y2="135" marker-end="url(#lah)"/>
  </g>
  <text x="360" y="240" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">App không bao giờ chờ mạng — chỉ ghi stdout. Agent + buffer lo độ tin cậy và burst.</text>
  <text x="360" y="262" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">Agent chạy như DaemonSet: một instance mỗi node, tự phát hiện pod mới, gắn metadata Kubernetes.</text>
</svg>

- **Agent** (Fluent Bit, Promtail, Vector): chạy như **DaemonSet** — một bản trên mỗi node — tail log từ stdout của mọi container, parse JSON, gắn **metadata Kubernetes** (namespace, pod, container, label), rồi đẩy đi. Nhẹ (Fluent Bit ~vài MB RAM). Agent còn buffer ra đĩa cục bộ để không mất log khi mạng chập chờn.
- **Buffer** (tùy chọn, cho quy mô lớn): Kafka giữa agent và store để **hấp thụ burst** và **tách rời** tốc độ ghi khỏi tốc độ nhận của store. Store bảo trì/sập vài phút thì log nằm trong Kafka chờ, không mất.
- **Store**: đánh index + nén + áp retention. Đây là nơi khác biệt Loki vs ELK lớn nhất.
- **Query/UI**: Grafana (LogQL) hoặc Kibana (KQL/Lucene) để truy vấn, dashboard, và tạo alert từ log.

### Cấu hình agent — Fluent Bit (parse JSON + đẩy đi)

```ini
[INPUT]
    Name              tail
    Path              /var/log/containers/*.log
    Parser            docker
    Tag               kube.*
    Refresh_Interval  5
    Skip_Long_Lines   On

[FILTER]
    Name                kubernetes        # gắn metadata pod/namespace/label
    Match               kube.*
    Merge_Log           On                # nếu message là JSON, tách thành field

[FILTER]
    Name                modify            # loại field nhạy cảm trước khi rời node
    Match               kube.*
    Remove              authorization
    Remove              password

[OUTPUT]
    Name                loki
    Match               kube.*
    Host                loki-gateway
    Labels              job=fluentbit, $kubernetes['namespace_name'], level=$level
    # CHỈ đưa field cardinality thấp lên Labels; phần còn lại vào log line
```

### Cấu hình Promtail (agent gốc của Loki)

```yaml
scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    pipeline_stages:
      - json:                       # parse JSON log line
          expressions:
            level: level
            trace_id: trace_id
      - labels:
          level:                    # promote 'level' thành label (cardinality thấp)
      # KHÔNG promote trace_id/user_id thành label — cardinality cao, giết index
    relabel_configs:
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
```

## 6. Loki vs ELK/Elasticsearch: hai triết lý index

Đây là quyết định kiến trúc trung tâm, và nó xoay quanh **cái gì được đánh index**.

- **Elasticsearch (ELK):** đánh **full-text index** mọi field. Mọi từ trong mọi log đều tra ngược được → query kiểu "tìm mọi log chứa từ `timeout` bất kỳ đâu" chạy tức thì, phân tích tùy ý mạnh. Cái giá: index chiếm dung lượng lớn (thường **bằng hoặc hơn dữ liệu gốc**), tốn RAM/CPU khi ingest, và vận hành cluster (shard, replica, JVM heap) nặng.
- **Loki:** **không** index nội dung log. Chỉ index một bộ nhỏ **label** (`namespace`, `pod`, `level`...); phần nội dung log được nén và ném thẳng vào object storage (S3/GCS) dưới dạng chunk. Query = dùng label thu hẹp tập chunk, rồi **grep song song** trong các chunk đó. Rẻ hơn nhiều (lưu trên S3, ít index), nhưng query full-text trên khoảng thời gian rộng chậm hơn và bạn phải thiết kế label cẩn thận.

| Tiêu chí | Loki | Elasticsearch (ELK) |
|---|---|---|
| Index | Chỉ label (metadata) | Full-text mọi field |
| Chi phí lưu trữ | Thấp — nội dung nén trên S3 | Cao — index thường ≥ kích thước dữ liệu |
| Query full-text tùy ý | Chậm nếu label không thu hẹp tốt | Rất nhanh, mạnh (aggregation, phân tích) |
| Tài nguyên/vận hành | Nhẹ, hợp cloud-native + Grafana | Nặng (JVM, shard, cluster tuning) |
| Ngôn ngữ query | LogQL (giống PromQL) | KQL / Lucene / ES DSL |
| Phù hợp khi | Chi phí là ràng buộc, log gắn label rõ, đã có Prometheus/Grafana | Cần search/analytics mạnh, SIEM, log ít cấu trúc |

```logql
# LogQL: label thu hẹp trước (bắt buộc), rồi lọc nội dung, rồi tính tỷ lệ lỗi
sum(rate({namespace="checkout", level="error"} |= "payment" [5m]))
  /
sum(rate({namespace="checkout"} [5m]))
```

```
# Kibana KQL: tra ngược full-text — không cần chọn "label" trước
level: "error" and message: "payment failed" and amount > 40
```

> 💡 **Nguyên tắc:** Chọn Loki khi log của bạn **đã structured và gắn label tốt**, đội đã dùng Grafana/Prometheus, và chi phí là ràng buộc thật. Chọn ELK khi bạn cần **search/analytics tùy ý mạnh** (SIEM, điều tra bảo mật, log kém cấu trúc) và chấp nhận trả giá vận hành + hạ tầng.

## 7. Retention, chi phí và cardinality của label

Ba thứ này gắn chặt và là nơi hầu hết chi phí log thất thoát.

**Cardinality của label** là sát thủ âm thầm. Với Loki, mỗi **tổ hợp giá trị label duy nhất** tạo một **stream** riêng (và một chuỗi chunk riêng). Nếu bạn promote `user_id` (hàng triệu giá trị) hoặc `request_id` (vô hạn) thành label, bạn tạo hàng triệu stream → index nổ, ingest chậm, query rã. **Quy tắc vàng: label chỉ dùng field cardinality thấp và có bounded** (`namespace`, `pod`, `level`, `region` — vài chục tới vài trăm giá trị). Field cardinality cao (`user_id`, `trace_id`, `order_id`) **để trong nội dung log**, lọc bằng `|= "user_id=8842"` khi cần, không làm label. Elasticsearch cũng khổ với **mapping explosion** khi mỗi log có field tên khác nhau → hàng chục nghìn field trong mapping.

**Retention theo tier** — không phải log nào cũng cần giữ như nhau:

| Tier | Ví dụ | Giữ bao lâu | Cách lưu |
|---|---|---|---|
| Nóng, query nhiều | error/warn app, audit | 7–30 ngày | Store index đầy đủ (Loki/ES) |
| Ấm, ít query | info | 3–7 ngày, sampling | Index tối thiểu hoặc chỉ S3 |
| Lạnh, tuân thủ | audit/security cần giữ theo luật | 1–7 năm | Object storage nén (S3 Glacier), không index |

**Kiểm soát chi phí** — vì log tính theo GB ingest và GB lưu:

- **Sampling ở agent:** giữ 100% `error`/`warn`, sample `info` (ví dụ 10%), drop `debug` ở prod. Fluent Bit/Vector làm được ngay tại node trước khi trả tiền ingest.
- **Drop field thừa** ở agent (headers, trường trùng lặp).
- **Áp compaction + retention** ở store; đẩy dữ liệu cũ xuống S3 lớp rẻ.
- **Metric hóa cái đếm được:** thứ bạn chỉ cần đếm/đo (số request, latency) → dùng metrics (rẻ hơn log hàng bậc). Log dành cho **ngữ cảnh sự kiện lẻ** cần điều tra.

> ⚠️ **Bẫy:** Một dev thêm `log.info("cache hit", key=...)` trong hot path và promote `key` thành label. Vài ngày sau hóa đơn log gấp 5 lần và Loki query chậm như rùa. Cardinality của label là thứ **phải review trong PR** — nó không tự lộ ra cho tới khi hóa đơn về.

## 8. Tóm tắt

- **Structured logging** (JSON: `timestamp`, `level`, `message` cố định, context fields) biến log từ "text để đọc" thành "dữ liệu để query" — lọc, nhóm, đếm theo field thay vì regex mong manh.
- **`request_id` + `trace_id`** gắn vào mọi log, sinh ở edge và **forward qua mọi service**, là thứ duy nhất ghép các mảnh của một request rải trên nhiều máy lại với nhau.
- **Log levels dùng đúng**: `error` = cần người xử lý, `warn` = tự xử lý nhưng ghi lại, `info`/`debug` = ngữ cảnh. Sai level → alert fatigue hoặc lỗi thật bị chìm.
- **Anti-pattern chết người**: log PII/secret (rủi ro pháp lý + lộ dữ liệu), log quá nhiều (hóa đơn nổ), log trong hot loop (chậm code + ngập storage). Log phải async, redact, và có kỷ luật khối lượng.
- **Kiến trúc aggregation**: app → stdout → **agent** (Fluent Bit/Promtail, DaemonSet) → **buffer** (Kafka) → **store** → **query** (Grafana/Kibana). App không bao giờ chờ mạng.
- **Loki** (index label, rẻ, hợp Grafana) vs **ELK** (full-text index, search mạnh, nặng và đắt) — chọn theo nhu cầu search và ràng buộc chi phí.
- **Cardinality của label** và **retention theo tier** là hai đòn bẩy chi phí lớn nhất: label chỉ dùng field bounded, giữ log theo mức độ cần thiết, sampling + metric hóa cái đếm được.

## Liên hệ sang AWS

- **CloudWatch Logs** là store + agent mặc định trên AWS: **CloudWatch Agent** hoặc **Fluent Bit qua Firelens** (cho ECS/Fargate) thu gom log container. Log tính tiền theo **GB ingest** (đắt) + GB lưu — nên sampling và drop field ở tầng agent tiết kiệm trực tiếp.
- **Structured JSON log tự động parse**: CloudWatch Logs nhận JSON thì **CloudWatch Logs Insights** query được theo field (`fields @timestamp, user_id | filter level="error" | stats count() by error_code`) — đúng tinh thần structured logging, không cần regex.
- **Metric filter**: biến pattern trong log thành **CloudWatch metric** rồi alarm — tương đương "metric hóa cái đếm được", rẻ hơn giữ log để đếm.
- **Firelens + Fluent Bit** trên ECS/Fargate route log đa đích: một luồng lên CloudWatch (nóng), một luồng xuống **S3** (lạnh, tuân thủ) — chính là retention theo tier. S3 lifecycle đẩy xuống Glacier cho log cũ.
- **OpenSearch Service** = Elasticsearch/Kibana managed: dùng khi cần full-text search/analytics/SIEM mạnh (Security Lake, log phân tích) — bạn vẫn tự lo cardinality/mapping và trả giá hạ tầng như ELK tự quản.
- **`trace_id` nối với X-Ray**: gắn X-Ray trace id vào log để từ một dòng lỗi trong CloudWatch nhảy sang **X-Ray** xem trace — đúng vai trò của `trace_id` ở mục 2.
- **Chạy Loki trên AWS**: Loki dùng **S3** làm chunk store (rẻ) chính là mô hình "index nhỏ + nội dung trên object storage" — lựa chọn chi phí thấp thay cho OpenSearch khi log đã structured và gắn label tốt.
