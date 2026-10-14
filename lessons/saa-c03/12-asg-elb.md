# Bài 12 — Auto Scaling & ELB Deep

## 1. Mục tiêu
- Thiết kế ASG production-grade: scaling policy, lifecycle hook, warm pool.
- Chọn đúng ELB: ALB / NLB / GLB.
- Hiểu **target tracking** vs **step** vs **predictive** scaling.
- Tránh các bẫy: scale-in oscillation, cold start, sticky session.

Hai dịch vụ trong bài luôn đi thành cặp. **Auto Scaling Group (ASG)** quyết định *có bao nhiêu máy* đang chạy; **Elastic Load Balancer (ELB)** quyết định *request nào vào máy nào*. ASG thêm một máy thì tự đăng ký máy đó với load balancer; load balancer thấy máy nào chết thì báo lại để ASG thay. Hiểu được vòng lặp đó là hiểu được hơn nửa bài.

---

## 2. Auto Scaling Group (ASG)

**Nó là gì.** Một ASG là một nhóm EC2 instance giống hệt nhau mà AWS giữ hộ bạn ở đúng một con số. Bạn nói "tôi muốn 4 máy"; nếu một máy chết thì ASG bật máy khác thay, nếu tải tăng thì ASG bật thêm (**scale-out**), tải giảm thì tắt bớt (**scale-in**). ASG chỉ thêm bớt *số lượng* máy (scale ngang), không đổi máy sang loại to hơn.

Bản thân ASG **không tốn tiền**; bạn trả tiền cho các EC2 instance mà nó bật.

### 2.1 Components

Một ASG cần bạn trả lời năm câu hỏi.

**1. Máy mới trông như thế nào? — Launch Template.** Đây là "khuôn đúc" instance: dùng AMI nào (ảnh đĩa có sẵn hệ điều hành và phần mềm), instance type gì, security group nào, script khởi động (user data) ra sao. Launch Template có **version**: sửa khuôn là tạo version 2, version 1 vẫn còn để quay lại. Tiền thân của nó là *Launch Configuration* — không có version, không sửa được, không hỗ trợ trộn Spot với On-Demand — AWS khuyên bỏ, và đề thi luôn coi Launch Template là đáp án đúng.

**2. Bao nhiêu máy? — Min / Desired / Max.** Ba con số này hay bị nhầm vai:

| Số | Ý nghĩa | Ai thay đổi nó |
|----|---------|----------------|
| **Desired** | Số máy ASG đang cố giữ **ngay lúc này** | Scaling policy (hoặc bạn chỉnh tay) |
| **Min** | Sàn: desired không bao giờ được thấp hơn | Bạn đặt một lần |
| **Max** | Trần: desired không bao giờ được cao hơn | Bạn đặt một lần |

Ví dụ `min=2, desired=4, max=10`: lúc này ASG giữ 4 máy. Đêm vắng, policy hạ desired xuống nhưng dừng ở 2 (để còn chịu được việc mất một AZ). Giờ cao điểm, policy đẩy desired lên nhưng dừng ở 10 — đây là cái phanh bảo vệ hoá đơn khi bị DDoS hoặc policy cấu hình sai.

**3. Máy đặt ở đâu? — Subnet ở nhiều AZ.** Chọn subnet thuộc ít nhất 2 Availability Zone. ASG tự **chia đều** máy giữa các AZ; khi một AZ hỏng, nó bật bù ở các AZ còn lại.

**4. Thế nào là máy hỏng? — Health check.** ASG định kỳ hỏi "máy này còn khoẻ không" và thay máy nào trả lời không. Có hai nguồn trả lời chính:

- **EC2 status check** (mặc định, luôn bật): chỉ kiểm tra máy ảo còn ở trạng thái `running` và phần cứng/hệ điều hành bên dưới không trục trặc. Nó **không biết gì về ứng dụng của bạn**.
- **ELB health check** (phải tự bật): load balancer gọi thử vào app — ví dụ `GET /health` — rồi báo kết quả cho ASG. Với ALB, mặc định gọi mỗi **30 giây**, fail **2 lần liên tiếp** thì coi là unhealthy, tức mất khoảng `30 × 2 = 60 giây` để phát hiện.

Máy mới bật cần thời gian khởi động, nên có **health check grace period**: khoảng thời gian ASG chưa vội kết luận máy hỏng. Tạo bằng console thì mặc định 300 giây; tạo bằng CLI/SDK thì mặc định là **0** (không chờ), dễ gây ra vòng lặp "bật máy → chưa kịp boot đã bị coi là hỏng → giết → bật máy khác".

**5. Khi cần bớt máy thì tắt máy nào? — Termination policy.** Trước mọi policy, ASG luôn ưu tiên **giữ cân bằng giữa các AZ**: nó chọn AZ đang nhiều máy nhất, rồi mới áp policy trong AZ đó.

| Policy | Tắt máy nào trước | Dùng khi |
|--------|-------------------|----------|
| **Default** | Máy dùng cấu hình cũ nhất (launch configuration → launch template khác → version cũ nhất của template hiện tại); nếu hoà thì máy gần mốc tính tiền theo giờ kế tiếp | Hầu hết trường hợp |
| **OldestLaunchTemplate** | Máy chạy template/version cũ nhất | Đang chuyển dần sang cấu hình mới |
| **OldestInstance** | Máy bật lâu nhất | Thay dần cả đội sang instance type mới |
| **NewestInstance** | Máy bật gần đây nhất | Đang thử cấu hình mới, không muốn giữ nó lại |
| **ClosestToNextInstanceHour** | Máy sắp sang giờ tính tiền mới | Instance tính tiền theo giờ (nay phần lớn EC2 tính theo giây nên ít tác dụng) |

**Cooldown và instance warmup — hai cái phanh chống scale vội.** Máy mới bật chưa gánh tải ngay; nếu ASG nhìn metric lúc đó, nó thấy CPU vẫn cao và bật thêm lần nữa, thành ra thừa máy.

- **Cooldown** (mặc định **300 giây**): sau một lần scale, ASG **đứng yên** hết thời gian này rồi mới xét tiếp. Chỉ áp cho **simple scaling**.
- **Instance warmup**: máy mới **chưa được tính vào metric trung bình** của nhóm cho tới khi hết thời gian warmup. Đây là cơ chế của **target tracking** và **step scaling**: ASG không đứng yên, nó vẫn phản ứng tiếp được nhưng đã trừ ra những máy đang trên đường tới. Nếu bạn không đặt warmup, nó lấy luôn giá trị cooldown mặc định (300 giây).

### 2.2 Scaling policies

Scaling policy là luật tự động thay đổi con số **desired**. Có hai họ: **dynamic** (phản ứng theo metric đang đo được) và **đoán trước** (theo lịch hoặc theo dự báo).

**Target Tracking — cái điều nhiệt.** Bạn chọn một metric và một giá trị đích, ví dụ "CPU trung bình của cả nhóm = 60%". ASG tự tạo các CloudWatch alarm và tự tính cần bao nhiêu máy để metric quay về đích, giống máy lạnh tự bật tắt để giữ 25°C. Phép tính bên trong là tỉ lệ thuận:

```
Đang có 4 instance, CPU trung bình 90%, đích 60%

Tổng tải    = 4 × 90%   = 360 (điểm phần trăm)
Số máy cần  = 360 ÷ 60% = 6 instance   → ASG bật thêm 2
Sau khi 2 máy mới gánh tải: 360 ÷ 6 = 60%   → đúng đích
```

Chiều ngược lại, khi tải giảm còn 25% trên 6 máy:

```
Tổng tải    = 6 × 25%   = 150
Số máy cần  = 150 ÷ 60% = 2,5 → làm tròn LÊN 3 instance   → ASG tắt bớt 3
Còn 3 máy: 150 ÷ 3 = 50% (dưới đích, an toàn). Nếu chỉ để 2 máy: 150 ÷ 2 = 75% → vượt đích.
```

Ba điều cần nhớ về target tracking:

- **Scale-out nhanh, scale-in chậm có chủ đích.** AWS ưu tiên tính sẵn sàng: vượt đích thì bật máy sớm, còn tải giảm thì chờ lâu hơn và tắt từ từ. Bạn không phải tự tạo hay sửa alarm.
- **Metric phải "chia được theo số máy"**: thêm máy thì metric giảm tương ứng. Bốn metric có sẵn là CPU trung bình, network in, network out, và **`ALBRequestCountPerTarget`** (số request mỗi máy nhận). Tổng số request vào load balancer thì *không* dùng được, vì thêm máy nó không giảm.
- **Metric EC2 mặc định 5 phút mới có một điểm dữ liệu.** Muốn phản ứng nhanh phải bật *detailed monitoring* (1 phút một điểm).

**Step Scaling — tự vẽ bậc thang.** Bạn tự tạo alarm và tự định nghĩa "vượt ngưỡng bao nhiêu thì cộng bao nhiêu máy". Ví dụ alarm ở CPU 70%, hai bậc:

```
CPU 80–90%   → +5 instance
CPU trên 90% → +10 instance

4 instance đang ở 85% → +5  → 9 instance,  CPU còn ~ 4×85 ÷ 9  ≈ 38%
4 instance đang ở 95% → +10 → 14 instance, CPU còn ~ 4×95 ÷ 14 ≈ 27%
```

Dùng khi bạn muốn phản ứng **mạnh hơn hẳn tỉ lệ thuận** lúc tải dựng đứng, hoặc khi metric không tỉ lệ với số máy nên target tracking không tính được. Cái giá: bạn phải tự chọn con số cho từng bậc, và tự tạo cả policy scale-in.

**Simple Scaling — đời cũ.** Giống step nhưng chỉ có **một** bậc ("CPU > 70% thì +2"), và sau mỗi lần scale nó **khoá cứng** trong suốt cooldown: alarm có kêu tiếp cũng bị bỏ qua. Tải tăng gấp ba trong 2 phút thì nó vẫn chỉ +2 rồi ngồi chờ 300 giây. Step scaling và target tracking không bị khoá như vậy — chúng tiếp tục phản ứng với alarm mới, chỉ trừ ra các máy đang warmup. Đó là lý do AWS khuyên không dùng simple scaling nữa.

**Scheduled — theo lịch.** "Mỗi ngày làm việc 8:45 đặt min=10; 19:00 trả về min=2". Không nhìn metric gì cả. Dùng khi bạn **biết trước chính xác** lúc nào tải lên: giờ mở cửa, đợt sale Black Friday, job báo cáo cuối tháng.

**Predictive — AWS đoán hộ lịch.** ASG dùng machine learning đọc lịch sử metric (cần tối thiểu **24 giờ**, phân tích tối đa **14 ngày** gần nhất) để tìm quy luật lặp theo ngày và theo tuần, rồi lập dự báo từng giờ cho **48 giờ tới**, cập nhật lại mỗi 6 giờ. Trước giờ được dự báo tải tăng, nó bật máy sẵn. Hai điểm hay bị hỏi:

- Predictive **chỉ scale-out**, không tự scale-in. Phải dùng kèm một dynamic policy (thường là target tracking) để tắt máy thừa và đỡ những cú tăng ngoài dự báo.
- Có chế độ **forecast only**: chỉ vẽ dự báo cho bạn xem, chưa đụng tới số máy — nên chạy thử chế độ này trước.

**Đặt cạnh nhau:**

| Policy | Ra quyết định dựa trên | Bạn phải cấu hình | Khi nào |
|--------|------------------------|-------------------|---------|
| **Target Tracking** | Metric hiện tại so với một giá trị đích | Một metric + một con số | Lựa chọn mặc định. "Giữ CPU ~60%", "giữ 1.000 request/máy" |
| **Step Scaling** | Alarm + mức độ vượt ngưỡng | Alarm và từng bậc cộng/trừ | Cần phản ứng mạnh theo bậc: +5 nếu CPU > 80%, +10 nếu > 90% |
| **Simple Scaling** | Alarm, một mức duy nhất | Alarm + một con số + cooldown | Legacy, không khuyến nghị (bị khoá trong cooldown) |
| **Scheduled** | Đồng hồ | Giờ và số máy | Đỉnh tải biết trước: Black Friday, 9 giờ sáng ngày làm việc |
| **Predictive** | Dự báo ML từ tối đa 14 ngày lịch sử | Metric + đích | Tải lặp lại theo chu kỳ ngày/tuần, app khởi động lâu |

Nhiều policy chạy cùng lúc được: mỗi policy tự tính ra một con số desired, ASG lấy **số lớn nhất**.

**Flapping và "hai ngưỡng tách xa".** *Flapping* (hay *oscillation*) là vòng lặp scale-out rồi scale-in liên tục: thêm máy làm metric tụt xuống dưới ngưỡng scale-in, bớt máy lại làm metric vọt qua ngưỡng scale-out. Với step/simple scaling bạn tự đặt hai ngưỡng, nên phải để khoảng cách đủ rộng:

```
Scale-out khi CPU > 70%, đang có 4 instance ở 72% → thêm 1 → 5 instance
CPU mới = 4 × 72 ÷ 5 = 57,6%

Ngưỡng scale-in đặt 60%:  57,6% < 60% → tắt 1 máy → về 4 máy, 72% → lại thêm máy → lặp vô tận
Ngưỡng scale-in đặt 30%:  57,6% nằm giữa 30% và 70% → đứng yên, ổn định
```

Cách đặt "scale-out ở 70%, scale-in ở 30%" như vậy gọi là **dual-threshold**. Target tracking tự xử lý chuyện này (nó không scale-in nếu tính ra việc đó sẽ đẩy metric vượt đích), nên với target tracking bạn chỉ cần đặt instance warmup cho đúng.

> 🪤 Bẫy thi: *"đơn giản nhất, giữ CPU quanh X%"* → **Target Tracking**. *"scale theo số message trong SQS"* → target tracking với custom metric **số message chia cho số instance** (backlog per instance), không phải tổng số message. *"tải tăng đúng 9 giờ sáng mỗi ngày, máy mất 10 phút khởi động"* → **Scheduled** hoặc **Predictive**, vì dynamic scaling chỉ phản ứng sau khi tải đã tới.

### 2.3 Lifecycle Hooks

Bình thường một máy đi thẳng từ `Pending` sang `InService`, và từ `Terminating` sang `Terminated`. **Lifecycle hook** chèn một trạng thái **chờ** vào giữa để bạn kịp làm việc riêng:

- **`Pending:Wait`** — máy vừa bật, chưa được đưa vào phục vụ. Dùng để cài phần mềm, kéo config, làm nóng cache xong rồi mới cho nhận traffic.
- **`Terminating:Wait`** — máy sắp bị tắt nhưng vẫn còn sống. Dùng để xử lý nốt request dở, đẩy log lên S3, lưu state.

ASG phát sự kiện ra **EventBridge** (hoặc SNS/SQS), bạn bắt sự kiện đó bằng Lambda hay script trên máy, làm xong thì gọi `complete-lifecycle-action` để máy đi tiếp.

Nếu bạn không gọi, máy tự đi tiếp khi hết **heartbeat timeout** — mặc định **1 giờ**. Cần lâu hơn thì gửi heartbeat để gia hạn, nhưng tổng thời gian chờ tối đa là **48 giờ hoặc 100 lần heartbeat timeout, lấy số nhỏ hơn**. Với hook ở Lab 2 (`--heartbeat-timeout 300`): `100 × 300 giây = 30.000 giây ≈ 8,3 giờ`, chứ không phải 48 giờ.

> 🪤 Hook lúc terminate chỉ là "cố gắng hết mức": hết timeout thì máy vẫn bị tắt. Và với Spot Instance, hook **không** chặn được việc AWS thu hồi máy sau thông báo 2 phút.

### 2.4 Warm Pool
- Pre-initialized instance ở trạng thái **Stopped** hoặc **Hibernated**.
- Khi scale-out cần → bring from warm pool → fast (60s vs 2-3 phút launch fresh).
- Use case: app cold start lâu (Java JVM warm, large image).

Máy `Stopped` trong warm pool không tốn tiền compute, chỉ tốn tiền EBS volume. `Hibernated` thì lưu luôn nội dung RAM xuống EBS, nên bật lại không phải khởi động app từ đầu.

### 2.5 Instance Refresh

**Bài toán.** Bạn build AMI mới và tạo version 2 của Launch Template. Các máy **đang chạy không tự đổi theo**; chỉ máy bật sau này mới dùng version 2. Instance Refresh là lệnh bảo ASG: thay dần toàn bộ máy cũ bằng máy mới, theo từng lô, không làm sập dịch vụ.

**Cơ chế.** Tham số chính là **MinHealthyPercentage** — tỉ lệ máy phải còn khoẻ trong lúc thay. ASG tắt một lô máy cũ, bật máy mới, chờ máy mới qua health check và hết **instance warmup**, rồi mới sang lô kế tiếp.

```
10 instance, MinHealthyPercentage=90, InstanceWarmup=300 (đúng như Lab 3)

Phải giữ khoẻ: 10 × 90% = 9 máy   → mỗi lô chỉ thay được 1 máy
Mỗi lô ≈ 1 phút bật máy + 5 phút warmup = 6 phút
Cả đội ≈ 10 lô × 6 phút = khoảng 60 phút
```

Đặt MinHealthy = 100% thì ASG **bật máy mới trước rồi mới tắt máy cũ**, không lúc nào thiếu công suất. Đặt 0% thì thay tất cả cùng lúc (nhanh nhưng downtime). Ngoài ra có **checkpoint** (dừng lại ở 20% để bạn kiểm tra rồi mới đi tiếp), **skip matching** (bỏ qua máy đã đúng version), và huỷ/rollback giữa chừng.

**So với blue/green bằng một ASG thứ hai.** Blue/green nghĩa là dựng hẳn một ASG mới chạy bản mới, rồi chuyển traffic sang bằng load balancer hoặc DNS.

| | **Instance Refresh** (rolling, tại chỗ) | **Blue/green** (ASG thứ hai) |
|--|------------------------------------------|-------------------------------|
| Số máy phải trả tiền trong lúc deploy | Gần như không đổi | **Gấp đôi** cho tới khi tắt đội cũ |
| Thao tác | Một lệnh, không đụng tới load balancer hay DNS | Tạo ASG + target group mới, chuyển traffic, dọn đội cũ |
| Hai phiên bản cùng nhận traffic? | Có, trong suốt thời gian thay | Không — chuyển một lần |
| Rollback | Chạy refresh ngược lại, mất chừng ấy thời gian | Chuyển traffic về đội cũ, gần như tức thì |

Vậy Instance Refresh hợp hơn khi thay đổi **tương thích ngược** (vá AMI, nâng bản phụ) và bạn muốn rẻ, ít thao tác. Blue/green hợp hơn khi hai phiên bản **không thể chạy lẫn nhau** hoặc cần rollback trong vài giây.

### 2.6 Mixed Instances Policy

**Spot Instance là gì.** Là công suất EC2 đang dư mà AWS bán rẻ — tới **90%** so với giá **On-Demand** (giá thường, trả theo giây, không cam kết). Đổi lại, khi AWS cần lại công suất đó, bạn nhận **thông báo trước 2 phút** rồi máy bị thu hồi. Vì vậy Spot chỉ hợp với workload **stateless** hoặc chịu được gián đoạn: web server sau load balancer, batch job, worker đọc queue.

**Mixed Instances Policy** cho phép một ASG dùng **nhiều instance type** và **trộn On-Demand với Spot** theo tỉ lệ bạn chọn. Ba tham số ở Lab 5 nghĩa là:

```
OnDemandBaseCapacity = 2                     → 2 máy đầu tiên luôn là On-Demand (phần lõi không được mất)
OnDemandPercentageAboveBaseCapacity = 20     → phần vượt trên 2 máy: 20% On-Demand, 80% Spot

Desired = 12:
  Lõi On-Demand                    = 2
  Phần còn lại 10 máy: 20% × 10    = 2 On-Demand
                       80% × 10    = 8 Spot
  → 4 On-Demand + 8 Spot

Giả sử Spot đang rẻ hơn 70%:  4 × 1 + 8 × 0,3 = 6,4 "đơn vị giá On-Demand", so với 12 nếu toàn On-Demand
  → tiết kiệm khoảng 47% cho cả nhóm
```

Con số "tiết kiệm 60–90%" hay gặp là nói về **riêng phần Spot**; cả nhóm tiết kiệm bao nhiêu còn tuỳ tỉ lệ trộn.

**Vì sao phải khai nhiều instance type?** Spot được bán theo từng **pool** — một pool là một cặp *(instance type, AZ)*, ví dụ `m6i.large` ở `us-east-1a`. Mỗi pool có lượng hàng dư riêng và bị thu hồi độc lập. Khai 3 loại máy trên 3 AZ là có 9 pool để chọn; một pool cạn thì ASG lấy từ pool khác.

**Allocation strategy** quyết định lấy Spot từ pool nào:

| Strategy | Chọn pool theo tiêu chí | Hệ quả |
|----------|-------------------------|--------|
| **capacity-optimized** | Pool đang **dư nhiều công suất nhất** (theo dữ liệu real-time) | Ít bị thu hồi nhất, vì AWS thu hồi ở nơi sắp hết hàng trước. Giá không phải yếu tố |
| **price-capacity-optimized** | Vừa dư công suất vừa giá thấp | AWS **khuyến nghị hiện nay** cho đa số trường hợp |
| **lowest-price** | Pool rẻ nhất | Rủi ro bị thu hồi cao nhất, vì pool rẻ là pool nhiều người tranh. AWS khuyên không dùng |

> 🪤 Bẫy thi: *"giảm thiểu khả năng Spot bị gián đoạn"* → **capacity-optimized** (hoặc price-capacity-optimized nếu có trong đáp án). *"chi phí thấp nhất cho workload chịu được gián đoạn"* → ASG mixed instances với Spot. *"một phần công suất tuyệt đối không được mất"* → đặt **On-Demand base capacity**.

### 2.7 ASG bẫy
- **Cooldown hoặc instance warmup quá ngắn** → oscillation (scale-out rồi scale-in liên tục): ASG ra quyết định mới khi máy vừa bật còn chưa gánh tải. Với step/simple scaling, nguyên nhân còn lại là hai ngưỡng scale-out và scale-in đặt quá sát nhau — xem ví dụ 70/30 ở §2.2.
- **Health check EC2-only** → app crash nhưng máy ảo vẫn `running` → ASG coi là khoẻ, không replace. **Dùng ELB health check**.
- **Scale-in protection** off → instance đang xử lý long-running job bị kill giữa chừng. Bật protection cho máy đang chạy job (hoặc dùng lifecycle hook `Terminating:Wait`).
- **Termination Policy Default** đã ưu tiên máy dùng cấu hình cũ. Production muốn chắc chắn thay máy cũ trước khi rolling update thì set hẳn `OldestLaunchTemplate`.

---

## 3. Elastic Load Balancer

**Nó là gì.** Load balancer là một địa chỉ duy nhất đứng trước cả đội máy. Client chỉ biết địa chỉ đó; load balancer nhận kết nối, chọn một máy đang khoẻ phía sau (gọi là **target**) rồi chuyển tiếp. Máy chết thì nó ngừng gửi tới, máy mới thêm thì nó bắt đầu gửi — client không cần biết gì.

Bên trong, khi bạn bật load balancer ở AZ nào thì AWS đặt một **load balancer node** ở AZ đó. Tên DNS của load balancer trỏ tới IP của các node này, và client được chia đều tới các node. Chi tiết này quan trọng cho §3.6.

AWS có ba loại, khác nhau ở chỗ **load balancer đọc gói tin sâu tới đâu**. Mô hình OSI chia mạng thành các tầng; ba tầng liên quan ở đây:

| Tầng | Load balancer nhìn thấy gì | Loại ELB |
|------|----------------------------|----------|
| **Layer 3** (network) | Gói IP: địa chỉ nguồn, địa chỉ đích | **GLB** |
| **Layer 4** (transport) | Thêm giao thức TCP/UDP và số port | **NLB** |
| **Layer 7** (application) | Toàn bộ HTTP request: URL, host, header, cookie | **ALB** |

Đọc càng sâu thì định tuyến càng thông minh, nhưng phải làm nhiều việc hơn cho mỗi request.

### 3.1 So sánh 3 loại

**ALB (Application Load Balancer)** kết thúc kết nối của client tại chính nó, giải mã TLS, đọc hết HTTP request, rồi mở một kết nối khác tới target. Nhờ đọc được nội dung, nó định tuyến theo đường dẫn (`/api/*` vào đội này, `/images/*` vào đội kia), theo tên miền, theo header. Nó cũng gắn được **AWS WAF** (tường lửa lọc request độc hại như SQL injection) vì WAF cần đọc HTTP.

**NLB (Network Load Balancer)** không đọc nội dung. Nó nhìn IP và port của kết nối, băm ra một target, rồi chuyển **cả kết nối TCP** tới target đó cho tới khi kết nối đóng. Hệ quả của việc làm ít hơn:

- **Độ trễ thấp hơn và chịu tải dựng đứng tốt hơn ALB.** ALB phải giải mã TLS và phân tích HTTP cho từng request; NLB chỉ chuyển tiếp gói tin. AWS mô tả NLB xử lý **hàng triệu request mỗi giây** với độ trễ "extremely low" — AWS không công bố con số cụ thể; hãy hiểu là ALB thêm cỡ mili-giây cho mỗi request còn NLB thêm ít hơn mức đó rõ rệt.
- **Có IP tĩnh.** Mỗi AZ, NLB có đúng một IP cố định, và bạn gắn được **Elastic IP** (địa chỉ IPv4 public cố định thuộc về tài khoản của bạn) vào đó. ALB chỉ có tên DNS, IP đằng sau thay đổi khi nó tự scale.
- **Chạy được mọi giao thức trên TCP/UDP**, không chỉ HTTP: MQTT của IoT, game server UDP, database protocol.
- **Không** định tuyến theo URL, **không** gắn được WAF — vì nó không đọc HTTP.

**GLB (Gateway Load Balancer)** giải một bài toán khác hẳn: không phải chia tải cho app của bạn, mà **bắt mọi gói tin đi qua một đội thiết bị bảo mật** của hãng thứ ba (firewall Palo Alto, Fortinet, hệ thống phát hiện xâm nhập) trước khi tới app. Nó nhận mọi gói IP ở mọi port, bọc nguyên gói trong giao thức **GENEVE** (một kiểu đường hầm, port 6081, giữ nguyên gói gốc bên trong) gửi tới một appliance, appliance kiểm tra xong trả lại, GLB chuyển tiếp. Bạn đưa traffic vào GLB bằng cách sửa route table cho trỏ tới **GLB endpoint**. GLB còn tự scale và health check đội appliance đó.

**Hai thuật ngữ về TLS** dùng trong bảng dưới:

- **TLS termination (offload):** load balancer giữ certificate, giải mã HTTPS, rồi gửi tới target (thường là HTTP thường). Target không phải lo mã hoá.
- **TLS passthrough:** load balancer **không giải mã**, chuyển nguyên dòng byte đã mã hoá tới target; target tự giữ certificate. Dùng khi quy định bắt buộc mã hoá đầu-cuối. Chỉ NLB làm được (listener TCP), vì ALB bắt buộc phải giải mã mới đọc được HTTP.

**Bảng tổng hợp:**

| | **ALB** | **NLB** | **GLB** |
|--|---------|---------|---------|
| Layer | 7 | 4 | 3 (gateway) + 4 (chia tải) |
| Protocol | HTTP/HTTPS/gRPC/WebSocket | TCP/UDP/TLS | IP (bọc bằng GENEVE) |
| Static IP | Không — chỉ có tên DNS | **1 IP tĩnh mỗi AZ, gắn được EIP** | - |
| SSL terminate | ✅ | passthrough hoặc terminate | ❌ |
| Path/host routing | ✅ | ❌ | ❌ |
| WAF | ✅ | ❌ | ❌ |
| Sticky session | Cookie (app/duration) | Source IP | Theo flow (5-tuple) |
| Health check | HTTP/HTTPS | TCP/HTTP/HTTPS | TCP/HTTP/HTTPS |
| Cross-zone LB (§3.6) | Luôn ON, không tính phí | Mặc định OFF, bật thì tính phí cross-AZ | Mặc định OFF |
| Latency thêm vào | Cỡ mili-giây (do phân tích HTTP) | Thấp hơn ALB rõ rệt, AWS gọi là "extremely low" | - |
| Use case | Web, microservice, container | Game, IoT, extreme perf, static IP | Third-party firewall (Palo Alto, Fortinet) |

> 🪤 Bẫy thi: thấy *path-based / host-based routing, WAF, đăng nhập Cognito, Lambda làm target* → **ALB**. Thấy *static IP, Elastic IP, UDP, giao thức không phải HTTP, hàng triệu request/giây, giữ nguyên TLS tới backend* → **NLB**. Thấy *third-party virtual appliance, inspect toàn bộ traffic, GENEVE* → **GLB**. Cần **cả** IP tĩnh **và** tính năng Layer 7 → đặt **NLB phía trước ALB** (NLB nhận ALB làm target), hoặc dùng Global Accelerator.

### 3.2 ALB features

**Một request đi qua ALB qua ba chặng.** Nắm được ba khái niệm này là đọc được mọi cấu hình ALB:

1. **Listener** — "cổng nghe": một cặp giao thức + port mà ALB mở ra, ví dụ HTTPS:443. Certificate TLS gắn ở đây.
2. **Rule** — các luật của listener, xét **theo thứ tự ưu tiên**. Mỗi rule gồm *điều kiện* và *hành động*. Rule nào khớp trước thì áp; không khớp rule nào thì dùng rule mặc định.
3. **Target group** — một nhóm target cùng làm một việc, kèm cấu hình health check riêng. ALB chọn một target khoẻ trong nhóm (mặc định xoay vòng round robin) và gửi request tới.

```
Listener HTTPS:443
  Rule 1: host = api.example.com          → forward tới target group "api"      (ECS task)
  Rule 2: path = /images/*                → forward tới target group "images"   (EC2 trong ASG)
  Rule 3: path = /old-blog/*              → redirect 301 sang /blog/
  Mặc định                                → forward tới target group "web"
```

Nhờ vậy **một ALB phục vụ được nhiều service**, mỗi service một target group — đây là lý do ALB là lựa chọn chuẩn cho microservice và container.

Các tính năng cụ thể:

- **Target type**: target group chứa được EC2 instance (theo instance ID), địa chỉ IP (container, máy on-premises qua VPN/Direct Connect), hoặc một **Lambda function**. Với ECS, mỗi task tự đăng ký và tự gỡ khỏi target group khi nó khởi động hay dừng.
- **Điều kiện của rule**: path, host, HTTP header, query string, HTTP method, source IP.
- **Hành động của rule**: forward tới target group (chia theo trọng số được, ví dụ 90/10 để canary), redirect (thường dùng cho HTTP → HTTPS), trả luôn fixed response, hoặc yêu cầu đăng nhập.
- **Built-in auth**: ALB tự chuyển user chưa đăng nhập sang **Cognito** hoặc một nhà cung cấp danh tính chuẩn **OIDC** (Google, Okta…), nhận kết quả, rồi mới cho request vào app. App không phải viết code đăng nhập.
- **Slow start**: target mới không nhận ngay phần chia đầy đủ; ALB tăng dần **tuyến tính** trong 30–900 giây. Với slow start 120 giây và phần chia đầy đủ là 1.000 request/giây, sau 30 giây target nhận khoảng 250 request/giây, sau 60 giây khoảng 500. Dùng cho app cần làm nóng cache hoặc JIT.
- **WebSocket + HTTP/2 + gRPC** native.
- **Outpost / Local Zone** support.

### 3.3 NLB features
- **Static IP per AZ** (gắn được EIP) — firmware IoT hardcode IP được, đối tác whitelist IP trên firewall được.
- **TLS passthrough** — không decrypt, chuyển raw tới backend (listener TCP).
- **TLS terminate** cũng có (listener TLS), khi muốn NLB giữ certificate.
- **Cross-zone LB OFF** mặc định: traffic vào node ở AZ A chỉ tới target ở AZ A. Đỡ tiền cross-AZ và cô lập sự cố theo AZ, nhưng tải lệch nếu số target mỗi AZ không đều — xem §3.6.
- **UDP** support (trong ba loại chỉ NLB nhận traffic UDP cho app của bạn).
- **Preserve client IP**: target nhìn thấy đúng IP của client ở tầng mạng, vì NLB không mở kết nối mới thay client. Mặc định bật khi target đăng ký theo instance ID; target đăng ký theo IP với TCP/TLS thì mặc định tắt và phải tự bật. ALB thì luôn thay IP nguồn bằng IP của nó, nên app phải đọc header **`X-Forwarded-For`**.

### 3.4 Sticky Session

**Sticky session** (session affinity) nghĩa là load balancer gửi mọi request của cùng một client tới **cùng một target**, thay vì chia đều. Người ta cần nó khi app giữ dữ liệu phiên (giỏ hàng, trạng thái đăng nhập) trong RAM của từng máy: request sau mà rơi vào máy khác thì mất phiên.

- **ALB** nhận diện client bằng cookie:
  - **Duration-based**: ALB tự tạo cookie tên `AWSALB` ghi target đã chọn. Thời hạn dính do bạn đặt, từ 1 giây tới 7 ngày (mặc định 1 ngày).
  - **Application-based**: app của bạn đặt cookie riêng, ALB bám theo cookie đó.
- **NLB**: không đọc được cookie nên bám theo **source IP**. Mọi client đứng sau cùng một NAT (cả văn phòng chung một IP public) sẽ dồn vào một target.
- ⚠️ Sticky session = chống stateless. Target bị tắt khi scale-in thì mọi phiên dính vào nó mất; target mới thêm thì không được chia bớt các phiên cũ nên tải lệch. Avoid khi có thể, dùng external session store (ElastiCache, DynamoDB) để máy nào cũng đọc được phiên.

### 3.5 Connection Draining (Deregistration Delay)
- Khi target deregister, ELB chờ in-flight request hoàn thành.
- Default 300s, max 3600s.
- ASG terminating:wait + deregistration delay → graceful shutdown.

### 3.6 Cross-Zone Load Balancing

Nhắc lại từ đầu §3: mỗi AZ có một load balancer node, và client được DNS chia **đều giữa các node**, không phải đều giữa các target. Cross-zone là câu trả lời cho câu hỏi: node ở AZ-a có được gửi sang target ở AZ-b không?

- **ON**: mỗi node chia traffic cho **mọi target ở mọi AZ**. Kết quả: mọi target nhận như nhau.
- **OFF**: mỗi node chỉ chia cho target **trong AZ của nó**. Kết quả: mỗi AZ nhận phần bằng nhau, rồi chia cho số target mà AZ đó có.

Hai cách cho kết quả giống nhau khi các AZ có số target bằng nhau. Chúng khác xa khi lệch:

```
3 AZ, tổng 9.000 request/giây → mỗi node nhận 3.000 request/giây
Target: AZ-a có 6, AZ-b có 2, AZ-c có 1

Cross-zone OFF:
  AZ-a: 3.000 ÷ 6 =   500 request/giây mỗi target   (5,6% tổng tải)
  AZ-b: 3.000 ÷ 2 = 1.500 request/giây mỗi target   (16,7%)
  AZ-c: 3.000 ÷ 1 = 3.000 request/giây cho 1 target (33,3%) → gấp 6 lần target ở AZ-a, dễ sập

Cross-zone ON:
  9.000 ÷ 9 = 1.000 request/giây mỗi target (11,1%), không phân biệt AZ
```

**Vì sao mặc định lại khác nhau giữa ALB và NLB?**

| | Mặc định | Phí |
|--|----------|-----|
| **ALB** | **Luôn ON** ở mức load balancer, không tắt được ở mức đó; chỉ tắt được cho từng target group | Không tính phí data transfer giữa AZ |
| **NLB** | **OFF**, bật được bất cứ lúc nào | Bật thì **trả phí data transfer giữa các AZ** cho phần traffic chạy chéo |
| **GLB** | **OFF** | Như NLB |

Vì sao có người chủ động để OFF? Ngoài tiền, OFF giúp **cô lập sự cố theo AZ** (AZ này trục trặc không kéo traffic của AZ khác sang) và giữ traffic trong cùng AZ nên độ trễ thấp hơn một chút. Đổi lại, bạn phải tự bảo đảm mỗi AZ có đủ target cho phần tải của nó — ASG chia đều máy giữa các AZ chính là để phục vụ điều này.

> 🪤 Bẫy thi: *"NLB, một số instance quá tải trong khi instance khác rảnh, số instance mỗi AZ không đều"* → **bật cross-zone load balancing**. *"ALB có tính phí cross-zone không?"* → không.

---

## 4. Hands-on

### Lab 1 — ASG + ALB classic 3-tier
1. Launch Template `app-lt` với user-data nginx.
2. Target Group `app-tg` health check `/`.
3. ALB ở 2 public subnet, target group `app-tg`.
4. ASG min=2, desired=2, max=6, target tracking CPU 50%.
5. Generate load (`ab` hoặc `wrk`) → xem ASG scale out.

### Lab 2 — Lifecycle hook drain
```bash
aws autoscaling put-lifecycle-hook \
  --auto-scaling-group-name app-asg \
  --lifecycle-hook-name drain-on-terminate \
  --lifecycle-transition autoscaling:EC2_INSTANCE_TERMINATING \
  --heartbeat-timeout 300 \
  --notification-target-arn arn:aws:sns:...:drain-topic \
  --role-arn arn:aws:iam::...:role/asg-lifecycle
```

Lambda subscribe SNS → call ELB deregister → wait → complete-lifecycle-action.

### Lab 3 — Instance Refresh rolling update
```bash
aws autoscaling start-instance-refresh \
  --auto-scaling-group-name app-asg \
  --preferences MinHealthyPercentage=90,InstanceWarmup=300
```

### Lab 4 — NLB với static IP
```bash
aws elbv2 create-load-balancer --name learn-nlb --type network \
  --scheme internet-facing \
  --subnet-mappings SubnetId=subnet-a,AllocationId=eipalloc-1 \
                    SubnetId=subnet-b,AllocationId=eipalloc-2
```

### Lab 5 — Mixed instance + Spot
Launch template + ASG với:
```bash
--mixed-instances-policy '{
  "LaunchTemplate": {
    "LaunchTemplateSpecification": {"LaunchTemplateName":"app-lt","Version":"$Latest"},
    "Overrides": [
      {"InstanceType":"m6i.large"},{"InstanceType":"m6a.large"},{"InstanceType":"m7g.large"}
    ]
  },
  "InstancesDistribution": {
    "OnDemandBaseCapacity": 2,
    "OnDemandPercentageAboveBaseCapacity": 20,
    "SpotAllocationStrategy": "capacity-optimized"
  }
}'
```

---

## 5. Tự kiểm tra

1. ASG ở 3 AZ, desired=3. 1 AZ down. ASG làm gì?
   <details><summary>Đáp án</summary>Phát hiện instance unhealthy → launch instance mới ở AZ khác (tự rebalance). Có thể tạm 4 instance trong lúc rebalance.</details>

2. App Java JVM mất 60s warm up. Scaling slow. Solution?
   <details><summary>Đáp án</summary>**Warm Pool** với instance stopped, scale-out bring lên nhanh. Hoặc lifecycle hook `pending:wait` để health check đợi đủ thời gian warm.</details>

3. App có session in-memory. Scale-out → user mất session. Fix?
   <details><summary>Đáp án</summary>**Sticky session** (quick fix nhưng anti-pattern). **Tốt hơn**: externalize session vào **ElastiCache Redis** hoặc DynamoDB → stateless app.</details>

4. Cần static IP cho legacy partner whitelist. ALB hay NLB?
   <details><summary>Đáp án</summary>**NLB** — có EIP per AZ. ALB không có static IP.</details>

5. WebSocket app. ALB hay NLB?
   <details><summary>Đáp án</summary>**ALB** — native WS. NLB cũng được nhưng mất feature L7.</details>

6. Cross-zone LB tắt. Target 3 AZ unbalanced (AZ-a 6, AZ-b 2, AZ-c 1). Hậu quả?
   <details><summary>Đáp án</summary>Mỗi AZ nhận 1/3 traffic, nên target duy nhất ở AZ-c gánh 33,3% tổng tải — gấp 6 lần mỗi target ở AZ-a (5,6%) — bị overload trong khi AZ-a thừa (phép tính ở §3.6). **Cross-zone ON** giải quyết: mỗi target nhận 11,1%. NLB OFF default → cẩn thận hoặc ON với cost.</details>

7. ASG scale-out OK nhưng scale-in oscillation. Sao?
   <details><summary>Đáp án</summary>Cooldown / instance warmup quá ngắn, hoặc ngưỡng scale-out và scale-in quá sát nhau. Tăng cooldown (hay warmup), dùng dual-threshold (scale-out 70%, scale-in 30%) — xem ví dụ ở §2.2. Hoặc chuyển sang target tracking, vốn tự tránh flapping.</details>

8. ALB target group có 5 EC2, 1 unhealthy. ASG có replace không?
   <details><summary>Đáp án</summary>Chỉ khi ASG dùng **ELB health check**, không phải EC2 health check. Default là EC2 → app crash mà EC2 OK = không replace. (ALB thì vẫn tự ngừng gửi traffic tới target unhealthy trong cả hai trường hợp; khác biệt là máy hỏng có được thay hay không.)</details>

---

## 6. Đối chiếu GCP

| AWS | GCP |
|-----|-----|
| ASG | **MIG (Managed Instance Group)** |
| Launch Template | **Instance Template** |
| Target Tracking | **Autoscaling target metric** |
| Lifecycle hook | **MIG lifecycle hook** (limited) |
| Warm Pool | **MIG suspended instance** (gần tương đương) |
| Mixed Spot+OD | **Spot VM in MIG** |
| ALB | **HTTPS Load Balancer (global)** hoặc **Regional ALB** |
| NLB | **Network LB** (regional/global) |
| GLB | **không có direct** — dùng custom appliance VM |
| Cross-zone LB | **Cross-region** built-in cho Global LB |
| Sticky session | **Session affinity** (CLIENT_IP, GENERATED_COOKIE) |
| Health check | Health check object reusable |

**Bẫy:**
1. GCP **Global LB anycast IP** built-in (anycast: cùng một IP được quảng bá từ nhiều nơi trên thế giới, client tự vào điểm gần nhất). AWS phải **Global Accelerator + Regional ALB**.
2. AWS **NLB cross-zone OFF default** → tính phí cross-AZ. GCP regional LB intra-region free.
3. GCP MIG **không có warm pool sâu** như AWS. Workload cold start lâu thường dùng pre-built image hoặc keep min instance cao.

---

## 7. Lưu ý SAA

- **ALB**: L7, host/path/header/query routing, WebSocket, gRPC, Lambda target, Cognito auth.
- **NLB**: L4, static IP, UDP, TLS passthrough, extreme perf, cross-zone OFF default.
- **GLB**: L3 cho third-party firewall via GENEVE.
- **Target Tracking** ưu tiên (đơn giản). **Step** khi cần fine control. **Predictive** khi pattern lặp lại.
- **Lifecycle hook + SQS/Lambda** cho graceful drain.
- **Warm Pool** cho cold start.
- **Mixed + Spot capacity-optimized** save cost.
- **Instance Refresh** rolling update launch template.
- **Cross-zone LB**: ALB ON free, NLB OFF default.
- **Sticky session anti-pattern** — externalize state.

## 8. Lưu ý đi làm

### Production checklist
- [ ] ASG min ≥ 2, multi-AZ ≥ 3.
- [ ] Health check ELB (không phải EC2).
- [ ] Lifecycle hook drain on terminate.
- [ ] Instance Refresh + Launch Template versioning.
- [ ] Mixed Spot + On-Demand base (capacity-optimized).
- [ ] Target tracking + dual-threshold scale-in/out.
- [ ] CloudWatch alarm: RequestCount, HealthyHostCount, UnHealthyHostCount, TargetResponseTime.
- [ ] X-Ray trace ALB request.
- [ ] Tag `Project`, `Environment`, `AutoStop` cho FinOps.

### Anti-pattern
- ❌ Sticky session làm stateful.
- ❌ Self-managed nginx LB trên EC2 thay ALB.
- ❌ Single AZ ASG.
- ❌ Health check EC2-only.
- ❌ NLB cross-zone bật trên workload không cần (cost cross-AZ).
- ❌ ALB không gắn WAF cho public app.

## 9. Foundations
Bài 18 (DR/HA) sẽ dùng concept failure modes — load balancer + ASG là core của HA pattern.

## 10. Flashcard

- **ASG** — auto-scale EC2 multi-AZ.
- **Launch Template** > Launch Config (versioning).
- **Target Tracking** default. **Step** fine control. **Predictive** ML.
- **Lifecycle Hook** — pending:wait, terminating:wait, max 48h.
- **Warm Pool** — pre-init stopped/hibernate instance.
- **Instance Refresh** — rolling update.
- **Mixed Instances + Spot** — save cost.
- **ALB** L7, WebSocket, host/path, Cognito auth.
- **NLB** L4, static IP, UDP, độ trễ thấp hơn ALB.
- **GLB** L3, GENEVE, third-party firewall.
- **Cross-zone LB** ALB ON free, NLB OFF default.
- **Deregistration delay** = connection draining.
- **Slow start** — ramp traffic to new target.
- **Sticky session** = anti-pattern (use external store).
- **Health check ELB** > EC2-only.
