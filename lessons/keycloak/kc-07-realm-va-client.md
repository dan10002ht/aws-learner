# Bài 7 — Realm và client

## 1. Mục tiêu

Sau bài này bạn có thể:

- Liệt kê thứ thuộc riêng một realm (issuer, khoá, user, client, chính sách) và giải thích vì sao token realm A vô dụng ở realm B.
- Quyết định một app là client **public** hay **confidential** bằng đúng một câu hỏi, và kể ra 4 việc client public không làm được trên Keycloak 26.8.1.
- Thay một client bearer-only cũ bằng cấu hình tương đương còn được hỗ trợ, bằng `kcadm.sh`.
- Chọn phương thức xác thực client (secret qua Basic/POST, signed JWT, X509/mTLS) theo câu hỏi "kẻ tấn công lấy được gì khi đọc một request".
- Cho một danh sách Valid Redirect URIs, phán từng `redirect_uri` qua hay trượt, và chỉ ra chỗ wildcard mở đường cho cuộc tấn công đánh cắp code.
- Bắt PKCE S256 cho một client public, và chứng minh bằng `curl` rằng trước khi đặt thì Keycloak cấp token không cần PKCE.

---

## 2. Triệu chứng

Một SaaS B2B đưa SPA lên Keycloak. Dev tạo client bằng script:

```bash
kc create clients -r demo -s clientId=spa-nopkce -s publicClient=true -s standardFlowEnabled=true \
   -s 'redirectUris=["http://localhost:3000/callback"]' -i
```

Frontend dùng thư viện OIDC có PKCE, login chạy, mọi người hài lòng. Rồi bản pentest gửi về một dòng:

> Authorization code flow của client `spa-nopkce` hoàn tất khi request **không có** `code_challenge`. Code đổi được thành access token.

Dev cãi: "Client public mà, RFC 9700 nói public client MUST dùng PKCE, Keycloak 26 chắc chắn bắt." Discovery của realm ghi `code_challenge_methods_supported: ["plain","S256"]`. Anh chạy lại kịch bản pentest: GET `/auth` không có `code_challenge`, đăng nhập, lấy `code` dài 98 ký tự trên URL callback, POST `/token` không có `code_verifier`. Response có `access_token`.

Cùng realm đó, client `spa` của team khác bị chặn ngay ở bước đầu: `error=invalid_request&error_description=Missing parameter: code_challenge_method`.

Hai client cùng là public, cùng realm, cùng phiên bản server, hai hành vi ngược nhau.

---

## ⏸ Dừng lại — đoán trước #1

Vì sao `spa-nopkce` được cấp token mà không cần PKCE?

```
(a) Lỗi của Keycloak: RFC 9700 bắt buộc PKCE cho public client, server phải tự chặn
(b) Discovery có "plain", nên thiếu challenge thì Keycloak tự coi như dùng plain
(c) Keycloak bắt PKCE theo cấu hình từng client; trường PKCE method để trống thì không bắt
(d) Keycloak bỏ qua PKCE vì redirect_uri đã khớp chính xác, coi như đủ an toàn
```

Chọn một trước khi đọc tiếp. Câu (d) đáng nghĩ: nó sai, nhưng mục 3.5 sẽ cho thấy nó sai theo một cách thú vị.

---

## 3. Lý thuyết

### 3.1 Đáp án, và vì sao phải lùi về tận realm

Đáp án là **(c)**. Docs Server Admin nói về trường PKCE method để trống: *"Keycloak does not apply PKCE unless the client sends the appropriate PKCE parameters to Keycloak authorization endpoint. So PKCE is still possible to use, but it is not required."* Chọn S256 thì khác: *"Keycloak applies to the client PKCE whose code challenge method is S256."* Client `spa` của team kia có attribute `pkce.code.challenge.method=S256`, client `spa-nopkce` không có.

RFC 9700 nói đúng: *"Public clients MUST use PKCE [RFC7636] to this end"*. Nhưng câu đó ràng buộc **client**, và Keycloak để việc thực thi cho từng bản đăng ký client. Phương án (a) nhầm người phải tuân thủ với người phải kiểm. Phương án (b) sai vì thiếu challenge thì không có gì để so, Keycloak không bịa ra một challenge.

Vậy "an toàn hay không" không nằm ở phiên bản server mà nằm ở **từng client**. Muốn biết vì sao hai client cùng loại lại khác nhau, phải biết client là gì, và trước đó, nó sống ở đâu. Câu trả lời là realm.

**Realm** là một không gian cấu hình và danh tính độc lập bên trong một server Keycloak: nó có issuer riêng, khoá ký riêng, user riêng, client riêng. Nó giải bài toán: một cụm Keycloak phục vụ nhiều nhóm người dùng mà token, user và chính sách của nhóm này không rò sang nhóm kia.

Cách ly không phải một cờ "isolated". Nó đến từ ba thứ cụ thể, đọc được trên lab:

1. **Mọi endpoint nằm dưới `/realms/{realm-name}/`**: discovery, auth, token, certs. Discovery của realm `demo` trả `"issuer": "http://localhost:8080/realms/demo"`.
2. **Khoá thuộc về realm.** Endpoint certs *"returns the public keys enabled by the realm, encoded as a JSON Web Key (JWK)."*
3. **Cấu hình bảo mật nằm trên object realm**: `kc get realms/demo` trả trên cùng một object `accessTokenLifespan`, `ssoSessionIdleTimeout`, `passwordPolicy`, `bruteForceProtected`, `otpPolicyAlgorithm`. Hai realm có thể có hai chính sách mật khẩu khác hẳn nhau.

> **Đo trên lab.** Keycloak 26.8.1 `start-dev`, OpenJDK 24.0.2, Mac mini Apple M4. `kc get keys -r demo` liệt kê **4 key active**: RS256 (sig), RSA-OAEP (enc), HS512 (OCT, sig), AES (OCT, enc). JWKS công khai chỉ có 2 key RSA; hai key đối xứng không bao giờ ra JWKS. Realm mới còn tự sinh 6 client built-in: `account`, `account-console`, `admin-cli`, `broker`, `realm-management`, `security-admin-console`, và user mới nhận realm role `default-roles-demo`.

Hệ quả "token realm A vô dụng ở realm B" đến từ hai dữ kiện: OIDC Discovery yêu cầu `issuer` trùng `iss`, *"This also MUST be identical to the iss Claim value in ID Tokens issued from this Issuer."*, và khoá ký là của từng realm.

> **Đo trên lab (critic, 26.8.1).** Access token của alice lấy ở realm `demo` qua `spa`, gọi `userinfo` của chính `demo`: `HTTP 200`. Cùng token gọi `/realms/b/protocol/openid-connect/userinfo`: `HTTP 401`, log `type="USER_INFO_REQUEST_ERROR", realmName="b", ... error="invalid_token", reason="Key not found"`. Lý do ghi là không tìm thấy khoá theo `kid` trong realm `b`, không phải `iss` lệch.

Hai chỗ cách ly **không** bảo vệ bạn:

- Mỗi realm có `admin-cli` riêng, và đó là client duy nhất trong 6 client built-in có `directAccessGrantsEnabled=true`, `publicClient=true`. Trên lab, password grant qua `admin-cli` của realm `demo` trả 200 và access token cho `alice`, không cần secret. Realm tách user khỏi realm khác, nhưng không tắt hộ bạn cửa này trong chính realm của bạn.
- Ranh giới realm không chặn admin của `master`: role `admin` ở đó là superuser mọi realm (bài 6).

### 3.2 Client: một bản đăng ký, và câu hỏi đầu tiên là "giữ được bí mật không"

**Client** trong Keycloak là bản đăng ký của một ứng dụng trong một realm: `client_id`, các URL được phép quay về, các grant được bật, cách nó chứng minh danh tính. Nó giải bài toán: Keycloak phải biết **ai đang xin token** và **được gửi token đi đâu**, trước khi cấp bất cứ thứ gì.

Docs chia client theo đúng một công tắc, Client authentication: *"Clients with the client authentication enabled are referred as confidential clients."* Tắt đi thì là public client.

Nguyên nhân gốc của cách chia này không phải loại app (web, mobile, SPA) mà là **mã của client chạy trên máy của ai**. Bí mật chỉ còn là bí mật nếu nó nằm ở nơi người dùng cuối không đọc được. Code của SPA được tải về trình duyệt; app mobile là binary trên điện thoại người lạ. Mọi chuỗi bạn nhúng vào đó, ai cũng mở DevTools hoặc giải nén ra được. Docs nói thẳng: *"HTML5/JavaScript clients have to be public clients because there is no way to securely transmit the client secret to HTML5/JavaScript clients."*

Backend chạy trên server của bạn thì giữ được secret trong biến môi trường hay secret manager. Đó là confidential client.

Mọi tính năng cần "Keycloak tin rằng đây đúng là app X" vì thế đóng với client public:

| Việc | Client public | Nguồn / bằng chứng |
|---|---|---|
| Client credentials grant | ✗ | RFC 6749: *"The client credentials grant type MUST only be used by confidential clients."* |
| Gọi introspection | ✗ | Docs: *"This endpoint can only be invoked by confidential clients."*; lab: `spa` gọi introspect nhận `HTTP 403 "Client not allowed."` |
| Standard token exchange | ✗ | Docs token-exchange: requester-client phải là confidential (bài 13) |
| Bật Authorization Services | ✗ | Source 26.8.1 ném lỗi "Only confidential clients are allowed to set authorization settings" (bài 21) |
| Authorization code flow | ✓ | nhưng không có gì chứng minh "người đổi code là app thật", xem 3.5 |

Dòng cuối nối sang phần còn lại của bài. Confidential client đổi code bằng code **cộng** credential. Public client đổi code bằng code **và không gì khác**: ai cầm code là đổi được. Vậy với client public, toàn bộ an toàn dồn vào hai thứ: code chỉ được gửi tới đúng chỗ (`redirect_uri`, mục 3.4) và code bị cướp thì vô dụng (PKCE, mục 3.5).

Một chi tiết trên lab dễ làm bạn tin sai: representation của client `spa` (public, xem mục 4 bước 2) vẫn có `clientAuthenticatorType: "client-secret"`, và event `CODE_TO_TOKEN` của `spa` vẫn ghi `client_auth_method:"client-secret"`.

> **Suy luận.** Docs không giải thích hai trường này. Lab: `pkce.sh` đổi code của `spa` chỉ với `client_id`, `code`, `redirect_uri`, `code_verifier`, không secret, vẫn thành công. Vậy với `publicClient=true`, `clientAuthenticatorType` là giá trị mặc định còn sót, không có hiệu lực. Khi audit, phân loại client bằng `publicClient`, không bằng trường này hay `client_auth_method` trong event.

### 3.3 Bearer-only đã đi đâu

Tài liệu cũ dạy ba loại client: public, confidential, **bearer-only**. Bearer-only là client đại diện cho một API: nó không bao giờ đăng nhập ai, chỉ nhận access token rồi kiểm. Bản sai phổ biến: "API backend thì tạo bearer-only."

Ở 26.8.1, docs Server Admin viết một câu: *"Bearer-only is a deprecated client type."* Upgrading guide 26.7.0 nói rõ hơn: *"The switch Bearer only on OIDC clients is now deprecated and will be removed in a future version."* Và nó đã biến khỏi giao diện: *"The switch is already unavailable in the admin console client settings, but it was still possible to use it, for example, by directly updating a client through the admin REST API."*

Vì sao bỏ được? Vì "chỉ nhận token" không cần một loại client riêng. Một API cần client trong Keycloak vì hai lý do, và cả hai đều không đòi cờ bearer-only:

1. **Làm tên trong `aud`.** Bài 4 đã đo: access token mặc định có `"aud":"account"`, không có API nào. Muốn API kiểm `aud` thì phải có một `client_id` cho API để audience mapper trỏ vào. Trên lab, thêm mapper `oidc-audience-mapper` với `included.client.audience=api-client` vào client `test-direct` làm token ra `"aud":["api-client","account"]`.
2. **Gọi introspection hoặc token exchange.** Cả hai đòi client confidential (bảng 3.2), và ở 26.8.1 client gọi introspect còn phải có mặt trong `aud` của token.

Thay thế, theo bộ nguồn của course: tạo client OIDC confidential và **không bật grant nào**. Chỗ hay sai nằm ở chữ "không bật". Trên lab, một client tạo qua API mà không set gì (`kc create clients -s clientId=bare`) ra:

```json
{"publicClient":false,"standardFlowEnabled":true,"implicitFlowEnabled":false,"directAccessGrantsEnabled":false,
 "serviceAccountsEnabled":false, ... "fullScopeAllowed":true, ...}
```

`standardFlowEnabled` là `true`. Client "chỉ để làm audience" mà bạn tạo vội bằng một dòng `kcadm` đang cho phép authorization code flow. Phải tắt tường minh:

```bash
kc create clients -r demo -s clientId=orders-api -s publicClient=false \
   -s standardFlowEnabled=false -s directAccessGrantsEnabled=false -s serviceAccountsEnabled=false -i
```

> **Nguồn.** Bearer-only deprecated từ 26.7.0 ([upgrading 26.7.0](https://www.keycloak.org/docs/latest/upgrading/index.html#migrating-to-26-7-0)); docs KHÔNG nói nó đã bị gỡ ở 26.8.1. Phương án "client OIDC không bật grant nào" là ghi chú của bộ nguồn `kc-core-authn.md`, không có câu docs trích được. Lệnh `orders-api` theo cú pháp lab nhưng chưa chạy.

### 3.4 Confidential client chứng minh mình bằng cách nào

Confidential client phải chứng minh danh tính ở token endpoint. Discovery của realm `demo` quảng cáo năm phương thức:

```
"token_endpoint_auth_methods_supported": ["private_key_jwt","client_secret_basic","client_secret_post","tls_client_auth","client_secret_jwt"]
```

Câu hỏi so sánh có ích: **kẻ tấn công đọc được một request (log proxy, dump traffic) thì lấy được gì, dùng được bao lâu.**

**Client ID and Secret.** Mặc định của client confidential: *"This choice is the default setting. A random secret is generated automatically, but you can override it with a specific value if needed."* Secret gửi qua header `Authorization: Basic` (`client_secret_basic`) hoặc tham số body (`client_secret_post`). Basic không phải mã hoá: header của `api-client` trên lab là base64 của `api-client:api-secret-123`, giải ngược bằng một lệnh. Đọc được một request là có secret, dùng được tới ngày ai đó xoay secret. Thêm nữa, cùng một chuỗi nằm ở hai chỗ: Keycloak và client.

**Signed JWT** (`private_key_jwt`). *"Signed JWT allows a client to authenticate with self-signed client assertions. This enables the client to authenticate without a shared secret."* Client giữ private key, Keycloak chỉ cần public key. Mỗi lần xác thực, client ký một JWT ngắn hạn: *"note that tokens should be issued right before the authentication, 60 seconds by default"*. Đọc được một request là có một assertion, không có key. Thiệt hại bị chặn bởi cửa sổ hạn của assertion đó.

**X509 Certificate** (`tls_client_auth`, mTLS). *"Keycloak will validate if the client uses proper X509 certificate during the TLS Handshake."* Bằng chứng nằm trong TLS handshake, không nằm trong body hay header HTTP. Log HTTP không chứa gì dùng lại được. Giá phải trả là hạ tầng: TLS phải được kết thúc ở chỗ chuyển được chứng chỉ client tới Keycloak.

| Phương thức | Bí mật ở đâu | Đọc được 1 request thì có gì | Dùng được bao lâu |
|---|---|---|---|
| `client_secret_basic` / `_post` | cả Keycloak và client | chính secret | tới khi xoay secret |
| `private_key_jwt` | chỉ client (private key) | một assertion | trong hạn assertion (mặc định tối đa 60 s) |
| `tls_client_auth` | chỉ client (key của cert) | không có gì dùng lại được ở tầng HTTP | |

`client_secret_jwt` có trong discovery nhưng bộ nguồn của course không có dòng docs nào mô tả nó, nên bài này không phán xét nó.

> **Đo trên lab.** Client credentials với `api-client` (`client_secret_basic`) trả `expires_in 300`, không có refresh token. Sai secret: `HTTP 401 {"error":"unauthorized_client","error_description":"Invalid client or Invalid client credentials"}`. RFC 6749 dùng `invalid_client` cho ca này; Keycloak 26.8.1 trả `unauthorized_client`, và chỉ trả `invalid_client` khi `client_id` không tồn tại. Code xử lý lỗi của bạn nên bắt cả hai.

---

## ⏸ Dừng lại — đoán trước #2

Client public `shop-spa` đăng ký Valid Redirect URI `https://app.example.com/*` cho tiện, vì app có nhiều trang callback. Client đã đặt PKCE S256. Kẻ tấn công gửi cho nạn nhân (đang có SSO session) một link `/auth` do chính hắn dựng, với `redirect_uri=https://app.example.com/go?to=https://evil.example`. Trang `/go` của app là một open redirect cũ chưa ai xoá.

```
(a) An toàn: PKCE S256 đã bật, code rơi vào tay hắn cũng không đổi được
(b) An toàn: Keycloak so khớp chính xác, URI có query lạ sẽ bị từ chối
(c) Không an toàn: wildcard cho qua, và PKCE không giúp gì vì chính hắn dựng request
(d) Không an toàn, nhưng chỉ khi app chưa bật HTTPS
```

---

### 3.5 `redirect_uri`: code được giao tới đâu

Đáp án là **(c)**, và để thấy vì sao, đi theo đường code.

Code không đi kênh trực tiếp Keycloak tới app. Keycloak trả `302` cho trình duyệt, `Location` là `redirect_uri` cộng `code=...`; trình duyệt đi đâu, code tới đó. `redirect_uri` là **địa chỉ giao hàng của code**, và luật khớp của nó quyết định code có rời lãnh thổ của bạn hay không.

Luật khớp của Keycloak 26.8.1, theo docs:

1. *"Exact (case sensitive) string matching is used to compare valid redirect URIs."* `https://App.example.com/cb` và `https://app.example.com/cb` là hai chuỗi khác nhau.
2. *"You can use wildcards at the end of the URL pattern. For example http://host.com/path/*."* Không có wildcard giữa chuỗi, nên `https://*.example.com/callback` không phải một pattern hợp lệ theo nghĩa bạn mong.
3. URI có userinfo (`https://app.example.com@evil.example/`) hoặc `/../` thì wildcard bị tắt cho request đó: *"To avoid security issues, if the passed redirect URI contains the userinfo part or its path manages access to parent directory (/../) no wildcard comparison is performed but the standard and secure exact string matching."*
4. `*` đứng một mình: *"The full wildcard * valid redirect URI can also be configured to allow any http or https redirect URI. Please do not use it in production environments."*
5. Scheme tuỳ biến của app mobile (`myapp://callback`) không còn được `*` bao từ 21.1.2: *"For security reasons a general pattern like * does not cover them anymore."* Phải khai báo tường minh.
6. Production: *"In production for web applications always use https for all redirect URIs. Do not allow redirects to http."*

RFC 9700 đòi chặt hơn Keycloak: *"When comparing client redirection URIs against pre-registered URIs, authorization servers MUST utilize exact string matching except for port numbers in localhost redirection URIs of native apps"*. Keycloak cho phép wildcard cuối chuỗi, tức là cho bạn một khẩu súng mà RFC không cho. Cấu hình chỉ có URI chính xác thì bạn đang ở mức RFC 9700; thêm `/*` là bạn tự hạ xuống.

Giờ đặt câu hỏi #2 vào sơ đồ:

<svg viewBox="0 0 720 400" role="img" aria-labelledby="kc7-a-t kc7-a-d" style="width:100%;height:auto">
<title id="kc7-a-t">Đánh cắp authorization code qua redirect_uri wildcard</title>
<desc id="kc7-a-d">Sơ đồ sequence bốn cột: kẻ tấn công, trình duyệt nạn nhân, app, Keycloak. Kẻ tấn công dựng link auth có code_challenge của chính hắn và redirect_uri trỏ vào trang open redirect của app; Keycloak cho qua vì wildcard, trả code về trang đó; trang đó chuyển tiếp sang máy kẻ tấn công; hắn đổi code bằng verifier của chính hắn. So khớp chính xác chặn ở bước 3, PKCE không chặn được bước nào.</desc>
<defs><marker id="kc7-a-arrow" markerWidth="9" markerHeight="9" refX="7" refY="3.2" orient="auto"><path d="M0 0 L7 3.2 L0 6.4 z" fill="currentColor"/></marker></defs>
<text x="90" y="24" font-size="12" font-weight="bold" text-anchor="middle" fill="currentColor">Kẻ tấn công</text>
<text x="270" y="24" font-size="12" font-weight="bold" text-anchor="middle" fill="currentColor">Trình duyệt nạn nhân</text>
<text x="450" y="24" font-size="12" font-weight="bold" text-anchor="middle" fill="currentColor">app.example.com</text>
<text x="630" y="24" font-size="12" font-weight="bold" text-anchor="middle" fill="currentColor">Keycloak</text>
<line x1="90" y1="34" x2="90" y2="385" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<line x1="270" y1="34" x2="270" y2="385" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<line x1="450" y1="34" x2="450" y2="385" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<line x1="630" y1="34" x2="630" y2="385" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<line x1="90" y1="62" x2="268" y2="62" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc7-a-arrow)"/>
<text x="180" y="56" font-size="10" text-anchor="middle" fill="currentColor">1. link /auth, challenge của hắn</text>
<line x1="270" y1="98" x2="628" y2="98" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc7-a-arrow)"/>
<text x="450" y="92" font-size="10" text-anchor="middle" fill="currentColor">2. GET /auth?redirect_uri=https://app.example.com/go?to=evil</text>
<rect x="500" y="110" width="215" height="44" rx="8" fill="#f59e0b" fill-opacity="0.22"/>
<text x="607" y="128" font-size="10" text-anchor="middle" fill="currentColor">3. so với https://app.example.com/*</text>
<text x="607" y="144" font-size="10" text-anchor="middle" fill="currentColor">wildcard: QUA (khớp chính xác: 400)</text>
<line x1="628" y1="180" x2="272" y2="180" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc7-a-arrow)"/>
<text x="450" y="174" font-size="10" text-anchor="middle" fill="currentColor">4. 302 .../go?to=evil&amp;code=X (SSO, không hỏi mật khẩu)</text>
<line x1="270" y1="214" x2="448" y2="214" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc7-a-arrow)"/>
<text x="360" y="208" font-size="10" text-anchor="middle" fill="currentColor">5. GET /go?to=evil&amp;code=X</text>
<line x1="448" y1="244" x2="272" y2="244" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc7-a-arrow)"/>
<text x="360" y="238" font-size="10" text-anchor="middle" fill="currentColor">6. 302 evil, mang theo code</text>
<line x1="270" y1="278" x2="92" y2="278" stroke="#ef4444" stroke-width="1.8" marker-end="url(#kc7-a-arrow)"/>
<text x="180" y="272" font-size="10" text-anchor="middle" fill="currentColor">7. code=X tới máy hắn</text>
<line x1="90" y1="318" x2="628" y2="318" stroke="#ef4444" stroke-width="1.8" marker-end="url(#kc7-a-arrow)"/>
<text x="360" y="312" font-size="10" text-anchor="middle" fill="currentColor">8. POST /token code=X + code_verifier CỦA HẮN: khớp challenge bước 1</text>
<rect x="150" y="340" width="420" height="36" rx="8" fill="#ef4444" fill-opacity="0.18"/>
<text x="360" y="362" font-size="11" text-anchor="middle" fill="currentColor">PKCE không chặn: người dựng request là người giữ verifier</text>
</svg>

Mấu chốt ở bước 1 và bước 8. PKCE gắn code với **người đã khởi tạo request**. Ở đây người khởi tạo là kẻ tấn công: hắn tự sinh `code_verifier`, tự tính `code_challenge`, nhét vào link. Code sinh ra từ phiên SSO của nạn nhân nhưng ràng buộc với verifier của hắn. Phương án (a) sai vì thế. Phương án (b) sai vì so chuỗi chính xác chỉ áp **khi pattern không có wildcard**; có `/*` thì hậu tố sau đó, kể cả `go?to=...`, rơi vào phần wildcard (hộp đo dưới).

> **Đo trên lab (critic, 26.8.1).** Client public `spa-wild` với `redirectUris=["http://localhost:3000/*"]` và PKCE S256, so với `spa` (URI chính xác). `redirect_uri=http://localhost:3000/go?to=https://evil.example`: `spa-wild` trả 200 (trang login), `spa` trả 400. Đi hết flow với alice và một verifier tự sinh: Keycloak 302 về `http://localhost:3000/go?to=https://evil.example&state=s1&session_state=...&code=...`, và POST `/token` với verifier đó trả access token. Cùng `spa-wild`, `http://localhost:3000@evil.example/` và `http://localhost:3001/x` đều 400.

> **Suy luận.** Bước 6 của sơ đồ giả định trang `/go` chuyển tiếp cả query; nếu không, code vẫn có thể rò qua header Referer khi trang đích tải tài nguyên bên thứ ba. Phần này chưa đo.

Hai cơ chế chặn hai cuộc tấn công khác nhau, và không cái nào thay được cái nào:

| Cuộc tấn công | Ai dựng authorization request | `redirect_uri` khớp chính xác | PKCE S256 |
|---|---|---|---|
| Kẻ tấn công dựng link, code về chỗ hắn điều khiển (sơ đồ trên) | kẻ tấn công | ✓ chặn ở bước 3 | ✗ không chặn |
| App thật dựng request, code bị chặn giữa đường (app độc chiếm cùng custom scheme, log, Referer) | app thật | ✗ không chặn: URI đúng, chỉ là có người nghe lén | ✓ chặn: hắn không có verifier |

Dòng thứ hai chính là lý do PKCE tồn tại: *"OAuth 2.0 public clients utilizing the Authorization Code Grant are susceptible to the authorization code interception attack."* Bài 3 đã tính tay S256; ở đây chỉ cần nhớ nó bảo vệ flow do app thật khởi tạo.

Và đây là chỗ phương án (d) của câu #1 sai một cách thú vị: Keycloak không hề "coi khớp redirect_uri là đủ". Nó chỉ không bắt PKCE vì bạn không bảo nó bắt. Khớp chính xác chặn dòng một, để trống PKCE thì dòng hai mở toang.

> **Nguồn.** Luật khớp: Server Admin, mục basic settings ([con-basic-settings](https://www.keycloak.org/docs/latest/server_admin/index.html#con-basic-settings_server_administration_guide)). Scheme tuỳ biến từ 21.1.2 ([release notes 21.1.2](https://www.keycloak.org/docs/latest/release_notes/index.html#keycloak-21-1-2)). RFC 9700 khớp chính xác và PKCE bắt buộc cho public client ([rfc9700](https://www.rfc-editor.org/rfc/rfc9700)). PKCE theo cấu hình client: [capability-config](https://www.keycloak.org/docs/latest/server_admin/index.html#capability-config).

### 3.6 Bật PKCE cho đúng: theo client, không theo realm

Vì PKCE là thuộc tính của client, việc bắt PKCE là việc của người tạo **từng** client. Có hai đường:

1. Đặt attribute `pkce.code.challenge.method=S256` trên client (Admin Console: trường PKCE Method). Lab xác nhận đặt S256 thì `plain` cũng bị từ chối: `code challenge method is not matching the configured one`.
2. Dùng client policy/profile để ép theo realm: *"You can use either oauth-2-1-for-confidential-client profile for confidential clients or oauth-2-1-for-public-client profile for public clients."* Docs cũng nói OAuth 2.1 vẫn là draft, nên profile này có thể đổi theo draft.

Đường 1 hỏng đúng kiểu triệu chứng: script quên dòng attribute là client không có PKCE, và không ai thấy vì adapter JS của Keycloak mặc định tự gửi S256, test bằng frontend thật luôn "xanh". Chỉ request **thiếu** `code_challenge` mới làm lộ.

> **Chưa đo.** Lab không áp profile `oauth-2-1-for-public-client`, nên bài không đưa lệnh. Đo bằng: tạo client policy gắn profile đó, chạy lại ca `spa-nopkce` ở mục 4 bước 3.

---

## 4. Lab

Keycloak 26.8.1 `start-dev` (DB dev-file), OpenJDK 24.0.2, Mac mini Apple M4. Wrapper `kc` = `kcadm.sh "$@" --config ~/projects/keycloak-lab/lab1/kcadm.config`. Output dưới đây trích từ `tmp/sources/kc-lab-protocol.md` và file thô trong `~/projects/keycloak-lab/lab1/` (`spa.json`, `kc.log`).

**Bước 1. Dựng realm và ba client.**

```bash
kc config credentials --server http://localhost:8080 --realm master --user admin --password admin
kc create realms -s realm=demo -s enabled=true -i
kc create clients -r demo -s clientId=api-client -s publicClient=false -s serviceAccountsEnabled=true \
   -s standardFlowEnabled=false -s directAccessGrantsEnabled=false -s secret=api-secret-123 -i
kc create clients -r demo -s clientId=spa -s publicClient=true -s standardFlowEnabled=true \
   -s 'redirectUris=["http://localhost:3000/callback"]' -s 'webOrigins=["http://localhost:3000"]' -i
kc update clients/<spa-id> -r demo \
   -s 'attributes={"pkce.code.challenge.method":"S256","post.logout.redirect.uris":"http://localhost:3000/*"}'
```

Thấy gì: `kcadm` đăng nhập vào realm **master** để quản lý `demo`, đúng vai trò master ở mục 3.1. `api-client` confidential, chỉ bật service account; `spa` public, một redirect URI chính xác; thêm `spa-nopkce` như ở triệu chứng.

Một bẫy của `kcadm`: `kc get clients/<id> --fields attributes` trả `{}` dù attribute đã có. Phải đọc cả object: `kc get clients/<id> -r demo | jq .attributes`. Nếu bạn audit PKCE bằng `--fields`, mọi client sẽ trông như chưa đặt.

**Bước 2. Đọc lại client vừa tạo.** Từ `spa.json`:

```json
"clientAuthenticatorType" : "client-secret",
"redirectUris" : [ "http://localhost:3000/callback" ],
"bearerOnly" : false,
"publicClient" : true,
"attributes" : { "realm_client" : "false", "post.logout.redirect.uris" : "http://localhost:3000/*",
                 "pkce.code.challenge.method" : "S256" },
"fullScopeAllowed" : true,
```

Vì sao: `bearerOnly` vẫn có trong representation (deprecated, chưa gỡ). `fullScopeAllowed: true` là mặc định và in WARN mỗi lần cấp token; bài 9 xử lý.

**Bước 3. Bắn các ca âm vào authorization endpoint.** Script `pkce.sh` sinh verifier, GET `/auth`, đăng nhập `alice`, đọc `Location`, đổi code. Biến môi trường đổi từng tham số.

| Thử | Kết quả |
|---|---|
| `spa` (S256), đủ PKCE | 302 về `http://localhost:3000/callback?state=st123&session_state=...&iss=...&code=...`, `code_len = 98` |
| `spa` không gửi `code_challenge` | 302 `error=invalid_request&error_description=Missing parameter: code_challenge_method` |
| `spa` gửi `code_challenge_method=plain` | 302 `error=invalid_request` "code challenge method is not matching the configured one" |
| `redirect_uri=http://evil.com/callback` | **400**, trang lỗi "Invalid parameter: redirect_uri", KHÔNG redirect |
| **`spa-nopkce`, không gửi PKCE** | **đăng nhập và đổi code thành công, có access token** |
| `spa-nopkce` không gửi challenge nhưng lúc đổi code lại gửi verifier | `invalid_grant` "PKCE code verifier specified but challenge not present in authorization" |

Đọc từng dòng theo mục 3:

- Dòng 2 và 3 báo lỗi **bằng 302 về `redirect_uri`**, vì URI đó đã được xác minh là của client.
- Dòng 4 trả **400 ngay tại Keycloak**: nếu 302 lỗi về một URI chưa xác minh, chính Keycloak thành open redirector. Log ghi:

```
WARN [org.keycloak.events] type="LOGIN_ERROR", realmName="demo", clientId="spa", userId="null",
     ipAddress="127.0.0.1", error="invalid_redirect_uri", redirect_uri="http://evil.com/callback"
```

- Dòng 5 là triệu chứng của bài, tái hiện được trong 3 lệnh.
- Dòng 6: Keycloak không lờ PKCE ở client để trống, gửi nửa vời thì bị chặn. Nó chỉ không **đòi**.

> **Đo trên lab.** `post_logout_redirect_uri=http://evil.com/` (không khớp `post.logout.redirect.uris`) cũng bị **400**, log `LOGOUT_ERROR ... error="invalid_redirect_uri"`. Luật "chỉ chuyển hướng tới URI đã đăng ký" áp cho cả đường logout, và đó là một danh sách cấu hình riêng (attribute `post.logout.redirect.uris`), tách khỏi `redirectUris`.

**Bước 4. Sửa `spa-nopkce`.**

```bash
kc update clients/<spa-nopkce-id> -r demo -s 'attributes={"pkce.code.challenge.method":"S256"}'
```

Lệnh này **gộp** key vào map attributes, không thay cả map: attribute đã có của client vẫn còn.

> **Đo trên lab (critic, 26.8.1).** Trước: `{"realm_client":"false","post.logout.redirect.uris":"http://localhost:3000/*"}`. Sau lệnh trên: `{"realm_client":"false","post.logout.redirect.uris":"http://localhost:3000/*","pkce.code.challenge.method":"S256"}`. Chạy lại dòng 5 (không PKCE): `302 http://localhost:3000/callback?error=invalid_request&error_description=Missing+parameter%3A+code_challenge_method`.

**Bước 5. Xác thực client confidential, và giới hạn của client public.**

```bash
# Lệnh dựng lại theo client_secret_basic; dòng output (đã bỏ access_token) là output thật trong file lab
curl -s -u api-client:api-secret-123 -d grant_type=client_credentials \
  http://localhost:8080/realms/demo/protocol/openid-connect/token
# {"expires_in":300,"refresh_expires_in":0,"token_type":"Bearer","not-before-policy":0,"scope":"profile email"}
```

Sai secret: `HTTP 401 unauthorized_client`. Client public `spa` gọi `/token/introspect`: `HTTP 403 {"error":"invalid_request","error_description":"Client not allowed."}`. Đó là bảng mục 3.2 chạy thật: credential là vé vào các endpoint back-channel.

---

## 5. Tính tay

**Bài 1. Một secret trong log.** Proxy ghi nguyên header của mọi request tới token endpoint trong 14 ngày. Một dòng là `Authorization: Basic YXBpLWNsaWVudDphcGktc2VjcmV0LTEyMw==`.

- Giải base64. Chuỗi gốc bao nhiêu byte, base64 bao nhiêu ký tự, tỉ lệ 4/3 có khớp không (nhớ padding)?
- Kẻ đọc log dùng secret này tới khi nào?
- Nếu client dùng `private_key_jwt` với Max expiration mặc định 60 giây, assertion cũ nhất trong log 14 ngày còn dùng được không? Assertion mới nhất thì sao, nếu log được đọc 5 phút sau khi ghi?

**Bài 2. Phán redirect_uri.** Client có Valid Redirect URIs: `https://shop.example.com/callback` và `https://admin.example.com/app/*`. Với mỗi `redirect_uri` sau, ghi QUA hoặc TRƯỢT và luật số mấy ở mục 3.5 quyết định:

1. `https://shop.example.com/callback`
2. `https://shop.example.com/Callback`
3. `https://shop.example.com/callback?next=/cart`
4. `https://admin.example.com/app/reports/2026`
5. `https://admin.example.com/app/../legacy/redirect`
6. `https://admin.example.com/app@evil.example/`
7. `http://admin.example.com/app/x`

Câu 6 cần đọc kỹ: phần nào của chuỗi là host, và luật 3 có bật không?

**Bài 3. Cửa sổ của một code bị chặn.** Realm mặc định của lab có `accessCodeLifespan: 60` (giây). RFC 6749: *"A maximum authorization code lifetime of 10 minutes is RECOMMENDED."*

- Mặc định của Keycloak bằng bao nhiêu phần trăm mức trần RFC khuyến nghị?
- Code dùng một lần (lab: lần 2 trả `invalid_grant` "Code not valid"). Kẻ chặn được code của `spa-nopkce` phải làm gì, trong bao lâu, để thắng app thật?
- Đặt S256 cho client. Trong 60 giây đó hắn còn đổi được không? Còn nếu chính hắn dựng request (sơ đồ mục 3.5) thì 60 giây có ý nghĩa gì với hắn?

---

## 6. Chuyển giao

Không có đáp án trong bài.

Một SaaS B2B có: SPA cho khách hàng, app mobile dùng custom scheme `acme://callback`, 3 API backend kiểm JWT, một đối tác gọi API của bạn server-to-server, và một CLI nội bộ mở trình duyệt để đăng nhập rồi nhận code qua `http://127.0.0.1:<port ngẫu nhiên>/cb`.

1. Liệt kê các client bạn sẽ tạo. Mỗi cái public hay confidential, và câu hỏi nào ở mục 3.2 quyết định?
2. Ba API có cần client riêng không, nếu chúng chỉ kiểm chữ ký và `aud`? Viết lệnh `kcadm` cho một cái, và chỉ ra cờ nào bạn phải tắt tường minh.
3. Đối tác đòi dùng client secret vì "đơn giản". Bạn đề xuất phương thức nào, và lập luận bằng bảng mục 3.4 thế nào để họ chấp nhận chi phí thêm?
4. App mobile: Valid Redirect URIs ghi gì? Nếu ai đó điền `*` cho nhanh thì app mobile có login được không, và vì sao đó lại là tin tốt?
5. Bạn muốn mọi client public trong realm bắt PKCE kể cả khi người tạo quên. Đường nào ở mục 3.6, và bạn kiểm chứng nó bằng request nào?
6. Một khách hàng lớn đòi user của họ không chung chính sách mật khẩu, không đăng nhập lẫn với khách khác. Một realm hay nhiều realm? Mục 3.1 cho bạn gì, và không cho gì?
7. **Câu khó nhất.** CLI dùng port ngẫu nhiên trên loopback. RFC 9700 cho port localhost được khác khi so khớp, nhưng bộ nguồn không nói Keycloak 26.8.1 có cài ngoại lệ đó, và Keycloak chỉ cho wildcard cuối chuỗi. Đăng ký `http://127.0.0.1:*` thì wildcard nhận thêm những chuỗi nào ngoài "port bất kỳ", tiến trình nào trên máy người dùng lợi dụng được, PKCE che được phần nào? Thiết kế phép đo trên lab để trả lời mà không cần tin docs.

---

## 7. Tóm tắt

- Realm là ranh giới cách ly cụ thể: endpoint dưới `/realms/{realm}/`, issuer riêng, khoá riêng (realm mới có 4 key active, 2 key RSA ra JWKS), chính sách session/mật khẩu/brute force nằm trên object realm.
- Cách ly realm không chặn admin role của master, và không tắt hộ `admin-cli` của chính realm (`directAccessGrantsEnabled=true` sẵn).
- Public hay confidential quyết định bởi một câu: **mã client chạy trên máy ai, có giữ được bí mật không**. SPA và mobile là public.
- Client public không làm được client credentials, introspection (lab: 403), standard token exchange, Authorization Services; đổi code chỉ bằng code.
- Bearer-only deprecated từ 26.7.0, đã ẩn khỏi Admin Console. API dùng client confidential không bật grant nào; nhớ tắt `standardFlowEnabled`, vì client tạo qua API không set gì có nó bằng `true`.
- Xác thực client: secret (Basic/POST) lộ một request là lộ tới khi xoay; signed JWT lộ một assertion, mặc định tối đa 60 s; mTLS không để lại gì dùng lại được trong log HTTP. Sai secret, Keycloak 26.8.1 trả `401 unauthorized_client`.
- `redirect_uri` là địa chỉ giao code: so chuỗi chính xác, phân biệt hoa thường, wildcard chỉ ở cuối, userinfo hoặc `/../` thì tắt wildcard, `*` không cho production và không bao custom scheme từ 21.1.2.
- URI chưa đăng ký nhận **400 tại Keycloak**, không redirect; lỗi khác sau khi URI đã xác minh thì 302 về URI đó.
- Khớp chính xác chặn kẻ tấn công tự dựng request; PKCE chặn kẻ nghe lén request của app thật. Không cái nào thay cái nào.
- Keycloak bắt PKCE **theo client**: để trống thì client public vẫn hoàn tất auth code không PKCE (lab: `spa-nopkce`); đặt S256 thì thiếu challenge hay dùng `plain` đều bị chặn.

→ **Bài 8 — User, group, role**: client đã biết ai đang xin token; bài sau quyết định token đó mang những role nào, nằm ở claim nào, và nhét quá nhiều thì token phình bao nhiêu byte.
