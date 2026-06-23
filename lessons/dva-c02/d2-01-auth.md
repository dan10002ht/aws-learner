# Authentication & Authorization

Bài này thuộc **DVA-C02 Domain 2: Security** — domain chiếm ~26% đề thi và là nơi nhiều câu hỏi tình huống "chọn dịch vụ đúng" xuất hiện. Với vai trò developer, bạn cần phân biệt rõ **authentication** (bạn là ai?) và **authorization** (bạn được phép làm gì?), rồi map đúng vào các service AWS: Cognito, IAM, STS.

> 💡 Mẹo thi: Khi đọc đề, gạch chân 3 thứ: (1) ai đang đăng nhập — end user của app hay developer/service? (2) cần JWT hay cần AWS credentials? (3) federated từ provider nào (Google/Facebook/SAML/OIDC)? Ba câu này quyết định 80% câu Cognito.

---

## 1. Bức tranh tổng thể: Authn vs Authz trên AWS

| Khái niệm | Service chính | Output |
|-----------|---------------|--------|
| End user đăng nhập app (web/mobile) | **Cognito User Pool** | JWT (id/access/refresh token) |
| Đổi danh tính lấy quyền gọi AWS service | **Cognito Identity Pool** | Temporary AWS credentials (qua STS) |
| App/service/EC2/Lambda gọi AWS API | **IAM Role** | Temporary credentials (qua STS) |
| Cấp credentials tạm thời, federation | **STS** | AccessKeyId + SecretAccessKey + SessionToken |
| Quyền chi tiết "được làm gì" | **IAM Policy** (+ Cognito groups) | Allow/Deny |

Quy tắc vàng cần thuộc lòng:

- **User Pool = authentication** → trả về **token JWT**, KHÔNG phải AWS credentials.
- **Identity Pool = authorization để gọi AWS** → trả về **AWS credentials tạm thời**.
- Hai cái này **độc lập** và **thường dùng chung**: User Pool xác thực user → đưa token cho Identity Pool → Identity Pool đổi lấy AWS credentials.

> ⚠️ Bẫy: Đây là bẫy kinh điển nhất của bài này. "User Pool cấp AWS credentials" là **SAI**. "Identity Pool cấp JWT" cũng **SAI**. Nhớ: Pool người dùng → token; Pool danh tính → credentials.

---

## 2. Amazon Cognito User Pools

User Pool là một **user directory** (kho người dùng) có sẵn tính năng sign-up, sign-in, MFA, quên mật khẩu, email/SMS verification. Bạn không phải tự build bảng `users` + hash password nữa.

### 2.1 Khi nào dùng

- App cần đăng ký / đăng nhập người dùng.
- Cần social login (Google, Facebook, Apple, Amazon) hoặc enterprise login (SAML, OIDC) **gộp chung một chỗ**.
- Cần một identity provider chuẩn OAuth 2.0 / OIDC để bảo vệ API.

### 2.2 Ba loại token (PHẢI thuộc)

Sau khi đăng nhập thành công, User Pool trả về 3 JWT:

| Token | Mục đích | Chứa gì | Dùng để |
|-------|----------|---------|---------|
| **ID token** | Xác thực danh tính user | Thông tin user (email, name, custom attributes, `cognito:groups`) | Truyền identity cho frontend/backend; xác thực qua Identity Pool |
| **Access token** | Phân quyền truy cập resource | Scopes OAuth, `username`, groups | Gọi API được bảo vệ; gọi Cognito self-service API (đổi mật khẩu...) |
| **Refresh token** | Lấy token mới khi hết hạn | Opaque (không phải JWT đọc được) | Xin id/access token mới mà không bắt user login lại |

- ID & Access token mặc định hết hạn sau **1 giờ** (cấu hình được).
- Refresh token mặc định **30 ngày** (1h–10 năm).

> ⚠️ Bẫy: Đề hỏi "token nào chứa thông tin profile/email của user?" → **ID token**. "Token nào dùng để authorize gọi API/resource?" → **Access token**. Đừng lẫn. Refresh token KHÔNG dùng để gọi API — chỉ để xin token mới.

### 2.3 JWT validation (rất hay ra)

Backend nhận token trong header `Authorization: Bearer <jwt>` và phải **tự verify**:

1. Tách JWT thành 3 phần (header.payload.signature).
2. Lấy `kid` từ header → tải public key từ **JWKS endpoint**:
   `https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json`
3. Verify chữ ký (RS256), kiểm tra `exp` (chưa hết hạn), `iss` (đúng User Pool), `aud`/`client_id` (đúng app client), `token_use` (`id` hay `access`).

```javascript
// Node.js với aws-jwt-verify (thư viện chính chủ AWS)
import { CognitoJwtVerifier } from "aws-jwt-verify";

const verifier = CognitoJwtVerifier.create({
  userPoolId: "us-east-1_AbCdEf123",
  tokenUse: "access",        // hoặc "id"
  clientId: "1example23456789",
});

try {
  const payload = await verifier.verify(token); // throw nếu invalid
  console.log("OK:", payload.sub, payload["cognito:groups"]);
} catch {
  // 401 Unauthorized
}
```

> 💡 Mẹo thi: Với **API Gateway**, bạn KHÔNG cần tự viết code verify. Dùng **Cognito Authorizer** (REST API) hoặc **JWT Authorizer** (HTTP API) — chỉ trỏ tới User Pool, API Gateway tự validate token. Đề mô tả "cần bảo vệ API Gateway bằng Cognito với ít code nhất" → chọn Cognito/JWT authorizer.

### 2.4 App Client

- Đại diện cho 1 ứng dụng kết nối tới User Pool (web app, mobile app...).
- **Public client** (mobile/SPA): KHÔNG có client secret (vì không giữ bí mật được).
- **Confidential client** (backend server): CÓ client secret.
- Cấu hình OAuth flows, callback URLs, allowed scopes ở đây.

### 2.5 Hosted UI

- Trang đăng nhập/đăng ký **AWS host sẵn**, customize logo/CSS được.
- Hỗ trợ OAuth 2.0 flows: **Authorization code grant** (khuyến nghị cho web/mobile có backend), Implicit (cũ, tránh dùng).
- Đỡ phải tự code form login + xử lý social login.

> 💡 Mẹo thi: "Cần login page nhanh, có sẵn social login, không muốn tự build UI" → **Hosted UI** + Authorization code grant.

### 2.6 Lambda Triggers (customize luồng auth)

User Pool cho phép gắn Lambda vào các điểm trong vòng đời auth:

| Trigger | Khi nào chạy | Dùng làm gì |
|---------|--------------|-------------|
| **Pre Sign-up** | Trước khi tạo user | Auto-confirm, validate domain email |
| **Post Confirmation** | Sau khi confirm | Ghi user vào DynamoDB, gửi welcome email |
| **Pre Token Generation** | Trước khi phát token | **Thêm/sửa custom claims**, sửa groups trong token |
| **Pre Authentication / Post Authentication** | Quanh lúc login | Chặn login, audit logging |
| **Custom Auth (Define/Create/Verify Auth Challenge)** | Luồng passwordless/OTP | Tự build challenge (OTP qua SMS, CAPTCHA) |
| **Migrate User** | Khi login user chưa có trong pool | Import dần từ hệ thống cũ |

> ⚠️ Bẫy: "Thêm custom claim vào token" → **Pre Token Generation**, KHÔNG phải Pre Authentication. "Lưu user vào DB sau khi đăng ký xong" → **Post Confirmation**.

---

## 3. Amazon Cognito Identity Pools (Federated Identities)

Identity Pool **không** quản lý user. Nhiệm vụ duy nhất: nhận một danh tính đã xác thực (token) và **đổi lấy AWS credentials tạm thời** để app gọi trực tiếp AWS service (S3, DynamoDB...).

### 3.1 Khi nào dùng

- Mobile/web app cần **gọi thẳng AWS service** từ client (upload S3, đọc DynamoDB) mà KHÔNG đi qua backend của bạn.
- Cần cấp quyền cho cả **guest (unauthenticated)** lẫn user đã đăng nhập.

### 3.2 Authenticated vs Unauthenticated role

Identity Pool gắn với **2 IAM role**:

| Role | Dành cho | Ví dụ quyền |
|------|----------|-------------|
| **Authenticated role** | User đã login (qua User Pool, Google, SAML...) | Read/write `s3://bucket/${user-id}/*` |
| **Unauthenticated role** | Guest chưa login | Chỉ read public content |

> ⚠️ Bẫy: Identity Pool hỗ trợ guest access (unauthenticated role) — User Pool thì KHÔNG. Nếu đề nói "cho phép khách vãng lai chưa đăng nhập gọi AWS service với quyền hạn chế" → **Identity Pool + unauthenticated role**.

### 3.3 Luồng kết hợp User Pool + Identity Pool

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 410" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Luồng kết hợp User Pool + Identity Pool + STS để lấy AWS credentials tạm thời</title>
  <desc>Sơ đồ tuần tự theo thời gian: App đăng nhập vào User Pool và nhận ID token (JWT); App đưa ID token cho Identity Pool; Identity Pool gọi STS AssumeRoleWithWebIdentity; STS trả credentials tạm thời; App dùng credentials gọi thẳng S3 và DynamoDB. User Pool cấp token, Identity Pool cấp credentials.</desc>
  <text x="16" y="22" font-size="13.5" font-weight="700" fill="currentColor">User Pool cấp TOKEN — Identity Pool cấp CREDENTIALS</text>

  <g font-size="11" font-weight="700" text-anchor="middle">
    <rect x="20" y="38" width="96" height="34" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="68" y="59" fill="currentColor">App (client)</text>
    <rect x="160" y="38" width="116" height="34" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="218" y="55" fill="currentColor">User Pool</text>
    <text x="218" y="68" font-size="9.5" font-weight="400" fill="currentColor" opacity="0.7">= token</text>
    <rect x="320" y="38" width="124" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="382" y="55" fill="currentColor">Identity Pool</text>
    <text x="382" y="68" font-size="9.5" font-weight="400" fill="currentColor" opacity="0.7">= credentials</text>
    <rect x="488" y="38" width="92" height="34" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="534" y="59" fill="currentColor">STS</text>
    <rect x="600" y="38" width="104" height="34" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="652" y="55" fill="currentColor">S3 / DynamoDB</text>
    <text x="652" y="68" font-size="9.5" font-weight="400" fill="currentColor" opacity="0.7">AWS service</text>
  </g>

  <g stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="3 4">
    <line x1="68" y1="74" x2="68" y2="392"/>
    <line x1="218" y1="74" x2="218" y2="392"/>
    <line x1="382" y1="74" x2="382" y2="392"/>
    <line x1="534" y1="74" x2="534" y2="392"/>
    <line x1="652" y1="74" x2="652" y2="392"/>
  </g>

  <defs>
    <marker id="seqArr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 z" fill="currentColor" fill-opacity="0.65"/></marker>
  </defs>

  <g font-size="10.5" fill="currentColor">
    <line x1="68" y1="100" x2="214" y2="100" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#seqArr)"/>
    <text x="72" y="95" opacity="0.9">1. đăng nhập (user/pass, SRP)</text>

    <line x1="218" y1="132" x2="72" y2="132" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#seqArr)"/>
    <text x="214" y="127" text-anchor="end" opacity="0.9" font-weight="700">2. ID token (JWT)</text>

    <line x1="68" y1="166" x2="378" y2="166" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#seqArr)"/>
    <text x="72" y="161" opacity="0.9">3. gửi ID token (qua logins)</text>

    <line x1="382" y1="200" x2="530" y2="200" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#seqArr)"/>
    <text x="378" y="195" text-anchor="end" opacity="0.9">4. AssumeRoleWithWebIdentity</text>

    <line x1="534" y1="234" x2="386" y2="234" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#seqArr)"/>
    <text x="530" y="229" text-anchor="end" opacity="0.9">5. temp credentials</text>

    <line x1="382" y1="268" x2="72" y2="268" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#seqArr)"/>
    <text x="378" y="263" text-anchor="end" opacity="0.9" font-weight="700">6. AWS credentials tạm thời</text>

    <line x1="68" y1="302" x2="648" y2="302" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#seqArr)"/>
    <text x="72" y="297" opacity="0.9">7. gọi thẳng AWS service (SigV4) — KHÔNG qua backend</text>
  </g>

  <g>
    <rect x="20" y="324" width="684" height="58" rx="9" fill="#f59e0b" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="32" y="345" font-size="11" font-weight="700" fill="currentColor">Phân vai rạch ròi:</text>
    <text x="32" y="362" font-size="10.5" fill="currentColor" opacity="0.9">• User Pool = xác thực &amp; cấp TOKEN (ID/access/refresh) — KHÔNG cấp AWS credentials.</text>
    <text x="32" y="377" font-size="10.5" fill="currentColor" opacity="0.9">• Identity Pool = đổi token lấy CREDENTIALS tạm thời qua STS. Dùng ID token (không phải access token).</text>
  </g>
</svg>

Bên dưới, Identity Pool gọi STS **`AssumeRoleWithWebIdentity`** để lấy credentials.

```javascript
// AWS SDK v3 — lấy credentials từ Identity Pool, dùng cho S3
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "us-east-1",
  credentials: fromCognitoIdentityPool({
    clientConfig: { region: "us-east-1" },
    identityPoolId: "us-east-1:abcd-1234-...",
    logins: {
      // ID token (KHÔNG phải access token) từ User Pool
      "cognito-idp.us-east-1.amazonaws.com/us-east-1_AbCdEf123": idToken,
    },
  }),
});
```

> 💡 Mẹo thi: Khi đưa token từ User Pool vào Identity Pool qua `logins`, dùng **ID token**, không phải access token. Đây là chi tiết hay bị hỏi xoáy.

---

## 4. STS & IAM Roles cho app/service

STS (Security Token Service) cấp **temporary credentials** (có `SessionToken`, tự hết hạn). Đây là cách AWS-khuyến nghị thay cho long-term access keys.

### 4.1 Các API STS cần nhớ

| API | Dùng khi | Input danh tính |
|-----|----------|-----------------|
| **AssumeRole** | Cross-account, EC2/Lambda đổi role, escalate quyền | IAM principal (user/role) hiện có |
| **AssumeRoleWithWebIdentity** | Login qua **OIDC/web** (Google, Facebook, Cognito) | Web identity token (JWT) |
| **AssumeRoleWithSAML** | Login qua **SAML 2.0** (enterprise AD, ADFS, Okta) | SAML assertion |
| **GetSessionToken** | MFA cho long-term credentials của IAM user | IAM user keys |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Chọn API STS theo nguồn danh tính</title>
  <desc>Cây quyết định: từ câu hỏi nguồn danh tính là gì, rẽ thành bốn nhánh. IAM principal đã có hoặc cross-account dùng AssumeRole; web, OIDC, social hoặc Cognito dùng AssumeRoleWithWebIdentity; SAML 2.0 hoặc Active Directory dùng AssumeRoleWithSAML; MFA cho IAM user dùng GetSessionToken.</desc>
  <text x="16" y="22" font-size="13.5" font-weight="700" fill="currentColor">Chọn API STS theo NGUỒN danh tính</text>

  <g>
    <rect x="250" y="36" width="220" height="42" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="55" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Nguồn danh tính là gì?</text>
    <text x="360" y="71" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">(ai đang xin credentials)</text>
  </g>

  <g stroke="currentColor" stroke-opacity="0.4" fill="none">
    <path d="M360 78 v18"/>
    <path d="M90 96 h540"/>
    <path d="M90 96 v22"/>
    <path d="M270 96 v22"/>
    <path d="M450 96 v22"/>
    <path d="M630 96 v22"/>
  </g>

  <g font-size="10" fill="currentColor" opacity="0.85" text-anchor="middle">
    <text x="90" y="134">IAM principal đã có /</text>
    <text x="90" y="147">cross-account, đổi role</text>
    <text x="270" y="134">web · OIDC · social</text>
    <text x="270" y="147">· Cognito (JWT)</text>
    <text x="450" y="134">SAML 2.0 ·</text>
    <text x="450" y="147">AD / ADFS / Okta</text>
    <text x="630" y="134">MFA cho</text>
    <text x="630" y="147">IAM user keys</text>
  </g>

  <g text-anchor="middle">
    <rect x="14" y="160" width="152" height="56" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="90" y="183" font-size="11.5" font-weight="700" fill="currentColor">AssumeRole</text>
    <text x="90" y="201" font-size="9.5" fill="currentColor" opacity="0.72">input: IAM</text>
    <text x="90" y="212" font-size="9.5" fill="currentColor" opacity="0.72">principal hiện có</text>

    <rect x="194" y="160" width="152" height="56" rx="10" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="270" y="181" font-size="11" font-weight="700" fill="currentColor">AssumeRoleWith</text>
    <text x="270" y="194" font-size="11" font-weight="700" fill="currentColor">WebIdentity</text>
    <text x="270" y="211" font-size="9.5" fill="currentColor" opacity="0.72">input: web identity token</text>

    <rect x="374" y="160" width="152" height="56" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="450" y="181" font-size="11" font-weight="700" fill="currentColor">AssumeRoleWith</text>
    <text x="450" y="194" font-size="11" font-weight="700" fill="currentColor">SAML</text>
    <text x="450" y="211" font-size="9.5" fill="currentColor" opacity="0.72">input: SAML assertion</text>

    <rect x="554" y="160" width="152" height="56" rx="10" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="630" y="183" font-size="11.5" font-weight="700" fill="currentColor">GetSessionToken</text>
    <text x="630" y="201" font-size="9.5" fill="currentColor" opacity="0.72">input: IAM user keys</text>
    <text x="630" y="212" font-size="9.5" fill="currentColor" opacity="0.72">+ mã MFA</text>
  </g>

  <g>
    <rect x="14" y="244" width="692" height="92" rx="9" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="28" y="266" font-size="11" font-weight="700" fill="currentColor">Đọc đề theo từ khoá nguồn danh tính:</text>
    <text x="28" y="286" font-size="10.5" fill="currentColor" opacity="0.9">• Google / Facebook / Cognito / OIDC / "đăng nhập web" → AssumeRoleWithWebIdentity</text>
    <text x="28" y="303" font-size="10.5" fill="currentColor" opacity="0.9">• SAML / enterprise SSO / Active Directory / ADFS → AssumeRoleWithSAML</text>
    <text x="28" y="320" font-size="10.5" fill="currentColor" opacity="0.9">• Đã có IAM user/role, EC2/Lambda đổi role, cross-account → AssumeRole · MFA cho IAM user → GetSessionToken</text>
  </g>
</svg>

> ⚠️ Bẫy: Phân biệt theo nguồn danh tính:
> - **Web/OIDC/social/Cognito** → `AssumeRoleWithWebIdentity`
> - **SAML/enterprise/Active Directory** → `AssumeRoleWithSAML`
> - **Đã có IAM principal, đổi role / cross-account** → `AssumeRole`

### 4.2 Trust policy vs Permission policy

Một IAM role có 2 policy:

- **Trust policy** (Assume role policy): AI được phép assume role này (`Principal`).
- **Permission policy**: Role này được làm GÌ sau khi assume.

```json
// Trust policy cho phép Lambda assume role
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "lambda.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
```

```bash
# CLI: assume role cross-account
aws sts assume-role \
  --role-arn arn:aws:iam::222222222222:role/AppRole \
  --role-session-name dev-session
# -> trả về AccessKeyId, SecretAccessKey, SessionToken (hết hạn ~1h)
```

> 💡 Mẹo thi: Lambda/EC2 KHÔNG nên chứa access key trong code/env. Gắn **execution role / instance profile** → SDK tự lấy temp credentials qua STS. Đề thấy "hardcode access key" gần như luôn là đáp án SAI.

### 4.3 Federation (SAML / OIDC)

- **OIDC federation**: tin tưởng một OIDC provider (Google, Cognito User Pool, GitHub Actions...) → `AssumeRoleWithWebIdentity`.
- **SAML federation**: tin tưởng IdP doanh nghiệp (ADFS, Okta) → `AssumeRoleWithSAML`. Dùng khi cho nhân viên công ty truy cập AWS.
- Trong cả hai, bạn tạo một **IAM Identity Provider** + IAM role có trust policy trỏ tới provider đó.

---

## 5. Fine-grained access control (phân quyền chi tiết)

### 5.1 Cognito Groups → IAM role

- Tạo **group** trong User Pool, gán mỗi group một **IAM role** + precedence.
- `cognito:groups` xuất hiện trong token; Identity Pool có thể chọn role theo group (**Choose role from token**).
- Dùng để: admin group → role nhiều quyền; user group → role hạn chế.

### 5.2 IAM Policy Conditions + policy variables

Phân quyền theo chính danh tính user, ví dụ mỗi user chỉ truy cập folder S3 của mình:

```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject"],
  "Resource": "arn:aws:s3:::my-bucket/${cognito-identity.amazonaws.com:sub}/*"
}
```

- `${cognito-identity.amazonaws.com:sub}` được thay bằng identity ID của user lúc runtime → mỗi user 1 prefix riêng, dùng CHUNG một role.
- Với DynamoDB, dùng condition `dynamodb:LeadingKeys` để giới hạn theo partition key = user id.

```json
{
  "Effect": "Allow",
  "Action": ["dynamodb:GetItem", "dynamodb:Query"],
  "Resource": "arn:aws:dynamodb:*:*:table/GameScores",
  "Condition": {
    "ForAllValues:StringEquals": {
      "dynamodb:LeadingKeys": ["${cognito-identity.amazonaws.com:sub}"]
    }
  }
}
```

> 💡 Mẹo thi: "Hàng nghìn user, mỗi người chỉ truy cập dữ liệu của mình, KHÔNG muốn tạo nghìn role/policy" → một role + **IAM policy variable** (`${...:sub}`) hoặc `dynamodb:LeadingKeys`. Đây là pattern multi-tenant rất hay ra.

---

## 6. Cross-service auth trong microservices

Khi service A gọi service B (Lambda → Lambda, ECS → API Gateway):

| Cách | Khi nào |
|------|---------|
| **IAM auth (SigV4)** | Service-to-service nội bộ AWS; gắn role, ký request bằng SigV4. API Gateway bật **IAM authorization** |
| **Cognito/JWT authorizer** | API có end user; token đi kèm theo request |
| **Lambda authorizer** | Logic auth tùy biến (token custom, kiểm tra DB) |

- Mỗi Lambda/service có **execution role riêng** (least privilege) — không dùng chung một role to.
- Truyền identity của user xuống các service phía sau: forward ID token, hoặc dùng API Gateway mapping để truyền claims qua context.

> ⚠️ Bẫy: Service-to-service trong AWS thì **không cần Cognito** — dùng IAM role + SigV4 là đủ và bảo mật hơn. Cognito là cho **end user**, không phải cho service backend gọi nhau.

---

## 7. Bảng quyết định nhanh "khi nào dùng gì"

| Tình huống | Đáp án |
|------------|--------|
| App cần sign-up/sign-in user, social login | **Cognito User Pool** |
| Cần JWT để bảo vệ API Gateway, ít code | **User Pool + Cognito/JWT Authorizer** |
| Mobile app gọi thẳng S3/DynamoDB từ client | **Identity Pool** → temp AWS credentials |
| Cho phép guest chưa login dùng app hạn chế | **Identity Pool + unauthenticated role** |
| Login bằng Google/Facebook lấy AWS credentials | `AssumeRoleWithWebIdentity` (qua Identity Pool) |
| Nhân viên login bằng Active Directory/Okta vào AWS | **SAML federation** → `AssumeRoleWithSAML` |
| Lambda/EC2 gọi AWS service | **IAM execution role / instance profile** |
| Cross-account access | `AssumeRole` + trust policy |
| Thêm custom claim vào token | **Pre Token Generation** trigger |
| Mỗi user chỉ truy cập data riêng, 1 role duy nhất | **IAM policy variable** `${...:sub}` / `LeadingKeys` |
| Service-to-service nội bộ AWS | **IAM role + SigV4** (không cần Cognito) |

---

## 8. Tổng kết các bẫy thi quan trọng nhất

> ⚠️ Bẫy tổng hợp — đọc lại trước khi thi:
> 1. **User Pool → token (JWT); Identity Pool → AWS credentials.** Đừng đảo ngược.
> 2. **ID token** = thông tin user; **Access token** = authorize gọi resource; **Refresh token** = xin token mới (không gọi API).
> 3. Đưa token vào Identity Pool `logins` dùng **ID token**.
> 4. Guest/unauthenticated access là tính năng của **Identity Pool**, không phải User Pool.
> 5. **Web/OIDC/Cognito** → `AssumeRoleWithWebIdentity`; **SAML/AD** → `AssumeRoleWithSAML`; cross-account/đổi role → `AssumeRole`.
> 6. Custom claim → **Pre Token Generation**; lưu DB sau đăng ký → **Post Confirmation**.
> 7. Multi-tenant nhiều user → **1 role + IAM policy variable**, đừng tạo nghìn role.
> 8. Service nội bộ AWS gọi nhau → **IAM + SigV4**, không phải Cognito.
> 9. Đừng bao giờ hardcode access key — luôn dùng **role + temporary credentials qua STS**.
> 10. Bảo vệ API Gateway ít code nhất → **Cognito Authorizer**, không tự viết JWT validation.
