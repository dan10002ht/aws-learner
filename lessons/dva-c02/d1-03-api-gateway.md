# Amazon API Gateway

API Gateway là "cửa ngõ" (front door) cho mọi API trong kiến trúc AWS: nó nhận request từ client, xử lý auth/throttling/transform, rồi forward đến backend (Lambda, HTTP endpoint, AWS service). Với developer, đây là service xuất hiện dày đặc trong Domain 1 của DVA-C02 vì gần như mọi serverless API đều đi qua nó.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>API Gateway là cửa ngõ — luồng xử lý request</title>
  <desc>Request từ client đi vào API Gateway, lần lượt qua authorizer, throttling và usage plan, mapping/validation, cache, rồi forward tới một trong các backend: Lambda, HTTP endpoint, AWS service, hoặc MOCK.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">API Gateway — cửa ngõ trước backend</text>
  <defs>
    <marker id="gwArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <rect x="20" y="116" width="96" height="48" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="68" y="145" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Client</text>
  <line x1="116" y1="140" x2="148" y2="140" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#gwArr)"/>
  <rect x="152" y="56" width="392" height="168" rx="12" fill="#10b981" fill-opacity="0.10" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="348" y="78" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">API Gateway</text>
  <g font-size="11" fill="currentColor">
    <rect x="170" y="92" width="356" height="26" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="348" y="109" text-anchor="middle" fill="currentColor">1 · Authorizer (IAM / Cognito / Lambda)</text>
    <rect x="170" y="124" width="356" height="26" rx="7" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="348" y="141" text-anchor="middle" fill="currentColor">2 · Throttling + Usage plan / API key</text>
    <rect x="170" y="156" width="356" height="26" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="348" y="173" text-anchor="middle" fill="currentColor">3 · Mapping (VTL) + Request validation</text>
    <rect x="170" y="188" width="356" height="26" rx="7" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="348" y="205" text-anchor="middle" fill="currentColor">4 · Cache (per-stage)</text>
  </g>
  <line x1="544" y1="140" x2="576" y2="140" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#gwArr)"/>
  <g font-size="10.5" fill="currentColor">
    <rect x="580" y="64" width="124" height="30" rx="7" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="642" y="83" text-anchor="middle" fill="currentColor">Lambda</text>
    <rect x="580" y="100" width="124" height="30" rx="7" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="642" y="119" text-anchor="middle" fill="currentColor">HTTP endpoint</text>
    <rect x="580" y="136" width="124" height="30" rx="7" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="642" y="155" text-anchor="middle" fill="currentColor">AWS service</text>
    <rect x="580" y="172" width="124" height="30" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="642" y="191" text-anchor="middle" fill="currentColor">MOCK</text>
  </g>
  <text x="642" y="222" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">Backend</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 330" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>WebSocket API — định tuyến message hai chiều</title>
  <desc>Client mở kết nối kích route hệ thống $connect; mỗi message được định tuyến qua route selection expression tới handler tương ứng; server đẩy message ngược về client qua @connections API; khi đóng kết nối kích $disconnect.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">WebSocket API — định tuyến hai chiều</text>
  <defs>
    <marker id="wsArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <rect x="24" y="120" width="120" height="56" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="84" y="146" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Client</text>
  <text x="84" y="164" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">kết nối lâu dài</text>
  <rect x="270" y="96" width="180" height="104" rx="11" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="360" y="120" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">API Gateway</text>
  <text x="360" y="138" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">route selection expression</text>
  <text x="360" y="154" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">$request.body.action</text>
  <text x="360" y="180" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">@connections → đẩy về client</text>
  <g font-size="11" fill="currentColor">
    <rect x="540" y="58" width="156" height="30" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="618" y="78" text-anchor="middle" fill="currentColor">$connect (mở)</text>
    <rect x="540" y="98" width="156" height="30" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="618" y="118" text-anchor="middle" fill="currentColor">route sendMessage</text>
    <rect x="540" y="138" width="156" height="30" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="618" y="158" text-anchor="middle" fill="currentColor">$default</text>
    <rect x="540" y="178" width="156" height="30" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="618" y="198" text-anchor="middle" fill="currentColor">$disconnect (đóng)</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <path d="M144 134 H262" marker-end="url(#wsArr)"/>
    <path d="M450 120 H534" marker-end="url(#wsArr)"/>
    <path d="M450 136 H534" marker-end="url(#wsArr)"/>
    <path d="M450 152 H534" marker-end="url(#wsArr)"/>
    <path d="M450 184 H534" marker-end="url(#wsArr)"/>
  </g>
  <text x="200" y="126" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">message</text>
  <path d="M262 178 H144" stroke="#10b981" stroke-opacity="0.75" fill="none" marker-end="url(#wsArr)"/>
  <text x="200" y="172" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">server push (@connections)</text>
  <text x="12" y="232" font-size="10.5" text-anchor="start" fill="currentColor" opacity="0.7">connect → $connect · close → $disconnect</text>
  <text x="618" y="232" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">handler theo từng route</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Lambda proxy vs non-proxy — đường đi dữ liệu</title>
  <desc>Bên trái: integration proxy AWS_PROXY chuyển nguyên request thành event chuẩn, Lambda bắt buộc trả {statusCode, headers, body string}, sai format thì 502. Bên phải: integration non-proxy AWS dùng mapping template VTL transform request vào và response ra, Lambda nhận/trả JSON tùy ý.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">Proxy vs Non-proxy — đường đi dữ liệu</text>
  <defs>
    <marker id="apFlow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
  <text x="190" y="52" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Proxy (AWS_PROXY)</text>
  <text x="530" y="52" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Non-proxy (AWS)</text>
  <line x1="360" y1="40" x2="360" y2="344" stroke="currentColor" stroke-opacity="0.18"/>
  <g>
    <rect x="40" y="66" width="300" height="40" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="190" y="91" font-size="12" text-anchor="middle" fill="currentColor">Client request (headers, query, body)</text>
    <line x1="190" y1="106" x2="190" y2="124" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#apFlow)"/>
    <rect x="40" y="126" width="300" height="44" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="190" y="146" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">API GW: truyền NGUYÊN request</text>
    <text x="190" y="162" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">đóng thành event chuẩn (không VTL)</text>
    <line x1="190" y1="170" x2="190" y2="188" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#apFlow)"/>
    <rect x="40" y="190" width="300" height="40" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="190" y="215" font-size="12" text-anchor="middle" fill="currentColor">Lambda: đọc event, viết logic trong code</text>
    <line x1="190" y1="230" x2="190" y2="248" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#apFlow)"/>
    <rect x="40" y="250" width="300" height="44" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="190" y="270" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">BẮT BUỘC trả {statusCode, headers, body}</text>
    <text x="190" y="286" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">body là string — sai format → 502</text>
  </g>
  <g>
    <rect x="380" y="66" width="300" height="40" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="530" y="91" font-size="12" text-anchor="middle" fill="currentColor">Client request (headers, query, body)</text>
    <line x1="530" y1="106" x2="530" y2="124" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#apFlow)"/>
    <rect x="380" y="126" width="300" height="44" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="530" y="146" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Mapping template VTL (request)</text>
    <text x="530" y="162" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">transform → input Lambda tùy ý</text>
    <line x1="530" y1="170" x2="530" y2="188" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#apFlow)"/>
    <rect x="380" y="190" width="300" height="40" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="530" y="215" font-size="12" text-anchor="middle" fill="currentColor">Lambda: nhận/trả JSON tùy ý</text>
    <line x1="530" y1="230" x2="530" y2="248" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#apFlow)"/>
    <rect x="380" y="250" width="300" height="44" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="530" y="270" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Mapping template VTL (response)</text>
    <text x="530" y="286" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">transform output → response client</text>
  </g>
  <text x="190" y="320" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">Ít config, logic nằm trong code</text>
  <text x="530" y="320" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">Transform/validate không sửa code Lambda</text>
</svg>

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
