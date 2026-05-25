# SAA Ch2.1 — Compute Performance & Autoscaling

> Mục tiêu: Chọn đúng **compute primitive** (EC2 / Lambda / Fargate / Batch / EKS) cho workload, hiểu instance family đủ để đi thi, và design autoscaling không bị bẫy "scale chậm hơn traffic".

Tiền đề: [[foundations-01-cap-theorem]], [[foundations-06-failure-modes]] (đặc biệt cascading failure khi autoscale chậm), CLF [[04-ec2]].

---

## 1. Câu chuyện mở đầu — "App của tôi chậm, tăng instance đi"

Engineer mới hay trả lời "scale-out" cho mọi vấn đề performance. Sự thật phũ phàng:

- Bottleneck ở **DB** → thêm 100 EC2 chỉ làm DB chết nhanh hơn.
- Bottleneck ở **single-threaded code** → CPU x2 không giúp, vì chỉ 1 core dùng được.
- Bottleneck ở **network egress** → instance to hơn = bandwidth to hơn, nhưng phải đúng family (`n` cho network).
- Bottleneck ở **disk IOPS** → cần `i` family hoặc EBS gp3/io2, không phải "instance to hơn".

**Quy tắc 0**: trước khi scale, **profile**. CloudWatch metrics, X-Ray, top/iostat trên host. Biết chính xác chỗ nghẽn ở đâu rồi chọn lời giải.

---

## 2. Spectrum compute trên AWS

Từ "thấp tay can thiệp ít" đến "rất ít can thiệp":

| Service | Bạn quản lý | AWS quản lý | Use case |
|---------|-------------|-------------|----------|
| **EC2** | OS, patch, runtime, app | Hardware, hypervisor | Workload custom OS, kernel module, GPU heavy |
| **EKS (self-managed nodes)** | Node OS, K8s app | Control plane | K8s ecosystem, multi-cloud portability |
| **EKS Fargate / ECS Fargate** | Container image, task def | Node, OS, scaling | Container không lo node |
| **ECS on EC2** | Container, EC2 fleet | ECS orchestration | Container + cần control instance |
| **Lambda** | Code + dependencies | Mọi thứ khác | Event-driven, ngắn (< 15 phút), spiky traffic |
| **App Runner** | Container/repo | Build, deploy, scale | Web app/API không lo infra |
| **Batch** | Job definition | Compute environment, queueing | HPC, ML training, render farm |
| **Lightsail** | App | Mọi thứ | Hobby, prototype |

### Quy tắc chọn nhanh

| Tình huống | Chọn |
|------------|------|
| Workload chạy < 15 phút, event-driven, spiky | **Lambda** |
| Container, không muốn quản node | **Fargate** (ECS hoặc EKS) |
| Cần GPU / custom kernel / Windows GUI | **EC2** |
| Đã có K8s manifest, team biết K8s | **EKS** |
| Batch jobs xếp hàng, scale theo queue | **Batch** |
| Simple web app, không quan tâm "đúng AWS way" | **App Runner / Lightsail** |
| Cần tận dụng spot tiết kiệm 70-90% | **EC2 spot / Fargate spot / Batch spot** |

---

## 3. EC2 instance families — chỉ học theo logic, không học vẹt

Naming: `c7g.xlarge` = **family (c)** + **generation (7)** + **modifier (g)** + **size (xlarge)**.

| Family | Tối ưu cho | Khi nào dùng |
|--------|-----------|--------------|
| **T** (t3, t4g) | Burstable, baseline CPU thấp | Dev, low traffic web, microservice idle phần lớn thời gian |
| **M** (m6i, m7g) | General purpose, cân bằng CPU/RAM | App server mặc định, "không biết chọn gì thì M" |
| **C** (c6i, c7g) | Compute optimized, CPU/RAM cao | Batch CPU-heavy, gaming server, video encoding, HPC |
| **R** (r6i, r7g) | Memory optimized | DB, in-memory cache, Spark, large JVM heap |
| **X** (x2idn) | Cực kỳ memory | SAP HANA, in-memory DB rất lớn |
| **I** (i4i) | Storage IOPS (NVMe local) | NoSQL local, transactional DB cần IOPS cực cao |
| **D** (d3) | Storage dung lượng (HDD local) | Hadoop, data lake distributed |
| **H** (h1) | HDD throughput | MapReduce |
| **P, G** (p4, g5) | GPU | ML training (P), inference / graphics (G) |
| **Inf** (inf2) | AWS Inferentia | ML inference cheap |
| **Trn** (trn1) | AWS Trainium | ML training cheap |
| **F** (f1) | FPGA | Genomics, financial modeling |
| **HPC** (hpc7g) | HPC tightly-coupled | CFD, weather, EFA networking |

### Modifier hay gặp

- **g** — Graviton (ARM, ~20-40% rẻ hơn cùng perf cho code tương thích).
- **i** — Intel.
- **a** — AMD.
- **n** — Network optimized (bandwidth cao hơn).
- **d** — Có NVMe instance store.
- **e** — Memory extended.
- **z** — High frequency CPU (single-thread perf).

> 💡 **Graviton lesson**: nếu app là Java/Python/Go/Node và không có native lib x86-specific → thử m7g trước m7i, thường rẻ 20% + perf bằng/cao hơn. Nhiều câu thi SAA hint "cost-optimized" + "compatible workload" → đáp án Graviton.

### Sizing — đừng over-provision

- `xlarge` = 4 vCPU, 16GB (cho M family).
- Mỗi step lên size = x2 mọi thứ. `2xlarge` = 8 vCPU, 32GB.
- **Quy tắc**: bắt đầu nhỏ, scale-out trước scale-up. Trừ khi workload memory-bound hoặc single-threaded.

---

## 4. EC2 purchase options

| Option | Discount | Commitment | Use case |
|--------|----------|------------|----------|
| **On-demand** | 0% | Không | Spike, dev, không dự đoán được |
| **Reserved Instance (RI)** | Up to 72% | 1-3 năm | Baseline ổn định, dùng 24/7 |
| **Savings Plan** (Compute) | Up to 66% | 1-3 năm | Linh hoạt EC2/Lambda/Fargate, theo $/hour commitment |
| **Spot** | Up to 90% | Không (2 phút warning) | Stateless, fault-tolerant, batch, ML training |
| **Dedicated Host** | — | Khác | Compliance, BYOL Windows/Oracle |
| **Capacity Reservation** | 0% (giá on-demand) | — | Đảm bảo có capacity trong AZ specific |

> 🪤 Bẫy thi: "Cần baseline + spike" → đáp án **Savings Plan cho baseline + Spot/On-demand cho spike**, không phải RI cho cả tổng. RI lock instance type cụ thể; Compute Savings Plan linh hoạt hơn.

### Spot kỹ thuật

- 2-phút interruption notice qua instance metadata.
- Phải design **stateless**, có graceful shutdown handler.
- **Spot Fleet** / **Capacity Optimized** allocation strategy — chọn pool ít nguy cơ interrupt nhất.
- **Spot Blocks** đã bị retire 2021. Đừng đề cập trong câu trả lời.
- Best practice: mix Spot + On-demand qua **Mixed Instances Policy** trong ASG.

---

## 5. Autoscaling — không phải "bật là chạy"

### 5.1 Loại autoscaling

| Loại | Đối tượng | Trigger |
|------|-----------|---------|
| **EC2 Auto Scaling Group (ASG)** | EC2 fleet | CloudWatch metric, schedule, predictive |
| **Application Auto Scaling** | ECS service, DynamoDB, Aurora replica, SageMaker… | Target tracking, step, scheduled |
| **Lambda concurrency** | Lambda function | Provisioned concurrency, reserved concurrency |
| **K8s HPA / VPA / Cluster Autoscaler / Karpenter** | EKS pods/nodes | Metric server, custom metrics |

### 5.2 Policy types (ASG)

| Policy | Cách hoạt động | Khi dùng |
|--------|----------------|----------|
| **Target tracking** | Giữ metric ở mức target (vd CPU 60%) | Default — đơn giản, hiệu quả 80% case |
| **Step scaling** | Tăng N instance khi metric vượt ngưỡng, M instance khi vượt cao hơn | Cần phản ứng theo độ nghiêm trọng |
| **Simple scaling** | + N instance khi alarm | Legacy, không khuyên dùng nữa |
| **Scheduled** | Theo cron | Traffic pattern biết trước (vd 9h sáng) |
| **Predictive** | ML predict, scale trước | Daily/weekly seasonal pattern |

### 5.3 Tại sao scale-out thường chậm

Chuỗi thời gian khi ASG launch instance mới:

1. Alarm fire (CloudWatch period min 1 phút) — **60s**.
2. ASG quyết định, gọi RunInstances — **vài giây**.
3. EC2 launch + boot OS — **30-90s**.
4. User-data, app bootstrap, warm cache — **30-300s**.
5. Health check pass, vào target group — **30-90s**.

**Tổng: 3-10 phút** từ lúc traffic tăng đến lúc có capacity. Trong khi đó các instance hiện có chịu trận.

### 5.4 Mitigation

- **Pre-warm**: scale trước bằng scheduled hoặc predictive.
- **Warm pool**: ASG giữ instance ở trạng thái stopped/hibernated, start nhanh hơn launch mới.
- **Smaller, more instances** thay vì big instance ít: scale-out granular hơn.
- **Faster bootstrap**: AMI có sẵn app (immutable infra), không apt-install ở user-data.
- **Container/Lambda**: scale tính bằng giây, không phút.

### 5.5 Lambda concurrency

- **Cold start**: lần đầu invoke / sau idle → tốn 100-1000ms tùy runtime + package size.
- **Provisioned concurrency**: giữ N execution environment "warm", không cold start. Tốn tiền theo giờ.
- **Reserved concurrency**: giới hạn max concurrent → vừa bảo vệ downstream (DB), vừa đảm bảo function khác không hết quota.
- **SnapStart** (Java/Python/.NET): snapshot init state, restore nhanh → giảm cold start ~10x.

> 🪤 Bẫy thi: "Lambda cần latency p99 < 100ms cho first request" → **Provisioned concurrency** (hoặc SnapStart). Reserved concurrency không giải quyết cold start.

---

## 6. Performance — không chỉ là "to hơn"

### 6.1 Enhanced Networking
- **ENA (Elastic Network Adapter)**: tới 100 Gbps. Default cho most modern families.
- **EFA (Elastic Fabric Adapter)**: low latency, dùng cho HPC tightly-coupled (MPI).
- **DPDK / SR-IOV**: kernel bypass cho cực low latency.

### 6.2 Placement Groups

| Type | Layout | Use case |
|------|--------|----------|
| **Cluster** | Cùng rack, low latency | HPC, MPI |
| **Spread** | Khác rack/AZ, max 7/AZ | High availability cho ít instance critical |
| **Partition** | Group thành partition, mỗi partition khác rack | Distributed (Hadoop, Kafka, Cassandra) |

### 6.3 NUMA, hyperthreading
- Instance to (vd `r6i.32xlarge`) có nhiều NUMA node → cần app aware.
- Có thể tắt hyperthreading qua CPU options nếu app benchmark tốt hơn với physical core.

### 6.4 AMI optimization
- Custom AMI với app baked sẵn → bootstrap < 30s thay vì 5 phút.
- **EC2 Image Builder** để automate AMI pipeline.

---

## 7. Container performance

### 7.1 ECS vs EKS quick

| Khía cạnh | ECS | EKS |
|-----------|-----|-----|
| Control plane | AWS-native, free | $0.10/h per cluster |
| Learning curve | Thấp | Cao (K8s ecosystem) |
| Portable | AWS-only | Multi-cloud |
| Service mesh | App Mesh | Istio/Linkerd/App Mesh |
| Best for | Team AWS-first | Team đã có K8s skill |

### 7.2 Fargate vs EC2 launch type

| Khía cạnh | Fargate | EC2 |
|-----------|---------|-----|
| Manage node | Không | Có |
| Pricing | Per vCPU/GB-hour task | Per EC2-hour |
| Daemon set (logging agent on every node) | Khó (chạy per-task) | Dễ |
| Spot | Fargate Spot có | EC2 Spot |
| Cold start | Vài giây | Đã chạy → ~0 |
| GPU | Không | Có |

> 💡 Quy tắc: workload nhỏ-medium, traffic thay đổi → Fargate. Workload lớn 24/7, cần GPU/customize OS → EC2.

### 7.3 Scaling container

- **Service Auto Scaling** (Application Auto Scaling): target CPU/memory, hoặc custom metric (queue depth).
- **Cluster Auto Scaler** (EKS): scale node khi pod pending.
- **Karpenter**: AWS replacement cho Cluster Autoscaler, chọn instance type tối ưu, scale-up nhanh hơn.

---

## 8. Ví dụ chọn compute cho 4 use case

### 8.1 E-commerce web tier, traffic peak 10x off-peak
- ALB + ASG EC2 (M family, Graviton) + Mixed Instances Policy (Spot + On-demand baseline).
- Target tracking CPU 60%. Warm pool 5 instance.
- Predictive scaling cho daily pattern.
- **Tránh**: Lambda nếu request stateful, latency-sensitive cold-start không chấp nhận.

### 8.2 Image resize API
- **Lambda** + S3 trigger. Provisioned concurrency nếu cần latency thấp.
- **Hoặc**: SQS + Fargate Spot nếu volume cao và batch được.
- Memory tune để optimize CPU (Lambda CPU scale với memory).

### 8.3 ML training, nhiều epoch, có thể resume
- **EC2 Spot** P/Trn family + checkpoint S3.
- Hoặc **SageMaker Training Job** với managed spot.
- EFS / FSx for Lustre cho dataset.

### 8.4 Microservice mesh, team đã quen K8s
- **EKS** với Karpenter cho node, Fargate cho workload nhỏ.
- HPA + KEDA cho event-driven scaling.

---

## 9. Cạm bẫy đề thi (SAA)

1. **"Auto Scaling Group đảm bảo zero downtime khi traffic spike"** → **Sai**. Scale-out mất phút. Cần warm pool / pre-scale / over-provision baseline.
2. **"Spot phù hợp cho production database"** → **Sai**. Spot interrupt 2-phút notice, DB stateful không thể recover trong 2 phút.
3. **"Reserved Instance để dành cho spike traffic"** → **Sai**. RI cho baseline ổn định. Spike dùng on-demand/Spot.
4. **"Lambda không có giới hạn concurrent"** → **Sai**. Default 1000/region, hard limit có thể tăng. Burst limit thấp hơn.
5. **"Larger instance = bandwidth lớn"** → **Đúng một phần**. Cần `n` family để bandwidth max, family thường có baseline + burst.
6. **"Provisioned concurrency tăng max throughput Lambda"** → **Sai**. PC giảm cold start, không tăng concurrency limit.
7. **"Fargate có GPU"** → **Sai** (tính đến 2024). Cần EC2 launch type.
8. **"Graviton compatible mọi workload"** → **Sai**. Native x86 binary, .NET Framework cũ, một số driver không chạy được.

---

## 10. Tóm tắt 1 dòng

> Profile trước, scale sau. Chọn compute primitive theo **stateful/stateless**, **latency tolerance**, **traffic shape**. Autoscaling cần thời gian — design để baseline đủ chịu burst trong lúc scale-out, hoặc dùng compute scale tính bằng giây (Lambda/Fargate).

---

## 11. Bài tập tự kiểm tra

1. Web app traffic ổn định 100 req/s, spike 1000 req/s lúc 9h sáng mỗi ngày. Design compute + autoscaling như thế nào? (Liệt kê EC2 type, purchase option, scaling policy.)
2. Lambda function p99 latency 3s, target 200ms. Đã tune memory, code optimal. Lựa chọn gì tiếp?
3. ML training job 8h, có thể resume từ checkpoint. Chọn compute và purchase option nào, vì sao?
4. Team muốn migrate Java service từ m5.xlarge sang Graviton. Cần check gì trước khi migrate? (≥3 thứ)
5. Workload HPC simulation, 100 node MPI tightly-coupled. Chọn instance family, networking, placement group?
6. ASG scale-out mất 5 phút, traffic spike 10x trong 30s. Liệt kê 4 cách giảm thời gian phản ứng (không phải "tăng baseline 10x").

---

## 12. Đọc thêm

- AWS Whitepaper — *AWS Well-Architected Performance Pillar*.
- AWS Builder's Library — *Workload isolation using shuffle sharding*, *Going faster with continuous delivery*.
- AWS docs — *EC2 instance types* (full matrix), *Auto Scaling user guide*.
- *Lambda Power Tuning* tool (Alex Casalboni) — optimize memory/cost.

---

**Bài tiếp theo**: [[ch2-02-storage-performance]] — EBS gp3 vs io2, S3 throughput, EFS performance modes, FSx variants.
