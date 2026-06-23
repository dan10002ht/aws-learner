# Tracing with AWS X-Ray

Trong production, khi một request "chậm" hoặc "lỗi 500" đi qua hàng loạt service (API Gateway → Lambda → DynamoDB → SQS → một Lambda khác), câu hỏi đầu tiên luôn là: *nó chậm/lỗi ở đâu?* Log thường rời rạc, mỗi service một nơi. **AWS X-Ray** giải quyết đúng bài toán này: nó ghép toàn bộ hành trình của một request thành một **trace** duy nhất, vẽ ra **service map**, và cho bạn thấy latency từng chặng.

Đây là service trọng tâm của **Domain 4 (Troubleshooting & Optimization)** trong DVA-C02. Đề thi không hỏi bạn cấu hình màn hình console, mà hỏi: *annotation hay metadata?*, *vì sao trace bị thiếu?*, *bật tracing cho Lambda thế nào?*, *làm sao giảm chi phí X-Ray?*. Bài này đi thẳng vào những điểm đó.

## Mô hình dữ liệu của X-Ray: Trace, Segment, Subsegment

Hiểu đúng 3 khái niệm này là nền tảng cho mọi câu hỏi X-Ray.

| Khái niệm | Là gì | Ví dụ |
|-----------|-------|-------|
| **Trace** | Toàn bộ hành trình của **một** request đi qua tất cả service. Có một `Trace ID` duy nhất. | Request `GET /order/123` đi qua API Gateway → Lambda → DynamoDB |
| **Segment** | Dữ liệu một **service/resource** đóng góp vào trace. Mỗi compute component tạo 1 segment. | Lambda function tạo một segment |
| **Subsegment** | Chia nhỏ bên trong một segment — đo từng phần việc con. | Trong Lambda segment: subsegment "call DynamoDB", subsegment "call HTTP API" |

Hình dung — một **trace** bọc các **segment**, mỗi segment bọc các **subsegment** (hộp lồng nhau), kèm latency từng phần:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cấu trúc lồng nhau Trace → Segment → Subsegment trong X-Ray</title>
  <desc>Một trace có Trace ID duy nhất bọc segment API Gateway, bên trong bọc segment Lambda ProcessOrder; segment Lambda chứa ba subsegment: DynamoDB GetItem 12ms, HTTP GET payment-api 340ms là thủ phạm latency, và SQS SendMessage 8ms.</desc>
  <rect x="12" y="34" width="696" height="272" rx="11" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <rect x="24" y="12" width="290" height="24" rx="12" fill="#8b5cf6" fill-opacity="0.9"/>
  <text x="36" y="29" font-size="11.5" font-weight="700" fill="#fff">Trace · Trace ID 1-5f…-abc</text>

  <rect x="30" y="58" width="660" height="236" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <rect x="42" y="48" width="180" height="22" rx="11" fill="#f59e0b" fill-opacity="0.92"/>
  <text x="54" y="64" font-size="11" font-weight="700" fill="#fff">Segment · API Gateway</text>

  <rect x="48" y="86" width="624" height="196" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <rect x="60" y="76" width="232" height="22" rx="11" fill="#3b82f6" fill-opacity="0.92"/>
  <text x="72" y="92" font-size="11" font-weight="700" fill="#fff">Segment · Lambda "ProcessOrder"</text>

  <g>
    <rect x="66" y="112" width="588" height="44" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="80" y="130" font-size="12" font-weight="700" fill="currentColor">Subsegment · DynamoDB GetItem</text>
    <text x="80" y="147" font-size="10.5" fill="currentColor" opacity="0.7">lời gọi AWS SDK</text>
    <rect x="582" y="122" width="60" height="24" rx="12" fill="#10b981" fill-opacity="0.9"/>
    <text x="612" y="139" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">12 ms</text>
  </g>

  <g>
    <rect x="66" y="164" width="588" height="50" rx="8" fill="#f59e0b" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.35" stroke-width="1.5"/>
    <text x="80" y="183" font-size="12" font-weight="700" fill="currentColor">Subsegment · HTTP GET payment-api</text>
    <text x="80" y="200" font-size="10.5" fill="currentColor" opacity="0.8">thủ phạm latency — chiếm phần lớn thời gian</text>
    <rect x="576" y="176" width="66" height="26" rx="13" fill="#f59e0b" fill-opacity="0.95"/>
    <text x="609" y="194" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">340 ms</text>
  </g>

  <g>
    <rect x="66" y="222" width="588" height="44" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="80" y="240" font-size="12" font-weight="700" fill="currentColor">Subsegment · SQS SendMessage</text>
    <text x="80" y="257" font-size="10.5" fill="currentColor" opacity="0.7">lời gọi AWS SDK</text>
    <rect x="588" y="232" width="54" height="24" rx="12" fill="#10b981" fill-opacity="0.9"/>
    <text x="615" y="249" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">8 ms</text>
  </g>
</svg>

**Trace ID** được truyền giữa các service qua HTTP header `X-Amzn-Trace-Id`. Đây là cách X-Ray "nối" các segment của các service khác nhau thành một trace.

> 💡 Mẹo thi: Khi đề mô tả "muốn biết phần nào *bên trong* một function gây chậm" → đáp án là **subsegment**. Khi nói "mỗi service đóng góp dữ liệu" → **segment**. Khi nói "toàn bộ request end-to-end" → **trace**.

## Annotations vs Metadata — câu hỏi kinh điển nhất

Trong segment/subsegment, bạn có thể đính thêm dữ liệu của riêng mình. Có **hai** loại, và đề thi **rất hay** bẫy chỗ này.

| | **Annotations** | **Metadata** |
|---|-----------------|--------------|
| Index? | **CÓ** được index | **KHÔNG** index |
| Filter/search được? | **CÓ** — dùng trong filter expression trên console | **KHÔNG** — chỉ để xem |
| Kiểu dữ liệu | Key-value đơn giản (string, number, boolean) | Bất kỳ (object, array, JSON lồng nhau) |
| Giới hạn | Tối đa 50 annotation/trace | Lớn hơn nhiều |
| Dùng khi | Cần **lọc/nhóm** trace theo giá trị | Lưu thông tin debug chi tiết, không cần search |

Quy tắc nhớ: **Annotation = filter được. Metadata = không.**

Ví dụ với X-Ray SDK (Node.js):

```javascript
const AWSXRay = require('aws-xray-sdk-core');

// Annotation: filter được -> "service("ProcessOrder") { annotation.customerTier = "premium" }"
const segment = AWSXRay.getSegment();
segment.addAnnotation('customerTier', 'premium');
segment.addAnnotation('orderValue', 1500);

// Metadata: chỉ để xem khi mở trace, KHÔNG search được
segment.addMetadata('requestPayload', { items: [...], coupon: 'SUMMER' });
```

Filter expression tương ứng trên console (chỉ chạy được với annotation):

```
annotation.customerTier = "premium" AND annotation.orderValue > 1000
```

> ⚠️ Bẫy: Đề cho tình huống "team muốn **search/filter** trace theo `customerId`" rồi đưa ra cả hai lựa chọn. Nếu chọn **metadata** là SAI vì metadata không index, không filter được. Phải là **annotation**. Ngược lại, "lưu một object JSON lớn chỉ để xem khi debug" → **metadata** (annotation chỉ nhận giá trị đơn và bị giới hạn 50).

## Service Map

X-Ray tự động tổng hợp các trace thành **service map** — một sơ đồ các node (service) và cạnh (lời gọi giữa chúng), kèm:

- Latency trung bình / p50 / p95 từng node.
- Tỉ lệ lỗi: **error** (4xx), **fault** (5xx), **throttle** (429).
- Node nào màu đỏ/cam → nơi cần soi.

Đây là công cụ số 1 để **khoanh vùng** sự cố trước khi đào sâu vào trace cụ thể. Đề có thể hỏi "công cụ nào giúp *trực quan hóa* mối quan hệ giữa các microservice và xác định bottleneck" → **service map**.

## X-Ray SDK: Instrumentation

X-Ray SDK là thư viện bạn nhúng vào code để **tự động** tạo segment/subsegment. Ba nhóm chính nó "bắt" được:

### 1. Capture AWS SDK calls
Wrap AWS SDK client → mọi lời gọi (DynamoDB, S3, SNS...) tự sinh subsegment.

```javascript
const AWSXRay = require('aws-xray-sdk-core');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));   // v2: wrap toàn bộ
const ddb = new AWS.DynamoDB.DocumentClient();
// Mọi ddb.get/put... giờ tự tạo subsegment
```

### 2. Capture HTTP calls
Wrap module `http`/`https` → mọi outbound HTTP request thành subsegment (thấy được latency gọi API bên ngoài).

```javascript
const https = AWSXRay.captureHTTPs(require('https'));
```

### 3. Capture SQL queries
Wrap client SQL (PostgreSQL, MySQL) → mỗi query thành subsegment, kèm thời gian.

```javascript
const pg = AWSXRay.capturePostgres(require('pg'));
```

> 💡 Mẹo thi: Khi đề nói "muốn thấy thời gian từng **truy vấn database** / từng **lời gọi DynamoDB** / từng **HTTP request ra ngoài**" trong trace → đó là **subsegment** tạo bởi SDK capture (`captureAWS`, `captureHTTPs`, `capturePostgres`). Không cần config thủ công từng cái.

## X-Ray Daemon vs Lambda Active Tracing

Đây là điểm khác biệt cốt lõi giữa các môi trường compute — và là **bẫy phổ biến**.

### X-Ray Daemon (EC2, ECS, on-prem)
SDK **không** gửi segment thẳng lên AWS X-Ray API. Nó gửi qua UDP cổng **2000** tới một process trung gian gọi là **X-Ray daemon**. Daemon gom (buffer) rồi đẩy batch lên X-Ray.

→ Trên **EC2 / ECS / container / on-prem**, bạn **PHẢI tự chạy X-Ray daemon**. Nếu không có daemon, SDK gửi UDP vào hư vô → **không có trace nào xuất hiện**.

```bash
# EC2: cài & chạy daemon
curl -O https://s3.us-east-2.amazonaws.com/aws-xray-assets.us-east-2/xray-daemon/aws-xray-daemon-3.x.rpm
sudo yum install -y aws-xray-daemon-3.x.rpm
# ECS: chạy daemon như một sidecar container, expose UDP 2000
```

### Lambda Active Tracing
Trên Lambda, AWS **đã chạy sẵn** X-Ray daemon trong execution environment. Bạn **không** cài daemon. Chỉ cần:

1. Bật **Active tracing** trên function.
2. Gắn IAM permission cho X-Ray (xem mục dưới).

```bash
aws lambda update-function-configuration \
  --function-name ProcessOrder \
  --tracing-config Mode=Active
```

SAM/CloudFormation:

```yaml
Resources:
  ProcessOrder:
    Type: AWS::Serverless::Function
    Properties:
      Tracing: Active          # bật active tracing
```

| | **EC2 / ECS / on-prem** | **Lambda** |
|---|------------------------|-----------|
| Daemon | **Tự cài & chạy** | AWS quản lý sẵn |
| Bật tracing | Chạy daemon + SDK | `Mode=Active` (1 setting) |
| Cổng giao tiếp SDK→daemon | UDP **2000** | nội bộ, không lo |
| IAM | Cần `xray:PutTraceSegments` | Cần (qua execution role) |

Hai đường đi của segment — tự chạy daemon (trái) so với daemon do AWS quản lý trên Lambda (phải):

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Đường gửi segment: X-Ray daemon tự chạy (EC2/ECS/on-prem) so với Lambda Active Tracing</title>
  <desc>Bên trái, trên EC2 ECS hoặc on-prem, SDK gửi segment qua UDP cổng 2000 tới X-Ray daemon do bạn tự chạy, daemon gom batch rồi đẩy lên X-Ray API. Bên phải, trên Lambda, SDK gửi tới X-Ray daemon do AWS quản lý sẵn trong execution environment, chỉ cần bật Mode Active và có IAM; daemon batch lên X-Ray API.</desc>
  <defs>
    <marker id="xrArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>

  <text x="186" y="26" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">EC2 / ECS / on-prem</text>
  <text x="534" y="26" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Lambda (Active Tracing)</text>
  <line x1="360" y1="40" x2="360" y2="344" stroke="currentColor" stroke-opacity="0.18" stroke-dasharray="5 4"/>

  <!-- LEFT column -->
  <rect x="32" y="44" width="308" height="50" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="186" y="66" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">App + X-Ray SDK</text>
  <text x="186" y="83" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">trên instance/container của bạn</text>

  <line x1="186" y1="94" x2="186" y2="128" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#xrArr)"/>
  <rect x="118" y="100" width="136" height="22" rx="11" fill="#f59e0b" fill-opacity="0.92"/>
  <text x="186" y="116" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">UDP cổng 2000</text>

  <rect x="32" y="132" width="308" height="58" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5"/>
  <text x="186" y="156" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">X-Ray daemon — BẠN tự chạy</text>
  <text x="186" y="174" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">gom (buffer) rồi đẩy batch</text>

  <line x1="186" y1="190" x2="186" y2="224" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#xrArr)"/>

  <!-- RIGHT column -->
  <rect x="380" y="44" width="308" height="50" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="534" y="66" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">App + X-Ray SDK</text>
  <text x="534" y="83" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">Mode=Active + IAM role</text>

  <line x1="534" y1="94" x2="534" y2="128" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#xrArr)"/>
  <rect x="466" y="100" width="136" height="22" rx="11" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="534" y="116" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.85">nội bộ, không lo</text>

  <rect x="380" y="132" width="308" height="58" rx="9" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5"/>
  <text x="534" y="156" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">X-Ray daemon — AWS quản lý sẵn</text>
  <text x="534" y="174" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">có sẵn trong execution env</text>

  <line x1="534" y1="190" x2="534" y2="224" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#xrArr)"/>

  <!-- shared destination -->
  <rect x="180" y="228" width="360" height="56" rx="10" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.28"/>
  <text x="360" y="252" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">AWS X-Ray API</text>
  <text x="360" y="270" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">trace · service map · phân tích latency</text>

  <text x="186" y="308" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">Không có daemon = SDK gửi UDP vào hư vô → KHÔNG có trace</text>
  <text x="534" y="308" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">Không cài daemon thủ công — chỉ bật Active + IAM</text>
</svg>

> ⚠️ Bẫy 1: Câu hỏi "Lambda đã bật code instrument bằng SDK nhưng **không thấy trace** — thiếu gì?" → thường là **chưa bật Active tracing** (`Mode=Active`) hoặc **thiếu IAM permission**. KHÔNG phải "cài daemon" — Lambda không cần cài daemon thủ công.

> ⚠️ Bẫy 2: Câu hỏi về **EC2/ECS** "đã add SDK, IAM đủ, vẫn không có trace" → khả năng cao là **chưa chạy X-Ray daemon**. Đây là khác biệt then chốt so với Lambda.

## Sampling Rules — kiểm soát chi phí

X-Ray tính tiền theo số trace ghi/scan. Trên hệ thống traffic lớn, trace **mọi** request vừa tốn tiền vừa thừa. **Sampling rules** quyết định request nào được trace.

Mặc định (default rule):
- **1 request mỗi giây** đầu tiên được trace (reservoir), **cộng**
- **5%** số request còn lại.

Bạn có thể tạo custom rule, ưu tiên theo: service name, HTTP method, URL path, host... với hai tham số:

| Tham số | Ý nghĩa |
|---------|---------|
| **Reservoir** | Số trace tối thiểu **cố định mỗi giây** lấy mẫu (bất kể tỉ lệ) |
| **Rate** | Tỉ lệ % lấy mẫu cho phần request **vượt** reservoir |

```json
{
  "version": 2,
  "rules": [
    {
      "description": "Trace toan bo /checkout",
      "service_name": "*",
      "http_method": "*",
      "url_path": "/checkout*",
      "fixed_target": 2,
      "rate": 1.0
    }
  ],
  "default": { "fixed_target": 1, "rate": 0.05 }
}
```

Điểm hay: sampling rules cấu hình **tập trung trên X-Ray**, các SDK/service tự fetch và áp dụng — **không cần đổi code, không deploy lại**.

> 💡 Mẹo thi: Đề hỏi "X-Ray **chi phí quá cao** do traffic lớn, giảm cách nào mà không tắt hẳn tracing?" → **điều chỉnh sampling rules** (giảm rate / reservoir). Đề hỏi "muốn đảm bảo **luôn trace 100%** các request đến `/payment`" → tạo custom rule với `rate: 1.0` cho path đó.

## IAM Permissions cho X-Ray

Phân biệt rõ hai chiều quyền:

| Hành động | Permission cần | Ai cần |
|-----------|----------------|--------|
| **Gửi** trace data lên X-Ray | `xray:PutTraceSegments`, `xray:PutTelemetryRecords` | App/Lambda/EC2 đang được trace |
| **Lấy** sampling rules | `xray:GetSamplingRules`, `xray:GetSamplingTargets` | App đang được trace |
| **Đọc/xem** trace (console, dashboard) | `xray:GetTraceSummaries`, `xray:BatchGetTraces`, `xray:GetServiceGraph` | Developer/người xem |

Hai managed policy thường dùng:
- **`AWSXRayDaemonWriteAccess`** — quyền *ghi* (gửi segment). Gắn cho EC2 instance role / ECS task role / Lambda execution role.
- **`AWSXRayReadOnlyAccess`** — quyền *đọc* cho người xem.

Ví dụ inline policy tối thiểu để **gửi** trace:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "xray:PutTraceSegments",
      "xray:PutTelemetryRecords",
      "xray:GetSamplingRules",
      "xray:GetSamplingTargets"
    ],
    "Resource": "*"
  }]
}
```

> ⚠️ Bẫy: Trace bị thiếu **không phải** lúc nào cũng do code. Một nguyên nhân kinh điển: **execution role / instance role thiếu `xray:PutTraceSegments`**. Khi đề liệt kê triệu chứng "code đã instrument, daemon đang chạy, nhưng X-Ray console trống" → soi **IAM permission** đầu tiên.

## Tích hợp với các service AWS

X-Ray không chỉ sống trong code của bạn — nhiều service AWS tự propagate trace context.

### API Gateway
Bật **X-Ray tracing** ở stage level → API Gateway tạo segment đầu tiên và truyền `Trace ID` xuống Lambda/backend.

```bash
aws apigateway update-stage --rest-api-id abc123 --stage-name prod \
  --patch-operations op=replace,path=/tracingEnabled,value=true
```

### Lambda
Active tracing (đã nói trên). Khi được API Gateway gọi với trace context, Lambda nối tiếp cùng trace.

### SQS / SNS — propagation bất đồng bộ
Đây là điểm tinh tế: trace context được truyền qua **message system attributes**. Producer gắn `Trace ID` vào message → consumer (ví dụ Lambda đọc từ SQS) **nối tiếp cùng một trace** dù xử lý bất đồng bộ.

→ Cho phép trace xuyên suốt cả luồng async: `API GW → Lambda A → SNS → SQS → Lambda B`, tất cả trong **một** trace.

> 💡 Mẹo thi: "Làm sao trace một luồng **bất đồng bộ** qua SQS/SNS, giữ nguyên một trace end-to-end?" → trace context tự truyền qua **message attributes**; chỉ cần các service đều bật tracing.

## Bảng tổng hợp "khi nào dùng / chọn gì"

| Tình huống đề bài | Đáp án |
|-------------------|--------|
| Cần **filter/search** trace theo giá trị custom | **Annotation** (indexed) |
| Lưu object JSON lớn chỉ để **xem** khi debug | **Metadata** |
| Xem latency từng query DB / lời gọi DynamoDB | **Subsegment** (SDK capture) |
| Trực quan hóa quan hệ giữa các microservice | **Service map** |
| Lambda không thấy trace | Bật **Active tracing** + IAM |
| EC2/ECS không thấy trace | Chạy **X-Ray daemon** (UDP 2000) |
| Giảm chi phí X-Ray khi traffic lớn | Chỉnh **sampling rules** |
| Luôn trace 100% một path quan trọng | Custom rule `rate: 1.0` |
| Trace trống dù code đúng + daemon chạy | Thiếu **`xray:PutTraceSegments`** |
| Trace luồng async qua SQS/SNS | Trace context qua **message attributes** |

## Checklist trước khi thi

- [ ] **Trace** = cả request; **Segment** = mỗi service; **Subsegment** = phần việc con bên trong.
- [ ] **Annotation** index + filter được (max 50); **Metadata** không index, chỉ để xem.
- [ ] **Service map** = trực quan hóa + tìm bottleneck.
- [ ] SDK capture: `captureAWS`, `captureHTTPs`, `capturePostgres/Mysql` → tạo subsegment tự động.
- [ ] **EC2/ECS** → tự chạy **daemon** (UDP **2000**). **Lambda** → chỉ `Mode=Active`, không cài daemon.
- [ ] Gửi trace cần **`xray:PutTraceSegments`** (+ `PutTelemetryRecords`, `GetSamplingRules`, `GetSamplingTargets`). Managed: `AWSXRayDaemonWriteAccess`.
- [ ] **Sampling rules** = reservoir (fixed_target) + rate → kiểm soát chi phí, cấu hình tập trung, không cần deploy lại.
- [ ] Trace thiếu? Soi theo thứ tự: **Active tracing/daemon → IAM → sampling**.
- [ ] SQS/SNS propagate trace qua **message attributes** → trace async end-to-end.
