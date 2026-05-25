# Solution — Practice 10

## Exercise 2 — Boundary chống escalation

Boundary `DevBoundary`:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:*","dynamodb:*","logs:*","lambda:*"],
    "Resource": "*"
  }]
}
```

Dev policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CreateAppRolesWithBoundary",
      "Effect": "Allow",
      "Action": ["iam:CreateRole","iam:AttachRolePolicy","iam:PutRolePolicy","iam:GetRole","iam:PassRole"],
      "Resource": "arn:aws:iam::*:role/app-*",
      "Condition": {
        "StringEquals": {
          "iam:PermissionsBoundary": "arn:aws:iam::ACCOUNT:policy/DevBoundary"
        }
      }
    },
    {
      "Sid": "DenyBoundaryRemoval",
      "Effect": "Deny",
      "Action": ["iam:DeleteRolePermissionsBoundary","iam:PutRolePermissionsBoundary"],
      "Resource": "*"
    },
    {
      "Sid": "ScopePassRole",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::*:role/app-*",
      "Condition": {
        "StringEquals": { "iam:PassedToService": "lambda.amazonaws.com" }
      }
    }
  ]
}
```

**Kết quả test:**
- Tạo `app-myapp` + S3RO + boundary → **OK**.
- Tạo `BadAdmin` không boundary → **DENY** (condition fail).
- Tạo `app-evil` + AdminAccess + boundary → **OK tạo**. Nhưng khi role này gọi `ec2:RunInstances` → DENY (boundary không cho EC2). **Effective = giao(Admin, Boundary) = S3/DDB/Logs/Lambda only**.

## Exercise 5 — Đáp án đọc policy

| # | Kết quả | Lý do |
|---|---------|-------|
| 1 | DENY | SCP deny là trần, dù Admin. |
| 2 | DENY | Boundary cap = `s3:Get*`. PutObject vượt cap. |
| 3 | DENY | Cross-account cần CẢ 2 bên Allow. B user `c` không có identity policy → deny. |
| 4 | DENY | Trust chỉ `ec2.amazonaws.com` (service principal). User không match. |
| 5 | DENY | Explicit Deny ở bucket policy thắng. |
| 6 | DENY | Condition `RequestedRegion` không match. |

## Exercise 6 — Escalation path & fix

**Escalation step-by-step:**
1. Dev tạo role `EvilRole` (`iam:CreateRole`).
2. Attach `AdministratorAccess` (`iam:AttachRolePolicy` on `*`).
3. Tạo Lambda function `evil` (`lambda:CreateFunction`), gán role `EvilRole` (`iam:PassRole: *`).
4. Invoke Lambda (`lambda:InvokeFunction`). Lambda chạy với Admin permission.
5. Lambda code: tạo IAM user mới gắn AdministratorAccess, attach access key, return key cho dev.

**Fix:**
1. **Giới hạn `iam:PassRole`**:
   ```json
   {
     "Effect": "Allow",
     "Action": "iam:PassRole",
     "Resource": "arn:aws:iam::*:role/app-*",
     "Condition": {
       "StringEquals": { "iam:PassedToService": "lambda.amazonaws.com" }
     }
   }
   ```
2. **Permission Boundary** trên role tạo bởi dev (bắt buộc qua condition).
3. **Deny iam:AttachRolePolicy với managed policy admin**:
   ```json
   {
     "Effect": "Deny",
     "Action": "iam:AttachRolePolicy",
     "Resource": "*",
     "Condition": {
       "ArnEquals": {
         "iam:PolicyARN": [
           "arn:aws:iam::aws:policy/AdministratorAccess",
           "arn:aws:iam::aws:policy/IAMFullAccess"
         ]
       }
     }
   }
   ```

3 lớp này combine → escalate gần như impossible.
