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

> **Ghi nhớ:** Thực tế luôn là **hybrid**: dùng bất đối xứng để trao đổi một khoá đối xứng, rồi dùng AES cho dữ liệu. TLS làm vậy, và AWS KMS **envelope encryption** cũng đúng mô hình này.

### 1.4 Envelope encryption — tính tay

Mô hình KMS dùng cho S3, EBS, RDS:

<step-flow>
<svg viewBox="0 0 760 670" role="img" aria-labelledby="eng04a-t eng04a-d" style="width:100%;max-width:760px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="eng04a-t">Envelope encryption với AWS KMS: mã hoá file 1 GB rồi giải mã, 9 bước</title>
<desc id="eng04a-d">Sơ đồ tuần tự ba lifeline App, AWS KMS giữ master key không bao giờ rời KMS, và Lưu trữ. Mã hoá: App gọi GenerateDataKey, nhận data key bản rõ 32 byte cùng data key đã mã hoá bởi master key, mã hoá file 1 GB bằng AES-256 ngay trên máy, xoá ngay bản rõ khỏi RAM, rồi lưu file mã hoá cạnh data key đã mã hoá. Giải mã: đọc cả hai, gửi data key đã mã hoá lên KMS, KMS dùng master key trả lại data key bản rõ, App giải mã file local rồi xoá bản rõ. Gọi KMS trực tiếp chỉ được tối đa 4 KB mỗi lần.</desc>
<defs>
<marker id="eng04a-arr" markerWidth="9" markerHeight="9" refX="7" refY="3.2" orient="auto"><path d="M0 0 L7 3.2 L0 6.4 z" fill="currentColor"/></marker>
</defs>
<rect x="50" y="14" width="200" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
<text x="150" y="44" text-anchor="middle" font-size="14" fill="currentColor" font-weight="700">App (RAM)</text>
<rect x="320" y="14" width="200" height="50" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
<text x="420" y="35" text-anchor="middle" font-size="14" fill="currentColor" font-weight="700">AWS KMS</text>
<text x="420" y="54" text-anchor="middle" font-size="12" fill="currentColor" opacity="0.8">master key không rời KMS</text>
<rect x="580" y="14" width="160" height="50" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
<text x="660" y="35" text-anchor="middle" font-size="14" fill="currentColor" font-weight="700">Lưu trữ</text>
<text x="660" y="54" text-anchor="middle" font-size="12" fill="currentColor" opacity="0.8">S3 / EBS / RDS</text>
<line x1="150" y1="64" x2="150" y2="590" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 4"/>
<line x1="420" y1="64" x2="420" y2="590" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 4"/>
<line x1="660" y1="64" x2="660" y2="590" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 4"/>
<text x="16" y="92" text-anchor="start" font-size="14" fill="currentColor" font-weight="700">A · MÃ HOÁ file 1 GB</text>
<g data-step="1">
<text x="285" y="113" text-anchor="middle" font-size="13" fill="currentColor">1 · GenerateDataKey</text>
<line x1="152" y1="122" x2="414" y2="122" stroke="currentColor" stroke-opacity="0.65" stroke-width="1.5" marker-end="url(#eng04a-arr)"/>
</g>
<g data-step="2">
<text x="285" y="148" text-anchor="middle" font-size="13" fill="currentColor">2 · cùng một data key, hai bản</text>
<line x1="418" y1="157" x2="156" y2="157" stroke="currentColor" stroke-opacity="0.65" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#eng04a-arr)"/>
<rect x="16" y="168" width="290" height="28" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="161" y="187" text-anchor="middle" font-size="13" fill="currentColor">data key bản rõ · 32 byte</text>
<rect x="16" y="202" width="290" height="28" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="161" y="221" text-anchor="middle" font-size="13" fill="currentColor">data key đã mã hoá (bởi master key)</text>
</g>
<g data-step="3">
<rect x="16" y="240" width="380" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
<text x="206" y="259" text-anchor="middle" font-size="13" fill="currentColor">3 · AES-256 local: file gốc 1 GB → file mã hoá</text>
<text x="206" y="277" text-anchor="middle" font-size="12" fill="currentColor" opacity="0.8">dùng data key bản rõ; 1 GB không đi tới KMS</text>
</g>
<g data-step="4">
<line x1="28" y1="182" x2="294" y2="182" stroke="#f43f5e" stroke-width="2.5"/>
<text x="318" y="187" text-anchor="start" font-size="16" fill="currentColor" fill-opacity="1">✗</text>
<rect x="16" y="296" width="290" height="28" rx="8" fill="#f43f5e" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="161" y="315" text-anchor="middle" font-size="13" fill="currentColor">4 · xoá ngay bản rõ khỏi RAM</text>
</g>
<g data-step="5">
<text x="405" y="346" text-anchor="middle" font-size="13" fill="currentColor">5 · lưu cạnh nhau</text>
<line x1="152" y1="355" x2="654" y2="355" stroke="currentColor" stroke-opacity="0.65" stroke-width="1.5" marker-end="url(#eng04a-arr)"/>
<rect x="560" y="364" width="190" height="46" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
<text x="655" y="383" text-anchor="middle" font-size="13" fill="currentColor">file mã hoá</text>
<text x="655" y="401" text-anchor="middle" font-size="13" fill="currentColor">+ data key đã mã hoá</text>
</g>
<line x1="16" y1="424" x2="744" y2="424" stroke="currentColor" stroke-opacity="0.18"/>
<text x="16" y="448" text-anchor="start" font-size="14" fill="currentColor" font-weight="700">B · GIẢI MÃ</text>
<g data-step="6">
<text x="405" y="470" text-anchor="middle" font-size="13" fill="currentColor">6 · đọc file mã hoá + data key đã mã hoá</text>
<line x1="658" y1="479" x2="156" y2="479" stroke="currentColor" stroke-opacity="0.65" stroke-width="1.5" marker-end="url(#eng04a-arr)"/>
</g>
<g data-step="7">
<text x="285" y="503" text-anchor="middle" font-size="13" fill="currentColor">7 · Decrypt(data key đã mã hoá)</text>
<line x1="152" y1="512" x2="414" y2="512" stroke="currentColor" stroke-opacity="0.65" stroke-width="1.5" marker-end="url(#eng04a-arr)"/>
<rect x="330" y="520" width="180" height="28" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
<text x="420" y="539" text-anchor="middle" font-size="13" fill="currentColor">mở bằng master key</text>
</g>
<g data-step="8">
<text x="285" y="566" text-anchor="middle" font-size="13" fill="currentColor">8 · data key bản rõ</text>
<line x1="418" y1="575" x2="156" y2="575" stroke="currentColor" stroke-opacity="0.65" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#eng04a-arr)"/>
</g>
<g data-step="9">
<rect x="16" y="584" width="290" height="28" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
<text x="161" y="603" text-anchor="middle" font-size="13" fill="currentColor">9 · giải mã file local → xoá bản rõ</text>
</g>
<text x="16" y="638" text-anchor="start" font-size="13" fill="currentColor" opacity="0.8">Gọi KMS trực tiếp: tối đa 4 KB mỗi lần. Qua phong bì: chỉ data key 32 byte tới KMS,</text>
<text x="16" y="658" text-anchor="start" font-size="13" fill="currentColor" opacity="0.8">còn AES chạy local nên file lớn hơn 4 KB (1 GB, 100 GB…) vẫn mã hoá được. Nét đứt = response.</text>
</svg>
<step-note data-step="1">App cần một khoá để mã hoá, nhưng master key không bao giờ rời KMS. Nên app xin KMS sinh riêng một data key cho file này.</step-note>
<step-note data-step="2">Một lần gọi trả về hai bản của <b>cùng</b> một khoá: bản rõ để dùng ngay, bản bọc bằng master key để cất. Lúc ghi không cần gọi KMS thêm lần nào.</step-note>
<step-note data-step="3">Mã hoá chạy trên máy app nên 1 GB không đi qua mạng và không vướng giới hạn 4 KB mỗi lần gọi KMS (gọi thẳng thì 1 GB / 4 KB ≈ 262 nghìn lần).</step-note>
<step-note data-step="4">Bản rõ bị xoá ngay khi mã hoá xong: kể từ đây chỉ KMS mở được file. Nếu giữ bản rõ cạnh file thì master key không còn bảo vệ gì.</step-note>
<step-note data-step="5">Data key đã mã hoá là cái phong bì đi kèm file: lộ nó vô hại vì chỉ KMS giải được, và app không phải tự nhớ khoá nào ứng file nào.</step-note>
<step-note data-step="6">Đọc lên cả hai, nhưng chưa giải mã được gì vì data key vẫn đang bị master key bọc.</step-note>
<step-note data-step="7">Chỉ 32 byte đi lên KMS. Đây là cửa duy nhất để mở phong bì: không được KMS cho dùng master key thì dừng tại đây.</step-note>
<step-note data-step="8">KMS trả bản rõ của data key; master key vẫn chưa từng rời KMS.</step-note>
<step-note data-step="9">Giải mã 1 GB chạy local như lúc mã hoá, xong lại xoá bản rõ giống bước 4.</step-note>
</step-flow>

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

> **Lỗi thường gặp:** Lưu password bằng SHA-256 trần. Hash nhanh = brute-force nhanh. Password phải dùng hàm **chậm có salt**: bcrypt, scrypt, hoặc **Argon2id** (khuyến nghị hiện nay).

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

> **Ghi nhớ:** Vòng đời cert public đang **rút ngắn mạnh**: CA/Browser Forum đã chốt lộ trình giảm dần xuống còn **47 ngày vào năm 2029** (hiện 2025–2026 đang ở giai đoạn ~200 ngày). Kết luận thực dụng: **tự động hoá gia hạn là bắt buộc** — ACME/Let's Encrypt, hoặc AWS ACM (tự gia hạn miễn phí cho cert dùng với ELB/CloudFront/API Gateway).

> **Lỗi thường gặp:** Nhầm "mã hoá" với "xác thực". TLS cần **cả hai**: certificate xác thực server là thật (chống man-in-the-middle), sau đó handshake mới trao đổi khoá đối xứng để mã hoá. Self-signed cert vẫn mã hoá được nhưng không xác thực được danh tính.

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

<step-flow>
<svg viewBox="0 0 760 560" role="img" aria-labelledby="eng04b-t eng04b-d" style="width:100%;max-width:760px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="eng04b-t">OAuth 2.1 Authorization Code + PKCE, 6 bước</title>
<desc id="eng04b-d">Sơ đồ tuần tự ba lifeline App (client), User (trình duyệt) và Authorization Server, thời gian đi từ trên xuống. App tạo code_verifier ngẫu nhiên 43-128 ký tự, tính code_challenge = BASE64URL(SHA256(verifier)), redirect user qua trình duyệt tới /authorize kèm code_challenge và method S256; user đăng nhập và đồng ý, server redirect về kèm code=AUTH_CODE; App POST /token kèm code và code_verifier gốc; server hash verifier so với challenge, khớp mới cấp access token cùng id token và refresh token. Kẻ chặn AUTH_CODE mà không có code_verifier không đổi được token.</desc>
<defs>
<marker id="eng04b-arr" markerWidth="9" markerHeight="9" refX="7" refY="3.2" orient="auto"><path d="M0 0 L7 3.2 L0 6.4 z" fill="currentColor"/></marker>
</defs>
<rect x="40" y="14" width="160" height="34" rx="8" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="120" y="36" text-anchor="middle" font-size="13" fill="currentColor" font-weight="700">App (client)</text>
<rect x="290" y="14" width="180" height="34" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="380" y="36" text-anchor="middle" font-size="13" fill="currentColor" font-weight="700">User (trình duyệt)</text>
<rect x="540" y="14" width="200" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="640" y="36" text-anchor="middle" font-size="13" fill="currentColor" font-weight="700">Authorization Server</text>
<line x1="120" y1="48" x2="120" y2="486" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 4"/>
<line x1="380" y1="48" x2="380" y2="486" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 4"/>
<line x1="640" y1="48" x2="640" y2="486" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 4"/>
<g data-step="1">
<rect x="10" y="60" width="240" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
<text x="130" y="79" text-anchor="middle" font-size="13" fill="currentColor">1 · code_verifier =</text>
<text x="130" y="97" text-anchor="middle" font-size="12" fill="currentColor">chuỗi ngẫu nhiên 43-128 ký tự</text>
</g>
<g data-step="2">
<rect x="10" y="114" width="240" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
<text x="130" y="133" text-anchor="middle" font-size="13" fill="currentColor">2 · code_challenge =</text>
<text x="130" y="151" text-anchor="middle" font-size="12" fill="currentColor">BASE64URL(SHA256(verifier))</text>
</g>
<g data-step="3">
<text x="380" y="182" text-anchor="middle" font-size="13" fill="currentColor">3 · redirect qua trình duyệt → GET /authorize?response_type=code&amp;…</text>
<text x="380" y="198" text-anchor="middle" font-size="12" fill="currentColor" opacity="0.8">&amp;code_challenge=…&amp;code_challenge_method=S256 (+ client_id, redirect_uri, scope, state)</text>
<line x1="122" y1="208" x2="634" y2="208" stroke="currentColor" stroke-opacity="0.65" stroke-width="1.5" marker-end="url(#eng04b-arr)"/>
<rect x="545" y="216" width="190" height="28" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
<text x="640" y="235" text-anchor="middle" font-size="13" fill="currentColor">ghi nhớ challenge</text>
</g>
<g data-step="4">
<text x="510" y="268" text-anchor="middle" font-size="13" fill="currentColor">4 · đăng nhập + đồng ý</text>
<line x1="382" y1="276" x2="634" y2="276" stroke="currentColor" stroke-opacity="0.65" stroke-width="1.5" marker-end="url(#eng04b-arr)"/>
<text x="380" y="302" text-anchor="middle" font-size="13" fill="currentColor">redirect về redirect_uri?code=AUTH_CODE</text>
<line x1="638" y1="310" x2="126" y2="310" stroke="#f59e0b" stroke-width="2" marker-end="url(#eng04b-arr)"/>
<text x="380" y="332" text-anchor="middle" font-size="12" fill="currentColor" opacity="0.8">AUTH_CODE nằm trên URL: có thể lộ qua log, app độc hại bắt redirect</text>
</g>
<g data-step="5">
<text x="380" y="360" text-anchor="middle" font-size="13" fill="currentColor">5 · POST /token  grant_type=authorization_code&amp;code=AUTH_CODE</text>
<text x="380" y="376" text-anchor="middle" font-size="12" fill="currentColor" opacity="0.8">&amp;code_verifier=… (gốc) &amp;redirect_uri=… &amp;client_id=abc</text>
<line x1="122" y1="386" x2="634" y2="386" stroke="#8b5cf6" stroke-width="2" marker-end="url(#eng04b-arr)"/>
</g>
<g data-step="6">
<rect x="470" y="396" width="280" height="46" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
<text x="610" y="415" text-anchor="middle" font-size="13" fill="currentColor">6 · BASE64URL(SHA256(verifier))</text>
<text x="610" y="433" text-anchor="middle" font-size="12" fill="currentColor">?= challenge bước 3 → khớp mới cấp</text>
<text x="380" y="460" text-anchor="middle" font-size="13" fill="currentColor">access token (+ id token, refresh token)</text>
<line x1="638" y1="468" x2="126" y2="468" stroke="#10b981" stroke-width="2" marker-end="url(#eng04b-arr)"/>
</g>
<line x1="16" y1="494" x2="744" y2="494" stroke="currentColor" stroke-opacity="0.15"/>
<text x="380" y="518" text-anchor="middle" font-size="13" fill="currentColor" font-weight="700">Kẻ chặn AUTH_CODE mà không có code_verifier → không đổi được token</text>
<text x="380" y="542" text-anchor="middle" font-size="12" fill="currentColor" opacity="0.65">thời gian đi từ trên xuống dưới</text>
</svg>
<step-note data-step="1">Verifier là bí mật dùng một lần cho riêng lượt đăng nhập này. Nó nằm yên trong app, không đi đâu cho tới bước 5.</step-note>
<step-note data-step="2">Thứ được đem ra ngoài chỉ là hash. SHA-256 một chiều nên ai thấy <code>code_challenge</code> cũng không tính ngược ra verifier.</step-note>
<step-note data-step="3">Request đi qua trình duyệt nên mọi tham số lộ trên URL, kể cả challenge. Không sao: server chỉ cần ghi nhớ nó để so ở bước 6.</step-note>
<step-note data-step="4">Mật khẩu chỉ đi giữa user và authorization server, app không thấy. Code quay về trên URL: đây là chỗ hở PKCE nhắm tới.</step-note>
<step-note data-step="5">Lần đầu tiên verifier rời app, và nó đi trong body của <code>POST /token</code> chứ không qua redirect, nên kẻ nhặt code ở bước 4 không có nó.</step-note>
<step-note data-step="6">Server tự hash verifier rồi so với challenge đã ghi ở bước 3: chỉ bên đã sinh verifier ở bước 1 mới khớp. Chỉ có <code>AUTH_CODE</code> thì bị từ chối.</step-note>
</step-flow>

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

> **Lỗi thường gặp:** Năm 2026 mà vẫn thiết kế SPA/mobile dùng Implicit flow vì "đỡ một bước gọi token endpoint". Implicit đã bị loại khỏi chuẩn; SPA dùng Authorization Code + PKCE, không có ngoại lệ. Tương tự, nếu thấy ai đề xuất ROPC ("cứ post username/password lên token endpoint") — từ chối.

## 5. OIDC — lớp xác thực trên OAuth

OAuth thuần chỉ trả lời "app này được phép làm gì", **không** trả lời "user là ai". **OIDC (OpenID Connect)** bổ sung lớp identity: thêm scope `openid` vào luồng Authorization Code, nhận thêm **ID token**.

| | ID token | Access token |
|---|---|---|
| Định dạng | Luôn là JWT | Thường JWT (RFC 9068) hoặc opaque |
| Dành cho | **Client app** đọc | **Resource server (API)** đọc |
| Nội dung | Danh tính user: `sub`, `email`, `name`, `auth_time` | Quyền truy cập: `scope`, `aud` là API |
| Dùng để | Hiển thị "Xin chào Đan", tạo session phía app | Gắn vào header `Authorization: Bearer ...` khi gọi API |
| Sai lầm điển hình | Gửi ID token cho API để authorize | Decode access token ở client rồi tin nội dung |

> **Ghi nhớ:** ID token = giấy khai sinh (bạn là ai). Access token = vé vào cửa (bạn được vào đâu). API nhận nhầm giấy khai sinh thay vé là lỗ hổng thật ngoài đời.

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

> **Lỗi thường gặp:** Lưu JWT trong `localStorage` của SPA — XSS là mất sạch. Pattern 2025–2026 cho SPA: refresh token trong **HttpOnly Secure cookie** (hoặc kiến trúc BFF — Backend-for-Frontend giữ token hộ), access token chỉ sống trong bộ nhớ.

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

Passkey = cặp khoá bất đối xứng thay cho password, chuẩn **WebAuthn + FIDO2**. Các nền tảng hỗ trợ passkey đồng bộ qua iCloud Keychain / Google Password Manager; các dịch vụ lớn (Google, GitHub, Amazon, Microsoft) đẩy passkey thành phương thức đăng nhập chính.

Có hai loại: **device-bound** giữ khoá trên một authenticator (có thể dùng Secure Enclave/TPM), còn **synced passkey** cho phép nhà cung cấp đồng bộ khoá được mã hoá giữa các thiết bị. Trong cả hai trường hợp, website chỉ nhận public key và chữ ký, không nhận private key.

Cơ chế (chính là ý tưởng public-key ở phần 1):

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 540" role="img" aria-labelledby="fixeng-pass-t fixeng-pass-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="fixeng-pass-t">Passkey đăng ký và đăng nhập</title>
<desc id="fixeng-pass-d">Hai lifeline cố định; chỉ public key và chữ ký gửi tới website. Khoá có thể device-bound hoặc synced.</desc>
<defs><marker id="fixeng-pass-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8z" fill="currentColor"/></marker></defs>
<text x="260" y="24" font-size="15" text-anchor="middle" fill="currentColor">Passkey: website không nhận private key</text><rect x="12" y="42" width="232" height="46" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="128.0" y="70.0" font-size="13" text-anchor="middle" fill="currentColor">Thiết bị / authenticator</text><rect x="324" y="42" width="184" height="46" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="416.0" y="70.0" font-size="13" text-anchor="middle" fill="currentColor">Website / server</text><line x1="128" y1="88" x2="128" y2="460" stroke="currentColor" stroke-dasharray="4 4" opacity="0.4"/><line x1="416" y1="88" x2="416" y2="460" stroke="currentColor" stroke-dasharray="4 4" opacity="0.4"/><g data-step="1"><path d="M416 118 L128 118" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-pass-a)"/><text x="272" y="108" font-size="13" text-anchor="middle" fill="currentColor">Đăng ký: challenge</text><rect x="12" y="136" width="232" height="50" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="128.0" y="166.0" font-size="13" text-anchor="middle" fill="currentColor">Tạo cặp khoá riêng / site</text></g><g data-step="2"><path d="M128 218 L416 218" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-pass-a)"/><text x="272" y="208" font-size="13" text-anchor="middle" fill="currentColor">Public key + credential ID</text><rect x="324" y="234" width="184" height="38" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="416.0" y="258.0" font-size="13" text-anchor="middle" fill="currentColor">Lưu public key</text></g><g data-step="3"><path d="M416 308 L128 308" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-pass-a)"/><text x="272" y="298" font-size="13" text-anchor="middle" fill="currentColor">Đăng nhập: challenge mới</text><rect x="12" y="326" width="232" height="50" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="128.0" y="356.0" font-size="13" text-anchor="middle" fill="currentColor">Sinh trắc/PIN → ký</text></g><g data-step="4"><path d="M128 408 L416 408" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-pass-a)"/><text x="272" y="398" font-size="13" text-anchor="middle" fill="currentColor">Chữ ký gắn với origin</text><rect x="324" y="428" width="184" height="36" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="416.0" y="451.0" font-size="13" text-anchor="middle" fill="currentColor">Verify bằng public key</text></g><text x="260" y="495" font-size="13" text-anchor="middle" fill="currentColor">Device-bound: khoá gắn một authenticator.</text><text x="260" y="518" font-size="13" text-anchor="middle" fill="currentColor">Synced: khoá đồng bộ mã hoá qua nhà cung cấp.</text>
</svg>
<step-note data-step="1">Challenge và origin ràng buộc thao tác với website; mỗi site dùng credential riêng.</step-note>
<step-note data-step="2">Website giữ public key và credential ID. Khoá riêng do authenticator quản lý, có thể device-bound hoặc synced.</step-note>
<step-note data-step="3">Authenticator xác thực người dùng bằng sinh trắc hoặc PIN trước khi ký dữ liệu WebAuthn chứa challenge.</step-note>
<step-note data-step="4">Server kiểm challenge, origin và chữ ký bằng public key đã lưu để chống replay và phishing.</step-note>
</step-flow>

```
Đăng ký:
  1. Server gửi challenge
  2. Thiết bị tạo cặp khoá RIÊNG cho website này
     (private key do authenticator quản lý; device-bound hoặc đồng bộ mã hoá, mở bằng sinh trắc/PIN)
  3. Gửi public key + credential ID cho server lưu

Đăng nhập:
  1. Server gửi challenge ngẫu nhiên
  2. Thiết bị ký challenge bằng private key (sau khi xác thực người dùng, ví dụ sinh trắc/PIN)
  3. Server verify chữ ký bằng public key đã lưu
```

Vì sao **phishing-resistant** — hơn hẳn cả password + TOTP:

- Credential **gắn chặt với origin** (domain): trang giả `arnazon.com` không bao giờ kích hoạt được passkey của `amazon.com`. Người dùng *muốn* bị lừa cũng không gõ nhầm được.
- Server chỉ lưu **public key** → DB bị dump cũng không có gì để crack, không có password reuse.
- Challenge ngẫu nhiên mỗi lần → chống replay.

> **Ghi nhớ:** Password = "shared secret cả hai bên cùng biết" (lộ một bên là toang). Passkey = "chứng minh sở hữu private key mà không gửi nó cho website". Đây là nguyên lý chữ ký số; SigV4 dùng HMAC với shared secret, không phải cặp public/private key.

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
