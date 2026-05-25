# Solution — Practice 03

## Exercise 2 — Policy với MFA + Region condition

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3RWWithMFA",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::learn-private-123456789012/*",
      "Condition": {
        "Bool": { "aws:MultiFactorAuthPresent": "true" },
        "StringEquals": { "aws:RequestedRegion": "ap-southeast-1" }
      }
    },
    {
      "Sid": "AllowListBucket",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::learn-private-123456789012",
      "Condition": {
        "Bool": { "aws:MultiFactorAuthPresent": "true" },
        "StringEquals": { "aws:RequestedRegion": "ap-southeast-1" }
      }
    }
  ]
}
```

Notes:
- `s3:ListBucket` cần ARN bucket (không có `/*`), khác với `GetObject` cần `/*`.
- Có thể dùng `NumericLessThan` với `aws:MultiFactorAuthAge: 3600` để bắt MFA refresh trong 1h.

## Exercise 4 — Cross-account
1. Trust policy đặt ở **account A** (account chứa role).
2. `sts:AssumeRole` permission đặt ở **account B** (user `bob` cần được phép gọi `sts:AssumeRole` lên ARN role A).
3. Thêm condition trong trust policy của role A:
   ```json
   "Condition": { "Bool": { "aws:MultiFactorAuthPresent": "true" } }
   ```
   Hoặc thêm `ExternalId` để chống "confused deputy" khi third-party assume.

## Exercise 5 — Policy Evaluation

| # | Kết quả | Lý do |
|---|---------|-------|
| 1 | **DENY** | SCP là trần. Admin = trong tài khoản, nhưng SCP chặn → deny. |
| 2 | **DENY** | Explicit Deny ở bucket policy luôn thắng. |
| 3 | **DENY** | Cross-account cần CẢ 2 bên Allow. Trong B, `c` không có identity policy về S3 → deny. |
| 4 | **DENY** | Permission Boundary cap tối đa = `s3:Get*`. `PutObject` ngoài cap → deny. |
| 5 | **DENY** | Condition không match (`ap-southeast-1` ≠ `us-east-1`). |
| 6 | **DENY** | Trust policy chỉ trust `ec2.amazonaws.com` (service). User không thể AssumeRole. |
