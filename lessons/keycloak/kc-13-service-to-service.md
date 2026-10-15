# Bài 13 — Service-to-service: client credentials và token exchange

## 1. Mục tiêu

Sau bài này bạn có thể:

- Gán quyền cho service account và đọc từ token client credentials vì sao nó mang nhiều role hơn bạn gán, và vì sao `aud` của nó không có API đích.
- Tính số request vào Keycloak (và số core CPU) khi một service xin token mỗi request so với khi cache token tới gần `exp`, từ số đo 1,58 ms và 3,1 ms CPU mỗi token.
- Viết request standard token exchange (V2) đúng bốn điều kiện Keycloak 26.8.1 đòi, và đoán trước mã lỗi khi thiếu từng điều kiện.
- Decode token trước và sau mỗi lần đổi trong chuỗi gateway → orders → payments, nói claim nào giữ nguyên (`sub`, `sid`), claim nào đổi (`azp`, `aud`, `exp`), claim nào không xuất hiện (`act`).
- Giải thích vì sao revoke token gốc không giết token đã đổi ra, còn logout session thì có, và vẽ được khoảng thời gian token đổi ra sống lâu hơn token gốc.
- Nói được khi nào token exchange bị chặn vì token là DPoP-bound, và ai trong chuỗi là bên duy nhất đổi được token đó.

---

## 2. Triệu chứng

Một app thương mại điện tử có ba service sau trình duyệt: `gateway` nhận request từ web, gọi `orders`, `orders` gọi `payments` để trừ tiền. Phòng kiểm toán đòi một thứ đơn giản: mỗi dòng log của `payments` phải ghi **user nào** đã bấm "Thanh toán".

Phiên bản đầu, `orders` gọi `payments` bằng token client credentials của chính nó, xin token mới cho mỗi request. Log `payments` ghi người thực hiện cho 100% giao dịch là một payload kiểu này (lab dựng client `billing-job` đóng vai service gọi):

```json
{"sub": "c077823f-...", "azp": "billing-job", "aud": "account",
 "preferred_username": "service-account-billing-job", "sid": "<absent>"}
```

Không có alice, không có bob. Chỉ có một user ảo tên `service-account-...`.

Phiên bản hai, `orders` chuyển thẳng access token của alice sang `payments`. `payments` kiểm token bằng introspection và nhận `{"active":false}`, dù token còn gần 5 phút. Log Keycloak ghi `reason="Client 'payments' is not in the token audience"`. Token alice mang `"aud": ["gateway", "account"]`.

Đồng nghiệp đề xuất phiên bản ba: thêm audience mapper `orders` và `payments` vào client `web`, để token của alice có cả ba service trong `aud`. "Một token đi suốt chuỗi, khỏi đổi gì."

> **Đo trên lab (chạy riêng cho bài này).** Keycloak 26.8.1 `start-dev`, Java 24, Mac mini Apple M4, cổng 8480. Payload và `aud` của token alice là token thật (`run1.txt`). `active:false` và dòng log: critic đo lại trên cùng realm (26.8.1, cổng 5700), `payments` introspect token của alice. Script và output: `~/projects/keycloak-lab/lab-kc13/`, `~/projects/keycloak-lab/critic-ch3b/`.

---

## ⏸ Dừng lại — đoán trước #1

`payments` cần biết user thật, và chỉ được nhận token dành cho chính nó. Cách nào đúng?

```
(a) Phiên bản ba: audience mapper đưa cả gateway, orders, payments vào aud của token web
(b) orders gửi token client credentials của mình, kèm header X-User-Id: <sub của alice>
(c) orders đưa token alice cho Keycloak, đổi lấy token mới: sub vẫn là alice, aud chỉ có payments
(d) Bật tính năng token-exchange (preview) bằng --features=token-exchange rồi làm như (c)
```

---

## 3. Lý thuyết

Xác thực và phân quyền nói chung ở `security/sec-05-authn-authz.md`; audience validator ở bài 12. Bài này hỏi: khi người gọi API là một service, token của nó lấy ở đâu và mang danh tính của ai.

### 3.1 Vì sao (a), (b), (d) sai

Đáp án là **(c)**. Ba phương án còn lại mỗi cái hỏng ở một cơ chế khác nhau.

**(a) hỏng vì nó xoá đúng thứ `aud` sinh ra để chặn.** `aud` là danh sách bên được phép nhận token; RFC 9700 yêu cầu token *"SHOULD be audience-restricted to a specific resource server or, if that is not feasible, to a small set of resource servers."* Token có cả ba service trong `aud` thì một token rò ở `gateway` (log request, heap dump, thư viện tracing ghi header) là token hợp lệ để trừ tiền ở `payments`: kẻ đọc được log của service ít nhạy cảm nhất gọi được service nhạy cảm nhất.

**(b) hỏng vì `X-User-Id` không có chữ ký.** `payments` xác minh được token là của `orders`, nhưng giá trị header là lời khai của `orders`. `orders` bị chiếm (hoặc chỉ một bug gán nhầm biến) là trừ tiền được của bất kỳ ai, và log kiểm toán ghi đúng tên nạn nhân. Danh tính user lúc này không còn do IdP chứng nhận.

**(d) hỏng vì đó là bản cũ.** Keycloak 26.8.1 có hai cài đặt token exchange. Bản cờ `--features=token-exchange` là V1, docs ghi *"Legacy token exchange: version 1 (V1) - This preview feature is deprecated and not enabled by default once Keycloak server is started."* Bản cần dùng là V2, bật sẵn, không cần cờ nào (3.3).

(c) cần hai mảnh: service có token của chính nó (3.2), và cách đổi token user sang token cho đúng service kế tiếp (3.3).

> **Nguồn.** Audience restriction ([rfc9700](https://www.rfc-editor.org/rfc/rfc9700)). V1 preview, deprecated, mặc định tắt ([token-exchange](https://www.keycloak.org/securing-apps/token-exchange)).

### 3.2 Client credentials: service account mang quyền gì

Bài 2 (mục 3.5) đã chạy grant này: client confidential gửi secret, nhận access token cho chính nó, không refresh token, không user session, `sub` là user kỹ thuật `service-account-<clientId>`. Bài này cần thêm hai thứ bài 2 chưa xét: quyền của token đó đến từ đâu, và vì sao không có refresh token thì việc cache chuyển hẳn sang phía client.

**Service account** là user ảo Keycloak tạo kèm khi bật switch "Service account roles" (`serviceAccountsEnabled=true`); role gán cho user đó chính là quyền của service. Lab gán realm role `payments.charge` cho `service-account-billing-job`:

```bash
kc create clients -r shop -s clientId=billing-job -s publicClient=false -s secret=billing-secret \
   -s serviceAccountsEnabled=true -s standardFlowEnabled=false
kc add-roles -r shop --uusername service-account-billing-job --rolename payments.charge
curl -s -u billing-job:billing-secret -d grant_type=client_credentials $T
```

Response và payload, chỉ giữ claim đang bàn:

```json
{"expires_in":300,"refresh_expires_in":0,"token_type":"Bearer","not-before-policy":0,"scope":"email profile"}
{"sub": "c077823f-...", "azp": "billing-job", "aud": "account",
 "realm_access": {"roles": ["payments.charge", "offline_access", "default-roles-shop", "uma_authorization"]},
 "sid": "<absent>", "preferred_username": "service-account-billing-job",
 "client_id": "billing-job", "jti": "trrtcc:7b555a8f-..."}
```

Hai dòng bài 2 chưa nói:

- `realm_access.roles` có `payments.charge` **và** ba role mặc định. Service account là user, nên nó cũng nhận `default-roles-shop` như mọi user mới (bài 8). Client mới lại bật Full Scope Allowed: *"By default, clients are created with Full Scope Allowed enabled, which causes every access token to contain all roles held by the authenticated user."* Muốn token chỉ mang `payments.charge` thì phải thu hẹp role scope của client hoặc gỡ role khỏi default roles. Đó là phần "scope tối thiểu" của service-to-service: quyền của service là thứ admin gán tay, không có người dùng nào bấm "đồng ý".
- `aud: "account"`, không phải `payments`. Cùng cơ chế bài 9: không có audience mapper thì token service-to-service cũng không mang tên API đích, và `payments` có audience validator (bài 12) sẽ từ chối nó.

Không có refresh token, nên chỗ duy nhất tiết kiệm request vào Keycloak là **cache access token ở phía client**. Bản sai đến đúng chỗ này: "Keycloak cấp token client credentials trong 1,58 ms, xin mỗi request cũng được." Con số đúng; kết luận sai, vì 1,58 ms là độ trễ một luồng tuần tự, còn cái giá thật là số request nhân lên theo tải. Phép tính ở mục 5. Cache đúng cần ba điều:

1. **Khoá cache theo (client, scope/audience)**, không theo user: token client credentials là của service, một token phục vụ mọi request trong 300 s.
2. **Làm mới trước `exp` một khoảng biên** (đọc `expires_in` trong response, không parse token), để request bay giữa đường không mang token hết hạn tới đích.
3. **Một luồng làm mới tại một thời điểm** (single-flight): 50 thread cùng thấy cache hết hạn thì chỉ một thread gọi Keycloak, 49 thread chờ kết quả đó.

> **Đo trên lab.** Lab #1 (Keycloak 26.8.1 `start-dev`, Apple M4, 1 luồng tuần tự, keep-alive): `client_credentials` p50 **1,58 ms**, p95 2,38 ms, n = 200. Lab #2 (2 node, Postgres, k6 10 VU, 10.000 token): tổng CPU Keycloak 31,4 CPU-giây, tức **~3,1 ms CPU mỗi token** client credentials. Cả hai là dev mode trên một máy, chỉ dùng như bậc độ lớn.

> **Nguồn.** Full Scope Allowed bật sẵn ([_full_scope_disabled_policy](https://www.keycloak.org/docs/latest/server_admin/index.html#_full_scope_disabled_policy)). Không refresh token và không user session cho client credentials: bài 2.

---

## ⏸ Dừng lại — đoán trước #2

`gateway` cầm token alice (`azp: web`, `aud: ["gateway","account"]`) và đổi qua Keycloak với `audience=orders`. Token mới trông thế nào?

```
(a) sub = service account của gateway, azp = gateway, aud = orders
(b) sub = alice, azp = web, aud = orders, exp giữ nguyên exp của token gốc
(c) sub = alice, azp = gateway, aud = orders, có claim act = gateway
(d) sub = alice, azp = gateway, aud = orders, không có act, exp tính lại từ lúc đổi
```

---

### 3.3 Standard token exchange (V2): bốn cửa kiểm

**Token exchange** (RFC 8693) là grant cho phép một client đưa token đang cầm (`subject_token`) cho authorization server và nhận lại token khác, thường cho một đích khác. Keycloak 26.8.1 cài phần này dưới tên **standard token exchange**: *"Standard token exchange: version 2 (V2) - This feature is the fully supported token exchange implementation that is enabled by default once the Keycloak server is started."* Nó có từ 26.2.0: *"In this release, Keycloak added support for the Standard token exchange (Feature token-exchange-standard:v2)."*

Request của `gateway`:

```bash
curl -s -u gateway:gateway-secret \
  -d grant_type=urn:ietf:params:oauth:grant-type:token-exchange \
  -d subject_token=$UA \
  -d subject_token_type=urn:ietf:params:oauth:token-type:access_token \
  -d audience=orders $T
```

Đáp án #2 là **(d)**. Decode thật, ba token của chuỗi:

| Claim | Token user (web) | Sau gateway đổi | Sau orders đổi |
|---|---|---|---|
| `sub` | `43875ea9-...` (alice) | `43875ea9-...` | `43875ea9-...` |
| `azp` | `web` | `gateway` | `orders` |
| `aud` | `["gateway","account"]` | `"orders"` | `"payments"` |
| `sid` | `clAvkW0Q...` | `clAvkW0Q...` | `clAvkW0Q...` |
| `act` | không có | không có | không có |
| `jti` (tiền tố) | `onrtro:` | `ntrtte:` | `ntrtte:` |
| byte | 1.305 | 1.191 | 1.193 |

`sub` giữ nguyên: đây là chỗ `payments` lấy được alice cho log kiểm toán, và giá trị đó do Keycloak ký, không phải lời khai của `orders`. `azp` đổi thành client vừa đổi token, nên `payments` biết bên gọi trực tiếp là `orders`. `sid` giữ nguyên: *"Token exchange never creates a new user session."* Response cũng trả cùng `session_state` và `refresh_expires_in: 0`.

Còn `exp`: lab lấy token user, chờ 6 giây rồi mới đổi. Token user `exp - iat = 300`, token đổi ra cũng `exp - iat = 300`, nhưng tính từ lúc đổi, nên nó hết hạn **sau token gốc 6 giây**. Phương án (b) sai ở đây. Hệ quả ở 3.5.

Keycloak đứng giữa để kiểm. Lab đếm được bốn cửa, mỗi cửa một mã lỗi:

1. **Client đổi phải là confidential và đã bật switch.** Docs: *"Note that requester-client must be a confidential client."* Client public `spa` thử đổi: `400 invalid_client`, `Public client is not allowed to exchange token`. Client confidential chưa bật switch (`payments`): `400 invalid_request`, `Standard token exchange is not enabled for the requested client`. Switch nằm ở attribute `standard.token.exchange.enabled`.
2. **Client đổi phải có trong `aud` của subject token.** Docs: *"The subject_token sent to the token exchange endpoint must have the requester client set as an audience in the aud claim."* `orders` thử đổi thẳng token của `web` (aud chỉ có `gateway`, `account`): `403 access_denied`, `Client is not within the token audience`. Đây là cửa giữ thứ tự của chuỗi: `orders` chỉ đổi được token mà ai đó đã cấp cho `orders`.
3. **Subject token phải là access token.** *"This must be urn:ietf:params:oauth:token-type:access_token when the standard token exchange is being used"*. Gửi refresh token: `400`, `Parameter 'subject_token' supports access tokens only`.
4. **`audience` chỉ lọc, không thêm.** *"The audience parameter can be used to filter the audiences that are coming from the used client scopes. However, this parameter will not add more audiences."* `gateway` xin `audience=payments` (không có trong scope của `gateway`): `400`, `Requested audience not available: payments`. Không gửi `audience` thì token ra mang mọi audience từ scope của `gateway`: `["orders","account"]`.

Cửa 4 hay bị hiểu ngược: `audience` không phải "cho tôi token tới X". Danh sách audience được xin do **cấu hình của client đổi** quyết định (audience mapper, client role, bài 9); tham số chỉ chọn bớt. Nên đồ thị gọi giữa các service nằm trong Keycloak, và `gateway` không tự mở rộng được nó.

Thêm hai giới hạn từ docs: V2 chỉ đổi token nội bộ sang token cho client khác cùng realm (*"The standard token exchange supports only use-case (1)."*, nên trang specifications ghi RFC 8693 chỉ hỗ trợ một phần), và chưa nhận tham số `resource` (*"Keycloak Token exchange does not yet have support for the resource parameter."*). Đổi token từ IdP bên ngoài vào là việc của grant khác: *"JWT Authorization Grant is recommended as an alternative to External to internal token exchange V1."* V1 vẫn có cho các ca V2 không làm (external, impersonation), nhưng là preview đã deprecated.

> **Nguồn.** Bốn cửa, use-case (1), không tạo session, chưa có `resource` ([token-exchange](https://www.keycloak.org/securing-apps/token-exchange)). Feature flag từ 26.2.0 ([upgrading](https://www.keycloak.org/docs/latest/upgrading/index.html#supported-standard-token-exchange)). Hỗ trợ một phần: *"Token exchange V2 only supports the internal to internal use-case, so the specification is only partially supported now."* ([specifications](https://www.keycloak.org/securing-apps/specifications)). JWT Authorization Grant ([release_notes](https://www.keycloak.org/docs/latest/release_notes/index.html)).

<svg viewBox="0 0 760 450" role="img" aria-labelledby="kc13-a-t kc13-a-d" style="width:100%;height:auto">
<title id="kc13-a-t">Chuỗi token exchange gateway, orders, payments</title>
<desc id="kc13-a-d">Sơ đồ sequence: web gửi AT1 tới gateway; gateway đổi AT1 ở Keycloak lấy AT2 có aud orders; orders đổi AT2 lấy AT3 có aud payments; cả ba token cùng sub alice và cùng sid.</desc>
<defs><marker id="kc13-a-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="20" y="20" width="80" height="30" rx="8" fill="#64748b" fill-opacity="0.25"/>
<text x="60" y="40" text-anchor="middle" font-size="11" fill="currentColor">web</text>
<rect x="160" y="20" width="80" height="30" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="200" y="40" text-anchor="middle" font-size="11" fill="currentColor">gateway</text>
<rect x="300" y="20" width="80" height="30" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="340" y="40" text-anchor="middle" font-size="11" fill="currentColor">orders</text>
<rect x="440" y="20" width="80" height="30" rx="8" fill="#84cc16" fill-opacity="0.25"/>
<text x="480" y="40" text-anchor="middle" font-size="11" fill="currentColor">payments</text>
<rect x="630" y="20" width="100" height="30" rx="8" fill="#f59e0b" fill-opacity="0.25"/>
<text x="680" y="40" text-anchor="middle" font-size="11" fill="currentColor">Keycloak</text>
<line x1="60" y1="50" x2="60" y2="340" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<line x1="200" y1="50" x2="200" y2="340" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<line x1="340" y1="50" x2="340" y2="340" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<line x1="480" y1="50" x2="480" y2="340" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<line x1="680" y1="50" x2="680" y2="340" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<line x1="60" y1="90" x2="198" y2="90" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc13-a-arrow)"/>
<text x="130" y="84" text-anchor="middle" font-size="11" fill="currentColor">1. AT1</text>
<line x1="200" y1="130" x2="678" y2="130" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc13-a-arrow)"/>
<text x="440" y="124" text-anchor="middle" font-size="11" fill="currentColor">2. token exchange: subject_token=AT1, audience=orders</text>
<line x1="680" y1="170" x2="202" y2="170" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" stroke-dasharray="6 3" marker-end="url(#kc13-a-arrow)"/>
<text x="440" y="164" text-anchor="middle" font-size="11" fill="currentColor">3. AT2 (sub=alice, azp=gateway, aud=orders)</text>
<line x1="200" y1="210" x2="338" y2="210" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc13-a-arrow)"/>
<text x="270" y="204" text-anchor="middle" font-size="11" fill="currentColor">4. AT2</text>
<line x1="340" y1="250" x2="678" y2="250" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc13-a-arrow)"/>
<text x="510" y="244" text-anchor="middle" font-size="11" fill="currentColor">5. exchange AT2, audience=payments</text>
<line x1="680" y1="290" x2="342" y2="290" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" stroke-dasharray="6 3" marker-end="url(#kc13-a-arrow)"/>
<text x="510" y="284" text-anchor="middle" font-size="11" fill="currentColor">6. AT3 (azp=orders, aud=payments)</text>
<line x1="340" y1="330" x2="478" y2="330" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc13-a-arrow)"/>
<text x="410" y="324" text-anchor="middle" font-size="11" fill="currentColor">7. AT3</text>
<rect x="20" y="360" width="235" height="30" rx="6" fill="#64748b" fill-opacity="0.2"/>
<text x="137" y="379" text-anchor="middle" font-size="11" fill="currentColor">AT1: azp=web, aud=gateway,account</text>
<rect x="265" y="360" width="235" height="30" rx="6" fill="#3b82f6" fill-opacity="0.2"/>
<text x="382" y="379" text-anchor="middle" font-size="11" fill="currentColor">AT2: azp=gateway, aud=orders</text>
<rect x="510" y="360" width="235" height="30" rx="6" fill="#84cc16" fill-opacity="0.2"/>
<text x="627" y="379" text-anchor="middle" font-size="11" fill="currentColor">AT3: azp=orders, aud=payments</text>
<text x="380" y="420" text-anchor="middle" font-size="11" fill="currentColor">Cả ba: cùng sub (alice), cùng sid, không có act; exp = lúc cấp + 300 s</text>
</svg>

### 3.4 Không có `act`: impersonation hay delegation

Bảng 3.3 có một ô trống đáng để ý: `act`. RFC 8693 phân biệt hai kiểu "nhân danh". **Impersonation**: *"When principal A impersonates principal B, A is given all the rights that B has within some defined rights context and is indistinguishable from B in that context."* **Delegation**: *"With delegation semantics, principal A still has its own identity separate from B"*; trong lab dưới đây, bên hành động hiện ra ở claim `act`.

Token V2 của Keycloak nằm giữa hai kiểu. Không có `act`, nên trong ngôn ngữ RFC nó gần impersonation; nhưng `azp` vẫn nói bên vừa đổi. Cái mất là **lịch sử chuỗi**: token tới `payments` có `azp: orders`, và không còn dấu vết nào cho thấy `gateway` từng đứng trước `orders`. Kiểm toán muốn "alice, qua gateway, qua orders" thì V2 không đưa đủ.

Keycloak 26.8.1 có delegation, nhưng ở mức preview: *"Token exchange delegation support status is now preview."* Lab bật thử:

```
$ kc.sh start-dev --features=token-exchange-delegation
ERROR: Feature token-exchange-delegation depends on disabled feature parameterized-scopes
$ kc.sh start-dev --features=token-exchange-delegation,parameterized-scopes
Preview features enabled: parameterized-scopes:v1, token-exchange-delegation:v1
```

`gateway` gửi thêm `actor_token` (token client credentials của chính nó) thì bị chặn: `400`, `Invalid may_act claim in the subject_token`. Delegation đòi token của user phải **cho phép trước** ai được hành động thay, qua claim `may_act`. Lab thêm `may_act` bằng một hardcoded claim mapper trên client `web` (cách tắt chỉ để đo, không phải cách cấu hình production), rồi đổi lại:

```
# trích run5.txt, chỉ giữ claim đang bàn
subject:  {"sub": "43875ea9-...", "azp": "web", "may_act": {"sub": "6188ec37-..."}}
actor:    {"sub": "6188ec37-...", "azp": "gateway"}
kết quả:  {"sub": "43875ea9-...", "azp": "gateway", "aud": "orders", "act": {"sub": "6188ec37-..."}}
```

`act.sub` là service account của `gateway`. Và có một tác dụng phụ đo được: khi token user mang `may_act`, standard exchange bình thường với token đó bị từ chối (`Subject token with a delegation claim is not allowed for standard token exchange`). Bật delegation cho một client nghĩa là token của client đó không còn dùng cho V2 được nữa.

> **Chưa đo.** Lab không dựng `may_act` bằng parameterized scopes và không đổi tiếp bậc hai để xem `act` lồng nhau. Đo bằng: client scope tham số hoá, đổi hai bậc, decode `act`.

> **Nguồn.** Impersonation và delegation ([rfc8693](https://www.rfc-editor.org/rfc/rfc8693)). Delegation là preview ở 26.8 ([release_notes](https://www.keycloak.org/docs/latest/release_notes/index.html)).

---

## ⏸ Dừng lại — đoán trước #3

`gateway` đã đổi token alice lấy AT2. Sau đó, chạy hai việc theo thứ tự. Introspection của AT2 (do `orders` gọi) trả gì sau mỗi việc?

```
Việc 1: client web revoke access token gốc của alice (POST /revoke)
Việc 2: client web logout session của alice (POST /logout với refresh token)

(a) active:false sau việc 1 và việc 2
(b) active:true sau việc 1, active:false sau việc 2
(c) active:true sau cả hai: token đổi ra độc lập hoàn toàn
(d) active:false sau việc 1, active:true sau việc 2
```

---

### 3.5 Token đổi ra sống theo session, không theo token gốc

Đáp án là **(b)**. Lab (`run2.txt`):

| Thao tác | Kết quả |
|---|---|
| `web` revoke token gốc | HTTP 200; token gốc introspect (bởi `gateway`): `active:false` |
| AT2 introspect (bởi `orders`) | `active:true`, `azp: gateway` |
| `web` logout bằng refresh token | HTTP 204 |
| AT2 (bởi `orders`), AT3 (bởi `payments`) | cả hai `active:false` |

Docs nói đúng điều này: *"For the case when the access-token1 was exchanged to the access-token2 of the client requester-client, the revocation of the access-token1 will not revoke access-token2."* Revoke chỉ đánh dấu đúng token được gửi lên (bài 10), còn AT2 là token khác. Logout thì xoá user session, mà AT2, AT3 mang cùng `sid`, nên mọi bên **hỏi Keycloak** thấy chúng chết. Gửi lại token gốc để đổi sau đó: `400`, `Invalid token`.

"Hỏi Keycloak" là điều kiện, như bài 4 và bài 10 đã đo: `payments` verify offline (bài 12) vẫn nhận token tới `exp`. Cộng với điều 3.3 đo được (token đổi ra tính `exp` lại từ lúc đổi), mỗi bậc đổi có thể cộng gần một lifespan nữa. Bài tính số 3 ở mục 5 làm một trường hợp cụ thể.

> **Đo trên lab (critic, 26.8.1).** Docs không phát biểu "token đổi ra có thể sống lâu hơn token gốc"; critic đo trực tiếp (cổng 5700). Token alice `iat` t, `exp` t+300. `gateway` đổi lúc t+290: AT2 `exp` t+590. Đổi lại token alice lúc t+305 (đã hết hạn): `400 Invalid token`. `orders` đổi AT2 lúc t+580, khi token alice đã chết 280 s: **thành công**, AT3 `exp` t+880, tức sống quá `exp` của token gốc 580 s. V2 không rút `exp` theo token gốc, chỉ kiểm token được đưa vào. Script: `~/projects/keycloak-lab/critic-ch3b/tmp13-chain.sh`, output `chain13.txt`.

### 3.6 Token DPoP-bound: chỉ chủ của nó đổi được

**DPoP** (bài 11 đã nhắc như một lựa chọn cho SPA) gắn access token vào một cặp khoá của client: token mang `cnf.jkt` (thumbprint khoá), và mỗi lần dùng, client phải ký một proof bằng private key tương ứng. Token rò ra mà thiếu private key thì không dùng được. Keycloak docs: *"...embeds it directly into the access token in a claim called cnf (confirmation)."*

Lab cho `web` xin token alice kèm DPoP proof (khoá EC P-256 sinh bằng `openssl`):

```json
{"token_type":"DPoP","expires_in":300}
{"azp": "web", "aud": ["gateway", "account"], "cnf": {"jkt": "ZfEusq8K...", "kc-jkt-type": "DPoP"}}
```

`gateway` có trong `aud`, nên theo cửa 2 nó được đổi. Kết quả với ba kiểu proof:

| Ai đổi | Proof gửi kèm | Kết quả |
|---|---|---|
| `gateway` | không có | 400 `Sender-constrained token exchange rejected as the token was not issued for the requesting client` |
| `gateway` | khoá của `gateway` | 400, cùng lỗi |
| `gateway` | khoá của `web` | 400, cùng lỗi |
| `web` (tự đổi) | không có | 400 `DPoP proof is missing` |
| `web` | khoá khác | 400 `DPoP confirmation doesn't match DPoP proof` |
| `web` | đúng khoá của `web` | **200**, `token_type: DPoP`, token mới giữ nguyên `cnf.jkt`, `aud: gateway` |

Đây là một cửa thứ năm mà file nguồn không có: token sender-constrained chỉ client được cấp (`azp`) đổi được, và phải kèm proof bằng đúng khoá trong `cnf.jkt`.

> **Suy luận.** Docs không giải thích cửa này. Lý do suy từ mục đích của DPoP: nếu `gateway` đổi được token bound vào khoá của `web` lấy token không bound, ràng buộc khoá bị rửa sạch ngay bậc đầu, và token rò ở `gateway` lại thành bearer token. Ba dòng `gateway` cùng một lỗi cho thấy Keycloak chặn trước khi xét proof.

Hệ quả cho kiến trúc 3.3: nếu client ở rìa dùng DPoP, `gateway` không là người đổi token được nữa. Hoặc client rìa tự đổi trước khi gọi (nó phải biết `audience` downstream), hoặc `gateway` nhận token không bound.

> **Đo trên lab (chạy riêng cho bài này).** Keycloak 26.8.1, realm `shop`. Bảng là output thật của `run6b.txt` (dòng `gateway`) và `run7b.txt` (dòng `web`); proof ES256 ký bằng `openssl` qua `dpop.py`.

> **Chưa đo.** Token mTLS-bound (discovery có `tls_client_certificate_bound_access_tokens: true`) chưa được thử với token exchange vì lab không dựng TLS; nguồn cũng không ghi phiên bản nào bắt đầu chặn đổi token sender-constrained. Đo bằng: HTTPS + client certificate, xin token bound, cho client khác đổi.

> **Nguồn.** Thumbprint vào claim `cnf` ([dpop](https://www.keycloak.org/securing-apps/dpop)). Với confidential client, Keycloak chỉ bind access token: *"Therefore, Keycloak binds only the access token to the DPoP key, relying on the client credentials to secure the refresh token."* ([dpop](https://www.keycloak.org/securing-apps/dpop)).

---

## 4. Lab

Môi trường: Keycloak 26.8.1 giải nén riêng vào `~/projects/keycloak-lab/lab-kc13/`, `start-dev` cổng 8480, management 9480; process đã dừng sau khi đo.

**Bước 1: dựng realm.** `setup.sh` tạo realm `shop`, user `alice` (realm role `orders.read`), và các client, tất cả confidential trừ `spa`:

```bash
kc create clients -r shop -s clientId=web -s publicClient=false -s secret=web-secret \
   -s directAccessGrantsEnabled=true -s standardFlowEnabled=false     # lab: password grant cho nhanh
for c in gateway orders; do
  kc create clients -r shop -s clientId=$c -s publicClient=false -s secret=$c-secret \
     -s standardFlowEnabled=false -s 'attributes={"standard.token.exchange.enabled":"true"}'
done
kc create clients -r shop -s clientId=payments -s publicClient=false -s secret=payments-secret
aud_mapper web gateway; aud_mapper gateway orders; aud_mapper orders payments
```

`aud_mapper A B` tạo `oidc-audience-mapper` trên client A với `included.client.audience=B`. Ba mapper này **là** đồ thị gọi: `web` → `gateway` → `orders` → `payments`.

**Bước 2: client credentials.** Lệnh và output ở 3.2 (token 1.271 byte).

**Bước 3: đổi hai bậc.** `run1.sh` lấy token alice từ `web`, `gateway` đổi với `audience=orders`, `orders` đổi kết quả với `audience=payments`. Response của mỗi lần đổi:

```json
{"expires_in":300,"refresh_expires_in":0,"token_type":"Bearer","not-before-policy":0,
 "session_state":"clAvkW0Q4Q7ytuYK9YYI3tdN","scope":"email profile",
 "issued_token_type":"urn:ietf:params:oauth:token-type:access_token"}
```

Thấy: `issued_token_type` theo RFC 8693, `session_state` bằng `sid` của token user, không có refresh token. Decode từng token: bảng 3.3. Xin `requested_token_type=...:refresh_token` với cấu hình mặc định của client: `400`, `requested_token_type unsupported`.

**Bước 4: các cửa kiểm.** `run2.sh` chạy từng ca âm; mã lỗi ở 3.3. Một quan sát lạ: cùng token AT2 có `"aud": "orders"` khi decode JWT, nhưng introspection trả `"aud":["orders","account"]`, tức mọi audience từ scope của `gateway`, như thể chưa từng lọc bằng `audience=orders`. Critic thêm audience mapper `gateway → payments` **sau** khi AT2 đã cấp:

```
AT2 introspect (orders):   {"active":true,"azp":"gateway","aud":["orders","payments","account"]}
AT2 introspect (payments): {"active":false}
```

Thấy: `aud` trong response introspection là `aud` của JWT **cộng** audience từ mapper hiện tại của client `azp` (token web thường cũng vậy: thêm mapper `web → orders` thì introspection token cũ của alice có thêm `orders`; gỡ mapper không bớt được giá trị đã nằm trong JWT); còn cửa "client gọi introspect phải nằm trong `aud`" dùng `aud` thật trong JWT, nên `payments` vẫn bị từ chối. Chỉ token không mang `aud` (lightweight, bài 9 mục 3.6) mới được xét theo `aud` tính lại. Muốn biết token mang gì, decode chính token; đừng lấy `aud` từ introspection làm bằng chứng.

**Bước 5: revoke và logout.** Output ở 3.5.

**Bước 6: độ trễ.** `bench.py`, một luồng tuần tự, keep-alive, n = 200 mỗi ca (warmup 10), chạy ba lần; p50 / p95 tính bằng ms:

| Lần | client credentials | token exchange gateway → orders |
|---|---|---|
| 1 | 3,74 / 5,70 | 3,01 / 5,01 |
| 2 | 3,89 / 12,31 | 5,51 / 14,94 |
| 3 | 2,74 / 4,93 | 2,79 / 4,74 |

Thấy: đổi token cùng bậc với client credentials, vài ms; không có bước hash mật khẩu nào. Số dao động giữa các lần và cao hơn 1,58 ms của lab #1, nên chỉ dùng như bậc độ lớn.

**Bước 7: delegation và DPoP.** Khởi động lại với `--features=token-exchange-delegation,parameterized-scopes`; `run5.sh` (delegation, 3.4), `run6.sh`/`run7.sh` (DPoP, 3.6; output `run6b.txt`, `run7b.txt` sau khi đã gỡ mapper `may_act`).

> **Đo trên lab (chạy riêng cho bài này).** Ngày 2026-10-15, Keycloak 26.8.1 `start-dev` (H2 dev-file), OpenJDK 24.0.2, Mac mini Apple M4 10 core. Mọi output trong bài lấy từ `run1.txt` tới `run7b.txt`, `bench.txt`, `kc2.log`, `kc2-fail.log` trong `~/projects/keycloak-lab/lab-kc13/`. Đo lại: `bash setup.sh && bash run1.sh`.

---

## 5. Tính tay

**Bài 1: xin token mỗi request.** `orders` gọi `payments` 200 request/s ở giờ cao điểm, mỗi request xin một token client credentials mới. Dùng p50 1,58 ms (lab #1) và 3,1 ms CPU mỗi token (lab #2).

- Độ trễ cộng thêm: 1,58 ms mỗi request ở p50, ngay trên đường nóng của thanh toán.
- Thời gian chờ Keycloak cộng dồn: 200 × 1,58 = 316 ms mỗi giây.
- CPU Keycloak: 200 × 3,1 = 620 ms CPU mỗi giây, tức **0,62 core** chỉ để phục vụ một cặp service.
- Một ngày: 200 × 86.400 = **17.280.000** token.

Cache tới `exp` (300 s): một pod xin 86.400 / 300 = **288** token mỗi ngày. Tỉ lệ 17.280.000 / 288 = 60.000 lần.

**Bài 2: cache đúng, nhưng thiếu single-flight.** 20 pod `orders`, mỗi pod 50 thread, làm mới token khi còn 30 s (tức mỗi 270 s).

- Có single-flight: 20 / 270 = **0,074** request/s vào Keycloak, 20 × 86.400 / 270 = 6.400 token mỗi ngày.
- Không single-flight, và mọi thread thấy cache hết hạn cùng lúc: 20 × 50 = **1.000** request trong cùng một khoảnh khắc, tức 1.000 × 3,1 = 3.100 ms = 3,1 CPU-giây dồn vào một đợt.

> **Chưa đo.** Lab chưa bắn 1.000 request client credentials đồng thời vào một Keycloak để đo p99 và lỗi. Đo bằng: k6 `shared-iterations` 1.000 VU, 1.000 iteration, một node, đọc p99 và `http_req_failed`.

**Bài 3: token cuối chuỗi sống tới khi nào.** Access token lifespan mặc định 300 s. Mốc:

```
9:00:00  alice nhận AT1 (azp web)                    exp 9:05:00
9:04:50  gateway đổi AT1 -> AT2                       exp ?
9:05:10  orders đổi AT2 -> AT3                        exp ?
9:06:00  web revoke AT1
9:07:00  alice logout (web gọi /logout)
```

`payments` verify AT3 offline (chữ ký + `exp`, như bài 12). Tới mấy giờ `payments` còn nhận AT3?

- AT2: `iat` 9:04:50, exp **9:09:50**. AT3: `iat` 9:05:10, exp **9:10:10** (mỗi lần đổi tính lại 300 s, 3.3).
- 9:05:10: AT1 đã hết hạn lúc 9:05:00, nhưng `orders` đổi AT2 chứ không đổi AT1, nên lần đổi thành công.
- 9:06:00: revoke AT1 không chạm AT2, AT3 (3.5).
- 9:07:00: logout xoá session. Bên nào introspect thấy AT3 `active:false`. `payments` verify offline vẫn nhận tới **9:10:10**.

AT3 sống quá lúc logout 3 phút 10 giây, và quá `exp` của AT1 5 phút 10 giây, tức 310 s, hơn cả một lifespan đầy đủ.

---

## 6. Chuyển giao

1. Một job đêm (`billing-job`) cần trừ tiền định kỳ cho 10.000 user không ai đang online. Vì sao token exchange V2 không dùng được ở đây, dù job là confidential client và đã bật switch? Job nên dùng grant gì, và `payments` phân biệt "user bấm" với "job tự trừ" bằng claim nào?
2. `payments` muốn từ chối mọi token không đi qua `orders`. Viết luật kiểm trên claim nào, và luật đó có chặn được token client credentials của chính `orders` không?
3. Một service Node.js cache token client credentials trong biến toàn cục, làm mới khi gặp 401 từ downstream. Kể hai tình huống mà cách này vẫn gây bão request vào Keycloak.
4. Admin thêm `payments` vào audience mapper của client `gateway` "cho tiện test". Theo bốn cửa ở 3.3, giờ `gateway` làm được gì mà trước đó không làm được, và đồ thị gọi giữa các service đã đổi ra sao?
5. Bạn bật `revokeRefreshToken` và rút access token lifespan xuống 60 s để giảm cửa sổ trong bài tính số 3 (mục 5). Với chuỗi ba bậc, cửa sổ tối đa sau logout cho một resource server verify offline còn bao nhiêu? Thay đổi nào khác mới thật sự đóng được cửa sổ đó, và cái giá của nó là gì?
6. App mobile dùng DPoP tới `gateway`; `orders` và `payments` cần `sub` của user, và `payments` cần biết chắc request đã qua `gateway`. V2 chặn `gateway` đổi token bound của app; delegation đang preview và đòi `may_act` trong token user. Thiết kế luồng token cho ba bậc này: ai đổi token, ở bước nào, token nào còn bound, và bạn chấp nhận mất thuộc tính an toàn nào ở mỗi phương án?

---

## 7. Tóm tắt

- Service account là user, nên token client credentials mang cả default roles (Full Scope Allowed bật sẵn) và `aud` mặc định là `account`, không phải API đích.
- Không có refresh token, nên phải cache access token ở client, có single-flight: 200 request/s xin mới mỗi request là 17.280.000 token/ngày và ~0,62 core Keycloak (lab); cache 300 s là 288 token/ngày mỗi pod.
- Đổi token cho service kế tiếp dùng standard token exchange V2: có từ 26.2.0, supported, bật sẵn ở mức server, bật theo switch trên từng client. V1 (`--features=token-exchange`) là preview, deprecated.
- Bốn cửa của V2 (lab): client confidential và đã bật switch; client đổi nằm trong `aud` của subject token; subject token là access token; `audience` chỉ lọc từ scope của client đổi. `aud` trong response introspection là `aud` của JWT cộng audience từ mapper hiện tại; cửa kiểm client gọi vẫn xét `aud` của JWT.
- Token đổi ra giữ `sub` và `sid`, đổi `azp` thành client vừa đổi, `aud` thành đích, `exp` tính lại 300 s từ lúc đổi; không có `act`.
- Revoke token gốc không giết token đã đổi (docs + lab); logout session thì có, nhưng chỉ với bên hỏi Keycloak. Với verify offline, token cuối chuỗi ba bậc sống tới 310 s quá `exp` của token gốc trong bài tính số 3 (mục 5).
- Delegation (`act`) ở 26.8.1 là preview, cần thêm `parameterized-scopes` và claim `may_act` trong token user (lab).
- Token DPoP-bound chỉ client được cấp đổi được, kèm proof đúng khoá; token mới giữ `cnf.jkt` (lab). mTLS-bound chưa đo.

→ **Bài 14 — Logout và SSO nhiều app**: bài tính số 3 ở mục 5 cho thấy logout xoá session nhưng token vẫn được nhận offline; bài sau đi vào cách Keycloak báo logout cho từng app, và vì sao kênh front-channel hỏng khi trình duyệt chặn cookie bên thứ ba.
