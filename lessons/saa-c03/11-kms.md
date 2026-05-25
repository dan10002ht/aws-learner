# Bài 11 — KMS (Key Management Service) Deep

## 1. Mục tiêu
- Hiểu **envelope encryption** — vì sao AWS không encrypt data trực tiếp bằng CMK.
- Phân biệt 4 loại key: AWS-managed, Customer-managed (CMK), AWS-owned, Imported.
- Viết **key policy** đúng + dùng **grants**.
- Cross-account, cross-region key sharing.
- Tích hợp KMS với S3, EBS, RDS, Secrets Manager.

---

## 2. Lý thuyết

### 2.1 Vì sao cần KMS

Mã hóa data 1GB trực tiếp bằng key trong HSM → chậm + tốn round-trip mạng. Giải pháp: **Envelope Encryption**.

### 2.2 Envelope Encryption

```
1. App gọi KMS GenerateDataKey(CMK)
2. KMS trả về:
   - Plaintext data key (32 bytes AES-256)
   - Encrypted data key (CMK encrypt cái trên)
3. App encrypt data với plaintext data key (AES-GCM, local)
4. App lưu: ciphertext + encrypted data key
5. App XÓA plaintext data key khỏi memory
6. Khi decrypt:
   - Gọi KMS Decrypt(encrypted data key) → plaintext data key
   - Decrypt data local
```

→ KMS chỉ xử lý **32 bytes data key**, không thấy data thật. Throughput cao, key vẫn an toàn.

### 2.3 Loại CMK

| Loại | Ai tạo | Ai quản | Rotation | Cross-account | Cost |
|------|--------|---------|----------|---------------|------|
| **AWS Owned** | AWS | AWS | AWS auto | Không | Free |
| **AWS Managed** (`aws/s3`, `aws/rds`…) | AWS | AWS | AWS, **1 năm** | Không | Free key, $0.03/10k call |
| **Customer Managed (CMK)** | Bạn | Bạn | Tự bật, **1 năm** | **Có** | $1/key/tháng |
| **Imported** (BYOK) | Bạn | Bạn | Không (phải import lại) | Có | $1/key/tháng |
| **Custom Key Store** (CloudHSM-backed) | Bạn | Bạn | Tự | Có | $1/key + CloudHSM cluster |

### 2.4 Key Policy (resource policy của KMS) — BẮT BUỘC

KMS **khác** S3: nếu key policy không cho phép, **IAM policy không cứu được**.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EnableRootPermissions",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::123:root" },
      "Action": "kms:*",
      "Resource": "*"
    },
    {
      "Sid": "AllowKeyAdmins",
      "Effect": "Allow",
      "Principal": { "AWS": ["arn:aws:iam::123:role/KeyAdmin"] },
      "Action": ["kms:Create*","kms:Describe*","kms:Enable*","kms:List*","kms:Put*","kms:Update*","kms:Revoke*","kms:Disable*","kms:Get*","kms:Delete*","kms:TagResource","kms:UntagResource","kms:ScheduleKeyDeletion","kms:CancelKeyDeletion"],
      "Resource": "*"
    },
    {
      "Sid": "AllowUseOfKey",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::123:role/AppRole" },
      "Action": ["kms:Encrypt","kms:Decrypt","kms:ReEncrypt*","kms:GenerateDataKey*","kms:DescribeKey"],
      "Resource": "*"
    }
  ]
}
```

⚠️ **Luôn để root trong key policy.** Nếu không và xóa nhầm policy → key lock vĩnh viễn, AWS support cũng không cứu được.

### 2.5 Grants — alternative cho key policy

Khi muốn **temp** cấp quyền cho principal mà không sửa key policy (e.g. EBS volume cần dùng key tạm thời để snapshot):

```bash
aws kms create-grant --key-id <KEY> \
  --grantee-principal arn:aws:iam::123:role/Snapshotter \
  --operations Encrypt Decrypt GenerateDataKey
```

- Grant có **GrantToken** dùng ngay, không chờ eventual consistency.
- Revoke được, hoặc retire khi xong.
- Use case nội bộ AWS service (RDS, EBS, Lambda) hay dùng grants.

### 2.6 Key rotation
- **AWS-managed**: AWS rotate 1 năm tự động, không config được.
- **CMK auto-rotation**: bật → AWS tạo material mới mỗi năm. Material cũ giữ lại để decrypt data cũ.
- **Manual rotation**: tạo CMK mới + update alias + re-encrypt data cũ (cần `kms:ReEncrypt*`).
- **Imported key**: KHÔNG auto-rotate, phải import lại material.

**Lưu ý:** Rotation KHÔNG re-encrypt data cũ. Data cũ vẫn dùng key material cũ → cần `ReEncrypt` thủ công nếu muốn.

### 2.7 Cross-account & Cross-region

**Cross-account:**
1. Key policy account A allow account B principal.
2. IAM policy account B allow `kms:Decrypt` trên key A.

**Cross-region:**
- Default KMS key **regional** — gọi từ region khác = fail.
- **Multi-Region Key (2021+)**: tạo replica key ở region khác, **cùng key material**, decrypt ciphertext của nhau.
- Use case: DynamoDB Global Tables, S3 CRR, Aurora Global.

### 2.8 Tích hợp với service

| Service | KMS pattern |
|---------|-------------|
| **S3 SSE-KMS** | Mỗi PUT call KMS. Bật **Bucket Key** để giảm ~99% call (cache data key per bucket-day). |
| **EBS** | Volume encrypt với CMK. Snapshot inherit. Copy snapshot có thể re-encrypt với key khác. |
| **RDS** | Encrypt at rest bật khi create, **không bật được sau** (workaround: snapshot → copy encrypted → restore). |
| **Secrets Manager** | Mỗi secret 1 CMK (hoặc default `aws/secretsmanager`). |
| **Lambda env vars** | Mặc định AWS-managed. CMK cho compliance. |
| **CloudTrail logs** | Encrypt CloudTrail log file với CMK. |
| **DynamoDB** | At-rest default AWS-owned; CMK option. |

### 2.9 Key deletion
- **Schedule deletion**: min **7 ngày**, max 30 ngày waiting period.
- Trong period: key disabled, không dùng được, **có thể cancel deletion**.
- Sau period: **PERMANENT** — data encrypted bằng key → mất vĩnh viễn = **crypto-shred**.
- Đây là feature (compliance GDPR right-to-be-forgotten), không phải bug.

### 2.10 Asymmetric keys + Signing
- KMS hỗ trợ RSA, ECC keys cho encrypt/decrypt + sign/verify.
- Use case: JWT signing, code signing, document sign.
- Không export private key — sign call qua KMS.

### 2.11 CloudHSM vs KMS

| | KMS | CloudHSM |
|--|-----|----------|
| Multi-tenant | ✅ | ❌ (dedicated) |
| FIPS 140-2 | Level 3 (HSM-backed) | Level 3 |
| Bạn quản key material | Partial (CMK) | Full |
| API | AWS API | PKCS#11, JCE, KSP/CNG |
| Use case | Hầu hết workload | Compliance bắt buộc dedicated HSM (PCI-DSS Level 1, banking) |
| Cost | $1/key/tháng | ~$1,000/HSM/tháng |

---

## 3. Hands-on

### Lab 1 — Tạo CMK + encrypt small data (10 phút)
```bash
KEY_ID=$(aws kms create-key --description "learn-cmk" \
  --tags TagKey=Project,TagValue=aws-learner \
  --query 'KeyMetadata.KeyId' --output text)
aws kms create-alias --alias-name alias/learn-key --target-key-id $KEY_ID

# Encrypt 4KB max
aws kms encrypt --key-id $KEY_ID --plaintext "hello secret" \
  --query CiphertextBlob --output text | base64 -d > /tmp/ct

aws kms decrypt --ciphertext-blob fileb:///tmp/ct \
  --query Plaintext --output text | base64 -d
```

### Lab 2 — Envelope encryption code (Python)
```python
import boto3, base64
kms = boto3.client('kms')

# Generate data key
r = kms.generate_data_key(KeyId='alias/learn-key', KeySpec='AES_256')
data_key = r['Plaintext']  # use locally
ciphertext_data_key = r['CiphertextBlob']  # store with data

# Use data_key with AES-GCM to encrypt large file (e.g. cryptography lib)
# Store: ciphertext_data_key + ciphertext

# Decrypt
data_key_back = kms.decrypt(CiphertextBlob=ciphertext_data_key)['Plaintext']
# decrypt local data with data_key_back
```

### Lab 3 — S3 SSE-KMS + Bucket Key (5 phút)
```bash
aws s3api put-bucket-encryption --bucket $BUCKET \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "aws:kms",
        "KMSMasterKeyID": "alias/learn-key"
      },
      "BucketKeyEnabled": true
    }]
  }'
```

### Lab 4 — Cross-region replication với Multi-Region Key
1. Tạo primary key region A.
2. Replicate sang region B:
   ```bash
   aws kms replicate-key --key-id $KEY_ID --replica-region us-east-1
   ```
3. S3 bucket A SSE-KMS + replicate sang bucket B. Bucket B dùng replica key → decrypt được.

### Lab 5 — Schedule deletion + cancel
```bash
aws kms schedule-key-deletion --key-id $KEY_ID --pending-window-in-days 7
# Đổi ý:
aws kms cancel-key-deletion --key-id $KEY_ID
```

---

## 4. Tự kiểm tra

1. Bucket S3 SSE-KMS có Bucket Key. App PUT 1M object/ngày. Mỗi PUT có gọi KMS không?
   <details><summary>Đáp án</summary>**Không phải mỗi PUT** — Bucket Key cache data key per bucket-day, giảm ~99% KMS call. Vẫn có 1 call/ngày để generate data key. Tiết kiệm đáng kể.</details>

2. EBS volume encrypted với CMK X. Bạn xóa CMK X (đợi 7 ngày). Volume có còn dùng được không?
   <details><summary>Đáp án</summary>**Không** — data trên volume crypto-shred. Snapshot cũng không restore được. Đây là feature (right-to-be-forgotten).</details>

3. KMS key policy trống. IAM user có `kms:*` full Admin. Decrypt được không?
   <details><summary>Đáp án</summary>**Không** — KMS yêu cầu **key policy** allow. IAM policy không override. Đây là khác biệt lớn so S3.</details>

4. Cross-account: account A có CMK. App account B muốn decrypt. Setup gì?
   <details><summary>Đáp án</summary>(1) Key policy A allow B principal. (2) IAM policy B allow `kms:Decrypt` + `kms:DescribeKey` trên ARN key A.</details>

5. RDS instance tạo unencrypted, giờ muốn encrypt. Làm sao?
   <details><summary>Đáp án</summary>**Không bật trực tiếp được**. Snapshot → copy snapshot với encryption + KMS key → restore from encrypted snapshot. Có downtime hoặc dùng read replica chuyển sang.</details>

6. Lambda function ở 2 region. Encrypt env vars với 1 CMK. Có hoạt động không?
   <details><summary>Đáp án</summary>**Không** với key regional. Cần **Multi-Region Key** replicate sang region thứ 2. Hoặc dùng 2 key riêng.</details>

7. 3rd-party vendor cần encrypt data gửi cho bạn. Họ không có AWS account. Pattern?
   <details><summary>Đáp án</summary>**Imported CMK (BYOK)** — bạn tạo material, share với vendor, họ encrypt local; hoặc dùng KMS asymmetric public key (export public, vendor encrypt với public, bạn decrypt).</details>

8. Compliance PCI-DSS Level 1 bắt buộc dedicated HSM. KMS đủ không?
   <details><summary>Đáp án</summary>Đa số đủ (KMS FIPS 140-2 Level 3). Nếu auditor bắt buộc dedicated HSM tách biệt → **CloudHSM** hoặc **KMS Custom Key Store** (backed by CloudHSM).</details>

---

## 5. Đối chiếu GCP

| AWS | GCP |
|-----|-----|
| KMS | **Cloud KMS** |
| CMK | **Key (CryptoKey)** trong KeyRing |
| AWS-managed key | **Google-managed key** (default) |
| Imported (BYOK) | **Imported key version** |
| Custom Key Store | **External Key Manager (EKM)** + Cloud HSM |
| Multi-Region Key | **Multi-region location** key (auto-replicate) |
| Key Policy | IAM binding trên key resource |
| Grants | **không có equivalent** — dùng IAM với conditions |
| Envelope encryption | Same — `EncryptDataKey` flow |
| KMS asymmetric | **Cloud KMS asymmetric** (RSA, ECC) |
| CloudHSM | **Cloud HSM** |
| Rotation | Auto rotate (tự config period) |

**Bẫy từ GCP qua AWS:**
1. **GCP IAM duy nhất** kiểm quyền key. AWS có **Key Policy + IAM** — key policy là chính, IAM không override.
2. **GCP keys multi-region built-in** chỉ chọn location. AWS phải **explicit replicate** Multi-Region Key.
3. **GCP key destruction** 24h waiting (default). AWS **min 7 ngày**.
4. **GCP không có "grants"** — quyền tạm thời qua **Conditional IAM** (expires).

---

## 6. Lưu ý SAA-C03

- **Key Policy bắt buộc** allow — IAM không cứu được.
- **Root trong key policy** — nếu thiếu, key có thể lock vĩnh viễn.
- **Multi-Region Key** cho cross-region replication.
- **Bucket Key** giảm 99% KMS cost cho S3.
- **Imported key** không auto-rotate.
- **Crypto-shred** = xóa key = mất data.
- **CloudHSM** chỉ khi compliance bắt buộc dedicated HSM.
- **Custom Key Store** = KMS API + CloudHSM backing.
- KMS API quota có limit per region — workload cao cần xin tăng hoặc Bucket Key.

## 7. Lưu ý khi đi làm

### Best practice
- **1 CMK per workload/data classification** (PII, PHI, billing, logs…) — không 1 key dùng chung mọi thứ.
- **Alias** thay vì KeyId — alias rotate được, KeyId thì không.
- **Auto-rotation ON** cho mọi CMK trừ legacy bắt buộc material cố định.
- **Key policy giới hạn theo `kms:ViaService`** để chỉ cho phép service dùng key:
  ```json
  "Condition": {
    "StringEquals": { "kms:ViaService": "s3.ap-southeast-1.amazonaws.com" }
  }
  ```
- **CloudTrail data events** cho KMS để audit decrypt call.
- **Tag key** với `DataClassification=PII` etc.

### Anti-pattern
- ❌ Xóa key policy → lock key.
- ❌ Schedule key deletion mà còn data dùng key đó → crypto-shred prod.
- ❌ Cross-account chỉ sửa key policy quên IAM bên kia.
- ❌ Mua CloudHSM khi KMS đủ ($1k/tháng vs $1/key).
- ❌ Không bật Bucket Key cho S3 SSE-KMS workload lớn → cost vọt.

---

## 8. Foundations
Chưa cần. Bài 15 (DB) sẽ dùng concept consistency để giải thích tại sao replicate key đa region khác replicate data.

## 9. Flashcard
- **Envelope encryption** — CMK encrypt data key, data key encrypt data.
- **CMK** — $1/key/tháng + API calls.
- **Key policy bắt buộc**, IAM không override.
- **Root trong policy** — chống lock vĩnh viễn.
- **Grants** — temp quyền, không sửa key policy.
- **Multi-Region Key** — replicate cùng material cross-region.
- **Bucket Key** — giảm 99% KMS call cho S3 SSE-KMS.
- **Crypto-shred** — xóa key = xóa data.
- **Schedule deletion** — min 7 ngày.
- **CloudHSM** — dedicated, $1k/tháng.
- **Custom Key Store** — KMS API + CloudHSM backing.
- **kms:ViaService** — restrict key chỉ cho service cụ thể.
- **Imported key** không auto-rotate.
- **STS regional endpoint** ưu tiên.
