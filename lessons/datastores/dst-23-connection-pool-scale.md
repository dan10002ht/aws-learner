# Bài 24 — Connection pool exhaustion & pooler (PgBouncer)

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **vì sao mỗi kết nối tới Postgres lại đắt** — cơ chế 1 process/connection, RAM, context switch — không nói chung chung.
- Chỉ ra **vì sao "càng nhiều connection" KHÔNG làm throughput tăng** mà còn tụt.
- Nhận diện **pool exhaustion** khi app scale ngang: `50 pod × pool 20 = 1000` connection đập vào DB `max_connections = 100` → chờ/timeout dây chuyền.
- **Sizing pool đúng**: hiểu công thức khởi điểm và vì sao phải **đo bằng thực nghiệm**, không phải chỉnh cho to.
- Triển khai **PgBouncer** và chọn đúng **pooling mode** (session / transaction / statement) cùng những gì bạn **mất** khi chọn nhầm.
- Đặt **timeout đúng tầng** (connect / statement / idle-in-transaction) để **fail-fast** thay vì treo cả hệ.

---

## 2. Vì sao một kết nối DB lại đắt?

Với hầu hết app, "mở connection" nghe như một việc rẻ tiền. Với Postgres thì **không** — vì kiến trúc của nó là **một process cho mỗi connection** (process-per-connection), không phải thread nhẹ.

**Analogy:** hãy hình dung một nhà hàng. Mỗi khách vào không phải chỉ chiếm một cái ghế — mỗi khách được **cấp riêng một người phục vụ + một cái bàn + một bộ đồ ăn**. 10 khách thì ổn. Nhưng nếu 1000 khách cùng đòi người phục vụ riêng trong khi bếp chỉ có 8 đầu bếp (8 core), thì phần lớn người phục vụ chỉ đứng chen nhau trong bếp, giành chỗ, va vào nhau — chứ món ăn không ra nhanh hơn. Bếp mới là nút thắt, không phải số người phục vụ.

Cụ thể mỗi connection Postgres tốn:

| Chi phí | Vì sao |
|---------|--------|
| **1 backend process** (`fork`) | Postgres fork một OS process cho mỗi kết nối. Tạo/huỷ process tốn hơn tạo thread nhiều lần. |
| **~ vài MB RAM/connection** | Mỗi backend có `work_mem` riêng cho sort/hash, catalog cache, plan cache, buffer riêng. Thực tế 5–10 MB/connection là bình thường; nghìn connection = nhiều GB RAM chỉ để "ngồi chờ". |
| **Context switch** | Nghìn process ready cùng lúc → OS scheduler phải luân phiên chúng trên số core hữu hạn → CPU đốt vào việc **chuyển ngữ cảnh** thay vì chạy query. |
| **Contention nội bộ** | Nhiều backend giành `LWLock`, lock manager, buffer mapping, `ProcArray`… càng đông càng đánh nhau. |

### 2.1 Nhiều connection hơn số core KHÔNG tăng throughput

Đây là điểm phản trực giác quan trọng nhất của cả bài. Một DB chỉ thực sự **làm việc song song** được tối đa bằng số tài nguyên vật lý: CPU core cho phần compute, và số kênh IO (spindle/NVMe queue) cho phần đọc đĩa. Vượt quá đó, connection thứ N+1 không có core để chạy — nó chỉ **xếp hàng bên trong DB**, đồng thời vẫn ngốn RAM và bắt scheduler phải để ý tới nó.

<svg viewBox="0 0 660 250" role="img" aria-labelledby="tp-t tp-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="tp-t">Throughput theo số connection: tăng rồi bão hoà rồi tụt</title>
<desc id="tp-d">Đường throughput đi lên tới đỉnh quanh số core rồi đi ngang và tụt xuống khi thêm connection, trong khi latency tăng dần</desc>
<line x1="60" y1="200" x2="620" y2="200" stroke="currentColor" stroke-width="1.5"/>
<line x1="60" y1="200" x2="60" y2="30" stroke="currentColor" stroke-width="1.5"/>
<text x="340" y="235" text-anchor="middle" font-size="12" fill="currentColor">Số connection đồng thời →</text>
<text x="30" y="115" text-anchor="middle" font-size="12" fill="currentColor" transform="rotate(-90 30 115)">Throughput</text>
<path d="M60,190 C140,120 200,70 260,66 C360,60 460,95 620,150" fill="none" stroke="#10b981" stroke-width="2.5"/>
<line x1="260" y1="200" x2="260" y2="66" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<text x="260" y="55" text-anchor="middle" font-size="11" fill="#10b981">đỉnh ≈ số core</text>
<circle cx="260" cy="66" r="4" fill="#10b981"/>
<text x="500" y="130" text-anchor="middle" font-size="11" fill="#f43f5e">thêm connection → tụt</text>
<rect x="410" y="160" width="200" height="34" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="510" y="181" text-anchor="middle" font-size="10" fill="currentColor">RAM ↑, context switch ↑, contention ↑</text>
<defs><marker id="ar" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Đây là lý do một pool **nhỏ mà chạy nhanh** thường cho throughput cao hơn một pool to: query xong nhanh, trả connection về pool, connection tiếp theo dùng ngay — luân chuyển (churn) cao trên ít connection **luôn** thắng nghìn connection ngồi giành CPU.

> Liên hệ [[dst-08-cache-pitfalls]]: cache đứng trước DB chính là để **giảm số query chạm DB**, nhờ đó pool nhỏ vẫn đủ. Khi cache sập (stampede), toàn bộ traffic dội thẳng vào DB và **pool exhaustion** là triệu chứng đầu tiên bùng lên.

---

## 3. Pool exhaustion khi app scale ngang

Mỗi instance app giữ **pool riêng** của nó. Điều nguy hiểm: pool là con số **nhân theo số pod**, còn DB thì có **một** `max_connections`. Khi bạn autoscale, tổng connection tăng tuyến tính theo số pod — trong khi trần DB đứng yên.

<svg viewBox="0 0 660 260" role="img" aria-labelledby="pe-t pe-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="pe-t">50 pod nhân pool 20 vượt xa max_connections của DB</title>
<desc id="pe-d">Nhiều pod mỗi pod một pool đổ tổng cộng 1000 connection vào một DB chỉ nhận 100, phần dư bị chặn</desc>
<rect x="20" y="30" width="110" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="75" y="49" text-anchor="middle" font-size="10" fill="currentColor">pod 1 · pool 20</text>
<text x="75" y="63" text-anchor="middle" font-size="9" fill="currentColor">↓ 20 conn</text>
<rect x="20" y="80" width="110" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="75" y="99" text-anchor="middle" font-size="10" fill="currentColor">pod 2 · pool 20</text>
<text x="75" y="113" text-anchor="middle" font-size="9" fill="currentColor">↓ 20 conn</text>
<text x="75" y="150" text-anchor="middle" font-size="16" fill="currentColor">⋮</text>
<rect x="20" y="165" width="110" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="75" y="184" text-anchor="middle" font-size="10" fill="currentColor">pod 50 · pool 20</text>
<text x="75" y="198" text-anchor="middle" font-size="9" fill="currentColor">↓ 20 conn</text>
<rect x="200" y="90" width="150" height="80" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="275" y="120" text-anchor="middle" font-size="12" fill="currentColor">Tổng yêu cầu</text>
<text x="275" y="145" text-anchor="middle" font-size="18" fill="#f59e0b">1000 conn</text>
<line x1="130" y1="120" x2="198" y2="120" stroke="currentColor" stroke-width="1.5" marker-end="url(#ap)"/>
<rect x="430" y="80" width="200" height="100" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="530" y="108" text-anchor="middle" font-size="12" fill="currentColor">Postgres</text>
<text x="530" y="132" text-anchor="middle" font-size="12" fill="currentColor">max_connections = 100</text>
<text x="530" y="156" text-anchor="middle" font-size="11" fill="#f43f5e">900 conn bị từ chối / xếp hàng</text>
<line x1="350" y1="130" x2="428" y2="130" stroke="currentColor" stroke-width="2" marker-end="url(#ap)"/>
<text x="389" y="120" text-anchor="middle" font-size="18" fill="#f43f5e">✕</text>
<defs><marker id="ap" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Chuỗi sự cố **dây chuyền** diễn ra thế này:
1. DB chạm `max_connections`. Connection mới bị từ chối: `FATAL: sorry, too many clients already`.
2. App không lấy được connection từ DB → mỗi request **treo trên hàng chờ của pool** cho tới khi timeout.
3. Request treo giữ lấy **thread/worker của app** → app cũng cạn worker → **request phía trước cửa cũng nghẽn**, kể cả request không cần DB (health check, endpoint tĩnh).
4. Load balancer thấy pod "unhealthy" (health check timeout) → **giết pod, spawn pod mới** → pod mới lại mở thêm pool → **đổ thêm dầu vào lửa**.

Đây chính xác là một **retry storm / cascading failure**. Cách chặn nó là **fail-fast + circuit breaker** như [[ds-22-reliability-patterns]]: khi không lấy được connection trong X ms, **bỏ ngay** (trả lỗi nhanh) thay vì treo — và mở circuit để ngừng dội thêm vào DB đang ngộp, cho nó thở.

> Bài học kiến trúc: **DB không co giãn tuyến tính theo số pod.** Bạn không thể vừa autoscale app tự do vừa cho mỗi pod một pool to. Hoặc giới hạn pool rất nhỏ mỗi pod, hoặc — tốt hơn — đặt một **pooler tập trung** (PgBouncer) đứng giữa để **ghép** hàng nghìn client connection xuống vài chục server connection.

---

## 4. Sizing pool đúng — không phải càng to càng tốt

Sai lầm phổ biến: thấy chậm là **tăng pool size**. Thường nó làm **tệ hơn** vì lý do ở mục 2 — bạn đẩy thêm connection vào một DB vốn đã ngộp.

Công thức khởi điểm nổi tiếng (theo tài liệu HikariCP, dựa trên nghiên cứu của PostgreSQL):

```
connections = (core_count × 2) + effective_spindle_count
```

- `core_count`: số **core vật lý** của DB (không tính hyperthread).
- `effective_spindle_count`: số kênh IO thực sự có thể phục vụ song song một request đang **chờ đĩa**. Với dàn đĩa quay ~ số spindle; với SSD/NVMe cloud, coi như "số IO song song hữu ích" — thường lấy một con số nhỏ, đo mà chỉnh.

Ví dụ DB 8 core, storage NVMe (ước ~2 kênh hữu ích): `8×2 + 2 = 18`. Nghĩa là một pool **~20 connection** cho **cả cụm app** đã đủ bão hoà một DB 8 core. Nếu bạn có 50 pod thì **không phải** mỗi pod 20 — mà là **tổng** ~20, chia ra hoặc (đúng hơn) cho qua pooler.

**Vì sao con số này lại nhỏ đến vậy?** Vì một query chỉ ở hai trạng thái: đang **dùng CPU**, hoặc đang **chờ đĩa/lock**. Bạn chỉ cần đủ connection để: (a) lấp hết core khi chúng compute, cộng (b) một ít connection "dự phòng" để khi vài query đang chờ đĩa thì core không nằm không. Nhiều hơn thế chỉ là hàng chờ trá hình.

> ⚠️ Công thức chỉ là **điểm xuất phát**, không phải chân lý. Bắt buộc **đo bằng thực nghiệm**: chạy load test, tăng dần pool, ghi lại throughput và p99. Bạn sẽ thấy đúng hình dạng đường cong ở mục 2 — throughput lên tới một đỉnh rồi đi ngang/tụt, còn **latency thì tăng đều**. Chọn pool ở **ngay trước đỉnh**, nơi throughput cao mà latency chưa phình.

Cấu hình pool phía app (ví dụ HikariCP — Java) nên đặt **cả timeout**, không chỉ size:

```properties
# HikariCP
maximumPoolSize = 20          # tổng theo công thức, KHÔNG nhân bừa theo pod
minimumIdle = 20              # giữ = max để tránh churn mở/đóng liên tục
connectionTimeout = 2000      # ms: chờ lấy connection quá 2s → ném lỗi (fail-fast)
idleTimeout = 600000          # ms: connection rảnh 10 phút thì thu hồi
maxLifetime = 1800000         # ms: tái tạo connection sau 30 phút (né bug/leak phía DB)
validationTimeout = 1000
```

Điểm mấu chốt là `connectionTimeout`: nó biến "treo vô hạn khi pool cạn" thành "lỗi nhanh sau 2s" — chính là **fail-fast** giúp không nghẽn dây chuyền.

---

## 5. PgBouncer — pooler đứng giữa

Ý tưởng: đặt một tiến trình nhẹ (**PgBouncer**, single-process, event-driven) giữa app và Postgres. App mở **hàng nghìn** connection tới PgBouncer (rẻ, vì PgBouncer không fork process cho mỗi client), còn PgBouncer chỉ giữ **vài chục** connection thật tới Postgres và **tái sử dụng** chúng cho mọi client.

<svg viewBox="0 0 660 220" role="img" aria-labelledby="pb-t pb-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="pb-t">PgBouncer ghép nhiều client connection xuống ít server connection</title>
<desc id="pb-d">Nhiều app pod nối tới một PgBouncer, PgBouncer chỉ giữ một nhóm nhỏ connection thật tới Postgres</desc>
<rect x="20" y="30" width="120" height="30" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="49" text-anchor="middle" font-size="10" fill="currentColor">app pod 1</text>
<rect x="20" y="70" width="120" height="30" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="89" text-anchor="middle" font-size="10" fill="currentColor">app pod 2</text>
<rect x="20" y="110" width="120" height="30" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="129" text-anchor="middle" font-size="10" fill="currentColor">app pod 3</text>
<rect x="20" y="150" width="120" height="30" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="169" text-anchor="middle" font-size="10" fill="currentColor">app pod N</text>
<line x1="140" y1="45" x2="258" y2="95" stroke="currentColor" stroke-width="1"/>
<line x1="140" y1="85" x2="258" y2="100" stroke="currentColor" stroke-width="1"/>
<line x1="140" y1="125" x2="258" y2="110" stroke="currentColor" stroke-width="1"/>
<line x1="140" y1="165" x2="258" y2="115" stroke="currentColor" stroke-width="1"/>
<text x="195" y="70" text-anchor="middle" font-size="9" fill="#f59e0b">2000 client conn</text>
<rect x="260" y="75" width="140" height="70" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="330" y="103" text-anchor="middle" font-size="12" fill="currentColor">PgBouncer</text>
<text x="330" y="124" text-anchor="middle" font-size="9" fill="currentColor">1 process, event-driven</text>
<line x1="400" y1="110" x2="478" y2="110" stroke="currentColor" stroke-width="2" marker-end="url(#ab)"/>
<text x="439" y="100" text-anchor="middle" font-size="9" fill="#10b981">25 server conn</text>
<rect x="480" y="75" width="160" height="70" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="560" y="103" text-anchor="middle" font-size="12" fill="currentColor">Postgres</text>
<text x="560" y="124" text-anchor="middle" font-size="9" fill="currentColor">max_connections = 100</text>
<defs><marker id="ab" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 5.1 Ba pooling mode — và cái giá của mỗi cái

Sự khác biệt nằm ở **khi nào một server connection được trả về pool** để client khác dùng:

| Mode | Trả server conn về pool khi… | Ghép được | Mất gì |
|------|------------------------------|-----------|--------|
| **session** | client **ngắt kết nối** | Kém (1 client giữ 1 server conn suốt phiên) | Không mất gì — an toàn nhất, gần như trong suốt |
| **transaction** | **kết thúc mỗi transaction** (COMMIT/ROLLBACK) | Rất tốt (nghìn client → vài chục conn) | **Mất session state**: prepared statement server-side, session-level `SET`, advisory lock, temp table, `LISTEN/NOTIFY` |
| **statement** | **sau mỗi câu lệnh** (không cho transaction đa lệnh) | Tối đa | Cấm luôn multi-statement transaction — chỉ hợp autocommit/analytics |

**transaction pooling** là lựa chọn phổ biến nhất cho web app vì nó cho tỉ lệ ghép cực cao. Nhưng nó **phá vỡ mọi thứ gắn với session** — vì hai transaction liên tiếp của cùng một client có thể chạy trên **hai server connection khác nhau**:

- **Prepared statement server-side**: bạn `PREPARE` trên conn A, câu sau lại rơi vào conn B chưa hề prepare → lỗi. Đây là lý do phải tắt prepared statement hoặc dùng protocol-level fix. Với JDBC: `prepareThreshold=0`; với nhiều driver: bật chế độ "simple query". PgBouncer 1.21+ có `max_prepared_statements` để hỗ trợ protocol-level prepared statement trong transaction mode.
- **Advisory lock** giữ ở session level sẽ **rò rỉ** (không được release đúng conn) — chỉ dùng loại **transaction-scoped** (`pg_advisory_xact_lock`).
- **`SET` cấp session, temp table, `LISTEN/NOTIFY`, `WITH HOLD` cursor**: đừng dùng, hoặc gói gọn trong một transaction.

> Quy tắc: **transaction pooling cho app CRUD** (nhanh, ghép tốt) — nhưng cho **migration, job cần advisory lock/prepared/temp table**, hãy nối qua một cổng **session pooling** riêng (hoặc nối thẳng DB). Nhiều đội chạy PgBouncer với hai port: một transaction, một session.

### 5.2 Cấu hình PgBouncer

```ini
; pgbouncer.ini
[databases]
shop = host=127.0.0.1 port=5432 dbname=shop

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

pool_mode = transaction        ; session | transaction | statement
max_client_conn = 2000         ; số client được phép nối vào PgBouncer (rẻ)
default_pool_size = 25         ; số server conn THẬT mỗi (user,db) — ĐÂY mới đập vào Postgres
reserve_pool_size = 5          ; conn dự phòng khi pool đầy
reserve_pool_timeout = 3       ; sau 3s chờ mới cấp reserve

; --- timeout: fail-fast, đừng treo ---
query_wait_timeout = 5         ; client chờ 1 server conn quá 5s → huỷ (chống retry storm)
server_idle_timeout = 60       ; server conn rảnh 60s thì đóng bớt
server_lifetime = 3600         ; tái tạo server conn sau 1h
```

Điểm cần khắc cốt: **`default_pool_size` (ở đây 25) mới là con số thật đập vào Postgres**, không phải `max_client_conn`. App có thể mở 2000 client connection, nhưng Postgres chỉ thấy 25 — dưới `max_connections = 100`, còn dư chỗ cho migration/replication/psql thủ công. Đây chính là cách một pooler **cắt đứt** quan hệ tuyến tính "số pod → số connection DB" ở mục 3.

---

## 6. Timeout đúng tầng — để fail-fast, không treo

Một request đi qua **nhiều tầng**, mỗi tầng có một loại timeout riêng. Đặt sai/thiếu tầng nào là chỗ đó sẽ **treo vô hạn** và kéo sập dây chuyền. Nắm rõ ai canh cái gì:

| Timeout | Đặt ở đâu | Canh cái gì | Không có thì |
|---------|-----------|-------------|--------------|
| **connectionTimeout** (pool) | app pool | Chờ **lấy conn từ pool** | Request treo khi pool cạn → nghẽn worker app |
| **query_wait_timeout** | PgBouncer | Chờ **server conn rảnh** ở pooler | Client dồn ứ ở pooler khi Postgres bận |
| **connect_timeout** | driver | Bắt tay TCP+auth tới DB | Treo khi DB/network chết |
| **statement_timeout** | Postgres/session | **Query chạy quá lâu** | Một query "điên" giữ conn mãi, làm cạn pool |
| **idle_in_transaction_session_timeout** | Postgres | Transaction **mở mà không làm gì** | Conn kẹt "idle in transaction" giữ lock, chặn cả DB |
| **lock_timeout** | Postgres | Chờ giành **lock** | ALTER/DDL đứng hình cả bảng (xem [[dst-19-migrations-online-schema]]) |

```sql
-- Ép ở tầng Postgres: query quá 30s tự huỷ, transaction bỏ ngỏ quá 60s tự đóng
ALTER ROLE app_rw SET statement_timeout = '30s';
ALTER ROLE app_rw SET idle_in_transaction_session_timeout = '60s';
ALTER ROLE app_rw SET lock_timeout = '3s';
```

Hai timeout **nguy hiểm nếu thiếu** nhất:

- **`statement_timeout`**: không có nó, một query lỗi (thiếu index, join sai) có thể chạy **hàng phút–giờ**, giữ chặt một connection trong pool. Vài query như thế là **pool cạn** → quay lại đúng kịch bản mục 3.
- **`idle_in_transaction_session_timeout`**: app mở transaction (`BEGIN`) rồi đi làm việc khác/bị pause (GC, network) mà chưa `COMMIT`. Connection ở trạng thái **idle in transaction** — vẫn **giữ lock** và **giữ snapshot** (chặn `VACUUM` dọn dead tuple). Đây là một trong những nguyên nhân "DB tự nhiên đơ" khó chịu nhất. Đặt timeout để Postgres **tự cắt** nó.

**Nguyên tắc xếp tầng timeout (bậc thang):** timeout ở **tầng ngoài phải lớn hơn tầng trong** một chút, và giá trị phải **hữu hạn ở MỌI tầng**. Ví dụ: `statement_timeout (30s) < query_wait + xử lý < HTTP request timeout của client`. Mục tiêu là ở đâu có chờ, ở đó có một cái đồng hồ **bấm chuông và nhả tài nguyên** — không tầng nào được phép chờ vô hạn.

---

## 7. Tóm tắt
- Mỗi connection Postgres = **1 OS process + vài MB RAM + chi phí context switch**. Connection **nhiều hơn số core không tăng throughput** — chỉ tăng RAM, context switch, contention rồi làm throughput **tụt**.
- **Pool exhaustion**: `pod × pool` vượt `max_connections` → too many clients → request treo → cạn worker app → health check fail → pod bị restart → **cascading failure**. Chặn bằng **fail-fast + circuit breaker** ([[ds-22-reliability-patterns]]).
- **Sizing**: khởi điểm `core×2 + effective_spindle` (thường chỉ ~15–25 cho **cả cụm**), rồi **đo thực nghiệm** — chọn pool ngay trước đỉnh throughput. **Càng to KHÔNG càng tốt.**
- **PgBouncer** ghép nghìn client conn → vài chục server conn; `default_pool_size` mới là số thật đập vào DB.
- **Pooling mode**: session (an toàn, ghép kém) · **transaction** (ghép tốt nhưng **mất session state**: prepared/advisory lock/temp/SET) · statement (tối đa, cấm multi-statement tx). Chọn transaction cho CRUD, chừa cổng session cho migration/job.
- **Timeout đúng tầng** — `connectionTimeout`, `query_wait_timeout`, `statement_timeout`, `idle_in_transaction_session_timeout`, `lock_timeout` — để mọi chỗ chờ đều **fail-fast** và không tầng nào treo vô hạn.

> **Bài tiếp theo:** đi vào **read replica & phân tán tải đọc** — routing read/write, đọc từ replica bị stale tới đâu, và read-your-own-write khi có replication lag.
