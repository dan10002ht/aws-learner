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
