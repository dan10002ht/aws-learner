# Bài 11 — SPA, PKCE và BFF

## 1. Mục tiêu

Sau bài này bạn có thể:

- Với một SPA cụ thể, nói được XSS trong trang **mang được gì ra ngoài** và **dùng được bao lâu sau khi user đóng tab**, bằng số giây từ cấu hình realm.
- Giải thích vì sao PKCE chặn kẻ chặn code giữa đường mà không chặn XSS, và vì sao chuyển token từ `localStorage` sang bộ nhớ chỉ bịt một trong hai đường XSS lấy token.
- Phân biệt ba kiến trúc SPA tự giữ token, token-mediating backend, BFF: token nằm ở đâu, client public hay confidential, vì sao.
- Cấu hình client `bff` (confidential, PKCE S256) bằng `kcadm.sh` và dựng BFF Spring Boot chạy được: `oauth2Login()`, logout OIDC, CSRF cho SPA.
- Tính dung lượng session store của BFF từ kích thước token đo được trên lab.
- Nêu đúng giới hạn của BFF: XSS vẫn **dùng ké session** khi tab mở, CSRF quay lại, và ba mặc định của Spring phải sửa trước production.

---

## 2. Triệu chứng

Một SaaS B2B có SPA React gọi thẳng Keycloak bằng authorization code + PKCE (bài 3). Sau khi đổi code, SPA cất `access_token` và `refresh_token` vào `localStorage` để F5 không phải login lại. Realm để mặc định.

Báo cáo pentest về tay. Tester tìm được một ô ghi chú lưu HTML không escape (stored XSS). Script tiêm vào làm đúng một việc: đọc `localStorage`, gửi hai token về máy của tester. Phần đáng sợ nằm ở dòng thời gian trong báo cáo:

```
09:00  nạn nhân login
09:05  nạn nhân mở trang có ô ghi chú, script gửi refresh_token ra ngoài
09:20  nạn nhân đóng laptop, đi họp
09:30  tester gọi token endpoint bằng refresh_token đó: 200, có access_token mới
...    tester refresh mỗi 25 phút, gọi API đơn hàng bằng token mới
18:55  tester vẫn gọi API được
19:00  refresh trả invalid_grant
```

Không ai đăng nhập lại. Nạn nhân không thấy gì bất thường: refresh token của cô vẫn chạy song song với bản của tester. Mười giờ là SSO Session Max mặc định.

Tech lead đề xuất hai bản vá: (1) bỏ `localStorage`, giữ token trong bộ nhớ như adapter `keycloak-js` mặc định làm; (2) giảm access token xuống 60 giây.

> **Nguồn.** SSO Session Max mặc định 36000 giây trong code 26.8.1 (*"public static final int DEFAULT_SESSION_MAX_LIFESPAN = 36000; // 10 hours"*, [Constants.java#L72](https://github.com/keycloak/keycloak/blob/26.8.1/server-spi-private/src/main/java/org/keycloak/models/Constants.java#L72)); SSO Session Idle 1800 giây ([Constants.java#L71](https://github.com/keycloak/keycloak/blob/26.8.1/server-spi-private/src/main/java/org/keycloak/models/Constants.java#L71)); idle reset ở mỗi lần refresh: *"This timeout value resets when clients request authentication or send a refresh token request."* ([_timeouts](https://www.keycloak.org/docs/latest/server_admin/index.html#_timeouts)). Dòng thời gian trên là tình huống dựng từ các số mặc định này, không phải log thật.

> **Đo trên lab.** Keycloak 26.8.1 `start-dev`, Java 24, Mac mini Apple M4, realm mặc định: refresh lần đầu trả RT mới khác RT cũ, rồi **dùng lại RT cũ vẫn thành công**; realm có `revokeRefreshToken=false, refreshTokenMaxReuse=0`. Đây là lý do tester và nạn nhân cùng refresh được.

---

## ⏸ Dừng lại — đoán trước #1

Áp bản vá (1): token chỉ nằm trong biến JS, không ghi xuống storage nào. Cùng lỗ stored XSS đó. Script của tester giờ còn làm được gì?

```
(a) Không gì cả: không còn storage nào để đọc, token chết theo tab
(b) Đọc được token nếu biến chứa token lộ ra phạm vi toàn cục, ngoài ra hết đường
(c) Tự chạy một authorization code flow mới với PKCE của chính nó và nhận token mới toanh
(d) Chỉ gọi API được trong lúc tab mở, không mang token ra ngoài được
```

---

## 3. Lý thuyết

### 3.1 PKCE chặn ai, và vì sao XSS không nằm trong danh sách

Đáp án là **(c)**, và (b) cũng đúng một phần. Để thấy vì sao, quay về câu hỏi PKCE được thiết kế để chặn ai.

SPA là **public client**: client không có cách nào giữ bí mật, vì mọi thứ gửi xuống trình duyệt đều đọc được. Keycloak docs nói thẳng điều này, và nó dẫn tới hệ quả: ở bước đổi code, Keycloak không có secret nào để hỏi SPA. Thứ duy nhất chứng minh "người đổi code chính là người bắt đầu flow" là `code_verifier` của PKCE (bài 3 đã tính tay S256).

PKCE giải đúng một bài toán: kẻ nào **chặn được code giữa đường** (từ log proxy, từ app khác đăng ký cùng custom scheme) mà không có `code_verifier` thì không đổi được code. Lab đã thấy: verifier sai trả `400 invalid_grant` "PKCE verification failed: Code mismatch".

Bây giờ đặt XSS vào khuôn đó. XSS là code của kẻ tấn công chạy **trong origin của chính SPA**. Với Keycloak và với trình duyệt, nó không phải "kẻ chặn giữa đường", nó chính là client. Nó làm được mọi thứ SPA làm:

1. Tự sinh `code_verifier` mới, tính `code_challenge`.
2. Mở request tới `/realms/demo/protocol/openid-connect/auth` với `client_id=spa`, `redirect_uri` đã đăng ký, trong một iframe ẩn hoặc popup.
3. Trình duyệt gửi kèm cookie SSO của Keycloak. User đã login, nên Keycloak không hỏi mật khẩu mà redirect ngay về `redirect_uri` kèm code.
4. `redirect_uri` cùng origin với script, nên script đọc được URL chứa code từ iframe.
5. Script POST code + verifier của chính nó lên token endpoint. Public client không cần secret. Nhận AT + RT mới.

Đây là đường thứ hai. Đường thứ nhất là **đọc token đang có** (`localStorage`, hoặc biến JS nếu với tới được). Bản vá (1) bịt đường thứ nhất, không chạm đường thứ hai: token lấy theo cách này là token mới, có RT riêng, độc lập với token trong bộ nhớ của SPA.

> **Suy luận.** Bộ nguồn không mô tả cuộc tấn công năm bước này. Nó suy ra từ ba dữ kiện: client JS bắt buộc là public client (Keycloak docs), public client đổi code chỉ bằng code + verifier (lab, client `spa`), và PKCE chỉ ràng buộc người gửi challenge với người gửi verifier (RFC 7636). Kiểm bằng: trong trình duyệt đã login realm `demo`, mở tay URL `/auth` của `spa` với `code_challenge` tự tính; Keycloak redirect thẳng về callback kèm `code` thì bước 3 đứng vững. Chặn cookie bên thứ ba có thể làm hỏng biến thể iframe, không ảnh hưởng biến thể popup.

Còn bản vá (2), giảm AT xuống 60 giây: nó rút ngắn tuổi thọ của **một** access token bị lấy, nhưng không đụng tới refresh token, thứ đang cho tester mười giờ. Tester refresh mỗi 25 phút chứ không giữ một AT.

> **Nguồn.** Public client: *"HTML5/JavaScript clients have to be public clients because there is no way to securely transmit the client secret to HTML5/JavaScript clients."* ([_oidc-auth-flows-authorization](https://www.keycloak.org/docs/latest/server_admin/index.html#_oidc-auth-flows-authorization)). Phạm vi của PKCE: *"OAuth 2.0 public clients utilizing the Authorization Code Grant are susceptible to the authorization code interception attack."* ([rfc7636](https://www.rfc-editor.org/rfc/rfc7636)). Adapter JS: *"Both access and refresh token are stored in memory and are not persisted in any kind of storage."* ([javascript-adapter](https://www.keycloak.org/securing-apps/javascript-adapter)).

### 3.2 Kiến trúc 1: SPA tự giữ token

**Nó là gì.** Trình duyệt là OAuth client duy nhất. SPA gọi `/auth`, đổi code, giữ AT để gắn `Authorization: Bearer` khi gọi API, giữ RT để tự xin AT mới. Keycloak thấy một public client có `webOrigins` (lab: AT của `spa` mang claim `"allowed-origins":["http://localhost:3000"]`, vì trình duyệt gọi token endpoint bằng `fetch` cross-origin).

**Vì sao nó hấp dẫn.** Chỉ cần static host, API stateless. Cảnh báo về `localStorage` và cookie `HttpOnly` đã có ở `security/sec-05-authn-authz.md`; bài này đi tiếp: XSS lấy được gì **ngoài** storage.

**Cơ chế thiệt hại.** Thứ quyết định thiệt hại không phải AT mà là RT, vì ba lý do nối tiếp nhau:

1. RT là **bearer**: ai cầm cũng dùng được, không chứng minh giữ khoá gì. Token endpoint của public client không hỏi secret.
2. Mỗi lần refresh **reset SSO Session Idle**. Kẻ tấn công refresh trước mốc 1800 giây là giữ session sống mãi, chỉ đụng trần SSO Session Max 36000 giây.
3. Realm mặc định không thu hồi RT cũ khi đã xoay (lab ở mục 2), nên kẻ tấn công không làm user mất phiên, user không có tín hiệu gì để báo.

Từ 26.8.0, hạn của RT bị chặn bởi session idle, nên response trả `refresh_expires_in: 1800` (lab). Đó là khoảng tối đa giữa **hai lần refresh**, không phải "kẻ tấn công có 30 phút".

**Localstorage hay bộ nhớ.** Với stored XSS (chạy lại mỗi lần trang tải), kẻ tấn công không cần đường "đọc token" mà bộ nhớ bịt; đường "xin token mới" ở 3.1 là đủ.

**Chỗ hay sai.** Đội thường bật **Revoke Refresh Token** và coi như xong. RFC 9700 đúng là đòi RT của public client phải rotation hoặc sender-constrained. Nhưng rotation chỉ biến cuộc tấn công thành cuộc đua: ai refresh trước thì người kia nhận `invalid_grant`. Nếu kẻ tấn công refresh trước, chính user bị đá ra và login lại, còn chuỗi RT của kẻ tấn công vẫn sống.

> **Chưa đo.** Docs không nói khi phát hiện RT cũ bị dùng lại, Keycloak giết cả user session hay chỉ từ chối request đó. Đo bằng: bật `revokeRefreshToken=true`, lấy RT0, refresh ra RT1, dùng lại RT0 (kỳ vọng `invalid_grant`), rồi refresh bằng RT1. RT1 còn sống thì rotation không cắt được kẻ tấn công đã refresh trước.

> **Nguồn.** RFC 9700: *"Refresh tokens for public clients MUST be sender-constrained or use refresh token rotation as described in Section 4.14."* ([rfc9700](https://www.rfc-editor.org/rfc/rfc9700)). Keycloak 26.8.0: *"For all refresh tokens (online and offline), the expiration is now capped by the user session idle timeout, so refresh_expires_in reflects the minimum of the session idle timeout and any client-specific session idle timeout."* ([upgrading](https://www.keycloak.org/docs/latest/upgrading/index.html#refresh-token-expiration-now-reflects-the-session-idle-timeout)). Revoke Refresh Token mặc định tắt ([DefaultExportImportManager.java#L250](https://github.com/keycloak/keycloak/blob/26.8.1/model/storage-private/src/main/java/org/keycloak/storage/datastore/DefaultExportImportManager.java#L250)).

---

## ⏸ Dừng lại — đoán trước #2

Bỏ RT khỏi trình duyệt. Một backend nhỏ làm confidential client: đổi code, giữ RT trong session của nó (cookie `HttpOnly`), và mỗi khi SPA cần thì trả cho SPA một **access token** qua endpoint `/token`. SPA vẫn gắn Bearer khi gọi API.

Cùng lỗ XSS, script chạy lúc 14:04:00. User đóng tab lúc 14:05:00. Access token sống 300 giây. Sau 14:05:00, kẻ tấn công còn gọi API được tối đa bao lâu?

```
(a) 0 giây: không có RT thì không làm gì được
(b) Tối đa 300 giây
(c) 1800 giây, vì session của backend vẫn sống
(d) Tới SSO Session Max như cũ
```

---

### 3.3 Kiến trúc 2: token-mediating backend

Đáp án là **(b)**, và cận trên 300 giây đến từ đúng một chỗ.

**Nó là gì.** Một backend làm OAuth client confidential: nó giữ `client_secret`, tự đổi code và tự refresh. RT không bao giờ xuống trình duyệt. Trình duyệt chỉ cầm cookie session với backend, và xin AT qua backend khi cần. API vẫn nhận Bearer như kiến trúc 1, nên SPA gọi API trực tiếp, không qua backend.

**Cơ chế, theo hai đường XSS.**

- Đường "đọc token": script đọc được AT đang có trong bộ nhớ. AT sống tối đa 300 giây kể từ `iat`.
- Đường "xin token mới": script gọi `/token` của backend. Trình duyệt tự gắn cookie session, backend không phân biệt được script với SPA, nên trả AT mới. Nhưng chỉ lấy được **khi script còn chạy trong tab**. Cookie là `HttpOnly`, script không mang cookie ra ngoài được.
- Đường "tự chạy flow với PKCE riêng" ở 3.1 bị chặn ở bước 5: client giờ là confidential, đổi code phải có secret, secret nằm trên backend.

Nên khi tab đóng, thứ kẻ tấn công còn trong tay là AT cuối cùng nó xin được, và AT đó hết hạn trong tối đa 300 giây. Đây là chỗ bản vá (2) của tech lead (AT 60 giây) bắt đầu có tác dụng: ở kiến trúc 1 nó vô nghĩa vì RT, ở kiến trúc 2 nó cắt thẳng cửa sổ sau khi đóng tab từ 300 xuống 60 giây.

**Cái giá.** Backend stateful như BFF mà vẫn lộ một bearer token sống 300 giây.

> **Suy luận.** Bộ nguồn chỉ có hai câu từ RFC 10017: định nghĩa BFF, và các pattern xếp theo độ an toàn giảm dần, BFF đứng đầu. Vị trí của token-mediating backend ở giữa suy ra từ cơ chế: số đường XSS lấy token còn mở (2, 1, 0) và cửa sổ sau khi đóng tab. Kiểm bằng: đối chiếu thứ tự trong mục các pattern của [RFC 10017](https://www.rfc-editor.org/rfc/rfc10017).

### 3.4 Kiến trúc 3: Backend-for-Frontend

**Nó là gì.** BFF là backend cùng origin với SPA, đóng ba vai: OAuth client confidential, chủ của session cookie, và **reverse proxy** cho mọi lời gọi API. SPA không bao giờ thấy token nào, kể cả AT. SPA gọi `/bff/orders` kèm cookie; BFF tra session, lấy AT (refresh nếu cần), gắn `Authorization: Bearer` rồi chuyển tiếp tới API.

**Giải bài toán gì.** Nó đóng nốt đường "đọc token" của kiến trúc 2: trình duyệt không còn token. Script XSS chỉ còn **gửi request qua BFF bằng cookie của user**, tức dùng ké session (session riding): trong lúc tab mở, nó làm được mọi thứ user làm được. Nhưng nó dừng khi tab đóng, và kẻ tấn công không có gì mang về máy mình.

<svg viewBox="0 0 720 360" role="img" aria-labelledby="kc11-a-t kc11-a-d" style="width:100%;height:auto">
<title id="kc11-a-t">Token nằm ở đâu trong ba kiến trúc SPA</title>
<desc id="kc11-a-d">Ba cột so sánh: SPA tự giữ token thì access token và refresh token nằm trong trình duyệt; token-mediating backend giữ refresh token ở server và đưa access token xuống trình duyệt; BFF giữ cả hai token ở server, trình duyệt chỉ có cookie HttpOnly mang session id.</desc>
<defs>
<marker id="kc11-a-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor" fill-opacity="0.6"/></marker>
</defs>
<text x="125" y="22" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">1. SPA tự giữ token</text>
<text x="360" y="22" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">2. Token-mediating backend</text>
<text x="595" y="22" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">3. BFF</text>
<rect x="20" y="36" width="210" height="96" rx="8" fill="#3b82f6" fill-opacity="0.15"/>
<rect x="255" y="36" width="210" height="96" rx="8" fill="#3b82f6" fill-opacity="0.15"/>
<rect x="490" y="36" width="210" height="96" rx="8" fill="#3b82f6" fill-opacity="0.15"/>
<text x="125" y="54" text-anchor="middle" font-size="11" fill="currentColor">Trình duyệt (public client)</text>
<text x="360" y="54" text-anchor="middle" font-size="11" fill="currentColor">Trình duyệt</text>
<text x="595" y="54" text-anchor="middle" font-size="11" fill="currentColor">Trình duyệt</text>
<rect x="40" y="66" width="80" height="26" rx="5" fill="#ef4444" fill-opacity="0.35"/>
<text x="80" y="83" text-anchor="middle" font-size="11" fill="currentColor">AT 300 s</text>
<rect x="130" y="66" width="80" height="26" rx="5" fill="#ef4444" fill-opacity="0.35"/>
<text x="170" y="83" text-anchor="middle" font-size="11" fill="currentColor">RT</text>
<text x="125" y="118" text-anchor="middle" font-size="11" fill="currentColor">trong JS hoặc localStorage</text>
<rect x="275" y="66" width="80" height="26" rx="5" fill="#f59e0b" fill-opacity="0.35"/>
<text x="315" y="83" text-anchor="middle" font-size="11" fill="currentColor">AT 300 s</text>
<rect x="365" y="66" width="80" height="26" rx="5" fill="#64748b" fill-opacity="0.3"/>
<text x="405" y="83" text-anchor="middle" font-size="11" fill="currentColor">cookie</text>
<text x="360" y="118" text-anchor="middle" font-size="11" fill="currentColor">AT trong JS, cookie HttpOnly</text>
<rect x="545" y="66" width="100" height="26" rx="5" fill="#64748b" fill-opacity="0.3"/>
<text x="595" y="83" text-anchor="middle" font-size="11" fill="currentColor">cookie</text>
<text x="595" y="118" text-anchor="middle" font-size="11" fill="currentColor">chỉ session id, HttpOnly</text>
<rect x="90" y="156" width="140" height="70" rx="8" fill="#64748b" fill-opacity="0.12"/>
<text x="160" y="186" text-anchor="middle" font-size="11" fill="currentColor">static host</text>
<text x="160" y="204" text-anchor="middle" font-size="11" fill="currentColor">không giữ token</text>
<rect x="255" y="156" width="210" height="70" rx="8" fill="#84cc16" fill-opacity="0.2"/>
<text x="360" y="176" text-anchor="middle" font-size="11" fill="currentColor">Backend (confidential)</text>
<rect x="320" y="186" width="80" height="26" rx="5" fill="#84cc16" fill-opacity="0.45"/>
<text x="360" y="203" text-anchor="middle" font-size="11" fill="currentColor">RT</text>
<rect x="490" y="156" width="210" height="70" rx="8" fill="#84cc16" fill-opacity="0.2"/>
<text x="595" y="176" text-anchor="middle" font-size="11" fill="currentColor">BFF (confidential, proxy)</text>
<rect x="510" y="186" width="80" height="26" rx="5" fill="#84cc16" fill-opacity="0.45"/>
<text x="550" y="203" text-anchor="middle" font-size="11" fill="currentColor">AT</text>
<rect x="600" y="186" width="80" height="26" rx="5" fill="#84cc16" fill-opacity="0.45"/>
<text x="640" y="203" text-anchor="middle" font-size="11" fill="currentColor">RT</text>
<rect x="20" y="250" width="210" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.2"/>
<rect x="255" y="250" width="210" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.2"/>
<rect x="490" y="250" width="210" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.2"/>
<text x="125" y="274" text-anchor="middle" font-size="11" fill="currentColor">Keycloak token endpoint</text>
<text x="360" y="274" text-anchor="middle" font-size="11" fill="currentColor">Keycloak token endpoint</text>
<text x="595" y="274" text-anchor="middle" font-size="11" fill="currentColor">Keycloak token endpoint</text>
<line x1="50" y1="132" x2="50" y2="248" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-start="url(#kc11-a-arrow)" marker-end="url(#kc11-a-arrow)"/>
<line x1="360" y1="226" x2="360" y2="248" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-start="url(#kc11-a-arrow)" marker-end="url(#kc11-a-arrow)"/>
<line x1="595" y1="226" x2="595" y2="248" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-start="url(#kc11-a-arrow)" marker-end="url(#kc11-a-arrow)"/>
<line x1="360" y1="132" x2="360" y2="154" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-start="url(#kc11-a-arrow)" marker-end="url(#kc11-a-arrow)"/>
<line x1="595" y1="132" x2="595" y2="154" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-start="url(#kc11-a-arrow)" marker-end="url(#kc11-a-arrow)"/>
<text x="125" y="318" text-anchor="middle" font-size="11" fill="currentColor">XSS mang đi: AT + RT</text>
<text x="125" y="336" text-anchor="middle" font-size="11" fill="currentColor">dùng tới SSO Session Max</text>
<text x="360" y="318" text-anchor="middle" font-size="11" fill="currentColor">XSS mang đi: một AT</text>
<text x="360" y="336" text-anchor="middle" font-size="11" fill="currentColor">dùng tối đa 300 s sau khi đóng tab</text>
<text x="595" y="318" text-anchor="middle" font-size="11" fill="currentColor">XSS mang đi: không token nào</text>
<text x="595" y="336" text-anchor="middle" font-size="11" fill="currentColor">chỉ dùng ké khi tab còn mở</text>
</svg>

**Hai thứ BFF đưa quay lại.** Chuyển từ Bearer sang cookie không miễn phí, và cả hai đến từ cùng một nguyên nhân gốc: trình duyệt **tự động** gắn cookie.

- **CSRF.** Ở kiến trúc 1, API chỉ nhận header `Authorization` mà trang lạ không tự gắn được, nên CSRF không có chỗ bám. Ở BFF, trang `evil.example` gửi form POST tới `/bff/orders` thì trình duyệt có thể gắn cookie. Chặn bằng `SameSite` (đã dạy ở sec-05) cộng một header tuỳ biến bắt buộc mà form HTML không tự gửi được, hoặc CSRF token.
- **State.** BFF giữ AT + RT cho mọi session đang sống. Nhiều instance BFF sau load balancer phải dùng chung session store, nếu không request đi lạc instance sẽ thấy "chưa login". Mục 5.3 tính dung lượng.

**Chỗ hay sai.** "Có BFF rồi thì XSS hết nguy hiểm." BFF chỉ đổi thứ XSS lấy được từ "credential mang đi được" thành "quyền hành động khi tab mở"; CSP và escape output vẫn là tuyến chính.

> **Nguồn.** RFC 10017 (BCP cho browser-based app): *"The BFF manages OAuth access and refresh tokens in the context of a cookie-based session, avoiding the direct exposure of any tokens to the browser-based application."* và *"The patterns in this section are presented in decreasing order of security."* ([rfc10017](https://www.rfc-editor.org/rfc/rfc10017)). Keycloak docs 26.8.1 không có hướng dẫn BFF và không có adapter Java/Spring trong `securing-apps`; phần Spring ở mục 4 dựa vào Spring Security, không phải docs Keycloak.

---

## ⏸ Dừng lại — đoán trước #3

User bấm **Logout** trên BFF. BFF xoá session của nó và trả cookie hết hạn. Không làm gì thêm. Mười giây sau, user mở một app khác cùng realm. Chuyện gì xảy ra?

```
(a) App kia bắt login lại: session ở BFF đã xoá
(b) App kia vào thẳng, không hỏi mật khẩu
(c) App kia vào được, nhưng mọi lời gọi API trả 401
```

---

### 3.5 Bảng so sánh: XSS lấy được gì, làm được gì, bao lâu

Đáp án #3 là **(b)**. Xoá session ở BFF chỉ là logout ở app. SSO session và cookie SSO của Keycloak vẫn sống, nên app khác (và chính BFF khi login lại) đi qua `/auth` mà không thấy form. BFF phải gọi RP-Initiated Logout tới `end_session_endpoint` kèm `id_token_hint` (bài 14 mổ chi tiết). Kể cả logout đúng, AT đã phát vẫn qua resource server verify offline tới `exp`:

> **Đo trên lab.** Sau `POST /logout` (HTTP 204), introspect AT trả `active:false`, userinfo trả 401 `user_session_not_found`, refresh trả `invalid_grant` "Session not active", trong khi `exp - now` của AT lúc đó vẫn còn **300 s**.

Gom ba kiến trúc lại, realm mặc định 26.8.1: AT 300 s, SSO Session Idle 1800 s, SSO Session Max 36000 s, Revoke Refresh Token tắt.

| | 1. SPA giữ token (`localStorage`) | 1b. SPA giữ token (bộ nhớ) | 2. Token-mediating backend | 3. BFF |
|---|---|---|---|---|
| Client Keycloak | public + PKCE | public + PKCE | confidential | confidential |
| Token trong trình duyệt | AT, RT | AT, RT | AT | không |
| XSS đọc token đang có | ✓ | ✓ nếu với tới biến | ✓ AT | ✗ |
| XSS tự xin token mới | ✓ flow PKCE riêng | ✓ flow PKCE riêng | ✓ AT qua `/token`, chỉ khi tab mở | ✗ |
| Mang ra ngoài được | AT + RT | AT + RT | AT | không có gì |
| Dùng được sau khi tab đóng | tới SSO Session Max: tối đa 36000 s kể từ login | như cột trước | tối đa 300 s | 0 s |
| Dùng ké session khi tab mở | ✓ | ✓ | ✓ | ✓ |
| User có tín hiệu bị lộ | không (RT cũ vẫn dùng được) | không | không | không |
| Thứ phải vận hành thêm | không | không | backend + session store | BFF + session store + proxy mọi API call |

Hàng "Dùng được sau khi tab đóng" đổi theo **loại token còn nằm trong trình duyệt**, không theo chỗ cất. Hàng "Dùng ké session khi tab mở" thì cột nào cũng ✓: không kiến trúc nào chữa được XSS đang chạy.

> **Nguồn.** RT chỉ đi tới authorization server: *"Unlike access tokens, refresh tokens are intended for use only with authorization servers and are never sent to resource servers."* ([rfc6749](https://www.rfc-editor.org/rfc/rfc6749)). Đây là lý do BFF và token-mediating backend giữ được RT hoàn toàn phía server: không request nào từ trình duyệt cần tới RT.

---

## 4. Lab

Phần Keycloak dùng lab #1 (Keycloak 26.8.1 `start-dev`, cổng 8080, realm `demo`). Output ở 4.2 là flow authorization code + PKCE của client `spa`; BFF nhận đúng response đó, chỉ khác là nó đổi code kèm secret. Lệnh ở 4.1 và code BFF ở 4.3 đã chạy thật: Spring Boot 3.5.16 / Spring Security 6.5.11, đi trọn login → `/bff/orders` → logout bằng `curl` với cookie jar. Lần chạy đó dùng cổng Keycloak 5600, BFF 5580, API 5581; bài giữ cổng 8080/8081/8380 cho khớp các bài khác, ngoài cổng không khác dòng nào.

### 4.1 Tạo client `bff`

```bash
kc create clients -r demo -s clientId=bff -s publicClient=false \
   -s standardFlowEnabled=true -s directAccessGrantsEnabled=false -s secret=bff-secret-123 \
   -s 'redirectUris=["http://localhost:8081/login/oauth2/code/keycloak"]' \
   -s 'attributes={"pkce.code.challenge.method":"S256","post.logout.redirect.uris":"http://localhost:8081/"}' -i
```

Làm gì và vì sao, từng dòng:

- `publicClient=false`: chặn bước 5 ở 3.1, đổi code phải có secret.
- Không `webOrigins`: trình duyệt chỉ đi qua `/auth` bằng redirect toàn trang, không bao giờ `fetch` token endpoint như `spa`.
- `redirectUris`: đường dẫn mặc định của `oauth2Login()`, khớp chính xác chuỗi (bài 7).
- `pkce.code.challenge.method=S256`: RFC 9700 khuyến nghị PKCE cả cho confidential client. Để trống thì Keycloak không bắt PKCE (lab: client public `spa-nopkce` đổi code không cần PKCE); đặt S256 thì request thiếu PKCE bị từ chối (4.3).

> **Nguồn.** *"For confidential clients, the use of PKCE [RFC7636] is RECOMMENDED"* ([rfc9700](https://www.rfc-editor.org/rfc/rfc9700)). PKCE method để trống: *"Keycloak does not apply PKCE unless the client sends the appropriate PKCE parameters to Keycloak authorization endpoint."* ([capability-config](https://www.keycloak.org/docs/latest/server_admin/index.html#capability-config)).

### 4.2 Đọc code flow và token response

Redirect sau khi login (lab, client `spa`, rút gọn phần đuôi code):

```
redirect: http://localhost:3000/callback?state=st123&session_state=x9Q3sH6xPnOTxMbs06KWDphd
          &iss=http%3A%2F%2Flocalhost%3A8080%2Frealms%2Fdemo&code=fe162dc5-f550-9aab-4f00-d92e63618ef6.x9Q3sH6xPnOTxMbs06KWDphd.0775a4de-...
code_len = 98   (dạng <uuid>.<session id>.<client uuid>)
```

Ở BFF, `redirect_uri` trỏ vào chính BFF nên code đi thẳng vào backend, JS không chạm tới. Code sống 60 giây và chỉ đổi được một lần (lab: dùng lại trả `invalid_grant` "Code not valid").

Token response mà BFF nhận (lab):

```json
{"expires_in":300,"refresh_expires_in":1800,"token_type":"Bearer","not-before-policy":0,
 "session_state":"x9Q3sH6xPnOTxMbs06KWDphd","scope":"openid profile email",
 "access_token":"eyJ...","refresh_token":"eyJ...","id_token":"eyJ..."}
```

Trong BFF, `access_token` chỉ đi kèm request chuyển tiếp tới API, `refresh_token` dùng khi AT hết hạn, `id_token` cho BFF biết user là ai và được giữ làm `id_token_hint` khi logout (đáp án #3). Không token nào ra khỏi BFF.

> **Đo trên lab.** Kích thước token của flow này: access token 1.381 byte, ID token 1.073 byte, refresh token 676 byte (JWT ký HS512, `aud` là chính realm, chỉ Keycloak verify được). Tổng 3.130 byte mỗi session. Đo lại: `jq -r .access_token tok_pkce.json | tr -d '\n' | wc -c`, tương tự cho hai token còn lại.

### 4.3 BFF tối giản bằng Spring Boot

Dependency: `spring-boot-starter-web` và `spring-boot-starter-oauth2-client`. Cấu hình:

```yaml
server:
  port: 8081
  servlet.session.cookie: { http-only: true, secure: true, same-site: lax }
spring.security.oauth2.client:
  registration.keycloak:
    client-id: bff
    client-secret: ${BFF_SECRET}
    authorization-grant-type: authorization_code
    scope: openid,profile,email
  provider.keycloak:
    issuer-uri: http://localhost:8080/realms/demo
```

`issuer-uri` cho Spring đọc discovery tìm các endpoint, và phải khớp `iss` của ID token. Khác resource server ở bài 12, oauth2-client gọi discovery **ngay lúc khởi động** (lab: `GET .../.well-known/openid-configuration` trên thread `main`, trước dòng `Started`). Chạy trên `http://localhost` thì tắt `secure`.

```java
// Bỏ: import, class @Configuration.
@Bean
SecurityFilterChain bff(HttpSecurity http, ClientRegistrationRepository repo) throws Exception {
    var resolver = new DefaultOAuth2AuthorizationRequestResolver(repo, "/oauth2/authorization");
    resolver.setAuthorizationRequestCustomizer(OAuth2AuthorizationRequestCustomizers.withPkce()); // bắt S256
    var logout = new OidcClientInitiatedLogoutSuccessHandler(repo);
    logout.setPostLogoutRedirectUri("{baseUrl}/");
    http
        .authorizeHttpRequests(a -> a.requestMatchers("/", "/assets/**").permitAll()
                                     .anyRequest().authenticated())
        .oauth2Login(o -> o.authorizationEndpoint(e -> e.authorizationRequestResolver(resolver)))
        .logout(l -> l.logoutSuccessHandler(logout))
        .csrf(c -> c.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                    .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()));
    return http.build();
}
```

Ba dòng quyết định:

- `withPkce()`: buộc Spring gửi `code_challenge` S256. Bỏ dòng này (đã chạy thử) thì Spring 6.5.11 gửi `/auth` không có PKCE, và Keycloak trả về callback `error_description=Missing+parameter%3A+code_challenge_method`.
- `OidcClientInitiatedLogoutSuccessHandler`: sau khi xoá session BFF, redirect trình duyệt tới `end_session_endpoint` kèm `id_token_hint` và `post_logout_redirect_uri`. Đây là phần chặn đáp án #3.
- CSRF: cookie `XSRF-TOKEN` không `HttpOnly` để JS đọc rồi gửi lại qua header `X-XSRF-TOKEN`; cookie session vẫn `HttpOnly`.

Thiếu dòng `csrfTokenRequestHandler` (bản hay được chép nhất) thì SPA không POST được gì, vì hai lý do nối nhau. Spring 6.x nạp CSRF token lười: sau login, `GET /bff/orders` không đặt cookie `XSRF-TOKEN`; cookie chỉ xuất hiện trong response **403** của POST đầu tiên. Rồi handler mặc định `XorCsrfTokenRequestAttributeHandler` chờ token đã trộn ngẫu nhiên, nên gửi nguyên giá trị cookie vào header vẫn `403`, log `Invalid CSRF token found for http://localhost:5580/logout`. Bản tối thiểu chạy được: dòng handler (so header với đúng giá trị cookie) cộng một endpoint SPA gọi một lần sau khi tải trang:

```java
@GetMapping("/bff/csrf")   // getToken() buộc Spring sinh token và ghi cookie XSRF-TOKEN
Map<String, String> csrf(CsrfToken token) {
    return Map.of("headerName", token.getHeaderName(), "token", token.getToken());
}
```

Proxy tới API (resource server sẽ dựng ở bài 12):

```java
@RestController
class OrdersProxy {
    private final RestClient api = RestClient.create("http://localhost:8380");

    @GetMapping("/bff/orders")
    String orders(@RegisteredOAuth2AuthorizedClient("keycloak") OAuth2AuthorizedClient client) {
        // AT lấy từ kho authorized client phía server
        return api.get().uri("/api/orders")
            .header("Authorization", "Bearer " + client.getAccessToken().getTokenValue())
            .retrieve().body(String.class);
    }
}
```

Ba hành vi mặc định của Spring, đo với `access.token.lifespan` của `bff` là 90 rồi 60 giây:

> **Đo trên lab (critic, 26.8.1).** Spring Boot 3.5.16 / Spring Security 6.5.11, Java 24, máy dev Apple M-series; mốc giây chỉ đúng bậc độ lớn.
> (1) **Tự refresh, sớm 60 s.** AT 90 s: gọi `/bff/orders` ở +10 s, +25 s sau login không refresh, ở +35 s refresh một lần. AT 60 s: request ở +2 s, +5 s, +10 s, **mỗi request một** `grant_type=refresh_token`. Spring coi AT hết hạn khi còn dưới 60 s (clock skew mặc định), nên AT 60 s luôn "hết hạn".
> (2) **Token trong RAM của instance, không trong `HttpSession`.** Bean mặc định: `AuthenticatedPrincipalOAuth2AuthorizedClientRepository` bọc `InMemoryOAuth2AuthorizedClientService`, khoá theo principal (`sub`). Hệ quả: alice login hai phiên A và B, B logout; Keycloak còn session A, nhưng `/bff/orders` của A trả **500**, vì kho đang giữ RT của B.
> (3) **`invalid_grant` ra 500.** Xoá session của alice trong Keycloak rồi gọi `/bff/orders`: `500`, log `ClientAuthorizationException: [invalid_grant] Session not active`. Request kế tiếp nhận `302` tới `/auth` với `redirect_uri=http://localhost:5580/authorize/oauth2/code/keycloak`, đường dẫn chưa đăng ký ở 4.1, nên Keycloak trả `400 Invalid parameter: redirect_uri`.
> Code và lệnh đo: `~/projects/keycloak-lab/critic-ch3a/` (`login.sh`, `logout.sh`, `refresh-test.sh`).

> **Suy luận.** Từ (2) và (3), BFF production còn thiếu: kho authorized client theo session dùng chung giữa các instance (`HttpSessionOAuth2AuthorizedClientRepository` trên session store chung), và handler bắt `ClientAuthorizationException` trả `401` để SPA tự đi `/oauth2/authorization/keycloak`. Chưa chạy trên lab.

### 4.4 Kiểm điều bảng 3.5 nói

Cookie jar sau login: `/bff/orders` trả `[{"owner":"alice","total":42.5,"id":1001}]`; `JSESSIONID` có cờ `HttpOnly`, `XSRF-TOKEN` thì không, không token OAuth nào tới trình duyệt. Script trong trang làm được đúng việc SPA làm (gọi `/bff/csrf`, gửi header): "dùng ké session" của bảng. Logout: `POST /logout` kèm header trả `302` tới `end_session_endpoint` có `id_token_hint`; Keycloak redirect thẳng về `http://localhost:5580/`, không hỏi xác nhận, và vào lại `/bff/orders` thì hiện form login: đáp án #3 đã bị chặn.

---

## 5. Tính tay

### 5.1 Dòng thời gian của refresh token bị lấy

Kiến trúc 1, realm mặc định, persistent user sessions bật (mặc định 26.x, không có cửa sổ cộng thêm 2 phút). User login 09:00:00. Lần refresh cuối do SPA của user gửi: 09:17:00. Script lấy RT lúc 09:05:00. User đóng tab 09:20:00.

**Câu a.** Kẻ tấn công refresh mỗi 25 phút bắt đầu từ 09:30:00. Khi nào chuỗi đứt?

Mỗi lần refresh reset idle, 25 phút = 1500 s < 1800 s, nên idle không bao giờ hết. Chuỗi chỉ đứt ở SSO Session Max: 09:00:00 + 36000 s = **19:00:00**. Cửa sổ sau khi đóng tab: 19:00:00 − 09:20:00 = 34800 s, tức 9 giờ 40 phút.

**Câu b.** Kẻ tấn công lười, thử refresh lần đầu lúc 09:52:00. Kết quả?

Idle tính từ lần refresh cuối của **bất kỳ ai** trong session: 09:17:00 + 1800 s = 09:47:00. 09:52:00 > 09:47:00, nên `invalid_grant`. Điều này đúng cả với RT kẻ tấn công lấy lúc 09:05, vì từ 26.8.0 hạn RT bị chặn bởi session idle.

**Câu c.** Cùng câu a, nhưng kiến trúc 2. Script chạy 14:04:00, đọc AT có `iat` 14:02:10 rồi gọi `/token` của backend lấy AT mới. User đóng tab 14:05:00.

AT cũ hết hạn 14:07:10. AT mới hết hạn 14:04:00 + 300 s = 14:09:00. Sau 14:05:00, kẻ tấn công còn **240 s**. So với câu a: 34800 / 300 = 116 lần cận trên của kiến trúc 2.

### 5.2 AT 60 giây có đáng không

Tech lead đề xuất giảm AT từ 300 xuống 60 giây. Với 1.000 user dùng liên tục 8 giờ mỗi ngày, mỗi user refresh một lần mỗi khi AT hết hạn.

- AT 300 s: 8 × 3600 / 300 = 96 lần refresh mỗi user mỗi ngày, 96.000 lần với 1.000 user.
- AT 60 s: 8 × 3600 / 60 = 480 lần, 480.000 lần.

Thêm 384.000 request mỗi ngày lên token endpoint. Lợi ích: ở kiến trúc 1 gần như không có (RT vẫn cho 9 giờ 40 phút ở 5.1a). Ở kiến trúc 2, cửa sổ sau khi đóng tab, và ở mọi kiến trúc, cửa sổ sau khi revoke quyền (resource server verify offline), giảm từ 300 xuống 60 giây. Kết luận: giảm AT chỉ đáng làm **sau khi** đã đưa RT ra khỏi trình duyệt.

Cận này giả định client refresh đúng lúc AT hết hạn. BFF Spring mặc định thì không: nó refresh khi AT còn dưới 60 s (đo (1) ở 4.3), nên với AT 60 s **mỗi request API** kéo theo một refresh. User gửi 1 request mỗi 10 s suốt 8 giờ: 8 × 3600 / 10 = 2.880 refresh mỗi ngày, 2.880.000 với 1.000 user, gấp 6 lần cận 480.000. Đi AT 60 s với Spring BFF thì phải hạ clock skew của refresh provider trước (chưa chạy trên lab).

### 5.3 Session store của BFF

Mỗi session giữ ba token từ 4.2: 1.381 + 1.073 + 676 = 3.130 byte. Cao điểm có 20.000 session sống.

20.000 × 3.130 = 62.600.000 byte ≈ 62,6 MB (59,7 MiB) **chỉ riêng token**, chưa tính key, metadata và serialize. Con số nhỏ; cái khó là 3 instance BFF phải thấy cùng một bản, mà mặc định Spring giữ token trong RAM từng instance (đo (2) ở 4.3).

Bỏ `id_token` sau khi login để tiết kiệm 1.073 byte (34,3%)? Được, nhưng mất `id_token_hint` cho RP-Initiated Logout, và Keycloak có thể hiện trang hỏi xác nhận logout: đổi 34% bộ nhớ lấy một màn hình thừa mỗi lần logout.

---

## 6. Chuyển giao

1. App kiến trúc 1 bật Revoke Refresh Token. Support báo "user bị đăng xuất ngẫu nhiên, nhất là khi mở hai tab". Giải thích bằng cơ chế (hai tab, một RT, ai refresh trước), và điều đó nói gì về khả năng rotation phát hiện kẻ trộm.
2. BFF đặt timeout session của nó 8 giờ, realm để SSO Session Max 10 giờ. User login 08:00, để tab mở cả ngày. Lúc 17:00 và lúc 18:30, `/bff/orders` trả gì, và BFF nên làm gì ở mỗi mốc?
3. Đội mobile muốn dùng lại client `spa` (public) cho app native. Vì sao bảng 3.5 không áp nguyên cho app native, và đường XSS "xin token mới" ở 3.1 biến thành tấn công gì trên điện thoại?
4. Trang có BFF nhúng widget từ CDN bên thứ ba, và widget bị chiếm. So với kịch bản XSS trong bài, kẻ tấn công có thêm gì không?
5. **Câu khó nhất.** Thay vì BFF, đội đề xuất giữ kiến trúc 1 nhưng bật DPoP (supported từ 26.4.0): SPA sinh cặp khoá WebCrypto `extractable: false`, mọi AT và RT bị ràng buộc với khoá đó qua claim `cnf`. XSS đọc được token nhưng không xuất được private key. Lập lại hàng "Mang ra ngoài được", "Dùng được sau khi tab đóng" và "Dùng ké session khi tab mở" của bảng 3.5 cho kiến trúc này. Lưu ý Keycloak docs nói với **confidential** client, *"Keycloak binds only the access token to the DPoP key, relying on the client credentials to secure the refresh token."* Với public client thì sao, và đường "tự chạy flow với PKCE riêng" của 3.1 có bị DPoP chặn không?

---

## 7. Tóm tắt

- Client JS là public client, đổi code chỉ cần code + `code_verifier`. PKCE chặn kẻ chặn code giữa đường, không chặn script chạy trong origin của SPA: script đó tự sinh verifier và tự chạy flow nhờ cookie SSO. Chuyển token sang bộ nhớ chỉ bịt đường "đọc token đang có".
- Ở kiến trúc 1, refresh token quyết định thiệt hại: mỗi lần refresh reset SSO Session Idle (1800 s), nên RT bị lấy sống tới SSO Session Max (36000 s từ login). Realm mặc định không thu hồi RT cũ (lab), user không có tín hiệu bị lộ.
- Token-mediating backend: XSS mang đi một AT, dùng tối đa 300 s sau khi đóng tab. BFF: không token nào xuống trình duyệt, XSS chỉ dùng ké session khi tab mở. BFF đổi loại thiệt hại, không chữa XSS.
- BFF đưa CSRF quay lại. Spring 6.5 với `CookieCsrfTokenRepository` thôi thì SPA nhận 403: cookie chỉ sinh khi token được nạp, và handler XOR từ chối giá trị cookie thô. Cần `CsrfTokenRequestAttributeHandler` + một endpoint nạp token (lab).
- Spring BFF mặc định refresh khi AT còn dưới 60 s (AT 60 s = refresh mỗi request), giữ AT + RT trong RAM của instance theo principal, và trả 500 khi refresh nhận `invalid_grant` (lab). Session store: ~3.130 byte token mỗi session, 20.000 session ≈ 62,6 MB.
- Logout BFF phải tới `end_session_endpoint` kèm `id_token_hint`; xoá session BFF thôi thì SSO session ở Keycloak vẫn sống. AT đã phát vẫn qua resource server verify offline tới 300 s (lab).

→ **Bài 12 — Spring Boot làm resource server**: dựng phía nhận Bearer token mà BFF chuyển tiếp tới, với `issuer-uri`, JWKS cache, map `realm_access.roles` thành authority, và phân biệt 401 với 403.
