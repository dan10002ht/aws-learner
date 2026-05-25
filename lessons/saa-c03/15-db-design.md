# Bài 15 — Database Design

**Prerequisite foundations:** [[01-cap-theorem]], [[02-consistency-models]], [[05-partitioning-sharding]].

## 1. Mục tiêu
- Áp dụng CAP/consistency vào chọn DB AWS.
- Thiết kế DynamoDB single-table với access pattern.
- Hiểu RDS Multi-AZ vs Read Replica vs Aurora vs Aurora Global.
- Pattern cache (DAX, ElastiCache) — when và how.

---

## 2. Lựa chọn DB qua lăng kính CAP

| Service | CAP | Consistency mặc định | Use case |
|---------|-----|----------------------|----------|
| **RDS single-AZ** | CA (giả định không network partition trong AZ) | Strong | Dev/test, single-instance |
| **RDS Multi-AZ** | CP (failover khi partition) | Strong (sync replication) | Prod HA single-region |
| **RDS Read Replica** | AP (async lag) | **Eventual** (read replica) | Scale read |
| **Aurora** | CP (6 replica 3 AZ, quorum 4/6 write, 3/6 read) | Strong | Prod, high-perf |
| **Aurora Global** | AP cross-region | Strong intra-region, **eventual** cross-region (~1s) | Multi-region read |
| **DynamoDB** | AP default | **Eventual** default, **strong** opt-in (2x cost RCU) | NoSQL, scale lớn |
| **DynamoDB Global Tables** | AP | **Eventual**, last-writer-wins | Multi-region active-active |
| **ElastiCache Redis cluster** | CP (with replication) | Strong primary, eventual replica | Cache |

→ Đọc kỹ [[01-cap-theorem]] để hiểu trade-off.

---

## 3. RDS deep

### 3.1 Multi-AZ vs Read Replica

| | Multi-AZ | Read Replica |
|--|----------|---------------|
| Mục đích | HA failover | Scale read |
| Replication | **Sync** | **Async** |
| Standby serve read | **Không** | **Có** |
| Failover | Auto, 60-120s, DNS update | Manual promote |
| Cross-AZ | Same region (multi-AZ DB instance: 2 AZ; multi-AZ cluster: 3 AZ) | Same hoặc **cross-region** |
| Latency tăng write | Có (sync) | Không (async không ảnh hưởng primary) |

### 3.2 Multi-AZ DB Cluster (mới, 2022)
- 3 AZ: 1 writer + 2 readers.
- **Reader serve read** (khác Multi-AZ Instance).
- Failover < 35s.
- MySQL/PostgreSQL only.

### 3.3 Backup
- **Automated** retention 0-35 ngày, daily snapshot + transaction log → **PITR** đến giây.
- **Manual snapshot** giữ tới khi xóa, share account/region.
- **Encryption** bật khi tạo, không bật sau (workaround: snapshot → copy encrypted → restore).

### 3.4 RDS Proxy
- Connection pool managed.
- **Bắt buộc** với Lambda + RDS (Lambda mở quá nhiều conn).
- Failover < 1s.
- IAM auth integration.

### 3.5 Engine option
- MySQL, PostgreSQL, MariaDB, Oracle, SQL Server.
- **Custom for Oracle/SQL Server** — quyền OS-level (hiếm need).

---

## 4. Aurora deep

### 4.1 Đặc điểm
- **5x MySQL, 3x PostgreSQL** performance.
- Storage: auto-scale 10GB → 128TB, **6 replica 3 AZ** built-in.
- **Quorum**: write 4/6, read 3/6 (foundation [[03-replication-quorum]]).
- Failover < 30s.

### 4.2 Cluster endpoints
- **Cluster endpoint (writer)** — luôn trỏ writer.
- **Reader endpoint** — load balance reader replicas.
- **Custom endpoint** — subset replica (e.g. reporting replica).
- **Instance endpoint** — 1 cụ thể.

### 4.3 Aurora Replica
- Up to 15.
- **Share storage** với writer → lag rất thấp (10s of ms).
- Có thể promote nhanh khi writer fail.

### 4.4 Aurora Global Database
- 1 primary region + up to 5 read region.
- Replication **dedicated infrastructure**, < 1s lag, **RPO 1s, RTO < 1 phút**.
- Read region có cluster với reader endpoint.
- **Managed failover** đến read region (downtime ~1 phút).
- Use case: global app, DR cross-region.

### 4.5 Aurora Serverless v2
- Auto-scale ACU (Aurora Capacity Unit) **realtime**, không pause như v1.
- MySQL + PostgreSQL.
- Use case: variable workload, dev/test.

### 4.6 Aurora Backtrack
- **MySQL only**. Rewind in-place đến 72h.
- Không cần restore snapshot.

### 4.7 I/O Optimized (2023)
- Trả $/storage cao hơn nhưng I/O **free**.
- Tốt khi I/O cost > 25% tổng Aurora cost.

---

## 5. DynamoDB design deep

### 5.1 Data model
- **Table** → **Item** (~row) → **Attribute** (~column, schemaless).
- **Primary Key**: PK only hoặc PK+SK.
- **Max item size 400KB**.

### 5.2 Index

| | LSI | GSI |
|--|-----|-----|
| Key | Same PK, **different SK** | **Different PK + SK** |
| Tạo | **Cùng lúc với table** | Bất cứ lúc nào |
| Throughput | Share với base table | **Riêng** |
| Consistency | Strong option | **Eventual only** |
| Max | 5 per table | 20 per table |
| Projection | KEYS_ONLY / INCLUDE / ALL | Same |

### 5.3 Capacity
- **On-Demand**: pay per request, scale tức thì, đắt **7x** provisioned.
- **Provisioned**: RCU/WCU fixed, auto-scaling option, throttle khi spike.
- 1 WCU = 1 KB/s write.
- 1 RCU = 1 strong-read 4KB/s = 2 eventual-read 4KB/s.

### 5.4 Single-table design (Rick Houlihan)
1 table phục vụ nhiều entity, lookup pattern khác qua GSI.

**Pattern**:
- PK = entity prefix (`USER#u1`, `ORDER#o100`, `PRODUCT#p1`).
- SK = sort/relationship (`PROFILE`, `ORDER#date#id`, `ITEM#productId`).
- GSI overload: `GSI1PK` = `STATUS#pending`, `GSI1SK` = timestamp.

**Lợi ích**: 1 query nhận multiple entity (User + their Orders) trong 1 round trip.

**Nhược**: phải biết access pattern trước, khó migrate, cognitive complexity cao.

### 5.5 Hot partition (foundation [[05-partitioning-sharding]])
- **DDB chia data theo hash(PK) → partition**. Mỗi partition limit 3000 RCU + 1000 WCU.
- PK low cardinality (status, country) → hot.
- Solution: **suffix PK** với random shard `USER#u1#${random(0,9)}` → write fan-out.
- **Adaptive capacity** (auto từ 2019) — DDB tự rebalance, nhưng giới hạn.

### 5.6 Streams + DDB Triggers
- CDC log 24h.
- 4 view types: KEYS_ONLY, NEW_IMAGE, OLD_IMAGE, NEW_AND_OLD_IMAGES.
- Trigger Lambda → EventBridge / external service.
- Use case: search index sync, audit, outbox pattern.

### 5.7 DAX (DynamoDB Accelerator)
- **Microsecond cache** in-VPC cluster.
- Write-through cache.
- Eventual consistent read by default.
- Use case: read-heavy hot data.

### 5.8 Global Tables
- Multi-region active-active.
- **Eventual consistency** cross-region (~1s).
- **Last-writer-wins** conflict resolution.
- Use case: global low-latency, không cần strong cross-region.

### 5.9 Transactions
- Up to 100 items / 4MB total / multiple table.
- 2x WCU/RCU cost.
- ACID.

### 5.10 TTL
- Auto-delete item theo timestamp attribute.
- **Free**, eventually consistent (< 48h delete).
- Use case: session, soft-delete archive.

---

## 6. Caching patterns

### 6.1 Cache-aside (lazy loading)
```
1. App GET cache(key)
2. Hit → return.
3. Miss → query DB → write cache TTL → return.
```
✅ Đơn giản. ❌ First request slow (cold miss).

### 6.2 Write-through
```
1. Write DB.
2. Write cache.
```
✅ Cache always warm. ❌ Write latency cao.

### 6.3 Write-behind
```
1. Write cache.
2. Async batch flush DB.
```
✅ Write fast. ❌ Risk lose data nếu cache fail.

### 6.4 Refresh-ahead
- TTL gần hết → background refresh.
- ✅ Avoid cold miss spike. ❌ Complex.

### 6.5 ElastiCache choice

| | Redis | Memcached |
|--|-------|-----------|
| Data structures | String, List, Set, Hash, Stream, Sorted Set, HyperLogLog | String only |
| Persistence | AOF, RDB snapshot | None |
| Replication | ✅ (cluster mode hoặc primary+replica) | ❌ |
| HA | ✅ Multi-AZ failover | ❌ |
| Pub/Sub | ✅ | ❌ |
| Cluster sharding | Cluster mode | Auto Discovery client-side |
| Use case | Cache + queue + leaderboard + session | Simple object cache |

**Cluster mode enabled** (sharded): scale horizontal, partition key hashed across shards. Slot = 16384.

**Cluster mode disabled** (replication group): 1 primary + up to 5 replica, HA failover.

---

## 7. Tự kiểm tra

1. App global, write-heavy, cần latency thấp toàn cầu, strong consistency cross-region. Service?
   <details><summary>Đáp án</summary>**Spanner GCP**. AWS không có 1:1. **Aurora Global** strong intra, eventual cross. **DDB Global Tables** AP. Nếu bắt buộc strong cross-region → workaround (single writer region + Route53 latency, hoặc external coordinator).</details>

2. RDS PostgreSQL Multi-AZ. Promote standby thành writer khi nào?
   <details><summary>Đáp án</summary>**Tự động** khi primary fail (60-120s, DNS update). Multi-AZ DB cluster < 35s.</details>

3. Lambda + RDS connection exhaustion. Fix?
   <details><summary>Đáp án</summary>**RDS Proxy** — pool connection. Hoặc cân nhắc **DynamoDB** (no connection).</details>

4. DDB table với PK = `status` (4 giá trị). Vấn đề?
   <details><summary>Đáp án</summary>**Hot partition** — 4 PK chỉ map 4 partition, mỗi partition limit 3000 RCU. Fix: suffix random hoặc redesign PK (UserId, OrderId).</details>

5. App e-commerce, query: getUserOrders, getProductsByCategory, getOrdersByStatus. DDB design?
   <details><summary>Đáp án</summary>**Single-table**: PK=USER#id SK=ORDER#date, PK=CAT#name SK=PRODUCT#id. GSI1: `GSI1PK=STATUS#pending GSI1SK=timestamp`.</details>

6. Aurora vs DynamoDB cho microservice catalog?
   <details><summary>Đáp án</summary>Depends. Có JOIN + transaction + ad-hoc query → **Aurora**. Scale lớn + access pattern fix + ms latency → **DDB**. Catalog thường ít write, nhiều read filter → **Aurora + ElastiCache** cache layer.</details>

7. ElastiCache Redis cluster mode disabled. Failover bao lâu?
   <details><summary>Đáp án</summary>**< 1 phút** với Multi-AZ. Replica auto promote.</details>

8. DDB strong consistency read cost?
   <details><summary>Đáp án</summary>**2x** eventual. 1 RCU = 1 strong-read 4KB = 2 eventual-read 4KB.</details>

9. Cache pattern: data update nhiều, đọc nhiều, không chấp nhận stale. Pattern?
   <details><summary>Đáp án</summary>**Write-through** + short TTL. Hoặc bypass cache cho read sau write.</details>

10. RDS encrypt unencrypted DB?
    <details><summary>Đáp án</summary>Snapshot → copy snapshot với encryption KMS → restore. Có downtime cutover hoặc dùng DMS để online.</details>

---

## 8. Đối chiếu GCP

| AWS | GCP |
|-----|-----|
| RDS | Cloud SQL |
| RDS Multi-AZ | Cloud SQL HA |
| RDS Read Replica | Cloud SQL Read Replica |
| Aurora | **AlloyDB** (closest, MS-PG compatible perf) |
| Aurora Global | **Spanner** (strong consistent multi-region multi-writer) |
| DynamoDB | Firestore / Bigtable |
| DDB Global Tables | Spanner / Firestore multi-region |
| ElastiCache Redis | Memorystore Redis |
| DAX | (không có) |
| Redshift | BigQuery |
| Athena | BigQuery (serverless query) |

**Bẫy lớn:**
1. **Spanner vs Aurora Global** — Spanner strong consistent multi-writer, Aurora Global 1 writer eventual reader region. Khác hẳn paradigm.
2. **Firestore vs DynamoDB** — Firestore document + real-time listener; DDB cần Streams + Lambda. Mindset query khác.
3. **BigQuery storage native**, Athena chỉ query S3. Migrate BQ → Athena cần move data sang S3 Parquet.

→ Đọc [[01-cap-theorem]] phần PACELC để hiểu vì sao Spanner và Aurora Global khác nhau căn bản.

---

## 9. Lưu ý SAA

- **Multi-AZ ≠ Read Replica** (đề thi hay bẫy).
- **Aurora 6 replica 3 AZ** built-in, quorum 4/6 write.
- **Aurora Global** RPO 1s, RTO < 1 phút.
- **DDB GSI eventual only**, **LSI strong option**.
- **DDB On-Demand 7x đắt hơn provisioned** cho steady workload.
- **DDB hot partition** — PK cardinality cao.
- **DAX** µs cache, only DDB, in-VPC.
- **DDB Global Tables** active-active eventual.
- **RDS Proxy** bắt buộc Lambda + RDS.
- **Aurora Backtrack** MySQL 72h.
- **ElastiCache Redis Multi-AZ** với failover.
- **PITR** RDS 35 ngày, DDB 35 ngày.

## 10. Lưu ý đi làm

### Best practice
- **Default RDS PostgreSQL Multi-AZ Cluster**.
- Backup retention **35 ngày** cho prod.
- Performance Insights + Enhanced Monitoring ON.
- **Deletion Protection + Final Snapshot** ON.
- Custom Parameter Group + Option Group (không default).
- Maintenance window low-traffic.
- Monitor `ReplicaLag` (RDS), `ReplicationLatency` (Aurora Global).

### DDB best practice
- **Access pattern document trước** khi tạo table.
- **Single-table** cho microservice + đa entity.
- **PITR + on-demand backup** ON.
- **Auto-scaling provisioned** với target 70%.
- **Streams + Lambda** outbox pattern.
- **Conditional update + version attribute** chống lost update.

### Anti-pattern
- ❌ Self-managed MySQL EC2 prod.
- ❌ Multi-AZ thay vì Read Replica để scale read.
- ❌ Read Replica thay vì Multi-AZ cho HA.
- ❌ DDB scan thay vì query (full table = đắt + slow).
- ❌ Cache TTL quá dài → stale.
- ❌ ElastiCache Memcached prod cần HA.
- ❌ RDS unencrypted prod.

## 11. Foundations
- [[01-cap-theorem]] — RDS Multi-AZ là CP, DDB default AP.
- [[02-consistency-models]] — strong vs eventual ở DDB read option.
- [[03-replication-quorum]] — Aurora 4/6 quorum.
- [[04-latency-consistency]] — Aurora Global vs Spanner.
- [[05-partitioning-sharding]] — DDB hot partition.

## 12. Flashcard

- **RDS Multi-AZ** — HA sync standby, không serve read (trừ Multi-AZ Cluster).
- **RDS Read Replica** — async, scale read, cross-region.
- **Multi-AZ Cluster** (2022) — 3 AZ, reader serve read, < 35s failover.
- **Aurora** — 5x MySQL, 6 replica 3 AZ, quorum 4/6.
- **Aurora Global** — 1 writer + 5 reader region, RPO 1s.
- **Aurora Serverless v2** — realtime ACU, MySQL+PG.
- **Aurora Backtrack** — MySQL 72h rewind.
- **Aurora I/O Optimized** — I/O free if > 25% cost.
- **RDS Proxy** — connection pool cho Lambda.
- **DDB On-Demand** — 7x provisioned for steady.
- **DDB Strong read** — 2x cost.
- **GSI eventual + own throughput**. **LSI strong option, share throughput, same PK**.
- **Hot partition** — PK cardinality cao + suffix shard.
- **Adaptive capacity** auto.
- **DAX** µs cache, in-VPC.
- **Streams** 24h CDC, 4 view types.
- **Global Tables** eventual + last-writer-wins.
- **PITR** 35 ngày DDB + RDS.
- **ElastiCache Redis** HA, Memcached không HA.
- **Cluster mode enabled** = sharded.
