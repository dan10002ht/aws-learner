# Bài 3 — PKCE và OIDC

## 1. Mục tiêu

Sau bài này bạn có thể:

- Tính tay 4 ký tự đầu của `code_challenge` từ một `code_verifier` bằng bit, rồi kiểm bằng `python3`.
- Chỉ ra cấu hình client Keycloak 26.8.1 nào thì PKCE **bị server bắt buộc**, cấu hình nào chỉ là "client tự gửi", và dựng request vượt qua loại sau.
- Đọc một `id_token` Keycloak thật, nói mỗi claim giao thức (`iss`, `sub`, `aud`, `exp`, `iat`, `auth_time`, `acr`, `azp`, `nonce`) trả lời câu hỏi gì, và tính lại `at_hash`.
- Phân biệt `state`, `nonce` và PKCE theo ba trục: giá trị quay về ở đâu, ai kiểm, chặn cuộc tấn công nào.
- Lấy discovery và JWKS của một realm bằng `curl`, giải thích vì sao JWKS có 2 khoá trong khi realm có 4 khoá active.
- Giải thích bằng `aud` vì sao `id_token` không được dùng làm Bearer để gọi API.

---

## 2. Triệu chứng

Câu hỏi cuối bài 2 được trả lời bằng thực tế. Một SaaS B2B có SPA là public client trong Keycloak. Đội frontend nâng `keycloak-js`, từ Keycloak 24 adapter này tự gửi PKCE S256: request 3 giờ có `code_challenge=...&code_challenge_method=S256`. Mọi người coi như xong.

Hai tuần sau, báo cáo pentest ghi:

```
Tiền đề : extension trình duyệt đọc được URL các tab (không đọc cookie, không sửa trang).
Bước 1  : gửi nạn nhân link tự dựng  /auth?client_id=spa-web&response_type=code
          &redirect_uri=<redirect đã đăng ký>&state=x   (KHÔNG có code_challenge)
Bước 2  : nạn nhân đăng nhập thật; extension đọc code trên URL callback (dài 98 ký tự)
Bước 3  : POST /token grant_type=authorization_code, client_id, code, redirect_uri
Kết quả : 200, có access_token, refresh_token, id_token của nạn nhân.
```

Không secret, không `code_verifier`, không đụng cookie. SPA thật vẫn gửi PKCE ở mọi lượt login; `redirect_uri` khớp chính xác; `state` được kiểm.

## ⏸ Dừng lại — đoán trước #1

Chọn trước khi đọc tiếp.

**Vì sao token vẫn bị lấy dù SPA đã gửi PKCE S256?**

```
(a) keycloak-js thật ra gửi method plain, nên challenge chính là verifier
(b) Code sống 60 giây, đủ lâu để kẻ tấn công đổi trước SPA
(c) PKCE là ràng buộc của từng request; server không bắt buộc nó, nên request không có challenge vẫn hợp lệ
(d) PKCE không chống được extension đọc URL, chỉ chống app độc hại trên mobile
```

---

## 3. Lý thuyết

### 3.1 PKCE buộc request 3 và request 8 vào cùng một bên

Đáp án là **(c)**.

`security/sec-05-authn-authz.md` đã cho ý tưởng PKCE. Ở đây hỏi tiếp: PKCE ràng **cái gì** vào **cái gì**, ai giữ đầu ràng. Lỗ hở cuối bài 2: với public client, request 8 chỉ chứa `code` và `client_id`, cả hai đã đi qua front channel. RFC 7636 gọi tên cuộc tấn công: *"OAuth 2.0 public clients utilizing the Authorization Code Grant are susceptible to the authorization code interception attack."*

PKCE (Proof Key for Code Exchange) lấp lỗ bằng bí mật do **chính phiên chạy flow** tự sinh. Thứ bị ràng: **code** với **bên đã gửi request 3**; bên kiểm: **Keycloak** ở token endpoint, khác `state` (app kiểm, bài 2).

<step-flow>
<svg viewBox="0 0 760 520" role="img" aria-labelledby="kc3-a-t kc3-a-d" style="width:100%;height:auto">
<title id="kc3-a-t">PKCE S256 khi code bị đọc trộm</title>
<desc id="kc3-a-d">Sơ đồ sequence ba cột: kẻ tấn công đọc được URL, trình duyệt chạy SPA, và Keycloak. SPA sinh verifier V, gửi code_challenge C ở request 3; kẻ tấn công đọc được C và code K nhưng không có V nên lần đổi code của hắn bị từ chối với Code mismatch; lần đổi hỏng đó đã đốt K, nên SPA gửi V đúng sau đó cũng nhận Code not valid: kẻ tấn công không có token nhưng làm hỏng lượt login.</desc>
<defs>
<marker id="kc3-a-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker>
</defs>
<rect x="15" y="15" width="150" height="32" rx="8" fill="#f43f5e" fill-opacity="0.16"/>
<text x="90" y="36" text-anchor="middle" font-size="12" fill="currentColor">Kẻ tấn công</text>
<rect x="245" y="15" width="170" height="32" rx="8" fill="#3b82f6" fill-opacity="0.16"/>
<text x="330" y="36" text-anchor="middle" font-size="12" fill="currentColor">Browser + SPA</text>
<rect x="560" y="15" width="120" height="32" rx="8" fill="#10b981" fill-opacity="0.16"/>
<text x="620" y="36" text-anchor="middle" font-size="12" fill="currentColor">Keycloak</text>
<line x1="90" y1="47" x2="90" y2="470" stroke="currentColor" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="4 4"/>
<line x1="330" y1="47" x2="330" y2="470" stroke="currentColor" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="4 4"/>
<line x1="620" y1="47" x2="620" y2="470" stroke="currentColor" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="4 4"/>
<g data-step="1">
<rect x="190" y="60" width="280" height="30" rx="8" fill="#3b82f6" fill-opacity="0.15"/>
<text x="330" y="80" text-anchor="middle" font-size="11" fill="currentColor">sinh V ngẫu nhiên, giữ trong bộ nhớ; C = S256(V)</text>
</g>
<g data-step="2">
<text x="475" y="115" text-anchor="middle" font-size="11" fill="currentColor">3  GET /auth?...&amp;code_challenge=C&amp;method=S256</text>
<line x1="332" y1="122" x2="616" y2="122" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc3-a-arrow)"/>
<text x="210" y="145" text-anchor="middle" font-size="11" fill="currentColor">đọc URL: có C, không đảo ra V</text>
<line x1="328" y1="152" x2="94" y2="152" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#kc3-a-arrow)"/>
</g>
<g data-step="3">
<rect x="545" y="168" width="150" height="30" rx="8" fill="#10b981" fill-opacity="0.15"/>
<text x="620" y="188" text-anchor="middle" font-size="11" fill="currentColor">lưu C cạnh code K</text>
<text x="475" y="220" text-anchor="middle" font-size="11" fill="currentColor">6  302 /callback?state=…&amp;code=K</text>
<line x1="618" y1="227" x2="334" y2="227" stroke="#f59e0b" stroke-width="2" marker-end="url(#kc3-a-arrow)"/>
<text x="210" y="250" text-anchor="middle" font-size="11" fill="currentColor">đọc URL: có K</text>
<line x1="328" y1="257" x2="94" y2="257" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#kc3-a-arrow)"/>
</g>
<g data-step="4">
<text x="355" y="290" text-anchor="middle" font-size="11" fill="currentColor">8  POST /token code=K, client_id, verifier đoán bừa</text>
<line x1="92" y1="297" x2="616" y2="297" stroke="#ef4444" stroke-width="2" marker-end="url(#kc3-a-arrow)"/>
<text x="355" y="325" text-anchor="middle" font-size="11" fill="currentColor">400 invalid_grant: PKCE verification failed: Code mismatch</text>
<line x1="618" y1="332" x2="94" y2="332" stroke="#ef4444" stroke-width="2" marker-end="url(#kc3-a-arrow)"/>
<rect x="520" y="342" width="200" height="26" rx="8" fill="#f43f5e" fill-opacity="0.15"/>
<text x="620" y="359" text-anchor="middle" font-size="11" fill="currentColor">K đã bị đốt bởi lần đổi hỏng</text>
</g>
<g data-step="5">
<text x="475" y="392" text-anchor="middle" font-size="11" fill="currentColor">8  POST /token code=K + code_verifier=V</text>
<line x1="332" y1="399" x2="616" y2="399" stroke="#8b5cf6" stroke-width="2" marker-end="url(#kc3-a-arrow)"/>
<text x="475" y="430" text-anchor="middle" font-size="11" fill="currentColor">400 invalid_grant: Code not valid</text>
<line x1="618" y1="437" x2="334" y2="437" stroke="#8b5cf6" stroke-width="2" marker-end="url(#kc3-a-arrow)"/>
</g>
<text x="380" y="490" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.8">V không bao giờ đi front channel: kẻ tấn công không có token, nhưng lượt login này hỏng</text>
<text x="380" y="508" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.8">(SPA đổi trước thì nhận 200 và lần đổi của hắn gặp Code not valid)</text>
</svg>
<step-note data-step="1">V không rời bộ nhớ của phiên chạy flow; chỉ C đi ra ngoài.</step-note>
<step-note data-step="2">C nằm trên URL front channel nên kẻ tấn công thấy; SHA256 một chiều nên có C không tính ngược ra V.</step-note>
<step-note data-step="3">Keycloak gắn C vào K lúc phát. K lộ đúng như RFC 7636 tả, nhưng giờ chỉ bên cầm V đổi được K.</step-note>
<step-note data-step="4">Keycloak tính S256 của verifier, so với C: lệch thì từ chối. Code dùng một lần nên lần đổi hỏng đốt luôn K (lab 4.3).</step-note>
<step-note data-step="5">PKCE giữ được token, không giữ được lượt login.</step-note>
</step-flow>

Vì sao triệu chứng ở mục 2 vẫn xảy ra? Ràng buộc chỉ tồn tại khi request 3 **có** C. Kẻ tấn công không phá ràng buộc của SPA thật; hắn dựng request 3 **không có** C. Docs Keycloak, cho client để trống mục PKCE method: *"Keycloak does not apply PKCE unless the client sends the appropriate PKCE parameters to Keycloak authorization endpoint. So PKCE is still possible to use, but it is not required."* Bài 2 (mục 4.2) đã chạy đúng ca này với `spa-nopkce`.

Đặt `pkce.code.challenge.method` thành `S256` thì luật đổi: *"Keycloak applies to the client PKCE whose code challenge method is S256."* Link của kẻ tấn công dừng ngay ở request 3, trước form login (4.3).

**PKCE do client gửi là năng lực, PKCE do server bắt là chính sách.** Chỉ chính sách chặn được kẻ tấn công, vì hắn chọn request nào để gửi. Adapter gửi S256 là phía client: *"The Keycloak JS adapter now sets the pkceMethod option to S256 by default."* Docs không nêu mặc định của mục PKCE method khi tạo client; `spa-nopkce` trên lab là client tạo không đặt nó.

PKCE còn chặn chiều ngược: **tiêm code** (kịch bản của `state` ở bài 2). SPA nạn nhân đổi code của kẻ tấn công kèm V của phiên nạn nhân; V không khớp C mà kẻ tấn công đã gửi cho code ấy, Keycloak từ chối.

> **Suy luận.** Nguồn nêu tấn công chặn code (RFC 7636) và câu RFC 9700 *"In OpenID Connect flows, the nonce parameter provides CSRF protection."*, kèm ghi chú bảng nguồn rằng có PKCE thì có thể dựa vào PKCE. "PKCE chặn tiêm code" suy từ cơ chế: C gắn với code lúc phát, V gắn với phiên sinh ra C. Kiểm bằng: chạy `pkce.sh` hai lần, lấy code của lần A đổi bằng verifier của lần B, kỳ vọng `Code mismatch`.

Mức độ: RFC 9700 viết *"Public clients MUST use PKCE [RFC7636] to this end"* và *"For confidential clients, the use of PKCE [RFC7636] is RECOMMENDED"*. Bản sai "PKCE chỉ dành cho app mobile" sai ở cả hai câu.

> **Nguồn.** [rfc7636](https://www.rfc-editor.org/rfc/rfc7636), [rfc9700](https://www.rfc-editor.org/rfc/rfc9700); hai câu về PKCE method của client: [server_admin, capability config](https://www.keycloak.org/docs/latest/server_admin/index.html#capability-config); adapter JS: [release notes, PKCE enabled by default](https://www.keycloak.org/docs/latest/release_notes/index.html#pkce-enabled-by-default).

### 3.2 S256 tính tay: từ verifier tới challenge

Công thức, nguyên văn RFC 7636: *"S256 code_challenge = BASE64URL-ENCODE(SHA256(ASCII(code_verifier)))"*. Mỗi bước có lý do: ASCII để hai bên hash cùng dãy byte; SHA256 là hàm một chiều, ra đúng 32 byte bất kể verifier dài bao nhiêu; BASE64URL để 32 byte nhị phân đi được trên URL (`-`, `_` thay `+`, `/`, bỏ `=` đệm).

Ví dụ chạy thật (verifier tự chọn cho bài, 43 ký tự):

```
$ python3 -c "import hashlib,base64;v='kc03-verifier-vi-du-cho-bai-hoc-pkce-S256ab';\
print(base64.urlsafe_b64encode(hashlib.sha256(v.encode('ascii')).digest()).rstrip(b'=').decode())"
luTKIduCKtsOoU9YVDov8p9kOiXkrXBIIUSgh-SyVFc
```

SHA256 của verifier này bắt đầu bằng 3 byte `96 e4 ca`. Tính tay 4 ký tự đầu của C:

```
byte   : 0x96      0xe4      0xca
bit    : 10010110  11100100  11001010
nhóm 6 : 100101 | 101110 | 010011 | 001010
giá trị:   37       46       19       10
bảng   : A-Z = 0..25, a-z = 26..51  ->  l  u  T  K
```

Ra `luTK`, khớp 4 ký tự đầu của output. Base64url gom 3 byte thành 4 ký tự; 32 byte cho ra 43 ký tự (tính ở mục 5).

Chỗ hay sai khi tự cài: dùng `base64` thường hoặc quên bỏ `=`. Server so chuỗi, lệch một ký tự là lỗi lab ghi khi verifier sai: `400 invalid_grant` "PKCE verification failed: Code mismatch".

Verifier dài bao nhiêu: *"with a minimum length of 43 characters and a maximum length of 128 characters."* Script lab dùng `secrets.token_urlsafe(48)`: 48 byte ngẫu nhiên, ra 64 ký tự, nằm giữa hai mốc.

> **Đo trên lab.** Keycloak 26.8.1 `start-dev`, Mac mini Apple M4, 2026-10-15: `pkce.sh` tính challenge bằng đúng biểu thức trên và Keycloak đổi code thành công, trả kèm `id_token` (4.2). Cặp V/C ví dụ là phép tính `python3` của bài, không phải output Keycloak.

### 3.3 Vì sao `plain` tồn tại, và vì sao S256 loại nó

PKCE có hai method. Với `plain`, challenge **chính là** verifier: C = V. Discovery của realm lab vẫn quảng cáo cả hai: `"code_challenge_methods_supported": ["plain","S256"]`.

Bản sai nghe hợp lý: "plain vẫn có verifier ở request 8, vậy cũng chống chặn code". Đúng với kẻ **chỉ** thấy URL callback. Nhưng request 3 đi cùng kênh với request 7: cùng thanh địa chỉ, cùng lịch sử, cùng tầm với của extension trong triệu chứng. Với `plain`, URL request 3 chứa sẵn V: nhận K ở request 7, lấy V ở request 3, đổi thành công. S256 sống được vì C trên URL là hash một chiều.

Vậy `plain` để làm gì? RFC 7636 viết: *"If the client is capable of using "S256", it MUST use "S256", as "S256" is Mandatory To Implement (MTI) on the server."*

> **Suy luận.** Câu MUST trên chỉ có nghĩa nếu tồn tại client **không** làm được S256; `plain` là đường lùi cho client đó. Bảng nguồn không chép đoạn RFC nói client nào. Với client trình duyệt và backend hiện đại có sẵn thư viện SHA-256, điều kiện "capable" thoả, nên MUST S256 áp dụng. Kiểm bằng: grep thư viện OAuth đang dùng xem nó có còn nhánh gửi `plain` không.

Keycloak 26.8.1 thực thi luật này ở cấu hình client: đặt `S256` thì `plain` bị từ chối ngay request 3 (lab: `302 error=invalid_request` "code challenge method is not matching the configured one"). Cấu hình S256 vừa bắt có PKCE, vừa bắt đúng method.

## ⏸ Dừng lại — đoán trước #2

PKCE đã xong: SPA giờ đổi code an toàn, nhận về `access_token` (1.381 byte) và giải mã nó ra được `sub`, `email`, `preferred_username` của alice. Đội frontend dùng các claim đó để hiện "Xin chào Alice" và gán user vào phiên app.

**Vì sao cách này sai, xét theo những gì đã có trong token lab?**

```
(a) Access token được mã hoá, SPA không được phép decode
(b) Access token không ghi địa chỉ cho SPA: aud của nó là "account", không phải spa
(c) Access token không có sub, chỉ id_token mới có
(d) Không sai: access token và id_token chứa cùng claim, dùng cái nào cũng được
```

### 3.4 OIDC thêm một tờ giấy ghi địa chỉ cho app

Đáp án là **(b)**. Access token lab có `"azp":"spa"` nhưng `"aud":"account"` (bài 2): giấy ủy quyền gửi resource server. Nó cũng không mang gì gắn với **phiên login này** của app: không có `nonce` (từ Keycloak 25, *"Claim nonce is added only to the ID token now. It is not added to a regular access token or lightweight access token."*).

OpenID Connect sửa đúng chỗ đó: *"The primary extension that OpenID Connect makes to OAuth 2.0 to enable End-Users to be Authenticated is the ID Token data structure."* Nó không đổi flow: cùng 10 request của bài 2, cùng PKCE, chỉ thêm scope ở request 3: *"OpenID Connect requests MUST contain the openid scope value."* Lab: auth code với `scope=openid` trả `id_token`; client credentials chỉ có `"scope":"profile email"`, không `id_token`.

Theo thứ tự app cần: `id_token` là giấy ghi địa chỉ cho chính app (3.5); `nonce` ràng giấy đó vào lượt login đã sinh ra nó (3.6); userinfo, discovery, JWKS là chỗ hỏi thêm, chỗ tìm endpoint, chỗ lấy khoá (3.7, 3.8).

> **Nguồn.** [openid-connect-core](https://openid.net/specs/openid-connect-core-1_0.html) cho `openid` scope và ID token; [Keycloak release notes](https://www.keycloak.org/docs/latest/release_notes/index.html) cho `nonce` chỉ nằm trong ID token.

### 3.5 Đọc một `id_token` thật

ID token lab (client `spa`, auth code + PKCE, `nonce=n456`), 1.073 byte, ký RS256 cùng `kid` với access token. Payload, đã bỏ claim hồ sơ:

```json
{"exp":1792047380,"iat":1792047080,"auth_time":1792047080,
 "iss":"http://localhost:8080/realms/demo","aud":"spa",
 "sub":"df9c8cc1-eb77-4617-8584-cce052754da1","typ":"ID","azp":"spa",
 "nonce":"n456","sid":"x9Q3sH6xPnOTxMbs06KWDphd","at_hash":"T47PV_n2UXyEXR3pXS3EoQ","acr":"1"}
```

`claims_supported` trong discovery có 14 tên; bỏ 5 claim hồ sơ còn đúng 9 claim giao thức, mỗi cái trả lời một câu hỏi của app:

| Claim | Câu hỏi | Giá trị lab |
|---|---|---|
| `iss` | Ai phát? Phải trùng `issuer` của discovery (3.8) | `http://localhost:8080/realms/demo` |
| `sub` | Người này là ai? | uuid của alice, trùng `sub` của access token |
| `aud` | Giấy gửi cho ai? | `"spa"` |
| `azp` | Client nào xin? | `"spa"` |
| `exp`, `iat` | Còn hiệu lực không? | `exp - iat` = 300 s |
| `auth_time` | Người dùng xác thực lúc nào? | bằng `iat`: lần này vừa gõ mật khẩu |
| `acr` | Xác thực ở mức nào? (bài 18) | `"1"` |
| `nonce` | Có phải giấy của lượt login này? | `"n456"`, đúng giá trị `pkce.sh` gửi |

OIDC Core đặt luật cho hai dòng: `aud` *"It MUST contain the OAuth 2.0 client_id of the Relying Party as an audience value."*; `exp` *"The current time MUST be before the time represented by the exp Claim."*

> **Suy luận.** Bảng nguồn không chép danh sách claim REQUIRED của OIDC Core và không định nghĩa `sub`, `auth_time`, `acr`, `azp`; cột "câu hỏi" là cách đọc của bài từ tên claim và giá trị lab.

`auth_time == iat` ở trên chỉ vì đây là lần gõ mật khẩu. Khi SSO cấp token mà không hỏi lại mật khẩu, hai số tách nhau:

> **Đo trên lab (critic, 26.8.1).** Cùng cookie jar (một trình duyệt): login `spa-nopkce`, 65 giây sau gọi `/auth` của client thứ hai `spa-b`. Keycloak trả 302 thẳng về callback, không có form login. `id_token` của `spa-b`: `iat - auth_time` = **65**, `sid` trùng `sid` của lượt login đầu, `aud` = `spa-b`, `nonce` = giá trị mới của lượt này. App cần biết "người dùng vừa gõ mật khẩu chưa" (trước thao tác nhạy cảm) đọc `auth_time`, không đọc `iat`.

Ngoài 9 claim trên: `sid` trùng `session_state` ở redirect (phiên SSO, bài 14), và `at_hash`, hash của access token phát cùng lượt (mục 5 tính lại). So với access token: `aud` là `spa` thay vì `account`, `typ` là `"ID"` thay vì `"Bearer"`, và **không có role**. ID token nói ai đăng nhập, không nói được làm gì.

**Có cần kiểm chữ ký `id_token` không?** OIDC Core cho lối tắt khi nhận trực tiếp từ token endpoint: *"the TLS server validation MAY be used to validate the issuer in place of checking the token signature."* Code flow nhận id_token ở request 9, back channel; id_token đến qua front channel thì không có lối tắt này. Validate đầy đủ là bài 4.

> **Nguồn.** [openid-connect-core](https://openid.net/specs/openid-connect-core-1_0.html) cho `aud`, `exp`, TLS thay chữ ký. Payload và `claims_supported` từ file lab (`tok_pkce.json`, `discovery.json`).

### 3.6 `state`, `nonce`, PKCE: ba sợi dây buộc ba thứ khác nhau

Bản sai: "state và nonce là một, có cái này khỏi cần cái kia". Cả hai là chuỗi ngẫu nhiên app sinh ở request 3 rồi so lại. Khác biệt gốc nằm ở **giá trị quay về trong vật gì**:

- `state` quay về **trên URL callback**, không ký: chỉ chứng minh callback thuộc phiên trình duyệt đã bắt đầu flow (app so với cookie, bài 2).
- `nonce` quay về **trong id_token**, phần đã ký RS256: chứng minh *tờ giấy này* được phát cho đúng lượt login app đã khởi động. OIDC Core: *"String value used to associate a Client session with an ID Token, and to mitigate replay attacks."*

Cuộc tấn công `nonce` chặn mà `state` không chặn: kẻ tấn công có một `id_token` hợp lệ của nạn nhân (từ log, chữ ký đúng, `aud` đúng, chưa hết `exp`) và đưa nó vào một phiên **khác**. Callback mới mang `state` đúng của phiên mới; chỉ `nonce` trong token cũ là sai.

> **Suy luận.** OIDC Core chỉ nói `nonce` gắn session với ID token và chống replay; kịch bản "id_token hợp lệ đưa vào phiên khác" là cách đọc cụ thể của câu đó. Hệ quả kiểm chứng được: **Keycloak không kiểm `nonce`**, nó chép giá trị request 3 vào token (lab gửi `n456`, nhận `"nonce":"n456"`). App không so `nonce` thì không lỗi nào hiện ra.

Gom cả ba:

| | `state` | `nonce` | PKCE |
|---|---|---|---|
| Quay về ở đâu | URL callback, không ký | trong `id_token`, có chữ ký | không quay về; Keycloak giữ C |
| Ai kiểm | app, so với cookie | app, so với giá trị lưu trong phiên, sau khi tin được id_token | **Keycloak**, ở token endpoint |
| Chặn | callback/code của kẻ khác đi vào phiên trình duyệt này | `id_token` của lượt login khác được chấp nhận ở phiên này | code bị chặn rồi đem đổi; code tiêm vào phiên khác |
| Lab | gửi `st123`, nhận lại `st123` | gửi `n456`, `id_token` chứa `n456`, access token không có | verifier sai: `Code mismatch` |

Ba dòng "chặn" chồng nhau một phần (RFC 9700 cho `nonce` và PKCE gánh chống CSRF trong OIDC), nhưng ba giá trị nằm ở ba vật khác nhau: bỏ một cái là mất đúng một vị trí kiểm.

## ⏸ Dừng lại — đoán trước #3

`kcadm.sh get keys -r demo` liệt kê **4 khoá active** của realm: RS256 (ký), RSA-OAEP (mã hoá), HS512 (ký, đối xứng), AES (mã hoá, đối xứng).

**JWKS endpoint công khai của realm trả về mấy khoá?**

```
(a) 4: JWKS là danh sách mọi khoá active
(b) 1: chỉ khoá RS256, vì chỉ nó ký token
(c) 2: chỉ hai khoá RSA
(d) 0 cho tới khi bật một tuỳ chọn công khai khoá
```

### 3.7 Userinfo: hỏi lại server thay vì tin tờ giấy

Userinfo trả claim về người dùng khi app trình access token. OIDC Core xếp nó là tài nguyên được bảo vệ: *"The UserInfo Endpoint is an OAuth 2.0 Protected Resource that returns Claims about the authenticated End-User."* Docs Keycloak nói cùng ý: *"The userinfo endpoint returns standard claims about the authenticated user; this endpoint is protected by a bearer token."*

Claim hồ sơ đã có trong `id_token` thì userinfo để làm gì? Lab trả lời bằng hành vi: userinfo **hỏi trạng thái phiên phía server**, còn `id_token` là ảnh chụp lúc phát. Sau logout, access token còn 300 giây tới `exp` nhưng userinfo trả `401` `user_session_not_found` (bài 1). Giá: mỗi lần gọi một round trip, và phải là access token thường (từ 26.6.2, *"Now, the UserInfo endpoint returns a 401 Unauthorized error when called with a lightweight access token."*).

### 3.8 Discovery và JWKS: app tự tìm mọi thứ từ một URL

**Discovery** là tài liệu JSON ở đường dẫn cố định của realm, liệt kê endpoint và năng lực server: `/realms/{realm-name}/.well-known/openid-configuration` (không còn tiền tố `/auth`). Cấu hình app chỉ cần issuer; thư viện tự đọc ra mọi endpoint và `jwks_uri`. Hai luật làm nó thành mỏ neo:

- `issuer` của discovery *"This also MUST be identical to the iss Claim value in ID Tokens issued from this Issuer."* Lab: `"issuer": "http://localhost:8080/realms/demo"`, trùng từng ký tự `iss` của id_token. Đặt Keycloak sau proxy mà URL công khai lệch URL Keycloak tự thấy là lệch ngay ở đây (bài 31).
- `jwks_uri` là bắt buộc: *"jwks_uri REQUIRED. URL of the OP's JWK Set"*.

**JWKS** (JSON Web Key Set) là tập public key, mỗi khoá có `kid` để token chỉ ra nó được ký bằng khoá nào. Keycloak: *"The certificate endpoint returns the public keys enabled by the realm, encoded as a JSON Web Key (JWK)."*

Đáp án ⏸ #3 là **(c)**, và chữ "public" trong câu docs là toàn bộ lý do. Hai khoá RSA là cặp bất đối xứng: phần public công bố được, private ở lại Keycloak. HS512 và AES là khoá đối xứng: cùng một khoá vừa ký vừa kiểm, vừa mã hoá vừa giải mã. Công bố nó là công bố bí mật: ai có cũng ký được token giả.

Hệ quả cho bài 4: thứ Keycloak ký bằng HS512 (refresh token; mặc định trong code 26.8.1 *"public static final String INTERNAL_SIGNATURE_ALGORITHM = Algorithm.HS512;"*) thì không ai ngoài Keycloak kiểm được.

> **Nguồn.** [oidc-layers](https://www.keycloak.org/securing-apps/oidc-layers) (discovery, userinfo, certs); [openid-connect-discovery](https://openid.net/specs/openid-connect-discovery-1_0.html); [upgrading](https://www.keycloak.org/docs/latest/upgrading/index.html#userinfo-endpoint-rejects-lightweight-access-tokens) (lightweight token); [Constants.java#L69](https://github.com/keycloak/keycloak/blob/26.8.1/server-spi-private/src/main/java/org/keycloak/models/Constants.java#L69) (HS512).

### 3.9 Đừng cầm `id_token` đi gọi API

Gửi `id_token` làm Bearer tới API có vẻ tiện: ký đúng, có `sub`. Chỗ chặn là `aud`:

- ID token ghi địa chỉ cho app: *"The ID Token typically contains only a single audience, the client ID for which the token was issued, a requirement of the OpenID Connect specification."* Lab: `"aud":"spa"`.
- Keycloak cố ý giữ access token khác chỗ đó: *"The frontend client itself is not automatically added to the access token audience, therefore allowing easy differentiation between the access token and the ID token, since the access token will not contain the client for which the token is issued as an audience."*
- RFC 7519 buộc bên nhận từ chối JWT không ghi địa chỉ cho mình: *"If the principal processing the claim does not identify itself with a value in the "aud" claim when this claim is present, then the JWT MUST be rejected."*

API kiểm `aud` thấy `spa`, không phải tên mình, và từ chối. API **không** kiểm `aud` thì nhận cả id_token: mọi app nhận id_token của user đều cầm được một "vé" gọi API đó. Kiểm `aud` cho đúng với `aud: account` mặc định của Keycloak là bài 4 và bài 9.

> **Nguồn.** [server_admin, audience](https://www.keycloak.org/docs/latest/server_admin/index.html#_audience_hardcoded); [audience resolve](https://www.keycloak.org/docs/latest/server_admin/index.html#_audience_resolve); [rfc7519](https://www.rfc-editor.org/rfc/rfc7519).

---

## 4. Lab

> **Đo trên lab.** Keycloak 26.8.1 (Quarkus 3.40.1) `start-dev`, H2 dev-file, cổng 8080; OpenJDK 24.0.2; Mac mini Apple M4 10 core, 16 GB RAM; chạy 2026-10-15. Realm `demo`, user `alice`. Client `spa` (public, đặt `pkce.code.challenge.method=S256`), `spa-nopkce` (public, không đặt PKCE method). Script và output thô: `~/projects/keycloak-lab/lab1/`.

### 4.1 Bật PKCE bắt buộc cho một client

```bash
kc update clients/<spa-id> -r demo -s 'attributes={"pkce.code.challenge.method":"S256"}'
kc get clients/<spa-id> -r demo | jq .attributes
```

`kc` là wrapper của `kcadm.sh`. Bẫy lab ghi lại: `kc get clients/<id> --fields attributes` trả `{}` dù attribute đã có, dễ kết luận sai rằng client chưa bắt PKCE.

### 4.2 Flow đầy đủ với PKCE và nonce

Phần lõi của `pkce.sh` (bỏ bước bóc form login và nhánh biến môi trường; bước đăng nhập giống bài 2):

```bash
VER=$(python3 -c "import secrets;print(secrets.token_urlsafe(48))")
CH=$(python3 -c "import hashlib,base64,sys;print(base64.urlsafe_b64encode(hashlib.sha256(sys.argv[1].encode()).digest()).rstrip(b'=').decode())" "$VER")
AUTHURL="$B/auth?client_id=spa&response_type=code&scope=openid&redirect_uri=...&state=st123&nonce=n456&code_challenge=$CH&code_challenge_method=S256"
curl -s -X POST $B/token -d grant_type=authorization_code -d client_id=spa \
  -d code="$CODE" -d redirect_uri=http://localhost:3000/callback -d code_verifier="$VER"
```

Redirect trả `state=st123&session_state=...&iss=...&code=...`, token response có `id_token` (output như bài 2, mục 4.2). Đáng đọc là thứ **vắng mặt**: `code_challenge` và `nonce` không quay lại trên URL; challenge nằm lại ở Keycloak, nonce sẽ nằm trong `id_token`.

### 4.3 Các ca âm của PKCE

| Thử | Kết quả trên lab | Lỗi hiện ở |
|---|---|---|
| `spa`, `code_verifier` sai | `400 invalid_grant` "PKCE verification failed: Code mismatch" | token endpoint |
| `spa` (S256) không gửi `code_challenge` | `302` về redirect_uri, `error=invalid_request`, "Missing parameter: code_challenge_method" | request 3, trước form login |
| `spa` gửi `code_challenge_method=plain` | `302 error=invalid_request` "code challenge method is not matching the configured one" | request 3 |
| `spa-nopkce` không gửi challenge, lúc đổi code lại gửi verifier | `invalid_grant` "PKCE code verifier specified but challenge not present in authorization" | token endpoint |
| `spa-nopkce` gửi challenge S256, lúc đổi code **không** gửi verifier (critic) | `400 invalid_grant` "PKCE code verifier not specified" | token endpoint |
| `spa`, verifier sai, rồi cùng code với verifier đúng (critic) | lần 1 "PKCE verification failed: Code mismatch"; lần 2 `400 invalid_grant` "Code not valid" | token endpoint |

Dòng 2 là cách chặn triệu chứng ở mục 2 (ca không PKCE đổi thành công là bài 2, mục 4.2). Log server cho dòng 2 và 3 (trích `kc.log`):

```
INFO  [...AuthorizationEndpointChecker] PKCE enforced Client without code challenge method.
WARN  [org.keycloak.events] type="LOGIN_ERROR", clientId="spa", error="invalid_request",
      reason="Missing parameter: code_challenge_method", response_type="code"
INFO  [...AuthorizationEndpointChecker] PKCE enforced Client code challenge method is not matching the configured one.
```

Dòng 4 và 5 cho thấy Keycloak từ chối mọi lệch giữa request 3 và request 8, theo cả hai chiều: verifier đến mà không có challenge để so, hoặc challenge đã lưu mà verifier không đến. Dòng 6 là lý do sơ đồ 3.1 kết thúc bằng lỗi ở cả hai phía.

> **Đo trên lab (critic, 26.8.1).** `start-dev` cổng 7700, realm dựng giống lab gốc. Dòng 5: gửi `code_challenge` + `method=S256` ở `/auth` của `spa-nopkce`, đổi code không kèm verifier: `400 invalid_grant` "PKCE code verifier not specified"; gửi lại cùng code kèm verifier đúng: "Code not valid". Dòng 6: verifier sai trả "Code mismatch", rồi verifier đúng trên cùng code trả "Code not valid"; lượt đối chứng gửi verifier đúng ngay lần đầu trả 200. Script: `~/projects/keycloak-lab/tmp-critic-kc03-cases.py`.

### 4.4 Đọc `id_token`

`jq -r .id_token tok_pkce.json | python3 jwt.py` (tách ba phần, base64url-decode header và payload) cho payload ở 3.5, `"bytes": 1073`, header `{"alg":"RS256","typ":"JWT","kid":"3mHTF5s6rtmD58szBEJFbbCn3lsYzgq513M58oADKIU"}`, chữ ký 342 ký tự base64url. Cùng lệnh trên access token cho `"aud":"account"`, `"typ":"Bearer"`, không có `nonce`, cùng `kid`.

### 4.5 Discovery, JWKS và khoá của realm

```bash
curl -s $REALM/.well-known/openid-configuration | jq '{issuer, jwks_uri, code_challenge_methods_supported}'
curl -s $REALM/protocol/openid-connect/certs | jq -c '.keys[]|{kid,kty,alg,use}'
```

Discovery có `"issuer": "http://localhost:8080/realms/demo"` (trùng `iss` của id_token) và `"code_challenge_methods_supported": ["plain","S256"]`. JWKS:

```
{"kid":"3mHTF5s6rtmD58szBEJFbbCn3lsYzgq513M58oADKIU","kty":"RSA","alg":"RS256","use":"sig"}
{"kid":"TxVrxFadUB2OT4PIQ05yP4Es3CgZr3xlZUo-pU5oIkE","kty":"RSA","alg":"RSA-OAEP","use":"enc"}
```

`kc get keys -r demo` liệt kê 4 khoá active; JWKS thiếu đúng hai khoá `OCT` (đối xứng). `kid` RS256 trùng `kid` trong header của access token lẫn id_token: bài 4 dùng nó để chọn khoá kiểm chữ ký. Modulus `n` dài 342 ký tự base64url, 2048 bit, `e = 65537`. Còn `plain` trong `code_challenge_methods_supported` dù `spa` từ chối `plain`: như `grant_types_supported` ở bài 2, đó là năng lực server, không phải chính sách client.

### 4.6 Userinfo trước và sau logout

```bash
curl -s -H "Authorization: Bearer $AT" $REALM/protocol/openid-connect/userinfo
```

```json
{"sub":"df9c8cc1-...","email_verified":true,"name":"Alice Nguyen","preferred_username":"alice",
 "given_name":"Alice","family_name":"Nguyen","email":"alice@example.com"}
```

Sau logout, cùng access token nhận `401` `error_description="user_session_not_found"` (bài 1, mục 3.5). Response userinfo không có `iss`, `aud`, `nonce`: nó trả lời "người này là ai", không phải "tờ giấy này gửi cho ai".

---

## 5. Tính tay

**Bài 1: vì sao verifier tối thiểu 43 ký tự, và challenge luôn dài 43.** Base64url mã hoá 6 bit mỗi ký tự, không đệm.

- SHA-256 ra 256 bit; 256 / 6 = 42,67, nên cần 43 ký tự: 42 ký tự đầy đủ mang 252 bit, ký tự thứ 43 mang 4 bit cuối. Mọi `code_challenge` S256 dài đúng 43, kể cả khi verifier dài 128.
- Verifier 43 ký tự mang 43 × 6 = 258 bit, đủ chứa 32 byte (256 bit) ngẫu nhiên: ngang đầu ra SHA-256. Mốc 128 ký tự ứng với 128 × 6 / 8 = 96 byte.
- `token_urlsafe(48)` trên lab: 48 × 8 = 384 bit, 384 / 6 = 64 ký tự.

> **Suy luận.** RFC chỉ cho hai mốc 43 và 128; liên hệ "43 ký tự = 32 byte ngẫu nhiên" là phép tính của bài, không phải lý do RFC ghi. Kiểm bằng `python3`: `secrets.token_bytes(32)` mã hoá base64url ra 43 ký tự.

**Bài 2: tính lại `at_hash` của id_token lab.** `T47PV_n2UXyEXR3pXS3EoQ` dài 22 ký tự: 22 × 6 = 132 bit chứa vừa 128 bit = 16 byte (21 × 6 = 126 không đủ). 16 byte là nửa trái của 32 byte SHA-256. Giả thuyết: `at_hash` = base64url(16 byte đầu của SHA256(access_token)). Kiểm:

```
$ python3 -I tmp-kc03-pkce.py      # đọc lab1/tok_pkce.json
at_hash calc T47PV_n2UXyEXR3pXS3EoQ
id at_hash T47PV_n2UXyEXR3pXS3EoQ len AT 1381 len ID 1073
```

Khớp: id_token ràng vào **đúng** access token phát cùng lượt; thay access token khác thì hash lệch.

> **Suy luận.** Công thức `at_hash` không có trong bảng nguồn; nó suy từ độ dài 22 ký tự và được xác nhận bằng `python3` trên token thật của lab (`~/projects/keycloak-lab/tmp-kc03-pkce.py`). Với `alg` khác RS256 chưa kiểm.

**Bài 3: ba kẻ tấn công, ba cấu hình.** Client public, `redirect_uri` và `state` làm đúng. Mỗi ô: kẻ tấn công lấy được token không?

| Kẻ tấn công thấy được | không PKCE | SPA gửi `plain` | SPA gửi S256, server không bắt | client đặt S256 |
|---|---|---|---|---|
| A: chỉ URL callback (request 7) | **Có** | Không: thiếu V | Không | Không |
| B: URL request 3 và 7 | **Có** | **Có**: V nằm trên URL request 3 | Không: chỉ thấy C | Không |
| C: như B, và tự gửi được link cho nạn nhân | **Có** | **Có** | **Có**: link không có challenge (mục 2) | Không: link dừng ở request 3 |

Mọi ô "Có" ở hàng A, B kèm điều kiện: đổi K **trước** SPA thật (code dùng một lần) và trong 60 giây. Hàng C không vướng điều kiện đó: link do hắn dựng không có SPA nào chờ đổi code. Hai ô "Có" ở cột `plain` và cột "server không bắt" là hai lý do đặt `S256` ở client: nó vừa bắt có PKCE, vừa từ chối `plain`.

---

## 6. Chuyển giao

1. Backend Spring là confidential client, có secret, vẫn gửi PKCE S256. Đồng nghiệp bảo PKCE thừa. Dựa vào tấn công tiêm code ở 3.1, chỉ ra một kịch bản secret không cứu được mà PKCE cứu được.
2. App lưu `nonce` chung cookie với `state`. Kẻ tấn công đọc được cookie đó nhưng không có cookie phiên Keycloak. Trong ba sợi dây ở 3.6, sợi nào đứt, sợi nào còn?
3. Một mobile app sinh `code_verifier` một lần lúc cài và dùng lại cho mọi lượt login "cho đỡ tốn pin". Kẻ tấn công nào ở bài tính 3 giờ thắng, cần thêm điều kiện gì?
4. Realm đổi sang khoá ký mới. Vài phút đầu, một app báo lỗi kiểm chữ ký `id_token`, app khác không. Từ cách `kid` nối header token với JWKS (4.5), app lỗi đã làm gì với JWKS mà app kia không làm?
5. API nội bộ nhận cả access token lẫn id_token "cho tiện", chỉ kiểm chữ ký và `exp`, đọc `realm_access.roles` để phân quyền. Với id_token của alice, API thấy role gì? Lỗ này nguy hiểm hơn hay ít hơn bạn nghĩ?
6. Realm thứ hai `partner` trên host khác cũng ký RS256. App của bạn kiểm chữ ký `id_token` bằng mọi khoá trong một JWKS gộp từ hai realm, kiểm `aud` và `nonce`, không kiểm `iss`. Dựng chuỗi bước để người dùng `partner` vào app dưới `sub` của một người dùng `demo`, hoặc chứng minh không làm được. Trong `aud`, `nonce`, `at_hash`, `sid` và tham số `iss` trên URL redirect (RFC 9207, bài 2), cái nào chặn được chuỗi đó, cái nào chỉ có tác dụng khi app đã tự kiểm `iss`?

---

## 7. Tóm tắt

- PKCE ràng code với bên đã gửi request 3; Keycloak kiểm ở token endpoint. Nó chặn chặn-code và, theo cơ chế, tiêm code. Lần đổi hỏng đốt code (lab critic): kẻ tấn công không lấy được token nhưng phá được lượt login.
- PKCE do client gửi là năng lực, do server bắt là chính sách. Để trống PKCE method thì request không PKCE vẫn đổi được code (lab: `spa-nopkce`); đặt `S256` thì bị chặn ngay request 3.
- S256 = `BASE64URL(SHA256(ASCII(verifier)))`: challenge luôn 43 ký tự, verifier 43 đến 128. `plain` đặt C = V nên thua kẻ đọc được URL request 3; Keycloak đặt S256 thì từ chối `plain`.
- OIDC không đổi flow: thêm `scope=openid` (MUST), nhận `id_token`. ID token lab 1.073 byte, `aud: spa`, `typ: ID`, có `nonce` và `at_hash`, không có role. `at_hash` khớp nửa trái SHA-256 của access token lab.
- `state` quay về trên URL không ký, app so với cookie; `nonce` quay về trong id_token có chữ ký, app so với phiên; PKCE không quay về, Keycloak so. Keycloak không kiểm `state` lẫn `nonce`.
- Userinfo hỏi trạng thái phiên: sau logout trả 401 `user_session_not_found` dù access token còn 300 s.
- Discovery lab 56 field; `issuer` phải trùng `iss`. JWKS có 2 khoá RSA, realm có 4 khoá active: HS512 và AES đối xứng, công bố là lộ bí mật.
- Không dùng id_token làm Bearer: `aud` của nó là client_id của app, Keycloak cố ý để access token không chứa client đó, và RFC 7519 buộc bên không có trong `aud` từ chối.

→ **Bài 4 — Token: JWT, opaque, và validate cho đúng**: đã có `kid`, JWKS và ba loại token trong tay; bài sau mổ cả ba ở mức byte và trả lời câu bài này bỏ ngỏ: resource server kiểm đúng những gì, tự kiểm hay hỏi Keycloak, và vì sao token vẫn qua được sau logout.
