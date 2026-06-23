# SAA Ch4.3 — Database & Network Cost Optimization

> Mục tiêu: Cắt DB bill (RDS, Aurora, DynamoDB, ElastiCache) đúng cách mà không hy sinh performance, và quản lý data transfer cost — thứ silently ăn 20-40% bill ở nhiều org.

Tiền đề: [[ch2-03-database-performance]], [[ch2-04-network-performance]], [[ch4-01-compute-cost]].

---

## 1. Câu chuyện mở đầu — "DB bill $30k/tháng cho 2 db.r6i.4xlarge"

Audit RDS production: 2 instance Multi-AZ + 4 Read Replica. CPU avg 25%. Bill $30k/tháng.

Findings:
- Multi-AZ standby idle (đúng) — không tối ưu được.
- 4 Read Replica: 3 cái CPU < 5% (over-provisioned). Đã đủ với 2.
- Storage 2TB io2 với 30k provisioned IOPS — actual IOPS avg 3k. Migrate gp3 → save $$.
- Backup retention 35 ngày — cần thiết 7. Reduce snapshot storage.
- Reserved Instance chưa mua.

After:
- Down 4 → 2 Read Replica: save $4k.
- io2 → gp3: save $3k.
- 1-year RI: save $8k.
- Backup 35 → 7: save $1k.

**Save: $16k/tháng (53%)** — bill còn $14k, performance không đổi.

---

## 2. RDS / Aurora cost optimization

### 2.1 Right-size instance

- CloudWatch + Performance Insights → identify low-util instance.
- Downsize aggressively cho non-prod.
- Aurora Serverless v2 cho variable workload.

### 2.2 Reserved Instance / Savings Plan
- RDS Reserved Instance: 1/3 năm, ≤ 69% off.
- **Không có RDS Savings Plan** — phải dùng RI.
- Aurora cũng có RI.
- Convertible RI: linh hoạt change engine/family.

### 2.3 Storage tier (Aurora I/O-Optimized vs Standard)
- **Aurora Standard**: pay per IOPS.
- **Aurora I/O-Optimized** (2023+): flat fee storage + compute, **không pay IOPS**.
- Tipping point: I/O cost > 25% bill → switch I/O-Optimized cheaper.

### 2.4 Storage rightsizing
- gp3 thay gp2 cho RDS — không có downside.
- io1 → io2 (cùng giá perf cao hơn) → io2 Block Express khi cần.
- Reduce allocated storage không dễ — phải snapshot + restore.

### 2.5 Multi-AZ vs Single-AZ
- Multi-AZ: x2 cost (standby idle).
- Non-prod thường không cần Multi-AZ.
- Aurora khác: shared storage → "Multi-AZ" = thêm reader nodes, optional.

### 2.6 Read Replica strategy
- Mỗi replica = 1 full instance bill.
- Aurora replica rẻ vì shared storage — vẫn pay compute.
- Aurora Serverless v2 reader → auto scale, không over-provision.

### 2.7 Backup
- Daily snapshot + transaction log = "backup retention".
- Retention > 7 ngày = extra storage cost.
- Manual snapshot không expire — clean up.
- AWS Backup vault với lifecycle to cold storage.

### 2.8 Stop instance khi không dùng
- Dev/staging RDS có thể stop tới 7 ngày (auto restart).
- Stopped instance: pay storage + backup, không pay compute.
- Aurora Serverless v2 auto-pause sau idle (v1 có, v2 cấu hình tương tự).

---

## 3. DynamoDB cost optimization

### 3.1 Capacity mode

| Mode | When |
|------|------|
| **Provisioned + auto-scaling** | Steady traffic, util > 30-50% |
| **On-demand** | Spiky, unpredictable, < 18% util |

> Quy tắc 18%: on-demand giá ~7x provisioned at-list. Util > ~18% → provisioned rẻ hơn.

### 3.2 Reserved Capacity
- 1/3 năm commit → ≤ 53% discount cho provisioned.
- Chỉ với provisioned mode.

### 3.3 Storage cost
- $0.25/GB/month (Standard), $0.10 (Standard-IA — 2023+).
- **Standard-IA table class**: rẻ 60% storage, đắt 25% RCU/WCU. Tipping: access < 30 lần/tháng/item.

### 3.4 Item size optimization
- Item > 4 KB → tốn nhiều RCU.
- Compress large attributes, hoặc store S3 reference cho blob.
- Remove unused attribute.

### 3.5 TTL
- Auto delete expired item, **không tốn WCU**.
- Use case: session, ephemeral data.

### 3.6 GSI overhead
- GSI = bảng riêng → storage + RCU/WCU.
- **Project KEYS_ONLY hoặc INCLUDE** thay vì ALL → giảm storage.
- Drop GSI không dùng.

### 3.7 Stream + DAX
- DynamoDB Stream miễn phí (read free).
- DAX có cost cluster — chỉ dùng khi read heavy + hit rate cao.

---

## 4. ElastiCache cost

### 4.1 Right-size
- Memory + connection count.
- Reserved Cache Node: 1/3 năm, ≤ 60% off.

### 4.2 Redis cluster mode
- Cluster mode enabled chỉ khi dataset > 1 node.
- Cluster mode disabled đơn giản, ít overhead.

### 4.3 Snapshot
- Daily snapshot cluster — bill S3.
- Disable nếu không cần (cache layer).

### 4.4 Global Datastore
- Cross-region replication tốn replication.
- Chỉ dùng khi cần cross-region access read low-latency.

### 4.5 MemoryDB vs ElastiCache
- MemoryDB ~30% đắt hơn.
- Chỉ dùng nếu cần durable, strong consistency.

---

## 5. Other databases

### 5.1 Redshift
- Reserved node: ≤ 75% off.
- **Pause cluster** non-prod (Redshift Serverless tốt hơn cho variable).
- Concurrency Scaling: 1h free / 24h, sau đó tốn.
- Spectrum query S3 — free compute, pay per scan.

### 5.2 Neptune / DocumentDB
- Tương tự RDS: RI, right-size, multi-AZ trade-off.

### 5.3 OpenSearch
- Reserved Instance ≤ 50% off.
- **OpenSearch Serverless** cho non-steady workload.
- UltraWarm + Cold storage tier cho log archive.

### 5.4 Athena
- Pay per data scanned ($5/TB).
- **Parquet/ORC + partition** → giảm scan 90%+.
- Result caching (24h default).

---

## 6. Data transfer cost — silent killer

### 6.1 Bảng pricing (US, simplified)

| Path | Cost |
|------|------|
| Internet egress (first 10TB) | $0.09/GB |
| Internet egress (40+ TB) | $0.05/GB |
| CloudFront egress | $0.085/GB (US, drops with volume) |
| Cross-region (US ↔ US) | $0.02/GB |
| Cross-continent | $0.02-0.09/GB |
| Cross-AZ (same region) | $0.01/GB each way |
| Same-AZ private IP | Free |
| To/from VPC endpoint | Free (endpoint $0.01/GB + $0.01/h) |
| ELB to backend (same AZ) | Free for ALB |
| RDS cross-AZ (Multi-AZ) | Free |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 430" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Bản đồ chi phí data transfer theo đường đi của gói tin</title>
  <desc>Từ một EC2/Lambda nguồn, dữ liệu đi tới các đích khác nhau với giá khác nhau: same-AZ private IP miễn phí, cross-AZ 0.01 USD mỗi chiều, cross-region 0.02 USD trở lên, ra Internet 0.09 USD mỗi GB; và ba cách ra ngoài: qua NAT 0.045 USD/GB, qua VPC Gateway endpoint miễn phí, qua CloudFront rẻ hơn egress trực tiếp.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Bản đồ chi phí data transfer (theo đường đi)</text>

  <!-- Source node -->
  <rect x="20" y="60" width="120" height="56" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="80" y="84" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">EC2 / Lambda</text>
  <text x="80" y="102" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">nguồn (AZ-a)</text>

  <!-- Edges + destinations: same-AZ (free) -->
  <line x1="140" y1="74" x2="500" y2="44" stroke="#10b981" stroke-width="2" stroke-opacity="0.7"/>
  <rect x="500" y="26" width="200" height="36" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="510" y="42" font-size="11.5" font-weight="700" fill="currentColor">Same-AZ · private IP</text>
  <text x="510" y="56" font-size="10.5" fill="currentColor" opacity="0.7">Free</text>

  <!-- cross-AZ -->
  <line x1="140" y1="84" x2="500" y2="92" stroke="#f59e0b" stroke-width="2" stroke-opacity="0.7"/>
  <rect x="500" y="74" width="200" height="36" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="510" y="90" font-size="11.5" font-weight="700" fill="currentColor">Cross-AZ (cùng region)</text>
  <text x="510" y="104" font-size="10.5" fill="currentColor" opacity="0.7">$0.01/GB mỗi chiều</text>

  <!-- cross-region -->
  <line x1="140" y1="92" x2="500" y2="140" stroke="#f59e0b" stroke-width="2" stroke-opacity="0.7"/>
  <rect x="500" y="122" width="200" height="36" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="510" y="138" font-size="11.5" font-weight="700" fill="currentColor">Cross-region</text>
  <text x="510" y="152" font-size="10.5" fill="currentColor" opacity="0.7">$0.02/GB trở lên</text>

  <!-- internet egress -->
  <line x1="140" y1="100" x2="500" y2="188" stroke="#ef4444" stroke-width="2.5" stroke-opacity="0.75"/>
  <rect x="500" y="170" width="200" height="36" rx="8" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="510" y="186" font-size="11.5" font-weight="700" fill="currentColor">Internet egress (trực tiếp)</text>
  <text x="510" y="200" font-size="10.5" fill="currentColor" opacity="0.7">$0.09/GB — đắt nhất</text>

  <!-- Divider -->
  <line x1="16" y1="238" x2="704" y2="238" stroke="currentColor" stroke-opacity="0.18" stroke-dasharray="4 4"/>
  <text x="16" y="262" font-size="12.5" font-weight="700" fill="currentColor">Ra S3 / ra ngoài: chọn đường nào?</text>

  <!-- Three paths comparison -->
  <rect x="16" y="276" width="218" height="120" rx="10" fill="#ef4444" fill-opacity="0.10" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="125" y="298" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Qua NAT Gateway</text>
  <text x="125" y="320" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.8">EC2 → NAT → S3/Internet</text>
  <rect x="60" y="334" width="130" height="26" rx="13" fill="#ef4444" fill-opacity="0.85"/>
  <text x="125" y="351" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">$0.045/GB</text>
  <text x="125" y="382" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">bill nổ nếu đọc S3 nhiều</text>

  <rect x="251" y="276" width="218" height="120" rx="10" fill="#10b981" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="360" y="298" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">VPC Gateway endpoint</text>
  <text x="360" y="320" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.8">EC2 → endpoint → S3/DynamoDB</text>
  <rect x="305" y="334" width="110" height="26" rx="13" fill="#10b981" fill-opacity="0.9"/>
  <text x="360" y="351" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">Free</text>
  <text x="360" y="382" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">không qua NAT, không tốn traffic</text>

  <rect x="486" y="276" width="218" height="120" rx="10" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="595" y="298" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Qua CloudFront</text>
  <text x="595" y="320" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.8">origin → CDN → user</text>
  <rect x="528" y="334" width="134" height="26" rx="13" fill="#3b82f6" fill-opacity="0.9"/>
  <text x="595" y="351" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">$0.085/GB</text>
  <text x="595" y="382" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">cache giảm 50-80% origin egress</text>
</svg>

### 6.2 Cost trap top 5

1. **NAT Gateway egress**: $0.045/GB. Lambda/EC2 đọc S3 qua NAT thay vì endpoint → bill nổ.
2. **CloudWatch Logs**: $0.50/GB ingest + storage. Chatty app log → $$$$.
3. **Cross-AZ chat**: microservice ở AZ-a gọi DB ở AZ-b → 0.01 + 0.01 = $0.02/GB.
4. **Egress to internet**: API serve content trực tiếp không qua CloudFront.
5. **Data Lake egress**: analytics tool query S3 cross-region.

### 6.3 Optimization patterns

| Vấn đề | Giải pháp |
|--------|-----------|
| Lambda/EC2 đọc S3 qua NAT | **VPC Gateway endpoint S3** (free) |
| ECS task gọi DynamoDB qua NAT | **VPC Gateway endpoint DynamoDB** |
| ECS gọi SQS/Secrets Manager qua NAT | **VPC Interface endpoint** (PrivateLink) — cost endpoint nhưng free traffic |
| Web egress to internet | **CloudFront** trước (giảm 50-80% origin egress) |
| Microservice cross-AZ chat | **Topology aware routing** (Envoy/Istio prefer same-AZ), zonal DNS |
| Cross-region read replica | Cân nhắc cache locally |
| CloudWatch Logs ingest cao | Filter trước log, sampling, push S3 không Logs |

### 6.4 CloudFront pricing
- Per region rate (Asia, EU đắt hơn US).
- Free Tier: 1TB/tháng + 10M request.
- **Reserved Capacity Pricing** (commit > 10 TB/tháng): discount lớn.
- Origin Shield extra cost nhưng giảm origin egress 50-80%.

---

## 7. CloudWatch & monitoring cost

### 7.1 CloudWatch
- **Metric**: $0.30/metric/tháng (high-resolution / custom).
- **Logs**: $0.50/GB ingest + $0.03/GB storage.
- **Dashboard**: $3/dashboard/tháng.
- **Alarm**: $0.10/alarm/tháng (standard).
- **Insights query**: $0.005/GB scanned.

### 7.2 Optimization
- Reduce log verbosity (INFO level prod, không DEBUG).
- Filter log ở agent (Fluent Bit) trước upload.
- S3 log archive thay CloudWatch dài hạn.
- Aggregate metric ở app, push 1 lần thay 1000 lần.

### 7.3 X-Ray
- $5/1M trace recorded.
- Sampling 1-5% production.

---

## 8. Patterns enterprise cost

### 8.1 Multi-account billing
- Consolidated Billing: discount tier (S3, data transfer) áp dụng aggregate.
- Volume discount tự động khi tổng > threshold.

### 8.2 Enterprise Discount Program (EDP)
- Commit annual spend $1M+ → custom discount (5-20%).
- Negotiate hàng năm.

### 8.3 Private Pricing Agreement (PPA)
- Custom pricing cho specific service.

### 8.4 AWS Marketplace
- 3rd-party software billed qua AWS — count towards EDP commit.

---

## 9. Patterns optimization cho 3 use case

### 9.1 Analytics pipeline
- Glue (serverless ETL).
- S3 + Parquet + partition.
- Athena query (pay per scan).
- Quicksight cho dashboard.
- Tránh Redshift cluster 24/7 nếu workload ad-hoc — dùng Redshift Serverless hoặc Athena.

### 9.2 SaaS B2B với 100 customer
- Multi-tenant DynamoDB (cost per access).
- Aurora Serverless v2 cho query SQL.
- Per-tenant tagging → cost allocation report cho billing customer.

### 9.3 Global API
- CloudFront cache aggressive.
- Origin trong region rẻ nhất (us-east-1 thường rẻ nhất cho most service).
- VPC endpoint everywhere (no NAT egress cost cho AWS API call).
- Lambda Graviton cho compute tier.

---

## 10. Cạm bẫy đề thi (SAA)

1. **"DynamoDB on-demand luôn rẻ hơn"** → **Sai**, ~7x đắt nếu util cao.
2. **"Read Replica giảm bill"** → **Sai**, mỗi replica = 1 instance bill.
3. **"Multi-AZ standby phục vụ read"** → **Sai** (đã nói nhiều lần — vẫn bẫy quen).
4. **"VPC endpoint S3 phải pay"** → **Sai**, Gateway endpoint free. Interface mới tốn.
5. **"CloudFront tăng cost so với serve direct"** → **Sai** thường, vì giảm origin egress nhiều hơn cost CF.
6. **"NAT Gateway free intra-VPC"** → **Sai**, mọi data qua NAT charge $0.045/GB.
7. **"CloudWatch Logs free trong AWS"** → **Sai**, ingest + storage charge.
8. **"Aurora Serverless v2 free khi idle"** → **Sai**, min 0.5 ACU pay luôn (v2 không pause như v1).

---

## 11. Tóm tắt 1 dòng

> DB: right-size + RI + đúng capacity mode. Data transfer: VPC endpoint everywhere, CloudFront trước origin, same-AZ routing, log discipline. **Data transfer là 20-40% bill ở nhiều org — đừng bỏ qua.**

---

## 12. Bài tập tự kiểm tra

1. RDS Postgres r6i.4xlarge Multi-AZ + 3 Read Replica. CPU avg 20%. Bill $20k/tháng. Plan optimize?
2. DynamoDB table on-demand, RCU avg 5000, peak 50k 1h/ngày. Provisioned + auto-scale rẻ hơn không? Tính.
3. Web app egress bill $5000/tháng. 70% là image download direct from S3. Action?
4. Microservice K8s, 5 service trong 3 AZ, full mesh chat. Cross-AZ bill $2000/tháng. Reduce thế nào?
5. CloudWatch Logs ingest 100 GB/ngày, cost $1500/tháng. Optimization?
6. So sánh Aurora I/O-Optimized vs Standard cho workload 50k IOPS sustained. Cái nào rẻ hơn?

---

## 13. Đọc thêm

- AWS docs — *RDS pricing*, *DynamoDB pricing*, *Data transfer pricing*.
- AWS Builder's Library — *Cost optimization*.
- *AWS Cost Optimization Pillar Whitepaper*.

---

**Bài tiếp theo**: [[ch4-04-cost-visibility]] — Cost Explorer, Budgets, Anomaly Detection, tagging strategy, FinOps.
