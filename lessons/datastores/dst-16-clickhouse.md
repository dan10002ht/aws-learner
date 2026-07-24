# Bài 16 — ClickHouse: columnar OLAP tốc độ cao

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **ClickHouse là gì** và vì sao nó quét hàng tỉ dòng để tính tổng/nhóm chỉ trong **mili giây**.
- Hiểu bản chất **columnar storage** (lưu theo cột) và vì sao nó thắng row-store cho **OLAP**.
- Nắm engine **MergeTree**: dữ liệu sắp theo `ORDER BY`, **sparse primary index**, **part** và **merge nền**.
- Dùng đúng **PARTITION BY**, **TTL**, và **materialized view** để pre-aggregate.
- Biết **khi nào chọn ClickHouse** so với data warehouse (BigQuery/Snowflake) và **hạn chế** (không hợp OLTP, update kém).
- Viết được **DDL + query** thực chạy.

---

## 2. Lý thuyết

### 2.1 OLTP vs OLAP — hai thế giới khác nhau

> **OLTP** (Online Transaction Processing) là các hệ như Postgres/MySQL: nhiều giao dịch nhỏ, đọc/ghi **vài dòng theo primary key**, có transaction, update thường xuyên. **OLAP** (Online Analytical Processing) là phân tích: quét **hàng triệu–tỉ dòng**, tính `SUM`, `COUNT`, `GROUP BY`, `AVG` trên vài cột, ghi theo **lô lớn**, gần như không update dòng lẻ.

**ClickHouse** là một **column-oriented OLAP database** sinh ra cho vế thứ hai: dashboard, phân tích log/event, time-series, ad-tech, observability. Nó không cố làm ngân hàng chuyển tiền — nó cố trả lời "doanh thu theo giờ trong 90 ngày, nhóm theo quốc gia" trên vài tỉ dòng trong tích tắc.

### 2.2 Columnar storage — vì sao lưu theo cột lại nhanh

Hãy tưởng tượng một bảng `events(user_id, country, ts, amount, url, ...)` với 40 cột và 1 tỉ dòng. Câu hỏi: `SELECT country, SUM(amount) FROM events GROUP BY country`.

- **Row-store** (Postgres) xếp dữ liệu **theo dòng** trên đĩa: `[dòng1: mọi cột][dòng2: mọi cột]...`. Để cộng `amount` nó buộc phải đọc **toàn bộ 40 cột của cả tỉ dòng** rồi bỏ đi 38 cột — lãng phí khủng khiếp I/O.
- **Column-store** (ClickHouse) xếp **theo cột**: tất cả giá trị `country` nằm liền một khối, tất cả `amount` nằm liền một khối khác. Truy vấn trên chỉ đọc đúng **2 cột** cần dùng.

<svg viewBox="0 0 660 250" role="img" aria-labelledby="ch-t ch-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="ch-t">Row-store so với Column-store</title>
<desc id="ch-d">Row-store lưu mọi cột của từng dòng liền nhau nên phải đọc thừa; column-store lưu mỗi cột thành một khối liền nhau nên chỉ đọc đúng cột cần</desc>
<text x="150" y="24" text-anchor="middle" font-size="13" fill="currentColor">Row-store (đọc thừa)</text>
<rect x="30" y="40" width="240" height="26" rx="4" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="150" y="57" text-anchor="middle" font-size="10" fill="currentColor">dòng1: id | country | amount | url ...</text>
<rect x="30" y="72" width="240" height="26" rx="4" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="150" y="89" text-anchor="middle" font-size="10" fill="currentColor">dòng2: id | country | amount | url ...</text>
<rect x="30" y="104" width="240" height="26" rx="4" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="150" y="121" text-anchor="middle" font-size="10" fill="currentColor">dòng3: id | country | amount | url ...</text>
<text x="150" y="152" text-anchor="middle" font-size="11" fill="currentColor">SUM(amount) vẫn phải đọc mọi cột</text>
<text x="510" y="24" text-anchor="middle" font-size="13" fill="currentColor">Column-store (đọc đúng)</text>
<rect x="360" y="40" width="70" height="90" rx="4" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="395" y="88" text-anchor="middle" font-size="10" fill="currentColor">id</text>
<rect x="435" y="40" width="70" height="90" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="470" y="88" text-anchor="middle" font-size="10" fill="currentColor">country</text>
<rect x="510" y="40" width="70" height="90" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="545" y="88" text-anchor="middle" font-size="10" fill="currentColor">amount</text>
<rect x="585" y="40" width="55" height="90" rx="4" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="612" y="88" text-anchor="middle" font-size="10" fill="currentColor">url</text>
<text x="510" y="152" text-anchor="middle" font-size="11" fill="currentColor">Chỉ đọc country và amount</text>
<rect x="435" y="34" width="145" height="102" rx="6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/>
</svg>

Ba lợi thế cộng dồn khiến aggregation **cực nhanh**:

1. **Đọc ít cột (I/O nhỏ):** chỉ chạm đúng cột cần → giảm hàng chục lần lượng byte đọc từ đĩa.
2. **Nén (compression) tốt hơn nhiều:** các giá trị **cùng kiểu, cùng miền** nằm cạnh nhau nén rất chặt (LZ4/ZSTD, delta, double-delta cho time-series). Cột `country` chỉ vài giá trị lặp lại → nén cả trăm lần. Nén tốt = ít byte đọc = càng nhanh.
3. **Vectorized execution:** ClickHouse xử lý theo **khối (block) hàng nghìn giá trị một lần** bằng lệnh SIMD của CPU thay vì lặp từng dòng. Cộng thêm **parallel** trên mọi core và mọi shard.

Đọc-ít-cột + nén-chặt + vectorize + parallel là **bốn động cơ** đằng sau con số "quét vài tỉ dòng trong dưới một giây".

### 2.3 MergeTree — trái tim của ClickHouse

`MergeTree` là **table engine** chủ lực. Ba ý phải nắm:

**(a) Dữ liệu được sắp xếp vật lý theo `ORDER BY`.** Khi insert, ClickHouse ghi ra một **part** (thư mục trên đĩa) trong đó các dòng đã **sort theo sorting key**. Sort key quyết định (i) thứ tự vật lý, (ii) chất lượng nén (giá trị giống nhau gần nhau), (iii) khả năng bỏ qua dữ liệu khi query. Đây là quyết định thiết kế **quan trọng nhất** của một bảng ClickHouse.

**(b) Sparse primary index.** Khác B-tree của OLTP (mỗi dòng một entry), ClickHouse chỉ ghi **một entry cho mỗi granule** — mặc định mỗi **8192 dòng** một mốc (`index_granularity`). Index vì thế **thưa (sparse)** và **đủ nhỏ để nằm gọn trong RAM** kể cả với bảng tỉ dòng. Khi query có điều kiện trên tiền tố sort key, ClickHouse dùng index để **nhảy thẳng tới các granule liên quan** và bỏ qua phần còn lại — gọi là **data skipping**.

<svg viewBox="0 0 640 210" role="img" aria-labelledby="mt-t mt-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="mt-t">Sparse primary index nhảy tới granule</title>
<desc id="mt-d">Primary index chỉ lưu một mốc cho mỗi granule 8192 dòng; query dùng mốc để bỏ qua các granule không liên quan và chỉ đọc granule chứa dữ liệu cần</desc>
<rect x="20" y="30" width="150" height="150" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="52" text-anchor="middle" font-size="12" fill="currentColor">Primary index</text>
<text x="95" y="70" text-anchor="middle" font-size="10" fill="currentColor">(sparse, trong RAM)</text>
<text x="95" y="96" text-anchor="middle" font-size="10" fill="currentColor">mark0 → 2026-01-01</text>
<text x="95" y="116" text-anchor="middle" font-size="10" fill="currentColor">mark1 → 2026-02-10</text>
<text x="95" y="136" text-anchor="middle" font-size="10" fill="currentColor">mark2 → 2026-03-20</text>
<text x="95" y="156" text-anchor="middle" font-size="10" fill="currentColor">mark3 → 2026-05-01</text>
<rect x="260" y="30" width="120" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="51" text-anchor="middle" font-size="10" fill="currentColor">granule0 (8192 dòng)</text>
<rect x="260" y="72" width="120" height="34" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="93" text-anchor="middle" font-size="10" fill="currentColor">granule1 ← cần đọc</text>
<rect x="260" y="114" width="120" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="135" text-anchor="middle" font-size="10" fill="currentColor">granule2 (bỏ qua)</text>
<rect x="260" y="156" width="120" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="177" text-anchor="middle" font-size="10" fill="currentColor">granule3 (bỏ qua)</text>
<line x1="170" y1="112" x2="255" y2="89" stroke="currentColor" stroke-width="1.5" marker-end="url(#am)"/>
<text x="470" y="100" text-anchor="middle" font-size="11" fill="currentColor">WHERE ts BETWEEN</text>
<text x="470" y="118" text-anchor="middle" font-size="11" fill="currentColor">'2026-02-10' AND ...</text>
<text x="470" y="146" text-anchor="middle" font-size="11" fill="currentColor">chỉ đọc granule1</text>
<defs><marker id="am" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**(c) Part và merge nền.** Mỗi lần insert tạo một **part** mới bất biến (immutable). Nếu để nguyên, bảng sẽ có hàng nghìn part nhỏ → query chậm. Một tiến trình nền liên tục **merge** các part nhỏ thành part lớn hơn (giống merge sort), giữ dữ liệu vẫn sort theo `ORDER BY`. Đây là chữ "Merge" trong MergeTree. Hệ quả thực tế: **insert theo lô lớn** (hàng nghìn–triệu dòng/lần), tránh insert từng dòng (mỗi dòng một part → "too many parts", nghẽn merge).

Các biến thể quan trọng của MergeTree:

| Engine | Dùng khi |
|--------|----------|
| `MergeTree` | Bảng thô thông thường |
| `ReplacingMergeTree` | Khử trùng lặp theo sort key khi merge (mô phỏng "update"/dedup) |
| `SummingMergeTree` | Tự cộng dồn các cột số theo sort key khi merge |
| `AggregatingMergeTree` | Lưu trạng thái aggregate (dùng với materialized view) |
| `CollapsingMergeTree` / `VersionedCollapsing` | Sửa/xoá logic bằng cột dấu (sign) |
| `ReplicatedMergeTree` | Thêm replication qua ClickHouse Keeper cho HA |

### 2.4 PARTITION BY — quản lý dữ liệu theo lô

`PARTITION BY` chia bảng thành các **partition** vật lý (thường theo **tháng**: `toYYYYMM(ts)`). Đừng nhầm với sort key:
- **Sort key (`ORDER BY`)** phục vụ *đọc nhanh trong* part.
- **Partition** phục vụ *quản lý vòng đời*: `DROP PARTITION` xoá cả tháng **tức thì** (chỉ xoá thư mục, không quét dòng), TTL dọn dữ liệu cũ theo partition, và giúp bỏ qua nguyên partition không liên quan.

⚠️ Sai lầm phổ biến: partition quá mịn (ví dụ theo ngày hoặc theo `user_id`) → **quá nhiều part**, merge nghẽn, mở file quá nhiều. Quy tắc: giữ số partition ở mức **hàng chục–trăm**, không phải hàng nghìn.

### 2.5 TTL — tự động dọn và hạ tầng lưu trữ theo tuổi

`TTL` cho phép ClickHouse **tự xoá** dòng/partition cũ, hoặc **chuyển** dữ liệu cũ sang đĩa rẻ hơn (hot SSD → cold HDD/S3), hoặc **rollup** (pre-aggregate) dữ liệu cũ. Rất hợp observability/log giữ 30–90 ngày.

### 2.6 Materialized view — pre-aggregate lúc ghi

Trong ClickHouse, **materialized view (MV)** không phải "cache truy vấn" mà là một **insert trigger**: mỗi khối dữ liệu vào bảng nguồn, MV chạy `SELECT` biến đổi rồi **ghi kết quả sang một bảng đích**. Kết hợp với `AggregatingMergeTree`/`SummingMergeTree`, MV **tính sẵn** các tổng hợp (theo phút/giờ/ngày). Khi dashboard hỏi, ta đọc bảng đã pre-aggregate (nhỏ hơn hàng trăm–nghìn lần) thay vì quét bảng thô → dashboard bật ra tức thì.

<svg viewBox="0 0 640 180" role="img" aria-labelledby="mv-t mv-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="mv-t">Materialized view pre-aggregate lúc insert</title>
<desc id="mv-d">Mỗi lô insert vào bảng thô kích hoạt materialized view tính tổng hợp và ghi sang bảng đích nhỏ đã pre-aggregate mà dashboard đọc</desc>
<rect x="20" y="65" width="130" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="85" y="86" text-anchor="middle" font-size="11" fill="currentColor">INSERT lô</text>
<text x="85" y="103" text-anchor="middle" font-size="10" fill="currentColor">bảng events thô</text>
<line x1="150" y1="90" x2="215" y2="90" stroke="currentColor" stroke-width="1.5" marker-end="url(#av)"/>
<rect x="220" y="60" width="150" height="60" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="295" y="84" text-anchor="middle" font-size="11" fill="currentColor">Materialized view</text>
<text x="295" y="102" text-anchor="middle" font-size="10" fill="currentColor">GROUP BY giờ, country</text>
<line x1="370" y1="90" x2="435" y2="90" stroke="currentColor" stroke-width="1.5" marker-end="url(#av)"/>
<rect x="440" y="60" width="170" height="60" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="525" y="84" text-anchor="middle" font-size="11" fill="currentColor">bảng đích nhỏ</text>
<text x="525" y="102" text-anchor="middle" font-size="10" fill="currentColor">SummingMergeTree</text>
<text x="525" y="150" text-anchor="middle" font-size="10" fill="currentColor">dashboard đọc ở đây</text>
<defs><marker id="av" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

---

## 3. Thực hành: DDL + query

```sql
-- 3.1 Bảng sự kiện thô dùng MergeTree
CREATE TABLE events
(
    ts          DateTime,           -- thời điểm sự kiện
    user_id     UInt64,
    country     LowCardinality(String),  -- ít giá trị lặp -> nén & lọc rất tốt
    event_type  LowCardinality(String),
    url         String,
    amount      Decimal(12, 2)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(ts)          -- 1 partition / tháng để dễ DROP & TTL
ORDER BY (country, event_type, ts) -- sort key: lọc theo country/type rồi range theo ts
TTL ts + INTERVAL 90 DAY DELETE;   -- tự xoá dữ liệu > 90 ngày
```

`LowCardinality(String)` mã hoá từ điển các chuỗi lặp lại (country, event_type) → nén chặt và lọc nhanh hơn nhiều `String` thô. Sort key đặt **cột lọc-cao (low cardinality) trước, cột range (ts) sau** để tối đa data skipping.

```sql
-- 3.2 Nạp dữ liệu theo LÔ LỚN (không insert từng dòng!)
INSERT INTO events VALUES
  ('2026-07-24 10:00:00', 1, 'VN', 'purchase', '/checkout', 25.00),
  ('2026-07-24 10:00:03', 2, 'US', 'view',     '/home',      0.00),
  ('2026-07-24 10:00:05', 3, 'VN', 'purchase', '/checkout', 12.50);

-- 3.3 Aggregation quét cột — cực nhanh
SELECT country, count() AS n, sum(amount) AS revenue
FROM events
WHERE ts >= '2026-07-01' AND event_type = 'purchase'
GROUP BY country
ORDER BY revenue DESC;
```

```sql
-- 3.4 Materialized view pre-aggregate doanh thu theo giờ
CREATE TABLE revenue_hourly
(
    hour     DateTime,
    country  LowCardinality(String),
    revenue  AggregateFunction(sum, Decimal(12, 2)),
    events   AggregateFunction(count)
)
ENGINE = AggregatingMergeTree
PARTITION BY toYYYYMM(hour)
ORDER BY (country, hour);

CREATE MATERIALIZED VIEW revenue_hourly_mv TO revenue_hourly AS
SELECT
    toStartOfHour(ts)      AS hour,
    country,
    sumState(amount)       AS revenue,   -- lưu STATE, hợp nhất khi merge
    countState()           AS events
FROM events
GROUP BY hour, country;

-- Đọc kết quả pre-aggregate: dùng -Merge để hoàn tất phép cộng state
SELECT
    hour,
    country,
    sumMerge(revenue)  AS revenue,
    countMerge(events) AS events
FROM revenue_hourly
GROUP BY hour, country
ORDER BY hour;
```

Cặp `sumState` (lúc ghi) + `sumMerge` (lúc đọc) là cách ClickHouse lưu **trạng thái tổng hợp trung gian** để merge nền cộng dồn chính xác qua nhiều lô. Dashboard giờ đọc bảng `revenue_hourly` nhỏ gọn thay vì quét `events` tỉ dòng.

```sql
-- 3.5 Quản lý vòng đời tức thì bằng partition
ALTER TABLE events DROP PARTITION '202601';   -- xoá cả tháng 1/2026 ngay lập tức

-- 3.6 Mô phỏng "update"/dedup bằng ReplacingMergeTree
CREATE TABLE users
(
    user_id  UInt64,
    name     String,
    updated  DateTime
)
ENGINE = ReplacingMergeTree(updated)  -- giữ bản có 'updated' mới nhất khi merge
ORDER BY user_id;
-- Ghi bản mới đè bản cũ; dùng SELECT ... FINAL để thấy bản mới nhất ngay
SELECT * FROM users FINAL WHERE user_id = 1;
```

---

## 4. ClickHouse vs Data Warehouse (BigQuery / Snowflake)

| Tiêu chí | **ClickHouse** | BigQuery / Snowflake |
|----------|----------------|----------------------|
| Mô hình | DB tự vận hành hoặc managed (ClickHouse Cloud) | Fully managed, serverless |
| Storage/compute | Có thể tách (Cloud) hoặc gắn liền (self-host) | **Tách hẳn**, scale độc lập |
| Độ trễ query | **Mili giây–giây**, hợp dashboard realtime | Giây–chục giây, hợp batch/ad-hoc |
| Ingest realtime | **Rất mạnh** (Kafka engine, insert liên tục) | Có streaming nhưng thiên batch |
| Chi phí | Trả theo hạ tầng/instance | Trả **theo byte quét** hoặc credit compute |
| Vận hành | Cần hiểu part/merge/sort key nếu self-host | Gần như không phải quản hạ tầng |
| Sức mạnh nhất | **User-facing analytics, observability, time-series latency thấp** | Data warehouse doanh nghiệp, join phức tạp, ETL lớn |

**Chọn ClickHouse** khi cần **độ trễ thấp, throughput ingest cao, chi phí kiểm soát được**, truy vấn tương đối cố định (dashboard, giám sát, analytics nhúng vào sản phẩm). **Chọn BigQuery/Snowflake** khi muốn **không lo vận hành**, workload ad-hoc thưa, join nhiều bảng phức tạp trên toàn kho dữ liệu doanh nghiệp, và co giãn compute theo lô.

---

## 5. Hạn chế — khi nào KHÔNG dùng ClickHouse

- **Không phải OLTP.** Không có transaction đa câu lệnh kiểu ACID, không hợp cho ghi/đọc từng dòng theo key với độ trễ p99 ổn định như Postgres. Đừng đặt giỏ hàng, ví tiền, đơn hàng "nguồn sự thật" vào đây.
- **Update/delete kém.** Dữ liệu là các part **bất biến**; `ALTER TABLE ... UPDATE/DELETE` là **mutation** nặng (viết lại cả part), không dành cho sửa lắt nhắt thường xuyên. Cần "cập nhật" thì dùng `ReplacingMergeTree`/`CollapsingMergeTree` (append rồi hợp nhất khi merge) thay vì update tại chỗ.
- **Insert nhỏ lẻ giết hiệu năng.** Insert từng dòng tạo quá nhiều part → lỗi "too many parts". Luôn **batch** (hoặc dùng buffer/async insert, Kafka engine).
- **Join lớn không phải sở trường.** ClickHouse tối ưu cho quét-nhóm một-vài-bảng-lớn; join nhiều bảng lớn với nhau yếu hơn các warehouse chuyên join. Mẹo: **denormalize** (dồn vào một bảng rộng), dùng `LowCardinality`, hoặc dictionary lookup.
- **Nhất quán/point-lookup:** đọc "dòng X ngay bây giờ" (như OLTP) không phải điểm mạnh; sparse index tối ưu cho range/scan, không cho tra một dòng ngẫu nhiên.

Nguyên tắc: **ClickHouse là công cụ đọc-phân-tích, không phải hệ giao dịch.** Ghép nó *sau* Postgres/Kafka trong pipeline, không thay Postgres.

---

## 6. Tóm tắt
- **ClickHouse** là **columnar OLAP DB**: quét tỉ dòng để `SUM/COUNT/GROUP BY` trong mili giây.
- Aggregation nhanh nhờ **bốn động cơ**: đọc-ít-cột + **nén chặt** (giá trị cùng miền cạnh nhau) + **vectorized SIMD** + **parallel**.
- **MergeTree**: dữ liệu sort theo `ORDER BY`, **sparse primary index** (mốc/8192 dòng, nằm trong RAM) cho **data skipping**, insert tạo **part** bất biến, **merge nền** gộp part nhỏ → **luôn batch insert**.
- **PARTITION BY** (thường theo tháng) để quản vòng đời + `DROP PARTITION` tức thì; **TTL** tự dọn/hạ tầng; **materialized view** (+ `AggregatingMergeTree`, `sumState/sumMerge`) **pre-aggregate lúc ghi** cho dashboard tức thì.
- **Chọn ClickHouse** cho analytics latency thấp, ingest realtime, chi phí kiểm soát; **BigQuery/Snowflake** cho warehouse managed, join phức tạp, ad-hoc.
- **Hạn chế**: không OLTP, update/delete kém (part bất biến), sợ insert nhỏ lẻ, join lớn yếu — dùng nó *sau* hệ giao dịch, không thay thế.

> **Bài tiếp theo:** đi vào **kiến trúc pipeline analytics thực tế** — ghép nguồn OLTP (CDC/Debezium) → Kafka → ClickHouse, và cách giữ dữ liệu tươi mà không đánh sập hệ giao dịch.
