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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 250" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Timeline scale-out của Auto Scaling Group — vì sao mất 3-10 phút</title>
  <desc>Chuỗi thời gian từ trái sang phải khi ASG thêm instance mới: alarm fire khoảng 60 giây, gọi RunInstances vài giây, boot OS 30 đến 90 giây, bootstrap app 30 đến 300 giây, health check vào target group 30 đến 90 giây — tổng cộng 3 đến 10 phút.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">Scale-out ASG: traffic tăng → có capacity = 3-10 phút</text>
  <line x1="24" y1="120" x2="700" y2="120" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="24" y="146" font-size="10.5" fill="currentColor" opacity="0.65">0s</text>
  <text x="690" y="146" font-size="10.5" text-anchor="end" fill="currentColor" opacity="0.65">~10 phút →</text>
  <g>
    <rect x="24" y="64" width="92" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <circle cx="35" cy="120" r="5" fill="#3b82f6"/>
    <line x1="70" y1="104" x2="70" y2="120" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="70" y="80" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Alarm fire</text>
    <text x="70" y="95" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">~60s</text>
  </g>
  <g>
    <rect x="124" y="64" width="86" height="40" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <line x1="167" y1="104" x2="167" y2="120" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="167" y="80" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">RunInstances</text>
    <text x="167" y="95" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">vài giây</text>
  </g>
  <g>
    <rect x="218" y="64" width="120" height="40" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <line x1="278" y1="104" x2="278" y2="120" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="278" y="80" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Boot OS</text>
    <text x="278" y="95" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">30-90s</text>
  </g>
  <g>
    <rect x="346" y="64" width="200" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <line x1="446" y1="104" x2="446" y2="120" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="446" y="80" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Bootstrap app · warm cache</text>
    <text x="446" y="95" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">30-300s (lâu nhất)</text>
  </g>
  <g>
    <rect x="554" y="64" width="146" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <line x1="627" y1="104" x2="627" y2="120" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="627" y="80" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Health check → TG</text>
    <text x="627" y="95" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">30-90s</text>
  </g>
  <g>
    <rect x="24" y="172" width="676" height="48" rx="9" fill="#f59e0b" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="40" y="192" font-size="11.5" font-weight="700" fill="currentColor">Trong suốt 3-10 phút này, instance hiện có "chịu trận"</text>
    <text x="40" y="209" font-size="10.5" fill="currentColor" opacity="0.72">→ Pre-warm / warm pool / AMI baked sẵn / container-Lambda để cắt thời gian (mục 5.4).</text>
  </g>
</svg>

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

## 6. Lambda — bảng giới hạn cứng phải thuộc

Rất nhiều câu SAA không hỏi "Lambda là gì", mà hỏi **"kiến trúc này có nhét vừa Lambda không"**. Muốn trả lời được thì phải nhớ các trần cứng dưới đây — phần lớn **không xin tăng được**.

| Chiều | Giá trị | Ý nghĩa khi thiết kế |
|-------|---------|----------------------|
| **Memory** | 128 MB → 10.240 MB (bước 1 MB) | Cũng là núm chỉnh CPU (xem 6.1) |
| **vCPU** | Tỉ lệ tuyến tính theo memory; đủ **~1 vCPU quanh mốc 1.769 MB**, tối đa ~6 vCPU ở 10.240 MB | Không có setting CPU riêng — muốn nhanh hơn thì tăng memory |
| **Timeout** | Tối đa **15 phút** (900 giây), mặc định 3 giây | Job dài hơn → Batch / ECS / Step Functions |
| **Ephemeral storage `/tmp`** | **512 MB** mặc định, cấu hình được tới **10.240 MB** | Chỉ là scratch, mất khi environment bị thu hồi |
| **Payload sync (request/response)** | **6 MB** mỗi chiều | File lớn → ghi S3 và trả **presigned URL** |
| **Payload async (event)** | **256 KB** | Trùng đúng giới hạn message SQS/SNS — không phải ngẫu nhiên |
| **Deployment package .zip upload trực tiếp** | **50 MB** | Lớn hơn thì upload qua S3 |
| **Deployment package giải nén** | **250 MB** (tính cả layer) | Tối đa **5 layer**/function, đều nằm trong 250 MB này |
| **Container image** | **10 GB** | Đường thoát khi dependency quá nặng cho zip |
| **Environment variables** | 4 KB tổng | Config lớn → SSM Parameter Store / Secrets Manager |
| **Concurrency mặc định** | 1.000 concurrent/Region (tăng được qua quota) | Burst tức thời thấp hơn trần này (xem 5.5) |

### 6.1 Memory là núm CPU — nghịch lý "tăng RAM lại rẻ hơn"

Lambda không cho chọn vCPU. Ở 128 MB function chỉ nhận một phần rất nhỏ của 1 vCPU; tới **~1.769 MB** mới đủ **một vCPU trọn vẹn**; trên nữa thì có nhiều vCPU nhưng chỉ hữu ích nếu code **đa luồng** (thread pool Java, goroutine, `sharp`/libvips). Code single-threaded thuần thì vượt 1.769 MB gần như không nhanh thêm — chỉ tốn tiền.

Hệ quả về chi phí: function CPU-bound chạy 10 giây ở 512 MB có thể chỉ mất ~2,5 giây ở 2.048 MB. Giá GB-giây x4 nhưng thời gian /4 → hoà tiền mà latency tốt hơn 4 lần. Đó chính là lý do tồn tại của *Lambda Power Tuning* ở mục Đọc thêm.

> 🪤 Bẫy thi: "Lambda xử lý ảnh chậm, code đã tối ưu" → đáp án thường là **tăng memory** (vì CPU tăng theo), không phải "chuyển sang EC2".

### 6.2 Khi nào đề mô tả một workload mà Lambda là đáp án SAI

| Mô tả trong đề | Vì sao Lambda trượt | Chọn gì thay |
|----------------|---------------------|--------------|
| "Job chạy 2 giờ / ETL hàng đêm 45 phút" | Trần cứng 15 phút | **AWS Batch** (mục 9), ECS/Fargate task, Glue |
| "Cần GPU cho training / inference" | Lambda không có GPU | EC2 G/P, SageMaker, ECS on EC2 |
| "Cần giữ state trên đĩa giữa các request" | `/tmp` ephemeral, không chia sẻ giữa environment | EC2 + EBS; hoặc gắn **EFS** vào Lambda nếu chỉ cần shared POSIX |
| "API nhận/trả file 200 MB" | Payload sync 6 MB | S3 presigned URL |
| "Dependency 3 GB (model ML, CUDA)" | Zip giải nén 250 MB | **Container image** tới 10 GB, hoặc Fargate |
| "Phần mềm licensed theo socket/core vật lý" | Không kiểm soát host | EC2 Dedicated Host |
| "p99 phải < 20 ms, tải đều 24/7" | Cold start + không rẻ hơn khi luôn bận | ECS/EC2 chạy thường trực |

> Mẹo đọc đề: thấy con số thời lượng **> 15 phút** ở bất kỳ đâu → gạch ngay mọi option có Lambda. Đây là bộ lọc nhanh và đúng nhiều nhất của domain này.

---

## 7. Performance — không chỉ là "to hơn"

### 7.1 Enhanced Networking
- **ENA (Elastic Network Adapter)**: tới 100 Gbps. Default cho most modern families.
- **EFA (Elastic Fabric Adapter)**: low latency, dùng cho HPC tightly-coupled (MPI).
- **DPDK / SR-IOV**: kernel bypass cho cực low latency.

### 7.2 Placement Groups

| Type | Layout | Use case |
|------|--------|----------|
| **Cluster** | Cùng rack, low latency | HPC, MPI |
| **Spread** | Khác rack/AZ, max 7/AZ | High availability cho ít instance critical |
| **Partition** | Group thành partition, mỗi partition khác rack | Distributed (Hadoop, Kafka, Cassandra) |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Bố trí vật lý ba loại Placement Group: Cluster, Spread, Partition</title>
  <desc>So sánh ba loại placement group theo cách instance nằm trên rack. Cluster: mọi instance cùng một rack để latency thấp. Spread: mỗi instance trên một rack riêng để tránh cùng điểm hỏng. Partition: instance gom thành các partition, mỗi partition nằm trên rack khác nhau cho hệ phân tán.</desc>
  <text x="16" y="22" font-size="13.5" font-weight="700" fill="currentColor">Placement Groups — bố trí vật lý trên rack</text>
  <!-- CLUSTER -->
  <text x="120" y="50" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Cluster</text>
  <text x="120" y="65" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">cùng rack · low latency</text>
  <rect x="36" y="76" width="168" height="150" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="48" y="94" font-size="10" font-weight="700" fill="currentColor" opacity="0.8">Rack 1</text>
  <g fill="#3b82f6" fill-opacity="0.9">
    <rect x="56" y="104" width="56" height="26" rx="5"/>
    <rect x="128" y="104" width="56" height="26" rx="5"/>
    <rect x="56" y="140" width="56" height="26" rx="5"/>
    <rect x="128" y="140" width="56" height="26" rx="5"/>
    <rect x="56" y="176" width="56" height="26" rx="5"/>
    <rect x="128" y="176" width="56" height="26" rx="5"/>
  </g>
  <g fill="#fff" font-size="10" text-anchor="middle" font-weight="700">
    <text x="84" y="121">EC2</text><text x="156" y="121">EC2</text>
    <text x="84" y="157">EC2</text><text x="156" y="157">EC2</text>
    <text x="84" y="193">EC2</text><text x="156" y="193">EC2</text>
  </g>
  <text x="120" y="246" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">HPC, MPI — đổi HA lấy tốc độ</text>
  <!-- SPREAD -->
  <text x="360" y="50" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Spread</text>
  <text x="360" y="65" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">mỗi instance 1 rack/AZ</text>
  <g>
    <rect x="262" y="76" width="196" height="42" rx="7" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="272" y="92" font-size="9.5" font-weight="700" fill="currentColor" opacity="0.8">Rack A</text>
    <rect x="384" y="84" width="60" height="26" rx="5" fill="#10b981" fill-opacity="0.95"/>
    <text x="414" y="101" font-size="10" text-anchor="middle" font-weight="700" fill="#fff">EC2</text>
  </g>
  <g>
    <rect x="262" y="126" width="196" height="42" rx="7" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="272" y="142" font-size="9.5" font-weight="700" fill="currentColor" opacity="0.8">Rack B</text>
    <rect x="384" y="134" width="60" height="26" rx="5" fill="#10b981" fill-opacity="0.95"/>
    <text x="414" y="151" font-size="10" text-anchor="middle" font-weight="700" fill="#fff">EC2</text>
  </g>
  <g>
    <rect x="262" y="176" width="196" height="42" rx="7" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="272" y="192" font-size="9.5" font-weight="700" fill="currentColor" opacity="0.8">Rack C</text>
    <rect x="384" y="184" width="60" height="26" rx="5" fill="#10b981" fill-opacity="0.95"/>
    <text x="414" y="201" font-size="10" text-anchor="middle" font-weight="700" fill="#fff">EC2</text>
  </g>
  <text x="360" y="246" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">ít instance critical · max 7/AZ</text>
  <!-- PARTITION -->
  <text x="600" y="50" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Partition</text>
  <text x="600" y="65" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">mỗi partition 1 rack</text>
  <g>
    <rect x="502" y="76" width="196" height="46" rx="7" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="512" y="92" font-size="9.5" font-weight="700" fill="currentColor" opacity="0.8">Partition 1 · Rack X</text>
    <rect x="560" y="96" width="40" height="20" rx="4" fill="#8b5cf6" fill-opacity="0.95"/>
    <rect x="608" y="96" width="40" height="20" rx="4" fill="#8b5cf6" fill-opacity="0.95"/>
    <rect x="656" y="96" width="34" height="20" rx="4" fill="#8b5cf6" fill-opacity="0.95"/>
  </g>
  <g>
    <rect x="502" y="130" width="196" height="46" rx="7" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="512" y="146" font-size="9.5" font-weight="700" fill="currentColor" opacity="0.8">Partition 2 · Rack Y</text>
    <rect x="560" y="150" width="40" height="20" rx="4" fill="#8b5cf6" fill-opacity="0.95"/>
    <rect x="608" y="150" width="40" height="20" rx="4" fill="#8b5cf6" fill-opacity="0.95"/>
    <rect x="656" y="150" width="34" height="20" rx="4" fill="#8b5cf6" fill-opacity="0.95"/>
  </g>
  <g>
    <rect x="502" y="184" width="196" height="46" rx="7" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="512" y="200" font-size="9.5" font-weight="700" fill="currentColor" opacity="0.8">Partition 3 · Rack Z</text>
    <rect x="560" y="204" width="40" height="20" rx="4" fill="#8b5cf6" fill-opacity="0.95"/>
    <rect x="608" y="204" width="40" height="20" rx="4" fill="#8b5cf6" fill-opacity="0.95"/>
    <rect x="656" y="204" width="34" height="20" rx="4" fill="#8b5cf6" fill-opacity="0.95"/>
  </g>
  <text x="600" y="246" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">Hadoop, Kafka, Cassandra</text>
  <rect x="36" y="264" width="662" height="50" rx="9" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
  <text x="48" y="282" font-size="10.5" fill="currentColor" opacity="0.78">Đánh đổi: Cluster = nhanh nhưng cùng điểm hỏng · Spread = an toàn nhất, ít máy.</text>
  <text x="48" y="300" font-size="10.5" fill="currentColor" opacity="0.78">Partition = phân tán có kiểm soát, biết rack từng nhóm.</text>
</svg>

### 7.3 NUMA, hyperthreading
- Instance to (vd `r6i.32xlarge`) có nhiều NUMA node → cần app aware.
- Có thể tắt hyperthreading qua CPU options nếu app benchmark tốt hơn với physical core.

### 7.4 AMI optimization
- Custom AMI với app baked sẵn → bootstrap < 30s thay vì 5 phút.
- **EC2 Image Builder** để automate AMI pipeline.

### 7.5 EBS-optimized — trần băng thông nằm ở **instance**, không ở volume

Đây là chỗ sai kinh điển: provision gp3 **16.000 IOPS / 1.000 MB/s**, benchmark xong chỉ thấy ~500 MB/s, rồi đi đổ lỗi cho EBS. Thủ phạm là instance type.

**Cơ chế**: traffic EBS đi qua một đường mạng riêng giữa instance và EBS (đó là ý nghĩa của "EBS-optimized"). Mọi instance Nitro đời hiện tại đều EBS-optimized mặc định và **không tính thêm tiền**, nhưng mỗi *size* có trần riêng cho đường đó. Có **hai** trần cùng lúc, đạt cái nào trước thì nghẽn cái đó:

- **Throughput** (Mbps hoặc MB/s) — băng thông EBS tối đa của instance.
- **IOPS** — số thao tác I/O tối đa instance đẩy xuống EBS được.

Băng thông thực nhận = `min(tổng provision của các volume, trần EBS của instance)`. Và trần này là **dùng chung cho toàn bộ volume EBS gắn vào instance** — 4 volume gp3 mỗi cái 1.000 MB/s không cộng thành 4.000 MB/s nếu instance chỉ tải nổi 1.187 MB/s.

| Nguồn giới hạn | Trần | Bẫy |
|----------------|------|-----|
| **gp3 mỗi volume** | 16.000 IOPS · 1.000 MB/s (~8.000 Mbps) | Muốn vượt 16.000 IOPS phải io2 hoặc RAID 0 nhiều volume |
| **io2 Block Express mỗi volume** | 256.000 IOPS · 4.000 MB/s | Chỉ chạy trên instance Nitro đời phù hợp |
| **Instance EBS bandwidth** | Theo *size*, không theo family | Size nhỏ dùng cơ chế **burst**, không giữ được mức đỉnh |
| **Instance network bandwidth** | Tách riêng khỏi EBS trên Nitro | Nhưng instance store / traffic mạng vẫn cạnh tranh CPU |

**Ví dụ để thấy hình dạng của bảng** (họ m5, đơn vị Mbps cho EBS):

| Size | EBS bandwidth | Ghi chú |
|------|---------------|---------|
| `m5.large` – `m5.2xlarge` | Baseline vài trăm → ~2.300, **burst tới 4.750** | Burst có hạn mức theo thời gian, hết burst tụt về baseline |
| `m5.4xlarge` | 4.750 (sustained) | Từ size này trở lên mới là mức giữ được liên tục |
| `m5.8xlarge` | 6.800 | |
| `m5.12xlarge` | 9.500 | ~1.187 MB/s — vừa đủ cho **một** gp3 chạy full 1.000 MB/s |
| `m5.16xlarge` | 13.600 | |
| `m5.24xlarge` | 19.000 | |

(Con số chính xác khác nhau theo từng family/generation — khi thiết kế thật phải mở bảng *Amazon EBS-optimized instance types* trong EC2 docs cho đúng family. Điều cần thuộc để đi thi là **hình dạng**: trần tăng theo size, size nhỏ chỉ burst.)

### 7.6 Quy trình gỡ "đã trả tiền IOPS mà vẫn chậm"

1. Xem `VolumeReadOps`+`VolumeWriteOps` chia cho period để ra **IOPS thực**, và `VolumeReadBytes`+`VolumeWriteBytes` để ra **MB/s thực** (CloudWatch EBS) — so với mức đã provision xem volume chạm trần chưa. (`VolumeThroughputPercentage` tiện hơn nhưng EBS **chỉ phát metric này cho io1/io2**, gp3/gp2 không có.)
2. Nếu **chưa** chạm mà vẫn chậm → nghi trần instance. Xem `EBSIOBalance%` và `EBSByteBalance%`: giá trị tụt dần về 0 nghĩa là đang **cháy burst credit** của size nhỏ.
3. Kiểm tra I/O size. 16.000 IOPS × 16 KiB ≈ 250 MB/s; muốn chạm 1.000 MB/s phải I/O lớn (block 64–256 KiB), không phải random 4 KiB.
4. Kiểm tra filesystem/queue depth — gp3 cần queue depth đủ sâu mới đạt IOPS công bố.
5. Chỉ sau khi loại hết ở trên mới tăng size instance hoặc tách workload sang nhiều volume + RAID 0.

| Triệu chứng | Nguyên nhân thật | Cách xử lý |
|-------------|------------------|------------|
| Nhanh 30 phút đầu rồi tụt hẳn | Hết EBS burst credit của size nhỏ | Lên size lớn hơn (từ `4xlarge` trở lên trong ví dụ m5) |
| IOPS đủ nhưng MB/s thấp | I/O quá nhỏ (4 KiB random) | Tăng block size, hoặc chấp nhận đây là workload IOPS-bound |
| Tăng gp3 lên 16.000 IOPS mà không đổi gì | Đang nghẽn ở trần instance | Đổi instance size trước khi mua thêm IOPS |
| Cần > 16.000 IOPS trên một filesystem | Trần của một volume gp3 | io2 Block Express, hoặc RAID 0 nhiều gp3 |
| Cần IOPS cực cao, chấp nhận mất dữ liệu khi stop | Không phải bài toán của EBS | **Instance store NVMe** (`i` family) — nhưng ephemeral |

> 🪤 Bẫy thi: đề nói "đã chuyển sang gp3 và provision IOPS tối đa nhưng throughput không cải thiện" → đáp án là **đổi sang instance size lớn hơn / EBS-optimized instance**, không phải "chuyển sang io2".

---

## 8. Container performance

### 8.1 ECS vs EKS quick

| Khía cạnh | ECS | EKS |
|-----------|-----|-----|
| Control plane | AWS-native, free | $0.10/h per cluster |
| Learning curve | Thấp | Cao (K8s ecosystem) |
| Portable | AWS-only | Multi-cloud |
| Service mesh | App Mesh | Istio/Linkerd/App Mesh |
| Best for | Team AWS-first | Team đã có K8s skill |

### 8.2 Fargate vs EC2 launch type

| Khía cạnh | Fargate | EC2 |
|-----------|---------|-----|
| Manage node | Không | Có |
| Pricing | Per vCPU/GB-hour task | Per EC2-hour |
| Daemon set (logging agent on every node) | Khó (chạy per-task) | Dễ |
| Spot | Fargate Spot có | EC2 Spot |
| Cold start | Vài giây | Đã chạy → ~0 |
| GPU | Không | Có |

> 💡 Quy tắc: workload nhỏ-medium, traffic thay đổi → Fargate. Workload lớn 24/7, cần GPU/customize OS → EC2.

### 8.3 Scaling container

- **Service Auto Scaling** (Application Auto Scaling): target CPU/memory, hoặc custom metric (queue depth).
- **Cluster Auto Scaler** (EKS): scale node khi pod pending.
- **Karpenter**: AWS replacement cho Cluster Autoscaler, chọn instance type tối ưu, scale-up nhanh hơn.

---

## 9. AWS Batch — khi job là hàng đợi chứ không phải request

Batch là **scheduler cho job chạy đến khi xong** (HPC, render, genomics, backtesting, ETL nặng). Bạn nộp job vào queue, Batch tự dựng/thu compute, chạy, rồi dẹp. Bạn không quản cluster.

### 9.1 Ba khối cấu hình

| Khối | Là gì | Điều cần nhớ |
|------|-------|--------------|
| **Job definition** | Bản thiết kế của job: container image, vCPU/memory, IAM role, retry strategy, timeout | Giống ECS task definition; retry + timeout khai báo ở đây |
| **Job queue** | Nơi job xếp hàng, có **priority**; một queue trỏ tới nhiều compute environment theo thứ tự | Nhiều queue chung một CE → queue priority cao được cấp capacity trước |
| **Compute environment (CE)** | Nơi job thật sự chạy: EC2 (On-Demand/Spot), Fargate, hoặc EKS | **Managed** = Batch tự scale; **Unmanaged** = bạn tự nuôi ECS cluster |

**Managed vs Unmanaged CE** — đây là câu hay bị hỏi:

| | Managed CE | Unmanaged CE |
|---|---|---|
| Ai provision instance | Batch (theo vCPU min/max/desired) | Bạn tự quản ECS cluster |
| Khi nào chọn | Gần như luôn luôn | Cần AMI/kernel/licensing đặc thù, hoặc instance đã có sẵn phải tái dùng |
| Spot | Đặt `SPOT` + allocation strategy (ưu tiên `SPOT_CAPACITY_OPTIMIZED` để ít bị thu hồi) | Tự lo |

### 9.2 Tính năng quyết định đáp án

- **Array job**: một lần nộp sinh ra hàng nghìn child job đánh index — khớp đúng mô tả "xử lý 50.000 file độc lập".
- **Job dependency**: job B chỉ chạy sau khi A `SUCCEEDED` → DAG đơn giản mà không cần Step Functions.
- **Multi-node parallel job**: một job trải trên nhiều instance nói chuyện với nhau (MPI) — ghép với **cluster placement group** và **EFA** ở mục 7.
- **Retry strategy**: tự retry khi job fail, kể cả khi nguyên nhân là Spot bị thu hồi → đây là lý do Batch + Spot là cặp kinh điển.
- **Fair-share scheduling**: chia capacity theo share identifier, tránh một tenant chiếm hết queue.

### 9.3 Batch hay thứ khác — bảng quyết định

| Đề mô tả | Chọn | Bẫy |
|----------|------|-----|
| Hàng nghìn job độc lập, mỗi job vài chục phút → vài giờ, cần tiết kiệm tối đa | **Batch managed CE + Spot + retry** | Lambda trượt vì 15 phút |
| Job < 15 phút, event-driven, mỗi lần một file nhỏ | **Lambda** | Dùng Batch là over-engineering, cold-provision instance lâu hơn cả job |
| Service chạy liên tục, có endpoint, cần scale theo request | **ECS/EKS service** | Batch dành cho job *kết thúc*, không cho long-running service |
| Cần Spark / Hive / Presto trên dữ liệu lớn | **EMR** (hoặc Glue nếu serverless ETL) | Batch không hiểu Spark; bạn phải tự đóng gói |
| Cần orchestration phức tạp, rẽ nhánh, chờ người duyệt | **Step Functions** (có thể gọi Batch làm bước) | Job dependency của Batch chỉ là DAG đơn giản, không có state machine |
| HPC tightly-coupled MPI 100 node | **Batch multi-node parallel** hoặc ParallelCluster | Array job *không* phải MPI — các child không nói chuyện với nhau |
| Chỉ cần chạy một job theo lịch mỗi đêm | **EventBridge Scheduler → ECS task / Batch job** | Đừng nuôi EC2 chạy cron 24/7 |

> 🪤 Bẫy thi: từ khoá dẫn tới Batch là tổ hợp **"queue of jobs" + "varying compute needs" + "cost-optimized" + "fault-tolerant / can be retried"**. Thiếu chữ "queue"/"batch" mà có "must finish in seconds, event-driven" thì là Lambda.

> 💡 Chi phí: bản thân AWS Batch **không tính tiền**; bạn chỉ trả cho EC2/Fargate mà nó dựng. Vì thế Batch + Spot + `SPOT_CAPACITY_OPTIMIZED` + retry là kiến trúc rẻ nhất cho workload chịu được gián đoạn — cùng logic với mục 4.

---

## 10. Ví dụ chọn compute cho 4 use case

### 10.1 E-commerce web tier, traffic peak 10x off-peak
- ALB + ASG EC2 (M family, Graviton) + Mixed Instances Policy (Spot + On-demand baseline).
- Target tracking CPU 60%. Warm pool 5 instance.
- Predictive scaling cho daily pattern.
- **Tránh**: Lambda nếu request stateful, latency-sensitive cold-start không chấp nhận.

### 10.2 Image resize API
- **Lambda** + S3 trigger. Provisioned concurrency nếu cần latency thấp.
- **Hoặc**: SQS + Fargate Spot nếu volume cao và batch được.
- Memory tune để optimize CPU (Lambda CPU scale với memory).

### 10.3 ML training, nhiều epoch, có thể resume
- **EC2 Spot** P/Trn family + checkpoint S3.
- Hoặc **SageMaker Training Job** với managed spot.
- EFS / FSx for Lustre cho dataset.

### 10.4 Microservice mesh, team đã quen K8s
- **EKS** với Karpenter cho node, Fargate cho workload nhỏ.
- HPA + KEDA cho event-driven scaling.

---

## 10b. AWS Amplify — hosting tầng front-end

Amplify Hosting phục vụ **web app tĩnh hoặc SPA** (React/Vue/Next…): build từ Git, deploy ra CDN
toàn cầu, có preview theo branch, custom domain kèm chứng chỉ. Amplify còn scaffold backend
(auth qua Cognito, API qua AppSync/API Gateway, storage qua S3), nhưng trong đề SAA nó gần như
luôn xuất hiện ở vai trò **nơi đặt front-end**.

| Đề mô tả | Chọn | Bẫy |
|---|---|---|
| Web tĩnh/SPA, muốn **CI/CD từ Git sẵn có**, ít phải dựng hạ tầng | **Amplify Hosting** | Không hợp cho backend nặng hay kiến trúc tuỳ biến sâu |
| Web tĩnh, muốn tự kiểm soát cache/behavior/WAF | **S3 + CloudFront** | Phải tự dựng pipeline build |
| App server-side render/long-running | **ECS/Fargate, Beanstalk, hoặc EC2** | Amplify Hosting không thay thế được |

> 🪤 Bẫy: thấy "serverless web app" đừng mặc định chọn Amplify — nếu đề nhấn mạnh **kiểm soát
> CloudFront behavior, signed URL, hoặc WAF** thì đáp án là **S3 + CloudFront**.

## 11. Cạm bẫy đề thi (SAA)

1. **"Auto Scaling Group đảm bảo zero downtime khi traffic spike"** → **Sai**. Scale-out mất phút. Cần warm pool / pre-scale / over-provision baseline.
2. **"Spot phù hợp cho production database"** → **Sai**. Spot interrupt 2-phút notice, DB stateful không thể recover trong 2 phút.
3. **"Reserved Instance để dành cho spike traffic"** → **Sai**. RI cho baseline ổn định. Spike dùng on-demand/Spot.
4. **"Lambda không có giới hạn concurrent"** → **Sai**. Default 1000/region, hard limit có thể tăng. Burst limit thấp hơn.
5. **"Larger instance = bandwidth lớn"** → **Đúng một phần**. Cần `n` family để bandwidth max, family thường có baseline + burst.
6. **"Provisioned concurrency tăng max throughput Lambda"** → **Sai**. PC giảm cold start, không tăng concurrency limit.
7. **"Fargate có GPU"** → **Sai** (tính đến 2024). Cần EC2 launch type.
8. **"Graviton compatible mọi workload"** → **Sai**. Native x86 binary, .NET Framework cũ, một số driver không chạy được.
9. **"Tăng gp3 lên 16.000 IOPS thì throughput chắc chắn tăng"** → **Sai**. Trần EBS nằm ở **instance size** và dùng chung cho mọi volume; size nhỏ chỉ *burst* được, hết credit là tụt về baseline (mục 7.5).
10. **"Lambda tăng `/tmp` lên 10 GB thì dữ liệu được giữ lại giữa các lần gọi"** → **Sai**. `/tmp` là ephemeral theo execution environment; cần shared/persistent thì gắn **EFS**.
11. **"Workload nhiều job độc lập, chạy 40 phút mỗi job → dùng Lambda fan-out"** → **Sai**. Quá 15 phút. Đáp án là **AWS Batch array job + Spot + retry** (mục 9).

---

## 12. Tóm tắt 1 dòng

> Profile trước, scale sau. Chọn compute primitive theo **stateful/stateless**, **latency tolerance**, **traffic shape**. Autoscaling cần thời gian — design để baseline đủ chịu burst trong lúc scale-out, hoặc dùng compute scale tính bằng giây (Lambda/Fargate).

---

## 13. Bài tập tự kiểm tra

1. Web app traffic ổn định 100 req/s, spike 1000 req/s lúc 9h sáng mỗi ngày. Design compute + autoscaling như thế nào? (Liệt kê EC2 type, purchase option, scaling policy.)
2. Lambda function p99 latency 3s, target 200ms. Đã tune memory, code optimal. Lựa chọn gì tiếp?
3. ML training job 8h, có thể resume từ checkpoint. Chọn compute và purchase option nào, vì sao?
4. Team muốn migrate Java service từ m5.xlarge sang Graviton. Cần check gì trước khi migrate? (≥3 thứ)
5. Workload HPC simulation, 100 node MPI tightly-coupled. Chọn instance family, networking, placement group?
6. ASG scale-out mất 5 phút, traffic spike 10x trong 30s. Liệt kê 4 cách giảm thời gian phản ứng (không phải "tăng baseline 10x").
7. Function Lambda cần giải nén một archive 2 GB rồi xử lý trong ~25 phút. Liệt kê **hai** giới hạn Lambda bị vi phạm và kiến trúc thay thế.
8. Instance `m5.2xlarge` gắn một gp3 provision 16.000 IOPS / 1.000 MB/s. Đo được ~590 MB/s và giảm dần sau nửa tiếng. Chẩn đoán và cách sửa?
9. 20.000 job render độc lập, mỗi job 20-60 phút, deadline 24 giờ, ngân sách hẹp. Mô tả cấu hình Batch (queue, compute environment, purchase option, cơ chế chịu lỗi).

---

## 14. Đọc thêm

- AWS Whitepaper — *AWS Well-Architected Performance Pillar*.
- AWS Builder's Library — *Workload isolation using shuffle sharding*, *Going faster with continuous delivery*.
- AWS docs — *EC2 instance types* (full matrix), *Auto Scaling user guide*.
- *Lambda Power Tuning* tool (Alex Casalboni) — optimize memory/cost.

---

**Bài tiếp theo**: [[ch2-02-storage-performance]] — EBS gp3 vs io2, S3 throughput, EFS performance modes, FSx variants.
