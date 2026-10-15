# Bài 1 — IdP giải bài toán gì

## 1. Mục tiêu

Sau bài này bạn có thể:

- Đếm bề mặt identity của một hệ N app (chỗ giữ hash, màn MFA, nơi phải khoá khi nhân viên nghỉ) và chỉ ra con số nào co về 1 khi có IdP, con số nào vẫn là N.
- Gán đúng bốn vai OAuth cho từng lượt tương tác, kể cả khi một thành phần đóng hai vai.
- Phân biệt authentication, authorization, federation bằng câu hỏi mỗi cái trả lời và hiện vật nó sinh ra.
- Tính cửa sổ thời gian một phiên đã logout ở IdP vẫn gọi được API, theo cách API kiểm token.
- Dựng Keycloak 26.8.1 dev mode, tạo realm bằng `kcadm.sh`, đọc discovery document và nói endpoint nào phục vụ vai nào.
- Liệt kê việc vận hành chuyển sang tay mình khi tự host Keycloak thay vì dùng dịch vụ managed.

---

## 2. Triệu chứng

Một SaaS B2B có năm app nội bộ: admin panel, CRM, billing, ticket support, và một dashboard báo cáo team data tự viết bằng Flask. Mỗi app có bảng `users`, form login và cách băm mật khẩu riêng.

Thứ Sáu 18:00, một nhân viên support nghỉ việc. Checklist offboarding có năm dòng "vào app X, disable tài khoản Y", và được tick đủ.

Thứ Hai, log của dashboard báo cáo có request từ tài khoản đó lúc 21:14 thứ Sáu, tải về file CSV doanh thu theo khách hàng. Điều tra ra hai chuyện:

- Dashboard không có nút disable. Người làm checklist "disable" bằng cách đổi mật khẩu.
- Dashboard dùng cookie "remember me" sống 30 ngày. Đổi mật khẩu không huỷ cookie đã phát.

Cùng tháng, audit yêu cầu MFA cho mọi app có quyền quản trị: hai trên năm app có, mỗi app một kiểu. Trưởng nhóm đề xuất dựng Keycloak, năm app chỉ nhận token. Bạn được giao ước lượng việc này đổi được gì và không đổi được gì.

---

## ⏸ Dừng lại — đoán trước #1

Sau khi năm app chuyển sang nhận token từ một IdP, trong bốn hạng mục dưới đây, **hạng mục nào vẫn còn năm chỗ phải cài và bảo trì?**

```
(a) Nơi lưu hash mật khẩu và tham số băm
(b) Màn hình đăng ký và nhập mã MFA
(c) Logic "user này có được xuất CSV doanh thu không"
(d) Không còn hạng mục nào, mọi thứ về user đã nằm ở IdP
```

Chọn trước khi đọc mục 3.1.

---

## 3. Lý thuyết

### 3.1 Phép đếm: N app tự giữ identity

Đáp án là **(c)**. Để thấy vì sao, đếm thứ mà một app tự làm login phải tự làm. Không tính giao diện, chỉ tính chức năng mà sai một cái là thành lỗ:

| # | Chức năng identity | Sai một chỗ thì thành lỗ gì | Bài sâu |
|---|---|---|---|
| 1 | Lưu credential (hash + tham số băm) | lộ database là lộ mật khẩu | 20 |
| 2 | Chống đoán mật khẩu | credential stuffing không bị chặn | 20 |
| 3 | MFA | app quản trị chỉ còn một lớp mật khẩu | 19 |
| 4 | Đặt lại mật khẩu | link reset đoán được hoặc không hết hạn | — |
| 5 | Khoá tài khoản, huỷ phiên | người đã nghỉ vẫn vào được (triệu chứng ở mục 2) | 10, 14 |
| 6 | Audit đăng nhập | không biết ai vào lúc 21:14 | 28 |

Sáu chức năng nhân năm app là **30 chỗ cài đặt**, mỗi chỗ có tham số riêng. Năm app cũng là năm database có cột hash; người dùng đặt cùng một mật khẩu cho cả năm thì database yếu nhất quyết định độ an toàn của cả năm.

Giờ bản sai đầu tiên, và nó nghe rất hợp lý: *"Không cần IdP, mỗi app dùng thư viện auth chuẩn là đủ an toàn."* Thư viện cho bạn hàm băm, không cho những thứ nằm giữa các hàm. Một ví dụ lab đo được: với username **không tồn tại**, password grant của Keycloak vẫn tốn p50 13,11 ms, ngang ca sai mật khẩu 13,40 ms (dev mode, localhost, bậc độ lớn), tức nó không trả lỗi sớm. Form tự viết có nhánh `if user is None: return 401` trả lỗi gần như tức thì, và kẻ đo thời gian phản hồi liệt kê được email nào là nhân viên thật. Thư viện băm không chặn được lỗi nằm ở nhánh do dev tự viết. Bài 20 mổ chi phí băm và chống đoán.

Hash, MFA, brute force, reset, audit đều co về một chỗ. Nhưng (c), câu hỏi "user này có được xuất CSV doanh thu không", phụ thuộc vào dữ liệu và nghiệp vụ của dashboard. IdP có thể mang theo role trong token (bài 8), nhưng quyết định cuối cùng "role này + tài nguyên này + hành động này thì cho phép" vẫn chạy trong từng app. Đó là phần BOLA/BFLA bạn đã học ở `security/sec-05-authn-authz.md`, và nó không di chuyển.

Phép đếm còn một bẫy: Keycloak **có** đủ sáu chức năng, nhưng realm mới tạo trên lab đọc ra `bruteForceProtected: false`, `passwordPolicy: null` (mọi chuỗi đều là mật khẩu hợp lệ), `eventsEnabled: false`. Gom về IdP cho bạn **một chỗ để bật**, không cho bạn trạng thái đã bật.

<svg viewBox="0 0 720 300" role="img" aria-labelledby="kc1-a-t kc1-a-d" style="width:100%;height:auto">
<title id="kc1-a-t">Năm app tự giữ identity so với năm app dùng chung một IdP</title>
<desc id="kc1-a-d">Bên trái, năm app mỗi app tự cài sáu chức năng identity, tổng ba mươi chỗ. Bên phải, sáu chức năng nằm ở Keycloak một lần, năm app chỉ còn kiểm token và tự phân quyền.</desc>
<text x="180" y="22" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">Trước: mỗi app tự làm login</text>
<rect x="20" y="40" width="320" height="32" rx="6" fill="#ef4444" fill-opacity="0.18"/>
<text x="180" y="60" text-anchor="middle" font-size="11" fill="currentColor">Admin: 6 chức năng identity + phân quyền</text>
<rect x="20" y="80" width="320" height="32" rx="6" fill="#ef4444" fill-opacity="0.18"/>
<text x="180" y="100" text-anchor="middle" font-size="11" fill="currentColor">CRM: 6 chức năng identity + phân quyền</text>
<rect x="20" y="120" width="320" height="32" rx="6" fill="#ef4444" fill-opacity="0.18"/>
<text x="180" y="140" text-anchor="middle" font-size="11" fill="currentColor">Billing: 6 chức năng identity + phân quyền</text>
<rect x="20" y="160" width="320" height="32" rx="6" fill="#ef4444" fill-opacity="0.18"/>
<text x="180" y="180" text-anchor="middle" font-size="11" fill="currentColor">Ticket: 6 chức năng identity + phân quyền</text>
<rect x="20" y="200" width="320" height="32" rx="6" fill="#ef4444" fill-opacity="0.18"/>
<text x="180" y="220" text-anchor="middle" font-size="11" fill="currentColor">Dashboard: 6 chức năng identity + phân quyền</text>
<text x="180" y="262" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">5 x 6 = 30 chỗ cài identity</text>
<text x="180" y="282" text-anchor="middle" font-size="11" fill="currentColor">phân quyền: 5 chỗ</text>
<line x1="360" y1="30" x2="360" y2="290" stroke="currentColor" stroke-opacity="0.25" stroke-width="1"/>
<text x="540" y="22" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">Sau: một IdP</text>
<rect x="400" y="40" width="280" height="52" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="540" y="62" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">Keycloak (realm của công ty)</text>
<text x="540" y="80" text-anchor="middle" font-size="11" fill="currentColor">hash, brute force, MFA, reset, khoá, audit</text>
<line x1="540" y1="92" x2="540" y2="118" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<line x1="420" y1="118" x2="660" y2="118" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<rect x="380" y="130" width="140" height="30" rx="6" fill="#84cc16" fill-opacity="0.22"/>
<text x="450" y="149" text-anchor="middle" font-size="10" fill="currentColor">Admin: token + quyền</text>
<rect x="560" y="130" width="140" height="30" rx="6" fill="#84cc16" fill-opacity="0.22"/>
<text x="630" y="149" text-anchor="middle" font-size="10" fill="currentColor">CRM: token + quyền</text>
<rect x="380" y="168" width="140" height="30" rx="6" fill="#84cc16" fill-opacity="0.22"/>
<text x="450" y="187" text-anchor="middle" font-size="10" fill="currentColor">Billing: token + quyền</text>
<rect x="560" y="168" width="140" height="30" rx="6" fill="#84cc16" fill-opacity="0.22"/>
<text x="630" y="187" text-anchor="middle" font-size="10" fill="currentColor">Ticket: token + quyền</text>
<rect x="455" y="206" width="170" height="30" rx="6" fill="#84cc16" fill-opacity="0.22"/>
<text x="540" y="225" text-anchor="middle" font-size="10" fill="currentColor">Dashboard: token + quyền</text>
<text x="540" y="262" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">6 chỗ ở IdP + 5 chỗ kiểm token</text>
<text x="540" y="282" text-anchor="middle" font-size="11" fill="currentColor">phân quyền: vẫn 5 chỗ</text>
</svg>

> **Suy luận.** Phép đếm 30 → 6 + 5 là mô hình của bài, không phải số liệu từ nguồn. Nó dựa trên hai dữ kiện lab: realm Keycloak có tham số cho đủ sáu chức năng (đọc qua `kc get realms/demo`), và app nhận token chỉ còn kiểm chữ ký, `iss`, `aud`, `exp` (bài 4). Năm chỗ kiểm token vẫn cấu hình sai được, nhưng đó là cấu hình thư viện resource server, không phải viết lại luồng đăng nhập. **Kiểm bằng:** liệt kê mọi cột chứa hash trong năm database trước và sau khi chuyển.

### 3.2 Tách identity khỏi app: cái gì chuyển đi đâu

"Tách identity khỏi app" nghĩa cụ thể là: **app không còn nhìn thấy mật khẩu**. Form login, hash, MFA chuyển sang máy chủ khác; app chỉ nhận một chuỗi đã ký nói "đây là user X, đăng nhập lúc T, phiên S". Cái giá: đăng nhập không còn là một `POST /login` tới app mà là một chuỗi request qua ba bên. Bài 2 mổ từng tham số; ở đây chỉ cần thấy **ai nói chuyện với ai**.

<svg viewBox="0 0 720 370" role="img" aria-labelledby="kc1-b-t kc1-b-d" style="width:100%;height:auto">
<title id="kc1-b-t">Bốn vai trò OAuth trong một lần đăng nhập và gọi API</title>
<desc id="kc1-b-d">Sơ đồ tuần tự bốn cột: người dùng với trình duyệt, app web, Keycloak, API. Trình duyệt được đẩy sang Keycloak để nhập mật khẩu, quay về app với code, app đổi code lấy token qua kênh trực tiếp, rồi gọi API bằng access token; API lấy khoá công khai từ Keycloak để kiểm chữ ký.</desc>
<defs>
<marker id="kc1-b-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker>
</defs>
<rect x="20" y="14" width="140" height="44" rx="8" fill="#f59e0b" fill-opacity="0.25"/>
<text x="90" y="32" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">Resource owner</text>
<text x="90" y="48" text-anchor="middle" font-size="10" fill="currentColor">người dùng + trình duyệt</text>
<rect x="200" y="14" width="140" height="44" rx="8" fill="#84cc16" fill-opacity="0.25"/>
<text x="270" y="32" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">Client</text>
<text x="270" y="48" text-anchor="middle" font-size="10" fill="currentColor">app web (dashboard)</text>
<rect x="380" y="14" width="140" height="44" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="450" y="32" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">Authorization server</text>
<text x="450" y="48" text-anchor="middle" font-size="10" fill="currentColor">Keycloak, realm demo</text>
<rect x="560" y="14" width="140" height="44" rx="8" fill="#8b5cf6" fill-opacity="0.25"/>
<text x="630" y="32" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">Resource server</text>
<text x="630" y="48" text-anchor="middle" font-size="10" fill="currentColor">API báo cáo</text>
<line x1="90" y1="58" x2="90" y2="355" stroke="currentColor" stroke-opacity="0.3" stroke-width="1"/>
<line x1="270" y1="58" x2="270" y2="355" stroke="currentColor" stroke-opacity="0.3" stroke-width="1"/>
<line x1="450" y1="58" x2="450" y2="355" stroke="currentColor" stroke-opacity="0.3" stroke-width="1"/>
<line x1="630" y1="58" x2="630" y2="355" stroke="currentColor" stroke-opacity="0.3" stroke-width="1"/>
<text x="180" y="84" text-anchor="middle" font-size="10" fill="currentColor">1. mở dashboard, chưa đăng nhập</text>
<line x1="90" y1="92" x2="268" y2="92" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc1-b-arrow)"/>
<text x="180" y="116" text-anchor="middle" font-size="10" fill="currentColor">2. app trả 302, đẩy sang Keycloak</text>
<line x1="270" y1="124" x2="92" y2="124" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc1-b-arrow)"/>
<text x="270" y="148" text-anchor="middle" font-size="10" fill="currentColor">3. GET /auth, nhập mật khẩu + MFA (chỉ ở đây)</text>
<line x1="90" y1="156" x2="448" y2="156" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc1-b-arrow)"/>
<text x="270" y="180" text-anchor="middle" font-size="10" fill="currentColor">4. 302 về redirect_uri kèm code, qua trình duyệt</text>
<line x1="450" y1="188" x2="92" y2="188" stroke="#f59e0b" stroke-opacity="0.9" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#kc1-b-arrow)"/>
<line x1="90" y1="200" x2="268" y2="200" stroke="#f59e0b" stroke-opacity="0.9" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#kc1-b-arrow)"/>
<text x="360" y="226" text-anchor="middle" font-size="10" fill="currentColor">5. POST /token đổi code (kênh trực tiếp)</text>
<line x1="270" y1="234" x2="448" y2="234" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc1-b-arrow)"/>
<text x="360" y="258" text-anchor="middle" font-size="10" fill="currentColor">6. access_token + id_token</text>
<line x1="450" y1="266" x2="272" y2="266" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc1-b-arrow)"/>
<text x="450" y="292" text-anchor="middle" font-size="10" fill="currentColor">7. GET /reports, header Authorization: Bearer AT</text>
<line x1="270" y1="300" x2="628" y2="300" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc1-b-arrow)"/>
<text x="540" y="326" text-anchor="middle" font-size="10" fill="currentColor">8. lấy JWKS (cache) để kiểm chữ ký</text>
<line x1="630" y1="334" x2="452" y2="334" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc1-b-arrow)"/>
</svg>

Ba điều đọc được từ sơ đồ, và cả ba sẽ quay lại suốt course:

- **Mật khẩu chỉ đi trên mũi tên 3**, từ trình duyệt tới Keycloak. App (cột 2) và API (cột 4) không bao giờ thấy nó. Đây là lý do số chỗ giữ hash về 1.
- **Mũi tên 4 đi vòng qua trình duyệt** (nét đứt), nên thứ nó mang nằm trong URL, lịch sử, log proxy. Vì thế nó chỉ mang `code` dùng một lần; token đi ở mũi tên 5–6, kênh trực tiếp. Bài 2 mổ các lớp chặn quanh `code`.
- **Mũi tên 8 không có user nào tham gia**: API tự tải khoá công khai rồi tự kiểm chữ ký, Keycloak không biết API vừa nhận token nào. Chi tiết này quyết định chuyện revoke ở mục 3.5.

### 3.3 Bốn vai trò OAuth: vai là theo lượt, không theo hộp

OAuth 2.0 đặt tên cho bốn vai. **Resource owner**: người có quyền cho phép truy cập tài nguyên, thường là người dùng cuối. **Client**: ứng dụng truy cập tài nguyên thay mặt resource owner; "client" không có nghĩa là frontend, một server Spring Boot cũng là client. **Authorization server (AS)**: xác thực resource owner và phát token. **Resource server (RS)**: giữ tài nguyên, nhận token, quyết định trả dữ liệu hay không.

Bản sai phổ biến là gắn vai cho từng hộp một lần rồi thôi: "Keycloak là AS, Spring là RS, React là client". Đúng ở sơ đồ 3.2, sai ngay ở tương tác khác. Vai thuộc về **một lượt tương tác**, không thuộc về một máy. Ba ca trong chính Keycloak:

**Keycloak là resource server.** Userinfo endpoint của Keycloak nhận access token và trả thông tin user. Spec OIDC gọi nó là *"The UserInfo Endpoint is an OAuth 2.0 Protected Resource that returns Claims about the authenticated End-User."* Trong lượt gọi `/userinfo`, Keycloak vừa là AS đã phát token vừa là RS kiểm token đó. Lab đo được hệ quả: sau khi logout, `/userinfo` trả 401 `user_session_not_found` vì RS này nhìn được session phía server, điều mà API ở cột 4 không làm được.

**Client là resource owner của chính nó.** Khi một job đối soát billing gọi API báo cáo lúc 2 giờ sáng, không có người dùng nào: job xin token nhân danh chính nó bằng grant client credentials, và token response trên lab không có `id_token` vì không có người dùng nào để chứng minh danh tính. Bài 2 mổ grant này.

**Keycloak là client.** Khi realm cho phép "Đăng nhập bằng Google", trong lượt Keycloak chuyển người dùng sang Google, Google là AS và Keycloak là client của Google. Mục 3.4 quay lại ca này.

Tách AS và RS có hệ quả ngay trong spec: có token chỉ được gửi cho AS. RFC 6749 viết *"Unlike access tokens, refresh tokens are intended for use only with authorization servers and are never sent to resource servers."* Bài 3 cho thấy Keycloak cài luật này bằng cách chọn khoá ký.

> **Nguồn.** UserInfo là protected resource ([openid-connect-core-1_0](https://openid.net/specs/openid-connect-core-1_0.html)); refresh token chỉ dành cho AS ([rfc6749](https://www.rfc-editor.org/rfc/rfc6749)). Định nghĩa bốn vai ở đầu mục là diễn đạt lại của bài, file nguồn không trích nguyên văn đoạn đó của RFC 6749.

---

## ⏸ Dừng lại — đoán trước #2

Realm của công ty bật "Đăng nhập bằng Google". Nhân viên bấm nút đó trên trang login của Keycloak, chọn tài khoản Google, quay về dashboard. **Dashboard nhận được token do ai phát, và dashboard cần biết gì về Google?**

```
(a) Token do Google phát; dashboard phải cấu hình JWKS của Google để kiểm chữ ký
(b) Token do Keycloak phát; dashboard không cần biết Google tồn tại
(c) Hai token: id_token của Google và access_token của Keycloak
(d) Token do Keycloak phát nhưng ký bằng khoá của Google
```

---

### 3.4 Authentication, authorization, federation: ba câu hỏi khác nhau

Đáp án là **(b)**. Để thấy vì sao, tách ba khái niệm theo câu hỏi mỗi cái trả lời.

**Authentication** trả lời *"người đang ngồi trước màn hình là ai?"*. Trong hệ có IdP, câu trả lời được đóng gói thành `id_token`, thứ OIDC thêm vào OAuth (bài 3). Người nhận `id_token` là chính client: lab decode được `id_token` có `"aud": "spa"`, đúng client vừa đăng nhập.

**Authorization** trả lời *"bên cầm token này được làm gì, ở đâu?"*. Nó có hai tầng, và nhầm hai tầng là gốc của rất nhiều thiết kế sai:

- Tầng **uỷ quyền** (OAuth): access token nói client này được phép gọi tài nguyên nào thay mặt user, trong phạm vi `scope` nào. Bài 2 sẽ phá bản sai "OAuth là để login".
- Tầng **phân quyền nghiệp vụ**: user này có được xuất CSV doanh thu của khách hàng này không. Tầng này ở app, như đã nói ở mục 3.1.

Hai loại token phục vụ hai câu hỏi, và Keycloak cố ý làm chúng khác nhau ở `aud`: cùng lần đăng nhập, lab thấy `id_token` có `"aud": "spa"` còn access token có `"aud": "account"`. Bài 3 giải thích vì sao khác, bài 9 giải thích vì sao là `account`.

**Federation** trả lời *"danh tính này gốc ở đâu, nếu không ở IdP của mình?"*. Từ ngữ của chính Keycloak dễ gây nhầm:

- **Identity brokering**: Keycloak đứng giữa app và một IdP khác (Google, Azure AD, một IdP SAML của khách hàng). Docs định nghĩa *"An Identity Broker is an intermediary service connecting service providers with identity providers."* Người dùng xác thực ở IdP ngoài, rồi *"At the end of the authentication process, Keycloak issues its token to client applications."* Đây là lý do đáp án là (b): dashboard chỉ biết Keycloak.
- Trong chính đoạn brokering, docs gọi bước Keycloak tạo user cục bộ từ thông tin IdP ngoài trả về là *"This behavior is identity federation."*
- **User Storage Federation** là cơ chế khác hẳn: Keycloak đọc user từ LDAP/Active Directory, mật khẩu kiểm tại LDAP. Bài 16.

| | Câu hỏi | Hiện vật | Ai tiêu thụ | Bài sâu |
|---|---|---|---|---|
| Authentication | ai đang đăng nhập | `id_token`, `aud` = client | chính client | 3 |
| Uỷ quyền (OAuth) | client được gọi gì thay user | `access_token`, `scope`, `aud` | resource server | 2, 4 |
| Phân quyền nghiệp vụ | user được làm gì với dữ liệu nào | không có hiện vật chuẩn | code trong app | sec-05, 21 |
| Brokering | danh tính gốc ở IdP nào | token của IdP ngoài dừng ở Keycloak, app nhận token Keycloak | Keycloak | 15 |
| User Storage Federation | user lưu ở kho nào | user LDAP được đọc/import | Keycloak | 16 |

Nguyên nhân gốc khiến ba khái niệm hay bị trộn: trong luồng "Sign in with Google" mà bạn từng gắn, cả ba xảy ra trong cùng một lần bấm nút. Google xác thực bạn (authentication), Google phát token cho app gọi API Google (uỷ quyền), và app tạo user cục bộ từ email Google (một dạng federation). Một nút, ba câu hỏi. Khi có Keycloak ở giữa, ba câu hỏi đó tách ra ba chỗ cấu hình khác nhau.

> **Nguồn.** Identity broker ([#_identity_broker](https://www.keycloak.org/docs/latest/server_admin/#_identity_broker), [#_identity_broker_overview](https://www.keycloak.org/docs/latest/server_admin/#_identity_broker_overview)).

---

## ⏸ Dừng lại — đoán trước #3

Năm app đã chuyển sang Keycloak. API báo cáo kiểm access token **cục bộ**: chữ ký bằng JWKS, `iss`, `aud`, `exp`. Access token sống 300 giây. Lúc 9:00:00, phiên của một nhân viên bị logout trên Keycloak. Token gần nhất của phiên đó được phát lúc 8:58:20.

**API báo cáo từ chối token đó từ lúc nào?**

```
(a) 9:00:00, ngay khi phiên bị logout
(b) Khi API tải lại JWKS lần tới
(c) 9:03:20
(d) Không bao giờ, cho tới khi khởi động lại API
```

---

### 3.5 Bản sai: "khoá ở IdP là khoá ở mọi nơi, ngay lập tức"

Câu này đúng một nửa. Sau khi phiên bị huỷ, không ai lấy được token **mới** cho phiên đó. Nhưng token **đã phát** vẫn là chuỗi đã ký, và RS kiểm nó cục bộ không hỏi Keycloak.

Đáp án là **(c)**. Cơ chế: access token Keycloak là JWS, tức chuỗi được ký chứ không phải con trỏ tới bản ghi trong database. RS kiểm bằng khoá công khai và đồng hồ của chính nó. Logout xoá session phía Keycloak, không đổi khoá ký, nên JWKS tải lại vẫn y hệt và (b) không đổi gì. Token chỉ chết ở `exp` = 8:58:20 + 300 s = 9:03:20; theo RFC 7519, JWT không được chấp nhận từ thời điểm `exp` trở đi.

> **Đo trên lab.** Keycloak 26.8.1 `start-dev`. Logout bằng `POST /logout` kèm refresh token: **HTTP 204**. Ngay sau đó: introspection `active:false`; `/userinfo` 401 `error_description="user_session_not_found"`; refresh `invalid_grant` "Session not active". Trong khi `exp - now` của access token vẫn còn **300 s**: RS chỉ kiểm chữ ký và `exp` offline vẫn nhận token này thêm tới 5 phút.

Muốn đóng cửa sổ 300 s đó, RS phải hỏi Keycloak mỗi lần, tức introspection. Docs nói thẳng cái giá: *"The downside to this approach is that you have to make a network invocation to the Keycloak server."* Lab đo ở bậc độ lớn: introspection p50 **0,59 ms** qua localhost, verify RS256 offline bằng Python thuần **124–134 µs**; qua mạng thật có TLS thì chưa đo. Bài 4 so hai cách.

Và cửa sổ 300 s chỉ là phần IdP chịu trách nhiệm. Nhìn lại triệu chứng: dashboard có cookie "remember me" 30 ngày của **riêng nó**. Nếu sau khi nhận token ở mũi tên 6, dashboard tự tạo session cookie sống 30 ngày và không bao giờ hỏi lại Keycloak, thì logout ở Keycloak không chạm tới cookie đó. Gom về IdP không xoá được session do app tự cấp. Bài 10 nói về lifetime, bài 14 nói cách IdP báo ngược cho app khi logout.

Offboarding thật thường không logout từng phiên mà **disable user**. Ca này cho cùng kết quả ở RS kiểm cục bộ, cộng một bất ngờ:

> **Đo trên lab (critic, 26.8.1).** `start-dev`, cổng 7700, cùng realm `demo`. Lấy access token bằng auth code, rồi `kc update users/<alice-id> -r demo -s enabled=false`. Ngay sau đó: introspection `{"active":false}`; `/userinfo` 401 `error_description="User disabled"`; refresh 400 `invalid_grant` "User disabled"; `exp - now` của access token vẫn **300 s**. Bật lại `enabled=true`: **cùng access token** gọi `/userinfo` lại 200, **cùng refresh token** refresh lại 200. Disable chặn mọi lượt hỏi Keycloak nhưng không xoá session; muốn chắc người đã nghỉ không quay lại được bằng phiên cũ thì phải logout session của họ, không chỉ tắt cờ.

> **Nguồn.** Keycloak: *"Keycloak issued access tokens are JSON Web Tokens (JWT) digitally signed and encoded using JSON Web Signature (JWS)."* ([oidc-layers](https://www.keycloak.org/securing-apps/oidc-layers)). Mặc định 300 s trong code 26.8.1: `"public static final int DEFAULT_ACCESS_TOKEN_LIFESPAN = 300;"` ([Constants.java#L59](https://github.com/keycloak/keycloak/blob/26.8.1/server-spi-private/src/main/java/org/keycloak/models/Constants.java#L59)); docs không ghi con số này, nó lấy từ source. RFC 7519 về `exp` ([rfc7519](https://www.rfc-editor.org/rfc/rfc7519)).

### 3.6 Keycloak đứng ở đâu: ai vận hành cái gì

Mọi IdP, tự host hay managed (Auth0, Okta, Cognito...), đều đóng vai authorization server trong sơ đồ 3.2. Khác biệt nằm ở **ai chạy tiến trình đó**; bài 30 so chi phí, lock-in, khả năng tuỳ biến.

Keycloak là phần mềm bạn tải về và chạy. Lab cho thấy "chạy" nghĩa là gì ngay ở phút đầu: một JVM chiếm khoảng 453 MiB RSS ngay sau khi khởi động ở dev mode, một database (H2 ở dev, Postgres ở production), cổng 8080 cho giao thức và cổng 9000 riêng cho health/metrics, 4 khoá active mỗi realm mà bạn chịu trách nhiệm xoay. Cộng việc nâng version: switch Full Scope Allowed đã deprecated ở 26.8.1, và log lab có **377 dòng WARN** về nó sau vài trăm lần cấp token.

| Việc | Keycloak tự host | Dịch vụ IdP managed |
|---|---|---|
| Chạy tiến trình server, RAM, CPU, sizing | bạn (bài 6, 27) | nhà cung cấp |
| Database, backup, DR | bạn (bài 29) | nhà cung cấp |
| Cluster, cache phiên, không rơi session khi deploy | bạn (bài 25) | nhà cung cấp |
| Nâng version, xử lý deprecation | bạn (bài 29) | nhà cung cấp, theo lịch của họ |
| Xoay khoá ký | bạn (bài 29) | tuỳ dịch vụ |
| Viết extension chạy trong IdP | bạn, Java SPI (bài 22, 23) | trong giới hạn hook mà dịch vụ mở |
| Cấu hình realm/tenant, client, flow, MFA | bạn | bạn |
| App kiểm token đúng `iss`, `aud`, `exp` | bạn | bạn |
| Phân quyền nghiệp vụ trong app | bạn | bạn |

Ba dòng cuối không đổi dù chọn gì: phần giao thức theo bạn sang mọi IdP. Vì thế course dạy giao thức trước (chương 1), vận hành sau (chương 7).

> **Suy luận.** File nguồn không có dữ kiện nào về Auth0, Okta hay Cognito; cột "managed" là mô hình trách nhiệm chung, không mô tả hãng nào. **Kiểm bằng:** đọc trang shared responsibility của dịch vụ đang cân nhắc và điền lại từng dòng.

---

## 4. Lab

Dựng Keycloak, tạo realm, đọc discovery document để thấy bốn vai trò hiện ra thành URL thật. Máy lab: Mac mini Apple M4, 10 core, 16 GB RAM, OpenJDK 24.0.2, Keycloak 26.8.1 (Quarkus 3.40.1). Số thời gian và RAM là bậc độ lớn trên máy dev.

### Bước 1: khởi động ở dev mode

```bash
KC_BOOTSTRAP_ADMIN_USERNAME=admin KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
  bin/kc.sh start-dev --http-port=8080 --http-management-port=9000 --health-enabled=true --metrics-enabled=true
```

Thấy (lần đầu, thư mục vừa unzip):

```
... Quarkus augmentation completed in 12411ms
... KC-SERVICES0077: Created temporary admin user with username admin
Keycloak 26.8.1 on JVM (powered by Quarkus 3.40.1) started in 5.725s. Listening on: http://localhost:8080. Management interface listening on http://0.0.0.0:9000.
Profile dev activated.
```

Lần đầu có bước build Quarkus ("augmentation") khoảng 12,4 s **trước** `started in 5.725s`, tổng khoảng 18 s; lần hai từ lúc gõ lệnh tới `/health/ready` UP là **3,9 s** (bài 6). `start-dev` dùng H2 ghi ra file, HTTP không TLS: để học, không phải production.

### Bước 2: tạo realm và một client

Realm là ranh giới cách ly của Keycloak; bài 7 nói vì sao không đặt app vào realm `master`. Dùng `kcadm.sh` (CLI admin đi kèm bản phân phối) thay vì bấm console, để mọi bước lặp lại được:

```bash
kc config credentials --server http://localhost:8080 --realm master --user admin --password admin
kc create realms -s realm=demo -s enabled=true -i
kc create users -r demo -s username=alice -s enabled=true -s email=alice@example.com -s emailVerified=true \
   -s firstName=Alice -s lastName=Nguyen -i
kc set-password -r demo --username alice --new-password 'Passw0rd!'
kc create clients -r demo -s clientId=spa -s publicClient=true -s standardFlowEnabled=true \
   -s 'redirectUris=["http://localhost:3000/callback"]' -s 'webOrigins=["http://localhost:3000"]' -i
```

`kc` là wrapper của lab: `bin/kcadm.sh` kèm `--config ~/projects/keycloak-lab/lab1/kcadm.config`. Dòng đầu đăng nhập realm `master` bằng admin tạm; các lệnh sau thao tác trên realm `demo` qua `-r demo`. `Passw0rd!` được nhận vì realm mới có `passwordPolicy: null`. Một client tạo không đặt gì (`-s clientId=bare`) đọc lại ra `"implicitFlowEnabled":false,"directAccessGrantsEnabled":false`: nhớ hai giá trị `false` này cho bước 3.

### Bước 3: đọc discovery document

Discovery là một file JSON công khai mà realm tự mô tả: endpoint nào ở đâu, hỗ trợ thuật toán nào. Đường dẫn của Keycloak là `/realms/{realm-name}/.well-known/openid-configuration`, không có tiền tố `/auth` như tài liệu cũ.

```bash
curl -s http://localhost:8080/realms/demo/.well-known/openid-configuration | jq .
```

Thấy (trích các field quyết định, đường dẫn rút gọn bằng `...`):

```json
"issuer": "http://localhost:8080/realms/demo",
"authorization_endpoint": ".../realms/demo/protocol/openid-connect/auth",
"token_endpoint": ".../protocol/openid-connect/token",
"introspection_endpoint": ".../protocol/openid-connect/token/introspect",
"userinfo_endpoint": ".../protocol/openid-connect/userinfo",
"end_session_endpoint": ".../protocol/openid-connect/logout",
"jwks_uri": ".../protocol/openid-connect/certs",
"revocation_endpoint": ".../protocol/openid-connect/revoke",
"grant_types_supported": ["authorization_code","client_credentials","implicit","password","refresh_token", ...],
```

> **Đo trên lab.** Keycloak 26.8.1 `start-dev`, realm `demo`: discovery document dài **6 523 byte**, **56 field**. Đo lại: `curl -s .../openid-configuration | wc -c` và `| jq 'keys | length'`. Bài 3 đọc tiếp `jwks_uri` và đếm khoá trong đó.

Đọc theo vai trò của sơ đồ 3.2:

| Field | Ai gọi | Mũi tên trong 3.2 | Vai của Keycloak lúc đó |
|---|---|---|---|
| `authorization_endpoint` | trình duyệt | 3 | AS, xác thực resource owner |
| `token_endpoint` | client, kênh trực tiếp | 5–6 | AS, phát token |
| `jwks_uri` | resource server | 8 | AS, công bố khoá công khai |
| `userinfo_endpoint` | client, kèm Bearer | không có trong sơ đồ | **RS**, như mục 3.3 |
| `introspection_endpoint` | resource server (confidential client) | thay cho 8 | AS, trả lời "token còn sống không" |
| `end_session_endpoint` | trình duyệt | không có trong sơ đồ | AS, huỷ SSO session (bài 14) |

Ba điều phải đọc ra từ output này:

**`issuer` là chuỗi mà API sẽ so từng ký tự** với claim `iss` trong token; lab thấy hai chuỗi trùng nhau. Bài 3 trích luật này, bài 31 xử lý ca issuer lệch sau reverse proxy.

**`*_supported` là thứ server làm được, không phải thứ client được phép.** `grant_types_supported` có `implicit` và `password`, nhưng bước 2 cho thấy client mới tạo đều tắt cả hai. Quyền nằm ở cấu hình từng client, và bài 2 sẽ đi tìm xem realm mới có client nào không tự tạo mà vẫn để ngỏ `password`.

**Không có field nào về phân quyền nghiệp vụ.** Discovery chỉ liệt kê cách lấy, kiểm, huỷ token; đáp án (c) của hộp ⏸ #1 hiện ngay trong output.

> **Nguồn.** Đường dẫn discovery `/realms/{realm-name}/.well-known/openid-configuration` và authorization endpoint ([oidc-layers](https://www.keycloak.org/securing-apps/oidc-layers)).

---

## 5. Tính tay

**Bài 1: offboarding trước và sau.** 8 app nội bộ, 3 app có "remember me" tự cài sống 30 ngày, và vẫn giữ nó sau khi chuyển sang nhận token Keycloak.

- Trước: chỗ cài identity = 8 × 6 = **48**; thao tác khi một người nghỉ = 8, cộng 3 cookie không ai huỷ được bằng tay.
- Sau: 6 ở IdP + 8 chỗ kiểm token = **14**; thao tác khoá = **1**. Nhưng 3 app kia vẫn cho người đã nghỉ dùng tới khi cookie hết hạn, trừ khi app nhận tín hiệu logout từ IdP (bài 14).
- Phân quyền nghiệp vụ: **8** trước, **8** sau.

IdP giảm số chỗ phải khoá từ 8 xuống 1 **chỉ khi** không app nào tự cấp phiên dài hơn token nó nhận.

**Bài 2: cửa sổ sau logout, ba API khác nhau.** Access token lifespan 300 s (mặc định code 26.8.1). User đăng nhập, token gần nhất phát lúc 14:07:45. Lúc 14:09:00 admin logout phiên đó. Ba API nhận cùng token:

- API A kiểm cục bộ (chữ ký + `iss` + `aud` + `exp`): `exp` = 14:07:45 + 300 s = **14:12:45**. A chấp nhận token tới trước 14:12:45, tức thêm **225 s** sau logout.
- API B gọi introspection mỗi request: từ chối từ request đầu tiên sau 14:09:00 (lab: `active:false` ngay sau logout).
- API C kiểm cục bộ nhưng có cache kết quả validate 10 phút theo `jti`: nếu token đã được validate lần đầu lúc 14:08:00, C chấp nhận tới **14:18:00**, tức 5 phút 15 giây sau khi token đã hết hạn. C đang vi phạm luật `exp` của RFC 7519, và đây là lỗi tự gây, không phải lỗi IdP.

---

## 6. Chuyển giao

1. Một app di động gọi thẳng API báo cáo bằng access token, và một cron job ban đêm gọi cùng API đó bằng client credentials. Với từng lượt gọi, ai là resource owner? Token của cron job có `sid` không, và vì sao điều đó hợp lý?
2. Một đồng nghiệp đề xuất: "Để API khỏi phải kiểm token, cho API gọi `/userinfo` với token nhận được, ra 200 là cho qua." Cách này giải quyết được cửa sổ 300 s ở mục 3.5 không? Nó làm sai vai trò nào, và nó bỏ sót kiểm tra nào mà API lẽ ra phải tự làm?
3. Công ty mua lại một startup dùng Azure AD. Nhân viên startup phải đăng nhập được năm app mà không tạo mật khẩu mới. Đây là brokering hay User Storage Federation? Năm app cần đổi cấu hình gì?
4. Bạn chuyển dashboard báo cáo sang Keycloak, nhưng dashboard đang có 2 000 user với hash bcrypt trong bảng `users`. Ngày cắt chuyển, những user đó đăng nhập bằng gì? Liệt kê ít nhất hai cách và cái giá của từng cách với người dùng.
5. Một realm phục vụ cả nhân viên nội bộ lẫn khách hàng của SaaS. Nhân viên nghỉ việc phải mất quyền trong vòng 1 phút; khách hàng thì chấp nhận 5 phút. Access token lifespan mặc định 300 s ở cấp realm. Thiết kế những cách đạt được cả hai yêu cầu mà không ép mọi API gọi introspection, và nói cái giá của từng cách: số lần refresh tăng bao nhiêu, request nào đổ thêm vào Keycloak, chỗ nào trong hệ có thể vẫn để lọt quá 1 phút.

---

## 7. Tóm tắt

- N app tự làm login là N × 6 chỗ cài identity; có IdP còn 6 chỗ ở IdP + N chỗ kiểm token. Phân quyền nghiệp vụ vẫn là N.
- Realm mới có `bruteForceProtected: false`, `passwordPolicy: null`, `eventsEnabled: false` (lab): IdP cho một chỗ để bật, không cho trạng thái đã bật.
- Thư viện băm không thay được IdP: Keycloak trả lỗi user không tồn tại sau khoảng 13 ms, ngang ca sai mật khẩu (lab), form tự viết thường trả sớm và lộ email.
- Mật khẩu chỉ đi từ trình duyệt tới authorization endpoint; `code` đi vòng qua trình duyệt, token đi kênh trực tiếp.
- Vai OAuth gắn theo lượt, không theo máy: Keycloak là RS ở `/userinfo`, là client khi broker sang Google; client credentials là client tự làm resource owner.
- Refresh token chỉ dành cho AS (RFC 6749). `id_token` có `aud` = client (`spa`); access token cùng lượt có `aud: account` (lab).
- Brokering: app chỉ nhận token Keycloak. User Storage Federation (LDAP/AD) là cơ chế khác.
- Sau logout hay disable user, RS kiểm cục bộ vẫn nhận access token tới `exp`, tối đa 300 s mặc định; session app tự cấp không bị ảnh hưởng. Disable không xoá session: bật lại là token cũ dùng tiếp (lab critic).
- Đóng cửa sổ đó bằng introspection tốn một round trip mỗi request: p50 0,59 ms so với verify offline 124–134 µs (lab, localhost).
- Discovery: 6 523 byte, 56 field (lab); `*_supported` là khả năng server, không phải quyền client.
- Tự host là tự chạy JVM (khoảng 453 MiB RSS dev mode), database, cluster, nâng version, xoay khoá.

→ **Bài 2 — OAuth 2.0 đọc ở mức tham số**: sơ đồ 3.2 có 8 mũi tên; bài sau mở từng mũi tên ra thành URL và tham số thật (`response_type`, `redirect_uri`, `scope`, `state`), và chỉ ra mỗi tham số chặn đúng kiểu tấn công nào.
