# Bài 7 — Databases trên AWS

## 1. Mục tiêu
Sau bài này bạn có thể:
- Chọn đúng DB cho từng workload (relational / NoSQL / cache / warehouse / graph / time-series).
- Phân biệt **RDS Multi-AZ vs Read Replica vs Aurora**.
- Hiểu **DynamoDB** model (PK/SK, GSI/LSI, on-demand/provisioned).
- Biết khi nào dùng **ElastiCache, Redshift, Athena, Glue**.

---

## 2. Lý thuyết

### 2.1 Map nhu cầu → service

| Nhu cầu | Service |
|---------|---------|
| Relational managed (MySQL/PG/MariaDB/SQL Server/Oracle) | **RDS** |
| Relational cloud-native, auto-scale storage, 5x performance | **Aurora** (MySQL/PG compatible) |
| Key-value/document, single-digit ms, scale vô hạn | **DynamoDB** |
| In-memory cache (sub-ms) | **ElastiCache** (Redis/Memcached) |
| Microsecond cache cho DynamoDB | **DAX** |
| Data warehouse OLAP, PB-scale | **Redshift** |
| Query S3 không di chuyển data | **Athena** |
| ETL managed | **Glue** |
| Document (MongoDB-compatible) | **DocumentDB** |
| Graph | **Neptune** |
| Time-series (IoT, metrics) | **Timestream** |
| Ledger bất biến + cryptographic verifiable | **QLDB** |
| Cassandra-compatible wide-column | **Keyspaces** |
| Search/log analytics | **OpenSearch Service** |

### 2.2 RDS (Relational Database Service)

**Engines:** MySQL, PostgreSQL, MariaDB, Oracle, SQL Server, **Aurora** (variant đặc biệt).

**Features:**
- **Managed**: AWS lo OS, engine patch, backup, monitoring.
- **Instance class**: `db.t3.micro` (free tier), `db.m6i.large`, `db.r6i.xlarge`…
- **Storage**: gp3 / io1 / magnetic. Auto-scale storage (chỉ tăng, không giảm).
- **Backup**:
  - **Automated backup** retention 0–35 ngày, daily snapshot + transaction log.
  - **Manual snapshot** giữ tới khi xóa, có thể share account/region.
- **Restore**: từ snapshot hoặc Point-in-Time Recovery (PITR, đến giây trong retention).
- **Encryption at rest**: KMS, **chỉ bật khi tạo**, không bật được sau.
- **Multi-AZ** (HA, sync standby):
  - Standby ở AZ khác, **KHÔNG dùng để read** (chờ failover).
  - Failover tự động khi primary fail: 60–120s, DNS update.
- **Read Replica** (scale read, async):
  - 1 primary + up to 15 replica (MySQL/PG).
  - Async replication → có thể lag.
  - Cross-AZ hoặc **cross-region**.
  - Có thể promote thành standalone DB.
- **RDS Proxy**: connection pool managed, **bắt buộc** khi Lambda mở nhiều kết nối.

**Limits & gotchas:**
- Không SSH vào DB server.
- Không truy cập OS-level file.
- Cần extension/feature đặc biệt → phải dùng Aurora hoặc EC2 self-managed.
- **Multi-AZ ≠ Read Replica** (đề thi hay bẫy chỗ này).

### 2.3 Aurora — RDS premium

- **MySQL-compatible** hoặc **PostgreSQL-compatible**.
- Performance: **5x MySQL**, **3x PostgreSQL**.
- Storage: auto-scale 10GB → 128TB, **6 replica across 3 AZ** built-in.
- Failover < 30s.
- **Aurora Replica**: up to 15, share storage với primary → replication lag rất thấp.
- **Aurora Global Database**: 1 primary region + up to 5 read region, replication < 1s, RPO 1s, RTO < 1 phút.
- **Aurora Serverless v2**: auto scale capacity (ACU), không cần chọn instance class, support MySQL + PG.
- **Aurora Backtrack** (MySQL only): rewind in-place tới 72h, không cần restore snapshot.
- **Cluster endpoint** (writer) + **Reader endpoint** (load balance reader) + **Custom endpoint**.

### 2.4 DynamoDB

**Đặc điểm:**
- **Serverless NoSQL**, single-digit ms.
- Auto-scale, scale vô hạn (về mặt thực tế).
- **Managed**, không cần VPC.
- Pay per request hoặc provisioned.

**Data model:**
- **Table** → **Item** (như row) → **Attribute** (như column, schemaless).
- **Primary Key**:
  - **Simple**: Partition Key (PK) — hash để chia partition.
  - **Composite**: PK + Sort Key (SK) — items same PK ordered by SK.

**Indexes:**
- **GSI (Global Secondary Index)**: PK/SK khác, **eventual consistent**, throughput riêng, tạo bất cứ lúc nào.
- **LSI (Local Secondary Index)**: **same PK, different SK**, strong consistent, **phải tạo khi tạo table**, max 5/table.

**Capacity:**
- **On-Demand**: pay per request, scale tức thì, đắt hơn provisioned 7x.
- **Provisioned**: RCU/WCU cố định, auto-scaling, rẻ nhưng có thể throttle khi spike.
- 1 WCU = 1 KB/s write. 1 RCU = 1 strong-consistent read 4KB/s (hoặc 2 eventual).

**Features:**
- **Streams**: CDC log 24h, trigger Lambda.
- **TTL**: tự xóa item theo timestamp, free.
- **Transactions**: 2x WCU/RCU cost, ACID 100 item/transaction.
- **Global Tables**: multi-region active-active, eventual consistency, last-writer-wins.
- **DAX**: cluster cache microsecond cho DynamoDB, in-VPC.
- **PITR**: point-in-time recovery 35 ngày.
- **Backup**: on-demand snapshot (manual) + continuous (PITR).

**Design tips:**
- **Tránh hot partition**: PK phải có cardinality cao.
- **Single-table design** (Rick Houlihan): 1 table phục vụ nhiều entity, lookup pattern khác qua GSI.
- Tính WCU/RCU trước, mua provisioned để rẻ.

### 2.5 ElastiCache

**2 engine:**

| | Redis | Memcached |
|--|-------|-----------|
| Data type | String, List, Set, Hash, Stream… | String only |
| Persistence | AOF, snapshot | Không |
| Replication | Có (cluster mode) | Không |
| Multi-AZ HA | Có | Không (chỉ multi-node) |
| Pub/Sub | Có | Không |
| Use case | Cache, session, leaderboard, queue | Simple cache |

**Patterns:**
- **Cache-aside** (lazy loading): app check cache → miss → query DB → write cache.
- **Write-through**: write cache + DB cùng lúc.
- Cache expiry với TTL.

### 2.6 Redshift (Data Warehouse)

- **Columnar storage**, MPP (massively parallel processing).
- PB-scale, OLAP (not OLTP).
- **RA3 nodes**: separate compute & storage, scale độc lập.
- **Concurrency Scaling**: free 1h/day cluster, queue spike.
- **AQUA** (Advanced Query Accelerator): cache + accelerator.
- **Redshift Spectrum**: query S3 trực tiếp (giống Athena).
- **Redshift Serverless** (mới): no cluster management.

### 2.7 Athena, Glue, Lake Formation

- **Athena** — serverless SQL trên S3 (Presto engine). Pay per TB scanned. Format Parquet/ORC giảm 90% cost.
- **Glue** — ETL managed (Spark). Data Catalog (Hive metastore tương thích). Crawler tự discover schema.
- **Lake Formation** — fine-grained access control trên data lake S3 + Glue.

**Pattern data lake:**
```
S3 raw → Glue Crawler → Glue Data Catalog
                        ↓
                Athena / Redshift Spectrum / EMR / SageMaker
```

### 2.8 Database migration

- **DMS (Database Migration Service)**: migrate hetero (Oracle → Aurora) hoặc homo. Online (CDC).
- **SCT (Schema Conversion Tool)**: convert schema giữa engine khác (Oracle PL/SQL → PostgreSQL).
- **Snowball Edge** cho data > 10TB offline.

### 2.9 Khi nào dùng cái nào (decision tree đơn giản)

```
Cần SQL JOIN, transaction ACID?
├── Yes
│   ├── Workload chuẩn → RDS (Multi-AZ, Read Replica)
│   ├── Performance cao + cloud-native → Aurora
│   ├── Global app → Aurora Global
│   └── Document MongoDB → DocumentDB
└── No
    ├── Key-value/document scale lớn → DynamoDB
    ├── Cache trước DB → ElastiCache (Redis)
    ├── Microsecond cache DDB → DAX
    ├── Graph → Neptune
    ├── Time-series → Timestream
    ├── Ledger immutable → QLDB
    ├── Cassandra → Keyspaces
    ├── Wide column big data → DynamoDB hoặc Keyspaces
    ├── Warehouse OLAP → Redshift
    ├── Query S3 ad-hoc → Athena
    ├── Search/log → OpenSearch
    └── Wide column big data → DynamoDB
```

---

## 3. Hands-on có account

### Lab 1 — RDS MySQL free tier (15 phút)
```bash
aws rds create-db-instance \
  --db-instance-identifier learn-mysql \
  --db-instance-class db.t3.micro \
  --engine mysql --engine-version 8.0 \
  --master-username admin --master-user-password 'ChangeMe123!' \
  --allocated-storage 20 --storage-type gp3 \
  --vpc-security-group-ids $SG_DB \
  --db-subnet-group-name learn-db-subnet \
  --backup-retention-period 7 \
  --no-publicly-accessible \
  --tags Key=Project,Value=aws-learner

aws rds wait db-instance-available --db-instance-identifier learn-mysql

# Lấy endpoint
aws rds describe-db-instances --db-instance-identifier learn-mysql \
  --query 'DBInstances[0].Endpoint.Address' --output text
```

Test từ EC2 cùng VPC: `mysql -h <endpoint> -u admin -p`.

### Lab 2 — Snapshot + restore (10 phút)
```bash
aws rds create-db-snapshot --db-instance-identifier learn-mysql \
  --db-snapshot-identifier learn-mysql-snap-1

aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier learn-mysql-restored \
  --db-snapshot-identifier learn-mysql-snap-1
```

### Lab 3 — Read Replica (10 phút)
```bash
aws rds create-db-instance-read-replica \
  --db-instance-identifier learn-mysql-rr \
  --source-db-instance-identifier learn-mysql

# Promote
aws rds promote-read-replica --db-instance-identifier learn-mysql-rr
```

### Lab 4 — DynamoDB table + CRUD (10 phút)
```bash
aws dynamodb create-table \
  --table-name learn-Users \
  --attribute-definitions AttributeName=UserId,AttributeType=S AttributeName=CreatedAt,AttributeType=S \
  --key-schema AttributeName=UserId,KeyType=HASH AttributeName=CreatedAt,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --tags Key=Project,Value=aws-learner

aws dynamodb put-item --table-name learn-Users --item '{
  "UserId": {"S": "u1"}, "CreatedAt": {"S": "2026-05-12"}, "Name": {"S": "Alice"}
}'

aws dynamodb get-item --table-name learn-Users \
  --key '{"UserId":{"S":"u1"},"CreatedAt":{"S":"2026-05-12"}}'

aws dynamodb query --table-name learn-Users \
  --key-condition-expression 'UserId = :u' \
  --expression-attribute-values '{":u":{"S":"u1"}}'
```

### Lab 5 — DynamoDB GSI (15 phút)
Thêm GSI để query theo `Email`:
```bash
aws dynamodb update-table --table-name learn-Users \
  --attribute-definitions AttributeName=Email,AttributeType=S \
  --global-secondary-index-updates '[{
    "Create": {
      "IndexName": "EmailIndex",
      "KeySchema": [{"AttributeName":"Email","KeyType":"HASH"}],
      "Projection": {"ProjectionType":"ALL"}
    }
  }]'
```

### Lab 6 — ElastiCache Redis (cost ~$0.02/h)
Yêu cầu subnet group. Tạo cluster Redis 1 node `cache.t3.micro`:
```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id learn-redis \
  --engine redis --cache-node-type cache.t3.micro --num-cache-nodes 1
```

### Lab 7 — Athena query S3 (no provision)
1. Upload CSV vào `s3://learn-athena/orders/`.
2. Athena: create external table.
3. Run `SELECT COUNT(*) FROM orders WHERE country='VN'`.
4. Pay per TB scanned — file nhỏ ~$0.001.

---

## 4. Hands-on không tốn tiền

### LocalStack
```bash
# DynamoDB local
awslocal dynamodb create-table --table-name Users \
  --attribute-definitions AttributeName=Id,AttributeType=S \
  --key-schema AttributeName=Id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# RDS (limited)
awslocal rds create-db-instance ...
```

### Docker local
```bash
# DynamoDB Local
docker run -p 8000:8000 amazon/dynamodb-local
aws dynamodb list-tables --endpoint-url http://localhost:8000

# PostgreSQL (giống RDS Aurora PG)
docker run -p 5432:5432 -e POSTGRES_PASSWORD=pass postgres:15
```

### Design exercise
Cho 1 ứng dụng e-commerce, thiết kế:
1. User table (DDB) — PK gì? GSI cho login email?
2. Product table — PK/SK cho category browsing?
3. Order table — query "đơn của user X" và "đơn ngày Y" thế nào?
4. Khi nào dùng RDS, khi nào DDB?

→ Đáp án trong practice.

---

## 5. Tự kiểm tra

1. RDS Multi-AZ có giúp scale read không?
   <details><summary>Đáp án</summary>**Không** — Multi-AZ là **HA**, standby chỉ đứng chờ failover. Scale read → **Read Replica**.</details>

2. Bạn cần app global multi-region cho RDB, latency thấp toàn cầu, RPO < 1s. Dùng gì?
   <details><summary>Đáp án</summary>**Aurora Global Database** — 1 writer region + 5 read region, replication < 1s.</details>

3. DynamoDB partition key chọn `timestamp`. Vấn đề gì?
   <details><summary>Đáp án</summary>**Hot partition** — mọi write mới đập vào 1 partition. Chọn high-cardinality key (UserId, OrderId).</details>

4. LSI khác GSI ở chỗ nào?
   <details><summary>Đáp án</summary>LSI: **same PK, khác SK**, tạo khi tạo table, strong consistent, max 5. GSI: **PK/SK khác hoàn toàn**, tạo bất cứ lúc nào, eventual consistent, throughput riêng.</details>

5. Lambda kết nối RDS, mỗi invocation mở connection mới → RDS hết connection. Giải pháp?
   <details><summary>Đáp án</summary>**RDS Proxy** — connection pool managed. Hoặc dùng DynamoDB (không cần connection).</details>

6. Lưu session user web app, cần TTL 30 phút, sub-ms latency. Dùng gì?
   <details><summary>Đáp án</summary>**ElastiCache Redis** với TTL, hoặc **DynamoDB với TTL attribute**. Redis nhanh hơn.</details>

7. Cần query log JSON 1TB ở S3 ad-hoc, không muốn provision cluster. Dùng gì?
   <details><summary>Đáp án</summary>**Athena** — serverless, SQL, pay per TB scanned. Format Parquet để giảm cost.</details>

8. RDS snapshot có thể share với account khác không?
   <details><summary>Đáp án</summary>**Có** — chỉ snapshot manual (không phải automated). Encrypted snapshot phải share KMS key cùng.</details>

---

## 6. Đối chiếu GCP

| Nhu cầu | AWS | GCP |
|---------|-----|-----|
| Managed RDB | **RDS** | **Cloud SQL** |
| RDB Multi-AZ HA | **RDS Multi-AZ** | **Cloud SQL HA** |
| RDB scale read | **Read Replica** | **Read Replica** |
| Cloud-native RDB | **Aurora** | **AlloyDB** |
| Global RDB | **Aurora Global** | **Spanner** (strong consistent multi-region) |
| Serverless RDB | **Aurora Serverless v2** | **Cloud SQL** (no serverless), AlloyDB Omni |
| Document NoSQL | **DocumentDB** | **Firestore** |
| Key-value scale lớn | **DynamoDB** | **Firestore** / **Bigtable** |
| Wide column | **DynamoDB / Keyspaces** | **Bigtable** |
| In-memory cache | **ElastiCache (Redis/Memcached)** | **Memorystore (Redis/Memcached)** |
| Cache cho NoSQL | **DAX** | (không có) |
| Warehouse | **Redshift** | **BigQuery** |
| Serverless SQL trên blob | **Athena** | **BigQuery** (serverless) hoặc **BigLake** |
| ETL managed | **Glue** | **Dataflow / Dataproc** |
| Data catalog | **Glue Data Catalog** | **Dataplex / Data Catalog** |
| Graph | **Neptune** | **không có native** (third-party) |
| Time-series | **Timestream** | **Bigtable** (custom) |
| Ledger | **QLDB** | (không có native) |
| Migration | **DMS + SCT** | **Database Migration Service** |
| Search | **OpenSearch Service** | (third-party trên GKE) |

**5 bẫy lớn khi từ GCP qua AWS DB:**
1. **Spanner ≠ Aurora Global**. Spanner strong consistent multi-region multi-writer. Aurora Global chỉ 1 writer, eventual consistency cho reader region. Đây là khác biệt rất lớn.
2. **BigQuery ≠ Athena**. BigQuery có **storage riêng + ingest**, Athena **chỉ query S3** (không lưu data). Tương đương BQ hơn là **Redshift Serverless**.
3. **Firestore vs DynamoDB**: Firestore document-oriented + real-time listener built-in; DDB cần Streams + Lambda. Mindset query khác.
4. **Cloud SQL chỉ có 1 primary writer** (không như RDS Read Replica có thể chained); Aurora cluster ≠ Cloud SQL cluster.
5. **Bigtable** khác **DynamoDB**: Bigtable không có secondary index, phải design row key kỹ. DDB có GSI/LSI.

**Khi đi làm:**
- Multi-cloud DB sync: **Debezium + Kafka** (CDC) cross cloud.
- Schema migration: **Flyway / Liquibase** chạy được cả 2.
- **Vercel/Neon/PlanetScale** = serverless DB chạy trên AWS, dễ portable hơn vendor-locked.

---

## 7. Lưu ý khi thi CLF-C02

- **RDS**: managed RDB, Multi-AZ = HA, Read Replica = scale read.
- **Aurora** = AWS proprietary, MySQL/PG-compatible, 5x perf.
- **DynamoDB** = serverless NoSQL, single-digit ms.
- **ElastiCache** = Redis/Memcached managed.
- **Redshift** = warehouse OLAP PB-scale.
- **Athena** = serverless query S3.
- **Glue** = managed ETL.
- **DMS** = migrate DB.
- Backup automated 0–35 ngày, snapshot manual giữ tới khi xóa.

## 8. Lưu ý khi thi SAA-C03

- **RDS Multi-AZ vs Read Replica** — Multi-AZ sync 1 AZ HA; Read Replica async scale read; **không nhầm**.
- **Aurora 6 replica across 3 AZ** built-in.
- **Aurora Global**: RPO 1s, RTO < 1 phút, 5 read region.
- **Aurora Serverless v2** support MySQL + PG, scale ACU realtime.
- **DynamoDB GSI vs LSI** (đã nói trên).
- **DynamoDB On-Demand vs Provisioned**: spike → On-Demand; steady → Provisioned + Auto Scaling.
- **DAX** in-VPC cluster, only DynamoDB.
- **DynamoDB Global Tables** eventual consistent.
- **RDS Proxy** giảm connection overhead, bắt buộc với Lambda + RDS.
- **Aurora Backtrack** rewind 72h MySQL only.
- **ElastiCache Redis cluster mode**: enabled (shard) vs disabled (1 primary + replica).
- **Encrypt at rest** RDS phải bật khi tạo, không bật được sau (workaround: snapshot → encrypt copy → restore).

## 9. Lưu ý khi đi làm

### Lựa chọn
- **Default**: RDS PostgreSQL Multi-AZ + Read Replica. Đơn giản, biết rõ.
- **Aurora khi**: cần global, serverless, perf cao, > 64TB.
- **DynamoDB khi**: scale write cực lớn, latency ms cố định, không cần JOIN phức tạp.
- **ElastiCache khi**: pattern read-heavy, repeated query.
- **Athena khi**: ad-hoc analytics, không muốn cluster.

### Vận hành
- **Backup retention 35 ngày** cho prod RDS (max).
- **PITR** test recovery hàng quý.
- **Performance Insights** + **Enhanced Monitoring** bắt buộc cho prod.
- **Deletion Protection** + **Final Snapshot** ON.
- **Parameter Group** + **Option Group** version riêng, không dùng default.
- **Maintenance window** giờ low-traffic, weekly.
- **Read Replica lag** monitor `ReplicaLag` metric.

### Cost
- DynamoDB On-Demand đắt hơn Provisioned ~7x cho workload steady. Estimate trước, mua provisioned + auto-scaling.
- RDS Reserved Instance 1y/3y → 30–60% saving.
- Aurora I/O Optimized vs Standard (2023+) — I/O Optimized nếu IO cao > 25% cost.
- Stop RDS dev/test ngoài giờ (max 7 ngày, sau đó tự start lại).
- Athena: convert CSV → Parquet giảm cost 90% (less bytes scanned).

### Anti-pattern
- ❌ Chọn DynamoDB cho workload có nhiều JOIN ad-hoc → RDS/Aurora.
- ❌ Public RDS với SG `0.0.0.0/0` → private subnet + bastion/SSM.
- ❌ Self-managed MySQL trên EC2 cho prod → RDS/Aurora.
- ❌ DDB partition key low-cardinality (status, country) → hot partition.
- ❌ Read Replica để "HA" → nhầm Multi-AZ.
- ❌ ElastiCache không có failover replica (Memcached) cho prod cache critical.

---

## 10. Flashcard

- **RDS** — managed RDB 7 engine, Multi-AZ HA, Read Replica scale read.
- **Multi-AZ** — sync standby, không serve read.
- **Read Replica** — async, scale read, có thể cross-region.
- **Aurora** — 5x MySQL/3x PG, 6 replica 3 AZ, auto-scale storage 128TB.
- **Aurora Global** — 1 writer region + 5 reader region, RPO 1s.
- **Aurora Serverless v2** — auto-scale ACU.
- **DynamoDB** — serverless NoSQL, single-digit ms.
- **PK / PK+SK** — partition + sort key.
- **GSI / LSI** — GSI flexible eventual, LSI same PK strong + tạo cùng table.
- **WCU/RCU** — capacity unit.
- **DAX** — DDB cache µs, in-VPC.
- **DDB Streams** — CDC 24h.
- **TTL** — auto-delete item.
- **Global Tables** — multi-region active-active.
- **ElastiCache** — Redis (full feature) vs Memcached (simple).
- **Redshift** — warehouse MPP columnar, RA3 separate compute/storage.
- **Athena** — serverless SQL trên S3, pay per TB.
- **Glue** — ETL Spark + Data Catalog.
- **DMS** — migrate DB online + offline.
- **RDS Proxy** — connection pool cho Lambda.
