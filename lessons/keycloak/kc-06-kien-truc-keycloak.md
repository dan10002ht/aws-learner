# Bài 6 — Kiến trúc Keycloak: Quarkus, build-time và dữ liệu nằm ở đâu

## 1. Mục tiêu

Sau bài này bạn có thể:

- Xếp một option (`db`, `hostname`, `cache`, `health-enabled`...) vào build-time hay runtime, và nói đổi nó phải build lại hay chỉ restart.
- Viết được Dockerfile hai bước `build` rồi `start --optimized`, và đoán trước nó sẽ báo lỗi khi nào.
- Liệt kê khác biệt giữa `start-dev` và `start`, mỗi cái hỏng gì nếu mang lên production.
- Chỉ ra realm, user session, authentication session, login failure nằm ở DB hay cache Infinispan, cái nào sống sót khi restart cả cụm.
- Đọc log khởi động, RSS và JVM flags của một node, rồi đặt memory limit container không bị OOM kill.
- Giải thích vì sao app không được đặt vào realm `master`, bằng cơ chế chứ không phải bằng "best practice".

---

## 2. Triệu chứng

Một SaaS B2B chuyển từ login tự viết sang Keycloak 26.8.1. Dev phụ trách chạy thử bản zip trên laptop:

```
bin/kc.sh start-dev --http-port=8080 --http-management-port=9000 --health-enabled=true --metrics-enabled=true
```

Lần đầu log in ra dòng `Quarkus augmentation completed in 12411ms`, rồi `started in 5.725s`. Lần thứ hai chỉ còn `started in 3.580s`. Từ lúc gõ lệnh tới khi `/health/ready` trả UP mất 3,9 giây. Gọn.

Anh ta đóng gói y như vậy vào container: unzip, `CMD ["kc.sh", "start-dev", ...]`. Không dùng `start` vì thử rồi, server không chịu lên khi thiếu hostname và TLS. Deployment 2 replica sau load balancer, readiness probe chờ 10 giây.

Ba triệu chứng xuất hiện trong tuần đầu:

1. Mỗi pod mới đều fail readiness probe vài lần đầu. Log pod nào cũng có dòng `Updating the configuration and installing your custom providers, if any. Please wait.`, như thể lần nào cũng là lần đầu.
2. Admin tạo realm `b2b` qua Admin Console. Một nửa số lần mở trang login, Keycloak trả lỗi realm không tồn tại; nửa kia vẫn chạy.
3. Sau một lần redeploy, realm `b2b` biến mất trên cả hai pod. Toàn bộ user đã đăng ký mất theo.

Log có thêm một dòng mà không ai để ý: `Profile dev activated.`

---

## ⏸ Dừng lại — đoán trước #1

Triệu chứng 2 và 3 (realm lúc có lúc không, rồi mất hẳn) có chung một nguyên nhân gốc. Chọn một:

```
(a) Infinispan chưa cluster: thêm --cache=ispn là hai pod thấy realm của nhau
(b) start-dev dùng H2 in-memory: dữ liệu chỉ nằm trong RAM nên restart là mất
(c) Mỗi pod có một DB dev-file riêng trên filesystem của container, nên đây là
    hai Keycloak độc lập; filesystem container mất thì DB mất
(d) persistent user sessions tắt trong dev mode nên realm không được ghi xuống DB
```

---

## 3. Lý thuyết

### 3.1 Đáp án, và vì sao (a) là cái bẫy

Đáp án là **(c)**.

`start-dev` mặc định dùng database `dev-file`: một file H2 trên đĩa local. Nó bền qua restart tiến trình (nên (b) sai: `dev-mem` mới là in-memory). Nhưng "đĩa local" ở đây là filesystem của container: hai replica, hai file DB. Realm `b2b` được ghi vào DB của pod nào nhận request tạo realm. Load balancer chia đều, nên một nửa request login rơi vào pod không có realm đó. Redeploy tạo container mới từ image, file DB trong lớp ghi của container cũ bị bỏ, và realm mất trên cả hai.

Phương án (a) nghe đúng nhất, nên nó là bản sai nguy hiểm nhất. Giả sử ép được cache thành cluster: hai node chia sẻ *cache*, nhưng nguồn sự thật của realm là DB, cache chỉ giữ bản sao của thứ đã đọc từ DB. Node B đọc realm `b2b` từ DB của chính nó, không thấy, và cache cluster không cứu được. Huống chi `start-dev` tự ép `--cache=local`. Phương án (d) nhầm hai thứ: persistent user sessions nói về *session*, realm luôn nằm trong DB.

> **Nguồn.** Mặc định của `db` là `dev-file`, và *"In production mode the default value of dev-file is deprecated, you should explicitly specify the db instead."* ([all-config](https://www.keycloak.org/server/all-config)). Docs DB ghi thẳng: *"The dev-file database is not suitable for production use-cases, and must be replaced before deploying to production."* ([db](https://www.keycloak.org/server/db)). Về cache ở dev mode: *"When you start Keycloak in development mode, by using the start-dev command, Keycloak uses only local caches and distributed caches are completely disabled by implicitly setting the --cache=local option."* ([caching](https://www.keycloak.org/server/caching)).

> **Suy luận.** Docs không nói "hai replica dev-file là hai Keycloak riêng"; nó suy ra từ việc `dev-file` là file trên đĩa local và mỗi container có filesystem riêng. Kiểm bằng: hai container `start-dev` cùng image, tạo realm qua container thứ nhất, `curl` discovery của realm đó qua container thứ hai.

Triệu chứng 1 (pod nào cũng "lần đầu") dẫn tới thứ quan trọng nhất của kiến trúc Keycloak hiện tại: bước build.

### 3.2 Quarkus và bước build: vì sao Keycloak cần "biên dịch lại" chính nó

Keycloak 17.0.0 chuyển bản phân phối mặc định sang Quarkus; bản WildFly bị gỡ hẳn ở 20.0.0. Không còn `standalone.xml`: cấu hình đi qua dòng lệnh, biến môi trường `KC_*` và `conf/keycloak.conf`, cùng một bộ khoá.

Điều Quarkus đổi sâu hơn là *thời điểm* Keycloak quyết định nó gồm những gì. Ứng dụng Java truyền thống quét classpath, dựng registry, khởi tạo mọi factory ở mỗi lần start. Quarkus dời phần việc đó sang một bước gọi là **augmentation** (bước Quarkus phân tích ứng dụng một lần và sinh sẵn code khởi động đã tối ưu). Keycloak gọi bước đó là `kc.sh build`. Kết quả là một "closed world": tập provider đã chốt, factory đã biết trước, lúc start không phải dò lại.

"Closed world" có một hệ quả trực tiếp: thứ gì quyết định *có nạp code nào hay không* thì phải biết lúc build. Driver DB nào được nạp (`db`), feature nào bật (`features`), có dựng endpoint health/metrics hay không (`health-enabled`, `metrics-enabled`), router gắn mọi đường dẫn dưới tiền tố nào (`http-relative-path`), và file JAR nào trong `providers/` (bài 22). Đó là **build option**.

Ngược lại, thứ chỉ là *giá trị* mà code đã nạp đọc vào lúc chạy thì để tới runtime được: `hostname`, `http-port`, `db-url`, `db-password`, và cả `cache`. Đó là **runtime option**.

Đọc lại triệu chứng 1 với cơ chế này. Đo trên lab, bước augmentation tốn 12,4 giây. Để tiện, `start` và `start-dev` tự chạy build ngầm khi phát hiện cấu hình build khác lần trước. Image của dev kia chưa từng build, nên mỗi container mới khởi đầu từ một thư mục "chưa build", và lần nào cũng trả đủ 12,4 giây, cộng 5,7 giây start, trong khi probe chỉ chờ 10 giây.

<svg viewBox="0 0 700 270" role="img" aria-labelledby="kc6-a-t kc6-a-d" style="width:100%;height:auto">
<title id="kc6-a-t">Build option và runtime option trong Keycloak</title>
<desc id="kc6-a-d">Bên trái là các build option và provider JAR đi vào bước kc.sh build (augmentation, đo 12,4 giây trên lab) để tạo ra bản đã build lưu dạng plain text; bên phải là các runtime option được đọc mỗi lần start --optimized; đổi build option thì phải build lại, chạy --optimized với giá trị build option khác lúc build thì lỗi.</desc>
<defs>
<marker id="kc6-a-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker>
</defs>
<rect x="10" y="20" width="200" height="170" rx="8" fill="#f59e0b" fill-opacity="0.2"/>
<text x="110" y="42" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">Build option</text>
<text x="25" y="68" font-size="11" fill="currentColor">db=postgres</text>
<text x="25" y="88" font-size="11" fill="currentColor">features=...</text>
<text x="25" y="108" font-size="11" fill="currentColor">health-enabled=true</text>
<text x="25" y="128" font-size="11" fill="currentColor">metrics-enabled=true</text>
<text x="25" y="148" font-size="11" fill="currentColor">http-relative-path=/</text>
<text x="25" y="168" font-size="11" fill="currentColor">providers/*.jar</text>
<rect x="250" y="60" width="200" height="90" rx="8" fill="#8b5cf6" fill-opacity="0.2"/>
<text x="350" y="84" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">kc.sh build</text>
<text x="350" y="104" text-anchor="middle" font-size="11" fill="currentColor">augmentation: 12,4 s (lab)</text>
<text x="350" y="122" text-anchor="middle" font-size="11" fill="currentColor">closed world provider</text>
<text x="350" y="140" text-anchor="middle" font-size="11" fill="currentColor">lưu dạng plain text</text>
<rect x="490" y="20" width="200" height="170" rx="8" fill="#84cc16" fill-opacity="0.2"/>
<text x="590" y="42" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">Runtime option</text>
<text x="505" y="68" font-size="11" fill="currentColor">hostname=...</text>
<text x="505" y="88" font-size="11" fill="currentColor">db-url=jdbc:postgresql://</text>
<text x="505" y="108" font-size="11" fill="currentColor">db-password=...</text>
<text x="505" y="128" font-size="11" fill="currentColor">cache=ispn (từ 25.0.0)</text>
<text x="505" y="148" font-size="11" fill="currentColor">http-port=...</text>
<text x="505" y="168" font-size="11" fill="currentColor">đọc ở mỗi lần start</text>
<line x1="210" y1="105" x2="246" y2="105" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc6-a-arrow)"/>
<line x1="450" y1="105" x2="486" y2="105" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc6-a-arrow)"/>
<rect x="10" y="210" width="680" height="50" rx="8" fill="#ef4444" fill-opacity="0.15"/>
<text x="350" y="231" text-anchor="middle" font-size="11" fill="currentColor">start --optimized: bỏ qua build, tin rằng image đã build sẵn</text>
<text x="350" y="249" text-anchor="middle" font-size="11" fill="currentColor">build option truyền lúc start khác giá trị lúc build: lỗi, server không lên</text>
</svg>

Bản sai thứ hai hay gặp: "đổi `--cache` thì phải chạy lại `kc.sh build`". Từ 25.0.0, `cache`, `cache-stack`, `cache-config-file` đã thành runtime option.

| Thao tác | Phải build lại? | Vì sao |
|---|---|---|
| Đổi Postgres sang MySQL (`db`) | Có | Đổi driver và dialect được nạp |
| Đổi máy chủ Postgres (`db-url`) | Không | Cùng driver, khác địa chỉ |
| Thả JAR authenticator mới vào `providers/` | Có | Tập provider của closed world đổi |
| Đổi `hostname` | Không | Giá trị đọc lúc chạy |
| Bật `health-enabled` | Có | Thêm endpoint vào router |
| Chuyển `cache=local` sang `ispn` | Không (từ 25.0.0) | Đã thành runtime option |

Build option được lưu dạng văn bản thường cùng bản build: đặt mật khẩu vào đó là ghi mật khẩu vào image. Khi một option có mặt ở nhiều kênh, thứ tự thắng là dòng lệnh, biến môi trường, `keycloak.conf`, KeyStore.

> **Nguồn.** Quarkus: *"The default Keycloak distribution is now based on Quarkus."* (ghi chú phát hành 17.0.0); về bản cũ thì ở 20.0.0: *"With this release the WildFly distribution has been removed, and is no longer supported."* ([release notes](https://www.keycloak.org/docs/latest/release_notes/index.html#keycloak-17-0-0)). Cơ chế: *"Keycloak uses the Quarkus framework and a re-augmentation/mutable-jar approach under the covers."* và *"A new closed-world assumption about installed providers is created, meaning that no need exists to re-create the registry and initialize the factories at every Keycloak startup."* Build ngầm: *"By default, when you use the start or start-dev command, Keycloak runs a build command under the covers for convenience reasons."* Plain text: *"All build options are persisted in a plain text. Do not store any sensitive data as the build options."* Ưu tiên: *"When an option is set in more than one source, the one that comes first in the list determines the value for that option."* ([configuration](https://www.keycloak.org/server/configuration)). Cache từ 25: *"Options cache, cache-stack, and cache-config-file are no longer build options, and they can be specified only during runtime."* ([upgrading 25](https://www.keycloak.org/docs/latest/upgrading/index.html#migrating-to-25-0-0)). Phân loại từng option lấy theo icon công cụ trên trang All configuration 26.8.1.

> **Suy luận.** "Container mới từ image chưa build thì lần nào cũng augmentation" suy ra từ lab (augmentation chỉ có ở lần chạy trên thư mục mới unzip) cộng việc mỗi container khởi đầu từ filesystem của image. "Build option quyết định nạp code nào" là cách đọc của bài này, docs không phát biểu vậy; gặp option mới thì tra icon công cụ trên All configuration, đừng đoán.

---

## ⏸ Dừng lại — đoán trước #2

Image được build bằng:

```
RUN /opt/keycloak/bin/kc.sh build --db=postgres --health-enabled=true --metrics-enabled=true
```

Rồi chạy bốn kiểu khác nhau. Kiểu nào lên được?

```
(1) start --optimized --hostname=sso.example.com --db-url=jdbc:postgresql://db/kc
(2) start --optimized --metrics-enabled=false
(3) start --hostname=sso.example.com --metrics-enabled=false   (không --optimized)
(4) start --optimized --cache=local
```

---

### 3.3 `--optimized`, và vì sao `start-dev` không lên production được

`--optimized` bảo Keycloak tin rằng image đã được build sẵn, bỏ qua hẳn bước kiểm tra và build ngầm. Đổi lại, nếu một build option được truyền lúc start mà khác giá trị lúc build, Keycloak báo lỗi thay vì âm thầm build lại.

Áp vào hộp vừa rồi:

- **(1)** lên được (giả sử TLS đã cấu hình): `hostname` và `db-url` đều là runtime option.
- **(2)** không lên: `metrics-enabled` là build option, đang khác giá trị lúc build. Tiến trình thoát mã 2.
- **(3)** lên được, nhưng không có `--optimized` nên Keycloak tự build lại ngầm, và build lại **chỉ với các build option có trên dòng lệnh đó**. Trên lab, `health-enabled` và `db` không được truyền lại nên bị đưa về `<unset>`: server lên, nhưng không còn `/health`, readiness probe trỏ `/health/ready` fail mãi.
- **(4)** lên được, vì `cache` là runtime option. Nhưng các node thôi chia sẻ cache phân tán (mục 3.4).

> **Đo trên lab (critic, 26.8.1).** Build với `--db=dev-file --health-enabled=true --metrics-enabled=true`, chạy production mode với `--http-enabled=true --hostname=...`. Kiểu (2): `exit=2`, log đúng một dòng `The following build time options have values that differ from what is persisted - the new values will NOT be used until another build is run: kc.metrics-enabled`. Kiểu (4): ready sau 4,7 s. Kiểu (3) in `Changes detected in configuration. Updating the server image.` kèm diff `health-enabled=true > health-enabled=<unset>`, `db=dev-file > db=<unset>`, build lại 13 s, rồi lên mà không có dòng `Management interface listening`.

Kiểu (3) là lý do `--optimized` tồn tại. Không có nó, một biến môi trường lỡ tay đổi build option sẽ khiến container lặng lẽ build lại thành một Keycloak khác cái đã kiểm, như lab vừa mất `/health`. Có nó, cùng lỗi đó làm container chết ngay lúc start, nơi rollout dừng lại kịp.

Còn câu hỏi ban đầu: sao không dùng `start-dev` ở production cho xong? Vì mỗi khác biệt giữa hai chế độ là một mặc định chọn sự tiện cho máy dev, và mỗi cái thành một kiểu hỏng trên production:

| Khác biệt | `start-dev` | `start` | Mang dev lên prod thì hỏng gì |
|---|---|---|---|
| Transport | HTTP bật | HTTP tắt, đòi HTTPS | Mật khẩu, `code`, refresh token đi dạng rõ trên chặng không mã hoá |
| Hostname | Không bắt buộc | Bắt buộc `--hostname` hoặc `--hostname-strict false` | URL trong discovery và `iss` suy theo request, không theo một giá trị cố định |
| Cache | `local`, không cluster | `ispn`, cluster | Nhiều replica không chia sẻ authentication session, không gửi invalidation cho nhau |
| Database mặc định | `dev-file` | Phải chỉ định (mặc định `dev-file` đã deprecated) | Mỗi replica một DB, mất khi mất filesystem (mục 3.1) |
| Theme và template cache | Tắt | Bật | Trang login render lại template mỗi lần, không dùng bản đã cache |

Dòng hostname không hiển nhiên: URL công khai suy từ header `Host` thì kẻ gửi request chọn được URL Keycloak in vào discovery và link (hộp đo dưới). Reverse proxy và `proxy-headers` thuộc chương vận hành.

> **Nguồn.** *"The --optimized parameter tells Keycloak to assume a pre-built, already optimized Keycloak image is used."* và *"If that option has a different value than the value used when a build was entered, an error occurs."* Dev mode: *"Cache is set to local (No distributed cache mechanism used for high availability)"*, *"Theme-caching and template-caching is disabled"*. Production: *"HTTP is disabled as transport layer security (HTTPS) is essential"*, *"Production mode expects a hostname to be set up and an HTTPS/TLS setup to be available when started."* ([configuration](https://www.keycloak.org/server/configuration)). Hostname: *"By default, Keycloak mandates the configuration of the hostname option and does not dynamically resolve URLs."* ([hostname](https://www.keycloak.org/server/hostname)). Cache production: *"By default in production mode, a ispn cache is used to create a cluster between multiple server nodes."* ([all-config](https://www.keycloak.org/server/all-config)). Heap container: *"In containers, Keycloak allocates 70% of the memory limit for heap-based memory. It will also use approximately 300 MB of non-heap-based memory."* ([sizing](https://www.keycloak.org/high-availability/single-cluster/concepts-memory-and-cpu-sizing)).

> **Đo trên lab (critic, 26.8.1).** `start-dev`, `curl -H 'Host: evil.example' http://localhost:8780/realms/master/.well-known/openid-configuration` trả `"issuer": "http://evil.example/realms/master"` và `authorization_endpoint` cũng trên `evil.example`. Dòng hostname của bảng vì thế là hiện tượng đo được; cột "hỏng gì" của các dòng còn lại là suy luận của bài này (docs chỉ nói theme cache tắt, không nói chi phí).

Heap không thuộc bảng này: nó đi theo chỗ chạy, không theo chế độ. Ngoài container, `kc.sh` đặt `-Xmx512m` cho cả `start-dev` lẫn `start`; chỉ khi `KC_RUN_IN_CONTAINER=true` (image chính thức) nó mới dùng `-XX:MaxRAMPercentage=70`.

### 3.4 Dữ liệu nằm ở đâu: DB, cache local, cache phân tán

Khi đã có Postgres và `start`, câu hỏi kế tiếp quyết định cách vận hành: restart cả cụm thì mất gì?

Bản sai phổ biến: "user session chỉ nằm trong Infinispan, restart cả cluster là mọi người bị logout". Từ Keycloak 26, persistent user sessions bật mặc định: user session, client session, offline session nằm trong DB. Cache in-memory chỉ là bản sao để đọc nhanh: node giữ entry chết thì đọc lại từ DB. Chế độ volatile (session chỉ trong RAM) deprecated ở 26.8.

Không phải mọi thứ đều xuống DB. **Authentication session** (trạng thái của một lần login đang dang dở: user đã nhập password chưa, đang chờ OTP không) vẫn chỉ nằm trong cache phân tán, mặc định 2 owner để chịu được một node chết. Login failure của brute force detection từ 26.8 nằm trong DB mặc định.

Realm, user, key thì mỗi node giữ bản sao trong cache **local**, không chép sang node khác; admin sửa realm trên node A thì A ghi DB rồi báo các node khác bỏ bản sao cũ (cơ chế invalidation là bài 25).

<svg viewBox="0 0 700 330" role="img" aria-labelledby="kc6-b-t kc6-b-d" style="width:100%;height:auto">
<title id="kc6-b-t">Dữ liệu Keycloak nằm ở đâu trong một cụm hai node</title>
<desc id="kc6-b-d">Hai node Keycloak, mỗi node có cache local cho realm, user, key và cache phân tán cho session và authentication session; cache work gửi invalidation giữa hai node; database dùng chung giữ realm, client, user, credential, user session, client session, offline session và login failure; cổng management 9000 tách riêng khỏi cổng phục vụ người dùng.</desc>
<defs>
<marker id="kc6-b-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker>
</defs>
<rect x="10" y="10" width="260" height="170" rx="8" fill="#3b82f6" fill-opacity="0.2"/>
<text x="140" y="32" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">Node A</text>
<text x="22" y="56" font-size="11" fill="currentColor">Local: realms, users, authz</text>
<text x="22" y="72" font-size="11" fill="currentColor">  tối đa 10.000 entry mỗi loại</text>
<text x="22" y="92" font-size="11" fill="currentColor">Local: keys (1.000 entry, 1 giờ)</text>
<text x="22" y="114" font-size="11" fill="currentColor">Phân tán: sessions (1 owner,</text>
<text x="22" y="130" font-size="11" fill="currentColor">  bản sao của DB, 10.000/node)</text>
<text x="22" y="150" font-size="11" fill="currentColor">Phân tán: authenticationSessions</text>
<text x="22" y="166" font-size="11" fill="currentColor">  (2 owner, KHÔNG có trong DB)</text>
<rect x="430" y="10" width="260" height="170" rx="8" fill="#3b82f6" fill-opacity="0.2"/>
<text x="560" y="32" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">Node B</text>
<text x="442" y="56" font-size="11" fill="currentColor">Local: realms, users, authz</text>
<text x="442" y="72" font-size="11" fill="currentColor">  tối đa 10.000 entry mỗi loại</text>
<text x="442" y="92" font-size="11" fill="currentColor">Local: keys (1.000 entry, 1 giờ)</text>
<text x="442" y="114" font-size="11" fill="currentColor">Phân tán: sessions (1 owner,</text>
<text x="442" y="130" font-size="11" fill="currentColor">  bản sao của DB, 10.000/node)</text>
<text x="442" y="150" font-size="11" fill="currentColor">Phân tán: authenticationSessions</text>
<text x="442" y="166" font-size="11" fill="currentColor">  (2 owner, KHÔNG có trong DB)</text>
<line x1="272" y1="70" x2="426" y2="70" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-start="url(#kc6-b-arrow)" marker-end="url(#kc6-b-arrow)"/>
<text x="350" y="60" text-anchor="middle" font-size="11" fill="currentColor">cache work</text>
<text x="350" y="88" text-anchor="middle" font-size="11" fill="currentColor">invalidation</text>
<rect x="290" y="110" width="120" height="56" rx="8" fill="#64748b" fill-opacity="0.2"/>
<text x="350" y="132" text-anchor="middle" font-size="11" fill="currentColor">:9000 management</text>
<text x="350" y="150" text-anchor="middle" font-size="11" fill="currentColor">/health /metrics</text>
<rect x="110" y="230" width="480" height="90" rx="8" fill="#84cc16" fill-opacity="0.2"/>
<text x="350" y="252" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">Database (nguồn sự thật)</text>
<text x="350" y="274" text-anchor="middle" font-size="11" fill="currentColor">realm, client, role, user, credential</text>
<text x="350" y="292" text-anchor="middle" font-size="11" fill="currentColor">user/client session, offline session (persistent từ 26)</text>
<text x="350" y="310" text-anchor="middle" font-size="11" fill="currentColor">login failure (từ 26.8); danh sách node của jdbc-ping</text>
<line x1="140" y1="182" x2="250" y2="228" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc6-b-arrow)"/>
<line x1="560" y1="182" x2="450" y2="228" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc6-b-arrow)"/>
</svg>

Ghép lại thành câu trả lời cho "restart cả cụm thì mất gì":

| Dữ liệu | Nằm ở | Restart cả cụm (Postgres còn) |
|---|---|---|
| Realm, client, role, user, credential | DB, cache local là bản sao | Còn |
| User session, client session, offline session | DB, cache phân tán là bản sao | Còn |
| Login failure (brute force) | DB (từ 26.8) | Còn, user đang bị khoá vẫn bị khoá |
| Authentication session (login dang dở) | Chỉ cache phân tán | Mất: ai đang ở giữa màn login phải làm lại |
| Cache realm/user/key | RAM từng node | Mất, nạp lại từ DB khi cần |

Owners, cách các node tìm nhau (mặc định cũng qua chính DB), sticky session là phần của bài 25.

> **Nguồn.** *"In Keycloak 26, this feature is enabled by default. This means that all user sessions are persisted in the database by default."* ([release notes 26.0.0](https://www.keycloak.org/docs/latest/release_notes/index.html#keycloak-26-0-0)). Từ trang caching: *"User sessions, client sessions, offline user sessions, and offline client sessions are stored in the database."*, *"Volatile user sessions are deprecated since Keycloak 26.8 and will be removed in a future release."*, *"Login failure data for brute force detection is stored in the database by default."* ([caching](https://www.keycloak.org/server/caching)). Authentication session: *"All authentication sessions in distributed caches as per default, with two owners per entries, allowing one failing Pod without losing data."* ([multi-cluster sizing](https://www.keycloak.org/high-availability/multi-cluster/concepts-memory-and-cpu-sizing)).

> **Suy luận.** Cột "Restart cả cụm" suy ra từ việc dữ liệu có nằm trong DB hay không; dòng authentication session dựa trên việc nguồn không liệt kê nó trong danh sách lưu DB. Kiểm bằng: mở trang login, restart mọi node, rồi submit form.

### 3.5 Management port 9000

Từ Keycloak 25, `/health` và `/metrics` không còn chung cổng với login. Chúng nằm trên một interface riêng, mặc định cổng 9000, chỉ xuất hiện khi bật `health-enabled` / `metrics-enabled` (build option, quay lại mục 3.2). Lý do tách: endpoint này cho người ngoài biết số node, trạng thái DB, số event login. Docs nói thẳng: không proxy cổng 9000 ra ngoài.

Hệ quả cho load balancer: Keycloak mở cổng HTTP trong lúc còn đang khởi tạo. Lab production mode trên Postgres rỗng in `started in 2.192s` **trước** khi Liquibase tạo schema; ~4,6 s sau đó `/health/ready` vẫn trả DOWN, và node chỉ ready ở giây thứ 9. Health check phải trỏ `/health/ready` trên cổng 9000, không phải "cổng 8443 mở là xong". Từng endpoint health và metric là bài 28.

> **Nguồn.** *"Management endpoints such as /metrics and /health are exposed on the default management port 9000 when metrics and health are enabled."* ([management-interface](https://www.keycloak.org/server/management-interface)). *"You should not proxy port 9000 because health checks and metrics use that port directly, and you do not want to expose this information to external callers."* ([reverseproxy](https://www.keycloak.org/server/reverseproxy)). *"If you run Keycloak behind a proxy or load balancer, configure an HTTP health check with the path /health/ready to ensure traffic is routed only to instances that have completed initialization."* ([configuration-production](https://www.keycloak.org/server/configuration-production)).

---

## ⏸ Dừng lại — đoán trước #3

Dev ở triệu chứng mở đầu, sau khi sửa xong DB, muốn đỡ việc: "App của mình login bằng realm `master` luôn, đỡ tạo realm mới, admin với user chung một chỗ dễ quản". Hậu quả nào là *cơ chế*, không chỉ là "trái best practice"?

```
(a) Realm master không cho tạo client OIDC loại public
(b) Không chặn được /realms/master/ ở reverse proxy nữa, vì login của app đi qua đúng đường đó
(c) Token phát từ master không verify được bằng JWKS
(d) Realm master không bật được brute force detection
```

---

### 3.6 Master realm, và vì sao app không được ở đó

Đáp án là **(b)**, và nó kéo theo cả chuỗi.

Realm `master` có sẵn trên mọi server, và user bootstrap (`KC_BOOTSTRAP_ADMIN_USERNAME`) nằm ở đó. Docs định nghĩa vai trò của nó hẹp: chỉ để tạo và quản lý các realm khác. Hai cơ chế làm nó khác mọi realm còn lại:

1. User có role `admin` trong master là superuser của **mọi** realm trên server.
2. Mỗi realm khác có một client đại diện tên `<realm>-realm` nằm bên trong master.

Lab thấy điều này trong một admin event (mục 4, bước 6): token dùng để quản trị realm `demo` được phát ở realm `master`.

Giờ ghép với khuyến nghị vận hành: không expose `/realms/master/` ra internet. Trang login và token endpoint của superuser chỉ truy cập được từ mạng nội bộ, nên mật khẩu admin bị lộ cũng không dùng được từ ngoài. App login bằng master thì đường đó phải mở cho mọi khách hàng, và lớp chặn này mất. Mỗi chính sách nới cho user cuối (tự đăng ký, đăng nhập Google, password policy lỏng) cũng áp lên realm chứa superuser. Một lỗi gán role, ví dụ default role vô tình là composite có `admin`, biến khách hàng tự đăng ký thành quản trị toàn server; ở realm riêng, cùng lỗi đó chỉ chạm một realm.

> **Nguồn.** *"Use the master realm only to create and manage the realms in your system."* ([hướng dẫn quản trị, mục master realm](https://www.keycloak.org/docs/latest/server_admin/index.html#the-master-realm)); và ở cùng hướng dẫn: *"Avoid creating users in the master realm, which is only intended for creating other realms."* ([server_admin](https://www.keycloak.org/docs/latest/server_admin/index.html)). *"Users with the admin role are superusers and have full access to manage any realm on the server."* và *"The name of the client is <realm name>-realm."* ([master realm access control](https://www.keycloak.org/docs/latest/server_admin/index.html#_master_realm_access_control)). *"To do that, do not expose the path /realms/master/ to the public internet."* ([reverseproxy](https://www.keycloak.org/server/reverseproxy)).

> **Suy luận.** Kịch bản default role chứa `admin` là ví dụ của bài này, docs không mô tả. Nó ghép hai dữ kiện: `admin` của master là superuser mọi realm, và default role gán cho mọi user mới (bài 8). Realm riêng không xoá lỗi gán role, chỉ thu hẹp phạm vi của nó.

### 3.7 Đường dẫn: không còn `/auth`

URL trong lab có dạng `http://localhost:8080/realms/demo/...`, không có `/auth`. Bản Quarkus bỏ `/auth` khỏi context path mặc định; `http-relative-path` mặc định là `/`. Hướng dẫn và cấu hình cũ trỏ `/auth/realms/...` là trỏ vào một đường không còn tồn tại.

Hai cách sửa: sửa URL phía client (`issuer-uri` của Spring, cấu hình SPA), hoặc đặt `http-relative-path=/auth`. Cách sau đổi một **build option** (phải build lại image) và đổi `iss` của mọi token, nên mọi resource server đang so `iss` (bài 4) sẽ từ chối token mới cho tới khi được sửa theo.

> **Nguồn.** *"By default, the new Quarkus distribution removes /auth from the context-path."* ([migrating-to-quarkus](https://www.keycloak.org/migration/migrating-to-quarkus)). `http-relative-path`: *"Set the path relative to / for serving resources."*, mặc định `/` theo bảng All configuration ([all-config](https://www.keycloak.org/server/all-config)).

---

## 4. Lab

Keycloak 26.8.1 (Quarkus 3.40.1), `start-dev`, DB `dev-file`, OpenJDK 24.0.2, Mac mini Apple M4 10 core 16 GB RAM. Số khởi động và bộ nhớ dưới đây là của máy dev này, dùng như bậc độ lớn.

**Bước 1 — khởi động lần đầu trên thư mục vừa unzip.**

```bash
KC_BOOTSTRAP_ADMIN_USERNAME=admin KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
  bin/kc.sh start-dev --http-port=8080 --http-management-port=9000 --health-enabled=true --metrics-enabled=true
```

```
Updating the configuration and installing your custom providers, if any. Please wait.
... Quarkus augmentation completed in 12411ms
... KC-SERVICES0077: Created temporary admin user with username admin
Keycloak 26.8.1 on JVM (powered by Quarkus 3.40.1) started in 5.725s. Listening on: http://localhost:8080. Management interface listening on http://0.0.0.0:9000.
Profile dev activated.
```

Thấy gì: dòng đầu và dòng augmentation là build ngầm của mục 3.2. Con số `started in 5.725s` **không** gồm 12,4 giây build. Tổng thực tế khoảng 18 giây. Dòng `Created temporary admin user` là user bootstrap, và nó được tạo trong realm `master`.

Để ý: cổng chính nghe trên `localhost`, management interface nghe trên `0.0.0.0`, tức mọi interface. "Không proxy cổng 9000" là chưa đủ; firewall hoặc network policy cũng phải chặn nó.

**Bước 2 — khởi động lần hai, không đổi option.** Log chỉ còn `started in 3.580s`, không có dòng augmentation. Bấm giờ từ lúc gõ lệnh tới khi `/health/ready` trả UP: 3,9 giây.

**Bước 3 — JVM flags và bộ nhớ.** `ps` cho thấy `kc.sh` tự đặt trong dev mode:

```
-Xms64m -Xmx512m -XX:+UseG1GC -XX:MetaspaceSize=96M -XX:MaxMetaspaceSize=256m -XX:+ExitOnOutOfMemoryError
```

| Thời điểm | RSS |
|---|---|
| Ngay sau start lần 1 | 463 632 KB (~453 MiB) |
| Sau ~600 request benchmark | 526 640 KB (~514 MiB) |
| Idle 80 giây sau đó | 452 224 KB (~442 MiB) |
| Start lần 2, idle 30 s / 60 s | 494 528 / 495 088 KB (~483 MiB) |

Metrics `jvm_memory_used_bytes` lúc idle: Old Gen ~94 MB, Eden ~2 MB, Survivor ~3,7 MB, tức heap thật sự dùng ~100 MB. RSS gấp gần 5 lần con số đó; phần còn lại là metaspace, code cache, stack của 34 thread (`jvm_threads_live_threads` khi idle) và heap đã commit chưa dùng. Nhìn heap used để đoán bộ nhớ container là đoán thấp.

**Bước 4 — health ở cổng 9000.** `curl localhost:9000/health/ready`: ba check đều UP: "Graceful Shutdown", "Keycloak Initialized", "Keycloak database connections async health check".

**Bước 5 — dừng.** SIGTERM vào tiến trình java: `Keycloak stopped in 1.062s`.

**Bước 6 — master realm trong một admin event.** Sau khi bật admin events cho realm `demo` và đổi `firstName` của alice bằng `kcadm.sh` (đăng nhập `--realm master --user admin`):

```json
{"realmId":"bb8aceae-...",
 "authDetails":{"realmId":"e20c177d-... (master)","clientId":"fcefc2fe-... (admin-cli của master)","userId":"4c65d031-... (admin)"},
 "operationType":"UPDATE","resourceType":"USER","resourcePath":"users/df9c8cc1-..."}
```

Sự kiện thuộc realm `demo` (`realmId` ngoài cùng), nhưng người làm được định danh bằng realm master và `admin-cli` của master.

> **Đo trên lab.** Mọi số ở bước 1–5 là một lần chạy Keycloak 26.8.1 `start-dev`, OpenJDK 24.0.2, Mac mini Apple M4. Đo lại: `ps -o rss= -p $(lsof -tiTCP:8080 -sTCP:LISTEN)` và `curl -s localhost:9000/metrics | grep jvm_memory_used_bytes`.

**Bước 7 — production mode trên Postgres** (lab cụm 2 node, `kc.sh build --db=postgres ...` rồi `start --optimized`):

| Tình huống | `started in` | Ready (`/health/ready` 200, tính từ lúc gõ lệnh) |
|---|---|---|
| Node đầu, DB rỗng (tạo schema + realm master) | 2,192 s | 9 s |
| Node thứ hai join khi node đầu đang chạy | 2,053 s / 1,780 s | 3–4 s |

Schema sau khởi tạo có **101 bảng**; DB `keycloak` (master + một realm lab nhỏ) nặng 13 MB. Thay JAR trong `providers/` mà không build lại rồi `start --optimized`: tiến trình thoát mã 2 với một dòng `A provider JAR was updated since the last build, please rebuild for this to be fully utilized.`

> **Đo trên lab.** Bước 7 lấy từ lab cụm Keycloak 26.8.1 + Postgres trên cùng máy Mac mini M4, bậc độ lớn: `select count(*) from pg_tables where schemaname='public'` trả 101; `kc.sh build` mất 13,0–13,5 s.

---

## 5. Tính tay

**Bài 1 — rollout ba replica.** Image chưa build sẵn (như triệu chứng), Deployment 3 replica, rolling update từng pod một: pod mới phải ready thì pod cũ mới bị tắt. Dùng số lab làm bậc độ lớn.

- Mỗi pod mới: 12,4 s augmentation + 5,7 s start = 18,1 s.
- Ba pod tuần tự: 3 × 18,1 = 54,3 s cho riêng phần khởi động.
- Nếu image build sẵn và chạy `--optimized`, lấy mốc node join cụm đang chạy ở bước 7 (tối đa 4 s tới ready): 3 × 4 = 12 s.
- Chênh 54,3 − 12 = 42,3 s mỗi lần rollout, và readiness probe chờ 10 giây sẽ fail ở cả ba pod vì 18,1 > 10.

Giới hạn: 18,1 s đo ở `start-dev` với `dev-file`, 4 s đo ở production mode với Postgres; hai mốc khác chế độ, chỉ dùng như bậc độ lớn. Phần 12,4 s augmentation mới là thứ `--optimized` loại bỏ.

**Bài 2 — memory limit cho dev mode trong container.** Ai đó đặt `resources.limits.memory: 512Mi` vì "`-Xmx512m` mà".

- RSS đỉnh trên lab: 526 640 KB = 526 640 / 1024 = 514,3 MiB.
- 514,3 > 512: container vượt limit và bị kernel OOM kill, dù heap chỉ dùng ~100 MB và JVM chưa hề chạm `-Xmx`.

Nguyên nhân gốc: `-Xmx` giới hạn heap, memory limit giới hạn RSS của cả tiến trình. Image chính thức trong container tính ngược lại: heap là 70% memory limit, cộng ~300 MB non-heap. Sizing là bài 27.

**Bài 3 — option thắng và build lại.** `keycloak.conf` có `hostname=sso-old.example.com` và `metrics-enabled=true`. Manifest đặt `KC_HOSTNAME=sso.example.com`, `KC_METRICS_ENABLED=false`. Lệnh: `kc.sh start --optimized --hostname=login.example.com`. Image build với `metrics-enabled=true`.

- `hostname`: CLI thắng env thắng file, nên là `login.example.com`.
- `metrics-enabled`: không có trên CLI, env thắng file, nên là `false`. Khác giá trị lúc build (`true`), lại đang `--optimized`: lỗi, server không lên.
- Sửa: bỏ `KC_METRICS_ENABLED` khỏi manifest, hoặc build lại image với `false`. Đừng bỏ `--optimized` (mục 3.3).

---

## 6. Chuyển giao

1. Thêm một event listener SPI (JAR vào `providers/`) cho production đang chạy `start --optimized` từ image. Liệt kê các bước từ commit tới khi listener chạy, và bước nào bỏ qua thì JAR có trong image mà không được nạp.
2. Đồng nghiệp đề xuất bỏ Postgres, chạy `start --db=dev-file` trên một volume NFS dùng chung cho ba replica. Nêu ít nhất hai lý do từ nguồn trong bài khiến phương án này không đứng được.
3. Load balancer health check bằng TCP vào cổng 8443. Mỗi lần rollout, vài giây đầu một nhóm user nhận lỗi khi pod mới vào rotation. Giải thích, và viết lại health check.
4. Restart toàn bộ cụm lúc 2 giờ sáng (Postgres vẫn chạy). Sáng hôm sau một user phàn nàn: "đang nhập mã OTP thì trang báo lỗi, phải đăng nhập lại từ đầu". User khác thì không bị logout. Hai hiện tượng có mâu thuẫn không? Dữ liệu nào ở mục 3.4 giải thích từng cái?
5. Bạn kế thừa một cụm có ứng dụng nội bộ login ở realm `master`. Đề xuất thứ tự chuyển sang realm riêng, và chỉ ra claim nào trong token của app sẽ đổi giá trị, resource server nào phải sửa cấu hình cùng lúc.
6. Keycloak 25.0.0 chuyển `cache` sang runtime option, nhưng `db` vẫn là build option. Nếu là maintainer phải chuyển `db` sang runtime, điều gì trong closed world phải đổi, cái giá trả bằng thời gian khởi động hay bộ nhớ nằm ở đâu, và có giữ được lợi ích của `--optimized` (chết sớm khi image lệch) không?

---

## 7. Tóm tắt

- Quarkus từ 17.0.0, WildFly gỡ ở 20.0.0. CLI thắng `KC_*` thắng `keycloak.conf`.
- `kc.sh build` (augmentation) dựng closed world provider: lab 12,4 s, không nằm trong `started in`.
- Build option: `db`, `features`, `health-enabled`, `metrics-enabled`, `http-relative-path`, JAR trong `providers/`; lưu plain text, không đặt secret. Runtime: `hostname`, `db-url`, `db-password`, `http-port`, `cache` (từ 25.0.0).
- `start-dev`: HTTP bật, hostname tuỳ ý (lab: header `Host` đổi được `issuer`), cache `local`, theme cache tắt, DB `dev-file` (mỗi replica một file). `start`: HTTP tắt, đòi hostname và TLS, cache `ispn`.
- `start` không `--optimized` mà lệch build option thì build lại chỉ với option trên dòng lệnh (lab: mất `health-enabled`, `db`); có `--optimized` thì thoát mã 2.
- Từ Keycloak 26, user/client/offline session nằm trong DB, cache chỉ là bản sao. Authentication session chỉ ở cache phân tán, 2 owner: restart cả cụm thì login dang dở mất. Login failure ở DB từ 26.8.
- `/health`, `/metrics` ở cổng 9000, không proxy ra ngoài; LB check `/health/ready`, vì `started in` in ra trước khi ready (lab Postgres: 9 s trên DB rỗng 101 bảng, 3–4 s khi join).
- Lab dev mode: RSS ~442–514 MiB, heap dùng thật ~100 MB. Memory limit tính theo RSS, không theo `-Xmx`.
- `admin` của master là superuser mọi realm. App ở master thì không chặn được `/realms/master/` ở proxy.
- `http-relative-path` mặc định `/`; đặt lại `/auth` là đổi build option và đổi `iss` của mọi token.

→ **Bài 7 — Realm và client**: realm là ranh giới cách ly mà bài này dùng để tách app khỏi `master`; bài sau đi vào bên trong một realm, bắt đầu từ client public, confidential và luật khớp `redirect_uri`.
