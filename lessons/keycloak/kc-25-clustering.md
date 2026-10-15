# Bài 25 — Clustering: hai node Keycloak phải chia nhau những gì

## 1. Mục tiêu

Sau bài này bạn có thể:

- Với mỗi loại trạng thái hai node phải chia nhau, chỉ ra cache Infinispan nào gánh nó, bao nhiêu owner, giới hạn bao nhiêu entry.
- Đoán đúng kết quả khi login bắt đầu ở node này và submit ở node kia, khi một node bị `kill -9` giữa chừng, và khi cả cụm chết.
- Đọc bảng `jgroups_ping` và log JGroups để biết cụm đã thành hình chưa, ai là coordinator, dòng nào là xác node chết.
- Giải thích vì sao node ready sau 4 s ngày thường lại cần 43–53 s sau khi cả cụm bị SIGKILL, và vì sao SIGTERM thì không.
- Bắt hai lỗi cấu hình làm cụm hỏng âm thầm: mỗi node một `--hostname`, và hai môi trường chung database.
- Trình bày mâu thuẫn của docs về sticky session kèm lý do mỗi trang nói một kiểu.

---

## 2. Triệu chứng

Một SaaS B2B chạy Keycloak một node đã nửa năm. Cần HA, team dựng node thứ hai cùng Postgres, sau load balancer round-robin. Người dựng copy lệnh start cũ và sửa những gì "thuộc về node": cổng HTTP, cổng JGroups, và `--hostname` thành địa chỉ máy mới.

Login vẫn chạy, nhưng app mobile báo lỗi lác đác khi làm mới token:

```
POST http://localhost:8280/realms/lab/protocol/openid-connect/token  (grant_type=refresh_token)
{"error":"invalid_grant","error_description":"Invalid token issuer. Expected 'http://localhost:8280/realms/lab'"}  HTTP 400

WARN [org.keycloak.events] type="REFRESH_TOKEN_ERROR", ... error="invalid_token", reason="Invalid token issuer. ..."
```

Log cluster sạch: `ISPN000094: Received new cluster view ... (2)`, rebalance xong. Refresh token mới cấp vài giây trước.

> **Đo trên lab.** Keycloak 26.8.1 `start --optimized`, Postgres 16.13, OpenJDK 24.0.2, Mac mini Apple M4 10 core, hai node chung máy: node-a 8180, node-b 8280 với `--hostname=http://localhost:8280`. Login ở node-a, refresh ở node-b. Script: `~/projects/keycloak-lab/lab2/start-node.sh`, `refresh.sh`.

---

## ⏸ Dừng lại — đoán trước #1

Vì sao refresh qua node-b bị từ chối, trong khi cụm đã thành hình?

```
(a) User session được tạo ở node-a, node-b không có nên từ chối. Cần sticky session.
(b) Infinispan chưa replicate kịp session sang node-b. Đợi vài giây là được.
(c) Node-b tự tính issuer từ --hostname của chính nó, không khớp iss trong refresh token.
(d) Mỗi node tự sinh signing key riêng nên node-b không verify được chữ ký.
```

---

## 3. Lý thuyết

### 3.1 Đáp án: node phải trông giống hệt nhau từ bên ngoài

Đáp án là **(c)**. Refresh token mang `iss` là `http://localhost:8180/realms/lab` vì node-a cấp nó theo hostname của node-a. Node-b so `iss` với issuer nó tự tính từ `--hostname` của chính nó, và thông báo lỗi nói đúng điều đó.

Keycloak không tự suy URL từ request: ở chế độ `start`, hostname là cấu hình bắt buộc. Vì vậy hostname là cấu hình **của cụm**, không phải của node. Mọi node phải đặt cùng một giá trị, là URL công khai mà browser và app nhìn thấy (URL của load balancer). Chạy lại node-b với `--hostname=http://localhost:8180` thì cùng refresh token đó qua node-b trả **HTTP 200**.

Phương án (a) và (b) nghe giống "kiến thức cluster", nhưng log ghi `reason="Invalid token issuer"`, không phải "session not found", và sửa hostname xong thì refresh qua node-b được ngay. Phương án (d) sai vì key ký là dữ liệu realm trong database chung (bài 6).

Câu hỏi thật của bài bắt đầu từ đây: **node-b lấy session mà node-a vừa tạo từ đâu?**

> **Nguồn.** *"By default, Keycloak mandates the configuration of the hostname option and does not dynamically resolve URLs."* và ở `start` thì *"...either --hostname or --hostname-strict false must be explicitly configured."* ([hostname](https://www.keycloak.org/server/hostname)). Cấu hình hostname phía sau reverse proxy và trên Kubernetes thuộc bài 26.

### 3.2 Ba thứ buộc các node phải nói chuyện

Một node đơn lẻ giữ ba loại trạng thái trong RAM. Thêm node thứ hai thì mỗi loại vỡ theo một kiểu, nên được giải bằng một kiểu cache khác nhau.

**Loại 1: login dang dở.** Một lần "Sign in" là nhiều request: `GET /auth` trả form, `POST` form, có thể thêm form OTP, rồi redirect kèm `code` (bài 2, bài 18). Giữa các request, Keycloak phải nhớ lần login này đang ở bước nào. Trạng thái đó là **authentication session**, sống từ lúc mở form tới lúc phát `code`. Round-robin có thể gửi `GET` vào node-a và `POST` vào node-b.

**Loại 2: bản sao cấu hình.** Mỗi request token cần realm, client, user, key; đọc DB mỗi lần thì quá đắt, nên mỗi node giữ bản sao trong RAM. Bài toán là **làm bản sao hết hạn đúng lúc**: admin đổi `accessTokenLifespan` qua node-a, node-a ghi DB, node-b vẫn cầm bản cũ.

**Loại 3: user session đã đăng nhập**, thứ refresh token trỏ tới. Từ Keycloak 26 nó nằm trong database (mục 3.4).

Keycloak giải cả ba bằng **Infinispan**: thư viện cache Java chạy nhúng trong JVM của mỗi node, không phải server riêng. Các instance trao dữ liệu qua **JGroups**: thư viện quản lý thành viên nhóm (ai đang trong cụm) và kênh tin giữa các JVM. Bài 6 đã nói cái gì ở DB, cái gì ở cache; bài này đi vào cơ chế.

### 3.3 Ba kiểu cache, ba câu trả lời

**Cache local** giải loại 2. Mỗi node một bản riêng, không chép đi đâu: `realms`, `users`, `authorization` (mặc định tối đa 10.000 entry mỗi cache), `keys` (1.000 entry, hết hạn sau 1 giờ). Đọc luôn là đọc RAM của chính node.

Cái giá là bản sao có thể cũ, và Keycloak trả bằng **invalidation**: node-a ghi thay đổi xuống DB rồi phát thông điệp "bỏ entry X" qua cache **`work`**, loại **replicated** (mọi entry có mặt ở mọi node). Node-b nhận, xoá entry, lần đọc sau nạp từ DB. Thứ được truyền là lệnh xoá, không phải dữ liệu mới; dữ liệu mới luôn đi đường DB.

Lab đo chuỗi này. Node-b cấp token `expires_in=300`, tức realm `lab` đang trong cache local của nó. Đổi `accessTokenLifespan=120` qua node-a, lấy token ngay ở node-b: `expires_in=120`. Hai request lấy token xong trong 346 ms sau khi lệnh cập nhật trả về; không thấy cửa sổ nào node-b dùng giá trị cũ.

**Cache distributed** giải loại 1 và làm bản nóng cho loại 3. Mỗi entry chỉ nằm trên vài node gọi là **owner**, chọn bằng băm key. Node không phải owner muốn đọc thì hỏi owner qua mạng. Entry mất khi mọi owner của nó chết cùng lúc, tức khi số node chết từ `num_owners` trở lên và trùng đúng tập owner đó.

| Cache | Kiểu | Owner | Giới hạn | Mất entry thì sao |
|---|---|---|---|---|
| `realms`, `users`, `authorization` | local | (mỗi node một bản) | 10.000 entry | nạp lại từ DB |
| `keys` | local | (mỗi node một bản) | 1.000 entry, hết hạn 1 giờ | nạp lại từ DB |
| `work` | replicated | mọi node | không đặt được | chỉ chở lệnh invalidation |
| `authenticationSessions` | distributed | 2 | không đặt được | **mất thật**: login dang dở phải làm lại |
| `sessions`, `clientSessions`, `offlineSessions`, `offlineClientSessions` | distributed | 1 | 10.000 entry mỗi node | nạp lại từ DB |
| `actionTokens` | distributed | 2 | không đặt được | mất thật |

Hai con số owner có cùng một nguyên nhân gốc: **entry có bản gốc ở đâu khác không**. User session có bản gốc trong DB, nên một owner là đủ; owner chết thì đọc lại từ DB, không ai bị logout. Authentication session không có bản gốc nào ngoài cache, nên cần bản thứ hai để chịu một node chết. Bản sai "mọi distributed cache đều 2 owner" làm tính sai cả bộ nhớ lẫn mức chịu lỗi.

Bảng thiếu `loginFailures`, dù docs xếp nó vào distributed cache: từ 26.8 dữ liệu brute force mặc định nằm trong DB. Trên lab 26.8.1, metrics liệt kê 15 cache, không có `loginFailures`; log rebalance khi node thứ hai vào cụm chỉ chạy qua `actionTokens`, `authenticationSessions`, `clientSessions`, `offlineClientSessions`, `offlineSessions`, `sessions`, `work` (cộng `CONFIG` nội bộ), cả loạt khoảng 0,25 s.

> **Nguồn.** Trang caching: *"Local caches for realms, users, and authorization are configured to hold up to 10,000 entries per default."*, *"The local key cache can hold up to 1,000 entries per default and defaults to expire every one hour."*, *"The work cache is a replicated cache and used for sending these invalidation messages."*, *"Cache entries use a single owner per entry."*, *"In-memory caches are limited to 10000 entries per node by default"*, *"Login failure data for brute force detection is stored in the database by default."*, và không đặt được giới hạn cho actionToken, authenticationSessions, loginFailures, work ([caching](https://www.keycloak.org/server/caching)). Authentication session: *"All authentication sessions in distributed caches as per default, with two owners per entries, allowing one failing Pod without losing data."* ([sizing](https://www.keycloak.org/high-availability/multi-cluster/concepts-memory-and-cpu-sizing)). Mất nhiều node: *"...and actionTokens caches if the number of node failures is greater than or equal to the cache’s configured num_owners,..."* ([single-cluster concepts](https://www.keycloak.org/high-availability/single-cluster/concepts)).

> **Đo trên lab (chạy riêng cho bài này).** Keycloak 26.8.1 `start --optimized`, Postgres 16.13 riêng (`initdb`, cổng 5434), node-a cổng 3500 (management 4501, vì 4500 đang bị process khác giữ), node-b cổng 3600 (management 4600), cùng `--hostname=http://localhost:3500`, Mac mini M4. Danh sách cache lấy từ `vendor_statistics_number_of_entries` trên `:4600/metrics`. Thư mục: `~/projects/keycloak-lab/lab-kc25/`.

Metric đó ra số thật cho cache local (node-b: `realms` 42, `users` 2) nhưng `-1.0` cho mọi cache distributed và replicated, ở cả hai lab: không đọc được số session một node đang giữ từ đây.

Sơ đồ dưới ghép ba kiểu cache vào hai node và database; chỉ authentication session không có bản gốc dưới DB.

<svg viewBox="0 0 720 430" role="img" aria-labelledby="kc25-a-t kc25-a-d" style="width:100%;height:auto">
<title id="kc25-a-t">Cache nào nằm ở đâu trong cụm Keycloak hai node</title>
<desc id="kc25-a-d">Hai node Keycloak, mỗi node có cache local riêng cho realms, users, keys; cache work replicated chở lệnh invalidation giữa hai node; cache distributed authenticationSessions có mỗi entry ở cả hai node vì 2 owner, còn sessions mỗi entry chỉ ở một node vì 1 owner; hai node nối với nhau qua JGroups TCP có mTLS; database dùng chung giữ realm, user, user session, login failure và bảng jgroups_ping, nhưng không giữ authentication session.</desc>
<defs>
<marker id="kc25-a-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker>
</defs>
<rect x="15" y="15" width="300" height="250" rx="8" fill="#3b82f6" fill-opacity="0.10" stroke="currentColor" stroke-opacity="0.3"/>
<text x="165" y="35" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">node-a (JVM Keycloak + Infinispan)</text>
<rect x="405" y="15" width="300" height="250" rx="8" fill="#3b82f6" fill-opacity="0.10" stroke="currentColor" stroke-opacity="0.3"/>
<text x="555" y="35" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">node-b (JVM Keycloak + Infinispan)</text>
<rect x="30" y="48" width="270" height="52" rx="6" fill="#84cc16" fill-opacity="0.22"/>
<text x="40" y="66" font-size="11" fill="currentColor">local: realms, users, authorization</text>
<text x="40" y="82" font-size="11" fill="currentColor">local: keys (1.000, hết hạn 1 giờ)</text>
<text x="40" y="96" font-size="10" fill="currentColor" opacity="0.7">bản riêng của node-a</text>
<rect x="420" y="48" width="270" height="52" rx="6" fill="#84cc16" fill-opacity="0.22"/>
<text x="430" y="66" font-size="11" fill="currentColor">local: realms, users, authorization</text>
<text x="430" y="82" font-size="11" fill="currentColor">local: keys (1.000, hết hạn 1 giờ)</text>
<text x="430" y="96" font-size="10" fill="currentColor" opacity="0.7">bản riêng của node-b</text>
<rect x="30" y="108" width="270" height="30" rx="6" fill="#8b5cf6" fill-opacity="0.22"/>
<text x="40" y="127" font-size="11" fill="currentColor">work (replicated): lệnh invalidation</text>
<rect x="420" y="108" width="270" height="30" rx="6" fill="#8b5cf6" fill-opacity="0.22"/>
<text x="430" y="127" font-size="11" fill="currentColor">work (replicated): lệnh invalidation</text>
<rect x="30" y="146" width="270" height="48" rx="6" fill="#ef4444" fill-opacity="0.20"/>
<text x="40" y="164" font-size="11" fill="currentColor">authenticationSessions, 2 owner</text>
<text x="40" y="182" font-size="11" fill="currentColor">AS-1  AS-2  (đủ cả hai entry)</text>
<rect x="420" y="146" width="270" height="48" rx="6" fill="#ef4444" fill-opacity="0.20"/>
<text x="430" y="164" font-size="11" fill="currentColor">authenticationSessions, 2 owner</text>
<text x="430" y="182" font-size="11" fill="currentColor">AS-1  AS-2  (đủ cả hai entry)</text>
<rect x="30" y="202" width="270" height="48" rx="6" fill="#f59e0b" fill-opacity="0.22"/>
<text x="40" y="220" font-size="11" fill="currentColor">sessions, clientSessions, 1 owner</text>
<text x="40" y="238" font-size="11" fill="currentColor">S-1 (chỉ ở đây), tối đa 10.000</text>
<rect x="420" y="202" width="270" height="48" rx="6" fill="#f59e0b" fill-opacity="0.22"/>
<text x="430" y="220" font-size="11" fill="currentColor">sessions, clientSessions, 1 owner</text>
<text x="430" y="238" font-size="11" fill="currentColor">S-2 (chỉ ở đây), tối đa 10.000</text>
<line x1="315" y1="123" x2="405" y2="123" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-start="url(#kc25-a-arrow)" marker-end="url(#kc25-a-arrow)"/>
<line x1="315" y1="170" x2="405" y2="170" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-start="url(#kc25-a-arrow)" marker-end="url(#kc25-a-arrow)"/>
<text x="360" y="60" text-anchor="middle" font-size="10" fill="currentColor">JGroups</text>
<text x="360" y="74" text-anchor="middle" font-size="10" fill="currentColor">TCP 7800</text>
<text x="360" y="88" text-anchor="middle" font-size="10" fill="currentColor">mTLS tự sinh</text>
<text x="360" y="200" text-anchor="middle" font-size="10" fill="currentColor">S-1, S-2:</text>
<text x="360" y="214" text-anchor="middle" font-size="10" fill="currentColor">hỏi owner</text>
<text x="360" y="228" text-anchor="middle" font-size="10" fill="currentColor">qua mạng</text>
<rect x="90" y="320" width="540" height="95" rx="8" fill="#64748b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
<text x="360" y="340" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">Postgres dùng chung (bản gốc)</text>
<text x="105" y="360" font-size="11" fill="currentColor">realm, client, user, key: bản gốc của cache local</text>
<text x="105" y="376" font-size="11" fill="currentColor">offline_user_session: bản gốc của S-1, S-2 (offline_flag=0)</text>
<text x="105" y="392" font-size="11" fill="currentColor">login failure (brute force, mặc định từ 26.8)</text>
<text x="105" y="408" font-size="11" fill="currentColor">jgroups_ping: địa chỉ từng node, cluster_name=ISPN</text>
<line x1="165" y1="265" x2="165" y2="318" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc25-a-arrow)"/>
<line x1="555" y1="265" x2="555" y2="318" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc25-a-arrow)"/>
<text x="360" y="285" text-anchor="middle" font-size="11" fill="currentColor">authenticationSessions: KHÔNG có bản gốc trong DB</text>
<text x="360" y="301" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.7">(AS = authentication session, S = user session)</text>
</svg>

## ⏸ Dừng lại — đoán trước #2

Không bật sticky session. Một user mở trang login: `GET /auth` rơi vào node-a, Keycloak trả form và cookie `AUTH_SESSION_ID`. Trong lúc user gõ mật khẩu, node-a bị `kill -9`. Load balancer gửi `POST` form sang node-b. Chuyện gì xảy ra?

```
(a) 400 cookie_not_found: node-b không biết cookie do node-a phát
(b) Trang "Your login attempt timed out", phải login lại từ đầu
(c) Login thành công, redirect về app kèm code, đổi code lấy token ở node-b được
(d) Login thành công nhưng code chỉ đổi được ở node-a, mà node-a đã chết
```

Và nếu thay vì node-a, **cả hai node** cùng bị dừng rồi khởi động lại trong lúc user đang gõ?

---

### 3.4 Login dang dở và user session: hai kiểu sống sót khác nhau

Câu thứ nhất: đáp án **(c)**. Câu thứ hai: user nhận trang báo login hết hạn, tức kết quả của **(b)**.

Câu thứ nhất là hệ quả trực tiếp của 2 owner: với hai node, mỗi authentication session có bản ở cả hai. Lab: `GET /auth` ở node-a, `kill -9` node-a trong lúc script dừng 8 giây, `POST` form vào node-b, nhận `302` về `redirect_uri` kèm `code`, đổi code ở node-b được `200`. Không có node nào chết thì cũng vậy, theo cả hai chiều a→b và b→a.

Cookie cũng không gắn với node. Giải mã base64 `AUTH_SESSION_ID` ra `<id>.<chuỗi 20 ký tự>`, phần `<id>` trùng `session_state` của token cấp sau đó; tên node (dạng `Mac-mini-cua-DanTran-61321`) không có trong cookie.

Câu thứ hai là mặt trái của cùng cơ chế: không còn node nào giữ authentication session thì nó mất. Lab dừng cả hai node giữa lúc login rồi start lại. `POST` form nhận `302` về `/login-actions/authenticate`, trang đó in `Your login attempt timed out. Login will start from the beginning.`, log ghi `LOGIN_ERROR ... error="expired_code", restart_after_timeout="true"`. Keycloak dựng lại ngữ cảnh client và redirect nhờ cookie `KC_RESTART` browser còn giữ, nhưng user phải nhập lại mật khẩu. Dừng bằng `kill -9` hay SIGTERM đều ra kết quả này.

User session đi đường ngược lại. Từ Keycloak 26, **persistent user sessions** bật mặc định: session ghi xuống DB ngay khi login, cache `sessions` chỉ là bản nóng. Lab2 thấy dòng của session trong `offline_user_session` ngay sau password grant, `offline_flag=0` (session online; bảng chứa cả hai loại dù tên có chữ "offline").

Bản sai "session sống nhờ Infinispan replicate" bị phá bằng một phép thử. Lab2 `kill -9` node-a, refresh qua node-b: `200`. Rồi `kill -9` luôn node-b, không còn JVM nào, cache mất sạch. Start lại riêng node-b, refresh bằng refresh token cũ: `200`. Session sống vì nằm trong Postgres.

Chế độ cũ (session chỉ trong RAM, gọi là volatile) deprecated từ 26.8; chiều ngược lại, tắt hẳn cache session: `spi-user-sessions--infinispan--use-caches=false`. Grant `client_credentials` không tạo user session: 10.500 token mà `offline_user_session` chỉ từ 10 lên 12 dòng (lab2).

> **Nguồn.** *"In Keycloak 26, this feature is enabled by default."* ([release notes](https://www.keycloak.org/docs/latest/release_notes/index.html)). *"User sessions, client sessions, offline user sessions, and offline client sessions are stored in the database."*, *"Volatile user sessions are deprecated since Keycloak 26.8 and will be removed in a future release."*, *"spi-user-sessions--infinispan--use-caches=false"* ([caching](https://www.keycloak.org/server/caching)). Login dang dở mất khi tắt: *"Currently ongoing authentication flows are only stored in the internal caches that are cleared when Keycloak is shut down."* ([upgrading](https://www.keycloak.org/docs/latest/upgrading/index.html)).

> **Đo trên lab (chạy riêng cho bài này).** Cụm `lab-kc25`, client `web` (code flow, confidential). Script `~/projects/keycloak-lab/tmp-kc25-login.py <cổng GET> <cổng POST> [giây dừng]`. Output: `lab-kc25/kill-mid-login.txt`, `killall-mid-login.txt` (kill -9 cả cụm), `term-mid-login.txt` (SIGTERM cả cụm).

### 3.5 Các node tìm thấy nhau qua chính database

Bản sai thứ ba: "các node tự tìm nhau bằng UDP multicast, lên Kubernetes thì cấu hình DNS_PING". Ở 26.8.1 cả hai đã lùi về quá khứ.

**Discovery** là bước node mới biết ai đang trong cụm để xin gia nhập. Từ 26.1, stack mặc định là **`jdbc-ping`**: dữ liệu đi TCP, và mỗi node ghi địa chỉ của mình vào một bảng trong chính database Keycloak (giao thức JGroups `JDBC_PING2`). Node mới đọc bảng rồi gửi `JOIN` tới coordinator. Các stack `udp`, `jdbc-ping-udp`, `tcp`, `azure`, `ec2`, `google` deprecated ở 26.1; `kubernetes` deprecated ở 26.3, Operator chuyển sang `jdbc-ping`. `start-dev` không có cụm: nó ép `--cache=local`.

Lab2 không truyền `--cache` hay `--cache-stack`, log in đúng mặc định:

```
INFO  JGroupsConfigurator : JGroups JDBC_PING discovery enabled.
INFO  JGroupsConfigurator : JGroups Encryption enabled (mTLS).
INFO  ISPN000078: Starting JGroups channel `ISPN` with stack `jdbc-ping`
INFO  ISPN000094: Received new cluster view for channel ISPN: [Mac-mini-cua-DanTran-54699|1] (2) [...54699, ...45006]
```

Dòng `ISPN000094` xác nhận cụm đã thành hình; số trong ngoặc tròn là số thành viên.

Kênh giữa các node mặc định có **mTLS** mà không cần cấu hình: certificate RSA 2048 bit tự ký, TLS 1.3, hạn 60 ngày, xoay lúc chạy mỗi 30 ngày. Cổng dữ liệu mặc định 7800; cổng phát hiện node chết (`FD_SOCK2`) bằng cổng dữ liệu cộng 50.000, tức 57800 (lab đặt 7810 nên log in `FD_SOCK2 server listening on /127.0.0.1:57810`). Firewall phải mở cả hai.

`ISPN` là **tên cụm** mặc định, và cũng là giá trị cột `cluster_name` trong `jgroups_ping`. Từ đó ra một lỗi cấu hình docs cảnh báo bằng chữ: hai deployment dùng chung database (staging và production trỏ cùng Postgres "cho tiện") sẽ **gộp thành một cụm** nếu trùng tên, vì node bên này đọc thấy địa chỉ node bên kia trong cùng bảng; invalidation và authentication session của hai môi trường chảy lẫn sang nhau. Khác tên cũng chưa xong: 26.8 phát hiện cụm khác tên trên cùng database, và nếu chưa bật feature `stateless` thì mỗi node log lỗi và tự báo unhealthy.

> **Nguồn.** *"By default, caches use the jdbc-ping stack which is based upon a TCP transport and uses the configured database to track nodes joining the cluster."*, *"The default cluster name is ISPN."*, *"Because Keycloak uses the database for node discovery via jdbc-ping by default, clusters that share the same database but should remain separate will merge unless they have distinct cluster names."*, *"With TLS enabled, Keycloak auto-generates a self-signed RSA 2048 bit certificate to secure the connection and uses TLS 1.3 to secure the communication."*, *"By default, the certificate is valid for 60 days and is rotated at runtime every 30 days."*, *"By default, the offset is set to 50000, making the failure detection port 57800."* ([caching](https://www.keycloak.org/server/caching)). Mặc định từ 26.1: *"Starting with this version, the default changes to the jdbc-ping configuration which uses Keycloak’s database to discover other nodes."* ([release notes](https://www.keycloak.org/docs/latest/release_notes/index.html)). Deprecation: *"The udp, jdbc-ping-udp, tcp, azure, ec2 and google transport stacks have been deprecated."*, *"Consequently, the Keycloak Operator now uses the jdbc-ping cache stack by default."*, *"If this is detected and the stateless feature is not enabled, each node logs an error and reports itself as unhealthy via the health endpoint."* ([upgrading](https://www.keycloak.org/docs/latest/upgrading/index.html)).

> **Suy luận.** Docs không nói thẳng "đừng cho hai môi trường chung database"; nó suy ra từ hai câu trên, vì cả hai nhánh đều hỏng trừ khi bật `stateless` (multi-cluster, bài 29). Kiểm bằng: dựng cụm thứ hai cùng database với `cache-embedded-cluster-name` khác, xem `/health/ready` cả hai.

## ⏸ Dừng lại — đoán trước #3

Ngày thường, một node join vào cụm đang chạy mất 3–4 giây để `/health/ready` trả 200. Giờ cả hai node bị `kill -9` cùng lúc (mất điện cả rack, OOM killer, `docker kill`). Bạn khởi động lại một node. Bao lâu thì nó ready?

```
(a) 3-4 s như thường, vì DB còn nguyên
(b) Khoảng 9 s, như lần đầu chạy trên DB rỗng
(c) Vài chục giây
(d) Không bao giờ ready, phải xoá tay bảng jgroups_ping
```

---

### 3.6 Xác node chết trong `jgroups_ping`

Đáp án là **(c)**: lab2 đo 53 s, lab bài này 43 s. Nguyên nhân nằm ở danh bạ: SIGKILL không cho node rời cụm có thứ tự, nên dòng của nó ở lại `jgroups_ping`. Sau vài lần dừng/chạy trong lab này, bảng có 4 dòng mà chỉ 2 node còn sống:

```
Mac-mini-cua-DanTran-6749 |127.0.0.1:7840|t     <- node-b cũ, đã kill -9
Mac-mini-cua-DanTran-22793|127.0.0.1:7830|f     <- node-a cũ, đã kill -9
Mac-mini-cua-DanTran-61321|127.0.0.1:7830|t     <- node-a đang chạy
Mac-mini-cua-DanTran-45752|127.0.0.1:7840|f     <- node-b đang chạy
```

Node khởi động lại tin rằng cụm đang tồn tại, gửi `JOIN` tới coordinator ghi trong bảng, đợi 2 giây, thử lại:

```
WARN GMS: JOIN(...61321) sent to Mac-mini-cua-DanTran-6749 timed out (after 2000 ms), on try 1
... (try 2..9)
WARN GMS: ...61321: too many JOIN attempts (10): becoming singleton
INFO ISPN000094: Received new cluster view for channel ISPN: [...61321|0] (1) [...61321]
```

Từ lần timeout đầu tới lúc tự làm cụm một mình mất khoảng 16 s, cộng 2 s của lần JOIN đầu. Chưa hết: `Bootstrap completed` in lúc 19,4 s mà ready ở giây 43. Khoảng giữa, health check báo một thứ ít người đoán:

```
ERROR KEYCLOAK_JDBC_PING2: Split-brain detected for cluster 'ISPN'. This node (...61321) is in the
      losing partition and should not be serving requests. Possible causes: (1) ... (2) two separate
      Keycloak deployments share the same database but use the same cluster name ...
INFO  KEYCLOAK_JDBC_PING2: Cluster health restored for cluster 'ISPN'.
```

Node đã là cụm một thành viên, nhưng bảng còn dòng coordinator của "cụm kia", nên cluster health check coi nó là phe thua của một lần chia cụm và giữ `/health/ready` ở DOWN thêm 20,6 s (14:49:37,593 tới 14:49:58,148). Lab2 có đúng chuỗi này, DOWN 12,3 s (13:58:58,904 tới 13:59:11,228). Log cũng lộ tên option đặt tên cụm: `cache-embedded-cluster-name`.

Đối chứng bằng SIGTERM: dừng êm cả hai node (`Keycloak stopped in 1.094s`), `jgroups_ping` còn **0 dòng**, kể cả hai dòng xác cũ. Start lại một node: không có `JOIN ... timed out`, `Bootstrap completed in 1.050000 seconds`, ready sau 4 s.

Hệ quả vận hành: cách dừng cụm quyết định thời gian quay lại (4 s so với 43–53 s), và load balancer phải check `/health/ready` ở cổng management, vì suốt khoảng đó process đã nghe cổng HTTP mà vẫn tự nhận không nên phục vụ.

Khi cụm còn sống thì phát hiện node chết nhanh: lab2 `kill -9` node-a lúc 13:58:08, node-b nhận view một thành viên lúc 13:58:09,475. Hai node chung máy nên `FD_SOCK2` thấy socket đóng ngay; mất máy thật hay đứt mạng sẽ lâu hơn.

> **Đo trên lab.** Lab2 (mục C): sau SIGKILL cả cụm, `Bootstrap completed in 37.178000 seconds`, ready 53 s, dòng xác `Mac-mini-cua-DanTran-13847` vẫn còn sau khi cụm hồi phục. Lab bài này (`lab-kc25/node-a3.log`, `node-a4.log`): SIGKILL thì ready 43 s, 9 dòng `JOIN ... timed out`; SIGTERM thì ready 4 s, 0 dòng.

> **Đo trên lab (critic, 26.8.1).** Docs không nói; `javap -c` lớp `KEYCLOAK_JDBC_PING2` trong jar 26.8.1: health check chạy mỗi 10 s (`HEALTH_CHECK_INTERVAL_SECONDS = 10`), sắp các dòng coordinator trong `jgroups_ping` theo số thành viên, lấy dòng đầu so với coordinator của view hiện tại; dòng có `last_update` cũ hơn `staleness_timeout = 60000` ms bị xoá. Khớp log: từ `Split-brain detected` tới `restored` là 10,0 s ở lab2 và 20,0 s ở lab này, đúng 1 và 2 chu kỳ.

> **Suy luận.** Vậy khoảng DOWN phụ thuộc lúc dòng xác qua 60 s tuổi, làm tròn lên bội 10 s; chưa kiểm bằng cách ghi `select name, coord, last_update from jgroups_ping` mỗi giây lúc khởi động sau SIGKILL.

### 3.7 Sticky session: ba trang docs, ba câu trả lời

**Sticky session** (session affinity) là load balancer gửi mọi request của một browser về cùng một node. Hỏi "26.8.1 có cần sticky session không", docs trả lời ba kiểu:

| Trang docs | Nói gì | Đang trả lời câu hỏi nào |
|---|---|---|
| Caching guide | Deployment production nên cân nhắc session affinity | Hiệu năng đọc cache |
| Reverse proxy guide (sau tối ưu 26.6) | Chia tải đều, **không** dùng sticky session | Phân bổ tải giữa các node |
| Update compatibility guide | **Bật** sticky session trong lúc rolling update bản patch | Trải nghiệm UI khi cụm chạy lẫn hai version |

Thêm một dữ kiện kéo về phía "không": option gắn route vào cookie bị deprecated từ 26.8, và lab 26.8.1 in `WARN ... The option shouldAttachRoute is deprecated` ở mọi lần start node dù không ai đặt option đó.

Đừng chọn một dòng rồi coi là chân lý. Gốc của mâu thuẫn là ba trang trả lời ba câu hỏi khác nhau, và chỉ một câu là về **tính đúng**:

- Tính đúng không còn cần sticky: login dang dở có 2 owner, user session nằm trong DB, và lab `GET` ở node này `POST` ở node kia, kể cả khi node đầu đã chết, đều thành công.
- Hiệu năng là chỗ docs không thống nhất. Với 1 owner, request rơi vào node không phải owner phải hỏi owner qua mạng; affinity giảm số lần đó. Reverse proxy guide, viết lại sau tối ưu 26.6, ưu tiên chia tải đều.
- Rolling update có lý do riêng, không phải session: khi cụm lẫn node bản cũ và bản mới, user bị đẩy qua lại giữa hai version phải tải lại Account Console và Admin UI nhiều lần (bài 29).

> **Nguồn.** Caching: *"...However, production-ready deployments should always consider session affinity and favor redirecting users..."* ([caching](https://www.keycloak.org/server/caching)). Reverse proxy: *"The recommendation is to aim for an even distribution of load across Keycloak nodes instead of using sticky sessions."* và *"The options spi-sticky-session-encoder--infinispan--should-attach-route and spi-sticky-session-encoder--remote--should-attach-route are deprecated since Keycloak 26.8 and will be removed in a future release."* ([reverseproxy](https://www.keycloak.org/server/reverseproxy)). Update: *"Enable sticky sessions in your loadbalancer to avoid users bouncing between different versions of Keycloak as this could result in users needing to refresh their Account Console and Admin UI multiple times while the upgrade is progressing."* ([update-compatibility](https://www.keycloak.org/server/update-compatibility)).

> **Suy luận.** Gán mỗi trang cho một "câu hỏi" là cách đọc của bài này; docs không đặt ba khuyến nghị cạnh nhau, và nguồn không có số đo nào cho lợi ích hiệu năng của affinity ở 26.8.1. Hệ quả thực hành, bài 29 dùng cùng cách đọc: chia đều là mặc định, sticky là biện pháp tạm trong khoảng rolling bản vá. Kiểm bằng: cùng tải password login qua LB round-robin và LB sticky trên cụm 3 node, so p95 và `vendor_rpc_manager_average_replication_time`.

---

## 4. Lab

Dựng cụm 2 node + Postgres ở production mode rồi phá nó. Kết quả đã nằm ở mục 3; mục này là cách làm, theo cấu hình `lab-kc25` (lab2 giống hệt, khác cổng).

**Bước 1: hai node, một hostname.** Postgres tạo như lab2 (`create database` phải là một lệnh `psql -c` riêng, không chạy trong transaction block). Lệnh start, rút từ `start-node.sh`:

```bash
KC_BOOTSTRAP_ADMIN_USERNAME=admin KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
node-$N/bin/kc.sh start --optimized \
  --db-url=jdbc:postgresql://localhost:5434/keycloak --db-username=keycloak --db-password=keycloak \
  --hostname=http://localhost:3500 --http-enabled=true --http-port=$HTTP --http-management-port=$MGMT \
  --cache-embedded-network-bind-address=127.0.0.1 --cache-embedded-network-bind-port=$JG
```

Thấy gì: node-a ready sau 12 s (DB rỗng, tạo schema), node-b sau 5 s. Vì sao: hai node chỉ khác cổng HTTP, management và JGroups (`$JG` 7830/7840); `--hostname` giống nhau; không có `--cache-stack` nên chạy `jdbc-ping`.

**Bước 2: đọc danh bạ.** `\d jgroups_ping` cho các cột `address`, `name`, `cluster_name`, `ip`, `coord`, `last_update`, `coordinated_by`. Node mãi không ready thì đọc bảng này trước: bao nhiêu dòng, bao nhiêu node còn sống, ai `coord=t`.

**Bước 3: login chéo node.** Realm `lab`, user `alice`, client `web` có standard flow. Script nhận cổng `GET`, cổng `POST` và số giây dừng ở giữa; trong lúc dừng, bạn `kill -9` hoặc `pkill -TERM` node:

```
python3 tmp-kc25-login.py 3500 3600 8 & sleep 3; kill -9 <pid node-a>
GET auth @ 3500 -> 200
POST form @ 3600 -> 302 Location: http://localhost:9999/cb?state=s1&session_state=sy_b9PrAwRG_jI166YHtu8LY&iss=...
token @ 3600 -> 200 session_state= sy_b9PrAwRG_jI166YHtu8LY
```

Một bẫy khi tự viết script: dùng `http.cookiejar` của Python thì cookie không được gửi lại (bài 18 đã gặp: cookie có cờ `Secure` cả trên `http://localhost`), nên `POST` trả 400 và log ghi `error="cookie_not_found"`; script trong lab tự giữ header `Set-Cookie`. Gặp lỗi này khi test cụm, loại trừ nó trước khi nghi sticky session.

**Bước 4: invalidation.** `kcadm.sh update realms/lab -s accessTokenLifespan=120` qua node-a, rồi password grant ở node-b và đọc `expires_in`.

**Bước 5: giết cả cụm, hai cách.** Lần lượt `pkill -9 -f lab-kc25/node-` và `pkill -TERM -f lab-kc25/node-` trong lúc script đang dừng giữa `GET` và `POST`. Sau mỗi lần, đọc `jgroups_ping`, start lại node-a, đo giây tới khi `:4501/health/ready` trả 200, và đếm `JOIN ... timed out` trong log.

**Dọn dẹp.** `pkill -TERM` các node rồi `pg_ctl -D pgdata stop`. Dùng SIGTERM, để lần chạy sau không bắt đầu với xác trong `jgroups_ping`.

---

## 5. Tính tay

**Bài 1: ba node chết hai.** Cụm 3 node A, B, C, cache mặc định, đang có 900 login dang dở và 30.000 user session. A và B chết cùng lúc (chung một host vật lý). Mất gì?

Authentication session có 2 owner, nên tập owner là một trong ba cặp {A,B}, {A,C}, {B,C}. Nếu băm chia đều, 900 / 3 = **300 login dang dở mất cả hai bản**; 600 cái còn lại có bản trên C. User session 1 owner: khoảng 20.000 entry trên A và B rời cache, nhưng cả 30.000 vẫn trong DB, nên **không ai bị logout**, chỉ là lần refresh tới của họ đọc DB. User đang bị khoá brute force vẫn bị khoá. "2 owner chịu được 1 node chết" đúng như câu chữ, không hơn; hai node chung host là một node khi tính owner.

**Bài 2: cache 10.000 có đủ không.** 45.000 user session đang hoạt động, cụm 3 node, `sessions` 10.000 entry mỗi node, 1 owner.

Mỗi session chiếm chỗ trên đúng một node, nên sức chứa cả cụm là 3 × 10.000 = 30.000. Còn 45.000 − 30.000 = 15.000 session, tức **1/3**, không có chỗ trong cache tại một thời điểm và đi DB. Với 2 owner, cùng 30.000 slot chỉ chứa 15.000 session phân biệt: nhân đôi bản sao là chia đôi sức chứa, thêm một lý do để session dùng 1 owner. Node thứ tư nâng sức chứa lên 40.000 mà không đổi option nào.

> **Suy luận.** "Một phần ba" ở bài 1 và phép cộng sức chứa ở bài 2 dựa trên giả định băm chia đều và trên hai câu có nguồn: giới hạn tính *per node*, mỗi entry *single owner*. Docs không nêu cách Infinispan chọn owner và không viết các phép tính này. Cái giá bộ nhớ khi nâng `--cache-embedded-sessions-max-count` thuộc bài 27.

**Bài 3: cửa sổ gián đoạn sau mất điện.** Cụm 2 node, load balancer check `/health/ready` mỗi 5 s, cần 2 lần OK liên tiếp mới đưa node vào rotation. Mất điện, cả hai node chết cứng; điện về, node-a start lúc 10:00:00. Lấy số lab2: ready 53 s.

Ready 10:00:53, check OK lần đầu khoảng 10:00:55, lần hai 10:01:00: user đầu tiên vào được khoảng **10:01:00**. Cùng phép tính với lần restart bảo trì có SIGTERM (ready 4 s) cho ra khoảng 10:00:10; chênh gần một phút, gần như toàn bộ do xác trong `jgroups_ping`. Mọi người đang giữa màn login lúc mất điện phải login lại; ai đã login xong thì refresh vẫn được, nếu Postgres còn nguyên.

---

## 6. Chuyển giao

1. Hai VM, firewall chỉ mở cổng 7800 giữa chúng. `ISPN000094` báo 2 thành viên, nhưng khi một VM mất mạng, VM kia rất lâu mới nhận view mới. Cổng nào thiếu, và vì sao thiếu nó cụm vẫn thành hình?
2. Staging và production chung một Postgres server nhưng hai database khác nhau. Có gộp cụm không? Đọc bảng nào ở đâu để trả lời thay vì đoán?
3. Admin đổi cấu hình realm đúng lúc một node bị GC pause 5 giây. Node đó có cửa sổ nào dùng cấu hình cũ không? Dữ kiện nào trong bài giúp trả lời, dữ kiện nào bài không có?
4. Security yêu cầu xoá mọi user session của một tài khoản bị chiếm. Với session 1 owner và bản gốc ở DB, "xoá" phải chạm tới những chỗ nào để không node nào phục vụ tiếp refresh token của user đó?
5. Đề xuất: "Để chịu được 2 node chết, tăng owner của `sessions` lên 3." Dựa vào bài 2 phần Tính tay, phản biện đề xuất này bằng con số, và chỉ ra cache nào mới là thứ đáng tăng owner nếu mục tiêu là không mất login dang dở.
6. Cụm 3 node, một node bị treo (process sống, socket mở, không xử lý gì) chứ không chết, nên `FD_SOCK2` không thấy socket đóng. Login của user có authentication session mà node treo là một trong hai owner sẽ ra sao? Cơ chế nào có khả năng loại node đó khỏi view, và việc đó tương tác thế nào với cluster health check split-brain ở mục 3.6?

---

## 7. Tóm tắt

- Hostname là cấu hình của cụm: mọi node cùng `--hostname` công khai, khác nhau thì refresh chéo node ra `Invalid token issuer` (lab2).
- Cache local `realms`/`users`/`authorization` 10.000 entry, `keys` 1.000 entry hết hạn 1 giờ; `work` replicated chỉ chở lệnh xoá. Lab: đổi lifespan ở node-a, request kế tiếp ở node-b đã theo giá trị mới.
- `authenticationSessions` 2 owner vì không có bản gốc trong DB; `sessions`/`clientSessions` 1 owner, 10.000 entry mỗi node, vì bản gốc ở DB.
- Lab: GET node-a, POST node-b, kể cả khi node-a đã `kill -9`, vẫn `302` kèm code. Dừng cả cụm (SIGKILL hay SIGTERM) thì login dang dở mất, `error="expired_code"`.
- Persistent user sessions mặc định từ 26, volatile deprecated 26.8; session vào `offline_user_session` (`offline_flag=0`) ngay lúc login, SIGKILL cả cụm vẫn refresh 200 (lab2).
- Discovery mặc định `jdbc-ping` (bảng `jgroups_ping`) từ 26.1, `kubernetes` deprecated 26.3; mTLS tự sinh; cổng 7800 và 57800.
- Tên cụm mặc định `ISPN`: chung database mà trùng tên thì gộp cụm, khác tên mà không bật `stateless` thì node tự báo unhealthy.
- SIGKILL cả cụm để lại xác trong `jgroups_ping`: 10 lần JOIN × 2 s, split-brain giữ health DOWN thêm 12,3–20,6 s, ready 53 s (lab2) và 43 s (lab này). SIGTERM dọn bảng, ready 4 s.
- Sticky session: caching guide khuyên cân nhắc, reverse proxy guide khuyên không, update guide khuyên bật khi rolling patch. Tính đúng không cần sticky.

→ **Bài 26 — Keycloak Operator**: mọi thứ bài này cấu hình bằng tay (hostname chung, cổng JGroups, tên máy, cách dừng node) là thứ Operator làm thay trên Kubernetes; bài sau xem nó làm gì, và chừa lại gì cho bạn, như database.
