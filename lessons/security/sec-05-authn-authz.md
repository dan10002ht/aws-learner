# Authentication & Authorization trong app

Hai từ này hay bị gộp làm một, nhưng đây là hai câu hỏi khác nhau:

- **Authentication (AuthN)**: "Bạn là ai?" — chứng minh danh tính (đăng nhập).
- **Authorization (AuthZ)**: "Bạn được làm gì?" — kiểm tra quyền với từng tài nguyên.

Là kỹ sư xây hệ thống, bạn sẽ viết cả hai. Phần lớn lỗ hổng nghiêm trọng nhất trong OWASP Top 10 2021 nằm ở đây: **A01 Broken Access Control** đứng đầu bảng, và **A07 Identification and Authentication Failures**. Bài này đi từ phiên đăng nhập, qua OAuth/OIDC, tới phân quyền và những bẫy phổ biến nhất — luôn kèm ví dụ tấn công cụ thể và code trước/sau.

> Nguyên tắc: AuthN sai thì kẻ tấn công giả danh người khác. AuthZ sai thì kẻ tấn công đã là chính mình nhưng chạm được dữ liệu của người khác. Bug AuthZ khó phát hiện hơn vì request trông hoàn toàn "hợp lệ".

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

> Lỗ hổng: lưu JWT trong `localStorage` "cho tiện". `localStorage` đọc được bằng JavaScript, nên một lỗ XSS bất kỳ là đánh cắp được token đăng nhập của mọi user. Cookie `HttpOnly` thì XSS không đọc nổi. Đừng đổi một lớp phòng thủ lấy chút tiện lợi.

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>So sánh luồng request: Session (stateful) vs JWT (stateless)</title>
  <desc>Hai cột song song. Cột Session: client gửi cookie sid, server phải tra store (Redis/DB) mỗi request để biết user — revoke dễ nhưng cần store dùng chung khi scale. Cột JWT: client gửi token tự chứa, server chỉ verify chữ ký không cần store — scale dễ nhưng khó revoke ngay.</desc>
  <text x="360" y="24" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">Một request đã đăng nhập: Session vs JWT</text>
  <g>
    <rect x="16" y="44" width="336" height="296" rx="10" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="184" y="68" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">Session (stateful)</text>
    <rect x="36" y="82" width="120" height="40" rx="8" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.35"/>
    <text x="96" y="106" font-size="12" text-anchor="middle" fill="currentColor">Client</text>
    <rect x="212" y="82" width="120" height="40" rx="8" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.35"/>
    <text x="272" y="106" font-size="12" text-anchor="middle" fill="currentColor">Server</text>
    <line x1="156" y1="140" x2="212" y2="140" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#ar)"/>
    <text x="184" y="135" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">Cookie: sid=abc</text>
    <rect x="212" y="160" width="120" height="48" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="272" y="180" font-size="10.5" text-anchor="middle" fill="currentColor">tra STORE</text>
    <text x="272" y="196" font-size="10.5" text-anchor="middle" fill="currentColor">(Redis/DB)</text>
    <line x1="272" y1="208" x2="272" y2="234" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#ar)"/>
    <rect x="212" y="236" width="120" height="34" rx="8" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="272" y="257" font-size="10.5" text-anchor="middle" fill="currentColor">→ biết user 42</text>
    <text x="32" y="296" font-size="10.5" fill="currentColor" opacity="0.85">+ Revoke tức thì (xoá khỏi store)</text>
    <text x="32" y="314" font-size="10.5" fill="currentColor" opacity="0.85">− Scale cần store dùng chung</text>
  </g>
  <g>
    <rect x="368" y="44" width="336" height="296" rx="10" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="536" y="68" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">JWT (stateless)</text>
    <rect x="388" y="82" width="120" height="40" rx="8" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.35"/>
    <text x="448" y="106" font-size="12" text-anchor="middle" fill="currentColor">Client</text>
    <rect x="564" y="82" width="120" height="40" rx="8" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.35"/>
    <text x="624" y="106" font-size="12" text-anchor="middle" fill="currentColor">Server</text>
    <line x1="508" y1="140" x2="564" y2="140" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#ar)"/>
    <text x="536" y="135" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">Bearer: token tự chứa</text>
    <rect x="564" y="160" width="120" height="48" rx="8" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="624" y="180" font-size="10.5" text-anchor="middle" fill="currentColor">verify CHỮ KÝ</text>
    <text x="624" y="196" font-size="10.5" text-anchor="middle" fill="currentColor">(không tra store)</text>
    <line x1="624" y1="208" x2="624" y2="234" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#ar)"/>
    <rect x="564" y="236" width="120" height="34" rx="8" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="624" y="257" font-size="10.5" text-anchor="middle" fill="currentColor">→ đọc sub=42</text>
    <text x="384" y="296" font-size="10.5" fill="currentColor" opacity="0.85">+ Scale dễ, không cần store</text>
    <text x="384" y="314" font-size="10.5" fill="currentColor" opacity="0.85">− Khó revoke ngay (cần denylist)</text>
  </g>
  <defs>
    <marker id="ar" markerWidth="9" markerHeight="9" refX="7" refY="3.2" orient="auto"><path d="M0 0 L7 3.2 L0 6.4 z" fill="currentColor"/></marker>
  </defs>
</svg>

Lời khuyên thực dụng cho hầu hết web app: **dùng session + cookie HttpOnly**. Chỉ chọn JWT khi thật sự cần stateless (nhiều service, không có store chung). Nếu dùng JWT cho trình duyệt, vẫn nên đặt nó trong cookie `HttpOnly`, không phải `localStorage`.

## 2. Validate JWT cho đúng

JWT chỉ an toàn khi verify đúng. Đây là vùng có nhiều lỗ hổng kinh điển.

> Lỗ hổng `alg: none`: kẻ tấn công sửa header thành `{"alg":"none"}` và bỏ chữ ký. Thư viện cũ/cấu hình lỏng sẽ chấp nhận token "không cần chữ ký" → giả mạo bất kỳ user nào.

> Lỗ hổng nhầm RS256 → HS256: token thật ký bằng RSA (RS256, private key). Kẻ tấn công đổi header sang HS256 rồi ký HMAC bằng **public key** (vốn ai cũng biết). Nếu code verify "tự suy alg từ token", nó dùng public key làm HMAC secret → chữ ký hợp lệ. Luôn **cố định danh sách thuật toán cho phép**.

Code sai (Node.js):

```js
// ✗ Tin tưởng alg trong token, không kiểm exp/aud/iss
const payload = jwt.decode(token);        // decode KHÔNG verify chữ ký!
if (payload.sub) grantAccess(payload.sub); // ai cũng vào được
```

Code đúng (Node.js, jsonwebtoken):

```js
// ✓ Verify chữ ký + ép thuật toán + kiểm claim
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

> Lỗ hổng authorization code interception: app gửi user qua trình duyệt để lấy `code`, rồi đổi `code` lấy token. Trên mobile/SPA, một app độc hại có thể chặn `code` ở bước redirect và đổi lấy token. PKCE chặn điều này.

PKCE thêm một bí mật dùng-một-lần do client tự sinh:

<step-flow>
<svg viewBox="0 0 760 580" role="img" aria-labelledby="sec5a-t sec5a-d" style="width:100%;height:auto">
<title id="sec5a-t">OAuth 2.1 Authorization Code + PKCE: kẻ tấn công chặn được code nhưng thiếu verifier</title>
<desc id="sec5a-d">Sequence ba cột: kẻ tấn công (app độc hại), Client (app) và Auth Server. Client sinh code_verifier ngẫu nhiên, tính challenge = SHA256(verifier), gọi /authorize kèm code_challenge và method=S256; server lưu challenge cạnh code rồi trả authorization code qua redirect. Kẻ tấn công chặn được code ở bước redirect và đem đổi ở /token nhưng không có verifier nên bị từ chối: code vô dụng. Client gọi /token kèm code và verifier gốc; server hash verifier so với challenge đã lưu, khớp mới cấp access token (cùng refresh token, id token).</desc>
<defs>
<marker id="sec5a-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker>
</defs>
<rect x="5" y="15" width="190" height="32" rx="8" fill="#f43f5e" fill-opacity="0.16"/>
<text x="100" y="36" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">Kẻ tấn công (app độc hại)</text>
<rect x="295" y="15" width="130" height="32" rx="8" fill="#3b82f6" fill-opacity="0.16"/>
<text x="360" y="36" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">Client (app)</text>
<rect x="570" y="15" width="140" height="32" rx="8" fill="#10b981" fill-opacity="0.16"/>
<text x="640" y="36" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">Auth Server</text>
<line x1="100" y1="47" x2="100" y2="520" stroke="currentColor" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="4 4"/>
<line x1="360" y1="47" x2="360" y2="520" stroke="currentColor" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="4 4"/>
<line x1="640" y1="47" x2="640" y2="520" stroke="currentColor" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="4 4"/>
<g data-step="1">
<rect x="230" y="60" width="260" height="46" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
<text x="360" y="79" text-anchor="middle" font-size="12" fill="currentColor">sinh code_verifier (ngẫu nhiên)</text>
<text x="360" y="97" text-anchor="middle" font-size="12" fill="currentColor">challenge = SHA256(verifier)</text>
</g>
<g data-step="2">
<text x="500" y="126" text-anchor="middle" font-size="12" fill="currentColor">/authorize … &amp;code_challenge=hash</text>
<text x="500" y="142" text-anchor="middle" font-size="12" fill="currentColor">&amp;method=S256</text>
<line x1="362" y1="150" x2="636" y2="150" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#sec5a-arrow)"/>
<rect x="560" y="160" width="160" height="28" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="640" y="179" text-anchor="middle" font-size="12" fill="currentColor">lưu challenge</text>
</g>
<g data-step="3">
<text x="500" y="214" text-anchor="middle" font-size="12" fill="currentColor">trả về authorization code (redirect)</text>
<line x1="638" y1="222" x2="364" y2="222" stroke="#f59e0b" stroke-width="2" marker-end="url(#sec5a-arrow)"/>
<text x="230" y="246" text-anchor="middle" font-size="12" fill="currentColor">chặn được code</text>
<line x1="358" y1="254" x2="104" y2="254" stroke="#f43f5e" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#sec5a-arrow)"/>
</g>
<g data-step="4">
<text x="370" y="286" text-anchor="middle" font-size="12" fill="currentColor">/token &amp;code=code, KHÔNG có verifier</text>
<line x1="102" y1="294" x2="636" y2="294" stroke="#f43f5e" stroke-width="2" marker-end="url(#sec5a-arrow)"/>
<rect x="548" y="304" width="184" height="28" rx="8" fill="#f43f5e" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="640" y="323" text-anchor="middle" font-size="12" fill="currentColor">không có verifier khớp</text>
<text x="370" y="352" text-anchor="middle" font-size="12" fill="currentColor">từ chối, không cấp token</text>
<line x1="638" y1="360" x2="104" y2="360" stroke="#f43f5e" stroke-width="2" marker-end="url(#sec5a-arrow)"/>
<rect x="30" y="370" width="140" height="28" rx="8" fill="#f43f5e" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="100" y="389" text-anchor="middle" font-size="12" fill="currentColor">code → vô dụng</text>
</g>
<g data-step="5">
<text x="500" y="418" text-anchor="middle" font-size="12" fill="currentColor">/token &amp;code=code</text>
<text x="500" y="434" text-anchor="middle" font-size="12" fill="currentColor">&amp;code_verifier=verifier gốc</text>
<line x1="362" y1="442" x2="636" y2="442" stroke="#8b5cf6" stroke-width="2" marker-end="url(#sec5a-arrow)"/>
<rect x="540" y="450" width="200" height="44" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="640" y="468" text-anchor="middle" font-size="12" fill="currentColor">hash(verifier) == challenge?</text>
<text x="640" y="485" text-anchor="middle" font-size="12" fill="currentColor">khớp → cấp token</text>
</g>
<g data-step="6">
<text x="500" y="506" text-anchor="middle" font-size="12" fill="currentColor">access token (+ refresh, id token)</text>
<line x1="638" y1="514" x2="364" y2="514" stroke="#10b981" stroke-width="2" marker-end="url(#sec5a-arrow)"/>
</g>
<text x="380" y="550" text-anchor="middle" font-size="12" opacity="0.8" fill="currentColor">Chỉ challenge (bản hash) đi ra trước; verifier chỉ xuất hiện ở /token,</text>
<text x="380" y="568" text-anchor="middle" font-size="12" opacity="0.8" fill="currentColor">nên chặn được code ở redirect vẫn không đổi được ra token.</text>
</svg>
<step-note data-step="1">Client tự sinh bí mật dùng-một-lần cho riêng lượt đăng nhập này. Verifier nằm yên trong client; thứ đem ra ngoài chỉ là bản hash của nó.</step-note>
<step-note data-step="2">Request này đi qua trình duyệt nên ai cũng có thể thấy <code>code_challenge</code>. Không sao: SHA-256 là hàm một chiều, có hash không tính ngược ra được verifier.</step-note>
<step-note data-step="3">Đây là chỗ hở mà PKCE nhắm tới: trên mobile/SPA, app độc hại có thể nhận được redirect và lấy <code>code</code>. Không có PKCE, chừng đó là đủ để đổi ra token.</step-note>
<step-note data-step="4">Server đòi <code>code_verifier</code> có hash khớp challenge đã lưu cùng code. Kẻ tấn công chỉ có code, không có verifier, nên lượt đổi bị từ chối.</step-note>
<step-note data-step="5">Client gửi kèm verifier gốc. Server tự hash rồi so: chỉ bên đã sinh verifier ở bước 1 mới qua được phép so này.</step-note>
<step-note data-step="6">Token chỉ về tay client thật. Bắt chước được code chưa đủ, phải có cả bí mật chưa từng đi qua redirect.</step-note>
</step-flow>

Các tham số phòng thủ bắt buộc khác:

- `state`: chuỗi ngẫu nhiên, chống CSRF trên bước callback (so khi quay về).
- `redirect_uri`: server phải **so khớp tuyệt đối** với danh sách đăng ký, không dùng wildcard. Đây là nguồn của vô số lỗ open redirect → đánh cắp token.
- `nonce` (OIDC): chống replay ID token.

## 4. Refresh token rotation

Access token sống ngắn để giảm thiệt hại nếu bị lộ. Để user không phải đăng nhập lại liên tục, ta dùng **refresh token** (sống dài) để xin access token mới.

> Lỗ hổng: refresh token bị đánh cắp. Nó sống lâu, nên kẻ tấn công cứ thế xin access token mới mãi mà không ai biết. **Rotation** biến việc đánh cắp thành phát hiện được.

Cơ chế **rotation + reuse detection**:

<step-flow>
<svg viewBox="0 0 760 600" role="img" aria-labelledby="sec5b-t sec5b-d" style="width:100%;height:auto">
<title id="sec5b-t">Refresh token rotation và reuse detection</title>
<desc id="sec5b-d">Sequence ba cột: người dùng thật, server, kẻ tấn công. Đăng nhập cấp RT1 thuộc family F; RT1 bị lộ sang kẻ tấn công. Mỗi lần /refresh, server đánh dấu token cũ đã dùng và cấp access token mới cùng refresh token mới: RT1 đổi thành RT2, RT2 thành RT3, đều family F. Khi RT1 đã dùng tái xuất hiện từ kẻ tấn công, server thấy RT1.used == true, phát hiện reuse và thu hồi toàn bộ family F gồm cả RT2, RT3: cả người dùng thật lẫn kẻ tấn công đều mất quyền, người dùng thật đăng nhập lại.</desc>
<defs>
<marker id="sec5b-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker>
</defs>
<rect x="30" y="15" width="160" height="32" rx="8" fill="#3b82f6" fill-opacity="0.16"/>
<text x="110" y="36" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">Người dùng thật</text>
<rect x="315" y="15" width="130" height="32" rx="8" fill="#10b981" fill-opacity="0.16"/>
<text x="380" y="36" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">Server</text>
<rect x="580" y="15" width="140" height="32" rx="8" fill="#f43f5e" fill-opacity="0.16"/>
<text x="650" y="36" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">Kẻ tấn công</text>
<line x1="110" y1="47" x2="110" y2="520" stroke="currentColor" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="4 4"/>
<line x1="380" y1="47" x2="380" y2="520" stroke="currentColor" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="4 4"/>
<line x1="650" y1="47" x2="650" y2="520" stroke="currentColor" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="4 4"/>
<g data-step="1">
<text x="245" y="72" text-anchor="middle" font-size="12" fill="currentColor">đăng nhập: access + RT1</text>
<line x1="378" y1="80" x2="114" y2="80" stroke="#10b981" stroke-width="2" marker-end="url(#sec5b-arrow)"/>
<rect x="292" y="90" width="176" height="28" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="380" y="109" text-anchor="middle" font-size="12" fill="currentColor">RT1 · family F · chưa dùng</text>
</g>
<g data-step="2">
<text x="380" y="146" text-anchor="middle" font-size="12" fill="currentColor">RT1 bị lộ (kẻ tấn công giữ một bản sao)</text>
<line x1="112" y1="154" x2="646" y2="154" stroke="#f43f5e" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#sec5b-arrow)"/>
</g>
<g data-step="3">
<text x="245" y="182" text-anchor="middle" font-size="12" fill="currentColor">/refresh RT1</text>
<line x1="112" y1="190" x2="376" y2="190" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#sec5b-arrow)"/>
<rect x="292" y="198" width="176" height="28" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="380" y="217" text-anchor="middle" font-size="12" fill="currentColor">RT1 đánh dấu đã dùng</text>
<text x="245" y="246" text-anchor="middle" font-size="12" fill="currentColor">access mới + RT2 (family F)</text>
<line x1="378" y1="254" x2="114" y2="254" stroke="#10b981" stroke-width="2" marker-end="url(#sec5b-arrow)"/>
</g>
<g data-step="4">
<text x="245" y="282" text-anchor="middle" font-size="12" fill="currentColor">/refresh RT2</text>
<line x1="112" y1="290" x2="376" y2="290" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#sec5b-arrow)"/>
<rect x="292" y="298" width="176" height="28" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="380" y="317" text-anchor="middle" font-size="12" fill="currentColor">RT2 đánh dấu đã dùng</text>
<text x="245" y="346" text-anchor="middle" font-size="12" fill="currentColor">access mới + RT3 (family F)</text>
<line x1="378" y1="354" x2="114" y2="354" stroke="#10b981" stroke-width="2" marker-end="url(#sec5b-arrow)"/>
</g>
<g data-step="5">
<text x="515" y="382" text-anchor="middle" font-size="12" fill="currentColor">/refresh RT1 (đã dùng)</text>
<line x1="648" y1="390" x2="384" y2="390" stroke="#f43f5e" stroke-width="2" marker-end="url(#sec5b-arrow)"/>
<rect x="285" y="398" width="190" height="44" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="380" y="416" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">RT1.used == true?</text>
<text x="380" y="433" text-anchor="middle" font-size="12" fill="currentColor">→ phát hiện REUSE</text>
</g>
<g data-step="6">
<rect x="270" y="452" width="220" height="44" rx="8" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="380" y="470" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">revoke family F</text>
<text x="380" y="487" text-anchor="middle" font-size="12" fill="currentColor">RT1, RT2, RT3 đều chết</text>
<text x="190" y="504" text-anchor="middle" font-size="12" fill="currentColor">401: đăng nhập lại</text>
<line x1="268" y1="512" x2="114" y2="512" stroke="#8b5cf6" stroke-width="2" marker-end="url(#sec5b-arrow)"/>
<text x="570" y="504" text-anchor="middle" font-size="12" fill="currentColor">401</text>
<line x1="492" y1="512" x2="646" y2="512" stroke="#8b5cf6" stroke-width="2" marker-end="url(#sec5b-arrow)"/>
</g>
<text x="380" y="548" text-anchor="middle" font-size="12" opacity="0.85" fill="currentColor">RT2, RT3 cùng family F cũng bị thu hồi → cả người dùng thật lẫn kẻ tấn công đều mất quyền.</text>
<text x="380" y="570" text-anchor="middle" font-size="12" opacity="0.75" fill="currentColor">Người dùng thật đăng nhập lại an toàn; việc đánh cắp trở thành phát hiện được.</text>
</svg>
<step-note data-step="1">Mỗi lần đăng nhập mở một <code>family</code> mới. Mọi refresh token xoay ra từ lần đăng nhập này đều mang chung <code>family_id</code>, để sau này thu hồi được cả chuỗi bằng một lệnh.</step-note>
<step-note data-step="2">Không ai nhận ra lúc token bị lộ. Không có rotation, bản sao RT1 cứ thế xin access token mới mãi vì refresh token sống dài.</step-note>
<step-note data-step="3">Mỗi refresh token chỉ tiêu được một lần: server ghi <code>used = True</code> trước khi cấp RT2. Từ giây này, RT1 trong tay bất kỳ ai cũng là token cũ.</step-note>
<step-note data-step="4">Chuỗi tiếp tục xoay, mỗi mắt xích cũ bị đánh dấu. Người dùng thật luôn cầm token mới nhất, nên với họ không có gì thay đổi.</step-note>
<step-note data-step="5">Một token đã dùng mà quay lại thì chỉ có thể là có hai bên cùng cầm nó. Server không cần biết bên nào là kẻ gian. Đảo thứ tự cũng vậy: hắn đổi RT1 trước thì người dùng thật gửi RT1 sau sẽ là lần reuse.</step-note>
<step-note data-step="6">Vì không phân biệt được ai là ai, server khoá cả family qua <code>revoke_family</code>. Token mới nhất trong tay bất kỳ bên nào cũng mất hiệu lực; người dùng thật chỉ phải đăng nhập lại.</step-note>
</step-flow>

```python
# ✓ Pseudocode phía server cho /refresh
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

> Lỗ hổng: lưu mật khẩu plaintext, hoặc hash bằng MD5/SHA-256 "thường". SHA tính cực nhanh → GPU dò hàng tỉ hash/giây. Khi DB rò rỉ, mọi mật khẩu yếu bị crack trong vài phút.

Dùng **hàm hash chuyên cho mật khẩu**: chậm có chủ đích, tốn bộ nhớ, có salt tự động.

| Thuật toán | Khi nào dùng |
|---|---|
| **Argon2id** | Lựa chọn số 1 hiện nay (OWASP khuyến nghị); chống cả GPU lẫn side-channel |
| **bcrypt** | Vẫn rất ổn, phổ biến; lưu ý giới hạn 72 byte đầu vào |
| **scrypt / PBKDF2** | Khi môi trường bắt buộc (FIPS); PBKDF2 cần iteration cao |

```python
# ✓ Argon2id (thư viện argon2-cffi)
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
// ✓ bcrypt (Node.js) — cost 12 trở lên
const hash = await bcrypt.hash(password, 12);
const ok   = await bcrypt.compare(password, hash); // KHÔNG tự so chuỗi
```

Thêm: kiểm mật khẩu rò rỉ qua Have I Been Pwned (k-anonymity API), không áp luật đổi mật khẩu định kỳ vô nghĩa (NIST đã bỏ), chống brute-force bằng rate limit + lockout có backoff.

### MFA và passkeys

MFA kết hợp các yếu tố: **biết** (mật khẩu), **có** (điện thoại/khóa), **là** (sinh trắc).

> Lỗ hổng SMS OTP: dễ bị SIM-swap và phishing thời gian thực (kẻ tấn công dựng trang giả, user nhập OTP, chúng chuyển tiếp ngay). SMS tốt hơn không có gì, nhưng đừng coi là mạnh.

Thứ tự ưu tiên thực dụng:

1. **Passkeys / WebAuthn (FIDO2)** — mạnh nhất, **chống phishing tận gốc**.
2. TOTP (Google Authenticator) — ổn, nhưng vẫn phish được OTP.
3. SMS OTP — phương án cuối.

**Passkeys** dùng public-key cryptography: thiết bị giữ private key (trong Secure Enclave/TPM), server chỉ giữ public key. Đăng nhập là ký một challenge bằng sinh trắc.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Passkey / WebAuthn: đăng ký và đăng nhập challenge-response</title>
  <desc>Sequence diagram hai cột Thiết bị và Server. Khi đăng ký, thiết bị sinh cặp khoá và gửi public key cho server lưu. Khi đăng nhập, server gửi challenge ngẫu nhiên, thiết bị mở private key bằng vân tay và ký challenge kèm origin, gửi chữ ký về; server verify bằng public key đã lưu. Vì chữ ký gắn với origin nên trang phishing không lấy được chữ ký hợp lệ.</desc>
  <text x="360" y="22" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">Passkey / WebAuthn — challenge-response</text>
  <text x="150" y="48" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Thiết bị</text>
  <text x="570" y="48" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Server</text>
  <line x1="150" y1="58" x2="150" y2="404" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
  <line x1="570" y1="58" x2="570" y2="404" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
  <rect x="22" y="66" width="676" height="22" rx="6" fill="#3b82f6" fill-opacity="0.14"/>
  <text x="36" y="81" font-size="11" font-weight="700" fill="currentColor">Đăng ký (1 lần)</text>
  <rect x="36" y="96" width="228" height="40" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="150" y="112" font-size="10.5" text-anchor="middle" fill="currentColor">sinh cặp khoá (private giữ trong</text>
  <text x="150" y="127" font-size="10.5" text-anchor="middle" fill="currentColor">Secure Enclave/TPM)</text>
  <line x1="150" y1="152" x2="570" y2="152" stroke="currentColor" stroke-opacity="0.65" marker-end="url(#wa)"/>
  <text x="360" y="146" font-size="10.5" text-anchor="middle" fill="currentColor">gửi PUBLIC key</text>
  <rect x="456" y="162" width="228" height="30" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="570" y="182" font-size="10.5" text-anchor="middle" fill="currentColor">lưu public key của user</text>
  <rect x="22" y="206" width="676" height="22" rx="6" fill="#8b5cf6" fill-opacity="0.16"/>
  <text x="36" y="221" font-size="11" font-weight="700" fill="currentColor">Đăng nhập (mỗi lần)</text>
  <line x1="570" y1="248" x2="150" y2="248" stroke="currentColor" stroke-opacity="0.65" marker-end="url(#wa)"/>
  <text x="360" y="242" font-size="10.5" text-anchor="middle" fill="currentColor">gửi challenge (ngẫu nhiên)</text>
  <rect x="36" y="262" width="228" height="44" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="150" y="282" font-size="10.5" text-anchor="middle" fill="currentColor">mở bằng vân tay → ký challenge</text>
  <text x="150" y="298" font-size="10.5" text-anchor="middle" fill="currentColor">+ origin bằng PRIVATE key</text>
  <line x1="150" y1="324" x2="570" y2="324" stroke="currentColor" stroke-opacity="0.65" marker-end="url(#wa)"/>
  <text x="360" y="318" font-size="10.5" text-anchor="middle" fill="currentColor">gửi chữ ký</text>
  <rect x="456" y="334" width="228" height="30" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="570" y="354" font-size="10.5" text-anchor="middle" fill="currentColor">verify bằng public key đã lưu</text>
  <text x="360" y="392" font-size="10.5" text-anchor="middle" fill="#f59e0b" opacity="0.95">Chữ ký gắn với ORIGIN → trang phishing examp1e.com không có chữ ký hợp lệ.</text>
  <defs>
    <marker id="wa" markerWidth="9" markerHeight="9" refX="7" refY="3.2" orient="auto"><path d="M0 0 L7 3.2 L0 6.4 z" fill="currentColor"/></marker>
  </defs>
</svg>

Vì sao chống phishing: chữ ký gắn chặt với **origin** (tên miền thật). Trang giả `examp1e.com` không lấy được chữ ký hợp lệ cho `example.com`. Không có "mã" nào để user lỡ tay nhập vào trang giả. Dùng thư viện như SimpleWebAuthn (server + browser) thay vì tự code.

## 6. Mô hình phân quyền: RBAC vs ABAC

| | RBAC (theo vai trò) | ABAC (theo thuộc tính) |
|---|---|---|
| Quyết định dựa trên | Role của user (admin, editor) | Thuộc tính (owner, phòng ban, giờ, IP, nhãn dữ liệu) |
| Ưu | Đơn giản, dễ audit | Linh hoạt, biểu đạt được "chỉ chủ sở hữu" |
| Nhược | "Bùng nổ role" khi quy tắc tinh vi | Khó debug, dễ viết policy sai |
| Khi dùng | Đa số app | Multi-tenant, quy tắc theo ngữ cảnh |

Thực tế hay kết hợp: RBAC cho thao tác thô (ai được vào màn hình Admin), ABAC cho dữ liệu tinh (user này có sở hữu *bản ghi cụ thể* này không).

> Nguyên tắc: phân quyền phải kiểm tra ở **server, cho từng tài nguyên cụ thể**, ngay trước khi truy cập dữ liệu. Ẩn nút trên UI không phải là bảo mật — attacker gọi API trực tiếp.

## 7. Bẫy phân quyền: BOLA và BFLA

Đây là hai lỗi AuthZ phổ biến nhất theo OWASP API Security, và là phần lớn của A01.

### BOLA — Broken Object Level Authorization (IDOR)

> Lỗ hổng: API tin vào ID trong request mà không kiểm "object này có thuộc về user gọi không". User A đổi `/api/invoices/1001` thành `1002` và đọc hóa đơn của user B.

```js
// ✗ BOLA: lấy theo ID, không kiểm chủ sở hữu
app.get("/api/invoices/:id", auth, async (req, res) => {
  const inv = await db.invoice.findById(req.params.id);
  res.json(inv);                       // ai có token cũng đọc được MỌI hóa đơn
});
```

```js
// ✓ Gắn truy vấn vào chính user, hoặc kiểm ownership rõ ràng
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

> Lỗ hổng: endpoint quản trị không kiểm role. UI ẩn nút "Xóa user" với user thường, nhưng `DELETE /api/admin/users/55` vẫn chạy nếu gọi trực tiếp.

```python
# ✗ BFLA: chỉ kiểm đăng nhập, không kiểm quyền chức năng
@app.delete("/api/admin/users/{uid}")
def delete_user(uid, current=Depends(auth)):
    db.delete_user(uid)               # bất kỳ user đăng nhập nào cũng gọi được

# ✓ Ép quyền theo chức năng, mặc định từ chối
@app.delete("/api/admin/users/{uid}")
def delete_user(uid, current=Depends(require_role("admin"))):
    db.delete_user(uid)
```

> Nguyên tắc: **deny by default**. Mỗi route có một guard quyền tường minh; không có guard thì route bị chặn. Đừng để "quên thêm middleware" trở thành lỗ hổng.

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
