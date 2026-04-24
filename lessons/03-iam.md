# Bài 3 — IAM (Identity and Access Management)

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân biệt 4 entity cốt lõi: **User, Group, Role, Policy**.
- Đọc và viết 1 JSON policy cơ bản.
- Giải thích **policy evaluation logic** (Explicit Deny > Allow > Default Deny).
- Biết khi nào dùng **IAM User** vs **IAM Role** vs **IAM Identity Center (SSO)**.
- Áp dụng best practice: MFA, least privilege, no root, no access key trong code.

---

## 2. Lý thuyết

### 2.1 IAM là gì?
IAM trả lời 2 câu hỏi:
1. **AuthN — Ai đang gọi API?** (user/role/service)
2. **AuthZ — Họ có được phép làm việc đó không?** (policy)

Đặc điểm:
- **Global service** — không theo region. Nhưng console sign-in URL có tên region.
- **Free** — không tốn phí, chỉ tốn khi bị lộ credential 😅
- **Eventually consistent** — tạo user/policy xong, khoảng vài giây mới effective toàn cầu.

### 2.2 Các entity cốt lõi

#### a) Root user
- Là email bạn đăng ký account. **Full quyền**, không thu hồi được.
- **Best practice:** Bật MFA hardware, cất password vào vault, **KHÔNG dùng hàng ngày**.
- Chỉ root làm được vài việc đặc biệt: đổi account name, đóng account, đổi plan, xóa S3 bucket có MFA Delete, xem billing chi tiết (có thể delegate).

#### b) IAM User
- 1 người / 1 app có credential riêng.
- Có 2 loại credential:
  - **Password** (để login console).
  - **Access Key** (AccessKeyId + SecretAccessKey, để gọi CLI/SDK). Tối đa 2 active key/user.
- User có thể thuộc **nhiều Group**.
- ⚠️ **Access Key = long-term credential**, bị lộ là nguy hiểm. Ưu tiên Role + STS temporary credential.

#### c) IAM Group
- Tập hợp User. **KHÔNG chứa Group khác** (không nested group).
- Policy gắn vào Group → apply cho mọi user trong group.
- Best practice: **không bao giờ gắn policy trực tiếp user**, luôn qua group.

#### d) IAM Role
- **Identity tạm thời**, không có password/access key cố định. Khi được **"assume"**, sẽ được STS cấp temporary credential (3 thành phần: AccessKey + SecretKey + **SessionToken**, có thời hạn).
- Role có 2 policy quan trọng:
  - **Trust Policy** — **ai được phép assume role này** (EC2 service? user account khác? Lambda?).
  - **Permissions Policy** — sau khi assume, được làm gì.
- Use case:
  - **EC2 Role (Instance Profile)** — gắn role vào EC2, code trên máy gọi SDK không cần hardcode key.
  - **Lambda Execution Role** — Lambda cần để ghi CloudWatch Logs, đọc S3…
  - **Cross-account Role** — user account A assume role account B.
  - **Federated Role** — user login bằng Google/SAML/OIDC → assume role → lấy temp credential.

#### e) IAM Policy
JSON document định nghĩa permission. 6 loại chính:

| Loại | Gắn vào | Mục đích |
|------|---------|----------|
| **AWS Managed Policy** | User/Group/Role | Policy chuẩn AWS viết sẵn (ReadOnlyAccess, AdministratorAccess…). |
| **Customer Managed Policy** | User/Group/Role | Bạn tự viết, reuse. |
| **Inline Policy** | 1 User/Group/Role cụ thể | Nhúng trực tiếp, gắn 1-1, khó quản lý → ít dùng. |
| **Resource-based Policy** | Resource (S3 bucket, KMS key, SQS, SNS, Lambda…) | Cho phép principal từ account khác mà không cần AssumeRole. |
| **Permission Boundary** | User/Role | Giới hạn **tối đa** permission. Delegation safety. |
| **Session Policy** | Phiên STS tạm | Truyền vào khi AssumeRole/GetFederationToken, giới hạn session. |
| **SCP** (Service Control Policy, qua Organizations) | Account / OU | Giới hạn **tối đa** cho cả account, không grant. |

### 2.3 Cấu trúc JSON Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowReadMyBucket",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::my-bucket",
        "arn:aws:s3:::my-bucket/*"
      ],
      "Condition": {
        "IpAddress": { "aws:SourceIp": "203.0.113.0/24" },
        "Bool":     { "aws:MultiFactorAuthPresent": "true" }
      }
    }
  ]
}
```

Các field:
- **Version**: luôn là `"2012-10-17"` (bản ngôn ngữ policy mới nhất).
- **Statement**: 1 hoặc nhiều câu lệnh.
- **Sid**: (optional) label tự đặt.
- **Effect**: `Allow` hoặc `Deny`.
- **Action**: 1 hoặc nhiều action dạng `service:Verb`. Có thể wildcard `s3:*` hoặc `s3:Get*`.
- **Resource**: ARN (Amazon Resource Name). Format: `arn:aws:<service>:<region>:<account-id>:<resource>`. S3 bucket/KMS key không có region hoặc account khác nhau tuỳ service.
- **Principal**: (chỉ có trong **resource-based policy**) — ai được/không được phép.
- **Condition**: giới hạn thêm (IP, MFA, time, tag, VPC endpoint…).
- **NotAction / NotResource / NotPrincipal**: inverse match — nguy hiểm, dễ viết sai, hạn chế dùng.

### 2.4 Policy Evaluation Logic (⚠️ cực hay ra đề)

Khi 1 principal gọi API, AWS duyệt theo thứ tự:

```
1. Deny mặc định (default deny).
2. Có SCP không? Nếu SCP Deny → DENY. Nếu không Allow trong SCP → DENY.
3. Có Resource-based policy Allow? (hoặc Identity-based Allow?)
4. Có Permission Boundary? Boundary Deny → DENY.
5. Có Session Policy? Session Deny → DENY.
6. Có Identity-based Deny/Resource Deny rõ ràng? → DENY.
7. Nếu không Allow nào → DENY.
8. Có Allow mà không Deny chồng → ALLOW.
```

**Quy tắc vàng:**
- **Explicit Deny luôn thắng.**
- **Default là Deny.** Không có Allow = Deny.
- **SCP là giới hạn trần**, không grant. User có AdminAccess nhưng SCP chặn `s3:*` → vẫn không dùng được S3.
- **Permission Boundary** cũng là giới hạn trần cho user/role cụ thể.
- **Resource-based policy có thể grant cross-account trực tiếp** (không cần AssumeRole) — ví dụ S3 bucket policy cho account khác đọc bucket.

### 2.5 Các condition keys quan trọng
| Key | Ý nghĩa |
|-----|---------|
| `aws:SourceIp` | IP của caller |
| `aws:MultiFactorAuthPresent` | Có MFA không |
| `aws:MultiFactorAuthAge` | Bao lâu từ lúc MFA |
| `aws:CurrentTime` | Thời gian hiện tại |
| `aws:RequestedRegion` | Region của request |
| `aws:SourceVpce` | Gọi qua VPC endpoint nào |
| `aws:PrincipalTag/xxx` | Tag trên principal |
| `aws:ResourceTag/xxx` | Tag trên resource (ABAC) |
| `aws:PrincipalOrgID` | Principal thuộc Organization nào |

### 2.6 IAM Identity Center (thay thế AWS SSO)
- Dịch vụ **SSO cho multi-account** AWS + app SaaS (Salesforce, M365…).
- Tích hợp IdP ngoài: Azure AD / Okta / Google Workspace / SAML 2.0.
- Quản lý **Permission Set** (giống role template) gán User/Group vào Account.
- User login **1 portal** → click account → console tự động AssumeRole.
- **Best practice 2024+**: Multi-account thì **KHÔNG dùng IAM User rời rạc**. Dùng Identity Center.

### 2.7 STS (Security Token Service)
- Service phát token tạm (default 1h, max 12h cho role, 36h cho GetFederationToken).
- API chính: `AssumeRole`, `AssumeRoleWithSAML`, `AssumeRoleWithWebIdentity`, `GetSessionToken` (cho MFA), `GetFederationToken`.
- Regional endpoint (khuyên dùng `sts.<region>.amazonaws.com` thay vì global để tránh single point of failure).

### 2.8 MFA
- **Virtual MFA**: Google Authenticator, Authy, 1Password.
- **Hardware MFA**: YubiKey, Gemalto token.
- **U2F Security Key**: YubiKey (WebAuthn).
- Bật MFA bắt buộc cho root + mọi privileged user.
- Có thể force MFA bằng condition `aws:MultiFactorAuthPresent: true` trong policy.

### 2.9 IAM Best Practices (AWS top 10)
1. **Lock away root**, không dùng hàng ngày, bật MFA.
2. **User riêng** thay vì share credential.
3. **Group** gán policy, không gắn user trực tiếp.
4. **Least privilege** — bắt đầu minimal, mở dần.
5. **Use AWS managed policy** khi được (AWS update theo service mới).
6. **Password policy mạnh** (length, rotation).
7. **Enable MFA** cho privileged user.
8. **Role cho EC2/Lambda** thay vì access key.
9. **Rotate credential** định kỳ (90 ngày).
10. **Remove unused** — IAM Credential Report + Access Advisor.
11. **Use policy conditions** (MFA, IP, time).
12. **Monitor** với CloudTrail + Access Analyzer.

---

## 3. Hands-on có account

### Lab 1 — Setup account an toàn (15 phút)
1. Login root → IAM → **Activate MFA on root**.
2. IAM → **Account settings** → set password policy: 14+ chars, uppercase, number, symbol, 90-day rotation.
3. Tạo **IAM User `admin-you`**:
   - Console access: có, auto-generated password, force change on login.
   - Gắn policy: `AdministratorAccess`.
   - Bật MFA cho user này.
4. Logout root, login bằng `admin-you` URL (`https://<account-id>.signin.aws.amazon.com/console`).
5. Từ giờ **không động vào root**.

### Lab 2 — Group + Policy (10 phút)
1. Tạo Group `Developers`, gắn `ReadOnlyAccess`.
2. Tạo User `dev-test` (console + CLI), add vào `Developers`.
3. Login `dev-test` → thử tạo S3 bucket → bị deny (vì chỉ read-only).
4. Thử `aws s3 ls` (sau khi `aws configure` access key) → OK.

### Lab 3 — IAM Role cho EC2 (20 phút)
1. Tạo Role:
   - Trust policy: `ec2.amazonaws.com` (console chọn "EC2").
   - Permission: `AmazonS3ReadOnlyAccess`.
2. Launch t2.micro, gắn role này (IAM instance profile).
3. SSH vào EC2, chạy `aws s3 ls` — **không cần** access key, nó tự lấy từ metadata endpoint `http://169.254.169.254/latest/meta-data/iam/security-credentials/`.
4. Terminate EC2.

### Lab 4 — Cross-account Role (30 phút, cần 2 account)
1. Account A (trusting): tạo Role `CrossAccountReader`, trust policy cho Account B:
   ```json
   { "Effect": "Allow",
     "Principal": { "AWS": "arn:aws:iam::<B-ACCOUNT-ID>:root" },
     "Action": "sts:AssumeRole",
     "Condition": { "Bool": { "aws:MultiFactorAuthPresent": "true" } } }
   ```
2. Account B user: gắn policy cho phép `sts:AssumeRole` lên role trên.
3. Từ account B console → Switch Role → nhập A account ID + role name.

### Lab 5 — Policy nâng cao (15 phút)
Viết policy: **chỉ** cho phép upload/download vào bucket `logs-<account-id>`, **chỉ** từ IP văn phòng `203.0.113.0/24`, **bắt buộc MFA**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::logs-123456789012/*",
      "Condition": {
        "IpAddress": { "aws:SourceIp": "203.0.113.0/24" },
        "Bool": { "aws:MultiFactorAuthPresent": "true" }
      }
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::logs-123456789012"
    }
  ]
}
```

Test trong **IAM Policy Simulator** (console → IAM → Policy Simulator).

---

## 4. Hands-on không tốn tiền

### Option A — LocalStack
```bash
# install
pip install localstack awscli-local
localstack start -d

# tạo user + policy
awslocal iam create-user --user-name alice
awslocal iam create-policy --policy-name ReadOnlyS3 \
  --policy-document '{
    "Version":"2012-10-17",
    "Statement":[{"Effect":"Allow","Action":"s3:Get*","Resource":"*"}]
  }'
awslocal iam attach-user-policy --user-name alice \
  --policy-arn arn:aws:iam::000000000000:policy/ReadOnlyS3

# tạo role + assume
awslocal iam create-role --role-name MyRole \
  --assume-role-policy-document '{
    "Version":"2012-10-17",
    "Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]
  }'
```

### Option B — Policy writing exercise
Không cần account, mở text editor và viết các policy sau (tự check bằng [AWS Policy Generator](https://awspolicygen.s3.amazonaws.com/policygen.html)):
1. Allow user list tất cả S3 bucket nhưng chỉ đọc được bucket `public-data`.
2. Deny mọi action ngoài region `ap-southeast-1` và `us-east-1`.
3. Allow EC2 Start/Stop **chỉ** cho instance có tag `Environment=dev`.
4. Allow user assume role X nhưng phải có MFA < 1h.

### Option C — IAM Policy Simulator (free, cần 1 account đọc)
Dùng console tool: https://policysim.aws.amazon.com — paste policy + chọn action + resource → thấy Allow/Deny lý do.

---

## 5. Tự kiểm tra (dạng câu hỏi thi)

1. User A có AdminAccess. SCP của OU chứa account chặn `s3:*`. User A gọi `s3:ListBuckets`. Kết quả?
   <details><summary>Trả lời</summary>**DENY**. SCP là trần, không grant. Dù user có Admin, SCP chặn thì không dùng được.</details>

2. Bucket policy cho phép account B đọc. Trong account B có user C không có bất kỳ IAM policy nào về S3. User C đọc được không?
   <details><summary>Trả lời</summary>**Không** — cross-account cần **cả 2 bên allow**: resource-based (bucket policy ✅) + identity-based trong account B (cần grant `s3:GetObject` cho user C). Trong **cùng 1 account** thì chỉ cần 1 bên allow là đủ.</details>

3. Bạn cần cho app chạy trên EC2 ghi vào DynamoDB. Cách an toàn nhất?
   <details><summary>Trả lời</summary>Tạo **IAM Role** với policy ghi DynamoDB, gắn role vào EC2 qua **Instance Profile**. KHÔNG hardcode access key.</details>

4. User có identity policy Allow `s3:*`. Bucket policy có Deny `s3:DeleteObject` cho user đó. User `DeleteObject`?
   <details><summary>Trả lời</summary>**DENY**. Explicit Deny luôn thắng.</details>

5. Bạn muốn Lambda ở account A gọi đọc S3 bucket ở account B. Cần gì?
   <details><summary>Trả lời</summary>2 option: (1) Bucket policy account B allow Lambda execution role của A. (2) Tạo role ở B trust A, Lambda AssumeRole B rồi đọc. Option (1) đơn giản hơn cho use case này.</details>

6. Công ty có 50 nhân viên login nhiều AWS account. Best practice?
   <details><summary>Trả lời</summary>**IAM Identity Center** + IdP (Okta/Azure AD). KHÔNG tạo IAM User rời rạc từng account.</details>

---

## 6. Đối chiếu GCP

| Khái niệm | AWS | GCP |
|-----------|-----|-----|
| Account boundary | **Account** | **Project** |
| Tập quyền | **Policy** (JSON) | **Role** (predefined/custom) |
| Identity có credential tạm | **IAM Role** (assume via STS) | **Service Account** |
| Permission set gán vào identity | **Attach Policy** | **IAM Binding** (member + role) |
| Centralized SSO | **IAM Identity Center** | **Cloud Identity / Workspace + Workforce IF** |
| Giới hạn trần org | **SCP** (via Organizations) | **Organization Policy (constraints)** |
| Boundary cho user | **Permission Boundary** | **Deny Policy** (GA 2023) |
| Federation | **AssumeRoleWithSAML / WithWebIdentity** | **Workload Identity Federation** |
| Tạm credential | **STS** (AccessKey+SecretKey+**SessionToken**) | **OAuth 2.0 access token** |
| Resource-based policy | S3 bucket policy, KMS key policy… | **IAM Policy on resource** (allow principal binding) |
| Audit | **CloudTrail** | **Cloud Audit Logs** |
| Phát hiện over-permission | **IAM Access Analyzer** | **Policy Analyzer / Recommender** |

**5 bẫy lớn khi từ GCP qua AWS:**
1. **"IAM Role" khác nghĩa.** GCP Role = permission collection. AWS Role = identity (giống GCP Service Account). AWS tương đương GCP Role là **Policy**.
2. **Service Account file JSON** ở GCP = long-term credential. Ở AWS, workload trên EC2/Lambda/ECS **không cần file gì**, nó dùng Instance Metadata Service (IMDS) tự động lấy temp credential từ Role. Đừng tạo access key và download file JSON.
3. **Cross-account AWS cần 2 bên Allow** (resource + identity), trong khi cross-project GCP thường chỉ cần binding ở resource bên cho member bên kia.
4. **AWS Policy có Deny rõ ràng**, và **Explicit Deny luôn thắng**. GCP IAM chỉ có Allow binding (Deny Policy mới GA 2023 và còn hạn chế).
5. **SCP ≠ Organization Policy 1-1.** SCP chỉ áp cho principal trong account, **không áp management account**; chỉ hỗ trợ giới hạn theo **IAM action**. Org Policy GCP rộng hơn (constraint về cấu hình resource như disable public IP).

**Khi đi làm multi-cloud:**
- IdP chung (Okta/Azure AD) → SSO vào cả GCP (Workforce IF) lẫn AWS (Identity Center).
- Workload federation: GKE Workload Identity Federation → AssumeRole AWS mà không cần long-term key.
- Secret đồng bộ: Vault hoặc External Secrets Operator đọc Secrets Manager ↔ Secret Manager.

---

## 7. Lưu ý khi thi CLF-C02

- Nhớ 6 entity: User, Group, Role, Policy, (+ Identity Center, + STS).
- Root account **chỉ dùng billing + đóng account**. Mọi việc khác → IAM user.
- IAM là **global**, **free**.
- **Explicit Deny > Allow > Default Deny**.
- EC2 nên dùng **Role** (Instance Profile), không access key.
- **MFA bắt buộc** cho root + admin.
- Access Key **không bao giờ** vào code/Git.
- Với multi-account → **IAM Identity Center**.
- Câu có "temporary credential", "federated user", "SAML" → STS / AssumeRole.

## 8. Lưu ý khi thi SAA-C03 (sâu hơn)

- **Policy evaluation order**: SCP → Resource-based → Identity-based → Permission Boundary → Session Policy. Deny bất kỳ bước nào = DENY.
- **Cross-account** cần **cả 2 bên** (resource policy + identity policy), trừ khi resource policy đã allow principal cụ thể.
- **Permission Boundary** để delegate: cho developer tạo role cho app, nhưng giới hạn max permission boundary → không thể escalate.
- **ABAC** (attribute-based) dùng `aws:PrincipalTag` vs `aws:ResourceTag` → scale tốt hơn RBAC.
- **IAM Roles Anywhere** cho workload on-prem lấy temp credential qua X.509 cert (thay thế access key).
- **EC2 IMDSv2** (token-based) bắt buộc để phòng SSRF. Đề hay hỏi "làm sao bảo vệ role credential khỏi SSRF" → **IMDSv2**.
- **AssumeRoleWithWebIdentity** cho app mobile/web (Cognito, Google, Facebook login).
- **KMS Key Policy** là resource-based policy đặc biệt — **luôn cần grant explicit**, IAM policy không override được.

## 9. Lưu ý khi đi làm

### Bảo mật
- **KHÔNG** dùng root trừ tác vụ bắt buộc; MFA hardware (YubiKey) cho root.
- **KHÔNG** tạo IAM User trừ khi tích hợp legacy hoặc CI system. Người thật → Identity Center.
- **KHÔNG** gắn policy trực tiếp user. Luôn qua Group hoặc Permission Set.
- **KHÔNG** commit access key. Dùng `git-secrets`, `gitleaks`, GitHub secret scanning.
- **Rotate access key** 90 ngày tự động (có thể dùng Lambda + IAM Credential Report).
- **IAM Access Analyzer** bật org-level, review findings hàng tuần.
- **CloudTrail** org-trail + log file validation + KMS encrypt.

### Vận hành
- Tag role/policy với `Owner`, `Project`, `TicketID` để truy vết.
- Terraform/CDK viết policy, **không click console** cho prod (trừ emergency).
- Dùng **AWS managed policy khi có thể** — AWS update khi service ra feature mới.
- Review **IAM Access Advisor** hàng quý — xoá action không dùng 90+ ngày.
- Với CI/CD: **OIDC federation** (GitHub Actions → AWS OIDC provider → AssumeRole), không long-term key.
- Workload on-prem: **IAM Roles Anywhere** thay vì access key.

### Anti-pattern thường gặp
- ❌ `Action: "*"` trên `Resource: "*"` cho app user (= Admin).
- ❌ Access key commit vào `application.properties` / `.env` vào Git.
- ❌ EC2 với access key hardcode trong user-data.
- ❌ Role trust policy `Principal: "*"` (ai cũng assume được!).
- ❌ Dùng `PassRole` không giới hạn resource (privilege escalation).
- ❌ Disable IMDSv2 cho "dễ debug".

---

## 10. Flashcard

- **Root** — email account, full quyền, chỉ cho billing + close account.
- **User** — người/app có long-term credential.
- **Group** — tập User, gán policy.
- **Role** — identity tạm, assume → STS temp credential.
- **Policy** — JSON document (Effect, Action, Resource, Condition).
- **Managed vs Inline Policy** — reusable vs gắn 1-1.
- **Resource-based Policy** — policy gắn resource (S3, KMS, SQS…), có Principal.
- **SCP** — trần cho Account/OU qua Organizations, không grant.
- **Permission Boundary** — trần cho 1 user/role cụ thể.
- **STS** — service phát temp credential (AccessKey + SecretKey + SessionToken).
- **AssumeRole** — user/service lấy temp credential của role khác.
- **Instance Profile** — container để gắn Role vào EC2.
- **IMDSv2** — token-based metadata (bắt buộc dùng, chống SSRF).
- **IAM Identity Center** — SSO multi-account, thay AWS SSO.
- **Access Analyzer** — phát hiện resource share public/external.
- **Credential Report** — CSV list mọi user + trạng thái credential.
- **Access Advisor** — service nào user/role dùng gần đây.
- **Evaluation**: Explicit Deny > Allow > Default Deny.
- **Cross-account**: cần cả resource-based + identity-based allow.
