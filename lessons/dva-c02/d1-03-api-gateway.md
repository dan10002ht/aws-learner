# Amazon API Gateway

API Gateway là "cửa ngõ" (front door) cho mọi API trong kiến trúc AWS: nó nhận request từ client, xử lý auth/throttling/transform, rồi forward đến backend (Lambda, HTTP endpoint, AWS service). Với developer, đây là service xuất hiện dày đặc trong Domain 1 của DVA-C02 vì gần như mọi serverless API đều đi qua nó.

## Ba loại API: REST vs HTTP vs WebSocket

API Gateway cung cấp 3 loại API khác nhau. Chọn sai loại là bẫy phổ biến.

| Tiêu chí | REST API | HTTP API | WebSocket API |
|----------|----------|----------|---------------|
| Mục đích | API đầy đủ tính năng | API đơn giản, rẻ, nhanh | Giao tiếp 2 chiều realtime |
| Chi phí | Cao hơn (~3.5x) | Thấp | Theo message + thời gian kết nối |
| Latency | Cao hơn một chút | Thấp nhất | - |
| Mapping templates (VTL) | ✅ | ❌ | ✅ |
| Request validation | ✅ | ❌ (hạn chế) | ✅ |
| API keys & usage plans | ✅ | ❌ | ❌ |
| Caching | ✅ | ❌ | ❌ |
| Lambda authorizer | ✅ | ✅ | ✅ |
| Cognito authorizer | ✅ | ✅ (JWT) | ❌ |
| IAM authorizer | ✅ | ✅ | ✅ |
| Private API (VPC) | ✅ | ❌ | ❌ |
| WAF integration | ✅ | ❌ | ❌ |

> 💡 Mẹo thi: Câu hỏi nhấn mạnh "lowest cost / lowest latency, chỉ cần proxy đến Lambda hoặc HTTP backend" → chọn **HTTP API**. Câu cần **usage plans, API keys, caching, request validation, mapping templates, WAF, private API** → chỉ **REST API** đáp ứng. Cần realtime / chat / push từ server → **WebSocket API**.

WebSocket API định tuyến message dựa trên **route selection expression** (ví dụ `$request.body.action`), với 3 route hệ thống: `$connect`, `$disconnect`, `$default`. Server đẩy message về client qua `@connections` API:

```
POST https://{api-id}.execute-api.{region}.amazonaws.com/{stage}/@connections/{connectionId}
```

## Stages & Stage variables

**Stage** là một bản deploy có tên của API (ví dụ `dev`, `test`, `prod`). Mỗi stage có URL riêng:

```
https://{api-id}.execute-api.{region}.amazonaws.com/{stage}/resource
```

Một thay đổi chỉ có hiệu lực sau khi **deploy** vào stage — đây là bẫy hay gặp: bạn sửa method/integration nhưng quên deploy nên không thấy thay đổi.

**Stage variables** là các cặp key-value gắn với stage, hoạt động như biến môi trường cho API. Dùng để cùng một API definition trỏ tới backend khác nhau theo từng stage.

```
# Stage "prod" có biến lambdaAlias = PROD
# Integration URI dùng biến:
arn:aws:apigateway:{region}:lambda:path/2015-03-31/functions/
  arn:aws:lambda:{region}:{acct}:function:myFunc:${stageVariables.lambdaAlias}/invocations
```

Cách dùng phổ biến của stage variables:

- Trỏ tới **Lambda alias** khác nhau (`dev` → alias DEV, `prod` → alias PROD).
- Đổi **HTTP backend endpoint** theo môi trường.
- Truyền config vào mapping template qua `$stageVariables.key`.

Trong VTL/mapping template truy cập bằng `$stageVariables.name`; trong integration URI dùng `${stageVariables.name}`.

> ⚠️ Bẫy: Stage variables KHÔNG phải là Lambda environment variables. Stage variables thuộc về API Gateway và dùng để chọn backend/cấu hình tại tầng API. Nếu đề hỏi "cùng một API trỏ tới các Lambda alias khác nhau cho mỗi môi trường" → **stage variables + Lambda alias**, không phải tạo nhiều API.

## Integration types

API Gateway hỗ trợ nhiều loại integration giữa method và backend:

| Integration type | Backend | Đặc điểm |
|------------------|---------|----------|
| `AWS_PROXY` (Lambda proxy) | Lambda | Truyền nguyên request, Lambda trả format chuẩn |
| `AWS` (Lambda non-proxy) | Lambda | Cần mapping template để transform |
| `HTTP_PROXY` | HTTP endpoint | Passthrough đến HTTP backend |
| `HTTP` | HTTP endpoint | Có mapping template |
| `AWS` (AWS service) | AWS service API | Gọi trực tiếp SQS, SNS, DynamoDB... |
| `MOCK` | Không có backend | Trả response ngay từ API Gateway (test/CORS) |

### Lambda proxy vs non-proxy — bẫy kinh điển

Đây là chủ đề bị hỏi nhiều nhất.

**Lambda proxy (`AWS_PROXY`)**: API Gateway gửi toàn bộ request (headers, query string, path params, body, stage variables...) trong một object chuẩn `event`. Lambda **bắt buộc** trả về đúng cấu trúc:

```json
{
  "statusCode": 200,
  "headers": { "Content-Type": "application/json" },
  "body": "{\"message\":\"hello\"}",
  "isBase64Encoded": false
}
```

`body` phải là **string** (đã `JSON.stringify`), không phải object. Nếu Lambda trả sai format, client nhận lỗi `502 Bad Gateway` / "Internal server error" — bẫy hay gặp.

```js
exports.handler = async (event) => {
  const name = event.queryStringParameters?.name || "world";
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: `hello ${name}` })
  };
};
```

**Lambda non-proxy (`AWS`)**: bạn tự định nghĩa **mapping template** để chuyển request thành input cho Lambda, và transform output Lambda thành response. Lambda nhận/trả JSON tùy ý, không cần `statusCode`/`body`.

| | Proxy (`AWS_PROXY`) | Non-proxy (`AWS`) |
|--|---------------------|-------------------|
| Mapping template | Không cần (và không dùng được cho request) | Bắt buộc tự viết |
| Format Lambon trả | Phải đúng `{statusCode, headers, body}` | JSON tùy ý |
| Linh hoạt transform | Thấp (logic nằm trong code) | Cao (VTL) |
| Đơn giản để setup | Cao | Thấp |

> 💡 Mẹo thi: "Ít cấu hình nhất, để Lambda code tự xử lý request/response" → **Lambda proxy**. "Cần transform/validate ở API Gateway mà không sửa code Lambda" → **non-proxy + mapping template**.

## Mapping templates (VTL)

Mapping template dùng **Velocity Template Language (VTL)** để biến đổi request trước khi tới backend hoặc response trước khi trả client. Chỉ có ở REST API và WebSocket API.

Ví dụ transform request body thành input gọi thẳng vào SQS (AWS service integration, không cần Lambda):

```velocity
## Content-Type: application/x-www-form-urlencoded
Action=SendMessage&MessageBody=$util.urlEncode($input.body)&QueueUrl=$stageVariables.queueUrl
```

Các biến/hàm VTL hay gặp:

- `$input.body` — raw body dạng string.
- `$input.json('$.field')` — trích field bằng JSONPath.
- `$input.params('name')` — lấy path/query/header param.
- `$util.escapeJavaScript()`, `$util.urlEncode()`, `$util.base64Encode()`.
- `$context.*` — thông tin request (`$context.requestId`, `$context.identity.sourceIp`).
- `$stageVariables.*` — stage variables.

Một use case mạnh: **service integration trực tiếp** (API Gateway → DynamoDB/SQS/SNS) bỏ qua Lambda hoàn toàn, dùng mapping template để dựng request → tiết kiệm chi phí và latency.

> 💡 Mẹo thi: "Đẩy message thẳng vào SQS/SNS, hoặc ghi DynamoDB mà không muốn duy trì Lambda" → **AWS service integration + mapping template**.

## Request validation

REST API validate request **trước khi** gọi backend, giảm tải vô ích. Ba cách:

- Kiểm tra **required query string / header / path** parameters có mặt.
- Kiểm tra **request body** theo **JSON Schema model**.
- Kết hợp cả hai.

```json
// Model (JSON Schema) gắn vào method request
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "required": ["email", "amount"],
  "properties": {
    "email": { "type": "string" },
    "amount": { "type": "number", "minimum": 1 }
  }
}
```

Request không hợp lệ bị trả `400 Bad Request` ngay tại API Gateway, không tốn invocation Lambda.

> ⚠️ Bẫy: Request validation đầy đủ (body theo model) là tính năng của **REST API**, không phải HTTP API. Đề mô tả "validate JSON body theo schema trước khi vào Lambda" → REST API.

## Authorizers

Kiểm soát ai được gọi API. Có 4 cơ chế chính:

| Authorizer | Cơ chế | Khi nào dùng |
|------------|--------|--------------|
| **IAM** | SigV4 signing, IAM policy | Caller là AWS service/IAM principal/app dùng IAM credentials |
| **Cognito User Pools** | JWT từ Cognito | App có user đăng nhập qua Cognito |
| **Lambda authorizer (TOKEN)** | Token trong header (vd `Authorization: Bearer ...`) | Custom auth: JWT bên thứ 3 (Auth0), OAuth, token tùy ý |
| **Lambda authorizer (REQUEST)** | Toàn bộ request (headers, query, context) | Auth dựa trên nhiều tham số, không chỉ một token |

**Lambda authorizer** (trước gọi custom authorizer) trả về một **IAM policy** + `principalId`. API Gateway **cache** kết quả theo TTL để khỏi gọi lại mỗi request.

```json
{
  "principalId": "user123",
  "policyDocument": {
    "Version": "2012-10-17",
    "Statement": [{
      "Action": "execute-api:Invoke",
      "Effect": "Allow",
      "Resource": "arn:aws:execute-api:region:acct:api-id/stage/GET/resource"
    }]
  },
  "context": { "org": "acme" }
}
```

`context` được truyền xuống backend qua `$context.authorizer.org` (hoặc `event.requestContext.authorizer` trong Lambda proxy).

> ⚠️ Bẫy authorizer:
> - **TOKEN authorizer**: chỉ nhìn một token trong header → dùng cho JWT/OAuth của bên thứ ba.
> - **REQUEST authorizer**: cần nhiều tham số (query string, multiple headers, sourceIp) để quyết định.
> - **Cognito authorizer**: khi user pool là Cognito, KHÔNG cần viết Lambda — API Gateway tự validate JWT. Đề nói "validate Cognito JWT, ít code nhất" → Cognito authorizer, không phải Lambda authorizer.
> - **IAM authorizer**: khi client ký request bằng SigV4 (service-to-service, hoặc app dùng Cognito Identity Pool lấy IAM credentials).

## Throttling, Usage plans & API keys

API Gateway throttle bằng mô hình **token bucket**: **rate** (steady-state requests/giây) và **burst** (số request đồng thời tối đa). Vượt giới hạn → `429 Too Many Requests`.

Các tầng throttling:

- **Account-level**: mặc định 10,000 rps, burst 5,000 (per region, soft limit).
- **Stage-level / method-level**: cấu hình riêng cho stage hoặc từng method.
- **Usage plan**: giới hạn theo API key.

**Usage plan** gắn với **API key** để phân phối quota cho từng client (ví dụ khách trả phí):

- **Throttle**: rate + burst riêng cho key đó.
- **Quota**: số request tối đa theo ngày/tuần/tháng.

```bash
aws apigateway create-usage-plan --name "Gold" \
  --throttle rateLimit=100,burstLimit=200 \
  --quota limit=1000000,period=MONTH
```

> ⚠️ Bẫy: API key **một mình không xác thực** (authentication) — nó chỉ để **định danh client cho usage plan**. Đừng dùng API key thay cho authorizer. Để bắt buộc API key, method phải set `apiKeyRequired = true`, client gửi qua header `x-api-key`. Usage plans + API keys **chỉ có ở REST API**.

## Caching

Cache nằm ở **stage level**, giảm số lần gọi backend và cải thiện latency.

- Dung lượng cache: 0.5 GB → 237 GB. **Có tính phí** (không thuộc free tier).
- **TTL** mặc định 300s (0–3600s). TTL = 0 → tắt cache.
- **Cache key** dựa trên các request parameter bạn chỉ định.
- Client có thể bypass cache bằng header `Cache-Control: max-age=0` (nếu bạn cấp quyền `InvalidateCache`).

> 💡 Mẹo thi: Cache là tính năng **REST API**, cấu hình **per-stage**, và **có phí**. "Giảm tải backend cho request GET lặp lại" → bật stage caching + đặt TTL.

## CORS

CORS (Cross-Origin Resource Sharing) cần khi browser gọi API từ origin khác. Browser gửi **preflight** `OPTIONS` request; API Gateway phải trả các header:

- `Access-Control-Allow-Origin`
- `Access-Control-Allow-Methods`
- `Access-Control-Allow-Headers`

Với REST API, thường tạo một method `OPTIONS` dùng **MOCK integration** trả về các header này. HTTP API có cấu hình CORS đơn giản hơn (khai báo trực tiếp trong config).

> ⚠️ Bẫy CORS:
> - Lỗi CORS xảy ra ở **browser**, không phải khi gọi từ Postman/curl/server-to-server.
> - Với **Lambda proxy**, header CORS (`Access-Control-Allow-Origin`) phải do **Lambda tự trả về trong response** — bật CORS ở console chỉ xử lý preflight OPTIONS, không tự thêm header vào response của method khác.
> - "Enable CORS" trên console tạo OPTIONS method nhưng **nhớ deploy lại stage** mới có hiệu lực.

## Tổng kết nhanh cho phòng thi

- **HTTP API**: rẻ, nhanh, proxy đơn giản, JWT authorizer. KHÔNG có usage plan/API key/caching/VTL/WAF/private.
- **REST API**: full feature — usage plans, API keys, caching, mapping templates, request validation, WAF, private API.
- **WebSocket API**: realtime 2 chiều, routes `$connect`/`$disconnect`/`$default`, đẩy message qua `@connections`.
- **Lambda proxy**: ít config, Lambda trả `{statusCode, headers, body(string)}`; sai format → 502.
- **Lambda non-proxy**: cần mapping template VTL, linh hoạt transform.
- **Stage variables**: chọn backend/Lambda alias theo môi trường, không phải Lambda env vars.
- **Authorizers**: IAM (SigV4) / Cognito (JWT, không cần code) / Lambda TOKEN (1 token) / Lambda REQUEST (nhiều tham số).
- **API key ≠ authentication** — chỉ để định danh cho usage plan.
- **Caching & request validation & usage plans**: chỉ REST API; nhớ **deploy stage** sau mọi thay đổi.
