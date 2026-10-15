# SAA Ch2.1 — Compute Performance & Autoscaling

> Mục tiêu: Chọn đúng **compute primitive** (EC2 / Lambda / Fargate / Batch / EKS) cho workload, hiểu instance family đủ để đi thi, và design autoscaling không bị bẫy "scale chậm hơn traffic".

Tiền đề: [[foundations-01-cap-theorem]], [[foundations-06-failure-modes]] (đặc biệt cascading failure khi autoscale chậm), CLF [[04-ec2]].

---

## 1. Câu chuyện mở đầu — "App của tôi chậm, tăng instance đi"

Engineer mới hay trả lời "scale-out" (thêm máy) cho mọi vấn đề performance. Thêm máy chỉ giúp khi chỗ nghẽn nằm đúng ở tầng bạn vừa thêm máy. Bốn trường hợp nó không giúp gì:

- Nghẽn ở **database**: thêm 100 EC2 nghĩa là thêm 100 máy cùng mở connection và bắn query vào một DB đang quá tải, nên DB chết nhanh hơn.
- Nghẽn ở **code single-threaded** (code chỉ chạy trên một luồng): gấp đôi số CPU không giúp, vì mỗi request vẫn chỉ dùng được 1 core.
- Nghẽn ở **băng thông mạng đi ra**: instance to hơn thì băng thông có to hơn, nhưng muốn băng thông lớn nhất phải chọn đúng dòng có chữ `n` (network optimized, xem §3).
- Nghẽn ở **đĩa**: số thao tác đọc/ghi mỗi giây (IOPS) do loại volume EBS và trần EBS của instance quyết định (§7.5), không phải do số vCPU.

**Quy tắc 0**: trước khi scale, **profile** — tức là đo xem thời gian đang mất ở đâu. Dùng CloudWatch metrics (CPU, network, EBS), X-Ray (thời gian từng chặng của một request), `top`/`iostat` trên host. Biết chính xác chỗ nghẽn rồi mới chọn lời giải.

---

## 2. Spectrum compute trên AWS

"Compute" là nơi code của bạn thật sự chạy. AWS có nhiều dịch vụ compute, khác nhau chủ yếu ở một điểm: **ranh giới giữa phần bạn tự quản và phần AWS quản nằm ở đâu**. Càng đẩy nhiều việc cho AWS thì càng ít phải vận hành, nhưng cũng càng ít quyền tuỳ biến (không chọn được kernel, không gắn được GPU, bị giới hạn thời gian chạy…).

Vài thuật ngữ dùng trong bảng dưới, mỗi thứ một câu (phần container giải thích kỹ ở §8):

- **Container**: một gói gồm app + thư viện nó cần, chạy như một tiến trình cô lập trên máy chủ. **Container image** là file đóng gói đó.
- **Orchestrator**: phần mềm quyết định container nào chạy trên máy nào, khởi động lại khi chết, tăng giảm số bản sao. AWS có hai cái: **ECS** (của riêng AWS) và **EKS** (Kubernetes do AWS vận hành).
- **Control plane**: "bộ não" của orchestrator — nơi lưu trạng thái mong muốn và ra lệnh. **Node** là máy (EC2) nơi container thật sự chạy.
- **Task definition** (ECS): bản khai "chạy image nào, cấp bao nhiêu CPU/RAM, mở port nào, dùng IAM role nào".
- **Job definition / compute environment** (Batch): bản khai của một job, và nhóm máy mà Batch dựng lên để chạy job (§9).

Bảng xếp từ **tự quản nhiều nhất** xuống **tự quản ít nhất**:

| Service | Bạn quản lý | AWS quản lý | Use case |
|---------|-------------|-------------|----------|
| **EC2** | OS, patch, runtime, app | Hardware, hypervisor | Cần custom OS, kernel module, GPU nặng |
| **EKS (self-managed nodes)** | OS của node, ứng dụng Kubernetes | Control plane Kubernetes | Đã dùng hệ sinh thái Kubernetes, muốn chạy được cả ngoài AWS |
| **ECS on EC2** | Container, đội EC2 làm node | Control plane ECS | Chạy container nhưng vẫn cần kiểm soát instance (GPU, loại máy, daemon riêng) |
| **EKS Fargate / ECS Fargate** | Container image, task definition | Node, OS, việc cấp máy | Chạy container mà không muốn quản node |
| **Batch** | Job definition | Compute environment, hàng đợi job | HPC, ML training, render farm — job chạy xong thì kết thúc |
| **App Runner** | Container hoặc repo source | Build, deploy, scale, load balancer | Web app/API không muốn dựng hạ tầng |
| **Lambda** | Code + dependencies | Mọi thứ khác | Event-driven, mỗi lần chạy ngắn (< 15 phút), traffic thất thường |
| **Lightsail** | App | Mọi thứ (gói VPS giá cố định) | Hobby, prototype |

### Quy tắc chọn nhanh

| Tình huống | Chọn | Vì sao |
|------------|------|--------|
| Mỗi lần chạy < 15 phút, kích hoạt bởi event, traffic thất thường | **Lambda** | Không có request thì không tốn tiền; tự scale theo từng request |
| Container, không muốn quản node | **Fargate** (ECS hoặc EKS) | AWS cấp máy cho từng task, bạn chỉ khai CPU/RAM |
| Cần GPU / custom kernel / Windows có giao diện | **EC2** | Chỉ EC2 cho bạn toàn quyền trên OS và phần cứng |
| Đã có Kubernetes manifest, team biết Kubernetes | **EKS** | Dùng lại nguyên công cụ và kỹ năng sẵn có |
| Nhiều job xếp hàng, scale theo độ dài hàng đợi | **Batch** | Tự dựng máy khi có job, tự dẹp khi hết |
| Web app đơn giản, không cần kiến trúc tuỳ biến | **App Runner / Lightsail** | Ít thứ phải cấu hình nhất |
| Workload chịu được gián đoạn, cần giảm tới 70–90% chi phí | **EC2 Spot / Fargate Spot / Batch trên Spot** | Dùng capacity thừa của AWS với giá rẻ, đổi lại có thể bị thu hồi (§4) |

---

## 3. EC2 instance families — chỉ học theo logic, không học vẹt

Một **instance type** là một cấu hình máy ảo cố định: bao nhiêu vCPU, bao nhiêu RAM, băng thông mạng và băng thông đĩa tới đâu. (**vCPU** = một luồng xử lý của CPU vật lý; trên máy Intel/AMD thường là một hyperthread, trên Graviton là một core thật.) AWS có hàng trăm instance type, nhưng tên của chúng theo đúng một công thức, đọc được tên là đoán được máy.

```
c7gn.xlarge
│││└ modifier: n = network optimized     (có thể có nhiều chữ: g, n, d…)
││└─ modifier: g = CPU Graviton (ARM)
│└── generation 7: thế hệ phần cứng, số càng lớn càng mới và thường rẻ hơn trên cùng hiệu năng
└─── family c: tối ưu cho CPU
.xlarge = size: 4 vCPU
```

### 3.1 Family — khác nhau ở tỉ lệ RAM trên mỗi vCPU

Ba family chính chỉ khác nhau ở **tỉ lệ RAM/vCPU**. Cùng size `xlarge` (4 vCPU):

| Family | RAM ở size `xlarge` | Tỉ lệ | Ý nghĩa |
|--------|--------------------|-------|---------|
| **C** (`c7g.xlarge`) | 8 GiB | 2 GiB/vCPU | Nhiều CPU, ít RAM — trả tiền cho CPU |
| **M** (`m7g.xlarge`) | 16 GiB | 4 GiB/vCPU | Cân bằng |
| **R** (`r7g.xlarge`) | 32 GiB | 8 GiB/vCPU | Nhiều RAM — trả tiền cho RAM |

Cách chọn suy ra luôn: xem workload hết CPU trước hay hết RAM trước. Encode video ngốn CPU nhưng ít RAM thì chọn C; nếu chọn R sẽ trả tiền cho 32 GiB RAM bỏ không. Redis giữ 25 GiB dữ liệu trong RAM mà CPU gần như rảnh thì chọn R; nếu chọn C phải lên tới `c7g.4xlarge` (16 vCPU, 32 GiB) mới đủ RAM và thừa 12 vCPU.

Bảng đầy đủ các family đề thi có thể nhắc tới:

| Family | Tối ưu cho | Khi nào dùng |
|--------|-----------|--------------|
| **T** (t3, t4g) | Burstable: CPU nền thấp, thỉnh thoảng vọt lên được (§3.2) | Dev, web ít traffic, microservice rảnh phần lớn thời gian |
| **M** (m6i, m7g) | General purpose, cân bằng CPU/RAM | App server mặc định — "không biết chọn gì thì M" |
| **C** (c6i, c7g) | Compute optimized: nhiều vCPU so với RAM | Batch nặng CPU, game server, encode video, HPC |
| **R** (r6i, r7g) | Memory optimized: nhiều RAM so với vCPU | Database, cache trong RAM, Spark, JVM heap lớn |
| **X** (x2idn) | Tỉ lệ RAM/vCPU còn cao hơn R, tới hàng TiB RAM mỗi máy | SAP HANA, in-memory DB rất lớn |
| **I** (i4i) | Ổ NVMe gắn thẳng trong máy (instance store), IOPS cao hơn hẳn EBS | NoSQL tự vận hành, DB giao dịch cần độ trễ đĩa thấp nhất |
| **D** (d3) | Rất nhiều ổ HDD gắn trong máy, tối ưu dung lượng | Hadoop/HDFS, kho dữ liệu phân tán |
| **H** (h1) | HDD gắn trong máy, tối ưu tốc độ đọc/ghi tuần tự | MapReduce |
| **P, G** (p4, g5) | GPU | ML training (P), inference / đồ hoạ (G) |
| **Inf** (inf2) | Chip AWS Inferentia | ML inference giá thấp hơn GPU |
| **Trn** (trn1) | Chip AWS Trainium | ML training giá thấp hơn GPU |
| **F** (f1) | FPGA (chip lập trình lại được phần cứng) | Genomics, mô hình tài chính |
| **HPC** (hpc7g) | HPC tightly-coupled (§7.1) | Mô phỏng khí động học, thời tiết; đi cùng EFA |

Lưu ý với I/D/H: ổ gắn trong máy gọi là **instance store**, dữ liệu trên đó **mất khi stop/terminate instance**. Nó nhanh vì không đi qua mạng như EBS, và chỉ hợp với hệ tự nhân bản dữ liệu sang máy khác (Cassandra, HDFS) hoặc dữ liệu tạm.

### 3.2 T family — CPU credit hoạt động thế nào

Phần lớn web server nhỏ chỉ dùng 5–10% CPU, thỉnh thoảng mới vọt lên. Dòng T bán đúng kiểu dùng đó với giá thấp hơn M: bạn được một mức CPU nền (**baseline**) dùng thoải mái, và được vọt lên 100% trong thời gian ngắn bằng cách tiêu **CPU credit**.

- **1 CPU credit = 1 vCPU chạy 100% trong 1 phút.**
- Instance **kiếm** credit đều đặn theo size, và **tiêu** credit theo mức CPU thực dùng. Dùng dưới baseline thì credit tích lại, dùng trên baseline thì credit vơi đi.
- Credit tích tối đa bằng lượng kiếm được trong 24 giờ.

| Instance | vCPU | Baseline mỗi vCPU | Credit kiếm/giờ | Tích tối đa |
|----------|------|-------------------|-----------------|-------------|
| `t3.micro` | 2 | 10% | 12 | 288 |
| `t3.medium` | 2 | 20% | 24 | 576 |
| `t3.large` | 2 | 30% | 36 | 864 |

**Tính thử:** một `t3.micro` đang đầy credit bỗng phải chạy 100% cả hai vCPU.

```
Tiêu:   2 vCPU × 100% × 60 phút = 120 credit/giờ
Kiếm:                              12 credit/giờ
Hụt:    120 − 12                 = 108 credit/giờ
Cầm cự: 288 credit ÷ 108         ≈ 2,7 giờ (2 giờ 40 phút)
```

Sau 2 giờ 40 phút thì sao? Tuỳ **credit mode**:

- **Standard**: CPU bị bóp về baseline (10% mỗi vCPU với `t3.micro`). App không chết nhưng chậm đi khoảng 10 lần, và CloudWatch vẫn báo CPU "thấp" — rất dễ chẩn đoán nhầm. Metric cần xem là `CPUCreditBalance`.
- **Unlimited** (mặc định của T3/T3a/T4g; T2 mặc định là Standard): vẫn chạy 100%, nhưng phần vượt bị tính thêm tiền, ~$0,05 mỗi vCPU-giờ với Linux ở us-east-1.

Vì vậy T chỉ rẻ khi CPU trung bình thấp. Theo ví dụ trong docs, `t3.large` chạy trung bình trên **42,5%** CPU là đã đắt hơn `m5.large`. Workload bận đều thì chọn M/C ngay từ đầu.

> Bẫy thi: "instance t3 chạy tốt lúc đầu, vài giờ sau chậm hẳn dù traffic không đổi" → hết CPU credit. Đáp án là bật Unlimited hoặc chuyển sang M/C, không phải "thêm RAM".

### 3.3 Modifier hay gặp

Chữ đứng sau số generation cho biết biến thể phần cứng:

- **g** — CPU **Graviton**: chip ARM do AWS tự thiết kế. Giá theo giờ thấp hơn bản Intel cùng size, và AWS công bố price-performance tốt hơn tới 40% so với x86 tương đương.
- **i** — Intel. **a** — AMD (thường rẻ hơn bản Intel một chút).
- **n** — Network optimized: băng thông mạng cao hơn bản thường cùng size.
- **d** — Có thêm ổ NVMe instance store gắn trong máy.
- **e** — Thêm RAM (hoặc thêm storage, tuỳ family).
- **z** — CPU xung nhịp cao, cho code cần tốc độ trên **một luồng**.

> **Graviton lesson**: code Java/Python/Go/Node chạy trên máy ảo ngôn ngữ hoặc biên dịch lại được cho ARM, nên nếu không phụ thuộc thư viện native chỉ có bản x86 thì thử `m7g` trước `m7i`. Nhiều câu thi SAA gợi ý "cost-optimized" + "compatible workload" → đáp án Graviton. Thứ **không** chạy được: binary x86 không có source, .NET Framework cũ (chỉ chạy Windows x86), một số driver/agent chưa có bản ARM.

### 3.4 Sizing — đừng over-provision

Trong cùng một family, mỗi bậc size lên là **gấp đôi mọi thứ, kể cả giá**:

```
m5.large     2 vCPU    8 GiB
m5.xlarge    4 vCPU   16 GiB    ← giá gấp đôi large
m5.2xlarge   8 vCPU   32 GiB    ← giá gấp đôi xlarge
```

Vì giá tuyến tính, 4 máy `large` và 1 máy `2xlarge` tốn tiền như nhau cho cùng tổng vCPU/RAM. **Quy tắc**: bắt đầu nhỏ, và ưu tiên scale-out (nhiều máy nhỏ) trước scale-up (một máy to). Nhiều máy nhỏ thì một máy chết chỉ mất 25% capacity thay vì 100%, và autoscaling thêm bớt được từng nấc nhỏ. Ngoại lệ là workload không chia được ra nhiều máy: cần một khối RAM lớn liền nhau (database, cache), hoặc là single-threaded và cần core nhanh hơn chứ không cần nhiều core hơn.

---

## 4. EC2 purchase options

Cùng một instance, cùng một hiệu năng, nhưng có nhiều cách trả tiền. Chúng khác nhau ở chỗ **bạn cam kết gì với AWS**, và AWS giảm giá để đổi lấy cam kết đó.

### 4.1 On-Demand — mốc so sánh

Trả theo giây, bật tắt lúc nào cũng được, không cam kết gì. Đây là giá niêm yết; mọi con số "giảm tới X%" bên dưới đều so với nó. Dùng cho tải không đoán trước, môi trường dev, và phần spike nằm trên mức nền.

### 4.2 Reserved Instance và Savings Plan — giảm giá đổi lấy cam kết 1 hoặc 3 năm

Cả hai là **cam kết về hoá đơn**, không phải một cái máy riêng. Bạn vẫn chạy instance On-Demand như thường; cuối giờ AWS đối chiếu, phần usage khớp với cam kết thì được tính giá giảm. Cam kết rồi mà không dùng thì vẫn mất tiền. Khác nhau ở **thứ bạn cam kết**:

- **Reserved Instance (RI)** — cam kết một **cấu hình cụ thể**: instance family/type, Region, OS, tenancy. **Standard RI** giảm tới 72% nhưng gần như không đổi được cấu hình. **Convertible RI** cho đổi sang family/OS khác, mức giảm thấp hơn (tới 66%).
- **Savings Plan (SP)** — cam kết **một số tiền mỗi giờ**, ví dụ "$10/giờ trong 1 năm", không gắn với cấu hình nào. **Compute Savings Plan** (tới 66%) tự áp cho EC2 bất kể family, size, Region, OS, và cho cả **Fargate** lẫn **Lambda**. **EC2 Instance Savings Plan** (tới 72%) rẻ hơn nhưng khoá vào một family trong một Region (ví dụ M5 ở N. Virginia).

Vì sao đề thi thường nghiêng về Savings Plan: 3 năm là dài. Nếu năm sau bạn chuyển từ `m5` sang Graviton, hoặc chuyển một phần sang Fargate, Standard RI cho `m5` thành tiền trả cho thứ không dùng nữa. Compute SP chỉ cam kết số tiền, nên nó đi theo bạn sang cấu hình mới.

**Tính thử** — mức nền là 20 instance `m5.xlarge` chạy 24/7 (On-Demand ~$0,192/giờ ở us-east-1), giả sử Compute SP 1 năm giảm 30% (con số minh hoạ, mức thật tuỳ kỳ hạn và cách trả trước):

```
On-Demand:   20 × $0,192          = $3,84/giờ    × 730 giờ ≈ $2.803/tháng
Savings Plan: cam kết $3,84 × 0,7 = $2,69/giờ    × 730 giờ ≈ $1.962/tháng
→ tiết kiệm ≈ $841/tháng, với điều kiện 20 máy đó thật sự chạy suốt
```

Nếu chỉ chạy 10 máy thì vẫn trả đủ $2,69/giờ. Vì vậy chỉ cam kết cho **mức nền chắc chắn có**, phần dao động để On-Demand hoặc Spot.

### 4.3 Spot — vì sao rẻ, vì sao bị thu hồi

AWS luôn phải dựng dư máy để đáp ứng On-Demand bất cứ lúc nào. Máy dư đang rảnh được bán lại với giá **giảm tới 90%**, gọi là Spot. Điều kiện đi kèm: khi AWS cần lại chỗ đó cho khách On-Demand, instance Spot bị **thu hồi (interrupt)** sau cảnh báo **2 phút**.

- **Spot capacity pool**: tập các máy rảnh có cùng **instance type** và cùng **Availability Zone**. `m5.large` ở AZ `us-east-1a` là một pool, `m5.large` ở `us-east-1b` là pool khác, `c5.large` ở `us-east-1a` lại là pool khác. Mỗi pool có giá và mức dư thừa riêng; pool nào cạn thì instance trong pool đó bị thu hồi.
- Hệ quả: càng **nhiều pool** (nhiều instance type × nhiều AZ) thì càng khó bị thu hồi hàng loạt cùng lúc. Một ASG chỉ xin `m5.large` ở một AZ có thể mất sạch Spot trong vài phút; ASG chấp nhận 6 loại máy trên 3 AZ có 18 pool để xoay.
- **Allocation strategy** là cách chọn pool khi xin máy. `lowest-price` lấy pool rẻ nhất, cũng là pool dễ cạn nhất. **`capacity-optimized`** lấy pool đang dư nhiều nhất, tức ít nguy cơ bị thu hồi nhất. `price-capacity-optimized` (AWS khuyên dùng hiện nay) cân cả hai: lọc các pool dư nhiều rồi lấy cái rẻ nhất trong đó.
- **Spot Fleet / EC2 Fleet**: một request duy nhất kiểu "tôi cần 100 vCPU, lấy từ bất kỳ pool nào trong danh sách này". **Mixed Instances Policy** là tính năng tương đương bên trong ASG: một ASG trộn nhiều instance type, và trộn On-Demand với Spot theo tỉ lệ (ví dụ nền 4 máy On-Demand, phần còn lại 70% Spot).
- Cảnh báo 2 phút đến qua instance metadata và EventBridge. Trước đó thường còn có **rebalance recommendation** — tín hiệu sớm rằng instance đang có nguy cơ cao.
- Ứng dụng phải **stateless** (không giữ dữ liệu quan trọng trên máy) và có handler tắt êm: ngừng nhận request mới, xử lý nốt request dở, lưu checkpoint ra S3 trong 2 phút đó.
- **Spot Blocks** (giữ Spot trong 1–6 giờ không bị thu hồi) đã bị khai tử từ 2021. Thấy trong đáp án thì loại.

Spot hợp với: batch, CI, render, ML training có checkpoint, web tier stateless đứng sau load balancer. Không hợp với: database, hay bất cứ thứ gì không dựng lại được trong 2 phút.

### 4.4 Dedicated Host và Capacity Reservation — không phải để giảm giá

- **Dedicated Host**: thuê nguyên một máy chủ vật lý, không chia với khách khác, và bạn nhìn thấy số socket/core vật lý. Cần cho license tính theo socket/core (Windows Server, SQL Server, Oracle mang license sẵn có lên AWS — gọi là **BYOL**) hoặc yêu cầu compliance về cô lập phần cứng.
- **On-Demand Capacity Reservation**: giữ chỗ N instance của một type trong **một AZ cụ thể**. Trả giá On-Demand cho chỗ đó **dù có chạy hay không**, không cam kết kỳ hạn, huỷ lúc nào cũng được. Mục đích là chắc chắn launch được máy khi cần (ngày sale lớn, failover DR), không phải tiết kiệm.

### 4.5 Bảng tổng hợp

| Option | Giảm so với On-Demand | Cam kết | Use case |
|--------|----------------------|---------|----------|
| **On-Demand** | 0% | Không | Spike, dev, không dự đoán được |
| **Reserved Instance (RI)** | Tới 72% (Standard), tới 66% (Convertible) | 1 hoặc 3 năm, theo cấu hình instance | Baseline ổn định 24/7, chắc chắn không đổi loại máy |
| **Savings Plan** | Tới 66% (Compute), tới 72% (EC2 Instance) | 1 hoặc 3 năm, theo số $/giờ | Baseline ổn định nhưng muốn linh hoạt EC2/Fargate/Lambda |
| **Spot** | Tới 90% | Không; bị thu hồi sau cảnh báo 2 phút | Stateless, fault-tolerant, batch, ML training |
| **Dedicated Host** | — (trả cho cả host) | On-Demand hoặc đặt trước 1–3 năm | Compliance, BYOL Windows/Oracle |
| **Capacity Reservation** | 0% (giá On-Demand, trả cả khi không dùng) | Không kỳ hạn | Đảm bảo có capacity trong một AZ cụ thể |

> Bẫy thi: "Cần baseline + spike" → đáp án **Savings Plan cho baseline + Spot/On-Demand cho spike**, không phải RI cho cả tổng. RI khoá vào cấu hình instance cụ thể; Compute Savings Plan linh hoạt hơn. Và "đảm bảo có máy trong AZ" là **Capacity Reservation**; RI loại regional và Savings Plan chỉ giảm giá, không giữ chỗ.

---

## 5. Autoscaling — không phải "bật là chạy"

Autoscaling là tự động thêm máy khi tải tăng (**scale-out**) và bớt máy khi tải giảm (**scale-in**). Bạn khai ba con số: **min** (không bao giờ ít hơn), **max** (không bao giờ nhiều hơn, để chặn hoá đơn), và **desired** (số đang muốn có lúc này). Các scaling policy làm đúng một việc: thay đổi `desired` trong khoảng min–max.

### 5.1 Loại autoscaling

Mỗi loại compute có cơ chế scale riêng, nhưng ý tưởng giống nhau: một metric vượt ngưỡng thì đổi số lượng đơn vị đang chạy.

- **EC2 Auto Scaling Group (ASG)**: một nhóm EC2 giống nhau, launch từ cùng một launch template. ASG giữ số instance bằng `desired`, tự thay máy hỏng, và trải đều qua các AZ.
- **Application Auto Scaling**: dịch vụ scale chung cho những thứ **không phải EC2** — số task của một ECS service, capacity của bảng DynamoDB, số Aurora replica, số instance sau SageMaker endpoint… Cùng các kiểu policy như ASG.
- **Lambda concurrency**: Lambda tự tạo thêm môi trường chạy theo số request, không cần policy. Thứ bạn cấu hình là các giới hạn và phần giữ ấm (§5.5).
- **Kubernetes (EKS)** scale ở hai tầng. Tầng pod (pod = một nhóm container chạy cùng nhau, đơn vị nhỏ nhất của Kubernetes): **HPA** thêm bớt *số* pod, **VPA** chỉnh *CPU/RAM* cấp cho mỗi pod. Tầng node: **Cluster Autoscaler** và **Karpenter** thêm EC2 khi có pod không còn chỗ xếp. Chi tiết ở §8.4.

| Loại | Đối tượng | Trigger |
|------|-----------|---------|
| **EC2 Auto Scaling Group (ASG)** | Đội EC2 | CloudWatch metric, lịch, dự báo |
| **Application Auto Scaling** | ECS service, DynamoDB, Aurora replica, SageMaker… | Target tracking, step, scheduled |
| **Lambda concurrency** | Lambda function | Tự động theo request; cấu hình provisioned / reserved concurrency |
| **K8s HPA / VPA / Cluster Autoscaler / Karpenter** | Pod và node của EKS | Metrics server, custom metrics, pod đang pending |

### 5.2 Policy types (ASG)

**Target tracking** — bạn chọn một metric và một giá trị đích, ví dụ "CPU trung bình của cả nhóm = 60%". ASG tự tính cần bao nhiêu instance để metric quay về đích, giống máy điều hoà giữ nhiệt độ. Số instance cần xấp xỉ theo tỉ lệ:

```
số instance cần ≈ số hiện tại × (metric hiện tại ÷ target)

4 instance đang ở 90% CPU, target 60%:
4 × (90 ÷ 60) = 6   → ASG thêm 2 instance
(cùng lượng việc chia cho 6 máy: 4 × 90% ÷ 6 = 60%)
```

Target tracking tự tạo và tự quản các CloudWatch alarm, scale-out nhanh và scale-in chậm rãi để tránh dao động. Metric phải là loại **giảm khi thêm máy**: CPU trung bình, số request trên mỗi target của ALB, độ dài queue chia cho số instance.

**Step scaling** — bạn tự viết bảng bậc thang "vượt ngưỡng bao nhiêu thì thêm bao nhiêu":

```
Alarm: CPU > 70%
  CPU 70–85%  → +1 instance
  CPU > 85%   → +3 instance
```

Khác target tracking ở chỗ **bạn** quyết định phản ứng mạnh nhẹ thế nào, AWS không tự tính. Dùng khi muốn kiểm soát từng nấc, hoặc metric không tỉ lệ thuận với số máy.

**Simple scaling** — một alarm, một hành động ("CPU > 70% thì +1"), rồi **chờ hết cooldown** (mặc định 300 giây) mới phản ứng tiếp, kể cả khi tải vẫn đang tăng. Step scaling và target tracking không bị chặn bởi cooldown kiểu đó khi scale-out. Đây là kiểu cũ, có trong đề như một phương án kém hơn.

**Scheduled** — đổi min/max/desired theo lịch cron: "7:45 mỗi sáng thứ Hai–Sáu đặt desired = 20". Không nhìn metric nào. Dùng khi biết trước giờ cao điểm.

**Predictive** — ASG học từ lịch sử metric của những ngày trước, dự báo tải sắp tới và **launch trước** khi tải đến. Chỉ có ích khi tải lặp lại theo chu kỳ ngày/tuần; không cứu được spike bất ngờ.

| Policy | Cách hoạt động | Khi dùng |
|--------|----------------|----------|
| **Target tracking** | Giữ metric ở mức target (vd CPU 60%), tự tính số máy | Mặc định — đơn giản, đủ tốt cho phần lớn trường hợp |
| **Step scaling** | Thêm N instance khi metric vượt ngưỡng, M instance khi vượt cao hơn | Cần phản ứng theo mức độ nghiêm trọng do mình định |
| **Simple scaling** | +N instance khi alarm, rồi chờ cooldown | Legacy, không khuyên dùng nữa |
| **Scheduled** | Theo cron | Traffic pattern biết trước (vd 9h sáng) |
| **Predictive** | Dự báo từ lịch sử, scale trước | Chu kỳ ngày/tuần lặp lại rõ |

Các policy **kết hợp được**: scheduled hoặc predictive lo phần biết trước, target tracking lo phần lệch khỏi dự đoán. Khi nhiều policy cùng đưa ra con số, ASG lấy số instance lớn nhất.

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

Mỗi cách dưới đây cắt một đoạn của timeline trên:

- **Pre-warm**: scale trước khi tải đến bằng scheduled hoặc predictive, bỏ được cả 3–10 phút nếu đoán đúng giờ.
- **Warm pool**: ASG giữ sẵn một số instance **đã boot và cài xong app** rồi đưa về trạng thái stopped (hoặc hibernated). Lúc cần chỉ phải start lại, bỏ được phần lớn bước boot + bootstrap. Instance stopped chỉ tốn tiền EBS, không tốn tiền compute.
- **Nhiều instance nhỏ** thay vì ít instance to: mỗi nấc scale thêm một lượng capacity nhỏ hơn nên bám sát tải hơn. Thêm 1 máy vào nhóm 4 máy là +25%, vào nhóm 16 máy là +6%.
- **Bootstrap nhanh hơn**: dùng AMI đã cài sẵn app (§7.4) thay vì `apt install` trong user-data lúc khởi động.
- **Đổi sang compute khởi động nhanh hơn**: Lambda tạo môi trường mới trong cỡ dưới một giây tới vài giây; một task Fargate mới không phải boot OS của bạn nhưng vẫn phải kéo image, thường nhanh hơn dựng EC2 từ đầu.

### 5.5 Lambda concurrency

**Concurrency** là số request **đang được xử lý cùng một lúc**. Mỗi môi trường chạy (execution environment) của Lambda chỉ xử lý **một request tại một thời điểm**, nên concurrency cũng chính là số môi trường đang bận. Nó không phải là số request mỗi giây:

```
concurrency ≈ số request mỗi giây × thời gian xử lý trung bình (giây)

100 req/s × 2 giây     = 200 concurrent
100 req/s × 0,1 giây   =  10 concurrent
```

Cùng 100 req/s, function chạy 2 giây cần gấp 20 lần số môi trường so với function chạy 100 ms. Muốn giảm concurrency thì làm function chạy nhanh hơn.

**Hai giới hạn cần phân biệt:**

- **Trần concurrency của account**: mặc định **1.000 mỗi Region**, **dùng chung cho mọi function** trong account. Xin tăng được qua Service Quotas. Chạm trần thì request mới bị từ chối (throttle, lỗi 429).
- **Tốc độ tăng (scaling rate)**: mỗi function được thêm tối đa **1.000 môi trường mỗi 10 giây**. Đây là thứ đề thi cũ gọi là "burst limit". Trần account quyết định lên *cao tới đâu*, scaling rate quyết định lên *nhanh tới đâu*.

**Tính thử:** flash sale làm traffic nhảy từ gần 0 lên 5.000 req/s, mỗi request xử lý 0,5 giây.

```
Cần:  5.000 × 0,5 = 2.500 concurrent

Trần account mặc định 1.000 → thiếu 1.500, phần vượt bị throttle dù Lambda "tự scale".
Đã xin trần lên 3.000:
  giây 0:   tối đa 1.000 môi trường
  giây 10:  tối đa 2.000
  giây 20:  tối đa 3.000  → đủ 2.500 sau khoảng 20 giây; trước đó phần vượt bị throttle
```

**Cold start**: khi chưa có môi trường rảnh, Lambda phải tạo cái mới — tải code, khởi động runtime, chạy phần khởi tạo của bạn — rồi mới xử lý request. Phần thêm này thường từ ~100 ms tới hơn 1 giây, tuỳ runtime và kích thước package (Java/.NET lâu hơn Node/Python). Request sau dùng lại môi trường đã ấm nên không bị.

Ba công cụ, giải quyết ba việc khác nhau:

- **Reserved concurrency** — dành riêng một phần trần account cho một function, và cũng là **mức tối đa** function đó được dùng. Đặt reserved = 100 cho function ghi vào RDS thì nó không bao giờ mở quá 100 connection đồng thời (bảo vệ DB), và các function khác không ăn mất phần của nó. Không tốn tiền. **Không** làm ấm gì cả.
- **Provisioned concurrency** — trả tiền để Lambda **giữ sẵn N môi trường đã khởi tạo xong**. N request đồng thời đầu tiên không bao giờ gặp cold start. Tính tiền theo giờ kể cả khi không có request, giống trả tiền cho máy bật sẵn.
- **SnapStart** (Java 11+, Python 3.12+, .NET 8+) — Lambda chạy phần khởi tạo một lần lúc publish version, chụp snapshot bộ nhớ, rồi mỗi cold start chỉ khôi phục từ snapshot thay vì khởi tạo lại. Theo docs, thời gian khởi động giảm từ vài giây xuống dưới một giây. Không dùng chung với provisioned concurrency trên cùng một version.

> Bẫy thi: "Lambda cần latency p99 < 100ms cho first request" → **Provisioned concurrency** (hoặc SnapStart). Reserved concurrency không giải quyết cold start. Ngược lại, "Lambda làm sập database vì mở quá nhiều connection" → **Reserved concurrency** (hoặc RDS Proxy), không phải provisioned.

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
| **Payload async (event)** | Đề thi: **256 KB**. Docs hiện tại: **1 MB** | 256 KB cũng là con số đề thi dùng cho message SQS/SNS; dữ liệu lớn hơn thì gửi S3 key thay vì gửi nội dung |
| **Deployment package .zip upload trực tiếp** | **50 MB** | Lớn hơn thì upload qua S3 |
| **Deployment package giải nén** | **250 MB** (tính cả layer) | Tối đa **5 layer**/function, đều nằm trong 250 MB này |
| **Container image** | **10 GB** | Đường thoát khi dependency quá nặng cho zip |
| **Environment variables** | 4 KB tổng | Config lớn → SSM Parameter Store / Secrets Manager |
| **Concurrency mặc định** | 1.000 concurrent/Region, chung cho mọi function (tăng được qua quota) | Tốc độ tăng cũng có giới hạn: 1.000 môi trường mỗi 10 giây cho mỗi function (xem 5.5) |

### 6.1 Memory là núm CPU — nghịch lý "tăng RAM lại rẻ hơn"

Lambda không cho chọn vCPU. Ở 128 MB function chỉ nhận một phần rất nhỏ của 1 vCPU; tới **~1.769 MB** mới đủ **một vCPU trọn vẹn**; trên nữa thì có nhiều vCPU nhưng chỉ hữu ích nếu code **đa luồng** (thread pool Java, goroutine, `sharp`/libvips). Code single-threaded thuần thì vượt 1.769 MB gần như không nhanh thêm — chỉ tốn tiền.

Hệ quả về chi phí: function CPU-bound chạy 10 giây ở 512 MB có thể chỉ mất ~2,5 giây ở 2.048 MB. Giá GB-giây x4 nhưng thời gian /4 → hoà tiền mà latency tốt hơn 4 lần. Đó chính là lý do tồn tại của *Lambda Power Tuning* ở mục Đọc thêm.

> Bẫy thi: "Lambda xử lý ảnh chậm, code đã tối ưu" → đáp án thường là **tăng memory** (vì CPU tăng theo), không phải "chuyển sang EC2".

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

Bình thường, mỗi gói tin của máy ảo đi qua một lớp card mạng ảo do hypervisor giả lập bằng phần mềm, tốn CPU và thêm độ trễ. **Enhanced networking** dùng kỹ thuật **SR-IOV**: card mạng vật lý tự chia thành nhiều "card con" và đưa thẳng một cái cho máy ảo, bỏ qua lớp giả lập. Kết quả là băng thông cao hơn, độ trễ thấp và đều hơn, ít tốn CPU hơn. Không tính thêm tiền.

- **ENA (Elastic Network Adapter)**: card mạng enhanced networking mặc định của mọi instance đời hiện tại, hỗ trợ tới **100 Gbps** trên các instance type phù hợp (vài dòng mới nhất còn cao hơn). Băng thông thực tế phụ thuộc size instance.
- **EFA (Elastic Fabric Adapter)**: là ENA cộng thêm khả năng **OS-bypass** — ứng dụng nói chuyện thẳng với card mạng, không đi qua kernel của hệ điều hành. Mỗi gói tin bớt được một lượt chuyển ngữ cảnh và sao chép dữ liệu trong kernel, nên độ trễ giữa các node thấp và ổn định hơn ENA thường. OS-bypass chỉ hoạt động giữa các instance **trong cùng một AZ**.
- **DPDK**: bộ thư viện cho phép ứng dụng tự xử lý gói tin ở user space, cũng là một dạng kernel bypass. Dùng cho thiết bị mạng ảo (firewall, router, load balancer tự dựng) cần xử lý hàng triệu gói mỗi giây.

EFA sinh ra cho ai? Cho **HPC tightly-coupled**: một bài toán mô phỏng (thời tiết, khí động học) chia ra hàng trăm node, và các node phải **trao đổi kết quả trung gian với nhau liên tục** ở mỗi bước tính, thường qua thư viện **MPI** (Message Passing Interface — chuẩn gửi nhận message giữa các tiến trình tính toán song song). Node nào chờ mạng thì cả cụm chờ theo, nên độ trễ mạng quyết định tốc độ toàn bài toán. Ngược lại là **loosely-coupled**: mỗi job độc lập, không nói chuyện với nhau (render 10.000 khung hình) — loại này không cần EFA.

> Bẫy thi: "HPC, MPI, tightly-coupled, lowest inter-node latency" → **EFA + cluster placement group**. Chỉ thấy "băng thông cao" mà không có MPI/HPC → ENA trên instance dòng `n` là đủ.

### 7.2 Placement Groups

Mặc định AWS đặt instance của bạn ở đâu đó trong AZ, bạn không kiểm soát chúng nằm gần hay xa nhau về vật lý. **Placement group** là cách yêu cầu một kiểu bố trí cụ thể trên các rack (tủ máy chủ; các máy cùng rack dùng chung nguồn điện và switch mạng, nên có thể hỏng cùng lúc).

- **Cluster**: dồn các instance lại gần nhau trong **một AZ** để mạng giữa chúng nhanh nhất. Đổi lại, một sự cố phần cứng có thể hạ nhiều máy cùng lúc.
- **Spread**: mỗi instance nằm trên một rack riêng, nên không có hai máy nào hỏng vì cùng một rack. Giới hạn **7 instance đang chạy mỗi AZ** cho mỗi group.
- **Partition**: chia instance thành các nhóm (partition), mỗi partition dùng bộ rack riêng, tối đa **7 partition mỗi AZ**, số instance trong mỗi partition không bị giới hạn. Ứng dụng biết được instance nào thuộc partition nào, nên hệ phân tán đặt được các bản sao dữ liệu vào các partition khác nhau.

| Type | Layout | Use case |
|------|--------|----------|
| **Cluster** | Gần nhau trong một AZ, low latency | HPC, MPI |
| **Spread** | Mỗi instance một rack, max 7 instance/AZ | High availability cho ít instance critical |
| **Partition** | Gom thành partition, mỗi partition khác rack, max 7 partition/AZ | Hệ phân tán lớn (Hadoop, Kafka, Cassandra) |

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

Hai chi tiết phần cứng chỉ đáng quan tâm ở instance rất to hoặc workload HPC:

- **NUMA** (Non-Uniform Memory Access): máy chủ lớn có nhiều CPU vật lý (socket), mỗi socket có vùng RAM "gần" riêng — một cặp như vậy là một **NUMA node**. Luồng chạy trên socket này mà đọc RAM thuộc socket kia thì chậm hơn. Instance to như `r6i.32xlarge` lộ ra nhiều NUMA node; database và JVM heap lớn nên được cấu hình để mỗi tiến trình ở yên trên một node (NUMA-aware). Instance cỡ nhỏ và vừa chỉ có một node nên không cần lo.
- **Hyperthreading**: một core vật lý giả làm hai vCPU. Hai vCPU đó chia nhau một core, nên với code tính toán nặng, 2 vCPU không nhanh gấp đôi 1 core. EC2 cho đặt **CPU options** để tắt hyperthreading (1 thread mỗi core). Hai lý do thường gặp: benchmark HPC cho thấy chạy trên core thật nhanh hơn, hoặc phần mềm tính license theo số vCPU.

### 7.4 AMI optimization

**AMI** (Amazon Machine Image) là ảnh đĩa dùng để launch instance: OS cộng với mọi thứ đã cài sẵn trong đó. Có hai cách đưa app lên một instance mới:

- Dùng AMI gốc rồi cài app bằng script **user-data** lúc boot: mỗi instance mới phải tải package, cài dependency, kéo code. Mất vài phút, và phụ thuộc vào repo bên ngoài còn sống.
- Dùng **custom AMI đã cài sẵn app** ("baked" hay "golden" AMI): instance boot xong là chạy. Bước bootstrap trong timeline §5.3 có thể rút từ khoảng 5 phút xuống dưới 30 giây.

**EC2 Image Builder** là dịch vụ tự động hoá việc này: theo lịch hoặc khi có bản vá, nó dựng instance tạm, cài đặt, chạy test, rồi xuất ra AMI mới. Đề thi nhắc tới nó khi cần "tự động tạo và vá AMI".

### 7.5 EBS-optimized — trần băng thông nằm ở **instance**, không ở volume

Đây là chỗ sai kinh điển: provision gp3 **16.000 IOPS / 1.000 MB/s**, benchmark xong chỉ thấy ~500 MB/s, rồi đi đổ lỗi cho EBS. Thủ phạm là instance type.

> Số liệu gp3: đề thi và phần lớn tài liệu ôn dùng trần **16.000 IOPS / 1.000 MiB/s** mỗi volume, và mục này giữ con số đó. Docs hiện tại đã nâng lên **80.000 IOPS / 2.000 MiB/s** (2.000 MiB/s ≈ 16.000 Mbps — trong bảng m5 bên dưới chỉ `m5.24xlarge` với 19.000 Mbps mới tải nổi). Trần của volume càng cao thì kết luận của mục này càng đúng: chỗ nghẽn nằm ở instance trước.

**Cơ chế**: traffic EBS đi qua một đường mạng riêng giữa instance và EBS (đó là ý nghĩa của "EBS-optimized"). Mọi instance Nitro đời hiện tại đều EBS-optimized mặc định và **không tính thêm tiền**, nhưng mỗi *size* có trần riêng cho đường đó. Có **hai** trần cùng lúc, đạt cái nào trước thì nghẽn cái đó:

- **Throughput** (Mbps hoặc MB/s) — băng thông EBS tối đa của instance.
- **IOPS** — số thao tác I/O tối đa instance đẩy xuống EBS được.

Băng thông thực nhận = `min(tổng provision của các volume, trần EBS của instance)`. Và trần này là **dùng chung cho toàn bộ volume EBS gắn vào instance** — 4 volume gp3 mỗi cái 1.000 MB/s không cộng thành 4.000 MB/s nếu instance chỉ tải nổi 1.187 MB/s.

| Nguồn giới hạn | Trần | Bẫy |
|----------------|------|-----|
| **gp3 mỗi volume** | Đề thi: 16.000 IOPS · 1.000 MB/s (~8.000 Mbps). Docs hiện tại: 80.000 IOPS · 2.000 MiB/s | Theo số đề thi, muốn vượt 16.000 IOPS phải io2 hoặc RAID 0 nhiều volume |
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
| Cần > 16.000 IOPS trên một filesystem | Trần của một volume gp3 theo số đề thi (docs hiện tại: 80.000) | io2 Block Express, hoặc RAID 0 nhiều gp3 |
| Cần IOPS cực cao, chấp nhận mất dữ liệu khi stop | Không phải bài toán của EBS | **Instance store NVMe** (`i` family) — nhưng ephemeral |

> Bẫy thi: đề nói "đã chuyển sang gp3 và provision IOPS tối đa nhưng throughput không cải thiện" → đáp án là **đổi sang instance size lớn hơn / EBS-optimized instance**, không phải "chuyển sang io2".

---

## 8. Container performance

### 8.1 Từ vựng tối thiểu

Một **container** đóng gói app cùng mọi thư viện nó cần thành một **image**, rồi chạy image đó như một tiến trình cô lập. Khác máy ảo ở chỗ container dùng chung kernel với máy chủ, nên khởi động trong vài giây và nhẹ hơn nhiều. Chạy vài container trên một máy thì `docker run` là đủ; chạy vài trăm container trên vài chục máy thì cần một **orchestrator** quyết định container nào nằm ở máy nào, khởi động lại cái chết, giữ đủ số bản sao, và nối chúng với load balancer.

AWS có hai orchestrator. Chúng dùng từ khác nhau cho cùng một khái niệm:

| Khái niệm | ECS | EKS (Kubernetes) |
|-----------|-----|------------------|
| Bản khai "chạy image gì, bao nhiêu CPU/RAM" | **Task definition** | Pod spec (trong file manifest YAML) |
| Một bản đang chạy (một hay vài container đi cùng nhau) | **Task** | **Pod** |
| "Luôn giữ N bản chạy, gắn sau load balancer" | **Service** | Deployment + Service |
| Máy nơi container chạy | Container instance (EC2) | **Node** (EC2) |
| Tập hợp tất cả | **Cluster** | **Cluster** |
| Bộ não điều phối | Control plane ECS (AWS chạy, ẩn hoàn toàn) | Control plane Kubernetes (AWS chạy, bạn gọi được Kubernetes API) |

Hai câu hỏi độc lập với nhau, và đề thi hay trộn lẫn: (1) dùng **orchestrator** nào — ECS hay EKS; (2) container chạy trên **máy của ai** — EC2 bạn quản hay Fargate AWS quản. Cả ECS và EKS đều chạy được trên cả EC2 lẫn Fargate.

### 8.2 ECS vs EKS

**ECS** là orchestrator AWS tự viết: ít khái niệm, tích hợp sẵn với IAM, ALB, CloudWatch, và control plane miễn phí. **EKS** là Kubernetes chuẩn mã nguồn mở, AWS chỉ vận hành control plane giùm. Kubernetes phức tạp hơn hẳn, nhưng manifest và công cụ viết cho nó chạy được trên mọi cloud lẫn on-premises. Vì vậy lý do chọn EKS gần như luôn là "đã có Kubernetes" hoặc "cần di chuyển được giữa các nền tảng", không phải vì nó nhanh hơn.

| Khía cạnh | ECS | EKS |
|-----------|-----|-----|
| Control plane | AWS-native, miễn phí | $0,10/giờ mỗi cluster (~$73/tháng); $0,60/giờ nếu để phiên bản Kubernetes rơi vào extended support |
| Learning curve | Thấp | Cao (cả hệ sinh thái Kubernetes) |
| Portable | Chỉ AWS | Multi-cloud, on-premises |
| Service mesh / kết nối service-to-service | ECS Service Connect, VPC Lattice | Istio, Linkerd, VPC Lattice |
| Best for | Team AWS-first | Team đã có kỹ năng Kubernetes |

(**Service mesh** là lớp hạ tầng lo việc gọi nhau giữa các microservice: tìm địa chỉ, retry, mã hoá, đo đạc. Tài liệu cũ ghi **App Mesh** cho cả hai cột; AWS đã ngừng hỗ trợ App Mesh từ 30/9/2026 và hướng sang ECS Service Connect hoặc VPC Lattice. Đề thi cũ vẫn có thể nhắc App Mesh.)

### 8.3 Fargate vs EC2 launch type

Với **EC2 launch type**, cluster là một đội EC2 của bạn. Bạn chọn instance type, vá OS, và phải lo sao cho đội máy đủ chỗ cho các task; chỗ trống trên máy là tiền trả cho thứ không dùng. Với **Fargate**, không có đội máy nào: mỗi task khai cần bao nhiêu vCPU và RAM, AWS cấp cho nó một môi trường cô lập riêng đúng cỡ đó, và bạn trả tiền theo vCPU-giây + GB-giây của task.

Nguồn gốc của mọi khác biệt trong bảng là **bạn không có quyền trên máy chủ bên dưới Fargate**:

| Khía cạnh | Fargate | EC2 | Vì sao |
|-----------|---------|-----|--------|
| Quản node | Không | Có | Fargate không lộ máy chủ ra cho bạn |
| Pricing | Theo vCPU + GB mà task khai, tính theo giây | Theo EC2 instance, dù task có lấp đầy hay không | Fargate tính theo task, EC2 tính theo máy |
| Agent chạy trên mọi node (log, monitoring, security) | Không chạy kiểu daemon được; phải nhét thành **sidecar** (container phụ) trong từng task | Dễ: ECS daemon service / Kubernetes **DaemonSet** (loại workload "mỗi node đúng một bản") | Không có node để cài |
| Spot | Fargate Spot (giảm tới 70%) | EC2 Spot (giảm tới 90%) | Đều là capacity thừa, bị thu hồi sau cảnh báo 2 phút |
| Thời gian có task mới | Mỗi task phải được cấp môi trường mới rồi kéo image; image càng to càng lâu | Máy đã chạy sẵn và image đã cache thì gần như tức thì; phải thêm máy mới thì chậm như §5.3 | Fargate không có máy "đang chạy sẵn" để tận dụng cache |
| GPU | Không | Có | Fargate không cho chọn phần cứng |

> Quy tắc: workload nhỏ tới vừa, traffic thay đổi, team không muốn vận hành máy → Fargate. Workload lớn chạy đều 24/7 (lấp đầy EC2 thì rẻ hơn, lại áp được RI/Savings Plan cho EC2), cần GPU, cần tuỳ biến OS hoặc chạy daemon trên node → EC2.

### 8.4 Scaling container — hai tầng

Container trên EC2 phải scale ở **hai tầng**, và chúng nối tiếp nhau: tầng trên thêm task/pod, đến khi các máy hết chỗ thì tầng dưới mới thêm máy. Trên Fargate chỉ còn tầng trên.

**Tầng task/pod — cần bao nhiêu bản sao?**

- **ECS Service Auto Scaling** (chạy bằng Application Auto Scaling ở §5.1): target tracking theo CPU/memory trung bình của service, theo số request mỗi target của ALB, hoặc theo custom metric như độ dài queue SQS.
- **HPA** (Horizontal Pod Autoscaler, Kubernetes): thêm bớt **số pod** theo metric — tương đương target tracking.
- **VPA** (Vertical Pod Autoscaler): không đổi số pod mà chỉnh **CPU/RAM cấp cho mỗi pod** theo mức dùng thực tế.
- **KEDA**: add-on của Kubernetes cho phép scale pod theo nguồn sự kiện bên ngoài (số message trong SQS/Kafka), kể cả về 0 pod khi không có việc.

**Tầng node — cần bao nhiêu máy?**

- **ECS capacity provider** gắn với một ASG: ECS tự tăng ASG khi task không còn chỗ xếp.
- **Cluster Autoscaler** (Kubernetes): khi có pod ở trạng thái *pending* vì không node nào đủ chỗ, nó tăng `desired` của một ASG (node group) định nghĩa sẵn. Mỗi node group chỉ có một cỡ máy, nên muốn nhiều loại máy phải tạo nhiều node group.
- **Karpenter**: công cụ mã nguồn mở do AWS khởi xướng, thay cho Cluster Autoscaler. Nó nhìn yêu cầu của các pod đang pending rồi gọi thẳng EC2 để launch đúng instance type vừa nhất (kể cả Spot), không qua node group định sẵn. Nhờ bớt một tầng trung gian nên thêm node nhanh hơn và ít lãng phí chỗ hơn.

Vì tầng node vẫn mất thời gian boot EC2 (§5.3), một cluster chạy sát capacity sẽ phản ứng chậm với spike dù HPA có nhanh tới đâu.

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

> Bẫy thi: từ khoá dẫn tới Batch là tổ hợp **"queue of jobs" + "varying compute needs" + "cost-optimized" + "fault-tolerant / can be retried"**. Thiếu chữ "queue"/"batch" mà có "must finish in seconds, event-driven" thì là Lambda.

> Chi phí: bản thân AWS Batch **không tính tiền**; bạn chỉ trả cho EC2/Fargate mà nó dựng. Vì thế Batch + Spot + `SPOT_CAPACITY_OPTIMIZED` + retry là kiến trúc rẻ nhất cho workload chịu được gián đoạn — cùng logic với mục 4.

---

## 10. Ví dụ chọn compute cho 4 use case

### 10.1 E-commerce web tier, traffic peak 10x off-peak

Đặc điểm: request ngắn, chạy liên tục cả ngày, đỉnh đoán được theo giờ, độ trễ ảnh hưởng doanh thu.

- **ALB + ASG EC2**, M family bản Graviton. Web tier không lệch hẳn về CPU hay RAM nên M là điểm xuất phát; Graviton vì code web thường chạy được trên ARM và rẻ hơn.
- **Mixed Instances Policy**: phần nền bằng On-Demand (phủ bằng Savings Plan), phần co giãn bằng Spot trên nhiều instance type. Web tier stateless đứng sau ALB nên mất vài máy Spot không sao.
- **Target tracking CPU 60%** thay vì 80–90%: để dư 40% cho các máy đang chạy gánh trong 3–10 phút chờ máy mới (§5.3).
- **Predictive scaling** cho đỉnh lặp lại hằng ngày, cộng **warm pool** khoảng 5 instance cho phần lệch khỏi dự báo.
- **Tránh Lambda** nếu request giữ state trong bộ nhớ, hoặc không chấp nhận được cold start. Với tải đều cả ngày, Lambda cũng không rẻ hơn máy chạy thường trực.

### 10.2 Image resize API

Đặc điểm: mỗi ảnh là một việc độc lập, ngắn (vài giây), nặng CPU, lượng việc lên xuống thất thường.

- **Lambda + S3 trigger**: ảnh upload vào bucket thì S3 gọi function. Không có ảnh thì không tốn tiền, có 1.000 ảnh cùng lúc thì Lambda tự chạy song song.
- **Tune memory** để có thêm CPU (§6.1): resize ảnh là việc nặng CPU, tăng memory thường rút thời gian chạy đủ để hoà tiền.
- **Provisioned concurrency** chỉ khi có người đang chờ kết quả đồng bộ và cold start gây khó chịu. Xử lý nền thì không cần.
- **Hoặc SQS + Fargate Spot** nếu volume cao và đều: đẩy việc vào queue, worker Fargate kéo ra xử lý, scale theo độ dài queue. Bị thu hồi Spot thì message quay lại queue cho worker khác. Ở volume lớn và đều, trả theo vCPU-giây của Fargate Spot rẻ hơn trả theo từng lần gọi Lambda.

### 10.3 ML training, nhiều epoch, có thể resume

Đặc điểm: chạy nhiều giờ, cần GPU, nhưng lưu được tiến độ giữa chừng.

- **EC2 Spot** dòng P (GPU) hoặc Trn (Trainium), **checkpoint ra S3** sau mỗi epoch. Vì resume được nên bị thu hồi chỉ mất phần đang chạy dở của epoch hiện tại, đổi lại giảm tới 90% chi phí. Lambda và Fargate bị loại vì không có GPU (và Lambda có trần 15 phút).
- Hoặc **SageMaker Training Job với managed spot**: SageMaker tự xin Spot, tự chạy lại từ checkpoint khi bị thu hồi, xong thì tự dẹp máy.
- Dataset để trên **FSx for Lustre** (file system song song, nhiều node đọc cùng lúc với tốc độ cao) hoặc **EFS**; chi tiết ở bài storage.

### 10.4 Microservice mesh, team đã quen K8s

Đặc điểm: vài chục service nhỏ, team đã có manifest và công cụ Kubernetes.

- **EKS**: giữ nguyên kỹ năng và tooling sẵn có là lý do chính, không phải hiệu năng.
- **Karpenter** lo tầng node: tự chọn instance type vừa với các pod đang chờ, trộn được Spot.
- **Fargate** cho các workload nhỏ hoặc cần cô lập riêng, khỏi phải nuôi node cho chúng.
- **HPA** scale số pod theo CPU hoặc request; **KEDA** cho các service tiêu thụ message, scale theo độ dài queue và về 0 khi hết việc (§8.4).

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

> Bẫy: thấy "serverless web app" đừng mặc định chọn Amplify — nếu đề nhấn mạnh **kiểm soát
> CloudFront behavior, signed URL, hoặc WAF** thì đáp án là **S3 + CloudFront**.

## 11. Cạm bẫy đề thi (SAA)

1. **"Auto Scaling Group đảm bảo zero downtime khi traffic spike"** → **Sai**. Scale-out mất vài phút (§5.3). Cần warm pool / pre-scale / để dư baseline.
2. **"Spot phù hợp cho production database"** → **Sai**. Spot bị thu hồi sau cảnh báo 2 phút; DB stateful không thể chuyển dữ liệu và phục hồi trong 2 phút.
3. **"Reserved Instance để dành cho spike traffic"** → **Sai**. RI là cam kết trả tiền 1–3 năm nên chỉ hợp với baseline chạy 24/7. Spike dùng On-Demand/Spot.
4. **"Lambda không có giới hạn concurrent"** → **Sai**. Mặc định 1.000 concurrent mỗi Region, chung cho mọi function (xin tăng được). Tốc độ tăng cũng bị giới hạn: 1.000 môi trường mỗi 10 giây cho mỗi function (§5.5).
5. **"Larger instance = bandwidth lớn"** → **Đúng một phần**. Băng thông tăng theo size, nhưng muốn mức cao nhất phải chọn dòng có chữ `n`; size nhỏ của dòng thường chỉ có baseline + burst.
6. **"Provisioned concurrency tăng max throughput Lambda"** → **Sai**. PC giữ sẵn môi trường ấm để tránh cold start, không nâng trần concurrency của account.
7. **"Fargate có GPU"** → **Sai**. Fargate không hỗ trợ GPU; cần ECS/EKS trên EC2.
8. **"Graviton compatible mọi workload"** → **Sai**. Binary x86 không có bản ARM, .NET Framework cũ, một số driver không chạy được.
9. **"Tăng gp3 lên 16.000 IOPS thì throughput chắc chắn tăng"** → **Sai**. Trần EBS nằm ở **instance size** và dùng chung cho mọi volume; size nhỏ chỉ *burst* được, hết credit là tụt về baseline (mục 7.5).
10. **"Lambda tăng `/tmp` lên 10 GB thì dữ liệu được giữ lại giữa các lần gọi"** → **Sai**. `/tmp` là ephemeral theo execution environment; cần shared/persistent thì gắn **EFS**.
11. **"Workload nhiều job độc lập, chạy 40 phút mỗi job → dùng Lambda fan-out"** → **Sai**. Quá 15 phút. Đáp án là **AWS Batch array job + Spot + retry** (mục 9).
12. **"Instance T3 luôn rẻ hơn M cho mọi workload nhỏ"** → **Sai**. T chỉ rẻ khi CPU trung bình dưới baseline; chạy bận liên tục thì hoặc bị bóp CPU (Standard) hoặc bị tính thêm tiền (Unlimited) (§3.2).

---

## 12. Tóm tắt 1 dòng

> Profile trước, scale sau. Chọn compute primitive theo **stateful/stateless**, **latency tolerance**, **traffic shape**. Autoscaling cần thời gian — design để baseline đủ chịu burst trong lúc scale-out, hoặc dùng compute khởi động nhanh hơn EC2 (Lambda: dưới giây tới vài giây; Fargate: không phải boot máy của bạn).

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

