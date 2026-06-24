# SAA Ch2.3 — Database Performance & Caching

> Mục tiêu: Tune Aurora/RDS/DynamoDB cho hiệu năng cao, thiết kế caching layer (ElastiCache, DAX, CloudFront) đúng cách, và tránh các sai lầm cổ điển: connection storm, cache stampede, hot partition.

Tiền đề: [[foundations-02-consistency-models]], [[foundations-03-replication-and-quorum]], [[foundations-05-partitioning-and-sharding]], CLF [[07-databases]].

---

## 1. Câu chuyện mở đầu — "DB chậm, thêm CPU đi"

Production OLTP, traffic Black Friday tăng x3. CPU RDS lên 90%. Team scale-up từ `r6i.4xlarge` lên `r6i.8xlarge`. **Xong x2 cost, latency cải thiện 10%**. Vẫn báo chậm.

Profile thực tế: **80% query time đang dùng cho 5 query thiếu index**. Sửa index → CPU xuống 30%, scale-up không cần. Tiền tiết kiệm: ~$3,000/tháng.

**Quy tắc 0**: trước khi tune infra, tune query. Slow query log, `EXPLAIN`, Performance Insights. Một index đúng giá trị bằng x2 instance size.

---

## 2. Map database theo workload

| Workload | DB chính | Lý do |
|----------|----------|-------|
| OLTP truyền thống, ACID, JOIN nhiều | **Aurora MySQL/Postgres** | Compatible, performance gấp 3-5x RDS thường, storage scale tự động |
| OLTP scale ∞, key-value access | **DynamoDB** | Single-digit ms ở 100k+ QPS |
| Cache layer | **ElastiCache (Redis/Memcached)** | Sub-ms, in-memory |
| DynamoDB cần cache | **DAX** (DynamoDB Accelerator) | Cluster cache cho DynamoDB, microsecond read |
| OLAP, BI report | **Redshift** | Columnar, MPP, petabyte-scale |
| Ad-hoc query trên S3 | **Athena** | Serverless SQL, pay per scan |
| Time-series | **Timestream** | Purpose-built, auto tiering |
| Graph (social, fraud) | **Neptune** | Property graph + RDF |
| Search, log analytics | **OpenSearch** | Full-text, aggregation |
| Ledger immutable | **QLDB** | Cryptographic verify |
| MongoDB workload | **DocumentDB** | MongoDB API compatible (3.6/4.0/5.0) |
| Cassandra workload | **Keyspaces** | Cassandra-compatible, serverless |

---

## 3. Aurora — performance deep dive

### 3.1 Architecture cốt lõi

- **Compute (writer + readers)** tách khỏi **storage layer** (6 copies / 3 AZ).
- Storage shared → reader không replay binlog, chỉ invalidate cache page.
- Lag writer→reader thường < 100ms.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Kiến trúc Aurora — compute tách khỏi shared storage 6 bản / 3 AZ</title>
  <desc>Tầng compute gồm 1 writer và các reader nối xuống một shared storage layer dùng chung; storage giữ 6 bản sao trải trên 3 vùng sẵn sàng. Writer ghi xuống storage; reader chỉ invalidate cache page thay vì replay binlog.</desc>
  <defs>
    <marker id="auArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Aurora — compute tách khỏi shared storage</text>
  <text x="16" y="50" font-size="11.5" font-weight="700" fill="currentColor" opacity="0.7">Tầng COMPUTE</text>
  <g>
    <rect x="40" y="58" width="150" height="56" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="52" y="68" width="56" height="18" rx="9" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="80" y="81" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">WRITER</text>
    <text x="52" y="103" font-size="10.5" fill="currentColor" opacity="0.75">read + write</text>
  </g>
  <g>
    <rect x="270" y="58" width="130" height="56" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="282" y="68" width="62" height="18" rx="9" fill="#10b981" fill-opacity="0.95"/>
    <text x="313" y="81" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">READER 1</text>
    <text x="282" y="103" font-size="10.5" fill="currentColor" opacity="0.75">read-only</text>
  </g>
  <g>
    <rect x="420" y="58" width="130" height="56" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="432" y="68" width="62" height="18" rx="9" fill="#10b981" fill-opacity="0.95"/>
    <text x="463" y="81" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">READER N</text>
    <text x="432" y="103" font-size="10.5" fill="currentColor" opacity="0.75">tới 15 reader</text>
  </g>
  <line x1="115" y1="114" x2="115" y2="176" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#auArr)"/>
  <text x="122" y="150" font-size="10" fill="currentColor" opacity="0.8">ghi</text>
  <line x1="335" y1="114" x2="200" y2="176" stroke="currentColor" stroke-opacity="0.45" marker-end="url(#auArr)"/>
  <line x1="485" y1="114" x2="240" y2="176" stroke="currentColor" stroke-opacity="0.45" marker-end="url(#auArr)"/>
  <text x="360" y="150" font-size="10" fill="currentColor" opacity="0.8">đọc · invalidate cache page</text>
  <text x="16" y="200" font-size="11.5" font-weight="700" fill="currentColor" opacity="0.7">SHARED STORAGE LAYER — 6 bản / 3 AZ</text>
  <rect x="40" y="210" width="640" height="120" rx="12" fill="#f59e0b" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <g>
    <rect x="60" y="232" width="180" height="86" rx="9" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="150" y="251" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">AZ-a</text>
    <rect x="76" y="262" width="66" height="44" rx="7" fill="#f59e0b" fill-opacity="0.5"/>
    <text x="109" y="288" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">copy 1</text>
    <rect x="156" y="262" width="66" height="44" rx="7" fill="#f59e0b" fill-opacity="0.5"/>
    <text x="189" y="288" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">copy 2</text>
  </g>
  <g>
    <rect x="270" y="232" width="180" height="86" rx="9" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="360" y="251" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">AZ-b</text>
    <rect x="286" y="262" width="66" height="44" rx="7" fill="#f59e0b" fill-opacity="0.5"/>
    <text x="319" y="288" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">copy 3</text>
    <rect x="366" y="262" width="66" height="44" rx="7" fill="#f59e0b" fill-opacity="0.5"/>
    <text x="399" y="288" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">copy 4</text>
  </g>
  <g>
    <rect x="480" y="232" width="180" height="86" rx="9" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="570" y="251" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">AZ-c</text>
    <rect x="496" y="262" width="66" height="44" rx="7" fill="#f59e0b" fill-opacity="0.5"/>
    <text x="529" y="288" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">copy 5</text>
    <rect x="576" y="262" width="66" height="44" rx="7" fill="#f59e0b" fill-opacity="0.5"/>
    <text x="609" y="288" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">copy 6</text>
  </g>
  <text x="40" y="352" font-size="10.5" fill="currentColor" opacity="0.7">Storage dùng chung cho mọi node → reader không replay binlog, lag writer→reader thường dưới 100ms.</text>
</svg>

### 3.2 Performance levers

| Lever | Tác động |
|-------|----------|
| **Instance size** (r6g, r6i, r7g) | CPU, RAM, network bandwidth |
| **Read replica** (up to 15) | Scale read, mỗi reader có endpoint riêng + cluster reader endpoint |
| **Aurora Serverless v2** | Auto-scale ACU (0.5 → 128), good cho variable workload |
| **Aurora Global Database** | Read trong region khác với lag < 1s |
| **Aurora I/O-Optimized** | Cấu hình storage trả flat fee thay vì per-IO. Tốt nếu I/O cost > 25% bill |
| **Parallel Query** (Aurora MySQL) | Parallelize lên storage layer cho query lớn |
| **Buffer pool, query cache** | Tune via parameter group |

### 3.3 Aurora Serverless v2

- ACU = 2 GB RAM + CPU/network tương ứng.
- Scale theo giây (vs v1 scale theo phút).
- Min 0.5 ACU = ~$0.06/h.
- Use case: dev/test, variable workload, SaaS multi-tenant.
- **Không** phù hợp khi cần predictable latency 24/7 — instance-based vẫn tốt hơn.

### 3.4 Aurora vs RDS quick

| Aspect | Aurora | RDS standard |
|--------|--------|--------------|
| Storage | Shared, 6 copies, auto-scale tới 128 TB | EBS per instance, manual resize |
| Replica lag | < 100ms (shared storage) | ms-giây (binlog replication) |
| Failover | ~30s | 60-120s |
| Backtrack | Có (MySQL) — rewind không cần restore | Không |
| Cost | $$ - $$$ | $ - $$ |

### 3.5 Connection management

- **RDS Proxy**: connection pooling managed. Critical cho Lambda (mỗi invocation mở connection mới → DB chết).
- Aurora native: `max_connections` scale với instance size.
- Best practice Lambda: dùng RDS Proxy.

---

## 4. DynamoDB performance

### 4.1 Capacity modes

| Mode | Khi dùng |
|------|----------|
| **Provisioned** + auto-scaling | Predictable traffic, biết RCU/WCU baseline |
| **On-demand** | Spiky traffic, unknown pattern, dev/test |

Switching: 1 lần per 24h.

> 💡 On-demand thường **đắt hơn 7x** provisioned nếu utilization cao. Đừng default on-demand cho mọi table.

### 4.2 Item size & cost

- 1 RCU = 1 strongly consistent read 4KB/s, hoặc 2 eventually consistent.
- 1 WCU = 1 write 1KB/s.
- Item > 4KB → tốn nhiều RCU. **Quy tắc**: keep item < 4 KB nếu access frequent.
- Max item size: **400 KB**.

### 4.3 Hot partition revisit

Đã đề cập [[foundations-05-partitioning-and-sharding]]. Quick fix list:

- **Write sharding**: `PK = base#random(0-N)`.
- **Adaptive capacity** (auto, không phải reason để design ẩu).
- **GSI sparse**: chỉ items match condition mới có trong GSI → giảm fan-out.

### 4.4 Indexes

| Index | Tạo lúc | Storage | Strongly consistent? | Cost |
|-------|---------|---------|---------------------|------|
| **LSI** (Local Secondary Index) | Tạo cùng table, max 5 | Share với base | ✅ | Share RCU/WCU |
| **GSI** (Global Secondary Index) | Bất kỳ, max 20 | Riêng | ❌ (eventual) | RCU/WCU riêng |

> 🪤 Bẫy thi: "Cần strongly consistent với PK khác" → **không có giải pháp 100%**. GSI eventual. Workaround: write thêm record với PK đó vào main table (denormalize).

### 4.5 DynamoDB Streams + Lambda

- Stream record mỗi item change.
- 24h retention.
- Trigger Lambda async → use case: ETL, replication ra OpenSearch, cross-table consistency.

### 4.6 DynamoDB Transactions

- `TransactWriteItems`: tối đa 100 item, 4MB. 2x WCU cost.
- `TransactGetItems`: tối đa 100 item. 2x RCU.
- Use case: financial, multi-table consistency. **Không** dùng cho mọi write.

### 4.7 Global Tables
- Active-active multi-region, LWW. (Xem [[foundations-04-latency-vs-consistency]].)
- Charged WCU cho mỗi region replicate.

---

## 5. Caching — đòn bẩy lớn nhất

### 5.1 Cache-aside (lazy loading)
- App đọc cache trước; miss → đọc DB → ghi cache.
- **Ưu**: chỉ data thực sự cần mới cache.
- **Nhược**: cold start chậm. 3 query/miss/key đầu tiên.

### 5.2 Write-through
- App ghi DB và cache cùng lúc.
- **Ưu**: cache luôn fresh.
- **Nhược**: cache nhiều data không bao giờ đọc lại.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cache-aside (lazy loading) so với Write-through — luồng đọc/ghi giữa App, Cache, DB</title>
  <desc>Hai chiến lược cạnh nhau. Cache-aside khi đọc: App hỏi Cache, nếu miss thì đọc DB rồi ghi ngược vào Cache. Write-through khi ghi: App ghi cả Cache và DB cùng lúc nên cache luôn fresh.</desc>
  <defs>
    <marker id="caArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <text x="180" y="24" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Cache-aside (lazy loading) — khi ĐỌC</text>
  <text x="540" y="24" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Write-through — khi GHI</text>
  <line x1="360" y1="36" x2="360" y2="340" stroke="currentColor" stroke-opacity="0.18"/>
  <g>
    <rect x="30" y="56" width="110" height="40" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="85" y="81" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">App</text>
    <rect x="225" y="56" width="110" height="40" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="280" y="81" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Cache</text>
    <rect x="125" y="270" width="110" height="40" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="180" y="295" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">DB</text>
    <line x1="140" y1="70" x2="221" y2="70" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#caArr)"/>
    <text x="180" y="64" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">1. đọc</text>
    <line x1="221" y1="84" x2="142" y2="84" stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="4 3" marker-end="url(#caArr)"/>
    <text x="182" y="110" font-size="10" text-anchor="middle" fill="#10b981" opacity="0.95" font-weight="700">HIT → trả ngay</text>
    <line x1="100" y1="96" x2="165" y2="266" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#caArr)"/>
    <text x="78" y="200" font-size="10" fill="currentColor" opacity="0.85">2. MISS → đọc DB</text>
    <line x1="232" y1="270" x2="276" y2="100" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#caArr)"/>
    <text x="262" y="200" font-size="10" fill="currentColor" opacity="0.85">3. ghi lại cache</text>
  </g>
  <g>
    <rect x="385" y="56" width="110" height="40" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="440" y="81" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">App</text>
    <rect x="585" y="56" width="110" height="40" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="640" y="81" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Cache</text>
    <rect x="485" y="270" width="110" height="40" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="540" y="295" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">DB</text>
    <line x1="495" y1="74" x2="581" y2="74" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#caArr)"/>
    <text x="538" y="68" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">1a. ghi cache</text>
    <line x1="460" y1="96" x2="525" y2="266" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#caArr)"/>
    <text x="408" y="200" font-size="10" fill="currentColor" opacity="0.85">1b. ghi DB (cùng lúc)</text>
    <text x="640" y="120" font-size="10" text-anchor="middle" fill="#10b981" opacity="0.95" font-weight="700">cache luôn fresh</text>
  </g>
  <text x="30" y="338" font-size="10" fill="currentColor" opacity="0.7">Chỉ data được hỏi mới vào cache; lần miss đầu tốn 3 bước.</text>
  <text x="385" y="338" font-size="10" fill="currentColor" opacity="0.7">Mọi write đều vào cache, kể cả data ít khi đọc lại.</text>
</svg>

### 5.3 Write-behind / write-back
- App ghi cache, cache flush DB async.
- **Ưu**: write nhanh.
- **Nhược**: risk mất data nếu cache chết. Hiếm dùng.

### 5.4 TTL strategy
- Short TTL (giây-phút): data fresh, miss rate cao hơn.
- Long TTL (giờ): tiết kiệm DB, stale data risk.
- **Jitter**: thêm random ±10% để tránh thundering herd khi expire đồng loạt.

---

## 6. ElastiCache

### 6.1 Redis vs Memcached

| Aspect | Redis | Memcached |
|--------|-------|-----------|
| Data type | String, list, hash, set, sorted set, stream, geo | String only |
| Replication | Có (cluster mode) | Không |
| Persistence | RDB/AOF | Không (memory only) |
| Multi-AZ failover | Có | Không |
| Transaction (MULTI/EXEC) | Có | Không |
| Pub/Sub | Có | Không |
| Throughput | High | Higher (multi-threaded) |
| Use case | Session, leaderboard, queue, geo, complex | Simple cache, multi-threaded scale |

→ **99% case dùng Redis**. Memcached chỉ khi cần simple LRU cache multi-threaded.

### 6.2 ElastiCache Redis modes

| Mode | Shard | Use case |
|------|-------|----------|
| **Cluster mode disabled** | 1 shard, 1 primary + N replica | Dataset fit 1 node, scale read |
| **Cluster mode enabled** | Nhiều shard, sharding theo key hash | Dataset lớn, scale write |

### 6.3 Global Datastore
- Cross-region Redis replication.
- 1 primary region, đến 2 secondary region (read-only).
- Sub-second replication.

### 6.4 MemoryDB for Redis (khác ElastiCache)

- **Durable** (Multi-AZ transaction log).
- **Strong consistency**.
- Use case: dùng Redis làm **primary database**, không chỉ cache.
- Đắt hơn ElastiCache Redis nhưng có thêm durability.

---

## 7. DAX — DynamoDB Accelerator

- **Cluster cache** cho DynamoDB, in-memory, microsecond read.
- Tích hợp ở SDK level: thay endpoint → app code không đổi.
- **Item cache** (PutItem/GetItem) + **query cache** (Query/Scan).
- TTL configurable.
- **Write-through**: write qua DAX cũng ghi DynamoDB sync.
- **Eventually consistent reads only** (qua DAX). Strongly consistent → bypass DAX, đi thẳng DynamoDB.

> 🪤 Bẫy thi: "Read DynamoDB strongly consistent < 1ms" → **DAX không giúp**. DAX chỉ accelerate eventual.

---

## 8. CloudFront — cache ở edge

- CDN cho static + dynamic content.
- TTL theo origin Cache-Control hoặc CloudFront behavior config.
- **Origin Shield**: extra cache layer giảm origin load.
- **Functions / Lambda@Edge**: compute ở edge, low latency cho personalize.
- Use case ngoài web assets: API GET caching, geo restriction, signed URL.

---

## 9. Patterns kết hợp

### 9.1 Web stack điển hình

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 220" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Web stack nhiều tầng cache — Client tới CloudFront, ALB, ECS/EC2, ElastiCache, RDS/Aurora</title>
  <desc>Luồng request trái sang phải: Client tới CloudFront (cache edge) tới ALB tới ECS/EC2 (app tier) tới ElastiCache theo cache-aside, miss thì xuống RDS/Aurora. CloudFront và ElastiCache là hai tầng cache giảm tải.</desc>
  <defs>
    <marker id="wsArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Web stack điển hình — request đi trái sang phải</text>
  <g>
    <rect x="14" y="70" width="92" height="56" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="60" y="96" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Client</text>
    <text x="60" y="114" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">trình duyệt</text>
  </g>
  <g>
    <rect x="132" y="70" width="100" height="56" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="182" y="92" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">CloudFront</text>
    <rect x="146" y="100" width="72" height="18" rx="9" fill="#10b981" fill-opacity="0.9"/>
    <text x="182" y="113" font-size="9.5" font-weight="700" text-anchor="middle" fill="#fff">cache edge</text>
  </g>
  <g>
    <rect x="258" y="70" width="84" height="56" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="300" y="96" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">ALB</text>
    <text x="300" y="114" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">L7 LB</text>
  </g>
  <g>
    <rect x="368" y="70" width="96" height="56" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="416" y="92" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">ECS/EC2</text>
    <text x="416" y="114" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">app tier</text>
  </g>
  <g>
    <rect x="490" y="70" width="104" height="56" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="542" y="92" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">ElastiCache</text>
    <rect x="502" y="100" width="80" height="18" rx="9" fill="#10b981" fill-opacity="0.9"/>
    <text x="542" y="113" font-size="9.5" font-weight="700" text-anchor="middle" fill="#fff">cache-aside</text>
  </g>
  <g>
    <rect x="620" y="70" width="86" height="56" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="663" y="92" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">RDS/</text>
    <text x="663" y="108" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Aurora</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.6">
    <line x1="106" y1="98" x2="128" y2="98" marker-end="url(#wsArr)"/>
    <line x1="232" y1="98" x2="254" y2="98" marker-end="url(#wsArr)"/>
    <line x1="342" y1="98" x2="364" y2="98" marker-end="url(#wsArr)"/>
    <line x1="464" y1="98" x2="486" y2="98" marker-end="url(#wsArr)"/>
    <line x1="594" y1="98" x2="616" y2="98" marker-end="url(#wsArr)"/>
  </g>
  <text x="542" y="150" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">miss → đọc DB</text>
  <text x="16" y="186" font-size="10.5" fill="currentColor" opacity="0.72">Hai tầng cache giảm tải: CloudFront chặn ở edge cho nội dung tĩnh; ElastiCache (cache-aside) đỡ DB cho app tier.</text>
</svg>

### 9.2 DynamoDB heavy read
```
Client → API Gateway → Lambda → DAX → DynamoDB
```

### 9.3 Cache stampede protection
- **Lock**: chỉ 1 worker refresh, others wait.
- **Stale-while-revalidate**: serve stale + background refresh.
- **TTL jitter**.
- **Pre-warm**: scheduled job refresh trước khi expire.

---

## 10. Anti-patterns

1. **Cache mọi thứ** → cache hit rate thấp, tốn RAM, không lợi. Đo hit rate trước.
2. **Không invalidate cache khi write** → stale data. Phải có chiến lược: TTL ngắn, hoặc invalidate explicit.
3. **Cache giá trị lớn (> 100 KB)** → ElastiCache có thể OOM, latency tăng. Compress hoặc partition.
4. **Lambda + RDS không qua Proxy** → connection storm, DB max_connections exhaust.
5. **DynamoDB với GSI projection ALL** → tốn 2x storage + WCU. Project KEYS_ONLY hoặc INCLUDE khi đủ.
6. **DAX cho strongly consistent** → không hỗ trợ.
7. **Aurora reader cho write** → reader read-only, write phải qua writer endpoint.

---

## 11. Performance Insights

- RDS / Aurora built-in tool.
- **Top SQL** theo wait time.
- Phân tích wait event (CPU, IO, lock).
- Free tier: 7 ngày retention. Long-term: pay.
- **Quy tắc**: bật cho mọi production DB. Free, low overhead.

---

## 12. Ví dụ design cho 4 use case

### 12.1 E-commerce, product catalog 100k SKU, read 10k QPS
- DynamoDB + DAX cluster. PK=`productId`, GSI theo `category`.
- TTL 5 phút trên DAX. Update SKU → invalidate DAX entry.
- CloudFront cache thumbnail S3.

### 12.2 SaaS multi-tenant, OLTP, variable per tenant
- Aurora Serverless v2, min 1 ACU max 32 ACU.
- RDS Proxy cho Lambda app tier.
- ElastiCache Redis cho session.

### 12.3 Real-time leaderboard game
- Redis sorted set (`ZADD`, `ZRANGE`).
- MemoryDB nếu cần durable.
- Snapshot Redis sang S3 daily.

### 12.4 Analytics dashboard, data ở S3
- **Hot path**: Athena query trực tiếp.
- **Aggregated**: pre-compute với Glue → S3 Parquet → Athena.
- Cache report kết quả trong ElastiCache 1h.

---

## 13. Cạm bẫy đề thi (SAA)

1. **"Aurora reader endpoint strong consistency"** → **Sai**, eventual lag < 100ms.
2. **"DAX cho strongly consistent read"** → **Sai**.
3. **"DynamoDB GSI strongly consistent"** → **Sai**.
4. **"Aurora Serverless v1 = v2 chỉ khác tên"** → **Sai**, v2 scale theo giây + cấu trúc khác. v1 đang phase-out.
5. **"ElastiCache durable mặc định"** → **Sai**. Chỉ MemoryDB durable. ElastiCache Redis với AOF + snapshot có thể recover phần lớn, nhưng không strong durability.
6. **"Read Replica cho Multi-AZ failover"** → **Sai**. Read Replica async, không phải HA solution. Multi-AZ standby là HA.
7. **"On-demand DynamoDB rẻ hơn provisioned"** → **Sai**, đắt hơn 7x nếu utilization cao.
8. **"RDS Proxy chỉ dùng cho Lambda"** → **Sai**, cũng giúp Fargate, EC2 nhiều instance, giảm reconnect.

---

## 14. Tóm tắt 1 dòng

> Tune query trước infra. Cache là đòn bẩy 10x — nhưng đi kèm complexity (invalidation, stampede). Chọn DB theo access pattern, không theo "phổ biến nhất".

---

## 15. Bài tập tự kiểm tra

1. Aurora MySQL CPU 85% sustained. Performance Insights cho thấy 1 query chiếm 60% wait time. Bước tiếp theo? (Không phải scale up.)
2. DynamoDB table read 50k RCU, hit rate cache thấp (40%). Bạn analyze gì để quyết định có nên thêm DAX không?
3. Web app Lambda + Aurora Postgres. CloudWatch báo Lambda concurrency 5000, Aurora `max_connections=500` exceeded. Fix?
4. Redis cluster mode disabled, 1 primary 2 replica. Workload 80% read, 20% write. Write QPS đạt limit của node. Lựa chọn?
5. So sánh chi phí: 10k RCU provisioned 24/7 vs 10k RCU on-demand (50k requests/s peak 1h/ngày, 5k/s rest). Cái nào rẻ hơn?
6. CloudFront cache hit rate 30%. Bạn cải thiện thế nào? (≥3 cách, không phải "tăng TTL toàn bộ".)

---

## 16. Đọc thêm

- AWS Whitepaper — *Best Practices for Amazon Aurora MySQL/Postgres*.
- AWS Builder's Library — *Caching challenges and strategies*, *Avoiding fallback*.
- *Amazon DynamoDB Best Practices* (AWS docs).
- *Designing Data-Intensive Applications* — chương 3 (Storage and Retrieval).

---

**Bài tiếp theo**: [[ch2-04-network-performance]] — CloudFront, Global Accelerator, VPC endpoints, Direct Connect.
