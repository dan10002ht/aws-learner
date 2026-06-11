# Authentication & Authorization trong app

Hai từ này hay bị gộp làm một, nhưng đây là hai câu hỏi khác nhau:

- **Authentication (AuthN)**: "Bạn là ai?" — chứng minh danh tính (đăng nhập).
- **Authorization (AuthZ)**: "Bạn được làm gì?" — kiểm tra quyền với từng tài nguyên.

Là kỹ sư xây hệ thống, bạn sẽ viết cả hai. Phần lớn lỗ hổng nghiêm trọng nhất trong OWASP Top 10 2021 nằm ở đây: **A01 Broken Access Control** đứng đầu bảng, và **A07 Identification and Authentication Failures**. Bài này đi từ phiên đăng nhập, qua OAuth/OIDC, tới phân quyền và những bẫy phổ biến nhất — luôn kèm ví dụ tấn công cụ thể và code trước/sau.

> 💡 Nguyên tắc: AuthN sai thì kẻ tấn công giả danh người khác. AuthZ sai thì kẻ tấn công đã là chính mình nhưng chạm được dữ liệu của người khác. Bug AuthZ khó phát hiện hơn vì request trông hoàn toàn "hợp lệ".

## 1. Quản lý phiên: Session (cookie) vs Token (JWT)

HTTP không có trạng thái. Sau khi user đăng nhập, mỗi request kế tiếp phải tự mang theo bằng chứng "tôi đã đăng nhập". Có hai trường phái.

### Session-based (stateful)

Server tạo một `session_id` ngẫu nhiên, lưu trạng thái ở phía server (Redis/DB), và gửi `session_id` cho client qua cookie.

```
Browser ──login──▶ Server ──tạo session, lưu Redis──▶ Set-Cookie: sid=abc...
Browser ──request + Cookie: sid=abc──▶ Server ──tra Redis──▶ biết là user 42
```

Điểm mấu chốt là **cấu hình cookie**, không phải bản thân session:

```http
Set-Cookie: sid=a1b2c3...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600
```

| Thuộc tính | Tác dụng phòng thủ |
|---|---|
| `HttpOnly` | JavaScript không đọc được cookie → chống đánh cắp session qua XSS |
| `Secure` | Chỉ gửi qua HTTPS → chống nghe lén trên mạng |
| `SameSite=Lax` / `Strict` | Không gửi cookie trong request cross-site → chống CSRF |
| `Path` / `Domain` hẹp | Giảm phạm vi rò rỉ |
| `__Host-` prefix | Bắt buộc Secure + Path=/ + không Domain → chống cookie injection |

> ⚠️ Lỗ hổng: lưu JWT trong `localStorage` "cho tiện". `localStorage` đọc được bằng JavaScript, nên một lỗ XSS bất kỳ là đánh cắp được token đăng nhập của mọi user. Cookie `HttpOnly` thì XSS không đọc nổi. Đừng đổi một lớp phòng thủ lấy chút tiện lợi.

### Token-based / JWT (stateless)

Server ký một token chứa sẵn thông tin user, client tự giữ. Server không lưu gì — chỉ cần **verify chữ ký** là tin được nội dung.

```
header.payload.signature
{"alg":"RS256"}.{"sub":"42","exp":1718000000,"role":"user"}.<chữ ký>
```

Stateless rất hợp cho microservices và mobile, nhưng đánh đổi: **không revoke ngay được** (token còn hạn là còn dùng được dù bạn đã "đăng xuất" ở server).

| | Session (cookie) | JWT (token) |
|---|---|---|
| Trạng thái | Lưu ở server | Tự chứa, không lưu |
| Revoke tức thì | Có (xoá khỏi store) | Khó (phải có denylist) |
| Mở rộng (scale) | Cần shared store | Dễ, không cần store |
| Rủi ro chính | Đánh cắp session_id | Verify sai + token để lâu |
| Hợp với | Web app truyền thống | API, mobile, SSO |

Lời khuyên thực dụng cho hầu hết web app: **dùng session + cookie HttpOnly**. Chỉ chọn JWT khi thật sự cần stateless (nhiều service, không có store chung). Nếu dùng JWT cho trình duyệt, vẫn nên đặt nó trong cookie `HttpOnly`, không phải `localStorage`.

## 2. Validate JWT cho đúng

JWT chỉ an toàn khi verify đúng. Đây là vùng có nhiều lỗ hổng kinh điển.

> ⚠️ Lỗ hổng `alg: none`: kẻ tấn công sửa header thành `{"alg":"none"}` và bỏ chữ ký. Thư viện cũ/cấu hình lỏng sẽ chấp nhận token "không cần chữ ký" → giả mạo bất kỳ user nào.

> ⚠️ Lỗ hổng nhầm RS256 → HS256: token thật ký bằng RSA (RS256, private key). Kẻ tấn công đổi header sang HS256 rồi ký HMAC bằng **public key** (vốn ai cũng biết). Nếu code verify "tự suy alg từ token", nó dùng public key làm HMAC secret → chữ ký hợp lệ. Luôn **cố định danh sách thuật toán cho phép**.

Code sai (Node.js):

```js
// ❌ Tin tưởng alg trong token, không kiểm exp/aud/iss
const payload = jwt.decode(token);        // decode KHÔNG verify chữ ký!
if (payload.sub) grantAccess(payload.sub); // ai cũng vào được
```

Code đúng (Node.js, jsonwebtoken):

```js
// ✅ Verify chữ ký + ép thuật toán + kiểm claim
const payload = jwt.verify(token, publicKey, {
  algorithms: ["RS256"],     // KHÔNG để thư viện tự suy alg
  issuer: "https://auth.example.com",
  audience: "api://orders",
  clockTolerance: 5,         // lệch đồng hồ 5s
});
// exp được verify tự động; vẫn nên kiểm version/role ở DB nếu cần revoke
```

Checklist verify JWT:

- [ ] Dùng `verify`, không bao giờ tin `decode`.
- [ ] Whitelist `algorithms` cố định (vd chỉ `RS256`). Cấm `none`.
- [ ] Kiểm `exp` (hết hạn), `nbf` (not-before), `iat`.
- [ ] Kiểm `iss` (đúng nhà phát hành) và `aud` (token cấp cho đúng API này).
- [ ] Lấy public key từ JWKS endpoint, cache theo `kid`, xoay key được.
- [ ] Access token sống ngắn (5–15 phút). Việc revoke dựa vào refresh token.

## 3. OAuth 2.1 + PKCE và OIDC

Đừng tự viết "đăng nhập bằng Google/Github" bằng tay — dùng chuẩn.

- **OAuth 2.0/2.1**: framework **authorization** — cấp quyền truy cập tài nguyên (access token). OAuth *không* nói "user là ai".
- **OIDC (OpenID Connect)**: lớp **authentication** đặt trên OAuth, bổ sung **ID token** (một JWT) chứa danh tính user. Khi cần "đăng nhập bằng X", bạn cần OIDC, không chỉ OAuth.

OAuth 2.1 (bản hợp nhất các best practice) bắt buộc **Authorization Code flow + PKCE** cho mọi client, và **bỏ Implicit flow** (vốn trả token qua URL — dễ rò rỉ).

### PKCE chống điều gì

> ⚠️ Lỗ hổng authorization code interception: app gửi user qua trình duyệt để lấy `code`, rồi đổi `code` lấy token. Trên mobile/SPA, một app độc hại có thể chặn `code` ở bước redirect và đổi lấy token. PKCE chặn điều này.

PKCE thêm một bí mật dùng-một-lần do client tự sinh:

```
1. Client sinh code_verifier (ngẫu nhiên) → code_challenge = SHA256(verifier)
2. /authorize?...&code_challenge=<hash>&code_challenge_method=S256
3. Nhận về code. Kẻ chặn được code nhưng KHÔNG có verifier.
4. /token  ...&code=<code>&code_verifier=<verifier gốc>
5. Server tự hash verifier, so với challenge đã lưu → khớp mới cấp token.
```

Các tham số phòng thủ bắt buộc khác:

- `state`: chuỗi ngẫu nhiên, chống CSRF trên bước callback (so khi quay về).
- `redirect_uri`: server phải **so khớp tuyệt đối** với danh sách đăng ký, không dùng wildcard. Đây là nguồn của vô số lỗ open redirect → đánh cắp token.
- `nonce` (OIDC): chống replay ID token.

## 4. Refresh token rotation

Access token sống ngắn để giảm thiệt hại nếu bị lộ. Để user không phải đăng nhập lại liên tục, ta dùng **refresh token** (sống dài) để xin access token mới.

> ⚠️ Lỗ hổng: refresh token bị đánh cắp. Nó sống lâu, nên kẻ tấn công cứ thế xin access token mới mãi mà không ai biết. **Rotation** biến việc đánh cắp thành phát hiện được.

Cơ chế **rotation + reuse detection**:

```
Lần refresh: cấp access token MỚI + refresh token MỚI, vô hiệu cái cũ.
Nếu một refresh token CŨ (đã dùng rồi) lại xuất hiện
→ có 2 bên đang giữ cùng token → đã bị lộ
→ thu hồi TOÀN BỘ token family của user, bắt đăng nhập lại.
```

```python
# ✅ Pseudocode phía server cho /refresh
def refresh(old_token):
    rec = store.get(old_token)
    if rec is None:
        raise Unauthorized("token không tồn tại")
    if rec.used:                             # đã dùng → dấu hiệu bị lộ
        store.revoke_family(rec.family_id)   # khóa cả họ token
        raise Unauthorized("phát hiện reuse — thu hồi toàn bộ")
    rec.used = True                          # đánh dấu đã tiêu
    new_refresh = issue_refresh(family_id=rec.family_id)
    new_access  = issue_access(rec.user_id, ttl="10m")
    return new_access, new_refresh
```

Refresh token nên đặt trong cookie `HttpOnly` riêng, path hẹp (vd `/auth/refresh`).

## 5. Password hashing & MFA

### Hash mật khẩu đúng cách

> ⚠️ Lỗ hổng: lưu mật khẩu plaintext, hoặc hash bằng MD5/SHA-256 "thường". SHA tính cực nhanh → GPU dò hàng tỉ hash/giây. Khi DB rò rỉ, mọi mật khẩu yếu bị crack trong vài phút.

Dùng **hàm hash chuyên cho mật khẩu**: chậm có chủ đích, tốn bộ nhớ, có salt tự động.

| Thuật toán | Khi nào dùng |
|---|---|
| **Argon2id** | Lựa chọn số 1 hiện nay (OWASP khuyến nghị); chống cả GPU lẫn side-channel |
| **bcrypt** | Vẫn rất ổn, phổ biến; lưu ý giới hạn 72 byte đầu vào |
| **scrypt / PBKDF2** | Khi môi trường bắt buộc (FIPS); PBKDF2 cần iteration cao |

```python
# ✅ Argon2id (thư viện argon2-cffi)
from argon2 import PasswordHasher
ph = PasswordHasher()                 # tham số mặc định đã an toàn
hash = ph.hash(password)              # salt sinh tự động, nằm trong chuỗi hash
# Khi đăng nhập:
try:
    ph.verify(hash, password)         # so sánh thời gian-hằng-số
    if ph.check_needs_rehash(hash):   # nâng tham số khi đổi cấu hình
        store(ph.hash(password))
except VerifyMismatchError:
    reject()
```

```js
// ✅ bcrypt (Node.js) — cost 12 trở lên
const hash = await bcrypt.hash(password, 12);
const ok   = await bcrypt.compare(password, hash); // KHÔNG tự so chuỗi
```

Thêm: kiểm mật khẩu rò rỉ qua Have I Been Pwned (k-anonymity API), không áp luật đổi mật khẩu định kỳ vô nghĩa (NIST đã bỏ), chống brute-force bằng rate limit + lockout có backoff.

### MFA và passkeys

MFA kết hợp các yếu tố: **biết** (mật khẩu), **có** (điện thoại/khóa), **là** (sinh trắc).

> ⚠️ Lỗ hổng SMS OTP: dễ bị SIM-swap và phishing thời gian thực (kẻ tấn công dựng trang giả, user nhập OTP, chúng chuyển tiếp ngay). SMS tốt hơn không có gì, nhưng đừng coi là mạnh.

Thứ tự ưu tiên thực dụng:

1. **Passkeys / WebAuthn (FIDO2)** — mạnh nhất, **chống phishing tận gốc**.
2. TOTP (Google Authenticator) — ổn, nhưng vẫn phish được OTP.
3. SMS OTP — phương án cuối.

**Passkeys** dùng public-key cryptography: thiết bị giữ private key (trong Secure Enclave/TPM), server chỉ giữ public key. Đăng nhập là ký một challenge bằng sinh trắc.

```
Đăng ký:  thiết bị sinh cặp khóa → gửi PUBLIC key cho server
Đăng nhập: server gửi challenge → thiết bị ký bằng PRIVATE key (mở bằng vân tay)
           → server verify bằng public key đã lưu
```

Vì sao chống phishing: chữ ký gắn chặt với **origin** (tên miền thật). Trang giả `examp1e.com` không lấy được chữ ký hợp lệ cho `example.com`. Không có "mã" nào để user lỡ tay nhập vào trang giả. Dùng thư viện như SimpleWebAuthn (server + browser) thay vì tự code.

## 6. Mô hình phân quyền: RBAC vs ABAC

| | RBAC (theo vai trò) | ABAC (theo thuộc tính) |
|---|---|---|
| Quyết định dựa trên | Role của user (admin, editor) | Thuộc tính (owner, phòng ban, giờ, IP, nhãn dữ liệu) |
| Ưu | Đơn giản, dễ audit | Linh hoạt, biểu đạt được "chỉ chủ sở hữu" |
| Nhược | "Bùng nổ role" khi quy tắc tinh vi | Khó debug, dễ viết policy sai |
| Khi dùng | Đa số app | Multi-tenant, quy tắc theo ngữ cảnh |

Thực tế hay kết hợp: RBAC cho thao tác thô (ai được vào màn hình Admin), ABAC cho dữ liệu tinh (user này có sở hữu *bản ghi cụ thể* này không).

> 💡 Nguyên tắc: phân quyền phải kiểm tra ở **server, cho từng tài nguyên cụ thể**, ngay trước khi truy cập dữ liệu. Ẩn nút trên UI không phải là bảo mật — attacker gọi API trực tiếp.

## 7. Bẫy phân quyền: BOLA và BFLA

Đây là hai lỗi AuthZ phổ biến nhất theo OWASP API Security, và là phần lớn của A01.

### BOLA — Broken Object Level Authorization (IDOR)

> ⚠️ Lỗ hổng: API tin vào ID trong request mà không kiểm "object này có thuộc về user gọi không". User A đổi `/api/invoices/1001` thành `1002` và đọc hóa đơn của user B.

```js
// ❌ BOLA: lấy theo ID, không kiểm chủ sở hữu
app.get("/api/invoices/:id", auth, async (req, res) => {
  const inv = await db.invoice.findById(req.params.id);
  res.json(inv);                       // ai có token cũng đọc được MỌI hóa đơn
});
```

```js
// ✅ Gắn truy vấn vào chính user, hoặc kiểm ownership rõ ràng
app.get("/api/invoices/:id", auth, async (req, res) => {
  const inv = await db.invoice.findOne({
    id: req.params.id,
    ownerId: req.user.id,              // điều kiện AuthZ nằm NGAY trong query
  });
  if (!inv) return res.sendStatus(404);// 404 chứ không 403: đừng tiết lộ tồn tại
  res.json(inv);
});
```

Chống BOLA: luôn ràng `ownerId`/`tenantId` vào mọi truy vấn; cân nhắc ID khó đoán (UUID) như lớp phụ — nhưng UUID **không thay** kiểm tra quyền.

### BFLA — Broken Function Level Authorization

> ⚠️ Lỗ hổng: endpoint quản trị không kiểm role. UI ẩn nút "Xóa user" với user thường, nhưng `DELETE /api/admin/users/55` vẫn chạy nếu gọi trực tiếp.

```python
# ❌ BFLA: chỉ kiểm đăng nhập, không kiểm quyền chức năng
@app.delete("/api/admin/users/{uid}")
def delete_user(uid, current=Depends(auth)):
    db.delete_user(uid)               # bất kỳ user đăng nhập nào cũng gọi được

# ✅ Ép quyền theo chức năng, mặc định từ chối
@app.delete("/api/admin/users/{uid}")
def delete_user(uid, current=Depends(require_role("admin"))):
    db.delete_user(uid)
```

> 💡 Nguyên tắc: **deny by default**. Mỗi route có một guard quyền tường minh; không có guard thì route bị chặn. Đừng để "quên thêm middleware" trở thành lỗ hổng.

## Checklist AuthN/AuthZ trước khi lên production

- [ ] Cookie phiên: `HttpOnly` + `Secure` + `SameSite`; không để token trong `localStorage`.
- [ ] JWT: `verify` (không `decode`), whitelist `algorithms`, kiểm `exp`/`iss`/`aud`, cấm `alg:none`.
- [ ] OAuth: Authorization Code + **PKCE**, kiểm `state`, khớp tuyệt đối `redirect_uri`; OIDC khi cần danh tính.
- [ ] Access token ngắn hạn + refresh token **rotation có reuse detection**.
- [ ] Mật khẩu: **Argon2id/bcrypt**, không MD5/SHA; chống brute-force; check leaked password.
- [ ] MFA bật được; ưu tiên **passkeys/WebAuthn**, hạn chế SMS OTP.
- [ ] AuthZ kiểm ở **server, theo từng object** — chặn **BOLA** (ràng ownerId) và **BFLA** (require role, deny by default).
- [ ] Log sự kiện auth (đăng nhập hỏng, đổi mật khẩu, cấp quyền) để phát hiện bất thường.

## Liên hệ sang AWS

Bạn hiếm khi tự xây toàn bộ stack này trên AWS — hãy map sang dịch vụ quản lý:

- **Amazon Cognito**: User Pools làm AuthN (đăng ký/đăng nhập, MFA, **passkeys/WebAuthn**, social login qua OIDC), Identity Pools đổi token lấy quyền AWS tạm. Đỡ phải tự viết JWT/refresh flow.
- **AWS IAM**: mô hình **AuthZ của chính AWS** — policy mang tính ABAC/RBAC (dùng tag + condition), nguyên tắc **least privilege**. IAM Roles cấp credential tạm thời thay cho khóa cứng.
- **IAM Identity Center**: SSO tập trung (OIDC/SAML) cho nhân sự truy cập nhiều tài khoản AWS và app.
- **Amazon Verified Permissions**: dịch vụ phân quyền cấp ứng dụng dùng ngôn ngữ **Cedar** — viết policy ABAC/RBAC tập trung, đúng tinh thần "kiểm quyền theo từng object" ở mục BOLA.
- **AWS Secrets Manager / Parameter Store**: giữ client secret, signing key, không hardcode trong code.
- **AWS KMS**: quản lý và xoay khóa ký/mã hóa (vd khóa ký token) trong HSM.
- **AWS WAF**: chặn brute-force/credential stuffing ở tầng biên bằng rate-based rule trước khi chạm app.
- **Amazon GuardDuty**: phát hiện hành vi bất thường (credential bị lạm dụng, đăng nhập từ vị trí lạ) — lớp phát hiện cho khi phòng thủ ở trên bị xuyên thủng.
