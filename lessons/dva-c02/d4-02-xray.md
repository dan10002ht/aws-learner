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

Hình dung:

```
Trace (Trace ID: 1-5f...-abc)
└── Segment: API Gateway
    └── Segment: Lambda "ProcessOrder"
        ├── Subsegment: DynamoDB GetItem  (12ms)
        ├── Subsegment: HTTP GET payment-api  (340ms) ← thủ phạm latency
        └── Subsegment: SQS SendMessage  (8ms)
```

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
