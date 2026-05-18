# Practice 03 — IAM

Liên kết bài: [lessons/03-iam.md](../../lessons/03-iam.md)

## Mục tiêu
- Tạo User/Group/Role/Policy bằng CLI.
- Đọc + viết JSON policy đúng.
- Hiểu Policy Evaluation Logic qua thử nghiệm thực tế.
- Setup OIDC federation cho GitHub Actions (no long-term key).

---

## Exercise 1 — Tạo Group + User (LocalStack hoặc AWS thật)

```bash
cd practice/03-iam/localstack
./exercise-1-group.sh
```

Script tạo:
- Group `learn-developers` với `ReadOnlyAccess`.
- User `alice` add vào group.
- Tạo access key, cấu hình profile `alice`.
- Test: `alice` `s3 ls` OK, `s3 mb` bị deny.

**Tiêu chí pass:** `alice` không tạo được S3 bucket, đúng kỳ vọng read-only.

---

## Exercise 2 — Viết JSON Policy
Viết file `policy-1.json` để **chỉ** cho phép:
- `s3:GetObject` + `s3:PutObject` lên bucket `learn-private-${ACCOUNT_ID}`
- Khi caller có MFA.
- Khi caller request từ region `ap-southeast-1`.

```bash
# Test bằng IAM Policy Simulator hoặc:
awslocal iam create-policy --policy-name TestPolicy --policy-document file://policy-1.json
```

Đáp án: [solution.md § Ex2](solution.md#exercise-2).

---

## Exercise 3 — IAM Role cho EC2 (Instance Profile)

```bash
cd practice/03-iam/localstack
./exercise-3-ec2-role.sh
```

Script demo:
1. Tạo role `learn-ec2-s3-reader` với trust policy `ec2.amazonaws.com`.
2. Attach `AmazonS3ReadOnlyAccess`.
3. Tạo instance profile + add role.
4. (Trên AWS thật) launch EC2 với profile, SSH vào, `aws s3 ls` không cần access key.

---

## Exercise 4 — Cross-account AssumeRole (2 account, LocalStack mock)

```bash
./exercise-4-cross-account.sh
```

Mô phỏng:
- Account A (`111111111111`) có role `CrossRead` trust account B.
- Account B user `bob` assume role và list S3 của A.

**Câu hỏi:**
1. Trust policy đặt ở account nào?
2. `sts:AssumeRole` permission đặt ở account nào?
3. Làm sao bắt `bob` phải có MFA mới assume được?

---

## Exercise 5 — Policy Evaluation Drill (no-cost, trên giấy)

Cho các tình huống sau, predict kết quả:

| # | Tình huống | Allow / Deny? |
|---|------------|---------------|
| 1 | SCP deny `s3:*`. User có Admin. Gọi `s3:ListBuckets` | |
| 2 | Identity Allow `s3:*`. Bucket policy Deny `s3:DeleteObject` cho user đó. Gọi DeleteObject | |
| 3 | Cross-account: bucket policy account A allow account B principal. Trong B, user `c` không có policy nào về S3. `c` gọi GetObject | |
| 4 | Permission Boundary giới hạn `s3:Get*`. Identity policy allow `s3:*`. Gọi `s3:PutObject` | |
| 5 | Identity Allow `ec2:*`. Condition `aws:RequestedRegion: us-east-1`. Gọi từ `ap-southeast-1` | |
| 6 | Role trust policy chỉ trust `ec2.amazonaws.com`. User cố AssumeRole | |

→ Đáp án [solution.md § Ex5](solution.md#exercise-5).

---

## Exercise 6 — GitHub Actions OIDC (advanced, AWS thật)

Setup CI deploy lên AWS **không cần access key**:

1. Tạo OIDC provider:
   ```bash
   aws iam create-open-id-connect-provider \
     --url https://token.actions.githubusercontent.com \
     --client-id-list sts.amazonaws.com \
     --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
   ```

2. Tạo Role `gh-actions-deployer` với trust policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Principal": { "Federated": "arn:aws:iam::<ACCOUNT>:oidc-provider/token.actions.githubusercontent.com" },
       "Action": "sts:AssumeRoleWithWebIdentity",
       "Condition": {
         "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
         "StringLike": { "token.actions.githubusercontent.com:sub": "repo:dan10002ht/aws-learner:*" }
       }
     }]
   }
   ```

3. Workflow `.github/workflows/deploy.yml`:
   ```yaml
   permissions:
     id-token: write
     contents: read
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: aws-actions/configure-aws-credentials@v4
           with:
             role-to-assume: arn:aws:iam::<ACCOUNT>:role/gh-actions-deployer
             aws-region: ap-southeast-1
         - run: aws sts get-caller-identity
   ```

**Tiêu chí pass:** Workflow chạy `get-caller-identity` thành công không có secret nào trong GitHub repo.

---

## Teardown
```bash
./teardown.sh
```
Xóa: user, group, role, policy, instance profile, OIDC provider.
