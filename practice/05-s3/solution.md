# Solution — Practice 05

## Exercise 4 — Lifecycle cost (1TB, 30% access/tháng, ap-southeast-1)

Giá tham khảo:
- Standard: $0.025/GB
- IA: $0.0138/GB + retrieval $0.01/GB
- Glacier Flexible: $0.0045/GB + retrieval $0.01/GB
- Deep Archive: $0.00099/GB
- Intelligent-Tiering: $0.025 (frequent) → $0.0125 (IA) → $0.004 (archive)

| Scenario | Storage | Retrieval | Total/tháng |
|----------|---------|-----------|-------------|
| All Standard | $25.6 | 0 | **$25.6** |
| 30d→IA, 90d→Glacier (giả định steady state) | ~$10 | $3 | **~$13** |
| Intelligent-Tiering | ~$12 (mix tier) | 0 | **~$12** |
| Deep Archive (access 1/năm) | $1.01 | $3 retrieval khi access | **$1.01 + retrieval khi cần** |

→ Pattern access ổn định → Lifecycle hoặc IT. Archive lâu → Deep Archive.

## Exercise 5 — Bucket policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyHTTP",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::my-bucket","arn:aws:s3:::my-bucket/*"],
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    },
    {
      "Sid": "DenyUnencryptedUpload",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-bucket/*",
      "Condition": {
        "StringNotEquals": { "s3:x-amz-server-side-encryption": ["AES256","aws:kms"] }
      }
    },
    {
      "Sid": "CrossAccountWriteIncoming",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::222222222222:root" },
      "Action": ["s3:PutObject","s3:PutObjectAcl"],
      "Resource": "arn:aws:s3:::my-bucket/incoming/*"
    }
  ]
}
```
