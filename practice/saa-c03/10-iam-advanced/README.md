# Practice 10 — IAM Advanced

Liên kết bài: [lessons/saa-c03/10-iam-advanced.md](../../../lessons/saa-c03/10-iam-advanced.md)

## Mục tiêu
- Hands-on cross-account, ExternalId, Boundary, OIDC, ABAC.
- Train đọc policy phức tạp.

---

## Exercise 1 — Cross-account với ExternalId (cần 2 account hoặc LocalStack)
```bash
cd practice/saa-c03/10-iam-advanced/localstack
./ex1-cross-account-externalid.sh
```
Tạo Role ở account A trust account B với ExternalId. Test assume với và không ExternalId.

## Exercise 2 — Permission Boundary chống escalation (AWS thật, 30 phút)
1. Tạo policy `DevBoundary` (S3, DDB, Logs, Lambda only).
2. Tạo user `dev` với policy chỉ cho `iam:CreateRole` + `iam:AttachRolePolicy` trên role `app-*`, **bắt buộc** boundary.
3. Test 3 case:
   - Tạo `app-myapp` + S3 ReadOnly + boundary → ✅
   - Tạo `BadAdmin` + Admin không boundary → ❌
   - Tạo `app-evil` + Admin + boundary → ✅ tạo, nhưng effective = giao = chỉ S3/DDB/Logs/Lambda

→ [solution.md § Ex2](solution.md#exercise-2)

## Exercise 3 — GitHub Actions OIDC (45 phút, AWS thật)
1. Tạo OIDC provider:
   ```bash
   aws iam create-open-id-connect-provider \
     --url https://token.actions.githubusercontent.com \
     --client-id-list sts.amazonaws.com \
     --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
   ```
2. Tạo role `gh-deploy` với trust policy condition `sub` = repo cụ thể.
3. Tạo workflow `.github/workflows/test-oidc.yml` chỉ chạy `aws sts get-caller-identity`.
4. Push → workflow chạy → confirm caller-identity = role.

**Tiêu chí pass:** workflow chạy thành công không có secret AWS nào trong repo.

## Exercise 4 — ABAC theo Project tag (20 phút)
1. User `alice` tag `Project=alpha`. User `bob` tag `Project=beta`.
2. 2 EC2: 1 tag `Project=alpha`, 1 tag `Project=beta`.
3. Policy chung:
   ```json
   {
     "Effect": "Allow",
     "Action": ["ec2:StartInstances","ec2:StopInstances","ec2:RebootInstances"],
     "Resource": "*",
     "Condition": {
       "StringEquals": {"aws:PrincipalTag/Project": "${aws:ResourceTag/Project}"}
     }
   }
   ```
4. Test: alice stop alpha-EC2 ✅, alice stop beta-EC2 ❌.

## Exercise 5 — Đọc policy (no-cost, drill)

| # | Policy | Action | Kết quả? |
|---|--------|--------|----------|
| 1 | SCP deny `s3:*`. User Admin. | `s3:ListBuckets` | |
| 2 | Identity allow `s3:*`. Boundary chỉ `s3:Get*`. | `s3:PutObject` | |
| 3 | Bucket policy allow B account; B user `c` không có IAM policy. | `s3:GetObject` từ B | |
| 4 | Role trust EC2 service. User cố AssumeRole. | `sts:AssumeRole` | |
| 5 | Identity allow `s3:*`. Bucket policy deny `s3:DeleteObject` cho principal. | `s3:DeleteObject` | |
| 6 | Identity allow `ec2:*` condition `aws:RequestedRegion=us-east-1`. Caller từ `ap-southeast-1`. | `ec2:RunInstances` | |

→ [solution.md § Ex5](solution.md#exercise-5)

## Exercise 6 — iam:PassRole escalation (giấy)
Cho dev có:
- `iam:CreateRole`, `iam:AttachRolePolicy`, `iam:PassRole: *`
- `lambda:CreateFunction`, `lambda:InvokeFunction`

Mô tả từng bước dev có thể escalate thành Admin. Sau đó viết policy fix bằng cách giới hạn `iam:PassRole`.

→ [solution.md § Ex6](solution.md#exercise-6)

## Exercise 7 — Access Analyzer (10 phút, AWS thật, free)
1. IAM → Access Analyzer → Create analyzer (account-level).
2. Tạo S3 bucket policy `"Principal": "*"`.
3. Đợi 1–2 phút → finding xuất hiện.
4. Click finding → "Archive" với note (whitelist).
5. Tạo role trust account khác → finding cross-account.

## Exercise 8 — IRSA cho EKS (advanced, ~$0.10/h EKS)
Nếu có EKS cluster:
1. Get OIDC issuer:
   ```bash
   aws eks describe-cluster --name $CLUSTER --query 'cluster.identity.oidc.issuer'
   ```
2. Tạo OIDC provider trong IAM.
3. Tạo Role trust OIDC + condition `sub: system:serviceaccount:default:my-sa`.
4. Annotate ServiceAccount `eks.amazonaws.com/role-arn: arn:aws:iam::...:role/MyRole`.
5. Pod nhận temp credential per-pod (không share node role).

## Teardown
```bash
./teardown.sh
```
Xóa users, roles, policies, OIDC provider, analyzer.
