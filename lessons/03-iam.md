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

### 2.0 Analogy — IAM như toà nhà văn phòng

Để dễ hình dung, tưởng tượng AWS Account của bạn là **1 toà nhà văn phòng**:

| Khái niệm IAM | Trong toà nhà | Ý nghĩa |
|---------------|----------------|---------|
| **AWS Account** | Toà nhà | Boundary, có chủ sở hữu (root). |
| **Root user** | Chủ toà nhà | Chìa khoá tổng, mở mọi cửa. **Cất đi**, chỉ dùng khi cần. |
| **IAM User** | Nhân viên có thẻ tên | 1 người = 1 thẻ riêng, không share. |
| **IAM Group** | Phòng ban (Dev, Ops, HR) | Cùng phòng → cùng quyền vào phòng nào. |
| **IAM Role** | Thẻ khách tạm thời quầy lễ tân | Đến → đổi CMND → lấy thẻ tạm → vào → trả lại. **Không có chủ cố định**. |
| **Policy** | Tờ giấy "thẻ này được vào phòng nào" | Quy định cụ thể quyền truy cập. |
| **Trust Policy** (của Role) | Quy định ai được đổi lấy thẻ khách | "Chỉ EC2 service / chỉ account B / chỉ user login Google được lấy thẻ này". |
| **Permissions Policy** | Sau khi có thẻ, vào được phòng nào | "Thẻ này mở được kho A, không mở được kho B". |
| **STS** | Quầy lễ tân | Phát thẻ tạm có thời hạn (1 giờ, 12 giờ…). |
| **MFA** | Thẻ + vân tay | 2 lớp xác thực, mất thẻ chưa đủ vào được. |
| **SCP** | Quy định toàn toà nhà của chủ đầu tư | "Cấm tuyệt đối hút thuốc trong toà nhà" — dù bạn là Admin trong công ty thuê. |
| **Permission Boundary** | Hợp đồng lao động giới hạn quyền tối đa của nhân viên | Sếp giao Admin nhưng hợp đồng giới hạn "chỉ Asia" → chỉ Asia. |
| **Resource-based Policy** | Khoá ổ cửa của 1 phòng cụ thể | "Phòng này cho phép cả nhân viên công ty B vào". |
| **Access Key** | Chìa khoá vật lý | Có chìa = vào được. **Mất là nguy hiểm**, không hết hạn. |
| **Session Token (STS)** | Thẻ tạm có dán giờ hết hạn | An toàn hơn chìa khoá vật lý. |

---

### 2.0.1 Câu chuyện: 1 ngày làm việc với IAM

**Tình huống**: Bạn quản lý team 5 dev + 2 ops cho công ty Acme, có 1 web app (EC2 + S3 + RDS) và 1 CI/CD GitHub Actions.

#### Sai cách (anti-pattern)
- Chia chung 1 user `acme-root@gmail.com`, ai cần thì hỏi sếp xin pass.
- Mỗi dev tự `aws configure` access key root vào laptop.
- App EC2 hardcode access key trong `.env`.
- GitHub Actions secret = access key của 1 user.

→ Hệ quả: dev bị hack máy → leak key root → attacker xoá hết.

#### Đúng cách
1. **Root** đăng ký xong, bật MFA hardware, **cất ngăn kéo**.
2. Tạo **IAM Group `Developers`** với policy `PowerUserAccess` (không phải Admin).
3. Tạo **IAM User `alice`, `bob`, …** cho từng dev, add vào group, **bật MFA mỗi user**.
4. **App trên EC2** → tạo **Role `app-prod-role`** trust `ec2.amazonaws.com`, gắn `AmazonS3ReadOnly` + DDB read/write. **Không có access key nào**.
5. **GitHub Actions** → setup **OIDC Provider**, tạo **Role `gh-actions-deployer`** trust GitHub OIDC, condition `sub = repo:acme/web:*`. Workflow `AssumeRoleWithWebIdentity` → temp credential 1 giờ.
6. **Ops cross-account** sang account `acme-prod`: tạo **Role `OpsAdmin`** ở prod trust account `acme-dev`, condition MFA. Ops trong dev `AssumeRole` khi cần.
7. **SCP** ở Organization: deny mọi region trừ `ap-southeast-1` + `us-east-1`.
8. **Permission Boundary** cho group `Developers`: max `s3:*, ec2:*, logs:*` nhưng KHÔNG bao gồm `iam:*` → dev không thể tạo role tự nâng quyền.

→ Bị hack 1 dev laptop chỉ ảnh hưởng phạm vi dev đó, không leak prod.

---

### 2.0.2 Use case map — chọn cái nào khi nào

| Tình huống | Dùng gì | Tại sao |
|-----------|---------|---------|
| Người thật login console | **IAM User** (nếu ít) hoặc **IAM Identity Center** (nếu ≥ 2 account / ≥ 5 user) | Identity Center có SSO, không cần tạo user từng account. |
| EC2/Lambda/ECS gọi AWS API | **IAM Role + Instance Profile / Execution Role** | Temp credential auto-rotate, không hardcode. |
| App on-prem (datacenter công ty) gọi AWS | **IAM Roles Anywhere** (X.509 cert) hoặc **IAM User access key cuối cùng** | Roles Anywhere = không có long-term key. |
| GitHub Actions / GitLab CI deploy AWS | **OIDC Federation + Role** | Không lưu access key trong CI secret. |
| User login Google/Facebook vào app, app cần upload S3 | **Cognito Identity Pool → temp IAM credential** | Web/mobile user không có IAM user. |
| Account A muốn cho account B đọc S3 bucket | **Bucket Policy + IAM Role cross-account** | 2 cách: resource policy trực tiếp (đơn giản) hoặc AssumeRole (audit tốt hơn). |
| Cho contractor truy cập 1 tuần | **IAM Role với MaxSessionDuration + AssumeRole** | Hết hạn tự revoke, không phải xoá user. |
| Lambda trong account A gọi DynamoDB account B | **Cross-account Role** + Lambda execution role có `sts:AssumeRole` | DynamoDB không có resource policy, phải qua role. |
| Bắt mọi user phải MFA mới làm việc | **Identity policy + Condition `aws:MultiFactorAuthPresent`** hoặc **SCP** | Force MFA. |
| Giới hạn region cho cả org | **SCP với `aws:RequestedRegion`** | SCP áp toàn account. |
| Sếp giao "tạo user dev được trong giới hạn" | **Permission Boundary** | Delegate tạo user nhưng không escalate. |
| Service A của AWS gọi service B (vd Lambda gọi S3) | **Service-linked Role** hoặc execution role | AWS quản, ít cấu hình. |
| Audit ai làm gì | **CloudTrail** + **Access Analyzer** + **Credential Report** | Không phải feature IAM thuần, nhưng đi kèm. |

---

### 2.0.3 Ví dụ cụ thể cho từng entity

#### IAM User — khi nào dùng / không
✅ **Dùng**:
- CI/CD legacy không hỗ trợ OIDC (chạy trên server tự host).
- Cá nhân học AWS lần đầu, 1 account.
- Service account cho bot Slack/script chạy ngoài AWS.

❌ **Không dùng**:
- ≥ 2 account → dùng IAM Identity Center.
- Workload chạy trên AWS (EC2, Lambda, ECS) → dùng Role.
- GitHub Actions → dùng OIDC.

**Ví dụ tạo user:**
```bash
# User `alice` cho dev
aws iam create-user --user-name alice
aws iam create-login-profile --user-name alice --password 'Temp123!' --password-reset-required
aws iam add-user-to-group --group-name Developers --user-name alice
aws iam enable-mfa-device --user-name alice --serial-number arn:aws:iam::123456789012:mfa/alice ...
```

#### IAM Group — khi nào dùng
✅ Luôn dùng khi có ≥ 2 user cùng vai trò.

**Ví dụ phân nhóm thực tế:**
- `Developers` — `PowerUserAccess` (mọi service trừ IAM).
- `Ops` — `AdministratorAccess` + MFA required.
- `BillingViewers` — `Billing` read-only, cho kế toán.
- `Auditors` — `SecurityAudit` + `ViewOnlyAccess`.
- `DataScientists` — `AmazonS3ReadOnlyAccess` + `AmazonAthenaFullAccess`.

#### IAM Role — 4 use case kinh điển
**1. EC2 đọc S3** (Instance Profile)
```bash
# Trust policy: ai assume? → EC2 service
{ "Service": "ec2.amazonaws.com" }
# Permissions: S3 read
```
EC2 boot → IMDS auto-rotate credential 6 giờ.

**2. Lambda ghi DynamoDB** (Execution Role)
```bash
{ "Service": "lambda.amazonaws.com" }
# Permissions: dynamodb:PutItem + logs:CreateLogStream
```
Tạo Lambda → chọn execution role → done.

**3. Cross-account: account dev gọi prod S3**
```bash
# Ở prod: role `DevReadOnly` trust account dev
{ "AWS": "arn:aws:iam::DEV-ACCOUNT:root" }
# Permissions: s3:Get* trên bucket cụ thể
```
Dev `aws sts assume-role --role-arn arn:aws:iam::PROD:role/DevReadOnly`.

**4. Federated: GitHub Actions deploy**
```bash
# Trust policy: federated OIDC
{
  "Federated": "arn:aws:iam::123:oidc-provider/token.actions.githubusercontent.com",
  "Action": "sts:AssumeRoleWithWebIdentity",
  "Condition": { "StringLike": { "...:sub": "repo:acme/web:ref:refs/heads/main" } }
}
```
Workflow GitHub → `aws-actions/configure-aws-credentials@v4` → temp credential.

#### Policy — ví dụ progressive

**Level 1 — Allow basic** (cho intern read S3):
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:ListBucket"],
    "Resource": ["arn:aws:s3:::reports/*", "arn:aws:s3:::reports"]
  }]
}
```

**Level 2 — Giới hạn theo resource cụ thể** (chỉ EC2 trong region SG có tag `Env=dev`):
```json
{
  "Effect": "Allow",
  "Action": ["ec2:StartInstances", "ec2:StopInstances"],
  "Resource": "arn:aws:ec2:ap-southeast-1:*:instance/*",
  "Condition": {
    "StringEquals": { "ec2:ResourceTag/Env": "dev" }
  }
}
```
→ Dev chỉ start/stop được instance của họ (tag `Env=dev`), không động được prod (`Env=prod`).

**Level 3 — Bắt buộc MFA mới đụng được delete**:
```json
{
  "Effect": "Allow",
  "Action": "s3:DeleteObject",
  "Resource": "arn:aws:s3:::important-data/*",
  "Condition": {
    "Bool": { "aws:MultiFactorAuthPresent": "true" },
    "NumericLessThan": { "aws:MultiFactorAuthAge": "3600" }
  }
}
```
→ Chỉ delete được trong 1 giờ sau khi MFA.

**Level 4 — Deny vượt cấp** (chống developer tự nâng quyền):
```json
{
  "Effect": "Deny",
  "Action": ["iam:*", "organizations:*", "account:*"],
  "Resource": "*"
}
```
→ Gắn vào Developer group, **Explicit Deny luôn thắng** → dev không thể tạo Admin user.

#### SCP — ví dụ thực tế

**Case 1: cấm region khác**
```json
{
  "Effect": "Deny",
  "NotAction": ["iam:*", "route53:*", "cloudfront:*", "support:*"],
  "Resource": "*",
  "Condition": {
    "StringNotEquals": { "aws:RequestedRegion": ["ap-southeast-1", "us-east-1"] }
  }
}
```
→ Mọi user trong account dù Admin cũng không launch được EC2 ở Mumbai. **Tránh shadow IT + tránh data leak compliance**.

**Case 2: cấm tắt CloudTrail**
```json
{ "Effect": "Deny",
  "Action": ["cloudtrail:StopLogging", "cloudtrail:DeleteTrail"],
  "Resource": "*" }
```
→ Hacker compromise admin cũng không xoá audit log được.

**Case 3: bắt mọi EC2 phải có tag `Project`**
```json
{ "Effect": "Deny",
  "Action": "ec2:RunInstances",
  "Resource": "arn:aws:ec2:*:*:instance/*",
  "Condition": { "Null": { "aws:RequestTag/Project": "true" } } }
```
→ FinOps được đảm bảo.

#### Permission Boundary — kịch bản delegation

**Bài toán**: Sếp muốn cho mỗi dev được **tự tạo IAM role cho Lambda của họ**, nhưng KHÔNG được tạo role Admin.

**Sai**: gắn `iam:*` cho dev → dev tự tạo role `MyAdmin` rồi assume → escalate.

**Đúng**:
1. Tạo Boundary policy `DevBoundary` = max `s3:*, dynamodb:*, logs:*, lambda:*` (KHÔNG có `iam:*`).
2. Gắn cho dev policy:
   ```json
   { "Effect": "Allow",
     "Action": "iam:CreateRole",
     "Resource": "*",
     "Condition": {
       "StringEquals": { "iam:PermissionsBoundary": "arn:aws:iam::123:policy/DevBoundary" }
     }}
   ```
3. Dev tạo role được, nhưng **bắt buộc** gắn boundary `DevBoundary` → role mới không thể có quyền vượt boundary.

#### Resource-based policy — ví dụ S3 bucket

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPartnerRead",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::PARTNER-ACCT:root" },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::shared-reports/*"
    },
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::shared-reports", "arn:aws:s3:::shared-reports/*"],
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    }
  ]
}
```
→ Partner account đọc được file, nhưng phải qua HTTPS.

---

### 2.0.4 5 hiểu lầm phổ biến

1. **"IAM Role = chức danh của user"** — SAI. Role = identity tạm thời mọi thứ (EC2, Lambda, người khác) đều có thể "đeo" tạm. Không gắn vào 1 người cố định.

2. **"Có IAM policy là Allow"** — SAI. Default là **Deny**. Phải có Allow rõ ràng, **và** không có Deny chồng. Không Allow = Deny.

3. **"Bucket policy override IAM policy"** — SAI. 2 cái cộng dồn. Allow ở **bất kỳ một bên** trong same account là đủ. Cross-account thì cần **cả 2** allow.

4. **"SCP grant quyền"** — SAI. SCP **chỉ giới hạn trần**, không grant. User vẫn cần IAM policy để có quyền thực sự.

5. **"Access Key của user X có nghĩa là ai gọi cũng là user X"** — ĐÚNG về kỹ thuật, nhưng **đó chính là vấn đề** — vì sao không nên dùng access key. Mất key = mất identity.

---

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
