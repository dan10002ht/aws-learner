# Bài 2 — OAuth 2.0 đọc ở mức tham số

## 1. Mục tiêu

Sau bài này bạn có thể:

- Vẽ lại authorization code flow thành từng HTTP request đánh số, chỉ ra request nào đi qua trình duyệt (front channel) và request nào đi thẳng server tới server (back channel).
- Với mỗi tham số `response_type`, `client_id`, `redirect_uri`, `scope`, `state`, `code`, nói được nó chặn cuộc tấn công nào, và ai (Keycloak hay app) là bên kiểm nó.
- Đọc một lỗi `invalid_grant` "Code not valid" hoặc trang lỗi "Invalid parameter: redirect_uri" và khoanh được bước hỏng trong vòng một phút.
- Lấy token bằng client credentials với `curl`, giải thích vì sao response không có refresh token và vì sao app không cần refresh.
- Giải thích bằng cơ chế (không phải bằng "spec nói vậy") vì sao implicit và password grant bị loại, và trích đúng mức độ: RFC 9700 nói SHOULD NOT với cái nào, MUST NOT với cái nào.
- Tìm ra client nào trong một realm Keycloak 26.8.1 vẫn đổi được username/password lấy token, dù mọi client bạn tự tạo đều đã tắt.

---

## 2. Triệu chứng

Một SaaS B2B vừa chuyển login sang Keycloak. Backend Node nhận callback, gọi token endpoint để đổi `code` lấy token. Trên máy dev mọi thứ chạy. Lên staging, khoảng vài phần trăm lượt login kết thúc bằng trang lỗi, log backend ghi:

```
POST /realms/demo/protocol/openid-connect/token -> 400
{"error":"invalid_grant","error_description":"Code not valid"}
```

Người dùng bấm "Sign in" lại thì vào được. Không ai đổi cấu hình Keycloak. Đồng hồ server đồng bộ NTP. Bạn soi log theo request id và thấy một mẫu lặp lại: mỗi lượt hỏng đều có **hai** lần gọi token endpoint với **cùng một `code`**, cách nhau khoảng 2 giây. HTTP client của backend có cấu hình retry: timeout 2.000 ms thì gửi lại. Staging nằm khác region với Keycloak.

Code dài 98 ký tự, Keycloak trả về trên URL callback chưa tới một giây trước lần gọi đầu.

## ⏸ Dừng lại — đoán trước #1

Chọn trước khi đọc tiếp.

**Vì sao lần gọi thứ hai trả "Code not valid"?**

```
(a) Code đã hết hạn: 2 giây là quá lâu với Keycloak
(b) Lần gọi đầu thật ra đã tới Keycloak và đổi code thành công; code chỉ đổi được một lần
(c) Lần retry gửi redirect_uri khác lần đầu
(d) Keycloak chặn vì cùng một client gọi token endpoint hai lần trong 2 giây
```

---

## 3. Lý thuyết

### 3.1 Code là vé dùng một lần, và nó sống 60 giây

Đáp án là **(b)**. Lần gọi đầu không thất bại, nó chỉ chậm hơn 2.000 ms. Keycloak đã nhận, đã đổi code ra token, đã trả response; backend không chờ đủ lâu để nhận nên bỏ response đó, rồi gửi lại cùng code. Với Keycloak, lần thứ hai là một lần dùng lại code.

Hai con số quyết định chuyện này:

- **Dùng một lần.** RFC 6749 viết thành MUST: *"The client MUST NOT use the authorization code more than once."* Lab ở mục 4 dùng lại cùng một code lần hai và nhận đúng `invalid_grant` "Code not valid".
- **Sống ngắn.** RFC 6749 chỉ đặt trần: *"A maximum authorization code lifetime of 10 minutes is RECOMMENDED."* Keycloak 26.8.1 chặt hơn 10 lần: hằng số trong code là *"public static final int DEFAULT_ACCESS_CODE_LIFESPAN = 60;"*, và realm mới tạo trên lab đọc ra `"accessCodeLifespan": 60`.

(a) sai theo số: 2 giây còn xa 60 giây. (c) không xảy ra vì retry gửi lại đúng body cũ. Hệ quả: **request đổi code không idempotent**, không được retry mù, và `invalid_grant` ở đây nghĩa là "có thể lần trước đã thành công".

Vì sao OAuth thiết kế một vé vừa dùng-một-lần vừa chết sau 60 giây, thay vì đưa thẳng token? Phải nhìn đường đi của nó.

> **Nguồn.** Hai câu RFC 6749 ở trên: [rfc6749](https://www.rfc-editor.org/rfc/rfc6749). Hằng số 60 giây là mặc định trong code 26.8.1, docs không ghi số: [Constants.java#L82](https://github.com/keycloak/keycloak/blob/26.8.1/server-spi-private/src/main/java/org/keycloak/models/Constants.java#L82).

### 3.2 Bốn bên, hai kênh

Một bản sai cần dọn trước: "OAuth là giao thức login". `security/sec-05-authn-authz.md` đã nói OAuth là ủy quyền; ở đây chỉ thêm bằng chứng. Bốn grant của RFC 6749 đều kết thúc ở access token, và RFC định nghĩa nó là *"An access token is a string representing an authorization issued to the client. The string is usually opaque to the client."* Access token Keycloak phát cho `spa` trên lab có `"azp":"spa"` nhưng `"aud":"account"`: nó ghi địa chỉ cho chỗ khác, không cho app đang cầm. App "login" bằng cách đọc access token là đọc thư không gửi cho mình; thứ gửi cho app là `id_token`, bài 3.

Bốn bên, mỗi bên một cột trong sơ đồ: **Browser** (user agent, nơi gõ mật khẩu), **App backend** (client), **Keycloak** (authorization server), **API** (resource server). Hai kênh:

- **Front channel**: request đi qua trình duyệt bằng redirect 302 hoặc form, nên nằm trong lịch sử trình duyệt, log của proxy, tầm với của extension.
- **Back channel**: app backend gọi thẳng Keycloak qua TLS, trình duyệt không thấy.

<svg viewBox="0 0 760 560" role="img" aria-labelledby="kc2-a-t kc2-a-d" style="width:100%;height:auto">
<title id="kc2-a-t">Authorization code flow, 10 request đánh số</title>
<desc id="kc2-a-d">Sơ đồ sequence giữa Browser, App backend, Keycloak và API: request 1 đến 7 đi qua trình duyệt (front channel), request 8 và 9 đi thẳng giữa app backend và Keycloak (back channel), request 10 là app gọi API bằng Bearer token.</desc>
<defs>
<marker id="kc2-a-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker>
</defs>
<rect x="10" y="60" width="740" height="282" rx="8" fill="#f59e0b" fill-opacity="0.10"/>
<text x="20" y="334" font-size="10" fill="currentColor" opacity="0.8">FRONT CHANNEL: đi qua trình duyệt, nằm trong URL / form</text>
<rect x="10" y="350" width="740" height="110" rx="8" fill="#8b5cf6" fill-opacity="0.12"/>
<text x="20" y="452" font-size="10" fill="currentColor" opacity="0.8">BACK CHANNEL: server tới server qua TLS, trình duyệt không thấy</text>
<rect x="20" y="15" width="100" height="32" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="70" y="36" text-anchor="middle" font-size="12" fill="currentColor">Browser</text>
<rect x="225" y="15" width="110" height="32" rx="8" fill="#84cc16" fill-opacity="0.25"/>
<text x="280" y="36" text-anchor="middle" font-size="12" fill="currentColor">App backend</text>
<rect x="480" y="15" width="100" height="32" rx="8" fill="#ef4444" fill-opacity="0.22"/>
<text x="530" y="36" text-anchor="middle" font-size="12" fill="currentColor">Keycloak</text>
<rect x="660" y="15" width="80" height="32" rx="8" fill="#64748b" fill-opacity="0.25"/>
<text x="700" y="36" text-anchor="middle" font-size="12" fill="currentColor">API</text>
<line x1="70" y1="47" x2="70" y2="545" stroke="currentColor" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="4 4"/>
<line x1="280" y1="47" x2="280" y2="545" stroke="currentColor" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="4 4"/>
<line x1="530" y1="47" x2="530" y2="545" stroke="currentColor" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="4 4"/>
<line x1="700" y1="47" x2="700" y2="545" stroke="currentColor" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="4 4"/>
<text x="175" y="78" text-anchor="middle" font-size="10" fill="currentColor">1  GET /login</text>
<line x1="72" y1="85" x2="276" y2="85" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc2-a-arrow)"/>
<text x="175" y="113" text-anchor="middle" font-size="10" fill="currentColor">2  302 + Set-Cookie (giữ state)</text>
<line x1="278" y1="120" x2="74" y2="120" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc2-a-arrow)"/>
<text x="300" y="148" text-anchor="middle" font-size="10" fill="currentColor">3  GET /auth?response_type=code&amp;client_id&amp;redirect_uri&amp;scope&amp;state</text>
<line x1="72" y1="155" x2="526" y2="155" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc2-a-arrow)"/>
<text x="300" y="183" text-anchor="middle" font-size="10" fill="currentColor">4  200 form login (cookie phiên của Keycloak)</text>
<line x1="528" y1="190" x2="74" y2="190" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc2-a-arrow)"/>
<text x="300" y="218" text-anchor="middle" font-size="10" fill="currentColor">5  POST username + password (chỉ Keycloak thấy)</text>
<line x1="72" y1="225" x2="526" y2="225" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc2-a-arrow)"/>
<text x="300" y="253" text-anchor="middle" font-size="10" fill="currentColor">6  302 Location: redirect_uri?state=…&amp;iss=…&amp;code=…</text>
<line x1="528" y1="260" x2="74" y2="260" stroke="#f59e0b" stroke-width="2" marker-end="url(#kc2-a-arrow)"/>
<text x="175" y="288" text-anchor="middle" font-size="10" fill="currentColor">7  GET /callback?code&amp;state</text>
<line x1="72" y1="295" x2="276" y2="295" stroke="#f59e0b" stroke-width="2" marker-end="url(#kc2-a-arrow)"/>
<text x="175" y="318" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.8">app so state với cookie</text>
<text x="405" y="373" text-anchor="middle" font-size="10" fill="currentColor">8  POST /token: code + redirect_uri + secret</text>
<line x1="282" y1="380" x2="526" y2="380" stroke="#8b5cf6" stroke-width="2" marker-end="url(#kc2-a-arrow)"/>
<text x="405" y="408" text-anchor="middle" font-size="10" fill="currentColor">9  200 access_token, refresh_token</text>
<line x1="528" y1="415" x2="284" y2="415" stroke="#8b5cf6" stroke-width="2" marker-end="url(#kc2-a-arrow)"/>
<text x="490" y="488" text-anchor="middle" font-size="10" fill="currentColor">10  GET /orders, Authorization: Bearer …</text>
<line x1="282" y1="495" x2="696" y2="495" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc2-a-arrow)"/>
<text x="490" y="525" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.8">code đi front channel (6, 7); token chỉ đi back channel (9)</text>
</svg>

Mười request cho một lần bấm "Sign in", chưa tính lần tải trang sau callback. Trong đó **mật khẩu chỉ đi một chặng** (request 5, browser tới Keycloak), app không bao giờ thấy nó. Và **token không bao giờ chạm front channel**: thứ duy nhất Keycloak gửi qua trình duyệt là `code` (request 6, 7).

### 3.3 Request 3: năm tham số, năm cuộc tấn công

Request 3 (authorization request) là chỗ app nói "tôi là ai, muốn gì, gửi kết quả về đâu". Trên lab:

```
GET /realms/demo/protocol/openid-connect/auth
    ?client_id=spa
    &response_type=code
    &scope=openid
    &redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback
    &state=st123
```

**`redirect_uri`: địa chỉ Keycloak gửi code về.** Request 3 do trình duyệt gửi, nên kẻ tấn công tự dựng được nó: gửi nạn nhân link `/auth?client_id=spa&redirect_uri=https://evil.com/cb`, nạn nhân đăng nhập thật, code bay tới evil.com. Cơ chế chặn: client đăng ký trước danh sách redirect_uri, và RFC 9700 đòi so khớp chuỗi chính xác: *"When comparing client redirection URIs against pre-registered URIs, authorization servers MUST utilize exact string matching except for port numbers in localhost redirection URIs of native apps"*. Trên lab, client `spa` đăng ký `http://localhost:3000/callback`; gửi `redirect_uri=http://evil.com/callback` thì nhận **400 và trang lỗi "Invalid parameter: redirect_uri", không redirect**.

Thứ tự kiểm ở đây đáng nhớ. Với lỗi khác ở request 3 (client bắt PKCE mà request thiếu `code_challenge`), lab thấy Keycloak trả **302 về redirect_uri** kèm `error=invalid_request`. Gửi cùng request thiếu đó nhưng kèm `redirect_uri=http://evil.com/callback` thì nhận **400 tại chỗ, không redirect** (đo trên lab critic, 26.8.1, cổng 7700): Keycloak kiểm redirect_uri trước rồi mới dám trả lỗi về đó.

> **Suy luận.** Docs không phát biểu thứ tự này. Lý do suy ra từ cơ chế: redirect cả lỗi về một URI chưa kiểm thì chính trang lỗi thành open redirect.

Cơ chế này chỉ mạnh bằng chuỗi đã đăng ký (wildcard rộng thì mất, bài 7) và vô dụng nếu đường về không mã hoá: *"In production for web applications always use https for all redirect URIs. Do not allow redirects to http."*

**`client_id`: khoá để tra các luật còn lại.** Nó công khai, một mình không chứng minh gì; Keycloak dùng nó để tra redirect_uri, flow được bật, cấu hình PKCE: nó chọn bộ luật để chặn.

**`response_type=code`: chọn thứ gì đi trên front channel.** `code` là "trả tôi một vé đổi token", không phải token. Giá trị `token` chính là implicit flow (mục 3.6). Tham số này chặn việc **token nằm trong URL**.

**`scope`: phạm vi quyền xin, là lời xin chứ không phải lời quyết.** Lab xin `scope=openid`, nhận `"scope":"openid profile email"`: Keycloak tự áp sáu scope trong `defaultClientScopes` của client; hai cái hiện tên là `profile`, `email`, bốn cái kia (`basic`, `web-origins`, `acr`, `roles`) chỉ thấy trong `scope` của refresh token. Nó không chặn một tấn công cụ thể mà giới hạn thiệt hại khi token lộ; bài 9 đi vào cách Keycloak quyết scope.

**`state`: gắn callback với đúng phiên trình duyệt đã bắt đầu flow.** RFC 6749: *"An opaque value used by the client to maintain state between the request and callback."* OIDC Core nói rõ cách dùng chống CSRF: *"Typically, Cross-Site Request Forgery (CSRF, XSRF) mitigation is done by cryptographically binding the value of this parameter with a browser cookie."*

Cuộc tấn công nó chặn đi ngược hướng thường nghĩ: kẻ tấn công không lấy cắp gì, hắn **tiêm code của chính hắn** vào nạn nhân:

1. Kẻ tấn công tự đăng nhập bằng tài khoản của hắn, dừng ở request 6, giữ lại URL `/callback?code=CODE_CUA_HAN`.
2. Hắn đặt URL đó vào một thẻ `<img>` trên trang bất kỳ mà nạn nhân mở.
3. Trình duyệt nạn nhân gọi `/callback` của app, app đổi code, và **nạn nhân giờ đang đăng nhập vào tài khoản của kẻ tấn công**. Thứ nạn nhân nhập sau đó (thẻ thanh toán, tài liệu, khoá API) nằm trong tài khoản hắn đọc được.

Với `state`: ở request 2 app sinh một chuỗi ngẫu nhiên, đặt vào cookie của trình duyệt và vào URL. Keycloak trả nguyên chuỗi đó ở request 6 (lab: gửi `state=st123`, nhận lại `state=st123`). Ở request 7 app so `state` trên URL với cookie. Trình duyệt nạn nhân không có cookie khớp với `state` trong URL kẻ tấn công dựng, nên app từ chối.

> **Suy luận.** Nguồn chỉ nói `state` chống CSRF bằng cách gắn với cookie; kịch bản ba bước là cách đọc cụ thể của câu đó. Hệ quả: **Keycloak không kiểm `state`**, chỉ chở hộ. App quên so `state` ở request 7 thì không lỗi nào hiện ra, flow vẫn chạy trơn.

Gom lại:

| Tham số | Nếu thiếu thì tấn công gì | Ai kiểm | Lab thấy |
|---|---|---|---|
| `redirect_uri` | Code nạn nhân bay tới domain kẻ tấn công | Keycloak | `evil.com` → 400, không redirect |
| `client_id` | (không tự chặn; chọn bộ luật để chặn) | Keycloak | |
| `response_type=code` | Token nằm trong URL, lộ qua lịch sử / log | Keycloak (theo flow client bật) | `implicitFlowEnabled: false` ở client mới |
| `scope` | Không chặn trực tiếp; giới hạn thiệt hại khi lộ | Keycloak quyết, app đọc response | xin `openid`, nhận `openid profile email` |
| `state` | Tiêm code của kẻ tấn công vào phiên nạn nhân | **App** | Keycloak trả nguyên `st123` |

Redirect ở request 6 còn có hai tham số app không xin: `session_state` và `iss`. Theo ghi chú lab, `iss` đến từ RFC 9207 (chống "mix-up" khi app nói chuyện với nhiều authorization server), Keycloak gửi cả khi không ai yêu cầu.

> **Nguồn.** Các câu trích trong mục này: redirect_uri từ [rfc9700](https://www.rfc-editor.org/rfc/rfc9700); `state` từ [rfc6749](https://www.rfc-editor.org/rfc/rfc6749) và [openid-connect-core](https://openid.net/specs/openid-connect-core-1_0.html); https từ [oidc-layers](https://www.keycloak.org/securing-apps/oidc-layers). Ghi chú `iss`/RFC 9207 là của file lab, không phải bảng nguồn.

## ⏸ Dừng lại — đoán trước #2

Request 6 đã là một lượt Keycloak trả lời trình duyệt. Nếu Keycloak đặt luôn access token vào URL ở request 6 thì bỏ được request 8 và 9, login nhanh hơn một round trip.

**Thứ gì hỏng nếu làm vậy?** Chọn một:

```
(a) Không hỏng gì về bảo mật, chỉ là token dài hơn code nên URL dài
(b) Token đi qua trình duyệt, và không còn bước nào chứng minh bên cầm nó là app thật
(c) Keycloak không ký được token khi trả qua redirect
(d) API sẽ từ chối token vì nó không đi qua back channel
```

### 3.4 Request 8: vì sao code phải đổi qua back channel

Đáp án là **(b)**, và nó có hai nửa.

**Nửa thứ nhất: front channel rò.** URL ở request 6 và 7 nằm trong lịch sử trình duyệt, log proxy phía app, tầm với của extension. RFC 6750 cấm đặt bearer token vào đó: *"Bearer tokens SHOULD NOT be passed in page URLs (for example, as query string parameters)."* Vì theo RFC 6750, ai đang giữ bearer token cũng dùng được nó mà không phải chứng minh giữ khoá nào. Code cũng lộ ở những chỗ đó, nhưng nó chỉ đổi được ở token endpoint, một lần, trong 60 giây.

**Nửa thứ hai: back channel có xác thực client.** Ở request 8, app gửi `code` kèm client secret. Keycloak chỉ đổi code cho đúng client mà code được phát cho, và code trên lab mang theo chủ của nó: dạng `<uuid>.<session id>.<client uuid>` (4.2), đoạn thứ hai trùng `session_state`, đoạn thứ ba khớp `id` của client trong log Keycloak. Code lộ mà không có secret thì vô dụng.

Ghép hai nửa: **tách "nhận kết quả" (front channel, chịu được rò) khỏi "lĩnh token" (back channel, đòi danh tính)**. Đó là lý do đáng trả thêm một round trip.

**Giới hạn của lập luận này.** Nửa thứ hai chỉ đứng được khi client **có** secret. Docs Keycloak: *"HTML5/JavaScript clients have to be public clients because there is no way to securely transmit the client secret to HTML5/JavaScript clients."* Với public client (không secret), request 8 chỉ có `code` và `client_id`, cả hai đã nằm trên front channel. Lab chạy đúng ca này với `spa-nopkce` (public, không cấu hình PKCE) ở mục 4.2: **đổi code thành công, nhận đủ access, refresh và id token**. Không gì ở request 8 phân biệt app thật với ai đó nhặt được code. Bài 3 lấp lỗ này.

> **Suy luận.** Không nguồn nào phát biểu nguyên câu "code phải đổi qua back channel vì...": nó ghép từ RFC 6750, RFC 6749 + Keycloak (code một lần, 60 giây) và docs Keycloak (SPA không giữ được secret). Định dạng code là quan sát trên lab, Keycloak không cam kết; đừng parse nó.

Request 8 còn gửi lại `redirect_uri` của request 3, và RFC 6749 §5.2 xếp lệch nó vào `invalid_grant`: grant *"does not match the redirection URI used in the authorization request"*.

> **Đo trên lab (critic, 26.8.1).** `start-dev`, cổng 7700, client `spa-nopkce`. Request 8 với `redirect_uri=http://localhost:3000/other`: `400 invalid_grant` "Incorrect redirect_uri". Bỏ hẳn `redirect_uri`: cùng lỗi. Và code **đã bị đốt**: gửi lại ngay với `redirect_uri` đúng nhận `invalid_grant` "Code not valid". Lần đổi hỏng cũng tiêu code, không chỉ lần đổi thành công.

### 3.5 Client credentials: khi không có người dùng nào

Một job đối soát lúc 2 giờ sáng gọi API nội bộ: không người dùng, không trình duyệt. Docs Keycloak: *"Client Credentials are used when clients (applications and services) want to obtain access on behalf of themselves rather than on behalf of a user."* Một request back channel kèm secret, nhận access token; an toàn dựa trọn vào secret nên RFC 6749 viết: *"The client credentials grant type MUST only be used by confidential clients."* Trong Keycloak, bật nó bằng switch "Service account roles" trên client (`serviceAccountsEnabled=true` qua API).

Ba chỗ khác với authorization code, mỗi chỗ có lý do:

- **Không refresh token.** Docs: *"Only the access token is returned by default. No refresh token is returned and no user session is created"*. Lab: `"refresh_expires_in":0`, không có `refresh_token`, không có `id_token`. Refresh token tồn tại để khỏi bắt người dùng đăng nhập lại; ở đây "đăng nhập lại" chỉ là gửi lại secret. Hết 300 giây thì gọi lại grant. Switch bật lại refresh token cho grant này đã deprecated ở 26.8.0.
- **Không user session.** Sau khoảng 210 lần gọi, `client-session-stats` không có `api-client`; `jti` có tiền tố `trrtcc:` (transient). `sub` là user kỹ thuật `service-account-api-client`.
- **Sai secret trả `unauthorized_client`, không phải `invalid_client`.** RFC 6749 §5.2 tách hai mã: `invalid_client` là *"Client authentication failed (e.g., unknown client, no client authentication included, or unsupported authentication method)."*, còn `unauthorized_client` là *"The authenticated client is not authorized to use this authorization grant type."* Lab: secret sai trả `HTTP 401 {"error":"unauthorized_client",...}`; lab critic thêm: client_id không tồn tại thì trả `invalid_client`, và secret sai qua `Authorization: Basic` không kèm header `WWW-Authenticate` mà §5.2 đòi MUST. Code xử lý lỗi viết theo RFC sẽ đọc secret sai thành "client không được dùng grant này" và điều tra nhầm hướng.

Chỗ hay sai: dùng client credentials để gọi API **thay một người dùng**. Token mang danh tính service account, API không còn biết request là của ai. Bài 13 (token exchange) giải chuyện này.

> **Nguồn.** RFC 6749 ([rfc6749](https://www.rfc-editor.org/rfc/rfc6749), mã lỗi ở [§5.2](https://www.rfc-editor.org/rfc/rfc6749#section-5.2)); Keycloak [oidc-layers](https://www.keycloak.org/securing-apps/oidc-layers), [server_admin, service accounts](https://www.keycloak.org/docs/latest/server_admin/index.html#_service_accounts), [upgrading](https://www.keycloak.org/docs/latest/upgrading/index.html) cho switch deprecated ở 26.8.0.

### 3.6 Hai grant bị loại: implicit và password

RFC 6749 định nghĩa bốn grant; hai cái nay bị khuyên bỏ, mỗi cái vì phá một nửa của mục 3.4.

**Implicit: bỏ request 8, đưa token thẳng lên front channel.** `response_type=token` làm đúng điều ⏸ #2 đề xuất: access token nằm trong URL redirect. Cái giá:

- Token vi phạm thẳng câu của RFC 6750 về bearer token trong URL.
- Không có refresh token, vì RFC 6749 cấm phát cho implicit: *"The authorization server MUST NOT issue a refresh token."* Muốn phiên dài thì access token phải sống dài: Keycloak có thông số riêng, mặc định trong code 900 giây, gấp 3 lần 300 giây thường. Token ở chỗ dễ lộ nhất lại sống lâu nhất.
- Keycloak không làm được DPoP (ràng token vào khoá của client) cho flow trả token ở front channel.

Mức độ phải trích đúng: RFC 9700 nói *"clients SHOULD NOT use the implicit grant (response type token) or other response types issuing access tokens in the authorization response"*. Đó là **SHOULD NOT**, không phải cấm tuyệt đối, và docs Keycloak nhắc lại đúng mức đó. Việc thay thế cho SPA là authorization code cộng PKCE, bài 3.

**Password grant: bỏ trình duyệt, đưa mật khẩu cho app.** Tên đầy đủ là Resource Owner Password Credentials; docs Keycloak: *"Resource Owner Password Credentials, referred to as Direct Grant in Keycloak, allows exchanging user credentials for tokens."* App tự vẽ form, nhận username/password, gửi tới token endpoint: một request, không redirect, hấp dẫn khi muốn form login theo thương hiệu. Nó xoá đúng ưu điểm lớn nhất của sơ đồ trên: mật khẩu chỉ đi một chặng, browser tới Keycloak.

> **Suy luận.** Nguồn chỉ nói password grant bị cấm, không nêu lý do. Từ cơ chế (app nhận mật khẩu dạng rõ rồi chuyển tiếp) suy ra: (1) mọi app dùng nó thành một chỗ rò mật khẩu, đúng bài toán bài 1; (2) không có trang nào của Keycloak hiện ra nên không có chỗ cho bước MFA hay chuyển sang IdP khác; (3) người dùng quen gõ mật khẩu IdP vào form của bất kỳ app nào, đúng thói quen phishing cần.

Ở đây mức độ là **MUST NOT**. RFC 9700: *"The resource owner password credentials grant [RFC6749] MUST NOT be used."* Docs Keycloak viết cùng mức: *"this flow MUST NOT be used, preferring alternative methods such as Device Authorization Grant or Authorization code."*

**OAuth 2.1 gom các quyết định này lại, nhưng nó chưa là RFC.** Bản hiện hành trong nguồn là `draft-ietf-oauth-v2-1-16`, ngày 3 September 2026, hết hạn 7 March 2027. Nó bỏ cả hai grant: *"The Implicit grant (response_type=token) is omitted from this specification as per Section 2.1.2 of [RFC9700]"* và *"The Resource Owner Password Credentials grant is omitted from this specification as per Section 2.4 of [RFC9700]"*. Keycloak tự nói: *"OAuth 2.1 specification is still a draft and it may change in the future."* Trong tài liệu thiết kế, viết "theo RFC 9700 và draft OAuth 2.1", không viết "theo chuẩn OAuth 2.1".

> **Nguồn.** [rfc9700](https://www.rfc-editor.org/rfc/rfc9700), [rfc6750](https://www.rfc-editor.org/rfc/rfc6750), [draft-ietf-oauth-v2-1-16](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-16), [oidc-layers](https://www.keycloak.org/securing-apps/oidc-layers). Hằng số 900 giây là mặc định trong code: *"public static final int DEFAULT_ACCESS_TOKEN_LIFESPAN_FOR_IMPLICIT_FLOW_TIMEOUT = 900;"* ([Constants.java#L62](https://github.com/keycloak/keycloak/blob/26.8.1/server-spi-private/src/main/java/org/keycloak/models/Constants.java#L62)). DPoP: *"DPoP is not supported for flows that issue access tokens in the front channel (implicit and hybrid flows)."* ([dpop](https://www.keycloak.org/securing-apps/dpop)).

## ⏸ Dừng lại — đoán trước #3

Bạn vừa audit realm production. Mọi client do team tạo đều có `directAccessGrantsEnabled: false` và `implicitFlowEnabled: false`. Đó cũng là mặc định Keycloak 26.8.1 cho client mới.

**Kẻ tấn công có danh sách email + mật khẩu rò từ chỗ khác (credential stuffing). Hắn đổi được mật khẩu thành token ở realm này không, mà không cần qua trang login?**

```
(a) Không: không client nào bật Direct Access Grants
(b) Không: discovery không quảng cáo grant "password"
(c) Có, nhưng chỉ khi hắn có client secret của một client confidential
(d) Có, qua một client built-in, không cần secret
```

---

## 4. Lab

> **Đo trên lab.** Keycloak 26.8.1 (Quarkus 3.40.1) `start-dev`, H2 dev-file, cổng 8080; OpenJDK 24.0.2; Mac mini Apple M4 10 core, 16 GB RAM; chạy ngày 2026-10-15. Realm `demo`, user `alice`. Client: `spa` và `spa-nopkce` (public, redirect `http://localhost:3000/callback`; `spa` bắt PKCE, bài 3), `api-client` (confidential, chỉ bật service account, secret `api-secret-123`). Latency là dev mode, localhost, một luồng: chỉ dùng như bậc độ lớn.

### 4.1 Discovery quảng cáo cái server làm được, không phải cái client được làm

Bài 1 đã in `grant_types_supported` của discovery; thêm một dòng cùng file:

```json
"response_types_supported": ["code","none","id_token","token","id_token token","code id_token","code token","code id_token token"],
```

`password`, `implicit` và `token` đều có mặt. Danh sách `*_supported` là năng lực của server; client nào được dùng grant nào quyết ở cấu hình từng client. Một client tạo bằng API không set gì trên lab có `"implicitFlowEnabled":false,"directAccessGrantsEnabled":false`. Đáp án (b) của ⏸ #3 sai vì lẽ đó.

### 4.2 Authorization code bằng curl, từng request

Script lab (`pkce.sh`) chạy flow không cần trình duyệt, cookie jar `$J` đóng vai trình duyệt. Phần lõi (bỏ nhánh PKCE và bước bóc `action` của form):

```bash
B=http://localhost:8080/realms/demo/protocol/openid-connect
# request 3 -> 4: GET /auth, nhận form login + cookie
curl -s -c $J -b $J $B'/auth?client_id=spa-nopkce&response_type=code&scope=openid&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback&state=st123'
# request 5 -> 6: POST mật khẩu tới $ACTION của form, chỉ in header Location
curl -s -o /dev/null -w '%{redirect_url}' -c $J -b $J \
  --data-urlencode username=alice --data-urlencode 'password=Passw0rd!' $ACTION
# request 8 -> 9: đổi code (bóc từ Location) ở back channel
curl -s -X POST $B/token -d grant_type=authorization_code -d client_id=spa-nopkce \
  -d code=$CODE -d redirect_uri=http://localhost:3000/callback
```

Không có request 1, 2, 7: script tự đóng vai app. Trong app thật đó là chỗ đặt và kiểm `state`.

> **Đo trên lab (critic, 26.8.1).** Cùng flow, client `spa-nopkce`, Keycloak `start-dev` cổng 7700 (nên `iss` là `localhost:7700`):

```
redirect: http://localhost:3000/callback?state=st123&session_state=lNjv9pNB_-DivWOPq45nvloL
          &iss=http%3A%2F%2Flocalhost%3A7700%2Frealms%2Fdemo&code=f6bd61ca-918e-b70f-7267-25fd0824e117.lNjv9pNB_-DivWOPq45nvloL.9f1c28a0-...
code_len = 98
token  -> 200 {"expires_in":300,"refresh_expires_in":1800,"token_type":"Bearer","not-before-policy":0,
               "session_state":"lNjv9pNB_-DivWOPq45nvloL","scope":"openid profile email",
               "access_token":"eyJ...","refresh_token":"eyJ...","id_token":"eyJ..."}
access token: "aud":"account", "azp":"spa-nopkce"
```

Request 8 chỉ có `grant_type`, `client_id`, `code`, `redirect_uri`: không secret, không gì ngoài thứ đã đi qua URL. `state=st123` quay về nguyên vẹn; `refresh_expires_in: 1800` là SSO Session Idle mặc định (bài 10).

### 4.3 Hai ca âm: redirect_uri lạ và code dùng lại

| Thử | Kết quả trên lab |
|---|---|
| `redirect_uri=http://evil.com/callback` ở request 3 | 400, trang lỗi "Invalid parameter: redirect_uri" (KHÔNG redirect) |
| dùng lại cùng một code lần 2 ở request 8 | `invalid_grant` "Code not valid" |

Ca thứ hai là triệu chứng ở mục 2: gọi lại `curl ... /token` với cùng `$CODE` (biến `REUSE` của script lab). Lab critic thêm hai dòng ở mục 3.4: `redirect_uri` lệch hoặc thiếu ở request 8 trả "Incorrect redirect_uri" và đốt code.

### 4.4 Client credentials

```bash
curl -s -u api-client:api-secret-123 -d grant_type=client_credentials \
  http://localhost:8080/realms/demo/protocol/openid-connect/token
```

`-u` gửi secret theo `client_secret_basic`. Output (bỏ chuỗi `access_token`):

```json
{"expires_in":300,"refresh_expires_in":0,"token_type":"Bearer","not-before-policy":0,"scope":"profile email"}
```

Sai secret:

```
HTTP 401 {"error":"unauthorized_client","error_description":"Invalid client or Invalid client credentials"}
```

Access token dài 1.255 byte, không có `sid`. Latency: p50 **1,58 ms**, p95 2,38 ms (200 lần).

### 4.5 Password grant: client nào còn mở

| Client | Kết quả |
|---|---|
| `api-client` (directAccessGrantsEnabled=false) | `400 unauthorized_client` "Client not allowed for direct access grants" |
| `spa` (tạo bằng API, không set) | `400` cùng lỗi trên — mặc định TẮT |
| **`admin-cli` của realm demo** | **200, ra access token cho alice** — client built-in này có `directAccessGrantsEnabled=true`, `publicClient=true` |

Đáp án ⏸ #3 là **(d)**. Lab đọc cờ của sáu client built-in trong realm mới: `account`, `account-console`, `broker`, `realm-management`, `security-admin-console` đều false, **`admin-cli` true**. Vì `admin-cli` là public client, request chỉ cần `client_id=admin-cli`, username, password: không secret, không trang login.

Mỗi lần thử tốn Keycloak khoảng 13–16 ms (p50 lab, bậc độ lớn), và brute force protection mặc định **tắt** (`bruteForceProtected: false`); bài 20 tính hắn đoán được bao nhiêu lần một ngày.

> **Đo trên lab (critic, 26.8.1).** `kcadm.sh update clients/<admin-cli-id> -r demo -s directAccessGrantsEnabled=false`: password grant qua `admin-cli` của `demo` chuyển từ 200 sang `400 unauthorized_client` "Client not allowed for direct access grants". `kcadm.sh` đăng nhập realm `master` vẫn chạy và vẫn quản trị được `demo`; chỉ lệnh `kcadm.sh config credentials --realm demo --user alice` hỏng với cùng lỗi, vì kcadm đăng nhập bằng password grant qua `admin-cli` của realm được chỉ định.

---

## 5. Tính tay

**Bài 1: code có thể dài bao nhiêu, và vì sao 98.** Lab nói code có dạng `<uuid>.<session id>.<client uuid>`. Một UUID dạng chuẩn dài 36 ký tự; session id trên lab là `x9Q3sH6xPnOTxMbs06KWDphd`, đếm được 24 ký tự. Tổng: 36 + 1 + 24 + 1 + 36 = **98**, khớp `code_len = 98`. Hệ quả: 62 trong 98 ký tự (24 + 2 dấu chấm + 36) không phải bí mật, vì session id nằm ngay trên URL dưới tên `session_state` và client uuid là định danh cấu hình. Độ dài 98 không nói gì về độ khó đoán.

**Bài 2: cửa sổ cho code bị lộ.** Một proxy phía app ghi access log kèm full URL, log được ship về hệ thống tập trung với độ trễ 45 giây; một người có quyền đọc log muốn dùng code của người khác.

- Keycloak: code sống 60 giây, hiện trong log sau 45 giây, còn tối đa 15 giây. Nhưng app thật đã đổi nó ở request 8 ngay sau request 7, và code dùng một lần, nên lúc hiện trong log nó đã chết.
- IdP đặt code sống đúng trần RFC (600 giây): còn 555 giây, kết luận không đổi. **Single-use mới đóng cửa sổ**; thời gian sống là lưới thứ hai cho ca app crash giữa request 7 và 8.
- Access token implicit trên URL: không single-use, sống 900 giây. Hiện trong log sau 45 giây, còn 855 giây gọi API bao nhiêu lần cũng được.

**Bài 3: cache token client credentials.** Một worker gọi API nội bộ 50 lần/giây, mỗi lần xin một token client credentials mới.

- Request tới Keycloak trong một vòng đời token 300 giây: 50 × 300 = **15.000**. Cache token tới gần lúc hết hạn: **1**.
- Không cache thì mỗi lần gọi API cộng thêm khoảng 1,58 ms (p50 lab, localhost, dev mode): 50 × 1,58 = 79 ms chờ Keycloak mỗi giây cho một worker, trước khi tính mạng thật và TLS.
- Không có refresh token, nên "làm mới" là gọi lại grant, sớm hơn `expires_in` một khoảng (ví dụ 30 giây) để request đang bay không mang token vừa hết hạn.

---

## 6. Chuyển giao

1. Một app mobile đăng ký `redirect_uri` là custom scheme `myapp://callback`. Một app độc hại cài cùng máy cũng đăng ký scheme `myapp://`. Hệ điều hành chọn app nào để mở redirect ở request 6 là chuyện Keycloak không kiểm soát được. Trong năm tham số ở mục 3.3, cái nào còn bảo vệ được gì trong ca này, cái nào mất tác dụng hoàn toàn?
2. App của bạn sinh `state` bằng `Date.now()` và lưu nó trong cookie. Kẻ tấn công cần biết gì để vượt qua kiểm tra ở request 7? Nếu app không lưu cookie mà so `state` với một giá trị cố định trong config, kịch bản ba bước ở 3.3 còn chạy được không?
3. Một service gọi API thay mặt nhiều tenant bằng client credentials, đính `X-Tenant-Id` vào header. API tin header đó. Ai trong hệ thống có thể đọc dữ liệu tenant khác, và token client credentials chứng minh được điều gì, không chứng minh được điều gì?
4. Backend đổi code xong, ghi log toàn bộ response token ở mức DEBUG để tiện điều tra lỗi. So với việc proxy ghi URL chứa code (bài tính 2), mức thiệt hại khi log này lộ khác thế nào, theo từng loại token trong response?
5. Bạn đặt timeout của request 8 lên 10 giây để chữa triệu chứng ở mục 2 và bỏ retry. Một ngày Keycloak chậm, request 8 mất 12 giây mới xử lý xong. Người dùng thấy gì, Keycloak còn lại trạng thái gì (code, session), và lần bấm "Sign in" kế tiếp của người dùng đó có tạo thêm một session không?
6. Một SPA là public client, không cấu hình PKCE, đăng ký `redirect_uri` https chính xác, kiểm `state` đúng. Kẻ tấn công không chạm được tới Keycloak, không đọc được cookie, không sửa được trang SPA, nhưng **đọc được URL của request 7** (qua một extension trình duyệt có quyền xem lịch sử tab). Chỉ với những gì đã có trong bài này, hãy chỉ ra hắn cần làm gì, trong bao nhiêu giây, để có access token của nạn nhân, và vì sao `state`, `redirect_uri` và việc code chứa client uuid đều không cứu được. Rồi thử thiết kế một tham số mới, gửi ở request 3 và kiểm ở request 8, khiến code nhặt được vô dụng với hắn mà không cần secret.

---

## 7. Tóm tắt

- OAuth phát giấy ủy quyền tới API, không phát danh tính tới app: access token Keycloak phát cho `spa` có `azp: spa` nhưng `aud: account`.
- Authorization code là khoảng 10 request giữa browser, app, Keycloak, API. Mật khẩu chỉ đi browser tới Keycloak; token chỉ đi back channel.
- `redirect_uri` phải khớp chuỗi chính xác (RFC 9700 MUST). Keycloak 26.8.1 từ chối redirect_uri lạ bằng trang lỗi 400, không redirect.
- `state` chặn việc tiêm code của kẻ tấn công vào phiên nạn nhân. Keycloak chỉ chở `state`; app là bên duy nhất kiểm nó.
- `scope` là lời xin: xin `openid`, Keycloak trả `openid profile email` vì default client scopes. Đọc scope trong response.
- Code dùng một lần (RFC 6749 MUST NOT dùng lại) và sống 60 giây ở Keycloak (mặc định trong code), chặt gấp 10 lần trần 10 phút của RFC. Dùng lại trả `invalid_grant` "Code not valid": request đổi code không được retry mù.
- Đổi code qua back channel để tách "nhận kết quả" (front channel, chịu được rò) khỏi "lĩnh token" (đòi xác thực client). Lập luận này gãy với public client: `spa-nopkce` đổi code thành công chỉ với code và `client_id`.
- Client credentials: chỉ cho confidential client, không refresh token, không user session (lab: `refresh_expires_in: 0`, `jti` tiền tố `trrtcc:`), p50 1,58 ms trên lab. Sai secret Keycloak trả `401 unauthorized_client`, không phải `invalid_client`.
- Implicit: RFC 9700 SHOULD NOT. Token nằm trong URL, không có refresh token, Keycloak cho nó sống 900 giây so với 300.
- Password grant: RFC 9700 MUST NOT, docs Keycloak MUST NOT. Client mới tắt sẵn, nhưng `admin-cli` built-in của mỗi realm vẫn bật, public, không cần secret; discovery vẫn quảng cáo `password` và `implicit`.
- OAuth 2.1 là Internet-Draft (draft-ietf-oauth-v2-1-16, hết hạn 7 March 2027), không phải RFC. Nó bỏ implicit và password grant theo RFC 9700.

→ **Bài 3 — PKCE và OIDC**: câu hỏi cuối của mục 6 là lỗ duy nhất authorization code chưa lấp: code bị chặn giữa đường ở một public client thì sao? PKCE trả lời bằng đúng một tham số gửi ở request 3 và một tham số kiểm ở request 8, rồi OIDC thêm `id_token` để app cuối cùng biết người dùng là ai.
