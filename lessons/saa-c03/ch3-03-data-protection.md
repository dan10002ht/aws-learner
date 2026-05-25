# SAA Ch3.3 — Data Protection & Encryption

> Mục tiêu: Hiểu **KMS** thật sự (envelope encryption, key policy, grants), encryption ở từng service (S3, EBS, RDS, DynamoDB), khi nào dùng **CloudHSM** thay KMS, và quản lý **secret + certificate** đúng cách thay vì hardcode trong code.

Tiền đề: [[ch3-01-iam-deep-dive]] (policy), CLF [[05-s3]].

---

## 1. Câu chuyện mở đầu — Hardcoded password trên GitHub

Dev push code lên public GitHub repo. Hardcoded DB password trong `config.py`. Trong 3 phút, bot scanner phát hiện. Trong 5 phút, attacker access DB. Trong 10 phút, ransom note xuất hiện.

→ **Secret không bao giờ trong code, không bao giờ trong env file commit, không bao giờ trong S3 bucket public.** Câu chuyện đáng buồn này lặp đi lặp lại — và **AWS Secrets Manager / Parameter Store / KMS** giải quyết được, nếu bạn dùng.

---

## 2. Encryption — at rest vs in transit

| Loại | Bảo vệ | AWS service |
|------|--------|-------------|
| **At rest** | Data trên disk/storage | KMS, S3 encryption, EBS encryption, RDS encryption |
| **In transit** | Data đi trên network | TLS (ACM certificate), VPN, MACsec (DX) |
| **In use** | Data đang xử lý trong RAM | Nitro Enclaves (special) |

**Quy tắc**: bật cả 2. At rest mặc định ở 95% service AWS. In transit cần config TLS đúng.

---

## 3. KMS (Key Management Service)

### 3.1 Khái niệm core

- KMS lưu **CMK (Customer Master Key)** — giờ gọi là **KMS key**.
- Key **không bao giờ rời KMS** (FIPS 140-2 Level 2 HSM, Level 3 với CloudHSM).
- Bạn dùng key qua API: `Encrypt`, `Decrypt`, `GenerateDataKey`, `ReEncrypt`.

### 3.2 Loại key

| Type | Quản lý bởi | Cost | Use case |
|------|-------------|------|----------|
| **AWS managed key** (`aws/s3`, `aws/rds`…) | AWS | Free | Default encryption cho service |
| **Customer managed key (CMK)** | Bạn | $1/key/tháng + API calls | Cần custom policy, rotation control, audit |
| **AWS owned key** | AWS (không thấy) | Free | Service-internal, không user-facing |

### 3.3 Symmetric vs Asymmetric

| Type | Algorithm | Use case |
|------|-----------|----------|
| **Symmetric** (256-bit AES) | AES-GCM | Encrypt/decrypt data, default cho mọi case |
| **Asymmetric RSA / ECC** | RSA-2048/3072/4096, ECDSA | Sign/verify, encrypt cho public consumer |

### 3.4 Envelope encryption — quan trọng nhất

Vấn đề: KMS giới hạn ~4KB cho `Encrypt` API. Encrypt 1GB không khả thi qua KMS trực tiếp.

**Giải pháp**: envelope encryption.

```
1. App gọi GenerateDataKey → KMS trả về:
   - Plaintext data key (256-bit)
   - Encrypted data key (đã encrypt bằng KMS key)
2. App dùng plaintext data key encrypt 1GB data ở local (AES-GCM).
3. App lưu: encrypted data + encrypted data key.
4. App vứt plaintext data key khỏi RAM.

Decrypt:
1. Lấy encrypted data key, gọi KMS Decrypt → plaintext data key.
2. Dùng plaintext data key decrypt data ở local.
3. Vứt plaintext data key.
```

→ KMS chỉ encrypt/decrypt 256-bit data key, nhẹ. Heavy lifting ở client. **S3, EBS, RDS, DynamoDB đều dùng pattern này internal.**

### 3.5 Key policy + grants + IAM

3 cơ chế quyền KMS:

1. **Key policy**: gắn trên key. Mặc định cho root account quyền — **PHẢI** có để IAM policy work.
2. **IAM policy**: gắn trên user/role. Hoạt động cùng key policy.
3. **Grants**: temporary permission, programmatic. Use case: cho service AWS use key tạm thời.

> 🪤 Trap: bạn `iam:Allow kms:*` cho user nhưng key policy không reference user → vẫn DENY. Key policy là **gateway**.

### 3.6 Rotation

- **Automatic rotation**: bật → KMS rotate key material hàng năm. Cũ vẫn dùng được cho decrypt (key ID không đổi).
- **Manual rotation**: tạo key mới, app phải re-encrypt data.
- AWS managed key: rotate mỗi 365 ngày tự động.
- Imported key material: phải rotate thủ công.

### 3.7 Multi-region keys

- 1 key có replica ở nhiều region.
- Cùng key ID, cùng key material → encrypt ở region A, decrypt ở region B.
- Use case: cross-region replication, DR, multi-region active-active.

### 3.8 KMS pricing

- $1 / key / tháng (CMK).
- $0.03 / 10,000 API calls (Encrypt/Decrypt/GenerateDataKey).
- Hi-volume app: KMS request có thể $$$. Cache data key client-side (S3 SDK auto, custom code cần aware).

---

## 4. CloudHSM

### Khi nào CloudHSM thay KMS

| Yêu cầu | KMS | CloudHSM |
|---------|-----|----------|
| FIPS 140-2 Level 2 | ✅ | ✅ |
| FIPS 140-2 Level 3 | ❌ | ✅ |
| Single-tenant HSM | ❌ | ✅ |
| Bạn quản lý key material 100% (AWS không thấy) | ⚠️ (BYOK option) | ✅ |
| Compliance đặc thù (PCI-DSS, common criteria) | ❓ | ✅ |
| PKCS#11 / JCE / OpenSSL standard API | ❌ | ✅ |

### Trade-off
- CloudHSM đắt: ~$1.5/h per HSM × 2 (HA) = ~$2200/tháng minimum.
- Cluster management overhead.
- Không tích hợp sâu với AWS service như KMS.
- Use case: hardcore compliance, custom crypto.

### KMS custom key store
- KMS key store **được backed by CloudHSM cluster**.
- Best of both: KMS API + CloudHSM-level isolation.

---

## 5. Encryption ở từng service

### 5.1 S3

| Method | Key | Trade-off |
|--------|-----|-----------|
| **SSE-S3** (`AES256`) | S3 managed | Default, dễ |
| **SSE-KMS** (`aws:kms`) | KMS CMK | Audit per key access, control rotation |
| **SSE-C** (customer-provided key) | Bạn gửi key mỗi request | Đặc biệt, hiếm |
| **DSSE-KMS** (dual-layer) | 2 KMS keys | Strong compliance |
| **Client-side** | Bạn encrypt trước upload | E2E, AWS không thấy plaintext |

- **2023+**: SSE-S3 bật mặc định cho mọi bucket mới.
- Bucket policy bắt buộc encryption:
```json
{
  "Effect": "Deny",
  "Action": "s3:PutObject",
  "Resource": "arn:aws:s3:::bucket/*",
  "Condition": { "StringNotEquals": { "s3:x-amz-server-side-encryption": "aws:kms" } }
}
```

### 5.2 EBS

- Default encryption bật ở **region level**.
- Snapshot follow volume encryption.
- Cross-account snapshot share encrypted → cần share KMS key permission nữa.
- Boot volume encryption: phải bật ở AMI.

### 5.3 RDS / Aurora

- Encryption at rest: KMS, chọn khi tạo. **Không enable được sau khi tạo** → phải snapshot, copy với encryption, restore.
- Replica inherit encryption từ primary.
- TLS in transit: download CA bundle, config app SSL.
- **Transparent Data Encryption (TDE)**: Oracle/SQL Server, layer trên KMS.

### 5.4 DynamoDB

- Default encryption KMS (AWS managed key) — không tắt được.
- Có thể switch sang CMK cho audit/control.
- Encryption transparent với app.

### 5.5 EFS / FSx

- At rest: KMS (chọn khi tạo).
- In transit: TLS option (mount với `tls`).

### 5.6 SQS / SNS / Kinesis / MSK

- KMS encryption option.
- TLS endpoint mặc định.

### 5.7 Lambda

- Environment variables: encrypt với KMS optionally.
- Best practice: dùng Secrets Manager / Parameter Store thay vì env var cho secret.

---

## 6. Secrets Manager vs Parameter Store

| Feature | Secrets Manager | SSM Parameter Store |
|---------|----------------|---------------------|
| Rotation tự động | ✅ (built-in cho RDS, Redshift, DocumentDB) | ❌ (manual or Lambda) |
| Cross-region replication | ✅ | ❌ |
| Cost | $0.40 / secret / tháng + API | Free (Standard), $$$ Advanced |
| Max size | 64 KB | 4 KB (Standard), 8 KB (Advanced) |
| Versioning | ✅ | ✅ (Advanced) |
| KMS integration | ✅ | ✅ |
| Use case | Production secret cần rotate | Config + non-rotate secret |

### Patterns

- DB credential → **Secrets Manager** với auto-rotate Lambda.
- API token bên thứ 3 → Secrets Manager.
- Feature flag, config → Parameter Store.
- License key → Parameter Store (SecureString).

### Anti-pattern
- Env var hardcoded secret.
- Secret trong CloudFormation parameter (plaintext in template).
- Secret trong code repository (kể cả private).

---

## 7. Certificate Manager (ACM)

### 7.1 ACM public

- Free SSL/TLS cert cho:
  - CloudFront
  - ALB / NLB
  - API Gateway
  - App Runner
- Auto-renew.
- Validation: DNS (recommended) hoặc email.
- **Không xuất được private key** — chỉ AWS service dùng.

### 7.2 ACM Private CA

- Bạn tự là CA, issue cert internal.
- Use case: mTLS giữa microservice, IoT device, internal service.
- Cost: per CA + per cert.

### 7.3 Import certificate
- Cert từ CA bên ngoài (DigiCert, GoDaddy) → import vào ACM.
- AWS không renew giúp; phải re-import.

---

## 8. Macie — discover sensitive data

- ML-based scan S3 bucket cho PII (SSN, credit card, name, address).
- Generate finding, gửi Security Hub / EventBridge.
- Use case: compliance audit, data classification.
- Pricing: per GB scan + storage.

---

## 9. Patterns thực chiến

### 9.1 RDS password rotation
1. RDS dùng KMS encrypt at rest.
2. Secrets Manager lưu password, auto-rotate mỗi 30 ngày qua Lambda.
3. App đọc Secrets Manager mỗi connection (cache 5 phút).
4. Khi rotate: Secrets Manager update RDS password + secret value. App retry → connect bằng pass mới.

### 9.2 Cross-region S3 replication encrypted
1. Source bucket SSE-KMS với key A (region us-east-1).
2. Destination bucket SSE-KMS với key B (region eu-west-1).
3. Source CRR config: encrypt với key B at destination.
4. Replication role có quyền decrypt key A + encrypt key B.

### 9.3 mTLS giữa microservice
1. ACM Private CA issue cert cho mỗi service.
2. Cert nằm trong Secrets Manager hoặc mount qua sidecar (Envoy/AWS App Mesh).
3. Service-to-service traffic encrypt + mutual authentication.

### 9.4 Encrypted everywhere
- S3: SSE-KMS với CMK.
- EBS: encryption default ON.
- RDS: KMS.
- Secrets: Secrets Manager.
- Cert: ACM.
- Audit: CloudTrail KMS event để xem "ai decrypt cái gì".

---

## 10. KMS performance & cost

- **KMS quota**: 5,500 - 30,000 req/s depend region và operation.
- Hit quota → throttle. Use case high-volume: **cache data key**.
- S3 với SSE-KMS có thể tốn KMS API per request — cân nhắc SSE-S3 cho bucket truy cập cực cao.

### Cost optimization
- AWS managed key (free) cho non-audit case.
- CMK chỉ khi cần rotation control, audit, key policy.
- Data key caching SDK (S3 Encryption Client).

---

## 11. Cạm bẫy đề thi (SAA)

1. **"KMS encrypt 1 GB file trực tiếp"** → **Sai**, 4 KB limit. Dùng envelope.
2. **"AWS managed key có thể custom policy"** → **Sai**, chỉ CMK.
3. **"Bật encryption RDS sau khi tạo"** → **Sai**, phải snapshot → copy encrypt → restore.
4. **"Secrets Manager free"** → **Sai**, $0.40/secret/tháng + API.
5. **"ACM cert export để dùng on-prem server"** → **Sai**, không export được. ACM Private CA mới issue cert export được.
6. **"Cross-region KMS key tự động"** → **Sai**, cần Multi-region key explicit, hoặc encrypt với key region đích.
7. **"SSE-C: AWS lưu key"** → **Sai**, customer gửi key mỗi request, AWS không lưu.
8. **"CloudHSM cluster 1 node là HA"** → **Sai**, cần ≥2 HSM cho HA.
9. **"DynamoDB không encrypted"** → **Sai**, mặc định encrypted với AWS managed key.

---

## 12. Tóm tắt 1 dòng

> Encrypt at rest **mọi nơi** (KMS hoặc service-default), TLS in transit, secret trong **Secrets Manager/Parameter Store**, cert trong **ACM**. Envelope encryption là pattern cốt lõi của KMS. CMK khi cần rotate/audit control.

---

## 13. Bài tập tự kiểm tra

1. App ghi 10TB log/ngày vào S3, SSE-KMS với CMK. KMS bill $500/ngày. Bạn analyze gì và đề xuất giảm cost?
2. Cross-account: account A có S3 bucket SSE-KMS. Account B user cần read. Cấu hình IAM + KMS thế nào?
3. RDS Postgres production chưa encryption. Sếp yêu cầu encrypt all. Plan migration zero-downtime (hoặc downtime minimum)?
4. Lambda function gọi 3rd-party API cần API key. Best practice lưu key ở đâu, retrieve thế nào?
5. So sánh KMS CMK rotation tự động vs manual rotation. Lúc rotate, data cũ có decrypt được không?
6. Compliance PCI-DSS yêu cầu HSM dedicated. So sánh KMS custom key store vs CloudHSM standalone.

---

## 14. Đọc thêm

- AWS Whitepaper — *AWS KMS Cryptographic Details*, *Logical Separation on AWS*.
- AWS docs — *KMS Developer Guide*, *Secrets Manager User Guide*.
- AWS Builder's Library — *Encryption at rest*.

---

**Bài tiếp theo**: [[ch3-04-detective-controls]] — CloudTrail, Config, GuardDuty, Security Hub, incident response.
