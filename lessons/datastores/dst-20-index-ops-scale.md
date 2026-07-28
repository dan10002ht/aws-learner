# Bài 21 — Index ở production: build IO, bloat & maintenance

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **chính xác chi phí IO khi build một index** — full scan, sort trong `maintenance_work_mem`, tràn thì sort đĩa, ghi index pages + WAL — và vì sao build index **đẩy hot data khỏi cache**.
- Hiểu **index bloat**: vì sao MVCC của Postgres làm index phình ra theo update/delete, và cách đo/khắc phục bằng **REINDEX CONCURRENTLY** hoặc **pg_repack**.
- **Phát hiện index thừa/trùng/không dùng** bằng `pg_stat_user_indexes`, và định giá được cái giá thật của một index thừa (chậm write, tốn đĩa, tốn cache).
- Dùng **invisible index (MySQL)** và **hypothetical index / HypoPG (Postgres)** để **test an toàn** trước khi thật sự tạo hoặc xoá index.
- Biết **khi nào index làm hệ CHẬM đi**: bảng write-heavy, cột low-selectivity.

---

## 2. Build một index tốn gì? (mổ xẻ từng đồng IO)

Một `CREATE INDEX idx ON t(col)` nhìn thì một dòng, nhưng bên dưới nó chạy qua **bốn công đoạn ngốn tài nguyên**:

<svg viewBox="0 0 680 250" role="img" aria-labelledby="bi-t bi-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="bi-t">Bốn công đoạn IO khi build một B-tree index</title>
<desc id="bi-d">Full scan bảng, sort trong bộ nhớ hoặc tràn ra đĩa, ghi các index page, và ghi WAL kèm ship sang replica</desc>
<rect x="20" y="40" width="150" height="70" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="66" text-anchor="middle" font-size="12" fill="currentColor">1. Full scan bảng</text>
<text x="95" y="84" text-anchor="middle" font-size="10" fill="currentColor">đọc mọi heap page</text>
<text x="95" y="99" text-anchor="middle" font-size="10" fill="currentColor">(hàng trăm GB)</text>
<rect x="190" y="40" width="150" height="70" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="265" y="60" text-anchor="middle" font-size="12" fill="currentColor">2. Sort key</text>
<text x="265" y="78" text-anchor="middle" font-size="10" fill="currentColor">vừa RAM → in-memory</text>
<text x="265" y="93" text-anchor="middle" font-size="10" fill="currentColor">tràn → sort trên ĐĨA</text>
<rect x="360" y="40" width="150" height="70" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="435" y="66" text-anchor="middle" font-size="12" fill="currentColor">3. Ghi index pages</text>
<text x="435" y="84" text-anchor="middle" font-size="10" fill="currentColor">dựng B-tree tuần tự</text>
<text x="435" y="99" text-anchor="middle" font-size="10" fill="currentColor">bottom-up</text>
<rect x="530" y="40" width="150" height="70" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="605" y="66" text-anchor="middle" font-size="12" fill="currentColor">4. Ghi WAL</text>
<text x="605" y="84" text-anchor="middle" font-size="10" fill="currentColor">log index + ship</text>
<text x="605" y="99" text-anchor="middle" font-size="10" fill="currentColor">sang replica</text>
<line x1="170" y1="75" x2="188" y2="75" stroke="currentColor" stroke-width="1.5" marker-end="url(#ba)"/>
<line x1="340" y1="75" x2="358" y2="75" stroke="currentColor" stroke-width="1.5" marker-end="url(#ba)"/>
<line x1="510" y1="75" x2="528" y2="75" stroke="currentColor" stroke-width="1.5" marker-end="url(#ba)"/>
<rect x="20" y="150" width="660" height="72" rx="8" fill="#f43f5e" fill-opacity="0.12" stroke="currentColor"/>
<text x="350" y="174" text-anchor="middle" font-size="12" fill="currentColor">Tác dụng phụ chí mạng: full scan kéo mọi heap page qua buffer cache</text>
<text x="350" y="194" text-anchor="middle" font-size="11" fill="currentColor">→ EVICT dữ liệu nóng mà các query online đang cần</text>
<text x="350" y="212" text-anchor="middle" font-size="11" fill="currentColor">→ cache hit ratio tụt → p99 của TOÀN hệ tăng, không chỉ lệnh build</text>
<defs><marker id="ba" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Công đoạn 1 — full table scan.** Để dựng index, engine phải đọc **giá trị của cột được index ở mọi dòng còn sống**. Với B-tree Postgres đọc tuần tự toàn bộ heap. Bảng 300 GB nghĩa là 300 GB đọc đĩa, tiêu IOPS/throughput trong nhiều phút tới hàng giờ.

**Công đoạn 2 — sort.** Các key phải được sắp thứ tự trước khi nhồi vào B-tree. Postgres sort trong `maintenance_work_mem`. Nếu tập key **vừa bộ nhớ** → in-memory quicksort, nhanh. **Tràn** → external merge sort: ghi các "run" đã sort ra **temp file trên đĩa** rồi trộn lại — nhân đôi lượng IO và có thể lấp đầy `temp` tablespace. Đây là lý do khi build index lớn người ta tạm nâng `maintenance_work_mem`:

```sql
-- Chỉ cho session này: cho phép sort nhiều key trong RAM, giảm tràn đĩa
SET maintenance_work_mem = '2GB';
-- Postgres 11+: build song song nhiều worker (tăng CPU, giảm thời gian tường).
-- LƯU Ý: parallel build CHỈ áp dụng cho CREATE INDEX thường — CREATE INDEX
-- CONCURRENTLY luôn chạy ĐƠN LUỒNG (không dùng worker), đổi lại là không khoá ghi.
SET max_parallel_maintenance_workers = 4;
CREATE INDEX idx_orders_created ON orders (created_at);              -- có parallel, nhưng KHOÁ ghi
-- CREATE INDEX CONCURRENTLY idx_orders_created ON orders (created_at); -- không khoá ghi, nhưng đơn luồng & lâu hơn
```

**Công đoạn 3 — ghi index pages.** B-tree được dựng **bottom-up** từ dữ liệu đã sort (nhanh hơn nhiều so với chèn từng key). Kích thước index đáng kể: một B-tree trên cột `bigint` của bảng 500M dòng thường **10–15 GB** — toàn bộ phải ghi xuống đĩa.

**Công đoạn 4 — WAL.** Việc build được **ghi vào WAL** (trừ vài trường hợp `wal_level=minimal` không nhân bản). Nghĩa là ghi **gấp đôi**: index pages + WAL của chính chúng; rồi WAL đó bị **ship sang replica** và replay ở đó — build index ở master cũng làm **replica lag** (xem lại [[be-02-database-engineering]] và Bài 20 về migration).

> **Chốt IO:** build index = full scan (đọc) + sort (có thể tràn đĩa) + ghi index + ghi/ship WAL. Nhưng thứ giết hệ thống thường **không phải** bản thân lệnh build, mà là **cache eviction**: quét cả bảng đẩy working set nóng khỏi buffer cache, khiến **mọi query khác** đột nhiên phải đi đĩa. Luôn build **giờ thấp điểm** và ưu tiên `CONCURRENTLY`.

---

## 3. Index bloat — vì sao index tự phình

Đây là đặc trưng của **MVCC** (Multi-Version Concurrency Control) trong Postgres, và là nguồn đau âm ỉ ở production.

**Bản chất:** khi bạn `UPDATE` một dòng, Postgres **không sửa tại chỗ** — nó ghi một **phiên bản dòng mới (new tuple)** ở vị trí khác và đánh dấu phiên bản cũ là "chết" (dead). Vì phiên bản mới nằm ở **ctid (địa chỉ vật lý) khác**, **mọi index trỏ tới dòng đó phải thêm một entry mới** trỏ tới ctid mới. Entry cũ trong index trỏ tới tuple chết thì **vẫn còn nằm đó** cho tới khi được dọn.

Analogy: index như **mục lục sách**. Mỗi lần sửa một trang, thay vì tẩy xoá bạn **chép trang đó sang tờ mới ở cuối** và **thêm một dòng mục lục** trỏ tới tờ mới — dòng mục lục cũ vẫn nằm đó. Sửa nhiều lần → mục lục dày cộp toàn dòng trỏ tới trang đã bỏ.

<svg viewBox="0 0 660 240" role="img" aria-labelledby="bl-t bl-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="bl-t">MVCC làm index bloat qua nhiều lần update</title>
<desc id="bl-d">Mỗi update tạo tuple mới và index entry mới, entry cũ trỏ tới dead tuple chỉ được dọn khi autovacuum chạy</desc>
<text x="120" y="30" text-anchor="middle" font-size="12" fill="currentColor">Index (B-tree)</text>
<rect x="30" y="40" width="180" height="26" rx="4" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="57" text-anchor="middle" font-size="10" fill="currentColor">entry → tuple v1 (DEAD)</text>
<rect x="30" y="72" width="180" height="26" rx="4" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="89" text-anchor="middle" font-size="10" fill="currentColor">entry → tuple v2 (DEAD)</text>
<rect x="30" y="104" width="180" height="26" rx="4" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="121" text-anchor="middle" font-size="10" fill="currentColor">entry → tuple v3 (DEAD)</text>
<rect x="30" y="136" width="180" height="26" rx="4" fill="#10b981" fill-opacity="0.18" stroke="currentColor"/>
<text x="120" y="153" text-anchor="middle" font-size="10" fill="currentColor">entry → tuple v4 (LIVE)</text>
<text x="120" y="192" text-anchor="middle" font-size="10" fill="currentColor">4 update cùng 1 dòng</text>
<text x="120" y="208" text-anchor="middle" font-size="10" fill="currentColor">→ 4 index entry, 3 rác</text>
<rect x="300" y="40" width="150" height="122" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="375" y="62" text-anchor="middle" font-size="11" fill="currentColor">autovacuum</text>
<text x="375" y="82" text-anchor="middle" font-size="9.5" fill="currentColor">dọn dead entry,</text>
<text x="375" y="98" text-anchor="middle" font-size="9.5" fill="currentColor">nhưng KHÔNG trả</text>
<text x="375" y="114" text-anchor="middle" font-size="9.5" fill="currentColor">đĩa cho OS —</text>
<text x="375" y="130" text-anchor="middle" font-size="9.5" fill="currentColor">page vẫn phình,</text>
<text x="375" y="146" text-anchor="middle" font-size="9.5" fill="currentColor">chỉ đánh dấu trống</text>
<line x1="210" y1="100" x2="298" y2="100" stroke="currentColor" stroke-width="1.5" marker-end="url(#bx)"/>
<rect x="490" y="40" width="150" height="122" rx="8" fill="#f43f5e" fill-opacity="0.12" stroke="currentColor"/>
<text x="565" y="66" text-anchor="middle" font-size="11" fill="currentColor">Hệ quả:</text>
<text x="565" y="88" text-anchor="middle" font-size="9.5" fill="currentColor">index to hơn thực</text>
<text x="565" y="104" text-anchor="middle" font-size="9.5" fill="currentColor">→ ít fit cache</text>
<text x="565" y="120" text-anchor="middle" font-size="9.5" fill="currentColor">→ scan nhiều page</text>
<text x="565" y="136" text-anchor="middle" font-size="9.5" fill="currentColor">→ query chậm dần</text>
<line x1="450" y1="100" x2="488" y2="100" stroke="currentColor" stroke-width="1.5" marker-end="url(#bx)"/>
<defs><marker id="bx" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Tối ưu HOT (Heap-Only Tuple):** Postgres có một cứu cánh — nếu update **không đụng cột nào được index** và page cũ **còn chỗ trống**, nó làm HOT update: tuple mới nằm cùng page và **index KHÔNG cần entry mới**. Vì thế `fillfactor < 100` (chừa chỗ trống trong page) và **tránh index cột hay bị update** giúp giảm bloat mạnh.

**autovacuum dọn nhưng không thu nhỏ.** autovacuum đánh dấu dead entry là trống để tái sử dụng, nhưng **không trả không gian lại cho OS** và **không dồn (compact) B-tree**. Nếu ghi/xoá theo đợt lớn, index có thể phình gấp 2–3 lần dữ liệu thật rồi ở lì đó.

### 3.1 Đo bloat

```sql
-- Kích thước thật của mỗi index (đã bao gồm cả phần bloat)
SELECT
  schemaname, relname AS table, indexrelname AS index,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  idx_scan
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- Ước lượng % bloat (dùng extension pgstattuple — chính xác nhưng quét index)
CREATE EXTENSION IF NOT EXISTS pgstattuple;
SELECT avg_leaf_density, leaf_fragmentation
FROM pgstatindex('idx_orders_created');
-- avg_leaf_density thấp (vd < 50%) = index rỗng phân nửa = bloat nặng
```

### 3.2 Khắc phục: REINDEX CONCURRENTLY vs pg_repack

```sql
-- Postgres 12+: dựng lại index MÀ KHÔNG chặn ghi (build bản mới, swap, drop bản cũ)
REINDEX INDEX CONCURRENTLY idx_orders_created;

-- Cả một bảng / cả schema
REINDEX TABLE CONCURRENTLY orders;
```

`REINDEX CONCURRENTLY` giải quyết bloat **index**. Nhưng nếu bản thân **heap (bảng)** cũng bloat, hoặc bạn cần dồn cả bảng + toàn bộ index cùng lúc, dùng **pg_repack** — công cụ ngoài, tạo bản sao chặt của bảng qua trigger rồi swap nguyên tử, **không cần ACCESS EXCLUSIVE lâu**:

```bash
# Dồn (compact) cả bảng orders và mọi index của nó, gần như không khoá
pg_repack -d shop --table=orders --jobs=4
```

| | `VACUUM FULL` | `REINDEX CONCURRENTLY` | `pg_repack` |
|---|---|---|---|
| Khoá | ACCESS EXCLUSIVE (chặn tất cả) ❌ | Không chặn ghi ✓ | Chỉ khoá ngắn lúc swap ✓ |
| Phạm vi | Cả bảng + index | Chỉ index | Bảng + index |
| Cần dung lượng dư | ~2x bảng | ~2x index | ~2x bảng |
| Production-safe | Không | Có | Có |

> **Nguyên tắc:** production **không dùng `VACUUM FULL`** trên bảng đang phục vụ (nó khoá cứng). Chọn `REINDEX CONCURRENTLY` cho bloat index, `pg_repack` cho bloat heap + index.

---

## 4. Index thừa / trùng / không dùng — kẻ ăn bám thầm lặng

Mỗi index bạn tạo là một **thứ phải được cập nhật trên MỌI write**. Một index "để đó cho chắc" nhưng query nào cũng không dùng thì **thuần tuý là chi phí**: chậm mọi INSERT/UPDATE/DELETE, tốn đĩa, tốn cache, tốn cả thời gian build khi restore/replica.

### 4.1 Tìm index không dùng

```sql
-- Index chưa từng được planner chọn kể từ lần reset thống kê gần nhất
SELECT
  schemaname, relname AS table, indexrelname AS index,
  idx_scan,                                    -- số lần index được dùng để scan
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0                             -- KHÔNG dùng lần nào
  AND indexrelid NOT IN (                      -- loại trừ index phục vụ constraint
    SELECT conindid FROM pg_constraint WHERE conindid <> 0
  )
ORDER BY pg_relation_size(indexrelid) DESC;
```

⚠️ **Cẩn trọng khi đọc `idx_scan = 0`:**
- Thống kê tính từ lần **reset gần nhất** — nếu vừa reset hôm qua thì "chưa dùng" là vô nghĩa. Xem `stats_reset` trong `pg_stat_database`.
- Index có thể chỉ dùng **theo mùa** (báo cáo cuối tháng, job đêm). Quan sát ít nhất **một chu kỳ nghiệp vụ đầy đủ**.
- Trên hệ có **replica**, thống kê `idx_scan` là **cục bộ mỗi node** — một index có thể idle ở primary nhưng bận rộn ở read replica. Phải tổng hợp qua tất cả node.
- **UNIQUE index / PK / FK** dù `idx_scan=0` vẫn có thể cần để **đảm bảo ràng buộc** — đừng xoá.

### 4.2 Tìm index trùng / chồng lấp prefix

Một B-tree trên `(a, b, c)` **phục vụ được** truy vấn lọc theo `a`, `(a,b)`, `(a,b,c)` — vì thứ tự cột là prefix. Do đó một index `(a)` riêng thường **thừa** nếu đã có `(a, b)`:

```sql
-- Phát hiện index mà cột của nó là PREFIX của một index khác trên cùng bảng
SELECT
  a.indexrelid::regclass AS redundant_idx,
  b.indexrelid::regclass AS covering_idx
FROM pg_index a
JOIN pg_index b
  ON a.indrelid = b.indrelid          -- cùng bảng
 AND a.indexrelid <> b.indexrelid
 AND a.indkey::text = left(b.indkey::text, length(a.indkey::text))  -- a là prefix của b
WHERE NOT a.indisprimary AND NOT a.indisunique;   -- đừng đụng PK/unique
```

| Tình huống | Cách xử lý |
|---|---|
| Có `(user_id)` **và** `(user_id, created_at)` | Xoá `(user_id)` — index rộng phục vụ luôn |
| Hai index **giống hệt** (do migration lặp) | Giữ 1, drop 1 |
| `(a, b)` và `(b, a)` | **KHÔNG** trùng — thứ tự cột khác, phục vụ query khác nhau |
| Index thừa nhưng đang là **UNIQUE**/FK target | Cân nhắc kỹ, có thể phải giữ vì ràng buộc |

### 4.3 Cái giá thật của index thừa

Mỗi INSERT vào bảng có **N index** = ghi 1 heap tuple + **N lần chèn index entry** + WAL cho tất cả. Bảng có 8 index đôi khi ghi **chậm gấp 3–4 lần** so với 2 index. Với bảng write-heavy (log, event, order), cắt index thừa là một trong những cách tăng throughput ghi rẻ nhất.

---

## 5. Test an toàn trước khi tạo/xoá index

Vấn đề kinh điển: bạn nghi một index thừa nhưng **sợ xoá** vì lỡ có query bí ẩn đang dùng. Hoặc muốn thêm index nhưng **không dám** trả giá build 30 phút chỉ để phát hiện planner không thèm dùng. Có hai kỹ thuật production-grade để thử **không tốn IO build**.

### 5.1 MySQL — Invisible Index

MySQL 8 cho phép đánh dấu index **INVISIBLE**: index **vẫn được duy trì đầy đủ** (mọi write vẫn cập nhật nó) nhưng **optimizer bỏ qua** nó khi lập kế hoạch. Dùng để **giả lập việc xoá** mà không thật sự xoá:

```sql
-- Nghi idx_status thừa? Ẩn nó đi, KHÔNG xoá
ALTER TABLE orders ALTER INDEX idx_status INVISIBLE;

-- Quan sát production vài giờ/ngày: có query nào chậm đi, có slow log mới không?
-- An toàn → thật sự xoá:
ALTER TABLE orders DROP INDEX idx_status;

-- Nếu có gì đó cần nó → bật lại TỨC THÌ, không phải build lại:
ALTER TABLE orders ALTER INDEX idx_status VISIBLE;
```

Điểm ăn tiền: bật/tắt visible là thao tác **metadata tức thì**, còn `DROP` rồi phát hiện sai thì phải **build lại** (tốn IO như mục 2). Invisible index biến quyết định xoá index từ "một chiều" thành "có nút undo".

### 5.2 Postgres — Hypothetical Index (HypoPG)

Chiều ngược lại: muốn biết **một index CHƯA tồn tại có được planner dùng không** mà **không tốn công build**. Extension **HypoPG** tạo index "ảo" — chỉ tồn tại trong session, planner coi như có thật khi tính cost, nhưng **không có byte nào được ghi**:

```sql
CREATE EXTENSION IF NOT EXISTS hypopg;

-- Tạo index GIẢ ĐỊNH (0 IO, chỉ trong RAM của session này)
SELECT * FROM hypopg_create_index(
  'CREATE INDEX ON orders (customer_id, created_at)'
);

-- Hỏi planner: NẾU có index đó, kế hoạch có đổi không?
EXPLAIN SELECT * FROM orders
WHERE customer_id = 42 ORDER BY created_at DESC LIMIT 20;
-- Nếu EXPLAIN cho thấy "Index Scan using <hypopg...>" → planner SẼ dùng → đáng build thật.
-- Nếu vẫn Seq Scan → index này vô dụng, KHỎI build, tiết kiệm 30 phút + IO.

-- Dọn index ảo (hoặc chỉ cần đóng session)
SELECT hypopg_reset();
```

> **Quy trình chuẩn:** (1) HypoPG để **xác nhận index mới đáng giá** trước khi build thật; (2) Invisible index (MySQL) hoặc theo dõi `idx_scan` (PG) để **xác nhận index cũ có thể xoá** an toàn. Không bao giờ tạo/xoá index quan trọng chỉ bằng linh cảm.

---

## 6. Khi nào index làm hệ CHẬM đi

Index không miễn phí. Có hai trường hợp index là **gánh nặng ròng**:

**1. Bảng write-heavy.** Mỗi index làm chậm mọi write (mục 4.3). Trên một event/audit table ghi 50k dòng/s mà đọc thưa thớt, mỗi index thêm vào là mỗi lần cắt throughput ghi. Ở đây **ít index là tốt** — chỉ giữ index thực sự phục vụ truy vấn nóng.

**2. Cột low-selectivity (độ chọn lọc thấp).** Index chỉ đáng giá khi nó **loại bỏ được phần lớn dòng**. Cột `gender`, `status` (chỉ vài giá trị), hay `is_active=true` (95% dòng) có selectivity kém: một truy vấn `WHERE status='active'` khớp 90% bảng thì **đi index rồi nhảy về heap từng dòng còn ĐẮT HƠN đọc tuần tự cả bảng** (random IO vs sequential IO). Planner biết điều này và thường **cố tình bỏ index** — nên index đó chỉ tổ làm chậm write mà chẳng ai dùng.

<svg viewBox="0 0 660 170" role="img" aria-labelledby="sel-t sel-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="sel-t">Selectivity quyết định index có đáng dùng</title>
<desc id="sel-d">Cột selectivity cao thì index scan rẻ, cột selectivity thấp thì seq scan lại rẻ hơn vì tránh random IO</desc>
<rect x="20" y="30" width="300" height="110" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="170" y="54" text-anchor="middle" font-size="12" fill="currentColor">Selectivity CAO (tốt)</text>
<text x="170" y="76" text-anchor="middle" font-size="10" fill="currentColor">WHERE email = '...' → khớp 1 dòng</text>
<text x="170" y="96" text-anchor="middle" font-size="10" fill="currentColor">Index đọc vài page → nhảy đúng 1 heap row</text>
<text x="170" y="120" text-anchor="middle" font-size="11" fill="currentColor">→ Index Scan thắng lớn ✓</text>
<rect x="340" y="30" width="300" height="110" rx="8" fill="#f43f5e" fill-opacity="0.12" stroke="currentColor"/>
<text x="490" y="54" text-anchor="middle" font-size="12" fill="currentColor">Selectivity THẤP (xấu)</text>
<text x="490" y="76" text-anchor="middle" font-size="10" fill="currentColor">WHERE active = true → khớp 90% bảng</text>
<text x="490" y="96" text-anchor="middle" font-size="10" fill="currentColor">Index → random-jump về heap 90% số dòng</text>
<text x="490" y="120" text-anchor="middle" font-size="11" fill="currentColor">→ Seq Scan rẻ hơn, index vô dụng ✗</text>
<defs></defs>
</svg>

**Mẹo cho low-selectivity:** thay vì index toàn cột, dùng **partial index** — chỉ index đúng phần hiếm mà truy vấn quan tâm:

```sql
-- Thay vì index cả cột status (99% là 'done'), chỉ index dòng đang cần xử lý:
CREATE INDEX CONCURRENTLY idx_orders_pending
  ON orders (created_at)
  WHERE status = 'pending';         -- index nhỏ xíu, cực nhanh cho hàng chờ xử lý
```

Partial index nhỏ hơn nhiều → fit cache, rẻ khi update (chỉ đụng khi dòng thoả điều kiện), và cực hiệu quả cho các query "tìm việc cần làm".

---

## 7. Tóm tắt
- **Build index** = full scan (đọc cả bảng) + sort (`maintenance_work_mem`, tràn thì **sort đĩa**) + ghi index pages + **ghi/ship WAL**. Thứ giết p99 thường là **cache eviction** khi quét bảng đẩy hot data khỏi buffer cache. Build giờ thấp điểm, dùng `CONCURRENTLY`.
- **Index bloat** sinh từ **MVCC**: mỗi update tạo tuple mới + index entry mới; autovacuum dọn nhưng **không thu nhỏ**. Đo bằng `pgstattuple`/`pgstatindex`, khắc phục bằng **`REINDEX CONCURRENTLY`** (bloat index) hoặc **`pg_repack`** (bloat heap+index). **Không** dùng `VACUUM FULL` ở production.
- **Index thừa/trùng/không dùng**: soi `pg_stat_user_indexes.idx_scan = 0` (thận trọng với chu kỳ/reset/replica), phát hiện **chồng lấp prefix** — `(a)` thừa nếu đã có `(a,b)`. Giá của index thừa: **chậm mọi write**, tốn đĩa và cache.
- Test an toàn: **invisible index (MySQL)** để giả lập xoá có nút undo; **HypoPG (Postgres)** để thử index mới **không tốn IO build**.
- Index làm **chậm** hệ khi: bảng **write-heavy** (mỗi index cắt throughput ghi) và cột **low-selectivity** (planner bỏ qua, chỉ tổ tốn). Dùng **partial index** cho các trường hợp lệch phân bố.

> **Bài tiếp theo (Bài 22):** đi vào **connection pooling & quản lý kết nối ở quy mô lớn** — vì sao mỗi connection Postgres là một process tốn RAM, PgBouncer transaction pooling, và bẫy prepared statement khi pool.
