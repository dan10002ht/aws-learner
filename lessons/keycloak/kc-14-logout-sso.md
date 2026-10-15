# Bài 14 — Logout và SSO nhiều app

## 1. Mục tiêu

Sau bài này bạn có thể:

- Chỉ ra cookie nào của Keycloak làm app thứ hai đăng nhập không cần mật khẩu, và vì sao cookie còn hạn vẫn ra form login.
- Viết đúng URL RP-initiated logout ở 26.8.1 (`id_token_hint`, `post_logout_redirect_uri`, `client_id`, `state`) và đoán trước response cho từng biến thể: 302, trang xác nhận 200, hay 400.
- Viết endpoint back-channel logout bằng Spring Security: decoder nhận `typ` `logout+jwt`, kiểm `aud`, `events`, không `nonce`, xoá theo `sid` (hoặc `sub` khi client không bật `sid`), trả 200 nhanh vì Keycloak đang chờ.
- Chọn front-channel hay back-channel cho từng client, và nêu đúng các tình huống front-channel không chạy.
- Tính cho từng app: sau khi user logout, app còn phục vụ user thêm bao lâu, theo kênh lan truyền nó có.

---

## 2. Triệu chứng

Một SaaS B2B có hai app dùng chung realm `sso`: `app-a` (portal) và `app-b` (billing). Cả hai là confidential client, login bằng authorization code.

QA báo hai lỗi. Một: bấm Logout ở portal rồi bấm Login lại thì vào thẳng dashboard, không thấy form mật khẩu. Nguyên nhân bài 11 đã chỉ: portal chỉ xoá session của nó, SSO session ở Keycloak còn sống. Hai: logout ở portal xong, tab billing vẫn chạy bình thường.

Dev sửa lỗi một theo một bài blog: nút Logout redirect sang `.../protocol/openid-connect/logout?redirect_uri=...`. Giờ user thấy trang Keycloak hỏi có muốn logout không, và trang đó không bao giờ quay về portal.

> **Đo trên lab (chạy riêng cho bài này).** Keycloak 26.8.1 `start-dev` cổng 8580, Java 24, Mac mini Apple M4. Login `app-a` bằng form, rồi dùng **cùng cookie jar** gọi `/auth` của `app-b`: **302 thẳng về callback kèm `code`**, không form (4.2). Logout kiểu `?redirect_uri=`: **200** trang `Logging out`, session vẫn còn.

---

## ⏸ Dừng lại — đoán trước #1

Alice login `app-a`. Admin logout alice bằng Admin API, không đụng trình duyệt: cookie SSO mà Keycloak đặt trong trình duyệt vẫn còn đó, chữ ký đúng, `exp` còn gần 10 giờ. Trình duyệt mở `/auth` của `app-a`. Keycloak trả gì?

```
(a) 302 kèm code: cookie ký đúng và còn hạn là đủ để bỏ qua form
(b) 200 form login
(c) 400: cookie trỏ tới session không tồn tại
(d) 302 kèm code, nhưng đổi code lấy token thì invalid_grant
```

---

## 3. Lý thuyết

### 3.1 SSO là một cookie trên domain của Keycloak

Đáp án là **(b)**. Để thấy vì sao, nhìn cookie đó trước. Nó nằm trên domain của Keycloak, nên portal không đọc được, không xoá được. Lab chép nguyên header. Ngoài ba cookie chỉ phục vụ màn hình login (`AUTH_SESSION_ID`, `KC_RESTART`, `KC_AUTH_SESSION_HASH`), POST mật khẩu đúng trả về hai cookie:

```
Set-Cookie: KEYCLOAK_IDENTITY=eyJhbGciOiJIUzUxMiIs...;Version=1;Path=/realms/sso/;Secure;HttpOnly;SameSite=None
Set-Cookie: KEYCLOAK_SESSION=O8v3bXt8u_FQ4wTj...;Version=1;Path=/realms/sso/;Max-Age=36000;Secure;SameSite=None
```

**`KEYCLOAK_IDENTITY`** là cookie SSO thật sự: một JWT ký **HS512** bằng khoá đối xứng của realm (cùng `kid` với khoá HS512 trong `kc get keys`, không có trong JWKS):

```json
{"exp":1792084893,"iat":1792048893,"iss":"http://localhost:8580/realms/sso",
 "sub":"50863f32-...","typ":"Serialized-ID","sid":"eEgx2uJ6HHPpCv7Bs_xj4jJl","state_checker":"UJM0..."}
```

`exp - iat` = 36.000 s, đúng SSO Session Max mặc định. Claim quan trọng là `sid`, id của user session phía server (bài 10). Khi `app-b` đưa trình duyệt tới `/auth`, trình duyệt gửi kèm cookie này vì URL nằm dưới `Path=/realms/sso/`. Keycloak kiểm chữ ký, lấy `sid`, thấy session còn sống, gắn thêm một client session cho `app-b` rồi trả code ngay. Admin API xác nhận: alice có **một** user session, `clients` gồm cả `app-a` và `app-b`. Cũng vì `Path=/realms/sso/`, SSO có phạm vi **một realm**.

Bản sai dễ tin từ đây: "cookie chính là session", tức phương án (a). Lab chạy đúng phép thử của hộp đoán: admin logout qua Admin API, gọi `/auth` của `app-a` bằng jar còn cookie: **200, form login**. Cookie chỉ là con trỏ; thứ quyết định là session phía server mà `sid` trỏ tới.

Từ đây "logout" tách ra ba tầng, mỗi tầng một chủ:

| Tầng | Nằm ở đâu | Ai xoá được |
|---|---|---|
| Session cục bộ của app đang bấm Logout | cookie + store của app đó | chính app đó |
| User session ở Keycloak và cookie `KEYCLOAK_IDENTITY` | Keycloak + trình duyệt, domain Keycloak | chỉ Keycloak (qua endpoint logout, admin, hoặc hết hạn) |
| Session cục bộ của **các app khác** và token chúng đã nhận | server của từng app, token trong tay từng app | từng app, sau khi được ai đó báo |

Lỗi một của QA: chỉ xoá tầng 1. Lỗi hai: tầng 3 không ai báo.

> **Suy luận.** Nguồn của course không mô tả cookie SSO; mục này là quan sát header trên lab 26.8.1, có thể đổi giữa các phiên bản. "Keycloak tra session theo `sid` trong cookie" suy từ hai quan sát: `sid` trong cookie trùng `sid` của token, và cookie còn hạn bị từ chối ngay khi session bị xoá.

### 3.2 RP-initiated logout: app nhờ Keycloak xoá tầng 2

**RP-initiated logout** là chuẩn OIDC cho việc app (Relying Party, RP) đưa trình duyệt tới `end_session_endpoint` của IdP để kết thúc phiên ở IdP, rồi được đưa về một URL của app. Ở Keycloak endpoint đó là `/realms/{realm}/protocol/openid-connect/logout` (có trong discovery, bài 3).

Phải là trình duyệt đi tới đó, vì cookie `KEYCLOAK_IDENTITY` nằm trong trình duyệt: chỉ khi trình duyệt gọi endpoint logout thì Keycloak mới gửi được `Set-Cookie ... Max-Age=0`. Lab:

```
HTTP/1.1 302 Found
Set-Cookie: KEYCLOAK_IDENTITY=;Version=1;Path=/realms/sso/;Max-Age=0
Set-Cookie: KEYCLOAK_SESSION=;Version=1;Path=/realms/sso/;Max-Age=0
Location: http://localhost:8581/a/bye?state=lo1
```

Bốn tham số: **`id_token_hint`** (ID token app nhận lúc login, cho Keycloak biết phiên nào, client nào xin logout; spec xếp RECOMMENDED), **`post_logout_redirect_uri`** (nơi quay về, so với `post.logout.redirect.uris` của client như so `redirect_uri` ở bài 7, để endpoint logout không thành công cụ open redirect), **`client_id`** (nói client nào khi không có ID token), **`state`** (trả lại nguyên để app nối response với request).

Bản sai trong triệu chứng là `?redirect_uri=`, cách logout riêng của Keycloak đời cũ, bị xoá ở 26.0.0. Ở 26.8.1 nó không gây lỗi mà bị **bỏ qua**; request còn lại không có `id_token_hint` nên ra trang xác nhận, trang không bao giờ quay về portal.

Lab chạy năm biến thể:

| Request `GET /logout?...` | Response | Session sau đó |
|---|---|---|
| `id_token_hint` + `post_logout_redirect_uri` hợp lệ + `state=lo1` | **302** `.../a/bye?state=lo1`, xoá 2 cookie | xoá |
| `client_id=app-a` + `post_logout_redirect_uri`, không hint | **200** trang `Logging out` có nút xác nhận | **còn**, tới khi user bấm nút (bấm: 302 về `bye?state=lo3`) |
| `redirect_uri=...` (kiểu cũ) | **200** cùng trang xác nhận | còn |
| `post_logout_redirect_uri` không kèm `client_id` lẫn hint | **400** `Missing parameters: id_token_hint` | còn |
| `id_token_hint` + `post_logout_redirect_uri=http://evil.com/` | **400** `Invalid redirect uri`, không redirect | còn |

Sao dòng hai không logout luôn khi đã biết client?

> **Suy luận.** `client_id` công khai: ai cũng nhét được `/logout?client_id=app-a` vào thẻ `<img>` trên một trang bất kỳ để đăng xuất user của bạn; `id_token_hint` thì chỉ app đã nhận ID token của phiên đó mới có. Nguồn chỉ nói không có hint thì user *có thể* bị hỏi xác nhận; động cơ chống "logout CSRF" là suy luận. Lab xác nhận hành vi (200, session còn), không xác nhận động cơ.

`POST /logout` từ server kèm `refresh_token` (lab 1: **204**) là định dạng legacy: xoá session nhưng **không** xoá được cookie trong trình duyệt.

> **Nguồn.** Server Admin Guide: *"Note that you need to include either the client_id or id_token_hint parameter in case the post_logout_redirect_uri is included."* và *"The user might be optionally requested to confirm the logout in case the id_token_hint parameter was not used."* ([rp-initiated-logout](https://www.keycloak.org/docs/latest/server_admin/index.html#rp-initiated-logout)). OIDC RP-Initiated Logout: *"id_token_hint RECOMMENDED. ID Token previously issued by the OP to the RP passed to the Logout Endpoint as a hint about the End-User's current authenticated session with the Client."* ([rpinitiated](https://openid.net/specs/openid-connect-rpinitiated-1_0.html)). Upgrading Guide về `redirect_uri`: *"This functionality was deprecated in Keycloak 18 and has been removed in this version in favor of following the OpenID Connect specification."* ([upgrading](https://www.keycloak.org/docs/latest/upgrading/index.html)). Logout kèm refresh token: *"However this is non-standard legacy format of the logout message supported only because of the legacy Keycloak OIDC Java adapters"* ([oidc-layers](https://www.keycloak.org/securing-apps/oidc-layers)).

---

## ⏸ Dừng lại — đoán trước #2

Cả `app-a` và `app-b` đều cấu hình Backchannel logout URL trỏ về server của mình. User bấm Logout ở `app-a`, trình duyệt đi tới `/logout?id_token_hint=...`. Server của các app nhận được gì, và lúc nào so với lúc trình duyệt nhận 302?

```
(a) app-b nhận 1 POST, sau khi trình duyệt đã nhận 302 (Keycloak gửi nền)
(b) Cả app-b và app-a nhận POST, cả hai trước khi trình duyệt nhận 302
(c) Không ai nhận gì: back-channel chỉ chạy khi admin logout user
(d) Chỉ app-b nhận POST, trước khi trình duyệt nhận 302
```

---

### 3.3 Back-channel logout: Keycloak gọi thẳng server của từng app

Đáp án là **(b)**.

**Back-channel logout** là chuẩn OIDC trong đó IdP, khi một phiên kết thúc, POST thẳng từ server của nó tới URL đăng ký của từng RP một JWT gọi là **logout token**. Không qua trình duyệt, nên không phụ thuộc trình duyệt có mở hay có chặn cookie.

Lab đặt listener Python ở cổng 8581 làm server của cả hai app. Một lần RP-initiated logout từ `app-a`:

```
+0.0519 s  POST /b/backchannel-logout  application/x-www-form-urlencoded  Apache-HttpClient/4.5.14 (Java/24.0.2)
+0.0556 s  POST /a/backchannel-logout  application/x-www-form-urlencoded  Apache-HttpClient/4.5.14 (Java/24.0.2)
curl: request logout xong sau 0.091 s -> 302
```

Chi tiết một: **`app-a` cũng nhận**, dù chính nó khởi xướng. Endpoint phải coi logout cho một session đã tự xoá là bình thường: trả 200, không 404.

Chi tiết hai: cả hai POST tới **trước** khi trình duyệt nhận 302, tức logout đứng chờ các cuộc gọi này. Bảng "app hỏng" bên dưới đo cái giá.

Body là `logout_token=<JWT>`. Decode cái gửi cho `app-b`:

```json
header:  {"alg":"RS256","typ":"logout+jwt","kid":"zeYovTCb069LiGhmO2jXJzoNBkrEI_Y_OaMb6BYWwek"}
payload: {"exp":1792049036,"iat":1792048916,"jti":"55aa955d-...","iss":"http://localhost:8580/realms/sso",
          "aud":"app-b","sub":"50863f32-...","typ":"Logout","sid":"eEgx2uJ6HHPpCv7Bs_xj4jJl",
          "events":{"http://schemas.openid.net/event/backchannel-logout":{}}}
```

Ký **RS256** bằng đúng khoá ký access token (cùng `kid`); lab verify bằng public key từ `/certs`: hợp lệ. App verify logout token bằng chính JWKS đã cache cho access token (bài 12). `exp - iat` = 120 s. `aud` là client nhận, nên token của `app-b` không dùng được ở `app-a`. Không có `nonce`, đúng như spec cấm.

URL back-channel là endpoint công khai, không có xác thực nào khác ngoài chính token, nên app kiểm theo thứ tự trong đoạn code dưới. Bước 3 chặn một kiểu lạm dụng ít ai nghĩ tới: đem một ID token (cũng RS256, cùng `iss`, cũng có `sid`) gửi vào đây; ID token có `nonce` và không có `events`.

Bước 5 là chỗ hay thiếu: app phải **lưu `sid` lúc login** (claim `sid` trong ID token). Logout token không mang cookie hay session id của app, chỉ mang `sid` và `sub` của Keycloak. Và `sid` chỉ có khi client bật `backchannel.logout.session.required`. Lab 4.1 đặt `true`; client tạo qua `kcadm`/Admin REST mà không đặt attribute này thì token **không có `sid`**, y như đặt `false` (bảng ở 4.6). Lúc đó app chỉ còn `sub`, tức chỉ xoá được mọi session của user đó trên mọi thiết bị.

```java
// Đã chạy trên lab (critic): Spring Boot 3.5.16, Spring Security 6.5.11. Bỏ: import, hằng số, các map.
@Bean JwtDecoder logoutTokenDecoder() {
    NimbusJwtDecoder d = NimbusJwtDecoder.withIssuerLocation(ISS).validateType(false).build();
    d.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
        JwtValidators.createDefaultWithIssuer(ISS), new JwtTypeValidator("logout+jwt")));
    return d;
}
@PostMapping(path = BACKCHANNEL_PATH, consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
ResponseEntity<Void> backchannelLogout(@RequestParam(LOGOUT_TOKEN) String raw) {
    Jwt t = logoutTokenDecoder.decode(raw);                     // 1. chữ ký JWKS + iss + exp + typ
    if (!t.getAudience().contains(MY_CLIENT_ID)) return ResponseEntity.badRequest().build(); // 2. aud
    Map<String, Object> ev = t.getClaimAsMap(EVENTS);
    if (ev == null || !ev.containsKey(BACKCHANNEL_EVENT) || t.hasClaim(NONCE))
        return ResponseEntity.badRequest().build();             // 3. đúng loại token
    if (seenJti.putIfAbsent(t.getId(), t.getExpiresAt()) != null) return ResponseEntity.ok().build(); // 4. lặp (*)
    String sid = t.getClaimAsString(SID);                       // 5. không có sid: xoá theo sub
    Set<String> local = sid != null ? sessionsBySid.remove(sid) : sessionsBySub.remove(t.getSubject());
    if (local != null) local.forEach(sessionStore::remove);
    return ResponseEntity.ok().build();                         // trả ngay, Keycloak đang chờ
}
```

(*) Nhớ `jti` tới `exp` (120 s) là thiết kế của bài, không phải spec bắt: 30 lượt logout/s là 30 × 120 = 3.600 entry. Gửi lặp chỉ xoá lại session đã xoá, nên app idempotent bỏ được bước này. Bước 1 không dùng được decoder của bài 12, vì header `typ` của logout token là `logout+jwt`.

> **Đo trên lab (critic, 26.8.1).** Keycloak cổng 5700 POST thật vào app Spring Boot 3.5.16 / Spring Security 6.5.11. Decoder mặc định (`JwtDecoders.fromIssuerLocation` lẫn `NimbusJwtDecoder.withIssuerLocation(iss).build()`) từ chối mọi logout token: `JOSE header typ (type) logout+jwt not allowed`. Decoder ở trên nhận; ID token đưa vào nó bị chặn ngay bước 1 (`the given typ value needs to be one of [logout+jwt]`), bước 3 thành lớp chặn thứ hai. Bản đầu gọi `ConcurrentHashMap.remove(sid)` với token không có `sid`: `NullPointerException`, app trả 500, Keycloak im lặng (bảng dưới). Output: `~/projects/keycloak-lab/critic-ch3b/RESULTS.txt`.

**Bản sai: "back-channel đáng tin, Keycloak đảm bảo app nhận được".** Lab cho listener cư xử tệ theo bốn cách:

| Listener | Response logout trình duyệt nhận | Log Keycloak | Session ở Keycloak |
|---|---|---|---|
| trả 200 ngay | 302 sau 0,091 s | không gì | xoá |
| trả **500** | 302 | **không gì**, không gửi lại | xoá |
| port đóng | 302 sau 0,0095 s | `WARN KC-SERVICES0057: Logout for client 'app-b' failed: ... Connection refused` | xoá |
| treo 3 s mỗi request | 302 sau **6,03 s**; hai POST cách nhau 3,0 s | không gì | xoá |
| treo 20 s mỗi request | 302 sau **10,02 s** | `KC-SERVICES0057 ... SocketTimeoutException: Read timed out` cho từng app, cách nhau 5,006 s | xoá |

Đọc bảng theo nguyên nhân. Keycloak luôn xoá session của nó bất kể app trả gì, nên logout ở IdP không bao giờ kẹt vì một app hỏng. Đổi lại, lời báo cho tầng 3 là **gửi một lần, không thử lại**: app chết đúng lúc đó thì session cục bộ sống tiếp, còn app trả 500 thì đến log cũng im. Và vì Keycloak gọi **tuần tự, đồng bộ**, mỗi app treo cộng thẳng vào thời gian user nhìn màn hình trắng, tối đa khoảng 5 s mỗi app.

> **Suy luận.** Không nguồn nào của course nêu timeout back-channel hay cách cấu hình nó. "Khoảng 5 s" suy từ hai dòng WARN cách nhau 5,006 s; "tuần tự" suy từ hai POST cách nhau 3,0 s dù listener đa luồng, và từ stack trace (`browserLogoutAllClients` gọi `ArrayList.forEach`). Kiểm bằng: ba client cùng treo 20 s, tổng có gần 15 s không.

<svg viewBox="0 0 720 410" role="img" aria-labelledby="kc14-a-t kc14-a-d" style="width:100%;height:auto">
<title id="kc14-a-t">Sequence back-channel logout đo trên lab</title>
<desc id="kc14-a-d">Trình duyệt bấm Logout ở app-a, được redirect tới endpoint logout của Keycloak kèm id_token_hint; Keycloak xoá user session, gửi POST logout_token lần lượt tới app-b sau 52 ms và app-a sau 56 ms, chờ cả hai trả 200, rồi mới trả 302 về trang bye của app-a và xoá cookie KEYCLOAK_IDENTITY.</desc>
<defs>
<marker id="kc14-a-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker>
</defs>
<rect x="30" y="16" width="120" height="30" rx="8" fill="#64748b" fill-opacity="0.25"/>
<text x="90" y="36" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor">Trình duyệt</text>
<rect x="190" y="16" width="120" height="30" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="250" y="36" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor">app-a (portal)</text>
<rect x="370" y="16" width="120" height="30" rx="8" fill="#8b5cf6" fill-opacity="0.25"/>
<text x="430" y="36" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor">Keycloak</text>
<rect x="550" y="16" width="120" height="30" rx="8" fill="#84cc16" fill-opacity="0.25"/>
<text x="610" y="36" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor">app-b (billing)</text>
<line x1="90" y1="46" x2="90" y2="372" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<line x1="250" y1="46" x2="250" y2="372" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<line x1="430" y1="46" x2="430" y2="372" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<line x1="610" y1="46" x2="610" y2="372" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<text x="170" y="74" text-anchor="middle" font-size="10.5" fill="currentColor">1. bấm Logout</text>
<line x1="90" y1="80" x2="248" y2="80" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc14-a-arrow)"/>
<text x="170" y="104" text-anchor="middle" font-size="10.5" fill="currentColor">2. 302 tới /logout?id_token_hint=...</text>
<line x1="250" y1="110" x2="92" y2="110" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#kc14-a-arrow)"/>
<text x="260" y="136" text-anchor="middle" font-size="10.5" fill="currentColor">3. GET /logout + cookie KEYCLOAK_IDENTITY (t = 0)</text>
<line x1="90" y1="142" x2="428" y2="142" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc14-a-arrow)"/>
<rect x="372" y="156" width="116" height="34" rx="6" fill="#ef4444" fill-opacity="0.18"/>
<text x="430" y="171" text-anchor="middle" font-size="10" fill="currentColor">4. xoá user session</text>
<text x="430" y="184" text-anchor="middle" font-size="10" fill="currentColor">sid=eEgx2uJ6...</text>
<text x="520" y="208" text-anchor="middle" font-size="10.5" fill="currentColor">5. POST logout_token, +52 ms</text>
<line x1="430" y1="214" x2="608" y2="214" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc14-a-arrow)"/>
<text x="520" y="236" text-anchor="middle" font-size="10.5" fill="currentColor">6. 200</text>
<line x1="610" y1="242" x2="432" y2="242" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#kc14-a-arrow)"/>
<text x="340" y="266" text-anchor="middle" font-size="10.5" fill="currentColor">7. POST logout_token, +56 ms</text>
<line x1="430" y1="272" x2="252" y2="272" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc14-a-arrow)"/>
<text x="340" y="294" text-anchor="middle" font-size="10.5" fill="currentColor">8. 200</text>
<line x1="250" y1="300" x2="428" y2="300" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#kc14-a-arrow)"/>
<text x="260" y="326" text-anchor="middle" font-size="10.5" fill="currentColor">9. 302 về /a/bye?state=lo1, xoá cookie (t = 91 ms)</text>
<line x1="430" y1="332" x2="92" y2="332" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#kc14-a-arrow)"/>
<rect x="488" y="262" width="224" height="56" rx="6" fill="#f59e0b" fill-opacity="0.18"/>
<text x="600" y="280" text-anchor="middle" font-size="10" fill="currentColor">Bước 5 đến 8: đồng bộ, tuần tự.</text>
<text x="600" y="294" text-anchor="middle" font-size="10" fill="currentColor">App treo: chờ khoảng 5 s mỗi app.</text>
<text x="600" y="308" text-anchor="middle" font-size="10" fill="currentColor">App trả 500: không gửi lại.</text>
<text x="360" y="396" text-anchor="middle" font-size="10.5" fill="currentColor">Bước 4 luôn xảy ra; bước 5 đến 8 là gửi một lần, best-effort.</text>
</svg>

> **Nguồn.** OIDC Back-Channel Logout: *"The POST body uses the application/x-www-form-urlencoded encoding and must include a logout_token parameter containing a Logout Token from the OP for the RP identifying the End-User to be logged out."*, *"A Logout Token MUST contain either a sub or a sid Claim, and MAY contain both."*, *"nonce PROHIBITED. A nonce Claim MUST NOT be present."*, *"If the logout succeeded, the RP MUST respond with HTTP 200 OK."* ([backchannel](https://openid.net/specs/openid-connect-backchannel-1_0.html)).

---

## ⏸ Dừng lại — đoán trước #3

Đổi `app-b` sang **front-channel logout** (bật Front channel logout, đặt Front-channel logout URL). Lặp lại đúng lệnh `curl` RP-initiated logout từ `app-a`. Server của `app-b` nhận được gì?

```
(a) Một GET tới Front-channel logout URL, do Keycloak gọi
(b) Một POST back-channel như cũ, vì URL back-channel vẫn còn trong cấu hình
(c) Không gì cả
(d) Cả GET front-channel lẫn POST back-channel
```

---

### 3.4 Front-channel logout: nhờ trình duyệt đi báo

Đáp án là **(c)**. **Front-channel logout** là chuẩn OIDC trong đó IdP không tự gọi RP; nó trả cho trình duyệt một trang HTML chứa `<iframe>` trỏ tới logout URL của từng RP, và chính trình duyệt tải các iframe đó. `curl` không render HTML nên không iframe nào được tải.

Lab thấy response đổi dạng: thay vì 302 là **200**, 4.252 byte HTML, cốt lõi:

```html
<p>You are logging out from following apps</p>
<li> app-b
  <iframe src="http://localhost:8581/b/frontchannel-logout?sid=PhDQsKBOoKF2lxanwHZcvZtU&iss=http%3A%2F%2Flocalhost%3A8580%2Frealms%2Fsso" style="display:none;"></iframe>
</li>
<!-- script rút gọn: khi document.readyState == complete thì window.location.replace(.../a/bye?state=lo2) -->
```

Iframe mang `sid` và `iss` trên URL, nên `app-b` vẫn cần map `sid` → session như ở 3.3. Redirect về `app-a` chờ trang `complete`, tức chờ iframe tải xong hoặc hỏng. `app-b` **không** nhận POST back-channel nữa dù URL vẫn trong cấu hình: hai kênh loại trừ nhau trên một client. Session ở Keycloak vẫn bị xoá (refresh của `app-b` sau đó: `invalid_grant`).

Front-channel chỉ chạy khi có **một trình duyệt thật đang mở trang logout của Keycloak và tải được iframe của từng app**. Nó gãy khi:

- **Logout không qua trình duyệt**: admin, Account Console (docs nói rõ không hỗ trợ), `POST /logout` từ server, session hết hạn.
- **CSP** chặn nhúng iframe, docs nêu đúng rủi ro này.
- **Trình duyệt chặn cookie bên thứ ba**: trong iframe, `app-b` là bên thứ ba. Nếu `app-b` tìm session cần xoá **bằng cookie của nó**, cookie không được gửi kèm và `app-b` không biết xoá gì.
- **User đóng tab** trước khi iframe tải xong.

> **Suy luận.** Nguồn của course chỉ nêu CSP; ca cookie bên thứ ba suy từ cách iframe hoạt động, chưa đo trên trình duyệt thật. Suy thêm: app tra session theo `sid` trên URL thì vẫn xoá được session phía server dù cookie bị chặn; cái mất chỉ là xoá cookie trên trình duyệt. Kiểm bằng: hai app trên hai domain, trình duyệt chặn cookie bên thứ ba, logout, xem request iframe có header `Cookie` không.

So sánh, sau khi đã thấy cơ chế:

| | Back-channel | Front-channel | Không cấu hình gì |
|---|---|---|---|
| Ai mang tin tới app | server Keycloak, POST | trình duyệt, GET trong iframe | không ai |
| Chạy khi admin / Account Console logout | ✓ | ✗ | ✗ |
| Chạy khi logout bằng `curl`, app mobile, server | ✓ | ✗ | ✗ |
| Phụ thuộc CSP, cookie bên thứ ba, user giữ tab | ✗ | ✓ | không áp dụng |
| Server Keycloak phải gọi tới được mạng của app | ✓ (lab: port đóng thì app không biết) | ✗ | ✗ |
| App biết logout khi nào | lúc logout | lúc logout, nếu iframe chạy | lần refresh kế tiếp |

Dòng "phải gọi tới được mạng của app" là lý do thật để vẫn dùng front-channel: app nằm trong mạng Keycloak không có đường vào thì back-channel không có đích. App nào Keycloak gọi tới được thì back-channel thắng ở mọi dòng của bảng; cái giá nằm ngoài bảng: app treo làm nút Logout chờ (5.2).

Cột cuối là mặc định: app chạy tiếp bằng access token còn hạn (lab 4.4: còn **265,3 s** sau logout) và biết user đã logout ở lần refresh kế tiếp; vì sao resource server verify offline vẫn nhận token đó là bài 4 và bài 10. Back-channel cũng không rút được cửa sổ này cho API stateless: logout token đến server của app, không đến từng resource server đang verify JWT.

> **Nguồn.** Front-channel, OIDC: *"The OP renders <iframe src="frontchannel_logout_uri"> in a page with the registered logout URI as the source to trigger the logout actions by the RP."* ([frontchannel](https://openid.net/specs/openid-connect-frontchannel-1_0.html)). Server Admin Guide: *"By being based on iframes, front-channel logout might be impacted by Content Security Policies (CSP) and logout requests might be blocked."*, *"Other client applications may just rely on the short Access token lifespan timeout."* ([front-channel-logout](https://www.keycloak.org/docs/latest/server_admin/index.html#front-channel-logout)); ca admin/Account Console: *"This scenario is not supported in case of Front-Channel logout"* ([backchannel-logout](https://www.keycloak.org/docs/latest/server_admin/index.html#backchannel-logout)); hai kênh loại trừ: *"This option is applicable just if Front channel logout option is OFF."* ([logout-settings](https://www.keycloak.org/docs/latest/server_admin/index.html#logout-settings)).

---

## 4. Lab

> **Đo trên lab (chạy riêng cho bài này).** Keycloak 26.8.1 `start-dev` cổng 8580, Java 24, Mac mini Apple M4, 2026-10-15. Listener `python3 http.server` (`ThreadingHTTPServer`) cổng 8581 đóng vai server của cả hai app, ghi mọi request ra file. Script và output thô: `~/projects/keycloak-lab/lab-kc14/`. Số thời gian là localhost một máy, chỉ là bậc độ lớn.

### 4.1 Hai client có back-channel

```bash
kc create realms -s realm=sso -s enabled=true
for c in a b; do
  kc create clients -r sso -s clientId=app-$c -s publicClient=false -s secret=$c-secret \
    -s standardFlowEnabled=true -s "redirectUris=[\"http://localhost:8581/$c/cb\"]" -s frontchannelLogout=false \
    -s "attributes={\"backchannel.logout.url\":\"http://localhost:8581/$c/backchannel-logout\",
        \"backchannel.logout.session.required\":\"true\",\"post.logout.redirect.uris\":\"http://localhost:8581/$c/bye\"}"
done
```

Thấy: ba attribute quyết định cả bài: danh sách để so `post_logout_redirect_uri`, đích POST, và cờ để logout token mang `sid`. `frontchannelLogout=false` đặt tường minh vì nếu `true` thì URL back-channel bị bỏ qua (3.4).

### 4.2 SSO: app thứ hai không hỏi mật khẩu

`login.sh a jar1` rồi `login.sh b jar1` (cùng cookie jar), chỉ giữ dòng quyết định:

```
GET /auth app-a -> HTTP/1.1 200 OK        (form login; Set-Cookie AUTH_SESSION_ID, KC_RESTART, KC_AUTH_SESSION_HASH)
POST login      -> HTTP/1.1 302 Found     (Set-Cookie KEYCLOAK_IDENTITY, KEYCLOAK_SESSION)
GET /auth app-b -> HTTP/1.1 302 Found     Location: .../b/cb?state=sb&session_state=eEgx2uJ6HHPpCv7Bs_xj4jJl&...&code=...
a id.sid eEgx2uJ6HHPpCv7Bs_xj4jJl id.aud app-a auth_time 1792048893 iat 1792048894
b id.sid eEgx2uJ6HHPpCv7Bs_xj4jJl id.aud app-b auth_time 1792048893 iat 1792048899
```

Vì sao: `auth_time` trùng nhau nói lần xác thực thật duy nhất là lúc 1792048893; `app-b` chỉ nhận thêm một client session trong session đó.

### 4.3 RP-initiated logout và logout token thật

```bash
curl -s -D hdr_logout.txt -c jar1 -b jar1 \
  "$B/logout?id_token_hint=$IDT_A&post_logout_redirect_uri=http%3A%2F%2Flocalhost%3A8581%2Fa%2Fbye&state=lo1"
```

Header và hai POST đã chép ở 3.2, 3.3. Kiểm chữ ký logout token bằng JWKS (RSA thuần như `verify.py` của lab 1):

```
logout_token RS256 valid: True kid match zeYovTCb069LiGhmO2jXJzoNBkrEI_Y_OaMb6BYWwek
```

### 4.4 Sau logout, token của app-b

```
AT_b exp-now 265.3 aud account
userinfo:  HTTP/1.1 401 Unauthorized
           WWW-Authenticate: Bearer realm="sso", error="invalid_token", error_description="user_session_not_found"
refresh:   {"error":"invalid_grant","error_description":"Session not active"}
sessions còn lại của alice: 0
```

### 4.5 App hỏng: 500, port đóng, treo

Bảng 3.3 lấy từ bốn lần chạy lại listener (`STATUS=500`, tắt hẳn, `DELAY=3`, `DELAY=20`), mỗi lần login lại hai app rồi logout từ `app-a`. Hai dòng WARN `Read timed out` ghi lúc `14:23:17,316` và `14:23:22,322`; output thô trong `kc.log`, `listener.log` của lab.

### 4.6 Logout từ admin, và front-channel

```bash
kc create users/$ALICE_ID/logout -r sso -s realm=sso -s user=$ALICE_ID
# listener: /b/backchannel-logout {'aud': 'app-b', 'sid': 'bJ9F48X6eCgvdcMEnViDEyCg'}
#           /a/backchannel-logout {'aud': 'app-a', 'sid': 'bJ9F48X6eCgvdcMEnViDEyCg'}
curl -s -o /dev/null -w '%{http_code}\n' -b jar7 "$B/auth?client_id=app-a&..."   # 200: form login dù jar còn cookie
kc update clients/$APP_B -r sso -s frontchannelLogout=true \
   -s 'attributes."frontchannel.logout.url"=http://localhost:8581/b/frontchannel-logout'
# logout lại bằng curl: HTTP/1.1 200 OK, 4252 byte HTML; listener chỉ nhận POST /a/backchannel-logout
```

Vì sao: dòng đầu xác nhận back-channel phục vụ cả logout không qua trình duyệt; dòng cuối là đáp án hộp đoán #3.

Critic chạy thêm một realm có năm client cùng trỏ back-channel về app Spring ở 3.3; alice login `a`, `b`, `d`, `e`, không login `c`, rồi RP-initiated logout từ `a`:

| Client | `backchannel.logout.session.required` | Nhận POST | Claim trong logout token |
|---|---|---|---|
| `app-a`, `app-b` | `true` | ✓ | có `sid` |
| `app-d` | không đặt (tạo bằng `kcadm`) | ✓ | **không** `sid`, chỉ `sub` |
| `app-e` | `false` | ✓ | không `sid` |
| `app-c` | `true`, nhưng alice chưa login | ✗ | |

Vì sao: Keycloak chỉ báo cho client có client session trong user session đó, và client tạo qua API không tự có cờ `sid`.

---

## 5. Tính tay

### 5.1 Ba app, một lần logout, ba cửa sổ

Cùng một trình duyệt, alice dùng ba client trong một user session:

- `portal`: BFF (bài 11), giữ session ở server, có back-channel, map `sid` → session.
- `billing`: SPA gọi `billing-api` (verify JWT offline), không kênh logout nào, refresh lười; lần refresh cuối 09:58:20.
- `reports`: BFF chỉ có front-channel, tìm session cần xoá **bằng cookie**; session cục bộ sống 8 giờ từ login 09:00; mỗi trang gọi API bằng access token lấy lúc 09:59:00.

10:00:00 alice bấm Logout ở `portal` (RP-initiated, có `id_token_hint`), trên trình duyệt chặn cookie bên thứ ba.

**portal.** POST back-channel tới sau vài chục ms (lab: 52 ms). Session xoá. Cửa sổ ≈ 0.

**billing.** Không ai báo. Access token cấp 09:58:20 có `exp` 10:03:20, `billing-api` trả 200 tới **10:03:20**. Request kế tiếp: 401, refresh, `invalid_grant`, redirect `/auth`, form login (cookie SSO đã bị xoá ở bước 9). Cửa sổ **200 s**.

**reports.** Iframe được tải nhưng cookie của `reports` không được gửi kèm, nên nó không biết xoá session nào. Access token của BFF lấy 09:59:00, `exp` 10:04:00: trang chạy tới **10:04:00**, rồi refresh ra `invalid_grant`. BFF xoá session của chính nó khi gặp `invalid_grant` thì cửa sổ **240 s**. Nếu nó chỉ báo lỗi cho trang đó và giữ session (trang không cần API vẫn render), alice còn "đăng nhập" ở `reports` tới **17:00:00**: **7 giờ**.

Front-channel cấu hình đúng mà tìm session bằng cookie, trong ca này, kém hơn không cấu hình gì nhưng xử lý `invalid_grant` đúng. Sửa rẻ nhất: tra session theo `sid` trên URL iframe.

Biến thể: 10:00:00 admin logout alice thay vì alice tự bấm. Không có trang logout nào trong trình duyệt, nên front-channel không chạy với **mọi** trình duyệt. `portal` vẫn ≈ 0; `billing`, `reports` như trên.

### 5.2 Nút Logout mất bao lâu

Một user session có client session ở 6 app, cả 6 dùng back-channel. Lab đo cả request logout với 2 app là 91 ms; lấy bậc độ lớn 100 ms cho 6 app.

Thứ Sáu, app `export` đang deploy: load balancer nhận TCP nhưng pod mới chưa trả lời. Keycloak chờ tới timeout khoảng 5 s rồi đi tiếp. User chờ khoảng **5,1 s**.

Hai app như vậy: **10,1 s**. Ba app: **15,1 s**. Cùng ba app đó mà port đóng hẳn thì gần như không cộng thêm (lab: cả request 9,5 ms). Một app **chết hẳn** làm logout nhanh hơn một app **chết dở**. Cả hai trường hợp, session cục bộ của app hỏng sống tới lần refresh kế tiếp của nó, vì Keycloak không gửi lại.

---

## 6. Chuyển giao

Không có đáp án trong bài. Dùng cơ chế ở mục 3 để tự suy.

1. App mobile login bằng system browser, nút Logout gọi `POST /logout` kèm refresh token. Hôm sau user mở web app cùng realm trên trình duyệt của chính điện thoại đó: form login hay vào thẳng? URL nào app nên mở thay vào đó?
2. App chạy 4 instance sau load balancer, session trong RAM từng instance. Back-channel cấu hình đúng, endpoint luôn trả 200. Bao nhiêu phần trăm lượt logout thực sự xoá được session cục bộ? Sửa ở đâu?
3. Yêu cầu: logout ở bất kỳ app nào phải chặn mọi API trong 10 giây; API verify JWT offline. Nêu ba thay đổi đạt yêu cầu, mỗi cái trả giá bao nhiêu request/giây tới Keycloak hoặc bao nhiêu ms độ trễ.
4. Một client đăng ký `post.logout.redirect.uris` dạng wildcard `https://*.example.com/*`, và kẻ tấn công chiếm được một subdomain bỏ hoang của `example.com`. Viết URL logout họ gửi cho nạn nhân; dòng nào trong bảng 3.2 không còn chặn nổi?
5. **Câu khó nhất.** Một realm có 30 client: 12 app chạy on-prem trong mạng khách hàng, Keycloak không gọi vào được; 18 app chạy trong cloud của bạn. Yêu cầu: admin khoá một nhân viên lúc 10:00 thì không app nào phục vụ người đó sau 10:02, kể cả khi người đó không mở trình duyệt nào nữa; và nút Logout của user thường không được chờ quá 2 giây dù 3 app đang deploy. Thiết kế kênh lan truyền cho từng nhóm app, chỉ ra ràng buộc nào Keycloak 26.8.1 không tự đáp ứng với cơ chế trong bài, và thành phần nào bạn phải tự xây.

---

## 7. Tóm tắt

- SSO là cookie `KEYCLOAK_IDENTITY` trên domain Keycloak (lab 26.8.1: JWT HS512 mang `sid`, `exp - iat` = 36.000 s, `Path=/realms/<realm>/`). Cookie chỉ là con trỏ tới user session: session chết thì cookie còn hạn vẫn ra form.
- Logout có ba tầng: session của app, user session ở Keycloak kèm cookie, session của các app khác. App chỉ tự xoá được tầng đầu.
- RP-initiated logout có `id_token_hint` → 302, xoá cookie. Không hint → trang xác nhận 200, session còn. `post_logout_redirect_uri` lạ → 400. `?redirect_uri=` bị xoá ở 26.0.0, ở 26.8.1 bị bỏ qua.
- Back-channel: Keycloak POST `logout_token` (RS256, `typ` `logout+jwt`, `aud` = client nhận, `sid`, `events`, không `nonce`, sống 120 s) tới mọi client có client session trong phiên đó, kể cả client khởi xướng. `sid` chỉ có khi client bật `backchannel.logout.session.required` (tạo qua API mà không đặt: không có). Decoder mặc định của Spring Security 6.5 từ chối `typ` `logout+jwt`.
- Back-channel gửi một lần, tuần tự, đồng bộ: app trả 500 thì không gửi lại, không log; app treo thì logout chờ khoảng 5 s mỗi app (lab: 6,03 s và 10,02 s). Session ở Keycloak luôn bị xoá.
- Front-channel là iframe trong trang logout: không chạy khi logout không qua trình duyệt, có thể bị CSP chặn; bật nó thì URL back-channel của client bị bỏ qua.
- Không kênh nào rút được cửa sổ của access token cho API verify offline (lab: còn 265,3 s sau logout).

→ **Bài 15 — Identity brokering**: tới giờ Keycloak là IdP phát logout cho app; khi user đăng nhập bằng Google hay Azure AD qua Keycloak, Keycloak lại là RP của một IdP khác, và chuỗi logout có thêm một tầng mà từ 26.8.1 Keycloak luôn kiểm chữ ký logout token nhận về.
