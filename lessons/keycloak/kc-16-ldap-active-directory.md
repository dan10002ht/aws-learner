# Bài 16 — LDAP / Active Directory

## 1. Mục tiêu

Sau bài này bạn có thể:

- Phân biệt **user federation** với **identity brokering** (bài 15) bằng một câu hỏi: ai hiện form đăng nhập và ai so mật khẩu.
- Cấu hình một LDAP provider bằng `kcadm.sh`, rồi đọc access log của LDAP để biết một lần login sinh ra mấy bind, mấy search.
- Chứng minh bằng output thật rằng DB Keycloak không giữ hash mật khẩu user LDAP, và chỉ ra chỗ mật khẩu đi dạng plain-text.
- Tính user trong Keycloak lệch với LDAP bao lâu với một cấu hình sync cho trước.
- Chọn edit mode và bật/tắt Import Users, nói được mỗi lựa chọn mất gì.
- Tính tải Keycloak đẩy sang domain controller lúc cao điểm, và thời gian chờ khi DC đầu danh sách chết.

---

## 2. Triệu chứng

Một SaaS B2B bật LDAP provider trong realm `corp`, trỏ vào Active Directory của khách doanh nghiệp để nhân viên khỏi có mật khẩu thứ hai. Login chạy ngay từ ngày đầu.

Hai tuần sau, nhân sự của khách đổi email một nhân viên trong AD từ `jdoe@example.com` sang `john.doe@example.com`. Hôm sau hệ thống hoá đơn vẫn gửi về địa chỉ cũ. Token của nhân viên đó, lấy sáng nay:

```json
{"preferred_username": "jdoe", "email": "jdoe@example.com"}
```

Bạn mở access log của LDAP, và thấy trong lần login đó Keycloak **có** hỏi LDAP về đúng user này:

```
SEARCH REQUEST base="ou=people,dc=example,dc=com" scope=1 filter="(entryUUID=00aea693-3cef-4905-98ef-9e29089676e6)"
SEARCH RESULT resultCode=0 etime=0.231 entriesReturned=1
BIND REQUEST dn="uid=jdoe,ou=people,dc=example,dc=com" authType="SIMPLE"
```

LDAP đã trả về entry, entry đó đang mang email mới. Token vẫn mang email cũ. Đồng nghiệp nói: "Keycloak có tab Synchronization mà, LDAP được sync, chắc là cache, restart là xong."

> **Đo trên lab (chạy riêng cho bài này).** Keycloak 26.8.1 `start-dev` cổng 8980, Java 24.0.2, Mac mini Apple M4. LDAP là UnboundID LDAP SDK 7.0.3 `InMemoryDirectoryServer` cổng 10389, base `dc=example,dc=com`. Đổi `mail` của `uid=jdoe` bằng `ldapmodify`, rồi login lại bằng direct grant: HTTP 200, claim `email` vẫn là `jdoe@example.com`; access log ghi một search theo `entryUUID` trả `entriesReturned=1`. Script và log ở `~/projects/keycloak-lab/lab-kc16/` (`RESULTS.txt` bước 5).

---

## ⏸ Dừng lại — đoán trước #1

Keycloak vừa đọc entry LDAP chứa email mới. Vì sao token vẫn ra email cũ?

```
(a) Access token cũ được cache và trả lại, Keycloak không phát token mới
(b) Search theo entryUUID chỉ để xác nhận user còn tồn tại; thuộc tính trong token đọc từ bản
    user đã import vào DB Keycloak, và bản đó chỉ đổi khi có sync
(c) AD có nhiều replica, search đi vào replica chưa nhận thay đổi
(d) Mapper email chưa được tạo nên Keycloak không đọc thuộc tính mail
```

---

## 3. Lý thuyết

### 3.1 Federation: Keycloak hiện form, LDAP so mật khẩu

Đáp án là **(b)**, nhưng để thấy vì sao phải đi từ chỗ dữ liệu của user nằm ở đâu.

Bài 15 đã đặt ranh giới: brokering thì IdP ngoài hiện form; **user federation** (docs: User Storage Federation) thì form là của Keycloak, Keycloak cầm mật khẩu user gõ vào đi hỏi một kho user ngoài, thường là LDAP hoặc Active Directory. Không redirect nào, app vẫn chỉ thấy token Keycloak. Nguyên nhân gốc: kho ngoài ở đây chỉ là một **thư mục** biết trả lời "DN này có đúng mật khẩu này không", không có giao diện đăng nhập và không nói OIDC/SAML, nên Keycloak phải tự làm phần giao diện và luồng.

> **Nguồn.** *"Keycloak never imports passwords. Password validation always occurs on the LDAP server."* ([storage-mode](https://www.keycloak.org/docs/latest/server_admin/#storage-mode)).

### 3.2 LDAP vừa đủ cho người dev

LDAP là cơ sở dữ liệu dạng cây, tối ưu cho đọc, lưu người, nhóm, máy. Cấu hình Keycloak cần bốn khái niệm:

- **DN** (distinguished name): khoá chính của entry, viết từ lá lên gốc. `uid=jdoe,ou=people,dc=example,dc=com` là user `jdoe` trong nhánh `people`. Phần đầu (`uid=jdoe`) là **RDN**.
- **Base DN**: nhánh Keycloak tìm user trong đó, lab là `ou=people,dc=example,dc=com`; group ở nhánh `ou=groups`.
- **objectClass**: "kiểu" của entry, quyết định entry có thuộc tính nào. User thường là `inetOrgPerson`, nhóm là `groupOfNames` với nhiều dòng `member: <DN user>`. AD dùng tên khác; chọn vendor trong form provider để Keycloak điền sẵn.
- **Bind**: đăng nhập vào LDAP. Simple bind gửi DN và mật khẩu; server trả `resultCode=0` nếu đúng, `49` (invalid credentials) nếu sai. Mỗi kết nối bind dưới một danh tính, danh tính đó quyết định kết nối được đọc/ghi gì.

Một entry user trong LDIF của lab:

```
dn: uid=jdoe,ou=people,dc=example,dc=com
objectClass: inetOrgPerson
uid: jdoe
cn: John Doe
sn: Doe
givenName: John
mail: jdoe@example.com
userPassword: Ldap-Pass1
```

Server tự sinh thêm thuộc tính vận hành: `entryUUID` (không đổi khi entry đổi tên) và `createTimestamp`/`modifyTimestamp`. Keycloak dựa vào cả hai.

### 3.3 Một lần login đi qua những đâu

Keycloak dùng hai danh tính với LDAP: **bind DN** của provider (lab: `cn=admin,dc=example,dc=com`) là tài khoản dịch vụ để tìm user; danh tính của user chỉ dùng để bind thử bằng mật khẩu vừa gõ.

<svg viewBox="0 0 720 370" role="img" aria-labelledby="kc16-a-t kc16-a-d" style="width:100%;height:auto">
<title id="kc16-a-t">Login user LDAP đã import, theo access log</title>
<desc id="kc16-a-d">Sequence năm bước: client gửi mật khẩu tới Keycloak, Keycloak tìm user trong DB của mình, bind bằng tài khoản dịch vụ và search theo entryUUID, rồi bind bằng DN và mật khẩu của user, cuối cùng phát token với thuộc tính lấy từ bản import trong DB.</desc>
<defs><marker id="kc16-a-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="20" y="15" width="120" height="34" rx="8" fill="#64748b" fill-opacity="0.25"/>
<text x="80" y="37" text-anchor="middle" font-size="11" fill="currentColor">Client / app</text>
<rect x="220" y="15" width="120" height="34" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="280" y="37" text-anchor="middle" font-size="11" fill="currentColor">Keycloak</text>
<rect x="390" y="15" width="120" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.25"/>
<text x="450" y="37" text-anchor="middle" font-size="11" fill="currentColor">DB Keycloak</text>
<rect x="570" y="15" width="130" height="34" rx="8" fill="#84cc16" fill-opacity="0.25"/>
<text x="635" y="37" text-anchor="middle" font-size="11" fill="currentColor">LDAP / AD</text>
<line x1="80" y1="49" x2="80" y2="335" stroke="currentColor" stroke-opacity="0.3" stroke-width="1"/>
<line x1="280" y1="49" x2="280" y2="335" stroke="currentColor" stroke-opacity="0.3" stroke-width="1"/>
<line x1="450" y1="49" x2="450" y2="335" stroke="currentColor" stroke-opacity="0.3" stroke-width="1"/>
<line x1="635" y1="49" x2="635" y2="335" stroke="currentColor" stroke-opacity="0.3" stroke-width="1"/>
<line x1="80" y1="80" x2="278" y2="80" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc16-a-arrow)"/>
<text x="180" y="73" text-anchor="middle" font-size="11" fill="currentColor">1. username + password</text>
<line x1="280" y1="115" x2="448" y2="115" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc16-a-arrow)"/>
<text x="365" y="108" text-anchor="middle" font-size="11" fill="currentColor">2. tìm user cục bộ</text>
<line x1="450" y1="140" x2="282" y2="140" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#kc16-a-arrow)"/>
<text x="365" y="155" text-anchor="middle" font-size="10" fill="currentColor">bản import, federationLink</text>
<line x1="280" y1="185" x2="633" y2="185" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc16-a-arrow)"/>
<text x="457" y="178" text-anchor="middle" font-size="11" fill="currentColor">3. bind cn=admin, search (entryUUID=...)</text>
<line x1="635" y1="208" x2="282" y2="208" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#kc16-a-arrow)"/>
<text x="540" y="222" text-anchor="middle" font-size="10" fill="currentColor">entriesReturned=1: còn tồn tại</text>
<line x1="280" y1="252" x2="633" y2="252" stroke="#ef4444" stroke-opacity="0.8" stroke-width="1.5" marker-end="url(#kc16-a-arrow)"/>
<text x="457" y="245" text-anchor="middle" font-size="11" fill="currentColor">4. bind uid=jdoe + mật khẩu user gõ</text>
<line x1="635" y1="275" x2="282" y2="275" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#kc16-a-arrow)"/>
<text x="540" y="289" text-anchor="middle" font-size="10" fill="currentColor">resultCode 0 hoặc 49</text>
<line x1="278" y1="315" x2="82" y2="315" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc16-a-arrow)"/>
<text x="180" y="308" text-anchor="middle" font-size="11" fill="currentColor">5. token (claim từ DB)</text>
<text x="360" y="358" text-anchor="middle" font-size="11" fill="currentColor">Mật khẩu chỉ xuất hiện ở bước 1 và 4. DB Keycloak không có bản sao hay hash của nó.</text>
</svg>

Bước 2 đi trước LDAP vì Keycloak luôn tra DB của mình trước mọi provider ngoài. Bước 3 chỉ hỏi "entry có UUID này còn không". LDAP đã xoá user thì login thất bại, nhưng bản import bị xoá hay không còn tuỳ cache user của Keycloak. Lab gốc (`bnguyen` chưa từng login, bị `ldapdelete`): `invalid_grant`, event `error="user_not_found"`, số user 5 xuống 4. Critic lặp lại với user vừa login thành công (còn trong cache): search trả `entriesReturned=0`, vẫn `invalid_grant` nhưng event `invalid_user_credentials`, bản import ở lại; gọi `clear-user-cache` của realm rồi login lại mới ra `user_not_found`, count giảm 1. Bước 4 là phép kiểm mật khẩu duy nhất. Không bước nào chép thuộc tính từ entry vừa search vào bản import, nên email mới nằm trong response bước 3 mà không vào token: đáp án (b).

> **Suy luận.** Docs không mô tả từng request LDAP của một lần login. Thứ tự bind/search ở trên đọc từ access log của lab (bước 3, 5, 7 trong `RESULTS.txt`), và việc bước 3 không cập nhật thuộc tính là kết luận từ quan sát "search trả entry mới nhưng claim vẫn cũ, đến khi chạy sync mới đổi". Kiểm bằng: đổi một thuộc tính trong LDAP, login lại, so claim với `ldapsearch`.

> **Nguồn.** *"Keycloak searches the local Keycloak user database first to resolve users before any LDAP or custom User Storage Provider."* ([dealing-with-provider-failures](https://www.keycloak.org/docs/latest/server_admin/#dealing-with-provider-failures)).

---

## ⏸ Dừng lại — đoán trước #2

Cùng một realm, cùng client `test-direct`, password grant tuần tự 50 lần. `alice` là user tạo trong Keycloak (hash argon2id), `jdoe` là user LDAP đã import. LDAP chạy cùng máy, không TLS. p50 của ai thấp hơn, chênh bao nhiêu?

```
(a) alice thấp hơn khoảng 5 lần: jdoe tốn thêm hai kết nối TCP và hai lần bind
(b) Gần như bằng nhau: cả hai đều phải kiểm mật khẩu
(c) jdoe thấp hơn khoảng 3-4 lần
(d) jdoe chậm hơn vài trăm ms vì LDAP đi qua JNDI
```

---

### 3.4 Chi phí của một login LDAP: đáp án đảo chiều

Đáp án là **(c)**, vì câu hỏi thật là ai trả chi phí băm. User cục bộ có credential argon2id 5 vòng; lab giao thức chung của course đo phần băm ăn khoảng 14 ms mỗi login (password grant 15,50 ms so với client_credentials 1,58 ms). User LDAP không có gì để băm phía Keycloak: chỉ hai kết nối, hai bind, một search. LDAP in-memory của lab lưu `userPassword` dạng thô nên so gần như tức thì.

| Ca (n=50, warmup 5) | p50 ms | p95 ms | HTTP |
|---|---|---|---|
| alice (local, argon2id) đúng mật khẩu | 19,09 | 22,16 | 200 |
| jdoe (LDAP, import bật) đúng mật khẩu | 5,23 | 6,17 | 200 |
| msmith (LDAP, import tắt) đúng mật khẩu | 4,95 | 6,55 | 200 |
| jdoe sai mật khẩu | 2,18 | 6,95 | 400 |
| alice sai mật khẩu | 15,33 | 16,52 | 400 |

19,09 / 5,23 = 3,65 lần; hiệu số 13,86 ms gần bằng chi phí argon2id. Hai ca sai mật khẩu cho thấy hệ quả phụ: user cục bộ vẫn tốn thời gian băm khi sai, còn user LDAP sai trả về nhanh hơn đúng (2,18 so với 5,23 ms) vì bind bị từ chối và không có bước phát token.

> **Đo trên lab (chạy riêng cho bài này).** Python `http.client`, keep-alive, một luồng tuần tự, localhost, `ldap://` không TLS. Phía LDAP, 110 login của jdoe sinh 220 `CONNECT`, 220 `BIND`, 110 `SEARCH`, tức mỗi login hai kết nối TCP mới và đóng ngay (`UNBIND` rồi `DISCONNECT`). `etime` của bind phía server có p50 0,025 ms. Script `~/projects/keycloak-lab/tmp-kc16-bench.py`, kết quả `lab-kc16/bench.txt`.

Đừng mang 5 ms lên production: AD thật ở mạng khác, có TLS, và DC lưu mật khẩu dạng băm nên phải băm để so.

Hai kết nối mỗi login không mâu thuẫn với câu docs "pooling bật mặc định": mặc định đó nằm ở form Admin Console (bundle 26.8.1 đặt `config.connectionPooling` mặc định `["true"]`). Provider của lab tạo bằng `kcadm` không có khoá này; khoá vắng thì Keycloak không đặt `com.sun.jndi.ldap.connect.pool` và JNDI không pool. Bật `connectionPooling=true`: search của bind DN dùng lại một kết nối, mỗi login còn 1 `CONNECT`. Kết nối bind của user không bao giờ vào pool, vì `LDAPOperationManager.authenticate` đặt cứng `com.sun.jndi.ldap.connect.pool=false`; với StartTLS, `getConnectionPooling()` trả `null` nên cả kết nối bind DN cũng không pool.

> **Đo trên lab (critic, 26.8.1).** Cùng `LdapServer.java`, cổng 10390, 5 login jdoe mỗi cấu hình: khoá vắng hoặc `false` cho 10 `CONNECT`, 10 `BIND`, 5 `SEARCH`; `true` cho 5 `CONNECT`, 5 `BIND` (đều `uid=jdoe`), 5 `SEARCH` trên cùng một `conn`. Hằng số pool đọc bằng `javap` trong `keycloak-ldap-federation-26.8.1.jar`. Output `critic-ch4/run-kc16-pool.txt`, `run-kc16-step7.txt`.

> **Chưa đo.** Latency login qua LDAPS tới DC thật, và số `CONNECT` mỗi login với `ldaps://`. Đo bằng: `InMemoryListenerConfig.createLDAPSConfig`, chạy lại bench.

> **Nguồn.** *"By default, connection pooling is enabled for both plain and ssl protocols."* ([_ldap_connection_pool](https://www.keycloak.org/docs/latest/server_admin/#_ldap_connection_pool)).

### 3.5 Import Users: bản sao trong DB hay đọc thẳng LDAP

**Import Users** quyết định Keycloak có tạo bản ghi user trong DB của mình cho mỗi user LDAP hay không. Trong code 26.8.1, không cấu hình gì thì là `true`.

Khi bật, Keycloak import user vào **lần đầu nó gặp user**: lần login đầu, hoặc lần đầu user xuất hiện trong một truy vấn tìm kiếm. Lab thấy cả hai đường. Ngay sau khi tạo provider, `kc get users -r corp` phát một search lấy cả nhánh `ou=people` và số user nhảy từ 1 lên 4. User `kpham` thêm vào LDAP sau đó: count là 4 trước lần login đầu của `kpham`, 5 ngay sau. Bản import mang `federationLink` (id provider) cùng `LDAP_ENTRY_DN`, `LDAP_ID` để lần sau tìm lại entry theo UUID.

Khi tắt, DB không có bản ghi nào. Realm `corp2` với `importEnabled=false`: login `msmith` thành công, `users/count` vẫn 0, id user là `f:2v2VIgjZRqqMoB8O4nBw0g:msmith` (tiền tố `f:`, id provider, username).

Tắt import nghe hợp lý ("LDAP là nguồn sự thật"), nhưng mất hai thứ: không lưu được thuộc tính profile ngoài LDAP, và user không import không làm thành viên organization được (bài 17). Bật import thì trả giá khác: mỗi user tìm thấy trong truy vấn admin kéo theo một LDAP search.

> **Nguồn.** *"importEnabled = Boolean.parseBoolean(getConfig().getFirstOrDefault(IMPORT_ENABLED, Boolean.TRUE.toString()));"* ([UserStorageProviderModel.java#L58](https://github.com/keycloak/keycloak/blob/26.8.1/model/storage/src/main/java/org/keycloak/storage/UserStorageProviderModel.java#L58)); *"The first time a user logs in or is returned as part of a user query (e.g. using the search field in the admin console), the LDAP provider imports the LDAP user into the Keycloak database."* ([synchronizing-ldap-users-to-keycloak](https://www.keycloak.org/docs/latest/server_admin/#synchronizing-ldap-users-to-keycloak)); *"If you disable Import Users, you cannot save user profile attributes into the Keycloak database."* và *"a LDAP search will be issued for every imported user that is found, possibly affecting the performance in a negative way."* ([storage-mode](https://www.keycloak.org/docs/latest/server_admin/#storage-mode)); *"So if you want to have LDAP users joining organizations, ensure that the import mode of the LDAP provider is enabled."* ([support-for-federated-members](https://www.keycloak.org/docs/latest/server_admin/#support-for-federated-members)).

### 3.6 Bản sai: "LDAP được sync nên Keycloak luôn có user mới nhất"

Câu này nghe đúng vì ba quan sát có thật: bản import gắn `federationLink`, giao diện có tab Synchronization, và Keycloak hỏi LDAP ở **mỗi** lần login. Dễ kết luận Keycloak đối chiếu LDAP liên tục.

Mục 3.3 đã phá vế thứ ba: lần hỏi đó chỉ kiểm tồn tại. Vế thứ hai mới là chỗ hỏng: tab Synchronization có, nhưng **không chạy gì** cho tới khi bạn tự cấu hình. Trong code, `fullSyncPeriod` và `changedSyncPeriod` mặc định `-1`, tức tắt; config provider của lab không có hai khoá này. Không sync thì bản import giữ thuộc tính của lần import đầu, vô thời hạn.

**Full sync** đọc toàn bộ nhánh user và cập nhật mọi user. **Changed users sync** chỉ lấy entry có `createTimestamp`/`modifyTimestamp` mới hơn lần sync trước. Lab gọi tay changed sync hai lần và đọc filter Keycloak gửi:

- Lần 1, chưa từng sync: `(modifyTimestamp>=19700101000000.0Z)`, từ mốc epoch, cập nhật 3 user. Email trong Keycloak và token đổi sang `john.doe@example.com`.
- Đổi `sn` của `msmith`, sync lần 2: `(modifyTimestamp>=20261015072558.0Z)`, đúng mốc lần trước, cập nhật 1 user.

<svg viewBox="0 0 720 230" role="img" aria-labelledby="kc16-b-t kc16-b-d" style="width:100%;height:auto">
<title id="kc16-b-t">Email trong LDAP và trong Keycloak theo thời gian</title>
<desc id="kc16-b-d">Hai dải thời gian: LDAP đổi email ở mốc ldapmodify, Keycloak giữ email cũ qua cả lần login có search theo entryUUID và chỉ đổi khi changed sync chạy.</desc>
<text x="10" y="90" font-size="11" fill="currentColor">LDAP: mail</text>
<text x="10" y="160" font-size="11" fill="currentColor">Keycloak: email</text>
<rect x="150" y="70" width="150" height="30" rx="4" fill="#3b82f6" fill-opacity="0.25"/>
<text x="225" y="90" text-anchor="middle" font-size="11" fill="currentColor">jdoe@example.com</text>
<rect x="300" y="70" width="390" height="30" rx="4" fill="#84cc16" fill-opacity="0.25"/>
<text x="495" y="90" text-anchor="middle" font-size="11" fill="currentColor">john.doe@example.com</text>
<rect x="150" y="140" width="150" height="30" rx="4" fill="#3b82f6" fill-opacity="0.25"/>
<text x="225" y="160" text-anchor="middle" font-size="11" fill="currentColor">jdoe@example.com</text>
<rect x="300" y="140" width="260" height="30" rx="4" fill="#ef4444" fill-opacity="0.25"/>
<text x="430" y="160" text-anchor="middle" font-size="11" fill="currentColor">jdoe@example.com (lệch)</text>
<rect x="560" y="140" width="130" height="30" rx="4" fill="#84cc16" fill-opacity="0.25"/>
<text x="625" y="160" text-anchor="middle" font-size="10" fill="currentColor">john.doe@...</text>
<line x1="150" y1="50" x2="150" y2="180" stroke="currentColor" stroke-opacity="0.4" stroke-width="1" stroke-dasharray="3 3"/>
<line x1="300" y1="50" x2="300" y2="180" stroke="currentColor" stroke-opacity="0.4" stroke-width="1" stroke-dasharray="3 3"/>
<line x1="430" y1="50" x2="430" y2="180" stroke="currentColor" stroke-opacity="0.4" stroke-width="1" stroke-dasharray="3 3"/>
<line x1="560" y1="50" x2="560" y2="180" stroke="currentColor" stroke-opacity="0.4" stroke-width="1" stroke-dasharray="3 3"/>
<text x="150" y="40" text-anchor="middle" font-size="11" fill="currentColor">import</text>
<text x="300" y="40" text-anchor="middle" font-size="11" fill="currentColor">ldapmodify</text>
<text x="430" y="40" text-anchor="middle" font-size="11" fill="currentColor">login: search UUID</text>
<text x="560" y="40" text-anchor="middle" font-size="11" fill="currentColor">changed sync</text>
<text x="360" y="210" text-anchor="middle" font-size="11" fill="currentColor">Độ lệch kéo dài tới lần sync kế tiếp. Sync để mặc định -1 thì không có mốc kết thúc.</text>
</svg>

Docs khuyên sync toàn bộ một lần khi tạo provider, rồi đặt sync định kỳ cho changed users. Đó là việc bạn phải làm.

> **Nguồn.** *"If you want to sync all LDAP users into the Keycloak database, configure and enable the Sync Settings on the LDAP provider configuration page."*; *"When synchronizing, Keycloak creates or updates users created or updated after the last sync only."*; *"The best way to synchronize is to click Synchronize all users when you first create the LDAP provider, then set up periodic synchronization of changed users."* ([synchronizing-ldap-users-to-keycloak](https://www.keycloak.org/docs/latest/server_admin/#synchronizing-ldap-users-to-keycloak)). Mặc định trong code: *"fullSyncPeriod = -1;"* ([#L73](https://github.com/keycloak/keycloak/blob/26.8.1/model/storage/src/main/java/org/keycloak/storage/UserStorageProviderModel.java#L73)) và *"changedSyncPeriod = -1;"* ([#L90](https://github.com/keycloak/keycloak/blob/26.8.1/model/storage/src/main/java/org/keycloak/storage/UserStorageProviderModel.java#L90)).

### 3.7 Edit mode: ai được sửa, và sửa thì dữ liệu đi đâu

User muốn sửa profile trong Account Console, admin muốn đặt lại mật khẩu. **Edit mode** quyết định thay đổi đó bị chặn, được ghi về LDAP, hay nằm lại trong Keycloak. Cơ chế nằm ở mapper: lúc tạo provider, Keycloak sinh mapper cho từng thuộc tính và gắn cờ `read.only` theo edit mode lúc đó.

Ở READ_ONLY, lab thấy `kcadm set-password` cho jdoe trả *Can't reset password as account is read only*, đổi email trả `error-user-attribute-read-only`.

| | READ_ONLY | WRITABLE | UNSYNCED |
|---|---|---|---|
| Đổi email/tên trong Keycloak | ✗ báo lỗi | ✓ ghi về LDAP | ✓ chỉ trong Keycloak |
| Đổi mật khẩu | ✗ | ✓ gửi sang LDAP | ✓ lưu trong Keycloak |
| Bind DN cần quyền ghi | không | có | không |
| Keycloak và LDAP có thể lệch do sửa ở Keycloak | không | không | có, cho tới khi admin đồng bộ |

Chỗ hay sai là đổi mode sau khi tạo. Lab chuyển provider từ READ_ONLY sang WRITABLE bằng `kcadm update components`: sáu mapper thuộc tính vẫn giữ `read.only=true`. Sửa email jdoe thành `jd@example.com` không báo lỗi, Keycloak hiển thị email mới, LDAP không nhận gì. Lần changed sync kế tiếp ghi đè lại `john.doe@example.com` không cảnh báo. Thay đổi biến mất âm thầm.

> **Nguồn.** READ_ONLY: *"You cannot change the username, email, first name, last name, and other mapped attributes. Keycloak shows an error anytime a user attempts to update these fields. Password updates are not supported."* WRITABLE: *"You can change the username, email, first name, last name, and other mapped attributes and passwords and synchronize them automatically with the LDAP store."* UNSYNCED: *"Keycloak stores changes to the username, email, first name, last name, and passwords in Keycloak local storage, so the administrator must synchronize this data back to LDAP."* Thời điểm chọn: *"Decide the Edit Mode when creating the LDAP provider."* ([edit-mode](https://www.keycloak.org/docs/latest/server_admin/#edit-mode)).

---

## ⏸ Dừng lại — đoán trước #3

Provider đang ở WRITABLE, kết nối `ldap://` (cổng thường). Admin đặt mật khẩu mới `New-Pass9` cho jdoe qua Keycloak. Sau đó bạn `ldapsearch` thuộc tính `userPassword` của jdoe bằng tài khoản admin LDAP. Bạn thấy gì?

```
(a) Hash argon2id do Keycloak tính, giống credential của user cục bộ
(b) Không có gì: Keycloak dùng một extended operation, LDAP không lộ thuộc tính này
(c) Một giá trị base64 mà decode ra đúng New-Pass9
(d) Hash {SSHA} do LDAP tự tính
```

---

### 3.8 Mật khẩu không vào DB, nhưng có đi qua mạng dạng thô

Vế thứ nhất có bằng chứng ở lab: credential của jdoe trong Keycloak là bản ghi ảo, không có hash.

```json
jdoe:  [{"type":"password","createdDate":-1,"federationLink":"5lUr4kV-TZ2RqYFRvGkgkA"}]
alice: {"type":"password","credentialData":{"algorithm":"argon2","hashIterations":5}}
```

Không `id`, không `credentialData`, `createdDate` -1: nó chỉ nói "mật khẩu user này do provider kia lo".

Vế thứ hai là đáp án **(c)**. Sau `set-password`, access log có một `MODIFY` lên `uid=jdoe` dưới danh tính `cn=admin`, và `ldapsearch` trả `userpassword:: TmV3LVBhc3M5` (hai dấu hai chấm trong LDIF = giá trị base64), decode ra `New-Pass9` (output đầy đủ ở 4.5). Docs nói Keycloak gửi plain-text và để LDAP tự băm; AD băm, còn OpenLDAP lưu nguyên nếu không dùng Password Modify Extended Operation (RFC 3062). UnboundID in-memory của lab cư xử như trường hợp sau.

Mật khẩu đi từ Keycloak sang LDAP ở **hai** chỗ: lúc đổi mật khẩu (MODIFY) và ở bước 4 của mọi lần login (simple bind). Trên `ldap://` không TLS, ai nghe được đoạn mạng giữa Keycloak và DC sẽ đọc được mật khẩu. Vì thế `ldaps://` hoặc StartTLS là bắt buộc, kể cả ở READ_ONLY.

> **Suy luận.** Docs chỉ nói lúc đổi mật khẩu. Việc simple bind cũng mang mật khẩu thô suy ra từ lab: LDAP so mật khẩu bind với `userPassword` lưu dạng thô và trả `resultCode=0`, nên nó đã nhận đúng chuỗi mật khẩu. Kiểm bằng: `tcpdump -i lo0 -A port 10389` trong lúc login jdoe.

> **Nguồn.** *"When Keycloak updates a password, Keycloak sends the password in plain-text format."*; *"Other LDAP servers such as OpenLDAP store the passwords in plain-text unless you use the LDAPv3 Password Modify Extended Operation as described in RFC 3062."* ([_ldap_password_hashing](https://www.keycloak.org/docs/latest/server_admin/#_ldap_password_hashing)).

### 3.9 Mapper: thuộc tính, group, role

**LDAP mapper** là thành phần con của provider, dịch một thứ trong LDAP thành một thứ trong Keycloak. Không có mapper thì Keycloak chỉ biết username.

Provider `vendor=other` sinh sẵn mapper `username`→`uid`, `email`→`mail`, `lastName`→`sn`, hai mapper ngày tạo/sửa, mapper Kerberos principal, và một mapper gây bất ngờ: `firstName`→`cn`. Với `cn: John Doe`, token ra `given_name` là `John Doe` và `name` là `John Doe Doe`. Đọc danh sách mapper ngay sau khi tạo provider và sửa trước khi user nào kịp import.

**Group mapper** đọc một nhánh group (lab: `ou=groups`, `groupOfNames`, `member` chứa DN) và tạo group tương ứng trong Keycloak. Lab gọi sync chiều LDAP→Keycloak: 2 group được import, `jdoe` nằm trong `/engineering`.

**Role mapper** biến group LDAP thành realm role hoặc client role; lab không chạy nó, chỉ thấy `RoleLDAPStorageMapperFactory` trong jar 26.8.1. Mapper MSAD đọc `userAccountControl`: giá trị 514 làm user Keycloak bị disable.

> **Nguồn.** *"This mapper maps LDAP groups from a branch of an LDAP tree into groups within Keycloak."*; *"If the value of userAccountControl is 514 (disabled account), the Keycloak user is disabled."* ([_ldap_mappers](https://www.keycloak.org/docs/latest/server_admin/#_ldap_mappers)).

### 3.10 Khi LDAP chết

Vì Keycloak tra DB của mình trước, user cục bộ không phụ thuộc LDAP. Lab tắt LDAP: `alice` vẫn login (200), `jdoe` nhận 500 `unknown_error`, log ghi `ModelException: Could not query server using DN [ou=people,dc=example,dc=com]` do `Connection refused`. Bản import không cứu được, vì bước 3 và bước 4 đều cần LDAP.

Hai luật của docs định hình dự phòng. Provider priority cao lỗi khi tra user thì cả lần login lỗi, không chuyển sang provider kế. Trong một provider, khai nhiều URL là failover tuần tự: luôn dùng server đầu tiên kết nối được, không chia tải. URL không phản hồi tốn tới Connection Timeout, mặc định 5000 ms.

> **Nguồn.** *"If you have a Storage Provider with a high priority that fails during user lookup, the login or user query fails with an exception and will not fail over to the next configured provider."* ([dealing-with-provider-failures](https://www.keycloak.org/docs/latest/server_admin/#dealing-with-provider-failures)); *"This is a sequential failover mechanism, not load balancing — the first reachable server is always used."*; *"The default is 5000 milliseconds (5 seconds)."* ([connecting-to-multiple-ldap-servers-for-failover](https://www.keycloak.org/docs/latest/server_admin/#connecting-to-multiple-ldap-servers-for-failover)).

### 3.11 Kerberos, một đoạn

Máy nhân viên trong domain Windows đã có vé Kerberos từ lúc đăng nhập. Qua SPNEGO, Keycloak trả trang login với HTTP 401 kèm `WWW-Authenticate: Negotiate`, trình duyệt đã cấu hình gửi vé, Keycloak kiểm vé bằng keytab của principal `HTTP/<host>@<KERBEROS REALM>`. App vẫn chỉ nhận token OIDC. Giới hạn: SPNEGO tắt mặc định, phải bật trong browser flow; provider Kerberos đứng riêng không cấp tên hay email nên thường đi kèm LDAP provider; NTLM không được hỗ trợ.

> **Nguồn.** *"By default, Keycloak disables SPNEGO protocol support."*; *"Keycloak acts as a broker to Kerberos/SPNEGO login. Therefore Keycloak authenticating through Kerberos is hidden from the application."*; *"User profile information, such as first name, last name, and email, are not provisioned."* ([_kerberos](https://www.keycloak.org/docs/latest/server_admin/#_kerberos)).

---

## 4. Lab

Mọi thứ chạy trên một máy, không Docker. Thư mục `~/projects/keycloak-lab/lab-kc16/`.

### 4.1 Dựng LDAP in-memory bằng Java

Maven project `ldap-server/` phụ thuộc `com.unboundid:unboundid-ldapsdk:7.0.3`. Lõi của server (bỏ phần định dạng log):

```java
var cfg = new InMemoryDirectoryServerConfig("dc=example,dc=com");
cfg.addAdditionalBindCredentials("cn=admin,dc=example,dc=com", "admin-secret");
cfg.setListenerConfigs(InMemoryListenerConfig.createLDAPConfig("plain", 10389));
cfg.setAccessLogHandler(new FileHandler("ldap-access.log", true)); // log mọi BIND/SEARCH/MODIFY
var ds = new InMemoryDirectoryServer(cfg);
ds.importFromLDIF(true, "users.ldif");   // 3 user inetOrgPerson, 2 groupOfNames
ds.startListening();
```

Khởi động in `LDAP up on 10389, entries=8`. `ldapwhoami` (có sẵn trên macOS) với mật khẩu đúng trả `dn:uid=jdoe,ou=people,dc=example,dc=com`, sai trả `Invalid credentials (49)`.

### 4.2 Tạo provider bằng kcadm

Keycloak 26.8.1 `start-dev --http-port=8980 --http-management-port=9980`, realm `corp`, client `test-direct` (confidential, bật direct grant), user cục bộ `alice`. Provider là một component:

```bash
kc create components -r corp -s name=corp-ldap -s providerId=ldap \
 -s providerType=org.keycloak.storage.UserStorageProvider -s parentId=<realm-id> \
 -s 'config.vendor=["other"]' -s 'config.connectionUrl=["ldap://localhost:10389"]' \
 -s 'config.bindDn=["cn=admin,dc=example,dc=com"]' -s 'config.bindCredential=["admin-secret"]' \
 -s 'config.usersDn=["ou=people,dc=example,dc=com"]' -s 'config.usernameLDAPAttribute=["uid"]' \
 -s 'config.rdnLDAPAttribute=["uid"]' -s 'config.uuidLDAPAttribute=["entryUUID"]' \
 -s 'config.userObjectClasses=["inetOrgPerson, organizationalPerson"]' -s 'config.searchScope=["1"]' \
 -s 'config.editMode=["READ_ONLY"]' -s 'config.importEnabled=["true"]' -s 'config.pagination=["false"]' -i
```

Đọc lại bằng `kc get components/<id>`: `bindCredential` hiện `**********`, không có khoá sync, không có `connectionPooling`. `uuidLDAPAttribute` là chỗ quan trọng nhất: Keycloak dùng nó để nhận lại entry sau khi entry đổi DN. `searchScope=1` là một tầng dưới `usersDn`, user trong OU con sẽ không được tìm thấy.

### 4.3 Login lần đầu và thứ nằm trong DB

```bash
curl -s -d grant_type=password -d client_id=test-direct -d client_secret=td-secret \
  -d username=jdoe -d password=Ldap-Pass1 -d scope=openid \
  http://localhost:8980/realms/corp/protocol/openid-connect/token
```

HTTP 200. Bản import của jdoe (`kc get users -r corp -q username=jdoe`, chỉ giữ dòng liên quan):

```json
"username": "jdoe", "firstName": "John Doe", "lastName": "Doe",
"federationLink": "5lUr4kV-TZ2RqYFRvGkgkA",
"attributes": {
  "LDAP_ENTRY_DN": ["uid=jdoe,ou=people,dc=example,dc=com"],
  "LDAP_ID": ["00aea693-3cef-4905-98ef-9e29089676e6"] }
```

`LDAP_ID` chính là `entryUUID` trong filter search của mục 3.3.

### 4.4 Sửa ở LDAP, quan sát độ lệch, rồi sync

```bash
ldapmodify -x -H ldap://localhost:10389 -D cn=admin,dc=example,dc=com -w admin-secret <<'EOF'
dn: uid=jdoe,ou=people,dc=example,dc=com
changetype: modify
replace: mail
mail: john.doe@example.com
EOF
```

Ba quan sát liên tiếp:

1. `kc get users/<id>` trả `"email":"jdoe@example.com"`, access log không có request mới: đọc user theo id không chạm LDAP.
2. Login lại: có search theo `entryUUID` và bind của jdoe, token vẫn mang email cũ.
3. `kc create "user-storage/<provider-id>/sync?action=triggerChangedUsersSync" -r corp -o` trả `{"added": 0, "updated": 3, "removed": 0, "failed": 0}`; từ đây email trong Keycloak và token là `john.doe@example.com`.

### 4.5 WRITABLE và mật khẩu

```bash
kc get components/<id> -r corp > comp.json
jq '.config.editMode=["WRITABLE"] | .config.bindCredential=["admin-secret"]' comp.json > comp-w.json
kc update components/<id> -r corp -f comp-w.json
kc set-password -r corp --userid <jdoe-id> --new-password 'New-Pass9'
```

Lab đặt lại `bindCredential` vì `kc get` trả chuỗi che `**********`. Access log của `set-password`: bind admin, search theo `entryUUID`, rồi `MODIFY REQUEST dn="uid=jdoe,ou=people,dc=example,dc=com"` với `resultCode=0`. Sau đó:

```
$ ldapsearch -LLL -x -H ldap://localhost:10389 -D cn=admin,dc=example,dc=com -w admin-secret \
    -b uid=jdoe,ou=people,dc=example,dc=com mail userPassword
dn: uid=jdoe,ou=people,dc=example,dc=com
mail: john.doe@example.com
userpassword:: TmV3LVBhc3M5
$ echo TmV3LVBhc3M5 | base64 -d
New-Pass9
```

Dòng `mail` là bằng chứng cho mục 3.7: lúc này Keycloak đang hiển thị `jd@example.com`, LDAP không nhận.

## 5. Tính tay

**Bài 1: Email lệch bao lâu.** Changed users sync mỗi 900 s, chạy 9:00:00, 9:15:00. Access token sống 300 s (mặc định realm, bài 10). Nhân sự đổi email trong AD lúc 9:00:30, user login lúc 9:14:50.

- Token phát 9:14:50 lấy email từ bản import, chưa sync từ 9:00:00, nên mang email cũ, và còn hiệu lực tới 9:14:50 + 300 s = 9:19:50 dù sync 9:15:00 đã cập nhật DB.
- Xấu nhất: đổi ngay sau một lần sync, login ngay trước lần kế. Độ lệch tối đa = 900 + 300 = 1.200 s = 20 phút.
- Sync để mặc định -1: không có cận trên.

**Bài 2: DC đầu tiên bị firewall nuốt gói.** Connection URL khai dc1 rồi dc2, dc1 không trả lời, Connection Timeout mặc định 5000 ms. Provider không pool như lab: mỗi login mở hai kết nối mới (search bằng bind DN, bind của user).

- Nếu mỗi kết nối mới đều thử dc1 trước: mỗi login chờ 2 × 5.000 ms = 10 s, cộng vài ms việc thật trên dc2.
- Bật pool: chỉ kết nối bind của user là mới mỗi lần, còn 5 s mỗi login.
- Nếu dc1 trả RST thay vì im lặng, lỗi về trong vài ms (lab: 0,006 s) và dc2 nhận việc gần như ngay.
- Thứ tự URL và kiểu hỏng của DC quyết định latency. Giảm timeout thì login nhanh lại, nhưng dễ bỏ qua một DC chỉ chậm.

> **Suy luận.** Docs nói failover tuần tự và timeout 5000 ms cho mỗi URL, nhưng không nói Keycloak có nhớ URL hỏng giữa các kết nối hay không. Con số 10 s và 5 s giả định là không nhớ, dựa trên số kết nối mỗi login đo ở lab. Kiểm bằng: khai một URL tới IP không route được (vd `ldap://10.255.255.1:389`) trước URL thật, đo `time_total` của một password grant.

**Bài 3: Tải lên DC lúc 9 giờ sáng.** 3.000 nhân viên login trong 10 phút đầu ngày, import bật, user đã import từ trước.

- Tốc độ login: 3.000 / 600 s = 5 login/s.
- Mỗi login: 2 kết nối, 2 bind, 1 search (đo ở lab). Tải lên DC: 10 kết nối mới/s, 10 bind/s, 5 search/s; trên LDAPS là 10 handshake TLS/s. Bật pool: 5 kết nối mới/s, 5 bind/s.
- Admin tìm "nguyen" trong trang Users ra 40 kết quả: thêm 40 search (mục 3.5), bằng 8 giây tải search của toàn bộ nhân viên (40 / 5).

---

## 6. Chuyển giao

1. Khách muốn nhân viên tự đổi mật khẩu trong Account Console. AD chỉ mở cổng 389 trong VPC, họ nói "mạng nội bộ, không cần TLS". Bạn đòi gì trước khi bật WRITABLE, lập luận thế nào?
2. Hai LDAP provider cho hai công ty con, priority 0 và 1. LDAP của provider priority 0 sập. Nhân viên công ty kia còn login được không, và câu trả lời có đổi nếu user của họ đã được import?
3. IT disable một tài khoản trong AD (`userAccountControl` = 514) lúc 10:00, người đó có SSO session còn 6 tiếng. Provider READ_ONLY, import bật, changed sync mỗi 30 phút. Cái gì vẫn chạy, tới khi nào?
4. Dự án muốn rời LDAP, chuyển mọi user thành user cục bộ. Mật khẩu sang bằng cách nào khi Keycloak chưa từng có hash? Edit mode nào cho phép chuyển dần không bắt ai reset?
5. Đã có 2.000 user import với `firstName`→`cn`. Sửa mapper sang `givenName` rồi phải làm gì để token đúng, và giữa hai bước user thấy gì?
6. Nhân sự đổi `uid` của một nhân viên từ `jdoe` thành `john.doe` (entryUUID giữ nguyên), tuần sau cấp `uid=jdoe` cho người mới. Import bật, không sync định kỳ, nhân viên cũ chưa login lại từ ngày đổi tên. Người mới gõ `jdoe` và mật khẩu AD của mình. Đi lại từng bước của mục 3.3: DB trả user nào, search theo UUID trả entry nào, bind dưới DN nào, token cuối cùng (nếu có) thuộc về ai?

---

## 7. Tóm tắt

- User federation: Keycloak hiện form và kiểm mật khẩu bằng một lần bind sang LDAP. Brokering (bài 15): IdP ngoài hiện form. App nhận token Keycloak trong cả hai.
- Keycloak không bao giờ import mật khẩu LDAP; credential của user LDAP là bản ghi ảo, `createdDate -1`, không hash.
- Mật khẩu vẫn đi qua mạng dạng thô, khi đổi mật khẩu và trong simple bind. Lab: LDAP lưu `userPassword` = `New-Pass9` nguyên văn. `ldaps://` hoặc StartTLS là bắt buộc.
- Mỗi login user LDAP đã import: bind DN search theo `entryUUID`, rồi bind bằng DN user. Không pool (provider tạo qua `kcadm` thiếu `connectionPooling`): 2 kết nối TCP; bật pool: 1, vì bind của user luôn mở kết nối riêng. Search đó chỉ kiểm tồn tại, không làm mới thuộc tính.
- Sync định kỳ tắt mặc định (`fullSyncPeriod`, `changedSyncPeriod` = -1 trong code). Độ lệch tối đa khi có sync = chu kỳ sync + tuổi thọ access token; không sync thì không có cận trên.
- Import Users mặc định bật; import xảy ra ở lần login đầu hoặc lần đầu xuất hiện trong truy vấn admin. Tắt import: mất thuộc tính profile cục bộ và khả năng join organization.
- Edit mode gắn vào cờ `read.only` của mapper lúc tạo; đổi mode sau đó, sửa ở Keycloak có thể bị sync ghi đè âm thầm.
- Lab: login local argon2id 19,09 ms p50, login LDAP in-memory 5,23 ms p50. Số trên AD thật chưa đo.
- LDAP chết: user cục bộ vẫn login, user LDAP nhận 500. Nhiều URL là failover tuần tự, timeout 5000 ms mỗi URL; giữa các provider không failover.
- Kerberos/SPNEGO tắt mặc định, cần keytab `HTTP/<host>`, không cấp tên/email nên đi cùng LDAP provider.

→ **Bài 17 — Organizations và multi-tenancy**: nhiều khách doanh nghiệp, mỗi khách một AD, cùng sống trong một realm; Organizations gắn domain, IdP và thành viên cho từng khách, và user LDAP muốn làm thành viên thì phải bật import.
