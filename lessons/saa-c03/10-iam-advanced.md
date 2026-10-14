# Bài 10 — IAM Advanced

**Prerequisite:** [../clf-c02/03-iam.md](../clf-c02/03-iam.md) (User/Group/Role/Policy cơ bản, evaluation order sơ lược).

## 1. Mục tiêu
Sau bài này bạn có thể:
- Đọc đúng **policy evaluation order** đầy đủ (SCP → Resource → Identity → Boundary → Session) và giải thích được vì sao cross-account cần Allow ở cả hai bên.
- Thiết kế **cross-account access** đúng pattern (resource policy vs AssumeRole, ExternalId).
- Sử dụng **Permission Boundary** để delegate an toàn.
- Cấu hình **federation** (SAML, OIDC, Cognito, IAM Roles Anywhere).
- Áp dụng **ABAC** (attribute-based) thay RBAC khi scale.
- Tránh **privilege escalation** qua iam:PassRole / sts:AssumeRole.
- Phân biệt các API của **STS**, service role vs **service-linked role**, và dùng đúng công cụ audit (**Access Analyzer**, Access Advisor, Credential Report).
- Giải thích vì sao **IMDSv2** chặn được SSRF.

---

## 2. Lý thuyết

### 2.1 Policy Evaluation Order — đầy đủ

**Bài toán.** Mỗi lần một **principal** (thực thể gọi API: IAM user, role, hoặc một session tạm của role) gọi một API, AWS phải trả lời đúng một câu: *cho hay không cho?* Khó ở chỗ có tới năm loại policy cùng lên tiếng về một request. Muốn đọc đúng kết quả, đừng học thuộc thứ tự — hãy chia năm loại đó thành **hai nhóm việc**.

**Nhóm 1 — policy CẤP quyền.** Chỉ hai loại này mới tạo ra được một `Allow` có hiệu lực:

- **Identity-based policy**: gắn vào user/group/role, nói "*tôi* được làm gì".
- **Resource-based policy**: gắn vào resource (bucket policy của S3, key policy của KMS…), nói "*ai* được làm gì với tôi".

**Nhóm 2 — policy đặt TRẦN.** Ba loại này **không bao giờ cấp quyền**, chỉ giới hạn mức tối đa. Dù có viết `Allow` trong đó thì cũng chỉ có nghĩa "không chặn":

- **SCP (Service Control Policy)**: policy của AWS Organizations — dịch vụ gom nhiều account vào một tổ chức — gắn lên cả account hoặc một nhóm account (OU). Nó là trần cho **mọi user và role trong account đó**, kể cả root user của account.
- **Permission Boundary**: một managed policy gắn lên **một** user hoặc **một** role, làm trần riêng cho đúng user/role đó (dùng thế nào xem §2.4).
- **Session Policy**: policy truyền kèm lúc gọi `AssumeRole`, làm trần cho **riêng phiên đó**. Ví dụ role có `s3:*` nhưng phiên này bạn chỉ muốn nó đọc được một bucket.

Từ đó ra ba luật, áp theo đúng thứ tự:

1. **Explicit Deny thắng tất cả.** Bất kỳ policy nào trong năm loại có `"Effect": "Deny"` khớp request thì kết quả là DENY, không xét tiếp.
2. **Mọi lớp trần đang có mặt đều phải cho qua.** Thiếu `Allow` ở một lớp trần nào là bị chặn. Kiểu chặn này gọi là *implicit deny* (từ chối ngầm, vì không ai cho phép).
3. **Phải có ít nhất một policy cấp quyền nói Allow.** Không ai cấp thì mặc định là DENY (**default deny**).

Thứ tự AWS duyệt, sau khi đã quét explicit deny ở mọi nơi:

```
1. Organizations SCP             (trần của account, không grant)
2. Resource-based Policy         (vd S3 bucket policy, KMS key policy)
3. Identity-based Policy         (gắn user/role)
4. Permission Boundary           (trần của riêng user/role)
5. Session Policy                (trần của riêng phiên, truyền vào AssumeRole)
```

> 📏 Docs hiện tại chèn thêm một lớp trần nữa ngay sau SCP: **RCP (Resource Control Policy)**, ra mắt cuối 2024 — giống SCP nhưng đặt trần lên *resource* của account thay vì lên principal. Đề SAA-C03 và hầu hết tài liệu vẫn dùng mô hình 5 lớp ở trên.

**Đi thử một request qua đủ 5 lớp.** Account `111` là member của một organization. Alice assume role `dev-app` kèm một session policy, rồi gọi `s3:PutObject` lên bucket `reports` nằm trong chính account `111`:

```
Explicit Deny ở bất kỳ đâu?   Không có                          → đi tiếp
1. SCP của account 111        Allow s3:*                        → qua
2. Bucket policy của reports  không nhắc gì tới role dev-app    → chưa ai cấp, đi tiếp
3. Identity policy của role   Allow s3:*                        → ĐÃ CÓ người cấp
4. Permission Boundary        Allow s3:Get*, s3:Put*            → qua
5. Session policy             Allow s3:GetObject                → PutObject không nằm trong trần
                                                                 → DENY (implicit)
```

Đổi một chi tiết để thấy từng luật: bỏ session policy đi thì kết quả là ALLOW. Giữ nguyên mọi thứ nhưng thêm `Deny s3:PutObject` vào SCP thì DENY ngay ở bước đầu, các lớp sau có `Allow` bao nhiêu cũng vô ích.

**Boundary + Identity = phép giao.** Vì boundary là trần, quyền hiệu lực là phần **chung** của hai policy. Identity allow `s3:*` + Boundary chỉ `s3:Get*` → còn `s3:Get*`. Ngược lại, boundary cho `s3:*` mà identity policy không cấp gì thì quyền hiệu lực là rỗng — trần cao không tự sinh ra quyền.

**Vì sao same-account chỉ cần 1 bên, cross-account cần 2 bên?** Câu hỏi thật ra là: *ai có quyền quyết định?*

- **Cùng account.** Principal và resource chung một chủ. Dù admin viết `Allow` lên user (identity policy) hay lên bucket (resource policy) thì đó vẫn là ý của cùng một chủ, nên AWS lấy **hợp** của hai loại: **một bên Allow là đủ** (resource HOẶC identity).
- **Khác account.** Có hai chủ, và mỗi chủ chỉ quyết được phần của mình. Chủ resource (account A) phải đồng ý cho người ngoài vào — bằng resource policy. Chủ principal (account B) phải đồng ý cho người của mình đi ra dùng quyền đó — bằng identity policy. AWS chạy **hai lượt đánh giá riêng**, mỗi account một lượt, và chỉ cho qua khi **cả hai lượt đều ra Allow**. Thiếu một bên là DENY.

Ví dụ: bucket policy ở account A ghi `Principal: arn:aws:iam::B:role/reader` + `Allow s3:GetObject`, nhưng role `reader` ở B không có identity policy nào cho `s3:GetObject` lên bucket đó → DENY. Account A đã mở cửa, nhưng account B chưa cho người của mình bước qua.

**SCP áp lên ai?** SCP đi theo **principal**, không đi theo resource:

- Áp lên mọi user/role **của account bị gắn SCP** (member account), kể cả root user của account đó.
- **Không áp lên management account** — account gốc tạo ra organization và trả hoá đơn chung. Đây là lý do không nên chạy workload trong management account: không SCP nào giữ được nó.
- **Không áp lên principal của account khác** gọi vào resource của account này. Bucket ở account A cho user của account B đọc: SCP của A không đụng được tới user đó, vì user ấy do B quản.
- Không áp lên **service-linked role** (§2.8).

**Quy tắc vàng — tóm lại:**
- **Default = Deny**. Không Allow nào → Deny.
- **Explicit Deny luôn thắng** mọi Allow.
- **Same-account**: chỉ cần Allow ở **1 bên** (resource HOẶC identity).
- **Cross-account**: cần **Allow ở cả 2 bên** (resource policy bên A + identity policy bên B).
- **SCP áp principal trong account đó**, **không áp management account**, **không áp principal từ account khác** (kể cả khi gọi vào resource account này).
- **Boundary + Identity**: hiệu lực **= giao** của 2 cái.

> 🪤 Bẫy thi: thấy một policy trần (SCP, boundary, session policy) có `Allow` rộng rồi kết luận "được phép". Sai — trần không cấp quyền, vẫn cần identity hoặc resource policy cấp.
>
> 📏 Chi tiết nâng cao, ít khi ra đề: trong **cùng account**, nếu resource policy cấp thẳng cho **ARN của một IAM user** (hoặc ARN của một role session), quyền đó **không** bị implicit deny của permission boundary cắt — boundary chỉ là trần cho *identity policy*. Nếu resource policy cấp cho **ARN của role** thì boundary và session policy vẫn cắt. Explicit Deny trong boundary thì luôn thắng. Đề thi thường chỉ kiểm mô hình đơn giản "boundary là trần của user/role".

### 2.2 Resource-based vs Identity-based — bảng so sánh

Hai loại policy cấp quyền ở §2.1 khác nhau ở chỗ **gắn vào đâu**, và mọi khác biệt còn lại đều suy ra từ đó.

**Identity-based policy** gắn vào user/group/role. Vì đã gắn vào ai thì hiển nhiên nói về người đó, nên trong policy **không có trường `Principal`**. Nó chỉ cấp được quyền cho identity **trong account của mình**.

**Resource-based policy** gắn vào resource, nên bắt buộc phải có trường **`Principal`** để nói rõ *ai* được phép. Principal ấy có thể là một user/role cụ thể, cả một account khác, hoặc một AWS service. Chính trường `Principal` làm nó trở thành cánh cửa cross-account: chủ resource viết thẳng tên người ngoài vào đó.

Không phải service nào cũng có resource policy. Nhóm hay gặp trong đề: **S3** (bucket policy), **KMS** (key policy), **SQS**, **SNS**, **Lambda**, **ECR**, **EFS**, **Secrets Manager**, và trust policy của **IAM role** (cũng là một resource policy: nó nói ai được assume role). Nhóm **không có**: EC2 instance, RDS instance — muốn vào từ account khác chỉ có đường AssumeRole.

> 📏 **DynamoDB**: tài liệu luyện thi cũ (và các câu hỏi cũ) coi DynamoDB **không có** resource policy nên cross-account bắt buộc AssumeRole. Từ **20/3/2024** DynamoDB đã hỗ trợ resource-based policy cho table, index và stream (tối đa 20 KB mỗi policy), nên giờ cả hai đường đều làm được. Gặp câu hỏi cross-account DynamoDB: nếu có đáp án "resource-based policy trên table" thì nó hợp lệ; nếu chỉ có đáp án AssumeRole thì chọn AssumeRole.

**`NotPrincipal`** là phép phủ định của `Principal`, chỉ dùng được trong resource policy: "áp statement này cho *mọi người trừ* danh sách sau". Hầu như chỉ đi với `Deny`, ví dụ "Deny tất cả, trừ role `admin`". AWS khuyên tránh dùng vì dễ khoá nhầm chính mình; thay bằng `Principal: "*"` kèm condition `ArnNotEquals` trên `aws:PrincipalArn`.

**"Trực tiếp, không cần AssumeRole" có mâu thuẫn với "cross-account cần 2 bên" không?** Không — đó là hai chuyện khác nhau:

- *Cần 2 bên Allow* là luật đánh giá, lúc nào cũng đúng với cross-account.
- *Không cần AssumeRole* là nói về **danh tính lúc gọi**. Với resource policy, caller ở account B **giữ nguyên danh tính của mình** và gọi thẳng vào resource ở A; identity policy của caller ở B vẫn phải Allow. Với AssumeRole, caller **đổi sang danh tính một role của A**, từ lúc đó nó là principal của A.

Hệ quả thực tế của việc đổi danh tính: khi đã assume role của A, caller **mất quyền gốc ở B** trong suốt phiên đó. Một job cần đọc bucket ở A rồi ghi sang bucket ở B thì dùng resource policy tiện hơn, vì nó giữ được cả hai quyền cùng lúc.

| | Identity-based | Resource-based |
|--|---------------|----------------|
| Gắn vào | User/Group/Role | Resource (S3, KMS, SQS, SNS, Lambda, ECR, EFS, Secrets Manager, DynamoDB…) |
| Principal field | Không (mặc định = principal mang policy) | **Có** (chỉ định AI được phép) |
| Cross-account | Phải AssumeRole sang role của account kia | **Gọi trực tiếp** không cần AssumeRole (identity policy bên caller vẫn phải Allow) |
| Danh tính khi gọi cross-account | Đổi thành role của account kia, mất quyền gốc trong phiên | Giữ nguyên danh tính gốc |
| Hỗ trợ NotPrincipal | Không | Có |
| Có thể grant | Có | Có |

**Use case quyết định:**
- S3 bucket cho partner account đọc → **Resource policy** (đơn giản hơn AssumeRole: không phải tạo role, không phải đổi credential trong code).
- Audit trace ai làm gì → **AssumeRole**. Mỗi lần assume sinh một event `AssumeRole` trong CloudTrail kèm tên phiên (`role-session-name`), nên biết chính xác ai vào, lúc nào.
- DynamoDB cross-account → đề thi cũ: **AssumeRole**; hiện nay có thêm resource policy trên table (xem ghi chú 📏 ở trên).
- EC2, RDS cross-account → không có resource policy → bắt buộc **AssumeRole**.
- Lambda cross-account invoke → có **resource policy** (`lambda:InvokeFunction`), không cần AssumeRole.

### 2.3 Cross-account access patterns

#### Pattern A — Resource policy trực tiếp (đơn giản)
**Khi nào**: S3, KMS, Lambda, SNS, SQS, Secrets Manager (service có resource policy).

```
Account A (resource) → bucket policy allow account B principal
Account B (caller)    → user/role có IAM policy s3:GetObject
```

→ Caller B gọi trực tiếp `s3:GetObject` lên bucket A. Không AssumeRole. Hai dòng trên chính là "2 bên Allow" của §2.1: thiếu dòng nào cũng DENY.

#### Pattern B — AssumeRole (audit tốt)
**Khi nào**: EC2, RDS (không có resource policy), DynamoDB theo cách truyền thống, hoặc khi cần audit role usage.

```
Account A (trusting) → tạo Role `XAccessor` với:
  - Trust policy: Principal = arn:aws:iam::B:root (hoặc cụ thể user/role B)
  - Permissions policy: s3:* / dynamodb:* …
Account B (trusted)  → user/role có sts:AssumeRole trên ARN role A
```

Một role có **hai** policy làm hai việc khác nhau. **Trust policy** trả lời "*ai* được assume role này" — nó là resource policy của chính role. **Permissions policy** trả lời "assume xong thì *làm được gì*". `Principal = arn:aws:iam::B:root` không có nghĩa là root user của B, mà là "**cả account B**": A giao cho admin của B tự quyết user/role nào bên B được assume (bằng cách cấp `sts:AssumeRole` cho họ).

Caller B chạy:
```bash
aws sts assume-role \
  --role-arn arn:aws:iam::A:role/XAccessor \
  --role-session-name "alice@$(date +%s)" \
  --external-id "secret-shared-string"
```

→ Nhận temp credential (1h default, max 12h — chi tiết ở §2.10).

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

**Federation là đổi cái gì lấy cái gì?** Người dùng hoặc workload của bạn đã có sẵn danh tính ở một hệ thống **bên ngoài AWS** — tài khoản công ty trong Active Directory, một job trên GitHub Actions, một server trong datacenter. Federation là: mang **bằng chứng đã đăng nhập** ở hệ thống đó tới **STS** (Security Token Service, dịch vụ phát credential tạm của AWS), đổi lấy **credential tạm của một IAM role**. Không tạo IAM user, không có access key dài hạn nào để lộ.

Hệ thống bên ngoài đứng ra xác nhận danh tính gọi là **IdP (Identity Provider)**: Okta, Microsoft Entra ID (Azure AD), AD FS, Google, GitHub… Mọi kiểu federation đều theo cùng một khung ba bước:

```
1. Đăng nhập ở IdP              → IdP cấp một "giấy xác nhận" có CHỮ KÝ SỐ của IdP
2. Đưa giấy đó cho STS          → STS kiểm chữ ký (bạn đã đăng ký IdP này với IAM từ trước)
                                  và kiểm trust policy của role có chấp nhận giấy này không
3. STS trả credential tạm       → dùng như credential của role, hết hạn thì đổi lại
```

Bốn cách dưới đây chỉ khác nhau ở **dạng của tờ giấy xác nhận** và **ai là người cầm nó**.

#### SAML 2.0 — SSO doanh nghiệp

**SAML** (Security Assertion Markup Language) là chuẩn SSO lâu đời của doanh nghiệp. Tờ giấy xác nhận là một tài liệu **XML có chữ ký**, gọi là *SAML assertion*, nội dung kiểu "đây là alice, thuộc nhóm Dev, được dùng role X".

Luồng: nhân viên mở trang đăng nhập của công ty (AD FS, Okta) và đăng nhập bằng tài khoản công ty. IdP trả về SAML assertion. Trình duyệt gửi assertion đó tới AWS, AWS gọi **`AssumeRoleWithSAML`** và cho nhân viên vào Console với quyền của role. Điều kiện để AWS tin: bạn đã tạo sẵn một **SAML provider** trong IAM, chứa metadata (khoá công khai) của IdP để kiểm chữ ký.

Dùng khi công ty đã có IdP SAML và muốn nhân viên vào AWS bằng tài khoản công ty.

#### OIDC (Web Identity) — CI/CD, Kubernetes, mobile

**OIDC** (OpenID Connect) là chuẩn mới hơn, phổ biến ở web/mobile/CI. Tờ giấy xác nhận là một **JWT** (JSON Web Token): một chuỗi JSON ngắn có chữ ký của IdP. Bên trong JWT là các **claim** (thông tin khẳng định), ba claim hay gặp nhất:

| Claim | Nghĩa | Ví dụ với GitHub Actions |
|-------|-------|--------------------------|
| `iss` | *issuer* — ai phát token | `https://token.actions.githubusercontent.com` |
| `aud` | *audience* — token này phát ra để đưa cho ai | `sts.amazonaws.com` |
| `sub` | *subject* — token nói về ai/cái gì | `repo:acme/web:ref:refs/heads/main` |

Workload cầm JWT gọi **`AssumeRoleWithWebIdentity`**. STS tải khoá công khai của IdP (từ một URL công bố sẵn) để kiểm chữ ký, rồi so `aud` và `sub` với condition trong trust policy của role. Vì vậy **condition trên `sub` là thứ quyết định ai vào được**: bỏ nó đi thì bất kỳ repo nào trên GitHub cũng assume được role của bạn.

Dùng cho GitHub Actions, GitLab CI, Kubernetes ServiceAccount (IRSA, xem dưới), và app mobile đăng nhập bằng Google/Facebook/Apple.

#### IAM Identity Center — SSO nhiều account, cách AWS khuyên dùng

Hai cách trên phải cấu hình provider + role **ở từng account**. Có 50 account thì làm 50 lần. **IAM Identity Center** (tên cũ: AWS SSO) là dịch vụ làm việc đó hộ cho cả organization:

- **Nguồn danh tính**: thư mục có sẵn của Identity Center, Active Directory, hoặc một IdP ngoài (Okta, Entra ID…).
- **Permission Set**: một mẫu quyền (ví dụ `ReadOnly`, `DevPowerUser`). Khi bạn gán "nhóm Dev + permission set `DevPowerUser` + account `prod`", Identity Center **tự tạo một IAM role tương ứng trong account `prod`**.
- Người dùng đăng nhập **một lần** vào cổng (access portal), thấy danh sách account + quyền mình có, bấm chọn là vào. CLI cũng lấy credential tạm qua cổng này (`aws sso login`).

Bên dưới vẫn là federation vào role bằng credential tạm, chỉ khác là bạn không tự tay gọi API nào. Đề hỏi "SSO cho nhiều account, quản lý tập trung" → Identity Center.

#### IAM Roles Anywhere — workload ngoài AWS

Server on-prem không phải người nên không đăng nhập IdP được. Thứ nó có thể có là một **X.509 certificate**: "chứng minh thư số" gồm một khoá công khai và danh tính, được một **CA** (Certificate Authority, nơi cấp chứng thư) ký — cùng loại với chứng thư TLS của website.

- **Trust anchor**: bạn đăng ký CA của mình với Roles Anywhere (CA riêng của công ty, hoặc AWS Private CA). Từ đó AWS tin mọi certificate do CA này ký.
- **Profile**: khai báo các role mà certificate được phép assume, kèm session policy nếu muốn thu hẹp.
- Server dùng **private key** đi kèm certificate để ký một request **`CreateSession`**, nhận về credential tạm của role. AWS cấp sẵn một công cụ (*credential helper*) để SDK/CLI tự làm việc này.

Dùng khi workload chạy ngoài AWS (on-prem, cloud khác) cần gọi AWS API mà không muốn cất access key dài hạn trên máy.

#### Đặt bốn cách cạnh nhau

| Cách | Khi nào | Identity provider | Giấy xác nhận | API |
|------|---------|-------------------|---------------|-----|
| **SAML 2.0** | Enterprise SSO (AD FS, Okta SAML) | IdP tự setup | SAML assertion (XML có chữ ký) | `AssumeRoleWithSAML` |
| **OIDC** (Web Identity) | GitHub Actions, Kubernetes ServiceAccount, mobile (Google/FB) | IdP có OIDC endpoint | JWT | `AssumeRoleWithWebIdentity` |
| **IAM Identity Center** (best for AWS) | Multi-account SSO | AWS managed (hoặc external) | Do Identity Center lo | Internal |
| **IAM Roles Anywhere** | Workload on-prem | Private CA + X.509 cert | X.509 certificate + chữ ký bằng private key | `CreateSession` (signed) |

> 🪤 Bẫy thi: *"nhân viên dùng tài khoản công ty vào nhiều AWS account"* → **IAM Identity Center**. *"pipeline CI không lưu access key"* → **OIDC**. *"server on-prem không lưu access key"* → **IAM Roles Anywhere**. *"IdP của công ty chỉ hỗ trợ SAML, vào một account"* → **SAML 2.0 federation**.

#### GitHub Actions OIDC — pattern cực phổ biến
1. Tạo OIDC provider 1 lần (đăng ký "tôi tin IdP này" với IAM):
   ```bash
   aws iam create-open-id-connect-provider \
     --url https://token.actions.githubusercontent.com \
     --client-id-list sts.amazonaws.com \
     --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
   ```
   `--client-id-list` là giá trị `aud` được chấp nhận. **Thumbprint** là mã băm SHA-1 (40 ký tự hex) của certificate TLS phía IdP, ngày trước IAM dùng nó để chắc mình đang tải khoá từ đúng máy chủ. Hiện nay IAM xác minh bằng bộ root CA tin cậy của chính AWS và chỉ dùng thumbprint khi IdP dùng certificate không do các CA đó ký, nên tham số này đã thành **tuỳ chọn** — bỏ đi thì IAM tự lấy. Nhiều hướng dẫn cũ vẫn ghi nó.

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
   `Principal` ở đây là `Federated` (một IdP) chứ không phải `AWS` (một account). Condition `sub` khoá role vào đúng repo `acme/web`, nhánh `main`: workflow chạy từ repo khác hoặc nhánh khác mang `sub` khác nên bị từ chối.

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
   `id-token: write` cho phép job xin JWT từ GitHub. Action `configure-aws-credentials` cầm JWT đó gọi `AssumeRoleWithWebIdentity` và đặt credential tạm vào biến môi trường cho các bước sau.

→ **Không có secret AWS** trong GitHub repo. Thứ duy nhất nằm trong repo là ARN của role, mà ARN thì không phải bí mật.

#### IRSA — IAM role cho từng pod trên EKS

Trên EKS (Kubernetes do AWS quản lý), **pod** là đơn vị chạy nhỏ nhất, gồm một hoặc vài container, và nhiều pod chạy chung trên một **node** (một EC2 instance). Nếu chỉ dùng IAM role của node thì **mọi pod trên node đó có chung một bộ quyền**: pod thanh toán và pod log cùng đọc được mọi thứ.

**IRSA** (IAM Roles for Service Accounts) cho mỗi pod một role riêng, và nó chính là OIDC federation:

- Mỗi EKS cluster có sẵn một **OIDC issuer**. Bạn đăng ký issuer đó làm OIDC provider trong IAM (một lần cho mỗi cluster).
- Mỗi pod chạy dưới một **ServiceAccount** (danh tính của pod trong Kubernetes). Bạn gắn annotation ARN của role lên ServiceAccount.
- Kubernetes đặt vào pod một JWT có `sub = system:serviceaccount:<namespace>:<tên ServiceAccount>`. AWS SDK trong pod tự dùng JWT đó gọi `AssumeRoleWithWebIdentity`.
- Trust policy của role có condition trên `sub`, nên chỉ đúng ServiceAccount đó assume được.

AWS có thêm **EKS Pod Identity** (cuối 2023) làm cùng việc với ít bước cấu hình hơn; đề SAA-C03 vẫn dùng từ khoá IRSA.

#### Cognito — User Pool khác Identity Pool thế nào?

Amazon Cognito có hai thành phần tên gần giống nhau nhưng làm hai việc khác hẳn:

| | **User Pool** | **Identity Pool** |
|--|---------------|-------------------|
| Trả lời câu hỏi | "Bạn là ai?" (xác thực) | "Bạn được làm gì trên AWS?" (cấp credential) |
| Là gì | Một **danh bạ người dùng**: đăng ký, đăng nhập, quên mật khẩu, MFA, đăng nhập qua Google/Facebook | Một **quầy đổi token** lấy credential tạm của IAM role |
| Đầu ra | JWT | AWS temp credential (access key + secret + session token) |
| Dùng để | App gọi **API của bạn** (API Gateway, ALB kiểm JWT) | App gọi **thẳng dịch vụ AWS** (S3, DynamoDB) từ thiết bị người dùng |

Hai thứ hay đi cùng nhau: đăng nhập ở User Pool lấy JWT, đưa JWT cho Identity Pool đổi credential. Identity Pool cũng nhận token trực tiếp từ Google/Facebook/Apple, và cấp được credential cho cả **khách chưa đăng nhập** (guest) bằng một role riêng ít quyền hơn.

```
User login Google/FB/Apple → IdToken
  ↓
Cognito Identity Pool exchange → AWS temp credential
  ↓
Mobile app SDK upload S3 trực tiếp (chỉ với prefix /users/{sub}/)
```

Role có condition `${cognito-identity.amazonaws.com:sub}` giới hạn user chỉ upload prefix của họ. Biến này được thay bằng ID riêng của từng người dùng lúc đánh giá policy, nên **một** role dùng chung cho cả triệu người mà mỗi người vẫn chỉ chạm được thư mục của mình.

> 🪤 Bẫy thi: *"đăng ký / đăng nhập cho app, không tự xây hệ thống user"* → **User Pool**. *"app mobile cần upload thẳng lên S3"* hoặc *"cấp quyền AWS cho khách chưa đăng nhập"* → **Identity Pool**.

### 2.6 ABAC — attribute-based access control

**RBAC** (role-based, truyền thống): mỗi nhóm quyền là một role/policy riêng, trong đó liệt kê ARN của những resource được phép. Số policy phải viết tăng theo số tổ hợp cần phân quyền, và mỗi lần thêm resource hay thêm project là phải sửa policy.

**ABAC** (attribute-based): gắn **tag** lên cả principal lẫn resource, rồi viết **một** policy với luật "tag hai bên khớp nhau thì được". Policy không nhắc tới resource cụ thể nào nên không phải sửa khi hệ thống lớn lên.

```
20 project × 3 môi trường (dev/staging/prod)
RBAC:  20 × 3 = 60 role/policy, thêm project thứ 21 → viết thêm 3 cái
ABAC:  1 policy so tag Project + Environment, thêm project thứ 21 → chỉ gắn tag
```

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

`aws:PrincipalTag/Project` là giá trị tag `Project` trên user/role đang gọi; `aws:ResourceTag/Project` là giá trị tag `Project` trên resource bị tác động. Condition chỉ đúng khi hai giá trị bằng nhau.

→ User tag `Project=alpha` chỉ start/stop EC2 tag `Project=alpha`. Thêm project mới = thêm tag, **không cần sửa policy**.

Điểm yếu phải biết: trong ABAC, **ai sửa được tag là người đó tự cấp quyền được**. Vì vậy phải khoá quyền gắn/sửa tag (`ec2:CreateTags`, `iam:TagUser`…) chặt như khoá quyền sửa policy.

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

Nhiều dịch vụ AWS phải thay bạn gọi dịch vụ khác: Auto Scaling phải launch EC2, GuardDuty phải đọc VPC Flow Logs. Chúng làm việc đó bằng cách assume một role trong account của bạn. Có **hai loại** role như vậy, và đề thi hay bẫy ở chỗ phân biệt chúng:

| | **Service role** (thường) | **Service-linked role** |
|--|---------------------------|-------------------------|
| Ai tạo | **Bạn** tạo trong IAM | **Service** tự tạo khi bạn bật tính năng (hoặc bạn tạo bằng `iam:CreateServiceLinkedRole`) |
| Ai định quyền | Bạn viết permissions policy và trust policy | Service định sẵn cả hai, **bạn chỉ xem được, không sửa được** |
| Ai assume được | Service ghi trong trust policy do bạn viết | Chỉ đúng service gắn với nó |
| Gắn vào service bằng | Bạn chọn role lúc tạo resource → cần **`iam:PassRole`** (§2.7) | Service tự dùng, không có bước PassRole |
| Tên | Tuỳ bạn | Prefix `AWSServiceRoleFor...`, ví dụ `AWSServiceRoleForAutoScaling` |
| Xoá | Lúc nào cũng được | Chỉ xoá được sau khi đã xoá hết resource của service đang dùng nó |
| SCP | Bị SCP giới hạn | **Không** bị SCP giới hạn |

Ví dụ service role: Lambda execution role, EC2 instance role, ECS task role — bạn tự viết policy nên bạn chịu trách nhiệm least-privilege. Ví dụ service-linked role: GuardDuty, Config, Organizations, Auto Scaling, RDS, ELB.

- Role do **AWS service tự tạo + quản lý**.
- Tên có prefix `AWSServiceRoleFor...`.
- KHÔNG sửa được trust policy (và cả permissions policy).
- Use case: GuardDuty, Config, Organizations, Auto Scaling…

→ Đề thi: thấy "service tự setup permission", "role được định nghĩa sẵn bởi service" → SLR. Thấy "cần giới hạn quyền của Lambda/EC2" → đó là service role thường, bạn sửa policy của nó.

### 2.9 IAM Access Analyzer

**Giải quyết bài toán gì.** Bạn có vài trăm bucket, role, KMS key, mỗi cái có resource policy riêng. Câu hỏi "có cái nào đang mở ra ngoài mà tôi không biết không?" không thể trả lời bằng cách đọc tay từng policy.

**Cơ chế: phân tích policy, không phải đọc log.** Khi tạo analyzer, bạn chọn **zone of trust** (vùng tin cậy): một account, hoặc cả organization. Access Analyzer đọc **resource policy** của mọi resource được hỗ trợ và dùng suy luận logic để tính: *với policy này, có principal nào nằm ngoài zone of trust vào được không?* Có thì sinh một **finding**, ghi rõ resource nào, ai bên ngoài, được làm gì.

Vì nó suy ra từ nội dung policy nên nó bắt được cả quyền truy cập **chưa từng được dùng** — điều mà phân tích log (CloudTrail) không làm được, vì log chỉ ghi chuyện đã xảy ra. Policy mới hoặc vừa sửa được phân tích lại trong khoảng **30 phút**.

Resource được quét gồm: S3 bucket, IAM role (trust policy), KMS key, Lambda function, SQS queue, SNS topic, Secrets Manager secret, ECR repository, EFS, DynamoDB table/stream, và snapshot của EBS/RDS.

Các tính năng, theo thứ tự hay gặp trong đề:

- **External access findings** — phát hiện resource share **ra ngoài account/org** (S3 bucket public, IAM role trust account khác…). Miễn phí. Analyzer là **theo Region**: phải tạo ở mỗi Region có resource.
- **Unused access findings** — tìm role không ai dùng, access key và mật khẩu bỏ không, quyền được cấp mà không bao giờ dùng. Tính năng này dựa trên dữ liệu "last accessed" (§2.12) và **tính tiền** theo số role/user được phân tích mỗi tháng.
- **Policy generation** — đọc CloudTrail của một user/role trong khoảng thời gian bạn chọn (**tối đa 90 ngày**) rồi sinh ra policy chỉ gồm những action nó thực sự đã gọi. Đây là cách đi từ `AdministratorAccess` về least-privilege mà không phải đoán.
- **Policy validation** — kiểm cú pháp và best practice của policy ngay lúc viết (cảnh báo kiểu "`iam:PassRole` với `Resource: *`").
- **Custom policy check** — validate policy trước deploy (CI/CD integration): hỏi "bản policy mới có cấp thêm quyền so với bản cũ không?", "có cho phép action X không?". Tính tiền theo số lần gọi.

Về vận hành, nên review **findings** định kỳ (ví dụ hàng tuần): cái nào chủ ý thì archive, cái nào không thì sửa policy.

> 🪤 Bẫy thi: *"phát hiện resource bị share ra ngoài account/organization"* → **Access Analyzer**. Đừng nhầm với **GuardDuty** (phát hiện hành vi đáng ngờ từ log), **Macie** (tìm dữ liệu nhạy cảm trong S3), hay **Access Advisor** (§2.12: quyền nào không dùng tới).

### 2.10 STS deep

**STS** (Security Token Service) là dịch vụ duy nhất phát **credential tạm**. Một bộ credential tạm gồm ba phần — access key ID, secret access key, và **session token** — kèm thời điểm hết hạn. Hết hạn là vô dụng, không cần ai thu hồi; đó là lý do nó an toàn hơn access key dài hạn của IAM user.

Năm API của STS chia làm hai nhóm theo câu hỏi "kết quả là danh tính của ai?".

**Nhóm AssumeRole — kết quả là một role session.** Ba API khác nhau ở thứ bạn đưa ra để chứng minh mình là ai:

- **`AssumeRole`**: đưa credential AWS sẵn có (của IAM user hoặc role khác). Dùng cho cross-account (§2.3) và đổi sang role quyền cao hơn trong cùng account.
- **`AssumeRoleWithSAML`**: đưa SAML assertion (§2.5).
- **`AssumeRoleWithWebIdentity`**: đưa JWT của OIDC (§2.5). Hai API "With…" **không cần** credential AWS nào để gọi — tờ giấy xác nhận là đủ.

**Nhóm Get…Token — kết quả vẫn gắn với IAM user đã gọi.** Không có role nào ở đây:

- **`GetSessionToken`**: IAM user đổi access key dài hạn + mã MFA lấy credential tạm **có đánh dấu "đã qua MFA"**. Tình huống dùng: policy có condition `aws:MultiFactorAuthPresent` chặn các API nhạy cảm; access key trần thì không bao giờ mang được dấu MFA, nên user chạy `aws sts get-session-token --serial-number <arn MFA> --token-code 123456` rồi dùng credential tạm để gọi các API đó.
- **`GetFederationToken`**: kiểu federation đời cũ, trước khi có SAML/OIDC. Một ứng dụng trung gian của công ty (*identity broker*) giữ access key của một IAM user, tự xác thực nhân viên theo cách riêng, rồi gọi API này kèm một session policy để phát credential tạm cho từng nhân viên. Nay chỉ còn gặp ở hệ thống cũ; thiết kế mới dùng Identity Center hoặc AssumeRoleWithSAML/WebIdentity.

| API | Use case | Thời hạn (tối thiểu → tối đa, mặc định) |
|-----|----------|------------------------------------------|
| `AssumeRole` | Cross-account/within-account role | 15 phút → **12h** (theo cấu hình role), mặc định 1h |
| `AssumeRoleWithSAML` | SAML federation | 15 phút → **12h**, mặc định 1h |
| `AssumeRoleWithWebIdentity` | OIDC (GitHub, Cognito, Google) | 15 phút → **12h**, mặc định 1h |
| `GetSessionToken` | MFA-protected session cho IAM user | 15 phút → **36h**, mặc định 12h |
| `GetFederationToken` | Federation cho user không IAM (legacy) | 15 phút → **36h**, mặc định 12h |

**Con số 12h không phải mặc định.** Mỗi role có thiết lập *maximum session duration*, đặt được từ 1 đến 12 giờ, và **mặc định là 1 giờ**. Xin phiên dài hơn mức đó thì lời gọi lỗi, không phải bị cắt ngắn. Thêm một trần nữa: **role chaining** — dùng credential của role A để assume tiếp role B — luôn bị giới hạn **1 giờ**, bất kể role B cấu hình bao nhiêu. Với root user, hai API Get…Token chỉ cho tối đa 1 giờ.

Tính thử cho một job ETL chạy 5 giờ liên tục bằng một role:

```
Cần phiên dài:     5 giờ × 3.600 = 18.000 giây
Role mặc định:     MaxSessionDuration = 3.600 giây (1 giờ)
  → gọi assume-role --duration-seconds 18000  → LỖI (vượt max của role)
Sửa role:          MaxSessionDuration ≥ 18.000 (trần là 43.200 = 12 giờ)
  → gọi lại                                   → được phiên 5 giờ

Nếu job đi qua role chaining (role CI → role deploy):
  → trần cứng 3.600 giây, không cấu hình được → job phải tự assume lại mỗi giờ
```

Trong thực tế bạn hiếm khi phải tính thế này trên EC2/Lambda/ECS: SDK tự lấy credential mới trước khi cái cũ hết hạn. Con số chỉ thành vấn đề khi bạn tự gọi `assume-role` rồi cất credential vào biến môi trường.

**Regional endpoint** — luôn dùng `sts.<region>.amazonaws.com`, KHÔNG global (`sts.amazonaws.com`) cho HA.

Lý do: endpoint global `sts.amazonaws.com` từ trước tới nay được phục vụ bởi **một Region duy nhất, us-east-1 (N. Virginia)**. Workload ở Singapore gọi nó nghĩa là mỗi lần xin credential phải đi nửa vòng trái đất, và nếu us-east-1 gặp sự cố thì workload ở Singapore **không lấy được credential mới** dù mọi thứ ở Singapore vẫn chạy tốt. Endpoint theo Region (`sts.ap-southeast-1.amazonaws.com`) nằm ngay trong Region của bạn nên vừa nhanh hơn, vừa không phụ thuộc Region khác.

> 📏 Gần đây AWS đã đổi hành vi: request tới endpoint global xuất phát từ một Region **bật mặc định** (và dùng DNS của Amazon trong VPC) được phục vụ ngay tại Region đó. Request từ **opt-in Region** hoặc qua DNS bên ngoài vẫn về us-east-1. Khuyến nghị của AWS và đáp án đề thi không đổi: **dùng regional endpoint**.

### 2.11 IMDSv2 — chặn SSRF lấy credential của instance role

**IMDS là gì.** Một EC2 instance có gắn IAM role lấy credential của role đó ở đâu? Ở **Instance Metadata Service (IMDS)**: một HTTP endpoint tại địa chỉ cố định `169.254.169.254`, chỉ gọi được **từ bên trong instance**. SDK gọi vào đó, nhận về credential tạm, và tự gọi lại khi sắp hết hạn.

**Lỗ hổng với IMDSv1.** Ở phiên bản 1, lấy credential chỉ cần một lệnh `GET` trần:

```bash
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/<tên-role>
```

**SSRF** (Server-Side Request Forgery) là lỗi mà kẻ tấn công khiến *server của bạn* gửi một HTTP request tới URL do hắn chọn — ví dụ tính năng "nhập URL ảnh để tạo thumbnail". Hắn nhập URL ở trên, server của bạn (đang chạy trong instance) ngoan ngoãn tải về, và trả cho hắn credential của instance role. Từ đó hắn dùng credential ấy từ máy của hắn.

**IMDSv2 chặn bằng cách nào.** Bắt buộc hai bước:

```bash
# Bước 1: PUT để xin token phiên (kèm header TTL, tối đa 21.600 giây = 6 giờ)
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
# Bước 2: mọi GET phải mang token đó trong header
curl -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/iam/security-credentials/<tên-role>
```

Ba lớp chắn nằm trong hai bước đó:

- Phần lớn lỗi SSRF chỉ cho kẻ tấn công điều khiển **URL của một lệnh GET**. Hắn không gửi được `PUT`, cũng không tự thêm được header, nên không lấy được token.
- Request `PUT` có header `X-Forwarded-For` bị từ chối. Header này do proxy/WAF tự thêm khi chuyển tiếp request, nên một request bị chuyển tiếp nhầm từ ngoài vào sẽ không xin được token.
- Gói tin trả về token có **hop limit = 1**, tức là không đi qua được thêm một chặng mạng nào, nên token không lọt ra khỏi instance. (Container chạy trên instance là thêm một chặng — khi cần phải nâng hop limit lên 2.)

**Bắt buộc dùng v2**: đặt `HttpTokens = required` trên instance hoặc launch template; khi đó request kiểu v1 nhận lỗi `401`. Ở mức account có thiết lập mặc định + *enforce* IMDSv2 cho từng Region (instance không yêu cầu v2 sẽ không launch được); ở mức organization thì dùng SCP chặn việc launch instance không bật IMDSv2.

> 🪤 Bẫy thi: *"ứng dụng trên EC2 bị SSRF làm lộ credential của instance role"* → **bắt buộc IMDSv2**. Không phải đổi sang access key, cũng không phải thêm rule Security Group.

### 2.12 Credential Report và Access Advisor — dọn quyền thừa

Hai công cụ có sẵn trong IAM, miễn phí, trả lời hai câu hỏi khác nhau khi audit.

**Credential Report — "credential của các user đang ở tình trạng nào?"** Một file **CSV** cấp account, mỗi dòng là một IAM user (kèm root). Các cột cho biết: có mật khẩu không và dùng lần cuối khi nào, đã bật MFA chưa, từng access key có đang active không, tạo/rotate lần cuối khi nào, dùng lần cuối khi nào và cho service nào. IAM tạo lại report tối đa **4 giờ một lần**. Dùng để tìm user chưa bật MFA, access key quá 90 ngày chưa rotate, user bỏ không.

**Access Advisor — "quyền nào được cấp mà không dùng?"** Là tab *Last Accessed* trên từng user/group/role/policy. Nó liệt kê **từng service mà identity được phép dùng** và **lần cuối identity đó thử gọi service ấy** (dữ liệu giữ ít nhất 400 ngày). Role được cấp quyền cho 40 service mà một năm chỉ gọi 3 service → cắt 37 cái còn lại khỏi policy.

| | **Credential Report** | **Access Advisor** | **Access Analyzer** (§2.9) |
|--|-----------------------|--------------------|----------------------------|
| Câu hỏi | Mật khẩu / access key / MFA của user ra sao? | Service nào được cấp quyền mà không dùng? | Resource nào đang mở ra ngoài account/org? |
| Phạm vi | Toàn bộ IAM user của account | Từng user/group/role/policy | Resource policy trong zone of trust |
| Dạng | File CSV | Tab trong console IAM | Findings |

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
   <details><summary>Đáp án</summary>**Bucket policy ở B allow Lambda execution role của A** (resource-based), cộng với identity policy của execution role cho `s3:GetObject` lên bucket đó — cross-account luôn cần cả 2 bên (§2.1). Không cần AssumeRole, không cần thay đổi code Lambda.</details>

3. 3rd-party SaaS X (account ID 999) yêu cầu role trong account bạn để monitor bills. Tạo trust policy thế nào?
   <details><summary>Đáp án</summary>Trust `Principal: arn:aws:iam::999:root` + **bắt buộc ExternalId** (random secret X cung cấp) + Condition `sts:ExternalId`. Không có ExternalId → confused deputy risk.</details>

4. User có Permission Boundary chỉ `s3:Get*`. Identity policy allow `s3:*`. Bucket policy allow `s3:PutObject`. Gọi `s3:PutObject`?
   <details><summary>Đáp án</summary>Đáp án đề thi mong đợi: **DENY** — boundary là trần của user, `s3:PutObject` nằm ngoài `s3:Get*`. Điều này đúng khi bucket ở **account khác**, hoặc bucket policy cấp cho cả account (`:root`) hay cho một role: lượt đánh giá phía user vẫn phải qua boundary. Ngoại lệ theo docs (xem ghi chú 📏 cuối §2.1): nếu bucket **cùng account** và bucket policy ghi đích danh **ARN của IAM user đó** làm `Principal`, thì implicit deny của boundary không cắt được quyền này và kết quả là ALLOW. Muốn chặn chắc chắn thì boundary phải có **explicit Deny**.</details>

5. Developer cần tạo Lambda role cho app, không được tạo Admin role. Setup gì?
   <details><summary>Đáp án</summary>(1) Permission Boundary `DevBoundary` cap quyền. (2) Policy cho dev: `iam:CreateRole` + `iam:PassRole` **bắt buộc** `iam:PermissionsBoundary = DevBoundary` và `iam:PassedToService = lambda.amazonaws.com`. (3) Deny `iam:DeleteRolePermissionsBoundary`.</details>

6. EKS Pod cần đọc S3 không dùng node IAM role (least-privilege). Dùng gì?
   <details><summary>Đáp án</summary>**IRSA** (IAM Roles for Service Accounts) — OIDC federation, xem §2.5. EKS cluster có OIDC provider, ServiceAccount link role qua annotation. Pod nhận temp credential per-pod.</details>

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

- **Cross-account = 2 bên Allow**, không có ngoại lệ: resource policy (hoặc trust policy của role) bên chủ resource + identity policy bên caller. Resource policy chỉ giúp **khỏi phải AssumeRole**, không thay được identity policy bên caller (§2.2).
- **DynamoDB**: đề thi cũ coi là **không có resource policy** → cross-account phải AssumeRole. Từ 3/2024 DynamoDB đã có resource-based policy cho table/index/stream; **EC2, RDS** thì vẫn không có (§2.2).
- **S3, KMS, SQS, SNS, Lambda, ECR, EFS, Secrets Manager** **có** resource policy.
- **KMS Key Policy là bắt buộc** — IAM policy không override được KMS deny.
- **ExternalId** = 3rd-party trust.
- **Permission Boundary** = delegation.
- **iam:PassRole** thường là bẫy escalation.
- **IRSA cho EKS**, **IAM Roles Anywhere** cho on-prem, **OIDC** cho CI.
- **SCP áp principal trong account đó**, không áp management account, không áp principal cross-account.
- **IMDSv2 required** chống SSRF lấy role credential (§2.11).
- **Service-linked role**: service tự tạo, không sửa được policy, không bị SCP giới hạn. Khác service role thường do bạn tạo rồi PassRole (§2.8).
- **STS**: AssumeRole mặc định 1h, tối đa 12h theo cấu hình role; role chaining tối đa 1h; luôn dùng regional endpoint (§2.10).
- **Access Analyzer** = resource share ra ngoài; **Access Advisor** = quyền không dùng; **Credential Report** = tình trạng mật khẩu/key/MFA của user (§2.9, §2.12).
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
| Cross-account DDB | **AssumeRole** (đáp án quen thuộc của đề); hiện có thêm resource policy trên table |
| Cross-account EC2/RDS API | **AssumeRole** (không có resource policy) |
| EC2 bị SSRF lộ credential | **IMDSv2 required** |
| SSO nhiều account | **IAM Identity Center** + permission set |
| App mobile upload thẳng S3 | **Cognito Identity Pool** |
| Tìm quyền không dùng để cắt | **Access Advisor** (last accessed) |
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
- **Resource policy** — S3/KMS/SQS/SNS/Lambda/ECR/EFS/Secrets. **Không có** ở EC2, RDS. DDB: đề thi cũ coi là không có, từ 3/2024 đã có.
- **ExternalId** — 3rd-party trust, chống confused deputy.
- **Permission Boundary** — cap user/role, dùng cho delegation.
- **SCP** — cap account, không grant, không áp management account.
- **iam:PassRole** — check khi gán role cho service. Bẫy escalation.
- **Service-linked Role** — AWS tự tạo, prefix `AWSServiceRoleFor`, không sửa được policy, không bị SCP giới hạn.
- **Service role** — bạn tự tạo + tự viết policy, gắn vào service bằng `iam:PassRole` (Lambda execution role, EC2 instance role).
- **IRSA** — EKS pod role qua OIDC: mỗi ServiceAccount một role, thay vì mọi pod dùng chung role của node.
- **Federation** — đổi giấy xác nhận của IdP (SAML assertion / JWT / X.509) lấy credential tạm của role qua STS.
- **IAM Identity Center** — SSO nhiều account; permission set = mẫu quyền được triển khai thành role ở từng account.
- **IAM Roles Anywhere** — on-prem qua X.509.
- **OIDC** — CI/CD AWS không cần access key.
- **Cognito Identity Pool** — exchange social token → AWS temp credential. **User Pool** — danh bạ user, đăng ký/đăng nhập, trả JWT.
- **ABAC** — tag-based, scale tốt hơn RBAC.
- **IMDSv2** — token-based metadata, chống SSRF: phải `PUT` lấy token (TTL tối đa 6h) rồi mới `GET` kèm header.
- **STS regional** — luôn dùng regional endpoint cho HA; endpoint global gốc nằm ở us-east-1.
- **STS duration** — AssumeRole* 15 phút → 12h (mặc định 1h, role chaining tối đa 1h); GetSessionToken/GetFederationToken 15 phút → 36h (mặc định 12h).
- **Access Analyzer** — phát hiện external sharing bằng cách phân tích resource policy (không phải log); sinh policy least-privilege từ CloudTrail (tối đa 90 ngày).
- **Credential Report** — CSV mọi user: mật khẩu, access key, MFA; tạo lại tối đa 4 giờ/lần.
- **Access Advisor** — service nào user/role dùng gần đây → trim policy.
