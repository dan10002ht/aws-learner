# Lộ trình SAA-C03 (Solutions Architect Associate) — Deep Dive

**Mục tiêu:** Thi đậu SAA-C03 (65 câu, 130 phút, passing ~720/1000, $150).

**Điều kiện nên có trước:** Đã pass CLF-C02 hoặc nắm vững toàn bộ nội dung CLF.

**Thời gian gợi ý:** 8–12 tuần, 1–2 giờ/ngày.

**Triết lý học:** SAA không còn hỏi "service này làm gì" — đề là **scenario** ("Công ty X cần Y, chọn solution nào?"). Bạn phải **thiết kế** và chọn trade-off giữa:
- HA (High Availability)
- Resilience / DR
- Performance
- Security
- Cost

> **Bí quyết:** Với mỗi service, tự hỏi **5 câu**: (1) giải quyết vấn đề gì, (2) limit/quota, (3) giá như thế nào, (4) khi nào KHÔNG dùng, (5) thay thế bằng service nào.

---

## ⚠️ Lưu ý tổng quát khi thi SAA-C03

### Pattern đề thi
1. Câu hỏi thường dài **3–6 dòng scenario** + 4 đáp án đều "chạy được" → chọn **best fit**.
2. Đọc từ khoá cuối câu: **"most cost-effective"**, **"least operational overhead"**, **"highest availability"**, **"real-time"**, **"minimize latency"**.
3. Khi có nhiều đáp án đúng về mặt kỹ thuật: ưu tiên **serverless > managed > self-managed**, **AWS native > third-party**.
4. Đáp án dài, có nhiều bước cấu hình phức tạp → thường là **trap**.

### Từ khoá → Service map (thuộc lòng)
| Keyword | Service đúng |
|---------|--------------|
| Decouple / loose coupling | **SQS** |
| Fan-out / pub-sub | **SNS** (hoặc EventBridge) |
| Event-driven, schema, schedule | **EventBridge** |
| Orchestrate workflow | **Step Functions** |
| Real-time streaming (shards) | **Kinesis Data Stream** |
| Near real-time → S3/Redshift/OpenSearch | **Kinesis Firehose** |
| Clickstream analytics | **Kinesis Data Analytics** |
| Query S3 không di chuyển data | **Athena** |
| ETL managed | **Glue** |
| BI dashboard | **QuickSight** |
| Data catalog | **Glue Data Catalog / Lake Formation** |
| Petabyte warehouse | **Redshift** |
| Global relational DB | **Aurora Global** |
| Global NoSQL | **DynamoDB Global Tables** |
| Single-digit ms NoSQL | **DynamoDB** |
| In-memory microsecond cache | **ElastiCache Redis / DAX** |
| Shared file Linux multi-AZ | **EFS** |
| Shared file Windows | **FSx for Windows** |
| HPC scratch file | **FSx for Lustre** |
| Low-latency hybrid (private fiber) | **Direct Connect** |
| Hybrid tạm, Internet encrypted | **Site-to-Site VPN** |
| Multi-VPC full mesh scale | **Transit Gateway** |
| Access S3/DDB private không NAT | **Gateway VPC Endpoint** |
| Access AWS service private via ENI | **Interface Endpoint / PrivateLink** |
| Global static+dynamic, 2 static IP | **Global Accelerator** |
| CDN + signed URL + Lambda@Edge | **CloudFront** |
| Auth user app mobile/web | **Cognito User Pool** (sign-in) |
| Temp AWS credential từ federated | **Cognito Identity Pool** (exchange to IAM) |
| Rotate secret + DB integration | **Secrets Manager** |
| Config/param đơn giản, rẻ | **Parameter Store** |
| Threat detection ML | **GuardDuty** |
| PII trong S3 | **Macie** |
| Scan vulnerability EC2/ECR/Lambda | **Inspector** |
| DDoS L7 | **WAF + Shield Advanced** |
| DDoS L3/L4 auto free | **Shield Standard** |
| Compliance continuous config | **AWS Config** |

### Bẫy cực hay ra
1. **RDS Multi-AZ ≠ Read Replica.** Multi-AZ = HA (failover), Read Replica = scale read (async).
2. **EBS** gắn **1 instance 1 AZ** (trừ io1/io2 Multi-Attach same AZ). Muốn share multi-instance → **EFS**.
3. **Instance Store** = ephemeral, data mất khi stop/terminate.
4. **S3 Gateway Endpoint** = miễn phí, chỉ cho S3 và DynamoDB. **Interface Endpoint** = trả phí/h + /GB.
5. **NAT Gateway** = 1 per AZ cho HA (không share cross-AZ miễn phí).
6. **ALB** terminate SSL được, hỗ trợ WebSocket, HTTP/2. **NLB** pass-through SSL, static IP, UDP.
7. **CloudFront + S3 private**: dùng **OAC (Origin Access Control)**, không còn dùng OAI cũ.
8. **DynamoDB**: throughput — On-Demand (spike) vs Provisioned (steady). GSI ≠ LSI: LSI phải tạo khi tạo table, cùng partition key, khác sort key.
9. **Aurora Serverless v2** != v1. v2 scale liên tục, support MySQL + PostgreSQL, không có "pause".
10. **Data transfer cost** (trap cổ điển):
    - Cùng AZ cùng VPC: **free**
    - Cross-AZ trong Region: **$0.01/GB mỗi chiều**
    - Cross-Region: **$0.02–0.09/GB**
    - Ra Internet: **$0.09/GB** (giảm theo volume)
    - Qua CloudFront ra Internet: rẻ hơn direct
11. **Lambda** VPC: có cold start tăng nếu bật VPC. Giờ đã cải thiện với Hyperplane ENI.
12. **SQS FIFO** giới hạn **300 msg/s** (hoặc 3000 với batch). Standard gần như vô hạn.
13. **Kinesis shard** = 1MB/s in, 2MB/s out, 1000 records/s in per shard.
14. **Route 53 health check** chỉ gọi từ **outside AWS** → public endpoint hoặc private via CloudWatch.
15. **Storage Gateway** 4 loại: File (NFS/SMB → S3), Volume (iSCSI, cached/stored), Tape (VTL).

### Lưu ý khi thi (khác CLF)
- **Trung bình 2 phút/câu** — không dư nhiều. Đọc câu hỏi **trước**, đáp án sau, bỏ đáp án có keyword sai ngay.
- Nhiều câu có 2 đáp án **đúng cả 2** nhưng 1 cái có "operational overhead" cao hơn → chọn cái thấp hơn.
- Nếu đề hỏi "**combination of steps** (choose 2/3)" → phải chọn đủ số, không dư không thiếu.
- Có câu dài gặp service lạ (ví dụ AWS DataSync, AWS Backup, AWS App Runner) — đừng hoảng, loại trừ trước.

---

## Tuần 1–2 — IAM nâng cao & Security Design

### Deep dive
- **IAM Policy evaluation order**: SCP → Resource-based → Identity-based → Permission Boundary → Session Policy. Bất kỳ cái nào Deny → Deny.
- **Resource-based policy** (S3 bucket, KMS, SQS, SNS, Lambda): principal bên ngoài account có thể được phép **mà không cần role AssumeRole**.
- **Permission Boundary**: giới hạn tối đa của 1 user/role (delegation safety).
- **IAM Role for EC2**: Instance Profile là container chứa role.
- **AssumeRole cross-account**: account A trust account B trong trust policy; account B user phải có `sts:AssumeRole` trong identity policy.
- **KMS**: AWS-managed key (free, rotate 1 năm) vs Customer-managed CMK (tự rotate, $1/tháng/key) vs Imported (tự quản key material) vs Custom Key Store (CloudHSM backing).
- **Envelope encryption**: data key encrypt data, CMK encrypt data key.
- **Secrets Manager** vs **Parameter Store SecureString**: Secrets Manager **$0.40/secret/tháng + auto rotate + cross-region replicate**; Parameter Store free tier standard, không auto rotate built-in (dùng Lambda).
- **Cognito User Pool** = IdP (JWT), **Identity Pool** = đổi JWT/Google/FB token → AWS temp credential.
- **VPC Endpoint Policy** + **S3 Bucket Policy aws:SourceVpce**: chặn truy cập S3 ngoài VPC.
- **SCP** chỉ áp trong Organization, **không áp cho management account**.

### Lưu ý khi đi làm
- **Nguyên tắc vàng**: Least privilege + short-lived credential (Role + STS) + MFA everywhere.
- Dùng **IAM Access Analyzer** để phát hiện resource share ra ngoài account.
- **KMS key rotation**: bật cho CMK, nhưng nhớ rotation KMS không re-encrypt data cũ — chỉ key mới cho data mới.
- Bật **CloudTrail** ghi management + data events (data events S3/Lambda có phí riêng).

→ [lessons/10-iam-advanced.md](../lessons/10-iam-advanced.md), [lessons/11-kms.md](../lessons/11-kms.md)

---

## Tuần 3–4 — Compute & Decoupling

### Deep dive EC2
- **Instance family**: `t` (burstable), `m` (general), `c` (compute), `r` (memory), `x/z` (extreme mem), `i/d` (storage), `g/p/inf/trn` (GPU/ML), `a` (ARM Graviton rẻ 20–40%).
- **Placement Groups**:
  - **Cluster**: same AZ, low latency, HPC. Risk: 1 AZ fail → mất hết.
  - **Spread**: 7 instance per AZ max, different HW.
  - **Partition**: up to 7 partition/AZ, HDFS/Kafka/Cassandra.
- **EBS types**:
  - **gp3** (default mới, 3000 IOPS base, tách rời size và IOPS, **rẻ hơn gp2 ~20%**).
  - **io1/io2** (up to 64k IOPS, io2 Block Express 256k), Multi-Attach same AZ.
  - **st1** (HDD throughput, big data), **sc1** (cold HDD, cheapest).
- **Auto Scaling policies**: Target Tracking (dễ nhất), Step, Simple, Scheduled, Predictive (ML).
- **Lifecycle hooks**: pending:wait, terminating:wait → chạy script trước khi instance vào service/hủy.
- **Warm Pool**: pre-initialized instance, giảm scale-out time.

### Deep dive ELB
| | ALB | NLB | GLB |
|--|-----|-----|-----|
| Layer | 7 | 4 | 3 |
| Protocol | HTTP/HTTPS/gRPC/WS | TCP/UDP/TLS | IP (GENEVE) |
| Static IP | Không (DNS) | **Có + EIP** | - |
| SSL termination | Có | TLS passthrough/terminate | - |
| Routing | path/host/header/query | port | - |
| WAF | ✅ | ❌ | ❌ |
| Use case | Web, microservice | Game, IoT, extreme perf | Third-party firewall |

### Deep dive Decoupling
| Service | Model | Order | Retry | Giá |
|---------|-------|-------|-------|-----|
| **SQS Standard** | Queue | No | Có (visibility timeout) | $0.40/M |
| **SQS FIFO** | Queue | Yes, exactly-once | Có | $0.50/M, max 300/s |
| **SNS** | Pub-sub | No (FIFO có) | Retry + DLQ | $0.50/M publish |
| **EventBridge** | Event bus | Schema, 20 target/rule | Retry 24h | $1/M |
| **Step Functions** | Workflow | Express vs Standard | Built-in | Standard $25/M transition |
| **Kinesis Data Stream** | Stream shards | Per shard | Consumer tự quản | $0.015/shard/h |
| **Kinesis Firehose** | Delivery | - | Auto | $0.029/GB |
| **MSK (Kafka)** | Kafka managed | Partition | Consumer tự quản | broker/h |

### Lưu ý khi thi
- **SQS visibility timeout** hết mà consumer chưa delete → message visible lại → bị xử 2 lần. Chỉnh timeout > xử lý time.
- **SQS delay queue** max 15 phút. **Long polling** `ReceiveMessageWaitTimeSeconds=20` → giảm cost, giảm empty poll.
- **SNS FIFO** chỉ deliver đến SQS FIFO hoặc HTTPS.
- **Step Functions Standard** up to 1 năm, **Express** up to 5 phút, high-volume, at-least-once.
- **Lambda concurrency limit** 1000/region default, reserved concurrency giữ slot, provisioned concurrency giảm cold start (có phí).

### Lưu ý khi đi làm
- Mọi message queue phải có **DLQ** + alarm on `ApproximateNumberOfMessagesVisible > 0` hoặc DLQ > 0.
- Idempotent consumer (kiểm tra message ID) luôn là best practice.
- ASG: dùng **Target Tracking CPU 60%** là điểm khởi đầu an toàn, scale-in cooldown ít nhất 5 phút.

→ [lessons/12-autoscaling-elb.md](../lessons/12-autoscaling-elb.md), [lessons/13-decoupling.md](../lessons/13-decoupling.md)

---

## Tuần 5–6 — Storage & Database Design

### Deep dive S3 patterns
- **Multipart upload** bắt buộc cho object > 5GB, khuyên cho > 100MB. Nhớ bật **lifecycle AbortIncompleteMultipartUpload** để không tốn tiền orphan parts.
- **Transfer Acceleration**: upload qua Edge → Region, cho user xa, thêm phí.
- **S3 Select** / **Glacier Select**: query SQL trên single object (CSV/JSON/Parquet), giảm network.
- **Presigned URL**: tạm thời, upload/download có quyền user tạo URL.
- **Event Notifications** → SQS/SNS/Lambda/EventBridge.
- **Replication**: CRR (cross-region), SRR (same-region). Phải bật **versioning** 2 bên.
- **Object Lock**: WORM compliance (Governance/Compliance mode). Retention + Legal Hold.
- **Requester Pays**: người gọi trả bandwidth thay owner.
- **Access Points** + **Multi-Region Access Point**: đơn giản hoá policy multi-bucket.

### Deep dive RDS vs Aurora
| | RDS Multi-AZ | RDS Read Replica | Aurora |
|--|-------------|------------------|--------|
| Mục đích | HA failover | Scale read | HA + scale + auto-grow storage |
| Replication | Sync | Async | Sync tới 15 replica |
| Failover | 60–120s | Manual promote | < 30s |
| Cross-region | Không (RDS) | Có | **Global Database** RPO 1s RTO < 1 phút |
| Storage | Manual resize | Manual | Auto-scale 10GB → 128TB |

### Deep dive DynamoDB
- **Primary Key**: Partition Key (PK) hoặc PK+SK composite.
- **GSI** (Global Secondary Index): PK/SK khác, throughput riêng, eventual consistent, có thể tạo sau.
- **LSI** (Local Secondary Index): **same PK, different SK**, phải tạo khi tạo table, max 5.
- **DAX**: cache microsecond, cluster in-VPC, read-through/write-through.
- **Streams** + Lambda trigger: CDC.
- **Transactions**: 2x WCU/RCU cost.
- **On-Demand** vs **Provisioned** (+ Auto Scaling).
- **Global Tables**: multi-region active-active, eventual consistency.
- **TTL**: xóa item tự động, free.
- **Backup**: On-demand snapshot, PITR 35 ngày.

### Lưu ý khi thi
- DynamoDB design: **tối đa hoá partition distribution**, tránh hot partition. Đừng chọn timestamp làm PK.
- Aurora Serverless v2 → workload bursty không biết trước pattern.
- **ElastiCache Redis** HA: cluster mode enabled (shard) hoặc cluster mode disabled (1 primary + replica). Memcached không HA.
- Redshift: **RA3 nodes** tách compute-storage, **Concurrency Scaling** free 1h/day, **AQUA** accelerator.

### Lưu ý khi đi làm
- **RDS Proxy**: pool connection, dùng khi Lambda mở nhiều kết nối → bắt buộc, giảm overhead DB.
- Bật **Performance Insights** + **Enhanced Monitoring** cho RDS prod.
- Luôn tag DB + set **deletion protection + final snapshot**.
- DynamoDB: thiết kế **single-table design** (Rick Houlihan pattern) cho app phức tạp — khác hẳn RDBMS.

→ [lessons/14-storage-design.md](../lessons/14-storage-design.md), [lessons/15-db-design.md](../lessons/15-db-design.md)

---

## Tuần 7–8 — Networking nâng cao

### Deep dive VPC
- **CIDR**: /16 (65k IP) cho VPC, /24 (256) cho subnet phổ biến. AWS reserve **5 IP** mỗi subnet (.0, .1, .2, .3, .255).
- **Public subnet** = route 0.0.0.0/0 → IGW. **Private** = route 0.0.0.0/0 → NAT GW. **Isolated** = không có default route ra Internet.
- **NAT Gateway**: AZ-specific, HA → 1 per AZ. Băng thông 5–100 Gbps auto-scale.
- **VPC Peering**: 1-1, không transitive, không overlap CIDR.
- **Transit Gateway**: hub-spoke multi-VPC + multi-account + on-prem (DX/VPN). Scale ~5000 VPC.
- **VPC Endpoint**:
  - **Gateway** (S3, DynamoDB): free, route table entry.
  - **Interface** (PrivateLink): ENI trong subnet, **$0.01/h + $0.01/GB**.
- **VPC Flow Logs**: → CloudWatch Logs/S3/Firehose. Level VPC/subnet/ENI.
- **IPv6**: dual stack, egress-only IGW cho private out.

### Deep dive Direct Connect vs VPN
| | Site-to-Site VPN | Direct Connect |
|--|------------------|----------------|
| Medium | Internet (IPsec) | Private fiber (partner) |
| Setup | Phút | Tuần–tháng |
| Bandwidth | ~1.25 Gbps/tunnel | 1/10/100 Gbps |
| Latency | Biến động | Ổn định, thấp |
| Encrypt | Có (IPsec) | **Không** (trừ khi + MACsec hoặc VPN over DX) |
| Cost | Rẻ | Đắt, + port fee |
| Backup | - | Thường có VPN backup |

### Deep dive Route 53
- 7 routing policy: Simple, Weighted, Latency, Failover, Geolocation (theo quốc gia user), Geoproximity (bias khoảng cách), Multi-value (up to 8 healthy records).
- **Alias record**: point tới AWS resource (ALB, CloudFront, S3), **free query**, hỗ trợ apex (zone root).
- **Health check**: HTTP/HTTPS/TCP, calculated (combine), CloudWatch alarm.
- **Private Hosted Zone**: resolve trong VPC.
- **Resolver**: inbound endpoint (on-prem query AWS), outbound (AWS query on-prem).

### Deep dive CloudFront
- **Origin**: S3, ALB/EC2, MediaPackage, custom HTTP.
- **OAC** (Origin Access Control, mới, dùng SigV4, hỗ trợ KMS SSE-KMS) thay **OAI** (deprecated).
- **Cache policy + Origin request policy + Response headers policy** — decouple từ 2022.
- **Signed URL** (1 user) vs **Signed Cookie** (nhiều file).
- **Lambda@Edge** (Node/Python, 4 trigger, chạy Regional edge) vs **CloudFront Functions** (JS nhẹ, viewer request/response, µs, rẻ).
- **Price class**: All / 200 (không SA/AU/NZ) / 100 (US+EU) — giảm chi phí nếu user chỉ ở vài region.

### Lưu ý khi thi
- Low latency **global** cho app **TCP/UDP dynamic** (game, IoT) → **Global Accelerator** (anycast IP, AWS backbone). Static content + cache → **CloudFront**.
- Private connection **AWS service** từ VPC → **Interface Endpoint**.
- Expose **your service** cho other VPC → **PrivateLink (VPC endpoint service)** qua NLB.
- Hybrid DNS: on-prem resolve `*.aws.internal` qua **Route 53 Resolver inbound endpoint**.

### Lưu ý khi đi làm
- VPC CIDR tránh overlap ngay từ đầu, tính cả future peering/TGW. **Không dùng 10.0.0.0/16** cho mọi VPC.
- Bật **VPC Flow Logs** level REJECT → detect security issue, giá rẻ.
- Dùng **Transit Gateway** từ ≥ 5 VPC. Dưới thì peering OK.
- Direct Connect luôn + **backup VPN**. SLA DX 99.9% không đủ cho prod mission-critical nếu không có backup.

→ [lessons/16-networking.md](../lessons/16-networking.md), [lessons/17-route53-cloudfront.md](../lessons/17-route53-cloudfront.md)

---

## Tuần 9 — Resilience, DR & Monitoring

### DR strategies (RPO/RTO)
| Strategy | RPO | RTO | Cost |
|----------|-----|-----|------|
| **Backup & Restore** | Hours | Hours | $ |
| **Pilot Light** | Minutes | 10s of minutes | $$ |
| **Warm Standby** | Seconds | Minutes | $$$ |
| **Multi-Site Active/Active** | ~0 | ~0 | $$$$ |

### Pattern Multi-Region HA
- Route 53 **Failover** + health check.
- S3 **CRR** + **Multi-Region Access Point**.
- **Aurora Global Database**: RPO 1s, RTO < 1 phút, 5 region read.
- **DynamoDB Global Tables**: active-active, last-writer-wins.
- **Lambda**: deploy cả 2 region + API GW Regional + Route 53.
- **Compute backup**: AMI copy cross-region, EBS snapshot copy.

### Monitoring deep
- **CloudWatch Metrics**: basic (5 min free), detailed (1 min, phí). Custom metric $0.30/metric/tháng.
- **CloudWatch Alarms**: threshold, composite (logic AND/OR), anomaly detection.
- **CloudWatch Logs**: retention configurable 1 ngày – vĩnh viễn, default vĩnh viễn (đắt!). Subscription filter → Firehose/Lambda.
- **Logs Insights**: SQL-like query, per-GB scanned.
- **CloudWatch Agent**: in-guest metrics (RAM, disk, custom log).
- **CloudTrail**: Management events free (90 ngày trong console). Data events (S3 object, Lambda invoke) trả phí, cực nhiều.
- **Config**: per resource type + evaluation. Rules pricing per evaluation.
- **X-Ray**: distributed tracing, sampling rule.
- **ServiceLens + Synthetics**: canary check từ Edge.

### Lưu ý khi đi làm
- Đừng để **Log retention = Never Expire** default → cost tăng âm thầm.
- Alarm phải có **action** cụ thể (SNS → PagerDuty/Slack), không để alarm cho đẹp.
- **Backup Vault + AWS Backup** quản lý centrally RDS, EBS, EFS, DynamoDB, Aurora, FSx, Storage Gateway.

→ [lessons/18-dr-ha.md](../lessons/18-dr-ha.md)

---

## Tuần 10 — Cost Optimization & Well-Architected

### Well-Architected 6 pillars
1. **Operational Excellence** — IaC, CI/CD, runbook, game day.
2. **Security** — least privilege, defense in depth, encrypt.
3. **Reliability** — HA multi-AZ, backup, test DR.
4. **Performance Efficiency** — đúng service đúng nhu cầu.
5. **Cost Optimization** — right-size, mua đúng pricing model.
6. **Sustainability** (thêm 2021) — efficient, Graviton, Spot.

### Cost deep dive
- **Compute Savings Plan** (1/3y, áp EC2+Fargate+Lambda, flexible) > **EC2 Instance SP** (family-specific) > **RI** (specific).
- **Spot Fleet / Capacity-optimized** → ít bị interrupt.
- **S3 Intelligent-Tiering**: tự động chuyển class, phí monitoring $0.0025/1000 object.
- **S3 Storage Lens**: insight cost toàn org.
- **Data transfer** (trap hàng đầu):
  - Cross-AZ **tính cả 2 chiều** $0.01/GB.
  - ALB/NLB cross-zone LB: NLB mặc định tắt (có thể tính cross-AZ phí), ALB mặc định bật (no charge).
  - **VPC Endpoint** tránh NAT cost.
- **Compute Optimizer** + **Trusted Advisor** + **Cost Anomaly Detection** — free (Compute Optimizer enhanced có phí).
- **Budgets Actions**: tự IAM deny/stop EC2 khi vượt budget.

### Lưu ý khi đi làm
- **FinOps**: tag chuẩn + CUR + Athena query + QuickSight dashboard.
- Right-size định kỳ hàng quý. Instance trung bình usage < 20% → down-size.
- Lưu log lâu dài: CloudWatch Logs → Firehose → S3 lifecycle Glacier Deep Archive.

→ [lessons/19-cost-optimization.md](../lessons/19-cost-optimization.md)

---

## Tuần 11–12 — Scenario drilling & Mock exam

- [ ] Làm **5 bộ practice exam** (Tutorials Dojo SAA 6 bộ là chuẩn vàng).
- [ ] Mỗi câu sai → ghi vào Anki/flashcard + map về concept gốc.
- [ ] Vẽ lại **10 reference architecture** từ [aws.amazon.com/architecture](https://aws.amazon.com/architecture/): serverless web, 3-tier, data lake, ML pipeline, hybrid DR, multi-region active-active, IoT, real-time analytics, microservices EKS, SaaS multi-tenant.
- [ ] Target: **≥ 80%** 3 mock liên tiếp (ghi nhớ Tutorials Dojo thường **khó hơn exam thật**).

### Tài nguyên (ưu tiên)
- **Stephane Maarek Udemy SAA-C03** (~$15 sale) — best seller.
- **Adrian Cantrill SAA-C03** (paid, ~$40) — deep nhất, có lab.
- **Tutorials Dojo Practice Exam SAA-C03** (~$15) — MUST have.
- **Neal Davis AWS Certified SA Associate** — alternative.
- **AWS Whitepapers BẮT BUỘC**:
  - *AWS Well-Architected Framework*
  - *Reliability Pillar*
  - *Security Pillar*
  - *Operational Excellence Pillar*
  - *AWS Disaster Recovery whitepaper*
- **AWS re:Invent YouTube**: tìm các talk "Deep Dive on ..." hoặc "Best Practices for ...".

### Checklist sẵn sàng thi
- [ ] Thiết kế 3-tier HA multi-AZ trong 5 phút trên giấy.
- [ ] Giải thích khi nào chọn SQS vs SNS vs EventBridge vs Kinesis.
- [ ] Vẽ pattern multi-region DR cho 4 strategy.
- [ ] So sánh 3 loại load balancer + 7 routing policy Route 53.
- [ ] Biết 5 cách kết nối hybrid (VPN, DX, DX+VPN, TGW, Cloud WAN).
- [ ] Phân biệt 7 storage class S3 + khi nào Glacier Instant vs Flexible vs Deep.
- [ ] Giải thích IAM policy evaluation với SCP + Boundary + Resource policy.
- [ ] ≥ 80% 3 Tutorials Dojo mock liên tiếp.

---

## Sau khi đậu SAA — hướng đi tiếp
- **DVA-C02** (Developer Associate) — sâu về Lambda, DynamoDB, API GW, SAM/CDK.
- **SOA-C02** (SysOps Associate) — khó nhất associate, có lab thực hành.
- **SAP-C02** (Solutions Architect Professional) — 75 câu, 3h, multi-account enterprise scale.
- **Specialty**: Security, Networking, Database, ML, Data Analytics, SAP.

### Lời khuyên thực chiến
1. **SAA chỉ là điểm bắt đầu**. Đừng tưởng pass xong biết làm AWS — mới chỉ biết **tên service + pattern**.
2. Làm side project thật: deploy 1 app production-grade, thiết lập IaC (Terraform/CDK), CI/CD (CodePipeline/GHA), observability (CW + X-Ray).
3. Đọc kỹ **AWS re:Post**, **AWS Blog**, **AWS Architecture Center** hàng tuần.
4. Tham gia **AWS Community Builder** hoặc local meetup để cập nhật.
