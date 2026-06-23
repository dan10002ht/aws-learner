# Foundations 05 — Partitioning & Sharding

> Mục tiêu: Hiểu vì sao **một bảng quá to phải bị chia nhỏ**, các chiến lược chia, và **hot partition** — kẻ giết hệ thống thầm lặng nhất. Sau bài này, bạn sẽ design DynamoDB partition key đủ chuẩn và biết khi nào RDS phải sharding.

Tiền đề: [[foundations-01-cap-theorem]], [[foundations-03-replication-and-quorum]].

> **Thuật ngữ**: "Partition" và "Shard" thường dùng thay nhau. Trong bài này: **partition** = đơn vị chia của DynamoDB / Kafka / Aurora; **shard** = đơn vị chia khi tự làm trên RDS. Ý niệm giống nhau.

---

## 1. Câu chuyện mở đầu — Thư viện 10 triệu cuốn sách

Bạn quản lý 1 thư viện 10 triệu cuốn sách. Có 3 cách sắp xếp:

- **Cách 1 — Một dãy kệ khổng lồ theo ABC**: dễ tìm nếu biết tên, nhưng mỗi khi nhiều người cùng muốn sách bắt đầu bằng "H" → kẹt cứng ở dãy H.
- **Cách 2 — Hash tên sách rồi đặt theo số kệ**: phân bố đều, không kẹt, nhưng không thể "lướt qua các sách cùng tác giả".
- **Cách 3 — Chia theo chủ đề** (lịch sử / khoa học / tiểu thuyết): hợp lý theo nhu cầu, nhưng chủ đề "tiểu thuyết" sẽ to gấp 100 lần "địa chất" → vẫn kẹt.

3 cách = 3 chiến lược partition: **range**, **hash**, **directory/list**. Mỗi cách có cái giá riêng. Hot partition là vấn đề chung.

---

## 2. Vì sao phải partition?

3 lý do cùng lúc:

1. **Storage**: 1 DB instance không đủ disk cho 50TB.
2. **Throughput**: 1 instance không đủ IOPS cho 100k QPS.
3. **Locality**: muốn data người Việt ở SG, data người Đức ở Frankfurt (compliance + latency).

Replication (bài 03) **không** giải quyết 1 & 2. Replication chỉ làm nhiều bản copy của cùng dataset → vẫn cùng kích thước. **Partition** mới chia dataset ra → mỗi node giữ 1 phần.

→ Hệ thống lớn thường dùng **cả hai**: partition × replicate. DynamoDB: 1 table có nhiều partition, mỗi partition có 3 replica. Kafka: 1 topic có nhiều partition, mỗi partition RF=3.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Partition so với Replication và cách kết hợp cả hai</title>
  <desc>Replication nhân bản toàn bộ dataset thành nhiều copy giống nhau; Partition chia dataset thành nhiều phần, mỗi node giữ một phần; hệ lớn dùng cả hai: chia thành nhiều partition rồi mỗi partition lại nhân ra 3 replica.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Partition vs Replication vs Cả hai</text>

  <text x="120" y="58" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Replication</text>
  <text x="120" y="74" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">nhân bản — cùng kích thước</text>
  <g>
    <rect x="40" y="86" width="160" height="34" rx="7" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="120" y="108" font-size="11" text-anchor="middle" fill="currentColor">copy 1 · A B C D</text>
    <rect x="40" y="126" width="160" height="34" rx="7" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="120" y="148" font-size="11" text-anchor="middle" fill="currentColor">copy 2 · A B C D</text>
    <rect x="40" y="166" width="160" height="34" rx="7" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="120" y="188" font-size="11" text-anchor="middle" fill="currentColor">copy 3 · A B C D</text>
  </g>
  <text x="120" y="220" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">→ giải availability, KHÔNG giải storage/throughput</text>

  <text x="360" y="58" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Partition</text>
  <text x="360" y="74" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">chia nhỏ — mỗi node 1 phần</text>
  <g>
    <rect x="280" y="86" width="160" height="34" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="108" font-size="11" text-anchor="middle" fill="currentColor">node 1 · A</text>
    <rect x="280" y="126" width="160" height="34" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="148" font-size="11" text-anchor="middle" fill="currentColor">node 2 · B</text>
    <rect x="280" y="166" width="160" height="34" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="188" font-size="11" text-anchor="middle" fill="currentColor">node 3 · C D</text>
  </g>
  <text x="360" y="220" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">→ giải storage + throughput</text>

  <text x="600" y="58" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Cả hai (DynamoDB)</text>
  <text x="600" y="74" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">partition × replicate</text>
  <g>
    <rect x="500" y="86" width="200" height="46" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="600" y="104" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">partition P1 (A)</text>
    <text x="600" y="122" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">3 replica của A</text>
    <rect x="500" y="138" width="200" height="46" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="600" y="156" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">partition P2 (B)</text>
    <text x="600" y="174" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">3 replica của B</text>
  </g>
  <text x="600" y="220" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">→ vừa scale vừa bền</text>

  <text x="360" y="252" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">A B C D = 4 phần của cùng 1 dataset</text>
  <line x1="40" y1="268" x2="700" y2="268" stroke="currentColor" stroke-opacity="0.15"/>
  <text x="360" y="292" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.8">Replication chỉ tạo nhiều bản y hệt → vẫn cùng size. Partition mới cắt dataset ra.</text>
  <text x="360" y="312" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.8">Hệ lớn: chia thành nhiều partition, rồi mỗi partition lại nhân thành 3 replica.</text>
</svg>

---

## 3. Các chiến lược partition

### 3.1 Range partitioning
- Chia theo khoảng giá trị key: `A-F`, `G-M`, `N-Z`.
- **Ưu**: range query nhanh (`WHERE name BETWEEN 'A' AND 'C'`).
- **Nhược**: dễ skew nếu phân bố lệch. Vd: nhiều user tên bắt đầu bằng "N" hơn "X".
- **AWS**: Aurora MySQL/Postgres native partitioning (theo cột); DynamoDB **không** dùng range cho partition (chỉ cho sort key trong cùng partition).

### 3.2 Hash partitioning
- `hash(key) mod N` → node nào giữ key đó.
- **Ưu**: phân bố đều (giả sử hash function tốt).
- **Nhược**: mất tính ordered. Range query phải scan tất cả partition (scatter-gather).
- **AWS**: DynamoDB partition key dùng hash. Aurora `HASH PARTITION`.

### 3.3 Consistent hashing
- Thêm/bớt node chỉ ảnh hưởng 1 phần keys (không phải toàn bộ như `mod N`).
- **Vũ khí chính** của DynamoDB, Cassandra, ElastiCache Redis cluster.

### 3.4 Directory-based
- Có 1 bảng lookup `key → node`.
- **Ưu**: linh hoạt, có thể rebalance thông minh.
- **Nhược**: lookup table thành SPOF/bottleneck.

### 3.5 Geographic / list
- Theo region, theo tenant, theo customer.
- **AWS**: dùng nhiều trong Multi-Region (data residency), multi-tenant SaaS.

---

## 4. DynamoDB partition key — bài học đắt giá nhất

### 4.1 Mô hình
- Mỗi item có **partition key (PK)** bắt buộc, optional **sort key (SK)**.
- DynamoDB hash PK → quyết định partition.
- Items cùng PK nằm cùng partition, sort theo SK.

### 4.2 Hot partition là gì?

Mỗi partition có giới hạn cứng:
- **1000 WCU/s** (1KB/write).
- **3000 RCU/s** (4KB/read).
- **10 GB storage** (mềm, tự split).

Nếu 1 PK chiếm > 1000 WCU/s → **throttle**, dù tổng capacity của table còn dư. Đây là hot partition.

### 4.3 Ví dụ thiết kế tốt vs xấu

**Use case**: log truy cập, 1 triệu request/s, lưu để analytics.

❌ **PK = "logs"** (1 giá trị duy nhất, SK = timestamp)
- Tất cả write dồn vào 1 partition → throttle ở 1000/s.

❌ **PK = `date` (yyyy-mm-dd)**
- Hôm nay tất cả write dồn vào 1 partition → throttle.

✅ **PK = `userId`** (nếu mỗi user write ~ nhau)
- Phân bố đều theo user.

✅ **PK = `date#shardId`** với shardId = `random(0-9)`
- Tách 1 ngày thành 10 partition → 10x throughput. Đọc cần scan 10 shard (acceptable cho analytics).

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Hot partition: write dồn vào một partition gây throttle dù còn dư capacity</title>
  <desc>Bên trái thiết kế xấu PK bằng logs hoặc date làm mọi write dồn vào một partition, vượt giới hạn 1000 WCU mỗi giây và bị throttle dù các partition khác còn trống. Bên phải thiết kế tốt PK phân tán đều như userId hoặc date#shardId làm write trải đều, không partition nào vượt giới hạn.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Hot partition — phân bố write lệch vs đều</text>
  <text x="704" y="24" font-size="10.5" text-anchor="end" fill="currentColor" opacity="0.6">giới hạn: 1000 WCU/s mỗi partition</text>

  <text x="180" y="54" font-size="12.5" font-weight="700" text-anchor="middle" fill="#ef4444">✗ PK = "logs" / date — lệch</text>
  <g>
    <rect x="40" y="180" width="60" height="60" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="70" y="258" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">P1</text>
    <text x="70" y="215" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.5">~0</text>

    <rect x="120" y="74" width="60" height="166" rx="5" fill="#ef4444" fill-opacity="0.22" stroke="#ef4444" stroke-opacity="0.6"/>
    <text x="150" y="258" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">P2</text>
    <text x="150" y="68" font-size="10" font-weight="700" text-anchor="middle" fill="#ef4444">THROTTLE</text>
    <text x="150" y="160" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">1M/s</text>

    <rect x="200" y="180" width="60" height="60" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="230" y="258" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">P3</text>
    <text x="230" y="215" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.5">~0</text>
  </g>
  <line x1="40" y1="74" x2="260" y2="74" stroke="#ef4444" stroke-opacity="0.7" stroke-dasharray="5 4"/>
  <text x="150" y="284" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">tổng còn dư, vẫn throttle ở P2</text>

  <line x1="360" y1="60" x2="360" y2="290" stroke="currentColor" stroke-opacity="0.15"/>

  <text x="540" y="54" font-size="12.5" font-weight="700" text-anchor="middle" fill="#10b981">✓ PK = userId / date#shard — đều</text>
  <g>
    <rect x="420" y="160" width="44" height="80" rx="5" fill="#10b981" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="442" y="258" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">P1</text>
    <rect x="474" y="155" width="44" height="85" rx="5" fill="#10b981" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="496" y="258" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">P2</text>
    <rect x="528" y="162" width="44" height="78" rx="5" fill="#10b981" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="550" y="258" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">P3</text>
    <rect x="582" y="158" width="44" height="82" rx="5" fill="#10b981" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="604" y="258" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">P4</text>
  </g>
  <line x1="420" y1="74" x2="626" y2="74" stroke="#ef4444" stroke-opacity="0.7" stroke-dasharray="5 4"/>
  <text x="540" y="284" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">mỗi partition dưới giới hạn → không throttle</text>
</svg>

### 4.4 Adaptive capacity (2018+) và bursting
- DynamoDB tự re-balance khi phát hiện hot partition (vài phút sau).
- Không phải lý do để design ẩu — chỉ là safety net.

### 4.5 Quy tắc design partition key

1. **High cardinality** — nhiều giá trị unique.
2. **Uniform distribution** — request/giây xấp xỉ nhau.
3. **Composite keys** khi cần: `tenantId#entityType#id`.
4. **Write sharding** (`PK = base#random(0-N)`) cho write-heavy time-series.

---

## 5. Sharding RDS

RDS native chỉ scale vertical + Read Replica. Khi 1 instance không đủ:

### 5.1 Application-level sharding
- App tự quyết: `shard = userId mod 4` → connect đúng DB instance.
- Mỗi shard là 1 RDS độc lập.
- **Ưu**: full control.
- **Nhược**: code phức tạp, cross-shard query/transaction = pain.

### 5.2 Aurora Limitless Database (2024)
- AWS native sharding cho Aurora Postgres.
- Distributed transaction, cross-shard query do AWS lo.
- Mới, ít trận chiến thực địa. Nhưng đây là hướng đi tương lai.

### 5.3 Vertical sharding (functional)
- Tách theo **bảng** chứ không theo **hàng**. Vd: `users` DB tách khỏi `orders` DB.
- Đơn giản, hay làm trước khi horizontal sharding.

### 5.4 Khi nào cần sharding?
- 1 instance lớn nhất (`db.r6i.32xlarge` ~ 128 vCPU, 1TB RAM) còn không đủ.
- Storage > 64TB (giới hạn Aurora).
- Write QPS > capacity của instance lớn nhất sau optimize.

→ Đến đây mới sharding. **Trước đó hãy optimize query, index, caching, read replica, connection pooling**. Sharding là đường một chiều: vào dễ, ra khó.

---

## 6. Kafka / Kinesis partition

| Khía cạnh | Kafka | Kinesis Data Streams |
|-----------|-------|---------------------|
| Đơn vị | Partition | Shard |
| Quyết định partition | Producer: round-robin / hash key | Partition key → hash |
| Order guarantee | Trong 1 partition | Trong 1 shard |
| Throughput / unit | ~10MB/s write, 50MB/s read (tùy config) | 1MB/s write, 2MB/s read |
| Scale | Reassign partition (manual/Cruise Control) | Resharding (split/merge) |

**Hot partition Kafka**: tất cả message cùng `key` → 1 partition → 1 consumer xử lý → lag tăng. Fix: chọn key cardinality cao, hoặc bỏ key cho random distribution (mất ordering).

---

## 7. Resharding — đau đớn không tránh khỏi

Khi dataset tăng → cần thêm partition. Có 2 cách:

### 7.1 Re-hash & migrate (downtime)
- Đổi `mod N` → `mod 2N`, chuyển data tương ứng.
- Đơn giản nhưng cần freeze writes.

### 7.2 Consistent hashing + virtual nodes
- Mỗi physical node giữ nhiều "virtual node" trên ring.
- Thêm node mới chỉ ảnh hưởng vài virtual node.
- **DynamoDB, Cassandra, ElastiCache** đều dùng. App không thấy.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Consistent hashing ring với virtual node so với mod N</title>
  <desc>Bên trái mod N rehash toàn bộ key khi thêm node, hầu hết key phải di chuyển. Bên phải consistent hashing ring: key đi theo chiều kim đồng hồ tới node gần nhất; mỗi node có nhiều virtual node trải đều trên ring nên thêm node D chỉ kéo một phần nhỏ key từ các node lân cận, phần còn lại đứng yên.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Consistent hashing + virtual nodes</text>

  <text x="150" y="50" font-size="12.5" font-weight="700" text-anchor="middle" fill="#ef4444">mod N — thêm node = rehash hết</text>
  <g font-size="10.5">
    <text x="20" y="80" fill="currentColor" opacity="0.75">N=3:  key → hash % 3</text>
    <rect x="20" y="92" width="84" height="26" rx="5" fill="#ef4444" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="62" y="109" text-anchor="middle" fill="currentColor">k1 → n0</text>
    <rect x="110" y="92" width="84" height="26" rx="5" fill="#ef4444" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="152" y="109" text-anchor="middle" fill="currentColor">k2 → n1</text>
    <rect x="200" y="92" width="84" height="26" rx="5" fill="#ef4444" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="242" y="109" text-anchor="middle" fill="currentColor">k3 → n2</text>
    <text x="20" y="146" fill="currentColor" opacity="0.75">N=4:  key → hash % 4</text>
    <rect x="20" y="158" width="84" height="26" rx="5" fill="#ef4444" fill-opacity="0.22" stroke="#ef4444" stroke-opacity="0.5"/>
    <text x="62" y="175" text-anchor="middle" fill="currentColor">k1 → n1</text>
    <rect x="110" y="158" width="84" height="26" rx="5" fill="#ef4444" fill-opacity="0.22" stroke="#ef4444" stroke-opacity="0.5"/>
    <text x="152" y="175" text-anchor="middle" fill="currentColor">k2 → n2</text>
    <rect x="200" y="158" width="84" height="26" rx="5" fill="#ef4444" fill-opacity="0.22" stroke="#ef4444" stroke-opacity="0.5"/>
    <text x="242" y="175" text-anchor="middle" fill="currentColor">k3 → n3</text>
  </g>
  <text x="150" y="210" font-size="10.5" text-anchor="middle" fill="#ef4444">hầu như MỌI key phải đổi node</text>

  <line x1="320" y1="44" x2="320" y2="356" stroke="currentColor" stroke-opacity="0.15"/>

  <text x="530" y="50" font-size="12.5" font-weight="700" text-anchor="middle" fill="#10b981">ring — thêm D chỉ động 1 phần</text>
  <circle cx="530" cy="200" r="100" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-width="2"/>
  <text x="530" y="200" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.45">key đi theo</text>
  <text x="530" y="214" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.45">chiều kim đồng hồ</text>

  <g>
    <circle cx="530" cy="100" r="9" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="530" y="86" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">A</text>
    <circle cx="620" cy="155" r="9" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="640" y="150" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">A</text>
    <circle cx="600" cy="270" r="9" fill="#10b981" fill-opacity="0.9"/>
    <text x="620" y="282" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">B</text>
    <circle cx="465" cy="285" r="9" fill="#10b981" fill-opacity="0.9"/>
    <text x="450" y="300" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">B</text>
    <circle cx="437" cy="138" r="9" fill="#8b5cf6" fill-opacity="0.9"/>
    <text x="418" y="133" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">C</text>
    <circle cx="448" cy="222" r="9" fill="#8b5cf6" fill-opacity="0.9"/>
    <text x="430" y="226" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">C</text>
  </g>

  <circle cx="555" cy="298" r="10" fill="#f59e0b" fill-opacity="0.95"/>
  <text x="555" y="302" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">D</text>
  <path d="M610 250 A 95 95 0 0 1 568 295" fill="none" stroke="#f59e0b" stroke-width="3"/>
  <text x="525" y="345" font-size="10.5" text-anchor="middle" fill="#f59e0b">D thêm vào → chỉ kéo key của cung này</text>

  <g font-size="10" opacity="0.8">
    <text x="530" y="372" text-anchor="middle" fill="currentColor">A, B, C đều có 2 virtual node → trải đều, các key còn lại đứng yên</text>
  </g>
</svg>

### 7.3 Pre-split / over-partition
- Tạo nhiều partition hơn cần (vd: 256), assign 4 vào mỗi node (64 node).
- Khi thêm node, chỉ chuyển 1-2 partition. **Kafka pattern**.

→ Quy tắc: **chọn số partition dư dả ngay từ đầu** dễ hơn resharding sau. Nhưng quá nhiều partition cũng tốn (metadata, overhead).

---

## 8. Cross-partition operations — pain

| Operation | Vấn đề | Cách giải |
|-----------|--------|-----------|
| **Range query** trên hash partition | Phải scan tất cả partition | Secondary index theo dimension cần range, hoặc dùng OpenSearch/Athena |
| **Aggregation** (COUNT, SUM toàn bộ) | Scatter-gather | Pre-aggregate (incremental), hoặc dùng warehouse (Redshift) |
| **Transaction** cross-partition | Cần 2PC (two-phase commit) | DynamoDB `TransactWriteItems` (giới hạn 100 item, 1 region); Aurora Limitless distributed txn |
| **Join** cross-shard | Khó & chậm | Denormalize, hoặc tách read model (CQRS) |

→ Quy tắc: **design schema sao cho 99% query hit 1 partition**. Cross-partition là exception, không phải norm.

---

## 9. Ví dụ design cho 3 use case

### 9.1 E-commerce — bảng `orders`, 100M/năm
- **PK = `customerId`**, **SK = `orderId`**.
- Query "đơn hàng của tôi" → 1 partition, nhanh.
- Query "tất cả đơn hôm nay" → GSI với PK = `date`, SK = `orderId`. (Note: GSI eventual consistency)

### 9.2 IoT — sensor data, 1B point/ngày
- ❌ PK = `sensorId` → sensor lỗi spam data → hot partition.
- ✅ PK = `sensorId#hour`, SK = `timestamp` → mỗi giờ tạo partition mới. Đọc 1 ngày = 24 partition.
- ✅ Hoặc dùng **Timestream** (purpose-built).

### 9.3 Multi-tenant SaaS
- **Soft tenancy**: PK = `tenantId#entityId`. Mọi tenant share table.
- **Hard tenancy**: mỗi tenant 1 table/database (compliance, noisy neighbor).
- Trade-off: hard isolation tốn nhiều resource hơn, nhưng dễ tuân thủ data residency.

---

## 10. Cạm bẫy đề thi (SAA)

1. **"DynamoDB tự scale → không lo partition design"** → **Sai**. Adaptive capacity chỉ giúp trong giới hạn; design xấu vẫn throttle.
2. **"GSI cùng partition key với base table"** → **Sai**, GSI có PK riêng (đó là điểm mạnh của GSI — cho phép truy vấn theo dimension khác).
3. **"Tăng RCU/WCU = giải quyết throttle"** → **Sai** nếu hot partition. Capacity chia đều cho tất cả partition; 1 partition vẫn cap ở 3000/1000.
4. **"Aurora auto-sharding"** → Chỉ **Aurora Limitless** mới sharding. Aurora thường thì không.
5. **"Kinesis tự reshard"** → **Sai** (trừ on-demand mode). Provisioned phải split/merge thủ công.
6. **"Sort key tăng cardinality của partition"** → **Sai**, SK chỉ sort trong partition; cardinality partition phụ thuộc **partition key**.

---

## 11. Tóm tắt 1 dòng

> **Replication giải quyết availability; partition giải quyết scale.** Hot partition là kẻ thù lớn nhất — design key cẩn thận hơn design index. Cross-partition operation luôn đắt — schema phải tránh.

---

## 12. Bài tập tự kiểm tra

1. Bạn build DynamoDB table cho leaderboard game, 10M user, top 100 hiển thị real-time. Design PK/SK + GSI sao cho không hot partition?
2. Một bảng RDS Postgres 5TB, 50k QPS read, 5k QPS write. CPU thường 80%. Bạn optimize gì trước khi sharding? (Liệt kê thứ tự ưu tiên.)
3. Kafka topic có 4 partition, 4 consumer trong cùng group. 1 consumer luôn lag. Có thể nguyên nhân nào? (≥2 nguyên nhân khác nhau)
4. DynamoDB partition limit 1000 WCU/s. Bạn cần 5000 WCU/s cho key `breaking-news`. Làm sao?
5. So sánh range vs hash partitioning cho bảng `events(timestamp, user_id, event_type)` dùng cho analytics dashboard. Chọn cái nào & vì sao?

---

## 13. Đọc thêm

- *Designing Data-Intensive Applications* — Kleppmann, chương 6 (Partitioning).
- AWS Builder's Library — *Caching challenges* và *Workload isolation*.
- *Dynamo: Amazon's Highly Available Key-value Store* — SOSP 2007 (paper gốc, consistent hashing).
- *Amazon DynamoDB: A Scalable, Predictably Performant…* — USENIX ATC 2022.

---

**Bài tiếp theo**: [[foundations-06-failure-modes]] — cascading failure, retry storm, circuit breaker. Vì sao Multi-AZ có thể vẫn down toàn bộ.
