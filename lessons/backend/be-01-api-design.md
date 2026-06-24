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

> 💡 Ghi nhớ: Giá trị thật của REST không phải "đúng chuẩn Fielding" mà là **tính dự đoán được**: dev mới nhìn `GET /users/42/orders?status=paid` là hiểu ngay, cache/proxy/gateway hiểu ngay, không cần đọc docs.

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

> ⚠️ Bẫy production: cursor phải dựa trên **sort key duy nhất và ổn định**. Sort theo `created_at` đơn thuần sẽ vỡ khi 2 row cùng timestamp — luôn tiebreak bằng `id`: `ORDER BY created_at DESC, id DESC`. Và encode cursor (base64 + ký nếu cần) để client không tự chế cursor truy cập dữ liệu người khác.

## 3. Versioning: URL vs header

| Cách | Ví dụ | Ưu | Nhược |
|---|---|---|---|
| URL path | `/v1/orders` | Rõ ràng, cache/log/route dễ, test bằng browser được | "Xấu" về mặt REST thuần (resource bị nhân đôi) |
| Header | `Accept: application/vnd.api+json; version=2` | URL ổn định, đúng content negotiation | Khó debug, gateway/cache phải hiểu header, dễ quên |
| Query param | `/orders?version=2` | Dễ thử | Dễ bị bỏ quên trong cache key |

Thực tế ngành (Stripe, GitHub, AWS): **URL version cho breaking change lớn, hiếm khi tăng** (v1 sống nhiều năm), kết hợp **additive change không cần version mới** — thêm field mới là non-breaking nếu client tuân thủ "ignore unknown fields". Stripe dùng date-based version trong header (`Stripe-Version: 2025-01-27`) pin theo từng account — rất hay nhưng đắt để vận hành.

> 💡 Ghi nhớ: chiến lược versioning tốt nhất là **ít phải version**: chỉ thêm field, không đổi nghĩa field cũ, không đổi type, deprecate có lộ trình (header `Deprecation` + `Sunset`, RFC 8594).

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Luồng xử lý Idempotency-Key phía server</title>
  <desc>Server lookup key trong store: nếu hit thì so request_hash, khớp thì replay response cũ, khác thì trả 422; nếu miss thì lock, process, lưu key cùng response rồi trả về.</desc>
  <defs>
    <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <g font-size="11.5" fill="currentColor" stroke="currentColor">
    <rect x="280" y="16" width="160" height="38" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke-opacity="0.2"/>
    <text x="360" y="40" text-anchor="middle" stroke="none">POST + Idempotency-Key</text>
    <path d="M360 76 L440 110 L360 144 L280 110 Z" fill="#f59e0b" fill-opacity="0.15" stroke-opacity="0.2"/>
    <text x="360" y="106" text-anchor="middle" stroke="none" font-size="11">store.get(key)</text>
    <text x="360" y="121" text-anchor="middle" stroke="none" font-size="11">có entry?</text>
    <line x1="360" y1="54" x2="360" y2="74" stroke-opacity="0.5" marker-end="url(#ah)"/>
  </g>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <text x="470" y="104" stroke="none" fill="currentColor" opacity="0.7" font-weight="700">HIT</text>
    <line x1="440" y1="110" x2="500" y2="110" stroke-opacity="0.5" marker-end="url(#ah)"/>
    <path d="M580 76 L660 110 L580 144 L500 110 Z" fill="#f59e0b" fill-opacity="0.15" stroke-opacity="0.2"/>
    <text x="580" y="106" text-anchor="middle" stroke="none">request_hash</text>
    <text x="580" y="121" text-anchor="middle" stroke="none">khớp?</text>
    <line x1="580" y1="144" x2="580" y2="178" stroke-opacity="0.5" marker-end="url(#ah)"/>
    <text x="592" y="166" stroke="none" fill="currentColor" opacity="0.7">khớp</text>
    <rect x="500" y="180" width="160" height="36" rx="8" fill="#10b981" fill-opacity="0.16" stroke-opacity="0.2"/>
    <text x="580" y="203" text-anchor="middle" stroke="none">replay response cũ</text>
    <line x1="660" y1="110" x2="690" y2="110" stroke-opacity="0.5"/>
    <path d="M690 110 L690 250 L662 250" stroke-opacity="0.5" fill="none" marker-end="url(#ah)"/>
    <text x="676" y="104" stroke="none" fill="currentColor" opacity="0.7">khác</text>
    <rect x="500" y="232" width="160" height="36" rx="8" fill="#ef4444" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="580" y="255" text-anchor="middle" stroke="none">422 (client bug)</text>
  </g>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <text x="250" y="104" text-anchor="end" stroke="none" fill="currentColor" opacity="0.7" font-weight="700">MISS</text>
    <line x1="280" y1="110" x2="242" y2="110" stroke-opacity="0.5" marker-end="url(#ah)"/>
    <line x1="160" y1="128" x2="160" y2="160" stroke-opacity="0.5" marker-end="url(#ah)"/>
    <rect x="80" y="92" width="160" height="36" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="160" y="115" text-anchor="middle" stroke="none">lock(key) — chống đua</text>
    <rect x="80" y="162" width="160" height="36" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="160" y="185" text-anchor="middle" stroke="none">process(request)</text>
    <line x1="160" y1="198" x2="160" y2="230" stroke-opacity="0.5" marker-end="url(#ah)"/>
    <rect x="68" y="232" width="184" height="48" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke-opacity="0.2"/>
    <text x="160" y="251" text-anchor="middle" stroke="none" font-size="10.5">save(key, hash, response)</text>
    <text x="160" y="267" text-anchor="middle" stroke="none" font-size="10" opacity="0.7">ATOMIC với xử lý nghiệp vụ</text>
    <line x1="160" y1="280" x2="160" y2="312" stroke-opacity="0.5" marker-end="url(#ah)"/>
    <rect x="80" y="314" width="160" height="36" rx="8" fill="#10b981" fill-opacity="0.16" stroke-opacity="0.2"/>
    <text x="160" y="337" text-anchor="middle" stroke="none">trả response mới</text>
  </g>
</svg>

Các điểm chết người hay bị bỏ qua:

- **Lưu key và xử lý nghiệp vụ phải atomic** (cùng transaction, hoặc lock trước khi xử lý). Nếu lưu key sau khi xử lý, crash ở giữa → retry vẫn double-charge.
- Request **đang xử lý dở** mà nhận retry cùng key → trả 409 hoặc chờ, không xử lý song song.
- Key do **client sinh** (UUID v4) và gắn với một "ý định" nghiệp vụ, không phải mỗi lần bấm nút sinh key mới.

> ⚠️ Bẫy production: idempotency theo HTTP method là chưa đủ. PUT idempotent về mặt giao thức nhưng nếu handler có side effect (gửi email, bắn event) thì retry vẫn nhân đôi side effect. Idempotency phải được thiết kế ở **tầng nghiệp vụ**, không chỉ tầng HTTP.

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

> 💡 Ghi nhớ: client tử tế phải retry với **exponential backoff + jitter** và tôn trọng `Retry-After`. Nếu bạn viết SDK cho API của mình, hãy build sẵn logic này — đừng tin client tự làm đúng.

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

> ⚠️ Bẫy production: đừng leak nội bộ trong message lỗi — stack trace, SQL, tên class, version framework đều là quà cho attacker. Lỗi 5xx chỉ nên trả `title` chung chung + trace id; chi tiết nằm trong log/APM.

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

> ⚠️ Bẫy production: gRPC giữ connection HTTP/2 lâu dài — qua L4 load balancer, toàn bộ traffic của 1 client dồn vào 1 backend. Cần client-side LB, hoặc L7 proxy (Envoy), hoặc đặt `MAX_CONNECTION_AGE` để ép re-balance.

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

### Các chi phí khác phải trả

- **Query cost limiting**: client có thể viết query lồng 10 cấp đánh sập DB → cần depth limit + complexity scoring, persisted queries cho client public.
- **Caching khó**: mọi thứ là `POST /graphql` → mất HTTP cache/CDN mặc định (persisted query qua GET là lối thoát).
- **Mọi response là 200**: lỗi nằm trong `errors[]` → monitoring dựa trên status code mù hoàn toàn, phải instrument ở tầng GraphQL.
- **Authorization per-field**, không phải per-endpoint — dễ sót.

> 💡 Ghi nhớ: GraphQL không thay thế REST, nó là **tầng aggregation cho frontend**. Kiến trúc phổ biến 2025: GraphQL BFF ở edge → gọi xuống các internal service bằng gRPC/REST.

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Vòng đời delivery webhook: provider gửi, consumer verify rồi ACK nhanh, xử lý async qua queue, retry với backoff khi non-2xx</title>
  <desc>Provider POST event đã ký HMAC tới consumer; consumer verify HMAC trên raw body, chống replay theo timestamp, kiểm idempotent theo event_id, publish vào queue rồi trả 200 nhanh; worker xử lý async. Nếu phản hồi không phải 2xx hoặc timeout, provider retry với exponential backoff cộng jitter.</desc>
  <defs>
    <marker id="ah3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <g font-size="11.5" fill="currentColor" stroke="currentColor">
    <rect x="24" y="120" width="150" height="56" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke-opacity="0.2"/>
    <text x="99" y="143" text-anchor="middle" stroke="none" font-weight="700">Provider</text>
    <text x="99" y="160" text-anchor="middle" stroke="none" font-size="10" opacity="0.7">ký HMAC + timestamp</text>
    <line x1="174" y1="138" x2="262" y2="138" stroke-opacity="0.6" marker-end="url(#ah3)"/>
    <text x="218" y="130" text-anchor="middle" stroke="none" font-size="10" opacity="0.8">POST event</text>
  </g>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <rect x="264" y="48" width="220" height="180" rx="10" fill="#10b981" fill-opacity="0.10" stroke-opacity="0.2"/>
    <text x="374" y="68" text-anchor="middle" stroke="none" font-weight="700" fill="currentColor">Consumer</text>
    <rect x="280" y="80" width="188" height="26" rx="6" fill="#10b981" fill-opacity="0.16" stroke-opacity="0.18"/>
    <text x="374" y="97" text-anchor="middle" stroke="none" font-size="10.5">1. verify HMAC (raw body)</text>
    <rect x="280" y="112" width="188" height="26" rx="6" fill="#10b981" fill-opacity="0.16" stroke-opacity="0.18"/>
    <text x="374" y="129" text-anchor="middle" stroke="none" font-size="10.5">2. chống replay (timestamp)</text>
    <rect x="280" y="144" width="188" height="26" rx="6" fill="#10b981" fill-opacity="0.16" stroke-opacity="0.18"/>
    <text x="374" y="161" text-anchor="middle" stroke="none" font-size="10.5">3. idempotent theo event_id</text>
    <rect x="280" y="176" width="188" height="26" rx="6" fill="#3b82f6" fill-opacity="0.16" stroke-opacity="0.18"/>
    <text x="374" y="193" text-anchor="middle" stroke="none" font-size="10.5">4. publish vào queue</text>
    <line x1="262" y1="150" x2="178" y2="150" stroke-opacity="0.6" marker-end="url(#ah3)"/>
    <text x="218" y="170" text-anchor="middle" stroke="none" font-size="10" opacity="0.8">200 nhanh</text>
  </g>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <line x1="484" y1="189" x2="556" y2="189" stroke-opacity="0.6" marker-end="url(#ah3)"/>
    <rect x="558" y="100" width="138" height="40" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke-opacity="0.2"/>
    <text x="627" y="124" text-anchor="middle" stroke="none">Queue (SQS)</text>
    <line x1="627" y1="142" x2="627" y2="174" stroke-opacity="0.6" marker-end="url(#ah3)"/>
    <text x="642" y="162" stroke="none" font-size="10" opacity="0.75">consume</text>
    <rect x="558" y="176" width="138" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="627" y="200" text-anchor="middle" stroke="none">Worker (async)</text>
  </g>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <path d="M99 176 L99 300 L198 300" fill="none" stroke-opacity="0.55" stroke-dasharray="5 4" marker-end="url(#ah3)"/>
    <rect x="200" y="272" width="280" height="56" rx="9" fill="#ef4444" fill-opacity="0.12" stroke-opacity="0.2"/>
    <text x="340" y="292" text-anchor="middle" stroke="none" font-weight="700">non-2xx hoặc timeout → RETRY</text>
    <text x="340" y="310" text-anchor="middle" stroke="none" font-size="10" opacity="0.75">exponential backoff + jitter (ngay → 5p → 30p → 2h ...)</text>
    <text x="340" y="324" text-anchor="middle" stroke="none" font-size="10" opacity="0.6">at-least-once → consumer phải idempotent</text>
    <path d="M374 272 L374 234" fill="none" stroke-opacity="0.55" stroke-dasharray="5 4" marker-end="url(#ah3)"/>
  </g>
</svg>

- **Trả 200 ngay, xử lý sau**: handler chậm > timeout của provider → bị coi là fail → retry → duplicate càng nhiều.
- **At-least-once là mặc định** → consumer bắt buộc idempotent theo `event_id`.
- Verify HMAC trên **raw body** — body đã qua JSON parse rồi re-serialize sẽ lệch byte và fail signature.

> ⚠️ Bẫy production: endpoint webhook là cửa SSRF/giả mạo nếu chỉ "check IP của provider" hoặc tệ hơn là không verify gì. HMAC + timestamp là tối thiểu. Và nhớ cơ chế **xoay secret** không downtime: chấp nhận 2 secret song song trong giai đoạn chuyển.

## 10. OpenAPI: hợp đồng là code

OpenAPI (3.1, đã align với JSON Schema) biến REST thành contract-first như gRPC:

- **Spec là nguồn sự thật**: codegen client SDK, server stub, request validation middleware, mock server, docs (Swagger UI/Redoc) — tất cả từ một file YAML.
- **Hai trường phái**: code-first (annotate code, sinh spec — dễ bắt đầu, dễ lệch ý định) vs design-first (viết spec trước, review như review code — phù hợp khi API là sản phẩm). Team trưởng thành thường đi design-first.
- **Chặn breaking change trong CI**: diff spec giữa các commit bằng tool (oasdiff, optic) — đổi type, xoá field, thêm required param đều fail build.
- Contract testing (Pact, schemathesis) để bảo đảm implementation khớp spec.

> 💡 Ghi nhớ: docs viết tay luôn lệch với thực tế sau 3 tháng. Docs sinh từ spec, và spec được validate trong CI, là cách duy nhất giữ hợp đồng trung thực ở quy mô nhiều team.

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
