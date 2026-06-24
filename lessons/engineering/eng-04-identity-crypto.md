# Mật mã & Danh tính hiện đại: PKI, OAuth 2.1, JWT, Passkeys

Bảo mật trên cloud xoay quanh hai câu hỏi: **dữ liệu được bảo vệ thế nào** (mật mã) và **ai đang gọi API này** (danh tính). Bài này đi từ nền tảng mật mã (AES, RSA, hash, chữ ký số, PKI) đến các chuẩn danh tính hiện hành 2025–2026: OAuth 2.1, OIDC, JWT, SAML và passkeys. Mọi thứ đều có lệnh chạy thử được bằng `openssl` và ví dụ tính tay.

## 1. Mã hoá đối xứng vs bất đối xứng

### 1.1 Đối xứng (Symmetric) — AES

Một khoá duy nhất dùng để **mã hoá và giải mã**. Chuẩn công nghiệp là **AES-256-GCM** (GCM vừa mã hoá vừa chống sửa đổi — authenticated encryption).

```bash
# Tạo khoá 256-bit và mã hoá một file
openssl rand -hex 32 > key.hex
echo "du lieu mat" > secret.txt

openssl enc -aes-256-cbc -pbkdf2 -in secret.txt -out secret.enc -pass file:key.hex
openssl enc -d -aes-256-cbc -pbkdf2 -in secret.enc -pass file:key.hex
# => du lieu mat
```

- **Ưu điểm:** cực nhanh (phần cứng có lệnh AES-NI), phù hợp mã hoá dữ liệu lớn.
- **Nhược điểm:** bài toán **trao đổi khoá** — làm sao đưa khoá cho bên kia an toàn?

### 1.2 Bất đối xứng (Asymmetric) — RSA / EC

Cặp khoá: **public key** (công khai, ai cũng có) và **private key** (giữ tuyệt mật).

- Mã hoá bằng public key → chỉ private key giải được.
- Ký bằng private key → ai có public key cũng verify được.

```bash
# Tạo cặp khoá EC (chuẩn hiện nay ưu tiên EC hơn RSA vì khoá ngắn, nhanh hơn)
openssl ecparam -name prime256v1 -genkey -noout -out ec-private.pem
openssl ec -in ec-private.pem -pubout -out ec-public.pem

# RSA nếu cần tương thích hệ cũ (tối thiểu 2048, khuyến nghị 3072+)
openssl genrsa -out rsa-private.pem 3072
```

### 1.3 Bảng so sánh nhanh

| Tiêu chí | Đối xứng (AES) | Bất đối xứng (RSA/EC) |
|---|---|---|
| Số khoá | 1 khoá chung | Cặp public/private |
| Tốc độ | Rất nhanh | Chậm hơn 100–1000 lần |
| Dùng cho | Mã hoá dữ liệu lớn (data at rest) | Trao đổi khoá, chữ ký số, TLS handshake |
| Độ dài khoá phổ biến | 128/256 bit | RSA 2048–4096; EC P-256/P-384 |
| Vấn đề chính | Phân phối khoá | Hiệu năng, cần PKI để tin public key |

> 💡 **Ghi nhớ:** Thực tế luôn là **hybrid**: dùng bất đối xứng để trao đổi một khoá đối xứng, rồi dùng AES cho dữ liệu. TLS làm vậy, và AWS KMS **envelope encryption** cũng đúng mô hình này.

### 1.4 Envelope encryption — tính tay

Mô hình KMS dùng cho S3, EBS, RDS:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 410" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Envelope encryption với AWS KMS — 5 bước</title>
  <desc>KMS giữ master key không rời khỏi KMS; GenerateDataKey trả về data key plaintext và data key đã mã hoá; dùng data key plaintext mã hoá file rồi xoá plaintext; lưu file mã hoá cùng data key đã mã hoá; khi giải mã gửi data key mã hoá lên KMS để lấy lại plaintext.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Envelope encryption (KMS)</text>
  <!-- KMS box giữ master key -->
  <rect x="16" y="44" width="200" height="86" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="32" y="68" font-size="13" font-weight="700" fill="currentColor">AWS KMS</text>
  <rect x="32" y="80" width="168" height="36" rx="7" fill="#8b5cf6" fill-opacity="0.9"/>
  <text x="116" y="98" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">Master key (KMS key)</text>
  <text x="116" y="111" font-size="9.5" text-anchor="middle" fill="#fff" opacity="0.9">không bao giờ rời KMS</text>
  <!-- Step 1+2: GenerateDataKey -->
  <text x="240" y="62" font-size="11.5" font-weight="700" fill="currentColor">① ② GenerateDataKey →</text>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none" stroke-width="1.4">
    <path d="M216 88 H470" marker-end="url(#ar1)"/>
  </g>
  <defs>
    <marker id="ar1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 z" fill="currentColor"/></marker>
  </defs>
  <!-- Two data keys returned -->
  <rect x="476" y="48" width="228" height="38" rx="7" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="590" y="64" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Data key (plaintext)</text>
  <text x="590" y="78" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">32 byte — dùng ngay rồi xoá</text>
  <rect x="476" y="92" width="228" height="38" rx="7" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="590" y="108" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Data key (đã mã hoá)</text>
  <text x="590" y="122" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">mã hoá bởi master key</text>
  <!-- Step 3: encrypt file local + delete plaintext -->
  <text x="16" y="172" font-size="11.5" font-weight="700" fill="currentColor">③ Mã hoá file local bằng AES-256 với data key plaintext, rồi xoá plaintext khỏi RAM</text>
  <g stroke="currentColor" stroke-opacity="0.4" fill="none"><path d="M590 86 V152" stroke-dasharray="4 3"/></g>
  <rect x="16" y="186" width="160" height="64" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="96" y="214" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">File gốc</text>
  <text x="96" y="232" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">plaintext</text>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none" stroke-width="1.4"><path d="M176 218 H236" marker-end="url(#ar1)"/></g>
  <text x="206" y="210" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.8">AES</text>
  <rect x="240" y="186" width="160" height="64" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="320" y="214" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">File mã hoá</text>
  <text x="320" y="232" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">ciphertext</text>
  <!-- Step 4: store side by side -->
  <text x="16" y="288" font-size="11.5" font-weight="700" fill="currentColor">④ Lưu cạnh nhau:</text>
  <rect x="150" y="274" width="170" height="34" rx="7" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="235" y="296" font-size="10.5" text-anchor="middle" fill="currentColor">File mã hoá</text>
  <text x="330" y="296" font-size="13" fill="currentColor">+</text>
  <rect x="346" y="274" width="200" height="34" rx="7" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="446" y="296" font-size="10.5" text-anchor="middle" fill="currentColor">Data key (đã mã hoá)</text>
  <!-- Step 5: decrypt -->
  <text x="16" y="344" font-size="11.5" font-weight="700" fill="currentColor">⑤ Giải mã: gửi data key đã mã hoá lên KMS → KMS dùng master key → trả data key plaintext → giải mã file</text>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none" stroke-width="1.4">
    <path d="M446 308 C446 348, 160 348, 120 132" marker-end="url(#ar1)"/>
  </g>
  <text x="300" y="376" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">data key chỉ KMS giải được — file lớn hơn 4 KB vẫn mã hoá được vì AES chạy local</text>
</svg>

1. KMS giữ **master key (KMS key)** — không bao giờ rời khỏi KMS.
2. Gọi `GenerateDataKey` → nhận về **data key dạng plaintext** + **data key đã mã hoá** bởi master key.
3. Dùng data key plaintext mã hoá file (AES-256), rồi **xoá ngay** plaintext khỏi bộ nhớ.
4. Lưu file mã hoá + data key đã mã hoá cạnh nhau.
5. Khi giải mã: gửi data key đã mã hoá lên KMS → nhận plaintext data key → giải mã file.

Lý do: KMS chỉ mã hoá được tối đa **4 KB** mỗi lần gọi API — mã hoá file 1 GB trực tiếp là bất khả thi, nhưng mã hoá một data key 32 byte thì hoàn hảo.

## 2. Hashing, HMAC và chữ ký số

### 2.1 Hash — dấu vân tay một chiều

```bash
echo -n "hello" | shasum -a 256
# 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824

echo -n "hellp" | shasum -a 256   # đổi 1 ký tự
# 5891... hoàn toàn khác
```

Tính chất: một chiều (không đảo ngược được), thay đổi 1 bit → kết quả khác hẳn, gần như không thể tìm 2 input cùng hash (collision-resistant). Chuẩn: **SHA-256/SHA-512**. MD5 và SHA-1 đã **bị phá**, chỉ còn dùng làm checksum không bảo mật.

> ⚠️ **Lỗi thường gặp:** Lưu password bằng SHA-256 trần. Hash nhanh = brute-force nhanh. Password phải dùng hàm **chậm có salt**: bcrypt, scrypt, hoặc **Argon2id** (khuyến nghị hiện nay).

### 2.2 HMAC — hash có khoá

HMAC = hash kết hợp một secret key → vừa kiểm tra toàn vẹn, vừa **xác thực nguồn gửi** (chỉ ai có key mới tạo đúng HMAC).

```bash
echo -n "GET /orders" | openssl dgst -sha256 -hmac "my-secret-key"
# => chữ ký mà chỉ người giữ key tạo lại được
```

Đây chính là cơ chế của **AWS SigV4**: mỗi request tới AWS API được ký HMAC-SHA256 bằng secret access key (qua chuỗi dẫn xuất khoá theo ngày/region/service), AWS tính lại và so khớp — secret key **không bao giờ truyền trên mạng**.

### 2.3 Chữ ký số (Digital signature)

Chữ ký số = hash dữ liệu rồi **mã hoá hash bằng private key**. Bên nhận hash lại dữ liệu, giải chữ ký bằng public key, so sánh hai hash.

```bash
echo -n "noi dung quan trong" > msg.txt
openssl dgst -sha256 -sign ec-private.pem -out msg.sig msg.txt
openssl dgst -sha256 -verify ec-public.pem -signature msg.sig msg.txt
# Verified OK
```

| Cơ chế | Cần secret chung? | Chứng minh được với bên thứ ba? | Dùng cho |
|---|---|---|---|
| Hash | Không | Không (ai cũng tạo được) | Toàn vẹn dữ liệu |
| HMAC | Có (shared key) | Không (2 bên đều tạo được) | API auth, SigV4, JWT HS256 |
| Chữ ký số | Không (private key riêng) | **Có** (non-repudiation) | Certificate, JWT RS256/ES256, code signing |

## 3. PKI & Certificate

Public key tự nó vô danh — làm sao biết public key này đúng là của `example.com`? **PKI (Public Key Infrastructure)** giải quyết bằng **certificate**: một văn bản X.509 ràng buộc *public key ↔ danh tính*, được **CA (Certificate Authority)** ký bằng private key của CA.

Chuỗi tin cậy (chain of trust):

```
Root CA (tự ký, cài sẵn trong OS/browser)
  └── Intermediate CA (Root ký)
        └── Leaf certificate của example.com (Intermediate ký)
```

Xem chuỗi cert thật:

```bash
openssl s_client -connect aws.amazon.com:443 -showcerts </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates
# subject= CN=aws.amazon.com
# issuer = Amazon RSA 2048 M03 (Intermediate của Amazon Trust Services)
# notBefore / notAfter: thời hạn hiệu lực
```

> 💡 **Ghi nhớ:** Vòng đời cert public đang **rút ngắn mạnh**: CA/Browser Forum đã chốt lộ trình giảm dần xuống còn **47 ngày vào năm 2029** (hiện 2025–2026 đang ở giai đoạn ~200 ngày). Kết luận thực dụng: **tự động hoá gia hạn là bắt buộc** — ACME/Let's Encrypt, hoặc AWS ACM (tự gia hạn miễn phí cho cert dùng với ELB/CloudFront/API Gateway).

> ⚠️ **Lỗi thường gặp:** Nhầm "mã hoá" với "xác thực". TLS cần **cả hai**: certificate xác thực server là thật (chống man-in-the-middle), sau đó handshake mới trao đổi khoá đối xứng để mã hoá. Self-signed cert vẫn mã hoá được nhưng không xác thực được danh tính.

## 4. OAuth 2.1 — chuẩn uỷ quyền hiện hành

OAuth giải quyết bài toán **uỷ quyền (authorization)**: app A muốn truy cập tài nguyên của bạn ở dịch vụ B mà không cần bạn đưa password cho A.

**OAuth 2.1** là bản hợp nhất OAuth 2.0 + các best practice bảo mật, và là chuẩn hiện hành 2025–2026. Khác biệt cốt lõi so với 2.0:

| Thay đổi trong OAuth 2.1 | Lý do |
|---|---|
| **Authorization Code + PKCE bắt buộc cho MỌI client** (kể cả server có secret) | Chống authorization code interception |
| **Implicit flow (response_type=token) bị LOẠI BỎ** | Token lộ trên URL fragment, không có PKCE |
| **ROPC (Resource Owner Password Credentials) bị LOẠI BỎ** | App cầm trực tiếp password người dùng — phản mẫu |
| Refresh token cho public client phải **rotation** (dùng 1 lần) hoặc sender-constrained | Phát hiện token bị đánh cắp |
| Cấm bearer token trong query string | Lộ qua log, Referer header |
| Redirect URI phải so khớp **chính xác từng ký tự** | Chống open redirect |

### 4.1 Authorization Code + PKCE — luồng chuẩn duy nhất cần nhớ

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 440" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>OAuth 2.1 Authorization Code + PKCE — sequence diagram</title>
  <desc>Luồng theo thời gian giữa App, User và Authorization Server: App tạo code_verifier và code_challenge, redirect user kèm code_challenge, user đăng nhập và đồng ý, server trả authorization code, App đổi code lấy token kèm code_verifier, server hash verifier so với challenge rồi cấp token.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Authorization Code + PKCE</text>
  <!-- lifelines headers -->
  <rect x="40" y="40" width="150" height="34" rx="8" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="115" y="62" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">App (client)</text>
  <rect x="290" y="40" width="140" height="34" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="62" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">User</text>
  <rect x="530" y="40" width="170" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="615" y="62" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Authorization Server</text>
  <!-- lifelines -->
  <g stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4">
    <line x1="115" y1="74" x2="115" y2="420"/>
    <line x1="360" y1="74" x2="360" y2="420"/>
    <line x1="615" y1="74" x2="615" y2="420"/>
  </g>
  <defs>
    <marker id="arO" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 z" fill="currentColor"/></marker>
  </defs>
  <!-- step 1: App self -->
  <rect x="40" y="86" width="150" height="40" rx="7" fill="#3b82f6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="115" y="103" font-size="10" text-anchor="middle" fill="currentColor">① tạo code_verifier</text>
  <text x="115" y="118" font-size="10" text-anchor="middle" fill="currentColor">② challenge = SHA256(verifier)</text>
  <!-- step 3: App -> User redirect (qua browser) tới server -->
  <g stroke="currentColor" stroke-opacity="0.6" fill="none" stroke-width="1.4"><line x1="115" y1="156" x2="610" y2="156" marker-end="url(#arO)"/></g>
  <text x="362" y="150" font-size="10" text-anchor="middle" fill="currentColor">③ redirect /authorize?code_challenge=… (qua trình duyệt user)</text>
  <!-- step 4a: User login at server -->
  <g stroke="currentColor" stroke-opacity="0.6" fill="none" stroke-width="1.4"><line x1="360" y1="186" x2="610" y2="186" marker-end="url(#arO)"/></g>
  <text x="486" y="180" font-size="10" text-anchor="middle" fill="currentColor">④ đăng nhập + đồng ý</text>
  <!-- step 4b: server -> app code -->
  <g stroke="currentColor" stroke-opacity="0.6" fill="none" stroke-width="1.4"><line x1="615" y1="216" x2="118" y2="216" marker-end="url(#arO)"/></g>
  <text x="365" y="210" font-size="10" text-anchor="middle" fill="currentColor">redirect về ?code=AUTH_CODE</text>
  <!-- step 5: App -> server token + verifier -->
  <g stroke="currentColor" stroke-opacity="0.7" fill="none" stroke-width="1.6"><line x1="115" y1="250" x2="610" y2="250" marker-end="url(#arO)"/></g>
  <text x="362" y="244" font-size="10" text-anchor="middle" fill="currentColor">⑤ POST /token: code + code_verifier (gốc)</text>
  <!-- step 6: server self check -->
  <rect x="500" y="266" width="200" height="40" rx="7" fill="#8b5cf6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="600" y="283" font-size="10" text-anchor="middle" fill="currentColor">⑥ SHA256(verifier) ?= challenge</text>
  <text x="600" y="298" font-size="10" text-anchor="middle" fill="currentColor">khớp → cấp token</text>
  <!-- step 6b: server -> app token -->
  <g stroke="currentColor" stroke-opacity="0.7" fill="none" stroke-width="1.6"><line x1="615" y1="330" x2="118" y2="330" marker-end="url(#arO)"/></g>
  <text x="365" y="324" font-size="10" text-anchor="middle" fill="currentColor">access token (+ id token, refresh token)</text>
  <text x="360" y="372" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Kẻ chặn AUTH_CODE mà không có code_verifier → không đổi được token</text>
  <line x1="80" y1="386" x2="640" y2="386" stroke="currentColor" stroke-opacity="0.15"/>
  <text x="360" y="406" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">thời gian đi từ trên xuống dưới</text>
</svg>

```
1. App tạo code_verifier = chuỗi ngẫu nhiên 43-128 ký tự
2. code_challenge = BASE64URL(SHA256(code_verifier))
3. Redirect user tới authorization server:
   GET /authorize?response_type=code
       &client_id=abc&redirect_uri=https://app.example.com/cb
       &scope=openid profile&state=xyz
       &code_challenge=...&code_challenge_method=S256
4. User đăng nhập, đồng ý → server redirect về kèm ?code=AUTH_CODE
5. App đổi code lấy token (kèm code_verifier gốc):
   POST /token
   grant_type=authorization_code&code=AUTH_CODE
   &code_verifier=...&redirect_uri=...&client_id=abc
6. Server hash code_verifier, so với code_challenge ở bước 3 → khớp mới cấp token
```

PKCE đảm bảo: kẻ chặn được `AUTH_CODE` (qua log, app độc hại bắt redirect) **không đổi được token** vì không có `code_verifier`.

Tự tính một cặp PKCE để hiểu:

```bash
verifier=$(openssl rand -base64 48 | tr '+/' '-_' | tr -d '=')
challenge=$(printf '%s' "$verifier" | openssl dgst -sha256 -binary | base64 | tr '+/' '-_' | tr -d '=')
echo "verifier:  $verifier"
echo "challenge: $challenge"
```

### 4.2 Client Credentials — machine-to-machine

Luồng còn lại đáng dùng: service A gọi service B, không có người dùng. App gửi `client_id` + `client_secret` đổi thẳng lấy access token. Đây là luồng cho microservices, cron job, CI/CD.

> ⚠️ **Lỗi thường gặp:** Năm 2026 mà vẫn thiết kế SPA/mobile dùng Implicit flow vì "đỡ một bước gọi token endpoint". Implicit đã bị loại khỏi chuẩn; SPA dùng Authorization Code + PKCE, không có ngoại lệ. Tương tự, nếu thấy ai đề xuất ROPC ("cứ post username/password lên token endpoint") — từ chối.

## 5. OIDC — lớp xác thực trên OAuth

OAuth thuần chỉ trả lời "app này được phép làm gì", **không** trả lời "user là ai". **OIDC (OpenID Connect)** bổ sung lớp identity: thêm scope `openid` vào luồng Authorization Code, nhận thêm **ID token**.

| | ID token | Access token |
|---|---|---|
| Định dạng | Luôn là JWT | Thường JWT (RFC 9068) hoặc opaque |
| Dành cho | **Client app** đọc | **Resource server (API)** đọc |
| Nội dung | Danh tính user: `sub`, `email`, `name`, `auth_time` | Quyền truy cập: `scope`, `aud` là API |
| Dùng để | Hiển thị "Xin chào Đan", tạo session phía app | Gắn vào header `Authorization: Bearer ...` khi gọi API |
| Sai lầm điển hình | Gửi ID token cho API để authorize | Decode access token ở client rồi tin nội dung |

> 💡 **Ghi nhớ:** ID token = giấy khai sinh (bạn là ai). Access token = vé vào cửa (bạn được vào đâu). API nhận nhầm giấy khai sinh thay vé là lỗ hổng thật ngoài đời.

## 6. JWT đúng cách

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cấu trúc JWT và quy trình verify chữ ký</title>
  <desc>JWT gồm ba phần Base64URL ngăn bởi dấu chấm: header, payload và signature. Header và payload được ký; signature kiểm bằng public key lấy từ JWKS endpoint của issuer, chọn key theo kid trong header.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Cấu trúc JWT — header.payload.signature</text>
  <!-- three segments -->
  <rect x="16" y="42" width="216" height="70" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="124" y="62" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Header</text>
  <text x="124" y="80" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">Base64URL</text>
  <text x="124" y="98" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">alg: RS256 · kid: abc1</text>
  <text x="240" y="86" font-size="20" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.6">.</text>
  <rect x="252" y="42" width="216" height="70" rx="9" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="62" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Payload</text>
  <text x="360" y="80" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">Base64URL</text>
  <text x="360" y="98" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">sub · iss · aud · exp</text>
  <text x="476" y="86" font-size="20" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.6">.</text>
  <rect x="488" y="42" width="216" height="70" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="596" y="62" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Signature</text>
  <text x="596" y="80" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">Base64URL</text>
  <text x="596" y="98" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">ký SHA256(header.payload)</text>
  <!-- "được ký" bracket over header+payload -->
  <g stroke="currentColor" stroke-opacity="0.5" fill="none" stroke-width="1.3">
    <path d="M20 124 V134 H464 V124"/>
  </g>
  <text x="242" y="150" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">phần ĐƯỢC KÝ (header + payload)</text>
  <!-- verify flow -->
  <text x="16" y="190" font-size="13" font-weight="700" fill="currentColor">Verify chữ ký (resource server)</text>
  <rect x="16" y="206" width="180" height="58" rx="9" fill="#f59e0b" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="106" y="230" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">① đọc kid trong header</text>
  <text x="106" y="248" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">định danh key đã ký</text>
  <defs>
    <marker id="arJ" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 z" fill="currentColor"/></marker>
  </defs>
  <g stroke="currentColor" stroke-opacity="0.6" fill="none" stroke-width="1.4"><line x1="196" y1="235" x2="262" y2="235" marker-end="url(#arJ)"/></g>
  <rect x="268" y="206" width="200" height="58" rx="9" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="368" y="230" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">② lấy public key từ JWKS</text>
  <text x="368" y="248" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">/.well-known/jwks.json theo kid</text>
  <g stroke="currentColor" stroke-opacity="0.6" fill="none" stroke-width="1.4"><line x1="468" y1="235" x2="534" y2="235" marker-end="url(#arJ)"/></g>
  <rect x="540" y="206" width="164" height="58" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="622" y="230" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">③ verify chữ ký</text>
  <text x="622" y="248" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">khớp → tin payload</text>
  <text x="16" y="296" font-size="10.5" fill="currentColor" opacity="0.8">Base64 KHÔNG phải mã hoá — ai cũng đọc được payload. Giá trị nằm ở chữ ký.</text>
  <text x="16" y="316" font-size="10.5" font-weight="700" fill="currentColor">Từ chối alg: none và đổi alg bất ngờ (RS256→HS256 confusion).</text>
  <text x="16" y="340" font-size="10" fill="currentColor" opacity="0.7">Sau khi verify chữ ký, vẫn phải kiểm exp · iss · aud (xem checklist 6.1).</text>
</svg>

JWT = `header.payload.signature`, mỗi phần Base64URL. Decode tay:

```bash
jwt="eyJhbGciOiJSUzI1NiIsImtpZCI6ImFiYzEifQ.eyJzdWIiOiJ1c2VyLTQyIiwiaXNzIjoiaHR0cHM6Ly9pZHAuZXhhbXBsZS5jb20iLCJhdWQiOiJvcmRlcnMtYXBpIiwiZXhwIjoxNzgwMDAwMDAwfQ.SIG"
echo "$jwt" | cut -d. -f2 | base64 -d 2>/dev/null
# {"sub":"user-42","iss":"https://idp.example.com","aud":"orders-api","exp":1780000000}
```

**Base64 không phải mã hoá** — ai cũng đọc được payload. Giá trị của JWT nằm ở **chữ ký**.

### 6.1 Checklist validate JWT (resource server PHẢI làm đủ)

1. **Chữ ký**: verify bằng public key lấy từ JWKS endpoint của issuer (`/.well-known/jwks.json`), chọn key theo `kid`. Thuật toán cho phép: `RS256`/`ES256`. **Từ chối `alg: none`** và từ chối JWT đổi alg bất ngờ (tấn công algorithm confusion RS256→HS256).
2. **`exp`**: chưa hết hạn (cho phép lệch đồng hồ vài chục giây).
3. **`iss`**: đúng issuer mình tin (so sánh chuỗi chính xác).
4. **`aud`**: token cấp **cho API của mình**, không phải API khác.
5. (Access token) **`typ: at+jwt`** theo **RFC 9068** — chuẩn JWT access token, giúp phân biệt với ID token và chặn token confusion.

### 6.2 Đừng nhét cả thế giới vào JWT

JWT là **stateless** — đã ký là không thu hồi được cho đến khi `exp`. Hệ quả thiết kế:

- Access token nên **ngắn hạn** (5–15 phút), refresh token lo việc gia hạn (kèm rotation).
- Đừng nhét toàn bộ permission/role chi tiết vào claim: user bị khoá quyền vẫn xài token cũ tới khi hết hạn, và token phình to (mỗi request đều cõng nó). Để claim tối thiểu (`sub`, `scope` thô), quyền chi tiết tra ở backend.
- Cần thu hồi tức thì (logout toàn cục, khoá tài khoản)? Phải có thêm denylist/introspection — tức là mất "stateless". Cân nhắc ngay từ đầu.

> ⚠️ **Lỗi thường gặp:** Lưu JWT trong `localStorage` của SPA — XSS là mất sạch. Pattern 2025–2026 cho SPA: refresh token trong **HttpOnly Secure cookie** (hoặc kiến trúc BFF — Backend-for-Frontend giữ token hộ), access token chỉ sống trong bộ nhớ.

## 7. SAML — vẫn sống khoẻ trong enterprise

SAML 2.0 (ra đời 2005): trao đổi **XML assertion** ký số giữa IdP (Okta, Entra ID, ADFS) và SP (ứng dụng). Già nhưng chưa chết — hàng vạn app enterprise (Salesforce, Workday, các app nội bộ) vẫn chạy SAML SSO.

| | SAML 2.0 | OIDC |
|---|---|---|
| Định dạng | XML, ký XML-DSig | JSON/JWT |
| Hợp với | Web SSO enterprise, app cũ | Mobile, SPA, API, mọi thứ mới |
| Độ phức tạp | Cao (XML canonicalization lắm lỗ hổng lịch sử) | Thấp hơn nhiều |
| Xu hướng | Duy trì hệ cũ | **Mặc định cho dự án mới** |

Quy tắc thực dụng: **dự án mới → OIDC; tích hợp với IdP doanh nghiệp có sẵn → theo cái họ có, thường là SAML**.

## 8. Passkeys / WebAuthn (FIDO2) — khai tử password

Passkey = cặp khoá bất đối xứng thay cho password, chuẩn **WebAuthn + FIDO2**. Từ 2025–2026, Apple, Google, Microsoft đều bật passkey **mặc định** và đồng bộ qua iCloud Keychain / Google Password Manager; các dịch vụ lớn (Google, GitHub, Amazon, Microsoft) đẩy passkey thành phương thức đăng nhập chính.

Cơ chế (chính là ý tưởng public-key ở phần 1):

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 470" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Passkey / WebAuthn — luồng đăng ký và đăng nhập đối xứng</title>
  <desc>Đăng ký: server gửi challenge, thiết bị tạo cặp khoá riêng cho website, private key giữ trong Secure Enclave, gửi public key cho server lưu. Đăng nhập: server gửi challenge, thiết bị ký bằng private key sau khi xác thực sinh trắc, server verify chữ ký bằng public key đã lưu.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Passkey / WebAuthn (FIDO2)</text>
  <defs>
    <marker id="arP" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 z" fill="currentColor"/></marker>
  </defs>
  <!-- ===== Column heads ===== -->
  <rect x="30" y="44" width="290" height="30" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="175" y="64" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Thiết bị (Secure Enclave / TPM)</text>
  <rect x="400" y="44" width="290" height="30" rx="8" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="545" y="64" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Server</text>
  <g stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4">
    <line x1="175" y1="74" x2="175" y2="450"/>
    <line x1="545" y1="74" x2="545" y2="450"/>
  </g>
  <!-- ===== ĐĂNG KÝ ===== -->
  <text x="16" y="100" font-size="12.5" font-weight="700" fill="#10b981">Đăng ký (register)</text>
  <g stroke="currentColor" stroke-opacity="0.6" fill="none" stroke-width="1.4"><line x1="545" y1="120" x2="178" y2="120" marker-end="url(#arP)"/></g>
  <text x="360" y="114" font-size="10" text-anchor="middle" fill="currentColor">① server gửi challenge</text>
  <rect x="35" y="134" width="280" height="44" rx="7" fill="#10b981" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="175" y="151" font-size="10" text-anchor="middle" fill="currentColor">② tạo cặp khoá RIÊNG cho website này</text>
  <text x="175" y="168" font-size="10" text-anchor="middle" fill="currentColor">private key ở trong Secure Enclave (mở bằng Face ID/vân tay)</text>
  <g stroke="currentColor" stroke-opacity="0.6" fill="none" stroke-width="1.4"><line x1="175" y1="200" x2="542" y2="200" marker-end="url(#arP)"/></g>
  <text x="360" y="194" font-size="10" text-anchor="middle" fill="currentColor">③ gửi public key + credential ID → server lưu</text>
  <line x1="16" y1="226" x2="704" y2="226" stroke="currentColor" stroke-opacity="0.18"/>
  <!-- ===== ĐĂNG NHẬP ===== -->
  <text x="16" y="252" font-size="12.5" font-weight="700" fill="#8b5cf6">Đăng nhập (login)</text>
  <g stroke="currentColor" stroke-opacity="0.6" fill="none" stroke-width="1.4"><line x1="545" y1="272" x2="178" y2="272" marker-end="url(#arP)"/></g>
  <text x="360" y="266" font-size="10" text-anchor="middle" fill="currentColor">① server gửi challenge ngẫu nhiên</text>
  <rect x="35" y="286" width="280" height="44" rx="7" fill="#8b5cf6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="175" y="303" font-size="10" text-anchor="middle" fill="currentColor">② ký challenge bằng private key</text>
  <text x="175" y="320" font-size="10" text-anchor="middle" fill="currentColor">sau khi xác thực sinh trắc — secret không rời thiết bị</text>
  <g stroke="currentColor" stroke-opacity="0.6" fill="none" stroke-width="1.4"><line x1="175" y1="352" x2="542" y2="352" marker-end="url(#arP)"/></g>
  <text x="360" y="346" font-size="10" text-anchor="middle" fill="currentColor">gửi chữ ký lên server</text>
  <rect x="405" y="366" width="280" height="40" rx="7" fill="#8b5cf6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="545" y="390" font-size="10" text-anchor="middle" fill="currentColor">③ verify chữ ký bằng public key đã lưu</text>
  <text x="360" y="438" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">Server chỉ lưu public key · credential gắn chặt origin → phishing-resistant</text>
</svg>

```
Đăng ký:
  1. Server gửi challenge
  2. Thiết bị tạo cặp khoá RIÊNG cho website này
     (private key nằm trong Secure Enclave/TPM, mở bằng Face ID/vân tay/PIN)
  3. Gửi public key + credential ID cho server lưu

Đăng nhập:
  1. Server gửi challenge ngẫu nhiên
  2. Thiết bị ký challenge bằng private key (sau khi xác thực sinh trắc)
  3. Server verify chữ ký bằng public key đã lưu
```

Vì sao **phishing-resistant** — hơn hẳn cả password + TOTP:

- Credential **gắn chặt với origin** (domain): trang giả `arnazon.com` không bao giờ kích hoạt được passkey của `amazon.com`. Người dùng *muốn* bị lừa cũng không gõ nhầm được.
- Server chỉ lưu **public key** → DB bị dump cũng không có gì để crack, không có password reuse.
- Challenge ngẫu nhiên mỗi lần → chống replay.

> 💡 **Ghi nhớ:** Password = "shared secret cả hai bên cùng biết" (lộ một bên là toang). Passkey = "chứng minh sở hữu private key, secret không bao giờ rời thiết bị". Đây là cùng một nguyên lý với chữ ký số và SigV4 — nắm một lần, hiểu cả ba.

## 9. Khi nào dùng gì — bảng tra nhanh

| Tình huống | Dùng |
|---|---|
| Mã hoá file/DB dung lượng lớn | AES-256-GCM (qua envelope encryption nếu trên AWS) |
| Trao đổi khoá, TLS, ký số | EC (P-256) hoặc RSA ≥ 2048 + certificate |
| Kiểm tra toàn vẹn file tải về | SHA-256 checksum |
| Xác thực request API có shared secret | HMAC-SHA256 (mô hình SigV4) |
| Lưu password (khi chưa lên được passkey) | Argon2id / bcrypt, không bao giờ hash trần |
| User đăng nhập web/mobile app mới | OIDC trên OAuth 2.1 (Auth Code + PKCE) + passkey nếu được |
| Service gọi service | OAuth Client Credentials (hoặc IAM role trong AWS) |
| SSO với IdP doanh nghiệp sẵn có | SAML (hoặc OIDC nếu IdP hỗ trợ) |
| Token cho API | JWT access token theo RFC 9068, ngắn hạn, validate đủ 5 bước |

## Liên hệ sang AWS

Toàn bộ bài này map thẳng vào các dịch vụ xuất hiện dày đặc trong đề SAA-C03 và DVA-C02:

- **KMS — envelope encryption:** đúng mô hình mục 1.4. Đề DVA hay hỏi: "mã hoá file lớn hơn 4 KB bằng KMS?" → đáp án là `GenerateDataKey` + mã hoá local, không phải gọi `Encrypt` trực tiếp. SAA hỏi SSE-S3 vs SSE-KMS vs SSE-C: khác nhau ở **ai quản lý key và có audit qua CloudTrail không** (SSE-KMS có).
- **IAM SigV4:** mọi AWS API call đều ký HMAC-SHA256 từ secret access key (mục 2.2). Đề DVA: lỗi `SignatureDoesNotMatch` thường do lệch đồng hồ hoặc sai region trong chuỗi dẫn xuất khoá; pre-signed URL của S3 chính là SigV4 có hạn dùng.
- **Cognito:** User Pool là **OIDC identity provider** quản lý — cấp ID token + access token + refresh token, chạy Authorization Code + PKCE cho mobile/SPA, và **hỗ trợ passkeys/WebAuthn** (Essentials/Plus tier, ra mắt cuối 2024). Identity Pool thì đổi token lấy **AWS credentials tạm thời** — đề SAA rất thích bẫy phân biệt User Pool (authentication) vs Identity Pool (AWS authorization).
- **IAM Identity Center:** SSO cho workforce vào AWS accounts và app, nhận IdP ngoài qua **SAML 2.0** + đồng bộ user bằng SCIM — đáp án chuẩn cho câu "công ty dùng Entra ID/Okta muốn nhân viên đăng nhập AWS không tạo IAM user".
- **ACM:** cấp và **tự động gia hạn** certificate TLS miễn phí cho ELB, CloudFront, API Gateway — lời giải cho xu hướng vòng đời cert ngắn dần ở mục 3. Lưu ý đề thi: cert cho CloudFront phải nằm ở **us-east-1**; ACM không cho export private key của public cert (muốn cài lên EC2 tự quản → ACM Private CA hoặc cert ngoài).
- **API Gateway + Lambda authorizer / JWT authorizer:** HTTP API có sẵn JWT authorizer làm đúng checklist mục 6.1 (issuer, audience, chữ ký qua JWKS) — câu hỏi DVA kinh điển về cách bảo vệ API bằng Cognito hoặc IdP OIDC bên thứ ba.

Nắm vững lớp nền này, các câu hỏi "encryption at rest/in transit", "federation", "token nào cho ai" trong đề thi sẽ chỉ còn là bài tập tra bảng.
