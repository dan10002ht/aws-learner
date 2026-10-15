# Bài 18 — Authentication flow: browser flow, requirement và step-up

## 1. Mục tiêu

Sau bài này bạn có thể:

- In cây execution của một flow bằng `kcadm.sh get authentication/flows/<alias>/executions` và đọc đúng từng dòng: cấp, thứ tự, requirement, execution hay sub-flow, requirement nào được phép chọn.
- Áp luật đánh giá một cấp (REQUIRED, ALTERNATIVE, CONDITIONAL, DISABLED) để đoán trước một user cụ thể thấy màn nào, rồi kiểm bằng một lần đăng nhập không qua trình duyệt.
- Chỉ ra cấu hình làm OTP "không bao giờ hiện" và sửa nó bằng sub-flow thay vì xếp execution cạnh nhau.
- Copy built-in flow, sửa bản copy, gắn nó cho cả realm hoặc chỉ một client qua `authenticationFlowBindingOverrides`.
- Dựng step-up hai mức (LoA 1 = mật khẩu, LoA 2 = OTP) với ACR-to-LoA mapping, xin mức bằng `acr_values` hoặc `claims`, và giải thích vì sao app vẫn phải tự kiểm `acr`.
- Tính tay `acr` và chuỗi màn hình cho một user theo dòng thời gian khi biết Max Age của từng mức.

---

## 2. Triệu chứng

Một app thương mại điện tử có trang "đổi tài khoản ngân hàng nhận tiền" cho merchant. Yêu cầu: vào trang đó phải qua OTP. Realm đã có user dùng OTP từ trước.

Dev copy flow `browser` thành `browser-wrong`, vào sub-flow `forms`, xoá sub-flow 2FA có điều kiện vì "rối", thêm thẳng `OTP Form` và `WebAuthn Authenticator`, đặt cả hai ALTERNATIVE bên cạnh `Username Password Form` (REQUIRED). Ý định: nhập mật khẩu rồi được chọn OTP hoặc khoá bảo mật. Gắn flow cho client `web`. QA đăng nhập bằng bob, người đã cài OTP: một màn mật khẩu, rồi vào thẳng.

Dev quay lại flow `browser` mặc định (có OTP cho người đã cài) và cho app gửi `acr_values=gold` khi mở trang ngân hàng. Lần này bob thấy form mật khẩu lẫn form OTP. Nhưng token vẫn ghi `"acr": "silver"`, đoạn code kiểm `acr == "gold"` của app đá bob ra, vòng lặp đăng nhập không dứt.

> **Đo trên lab (chạy riêng cho bài này).** Keycloak 26.8.1 `start-dev` cổng 6500 (management 7500), Java 24, Mac mini Apple M4. Realm `stepup`, ACR map `{"silver":1,"gold":2}`, client public `web`, bob có OTP. Flow `browser-wrong`: bob qua **1 màn** `kc-form-login`, ID token `"acr": "silver"`. Flow `browser` mặc định với `acr_values=gold`: **2 màn** (`kc-form-login`, `kc-otp-login-form`), ID token vẫn `"acr": "silver"`. Xin `gold` bằng `claims` với `essential: true`: cùng kết quả, không lỗi. Critic đo thêm: cùng session xin `gold` lần nữa thì phải nhập **lại cả mật khẩu lẫn OTP**, vẫn `silver`: đó là vòng lặp.

---

## ⏸ Dừng lại — đoán trước #1

Trong `browser-wrong`, sub-flow `forms` có ba execution cùng cấp, lab in theo thứ tự: `OTP Form` (ALTERNATIVE), `WebAuthn Authenticator` (ALTERNATIVE), `Username Password Form` (REQUIRED). Hai ALTERNATIVE đứng **trước**. Vì sao bob không bao giờ thấy form OTP?

```
(a) OTP Form chỉ chạy khi user chưa có mật khẩu
(b) Ở một cấp đã có REQUIRED thì mọi ALTERNATIVE cùng cấp bị bỏ qua, bất kể thứ tự
(c) Hai ALTERNATIVE triệt tiêu nhau, Keycloak không biết chọn cái nào nên bỏ cả hai
(d) Flow copy từ built-in bị khoá, thay đổi chưa có hiệu lực
```

---

## 3. Lý thuyết

### 3.1 Flow là một cây, không phải một danh sách

Docs định nghĩa: *"An authentication flow is a container of authentications, screens, and actions, during log in, registration, and other Keycloak workflows."* Mỗi phần tử là một **execution**: hoặc một authenticator (một bước cụ thể như kiểm cookie, hiện form mật khẩu), hoặc một **sub-flow** (nhóm execution có requirement riêng). Sub-flow lồng sub-flow, nên flow là cây.

Realm mới có 7 flow top-level, mỗi flow gắn vào một "cửa": `browser`, `direct grant`, `registration`, `reset credentials`, `first broker login`, `docker auth` (loại `basic-flow`) và `clients` (loại `client-flow`, dùng xác thực ứng dụng chứ không phải người). Bài này mổ `browser`, flow chạy khi trình duyệt tới `/auth`. Cây thật của 26.8.1, in bằng `kcadm` (lệnh ở 4.1):

```
cấp thứ tự requirement | execution                            | provider
0 0 ALTERNATIVE | Cookie                                      | auth-cookie
0 1 DISABLED    | Kerberos                                    | auth-spnego
0 2 ALTERNATIVE | Identity Provider Redirector                | identity-provider-redirector
0 3 ALTERNATIVE | Organization                                | (sub-flow)
1 0   CONDITIONAL | Browser - Conditional Organization        | (sub-flow, 2 execution con)
0 4 ALTERNATIVE | forms                                       | (sub-flow)
1 0   REQUIRED    | Username Password Form                    | auth-username-password-form
1 1   CONDITIONAL | Browser - Conditional 2FA                 | (sub-flow)
2 0     REQUIRED    | Condition - user configured             | conditional-user-configured
2 1     REQUIRED    | Condition - credential                  | conditional-credential
2 2     ALTERNATIVE | OTP Form                                | auth-otp-form
2 3     DISABLED    | WebAuthn Authenticator                  | webauthn-authenticator
2 4     DISABLED    | Recovery Authentication Code Form       | auth-recovery-authn-code-form
```

Cột "cấp" là độ sâu. Cấp 0 có năm phần tử, hai là sub-flow. Muốn biết user đi qua bước nào, phải đánh giá **từng cấp** theo luật requirement rồi mới đi xuống sub-flow được chọn. Organization (bài 17) không hiện màn nào khi realm chưa bật Organizations; Identity Provider Redirector (phía server của `kc_idp_hint`, bài 15) không làm gì khi realm không có IdP.

Trường `requirementChoices` của API ghi requirement **được phép**: `Username Password Form` chỉ `REQUIRED`; hai `Condition - ...` chỉ `REQUIRED, DISABLED`; authenticator thường `REQUIRED, ALTERNATIVE, DISABLED`; chỉ sub-flow có thêm `CONDITIONAL`.

### 3.2 Bốn requirement và luật đánh giá một cấp

Đáp án ⏸ #1 là **(b)**. Bốn requirement, mỗi cái một câu:

- **REQUIRED**: phải chạy và phải thành công; các REQUIRED cùng cấp chạy tuần tự, một cái thất bại thì cả flow dừng.
- **ALTERNATIVE**: chỉ cần một phần tử thành công là cấp đó thành công; Keycloak thử theo thứ tự, gặp cái thành công đầu tiên thì dừng.
- **DISABLED**: không chạy, không tính vào kết quả.
- **CONDITIONAL**: chỉ đặt được cho sub-flow; Keycloak đánh giá các execution `Condition - ...` bên trong, tất cả đúng thì sub-flow như REQUIRED, một cái sai thì như DISABLED.

Chỗ quyết định là cách hai loại đầu sống chung. Luật một cấp, viết thành thuật toán:

```
cho một cấp:
  R = các phần tử REQUIRED + các sub-flow CONDITIONAL có mọi condition đúng
  nếu R không rỗng:  chạy lần lượt từng phần tử trong R; một cái fail -> flow fail
                     các ALTERNATIVE cùng cấp: KHÔNG chạy
  ngược lại:         thử lần lượt các ALTERNATIVE; cái đầu tiên thành công -> cấp thành công
```

REQUIRED "nuốt" ALTERNATIVE vì một cấp chỉ cần một câu trả lời "thành công hay không", và REQUIRED đã đủ để trả lời. Thứ tự hiển thị không cứu được: luật áp lên tập phần tử của cấp, không lên vị trí.

Áp vào `browser-wrong`: `forms` có `Username Password Form` REQUIRED nên `R` khác rỗng, OTP Form và WebAuthn bị bỏ. Ý định "mật khẩu rồi chọn một trong hai" cần **hai cấp**: mật khẩu ở cấp trên, "OTP hoặc WebAuthn" đóng vào một sub-flow REQUIRED, bên trong đó hai cái là ALTERNATIVE của nhau. Flow mặc định làm đúng vậy với `Browser - Conditional 2FA`: OTP Form ALTERNATIVE nhưng nằm ở cấp 2, nơi không có REQUIRED nào ngoài hai condition.

Hai condition đó: `Condition - user configured` làm sub-flow 2FA chỉ chạy khi user đã cài OTP. `Condition - credential` mang config `{"credentials": "webauthn-passwordless"}` (lab); docs mô tả hệ quả khi bật passkeys: 2FA chỉ hiện khi user đăng nhập bằng mật khẩu. Passkey là chuyện bài 19.

Một chi tiết lab ngoài docs: Admin REST API **nhận** CONDITIONAL cho authenticator thường. `PUT .../flows/loa2/executions` với `{"id": <OTP Form>, "requirement": "CONDITIONAL"}` trả `204`, đọc lại thấy `OTP Form CONDITIONAL`, dù `requirementChoices` không có giá trị đó. Console không cho chọn; script import thì ghi vào được.

> **Đo trên lab (critic, 26.8.1).** OTP Form CONDITIONAL trong `loa2`, xin `gold`. User đã có OTP: form mật khẩu, form OTP, `acr` `gold`, tức chạy y như REQUIRED. User chưa có OTP: **không** có màn cài như REQUIRED, mà trang lỗi HTTP 400 *Cannot login, credential setup required.*, event `LOGIN_ERROR error="invalid_user_credentials"`.

> **Nguồn.** Server Administration Guide, mục Authentication flows ([_authentication-flows](https://www.keycloak.org/docs/latest/server_admin/index.html#_authentication-flows)): *"All Required elements in the flow must be successfully sequentially executed. The flow terminates if a required element fails."* *"Only a single element must successfully execute for the flow to evaluate as successful."* *"Because the Required flow elements are sufficient to mark a flow as successful, any Alternative flow element within a flow containing Required flow elements will not execute."* *"The element does not count to mark a flow as successful."* *"This requirement type is only set on sub-flows."* *"If all executions evaluate as true, the Conditional sub-flow acts as Required."* *"If any executions evaluate as false, the Conditional sub-flow acts as Disabled."* *"The Browser - Conditional 2FA sub-flow executes only when the user has a configured OTP credential."* *"The type client is used only for the authentication of clients (applications). For all other cases, choose basic."* Passkeys ([passkeys_server_administration_guide](https://www.keycloak.org/docs/latest/server_admin/index.html#passkeys_server_administration_guide)): *"So now, when passkeys are enabled in the realm, 2FA is only presented if the user introduced a common password to login, not if a passkey was used."*

### 3.3 Cookie đứng đầu vì nó là SSO

Cấp 0 của `browser` toàn ALTERNATIVE (Kerberos DISABLED). Theo luật 3.2, Keycloak thử từ trên xuống, cái đầu tiên thành công thì dừng cả cấp, nên thứ tự là thứ tự ưu tiên. Cookie đứng số 0: trình duyệt mang cookie SSO (`KEYCLOAK_IDENTITY`, bài 14) trỏ tới một user session còn sống thì `auth-cookie` thành công ngay, không execution nào khác ở cấp 0 chạy, kể cả `forms`. Docs: *"Since the cookie provider returned success and each execution at this level of the flow is alternative, Keycloak does not perform any other execution."*

Đặt Cookie xuống cuối thì `forms` được thử trước và luôn hiện form mật khẩu: SSO giữa các app trong realm mất. Đặt một execution REQUIRED ở cấp 0 còn tệ hơn: Cookie không bao giờ chạy nữa (mục 5.3).

SSO cookie còn để lại dấu trên token. Lab 4.2: alice đăng nhập bằng mật khẩu, ID token `"acr": "1"`. Cùng cookie jar gọi lại `/auth`: **302 thẳng về callback**, không màn nào, ID token mới `"acr": "0"`, `auth_time` giữ nguyên. "1" là "vừa xác thực một bước"; "0" là "được cho qua bằng session có sẵn, request này không chứng minh gì thêm". Lúc đó realm chưa có ACR map; mục 3.5 cho thấy giá trị này đổi khi flow có điều kiện LoA (đặt map thôi thì chưa đủ, mục 5.1).

<svg viewBox="0 0 700 360" role="img" aria-labelledby="kc18-a-t kc18-a-d" style="width:100%;height:auto">
<title id="kc18-a-t">Đánh giá browser flow cho ba user</title>
<desc id="kc18-a-d">Cây browser flow của Keycloak 26.8.1 theo cấp, mỗi dòng ghi requirement, bên phải ghi user nào dừng ở đâu: carol dừng ở Cookie, alice đi qua form mật khẩu rồi sub-flow 2FA bị tắt vì chưa có OTP, bob đi tiếp vào OTP Form.</desc>
<rect x="10" y="10" width="330" height="22" rx="6" fill="#64748b" fill-opacity="0.25"/>
<text x="20" y="25" font-size="11" fill="currentColor">browser (top-level, basic-flow)</text>
<rect x="30" y="42" width="310" height="22" rx="6" fill="#84cc16" fill-opacity="0.25"/>
<text x="40" y="57" font-size="11" fill="currentColor">0.0 Cookie  ALTERNATIVE</text>
<rect x="30" y="70" width="310" height="22" rx="6" fill="#64748b" fill-opacity="0.15"/>
<text x="40" y="85" font-size="11" fill="currentColor">0.1 Kerberos  DISABLED</text>
<rect x="30" y="98" width="310" height="22" rx="6" fill="#3b82f6" fill-opacity="0.2"/>
<text x="40" y="113" font-size="11" fill="currentColor">0.2 Identity Provider Redirector  ALTERNATIVE</text>
<rect x="30" y="126" width="310" height="22" rx="6" fill="#3b82f6" fill-opacity="0.2"/>
<text x="40" y="141" font-size="11" fill="currentColor">0.3 Organization (sub-flow)  ALTERNATIVE</text>
<rect x="30" y="154" width="310" height="22" rx="6" fill="#3b82f6" fill-opacity="0.2"/>
<text x="40" y="169" font-size="11" fill="currentColor">0.4 forms (sub-flow)  ALTERNATIVE</text>
<rect x="60" y="182" width="280" height="22" rx="6" fill="#f59e0b" fill-opacity="0.25"/>
<text x="70" y="197" font-size="11" fill="currentColor">1.0 Username Password Form  REQUIRED</text>
<rect x="60" y="210" width="280" height="22" rx="6" fill="#8b5cf6" fill-opacity="0.25"/>
<text x="70" y="225" font-size="11" fill="currentColor">1.1 Conditional 2FA  CONDITIONAL</text>
<rect x="90" y="238" width="250" height="22" rx="6" fill="#8b5cf6" fill-opacity="0.15"/>
<text x="100" y="253" font-size="11" fill="currentColor">2.0 Condition - user configured</text>
<rect x="90" y="266" width="250" height="22" rx="6" fill="#8b5cf6" fill-opacity="0.15"/>
<text x="100" y="281" font-size="11" fill="currentColor">2.1 Condition - credential</text>
<rect x="90" y="294" width="250" height="22" rx="6" fill="#ef4444" fill-opacity="0.2"/>
<text x="100" y="309" font-size="11" fill="currentColor">2.2 OTP Form  ALTERNATIVE</text>
<rect x="90" y="322" width="250" height="22" rx="6" fill="#64748b" fill-opacity="0.15"/>
<text x="100" y="337" font-size="11" fill="currentColor">2.3-2.4 WebAuthn, Recovery  DISABLED</text>
<line x1="345" y1="53" x2="380" y2="53" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<text x="385" y="57" font-size="11" fill="currentColor">carol: cookie sống, thành công, dừng cả cấp 0</text>
<line x1="345" y1="113" x2="380" y2="113" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<text x="385" y="117" font-size="11" fill="currentColor">không có IdP mặc định: không làm gì, thử tiếp</text>
<line x1="345" y1="193" x2="380" y2="193" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<text x="385" y="197" font-size="11" fill="currentColor">alice, bob: màn 1 = form mật khẩu</text>
<line x1="345" y1="225" x2="380" y2="225" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<text x="385" y="229" font-size="11" fill="currentColor">alice: chưa có OTP, condition sai, như DISABLED</text>
<line x1="345" y1="305" x2="380" y2="305" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<text x="385" y="309" font-size="11" fill="currentColor">bob: condition đúng, màn 2 = form OTP</text>
</svg>

### 3.4 Gắn flow: cho realm hay cho một client

Lab không sửa flow built-in (`builtIn: true`) mà copy (`POST .../flows/browser/copy`, `newName=browser-stepup`) rồi sửa bản copy, để flow gốc còn nguyên cho các client khác. Hai quan sát:

- Mọi sub-flow đổi tên theo tiền tố: `forms` thành `browser-stepup forms`. Alias có dấu cách nên path API phải URL-encode (`browser-stepup%20forms`); quên thì `kcadm` báo `Illegal character in path`.
- Execution và sub-flow mới thêm vào có requirement mặc định **DISABLED** (trừ `Username Password Form`, vốn chỉ có REQUIRED). Quên đặt requirement thì flow trông đủ trên console nhưng bước đó không chạy.

| Tầng | Trường | Ảnh hưởng | Lab |
|---|---|---|---|
| Realm | `browserFlow` | Mọi client không override | vẫn là `browser` |
| Client | `authenticationFlowBindingOverrides.browser` | Chỉ client đó | id của `browser-stepup`, gắn cho `web` |

Override theo client cho thử flow mới mà không làm hỏng đăng nhập của app khác. Giá trị là **id** flow, không phải alias.

> **Suy luận.** Nguồn không mô tả ca hai client gắn hai browser flow khác nhau dùng chung một SSO session. Từ 3.3: Cookie cấp 0 cho qua nếu session sống, nên flow "chặt" của client B không chạy lại bước nào cho user đã đăng nhập ở A. Muốn B đòi thêm bước thì phải báo "mức" của session chưa đủ: việc của step-up. Kiểm bằng: đăng nhập A, dùng cùng cookie jar gọi `/auth` của B.

---

## ⏸ Dừng lại — đoán trước #2

Realm có ACR map `{"silver":1,"gold":2}`. Client `web` dùng flow `browser` **mặc định**. Bob đã cài OTP. App gửi `acr_values=gold`. Bob nhập mật khẩu, rồi OTP đúng. ID token ghi `acr` bằng gì?

```
(a) "gold", vì bob vừa qua hai yếu tố và app đã xin gold
(b) "2", vì Keycloak đổi tên sang số LoA
(c) "silver", vì flow không có chỗ nào nói OTP là mức 2
(d) Không có token: Keycloak trả lỗi vì không đạt mức được xin
```

---

### 3.5 Step-up: mức xác thực là thứ flow phải khai, Keycloak không tự đếm

Đáp án ⏸ #2 là **(c)**, lab 4.3 đo đúng ca này.

- **`acr`** (Authentication Context Class Reference) là claim trong ID token và access token, nói mức xác thực user đạt được trong lần đăng nhập này; là chuỗi, ý nghĩa do IdP và app thoả thuận.
- **LoA** (Level of Authentication) là số nguyên Keycloak dùng nội bộ. **ACR-to-LoA mapping** nối hai thứ: `gold` là LoA 2. Docs khuyên đặt ở realm (attribute `acr.loa.map`), cũng đặt được ở client.

Vì sao bob nhập OTP mà vẫn "silver"? Keycloak không suy LoA từ loại authenticator đã chạy. Nó chỉ biết một bước thuộc mức nào khi bước đó nằm trong sub-flow có execution **`Condition - Level of Authentication`** với config `loa-condition-level`. Flow mặc định không có condition nào như thế, nên lần đăng nhập đủ mật khẩu được ghi mức 1, ánh xạ ngược ra `silver`. OTP chạy vì `Conditional 2FA` thấy bob đã cài OTP, không vì app xin `gold`.

Cấu trúc step-up lab dựng theo hướng dẫn step-up của docs:

```
browser-stepup (copy từ browser, giữ Cookie ở cấp 0)
  browser-stepup forms   ALTERNATIVE
    loa1                 CONDITIONAL
      Condition - Level of Authentication  REQUIRED  loa-condition-level=1, loa-max-age=36000
      Username Password Form               REQUIRED
    loa2                 CONDITIONAL
      Condition - Level of Authentication  REQUIRED  loa-condition-level=2, loa-max-age=0
      OTP Form                             REQUIRED
```

Cơ chế theo từng request (rút từ các ca lab 4.5; docs chỉ nêu luật xếp thứ tự và Max Age): Keycloak xác định mức được xin từ `acr_values`/`claims` qua ACR map. Mỗi sub-flow LoA có condition đúng khi mức của nó cần cho mức được xin **và** session chưa có mức đó còn hạn. Mức 1 đã đạt trong vòng `loa-max-age` giây thì `loa1` thành DISABLED, user không nhập lại mật khẩu. Vì thế docs yêu cầu xếp sub-flow từ mức thấp lên cao.

**Max Age** là số giây một mức còn được tính sau khi đạt. LoA 1 đặt 36.000 s (10 giờ, bằng SSO Session Max mặc định). LoA 2 đặt 0: mức đó chỉ có hiệu lực cho đúng lần xác thực vừa rồi. Lab: bob xin `gold` hai lần liền trên cùng session, lần hai **vẫn phải nhập OTP** (không phải mật khẩu). Khi không xin mức nào, `acr` ra mức thấp nhất còn hạn (`silver`); docs nói `acr` ra `0` khi không xin mức nào **và** mức đầu đã hết hạn.

**Bản sai thứ nhất: "gửi `acr_values=gold` là chắc có gold".** Tham số nằm trên URL trình duyệt, user sửa thành `silver` hoặc xoá được. Docs gọi `acr_values` là yêu cầu *non-essential*: không đạt thì Keycloak vẫn cấp token và ghi mức đạt được vào `acr`. Lab còn cho thấy yêu cầu essential qua `claims` trên flow **không** có điều kiện LoA cũng trả `silver` không lỗi, và ACR lạ `platinum` bị lờ. Chỉ `claims` essential trên flow **có** điều kiện LoA mà user không đạt mức mới bị từ chối (hộp đo cuối mục), và tham số đó cũng nằm trên URL. Vậy app phải đọc `acr` trong ID token sau khi đổi code, không đủ thì không cho vào; API phía sau (Spring resource server, bài 12) kiểm `acr` trong access token vì cùng lý do.

**Bản sai thứ hai: "OTP Form REQUIRED nên user chưa có OTP bị chặn".** Lab ca [2]: alice chưa cài OTP, xin `gold`. Keycloak không chặn mà hiện màn **cài OTP** (`kc-totp-settings-form`, `You need to set up Mobile Authenticator to activate your account.`). Cài xong là có token `gold`. Docs ghi đúng hành vi này: user được tự thiết lập credential ngay trong lần xác thực. Hệ quả: với user chưa cài OTP, `gold` chỉ chứng minh "người này có mật khẩu và vừa cài một app OTP". Ai có mật khẩu của alice cũng làm được.

Docs không mô tả cách đóng lỗ này. Từ luật 3.2: ghép `Condition - user configured` vào sub-flow mức 2 thì user chưa cài OTP làm condition sai, sub-flow thành DISABLED, mức 2 không đạt. App thấy `acr` thấp thì từ chối và đưa user qua quy trình đăng ký OTP riêng có kiểm soát. Giá phải trả: user chưa cài bị kẹt tới khi đăng ký xong.

> **Đo trên lab (critic, 26.8.1).** Trước khi sửa, dave (chưa có OTP) xin `acr_values=gold` trên `browser-stepup`: form mật khẩu, màn cài OTP, `acr` `gold`, lỗ có thật. Thêm `Condition - user configured` REQUIRED vào `loa2`. erin (chưa có OTP), `acr_values=gold`: **1 màn** mật khẩu, `acr` `silver`. erin, `claims` essential `gold`: HTTP 400 *Authentication requirements not fulfilled*, log `Requested level: 2, Fulfilled level: 1`. bob (có OTP): mật khẩu, OTP, `gold` như cũ.

> **Nguồn.** Step-up ([_step-up-flow](https://www.keycloak.org/docs/latest/server_admin/index.html#_step-up-flow)): *"To use the step-up mechanism, you specify a requested level of authentication (LoA) in your authentication request."* *"You can also use simpler parameter acr_values instead of claims parameter to request particular levels as non-essential."* *"It is possible to configure it at the realm level (recommended) or at the client level."* *"Using Max Age with the value 0 means, that particular level is valid just for this single authentication."* *"Hence after the authentication, clients are encouraged to check the ID Token to double-check that acr in the token corresponds to the expected level."* *"the user is not required to re-authenticate, but acr in the token will have the value 0."* *"In addition, ensure that the subflows with different values of Conditional - Level Of Authentication are ordered starting with the lowest as shown"*. REQUIRED khi user chưa có credential ([_authentication-flows](https://www.keycloak.org/docs/latest/server_admin/index.html#_authentication-flows)): *"the user will be able to set up the particular credential during authentication itself"*.

<svg viewBox="0 0 700 330" role="img" aria-labelledby="kc18-b-t kc18-b-d" style="width:100%;height:auto">
<title id="kc18-b-t">Step-up từ silver lên gold</title>
<desc id="kc18-b-d">Sơ đồ tuần tự: user đã có session silver mở trang nhạy cảm, app chuyển hướng tới Keycloak với acr_values=gold, Keycloak bỏ qua sub-flow mức 1 vì còn hạn và chỉ chạy sub-flow mức 2 hiện form OTP, trả code, app đổi code và kiểm acr bằng gold trước khi cho vào.</desc>
<defs><marker id="kc18-b-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="40" y="10" width="120" height="26" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="100" y="27" text-anchor="middle" font-size="11" fill="currentColor">Trình duyệt</text>
<rect x="290" y="10" width="120" height="26" rx="8" fill="#84cc16" fill-opacity="0.25"/>
<text x="350" y="27" text-anchor="middle" font-size="11" fill="currentColor">App (client web)</text>
<rect x="540" y="10" width="120" height="26" rx="8" fill="#8b5cf6" fill-opacity="0.25"/>
<text x="600" y="27" text-anchor="middle" font-size="11" fill="currentColor">Keycloak</text>
<line x1="100" y1="36" x2="100" y2="320" stroke="currentColor" stroke-opacity="0.3" stroke-width="1"/>
<line x1="350" y1="36" x2="350" y2="320" stroke="currentColor" stroke-opacity="0.3" stroke-width="1"/>
<line x1="600" y1="36" x2="600" y2="320" stroke="currentColor" stroke-opacity="0.3" stroke-width="1"/>
<line x1="100" y1="60" x2="345" y2="60" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc18-b-arrow)"/>
<text x="222" y="54" text-anchor="middle" font-size="11" fill="currentColor">1. GET /bank (phiên app: acr silver)</text>
<line x1="350" y1="90" x2="105" y2="90" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc18-b-arrow)"/>
<text x="222" y="84" text-anchor="middle" font-size="11" fill="currentColor">2. 302 tới /auth?...&amp;acr_values=gold</text>
<line x1="100" y1="120" x2="595" y2="120" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc18-b-arrow)"/>
<text x="350" y="114" text-anchor="middle" font-size="11" fill="currentColor">3. GET /auth kèm cookie KEYCLOAK_IDENTITY</text>
<rect x="430" y="130" width="260" height="40" rx="6" fill="#f59e0b" fill-opacity="0.2"/>
<text x="560" y="146" text-anchor="middle" font-size="11" fill="currentColor">loa1: mức 1 còn trong 36.000 s, bỏ</text>
<text x="560" y="162" text-anchor="middle" font-size="11" fill="currentColor">loa2: chưa có mức 2, chạy OTP Form</text>
<line x1="595" y1="190" x2="105" y2="190" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc18-b-arrow)"/>
<text x="350" y="184" text-anchor="middle" font-size="11" fill="currentColor">4. 200 form OTP (không có form mật khẩu)</text>
<line x1="100" y1="220" x2="595" y2="220" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc18-b-arrow)"/>
<text x="350" y="214" text-anchor="middle" font-size="11" fill="currentColor">5. POST otp=6 chữ số</text>
<line x1="595" y1="250" x2="355" y2="250" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc18-b-arrow)"/>
<text x="475" y="244" text-anchor="middle" font-size="11" fill="currentColor">6. 302 callback?code=...</text>
<line x1="355" y1="280" x2="595" y2="280" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc18-b-arrow)"/>
<text x="475" y="274" text-anchor="middle" font-size="11" fill="currentColor">7. POST /token, nhận id_token acr gold</text>
<rect x="200" y="292" width="300" height="24" rx="6" fill="#ef4444" fill-opacity="0.2"/>
<text x="350" y="308" text-anchor="middle" font-size="11" fill="currentColor">8. app tự kiểm acr == gold rồi mới cho vào</text>
</svg>

---

## ⏸ Dừng lại — đoán trước #3

Bob vừa đạt `gold` lúc 10:00:00 trên `browser-stepup` (LoA 2 Max Age 0). Lúc 10:00:40 anh mở trang khác, app **không** gửi `acr_values`. Lúc 10:01:00 anh quay lại trang ngân hàng, app gửi `acr_values=gold`. Mỗi request hiện màn nào, `acr` ra gì?

```
(a) 10:00:40: không màn, gold.     10:01:00: không màn, gold
(b) 10:00:40: không màn, silver.   10:01:00: form OTP, gold
(c) 10:00:40: form OTP, gold.      10:01:00: form OTP, gold
(d) 10:00:40: không màn, 0.        10:01:00: form mật khẩu và OTP, gold
```

Đáp án nằm ở các ca [4], [6] của lab 4.5.

---

## 4. Lab

Keycloak 26.8.1 `start-dev` ở `~/projects/keycloak-lab/lab-kc18/` (bản copy zip riêng), cổng 6500, management 7500. `kc` = `kcadm.sh "$@" --config lab-kc18/kcadm.config`. Đăng nhập bằng script `tmp-kc18-login.py`: chuỗi `curl -c jar -b jar` của bài 3 (GET `/auth`, POST từng form, theo `Location`, đổi code, decode ID token) viết bằng `urllib`.

> **Đo trên lab.** Keycloak đặt cookie cờ `Secure` cả trên `http://localhost`. `http.cookiejar` của Python không gửi lại cookie Secure qua http, nên lần POST form đầu trả **HTTP 400** trang "Sign in to stepup". Script phải override chính sách cookie.

### 4.1 In browser flow thật

```bash
kc create realms -s realm=stepup -s enabled=true
kc create users -r stepup -s username=alice -s enabled=true ...      # tương tự bob, carol
kc set-password -r stepup --username alice --new-password 'Passw0rd!'
kc create clients -r stepup -s clientId=web -s publicClient=true -s 'redirectUris=[...]'   # localhost:3000/callback
kc get authentication/flows/browser/executions -r stepup > browser-exec.json
jq -r '.[] | [.level, .index, .requirement, .displayName, (.requirementChoices|join(","))] | @tsv' browser-exec.json
```

Output là cây ở 3.1 (15 dòng) cộng cột `requirementChoices` đã bàn ở đó; `kc get authentication/config/<id>` cho config của `Condition - credential` đã trích ở 3.2.

### 4.2 Flow mặc định: SSO cookie và acr

```
== alice lần 1
[1] HTTP 200 form=['kc-form-login']
[2] 302 -> callback (có code)    id_token: acr 1, auth_time 1792049611, sid ZeFaB7sfEHY6UIEfNVhCj_mn
== alice lần 2 cùng jar
[1] 302 -> callback (có code)    id_token: acr 0, auth_time 1792049611, sid ZeFaB7sfEHY6UIEfNVhCj_mn
```

### 4.3 Bob có OTP, flow mặc định, xin gold

Cho bob cài OTP bằng required action (bài 19 nói kỹ):

```bash
kc update users/<bob-id> -r stepup -s 'requiredActions=["CONFIGURE_TOTP"]'
```

Lần đăng nhập đầu, sau form mật khẩu là màn `kc-totp-settings-form`, có trường ẩn `totpSecret` (20 ký tự). Script lưu nó, tự tính mã 6 chữ số và POST lại; `kc get users/<bob-id>/credentials` sau đó có `type: otp`.

Đặt ACR map, đăng nhập lại bằng jar mới:

```bash
kc update realms/stepup -s 'attributes."acr.loa.map"="{\"silver\":1,\"gold\":2}"'
```
```
== [0] flow browser mặc định, bob, acr_values=gold
[1] HTTP 200 form=['kc-form-login']
[2] HTTP 200 form=['kc-otp-login-form']
    màn OTP: nhập mã tính bằng hmac = 624672
[3] 302 -> callback (có code)    id_token: acr silver, auth_time 1792049708
```

Có map nên "1" được đổi ra tên `silver`. Một lần trước đó script gửi lại đúng mã vừa dùng lúc cài đặt (cùng cửa sổ 30 s): Keycloak trả lại form OTP, không cho qua. Mã OTP mặc định không dùng lại được; bài 19 giải thích.

### 4.4 Copy flow, dựng hai mức, gắn cho client

```bash
kc create authentication/flows/browser/copy -r stepup -s newName=browser-stepup
F='browser-stepup%20forms'      # xoá trước Username Password Form và Conditional 2FA trong $F
for n in 1 2; do kc create "authentication/flows/$F/executions/flow" -r stepup \
   -s alias=loa$n -s type=basic-flow -s provider=registration-page-form; done
kc create authentication/flows/loa1/executions/execution -r stepup -s provider=conditional-level-of-authentication
kc create authentication/flows/loa1/executions/execution -r stepup -s provider=auth-username-password-form
# loa2: conditional-level-of-authentication, rồi auth-otp-form
```

Đọc lại: `loa1`, `loa2`, hai condition, OTP Form đều **DISABLED**. `kc update .../executions` để đổi requirement thất bại (`Cannot deserialize value of type ObjectNode from Array value`), vì `kcadm update` GET cả mảng rồi PUT lại mảng. Gọi REST thẳng, mỗi execution một lần:

```bash
curl -X PUT --oauth2-bearer $T -H 'Content-Type: application/json' \
  $KC/admin/realms/stepup/authentication/flows/$F/executions -d '{"id":"<loa1>","requirement":"CONDITIONAL"}'
# 204. Tương tự: loa2 CONDITIONAL; hai condition và OTP Form REQUIRED
kc create authentication/executions/<id condition loa2>/config -r stepup -s alias=loa2-cfg \
  -s 'config={"loa-condition-level":"2","loa-max-age":"0"}'          # loa1-cfg: "1" và "36000"
curl -X PUT ... $KC/admin/realms/stepup/clients/<web-id> -d @override.json             # 204
```

`override.json` là `{"authenticationFlowBindingOverrides":{"browser":"<id browser-stepup>"}}`. Cây sau khi sửa đúng như sơ đồ ở 3.5; realm `browserFlow` vẫn là `browser`.

### 4.5 Chạy các ca step-up

```
[1] alice, jar mới, không xin acr          form-login                        -> acr silver
[2] alice, cùng jar, acr_values=gold        totp-settings (cài OTP)           -> acr gold
[3] bob, jar mới, acr_values=gold           form-login, otp-login             -> acr gold, auth_time 1792049760
[4] bob, cùng jar, gold lần nữa             otp-login + try-another-way       -> acr gold, auth_time 1792049790
[5] bob, cùng jar, acr_values=silver        (302 thẳng)                       -> acr silver
[6] bob, cùng jar, không xin acr            (302 thẳng)                       -> acr silver
[7] bob, jar mới, claims essential gold     form-login, otp-login             -> acr gold
[8] bob, jar mới, acr_values=platinum       form-login                        -> acr silver
```

Access token mang cùng `acr` với ID token trong mọi ca. Đọc từng ca:

- **[3] rồi [4]**: lần đầu cần cả hai mức nên qua cả hai sub-flow. Lần sau mức 1 còn hạn nên chỉ `loa2` chạy. `auth_time` tăng đúng 30 s, khoảng script chờ sang cửa sổ OTP mới.
- **[5], [6]**: không cần mức 2 thì Cookie và mức 1 còn hạn là đủ. `gold` vừa đạt không "dính" vào session vì Max Age 0. Đây là đáp án ⏸ #3: **(b)**.
- **[7], [8]**: `claims` essential cho kết quả như `acr_values`; ACR không có trong map bị lờ, flow chạy như không xin gì.

### 4.6 Bản sai: hai ALTERNATIVE cạnh một REQUIRED

Copy `browser` thành `browser-wrong`, xoá `Conditional 2FA` trong `browser-wrong forms`, thêm `auth-otp-form` và `webauthn-authenticator`, đặt cả hai ALTERNATIVE, gắn override cho `web`:

```
0 4 ALTERNATIVE | browser-wrong forms
1 0 ALTERNATIVE | OTP Form
1 1 ALTERNATIVE | WebAuthn Authenticator
1 2 REQUIRED    | Username Password Form
== [W] bob (có OTP), jar mới
[1] HTTP 200 form=['kc-form-login']
[2] 302 -> callback (có code)    id_token: acr silver
```

Hai ALTERNATIVE đứng trước REQUIRED, vẫn không chạy. Server chỉ báo trong log: `REQUIRED and ALTERNATIVE elements at same level! Those alternative executions will be ignored: [auth-otp-form, webauthn-authenticator]`. Cuối lab dừng Keycloak bằng SIGTERM: `Keycloak stopped in 1.156s`.

---

## 5. Tính tay

### 5.1 Ba user, flow `browser` mặc định

ACR map `{"silver":1,"gold":2}`, flow `browser` không sửa, app không gửi `acr_values`. alice chưa cài OTP, trình duyệt sạch. bob đã cài OTP, trình duyệt sạch. carol đã cài OTP, đăng nhập app này 5 phút trước, session còn sống.

| | Cấp 0 | `forms` | `Conditional 2FA` | Số màn | `acr` |
|---|---|---|---|---|---|
| alice | Cookie fail; IdP Redirector, Organization không làm gì; tới `forms` | form mật khẩu | user configured sai → DISABLED | 1 | `silver` |
| bob | như alice | form mật khẩu | hai condition đúng → REQUIRED; OTP Form là ALTERNATIVE duy nhất còn bật | 2 | `silver` |
| carol | Cookie thành công, dừng cấp 0 | không chạy | không chạy | 0 | `"0"` |

Bob ra `silver` dù qua hai yếu tố (lab 4.3). Carol ra `"0"`, không phải `silver`: map chỉ đổi tên mức mà flow **khai** đạt được, còn lượt qua bằng cookie không khai mức nào.

> **Đo trên lab (critic, 26.8.1).** Realm có map `{"silver":1,"gold":2}`, client `web2` dùng flow `browser` mặc định, user có OTP. Jar mới: mật khẩu, OTP, `acr` `silver`. Cùng jar, không xin `acr`: 302 thẳng, `acr` `"0"` ở cả ID token lẫn access token, `auth_time` giữ nguyên.

### 5.2 Một buổi sáng của bob trên `browser-stepup`

LoA 1 Max Age 36.000 s, LoA 2 Max Age 0, SSO Session Idle 30 phút và Max 10 giờ (mặc định, bài 10). App gửi `acr_values=gold` cho trang ngân hàng, không gửi gì cho trang khác.

| Giờ | Request | Màn | `acr` | Vì sao |
|---|---|---|---|---|
| 09:00:00 | trang chủ, chưa có session | mật khẩu | `silver` | lab [1] |
| 09:20:00 | ngân hàng | OTP | `gold` | mức 1 đạt cách 1.200 s < 36.000 s, chỉ `loa2` chạy (lab [4]) |
| 09:20:30 | ngân hàng, submit thứ hai | OTP | `gold` | Max Age 0 (lab [4]) |
| 09:21:00 | báo cáo | không | `silver` | lab [6] |
| 09:45:00 | ngân hàng | OTP | `gold` | lặng 24 phút < 30 phút idle, session sống |

Biến thể: LoA 2 Max Age 300 s. Dòng 09:20:30 cách lần đạt `gold` 30 s < 300 s: không màn, `gold`. Dòng 09:45 cách 09:20:30 là 1.470 s > 300 s: lại OTP. Cái giá của 300 s: `gold` đạt lúc 09:20:00 dùng được cho một thao tác khác hẳn lúc 09:24:59. App muốn "OTP cho đúng thao tác này" thì chỉ Max Age 0 bảo đảm được.

> **Suy luận.** Biến thể 300 s không chạy trên lab; nó áp nghĩa Max Age từ docs theo đúng cách lab xác nhận cho 0 và 36.000. Kiểm bằng: đặt `loa-max-age` = 300 cho `loa2-cfg`, chạy ca [3] rồi [4] cách nhau dưới 300 s.

### 5.3 REQUIRED ở cấp 0

Admin muốn ép user trong mạng công ty dùng Kerberos, đổi `Kerberos` ở cấp 0 từ DISABLED thành REQUIRED, giữ nguyên phần còn lại. Luật 3.2: `R` = {Kerberos}, khác rỗng, nên Cookie, IdP Redirector, Organization, `forms` (đều ALTERNATIVE) **không chạy**. Hệ quả: SSO cookie bị lờ, mọi `/auth` phải qua Kerberos; máy ngoài domain hay điện thoại không có vé thì không có form mật khẩu để lùi về, flow dừng. "Kerberos nếu có, không thì mật khẩu" đòi Kerberos ALTERNATIVE, sau Cookie và trước `forms`: đúng vị trí mặc định của nó.

> **Suy luận.** Ví dụ chỉ áp hai câu docs về REQUIRED và về ALTERNATIVE cạnh REQUIRED; lab không dựng Kerberos. Kiểm bằng: Kerberos REQUIRED trên flow copy, gọi `/auth` bằng `curl` không có header `Authorization: Negotiate`.

---

## 6. Chuyển giao

1. Merchant thuộc group `finance` phải luôn qua OTP, người khác không bắt buộc. Bộ condition bạn đã thấy không có cái nào biết về group. Bạn tìm execution nào trong danh sách provider của Admin Console, đặt ở cấp nào, và kiểm bằng ba user như 5.1 ra sao?
2. App mobile cũ đăng nhập bằng password grant (`direct grant` flow). Step-up `gold` áp được không, khi flow đó không có màn hình để hiện form OTP? Bạn đọc flow nào để trả lời?
3. API Spring (bài 12) nhận access token cho `POST /payouts`. Viết điều kiện kiểm `acr` ở API, và nêu lý do API không được tin "frontend đã kiểm acr rồi".
4. Đổi ACR map từ `{"silver":1,"gold":2}` sang `{"basic":1,"strong":2}` trên production, trong khi token đang lưu hành và app đang so chuỗi `gold`. Liệt kê thứ gì vỡ, theo thứ tự thời gian.
5. Hai tab của cùng user cùng mở trang ngân hàng (Max Age 0). Tab 1 nhập OTP xong, tab 2 vẫn ở form OTP và nhập đúng mã mới. Chuyện gì xảy ra với session, hai session phía app có cùng `acr` không?
6. Bạn xếp nhầm `loa2` lên trước `loa1`, trái lời dặn của docs. Đoán user mới tinh xin `gold` gặp màn nào theo thứ tự nào, rồi viết thí nghiệm kiểm.
7. Câu khó nhất. Lỗ ở 3.5 đã đóng bằng `Condition - user configured`, nhưng user chưa đăng ký OTP giờ kẹt ở `silver`. Thiết kế đường đăng ký (flow, required action, và nếu cần quy trình vận hành) để user đó cài được OTP mà kẻ chỉ có mật khẩu không đi được cùng đường, tức không mở lại đúng cái lỗ vừa đóng. Rồi trả lời: với token đã phát, resource server có cách nào phân biệt "gold từ OTP cũ" với "gold từ OTP vừa cài" không, và nếu không thì đưa thông tin đó vào token bằng cơ chế nào của bài 9?

---

## 7. Tóm tắt

- Flow là cây execution; kết quả quyết định theo từng cấp, không theo thứ tự danh sách. Realm mới có 7 flow top-level, `clients` là `client-flow`, còn lại `basic-flow`.
- Một cấp có REQUIRED (hoặc sub-flow CONDITIONAL có mọi condition đúng) thì mọi ALTERNATIVE cùng cấp không chạy. Lab: OTP Form và WebAuthn ALTERNATIVE cạnh Username Password Form REQUIRED, bob có OTP vẫn chỉ 1 màn.
- CONDITIONAL chỉ dành cho sub-flow: mọi condition đúng thì như REQUIRED, một cái sai thì như DISABLED. Admin REST API vẫn nhận CONDITIONAL cho authenticator thường (204); lúc chạy nó như REQUIRED với user đã có credential, còn user chưa có thì nhận trang lỗi thay vì màn cài.
- Cookie đứng đầu cấp 0 là SSO: session sống thì 302 thẳng, không màn nào; lab đo `acr` "0", có map hay không (flow không khai LoA).
- Execution mới thêm mặc định DISABLED. Gắn flow ở realm (`browserFlow`) hoặc một client (`authenticationFlowBindingOverrides`, giá trị là id flow).
- Không có `Condition - Level of Authentication` thì password + OTP vẫn ra `silver`, kể cả khi xin `gold` bằng `claims` essential.
- Max Age 0: xin `gold` hai lần liền là hai lần OTP; mức 1 (36.000 s) giữ cho khỏi nhập lại mật khẩu.
- ACR lạ bị lờ, user sửa được `acr_values`: app và API phải tự kiểm `acr` trong token.
- OTP Form REQUIRED với user chưa cài OTP mở màn cài OTP rồi cấp `gold`: lúc đó `gold` không chứng minh yếu tố thứ hai đăng ký từ trước. Thêm `Condition - user configured` vào sub-flow mức 2 thì user đó dừng ở `silver` (lab).

→ **Bài 19 — MFA: OTP và WebAuthn/passkey**: bài này coi OTP Form là hộp đen trả đúng/sai; bài sau mở hộp đó (mã 6 chữ số tính từ đâu, cửa sổ 30 s và look-ahead, vì sao WebAuthn chống phishing còn OTP thì không) và giải nốt `Condition - credential` làm gì khi user dùng passkey.
