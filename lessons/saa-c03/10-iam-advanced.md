# Bài 10 — IAM Advanced

**Prerequisite:** [../clf-c02/03-iam.md](../clf-c02/03-iam.md) (User/Group/Role/Policy cơ bản, evaluation order sơ lược).

## 1. Mục tiêu
Sau bài này bạn có thể:
- Đọc đúng **policy evaluation order** đầy đủ (SCP → Resource → Identity → Boundary → Session).
- Thiết kế **cross-account access** đúng pattern (resource policy vs AssumeRole, ExternalId).
- Sử dụng **Permission Boundary** để delegate an toàn.
- Cấu hình **federation** (SAML, OIDC, Cognito, IAM Roles Anywhere).
- Áp dụng **ABAC** (attribute-based) thay RBAC khi scale.
- Tránh **privilege escalation** qua iam:PassRole / sts:AssumeRole.

---

## 2. Lý thuyết

### 2.1 Policy Evaluation Order — đầy đủ

Khi 1 principal gọi API, AWS đánh giá theo thứ tự sau. **Bất kỳ Explicit Deny nào → DENY**.

```
1. Organizations SCP             (giới hạn account, không grant)
2. Resource-based Policy         (vd S3 bucket policy, KMS key policy)
3. Identity-based Policy         (gắn user/role)
4. Permission Boundary           (giới hạn trần user/role)
5. Session Policy                (truyền vào AssumeRole)
```

**Quy tắc vàng:**
- **Default = Deny**. Không Allow nào → Deny.
- **Explicit Deny luôn thắng** mọi Allow.
- **Cross-account**: cần **Allow ở cả 2 bên** (resource policy bên A + identity policy bên B).
- **Same-account**: chỉ cần Allow ở **1 bên** (resource HOẶC identity).
- **SCP áp principal trong account đó**, **không áp management account**, **không áp principal từ account khác** (kể cả khi gọi vào resource account này).
- **Boundary + Identity**: hiệu lực **= giao** của 2 cái. Identity allow `s3:*` + Boundary chỉ `s3:Get*` → còn `s3:Get*`.

### 2.2 Resource-based vs Identity-based — bảng so sánh

| | Identity-based | Resource-based |
|--|---------------|----------------|
| Gắn vào | User/Group/Role | Resource (S3, KMS, SQS, SNS, Lambda, ECR, EFS, Secrets Manager…) |
| Principal field | Không (mặc định = principal mang policy) | **Có** (chỉ định AI được phép) |
| Cross-account | Phải AssumeRole | **Cho phép trực tiếp** không cần AssumeRole |
| Hỗ trợ NotPrincipal | Không | Có |
| Có thể grant | Có | Có |

**Use case quyết định:**
- S3 bucket cho partner account đọc → **Resource policy** (đơn giản hơn AssumeRole).
- Audit trace ai làm gì → **AssumeRole** (CloudTrail thấy session).
- DynamoDB cross-account? → DDB **KHÔNG** có resource policy → bắt buộc AssumeRole.
- Lambda cross-account invoke → có **resource policy** (`lambda:InvokeFunction`), không cần AssumeRole.

### 2.3 Cross-account access patterns

#### Pattern A — Resource policy trực tiếp (đơn giản)
**Khi nào**: S3, KMS, Lambda, SNS, SQS, Secrets Manager (service có resource policy).

```
Account A (resource) → bucket policy allow account B principal
Account B (caller)    → user/role có IAM policy s3:GetObject
```

→ Caller B gọi trực tiếp `s3:GetObject` lên bucket A. Không AssumeRole.

#### Pattern B — AssumeRole (audit tốt)
**Khi nào**: DynamoDB, EC2, RDS (không có resource policy), hoặc khi cần audit role usage.

```
Account A (trusting) → tạo Role `XAccessor` với:
  - Trust policy: Principal = arn:aws:iam::B:root (hoặc cụ thể user/role B)
  - Permissions policy: s3:* / dynamodb:* …
Account B (trusted)  → user/role có sts:AssumeRole trên ARN role A
```

Caller B chạy:
```bash
aws sts assume-role \
  --role-arn arn:aws:iam::A:role/XAccessor \
  --role-session-name "alice@$(date +%s)" \
  --external-id "secret-shared-string"
```

→ Nhận temp credential (1h default, max 12h).

#### Pattern C — ExternalId (chống "confused deputy")

**Bài toán**: Bạn (account A) thuê 3rd-party SaaS (account X) monitor AWS bills của bạn. Bạn tạo Role trust X. Nhưng X cũng monitor cho 1000 customer khác. Nếu X bị compromise + attacker biết ARN role bạn → assume được, **vì trust = `Principal: X-account`**.

**Fix**: bắt buộc `ExternalId` (chỉ X và bạn biết):
```json
{
  "Effect": "Allow",
  "Principal": { "AWS": "arn:aws:iam::X:root" },
  "Action": "sts:AssumeRole",
  "Condition": {
    "StringEquals": { "sts:ExternalId": "RandomSecret-Acme-2026" }
  }
}
```

Attacker không có ExternalId → không assume được.

→ **Rule**: mọi 3rd-party role **bắt buộc** ExternalId. Tự nội bộ không cần.

### 2.4 Permission Boundary — delegation an toàn

**Bài toán**: Sếp muốn dev tự tạo IAM role cho Lambda của họ, nhưng không cho dev tạo Admin role để escalate.

**Sai (cho `iam:*`)**: dev tạo `MyAdmin` rồi assume → escalate.

**Đúng (Boundary)**:

1. Tạo `DevBoundary` (max permission):
```json
{
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:*", "dynamodb:*", "logs:*", "lambda:*"],
    "Resource": "*"
  }]
}
```

2. Gắn vào dev user policy:
```json
{
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["iam:CreateRole", "iam:AttachRolePolicy", "iam:PutRolePolicy"],
      "Resource": "arn:aws:iam::*:role/app-*",
      "Condition": {
        "StringEquals": {
          "iam:PermissionsBoundary": "arn:aws:iam::123:policy/DevBoundary"
        }
      }
    },
    {
      "Effect": "Deny",
      "Action": ["iam:DeleteRolePermissionsBoundary", "iam:PutRolePermissionsBoundary"],
      "Resource": "*"
    }
  ]
}
```

3. Dev tạo role được, **bắt buộc gắn boundary**, **không xóa được boundary**.

**Effective permission của role mới = giao(identity policy, boundary)**.

### 2.5 Federation — 4 cách

| Cách | Khi nào | Identity provider | API |
|------|---------|-------------------|-----|
| **SAML 2.0** | Enterprise SSO (AD FS, Okta SAML) | IdP tự setup | `AssumeRoleWithSAML` |
| **OIDC** (Web Identity) | GitHub Actions, Kubernetes ServiceAccount, mobile (Google/FB) | IdP có OIDC endpoint | `AssumeRoleWithWebIdentity` |
| **IAM Identity Center** (best for AWS) | Multi-account SSO | AWS managed (hoặc external) | Internal |
| **IAM Roles Anywhere** | Workload on-prem | Private CA + X.509 cert | `CreateSession` (signed) |

#### GitHub Actions OIDC — pattern cực phổ biến
1. Tạo OIDC provider 1 lần:
   ```bash
   aws iam create-open-id-connect-provider \
     --url https://token.actions.githubusercontent.com \
     --client-id-list sts.amazonaws.com \
     --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
   ```

2. Role với trust policy điều kiện theo repo + branch:
   ```json
   {
     "Effect": "Allow",
     "Principal": { "Federated": "arn:aws:iam::ACCOUNT:oidc-provider/token.actions.githubusercontent.com" },
     "Action": "sts:AssumeRoleWithWebIdentity",
     "Condition": {
       "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
       "StringLike": {
         "token.actions.githubusercontent.com:sub": "repo:acme/web:ref:refs/heads/main"
       }
     }
   }
   ```

3. Workflow:
   ```yaml
   permissions:
     id-token: write
     contents: read
   jobs:
     deploy:
       steps:
         - uses: aws-actions/configure-aws-credentials@v4
           with:
             role-to-assume: arn:aws:iam::ACCOUNT:role/gh-deploy
             aws-region: ap-southeast-1
   ```

→ **Không có secret AWS** trong GitHub repo.

#### Cognito Identity Pool — mobile/web user
```
User login Google/FB/Apple → IdToken
  ↓
Cognito Identity Pool exchange → AWS temp credential
  ↓
Mobile app SDK upload S3 trực tiếp (chỉ với prefix /users/{sub}/)
```

Role có condition `${cognito-identity.amazonaws.com:sub}` giới hạn user chỉ upload prefix của họ.

### 2.6 ABAC — attribute-based access control

**RBAC** (truyền thống): user → role → permission. Scale linear theo số role.

**ABAC**: dùng **tag** trên principal + resource. 1 policy → cover hàng nghìn resource.

#### Ví dụ
Mỗi project có 1 tag `Project`. EC2/S3/DDB resource gắn tag tương ứng. User cũng gắn tag.

Policy chung:
```json
{
  "Effect": "Allow",
  "Action": ["ec2:StartInstances", "ec2:StopInstances"],
  "Resource": "*",
  "Condition": {
    "StringEquals": {
      "aws:PrincipalTag/Project": "${aws:ResourceTag/Project}"
    }
  }
}
```

→ User tag `Project=alpha` chỉ start/stop EC2 tag `Project=alpha`. Thêm project mới = thêm tag, **không cần sửa policy**.

**Best practice**:
- Bật **Tag Editor** + **SCP enforce tag on resource creation**.
- Define tag schema sớm: `Project`, `Environment`, `Owner`, `CostCenter`.

### 2.7 Privilege Escalation — bẫy iam:PassRole + sts:AssumeRole

#### iam:PassRole là gì?
Khi user tạo resource và gắn role cho resource đó (EC2 với instance profile, Lambda với execution role, ECS task với task role…), AWS check user có quyền **`iam:PassRole`** trên role đó không.

#### Lỗ hổng kinh điển
Dev có:
- `iam:CreateRole` + `iam:AttachRolePolicy`
- `lambda:CreateFunction`
- `iam:PassRole` trên `*` (sai!)

→ Dev tự tạo role `Escalator` đính `AdministratorAccess`, tạo Lambda gắn role, invoke Lambda → Admin.

#### Fix
Giới hạn `iam:PassRole` theo resource:
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

→ Chỉ pass được role có prefix `app-*` và chỉ cho Lambda service. Cộng với Permission Boundary → an toàn.

### 2.8 Service-linked Role (SLR)
- Role do **AWS service tự tạo + quản lý**.
- Tên có prefix `AWSServiceRoleFor...`.
- KHÔNG sửa được trust policy.
- Use case: GuardDuty, Config, Organizations, Auto Scaling…

→ Đề thi: thấy "service tự setup permission" → SLR.

### 2.9 IAM Access Analyzer
- Phát hiện resource share **ra ngoài account/org** (S3 bucket public, IAM role trust account khác…).
- **Findings** review weekly.
- **Policy generation** tự tạo policy least-privilege từ CloudTrail history.
- **Custom policy check** validate policy trước deploy (CI/CD integration).

### 2.10 STS deep

| API | Use case | Max duration |
|-----|----------|--------------|
| `AssumeRole` | Cross-account/within-account role | **12h** (role config) |
| `AssumeRoleWithSAML` | SAML federation | **12h** |
| `AssumeRoleWithWebIdentity` | OIDC (GitHub, Cognito, Google) | **12h** |
| `GetSessionToken` | MFA-protected session cho IAM user | **36h** (default 12h) |
| `GetFederationToken` | Federation cho user không IAM (legacy) | **36h** |

**Regional endpoint** — luôn dùng `sts.<region>.amazonaws.com`, KHÔNG global (`sts.amazonaws.com`) cho HA.

---

## 3. Hands-on có account

### Lab 1 — Cross-account AssumeRole với ExternalId (20 phút)
1. Account A: tạo role `PartnerAccess`:
   - Trust: Account B + ExternalId `Acme-2026`.
   - Permission: S3 read 1 bucket.
2. Account B: user policy có `sts:AssumeRole` lên role A.
3. Test:
   ```bash
   # Không ExternalId → fail
   aws sts assume-role --role-arn arn:aws:iam::A:role/PartnerAccess --role-session-name test
   # Có ExternalId → OK
   aws sts assume-role --role-arn arn:aws:iam::A:role/PartnerAccess \
     --role-session-name test --external-id Acme-2026
   ```

### Lab 2 — Permission Boundary chống escalate (30 phút)
1. Tạo policy `DevBoundary` (S3, DDB, Logs, Lambda only).
2. Tạo user `dev` với policy cho phép `iam:CreateRole` + `iam:AttachRolePolicy` chỉ trên role `app-*`, **bắt buộc** boundary `DevBoundary`.
3. Login `dev`, thử:
   - Tạo role `app-myapp` gắn `AmazonS3ReadOnly` → OK.
   - Tạo role `BadAdmin` gắn `AdministratorAccess` không boundary → DENY.
   - Tạo role `app-evil` gắn `AdministratorAccess` có boundary → tạo được, **nhưng effective permission = giao(Admin, Boundary) = chỉ S3/DDB/Logs/Lambda**.

### Lab 3 — GitHub OIDC deploy (45 phút)
Xem chi tiết practice/saa-c03/10-iam-advanced/.

### Lab 4 — ABAC EC2 theo Project (20 phút)
1. Tag user `alice` với `Project=alpha`.
2. Policy chung `ProjectScopedEC2`:
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
3. Launch 2 EC2: 1 tag `Project=alpha`, 1 tag `Project=beta`.
4. Alice stop `alpha` OK; stop `beta` DENY.

### Lab 5 — Access Analyzer (10 phút)
1. Console → IAM → Access Analyzer → Create analyzer.
2. Tạo S3 bucket policy `"Principal": "*"`. Sau vài phút, Access Analyzer raise finding.

---

## 4. Hands-on không tốn tiền

### Policy Simulator
https://policysim.aws.amazon.com — paste policy + chọn action/resource → thấy Allow/Deny + lý do từng statement.

### Bài tập đọc policy
Cho policy sau, predict kết quả:

```json
{
  "Statement": [
    { "Effect": "Allow", "Action": "s3:*", "Resource": "*" },
    { "Effect": "Deny", "Action": "s3:DeleteBucket", "Resource": "*",
      "Condition": { "Bool": { "aws:MultiFactorAuthPresent": "false" } } }
  ]
}
```
1. User không MFA, `s3:DeleteBucket`?
2. User có MFA, `s3:DeleteBucket`?
3. User không MFA, `s3:ListBucket`?

→ Đáp án: 1=DENY, 2=ALLOW, 3=ALLOW.

### Vẽ flow chart Policy Evaluation
Tự vẽ flowchart 6 step (SCP → resource → identity → boundary → session → result) với 5 test case khác nhau. Train cho đề thi.

---

## 5. Tự kiểm tra (SAA level)

1. Account A có Role X trust Account B. SCP của Account A chứa `Deny s3:DeleteObject`. User Account B AssumeRole X, gọi `s3:DeleteObject` lên bucket Account A. Kết quả?
   <details><summary>Đáp án</summary>**DENY**. Sau khi AssumeRole, principal là Role X **trong Account A** → SCP Account A áp lên. Note: SCP **không** áp khi gọi từ B vào A trực tiếp; nhưng khi assume role thành identity của A → SCP áp.</details>

2. Lambda function ở Account A cần đọc S3 bucket Account B. Cách nào ít overhead nhất?
   <details><summary>Đáp án</summary>**Bucket policy ở B allow Lambda execution role của A** (resource-based). Không cần AssumeRole, không cần thay đổi code Lambda.</details>

3. 3rd-party SaaS X (account ID 999) yêu cầu role trong account bạn để monitor bills. Tạo trust policy thế nào?
   <details><summary>Đáp án</summary>Trust `Principal: arn:aws:iam::999:root` + **bắt buộc ExternalId** (random secret X cung cấp) + Condition `sts:ExternalId`. Không có ExternalId → confused deputy risk.</details>

4. User có Permission Boundary chỉ `s3:Get*`. Identity policy allow `s3:*`. Bucket policy allow `s3:PutObject`. Gọi `s3:PutObject`?
   <details><summary>Đáp án</summary>**DENY**. Boundary cap permission của user xuống `s3:Get*`. Bucket policy không cứu được — boundary giới hạn principal, không phải resource.</details>

5. Developer cần tạo Lambda role cho app, không được tạo Admin role. Setup gì?
   <details><summary>Đáp án</summary>(1) Permission Boundary `DevBoundary` cap quyền. (2) Policy cho dev: `iam:CreateRole` + `iam:PassRole` **bắt buộc** `iam:PermissionsBoundary = DevBoundary` và `iam:PassedToService = lambda.amazonaws.com`. (3) Deny `iam:DeleteRolePermissionsBoundary`.</details>

6. EKS Pod cần đọc S3 không dùng node IAM role (least-privilege). Dùng gì?
   <details><summary>Đáp án</summary>**IRSA** (IAM Roles for Service Accounts) — OIDC federation. EKS cluster có OIDC provider, ServiceAccount link role qua annotation. Pod nhận temp credential per-pod.</details>

7. Multi-account 50 user. Best identity strategy?
   <details><summary>Đáp án</summary>**IAM Identity Center** + external IdP (Okta/Azure AD/Google Workspace). Permission Set gán user → account. Không tạo IAM User từng account.</details>

8. Tag mọi resource với `Project`. Muốn user chỉ thấy resource cùng project. Pattern?
   <details><summary>Đáp án</summary>**ABAC** — gắn tag `Project` vào user (PrincipalTag), policy condition `aws:PrincipalTag/Project = aws:ResourceTag/Project`.</details>

9. Workload on-prem cần gọi AWS API mà không lưu access key. Dùng gì?
   <details><summary>Đáp án</summary>**IAM Roles Anywhere** — setup private CA + X.509 cert, server signed request lấy temp credential. Hoặc nếu hybrid với AWS Outposts → role giống EC2.</details>

10. CloudTrail thấy `AssumeRole` từ principal `arn:aws:iam::B:root` (root account). Đây có phải attack?
    <details><summary>Đáp án</summary>**Có thể** — root B login. Cần verify (1) B có cố tình assume không, (2) MFA đã require trong trust policy. Best practice: trust policy yêu cầu MFA + ExternalId, và **root B không nên dùng hàng ngày**.</details>

---

## 6. Đối chiếu GCP

| Khái niệm AWS | GCP tương ứng |
|---------------|---------------|
| Policy evaluation 5 layers | IAM (single layer) + Organization Policy + Deny Policy (2023+) |
| SCP | Organization Policy (constraints) |
| Permission Boundary | **Deny Policy** (new, hạn chế hơn boundary) |
| Resource-based policy | IAM policy gắn resource (allow binding) |
| AssumeRole cross-account | **Service Account impersonation** |
| ExternalId | **Không có** — GCP dùng project audience trong WIF |
| OIDC federation | **Workload Identity Federation (WIF)** |
| SAML federation | **Workforce Identity Federation** |
| IRSA (EKS) | **Workload Identity** (GKE) |
| IAM Roles Anywhere | **WIF với X.509** (mới 2024) |
| Identity Center | **Cloud Identity / Workspace + Workforce IF** |
| ABAC | **IAM Conditions** + Resource Manager tag |
| iam:PassRole | `iam.serviceAccounts.actAs` permission |
| Service-linked Role | **Google-managed Service Account** |
| Access Analyzer | **IAM Recommender / Policy Analyzer** |

**Bẫy lớn khi từ GCP qua AWS SAA:**
1. **Cross-project access GCP** thường chỉ cần thêm binding ở resource. **Cross-account AWS** cần **2 bên** (resource + identity). Thiếu 1 bên = deny.
2. **GCP Service Account JSON key** = long-term credential. **AWS không tương đương** — workload cross-cloud từ GCP → AWS dùng **OIDC WIF → AssumeRole**, không tạo access key.
3. **GCP Deny Policy** mới, ít expressive hơn AWS Boundary + SCP combo.
4. **GCP không có ExternalId** — confused deputy giải bằng project audience trong WIF.
5. **GCP Service Account impersonation** ≈ AssumeRole, nhưng **luôn cần `iam.serviceAccounts.getAccessToken`** permission cụ thể.

**Khi đi làm multi-cloud:**
- IdP chung (Okta/Azure AD) → cả 2 cloud federate từ IdP đó.
- GitHub Actions deploy cả 2: OIDC AWS + WIF GCP, không secret long-term.
- Workload GKE/EKS → cross-cloud bằng OIDC bilateral.

---

## 7. Lưu ý khi thi SAA-C03

- **Cross-account = 2 bên Allow** (trừ trường hợp resource policy đã grant cụ thể principal cross-account).
- **DynamoDB không có resource policy** → cross-account phải AssumeRole.
- **S3, KMS, SQS, SNS, Lambda, ECR, EFS, Secrets Manager** **có** resource policy.
- **KMS Key Policy là bắt buộc** — IAM policy không override được KMS deny.
- **ExternalId** = 3rd-party trust.
- **Permission Boundary** = delegation.
- **iam:PassRole** thường là bẫy escalation.
- **IRSA cho EKS**, **IAM Roles Anywhere** cho on-prem, **OIDC** cho CI.
- **SCP áp principal trong account đó**, không áp management account, không áp principal cross-account.
- **IMDSv2 required** chống SSRF lấy role credential.
- Câu có "federated", "SAML", "OIDC", "temp credential" → STS.

### Pattern hay ra
| Scenario | Đáp án |
|----------|--------|
| 3rd-party trust | AssumeRole + **ExternalId** |
| Delegate tạo role | Permission **Boundary** |
| EKS pod IAM | **IRSA** |
| CI/CD AWS | **OIDC + AssumeRoleWithWebIdentity** |
| On-prem workload | **IAM Roles Anywhere** |
| Cross-account S3 read | **Bucket policy + identity policy** (cả 2) |
| Cross-account DDB | **AssumeRole** (DDB không có resource policy) |
| Force MFA cho delete | Condition `aws:MultiFactorAuthPresent` + `aws:MultiFactorAuthAge` |
| Tag-based access | **ABAC** với `PrincipalTag` = `ResourceTag` |
| Phát hiện S3 public | **Access Analyzer** |

---

## 8. Lưu ý khi đi làm

### Architecture
- **Multi-account = default** ngay từ ngày 1. Min 4 account: management, security/audit, log archive, prod. Workload tách thêm dev/staging/prod.
- **IAM Identity Center + IdP** (Okta/Azure AD) — không tạo IAM User trừ legacy/service.
- **Service Catalog + Permission Boundary** cho self-service developer.
- **GitHub Actions OIDC** mọi CI deploy.
- **IRSA** cho EKS workload.

### Bảo mật
- **IMDSv2 required** SCP-enforced toàn org.
- **CloudTrail org trail + log file validation + KMS encrypt + S3 Object Lock Compliance** (chống tamper).
- **Access Analyzer** org-level, review weekly.
- **AWS Config** rules: `iam-user-mfa-enabled`, `iam-no-inline-policy`, `root-account-mfa-enabled`, `iam-policy-no-statements-with-admin-access`.
- **GuardDuty + Security Hub** aggregate findings.
- Rotate access key 90 ngày tự động (Lambda + Credential Report).
- **Quarterly access review**: list role/user 90 ngày không dùng → disable/delete.

### Anti-pattern
- ❌ `iam:PassRole` trên `*` → escalation.
- ❌ Trust policy `Principal: "*"` (ai cũng assume).
- ❌ 3rd-party role không ExternalId → confused deputy.
- ❌ Permission Boundary thiếu — dev tự nâng quyền qua tạo role.
- ❌ Access key trong code/env file → OIDC/Roles Anywhere.
- ❌ Disable IMDSv2 vì "dễ debug" → SSRF tăng risk.
- ❌ KMS key policy không có root → khóa key vĩnh viễn không recover được.

---

## 9. Liên hệ Foundations

Bài này chưa cần foundations distributed. Sẽ cần ở bài 13 (Decoupling — replication & ordering) và 15 (Database — CAP/consistency).

---

## 10. Flashcard

- **Evaluation order** — SCP → Resource → Identity → Boundary → Session. Explicit Deny luôn thắng.
- **Same-account** — 1 bên allow đủ. **Cross-account** — 2 bên allow.
- **Resource policy** — S3/KMS/SQS/SNS/Lambda/ECR/EFS/Secrets. **Không có** ở DDB, EC2, RDS.
- **ExternalId** — 3rd-party trust, chống confused deputy.
- **Permission Boundary** — cap user/role, dùng cho delegation.
- **SCP** — cap account, không grant, không áp management account.
- **iam:PassRole** — check khi gán role cho service. Bẫy escalation.
- **Service-linked Role** — AWS tự tạo, prefix `AWSServiceRoleFor`.
- **IRSA** — EKS pod role qua OIDC.
- **IAM Roles Anywhere** — on-prem qua X.509.
- **OIDC** — CI/CD AWS không cần access key.
- **Cognito Identity Pool** — exchange social token → AWS temp credential.
- **ABAC** — tag-based, scale tốt hơn RBAC.
- **IMDSv2** — token-based metadata, chống SSRF.
- **STS regional** — luôn dùng regional endpoint cho HA.
- **Access Analyzer** — phát hiện external sharing.
- **Credential Report** — CSV mọi user.
- **Access Advisor** — service nào user/role dùng gần đây → trim policy.
