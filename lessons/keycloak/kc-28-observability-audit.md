# Bài 28 — Observability và audit

## 1. Mục tiêu

Sau bài này bạn có thể:

- Bật health và metrics đúng chỗ (build hay start, cổng nào), và giải thích vì sao `start --optimized --metrics-enabled=true` thoát mã 2 dù ví dụ trên docs chạy được.
- Đọc `/health/ready` và nói nó đang kiểm gì; dự đoán `ready`, `live` và token endpoint trả mã nào khi database chết.
- Viết đúng truy vấn đếm login thất bại trên `keycloak_user_events_total`, và giải thích vì sao metric, event lưu trong DB và log cho ra ba con số khác nhau cho cùng một đêm.
- Bật login event và admin event, chọn `eventsExpiration`, và tính bảng `event_entity` lớn bao nhiêu mỗi ngày từ kích thước dòng đo thật.
- Liệt kê những lần đăng nhập thất bại mà Keycloak không ghi thành event, để biết audit trail của mình thủng ở đâu.
- Dựng bảng báo động tín hiệu → ngưỡng → lý do, và tách rõ ngưỡng nào có nguồn, ngưỡng nào là đề xuất.

---

## 2. Triệu chứng

Một SaaS B2B vừa trải qua một đêm bị dò mật khẩu. Sáng ra, đội bảo mật hỏi một câu đơn giản: đêm qua có bao nhiêu lần đăng nhập thất bại?

Ba người trả lời bằng ba công cụ:

- SRE mở Grafana, panel "Login lỗi" chạy `sum(increase(keycloak_user_events_total{event="login_error"}[12h]))`: **No data**. Panel dựng từ tháng trước, chưa từng báo gì.
- Dev gọi Admin API `GET /admin/realms/<realm>/events`: **25** event `LOGIN_ERROR`, cạnh **50** event `LOGIN`.
- Người thứ ba thấy dòng WARN `Full scope allowed` hiện mỗi lần cấp token, bèn đếm nó làm "số login": **75**.

Ba con số 0, 25 và 75 cho cùng một đêm, cùng một realm. Không cái nào sai về kỹ thuật, nhưng chỉ một con số trả lời đúng câu hỏi.

> **Đo trên lab (chạy riêng cho bài này).** Keycloak 26.8.1 bản zip, `start-dev` (H2 `dev-file`) cổng 3900, management 4900, OpenJDK 24.0.2, Mac mini Apple M4. Realm `kc28` bật lưu event. Gửi 50 password grant đúng, 20 sai mật khẩu, 5 username không tồn tại. `/metrics` không có dòng nào mang `event="login_error"`. Admin API trả 75 event: 50 `LOGIN`, 25 `LOGIN_ERROR`. Log có 75 dòng `Full scope allowed` cho client `cli`. Thư mục: `~/projects/keycloak-lab/lab-kc28/`, tóm tắt ở `RESULTS.txt`.

---

## ⏸ Dừng lại — đoán trước #1

Vì sao panel Grafana ra "No data"?

```
(a) Event metrics chưa bật: --event-metrics-user-enabled là build option, image thiếu nó
(b) LOGIN_ERROR không có giá trị event riêng; nó nằm trong event="login" kèm nhãn error
(c) Metric chỉ đếm khi realm bật lưu event (eventsEnabled), mà realm chưa bật
(d) Counter bị reset khi pod restart lúc 3 giờ sáng
```

---

## 3. Lý thuyết

### 3.1 Cổng management: health và metrics không nằm ở cổng bạn nghĩ

Health và metrics không ở cổng HTTP chính mà ở **management interface**, một listener HTTP riêng, mặc định cổng 9000. Trên lab (đổi sang 4900), `/health` và `/metrics` ở cổng chính 3900 đều trả **404**, cổng 4900 trả 200; lab 2 thấy y hệt với 8180/9180.

Tách cổng để load balancer và Prometheus gọi thẳng vào node mà internet không thấy, nên cổng 9000 **không được đưa qua reverse proxy**. Health check trỏ vào `https://sso.example.com/health/ready` nhận 404 mãi và đánh mọi node là chết. Trong container còn một bẫy: image đã gỡ `curl`, nên `HEALTHCHECK curl ...` không chạy; dùng probe HTTP của Kubernetes (Operator sinh sẵn, bài 26).

> **Nguồn.** *"Management endpoints such as /metrics and /health are exposed on the default management port 9000 when metrics and health are enabled."* ([management-interface](https://www.keycloak.org/server/management-interface)). *"You should not proxy port 9000 because health checks and metrics use that port directly, and you do not want to expose this information to external callers."* ([reverseproxy](https://www.keycloak.org/server/reverseproxy)). *"Due to security measures that remove curl and other packages from the Keycloak container image, you are not able to run checks against HTTPS endpoints from within the container."* ([health](https://www.keycloak.org/observability/health)).

### 3.2 Bật lên: build option, và mâu thuẫn trên docs

`health-enabled` và `metrics-enabled` là **build option**, chốt lúc `kc.sh build` như `db` hay `features` (bài 6, bài 26). Trang metrics gọi nó là build option nhưng ví dụ ngay dưới lại chạy `start --metrics-enabled=true`. Người đọc kết luận "chắc là runtime option" rồi thêm nó vào `start --optimized` của production.

Lab cho thấy cả hai câu trên docs đều đúng, ở hai chế độ khác nhau:

```
$ kc.sh build                     # không bật gì
$ kc.sh start --optimized ... --metrics-enabled=true
The following build time options have values that differ from what is persisted - the new values will NOT be used until another build is run: kc.metrics-enabled
exit 2
```

`start` không `--optimized` tự build ngầm trước khi khởi động, nên ví dụ của docs chạy được, chỉ tốn thêm khoảng 13 s mỗi lần (lab 2: 13,03–13,53 s). `--optimized` tắt bước đó, nên build option khác giá trị đã chốt là thoát mã 2; `health-enabled` cũng vậy.

`--event-metrics-user-enabled` có thêm một điều kiện. Trên bản build chưa bật metrics, `start --optimized --event-metrics-user-enabled=true` không báo "build time option" mà báo:

```
Disabled option: '--event-metrics-user-enabled'. Available only when metrics are enabled and feature user-event-metrics is enabled
```

Feature đó không cần bật tay: `serverinfo` 26.8.1 ghi `USER_EVENT_METRICS`, `type: DEFAULT`, `enabled: true`, nên `--features=user-event-metrics` của lab 2 là thừa. Bộ tối thiểu cho production là `kc.sh build --health-enabled=true --metrics-enabled=true --event-metrics-user-enabled=true` (cộng `--db` và các build option khác), rồi `start --optimized`.

> **Nguồn.** *"It is possible to enable the health checks using the build time option health-enabled:"* ([health](https://www.keycloak.org/observability/health)). Ví dụ event metrics: *"...start --metrics-enabled=true --event-metrics-user-enabled=true..."* ([event-metrics](https://www.keycloak.org/observability/event-metrics)). Build ngầm: *"By default, when you use the start or start-dev command, Keycloak runs a build command under the covers for convenience reasons."* ([configuration](https://www.keycloak.org/server/configuration)).

> **Đo trên lab (chạy riêng cho bài này).** `kc.sh build` không option (`real 13,715 s`), rồi `start --optimized` kèm từng option: `metrics-enabled`, `health-enabled` thoát mã 2, `event-metrics-user-enabled` in "Disabled option". `start-dev` với cả ba thì lên.

### 3.3 Bốn endpoint health, và `ready` thật sự kiểm gì

Có bốn endpoint: `/health/started`, `/health/live`, `/health/ready`, và `/health` gộp cả ba; 200 khi UP, 503 khi DOWN, kèm JSON từng check. Chúng khác nhau ở **hành động khi fail**: `live` fail thì giết và khởi động lại; `ready` fail thì load balancer rút node khỏi vòng, không ai restart; `started` dành cho giai đoạn khởi động (probe Operator sinh cho nó: period 1 s, failureThreshold 600, bài 26).

Giờ đọc nội dung thật. Trên lab `start-dev`:

```json
/health/ready   {"status":"UP","checks":[{"name":"Graceful Shutdown","status":"UP"},
                 {"name":"Keycloak database connections async health check","status":"UP"},
                 {"name":"Keycloak Initialized","status":"UP"}]}
/health/live    {"status":"UP","checks":[]}
/health/started {"status":"UP","checks":[]}
```

`live` có **danh sách check rỗng**: nó chỉ chứng minh management interface còn trả lời. Đó là cố ý, docs nói liveness non-blocking để pod không bị restart lúc tải cao. Phụ thuộc bên ngoài, gồm database, nằm ở `ready`.

Check database của `ready` thuộc nhóm cần bật metrics (cột "Requires Metrics" trên docs): bật health mà quên metrics thì `ready` không kiểm database. Check thứ tư, `Keycloak cluster health check`, chỉ có khi chạy cụm với `jdbc-ping`: lab 2 (2 node) thấy nó, lab này (cache local) không. Bài 25 đã thấy nó giữ `ready` ở DOWN thêm 20,6 s sau SIGKILL cả cụm.

> **Nguồn.** *"/health/live - Check if Keycloak is running. If this fails the application should be discarded (terminated, shutdown) and started again."*, *"These endpoints respond with HTTP status 200 OK on success or 503 Service Unavailable on failure, and a JSON object like the following:"*, *"For some checks, you’ll need to also enable metrics as indicated by the Requires Metrics column."*, *"The cluster health check is only available for clustered setups when the cache transport stacks jdbc-ping or jdbc-ping-udp are used."* ([health](https://www.keycloak.org/observability/health)). *"Keycloak’s liveness probe is non-blocking to avoid a restart of a Pod under a high load."* ([concepts-threads](https://www.keycloak.org/high-availability/single-cluster/concepts-threads)). Load balancer: *"If you run Keycloak behind a proxy or load balancer, configure an HTTP health check with the path /health/ready to ensure traffic is routed only to instances that have completed initialization."* ([configuration-production](https://www.keycloak.org/server/configuration-production)).

---

## ⏸ Dừng lại — đoán trước #2

Keycloak chạy với Postgres, đã bật health và metrics. Bạn `pg_ctl stop` database. Trong 60 giây sau đó, ba URL trả gì?

```
(a) ready 200, live 200, token 200: Keycloak có cache realm/user nên vẫn cấp token được
(b) ready 503, live 503, token 500: process coi như hỏng
(c) ready 503, live 200, token 500: node bị rút khỏi load balancer nhưng không bị restart
(d) ready 200 suốt 30 s đầu (timeout pool), rồi mới 503
```

---

### 3.4 Database chết: `ready` phản ứng thế nào, và event im lặng

Đáp án là **(c)**, và nhanh hơn nhiều người nghĩ.

Lab dừng Postgres lúc 15:15:35. Ngay giây đó `/health/ready` trả 503: `"Keycloak database connections async health check","status":"DOWN","data":{"Failing since":"2026-10-15 15:15:35,315"}`. 12 lượt gọi trong 65 s sau đều giống nhau: `ready` 503, `live` 200, token endpoint 500 sau khoảng 1,02 s, log `ModelException: Database operation failed`. Bật lại Postgres lúc 15:16:55: `ready` về 200 dưới 1 giây, login 200 ngay.

(a) sai vì login phải ghi user session xuống DB (persistent session, bài 25); cache realm không cứu được. (d) sai theo số đo: 503 ngay trong giây DB tắt.

Với audit, điều đáng giá hơn: **12 request 500 đó không sinh event nào.** Log không có dòng `org.keycloak.events` nào trong khoảng 15:15:35–15:16:55, `keycloak_user_events_total` không tăng. Dấu vết duy nhất là `http_server_requests_seconds_count{...,outcome="SERVER_ERROR",status="500",uri="/realms/{realm}/protocol/{protocol}/token"} 12.0`. Báo động dựng trên event metrics không thấy sự cố database; phải có báo động riêng cho 5xx.

> **Đo trên lab (chạy riêng cho bài này).** Postgres 16 riêng (`initdb`, cổng 5439), Keycloak `start-dev --db=postgres`, cùng cổng 3900/4900. Mỗi 6 s gọi `ready`, `live`, và một password grant: 12/12 lượt `ready=503 live=200 login=500`, `ready` trả lời trong khoảng 1,01 s. Đếm cuối lab: `status="503",uri="/health/ready"` 25 lần.

> **Chưa đo.** Database chậm thay vì chết, hoặc pool cạn mà DB vẫn sống: check async có chuyển `ready` sang DOWN không, docs không nói, lab chưa thử. Đo bằng: trigger `pg_sleep(2)` trên một bảng Keycloak ghi khi login, theo dõi `/health/ready` mỗi giây.

### 3.5 Metrics: chọn đúng vài chục dòng trong hơn một nghìn

Lab `start-dev` có 1265 dòng, 145 `# HELP`; lab 2 (cụm 2 node) có 1774 dòng, 265 metric, phần lớn `vendor_*` của Infinispan/JGroups. Những nhóm cần nhìn:

| Nhóm | Metric ví dụ | Trả lời câu hỏi gì |
|---|---|---|
| HTTP | `http_server_requests_seconds_count{uri=..., status=...}` | Endpoint nào lỗi, chậm bao nhiêu. `uri` đã template hoá (`/realms/{realm}/...`) nên không nổ nhãn theo realm |
| Hash mật khẩu | `keycloak_credentials_password_hashing_validations_total{outcome=...}` | Số lần băm thật, nguyên liệu cho sizing ở bài 27 |
| Event | `keycloak_user_events_total{event, error, realm}` | Login thành công/thất bại theo lý do |
| Pool DB | `agroal_active_count`, `agroal_awaiting_count`, `agroal_max_used_count` | Pool có cạn không |
| Cụm | `vendor_cluster_size` | Số node đang thấy nhau (bài 25) |
| Hàng đợi | `worker_pool_queue_size` | Request đang xếp hàng |

Giờ là đáp án hộp #1: **(b)**. Đây là toàn bộ `keycloak_user_events_total` sau 50 login đúng, 20 sai mật khẩu, 5 user lạ:

```
keycloak_user_events_total{error="",event="login",realm="kc28"} 50.0
keycloak_user_events_total{error="invalid_user_credentials",event="login",realm="kc28"} 20.0
keycloak_user_events_total{error="user_not_found",event="login",realm="kc28"} 5.0
keycloak_user_events_total{error="",event="login",realm="master"} 1.0
```

Không có `event="login_error"`. Lỗi là cùng `event="login"` cộng nhãn `error` khác rỗng. Truy vấn đúng là `sum(increase(keycloak_user_events_total{event="login",error!=""}[12h]))`, và nó cho **25**, khớp Admin API.

Thiếu build option (a) thì mất cả `event="login"`, không riêng phần lỗi. (c) sai cơ chế: dòng `realm="master"` đến từ lần `kcadm` đăng nhập vào `master`, realm **không** bật lưu event. (d) có thật nhưng `increase()` xử lý reset, không biến số thành "No data".

Không có nhãn `client_id` vì mặc định chỉ bật tag `realm` (lab 2 thêm `--event-metrics-user-tags=realm,clientId` mới thấy `client_id="lab-cli"`). Câu docs "only realm is enabled" nói về tag **tuỳ chọn** (`event-metrics-user-tags` chỉ nhận `realm`, `idp`, `clientId`). `event` và `error` không tuỳ chọn: bytecode `MicrometerUserEventMetricsEventListenerProvider.countEvent()` gắn hai tag này trước mọi phép kiểm `withRealm`/`withIdp`/`withClientId`, nên trần 10.000 giá trị của `error` luôn có hiệu lực. Và 5 lần `user_not_found` không làm tăng metric băm (vẫn 50 valid, 20 invalid): không có user thì không có gì để so.

> **Nguồn.** *"Keycloak exposes metrics at the following endpoint on the management interface at:"* ([configuration-metrics](https://www.keycloak.org/observability/configuration-metrics)). *"By default only realm is enabled to avoid a high metrics cardinality."*, *"The counters are reset on the restart of the instance."* ([event-metrics](https://www.keycloak.org/observability/event-metrics)). *"The metric vendor_cluster_size shows the current number of instances in the cluster."* ([caching](https://www.keycloak.org/server/caching)).

### 3.6 Một event, ba đường đi độc lập

Ba con số ở mục 2 khác nhau vì chúng đọc ba nhánh khác nhau của cùng một sự kiện. Khi code Keycloak gọi `event.success()` hoặc `event.error(...)` (bài 23 đã đọc bytecode `EventBuilder`), event tách ra:

<svg viewBox="0 0 700 330" role="img" aria-labelledby="kc28-a-t kc28-a-d" style="width:100%;height:auto">
<title id="kc28-a-t">Ba đường đi của một user event</title>
<desc id="kc28-a-d">EventBuilder phát event sang ba nhánh độc lập: kho event trong database chỉ khi realm bật lưu và loại event nằm trong danh sách, listener của realm như jboss-logging luôn chạy, và bộ đếm metrics luôn đếm; hai trường hợp lỗi không đi qua EventBuilder nên không xuất hiện ở nhánh nào.</desc>
<defs><marker id="kc28-a-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor" fill-opacity="0.6"/></marker></defs>
<rect x="20" y="40" width="170" height="60" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="105" y="65" text-anchor="middle" font-size="12" fill="currentColor">EventBuilder</text>
<text x="105" y="83" text-anchor="middle" font-size="10" fill="currentColor">success() / error(...)</text>
<line x1="190" y1="60" x2="300" y2="40" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc28-a-arrow)"/>
<line x1="190" y1="70" x2="300" y2="115" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc28-a-arrow)"/>
<line x1="190" y1="85" x2="300" y2="190" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc28-a-arrow)"/>
<rect x="305" y="15" width="375" height="55" rx="8" fill="#84cc16" fill-opacity="0.25"/>
<text x="315" y="35" font-size="11" fill="currentColor">1. Kho event (bảng event_entity), Admin API đọc</text>
<text x="315" y="55" font-size="10" fill="currentColor">chỉ khi eventsEnabled và loại nằm trong 102/132 loại lưu</text>
<rect x="305" y="90" width="375" height="55" rx="8" fill="#f59e0b" fill-opacity="0.25"/>
<text x="315" y="110" font-size="11" fill="currentColor">2. Listener của realm (jboss-logging, SIEM tự viết)</text>
<text x="315" y="130" font-size="10" fill="currentColor">luôn chạy; jboss-logging in lỗi ở WARN, thành công không in</text>
<rect x="305" y="165" width="375" height="55" rx="8" fill="#8b5cf6" fill-opacity="0.25"/>
<text x="315" y="185" font-size="11" fill="currentColor">3. keycloak_user_events_total trên /metrics</text>
<text x="315" y="205" font-size="10" fill="currentColor">luôn đếm, kể cả realm không bật lưu; reset khi restart</text>
<rect x="20" y="250" width="660" height="60" rx="8" fill="#ef4444" fill-opacity="0.2"/>
<text x="35" y="272" font-size="11" fill="currentColor">Không qua EventBuilder, không nhánh nào thấy:</text>
<text x="35" y="292" font-size="10" fill="currentColor">authenticator failure() kèm Response riêng (bài 22); request 500 khi DB chết (mục 3.4)</text>
</svg>

**Nhánh 1, kho event.** Chỉ ghi khi realm bật `eventsEnabled` **và** loại event nằm trong `enabledEventTypes`: realm mới có 102 trên 132 loại `serverinfo` liệt kê, thiếu `REFRESH_TOKEN`, `INTROSPECT_TOKEN`, `USER_INFO_REQUEST`. Lab refresh 10 lần: `event_entity` không có dòng `REFRESH_TOKEN` nào, metric có `event="refresh_token"` 10.

**Nhánh 2, listener của realm.** Chạy dù `eventsEnabled` tắt (lab 2, bài 23). `jboss-logging` in event lỗi ở WARN, không in event thành công: log lab có 25 dòng `type="LOGIN_ERROR"`, 0 dòng `type="LOGIN"`. Đẩy event sang SIEM đi nhánh này, không cần nhánh 1.

**Nhánh 3, metrics.** Listener `micrometer-user-event-metrics` có trong `serverinfo` nhưng không nằm trong `eventsListeners` của realm nào trên lab (`["jboss-logging"]`), vậy mà vẫn đếm cả `master` lẫn `kc28`.

> **Đo trên lab (critic, 26.8.1).** Docs không nói listener metrics gắn vào realm thế nào; bytecode nói: `MicrometerUserEventMetricsEventListenerProviderFactory.isGlobal()` trả `true`, listener toàn cục cho mọi realm. Kiểm thật: đặt `eventsListeners=[]` cho realm `lab`, bắn 2 login lỗi, counter `realm="lab"` của `user_not_found` đi từ 2.0 lên 4.0.

Con số 75 trong log là chuyện khác: dòng WARN `Full scope allowed` không phải event. Bài 27 đã đo chi phí của nó (417 byte mỗi dòng, 99,98% log ở tải cao). Phát hiện thêm: nó in cho **mọi request tới token endpoint của client, kể cả request thất bại**. 75 = 50 đúng + 25 sai; lab Postgres: 1524 = 1002 login + 500 sai + 10 refresh + 12 lỗi 500. Nó không đếm được token, càng không đếm được login. Cách dọn là tắt Full Scope Allowed và gán role scope (bài 9, bài 27), không phải lọc log.

> **Đo trên lab (chạy riêng cho bài này).** Bắn thêm 3 password sai và 2 user lạ: số dòng `Full scope allowed` tăng đúng 5.

### 3.7 Login event, admin event, và thời hạn lưu

Bật cả hai loại bằng một lệnh:

```bash
kcadm.sh update events/config -r kc28 -s eventsEnabled=true -s adminEventsEnabled=true -s adminEventsDetailsEnabled=true
# -> eventsExpiration: null, eventsListeners ["jboss-logging"], enabledEventTypes: 102 loại
```

**Admin event** ghi mọi thao tác qua Admin REST: ai (`authDetails`: realm, client, user, IP của admin), làm gì (`operationType`, `resourceType`, `resourcePath`). Cờ `adminEventsDetailsEnabled` ("Include representation" trên giao diện, tham số `includeRepresentation` ở listener, bài 23) làm mỗi admin event mang **toàn bộ object sau khi đổi**, không phải diff. Đổi `firstName` của alice cho representation 418 ký tự (cả username, email, cờ `access`); chính lệnh bật events là một `UPDATE REALM` 2713 ký tự; `reset-password` cho representation rỗng, mật khẩu không vào admin event (mục 4, bước 5).

**Thời hạn lưu.** `eventsExpiration` mặc định `null`: login event **không bao giờ tự xoá**. Admin event có thời hạn riêng, thuộc tính realm `adminEventsExpiration` (bytecode `JpaEventStoreProvider`), mặc định trống. Export realm không chứa event: event chỉ sống trong database, nên tính vào dung lượng và chính sách lưu trữ của DB.

---

## ⏸ Dừng lại — đoán trước #3

Server khởi động lúc 14:58:31. Lúc 15:00:22 bạn đặt `eventsExpiration=60` (giây) cho realm đang có 80 event, cái mới nhất tạo lúc 14:59:2x. Khi nào `GET /events` trả rỗng?

```
(a) Khoảng 15:00:22: đặt expiration là xoá ngay mọi event quá 60 s
(b) Rải rác từ 15:00:22, mỗi event biến mất đúng 60 s sau khi tạo
(c) Cả 80 cùng biến mất vào một thời điểm, khoảng 15 phút sau khi server khởi động
(d) Không bao giờ, cho tới khi restart server
```

---

### 3.8 Xoá event là một job định kỳ, không phải TTL

Đáp án **(c)**. Lab đếm event mỗi 8 s: 80 event còn nguyên tới 15:13:30, rồi lúc 15:13:38 về **0**. Từ lúc server khởi động tới lúc xoá là khoảng 15 phút.

Bytecode giải thích con số đó. `DefaultDatastoreProviderFactory.getScheduledInterval()` đọc cấu hình `scheduled`/`interval`, mặc định `900` (giây), rồi đăng ký các task định kỳ `ClearExpiredEvents`, `ClearExpiredAdminEvents`, `ClearExpiredUserSessions`... `clearExpiredEvents()` chọn mọi realm có `eventsExpiration > 0`, xoá event cũ theo lô (`EXPIRED_DELETE_MAX_RESULTS = 500`), và dừng sau `EXPIRED_DELETE_TIME_LIMIT_MS = 240000` (4 phút) mỗi lượt.

Hệ quả: event sống tới `eventsExpiration` cộng tối đa 900 s, nên bài test đặt 60 s trông như "expiration không chạy". Và realm tích luỹ event nhiều năm, lần đầu bật expiration, chỉ xoá được phần vừa 4 phút mỗi lượt.

> **Đo trên lab (chạy riêng cho bài này).** Server `started in 8.967s` lúc 14:58:31; `eventsExpiration=60` lúc 15:00:22; 80 → 0 giữa 15:13:30 và 15:13:38. Hằng số đọc bằng `javap -p -c -constants` trên `org.keycloak.keycloak-model-jpa-26.8.1.jar` và `org.keycloak.keycloak-model-storage-private-26.8.1.jar`.

> **Chưa đo.** Một lượt 4 phút xoá được bao nhiêu dòng trên Postgres thật, và có làm chậm login không. Đo bằng: nạp 5 triệu dòng `event_entity` cũ, đặt expiration, ghi `count(*)` và p95 token endpoint mỗi 15 phút.

### 3.9 Những lần thất bại không thành event

Đây là phần đội bảo mật cần biết trước khi tin vào "số `LOGIN_ERROR`". Course đã gặp bốn chỗ:

| Tình huống | Event sinh ra | Hệ quả cho audit | Bài |
|---|---|---|---|
| Authenticator tự viết gọi `failure()` hoặc `failureChallenge()` kèm `Response` riêng | Không có gì | Bước chặn đó vô hình với SIEM, trừ khi code tự gọi `context.getEvent().error(...)` | 22 |
| Mã OTP bị dùng lại (replay) và mã OTP sai | Cả hai `LOGIN_ERROR error="invalid_user_credentials"` | Không phân biệt được người gõ nhầm với kẻ vừa dùng mã của nạn nhân | 19 |
| Token endpoint lỗi 500 vì DB chết | Không có gì | Chỉ thấy qua metric HTTP 5xx | mục 3.4 |
| Realm tắt `eventsEnabled` | Listener vẫn nhận | Tắt "Save events" không chặn dữ liệu đi ra SIEM; ngược lại bật nó không phải điều kiện để có SIEM | 23 |

Thêm một chỗ về dữ liệu: event `user_not_found` lưu nguyên chuỗi người dùng gõ vào ô username, trong `details` của `event_entity` lẫn dòng log WARN. Ai gõ nhầm mật khẩu vào ô username để lại đúng mật khẩu đó dạng rõ ở hai chỗ ấy, rồi ở mọi hệ log được ship sang. Ngoài ra metric `event="login"` gộp cả login bằng mật khẩu lẫn login bằng cookie SSO, nên tỷ lệ lỗi tính trên nó là tỷ lệ trên mọi lần vào, không phải trên mọi lần gõ mật khẩu.

> **Đo trên lab (critic, 26.8.1).** `start-dev` cổng 10100, realm `lab` bật lưu event. Direct grant `username=Alice#2026-DG`: event `LOGIN_ERROR` `user_not_found`, `details.username` = `"Alice#2026-DG"`, log `WARN [org.keycloak.events] type="LOGIN_ERROR", ..., username="Alice#2026-DG"`. Form trình duyệt `username=Alice#2026-FORM`: y hệt, kèm `auth_type="code"`. Metric không mang chuỗi này. Docs không nói gì về lọc username; muốn chặn phải tự lọc ở listener hoặc log pipeline, và đặt `eventsExpiration`. Script `tmp-critic-kc28-pwuser.py`.

> **Nguồn.** *"The user event metric keycloak_user_events_total for event type login includes both password-based logins and cookie-based logins, still it can serve as a first approximate input for this sizing guide."* ([sizing](https://www.keycloak.org/high-availability/single-cluster/concepts-memory-and-cpu-sizing)). *"Exported data does not include user and admin events, persisted sessions, workflow state or revoked tokens."* ([importExport](https://www.keycloak.org/server/importExport)).

### 3.10 Báo động gì

Nguồn chỉ cho một mốc SLO: availability 99,9% mỗi tháng. Mọi ngưỡng khác dưới đây là **đề xuất của bài này**, suy từ cơ chế đã đo, phải hiệu chỉnh theo baseline của bạn.

| Tín hiệu | Ngưỡng (đề xuất, trừ dòng có ghi nguồn) | Vì sao |
|---|---|---|
| Tỷ lệ request thành công trong tháng | < 99,9% (nguồn: SLO ví dụ của docs) | Ngân sách lỗi 43,2 phút cho tháng 30 ngày (mục 5) |
| `http_server_requests_seconds_count{uri=~".*token",status=~"5.."}` | `increase` > 0 trong 5 phút | DB chết chỉ để lại dấu ở đây (mục 3.4) |
| `/health/ready` 503 | Một node > 2 phút, hoặc mọi node cùng lúc | Một node: LB đã tự rút. Mọi node: sự cố |
| `keycloak_user_events_total{event="login",error!=""}` chia tổng `event="login"` | Gấp 3 lần cùng giờ tuần trước, kéo dài 10 phút | Dò mật khẩu; dùng tỷ lệ vì tổng login dao động theo giờ |
| `rate(keycloak_credentials_password_hashing_validations_total[5m])` | > 80% của 15 lần/s nhân số vCPU | Mốc 15 login/s/vCPU là của docs (bài 27); 80% là đề xuất |
| `agroal_awaiting_count` | > 0 liên tục 1 phút | Request đang chờ connection DB |
| `worker_pool_queue_size` | > 0 liên tục 1 phút | Keycloak xếp hàng vô hạn mặc định: latency tăng trước khi có lỗi |
| `vendor_cluster_size` | < số node khai báo | Cụm bị tách (bài 25) |
| Kích thước bảng `event_entity` | Tăng nhanh hơn dự tính ở mục 5 | Không có metric nào; phải đo từ DB |

Counter event reset khi restart, nên luôn dùng `rate()`/`increase()`, không so giá trị thô. Đừng bật tag `clientId`/`idp` chỉ để vẽ dashboard: mỗi tag bị chặn ở 10.000 giá trị vì bộ nhớ.

> **Nguồn.** *"Keycloak should be available 99.9% of the time within a month (44 minutes unavailability per month)."* ([SLI](https://www.keycloak.org/observability/keycloak-service-level-indicators)). *"By default, Keycloak will queue all incoming requests infinitely, even if the request processing stalls."* ([concepts-threads](https://www.keycloak.org/high-availability/single-cluster/concepts-threads)). *"For each 15 password-based user logins per second, allocate 1 vCPU to the cluster (tested with up to 300 per second)."* ([sizing](https://www.keycloak.org/high-availability/single-cluster/concepts-memory-and-cpu-sizing)). *"By default, the clientId, idp and error tags are limited to 10000 unique entries to avoid a metrics explosion which can lead to out-of-memory problems in Keycloak or resource exhaustion in downstream observability tools."* ([event-metrics](https://www.keycloak.org/observability/event-metrics)).

---

## 4. Lab

Keycloak 26.8.1 zip, OpenJDK 24.0.2, Mac mini Apple M4, `~/projects/keycloak-lab/lab-kc28/`. Script: `tmp-kc28-setup.sh`, `tmp-kc28-login.py`, `tmp-kc28-login-n.py`.

**Bước 1–2. Bật sai chỗ rồi bật đúng.** `start --optimized` kèm option build thì exit 2 (mục 3.2). `start-dev` tự build nên nhận cả ba:

```bash
KC_BOOTSTRAP_ADMIN_USERNAME=admin KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
bin/kc.sh start-dev --http-port=3900 --http-management-port=4900 \
  --metrics-enabled=true --health-enabled=true --event-metrics-user-enabled=true
# started in 8.967s ... Management interface listening on http://0.0.0.0:4900
```

`start-dev` dùng H2 nhúng (`dev-file`), nên check database ở đây là của H2; bước 6 mới dùng Postgres.

**Bước 3. Hỏi cả hai cổng.** `/health`, `/health/ready`, `/metrics`: cổng 3900 trả 404, cổng 4900 trả 200.

**Bước 4. Realm, event, 75 lần login.** Tạo realm `kc28`, bật events như mục 3.7, user `alice`, client public `cli` bật direct grant (`fullScopeAllowed: true` mặc định). Chạy script:

```
{('ok', 200): 50, ('badpw', 400): 20, ('nouser', 400): 5}
```

Đọc `/metrics`: 4 dòng `keycloak_user_events_total` ở mục 3.5; metric băm có `hashing_strength="Argon2id-1.3[m=7168,t=5,p=1]"`, `outcome="valid"` 50, `outcome="invalid"` 20.

`kcadm.sh get events -r kc28 --limit 1000`, độ dài `jq -c` từng event: 50 `LOGIN` đều 589 ký tự, 20 `LOGIN_ERROR` sai mật khẩu 383, 5 `user_not_found` 326. Event lỗi thiếu `sessionId`, `token_id`, `refresh_token_id`.

**Bước 5. Admin event.** `kcadm.sh get admin-events -r kc28`, độ dài representation và cả event:

```
UPDATE USER repLen=418 total=897
CREATE CLIENT repLen=130 total=577
ACTION USER repLen=0 total=424        # reset-password
CREATE USER repLen=121 total=570
UPDATE REALM repLen=2713 total=3330   # chính lệnh bật events
```

**Bước 6. Kích thước thật trong Postgres.** Cài bản thứ hai, `start-dev --db=postgres` trỏ Postgres cổng 5439, dựng lại realm, 1000 login đúng (19,4 s) rồi 500 login sai (8,1 s):

```sql
select type, count(*), avg(pg_column_size(e.*))::int from event_entity e group by type;
-- LOGIN_ERROR|500|322
-- LOGIN|1000|528
select pg_total_relation_size('event_entity'), pg_relation_size('event_entity'), pg_indexes_size('event_entity');
-- sau 1000 LOGIN:         860160 | 548864 | 278528
-- sau thêm 500 LOGIN_ERROR: 1179648 | 720896 | 417792
```

Bảng có ba index: khoá chính `id`, `(user_id, type, event_time)`, `(realm_id, event_time)`. Chi tiết nằm ở cột `details_json_long_value`.

**Bước 7. Giết database** (mục 3.4), rồi dừng Keycloak bằng SIGTERM và `pg_ctl stop`.

> **Đo trên lab (chạy riêng cho bài này).** Số ở mục này lấy từ `metrics-1.txt`, `metrics-pg.txt`, `events.json`, `admin-events.json`, `dev.log`, `pg-run.log`. Máy dev, một luồng tuần tự: đúng cơ chế và bậc độ lớn, không phải số production.

---

## 5. Tính tay

**Bài 1: bảng `event_entity` mỗi ngày.** Một app thương mại điện tử có 200.000 password login thành công và 20.000 login sai mỗi ngày, realm bật lưu event, `eventsExpiration` để mặc định.

Lấy chi phí mỗi dòng từ bước 6, tính cả index: 1000 `LOGIN` chiếm 860.160 byte, tức 860,16 byte/dòng. 500 `LOGIN_ERROR` thêm 1.179.648 − 860.160 = 319.488 byte, tức 638,98 byte/dòng.

- `LOGIN`: 200.000 × 860,16 = 172,03 MB
- `LOGIN_ERROR`: 20.000 × 638,98 = 12,78 MB
- Tổng: **184,81 MB/ngày**, 365 ngày không xoá là **67,46 GB**.

Nếu ước bằng kích thước JSON từ Admin API (589 byte) thì ra 200.000 × 589 = 117,8 MB cho `LOGIN`, thấp hơn 31,5% so với đo thật, vì JSON không tính index (278,53 byte/dòng `LOGIN`) và overhead dòng của Postgres. Ước dung lượng bảng thì đo trong bảng, đừng đo payload.

Phép tính còn thiếu `CODE_TO_TOKEN` mà luồng browser sinh thêm (cũng nằm trong 102 loại lưu); lab chỉ đo password grant nên app dùng browser flow sẽ cao hơn 184,81 MB.

**Bài 2: ngân sách lỗi.** SLO 99,9% cho tháng 30 ngày: 30 × 24 × 60 × 0,001 = **43,2 phút** được phép hỏng. Docs ghi 44 phút; tháng 31 ngày cho 44,64 phút. Lab 3.4: database chết 80 giây (15:15:35 tới 15:16:55), và mọi node cùng chết vì chung DB. Một sự cố như vậy tiêu 80 / (43,2 × 60) = **3,1%** ngân sách tháng. 2592 / 80 = 32,4, nên lần thứ 33 trong tháng là vượt SLO.

**Bài 3: event sống bao lâu.** `eventsExpiration` = 2.592.000 s (30 ngày), task mỗi 900 s. Event tạo lúc 10:00:00 ngày 1 không bị xoá trước 10:00:00 ngày 31, và bị xoá ở lượt task đầu tiên sau mốc đó, tức trễ tối đa 15 phút, **nếu** lượt đó không chạm trần 4 phút. Pháp chế hỏi "xoá đúng sau 30 ngày?" thì câu trả lời là "sau 30 ngày, trễ tới 15 phút".

---

## 6. Chuyển giao

1. Đội bảo mật muốn biết login thất bại của **một user cụ thể** trong 90 ngày qua. Metric, kho event, hay log: nguồn nào trả lời được, và với cấu hình nào phải đặt từ trước?
2. Bạn tắt `eventsEnabled` để tiết kiệm database nhưng vẫn cần SIEM. Viết ra cấu hình realm tối thiểu và chỉ ra event nào SIEM nhận được mà Admin API không còn trả.
3. Prometheus scrape mỗi 30 s. Một pod restart lúc giữa hai lần scrape, sau khi vừa đếm 400 login lỗi. `increase()` trên 5 phút có thấy 400 lần đó không?
4. Health check của load balancer gọi `/health/live` thay vì `/health/ready`. Lặp lại sự cố database ở mục 3.4: người dùng thấy gì, và khác gì so với cấu hình đúng?
5. Realm 5.000 client bật `adminEventsDetailsEnabled`, mỗi lần CI chạy `keycloak-config-cli` cập nhật cả realm. Bảng `admin_event_entity` tăng bao nhiêu mỗi lần, và cần đo gì để có số thật?
6. Một authenticator chặn đăng nhập theo quốc gia IP, viết theo kiểu bài 22, không tự ghi event. Một tháng sau có người nghi bị tấn công từ quốc gia bị chặn. Bạn còn dựng lại được bằng chứng gì từ metric, log và DB?
7. Cụm 3 node chung Postgres, cả ba có check database trong `ready`. Postgres failover mất 40 giây. Load balancer rút cả ba node cùng lúc và trả 503 cho mọi người, trong khi nhiều request trong 40 giây đó chỉ cần đọc cache (JWKS, discovery). Có nên bỏ check database khỏi `ready` để giữ những request đó sống không? Lập luận cả hai phía, và nêu phép đo nào sẽ quyết định.

---

## 7. Tóm tắt

- Health và metrics ở management interface (mặc định 9000), cổng chính trả 404; không proxy cổng này ra ngoài.
- `health-enabled`, `metrics-enabled`, `event-metrics-user-enabled` là build option: `start` thường tự build ngầm nên chạy được, `start --optimized` thì thoát mã 2. Feature `user-event-metrics` bật sẵn ở 26.8.1.
- `/health/live` không có check nào; `/health/ready` kiểm khởi tạo, graceful shutdown, database (chỉ khi bật metrics) và cụm (chỉ với `jdbc-ping`).
- Database chết: `ready` 503 ngay, `live` 200, token 500 sau khoảng 1 s, và không có event nào; DB lên lại thì `ready` về 200 dưới 1 s.
- `LOGIN_ERROR` trên metric là `event="login"` cộng `error!=""`; không có `event="login_error"`.
- Một event đi ba nhánh độc lập: kho DB (cần `eventsEnabled` và loại nằm trong 102/132 loại, `REFRESH_TOKEN` không có), listener của realm (luôn chạy), metric (luôn đếm, reset khi restart).
- WARN `Full scope allowed` in cho mọi request token của client, kể cả thất bại; không dùng nó để đếm login.
- `eventsExpiration` mặc định null (không bao giờ xoá); xoá chạy theo task 900 s, lô 500, trần 4 phút mỗi lượt. Admin event có `adminEventsExpiration` riêng.
- Đo trên Postgres: 860,16 byte/dòng `LOGIN`, 638,98 byte/dòng `LOGIN_ERROR` kể cả index; 200.000 login/ngày là 172 MB/ngày chỉ riêng `LOGIN`.
- Lỗ audit: authenticator `failure()` kèm Response (bài 22), OTP replay trùng lỗi với OTP sai (bài 19), lỗi 500 khi DB chết. Username gõ nhầm lưu nguyên văn trong `event_entity` và log WARN, nên mật khẩu gõ nhầm vào ô username nằm dạng rõ ở đó (đo cả direct grant lẫn form).
- SLO 99,9%/tháng là 43,2 phút với tháng 30 ngày; mọi ngưỡng báo động khác là đề xuất, phải hiệu chỉnh theo baseline.

→ **Bài 29 — Nâng version, xoay key, DR**: bài này dựng được tín hiệu để biết hệ thống đang khoẻ; bài sau dùng chính các tín hiệu đó để nâng version, xoay signing key và khôi phục database mà không làm 401 cả hệ thống.
