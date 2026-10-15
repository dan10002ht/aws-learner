# Bài 23 — Event listener và user storage

## 1. Mục tiêu

Sau bài này bạn có thể:

- Viết một `EventListenerProvider`, gắn nó vào realm bằng `kcadm.sh`, và chứng minh nó nhận event kể cả khi realm tắt lưu event.
- Đo được một listener gọi webhook 200 ms cộng bao nhiêu ms vào mỗi lần login, và chỉ ra vì sao `enlistAfterCompletion` không cứu được latency.
- Đặt việc chậm ra khỏi thread request bằng hàng đợi giữ ở Factory, rồi tính hàng đợi đó đầy sau bao lâu và mất gì khi server dừng.
- Viết một `UserStorageProvider` tối thiểu (lookup, kiểm mật khẩu, tìm kiếm) cho user nằm trong DB cũ của app, đọc được user ID dạng `f:<component>:<username>`.
- Dựng kiểu migrate dần: lần login đầu kiểm mật khẩu ở DB cũ rồi lưu hash vào Keycloak, lần sau Keycloak tự kiểm; nói được chuyện gì xảy ra khi login đó thất bại giữa chừng.
- Phân loại phần code extension nào đứng trên SPI bị Keycloak gắn nhãn internal, phần nào dựa vào class không phải SPI, và dự đoán chỗ vỡ khi nâng version.

---

## 2. Triệu chứng

Một SaaS B2B muốn đội sales thấy trong CRM ai vừa đăng nhập. Dev viết một event listener: mỗi event `LOGIN` thì POST một webhook sang CRM. Webhook của CRM trả lời trong khoảng 200 ms. Code review qua, deploy.

Sáng hôm sau, p50 của token endpoint từ khoảng 20 ms nhảy lên khoảng 230 ms. Không lỗi, không 5xx, CPU Keycloak không đổi.

Một người trong nhóm nói: "Event là thông báo, Keycloak bắn ra rồi đi tiếp, sao làm chậm login được. Chắc đo sai." Người khác đọc code listener `jboss-logging` có sẵn của Keycloak, thấy nó không xử lý event ngay trong `onEvent` mà gom lại rồi đăng ký với transaction bằng `enlistAfterCompletion`, và đề xuất làm theo: "chạy sau khi commit thì không chặn request nữa."

> **Đo trên lab (chạy riêng cho bài này).** Keycloak 26.8.1 `start-dev` cổng 4300, Java 24.0.2, Mac mini Apple M4. Listener giả lập webhook bằng `Thread.sleep(200)`. Direct grant user `alice`, 3 lần khởi động rồi 20 lần đo: chỉ `jboss-logging` thì p50 19,45 ms; thêm listener gọi thẳng trong `onEvent` thì p50 230,99 ms. Script `measure.sh`, số thô ở `~/projects/keycloak-lab/lab-kc23/lat-*.txt`.

---

## ⏸ Dừng lại — đoán trước #1

Đổi listener sang kiểu của `jboss-logging`: `onEvent` chỉ thêm event vào một `EventListenerTransaction`, còn việc gọi webhook 200 ms chạy trong `commitImpl()` của transaction đó, đăng ký bằng `session.getTransactionManager().enlistAfterCompletion(tx)`. p50 login lúc này là bao nhiêu?

```
(a) khoảng 20 ms: webhook chạy sau commit, response đã đi rồi
(b) khoảng 230 ms: không đổi gì
(c) khoảng 430 ms: webhook chạy hai lần, một lần trong onEvent và một lần lúc commit
(d) login trả lỗi, vì sau commit thì transaction đã đóng, không gọi gì được nữa
```

---

## 3. Lý thuyết

### 3.1 Event đi từ đâu tới listener

Bài 22 đã dựng khung SPI: Factory, Provider, file `META-INF/services`, `kc.sh build`. Event listener đi đúng khuôn đó, với interface `EventListenerProvider` có hai hàm:

- `onEvent(Event event)`: event của user, như `LOGIN`, `LOGIN_ERROR`, `CODE_TO_TOKEN`, `REFRESH_TOKEN`.
- `onEvent(AdminEvent event, boolean includeRepresentation)`: event của thao tác quản trị qua Admin API. Lab bài này không dùng admin event nên không đo nhánh này.

Event listener là loại SPI cho phép **nhiều implementation chạy cùng lúc**, khác với loại chỉ có một implementation active như hostname. Mỗi realm tự chọn danh sách listener trong `eventsListeners`; lab đặt `["jboss-logging"]` rồi thêm ID của mình vào.

Ai gọi `onEvent`, trên thread nào, lúc nào? Docs không mô tả, nên lab đọc bytecode của `org.keycloak.events.EventBuilder` (jar 26.8.1, `javap -c`). Code muốn phát event gọi `event.success()` hoặc `event.error(...)`, cả hai đi vào `sendNow()`:

1. Nếu realm có bật lưu event (`eventsEnabled`) và loại event nằm trong danh sách được lưu, gọi `EventStoreProvider.onEvent` để ghi xuống DB.
2. Duyệt danh sách listener của realm, gọi `listener.onEvent(event)` **lần lượt từng cái**, mỗi lần bọc trong một khối bắt `Throwable`. Listener ném exception thì Keycloak log `ERROR ... Failed to send type to <listener>` rồi đi tiếp sang listener sau.

Hai bước độc lập: `eventsEnabled` chỉ quyết định bước 1. Lab 2 đã thấy listener nhận event khi realm không bật cờ này, lab bài này lặp lại (bước 4). Muốn đẩy event ra ngoài thì không cần lưu event vào DB Keycloak.

Bytecode chưa nói chuyện thread, nên listener của lab in tên thread và `isActive()` của transaction manager. Mọi chế độ đều ra `thread=executor-thread-1 txActive=true`: listener chạy **trên chính thread xử lý HTTP request, khi transaction còn mở**. Response không thể đi ra trước khi `onEvent` return, nên webhook 200 ms cộng thẳng vào login: 230,99 − 19,45 = 211,54 ms.

Hệ quả bài 22 đã gặp: authenticator gọi `failure(...)` kèm response riêng thì không `LOGIN_ERROR` nào tới listener, trừ khi nó tự ghi event.

> **Nguồn.** *"Writing an Event Listener Provider starts by implementing the EventListenerProvider and EventListenerProviderFactory interfaces."* Loại provider nhiều implementation: *"...EventListener provider allows to have multiple implementations available and registered..."* ([server_development](https://www.keycloak.org/docs/latest/server_development/index.html)).

> **Đo trên lab (chạy riêng cho bài này).** Thread và trạng thái transaction lấy từ dòng `KC23 onEvent ... thread=executor-thread-1 txActive=true` trong `kc-run1.log`. Thứ tự gọi và khối bắt `Throwable` đọc bằng `javap -c -p org.keycloak.events.EventBuilder` trên `keycloak-server-spi-private-26.8.1.jar`. Listener ném `IllegalStateException`: login vẫn HTTP 200, log có `ERROR [org.keycloak.events.EventBuilder] ... Failed to send type to lab.kc23.SlowListener@2509cfc9`.

### 3.2 `enlistAfterCompletion`: đúng thời điểm, sai kỳ vọng

Đáp án hộp #1 là **(b)**. Lab đo p50 232,36 ms, chậm hơn bản gọi thẳng 1,37 ms, tức coi như bằng nhau.

Mỗi request Keycloak có một `KeycloakTransactionManager`, nơi đăng ký các `KeycloakTransaction` (JPA, thay đổi cache...). `enlistAfterCompletion(tx)` nghĩa là: transaction chính commit xong thì gọi `tx.commit()`, rollback thì gọi `tx.rollback()`. Class `EventListenerTransaction` có sẵn trong Keycloak làm đúng việc gom đó: `addEvent()` thêm vào một danh sách, `commitImpl()` duyệt danh sách và gọi hàm xử lý, `rollbackImpl()` xoá sạch danh sách. Listener `jboss-logging` và `email` có sẵn đều dùng cách này (đọc bytecode của hai class đó trong jar `keycloak-services`).

Cách này giải đúng một bài toán: **không gửi event cho việc rồi bị huỷ.** Login đã sinh `LOGIN` nhưng một bước sau lỗi và rollback: gửi ngay trong `onEvent` thì CRM nhận một lần login không có thật.

Bài toán nó không giải là latency. "Sau commit" vẫn là trước khi request kết thúc, và vẫn trên thread đó: dòng log `webhook done mode=aftercommit` mang `thread=executor-thread-1`, giống chế độ gọi thẳng. Response chỉ đi ra sau khi `commitImpl()` chạy xong, và bytecode cho biết vì sao: với endpoint đồng bộ, session đóng trong một response filter, trước khi body ghi ra socket; `session.close()` commit, và transaction đăng ký `enlistAfterCompletion` chạy ngay trong lần commit đó.

<svg viewBox="0 0 700 300" role="img" aria-labelledby="kc23-a-t kc23-a-d" style="width:100%;height:auto">
<title id="kc23-a-t">Một request login trong ba chế độ listener</title>
<desc id="kc23-a-d">Ba thanh thời gian: gọi webhook trong onEvent và sau commit đều nằm trên thread request nên response đi ra sau khoảng 230 ms; chế độ hàng đợi chuyển webhook sang thread worker nên response đi ra sau khoảng 20 ms.</desc>
<text x="20" y="28" font-size="12" fill="currentColor">thread executor-thread-1 (request)</text>
<text x="20" y="70" font-size="11" fill="currentColor">sync</text>
<rect x="110" y="55" width="40" height="24" rx="4" fill="#3b82f6" fill-opacity="0.35"/>
<text x="130" y="71" text-anchor="middle" font-size="10" fill="currentColor">login</text>
<rect x="150" y="55" width="400" height="24" rx="4" fill="#ef4444" fill-opacity="0.3"/>
<text x="350" y="71" text-anchor="middle" font-size="11" fill="currentColor">onEvent: webhook 200 ms (tx còn mở)</text>
<rect x="550" y="55" width="20" height="24" rx="4" fill="#84cc16" fill-opacity="0.4"/>
<text x="600" y="71" font-size="10" fill="currentColor">p50 230,99 ms</text>
<text x="20" y="130" font-size="11" fill="currentColor">aftercommit</text>
<rect x="110" y="115" width="40" height="24" rx="4" fill="#3b82f6" fill-opacity="0.35"/>
<text x="130" y="131" text-anchor="middle" font-size="10" fill="currentColor">login</text>
<rect x="150" y="115" width="20" height="24" rx="4" fill="#84cc16" fill-opacity="0.4"/>
<rect x="170" y="115" width="400" height="24" rx="4" fill="#ef4444" fill-opacity="0.3"/>
<text x="370" y="131" text-anchor="middle" font-size="11" fill="currentColor">commitImpl: webhook 200 ms (sau commit)</text>
<text x="600" y="131" font-size="10" fill="currentColor">p50 232,36 ms</text>
<text x="20" y="190" font-size="11" fill="currentColor">queue</text>
<rect x="110" y="175" width="40" height="24" rx="4" fill="#3b82f6" fill-opacity="0.35"/>
<text x="130" y="191" text-anchor="middle" font-size="10" fill="currentColor">login</text>
<rect x="150" y="175" width="20" height="24" rx="4" fill="#84cc16" fill-opacity="0.4"/>
<text x="200" y="191" font-size="10" fill="currentColor">p50 19,96 ms</text>
<text x="20" y="250" font-size="11" fill="currentColor">pool-3-thread-1</text>
<rect x="150" y="235" width="400" height="24" rx="4" fill="#f59e0b" fill-opacity="0.3"/>
<text x="350" y="251" text-anchor="middle" font-size="11" fill="currentColor">worker: webhook 200 ms, response đã đi</text>
<line x1="150" y1="200" x2="150" y2="235" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" stroke-dasharray="4 3"/>
<rect x="110" y="275" width="14" height="10" fill="#84cc16" fill-opacity="0.4"/>
<text x="130" y="284" font-size="10" fill="currentColor">commit</text>
<rect x="190" y="275" width="14" height="10" fill="#ef4444" fill-opacity="0.3"/>
<text x="210" y="284" font-size="10" fill="currentColor">việc chậm trên thread request</text>
</svg>

> **Đo trên lab (chạy riêng cho bài này).** Cùng điều kiện mục 2, 20 lần, HTTP 200: aftercommit p50 232,36 ms. `rollbackImpl()` xoá danh sách event: đọc bằng `javap -c -p org.keycloak.events.EventListenerTransaction`.

> **Đo trên lab (critic, 26.8.1).** `javap -c -p`: `CloseSessionFilter` (jar `keycloak-quarkus-server`) implement `ContainerResponseFilter`, `filter()` gọi `closeSession()` trừ khi entity là `Stream`/`StreamingOutput`; `DefaultKeycloakSession.close()` (jar `keycloak-services`) gọi `closeTransactionManager()`, hàm này gọi `commit()` hoặc `rollback()`.

### 3.3 Đưa việc chậm ra khỏi thread request

Muốn latency không phụ thuộc webhook thì thread request không được chờ webhook. Lab dùng một `ThreadPoolExecutor` một worker, hàng 10.000 chỗ. Chỗ hay sai: Provider tạo mới mỗi request, Factory chỉ có một instance cho cả server; đặt executor trong Provider là mỗi request đẻ một pool. Phải đặt trong Factory:

```java
public static class Queue extends SlowListenerFactory {
    // Factory la singleton (song suot server) -> noi dat queue + thread worker
    private final ThreadPoolExecutor pool = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS,
            new ArrayBlockingQueue<>(10_000), new ThreadPoolExecutor.DiscardOldestPolicy());

    @Override String mode() { return "queue"; }

    @Override
    public EventListenerProvider create(KeycloakSession session) {
        return new SlowListener(mode(), session, pool);
    }

    @Override
    public void close() { pool.shutdown(); }
}
```

`onEvent` chỉ chép các trường cần gửi thành chuỗi rồi `queue.execute(...)`, không đẩy `Event` hay `KeycloakSession` sang thread khác vì session gắn với request. Kết quả: p50 19,96 ms, hơn baseline 0,51 ms; `webhook done` chạy trên `pool-3-thread-1`.

Latency về lại bằng baseline, nhưng bạn phải trả bằng ba thứ khác.

**Mất event.** Hàng đợi nằm trong heap: process chết (OOM, `kill -9`, node bị thay) thì event chưa gửi biến mất, và `pool.shutdown()` không chờ hàng rỗng.

**Đầy hàng.** Một worker 200 ms/event xả 5 event/giây; cao điểm hơn thế thì hàng chỉ dài ra. Đầy thì `DiscardOldestPolicy` vứt event cũ nhất mà không ai biết; `AbortPolicy` thì `execute()` ném exception trên thread request, Keycloak bắt và log (mục 3.1), event mới mất.

**Mất tính "chỉ sau commit".** Đẩy vào hàng trong `onEvent` là đẩy khi transaction còn mở. Giữ cả hai bằng cách để `commitImpl()` của một `EventListenerTransaction` chỉ đẩy vào hàng, không gọi webhook.

> **Suy luận.** Docs không có công thức chọn kiểu listener; ba cái giá trên suy ra từ việc hàng đợi nằm trong RAM của một process. Lab chưa kill process giữa chừng để đếm event mất. Kiểm bằng: bắn 50 login ở chế độ queue, `kill -9` ngay sau đó, so số dòng `webhook done` với số dòng `onEvent`.

> **Nguồn.** Factory: *"Keycloak creates a single instance of provider factories which makes it possible to store state for multiple requests."* Provider: *"Provider instances are created by calling create on the factory for each request so these should be light-weight object."* ([server_development](https://www.keycloak.org/docs/latest/server_development/index.html)).

Event mà mất là không chấp nhận được (audit, billing) thì hàng đợi phải bền: broker ngoài, hoặc bảng outbox trong DB, tức thêm JPA entity vào Keycloak, thứ docs gọi là unsupported (mục 3.7).

---

## ⏸ Dừng lại — đoán trước #2

App cũ có bảng `users` với 200.000 dòng, mật khẩu băm bằng thuật toán riêng. Bạn viết một `UserStorageProvider` đọc bảng đó, bật cho realm. User `carol` gõ đúng mật khẩu. Keycloak gọi `getUserByUsername` của provider khi nào?

```
(a) Mọi lần login, trước khi nhìn vào DB của Keycloak
(b) Chỉ khi user cache và DB local của Keycloak đều không có carol
(c) Chỉ lần login đầu tiên, sau đó Keycloak tự nhớ carol mãi mãi
(d) Không bao giờ: Keycloak đọc cả bảng users lúc bật provider
```

---

### 3.4 UserStorageProvider: ba interface cho ba câu hỏi

Đáp án là **(b)**: user cache, rồi DB local, rồi mới lần lượt các provider. Bài 16 đã đi hết thứ tự này với LDAP provider, vốn cũng là một `UserStorageProvider` viết sẵn. Đáp án (c) chỉ đúng khi provider tự **import** user; provider ở realm `legacy` của lab không import, nên mọi lần login của carol đều tới provider.

Một provider tự khai báo năng lực bằng cách implement thêm interface. Lab dùng ba cái:

| Interface | Keycloak hỏi | Trong lab |
|---|---|---|
| `UserLookupProvider` | user `carol` có không, ID này là ai, email này của ai | Docs: bắt buộc để user ngoài login được |
| `CredentialInputValidator` | mật khẩu này đúng không | So với `LegacyDb`, log `isValid ok=true/false` |
| `UserQueryProvider` | tìm user theo chuỗi, đếm user (admin console) | Admin tìm `ca` ra carol, đếm được 2 user |

Phần lõi của provider (lab, đã compile; bỏ `getUserByEmail`, các hàm query và log):

```java
public UserModel getUserByUsername(RealmModel realm, String username) {
    LegacyDb.Row row = LegacyDb.find(username);
    if (row == null) return null;
    return migrate ? importLocal(realm, row) : adapter(realm, row);
}

public UserModel getUserById(RealmModel realm, String id) {
    return getUserByUsername(realm, new StorageId(id).getExternalId());   // id dang f:<componentId>:<username>
}

public boolean isValid(RealmModel realm, UserModel user, CredentialInput input) {
    if (!supportsCredentialType(input.getType())) return false;
    LegacyDb.Row row = LegacyDb.find(user.getUsername());
    boolean ok = row != null && row.password().equals(input.getChallengeResponse());
    // ... nhanh migrate o muc 3.6
    return ok;
}
```

User không import mang ID `f:<component id>:<external id>`; `sub` của carol là `f:49a4834b-7644-4812-bff8-ff185ee5286b:carol`, 44 ký tự. Nhờ tiền tố, Keycloak biết ngay component nào sở hữu user mà không hỏi từng provider. Mặt trái: `sub` đổi nếu xoá rồi tạo lại component, hoặc đổi username ở DB cũ.

`LegacyDb` của lab là một `Map` mật khẩu plain-text; DB thật thì `isValid` phải tính hash cũ mỗi lần login.

> **Nguồn.** *"It first looks to see if the user is in the user cache; if the user is found it uses that in-memory representation."* *"They are not enabled by default, but instead must be enabled and configured per realm under the User Federation tab in the administration console."* *"This interface is required if you want to be able to log in with users from this external store."* *"The user id contains enough information so that the runtime does not have to query every single UserStorageProvider in the system to find the user."* *"...it is important to limit the full storage ID to 64 characters..."* ([server_development](https://www.keycloak.org/docs/latest/server_development/index.html)). Thứ tự local trước: *"Keycloak searches the local Keycloak user database first to resolve users before any LDAP or custom User Storage Provider."* ([server_admin](https://www.keycloak.org/docs/latest/server_admin/#dealing-with-provider-failures)).

### 3.5 Bản sai: "override `getEmail()` là user có email"

Lần chạy đầu, adapter chỉ override `getUsername()`, `getEmail()`, `getFirstName()`. Mật khẩu đúng, `isValid` in `ok=true`, vậy mà direct grant trả:

```
{'error': 'invalid_grant', 'error_description': 'Account is not fully set up'}
```

Log event ghi `type="LOGIN_ERROR" ... error="resolve_required_actions"`. Admin API trả representation của carol **không có** `email`, `firstName`, `lastName`, dù code đã override getter.

Hai lớp nguyên nhân. Realm mới của 26.8.1 có user profile đòi `email`, `firstName`, `lastName` cho user thường, và `VERIFY_PROFILE` đang bật: thiếu thuộc tính thì luồng login đòi cập nhật profile, direct grant không có màn hình cho việc đó nên trả lỗi trên. Và user profile đọc thuộc tính qua `getAttributes()`/`getFirstAttribute()`, không gọi `getEmail()`. Lab sửa bằng cách trả cả bốn thuộc tính qua `getAttributes()`; sau đó token của carol có `email`, `given_name`.

Chỗ vỡ thứ hai lộ ra lúc compile. Ví dụ trong docs 26.8.1 dựng adapter bằng `new AbstractUserAdapter(session, realm, model) { getUsername() ... }`. Adapter của lab viết theo đúng khuôn đó (thêm vài getter) thì `javac` báo:

```
<anonymous lab.kc23.LegacyStorageProvider$1> is not abstract and does not override abstract method credentialManager() in org.keycloak.models.UserModel
```

Class `LegacyUserCredentialManager`, tên lab thử đầu tiên, không có trong jar nào của bản 26.8.1. Lab phải dùng `org.keycloak.credential.UserCredentialManager`, nằm trong artifact `keycloak-model-storage`, phải thêm vào `pom.xml` như một dependency `provided`.

> **Đo trên lab (chạy riêng cho bài này).** Lần chạy đầu (`RESULTS-storage-run1-no-lastname.txt`, `kc-run1.log`): HTTP 400, `resolve_required_actions`. `kcadm.sh get users/profile -r legacy`: `email`, `firstName`, `lastName` có `required` với role `user`; `VERIFY_PROFILE` `enabled: true`. Sau khi override `getAttributes()`: token của carol có `sub` `f:49a4834b-...:carol`, `email` `carol@legacy.example`. Lỗi compile lấy từ `mvn -q -o package`; tìm class bằng `unzip -l` trên mọi jar `org.keycloak.*` trong `lib/lib/main`.

### 3.6 Import hay không import, và migrate dần

Bài 16 đã cân import và không import với LDAP; với provider tự viết, bạn chọn trong code. Chế độ thứ ba là **import rồi cắt dây**, để rời DB cũ mà không bắt ai reset mật khẩu. Hash cũ không chuyển sang được vì khác thuật toán, nhưng có một khoảnh khắc Keycloak cầm mật khẩu gốc: lúc user gõ nó. Nhánh `migrate` của `isValid` dùng đúng khoảnh khắc đó:

```java
if (ok && migrate) {
    // lan dau dang nhap dung: ghi hash vao Keycloak roi cat lien ket voi DB cu
    user.credentialManager().updateCredential(UserCredentialModel.password(input.getChallengeResponse(), false));
    user.setFederationLink(null);
}
```

Còn `getUserByUsername` ở chế độ này tạo user trong DB local (`session.getProvider(UserProvider.class).addUser(...)`), gắn `setFederationLink(model.getId())`, rồi chép email, tên. Federation link ghi user thuộc component nào; còn link thì Keycloak vẫn hỏi `isValid` của provider, cắt link thì thành user local thường.

<svg viewBox="0 0 700 290" role="img" aria-labelledby="kc23-b-t kc23-b-d" style="width:100%;height:auto">
<title id="kc23-b-t">Migrate dần: lần login đầu và lần sau</title>
<desc id="kc23-b-d">Lần đầu Keycloak không thấy dave trong DB local, gọi provider để import, kiểm mật khẩu ở DB cũ, ghi hash argon2 rồi cắt federation link; lần sau Keycloak thấy dave trong DB local và tự kiểm argon2, không gọi provider.</desc>
<defs><marker id="kc23-b-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="175" y="22" text-anchor="middle" font-size="12" fill="currentColor">Lần 1 (dave chưa có trong Keycloak)</text>
<text x="530" y="22" text-anchor="middle" font-size="12" fill="currentColor">Lần 2 trở đi</text>
<rect x="20" y="40" width="310" height="30" rx="6" fill="#64748b" fill-opacity="0.2"/>
<text x="175" y="59" text-anchor="middle" font-size="11" fill="currentColor">1. cache, DB local: không có dave</text>
<rect x="20" y="85" width="310" height="30" rx="6" fill="#8b5cf6" fill-opacity="0.25"/>
<text x="175" y="104" text-anchor="middle" font-size="11" fill="currentColor">2. provider: addUser + federationLink</text>
<rect x="20" y="130" width="310" height="30" rx="6" fill="#8b5cf6" fill-opacity="0.25"/>
<text x="175" y="149" text-anchor="middle" font-size="11" fill="currentColor">3. provider isValid: so với DB cũ, ok</text>
<rect x="20" y="175" width="310" height="30" rx="6" fill="#f59e0b" fill-opacity="0.3"/>
<text x="175" y="194" text-anchor="middle" font-size="11" fill="currentColor">4. ghi hash argon2, federationLink = null</text>
<rect x="20" y="220" width="310" height="30" rx="6" fill="#84cc16" fill-opacity="0.3"/>
<text x="175" y="239" text-anchor="middle" font-size="11" fill="currentColor">5. token, commit cả 2 + 4 cùng lúc</text>
<line x1="175" y1="70" x2="175" y2="84" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc23-b-arrow)"/>
<line x1="175" y1="115" x2="175" y2="129" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc23-b-arrow)"/>
<line x1="175" y1="160" x2="175" y2="174" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc23-b-arrow)"/>
<line x1="175" y1="205" x2="175" y2="219" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc23-b-arrow)"/>
<rect x="375" y="40" width="310" height="30" rx="6" fill="#64748b" fill-opacity="0.2"/>
<text x="530" y="59" text-anchor="middle" font-size="11" fill="currentColor">1. DB local: có dave, không link</text>
<rect x="375" y="85" width="310" height="30" rx="6" fill="#3b82f6" fill-opacity="0.25"/>
<text x="530" y="104" text-anchor="middle" font-size="11" fill="currentColor">2. Keycloak tự kiểm argon2</text>
<rect x="375" y="130" width="310" height="30" rx="6" fill="#84cc16" fill-opacity="0.3"/>
<text x="530" y="149" text-anchor="middle" font-size="11" fill="currentColor">3. token; provider không được gọi</text>
<line x1="530" y1="70" x2="530" y2="84" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc23-b-arrow)"/>
<line x1="530" y1="115" x2="530" y2="129" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc23-b-arrow)"/>
<text x="530" y="200" text-anchor="middle" font-size="11" fill="currentColor">Login lần 1 lỗi ở bước sau bước 3:</text>
<text x="530" y="218" text-anchor="middle" font-size="11" fill="currentColor">rollback, bước 2 và 4 biến mất</text>
</svg>

Lab chạy đúng chuỗi đó với user `dave`: lần 1 log có `lookup`, `imported`, `isValid ok=true`, `migrated`; sau đó admin API trả dave **không còn** `federationLink`, và có một credential `password` thuật toán `argon2`, `memory 7168`, `hashIterations 5`. Lần 2 đúng mật khẩu: HTTP 200, **không một dòng log nào** của provider. Lần 3 sai mật khẩu: `LOGIN_ERROR` với `userId` local của dave, provider cũng không được gọi.

Bản sai ở đây là "import xong là xong". Lần chạy đầu, dave lỗi `resolve_required_actions` (mục 3.5) **sau** khi đã import và migrate trong cùng request. Thử lại, log ghi `imported username=dave` lần nữa với ID khác (`5ff8b4b1-...` rồi `bc035e4b-...`): cả ba việc nằm trong transaction của request, login lỗi thì rollback hết. Không có user nửa vời, nhưng user kẹt ở bước sau mật khẩu (required action, OTP) bị import và hash lại mỗi lần thử.

Bẫy nhỏ ở `UserQueryProvider`: bản đầu của hàm tìm kiếm bỏ qua tham số `username`, nên một lệnh admin `GET users?username=dave` trả cả carol, và ở chế độ migrate **một lượt tìm trong admin đã import carol** dù carol chưa login. Bài 16 gặp đúng hành vi này với LDAP.

> **Đo trên lab (chạy riêng cho bài này).** `migrate.sh`, `RESULTS-migrate.txt`: lần 1 HTTP 200 kèm bốn dòng log provider; credential `{"hashIterations":5,"algorithm":"argon2",...,"memory":["7168"],...}`; lần 2 HTTP 200 không dòng log provider nào; lần 3 HTTP 400. Rollback: hai ID khác nhau của dave trong `kc-run1.log`. Import do tìm kiếm admin: `kc-run3.log`.

> **Suy luận.** Bộ nguồn của course không có công thức "migrate dần" nào. Docs chỉ cho các mảnh: thứ tự tra user local trước, import lần đầu tốn nhiều lần ghi DB, user ID federated. Cách ghép mảnh như trên là của lab và đã chạy đúng trên 26.8.1, nhưng nó dựa vào hai hành vi bộ nguồn của course không ghi: `updateCredential` trên user còn link lưu vào kho local khi provider không implement `CredentialInputUpdater`, và cắt link ngay trong `isValid`. Kiểm lại hai điểm đó mỗi lần nâng version.

> **Nguồn.** *"Looking up a user for the first time will require multiple updates to Keycloak database."* ([server_development](https://www.keycloak.org/docs/latest/server_development/index.html)).

### 3.7 API nào public, API nào vỡ khi nâng version

Code extension nào sống qua một lần nâng cấp? Có ba loại bằng chứng. Thứ nhất, Keycloak tự gắn nhãn: lúc build nó in `KC-SERVICES0047` cho mỗi provider implement SPI internal. Lab có năm dòng cho listener, một cho authenticator bài 22, không dòng nào cho hai provider user storage. Thứ hai, artifact chứa interface: `EventListenerProvider`, `Event`, `EventListenerTransaction` nằm trong `keycloak-server-spi-private`; `UserLookupProvider`, `CredentialInputValidator`, `UserProvider` trong `keycloak-server-spi`; `UserStorageProvider`, `AbstractUserAdapter`, `UserCredentialManager` trong `keycloak-model-storage`, một module cài đặt chứ không phải module SPI. Thứ ba, lịch sử: mục 3.5 vừa thấy một thay đổi phá compile ngay trên ví dụ docs cùng version.

| Phần code của bài | Nhãn từ Keycloak | Dựa vào | Rủi ro khi nâng version |
|---|---|---|---|
| Event listener | internal (KC-SERVICES0047) | `server-spi-private` | Docs nói có thể đổi không báo trước |
| `EventListenerTransaction` | không phải SPI, là class tiện ích | `server-spi-private` | Có thể đổi tên/xoá như mọi class nội bộ |
| Lookup/validate/query | không cảnh báo | `server-spi` | Ít nhất trong nhóm |
| Adapter + credential manager | không cảnh báo | `model-storage` | Đã vỡ một lần (mục 3.5) |
| JPA entity riêng (outbox) | docs: unsupported | | Docs không hứa gì |

Không có nhãn internal không có nghĩa là bất biến, chỉ là Keycloak chưa tuyên bố có thể đổi. Thêm nữa, jar provider không có classloader riêng: đóng gói kèm thư viện trùng với thư viện của Keycloak là xung đột ngay lúc chạy.

> **Nguồn.** Event Listener SPI và Authentication SPI: *"This is an internal SPI. While it was stable in the previous releases, any new release of Keycloak can change it without prior notice."* JPA entity riêng: *"This is an unsupported API, which means you can use it but there is no guarantee that it will not be removed or changed without warning."* Classloader: *"Provider JARs are not loaded in isolated classloaders, so do not include resources or classes in your provider JARs that conflict with built-in resources or classes."* ([server_development](https://www.keycloak.org/docs/latest/server_development/index.html)).

---

## 4. Lab

Code ở `~/projects/keycloak-lab/lab-kc23/`: Maven project `spi-kc23/` (chép từ `lab2/spi-demo`, thêm package `lab.kc23`), script và log. Output dưới đây rút gọn: JSON nhiều dòng gộp thành một dòng, `...` là phần bỏ.

**Bước 1. Build và đăng ký.** `pom.xml` giữ ba dependency `provided` của lab 2 và thêm `keycloak-model-storage` (mục 3.5). Hai file service:

```
META-INF/services/org.keycloak.events.EventListenerProviderFactory
    lab.kc.spi.JsonLoginEventListenerFactory
    lab.kc23.SlowListenerFactory$Sync
    lab.kc23.SlowListenerFactory$AfterCommit
    lab.kc23.SlowListenerFactory$Queue
    lab.kc23.SlowListenerFactory$Throw
META-INF/services/org.keycloak.storage.UserStorageProviderFactory
    lab.kc23.LegacyStorageProviderFactory$NoImport
    lab.kc23.LegacyStorageProviderFactory$Migrate
```

Mỗi chế độ listener là một Factory con có ID riêng, nên đổi chế độ chỉ cần sửa `eventsListeners` của realm. `mvn -q -o package`, chép jar vào `providers/`, `kc.sh start-dev --http-port=4300 --http-management-port=5300`.

**Bước 2. Ba realm.** `setup.sh` tạo realm `lab` (user `alice`, không bật `eventsEnabled`), `legacy`, `migrate`, mỗi realm một client public `lab-cli` có direct grant. Provider gắn vào realm bằng một component:

```bash
kcadm.sh create components -r legacy -s name=old-app-db -s providerId=lab-legacy-db \
  -s providerType=org.keycloak.storage.UserStorageProvider -s parentId=$LID -s 'config.priority=["0"]'
```

`parentId` là ID của realm. ID component trả về (`49a4834b-...`) chính là phần giữa của mọi user ID `f:...` sau này.

**Bước 3. Đo listener.** `measure.sh` đổi `eventsListeners` lần lượt, mỗi lần 3 login khởi động rồi 20 login đo bằng `curl -w '%{http_code} %{time_total}'`:

```
jboss-logging          n=20 http=200 p50=19.45 ms mean=19.62 min=17.95 max=22.46
lab-slow-sync          n=20 http=200 p50=230.99 ms mean=231.06 min=223.42 max=240.64
lab-slow-aftercommit   n=20 http=200 p50=232.36 ms mean=232.59 min=224.67 max=241.08
lab-slow-queue         n=20 http=200 p50=19.96 ms mean=20.40 min=18.40 max=24.61
```

Log (`kc-run1.log`): dòng `webhook done` của sync và aftercommit mang `thread=executor-thread-1`, của queue mang `thread=pool-3-thread-1`.

**Bước 4. Listener ném exception, và realm không lưu event.** `throw.sh` gắn `lab-slow-throw` (ném `IllegalStateException("webhook endpoint down")`) cùng `lab-json-login` của lab 2:

```
HTTP 200
LAB_EVENT {"ts":"2026-10-15T07:47:56.676Z","type":"LOGIN","realm":"lab","clientId":"lab-cli",...}
KC23 onEvent mode=throw thread=executor-thread-1 txActive=true
ERROR [org.keycloak.events.EventBuilder] (executor-thread-1) Failed to send type to lab.kc23.SlowListener@2509cfc9: java.lang.IllegalStateException: webhook endpoint down
```

Rồi `kcadm.sh get realms/lab --fields eventsEnabled` trả `false`, `kcadm.sh get events -r lab` trả `[ ]`.

**Bước 5. User không import.** `storage.sh`, realm `legacy`, decode access token chỉ giữ bốn claim:

```
== legacy: carol dung mat khau
{'sub': 'f:49a4834b-7644-4812-bff8-ff185ee5286b:carol', 'preferred_username': 'carol', 'given_name': 'Carol', 'email': 'carol@legacy.example'}
== legacy: carol sai mat khau
{'error': 'invalid_grant', 'error_description': 'Invalid user credentials'}
== legacy: admin search 'ca'
[ { "id" : "f:49a4834b-7644-4812-bff8-ff185ee5286b:carol", "username" : "carol", ... } ]
```

**Bước 6. Migrate.** `migrate.sh`, realm `migrate` mới tạo, user `dave` chưa từng tồn tại trong Keycloak:

```
== lan 1, mat khau dung
HTTP 200
KC23 legacy lookup username=dave found=true migrate=true
KC23 legacy imported username=dave id=157f2cc5-baad-42d7-bbbd-64fc5afbb93e
KC23 legacy isValid username=dave ok=true
KC23 legacy migrated username=dave
{ "id" : "157f2cc5-baad-42d7-bbbd-64fc5afbb93e", "username" : "dave" }
== lan 2, mat khau dung
HTTP 200
== lan 3, mat khau sai
HTTP 400
```

Đọc output: ID của dave là UUID thường, không có `federationLink`. Lần 2 và 3 không có dòng `KC23 legacy` nào; lần 3 sinh `LOGIN_ERROR` với `userId` local của dave. Muốn thấy rollback ở mục 3.6 thì xoá `lastName` khỏi `LegacyDb`, login hai lần, đếm dòng `imported`.

Dừng: `kill` đúng PID nghe cổng 4300 (`lsof -ti tcp:4300 -sTCP:LISTEN`), đừng `pkill` theo tên jar.

---

## 5. Tính tay

**Bài 1. Listener đồng bộ và trần thread.** Docs ghi executor pool tối đa từ 50 thread trở lên tuỳ số core, và mặc định request vượt khả năng xử lý được xếp hàng vô hạn. Cụm có 4 vCPU cho password login. Theo hướng dẫn sizing, 1 vCPU gánh 15 password login/giây, vậy cụm gánh 4 × 15 = 60 login/giây về CPU.

Listener webhook 200 ms đồng bộ, p50 230,99 ms: một thread phục vụ tối đa 1 / 0,231 ≈ 4,33 login/giây, 50 thread khoảng 216 login/giây, cao hơn 60. Lúc CRM khoẻ, CPU vẫn là nút thắt; user chỉ chậm thêm 211 ms.

CRM treo, webhook client timeout 5 giây: 50 / 5 = 10 login/giây. Thread pool thành nút thắt, chặt hơn CPU 6 lần, request dư xếp hàng không giới hạn. Một hệ thống không liên quan tới xác thực đã hạ khả năng login xuống 1/6.

> **Suy luận.** Docs không nói thread nào chạy token endpoint. Phép tính giả định mỗi login giữ một thread của executor pool suốt thời gian xử lý, khớp với log `executor-thread-1` ở lab. Con số 10 login/giây chưa đo. Đo bằng: listener sleep 5000 ms, bắn k6 30 login/giây trong 30 giây, xem `worker_pool_queue_size` ở `/metrics`.

> **Nguồn.** *"It has a default maximum size of 50 or more threads depending on the available CPU cores."* *"By default, Keycloak will queue all incoming requests infinitely, even if the request processing stalls."* ([concepts-threads](https://www.keycloak.org/high-availability/single-cluster/concepts-threads)). *"For each 15 password-based user logins per second, allocate 1 vCPU to the cluster (tested with up to 300 per second)."* ([concepts-memory-and-cpu-sizing](https://www.keycloak.org/high-availability/single-cluster/concepts-memory-and-cpu-sizing)).

**Bài 2. Hàng đợi của chế độ queue.** Một worker, webhook 200 ms, hàng 10.000 chỗ. Worker xả 1 / 0,2 = 5 event/giây. Giờ cao điểm 8:30 có 20 login/giây trong 15 phút.

- Hàng dài thêm 20 − 5 = 15 event mỗi giây.
- Đầy sau 10.000 / 15 ≈ 667 giây, tức khoảng 11 phút 7 giây. Gần 4 phút cuối của đợt cao điểm, `DiscardOldestPolicy` bắt đầu vứt event.
- Hết cao điểm lúc 8:45, hàng còn đầy 10.000 event, xả hết cần 10.000 / 5 = 2.000 giây (hơn 33 phút) nếu không có login mới. Event `LOGIN` cuối của đợt cao điểm tới CRM khoảng 9:18.
- Node bị thay giữa chừng: tới 10.000 event mất.

Nâng lên 4 worker thì xả 20 event/giây, bằng đúng tốc độ vào: hàng đứng yên chứ không rút. Muốn rút phải nhiều hơn 4 worker, hoặc webhook nhận theo lô.

**Bài 3. Độ dài storage ID.** Giới hạn 64 ký tự nếu dùng WebAuthn. `f:` + ID component 36 ký tự + `:` = 39, còn 64 − 39 = 25 ký tự cho external ID. App cũ dùng email làm username: `nguyen.van.an@congty-abc.example` dài 32, vượt 7. External ID không bắt buộc là username; dùng khoá chính số của bảng cũ (`f:<component>:184467`) là 45 ký tự.

---

## 6. Chuyển giao

1. Đội bảo mật muốn mọi `LOGIN_ERROR` vào SIEM, không mất cái nào, kể cả khi node Keycloak chết giữa chừng. Kiểu listener nào của bài loại được ngay, và bạn đưa thêm gì vào thiết kế để event sống sót qua `kill -9`?
2. Listener gom event bằng `EventListenerTransaction` để chỉ gửi sau commit. Có loại event nào sinh ra trong một request mà transaction luôn rollback (vì chính request đó thất bại) không? Nếu có, listener kiểu này sẽ không bao giờ thấy chúng. Kiểm bằng cách nào trên lab?
3. Provider không import, DB cũ của app là MySQL ở region khác, mỗi truy vấn 40 ms. Một lần login, một lần refresh token và một lần admin tìm "nguyen" ra 30 user: mỗi việc gọi bao nhiêu truy vấn sang MySQL? Bạn đo kiểm bằng log nào của lab?
4. Đang migrate dần thì một user đổi mật khẩu trong app cũ (app cũ chưa tắt), sau khi đã login Keycloak một lần. Từ giờ mật khẩu nào đúng ở đâu? Thiết kế nào chặn được tình trạng hai mật khẩu cùng sống?
5. Sau ba tháng migrate dần, còn 18% user chưa từng login lại. Bạn muốn tắt DB cũ. Có những lựa chọn nào cho 18% đó, mỗi lựa chọn bắt user làm gì?
6. Bạn nâng Keycloak lên một minor mới và `EventListenerProvider` có thêm một method abstract. Jar cũ của bạn nằm trong `providers/`. Chuyện gì xảy ra ở `kc.sh build`, ở lúc start, ở event đầu tiên, và bạn phát hiện nó trong pipeline ở bước nào sớm nhất mà không cần chạy server?
7. Provider migrate của lab tạo user local ngay trong `getUserByUsername`. Hai request login của cùng `dave` tới hai node khác nhau trong cùng 50 ms, cả hai thấy DB local chưa có dave. Đi lại từng bước của mục 3.6 trên cả hai node: bảng `user_entity` có ràng buộc gì làm một trong hai request lỗi, request đó lỗi ở bước nào, user nhận HTTP gì, và lần thử lại của user đó đi theo nhánh nào?

---

## 7. Tóm tắt

- Listener chạy trên thread của HTTP request, khi transaction còn mở (`executor-thread-1`, `txActive=true`). Response chờ `onEvent` và cả commit. Webhook 200 ms: p50 login 19,45 → 230,99 ms.
- `enlistAfterCompletion` chỉ đổi thời điểm sang sau commit, cùng thread: p50 232,36 ms. Thứ nó mua là không gửi event cho transaction đã rollback.
- Hàng đợi trong Factory đưa p50 về 19,96 ms, đổi lại event nằm trong RAM: mất khi process chết, bị vứt khi đầy, một worker 200 ms xả 5 event/giây.
- Listener ném exception: Keycloak log `Failed to send type to ...`, login vẫn 200. `eventsEnabled=false` chỉ tắt việc lưu event vào DB; listener vẫn nhận mọi event.
- Keycloak gọi User Storage provider sau user cache và DB local. Không import: mọi login đi qua provider, `sub` = `f:<component id>:<external id>`, nên giữ dưới 64 ký tự nếu dùng WebAuthn.
- User profile đọc thuộc tính qua `getAttributes()`. Adapter chỉ override `getEmail()` thì realm 26.8.1 mặc định trả `Account is not fully set up` do thiếu `lastName`.
- Migrate dần: import, kiểm ở DB cũ, ghi hash argon2 (m=7168, t=5), cắt `federationLink`, tất cả trong một transaction. Lần sau provider không được gọi. Login lỗi sau bước mật khẩu thì rollback cả import.
- Event Listener SPI bị gắn nhãn internal (`KC-SERVICES0047`), interface nằm ở `keycloak-server-spi-private`. Ví dụ `AbstractUserAdapter` trong docs 26.8.1 không compile vì thiếu `credentialManager()`.

→ **Bài 24 — Theme, Admin API, config-as-code**: mọi thứ bài này cấu hình bằng `kcadm.sh` (listener của realm, component user storage) là một lệnh gọi Admin REST; bài sau biến chúng thành file khai báo trong Git thay vì thao tác tay trên console.
