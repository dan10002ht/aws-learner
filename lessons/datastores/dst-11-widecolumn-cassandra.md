# Bài 11 — Wide-column: Cassandra & DynamoDB

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **wide-column / partitioned row store** thực chất là gì — và vì sao nó *không* phải "bảng SQL có nhiều cột".
- Phân biệt rạch ròi **partition key** (định vị node) và **clustering key** (sắp xếp trong partition) trong Cassandra.
- Thiết kế theo tư duy **query-first** ("một bảng phục vụ một truy vấn"), hiểu vì sao **không có JOIN**.
- Hiểu **tunable consistency** (ONE / QUORUM / ALL) và công thức `R + W > RF`.
- Nắm **write path LSM** của Cassandra: memtable → commit log → SSTable → compaction.
- Ánh xạ mọi khái niệm sang **DynamoDB**: partition/sort key, GSI/LSI, on-demand vs provisioned, **hot partition**.
- Nhận diện anti-pattern chí mạng: **unbounded partition**.

---

## 2. Lý thuyết

### 2.1 Wide-column là gì? — Bản chất "map lồng map có phân mảnh"

> **Wide-column store** (Cassandra, DynamoDB, HBase, ScyllaDB, Bigtable) lưu dữ liệu dưới dạng **partitioned row store**: dataset bị **băm (hash) thành hàng nghìn partition** rải đều trên nhiều node; mỗi partition chứa **nhiều row đã được sắp xếp sẵn**, mỗi row lại có tập cột riêng. Đọc/ghi theo key là **O(1) định vị node** rồi **quét tuần tự trong partition**.

Đừng để chữ "column" đánh lừa. Mô hình đúng nhất về mặt tư duy là một **map hai tầng**:

```
partition_key  →  ( clustering_key  →  row )
   (chọn node)        (sắp xếp trong node)
```

- Tầng ngoài (**partition key**) trả lời câu hỏi *"dữ liệu này nằm ở node nào?"*. Nó được **hash** để chọn node — không có ý nghĩa thứ tự.
- Tầng trong (**clustering key**) trả lời *"trong partition đó, các row được xếp theo thứ tự nào?"*. Nó được **sort** — cho phép range scan cực nhanh (đọc tuần tự trên đĩa).

Đây là lý do wide-column **scale ngang gần như tuyến tính**: thêm node → data & tải tự chia lại theo hash; nhưng đổi lại nó **vứt bỏ** JOIN, transaction đa-row tùy tiện, và truy vấn ad-hoc. Bạn được throughput và HA khổng lồ, trả giá bằng **tính linh hoạt của truy vấn**.

### 2.2 Cassandra: masterless, hash ring

Cassandra là **masterless** — mọi node ngang hàng (peer-to-peer), không có master/primary. Client kết nối vào **bất kỳ** node; node đó đóng vai **coordinator** cho request. Không single point of failure.

Dữ liệu được đặt lên một **hash ring**: `token = hash(partition_key)` quyết định vị trí trên vòng; node "sở hữu" cung token đó giữ dữ liệu. **Replication factor (RF)** = số bản sao → row được ghi xuống RF node liên tiếp trên ring.

<svg viewBox="0 0 640 300" role="img" aria-labelledby="ring-t ring-d" style="width:100%;max-width:560px;height:auto;display:block;margin:1.25rem auto">
<title id="ring-t">Cassandra hash ring và replication</title>
<desc id="ring-d">Một vòng token với bốn node ngang hàng; partition key được hash để chọn node chủ, rồi sao chép sang các node kế tiếp theo replication factor</desc>
<circle cx="320" cy="150" r="105" fill="none" stroke="currentColor" stroke-dasharray="4 4" opacity="0.5"/>
<circle cx="320" cy="45" r="26" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="42" text-anchor="middle" font-size="11" fill="currentColor">Node A</text>
<text x="320" y="55" text-anchor="middle" font-size="9" fill="currentColor">0–63</text>
<circle cx="425" cy="150" r="26" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="425" y="147" text-anchor="middle" font-size="11" fill="currentColor">Node B</text>
<text x="425" y="160" text-anchor="middle" font-size="9" fill="currentColor">64–127</text>
<circle cx="320" cy="255" r="26" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="252" text-anchor="middle" font-size="11" fill="currentColor">Node C</text>
<text x="320" y="265" text-anchor="middle" font-size="9" fill="currentColor">128–191</text>
<circle cx="215" cy="150" r="26" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="215" y="147" text-anchor="middle" font-size="11" fill="currentColor">Node D</text>
<text x="215" y="160" text-anchor="middle" font-size="9" fill="currentColor">192–255</text>
<rect x="20" y="120" width="150" height="60" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="143" text-anchor="middle" font-size="11" fill="currentColor">hash("user42")</text>
<text x="95" y="160" text-anchor="middle" font-size="11" fill="currentColor">= token 70</text>
<text x="95" y="174" text-anchor="middle" font-size="9" fill="currentColor">→ chủ: Node B</text>
<line x1="170" y1="150" x2="397" y2="150" stroke="currentColor" stroke-width="1.5" marker-end="url(#ra)"/>
<text x="520" y="60" font-size="10" fill="currentColor">RF=3 → ghi B,</text>
<text x="520" y="76" font-size="10" fill="currentColor">rồi C, D (kế tiếp)</text>
<defs><marker id="ra" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.3 Partition key vs Clustering key — trái tim của mô hình

Xét bảng tin nhắn theo phòng chat. **PRIMARY KEY** của Cassandra có cấu trúc kép:

```sql
CREATE TABLE messages_by_room (
    room_id     text,          -- partition key: định vị node
    bucket      date,          -- partition key (phần 2): chống unbounded
    created_at  timeuuid,      -- clustering key: sắp xếp trong partition
    sender      text,
    body        text,
    PRIMARY KEY ((room_id, bucket), created_at)
) WITH CLUSTERING ORDER BY (created_at DESC);
```

- `PRIMARY KEY ((room_id, bucket), created_at)` — **dấu ngoặc trong** gom `(room_id, bucket)` thành **partition key ghép** (composite). Cassandra **hash toàn bộ tuple này** để chọn node. Muốn đọc, bạn **bắt buộc** cung cấp *đủ* partition key.
- `created_at` là **clustering key** — các row trong cùng partition được lưu **đã sắp xếp** theo `created_at DESC`. Nhờ vậy "lấy 50 tin mới nhất" chỉ là đọc tuần tự 50 row đầu, không cần sort lúc query.

| | Partition key | Clustering key |
|---|---|---|
| Vai trò | Chọn **node** (routing) | Sắp xếp **trong** partition |
| Phép toán | **Hash** | **Sort** |
| Bắt buộc trong WHERE | Có (đủ, để định vị) | Không (có thể range) |
| Toán tử được phép | Chỉ `=` (và `IN`) | `=`, `>`, `<`, range |
| Ảnh hưởng | Phân bố tải / hot partition | Kích thước partition / thứ tự đọc |

Truy vấn hợp lệ và không hợp lệ:

```sql
-- HỢP LỆ: đủ partition key + range trên clustering key
SELECT * FROM messages_by_room
WHERE room_id = 'r-9' AND bucket = '2026-07-24'
  AND created_at > '2026-07-24 08:00:00'
LIMIT 50;

-- KHÔNG HỢP LỆ: thiếu partition key → Cassandra không biết hỏi node nào
SELECT * FROM messages_by_room WHERE sender = 'an';
-- InvalidRequest: cần ALLOW FILTERING (quét toàn cluster — cấm dùng production)
```

`ALLOW FILTERING` biến truy vấn thành **full scan mọi node** — chậm, không đoán trước được, và là dấu hiệu bạn **thiết kế sai bảng**.

### 2.4 Query-first design — "một bảng cho một truy vấn"

Đây là cú lộn ngược tư duy lớn nhất so với SQL. Trong relational bạn **chuẩn hóa** rồi JOIN lúc đọc. Trong Cassandra **không có JOIN** (vì JOIN đòi gom data across node — phá vỡ scale). Thay vào đó:

> Bạn **liệt kê trước các câu truy vấn** ứng dụng cần, rồi **thiết kế một bảng riêng cho mỗi truy vấn**, chấp nhận **ghi trùng dữ liệu (denormalization)**. Đĩa rẻ; random read across node thì đắt.

Ví dụ cùng một tập user cần hai truy vấn → hai bảng, ghi cả hai lúc insert:

```sql
-- Truy vấn 1: lấy user theo id
CREATE TABLE users_by_id (
    user_id uuid PRIMARY KEY,
    email text, name text, city text
);

-- Truy vấn 2: liệt kê user theo thành phố (cùng dữ liệu, key khác)
CREATE TABLE users_by_city (
    city text,
    user_id uuid,
    name text, email text,
    PRIMARY KEY (city, user_id)
);

-- Ghi song song vào cả hai (thường bọc trong BATCH hoặc app-side).
-- LƯU Ý: dùng CÙNG một user_id cho cả hai bảng — đây là cùng một user, chỉ khác key.
INSERT INTO users_by_id   (user_id,email,name,city) VALUES (11111111-1111-1111-1111-111111111111,'a@x','An','HN');
INSERT INTO users_by_city (city,user_id,name,email) VALUES ('HN',11111111-1111-1111-1111-111111111111,'An','a@x');
```

Nguyên tắc thiết kế: **model theo query, không theo entity**. Ghi nhiều lần, đọc một lần, đọc rất nhanh.

### 2.5 Write path LSM: vì sao Cassandra ghi nhanh khủng khiếp

Cassandra dùng **LSM-tree** (Log-Structured Merge). Ghi **không bao giờ update tại chỗ** trên đĩa — mọi write là **append tuần tự**:

<svg viewBox="0 0 660 300" role="img" aria-labelledby="lsm-t lsm-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="lsm-t">Write path LSM của Cassandra</title>
<desc id="lsm-d">Một write được ghi đồng thời vào commit log trên đĩa và memtable trong RAM; khi memtable đầy nó được flush thành SSTable bất biến; các SSTable được hợp nhất định kỳ bằng compaction</desc>
<rect x="20" y="130" width="90" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="65" y="154" text-anchor="middle" font-size="12" fill="currentColor">WRITE</text>
<line x1="110" y1="150" x2="165" y2="80" stroke="currentColor" stroke-width="1.5" marker-end="url(#la)"/>
<line x1="110" y1="150" x2="165" y2="150" stroke="currentColor" stroke-width="1.5" marker-end="url(#la)"/>
<rect x="170" y="55" width="150" height="45" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="245" y="74" text-anchor="middle" font-size="11" fill="currentColor">Commit log (đĩa)</text>
<text x="245" y="90" text-anchor="middle" font-size="9" fill="currentColor">append — để phục hồi</text>
<rect x="170" y="128" width="150" height="45" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="245" y="147" text-anchor="middle" font-size="11" fill="currentColor">Memtable (RAM)</text>
<text x="245" y="163" text-anchor="middle" font-size="9" fill="currentColor">sorted, có thể update</text>
<line x1="320" y1="150" x2="385" y2="150" stroke="currentColor" stroke-width="1.5" marker-end="url(#la)"/>
<text x="352" y="143" text-anchor="middle" font-size="9" fill="currentColor">flush</text>
<rect x="390" y="110" width="120" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="450" y="131" text-anchor="middle" font-size="10" fill="currentColor">SSTable 1 (bất biến)</text>
<rect x="390" y="152" width="120" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="450" y="173" text-anchor="middle" font-size="10" fill="currentColor">SSTable 2 (bất biến)</text>
<line x1="510" y1="150" x2="565" y2="150" stroke="currentColor" stroke-width="1.5" marker-end="url(#la)"/>
<text x="537" y="143" text-anchor="middle" font-size="9" fill="currentColor">compaction</text>
<rect x="568" y="128" width="80" height="45" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="608" y="147" text-anchor="middle" font-size="10" fill="currentColor">SSTable</text>
<text x="608" y="162" text-anchor="middle" font-size="10" fill="currentColor">hợp nhất</text>
<text x="330" y="230" text-anchor="middle" font-size="10" fill="currentColor">Ghi = append tuần tự (nhanh). Đọc = gộp memtable + nhiều SSTable (cần bloom filter, compaction).</text>
<defs><marker id="la" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

1. Write đến coordinator → ghi vào **commit log** (append đĩa, để recovery) **và** **memtable** (cấu trúc sorted trong RAM). Ack ngay → **write cực nhanh**.
2. Memtable đầy → **flush** xuống đĩa thành **SSTable** — file **bất biến (immutable)**, sorted, chỉ ghi một lần.
3. Update một row thực chất là ghi **version mới** ở SSTable khác; delete ghi một **tombstone** (dấu xóa). Bản cũ vẫn nằm đó.
4. **Compaction** chạy nền: gộp nhiều SSTable, giữ version mới nhất theo timestamp, dọn tombstone hết hạn.

Hệ quả: **ghi rẻ, đọc đắt hơn** (phải hợp nhất nhiều SSTable — nên có **bloom filter** để bỏ qua SSTable không chứa key). Đây là đánh đổi ngược với B-tree của SQL (đọc rẻ, ghi phải cập nhật cây tại chỗ). LSM tối ưu cho **write-heavy** — đúng thế mạnh của Cassandra.

### 2.6 Tunable consistency — chọn nhất quán *cho từng truy vấn*

Cassandra là **AP** trong CAP nhưng cho bạn **vặn núm** nhất quán **theo từng câu lệnh** qua **consistency level (CL)**. Với RF bản sao, mỗi read/write bạn khai báo cần bao nhiêu replica xác nhận:

| CL | Ý nghĩa | Đánh đổi |
|---|---|---|
| `ONE` | 1 replica trả lời là đủ | Nhanh nhất, có thể đọc dữ liệu cũ |
| `QUORUM` | Đa số `floor(RF/2)+1` | Cân bằng — phổ biến nhất |
| `LOCAL_QUORUM` | Quorum **trong 1 datacenter** | Tránh latency cross-DC |
| `ALL` | Tất cả RF replica | Nhất quán mạnh, mất HA (1 node chết → fail) |

**Công thức vàng — strong consistency:**

> `R + W > RF` ⇒ tập replica đọc và tập replica ghi **chắc chắn giao nhau** ≥ 1 → đọc luôn thấy write mới nhất.

Ví dụ RF=3: chọn `W=QUORUM(2)` và `R=QUORUM(2)` → `2+2=4 > 3` ✅ strong. Còn `W=ONE(1) + R=ONE(1)` → `1+1=2 ≤ 3` → **eventual** (có thể đọc cũ). Đẹp ở chỗ: bạn dùng QUORUM cho lệnh cần đúng (thanh toán), ONE cho lệnh chịu được cũ (đếm view) — **trên cùng một cluster**.

```sql
CONSISTENCY QUORUM;                 -- áp cho các lệnh kế tiếp trong cqlsh
UPDATE accounts SET balance = 90 WHERE id = 42;   -- ghi cần chắc

CONSISTENCY ONE;                    -- đọc chịu được hơi cũ
SELECT views FROM page_stats WHERE id = 7;
```

Cassandra còn có cơ chế **read repair** (sửa replica lệch khi đọc) và **hinted handoff** (node chết, coordinator giữ hint rồi giao lại) để hội tụ dần về nhất quán.

### 2.7 DynamoDB — cùng mô hình, khác vận hành

DynamoDB (AWS, managed) chia sẻ **đúng tư duy** wide-column nhưng là dịch vụ **serverless, trả tiền theo dùng**:

| Khái niệm Cassandra | Tương đương DynamoDB |
|---|---|
| Partition key | **Partition key (HASH)** |
| Clustering key | **Sort key (RANGE)** |
| Bảng phụ theo query khác | **GSI** (Global Secondary Index) |
| — (index cùng partition, sort key khác) | **LSI** (Local Secondary Index) |
| Tunable CL | `ConsistentRead` true/false (eventual mặc định) |
| Tự vận hành cluster | **Managed** (AWS lo node, replica) |

- **Partition key + Sort key** = "primary key ghép". Partition key hash chọn partition; sort key sắp xếp row trong đó — y hệt Cassandra.
- **GSI** = một "bảng chiếu" với partition/sort key **khác**, DynamoDB tự đồng bộ (eventual). Đây chính là "một bảng cho một truy vấn" nhưng do hệ thống tự nhân bản. **LSI** giữ nguyên partition key, chỉ đổi sort key, và phải tạo lúc create table.
- **Capacity**: **On-demand** (trả theo request, tự co giãn — hợp tải khó đoán) vs **Provisioned** (khai báo RCU/WCU trước, rẻ hơn nếu tải ổn định, có auto-scaling).

### 2.8 Hot partition & Unbounded partition — hai anti-pattern chí mạng

Vì partition key quyết định **node nào ôm dữ liệu**, chọn sai key phá hỏng toàn bộ lợi thế scale.

**Hot partition** — partition key có ít giá trị hoặc lệch tải nặng về một giá trị → một node/partition nhận phần lớn traffic, các node khác nhàn rỗi. Ví dụ `partition_key = country` mà 80% user ở một nước; hay `partition_key = current_date` (mọi ghi hôm nay dồn một partition). DynamoDB sẽ throttle partition đó dù bảng còn thừa capacity.

**Unbounded partition** — partition **lớn không giới hạn theo thời gian**. Ví dụ `PRIMARY KEY (sensor_id, ts)`: một sensor chạy nhiều năm → partition phình tới hàng GB, hàng chục triệu row → đọc chậm, compaction nặng, có thể vỡ giới hạn. Cassandra khuyến nghị partition **dưới ~100MB / ~100k row**.

<svg viewBox="0 0 640 240" role="img" aria-labelledby="bkt-t bkt-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="bkt-t">Sửa unbounded partition bằng bucketing</title>
<desc id="bkt-d">Bên trái một partition theo sensor phình vô hạn theo thời gian; bên phải thêm bucket theo tháng vào partition key để chia thành nhiều partition có kích thước bị chặn</desc>
<text x="150" y="30" text-anchor="middle" font-size="12" fill="currentColor">TRƯỚC — unbounded</text>
<rect x="40" y="45" width="220" height="150" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="150" y="66" text-anchor="middle" font-size="11" fill="currentColor">partition (sensor_id)</text>
<text x="150" y="120" text-anchor="middle" font-size="11" fill="currentColor">nhiều năm dữ liệu</text>
<text x="150" y="140" text-anchor="middle" font-size="11" fill="currentColor">→ phình tới hàng GB</text>
<text x="490" y="30" text-anchor="middle" font-size="12" fill="currentColor">SAU — bucket theo tháng</text>
<rect x="380" y="45" width="100" height="60" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="430" y="70" text-anchor="middle" font-size="9" fill="currentColor">(sensor,2026-05)</text>
<text x="430" y="88" text-anchor="middle" font-size="9" fill="currentColor">≤ 100MB</text>
<rect x="490" y="45" width="100" height="60" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="540" y="70" text-anchor="middle" font-size="9" fill="currentColor">(sensor,2026-06)</text>
<text x="540" y="88" text-anchor="middle" font-size="9" fill="currentColor">≤ 100MB</text>
<rect x="380" y="120" width="100" height="60" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="430" y="145" text-anchor="middle" font-size="9" fill="currentColor">(sensor,2026-07)</text>
<text x="430" y="163" text-anchor="middle" font-size="9" fill="currentColor">≤ 100MB</text>
<rect x="490" y="120" width="100" height="60" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="540" y="145" text-anchor="middle" font-size="9" fill="currentColor">(sensor,2026-08)</text>
<text x="540" y="163" text-anchor="middle" font-size="9" fill="currentColor">…</text>
<line x1="265" y1="120" x2="372" y2="120" stroke="currentColor" stroke-width="1.5" marker-end="url(#ba)"/>
<defs><marker id="ba" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Cách chữa (bucketing / composite partition key):** thêm một chiều thời gian vào partition key để chặn kích thước:

```sql
-- XẤU: partition phình vô hạn theo thời gian
CREATE TABLE readings (
    sensor_id text,
    ts timestamp,
    value double,
    PRIMARY KEY (sensor_id, ts)             -- unbounded!
);

-- TỐT: bucket theo tháng → mỗi partition bị chặn kích thước
CREATE TABLE readings (
    sensor_id text,
    month text,                             -- '2026-07'
    ts timestamp,
    value double,
    PRIMARY KEY ((sensor_id, month), ts)    -- partition = sensor + tháng
) WITH CLUSTERING ORDER BY (ts DESC);
```

Đánh đổi: truy vấn xuyên nhiều tháng phải hỏi nhiều partition (app tự lặp qua các bucket) — nhưng mỗi partition nhỏ, nhanh, an toàn. Với DynamoDB, để tránh hot partition người ta **thêm hậu tố ngẫu nhiên (write sharding)** vào partition key, hoặc chọn key có **cardinality cao và phân bố đều** (user_id thay vì country).

---

## 3. Khi nào dùng wide-column?

| Hợp | Không hợp |
|---|---|
| Ghi rất nhiều (IoT, log, event, time-series) | Truy vấn ad-hoc, báo cáo linh hoạt |
| Truy vấn **biết trước** theo key | Cần JOIN nhiều bảng |
| Cần scale ngang & HA đa datacenter | Transaction ACID phức tạp đa-row |
| Chịu được eventual consistency (hoặc chỉ cần QUORUM) | Dữ liệu nhỏ, cần đủ mọi kiểu query → dùng SQL |

Quy tắc quyết định: **biết trước câu hỏi, cần throughput ghi + scale + HA** → wide-column. **Cần hỏi tùy hứng, quan hệ phức tạp** → relational (Bài về SQL).

---

## 4. Tóm tắt
- **Wide-column = partitioned row store**: dataset băm thành nhiều partition (chọn node bằng **hash partition key**), mỗi partition chứa row **đã sort theo clustering key**.
- **Partition key** định vị node (chỉ `=`/`IN`, quyết định phân bố tải); **clustering key** sắp xếp trong partition (cho range scan). Thiếu partition key trong WHERE ⇒ phải `ALLOW FILTERING` = thiết kế sai.
- **Query-first, không JOIN**: một bảng cho một truy vấn, denormalize thẳng tay — ghi trùng để đọc nhanh.
- **Write path LSM**: append vào commit log + memtable → flush ra **SSTable bất biến** → **compaction** gộp. Ghi rẻ, đọc phải hợp nhất nhiều SSTable (bloom filter đỡ).
- **Tunable consistency**: ONE/QUORUM/ALL per-query; `R + W > RF` ⇒ strong, ngược lại eventual.
- **DynamoDB** = cùng mô hình managed: partition/sort key, **GSI/LSI**, on-demand vs provisioned, `ConsistentRead`.
- Anti-pattern: **hot partition** (key lệch tải) và **unbounded partition** (phình vô hạn) — chữa bằng **bucketing / composite key / write sharding**.

> **Bài tiếp theo (Bài 12):** đi vào **time-series & search** — cách các store chuyên dụng (InfluxDB, Elasticsearch) tổ chức dữ liệu theo thời gian và đảo ngược index để trả lời câu hỏi mà wide-column không kham nổi.
