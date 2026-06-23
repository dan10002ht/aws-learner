# Bài 18 — DR & HA Strategies

**Foundation:** [[foundations-06-failure-modes]] — cascading failure, partition.

## 1. Mục tiêu
- Hiểu **RPO/RTO** và 4 DR strategy.
- Thiết kế Multi-AZ HA + Multi-Region DR.
- Patterns: pilot light, warm standby, active-active.
- Backup & restore với AWS Backup.

---

## 2. Khái niệm

### 2.1 RPO vs RTO
- **RPO (Recovery Point Objective)** — bao nhiêu data **được phép mất**.
  - RPO = 0 → sync replication (no data loss).
  - RPO = 5 phút → backup mỗi 5 phút.
- **RTO (Recovery Time Objective)** — bao lâu **phải back online**.
  - RTO = 0 → active-active.
  - RTO = 4h → restore from backup acceptable.

### 2.2 4 DR strategy

| Strategy | RPO | RTO | Cost | Mô tả |
|----------|-----|-----|------|-------|
| **Backup & Restore** | Hours | Hours | $ | Snapshot/backup cross-region. Standby = 0 resource. |
| **Pilot Light** | Minutes | 10s of minutes | $$ | DB replicate, app stopped/scaled-down. Activate khi failover. |
| **Warm Standby** | Seconds | Minutes | $$$ | DB replicate, app running min capacity. Scale-up khi failover. |
| **Multi-Site Active/Active** | ~0 | ~0 (sub-minute) | $$$$ | Cả 2 region serve traffic. |

→ Chọn theo business criticality. Pricing tăng theo cấp.

---

## 3. Multi-AZ HA (single region)

### 3.1 Components level HA

| Service | HA pattern |
|---------|-----------|
| EC2 | ASG multi-AZ + ELB |
| RDS | Multi-AZ instance hoặc Cluster |
| Aurora | 6 replica 3 AZ built-in |
| ElastiCache Redis | Multi-AZ failover |
| DynamoDB | Multi-AZ built-in |
| S3 | Multi-AZ built-in (Standard) |
| Lambda | Multi-AZ AWS-managed |
| EFS | Multi-AZ |
| NAT GW | Per AZ (1 NAT GW / AZ cho HA) |
| ALB/NLB | Multi-AZ |

### 3.2 Multi-AZ failure scenarios
- **AZ-A power outage** → ASG launch instance AZ-B/C; RDS Multi-AZ failover; users không thấy.
- **AZ network partition** → ELB health check fail target → drain; ASG rebalance.
- **Single instance fail** → ASG replace + Health check ELB.

---

## 4. Multi-Region DR

### 4.1 Backup & Restore
- **AWS Backup** centralize: RDS, EBS, EFS, DDB, Aurora, FSx, S3, Storage Gateway, Redshift.
- **Backup Vault Lock** — immutable WORM.
- **Cross-Region Copy** + **Cross-Account Copy** scheduled.
- Restore: tạo lại resource từ snapshot.
- Test restore quarterly.

### 4.2 Pilot Light
- **Database replicate cross-region** (Aurora Global, RDS Read Replica cross-region, DDB Global Tables).
- **Compute "off"** — AMI sẵn sàng, ASG min=0, hoặc Lambda code deployed but not invoked.
- **Failover**: Route 53 failover → trigger Lambda promote DB, scale ASG, update DNS.
- RTO 10s of minutes.

### 4.3 Warm Standby
- **DB replicate** + **app running min capacity** (1 ALB + 1-2 EC2).
- **Failover**: scale ASG up, Route 53 failover, promote DB.
- RTO minutes.

### 4.4 Multi-Site Active/Active
- **DB**: Aurora Global, DDB Global Tables, hoặc data partition by region.
- **Compute**: full capacity both region.
- **Routing**: Route 53 latency + health check, hoặc Global Accelerator.
- RTO ~0.
- Phức tạp: conflict resolution, eventual consistency cross-region (foundation [[foundations-04-latency-vs-consistency]]).

---

## 5. Service-specific replication

### 5.1 RDS
- **Multi-AZ** = HA single region.
- **Read Replica cross-region** = async, manual promote.
- **Snapshot cross-region copy** = backup-based DR.

### 5.2 Aurora
- **Aurora Global Database**: 1 writer + 5 reader region, < 1s lag, RPO 1s, RTO < 1 phút **managed failover**.
- Headless reader region (no compute, only storage) for cost saving.

### 5.3 DynamoDB
- **Global Tables**: multi-region active-active, eventual consistency, last-writer-wins.
- **PITR**: 35 ngày.

### 5.4 S3
- **CRR / SRR** + versioning.
- **MRAP**: active-active S3 cross-region.
- **Batch Replication** cho object cũ.

### 5.5 EBS / EFS
- **Snapshot cross-region copy** via AWS Backup.
- **EFS Replication**: continuous async, RPO < 15 phút (mới 2022).

### 5.6 ElastiCache
- **Global Datastore** (Redis): 1 primary + up to 2 secondary region, cross-region replication.

---

## 6. Failure isolation patterns

### 6.1 Circuit Breaker
- Detect downstream fail rate → "open" circuit → fail-fast không gọi nữa → recover sau timeout.
- App-level (Resilience4j, Polly) hoặc service mesh (App Mesh, Istio).

### 6.2 Retry with exponential backoff + jitter
- Retry transient error nhưng tăng wait dần (1s, 2s, 4s, 8s).
- **Jitter** random offset → tránh thundering herd.

### 6.3 Bulkhead
- Isolate resource per service/tenant — 1 service fail không drain pool chung.

### 6.4 Throttling
- Server-side rate limit để tự bảo vệ.
- API Gateway throttle, ALB rate limit, WAF rate-based rules.

### 6.5 Graceful degradation
- Fallback response khi downstream fail (e.g. cached version, default page).

→ Foundation [[foundations-06-failure-modes]] đi sâu các pattern này.

---

## 7. Chaos Engineering
- **AWS Fault Injection Service (FIS)** — managed chaos test (Netflix-style).
- Inject failures: EC2 stop, throttle API, network latency, RDS reboot...
- Run in dev/staging trước prod.
- "Game Day" — team practice DR procedure.

---

## 8. Backup best practices

### 8.1 AWS Backup
- **Backup Plan**: rule + schedule + retention + lifecycle (move to cold storage) + copy cross-region/account.
- **Backup Vault**: container + KMS encryption.
- **Vault Lock**: immutable retention (compliance).
- **Audit Manager** integration.

### 8.2 Test restore
- **Quarterly** test restore của top critical workload.
- Document RTO actual measured.
- Compare với RTO target.

### 8.3 3-2-1 rule
- **3** copies: primary + 2 backup.
- **2** different media/account.
- **1** offsite (cross-region hoặc Glacier Deep Archive).

---

## 9. Tự kiểm tra

1. RPO = 1 giờ, RTO = 4 giờ, ngân sách thấp. Strategy?
   <details><summary>Đáp án</summary>**Backup & Restore** cross-region với AWS Backup hourly snapshot. Rẻ nhất, RTO 4h acceptable cho restore.</details>

2. RPO < 1 giây, RTO < 1 phút, app global. Strategy?
   <details><summary>Đáp án</summary>**Multi-Site Active/Active** với **Aurora Global** (RPO 1s, RTO < 1 phút) + DDB Global Tables + Route 53 latency + GA.</details>

3. Aurora Global vs RDS Read Replica cross-region cho DR?
   <details><summary>Đáp án</summary>**Aurora Global** managed failover < 1 phút, RPO 1s, dedicated replication infra. **RDS Read Replica** manual promote, lag biến động. Aurora Global tốt hơn nếu engine support.</details>

4. App Multi-AZ. Một AZ down. User có nhận thấy không?
   <details><summary>Đáp án</summary>Nếu thiết kế đúng — **không**. ASG launch instance AZ khác (~2-3 phút), ELB drain unhealthy target, RDS Multi-AZ failover 60-120s. Trong 2-3 phút có thể có error transient.</details>

5. Multi-region active-active. User write A, B đồng thời cùng key DDB Global Tables. Kết quả?
   <details><summary>Đáp án</summary>**Last-writer-wins** (timestamp-based). Data của write trước bị overwrite. Cần app-level conflict resolution nếu critical (vector clock, CRDT).</details>

6. Aurora Global headless reader region — ý nghĩa?
   <details><summary>Đáp án</summary>Region chỉ có storage replicate (cho compliance hoặc cold standby), không có compute → rẻ. Khi cần failover, tạo cluster compute từ storage có sẵn.</details>

7. EFS replicate cross-region. Lag bao nhiêu?
   <details><summary>Đáp án</summary>**< 15 phút** (RPO ~15 min). Continuous async.</details>

8. Backup Vault Lock immutable mode. Có xóa được không?
   <details><summary>Đáp án</summary>**Compliance mode** = không xóa được, kể cả root. **Governance mode** = user có quyền đặc biệt mới override. Min duration 7 ngày grace period với Compliance.</details>

9. Test DR procedure thực tế?
   <details><summary>Đáp án</summary>**Game Day** quarterly — team thực sự failover prod sang DR region, đo RTO actual, document gap. Hoặc dùng **AWS FIS** chaos test.</details>

10. Pattern chống thundering herd retry?
    <details><summary>Đáp án</summary>**Exponential backoff + jitter** — wait random within range tăng dần. Library boto3 mặc định có (`adaptive` mode 2020+).</details>

---

## 10. Đối chiếu GCP

| AWS | GCP |
|-----|-----|
| Multi-AZ | **Multi-zone** (region có 3+ zone) |
| Multi-Region DR | Multi-region resource + custom DR |
| RDS Multi-AZ | Cloud SQL HA |
| Aurora Global | **Spanner** (strong consistent multi-region) hoặc AlloyDB cross-region |
| DDB Global Tables | Spanner / Firestore multi-region |
| S3 CRR | Turbo Replication / dual-region bucket |
| AWS Backup | **Backup and DR** (managed, 2022) |
| Backup Vault Lock | **Retention Lock** |
| AWS FIS | (3rd-party tools) |
| Game Day | Same concept |

**Bẫy:**
1. GCP **multi-region bucket** built-in (us, eu, asia). AWS S3 bị khoá region.
2. **Spanner strong consistent multi-region** = không có ở AWS. Aurora Global = 1 writer eventual reader.
3. **GCP Backup and DR** new service (2022) tương đương AWS Backup.

---

## 11. Lưu ý SAA

- **RPO** = data loss tolerance. **RTO** = downtime tolerance.
- **Backup & Restore** cheapest, RTO hours.
- **Pilot Light** = DB replicate + compute off.
- **Warm Standby** = DB + app min capacity.
- **Active/Active** = both region serving, RTO ~0.
- **Aurora Global** RPO 1s RTO < 1 phút managed failover.
- **DDB Global Tables** eventual + last-writer-wins.
- **S3 CRR** + versioning. **MRAP** active-active.
- **AWS Backup** centralize + Vault Lock immutable.
- **Multi-AZ ≠ Multi-Region**. Multi-AZ = HA same region. Multi-Region = DR.
- **NAT GW per AZ** for HA.
- **Route 53 failover** với health check.

## 12. Lưu ý đi làm

### DR runbook
- **Document** failover procedure step-by-step.
- **Automate** via Step Functions / Systems Manager Automation.
- **Test quarterly** với chaos engineering.
- **Update** sau mỗi prod change.
- **Roles & comms**: ai trigger, ai approve, ai inform.

### Cost optimization DR
- **Backup retention** rule based on criticality (prod 35d, dev 7d).
- **Cold storage** archive backup > 90 ngày → Glacier.
- **Headless reader region** Aurora cho compliance không cần compute.
- **Pilot Light > Active/Active** nếu RTO 10 phút acceptable (cheaper 80%).

### Anti-pattern
- ❌ Backup không test restore → không biết RTO thật.
- ❌ Multi-region active-active không cần thiết (RTO 1h OK) → cost 4x.
- ❌ Single AZ prod RDS.
- ❌ Snapshot cùng region with primary (region down = mất luôn).
- ❌ DR procedure chỉ trong tài liệu, không tự động → human error in crisis.
- ❌ Đo RPO/RTO theo lý thuyết, không test thực tế.

## 13. Foundations
- [[foundations-06-failure-modes]] — cascading, retry storm, partial failure.
- [[foundations-03-replication-and-quorum]] — Aurora 4/6 quorum cho failover.
- [[foundations-04-latency-vs-consistency]] — multi-region tradeoff.

## 14. Flashcard

- **RPO** data loss. **RTO** downtime.
- **Backup & Restore** RTO hours, cheapest.
- **Pilot Light** DB on, compute off.
- **Warm Standby** DB on, compute min.
- **Active/Active** both serving.
- **Aurora Global** RPO 1s, RTO < 1 phút.
- **DDB Global Tables** eventual + LWW.
- **S3 CRR** + versioning. **MRAP** active-active.
- **EFS Replication** RPO < 15 phút.
- **ElastiCache Global Datastore** Redis cross-region.
- **AWS Backup** centralize + Vault Lock.
- **3-2-1** rule.
- **Multi-AZ** = HA. **Multi-Region** = DR.
- **Circuit Breaker, Retry+backoff+jitter, Bulkhead, Throttling, Graceful degradation**.
- **AWS FIS** chaos managed.
- **Game Day** practice DR.
