# Bài 19 — MFA: OTP và WebAuthn/passkey

## 1. Mục tiêu

Sau bài này bạn có thể:

- Tính tay một mã TOTP từ secret và Unix time: counter, HMAC-SHA1, dynamic truncation, `mod 10^6`, rồi kiểm bằng test vector RFC.
- Đọc OTP policy bằng `kcadm.sh` và nói ra: server nhận bao nhiêu mã cùng lúc, một mã sống bao lâu, dùng lại được không.
- Tính xác suất đoán trúng mỗi lần thử và số lần thử để đạt 50% khi brute force detection tắt.
- Lấy secret qua required action `CONFIGURE_TOTP` bằng script, đăng nhập bằng mã tự sinh, đo cửa sổ look-around và replay trên lab.
- Chỉ ra đúng trường dữ liệu (`origin` trong `clientDataJSON`, `rpIdHash`) làm WebAuthn chặn được relay phishing mà OTP không chặn được.
- Đọc WebAuthn Policy và WebAuthn Passwordless Policy, chọn RP ID, attestation, UV, discoverable cho 2FA và cho passkey; đặt required action và recovery codes.

---

## 2. Triệu chứng

Một SaaS B2B bắt mọi tài khoản admin của khách hàng phải dùng OTP. Sáng thứ Hai, bob, kế toán của một khách hàng, gửi ticket: "Tôi gõ mã 605458 đang hiện trong app Authenticator, màn hình báo *Invalid authenticator code.* Chờ mã mới gõ lại thì vào được."

L2 mở log Keycloak, thấy đúng một dòng ứng với lần gõ hỏng:

```
type="LOGIN_ERROR", realmName="kc19", clientId="web", userId="93c98eef-...", error="invalid_user_credentials",
auth_type="code", selected_credential_id="146308a2-..."
```

Kết luận: "Đồng hồ điện thoại lệch. Tăng Look around window từ 1 lên 3 cho thoải mái." Ticket đóng.

Hai ngày sau, khách hàng phát hiện tài khoản ngân hàng nhận tiền bị đổi. Event `LOGIN` của bob (realm đã bật lưu event) có một đăng nhập **thành công** từ IP lạ, sớm hơn lần gõ hỏng của bob khoảng một giây, cùng cửa sổ 30 giây.

> **Đo trên lab (chạy riêng cho bài này).** Keycloak 26.8.1 `start-dev` cổng 6400 (management 7400), Java 24, Mac mini Apple M4. Realm `kc19` mặc định, bob có OTP. Gửi `605458` lần 1: 302 về `redirect_uri` kèm `code`. Gửi lại đúng mã đó trong một phiên đăng nhập mới, cùng chu kỳ 30 s: form OTP hiện lại với *Invalid authenticator code.* Event của mã đã dùng và của mã sai có cùng dạng `LOGIN_ERROR error="invalid_user_credentials"`.

---

## ⏸ Dừng lại — đoán trước #1

Vì sao mã bob gõ, đúng là mã app đang hiện, lại bị từ chối?

```
(a) Đồng hồ điện thoại lệch hơn 30 giây so với server
(b) Mã sinh ở giây 29 của chu kỳ, tới server thì đã sang chu kỳ mới nên hết hạn
(c) Ai đó đã gửi đúng mã này lên Keycloak trước bob, và Keycloak không nhận một mã hai lần
(d) Brute force detection đã khoá bob sau vài lần gõ sai
```

---

## 3. Lý thuyết

### 3.1 Mã 6 chữ số được tính từ đâu

Đáp án là **(c)**. Để loại (a) và (b) bằng cơ chế chứ không bằng cảm giác, phải biết mã được tính thế nào.

**TOTP** (RFC 6238) sinh mã dùng một lần từ một **shared secret** chung giữa điện thoại và server, cộng với **đồng hồ**. Nó dựng trên **HOTP** (RFC 4226), bản dùng bộ đếm sự kiện thay cho thời gian. Hai bên không nói chuyện với nhau lúc sinh mã: mỗi bên tự tính, và mã khớp vì có cùng secret và đồng hồ gần nhau.

1. **Counter:** `T = floor(t / 30)`, `t` là Unix time (giây). Mọi máy cùng đổi mã ở giây :00 và :30.
2. **HMAC:** `HS = HMAC-SHA1(K, T)`, T viết thành 8 byte big-endian, ra 20 byte.
3. **Dynamic truncation:** 4 bit thấp của byte 19 là `offset` (0..15). Lấy 4 byte từ `offset`, bỏ bit cao nhất, được số 31 bit.
4. **Rút gọn:** `mã = số đó mod 10^6`, đệm 0 cho đủ 6 chữ số.

Test vector RFC, secret ASCII `12345678901234567890`, t = 59 s:

```
T      = floor(59 / 30) = 1
HS     = 75a48a19d4cbe100644e8ac1397eea747a2d33ab
byte19 = 0xab  ->  offset = 0xb = 11
P      = HS[11..14] = c1 39 7e ea  ->  bỏ bit cao: 0x41397eea = 1094287082
mã     = 1094287082 mod 10^6 = 287082
```

RFC 4226 Appendix D ghi đúng `41397eea`, `1094287082`, `287082` cho count 1; RFC 6238 Appendix B cho bản 8 chữ số `94287082` = `1094287082 mod 10^8`. Bỏ bit cao để số luôn dương, CPU nào tính `mod` cũng ra một kết quả.

Trong Keycloak, secret là chuỗi 20 ký tự (lab: `udIyF1wLfdFuKsCv8bKa`), key HMAC là byte UTF-8 của chuỗi đó. QR đưa cho app bản base32 của 20 byte ấy, 32 ký tự: `OVSES6KGGF3UYZTEIZ2UW42DOY4GES3B`.

> **Nguồn.** RFC 6238 §4.2: *"More specifically, T = (Current Unix time - T0) / X, where the default floor function is used in the computation."* ([rfc6238](https://www.rfc-editor.org/rfc/rfc6238#section-4.2)). RFC 4226 §5.3 viết: *"Let OffsetBits be the low-order 4 bits of String[19]"*, rồi *"Return the Last 31 bits of P"*; và *"Implementations MUST extract a 6-digit code at a minimum and possibly 7 and 8-digit code."* ([rfc4226](https://www.rfc-editor.org/rfc/rfc4226#section-5.3)). Keycloak giải mã secret: *"return secretData.getValue().getBytes(StandardCharsets.UTF_8);"* ([OTPCredentialModel.java#L115](https://github.com/keycloak/keycloak/blob/26.8.1/server-spi/src/main/java/org/keycloak/models/credential/OTPCredentialModel.java#L115)).

### 3.2 Server nhận mã nào: look-around window

Bản sai ai cũng nói: "mã OTP sống 30 giây". Nếu đúng thế thì (b) hợp lý: bob đọc mã ở giây 29, mạng mất 2 giây, mã chết.

Server không biết điện thoại sinh mã lúc nào, nó chỉ có đồng hồ của mình, nên nó thử vài counter quanh T. Keycloak thử `2 × lookAround + 1` counter theo thứ tự T, T-1, T+1, T-2, T+2... Policy của realm mới:

```json
{"otpPolicyType":"totp","otpPolicyAlgorithm":"HmacSHA1","otpPolicyDigits":6,"otpPolicyPeriod":30,
 "otpPolicyLookAheadWindow":1,"otpPolicyInitialCounter":0,"otpPolicyCodeReusable":false}
```

LookAround 1 nghĩa là server thử T-1, T, T+1. Nhìn từ **một mã**: nó được nhận khi đồng hồ server ở T-1, T hoặc T+1, tức 90 giây. Nhìn từ **một thời điểm**: có 3 mã đúng cùng lúc. Vậy (b) sai, mã đọc ở giây 29 còn được nhận thêm 30 giây. (a) cũng sai: lệch quá cửa sổ thì **mọi** mã đều trượt, kể cả lần gõ thứ hai của bob.

Mỗi mã trong cửa sổ là một cơ hội cho người đoán:

| lookAround | Counter được thử | Một mã được nhận trong | Xác suất trúng mỗi lần đoán (6 chữ số) |
|---|---|---|---|
| 0 | 1 | 30 s | 1 / 10^6 |
| 1 (mặc định) | 3 | 90 s | 3 / 10^6 |
| 3 (đề xuất của L2) | 7 | 210 s | 7 / 10^6 |

3/10^6 là trần trên, vì mã của hai counter liền nhau có thể trùng. Tăng lên 3 như L2 nhân cơ hội đoán lên 7/3 lần mà không sửa được sự cố thật.

Nửa kia là số lần được đoán. Brute force detection mặc định tắt: lab gửi 300 mã sai liên tiếp trong một phiên không bị chặn, 7,9 ms mỗi lần (mục 4.6), đủ để kẻ đã có mật khẩu đạt 50% trong khoảng 30 phút (mục 5.3).

> **Nguồn.** Docs, OTP policies: *"For example, if the time interval for a token is 30 seconds, the default value of 1 means it will accept valid tokens in the 90-second window (time interval 30 seconds + look ahead 30 seconds + look behind 30 seconds)."* Mỗi nấc thêm: *"Every increment of this value increases the valid window by 60 seconds (look ahead 30 seconds + look behind 30 seconds)."* ([one-time-password-otp-policies](https://www.keycloak.org/docs/latest/server_admin/index.html#one-time-password-otp-policies)). Source: *"for (int i = 0; i <= (lookAroundWindow * 2); i++) {"* ([TimeBasedOTP.java#L86](https://github.com/keycloak/keycloak/blob/26.8.1/server-spi-private/src/main/java/org/keycloak/models/utils/TimeBasedOTP.java#L86)). RFC 6238 §5.2 khuyên: *"We RECOMMEND that at most one time step is allowed as the network delay."* ([rfc6238](https://www.rfc-editor.org/rfc/rfc6238#section-5.2)). Brute force: *"Keycloak applies it only to password, OTP and recovery codes."* ([password-guess-brute-force-attacks](https://www.keycloak.org/docs/latest/server_admin/index.html#password-guess-brute-force-attacks)).

---

## ⏸ Dừng lại — đoán trước #2

Docs Keycloak 26.8.1 có hai câu về dùng lại mã, trong cùng một chương:

```
Câu X (mục TOTP vs HOTP): TOTP không nhớ mã đã dùng, nên dùng lại được trong cửa sổ hợp lệ.
Câu Y (mục Reusable code): mặc định user không dùng lại được mã; admin phải bật rõ ràng.
```

Ở realm mặc định, gửi cùng một mã hai lần trong 30 giây thì sao?

```
(a) Cả hai lần đều qua (câu X đúng)
(b) Lần hai bị từ chối (câu Y đúng)
(c) Lần hai qua nếu dùng phiên đăng nhập khác, bị từ chối nếu cùng phiên
```

---

### 3.3 Một mã chỉ dùng một lần

**Replay** là gửi lại một giá trị xác thực đã hợp lệ một lần để được nhận lần nữa: mã bị nhìn trộm, chụp màn hình, đọc từ log.

Đáp án là **(b)**. Docs tự mâu thuẫn, lab quyết định: câu Y đúng, câu X sai với source lẫn hành vi của 26.8.1. Ở 26.8.1, khi mã TOTP đúng, Keycloak ghi khoá `<credentialId>.<mã>` vào **single-use store** (kho giá trị chỉ dùng một lần, có hạn) bằng `putIfAbsent`. Lần đầu ghi được, mã qua. Lần hai khoá đã có, mã bị từ chối với đúng thông báo của mã sai. Khoá sống `period × (2 × lookAround + 1)` = 90 s, phủ hết thời gian mã còn hợp lệ.

Lab đo hai chiều: mặc định thì lần hai bị từ chối, đặt `otpPolicyCodeReusable=true` thì cả hai đều qua. Hai lần nằm ở hai phiên khác nhau, nên (c) cũng sai: khoá gắn với credential, không gắn với phiên. Thêm một chi tiết ngoài docs: mã dùng để xác nhận **lúc cài OTP** cũng bị ghi vào store (mục 4.4).

> **Nguồn.** RFC 6238 §5.2: *"The verifier MUST NOT accept the second attempt of the OTP after the successful validation has been issued for the first OTP, which ensures one-time only use of an OTP."* Docs, câu Y: *"Users cannot reuse those tokens by default, and the administrator needs to explicitly specify that those tokens can be reused."* Docs, câu X (lab bác): *"TOTP does not remember passwords used, so there is no need to perform database updates. The drawback is that it is possible to reuse TOTPs in the valid time interval."* ([one-time-password-otp-policies](https://www.keycloak.org/docs/latest/server_admin/index.html#one-time-password-otp-policies)). Source: *"final long validLifespan = (long) credentialData.getPeriod() * (2L * policy.getLookAheadWindow() + 1);"* và tiếp theo *"return singleUseStore.putIfAbsent(searchKey, validLifespan);"* ([OTPCredentialProvider.java#L120](https://github.com/keycloak/keycloak/blob/26.8.1/services/src/main/java/org/keycloak/credential/OTPCredentialProvider.java#L120)).

Chính cơ chế này để lại dấu vết ở mục 2: kẻ tấn công gửi mã trước, khoá được ghi, bob gửi sau một giây và bị từ chối. Lỗi của bob là **dấu vết duy nhất** của cuộc tấn công, nhưng event của replay giống hệt event gõ sai.

### 3.4 OTP chặn được gì, không chặn được gì

Sec-05 §5 đã xếp hạng SMS < TOTP < passkey và nói "TOTP vẫn phish được" (`security/sec-05-authn-authz.md`). Đây là cơ chế của câu đó: `mã = f(secret, floor(t/30))`, không có gì trong mã cho biết nó được gõ vào **trang nào**. Một trang giả đứng giữa (**relay phishing**, adversary-in-the-middle) chỉ cần chuyển mã sang Keycloak thật trong lúc mã còn hiệu lực. Một lượt gửi mã mất khoảng 8 ms trên lab (mục 4.6); cửa sổ 90 s dư dả cho proxy.

<svg viewBox="0 0 700 340" role="img" aria-labelledby="kc19-a-t kc19-a-d" style="width:100%;height:auto">
<title id="kc19-a-t">Relay phishing vượt qua OTP</title>
<desc id="kc19-a-d">Sơ đồ tuần tự ba cột: trình duyệt của bob, proxy phishing login-acme.co và Keycloak auth.acme.com. Proxy chuyển tiếp mật khẩu và mã OTP sang Keycloak, Keycloak nhận vì mã không chứa thông tin domain, cookie phiên rơi vào tay kẻ tấn công, lần gửi sau của bob bị từ chối vì mã đã dùng.</desc>
<defs><marker id="kc19-a-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="20" y="10" width="160" height="34" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="100" y="31" text-anchor="middle" font-size="11" fill="currentColor">Trình duyệt bob</text>
<rect x="270" y="10" width="160" height="34" rx="8" fill="#ef4444" fill-opacity="0.25"/>
<text x="350" y="31" text-anchor="middle" font-size="11" fill="currentColor">Proxy login-acme.co</text>
<rect x="520" y="10" width="160" height="34" rx="8" fill="#84cc16" fill-opacity="0.25"/>
<text x="600" y="31" text-anchor="middle" font-size="11" fill="currentColor">Keycloak auth.acme.com</text>
<line x1="100" y1="44" x2="100" y2="300" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<line x1="350" y1="44" x2="350" y2="300" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<line x1="600" y1="44" x2="600" y2="300" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<line x1="100" y1="70" x2="346" y2="70" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc19-a-arrow)"/>
<text x="225" y="64" text-anchor="middle" font-size="11" fill="currentColor">1. mở link trong email</text>
<line x1="350" y1="95" x2="596" y2="95" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc19-a-arrow)"/>
<text x="475" y="89" text-anchor="middle" font-size="11" fill="currentColor">2. GET trang login thật</text>
<line x1="100" y1="125" x2="346" y2="125" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc19-a-arrow)"/>
<text x="225" y="119" text-anchor="middle" font-size="11" fill="currentColor">3. username + mật khẩu</text>
<line x1="350" y1="145" x2="596" y2="145" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc19-a-arrow)"/>
<text x="475" y="139" text-anchor="middle" font-size="11" fill="currentColor">3'. chuyển tiếp nguyên văn</text>
<line x1="596" y1="175" x2="104" y2="175" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc19-a-arrow)"/>
<text x="350" y="169" text-anchor="middle" font-size="11" fill="currentColor">4. form OTP (qua proxy)</text>
<line x1="100" y1="205" x2="346" y2="205" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc19-a-arrow)"/>
<text x="225" y="199" text-anchor="middle" font-size="11" fill="currentColor">5. mã 605458</text>
<line x1="350" y1="225" x2="596" y2="225" stroke="#ef4444" stroke-width="2" marker-end="url(#kc19-a-arrow)"/>
<text x="475" y="219" text-anchor="middle" font-size="11" fill="currentColor">5'. 605458, gửi ngay</text>
<line x1="596" y1="255" x2="354" y2="255" stroke="#ef4444" stroke-width="2" marker-end="url(#kc19-a-arrow)"/>
<text x="475" y="249" text-anchor="middle" font-size="11" fill="currentColor">6. 302 + cookie phiên</text>
<line x1="100" y1="285" x2="596" y2="285" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.5" stroke-dasharray="6 3" marker-end="url(#kc19-a-arrow)"/>
<text x="350" y="279" text-anchor="middle" font-size="11" fill="currentColor">7. bob gửi lại 605458: Invalid authenticator code (mã đã dùng)</text>
<rect x="20" y="304" width="660" height="30" rx="8" fill="#f59e0b" fill-opacity="0.2"/>
<text x="350" y="323" text-anchor="middle" font-size="11" fill="currentColor">mã = HMAC(secret, floor(t/30)): không chứa domain nào, Keycloak không phân biệt được bob với proxy</text>
</svg>

| Mối đe doạ | OTP mặc định chặn? | Vì sao |
|---|---|---|
| Lộ mật khẩu từ trang khác (credential stuffing) | Có | Thiếu secret, phải đoán: 3/10^6 mỗi lần |
| Nhìn trộm được mã đã dùng | Có | Single-use store từ chối; sau 90 s mã cũng hết hạn |
| Đoán online khi đã có mật khẩu | Không, khi brute force tắt | 127 lần/s không bị chặn trên lab |
| Relay phishing thời gian thực | Không | Mã không gắn với origin |
| Lộ DB hoặc bản export | Không | Secret là khoá đối xứng (hộp dưới) |

> **Suy luận.** Docs không nói secret OTP lưu ở dạng nào. Hai dữ kiện: server phải tự tính lại HMAC nên phải có chính key (source `getDecodedSecret` trả byte của chuỗi secret); còn mật khẩu chỉ cần lưu hash Argon2 (bài 20). Vậy ai đọc được bảng credential là sinh được mã cho mọi user. Admin API trả `secretData: null` chỉ là API giấu đi. Kiểm bằng: `kc.sh export --dir out --realm kc19 --users realm_file`, tìm `secretData` của credential `otp`.

---

## ⏸ Dừng lại — đoán trước #3

Bob dùng passkey thay cho OTP. Vẫn proxy `login-acme.co` đó, chuyển tiếp nguyên văn mọi byte giữa bob và `auth.acme.com`. Cuộc tấn công dừng ở đâu?

```
(a) Keycloak thấy IP của proxy khác IP thường ngày của bob
(b) Trình duyệt không cho trang login-acme.co dùng credential đăng ký cho auth.acme.com
(c) Chữ ký WebAuthn hết hạn sau 30 giây, proxy không kịp chuyển
(d) Không dừng: proxy chuyển chữ ký sang Keycloak y như chuyển mã OTP
```

---

### 3.5 WebAuthn: chữ ký mang theo nơi nó sinh ra

Đáp án là **(b)**, và sau (b) còn một lớp chặn ở server. Sec-05 đã nói khung chung (cặp khoá, ký challenge); phần còn thiếu là chữ ký phủ **byte nào** và **ai** ghi chúng. Thuật ngữ: **Relying Party (RP)** là bên nhờ WebAuthn xác thực, ở đây là Keycloak. **RP ID** là tên miền credential bị giới hạn vào, ví dụ `auth.acme.com`. **Authenticator** là thứ giữ private key (Touch ID, Windows Hello, YubiKey). **Assertion** là chữ ký sinh ra ở mỗi lần đăng nhập.

<svg viewBox="0 0 700 300" role="img" aria-labelledby="kc19-b-t kc19-b-d" style="width:100%;height:auto">
<title id="kc19-b-t">Dữ liệu được ký trong một WebAuthn assertion</title>
<desc id="kc19-b-d">Authenticator ghi authenticatorData gồm rpIdHash 32 byte, flags 1 byte và signCount 4 byte. Trình duyệt ghi clientDataJSON gồm type, challenge và origin của trang đang mở. Chữ ký phủ authenticatorData nối với SHA-256 của clientDataJSON, và Keycloak kiểm origin, rpIdHash, challenge cùng chữ ký.</desc>
<defs><marker id="kc19-b-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="180" y="22" text-anchor="middle" font-size="11" fill="currentColor">authenticatorData (authenticator ghi)</text>
<rect x="20" y="32" width="150" height="46" rx="6" fill="#8b5cf6" fill-opacity="0.25"/>
<text x="95" y="51" text-anchor="middle" font-size="11" fill="currentColor">rpIdHash, 32 B</text>
<text x="95" y="68" text-anchor="middle" font-size="11" fill="currentColor">SHA-256(RP ID)</text>
<rect x="176" y="32" width="80" height="46" rx="6" fill="#8b5cf6" fill-opacity="0.15"/>
<text x="216" y="51" text-anchor="middle" font-size="11" fill="currentColor">flags, 1 B</text>
<text x="216" y="68" text-anchor="middle" font-size="11" fill="currentColor">UP, UV</text>
<rect x="262" y="32" width="88" height="46" rx="6" fill="#8b5cf6" fill-opacity="0.15"/>
<text x="306" y="51" text-anchor="middle" font-size="11" fill="currentColor">signCount</text>
<text x="306" y="68" text-anchor="middle" font-size="11" fill="currentColor">4 B</text>
<text x="525" y="22" text-anchor="middle" font-size="11" fill="currentColor">clientDataJSON (trình duyệt ghi)</text>
<rect x="380" y="32" width="300" height="72" rx="6" fill="#3b82f6" fill-opacity="0.2"/>
<text x="392" y="51" font-size="11" fill="currentColor">type: "webauthn.get"</text>
<text x="392" y="70" font-size="11" fill="currentColor">challenge: chuỗi ngẫu nhiên Keycloak cấp</text>
<text x="392" y="89" font-size="11" fill="currentColor">origin: trang đang mở trên thanh địa chỉ</text>
<line x1="530" y1="104" x2="530" y2="136" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc19-b-arrow)"/>
<rect x="430" y="140" width="200" height="30" rx="6" fill="#3b82f6" fill-opacity="0.15"/>
<text x="530" y="159" text-anchor="middle" font-size="11" fill="currentColor">hash = SHA-256(clientDataJSON)</text>
<line x1="185" y1="78" x2="185" y2="196" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc19-b-arrow)"/>
<line x1="530" y1="170" x2="360" y2="200" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc19-b-arrow)"/>
<rect x="110" y="200" width="420" height="30" rx="6" fill="#84cc16" fill-opacity="0.25"/>
<text x="320" y="219" text-anchor="middle" font-size="11" fill="currentColor">sig = Sign(private key, authenticatorData || hash)</text>
<rect x="20" y="246" width="660" height="44" rx="8" fill="#f59e0b" fill-opacity="0.2"/>
<text x="350" y="264" text-anchor="middle" font-size="11" fill="currentColor">Keycloak kiểm: origin có trong danh sách mong đợi, rpIdHash = SHA-256(RP ID của realm),</text>
<text x="350" y="281" text-anchor="middle" font-size="11" fill="currentColor">challenge đúng cái vừa cấp, chữ ký đúng với public key đã lưu lúc đăng ký</text>
</svg>

Đi theo đường của proxy:

1. **Trình duyệt chặn trước.** Trang đang mở là `login-acme.co`. Trình duyệt chỉ cho trang dùng RP ID bằng effective domain của trang hoặc là hậu tố đăng ký được của nó; `auth.acme.com` không phải. Credential lại bị giới hạn theo RP ID, nên authenticator không có gì để ký cho `login-acme.co`. Đây là (b).
2. **Server chặn lớp hai.** Kể cả khi bob bị lừa ký ở đâu đó, trường `origin` do trình duyệt điền theo trang đang mở và nằm trong phần được ký. Keycloak so `origin` với origin mong đợi và `rpIdHash` với SHA-256 của RP ID của realm; lệch một trong hai là từ chối.

Đây là khác biệt gốc so với OTP. Mã OTP là **bí mật mang đi được**: ai cầm cũng dùng được ở bất kỳ đâu. Chữ ký WebAuthn **mang theo nơi nó sinh ra**, và nơi đó do trình duyệt khai, không do người dùng gõ.

Giới hạn cũng đến từ quy tắc hậu tố: credential có RP ID `acme.com` dùng được từ **mọi** subdomain của `acme.com`, khi đó lớp chặn chỉ còn danh sách origin Keycloak chấp nhận. Keycloak để trống RP ID thì lấy host của base URL (`auth.acme.com`), tức chặt nhất. Đổi sang domain cha là nới phạm vi.

> **Nguồn.** WebAuthn Level 3 §7.2: *"Verify that the value of C.origin is an origin expected by the Relying Party."*, rồi *"Verify that the rpIdHash in authData is the SHA-256 hash of the RP ID expected by the Relying Party."*, và *"Using credentialRecord.publicKey, verify that sig is a valid signature over the binary concatenation of authData and hash."* ([sctn-verifying-assertion](https://www.w3.org/TR/webauthn-3/#sctn-verifying-assertion)). Quy tắc RP ID: *"This default MAY be overridden by the caller, as long as the caller-specified RP ID value is a registrable domain suffix of or is equal to the caller’s origin’s effective domain."* ([rp-id](https://www.w3.org/TR/webauthn-3/#rp-id)). Keycloak: *"The ID must be the origin’s effective domain."* và *"If this entry is blank, Keycloak adapts the host part of Keycloak’s base URL."* ([_webauthn-policy](https://www.keycloak.org/docs/latest/server_admin/index.html#_webauthn-policy)).

### 3.6 Attestation và assertion

**Attestation** chỉ có lúc **đăng ký**: "authenticator này là loại gì". Nó được ký bằng attestation key của nhà sản xuất, kèm **AAGUID** (mã 128 bit chỉ model thiết bị). **Assertion** có ở **mỗi lần đăng nhập**: "người này có giữ private key của credential không".

Bản sai: "bật WebAuthn là Keycloak biết user dùng YubiKey hay Touch ID và chặn được loại không cho phép". Ở mặc định thì không. Attestation Conveyance Preference là `not specified`, docs nói nó hành xử như `none`, và với `none` AAGUID có thể bị ẩn thành 0. Muốn giới hạn loại thiết bị bằng Acceptable AAGUIDs thì phải đặt conveyance `direct` và nạp chứng chỉ gốc của nhà sản xuất vào truststore. Cái giá: tự duy trì danh sách AAGUID và truststore.

> **Nguồn.** WebAuthn L3: *"An attestation statement is provided within an attestation object during a registration ceremony."* ([webauthn-3](https://www.w3.org/TR/webauthn-3/)). Keycloak: *"Default attestation None is not reliable, and can anonymize the AAGUID to zero value."* ([_webauthn-policy](https://www.keycloak.org/docs/latest/server_admin/index.html#_webauthn-policy)).

### 3.7 Passkey: policy riêng, và 2FA bị bỏ qua

**Passkey** là **discoverable credential**: authenticator tự tìm ra credential khi RP không đưa credential ID nào, nên user không cần gõ username. Nó đi kèm **user verification** (UV): mở khoá bằng vân tay hoặc PIN, không chỉ chạm. Khi WebAuthn là yếu tố thứ hai, mật khẩu đã xác định user, nên không cần discoverable, chạm là đủ. Khi passkey thay luôn mật khẩu, UV là thứ duy nhất chứng minh "người biết", nên phải bắt buộc. Hai vai trò cần hai bộ yêu cầu, nên Keycloak có **hai policy**. Lab (mục 4.7): policy 2FA để mọi thứ `not specified`; policy passwordless đặt `ResidentKey` và `UserVerificationRequirement` là `required`. Passkey trong Keycloak chính là "WebAuthn passwordless", và phải bật switch Enable Passkeys (Realm Settings, tab Login) thì mới hiện trên form đăng nhập.

Nối từ bài 18: khi passkey bật, ai đăng nhập bằng passkey thì không bị hỏi 2FA. Người quyết định là `Condition - credential` với config `{"credentials": "webauthn-passwordless"}` (bài 18 đọc từ lab). Config không có khoá `included`, nên source hiểu là chế độ "không nằm trong": condition đúng khi credential của lần xác thực này **không** phải `webauthn-passwordless`. Vào bằng passkey thì condition sai và sub-flow 2FA thành Disabled. Vào bằng mật khẩu thì OTP được hỏi.

> **Nguồn.** WebAuthn L3: *"A Client-side discoverable Public Key Credential Source, or Discoverable Credential for short, is a public key credential source that is discoverable and usable in authentication ceremonies where the Relying Party does not provide any credential IDs"* ([client-side-discoverable-credential](https://www.w3.org/TR/webauthn-3/#client-side-discoverable-credential)). Keycloak, mặc định của policy passwordless: *"By default, Keycloak sets User Verification Requirement to required and Discoverable Credential to required for the passwordless scenario to work properly."* ([_webauthn_loginless](https://www.keycloak.org/docs/latest/server_admin/index.html#_webauthn_loginless)); passkey: *"So now, when passkeys are enabled in the realm, 2FA is only presented if the user introduced a common password to login, not if a passkey was used."* ([passkeys](https://www.keycloak.org/docs/latest/server_admin/index.html#passkeys_server_administration_guide)). Source condition: *"final boolean included = Boolean.parseBoolean(config.get(ConditionalCredentialAuthenticatorFactory.CONF_INCLUDED));"* rồi *"credentials.retainAll(authCredentials);"* ([ConditionalCredentialAuthenticator.java#L50](https://github.com/keycloak/keycloak/blob/26.8.1/services/src/main/java/org/keycloak/authentication/authenticators/conditional/ConditionalCredentialAuthenticator.java#L50)).

### 3.8 Required action và recovery codes

**Required action** là việc user phải làm xong trước khi vào app. Bài 18 đã cho thấy OTP Form REQUIRED gặp user chưa có OTP thì mở màn cài OTP chứ không chặn. Các action MFA của realm mới đều `enabled`, chưa cái nào là default (lab):

| Alias | Làm gì |
|---|---|
| `CONFIGURE_TOTP` | Hiện QR/secret, bắt nhập một mã đúng |
| `webauthn-register` | Đăng ký WebAuthn làm yếu tố thứ hai |
| `webauthn-register-passwordless` | Đăng ký passkey |
| `CONFIGURE_RECOVERY_AUTHN_CODES` | Sinh recovery codes |

App gọi chủ động (AIA) bằng `kc_action` trên URL login, ví dụ `kc_action=webauthn-register`.

Lab: màn `CONFIGURE_TOTP` để secret ngay trong HTML (`<input type="hidden" name="totpSecret" ...>`). User cần secret nên thiết kế này đúng, nhưng đó là lúc secret lộ nhiều nhất: ai đọc được trang (extension, phiên bị chiếm) là có bản sao vĩnh viễn của yếu tố thứ hai.

**Recovery codes** giải bài toán mất điện thoại: Keycloak sinh 12 mã, dùng theo thứ tự, dùng xong bị xoá, và cũng chịu brute force detection. Trong browser flow mặc định, `Recovery Authentication Code Form` có sẵn trong sub-flow 2FA nhưng DISABLED; đặt ALTERNATIVE thì user mới thấy "Try another way". Configure OTP có tuỳ chọn "Add recovery codes" để sinh luôn lúc cài.

> **Nguồn.** AIA: *"The actions Webauthn Register (kc_action=webauthn-register) and Webauthn Register Passwordless (kc_action=webauthn-register-passwordless) are available for the applications if enabled in the Required actions tab."* ([_webauthn_aia](https://www.keycloak.org/docs/latest/server_admin/index.html#_webauthn_aia)). Recovery codes: *"The Recovery Codes are a number of sequential one-time passwords (currently 12) auto-generated by Keycloak."*, rồi *"When the current code is introduced by the user, it is removed and the next code will be required for the next login."*, và *"You can configure the Configure OTP required action to ask for recovery codes automatically by enabling Add recovery codes."* ([_recovery-codes](https://www.keycloak.org/docs/latest/server_admin/index.html#_recovery-codes)).

---

## 4. Lab

> **Đo trên lab (chạy riêng cho bài này).** Keycloak 26.8.1 `start-dev` (dev-file H2), cổng 6400, management 7400, OpenJDK 24, Mac mini Apple M4, 2026-10-15. Thư mục `~/projects/keycloak-lab/lab-kc19/`, script `~/projects/keycloak-lab/tmp-kc19-*.py`, output tóm trong `lab-kc19/results.txt`. Mọi output dưới đây là output thật của lần chạy đó.

### 4.1 Dựng realm

```bash
KC_BOOTSTRAP_ADMIN_USERNAME=admin KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
  bin/kc.sh start-dev --http-port=6400 --http-management-port=7400 --health-enabled=true &
kc config credentials --server http://localhost:6400 --realm master --user admin --password admin
kc create realms -s realm=kc19 -s enabled=true
kc create users -r kc19 -s username=bob -s enabled=true -s email=bob@example.com -s emailVerified=true
kc set-password -r kc19 --username bob --new-password 'Passw0rd!'
kc create clients -r kc19 -s clientId=web -s publicClient=true -s 'redirectUris=["http://localhost:3000/cb"]'
kc get realms/kc19 | jq '{otpPolicyType,otpPolicyDigits,otpPolicyLookAheadWindow,bruteForceProtected}'
```

Output là khối JSON ở mục 3.2, thêm `"bruteForceProtected": false`. (`kc` = `kcadm.sh --config lab-kc19/kcadm.config`.)

### 4.2 Lấy secret qua `CONFIGURE_TOTP`

Admin API không trả secret (`secretData: null`). Cách lấy không đụng DB là đi đúng đường của user: `kc update users/<bob-id> -r kc19 -s 'requiredActions=["CONFIGURE_TOTP"]'`, rồi một script Python (`urllib`, không tự theo redirect): GET `/auth?client_id=web&response_type=code&...`, POST username/password vào `action` của form, theo các 302 tới `/login-actions/required-action?...execution=CONFIGURE_TOTP`, regex lấy `name="totpSecret" value="..."`, đợi đầu chu kỳ, POST `totp`, `totpSecret`, `userLabel`. Chỗ vấp: `http.cookiejar` không gửi lại cookie phiên, server ghi `LOGIN_ERROR error="cookie_not_found"`; script phải tự giữ `Set-Cookie`.

```
secret(raw)=udIyF1wLfdFuKsCv8bKa base32=OVSES6KGGF3UYZTEIZ2UW42DOY4GES3B t=1792049820 T=59734994 t%30=0 code=543872
setup: 302 http://localhost:3000/cb?state=s1&session_state=faIfrOdPchuS
```

```json
{"type":"otp","userLabel":"lab-phone",
 "credentialData":"{\"subType\":\"totp\",\"digits\":6,\"counter\":0,\"period\":30,\"algorithm\":\"HmacSHA1\"}","secretData":null}
```

Không có `secretEncoding` nên key là byte UTF-8 của chuỗi secret; mã tự tính được nhận ngay, tức hàm dưới đây khớp với Keycloak.

### 4.3 Bộ sinh mã

```python
import hmac, hashlib, struct
def totp(key: bytes, T: int, digits=6):
    hs  = hmac.new(key, struct.pack('>Q', T), hashlib.sha1).digest()   # 20 byte
    off = hs[19] & 0xf
    n   = int.from_bytes(hs[off:off+4], 'big') & 0x7fffffff            # 31 bit
    return f'{n % 10**digits:0{digits}d}'
```

Với 5 mốc SHA1 đầu của RFC 6238 Appendix B (59, 1111111109, 1111111111, 1234567890, 2000000000), bản 8 chữ số khớp cả 5. Mốc thứ sáu 20000000000 critic chạy thêm: `65353130`, khớp.

### 4.4 Đo cửa sổ thật

Mỗi offset dùng một phiên đăng nhập mới: mật khẩu, rồi `totp(key, T + offset)` vào form OTP (`otp`, `selectedCredentialId`). Chạy ở một chu kỳ chưa dùng mã nào:

```
start t=1792049943 T=59734998 t%30=3
offset -1 code=875345 -> ACCEPT (302 -> redirect_uri?code=...)
offset -2 code=607680 -> REJECT (200) Invalid authenticator code.
offset +2 code=605458 -> REJECT (200) Invalid authenticator code.
offset +3 code=010700 -> REJECT (200) Invalid authenticator code.
offset -3 code=753502 -> REJECT (200) Invalid authenticator code.
offset +1 code=701809 -> ACCEPT (302 -> redirect_uri?code=...)
offset +0 code=355690 -> ACCEPT (302 -> redirect_uri?code=...)
```

Đúng T-1, T, T+1 được nhận. Lần chạy trước đó 90 s có một kết quả "lạ":

```
start t=1792049853 T=59734995 t%30=3
offset -1 code=543872 -> REJECT (200) Invalid authenticator code.
```

`543872` là mã đã dùng lúc cài OTP (T = 59734994): còn trong cửa sổ nhưng đã nằm trong single-use store.

### 4.5 Replay, `otpPolicyCodeReusable` tắt rồi bật

```
start t=1792050003 T=59735000 t%30=3
use #1 code=605458 -> ACCEPT (302 -> redirect_uri?code=...)
use #2 code=605458 -> REJECT (200) Invalid authenticator code.
# kc update realms/kc19 -s otpPolicyCodeReusable=true   (attribute realmReusableOtpCode -> "true")
start t=1792050063 T=59735002 t%30=3
use #1 code=685754 -> ACCEPT (302 -> redirect_uri?code=...)
use #2 code=685754 -> ACCEPT (302 -> redirect_uri?code=...)
```

Đo xong đặt lại `false`.

### 4.6 Đoán liên tục trong một phiên

Tốc độ dưới đây là của máy dev, chỉ đúng bậc độ lớn.

```
300/300 wrong codes rejected in the SAME login session, 7.9 ms/attempt, 127 attempts/s
then correct code -> ACCEPT (302 -> redirect_uri?code=...) t%30=3
```

Log có 300 dòng `LOGIN_ERROR error="invalid_user_credentials"`, không có gì chặn lại.

### 4.7 WebAuthn: đọc cấu hình thật

WebAuthn cần authenticator thật trả lời `navigator.credentials.get()`, `curl` không làm được. Đọc cấu hình realm mới có sẵn (`kc get realms/kc19 | jq` lọc khoá `webAuthn`, giữ dòng đang bàn):

```json
"webAuthnPolicyRpId": "",                             "webAuthnPolicyPasswordlessRpId": "",
"webAuthnPolicySignatureAlgorithms": ["ES256","RS256"],
"webAuthnPolicyAttestationConveyancePreference": "not specified",
"webAuthnPolicyResidentKey": "not specified",         "webAuthnPolicyPasswordlessResidentKey": "required",
"webAuthnPolicyUserVerificationRequirement": "not specified",
"webAuthnPolicyPasswordlessUserVerificationRequirement": "required",
"webAuthnPolicyAcceptableAaguids": [],                "webAuthnPolicyExtraOrigins": []
```

- `RpId: ""`: RP ID lấy host của base URL (lab: `localhost`, production: `auth.acme.com`).
- `not specified` cộng `AcceptableAaguids: []`: nhận mọi loại authenticator (mục 3.6).
- `ResidentKey`, `UserVerificationRequirement`: chỗ hai policy khác nhau (mục 3.7).
- `ExtraOrigins: []`: chỉ origin của chính Keycloak được nhận.
- `kc get authentication/required-actions -r kc19`: `CONFIGURE_TOTP`, `webauthn-register`, `webauthn-register-passwordless`, `CONFIGURE_RECOVERY_AUTHN_CODES` đều `"enabled": true, "defaultAction": false`.

Dừng: `kill $(lsof -tiTCP:6400 -sTCP:LISTEN)`, log ghi `Keycloak stopped in 1.111s`.

---

## 5. Tính tay

### 5.1 Một mã TOTP từ HMAC

Secret ASCII `12345678901234567890`, t = 1111111109 (2005-03-18 01:58:29 UTC). Cho sẵn `HS = 278c02e53610f84c40bd9135acd4101012410a14` (tính bằng `python3`). Tính mã 6 và 8 chữ số.

```
T       = floor(1111111109 / 30) = 37037036          (hex 23523EC, khớp RFC 6238 App. B)
byte 19 = 0x14  ->  offset = 4
P       = HS[4..7] = 36 10 f8 4c  ->  bit cao của 0x36 đã là 0  ->  0x3610f84c = 907081804
6 chữ số: 907081804 mod 10^6 = 081804
8 chữ số: 907081804 mod 10^8 = 07081804              (RFC 6238 App. B ghi 07081804)
```

Mã bắt đầu bằng 0. App in mã bằng `int` mà quên đệm sẽ ra `81804`, và server so chuỗi nên từ chối.

### 5.2 Điện thoại lệch giờ

Server ở t = 1792050003 (T = 59735000, giây thứ 3 của chu kỳ), lookAround 1.

```
chậm 25 s: t' = 1792049978  ->  T' = 59734999 = T - 1  ->  nhận
chậm 50 s: t' = 1792049953  ->  T' = 59734998 = T - 2  ->  từ chối (lab: offset -2 REJECT)
```

Tổng quát, chậm d giây thì T' = floor((t - d)/30): d < 30 luôn nhận, d ≥ 60 luôn trượt, 30 ≤ d < 60 tuỳ vị trí trong chu kỳ (ở giây thứ 3, chậm 33 s qua, 34 s trượt; ở giây 29, chậm 59 s vẫn qua). Lệch giờ thì trượt **liên tục**, khác hẳn mục 2.

### 5.3 Đoán mã khi đã có mật khẩu

Brute force tắt, 127 lần/s một luồng (lab 4.6), 3 mã đúng mỗi thời điểm.

```
p mỗi lần      = 3 / 10^6
50% cần n lần  : 1 - (1 - p)^n = 0,5  ->  n = ln 2 / p ≈ 231.049 lần
thời gian      = 231.049 / 127 ≈ 1.819 s ≈ 30,3 phút
một ngày       = 127 × 86.400 ≈ 10,97 triệu lần, kỳ vọng ≈ 32,9 lần trúng
8 chữ số       : p = 3 / 10^8, 50% cần ≈ 23,1 triệu lần ≈ 50,5 giờ
```

Thêm 2 chữ số tăng thời gian 100 lần, nhưng 50 giờ kẻ tấn công vẫn chờ được. Thứ đổi được kết quả là giới hạn số lần thử: bật brute force mặc định thì con số 30 phút không còn đúng, vì chỉ 30 mã (cách nhau trên 1 s) hoặc 2 mã (dồn dập) lọt trước lần khoá đầu; số mã mỗi ngày là phép tính của bài 20.

> **Đo trên lab (critic, 26.8.1).** `bruteForceProtected=true`, tham số khác mặc định, mã sai trong một phiên. Mỗi mã sai cộng 1 vào **cả** `numFailures` (mật khẩu sai cũng cộng vào đây) lẫn `numSecondaryAuthFailures` (mật khẩu sai không cộng). Dồn dập: khoá ở lần 2. Cách nhau 1,1 s: khoá ở lần 30, khoảng 60 s. Đang khoá thì **mã đúng** cũng nhận *Invalid authenticator code.*

---

## 6. Chuyển giao

1. Khách hàng đòi chuyển sang HOTP "để không phụ thuộc đồng hồ". Cái gì thay single-use store trong việc chống replay? Mỗi lần đăng nhập thành công tốn thêm thao tác gì ở DB? Look-around còn đối xứng hai phía không?
2. App mobile mở trang login trong WebView nhúng thay vì trình duyệt hệ thống. Lớp chặn thứ nhất ở mục 3.5 còn đứng không, khi chính app kiểm soát WebView và chèn được JavaScript?
3. Marketing xin đặt RP ID thành `acme.com` "để passkey dùng chung với trang chủ". Sau đó `blog.acme.com` dính XSS. Kẻ tấn công làm được và không làm được gì với passkey của user? Trường nào của WebAuthn Policy thu hẹp thiệt hại?
4. Realm chạy 2 node. Cùng một mã OTP tới node A và node B trong cùng một giây. Single-use store cần tính chất gì để chỉ một lần được nhận, và bạn đo điều đó bằng thí nghiệm nào trên cụm của bài 25?
5. Realm đã bật passkey. User có passkey bị relay phishing, nhưng trang login vẫn có "Try another way" sang mật khẩu và OTP, và proxy chỉ việc bấm nút đó. Realm này có "chống phishing" không? Thiết kế flow (dùng condition của bài 18) để user đã có passkey không còn đường lùi về OTP mà user mất thiết bị vẫn khôi phục được, rồi chỉ ra chính đường khôi phục đó có bị relay phishing được hay không.

---

## 7. Tóm tắt

- TOTP: `T = floor(t/30)`, `HMAC-SHA1(secret, T)`, offset = 4 bit thấp của byte 19, 31 bit, `mod 10^6`. RFC: t = 59 cho `287082` (6 số), `94287082` (8 số).
- Mặc định: TOTP, HmacSHA1, 6 chữ số, 30 s, look-around 1 (server thử T-1, T, T+1: một mã sống 90 s, 3/10^6 mỗi lần đoán; mỗi nấc thêm 60 s và 2 mã).
- Mã đúng chỉ được nhận một lần nhờ single-use store (khoá `credentialId.mã`, 90 s), kể cả mã dùng lúc cài. Câu docs "TOTP dùng lại được" mâu thuẫn với câu "không dùng lại được mặc định" của chính docs; lab 26.8.1 theo câu sau. Chỉ `otpPolicyCodeReusable=true` mới cho dùng lại.
- Replay bị từ chối có cùng event `invalid_user_credentials` như mã sai. Trượt một lần rồi qua: nghĩ tới relay.
- Brute force mặc định tắt: lab 300 mã sai trong một phiên không bị chặn, 127 lần/s, 50% trong khoảng 30 phút khi đã có mật khẩu. Bật lên: mã sai đếm chung `numFailures` với mật khẩu sai.
- OTP không chặn relay vì mã không chứa origin. WebAuthn chặn vì trình duyệt không cho trang dùng RP ID lạ, và chữ ký phủ `origin` lẫn `rpIdHash`, Keycloak kiểm cả hai.
- Attestation (lúc đăng ký, loại thiết bị) khác assertion (mỗi lần đăng nhập, giữ key). Mặc định `not specified` hành xử như `none`.
- Passkey = discoverable credential + UV, dùng WebAuthn Passwordless Policy riêng (`required`/`required`); đăng nhập bằng passkey thì `Condition - credential` tắt sub-flow 2FA.
- Required action MFA bật sẵn, không default. Recovery codes: 12 mã, theo thứ tự, dùng xong bị xoá.

→ **Bài 20 — Brute force, password policy, hashing**: bài này để mỗi lần đoán OTP có 3/10^6 cơ hội và không giới hạn số lần; bài sau bật brute force detection với tham số mặc định, tính lại số lần đoán mỗi ngày, và đo giá CPU của Argon2 mỗi lần đăng nhập bằng mật khẩu.
