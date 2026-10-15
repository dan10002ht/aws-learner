# Bài 9 — Client scope và protocol mapper

## 1. Mục tiêu

Sau bài này bạn có thể:

- Đọc `defaultClientScopes`/`optionalClientScopes` của một client và đoán đúng claim `scope` cho mọi giá trị tham số `scope`, kể cả khi không gửi.
- Chỉ ra một claim nằm ở access token, ID token, userinfo hay introspection, và sửa mapper nào để đổi chỗ đó.
- Thêm audience mapper để `aud` chứa đúng API, đo token đổi bao nhiêu byte, và giải thích vì sao introspection chuyển sang `active:true`.
- Bác bỏ cấu hình "API kiểm `aud` là xong" trong hai dạng: kiểm `aud` = `account`, và kiểm `aud` chứa chính API trong khi Full Scope Allowed còn bật.
- Tính tay `aud` của token cho từng client khi biết role của user, Full Scope Allowed và audience mapper của từng client.
- Nói lightweight access token bớt bao nhiêu byte, mất claim nào, và API trả giá gì.

---

## 2. Triệu chứng

Một app thương mại điện tử có hai API cùng nhận token từ Keycloak. `orders-api` (Spring Boot) validate cục bộ bằng `issuer-uri`. `report-api` gọi introspection bằng client confidential `api-client`.

Cùng loại token của alice, lấy qua client `test-direct` bằng password grant, `expires_in: 300`:

- `orders-api` trả `200` cho `/api/orders`.
- `report-api` gọi `POST /token/introspect` và nhận đúng một dòng: `{"active":false}`. Token mới cấp, còn gần trọn 300 giây.

Người viết `report-api` thử loại trừ: lấy token client credentials **của chính `api-client`** rồi tự introspect. Vẫn `{"active":false}`.

Tech lead decode token, thấy `aud` = `account`, và kết luận: "Spring chưa kiểm `aud`. Thêm vào là xong." Một bạn thêm một dòng so `aud` với `account`, vì đó là giá trị có trong mọi token. Test xanh hết.

> **Đo trên lab.** Keycloak 26.8.1, Mac mini Apple M4. Lab 1 (realm `demo`, `start-dev`): hai lần introspect đều `{"active":false}`; access token của `test-direct` 1.302 byte, `aud` = `account`. Lab 2 (realm `lab`, Spring Boot 3.5.16, Spring Security 6.5.11): token `'aud': 'account'` vẫn được `200`.

---

## ⏸ Dừng lại — đoán trước #1

Token còn hạn, chữ ký đúng, `api-client` là client confidential có secret đúng. Vì sao introspection trả `active:false`, kể cả với token của chính `api-client`?

```
(a) Token password grant không introspect được, chỉ token authorization code mới được
(b) api-client không có mặt trong claim aud của token
(c) Phải gửi header Accept: application/jwt thì introspection mới trả token còn sống
(d) api-client chưa được gán role nào nên Keycloak từ chối mà không báo lỗi
```

---

## 3. Lý thuyết

### 3.1 `aud` là cổng chung của cả hai đường validate

Đáp án là **(b)**. Introspection trả cùng một câu `{"active":false}` cho mọi kiểu lỗi; lý do chỉ có trong log server:

```
type="INTROSPECT_TOKEN_ERROR", realmName="demo", clientId="api-client", error="invalid_token",
reason="Client 'api-client' is not in the token audience", token_issued_for="test-direct"
```

**`aud` (audience)** là claim liệt kê những bên được phép nhận token. Upgrading guide của Keycloak ghi hành vi cũ: *"Previously, any authenticated client could introspect any valid token."* Từ 26.6.2, client gọi introspection mà không nằm trong `aud` của token thì nhận `active: false`. Token client credentials của `api-client` cũng có `aud` = `account`, nên chính chủ cũng bị từ chối: `azp` (client được cấp token) không thay được `aud`.

Đường validate cục bộ cũng có đúng luật đó, chỉ là không ai bắt buộc bạn bật. RFC 7519 nói bên xử lý JWT mà không thấy mình trong `aud` (khi claim có mặt) thì phải từ chối JWT. RFC 9700 nói rõ mục đích: *"In particular, access tokens SHOULD be audience-restricted to a specific resource server or, if that is not feasible, to a small set of resource servers."* 

Vậy cả hai API trong triệu chứng đòi cùng một thứ: **`client_id` của API phải nằm trong `aud`**. Introspection đòi bằng code của Keycloak, validate cục bộ đòi bằng cấu hình của bạn. Bài 8 đã giải thích vì sao `aud` chỉ có `account` (Audience Resolve). Bài này hỏi: **ai quyết định claim nào vào token**, để đưa đúng API vào `aud`.

> **Nguồn.** Introspection kiểm audience từ 26.6.2 ([upgrading](https://www.keycloak.org/docs/latest/upgrading/index.html#token-introspection-now-validates-audience-claim)). JWT không có mình trong `aud` thì phải bị từ chối ([rfc7519](https://www.rfc-editor.org/rfc/rfc7519)). Audience-restricted ([rfc9700](https://www.rfc-editor.org/rfc/rfc9700)).

### 3.2 Client scope: tham số `scope` chỉ là lời xin

**Client scope** là một gói cấu hình gắn được vào nhiều client: *"A client scope configures protocol mappers and role scope mappings for multiple clients."* Nó giải bài toán lặp: 30 client cần claim `email` thì không khai 30 mapper. Gói chứa **protocol mapper** (sinh claim, 3.3) và **role scope mapping** (role nào được vào token, 3.5).

Client gắn client scope theo một trong hai kiểu, và đây là chỗ duy nhất tham số `scope` có tác dụng:

- **Default**: áp dụng mọi lúc, tham số `scope` không đổi được gì. Docs: *"For the OpenID Connect Protocol, the Mappers and Role Scope Mappings are always applied, regardless of the value used for the scope parameter in the OpenID Connect authorization request."*
- **Optional**: chỉ áp dụng khi client xin. Docs: *"Optional client scopes are applied when issuing tokens for this client but only when requested by the scope parameter in the OpenID Connect authorization request."*

Vì sao chia hai kiểu? Nguyên nhân gốc là **claim trong token phải đoán được từ phía server**. Default scope là thứ admin bảo đảm mọi token của client đều có, dù app gửi URL sai. Optional scope là phần cấp thêm theo yêu cầu, đúng nghĩa OAuth "xin phạm vi".

Realm mới tạo trong 26.8.1 gắn sẵn cho mọi client mới:

| Client scope | Kiểu | Mapper bên trong | Claim trong token lab |
|---|---|---|---|
| `profile` | default | 14 mapper (`full name`, `username`...) | `name`, `given_name`, `family_name`, `preferred_username` |
| `email` | default | `email`, `email verified` | `email`, `email_verified` |
| `roles` | default | `audience resolve`, `realm roles`, `client roles` | `realm_access`, `resource_access`, `aud` |
| `web-origins` | default | `allowed web origins` | `allowed-origins` (client có `webOrigins`) |
| `acr` | default | `acr loa level` | `acr` |
| `basic` | default | `sub`, `auth_time` | `sub`, `auth_time` |
| `offline_access` | optional | không có | refresh token thành offline token, `refresh_expires_in: 2592000` |
| `address`, `phone`, `microprofile-jwt`, `organization` | optional | `phone number`, `groups`... | lab không xin |

> **Đo trên lab (critic, 26.8.1).** Cột mapper đọc từ realm mới `lab` (`start-dev`, Mac mini M4): `kc get client-scopes -r lab | jq '.[] | {name, m: [.protocolMappers[]?.name]}'`.

Bốn scope `roles`, `web-origins`, `acr`, `basic` có hiệu lực nhưng **không hiện** trong claim `scope` của access token. Lab: access token ghi `openid profile email`, refresh token cùng phiên ghi `openid profile basic web-origins acr roles email`. Docs nói thẳng cho `roles`: *"This scope is not defined in the OpenID Connect specification and is not added automatically to the scope claim in the access token."* Chỗ hay sai: đọc claim `scope` để biết token có role không. Nó không phải danh sách đủ các scope đã áp dụng.

Hai luật nữa thay đổi cách bạn dùng optional scope:

- Client scope có role scope mapping thì chỉ áp dụng cho user có ít nhất một role trong đó: *"However, when a client scope has role scope mappings defined, the user must be a member of at least one of the roles."* Optional scope vì thế thành cửa có điều kiện: user không có role billing thì xin `billing` cũng không được.
- Mỗi client có một **dedicated client scope** riêng, chỗ chứa mapper chỉ dành cho client đó, và *"It is not possible to unlink the dedicated client scope from a client."* Mapper tạo thẳng trên client (lệnh ở mục 4.3) gắn với riêng client đó: chạy cho mọi token của nó, không đụng client khác.

> **Nguồn.** Client scope, default/optional, `roles`, role scope mapping, dedicated scope ([_client_scopes](https://www.keycloak.org/docs/latest/server_admin/index.html#_client_scopes)). Gắn sẵn khi tạo realm: `profile` default ([OIDCLoginProtocolFactory.java#L487](https://github.com/keycloak/keycloak/blob/26.8.1/services/src/main/java/org/keycloak/protocol/oidc/OIDCLoginProtocolFactory.java#L487)), `address` optional ([#L489](https://github.com/keycloak/keycloak/blob/26.8.1/services/src/main/java/org/keycloak/protocol/oidc/OIDCLoginProtocolFactory.java#L489)), `offline_access` optional ([DefaultClientScopes.java#L57](https://github.com/keycloak/keycloak/blob/26.8.1/server-spi-private/src/main/java/org/keycloak/models/utils/DefaultClientScopes.java#L57)).

---

## ⏸ Dừng lại — đoán trước #2

Một app nội bộ chỉ cần biết user là ai, không muốn giữ email của nhân viên trong log request. Dev đổi URL authorize thành `scope=openid` (bỏ `email`) cho client của app, cấu hình scope của client để nguyên mặc định. Access token mới:

```
(a) Không còn email, email_verified: client không xin scope email
(b) Vẫn có email: email là default scope, áp dụng bất kể tham số scope
(c) Không còn email trong access token nhưng ID token vẫn có
(d) Keycloak từ chối request vì thiếu scope bắt buộc email
```

---

### 3.3 Protocol mapper: claim nào đi tới nơi nào

Đáp án là **(b)**. Lab gửi đúng `scope=openid` (`pkce.sh`) và nhận `openid profile email` cùng claim `email`. Lab 2 không gửi `scope` nào, token vẫn có `'scope': 'email profile'`. App gửi ít scope không bớt được PII; phải chuyển `email` sang optional **trên client đó**.

**Protocol mapper** biến một mẩu dữ liệu (thuộc tính user, role, session, giá trị cố định) thành một claim. Mapper sống trong client scope hoặc dedicated scope, và có công tắc riêng cho từng nơi claim tới; lệnh lab tạo audience mapper đặt hai công tắc `access.token.claim=true` và `introspection.token.claim=true`.

Bốn nơi, bốn người đọc:

| Nơi | Ai đọc | Lab thấy |
|---|---|---|
| Access token | API (resource server) | `realm_access`, `resource_access`, `aud:"account"`, `email`, `name`, `acr`, `allowed-origins` |
| ID token | Chính app đăng nhập | `aud:"spa"`, `nonce`, `at_hash`, `email`, `name`; **không có role** |
| Userinfo | App, gọi bằng access token | `sub`, `email`, `email_verified`, `name`, `preferred_username`, `given_name`, `family_name`; không có role |
| Introspection | API confidential có trong `aud` | toàn bộ claim của access token cộng `client_id`, `username`, `token_type`, `active` |

Cùng một lần đăng nhập, role chỉ đi vào access token: đó là quyết định của mapper role, không phải luật OIDC. Docs nói tương tự về hai mapper audience: *"Both the Audience and Audience Resolve protocol mappers add the audiences to the access token only, by default."* ID token giữ `aud` là `spa`, đúng yêu cầu OIDC (*"It MUST contain the OAuth 2.0 client_id of the Relying Party as an audience value."*).

Keycloak cố ý làm ngược ở access token: *"The frontend client itself is not automatically added to the access token audience, therefore allowing easy differentiation between the access token and the ID token, since the access token will not contain the client for which the token is issued as an audience."* Nhờ vậy API kiểm `aud` đúng cách sẽ từ chối ID token bị gửi nhầm làm Bearer.

> **Đo trên lab (critic, 26.8.1).** `config` của ba mapper scope `roles` chỉ có `access.token.claim` và `introspection.token.claim` (`"true"`), không có key `id.token.claim` hay `userinfo.token.claim`; mapper `email` có đủ bốn key. Khớp với chỗ role vắng ở ID token và userinfo trong lab 1.

> **Nguồn.** Audience mapper chỉ vào access token ([audience-support](https://www.keycloak.org/docs/latest/server_admin/index.html#audience-support)). Client không tự vào `aud` của access token ([_audience_resolve](https://www.keycloak.org/docs/latest/server_admin/index.html#_audience_resolve)). `aud` của ID token ([openid-connect-core-1_0](https://openid.net/specs/openid-connect-core-1_0.html)).

<svg viewBox="0 0 800 360" role="img" aria-labelledby="kc9-a-t kc9-a-d" style="width:100%;height:auto">
<title id="kc9-a-t">Từ tham số scope tới claim ở bốn nơi</title>
<desc id="kc9-a-d">Tham số scope chỉ chọn optional client scope; default scope và dedicated scope luôn áp dụng; mapper trong các scope đó có công tắc riêng cho access token, ID token, userinfo và introspection, nên cùng một lần đăng nhập cho ra bốn tập claim khác nhau.</desc>
<defs>
<marker id="kc9-a-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0,0 L10,5 L0,10 z" fill="currentColor" fill-opacity="0.6"/>
</marker>
</defs>
<rect x="15" y="140" width="150" height="70" rx="8" fill="#64748b" fill-opacity="0.2"/>
<text x="90" y="163" text-anchor="middle" font-size="11" fill="currentColor" font-weight="bold">Request</text>
<text x="90" y="182" text-anchor="middle" font-size="11" fill="currentColor">scope=openid</text>
<text x="90" y="199" text-anchor="middle" font-size="11" fill="currentColor">offline_access</text>
<rect x="205" y="20" width="200" height="104" rx="8" fill="#3b82f6" fill-opacity="0.2"/>
<text x="305" y="42" text-anchor="middle" font-size="11" fill="currentColor" font-weight="bold">Default: luôn áp dụng</text>
<text x="305" y="62" text-anchor="middle" font-size="11" fill="currentColor">profile, email, roles</text>
<text x="305" y="80" text-anchor="middle" font-size="11" fill="currentColor">web-origins, acr, basic</text>
<text x="305" y="100" text-anchor="middle" font-size="11" fill="currentColor">+ dedicated scope</text>
<text x="305" y="116" text-anchor="middle" font-size="11" fill="currentColor">(không gỡ được)</text>
<rect x="205" y="146" width="200" height="86" rx="8" fill="#84cc16" fill-opacity="0.2"/>
<text x="305" y="168" text-anchor="middle" font-size="11" fill="currentColor" font-weight="bold">Optional: chỉ khi xin</text>
<text x="305" y="188" text-anchor="middle" font-size="11" fill="currentColor">offline_access: có xin, áp</text>
<text x="305" y="206" text-anchor="middle" font-size="11" fill="currentColor">phone, address: không xin</text>
<text x="305" y="224" text-anchor="middle" font-size="11" fill="currentColor">-> bỏ qua</text>
<rect x="205" y="254" width="200" height="70" rx="8" fill="#ef4444" fill-opacity="0.15"/>
<text x="305" y="276" text-anchor="middle" font-size="11" fill="currentColor">Scope có role scope mapping</text>
<text x="305" y="294" text-anchor="middle" font-size="11" fill="currentColor">mà user không có role nào</text>
<text x="305" y="312" text-anchor="middle" font-size="11" fill="currentColor">-> không áp dụng</text>
<rect x="445" y="60" width="160" height="210" rx="8" fill="#f59e0b" fill-opacity="0.2"/>
<text x="525" y="84" text-anchor="middle" font-size="11" fill="currentColor" font-weight="bold">Protocol mapper</text>
<text x="525" y="104" text-anchor="middle" font-size="11" fill="currentColor">mỗi mapper có công tắc</text>
<text x="525" y="122" text-anchor="middle" font-size="11" fill="currentColor">cho từng nơi nhận</text>
<text x="525" y="150" text-anchor="middle" font-size="11" fill="currentColor">email: AT, ID, userinfo</text>
<text x="525" y="170" text-anchor="middle" font-size="11" fill="currentColor">roles: AT, introspect</text>
<text x="525" y="190" text-anchor="middle" font-size="11" fill="currentColor">Audience Resolve: AT</text>
<text x="525" y="210" text-anchor="middle" font-size="11" fill="currentColor">audience mapper:</text>
<text x="525" y="228" text-anchor="middle" font-size="11" fill="currentColor">AT, introspect</text>
<rect x="645" y="20" width="140" height="58" rx="8" fill="#8b5cf6" fill-opacity="0.2"/>
<text x="715" y="43" text-anchor="middle" font-size="11" fill="currentColor" font-weight="bold">Access token</text>
<text x="715" y="62" text-anchor="middle" font-size="11" fill="currentColor">aud, role, email</text>
<rect x="645" y="98" width="140" height="58" rx="8" fill="#8b5cf6" fill-opacity="0.2"/>
<text x="715" y="121" text-anchor="middle" font-size="11" fill="currentColor" font-weight="bold">ID token</text>
<text x="715" y="140" text-anchor="middle" font-size="11" fill="currentColor">aud=spa, không role</text>
<rect x="645" y="176" width="140" height="58" rx="8" fill="#8b5cf6" fill-opacity="0.2"/>
<text x="715" y="199" text-anchor="middle" font-size="11" fill="currentColor" font-weight="bold">Userinfo</text>
<text x="715" y="218" text-anchor="middle" font-size="11" fill="currentColor">profile, email</text>
<rect x="645" y="254" width="140" height="58" rx="8" fill="#8b5cf6" fill-opacity="0.2"/>
<text x="715" y="277" text-anchor="middle" font-size="11" fill="currentColor" font-weight="bold">Introspection</text>
<text x="715" y="296" text-anchor="middle" font-size="11" fill="currentColor">AT + client_id ...</text>
<line x1="165" y1="165" x2="203" y2="80" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc9-a-arrow)"/>
<line x1="165" y1="180" x2="203" y2="185" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc9-a-arrow)"/>
<line x1="405" y1="75" x2="443" y2="120" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc9-a-arrow)"/>
<line x1="405" y1="185" x2="443" y2="175" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc9-a-arrow)"/>
<line x1="605" y1="110" x2="643" y2="52" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc9-a-arrow)"/>
<line x1="605" y1="140" x2="643" y2="127" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc9-a-arrow)"/>
<line x1="605" y1="190" x2="643" y2="205" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc9-a-arrow)"/>
<line x1="605" y1="220" x2="643" y2="280" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc9-a-arrow)"/>
<text x="400" y="350" text-anchor="middle" font-size="11" fill="currentColor">Ví dụ mapper lấy từ token lab (client spa và test-direct, Keycloak 26.8.1). AT = access token.</text>
</svg>

### 3.4 Audience mapper: đưa đúng API vào `aud`

Có hai mapper sinh `aud`, khác nhau ở **nguồn sự thật**:

- **Audience Resolve** (sẵn trong scope `roles`, bài 8): `aud` là mọi client có ít nhất một client role trong token. Nguồn sự thật là **role của user**.
- **Audience** (`oidc-audience-mapper`): thêm một client cố định vào `aud`, khai bằng `included.client.audience`. Nguồn sự thật là **cấu hình của client cấp token**.

Lab thêm loại thứ hai trên client `test-direct`, trỏ tới `api-client`. Alice không có role nào của `api-client`, vậy mà token mới có `["api-client","account"]` trong `aud`: audience mapper không nhìn role. Introspection bằng `api-client` chuyển sang `active:true`.

Tốn bao nhiêu byte? Chuyển `aud` từ chuỗi sang mảng là thêm `[`, `"api-client",` và `]`: 15 byte JSON, base64url thành 15 × 4/3 = 20 ký tự, khớp đúng 1.322 − 1.302. Audience tiếp theo chỉ thêm `,"<tên>"`, tức (L + 3) × 4/3 ký tự.

Hai biên của `aud`:

- Refresh token không bao giờ mang `aud` của client: *"Refresh tokens and offline tokens are never issued to an audience of clients - their aud claim is the realm itself - so they are not subject to the audience check."* Lab: refresh token có `"aud":"http://localhost:8080/realms/demo"`, kèm claim riêng `aud_x` mang đúng giá trị `aud` của access token cùng lần cấp.
- Audience mapper đặt ở client **cấp** token. `orders-api` không tự kéo mình vào `aud`; mỗi client gọi nó phải được khai.

> **Đo trên lab.** Lab 1, client `test-direct`, password grant, `scope=openid`. Trước mapper: `tok_pw.json`, 1.302 byte, `aud` = `account`. Sau mapper: `tok_pw2.json`, 1.322 byte, `aud` = `[api-client, account]`, `resource_access` vẫn chỉ có `account`. Introspection sau mapper: `intro_ok.json` có `"active":true`.

> **Nguồn.** Refresh/offline token có `aud` là realm ([token-introspection-audience-validation](https://www.keycloak.org/docs/latest/server_admin/index.html#token-introspection-audience-validation)). Audience Resolve trong scope `roles` ([audience-support](https://www.keycloak.org/docs/latest/server_admin/index.html#audience-support)).

---

## ⏸ Dừng lại — đoán trước #3

Rút kinh nghiệm, team sửa `orders-api` cho đúng: kiểm `aud` **chứa `orders-api`**, không phải `account`. Họ tạo client role `orders.read` của `orders-api` và gán cho nhân viên kho. Không ai thêm audience mapper. Full Scope Allowed để mặc định trên mọi client. Một nhân viên kho đăng nhập vào **công cụ chấm công** nội bộ (client `timesheet`, chẳng liên quan đơn hàng), và token đó bị lộ.

```
(a) orders-api từ chối: token của timesheet không có orders-api trong aud
(b) orders-api nhận: aud chứa orders-api vì user có client role của nó
(c) orders-api nhận vì aud = account và mọi API chấp nhận account
(d) Keycloak từ chối cấp token cho timesheet vì user có role của client khác
```

---

### 3.5 Bản sai: "API kiểm `aud` là xong"

Bản sai đáng tin vì kiểm `aud` là lời khuyên của mọi checklist JWT (sec-05). Ở dạng thô nhất nó chạy: `orders-api` kiểm `aud` = `account`, mọi request hợp lệ qua, ID token gửi nhầm (`aud:"spa"`) bị chặn.

**Gãy lần 1: `account` có trong token của mọi client.** Lab 1: token của `spa` (authorization code), của `test-direct` (password grant) và token client credentials của `api-client` đều có `account` trong `aud`. Kiểm `aud` = `account` chỉ loại được ID token, không phân biệt API này với API khác, tức không làm được việc RFC 9700 giao cho `aud`. Tệ hơn: `account` có mặt chỉ vì default roles và Full Scope Allowed (bài 8). Ngày admin tắt Full Scope Allowed trên một client, token của client đó mất hẳn claim `aud` (hộp đo ở cuối phần sửa) và API từ chối mọi người dùng client đó.

**Gãy lần 2: kiểm đúng tên API, nhưng `aud` đi theo user.** Đáp án ⏸ #3 là **(b)**. Ghép ba dữ kiện: Audience Resolve đưa vào `aud` mọi client có client role trong token; Full Scope Allowed bật thì token của client nào cũng chứa mọi role của user; nhân viên kho có `orders.read`. Token của `timesheet` vì thế có `orders-api` trong `aud`. Kiểm `aud` lúc này chỉ chứng minh "user có role của `orders-api`", không chứng minh "token cấp để gọi `orders-api`". Lộ token của app ít giá trị nhất là gọi được API giá trị nhất, đúng kịch bản `aud` sinh ra để chặn.

> **Đo trên lab (critic, 26.8.1).** Alice có `orders-api: orders.read`; client `timesheet` để mặc định. Token password grant qua `timesheet`: `aud` = `[orders-api, account]`, 1.357 byte; `orders-api` introspect ra `active:true`, `azp` = `timesheet`. Đúng cơ chế docs: *"The mapper checks for clients that have at least one client role available for the current token."* Lệnh ở 4.4.

**Sửa: chuyển nguồn sự thật của `aud` từ user sang client.**

1. Tắt Full Scope Allowed trên từng client (switch đã deprecated từ 26.8.0, bài 8).
2. Khai **role scope mapping** cho client: chỉ role client đó cần mới vào token. Đặt trong dedicated scope, hoặc trong client scope dùng chung để nhiều client tái dùng.
3. Với client thật sự gọi API, thêm audience mapper trỏ tới API.

Sau ba bước, token `timesheet` không còn role của `orders-api`, Audience Resolve không có gì để thêm. Token của client đơn hàng có `orders-api` vì admin đã khai.

> **Đo trên lab (critic, 26.8.1).** Tắt Full Scope trên `timesheet`: token mất hẳn `aud`, `resource_access` và cả `realm_access`, 1.357 xuống 1.022 byte; `orders-api` introspect nhận `{"active":false}`; log hết dòng WARN `full-scope-allowed` cho `timesheet`. Client đóng vai `orders-ui` (Full Scope tắt, role scope mapping `orders.read`): `"aud":"orders-api"`, 1.129 byte. Audience Resolve đã tự thêm `orders-api`; audience mapper thêm sau không đổi byte nào vì `aud` không lặp giá trị.

**Gãy lần 3: chẳng ai kiểm cả.** Lab 2: Spring Boot chỉ cấu hình `issuer-uri` cho qua token `aud` = `account` ở một API chẳng liên quan `account`. Chữ ký và `iss` được kiểm (token sửa chữ ký bị `401`), `aud` thì không. Cách bật validator `aud` trong Spring để bài 12.

<svg viewBox="0 0 800 300" role="img" aria-labelledby="kc9-b-t kc9-b-d" style="width:100%;height:auto">
<title id="kc9-b-t">aud đi theo user hay đi theo client</title>
<desc id="kc9-b-d">Bên trái, Full Scope Allowed bật: role orders.read của user đi vào token của client timesheet, Audience Resolve thêm orders-api vào aud, orders-api nhận token lộ. Bên phải, Full Scope tắt cộng role scope mapping và audience mapper: chỉ client orders-ui mang orders-api trong aud.</desc>
<defs>
<marker id="kc9-b-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0,0 L10,5 L0,10 z" fill="currentColor" fill-opacity="0.6"/>
</marker>
</defs>
<text x="200" y="22" text-anchor="middle" font-size="12" fill="currentColor" font-weight="bold">Full Scope ON: aud theo role của user</text>
<text x="600" y="22" text-anchor="middle" font-size="12" fill="currentColor" font-weight="bold">Full Scope OFF: aud theo cấu hình client</text>
<line x1="400" y1="35" x2="400" y2="285" stroke="currentColor" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="4 3"/>
<rect x="20" y="45" width="160" height="50" rx="8" fill="#64748b" fill-opacity="0.2"/>
<text x="100" y="66" text-anchor="middle" font-size="11" fill="currentColor">User: orders.read</text>
<text x="100" y="84" text-anchor="middle" font-size="11" fill="currentColor">(client role orders-api)</text>
<rect x="220" y="45" width="160" height="50" rx="8" fill="#ef4444" fill-opacity="0.2"/>
<text x="300" y="66" text-anchor="middle" font-size="11" fill="currentColor">Client timesheet</text>
<text x="300" y="84" text-anchor="middle" font-size="11" fill="currentColor">không lọc role nào</text>
<rect x="60" y="130" width="280" height="56" rx="8" fill="#f59e0b" fill-opacity="0.2"/>
<text x="200" y="153" text-anchor="middle" font-size="11" fill="currentColor">Token: resource_access.orders-api</text>
<text x="200" y="172" text-anchor="middle" font-size="11" fill="currentColor">Audience Resolve: aud chứa orders-api</text>
<rect x="60" y="220" width="280" height="50" rx="8" fill="#ef4444" fill-opacity="0.25"/>
<text x="200" y="242" text-anchor="middle" font-size="11" fill="currentColor">orders-api kiểm aud: QUA</text>
<text x="200" y="260" text-anchor="middle" font-size="11" fill="currentColor">token lộ từ app chấm công dùng được</text>
<line x1="100" y1="95" x2="160" y2="128" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc9-b-arrow)"/>
<line x1="300" y1="95" x2="240" y2="128" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc9-b-arrow)"/>
<line x1="200" y1="186" x2="200" y2="218" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc9-b-arrow)"/>
<rect x="420" y="45" width="170" height="70" rx="8" fill="#64748b" fill-opacity="0.2"/>
<text x="505" y="66" text-anchor="middle" font-size="11" fill="currentColor">Client timesheet</text>
<text x="505" y="84" text-anchor="middle" font-size="11" fill="currentColor">mapping: không có</text>
<text x="505" y="102" text-anchor="middle" font-size="11" fill="currentColor">role orders-api</text>
<rect x="610" y="45" width="175" height="70" rx="8" fill="#84cc16" fill-opacity="0.2"/>
<text x="697" y="66" text-anchor="middle" font-size="11" fill="currentColor">Client orders-ui</text>
<text x="697" y="84" text-anchor="middle" font-size="11" fill="currentColor">mapping: orders.read</text>
<text x="697" y="102" text-anchor="middle" font-size="11" fill="currentColor">+ audience mapper</text>
<rect x="420" y="150" width="170" height="50" rx="8" fill="#84cc16" fill-opacity="0.2"/>
<text x="505" y="172" text-anchor="middle" font-size="11" fill="currentColor">Token: không role,</text>
<text x="505" y="190" text-anchor="middle" font-size="11" fill="currentColor">aud không có orders-api</text>
<rect x="610" y="150" width="175" height="50" rx="8" fill="#84cc16" fill-opacity="0.2"/>
<text x="697" y="172" text-anchor="middle" font-size="11" fill="currentColor">Token: orders.read,</text>
<text x="697" y="190" text-anchor="middle" font-size="11" fill="currentColor">aud = orders-api</text>
<rect x="420" y="225" width="365" height="45" rx="8" fill="#3b82f6" fill-opacity="0.2"/>
<text x="602" y="244" text-anchor="middle" font-size="11" fill="currentColor">orders-api kiểm aud: chỉ token của orders-ui qua</text>
<text x="602" y="262" text-anchor="middle" font-size="11" fill="currentColor">vẫn phải kiểm role: aud không phải phân quyền</text>
<line x1="505" y1="115" x2="505" y2="148" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc9-b-arrow)"/>
<line x1="697" y1="115" x2="697" y2="148" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc9-b-arrow)"/>
<line x1="697" y1="200" x2="660" y2="223" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc9-b-arrow)"/>
</svg>

> **Nguồn.** Full Scope Allowed bật cho client mới, deprecated ([_full_scope_disabled_policy](https://www.keycloak.org/docs/latest/server_admin/index.html#_full_scope_disabled_policy), [_role_scope_mappings](https://www.keycloak.org/docs/latest/server_admin/index.html#_role_scope_mappings)). Spring không kiểm `aud` mặc định: ghi chú lab 2 mục A (`tmp/sources/kc-lab-spi-cluster.md`).

### 3.6 Lightweight access token: bớt byte, dời claim sang introspection

**Lightweight access token** đi ngược hướng "nhét mọi thứ vào token" của bài 8: token chỉ giữ một nhóm claim tối thiểu, phần còn lại API phải hỏi Keycloak. Docs bật nó bằng client policy: *"By applying use-lightweight-access-token executor of client policies to a client, the client can receive a lightweight access token instead of an access token."* Nhóm claim không bỏ được:

*"exp, iat, jti, iss, typ, azp, sid, scope, cnf"*

Danh sách **không có `aud`, `sub`, role**. Claim nào khác muốn có mặt phải do mapper bật thêm công tắc thứ năm: *"The lightweight access token contains a claim controlled by a protocol mapper where its setting Add to lightweight access token(default OFF) is turned ON."* Mapper mặc định của realm mới không bật công tắc đó, nên ba hệ quả:

1. Token không có `aud`. API validate cục bộ mà đòi `aud` (đúng như mục 3.5 dạy) sẽ từ chối nó, cho tới khi audience mapper của client cấp token bật Add to lightweight access token (key `lightweight.claim`).
2. API cần role hay `sub` phải gọi introspection. Introspection trả đủ claim của mapper bật công tắc introspection. Cửa `aud` xét `aud` trong JWT; JWT không có `aud` thì xét `aud` **tính lại lúc introspect**, nên thêm hay gỡ mapper có hiệu lực ngay với lightweight token đã phát (token đầy đủ, hay bật `lightweight.claim`, thì không: 4.3).
3. Userinfo đóng cửa với loại token này: *"Now, the UserInfo endpoint returns a 401 Unauthorized error when called with a lightweight access token."*

> **Đo trên lab (critic, 26.8.1).** Realm `lab`, alice, password grant. Bật bằng thuộc tính client `client.use.lightweight.access.token.enabled=true` (lab không dựng client policy). Token 1.371 xuống **747 byte**, payload còn đúng `exp, iat, jti, iss, typ, azp, sid, scope`; userinfo `401`. Thêm audience mapper tới `api-client` (chỉ bật access token + introspection): token vẫn không có `aud`, nhưng `api-client` introspect chuyển từ `active:false` sang `active:true` kèm `aud`, `sub`, `realm_access`, `email`, kể cả với token cấp **trước** khi thêm mapper; token đầy đủ cấp trước mapper thì vẫn `active:false`. Bật `lightweight.claim=true`: token có `"aud":"api-client"`, 771 byte.

Đổi lại được bao nhiêu? 1.371 xuống 747 byte: nhỏ đi 624 byte (45,5%). Giá phải trả: mỗi request tới API thành một lượt introspection, p50 0,59 ms trên localhost lab so với ~124–134 µs verify RS256 cục bộ (Python thuần), chậm hơn 4,4–4,8 lần dù Keycloak cùng máy, và mọi request của API thành tải của Keycloak. Số đo trên máy dev chỉ cho bậc độ lớn. Đánh đổi đáng giá khi header là nút thắt (bài 8: proxy giới hạn header), không đáng khi Keycloak là nút thắt; Keycloak dùng nó cho admin-cli và security-admin-console.

> **Nguồn.** Claim không bỏ được, executor client policy, công tắc Add to lightweight access token ([_using_lightweight_access_token](https://www.keycloak.org/docs/latest/server_admin/index.html#_using_lightweight_access_token)). UserInfo 401 với lightweight token từ 26.6.2 ([upgrading](https://www.keycloak.org/docs/latest/upgrading/index.html#userinfo-endpoint-rejects-lightweight-access-tokens)). Introspection tốn một lượt mạng: *"The downside to this approach is that you have to make a network invocation to the Keycloak server."* ([oidc-layers](https://www.keycloak.org/securing-apps/oidc-layers)).

---

## 4. Lab

Realm `demo` của lab 1, Keycloak 26.8.1 `start-dev`. `kc` là wrapper `kcadm.sh "$@" --config ~/projects/keycloak-lab/lab1/kcadm.config`. Decode bằng `jwt.py` trong cùng thư mục.

### 4.1 Đọc scope của client

```bash
kc get clients/<spa-id> -r demo | jq '{fullScopeAllowed, defaultClientScopes, optionalClientScopes}'
```
```json
"fullScopeAllowed" : true,
"defaultClientScopes" : [ "web-origins", "acr", "profile", "roles", "basic", "email" ],
"optionalClientScopes" : [ "address", "phone", "offline_access", "organization", "microprofile-jwt" ]
```

File `spa.json`; client `bare` tạo không set gì ra đúng hai danh sách này. Discovery quảng cáo 13 giá trị `scopes_supported` (có cả `service_account`), nhưng client chỉ dùng được scope được gắn.

### 4.2 Đổi tham số `scope`, nhìn claim `scope` đổi

Client `test-direct`, alice, ba request (`tok_pw.json`, `tok_pw4.json`, `tok_off.json`):

| `scope` gửi đi | `scope` trong response | `id_token` | `refresh_expires_in` |
|---|---|---|---|
| `openid` | `openid profile email` | có | 1800 |
| không gửi | `profile email` | không | 1800 |
| `openid offline_access` | `openid offline_access profile email` | có | 2592000 |

Ba quan sát, mỗi cái một cơ chế. `profile email` có mặt ở cả ba dòng: default scope không phụ thuộc request. Không gửi `openid` thì không có ID token, vì OIDC đòi *"OpenID Connect requests MUST contain the openid scope value."* `offline_access` chỉ xuất hiện ở dòng xin nó, và kéo theo refresh token `typ:"Offline"` sống 2.592.000 giây (30 ngày); claim `scope` của refresh token đó liệt kê đủ cả bốn scope ẩn.

### 4.3 Introspection trước và sau audience mapper

Trước: `intro.json` là `{"active":false}`, log in dòng `INTROSPECT_TOKEN_ERROR` ở 3.1.

Thêm mapper vào dedicated scope của `test-direct`:

```bash
kc create clients/<test-direct-id>/protocol-mappers/models -r demo -s name=aud-api-client -s protocol=openid-connect \
   -s protocolMapper=oidc-audience-mapper -s 'config."included.client.audience"=api-client' \
   -s 'config."access.token.claim"=true' -s 'config."introspection.token.claim"=true'
```

Lấy token mới (`tok_pw2.json`), decode: `"aud":["api-client","account"]`, 1.322 byte. Introspect lại (`intro_ok.json`, trích):

```json
{"aud":["api-client","account"],"azp":"test-direct","scope":"openid profile email",
 "realm_access":{"roles":["reader","offline_access","default-roles-demo","uma_authorization"]},
 "client_id":"test-direct","username":"alice","token_type":"Bearer","active":true}
```

Với token đầy đủ, cửa `aud` của introspection đọc `aud` ghi lúc **cấp**: token phát trước khi thêm mapper vẫn `active:false` với `api-client` tới `exp`, dù `aud` trong response được tính lại (lightweight token thì ngược lại, 3.6). Đổi mapper trên production là mở một cửa sổ tối đa bằng access token lifespan (300 giây mặc định) mà token cũ và mới cùng lưu hành.

### 4.4 Tắt Full Scope Allowed

Realm `lab` của critic (26.8.1 `start-dev`), số liệu ở hai hộp đo 3.5. `tok.sh <client>` là password grant của alice.

```bash
kc create clients -r lab -s clientId=orders-api -s publicClient=false -s standardFlowEnabled=false
kc create clients/<orders-api-id>/roles -r lab -s name=orders.read
kc add-roles -r lab --uusername alice --cclientid orders-api --rolename orders.read
./tok.sh timesheet     # aud ["orders-api","account"], 1.357 byte
kc update clients/<timesheet-id> -r lab -s fullScopeAllowed=false
./tok.sh timesheet     # không còn aud, resource_access, realm_access; 1.022 byte
```

Role scope mapping cho `orders-ui`: `kc create clients/<id>/scope-mappings/clients/<orders-api-id> -r lab -f role.json`, `role.json` là mảng chứa role lấy từ `kc get clients/<orders-api-id>/roles/orders.read`.

---

## 5. Tính tay

### 5.1 Đoán claim `scope` trước khi gửi

Client `mobile`: default `profile`, `email`, `roles`, `web-origins`, `acr`, `basic`; optional `phone`, `address`, `offline_access`. Thêm một optional scope tự tạo `billing` có role scope mapping tới realm role `billing-viewer`. User `linh` không có `billing-viewer`.

| Request | Claim `scope` của access token | Lý do |
|---|---|---|
| `scope=openid` | `openid profile email` | default luôn áp; `roles`, `web-origins`, `acr`, `basic` không hiện |
| `scope=openid phone` | `openid phone profile email` | optional được xin |
| `scope=openid billing` | `openid profile email` | `billing` có role scope mapping, linh không có role nào trong đó |
| không gửi `scope` | `profile email`, không ID token | thiếu `openid` |

Dòng thứ ba dễ đoán sai nhất: app xin mà không được, và không có lỗi nào báo.

> **Đo trên lab (critic, 26.8.1).** Đúng cấu hình trên, `scope=openid billing`, alice chưa có role: HTTP 200, `"scope":"openid email profile"`. Gán role xong: `"scope":"openid email billing profile"`. Scope không tồn tại thì bị chặn: `{"error":"invalid_scope","error_description":"Invalid scopes: openid nonexist"}`. Thứ tự tên trong `scope` đổi giữa các realm, nên so như tập hợp.

App phải đọc lại `scope` trong response, không chờ lỗi.

Bước tiếp: admin chuyển `email` của `mobile` sang optional. Request `scope=openid` giờ cho `openid profile`, token không còn `email` và `email_verified`. Với email dài như của alice trong lab, payload JSON bớt đúng phần `,"email_verified":true` và `,"email":"alice@example.com"` (22 + 28 = 50 byte), access token bớt khoảng 50 × 4/3 ≈ 67 ký tự.

### 5.2 Tính `aud` cho từng client

Realm có `orders-api`, `billing-api` (chỉ nhận token), và ba client đăng nhập: `orders-ui`, `timesheet`, `mobile`. User `linh` có client role `orders-api: orders.read`, không có role nào của `billing-api`, và có default roles như lab (nên có role của `account`).

Cấu hình:

- `orders-ui`: Full Scope **tắt**, role scope mapping chỉ `orders-api: orders.read`, audience mapper tới `orders-api`.
- `timesheet`: để mặc định (Full Scope bật), không mapper.
- `mobile`: Full Scope bật, audience mapper tới `billing-api`.

Tính:

| Client | Role client đi vào token | Audience Resolve thêm | Audience mapper thêm | `aud` |
|---|---|---|---|---|
| `orders-ui` | `orders-api` | `orders-api` | `orders-api` | `orders-api` |
| `timesheet` | `orders-api`, `account` | `orders-api`, `account` | không | `orders-api`, `account` |
| `mobile` | `orders-api`, `account` | `orders-api`, `account` | `billing-api` | `orders-api`, `account`, `billing-api` |

Đọc ngược: `orders-api` kiểm `aud` đúng tên mình vẫn nhận token của cả ba client. `billing-api` có trong `aud` của token `mobile` dù linh không có quyền billing: audience mapper không nhìn role. `billing-api` vẫn phải kiểm role; nếu nó dùng introspection, token `mobile` được trả claim, token `timesheet` nhận `active:false`.

Chỉ dòng `orders-ui` có `aud` mang nghĩa "token cấp để gọi API này". Muốn `orders-api` từ chối token `timesheet`, phải tắt Full Scope trên `timesheet`, không phải sửa `orders-api`.

---

## 6. Chuyển giao

Không có đáp án trong bài. Dùng cơ chế ở mục 3 để tự suy.

1. Một app B2B muốn token có claim `groups` để hiển thị menu. Bạn thêm mapper vào client scope dùng chung, vào dedicated scope của app, hay tạo optional scope `groups`? Mỗi lựa chọn ảnh hưởng tới token của bao nhiêu client khác?
2. Mobile app gửi `scope=openid offline_access` trong mọi lần đăng nhập vì copy từ ví dụ. Bạn không muốn app đó có offline token. Sửa ở app hay ở Keycloak, và sửa thế nào để app cũ chưa cập nhật cũng không lấy được?
3. `orders-ui` gọi cả `orders-api` và `report-api`, bạn thêm cả hai làm audience. Token lộ thì thiệt hại khác gì so với mỗi API một token một audience, và client lấy token hẹp hơn mà không bắt user đăng nhập lại bằng cách nào?
4. Bạn tắt Full Scope Allowed trên 30 client cùng lúc nhưng chỉ khai role scope mapping cho 25. API nào gãy, gãy bằng lỗi gì ở API kiểm `aud` cục bộ và ở API introspect, và tìm ra năm client kia trước khi user báo bằng cách nào?
5. Một API vừa verify cục bộ vừa cache kết quả introspection 60 s theo `jti`. Admin gỡ audience mapper tới API đó trên client cấp token. Với token đầy đủ và với lightweight token đã phát, API bắt đầu từ chối sau bao lâu?
6. **Câu khó nhất.** Một SaaS có 40 microservice, mỗi service là client confidential vừa gọi service khác bằng client credentials, vừa nhận token. Yêu cầu: mỗi token chỉ dùng được ở đúng service đích (`aud` một phần tử), introspection chạy được, không ai khai tay 40 × 39 audience mapper. Chỉ với Audience Resolve, audience mapper, role scope mapping và optional client scope, bạn thiết kế thế nào để token client credentials service A xin chỉ có service B trong `aud`? Chỗ nào bài 9 không đủ, và cơ chế nào ở bài 13 lấp vào?

---

## 7. Tóm tắt

- Client scope gói protocol mapper và role scope mapping cho nhiều client dùng chung; mỗi client còn một dedicated scope không gỡ được.
- **Default** scope áp dụng bất kể tham số `scope`; **optional** chỉ khi được xin. Client mới ở 26.8.1 có 6 default và 5 optional (lab). Gửi ít scope không bớt PII; phải đổi cấu hình client.
- Claim `scope` không liệt kê đủ scope đã áp dụng (`roles`, `web-origins`, `acr`, `basic` ẩn). Mapper quyết định claim tới đâu: role có ở access token và introspection, vắng ở ID token và userinfo.
- `aud` của access token mặc định là `account` (lab), không chứa client cấp token; tắt Full Scope Allowed mà không khai role scope mapping thì token mất hẳn `aud` (đo). ID token có `aud` = client_id. Refresh token có `aud` = realm.
- Từ 26.6.2, introspection trả `{"active":false}` nếu client gọi không có trong `aud`, kể cả token của chính nó; lý do chỉ có trong log.
- Audience mapper thêm client cố định vào `aud`, không nhìn role; lab: 1.302 thành 1.322 byte, introspection thành `active:true`.
- "API kiểm `aud` là xong" gãy ba lần: `account` có trong token của mọi client; Full Scope Allowed làm `aud` đi theo role của user chứ không theo client; Spring mặc định không kiểm `aud`. `aud` chỉ có nghĩa khi tắt Full Scope, khai role scope mapping và audience mapper theo từng client.
- Lightweight access token mặc định không có `aud`, `sub`, role (chỉ mapper bật Add to lightweight access token mới vào); userinfo trả 401 với nó từ 26.6.2; introspection tính lại claim và `aud` lúc gọi. Đo: 1.371 xuống 747 byte (45,5%), đổi lại mỗi request một lượt introspection (p50 0,59 ms localhost).

→ **Bài 10 — Session và token lifetime**: bài này đã thấy `refresh_expires_in` nhảy từ 1800 lên 2592000 chỉ vì xin thêm `offline_access`; bài sau mở các con số đó ra: SSO session, client session, offline session, và token nào chết trước khi user quay lại.
