# Bài 15 — Identity brokering: Keycloak đứng giữa, và token cuối cùng là của nó

## 1. Mục tiêu

Sau bài này bạn có thể:

- Vẽ lại luồng brokering OIDC tới từng request và chỉ ra token nào dừng ở Keycloak, token nào tới app.
- Phân biệt brokering với user federation (bài 16) bằng câu hỏi: mật khẩu gõ vào form của ai.
- Đọc first broker login flow theo execution và đoán user thấy màn nào khi email trùng, khi realm không có SMTP.
- Dựng lại cuộc chiếm tài khoản qua auto-link theo email trên lab, rồi chỉ ra dòng event nào trong log bắt được nó.
- Giải thích Trust Email đúng như lab đo: nó tin cờ `email_verified` của IdP ngoài, không tự biến email chưa xác minh thành đã xác minh.
- Cấu hình mapper import claim, sync mode, `kc_idp_hint`, và nói được vì sao một mapper đúng cú pháp vẫn có thể không ghi gì.

## 2. Triệu chứng

Một SaaS B2B thêm nút "Đăng nhập bằng tài khoản công ty": realm `app` broker sang IdP OIDC của khách, alias `corp`. Hai tuần sau, bob, user đăng ký bằng email và mật khẩu từ năm ngoái, báo có người vào tài khoản của anh. Bob chưa từng bấm nút công ty, mật khẩu của anh không bị đổi.

Event của realm `app` ở thời điểm đó:

```json
{"type":"FEDERATED_IDENTITY_LINK","userId":"ec47ee80-...","details":{"identity_provider":"corp",
  "identity_provider_identity":"mallory","username":"bob"}}
{"type":"LOGIN","userId":"ec47ee80-...","details":{"identity_provider":"corp",
  "identity_provider_identity":"mallory","username":"bob","response_type":"code"}}
```

Access token phát ra cho phiên đó: `"sub":"ec47ee80-..."`, `"preferred_username":"bob"`, `"email":"bob@shop.example"`. Phía IdP `corp`, user `mallory` có `email = bob@shop.example`, `emailVerified = false`. Dev cấu hình broker nói: "Tôi chỉ thay first login flow bằng một flow gọn hơn cho user đỡ bấm. Trust Email tôi để OFF cơ mà."

## ⏸ Dừng lại — đoán trước #1

Token mang `sub` của bob. Chuyện gì đã xảy ra?

```
(a) Mallory đoán được mật khẩu của bob ở realm app.
(b) IdP corp phát id_token mang sub của bob, và Keycloak tin chữ ký nên nhận luôn.
(c) Keycloak thấy email do corp gửi trùng email của bob, và flow mới gắn danh tính
    corp/mallory vào tài khoản bob mà không bắt ai chứng minh mình là chủ tài khoản đó.
(d) Do Trust Email: dù dev nói OFF, Keycloak vẫn coi email từ IdP là đã xác minh.
```

## 3. Lý thuyết

### 3.1 Brokering khác federation ở đâu: mật khẩu được gõ vào form của ai

Bản sai thường gặp: "brokering và federation là một, đều là Keycloak lấy user từ chỗ khác". Hai thứ nằm ở hai chương tách riêng trong docs, và nguyên nhân gốc của sự khác biệt là **nơi credential được kiểm**.

**Identity broker** là trung gian nối service provider (app) với identity provider ngoài. Với brokering, Keycloak redirect trình duyệt sang IdP ngoài (Google, Azure AD, một realm Keycloak khác, một IdP SAML). User gõ mật khẩu vào form **của IdP ngoài**. Keycloak không bao giờ thấy mật khẩu đó; nó chỉ nhận về một kết quả đã ký (code đổi lấy token OIDC, hoặc assertion SAML), rồi tự phát token **của chính nó** cho app. Giao thức broker được: SAML 2.0 và OIDC 1.0.

**User federation** (bài 16) thì ngược lại: user gõ mật khẩu vào form **của Keycloak**, Keycloak cầm mật khẩu đó đi hỏi LDAP/AD. Với LDAP, Keycloak không bao giờ import mật khẩu, việc kiểm luôn diễn ra ở LDAP server.

Chỗ dễ lẫn: đoạn brokering của docs dùng đúng chữ "identity federation" cho bước Keycloak tạo user cục bộ sau khi IdP trả về. Chữ đó chỉ hành động import, không phải chương "User Federation".

| | Identity brokering | User federation (LDAP/AD) |
|---|---|---|
| User gõ mật khẩu vào | form của IdP ngoài | form của Keycloak |
| Keycloak có thấy mật khẩu | không | có, chuyển tiếp sang LDAP |
| Giao thức Keycloak ↔ nguồn | OIDC / SAML qua trình duyệt + back-channel | LDAP |
| Bản ghi user ở DB Keycloak | luôn có, kèm liên kết `federatedIdentities` | tuỳ Import Users |
| Ai đổi được mật khẩu | chỉ IdP ngoài | tuỳ edit mode (bài 16) |

> **Nguồn.** *"An Identity Broker is an intermediary service connecting service providers with identity providers."* ([_identity_broker](https://www.keycloak.org/docs/latest/server_admin/#_identity_broker)). *"Keycloak provides support for SAML v2.0 and OpenID Connect v1.0 protocols."* ([_general-idp-config](https://www.keycloak.org/docs/latest/server_admin/#_general-idp-config)). *"Each user logging into your realm using an external identity provider has an entry in the local Keycloak database, based on the metadata from the SAML or OIDC assertions and claims."* ([_mappers](https://www.keycloak.org/docs/latest/server_admin/#_mappers)). *"Keycloak never imports passwords. Password validation always occurs on the LDAP server."* ([storage-mode](https://www.keycloak.org/docs/latest/server_admin/#storage-mode)). Chữ "identity federation" ở đoạn brokering: dòng #47 file nguồn.

### 3.2 Luồng: hai cuộc OAuth lồng nhau, và token ngoài dừng ở Keycloak

Bản sai thứ hai: "login bằng Google qua Keycloak thì app nhận token của Google". Luồng thật trên lab (mục 4) là hai authorization code flow (bài 2) lồng nhau:

- **Vòng ngoài**: app `webapp` là client của realm `app`. Nó nhận code của realm `app`, đổi lấy token có `iss = .../realms/app`.
- **Vòng trong**: realm `app` là **client** của realm `corp`, với client id `app-broker`, secret riêng, và `redirect_uri = .../realms/app/broker/corp/endpoint`. Đoạn `/broker/corp/` đến từ alias; đổi alias là phải sửa redirect URI ở IdP ngoài.

<svg viewBox="0 0 700 470" role="img" aria-labelledby="kc15-a-t kc15-a-d" style="width:100%;height:auto">
<title id="kc15-a-t">Sequence brokering OIDC: webapp, realm app, realm corp</title>
<desc id="kc15-a-d">Trình duyệt đi từ realm app sang realm corp để đăng nhập, realm app đổi code của corp qua back-channel rồi phát code và token của chính nó cho webapp; token của corp dừng lại ở realm app.</desc>
<defs>
<marker id="kc15-a-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker>
<marker id="kc15-a-arrow2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#f59e0b"/></marker>
</defs>
<rect x="20" y="16" width="120" height="34" rx="8" fill="#64748b" fill-opacity="0.25"/>
<text x="80" y="38" text-anchor="middle" font-size="11" fill="currentColor">Trình duyệt</text>
<rect x="170" y="16" width="120" height="34" rx="8" fill="#84cc16" fill-opacity="0.25"/>
<text x="230" y="38" text-anchor="middle" font-size="11" fill="currentColor">webapp (client)</text>
<rect x="345" y="16" width="150" height="34" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="420" y="38" text-anchor="middle" font-size="11" fill="currentColor">Keycloak realm app</text>
<rect x="535" y="16" width="150" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.25"/>
<text x="610" y="38" text-anchor="middle" font-size="11" fill="currentColor">realm corp (IdP ngoài)</text>
<line x1="80" y1="50" x2="80" y2="455" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<line x1="230" y1="50" x2="230" y2="455" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<line x1="420" y1="50" x2="420" y2="455" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<line x1="610" y1="50" x2="610" y2="455" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<text x="250" y="76" text-anchor="middle" font-size="11" fill="currentColor">1 GET /auth (webapp, kc_idp_hint=corp) → 303</text>
<line x1="80" y1="82" x2="418" y2="82" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc15-a-arrow)"/>
<text x="250" y="108" text-anchor="middle" font-size="11" fill="currentColor">2 GET /broker/corp/login → 303 sang corp</text>
<line x1="80" y1="114" x2="418" y2="114" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc15-a-arrow)"/>
<text x="345" y="140" text-anchor="middle" font-size="11" fill="currentColor">3 GET corp /auth (client_id=app-broker) → 200 form login</text>
<line x1="80" y1="146" x2="608" y2="146" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc15-a-arrow)"/>
<text x="345" y="172" text-anchor="middle" font-size="11" fill="currentColor">4 POST mật khẩu của corp → 302 kèm code của corp</text>
<line x1="80" y1="178" x2="608" y2="178" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc15-a-arrow)"/>
<text x="250" y="204" text-anchor="middle" font-size="11" fill="currentColor">5 GET /broker/corp/endpoint?code=…</text>
<line x1="80" y1="210" x2="418" y2="210" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc15-a-arrow)"/>
<text x="515" y="234" text-anchor="middle" font-size="11" fill="currentColor">5a POST /token + secret</text>
<line x1="420" y1="240" x2="608" y2="240" stroke="#f59e0b" stroke-width="1.5" marker-end="url(#kc15-a-arrow2)"/>
<text x="515" y="262" text-anchor="middle" font-size="11" fill="currentColor">token corp dừng ở đây</text>
<line x1="610" y1="268" x2="422" y2="268" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#kc15-a-arrow2)"/>
<text x="515" y="290" text-anchor="middle" font-size="11" fill="currentColor">5b GET /userinfo</text>
<line x1="420" y1="296" x2="608" y2="296" stroke="#f59e0b" stroke-width="1.5" marker-end="url(#kc15-a-arrow2)"/>
<rect x="335" y="312" width="170" height="44" rx="8" fill="#3b82f6" fill-opacity="0.18"/>
<text x="420" y="330" text-anchor="middle" font-size="11" fill="currentColor">first broker login</text>
<text x="420" y="346" text-anchor="middle" font-size="11" fill="currentColor">tạo user hoặc link</text>
<text x="250" y="378" text-anchor="middle" font-size="11" fill="currentColor">6–7 302 về /cb?code=… (code của realm app)</text>
<line x1="418" y1="384" x2="82" y2="384" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#kc15-a-arrow)"/>
<text x="155" y="406" text-anchor="middle" font-size="11" fill="currentColor">8 /cb?code</text>
<line x1="80" y1="412" x2="228" y2="412" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc15-a-arrow)"/>
<text x="325" y="434" text-anchor="middle" font-size="11" fill="currentColor">9 POST /token</text>
<line x1="230" y1="440" x2="418" y2="440" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc15-a-arrow)"/>
<text x="430" y="452" font-size="11" fill="currentColor">→ JWT iss = realms/app</text>
</svg>

Bước 5a, 5b là **back-channel**: event của realm `corp` cho mỗi lần login là `LOGIN`, `CODE_TO_TOKEN`, `USER_INFO_REQUEST`, cả ba `clientId = app-broker`. Token `corp` trả ở 5a không đi tiếp: token `webapp` nhận có `iss = http://localhost:8680/realms/app`. Muốn Keycloak giữ token của IdP ngoài (để gọi API của IdP thay user) phải bật Store Tokens; lab để mặc định.

Cái lợi của thiết kế này: app chỉ tin **một** issuer. Thêm IdP thứ hai, thứ ba không đổi `issuer-uri` của Spring (bài 12), và claim vẫn do mapper của realm `app` quyết định (bài 9).

Hai chi tiết đọc được trên URL ở bước 2:

- `state` gửi sang `corp` có dạng `<ngẫu nhiên>.<tab_id>.<...>.<client_data>`; đoạn cuối base64url-decode ra `{"ru":"http://localhost:3000/cb","rt":"code","st":"s1"}`, ngữ cảnh của vòng ngoài. Nhờ nó, khi code của `corp` quay về, Keycloak biết trả user cho client nào.
- Không có `code_challenge`. Vòng trong là confidential client (`client_secret_post`), code bị chặn giữa đường chưa đổi được nếu thiếu secret.

IdP ngoài là SAML thì realm `app` đóng vai **SP** (bài 5): SP Entity ID mặc định là base URL của realm, metadata SP ở `/realms/{realm}/broker/{alias}/endpoint/descriptor`, và mọi phép kiểm của bài 5 là việc của Keycloak. Ô dễ bỏ trống: Identity Provider Entity ID; trống thì không kiểm `Issuer`.

> **Nguồn.** *"At the end of the authentication process, Keycloak issues its token to client applications."* ([_identity_broker_overview](https://www.keycloak.org/docs/latest/server_admin/#_identity_broker_overview)). *"Keycloak uses the alias to build redirect URIs for OpenID Connect protocols that require a redirect URI or callback URL to communicate with an identity provider."* ([_general-idp-config](https://www.keycloak.org/docs/latest/server_admin/#_general-idp-config)). *"When ON, Keycloak stores tokens from the identity provider."* (cùng trang). IdP OIDC phải hỗ trợ Authorization Code Flow, scope mặc định `openid`: dòng #55, #56. IdP SAML: *"If empty, no Issuer validation is performed."* ([saml-v2-0-identity-providers](https://www.keycloak.org/docs/latest/server_admin/#saml-v2-0-identity-providers)); SP Entity ID, NameID persistent, cache metadata 24 giờ, descriptor SP: dòng #61, #63, #64, #66.

### 3.3 First broker login: Keycloak phải quyết định "người này là ai trong realm của tôi"

Ở bước 5, Keycloak cầm một danh tính ngoài (`corp`/`alice`) và phải trả lời: đã có liên kết nào chưa? Có thì login luôn (lần 2 trở đi, lab chỉ còn 5 request trình duyệt). Chưa có thì chạy **first broker login flow**, một authentication flow như mọi flow khác (bài 18 sẽ mổ cơ chế), mặc định trỏ tới flow tên `first broker login` và đặt riêng được cho từng IdP.

Cây execution của flow mặc định trên Keycloak 26.8.1, đọc bằng `kcadm.sh`:

```
0 REQUIRED     Review Profile                         [idp-review-profile]
0 REQUIRED     User creation or linking
1   ALTERNATIVE  Create User If Unique                [idp-create-user-if-unique]
1   ALTERNATIVE  Handle Existing Account
2     REQUIRED     Confirm link existing account      [idp-confirm-link]
2     REQUIRED     Account verification options
3       ALTERNATIVE  Verify existing account by Email [idp-email-verification]
3       ALTERNATIVE  Verify Existing Account by Re-authentication
4         REQUIRED     Username Password Form for identity provider reauthentication
4         CONDITIONAL  First broker login - Conditional 2FA   (OTP Form ...)
0 CONDITIONAL  First Broker Login - Conditional Organization
```

Mỗi tầng tồn tại vì tầng trên chưa đủ an toàn:

1. **Review Profile.** Cho user sửa dữ liệu IdP gửi về trước khi tạo tài khoản. Trên lab, user `corp` có đủ username, email, họ tên nên màn này không hiện ra.
2. **Create User If Unique.** Không trùng email/username thì tạo user, gắn liên kết, xong. Lab: event `REGISTER` với `register_method: broker` dù realm có `registrationAllowed: false`. Tắt đăng ký trên form không chặn được user mới vào qua broker.
3. **Trùng thì không tự gộp.** Trùng email nghĩa là có một account local mà danh tính ngoài này *có thể* là chủ. "Có thể" chưa đủ, nên flow chuyển sang Confirm Link. User thấy: `User with email bob@shop.example already exists. How do you want to continue?`, kèm hai nút `updateProfile` (sửa thông tin để tạo user khác) và `linkAccount`.
4. **Chọn link thì phải chứng minh mình là chủ account local.** Hai cách ALTERNATIVE: email xác minh tới hộp thư của account local (cần SMTP), hoặc đăng nhập lại bằng credential của account local. Lab không có SMTP, log in: `KC-SERVICES0023: Smtp is not configured for the realm. Ignoring email verification authenticator`, và user rơi xuống form re-authentication: `Authenticate to link your account with corp`.

Mallory với flow mặc định dừng ở bước 4: mật khẩu corp của mình nhập vào ô của bob trả `Invalid username or password.`, event `IDENTITY_PROVIDER_FIRST_LOGIN_ERROR` (`invalid_user_credentials`, `identity_provider_identity: mallory`, `username: bob`). Không liên kết nào được tạo.

> **Nguồn.** *"By default, the First Login Flow option points to the first broker login flow, but you can use your flow or different flows for different identity providers."* ([_identity_broker_first_login](https://www.keycloak.org/docs/latest/server_admin/#_identity_broker_first_login)). *"This authenticator checks if there is already an existing Keycloak account with the same email or username like the account from the identity provider."* (cùng trang). *"This authenticator is ALTERNATIVE by default. Keycloak uses this authenticator if the realm has an SMTP setup configured."* (cùng trang). *"Enabling or disabling user creation by identity provider is completely independent on the realm User Registration switch."* ([_disabling_automatic_user_creation](https://www.keycloak.org/docs/latest/server_admin/#_disabling_automatic_user_creation)).

## ⏸ Dừng lại — đoán trước #2

Quay lại flow mặc định. Bật **Trust Email** trên IdP `corp`. Admin `corp` sửa user `mallory` thành `emailVerified = true` (email vẫn là `bob@shop.example`). Realm `app` có SMTP. Mallory login qua `corp`, tới màn trùng email, bấm `linkAccount`. Chuyện gì xảy ra?

```
(a) Keycloak tự link luôn: IdP đáng tin đã xác minh email, Trust Email ON.
(b) Keycloak gửi email xác minh tới bob@shop.example, hộp thư của bob.
(c) Keycloak gửi email xác minh tới địa chỉ mà corp khai cho mallory.
(d) Keycloak từ chối ngay vì email trùng.
```

### 3.4 Account linking theo email: email là một claim, không phải bằng chứng sở hữu

Đáp án #1 là **(c)**. Flow "gọn hơn" của dev chỉ có hai execution ALTERNATIVE: `Create User If Unique` và `Automatically set existing user` (`idp-auto-link`). Email trùng thì nhánh một thất bại, nhánh hai gán ngay `bob` làm user của phiên. Lab dựng lại đúng flow đó: mallory đi 7 request trình duyệt, không thấy màn nào ngoài form login của `corp`, nhận token có `sub` của bob, trong khi Trust Email OFF và `corp` đánh dấu email của mallory chưa xác minh. Vậy (d) sai: `idp-auto-link` không nhìn cờ xác minh. (b) sai: `ec47ee80-...` là id của bob ở realm `app`, `corp` không biết id đó; nó chỉ nói "đây là mallory, email bob@shop.example".

Nguyên nhân gốc: **email là thuộc tính do IdP ngoài khai**. Ai điều khiển được dữ liệu ở IdP đó (tự đăng ký với email tuỳ ý, hoặc là admin của tenant IdP) thì điều khiển được claim. Thứ duy nhất chứng minh quyền sở hữu account local là thứ chỉ chủ account local có: mật khẩu của account đó, hoặc quyền đọc hộp thư của account đó. Flow mặc định đòi đúng một trong hai; auto-link bỏ cả hai. Một khi liên kết đã tạo, mallory không cần lặp lại gì: những lần login sau qua `corp` đi thẳng vào bob, vì liên kết `corp`/`mallory` đã nằm trong `federatedIdentities` của bob.

Đáp án #2 là **(b)**. Lab: Trust Email ON, mallory `emailVerified = true` ở `corp`, realm `app` có cấu hình SMTP (trỏ vào một cổng không có server). Bấm `linkAccount`, Keycloak **cố gửi email tới bob**: event `SEND_IDENTITY_PROVIDER_LINK_ERROR` với `email: bob@shop.example`, `username: bob`, `error: email_send_failed` (lỗi chỉ vì SMTP giả), trang trả 500. Email chứng minh quyền sở hữu phải tới hộp thư của **account local**, nên kẻ khai email giả không nhận được nó. (a) sai trên lab này: Trust Email không làm flow mặc định bỏ bước xác minh account local.

Vậy Trust Email làm gì? Lab đo trên ba user `corp`, mỗi user một lần login đầu:

| Trust Email | `email_verified` ở `corp` | `emailVerified` của user mới ở `app` |
|---|---|---|
| OFF | true (alice) | false |
| ON | false (carol) | false |
| ON | true (dave) | true |

Trust Email ON nghĩa là Keycloak tin cờ xác minh **mà IdP gửi sang**, không hơn: IdP nói chưa thì vẫn là chưa, và IdP đánh `email_verified: true` cho email chưa từng kiểm thì Keycloak cũng tin. Câu docs *"When ON, Keycloak trusts email addresses from the identity provider."* phải đọc với nghĩa đó.

> **Đo trên lab (chạy riêng cho bài này).** Keycloak 26.8.1 `start-dev`, OpenJDK 24.0.2, Mac mini M4, chạy 2026-10-15 ở `~/projects/keycloak-lab/lab-kc15/` (cổng 8680, không nằm trong `kc-lab-protocol.md`). Ba cấu hình chạy cho mallory: flow `autolink`; flow mặc định không SMTP; flow mặc định + Trust Email ON + SMTP giả. Bảng Trust Email đo trên ba user `corp` mới. Script: `setup.sh`, `broker.sh`, `cont.sh`, `autolink.sh`; output: `run-*.txt`, `kc.log`.

> **Nguồn.** *"Automatically linking the existing local account to the external identity provider is a potential security hole."* ([_identity_broker_first_login](https://www.keycloak.org/docs/latest/server_admin/#_identity_broker_first_login)). *"The AutoLink authenticator is dangerous in a generic environment where users can register themselves using arbitrary usernames or email addresses."* ([automatically-link-existing-first-login-flow](https://www.keycloak.org/docs/latest/server_admin/#automatically-link-existing-first-login-flow)). *"When ON, Keycloak trusts email addresses from the identity provider."* ([_general-idp-config](https://www.keycloak.org/docs/latest/server_admin/#_general-idp-config)).

> **Suy luận.** Docs không nói khi nào AutoLink chấp nhận được. Từ cơ chế trên: chỉ khi không ai ngoài chủ account local tạo được danh tính mang email đó ở IdP ngoài (IdP nội bộ bạn quản lý, user do HR tạo, không tự đăng ký). Điều kiện này nằm ở **quy trình của IdP ngoài**, Keycloak không kiểm được. Kiểm bằng: liệt kê mọi đường tạo user ở IdP ngoài và hỏi đường nào cho đặt email không cần chứng minh.

### 3.5 Mapper và sync mode: dữ liệu nào chảy từ IdP vào user local, và khi nào

Mỗi user vào qua broker có một bản ghi local. Hai câu hỏi tiếp theo: claim nào của IdP được chép vào bản ghi đó (mapper), và chép lại khi nào (sync mode).

**Sync mode.** Docs: import không cập nhật, force cập nhật mỗi lần khi có thể. Lab đổi `firstName` của alice ở `corp` từ `Alice` thành `Alicia`:

- IdP để mặc định (`config.syncMode` không đặt): login lại qua broker, user ở `app` vẫn `firstName: Alice`.
- Đặt `syncMode=FORCE`: lần login kế tiếp, `firstName: Alicia`, token có `given_name: Alicia`; `emailVerified` cũng thành `true` (Trust Email lúc đó ON).

Đổi lại: với FORCE, chỉnh tay ở phía `app` bị ghi đè ở lần login sau; với import, dữ liệu đóng băng tại lần login đầu.

**Mapper của IdP.** Mapper `oidc-user-attribute-idp-mapper` chép claim `department` của `corp` thành attribute `department` của user ở `app`. Lab cấu hình đủ hai đầu (mapper phát claim ở client `app-broker` của `corp`, mapper import ở IdP của `app`), login lại: `attributes: null`. Không lỗi, không event lỗi, không dòng log nào chứa `department`. Nguyên nhân: realm `app` dùng user profile mặc định, chỉ khai bốn attribute `username`, `email`, `firstName`, `lastName`, và `unmanagedAttributePolicy` không đặt, nên attribute lạ bị bỏ qua. Bật `unmanagedAttributePolicy=ENABLED` rồi login lại: `{"department":["finance"]}`.

Mapper import là cấu hình hai tầng (mapper + user profile), tầng thứ hai hỏng thì im lặng. Kiểm bằng cách đọc user sau một lần login thử, không phải đọc cấu hình mapper.

> **Nguồn.** *"Import does not update user data and force updates user data when possible."* ([_general-idp-config](https://www.keycloak.org/docs/latest/server_admin/#_general-idp-config)).

### 3.6 Chọn IdP: `kc_idp_hint`, default IdP, và 2FA bị bỏ qua

Trang login hiện một nút cho mỗi IdP, và IdP bật cho mọi client trong realm theo mặc định. App biết user thuộc tenant nào thì bỏ qua trang đó bằng `kc_idp_hint=<alias>`. Lab đo bốn biến thể của bước 1:

| Request `/auth` của `webapp` | Kết quả |
|---|---|
| có `kc_idp_hint=corp` | `303` thẳng tới `/realms/app/broker/corp/login` |
| không có hint | `200`, form login có link `id="social-corp"` |
| `kc_idp_hint=` (rỗng) | `200`, form login |
| `kc_idp_hint=nope` (alias không có) | `200`, form login |

Hint sai không báo lỗi: triệu chứng phía app là "nút đăng nhập bằng công ty không đưa tôi tới công ty".

Default Identity Provider trong browser flow làm cùng việc ở phía server. Hệ quả: browser flow của realm **không chạy tiếp** sau khi IdP trả về, nên OTP cấu hình trong browser flow không áp cho user đi qua broker. Muốn ép 2FA thì gắn **Post login flow** cho IdP.

Logout cũng đi xuyên broker: Keycloak gửi request logout tới IdP đã dùng để login (cơ chế logout ở bài 14).

> **Nguồn.** *"OIDC applications can bypass the Keycloak login page by hinting at the identity provider they want to use."* ([_client_suggested_idp](https://www.keycloak.org/docs/latest/server_admin/#_client_suggested_idp)). *"The client can disable the automatic redirecting by setting the kc_idp_hint query parameter to an empty value."* (cùng trang). *"The browser authentication flow will not continue after the login with the identity provider is successfully finished."* ([default_identity_provider](https://www.keycloak.org/docs/latest/server_admin/#default_identity_provider)). *"Keycloak creates identity providers for each realm and enables them for every application by default."* ([_general-idp-config](https://www.keycloak.org/docs/latest/server_admin/#_general-idp-config)). Post login flow, logout xuyên IdP: dòng #74, #75.

## ⏸ Dừng lại — đoán trước #3

Realm `app` có browser flow bắt OTP cho mọi user. Bob (account local, đã cài OTP) được admin cho link thêm IdP `corp` bằng flow mặc định, xác minh qua re-authentication. Từ nay bob bấm "Đăng nhập bằng công ty". Anh có bị hỏi OTP không?

```
(a) Có, mỗi lần: OTP gắn với user, không gắn với cách đăng nhập.
(b) Chỉ một lần, ở bước re-authentication lúc link (nhánh Conditional 2FA).
(c) Không bao giờ.
```

Đáp án ở bước 6 của lab.

## 4. Lab

Hai realm trên **cùng một** Keycloak: `corp` làm IdP OIDC, `app` broker sang `corp`. Không cần Google, và đọc được event ở cả hai đầu.

**Bước 1: dựng hai realm và IdP.** (trích `setup.sh`, bỏ phần tạo user, set mật khẩu và client `webapp` có `redirectUris` là `http://localhost:3000/cb`)

```bash
kc create clients -r corp -s clientId=app-broker -s publicClient=false -s secret=broker-secret \
  -s 'redirectUris=["http://localhost:8680/realms/app/broker/corp/endpoint"]'
C=http://localhost:8680/realms/corp; O=$C/protocol/openid-connect   # setup.sh viết URL đầy đủ
kc create identity-provider/instances -r app -s alias=corp -s providerId=oidc -s enabled=true \
  -s config.authorizationUrl=$O/auth -s config.tokenUrl=$O/token -s config.userInfoUrl=$O/userinfo \
  -s config.jwksUrl=$O/certs -s config.issuer=$C -s config.useJwksUrl=true \
  -s config.validateSignature=true -s config.clientId=app-broker -s config.clientSecret=broker-secret \
  -s config.clientAuthMethod=client_secret_post
kc update events/config -r app -s eventsEnabled=true
```

Đọc lại IdP qua Admin API: representation **không có** `trustEmail`, `firstBrokerLoginFlowAlias`, `syncMode` khi chưa đặt; flow rơi về `firstBrokerLoginFlow: "first broker login"` của realm. Với config-as-code (bài 24), trường vắng mặt nghĩa là đang dùng mặc định, không phải "false".

**Bước 2: đi trọn luồng bằng curl.** `broker.sh` giữ cookie jar, theo từng `Location`, POST form login của `corp`, rồi đổi code của `app`. Lần đầu của alice (Location rút gọn):

```
[1] GET app /auth                      >> 303  -> /realms/app/broker/corp/login?session_code=...
[2] GET /realms/app/broker/corp/login  >> 303  -> /realms/corp/.../auth?scope=openid&state=ShPt...
       &response_type=code&client_id=app-broker&redirect_uri=...%2Fbroker%2Fcorp%2Fendpoint&nonce=abcE...
[3] GET corp /auth                     >> 200  page: Sign in to corp
[4] POST corp login (alice)            >> 302  -> /realms/app/broker/corp/endpoint?state=...&iss=...corp&code=bf8c...
[5] GET /realms/app/broker/corp/endpoint     >> 302 -> /realms/app/login-actions/first-broker-login
[6] GET .../first-broker-login               >> 302 -> /realms/app/broker/after-first-broker-login
[7] GET .../after-first-broker-login         >> 302 -> http://localhost:3000/cb?state=s1&iss=...realms%2Fapp&code=b111...
access_token: {"iss": "http://localhost:8680/realms/app", "azp": "webapp", "email_verified": false}
```

Thấy: code ở bước 4 có `iss=...corp`, ở bước 7 có `iss=...realms%2Fapp`: hai issuer, hai vòng OAuth. Bước 6 không dừng ở form nào vì alice không trùng ai. `email_verified: false` vì Trust Email OFF. Login lại với cookie jar mới: chỉ còn [1] tới [5], [5] trả thẳng về `localhost:3000/cb`.

**Bước 3: user ở realm `app`.**

```
users?username=alice      -> {"id":"faba2a1a-...","email":"alice@corp.example","emailVerified":false,"federationLink":null}
users/<id>/federated-identity -> [{"identityProvider":"corp","userId":"1e544477-...","userName":"alice"}]
users/<id>/credentials    -> []
```

`id` ở `app` khác `sub` ở `corp`; `userId` trong liên kết chính là `sub` của alice ở `corp` (`1e544477-...`), khoá mà lần login sau dùng để tìm user, không phải email. `credentials` rỗng: realm `app` không giữ mật khẩu nào của cô. `federationLink` là trường của user federation (bài 16).

**Bước 4: event hai phía.** Realm `app`, lần đầu (mới nhất ở trên):

```json
{"type":"CODE_TO_TOKEN","clientId":"webapp"}
{"type":"LOGIN","details":{"identity_provider":"corp","identity_provider_identity":"alice","username":"alice"}}
{"type":"REGISTER","details":{"identity_provider":"corp","register_method":"broker","email":"alice@corp.example"}}
{"type":"IDENTITY_PROVIDER_FIRST_LOGIN","details":{"identity_provider":"corp","identity_provider_identity":"alice"}}
```

Ở realm `corp` (event liệt kê ở mục 3.2), `USER_INFO_REQUEST` không nằm trong `enabledEventTypes` mặc định; lab phải thêm vào mới thấy.

Trường cần gắn cảnh báo là `identity_provider_identity` khác `username` trong event `LOGIN` hoặc `FEDERATED_IDENTITY_LINK`. Trên lab, đó chính là dòng duy nhất phân biệt "bob đăng nhập" với "mallory đăng nhập thành bob".

**Bước 5: mallory với flow mặc định, rồi với `autolink`.** Ba lần chạy, output ở mục 3.3 và 3.4. Thao tác đổi flow:

```bash
kc create authentication/flows -r app -s alias=autolink -s providerId=basic-flow -s topLevel=true -s builtIn=false
kc create authentication/flows/autolink/executions/execution -r app -s provider=idp-create-user-if-unique
kc create authentication/flows/autolink/executions/execution -r app -s provider=idp-auto-link
# đặt cả hai ALTERNATIVE, rồi:
kc update identity-provider/instances/corp -r app -s firstBrokerLoginFlowAlias=autolink
```

Không có cảnh báo nào trong log khi lưu; diff trông như "đơn giản hoá flow", nên lọt qua review.

**Bước 6: bob có OTP, link `corp`, rồi login lại (đáp án ⏸ #3).** bob cài OTP ở `app`; user `mallory` của `corp` (email `bob@shop.example`) đóng vai danh tính công ty của bob, đi flow mặc định:

```
link:     form corp -> Confirm link [submitAction] -> re-auth [username,password] -> [otp] -> /cb
lần sau:  app /auth 303 -> broker/corp/login 303 -> corp /auth 200 (form corp)
          -> POST corp 302 -> broker/corp/endpoint 302 -> /cb
```

Đáp án **(b)**. Lúc link, nhánh `Conditional 2FA` dưới re-authentication hỏi OTP vì bob đã cài. Lần sau: 5 request, form duy nhất là form của `corp`, không có OTP, vì browser flow của realm không chạy sau khi IdP trả về (mục 3.6). 2FA cho đường này là việc của `corp`, hoặc của Post login flow.

> **Đo trên lab (critic, 26.8.1).** `start-dev` cổng 2200, `setup.sh` của bài đổi cổng, máy đang tải bởi agent khác (không lấy số latency). Script `~/projects/keycloak-lab/tmp-critic-kc15-run.py`, output `critic-ch4/run-kc15-otp-sso.txt`.

**Bước 7: dọn.** Dừng Keycloak bằng SIGTERM: `Keycloak stopped in 1.075s`.

## 5. Tính tay

**Bài 1: đếm request.** Dùng số đo ở mục 4.

- Lần đầu: 7 request trình duyệt + 1 lần `webapp` đổi code + 2 lời gọi back-channel của Keycloak sang `corp` (token, userinfo) = **10 HTTP request**, chưa tính tải tài nguyên tĩnh của trang login.
- Lần sau, cookie jar mới: 5 + 1 + 2 = **8**.
- User đã có phiên SSO ở `corp` (cookie còn sống) nhưng chưa có phiên ở `app`: bước 3 trả `302` thẳng về `/broker/corp/endpoint` thay vì form, bước 4 biến mất. Còn 4 + 1 + 2 = **7**.

> **Đo trên lab (critic, 26.8.1).** Giữ cookie `/realms/corp/`, xoá cookie `/realms/app/`: `app /auth 303`, `broker/corp/login 303`, `corp /auth 302` thẳng về `/broker/corp/endpoint`, `endpoint 302` về `/cb`. Đúng 4 request trình duyệt; realm `corp` vẫn ghi `CODE_TO_TOKEN` và `USER_INFO_REQUEST` cho lần này. Output cùng file với bước 6.

**Bài 2: ai lấy được tài khoản của bob?** Realm `app` có bob (local, `bob@shop.example`, mật khẩu, không OTP). Với mỗi cấu hình, kẻ tấn công cần gì?

| Cấu hình broker | Kẻ tấn công cần | Lý do |
|---|---|---|
| flow mặc định, không SMTP | mật khẩu của bob ở `app` | bước re-authentication |
| flow mặc định, có SMTP | mật khẩu của bob, **hoặc** đọc được hộp thư bob | hai ALTERNATIVE ở tầng 3 |
| flow mặc định, Trust Email ON | như hai dòng trên | email xác minh vẫn gửi tới account local (lab) |
| `autolink`, Trust Email bất kỳ | một danh tính ở IdP ngoài mang email của bob | `idp-auto-link` không kiểm gì |

Dòng cuối: IdP ngoài cho tự đăng ký không xác minh email thì cái giá là một lần đăng ký, không phụ thuộc mật khẩu của bob, nên password policy và brute force (bài 20) vô tác dụng với đường này.

**Bài 3: bao lâu thì đổi tên ở IdP tới được token?** Mặc định realm đo trong `kc-lab-protocol.md` mục 6: access token 300 s, SSO Session Idle 1.800 s, SSO Session Max 36.000 s (10 giờ). Sync mode FORCE. Alice login qua broker lúc 9:00, admin `corp` đổi tên cô lúc 9:05. Alice dùng app liên tục, refresh đều đặn.

- FORCE chép dữ liệu ở **lần login qua broker** (mục 3.5). Refresh token ở `app` không gọi sang `corp`, nên refresh lúc 9:10, 9:15... vẫn ra `given_name` cũ.
- Phiên ở `app` sống tới khi idle quá 30 phút hoặc chạm max 10 giờ. Alice dùng liên tục, nên idle không bao giờ chạm. Phiên hết lúc 9:00 + 10 giờ = **19:00**.
- Tên mới xuất hiện sớm nhất ở lần login qua broker sau 19:00: trễ tối đa 9 giờ 55 phút sau lúc đổi.

Với import (mặc định lab): không bao giờ. Thay tên bằng `department` dùng để phân quyền thì quyền cũ sống tới 19:00 với FORCE, mãi mãi với import.

> **Đo trên lab (critic, 26.8.1).** alice login qua broker rồi `webapp` refresh 3 lần: số event của realm `corp` (đã bật `CODE_TO_TOKEN`, `USER_INFO_REQUEST`) là 12 trước và 12 sau. Với cấu hình của lab, refresh ở `app` không gọi sang `corp`. Script `~/projects/keycloak-lab/tmp-critic-kc15-refresh.py`.

## 6. Chuyển giao

1. Khách thứ hai dùng Azure AD qua SAML; bạn dán metadata nhưng bỏ trống ô Identity Provider Entity ID. Phép kiểm nào của bài 5 mất, và kẻ tấn công cần có gì trong tay để lợi dụng nó?
2. Hai khách doanh nghiệp, hai IdP `acme` và `globex`, cả hai cho admin tenant tự tạo user với email tuỳ ý. Một user local `ceo@acme.example` tồn tại từ trước. Với flow mặc định có SMTP, admin của `globex` tạo user mang email đó rồi login qua `globex`. Đi qua cây execution ở mục 3.3 và nói anh ta dừng ở đâu, ai nhận email.
3. Product muốn user vào qua broker có OTP của realm như mọi người. Viết cấu hình tối thiểu, và nói nó có làm mất đi điều gì với user đã có 2FA mạnh ở IdP ngoài không.
4. Một IdP OIDC ngoài đổi định dạng `sub` sau khi họ migrate hệ thống (cùng người, `sub` mới). Dựa vào bước 3 của lab, đoán chuyện gì xảy ra ở lần login kế tiếp của 10.000 user, và đường nào trong first broker login flow họ sẽ đi.
5. Đội bạn muốn gọi Microsoft Graph thay user sau khi login qua Azure AD broker. Vì sao token `webapp` nhận không dùng được, cần bật gì, và rủi ro mới khi Keycloak giữ token của IdP ngoài là gì?
6. Bạn phải cho phép auto-link vì một khách lớn đòi "không màn hình thừa", với IdP do chính khách đó vận hành, trong một realm có cả user tự đăng ký. Thiết kế first broker login flow (chỉ dùng execution trong cây mục 3.3, `idp-auto-link`, và cấu hình realm/IdP) vẫn đóng được cuộc tấn công ở mục 2; nêu giả định về quy trình của khách mà Keycloak không kiểm được, và cách phát hiện từ event khi giả định đó sai.

## 7. Tóm tắt

- Brokering: mật khẩu gõ vào form của IdP ngoài. Federation (bài 16): gõ vào form của Keycloak, Keycloak đem đi hỏi LDAP.
- Luồng OIDC brokering là hai vòng authorization code lồng nhau. Lab: lần đầu 7 request trình duyệt + 1 đổi code của app + 2 back-channel (token, userinfo) sang IdP; lần sau 5 + 1 + 2.
- Token của IdP ngoài dừng ở Keycloak; app nhận token `iss = .../realms/app`.
- User vào qua broker có bản ghi local, `credentials` rỗng, liên kết khoá theo `sub` của IdP ngoài. Tạo user qua broker không phụ thuộc công tắc User Registration.
- First broker login mặc định: email trùng thì hỏi, chọn link thì phải chứng minh sở hữu account local bằng email (cần SMTP) hoặc mật khẩu. Không SMTP thì Keycloak bỏ qua nhánh email (`KC-SERVICES0023`).
- `idp-auto-link` gắn danh tính ngoài vào account trùng email mà không kiểm gì. Lab: mallory, email chưa xác minh, Trust Email OFF, nhận token `sub` của bob. Dấu vết: `identity_provider_identity` khác `username` trong event.
- Trust Email tin cờ `email_verified` của IdP ngoài (lab: ON giữ nguyên false/true; OFF biến true thành false). Flow mặc định vẫn gửi email xác minh tới hộp thư của account local.
- Sync mode mặc định không cập nhật user sau lần đầu; FORCE cập nhật ở lần login qua broker. Mapper import bị bỏ im lặng nếu user profile không nhận attribute đó.
- `kc_idp_hint=<alias>` bỏ qua trang login; rỗng hoặc alias sai thì trả form `200`, không báo lỗi. Browser flow (kể cả OTP) không chạy sau khi IdP trả về; 2FA cho user broker thuộc về Post login flow.

→ **Bài 16 — LDAP / Active Directory**: đường ngược lại, Keycloak giữ form và đem mật khẩu đi hỏi LDAP; "mật khẩu có về DB Keycloak không" trả lời khác nhau theo từng edit mode.
