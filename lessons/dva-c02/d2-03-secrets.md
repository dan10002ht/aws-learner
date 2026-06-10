# Secrets & Sensitive Data

Trong domain Security của DVA-C02, đây là nhóm câu hỏi "ăn điểm" nếu bạn nắm chắc ranh giới giữa **Secrets Manager** và **SSM Parameter Store**, biết khi nào mã hóa env var của Lambda, và hiểu cách phân loại/che giấu dữ liệu nhạy cảm. Bài này đi thẳng vào quyết định "khi nào dùng cái gì" cùng code thực chiến.

## Bức tranh tổng quan: đừng nhét secret vào code

Quy tắc số 1 của developer: **không bao giờ hardcode** password, API key, connection string vào source code, biến môi trường plaintext, hay file config commit lên Git.

AWS cho bạn 2 dịch vụ chính để lưu cấu hình & bí mật:

| | Secrets Manager | SSM Parameter Store |
|---|---|---|
| Mục đích chính | Lưu **secret** (DB password, API key) | Lưu **config + secret** |
| Auto rotation native | ✅ Có (qua Lambda) | ❌ Không |
| RDS/Redshift/DocumentDB integration | ✅ Tích hợp sẵn rotation | ❌ Không |
| Mã hóa | Luôn mã hóa (KMS) | SecureString mới mã hóa |
| Cross-account | ✅ Resource policy | ⚠️ Phải qua Advanced/RAM |
| Giá | ~$0.40/secret/tháng + $0.05/10k API call | **Standard tier MIỄN PHÍ** |
| Kích thước value | tới 64 KB | Standard 4 KB / Advanced 8 KB |
| Versioning | ✅ Có (staging labels) | ✅ Có (version number) |
| Hierarchy (path `/app/dev/db`) | Hạn chế | ✅ Mạnh, query theo path |

> 💡 Mẹo thi: Câu hỏi nào nhắc tới **"automatic rotation"** + database → đáp án gần như chắc chắn là **Secrets Manager**. Câu hỏi nhắc **"lowest cost / no rotation needed / store config"** → **Parameter Store (Standard tier)**.

---

## AWS Secrets Manager

### Đặc điểm cốt lõi

- Mọi secret **luôn được mã hóa bằng KMS** (mặc định dùng key `aws/secretsmanager`, hoặc CMK của bạn).
- Hỗ trợ **automatic rotation** thông qua một Lambda function do AWS cung cấp template (cho RDS) hoặc bạn tự viết.
- Lưu secret dạng key/value JSON, ví dụ DB credentials gồm `username`, `password`, `host`, `port`.

### Tạo & đọc secret (CLI)

```bash
# Tạo secret
aws secretsmanager create-secret \
  --name prod/myapp/db \
  --secret-string '{"username":"admin","password":"S3cr3t!","host":"db.internal","port":5432}'

# Đọc secret
aws secretsmanager get-secret-value --secret-id prod/myapp/db \
  --query SecretString --output text
```

### Đọc trong code (Python SDK)

```python
import boto3, json

client = boto3.client("secretsmanager")

def get_db_creds():
    resp = client.get_secret_value(SecretId="prod/myapp/db")
    return json.loads(resp["SecretString"])

creds = get_db_creds()
conn = connect(user=creds["username"], password=creds["password"])
```

> 💡 Mẹo thi: Lambda gọi `GetSecretValue` mỗi lần invoke sẽ tốn API cost + tăng latency. Hãy **cache secret bên ngoài handler** (global scope) để tái dùng qua warm invocation:

```python
import boto3, json

_client = boto3.client("secretsmanager")
_cache = None  # nằm ngoài handler -> giữ qua warm start

def handler(event, context):
    global _cache
    if _cache is None:
        _cache = json.loads(
            _client.get_secret_value(SecretId="prod/myapp/db")["SecretString"]
        )
    # dùng _cache...
```

> 💡 AWS còn có **Secrets Manager Lambda Extension** (layer) cung cấp HTTP endpoint localhost cache sẵn — giảm số lần gọi API rõ rệt.

### Automatic Rotation

Rotation là điểm nhấn lớn nhất khiến Secrets Manager "đáng tiền".

Cơ chế: một Lambda rotation function chạy qua 4 bước (steps):

| Step | Việc làm |
|---|---|
| `createSecret` | Tạo password mới, gắn staging label `AWSPENDING` |
| `setSecret` | Cập nhật credential mới vào database |
| `testSecret` | Kết nối thử bằng credential mới |
| `finishSecret` | Chuyển label `AWSCURRENT` sang version mới |

```bash
aws secretsmanager rotate-secret \
  --secret-id prod/myapp/db \
  --rotation-lambda-arn arn:aws:lambda:...:function:SecretsRotation \
  --rotation-rules '{"AutomaticallyAfterDays":30}'
```

- Với **RDS, Aurora, Redshift, DocumentDB**: AWS cung cấp sẵn rotation Lambda template → bật rotation chỉ vài click.
- Với DB khác / API key tự quản: bạn tự viết Lambda theo 4 step trên.

> ⚠️ Bẫy: Đề có thể "gài" rằng Parameter Store cũng rotate được. **Parameter Store KHÔNG có rotation native.** Muốn rotate trong Parameter Store bạn phải **tự build** bằng EventBridge + Lambda. Nếu câu hỏi yêu cầu "managed/built-in rotation" → loại Parameter Store.

### Versioning với staging labels

Secrets Manager dùng **staging label** thay vì số version:

- `AWSCURRENT`: version đang dùng (mặc định khi `GetSecretValue` không chỉ định).
- `AWSPENDING`: version đang trong quá trình rotate.
- `AWSPREVIOUS`: version cũ trước đó (rollback nhanh).

```bash
# Lấy version cũ để rollback
aws secretsmanager get-secret-value \
  --secret-id prod/myapp/db --version-stage AWSPREVIOUS
```

### Cross-account access

Secret nằm ở account A, ứng dụng ở account B muốn đọc:

1. Gắn **resource-based policy** lên secret (account A) cho phép principal của account B.
2. KMS key dùng để mã hóa cũng phải cho phép account B `Decrypt`.
3. Role ở account B có permission `secretsmanager:GetSecretValue`.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::222222222222:role/app-role" },
    "Action": "secretsmanager:GetSecretValue",
    "Resource": "*"
  }]
}
```

> ⚠️ Bẫy: Quên cấp quyền `Decrypt` trên **KMS key** là lỗi cross-account hay gặp. Resource policy của secret thôi là **chưa đủ** nếu dùng customer-managed key.

---

## SSM Parameter Store

### Ba loại parameter

| Type | Mã hóa | Dùng cho |
|---|---|---|
| `String` | Không | Config thường (region, feature flag) |
| `StringList` | Không | Danh sách phân tách dấu phẩy (`a,b,c`) |
| `SecureString` | ✅ KMS | Secret (password, token) |

```bash
# String thường
aws ssm put-parameter --name /myapp/prod/region \
  --type String --value "ap-southeast-1"

# SecureString (mã hóa KMS)
aws ssm put-parameter --name /myapp/prod/db-password \
  --type SecureString --value "S3cr3t!" \
  --key-id alias/myapp-key

# Đọc & tự giải mã
aws ssm get-parameter --name /myapp/prod/db-password \
  --with-decryption --query Parameter.Value --output text
```

> ⚠️ Bẫy kinh điển: Đọc `SecureString` mà **quên `--with-decryption`** → trả về **ciphertext** (chuỗi mã hóa), không phải plaintext. SDK tương ứng là `WithDecryption=True`.

### Hierarchy & query theo path

Parameter Store mạnh ở tổ chức theo cây path, lấy cả nhóm trong 1 call:

```bash
aws ssm get-parameters-by-path \
  --path /myapp/prod/ \
  --recursive \
  --with-decryption
```

Rất hợp pattern config nhiều môi trường: `/myapp/dev/...`, `/myapp/staging/...`, `/myapp/prod/...`.

### Standard vs Advanced tier

| | Standard | Advanced |
|---|---|---|
| Giá | **Miễn phí** | $0.05/param/tháng |
| Value size | 4 KB | 8 KB |
| Số parameter | 10.000 | 100.000 |
| Parameter policies (TTL, expiration) | ❌ | ✅ |

> 💡 Mẹo thi: "Cần lưu hàng ngàn config value, chi phí thấp nhất, không cần rotation" → **Parameter Store Standard**. Đừng chọn Secrets Manager chỉ vì có chữ "secret".

### Tích hợp với Secrets Manager

Parameter Store có thể **tham chiếu** secret của Secrets Manager qua prefix đặc biệt:

```bash
aws ssm get-parameter \
  --name /aws/reference/secretsmanager/prod/myapp/db \
  --with-decryption
```

Hữu ích khi code/app của bạn chuẩn hóa đọc qua Parameter Store API nhưng vẫn muốn rotation của Secrets Manager.

---

## Quyết định: Secrets Manager hay Parameter Store?

```
Cần automatic rotation (DB password, key xoay vòng)?
  └─ Có  -> Secrets Manager
  └─ Không
       └─ Là secret nhạy cảm nhưng ít đổi, tối ưu chi phí?
            └─ Parameter Store SecureString (free)
       └─ Chỉ là config thường (region, flag)?
            └─ Parameter Store String
```

Tóm tắt nhanh:

- **Rotation / RDS integration / cross-account managed** → Secrets Manager.
- **Chi phí thấp / config + secret đơn giản / hierarchy** → Parameter Store.
- Có thể **kết hợp cả hai**: config trong Parameter Store, password DB trong Secrets Manager.

---

## Mã hóa Lambda Environment Variables

Lambda env var **mặc định đã được mã hóa at-rest bằng KMS** (key `aws/lambda`). Nhưng có 2 mức độ cần phân biệt:

| Tình huống | Cơ chế |
|---|---|
| Bảo vệ at-rest cơ bản | Mặc định, AWS-managed key — không cần làm gì |
| Cần CMK riêng / kiểm soát quyền decrypt | Chọn **customer-managed KMS key** cho env var |
| Bảo vệ khỏi người xem trong Console | Bật **"encryption helpers"** (mã hóa in-transit, giải mã trong code) |

### Encryption helpers

Khi bật encryption helpers, value env var được lưu **dạng ciphertext**, và Console **không hiển thị plaintext** cho người chỉ có quyền xem Lambda. Code phải tự gọi KMS `Decrypt`:

```python
import boto3, os
from base64 import b64decode

ENCRYPTED = os.environ["DB_PASSWORD"]  # ciphertext base64

def decrypt(blob):
    return boto3.client("kms").decrypt(
        CiphertextBlob=b64decode(blob),
        EncryptionContext={"LambdaFunctionName":
            os.environ["AWS_LAMBDA_FUNCTION_NAME"]}
    )["Plaintext"].decode()

DB_PASSWORD = decrypt(ENCRYPTED)  # giải mã 1 lần ở global scope
```

> 💡 Mẹo thi: Phân biệt rõ:
> - **Encrypt at rest** (mặc định) → bảo vệ trên ổ đĩa AWS, ai có quyền `lambda:GetFunctionConfiguration` vẫn thấy plaintext.
> - **Encryption helpers + CMK** → ngay cả người xem config cũng chỉ thấy ciphertext; cần quyền KMS `Decrypt` mới đọc được.

> ⚠️ Bẫy: Env var dù mã hóa vẫn **không phải nơi tốt nhất** cho secret xoay vòng. Nếu đề nhấn "rotate", "tránh redeploy khi đổi secret" → câu trả lời vẫn là **Secrets Manager**, không phải env var. Đổi env var bắt buộc update function config.

> ⚠️ Bẫy: Đừng nhầm — bật CMK cho Lambda env var **không tự động** mã hóa per-value bằng helper. Helper là tính năng riêng (Console "Encryption in transit"), thường đi kèm thao tác `Encrypt` thủ công khi tạo value.

---

## Data Classification: PII / PHI

Phân loại dữ liệu quyết định bạn phải bảo vệ nó nghiêm tới mức nào.

| Loại | Ví dụ | Khung pháp lý liên quan |
|---|---|---|
| **PII** (Personally Identifiable Info) | Tên, email, số CMND/SSN, địa chỉ | GDPR, CCPA |
| **PHI** (Protected Health Info) | Hồ sơ bệnh án, chẩn đoán | HIPAA |
| **PCI** | Số thẻ tín dụng | PCI-DSS |

Công cụ AWS hỗ trợ developer:

- **Amazon Macie**: tự động quét **S3** phát hiện PII/PHI bằng machine learning.
- **Amazon Comprehend** (`DetectPiiEntities`): phát hiện & gắn nhãn PII trong text.
- **KMS / encryption**: mã hóa at-rest cho dữ liệu phân loại cao.

> 💡 Mẹo thi: "Tự động phát hiện PII trong **S3 bucket**" → **Macie**. "Phát hiện PII trong **đoạn text/document** (NLP)" → **Comprehend**.

---

## Application-level Data Masking & Sanitization

Bảo mật không chỉ ở tầng lưu trữ — code của bạn phải tránh **rò rỉ secret/PII qua log, response, error**.

### Masking khi log

```python
import re

def mask_email(e):
    name, domain = e.split("@")
    return name[0] + "***@" + domain

def mask_card(num):
    return "****-****-****-" + num[-4:]

logger.info("User login: %s", mask_email(user.email))
```

> ⚠️ Bẫy thực chiến (và hay xuất hiện trong đề): **đừng log full request/response** chứa token, password, số thẻ. CloudWatch Logs là plaintext — secret lọt vào log là rò rỉ.

### Sanitization input

- **Validate & escape** input trước khi đưa vào query/DynamoDB/log (chống injection).
- Loại bỏ field nhạy cảm khỏi API response (đừng trả `password_hash`, internal id).

```python
def to_public(user):
    return {"id": user["id"], "name": user["name"]}  # bỏ email, phone, hash
```

### Che dữ liệu ở tầng dịch vụ

- **CloudWatch Logs data protection policies**: tự động phát hiện & mask PII (email, SSN…) trong log group.
- **API Gateway**: không log full body khi bật execution logging cho endpoint nhạy cảm.

---

## Multi-tenant Data Access Patterns

Khi một ứng dụng phục vụ nhiều khách hàng (tenant), phải đảm bảo tenant A **không bao giờ** đọc được dữ liệu tenant B.

### Các pattern thường gặp

| Pattern | Cách cô lập | Ghi chú |
|---|---|---|
| **Silo** | Mỗi tenant 1 DB/bảng/account riêng | Cô lập mạnh nhất, tốn kém nhất |
| **Pool** | Chung bảng, phân biệt bằng `tenant_id` | Rẻ, nhưng phải lọc cẩn thận |
| **Bridge** | Lai: chung infra, schema/partition riêng | Cân bằng |

### Cô lập với DynamoDB (pool model)

Dùng `tenant_id` làm **partition key** và **leading key** để phân vùng dữ liệu:

```
PK = TENANT#<tenant_id>   SK = USER#<user_id>
```

Kết hợp **IAM policy với điều kiện `dynamodb:LeadingKeys`** để DB tự chặn truy cập sai tenant:

```json
{
  "Effect": "Allow",
  "Action": ["dynamodb:GetItem", "dynamodb:Query"],
  "Resource": "arn:aws:dynamodb:*:*:table/AppData",
  "Condition": {
    "ForAllValues:StringEquals": {
      "dynamodb:LeadingKeys": ["TENANT#${aws:PrincipalTag/tenant}"]
    }
  }
}
```

### Cô lập theo session bằng STS

Pattern mạnh: app dùng **`sts:AssumeRole` + session policy / session tags** để tạo credential giới hạn đúng tenant cho mỗi request — gọi là **dynamic / scoped credentials**.

> 💡 Mẹo thi: "Đảm bảo cô lập tenant ở tầng IAM cho DynamoDB" → nghĩ tới **`dynamodb:LeadingKeys` condition**. "Cấp credential tạm giới hạn theo tenant mỗi request" → **STS AssumeRole + session policy/tags**.

> ⚠️ Bẫy: Chỉ lọc `tenant_id` ở **tầng application code** là yếu — nếu code có bug, dữ liệu rò. Đề thường ưu tiên đáp án có **enforcement ở tầng IAM/DB**, không chỉ dựa code.

---

## Tổng kết các bẫy thi hay gặp

> ⚠️ Bẫy:
> - **Rotation native** = Secrets Manager. Parameter Store **không** có (phải tự build EventBridge + Lambda).
> - Đọc **SecureString** quên `--with-decryption` / `WithDecryption=True` → ra ciphertext.
> - Cross-account secret: nhớ cấp `Decrypt` trên **KMS key**, không chỉ resource policy.
> - Lambda env var mã hóa at-rest mặc định, nhưng **encryption helpers + CMK** mới ẩn plaintext khỏi người xem config.
> - "Lowest cost, store config, no rotation" → **Parameter Store Standard (free)**, đừng chọn Secrets Manager.
> - PII trong **S3** → **Macie**; PII trong **text/NLP** → **Comprehend**.
> - Multi-tenant: ưu tiên enforcement ở **IAM/DB** (`LeadingKeys`, STS), không chỉ lọc trong code.
> - Đừng để secret/PII lọt vào **CloudWatch Logs** — mask trước khi log.

> 💡 Mẹo thi cuối: Khi phân vân Secrets Manager vs Parameter Store, hỏi 2 câu: **(1) Có cần auto-rotation không? (2) Chi phí có là yếu tố quyết định không?** — hai câu này giải quyết ~90% câu hỏi dạng này trong đề.
