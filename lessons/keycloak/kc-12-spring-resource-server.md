# Bài 12 — Spring Boot làm resource server

## 1. Mục tiêu

Sau bài này bạn có thể:

- Dựng API Spring Boot 3.5 nhận token Keycloak bằng một dòng `issuer-uri`, kể ra ba việc dòng đó làm và lúc Spring gọi Keycloak lần đầu.
- Viết converter `realm_access.roles` thành `ROLE_*` cho `hasRole(...)` khớp, và đọc `Granted Authorities=[...]` trong log để biết nó đã chạy.
- Dự đoán lúc Spring gọi `/certs` từ `kid` và TTL 5 phút, rồi tính token `kid` bịa đẩy bao nhiêu request vào Keycloak.
- Chứng minh bằng token `aud: account` rằng Spring mặc định không kiểm `aud`, và gắn audience validator vào decoder.
- Từ header `WWW-Authenticate`, chỉ ra lỗi sinh ở bước nào của filter chain, kể cả vì sao thiếu role vẫn ra `error="insufficient_scope"`.

---

## 2. Triệu chứng

Team bạn có `orders-api`, một service Spring Boot 3.5.16 sau lưng một app thương mại điện tử. Bạn cấu hình đúng như hướng dẫn: một dòng `issuer-uri` trỏ vào realm `lab`, và một luật `.requestMatchers("/api/orders/**").hasRole("orders.read")`. Trong Keycloak, user `alice` được gán realm role `orders.read`.

Bạn lấy token cho alice, decode, thấy role nằm ngay đó:

```
{'iss': 'http://localhost:8180/realms/lab', 'aud': 'account', 'azp': 'lab-cli',
 'scope': 'email profile',
 'realm_access': {'roles': ['offline_access', 'default-roles-lab', 'uma_authorization', 'orders.read']},
 'preferred_username': 'alice'}
```

Gọi `/api/orders` với token đó và nhận:

```
HTTP 403
WWW-Authenticate: Bearer error="insufficient_scope", error_description="The request requires higher privileges than provided by the access token."
```

Chữ ký hợp lệ, `iss` khớp, token còn hạn. Đồng nghiệp đọc header: "Nó báo thiếu scope. Tạo client scope `orders.read` gắn vào `lab-cli` là xong." Nửa buổi chiều sau, vẫn 403.

Cùng buổi đó, một người khác lấy token mà Keycloak cấp cho một app hoàn toàn khác trong realm, gửi vào `orders-api`, và nhận `200`.

> **Đo trên lab.** Keycloak 26.8.1 (2 node, Postgres), Spring Boot 3.5.16 / Spring Security 6.5.11 / nimbus-jose-jwt 9.37.4, Java 24, Mac mini Apple M4. Payload trên là token thật của alice (password grant, client `lab-cli`). Header 403 là header thật khi token thiếu authority luật đòi (lab ghi cho bob, không có role). Lab cũng ghi: không có converter thì authorities chỉ có `SCOPE_email`, `SCOPE_profile`, `hasRole("orders.read")` luôn 403; token `aud: account` được `200`. Code: `~/projects/keycloak-lab/lab2/orders-api/`.

---

## ⏸ Dừng lại — đoán trước #1

Token của alice có `orders.read`. Vì sao Spring vẫn trả 403?

```
(a) Token thiếu scope orders.read; phải thêm client scope như đồng nghiệp làm
(b) Spring mặc định chỉ đọc claim scope/scp; role trong realm_access không bao giờ thành authority
(c) iss của token lệch issuer-uri nên Spring coi token là không tin cậy
(d) Spring chưa tải được JWKS nên không xác thực được token
```

---

## 3. Lý thuyết

Bài 4 đã dạy validate JWT nói chung (chữ ký theo `kid`, `iss`, `aud`, `exp`). Bài này đo xem Spring Security làm bước nào, bỏ bước nào, vào lúc nào.

### 3.1 Một dòng `issuer-uri` làm ba việc

Đáp án #1 là **(b)**. Phương án (c) và (d) đều sai vì một lý do: lỗi xác thực token ra **401**, không ra 403 (mục 3.5). 403 nghĩa là Spring đã tin token, đã biết alice là ai, chỉ là không thấy authority `ROLE_orders.read`. Để thấy vì sao, đi từ dòng cấu hình đầu tiên.

**Resource server** là bên giữ API, nhận access token để quyết định cho qua hay không; nó không cấp token, không login ai. Với starter `spring-boot-starter-oauth2-resource-server`, cấu hình tối thiểu là:

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          # Spring goi {issuer-uri}/.well-known/openid-configuration de tim jwks_uri,
          # va kiem claim "iss" cua token phai BANG DUNG chuoi nay.
          issuer-uri: http://localhost:8180/realms/lab
```

Dòng đó làm ba việc:

1. **Tìm khoá.** Spring gọi discovery của realm (bài 3), đọc `jwks_uri` ra `.../protocol/openid-connect/certs`. Nó không cần bạn khai URL `/certs`.
2. **Kiểm `iss` bằng so chuỗi.** Claim `iss` phải bằng đúng chuỗi `issuer-uri`, từng ký tự. `http://localhost:8180/realms/lab` và `http://127.0.0.1:8180/realms/lab` là hai issuer khác nhau dù cùng một máy.
3. **Lùi việc gọi Keycloak tới request đầu tiên.** Đây là phần người ta hay đoán sai.

Bản sai phổ biến: "Spring tải JWKS lúc khởi động, Keycloak chết thì app không lên." Log lab nói khác. App khởi động xong mà không có request nào tới Keycloak:

```
13:56:35.826 Started OrdersApiApplication in 0.647 seconds (process running for 0.796)
```

Mười giây sau, request đầu tiên mang `Authorization: Bearer` tới, và lúc đó Spring mới đi lấy:

```
13:56:45.604 RestTemplate : HTTP GET http://localhost:8180/realms/lab/.well-known/openid-configuration
13:56:45.625 RestTemplate : Response 200 OK
13:56:45.654 RestTemplate : HTTP GET http://localhost:8180/realms/lab/protocol/openid-connect/certs
13:56:45.659 RestTemplate : Response 200 OK
13:56:45.694 JwtAuthenticationProvider : Authenticated token
```

Tách 90 ms của request đầu: discovery 21 ms (604 tới 625), 29 ms dựng decoder từ metadata, `/certs` 5 ms, 35 ms cho lần verify đầu (JVM còn lạnh). Discovery chỉ được gọi một lần trong suốt khoảng 8 phút test, không thấy lại.

<svg viewBox="0 0 760 380" role="img" aria-labelledby="kc12-a-t kc12-a-d" style="width:100%;height:auto">
<title id="kc12-a-t">Request Bearer đầu tiên vào orders-api</title>
<desc id="kc12-a-d">Sơ đồ sequence ba cột client, orders-api Spring và Keycloak: request Bearer đầu tiên kích hoạt discovery và tải JWKS, verify chữ ký và iss nhưng không kiểm aud, rồi converter và luật hasRole quyết định 200 hay 403; mốc thời gian lấy từ log lab.</desc>
<defs>
<marker id="kc12-a-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0,0 L10,5 L0,10 z" fill="currentColor" fill-opacity="0.6"/>
</marker>
</defs>
<rect x="30" y="14" width="120" height="30" rx="8" fill="#64748b" fill-opacity="0.25"/>
<text x="90" y="34" text-anchor="middle" font-size="11" fill="currentColor">client (curl)</text>
<rect x="310" y="14" width="140" height="30" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="380" y="34" text-anchor="middle" font-size="11" fill="currentColor">orders-api :8380</text>
<rect x="600" y="14" width="140" height="30" rx="8" fill="#8b5cf6" fill-opacity="0.25"/>
<text x="670" y="34" text-anchor="middle" font-size="11" fill="currentColor">Keycloak :8180</text>
<line x1="90" y1="44" x2="90" y2="300" stroke="currentColor" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="4 3"/>
<line x1="380" y1="44" x2="380" y2="300" stroke="currentColor" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="4 3"/>
<line x1="670" y1="44" x2="670" y2="300" stroke="currentColor" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="4 3"/>
<line x1="90" y1="70" x2="378" y2="70" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc12-a-arrow)"/>
<text x="234" y="64" text-anchor="middle" font-size="11" fill="currentColor">1. GET /api/orders, Bearer (.604)</text>
<line x1="380" y1="100" x2="668" y2="100" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc12-a-arrow)"/>
<text x="524" y="94" text-anchor="middle" font-size="11" fill="currentColor">2. GET openid-configuration</text>
<line x1="670" y1="126" x2="382" y2="126" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc12-a-arrow)"/>
<text x="524" y="120" text-anchor="middle" font-size="11" fill="currentColor">3. 200: jwks_uri (21 ms, 1 lần/đời app)</text>
<line x1="380" y1="156" x2="668" y2="156" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc12-a-arrow)"/>
<text x="524" y="150" text-anchor="middle" font-size="11" fill="currentColor">4. GET /certs (.654)</text>
<line x1="670" y1="182" x2="382" y2="182" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc12-a-arrow)"/>
<text x="524" y="176" text-anchor="middle" font-size="11" fill="currentColor">5. 200: JWK Set (5 ms), cache 5 phút</text>
<rect x="250" y="194" width="260" height="58" rx="8" fill="#f59e0b" fill-opacity="0.2"/>
<text x="380" y="212" text-anchor="middle" font-size="11" fill="currentColor">6. chữ ký theo kid, iss, thời hạn</text>
<text x="380" y="228" text-anchor="middle" font-size="11" fill="currentColor">aud: KHÔNG kiểm</text>
<text x="380" y="244" text-anchor="middle" font-size="11" fill="currentColor">7. converter: authorities, rồi hasRole</text>
<line x1="378" y1="276" x2="92" y2="276" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc12-a-arrow)"/>
<text x="234" y="270" text-anchor="middle" font-size="11" fill="currentColor">8. 200 hoặc 403 (.694, tổng 90 ms)</text>
<rect x="30" y="314" width="710" height="54" rx="8" fill="#ef4444" fill-opacity="0.12"/>
<text x="385" y="336" text-anchor="middle" font-size="11" fill="currentColor">Request sau: chỉ bước 1, 6, 7, 8. Bước 4-5 lặp lại khi: gặp kid chưa có trong cache (ngay lập tức),</text>
<text x="385" y="354" text-anchor="middle" font-size="11" fill="currentColor">hoặc cache quá 5 phút và có request tới. Không có job làm mới định kỳ.</text>
</svg>

Hệ quả vận hành của việc lùi tới request đầu:

> **Đo trên lab (critic, 26.8.1).** Bản copy của `orders-api`. Tắt Keycloak, start app: `Started OrdersApiApplication in 0.828 seconds`. Gửi một token còn hạn: `401` với `WWW-Authenticate: Bearer` trơn, không có `error`; log `JwtDecoderInitializationException: Failed to lazily resolve the supplied JwtDecoder instance`, gốc là `Connection refused` ở GET discovery. App lên mà không xác thực được token nào, và readiness probe không biết điều đó.

Còn việc kiểm `iss` bằng so chuỗi thì cắn ở cụm Keycloak. Ở lab cụm 2 node, khi node-b chạy với `--hostname=http://localhost:8280` khác node-a, Keycloak tự từ chối refresh chéo node: `Invalid token issuer. Expected 'http://localhost:8280/realms/lab'`. Token do node-b ký khi đó mang `iss` là `.../8280/realms/lab`.

> **Suy luận.** Lab chưa gửi token của node-b lệch hostname vào Spring. Nhưng Spring so `iss` với `http://localhost:8180/realms/lab` bằng đúng chuỗi, nên token đó bị 401 `invalid_token` dù chữ ký hợp lệ (hai node chung khoá trong cùng DB). Kiểm bằng: chạy node-b với hostname 8280, lấy token qua 8280, gọi API.

> **Nguồn.** Discovery: `jwks_uri` là trường bắt buộc, *"jwks_uri REQUIRED. URL of the OP's JWK Set"*, và `issuer` *"MUST be identical to the iss Claim value in ID Tokens issued from this Issuer."* ([discovery](https://openid.net/specs/openid-connect-discovery-1_0.html)). Endpoint `certs` của Keycloak: *"The certificate endpoint returns the public keys enabled by the realm, encoded as a JSON Web Key (JWK)."* ([oidc-layers](https://www.keycloak.org/securing-apps/oidc-layers)). Docs Keycloak 26.8.1 không có guide Spring; mọi hành vi Spring trong bài đến từ lab.

### 3.2 JWKS: cache 5 phút, nhưng `kid` lạ thì gọi ngay

Keycloak đã nói rõ resource server nên làm gì với khoá: *"...or lookup and cache the public key using the certificate endpoint with the Key ID (KID) embedded within the..."* Docs không nói cache bao lâu. Con số đó do thư viện quyết định, và lab đọc ra từ bytecode `NimbusJwtDecoder$JwkSetUriJwtDecoderBuilder` của Spring Security 6.5.11:

```
JWKSourceBuilder.create(...).refreshAheadCache(false).rateLimited(false).cache(true)
DEFAULT_CACHE_TIME_TO_LIVE      = 300000   (ms, 5 phút)
DEFAULT_RATE_LIMIT_MIN_INTERVAL = 30000    (ms, nhưng Spring tắt rate limit)
DEFAULT_HTTP_CONNECT_TIMEOUT    = 500      DEFAULT_HTTP_READ_TIMEOUT = 500
```

Đọc từng cờ thành hành vi:

- `cache(true)`, TTL 300 s: JWK Set nằm trong RAM của **từng instance**.
- `refreshAheadCache(false)`: cache hết hạn thì nằm yên tới khi có request, request đó trả giá một lần `/certs`. Lab: lần fetch cuối 13:57:17, request lúc 14:00:23 (186 s sau) không fetch, request lúc 14:04:05 (408 s sau) fetch đúng một lần, hai request tiếp theo không fetch.
- Timeout 500 ms cho cả connect lẫn read: Keycloak chậm quá nửa giây ở đúng lúc cache cần làm mới thì request đó lỗi.

Giờ tới bản sai thứ hai: "cache 5 phút nên xoay khoá xong phải chờ 5 phút API mới nhận token mới." Lab tạo thêm một key provider `rsa-generated` priority 500 trên realm, token mới mang `kid` mới `2180hRrK...`. Request đầu tiên với token này:

```
13:56:56.616 RestTemplate : HTTP GET http://localhost:8180/realms/lab/protocol/openid-connect/certs
13:56:56.619 RestTemplate : Response 200 OK
13:56:56.620 JwtAuthenticationProvider : Authenticated token
```

Chỉ 11 s sau lần fetch trước, chưa tới TTL. Cơ chế: `kid` trong header JWS là gợi ý khoá nào đã ký (RFC 7515 nói nó *"allows originators to explicitly signal a change of key to recipients."*). Không tìm thấy `kid` trong cache, Nimbus coi đó là tín hiệu khoá đã đổi và đi lấy JWK Set mới ngay. Còn token alice bị sửa 5 ký tự cuối chữ ký thì **không** gây fetch (log 13:56:45.749 chỉ có `Failed to authenticate since the JWT was invalid`), vì `kid` của nó vẫn có trong cache, chỉ phép kiểm chữ ký thất bại.

Hành vi này đúng cho xoay khoá. Nhưng nó có mặt trái, và mặt trái đó nằm ở cờ `rateLimited(false)`. Lab tạo một token rác với header `kid: fake-kid-xyz` rồi gửi 5 lần:

```
13:57:16.990 RestTemplate : HTTP GET .../protocol/openid-connect/certs
13:57:16.993 JwtAuthenticationProvider : Failed to authenticate since the JWT was invalid
13:57:17.000 RestTemplate : HTTP GET .../protocol/openid-connect/certs
   ... (lặp lại, mỗi lần cách ~10 ms)
13:57:17.029 RestTemplate : HTTP GET .../protocol/openid-connect/certs
```

5 request, 5 lần `401`, **5 lần** `GET /certs`. Mỗi token với `kid` bịa là một request tới Keycloak, và người gửi không cần biết bất kỳ bí mật nào: chỉ cần một chuỗi có dạng JWT. Đây là **khuếch đại tải**: request rác đánh vào API được dịch 1:1 thành request vào IdP, thứ mà mọi API khác trong công ty cùng phụ thuộc. Phần tính ở mục 5.

Nimbus có sẵn cơ chế chống đúng việc này (hằng số `DEFAULT_RATE_LIMIT_MIN_INTERVAL = 30000`), Spring 6.5.11 chọn tắt nó. Muốn bật lại thì tự dựng `JWKSource`:

```java
// Bỏ: import, @Configuration. Nimbus 9.37.4, Spring Security 6.5.11.
@Bean
JwtDecoder jwtDecoder() throws Exception {
    String iss = "http://localhost:8180/realms/lab", certs = iss + "/protocol/openid-connect/certs";
    JWKSource<SecurityContext> jwks = JWKSourceBuilder.create(URI.create(certs).toURL())
            .rateLimited(true)          // mặc định của Nimbus, Spring tắt đi
            .build();
    NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(certs)
            .jwtProcessorCustomizer(p -> p.setJWSKeySelector(
                    new JWSVerificationKeySelector<>(JWSAlgorithm.RS256, jwks)))
            .build();
    decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(iss));
    return decoder;
}
```

Đừng bỏ dòng `setJwtValidator`: decoder dựng bằng `withJwkSetUri` mặc định chỉ có `JwtValidators.createDefault()` (bytecode 6.5.11), kiểm thời hạn mà **không kiểm `iss`**.

> **Đo trên lab (critic, 26.8.1).** 100 token `kid` bịa rải đều trong 10 s, đếm `GET .../certs` trong access log của Keycloak. Decoder mặc định của Spring: 100 lần `401`, **100** lần `/certs`. Decoder trên: 100 lần `401`, **1** lần `/certs`. Cái giá: lần fetch cuối 14:43:14,978; thêm khoá priority 500 rồi gửi token `kid` mới lúc 14:43:38 và 14:43:43 đều nhận `401`, lúc 14:43:48 thì fetch (14:43:48,616, sau lần trước 33,6 s) và `200`. Mốc giây trên máy dev chỉ đúng bậc độ lớn. Code: `~/projects/keycloak-lab/critic-ch3a/orders-api/` (profile `ratelimit`).

> **Nguồn.** `kid` là gợi ý, cho phép báo đổi khoá: *"The "kid" (key ID) Header Parameter is a hint indicating which key was used to secure the JWS."* ([rfc7515](https://www.rfc-editor.org/rfc/rfc7515)). Lookup và cache theo KID ([oidc-layers](https://www.keycloak.org/securing-apps/oidc-layers)). Docs Keycloak không nói cache bao lâu; 300 s là hằng số Nimbus 9.37.4 lab đọc từ bytecode.

---

## ⏸ Dừng lại — đoán trước #2

Một app khác trong realm (client `reporting-ui`, chẳng liên quan gì tới đơn hàng) có user đăng nhập. Token của nó có `aud: account`, chữ ký hợp lệ, `iss` đúng, `realm_access.roles` tình cờ có `orders.read` vì Full Scope Allowed đang bật (bài 8). Ai đó gửi token này vào `orders-api` (đã có converter). Kết quả?

```
(a) 401: aud không chứa orders-api, Spring từ chối như RFC 7519 yêu cầu
(b) 403: Spring nhận token nhưng azp không phải client của mình
(c) 200: Spring mặc định không đọc aud
(d) Tuỳ: Spring chỉ kiểm aud khi token có nhiều hơn một audience
```

---

### 3.3 `aud`: bước validate mà Spring bỏ qua

Đáp án là **(c)**. Lab: token alice có `aud: account`, không dính gì tới `orders-api`, vẫn nhận `200` ở `/api/orders`. Bộ validator mặc định khi cấu hình bằng `issuer-uri` kiểm `iss` và thời hạn, không kiểm `aud`.

Chuẩn nói ngược lại. RFC 7519: *"If the principal processing the claim does not identify itself with a value in the "aud" claim when this claim is present, then the JWT MUST be rejected."* RFC 9700 đi xa hơn ở phía phát token: *"In particular, access tokens SHOULD be audience-restricted to a specific resource server or, if that is not feasible, to a small set of resource servers."*

`aud` chặn đúng một cuộc tấn công: **token cấp cho API A bị đem dùng ở API B**. A có thể là service yếu hơn, log token ra file, hoặc chính là service độc hại. Nếu B không kiểm `aud`, mọi token hợp lệ của realm đều là token hợp lệ của B, và lớp duy nhất còn lại là luật role. Với Full Scope Allowed bật mặc định, role của user đi theo vào token của **mọi** client (bài 8), nên luật role không bù được.

Sửa cần hai nửa, và thiếu nửa nào cũng hỏng:

1. **Phía Keycloak:** token phải mang `orders-api` trong `aud`. Mặc định Keycloak không làm việc đó (*"the access token will not contain the client for which the token is issued as an audience."*), `aud` mặc định là `account` như lab thấy. Thêm audience mapper hoặc client role của `orders-api` là việc của bài 9; lab #1 đã chạy mapper đó và thấy token mới có `"aud":["api-client","account"]`.
2. **Phía Spring:** thêm validator. Bật validator trước khi Keycloak sửa nửa 1 thì **mọi** request 401.

Code nửa 2 (đã chạy):

```java
// Thay decoder mà issuer-uri tự dựng. Bỏ: import, @Configuration.
@Bean
JwtDecoder jwtDecoder() {
    String iss = "http://localhost:8180/realms/lab", me = "orders-api";
    NimbusJwtDecoder decoder = JwtDecoders.fromIssuerLocation(iss);
    OAuth2TokenValidator<Jwt> audience = new JwtClaimValidator<List<String>>(
            JwtClaimNames.AUD, aud -> aud != null && aud.contains(me));
    decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefaultWithIssuer(iss), audience));
    return decoder;
}
```

Ba chỗ hay sai khi chép đoạn này:

- `setJwtValidator` **thay** bộ validator, không cộng thêm. Chỉ truyền `audience` thì mất luôn kiểm `iss` và thời hạn. Vì thế phải bọc `createDefaultWithIssuer(issuer)` trong `DelegatingOAuth2TokenValidator`.
- Keycloak trả `aud` khi là chuỗi đơn (`"account"`), khi là mảng (`["api-client","account"]`). Spring chuẩn hoá `aud` thành danh sách, nên `contains` đúng cho cả hai; viết `aud.equals("orders-api")` thì hỏng ngay khi token có hai audience.
- Bean `JwtDecoder` tự khai thay decoder lười của auto-config. `fromIssuerLocation` gọi Keycloak **ngay lúc tạo bean**: hành vi lười ở 3.1 mất, đo ngay dưới.

> **Đo trên lab (critic, 26.8.1).** Bean trên (Keycloak ở cổng 5600 thay 8180), Keycloak sống: trên thread `main`, trước dòng `Started`, app gọi `GET .../.well-known/openid-configuration` rồi `GET .../certs`. Keycloak chết: app **không lên**, `BeanCreationException: Error creating bean with name 'jwtDecoder'`, gốc `Connection refused`. Token alice `aud: account`: `401`, `error_description="An error occurred while attempting to decode the Jwt: The aud claim is not valid"`. Thêm audience mapper `included.custom.audience=orders-api` vào `lab-cli`: `aud: ['orders-api', 'account']`, alice `200`, bob `403`.

> **Nguồn.** Bên xử lý JWT không có trong `aud` phải từ chối ([rfc7519](https://www.rfc-editor.org/rfc/rfc7519)). Access token nên giới hạn audience ([rfc9700](https://www.rfc-editor.org/rfc/rfc9700)). Keycloak không đưa client được cấp vào `aud` ([_audience_resolve](https://www.keycloak.org/docs/latest/server_admin/index.html#_audience_resolve)).

### 3.4 Authorities: Spring đọc `scope`, Keycloak để role ở `realm_access`

Quay lại triệu chứng 403. **Authority** là chuỗi mà luật phân quyền của Spring so khớp; sau khi token qua validate, một converter biến claim thành danh sách authority, và `hasRole`/`hasAuthority` chỉ nhìn danh sách đó, không nhìn token.

Converter mặc định, `JwtGrantedAuthoritiesConverter`, chỉ đọc claim `scope` (hoặc `scp`), tách theo dấu cách và thêm tiền tố `SCOPE_`. Token alice có `'scope': 'email profile'` nên ra `SCOPE_email`, `SCOPE_profile`. Hết. Role của Keycloak nằm ở chỗ khác hẳn: realm role ở `realm_access.roles`, client role ở `resource_access.<clientId>.roles` (bài 8). Nguyên nhân gốc: OAuth chỉ chuẩn hoá `scope`, còn "role" không có trong RFC OAuth nào, nên mỗi IdP để role một chỗ và Spring không đoán.

Còn `hasRole("orders.read")` thực chất là `hasAuthority("ROLE_orders.read")`: Spring tự thêm tiền tố `ROLE_`. Nên converter phải sinh đúng chuỗi đó. Code lab, nguyên văn phần cốt lõi:

```java
@Bean
JwtAuthenticationConverter keycloakConverter() {
    JwtGrantedAuthoritiesConverter scopes = new JwtGrantedAuthoritiesConverter(); // SCOPE_openid, SCOPE_profile...
    Converter<Jwt, Collection<GrantedAuthority>> combined = jwt -> {
        List<GrantedAuthority> out = new ArrayList<>(scopes.convert(jwt));
        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        if (realmAccess != null && realmAccess.get("roles") instanceof Collection<?> roles) {
            roles.forEach(r -> out.add(new SimpleGrantedAuthority("ROLE_" + r)));
        }
        return out;
    };
    JwtAuthenticationConverter c = new JwtAuthenticationConverter();
    c.setJwtGrantedAuthoritiesConverter(combined);
    c.setPrincipalClaimName("preferred_username");
    return c;
}
```

Ba quyết định trong đoạn này:

- **Giữ converter scope cũ** (`scopes.convert(jwt)`) rồi cộng role vào. Thay hẳn thì `hasAuthority("SCOPE_profile")` ở `/api/profile` gãy.
- **Kiểm `null` và kiểu** trước khi đọc: token không có `realm_access` thì không ném `NullPointerException` (500) mà rơi về 403.
- **`setPrincipalClaimName("preferred_username")`** để `auth.getName()` ra `alice` thay vì `sub` (một UUID). Tiện cho log; nhưng làm khoá ngoại trong DB thì dùng `sub`, vì username là thứ admin đổi được còn `sub` thì không.

Converter gắn vào chain bằng `jwt.jwtAuthenticationConverter(...)` (mục 4, bước 2). Biết chắc nó đã chạy bằng log `DEBUG` của Spring Security, dòng thật:

```
Granted Authorities=[SCOPE_email, SCOPE_profile, ROLE_offline_access, ROLE_default-roles-lab, ROLE_uma_authorization, ROLE_orders.read]
Granted Authorities=[SCOPE_email, SCOPE_profile, ROLE_offline_access, ROLE_default-roles-lab, ROLE_uma_authorization]
```

Dòng đầu là alice, dòng sau là bob. Nếu chỉ thấy hai mục `SCOPE_` thì converter chưa được gắn, hoặc bị một bean khác đè.

Chỗ hay sai thứ hai: converter này chỉ map **realm role**. Bạn chuyển `orders.read` thành client role của `orders-api` như bài 8 khuyên thì converter lab không thấy nó, và 403 quay lại. Phải đọc thêm `resource_access.orders-api.roles`.

> **Đo trên lab.** `/api/me` với token bob trả authorities `["ROLE_default-roles-lab","ROLE_offline_access","ROLE_uma_authorization","SCOPE_email","SCOPE_profile"]`; `/api/profile` với bob (có `SCOPE_profile`) trả `200 {"user":"bob"}`; `/api/orders` với alice trả `200 [{"total":42.5,"id":1001,"owner":"alice"}]`. Đo lại: `curl -s --oauth2-bearer $(./tok.sh bob) localhost:8380/api/me`.

---

## ⏸ Dừng lại — đoán trước #3

Đã có converter, chưa có audience validator. Đoán mã HTTP cho bốn request vào `/api/orders`:

```
R1. Không có header Authorization
R2. Token bob (hợp lệ, không có role orders.read)
R3. Token alice, sửa 5 ký tự cuối chữ ký
R4. Token có header kid: fake-kid-xyz
```

---

### 3.5 401 và 403: lỗi ở bước nào của chain

Đáp án: R1 `401`, R2 `403`, R3 `401`, R4 `401`. Quy tắc nằm ở thứ tự xử lý.

<svg viewBox="0 0 760 270" role="img" aria-labelledby="kc12-b-t kc12-b-d" style="width:100%;height:auto">
<title id="kc12-b-t">Chỗ sinh ra 401 và 403 trong Spring resource server</title>
<desc id="kc12-b-d">Bốn bước nối tiếp: lấy Bearer từ header, decode và kiểm chữ ký theo kid, chạy validator iss và thời hạn, rồi converter và luật phân quyền; ba bước đầu thất bại trả 401, bước cuối thất bại trả 403 insufficient_scope, còn aud không có bước nào kiểm.</desc>
<defs>
<marker id="kc12-b-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0,0 L10,5 L0,10 z" fill="currentColor" fill-opacity="0.6"/>
</marker>
</defs>
<rect x="20" y="30" width="160" height="60" rx="8" fill="#3b82f6" fill-opacity="0.22"/>
<text x="100" y="54" text-anchor="middle" font-size="11" fill="currentColor">1. Có header</text>
<text x="100" y="72" text-anchor="middle" font-size="11" fill="currentColor">Authorization: Bearer?</text>
<rect x="210" y="30" width="160" height="60" rx="8" fill="#3b82f6" fill-opacity="0.22"/>
<text x="290" y="54" text-anchor="middle" font-size="11" fill="currentColor">2. Decode, tìm kid,</text>
<text x="290" y="72" text-anchor="middle" font-size="11" fill="currentColor">kiểm chữ ký</text>
<rect x="400" y="30" width="160" height="60" rx="8" fill="#3b82f6" fill-opacity="0.22"/>
<text x="480" y="54" text-anchor="middle" font-size="11" fill="currentColor">3. Validator:</text>
<text x="480" y="72" text-anchor="middle" font-size="11" fill="currentColor">iss, thời hạn</text>
<rect x="590" y="30" width="150" height="60" rx="8" fill="#84cc16" fill-opacity="0.22"/>
<text x="665" y="54" text-anchor="middle" font-size="11" fill="currentColor">4. Converter, rồi</text>
<text x="665" y="72" text-anchor="middle" font-size="11" fill="currentColor">hasRole / hasAuthority</text>
<line x1="180" y1="60" x2="208" y2="60" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc12-b-arrow)"/>
<line x1="370" y1="60" x2="398" y2="60" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc12-b-arrow)"/>
<line x1="560" y1="60" x2="588" y2="60" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc12-b-arrow)"/>
<line x1="100" y1="90" x2="100" y2="128" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc12-b-arrow)"/>
<line x1="290" y1="90" x2="290" y2="128" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc12-b-arrow)"/>
<line x1="480" y1="90" x2="480" y2="128" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc12-b-arrow)"/>
<line x1="665" y1="90" x2="665" y2="128" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc12-b-arrow)"/>
<rect x="20" y="130" width="160" height="56" rx="8" fill="#ef4444" fill-opacity="0.2"/>
<text x="100" y="152" text-anchor="middle" font-size="11" fill="currentColor">401</text>
<text x="100" y="170" text-anchor="middle" font-size="11" fill="currentColor">WWW-Authenticate: Bearer</text>
<rect x="210" y="130" width="160" height="56" rx="8" fill="#ef4444" fill-opacity="0.2"/>
<text x="290" y="152" text-anchor="middle" font-size="11" fill="currentColor">401 invalid_token</text>
<text x="290" y="170" text-anchor="middle" font-size="11" fill="currentColor">kid lạ: GET /certs trước</text>
<rect x="400" y="130" width="160" height="56" rx="8" fill="#ef4444" fill-opacity="0.2"/>
<text x="480" y="152" text-anchor="middle" font-size="11" fill="currentColor">401 invalid_token</text>
<text x="480" y="170" text-anchor="middle" font-size="11" fill="currentColor">aud: không có bước này</text>
<rect x="590" y="130" width="150" height="56" rx="8" fill="#f59e0b" fill-opacity="0.25"/>
<text x="665" y="152" text-anchor="middle" font-size="11" fill="currentColor">403</text>
<text x="665" y="170" text-anchor="middle" font-size="11" fill="currentColor">insufficient_scope</text>
<text x="380" y="222" text-anchor="middle" font-size="11" fill="currentColor">Bước 1-3 trả lời "bạn là ai, token có thật không" (authentication): sai thì 401.</text>
<text x="380" y="242" text-anchor="middle" font-size="11" fill="currentColor">Bước 4 trả lời "bạn được làm gì" (authorization): sai thì 403. Converter hỏng rơi vào đây.</text>
</svg>

Authentication và authorization bạn đã học ở `security/sec-05-authn-authz.md`; cái mới là chúng nằm ở bước nào của filter chain. Hỏng trước bước 4 thì Spring chưa biết caller là ai: 401. Tới bước 4 Spring đã tin token: thiếu authority là 403.

Kết quả lab, chỉ giữ cột quyết định:

| Request | Mã | Header `WWW-Authenticate` |
|---|---|---|
| Không token | 401 | `Bearer` (không có `error`) |
| Token bob, thiếu role | 403 | `error="insufficient_scope"` |
| Token alice sửa chữ ký | 401 | `error="invalid_token"`, `Signed JWT rejected: Invalid signature` |
| `kid` bịa (x5) | 401 | và 5 lần `GET /certs` |
| Token `aud: account` | 200 | không có lỗi nào |

Header dòng 3 nguyên văn: `error_description="An error occurred while attempting to decode the Jwt: Signed JWT rejected: Invalid signature"`. Header là chỗ chẩn đoán nhanh nhất: `invalid_token` là bước 2-3, `insufficient_scope` là bước 4. `Bearer` trơn không có `error` thường là thiếu token, nhưng cũng là thứ Spring trả khi chưa dựng được decoder (Keycloak chết lúc request đầu, 3.1): phải đọc log mới tách được hai ca.

Giờ đến cái bẫy trong triệu chứng. Spring dùng **một** mã lỗi RFC 6750 cho mọi kiểu thiếu quyền: thiếu `SCOPE_x` hay thiếu `ROLE_x` đều ra `insufficient_scope`. Chữ "scope" trong header không có nghĩa claim `scope` của token thiếu gì; nó là tên chung trong chuẩn cho "token hợp lệ nhưng không đủ quyền". Đồng nghiệp trong triệu chứng đọc theo nghĩa đen và đi sửa client scope trong Keycloak, trong khi lỗi nằm ở converter phía Spring.

Hệ quả cho giám sát: 401 tăng là chuyện khoá, issuer hoặc thời hạn; 403 tăng là luật, converter hoặc role vừa đổi. Gộp chung thành "auth errors" là mất thông tin chẩn đoán.

> **Nguồn.** Resource server bắt buộc hỗ trợ header Bearer: *"Resource servers MUST support this method."*; token hết hạn trả 401 với `error="invalid_token"` ([rfc6750](https://www.rfc-editor.org/rfc/rfc6750)). Việc Spring trả `insufficient_scope` cho cả thiếu role là quan sát lab, không phải câu trong docs.

---

## 4. Lab

Môi trường: Keycloak 26.8.1 node-a ở `:8180` (hostname chung `http://localhost:8180`), realm `lab` dựng bằng `setup-realm.sh`: realm role `orders.read`, user `alice` (có role) và `bob` (không), client `lab-cli` confidential có bật Direct Access Grants để lấy token bằng curl. Password grant chỉ dùng trong lab để khỏi dựng trình duyệt; bài 2 đã nói vì sao không dùng nó ở production.

**Bước 1: build và chạy.** `pom.xml` dùng parent `spring-boot-starter-parent:3.5.16`, hai dependency `spring-boot-starter-web` và `spring-boot-starter-oauth2-resource-server`, `java.version=21`. `application.yml` như mục 3.1, cộng ba logger DEBUG để thấy Spring gọi Keycloak lúc nào:

```yaml
logging:
  level:
    org.springframework.web.client.RestTemplate: DEBUG
    org.springframework.security.oauth2.server.resource: DEBUG
    org.springframework.security.web.access: DEBUG
```

```bash
cd ~/projects/keycloak-lab/lab2/orders-api && mvn -q package
java -jar target/orders-api-1.0.0.jar > ../spring.log 2>&1 &
```

Thấy: `Started ... in 0.647 seconds`, không có dòng `RestTemplate` nào. Vì sao: decoder lười (3.1).

**Bước 2: SecurityFilterChain.** Ngoài converter ở 3.4, phần chain:

```java
http
    .authorizeHttpRequests(auth -> auth
        .requestMatchers("/api/orders/**").hasRole("orders.read")      // tu realm_access.roles
        .requestMatchers("/api/profile").hasAuthority("SCOPE_profile") // tu claim "scope"
        .anyRequest().authenticated())
    .oauth2ResourceServer(rs -> rs.jwt(jwt -> jwt.jwtAuthenticationConverter(keycloakConverter())))
    .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
    .csrf(csrf -> csrf.disable()); // API stateless, chi nhan Bearer token
```

`STATELESS`: không tạo `HttpSession`. Tắt CSRF được vì API không đọc cookie; trình duyệt không tự gắn header `Authorization`.

**Bước 3: gọi bốn ca.**

```bash
TA=$(./tok.sh alice); TB=$(./tok.sh bob)
curl -si localhost:8380/api/orders | grep -i -e '^HTTP' -e www-auth
curl -si --oauth2-bearer $TA localhost:8380/api/orders
curl -si --oauth2-bearer $TB localhost:8380/api/orders | grep -i www-auth
curl -si --oauth2-bearer ${TA%?????}xxxxx localhost:8380/api/orders | grep -i www-auth
```

Thấy: `401` + `WWW-Authenticate: Bearer`; `200`; `403 insufficient_scope`; `401 invalid_token`. Vì sao: bảng 3.5. Trong `spring.log`, request Bearer đầu kéo theo đúng một discovery và một `/certs`, các request sau không gọi Keycloak.

**Bước 4: xoay khoá.** Thêm một key provider RSA priority cao hơn khoá đang dùng:

```bash
# Lệnh dựng lại theo mô tả lab (provider rsa-generated, priority 500); lab không lưu nguyên dòng lệnh.
kcadm.sh create components -r lab -s name=rsa-rotated -s providerId=rsa-generated \
  -s providerType=org.keycloak.keys.KeyProvider -s 'config.priority=["500"]'
TA=$(./tok.sh alice)   # token mới, kid mới 2180hRrK...
```

Thấy: request đầu với token mới kéo `GET /certs` lúc 13:56:56.616, 11 s sau lần trước, rồi `200`. Vì sao: `kid` không có trong cache thì refetch ngay, không chờ TTL.

**Bước 5: `kid` bịa.** Token chỉ cần đúng dạng ba đoạn base64url:

```bash
H=$(printf '{"alg":"RS256","kid":"fake-kid-xyz"}' | base64 | tr '+/' '-_' | tr -d '=')
FAKE="$H.$(echo $TA | cut -d. -f2).AAAA"
for i in 1 2 3 4 5; do curl -s -o /dev/null -w '%{http_code}\n' --oauth2-bearer $FAKE localhost:8380/api/orders; done
grep -c 'GET .*certs' ../spring.log   # đếm trước và sau
```

Thấy: 5 lần `401`, log tăng đúng 5 dòng `HTTP GET .../certs` trong khoảng 13:57:16.990 tới 13:57:17.029. Vì sao: `rateLimited(false)`.

**Bước 6: `aud`.** Token alice có `'aud': 'account'`, gửi vào `/api/orders`: `200`, log không nhắc gì tới audience. Đóng lỗ bằng hai nửa ở 3.3.

> **Đo trên lab.** Ngày 2026-10-15, Spring Boot 3.5.16 chạy cùng máy với 2 node Keycloak và Postgres (Mac mini M4, 10 core). Spring app RSS 151 MB. Mốc thời gian lấy từ `~/projects/keycloak-lab/lab2/spring.log`; TTL cache quan sát được: fetch 13:57:17, không fetch lúc 14:00:23, fetch lại lúc 14:04:05.

---

## 5. Tính tay

**Bài 1: cache JWKS theo thời gian.** `orders-api` một instance. `/certs` được fetch lần cuối lúc 10:00:00 (TTL 300 s, không refresh trước, không rate limit). Các sự kiện:

```
10:02:00  request token alice (kid K1)
10:04:30  admin thêm khoá K2 priority cao hơn; token cấp sau đó mang kid K2
10:04:40  request token kid K2
10:06:00  request token kid K1 (cấp lúc 10:04:00, còn hạn)
10:12:00  request token kid K2
```

Có bao nhiêu lần gọi `/certs`, vào lúc nào?

Lời giải. 10:02:00: K1 có trong cache, chưa quá TTL (120 s), không gọi. 10:04:40: K2 lạ, gọi ngay (lần 1), cache mới chứa K1 và K2, đồng hồ TTL đặt lại từ 10:04:40. 10:06:00: K1 có trong cache, 80 s sau lần fetch, không gọi. 10:12:00: đã 440 s kể từ 10:04:40, quá 300 s, gọi lại (lần 2). Tổng 2 lần. Khớp đúng mẫu lab: refetch 11 s sau lần trước khi gặp `kid` mới, và refetch lúc 408 s sau khi cache đã quá hạn.

Biến thể: nếu admin **xoá** K1 lúc 10:04:30 thay vì chỉ thêm K2, request 10:06:00 ra sao? K1 không còn trong cache mới (fetch lúc 10:04:40 lấy JWK Set đã thiếu K1), nên `kid` K1 là lạ, Spring fetch lại lần nữa, vẫn không thấy, trả 401, cho một token còn 4 phút sống. Xoá khoá cũ trước khi token cuối cùng nó ký hết hạn (300 s, mặc định trong code 26.8.1) là tự gây 401. Cách xoay khoá đúng để ở bài 29.

**Bài 2: khuếch đại tải.** Một SaaS B2B chạy `orders-api` 20 pod. Kẻ tấn công gửi 500 request/s vào mỗi pod, mỗi request một token `kid` bịa. Bao nhiêu request/s đổ vào `/certs` của Keycloak?

Lời giải. Spring 6.5 tắt rate limit, lab thấy 1 token `kid` bịa = 1 lần `/certs`. Vậy 20 x 500 = **10.000 request/s** vào Keycloak, từ một cuộc tấn công không cần biết bí mật nào. So với lúc bình thường: mỗi pod fetch tối đa 1 lần mỗi 300 s khi có traffic, 20 pod là 20/300 = **0,067 request/s**. Hệ số khuếch đại khoảng 150.000 lần.

Bật rate limit (3.2) thì mỗi pod fetch tối đa 1 lần mỗi 30 s (`DEFAULT_RATE_LIMIT_MIN_INTERVAL`): trần 20/30 = 0,67 request/s, dù kẻ tấn công gửi bao nhiêu. Lab khớp với trần đó: 100 token `kid` bịa trong 10 s ra 1 lần `/certs`, và lần fetch kế tiếp đến sau 33,6 s.

**Bài 3: đọc header ra nguyên nhân.** Sau một lần deploy, dashboard báo `orders-api`: 401 từ 0,1% lên 48%, 403 không đổi. Không ai đổi code Spring. Cụm Keycloak 2 node sau load balancer chia đều. Nguyên nhân khả dĩ nhất?

Lời giải. 401 là hỏng ở bước 1-3 (3.5); 403 không đổi loại trừ converter và luật. Gần một nửa request với LB chia đều 2 node gợi ý **một node** phát token Spring không nhận. Khoá lạ thì `kid` lạ được refetch, nên ứng viên hợp hơn là node đó chạy `--hostname` khác, `iss` lệch `issuer-uri` (lab cụm, 3.1). Kiểm: decode `iss` của vài token bị 401.

---

## 6. Chuyển giao

1. `orders-api` cần cho phép cả user có realm role `orders.read` lẫn service gọi bằng client credentials có client role `orders-api: orders.read`. Viết lại phần đọc claim trong converter. Token client credentials có `realm_access` không, và nếu không thì converter lab có ném lỗi không?

2. Đồng nghiệp đề xuất gửi refresh token cho API vì "nó sống lâu hơn, đỡ phải xin token mới". Spring sẽ trả gì khi nhận refresh token của Keycloak (gợi ý: thuật toán ký của nó và `kid` của nó có trong JWKS không), và vì sao về nguyên tắc refresh token không bao giờ tới resource server?

3. Bạn thêm audience validator nhưng quên làm nửa phía Keycloak. Deploy lúc 14:00, access token sống 300 s. Từ 14:00 tới 14:10, tỷ lệ 401 diễn biến thế nào? Nếu làm ngược lại (Keycloak trước, Spring sau) thì có giai đoạn nào lỗi không?

4. Sau 3.1, bạn muốn readiness probe của `orders-api` phản ánh việc API xác thực được token. Đề xuất một cách không biến probe thành nguồn tải mới lên Keycloak.

5. Bạn bật rate limit (3.2) để chặn khuếch đại tải. Kẻ tấn công biết điều đó và gửi token `kid` bịa đều đặn ngay trước mỗi lần bạn xoay khoá. Chuyện gì xảy ra với token hợp lệ mang `kid` mới trong khoảng đó, và bạn thiết kế quy trình xoay khoá cùng cấu hình decoder thế nào để vừa không bị khuếch đại tải vừa không có cửa sổ 401 nào cho user thật?

---

## 7. Tóm tắt

- `issuer-uri` làm ba việc: discovery ra `jwks_uri`, so `iss` bằng đúng chuỗi, và lùi mọi lần gọi Keycloak tới request Bearer đầu tiên (lab: app lên trong 0,647 s; request đầu mất 90 ms).
- Spring Security 6.5.11 dùng Nimbus với cache JWKS 300 s, không refresh trước, timeout 500 ms, **rate limit tắt**. Cache hết hạn chỉ làm mới khi có request.
- `kid` lạ thì refetch ngay (lab: 11 s sau lần trước), nên xoay khoá không phải chờ 5 phút. Chữ ký sai với `kid` đã biết thì không refetch.
- Mặt trái: 5 token `kid` bịa = 5 lần `GET /certs`. 20 pod x 500 request rác/s = 10.000 request/s vào Keycloak. Bật lại rate limit: 100 token bịa còn 1 lần `/certs`, đổi lại token `kid` mới bị 401 tới hết khoảng 30 s.
- Spring mặc định **không kiểm `aud`**: token `aud: account` vẫn 200. Sửa cần cả audience mapper phía Keycloak (bài 9) và `JwtClaimValidator` bọc cùng `createDefaultWithIssuer` phía Spring; bật validator trước thì mọi request 401 (`The aud claim is not valid`). Bean `fromIssuerLocation` gọi Keycloak lúc khởi động.
- Converter mặc định chỉ đọc `scope`/`scp` thành `SCOPE_*`. Role Keycloak ở `realm_access.roles` phải tự map thành `ROLE_*`, không thì `hasRole` luôn 403. Client role ở `resource_access` cần map riêng.
- 401 là hỏng ở authentication (thiếu token, chữ ký, `kid`, `iss`, thời hạn); 403 là token đã được tin nhưng thiếu authority. Spring trả `insufficient_scope` cho cả thiếu role, nên chữ "scope" trong header không chỉ ra claim `scope`.

→ **Bài 13 — Service-to-service**: `orders-api` giờ cần gọi tiếp `billing-api` nhân danh alice; token nào được gửi đi, `aud` của nó phải là gì, và client credentials hay token exchange giải bài này.
