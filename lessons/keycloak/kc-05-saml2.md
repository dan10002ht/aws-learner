# Bài 5 — SAML 2.0: assertion đi qua trình duyệt, nên mọi thứ phải ký

## 1. Mục tiêu

Sau bài này bạn có thể:

- Đọc metadata IdP của một realm Keycloak (`/protocol/saml/descriptor`) và rút ra đúng bốn thứ một SP cần: `entityID`, chứng chỉ ký, endpoint SSO kèm binding, định dạng NameID.
- Đọc một SAML Response thật dòng-theo-dòng và nói mỗi thuộc tính (`Audience`, `Recipient`, `InResponseTo`, `NotOnOrAfter`, `SessionIndex`) chặn cuộc tấn công nào.
- Giải thích vì sao Response không được đi bằng Redirect binding, chỉ ra công tắc Keycloak làm điều đó (Force POST Binding), và đo được hậu quả khi tắt nó.
- Tính tay kích thước Response theo binding và cửa sổ thời gian một assertion bị đánh cắp còn dùng được.
- Giải thích XML Signature Wrapping bằng cơ chế (tham chiếu theo Id + hai module có hai góc nhìn) và viết được quy tắc kiểm chống nó ở phía SP.
- Map từng khái niệm SAML sang OIDC, và chỉ ra chỗ map không khớp cùng nguyên nhân gốc.

## 2. Triệu chứng

Một SaaS B2B có một app nội bộ cũ viết bằng Java, đăng nhập qua SAML, IdP là Keycloak. Đợt pentest gửi về một phát hiện: trong access log của reverse proxy đứng trước app có những dòng như sau:

```
GET /saml/acs?SAMLResponse=7Zffj5s4EMf%2Flc...&RelayState=rs-42&SigAlg=http%3A%2F%2Fwww.w3.org%2F2001%2F04%2Fxmldsig-more%23rsa-sha256&Signature=...
```

Cả URL dài **1.679 ký tự**. Đội pentest lấy tham số `SAMLResponse`, base64-decode, inflate, ra một tài liệu XML 3.664 byte: assertion của user `alice`, kèm đủ 7 role. Không có gì bị mã hoá.

Dev phụ trách app phản bác: "Có sao đâu. Response có chữ ký RSA-SHA256 trong tham số `Signature`. Ai đọc được log cũng không sửa được một byte nào." Rồi anh mở cấu hình client SAML trên Keycloak và thấy một công tắc tên **Force POST Binding** đang ở OFF. Ai đó đã tắt nó khi nhập cấu hình từ hệ thống cũ.

## ⏸ Dừng lại — đoán trước #1

Dev nói đúng là không sửa được nội dung. Vậy dòng log này nguy hiểm tới mức nào?

```
(a) Không nguy hiểm: chữ ký còn nguyên, nội dung không đổi được, lộ username và role chỉ là rò thông tin.
(b) Nguy hiểm, nhưng chỉ khi kẻ đọc log có private key của Keycloak.
(c) Nguy hiểm: kẻ đọc log kịp trong vài phút có thể gửi nguyên chuỗi đó tới /saml/acs và
    đăng nhập thành alice, nếu SP không nhớ các ID assertion đã dùng.
(d) Lỗi nằm ở SP: bật mã hoá assertion là đủ, không cần đụng binding.
```

## 3. Lý thuyết

### 3.1 Vì sao vẫn còn SAML, và nó khác OIDC từ gốc ở đâu

Đáp án là **(c)**, và để thấy vì sao, cần một điểm khác biệt nằm ở tận gốc giao thức.

SAML 2.0 là giao thức xác thực trao đổi **tài liệu XML** giữa IdP (identity provider, bên xác thực user) và SP (service provider, ứng dụng muốn biết user là ai). Keycloak tự khuyến nghị OIDC cho hầu hết trường hợp; lý do docs nêu để chọn SAML rất thực dụng: ứng dụng sẵn có đã được bảo vệ bằng nó. Bản sai "SAML lỗi thời, Keycloak sắp bỏ" không có chỗ dựa: bản 26.7 vừa đưa step-up authentication cho SAML client lên supported. Thứ bị deprecate là SHA1 và việc Keycloak tự sinh key cho client, không phải SAML.

Điểm khác gốc: trong authorization code flow ở bài 2, token **không đi qua trình duyệt**. Trình duyệt chỉ chở `code`, app đổi `code` lấy token qua back-channel có xác thực client. Trong luồng SAML phổ biến nhất (Web Browser SSO, POST binding), **chính assertion** (tài liệu XML khẳng định "user này là alice, xác thực lúc X, có thuộc tính Y") đi từ Keycloak, qua trình duyệt, tới SP.

Hệ quả kéo theo cả bài: trình duyệt là kênh người dùng (hoặc malware, extension) kiểm soát, nên SP không được tin byte nào trong assertion trừ khi nó được ký, đúng người nhận, đúng thời điểm, và chưa dùng lần nào. Mỗi thuộc tính bạn sắp đọc là câu trả lời cho "nếu kẻ tấn công cầm được tài liệu này thì sao".

<svg viewBox="0 0 720 400" role="img" aria-labelledby="kc5-a-t kc5-a-d" style="width:100%;height:auto">
<title id="kc5-a-t">Luồng SAML SP-initiated với POST binding</title>
<desc id="kc5-a-d">Ba cột Browser, SP và Keycloak. SP chuyển hướng trình duyệt sang Keycloak kèm SAMLRequest, user đăng nhập, Keycloak trả về một form HTML tự submit chứa SAMLResponse, trình duyệt POST nó tới ACS của SP. Không có bước back-channel nào giữa SP và Keycloak.</desc>
<defs><marker id="kc5-a-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor" fill-opacity="0.7"/></marker></defs>
<rect x="60" y="14" width="100" height="28" rx="8" fill="#64748b" fill-opacity="0.25"/>
<text x="110" y="33" text-anchor="middle" font-size="12" fill="currentColor">Browser</text>
<rect x="300" y="14" width="120" height="28" rx="8" fill="#84cc16" fill-opacity="0.25"/>
<text x="360" y="33" text-anchor="middle" font-size="12" fill="currentColor">SP (app Java)</text>
<rect x="560" y="14" width="100" height="28" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="610" y="33" text-anchor="middle" font-size="12" fill="currentColor">Keycloak</text>
<line x1="110" y1="42" x2="110" y2="390" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<line x1="360" y1="42" x2="360" y2="390" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<line x1="610" y1="42" x2="610" y2="390" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<line x1="110" y1="70" x2="356" y2="70" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc5-a-arrow)"/>
<text x="120" y="64" font-size="11" fill="currentColor">1. GET /bao-cao (chưa có phiên)</text>
<line x1="360" y1="104" x2="114" y2="104" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc5-a-arrow)"/>
<text x="120" y="98" font-size="11" fill="currentColor">2. 302 tới Keycloak ?SAMLRequest=...</text>
<line x1="110" y1="138" x2="606" y2="138" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc5-a-arrow)"/>
<text x="120" y="132" font-size="11" fill="currentColor">3. GET /protocol/saml?SAMLRequest=...&amp;RelayState=rs-42 (Redirect binding)</text>
<line x1="610" y1="172" x2="114" y2="172" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc5-a-arrow)"/>
<text x="370" y="166" font-size="11" fill="currentColor">4. 200 form đăng nhập</text>
<line x1="110" y1="206" x2="606" y2="206" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc5-a-arrow)"/>
<text x="370" y="200" font-size="11" fill="currentColor">5. POST username, password</text>
<line x1="610" y1="240" x2="114" y2="240" stroke="#f59e0b" stroke-width="2" marker-end="url(#kc5-a-arrow)"/>
<text x="120" y="234" font-size="11" fill="currentColor">6. 200 HTML form tự submit, ô ẩn SAMLResponse = base64(XML đã ký)</text>
<line x1="110" y1="274" x2="356" y2="274" stroke="#f59e0b" stroke-width="2" marker-end="url(#kc5-a-arrow)"/>
<text x="120" y="268" font-size="11" fill="currentColor">7. POST /saml/acs SAMLResponse=...</text>
<rect x="230" y="290" width="260" height="44" rx="8" fill="#84cc16" fill-opacity="0.18"/>
<text x="360" y="308" text-anchor="middle" font-size="11" fill="currentColor">8. kiểm chữ ký, Audience, Recipient,</text>
<text x="360" y="324" text-anchor="middle" font-size="11" fill="currentColor">InResponseTo, thời gian, ID chưa dùng</text>
<rect x="430" y="346" width="280" height="40" rx="8" fill="#ef4444" fill-opacity="0.15"/>
<text x="570" y="362" text-anchor="middle" font-size="11" fill="currentColor">Không có mũi tên SP - Keycloak nào:</text>
<text x="570" y="378" text-anchor="middle" font-size="11" fill="currentColor">assertion đi trọn qua trình duyệt</text>
</svg>

> **Nguồn.** *"SAML 2.0 is an authentication protocol that exchanges XML documents between authentication servers and applications."* ([server_admin #_saml](https://www.keycloak.org/docs/latest/server_admin/#_saml)); *"For most purposes, Keycloak recommends using OIDC."* ([ref-saml-vs-oidc](https://www.keycloak.org/docs/latest/server_admin/#ref-saml-vs-oidc_server_administration_guide)). Lý do chọn SAML, step-up SAML supported ở 26.7, SHA1 và sinh key deprecated: dòng #4, #167, #14, #21 của `kc-saml-federation.md`.

### 3.2 Binding: ba cách chở cùng một message, và một cách bị cấm cho Response

Binding là quy ước nhét một message SAML vào HTTP.

**Redirect**: XML nén DEFLATE, base64, đặt vào query với tên bắt buộc `SAMLRequest` hoặc `SAMLResponse`, trả bằng 302 hoặc 303. URL không chứa được chữ ký XML nhúng, nên chữ ký bị bóc ra và tính lại trên chuỗi query, kèm tham số `SigAlg`. Đó là bốn tham số trong dòng log ở mục 2.

**POST**: XML base64 (không nén) trong ô ẩn `SAMLResponse` của một form HTML tự submit tới ACS (assertion consumer service, URL của SP nhận Response). Chữ ký nằm **trong** XML.

**Artifact**: trình duyệt chỉ chở một tham chiếu ngắn, SP đổi nó lấy message thật qua back-channel SOAP với IdP.

Bản sai phổ biến: "Redirect với POST chỉ khác cách chở." Web Browser SSO profile của OASIS **cấm** Redirect cho Response, và lý do spec ghi là kích thước: Response thường vượt độ dài URL trình duyệt cho phép. Lý do biến dòng log thành sự cố là lý do thứ hai, nằm ở spec binding: message trong URL lộ qua log HTTP và header `Referer`. Docs Keycloak đứng giữa hai điều này: chương SAML bindings liệt kê Redirect như một trong ba binding được hỗ trợ và mô tả response nằm trong URL, rồi chỉ **khuyến nghị** POST, một lý do là response trong URL có thể bị bắt lại trong log.

Vậy sao Keycloak vẫn gửi Response qua Redirect? Hai dữ kiện ghép lại. Keycloak có **một endpoint** cho mọi request SAML của realm (`/realms/{realm}/protocol/saml`), mọi binding dùng chung. Và mặc định nó **trả lời bằng binding của request gốc**. SP gửi AuthnRequest bằng Redirect (bước 3 trong sơ đồ, phổ biến vì AuthnRequest nhỏ) thì Response cũng về bằng Redirect, trừ khi bật Force POST Binding. Đừng nói "Keycloak tự đúng spec": nó đúng khi công tắc ở ON, và chỉ khi đó.

> **Đo trên lab.** Keycloak 26.8.1 `start-dev`, Java 24, Mac mini M4, chạy 2026-10-15 riêng cho bài này (không nằm trong `kc-lab-protocol.md`; script và output thô: `~/projects/keycloak-lab/tmp-kc05-*`). Client tạo bằng `kcadm.sh create clients -s protocol=saml` không set gì có `saml.force.post.binding: "true"`. Tắt nó rồi đăng nhập SP-initiated, AuthnRequest qua Redirect: `302 Found`, `Location` 1.679 ký tự, 4 tham số `RelayState`, `SAMLResponse`, `SigAlg`, `Signature`. Bật lại: `200 OK`, trang HTML 12.387 byte, ô ẩn `SAMLResponse` 7.808 ký tự.

Đáp án (c) giờ đã rõ. Chữ ký bảo vệ **tính toàn vẹn**, không chống **dùng lại**. Assertion ở đây là bearer: ai trình ra là được coi là chủ. Kẻ đọc log không cần sửa gì, chỉ cần gửi lại nguyên chuỗi trước khi nó hết hạn; lớp chặn còn lại là SP nhớ ID đã dùng (mục 3.3). Đáp án (d) sai vì mã hoá giấu nội dung chứ không làm assertion mất giá trị bearer.

Còn RelayState: spec bảo không vượt 80 byte và nên được bảo vệ toàn vẹn. Keycloak không ép giới hạn này (lab mục 4), nên SP dùng RelayState chở URL quay về phải tự kiểm.

> **Nguồn.** OASIS Profiles: *"The HTTP Redirect binding MUST NOT be used, as the response will typically exceed the URL length permitted by most user agents."* ([saml-profiles-2.0-os.pdf](https://docs.oasis-open.org/security/saml/v2.0/saml-profiles-2.0-os.pdf)). OASIS Bindings: *"Note also that URL-encoded messages may be exposed in a variety of HTTP logs as well as the HTTP "Referer" header."* ([saml-bindings-2.0-os.pdf](https://docs.oasis-open.org/security/saml/v2.0/saml-bindings-2.0-os.pdf)). Keycloak: *"By default, Keycloak responds using the initial SAML binding of the original request."* ([client-saml-configuration](https://www.keycloak.org/docs/latest/server_admin/#_client-saml-configuration)). DEFLATE, tên tham số, `SigAlg`, 302/303, RelayState 80 byte, Artifact: dòng #23–#30; ba binding, một endpoint và khuyến nghị POST: dòng #5–#9.

### 3.3 Đọc assertion: mỗi thuộc tính là một cuộc tấn công đã bị chặn

Đây là assertion thật Keycloak phát cho `alice` (POST binding, NameID persistent), đã bỏ chữ ký và khối role. Đọc từng dòng theo câu hỏi "nếu không có dòng này thì kẻ tấn công làm được gì".

```xml
<saml:Assertion ID="ID_1145fe46-9628-421d-a2ea-3d7f0bac77b4" IssueInstant="2026-10-15T07:05:16.164Z" Version="2.0">
  <saml:Issuer>http://localhost:8080/realms/demo</saml:Issuer>
  <saml:Subject>
    <saml:NameID Format="urn:oasis:names:tc:SAML:2.0:nameid-format:persistent">G-8f7ed06a-ac6e-43ec-9ce4-09304f148517</saml:NameID>
    <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
      <saml:SubjectConfirmationData InResponseTo="_5cb2ffad90e84a838db7c90c8bb041dd"
          NotOnOrAfter="2026-10-15T07:10:14.164Z" Recipient="http://localhost:3000/saml/acs"/>
    </saml:SubjectConfirmation>
  </saml:Subject>
  <saml:Conditions NotBefore="2026-10-15T07:05:14.164Z" NotOnOrAfter="2026-10-15T07:06:14.164Z">
    <saml:AudienceRestriction><saml:Audience>saml-app</saml:Audience></saml:AudienceRestriction>
  </saml:Conditions>
  <saml:AuthnStatement AuthnInstant="2026-10-15T07:05:16.164Z"
      SessionIndex="bkrPkTxyUa0N4tUDN_Yut1fY::9bfd3b04-fedd-418d-90cf-5dc387de4f9d" SessionNotOnOrAfter="2026-10-15T17:05:16.164Z">
    ...
  </saml:AuthnStatement>
  <saml:AttributeStatement> ... 7 x Attribute Name=Role ... </saml:AttributeStatement>
</saml:Assertion>
```

**`Issuer`**: IdP nào phát. Thiếu kiểm, một IdP khác mà SP cũng tin phát assertion cho user của IdP này.

**`Method=...cm:bearer`**: "ai cầm là chủ", gốc của đáp án (c). Mọi phép kiểm dưới đây bù cho việc bearer không chứng minh được người trình ra là ai.

**`Recipient`**: URL ACS đích. SP kiểm nó khớp URL ACS đã thực sự nhận Response, chặn việc đem assertion của endpoint này nộp ở endpoint khác.

**`InResponseTo`**: bằng `ID` của AuthnRequest SP đã gửi (`_5cb2ffad...` do script lab sinh). SP nhớ ID mình phát ra và kiểm khớp, trói Response vào một lần đăng nhập SP đã khởi tạo, giống `nonce` ở bài 3. Thiếu nó, kẻ tấn công nhét assertion của chính hắn vào trình duyệt nạn nhân, nạn nhân làm việc trong tài khoản của kẻ tấn công.

**`AudienceRestriction`**: bắt buộc chứa định danh SP. Ở Keycloak đó là Client ID, và Client ID phải khớp `Issuer` trong AuthnRequest. Chặn SP A (bị chiếm) cầm assertion user nộp cho nó đem sang SP B.

**Hai `NotOnOrAfter`, và không có `NotBefore` trong `SubjectConfirmationData`**: spec cấm `NotBefore` ở chỗ này với bearer, Keycloak tuân thủ. Hai mốc khác nhau là chủ đề mục 5.

**Chống replay**: không thuộc tính nào làm được. SP phải giữ tập ID assertion đã dùng suốt thời gian assertion còn hiệu lực. Đây là phòng tuyến cuối cho dòng log ở mục 2.

**`SessionIndex`**: bắt buộc khi IdP hỗ trợ Single Logout, để SP xin logout đúng phiên. Keycloak dùng dạng `<id phiên>::<uuid client>`. `SessionNotOnOrAfter` cách `AuthnInstant` đúng 36.000 s, bằng `ssoSessionMaxLifespan` 10 giờ của realm lab. Mọi mốc thời gian ở UTC, hậu tố `Z`, theo spec.

**NameID**: định danh user gửi cho SP, và định dạng quyết định SP liên kết tài khoản theo cái gì. Spec bắt *persistent* là giá trị giả ngẫu nhiên, không lộ username, tối đa 256 ký tự; *transient* là giá trị tạm, mờ đục. Bản sai "persistent là username" vỡ ngay trên lab: Keycloak trả `G-8f7ed06a-...`, không phải `alice`, cũng không phải `id` của alice (`df9c8cc1-...`).

> **Đo trên lab.** Cùng máy, cùng ngày. Không gửi `NameIDPolicy`: NameID `Format="...1.1:nameid-format:unspecified"`, giá trị `alice`, vì client mới có `saml_name_id_format: "username"`. Xin `persistent` hai lần đăng nhập liên tiếp: cả hai lần đều `G-8f7ed06a-ac6e-43ec-9ce4-09304f148517`. Xin `transient` hai lần: `G-1515a34c-...` rồi `G-0825d704-...`, đổi mỗi lần. Trong `SubjectConfirmationData` không có `NotBefore`.

> **Nguồn.** OASIS Profiles: *"The service provider MUST ensure that bearer assertions are not replayed, by maintaining the set of used ID values for the length of time for which the assertion would be considered valid"* ([saml-profiles-2.0-os.pdf](https://docs.oasis-open.org/security/saml/v2.0/saml-profiles-2.0-os.pdf)). OASIS Core: *"Persistent name identifiers generated by identity providers MUST be constructed using pseudo-random values that have no discernible correspondence with the subject's actual identifier (for example, username)."* ([saml-core-2.0-os.pdf](https://docs.oasis-open.org/security/saml/v2.0/saml-core-2.0-os.pdf)). Audience, Recipient, InResponseTo, cấm `NotBefore`, Response không yêu cầu không có `InResponseTo`, `SessionIndex`: dòng #34–#39 của `kc-saml-federation.md`; NameID 256 ký tự, transient, UTC: #41, #42, #44; Client ID khớp issuer của AuthnRequest: #11; IdP-initiated tắt khi để trống URL name: #20.

Riêng **IdP-initiated SSO** (user bấm từ portal của IdP, SP không gửi AuthnRequest): Response bị cấm có `InResponseTo`, nên phép kiểm trói Response vào phiên biến mất. Keycloak tắt luồng này cho client chừng nào trường IDP-Initiated SSO URL name còn trống.

### 3.4 Ký cái gì, bằng key nào

Với POST binding, profile bắt buộc assertion bên trong Response phải được ký. Keycloak mặc định làm gì?

> **Đo trên lab.** Client SAML mới có `saml.server.signature: "true"` (ký document) và không có `saml.assertion.signature`. Response POST có đúng một `dsig:Signature`, con của `samlp:Response`, `Reference URI="#ID_5c6a9d83-..."` trỏ `ID` của chính Response, transform `enveloped-signature` + `xml-exc-c14n`, `rsa-sha256`. Assertion không có chữ ký riêng. Bật `saml.assertion.signature=true`: Response có 2 `Reference`, một trỏ Response, một trỏ `ID` của Assertion; XML tăng từ 5.855 lên 7.982 byte. `KeyName` là `3mHTF5s6rtmD58szBEJFbbCn3lsYzgq513M58oADKIU`, trùng `kid` key RS256 trong JWKS (`kc-lab-protocol.md` mục 3).

> **Suy luận.** Docs Keycloak không nói ký Response có thoả câu "assertion MUST be signed" của profile hay không. Về mật mã, chữ ký trên Response phủ cả cây con, kể cả assertion, nên assertion không sửa được. Nhưng SP chỉ tìm chữ ký **trên chính phần tử Assertion** sẽ không thấy nó và từ chối, hoặc tệ hơn, bỏ qua bước kiểm (mục 3.5). Thực tế: hỏi SP đòi chữ ký ở đâu rồi bật "Sign assertions" theo đó. Kiểm bằng: đếm `Reference URI` trong Response nhận được.

Dòng cuối của hộp lab đáng dừng lại: **cùng một key RSA ký cả JWT OIDC lẫn Response SAML** của realm. Xoay key realm (bài 29) đổi chữ ký của cả hai giao thức cùng lúc. Resource server OIDC tự tải lại JWKS; SP SAML thường được dán tay chứng chỉ từ metadata. Chứng chỉ trong metadata lab tự ký, `CN=demo`, RSA 2048 bit, hạn 10 năm (2026-10-15 tới 2036-10-15): không CA nào đứng sau, SP tin nó chỉ vì đã được dán vào.

Các mặc định còn lại: mã hoá assertion (khi bật) dùng AES_256_GCM, key transport RSA-OAEP-11; `KeyName` mặc định KEY_ID, nhưng ADFS đòi CERT_SUBJECT; SHA1 đã deprecated. Bẫy nhỏ: client tạo bằng API có `saml.client.signature: "true"` (mặc định) được Keycloak **tự sinh** chứng chỉ riêng (lab: `CN=saml-bare`, hạn 3 năm), trong khi docs nói sinh key kiểu này đã deprecated, nên sinh ngoài rồi upload.

> **Nguồn.** *"If the HTTP POST binding is used to deliver the <Response>, the enclosed assertion(s) MUST be signed."* ([saml-profiles-2.0-os.pdf](https://docs.oasis-open.org/security/saml/v2.0/saml-profiles-2.0-os.pdf)). Mặc định AES_256_GCM và RSA-OAEP-11, `KeyName` KEY_ID, CERT_SUBJECT cho ADFS, SHA1 deprecated, sinh key deprecated: dòng #14–#18, #21 ([client-saml-configuration](https://www.keycloak.org/docs/latest/server_admin/#_client-saml-configuration)).

## ⏸ Dừng lại — đoán trước #2

SP dùng thư viện verify chữ ký XML chuẩn, trả `true` chỉ khi digest và chữ ký RSA khớp key IdP. Kẻ tấn công có tài khoản thường ở IdP, tức có một Response hợp lệ đã ký về chính hắn (có thể đã hết hạn), không có private key. Hắn đăng nhập thành `admin` được không?

```
(a) Không. Sửa một byte là digest lệch, thư viện trả false.
(b) Không, trừ khi phá được RSA-2048.
(c) Có, nếu thư viện kiểm chữ ký và code đọc NameID nhìn vào HAI phần tử Assertion khác nhau trong cùng một tài liệu.
(d) Có, nhưng chỉ khi IdP dùng SHA1.
```

### 3.5 XML Signature Wrapping: chữ ký đúng, nhưng ký cho phần tử khác

Đáp án là **(c)**. Docs Keycloak không nói gì về lỗ này (server_admin không có từ "wrapping"); nguồn của mục là paper USENIX Security 2012 *On Breaking SAML: Be Whoever You Want to Be* (Somorovsky và cộng sự).

Nhìn lại chữ ký trong lab: `Reference URI="#ID_5c6a9d83-..."`. Chữ ký XML không ký "tài liệu này", nó ký **phần tử có Id bằng giá trị đó**, sau khi bỏ chính khối Signature ra (transform `enveloped-signature`). SAML bắt buộc tham chiếu theo Id. Chữ ký không ràng buộc phần tử đó nằm ở đâu trong cây, nên kẻ tấn công chèn thêm phần tử giả vào tài liệu mà chữ ký vẫn đúng.

Phía SP, xử lý Response gồm hai module: module chữ ký (theo `Reference` tìm phần tử theo Id, băm, so digest, verify RSA) và module claim (tìm `Assertion`, đọc NameID, Audience, thời gian). Hai module thường chỉ trao nhau một Boolean "chữ ký hợp lệ". Không ai báo cho module claim **phần tử nào** vừa được verify.

<svg viewBox="0 0 720 330" role="img" aria-labelledby="kc5-b-t kc5-b-d" style="width:100%;height:auto">
<title id="kc5-b-t">XML Signature Wrapping trên SAML</title>
<desc id="kc5-b-d">Bên trái là Response hợp lệ có Assertion ID A1 về kẻ tấn công kèm chữ ký trỏ tới A1. Bên phải kẻ tấn công thêm Assertion ID EVIL về admin không ký ở vị trí đầu, và bọc Assertion A1 gốc vào một phần tử khác. Module chữ ký đi theo Id A1 nên verify thành công, module claim lấy Assertion đầu tiên nên đọc admin.</desc>
<defs><marker id="kc5-b-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor" fill-opacity="0.7"/></marker></defs>
<text x="20" y="22" font-size="12" font-weight="bold" fill="currentColor">Response gốc (hợp lệ, của kẻ tấn công)</text>
<rect x="20" y="34" width="250" height="150" rx="8" fill="#64748b" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
<text x="32" y="54" font-size="11" fill="currentColor">samlp:Response</text>
<rect x="40" y="66" width="214" height="104" rx="6" fill="#84cc16" fill-opacity="0.22"/>
<text x="52" y="86" font-size="11" fill="currentColor">Assertion ID="A1"</text>
<text x="52" y="104" font-size="11" fill="currentColor">NameID = attacker</text>
<rect x="52" y="116" width="190" height="42" rx="5" fill="#3b82f6" fill-opacity="0.25"/>
<text x="62" y="134" font-size="11" fill="currentColor">Signature</text>
<text x="62" y="150" font-size="11" fill="currentColor">Reference URI="#A1"</text>
<text x="390" y="22" font-size="12" font-weight="bold" fill="currentColor">Response sau khi bọc (wrap)</text>
<rect x="390" y="34" width="310" height="230" rx="8" fill="#64748b" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
<text x="402" y="54" font-size="11" fill="currentColor">samlp:Response</text>
<rect x="410" y="64" width="274" height="50" rx="6" fill="#ef4444" fill-opacity="0.25"/>
<text x="422" y="84" font-size="11" fill="currentColor">Assertion ID="EVIL" (không ký)</text>
<text x="422" y="102" font-size="11" fill="currentColor">NameID = admin</text>
<rect x="410" y="124" width="274" height="128" rx="6" fill="#64748b" fill-opacity="0.18"/>
<text x="422" y="142" font-size="11" fill="currentColor">phần tử bọc do kẻ tấn công chèn</text>
<rect x="426" y="150" width="244" height="94" rx="6" fill="#84cc16" fill-opacity="0.22"/>
<text x="438" y="168" font-size="11" fill="currentColor">Assertion ID="A1" (nguyên bản)</text>
<rect x="438" y="178" width="220" height="56" rx="5" fill="#3b82f6" fill-opacity="0.25"/>
<text x="448" y="198" font-size="11" fill="currentColor">Signature</text>
<text x="448" y="216" font-size="11" fill="currentColor">Reference URI="#A1"</text>
<line x1="270" y1="110" x2="384" y2="110" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc5-b-arrow)"/>
<text x="327" y="102" text-anchor="middle" font-size="11" fill="currentColor">di chuyển</text>
<rect x="20" y="214" width="330" height="48" rx="8" fill="#3b82f6" fill-opacity="0.15"/>
<text x="30" y="234" font-size="11" fill="currentColor">Module chữ ký: tìm Id "A1", băm, verify RSA</text>
<text x="30" y="252" font-size="11" fill="currentColor">kết quả: true (A1 không đổi một byte)</text>
<line x1="350" y1="238" x2="422" y2="200" stroke="#3b82f6" stroke-width="1.5" marker-end="url(#kc5-b-arrow)"/>
<rect x="20" y="274" width="330" height="48" rx="8" fill="#ef4444" fill-opacity="0.15"/>
<text x="30" y="294" font-size="11" fill="currentColor">Module claim: lấy Assertion đầu tiên</text>
<text x="30" y="312" font-size="11" fill="currentColor">kết quả: đăng nhập thành admin</text>
<line x1="350" y1="298" x2="406" y2="96" stroke="#ef4444" stroke-width="1.5" marker-end="url(#kc5-b-arrow)"/>
</svg>

Chuỗi nhân quả: tham chiếu theo Id cho phép phần tử được ký nằm ở bất kỳ đâu → kẻ tấn công dời nó vào chỗ module claim không nhìn → đặt assertion giả vào chỗ module claim nhìn → chữ ký vẫn đúng tuyệt đối, vì phần tử được ký không đổi. Đáp án (a) và (b) sai vì không ai sửa byte nào trong phần đã ký. (d) sai vì thuật toán băm không liên quan, vấn đề là băm **cái gì**.

Ba chi tiết làm XSW đắt hơn bạn nghĩ. Kẻ tấn công không cần chặn mạng: tài khoản thường ở IdP là đủ, và assertion đã hết hạn vẫn làm nguyên liệu được (module claim đọc thời hạn ghi trong assertion giả, không đọc assertion gốc). Ký cả tài liệu không tự động chặn được nó. Paper tìm thấy lỗ này ở 11 trên 14 framework, kể cả Salesforce và Shibboleth. Paper còn mô tả một tấn công riêng, rẻ hơn XSW: *signature exclusion*, xoá hẳn khối Signature, ăn được khi code chỉ kiểm chữ ký **khi có** chữ ký.

Phòng thủ có hai tầng. Tầng thư viện: OpenSAML so Id bước verify dùng với Id assertion được xử lý, và từ chối tài liệu có hai phần tử trùng Id; paper vẫn vượt được bằng một biến thể tinh vi hơn. Tầng nguyên tắc: **chỉ xử lý thứ đã được băm**. Module chữ ký trả về chính cây con đã verify thay vì Boolean, module claim chỉ đọc từ cây đó.

> **Nguồn.** Somorovsky et al., USENIX Security 2012 ([sec12-final91.pdf](https://www.usenix.org/system/files/conference/usenixsecurity12/sec12-final91.pdf)): *"Furthermore, Id-based referencing must be used ([11], Section 5.4.2), which opens the way for XSW attacks."*; *"Consequently, the receiver verifies the XML Signature successfully but the application logic processes the bogus element."*; *"Both modules have different views on the assertion, and they typically only exchange a Boolean value about the validity of the signature."*; *"This could be a single assertion A or a whole document D with an embedded assertion, and its lifetime can be expired."*; *"Contrary to common belief, even signing the whole document does not necessarily protect against them."*; *"Nevertheless, it was possible to overcome these countermeasures with a more sophisticated XSW attack."* Số 11/14, chèn phần tử giả, tài khoản thường là đủ, signature exclusion, OpenSAML và biện pháp only-process-what-is-hashed: dòng #168, #169, #174, #177–#181 của `kc-saml-federation.md`.

> **Suy luận.** XSW là lỗ ở phía **người verify** (SP), không phải người ký. Khi Keycloak là IdP, phần việc của nó là ký đúng; lỗ nằm ở thư viện SAML trong app của bạn. Khi Keycloak đóng vai SP, tức broker một SAML IdP ngoài (bài 15), parser của Keycloak mới là thứ phải chống XSW. Docs Keycloak 26.8.1 không nói gì về điều đó, và bài này không kiểm. Kết quả 11/14 là của các framework năm 2012, không phải số đo trên phiên bản nào đang chạy hôm nay. Kiểm bằng: lấy một Response hợp lệ, dựng các biến thể bọc như sơ đồ, nộp vào SP thật và xem SP đăng nhập thành ai.

### 3.6 Map SAML sang OIDC, và chỗ không khớp

Đặt từng khái niệm SAML vừa gặp cạnh bản OIDC của bài 2–4; cột cuối là chỗ lệch.

Các cặp khớp thẳng, không cần bảng: IdP/SP ↔ OP/RP, `Issuer` ↔ `iss`, AuthnRequest ↔ authorization request, `AttributeStatement` ↔ claim, `SessionIndex` ↔ `sid`.

| SAML | OIDC | Lệch ở đâu |
|---|---|---|
| Client ID ở Keycloak (`entityID` của SP) | `client_id` | SAML dùng nó làm `Audience`; access token OIDC của Keycloak mặc định có `aud: "account"` (bài 4) |
| Metadata XML | Discovery + JWKS | Metadata nhúng chứng chỉ; JWKS là URL SP tự tải lại |
| ACS URL, `Recipient` | `redirect_uri` | Keycloak khớp cả hai với danh sách đã đăng ký |
| `InResponseTo` | `nonce` | Cả hai trói response vào request; IdP-initiated không có |
| `RelayState` | `state` | `state` chống CSRF; RelayState chỉ "nên" được bảo vệ, tối đa 80 byte |
| Assertion | `id_token` | Assertion đi qua trình duyệt; `id_token` trong code flow đi back-channel |
| NameID persistent / transient | `sub` public / pairwise | Discovery lab có `subject_types_supported: ["public","pairwise"]` |
| `NotOnOrAfter` | `exp` | SAML có hai mốc (Conditions và SubjectConfirmationData) |
| XML Signature, tham chiếu theo Id | JWS: ký nguyên chuỗi byte header.payload | Gốc của XSW, xem dưới |
| POST binding | `response_mode=form_post` | Lab: `form_post` có trong `response_modes_supported` |
| Artifact binding | Authorization code | Cả hai: tham chiếu ngắn qua trình duyệt, đổi lấy thật qua back-channel |
| (không có) | Access token, refresh token | SAML Web SSO không có token gọi API |

> **Suy luận.** Không nguồn nào trong bộ nguồn phát biểu bảng này; nó ghép từ dữ kiện của bài này và bài 2–4. Hai dòng có nguyên nhân gốc. (1) JWS ký nguyên chuỗi byte `base64url(header).base64url(payload)`: không có phần tử nào để dời chỗ, nên không có XSW kiểu SAML. XML Signature ký một phần tử chọn bằng Id trong một cây sắp lại được, đó là chỗ hai góc nhìn tách nhau. (2) SAML Web Browser SSO trả lời "user này là ai" cho một website, không phát token cho API. Kiểm bằng: so cấu trúc chữ ký trong Response lab với ba phần của một JWT ở bài 4.

## 4. Lab — Đọc hiện vật thật

Realm `demo`, user `alice` từ `kc-lab-protocol.md` mục 2; máy và ngày như hộp lab mục 3.2.

**Bước 1: tải metadata IdP của realm.**

```bash
curl -s http://localhost:8080/realms/demo/protocol/saml/descriptor | xmllint --format -
```
```xml
<md:EntityDescriptor ... entityID="http://localhost:8080/realms/demo">
  <md:IDPSSODescriptor WantAuthnRequestsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:KeyDescriptor use="signing"><ds:KeyInfo>
        <ds:KeyName>3mHTF5s6rtmD58szBEJFbbCn3lsYzgq513M58oADKIU</ds:KeyName>
        <ds:X509Data><ds:X509Certificate>MIIClzCCAX8CBgGhPlO3mTANBgkqhk...</ds:X509Certificate></ds:X509Data>
    </ds:KeyInfo></md:KeyDescriptor>   <!-- chứng chỉ tự ký CN=demo -->
    <md:ArtifactResolutionService Binding="...bindings:SOAP" Location="http://localhost:8080/realms/demo/protocol/saml/resolve" index="0"/>
    <md:SingleLogoutService Binding="...bindings:HTTP-POST" Location="http://localhost:8080/realms/demo/protocol/saml"/>
    <!-- + 3 SingleLogoutService nữa: HTTP-Redirect, HTTP-Artifact, SOAP, cùng Location -->
    <md:NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:persistent</md:NameIDFormat>
    <!-- + transient, 1.1 unspecified, 1.1 emailAddress -->
    <md:SingleSignOnService Binding="...bindings:HTTP-POST" Location="http://localhost:8080/realms/demo/protocol/saml"/>
    <!-- + HTTP-Redirect, SOAP, HTTP-Artifact, cùng Location -->
  </md:IDPSSODescriptor>
</md:EntityDescriptor>
```

Thấy gì, vì sao: file 3.343 byte. `entityID` trùng `iss` của token OIDC cùng realm. Tám endpoint SSO và SLO cùng một `Location` (một endpoint cho mọi request SAML). `KeyName` là `kid` key RS256 của JWKS. `ArtifactResolutionService` qua SOAP là back-channel của Artifact binding. `WantAuthnRequestsSigned="true"` ở cấp realm, nhưng client `saml-app` tắt `saml.client.signature` vẫn nhận AuthnRequest không ký: cấu hình từng client mới là thứ được áp.

**Bước 2: tạo client SAML và đọc mặc định.**

```bash
kc create clients -r demo -s clientId=saml-bare -s protocol=saml -i     # không set gì
kc get clients/<id> -r demo | jq .attributes
```
```
"saml.force.post.binding": "true", "saml.server.signature": "true", "saml.client.signature": "true",
"saml.signature.algorithm": "RSA_SHA256", "saml_name_id_format": "username", "saml.authnstatement": "true",
"saml.allow.ecp.flow": "false", "saml.signing.certificate": "MIIEoTCC..."   (cert tự sinh, CN=saml-bare)
```

Các bước sau dùng client `saml-app`, ACS `http://localhost:3000/saml/acs`, `saml.client.signature=false` để script khỏi ký AuthnRequest.

**Bước 3: đăng nhập SP-initiated.** Script `tmp-kc05-saml.sh` dựng AuthnRequest, DEFLATE + base64, GET endpoint SAML, POST `alice`/`Passw0rd!` vào form login, giải mã thứ Keycloak trả về.

```
AuthnRequest: xml 390 byte -> deflate 244 byte -> base64 328 ký tự -> URL GET 435 ký tự
Force POST Binding = true:  HTTP/1.1 200 OK, form_html 12.387 byte, action http://localhost:3000/saml/acs,
                            ô: SAMLResponse (7.808 ký tự), RelayState; XML 5.855 byte
Force POST Binding = false: HTTP/1.1 302 Found, Location 1.679 ký tự,
                            tham số: RelayState, SAMLResponse (1.092 ký tự), SigAlg, Signature; XML 3.664 byte
```

Thấy gì: Response qua Redirect **không có** `dsig:Signature` trong XML (chữ ký nằm ở tham số `Signature`, 344 ký tự base64 = 256 byte, đúng một chữ ký RSA-2048), nên XML nhẹ hơn 2.191 byte (phần nhỏ của chênh lệch là NameID: lần POST xin `persistent`, lần Redirect không xin gì nên nhận `alice`). Assertion ở mục 3.3 lấy từ chính lần chạy POST này.

**Bước 4: hai ca âm.**

```
AuthnRequest với AssertionConsumerServiceURL=http://evil.com/acs
  -> trang lỗi, không redirect; event: type="LOGIN_ERROR", clientId="null", error="invalid_redirect_uri"
RelayState dài 200 byte
  -> 200 OK, form trả lại nguyên RelayState 200 byte
```

Vì sao: ACS trong request được khớp với `redirectUris` của client như `redirect_uri` của OIDC (bài 7 mổ luật khớp).

Dọn lab: `kc delete clients/<saml-app-id> -r demo`, dừng Keycloak bằng SIGTERM.

## 5. Tính tay

**Bài 1: kích thước theo binding.** Response POST là 5.855 byte XML. Base64 biến mỗi 3 byte thành 4 ký tự: 5.855 / 3 = 1.951,67, làm tròn lên 1.952 nhóm, nhân 4 = **7.808 ký tự**, khớp lab. Bật thêm ký assertion: 7.982 byte, 7.982 / 3 = 2.660,67 → 2.661 nhóm → **10.644 ký tự**. Response Redirect: tham số `SAMLResponse` 1.092 ký tự base64 giải ra 818 byte đã DEFLATE, từ 3.664 byte XML gốc, tức nén còn 818 / 3.664 = **22,3 %**. XML lặp namespace và tên thẻ (7 khối `Attribute` gần như giống nhau) nên nén tốt. Câu hỏi để tự trả lời: vì sao spec bắt DEFLATE cho Redirect mà không cho POST?

> **Chưa đo.** Spec viện lý do độ dài URL, nhưng URL lab chỉ 1.679 ký tự. Bộ nguồn không có con số giới hạn URL của trình duyệt hay reverse proxy, nên bài không kết luận Response này vừa hay không. Đo bằng: thêm mapper đưa nhiều group/thuộc tính vào assertion, tăng dần tới khi proxy trước SP trả 414 hoặc cắt URL.

**Bài 2: cửa sổ replay của dòng log.** Từ assertion lab: `IssueInstant` 07:05:16,164Z, `Conditions NotBefore` 07:05:14,164Z, `Conditions NotOnOrAfter` 07:06:14,164Z, `SubjectConfirmationData NotOnOrAfter` 07:10:14,164Z.

- `Conditions` cho 60 s tính từ `NotBefore`, tức chỉ **58 s** sau khi phát.
- `SubjectConfirmationData` cho 300 s từ `NotBefore`, tức **298 s** sau khi phát.

Kẻ đọc log lúc 07:08:00Z gửi lại chuỗi. SP kiểm cả hai mốc: 07:08:00 > 07:06:14, từ chối. SP chỉ kiểm mốc trong `SubjectConfirmationData`: 07:08:00 < 07:10:14, còn **134 s** cửa sổ. Lúc này chỉ replay cache cứu được, và nó phải giữ mỗi ID tới mốc hết hạn muộn nhất SP chấp nhận: 300 s. Giả định đỉnh 20 lần đăng nhập/giây (số giả định, không phải số đo): 20 × 300 = **6.000 ID** cùng lúc trong cache, mỗi ID dạng `ID_` + UUID 36 ký tự = 39 ký tự.

> **Đo trên lab.** Đặt `saml.assertion.lifespan=120` cho client: cả `Conditions NotOnOrAfter` lẫn `SubjectConfirmationData NotOnOrAfter` cùng thành `NotBefore` + 120 s (07:05:52,459Z → 07:07:52,459Z). Không đặt: hai mốc là +60 s và +300 s như trên.

> **Suy luận.** Docs nói Assertion Lifespan không đặt thì dùng Access Token Lifespan của realm (300 s trong lab), khớp mốc `SubjectConfirmationData`. Mốc 60 s của `Conditions` trùng `accessCodeLifespan` = 60 của realm, nhưng docs không nói hai giá trị này liên quan; đó là trùng số quan sát được, chưa kiểm bằng cách đổi `accessCodeLifespan`. Nguồn của dòng đầu: *"If not specified the realm Access Token Lifespan is used."* ([client-saml-configuration](https://www.keycloak.org/docs/latest/server_admin/#_client-saml-configuration)).

**Bài 3: đồng hồ lệch.** Response tới SP 0,3 s sau `IssueInstant`. Cửa sổ SP chấp nhận theo `Conditions`, tính theo đồng hồ IdP, là từ `NotBefore` (phát − 2 s) tới `NotOnOrAfter` (phát + 58 s). Đồng hồ SP lệch δ so với IdP thì SP thấy thời điểm nhận là phát + 0,3 + δ.

- Điều kiện không bị "chưa tới hạn": 0,3 + δ ≥ −2 → δ ≥ **−2,3 s**.
- Điều kiện chưa hết hạn: 0,3 + δ < 58 → δ < **57,7 s**.

SP chậm 3 s so với IdP là mọi đăng nhập bị từ chối, trong khi SP nhanh gần một phút vẫn chạy. Bất đối xứng này là lý do NTP trên SP quan trọng không kém trên IdP.

## 6. Chuyển giao

1. Một SP cũ chỉ hỗ trợ IdP-initiated. Liệt kê những phép kiểm ở mục 3.3 còn lại và mất đi, rồi nói cuộc tấn công nào trong bài trở nên khả thi mà trước đó bị chặn.
2. Metadata SP của khách khai hai `AssertionConsumerService`, POST và Redirect, kèm lời dặn "Redirect là mặc định của bên tôi". Bạn cấu hình client Keycloak thế nào, nói gì với khách?
3. Đội bạn đề xuất bỏ chữ ký, chỉ bật mã hoá assertion bằng chứng chỉ của SP, lý do "mã hoá rồi thì ai sửa được". Mã hoá dùng khoá công khai của SP. Lập luận đó vỡ ở đâu?
4. Realm xoay key ký (bài 29). Ba SP SAML đã dán chứng chỉ cũ từ một năm trước, không tự tải lại metadata. Phút đầu sau khi key mới thành active, client OIDC và SP SAML mỗi bên gặp gì?
5. Một assertion có NameID `transient`. SP lưu nó làm khoá chính của bảng `users`. Mô tả triệu chứng mà đội support sẽ nhận được sau một tuần.
6. SP của bạn verify chữ ký bằng một thư viện DOM trả `true`/`false`, rồi một service khác trong cùng app, dùng parser streaming, đọc `//saml:NameID` từ cùng chuỗi XML để tạo phiên. Không được sửa thư viện. Thiết kế bộ test tự động chứng minh app miễn nhiễm với các biến thể XSW kiểu mục 3.5: cần những Response nào, assert điều gì, và vì sao bộ test xanh vẫn chưa chứng minh được app an toàn.

## 7. Tóm tắt

- Web Browser SSO với POST binding: assertion đi trọn qua trình duyệt, không back-channel. Mọi yêu cầu ký và kiểm của SAML mọc từ đây.
- OASIS cấm Redirect binding cho Response. Keycloak mặc định trả lời theo binding của request; client mới có `saml.force.post.binding: "true"`. Tắt nó, lab thấy `302` mang Response trong URL 1.679 ký tự.
- Chữ ký chống sửa, không chống dùng lại. Assertion bearer bị lộ chỉ bị chặn bởi thời hạn và replay cache ID ở SP.
- SP kiểm: chữ ký, `Issuer`, `Audience` (= Client ID), `Recipient` (= ACS), `InResponseTo` (= ID AuthnRequest; IdP-initiated không có), hai mốc `NotOnOrAfter`, ID chưa dùng.
- Mặc định lab: `Conditions` +60 s và `SubjectConfirmationData` +300 s từ `NotBefore` (= phát − 2 s); SP chậm hơn 2,3 s là từ chối.
- Keycloak ký Response, không ký riêng Assertion (bật thêm: 5.855 → 7.982 byte). Một key RS256 ký cả JWT lẫn SAML của realm.
- NameID persistent là `G-<uuid>` ổn định, không phải username; transient đổi mỗi lần.
- XSW: tham chiếu theo Id + hai module hai góc nhìn = chữ ký đúng mà vẫn đăng nhập thành người khác; 11/14 framework năm 2012. Phòng thủ: chỉ xử lý phần đã băm. Docs Keycloak không nói về XSW.
- Map sang OIDC gần 1-1, trừ: SAML không có token gọi API, và JWS ký nguyên chuỗi byte nên không có XSW.

→ **Bài 6 — Kiến trúc Keycloak**: đã thấy một realm phát cả JWT lẫn assertion SAML bằng cùng một key, giờ mở nắp xem key đó, session đó, và cấu hình đó sống ở đâu bên trong tiến trình Quarkus và database.
