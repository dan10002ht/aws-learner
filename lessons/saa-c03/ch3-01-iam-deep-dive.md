# SAA Ch3.1 — IAM Deep Dive & Identity Federation

> Mục tiêu: Vượt qua mức "tạo user, gán policy" của CLF. Hiểu **policy evaluation logic**, **trust relationship**, **STS**, **federation với SSO/OIDC/SAML**, **permission boundary**, **SCP** — đủ để design IAM cho multi-account org và đọc đề SAA về security không lăn tăn.

Tiền đề: CLF [[03-iam]].

---

## 1. Câu chuyện mở đầu — "Tôi attach AdministratorAccess vì policy phức tạp quá"

Junior dev nhận task: Lambda cần đọc S3 bucket cụ thể. Mất 30 phút loay hoay với policy → bực mình → attach `AdministratorAccess` cho role. Code chạy. PR merged.

3 tháng sau, role này bị compromise qua SSRF. Attacker dùng credential từ instance metadata → list tất cả S3 bucket trong account → exfiltrate 2TB customer data. **Bill: 4 triệu USD + breach notification + lawsuit.**

**Quy tắc 0**: **Least privilege là kỹ năng, không phải checkbox**. Bài này dạy bạn cách viết policy chính xác, không phải attach wide policy "cho nhanh".

---

## 2. 4 loại IAM principal & 4 loại policy

### Principals (ai gọi AWS API?)

| Principal | Ai dùng |
|-----------|---------|
| **IAM User** | Human dùng credentials lâu dài (legacy) |
| **IAM Role** | AWS service (EC2, Lambda…) hoặc federated identity assume tạm thời |
| **Federated user** | SSO, SAML, OIDC, Web Identity |
| **Root** | Owner account (không bao giờ dùng cho daily work) |

### Policies (luật về quyền)

| Policy | Attach vào | Use case |
|--------|-----------|----------|
| **Identity-based** | User, Group, Role | Phổ biến nhất: "X được làm Y trên Z" |
| **Resource-based** | S3 bucket, SQS, SNS, KMS, Lambda… | "Resource này cho ai làm gì" |
| **Permission Boundary** | User/Role | Trần quyền tối đa (delegation safety) |
| **SCP (Service Control Policy)** | OU/Account trong Organization | Quyền tối đa của account (deny mọi cái ngoài) |
| **Session policy** | Khi `AssumeRole` | Giới hạn quyền của session |
| **ACL** (legacy) | S3 object/bucket, VPC | Hạn chế dùng, prefer bucket policy |

---

## 3. Policy evaluation logic — quan trọng nhất bài này

Khi 1 request đến (vd `s3:GetObject`), AWS đánh giá theo trình tự:

```
1. Default DENY (deny mặc định nếu không có allow)
2. Có SCP? Nếu SCP deny → DENY (kể cả admin)
3. Resource-based policy có allow explicit cho principal? → ALLOW (skip identity check)
4. Identity-based policy có allow? Không → DENY
5. Có explicit DENY ở bất kỳ policy? → DENY
6. Có Permission Boundary? Boundary có allow? Không → DENY
7. Có session policy? Session policy có allow? Không → DENY
8. → ALLOW
```

### Quy tắc vàng (nhớ thuộc lòng)

1. **Explicit DENY luôn thắng**. Nếu có DENY ở bất kỳ tầng → request fail.
2. **Default là DENY** — không có policy nào allow → deny.
3. **Cross-account**: cần allow ở **cả** identity-based (account A) **và** resource-based (account B).
4. **SCP và Permission Boundary là TRẦN**, không phải grant quyền. Bạn vẫn cần identity policy để có quyền.
5. **Resource-based policy có thể grant cross-account mà không cần role assume** (vd S3 bucket policy allow principal account khác).

### Ví dụ tricky

User A có `AdministratorAccess`. Bucket policy có:
```json
{ "Effect": "Deny", "Principal": "*", "Action": "s3:*", "Resource": "arn:aws:s3:::secret/*" }
```
→ A có **đọc được** `secret/*` không? **Không.** Explicit deny ở resource thắng admin.

---

## 4. STS & AssumeRole — cốt lõi mọi kiến trúc IAM modern

### 4.1 STS (Security Token Service)

- Issue **temporary credentials** (Access Key + Secret + Session Token, expire 15 phút - 12 giờ).
- Mọi role-based access đều qua STS.

### 4.2 AssumeRole flow

1. Principal A (user/role) gọi `sts:AssumeRole` với **Role ARN** của Role R.
2. Role R có **Trust Policy** quyết định ai được assume.
3. Nếu trust policy allow A + A có `sts:AssumeRole` permission → STS trả credential.
4. A dùng credential này gọi AWS API.

### 4.3 Trust policy vs Permission policy

```json
// Trust policy (gắn trên Role) — ai được assume
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "ec2.amazonaws.com" },  // EC2 service được assume
    "Action": "sts:AssumeRole"
  }]
}

// Permission policy (cũng gắn trên Role) — role làm được gì
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::my-bucket/*"
  }]
}
```

### 4.4 Use cases

| Use case | Trust principal |
|----------|-----------------|
| EC2 instance profile | `ec2.amazonaws.com` |
| Lambda execution role | `lambda.amazonaws.com` |
| Cross-account access | `arn:aws:iam::<account>:root` hoặc principal cụ thể |
| Federated user | `cognito-identity.amazonaws.com`, IdP ARN cho SAML |
| Service role (AWS managed) | Service-specific principal |

### 4.5 AssumeRole variants

- **AssumeRole**: cross-account / same-account role.
- **AssumeRoleWithSAML**: từ SAML IdP (corporate AD FS, Okta…).
- **AssumeRoleWithWebIdentity**: từ OIDC (Cognito, Google, custom JWT).
- **GetSessionToken**: dùng cho MFA-protected operation.

---

## 5. Federation patterns

### 5.1 IAM Identity Center (IdC, ex-AWS SSO)

- Recommended cho multi-account org.
- 1 IdP (built-in hoặc external SAML/OIDC) → access nhiều account, nhiều role.
- Permission Set = template cho role.
- Hỗ trợ AD Connect, Azure AD, Okta.

### 5.2 SAML 2.0 federation (legacy / hybrid)

- IdP (AD FS, Okta) → user login → SAML assertion → AWS AssumeRoleWithSAML → console/CLI access.
- Setup phức tạp hơn IdC nhưng nhiều enterprise đã có.

### 5.3 Cognito (user-facing app)

- **User Pool**: directory cho app users (mobile/web).
- **Identity Pool**: vend AWS credential cho authenticated/unauthenticated user.
- Use case: mobile app upload S3 trực tiếp, không qua backend.

### 5.4 IAM Roles Anywhere

- On-prem server / 3rd-party có X.509 certificate → có thể assume role.
- Thay thế cho việc lưu IAM user credential trên on-prem server.

### 5.5 EKS IRSA / Pod Identity

- **IRSA (IAM Roles for Service Accounts)**: K8s service account map sang IAM role qua OIDC.
- **EKS Pod Identity** (2023+): đơn giản hơn IRSA, không cần OIDC setup.
- Pod nhận credential tự động qua SDK.

---

## 6. Cross-account access pattern

### 6.1 Resource-based (đơn giản, ít object)

Account B share S3 bucket cho account A:
```json
// Bucket policy ở account B
{
  "Effect": "Allow",
  "Principal": { "AWS": "arn:aws:iam::AccountA:root" },
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::bucket-b/*"
}
```
Account A user còn cần identity policy allow `s3:GetObject` trên `bucket-b`.

### 6.2 AssumeRole cross-account (recommended cho nhiều case)

- Account B tạo role R, trust policy allow Account A assume.
- Account A user gọi `AssumeRole` với role R ARN → nhận credential của B → gọi AWS API như "B".
- **Audit-friendly**: log thấy ai (A) assume role (B) khi nào.

### 6.3 RAM (Resource Access Manager)

- Share resource (VPC subnet, TGW, License…) cross-account/org.
- Không phải IAM policy — là sharing mechanism.

---

## 7. Permission Boundary — delegation safety

### Use case
- Bạn (Admin) cho phép Dev tạo role/user, nhưng không muốn họ tạo role có quyền `iam:*`.

### Cách dùng
1. Tạo **Permission Boundary policy** P (quyền tối đa cho phép).
2. Cho Dev quyền tạo role/user **chỉ nếu** đính kèm boundary P.
3. Khi role/user mới ra đời, **quyền hiệu lực = intersection(identity policy, P)**.

```json
// Condition cho Dev khi tạo user/role
"Condition": {
  "StringEquals": { "iam:PermissionsBoundary": "arn:aws:iam::123:policy/DevBoundary" }
}
```

→ Dev không thể tạo user "admin" được. Boundary trap.

---

## 8. SCP (Service Control Policy)

- Chỉ trong AWS Organizations.
- Apply lên OU hoặc account.
- Là **trần quyền** — kể cả root account cũng bị giới hạn.
- Không grant quyền, chỉ deny/allow framework.

### Patterns

```json
// Chỉ cho phép region us-east-1, eu-west-1
{
  "Effect": "Deny",
  "Action": "*",
  "Resource": "*",
  "Condition": {
    "StringNotEquals": {
      "aws:RequestedRegion": ["us-east-1", "eu-west-1"]
    }
  }
}

// Cấm tạo IAM user (chỉ dùng IdC)
{ "Effect": "Deny", "Action": "iam:CreateUser", "Resource": "*" }

// Cấm leave organization
{ "Effect": "Deny", "Action": "organizations:LeaveOrganization", "Resource": "*" }
```

### Best practices
- **Default**: `FullAWSAccess` (allow tất cả) + selective deny.
- **Restrictive**: bắt đầu deny everything, allow từ từ. Nguy hiểm nếu sai.

---

## 9. IAM Policy nâng cao

### 9.1 Conditions hay gặp

| Condition | Use case |
|-----------|----------|
| `aws:SourceIp` | Giới hạn IP range |
| `aws:SourceVpc` / `aws:SourceVpce` | Chỉ qua VPC/VPC endpoint cụ thể |
| `aws:RequestedRegion` | Region whitelist |
| `aws:PrincipalOrgID` | Chỉ principal trong Org |
| `aws:MultiFactorAuthPresent` | Bắt buộc MFA |
| `aws:CurrentTime` / `aws:EpochTime` | Time-based access |
| `aws:ResourceTag/...` / `aws:RequestTag/...` | Tag-based access (ABAC) |
| `aws:TagKeys` | Bắt buộc khai tag |
| `s3:prefix` | Chỉ access object có prefix |
| `kms:ViaService` | Chỉ encrypt/decrypt qua service cụ thể |

### 9.2 Wildcards & NotAction/NotResource

- `Action: "*"` = tất cả action. Hạn chế dùng.
- `NotAction`: trừ ra. Vd allow `*` ngoại trừ `iam:*` → vẫn nguy hiểm, prefer explicit list.
- `Resource: "*"`: tất cả resource. Restrict nếu có thể.

### 9.3 ABAC (Attribute-Based Access Control)

Thay vì 1000 role cho 1000 team, dùng **tag-based**:

```json
// Allow if resource tag "Team" == principal tag "Team"
{
  "Effect": "Allow",
  "Action": "ec2:*",
  "Resource": "*",
  "Condition": {
    "StringEquals": { "aws:ResourceTag/Team": "${aws:PrincipalTag/Team}" }
  }
}
```

→ 1 policy phục vụ N team. Tag-based scale tốt cho enterprise.

---

## 10. Access Analyzer & policy debugging

### IAM Access Analyzer
- Phân tích bucket/role policy → flag resource shared "ngoài account/org".
- **Generate policy from CloudTrail**: tạo least-privilege policy từ activity log → giảm guesswork.

### Policy simulator
- Test policy trước khi apply.

### Last accessed info
- IAM cho biết action/service nào role/user đã dùng N ngày qua → cleanup unused permission.

### CloudTrail
- Mọi API call có log. Filter theo `eventSource`, `userIdentity` để debug "ai làm gì khi nào".

---

## 11. Best practices (đi thi & thực tế)

1. **Root account**: enable MFA hardware, không tạo access key, lock vào safe.
2. **Không tạo IAM user cho người** — dùng IdC + IdP.
3. **IAM Role cho mọi compute** (EC2, Lambda, ECS task role). Không hardcode credential.
4. **MFA mọi nơi có thể**: console login, AssumeRole nhạy cảm, S3 bucket delete.
5. **Permission Boundary** cho developer tạo role.
6. **SCP** cho org-wide guardrail (region whitelist, ngăn delete CloudTrail, …).
7. **Audit định kỳ**: Access Analyzer, IAM Access Advisor, credential report.
8. **Rotate access key** nếu vẫn còn (mỗi 90 ngày). Tốt hơn là **xóa hết**.
9. **Encryption at rest** với KMS, encryption in transit với TLS. Resource policy + KMS key policy.
10. **Tag mọi resource** → ABAC + cost allocation.

---

## 12. Cạm bẫy đề thi (SAA)

1. **"AdministratorAccess + SCP deny S3 → có truy cập S3?"** → **Không**, SCP deny thắng admin.
2. **"Bucket policy allow account A + A user không có S3 permission → có truy cập?"** → **Có** (chỉ cần 1 trong 2 cho cross-account và resource policy thường đủ cho same-service cross-account; nhưng cross-account S3 cần CẢ HAI cho identity của caller). Đề SAA hay đánh tráo — đọc kỹ.
3. **"Cross-account: chỉ cần resource policy"** → **Sai cho hầu hết**. Cần cả identity policy + resource policy (trừ trường hợp special như S3 bucket policy với explicit principal).
4. **"Permission Boundary thay thế IAM policy"** → **Sai**. Boundary là trần, vẫn cần identity policy grant quyền.
5. **"SCP grant quyền"** → **Sai**, SCP chỉ deny/allow framework. Vẫn cần IAM policy.
6. **"IAM user trên EC2 thay vì instance profile"** → **Anti-pattern**. Luôn dùng role.
7. **"EKS pod cần access AWS service → IAM user trong secret"** → **Sai**. Dùng IRSA / Pod Identity.
8. **"Long-lived credential trên CI/CD"** → **Anti-pattern**. Dùng **OIDC federation** (GitHub Actions OIDC, GitLab OIDC) — không cần secret.
9. **"`Resource: *` với `Action: s3:GetObject` là least privilege"** → **Sai**, scope down theo bucket/prefix.

---

## 13. Tóm tắt 1 dòng

> IAM = policy + principal + evaluation logic. **Explicit DENY thắng tất cả.** Default deny. **Role + STS** > **User + Access Key** cho mọi case. **SCP, Permission Boundary, IdC** là 3 trụ cột enterprise IAM.

---

## 14. Bài tập tự kiểm tra

1. EC2 trong VPC private subnet cần access S3 bucket. Bucket policy hiện chỉ allow `arn:aws:iam::123:role/EC2Role`. Yêu cầu: kết nối **không qua internet**. Liệt kê 3-4 thứ phải config (IAM, VPC, S3).
2. Dev team xin tạo role có quyền tự ý. Bạn (Admin) muốn họ tạo được role nhưng không có quyền IAM/Org. Design?
3. CI/CD GitHub Actions deploy vào AWS. Cách an toàn nhất là gì? Liệt kê đầy đủ steps (GitHub side + AWS side).
4. Cross-account: account A user cần `s3:PutObject` vào bucket ở account B. So sánh 2 cách (resource policy vs AssumeRole) — chọn cái nào cho 1 lần dùng vs sử dụng thường xuyên?
5. SCP có 2 rule: (a) Deny `*` outside us-east-1; (b) Allow `iam:*`. Account user trong us-east-1 có thể `iam:CreateUser` ở eu-west-1 không? Vì sao?
6. Lambda function gọi DynamoDB ở account khác. Mô tả flow IAM (trust policy, permission policy, cross-account).

---

## 15. Đọc thêm

- AWS Whitepaper — *AWS IAM Best Practices*.
- AWS Builder's Library — *Authenticating to AWS services*.
- AWS docs — *IAM JSON Policy Reference*, *Policy Evaluation Logic*.
- *AWS Security Maturity Model*.

---

**Bài tiếp theo**: [[ch3-02-network-security]] — VPC isolation, SG vs NACL deep, WAF, Shield, Network Firewall.
