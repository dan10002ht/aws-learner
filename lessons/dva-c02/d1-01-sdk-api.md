# SDK, CLI & API Calls

Phần này là nền tảng của Domain 1: mọi tương tác với AWS từ code đều đi qua SDK hoặc CLI, và cả hai đều gọi xuống **AWS service API** (HTTPS, ký request bằng SigV4). Hiểu rõ credential chain, retry, pagination và idempotency giúp bạn viết code production-grade và tránh các bẫy rất hay xuất hiện trong đề DVA-C02.

## SDK vs CLI vs raw API

| | AWS SDK (Boto3/JS/Java/Go...) | AWS CLI | Raw API (HTTP) |
|---|---|---|---|
| Dùng khi | Viết app/Lambda | Script, thao tác nhanh, CI/CD | Hầu như không bao giờ |
| Ngôn ngữ | Theo ngôn ngữ app | Shell | Bất kỳ |
| SigV4 signing | Tự động | Tự động | Bạn tự ký (cực phức tạp) |
| Retry/pagination | Có sẵn (cấu hình được) | Có sẵn | Tự code |

> 💡 Mẹo thi: AWS CLI thực chất là một ứng dụng Python xây trên Botocore (cùng nền với Boto3). Nên CLI và Boto3 chia sẻ cùng credential chain và cùng file `~/.aws/config`, `~/.aws/credentials`.

## Credential Provider Chain

Đây là phần **bị hỏi nhiều nhất**. SDK tìm credentials theo **thứ tự ưu tiên**, dừng ngay khi tìm thấy:

1. **Credentials truyền trực tiếp trong code** (hard-code khi tạo client) — ưu tiên cao nhất.
2. **Environment variables**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`.
3. **Shared credentials file**: `~/.aws/credentials` (chọn profile qua `AWS_PROFILE`).
4. **Shared config file**: `~/.aws/config`.
5. **Container credentials** (ECS task role qua endpoint `169.254.170.2`).
6. **Instance Profile / IMDS** (EC2 instance role qua `169.254.169.254`).

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 430" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Credential Provider Chain — SDK dò từng nguồn từ trên xuống, dừng ở nguồn đầu tiên tìm thấy</title>
  <desc>SDK thử lần lượt sáu nguồn credentials theo thứ tự ưu tiên từ trên xuống: credentials trong code, environment variables, file credentials, file config, ECS container credentials, EC2 IMDS. Dừng ngay khi một nguồn có credentials. Environment variables đứng trước nên thắng file và IMDS.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">Credential Provider Chain — dừng ở nguồn ĐẦU TIÊN tìm thấy</text>
  <defs>
    <marker id="ccArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
  <g>
    <rect x="40" y="40" width="430" height="44" rx="9" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
    <rect x="50" y="52" width="24" height="24" rx="7" fill="#10b981" fill-opacity="0.95"/>
    <text x="62" y="69" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">1</text>
    <text x="86" y="60" font-size="12.5" font-weight="700" fill="currentColor">Credentials hard-code trong code</text>
    <text x="86" y="76" font-size="10.5" fill="currentColor" opacity="0.65">truyền key khi tạo client — ưu tiên cao nhất</text>
  </g>
  <line x1="255" y1="84" x2="255" y2="100" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#ccArr)"/>
  <g>
    <rect x="40" y="100" width="430" height="44" rx="9" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
    <rect x="50" y="112" width="24" height="24" rx="7" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="62" y="129" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">2</text>
    <text x="86" y="120" font-size="12.5" font-weight="700" fill="currentColor">Environment variables</text>
    <text x="86" y="136" font-size="10.5" fill="currentColor" opacity="0.65">AWS_ACCESS_KEY_ID · AWS_SECRET_ACCESS_KEY · AWS_SESSION_TOKEN</text>
  </g>
  <line x1="255" y1="144" x2="255" y2="160" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#ccArr)"/>
  <g>
    <rect x="40" y="160" width="430" height="40" rx="9" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
    <rect x="50" y="170" width="24" height="24" rx="7" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="62" y="187" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">3</text>
    <text x="86" y="178" font-size="12.5" font-weight="700" fill="currentColor">Shared credentials file</text>
    <text x="86" y="193" font-size="10.5" fill="currentColor" opacity="0.65">~/.aws/credentials (chọn profile qua AWS_PROFILE)</text>
  </g>
  <line x1="255" y1="200" x2="255" y2="214" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#ccArr)"/>
  <g>
    <rect x="40" y="214" width="430" height="40" rx="9" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
    <rect x="50" y="224" width="24" height="24" rx="7" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="62" y="241" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">4</text>
    <text x="86" y="232" font-size="12.5" font-weight="700" fill="currentColor">Shared config file</text>
    <text x="86" y="247" font-size="10.5" fill="currentColor" opacity="0.65">~/.aws/config</text>
  </g>
  <line x1="255" y1="254" x2="255" y2="268" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#ccArr)"/>
  <g>
    <rect x="40" y="268" width="430" height="40" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <rect x="50" y="278" width="24" height="24" rx="7" fill="#f59e0b" fill-opacity="0.95"/>
    <text x="62" y="295" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">5</text>
    <text x="86" y="286" font-size="12.5" font-weight="700" fill="currentColor">Container credentials (ECS task role)</text>
    <text x="86" y="301" font-size="10.5" fill="currentColor" opacity="0.65">endpoint 169.254.170.2</text>
  </g>
  <line x1="255" y1="308" x2="255" y2="322" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#ccArr)"/>
  <g>
    <rect x="40" y="322" width="430" height="40" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <rect x="50" y="332" width="24" height="24" rx="7" fill="#f59e0b" fill-opacity="0.95"/>
    <text x="62" y="349" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">6</text>
    <text x="86" y="340" font-size="12.5" font-weight="700" fill="currentColor">Instance Profile / IMDS (EC2 instance role)</text>
    <text x="86" y="355" font-size="10.5" fill="currentColor" opacity="0.65">endpoint 169.254.169.254 — ưu tiên thấp nhất</text>
  </g>
  <g>
    <rect x="496" y="100" width="200" height="44" rx="9" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="596" y="119" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Env vars THẮNG</text>
    <text x="596" y="135" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">đứng trước file (3,4) và IMDS (6)</text>
  </g>
  <path d="M596 144 V 280 H 478" fill="none" stroke="#8b5cf6" stroke-opacity="0.6" stroke-dasharray="5 3" marker-end="url(#ccArr)"/>
  <text x="255" y="392" font-size="11" text-anchor="middle" fill="#10b981" opacity="0.95" font-weight="700">Tìm thấy ở nguồn nào → DỪNG, dùng luôn, bỏ qua phần còn lại</text>
  <text x="255" y="412" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">Best practice trên AWS: bỏ trống 1–4, để SDK lấy role qua 5/6 (ECS task role · EC2 instance profile)</text>
</svg>

> ⚠️ Bẫy: Thứ tự chính xác giữa **env vars** và **credentials file** — env vars **luôn thắng** credentials file. Đề hay hỏi "EC2 có instance role nhưng vẫn dùng access key trong env var → nó dùng cái nào?" → **env var** (đứng trước IMDS trong chain).

> 💡 Mẹo thi: Best practice cho code chạy trên AWS (EC2/ECS/Lambda) là **KHÔNG hard-code key**, mà dùng **IAM role**. Lambda dùng execution role; ECS dùng task role; EC2 dùng instance profile. Nếu thấy đáp án "embed access key in code/env" → gần như luôn SAI.

Khởi tạo client tận dụng chain (không truyền key):

```python
import boto3
# Không truyền key -> SDK tự dò chain
s3 = boto3.client("s3", region_name="ap-southeast-1")
```

Chỉ định profile khi local:

```bash
export AWS_PROFILE=dev
aws sts get-caller-identity   # kiểm tra đang dùng identity nào
```

## SDK Config: Region & Endpoint

Region được giải quyết theo thứ tự: tham số khi tạo client → `AWS_REGION` (Lambda) / `AWS_DEFAULT_REGION` → `region` trong `~/.aws/config`.

```python
import boto3
from botocore.config import Config

cfg = Config(
    region_name="ap-southeast-1",
    retries={"max_attempts": 5, "mode": "adaptive"},
    connect_timeout=5,
    read_timeout=30,
)
ddb = boto3.client("dynamodb", config=cfg)
```

Custom endpoint hữu ích khi test với LocalStack hoặc gọi VPC endpoint:

```python
s3 = boto3.client("s3", endpoint_url="http://localhost:4566")
```

> ⚠️ Bẫy: `AWS_REGION` vs `AWS_DEFAULT_REGION`. Trong **Lambda**, runtime tự set `AWS_REGION`. Boto3 đọc cả hai, nhưng nhiều SDK khác ưu tiên `AWS_REGION`. Nếu quên set region và config cũng trống → SDK ném lỗi `NoRegionError`.

## Authenticated API Calls & SigV4

Mọi request đều được ký bằng **Signature Version 4**. Bạn gần như không bao giờ tự ký — SDK/CLI làm tự động. Chỉ tự ký trong vài tình huống (vd: gọi API Gateway có IAM auth từ một client không phải SDK), khi đó dùng thư viện ký như `aws-sigv4`.

Thành phần một signed request: access key + secret + region + service name + timestamp → hash. **Secret key không bao giờ được gửi qua mạng** — chỉ dùng để tính chữ ký.

> 💡 Mẹo thi: Nếu request bị lỗi `SignatureDoesNotMatch` → thường do **clock skew** (đồng hồ máy lệch) hoặc sai region/secret. Lỗi này KHÁC với `AccessDenied` (là vấn đề IAM policy, không phải chữ ký).

## Pagination

API AWS giới hạn số kết quả mỗi response (vd S3 `ListObjectsV2` tối đa 1000 keys). Phần dư trả về qua **continuation token**. Nếu không xử lý phân trang → bạn **mất dữ liệu** mà không hề báo lỗi.

Cách thủ công (dễ sai):

```python
token = None
keys = []
while True:
    kwargs = {"Bucket": "my-bucket"}
    if token:
        kwargs["ContinuationToken"] = token
    resp = s3.list_objects_v2(**kwargs)
    keys += [o["Key"] for o in resp.get("Contents", [])]
    if not resp.get("IsTruncated"):
        break
    token = resp["NextContinuationToken"]
```

Cách khuyến nghị — **Paginator** (Boto3 tự lo token):

```python
paginator = s3.get_paginator("list_objects_v2")
for page in paginator.paginate(Bucket="my-bucket"):
    for obj in page.get("Contents", []):
        print(obj["Key"])
```

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Vòng lặp pagination — gửi request, nhận page, nếu còn token thì lặp lại đến khi hết</title>
  <desc>Chu trình phân trang: gửi request đến API, nhận response gồm Items và token tiếp theo, kiểm tra có token hay không. Nếu CÓ token thì nạp lại làm ExclusiveStartKey hoặc ContinuationToken cho request kế tiếp và lặp lại. Nếu KHÔNG còn token thì kết thúc.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">Vòng lặp pagination — lặp đến khi response KHÔNG còn token</text>
  <defs>
    <marker id="pgArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <g>
    <rect x="44" y="58" width="180" height="58" rx="10" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="134" y="83" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Gửi REQUEST</text>
    <text x="134" y="101" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">list_objects_v2 / Scan ...</text>
  </g>
  <line x1="224" y1="87" x2="296" y2="87" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#pgArr)"/>
  <g>
    <rect x="296" y="58" width="200" height="58" rx="10" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="396" y="83" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Nhận RESPONSE</text>
    <text x="396" y="101" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">Items[] + token tiếp theo</text>
  </g>
  <line x1="396" y1="116" x2="396" y2="150" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#pgArr)"/>
  <g>
    <path d="M396 152 L486 192 L396 232 L306 192 Z" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="396" y="188" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Còn token?</text>
    <text x="396" y="204" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">IsTruncated / LastEvaluatedKey</text>
  </g>
  <line x1="306" y1="192" x2="134" y2="192" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#pgArr)"/>
  <text x="220" y="184" font-size="11" text-anchor="middle" fill="#f59e0b" font-weight="700">CÓ</text>
  <text x="220" y="222" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">nạp token làm ExclusiveStartKey /</text>
  <text x="220" y="236" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">ContinuationToken cho request kế</text>
  <path d="M134 192 V 116" fill="none" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#pgArr)"/>
  <line x1="486" y1="192" x2="566" y2="192" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#pgArr)"/>
  <text x="528" y="184" font-size="11" text-anchor="middle" fill="#10b981" font-weight="700">KHÔNG</text>
  <g>
    <rect x="566" y="166" width="138" height="52" rx="10" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="635" y="190" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">HẾT — dừng</text>
    <text x="635" y="207" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">đã lấy đủ dữ liệu</text>
  </g>
  <text x="360" y="296" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">Paginator của Boto3 tự thực hiện đúng vòng lặp này — bạn chỉ cần for-loop qua các page.</text>
</svg>

Tên token theo từng API (đây là bẫy hay gặp):

| API | Field trong response | Field trong request kế tiếp |
|---|---|---|
| S3 `ListObjectsV2` | `NextContinuationToken` | `ContinuationToken` |
| DynamoDB `Scan`/`Query` | `LastEvaluatedKey` | `ExclusiveStartKey` |
| EC2 `DescribeInstances` | `NextToken` | `NextToken` |
| Generic (nhiều API) | `NextToken` | `NextToken` |

> ⚠️ Bẫy: Với DynamoDB, **không có** `NextToken`. Token là `LastEvaluatedKey`; nếu nó **vắng mặt** trong response nghĩa là đã hết dữ liệu. Đừng nhầm với việc `Items` rỗng — một page có thể rỗng nhưng vẫn còn `LastEvaluatedKey` (do filter/limit), bạn vẫn phải tiếp tục.

CLI tự phân trang, nhưng có thể điều khiển:

```bash
aws s3api list-objects-v2 --bucket my-bucket --page-size 1000 --max-items 5000
```

## Retries, Throttling & Exponential Backoff

AWS API có **rate limit**. Khi vượt, bạn nhận lỗi throttling. SDK đã tích hợp retry tự động cho các lỗi này, nhưng bạn cần hiểu để cấu hình và xử lý đúng.

### Các retry mode của Boto3

| Mode | Hành vi |
|---|---|
| `legacy` | Mặc định cũ, retry cơ bản (thường 3 lần) cho một số lỗi |
| `standard` | Retry nhiều loại lỗi hơn (throttling, timeout, 5xx), mặc định `max_attempts=3` |
| `adaptive` | Như standard + **client-side rate limiting** (tự bóp tốc độ khi bị throttle nhiều) |

```python
from botocore.config import Config
cfg = Config(retries={"max_attempts": 10, "mode": "standard"})
```

> ⚠️ Bẫy: trong dict `Config(retries={"max_attempts": N})`, `max_attempts` là số lần **retry thêm** (CHƯA gồm lần gọi đầu) → tổng = N + 1 lần gọi. Ngược lại, `total_max_attempts` và biến môi trường `AWS_MAX_ATTEMPTS` (hay `max_attempts` trong `~/.aws/config` của CLI) **tính cả lần gọi đầu**. Đề rất thích xoáy điểm khác biệt này.

### Exponential backoff + jitter

Khi tự code retry (vd ngôn ngữ không có sẵn, hoặc logic nghiệp vụ), pattern chuẩn là **tăng thời gian chờ theo cấp số nhân** cộng **jitter** (nhiễu ngẫu nhiên) để tránh tất cả client retry cùng lúc (thundering herd):

```python
import random, time

def call_with_backoff(fn, max_attempts=6, base=0.1, cap=20.0):
    for attempt in range(max_attempts):
        try:
            return fn()
        except ThrottlingError:
            if attempt == max_attempts - 1:
                raise
            # exponential + full jitter
            sleep = random.uniform(0, min(cap, base * 2 ** attempt))
            time.sleep(sleep)
```

> ⚠️ Bẫy: Câu hỏi "Ứng dụng nhận `ProvisionedThroughputExceededException` / `ThrottlingException` / `RequestLimitExceeded` thì làm gì?" → đáp án đúng gần như luôn là **retry với exponential backoff (and jitter)**. KHÔNG phải "tăng ngay capacity", không phải "bỏ qua lỗi". Jitter là điểm phân biệt đáp án "đúng nhất".

Một số mã lỗi throttling cần nhớ:

| Error code | Service tiêu biểu |
|---|---|
| `ThrottlingException` | Nhiều service (API Gateway, KMS...) |
| `ProvisionedThroughputExceededException` | DynamoDB |
| `RequestLimitExceeded` | EC2 |
| `TooManyRequestsException` | Lambda (invoke) |
| `503 SlowDown` | S3 |

## Error Handling

Phân biệt **retryable** và **non-retryable**:

- **Retryable**: throttling (4xx đặc thù), `5xx` server error, timeout → SDK tự retry.
- **Non-retryable**: `4xx` do client (AccessDenied, ValidationException, ResourceNotFound) → retry vô ích, phải sửa code/quyền.

```python
from botocore.exceptions import ClientError

try:
    ddb.put_item(TableName="t", Item=item)
except ClientError as e:
    code = e.response["Error"]["Code"]
    if code == "ProvisionedThroughputExceededException":
        # để SDK retry, hoặc backoff thủ công
        ...
    elif code == "ConditionalCheckFailedException":
        # lỗi nghiệp vụ, KHÔNG retry
        ...
    else:
        raise
```

> 💡 Mẹo thi: Trong Boto3, mọi lỗi từ service đều là `ClientError`; phân loại qua `e.response["Error"]["Code"]`. HTTP status nằm ở `e.response["ResponseMetadata"]["HTTPStatusCode"]`.

## Idempotency

Khi retry, cùng một request có thể chạy **nhiều lần** → nguy cơ tạo trùng tài nguyên (tạo 2 instance, trừ tiền 2 lần). **Idempotency** đảm bảo gọi lặp cho cùng kết quả như gọi một lần.

Nhiều API hỗ trợ **client token / idempotency token**:

```python
import uuid
token = str(uuid.uuid4())   # giữ cố định khi retry CÙNG một thao tác

ec2.run_instances(
    ImageId="ami-123", MinCount=1, MaxCount=1,
    InstanceType="t3.micro",
    ClientToken=token,   # gọi lại với cùng token -> không tạo thêm instance
)
```

Với DynamoDB, dùng **conditional write** để đảm bảo idempotent:

```python
ddb.put_item(
    TableName="orders",
    Item={"orderId": {"S": "o-1"}, "status": {"S": "NEW"}},
    ConditionExpression="attribute_not_exists(orderId)",
)
```

> 💡 Mẹo thi: Các service thường gặp với client/idempotency token: **EC2 `RunInstances`** (`ClientToken`), **SQS** (deduplication ID cho FIFO queue), **Step Functions** `StartExecution` (name làm idempotency key), **Lambda** (gọi async tự dedupe trong cửa sổ thời gian). Khi đề nói "đảm bảo không xử lý trùng khi client retry" → nghĩ tới **idempotency token / deduplication ID / conditional write**.

## Tóm tắt nhanh các bẫy đề

| Chủ đề | Bẫy / điểm dễ sai |
|---|---|
| Credential chain | Env vars **thắng** credentials file và IMDS; nên dùng **IAM role** thay vì key trên AWS |
| Region | Lambda set `AWS_REGION`; thiếu region → `NoRegionError` |
| Pagination | DynamoDB dùng `LastEvaluatedKey`/`ExclusiveStartKey`, không phải `NextToken`; page rỗng vẫn có thể còn data |
| Throttling | Luôn chọn **exponential backoff + jitter**, không tăng capacity ngay |
| `retries["max_attempts"]` (boto3 Config) | Số lần retry thêm — tổng lần gọi = N + 1; chỉ `total_max_attempts`/`AWS_MAX_ATTEMPTS` mới gồm lần đầu |
| Idempotency | `ClientToken` (EC2), dedup ID (SQS FIFO), conditional write (DynamoDB) |
| Lỗi | `SignatureDoesNotMatch` = clock skew/region; khác với `AccessDenied` = IAM |

Nắm chắc credential chain order, cơ chế retry mặc định của SDK, và cách xử lý pagination token theo từng service — đây là ba nhóm câu hỏi xuất hiện đều đặn trong Domain 1 của DVA-C02.
