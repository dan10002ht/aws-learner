# Bài 20 — Brute force, password policy, hashing

## 1. Mục tiêu

Sau bài này bạn có thể:

- Đọc bộ tham số brute force của một realm và nói ra chuỗi khoá cụ thể: sai lần thứ mấy thì khoá, khoá bao nhiêu giây, lúc nào bộ đếm về 0.
- Tính tay số mật khẩu kẻ tấn công thử được trên một tài khoản trong 24 giờ, và số request cần để khoá mọi user của realm.
- Chọn giữa khoá tạm và khoá vĩnh viễn dựa trên chi phí DoS, không dựa trên cảm giác "chặt hơn là an toàn hơn".
- Viết password policy (`length`, `notUsername`, `passwordHistory`, `hashAlgorithm`, `hashIterations`) và nói nó có áp cho user đang có không.
- Nói thuật toán băm mặc định của 26.8.1 cùng tham số, chỉ ra chỗ docs tự mâu thuẫn, và nói hash cũ ra sao khi đổi thuật toán.
- Ước lượng giá CPU của password login so với client credentials, và giải thích vì sao user không tồn tại tốn gần bằng user thật.

---

## 2. Triệu chứng

Realm production của một SaaS B2B để nguyên mặc định từ ngày dựng. Báo cáo pentest có một dòng mức High kèm output:

```
14:36:02 #39 HTTP 400  16.47 ms {"error": "invalid_grant", "error_description": "Invalid user credentials"}
14:36:02 #40 HTTP 400  16.59 ms {"error": "invalid_grant", "error_description": "Invalid user credentials"}
14:36:02 #1 HTTP 200  32.41 ms access_token
```

Bốn mươi mật khẩu sai vào cùng một tài khoản trong chưa tới một giây, rồi mật khẩu đúng vẫn vào. Admin API báo tài khoản đó `"numFailures" : 0`: Keycloak không đếm gì cả.

Trưởng nhóm đề xuất: "Bật brute force detection, khoá vĩnh viễn sau 5 lần sai. Chặt nhất có thể." Một dev khác hỏi lại: mặc định khi bật là bao nhiêu lần, và user bị khoá sẽ thấy thông báo gì để còn gọi support?

> **Đo trên lab (chạy riêng cho bài này).** Output trên là thật: Keycloak 26.8.1 `start-dev`, Java 24, Mac mini Apple M4, realm `bf` mới tạo, password grant tuần tự từ một luồng Python. `numFailures` đọc từ `attack-detection/brute-force/users/<id>`.

---

## ⏸ Dừng lại — đoán trước #1

Chỉ bật công tắc Brute Force Detection, để mọi tham số khác ở mặc định của 26.8.1. Kẻ tấn công biết username, đoán mật khẩu không ngừng nghỉ vào **một** tài khoản. Trong 24 giờ hắn thử được bao nhiêu mật khẩu?

```
(a) 5, sau đó tài khoản bị khoá tới khi admin mở
(b) 30, sau đó bị khoá 15 phút mỗi lần, tức khoảng 96 lần/ngày
(c) Khoảng 300
(d) Vài triệu, vì Keycloak chỉ chặn theo IP và hắn đổi IP liên tục
```

---

## 3. Lý thuyết

### 3.1 Brute force detection đếm gì, và mặc định ra sao

Đáp án là **(c)**: 308 lần, mục 5.1 tính từng khối. Để tính được, cần biết bộ đếm hoạt động thế nào.

**Brute force detection** là cơ chế đếm lần đăng nhập sai trên từng tài khoản user và tạm khoá tài khoản khi số lần sai vượt ngưỡng. Nó giải bài toán đoán mật khẩu trực tuyến: kẻ tấn công không có hash, chỉ có form login, và mỗi lần đoán phải đi qua Keycloak.

Ba giới hạn phạm vi cần nhớ trước khi đọc tham số. Thứ nhất, nó **tắt** khi tạo realm. Thứ hai, nó chỉ áp cho password, OTP và recovery code, không áp cho client secret hay WebAuthn. Thứ ba, docs mô tả toàn bộ cơ chế như bộ đếm theo tài khoản user; không có câu nào nói Keycloak chặn theo IP. Đáp án (d) sai ở đây: đổi IP không vượt được bộ đếm theo tài khoản. Field `lastIPFailure` trong Admin API chỉ là ghi nhận.

Tên field theo `kcadm get realms/<r>` (trong ngoặc là tên trong docs), giá trị đọc trên realm mới của lab, khớp source `RealmManager.java`:

| Field | Mặc định | Nghĩa |
|---|---|---|
| `bruteForceProtected` | `false` | công tắc tổng |
| `failureFactor` (Max Login Failures) | 30 | số lần sai trước lần khoá đầu tiên |
| `bruteForceStrategy` | `MULTIPLE` | công thức tính thời gian khoá |
| `waitIncrementSeconds` (Wait Increment) | 60 | bước tăng thời gian khoá |
| `maxFailureWaitSeconds` (Max Wait) | 900 | trần thời gian khoá |
| `quickLoginCheckMilliSeconds` (Quick Login Check) | 1000 | hai lần sai cách nhau dưới mức này là "quá nhanh" |
| `minimumQuickLoginWaitSeconds` (Minimum Quick Login Wait) | 60 | thời gian khoá khi bị bắt "quá nhanh" |
| `maxDeltaTimeSeconds` (Failure Reset Time) | 43.200 (12 giờ) | không sai thêm trong khoảng này thì bộ đếm về 0 |
| `permanentLockout` | `false` | khoá vĩnh viễn thay vì khoá tạm |
| `maxTemporaryLockouts` (Maximum temporary lockouts) | 0 | số lần khoá tạm trước khi chuyển sang vĩnh viễn |

> **Nguồn.** Docs: *"Brute force detection is disabled by default."* và *"Keycloak applies it only to password, OTP and recovery codes."* ([password-guess-brute-force-attacks](https://www.keycloak.org/docs/latest/server_admin/index.html#password-guess-brute-force-attacks)). Source tag 26.8.1: `realm.setFailureFactor(30);` ([RealmManager.java#L282](https://github.com/keycloak/keycloak/blob/26.8.1/services/src/main/java/org/keycloak/services/managers/RealmManager.java#L282)), các dòng mặc định còn lại nằm cạnh nó (L274–L282).

### 3.2 Công thức MULTIPLE và năm luật lab đo được

Docs cho công thức của chiến lược mặc định:

```
wait = Wait Increment * (count / Max Login Failures)     # chia nguyên
     = 60 * (count / 30)                                 # mặc định
```

`count` là số lần sai đang được đếm. Phép chia nguyên nghĩa là count 1–29 cho `wait = 0`, count 30–59 cho 60 s, 60–89 cho 120 s, và cứ thế tới trần 900 s ở count 450 (`60 * 15 = 900`).

Dễ hiểu sai thành "sai 30 lần thì khoá 60 s, rồi lại được 30 lần nữa". Lab cho thấy từ lần sai thứ 30, **mọi** lần sai đều gây khoá, vì count không về 0 sau mỗi lần khoá. Năm luật đo trực tiếp (mục 4):

1. Count 29 rồi nhập đúng: đăng nhập thành công và count về **0**. Một lần đúng xoá sạch lịch sử sai.
2. Sai lần thứ 30: khoá 60 s. Hết khoá, sai lần 31: lại khoá 60 s (`numTemporaryLockouts` tăng 1 → 2).
3. Trong lúc đang khoá, gửi sai thêm bao nhiêu lần count cũng đứng yên, và thời điểm mở khoá không bị đẩy lùi.
4. Hai lần sai cách nhau dưới 1.000 ms: khoá 60 s ngay, dù count mới là 2. Đây là quick login check, và nó không cộng vào `numTemporaryLockouts`.
5. Không sai thêm lần nào trong Failure Reset Time (lab thu nhỏ còn 20 s): lần sai kế tiếp bắt đầu lại từ count 1.

Luật 3 trùng với docs. Luật 1 docs không viết rõ: user thật đăng nhập đúng một lần là trả lại cho kẻ tấn công 29 lần đoán không bị khoá.

Chiến lược còn lại, `LINEAR`, dùng `Wait Increment * (1 + count - Max Login Failures)`: count 30 khoá 60 s, 31 khoá 120 s, 32 khoá 180 s. LINEAR chạm trần 900 s sau 15 lần sai kể từ ngưỡng, MULTIPLE cần 420 lần: LINEAR hãm kẻ tấn công nhanh hơn nhiều, và cũng khoá user thật lâu hơn từ lần sai thứ 31.

<svg viewBox="0 0 700 300" role="img" aria-labelledby="kc20-a-t kc20-a-d" style="width:100%;height:auto">
<title id="kc20-a-t">Thời gian khoá theo số lần sai, chiến lược MULTIPLE mặc định</title>
<desc id="kc20-a-d">Đồ thị bậc thang: count 1 đến 29 không khoá; từ 30 mỗi lần sai khoá 60 giây, mỗi 30 lần sai bậc khoá tăng thêm 60 giây, tới count 450 chạm trần 900 giây; vạch 24 giờ nằm ở lần đoán thứ 308.</desc>
<line x1="60" y1="250" x2="665" y2="250" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<line x1="60" y1="30" x2="60" y2="250" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<text x="52" y="254" text-anchor="end" font-size="11" fill="currentColor">0 s</text>
<text x="52" y="184" text-anchor="end" font-size="11" fill="currentColor">300 s</text>
<text x="52" y="114" text-anchor="end" font-size="11" fill="currentColor">600 s</text>
<text x="52" y="44" text-anchor="end" font-size="11" fill="currentColor">900 s</text>
<text x="97.5" y="266" text-anchor="middle" font-size="11" fill="currentColor">30</text>
<text x="247.5" y="266" text-anchor="middle" font-size="11" fill="currentColor">150</text>
<text x="435" y="266" text-anchor="middle" font-size="11" fill="currentColor">300</text>
<text x="622.5" y="266" text-anchor="middle" font-size="11" fill="currentColor">450</text>
<text x="360" y="288" text-anchor="middle" font-size="11" fill="currentColor">count (số lần sai đang đếm)</text>
<rect x="60" y="232" width="37.5" height="18" fill="#84cc16" fill-opacity="0.25"/>
<path d="M60,250 H97.5 V236 H135 V222 H172.5 V208 H210 V194 H247.5 V180 H285 V166 H322.5 V152 H360 V138 H397.5 V124 H435 V110 H472.5 V96 H510 V82 H547.5 V68 H585 V54 H622.5 V40 H660" fill="none" stroke="#3b82f6" stroke-width="2"/>
<line x1="445" y1="30" x2="445" y2="250" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4 3"/>
<text x="452" y="140" font-size="11" fill="currentColor">hết 24 giờ: lần đoán 308</text>
<line x1="622.5" y1="30" x2="622.5" y2="250" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4 3"/>
<text x="615" y="28" text-anchor="end" font-size="11" fill="currentColor">52,5 giờ: chạm trần 900 s</text>
<text x="70" y="150" font-size="11" fill="currentColor">1–29: không khoá</text>
<text x="70" y="166" font-size="11" fill="currentColor">30–59: mỗi lần sai khoá 60 s</text>
</svg>

> **Nguồn.** *"The By multiple strategy uses the following formula to calculate wait time: Wait Increment in Seconds * (count / Max Login Failures)."* và LINEAR *"Wait Increment in Seconds * (1 + count - Max Login Failures)."*; trong lúc khoá: *"count does not increment when a temporarily disabled account commits a login failure."* ([password-guess-brute-force-attacks](https://www.keycloak.org/docs/latest/server_admin/index.html#password-guess-brute-force-attacks)). Docs cũng dặn Failure Reset Time phải luôn lớn hơn Max Wait. Source 26.8.1 tính `wait` ở **mỗi** lần sai từ tổng count, nên bậc 120 s trở lên (lab chỉ kiểm bằng tham số thu nhỏ, 4.5) cũng theo luật 2: `waitSeconds = realm.getWaitIncrementSeconds() *  ((long) userLoginFailure.getNumFailures() / realm.getFailureFactor());` ([DefaultBruteForceProtector.java#L112](https://github.com/keycloak/keycloak/blob/26.8.1/services/src/main/java/org/keycloak/services/managers/DefaultBruteForceProtector.java#L112)); trần ở L131; quick login check chỉ xét khi `wait <= 0` (L122).

### 3.3 Bị khoá thì user thấy gì

Không thấy gì khác. Password grant trả cùng `400 invalid_grant` "Invalid user credentials" dù mật khẩu sai hay tài khoản đang khoá với mật khẩu đúng. Form login trình duyệt hiện cùng câu `Invalid username or password.` cho ba trường hợp: sai mật khẩu, username không tồn tại, và đang khoá mà nhập đúng.

Thiết kế này chặn kẻ tấn công dùng thông báo lỗi làm oracle: thấy "account locked" là biết username có thật. Cái giá là user thật bị khoá nghĩ mình gõ nhầm, gõ lại, rồi gọi support. Chỉ phía server phân biệt được: log event ghi `error="user_temporarily_disabled"` (khoá tạm) hoặc `error="user_disabled"` (khoá vĩnh viễn), còn lần sai thường là `error="invalid_user_credentials"`. Lab #1 của course thấy listener `jboss-logging` in event lỗi ở mức WARN kể cả khi `eventsEnabled=false`, nên dòng này có sẵn để báo động (bài 28).

> **Nguồn.** *"When a user is locked and attempts to log in, Keycloak displays the default Invalid username or password error message."* ([password-guess-brute-force-attacks](https://www.keycloak.org/docs/latest/server_admin/index.html#password-guess-brute-force-attacks)).

---

## ⏸ Dừng lại — đoán trước #2

Đề xuất của trưởng nhóm: `permanentLockout=true`, `failureFactor=5`. Kẻ tấn công không cần mật khẩu của ai, chỉ có danh sách 10.000 username lấy từ trang "Team" công khai và từ các email đã lộ. Hắn muốn **cả công ty không đăng nhập được** vào sáng thứ Hai. Hắn cần gì?

```
(a) Không làm được: khoá vĩnh viễn chỉ chặn kẻ tấn công, user thật vẫn vào bằng mật khẩu đúng
(b) 50.000 request, một lần, rồi chờ admin tự mở từng tài khoản
(c) Phải duy trì vài trăm request mỗi giây liên tục
(d) Phải có mật khẩu đúng của ít nhất một admin
```

---

### 3.4 Khoá vĩnh viễn và cái giá DoS

Đáp án là **(b)**, và đây là chỗ bản sai "khoá vĩnh viễn sau 5 lần sai là an toàn nhất" sụp.

Bản sai nghe có lý vì nó tối ưu đúng một mối đe doạ: đoán mật khẩu, tối đa 5 lần mỗi tài khoản.

Nhưng brute force detection không phân biệt ai đang gõ sai. Bộ đếm gắn với tài khoản, và bất kỳ ai biết username đều tăng được nó. Lab (4.6): sai đủ ngưỡng thì user thành `enabled=false`; mật khẩu đúng sau đó vẫn bị từ chối; xoá trạng thái brute force (`DELETE attack-detection/brute-force/users/<id>`) **không** mở lại, admin phải tự đặt `enabled=true`. Kẻ tấn công không biết mật khẩu nào vẫn biến 10.000 tài khoản thành 10.000 ticket mở khoá thủ công. Khoá tạm cũng bị lạm dụng được, chỉ đắt hơn (5.2).

Keycloak có phương án giữa: `permanentLockout=true` kèm `maxTemporaryLockouts=N`. Lab (tham số thu nhỏ `failureFactor=3`, `maxTemporaryLockouts=2`) cho chuỗi: count 3 khoá tạm lần 1, count 4 khoá tạm lần 2, count 5 thì `enabled=false`. Nó tha cho user thật vài lần khoá tạm, nhưng kẻ tấn công vẫn khoá vĩnh viễn bất kỳ ai với `failureFactor * (N + 1)` request.

Source còn cho thấy: với `permanentLockout=true`, `maxTemporaryLockouts=0`, count không bao giờ được xoá theo Failure Reset Time ([DefaultBruteForceProtector.java#L98](https://github.com/keycloak/keycloak/blob/26.8.1/services/src/main/java/org/keycloak/services/managers/DefaultBruteForceProtector.java#L98)). Mỗi ngày một lần sai, sau `failureFactor` ngày tài khoản vẫn bị khoá.

Hệ quả nữa của việc đếm theo tài khoản: **password spraying** (thử vài mật khẩu phổ biến trên rất nhiều tài khoản) không chạm ngưỡng. Kẻ tấn công thử 29 mật khẩu mỗi tài khoản rồi nghỉ quá Failure Reset Time, bộ đếm về 0, không có lần khoá nào để báo động. Chặn spraying cần tầng khác (rate limit ở proxy, phát hiện bất thường từ event, MFA bài 19).

Từ 26.8, dữ liệu login failure mặc định lưu trong database. Lab xác nhận: `numFailures` giữ nguyên qua một lần restart (4.6). Restart không mở khoá hàng loạt được.

> **Nguồn.** *"Login failure data for brute force detection is stored in the database by default."* ([caching](https://www.keycloak.org/server/caching)).

> **Suy luận.** Docs không nói "khoá vĩnh viễn làm DoS user thật". Suy ra từ ba dữ kiện: bộ đếm theo tài khoản (docs, source); khoá vĩnh viễn thành `enabled=false`, reset brute force không mở lại (lab); thông báo lỗi giống sai mật khẩu (docs).

### 3.5 Password policy: mặc định không có gì

**Password policy** là tập luật realm áp lên mật khẩu tại thời điểm mật khẩu được đặt: độ dài, không trùng username, không lặp lại mật khẩu cũ, và cả thuật toán băm. Realm mới tạo không có policy nào: `passwordPolicy` là `null`, nên `a` cũng là mật khẩu hợp lệ.

Policy viết thành chuỗi `tên(tham số)` nối bằng `and`. Lab đặt `length(12) and notUsername(undefined) and passwordHistory(3)` rồi thử:

| Mật khẩu mới cho `alice` | Kết quả |
|---|---|
| `short1` | ✗ `Invalid password: minimum length 12.` |
| `Long-Passw0rd-1` | ✓ |
| `Long-Passw0rd-1` lần nữa | ✗ `Invalid password: must not be equal to any of last 3 passwords.` |

Chỗ hay sai: policy chỉ được kiểm khi mật khẩu được **đặt**, không phải khi đăng nhập. Lab tạo `bob` với `short1` lúc chưa có policy, rồi đặt `length(12)`: `bob` vẫn đăng nhập bằng `short1`, HTTP 200. Muốn ép thì gắn required action `UPDATE_PASSWORD` cho từng user (3.8).

> **Nguồn.** *"When Keycloak creates a realm, it does not associate password policies with the realm."* và *"The new policy will not be effective for existing users."* ([_password-policies](https://www.keycloak.org/docs/latest/server_admin/index.html#_password-policies)).

### 3.6 Hashing: Argon2id là mặc định, và docs tự mâu thuẫn

Vì sao phải băm bằng hàm chậm có chủ đích và vì sao Argon2id được khuyến nghị: sec-05 §5 (`security/sec-05-authn-authz.md`). Phần này chỉ nói Keycloak chọn gì.

Hai policy điều khiển băm: `hashAlgorithm` và `hashIterations` (mặc định `-1`, tức số vòng mặc định của thuật toán: 5 với argon2, 210.000 với pbkdf2-sha512). Không đặt gì thì 26.8.1 không chạy FIPS dùng **Argon2id**. Credential của user trong lab đọc qua Admin API:

```json
{"hashIterations":5,"algorithm":"argon2",
 "additionalParameters":{"hashLength":["32"],"memory":["7168"],"type":["id"],"version":["1.3"],"parallelism":["1"]}}
```

Tức Argon2id v1.3, 5 vòng, 7.168 KiB (7 MiB) bộ nhớ mỗi lần băm, parallelism 1, hash 32 byte.

Argon2 thành mặc định từ 25.0.0. Trước đó mặc định là PBKDF2: Keycloak 24 đã nâng số vòng PBKDF2 từ 27.500 lên 210.000; con số 27.500 vòng trên blog là của trước 24. Ở 26.8.1, PBKDF2-SHA512 210.000 vòng chỉ là mặc định khi chạy FIPS.

Chỗ dễ trích sai: cùng Server Administration Guide 26.8.1, mục threat model "Password database compromised" vẫn ghi Keycloak băm bằng PBKDF2-HMAC-SHA512. Bảng password policy của cùng guide, release notes 25.0.0, source và credential trên lab đều nói Argon2. Câu ở threat model là phần sót từ bản cũ.

Đổi thuật toán không chạm vào hash đang lưu. Lab đặt `hashAlgorithm(pbkdf2-sha512)`: credential của `alice` vẫn ghi `argon2 5`. Sau đúng một lần `alice` đăng nhập, credential thành `pbkdf2-sha512 210000`, `createdDate` giữ nguyên. Keycloak chỉ băm lại được lúc nó cầm mật khẩu cleartext, tức lúc login. Lần login đó chậm khoảng 10 lần login Argon2 cùng phiên (`218,50 / 22,03 = 9,9`; một mẫu, máy đang tải, chỉ xem bậc độ lớn), khớp với việc phải verify hash cũ, tính hash mới và ghi DB trong cùng request. User không đăng nhập thì giữ hash cũ mãi.

> **Nguồn.** Bảng policy: *"PBKDF2 with SHA512 (default for FIPS deployments)"*, và *"If you change the hashing algorithm, password hashes in storage will not change until the user logs in."* ([_password-policies](https://www.keycloak.org/docs/latest/server_admin/index.html#_password-policies)). Release notes: *"Argon2 is now the default password hashing algorithm used by Keycloak in a non-FIPS environment."* ([keycloak-25-0-0](https://www.keycloak.org/docs/latest/release_notes/index.html#keycloak-25-0-0)). Đoạn mâu thuẫn: *"Keycloak does not store passwords in raw text but as hashed text, using the PBKDF2-HMAC-SHA512 message digest algorithm."* ([password-database-compromised](https://www.keycloak.org/docs/latest/server_admin/index.html#password-database-compromised)). Source: `public static int DEFAULT_MEMORY = 7168;` ([Argon2Parameters.java#L12](https://github.com/keycloak/keycloak/blob/26.8.1/crypto/default/src/main/java/org/keycloak/crypto/hash/Argon2Parameters.java#L12)). Đổi mặc định toàn server: `--spi-password-hashing--provider-default=<algorithm>`.

---

## ⏸ Dừng lại — đoán trước #3

Một khách hàng doanh nghiệp yêu cầu chạy Keycloak ở chế độ FIPS, nên thuật toán thành PBKDF2-SHA512 210.000 vòng. Trên cùng máy, một lần password grant thành công chậm đi bao nhiêu so với Argon2id mặc định?

```
(a) Gần như không đổi, vì Argon2 tốn bộ nhớ chứ không tốn CPU
(b) Khoảng 2 lần
(c) Khoảng 5 lần
(d) Khoảng 40.000 lần, vì 210.000 vòng so với 5 vòng
```

---

### 3.7 Giá CPU của một lần login bằng mật khẩu

Đáp án là **(c)**. Lab đo xen kẽ ba cấu hình trên cùng user, ba vòng, mỗi vòng 20 lần sau 5 lần warmup. Trung vị của ba giá trị p50:

| Cấu hình | Login đúng, p50 | User không tồn tại, p50 |
|---|---|---|
| Argon2id mặc định (5 vòng, 7 MiB) | 22,03 ms | 22,11 ms |
| pbkdf2-sha512 210.000 vòng | 109,54 ms | 107,02 ms |
| pbkdf2-sha512 27.500 vòng | 19,43 ms | 16,89 ms |

`109,54 / 22,03 = 4,97`. Đáp án (d) nhầm vì "vòng" của hai thuật toán không cùng đơn vị công việc: credential Argon2 còn mang tham số bộ nhớ 7.168 KiB, credential PBKDF2 thì `additionalParameters` rỗng. Chỉ so được số vòng trong cùng một thuật toán.

Cột thứ ba quan trọng hơn. Username không tồn tại thì không có hash nào để so, Keycloak có thể trả lỗi ngay. Nó không làm vậy: thời gian của user không tồn tại bám theo thuật toán đang cấu hình, gần bằng ca login đúng (`22,11 / 22,03 = 1,00` với Argon2, `107,02 / 109,54 = 0,98` với PBKDF2 210.000). Lý do: gặp username không tồn tại, Keycloak **băm giả** (`dummyHash`) một chuỗi cố định bằng thuật toán của policy hiện hành rồi mới trả lỗi. Nếu không vậy, kẻ tấn công lọc được username có thật chỉ bằng đồng hồ dù thông báo lỗi giống hệt (**user enumeration** qua timing).

Lab #1 của course, máy rảnh hơn, cho cùng bức tranh: password grant đắt khoảng 10 lần client credentials, phần chênh gần như toàn bộ là một lần Argon2id; cùng bậc với sizing chính thức: 15 password login/s mỗi vCPU so với 120 client credentials grant/s (bài 27).

> **Đo trên lab (lab #1 của course).** Keycloak 26.8.1 `start-dev`, Mac mini M4, một luồng, p50: client_credentials **1,58 ms** (n=200), password grant đúng **15,50 ms** (n=50), sai mật khẩu 13,40 ms, user không tồn tại **13,11 ms** (n=20). Máy dev: chỉ xem bậc độ lớn.

> **Đo trên lab (chạy riêng cho bài này).** Bảng trên: cùng phiên bản và loại máy, nhưng load average 17–19 do tiến trình khác, nên số tuyệt đối cao hơn lab #1. Ba cấu hình chạy xen kẽ để nhiễu chia đều; dùng tỷ lệ, không dùng số tuyệt đối. Client credentials đo cùng lúc: p50 1,63 ms (n=100). Script `~/projects/keycloak-lab/tmp-kc20-round.sh`.

> **Nguồn.** Source 26.8.1: `AuthenticatorUtils.dummyHash(context);` khi `user == null` ở password grant ([ValidateUsername.java#L94](https://github.com/keycloak/keycloak/blob/26.8.1/services/src/main/java/org/keycloak/authentication/authenticators/directgrant/ValidateUsername.java#L94)) và form trình duyệt ([AbstractUsernameFormAuthenticator.java#L120](https://github.com/keycloak/keycloak/blob/26.8.1/services/src/main/java/org/keycloak/authentication/authenticators/browser/AbstractUsernameFormAuthenticator.java#L120)); hàm lấy provider theo `hashAlgorithm` của policy ([AuthenticatorUtils.java#L76-L85](https://github.com/keycloak/keycloak/blob/26.8.1/services/src/main/java/org/keycloak/authentication/authenticators/util/AuthenticatorUtils.java#L76-L85)).

> **Nguồn.** *"For each 15 password-based user logins per second, allocate 1 vCPU to the cluster (tested with up to 300 per second)."* và *"Keycloak spends most of the CPU time hashing the password provided by the user, and it is proportional to the number of hash iterations."* ([concepts-memory-and-cpu-sizing](https://www.keycloak.org/high-availability/single-cluster/concepts-memory-and-cpu-sizing)).

### 3.8 Required actions

**Required action** là việc user phải làm xong sau khi đưa đúng credential, trước khi nhận token: `UPDATE_PASSWORD`, `VERIFY_EMAIL`, `CONFIGURE_TOTP` (bài 19), `UPDATE_PROFILE`... Realm mới trong lab không có action nào là default.

Đây là cách ép user cũ đổi mật khẩu, việc policy không làm. Gắn `UPDATE_PASSWORD` cho `alice`: form trình duyệt chuyển sang `/login-actions/required-action` sau mật khẩu đúng, còn password grant (không có màn hình) trả `invalid_grant: Account is not fully set up`. Batch job dùng password grant hỏng ngay khi tài khoản bị gắn required action.

> **Nguồn.** *"You can set the actions that a user must perform at the first login."* ([con-required-actions](https://www.keycloak.org/docs/latest/server_admin/index.html#con-required-actions_server_administration_guide)).

---

## 4. Lab

Keycloak 26.8.1 `start-dev` ở `~/projects/keycloak-lab/lab-kc20/`, cổng 6300 / management 7300. Realm `bf`, user `alice`, client public `direct` bật direct access grant; `kc` là wrapper của `kcadm.sh`; password grant gọi bằng `tmp-kc20-bf.py try <user> <password> <n> <giây cách>`.

### 4.1 Mặc định và tắt

`kc get realms/bf` trên realm mới cho đúng các giá trị ở bảng 3.1; `passwordPolicy` không xuất hiện vì là null. Brute force tắt: 40 lần sai liên tiếp rồi mật khẩu đúng cho ra output ở mục 2.

### 4.2 Bật với tham số mặc định: 29 lần, rồi 30 lần

`kc update realms/bf -s bruteForceProtected=true`, rồi 29 lần sai cách nhau 1,2 s (né quick login check): `numFailures: 29`, không khoá; mật khẩu đúng cho `200` và `numFailures: 0` (luật 1). Lặp lại với 30 lần sai:

```
14:37:24 #30 HTTP 400  18.78 ms {"error": "invalid_grant", "error_description": "Invalid user credentials"}
{"failedLoginNotBefore":1792049904,"numFailures":30,"numTemporaryLockouts":1,"disabled":true,...,"lastFailure":1792049844465}
14:37:25 #1 HTTP 400  22.69 ms {"error": "invalid_grant", "error_description": "Invalid user credentials"}   <- mật khẩu đúng
WARN [org.keycloak.events] type="LOGIN_ERROR", ... error="user_temporarily_disabled", ... grant_type="password", ... username="alice"
```

`failedLoginNotBefore` tính bằng giây, `lastFailure` bằng mili giây: `1792049904 - 1792049844,465 = 59,5`, tức khoá 60 s (lệch do làm tròn giây). Client nhận lỗi như sai mật khẩu; chỉ log biết đây là khoá.

### 4.3 Trong lúc khoá, và ngay sau khi mở

Ba lần sai nữa trong lúc khoá: `numFailures` vẫn 30, `failedLoginNotBefore` vẫn `1792049904` (luật 3). Ngay sau khi mở, một lần sai:

```
{"failedLoginNotBefore":1792049965,"numFailures":31,"numTemporaryLockouts":2,"disabled":true,...,"lastFailure":1792049905078}
```

`1792049965 - 1792049905,078 = 59,9`: lần sai thứ 31 khoá thêm 60 s (luật 2). Hết khoá đó, mật khẩu đúng: `HTTP 200`, mọi bộ đếm về 0.

### 4.4 Quick login check và form trình duyệt

```bash
python3 tmp-kc20-bf.py try alice wrong 2 0.2       # hai lần sai cách 0,2 s
```
```
{"failedLoginNotBefore":1792050030,"numFailures":2,"numTemporaryLockouts":0,"disabled":true,...,"lastFailure":1792049970476}
```

Count mới 2 mà đã khoá 60 s (`minimumQuickLoginWaitSeconds`), và `numTemporaryLockouts` không tăng (luật 4). Trong lúc khoá, submit form login trình duyệt với mật khẩu đúng:

```
HTTP 200 message: ['Invalid username or password.']
```

Cùng câu với sai mật khẩu và username không tồn tại (đo riêng).

### 4.5 Chuỗi MULTIPLE thu nhỏ

Thấy bậc 120 s với tham số thật mất nửa giờ, nên thu nhỏ, giữ công thức: `failureFactor=3`, `waitIncrementSeconds=5`, `maxFailureWaitSeconds=12`. Script `tmp-kc20-seq.py` gửi một lần sai, đọc trạng thái, chờ hết khoá, lặp:

```
numFailures= 3 numTemporaryLockouts=1 lock=  4.2 s
numFailures= 6 numTemporaryLockouts=4 lock=  9.7 s
numFailures= 9 numTemporaryLockouts=7 lock= 11.7 s
numFailures=11 numTemporaryLockouts=9 lock= 11.7 s
```
(chỉ giữ dòng đổi bậc; count 1–2 lock 0, count 4–5 lock 4,7 s, 7–8 lock 9,7 s, 10 lock 11,7 s)

`5 * (3/3) = 5`, `5 * (6/3) = 10`, `5 * (9/3) = 15` bị cắt còn 12. Các số lẻ thấp hơn khoảng 0,3–0,8 s vì `failedLoginNotBefore` làm tròn xuống giây. Cùng tham số thu nhỏ, đặt `maxDeltaTimeSeconds=20`: hai lần sai, chờ 22 s, sai lần nữa thì `numFailures: 1`; hai lần sai, chờ 10 s, sai lần nữa thì `numFailures: 3` và bị khoá (luật 5).

### 4.6 Khoá vĩnh viễn, và khởi động lại

Tham số mặc định, `permanentLockout=true`, 30 lần sai, rồi chờ 65 s và nhập đúng:

```
{"failedLoginNotBefore":9223372036854775807,"numFailures":30,"numTemporaryLockouts":0,"disabled":true,...}
{"enabled":false}
14:41:47 #1 HTTP 400  44.10 ms {"error": "invalid_grant", "error_description": "Invalid user credentials"}   <- đúng, sau 65 s
error="user_disabled"
```

`failedLoginNotBefore` là Long lớn nhất, tức "không bao giờ". Sau `DELETE attack-detection/brute-force/users/<id>`, user vẫn `{"enabled":false}` và login đúng vẫn `400`; chỉ sau `kc update users/<id> -s enabled=true` mới `200`.

Restart: 5 lần sai cho `{"numFailures":5,"lastFailure":1792050276486}`; dừng process, khởi động lại, đọc lại: `{"numFailures":5,"lastFailure":1792050276486}`.

### 4.7 Policy, rehash và benchmark

```bash
kc update realms/bf -s 'passwordPolicy=hashAlgorithm(pbkdf2-sha512)'
kc get users/<id>/credentials -r bf        # trước khi alice login
python3 tmp-kc20-bf.py try alice 'Long-Passw0rd-1' 1
kc get users/<id>/credentials -r bf        # sau 1 lần login
```
```
argon2 5 1792050287987
14:45:37 #1 HTTP 200 218.50 ms access_token
pbkdf2-sha512 210000 1792050287987
```

Cột cuối là `createdDate`: credential được ghi đè tại chỗ chứ không tạo mới. Benchmark `tmp-kc20-round.sh 3` cho bảng ở 3.7, ví dụ vòng 2: `p50=19.18` (argon2), `p50=111.07` (pbkdf2-sha512), `p50=19.79` (27.500 vòng).

Script login một lần sau mỗi lần đổi policy để `alice` được băm lại trước khi đo; metric `keycloak_credentials_password_hashing_validations_total` có đủ ba nhãn `hashing_strength`: `Argon2id-1.3[m=7168,t=5,p=1]`, `210000`, `27500`.

---

## 5. Tính tay

### 5.1 Một tài khoản, 24 giờ, mặc định đã bật

Luật từ 3.2: kẻ tấn công cách mỗi lần đoán ít nhất 1 s (né quick login check); sai lần thứ `n` với `n >= 30` thì khoá `min(60 * floor(n/30), 900)` giây; trong lúc khoá không đoán (vô ích, count không tăng).

| Khối | Lần đoán | Khoá sau mỗi lần | Thời gian khối | Cộng dồn |
|---|---|---|---|---|
| 0 | 1–29 | 0 (cách 1 s) | 29 s | 29 s |
| 1 | 30–59 | 60 s | 30 × 60 = 1.800 s | 1.829 s |
| 2 | 60–89 | 120 s | 3.600 s | 5.429 s |
| k | 30k → 30k+29 | 60k s | 1.800k s | 29 + 1.800 × k(k+1)/2 |
| 8 | 240–269 | 480 s | 14.400 s | 64.829 s |
| 9 | 270–299 | 540 s | 16.200 s | 81.029 s |
| 10 | 300–… | 600 s | | |

Sau 81.029 s đã có 299 lần đoán. Còn `86.400 - 81.029 = 5.371 s`; lần thứ 300 đoán ngay, rồi mỗi 600 s một lần: `floor(5.371 / 600) = 8` lần nữa. Tổng **308 lần trong 24 giờ**. Mô phỏng (`tmp-kc20-calc.py`) cho cùng 308.

Chạm trần 900 s ở lần 450: `29 + 1.800 × (14 × 15 / 2) = 189.029 s = 52,5 giờ`. Sau đó `86.400 / 900 = 96` lần mỗi ngày. Danh sách 10.000 mật khẩu phổ biến cần khoảng `52,5 / 24 + (10.000 − 450) / 96 = 101,7` ngày trên một tài khoản.

Khi tắt: 16 ms mỗi lần từ một luồng (lab, máy dev), tức khoảng `86.400 / 0,016 = 5,4` triệu lần/ngày. Chỉ xem bậc độ lớn: vài triệu lần/ngày, chỉ bị chặn bởi CPU của Keycloak.

Và kẻ tấn công kiên nhẫn đi đường spraying: 29 lần, nghỉ hơn 12 giờ, lặp lại: `29 × 86.400 / (43.200 + 29) = 58` lần/ngày/tài khoản, **không một lần khoá**, không có event `user_temporarily_disabled` nào để báo động. Thêm luật 1: nếu user thật đăng nhập thành công giữa chừng, count về 0, kẻ tấn công không cần nghỉ 12 giờ.

### 5.2 Giá để khoá cả công ty

Realm 10.000 user, kẻ tấn công có danh sách username.

Đề xuất "vĩnh viễn sau 5 lần sai": `10.000 × 5 = 50.000` request, một lần. Với tốc độ 60 request/s: `50.000 / 60 = 833 s ≈ 13,9` phút. Sau đó 10.000 tài khoản `enabled=false` cho tới khi admin mở từng cái; reset brute force không đủ (4.6).

Mặc định khoá tạm: cách rẻ nhất là quick login check, hai lần sai trong 1 s khoá 60 s. Duy trì khoá liên tục: `10.000 × 2 / 60 = 333` request/s. Sau 15 chu kỳ count đã chạm 30, từ đó một request mỗi lần hết khoá là đủ: `10.000 / 60 = 167` request/s, giảm dần khi bậc khoá tăng. Đắt hơn nhiều so với 50.000 request một lần, và dừng tấn công thì user tự hết khoá sau tối đa 15 phút.

> **Suy luận.** Docs không đưa con số DoS nào. Phép tính dựa trên các luật đo ở mục 4 (quick lock 60 s, khoá theo count, permanent thành `enabled=false`), giả định 60 request/s (một luồng tuần tự trong lab). Kiểm bằng: realm thử 100 user, chạy quick lock rồi đếm user đăng nhập được.

### 5.3 Số vòng tỷ lệ với CPU, kiểm bằng hai điểm đo

Docs nói CPU login tỷ lệ với số vòng hash. Lấy hai cấu hình PBKDF2 ở 3.7, giả định `latency = phần cố định + k × vòng`:

```
k = (109,54 - 19,43) / (210.000 - 27.500) = 0,494 ms mỗi 1.000 vòng
phần cố định = 19,43 - 27,5 × 0,494 = 5,85 ms
```

Mấy mili giây này đo lúc máy đang tải nên chỉ so được với nhau trong cùng phiên. Phần cố định gấp khoảng `5,85 / 1,63 = 3,6` lần client credentials đo cùng phiên, vì password grant còn tạo user session. Với 210.000 vòng, phần băm là `210 × 0,494 = 104` ms trên 109,54 ms, khoảng 95% thời gian login. Hai điểm luôn nối được một đường thẳng, nên đây chỉ là phép kiểm thô: số đo không mâu thuẫn với "tỷ lệ với số vòng", chưa chứng minh tuyến tính.

> **Chưa đo.** Docs không nói sizing 15 login/s/vCPU còn bao nhiêu với PBKDF2-SHA512 210.000 (FIPS). Tỷ lệ 4,97 gợi ý bậc 3 login/s/vCPU, không dùng để đặt máy. Đo bằng: load test password grant song song tới khi CPU bão hoà, đếm metric băm mỗi giây trên từng vCPU.

---

## 6. Chuyển giao

1. App mobile dùng password grant và tự retry ngay khi gặp `400`. Sau khi bật brute force, vài user "bị khoá dù không ai tấn công". Retry đó chạm luật nào ở 3.2, sửa ở app hay ở realm?
2. Realm bật OTP (bài 19); brute force áp cho cả OTP. Kẻ tấn công đã có mật khẩu đúng, đoán mã 6 chữ số. Ước lượng số mã thử được trong 24 giờ với mặc định đã bật, so với không gian 10^6.
3. Realm dùng identity brokering với Google (bài 15) cho 80% user, 20% còn lại dùng mật khẩu. Brute force detection có bảo vệ gì cho 80% kia không? Lỗ hổng đoán mật khẩu của họ nằm ở đâu?
4. Sếp muốn bỏ brute force detection, thay bằng rate limit 10 request/phút theo IP ở reverse proxy. Kịch bản nào ở mục 5 bị chặn tốt hơn, kịch bản nào kém hơn?
5. Chọn `failureFactor` cho realm nội bộ 200 nhân viên, tất cả bật MFA. Đưa một con số, lập luận bằng số lần đoán/ngày và chi phí DoS.
6. Realm chạy 3 năm với PBKDF2 210.000 vòng, giờ đổi sang Argon2id mặc định. Một tháng sau, 30% user chưa đăng nhập lại. Với các tài khoản đó, "username đúng, mật khẩu sai" chậm khoảng 5 lần "username không tồn tại" (tỷ lệ ở 3.7), dù thông báo lỗi giống hệt. Kẻ tấn công học được gì về từng tài khoản, nhóm nào lộ đáng ngại nhất, và đóng khe này thế nào mà không ép 30% kia đặt lại mật khẩu, không làm chậm login của 70% còn lại?

---

## 7. Tóm tắt

- Brute force detection **tắt** khi tạo realm. Chỉ áp cho password, OTP, recovery code; đếm theo tài khoản, docs không nói gì về chặn IP.
- Mặc định khi bật: 30 lần, MULTIPLE `60 × (count / 30)` chia nguyên, trần 900 s, quick login check 1.000 ms khoá 60 s, reset sau 12 giờ, khoá tạm.
- Từ lần sai thứ 30 **mỗi** lần sai đều khoá; đang khoá count đứng yên; một lần đúng đưa count về 0; hai lần sai trong 1 s khoá 60 s.
- Bị khoá vẫn nhận lỗi của sai mật khẩu; chỉ log có `user_temporarily_disabled` / `user_disabled`.
- Mặc định đã bật, một tài khoản: 308 lần đoán trong 24 giờ, chạm trần sau 52,5 giờ, sau đó 96 lần/ngày. Spraying 29 lần mỗi 12 giờ không gây khoá nào.
- Khoá vĩnh viễn thành `enabled=false`, reset brute force không mở lại; 50.000 request khoá 10.000 user tới khi admin mở tay.
- Từ 26.8, login failure lưu DB mặc định; restart không xoá trạng thái khoá.
- `passwordPolicy` mặc định null; policy chỉ kiểm khi đặt mật khẩu, không áp ngược. Ép đổi bằng required action `UPDATE_PASSWORD`.
- Băm mặc định (non-FIPS, từ 25.0.0): Argon2id v1.3, 5 vòng, 7.168 KiB, parallelism 1; PBKDF2-SHA512 210.000 chỉ mặc định khi FIPS, câu PBKDF2 ở threat model là phần sót. Đổi thuật toán thì hash cũ đợi lần login kế tiếp.
- Password login đắt khoảng 10 lần client credentials; PBKDF2-SHA512 210.000 chậm khoảng 5 lần Argon2id. User không tồn tại tốn gần bằng user thật vì Keycloak băm giả (`dummyHash`). Sizing: 15 password login/s mỗi vCPU.

→ **Bài 21 — Authorization Services**: token đã chứng minh được *ai* đang gọi; bài sau chuyển sang câu hỏi *được làm gì với resource nào*, và khi nào nên để Keycloak trả lời câu đó thay vì RBAC trong app.
