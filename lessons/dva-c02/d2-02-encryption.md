# Encryption with KMS & ACM

Bảo mật là Domain 2 của DVA-C02, và phần lớn câu hỏi xoay quanh **AWS KMS**. Bài này tập trung vào cách KMS hoạt động thật sự (envelope encryption), khi nào chọn loại encryption nào, và những cái bẫy mà đề thi rất hay gài. Là developer, bạn sẽ gọi KMS qua SDK nhiều hơn là click console, nên chúng ta sẽ đi theo hướng API/code.

## 1. AWS KMS là gì và giải quyết vấn đề gì

KMS là dịch vụ quản lý **key mã hóa**. Điểm cốt lõi: **plaintext của CMK (Customer Master Key, nay gọi là KMS key) KHÔNG BAO GIỜ rời khỏi KMS**. Bạn không bao giờ tải được key gốc về máy. Mọi thao tác mã hóa/giải mã với chính CMK đều phải gọi API tới KMS.

- CMK được lưu trong **HSM (Hardware Security Module)** đạt chuẩn FIPS 140-2.
- Mọi lời gọi KMS đều được ghi vào **CloudTrail** → audit được ai dùng key, lúc nào.
- KMS tích hợp sẵn với hầu hết service AWS (S3, EBS, RDS, DynamoDB, Secrets Manager, SQS, SNS...).

> 💡 Mẹo thi: Nếu câu hỏi nói "audit mọi lần key được sử dụng" → đáp án là **CloudTrail** (không phải CloudWatch).

## 2. Các loại KMS key (CMK)

Đây là bảng so sánh bạn PHẢI thuộc:

| Loại key | Ai tạo/quản lý | Xoay key (rotation) | Xem được trong account? | Tính phí |
|---|---|---|---|---|
| **Customer managed** | Bạn | Bật/tắt tùy ý, tự rotate được | Có | $1/tháng + per request |
| **AWS managed** (`aws/s3`, `aws/rds`...) | AWS thay bạn | Tự động, bắt buộc, mỗi năm | Có (xem được, không sửa policy) | Miễn phí key, tính per request |
| **AWS owned** | AWS, dùng chung nhiều account | AWS quản lý hoàn toàn | Không | Miễn phí |

Cách phân biệt nhanh:
- Cần **kiểm soát key policy / rotation / xóa key** → **Customer managed**.
- Chỉ cần mã hóa "cho có", AWS lo hết → **AWS managed**.
- **AWS owned** bạn thậm chí không thấy nó trong account (ví dụ một số mã hóa mặc định của DynamoDB).

> ⚠️ Bẫy: **AWS managed key** bạn KHÔNG sửa được key policy và KHÔNG tự bật/tắt rotation (nó tự rotate mỗi năm, cố định). Chỉ **customer managed key** mới cho bạn toàn quyền.

## 3. Envelope Encryption — phần được hỏi NHIỀU NHẤT

Tại sao cần envelope encryption? Vì **KMS Encrypt/Decrypt API chỉ xử lý tối đa 4 KB dữ liệu**. Muốn mã hóa file 1 GB thì sao? → Không gửi 1 GB lên KMS. Thay vào đó:

1. Gọi `GenerateDataKey` → KMS trả về **2 thứ**:
   - **Plaintext data key** (key thật, dùng để mã hóa data ngay tại máy bạn).
   - **Encrypted data key** (chính data key đó nhưng đã được CMK mã hóa).
2. Dùng plaintext data key mã hóa 1 GB dữ liệu **ngay tại client** (bằng AES).
3. **Xóa plaintext data key khỏi RAM** sau khi dùng xong.
4. Lưu **encrypted data key** kèm bên cạnh dữ liệu đã mã hóa.

Khi cần giải mã:
1. Gọi `Decrypt` gửi encrypted data key (nhỏ, < 4KB) → KMS trả về plaintext data key.
2. Dùng plaintext data key giải mã dữ liệu.

```
GenerateDataKey  ──►  { Plaintext, CiphertextBlob }
   Plaintext  ──► mã hóa data tại chỗ ──► xóa khỏi RAM
   CiphertextBlob (encrypted data key) ──► lưu cạnh file
Decrypt(CiphertextBlob) ──► Plaintext ──► giải mã file
```

Ví dụ với CLI:

```bash
# Lấy data key
aws kms generate-data-key \
  --key-id alias/my-key \
  --key-spec AES_256

# Output có "Plaintext" (base64) và "CiphertextBlob" (base64)
```

SDK (Node.js) minh họa luồng:

```javascript
const { KMSClient, GenerateDataKeyCommand, DecryptCommand } = require("@aws-sdk/client-kms");
const kms = new KMSClient({});

// 1. Sinh data key
const { Plaintext, CiphertextBlob } = await kms.send(new GenerateDataKeyCommand({
  KeyId: "alias/my-key",
  KeySpec: "AES_256",
}));

// 2. Dùng Plaintext (Uint8Array) để AES-encrypt data tại client
// 3. Lưu CiphertextBlob cạnh ciphertext, KHÔNG lưu Plaintext

// Khi giải mã:
const { Plaintext: dataKey } = await kms.send(new DecryptCommand({
  CiphertextBlob, // không cần truyền KeyId, KMS tự biết key nào
}));
```

> 💡 Mẹo thi: `GenerateDataKey` trả về **cả plaintext lẫn encrypted version** của data key. Nếu chỉ cần encrypted version (chưa dùng ngay) → dùng `GenerateDataKeyWithoutPlaintext`.

> ⚠️ Bẫy: Câu hỏi kinh điển: "Cần mã hóa file 10 GB bằng KMS, làm thế nào?" → KHÔNG gọi `Encrypt` (vì giới hạn 4KB). Đáp án là **envelope encryption với `GenerateDataKey`**. Đây gần như chắc chắn xuất hiện trong đề.

> ⚠️ Bẫy: `Decrypt` không cần truyền `KeyId` — KMS đọc metadata trong `CiphertextBlob` để biết dùng key nào (trừ multi-Region/asymmetric thì nên truyền). Nhưng truyền KeyId vào là best practice bảo mật để tránh nhầm key.

## 4. Giới hạn 4 KB và khi nào dùng API nào

| API | Dùng khi | Giới hạn |
|---|---|---|
| `Encrypt` | Mã hóa dữ liệu nhỏ (≤ 4KB): password, config, một secret nhỏ | 4 KB |
| `Decrypt` | Giải mã ciphertext do KMS sinh ra | 4 KB ciphertext |
| `GenerateDataKey` | Mã hóa dữ liệu lớn (envelope encryption), trả plaintext + encrypted key | data tùy ý |
| `GenerateDataKeyWithoutPlaintext` | Sinh data key để dùng SAU (chưa mã hóa ngay) | — |
| `ReEncrypt` | Đổi data từ key này sang key khác **mà không lộ plaintext** | 4 KB |

> 💡 Mẹo thi: Con số **4 KB** xuất hiện rất nhiều. Nhớ: `Encrypt`/`Decrypt`/`ReEncrypt` = 4KB; muốn lớn hơn = data key.

## 5. Key Policy vs IAM Policy vs Grants

KMS có cơ chế phân quyền hơi khác các service khác. Có **3 lớp**:

### Key Policy (bắt buộc)
- Mỗi KMS key có **key policy** gắn trực tiếp vào key (resource-based policy).
- **Khác với S3 bucket policy**: với KMS, nếu key policy KHÔNG cho phép, thì IAM policy cũng **vô dụng**. Key policy là "cổng chính".
- Key policy mặc định trao quyền cho **root account** → từ đó IAM policy mới có hiệu lực.

```json
{
  "Sid": "Enable IAM User Permissions",
  "Effect": "Allow",
  "Principal": { "AWS": "arn:aws:iam::111122223333:root" },
  "Action": "kms:*",
  "Resource": "*"
}
```

### IAM Policy
- Cho phép user/role gọi KMS API — nhưng **chỉ có tác dụng nếu key policy đã "mở cửa"** cho account đó (qua dòng `root` ở trên).

### Grants
- Cấp quyền **tạm thời, chi tiết** cho một principal sử dụng key, thường dùng cho **delegation** giữa các service.
- Tạo bằng `CreateGrant`, thu hồi bằng `RevokeGrant`.
- Hữu ích khi cần cấp quyền "dùng key để mã hóa/giải mã" trong thời gian ngắn mà không sửa key policy.

> ⚠️ Bẫy: Đề hay hỏi "User đã có IAM policy `kms:Decrypt` nhưng vẫn bị AccessDenied". Nguyên nhân: **key policy chưa cho phép**. Ngược với hầu hết service khác — với KMS bạn phải nghĩ tới key policy trước.

| Cơ chế | Phạm vi | Tồn tại lâu? | Khi nào dùng |
|---|---|---|---|
| Key policy | Toàn key | Vĩnh viễn | Quyết định ai được dùng key (lớp gốc) |
| IAM policy | Theo user/role | Vĩnh viễn | Quản lý quyền tập trung trong account |
| Grant | Một principal cụ thể | Tạm thời | Delegation, quyền ngắn hạn cho service |

## 6. Key Rotation

| Loại rotation | Áp dụng cho | Chu kỳ | Đổi key material? |
|---|---|---|---|
| **Automatic rotation** | Customer managed key (bật tùy chọn) | Mỗi **1 năm** (365 ngày) | Có, AWS tự sinh material mới |
| AWS managed key | Tự động luôn | Mỗi 1 năm | Có |
| **Manual rotation** | Khi cần rotate sớm hơn / với imported key | Tùy bạn | Tạo key mới, cập nhật alias |

Điểm quan trọng về automatic rotation:
- **Key ID / ARN không đổi**, chỉ key material bên trong đổi. Ứng dụng không cần sửa gì.
- Dữ liệu cũ vẫn giải mã được bằng material cũ (KMS giữ lại material cũ).
- Chỉ áp dụng cho **symmetric customer managed key** (không phải imported/asymmetric mặc định).

> 💡 Mẹo thi: Automatic rotation = **mỗi 1 năm** (trước đây là cố định 365 ngày; nay có thể tùy chỉnh từ 90 ngày trở lên, nhưng đề thường lấy mốc "yearly"). Nhớ con số "1 năm".

> ⚠️ Bẫy: Khi rotate, **alias trỏ vào cùng key, key ID không đổi**. Nếu câu hỏi nói "rotate mà không phải đổi code ứng dụng" → đó là automatic rotation của customer managed key. Manual rotation thì PHẢI cập nhật alias trỏ sang key mới.

## 7. Cross-Account Key Usage

Cho phép account B dùng key của account A. Cần **2 phía**:

1. **Account A (chủ key)**: key policy phải cho phép principal của account B.
2. **Account B**: IAM policy của user/role phải cho phép gọi KMS API trên key đó (ARN đầy đủ của account A).

```json
// Key policy bên account A
{
  "Effect": "Allow",
  "Principal": { "AWS": "arn:aws:iam::ACCOUNT_B:root" },
  "Action": ["kms:Decrypt", "kms:GenerateDataKey"],
  "Resource": "*"
}
```

> ⚠️ Bẫy: Cross-account cần **CẢ HAI**: key policy bên A mở quyền + IAM policy bên B cho phép. Thiếu một bên là AccessDenied. Đề rất hay cho đáp án "chỉ sửa một bên" để bẫy.

> 💡 Mẹo thi: Để share một AMI/snapshot EBS đã mã hóa sang account khác, ngoài share snapshot bạn còn phải share **KMS key** (qua key policy) — nếu không account kia không decrypt được.

## 8. Multi-Region Keys

- Là tập key có **cùng key ID** ở nhiều Region, **cùng key material** (replica).
- Dùng khi: disaster recovery, global table (DynamoDB Global Tables), dữ liệu mã hóa cần đọc được ở nhiều Region mà không gọi cross-Region.
- Ciphertext mã hóa ở Region A có thể decrypt ở Region B **không cần gọi lại Region A**.

> ⚠️ Bẫy: KMS key **mặc định là single-Region**. Ciphertext của key thường KHÔNG dùng được ở Region khác. Muốn dùng đa Region phải tạo **multi-Region key** ngay từ đầu. Đề hay hỏi "data mã hóa ở us-east-1 cần đọc ở eu-west-1 nhanh nhất" → multi-Region keys.

## 9. Encryption at Rest vs in Transit

| | At rest | In transit |
|---|---|---|
| Là gì | Dữ liệu đã lưu trên disk được mã hóa | Dữ liệu đang truyền qua network được mã hóa |
| Công nghệ | KMS, SSE, EBS/RDS/S3 encryption | TLS/SSL (HTTPS), VPN |
| Ví dụ | S3 SSE-KMS, EBS encryption | ACM cert + HTTPS trên ALB |

Best practice: **mã hóa cả hai**. In transit dùng TLS (qua ACM), at rest dùng KMS/SSE.

## 10. Client-side vs Server-side Encryption (S3)

Đây là phần thực chiến quan trọng với developer. Với S3 có các lựa chọn:

| Loại | Ai quản key | Ai mã hóa | Header khi PUT | Ghi chú |
|---|---|---|---|---|
| **SSE-S3** | AWS (key `aws/s3`) | S3 (server) | `x-amz-server-side-encryption: AES256` | Đơn giản nhất, AWS lo hết |
| **SSE-KMS** | KMS key (bạn chọn) | S3 (server) | `x-amz-server-side-encryption: aws:kms` | Audit qua CloudTrail, kiểm soát key policy |
| **SSE-C** | **Bạn** (gửi key theo mỗi request) | S3 (server) | Truyền key trong header mỗi request | S3 không lưu key của bạn; PHẢI dùng HTTPS |
| **Client-side** | Bạn | **Client** (trước khi gửi) | — | S3 chỉ thấy ciphertext; dùng AWS Encryption SDK |

Cách chọn nhanh:
- Muốn đơn giản, không quan tâm key → **SSE-S3**.
- Cần audit ai decrypt, kiểm soát rotation, cross-account → **SSE-KMS**.
- Muốn tự giữ key nhưng để S3 mã hóa → **SSE-C** (bắt buộc HTTPS).
- Không tin server, muốn S3 không bao giờ thấy plaintext → **Client-side**.

```bash
# SSE-KMS khi upload
aws s3 cp file.txt s3://my-bucket/file.txt \
  --sse aws:kms --sse-kms-key-id alias/my-key
```

> ⚠️ Bẫy SSE-KMS: Mỗi lần PUT/GET object SSE-KMS đều gọi KMS (`GenerateDataKey`/`Decrypt`) → có thể chạm **KMS request throttle** khi traffic cao. Giải pháp: bật **S3 Bucket Keys** để giảm số lần gọi KMS (dùng một bucket-level data key). Đề hay hỏi cách giảm chi phí/throttle KMS với S3 → **S3 Bucket Keys**.

> ⚠️ Bẫy SSE-C: KMS KHÔNG liên quan ở đây — key do bạn cung cấp trong từng request. S3 dùng key đó để mã hóa rồi **quên key đi** (chỉ lưu HMAC để verify). Bắt buộc HTTPS vì key đi qua header.

> 💡 Mẹo thi: Phân biệt "Ai giữ key" và "Ai thực hiện mã hóa":
> - SSE-* → **server (S3)** mã hóa.
> - Client-side → **client** mã hóa, S3 chỉ lưu ciphertext.
> - SSE-C và Client-side đều do **bạn** giữ key, nhưng khác nhau ở chỗ ai thực hiện việc mã hóa.

## 11. ACM (AWS Certificate Manager)

ACM quản lý **TLS/SSL certificate** cho encryption **in transit**.

- **Cung cấp và tự động gia hạn cert MIỄN PHÍ** cho các public cert dùng với AWS service.
- Tích hợp với: **ELB/ALB, CloudFront, API Gateway** (không deploy trực tiếp lên EC2).
- Tự động renew → hết hạn cert là chuyện của quá khứ (với cert do ACM cấp).

| | ACM public cert | ACM Private CA |
|---|---|---|
| Dùng cho | Public website (HTTPS internet) | Internal/private (microservices, internal API) |
| Tin cậy bởi | Trình duyệt công cộng | Chỉ trong tổ chức của bạn |
| Chi phí | Miễn phí | Trả phí (CA + cert) |
| Tự gia hạn | Có | Có (cấu hình được) |

> ⚠️ Bẫy ACM: ACM cert public KHÔNG gắn trực tiếp lên **EC2 instance**. Phải dùng qua ALB/CloudFront/API Gateway. Muốn cert trên EC2 → tự import hoặc dùng Private CA.

> 💡 Mẹo thi: "Cần HTTPS, tự động gia hạn, miễn phí, dùng với ALB/CloudFront" → **ACM public cert**. "Cần cert nội bộ cho microservice không expose internet" → **ACM Private CA**.

> 💡 Mẹo thi: ACM cert (public) chỉ dùng được trong **Region** của nó, RIÊNG **CloudFront yêu cầu cert ở Region us-east-1** (N. Virginia). Đây là một bẫy hay gặp.

## 12. Tổng hợp bẫy thi hay gặp

- **File > 4KB** → không dùng `Encrypt`, dùng **envelope encryption / `GenerateDataKey`**.
- `GenerateDataKey` trả **plaintext + encrypted** data key; nhớ xóa plaintext khỏi RAM.
- **IAM policy có `kms:Decrypt` nhưng vẫn AccessDenied** → thiếu quyền trong **key policy**.
- **Automatic rotation** chỉ cho **customer managed symmetric key**, chu kỳ **1 năm**, key ID không đổi.
- **AWS managed key** không sửa được key policy, không tự bật/tắt rotation.
- **Cross-account**: cần CẢ key policy (A) lẫn IAM policy (B).
- **Ciphertext không xài được ở Region khác** trừ khi là **multi-Region key**.
- **SSE-KMS chạm throttle** → bật **S3 Bucket Keys**.
- **SSE-C** không liên quan KMS, bắt buộc HTTPS.
- **ACM public cert** không gắn trực tiếp EC2; **CloudFront cần cert ở us-east-1**.

> 💡 Mẹo thi tổng: Khi gặp câu hỏi security, luôn tự hỏi 3 điều: (1) Ai giữ key? (2) Ai thực hiện mã hóa (client hay server)? (3) Quyền được cấp ở key policy hay IAM? Trả lời được 3 câu này là loại được phần lớn đáp án sai.
