# Bài 23 — Replication lag thực chiến & read-replica pitfalls

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **cơ chế replication** ở tầng bản chất: physical (Postgres streaming, WAL replay **đơn luồng** trên standby) vs logical (MySQL binlog chạy lại lệnh, parallel apply theo schema/group commit).
- Kể đúng **nguyên nhân gây lag** và vì sao đa số bắt nguồn từ **single-thread apply** và **long-running transaction** — không chỉ "mạng chậm".
- Hiểu **read-replica pitfall kinh điển**: `read-your-writes` bị **stale** (ghi vào master, đọc replica chưa kịp → thấy dữ liệu cũ) và **cách xử lý** (sticky master, critical-path đọc master, wait-for-LSN, bounded staleness).
- **Giám sát lag** đúng chỉ số (`pg_stat_replication`, `Seconds_Behind_Master`) và hiểu vì sao chúng nói dối.
- Xử lý **failover an toàn**: tránh **split-brain** bằng **fencing / STONITH**.

---

## 2. Hai họ replication — bản chất khác nhau

Hãy hình dung một **thư ký chép sổ cái**. Có hai cách chép:
- **Chép lại từng nét mực đã in ra giấy** — không cần hiểu nội dung, chỉ tô lại y hệt các byte đã thay đổi. Đó là **physical replication**.
- **Nghe lại từng câu lệnh "ghi 100đ vào tài khoản A" rồi tự làm lại phép tính** — phải hiểu và thực thi lại. Đó là **logical replication**.

Sự khác biệt này quyết định lag hành xử ra sao.

| | Physical (PG streaming) | Logical (MySQL binlog / PG logical) |
|---|---|---|
| Đơn vị truyền | **WAL record** ở tầng block/page | **Sự kiện logic** theo hàng (row) hoặc câu lệnh |
| Standby làm gì | **Replay** thay đổi byte vào cùng vị trí page | **Thực thi lại** thay đổi (INSERT/UPDATE/DELETE) |
| Cùng phiên bản/kiến trúc? | Bắt buộc (byte-for-byte) | Không — khác version/engine vẫn được |
| Song song hoá | Khó (recovery phần lớn tuần tự) | Dễ hơn (parallel worker theo schema/group) |
| Điểm đau | WAL replay đơn luồng, conflict với query đọc | apply lại phép ghi tốn CPU, single-thread cổ điển |

### 2.1 Postgres streaming — WAL replay ĐƠN LUỒNG

Master ghi mọi thay đổi vào **WAL (Write-Ahead Log)**. Streaming replication đẩy WAL sang standby; tiến trình **startup/recovery** trên standby **replay** các record đó. Điểm mấu chốt gây đau: **quá trình replay về cơ bản là một luồng tuần tự**. Master có 32 core ghi song song ầm ầm, nhưng standby chỉ có **một luồng** tua lại lịch sử → khi master ghi nhanh hơn tốc độ replay, **lag phình ra**.

<svg viewBox="0 0 660 250" role="img" aria-labelledby="pg-t pg-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="pg-t">Physical replication: master ghi song song, standby replay đơn luồng</title>
<desc id="pg-d">Master nhiều luồng ghi WAL, stream sang standby chỉ có một luồng replay tuần tự nên bị tụt lại</desc>
<rect x="30" y="30" width="200" height="120" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="130" y="52" text-anchor="middle" font-size="13" fill="currentColor">Master (primary)</text>
<text x="130" y="74" text-anchor="middle" font-size="10" fill="currentColor">core1 core2 core3 core4</text>
<text x="130" y="92" text-anchor="middle" font-size="10" fill="currentColor">ghi song song → WAL</text>
<rect x="55" y="104" width="150" height="30" rx="4" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="130" y="123" text-anchor="middle" font-size="10" fill="currentColor">WAL stream (LSN tăng dần)</text>
<line x1="230" y1="90" x2="425" y2="90" stroke="currentColor" stroke-width="2" marker-end="url(#pa)"/>
<text x="327" y="80" text-anchor="middle" font-size="10" fill="#f59e0b">ship WAL</text>
<rect x="430" y="30" width="200" height="120" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="530" y="52" text-anchor="middle" font-size="13" fill="currentColor">Standby (replica)</text>
<text x="530" y="78" text-anchor="middle" font-size="10" fill="currentColor">1 luồng replay tuần tự</text>
<rect x="455" y="90" width="150" height="30" rx="4" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="530" y="109" text-anchor="middle" font-size="10" fill="currentColor">replay chậm hơn → lag ↑</text>
<text x="530" y="138" text-anchor="middle" font-size="10" fill="currentColor">replay_lsn tụt sau sent_lsn</text>
<rect x="30" y="185" width="600" height="40" rx="6" fill="#8b5cf6" fill-opacity="0.10" stroke="currentColor"/>
<text x="330" y="203" text-anchor="middle" font-size="11" fill="currentColor">Lag đo bằng khoảng cách LSN: sent_lsn − replay_lsn (byte) hoặc thời gian</text>
<text x="330" y="219" text-anchor="middle" font-size="10" fill="currentColor">flush_lsn = đã ghi đĩa an toàn; replay_lsn = đã áp dụng, query đọc thấy</text>
<defs><marker id="pa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Hai gotcha rất Postgres trên **hot standby** (standby cho phép đọc):

- **Conflict với recovery**: query đọc trên standby giữ một snapshot cũ (đang đọc row version cũ). WAL replay muốn dọn (VACUUM) đúng những row đó hoặc lấy ACCESS EXCLUSIVE lock. Xung đột → Postgres phải chọn: **hoãn replay** (lag tăng) hay **huỷ query đọc**:
  ```
  ERROR: canceling statement due to conflict with recovery
  ```
- **`max_standby_streaming_delay`**: cho phép replay chờ query đọc tối đa bao lâu trước khi huỷ nó. Đặt cao → query đọc dài sống sót nhưng **lag tăng**; đặt thấp → lag nhỏ nhưng query đọc bị **cancel**. Đây là một sự đánh đổi trực tiếp, không có bữa trưa miễn phí.
  ```conf
  # postgresql.conf trên standby
  max_standby_streaming_delay = 30s   # replay chờ query đọc tối đa 30s
  hot_standby_feedback = on           # standby báo master: "tôi còn dùng snapshot này"
  ```
- **`hot_standby_feedback = on`**: standby gửi ngược xmin cho master để master **đừng VACUUM** những row mà query trên standby còn cần → giảm conflict/cancel. Cái giá: master **giữ dead tuple lâu hơn** → có thể **bloat** và trì hoãn VACUUM nếu standby có query treo lâu.

### 2.2 MySQL binlog — apply lại phép ghi, parallel replication

MySQL ghi **binary log (binlog)**. Ở chế độ `ROW` (khuyến nghị), binlog chứa hình ảnh row trước/sau; replica **áp dụng lại** thay đổi đó. Cổ điển, một luồng SQL đơn (`sql_thread`) apply tuần tự → cùng vấn đề single-thread.

MySQL hiện đại có **parallel replication** để giảm lag:

```sql
-- Trên replica (MySQL 8): bật apply song song
SET GLOBAL replica_parallel_workers = 8;
-- LOGICAL_CLOCK: song song hoá các transaction đã commit "cùng nhóm" trên master
SET GLOBAL replica_parallel_type = 'LOGICAL_CLOCK';
-- Giữ thứ tự commit y như master để tránh anomaly khi đọc
SET GLOBAL replica_preserve_commit_order = ON;
```

Cơ chế **LOGICAL_CLOCK**: các transaction **commit cùng một group commit** trên master thì độc lập với nhau (không đứa nào thấy đứa nào) → replica có thể apply chúng **song song** an toàn. Muốn tăng độ song song, master có thể cố ý "gom" commit lâu hơn:

```sql
-- Trên master: gom nhiều transaction vào một group commit → replica song song tốt hơn
SET GLOBAL binlog_group_commit_sync_delay = 100;   -- microseconds
```

`WRITESET` (MySQL 8) còn thông minh hơn: song song hoá các transaction **không đụng cùng row** dù không cùng group commit.

---

## 3. Nguyên nhân lag — soi từng thủ phạm

Lag không phải một hiện tượng, nó là **hàng đợi apply bị nghẽn**. Các thủ phạm chính:

| Nguyên nhân | Vì sao gây lag |
|---|---|
| **DDL nặng / backfill lớn** | Một `ALTER`/`UPDATE 100M dòng` sinh WAL/binlog khổng lồ, standby single-thread replay hàng giờ |
| **Long-running transaction** | Trên master giữ **snapshot/xmin** cũ (chặn VACUUM, tăng conflict trên PG); trên replica một transaction to phải apply nguyên khối |
| **IO bão hoà trên replica** | Replica thường máy yếu hơn / kiêm phục vụ đọc → replay tranh IO với query đọc, chậm lại |
| **Single-thread apply** | Master ghi đa luồng, standby áp một luồng → trần tốc độ apply thấp hơn tốc độ sinh log |
| **Network** | Băng thông/latency giữa AZ/region — thủ phạm ít gặp nhất nhưng dễ đổ lỗi nhất |
| **Hot row / lock trên replica** | Preserve-commit-order + một transaction chậm chặn cả hàng đợi phía sau |

> **Chẩn đoán nhanh:** nếu lag tăng đều trong khi master ghi bình thường → nghi **single-thread apply chạm trần** hoặc **IO replica**. Nếu lag nhảy vọt đúng lúc chạy job → nghi **DDL/backfill**. Nếu lag đứng yên rồi bùng → nghi **một transaction khổng lồ** đang apply.

---

## 4. Read-replica pitfall: read-your-writes bị STALE

Đây là cái bẫy làm hỏng UX kinh điển nhất. Kiến trúc phổ biến: **ghi vào master, đọc từ replica** để giảm tải. Nhưng replication là **bất đồng bộ** — có độ trễ.

<svg viewBox="0 0 660 280" role="img" aria-labelledby="rw-t rw-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="rw-t">Read-your-writes bị stale khi đọc replica ngay sau khi ghi master</title>
<desc id="rw-d">User ghi vào master rồi đọc replica trước khi WAL kịp replay nên thấy dữ liệu cũ</desc>
<line x1="90" y1="40" x2="90" y2="250" stroke="currentColor" stroke-width="1"/>
<line x1="330" y1="40" x2="330" y2="250" stroke="currentColor" stroke-width="1"/>
<line x1="560" y1="40" x2="560" y2="250" stroke="currentColor" stroke-width="1"/>
<text x="90" y="30" text-anchor="middle" font-size="12" fill="currentColor">User</text>
<text x="330" y="30" text-anchor="middle" font-size="12" fill="currentColor">Master</text>
<text x="560" y="30" text-anchor="middle" font-size="12" fill="currentColor">Replica</text>
<rect x="20" y="55" width="140" height="26" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="72" text-anchor="middle" font-size="10" fill="currentColor">POST cập nhật avatar</text>
<line x1="160" y1="68" x2="328" y2="68" stroke="currentColor" stroke-width="1.5" marker-end="url(#ra)"/>
<rect x="270" y="88" width="120" height="24" rx="4" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="330" y="104" text-anchor="middle" font-size="10" fill="currentColor">commit (LSN 500)</text>
<line x1="330" y1="118" x2="558" y2="150" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#ra)"/>
<text x="450" y="128" text-anchor="middle" font-size="9" fill="#f59e0b">WAL async (trễ)</text>
<line x1="90" y1="130" x2="90" y2="150" stroke="currentColor" stroke-width="1"/>
<rect x="20" y="150" width="140" height="26" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="167" text-anchor="middle" font-size="10" fill="currentColor">GET trang profile</text>
<line x1="160" y1="163" x2="558" y2="163" stroke="currentColor" stroke-width="1.5" marker-end="url(#ra)"/>
<rect x="490" y="180" width="150" height="40" rx="4" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="565" y="197" text-anchor="middle" font-size="10" fill="currentColor">replay_lsn = 480</text>
<text x="565" y="213" text-anchor="middle" font-size="10" fill="currentColor">→ trả AVATAR CŨ ❌</text>
<line x1="490" y1="200" x2="162" y2="200" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#ra)"/>
<text x="330" y="245" text-anchor="middle" font-size="11" fill="currentColor">User vừa đổi xong lại thấy ảnh cũ → tưởng hệ thống nuốt mất update</text>
<defs><marker id="ra" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

User đổi avatar (ghi LSN 500 vào master), rồi ngay lập tức load lại trang. Request đọc rơi vào replica **mới replay tới LSN 480** → trả **ảnh cũ**. Từ góc nhìn user: "tôi vừa lưu mà nó mất". Đây là vi phạm **read-your-writes consistency**.

### 4.1 Các cách xử lý (từ đơn giản đến chuẩn xác)

**(A) Sticky đọc master sau khi ghi** — đơn giản, hiệu quả cho phần lớn app. Sau một ghi, ghim các đọc của user đó vào master trong một cửa sổ ngắn (ví dụ vài giây, đủ dài hơn lag p99):

```python
WRITE_STICKY_WINDOW = 5  # giây, nên > lag p99

def route_read(user_id):
    last_write = cache.get(f"lw:{user_id}")   # timestamp lần ghi gần nhất
    if last_write and time.time() - last_write < WRITE_STICKY_WINDOW:
        return MASTER          # còn trong cửa sổ → đọc master, luôn thấy write của mình
    return REPLICA             # hết cửa sổ → đọc replica cho nhẹ tải

def on_write(user_id):
    cache.set(f"lw:{user_id}", time.time(), ex=WRITE_STICKY_WINDOW)
```

**(B) Critical path luôn đọc master** — với luồng nghiệp vụ không được phép sai (số dư ví, trạng thái đơn hàng vừa đặt, kết quả thanh toán), đừng cân nhắc replica. Đọc master và chấp nhận tải. Dùng replica cho các trang "chịu được cũ" (feed, analytics, danh sách).

**(C) Wait-for-LSN / read-after-write token** — chuẩn xác nhất. Khi ghi, lấy **LSN của commit** trả về cho client như một **token**. Lần đọc sau, client gửi kèm token; server **chờ replica replay tới LSN đó** rồi mới đọc:

```sql
-- Sau khi ghi, lấy vị trí WAL của commit vừa rồi (Postgres)
SELECT pg_current_wal_lsn();     -- ví dụ '0/16B3E80'  → trả về client làm token
```

```python
def read_with_token(conn_replica, required_lsn, timeout_ms=500):
    # Chờ replica bắt kịp tới LSN yêu cầu (không quá timeout)
    r = conn_replica.execute(
        "SELECT pg_wal_lsn_diff(pg_last_wal_replay_lsn(), %s) >= 0",
        (required_lsn,)
    ).scalar()
    if r:
        return conn_replica          # đã bắt kịp → đọc replica an toàn
    # chưa kịp trong ngân sách thời gian → fallback đọc master
    return MASTER
```

MySQL có cơ chế tương đương: `WAIT_FOR_EXECUTED_GTID_SET(gtid, timeout)` — chờ replica áp xong đúng GTID của transaction vừa ghi:

```sql
-- Trên replica: chờ tối đa 1s để áp xong GTID mà client cầm
SELECT WAIT_FOR_EXECUTED_GTID_SET('3E11FA47-...:1-100', 1);
-- trả 0 = đã bắt kịp, đọc replica OK; trả 1 = timeout → fallback master
```

**(D) Bounded staleness** — không đòi mới tuyệt đối, chỉ đòi "cũ không quá X giây". Router **loại các replica có lag > ngưỡng** khỏi pool đọc. Đơn giản, không cần token, đủ tốt cho nhiều hệ:

```python
def pick_replica(replicas, max_lag_s=1.0):
    fresh = [r for r in replicas if r.lag_seconds() <= max_lag_s]
    return random.choice(fresh) if fresh else MASTER  # không replica nào đủ mới → master
```

| Cách | Độ mới đảm bảo | Chi phí | Khi dùng |
|---|---|---|---|
| Sticky master | Read-your-writes cho chính user | Cache nhỏ, tăng tải master sau ghi | Mặc định tốt cho web app |
| Critical đọc master | Tuyệt đối | Bỏ lợi ích scale đọc trên path đó | Ví, thanh toán, đơn hàng |
| Wait-for-LSN token | Chính xác theo từng ghi | Phức tạp, cần truyền token | Cần đúng mà vẫn muốn scale đọc |
| Bounded staleness | "Cũ ≤ X giây" | Đơn giản, không tuyệt đối | Feed, dashboard, list |

---

## 5. Giám sát lag — và vì sao chỉ số hay nói dối

### 5.1 Postgres: `pg_stat_replication`

Chạy trên **master**, một dòng cho mỗi standby đang kết nối:

```sql
SELECT client_addr, state,
       pg_wal_lsn_diff(sent_lsn,  replay_lsn) AS replay_bytes_behind,
       write_lag, flush_lag, replay_lag        -- kiểu interval (thời gian)
FROM pg_stat_replication;
```

- `sent_lsn` / `write_lsn` / `flush_lsn` / `replay_lsn`: WAL đã gửi / ghi / fsync / **replay** trên standby. Query đọc chỉ thấy tới `replay_lsn`.
- `replay_lag`: **cái bạn thật sự quan tâm** — thời gian từ lúc commit trên master đến lúc replay xong trên standby.

Trên **standby**, đo lag theo thời gian ngay cả khi không có traffic ghi:

```sql
SELECT now() - pg_last_xact_replay_timestamp() AS replica_lag;
```

### 5.2 MySQL: `Seconds_Behind_Master` — cẩn thận cạm bẫy

```sql
SHOW REPLICA STATUS\G   -- xem Seconds_Behind_Source (tên mới), Replica_SQL_Running
```

`Seconds_Behind_Master` (nay là `Seconds_Behind_Source`) **rất dễ hiểu sai**:
- Nó tính bằng **timestamp của event đang apply** so với đồng hồ replica. Nếu **IO thread đang kẹt** (chưa kéo được binlog về), nó có thể báo **0** trong khi thực tế đang tụt xa — vì "không có việc để làm" ≠ "đã bắt kịp".
- Nhạy với **lệch đồng hồ (clock skew)** giữa master và replica.
- Không phản ánh **backlog binlog chưa kéo về**.

> Chỉ số đáng tin hơn: so **GTID** đã thực thi giữa master và replica (`gtid_executed`), hoặc dùng công cụ như `pt-heartbeat` bơm một hàng heartbeat có timestamp trên master và đo trên replica → miễn nhiễm với "không có traffic" và đo đúng độ trễ end-to-end.

---

## 6. Failover & split-brain — nơi lag hoá nguy hiểm

Khi master chết, một replica được **promote** thành master mới. Hai rủi ro chết người liên quan tới lag:

**Mất dữ liệu do lag (async):** replica được promote **đang tụt sau** master N giây. N giây transaction cuối cùng đã commit ở master cũ nhưng **chưa kịp** sang replica → **bay mất** sau failover. Đây là đánh đổi của async replication. Muốn không mất, dùng **synchronous replication** (master chờ ít nhất một replica flush trước khi báo commit) — an toàn hơn nhưng latency ghi tăng và có thể **treo ghi** nếu replica chậm.

```conf
# Postgres synchronous: master chờ 1 standby xác nhận flush
synchronous_standby_names = 'ANY 1 (replica_a, replica_b)'
synchronous_commit = on
```

**Split-brain:** master cũ **không chết hẳn** (chỉ mất mạng tạm thời — "network partition"). Ta đã promote replica thành master mới. Giờ **hai node đều nghĩ mình là master**, cùng nhận ghi → dữ liệu phân nhánh, không thể merge sạch.

<svg viewBox="0 0 660 250" role="img" aria-labelledby="sb-t sb-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="sb-t">Split-brain và fencing khi failover</title>
<desc id="sb-d">Network partition khiến hai node cùng nhận ghi; fencing cô lập master cũ để chỉ còn một master</desc>
<rect x="30" y="40" width="170" height="60" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="63" text-anchor="middle" font-size="12" fill="currentColor">Master cũ</text>
<text x="115" y="83" text-anchor="middle" font-size="10" fill="currentColor">mất mạng nhưng còn sống</text>
<rect x="460" y="40" width="170" height="60" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="545" y="63" text-anchor="middle" font-size="12" fill="currentColor">Master mới (promoted)</text>
<text x="545" y="83" text-anchor="middle" font-size="10" fill="currentColor">đang nhận ghi</text>
<line x1="200" y1="70" x2="460" y2="70" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<text x="330" y="60" text-anchor="middle" font-size="10" fill="#f59e0b">partition (đứt liên lạc)</text>
<rect x="30" y="130" width="170" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="152" text-anchor="middle" font-size="10" fill="currentColor">client A vẫn ghi vào đây</text>
<rect x="460" y="130" width="170" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="545" y="152" text-anchor="middle" font-size="10" fill="currentColor">client B ghi vào đây</text>
<line x1="115" y1="100" x2="115" y2="130" stroke="currentColor" stroke-width="1" marker-end="url(#sa)"/>
<line x1="545" y1="100" x2="545" y2="130" stroke="currentColor" stroke-width="1" marker-end="url(#sa)"/>
<rect x="150" y="195" width="360" height="42" rx="6" fill="#8b5cf6" fill-opacity="0.12" stroke="currentColor"/>
<text x="330" y="213" text-anchor="middle" font-size="11" fill="currentColor">FENCING / STONITH: cô lập master cũ trước khi promote</text>
<text x="330" y="229" text-anchor="middle" font-size="10" fill="currentColor">(cắt điện / thu hồi VIP / revoke storage lease) → chỉ còn 1 master</text>
<defs><marker id="sa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Fencing (STONITH — Shoot The Other Node In The Head)** là cách chặn split-brain: **trước khi** promote replica, hệ thống phải **cô lập master cũ một cách chắc chắn** để nó không thể nhận ghi nữa:
- Thu hồi **VIP / floating IP** hoặc rút khỏi load balancer.
- **Revoke storage lease** (master cũ không ghi được vào volume dùng chung).
- Trong Kubernetes/cloud: gọi API **cordon/terminate** node cũ, hoặc dựa vào **lease/leader election** (etcd, Consul) — chỉ node giữ được lease mới là master.

Nguyên tắc vàng: **quorum + fencing**. Việc promote chỉ hợp lệ khi một **majority** (quorum) đồng ý master cũ đã chết, và master cũ bị fence xong. Đây là lý do các setup nghiêm túc dùng số node **lẻ** (3, 5) và một **failover manager** (Patroni cho Postgres, Orchestrator/Group Replication cho MySQL) thay vì tự promote thủ công.

---

## 7. Playbook vận hành lag
1. **Giám sát đúng chỉ số**: PG dùng `replay_lag` / `pg_last_xact_replay_timestamp`; MySQL đừng tin `Seconds_Behind` trần trụi — dùng GTID hoặc `pt-heartbeat`.
2. **Alert theo lag thời gian**, không chỉ byte; cảnh báo sớm trước khi vượt ngưỡng SLA đọc.
3. **Chống stale read** ở tầng app: mặc định **sticky master sau ghi**; critical path đọc master; cần chuẩn thì **wait-for-LSN/GTID**; còn lại **bounded staleness**.
4. **Loại replica lag cao** khỏi pool đọc tự động (health check theo lag).
5. **Throttle DDL/backfill theo lag** (đã học ở Bài 20) để không tự bắn vào chân.
6. **Failover phải fencing**: quorum quyết định, cô lập master cũ trước khi promote; dùng failover manager, không promote tay.
7. Cân nhắc **synchronous replication** cho dữ liệu không được mất — chấp nhận latency ghi cao hơn.

---

## 8. Tóm tắt
- **Physical** (PG streaming) replay WAL **đơn luồng** trên standby; **logical** (MySQL binlog) apply lại phép ghi, có **parallel replication** theo group commit/WRITESET để giảm lag.
- Lag chủ yếu do **single-thread apply chạm trần, long-running transaction, DDL/backfill, IO replica** — network ít khi là thủ phạm thật.
- Postgres hot standby đánh đổi **`max_standby_streaming_delay`** (query đọc dài vs lag) và **`hot_standby_feedback`** (giảm cancel nhưng master giữ dead tuple).
- **Read-your-writes bị stale** là bẫy kinh điển: xử lý bằng **sticky master, critical đọc master, wait-for-LSN/GTID token, hoặc bounded staleness** — chọn theo yêu cầu độ mới.
- Giám sát: `pg_stat_replication.replay_lag`; MySQL `Seconds_Behind` **hay nói dối** → dùng GTID/`pt-heartbeat`.
- Failover: async có thể **mất dữ liệu bằng độ lag**; **split-brain** khi hai master cùng ghi → chặn bằng **quorum + fencing/STONITH** và failover manager.

> **Bài tiếp theo (Bài 24):** đi vào **sharding & partitioning** — chia dữ liệu để scale ghi, chọn shard key, resharding không downtime và các hot-shard pitfall.
