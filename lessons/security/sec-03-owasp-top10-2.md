# OWASP Top 10 — phần 2

Phần này đi tiếp 6 hạng mục còn lại trong OWASP Top 10 (2021). Khác với phần 1 (Broken Access Control, Crypto, Injection) vốn xoay quanh "code xử lý input sai", phần này nghiêng về **kiến trúc, vận hành và chuỗi cung ứng**: nhiều lỗ hổng nguy hiểm nhất không nằm ở một dòng code, mà ở quyết định thiết kế, cấu hình mặc định, hay một thư viện bạn không nhớ đã cài.

Với kỹ sư xây hệ thống, đây chính là vùng bạn kiểm soát được nhiều nhất — và cũng là vùng dễ bị bỏ quên nhất vì "code chạy là được".

> 💡 Nguyên tắc: Phần lớn breach thực tế không đến từ exploit tinh vi, mà từ một S3 bucket public, một dependency lỗi thời, hoặc một endpoint nội bộ gọi được URL tùy ý. Phòng thủ tốt = giảm bề mặt tấn công + giả định "thứ gì cũng có thể bị lạm dụng".

---

## A04:2021 — Insecure Design

Đây là hạng mục **mới** và đặc biệt nhất: nó không nói về bug implementation, mà về **thiếu kiểm soát an ninh ngay từ thiết kế**. Bạn có thể code hoàn hảo một luồng nghiệp vụ vốn dĩ đã không an toàn.

Phân biệt rõ:
- **Insecure design**: thiếu hẳn một biện pháp kiểm soát (ví dụ: không có rate limit cho OTP).
- **Insecure implementation**: có biện pháp nhưng code sai (ví dụ: có rate limit nhưng đếm nhầm).

### Ví dụ tấn công cụ thể: brute-force OTP đặt lại mật khẩu

Luồng "Quên mật khẩu" gửi OTP 6 chữ số qua SMS, OTP sống 10 phút. Thiết kế **không giới hạn số lần thử**. Kẻ tấn công chỉ cần vét 1.000.000 khả năng — với 10 phút và vài chục luồng song song là dò ra.

Vấn đề ở đây **không phải bug code** — code so sánh OTP hoàn toàn đúng. Vấn đề là **thiết kế thiếu rate limit và thiếu lockout**.

```python
# TRƯỚC — thiết kế thiếu kiểm soát: vét cạn được
@app.post("/reset/verify")
def verify_otp(phone: str, otp: str):
    record = db.get_otp(phone)
    if record and record.otp == otp and not record.expired():
        return issue_reset_token(phone)   # không đếm số lần sai
    return {"error": "invalid"}, 400
```

```python
# SAU — đưa kiểm soát vào THIẾT KẾ luồng
MAX_ATTEMPTS = 5

@app.post("/reset/verify")
def verify_otp(phone: str, otp: str):
    record = db.get_otp(phone)
    if not record or record.expired():
        return {"error": "invalid"}, 400

    # 1) Khóa sau N lần sai -> hủy OTP, bắt yêu cầu lại
    if record.attempts >= MAX_ATTEMPTS:
        db.invalidate_otp(phone)
        return {"error": "too_many_attempts"}, 429

    # 2) So sánh hằng-thời-gian, tăng bộ đếm dù đúng hay sai
    record.attempts += 1
    db.save(record)
    if hmac.compare_digest(record.otp, otp):
        db.invalidate_otp(phone)          # one-time thực sự
        return issue_reset_token(phone)
    return {"error": "invalid"}, 400
```

Ngoài rate limit, thiết kế tốt còn nên: OTP đủ dài (hoặc dùng magic-link token 128-bit), giới hạn số lần **gửi** OTP, và global rate limit theo IP để chống phân tán.

### Threat modeling — công cụ chống Insecure Design

Cách phòng A04 không phải là một thư viện, mà là **quy trình**: làm threat modeling khi thiết kế. Dùng STRIDE để soi từng thành phần:

| Chữ | Mối đe dọa | Câu hỏi cần đặt |
|-----|-----------|-----------------|
| **S**poofing | Giả mạo danh tính | Xác thực ai gọi luồng này? |
| **T**ampering | Sửa đổi dữ liệu | Dữ liệu có bị sửa khi truyền/lưu? |
| **R**epudiation | Chối bỏ hành vi | Có log đủ để truy vết? |
| **I**nformation disclosure | Lộ thông tin | Error/response có rò rỉ gì? |
| **D**enial of service | Từ chối dịch vụ | Có rate limit / quota? |
| **E**levation of privilege | Leo thang quyền | Có thể vượt quyền? |

> 💡 Nguyên tắc: Viết "abuse case" song song với "use case". Mỗi khi định nghĩa một tính năng, hãy hỏi "nếu user này là kẻ xấu thì họ lạm dụng tính năng này thế nào?".

---

## A05:2021 — Security Misconfiguration

Hạng mục phổ biến nhất trong thực tế. Bao gồm: tính năng không cần thiết bật sẵn, tài khoản/mật khẩu mặc định, error message lộ stack trace, header bảo mật thiếu, cloud storage cấu hình sai, phần mềm khai báo verbose.

### Ví dụ tấn công 1: stack trace lộ thông tin

```javascript
// TRƯỚC — Express ở chế độ dev trên production
app.get('/order/:id', async (req, res) => {
  const order = await db.query(`SELECT * FROM orders WHERE id = ${req.params.id}`);
  res.json(order);
});
// Lỗi sẽ trả về full stack trace + đường dẫn file + tên cột DB cho attacker
```

```javascript
// SAU — error handler thống nhất, không lộ nội bộ
app.get('/order/:id', async (req, res, next) => {
  try {
    const order = await db.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'not_found' });
    res.json(order);
  } catch (e) { next(e); }
});

// Global handler — log chi tiết NỘI BỘ, trả về chung chung cho client
app.use((err, req, res, next) => {
  logger.error({ err, path: req.path, reqId: req.id }); // chi tiết vào log
  res.status(500).json({ error: 'internal_error', reqId: req.id });
});
```

### Ví dụ tấn công 2: security headers thiếu

Thiếu header cho phép clickjacking, MIME-sniffing, downgrade HTTPS. Dùng `helmet` (Node) hoặc cấu hình tương đương:

```javascript
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"] },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));
// => X-Content-Type-Options: nosniff, X-Frame-Options: DENY, HSTS, CSP...
```

| Header | Chống | Giá trị khuyến nghị |
|--------|-------|---------------------|
| `Content-Security-Policy` | XSS, injection | `default-src 'self'` (siết dần) |
| `Strict-Transport-Security` | downgrade HTTPS | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | MIME-sniffing | `nosniff` |
| `X-Frame-Options` | clickjacking | `DENY` (hoặc dùng CSP `frame-ancestors`) |

### Checklist chống Misconfiguration

- [ ] Tắt mọi tính năng/port/dịch vụ không dùng (giảm attack surface).
- [ ] Đổi/loại bỏ mọi credential mặc định trước khi lên production.
- [ ] `NODE_ENV=production` / `DEBUG=false` — không bao giờ verbose error ra ngoài.
- [ ] Security headers đầy đủ; CORS khai báo origin cụ thể, không `*` + credentials.
- [ ] Cloud storage (S3/blob) mặc định private; review public access định kỳ.
- [ ] Hardening qua **Infrastructure as Code** — cấu hình lặp lại được, review qua PR.
- [ ] Scan cấu hình tự động trong CI (ví dụ `tfsec`, `checkov`, image scanning).

> ⚠️ Lỗ hổng: Cấu hình "tạm để debug" rồi quên gỡ là nguồn breach kinh điển — verbose logging, `0.0.0.0` bind, admin panel không auth, CORS `*`. Mọi thay đổi cấu hình phải đi qua IaC + review, không SSH sửa tay.

---

## A06:2021 — Vulnerable & Outdated Components

Bạn kế thừa lỗ hổng của **mọi** thư viện mình import — kể cả transitive dependency (thư viện của thư viện). Log4Shell (CVE-2021-44228) là minh chứng: một logging library khiến hàng triệu hệ thống bị RCE.

### Ví dụ tấn công: CVE đã biết trong dependency

App dùng một version thư viện có CVE công khai. Attacker quét fingerprint (version trong JS bundle, header, response), tra CVE database, rồi chạy exploit có sẵn (PoC trên GitHub). Họ **không cần kỹ năng cao** — chỉ cần bạn chậm vá.

### Phòng chống: SCA trong CI/CD

Software Composition Analysis (SCA) tự động phát hiện dependency có CVE.

```bash
# Node — chặn build nếu có lỗ hổng high/critical
npm audit --audit-level=high

# Đa ngôn ngữ — Trivy / OWASP Dependency-Check / Snyk
trivy fs --severity HIGH,CRITICAL --exit-code 1 .
```

```yaml
# GitHub Actions — gate pipeline + bật Dependabot
name: security
on: [pull_request]
jobs:
  sca:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm audit --audit-level=high   # fail build nếu có high+
```

```
# .github/dependabot.yml — tự tạo PR cập nhật
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule: { interval: "weekly" }
```

### Checklist quản lý dependency

- [ ] Có **lockfile** (`package-lock.json`, `poetry.lock`...) commit vào repo — build tái lập được.
- [ ] SCA chạy trong CI, **fail build** với high/critical.
- [ ] Bật Dependabot/Renovate để vá tự động, review đều đặn.
- [ ] Loại bỏ dependency không dùng (`depcheck`); ít dependency = ít rủi ro.
- [ ] Sinh **SBOM** (Software Bill of Materials) để biết chính xác mình đang chạy gì.
- [ ] Chỉ lấy package từ registry chính thức; cảnh giác **typosquatting** (tên gần giống).

> 💡 Nguyên tắc: "Patch nhanh" quan trọng hơn "patch hoàn hảo". Khoảng thời gian từ lúc CVE công bố đến lúc bạn vá là cửa sổ bị tấn công — mục tiêu là rút ngắn nó xuống ngày, không phải tháng.

---

## A08:2021 — Software & Data Integrity Failures

Hạng mục này về **tin tưởng dữ liệu/code mà không kiểm tra tính toàn vẹn**: cập nhật không ký số, CI/CD pipeline bị chèn mã độc, deserialize dữ liệu không tin cậy. Đây là vùng **supply chain attack** (như vụ SolarWinds).

### Ví dụ tấn công 1: insecure deserialization

```python
import pickle

# TRƯỚC — pickle dữ liệu từ client => RCE
@app.post("/import")
def import_state(req):
    state = pickle.loads(req.body)   # payload độc => chạy mã tùy ý
    return apply(state)
```

`pickle.loads` trên dữ liệu attacker kiểm soát cho phép chạy code tùy ý (`__reduce__`). Cùng họ với nó: PHP `unserialize()`, Java `ObjectInputStream`, YAML `unsafe_load`.

```python
# SAU — dùng format dữ liệu thuần, không thực thi; validate schema
import json
from pydantic import BaseModel

class State(BaseModel):
    user_id: int
    items: list[str]

@app.post("/import")
def import_state(req):
    state = State.model_validate_json(req.body)  # JSON + schema, không code
    return apply(state)
```

### Ví dụ tấn công 2: CI/CD và artifact không kiểm toàn vẹn

Kéo Docker image bằng tag `:latest` (có thể bị thay), hoặc tải binary qua HTTP không verify checksum/chữ ký — attacker MITM hoặc đầu độc registry là chèn được mã độc vào production.

```dockerfile
# TRƯỚC — tag dễ bị thay đổi nội dung bên dưới
FROM node:20

# SAU — ghim theo digest (immutable), không thể bị tráo
FROM node:20-slim@sha256:5e7f...c1a2
```

### Checklist Integrity

- [ ] Pin dependency và base image theo **digest/hash**, không chỉ tag mềm.
- [ ] Verify **chữ ký số** của artifact (Sigstore/cosign, GPG) trước khi deploy.
- [ ] Không deserialize dữ liệu không tin cậy bằng format có thể thực thi.
- [ ] CI/CD: hạn chế quyền, review thay đổi pipeline, bảo vệ secret, dùng OIDC thay long-lived key.
- [ ] SRI (`integrity="sha384-..."`) cho script bên thứ ba nhúng trên web.

> ⚠️ Lỗ hổng: `pickle.loads`, `yaml.load` (không `SafeLoader`), `unserialize()`, `ObjectInputStream` trên input người dùng = RCE. Hãy coi mọi byte từ client/queue/cache là thù địch cho đến khi parse bằng format không-thực-thi và validate schema.

---

## A09:2021 — Security Logging & Monitoring Failures

Không log đủ thì bạn **mù** — không phát hiện được tấn công đang diễn ra, không điều tra được sau sự cố. Thống kê thực tế: thời gian trung bình để phát hiện breach tính bằng **hàng trăm ngày**, phần lớn do thiếu monitoring.

### Đây không phải bug — mà là "không thấy gì"

Triệu chứng: login thất bại không được log, không có alert cho hành vi bất thường, log lưu cục bộ (attacker xóa được), log thiếu context để truy vết.

### Ví dụ: log có cấu trúc cho sự kiện an ninh

```python
import structlog
log = structlog.get_logger()

def login(username, password, request):
    user = authenticate(username, password)
    if not user:
        log.warning("auth.login.failed",          # SỰ KIỆN an ninh
                    username=username,             # KHÔNG log password
                    ip=request.client.ip,
                    user_agent=request.headers.get("user-agent"))
        record_failed_attempt(username, request.client.ip)  # phục vụ alert
        return None
    log.info("auth.login.success", user_id=user.id, ip=request.client.ip)
    return user
```

Các sự kiện **bắt buộc** phải log: đăng nhập (thành công/thất bại), thay đổi quyền, reset mật khẩu, thay đổi cấu hình nhạy cảm, truy cập dữ liệu nhạy cảm, lỗi xác thực/ủy quyền.

### Cảnh báo: log đúng cách, tránh tự gây lỗ hổng

```python
# ⚠️ KHÔNG BAO GIỜ log những thứ này:
log.info("login", password=password)        # SAI: lộ credential
log.info("payment", card_number=card)       # SAI: lộ PII/PCI
log.info("session", token=jwt)              # SAI: lộ token

# Log định danh, không log bí mật:
log.info("payment", card_last4=card[-4:], user_id=user.id)
```

### Checklist Logging & Monitoring

- [ ] Log mọi sự kiện security-relevant, **có cấu trúc** (JSON), kèm `request_id` để trace.
- [ ] Gửi log tập trung (centralized), **append-only**, attacker trên host không sửa/xóa được.
- [ ] Alert tự động: nhiều login fail, spike 4xx/5xx, truy cập bất thường, quyền thay đổi.
- [ ] Tuyệt đối **không log** password, token, card, secret, PII không cần thiết.
- [ ] Đồng bộ thời gian (NTP) và chuẩn timezone (UTC) để correlate log đa hệ thống.
- [ ] Định kỳ diễn tập: "nếu bị tấn công lúc này, log có đủ để điều tra không?".

> 💡 Nguyên tắc: Log là để **phát hiện và điều tra**, không phải để debug đơn thuần. Một log security tốt phải trả lời được: ai, làm gì, lúc nào, từ đâu, kết quả ra sao — mà không chứa bí mật nào.

---

## A10:2021 — Server-Side Request Forgery (SSRF)

SSRF xảy ra khi server **fetch một URL do người dùng cung cấp** mà không kiểm soát đích. Attacker khiến server của bạn gọi tới nơi họ muốn — đặc biệt nguy hiểm trong cloud, vì server có thể truy cập **metadata endpoint** và mạng nội bộ mà attacker không trực tiếp tới được.

### Ví dụ tấn công: đánh cắp cloud credential qua metadata

Tính năng "nhập ảnh từ URL": server tải ảnh từ URL người dùng nhập.

```python
# TRƯỚC — fetch thẳng URL của user => SSRF
@app.post("/avatar/from-url")
def fetch_avatar(url: str):
    resp = requests.get(url)        # url = ?
    return save_avatar(resp.content)
```

Attacker nhập:
```
http://169.254.169.254/latest/meta-data/iam/security-credentials/<role>
```
Server (trong cloud) gọi tới **metadata endpoint** và trả về credential tạm thời của IAM role — attacker chiếm quyền hệ thống. Họ cũng có thể quét cổng nội bộ (`http://10.0.0.5:6379/`), gọi admin API nội bộ, hay đọc file qua `file://`.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Luồng tấn công SSRF đánh cắp credential qua metadata endpoint và các lớp phòng thủ</title>
  <desc>Attacker gửi URL trỏ tới 169.254.169.254 vào endpoint fetch-from-URL; server trong VPC gọi metadata endpoint thay attacker và trả credential IAM tạm về cho attacker. Bốn lớp chặn: allowlist scheme và domain, kiểm tra IP sau khi resolve DNS, cấm redirect, bắt buộc IMDSv2.</desc>
  <defs>
    <marker id="ssrfArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
    <marker id="ssrfArrowRed" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#f59e0b"/>
    </marker>
  </defs>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">SSRF: đánh cắp credential qua metadata</text>

  <g>
    <rect x="16" y="48" width="150" height="62" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="91" y="74" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Attacker</text>
    <text x="91" y="93" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">ngoài Internet</text>
  </g>

  <g>
    <rect x="285" y="40" width="170" height="78" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="370" y="66" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Server (trong VPC)</text>
    <text x="370" y="85" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">endpoint "fetch from URL"</text>
    <text x="370" y="101" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">gọi URL thay attacker</text>
  </g>

  <g>
    <rect x="558" y="40" width="146" height="78" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="631" y="64" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Metadata</text>
    <text x="631" y="81" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">169.254.169.254</text>
    <text x="631" y="99" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">credential IAM tạm</text>
  </g>

  <g stroke="currentColor" fill="none" stroke-width="1.6">
    <path d="M166 70 H283" marker-end="url(#ssrfArrow)"/>
    <path d="M455 70 H556" marker-end="url(#ssrfArrow)"/>
  </g>
  <text x="224" y="62" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.8">(1) URL=.../security-credentials</text>
  <text x="505" y="62" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.8">(2) GET metadata</text>

  <g stroke="#f59e0b" fill="none" stroke-width="1.8">
    <path d="M556 100 H457" marker-end="url(#ssrfArrowRed)"/>
    <path d="M283 100 H168" marker-end="url(#ssrfArrowRed)"/>
  </g>
  <text x="505" y="115" font-size="9.5" text-anchor="middle" fill="#f59e0b">(3) credential</text>
  <text x="224" y="115" font-size="9.5" text-anchor="middle" fill="#f59e0b">(4) credential lọt ra ngoài</text>

  <text x="16" y="168" font-size="13" font-weight="700" fill="currentColor">Các lớp chặn (defense in depth)</text>
  <g>
    <rect x="16" y="182" width="334" height="52" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="30" y="204" font-size="11.5" font-weight="700" fill="currentColor">Allowlist scheme + domain</text>
    <text x="30" y="222" font-size="10" fill="currentColor" opacity="0.72">chỉ http/https + domain biết trước; chặn file://</text>
  </g>
  <g>
    <rect x="370" y="182" width="334" height="52" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="384" y="204" font-size="11.5" font-weight="700" fill="currentColor">Kiểm IP sau khi resolve DNS</text>
    <text x="384" y="222" font-size="10" fill="currentColor" opacity="0.72">chặn private/loopback/link-local (169.254.x)</text>
  </g>
  <g>
    <rect x="16" y="244" width="334" height="52" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="30" y="266" font-size="11.5" font-weight="700" fill="currentColor">Cấm redirect</text>
    <text x="30" y="284" font-size="10" fill="currentColor" opacity="0.72">allow_redirects=False — redirect né allowlist</text>
  </g>
  <g>
    <rect x="370" y="244" width="334" height="52" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="384" y="266" font-size="11.5" font-weight="700" fill="currentColor">Bắt buộc IMDSv2</text>
    <text x="384" y="284" font-size="10" fill="currentColor" opacity="0.72">cần token PUT — vô hiệu SSRF kiểu cũ tới metadata</text>
  </g>
  <text x="16" y="324" font-size="10.5" fill="currentColor" opacity="0.7">Mỗi lớp cắt một mắt xích của luồng (1)→(4); bỏ một lớp vẫn còn lớp khác đỡ.</text>
</svg>

### Phòng chống nhiều lớp

```python
import ipaddress, socket
from urllib.parse import urlparse

ALLOWED_SCHEMES = {"http", "https"}

def is_safe_url(url: str) -> bool:
    p = urlparse(url)
    if p.scheme not in ALLOWED_SCHEMES:      # chặn file://, gopher://...
        return False
    # Resolve DNS rồi kiểm tra IP đích (chống DNS rebinding một phần)
    try:
        ip = ipaddress.ip_address(socket.gethostbyname(p.hostname))
    except Exception:
        return False
    # Chặn dải private / loopback / link-local (gồm 169.254.169.254)
    if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
        return False
    return True

@app.post("/avatar/from-url")
def fetch_avatar(url: str):
    if not is_safe_url(url):
        return {"error": "url_not_allowed"}, 400
    resp = requests.get(url, timeout=5, allow_redirects=False)  # chặn redirect bypass
    return save_avatar(resp.content)
```

### Các lớp phòng thủ SSRF (defense in depth)

| Lớp | Biện pháp |
|-----|-----------|
| Application | Allowlist scheme + domain; validate IP đích sau khi resolve DNS |
| Application | `allow_redirects=False` (redirect có thể trỏ về IP nội bộ) |
| Application | Allowlist domain đích nếu biết trước (mạnh hơn blocklist) |
| Network | Đặt egress firewall; service fetch URL không có route tới subnet nhạy cảm |
| Cloud | Bắt buộc **IMDSv2** (token bắt buộc) — vô hiệu hóa SSRF kiểu cũ tới metadata |

> ⚠️ Lỗ hổng: Blocklist IP đơn thuần dễ bị vượt qua bằng nhiều cách biểu diễn (`0x`, `[::]`, octal, DNS rebinding, redirect). Allowlist (chỉ cho phép domain/IP biết trước) luôn an toàn hơn blocklist. Và phải kiểm tra IP **sau khi resolve DNS**, không kiểm tra trên chuỗi hostname.

> 💡 Nguyên tắc: Bất kỳ chỗ nào server fetch theo input của user (URL avatar, webhook, import, PDF render, SSR fetch) đều là điểm SSRF tiềm năng. Mặc định **deny**, chỉ mở cho đích bạn thực sự cần.

---

## Liên hệ sang AWS

Phần 2 này ánh xạ trực tiếp vào các dịch vụ AWS — nhiều biện pháp phòng thủ trở thành cấu hình hạ tầng:

| OWASP | Dịch vụ AWS | Vai trò |
|-------|-------------|---------|
| A04 Insecure Design | **WAF** (rate-based rules), **Cognito** (built-in lockout/MFA) | Rate limit, lockout, MFA mà không tự code |
| A05 Misconfiguration | **Config**, **Security Hub**, **Trusted Advisor**, **S3 Block Public Access** | Phát hiện cấu hình lệch chuẩn, chặn S3 public toàn account |
| A06 Vulnerable Components | **Inspector**, **ECR image scanning** | Quét CVE trong EC2/Lambda/container image tự động |
| A08 Integrity Failures | **Signer** (sign code/container), **ECR** (immutable tags), **CodePipeline** + OIDC | Ký artifact, ghim image, pipeline có kiểm toàn vẹn |
| A09 Logging & Monitoring | **CloudTrail**, **CloudWatch Logs**, **GuardDuty**, **Security Lake** | Audit trail bất biến, phát hiện hành vi bất thường bằng ML |
| A10 SSRF | **IMDSv2** (bắt buộc token), **Security Group** / **NACL** egress, **VPC endpoint** | Vô hiệu SSRF tới metadata, kiểm soát luồng ra |

Một số ánh xạ đáng nhớ:

- **A10 + IMDSv2**: Đặt `HttpTokens=required` trên mọi EC2 instance. Đây là biện pháp **một dòng cấu hình** triệt tiêu lớp tấn công SSRF-tới-metadata kinh điển — bắt buộc với mọi instance mới.
- **A09 + GuardDuty**: GuardDuty đọc CloudTrail/VPC Flow/DNS log và tự cảnh báo khi credential IAM bị dùng từ IP lạ — chính là phát hiện hậu quả của một vụ SSRF thành công.
- **A06 + Inspector**: Inspector tự liên tục quét CVE trên workload, thay cho việc nhớ chạy `npm audit` thủ công.
- **A08 + IAM Roles + OIDC**: Cho CI/CD dùng OIDC federation thay vì long-lived access key — bảo vệ tính toàn vẹn pipeline bằng credential ngắn hạn, không có secret tĩnh để lộ.
- **A05 + IAM least privilege**: Cấu hình sai nguy hiểm nhất trên cloud thường là **IAM quá rộng** (`Action: "*"`). Dùng IAM Access Analyzer để phát hiện quyền dư thừa và public access ngoài ý muốn.

> 💡 Nguyên tắc: Trên AWS, "secure by design" nghĩa là để dịch vụ quản lý lo phần khó — đừng tự code rate limit khi có WAF, đừng tự quản key khi có **KMS**, đừng tự gom log khi có CloudTrail. Việc của kỹ sư là **bật đúng, cấu hình chặt, và giám sát** — phần lớn OWASP Top 10 ở tầng hạ tầng được giải quyết bằng cấu hình đúng, không phải bằng code.
