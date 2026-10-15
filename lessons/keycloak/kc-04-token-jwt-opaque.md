# Bài 4 — Token: JWT, opaque, và validate cho đúng

## 1. Mục tiêu

Sau bài này bạn có thể:

- Decode ba token trong một token response Keycloak 26.8.1, chỉ ra claim tách chúng ra (`typ`, `aud`, `alg`), và tính tay số byte từ độ dài base64url.
- Viết danh sách kiểm cho một API nhận token Keycloak: chữ ký theo `kid`, `iss`, `aud`, `exp`, `typ`. Với mỗi dòng, nói được token nào lọt vào nếu bỏ nó, và vì sao kiểm `nbf` không làm gì với token Keycloak.
- Thêm audience mapper để API nằm trong `aud`, và giải thích vì sao thiếu nó thì introspection trả `{"active":false}` cho token còn hạn, đúng chữ ký.
- Chọn giữa verify local và introspection bằng ba con số: latency mỗi lần kiểm, số request đổ vào Keycloak, độ trễ từ lúc thu hồi tới lúc API từ chối.
- Đoán đúng trước khi chạy: revoke access token, revoke refresh token, logout thì introspection, userinfo, refresh và verify offline mỗi cái trả gì.
- Nhận `{"active":false}` và tìm lý do thật trong log event của Keycloak.

---

## 2. Triệu chứng

Báo cáo pentest của một SaaS B2B có một dòng mức High: "Đăng xuất không thu hồi quyền truy cập API". Tester đăng nhập, copy access token, bấm Logout; Keycloak trả `204 No Content`. Ngay sau đó tester gửi lại token cũ tới hai chỗ:

```
GET /realms/demo/protocol/openid-connect/userinfo  -> 401
    WWW-Authenticate: Bearer realm="demo", error="invalid_token", error_description="user_session_not_found"
GET /api/orders  (Spring Boot resource server)    -> 200
```

Tester decode token: `exp - now` còn 300 giây. Họ sửa một ký tự giữa phần chữ ký rồi gửi lại: cả hai chỗ đều 401. Team backend phản biện: "Chữ ký đúng, token chưa hết hạn, API làm đúng sách." Cấu hình API chỉ có một dòng `issuer-uri`.

Cùng tuần, team cho API báo cáo gọi introspection cho chắc. Từ hôm đó API báo cáo trả 401 cho **mọi** token, kể cả token vừa lấy 3 giây trước. Introspection trả đúng một dòng: `{"active":false}`.

## ⏸ Dừng lại — đoán trước #1

**Vì sao API đơn hàng trả 200 cho token đã logout?**

```
(a) Spring cache kết quả verify của token này 5 phút, giống cache JWKS
(b) Logout xoá session ở Keycloak; API chỉ kiểm chữ ký + iss + exp bằng public key
    đã có trong tay, và không có lý do gì để hỏi Keycloak
(c) 204 nghĩa là Keycloak nhận request nhưng chưa xử lý logout
(d) Keycloak đổi signing key khi logout, API còn giữ key cũ
```

---

## 3. Lý thuyết

### 3.1 Ba token trong một response, đọc từng byte

Đáp án là **(b)**. API đúng với thứ nó kiểm, nhưng thứ nó kiểm không chứa thông tin "đã logout". Muốn thấy vì sao, nhìn token chứa gì.

Token endpoint (bài 2, bài 3) trả `access_token`, `id_token`, `refresh_token`, cả ba dạng `header.payload.signature`. Cách decode và chuyện JWS chỉ ký chứ không mã hoá, `security/sec-05-authn-authz.md` mục 1–2 đã nói. Đây là ba token thật trên lab, client `spa`, auth code + PKCE:

<svg viewBox="0 0 720 250" role="img" aria-labelledby="kc4-a-t kc4-a-d" style="width:100%;height:auto">
<title id="kc4-a-t">Kích thước ba token Keycloak theo từng phần</title>
<desc id="kc4-a-d">Ba thanh vẽ theo tỉ lệ 0,4 pixel mỗi ký tự: access token 1381 ký tự gồm header 111, payload 926, chữ ký 342; ID token 1073 gồm 111, 618, 342; refresh token 676 gồm 102, 486, 86 và ký HS512 bằng khoá không có trong JWKS.</desc>
<text x="10" y="40" font-size="11" fill="currentColor">Access 1.381</text>
<rect x="140" y="24" width="44" height="26" fill="#64748b" fill-opacity="0.35"/>
<rect x="184" y="24" width="370" height="26" fill="#3b82f6" fill-opacity="0.3"/>
<rect x="554" y="24" width="137" height="26" fill="#f59e0b" fill-opacity="0.35"/>
<text x="162" y="41" text-anchor="middle" font-size="11" fill="currentColor">111</text>
<text x="369" y="41" text-anchor="middle" font-size="11" fill="currentColor">payload 926</text>
<text x="622" y="41" text-anchor="middle" font-size="11" fill="currentColor">sig 342</text>
<text x="140" y="68" font-size="10" fill="currentColor">RS256, typ Bearer, aud account, azp spa, có realm_access</text>
<text x="10" y="105" font-size="11" fill="currentColor">ID 1.073</text>
<rect x="140" y="89" width="44" height="26" fill="#64748b" fill-opacity="0.35"/>
<rect x="184" y="89" width="247" height="26" fill="#3b82f6" fill-opacity="0.3"/>
<rect x="431" y="89" width="137" height="26" fill="#f59e0b" fill-opacity="0.35"/>
<text x="162" y="106" text-anchor="middle" font-size="11" fill="currentColor">111</text>
<text x="307" y="106" text-anchor="middle" font-size="11" fill="currentColor">payload 618</text>
<text x="499" y="106" text-anchor="middle" font-size="11" fill="currentColor">sig 342</text>
<text x="140" y="133" font-size="10" fill="currentColor">RS256 cùng kid, typ ID, aud spa, có nonce và at_hash, không role</text>
<text x="10" y="170" font-size="11" fill="currentColor">Refresh 676</text>
<rect x="140" y="154" width="41" height="26" fill="#64748b" fill-opacity="0.35"/>
<rect x="181" y="154" width="194" height="26" fill="#3b82f6" fill-opacity="0.3"/>
<rect x="375" y="154" width="34" height="26" fill="#ef4444" fill-opacity="0.35"/>
<text x="160" y="171" text-anchor="middle" font-size="11" fill="currentColor">102</text>
<text x="278" y="171" text-anchor="middle" font-size="11" fill="currentColor">payload 486</text>
<text x="392" y="171" text-anchor="middle" font-size="11" fill="currentColor">86</text>
<text x="140" y="198" font-size="10" fill="currentColor">HS512, kid không có trong JWKS, typ Refresh, aud = chính issuer</text>
<rect x="140" y="220" width="12" height="12" fill="#64748b" fill-opacity="0.35"/>
<text x="158" y="231" font-size="10" fill="currentColor">header</text>
<rect x="220" y="220" width="12" height="12" fill="#3b82f6" fill-opacity="0.3"/>
<text x="238" y="231" font-size="10" fill="currentColor">payload</text>
<rect x="305" y="220" width="12" height="12" fill="#f59e0b" fill-opacity="0.35"/>
<text x="323" y="231" font-size="10" fill="currentColor">chữ ký RSA-2048</text>
<rect x="430" y="220" width="12" height="12" fill="#ef4444" fill-opacity="0.35"/>
<text x="448" y="231" font-size="10" fill="currentColor">chữ ký HMAC-SHA512</text>
</svg>

Đơn vị trong hình là ký tự base64url, cũng là byte trên dây. Ba điểm đáng giữ:

**Access token và ID token ký cùng một khoá.** Cùng `alg: RS256`, cùng `kid: 3mHTF5s6...`, cùng `iss`. API chỉ kiểm chữ ký và `iss` không phân biệt được hai thứ này; khác nhau chỉ ở payload: `typ` (`Bearer` so với `ID`) và `aud`.

**Access token không ghi địa chỉ cho API nào.** `aud` là `"account"`, không phải `spa`, không phải API đơn hàng. Docs nói client được cấp cố ý bị loại khỏi `aud`: *"The frontend client itself is not automatically added to the access token audience, therefore allowing easy differentiation between the access token and the ID token, since the access token will not contain the client for which the token is issued as an audience."*

> **Suy luận.** Docs không nói thẳng "access token mặc định có `aud: account`". Nó ghép từ ba dữ kiện có nguồn: mapper Audience Resolve trong client scope `roles` thêm vào `aud` mọi client có ít nhất một client role trong token; role `view-profile`, `manage-account` của client `account` nằm trong default roles của realm; client mới bật Full Scope Allowed. Lab xác nhận: `resource_access` có `account`, `aud` là `"account"`. Kiểm bằng: tắt Full Scope Allowed trên `spa`, lấy token mới, xem `aud` còn `account` không.

**Refresh token là JWT, nhưng chỉ Keycloak đọc được.** Ký `HS512` bằng khoá đối xứng của realm, `aud` bằng chính issuer, `typ: Refresh`. Trong code 26.8.1 refresh token thuộc nhóm token nội bộ: *"public static final String INTERNAL_SIGNATURE_ALGORITHM = Algorithm.HS512;"*. JWKS chỉ công bố khoá RS256 (ký) và RSA-OAEP (mã hoá); khoá HS512 là bí mật. Không API nào verify được refresh token, khớp với RFC 6749: *"Unlike access tokens, refresh tokens are intended for use only with authorization servers and are never sent to resource servers."*

**Opaque token** là token mà bên cầm không đọc được nghĩa, chỉ authorization server tra được; RFC 6749 mô tả access token là *"The string is usually opaque to the client."* Refresh token Keycloak có hình dạng JWT nhưng với mọi bên ngoài, nó hành xử như opaque: decode được payload, không kiểm được chữ ký. Định dạng này là chi tiết cài đặt, docs không cam kết: client muốn biết hạn thì đọc `refresh_expires_in: 1800` trong response, không parse `exp`.

Để so khi bài 8 nhồi thêm role: access token client credentials 1.255 byte, offline refresh token 726 byte (`typ: Offline`, 30 ngày).

> **Nguồn.** Audience: [server_admin, audience resolve](https://www.keycloak.org/docs/latest/server_admin/index.html#_audience_resolve). HS512: [Constants.java#L69](https://github.com/keycloak/keycloak/blob/26.8.1/server-spi-private/src/main/java/org/keycloak/models/Constants.java#L69); refresh token thuộc INTERNAL: [RefreshToken.java#L73](https://github.com/keycloak/keycloak/blob/26.8.1/core/src/main/java/org/keycloak/representations/RefreshToken.java#L73). [rfc6749](https://www.rfc-editor.org/rfc/rfc6749).

### 3.2 Năm phép kiểm, mỗi phép chặn một loại token

sec-05 mục 2 đã có checklist (ép `algorithms`, cấm `alg: none`, kiểm `exp`/`nbf`/`iss`/`aud`, JWKS theo `kid`). Câu hỏi ở đây hẹp hơn: **với token Keycloak 26.8.1 thật, mỗi dòng chặn cái gì, và dòng nào đang không làm gì.**

Bản sai cần chạy trước: "Spring resource server cấu hình `issuer-uri` là đủ." Trên lab 2, một dòng đó đủ để Spring kiểm chữ ký theo JWKS, `iss`, `exp`; token sửa 5 ký tự cuối chữ ký bị chặn:

```
401 error="invalid_token", error_description="An error occurred while attempting to decode the Jwt: Signed JWT rejected: Invalid signature"
```

**Chữ ký, chọn khoá theo `kid`.** API tra khoá cùng `kid` trong JWKS; docs: *"lookup and cache the public key using the certificate endpoint with the Key ID (KID) embedded within the"* header. Với Keycloak, phép này chặn thêm một thứ: **refresh token gửi nhầm tới API**, vì `kid` của nó không có trong JWKS. Gặp `kid` lạ, Spring fetch lại `/certs` ngay chứ không chờ hết cache 5 phút; 5 token `kid` bịa sinh đúng 5 lần GET `/certs`. Bài 12 đi sâu.

**`iss` khớp chuỗi chính xác**: scheme, host, port, path. Chặn token realm khác, Keycloak khác. Chỗ hay hỏng là cấu hình: lab 2 chạy hai node với `--hostname` khác nhau, refresh chéo node nhận `invalid_grant` "Invalid token issuer".

**`aud`: dòng mà mặc định không làm gì.** RFC 7519 viết MUST: *"If the principal processing the claim does not identify itself with a value in the "aud" claim when this claim is present, then the JWT MUST be rejected."* Lab 2: Spring **không** kiểm `aud` mặc định; token `aud: account` vẫn `200`. Ghép với mục 3.1: mọi access token của mọi client trong realm mang `aud: account`, nên **API không kiểm `aud` nhận token của mọi client trong realm**. RFC 9700 đòi ngược lại: *"In particular, access tokens SHOULD be audience-restricted to a specific resource server or, if that is not feasible, to a small set of resource servers."* Thứ tự sửa: thêm audience mapper ở Keycloak trước (mục 4.3, bài 9), bật kiểm `aud` ở API sau; đảo lại thì mọi request 401.

**`exp` không có leeway phía server.** RFC 7519: *"The "exp" (expiration time) claim identifies the expiration time on or after which the JWT MUST NOT be accepted for processing."* Lab đặt lifespan 10 s rồi introspect: `now - exp` = +0,49 s còn `active:true`, +1,22 s đã `active:false`. Leeway phía API (sec-05 dùng `clockTolerance: 5`) là quyết định của API.

**`nbf`: không có gì để kiểm.** Không token nào lab decode (access, ID, refresh, offline, client credentials) có claim `nbf`, nên dòng này là no-op. "Not before" của Keycloak là chính sách cấp realm: *"Pushing a not-before policy ensures that any tokens issued before that time become invalid."* Nó nằm ở Keycloak (response mang `"not-before-policy":0`), không nằm trong token.

> **Suy luận.** Chính sách not-before không có trong token, nên chỉ bên nào hỏi Keycloak (introspection, userinfo, refresh) mới thấy. API verify offline không có đường nào biết realm vừa đẩy not-before. Kiểm bằng: lấy token, đẩy not-before, gửi token tới introspection và tới API Spring, so kết quả.

**`typ`: header không phân biệt, payload mới phân biệt.** RFC 9068: *"The resource server MUST verify that the "typ" header value is "at+jwt" or "application/at+jwt" and reject tokens carrying any other value."* Keycloak đặt header `typ: JWT` cho cả ba token; tuỳ chọn `at+jwt` trên client thì *"This setting is turned off by default."* Hai hệ quả ngược chiều: thư viện làm đúng RFC 9068 từ chối **mọi** access token Keycloak mặc định; thư viện không kiểm `typ` thì chỉ còn claim `typ` trong payload (`Bearer`, `ID`, `Refresh`) và `aud` để tách access token khỏi ID token.

> **Đo trên lab (critic, 26.8.1).** API lab 2 (Spring 3.5.16, chỉ `issuer-uri`) trỏ vào Keycloak mới, gửi `id_token` (`typ: ID`, `aud: test-direct`, cùng `kid` với access token) làm Bearer: `/api/me` (`authenticated()`) trả `200 {"user":"alice","authorities":[]}`; `/api/orders` (`hasRole("orders.read")`) trả `403 insufficient_scope`. ID token không có `realm_access` lẫn `scope` nên authorities rỗng, nhưng endpoint chỉ đòi đăng nhập vẫn mở.

| Phép kiểm | Bỏ nó thì token nào lọt vào | Token Keycloak 26.8.1 | Spring 3.5, chỉ `issuer-uri` |
|---|---|---|---|
| Chữ ký theo `kid` | Token sửa payload, refresh token gửi nhầm | RS256; HS512 không công bố | ✓ |
| `iss` | Token realm khác | Phụ thuộc `--hostname` | ✓ |
| `aud` | Token của **mọi client khác** trong realm | Mặc định `account`, cần mapper | ✗ |
| `exp` | Token hết hạn | 300 s, server không leeway | ✓ |
| `nbf` | (không có gì) | Không có claim `nbf` | không áp dụng |
| `typ` | ID token dùng làm bearer | Header luôn `JWT`; xem payload | ✗ |

Không dòng nào biết session còn sống không. Đó là đáp án ⏸ #1 nhìn từ phía API.

> **Nguồn.** [rfc7519](https://www.rfc-editor.org/rfc/rfc7519), [rfc9700](https://www.rfc-editor.org/rfc/rfc9700), [rfc9068](https://www.rfc-editor.org/rfc/rfc9068). Header `typ`: [release notes](https://www.keycloak.org/docs/latest/release_notes/index.html#new-client-configuration-for-access-token-header-type). Not-before: [server_admin](https://www.keycloak.org/docs/latest/server_admin/index.html). `kid`: [oidc-layers](https://www.keycloak.org/securing-apps/oidc-layers).

## ⏸ Dừng lại — đoán trước #2

API báo cáo dùng client `api-client` (confidential, có secret) để gọi introspection mỗi request. Token người dùng được phát cho client `test-direct`, `aud: "account"`, còn 280 giây, chữ ký đúng.

**`api-client` gọi `POST /token/introspect` với token đó. Keycloak 26.8.1 trả gì?**

```
(a) 200 {"active":true, ...toàn bộ claim}
(b) 200 {"active":false}
(c) 403 {"error":"invalid_request","error_description":"Client not allowed."}
(d) 401 unauthorized_client
```

### 3.3 Introspection: hỏi Keycloak mỗi lần, và Keycloak hỏi lại bạn là ai

**Introspection** (RFC 7662) là endpoint nơi resource server gửi token lên authorization server để hỏi token còn hiệu lực không. Response bắt buộc có *"active REQUIRED. Boolean indicator of whether or not the presented token is currently active."* RFC đòi xác thực bên gọi: *"To prevent token scanning attacks, the endpoint MUST also require some form of authorization to access this endpoint"*. Keycloak chặt hơn: *"This endpoint can only be invoked by confidential clients."* Client public `spa` gọi trên lab nhận đúng phương án (c), nhưng `api-client` là confidential.

Đáp án là **(b)**. Phương án (a) là bản sai "client nào có secret cũng introspect được mọi token". Nó từng đúng; docs nâng cấp ghi thay đổi ở 26.6.2: *"Previously, any authenticated client could introspect any valid token. Now, the introspection endpoint returns {"active": false} if the authenticated client is not in the token’s audience."*

Lab thử ba ca, cả ba `{"active":false}`: `api-client` hỏi token của `test-direct`; `test-direct` hỏi token của chính nó (nó là `azp`, không nằm trong `aud`); `api-client` hỏi token client credentials của **chính nó** (`aud` vẫn là `account`). Lý do chỉ nằm trong log, vì listener `jboss-logging` in event lỗi ra WARN kể cả khi `eventsEnabled=false`:

```
WARN [org.keycloak.events] type="INTROSPECT_TOKEN_ERROR", realmName="demo", clientId="api-client", ... error="invalid_token",
     reason="Client 'api-client' is not in the token audience", token_issued_for="test-direct", token_id="onrtro:...", token_type="Bearer"
```

Đó là nửa sau của triệu chứng. Sửa một chỗ: audience mapper `api-client` trên client `test-direct` (mục 4.3), token mới có `"aud":["api-client","account"]`, introspect trả `active:true`.

Luật `aud` áp lên cả hai đường nhưng hỏng theo hai hướng: verify local bỏ `aud` thì **lặng lẽ nhận token sai** (lộ khi pentest), introspection thiếu `aud` thì **ồn ào từ chối token đúng** (lộ ở staging).

Hai ngoại lệ:

- **Refresh token không qua kiểm `aud`**: *"Refresh tokens and offline tokens are never issued to an audience of clients - their aud claim is the realm itself - so they are not subject to the audience check."* Client sở hữu introspect refresh token nhận `active:true`, `typ: Refresh`.
- **Mọi kiểu hỏng ra cùng một body.** Token rác `abc`, hết hạn, sai chữ ký, `alg: none`, ngoài `aud`, đã logout: đều `HTTP 200 {"active":false}`. Bên gọi không dò được token hỏng vì lẽ gì; người vận hành phải đọc log.

**Introspection mua được gì**: trạng thái phía server. Sau logout, introspect cùng token trả `active:false` dù `exp - now` còn 300 s. **Giá**: docs nói *"The downside to this approach is that you have to make a network invocation to the Keycloak server."* Trên lab, introspection p50 0,59 ms qua HTTP localhost; verify RS256 offline bằng Python thuần 124–134 µs, tức introspection chậm hơn khoảng 4,4–4,8 lần ngay cả khi không qua mạng thật. Nặng hơn latency là tải: mỗi request API thành một request Keycloak, Keycloak sập thì API sập theo.

> **Chưa đo.** Introspection qua mạng thật có TLS, và verify RS256 bằng Nimbus trên JVM warm: hai số để quyết định ở production. Đo bằng: `bench.py` từ máy khác qua HTTPS; JMH cho `NimbusJwtDecoder.decode()`.

**Lightweight access token** nghiêng hẳn về introspection: Keycloak bỏ phần lớn claim, chỉ giữ *"exp, iat, jti, iss, typ, azp, sid, scope, cnf"*. Token nhỏ đi, nhưng API cần role hay email thì phải introspect, và luật `aud` vẫn áp, xét trên `aud` Keycloak tính lại từ mapper vì token không mang `aud`. Từ 26.6.2 userinfo từ chối nó: *"Now, the UserInfo endpoint returns a 401 Unauthorized error when called with a lightweight access token."*

| | Verify local | Introspection |
|---|---|---|
| Biết logout, revoke | ✗, chỉ khi `exp` tới | ✓, ở lần hỏi kế tiếp |
| Request tới Keycloak | 1 lần fetch JWKS rồi cache | 1 lần mỗi request API |
| API phải nằm trong `aud` | Nên (RFC 7519 MUST); Spring không ép | **Bắt buộc** từ 26.6.2 |
| Khi Keycloak sập | Chạy tiếp bằng khoá đã cache | Mọi request 401 |

> **Nguồn.** [rfc7662](https://www.rfc-editor.org/rfc/rfc7662). Confidential client, nhược điểm gọi mạng: [oidc-layers](https://www.keycloak.org/securing-apps/oidc-layers). Thay đổi 26.6.2: [upgrading](https://www.keycloak.org/docs/latest/upgrading/index.html#token-introspection-now-validates-audience-claim). Refresh token và `aud`: [server_admin](https://www.keycloak.org/docs/latest/server_admin/index.html#token-introspection-audience-validation). Lightweight: [server_admin](https://www.keycloak.org/docs/latest/server_admin/index.html#_using_lightweight_access_token), [upgrading](https://www.keycloak.org/docs/latest/upgrading/index.html#userinfo-endpoint-rejects-lightweight-access-tokens).

## ⏸ Dừng lại — đoán trước #3

Thay vì logout, một app gọi `POST /revoke` với **access token** của user. Keycloak trả `HTTP 200`, body rỗng. Ngay sau đó app dùng **refresh token cùng phiên** để xin token mới.

**Kết quả?**

```
(a) invalid_grant "Session not active": revoke access token là kết thúc phiên
(b) 200, có access token mới: revoke access token không chạm tới phiên
(c) 400 "Unmatching clients"
(d) 200 nhưng access token mới cũng bị đánh dấu revoke ngay
```

### 3.4 Revocation, và vì sao thu hồi một JWT là bài toán khó

**Revocation** (RFC 7009) là endpoint client gọi để báo authorization server một token không còn dùng nữa: *"Implementations MUST support the revocation of refresh tokens and SHOULD support the revocation of access tokens"*. Keycloak nhận cả hai: *"Both refresh tokens and access tokens are supported by this endpoint. When revoking a refresh token, the user consent for the corresponding client is also revoked."*

Đáp án ⏸ #3 là **(b)**. Lab đo cả ba thao tác:

| Thao tác | Introspect AT | Userinfo | Refresh bằng RT cùng phiên |
|---|---|---|---|
| Revoke access token | `active:false` | 401 | **vẫn thành công** |
| Revoke refresh token | AT cùng phiên `active:false` | (không đo) | `invalid_grant`, Session not active |
| Logout (`POST /logout` + RT) | `active:false` | 401 `user_session_not_found` | `invalid_grant`, Session not active |

- **Revoke access token** chỉ đánh dấu đúng token đó: log raw ghi userinfo 401 vì phép kiểm `TokenRevocationCheck`, tức Keycloak giữ ghi nhận token đã revoke và tra khi được hỏi. Session không bị đụng tới, nên đây không phải cách đăng xuất.
- **Revoke refresh token** xoá client session: access token cùng phiên chết theo. User session còn, chỉ `clients: {}`; app khác trong cùng SSO không bị ảnh hưởng.
- **Logout** giết user session (session của alice: 13 xuống 12).

Hai ca code xử lý lỗi hay đoán sai: revoke chuỗi rác nhận **HTTP 200** kèm body `{"error":"invalid_token","error_description":"Invalid token"}`, đúng RFC 7009 *"The authorization server responds with HTTP status code 200 if the token has been revoked successfully or if the client submitted an invalid token."*; `api-client` revoke refresh token của `test-direct` nhận `400 invalid_request` "Unmatching clients".

Và mọi dòng trong bảng chỉ có hiệu lực với bên nào **hỏi Keycloak**. Đó là gốc của bài toán: access token JWT hợp lệ hay không là một hàm của ba thứ API đã có trong tay, chuỗi byte, public key, đồng hồ. Revoke và logout là sự kiện xảy ra ở Keycloak. Không có dây nào nối sự kiện đó tới hàm kia:

<svg viewBox="0 0 700 240" role="img" aria-labelledby="kc4-b-t kc4-b-d" style="width:100%;height:auto">
<title id="kc4-b-t">Một access token sau logout, ai còn nhận nó</title>
<desc id="kc4-b-d">Trục thời gian từ lúc logout tới 300 giây sau khi token hết hạn. Introspection, userinfo và refresh từ chối ngay từ giây 0; API verify offline vẫn trả 200 suốt 300 giây cho tới exp rồi mới trả 401.</desc>
<defs><marker id="kc4-b-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 z" fill="currentColor"/></marker></defs>
<line x1="140" y1="200" x2="680" y2="200" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc4-b-arrow)"/>
<line x1="140" y1="30" x2="140" y2="205" stroke="currentColor" stroke-opacity="0.5" stroke-dasharray="4 3"/>
<line x1="590" y1="30" x2="590" y2="205" stroke="currentColor" stroke-opacity="0.5" stroke-dasharray="4 3"/>
<text x="140" y="222" text-anchor="middle" font-size="11" fill="currentColor">logout, 204 (t = 0)</text>
<text x="590" y="222" text-anchor="middle" font-size="11" fill="currentColor">exp (t = 300 s)</text>
<text x="10" y="58" font-size="11" fill="currentColor">Introspection</text>
<rect x="140" y="42" width="530" height="24" rx="4" fill="#ef4444" fill-opacity="0.25"/>
<text x="405" y="58" text-anchor="middle" font-size="11" fill="currentColor">{"active":false} ngay từ giây 0</text>
<text x="10" y="98" font-size="11" fill="currentColor">Userinfo</text>
<rect x="140" y="82" width="530" height="24" rx="4" fill="#ef4444" fill-opacity="0.25"/>
<text x="405" y="98" text-anchor="middle" font-size="11" fill="currentColor">401 user_session_not_found</text>
<text x="10" y="138" font-size="11" fill="currentColor">Refresh bằng RT</text>
<rect x="140" y="122" width="530" height="24" rx="4" fill="#ef4444" fill-opacity="0.25"/>
<text x="405" y="138" text-anchor="middle" font-size="11" fill="currentColor">invalid_grant "Session not active"</text>
<text x="10" y="178" font-size="11" fill="currentColor">API verify offline</text>
<rect x="140" y="162" width="450" height="24" rx="4" fill="#84cc16" fill-opacity="0.3"/>
<rect x="590" y="162" width="80" height="24" rx="4" fill="#ef4444" fill-opacity="0.25"/>
<text x="365" y="178" text-anchor="middle" font-size="11" fill="currentColor">200: chữ ký, iss, exp vẫn đúng</text>
<text x="630" y="178" text-anchor="middle" font-size="11" fill="currentColor">401</text>
</svg>

Muốn đưa sự kiện "đã thu hồi" tới API chỉ có ba đường, mỗi đường một giá:

1. **API hỏi mỗi lần**: introspection, giá ở mục 3.3.
2. **Keycloak đẩy tới API**: back-channel logout (bài 14), hoặc danh sách đen theo `jti` phát tới mọi instance. Giá là hạ tầng phân phối và chỗ hỏng mới khi một instance không nhận được.
3. **Chờ token tự chết**: access token ngắn. Giá là cửa sổ bằng phần đời còn lại của token, tối đa 300 s mặc định. Docs thừa nhận đây là đường của nhiều app: *"Other client applications may just rely on the short Access token lifespan timeout."*

> **Suy luận.** Không nguồn nào nói "chỉ có ba đường". Nó suy ra từ việc một hàm thuần (byte, khoá, đồng hồ) chỉ đổi kết quả khi đầu vào đổi: đồng hồ (đường 3), hoặc thêm một đầu vào từ bên ngoài, kiểu kéo (đường 1) hay kiểu đẩy (đường 2). Đổi khoá ký cũng đổi đầu vào, nhưng giết token của **mọi** user cùng lúc; bài 29.

Đường 3 giải thích con số 300: nó là độ dài cửa sổ mà mọi API verify offline còn nhận token đã thu hồi. Token exchange thêm một góc của cùng bài toán: revoke token gốc *"will not revoke access-token2"*, token đổi ra từ nó (bài 13).

> **Nguồn.** [rfc7009](https://www.rfc-editor.org/rfc/rfc7009). Revocation Keycloak: [oidc-layers](https://www.keycloak.org/securing-apps/oidc-layers). Access token ngắn: [server_admin](https://www.keycloak.org/docs/latest/server_admin/index.html#front-channel-logout). [token-exchange](https://www.keycloak.org/securing-apps/token-exchange). 300 s là mặc định trong code 26.8.1: [Constants.java#L59](https://github.com/keycloak/keycloak/blob/26.8.1/server-spi-private/src/main/java/org/keycloak/models/Constants.java#L59).

---

## 4. Lab

> **Đo trên lab.** Keycloak 26.8.1 (Quarkus 3.40.1) `start-dev`, H2 dev-file, cổng 8080; OpenJDK 24.0.2; Mac mini Apple M4 10 core, 16 GB RAM; 2026-10-15. Realm `demo`, user `alice`; client `spa` (public, PKCE S256), `test-direct` (confidential, bật direct grant cho đo), `api-client` (confidential, service account). Spring ở lab 2: Boot 3.5.16, Security 6.5.11. Latency là dev mode, localhost, tuần tự: chỉ là bậc độ lớn.

### 4.1 Decode ba token, đếm byte

```bash
jq -r .access_token tok_pkce.json | python3 jwt.py     # jwt.py: tách dấu chấm, base64url-decode, in độ dài
```

Trích, chỉ giữ claim đang bàn:

```
access token, 1 381 byte
header:  {"alg":"RS256","typ":"JWT","kid":"3mHTF5s6rtmD58szBEJFbbCn3lsYzgq513M58oADKIU"}
payload: "aud":"account", "typ":"Bearer", "azp":"spa", "jti":"onrtac:95ed558d-cbeb-5f64-7a3d-264867dc0c36",
         "realm_access":{"roles":["reader","offline_access","default-roles-demo","uma_authorization"]}
signature: 342 ký tự base64url (256 byte, RSA-2048)

ID token, 1 073 byte -- payload: "aud":"spa", "typ":"ID", "nonce":"n456"

refresh token, 676 byte -- tiêu đề và thân:
header:  {"alg":"HS512","typ":"JWT","kid":"f3a703ef-f390-4503-98f9-62a6134fcce6"}
payload: "aud":"http://localhost:8080/realms/demo", "typ":"Refresh", "azp":"spa",
         "scope":"openid profile basic web-origins acr roles email"
signature: 86 ký tự base64url (64 byte = HMAC-SHA512)
```

`exp - iat`: 300 với access token, 1.800 với refresh token. Tiền tố `jti` cho biết grant (`onrtac:` auth code, `onrtro:` password, `trrtcc:` client credentials); đó là định dạng quan sát được, đừng viết logic dựa vào nó.

### 4.2 JWKS không có khoá của refresh token

```bash
curl -s http://localhost:8080/realms/demo/protocol/openid-connect/certs | jq -c '.keys[]'
```

Lab ghi rút gọn hai khoá trả về:

```
{"kid":"3mHTF5s6...","kty":"RSA","alg":"RS256","use":"sig","x5c":1 cert}   n = 342 ký tự base64url = 2048 bit, e = 65537
{"kid":"TxVrxFad...","kty":"RSA","alg":"RSA-OAEP","use":"enc","x5c":1 cert}
```

Realm có 4 khoá active (`kc get keys`): thêm HS512 và AES, không công bố. `kid: f3a703ef-...` của refresh token không khớp dòng nào.

### 4.3 Introspection: trước và sau audience mapper

```bash
curl -s -u api-client:api-secret-123 -d "token=$AT" \
  http://localhost:8080/realms/demo/protocol/openid-connect/token/introspect
```

Kết quả `{"active":false}`. Thêm mapper:

```bash
kc create clients/<test-direct-id>/protocol-mappers/models -r demo -s name=aud-api-client -s protocol=openid-connect \
   -s protocolMapper=oidc-audience-mapper -s 'config."included.client.audience"=api-client' \
   -s 'config."access.token.claim"=true' -s 'config."introspection.token.claim"=true'
```

Token mới, introspect lại (trích):

```json
{"aud":["api-client","account"],"typ":"Bearer","azp":"test-direct",
 "client_id":"test-direct","username":"alice","token_type":"Bearer","active":true}
```

Mapper không cấp quyền mới, chỉ ghi thêm người nhận; token dài thêm 20 byte (1.302 thành 1.322).

### 4.4 Revoke và logout

```bash
B=http://localhost:8080/realms/demo/protocol/openid-connect
curl -s -u test-direct:$SECRET -d "token=$AT" -d token_type_hint=access_token $B/revoke   # HTTP 200, body rỗng
curl -s -u test-direct:$SECRET -d "refresh_token=$RT" $B/logout                         # HTTP 204
```

Kết quả ở bảng mục 3.4: `user_session_not_found` ở userinfo nghĩa là token vẫn đúng chữ ký, cái mất là session.

> **Đo trên lab (critic, 26.8.1).** Dựng lại triệu chứng mục 2: Keycloak `start-dev` cổng 7800, API lab 2 trỏ `issuer-uri` về đó, alice lấy token bằng password grant (`test-direct`), logout (`204`), rồi gửi access token cũ khi `exp - now` = 299,2 s (output rút gọn):

```
userinfo                -> 401 error_description="user_session_not_found"
introspect (api-client) -> 200 active=false
GET /api/orders         -> 200, body là đơn 1001 của alice
refresh bằng RT cũ      -> 400 invalid_grant "Session not active"
```

### 4.5 Sửa token một ký tự

`tamper.py` sửa token gốc (introspect trả `true`) rồi gửi tới introspection và userinfo:

| Cách sửa | Introspect | Userinfo | Lý do trong log |
|---|---|---|---|
| đổi 1 ký tự giữa chữ ký | `{"active":false}` | 401 | `TokenSignatureInvalidException: Invalid token signature` |
| đổi ký tự cuối chữ ký thành `A` | `{"active":false}` | 401 | như trên (nhưng xem bài tính 1) |
| thêm role `admin` vào payload | `{"active":false}` | 401 | như trên |
| header `alg:none`, bỏ chữ ký | `{"active":false}` | 401 | `Unsupported token algorithm: none` |

`verify.py` kiểm offline bằng modulus JWKS cho cùng kết quả: gốc `valid:true`, sửa chữ ký hay payload `valid:false`.

### 4.6 Latency

`bench.py` (http.client keep-alive, tuần tự, warmup 10, 200 lần): introspection p50 **0,59 ms**, p95 0,81, p99 0,91, min/max 0,46 / 1,36 ms. Để so, client credentials cùng điều kiện p50 1,58 ms: introspect rẻ hơn xin token vì không ký gì, không tạo gì.

---

## 5. Tính tay

**Bài 1: ký tự cuối chữ ký chỉ mang 2 bit.** Base64url mã hoá 3 byte thành 4 ký tự, mỗi ký tự 6 bit, bỏ dấu `=` đệm.

- Payload access token 926 ký tự là 694 byte (694 × 4 / 3 = 925,33, làm tròn lên 926), chiếm 67% token; chữ ký 342 / 1.381 = 24,8%.
- Chữ ký RSA-2048 là 256 byte = 2.048 bit; 342 ký tự chứa 342 × 6 = 2.052 bit. **4 bit cuối là đệm**, ký tự cuối chỉ mang 2 bit thật. HMAC-SHA512 của refresh token: 512 bit trong 86 × 6 = 516 bit, cũng 4 bit đệm.

Ví dụ: ký tự cuối là `Q` (chỉ số 16, nhị phân `010000`). Mười sáu ký tự `Q` tới `f` (chỉ số 16–31) cùng hai bit đầu `01`, khác nhau ở 4 bit đệm. Đổi `Q` thành `R` thì bộ decode không ép 4 bit đệm bằng 0 ra **đúng 256 byte cũ**, chữ ký vẫn khớp dù chuỗi token đã khác. Script lab 1 đổi sang `A` (`000000`), khác hai bit đầu, nên chữ ký hỏng.

> **Đo trên lab (critic, 26.8.1).** Access token có chữ ký kết thúc bằng `Q`. Đổi thành `R`: introspection `{"active":true}`, userinfo `200`, Spring lab 2 (Nimbus 9.37.4) `/api/orders` `200`. Đổi thành `A`: introspection `{"active":false}`, userinfo `401 Token verification failed`, Spring `401 Invalid signature`. Cả Keycloak lẫn Nimbus đều không từ chối bit đệm khác 0.

> **Suy luận.** Vì vậy mọi cơ chế lấy **hash của nguyên chuỗi token** làm khoá (cache introspection, danh sách đen) bị vượt bằng một ký tự: mỗi token có 16 chuỗi khác nhau cùng được nhận. Khoá đúng là `jti`, nằm trong payload đã được chữ ký che.

**Bài 2: cửa sổ sau logout và giá của danh sách đen.** Access token 300 s. User lấy token lúc 9:00:00, logout lúc 9:00:40.

- API verify offline còn nhận token tới 9:05:00: cửa sổ 300 − 40 = **260 s**. Xấu nhất là logout ngay sau khi lấy token: 300 s, đúng số lab đo.
- Danh sách đen `jti`: mỗi mục chỉ cần sống tới `exp`, tối đa 300 s. Cao điểm 5 logout/giây thì tối đa 5 × 300 = **1.500** mục; `jti` lab dài 43 ký tự (tiền tố 7 + UUID 36), tức 1.500 × 43 = 64.500 byte, khoảng 63 KiB chưa tính overhead.
- Bộ nhớ không phải vấn đề (độ dài bị chặn bởi lifespan access token); vấn đề là đưa 1.500 mục tới mọi instance API trong vài giây.

**Bài 3: cache introspection, cái giá tính bằng giây.** API báo cáo nhận 800 request/giây, có 3.000 access token khác nhau đang hoạt động.

- Introspect mọi request: 800 request/giây vào Keycloak. Một kết nối tuần tự ở p50 0,59 ms phục vụ tối đa 1 / 0,00059 ≈ 1.695 request/giây (localhost, dev mode): gần nửa một kết nối chỉ cho API này.
- Cache kết quả theo `jti`, TTL 30 s: mỗi token hỏi tối đa một lần mỗi 30 s, tức tối đa 3.000 / 30 = **100 request/giây**, giảm 8 lần.
- Giá: token đã thu hồi còn được nhận tới 30 s. **TTL cache chính là cửa sổ thu hồi.** TTL 300 s thì introspection không hơn verify offline, chỉ đắt hơn.

---

## 6. Chuyển giao

1. App mobile có bug: gửi refresh token thay access token trong header `Authorization`. Đi qua bảng mục 3.2: dòng nào chặn nó trước ở API Spring mặc định? Nếu API dùng introspection, biết refresh token không qua kiểm `aud`, kết quả có khác không?
2. Realm có ba API Spring chỉ có `issuer-uri` (đơn hàng, thanh toán, báo cáo) và một client đối tác chỉ cần đọc báo cáo. Token của đối tác mở được API nào? Nêu thay đổi tối thiểu và thứ tự triển khai để người dùng thật không lúc nào nhận 401.
3. Sau khi nâng lên 26.8.1, một job đối soát dùng client credentials rồi tự introspect token của chính nó "cho chắc" trước khi gọi API. Job bắt đầu fail. Giải thích bằng cơ chế, đưa hai cách sửa, và nói cách nào bỏ được một request mạng.
4. Bảo mật đòi "logout có hiệu lực trên mọi API trong 10 giây". Một đề xuất là hạ access token lifespan xuống 10 s. Với 3.000 user đang hoạt động, tính số request refresh mỗi giây vào Keycloak so với mặc định 300 s, rồi so với cache introspection TTL 10 s ở bài tính 3.
5. Một team bật lightweight access token. Một service gọi userinfo lấy email, một service verify local rồi đọc `realm_access.roles`. Cái nào vỡ, bằng mã lỗi gì, và phải đổi sang cách nào, cấu hình gì ở Keycloak?
6. Private key RS256 của realm bị lộ: kẻ tấn công ký được token với `kid` cũ, `iss` đúng, `aud` đúng, `exp` tuỳ ý. Bạn tạo khoá mới và tắt khoá cũ. Spring cache JWKS 5 phút và chỉ fetch lại khi gặp `kid` lạ, mà token giả mang `kid` cũ vẫn nằm trong cache. Trong trường hợp xấu nhất token giả còn được nhận bao lâu sau khi tắt khoá? Việc tắt khoá có làm hỏng phiên người dùng thật không, hỏng ở loại token nào (access, refresh, ID)? Thiết kế trình tự các bước, kể cả phía API, để cửa sổ đó về gần 0 mà không bắt mọi người đăng nhập lại.

---

## 7. Tóm tắt

- Một token response Keycloak có ba JWT: access token 1.381 byte (RS256, `typ: Bearer`, `aud: account`), ID token 1.073 byte (RS256 cùng `kid`, `typ: ID`, `aud: spa`), refresh token 676 byte (HS512, `typ: Refresh`, `aud` = issuer).
- Khoá HS512 của refresh token không có trong JWKS: ngoài Keycloak không ai verify được; client đọc `refresh_expires_in`.
- Access token mặc định có `aud: "account"`, không chứa client được cấp hay API nào. Muốn API trong `aud` phải thêm audience mapper (+20 byte).
- Spring Boot 3.5 chỉ với `issuer-uri` kiểm chữ ký, `iss`, `exp`, **không** kiểm `aud`: token của mọi client trong realm đều được nhận, và ID token qua được endpoint `authenticated()` (đo: 200).
- Ký tự cuối chữ ký RS256 chỉ mang 2 bit; Keycloak và Nimbus nhận chuỗi chỉ khác ở 4 bit đệm (đo: `Q` thành `R`), nên khoá cache/danh sách đen phải là `jti`, không phải hash chuỗi token.
- Token Keycloak không có `nbf`; header `typ` luôn `JWT` (`at+jwt` mặc định tắt), nên tách access token khỏi ID token bằng `typ` và `aud` trong payload. Server áp `exp` không leeway ngoài độ phân giải 1 giây.
- Introspection chỉ cho confidential client, và từ 26.6.2 client gọi phải nằm trong `aud`, kể cả với token của chính nó; thiếu thì `{"active":false}`, lý do chỉ có trong log.
- Introspection p50 0,59 ms (localhost) so với 124–134 µs verify offline (Python), cộng một request Keycloak cho mỗi request API.
- Revoke access token không đăng xuất: refresh token cùng phiên vẫn chạy. Revoke refresh token xoá client session. Logout giết user session. Revoke chuỗi rác vẫn HTTP 200.
- Sau logout, API verify offline còn nhận token tới `exp`, tối đa 300 s. Thu hồi JWT chỉ có ba đường: hỏi mỗi lần, đẩy sự kiện, chờ token chết; TTL cache introspection bằng đúng cửa sổ thu hồi.

→ **Bài 5 — SAML 2.0**: bài này hỏi một JWT bốn câu: ai phát, phát cho ai, hết hạn khi nào, ai kiểm chữ ký. SAML assertion trả lời đúng bốn câu đó bằng XML ký, và cách ký một phần tài liệu XML mở ra một lớp tấn công JWT không có.
