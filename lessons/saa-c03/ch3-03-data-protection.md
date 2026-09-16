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

### 2.1 In-transit: VPN vs Direct Connect — bẫy kinh điển

Nhiều người tưởng "kết nối riêng tư từ on-prem về AWS thì auto được mã hoá". **Sai** với Direct Connect.

| Kết nối | Mã hoá in-transit mặc định? | Bản chất |
|---------|------------------------------|----------|
| **Site-to-Site VPN** | ✅ Có — **IPsec** sẵn | Đi qua Internet public nhưng tunnel đã encrypt |
| **Direct Connect (DX)** | ❌ **Không** | Đường riêng (private) nhưng traffic là **plaintext** trên layer 2/3 |

- DX cho bạn băng thông ổn định, latency thấp, private — **nhưng không đồng nghĩa với encrypted**. "Private" ≠ "encrypted".
- Muốn encrypt in-transit trên DX, có 2 cách:
  1. **VPN over DX** (IPsec chạy đè lên DX) — dùng public VIF, chồng Site-to-Site VPN lên đường DX. Đơn giản, phổ biến.
  2. **MACsec** (IEEE 802.1AE) — mã hoá layer 2, chỉ hỗ trợ trên DX **dedicated connection** ở các location đủ điều kiện, chỉ với port **10 Gbps hoặc 100 Gbps** (không có ở 1 Gbps). Hiệu năng cao, độ trễ thấp hơn IPsec.

> 🪤 Bẫy thi: đề yêu cầu "kết nối on-prem về AWS **phải mã hoá in-transit**" nhưng đáp án lại chọn Direct Connect trần → **Sai**. Phải là **VPN**, hoặc **VPN over Direct Connect**, hoặc **Direct Connect + MACsec**. Nếu đề nhấn "consistent low latency **và** encrypted" → DX + MACsec (hoặc VPN over DX).

---

## 3. KMS (Key Management Service)

### 3.1 Khái niệm core

- KMS lưu **CMK (Customer Master Key)** — giờ gọi là **KMS key**.
- Key **không bao giờ rời KMS** ở dạng plaintext (HSM đã được validate **FIPS 140-2 Level 3** từ 2023; CloudHSM cũng Level 3 nhưng **single-tenant**).
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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 470" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Sequence diagram envelope encryption với KMS GenerateDataKey và Decrypt</title>
  <desc>Sơ đồ tuần tự ba lifeline dọc — App (client), KMS, Lưu trữ — đọc từ trên xuống theo trục thời gian. Encrypt: App gọi GenerateDataKey, KMS trả plaintext data key và encrypted data key, App encrypt 1GB ở local bằng AES-GCM, lưu encrypted data kèm encrypted data key, rồi vứt plaintext key khỏi RAM. Decrypt: App đọc dữ liệu, gửi encrypted data key cho KMS Decrypt, KMS trả plaintext data key, App decrypt local rồi vứt plaintext key.</desc>
  <defs>
    <marker id="ee-arr" markerWidth="9" markerHeight="9" refX="7" refY="3.2" orient="auto">
      <path d="M0 0 L7 3.2 L0 6.4 z" fill="currentColor"/>
    </marker>
  </defs>
  <!-- lifeline heads -->
  <rect x="60" y="16" width="140" height="40" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="130" y="41" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">App (client)</text>
  <rect x="320" y="16" width="140" height="40" rx="9" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="390" y="35" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">KMS</text>
  <text x="390" y="49" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">key không rời KMS</text>
  <rect x="580" y="16" width="120" height="40" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="640" y="41" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Lưu trữ</text>
  <!-- lifelines -->
  <line x1="130" y1="56" x2="130" y2="410" stroke="currentColor" stroke-opacity="0.22" stroke-dasharray="4 4"/>
  <line x1="390" y1="56" x2="390" y2="410" stroke="currentColor" stroke-opacity="0.22" stroke-dasharray="4 4"/>
  <line x1="640" y1="56" x2="640" y2="410" stroke="currentColor" stroke-opacity="0.22" stroke-dasharray="4 4"/>
  <!-- ENCRYPT band -->
  <text x="16" y="80" font-size="13" font-weight="700" fill="currentColor">A · ENCRYPT (mã hoá 1GB)</text>
  <!-- 1 GenerateDataKey: App -> KMS -->
  <text x="260" y="98" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.9">1 · GenerateDataKey</text>
  <line x1="130" y1="104" x2="390" y2="104" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#ee-arr)"/>
  <!-- 2 return keys: KMS --> App (dashed = response) -->
  <text x="260" y="124" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.9">2 · plaintext key + encrypted data key</text>
  <line x1="390" y1="130" x2="130" y2="130" stroke="currentColor" stroke-opacity="0.6" stroke-dasharray="5 3" marker-end="url(#ee-arr)"/>
  <!-- 3 self: encrypt local -->
  <rect x="40" y="146" width="180" height="28" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="130" y="164" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.9">3 · encrypt 1GB local (AES-GCM)</text>
  <!-- 4 store: App -> Storage -->
  <text x="385" y="194" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.9">4 · lưu encrypted data + encrypted data key</text>
  <line x1="130" y1="200" x2="640" y2="200" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#ee-arr)"/>
  <!-- 5 self: discard -->
  <rect x="40" y="216" width="180" height="28" rx="8" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="130" y="234" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.9">5 · vứt plaintext key khỏi RAM</text>
  <line x1="16" y1="262" x2="704" y2="262" stroke="currentColor" stroke-opacity="0.15"/>
  <!-- DECRYPT band -->
  <text x="16" y="286" font-size="13" font-weight="700" fill="currentColor">B · DECRYPT (giải mã)</text>
  <!-- 6 read: Storage -> App -->
  <text x="385" y="304" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.9">6 · đọc encrypted data + encrypted data key</text>
  <line x1="640" y1="310" x2="130" y2="310" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#ee-arr)"/>
  <!-- 7 Decrypt request: App -> KMS -->
  <text x="260" y="330" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.9">7 · Decrypt(encrypted data key)</text>
  <line x1="130" y1="336" x2="390" y2="336" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#ee-arr)"/>
  <!-- 8 return plaintext key: KMS --> App -->
  <text x="260" y="356" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.9">8 · plaintext data key</text>
  <line x1="390" y1="362" x2="130" y2="362" stroke="currentColor" stroke-opacity="0.6" stroke-dasharray="5 3" marker-end="url(#ee-arr)"/>
  <!-- 9 self: decrypt + discard -->
  <rect x="40" y="378" width="180" height="28" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="130" y="396" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.9">9 · decrypt local → vứt plaintext key</text>
  <text x="16" y="438" font-size="10.5" fill="currentColor" opacity="0.7">KMS chỉ xử lý data key 256-bit (nhẹ); heavy lifting 1GB nằm ở client.</text>
  <text x="16" y="456" font-size="10.5" fill="currentColor" opacity="0.7">Mũi tên nét liền = request; nét đứt = response. Đọc số 1→9 từ trên xuống theo thời gian.</text>
</svg>

→ KMS chỉ encrypt/decrypt 256-bit data key, nhẹ. Heavy lifting ở client. **S3, EBS, RDS, DynamoDB đều dùng pattern này internal.**

### 3.5 Key policy + grants + IAM

3 cơ chế quyền KMS:

1. **Key policy**: gắn trên key. Mặc định cho root account quyền — **PHẢI** có để IAM policy work.
2. **IAM policy**: gắn trên user/role. Hoạt động cùng key policy.
3. **Grants**: temporary permission, programmatic. Use case: cho service AWS use key tạm thời.

> 🪤 Trap: bạn `iam:Allow kms:*` cho user nhưng key policy không reference user → vẫn DENY. Key policy là **gateway**.

### 3.6 Rotation

Đây là mục hay bị nhớ sai nhất. Nhiều tài liệu cũ ghi "KMS rotate **mỗi năm, không đổi được**" — điều đó **không còn đúng**.

| Kiểu rotation | Cơ chế | Con số cần nhớ |
|---------------|--------|----------------|
| **Automatic rotation** (customer managed key) | KMS sinh key material mới, giữ lại toàn bộ material cũ | Chu kỳ **cấu hình được: 90 – 2560 ngày**, mặc định **365 ngày** |
| **On-demand rotation** | Gọi `RotateKeyOnDemand` để rotate ngay, không chờ hết chu kỳ | Tối đa **25 lần on-demand / key** (không tính lần tự động) |
| **AWS managed key** | AWS tự lo | Rotate tự động, bạn không chỉnh chu kỳ được |
| **Manual rotation** (alias swap) | Bạn tạo **key mới** rồi trỏ alias sang; muốn dữ liệu cũ dùng key mới thì phải **re-encrypt** (`ReEncrypt`) | Key ID **đổi** → mọi thứ tham chiếu key ID phải cập nhật |

Cơ chế của automatic/on-demand rotation:

- Key material mới chỉ dùng để **encrypt dữ liệu mới**. Material cũ **vẫn nằm trong key** để decrypt ciphertext cũ → **không phải re-encrypt gì cả**.
- **Key ID, key ARN, alias, key policy, grants đều không đổi** → app không phải sửa dòng code nào. Đây là lý do automatic rotation gần như luôn là đáp án khi đề nói "rotate key **without changing application**" / "without re-encrypting existing data".
- Ngược lại, khi đề nói "key material phải **hoàn toàn mới** và dữ liệu cũ phải được mã hoá lại bằng key mới" → đó là **manual rotation** (key mới + `ReEncrypt`), không phải automatic.

**Không rotate tự động được** (bẫy hay gặp): chỉ **symmetric encryption KMS key** hỗ trợ automatic rotation. Các loại sau **không**:

| Loại key | Vì sao không |
|----------|--------------|
| **Asymmetric** (RSA/ECC) | Public key đã phát ra ngoài; đổi material sẽ phá verify/encrypt phía client |
| **HMAC key** | Không hỗ trợ |
| **Imported key material (BYOK)** | Material do bạn cấp → bạn tự import material mới, KMS không sinh giúp |
| **Key trong custom key store** (CloudHSM / External Key Store) | Material nằm ngoài KMS |

> **Multi-Region key thì rotate được** (đừng nhầm): MRK symmetric origin `AWS_KMS` hỗ trợ cả automatic
> lẫn on-demand rotation. Chỉ khác ở chỗ bật/khởi tạo trên **primary key**, rồi KMS đồng bộ key material
> sang mọi replica trước khi dùng. Imported key material (`EXTERNAL`) thì không automatic nhưng **có**
> on-demand.

> 🪤 Bẫy thi: "compliance bắt rotate key **mỗi 90 ngày**" → **được**, đặt chu kỳ automatic rotation = 90 ngày (cận dưới của dải 90–2560). Đáp án "phải viết Lambda tự tạo key mới mỗi 90 ngày" là đáp án lỗi thời.

> 🪤 Bẫy thi 2: key đang dùng là **imported key material** mà đề đòi "enable automatic rotation" → không làm được; hoặc import material mới thủ công, hoặc chuyển sang KMS-generated key.

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
| FIPS 140-2 Level 3 (HSM validated) | ✅ (từ 2023) | ✅ |
| **Single-tenant** HSM (dành riêng cho bạn) | ❌ (multi-tenant) | ✅ |
| Bạn quản lý key material 100% (AWS không thấy) | ⚠️ (BYOK/External Key Store) | ✅ |
| Tự quản cluster HSM (patch, HA, backup) | ❌ (AWS lo) | ✅ (bạn lo) |
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

#### 5.1.1 S3 Block Public Access (BPA) và Access Points

Encryption bảo vệ data at rest, nhưng data leak lớn nhất của S3 lịch sử là **bucket public vô tình**. **Block Public Access** là lớp chặn cứng, đứng **trên** mọi ACL và bucket policy.

**4 setting BPA** (2 nhóm — ACL và Policy):

| Setting | Chặn gì |
|---------|---------|
| **BlockPublicAcls** | Từ chối *request tạo/đặt* ACL public (chặn ngay lúc PUT) |
| **IgnorePublicAcls** | *Bỏ qua* mọi ACL public đang tồn tại (coi như không có) |
| **BlockPublicPolicy** | Từ chối *đặt* bucket policy cấp quyền public |
| **RestrictPublicBuckets** | Nếu policy đã public, *hạn chế* chỉ AWS service principal và authorized user trong **chính account chủ bucket** được access (chặn cross-account) |

- **Mặc định BẬT cả 4 từ tháng 4/2023** cho mọi bucket mới (kèm ACL disabled). Muốn public thật sự phải chủ động tắt.
- Có **account-level override**: bật BPA ở cấp account thì áp cho **toàn bộ bucket**, kể cả bucket bật public riêng — account-level thắng.
- Quan hệ với **Object Ownership 'Bucket owner enforced'**: setting này **disable ACL hoàn toàn** — mọi object thuộc bucket owner, ACL bị vô hiệu, quyền chỉ còn qua IAM/bucket policy. Đây là default khuyến nghị của AWS; khi ACL đã tắt thì 2 setting ACL của BPA gần như không còn tác dụng gì để lo.

> 🪤 Bẫy thi: bucket policy `Allow` `s3:GetObject` cho `Principal: "*"` (public) nhưng **BlockPublicPolicy / RestrictPublicBuckets vẫn bật** → object **vẫn không public**. BPA đứng trên bucket policy; policy allow public không thắng được BPA.

**Khi nào dùng S3 Access Points** (thay vì mở bucket rộng): khi một bucket lớn được **nhiều ứng dụng/team share** và bạn muốn **least-privilege per-consumer**. Mỗi Access Point có hostname riêng + **access point policy** riêng, gắn network origin (VPC-only hoặc Internet). Thay vì nhồi một bucket policy khổng lồ khó audit, mỗi team dùng access point của mình với quyền hẹp. BPA cũng cấu hình được **per access point**.

> 💡 Chia sẻ an toàn theo thứ tự ưu tiên: Object Ownership *Bucket owner enforced* (tắt ACL) → BPA bật → cấp quyền hẹp qua **Access Point** thay vì bucket policy rộng.

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

### 7.4 Cert nằm ở Region nào — bẫy `us-east-1`

ACM là dịch vụ **theo Region**. Cert import/issue ở Region nào thì chỉ resource ở Region đó thấy được. Hai luật phải thuộc lòng:

| Resource dùng cert | Cert phải nằm ở đâu |
|--------------------|---------------------|
| **CloudFront** (alternate domain name / custom SSL) | **BẮT BUỘC `us-east-1`** (N. Virginia) — bất kể origin ở Region nào |
| **ALB / NLB** | **Cùng Region với load balancer** |
| **API Gateway — edge-optimized** | **`us-east-1`** (vì thực chất chạy trên CloudFront distribution do AWS quản) |
| **API Gateway — regional / private** | Cùng Region với API |
| **AWS Global Accelerator** | **Không dùng cert.** Listener của GA chỉ có TCP/UDP, không terminate TLS — cert nằm ở endpoint phía sau (ALB/NLB), đúng Region của endpoint đó |

> 🪤 Bẫy thi kinh điển: team issue cert ACM ở `ap-southeast-1`, gắn vào CloudFront → **cert không xuất hiện trong dropdown**. Nguyên nhân không phải validation sai, mà là sai Region. Cách xử lý: **request lại cert (miễn phí) ở `us-east-1`** — ACM public cert không copy/move giữa Region được vì không export được private key. Cùng một domain có thể có nhiều cert ở nhiều Region, hoàn toàn hợp lệ.

### 7.5 TLS termination — terminate ở đâu, re-encrypt hay không

"Encryption in transit" trong đề thường không chỉ là "bật HTTPS", mà là **kết thúc TLS ở tầng nào** và **đoạn sau đó có còn mã hoá không**.

| Mô hình | TLS kết thúc ở | Đoạn LB → target | Cert nằm ở | Khi nào chọn |
|---------|----------------|------------------|-----------|--------------|
| **ALB HTTPS listener → HTTP target** | ALB | **Plaintext** trong VPC | ACM (cùng Region ALB) | Mặc định, đơn giản, offload CPU khỏi EC2. Đủ khi không có yêu cầu compliance end-to-end |
| **ALB HTTPS listener → HTTPS target** (re-encrypt) | ALB, rồi **mã hoá lại** tới target | **Encrypted** | ACM ở ALB + cert trên EC2/ECS task (self-signed **được chấp nhận**) | Đề nói "**end-to-end encryption**", "traffic phải mã hoá **kể cả bên trong VPC**", HIPAA/PCI |
| **NLB TLS listener** | NLB (TLS offload ở L4) | Plaintext hoặc TLS tuỳ target group protocol | ACM (cùng Region NLB) | Cần offload TLS nhưng giữ hiệu năng L4; cần **static IP** |
| **NLB TCP listener (passthrough)** | **Trên chính EC2/target** | **Encrypted suốt**, LB không giải mã | **Trên instance** — ACM **không** dùng được ở đây | Đề nói "LB **không được** giải mã traffic", "cert phải do app kiểm soát", mTLS tự triển khai ở app |
| **CloudFront → origin HTTPS** | CloudFront (viewer side), re-encrypt tới origin | Encrypted | Viewer cert ở **us-east-1**; origin cert do origin sở hữu (ALB dùng ACM Region của ALB) | Mọi kiến trúc CDN có yêu cầu mã hoá tới origin. Set *Origin Protocol Policy* = HTTPS Only |

Điểm bẫy quan trọng của re-encrypt trên ALB: ALB **không verify** cert của target (không kiểm CA, không kiểm hostname) → cert **self-signed hoặc hết hạn trên EC2 vẫn hoạt động**. Vì thế "end-to-end encryption" với ALB không đòi bạn phải mua cert public cho từng instance.

Khi bắt buộc **traffic không được ai giải mã giữa đường** (LB chỉ được forward byte): dùng **NLB TCP passthrough**, và lúc đó **không dùng được ACM public cert** (không export private key ra EC2 được) → phải dùng cert import lên instance, hoặc cert từ **ACM Private CA** (loại này export được).

**SNI — nhiều cert trên một listener**: ALB/NLB hỗ trợ **SNI**, cho phép gắn **nhiều cert** lên **một HTTPS/TLS listener** để phục vụ nhiều domain trên cùng IP/port. Một cert là **default certificate** (trả về cho client cũ không gửi SNI), phần còn lại chọn theo hostname client gửi. Đây là đáp án cho "host nhiều domain HTTPS mà **không muốn tạo thêm ALB / thêm IP**".

> 🪤 Bẫy: cert **wildcard** `*.example.com` **không** phủ `example.com` trần, và **không** phủ `a.b.example.com` (chỉ một cấp). Đề mô tả "apex domain vẫn báo lỗi cert" → thêm cả `example.com` vào SAN của cert.

> 🪤 Bẫy: "cần cert TLS cho **web server chạy on-prem**" → ACM public cert **không export được** → đáp án là **ACM Private CA** (cert export được, dùng cho internal/mTLS) hoặc mua cert bên ngoài. Xem lại §7.1–7.2.

---

## 8. S3 Object Lock — chống xoá, chống ransomware

Encryption chống **đọc trộm**. Object Lock chống **xoá/ghi đè** — kể cả bởi chính admin có quyền cao. Đây là cơ chế **WORM (Write Once Read Many)** của S3, là đáp án chuẩn cho đề nói "immutable", "cannot be deleted even by root", "WORM", "SEC 17a-4", "ransomware".

**Điều kiện bắt buộc**: bucket phải **bật Versioning**, và Object Lock phải được bật **lúc tạo bucket** (bật sau cần mở ticket AWS Support). Khi Object Lock đã bật, versioning **không tắt được nữa**.

Object Lock có **2 cơ chế độc lập, dùng chung hoặc riêng**: *retention period* và *legal hold*.

### 8.1 Retention mode — Governance vs Compliance

| Tiêu chí | **Governance mode** | **Compliance mode** |
|----------|---------------------|---------------------|
| Ai được rút ngắn/gỡ retention | User có quyền `s3:BypassGovernanceRetention` (kèm header `x-amz-bypass-governance-retention:true`) | **Không ai** — kể cả **root account** của chính AWS account đó |
| Xoá object version trong hạn | Được, nếu có quyền bypass | **Không**, tuyệt đối |
| Rút ngắn retention period | Được (có bypass) | **Không** — chỉ **kéo dài** được |
| Khi nào chọn | Bảo vệ khỏi **xoá nhầm**, vẫn muốn đội security có đường lùi; môi trường test compliance trước khi làm thật | **Compliance pháp lý thật sự**, chống insider threat / ransomware có credential admin |
| Bẫy | Đề nói "even the root user cannot delete" → **KHÔNG** phải Governance | Đặt nhầm retention 10 năm = **trả phí lưu trữ 10 năm** và không có cách nào gỡ trong account. AWS ghi rõ: **đóng AWS account là cách DUY NHẤT** xoá được object compliance-mode trước hạn |

- Retention đặt **per object version**, tính bằng `Retain Until Date`. Có thể đặt **default retention ở cấp bucket** (ví dụ 90 ngày) để mọi object mới tự kế thừa.
- Hết hạn retention → object trở lại bình thường, xoá được; muốn tự dọn thì kết hợp **lifecycle expiration**.

### 8.2 Legal hold

- Là cờ **bật/tắt**, **không có thời hạn** — giữ object cho tới khi ai đó có quyền `s3:PutObjectLegalHold` tắt đi.
- **Độc lập với retention**: object đã hết retention nhưng còn legal hold → vẫn không xoá được; và ngược lại.
- Use case điển hình: **litigation hold** — đang kiện tụng/điều tra, phải giữ bằng chứng nhưng chưa biết giữ tới bao giờ.

### 8.3 Dùng Object Lock chống ransomware

Kịch bản tấn công thật: attacker lấy được credential admin → xoá sạch backup trong S3 → đòi tiền chuộc. Lớp phòng thủ xếp chồng:

1. **Versioning** — ghi đè không mất bản cũ (nhưng vẫn **xoá version được** nếu có quyền → chưa đủ).
2. **Object Lock Compliance mode** + retention ≥ RPO/RTO yêu cầu — version trong hạn **không ai xoá được**, kể cả root.
3. **MFA Delete** — thêm rào cho thao tác xoá version / tắt versioning (chỉ root bucket owner bật được, phải dùng CLI).
4. **CRR sang account/Region khác** — attacker chiếm 1 account vẫn không chạm tới bản sao ở account kia.

> 💡 So sánh nhanh nhóm "chống xoá" hay bị lẫn: **Versioning** = giữ bản cũ; **MFA Delete** = thêm bước xác thực khi xoá; **Object Lock** = **cấm xoá** theo thời hạn; **S3 Glacier Vault Lock** = WORM cho **Vault kiểu Glacier cũ**, policy khoá vĩnh viễn sau khi lock. Đề mô tả "S3 bucket + immutable" → Object Lock, không phải Vault Lock.

> 🪤 Bẫy thi: "bật Object Lock cho bucket **đang chạy**" → giao diện không có nút; điều kiện là bật lúc tạo bucket (hoặc qua Support). Đáp án kiến trúc thường là **tạo bucket mới có Object Lock rồi copy/replicate dữ liệu sang**.

---

## 9. Macie — discover sensitive data

- ML-based scan S3 bucket cho PII (SSN, credit card, name, address).
- Generate finding, gửi Security Hub / EventBridge.
- Use case: compliance audit, data classification.
- Pricing: per GB scan + storage.

---

## 10. Patterns thực chiến

### 10.1 RDS password rotation
1. RDS dùng KMS encrypt at rest.
2. Secrets Manager lưu password, auto-rotate mỗi 30 ngày qua Lambda.
3. App đọc Secrets Manager mỗi connection (cache 5 phút).
4. Khi rotate: Secrets Manager update RDS password + secret value. App retry → connect bằng pass mới.

### 10.2 Cross-region S3 replication encrypted
1. Source bucket SSE-KMS với key A (region us-east-1).
2. Destination bucket SSE-KMS với key B (region eu-west-1).
3. Source CRR config: encrypt với key B at destination.
4. Replication role có quyền decrypt key A + encrypt key B.

### 10.3 mTLS giữa microservice
1. ACM Private CA issue cert cho mỗi service.
2. Cert nằm trong Secrets Manager hoặc mount qua sidecar (Envoy/AWS App Mesh).
3. Service-to-service traffic encrypt + mutual authentication.

### 10.4 Encrypted everywhere
- S3: SSE-KMS với CMK.
- EBS: encryption default ON.
- RDS: KMS.
- Secrets: Secrets Manager.
- Cert: ACM.
- Audit: CloudTrail KMS event để xem "ai decrypt cái gì".

---

## 11. KMS performance & cost

- **KMS quota**: 5,500 - 30,000 req/s depend region và operation.
- Hit quota → throttle. Use case high-volume: **cache data key**.
- S3 với SSE-KMS có thể tốn KMS API per request — cân nhắc SSE-S3 cho bucket truy cập cực cao.

### Cost optimization
- AWS managed key (free) cho non-audit case.
- CMK chỉ khi cần rotation control, audit, key policy.
- Data key caching SDK (S3 Encryption Client).

---

## 12. Cạm bẫy đề thi (SAA)

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

## 13. Tóm tắt 1 dòng

> Encrypt at rest **mọi nơi** (KMS hoặc service-default), TLS in transit, secret trong **Secrets Manager/Parameter Store**, cert trong **ACM**. Envelope encryption là pattern cốt lõi của KMS. CMK khi cần rotate/audit control.

---

## 14. Bài tập tự kiểm tra

1. App ghi 10TB log/ngày vào S3, SSE-KMS với CMK. KMS bill $500/ngày. Bạn analyze gì và đề xuất giảm cost?
2. Cross-account: account A có S3 bucket SSE-KMS. Account B user cần read. Cấu hình IAM + KMS thế nào?
3. RDS Postgres production chưa encryption. Sếp yêu cầu encrypt all. Plan migration zero-downtime (hoặc downtime minimum)?
4. Lambda function gọi 3rd-party API cần API key. Best practice lưu key ở đâu, retrieve thế nào?
5. So sánh KMS CMK rotation tự động vs manual rotation. Lúc rotate, data cũ có decrypt được không?
6. Compliance PCI-DSS yêu cầu HSM dedicated. So sánh KMS custom key store vs CloudHSM standalone.

---

## 15. Đọc thêm

- AWS Whitepaper — *AWS KMS Cryptographic Details*, *Logical Separation on AWS*.
- AWS docs — *KMS Developer Guide*, *Secrets Manager User Guide*.
- AWS Builder's Library — *Encryption at rest*.

---

**Bài tiếp theo**: [[ch3-04-detective-controls]] — CloudTrail, Config, GuardDuty, Security Hub, incident response.
