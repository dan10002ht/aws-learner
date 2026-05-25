# Foundations 05 — Partitioning & Sharding

> Mục tiêu: Hiểu vì sao **một bảng quá to phải bị chia nhỏ**, các chiến lược chia, và **hot partition** — kẻ giết hệ thống thầm lặng nhất. Sau bài này, bạn sẽ design DynamoDB partition key đủ chuẩn và biết khi nào RDS phải sharding.

Tiền đề: [[01-cap-theorem]], [[03-replication-and-quorum]].

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

**Bài tiếp theo**: [[06-failure-modes]] — cascading failure, retry storm, circuit breaker. Vì sao Multi-AZ có thể vẫn down toàn bộ.
