# Bài 10 — Session và token lifetime

## 1. Mục tiêu

Sau bài này bạn có thể:

- Chỉ ra một request bị từ chối vì **đồng hồ nào** trong năm đồng hồ của Keycloak: access token, SSO Session Idle, SSO Session Max, Client Session Idle/Max, Offline Session Idle/Max.
- Tính tay theo giờ:phút một dòng thời gian login, refresh, vắng mặt, rồi nói request nào fail lúc mấy giờ và bằng lỗi gì (`401` ở API hay `invalid_grant` ở Keycloak).
- Đọc `refresh_expires_in` và `exp` của refresh token rồi giải thích vì sao Keycloak không có setting "Refresh Token Lifespan".
- Quyết định bật hay giữ tắt **Revoke Refresh Token** cho realm, sau khi đã thấy trên lab rằng refresh token cũ vẫn dùng được ở cấu hình mặc định.
- Thiết kế offline access cho app mobile hoặc batch job: role nào, scope nào, chết sau bao lâu không dùng, có trần 60 ngày hay không, logout có giết nó không.
- Nói được revoke access token, revoke refresh token và logout xoá tầng session nào, tầng nào còn.

---

## 2. Triệu chứng

Một tuần, hai ticket về cùng một realm `demo` để nguyên mặc định của Keycloak 26.8.1.

Ticket thứ nhất từ đội pentest: "Lấy refresh token RT1, gọi refresh, nhận RT2. Gửi lại RT1: vẫn ra access token mới." Họ ghi mức High, kèm trích sec-05 rằng refresh token phải xoay vòng và dùng một lần.

Ticket thứ hai từ một user: "Tôi đi họp 35 phút, quay lại bấm Lưu thì bị đá ra màn hình đăng nhập." Dev mở token response của app:

```json
{"expires_in":300,"refresh_expires_in":1800,"token_type":"Bearer","scope":"openid profile email"}
```

Decode refresh token: một JWT, header `"alg":"HS512"`, `exp - iat` = 1.800 giây. Trưởng nhóm: "Refresh token sống 30 phút, ít quá. Vào admin console tìm Refresh Token Lifespan, đặt 8 giờ." Admin console không có ô nào tên như vậy.

> **Đo trên lab.** Keycloak 26.8.1 `start-dev`, Java 24, Mac mini Apple M4. Password grant qua client `test-direct`: `expires_in 300`, `refresh_expires_in 1800`. Refresh token 676 byte, `alg` HS512, `typ` `"Refresh"`, `exp - iat` = 1.800 s. Refresh xong, dùng lại RT cũ: **vẫn thành công**. Realm ghi `revokeRefreshToken=false, refreshTokenMaxReuse=0`.

---

## ⏸ Dừng lại — đoán trước #1

Muốn user họp 60 phút quay lại vẫn không phải đăng nhập, đổi cái nào?

```
(a) Tăng Access Token Lifespan từ 5 phút lên 60 phút
(b) Tìm setting Refresh Token Lifespan và đặt 60 phút
(c) Tăng SSO Session Idle (hoặc Client Session Idle của client đó) lên trên 60 phút
(d) Bật Revoke Refresh Token để mỗi lần refresh được token mới sống lâu hơn
```

---

## 3. Lý thuyết

### 3.1 Hai tầng session: user session và client session

Đáp án là **(c)**, nhưng (c) chỉ đúng một nửa và (a) sai theo cách đáng học. Muốn thấy vì sao, cần biết Keycloak giữ trạng thái gì ở phía server.

**User session** (SSO session) là bản ghi phía Keycloak nói "user này đã xác thực trên trình duyệt/thiết bị này, lúc mấy giờ". Id của nó là claim `sid` trong mọi token sinh từ phiên (lab: `sid` = `session_state` = `x9Q3sH6xPnOTxMbs06KWDphd` ở cả access, ID và refresh token).

**Client session** là bản ghi con: "trong user session này, client X đã nhận token". User đăng nhập app thứ hai trong cùng trình duyệt thì cookie SSO dẫn về user session cũ, Keycloak chỉ thêm một client session. Đó là toàn bộ cơ chế SSO.

Hai tầng tồn tại vì hai câu hỏi khác nhau: "người này còn đăng nhập không" và "app này còn được refresh không". Tách ra thì cắt được quyền của một app mà user vẫn đăng nhập ở các app khác (3.6 đo đúng điều này).

| Grant | User session | Lab thấy |
|---|---|---|
| Authorization code qua trình duyệt | Một cho cả trình duyệt, mỗi client một client session | `sid` giống nhau trên mọi token |
| Password grant | Mỗi lần gọi một user session mới (không có cookie để nối) | alice có **13** user session trước logout, mỗi lần một cái |
| Client credentials | Không có | `offline_user_session` 10 → 12 dòng sau ~10.500 token |

Script gọi password grant mỗi phút để "lấy token cho tiện" đẻ ra 1.440 user session mỗi ngày.

> **Nguồn.** *"Note the SSO user session is the parent of zero or more client sessions, one client session is created for every different client app the user logs in."* ([_timeouts](https://www.keycloak.org/docs/latest/server_admin/index.html#_timeouts)). Client credentials: *"Only the access token is returned by default. No refresh token is returned and no user session is created"* ([_service_accounts](https://www.keycloak.org/docs/latest/server_admin/index.html#_service_accounts)).

### 3.2 Năm đồng hồ, và cái nào được đặt lại

**Access token lifespan** (mặc định 300 s) là `exp - iat` của access token. Resource server verify offline bằng chữ ký và `exp` (bài 4), nên trong 300 s đó Keycloak không rút lại được token. Đồng hồ này không đặt lại: `exp` cố định từ lúc phát.

**SSO Session Idle** (mặc định 1.800 s) là thời gian tối đa user session được không có hoạt động. "Hoạt động" theo docs chỉ gồm hai thứ: client xin xác thực (redirect qua `/auth`) hoặc gửi refresh. Mỗi lần như vậy hạn idle dời tới `bây giờ + 1.800 s`.

Đây là chỗ (a) sai. User bấm 200 lần, mỗi lần gọi API bằng access token: API tự verify, Keycloak không thấy request nào, idle không dời. Tăng access token lên 60 phút thì user có token dùng được 60 phút, nhưng user session vẫn chết sau 30 phút không refresh, và lần refresh kế tiếp fail (5.1 tính cụ thể). Cửa sổ "token lộ vẫn dùng được" còn dài ra 12 lần (3.600 / 300).

> **Đo trên lab (critic, 26.8.1).** Docs chỉ liệt kê hai sự kiện đặt lại idle; introspection không nằm trong đó, và đo cũng vậy. Realm SSO Idle 30 s, access token 60 s, login rồi introspect access token mỗi 10 s: `active:true` ở giây 10 và 20, `active:false` từ giây 30 dù `exp` còn 30 s; refresh ở giây 42 nhận `invalid_grant`. Introspection không giữ session sống, và API dùng introspection mất token ngay khi session chết, sớm hơn `exp`.

**SSO Session Max** (mặc định 36.000 s = 10 giờ) đếm từ lúc đăng nhập và không gì đặt lại được. Nó tồn tại vì idle có lỗ: app refresh theo timer giữ session sống mãi dù không ai ngồi trước máy.

**Client Session Idle / Max**: hai đồng hồ tương tự gắn với client session, mặc định 0. Docs nói Idle = 0 nghĩa là dùng SSO Session Idle. Chúng cho một app nhạy cảm (trang admin) hạn ngắn hơn phần còn lại.

**Offline Session Idle / Max** thuộc một loại session khác, để ở 3.5.

Vài hạn ngắn khác thuộc về chính quá trình login, liệt kê để khỏi nhầm với session:

| Field (`kcadm get realms/<r>`) | Mặc định | Đo cái gì |
|---|---|---|
| `accessCodeLifespan` | 60 s | authorization code phải được đổi trong 60 s |
| `accessCodeLifespanLogin` | 1.800 s | user được đứng ở màn hình login tối đa 30 phút |
| `accessCodeLifespanUserAction` | 300 s | thời gian cho một required action |
| `clientSessionIdleTimeout` / `MaxLifespan` | 0 / 0 | client session (0 = theo SSO) |

Sơ đồ dưới: cấu hình mặc định, app chỉ refresh khi access token hết hạn, user rời máy lúc 09:10.

<svg viewBox="0 0 720 275" role="img" aria-labelledby="kc10-a-t kc10-a-d" style="width:100%;height:auto">
<title id="kc10-a-t">Dòng thời gian access token, refresh và SSO Session Idle</title>
<desc id="kc10-a-d">Login 09:00, refresh 09:05 và 09:10, mỗi refresh dời hạn idle 30 phút tới 09:30, 09:35 rồi 09:40; user rời máy từ 09:10; quay lại 09:38 thì API trả 401 nhưng refresh thành công, quay lại 09:41 thì refresh trả invalid_grant.</desc>
<text x="360" y="18" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">SSO Session Idle 30 phút, Access Token 5 phút, app refresh khi AT hết hạn</text>
<text x="92" y="53" text-anchor="end" font-size="10.5" fill="currentColor">Access token</text>
<rect x="100" y="40" width="65" height="18" rx="4" fill="#3b82f6" fill-opacity="0.35"/>
<rect x="165" y="40" width="65" height="18" rx="4" fill="#3b82f6" fill-opacity="0.25"/>
<rect x="230" y="40" width="65" height="18" rx="4" fill="#3b82f6" fill-opacity="0.35"/>
<text x="132" y="53" text-anchor="middle" font-size="10" fill="currentColor">AT1</text>
<text x="197" y="53" text-anchor="middle" font-size="10" fill="currentColor">AT2</text>
<text x="262" y="53" text-anchor="middle" font-size="10" fill="currentColor">AT3</text>
<text x="92" y="84" text-anchor="end" font-size="10.5" fill="currentColor">Refresh</text>
<circle cx="100" cy="80" r="5" fill="#8b5cf6" fill-opacity="0.8"/>
<circle cx="165" cy="80" r="5" fill="#8b5cf6" fill-opacity="0.8"/>
<circle cx="230" cy="80" r="5" fill="#8b5cf6" fill-opacity="0.8"/>
<text x="100" y="99" text-anchor="middle" font-size="10" fill="currentColor">login</text>
<text x="165" y="99" text-anchor="middle" font-size="10" fill="currentColor">refresh</text>
<text x="230" y="99" text-anchor="middle" font-size="10" fill="currentColor">refresh</text>
<text x="92" y="132" text-anchor="end" font-size="10.5" fill="currentColor">Hạn idle</text>
<rect x="100" y="112" width="390" height="10" rx="3" fill="#84cc16" fill-opacity="0.15"/>
<rect x="165" y="126" width="390" height="10" rx="3" fill="#84cc16" fill-opacity="0.25"/>
<rect x="230" y="140" width="390" height="10" rx="3" fill="#84cc16" fill-opacity="0.45"/>
<text x="494" y="121" font-size="10" fill="currentColor">09:30</text>
<text x="559" y="135" font-size="10" fill="currentColor">09:35</text>
<text x="624" y="149" font-size="10" fill="currentColor">hết 09:40</text>
<text x="92" y="176" text-anchor="end" font-size="10.5" fill="currentColor">User</text>
<rect x="230" y="164" width="364" height="18" rx="4" fill="#64748b" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="4 3"/>
<text x="412" y="177" text-anchor="middle" font-size="10" fill="currentColor">rời máy, không request nào tới Keycloak</text>
<line x1="100" y1="200" x2="690" y2="200" stroke="currentColor" stroke-opacity="0.5" stroke-width="1"/>
<text x="100" y="214" text-anchor="middle" font-size="10" fill="currentColor">09:00</text>
<text x="165" y="214" text-anchor="middle" font-size="10" fill="currentColor">09:05</text>
<text x="230" y="214" text-anchor="middle" font-size="10" fill="currentColor">09:10</text>
<text x="295" y="214" text-anchor="middle" font-size="10" fill="currentColor">09:15</text>
<text x="360" y="214" text-anchor="middle" font-size="10" fill="currentColor">09:20</text>
<text x="425" y="214" text-anchor="middle" font-size="10" fill="currentColor">09:25</text>
<text x="490" y="214" text-anchor="middle" font-size="10" fill="currentColor">09:30</text>
<line x1="594" y1="30" x2="594" y2="200" stroke="#84cc16" stroke-width="1.5"/>
<line x1="620" y1="30" x2="620" y2="200" stroke="#ef4444" stroke-opacity="0.6" stroke-width="1" stroke-dasharray="3 3"/>
<line x1="633" y1="30" x2="633" y2="200" stroke="#ef4444" stroke-width="1.5"/>
<text x="594" y="236" text-anchor="end" font-size="10.5" fill="currentColor">09:38: API trả 401 (AT3 hết 09:15), refresh vẫn 200</text>
<text x="633" y="258" text-anchor="end" font-size="10.5" fill="currentColor">09:41: refresh trả invalid_grant, phải nhập lại mật khẩu</text>
</svg>

Hạn idle chỉ nhảy ở các chấm tím, không nhảy theo thao tác của user. Từ 09:15 tới 09:40 user có session còn sống mà không có access token hợp lệ; app đúng thì bắt 401, refresh, gọi lại, user không thấy gì.

Câu hay bị nhắc lại "idle 30 phút thực ra là 32 phút vì có 2 phút ân hạn" có điều kiện: persistent user sessions **không** bật. Từ 26.0.0 nó bật mặc định (3.7), nên ở 26.8.1 mặc định 30 phút là 30 phút.

> **Nguồn.** Mặc định lấy từ source tag 26.8.1, docs không ghi số: *"public static final int DEFAULT_ACCESS_TOKEN_LIFESPAN = 300;"*, *"public static final int DEFAULT_SESSION_IDLE_TIMEOUT = 1800; // 30 minutes"*, *"public static final int DEFAULT_SESSION_MAX_LIFESPAN = 36000; // 10 hours"* ([Constants.java#L59](https://github.com/keycloak/keycloak/blob/26.8.1/server-spi-private/src/main/java/org/keycloak/models/Constants.java#L59), [#L71](https://github.com/keycloak/keycloak/blob/26.8.1/server-spi-private/src/main/java/org/keycloak/models/Constants.java#L71), [#L72](https://github.com/keycloak/keycloak/blob/26.8.1/server-spi-private/src/main/java/org/keycloak/models/Constants.java#L72)). Đặt lại idle: *"This timeout value resets when clients request authentication or send a refresh token request."* Client idle bằng 0: *"This setting is an optional configuration and, when set to zero, uses the same idle timeout in the SSO Session Idle configuration."* Cửa sổ 2 phút: *"The following logic is only applied if persistent user sessions are not active:"* ([_timeouts](https://www.keycloak.org/docs/latest/server_admin/index.html#_timeouts)).

---

## ⏸ Dừng lại — đoán trước #2

App refresh theo timer mỗi 4 phút 30 giây, cả ngày, kể cả khi user không ngồi trước máy. Refresh token nào cũng có `exp - iat` = 1.800 s. Câu nào đúng?

```
(a) Session sống mãi, vì mỗi refresh cấp refresh token mới sống thêm 30 phút
(b) Session chết sau 10 giờ tính từ login, refresh kế tiếp trả invalid_grant
(c) Session chết sau 10 giờ, nhưng refresh token cuối vẫn refresh được tới exp của nó
(d) Session chết sau 30 phút vì idle không được đặt lại khi user vắng mặt
```

---

### 3.3 Refresh token: hạn của nó là hạn của session

Đáp án là **(b)**, và lý do nằm ở bản chất refresh token.

Ở Keycloak, refresh token là JWT ký **HS512** bằng khoá đối xứng của realm. Khoá này không có trong JWKS nên chỉ Keycloak verify được; `aud` là chính issuer. Bài 4 đã mổ cấu trúc; ở đây cần hai claim: `sid` (trỏ về user session) và `exp`.

Không có setting "Refresh Token Lifespan". `exp` của refresh token được **tính ra** từ hạn session: từ 26.8.0 nó bị chặn trên bởi idle của user session, và `refresh_expires_in` là min của SSO Session Idle và Client Session Idle của client. Lab: `refresh_expires_in 1800` = `ssoSessionIdleTimeout`, cả lúc login lẫn sau mỗi lần refresh. Gần mốc SSO Session Max thì có trần thứ ba: phần còn lại tới Max, áp cho cả access token (hộp đo dưới).

Khi nhận refresh, Keycloak không chỉ kiểm chữ ký và `exp`. Nó tra user session theo `sid` và client session tương ứng; không còn thì trả `invalid_grant`, bất kể `exp` nói gì. Vì vậy (c) sai: refresh token là cái phiếu trỏ về session, phiếu còn hạn mà session chết thì vô giá trị. Lab thấy rõ ở ca revoke (3.6): refresh token chưa tới `exp` vẫn nhận `"Session not active"`.

Trả lời ticket thứ hai: user họp 35 phút, không refresh nào, user session chết ở phút 30. Muốn 60 phút thì tăng **SSO Session Idle**. Đây là nửa sai của (c): Client Session Idle chỉ có tác dụng khi **ngắn hơn** SSO idle, vì `refresh_expires_in` là min của hai giá trị (hộp Nguồn dưới). Một app idle 60 phút trong realm SSO idle 30 phút là không làm được ở tầng client.

Client cũng không nên decode refresh token để đọc `exp`: RFC 6749 coi nó là chuỗi mờ; con số client được hứa là `refresh_expires_in`.

> **Đo trên lab (critic, 26.8.1).** Realm SSO Max 120 s, access token 60 s, SSO Idle 1.800 s. Refresh ở giây 30: `expires_in 60`, `refresh_expires_in 90`. Giây 90: cả hai là 30; giây 110: 10; giây 118: 2. `exp` của access token và refresh token đều dừng đúng ở login + 120 s. Giây 125: `invalid_grant`, `"Token is not active"`. Realm SSO Idle 30 s, để 35 s không refresh: cùng thông điệp, vì `exp` của refresh token đã bị chặn đúng ở mốc idle. Thông điệp vì thế không phân biệt idle với Max; `"Session not active"` chỉ hiện khi session bị xoá trước `exp` (3.6).

> **Nguồn.** Upgrading Guide 26.8.0: *"For all refresh tokens (online and offline), the expiration is now capped by the user session idle timeout, so refresh_expires_in reflects the minimum of the session idle timeout and any client-specific session idle timeout."* ([upgrading](https://www.keycloak.org/docs/latest/upgrading/index.html#refresh-token-expiration-now-reflects-the-session-idle-timeout)). Về Client Session Max, docs viết: *"The maximum time for a client session and before a refresh token expires and invalidates."* ([_timeouts](https://www.keycloak.org/docs/latest/server_admin/index.html#_timeouts)). Khoá ký token nội bộ: *"public static final String INTERNAL_SIGNATURE_ALGORITHM = Algorithm.HS512;"* ([Constants.java#L69](https://github.com/keycloak/keycloak/blob/26.8.1/server-spi-private/src/main/java/org/keycloak/models/Constants.java#L69)).

### 3.4 Rotation: Keycloak xoay nhưng không thu hồi

Ticket thứ nhất. sec-05 (mục 4) dạy rotation + reuse detection: mỗi lần refresh cấp token mới, token cũ bị đánh dấu đã dùng, gửi lại token cũ thì cả họ token bị thu hồi. Bản sai là tin Keycloak làm sẵn việc đó.

Lab cho thấy mặc định Keycloak làm **nửa đầu**: mỗi lần refresh trả RT mới, khác RT cũ. Không làm nửa sau: RT cũ vẫn refresh được. Field quyết định là `revokeRefreshToken`, mặc định `false`.

Hệ quả: RT bị lộ (log proxy, extension trình duyệt) thì kẻ giữ nó refresh song song với user, và vì cả hai đều refresh nên idle không bao giờ chạm; trần còn lại là SSO Session Max, 10 giờ kể từ login. Không bên nào thấy lỗi, nên không có tín hiệu phát hiện.

Bật Revoke Refresh Token thì có cả nửa sau, và mạnh tay hơn tưởng: dùng lại RT không chỉ bị từ chối mà **xoá client session**, kéo chết mọi RT của client đó trong phiên, kể cả RT mới nhất trong tay user. Docs không giải thích `refreshTokenMaxReuse`; đo cho thấy nó là số lần **thêm** mà RT được trình lại, còn RT cũ hơn lần refresh gần nhất bị từ chối ngay (`"Stale token"`). Cái giá: mọi chỗ trong app có thể refresh song song (hai tab, hai request cùng gặp 401) phải gom về một lần refresh.

> **Đo trên lab (critic, 26.8.1).** `revokeRefreshToken=true`, password grant ra RT1. Max Reuse 0: RT1 lần 1 → 200 (ra RT2); RT1 lần 2 → `invalid_grant` `"Maximum allowed refresh token reuse exceeded"`; sau đó RT2 → `"Session doesn't have required client"`. Max Reuse 1: RT1 lần 1 → 200 (RT2), lần 2 → 200 (RT3), lần 3 → `"Maximum allowed refresh token reuse exceeded"`. Lượt khác: RT1 hai lần ra RT2, RT3; trình RT2 → `"Stale token"`; rồi RT3 → `"Session doesn't have required client"`. Mọi ca: user session còn, `clients: {}`.

> **Nguồn.** *"When Enabled, Keycloak revokes refresh tokens and issues another token that the client must use."* ([_timeouts](https://www.keycloak.org/docs/latest/server_admin/index.html#_timeouts)). Mặc định khi tạo realm: `else newRealm.setRevokeRefreshToken(false);`, `else newRealm.setRefreshTokenMaxReuse(0);` ([DefaultExportImportManager.java#L250](https://github.com/keycloak/keycloak/blob/26.8.1/model/storage-private/src/main/java/org/keycloak/storage/datastore/DefaultExportImportManager.java#L250)).

### 3.5 Offline session: một session không có SSO Idle/Max

App mobile không muốn bắt login lại mỗi 10 giờ; job đêm cần token thay mặt user khi user không có mặt. Với user session, cả hai bị SSO Session Max cắt.

**Offline token** là refresh token gắn với một **offline session**, loại session riêng không chịu SSO Session Idle và Max. Điều kiện: user mang realm role `offline_access` (lab: nằm sẵn trong `default-roles-demo`, bài 8) và client xin `scope=offline_access` (optional client scope, bài 9). Hai đồng hồ của nó:

- **Offline Session Idle** 2.592.000 s (30 ngày): phải refresh ít nhất mỗi 30 ngày.
- **Offline Session Max Limited** mặc định **tắt**: offline session không bao giờ hết theo tuổi, chỉ chết vì idle. Bật thì trần 5.184.000 s (60 ngày) dù token vẫn được dùng đều.

Câu "offline token never expires" của docs đúng theo nghĩa không có trần tuổi khi Max Limited tắt, không đúng theo nghĩa không có `exp`: từ 26.8.0 offline refresh token luôn có `exp`, lab thấy `exp - iat` = 2.592.000 s.

Hai chỗ hay sai. Một: logout **không** giết offline token, vì logout kết thúc user session, còn offline session là thứ khác; muốn chặn phải revoke chính token đó hoặc gỡ consent. Hai: bật Revoke Refresh Token thì offline token cũng thành dùng một lần, job đêm cất token trong file cấu hình sẽ chết ở lần chạy thứ hai nếu không ghi lại token mới.

> **Nguồn.** *"The difference between a refresh token and an offline token is that an offline token never expires and is not subject to the SSO Session Idle timeout and SSO Session Max lifespan."*; *"The offline token is valid after a user logout."*; *"If you enable Offline Session Max Limited, offline tokens expire after 60 days even if you use the offline token for a refresh token action."* ([_offline-access](https://www.keycloak.org/docs/latest/server_admin/index.html#_offline-access)). *"If the flag is Disabled, offline sessions never expire by lifespan, only by idle."* ([_timeouts](https://www.keycloak.org/docs/latest/server_admin/index.html#_timeouts)). *"Offline refresh tokens now always include an exp claim."* ([upgrading](https://www.keycloak.org/docs/latest/upgrading/index.html#refresh-token-expiration-now-reflects-the-session-idle-timeout)).

---

## ⏸ Dừng lại — đoán trước #3

Alice có một access token còn 4 phút và một refresh token qua `test-direct`. Admin gọi `/revoke` với **access token** (`token_type_hint=access_token`), HTTP 200. Ngay sau đó app refresh bằng refresh token cùng phiên. Kết quả?

```
(a) invalid_grant: revoke access token kết thúc cả user session
(b) invalid_grant: revoke access token xoá client session, user session còn
(c) 200: refresh vẫn thành công, phiên không bị đụng tới
(d) 200 nhưng access token mới mang scope rỗng
```

---

### 3.6 Revoke và logout xoá tầng nào

Đáp án là **(c)**. Revoke access token chỉ đánh dấu đúng token đó: ai hỏi Keycloak (introspect, userinfo) nghe `active:false` / 401, còn phiên không bị đụng. Muốn cắt quyền của một app thì revoke **refresh token** của app đó. Lab đo ba thao tác, mỗi cái xoá một tầng:

| Thao tác | Access token cùng phiên (hỏi Keycloak) | Refresh bằng RT cùng phiên | User session | Client session |
|---|---|---|---|---|
| Revoke access token | token đó `active:false`, userinfo 401 | **vẫn 200** | còn | còn |
| Revoke refresh token | `active:false` | `invalid_grant` `"Session not active"` | **còn**, `clients: {}` | xoá |
| `POST /logout` kèm RT | `active:false`, userinfo 401 `user_session_not_found` | `invalid_grant` `"Session not active"` | xoá (13 → 12) | xoá |

Cột đầu chỉ đúng với ai **hỏi** Keycloak. Sau logout, lab đo `exp - now` của access token vẫn còn 300 s; resource server verify offline (Spring, bài 12) tiếp tục nhận nó tới hết 300 s. Đây là lý do access token ngắn còn session dài: session là trạng thái phía server nên xoá được ngay, access token là bản sao đã phát ra ngoài nên chỉ hết theo `exp`. Rút access token xuống 60 s thì cửa sổ còn 60 s, đổi lại client refresh gấp 5 lần. Front-channel, back-channel logout là bài 14.

> **Nguồn.** *"Both refresh tokens and access tokens are supported by this endpoint. When revoking a refresh token, the user consent for the corresponding client is also revoked."* ([oidc-layers](https://www.keycloak.org/securing-apps/oidc-layers)).

### 3.7 Persistent user sessions: session nằm trong DB từ lúc login

Từ 26.0.0, persistent user sessions bật mặc định: mọi user session được ghi vào database, không chỉ nằm trong cache Infinispan của các node. Lab 2 (4.6) thấy dòng session trong Postgres ngay giây login, và session sống qua `kill -9` cả hai node.

Hai hệ quả cho bài này: cửa sổ ân hạn 2 phút (3.2) biến mất, và mỗi login là một lần ghi DB, nên script password grant mỗi phút ở 3.1 đẻ dòng trong bảng chứ không chỉ tốn RAM. Cache, owners và chi phí là bài 25.

> **Nguồn.** Release notes 26.0.0: *"In Keycloak 26, this feature is enabled by default. This means that all user sessions are persisted in the database by default."* ([keycloak-26-0-0](https://www.keycloak.org/docs/latest/release_notes/index.html#keycloak-26-0-0)).

---

## 4. Lab

Keycloak 26.8.1 `start-dev` trên Mac mini Apple M4, realm `demo` tạo bằng `kcadm` không chỉnh gì về session (bài 7). `kc` = `kcadm.sh "$@" --config kcadm.config`. Bước 4.6 dùng cụm lab 2.

### 4.1 Đọc các đồng hồ từ realm thật

```bash
kc get realms/demo      # trích các field liên quan
```
```json
"accessTokenLifespan": 300, "accessTokenLifespanForImplicitFlow": 900,
"accessCodeLifespan": 60, "accessCodeLifespanLogin": 1800, "accessCodeLifespanUserAction": 300,
"ssoSessionIdleTimeout": 1800, "ssoSessionMaxLifespan": 36000,
"clientSessionIdleTimeout": 0, "clientSessionMaxLifespan": 0,
"offlineSessionIdleTimeout": 2592000, "offlineSessionMaxLifespanEnabled": false, "offlineSessionMaxLifespan": 5184000,
"revokeRefreshToken": false, "refreshTokenMaxReuse": 0,
```

Thấy: mọi số khớp `Constants.java` và `DefaultExportImportManager.java` ở 3.2–3.5. `offlineSessionMaxLifespan` là 5.184.000 nhưng `offlineSessionMaxLifespanEnabled: false`, tức con số đang không có tác dụng: đọc JSON phải đọc cả cờ bật. Không có field `refreshTokenLifespan`.

### 4.2 Token response và refresh token

```bash
curl -s localhost:8080/realms/demo/protocol/openid-connect/token \
  -d grant_type=password -d client_id=test-direct -d client_secret=$SECRET \
  -d username=alice -d 'password=Passw0rd!' -d scope=openid > tok_pw.json
```
```json
{"expires_in":300,"refresh_expires_in":1800,"token_type":"Bearer","not-before-policy":0,
 "session_state":"lKO3j25TG-Q4o5iKPZLZTmp9","scope":"openid profile email"}
```
Decode payload hai token (lab dùng `jwt.py`), chỉ giữ claim đang bàn:
```
AT  exp - iat = 300    sid = lKO3j25TG-Q4o5iKPZLZTmp9
RT  typ = Refresh      exp - iat = 1800   sid = lKO3j25TG-Q4o5iKPZLZTmp9
```

Vì sao: `exp - iat` của RT bằng `ssoSessionIdleTimeout`. Cùng `sid` nghĩa là hai token trỏ về một user session, và `session_state` chính là id đó.

### 4.3 Refresh, rồi dùng lại token cũ

```bash
curl -s .../token -d grant_type=refresh_token -d client_id=test-direct \
  -d client_secret=$SECRET -d refresh_token=$RT1                        # nhận RT2
curl -s .../token -d grant_type=refresh_token ... -d refresh_token=$RT1   # gửi lại RT1
```
```
refresh -> {"expires_in":300,"refresh_expires_in":1800,"scope":"openid profile email"}
RT mới khác RT cũ (rotated) -> yes
dùng lại RT cũ                -> VẪN thành công (có access_token)
realm: revokeRefreshToken=false, refreshTokenMaxReuse=0
```

Thấy: ticket pentest là thật. `refresh_expires_in` lại là 1.800, tức idle vừa dời tới `bây giờ + 30 phút`. Muốn RT1 chết sau khi đổi ra RT2: `kc update realms/demo -s revokeRefreshToken=true` rồi làm lại bước này.

### 4.4 Offline token

Lặp lại 4.2 với `-d 'scope=openid offline_access'`:
```json
{"expires_in":300,"refresh_expires_in":2592000,"token_type":"Bearer",
 "session_state":"ueBuqgQyZOrSAxXtv_wq6nx1","scope":"openid offline_access profile email"}
```
```
RT  typ = Offline   exp - iat = 2592000   726 byte, alg HS512
```

Vì sao: access token vẫn 300 s, chỉ refresh token đổi loại. 2.592.000 s là `offlineSessionIdleTimeout`, không phải Max (đang tắt).

### 4.5 Revoke access token, rồi revoke refresh token

```bash
curl -s .../revoke -d client_id=test-direct -d client_secret=$SECRET \
  -d token=$AT -d token_type_hint=access_token     # HTTP 200, body rỗng
curl -s .../token -d grant_type=refresh_token ... -d refresh_token=$RT   # vẫn thành công
curl -s .../revoke ... -d token=$RT                # HTTP 200
curl -s .../token -d grant_type=refresh_token ... -d refresh_token=$RT   # invalid_grant "Session not active"
```

Kết quả đầy đủ là bảng ở 3.6. Vì sao lần refresh cuối fail: revoke refresh token xoá client session của `test-direct`, user session cha còn với `clients: {}`. RT chưa tới `exp`, nhưng Keycloak tra session thì không thấy client session.

### 4.6 Session sống qua SIGKILL cả cụm

> **Đo trên lab.** Cụm lab 2: Keycloak 26.8.1 production mode, 2 node + Postgres 16.13, cùng một Mac mini M4. Password grant ở node-a lúc 13:58:02; `kill -9` node-a lúc 13:58:08, refresh qua node-b: 200; `kill -9` cả node-b, start lại riêng node-b, refresh bằng refresh token cũ: 200.

```sql
select ... from offline_user_session where user_session_id='6iyG35...'
6iyG35lcrLfnVERRd0UzFPGV | offline_flag=0 | created 13:58:02 | last_refresh 13:58:02
```

Thấy: `created` trùng giây login, session được ghi ngay chứ không đợi shutdown. `offline_flag=0` là session online; tên bảng dễ gây nhầm. Session sống vì nằm trong Postgres, không phải nhờ node kia giữ bản sao.

---

## 5. Tính tay

Mặc định 26.8.1 trừ khi ghi khác, không có cửa sổ 2 phút. "Fail" ghi rõ ở đâu: `401` ở resource server (token hết `exp`) hay `invalid_grant` ở Keycloak (session chết).

### 5.1 Idle đếm từ lần refresh, không từ lần bấm cuối

SPA refresh **lười**: chỉ refresh khi cần gọi API mà access token đã hết. User login 13:00:00, bấm mỗi phút tới 13:22, rời máy, quay lại bấm lúc 13:51.

Refresh xảy ra 13:05, 13:10, 13:15, 13:20. Lần bấm 13:21 và 13:22 dùng token cấp 13:20, không chạm Keycloak. Hạn idle: 13:20 + 30 phút = **13:50**; RT cấp 13:20 cũng có `exp` 13:50.

13:51: access token (hết 13:25) bị API trả **401**. App refresh: session chết từ 13:50, Keycloak trả **`invalid_grant`**. Redirect sang `/auth`: không còn user session nên không có SSO, user thấy **form đăng nhập**.

User cảm thấy mình vắng 29 phút (13:22 → 13:51); Keycloak đếm 31 phút (13:20 → 13:51). Quay lại 13:49 thì refresh thành công, hạn mới 14:19.

Thử phương án (a) ở hộp #1: access token 60 phút. Lần chạm Keycloak duy nhất là login 13:00 (token sống tới 14:00), không refresh nào nữa, hạn idle **13:30**. User quay lại 13:51 không thấy lỗi vì token còn hạn. 14:00 token hết, refresh trả `invalid_grant`, user bị đá ra **giữa lúc đang làm việc**, thay vì lúc vừa quay lại.

### 5.2 Hai app, một user session, hai đồng hồ

Client `admin-portal` đặt Client Session Idle 600 s; `shop` để mặc định. Cùng trình duyệt: login `shop` 09:00 (nhập mật khẩu), mở `admin-portal` 09:02 (SSO, không nhập lại). `shop` refresh theo timer mỗi 5 phút. `admin-portal` refresh lười, lần cuối 09:20. User quay lại tab `admin-portal` lúc 09:31.

`refresh_expires_in` của `admin-portal` = min(1.800, 600) = 600 s, nên client session của nó hết lúc **09:30**. User session thì `shop` vừa refresh 09:30, hạn mới 10:00.

09:31 trong tab `admin-portal`: API với token cấp 09:20 (hết 09:25) → **401**. Refresh → **`invalid_grant`**. Redirect sang `/auth` → user session còn, cookie SSO còn, Keycloak cấp code ngay, **không có form**. Client session mới hạn tới 09:41.

User chỉ thấy trang nháy một lần. Client Session Idle ngắn không buộc user xác thực lại khi app khác đang giữ user session sống; muốn trang admin bắt nhập lại mật khẩu thì cần step-up theo ACR (bài 18).

> **Suy luận.** Docs không mô tả riêng ca "client session hết, user session còn". Kết luận "không có form" suy ra từ hai dữ kiện: user session là cha và login client mới chỉ thêm client session (3.1); idle của user session được `shop` đặt lại khi refresh (3.2). Kiểm bằng: đặt Client Session Idle 60 s cho một client, đợi 70 s, mở `/auth` của nó bằng cùng cookie jar, xem nhận form hay 302 kèm `code`.

### 5.3 Timer refresh cả ngày và SSO Session Max

SPA refresh theo **timer** mỗi 270 s (30 s trước khi access token hết), kể cả khi máy không có người. Login 08:00:00.

Idle không bao giờ chạm 30 phút. Đồng hồ còn lại là Max: 08:00 + 36.000 s = **18:00:00**.

Lịch refresh: 08:00 + k × 270 s. 36.000 / 270 = 133,3, nên refresh cuối trước 18:00 là k = 133, lúc 08:00 + 35.910 s = **17:58:30**. Lần k = 134 lúc **18:03:00**: session đã chết, **`invalid_grant`**, redirect ra **form đăng nhập**.

Access token cấp 17:58:30 không sống tới 18:03:30: Keycloak cắt `exp` xuống mốc Max (hộp đo ở 3.3), nên response ghi `expires_in 90` và API trả **401** từ **18:00:00**. RT cấp cùng lúc cũng hết 18:00:00, nên lỗi lúc 18:03:00 là `"Token is not active"`.

Với app refresh theo timer, SSO Session Idle gần như vô nghĩa: máy để mở qua trưa vẫn giữ phiên tới 18:00. Yêu cầu "không thao tác 15 phút thì đăng xuất" phải đo "thao tác" ở app, không ở Keycloak.

### 5.4 Offline token: 30 ngày idle, 60 ngày max

App mobile xin `offline_access`. Login **01/03 09:00**, mở app mỗi ngày, lần refresh cuối **10/03 20:15**, đi xa, mở lại **12/04 08:00**. Ngày 05/03 user bấm Logout trên bản web.

Logout web 05/03 kết thúc user session của trình duyệt, không đụng offline session: app mobile vẫn chạy.

Idle 30 ngày từ lần refresh cuối: 10/03 20:15 + 2.592.000 s = **09/04 20:15**. Mở app 12/04 08:00 → **`invalid_grant`**, đăng nhập lại.

Biến thể: bật Offline Session Max Limited, user mở app **mỗi ngày**. Idle không chạm; trần tuổi 01/03 09:00 + 5.184.000 s = **30/04 09:00**. Lần mở app đầu tiên sau mốc đó, chẳng hạn 30/04 09:05, → **`invalid_grant`** dù user vừa dùng tối hôm trước. SSO Session Max 10 giờ không xuất hiện ở đâu trong bài này.

---

## 6. Chuyển giao

Không có đáp án trong bài. Dùng cơ chế ở mục 3 để tự suy.

1. Bạn bật Revoke Refresh Token, Max Reuse 1. Ba tab chia RT qua `localStorage`; tab C bị trình duyệt treo 6 phút rồi tỉnh dậy với RT đọc trước khi ngủ. Vẽ dòng thời gian ba tab, chỉ ra request nào làm cả ba tab mất phiên. Tăng Max Reuse lên 5 có cứu được không, và app phải sửa gì?
2. Service backend gọi password grant mỗi phút để gọi API nội bộ. Ở trạng thái ổn định, cùng lúc có khoảng bao nhiêu user session đang sống với mặc định? Nên dùng grant nào thay, và vì sao grant đó không để lại session?
3. Job đêm dùng offline token của một kế toán. Kế toán nghỉ việc, IT bấm "đăng xuất mọi phiên" trên trang quản trị user. Job đêm đó còn chạy không? Bạn cần biết thêm gì về tác động của thao tác đó lên offline session, và đo trên lab bằng cách nào?
4. Rút Access Token Lifespan từ 300 s xuống 60 s. Với 50.000 user online, mỗi người một tab refresh theo timer, số refresh mỗi giây tới Keycloak tăng từ bao nhiêu lên bao nhiêu? Đổi lại được bao nhiêu giây cửa sổ sau logout?
5. Đặt SSO Session Idle 900 s có đáp ứng "không thao tác 15 phút thì đăng xuất" khi SPA refresh lười không? Chỉ ra một chuỗi thao tác làm user bị đá ra khi mới vắng 11 phút.
6. **Câu khó nhất.** App ngân hàng đặt ba yêu cầu: thu hồi phiên có hiệu lực với **mọi** API trong 30 giây; API không gọi Keycloak ở mỗi request; user mobile không phải nhập mật khẩu trong 90 ngày nếu tuần nào cũng mở app. Chọn Access Token Lifespan, online hay offline session, Offline Session Idle/Max Limited, Revoke Refresh Token. Chứng minh ba yêu cầu cùng đúng được, hoặc chỉ ra cặp nào mâu thuẫn và cần thành phần gì ngoài năm đồng hồ của Keycloak để gỡ.

---

## 7. Tóm tắt

- Hai tầng session: **user session** (id là claim `sid`) và **client session** (một cho mỗi client trong user session). Password grant tạo user session mới mỗi lần (lab: 13 lần, 13 session); client credentials không tạo.
- Mặc định 26.8.1 từ `Constants.java`, khớp `kcadm get realms/demo`: access token 300 s, code 60 s, SSO Idle 1.800 s, SSO Max 36.000 s, Client Session Idle/Max 0 (theo SSO), Offline Idle 2.592.000 s (30 ngày), Offline Max Limited tắt (bật: 60 ngày).
- SSO Idle chỉ đặt lại khi client xin xác thực hoặc refresh; gọi API không giữ session sống. Idle đếm từ lần refresh cuối, không từ lần bấm cuối. SSO Max đếm từ login, không đặt lại.
- Không có "Refresh Token Lifespan". Refresh token là JWT HS512 chỉ Keycloak verify được; `refresh_expires_in` = min(SSO idle, client idle, phần còn lại tới SSO Max); gần Max, `exp` của access token cũng bị cắt. Refresh luôn tra session: session chết thì `invalid_grant` dù chưa tới `exp`.
- Cửa sổ 2 phút chỉ áp khi persistent user sessions tắt; từ 26.0.0 nó bật mặc định, session ghi DB ngay lúc login và sống qua SIGKILL cả cụm (lab 2).
- **Revoke Refresh Token mặc định tắt**: RT mới mỗi lần refresh nhưng RT cũ vẫn dùng được (lab). Bật lên thì trình lại RT quá Max Reuse lần, hoặc trình RT cũ hơn lần refresh gần nhất, xoá client session; app phải gom refresh song song.
- Offline token cần role `offline_access` + `scope=offline_access`; không chịu SSO Idle/Max, sống qua logout, chết sau 30 ngày không dùng; từ 26.8.0 luôn có `exp`.
- Revoke access token không giết phiên; revoke refresh token xoá client session; logout xoá user session. Access token đã phát vẫn qua verify offline tới `exp`, tối đa 300 s với mặc định.

→ **Bài 11 — SPA, PKCE và BFF**: refresh token là chìa khoá sống theo session và mặc định không single-use, nên câu hỏi tiếp theo là cất nó ở đâu trong một SPA: bộ nhớ, `localStorage`, hay sau một BFF giữ bằng cookie `HttpOnly`.
