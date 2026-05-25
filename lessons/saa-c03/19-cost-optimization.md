# Bài 19 — Cost Optimization Deep

## 1. Mục tiêu
- Áp dụng Well-Architected Cost pillar.
- Right-size + commit (SP/RI) + Spot mix.
- Storage class strategy.
- Tránh các cost trap: data transfer, NAT GW, IP, log retention.

---

## 2. Well-Architected — 6 pillars (recap)
1. **Operational Excellence**
2. **Security**
3. **Reliability**
4. **Performance Efficiency**
5. **Cost Optimization**
6. **Sustainability**

## 3. Compute cost

### 3.1 Pricing model selection

```
Workload baseline (24/7 ổn định)?
├── Yes → Compute SP 1y/3y (flexible) hoặc EC2 Instance SP (max discount)
└── No → Mix: SP cho base + On-Demand cho spike, hoặc Spot

Stateless + retryable?
└── Yes → Spot (60-90% off)

Cần specific HW (Windows/Oracle BYOL)?
└── Dedicated Host

Cần guaranteed capacity in region (DR)?
└── Capacity Reservation (no discount, just reservation)
```

### 3.2 Savings Plans deep
- **Compute SP** (flexible) — áp EC2 + Fargate + Lambda, đổi region/family/OS thoải mái.
- **EC2 Instance SP** — fix family + region, **max discount**.
- **SageMaker SP** — ML workload.
- **Commitment**: $/hour cho 1 hoặc 3 năm.
- **Payment**: All upfront / Partial / No upfront. All upfront discount cao nhất.

→ Recommendation: bắt đầu **Compute SP 1y no-upfront** sau khi workload ổn định 1 tháng.

### 3.3 Right-sizing
- **Compute Optimizer** (free) — recommend EC2/EBS/Lambda/ASG dựa 14 ngày metric.
- **Trusted Advisor** — idle EC2.
- Verify **peak** + **headroom**, không chỉ avg.

### 3.4 Spot
- **Spot Fleet** mix nhiều instance types/AZ → minimize interruption.
- **Capacity-Optimized** allocation strategy.
- **Spot Block** (deprecated, no longer available 2021+).
- **Spot Hibernation** — save state khi reclaim.
- Use case: CI, batch, ML training, stateless web.

### 3.5 Graviton
- ARM, **20-40% rẻ hơn** cho cùng perf.
- Workload portable: Go/Java/Python/Node/Ruby.
- Suffix `g` trong family (m7g, c7g, r7g).

### 3.6 Schedule stop/start
- **Instance Scheduler** (CFN solution) hoặc Lambda + EventBridge.
- Dev/test stop 18:00 → start 9:00 weekday → **save 60%**.

### 3.7 Lambda
- **Right-size memory** (Compute Optimizer cho Lambda).
- **Provisioned Concurrency** chỉ cho production critical, mỗi $/h.
- **arm64** Graviton cho Lambda → 20% rẻ hơn.

---

## 4. Storage cost

### 4.1 S3 class strategy
- **Intelligent-Tiering** cho data unknown pattern (auto move).
- **Lifecycle** cho data predictable (logs 30d → IA, 90d → Glacier).
- **Object size > 128KB** trước khi vào IA (min size charge).
- **Compression** + **Parquet/ORC** giảm 80% size + 90% Athena scan cost.
- **Abort multipart** lifecycle bắt buộc.
- **Storage Lens** review monthly.

### 4.2 EBS
- **gp3** thay gp2 → 20% rẻ.
- **Snapshot** incremental, dùng AWS Backup + lifecycle.
- **Delete unattached volumes**.
- **Snapshot Archive** (2022) — 75% cheaper than standard snapshot cho long-term.

### 4.3 EFS
- **Lifecycle Management** move IA sau 30 ngày → save 92%.
- **Elastic throughput** thay Provisioned cho variable workload.

### 4.4 Log retention
- **CloudWatch Logs** default **never expire** → đắt theo thời gian.
- Set retention 30-90 ngày.
- **Subscription filter** → Firehose → S3 + lifecycle Glacier cho long-term.

---

## 5. Data transfer cost (TRAP #1)

| Direction | Cost |
|-----------|------|
| Internet **IN** | Free |
| Internet **OUT** | $0.09/GB (giảm theo volume) |
| Cross-AZ | **$0.01/GB mỗi chiều** |
| Cross-Region | $0.02-0.09/GB |
| Same AZ same VPC private IP | **Free** |
| Same AZ public IP/EIP | $0.01/GB |
| Via CloudFront | Rẻ hơn direct egress |
| Via VPC Endpoint Gateway (S3/DDB) | **Free** |

### Saving patterns
- **VPC Gateway Endpoint S3/DDB** → save NAT data fee.
- **VPC Interface Endpoint** cho service hay dùng → save NAT.
- **CloudFront** trước S3/ALB → giảm egress.
- **Direct Connect** rẻ hơn egress Internet > 10TB/tháng.
- **Cross-AZ minimize**: ALB enable cross-zone (free ALB; NLB tính phí), ASG balance.
- **Same-AZ data plane** (Kafka, ElastiCache) — partition aware client.

---

## 6. Network cost

### 6.1 NAT Gateway
- **$0.045/h + $0.045/GB**.
- 3 NAT GW (3 AZ HA) = ~$100/tháng base + GB.
- Save:
  - Gateway Endpoint S3/DDB (free).
  - Interface Endpoint cho hay-dùng-service.
  - 1 NAT GW shared 3 AZ (risk accepting).

### 6.2 Elastic IP
- **Public IPv4** từ 2024 tính phí **$0.005/h** dù dùng hay không.
- Release EIP idle.
- IPv6 free.

### 6.3 Inter-VPC
- Peering same region free (data thôi tính).
- TGW $0.05/h/attachment + $0.02/GB processed.
- Cloud WAN cao hơn TGW.

---

## 7. Database cost

### 7.1 RDS
- **RI** 1y/3y → 30-60% discount.
- **Storage Auto-scaling** (chỉ tăng, không giảm — kế hoạch trước).
- **Stop dev/test** (max 7 ngày, auto start lại).
- **Right-size** với Performance Insights.

### 7.2 Aurora
- **I/O Optimized** (2023) — I/O free, storage đắt hơn. Tốt khi I/O > 25% cost.
- **Serverless v2** cho variable workload.
- **Headless reader region** Aurora Global cho cold standby.

### 7.3 DynamoDB
- **Provisioned + Auto Scaling** thay On-Demand cho steady (7x rẻ hơn).
- **Reserved Capacity** thêm 50% off cho provisioned.
- **TTL** xóa item cũ.
- **Compress attribute** lớn vào S3 + reference.
- **Sparse index** (item không có attribute → không index).

### 7.4 Redshift
- **RA3 nodes** separate compute-storage.
- **Concurrency Scaling** free 1h/day.
- **Pause cluster** ngoài giờ business.
- **Spectrum** cho data lake không load vào cluster.

---

## 8. Monitoring & alerts

### 8.1 Tools
- **Cost Explorer** — phân tích + forecast.
- **Budgets** — alert + Budgets Actions (stop EC2, deny IAM).
- **Cost Anomaly Detection** — ML, free.
- **CUR** → S3 → Athena → QuickSight dashboard.
- **Cost Allocation Tags** — chargeback.
- **Compute Optimizer** — right-size.
- **Trusted Advisor** — waste detection.
- **Cost Categories** — group cost theo logic business.

### 8.2 Tag strategy
- **Mandatory tags**: `Project`, `Environment`, `Owner`, `CostCenter`, `Auto-Delete`.
- **SCP enforce tag on creation**.
- **Activate Cost Allocation Tags** (Billing → Cost allocation tags).
- **AWS Resource Groups + Tag Editor** để fix tag missing.

---

## 9. FinOps process

### 9.1 3 phases
1. **Inform** — visibility (tag + CUR + dashboard).
2. **Optimize** — right-size + SP/RI + Spot + storage class.
3. **Operate** — governance (Budgets + Anomaly Detection + SCP).

### 9.2 Practice
- **Monthly review** với engineering + finance.
- **Showback / Chargeback** per team.
- **Cost-aware design review** — mọi PR architecture có cost section.
- **Spike investigation** — Anomaly Detection alert → investigate root cause.

---

## 10. Tự kiểm tra

1. Workload web 24/7 1 năm stable. Pricing?
   <details><summary>Đáp án</summary>**Compute SP 1y no-upfront** (flexible) hoặc **EC2 Instance SP 3y all-upfront** (max discount nếu workload chắc chắn 3 năm).</details>

2. Batch job 2h mỗi đêm. Pricing?
   <details><summary>Đáp án</summary>**Spot Fleet capacity-optimized**. Batch không critical, retryable → save 60-90%.</details>

3. S3 100TB, access pattern unknown. Class?
   <details><summary>Đáp án</summary>**Intelligent-Tiering** — AWS tự move tier dựa access. Monitoring fee $0.0025/1000 object.</details>

4. CloudWatch Logs bucket 10TB sau 1 năm. Cost trap. Fix?
   <details><summary>Đáp án</summary>Set **retention 30 ngày** trong CW Logs. Export Firehose → S3 + lifecycle Glacier Deep Archive cho long-term cheap.</details>

5. NAT GW $500/tháng. App đọc S3 nhiều. Fix?
   <details><summary>Đáp án</summary>**S3 Gateway Endpoint** (free) — traffic không qua NAT. Có thể save 80% NAT bill.</details>

6. EBS gp2 100TB chuyển gp3 — kết quả?
   <details><summary>Đáp án</summary>Same perf + **20% cheaper** + IOPS/throughput config riêng. Migrate online qua Elastic Volumes.</details>

7. DDB provisioned vs on-demand cho 10k req/s steady?
   <details><summary>Đáp án</summary>**Provisioned + Auto Scaling target 70%** — rẻ ~7x On-Demand. Add Reserved Capacity 50% off thêm.</details>

8. Multi-AZ ASG balance không tốt, traffic skew AZ-A. Cost vấn đề?
   <details><summary>Đáp án</summary>**Cross-AZ data transfer** $0.01/GB mỗi chiều. ASG rebalance + ALB cross-zone (free) hoặc partition client-aware.</details>

9. Aurora I/O Optimized vs Standard?
   <details><summary>Đáp án</summary>**I/O Optimized** trade off storage đắt hơn 25% nhưng I/O free. Profitable khi I/O > 25% tổng cost (workload IO-heavy).</details>

10. Dev/test EC2 chạy 24/7. Quick saving?
    <details><summary>Đáp án</summary>**Instance Scheduler** (CFN) hoặc Lambda + EventBridge stop 18:00 start 9:00 weekday → save ~60%.</details>

---

## 11. Đối chiếu GCP

| AWS | GCP |
|-----|-----|
| Reserved Instance | CUD (Committed Use Discount) |
| Savings Plans (Compute) | CUD Flexible |
| Spot Instance | Spot VM |
| Sustained Use Discount | **Auto sustained** (free, > 25% month) |
| Compute Optimizer | Recommender |
| Cost Explorer | Cost reports |
| Budgets | Budgets |
| CUR | BigQuery Billing Export |
| Cost Anomaly Detection | Cost recommendations |
| Trusted Advisor | Recommender |
| Pricing Calculator | Pricing Calculator |
| Cost Allocation Tags | Labels |
| S3 Intelligent-Tiering | Autoclass |
| AWS Backup | Backup and DR |

**Bẫy:**
1. **GCP Sustained Use Discount auto** — AWS không có, phải chủ động mua SP/RI. Quên = mất tiền.
2. **GCP CUD Flexible** mới (2022) gần Compute SP.
3. **BigQuery Billing Export** built-in SQL, AWS CUR phải setup S3 + Athena.
4. **GCP Preemptible** 24h max (legacy). Spot VM mới giống AWS hơn.

---

## 12. Lưu ý SAA

- **Compute SP flexible** vs **EC2 SP fix family/region max discount** vs **RI specific instance**.
- **Spot capacity-optimized** strategy.
- **Graviton** save 20-40%.
- **S3 Intelligent-Tiering** auto-tier.
- **Lifecycle abort multipart** mọi bucket.
- **Storage Lens** + **CUR** + **QuickSight** dashboard.
- **VPC Gateway Endpoint** free, save NAT.
- **Cross-AZ traffic $0.01/GB mỗi chiều** trap.
- **NAT GW** per AZ → cost; minimize qua endpoint.
- **CloudWatch Logs retention** 30-90d.
- **Budgets Actions** auto stop/IAM deny.
- **Compute Optimizer** right-size.
- **Aurora I/O Optimized** khi I/O > 25%.
- **DDB Provisioned + Reserved** thay On-Demand steady.

## 13. Lưu ý đi làm

### Quick wins (1 tuần)
- [ ] Tag chuẩn `Project`, `Owner`, `Env`, `CostCenter`.
- [ ] Budget alarm $X/tháng.
- [ ] CloudWatch Logs retention 30d.
- [ ] gp2 → gp3 mọi volume.
- [ ] EIP idle release.
- [ ] EBS unattached delete.
- [ ] Snapshot orphan delete.

### Medium-term (1 tháng)
- [ ] Compute Optimizer review + apply.
- [ ] Stop/start scheduler dev/test.
- [ ] Compute SP 1y baseline.
- [ ] S3 Intelligent-Tiering cho data > 128KB.
- [ ] VPC Endpoint Gateway S3/DDB.
- [ ] CloudFront trước S3/ALB.

### Long-term (1 quarter)
- [ ] Graviton migration test → roll out.
- [ ] CUR + QuickSight dashboard.
- [ ] FinOps process (showback/chargeback).
- [ ] Aurora I/O Optimized analysis.
- [ ] Multi-region cost review.

### Anti-pattern
- ❌ Không tag → không chargeback được.
- ❌ Multi-AZ dev/test không cần thiết.
- ❌ Default CW detailed monitoring mọi EC2 (1 phút metric).
- ❌ CloudWatch Logs forever retention.
- ❌ NAT GW serve S3 traffic.
- ❌ EIP idle.
- ❌ Snapshot accumulate forever.
- ❌ Compute SP commit overage (over-commit → trả on-demand cho phần thừa).
- ❌ Spot cho stateful workload.

## 14. Foundations
Chưa cần. Cost tối ưu nhưng không cùng mục đích distributed system.

## 15. Flashcard

- **6 pillars**: Operational, Security, Reliability, Performance, Cost, Sustainability.
- **Compute SP** flexible. **EC2 Instance SP** fix family max discount. **RI** legacy.
- **Spot capacity-optimized**.
- **Graviton** 20-40% rẻ.
- **Schedule stop/start** dev/test save 60%.
- **gp3** thay gp2 save 20%.
- **S3 Intelligent-Tiering** auto-tier.
- **Lifecycle abort multipart** bắt buộc.
- **Snapshot Archive** save 75%.
- **EFS lifecycle IA** save 92%.
- **CloudWatch Logs retention** 30d, archive Firehose → S3 → Glacier.
- **Cross-AZ $0.01/GB**.
- **Internet egress $0.09/GB**.
- **VPC Gateway Endpoint** S3/DDB free.
- **Public IPv4** $0.005/h 2024+.
- **NAT GW** $0.045/h + $0.045/GB.
- **CloudFront** giảm S3 egress.
- **DDB Provisioned + Auto Scaling + Reserved** save 7x.
- **Aurora I/O Optimized** > 25% I/O.
- **Compute Optimizer** + **Trusted Advisor** + **Anomaly Detection** all free.
- **Budgets Actions** auto-remediate.
- **Tag from day 1**.
