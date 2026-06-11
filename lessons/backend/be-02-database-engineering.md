# Database Engineering: Index, Transaction & Migration

Database là nơi hầu hết sự cố production bắt nguồn: query chậm dần theo thời gian, deadlock lúc 2 giờ sáng, migration khoá bảng làm sập API. Bài này đi sâu vào ba trụ cột mà một Solutions Architect phải nắm vững: **index**, **transaction/locking**, và **migration an toàn** — kèm cách vận hành connection pool đúng.

## 1. B-tree index hoạt động thế nào

Gần như mọi index mặc định trong PostgreSQL/MySQL (InnoDB) là **B-tree** (chính xác hơn: B+tree):

- Dữ liệu được sắp xếp theo key, lưu trong các **page** (thường 8KB Postgres, 16KB InnoDB).
- Cây rất "lùn": với fan-out hàng trăm entry/page, một bảng 1 tỷ dòng chỉ cần **3–4 cấp**. Tìm một dòng = 3–4 lần đọc page, phần lớn đã nằm trong buffer pool.
- Các **leaf page liên kết với nhau** → range scan (`WHERE created_at BETWEEN ...`, `ORDER BY`) cực hiệu quả vì chỉ cần duyệt tuần tự.

Hệ quả thiết kế quan trọng:

| Đặc tính B-tree | Hệ quả thực tế |
|---|---|
| Dữ liệu có thứ tự | Hỗ trợ `=`, `<`, `>`, `BETWEEN`, `LIKE 'abc%'` (prefix) |
| Không hỗ trợ | `LIKE '%abc'`, hàm bọc cột (`LOWER(email) = ...` nếu không có functional index) |
| InnoDB: clustered index | Bảng **chính là** B-tree theo primary key; secondary index trỏ về PK |
| PK ngẫu nhiên (UUIDv4) | Insert rải rác khắp cây → page split, cache miss. Ưu tiên **UUIDv7/ULID** hoặc bigint |

> 💡 Ghi nhớ: Index không "tăng tốc database" — nó đánh đổi **write chậm hơn + tốn disk** lấy **read nhanh hơn cho một pattern truy vấn cụ thể**. Thiết kế index = thiết kế theo query, không theo bảng.

## 2. Composite index & quy tắc leftmost prefix

Index trên nhiều cột `(a, b, c)` sắp xếp theo `a` trước, rồi `b`, rồi `c` — như danh bạ điện thoại sắp theo (họ, tên).

```sql
CREATE INDEX idx_orders ON orders (user_id, status, created_at);
```

| Query | Dùng được index? |
|---|---|
| `WHERE user_id = 1` | ✅ (prefix `a`) |
| `WHERE user_id = 1 AND status = 'paid'` | ✅ (prefix `a, b`) |
| `WHERE user_id = 1 AND status = 'paid' AND created_at > X` | ✅ toàn bộ |
| `WHERE status = 'paid'` | ❌ (bỏ qua cột đầu) |
| `WHERE user_id = 1 AND created_at > X` | ⚠️ chỉ dùng phần `user_id`, lọc `created_at` sau |
| `WHERE user_id = 1 ORDER BY created_at` | ⚠️ không tránh được sort (vì `status` chen giữa) |

Quy tắc xếp cột (heuristic, không tuyệt đối):

1. **Equality trước, range sau**: cột so sánh `=` đứng trước cột so sánh range.
2. Cột phục vụ `ORDER BY` đặt cuối, ngay sau các cột equality.
3. Đừng máy móc "selectivity cao đứng trước" — thứ tự phải khớp **shape của query** trước đã.

> ⚠️ Bẫy production: tạo `(user_id)` riêng khi đã có `(user_id, status)` là **thừa** — index composite đã phục vụ được query theo `user_id`. Index thừa = write amplification thuần tuý, không thêm lợi ích.

## 3. Covering index — đọc mà không chạm bảng

Bình thường: tìm trong index → lấy con trỏ → **nhảy về bảng** đọc dòng đầy đủ (heap fetch / bookmark lookup). Nếu index đã chứa **mọi cột query cần**, bước nhảy về bảng được bỏ qua → **Index Only Scan**.

```sql
-- Query nóng: lấy email theo user_id
SELECT email FROM users WHERE tenant_id = ? AND active = true;

-- Postgres: INCLUDE đưa cột vào leaf mà không tham gia sắp xếp
CREATE INDEX idx_users_cover
  ON users (tenant_id, active) INCLUDE (email);
```

- MySQL không có `INCLUDE` — thêm cột vào cuối composite index để đạt hiệu ứng tương tự.
- Postgres cần **visibility map** sạch (vacuum đều) thì Index Only Scan mới thực sự "only".

> 💡 Ghi nhớ: Covering index là vũ khí cho 2–3 query nóng nhất hệ thống. Đừng cover mọi query — index phình to thì buffer pool chứa được ít hơn, mọi thứ cùng chậm.

## 4. Khi nào index làm CHẬM — write amplification

Mỗi `INSERT`/`UPDATE`/`DELETE` phải cập nhật **tất cả** index liên quan:

- Bảng có 8 index → 1 insert = 1 ghi heap + 8 ghi B-tree (+ WAL cho từng cái).
- `UPDATE` cột nằm trong index → xoá entry cũ + chèn entry mới (Postgres còn tạo dead tuple, trừ khi đủ điều kiện HOT update).
- Index trên cột "nóng" thay đổi liên tục (`last_seen_at`, counter) là sát thủ thầm lặng.

Dấu hiệu nên xoá index:

```sql
-- Postgres: index không bao giờ được dùng
SELECT indexrelname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexrelname NOT LIKE '%pkey%';
```

Các trường hợp index gây hại khác:

- **Cột selectivity thấp** (`status` chỉ có 3 giá trị, phân bố đều): optimizer thường bỏ qua, nhưng bạn vẫn trả phí write. Cân nhắc **partial index**: `CREATE INDEX ... WHERE status = 'pending'` (chỉ index phần dữ liệu hay được query).
- **Bulk load**: nạp 100 triệu dòng vào bảng đầy index chậm gấp nhiều lần "drop index → load → create index".

## 5. Đọc query plan với EXPLAIN

Đừng đoán — hỏi optimizer:

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT ...;   -- Postgres, chạy thật
EXPLAIN ANALYZE SELECT ...;              -- MySQL 8.0.18+
```

Những thứ phải nhìn:

| Tín hiệu | Ý nghĩa |
|---|---|
| `Seq Scan` trên bảng lớn + filter | Thiếu index, hoặc index không khớp leftmost prefix |
| `rows=10` (ước lượng) vs `actual rows=2,000,000` | **Thống kê sai** → chạy `ANALYZE`, plan sẽ đổi |
| `Nested Loop` với inner loop chạy hàng triệu lần | Join thiếu index ở phía inner |
| `Sort` + `Sort Method: external merge Disk` | Sort tràn ra disk — cần index phục vụ `ORDER BY` hoặc tăng `work_mem` |
| `Buffers: shared read=...` cao | Đọc từ disk nhiều, dữ liệu không nằm trong cache |
| `Index Scan` nhưng `Rows Removed by Filter` lớn | Index chỉ khớp một phần điều kiện — cân nhắc composite tốt hơn |

> ⚠️ Bẫy production: plan **thay đổi theo dữ liệu**. Query chạy tốt 6 tháng rồi đột ngột chậm thường do bảng vượt ngưỡng khiến optimizer đổi plan, hoặc thống kê lệch sau bulk insert. Hãy lưu baseline plan của các query nóng và bật log slow query (`log_min_duration_statement`).

## 6. N+1 query — lỗi kinh điển của ORM

```typescript
// 1 query lấy orders + N query lấy user cho từng order
const orders = await Order.findAll({ limit: 100 });
for (const o of orders) {
  const user = await o.getUser();   // ← 100 round-trip!
}
```

100 query × 2ms latency = 200ms chỉ vì round-trip, dù mỗi query đều "nhanh". Sửa:

1. **Eager load / JOIN**: `Order.findAll({ include: User })` → 1 query.
2. **Batch load**: gom ID, query một lần `WHERE id IN (...)` — pattern **DataLoader** (bắt buộc với GraphQL resolver).
3. Phát hiện sớm: bật log query ở môi trường dev/CI, đếm số query mỗi request; tool như `n+1` detector của Prosopite (Rails) hoặc đơn giản là assertion "request này ≤ X query" trong integration test.

> 💡 Ghi nhớ: ORM không gây N+1 — **lazy loading mặc định + lập trình viên không nhìn SQL sinh ra** mới gây N+1. Quy tắc đội: mọi PR đụng query path nóng phải đính kèm SQL thực tế hoặc số lượng query.

## 7. Transaction & isolation levels

Transaction cho bạn ACID, nhưng chữ **I (Isolation)** có nhiều mức — và mức nào cũng là trade-off giữa đúng đắn và throughput.

Các anomaly cần biết:

- **Dirty read**: đọc dữ liệu chưa commit của transaction khác.
- **Non-repeatable read**: đọc lại cùng một dòng trong transaction, thấy giá trị đã đổi.
- **Phantom read**: chạy lại cùng một câu `WHERE`, thấy **dòng mới xuất hiện**.
- **Lost update**: hai transaction cùng read-modify-write, một bên ghi đè bên kia.
- **Write skew**: hai transaction đọc tập dữ liệu giao nhau rồi ghi vào dòng khác nhau, vi phạm bất biến tổng thể (ví dụ: hai bác sĩ cùng rút khỏi ca trực vì mỗi người đều thấy "còn người khác trực").

| Isolation level | Dirty read | Non-repeatable | Phantom | Ghi chú |
|---|---|---|---|---|
| Read Uncommitted | ❌ có thể | ❌ | ❌ | Postgres không thực sự có mức này |
| **Read Committed** | ✅ chặn | ❌ | ❌ | **Mặc định Postgres** |
| **Repeatable Read** | ✅ | ✅ | Postgres: ✅ (snapshot) / MySQL: gần ✅ | **Mặc định MySQL/InnoDB** |
| Serializable | ✅ | ✅ | ✅ (+ chặn write skew) | Đắt nhất; Postgres dùng SSI, có thể fail với `40001` |

Điểm hay bị hiểu sai:

- **Read Committed không chặn lost update.** Hai request cùng `SELECT balance` rồi `UPDATE balance = X` sẽ giẫm nhau. Sửa bằng update nguyên tử (`SET balance = balance - 100 WHERE balance >= 100`), `SELECT ... FOR UPDATE`, hoặc optimistic locking.
- **Serializable ở Postgres không lock nhiều hơn** — nó theo dõi dependency và **abort** transaction vi phạm. Ứng dụng **bắt buộc phải có retry loop** cho error `serialization_failure (40001)`.
- Repeatable Read của MySQL dùng gap lock để chặn phần lớn phantom, nhưng gap lock cũng là nguồn deadlock phổ biến.

```python
# Pattern retry cho serializable / serialization failure
for attempt in range(3):
    try:
        with db.transaction(isolation="serializable"):
            do_work()
        break
    except SerializationFailure:
        sleep(backoff(attempt))
```

## 8. Lock & deadlock

- Row lock sinh ra từ `UPDATE`/`DELETE`/`SELECT FOR UPDATE`, giữ đến **cuối transaction** — không phải cuối câu lệnh.
- **Deadlock** = hai transaction giữ lock và chờ chéo nhau. DB tự phát hiện và kill một bên (error `40P01` Postgres / `1213` MySQL).

Phòng deadlock:

1. **Lock theo thứ tự nhất quán** — luôn lock account có ID nhỏ trước, hoặc `ORDER BY id` khi `SELECT ... FOR UPDATE` nhiều dòng.
2. **Transaction ngắn** — không gọi HTTP/API ngoài, không chờ user input trong transaction.
3. Dùng `SELECT ... FOR UPDATE SKIP LOCKED` cho pattern job queue (worker không chờ nhau).
4. `lock_timeout` để fail nhanh thay vì xếp hàng vô hạn.

> ⚠️ Bẫy production: deadlock **không phải bug phải diệt bằng 0** — ở mức thấp nó là chuyện bình thường của hệ concurrent. Bug thật là **không retry** khi bị chọn làm nạn nhân. Mọi write transaction nên đi qua wrapper có retry.

## 9. Optimistic vs Pessimistic locking

| | Pessimistic | Optimistic |
|---|---|---|
| Cơ chế | `SELECT ... FOR UPDATE` — khoá trước, làm sau | Cột `version`; `UPDATE ... WHERE version = :old` — làm trước, kiểm tra lúc ghi |
| Phù hợp | Contention **cao**, conflict gần như chắc xảy ra (trừ kho, ghi sổ) | Contention **thấp**, conflict hiếm (user sửa profile, CMS) |
| Chi phí khi đông | Transaction xếp hàng chờ lock | Retry/báo lỗi "dữ liệu đã bị sửa" |
| Hoạt động qua nhiều request HTTP? | ❌ (không giữ lock qua request) | ✅ (gửi version về client, so lúc submit) |

```sql
-- Optimistic: nếu affected rows = 0 → người khác đã sửa, báo conflict
UPDATE documents
SET body = :new_body, version = version + 1
WHERE id = :id AND version = :expected_version;
```

> 💡 Ghi nhớ: form chỉnh sửa kéo dài nhiều phút (admin panel, CMS) **bắt buộc** optimistic — không DB nào nên giữ row lock suốt thời gian user gõ phím. Pessimistic chỉ dành cho critical section ngắn trong một transaction.

## 10. Migration an toàn — expand-contract, không khoá bảng

Nguyên tắc vàng: **schema phải tương thích với cả phiên bản code cũ và mới cùng lúc**, vì deploy không bao giờ atomic (rolling deploy, rollback).

### Pattern expand–migrate–contract (đổi tên/đổi kiểu cột)

1. **Expand**: thêm cột mới `email_normalized` (nullable, không default tốn kém). Code ghi vào **cả hai** cột (dual-write).
2. **Backfill**: copy dữ liệu cũ sang cột mới **theo batch**.
3. **Migrate read**: code chuyển sang đọc cột mới (có thể sau bước verify so khớp hai cột).
4. **Contract**: sau vài ngày ổn định, xoá cột cũ ở một release riêng.

### Những lệnh nguy hiểm và cách né (Postgres)

| Việc cần làm | Cách ngây thơ (khoá bảng) | Cách an toàn |
|---|---|---|
| Thêm index | `CREATE INDEX` | `CREATE INDEX CONCURRENTLY` (không trong transaction) |
| Thêm NOT NULL | `ALTER ... SET NOT NULL` (full scan + lock) | `ADD CONSTRAINT ... CHECK (x IS NOT NULL) NOT VALID` → `VALIDATE CONSTRAINT` → `SET NOT NULL` (PG12+ dùng lại check, gần như tức thì) |
| Thêm FK | `ADD FOREIGN KEY` | `ADD ... NOT VALID` rồi `VALIDATE CONSTRAINT` riêng |
| Đổi kiểu cột | `ALTER COLUMN TYPE` (rewrite cả bảng) | Expand-contract với cột mới |
| Thêm cột có default | (PG cũ: rewrite bảng) | PG11+ default tĩnh là metadata-only — nhưng default **volatile** (`now()`, `gen_random_uuid()`) vẫn rewrite |

Backfill đúng cách:

```sql
-- Batch nhỏ + nghỉ giữa các batch, không một UPDATE khổng lồ
UPDATE users SET email_normalized = LOWER(email)
WHERE id IN (
  SELECT id FROM users
  WHERE email_normalized IS NULL
  LIMIT 5000
);
-- lặp lại đến khi affected rows = 0; theo dõi replication lag giữa các vòng
```

> ⚠️ Bẫy production: ngay cả `ALTER TABLE` "nhanh" cũng cần **ACCESS EXCLUSIVE lock trong tích tắc** — nếu có một query dài đang chạy, ALTER xếp hàng sau nó, và **mọi query mới xếp hàng sau ALTER** → toàn bộ bảng đứng hình. Luôn set `lock_timeout = '3s'` + retry cho migration, và chạy ngoài giờ peak.

Với MySQL: dùng **`gh-ost`** hoặc **`pt-online-schema-change`** cho bảng lớn (tạo shadow table + copy + swap), hoặc `ALGORITHM=INSTANT` (MySQL 8.0) cho các thay đổi hỗ trợ.

## 11. Connection pool sizing

Hai lầm tưởng phổ biến: "càng nhiều connection càng nhanh" và "pool size = số user đồng thời". Sự thật: database chỉ làm việc hiệu quả với số connection **xấp xỉ số core** (cộng bù cho I/O wait).

Công thức khởi điểm (từ HikariCP):

```
pool_size ≈ (số core của DB × 2) + số disk spindle hiệu dụng
```

DB 8 vCPU → pool ~16–20 là điểm bắt đầu hợp lý, **cho toàn cụm app cộng lại**.

Bài toán thật ở kiến trúc hiện đại:

- 50 pod × pool 20 mỗi pod = **1000 connection** → Postgres ngộp (mỗi connection là một process, tốn RAM, context switch).
- Serverless/Lambda còn tệ hơn: mỗi invocation lạnh mở connection mới.
- Giải pháp: **connection pooler tầng giữa** — PgBouncer (transaction mode) hoặc RDS Proxy — app mở nhiều connection "ảo", pooler dồn về ít connection thật.

> 💡 Ghi nhớ: nếu tăng pool size mà latency tăng theo, bạn không thiếu connection — bạn thiếu **CPU/I-O ở database**. Pool nhỏ + hàng đợi ở tầng app cho throughput tổng tốt hơn 500 connection cùng tranh nhau lock và buffer pool. Đo `connections active vs idle` trước khi chỉnh.

Cấu hình kèm theo bắt buộc: `connection timeout` (fail nhanh khi pool cạn), `max lifetime` (tránh connection già hơn failover/DNS TTL), `idle timeout`, và `statement_timeout` phía DB để query hỏng không chiếm connection vô hạn.

## Liên hệ sang AWS

| Chủ đề trong bài | Service / tính năng AWS |
|---|---|
| B-tree, EXPLAIN, isolation | **RDS** (Postgres/MySQL managed) — mọi kiến thức ở trên áp dụng nguyên vẹn; RDS chỉ lo backup/patching/failover, không lo index hộ bạn |
| Query chậm, tìm query nóng | **Performance Insights** — xem top SQL theo DB load (AAS), wait event (lock, I/O, CPU) — chính là EXPLAIN-ở-tầm-fleet; kết hợp **CloudWatch Database Insights** |
| Connection pool cho serverless / nhiều pod | **RDS Proxy** — connection pooling + multiplexing managed, giảm failover time, bắt buộc cân nhắc khi Lambda nói chuyện với RDS |
| Read scale & replication lag khi backfill | **Aurora** — storage tách compute, replica lag thường <100ms, tới 15 read replica; **Aurora Serverless v2** auto-scale theo ACU |
| Migration không downtime | **Aurora Blue/Green Deployments** (RDS Blue/Green) — clone môi trường, chạy schema change trên green, switchover <1 phút |
| Lock/deadlock monitoring | Performance Insights wait events (`Lock:tuple`, `Lock:transactionid`) + Enhanced Monitoring |
| Backfill/ETL khối lượng lớn giữa các DB | **DMS** (Database Migration Service) cho migrate/replicate liên tục giữa engine |
| Job queue thay vì `SKIP LOCKED` tự chế | **SQS** — khi pattern "bảng làm hàng đợi" vượt quá quy mô hợp lý, chuyển sang queue thật |
| Cache giảm tải read & N+1 xuyên service | **ElastiCache** (Redis/Valkey) — cache-aside cho query nóng, nhưng nhớ bài toán invalidation |

Checklist tự kiểm tra trước khi nhận mình "vững database":

1. Đọc được `EXPLAIN ANALYZE` và chỉ ra vì sao plan chọn Seq Scan.
2. Giải thích được vì sao Read Committed vẫn gây lost update và 3 cách sửa.
3. Viết được kế hoạch migration đổi kiểu cột trên bảng 500 triệu dòng, zero downtime.
4. Trả lời được "pool size bao nhiêu" bằng số core của DB chứ không bằng số user.
