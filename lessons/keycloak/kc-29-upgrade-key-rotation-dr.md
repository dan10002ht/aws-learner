# Bài 29 — Nâng version, xoay key, DR

## 1. Mục tiêu

Sau bài này bạn có thể:

- Đọc `kcadm.sh get keys` và chỉ ra key nào đang ký, key nào chỉ còn verify, key nào đã rời JWKS, kể cả khi hai key cùng hiện `ACTIVE`.
- Viết quy trình xoay key RS256 không gây 401, tính thời gian chờ từ access token lifespan và TTL cache JWKS.
- Tính cửa sổ chồng lấn khi xoay key HS512 từ SSO Session Idle và Offline Session Idle, và chỉ ra nhóm user sẽ phải đăng nhập lại.
- Dùng `kc.sh update-compatibility metadata/check` để biết lần nâng version được rolling hay phải tắt cả cụm, và kể đúng thứ tự backup, migrate, rollback.
- Liệt kê thứ phải backup (database, kể cả private key trong đó), thứ không cần (cache), và lý do `kc.sh export` không phải backup.
- Mô tả multi-cluster v2 ở mức kiến trúc và tính tay downtime, RPO từ ràng buộc docs.

---

## 2. Triệu chứng

Một SaaS B2B nhận yêu cầu từ đợt audit bảo mật: "xoay signing key của IdP". Thứ Ba 10:00, admin mở tab Keys của realm, thêm một provider `rsa-generated` và một provider `hmac-generated` mới, rồi xoá hai provider cũ "cho gọn". Ba chuyện xảy ra, theo ba nhịp khác nhau.

Một: các API Spring trả 401 cho một phần request. Không ai sửa gì, đến khoảng 10:05 tỷ lệ 401 tự về 0.

Hai: user web đăng nhập lúc 9:50, dùng tới 9:58 rồi đi họp, quay lại lúc 10:15 (17 phút không thao tác) thấy màn hình đăng nhập, dù SSO Session Idle của realm là 30 phút.

Ba: app mobile, vốn giữ offline token để user không phải đăng nhập lại, bắt đầu đá user ra. Lời gọi refresh của app nhận:

```
{"error":"invalid_grant","error_description":"Invalid refresh token"} HTTP 400
```

Chuyện thứ ba không tự hết. Ticket hỗ trợ đến rải rác suốt nhiều tuần, mỗi lần một user mở app sau một thời gian không dùng.

> **Đo trên lab (chạy riêng cho bài này).** Keycloak 26.8.1 bản zip, chế độ `start` với Postgres 16.13 riêng (cổng 5435), OpenJDK 24.0.2, Mac mini Apple M4. Dòng lỗi trên là output thật khi refresh bằng một offline token ký bằng key HS512 đã bị disable. Access token lifespan mặc định là 300 s (`DEFAULT_ACCESS_TOKEN_LIFESPAN = 300`, bài 10), khớp với mốc "khoảng 10:05".

---

## ⏸ Dừng lại — đoán trước #1

Vì sao làn 401 tự hết sau khoảng 5 phút, còn làn đăng xuất trên mobile thì không?

```
(a) Spring cache JWKS 5 phút; hết TTL thì cache làm mới và hết 401. Mobile không có cache nên không tự lành
(b) Access token cũ sống tối đa 300 s rồi tự hết hạn. Refresh token, offline token, cookie SSO
    ký bằng key HS512 đã bị xoá, và không có cách nào ký lại chúng cho user không tự đăng nhập lại
(c) Keycloak cần 5 phút để đẩy key mới tới mọi node trong cụm
(d) Offline token nằm trên thiết bị nên phải đợi app phát hành bản mới
```

---

## 3. Lý thuyết

### 3.1 Một realm có nhiều key, mỗi key ký một loại thứ khác nhau

Đáp án #1 là (b). Muốn thấy vì sao, phải hỏi xoay **key nào**. Bài 4 đã cho thấy hai loại chữ ký trong cùng một lần login: access token và ID token ký RS256, refresh token ký HS512. Realm mặc định có bốn key provider, lab 1 đếm được: RS256 (ký), RSA-OAEP (mã hoá), HS512 (ký, đối xứng), AES (mã hoá, đối xứng). Endpoint `certs` chỉ công bố phần public: *"The certificate endpoint returns the public keys enabled by the realm, encoded as a JSON Web Key (JWK)."* Hai key đối xứng không bao giờ xuất hiện trong JWKS, vì công bố chúng là công bố bí mật.

Từ đó suy ra hai bài toán xoay key khác hẳn nhau:

| Key | Ký cái gì | Ai verify | Hậu quả khi key biến mất |
|---|---|---|---|
| RS256 | access token, ID token | mọi resource server, qua JWKS | token cũ còn hạn bị 401, tối đa bằng lifespan của chúng |
| HS512 | refresh token, offline token, cookie SSO `KEYCLOAK_IDENTITY` | chỉ Keycloak | mọi phiên đang dựa vào token đó chết, user phải đăng nhập lại |

Cookie SSO nằm trong dòng HS512 là đo trên lab: header của cookie `KEYCLOAK_IDENTITY` là `{"alg":"HS512",...}` với `kid` trùng key HMAC đang active.

Trong mỗi nhóm, Keycloak chọn key ký bằng **priority**. Một key provider có ba trạng thái:

- **active**: được dùng để ký, và verify. Trong các key active cùng thuật toán, priority cao nhất thắng.
- **passive**: không ký nữa, nhưng vẫn verify được, và (với RSA) vẫn nằm trong JWKS.
- **disabled**: không ký, không verify, biến khỏi JWKS. Bật lại được, vì vật liệu key vẫn còn trong DB.

Xoá provider khác disable ở đúng một điểm: không quay lại được.

Chỗ hay đọc sai: API `get keys` hiện **trạng thái của provider**, không phải "key đang ký". Ngay sau khi thêm provider mới priority 200, lab thấy:

```
{"kid":"eIxPmGz6wC","algorithm":"RS256","status":"ACTIVE","providerPriority":200}
{"kid":"aAsy-lvEkR","algorithm":"RS256","status":"ACTIVE","providerPriority":100}
```

Hai dòng cùng `ACTIVE`, nhưng chỉ `eIxPmGz6wC` ký token mới. Docs nói "một key active", ý là key đang ký.

> **Nguồn.** Server Admin Guide: *"...Keycloak has a single active key pair at a time, but can have several passive keys as well..."* và *"The highest number makes the key pair active."* ([server_admin](https://www.keycloak.org/docs/latest/server_admin/index.html)). Endpoint certs ([oidc-layers](https://www.keycloak.org/securing-apps/oidc-layers)). Refresh token thuộc category INTERNAL, ký HS512 (`INTERNAL_SIGNATURE_ALGORITHM = Algorithm.HS512`, [Constants.java 26.8.1](https://github.com/keycloak/keycloak/blob/26.8.1/server-spi-private/src/main/java/org/keycloak/models/Constants.java#L69)).

### 3.2 Xoay RS256: công bố trước, đổi sau, thu hồi cuối cùng

Bản sai nghe rất hợp lý: "thêm key mới rồi xoá key cũ, token mới ký bằng key mới là xong." Lab chạy đúng bản đó, chỉ thay "xoá" bằng "disable" để còn đảo lại. T1 là access token lấy trước khi xoay, ký bằng `aAsy...`. Ngay sau khi disable `aAsy...`:

```
JWKS: [{"kid":"eIxPmGz6wC","alg":"RS256","use":"sig"},{"kid":"CzRSUuoJ3T","alg":"RSA-OAEP","use":"enc"}]   <- mất aAsy
T1 verify: kid=aAsy-lvEkR NOT in JWKS (2 keys) -> 401  intro: {"active":false,"exp":null}
```

T1 còn gần trọn 300 s hạn, nhưng verify cục bộ không tìm được `kid`, introspection ghi `reason="Access token JWT check failed"`. Với Spring, cú 401 không đến ngay lúc disable mà đến cùng **token đầu tiên mang `kid` lạ**: cache JWKS 5 phút (bài 12) còn `aAsy...` nên T1 vẫn qua, cho tới khi T2 mang `kid` mới kéo `/certs` về và bản mới không còn `aAsy...`.

> **Đo trên lab (critic, 26.8.1).** `orders-api` của bài 12 (Spring Security 6.5.11) cổng 10180, Keycloak `start-dev` cổng 10100. Bản sai: thêm `rsa-generated` priority 200 rồi disable key cũ ngay. `T1 sau disable -> 200`, `T1 lần 2 -> 200` (không fetch `/certs`); `T2 (kid mới) -> 200`, log có `HTTP GET .../certs`; `T1 sau khi T2 đi qua -> 401`, và chính request T1 đó kéo thêm một lần `/certs` (kid lạ lần nữa). Lần đo thứ hai, `kid` mới **đã có sẵn** trong cache rồi mới disable key cũ lúc 15:33:24: T2 không gây fetch, T1 trả 200 mỗi 20 s tới 15:37:52, rồi 401 lúc 15:38:12, ngay request đầu sau khi cache (fetch lúc 15:33:05) quá 300 s. Script `tmp-critic-kc29-spring.sh`.

Vậy quy trình đúng là ba bước, mỗi bước chờ một thứ khác nhau.

**Bước 1, công bố trước.** Tạo provider mới với priority cao hơn nhưng `active=false`. Lab đo được: key mới (`5ogDhWHG17`, priority 300, `PASSIVE`) vào JWKS ngay, token vẫn ký bằng key cũ `eIxPmGz6wC`.

Bước này dành cho resource server **không** tải lại khi gặp `kid` lạ mà chỉ làm mới theo TTL: key mới phải nằm sẵn trong cache của chúng trước token đầu tiên ký bằng nó. Thời gian chờ là TTL cache JWKS dài nhất trong các resource server. Spring không cần bước này vì refetch theo `kid`; gateway và thư viện khác thì phải đọc cấu hình từng cái.

**Bước 2, đổi.** Bật `active=true` cho key mới. Từ giây đó token mới mang `kid` mới (`new token kid: 5ogDhWHG17` trong lab). Key cũ vẫn ở JWKS, nên mọi token đã phát vẫn verify được.

**Bước 3, thu hồi.** Đặt key cũ passive (nó đã thôi ký từ bước 2, passive chỉ làm rõ ý định), đợi token cuối ký bằng nó hết hạn, rồi disable, sau đó mới xoá. Thời gian chờ ít nhất bằng lifespan dài nhất của token RS256 mà realm cấp: 300 s cho access token mặc định, 900 s nếu còn client dùng implicit flow (`DEFAULT_ACCESS_TOKEN_LIFESPAN_FOR_IMPLICIT_FLOW_TIMEOUT = 900`).

Với xoay **theo lịch**, TTL cache JWKS không nằm trong phép tính của bước 3: key cũ còn sót trong cache sau khi bị disable chỉ verify được token đã hết hạn. Với thu hồi **khẩn cấp** (private key bị lộ) thì ngược lại: lần đo thứ hai ở trên cho thấy Spring không refetch vì `kid` cũ vẫn quen, nên token giả ký bằng key lộ còn qua thêm tối đa một TTL (5 phút Spring, 10 phút gateway ở mục 5) sau khi disable. Muốn cắt ngay phải restart hoặc xoá cache phía resource server.

<svg viewBox="0 0 700 300" role="img" aria-labelledby="kc29-a-t kc29-a-d" style="width:100%;height:auto">
<title id="kc29-a-t">Dòng thời gian xoay key RS256 không gây 401</title>
<desc id="kc29-a-d">Trục thời gian từ 09:50 đến 10:10: key K2 công bố passive lúc 09:50, active lúc 10:00, key K1 disable lúc 10:05; token T1 ký bằng K1 sống tới 10:04:30; bản sai xoá K1 lúc 10:00 làm T1 bị 401 trong khoảng 10:00 đến 10:04:30.</desc>
<defs><marker id="kc29-a-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="20" y="54" font-size="11" fill="currentColor">JWKS</text>
<rect x="100" y="40" width="40" height="22" rx="4" fill="#64748b" fill-opacity="0.25"/>
<text x="120" y="55" text-anchor="middle" font-size="11" fill="currentColor">K1</text>
<rect x="140" y="40" width="260" height="22" rx="4" fill="#84cc16" fill-opacity="0.25"/>
<text x="270" y="55" text-anchor="middle" font-size="11" fill="currentColor">K1 + K2 (đã công bố)</text>
<rect x="400" y="40" width="200" height="22" rx="4" fill="#3b82f6" fill-opacity="0.25"/>
<text x="500" y="55" text-anchor="middle" font-size="11" fill="currentColor">K2</text>
<text x="20" y="94" font-size="11" fill="currentColor">Key ký AT</text>
<rect x="100" y="80" width="200" height="22" rx="4" fill="#64748b" fill-opacity="0.25"/>
<text x="200" y="95" text-anchor="middle" font-size="11" fill="currentColor">K1 ký</text>
<rect x="300" y="80" width="300" height="22" rx="4" fill="#3b82f6" fill-opacity="0.25"/>
<text x="450" y="95" text-anchor="middle" font-size="11" fill="currentColor">K2 ký</text>
<text x="20" y="134" font-size="11" fill="currentColor">Token T1</text>
<rect x="290" y="120" width="100" height="22" rx="4" fill="#8b5cf6" fill-opacity="0.25"/>
<text x="340" y="135" text-anchor="middle" font-size="11" fill="currentColor">T1 (K1), 300 s</text>
<text x="20" y="174" font-size="11" fill="currentColor">Bản sai</text>
<rect x="300" y="160" width="90" height="22" rx="4" fill="#ef4444" fill-opacity="0.25"/>
<text x="345" y="175" text-anchor="middle" font-size="11" fill="currentColor">T1 bị 401</text>
<text x="410" y="175" font-size="11" fill="currentColor">xoá K1 lúc 10:00</text>
<text x="20" y="214" font-size="11" fill="currentColor">HS512 cũ</text>
<rect x="300" y="200" width="300" height="22" rx="4" fill="#f59e0b" fill-opacity="0.25"/>
<text x="450" y="215" text-anchor="middle" font-size="11" fill="currentColor">giữ passive tới hết Offline Idle</text>
<line x1="600" y1="211" x2="650" y2="211" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc29-a-arrow)"/>
<text x="630" y="196" text-anchor="middle" font-size="11" fill="currentColor">30 ngày</text>
<line x1="100" y1="250" x2="620" y2="250" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc29-a-arrow)"/>
<line x1="100" y1="245" x2="100" y2="255" stroke="currentColor" stroke-opacity="0.5"/>
<line x1="300" y1="245" x2="300" y2="255" stroke="currentColor" stroke-opacity="0.5"/>
<line x1="400" y1="245" x2="400" y2="255" stroke="currentColor" stroke-opacity="0.5"/>
<line x1="500" y1="245" x2="500" y2="255" stroke="currentColor" stroke-opacity="0.5"/>
<text x="100" y="270" text-anchor="middle" font-size="11" fill="currentColor">09:50 K2 passive</text>
<text x="300" y="270" text-anchor="middle" font-size="11" fill="currentColor">10:00 K2 active</text>
<text x="400" y="288" text-anchor="middle" font-size="11" fill="currentColor">10:05 disable K1</text>
<text x="500" y="270" text-anchor="middle" font-size="11" fill="currentColor">10:10</text>
</svg>

> **Nguồn.** Docs không có lịch xoay tự động: Keycloak không tự rotate realm key, admin làm tay. Khuyến nghị nhịp: *"Consider creating new keys every three to six months and deleting old keys one to two months after you create the new keys."* ([server_admin](https://www.keycloak.org/docs/latest/server_admin/index.html)). Access token lifespan 300 s và implicit 900 s: [Constants.java 26.8.1](https://github.com/keycloak/keycloak/blob/26.8.1/server-spi-private/src/main/java/org/keycloak/models/Constants.java#L59).

---

## ⏸ Dừng lại — đoán trước #2

Bạn áp đúng ba bước trên cho key HS512: thêm key HMAC mới priority cao hơn, key cũ thành passive, rồi 5 phút sau disable key cũ. Một user đã refresh lúc key cũ còn passive. Một user khác không đụng tới app trong suốt 5 phút đó. Ai còn phiên?

```
(a) Cả hai: refresh token không nằm trong JWKS nên không bị ảnh hưởng bởi xoay key
(b) Không ai: refresh token nào lấy trước lúc xoay đều chết khi key cũ bị disable
(c) Chỉ user đã refresh: lần refresh đó trả refresh token MỚI ký bằng key mới
(d) Cả hai, vì session nằm trong DB nên Keycloak tự ký lại token khi cần
```

---

### 3.3 Xoay HS512: cửa sổ chồng lấn đo bằng session, không bằng token

Đáp án #2 là (c). Lab đo từng nấc:

```
RT_a kid d6bd7c52-6   RT_o kid d6bd7c52-6            <- online RT và offline RT, key cũ
add hmac-generated hs-2026q4 priority 200
refresh RT_a: 200 -> new RT kid 709a3dd5-8            <- refresh trả RT ký bằng key mới
old HS -> passive:   refresh RT_a: 200
old HS -> disabled:  refresh RT_a: {"error":"invalid_grant","error_description":"Invalid refresh token"} HTTP 400
                     refresh RT_o (offline): cùng lỗi, HTTP 400
```

Cơ chế: Keycloak không "ký lại" token cũ. Mỗi lần refresh nó phát refresh token mới (bài 10), ký bằng key active hiện tại. Cookie SSO cũng vậy: lab đăng nhập bằng trình duyệt giả lập, thêm key HMAC mới, gọi lại `/auth`, SSO vẫn qua và cookie `KEYCLOAK_IDENTITY` trả về đã mang `kid` mới. Phiên được **dùng** trong lúc key cũ còn verify được thì tự chuyển sang key mới. Phiên nằm yên suốt khoảng đó thì chết: một phiên khác không gọi gì giữa lúc thêm key mới và lúc disable key cũ, lần `/auth` kế tiếp hiện form đăng nhập (mục 4, bước 4).

Docs nói đúng điều này, kèm một câu dễ bị bỏ qua:

> **Nguồn.** *"If a user was inactive in the period between the new keys being added and the old keys being removed, that user will have to re-authenticate."* và *"Rotating keys also applies to offline tokens."* ([server_admin](https://www.keycloak.org/docs/latest/server_admin/index.html)). Offline Session Idle mặc định 2592000 s (30 ngày), SSO Session Idle 1800 s ([Constants.java 26.8.1](https://github.com/keycloak/keycloak/blob/26.8.1/server-spi-private/src/main/java/org/keycloak/models/Constants.java#L64)).

Từ đó ra cách chọn cửa sổ. "Inactive" chỉ gây hại nếu phiên đó **lẽ ra còn sống**. Phiên online không ai đụng quá SSO Session Idle (30 phút) đã chết vì idle, có xoay key hay không; phiên offline không refresh quá Offline Session Idle (30 ngày) cũng vậy. Nên:

- giữ key HS512 cũ ở passive ít nhất bằng **Offline Session Idle** nếu realm có offline token;
- nếu không có offline token, ít nhất bằng **SSO Session Idle**.

> **Suy luận.** Docs không nối khuyến nghị "xoá key cũ sau một đến hai tháng" với Offline Session Idle 30 ngày. Hai con số khớp nhau: một tháng là đúng mốc mà mọi offline token chưa được dùng đều đã chết vì idle. Còn cửa sổ ngắn hơn Offline Idle thì mỗi user mobile không mở app trong cửa sổ đó mất phiên. Đó chính là ticket "rải rác suốt nhiều tuần" ở mục 2. Kiểm bằng: lab ở mục 4 bước 4, thay "ngay" bằng các mốc thời gian.

Áp vào mục 2: xoá HS512 cũ lúc 10:00 là cửa sổ 0 giây. Mọi phiên chết cùng lúc, nhưng ticket đến theo nhịp user quay lại.

### 3.4 Nâng version: schema chỉ đi một chiều

Xoay key là việc trong realm; nâng version đụng tới thứ nằm dưới realm là schema database. Khi khởi động, Keycloak so bảng `databasechangelog` với các changelog Liquibase đóng gói trong bản mới, chạy những changeset còn thiếu, rồi chạy bước migrate model trong Java cho từng realm. Lab nâng từ 26.7.5 lên 26.8.1 trên cùng một Postgres:

```
14:59:43,663 Keycloak 26.8.1 on JVM (powered by Quarkus 3.40.1) started in 2.035s
14:59:44,230 QuarkusJpaUpdaterProvider : Updating database. Using changelog META-INF/jpa-changelog-master.xml
14:59:46,029 DefaultMigrationManager : Migrating older model to 26.8.0
14:59:46,618 RealmMigration : migrated realm lab29 to 26.8.0
14:59:46,690 KeycloakApplication : Bootstrap completed in 3.087000 seconds
```

`databasechangelog` từ 211 lên 238 dòng: 27 changeset; từ `Updating database` (14:59:44,230) tới changeset cuối (14:59:44,942) là 0,712 s, 100 bảng thành 101. Trên DB lab 13 MB, từ lúc gõ lệnh tới `/health/ready` 200 mất 7 s: số của DB gần rỗng, không phải production.

Keycloak không có bước "down" cho changeset. Bản sai "rollback chỉ cần chạy image cũ" vỡ ở đây. Thứ tự bắt buộc khi nâng minor: backup DB, tắt **hết** node bản cũ, start bản mới; quay lại thì restore cả cài đặt lẫn DB.

> **Nguồn.** Upgrading Guide ([upgrading](https://www.keycloak.org/docs/latest/upgrading/index.html)): *"Before you migrate the database, shut down all Keycloak nodes running the old version of Keycloak."* *"...Because Keycloak does not support rolling back the database changes, if you need to roll back to the previous version, first restore the old installation, and then restore the database from the backup copy."* *"By default Keycloak sets a migration timeout of 30 minutes."* Bảng trên 300000 bản ghi không được tạo index tự động lúc migrate. Copy `conf/` sang bản mới, trừ `cache-ispn.xml`. Flow đăng nhập dở mất khi shutdown: *"Currently ongoing authentication flows are only stored in the internal caches that are cleared when Keycloak is shut down."*

Khi nào **không** phải tắt hết? *"Starting with Keycloak 26.6.0 rolling updates of patch releases are supported."* (bản vá cùng `major.minor`, cụm ít nhất 2 node). Không phải tự đoán: `update-compatibility` so metadata của bản đang chạy với cấu hình bản mới và trả exit code. Lab chạy cả hai trường hợp:

```
26.7.5 metadata -> 26.8.1 check : exit 3
[feature-compatibility] Rolling Update is not available. 'feature-compatibility.login-failures'
  is incompatible: null -> {"enabled":true,"version":2,"updatePolicy":"SHUTDOWN"}.
26.8.0 metadata -> 26.8.1 check : exit 0
[keycloak] Provider is compatible.
[OK] Rolling Update is available.
```

Lý do của exit 3 đáng đọc: metadata 26.7.5 không có feature `login-failures`, 26.8.1 có nó ở version 2 với chính sách `SHUTDOWN`, khớp với việc từ 26.8 login failures lưu DB mặc định (bài 25). Hai bản không được chạy chung cụm. Strategy `Auto` của Operator (bài 26) chạy đúng cặp lệnh này trong một Job và chỉ rolling khi exit 0.

Hai thứ `update-compatibility` không kiểm:

- **SPI tự viết.** Authenticator và event listener dùng SPI mà docs ghi *"This is an internal SPI. While it was stable in the previous releases, any new release of Keycloak can change it without prior notice."* (bài 22–23). Lệnh check không biên dịch lại JAR của bạn. Mỗi lần nâng, kể cả bản vá, build lại JAR với BOM đúng version và test trên staging.
- **Sticky session.** Bài 25 đã đặt ba trang docs cạnh nhau. Phần liên quan ở đây: update-compatibility guide bảo bật sticky **trong lúc** rolling bản vá, để user khỏi nảy giữa hai bản và phải tải lại Account Console, Admin UI. Cùng cách đọc như bài 25 (docs không viết): chia đều là mặc định, sticky là biện pháp tạm trong khoảng rolling.

Một điểm cộng đo được: phiên **không** mất qua lần nâng minor. Refresh token lấy trên 26.7.5 được 26.8.1 nhận (`HTTP 200`), vì từ 26 session nằm trong DB (bài 25). Thứ mất là flow đăng nhập dở và cache.

---

## ⏸ Dừng lại — đoán trước #3

Đội vận hành chạy `kc.sh export --realm app` mỗi đêm, đẩy file JSON lên object storage ở region khác, và gọi đó là "backup Keycloak". Region chính mất trắng. Bạn dựng Keycloak mới ở region dự phòng và import file đêm qua. Thứ gì **không** quay lại?

```
(a) Không mất gì ngoài thay đổi sau giờ export
(b) Mất user, vì export mặc định không gồm user
(c) Mất session, event, revoked token; và nếu export lúc server đang chạy thì file có thể không nhất quán
(d) Mất client secret, vì export che secret bằng dấu *
```

---

### 3.5 Backup và DR: database là nguồn sự thật, kể cả private key

Đáp án #3 là (c). Bài 24 đã dạy export/import; ba câu docs đủ để thấy nó không phải backup: *"Exported data does not include user and admin events, persisted sessions, workflow state or revoked tokens."* *"Consistency of an export is not guaranteed unless all Keycloak nodes are stopped prior to running the export."* Và câu chặn (d): *"Only CLI exports are suitable for backups or data transfer between servers."* Bản che secret bằng `*` là partial export từ Admin Console, không phải `kc.sh export`.

Vậy backup cái gì? Liệt kê theo chỗ dữ liệu sống:

| Dữ liệu | Nằm ở đâu (26.8.1) | Cần backup |
|---|---|---|
| Realm, client, user, credential | DB | ✓ |
| User session, client session, offline session | DB (persistent sessions mặc định từ 26) | ✓ |
| Login failures của brute-force | DB, mặc định từ 26.8 | ✓ |
| Private key RSA, secret HMAC | DB, bảng `component_config` (đo trên lab) | ✓, và backup thành tài liệu mật |
| Cache realm, user, keys | RAM từng node | ✗, dựng lại từ DB |
| Authentication session (đăng nhập dở) | Mặc định: cache phân tán. Với `--features=stateless`: DB, bảng `root_auth_session`, `auth_session` | Mặc định ✗, mất thì user bấm login lại |

> **Đo trên lab (critic, 26.8.1).** Dòng authentication session dễ đọc sai, vì schema 26.8.1 **có** bảng cho nó: changeset `26.7.0-persistent-auth-session-root-table` và `26.7.0-persistent-auth-session-table` tạo `root_auth_session`, `auth_session` trên mọi DB (`\dt *auth_session*` trên Postgres của lab bài này thấy cả hai, 0 dòng sau nhiều lần đăng nhập form). Bảng có nhưng không dùng: `JpaAuthenticationSessionProviderFactory.isSupported()` chỉ trả `true` khi bật feature `STATELESS`, mà `serverinfo` ghi `STATELESS` là `DISABLED_BY_DEFAULT` (nhãn feature: `stores authentication sessions, action tokens and login failure data in the database`). Câu của Upgrading Guide về flow dở bị xoá khi shutdown đúng cho cấu hình mặc định; bật `stateless` (multi-cluster v2, cuối mục này) thì flow dở cũng nằm trong DB và đi theo backup.

Dòng private key là thứ lab cho thấy rõ nhất. Sau khi tắt hết process và start lại, các `kid` cũ vẫn y nguyên, và truy vấn thẳng vào DB thấy vật liệu key:

```
 rsa-2027q1 | privateKey  |   1588
 rsa-2027q1 | certificate |    892
 hs-2027q2  | secret      |    171
```

(cột cuối là độ dài giá trị). Hai hệ quả. Một: file backup DB đủ để ký token cho mọi realm, phải được bảo vệ như chính private key. Hai: restore một backup cũ hơn lần xoay key gần nhất là đưa key cũ về và làm mất key mới; token và refresh token ký bằng key mới sẽ 401 và `invalid_grant`, y như mục 2.

> **Nguồn.** *"User sessions, client sessions, offline user sessions, and offline client sessions are stored in the database."* ([caching](https://www.keycloak.org/server/caching)). Login failures lưu DB từ 26.8 ([caching](https://www.keycloak.org/server/caching)). Docs không nói export là cơ chế backup; backup đúng là backup database theo tài liệu của vendor DB. Operator không quản database: *"The Keycloak Operator does not manage the database and you need to provision it yourself."* ([basic-deployment](https://www.keycloak.org/operator/basic-deployment)).

**Multi-site.** Không muốn chờ restore khi một region chết thì cần nhiều cụm (26.4 đổi tên multi-site thành multi-cluster). Bản v1 (feature `multi-site`, Infinispan ngoài, replicate chéo site) deprecated ở 26.8. Bản v2 đi với feature `stateless`, supported từ 26.8, bật bằng `--features=stateless`. Ý tưởng: bỏ replicate cache. Mỗi site là một cụm độc lập, cùng ghi vào **một** database replicate đồng bộ giữa các site; invalidation đi qua bảng outbox trong DB, cụm kia poll bảng đó.

<svg viewBox="0 0 700 260" role="img" aria-labelledby="kc29-b-t kc29-b-d" style="width:100%;height:auto">
<title id="kc29-b-t">Multi-cluster v2 ở mức kiến trúc</title>
<desc id="kc29-b-d">Load balancer chia request cho hai cụm Keycloak độc lập ở site A và site B; cả hai ghi vào một database replicate đồng bộ giữa hai site, và nhận invalidation của nhau qua bảng outbox được poll mỗi 100 ms.</desc>
<defs><marker id="kc29-b-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="240" y="10" width="220" height="34" rx="8" fill="#64748b" fill-opacity="0.25"/>
<text x="350" y="31" text-anchor="middle" font-size="11" fill="currentColor">Load balancer, check /lb-check</text>
<line x1="300" y1="44" x2="170" y2="78" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc29-b-arrow)"/>
<line x1="400" y1="44" x2="530" y2="78" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc29-b-arrow)"/>
<rect x="40" y="80" width="250" height="60" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="165" y="104" text-anchor="middle" font-size="11" fill="currentColor">Site A: cụm Keycloak 26.8.1</text>
<text x="165" y="124" text-anchor="middle" font-size="11" fill="currentColor">cache cục bộ, --features=stateless</text>
<rect x="410" y="80" width="250" height="60" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="535" y="104" text-anchor="middle" font-size="11" fill="currentColor">Site B: cụm Keycloak 26.8.1</text>
<text x="535" y="124" text-anchor="middle" font-size="11" fill="currentColor">cache cục bộ, --features=stateless</text>
<line x1="165" y1="140" x2="250" y2="186" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc29-b-arrow)"/>
<line x1="535" y1="140" x2="450" y2="186" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc29-b-arrow)"/>
<text x="40" y="172" font-size="11" fill="currentColor">ghi + poll outbox 100 ms</text>
<text x="500" y="172" font-size="11" fill="currentColor">ghi + poll outbox 100 ms</text>
<rect x="190" y="188" width="320" height="56" rx="8" fill="#84cc16" fill-opacity="0.25"/>
<text x="350" y="210" text-anchor="middle" font-size="11" fill="currentColor">Một database, replicate đồng bộ A và B</text>
<text x="350" y="230" text-anchor="middle" font-size="11" fill="currentColor">commit nên dưới 5 ms, bắt buộc dưới 10 ms</text>
</svg>

Các ràng buộc docs đưa ra, và mỗi cái giới hạn thiết kế theo một cách:

- Commit latency của DB dưới 5 ms là gợi ý, dưới 10 ms là bắt buộc. Hai site phải đủ gần để replicate đồng bộ trong ngân sách đó.
- Đồng hồ hai cụm lệch quá 10 s thì invalidation có thể không tới, cache cũ được dùng.
- DB crash có thể mất dữ liệu session trong cửa sổ dưới 1 giây; user bị ảnh hưởng đăng nhập lại.
- Không chạy khác `major.minor` giữa các site. Nâng minor phải tắt mọi site trừ một, tức là mất tính dự phòng đúng lúc rủi ro nhất.

> **Nguồn.** Release notes 26.8: *"In this release, multi-cluster v2 and the stateless feature are promoted from preview to supported."* và *"Multi-cluster v1 (the multi-site feature) is deprecated and will be removed in a future major release."* ([release_notes](https://www.keycloak.org/docs/latest/release_notes/index.html)). Outbox và polling 100 ms ([concepts](https://www.keycloak.org/high-availability/multi-cluster-v2/concepts)); *"A commit latency of less than 5 ms is suggested, and below 10 ms is required."* và lệch đồng hồ 10 s ([introduction](https://www.keycloak.org/high-availability/multi-cluster-v2/introduction)); *"Shut down all sites except one."* ([upgrades](https://www.keycloak.org/high-availability/multi-cluster-v2/upgrades)). Docs không cho RPO/RTO bằng con số cứng cho v2, bảng chỉ ghi định tính (không mất dữ liệu; vài giây tới vài phút).

---

## 4. Lab

> **Đo trên lab (chạy riêng cho bài này).** 2026-10-15, thư mục `~/projects/keycloak-lab/lab-kc29/`: ba bản zip 26.7.5, 26.8.0, 26.8.1, OpenJDK 24.0.2, Postgres 16.13 riêng cổng 5435, Mac mini Apple M4. Keycloak `start` cổng 2400, management 3400, một node `--cache=local`; mốc giây chỉ đúng bậc độ lớn. Realm `lab29`, client confidential `app`, user `alice`. Script `rotate.sh`, `rotate-hs.sh`, `compat.sh`; resource server giả lập là `tmp-kc29-verify.py`, verify RS256 bằng Python thuần với JWKS tải mới mỗi lần. Tóm tắt ở `RESULTS.txt`, log gốc `rotate*.log`, `sso*.log`, `prepublish.log`, `check*.log`.

**Bước 1. Nâng 26.7.5 lên 26.8.1, có kiểm tương thích trước.** Start 26.7.5 trên DB rỗng (ready sau 31 s, 211 changeset), tạo realm, lấy một refresh token, dừng. Rồi chạy cặp lệnh của Operator bằng tay:

```bash
keycloak-26.7.5/bin/kc.sh update-compatibility metadata --file=meta-2675.json $OPTS   # exit 0
keycloak-26.8.1/bin/kc.sh update-compatibility check    --file=meta-2675.json $OPTS   # exit 3
```

`$OPTS` phải đúng bộ option của server thật (db, hostname, cache...), vì lệnh so **cấu hình**, không chỉ version. File metadata ghi version, loại DB và chính sách cập nhật từng feature (`ROLLING`, `ROLLING_NO_UPGRADE`, `SHUTDOWN`). Start 26.8.1 trên cùng DB: log ở mục 3.4. Refresh token lấy trên 26.7.5 vẫn đổi được: `HTTP 200`. Lặp lại với 26.8.0 lên 26.8.1: exit 0.

**Bước 2. Bản sai rồi bản đúng với key RS256.** `rotate.sh` lấy T1 (ký `aAsy...`), thêm `rsa-generated` priority 200, lấy T2 (ký `eIxPmGz6wC`), rồi đổi dần trạng thái key cũ:

| Trạng thái `aAsy...` | Số key RS256 trong JWKS | Verify cục bộ T1 | Introspect T1 |
|---|---|---|---|
| active, có key mới priority cao hơn | 2 | `signature VALID -> 200` | `active: true` |
| passive (`active=false`) | 2 | `signature VALID -> 200` | `active: true` |
| disabled (`enabled=false`) | 1 | `NOT in JWKS (2 keys) -> 401` | `active: false` |
| bật lại `enabled=true` | 2 | | `active: true` |

Passive vẫn ở JWKS, disabled thì không, và disable đảo lại được. `prepublish.log` thử bước 1 của quy trình đúng (mục 3.2): key priority 300 tạo với `active=false` vào JWKS ngay, token vẫn ký `eIxPmGz6wC`; bật `active=true` thì token chuyển sang `5ogDhWHG17`.

Bẫy lab gặp thật, không liên quan tới key: lần introspect đầu trả `active: false` cho token vừa cấp, log ghi `Client 'app' is not in the token audience`. Từ 26.6.2, introspection trả `active: false` khi client gọi không nằm trong `aud`; thêm audience mapper cho `app` là hết. Đừng đọc nhầm lỗi `aud` thành lỗi key.

**Bước 3. Key HS512 và refresh token.** `rotate-hs.sh`, output ở mục 3.3. Keycloak ghi event `REFRESH_TOKEN_ERROR` với `reason="Invalid refresh token"` cho mỗi lần refresh hỏng; với cửa sổ quá ngắn, event metrics (bài 28) sẽ thấy lỗi refresh kéo dài theo nhịp user quay lại.

**Bước 4. Cookie SSO.** `tmp-kc29-sso.py` đăng nhập form bằng HTTP thuần, giữ cookie jar, rồi gọi lại `/auth` sau mỗi lần đổi key:

```
GET /auth -> 302 callback with code (SSO cookie accepted)
KEYCLOAK_IDENTITY header: {"alg":"HS512","typ" : "JWT","kid" : "9c152d93-c695-447d-a3ef-e7f50687b0ee"}
probe after disabling 709a:  GET /auth -> 302 callback with code (SSO cookie accepted)
probe (user idle during whole overlap):  GET /auth -> HTTP 200, login form shown (no SSO)
```

Phiên thứ nhất chạm `/auth` khi key mới đã active nên cookie được ký lại và sống qua lần disable; phiên thứ hai không chạm gì và rơi về form đăng nhập.

**Bước 5. Key nằm trong DB.** Restart Keycloak: `get keys` trả đúng các `kid` cũ; `component_config` có `privateKey`, `secret` (mục 3.5). Cuối lab: dừng Keycloak, `pg_ctl -D pgdata stop`.

---

## 5. Tính tay

**Bài 1: lịch xoay RS256.** Realm có một SPA dùng code flow (access token 300 s) và một app cũ còn bật implicit (900 s). Resource server gồm các service Spring và một API gateway chỉ làm mới JWKS theo TTL 10 phút, không refetch theo `kid`. Lên lịch ba bước, bắt đầu 09:00.

Công bố K2 passive lúc 09:00. Gateway phải thấy K2 trước token đầu tiên ký bằng K2, nên chờ hết TTL dài nhất là 10 phút: bật K2 active sớm nhất 09:10 (Spring không cần chờ, nhưng lịch theo cái chậm nhất). Token cuối ký bằng K1 cấp ngay trước 09:10, sống lâu nhất 900 s (implicit), nên disable K1 sớm nhất 09:25. Cache gateway còn K1 thêm tối đa 10 phút, vô hại. Quên app implicit mà disable lúc 09:15 thì token implicit cấp lúc 09:09 bị 401 từ 09:15 tới 09:24.

**Bài 2: cửa sổ HS512 và user mobile.** Realm có offline token, Offline Session Idle mặc định 30 ngày (2592000 s). Admin muốn rút ngắn: giữ key HMAC cũ ở passive 7 ngày rồi disable. User nào mất phiên?

Offline session còn sống lúc disable nếu lần refresh cuối nằm trong 30 ngày trước đó, và được cứu nếu có một lần refresh **sau** lúc key mới active, tức trong 7 ngày vừa qua. Nhóm mất phiên: lần refresh cuối cách 7 tới 30 ngày. Cửa sổ 30 ngày thì nhóm đó rỗng. Realm không có offline token chỉ cần 30 phút (SSO Session Idle 1800 s). Nhóm 7 tới 30 ngày lớn cỡ nào thì đếm trong DB, không đoán: bảng `offline_user_session` có `last_refresh` (lab 2 đã đọc).

**Bài 3: downtime và RPO của một lần nâng minor.** Cụm 3 node 26.7.x, lên 26.8.1. `update-compatibility check` trả 3 (đo ở mục 4), nên không rolling được.

Downtime = tắt cả 3 node (graceful shutdown mặc định trễ 1 s, timeout 10 s) + backup DB + migrate + bootstrap. DB lab 13 MB: Liquibase 0,712 s, migrate model 0,59 s (46,029 tới 46,619), bootstrap 3,087 s, ready 7 s. DB production: **chưa đo**, trần là timeout migrate 30 phút; bảng nào vượt 300000 bản ghi thì index phải tạo bằng SQL tay, cộng thêm thời gian.

RPO nếu rollback: restore backup chụp lúc cụm đã tắt thì mất 0 thay đổi, vì không ai ghi được. Rollback sau 2 giờ mở traffic cho bản mới thì mất 2 giờ đăng ký, đổi mật khẩu, session, và mọi key xoay trong 2 giờ đó. Nên quyết rollback **trước** khi mở traffic, dựa trên smoke test.

> **Chưa đo.** Thời gian backup và migrate của một DB Keycloak cỡ production (hàng triệu user, hàng triệu session). Đo bằng: restore bản sao DB production vào staging, chạy bản mới với `--log-level=org.keycloak.quarkus.runtime.storage.database.liquibase:debug`, ghi mốc `Updating database` tới `Bootstrap completed`.

---

## 6. Chuyển giao

1. Realm có một client dùng `client_secret_jwt` hoặc ký request object bằng key HS của chính client đó. Xoay key HMAC của realm có ảnh hưởng tới client này không? Key nào đang tham gia, và key đó nằm ở đâu?
2. Một partner tích hợp bằng cách **pin** public key của realm vào cấu hình (không đọc JWKS). Viết lại quy trình ba bước cho trường hợp có partner này. Bước nào phải chờ người khác, và chờ dấu hiệu gì?
3. Sau một lần restore DB từ backup tuần trước, phần lớn user mobile vẫn dùng app bình thường, nhưng mọi user web đều phải đăng nhập lại. Đưa ra một giả thuyết giải thích được cả hai hiện tượng, dựa trên mục 3.3 và 3.5, và chỉ ra truy vấn DB nào kiểm được nó.
4. Bạn chạy `update-compatibility check` trong CI với `$OPTS` lấy từ file `.env` của staging, trong khi production có thêm `--features=stateless`. CI báo exit 0. Lần rolling trên production có an toàn không? Bạn sửa pipeline thế nào?
5. Hai site multi-cluster v2, một site đặt NTP lệch 15 s. Admin disable một key RSA ở site A. Kể lần lượt chuyện gì có thể xảy ra ở site B, và token nào bị ảnh hưởng.
6. Một ngân hàng đòi RPO bằng 0 khi mất trọn một region, và đòi nâng minor mỗi quý mà không lúc nào chỉ còn một region phục vụ. Multi-cluster v2 bắt tắt mọi site trừ một khi nâng minor. Thiết kế quy trình thỏa cả hai (được dùng hai deployment, DB riêng, chuyển traffic), hoặc chứng minh không thể. Nêu dữ liệu nào phải chuyển, key nằm đâu trong lúc chuyển, session của user đang đăng nhập đi về đâu.

---

## 7. Tóm tắt

- Hai nhóm key ký: RS256 (access token, ID token, có trong JWKS) và HS512 (refresh token, offline token, cookie SSO, không bao giờ trong JWKS). "Xoay key" phải nói rõ nhóm nào.
- Priority cao nhất trong các key active ký token mới. Passive: còn verify, còn trong JWKS. Disabled: mất cả hai, bật lại được. Xoá: không quay lại. `get keys` có thể hiện hai key `ACTIVE` cùng lúc.
- Keycloak không tự xoay key. Docs khuyên tạo key mới mỗi 3–6 tháng, xoá key cũ sau 1–2 tháng.
- RS256: công bố passive (chờ TTL JWKS dài nhất), bật active, thu hồi sau lifespan token dài nhất (300 s, hoặc 900 s nếu còn implicit). Với Spring, disable sớm thành 401 ngay khi token mang `kid` lạ kéo JWKS mới về; nếu `kid` mới đã nằm sẵn trong cache thì key cũ còn verify thêm tới hết TTL 300 s, kể cả khi thu hồi khẩn cấp.
- HS512: phiên được dùng trong cửa sổ chồng lấn tự chuyển sang key mới, phiên nằm yên thì chết. Cửa sổ an toàn = Offline Session Idle (30 ngày), hoặc SSO Session Idle (30 phút) nếu không có offline token.
- Nâng version chạy Liquibase lúc start; lab 26.7.5 lên 26.8.1: 27 changeset trong 0,712 s, ready 7 s trên DB 13 MB. Schema không rollback: backup trước, tắt hết node cũ, rollback là restore DB.
- `update-compatibility check`: exit 0 thì rolling, 3 thì tắt hết. Lab: 26.7.5 lên 26.8.1 trả 3 (feature `login-failures`, `SHUTDOWN`), 26.8.0 lên 26.8.1 trả 0. Không kiểm SPI tự viết. Sticky session chỉ bật tạm trong lúc rolling (bài 25).
- Database là nguồn sự thật, kể cả private key RSA và secret HMAC (`component_config`): backup DB là tài liệu mật, restore bản cũ hơn lần xoay key là đưa key cũ về. `kc.sh export` không phải backup.
- Multi-cluster v1 deprecated ở 26.8; v2 với `--features=stateless` supported từ 26.8: một DB replicate đồng bộ, commit dưới 10 ms, đồng hồ lệch tối đa 10 s, outbox poll 100 ms, nâng minor phải tắt mọi site trừ một.

→ **Bài 30 — IAM cho SaaS multi-tenant và chọn IdP**: giờ bạn đã biết giá vận hành thật của một Keycloak tự host (xoay key, nâng minor có downtime, DR bằng DB đồng bộ), bài sau đặt giá đó lên bàn cân với Auth0, Okta, Cognito, Zitadel và với các cách chia tenant.
