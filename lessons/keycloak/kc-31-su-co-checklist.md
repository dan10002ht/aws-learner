# Bài 31 — Sự cố thường gặp và checklist Keycloak engineer

## 1. Mục tiêu

Sau bài này bạn có thể:

- Tách một sự cố nhiều lớp (401 ở API, refresh hỏng, login dang dở mất) thành từng nguyên nhân riêng, mỗi cái kiểm được bằng một lệnh.
- Từ một thông điệp lỗi nguyên văn (`invalid_grant` + `error_description`, header `WWW-Authenticate`, `reason=` trong event) chỉ ra lớp hỏng và bài đã đo nó.
- Chạy runbook chẩn đoán bằng lệnh của course: decode token, so `iss` với discovery, so `kid` với JWKS, introspect, đọc event, đọc trạng thái brute force, đọc exit code.
- Rà một realm trước go-live theo checklist, nói được với mỗi dòng: mặc định 26.8.1 là gì, mặc định đó hỏng trước kiểu tấn công hay sự cố nào.
- Trả lời câu hỏi phỏng vấn Keycloak engineer bằng cơ chế và con số đo được, không bằng định nghĩa.

---

## 2. Triệu chứng

Một SaaS B2B chạy Keycloak một node, `orders-api` là Spring Boot kiểm token bằng `issuer-uri`, `report-api` kiểm bằng introspection, app mobile giữ refresh token. Tối thứ Sáu team làm một đợt deploy gộp ba việc: nâng Keycloak từ một bản 26.x cũ hơn 26.6.2 lên 26.8.1, thêm node thứ hai sau load balancer round-robin, và đổi `--hostname` của node mới thành địa chỉ máy của nó. Nâng minor nên dừng cả cụm rồi bật lại.

Sáng thứ Hai có bốn ticket:

1. `orders-api` trả 401 cho khoảng một nửa request, `WWW-Authenticate: Bearer error="invalid_token"`. Token decode ra chữ ký hợp lệ, `exp` còn hạn.
2. App mobile đá user ra màn login lác đác. Log app:
   ```
   {"error":"invalid_grant","error_description":"Invalid token issuer. Expected 'http://localhost:8280/realms/lab'"}  HTTP 400
   ```
3. `report-api` trả 401 cho **mọi** token, kể cả token vừa lấy. Introspection trả đúng một dòng `{"active":false}`.
4. Vài người đang gõ mật khẩu lúc deploy thấy trang báo lần đăng nhập đã hết giờ, phải bắt đầu lại.

Trưởng nhóm đề xuất: "Rollback về bản cũ là xong."

> **Đo trên lab.** Dòng lỗi ticket 2 là output thật bài 25 (node-b `--hostname=http://localhost:8280`, login node-a, refresh node-b). `{"active":false}` cho token mới: bài 4, 9. `expired_code` sau khi dừng cả cụm: bài 25. Ticket 1 dựng từ suy luận bài 12 mục 3.1; lab chưa gửi token lệch `iss` vào Spring.

---

## ⏸ Dừng lại — đoán trước #1

Bốn ticket có bao nhiêu nguyên nhân gốc độc lập?

- (a) Một: bản 26.8.1 có bug, rollback là hết cả bốn.
- (b) Hai: hostname của node-b sinh ticket 1 và 2; luật introspection mới từ 26.6.2 sinh ticket 3; ticket 4 là hệ quả của cùng lần nâng cấp.
- (c) Ba: hostname (1, 2), luật `aud` của introspection (3), cách dừng cụm khi nâng minor (4).
- (d) Bốn, mỗi ticket một nguyên nhân.

---

## 3. Lý thuyết

### 3.1 Đáp án, và vì sao rollback là bản sai

Đáp án **(c)**. Rollback nghe hợp lý vì cả bốn ticket xuất hiện sau cùng một lần deploy. Nó gãy ở hai chỗ. Thứ nhất, rollback không chạm tới hostname của node-b, nên ticket 1 và 2 còn nguyên. Thứ hai, nâng version chạy Liquibase lúc start và schema không rollback; quay lại bản cũ nghĩa là restore DB từ backup, mất mọi thứ ghi từ tối thứ Sáu (bài 29).

Tách từng ticket:

- **Ticket 1 và 2, cùng một gốc.** Node-b ký token với `iss` theo hostname của nó; Spring so `iss` bằng đúng chuỗi, nên token qua node-b bị 401 dù hai node chung khoá trong DB (bài 12). Cùng gốc đó làm refresh chéo node hỏng: node-b so `iss` của refresh token với issuer tính từ `--hostname` của nó (bài 25). Hostname là cấu hình của cụm.
- **Ticket 3.** Từ 26.6.2, introspection trả `{"active":false}` nếu client gọi không nằm trong `aud`; lý do chỉ có trong log (bài 4, 9). Bản cũ không kiểm, nên chưa ai thêm audience mapper.
- **Ticket 4.** Authentication session chỉ sống trong cache phân tán, không có bản gốc trong DB; dừng cả cụm (SIGKILL hay SIGTERM) là mất login dang dở, event ghi `expired_code` (bài 25). Nâng minor buộc dừng cả cụm: `update-compatibility check` trả 3 cho 26.7.5 lên 26.8.1 (bài 29).

> **Suy luận.** Con số "khoảng một nửa" ở ticket 1 không đo; nó suy từ round-robin hai node và việc chỉ token qua node-b mang `iss` lệch. Kiểm bằng: đếm `iss` trong token của 100 lượt login qua load balancer.

Ba thói quen tách được ticket ghép này:

**Đọc đúng chỗ.** Một lỗi Keycloak hiện ở bốn chỗ khác nhau, mỗi chỗ nói một lượng khác nhau. Trang lỗi trình duyệt ở `/auth` (400, không redirect) hoặc `302` về app kèm `error=`. JSON ở token endpoint (`error` + `error_description`). Header `WWW-Authenticate` ở resource server. Và event trong log server (`type=`, `error=`, `reason=`). Response cố ý nói ít hơn log: introspection chỉ trả `active:false` (bài 4), tài khoản đang khoá nhận đúng lỗi của sai mật khẩu (bài 20), authenticator tự viết gọi `failure(error)` bị đổi mã thành `invalid_user_credentials` (bài 22). Nên bước đầu của mọi ca là tìm dòng event ứng với request.

**Đọc mã lỗi theo Keycloak, không theo RFC.** Sai secret, RFC 6749 §5.2 nói `invalid_client`; Keycloak 26.8.1 trả `401 unauthorized_client` (bài 2, 7). Spring trả `insufficient_scope` cho cả ca thiếu role (bài 12).

**Hỏi "đồng hồ nào".** `invalid_grant` ở refresh có ít nhất bảy `error_description` khác nhau; mỗi cái trỏ về một cơ chế khác (bảng 3.2).

> **Nguồn.** RFC 6749 §5.2: `invalid_client` là *"Client authentication failed (e.g., unknown client, no client authentication included, or unsupported authentication method)."* ([rfc6749](https://www.rfc-editor.org/rfc/rfc6749#section-5.2)). Docs Keycloak về khoá tài khoản: *"When a user is locked and attempts to log in, Keycloak displays the default Invalid username or password error message."* ([password-guess-brute-force-attacks](https://www.keycloak.org/docs/latest/server_admin/index.html#password-guess-brute-force-attacks)).

<svg viewBox="0 0 700 330" role="img" aria-labelledby="kc31-a-t kc31-a-d" style="width:100%;height:auto">
<title id="kc31-a-t">Lỗi hiện ở đâu thì nghi lớp nào</title>
<desc id="kc31-a-d">Bốn cột theo chỗ lỗi xuất hiện: trang lỗi ở authorization endpoint trỏ về cấu hình client, JSON ở token endpoint trỏ về grant và session, 401 hoặc 403 ở API trỏ về cách app kiểm token, process không ready trỏ về vận hành; mọi cột đều kết thúc ở dòng event trong log.</desc>
<defs><marker id="kc31-a-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor" fill-opacity="0.6"/></marker></defs>
<rect x="10" y="10" width="160" height="50" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="90" y="31" text-anchor="middle" font-size="11" fill="currentColor">Trang lỗi ở /auth</text>
<text x="90" y="47" text-anchor="middle" font-size="11" fill="currentColor">hoặc 302 kèm error=</text>
<rect x="183" y="10" width="160" height="50" rx="8" fill="#84cc16" fill-opacity="0.25"/>
<text x="263" y="31" text-anchor="middle" font-size="11" fill="currentColor">JSON 400/401</text>
<text x="263" y="47" text-anchor="middle" font-size="11" fill="currentColor">ở token endpoint</text>
<rect x="356" y="10" width="160" height="50" rx="8" fill="#f59e0b" fill-opacity="0.25"/>
<text x="436" y="31" text-anchor="middle" font-size="11" fill="currentColor">401 / 403 ở API</text>
<text x="436" y="47" text-anchor="middle" font-size="11" fill="currentColor">WWW-Authenticate</text>
<rect x="529" y="10" width="160" height="50" rx="8" fill="#ef4444" fill-opacity="0.25"/>
<text x="609" y="31" text-anchor="middle" font-size="11" fill="currentColor">Process không lên</text>
<text x="609" y="47" text-anchor="middle" font-size="11" fill="currentColor">hoặc ready DOWN</text>
<line x1="90" y1="60" x2="90" y2="88" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc31-a-arrow)"/>
<line x1="263" y1="60" x2="263" y2="88" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc31-a-arrow)"/>
<line x1="436" y1="60" x2="436" y2="88" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc31-a-arrow)"/>
<line x1="609" y1="60" x2="609" y2="88" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc31-a-arrow)"/>
<rect x="10" y="92" width="160" height="150" rx="8" fill="#64748b" fill-opacity="0.15"/>
<text x="90" y="112" text-anchor="middle" font-size="11" fill="currentColor">Cấu hình client</text>
<text x="90" y="134" text-anchor="middle" font-size="10" fill="currentColor">redirect_uri lạ</text>
<text x="90" y="152" text-anchor="middle" font-size="10" fill="currentColor">PKCE bắt buộc mà thiếu</text>
<text x="90" y="170" text-anchor="middle" font-size="10" fill="currentColor">acr không đạt</text>
<text x="90" y="188" text-anchor="middle" font-size="10" fill="currentColor">cookie không gửi lại</text>
<text x="90" y="206" text-anchor="middle" font-size="10" fill="currentColor">cụm dừng giữa login</text>
<text x="90" y="230" text-anchor="middle" font-size="10" fill="currentColor">bài 2, 3, 7, 18, 25</text>
<rect x="183" y="92" width="160" height="150" rx="8" fill="#64748b" fill-opacity="0.15"/>
<text x="263" y="112" text-anchor="middle" font-size="11" fill="currentColor">Grant, session, client</text>
<text x="263" y="134" text-anchor="middle" font-size="10" fill="currentColor">code dùng lại / bị đốt</text>
<text x="263" y="152" text-anchor="middle" font-size="10" fill="currentColor">session chết, RT hết exp</text>
<text x="263" y="170" text-anchor="middle" font-size="10" fill="currentColor">RT cũ khi bật revoke</text>
<text x="263" y="188" text-anchor="middle" font-size="10" fill="currentColor">iss lệch, key HS512 tắt</text>
<text x="263" y="206" text-anchor="middle" font-size="10" fill="currentColor">sai secret, grant tắt</text>
<text x="263" y="230" text-anchor="middle" font-size="10" fill="currentColor">bài 2, 10, 20, 25, 29</text>
<rect x="356" y="92" width="160" height="150" rx="8" fill="#64748b" fill-opacity="0.15"/>
<text x="436" y="112" text-anchor="middle" font-size="11" fill="currentColor">Cách app kiểm token</text>
<text x="436" y="134" text-anchor="middle" font-size="10" fill="currentColor">iss khác issuer-uri</text>
<text x="436" y="152" text-anchor="middle" font-size="10" fill="currentColor">aud thiếu API</text>
<text x="436" y="170" text-anchor="middle" font-size="10" fill="currentColor">kid không có trong JWKS</text>
<text x="436" y="188" text-anchor="middle" font-size="10" fill="currentColor">role chưa map authority</text>
<text x="436" y="206" text-anchor="middle" font-size="10" fill="currentColor">introspect: aud, session</text>
<text x="436" y="230" text-anchor="middle" font-size="10" fill="currentColor">bài 4, 9, 12, 14, 29</text>
<rect x="529" y="92" width="160" height="150" rx="8" fill="#64748b" fill-opacity="0.15"/>
<text x="609" y="112" text-anchor="middle" font-size="11" fill="currentColor">Vận hành</text>
<text x="609" y="134" text-anchor="middle" font-size="10" fill="currentColor">build option lệch: exit 2</text>
<text x="609" y="152" text-anchor="middle" font-size="10" fill="currentColor">xác trong jgroups_ping</text>
<text x="609" y="170" text-anchor="middle" font-size="10" fill="currentColor">import bị bỏ qua (INFO)</text>
<text x="609" y="188" text-anchor="middle" font-size="10" fill="currentColor">listener chặn request</text>
<text x="609" y="206" text-anchor="middle" font-size="10" fill="currentColor">CPU băm chạm trần</text>
<text x="609" y="230" text-anchor="middle" font-size="10" fill="currentColor">bài 6, 23, 24, 25, 27</text>
<line x1="90" y1="242" x2="330" y2="278" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.2" marker-end="url(#kc31-a-arrow)"/>
<line x1="263" y1="242" x2="335" y2="278" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.2" marker-end="url(#kc31-a-arrow)"/>
<line x1="436" y1="242" x2="365" y2="278" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.2" marker-end="url(#kc31-a-arrow)"/>
<line x1="609" y1="242" x2="370" y2="278" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.2" marker-end="url(#kc31-a-arrow)"/>
<rect x="160" y="282" width="380" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.25"/>
<text x="350" y="300" text-anchor="middle" font-size="11" fill="currentColor">Dòng event trong kc.log: type=, error=, reason=</text>
<text x="350" y="315" text-anchor="middle" font-size="10" fill="currentColor">response cố ý nói ít hơn log</text>
</svg>

### 3.2 Bảng tra: lớp giao thức (token endpoint, authorization endpoint)

| Thông điệp (chỗ thấy) | Nguyên nhân gốc | Kiểm bằng | Bài |
|---|---|---|---|
| `invalid_grant` `Code not valid` (/token) | Code dùng lần hai (retry mù sau timeout), hoặc lần đổi trước đã hỏng và **đốt** code | Đếm số lần POST cùng `code` trong log app; code sống 60 s | 2, 3 |
| `invalid_grant` `Incorrect redirect_uri` (/token) | `redirect_uri` ở request đổi code lệch hoặc thiếu so với request `/auth`; code cũng bị đốt | So hai `redirect_uri` từng byte | 2 |
| `invalid_grant` `PKCE verification failed: Code mismatch` | Verifier không ứng với challenge (lẫn verifier giữa hai tab/phiên) | Tính lại S256 bằng `python3`, challenge luôn 43 ký tự | 3 |
| `invalid_grant` `PKCE code verifier not specified` / `...specified but challenge not present in authorization` | Lệch giữa request 3 và request 8: một bên có PKCE, bên kia không | Đọc URL `/auth` thật app gửi | 3, 7 |
| `invalid_request` `Missing parameter: code_challenge_method` (302 về app, event `LOGIN_ERROR`) | Client đặt `pkce.code.challenge.method=S256` mà app không gửi PKCE | `kc get clients/<id> \| jq .attributes` | 3, 7 |
| `invalid_grant` `Session not active` (refresh) | User session đã bị xoá: logout, revoke refresh token, admin xoá session | Event `LOGOUT` hoặc `REVOKE_GRANT` trước đó | 4, 10, 14 |
| `invalid_grant` `Token is not active` (refresh) | `exp` của refresh token đã qua: SSO Idle không được reset, hoặc chạm SSO Max (refresh token bị cắt theo phần còn lại tới Max) | Decode RT, so `exp`; `refresh_expires_in` = min(SSO idle, client idle, còn lại tới Max) | 10 |
| `Stale token` / `Maximum allowed refresh token reuse exceeded` / `Session doesn't have required client` | Đã bật Revoke Refresh Token; app refresh song song hoặc trình RT cũ; lần trình sai xoá client session | `kc get realms/<r>`: `revokeRefreshToken`, `refreshTokenMaxReuse` | 10 |
| `invalid_grant` `Invalid token issuer. Expected '...'` (refresh) | Node nhận refresh có `--hostname` khác node cấp token | So `--hostname` của mọi node | 25 |
| `invalid_grant` `Invalid refresh token` (refresh, event `REFRESH_TOKEN_ERROR`) | Key HS512 ký refresh/offline token đã bị disable hoặc xoá | `kc get keys -r <r>`: provider HS512 | 29 |
| `invalid_grant` `Invalid user credentials` | Sai mật khẩu **hoặc** tài khoản đang khoá (log mới có `user_temporarily_disabled`) | `attack-detection/brute-force/users/<id>` | 20 |
| `401 unauthorized_client` `Invalid client or Invalid client credentials` | Sai secret (không phải `invalid_client`) | Secret trong app so với tab Credentials | 2, 7 |
| `400 unauthorized_client` `Client not allowed for direct access grants` | Password grant trên client tắt `directAccessGrantsEnabled` | `kc get clients/<id>` | 2 |
| `invalid_client` | `client_id` không tồn tại trong realm (sai realm trong URL hay gặp) | Path `/realms/<r>/` của token endpoint | 2 |
| `400 invalid_client` `Public client is not allowed to exchange token` | Token exchange gọi từ client public | `publicClient` của client đổi | 13 |

Lỗi ở trang trình duyệt: `redirect_uri` chưa đăng ký nhận **400, trang `Invalid parameter: redirect_uri`, không redirect**, event `error="invalid_redirect_uri"` (bài 2, 7); `post_logout_redirect_uri` lạ cũng 400 (bài 14). Không redirect vì URI chưa xác minh thì không có chỗ an toàn để giao lỗi.

> **Đo trên lab.** Mọi thông điệp trong bảng 3.2 là output thật của bài ở cột cuối, Keycloak 26.8.1: `Code not valid`, `Incorrect redirect_uri` (bài 2, `start-dev`); `Token is not active` (bài 10, SSO Max 120 s rồi SSO Idle 30 s); `Invalid token issuer` (bài 25, Postgres 16.13); `Invalid refresh token` (bài 29, key HS512 disable).

## ⏸ Dừng lại — đoán trước #2

Sau logout, cùng một access token còn 300 s được gửi tới bốn chỗ: `/userinfo`, introspection (client gọi có trong `aud`), Spring `orders-api` (`issuer-uri`), và `/token` với refresh token cùng phiên. Có bao nhiêu chỗ còn chấp nhận?

- (a) 0, logout thu hồi mọi thứ.
- (b) 1: Spring.
- (c) 2: Spring và introspection.
- (d) 3: chỉ `/userinfo` từ chối.

### 3.3 Bảng tra: app tích hợp (resource server, introspection, logout)

Đáp án **(b)**. `/userinfo` 401 `user_session_not_found`, introspection `active:false`, refresh `Session not active`; Spring vẫn 200 vì chỉ kiểm chữ ký, `iss`, `exp` tại chỗ (bài 4; bài 14 đo còn 265,3 s sau logout). Bảng dưới chia hai nhánh: bên **hỏi Keycloak** thấy session, bên **verify offline** chỉ thấy byte token.

| Thông điệp (chỗ thấy) | Nguyên nhân gốc | Kiểm bằng | Bài |
|---|---|---|---|
| Introspection `{"active":false}` cho token mới; log `reason="Client 'api-client' is not in the token audience"` | Từ 26.6.2 client gọi phải nằm trong `aud`; mặc định `aud` = `account` | Decode `aud` trong JWT: cửa này xét nó, không xét `aud` tính lại trong response; thêm audience mapper, token cấp trước đó vẫn `false` tới `exp` | 4, 9, 13 |
| Introspection `active:false` cho token còn hạn, `aud` đúng | Session đã chết (logout, revoke RT), hoặc key ký đã disable | `kc get keys`; event `LOGOUT` | 4, 29 |
| `403 invalid_request` `Client not allowed.` (introspect) | Client public gọi introspection | `publicClient` | 7 |
| `/userinfo` 401 `error_description="user_session_not_found"` | Session đã logout; access token chưa hết `exp` | Event `LOGOUT` | 3, 4 |
| `/userinfo` 401, `reason="Key not found"` | Token của realm A gửi tới realm B | `iss` của token so với path | 7 |
| Spring 401 `The aud claim is not valid` | Bật `JwtClaimValidator` cho `aud` trước khi thêm audience mapper | Decode `aud`; thứ tự sửa: mapper trước, validator sau | 12 |
| Spring 401 `Signed JWT rejected: Invalid signature` | Chữ ký sai với `kid` đã biết (không refetch JWKS) | So `kid` header với `/certs` | 4, 12 |
| Spring 401 sau khi xoay key | Key RS256 cũ bị disable khi token cũ còn sống | `kc get keys`; key RS256 trong JWKS | 29 |
| Spring 401 `Bearer` trơn, log `JwtDecoderInitializationException` | Keycloak không gọi được ở request Bearer đầu | `Connection refused` trong log | 12 |
| Spring 403 `insufficient_scope` dù token có role | Converter mặc định chỉ đọc `scope` thành `SCOPE_*`; `realm_access.roles` chưa map thành `ROLE_*` | In authorities của request | 12 |
| Spring 200 cho token của client khác, kể cả ID token | Chỉ có `issuer-uri`: không kiểm `aud`, không kiểm `typ` | Gửi ID token vào API | 4, 12 |
| `JOSE header typ (type) logout+jwt not allowed` | Dùng decoder mặc định cho back-channel logout token | Decoder riêng với `JwtTypeValidator("logout+jwt")` | 14 |
| Logout ở portal, app khác vẫn chạy | App chỉ xoá session của nó, hoặc `logout_token` không có `sid` | Decode `logout_token` | 14 |
| BFF trả 500, log `[invalid_grant] Session not active` | Spring BFF không xử lý refresh hỏng | Log BFF | 11 |

Một lỗi không sinh thông điệp nào: Full Scope Allowed làm `aud` đi theo role của user chứ không theo client, nên API kiểm `aud` vẫn nhận token của client không liên quan (bài 9). Chỉ pentest mới thấy.

> **Nguồn.** RFC 7519: *"If the principal processing the claim does not identify itself with a value in the "aud" claim when this claim is present, then the JWT MUST be rejected."* ([rfc7519](https://www.rfc-editor.org/rfc/rfc7519)). Spring 3.5.16 mặc định không làm điều này (đo ở bài 12).

### 3.4 Bảng tra: luồng đăng nhập, MFA, brokering, mở rộng

| Thông điệp | Nguyên nhân gốc | Kiểm bằng | Bài |
|---|---|---|---|
| HTTP 400 `Authentication requirements not fulfilled`, log `Requested level: 2, Fulfilled level: 1` | `claims` essential, flow có `Condition - Level of Authentication`, user không đạt mức: Keycloak từ chối | Credential của user | 18 |
| Token `acr: silver` dù đã nhập OTP, app lặp login | Flow không khai LoA; ACR lạ bị lờ | `acr.loa.map` và flow | 18 |
| `Invalid authenticator code.` dù mã đang hiện | Mã đã dùng một lần (single-use 90 s) hoặc sai; cùng event `invalid_user_credentials` | Event `LOGIN` thành công sớm hơn vài giây từ IP khác: nghĩ tới relay | 19 |
| `LOGIN_ERROR error="cookie_not_found"` | Client (thường là script test) không gửi lại cookie phiên auth | Header `Set-Cookie` và cờ `Secure` | 19, 25 |
| `Your login attempt timed out...`, `error="expired_code"` | Authentication session mất (dừng cả cụm) | Mốc restart cụm | 25 |
| Event `FEDERATED_IDENTITY_LINK` với `identity_provider_identity` khác `username` | First broker login flow có `idp-auto-link`: gắn theo email không kiểm | `firstBrokerLoginFlowAlias` | 15 |
| Token LDAP mang email cũ | Sync định kỳ tắt; search lúc login chỉ kiểm tồn tại | `fullSyncPeriod` | 16 |
| User LDAP nhận 500, user local vẫn login | LDAP chết; nhiều URL failover tuần tự, timeout 5000 ms mỗi URL | Kết nối tới LDAP | 16 |
| Bước custom chặn mà `numFailures` = 0, không event | `failure(error, response)` không ghi event; brute force chỉ đếm password, OTP, recovery code | Gọi `context.getEvent().error(...)` | 22 |
| `Account is not fully set up` | User storage adapter thiếu thuộc tính user profile đòi (`lastName`) | `getAttributes()` | 23 |

### 3.5 Bảng tra: vận hành

| Thông điệp | Nguyên nhân gốc | Kiểm bằng | Bài |
|---|---|---|---|
| Exit 2, `The following build time options have values that differ from what is persisted...` | `start --optimized` với build option khác lúc build (`metrics-enabled`, `event-metrics-user-enabled`...) | Exit code, so option với lệnh build | 6, 26 |
| Exit 2, `A provider JAR was updated since the last build...` | Thay JAR trong `providers/` mà quên `kc.sh build` | Lần build cuối | 6, 22 |
| `KC-SERVICES0047: ... is implementing the internal SPI` | Provider dùng SPI nội bộ (Authentication, Event Listener) | Compile lại và chạy test mỗi lần nâng version | 22, 23 |
| `Realm 'shop' already exists. Import skipped` (INFO) | `--import-realm` chỉ tạo realm mới | Diff file với `kc get` | 24 |
| 9–10 dòng `JOIN ... timed out`, `Split-brain detected` giữ ready DOWN thêm 12,3–20,6 s, ready 43–53 s | SIGKILL cả cụm để lại dòng xác trong `jgroups_ping` | `select ... from jgroups_ping`; SIGTERM thì ready 4 s | 25 |
| Hai môi trường gộp cụm | Chung DB, tên cụm mặc định `ISPN` trùng | `cache-embedded-cluster-name` | 25 |
| `update-compatibility check` exit 3 | Nâng minor (vd 26.7.5 lên 26.8.1, feature `login-failures` `SHUTDOWN`): phải tắt cả cụm | Chạy check trong CI với đúng `$OPTS` | 29 |
| p50 token endpoint từ 19,45 lên 230,99 ms, không lỗi | Event listener gọi webhook 200 ms trên thread request | Bỏ listener, đo lại | 23 |
| Pod Operator `CrashLoopBackOff`, rollout dừng ở một pod | `spec.image` chạy `--optimized`; option build mới trong CR | Log pod: dòng exit 2 | 26 |
| Đổi image, cả ba pod Terminating cùng lúc | Mặc định `RecreateOnImageChange` | `update.strategy` của CR | 26 |
| CPU chạm limit lúc đỉnh login, RAM "cao" | Băm mật khẩu ăn CPU; heap = 70% limit nên RAM bám limit | `keycloak_credentials_password_hashing_validations_total` | 27 |
| 403 qua reverse proxy ở request kiểm origin | Thiếu `proxy-headers` khi proxy không passthrough | Option `proxy-headers` | (nguồn) |

> **Nguồn.** Reverse proxy, phần course chưa có lab: *"If you are using a reverse proxy for anything other than TLS passthrough and do not set the proxy-headers option, then by default you will see 403 Forbidden responses to requests via the proxy that perform origin checking."* ([reverseproxy](https://www.keycloak.org/server/reverseproxy)). Hostname: *"By default, Keycloak mandates the configuration of the hostname option and does not dynamically resolve URLs."* ([hostname](https://www.keycloak.org/server/hostname)).

Bắt các dòng trên trước khi user thấy (health, metrics, event metrics) là bài 28.

## ⏸ Dừng lại — đoán trước #3

Realm mới tạo trên 26.8.1, không chỉnh gì. Mặc định nào để lại thiệt hại lớn nhất nếu đem lên production nguyên trạng?

- (a) Access token 300 s.
- (b) Brute force detection tắt.
- (c) Full Scope Allowed bật cho mọi client mới.
- (d) Không có câu trả lời chung: mỗi mặc định hỏng trước một kiểu tấn công khác, phải rà từng dòng.

### 3.6 Checklist go-live

Đáp án **(d)**. (b) cho 127 lần đoán OTP mỗi giây trên tài khoản đã lộ mật khẩu (bài 19); (c) làm `aud` vô nghĩa và in một dòng WARN mỗi token (bài 8, 27); (a) quyết định cửa sổ thu hồi cho API verify offline (bài 4). Mỗi mặc định hỏng trước một kiểu tấn công khác, nên checklist rà từng dòng.

| Mục | Mặc định 26.8.1 | Làm gì | Bỏ qua thì hỏng gì | Bài |
|---|---|---|---|---|
| Chế độ chạy | `start-dev`: HTTP, hostname từ header `Host`, DB `dev-file` | `start --optimized` với image đã build | `Host: evil.example` đổi được `issuer`; mỗi replica một DB | 6 |
| Hostname, proxy | Bắt buộc ở `start` | Một `--hostname` công khai cho mọi node; `proxy-headers` khi có proxy | `Invalid token issuer`, 401 ở API | 25 |
| Cổng 9000, `master` | Health, metrics ở 9000 | Không proxy 9000; app không ở `master` | `admin` master là superuser mọi realm | 6 |
| `admin-cli` mỗi realm | Public, `directAccessGrantsEnabled=true` | Tắt nếu không dùng | Password grant không cần secret | 2, 7 |
| PKCE | Để trống: client public đổi code không PKCE | `pkce.code.challenge.method=S256` mọi client public | Code bị chặn là token | 3, 7 |
| `redirectUris` | Client tạo qua API có `standardFlowEnabled=true` | Khớp chính xác, không `*`; tắt standard flow ở client API | Giao code cho URI kẻ tấn công chọn | 7 |
| Full Scope Allowed | Bật | Tắt, khai role scope mapping | Token mang mọi role; 377 dòng WARN một buổi lab | 8, 9 |
| `aud` | `account` | Audience mapper theo API; API kiểm `aud` sau khi mapper đã chạy | API nhận token mọi client; introspection `active:false` | 9, 12 |
| Spring | Chỉ `issuer-uri`, JWKS rate limit tắt | Validator `aud`; converter role; cân nhắc rate limit | 5 token `kid` bịa = 5 lần `GET /certs` | 12 |
| Refresh token | `revokeRefreshToken=false` | Bật nếu app gom được refresh song song | RT bị lấy sống tới SSO Max 36.000 s | 10, 11 |
| Session | SSO Idle 1.800 s, Max 36.000 s, offline idle 30 ngày | Đặt theo rủi ro app | Offline token sống qua logout | 10 |
| Brute force | Tắt | Bật; mặc định khi bật 30 lần, khoá tạm, trần 900 s | Đoán không giới hạn; khoá vĩnh viễn thì 50.000 request khoá 10.000 user | 19, 20 |
| `passwordPolicy` | `null` | Đặt, rồi ép `UPDATE_PASSWORD` (policy không áp ngược) | Mật khẩu cũ yếu vẫn dùng | 20 |
| MFA, ACR | OTP look-around 1, ACR lạ bị lờ | App tự kiểm `acr`; WebAuthn cho admin | OTP không chặn relay | 18, 19 |
| Events | `eventsEnabled=false` | Bật lưu event; listener không gọi mạng trên thread request | Không dấu vết `LOGIN_ERROR` | 1, 23 |
| Brokering | Trust Email OFF, flow mặc định | Không dùng `idp-auto-link` khi IdP ngoài không xác minh email | Chiếm tài khoản theo email | 15 |
| LDAP | Sync tắt; tạo bằng API thì thiếu `connectionPooling`, không pool | `ldaps://`, sync có chu kỳ, bật pool | Mật khẩu thô trên mạng; thuộc tính cũ | 16 |
| Logout | `sid` back-channel không có nếu tạo qua API | `backchannel.logout.session.required` | App không biết xoá session nào | 14 |
| Cluster | Tên `ISPN`, `jdbc-ping` | Tên cụm riêng mỗi môi trường; dừng bằng SIGTERM | Gộp cụm; ready 53 s thay vì 4 s | 25 |
| Sizing | Không có | 1 vCPU mỗi 15 login/s, 120 CC hoặc refresh/s, limit = request × 2,5 | Đỉnh login làm latency tăng không lỗi | 27 |
| Key | Không tự xoay | 3–6 tháng: passive trước, active sau, disable sau lifespan dài nhất | 401 hàng loạt; offline token chết | 29 |
| Backup, upgrade | DB chứa private key và secret | Backup DB mã hoá; `update-compatibility check`; thử restore | Rollback = restore; backup lộ là lộ key | 29 |
| Config-as-code | `--import-realm` chỉ tạo mới | Terraform hoặc keycloak-config-cli | PR merge mà prod không đổi | 24 |
| Operator | `RecreateOnImageChange` | `Auto` cho bản vá; ít nhất 2 instance | Đổi image về 0 pod | 26 |

> **Đo trên lab.** Các mặc định trong bảng đọc từ realm thật trên 26.8.1: `bruteForceProtected: false`, `passwordPolicy: null`, `eventsEnabled: false` (bài 1); `revokeRefreshToken=false, refreshTokenMaxReuse=0` (bài 10); `aud: account` cho token của `spa` (bài 4); 300 mã OTP sai trong một phiên không bị chặn, 127 lần/s (bài 19); 377 dòng WARN `full-scope-allowed` (bài 8).

### 3.7 Câu hỏi phỏng vấn Keycloak engineer

Sau dấu hỏi là thứ câu trả lời tốt phải chạm tới.

1. **Logout rồi, vì sao API còn nhận token?** Verify offline chỉ kiểm chữ ký, `iss`, `exp`; tối đa 300 s mặc định. Ba đường thu hồi: hỏi Keycloak mỗi lần (introspection, p50 0,59 ms localhost), đẩy sự kiện, chờ token chết. Bài 4, 14.
2. **PKCE có thay được client secret, có chặn XSS không?** Ràng code với bên gửi request 3; không chặn script trong origin vì script tự sinh verifier. Server phải bắt S256 theo client. Bài 3, 7, 11.
3. **`aud: account` nghĩa là gì, sửa sao cho API kiểm `aud`?** Do client role của `account` qua Audience Resolve; tắt Full Scope, khai role scope, audience mapper, rồi mới bật validator. Bài 8, 9, 12.
4. **Refresh token sống bao lâu?** Không có ô "Refresh Token Lifespan"; `refresh_expires_in` = min(SSO idle, client idle, phần còn lại tới SSO Max); refresh luôn tra session; mặc định không single-use. Bài 10.
5. **Sai secret, Keycloak trả gì, RFC nói gì?** `401 unauthorized_client` so với `invalid_client` của RFC 6749 §5.2; code xử lý lỗi theo RFC sẽ điều tra nhầm. Bài 2, 7.
6. **Vì sao OTP không chống phishing mà WebAuthn chống?** Mã OTP không chứa origin; chữ ký WebAuthn phủ `origin` và `rpIdHash`, trình duyệt không cho RP ID lạ. Bài 19.
7. **Brute force mặc định thế nào, bật lên thì kẻ tấn công còn bao nhiêu lần đoán?** Tắt khi tạo realm; bật thì 308 lần trong 24 giờ đầu, sau 52,5 giờ còn 96 lần/ngày; spraying 29 lần mỗi 12 giờ không gây khoá; chỉ đếm theo tài khoản. Bài 20.
8. **Xoay signing key mà không 401?** RS256: passive, chờ TTL JWKS, active, disable sau lifespan token dài nhất. HS512: cửa sổ bằng Offline Session Idle. Bài 29.
9. **Hai node, refresh chéo node lỗi. Bạn nhìn gì đầu tiên?** `reason=` trong event: `Invalid token issuer` là hostname, không phải session; session ở DB và cache, node nào cũng đọc được. Bài 25.
10. **Listener gọi webhook làm login chậm, sửa thế nào?** Chạy trên thread request; `enlistAfterCompletion` chỉ đổi thời điểm; hàng đợi đổi latency lấy rủi ro mất event. Bài 23.
11. **Cần bao nhiêu vCPU cho 300 login/s?** 300 / 15 = 20 vCPU request, limit 50; tăng RAM không thêm login nào. Bài 27.
12. **Realm-per-tenant hay Organizations cho 300 khách?** Token đầy đủ của client tự tạo trong `master` tăng 546,2 ký tự mỗi realm (`admin-cli` lightweight đứng yên); Organizations chung key, session, theme. Bài 17, 30.

---

## 4. Lab

Runbook bằng lệnh đã dùng trong course, áp vào ticket mục 2; mỗi bước loại một lớp.

**Bước 1. Lỗi hiện ở đâu, mã gì.** Đọc header trước body:

```bash
curl -si --oauth2-bearer $TA localhost:8380/api/orders | grep -i -e '^HTTP' -e www-auth   # bài 12
```

`401` là hỏng authentication (chữ ký, `kid`, `iss`, thời hạn); `403` là thiếu authority. Ticket 1 là 401: bỏ mọi giả thuyết về role.

**Bước 2. Decode token, giữ claim đang bàn.**

```bash
jq -r .access_token tok.json | python3 jwt.py     # bài 4: tách dấu chấm, base64url-decode
```

Nhìn `iss`, `aud`, `azp`, `exp - now`, `kid` ở header. Ticket 1: `iss` của token hỏng khác token qua được.

**Bước 3. So với cái Keycloak công bố.**

```bash
curl -s $REALM/.well-known/openid-configuration | jq '{issuer, jwks_uri, code_challenge_methods_supported}'
curl -s $REALM/protocol/openid-connect/certs | jq -c '.keys[]|{kid,kty,alg,use}'      # bài 3
kc get keys -r demo                                                                     # bài 29
```

`issuer` phải trùng `iss` từng byte (bài 3). `kid` của token không có trong `/certs` mà có trong `get keys` với trạng thái disabled: lỗi xoay key. Refresh token ký HS512 không bao giờ có trong JWKS, nên đừng tìm `kid` của nó ở đó (bài 4).

**Bước 4. Hỏi Keycloak trạng thái token.**

```bash
curl -s -u api-client:api-secret-123 -d "token=$AT" $REALM/protocol/openid-connect/token/introspect   # bài 4
```

`active:false` không nói lý do. Lý do ở bước 5.

**Bước 5. Tìm dòng event.** Listener `jboss-logging` in event lỗi ra log server, kể cả khi `eventsEnabled=false` (cờ đó chỉ tắt việc lưu vào DB, bài 23):

```bash
grep 'org.keycloak.events' kc.log | grep -e INTROSPECT_TOKEN_ERROR -e REFRESH_TOKEN_ERROR -e LOGIN_ERROR
```

Ticket 3 ra đúng dạng bài 4 đã ghi:

```
WARN [org.keycloak.events] type="INTROSPECT_TOKEN_ERROR", realmName="demo", clientId="api-client", ... error="invalid_token",
     reason="Client 'api-client' is not in the token audience", token_issued_for="test-direct", ...
```

Truy vết về sau cần bật lưu event: `kc update events/config -r app -s eventsEnabled=true` (bài 15).

**Bước 6. Trạng thái user và session.** Login báo sai mật khẩu mà user thề gõ đúng: đọc `attack-detection/brute-force/users/<id>` (bài 20). `"disabled":true` với `numFailures` 30 là đang khoá, không phải sai mật khẩu.

**Bước 7. Process và cụm.** Exit code của process (2 là build option lệch, bài 6), `/health/ready` ở cổng management (bài 6), log `ISPN000094` với số thành viên trong ngoặc tròn (bài 25), dòng `Split-brain detected` sau một lần SIGKILL cả cụm (bài 25), và `update-compatibility check` trước mỗi lần nâng version (bài 29).

> **Đo trên lab.** Mọi lệnh trên đã chạy trong course với output thật: `jwt.py`, introspection, dòng `INTROSPECT_TOKEN_ERROR` (bài 4, 26.8.1 `start-dev`); `/certs` (bài 3); `get keys` (bài 29, Postgres 16.13); header Spring (bài 12, Boot 3.5.16); `numFailures` 30 (bài 20).

---

## 5. Tính tay

### 5.1 Sửa hostname xong, ai còn bị đá ra?

Tình huống mục 2. Lúc 09:00 thứ Hai, node-b được chạy lại với hostname chung. Refresh token mà node-b đã cấp trước đó mang `iss` theo hostname cũ. SSO Idle 1.800 s, SSO Max 36.000 s, offline idle 2.592.000 s (mặc định, bài 10).

- Refresh token thường cấp qua node-b: sau khi sửa, cả hai node tính issuer theo hostname chung, nên mọi refresh bằng RT đó nhận `Invalid token issuer`. User đó phải login lại một lần. Cửa sổ: RT chết trong tối đa 1.800 s nếu không ai refresh, nên tới khoảng 09:30 không còn RT lệch nào dùng được.
- Offline token của app mobile cấp qua node-b: offline idle 30 ngày. User mở app trong 30 ngày tới thì bị đá ra một lần. Ticket rải rác suốt một tháng.

> **Suy luận.** Docs không mô tả trường hợp này; nó suy từ hai dữ kiện đo được: node so `iss` của refresh token với issuer tính từ `--hostname` của chính nó (bài 25), và offline session sống theo Offline Session Idle (bài 10). Kiểm bằng: lab bài 25, lấy offline token qua node-b khi còn hostname 8280, sửa hostname, refresh lại.

### 5.2 Brute force tắt so với bật, cho mã OTP

Kẻ tấn công đã có mật khẩu, đoán mã OTP 6 số với look-around 1: mỗi lần đoán trúng với xác suất 3/10^6 (bài 19). Số lần đoán để đạt 50%: n = ln 0,5 / ln(1 − 3·10^-6) ≈ 231.049.

- Brute force tắt, 127 lần/s (lab bài 19): 231.049 / 127 ≈ 1.819 s ≈ 30,3 phút.
- Brute force bật với mặc định: 308 lần trong 24 giờ đầu, chạm trần sau 52,5 giờ, rồi 96 lần/ngày (bài 20). Cùng cách tính bài 20: 52,5 / 24 + (231.049 − 450) / 96 ≈ 2.404 ngày, khoảng 6,6 năm.

Một công tắc đổi 30 phút thành nhiều năm, dù khi nó tắt không ai thấy lỗi nào.

### 5.3 Đỉnh login của bài 27

3 pod × 2 vCPU limit, đỉnh 150 password login/s (giả định của tình huống bài 27). Hệ số docs 15 login/s mỗi vCPU.

- Cần: 150 / 15 = 10 vCPU request, × 2,5 = 25 vCPU limit.
- Có: 6 vCPU, gánh được 6 × 15 = 90 login/s không headroom. Đỉnh vượt 150 / 90 ≈ 1,67 lần.
- Nâng memory từ 2 lên 4 GB: số login/s không đổi, vì trần là CPU băm; heap đặt 70% limit nên memory dùng lại bám sát limit mới.

---

## 6. Chuyển giao

1. Admin bật Revoke Refresh Token theo khuyến nghị pentest. Từ hôm sau, chỉ trên web, user mở hai tab bị đá ra lác đác; log có `Stale token`. App mobile không bị. Cơ chế nào, và sửa ở app hay ở realm?
2. Keycloak chuyển ra sau một ingress mới terminate TLS. Login bằng form trả 403, còn client credentials từ backend vẫn 200. Option nào còn thiếu, và vì sao chỉ một loại request hỏng?
3. API A (Spring, đã có validator `aud`) và API B (introspection) cùng nhận token của client `web`. Sau khi ai đó tắt Full Scope Allowed của `web` mà không khai role scope mapping, A và B mỗi cái báo gì?
4. Back-channel logout đã chạy đúng, app web xoá session theo `sid`. QA vẫn gọi được `/api/orders` bằng token cũ trong 4 phút sau logout. Đó có phải bug không, và đóng cửa sổ đó tốn gì mỗi request?
5. **Câu khó nhất.** Một khách ngân hàng đòi: tước quyền của một nhân viên phải có hiệu lực trên mọi API trong 10 giây, hệ thống có 40 microservice verify offline, đỉnh 2.000 request/s, Keycloak 3 node. Thiết kế nào đạt 10 giây, nó thêm bao nhiêu lượt gọi Keycloak mỗi giây và bao nhiêu vCPU theo hệ số sizing của course, nó làm gì với token đã đổi qua token exchange, và phần nào của yêu cầu không thiết kế nào trong course đạt được nếu Keycloak mất kết nối 30 giây?

---

## 7. Tóm tắt

- Lỗi Keycloak hiện ở bốn chỗ (trang `/auth`, JSON `/token`, `WWW-Authenticate` ở API, event trong log); response cố ý nói ít hơn log, nên mọi ca bắt đầu bằng dòng event có `reason=`.
- `invalid_grant` ở refresh có nhiều nghĩa: `Session not active` (session bị xoá), `Token is not active` (RT quá `exp` theo SSO Idle/Max), `Stale token` (bật revoke), `Invalid token issuer` (hostname lệch), `Invalid refresh token` (key HS512 tắt).
- Sai secret là `401 unauthorized_client`; `invalid_client` chỉ khi `client_id` không tồn tại (bài 2, 7).
- Introspection `{"active":false}` cho token mới là thiếu `aud` từ 26.6.2 (bài 4, 9); sau logout là session chết. Spring verify offline vẫn 200 tới `exp`, tối đa 300 s.
- Spring chỉ `issuer-uri` không kiểm `aud`, `typ`; validator `aud` bật trước mapper thì mọi request 401 (bài 12).
- Exit 2 là build option lệch; SIGKILL cả cụm thì ready 43–53 s, SIGTERM 4 s (bài 6, 25).
- Mặc định nguy hiểm của 26.8.1: brute force tắt, `passwordPolicy` null, events tắt, `admin-cli` bật password grant, PKCE không bắt, Full Scope Allowed bật, `aud: account`, `revokeRefreshToken=false`, Operator `RecreateOnImageChange`.
- Brute force tắt: 50% đoán trúng OTP trong khoảng 30,3 phút; bật với mặc định: khoảng 2.404 ngày (mục 5.2).
- Sizing: 15 password login/s, 120 CC hoặc refresh/s mỗi vCPU, limit = request × 2,5 (bài 27).

→ **Hết course.** Ôn lại trước phỏng vấn: **bài 4** (token, validate, thu hồi), **bài 10** (session và các đồng hồ lifetime), **bài 25** (cluster, hostname, session sống ở đâu).
