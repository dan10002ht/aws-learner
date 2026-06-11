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
