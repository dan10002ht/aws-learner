# API Design: REST, gRPC, GraphQL & Webhooks

API là **hợp đồng công khai** của hệ thống — code bên trong có thể refactor thoải mái, nhưng API đã ship thì gần như không rút lại được. Một Solutions Architect giỏi không hỏi "REST hay GraphQL cái nào xịn hơn", mà hỏi: **ai là consumer, traffic pattern thế nào, và chi phí thay đổi hợp đồng về sau là bao nhiêu**. Bài này đi qua 4 phong cách chính và các quyết định thiết kế lặp lại ở mọi hệ thống production.

## 1. REST đúng nghĩa — không phải "JSON over HTTP"

Phần lớn API tự nhận là REST thực ra chỉ là RPC qua HTTP. REST đúng nghĩa xoay quanh **resource** và **uniform interface**:

- **Resource là danh từ, không phải động từ**: `POST /orders` thay vì `POST /createOrder`. Hành động đặc biệt thì model thành sub-resource: `POST /orders/123/cancellation` thay vì `POST /orders/123/cancel` (tranh cãi được, nhưng nhất quán mới là điều quan trọng).
- **HTTP method mang ngữ nghĩa**: GET (safe, cacheable), PUT (idempotent, replace toàn bộ), PATCH (partial update), DELETE (idempotent), POST (không idempotent mặc định).
- **Status code là một phần của hợp đồng**:

| Code | Khi nào dùng | Lỗi hay gặp |
|---|---|---|
| 200 / 201 / 204 | OK / Created (kèm `Location`) / xong nhưng không có body | Trả 200 kèm `{"error": ...}` trong body — phá cache và monitoring |
| 400 vs 422 | Request sai cú pháp vs đúng cú pháp nhưng sai nghiệp vụ | Dồn hết mọi thứ vào 400 |
| 401 vs 403 | Chưa xác thực vs đã xác thực nhưng không có quyền | Trả 403 khi token hết hạn khiến client không biết phải refresh |
| 404 | Không tồn tại — hoặc **giấu** resource khỏi người không có quyền | Trả 403 cho resource của người khác → lộ thông tin "resource này tồn tại" |
| 409 | Conflict (version mismatch, duplicate) | Trả 500 cho unique constraint violation |
| 429 | Rate limited | Quên header `Retry-After` |
| 503 | Quá tải / maintenance | Trả 500 khiến client không biết có nên retry |

### HATEOAS thực dụng

HATEOAS "đầy đủ" (client tự khám phá toàn bộ API qua link) gần như không ai làm vì client thực tế hard-code route. Phiên bản **thực dụng** đáng làm:

- Trả link phân trang (`next`, `prev`) trong response — client không phải tự build URL.
- Trả các **action khả dụng** theo trạng thái: order ở trạng thái `shipped` thì không có link `cancel`. Client render nút theo link thay vì duplicate business rule.

> Ghi nhớ: Giá trị thật của REST không phải "đúng chuẩn Fielding" mà là **tính dự đoán được**: dev mới nhìn `GET /users/42/orders?status=paid` là hiểu ngay, cache/proxy/gateway hiểu ngay, không cần đọc docs.

## 2. Pagination: offset vs cursor

```
GET /orders?offset=10000&limit=20      -- offset-based
GET /orders?cursor=eyJpZCI6OTk4fQ&limit=20   -- cursor-based
```

| Tiêu chí | Offset | Cursor (keyset) |
|---|---|---|
| Hiệu năng trang sâu | O(n) — DB phải scan và bỏ qua `offset` row | O(log n) — `WHERE (created_at, id) < (?, ?)` đi thẳng vào index |
| Dữ liệu thay đổi giữa 2 trang | Trùng/sót bản ghi (page drift) | Ổn định |
| Nhảy tới trang bất kỳ | Có | Không |
| Độ phức tạp implement | Thấp | Trung bình (cần sort key duy nhất, encode cursor) |

Quy tắc thực dụng: **feed/timeline/infinite scroll → cursor; admin table có "trang 5/20" → offset** (và giới hạn `max_offset` để tránh ai đó query trang 50.000).

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Offset vs cursor pagination trên cùng một danh sách có thứ tự theo index</title>
  <desc>Offset phải quét và bỏ qua N row đầu (O(n)) rồi mới lấy trang; cursor (keyset) dùng index nhảy thẳng vào vị trí sau cursor (O log n) rồi lấy trang kế tiếp.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Cùng một index có thứ tự (created_at, id) — hai cách lấy trang</text>
  <g font-size="11" fill="currentColor">
    <rect x="16" y="40" width="688" height="44" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="28" y="56" font-size="12" font-weight="700" fill="currentColor">OFFSET=10000 &amp; LIMIT=20</text>
    <text x="28" y="74" fill="currentColor" opacity="0.7">DB phải duyệt qua từng row từ đầu, đếm và BỎ QUA 10000 row → O(n)</text>
  </g>
  <g>
    <rect x="16" y="92" width="688" height="34" rx="6" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.12"/>
    <rect x="22" y="98" width="430" height="22" rx="4" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="237" y="113" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">quét &amp; bỏ qua 10000 row (lãng phí)</text>
    <rect x="458" y="98" width="120" height="22" rx="4" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="518" y="113" font-size="10.5" text-anchor="middle" fill="currentColor">20 row trả về</text>
    <text x="618" y="113" font-size="10.5" fill="currentColor" opacity="0.55">... còn lại</text>
  </g>
  <text x="16" y="150" font-size="11" fill="currentColor" opacity="0.6">↑ con trỏ offset đi từ đầu, chậm dần khi trang càng sâu</text>
  <g font-size="11" fill="currentColor">
    <rect x="16" y="178" width="688" height="44" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="28" y="194" font-size="12" font-weight="700" fill="currentColor">CURSOR (keyset): WHERE (created_at, id) sau (?, ?) — LIMIT 20</text>
    <text x="28" y="212" fill="currentColor" opacity="0.7">Dùng B-tree index nhảy THẲNG tới vị trí sau cursor → O(log n), không quét phần đầu</text>
  </g>
  <g>
    <rect x="16" y="230" width="688" height="34" rx="6" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.12"/>
    <line x1="22" y1="247" x2="452" y2="247" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="4 4"/>
    <text x="237" y="244" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.45">(bỏ qua không cần duyệt)</text>
    <rect x="458" y="236" width="120" height="22" rx="4" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="518" y="251" font-size="10.5" text-anchor="middle" fill="currentColor">20 row trả về</text>
    <text x="618" y="251" font-size="10.5" fill="currentColor" opacity="0.55">... còn lại</text>
  </g>
  <g stroke="currentColor" fill="currentColor">
    <path d="M452 282 L458 270 L464 282 Z" fill-opacity="0.9"/>
  </g>
  <text x="360" y="300" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">↑ index seek nhảy thẳng vào đây — không phụ thuộc trang sâu hay nông</text>
</svg>

> Bẫy production: cursor phải dựa trên **sort key duy nhất và ổn định**. Sort theo `created_at` đơn thuần sẽ vỡ khi 2 row cùng timestamp — luôn tiebreak bằng `id`: `ORDER BY created_at DESC, id DESC`. Và encode cursor (base64 + ký nếu cần) để client không tự chế cursor truy cập dữ liệu người khác.

## 3. Versioning: URL vs header

| Cách | Ví dụ | Ưu | Nhược |
|---|---|---|---|
| URL path | `/v1/orders` | Rõ ràng, cache/log/route dễ, test bằng browser được | "Xấu" về mặt REST thuần (resource bị nhân đôi) |
| Header | `Accept: application/vnd.api+json; version=2` | URL ổn định, đúng content negotiation | Khó debug, gateway/cache phải hiểu header, dễ quên |
| Query param | `/orders?version=2` | Dễ thử | Dễ bị bỏ quên trong cache key |

Thực tế ngành (Stripe, GitHub, AWS): **URL version cho breaking change lớn, hiếm khi tăng** (v1 sống nhiều năm), kết hợp **additive change không cần version mới** — thêm field mới là non-breaking nếu client tuân thủ "ignore unknown fields". Stripe dùng date-based version trong header (`Stripe-Version: 2025-01-27`) pin theo từng account — rất hay nhưng đắt để vận hành.

> Ghi nhớ: chiến lược versioning tốt nhất là **ít phải version**: chỉ thêm field, không đổi nghĩa field cũ, không đổi type, deprecate có lộ trình (header `Deprecation` + `Sunset`, RFC 8594).

## 4. Idempotency key cho POST

Retry là điều bắt buộc trong hệ phân tán — nhưng retry `POST /payments` mà không có cơ chế bảo vệ thì khách bị trừ tiền 2 lần. Pattern chuẩn (Stripe phổ biến hoá):

```
POST /payments
Idempotency-Key: 7f9c2ba4-e1a3-4f0e-9d2b-...
```

Server-side (pseudo):

```python
def handle(key, request):
    existing = idem_store.get(key)          # Redis/DB, TTL ~24h
    if existing:
        if existing.request_hash != hash(request.body):
            return 422  # cùng key, body khác -> client bug
        return existing.saved_response       # replay response cũ
    lock = idem_store.lock(key)              # chặn concurrent duplicate
    response = process(request)
    idem_store.save(key, hash(request.body), response)
    return response
```

<step-flow>
<svg viewBox="0 0 760 500" role="img" aria-labelledby="be01i-t be01i-d" style="width:100%;max-width:760px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif"><title id="be01i-t">Idempotency-Key: ba request cùng key đi qua cùng một luồng xử lý</title><desc id="be01i-d">Sơ đồ luồng phía server: store.get(key); MISS thì lock(key), process, save(key, hash, response) atomic với nghiệp vụ rồi trả response mới; HIT thì so request_hash, khớp thì replay response cũ, khác thì 422. Request #2 tới khi #1 còn giữ lock nhận 409; gửi lại sau khi #1 xong thì được replay; request #3 cùng key nhưng body khác nhận 422.</desc><defs><marker id="be01i-m" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs><rect x="280" y="14" width="200" height="36" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/><text x="380.0" y="36.68" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor">POST + Idempotency-Key</text><line x1="380" y1="50" x2="380" y2="67" stroke="currentColor" stroke-opacity="0.7" stroke-width="1.6" marker-end="url(#be01i-m)"/><path d="M380 69 L475 105 L380 141 L285 105 Z" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.35"/><text x="380" y="102" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor">store.get(key)</text><text x="380" y="119" font-size="13" text-anchor="middle" fill="currentColor">có entry?</text><rect x="30" y="180" width="220" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/><text x="140.0" y="204.68" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor">lock(key)</text><rect x="30" y="270" width="220" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/><text x="140.0" y="294.68" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor">process(request)</text><rect x="30" y="350" width="220" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/><text x="140.0" y="372.0" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor">save(key, hash, response)</text><text x="140.0" y="389.0" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.75">atomic với nghiệp vụ</text><rect x="30" y="444" width="220" height="40" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/><text x="140.0" y="468.68" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor">trả response mới</text><rect x="290" y="180" width="180" height="40" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/><text x="380.0" y="204.68" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor">409 / chờ</text><path d="M620 164 L720 200 L620 236 L520 200 Z" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.35"/><text x="620" y="197" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor">request_hash</text><text x="620" y="214" font-size="13" text-anchor="middle" fill="currentColor">khớp?</text><rect x="520" y="290" width="200" height="40" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/><text x="620.0" y="314.68" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor">replay response cũ</text><rect x="520" y="380" width="200" height="40" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/><text x="620.0" y="404.68" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor">422 (client bug)</text><g data-step="1"><path d="M285 105 H140 V176" fill="none" stroke="currentColor" stroke-opacity="0.7" stroke-width="1.6" marker-end="url(#be01i-m)"/><text x="212" y="96" font-size="13" text-anchor="middle" font-weight="700" fill="currentColor">#1 · MISS</text></g><g data-step="2"><line x1="140" y1="220" x2="140" y2="266" stroke="currentColor" stroke-opacity="0.7" stroke-width="1.6" marker-end="url(#be01i-m)"/><text x="150" y="248" font-size="13" fill="currentColor">#1 giữ lock</text></g><g data-step="3"><line x1="250" y1="200" x2="286" y2="200" stroke="#f59e0b" stroke-width="2" marker-end="url(#be01i-m)"/><text x="380" y="168" font-size="13" text-anchor="middle" font-weight="700" fill="#f59e0b">#2 tới khi #1 chưa xong</text></g><g data-step="4"><line x1="140" y1="310" x2="140" y2="346" stroke="currentColor" stroke-opacity="0.7" stroke-width="1.6" marker-end="url(#be01i-m)"/><text x="150" y="332" font-size="13" fill="currentColor">cùng transaction</text></g><g data-step="5"><line x1="140" y1="400" x2="140" y2="440" stroke="#10b981" stroke-width="2" marker-end="url(#be01i-m)"/><text x="150" y="424" font-size="13" fill="currentColor">#1 xong: trừ tiền đúng 1 lần</text></g><g data-step="6"><path d="M475 105 H620 V162" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#be01i-m)"/><text x="548" y="96" font-size="13" text-anchor="middle" font-weight="700" fill="#10b981">#2 gửi lại · HIT</text><line x1="620" y1="236" x2="620" y2="286" stroke="#10b981" stroke-width="2" marker-end="url(#be01i-m)"/><text x="630" y="266" font-size="13" fill="currentColor">khớp</text></g><g data-step="7"><path d="M720 200 H745 V400 H724" fill="none" stroke="#f43f5e" stroke-width="2" marker-end="url(#be01i-m)"/><text x="620" y="444" font-size="13" text-anchor="middle" font-weight="700" fill="#f43f5e">#3 cùng key, body khác</text></g></svg>
<step-note data-step="1">Request <code>#1</code> mang key mới, store chưa có gì nên đi nhánh MISS.</step-note>
<step-note data-step="2">Khoá theo key trước khi xử lý: hai bản sao cùng key tới gần như cùng lúc thì chỉ một bản được chạy.</step-note>
<step-note data-step="3">Client timeout và gửi lại <code>#2</code> trong khi <code>#1</code> còn chạy. Key chưa lưu nên vẫn MISS, nhưng lock đang bị giữ: trả 409 hoặc chờ, không xử lý song song.</step-note>
<step-note data-step="4">Lưu key, hash body và response trong cùng transaction với nghiệp vụ. Lưu sau khi xử lý mà crash ở giữa thì lần retry sau vẫn trừ tiền lần hai.</step-note>
<step-note data-step="5"><code>#1</code> trả response mới; từ giờ key đã có entry.</step-note>
<step-note data-step="6"><code>#2</code> gửi lại lần nữa: HIT, hash body khớp, server trả nguyên response đã lưu thay vì xử lý lại.</step-note>
<step-note data-step="7"><code>#3</code> dùng lại key cũ với body khác: đó là bug phía client (sinh key theo lần bấm thay vì theo ý định), nên trả 422.</step-note>
</step-flow>

Các điểm chết người hay bị bỏ qua:

- **Lưu key và xử lý nghiệp vụ phải atomic** (cùng transaction, hoặc lock trước khi xử lý). Nếu lưu key sau khi xử lý, crash ở giữa → retry vẫn double-charge.
- Request **đang xử lý dở** mà nhận retry cùng key → trả 409 hoặc chờ, không xử lý song song.
- Key do **client sinh** (UUID v4) và gắn với một "ý định" nghiệp vụ, không phải mỗi lần bấm nút sinh key mới.

> Bẫy production: idempotency theo HTTP method là chưa đủ. PUT idempotent về mặt giao thức nhưng nếu handler có side effect (gửi email, bắn event) thì retry vẫn nhân đôi side effect. Idempotency phải được thiết kế ở **tầng nghiệp vụ**, không chỉ tầng HTTP.

## 5. Rate limiting & 429

Thuật toán phổ biến:

| Thuật toán | Đặc điểm | Dùng khi |
|---|---|---|
| Fixed window | Đơn giản, nhưng burst 2x tại biên window | Đếm thô, quota theo ngày |
| Sliding window log/counter | Mượt, chính xác hơn | API public cần công bằng |
| Token bucket | Cho phép burst có kiểm soát, refill đều | Mặc định tốt nhất cho đa số API |
| Leaky bucket | Làm phẳng output rate | Bảo vệ downstream chậm |

Response chuẩn khi chạm limit:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 30
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 30
```

Thiết kế cần quyết định: limit theo **API key / user / IP / endpoint**? Limit phân biệt **read vs write**? Có **tier** trả phí không? Và quan trọng: rate limiter phải nằm **trước** phần xử lý đắt (ở gateway/edge), state để ở Redis với atomic Lua script hoặc `INCR + EXPIRE` — đếm in-memory từng instance sẽ sai ngay khi scale ngang.

> Ghi nhớ: client tử tế phải retry với **exponential backoff + jitter** và tôn trọng `Retry-After`. Nếu bạn viết SDK cho API của mình, hãy build sẵn logic này — đừng tin client tự làm đúng.

## 6. Error format: RFC 9457 (problem+json)

Đừng tự chế format lỗi. RFC 9457 (thay thế RFC 7807) là chuẩn:

```json
{
  "type": "https://api.example.com/errors/insufficient-balance",
  "title": "Insufficient balance",
  "status": 422,
  "detail": "Account balance is 30 but the transfer requires 50.",
  "instance": "/transfers/abc123",
  "balance": 30,
  "trace_id": "4bf92f3577b34da6"
}
```

- `type` là **mã lỗi máy đọc được** (URI, không bắt buộc resolve được) — client switch theo `type`, không parse string `detail`.
- Được phép thêm **extension field** (`balance`, `trace_id`, mảng `errors[]` cho validation từng field).
- `Content-Type: application/problem+json`.
- Luôn kèm **correlation/trace id** để support đối chiếu log.

> Bẫy production: đừng leak nội bộ trong message lỗi — stack trace, SQL, tên class, version framework đều là quà cho attacker. Lỗi 5xx chỉ nên trả `title` chung chung + trace id; chi tiết nằm trong log/APM.

## 7. gRPC: khi nào và tại sao

gRPC = HTTP/2 + Protobuf + contract-first. Điểm mạnh không nằm ở "nhanh hơn JSON" (đúng nhưng không phải lý do chính), mà ở:

- **Contract-first**: file `.proto` là nguồn sự thật duy nhất, codegen client/server cho mọi ngôn ngữ → hai team không bao giờ lệch hợp đồng.
- **Streaming**: server-streaming, client-streaming, bidirectional — thứ REST không có.
- **Hiệu năng nội bộ**: binary, multiplexing trên 1 connection, header compression — đáng kể khi service-to-service gọi nhau hàng chục nghìn RPS.

```protobuf
service OrderService {
  rpc GetOrder(GetOrderRequest) returns (Order);
  rpc WatchOrders(WatchRequest) returns (stream OrderEvent);  // server streaming
}
```

Quy tắc tiến hoá schema: field có số thứ tự, **không bao giờ tái sử dụng số đã xoá** (`reserved 4;`), chỉ thêm field optional → backward/forward compatible.

| | REST/JSON | gRPC |
|---|---|---|
| Consumer | Browser, public, third-party | Internal service-to-service |
| Debug | curl được, human-readable | Cần grpcurl/reflection |
| Browser support | Native | Cần gRPC-Web + proxy |
| Streaming | SSE/WebSocket chắp vá | First-class |
| Load balancing | L7 dễ | Cần L7 LB hiểu HTTP/2 (long-lived connection làm L4 LB lệch tải) |

Vị trí hợp lý nhất: **gRPC cho east-west (nội bộ), REST/GraphQL cho north-south (edge)**.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>North-south (REST/GraphQL ở edge) vs east-west (gRPC giữa các service nội bộ)</title>
  <desc>Client ngoài gọi vào BFF/API Gateway ở edge bằng REST hoặc GraphQL theo chiều north-south; bên trong các microservice gọi lẫn nhau bằng gRPC theo chiều east-west.</desc>
  <defs>
    <marker id="ah2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <g font-size="11.5" fill="currentColor" stroke="currentColor">
    <rect x="270" y="14" width="180" height="40" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke-opacity="0.2"/>
    <text x="360" y="32" text-anchor="middle" stroke="none">Browser · Mobile · 3rd-party</text>
    <text x="360" y="47" text-anchor="middle" stroke="none" font-size="10" opacity="0.65">client ngoài</text>
    <line x1="360" y1="54" x2="360" y2="86" stroke-opacity="0.6" marker-end="url(#ah2)"/>
    <text x="372" y="74" stroke="none" fill="currentColor" opacity="0.85" font-weight="700">north-south</text>
    <text x="372" y="88" stroke="none" fill="currentColor" font-size="10" opacity="0.65">REST / GraphQL (HTTP/JSON)</text>
    <rect x="250" y="92" width="220" height="44" rx="9" fill="#10b981" fill-opacity="0.15" stroke-opacity="0.2"/>
    <text x="360" y="112" text-anchor="middle" stroke="none" font-weight="700">BFF / API Gateway (edge)</text>
    <text x="360" y="127" text-anchor="middle" stroke="none" font-size="10" opacity="0.65">GraphQL BFF · REST + OpenAPI</text>
  </g>
  <line x1="40" y1="160" x2="680" y2="160" stroke="currentColor" stroke-opacity="0.18" stroke-dasharray="5 5"/>
  <text x="48" y="155" font-size="10" fill="currentColor" opacity="0.5">— biên hệ thống —</text>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <rect x="70" y="200" width="150" height="52" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="145" y="222" text-anchor="middle" stroke="none">Order Service</text>
    <rect x="285" y="200" width="150" height="52" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="360" y="222" text-anchor="middle" stroke="none">Payment Service</text>
    <rect x="500" y="200" width="150" height="52" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="575" y="222" text-anchor="middle" stroke="none">Inventory Service</text>
    <line x1="360" y1="136" x2="360" y2="198" stroke-opacity="0.6" marker-end="url(#ah2)"/>
    <line x1="220" y1="226" x2="283" y2="226" stroke-opacity="0.6" marker-end="url(#ah2)" marker-start="url(#ah2)"/>
    <line x1="435" y1="226" x2="498" y2="226" stroke-opacity="0.6" marker-end="url(#ah2)" marker-start="url(#ah2)"/>
    <path d="M145 252 L145 290 L575 290 L575 252" fill="none" stroke-opacity="0.6" marker-end="url(#ah2)" marker-start="url(#ah2)"/>
  </g>
  <text x="360" y="312" font-size="11" text-anchor="middle" stroke="none" fill="currentColor" font-weight="700">east-west</text>
  <text x="360" y="328" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">gRPC (HTTP/2 · Protobuf · contract-first) giữa các service nội bộ</text>
</svg>

> Bẫy production: gRPC giữ connection HTTP/2 lâu dài — qua L4 load balancer, toàn bộ traffic của 1 client dồn vào 1 backend. Cần client-side LB, hoặc L7 proxy (Envoy), hoặc đặt `MAX_CONNECTION_AGE` để ép re-balance.

## 8. GraphQL: khi nào và cái giá phải trả

GraphQL giải quyết đúng một bài toán: **nhiều loại client cần các hình dạng dữ liệu khác nhau** từ cùng một backend. Mobile cần payload gọn, web cần nested data, mỗi screen một tổ hợp khác — REST sẽ sinh ra hoặc over-fetching hoặc 15 endpoint `/orders-for-mobile-home-screen`.

Dùng GraphQL khi: làm **BFF (Backend-for-Frontend)** cho nhiều client, frontend team cần tự chủ tốc độ, schema aggregate từ nhiều service (federation). **Không** dùng khi: API public đơn giản, server-to-server, hoặc team chưa sẵn sàng trả chi phí vận hành dưới đây.

### N+1 và DataLoader

Query lồng nhau là bẫy hiệu năng kinh điển:

```graphql
{ orders(first: 50) { id, customer { name } } }
```

Resolver ngây thơ: 1 query lấy orders + **50 query** lấy từng customer. Giải pháp chuẩn — **DataLoader**: gom các lời gọi trong cùng một tick thành batch:

```typescript
const customerLoader = new DataLoader(async (ids: string[]) => {
  const rows = await db.customers.whereIn("id", ids);   // 1 query duy nhất
  return ids.map(id => rows.find(r => r.id === id));
});
// resolver: customerLoader.load(order.customerId)
```

Lưu ý: DataLoader phải tạo **per-request** (không share cache giữa user), và N+1 vẫn quay lại nếu loader gọi tiếp service khác không batch.

<ab-toggle data-labels="Resolver ngây thơ|Có DataLoader">
<svg viewBox="0 0 520 350" role="img" aria-labelledby="be01na-t be01na-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif"><title id="be01na-t">Resolver ngây thơ: 1 + 50 query</title><desc id="be01na-d">Query orders(first: 50): 1 query lấy orders, rồi mỗi order gọi resolver customer riêng, mỗi lời gọi là một query WHERE id = ? xuống DB. Tổng 51 query.</desc><defs><marker id="be01na-m" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs><text x="20" y="22" font-size="13" fill="currentColor" opacity="0.8">{ orders(first: 50) { customer { name } } }</text><rect x="20" y="40" width="140" height="34" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/><text x="90.0" y="61.68" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor">resolver orders</text><rect x="36" y="92" width="124" height="26" rx="6" fill="#3b82f6" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.25"/><text x="98" y="110" font-size="13" text-anchor="middle" fill="currentColor">order 1</text><rect x="36" y="126" width="124" height="26" rx="6" fill="#3b82f6" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.25"/><text x="98" y="144" font-size="13" text-anchor="middle" fill="currentColor">order 2</text><rect x="36" y="160" width="124" height="26" rx="6" fill="#3b82f6" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.25"/><text x="98" y="178" font-size="13" text-anchor="middle" fill="currentColor">order 3</text><rect x="36" y="194" width="124" height="26" rx="6" fill="#3b82f6" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.25"/><text x="98" y="212" font-size="13" text-anchor="middle" fill="currentColor">order 4</text><rect x="36" y="228" width="124" height="26" rx="6" fill="#3b82f6" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.25"/><text x="98" y="246" font-size="13" text-anchor="middle" fill="currentColor">… order 50</text><rect x="400" y="40" width="100" height="220" rx="10" fill="#8b5cf6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.35"/><text x="450" y="150" font-size="15" text-anchor="middle" font-weight="700" fill="currentColor">DB</text><line x1="160" y1="57" x2="396" y2="57" stroke="#3b82f6" stroke-width="2" marker-end="url(#be01na-m)"/><text x="280" y="50" font-size="13" text-anchor="middle" fill="currentColor">1 query orders</text><line x1="160" y1="105" x2="396" y2="105" stroke="#f43f5e" stroke-width="1.6" marker-end="url(#be01na-m)"/><line x1="160" y1="139" x2="396" y2="139" stroke="#f43f5e" stroke-width="1.6" marker-end="url(#be01na-m)"/><line x1="160" y1="173" x2="396" y2="173" stroke="#f43f5e" stroke-width="1.6" marker-end="url(#be01na-m)"/><line x1="160" y1="207" x2="396" y2="207" stroke="#f43f5e" stroke-width="1.6" marker-end="url(#be01na-m)"/><line x1="160" y1="241" x2="396" y2="241" stroke="#f43f5e" stroke-width="1.6" marker-end="url(#be01na-m)"/><text x="280" y="87" font-size="13" text-anchor="middle" fill="#f43f5e">WHERE id = ? (mỗi order 1 lần)</text><text x="20" y="288" font-size="14" font-weight="700" fill="#f43f5e">Số query xuống DB: 51</text><rect x="20.0" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="29.4" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="38.8" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="48.2" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="57.6" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="67.0" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="76.4" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="85.8" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="95.2" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="104.6" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="114.0" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="123.4" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="132.8" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="142.2" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="151.6" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="161.0" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="170.4" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="179.8" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="189.2" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="198.6" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="208.0" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="217.4" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="226.8" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="236.2" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="245.6" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="255.0" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="264.4" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="273.8" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="283.2" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="292.6" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="302.0" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="311.4" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="320.8" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="330.2" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="339.6" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="349.0" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="358.4" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="367.8" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="377.2" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="386.6" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="396.0" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="405.4" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="414.8" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="424.2" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="433.6" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="443.0" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="452.4" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="461.8" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="471.2" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="480.6" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><rect x="490.0" y="302" width="7" height="22" rx="1.5" fill="#f43f5e" fill-opacity="0.85"/><text x="20" y="342" font-size="13" fill="currentColor" opacity="0.7">mỗi vạch = 1 query, tối đa 51 vạch</text></svg>
<svg viewBox="0 0 520 350" role="img" aria-labelledby="be01nb-t be01nb-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif"><title id="be01nb-t">DataLoader gom 50 lời gọi thành 1 query</title><desc id="be01nb-d">Cùng query orders(first: 50): 50 lời gọi customerLoader.load trong cùng một tick được gom vào DataLoader, đi xuống DB thành một query WHERE id IN 50 id. Tổng 2 query.</desc><defs><marker id="be01nb-m" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs><text x="20" y="22" font-size="13" fill="currentColor" opacity="0.8">{ orders(first: 50) { customer { name } } }</text><rect x="20" y="40" width="140" height="34" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/><text x="90.0" y="61.68" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor">resolver orders</text><rect x="36" y="92" width="124" height="26" rx="6" fill="#3b82f6" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.25"/><text x="98" y="110" font-size="13" text-anchor="middle" fill="currentColor">order 1</text><rect x="36" y="126" width="124" height="26" rx="6" fill="#3b82f6" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.25"/><text x="98" y="144" font-size="13" text-anchor="middle" fill="currentColor">order 2</text><rect x="36" y="160" width="124" height="26" rx="6" fill="#3b82f6" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.25"/><text x="98" y="178" font-size="13" text-anchor="middle" fill="currentColor">order 3</text><rect x="36" y="194" width="124" height="26" rx="6" fill="#3b82f6" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.25"/><text x="98" y="212" font-size="13" text-anchor="middle" fill="currentColor">order 4</text><rect x="36" y="228" width="124" height="26" rx="6" fill="#3b82f6" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.25"/><text x="98" y="246" font-size="13" text-anchor="middle" fill="currentColor">… order 50</text><rect x="400" y="40" width="100" height="220" rx="10" fill="#8b5cf6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.35"/><text x="450" y="150" font-size="15" text-anchor="middle" font-weight="700" fill="currentColor">DB</text><line x1="160" y1="57" x2="396" y2="57" stroke="#3b82f6" stroke-width="2" marker-end="url(#be01nb-m)"/><text x="280" y="50" font-size="13" text-anchor="middle" fill="currentColor">1 query orders</text><line x1="160" y1="105" x2="200" y2="168" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.2"/><line x1="160" y1="139" x2="200" y2="168" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.2"/><line x1="160" y1="173" x2="200" y2="168" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.2"/><line x1="160" y1="207" x2="200" y2="168" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.2"/><line x1="160" y1="241" x2="200" y2="168" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.2"/><rect x="200" y="136" width="120" height="64" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.35"/><text x="260" y="163" font-size="13" text-anchor="middle" font-weight="700" fill="currentColor">DataLoader</text><text x="260" y="182" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.8">gom 1 tick</text><line x1="320" y1="168" x2="396" y2="168" stroke="#10b981" stroke-width="2.4" marker-end="url(#be01nb-m)"/><text x="390" y="226" font-size="13" text-anchor="end" fill="#10b981">1 query: WHERE id IN (50 id)</text><text x="20" y="288" font-size="14" font-weight="700" fill="#10b981">Số query xuống DB: 2</text><rect x="20.0" y="302" width="7" height="22" rx="1.5" fill="#10b981" fill-opacity="0.85"/><rect x="29.4" y="302" width="7" height="22" rx="1.5" fill="#10b981" fill-opacity="0.85"/><rect x="38.8" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="48.2" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="57.6" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="67.0" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="76.4" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="85.8" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="95.2" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="104.6" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="114.0" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="123.4" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="132.8" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="142.2" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="151.6" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="161.0" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="170.4" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="179.8" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="189.2" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="198.6" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="208.0" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="217.4" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="226.8" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="236.2" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="245.6" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="255.0" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="264.4" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="273.8" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="283.2" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="292.6" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="302.0" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="311.4" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="320.8" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="330.2" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="339.6" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="349.0" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="358.4" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="367.8" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="377.2" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="386.6" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="396.0" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="405.4" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="414.8" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="424.2" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="433.6" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="443.0" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="452.4" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="461.8" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="471.2" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="480.6" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="490.0" y="302" width="7" height="22" rx="1.5" fill="currentColor" fill-opacity="0.08"/><text x="20" y="342" font-size="13" fill="currentColor" opacity="0.7">mỗi vạch = 1 query, tối đa 51 vạch</text></svg>
<ab-note>Mỗi order gọi resolver <code>customer</code> riêng, mỗi lần là một query: 1 + 50 = 51. Lấy 500 order thì thành 501 query.</ab-note>
<ab-note>50 lời gọi <code>load()</code> trong cùng tick được gom thành một batch: 1 query orders + 1 query customers, bất kể bao nhiêu order.</ab-note>
</ab-toggle>

### Các chi phí khác phải trả

- **Query cost limiting**: client có thể viết query lồng 10 cấp đánh sập DB → cần depth limit + complexity scoring, persisted queries cho client public.
- **Caching khó**: mọi thứ là `POST /graphql` → mất HTTP cache/CDN mặc định (persisted query qua GET là lối thoát).
- **Mọi response là 200**: lỗi nằm trong `errors[]` → monitoring dựa trên status code mù hoàn toàn, phải instrument ở tầng GraphQL.
- **Authorization per-field**, không phải per-endpoint — dễ sót.

> Ghi nhớ: GraphQL không thay thế REST, nó là **tầng aggregation cho frontend**. Kiến trúc phổ biến 2025: GraphQL BFF ở edge → gọi xuống các internal service bằng gRPC/REST.

## 9. Webhooks: API chiều ngược lại

Webhook = bạn gọi HTTP vào hệ thống của **người khác** — tức mọi giả định về độ tin cậy đều sụp. Thiết kế provider (bên gửi) tử tế:

- **Retry với exponential backoff + jitter**, ví dụ lịch của Stripe: ngay → 5 phút → 30 phút → 2h → ... trong vài ngày. Coi 2xx là thành công, mọi thứ khác (kể cả timeout) là thất bại.
- **Gửi event mỏng**: chỉ `event_type` + `id` + ít metadata, consumer gọi API lấy dữ liệu mới nhất ("thin payload") — tránh xử lý event đã cũ và giảm rủi ro lộ dữ liệu.
- **Ordering không được đảm bảo** — nói rõ trong docs, kèm `created_at` và sequence/version để consumer tự xử.
- **Ký payload** bằng HMAC, kèm timestamp chống replay:

```
X-Signature: t=1718000000,v1=hmac_sha256(secret, t + "." + raw_body)
```

Consumer (bên nhận) tử tế:

```python
def webhook_handler(request):
    verify_hmac(request.raw_body, request.headers["X-Signature"])  # raw body, TRƯỚC khi parse!
    if abs(now() - signature_timestamp) > 300: return 400          # chống replay
    if not events_seen.set_if_absent(event_id, ttl=7d): return 200 # idempotent: đã xử lý rồi
    queue.publish(event)                                           # ACK nhanh, xử lý async
    return 200
```

<step-flow>
<svg viewBox="0 0 760 400" role="img" aria-labelledby="be01w-t be01w-d" style="width:100%;max-width:760px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif"><title id="be01w-t">Vòng đời delivery webhook: verify, chống replay, idempotent, ACK nhanh, xử lý async, retry</title><desc id="be01w-d">Provider POST event đã ký HMAC kèm timestamp tới consumer; consumer verify HMAC trên raw body, chống replay theo timestamp, kiểm idempotent theo event_id, publish vào queue rồi trả 200 nhanh; worker xử lý async. Nếu phản hồi không phải 2xx hoặc timeout, provider retry với exponential backoff cộng jitter: ngay, 5 phút, 30 phút, 2 giờ. At-least-once nên consumer phải idempotent.</desc><defs><marker id="be01w-m" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs><rect x="16" y="130" width="150" height="60" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/><text x="91.0" y="157.0" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor">Provider</text><text x="91.0" y="174.0" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.75">ký HMAC + timestamp</text><rect x="262" y="40" width="236" height="220" rx="10" fill="#10b981" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.3"/><text x="380" y="62" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">Consumer</text><rect x="586" y="100" width="158" height="44" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/><text x="665.0" y="126.68" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor">Queue (SQS)</text><rect x="586" y="196" width="158" height="44" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/><text x="665.0" y="222.68" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor">Worker (async)</text><g data-step="1"><line x1="166" y1="146" x2="258" y2="146" stroke="currentColor" stroke-opacity="0.7" stroke-width="1.6" marker-end="url(#be01w-m)"/><text x="212" y="136" font-size="13" text-anchor="middle" fill="currentColor">POST event</text></g><g data-step="2"><rect x="276" y="78" width="208" height="34" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/><text x="380" y="100" font-size="13" text-anchor="middle" fill="currentColor">1. verify HMAC (raw body)</text></g><g data-step="3"><rect x="276" y="122" width="208" height="34" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/><text x="380" y="144" font-size="13" text-anchor="middle" fill="currentColor">2. chống replay (timestamp)</text></g><g data-step="4"><rect x="276" y="166" width="208" height="34" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/><text x="380" y="188" font-size="13" text-anchor="middle" fill="currentColor">3. idempotent theo event_id</text></g><g data-step="5"><rect x="276" y="210" width="208" height="34" rx="6" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/><text x="380" y="232" font-size="13" text-anchor="middle" fill="currentColor">4. publish vào queue</text><line x1="484" y1="227" x2="582" y2="127" stroke="currentColor" stroke-opacity="0.7" stroke-width="1.6" marker-end="url(#be01w-m)"/></g><g data-step="6"><line x1="258" y1="176" x2="170" y2="176" stroke="#10b981" stroke-width="2" marker-end="url(#be01w-m)"/><text x="212" y="196" font-size="13" text-anchor="middle" font-weight="700" fill="#10b981">200 nhanh</text></g><g data-step="7"><line x1="665" y1="144" x2="665" y2="192" stroke="currentColor" stroke-opacity="0.7" stroke-width="1.6" marker-end="url(#be01w-m)"/><text x="676" y="174" font-size="13" fill="currentColor">consume</text></g><g data-step="8"><path d="M91 190 V340 H226" fill="none" stroke="currentColor" stroke-opacity="0.7" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#be01w-m)"/><rect x="228" y="300" width="300" height="78" rx="9" fill="#f43f5e" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.3"/><text x="378" y="322" font-size="13" text-anchor="middle" font-weight="700" fill="currentColor">non-2xx hoặc timeout → RETRY</text><text x="378" y="342" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.8">backoff + jitter: ngay → 5p → 30p → 2h …</text><text x="378" y="362" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.8">at-least-once → consumer phải idempotent</text><path d="M380 300 V264" fill="none" stroke="currentColor" stroke-opacity="0.7" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#be01w-m)"/></g></svg>
<step-note data-step="1">Provider gửi event mỏng (<code>event_type</code> + <code>id</code>), header <code>X-Signature</code> chứa timestamp và HMAC của <code>t + "." + raw_body</code>.</step-note>
<step-note data-step="2">Verify trên raw body, trước khi parse: JSON parse rồi serialize lại lệch byte là chữ ký fail. Thiếu bước này thì ai biết URL cũng giả được event.</step-note>
<step-note data-step="3">Timestamp lệch quá 300 giây thì trả 400: kẻ nghe lén chép lại một request hợp lệ cũng không phát lại được.</step-note>
<step-note data-step="4"><code>set_if_absent(event_id, ttl=7d)</code> thất bại nghĩa là event đã xử lý rồi: trả 200 luôn, không làm lại.</step-note>
<step-note data-step="5">Đẩy event vào queue thay vì xử lý ngay trong handler.</step-note>
<step-note data-step="6">Trả 200 trong vài mili giây. Handler chậm hơn timeout của provider bị coi là fail, provider retry và duplicate càng nhiều.</step-note>
<step-note data-step="7">Worker lấy event từ queue và làm việc nặng, tách khỏi đường phản hồi cho provider.</step-note>
<step-note data-step="8">Mọi phản hồi không phải 2xx, kể cả timeout, đều bị retry theo lịch giãn dần. Vì giao ít nhất một lần, bước 4 là bắt buộc chứ không phải tối ưu.</step-note>
</step-flow>

- **Trả 200 ngay, xử lý sau**: handler chậm > timeout của provider → bị coi là fail → retry → duplicate càng nhiều.
- **At-least-once là mặc định** → consumer bắt buộc idempotent theo `event_id`.
- Verify HMAC trên **raw body** — body đã qua JSON parse rồi re-serialize sẽ lệch byte và fail signature.

> Bẫy production: endpoint webhook là cửa SSRF/giả mạo nếu chỉ "check IP của provider" hoặc tệ hơn là không verify gì. HMAC + timestamp là tối thiểu. Và nhớ cơ chế **xoay secret** không downtime: chấp nhận 2 secret song song trong giai đoạn chuyển.

## 10. OpenAPI: hợp đồng là code

OpenAPI (3.1, đã align với JSON Schema) biến REST thành contract-first như gRPC:

- **Spec là nguồn sự thật**: codegen client SDK, server stub, request validation middleware, mock server, docs (Swagger UI/Redoc) — tất cả từ một file YAML.
- **Hai trường phái**: code-first (annotate code, sinh spec — dễ bắt đầu, dễ lệch ý định) vs design-first (viết spec trước, review như review code — phù hợp khi API là sản phẩm). Team trưởng thành thường đi design-first.
- **Chặn breaking change trong CI**: diff spec giữa các commit bằng tool (oasdiff, optic) — đổi type, xoá field, thêm required param đều fail build.
- Contract testing (Pact, schemathesis) để bảo đảm implementation khớp spec.

> Ghi nhớ: docs viết tay luôn lệch với thực tế sau 3 tháng. Docs sinh từ spec, và spec được validate trong CI, là cách duy nhất giữ hợp đồng trung thực ở quy mô nhiều team.

## Checklist quyết định nhanh

| Tình huống | Lựa chọn mặc định |
|---|---|
| API public / third-party | REST + OpenAPI + RFC 9457 + idempotency key |
| Service-to-service nội bộ, RPS cao, cần streaming | gRPC |
| Nhiều client (web/mobile) cần data shape khác nhau | GraphQL BFF (kèm DataLoader, cost limit) |
| Thông báo sự kiện cho hệ thống bên ngoài | Webhooks (HMAC, retry, thin payload) + cân nhắc kèm polling API làm fallback |
| Realtime đẩy xuống browser | SSE (đơn giản, một chiều) hoặc WebSocket (hai chiều) — webhook không dành cho browser |

## Liên hệ sang AWS

- **API Gateway REST API vs HTTP API**: HTTP API rẻ hơn (~70%), latency thấp hơn, đủ cho đa số use case (JWT authorizer, CORS, Lambda proxy). REST API đắt hơn nhưng có: request validation theo model, API key + **usage plans** (rate limit/quota theo khách hàng — chính là phần rate limiting ở trên), caching tích hợp, WAF, private endpoint, canary deployment. Throttling của API Gateway trả đúng **429** như bài học.
- **AppSync** = GraphQL managed: resolver map sang DynamoDB/Lambda/RDS, có sẵn subscriptions (realtime qua WebSocket), JS resolver runtime. Bạn vẫn phải tự lo bài toán N+1 trong thiết kế resolver — AppSync không có DataLoader thần kỳ.
- **gRPC trên AWS**: **ALB hỗ trợ gRPC** end-to-end (target group protocol `gRPC`, health check theo gRPC status code) — giải đúng bài toán L7 load balancing cho HTTP/2 long-lived connection. Trong service mesh, App Mesh/ECS Service Connect hoặc Envoy sidecar đảm nhiệm client-side LB.
- **Webhooks ở phía consumer**: pattern chuẩn là API Gateway → **SQS** (ACK ngay, xử lý async, DLQ cho poison message) — đúng tinh thần "trả 200 nhanh, xử lý sau". Idempotency store đặt ở **DynamoDB** (conditional write `attribute_not_exists`) hoặc **ElastiCache** (SET NX + TTL).
- **Webhooks ở phía provider**: **EventBridge API Destinations** gửi HTTP ra ngoài có sẵn retry + rate limit + lưu credential trong Secrets Manager — đỡ tự viết hệ thống delivery.
- **Idempotency & rate limit state**: ElastiCache (Redis) cho token bucket atomic bằng Lua; DynamoDB TTL cho idempotency key sống 24h.
- **Pagination kiểu cursor** chính là cách mọi AWS API hoạt động: `NextToken`/`LastEvaluatedKey` của DynamoDB là cursor-based pagination ở quy mô lớn — không API nào của AWS dùng offset.
