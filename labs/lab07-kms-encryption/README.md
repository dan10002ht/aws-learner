# Lab 07 — KMS Encryption Deep

> **Trạng thái:** Skeleton — chưa có `lab.sh`. Sẽ bổ sung sau.

Lesson: [../../lessons/saa-c03/11-kms.md](../../lessons/saa-c03/11-kms.md), [../../lessons/saa-c03/ch3-03-data-protection.md](../../lessons/saa-c03/ch3-03-data-protection.md)

## Mục tiêu
Hiểu **envelope encryption** và phân biệt 3 loại CMK:

- **AWS owned key** — AWS quản lý, miễn phí, không thấy được
- **AWS managed key** (aws/service) — auto rotate yearly, free
- **Customer managed key (CMK)** — bạn tạo, $1/tháng/key, control đầy đủ

## Kiến thức SAA-C03 trọng tâm

| Khái niệm | Bẫy đề thi |
|---|---|
| **Envelope encryption** | Plaintext data → encrypted bằng **data key** (DEK). DEK được encrypt bằng **CMK**. Lưu cả ciphertext + encrypted-DEK |
| **`GenerateDataKey`** | Trả về **plaintext DEK + encrypted DEK**. Encrypt xong **phải xóa plaintext DEK** khỏi memory |
| **`Encrypt`/`Decrypt` API** | Chỉ cho payload ≤ 4 KB. Lớn hơn → envelope |
| **Key policy vs IAM policy** | KMS dùng **cả hai**: phải có quyền ở **cả** key policy và IAM (trừ khi key policy có `kms:*` root) |
| **Grant** | Cấp quyền tạm trên CMK, phù hợp với AWS service cần dùng key chéo account |
| **Automatic rotation** | Mặc định tắt với CMK, bật → rotate yearly. **Không** rotate AWS managed keys (AWS tự lo) |
| **Multi-region key** | 1 keyId, replicate sang region khác — cùng material; phù hợp DR + Aurora Global |
| **Cross-account** | Key policy phải allow account khác, **và** IAM ở account đó phải allow |
| **KMS request quota** | 5500–30000 req/s tuỳ region; có thể bị throttle với high-traffic encrypt/decrypt |

### Scenario hay gặp

**Q:** App encrypt file 100 MB upload lên S3. Dùng KMS `Encrypt` API trực tiếp được không?

<details><summary>Đáp án</summary>
**Không** — limit 4 KB. Phải dùng envelope: `GenerateDataKey` → encrypt file bằng DEK plaintext (AES-256), lưu encrypted DEK kèm file. Hoặc dùng **SSE-KMS** ở S3, nó tự làm envelope cho bạn.
</details>

**Q:** App ở account A cần decrypt object ở S3 account B, S3 encrypt bằng CMK của account B. Cấu hình gì?

<details><summary>Đáp án</summary>
(1) Key policy của CMK ở B: allow IAM principal của A `kms:Decrypt`. (2) IAM của user/role ở A: allow `kms:Decrypt` trên ARN của CMK đó. (3) S3 bucket policy ở B allow account A. **Cả 3** phải có.
</details>

**Q:** Need multi-region DR cho Aurora encrypted. Key strategy?

<details><summary>Đáp án</summary>
**Multi-region KMS key** — primary ở region A, replica ở region B. Aurora Global Database dùng key tương ứng region. Không cần re-encrypt khi replicate.
</details>

## Plan script (sẽ viết)

```bash
# 1. Tạo CMK
awslocal kms create-key --description "lab07 cmk"
awslocal kms create-alias --alias-name alias/lab07 --target-key-id <keyId>

# 2. Envelope encrypt 1 file
awslocal kms generate-data-key --key-id alias/lab07 --key-spec AES_256
# → dùng Plaintext key encrypt local, lưu CiphertextBlob

# 3. SSE-KMS trên S3 bucket
awslocal s3api put-bucket-encryption --bucket lab07-bucket \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"aws:kms","KMSMasterKeyID":"alias/lab07"}}]}'

# 4. Test key policy: deny user X dù IAM allow → vẫn fail
```

## Câu hỏi tự kiểm tra

1. AWS managed key có rotate không? Bao lâu?
2. Khi key bị schedule deletion, có cancel được không? Thời gian min/max?
3. Vì sao envelope encryption an toàn hơn khi xử lý file lớn?
