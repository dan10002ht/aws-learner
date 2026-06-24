# Developing AWS Lambda

Lambda là service compute serverless trung tâm của domain "Development with AWS Services". Trong đề DVA-C02, Lambda xuất hiện dày đặc: từ cấu hình memory/timeout, concurrency, cho tới cold start, VPC, error handling. Bài này tập trung vào góc nhìn của developer: bạn viết handler, đóng gói, cấu hình runtime và xử lý lỗi như thế nào trong thực tế — và những cái bẫy mà đề thi hay gài.

## 1. Mô hình thực thi & Handler

Một Lambda function gồm 3 phần bạn phải khai báo:

- **Runtime**: môi trường chạy (`nodejs20.x`, `python3.12`, `java21`, `go` qua `provided.al2023`, ...).
- **Handler**: điểm vào, theo format `file.method` (Node/Python) hoặc `package.Class::method` (Java).
- **Deployment package**: file `.zip` hoặc **container image** (tối đa 10 GB).

Ví dụ handler Node.js:

```javascript
// index.mjs  -> handler là "index.handler"
let dbConn; // KHỞI TẠO NGOÀI handler để tái dùng giữa các invocation

export const handler = async (event, context) => {
  if (!dbConn) {
    dbConn = await createConnection(); // chỉ chạy ở cold start
  }
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
```

`event` là payload đầu vào (đã parse JSON), `context` chứa metadata: `context.getRemainingTimeInMillis()`, `context.awsRequestId`, `context.functionName`.

> 💡 Mẹo thi: Code **ngoài** handler chạy một lần khi khởi tạo execution context và được tái dùng. Code **trong** handler chạy mỗi invocation. Đặt khởi tạo DB connection, SDK client, tải config ra ngoài handler để giảm latency.

## 2. Cấu hình cơ bản: Memory, Timeout, CPU

| Tham số | Giá trị | Ghi chú |
|---------|---------|---------|
| Memory | 128 MB – 10240 MB (bước 1 MB) | **CPU cấp tỉ lệ thuận với memory** |
| Timeout | tối đa 900 giây (15 phút) | mặc định 3s |
| `/tmp` | 512 MB – 10240 MB | ephemeral storage, cấu hình riêng |
| Payload | 6 MB (sync), 256 KB (async) | giới hạn cứng |

Điểm cực kỳ hay thi: **bạn không cấu hình CPU trực tiếp**. Tăng memory = tăng CPU (và network). Một function CPU-bound có thể chạy *nhanh hơn và rẻ hơn* khi tăng memory, vì thời gian chạy giảm nhiều hơn mức tăng giá/ms.

```bash
aws lambda update-function-configuration \
  --function-name my-func \
  --memory-size 1024 \
  --timeout 30 \
  --ephemeral-storage Size=2048
```

> 💡 Mẹo thi: Dùng **AWS Lambda Power Tuning** (state machine Step Functions) để tìm điểm memory tối ưu cost/performance. Câu hỏi kiểu "function chạy chậm, làm gì rẻ nhất?" thường có đáp án là tăng memory, không phải viết lại code.

## 3. Execution Context & /tmp

Sau một invocation, Lambda "đóng băng" (freeze) execution context và có thể tái dùng cho invocation sau (warm start). Hệ quả thực chiến:

- Biến global, SDK client, connection pool **vẫn còn** giữa các lần gọi → tái dùng được.
- Nội dung `/tmp` **vẫn còn** → có thể cache file (model ML, dữ liệu tải về) giữa các invocation cùng context.
- **Không** dựa vào việc context luôn được tái dùng — có thể bị tạo mới bất cứ lúc nào. Đừng lưu trạng thái business quan trọng ở đây.
- Background thread/process bị freeze khi invocation kết thúc, "rã đông" ở lần sau (đừng dựa vào nó chạy nền).

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Vòng đời execution context của Lambda — cold start, warm, freeze và thaw</title>
  <desc>Sơ đồ trạng thái: cold start khởi tạo runtime và chạy code ngoài handler, sang trạng thái warm tái dùng context (biến global, /tmp, connection vẫn còn); sau invocation context bị freeze rồi thaw lại cho lần gọi sau; hoặc context cũ bị huỷ và một environment mới được tạo (cold start lại).</desc>
  <defs>
    <marker id="lcArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">Vòng đời execution context</text>
  <g>
    <rect x="16" y="44" width="220" height="78" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="30" y="66" font-size="12.5" font-weight="700" fill="currentColor">COLD START</text>
    <text x="30" y="86" font-size="10.5" fill="currentColor" opacity="0.75">Init runtime + tải code</text>
    <text x="30" y="102" font-size="10.5" fill="currentColor" opacity="0.75">Chạy code NGOÀI handler</text>
    <text x="30" y="116" font-size="10.5" fill="currentColor" opacity="0.6">(tạo conn, SDK client...)</text>
  </g>
  <g>
    <rect x="336" y="44" width="240" height="78" rx="10" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="350" y="66" font-size="12.5" font-weight="700" fill="currentColor">WARM — chạy handler</text>
    <text x="350" y="86" font-size="10.5" fill="currentColor" opacity="0.75">Tái dùng context:</text>
    <text x="350" y="102" font-size="10.5" fill="currentColor" opacity="0.75">biến global · /tmp · connection</text>
    <text x="350" y="116" font-size="10.5" fill="currentColor" opacity="0.6">vẫn còn → latency thấp</text>
  </g>
  <line x1="236" y1="83" x2="330" y2="83" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#lcArr)"/>
  <text x="248" y="78" font-size="10" fill="currentColor" opacity="0.7">gọi handler</text>
  <g>
    <rect x="336" y="166" width="240" height="66" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="350" y="188" font-size="12.5" font-weight="700" fill="currentColor">FREEZE</text>
    <text x="350" y="208" font-size="10.5" fill="currentColor" opacity="0.75">Sau invocation: đóng băng</text>
    <text x="350" y="223" font-size="10.5" fill="currentColor" opacity="0.6">background thread tạm dừng</text>
  </g>
  <line x1="456" y1="122" x2="456" y2="160" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#lcArr)"/>
  <text x="466" y="146" font-size="10" fill="currentColor" opacity="0.7">xong</text>
  <path d="M336 199 H300 V95 H332" fill="none" stroke="#10b981" stroke-opacity="0.7" stroke-width="1.4" marker-end="url(#lcArr)"/>
  <text x="262" y="150" font-size="10" fill="#10b981" opacity="0.95" font-weight="700">THAW — gọi lại</text>
  <text x="262" y="164" font-size="9.5" fill="currentColor" opacity="0.65">(cùng env, về WARM)</text>
  <g>
    <rect x="16" y="248" width="560" height="80" rx="10" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="5 4"/>
    <text x="30" y="272" font-size="12.5" font-weight="700" fill="currentColor">ENVIRONMENT MỚI được tạo</text>
    <text x="30" y="292" font-size="10.5" fill="currentColor" opacity="0.75">Khi scale-up, context cũ hết hạn, hoặc bị huỷ bất cứ lúc nào</text>
    <text x="30" y="310" font-size="10.5" fill="currentColor" opacity="0.6">→ context cũ KHÔNG còn → cold start lại từ đầu (đừng dựa vào việc luôn tái dùng)</text>
  </g>
  <path d="M456 232 V240 H300 V244" fill="none" stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="4 3" marker-end="url(#lcArr)"/>
  <path d="M120 248 V140 V122" fill="none" stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="4 3" marker-end="url(#lcArr)"/>
  <text x="126" y="200" font-size="9.5" fill="#f59e0b" opacity="0.95" font-weight="700">tạo mới →</text>
  <text x="126" y="214" font-size="9.5" fill="#f59e0b" opacity="0.95" font-weight="700">cold start</text>
</svg>

> ⚠️ Bẫy: `/tmp` là **ephemeral và cục bộ theo từng execution environment**, KHÔNG chia sẻ giữa các concurrent instance. Cần state chia sẻ → dùng S3, EFS, DynamoDB, ElastiCache. Cần dung lượng > 512MB → tăng `ephemeral-storage`, KHÔNG phải tăng memory.

## 4. Environment Variables & Encryption

Env vars là cách cấu hình runtime không cần sửa code:

```bash
aws lambda update-function-configuration \
  --function-name my-func \
  --environment "Variables={STAGE=prod,TABLE=orders}"
```

Cơ chế mã hóa env var (rất hay thi):

- Lambda **luôn** mã hóa env vars at rest bằng KMS (mặc định dùng AWS managed key `aws/lambda`).
- Có thể chỉ định **customer managed KMS key** (CMK) để kiểm soát quyền và rotation.
- Với secret nhạy cảm, bật **encryption helpers** trong console: giá trị được mã hóa và bạn phải **decrypt bằng KMS trong code** lúc runtime → không hiển thị plaintext trong console.

> ⚠️ Bẫy: Đề hay hỏi "lưu DB password an toàn cho Lambda thế nào?". Env var thường KHÔNG phải đáp án tốt nhất — ưu tiên **Secrets Manager** (có rotation tự động) hoặc **SSM Parameter Store SecureString**. Env var phù hợp config không nhạy cảm. Nếu bắt buộc dùng env var cho secret → bật encryption helper + CMK.

So sánh nhanh nơi lưu cấu hình:

| Nhu cầu | Giải pháp |
|---------|-----------|
| Config tĩnh, không nhạy cảm | Environment variables |
| Secret + auto-rotation | Secrets Manager |
| Param/secret, rẻ, phân cấp | SSM Parameter Store |
| Reference từ nhiều function | Parameter Store / AppConfig |

## 5. Layers & Extensions

**Layers**: gói thư viện/dependency/runtime dùng chung, tách khỏi code function.

- Tối đa **5 layers** mỗi function.
- Tổng dung lượng unzip (code + tất cả layers) ≤ **250 MB**.
- Được giải nén vào `/opt`. Thư viện đặt theo path runtime kỳ vọng (vd Python: `/opt/python`).
- Giúp giảm kích thước package, chia sẻ code, deploy nhanh hơn.

```bash
aws lambda publish-layer-version \
  --layer-name shared-deps \
  --zip-file fileb://layer.zip \
  --compatible-runtimes python3.12
```

**Extensions**: tích hợp tool (monitoring, observability, secrets, governance) vào lifecycle của Lambda.

- **Internal extension**: chạy trong cùng process runtime.
- **External extension**: chạy như process riêng song song với function, có lifecycle riêng (init → invoke → shutdown).

> 💡 Mẹo thi: Câu hỏi kiểu "chạy agent monitoring/secrets caching song song với function code mà không sửa handler" → đáp án là **Lambda Extension** (external). Container image dùng khi package > 250 MB hoặc cần custom OS dependency.

## 6. Concurrency: Reserved vs Provisioned

Đây là phần bị nhầm lẫn nhiều nhất. Phân biệt rõ:

| Khái niệm | Là gì | Mục đích | Giải quyết cold start? |
|-----------|-------|----------|------------------------|
| **Unreserved** (mặc định) | Pool chung của account (mặc định 1000/region) | Mặc định cho mọi function | Không |
| **Reserved concurrency** | Giới hạn *trần* số instance đồng thời 1 function được dùng | Bảo vệ downstream / giới hạn / cô lập | Không |
| **Provisioned concurrency** | Số instance được **khởi tạo trước, giữ ấm** | Loại bỏ cold start | **Có** |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Phân chia concurrency pool của account — unreserved, reserved và provisioned</title>
  <desc>Pool concurrency của account (mặc định 1000 cho mỗi region) chia thành hai phần: phần reserved cấp riêng và đảm bảo cho từng function (vừa là trần vừa là phần giữ riêng), và phần unreserved dùng chung cho mọi function khác. Provisioned concurrency là các instance pre-warmed nằm bên trong phần cấp cho một function.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">Account concurrency pool (mặc định 1000 / region)</text>
  <rect x="16" y="40" width="688" height="200" rx="12" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
  <g>
    <rect x="32" y="64" width="210" height="160" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="44" y="86" font-size="12" font-weight="700" fill="currentColor">RESERVED — Func A</text>
    <text x="44" y="104" font-size="10" fill="currentColor" opacity="0.7">Trần + đảm bảo riêng</text>
    <rect x="46" y="116" width="182" height="92" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="58" y="136" font-size="11" font-weight="700" fill="currentColor">PROVISIONED</text>
    <text x="58" y="153" font-size="10" fill="currentColor" opacity="0.72">instance pre-warmed</text>
    <text x="58" y="168" font-size="10" fill="currentColor" opacity="0.72">(giữ ấm, hết cold start)</text>
    <text x="58" y="190" font-size="9.5" fill="currentColor" opacity="0.55">nằm TRONG phần cấp</text>
    <text x="58" y="203" font-size="9.5" fill="currentColor" opacity="0.55">của function</text>
  </g>
  <g>
    <rect x="256" y="64" width="120" height="160" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="268" y="86" font-size="12" font-weight="700" fill="currentColor">RESERVED</text>
    <text x="268" y="104" font-size="11" font-weight="700" fill="currentColor">Func B</text>
    <text x="268" y="128" font-size="10" fill="currentColor" opacity="0.7">slice riêng,</text>
    <text x="268" y="143" font-size="10" fill="currentColor" opacity="0.7">capped</text>
  </g>
  <g>
    <rect x="390" y="64" width="298" height="160" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="404" y="86" font-size="12" font-weight="700" fill="currentColor">UNRESERVED — pool chung</text>
    <text x="404" y="106" font-size="10.5" fill="currentColor" opacity="0.72">Mọi function khác chia nhau phần còn lại</text>
    <text x="404" y="124" font-size="10.5" fill="currentColor" opacity="0.72">(1000 − tổng reserved)</text>
    <text x="404" y="150" font-size="10" fill="currentColor" opacity="0.55">Func C, D, E... tranh nhau ở đây</text>
    <text x="404" y="170" font-size="10" fill="currentColor" opacity="0.55">→ không function nào được đảm bảo</text>
    <text x="404" y="200" font-size="9.5" fill="currentColor" opacity="0.5">AWS giữ tối thiểu 100 cho unreserved</text>
  </g>
  <text x="16" y="266" font-size="11" fill="currentColor" opacity="0.78">Reserved = vừa trần (function không vượt) vừa đảm bảo (account giữ riêng) — miễn phí.</text>
  <text x="16" y="286" font-size="11" fill="currentColor" opacity="0.78">Provisioned = sub-set đã init sẵn của phần cấp, chống cold start — tốn tiền, gắn alias/version.</text>
</svg>

Điểm mấu chốt:

- **Reserved** vừa là *trần* (function không vượt được) vừa *đảm bảo* (account giữ riêng chừng đó cho nó). Đặt reserved = 0 → **vô hiệu hóa function** (kill switch).
- **Provisioned** giữ sẵn các execution environment đã init → request không phải chịu cold start. Kết hợp **Application Auto Scaling** theo lịch/utilization.
- Reserved **miễn phí**; Provisioned **tốn tiền** (trả cho thời gian giữ ấm).

```bash
# Reserved: giới hạn trần
aws lambda put-function-concurrency \
  --function-name my-func --reserved-concurrent-executions 50

# Provisioned: giữ ấm 10 instance trên 1 alias/version
aws lambda put-provisioned-concurrency-config \
  --function-name my-func --qualifier PROD \
  --provisioned-concurrent-executions 10
```

> ⚠️ Bẫy: Khi vượt concurrency limit → lỗi **throttling (HTTP 429 / `TooManyRequestsException`)**. Với invoke async/event source, Lambda tự retry; với sync, caller nhận lỗi.
> ⚠️ Bẫy: Provisioned concurrency phải gắn với **alias hoặc version cụ thể** (qualifier), KHÔNG dùng được với `$LATEST`.

## 7. Cold Start & Tuning

Cold start = thời gian khởi tạo execution environment mới: tải code, khởi tạo runtime, chạy code init ngoài handler.

Yếu tố làm cold start tệ hơn:

- Package/dependency lớn → dùng layers, tree-shaking, ưu tiên SDK v3 modular (Node).
- Runtime nặng (Java, .NET) cold start lâu hơn Node/Python/Go.
- Code init ngoài handler nặng (tạo nhiều client, tải file lớn).
- **Đặt function trong VPC** (xem mục 8 — trước đây là thủ phạm chính, nay đã cải thiện nhiều).

Cách giảm cold start:

- **Provisioned concurrency** cho workload latency-sensitive, traffic dự đoán được.
- Giảm kích thước package; chỉ import thứ cần dùng.
- Tăng memory (CPU init nhanh hơn).
- Với Java: bật **SnapStart** (snapshot execution environment đã init) → giảm cold start mạnh, miễn phí.

> 💡 Mẹo thi: "Giảm cold start, traffic ổn định, sẵn sàng trả tiền" → **Provisioned concurrency**. "Java cold start, không muốn tốn thêm tiền" → **SnapStart**. "Function lâu lâu mới gọi, không quan tâm latency" → để mặc định.

## 8. Lambda trong VPC

Mặc định Lambda chạy trong VPC do AWS quản lý, có internet access. Để truy cập **private resource** (RDS, ElastiCache, internal ALB), bạn cấu hình VPC config: subnet + security group.

```bash
aws lambda update-function-configuration \
  --function-name my-func \
  --vpc-config SubnetIds=subnet-aaa,subnet-bbb,SecurityGroupIds=sg-123
```

Cơ chế & bẫy quan trọng:

- Lambda tạo **Hyperplane ENI** trong subnet bạn chỉ định để vào VPC. ENI này **dùng chung** giữa các function/instance (kiến trúc Hyperplane) → không còn tốn nhiều thời gian tạo ENI mỗi cold start như trước.
- **Đặt Lambda trong VPC sẽ MẤT internet access mặc định.** Cần ra internet (gọi API public, S3 qua public endpoint...) → phải có **NAT Gateway** ở public subnet, hoặc dùng **VPC Endpoint** (Gateway endpoint cho S3/DynamoDB, Interface endpoint cho service khác).
- Phải dùng **private subnet** + route qua NAT. KHÔNG gán public IP cho Lambda ENI được.
- IAM cần quyền tạo/xóa ENI (`ec2:CreateNetworkInterface`, ...) — managed policy `AWSLambdaVPCAccessExecutionRole`.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Lambda trong VPC — đường mạng tới resource private và ra ngoài VPC</title>
  <desc>Lambda service kết nối qua Hyperplane ENI đặt trong private subnet. Từ đó tới thẳng RDS và ElastiCache trong VPC. Để gọi S3 hoặc DynamoDB dùng VPC Gateway Endpoint miễn phí. Để ra Internet công cộng phải qua NAT Gateway đặt ở public subnet rồi qua Internet Gateway.</desc>
  <defs>
    <marker id="vpcArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <text x="16" y="22" font-size="13.5" font-weight="700" fill="currentColor">Lambda trong VPC — định tuyến</text>
  <g>
    <rect x="16" y="40" width="120" height="58" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="76" y="66" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Lambda</text>
    <text x="76" y="84" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">service</text>
  </g>
  <rect x="172" y="32" width="532" height="266" rx="12" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="186" y="52" font-size="11.5" font-weight="700" fill="currentColor" opacity="0.85">VPC</text>
  <rect x="186" y="62" width="280" height="170" rx="10" fill="#8b5cf6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.22" stroke-dasharray="5 4"/>
  <text x="200" y="80" font-size="10.5" font-weight="700" fill="currentColor" opacity="0.8">Private subnet</text>
  <g>
    <rect x="200" y="92" width="120" height="50" rx="9" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="260" y="112" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Hyperplane</text>
    <text x="260" y="128" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">ENI</text>
  </g>
  <line x1="136" y1="69" x2="196" y2="105" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#vpcArr)"/>
  <g>
    <rect x="346" y="86" width="106" height="40" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="399" y="111" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">RDS</text>
    <rect x="346" y="134" width="106" height="40" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="399" y="159" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">ElastiCache</text>
  </g>
  <line x1="320" y1="111" x2="342" y2="106" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#vpcArr)"/>
  <line x1="320" y1="125" x2="342" y2="150" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#vpcArr)"/>
  <text x="324" y="98" font-size="9" fill="#10b981" opacity="0.95" font-weight="700">trực tiếp</text>
  <g>
    <rect x="200" y="158" width="120" height="62" rx="9" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="260" y="180" font-size="10" font-weight="700" text-anchor="middle" fill="currentColor">VPC Gateway</text>
    <text x="260" y="194" font-size="10" font-weight="700" text-anchor="middle" fill="currentColor">Endpoint</text>
    <text x="260" y="210" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.65">S3 / DynamoDB (free)</text>
  </g>
  <line x1="260" y1="142" x2="260" y2="154" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#vpcArr)"/>
  <g>
    <rect x="346" y="186" width="106" height="34" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="399" y="208" font-size="10" font-weight="700" text-anchor="middle" fill="currentColor">S3 / DynamoDB</text>
  </g>
  <line x1="320" y1="190" x2="342" y2="197" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#vpcArr)"/>
  <rect x="486" y="62" width="200" height="170" rx="10" fill="#f59e0b" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.22" stroke-dasharray="5 4"/>
  <text x="500" y="80" font-size="10.5" font-weight="700" fill="currentColor" opacity="0.8">Public subnet</text>
  <g>
    <rect x="500" y="92" width="170" height="48" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="585" y="113" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">NAT Gateway</text>
    <text x="585" y="130" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.65">cho API public ra ngoài</text>
  </g>
  <g>
    <rect x="500" y="152" width="170" height="44" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="585" y="178" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Internet Gateway</text>
  </g>
  <path d="M320 135 H336 V252 H496 V116" fill="none" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#vpcArr)"/>
  <text x="344" y="248" font-size="9" fill="#f59e0b" opacity="0.95" font-weight="700">ENI → ra Internet công cộng</text>
  <line x1="585" y1="140" x2="585" y2="148" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#vpcArr)"/>
  <text x="16" y="324" font-size="11" fill="currentColor" opacity="0.78">ENI → RDS/ElastiCache: đi thẳng trong VPC. → S3/DynamoDB: Gateway Endpoint (miễn phí).</text>
  <text x="16" y="344" font-size="11" fill="currentColor" opacity="0.78">→ Internet công cộng: bắt buộc NAT Gateway (public subnet) → IGW. Đặt Lambda vào VPC = mất internet mặc định.</text>
</svg>

> ⚠️ Bẫy kinh điển: "Lambda trong VPC gọi DynamoDB/S3 bị timeout" → không có route ra internet. Sửa: thêm **VPC Gateway Endpoint** cho S3/DynamoDB (miễn phí), hoặc NAT Gateway. Đề rất hay hỏi câu này.
> ⚠️ Bẫy: "Connection pool tới RDS cạn (too many connections)" khi concurrency cao → mỗi instance mở connection riêng. Giải pháp: **RDS Proxy** (pool connection), không phải tăng memory.

## 9. Triggers (Event Sources)

Hai cách Lambda được gọi:

**Push (synchronous/asynchronous)** — service gọi trực tiếp Lambda:

| Trigger | Kiểu invoke | Ghi chú |
|---------|-------------|---------|
| API Gateway / ALB | Sync | caller chờ response |
| S3 events | Async | retry tự động |
| SNS | Async | retry tự động |
| EventBridge | Async | scheduled / pattern |
| Cognito, Lex | Sync | |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Ba mô hình invoke Lambda — push sync, push async và poll</title>
  <desc>Ba luồng song song. Push-sync: caller gọi thẳng Lambda và chờ response. Push-async: caller bỏ event vào hàng đợi nội bộ của Lambda, Lambda chạy và tự retry, thất bại đi vào DLQ hoặc Destinations. Poll: event source mapping của Lambda chủ động poll SQS, Kinesis hoặc DynamoDB Streams rồi gọi function theo batch.</desc>
  <defs>
    <marker id="invArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <text x="16" y="22" font-size="13.5" font-weight="700" fill="currentColor">Ba mô hình invoke</text>
  <g>
    <text x="120" y="48" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">1 · PUSH — SYNC</text>
    <rect x="40" y="60" width="160" height="38" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="120" y="84" font-size="10.5" text-anchor="middle" fill="currentColor">Caller (API GW/ALB)</text>
    <line x1="120" y1="98" x2="120" y2="124" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#invArr)"/>
    <text x="128" y="116" font-size="9" fill="currentColor" opacity="0.7">gọi + CHỜ</text>
    <rect x="40" y="126" width="160" height="38" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="120" y="150" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Lambda</text>
    <line x1="120" y1="164" x2="120" y2="190" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#invArr)"/>
    <text x="120" y="208" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">response về caller</text>
    <text x="120" y="226" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.55">lỗi → caller tự xử lý</text>
  </g>
  <g>
    <text x="360" y="48" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">2 · PUSH — ASYNC</text>
    <rect x="280" y="60" width="160" height="34" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="82" font-size="10.5" text-anchor="middle" fill="currentColor">Caller (S3/SNS/EB)</text>
    <line x1="360" y1="94" x2="360" y2="114" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#invArr)"/>
    <rect x="280" y="116" width="160" height="34" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="138" font-size="10" text-anchor="middle" fill="currentColor">Lambda internal queue</text>
    <line x1="360" y1="150" x2="360" y2="170" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#invArr)"/>
    <rect x="280" y="172" width="160" height="38" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="190" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Lambda</text>
    <text x="360" y="204" font-size="8.5" text-anchor="middle" fill="currentColor" opacity="0.6">retry 2 lần</text>
    <line x1="360" y1="210" x2="360" y2="232" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#invArr)"/>
    <rect x="280" y="234" width="160" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="256" font-size="10" text-anchor="middle" fill="currentColor">DLQ / Destinations</text>
  </g>
  <g>
    <text x="600" y="48" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">3 · POLL</text>
    <rect x="520" y="60" width="160" height="38" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="600" y="78" font-size="10" text-anchor="middle" fill="currentColor">SQS / Kinesis /</text>
    <text x="600" y="91" font-size="10" text-anchor="middle" fill="currentColor">DDB Streams</text>
    <path d="M600 126 V102" fill="none" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#invArr)"/>
    <text x="612" y="116" font-size="9" fill="currentColor" opacity="0.7">poll</text>
    <rect x="520" y="128" width="160" height="42" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="600" y="146" font-size="10" font-weight="700" text-anchor="middle" fill="currentColor">Event Source Mapping</text>
    <text x="600" y="161" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.65">(Lambda chủ động poll)</text>
    <line x1="600" y1="170" x2="600" y2="190" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#invArr)"/>
    <rect x="520" y="192" width="160" height="38" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="600" y="211" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Lambda</text>
    <text x="600" y="224" font-size="8.5" text-anchor="middle" fill="currentColor" opacity="0.6">invoke theo batch</text>
  </g>
</svg>

**Poll (Event Source Mapping)** — Lambda service tự *poll* nguồn rồi gọi function:

| Nguồn | Đặc điểm |
|-------|----------|
| SQS | Lambda poll queue, xóa message khi xử lý xong |
| Kinesis Data Streams | poll theo shard, giữ thứ tự trong shard |
| DynamoDB Streams | tương tự Kinesis |
| Kafka / MSK | poll partition |

```bash
aws lambda create-event-source-mapping \
  --function-name my-func \
  --event-source-arn arn:aws:sqs:...:my-queue \
  --batch-size 10
```

> 💡 Mẹo thi: Phân biệt **sync / async / poll** quyết định cách xử lý lỗi & retry. Sync → caller tự xử lý lỗi. Async → có retry + DLQ/Destinations. Poll (stream) → batch, retry cả batch, có thể chặn shard nếu xử lý lỗi (poison pill).

## 10. Error Handling: DLQ vs Destinations

Với **async invocation**, Lambda tự retry **2 lần** (tổng 3 lần) nếu function lỗi. Sau đó event bị bỏ — trừ khi bạn cấu hình điểm đến cho event thất bại.

**Dead Letter Queue (DLQ)** — cách cũ:

- Cấu hình SQS queue hoặc SNS topic nhận event **thất bại** (sau khi hết retry).
- Chỉ bắt được **failure**, không có context kết quả thành công.

```bash
aws lambda update-function-configuration \
  --function-name my-func \
  --dead-letter-config TargetArn=arn:aws:sqs:...:my-dlq
```

**Lambda Destinations** — cách mới, mạnh hơn:

- Định tuyến theo **cả thành công (onSuccess) và thất bại (onFailure)**.
- Target đa dạng: **SQS, SNS, EventBridge, Lambda khác**.
- Kèm thêm context (request/response payload, lý do lỗi) → dễ debug.

| Tiêu chí | DLQ | Destinations |
|----------|-----|--------------|
| Bắt failure | Có | Có (onFailure) |
| Bắt success | Không | Có (onSuccess) |
| Target | SQS, SNS | SQS, SNS, EventBridge, Lambda |
| Context payload | Ít | Đầy đủ |
| Khuyến nghị | Legacy | **Ưu tiên dùng** |

```bash
aws lambda put-function-event-invoke-config \
  --function-name my-func \
  --maximum-retry-attempts 1 \
  --destination-config '{
    "OnSuccess":{"Destination":"arn:aws:sqs:...:ok-queue"},
    "OnFailure":{"Destination":"arn:aws:sns:...:fail-topic"}
  }'
```

> 💡 Mẹo thi: AWS khuyến nghị **Destinations** thay cho DLQ cho async. Nhưng với **event source mapping kiểu SQS/Kinesis/DynamoDB**, bạn dùng **DLQ trên chính source** (redrive policy của SQS, hoặc `OnFailure` destination của ESM cho stream) — không phải Destinations của function.
> ⚠️ Bẫy: DLQ/Destinations chỉ áp dụng cho **async**. Lỗi ở **sync invoke** trả thẳng về caller, không vào DLQ.

## 11. Versions & Aliases

- **Version**: snapshot bất biến của code + config. `$LATEST` là bản đang sửa được; publish tạo version đánh số (1, 2, ...) bất biến.
- **Alias**: con trỏ tới một version (vd `PROD → v3`). Client gọi alias, bạn đổi version mà không sửa client.
- Alias hỗ trợ **weighted routing** → canary/blue-green deployment.

```bash
aws lambda publish-version --function-name my-func
aws lambda create-alias --function-name my-func \
  --name PROD --function-version 3

# Canary: 10% traffic sang version 4
aws lambda update-alias --function-name my-func --name PROD \
  --function-version 3 \
  --routing-config AdditionalVersionWeights={"4"=0.1}
```

> 💡 Mẹo thi: Provisioned concurrency và env var có thể khác nhau giữa các version. Trigger/permission gắn theo **qualifier** (alias/version). Canary deployment dùng **alias weighted routing** (hoặc CodeDeploy quản lý cho gọn).

## Tổng kết các bẫy hay gặp

- Tăng CPU = **tăng memory**, không cấu hình CPU riêng.
- `/tmp` ephemeral, cục bộ, **không** chia sẻ giữa instance; cần > 512MB thì tăng `ephemeral-storage` chứ không phải memory.
- **Reserved** = trần + cô lập (free); **Provisioned** = giữ ấm, chống cold start (tốn tiền, cần qualifier).
- Lambda trong VPC **mất internet** → cần NAT/VPC Endpoint; lỗi gọi S3/DynamoDB thường do thiếu Gateway Endpoint.
- Secret → **Secrets Manager/SSM**, không phải env var trần.
- DLQ/Destinations chỉ cho **async**; sync lỗi trả về caller.
- Provisioned concurrency & alias không dùng với `$LATEST`.
- Cold start Java → **SnapStart** (free) trước khi nghĩ tới provisioned.
