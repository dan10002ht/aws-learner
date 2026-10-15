# Bài 22 — SPI và custom authenticator

## 1. Mục tiêu

Sau bài này bạn có thể:

- Chỉ ra ba mảnh một jar provider cần để Keycloak nạp được, và cơ chế nào đọc chúng.
- Quyết định một mẩu state thuộc về factory hay provider, và chỉ ra vì sao giữ `KeycloakSession` trong factory là lỗi chỉ lộ ra từ lần login thứ hai.
- Deploy jar vào `providers/`, chạy `kc.sh build`, và đọc được `exit 2` khi quên build.
- Chọn giữa `success()`, `failure()`, `failureChallenge()`, `attempted()` dựa trên ba hệ quả đo được: HTTP status, event, bộ đếm brute force.
- Gắn authenticator vào bản copy browser flow đúng vị trí, và giải thích vì sao sai vị trí thì user bị báo sai mật khẩu dù chưa gõ gì.
- Ước lượng chi phí mỗi lần nâng version cho extension dùng SPI mà docs đánh dấu internal.

---

## 2. Triệu chứng

Một SaaS B2B muốn chặn đăng nhập của nhân viên khi request không đi qua gateway nội bộ; gateway gắn header `X-Lab-Gate: open` vào mọi request nó chuyển tiếp. Dev viết một authenticator 30 dòng: có header thì cho qua, không có thì trả 403 JSON. Gắn vào browser flow, thử bằng curl, đúng ý:

```
[1] HTTP 200 man login -> POST username/password
[2] HTTP 403 title=None msg='{"error":"access_denied","error_description":"missing X-Lab-Gate header"}'
```

Hai tuần sau đội bảo mật hỏi: SIEM đếm `LOGIN_ERROR` của realm, sao bước chặn này chưa từng sinh một dòng, trong khi gateway ghi nhận nhiều lần thử từ ngoài? Bạn tái hiện ba lần login đúng mật khẩu, thiếu header, rồi đọc event đã lưu và trạng thái brute force:

```
--- events (stored)
--- brute force alice
  "numFailures" : 0,
  "disabled" : false,
```

Không event nào, bộ đếm bằng 0. Để chắc realm không hỏng, bạn gõ sai mật khẩu hai lần liền: có ngay hai dòng `LOGIN_ERROR invalid_user_credentials`, `numFailures` lên 2, user bị khoá tạm.

> **Đo trên lab (chạy riêng cho bài này).** Keycloak 26.8.1 bản zip, `kc.sh build` rồi `start --optimized`, cổng 5922 / management 6922, Java 24.0.2, Mac mini Apple M4. Realm `kc22` bật `eventsEnabled=true`, brute force bật với `failureFactor=3` (hai lần sai mật khẩu cách nhau dưới 1000 ms đã đủ khoá tạm nhờ Quick Login Check, bài 20). Authenticator `lab-gate` đặt REQUIRED trong sub-flow forms của bản copy browser flow. Output: `~/projects/keycloak-lab/lab-kc22/run/r2-fail-response.txt`, `run/r3-wrongpw.txt`.

---

## ⏸ Dừng lại — đoán trước #1

Bước chặn chạy đúng (403), mật khẩu sai thì có event và bị đếm. Vì sao lần bị chặn ở bước custom không để lại dấu vết nào?

```
(a) Realm chưa bật Save Events nên event không được lưu
(b) Authenticator trả failure() kèm Response riêng: flow gửi nguyên Response đó về client,
    không ai gọi event.error(), và brute force vốn không đếm bước custom
(c) Authenticator đặt trước Username Password Form nên lúc chặn chưa biết user là ai
(d) Brute force chỉ ghi nhận sau khi đủ failureFactor lần sai, 3 lần là chưa tới
```

---

## 3. Lý thuyết

### 3.1 SPI: Keycloak là một tập điểm cắm

**SPI** (Service Provider Interface) là một cặp interface Java mà Keycloak định nghĩa cho một loại chức năng; muốn thêm hoặc thay chức năng đó thì viết class hiện thực cặp interface ấy. Đăng nhập bằng mật khẩu, gửi email, lưu event, đọc user từ LDAP (bài 16) đều là provider của một SPI.

Mỗi SPI có một tên (log build của lab in ra `authenticator`, `eventsListener`), mỗi provider có một **provider ID** do `getId()` của factory trả về (`lab-gate`, `lab-require-header`). Authenticator là SPI cho nhiều provider cùng sống, mỗi execution trong flow trỏ tới một provider ID. Đăng ký provider trùng ID với provider built-in thì cái có `order()` cao nhất thắng: đó là cách ghi đè hành vi có sẵn mà không sửa Keycloak.

**Keycloak tìm thấy class của bạn bằng `java.util.ServiceLoader`** của JDK. Quy ước: trong jar có file `META-INF/services/<tên đầy đủ của interface>`, mỗi dòng là tên đầy đủ một class hiện thực. Với authenticator:

```
src/main/resources/META-INF/services/org.keycloak.authentication.AuthenticatorFactory
    lab.kc.spi.RequireHeaderAuthenticatorFactory
    lab.kc.spi.GateAuthenticatorFactory
```

File liệt kê **factory**, không liệt kê authenticator: authenticator do factory tạo ra. Quên file này thì jar vẫn copy được, build vẫn chạy, chỉ là provider không bao giờ xuất hiện.

> **Đo trên lab (chạy riêng cho bài này).** `javap -c` trên `org.keycloak.keycloak-services-26.8.1.jar`, class `org.keycloak.provider.DefaultProviderLoader`: có lời gọi `java/util/ServiceLoader.load` rồi `ServiceLoader.iterator`. Docs Keycloak không gọi tên ServiceLoader; bằng chứng là bytecode.

> **Nguồn.** *"To implement an SPI you need to implement its ProviderFactory and Provider interfaces. You also need to create a service configuration file."*; *"In case of multiple implementations with same provider ID, only the one with highest order will be used by Keycloak runtime."*; *"This file must list the fully qualified class name of each AuthenticatorFactory implementation you have in the jar."* ([server_development](https://www.keycloak.org/docs/latest/server_development/index.html)).

### 3.2 Factory sống cả đời server, provider sống một request

Bản sai mà người quen Spring hay mang theo: "provider là một bean singleton, nhét gì vào field cũng được". Keycloak chia hai vòng đời:

- **ProviderFactory**: **một instance duy nhất** cho cả server, nên là nơi giữ được state dùng chung qua request: cấu hình đã đọc, HTTP client pool, bộ đếm. Vòng đời: constructor, `init(Config.Scope)`, `postInit(KeycloakSessionFactory)`, `close()` lúc tắt.
- **Provider**: tạo mới **mỗi request** bằng `factory.create(session)`, phải nhẹ. Nó nhận `KeycloakSession` đại diện cho đúng request đó: transaction DB, realm, user đang đăng nhập.

Nguyên nhân gốc là transaction. Mỗi request mở một `KeycloakSession` với transaction riêng, mọi đọc ghi trong request đi qua nó và commit ở cuối. Provider gắn với session nên gắn với transaction; factory không thuộc request nào nên không được chạm transaction nào.

Lab gắn log vào vòng đời:

```
KC22 factory constructed @1597899076          <- build.log (JVM của kc.sh build)
KC22 factory constructed @772085411           <- kc.log (JVM của server)
KC22 init factory@772085411
KC22 postInit factory@772085411
KC22 create #18 factory@772085411 session@237088905
...                                            (#19 tới #26)
KC22 create #27 factory@772085411 session@237088905
KC22 authenticate provider#27 session@237088905 mode=fail-response
KC22 close provider#26
```

Đọc được bốn điều. Constructor của factory chạy cả trong JVM của `kc.sh build` (build đọc metadata provider): constructor mở kết nối ra ngoài thì build cũng mở. `init` và `postInit` chạy đúng một lần. **Một login thành công** (GET trang login + POST form) gọi `create()` **10 lần** mà `authenticate()` chỉ một lần: engine tạo authenticator cả để hỏi `requiresUser()`, `configuredFor()`. Và trong 10 instance chỉ một cái được `close()`.

> **Đo trên lab (chạy riêng cho bài này).** Log `kc.log`, `build.log`, lần chạy `run/r1-ok.txt` trong `~/projects/keycloak-lab/lab-kc22/`. Đếm lại: `grep -c "KC22 create" run/r1-ok.txt` ra 10.

> **Suy luận.** Docs không nói `close()` của provider được gọi bao nhiêu lần; lab thấy 1/10. Vậy đừng mở socket, file trong constructor authenticator rồi trông vào `close()`. Tài nguyên đắt mở một lần ở `postInit` của factory, đóng ở `close()` của factory.

`create()` được gọi mỗi request, nhưng trả object mới hay một object dựng sẵn là quyền của bạn (`RequireHeaderAuthenticatorFactory` ở lab2 trả `SINGLETON`). An toàn chừng nào class authenticator **không có field** mang dữ liệu request; mọi thứ của request đi qua `context`.

> **Nguồn.** *"Keycloak creates a single instance of provider factories which makes it possible to store state for multiple requests."*; *"Provider instances are created by calling create on the factory for each request so these should be light-weight object."* ([server_development](https://www.keycloak.org/docs/latest/server_development/index.html)).

<svg viewBox="0 0 700 330" role="img" aria-labelledby="kc22-a-t kc22-a-d" style="width:100%;height:auto">
<title id="kc22-a-t">Vòng đời factory và provider</title>
<desc id="kc22-a-d">Factory được dựng một lần trong JVM build và một lần trong JVM server, sống tới khi tắt; mỗi request tạo nhiều provider gắn với session của request đó; giữ session trong factory là trỏ sang session của request đã kết thúc.</desc>
<defs><marker id="kc22-a-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="20" y="28" font-size="12" font-weight="bold" fill="currentColor">kc.sh build</text>
<text x="170" y="28" font-size="12" font-weight="bold" fill="currentColor">start --optimized</text>
<text x="330" y="28" font-size="12" font-weight="bold" fill="currentColor">request 1</text>
<text x="510" y="28" font-size="12" font-weight="bold" fill="currentColor">request 2</text>
<text x="20" y="70" font-size="11" fill="currentColor">Factory</text>
<rect x="80" y="50" width="80" height="34" rx="6" fill="#64748b" fill-opacity="0.25"/>
<text x="120" y="71" text-anchor="middle" font-size="10" fill="currentColor">new, rồi bỏ</text>
<rect x="170" y="50" width="510" height="34" rx="6" fill="#3b82f6" fill-opacity="0.25"/>
<text x="425" y="71" text-anchor="middle" font-size="11" fill="currentColor">1 instance: constructor, init(), postInit() ... close() khi tắt server</text>
<text x="20" y="150" font-size="11" fill="currentColor">Provider</text>
<rect x="320" y="120" width="160" height="56" rx="6" fill="#84cc16" fill-opacity="0.25"/>
<text x="400" y="142" text-anchor="middle" font-size="11" fill="currentColor">create() x N</text>
<text x="400" y="160" text-anchor="middle" font-size="10" fill="currentColor">mỗi lần 1 object</text>
<rect x="500" y="120" width="180" height="56" rx="6" fill="#84cc16" fill-opacity="0.25"/>
<text x="590" y="142" text-anchor="middle" font-size="11" fill="currentColor">create() x N</text>
<text x="590" y="160" text-anchor="middle" font-size="10" fill="currentColor">authenticate() trên 1 object</text>
<text x="320" y="110" font-size="10" fill="currentColor">lab: 10 create cho 1 login (2 request)</text>
<text x="20" y="250" font-size="11" fill="currentColor">Session</text>
<rect x="320" y="228" width="160" height="40" rx="6" fill="#f59e0b" fill-opacity="0.25"/>
<text x="400" y="252" text-anchor="middle" font-size="10" fill="currentColor">session + transaction 1</text>
<rect x="500" y="228" width="180" height="40" rx="6" fill="#f59e0b" fill-opacity="0.25"/>
<text x="590" y="252" text-anchor="middle" font-size="10" fill="currentColor">session + transaction 2</text>
<line x1="400" y1="176" x2="400" y2="226" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc22-a-arrow)"/>
<line x1="590" y1="176" x2="590" y2="226" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc22-a-arrow)"/>
<path d="M230,84 C230,290 330,300 360,270" fill="none" stroke="#ef4444" stroke-width="1.8" marker-end="url(#kc22-a-arrow)"/>
<text x="120" y="300" font-size="10" fill="currentColor">static field giữ session request 1</text>
<text x="120" y="314" font-size="10" fill="currentColor">dùng lại ở request 2: transaction đã đóng</text>
</svg>

---

## ⏸ Dừng lại — đoán trước #2

Một dev muốn đỡ truyền `session` qua nhiều hàm, nên trong `create()` lưu một `KeycloakSession` nhận được vào một `static` field của factory (chỉ lưu lần đầu, khi field còn null), rồi ở các login sau dùng nó để `users().getUserById(...)` và ghi một attribute. Chuyện gì xảy ra?

```
(a) Không compile được: KeycloakSession không cho gán vào static
(b) Chạy đúng mãi, vì session thực chất là proxy dùng chung
(c) Login đầu sau restart chạy được; các login sau nổ IllegalStateException,
    user thấy một trang lỗi chung chung
(d) Không nổ gì, nhưng attribute ghi vào bị mất
```

---

### 3.3 Session không thuộc về factory: lỗi trễ một nhịp

Điều làm bản sai này khó bắt: object `session` truyền vào `create()` thường **không phải session thật**. Lab in tên class:

```
KC22 create #1 ... session@1303326419 ...getKeycloakSession_..._ClientProxy tx@1094025347
KC22 create #5 ... session@1303326419 ...getKeycloakSession_..._ClientProxy tx@1931468252
KC22 create #9 ... session@1082844452 org.keycloak.quarkus.runtime.integration.QuarkusKeycloakSession tx@1931468252
```

Cùng `session@1303326419` ở hai request, nhưng transaction manager (`tx@`) đổi: đó là **client proxy** của Quarkus CDI, mỗi lời gọi chuyển sang session thật của request hiện tại. Giữ proxy thì tình cờ không sao (`run/r5-stale.txt`: giữ proxy, request sau vẫn đọc được user; bản chỉ đọc, một lần). Nhưng có lúc `create()` nhận thẳng session thật (lần #9), và code không biết mình đang cầm loại nào.

Lab cố ý giữ session thật đầu tiên vào `static` field, đăng nhập ba lần sau mỗi lần restart, lặp ba chu kỳ:

```
cycle 1 login 1: [2] 302 -> callback co code
cycle 1 login 2: [2] HTTP 400 title='Sign in to kc22' msg='Unexpected error when handling authentication re
cycle 1 login 3: [2] HTTP 400 title='Sign in to kc22' msg='Unexpected error when handling authentication re
```

Log server ở login 2 và 3:

```
KC-SERVICES0013: Failed authentication: java.lang.IllegalStateException: Cannot access delegate without a transaction
type="LOGIN_ERROR", ... userId="null", ... error="invalid_user_credentials"
```

Đáp án gần nhất là **(c)** khi field giữ session thật; giữ phải proxy thì (b) đúng tình cờ. Lab: 3/3 login đầu thành công, 6/6 login sau lỗi. Login đầu chạy vì session được giữ thuộc chính request đó; sang request sau, transaction của nó đã đóng. Thêm nữa, event ghi `invalid_user_credentials`: SIEM đếm đây là sai mật khẩu.

(d) sai ở lab: attribute ghi ở login 1 có trong DB. Admin API ban đầu trả `attributes` rỗng chỉ vì realm ẩn attribute không khai trong User Profile; bật `unmanagedAttributePolicy=ENABLED` thì thấy `kc22_stamp`.

> **Đo trên lab (chạy riêng cho bài này).** 3 chu kỳ restart x 3 login, mode `stale-session`, log `kc-c1.log`..`kc-c3.log`. Lần chạy thử trước đó (`run/r9-w1.txt` qua, `run/r9-w2.txt` lỗi) cùng kiểu: tổng 4/4 login đầu qua, 7/7 login sau lỗi. Mẫu nhỏ: đọc là "lặp lại được trên lab", không phải "luôn luôn" (ghi chú r9 trong `RESULTS.txt` ghi ngược, file output mới đúng). Biến thể chỉ đọc thì đọc được user qua session cũ ở login thứ hai (`run/r8-stale-cross.txt`, một lần).

> **Suy luận.** Bản chỉ đọc sống sót có lẽ vì user nằm sẵn trong user cache; ở bản có ghi, lần ghi loại entry cache nên lần đọc sau phải xuống DB. Docs không mô tả. Kiểm bằng: chạy bản chỉ đọc ngay sau restart.

Luật rút ra: factory chỉ giữ thứ không thuộc request nào. Cần session ngoài `create()`/`authenticate()`, ví dụ trong tác vụ nền, thì mở session mới từ `KeycloakSessionFactory` nhận ở `postInit`.

### 3.4 Deploy: copy jar chưa đủ, phải build lại

Bản sai mang từ thời WildFly: "thả jar vào thư mục deploy là server tự nhận". Bản Quarkus nhận provider ở `providers/` và **không hot-deploy**.

Lý do nằm ở cách Quarkus khởi động nhanh (bài 6): quét class, dựng cấu hình được làm trước ở bước **build** (augmentation) và lưu lại. `start --optimized` tin kết quả build còn đúng và bỏ qua bước đó. `start` không `--optimized` (và `start-dev`) tự build ngầm mỗi lần khởi động, chậm thêm đúng bằng thời gian build. Ở lab build tốn khoảng 13,5 giây, còn quên build thì server không lên:

```
$ cp spi-kc22/target/spi-demo-1.0.0.jar keycloak-26.8.1/providers/
$ kc.sh start --optimized ...; echo "exit=$?"
exit=2
A provider JAR was updated since the last build, please rebuild for this to be fully utilized.
```

Một dòng, không stack trace: pipeline chỉ thấy container restart liên tục.

Jar **không có classloader riêng**, nằm chung classpath với Keycloak. Hệ quả: dependency Keycloak đã có phải `scope=provided` (pom lab2: `keycloak-server-spi`, `keycloak-server-spi-private`, `keycloak-services`, cả ba `provided`), và thư viện bạn kéo theo mà Keycloak cũng dùng, khác version, sẽ đụng nhau. Pom compile `release 17`; image chính thức chạy OpenJDK 21, nên bytecode target trên 21 không nạp được trong container dù chạy được trên máy dev Java 24.

> **Đo trên lab.** lab2 (Keycloak 26.8.1, Mac mini M4): `kc.sh build` 5 lần `real 13.18 / 13.53 / 13.31 / 13.14 / 13.03 s`, augmentation 12140 - 12499 ms; `mvn package` 28.8 s lần đầu, 1.36 s lần sau. Lab bài này: `kc.sh build` 13,777 s và 13,546 s; exit 2 tái hiện ở `kc-opt-fail.log`.

> **Nguồn.** *"Providers are registered with the server by simply copying the JAR file to the providers directory."*; *"After registering new providers or dependencies Keycloak needs to be re-built with a non-optimized start or the..."*; *"Provider JARs are not loaded in isolated classloaders, so do not include resources or classes in your provider JARs that conflict with built-in resources or classes."*; *"The official Keycloak container image uses OpenJDK 21 as the Java runtime environment."* ([server_development](https://www.keycloak.org/docs/latest/server_development/index.html)). *"By default, when you use the start or start-dev command, Keycloak runs a build command under the covers for convenience reasons."*; *"The --optimized parameter tells Keycloak to assume a pre-built, already optimized Keycloak image is used."* ([configuration](https://www.keycloak.org/server/configuration)).

### 3.5 Interface Authenticator: năm method, năm kiểu kết quả

Tối thiểu hai class: `AuthenticatorFactory` (provider ID, tên hiển thị, requirement cho chọn, có cấu hình hay không) và `Authenticator` (logic). Năm method của `Authenticator`, theo thứ tự engine dùng:

| Method | Engine gọi khi nào |
|---|---|
| `requiresUser()` | Trước khi chạy: execution có cần user đã xác định chưa (`lab-gate`: `true`) |
| `configuredFor(session, realm, user)` | Khi cần user: user đã có thứ authenticator cần chưa (vd OTP) |
| `setRequiredActions(...)` | `configuredFor` trả false và cho phép tự thiết lập: gắn required action (bài 19) |
| `authenticate(context)` | Lần đầu execution chạy trong flow |
| `action(context)` | User submit form mà chính authenticator này hiện ra |

Trong `authenticate()` bạn không return kết quả mà gọi method trên `context`, engine quyết định bước tiếp. Lõi của `RequireHeaderAuthenticator` ở lab2 (bỏ phần dựng chuỗi JSON, thay bằng biến `json`):

```java
public void authenticate(AuthenticationFlowContext context) {
    String v = context.getHttpRequest().getHttpHeaders().getHeaderString(HEADER);
    if ("open".equals(v)) {
        context.success();
        return;
    }
    Response challenge = Response.status(Response.Status.FORBIDDEN)
            .type(MediaType.APPLICATION_JSON_TYPE).entity(json).build();
    context.failure(AuthenticationFlowError.ACCESS_DENIED, challenge);
}
```

Các trạng thái: `success()` (qua); `failure(error)`, `failure(error, response)` (hỏng); `challenge(response)` (gửi form, chờ submit, lúc đó `action()` chạy); `failureChallenge(error, response)` (hỏng nhưng cho thử lại, như form mật khẩu hiện lại kèm lỗi); `attempted()` (không lỗi, không thành công: request không có thứ bước này xét). Ở vị trí ALTERNATIVE, `challenge()` không gửi ngay: engine giữ response lại cho tới khi thử hết các phương án khác; muốn gửi ngay thì dùng `forceChallenge()`.

Tên gọi gợi ý điều sai: "failure" thì Keycloak tự ghi lỗi và tự đếm brute force; docs cũng tả `failureChallenge()` như vậy (hộp Nguồn dưới). Lab chạy mỗi kiểu ba lần, cùng điều kiện (mật khẩu đúng, thiếu header), đọc ba thứ:

| Gọi gì trong `authenticate()` | HTTP | Event lưu trong DB | `numFailures` |
|---|---|---|---|
| `failure(ACCESS_DENIED, response403)` | 403, JSON của bạn | không có | 0 |
| `failure(ACCESS_DENIED)`, không response | 400, trang "Invalid username or password." | `LOGIN_ERROR invalid_user_credentials` | 0 |
| `getEvent().error(...)` rồi `failure(..., response403)` | 403 | `LOGIN_ERROR lab_gate_denied` | 0 |
| `failureChallenge(INVALID_CREDENTIALS, response403)` | 403 | không có | 0 |
| `attempted()` ở vị trí REQUIRED | 400, "Invalid username or password." | `LOGIN_ERROR invalid_user_credentials` | 0 |
| Đối chứng: sai mật khẩu ở form có sẵn | 200, form hiện lại | `LOGIN_ERROR invalid_user_credentials` | 2, `disabled: true` |

Đáp án ⏸ #1 là **(b)**, và bảng tách ra hai cơ chế độc lập.

**Event.** Failure kèm `Response` thì engine gửi nguyên Response về client, không ghi event. Failure không Response thì engine ném exception; đường xử lý exception ghi `LOGIN_ERROR` nhưng đổi `ACCESS_DENIED` thành `invalid_user_credentials` và báo user "sai mật khẩu" dù mật khẩu đúng. Event mang đúng lý do chỉ có khi tự gọi `context.getEvent().error(...)`. Form mật khẩu built-in cũng làm vậy: bytecode `AbstractUsernameFormAuthenticator` gọi `EventBuilder.error` ngay trước mỗi `failureChallenge`. Event là việc của authenticator, không phải của engine.

**Brute force.** Không kiểu nào làm `numFailures` nhích, kể cả `failureChallenge` với `INVALID_CREDENTIALS`, kể cả khi event đã ghi. Lab ngược với câu chữ docs về `failureChallenge()`: tin số đo. Docs khoanh phạm vi brute force: chỉ mật khẩu, OTP, recovery code (bài 20). Bước custom nằm ngoài. Mọi `LOGIN_ERROR` từ bước custom còn mang `userId="null"` dù user đã qua form mật khẩu.

> **Đo trên lab (chạy riêng cho bài này).** Mỗi dòng bảng 3 lần login (đối chứng 2 lần), file `run/r2-*.txt`, `run/r3-wrongpw.txt`. `fail-challenge` chạy thêm 1 lần sau 61 giây (`run/r4-fc-single.txt`): vẫn không event, `numFailures` 0. Bytecode: `javap -c` class `AbstractUsernameFormAuthenticator` của jar 26.8.1.

> **Nguồn.** *"To create an authenticator, you must at minimum implement the org.keycloak.authentication.AuthenticatorFactory and Authenticator interfaces."*; *"If instead the provider returned a challenge() status, the flow would hold the challenge response until all other alternatives are attempted."*; *"A failureChallenge() means that there is a challenge, but that the flow should log this as an error in the error log."* ([server_development](https://www.keycloak.org/docs/latest/server_development/index.html), đọc ở bản docs offline 26.8.1). *"Keycloak applies it only to password, OTP and recovery codes."* ([password-guess-brute-force-attacks](https://www.keycloak.org/docs/latest/server_admin/index.html#password-guess-brute-force-attacks)).

> **Suy luận.** Nếu bước custom kiểm một bí mật đoán được (mã PIN, câu hỏi bảo mật), kẻ đã có mật khẩu được đoán không giới hạn: brute force không đếm và, nếu trả Response riêng, không có event để báo động. Authenticator loại này phải tự đếm lỗi (attribute của user hoặc cache) và tự ghi event.

### 3.6 Gắn vào flow: vị trí quyết định tất cả

Bài 18 đã mổ execution và requirement. Ở đây: không sửa flow built-in mà copy nó, thêm execution vào bản copy, gắn cho đúng client qua `authenticationFlowBindingOverrides`; client khác không bị ảnh hưởng.

Execution mới được thêm vào **đầu** sub-flow. `lab-gate` khai `requiresUser() = true`, nên đứng trước Username Password Form nó cần user khi chưa ai gõ username, và docs nói flow khi đó dừng hẳn: GET `/auth` đầu tiên trả luôn trang "Invalid username or password." kèm `LOGIN_ERROR ... userId="null"`, và `authenticate()` **không hề được gọi** vì engine kiểm `requiresUser()` trước. Một lần `lower-priority` đẩy nó xuống sau form mật khẩu thì flow chạy như hình.

<svg viewBox="0 0 700 380" role="img" aria-labelledby="kc22-b-t kc22-b-d" style="width:100%;height:auto">
<title id="kc22-b-t">Browser flow có bước lab-gate</title>
<desc id="kc22-b-d">Trình duyệt GET trang auth, nhận form login, POST mật khẩu; engine chạy Username Password Form rồi gọi lab-gate; có header thì trả 302 kèm code, thiếu header thì trả nguyên 403 của authenticator, không ghi event, không đếm brute force.</desc>
<defs><marker id="kc22-b-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="40" y="14" width="120" height="30" rx="6" fill="#64748b" fill-opacity="0.25"/>
<text x="100" y="34" text-anchor="middle" font-size="11" fill="currentColor">Trình duyệt</text>
<rect x="270" y="14" width="160" height="30" rx="6" fill="#3b82f6" fill-opacity="0.25"/>
<text x="350" y="34" text-anchor="middle" font-size="11" fill="currentColor">Keycloak flow engine</text>
<rect x="520" y="14" width="140" height="30" rx="6" fill="#8b5cf6" fill-opacity="0.25"/>
<text x="590" y="34" text-anchor="middle" font-size="11" fill="currentColor">lab-gate</text>
<line x1="100" y1="44" x2="100" y2="370" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<line x1="350" y1="44" x2="350" y2="370" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<line x1="590" y1="44" x2="590" y2="370" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<line x1="100" y1="70" x2="348" y2="70" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc22-b-arrow)"/>
<text x="110" y="64" font-size="10" fill="currentColor">1. GET /auth?client_id=web&amp;...</text>
<line x1="350" y1="100" x2="102" y2="100" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc22-b-arrow)"/>
<text x="120" y="94" font-size="10" fill="currentColor">2. 200 form login (challenge)</text>
<line x1="100" y1="135" x2="348" y2="135" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc22-b-arrow)"/>
<text x="110" y="129" font-size="10" fill="currentColor">3. POST user + mật khẩu (+ header?)</text>
<rect x="290" y="148" width="120" height="34" rx="6" fill="#84cc16" fill-opacity="0.25"/>
<text x="350" y="162" text-anchor="middle" font-size="10" fill="currentColor">4. Username Password</text>
<text x="350" y="175" text-anchor="middle" font-size="10" fill="currentColor">Form: success()</text>
<line x1="350" y1="200" x2="588" y2="200" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc22-b-arrow)"/>
<text x="362" y="194" font-size="10" fill="currentColor">5. create() + authenticate(ctx)</text>
<line x1="590" y1="235" x2="352" y2="235" stroke="#84cc16" stroke-width="1.8" marker-end="url(#kc22-b-arrow)"/>
<text x="400" y="229" font-size="10" fill="currentColor">6a. có header: success()</text>
<line x1="350" y1="255" x2="102" y2="255" stroke="#84cc16" stroke-width="1.8" marker-end="url(#kc22-b-arrow)"/>
<text x="120" y="249" font-size="10" fill="currentColor">7a. 302 redirect_uri?code=...</text>
<line x1="590" y1="295" x2="352" y2="295" stroke="#ef4444" stroke-width="1.8" marker-end="url(#kc22-b-arrow)"/>
<text x="380" y="289" font-size="10" fill="currentColor">6b. thiếu header: failure(.., 403)</text>
<line x1="350" y1="318" x2="102" y2="318" stroke="#ef4444" stroke-width="1.8" marker-end="url(#kc22-b-arrow)"/>
<text x="120" y="312" font-size="10" fill="currentColor">7b. nguyên 403 JSON của bạn</text>
<rect x="150" y="332" width="400" height="30" rx="6" fill="#ef4444" fill-opacity="0.15"/>
<text x="350" y="351" text-anchor="middle" font-size="10" fill="currentColor">lab: không event LOGIN_ERROR, numFailures vẫn 0</text>
</svg>

Hai điểm nữa. `attempted()` ở vị trí REQUIRED **là thất bại** (bảng 3.5): REQUIRED đòi `success()`; `attempted()` chỉ có nghĩa ở ALTERNATIVE, để engine chuyển sang phương án kế, đúng như Cookie trả `attempted()` khi không có cookie SSO rồi flow đi tiếp xuống sub-flow forms. Và đặt execution REQUIRED ở **cấp trên cùng** browser flow, cạnh Cookie và sub-flow forms đang ALTERNATIVE, thì theo luật docs các ALTERNATIVE đó không chạy nữa.

> **Nguồn.** *"All Required elements in the flow must be successfully sequentially executed. The flow terminates if a required element fails."*; *"Because the Required flow elements are sufficient to mark a flow as successful, any Alternative flow element within a flow containing Required flow elements will not execute."* ([_authentication-flows](https://www.keycloak.org/docs/latest/server_admin/index.html#_authentication-flows)). Về `attempted()` và `requiresUser()`: *"This means there was no error condition, but no success either."*; *"If it did, the flow would abort and the user would see an error screen."* ([server_development](https://www.keycloak.org/docs/latest/server_development/index.html)).

> **Chưa đo.** Lab không thử đặt `lab-gate` REQUIRED ở cấp trên cùng, nên không có output cho việc Cookie (SSO) bị bỏ qua. Đo bằng: thêm execution vào `gated-browser` cấp 0, login một lần, mở lại `/auth` với cùng cookie, xem form có hiện lại không.

---

## ⏸ Dừng lại — đoán trước #3

Build log của lab có một dòng WARN cho mỗi provider của bạn. Chúng cảnh báo điều gì?

```
(a) Provider chưa ký số, Keycloak không xác minh được nguồn gốc jar
(b) SPI mà provider hiện thực là SPI nội bộ, bản Keycloak sau có thể đổi nó không báo trước
(c) Provider được build bằng JDK khác với JDK của server
(d) Provider ID trùng một provider built-in nên bị ghi đè
```

---

### 3.7 SPI public và SPI internal: hoá đơn tới lúc nâng version

Đáp án **(b)**:

```
WARN [org.keycloak.services] KC-SERVICES0047: lab-gate (lab.kc.spi.GateAuthenticatorFactory) is implementing the internal SPI authenticator. This SPI is internal and may change without notice
```

Event listener `lab-json-login` nhận đúng dòng như vậy, với SPI `eventsListener`.

Docs đánh dấu cả Authentication SPI lẫn Event Listener SPI là **internal**: ổn định qua các bản trước, nhưng bản nào cũng được đổi mà không báo. Hai SPI hay viết extension nhất lại không cam kết tương thích. Nặng hơn internal là **unsupported**: thêm JPA entity riêng vào DB Keycloak, có thể bị gỡ.

Nguyên nhân gốc: authenticator chạm `AuthenticationFlowContext`, `EventBuilder`, những class nằm sâu trong engine (hai trong ba dependency của pom là `spi-private` và `services`), và Keycloak giữ quyền refactor engine. Jar compile với chữ ký cũ có thể gặp `NoSuchMethodError` lúc runtime, hoặc vẫn chạy nhưng hành vi lúc thất bại đổi lặng lẽ, kiểu engine đổi mã lỗi ở bảng 3.5.

Docs còn dặn pom import đúng version server. Gộp lại thành việc bắt buộc mỗi lần nâng version (bài 29 đặt vào kế hoạch upgrade tổng): đổi `keycloak.version`, compile lại, chạy lại test tích hợp của flow gồm cả các ca thất bại, build image mới. Event listener chi tiết ở bài 23.

> **Nguồn.** *"This is an internal SPI. While it was stable in the previous releases, any new release of Keycloak can change it without prior notice."*; *"This is an unsupported API, which means you can use it but there is no guarantee that it will not be removed or changed without warning."*; *"In this example, replace the occurrence of VERSION with 26.8.1, which is the current version of Keycloak."* ([server_development](https://www.keycloak.org/docs/latest/server_development/index.html)).

> **Suy luận.** Docs không nói bản nào đã đổi Authentication SPI. "Compile lại và test lại mỗi lần nâng version" suy ra từ ba dữ kiện: SPI internal, pom theo đúng version server, jar không có classloader cô lập. Kiểm bằng: chạy jar compile với 26.8.1 trên bản kế tiếp, so build log và bảng 3.5.

---

## 4. Lab

Keycloak 26.8.1 bản zip ở `~/projects/keycloak-lab/lab-kc22/`, cổng 5922 (5900 bị chiếm trên máy lab), management 6922. Code `spi-kc22/` chép từ `lab2/spi-demo/`, thêm `GateAuthenticator` đọc tham số `mode` từ authenticator config để một jar thử mọi dòng của bảng 3.5.

**Bước 1: build jar.** `mvn -q -o package`: 2,345 giây; jar bản cuối (đã có mode `stale-session`) `spi-demo-1.0.0.jar` 12.402 byte.

**Bước 2: copy vào `providers/`, build.**

```
$ time keycloak-26.8.1/bin/kc.sh build --health-enabled=true
KC-SERVICES0047: lab-gate (lab.kc.spi.GateAuthenticatorFactory) is implementing the internal SPI authenticator. ...
Quarkus augmentation completed in 12564ms
kc.sh build --health-enabled=true  14.90s user 0.80s system 113% cpu 13.777 total
```

Thấy gì: `KC22 factory constructed` có trong `build.log` (3.2). Sau đó đổi code, copy jar, quên build: exit 2 như 3.4; build lại 13,546 s thì `/health/ready` trả 200 sau 5 giây.

**Bước 3: dựng flow bằng kcadm.**

```
kc create authentication/flows/browser/copy -r kc22 -s newName=gated-browser
kc create "authentication/flows/gated-browser%20forms/executions/execution" -r kc22 -s provider=lab-gate
kc update "authentication/flows/gated-browser%20forms/executions" -r kc22 -b '{"id":"<EX>","requirement":"REQUIRED"}'
```

Sau đó tạo authenticator config `mode=fail-response` (`authentication/executions/<EX>/config`) và client `web` có `authenticationFlowBindingOverrides` trỏ `browser` sang `gated-browser`. Đọc lại sub-flow forms:

```
0 0 REQUIRED Lab kc22: gate          <- vừa thêm, nằm ĐẦU
0 1 REQUIRED Username Password Form
```

Login ngay lúc này: bước [1] đã là `HTTP 400 ... msg='Invalid username or password.'`. Chạy `kc create authentication/executions/<EX>/lower-priority` một lần thì gate xuống sau form.

**Bước 4: đổi `mode` và đo.** `tmp-kc22-run.sh` đổi config, xoá event và trạng thái brute force, chạy login N lần, in log, event, brute force. Có header: `[2] 302 -> callback co code`, event `LOGIN`. Không header: năm mode ra bảng 3.5; mode `stale-session` ra kết quả 3.3. Xong thì `kill $(cat kc.pid)`.

> **Đo trên lab (chạy riêng cho bài này).** Output trong `~/projects/keycloak-lab/lab-kc22/RESULTS.txt` và `run/`; script login `~/projects/keycloak-lab/tmp-kc22-login.py`. Ba login `fail-plain` cách nhau 75 ms và 73 ms (timestamp dòng `KC-SERVICES0013`: `10,676` / `10,751` / `10,824` s), mỗi lần gồm khởi động Python, GET, POST.

---

## 5. Tính tay

**Bài 1. Bí mật đoán được sau bước custom.** Realm thêm "mã PIN 4 chữ số" sau mật khẩu bằng authenticator tự viết, sai PIN thì `failureChallenge` hiện lại form. Kẻ tấn công đã có mật khẩu. Đoán hết PIN mất bao lâu, so với nếu brute force đếm như mật khẩu, cấu hình mặc định?

- 10^4 = 10.000 mã. Bước custom không tăng `numFailures` (bảng 3.5): không có khoá.
- Lab ~75 ms mỗi vòng GET + POST, một luồng: 10.000 x 0,075 s = 750 s = **12,5 phút**. Đây là cận trên: chạy song song nhanh hơn.
- Nếu được đếm như mật khẩu (luật bài 20: cách nhau ≥ 1 s, từ lần sai thứ 30 **mọi** lần sai khoá `min(60 x floor(n/30), 900)` s): lần 1–29 mất 29 s; lần 30–449 là 1.800 x (1 + ... + 14) = 189.000 s; lần 450–9.999 là 9.550 x 900 = 8.595.000 s. Tổng 8.784.029 s ≈ **101,7 ngày**, trùng số bài 20.
- Thiếu bộ đếm, yếu tố thứ hai 4 chữ số rơi trong vài phút thay vì vài tháng.

**Bài 2. Quên `--optimized` trong rolling restart.** Cụm 4 pod restart lần lượt. Image đã build sẵn jar, nhưng manifest chạy `start` không `--optimized`. Mỗi đợt mất thêm bao nhiêu?

- `start` không optimized build ngầm mỗi lần; build lab ~13,5 s trên máy dev (bậc độ lớn, pod thật có thể khác).
- Tuần tự: 4 x 13,5 = **54 s** thêm mỗi đợt. Với `--optimized` khoản này bằng 0, đổi lại quên build image sau khi đổi jar thì pod chết exit 2.

**Bài 3. Việc nặng đặt sai chỗ.** Authenticator đọc danh sách IP cho phép từ DB trong **constructor**, 2 ms mỗi lần (giả định, chưa đo). Cụm chạy 300 password login/s (mức docs đã test, 15 login/s mỗi vCPU tức 20 vCPU). Việc thừa mỗi giây?

- Lab: 10 `create()` mỗi login. 300 x 10 = 3.000 constructor/s.
- 3.000 x 2 ms = **6 giây công việc mỗi giây** (khoảng 6 luồng bận liên tục) cộng 3.000 truy vấn DB/s cho một danh sách không đổi. Đọc một lần ở `postInit` của factory: gần 0.

> **Nguồn.** *"For each 15 password-based user logins per second, allocate 1 vCPU to the cluster (tested with up to 300 per second)."* ([concepts-memory-and-cpu-sizing](https://www.keycloak.org/high-availability/single-cluster/concepts-memory-and-cpu-sizing)). *"The By multiple strategy uses the following formula to calculate wait time: Wait Increment in Seconds * (count / Max Login Failures)."* ([password-guess-brute-force-attacks](https://www.keycloak.org/docs/latest/server_admin/index.html#password-guess-brute-force-attacks)); mặc định `realm.setFailureFactor(30);`, `realm.setWaitIncrementSeconds(60);`, `realm.setMaxFailureWaitSeconds(900);` trong `RealmManager.java` tag 26.8.1.

---

## 6. Chuyển giao

1. Authenticator gọi một API chấm điểm rủi ro bên ngoài, timeout 2 giây. HTTP client tạo ở đâu, timeout đọc từ đâu, ai đóng nó?
2. Bạn muốn ghi đè hành vi Username Password Form built-in mà không đụng flow nào. Cơ chế nào ở 3.1 cho phép, và kiểm thế nào rằng bản của mình đang thắng?
3. Một bước custom chỉ áp cho user thuộc group `contractors`, user khác đi tiếp bình thường. Dùng `attempted()`, sub-flow CONDITIONAL, hay `configuredFor()`, và mỗi lựa chọn đổi gì ở bảng 3.5?
4. Image production build ở CI bằng `kc.sh build`, rồi một đồng nghiệp mount thêm jar vào `providers/` bằng volume lúc chạy. Pod ra sao, và sửa pipeline thế nào để chuyện này không lọt?
5. Event listener bài 23 sẽ đẩy `LOGIN_ERROR` lên SIEM. Với các kiểu ở bảng 3.5, SIEM thấy lần nào, mang `userId` gì, và authenticator phải đổi gì để đội bảo mật lọc được theo user?
6. Cụm 2 node. Authenticator đếm số lần sai PIN trong một `ConcurrentHashMap` ở factory, khoá user khi đủ 5 lần. Kẻ tấn công thử xen kẽ qua hai node, rồi một node restart giữa chừng. Thực tế kẻ tấn công được bao nhiêu lần thử trước khi khoá, và phải đặt bộ đếm ở đâu để nó đúng trên cả cụm, không biến mỗi login thành một lần ghi DB, và không phụ thuộc SPI internal có thể đổi ở bản Keycloak kế tiếp?

---

## 7. Tóm tắt

- SPI = cặp `ProviderFactory` + `Provider`; đăng ký bằng file `META-INF/services/<interface factory>` liệt kê class factory, đọc bằng `java.util.ServiceLoader` (lab, `javap`).
- Factory: một instance cho cả server, `init`/`postInit` một lần, chỗ duy nhất giữ state qua request; constructor chạy cả trong JVM `kc.sh build`. Provider: `create()` mỗi request; lab đếm 10 `create()` cho một login, chỉ 1 instance được `close()`.
- Giữ `KeycloakSession` thật trong factory (bản có ghi): lab 4/4 login đầu sau restart thành công, 7/7 login sau nổ `IllegalStateException: Cannot access delegate without a transaction`, event ghi `invalid_user_credentials`.
- Không hot-deploy: jar vào `providers/` rồi `kc.sh build` (lab 13,0–13,8 s); quên build thì `start --optimized` thoát exit 2. Jar chung classpath với server nên dependency Keycloak để `provided`.
- `failure(error, response)` trả nguyên Response, không event; `failure(error)` ghi `LOGIN_ERROR` nhưng đổi mã thành `invalid_user_credentials` và báo user "sai mật khẩu". Event đúng lý do chỉ có khi tự gọi `context.getEvent().error(...)`.
- Brute force chỉ áp cho mật khẩu, OTP, recovery code: lab đo `numFailures` 0 cho mọi kiểu thất bại của bước custom. Bí mật kiểm ở bước custom cần bộ đếm riêng.
- Execution mới vào đầu sub-flow; `requiresUser()=true` ở đó làm GET đầu tiên báo sai mật khẩu mà không gọi `authenticate()`. `attempted()` ở vị trí REQUIRED là thất bại.
- Authentication SPI và Event Listener SPI là internal (build log in `KC-SERVICES0047`); mỗi lần nâng version: đổi `keycloak.version`, compile lại, chạy lại test cả ca thất bại.

→ **Bài 23 — Event listener và user storage**: bước custom ở bài này chỉ hiện lên audit khi tự ghi event; bài sau viết phía nhận, một `EventListenerProvider` đẩy LOGIN và LOGIN_ERROR ra ngoài, rồi sang `UserStorageProvider` cho user nằm ở DB cũ.
