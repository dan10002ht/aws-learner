# Bài 22 — Storage reclamation & compaction (VACUUM, LSM)

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **vì sao DELETE/UPDATE không trả đĩa lại cho OS ngay** — cơ chế MVCC thật, không chung chung.
- Hiểu **dead tuple → bloat** bảng và index, và tại sao bảng "chỉ 10GB dữ liệu" lại chiếm 40GB đĩa.
- Phân biệt **VACUUM** (đánh dấu tái dùng) vs **VACUUM FULL** (rewrite + khoá) vs **pg_repack** (online), chọn đúng khi nào.
- Tune **autovacuum** và biết vì sao nó **tụt hậu** ở bảng write-nặng.
- Hiểu **TXID wraparound** — vì sao nó có thể **dừng cả DB** và vì sao phải vacuum kịp.
- Nắm **LSM-tree**: memtable → SSTable → **compaction**; ba loại amplification; chiến lược STCS/LCS/TWCS và đánh đổi.
- So sánh bản chất **B-tree (update tại chỗ)** vs **LSM (append + compact)**.

---

## 2. Vì sao xoá/update không giải phóng đĩa ngay?

Trực giác sai phổ biến: `DELETE FROM orders WHERE ...` → đĩa trống ra ngay. Thực tế **không**. Lý do nằm ở **MVCC (Multi-Version Concurrency Control)** — cơ chế cho phép nhiều transaction đọc/ghi đồng thời mà không khoá lẫn nhau.

**Analogy:** hãy nghĩ tới một cuốn sổ kế toán mà **không ai được tẩy xoá**. Muốn sửa một dòng, bạn **gạch dấu "hết hiệu lực" lên dòng cũ** rồi **viết dòng mới ở cuối sổ**. Dòng cũ vẫn nằm đó chiếm chỗ — cho tới khi có người rà lại và xác nhận "không ai còn cần dòng này nữa" thì mới được phép ghi đè lên chỗ đó. VACUUM chính là người đi rà đó.

### 2.1 Cơ chế MVCC trong Postgres

Mỗi dòng (tuple) trong Postgres mang hai cột hệ thống ẩn: `xmin` (transaction tạo ra nó) và `xmax` (transaction xoá nó). Một dòng "sống" với transaction bạn nếu `xmin` đã commit **và** `xmax` chưa set (hoặc chưa commit).

- **UPDATE** = tạo **một phiên bản dòng mới** (`xmin` = txid hiện tại) + set `xmax` lên **dòng cũ**. Dòng cũ trở thành **dead tuple** — vẫn nằm vật lý trong page.
- **DELETE** = chỉ set `xmax` lên dòng → dòng thành dead tuple ngay khi transaction commit.

Vì sao không xoá luôn? Vì **transaction khác đang chạy có thể vẫn cần đọc phiên bản cũ** (snapshot isolation). Dead tuple chỉ có thể dọn khi **không còn snapshot nào** có thể nhìn thấy nó.

```sql
-- Xem trực tiếp dead tuple tích luỹ trên một bảng
SELECT relname,
       n_live_tup,          -- dòng sống
       n_dead_tup,          -- dead tuple đang chiếm chỗ
       round(n_dead_tup::numeric / nullif(n_live_tup,0), 3) AS dead_ratio,
       last_autovacuum
FROM pg_stat_user_tables
WHERE relname = 'orders';
```

### 2.2 Bloat — cái giá của MVCC

**Bloat** = phần đĩa bị dead tuple (và không gian trống rải rác) chiếm mà dữ liệu sống không dùng tới. Bảng write-nặng (nhiều UPDATE) bloat rất nhanh: một hàng UPDATE 20 lần để lại 19 dead tuple.

Index cũng bloat: mỗi phiên bản dòng mới thường cần một entry index mới (trừ khi **HOT update** — update mà không đụng cột được index, giữ được trong cùng page thì Postgres tránh thêm entry index).

```sql
-- Ước lượng bloat (dùng extension pgstattuple cho số chính xác)
CREATE EXTENSION IF NOT EXISTS pgstattuple;
SELECT * FROM pgstattuple('orders');
--  table_len | tuple_count | tuple_len | dead_tuple_count | dead_tuple_len | free_percent ...
```

> Con số thực chiến: một bảng counter/queue bị UPDATE liên tục có thể phình tới **5-10x** kích thước dữ liệu thật nếu autovacuum không theo kịp — index bloat còn tệ hơn bảng.

---

## 3. VACUUM vs VACUUM FULL vs pg_repack

Đây là ba công cụ khác nhau về bản chất, hay bị nhầm lẫn:

| | VACUUM (thường) | VACUUM FULL | pg_repack |
|---|---|---|---|
| Làm gì | Đánh dấu dead tuple là **tái dùng được** trong file | **Rewrite** cả bảng sang file mới, chỉ dòng sống | Rewrite online qua bảng phụ + trigger |
| Trả đĩa cho OS? | **Không** (chỉ trả về *free space map* của bảng) | **Có** (file co lại thật) | **Có** |
| Lock | Không chặn đọc/ghi | **ACCESS EXCLUSIVE** — chặn tất cả ❌ | Chỉ khoá ngắn lúc swap |
| Cần đĩa tạm | Không | Không (nhưng cần chỗ cho bản copy) | Cần ~2x bảng |
| Dùng khi | Bảo trì thường xuyên (autovacuum lo) | Bảo trì khẩn, chấp nhận downtime | Bảng lớn, không được downtime |

**Điểm mấu chốt:** `VACUUM` thường **KHÔNG trả đĩa lại cho OS**. Nó chỉ biến dead tuple thành "chỗ trống có thể ghi đè" trong chính file bảng (qua **Free Space Map**). Đĩa mà `df` thấy vẫn nguyên — nhưng UPDATE/INSERT mới sẽ tái dùng chỗ đó thay vì phình file. Đây là **hành vi mong muốn**: giữ ổn định, tránh trả rồi lại xin đĩa liên tục.

Chỉ khi bảng đã bloat nặng và bạn thật sự cần **thu nhỏ file trả về OS** mới cần `VACUUM FULL` (khoá) hoặc `pg_repack` (online).

```sql
-- VACUUM thường: an toàn, chạy được lúc production đang tải
VACUUM (VERBOSE, ANALYZE) orders;

-- VACUUM FULL: KHOÁ toàn bảng, rewrite → chỉ chạy trong maintenance window
VACUUM FULL orders;   -- ❌ chặn cả SELECT trong suốt thời gian chạy
```

```bash
# pg_repack: co bảng bloat mà KHÔNG downtime (cần cài extension + binary)
pg_repack -d shop --table=orders --jobs=2
# Nó tạo bảng shadow, copy dòng sống, dùng trigger bắt thay đổi,
# rồi swap tên trong một khoảnh khắc ngắn — giống gh-ost cho migration.
```

---

## 4. Autovacuum — và vì sao nó tụt hậu

Postgres có **autovacuum daemon** tự chạy VACUUM/ANALYZE nền. Nó **kích hoạt trên một bảng** khi:

```
n_dead_tup  >  autovacuum_vacuum_threshold        (mặc định 50)
             + autovacuum_vacuum_scale_factor * n_live_tup   (mặc định 0.2)
```

Nghĩa là mặc định: đợi **dead tuple đạt 20% số dòng sống** mới vacuum. Với bảng 200 triệu dòng, đó là **40 triệu dead tuple** mới bắt đầu — quá trễ, bloat đã hình thành và một lượt vacuum giờ rất nặng.

### 4.1 Vì sao tụt hậu ở bảng write-nặng
- **Ngưỡng theo tỷ lệ (scale_factor) sai lầm ở bảng lớn:** 0.2 hợp bảng nhỏ, nhưng với bảng khổng lồ nó cho phép dead tuple tích tụ khổng lồ trước khi chạy. → Giảm scale_factor cho bảng lớn.
- **Cost limit bóp ga:** autovacuum tự throttle bằng `autovacuum_vacuum_cost_limit` / `cost_delay` để không giết IO. Trên bảng ghi nhanh, dead tuple **sinh ra nhanh hơn** tốc độ vacuum bị bóp → vacuum không bao giờ đuổi kịp.
- **Long-running transaction chặn dọn:** vacuum **không thể** dọn dead tuple **mới hơn** transaction/snapshot cũ nhất đang mở. Một transaction "quên commit" hoặc một replica có `hot_standby_feedback` giữ snapshot cũ khiến dead tuple **không dọn được dù vacuum có chạy** → bảng vẫn phình.
- **Số worker giới hạn:** `autovacuum_max_workers` (mặc định 3) — nhiều bảng bloat cùng lúc thì xếp hàng.

### 4.2 Tuning thực chiến (đặt per-table cho bảng nóng)

```sql
-- Bảng write-nặng: vacuum sớm hơn nhiều + cho vacuum "chạy mạnh tay" hơn
ALTER TABLE orders SET (
  autovacuum_vacuum_scale_factor = 0.02,   -- 2% thay vì 20% → vacuum thường xuyên
  autovacuum_vacuum_threshold    = 5000,
  autovacuum_vacuum_cost_limit   = 2000,   -- nới ga (mặc định 200) → vacuum nhanh hơn
  autovacuum_vacuum_cost_delay   = 2        -- ms nghỉ giữa các batch (mặc định ~2-20)
);
```

```sql
-- Săn transaction dài đang chặn vacuum dọn dead tuple
SELECT pid, age(backend_xid) AS xid_age, state, now()-xact_start AS xact_len, query
FROM pg_stat_activity
WHERE state <> 'idle' AND xact_start IS NOT NULL
ORDER BY xact_start
LIMIT 5;
```

> Nguyên tắc: **vacuum thường xuyên + nhẹ** tốt hơn **hiếm + nặng**. Vacuum trễ = một lượt quét khổng lồ đúng lúc tải cao, và bloat đã thành hình không lấy lại được bằng VACUUM thường.

---

## 5. TXID wraparound — mối nguy chết người

Đây là lý do **sâu xa nhất** khiến vacuum không phải tuỳ chọn mà là **bắt buộc**.

Transaction ID (XID) trong Postgres là số **32-bit** → chỉ có ~**4 tỷ** giá trị, và nó **quay vòng (wraparound)**. Postgres so sánh "cũ/mới" theo kiểu modulo: với một XID, một nửa không gian là "quá khứ", nửa kia là "tương lai". Nếu một dòng có `xmin` **cũ hơn 2 tỷ transaction**, nó đột nhiên bị coi là **"ở tương lai" → tàng hình → mất dữ liệu logic**.

Để chống điều đó, VACUUM làm thêm việc **freeze**: đánh dấu các dòng đủ cũ là "đóng băng vĩnh viễn" (`FrozenXID`), thoát khỏi phép so sánh wraparound. Vacuum phải freeze **trước khi** xid-age chạm giới hạn.

<svg viewBox="0 0 660 250" role="img" aria-labelledby="wrap-t wrap-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="wrap-t">Vòng đời XID age và các mốc wraparound</title>
<desc id="wrap-d">Thanh tiến trình từ 0 tới giới hạn 2 tỷ, đánh dấu các mốc autovacuum freeze, cảnh báo, và điểm DB dừng để tự bảo vệ</desc>
<rect x="30" y="60" width="600" height="34" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="360" y="60" width="180" height="34" fill="#f59e0b" fill-opacity="0.14" stroke="none"/>
<rect x="540" y="60" width="90" height="34" fill="#f43f5e" fill-opacity="0.14" stroke="none"/>
<text x="40" y="82" font-size="11" fill="currentColor">XID age tăng dần →</text>
<line x1="360" y1="50" x2="360" y2="104" stroke="currentColor" stroke-width="1.5"/>
<text x="360" y="122" text-anchor="middle" font-size="10" fill="currentColor">200M</text>
<text x="360" y="136" text-anchor="middle" font-size="9" fill="currentColor">autovacuum freeze</text>
<line x1="540" y1="50" x2="540" y2="104" stroke="currentColor" stroke-width="1.5"/>
<text x="540" y="122" text-anchor="middle" font-size="10" fill="currentColor">~2 tỷ</text>
<text x="540" y="136" text-anchor="middle" font-size="9" fill="currentColor">cảnh báo dồn dập</text>
<line x1="620" y1="50" x2="620" y2="104" stroke="currentColor" stroke-width="1.5"/>
<text x="620" y="122" text-anchor="middle" font-size="10" fill="currentColor">giới hạn</text>
<rect x="30" y="165" width="600" height="60" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="330" y="188" text-anchor="middle" font-size="12" fill="currentColor">Nếu chạm giới hạn: Postgres DỪNG nhận write của DB đó để tự bảo vệ</text>
<text x="330" y="208" text-anchor="middle" font-size="11" fill="currentColor">"database is not accepting commands to avoid wraparound data loss" — phải VACUUM ở single-user mode</text>
</svg>

```sql
-- Theo dõi bảng nào gần wraparound nhất — cần alert khi vượt ~1 tỷ
SELECT relname,
       age(relfrozenxid) AS xid_age
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r' AND n.nspname NOT LIKE 'pg_%'
ORDER BY xid_age DESC
LIMIT 10;
-- autovacuum_freeze_max_age mặc định 200M → autovacuum PHẢI kích hoạt freeze
-- kể cả khi bảng không có dead tuple. Đây là vacuum "không thể tắt".
```

> **Cực kỳ nguy hiểm:** nếu bạn tắt autovacuum (nhiều người làm để "giảm tải"), hoặc autovacuum kẹt vì transaction dài / bảng quá lớn, xid_age cứ tăng. Chạm ngưỡng → **DB từ chối mọi write** để không mất dữ liệu do wraparound. Khắc phục lúc đó là VACUUM ở **single-user mode** — sự cố production nghiêm trọng, có thể mất nhiều giờ. **Không bao giờ tắt autovacuum toàn cục.**

---

## 6. LSM-tree — mô hình lưu trữ khác hẳn

B-tree (Postgres/MySQL InnoDB) **update tại chỗ**: tìm đúng page, sửa ngay tại đó. Điều này gây **random write** — tốn với ổ đĩa và ghi khuếch đại WAL. **LSM-tree (Log-Structured Merge-tree)** — dùng bởi Cassandra, RocksDB, LevelDB, ScyllaDB, HBase — chọn cách ngược lại: **chỉ ghi nối tiếp (append), không bao giờ sửa tại chỗ**, rồi dọn dẹp sau bằng **compaction**.

### 6.1 Đường đi của một write trong LSM

<svg viewBox="0 0 660 320" role="img" aria-labelledby="lsm-t lsm-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="lsm-t">Kiến trúc LSM-tree: memtable, WAL, SSTable theo tầng và compaction</title>
<desc id="lsm-d">Write vào WAL và memtable trong RAM, flush thành SSTable bất biến, các SSTable được compaction gộp lại theo tầng</desc>
<rect x="30" y="30" width="120" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="52" text-anchor="middle" font-size="12" fill="currentColor">Write đến</text>
<text x="90" y="68" text-anchor="middle" font-size="10" fill="currentColor">(insert/update/delete)</text>
<rect x="200" y="20" width="150" height="30" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="275" y="40" text-anchor="middle" font-size="11" fill="currentColor">WAL (append, bền)</text>
<rect x="200" y="60" width="150" height="45" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="275" y="82" text-anchor="middle" font-size="11" fill="currentColor">Memtable (RAM)</text>
<text x="275" y="98" text-anchor="middle" font-size="10" fill="currentColor">sorted, có thể ghi</text>
<line x1="150" y1="52" x2="198" y2="40" stroke="currentColor" stroke-width="1.5" marker-end="url(#la)"/>
<line x1="150" y1="55" x2="198" y2="80" stroke="currentColor" stroke-width="1.5" marker-end="url(#la)"/>
<text x="275" y="128" text-anchor="middle" font-size="10" fill="currentColor">đầy → flush (bất biến)</text>
<line x1="275" y1="105" x2="275" y2="140" stroke="currentColor" stroke-width="1.5" marker-end="url(#la)"/>
<rect x="200" y="145" width="150" height="30" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="275" y="165" text-anchor="middle" font-size="11" fill="currentColor">SSTable L0 (mới)</text>
<rect x="420" y="145" width="210" height="30" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="525" y="165" text-anchor="middle" font-size="11" fill="currentColor">L1: SSTable đã gộp, không overlap</text>
<rect x="420" y="185" width="210" height="30" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="525" y="205" text-anchor="middle" font-size="11" fill="currentColor">L2: lớn hơn ~10x</text>
<rect x="420" y="225" width="210" height="30" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="525" y="245" text-anchor="middle" font-size="11" fill="currentColor">L3: lớn hơn nữa ...</text>
<line x1="350" y1="160" x2="418" y2="160" stroke="currentColor" stroke-width="1.5" marker-end="url(#la)"/>
<text x="384" y="152" text-anchor="middle" font-size="9" fill="currentColor">compaction</text>
<line x1="525" y1="175" x2="525" y2="185" stroke="currentColor" stroke-width="1.5" marker-end="url(#la)"/>
<line x1="525" y1="215" x2="525" y2="225" stroke="currentColor" stroke-width="1.5" marker-end="url(#la)"/>
<rect x="30" y="280" width="600" height="30" rx="6" fill="#f43f5e" fill-opacity="0.10" stroke="currentColor"/>
<text x="330" y="300" text-anchor="middle" font-size="11" fill="currentColor">Read phải hỏi memtable + nhiều SSTable → dùng bloom filter để bỏ qua file không chứa key</text>
<defs><marker id="la" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Luồng:**
1. Write → ghi **WAL** (bền, để recover) + chèn vào **memtable** (cây sorted trong RAM). Write **cực nhanh**: chỉ append tuần tự + insert RAM.
2. Memtable đầy → **flush** ra đĩa thành **SSTable** (Sorted String Table) — file **bất biến (immutable)**, không bao giờ sửa.
3. **DELETE không xoá gì** — nó ghi một **tombstone** (dấu "key này đã bị xoá"). UPDATE = ghi phiên bản mới với timestamp mới. Dữ liệu cũ vẫn nằm ở SSTable cũ.
4. Theo thời gian, dữ liệu một key **rải ra nhiều SSTable** (bản mới, bản cũ, tombstone). Read phải merge chúng, ưu tiên timestamp mới nhất.

### 6.2 Compaction — trái tim của LSM

**Compaction** = tiến trình nền **đọc nhiều SSTable, merge lại, loại bản cũ + tombstone hết hạn, ghi ra SSTable mới**, rồi xoá file cũ. Đây chính là "VACUUM của thế giới LSM": nó **thu hồi không gian** (bỏ dữ liệu chết) và **giữ read nhanh** (ít file phải merge hơn).

```
# RocksDB — theo dõi compaction & amplification
> rocksdb.stats
Level  Files  Size    Read(GB)  Write(GB)  W-Amp
  L0      4    64MB      ...        ...      ...
  L1     10   256MB      ...        ...      3.2   <- mỗi byte user ghi → 3.2 byte đĩa
```

### 6.3 Ba loại amplification — đánh đổi cốt lõi

| Loại | Nghĩa | LSM | B-tree |
|---|---|---|---|
| **Write amplification** | 1 byte user ghi → bao nhiêu byte thực xuống đĩa | **Cao** (compaction viết lại data nhiều lần) | Thấp hơn (nhưng random write) |
| **Read amplification** | 1 read → phải đọc bao nhiêu chỗ | **Cao** (phải hỏi nhiều SSTable + bloom filter) | Thấp (đi thẳng cây tới page) |
| **Space amplification** | Dữ liệu chiếm đĩa / dữ liệu logic thật | Phụ thuộc strategy | Thấp–vừa (bloat như mục 2) |

LSM **tối ưu write** (append tuần tự, ăn đứt B-tree ở write throughput) nhưng **trả giá bằng read + write amplification do compaction**. Chọn **compaction strategy** = chọn amplification nào bạn chịu được.

---

## 7. Compaction strategy: STCS vs LCS vs TWCS

| Strategy | Cách gộp | Ưu | Nhược | Hợp với |
|---|---|---|---|---|
| **STCS** (Size-Tiered) | Gộp các SSTable **cùng cỡ** thành file lớn hơn | Write amp **thấp** | Space amp **cao** (bản cũ tồn tại lâu, cần tới ~2x đĩa lúc compact); read chạm nhiều file | Workload **write-nặng** |
| **LCS** (Leveled) | Xếp theo tầng, mỗi tầng **không overlap key**, tầng sau lớn ~10x | Read amp **thấp** (1 key ≤ 1 file mỗi tầng), space amp thấp | Write amp **cao** (rewrite nhiều) | Workload **read-nặng**, update nhiều |
| **TWCS** (Time-Window) | Gộp theo **cửa sổ thời gian**, mỗi window một nhóm SSTable | Xoá cả window bằng TTL cực rẻ; ít write amp | Chỉ hợp dữ liệu **append theo thời gian**, không update cũ | **Time-series / logs / TTL data** |

**Trực giác chọn:**
- Ghi rất nhiều, ít đọc lại → **STCS** (đừng phí IO rewrite liên tục).
- Đọc nhiều, cần latency ổn định, cập nhật cùng key thường xuyên → **LCS** (chấp nhận write amp để đọc chỉ chạm 1 file/tầng).
- Time-series (metrics, IoT, event log) có TTL → **TWCS** (hết hạn thì **drop nguyên file window**, gần như 0 chi phí — đừng bao giờ dùng LCS/STCS cho time-series, chúng sẽ compact đi compact lại dữ liệu sắp bị xoá).

```sql
-- Cassandra: đặt strategy per-table qua CQL
ALTER TABLE metrics.readings
  WITH compaction = {
    'class': 'TimeWindowCompactionStrategy',
    'compaction_window_unit': 'DAYS',
    'compaction_window_size': 1        -- mỗi SSTable gói dữ liệu 1 ngày
  };

ALTER TABLE app.user_profiles
  WITH compaction = { 'class': 'LeveledCompactionStrategy' };  -- read/update nặng
```

```java
// RocksDB: leveled compaction + bloom filter để giảm read amplification
Options opt = new Options()
    .setCompactionStyle(CompactionStyle.LEVEL)
    .setLevelCompactionDynamicLevelBytes(true)   // tự cân bằng kích thước tầng
    .setMaxBackgroundJobs(4);                     // số thread compaction nền
BlockBasedTableConfig tbl = new BlockBasedTableConfig()
    .setFilterPolicy(new BloomFilter(10));        // ~10 bit/key → bỏ qua SSTable không chứa key
opt.setTableFormatConfig(tbl);
```

> **Bẫy tombstone (Cassandra):** DELETE ghi tombstone, chỉ được dọn sau `gc_grace_seconds` (mặc định 10 ngày, để đồng bộ với các replica khác trước khi quên). Nếu bạn dùng bảng như queue (insert rồi delete liên tục), tombstone chất đống → **read quét qua hàng nghìn tombstone → cực chậm** (`TombstoneOverwhelmingException`). Đây là anti-pattern kinh điển của LSM.

---

## 8. B-tree vs LSM — chọn theo bản chất

<svg viewBox="0 0 660 210" role="img" aria-labelledby="cmp-t cmp-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="cmp-t">So sánh B-tree update tại chỗ và LSM append cộng compaction</title>
<desc id="cmp-d">B-tree sửa page tại chỗ gây random write, LSM chỉ append tuần tự rồi dọn bằng compaction nền</desc>
<rect x="30" y="30" width="290" height="150" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="175" y="55" text-anchor="middle" font-size="13" fill="currentColor">B-tree (update tại chỗ)</text>
<text x="175" y="82" text-anchor="middle" font-size="11" fill="currentColor">Tìm page → sửa ngay tại đó</text>
<text x="175" y="104" text-anchor="middle" font-size="11" fill="currentColor">→ random write, cần WAL</text>
<text x="175" y="126" text-anchor="middle" font-size="11" fill="currentColor">Read nhanh, ổn định</text>
<text x="175" y="148" text-anchor="middle" font-size="11" fill="currentColor">Reclaim: VACUUM (dead tuple)</text>
<text x="175" y="170" text-anchor="middle" font-size="10" fill="currentColor">Postgres, MySQL InnoDB</text>
<rect x="340" y="30" width="290" height="150" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="485" y="55" text-anchor="middle" font-size="13" fill="currentColor">LSM (append + compact)</text>
<text x="485" y="82" text-anchor="middle" font-size="11" fill="currentColor">Chỉ append tuần tự (SSTable)</text>
<text x="485" y="104" text-anchor="middle" font-size="11" fill="currentColor">→ write throughput cao</text>
<text x="485" y="126" text-anchor="middle" font-size="11" fill="currentColor">Read phải merge nhiều file</text>
<text x="485" y="148" text-anchor="middle" font-size="11" fill="currentColor">Reclaim: COMPACTION (nền)</text>
<text x="485" y="170" text-anchor="middle" font-size="10" fill="currentColor">Cassandra, RocksDB, HBase</text>
</svg>

**Điểm chung sâu xa:** cả hai đều **không xoá tại chỗ** — B-tree để lại dead tuple, LSM để lại bản cũ + tombstone. Cả hai đều cần một **tiến trình dọn nền** để thu hồi đĩa và giữ hiệu năng: **VACUUM** cho B-tree, **compaction** cho LSM. Khác biệt là B-tree tối ưu read/space, LSM tối ưu write — và cái giá của LSM là amplification do compaction gây ra.

Chọn B-tree khi: query đa dạng, cần read latency ổn định, transaction phức tạp, update rải rác. Chọn LSM khi: write throughput khổng lồ (ingestion, time-series, log, counter), key-value hoặc wide-column, chấp nhận đọc phức tạp hơn.

---

## 9. Tóm tắt
- DELETE/UPDATE **không trả đĩa ngay** vì **MVCC** giữ phiên bản cũ (dead tuple) cho transaction khác đọc → **bloat** bảng và index.
- **VACUUM** thường chỉ **đánh dấu tái dùng** (không trả OS); **VACUUM FULL** rewrite + **khoá**; **pg_repack** co bảng **online**. Trả đĩa thật chỉ khi thực sự cần.
- **Autovacuum tụt hậu** ở bảng write-nặng vì scale_factor 20% quá trễ, cost limit bóp ga, và **transaction dài chặn dọn**. Tune per-table: giảm scale_factor, nới cost limit, diệt transaction dài.
- **TXID wraparound** là mối nguy chết người: XID 32-bit quay vòng, chạm giới hạn → **DB dừng nhận write**. **Không bao giờ tắt autovacuum**; alert theo `age(relfrozenxid)`.
- **LSM-tree**: write append vào memtable → flush SSTable bất biến → **compaction** gộp file, dọn bản cũ/tombstone. Cân bằng **write/read/space amplification**.
- **Strategy**: STCS (write-nặng), LCS (read-nặng), TWCS (time-series/TTL). Coi chừng **tombstone chất đống** khi dùng LSM như queue.
- Bản chất chung: B-tree (update tại chỗ, dọn bằng VACUUM) vs LSM (append + compact) — cả hai đều cần **tiến trình dọn nền** để thu hồi đĩa.

> **Bài tiếp theo:** đi sâu vào **backup, PITR & disaster recovery** — WAL archiving, snapshot, RPO/RTO và cách khôi phục về đúng một thời điểm.
