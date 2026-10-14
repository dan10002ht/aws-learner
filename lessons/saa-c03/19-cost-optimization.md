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

Một EC2 instance cùng cấu hình có thể có giá chênh nhau gần 10 lần tuỳ **cách bạn mua**. Phần này đi theo thứ tự: các cách mua là gì (§3.1), hai cách hay ra đề nhất là Savings Plans (§3.2) và Spot (§3.4), rồi tới các cách giảm tiền không liên quan tới cách mua: chọn đúng cỡ máy, đổi sang chip ARM, tắt máy ngoài giờ.

Giá trong bài là giá **us-east-1**, làm tròn, để có mốc so sánh. Đề thi không hỏi giá chính xác, chỉ hỏi cái nào rẻ hơn và vì sao.

### 3.1 Pricing model selection

Có sáu cách "mua" compute. Hiểu từng cái đánh đổi cái gì thì cây quyết định ở cuối mục tự suy ra được.

- **On-Demand** là giá niêm yết: trả theo giây, không cam kết gì, tắt lúc nào cũng được. Mọi mức giảm giá bên dưới đều được tính so với mốc này.
- **Savings Plans (SP)**: bạn cam kết **tiêu tối thiểu một số tiền mỗi giờ** trong 1 hoặc 3 năm, đổi lại AWS tính giá thấp hơn cho phần dùng nằm trong cam kết. Giảm tối đa 66–72%. Chi tiết ở §3.2.
- **Reserved Instance (RI)**: kiểu cam kết đời trước của SP. Bạn cam kết **một cấu hình cụ thể** (ví dụ `m5.large`, Linux, us-east-1) trong 1 hoặc 3 năm thay vì cam kết một số tiền. Chi tiết ở §3.2.
- **Spot**: thuê phần máy chủ AWS **đang để trống**, rẻ hơn tới 90%, nhưng AWS được quyền đòi lại bất cứ lúc nào với cảnh báo trước 2 phút. Chi tiết ở §3.4.
- **Dedicated Host**: thuê **nguyên một máy chủ vật lý**, không chia sẻ với khách hàng khác, và bạn nhìn thấy được số socket/core của nó. Lý do chính để dùng là **BYOL** (Bring Your Own License — mang giấy phép phần mềm đã mua sẵn lên cloud): license Windows Server, SQL Server, Oracle kiểu cũ được cấp **theo socket hoặc core vật lý**, nên phải chỉ ra được máy vật lý nào đang chạy nó. Đây là lựa chọn đắt nhất, chỉ dùng khi license hoặc quy định tuân thủ bắt buộc.
- **Capacity Reservation** (On-Demand Capacity Reservation): **giữ chỗ** một số instance thuộc một loại, trong một AZ cụ thể. Nó **không giảm giá** — bạn trả giá On-Demand cho chỗ đã giữ kể cả khi không chạy instance nào. Cái mua được là sự chắc chắn: khi cần bật máy (ví dụ lúc failover sang region DR) thì không bị lỗi hết capacity. Muốn vừa giữ chỗ vừa được giảm giá thì mua thêm SP hoặc RI, vì hai thứ đó áp lên được usage của Capacity Reservation.

| Cách mua | Giảm so với On-Demand | Bạn đánh đổi gì |
|----------|-----------------------|-----------------|
| On-Demand | 0% | Không gì cả |
| Compute Savings Plan | Tới 66% | Cam kết $/giờ trong 1–3 năm |
| EC2 Instance Savings Plan | Tới 72% | Cam kết $/giờ, khoá vào một family + một region |
| Reserved Instance | Tới 72% (Standard), tới 66% (Convertible) | Cam kết một cấu hình cụ thể 1–3 năm |
| Spot | Tới 90% | Có thể bị thu hồi sau cảnh báo 2 phút |
| Dedicated Host | Đắt hơn | Trả cả máy vật lý, đổi lấy BYOL / compliance |
| Capacity Reservation | 0% | Trả cả khi không dùng, đổi lấy chỗ được đảm bảo |

Từ đó ra cây quyết định:

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

"Baseline" là phần tải **lúc nào cũng có**: nếu hệ thống chạy ít nhất 10 instance vào giờ thấp điểm nhất và lên 30 vào giờ cao điểm, thì baseline là 10. Chỉ nên cam kết cho phần baseline, vì phần cam kết phải trả tiền dù có dùng hay không.

> 🪤 Bẫy thi: "cần đảm bảo có capacity ở một AZ cho đợt sự kiện ngắn, không muốn cam kết 1 năm" → **Capacity Reservation** (tạo và huỷ lúc nào cũng được). "Cần giảm chi phí cho workload chạy đều" → SP/RI. Hai câu hỏi khác nhau: một cái mua **chỗ**, một cái mua **giá**.

### 3.2 Savings Plans deep

**Cơ chế.** Bạn không mua máy, bạn hứa **một mức chi tiêu theo giờ**, ví dụ "$7 mỗi giờ trong 1 năm". Mỗi giờ, AWS lấy usage compute của bạn, tính theo **giá SP** (thấp hơn giá On-Demand), rồi trừ dần vào $7 đó. Có ba trường hợp:

```
Giả sử: 1 instance giá On-Demand $0,10/giờ, giá SP $0,07/giờ (giảm 30%, số minh hoạ).
Cam kết $7/giờ  →  vừa đủ phủ 100 instance ($7 ÷ $0,07).

Giờ chạy đúng 100 instance:  trả $7                      (On-Demand sẽ là $10)
Giờ chạy 120 instance:       $7 + 20 × $0,10 = $9        (20 máy vượt cam kết tính giá On-Demand; On-Demand toàn bộ là $12)
Giờ chạy 60 instance:        vẫn trả $7                  (chỉ dùng hết $4,20 cam kết, $2,80 còn lại mất trắng;
                                                          On-Demand chỉ $6 → giờ này bạn LỖ so với không mua SP)
```

Hai điều rút ra: dùng **vượt** cam kết thì không bị phạt, phần vượt chỉ quay về giá On-Demand; còn dùng **thiếu** thì tiền cam kết của giờ đó mất, không cộng dồn sang giờ sau. Vì vậy cam kết quá tay (over-commit) mới là rủi ro, và SP không huỷ, không đổi được sau khi mua.

**Các loại Savings Plans**, khác nhau ở chỗ cam kết bị khoá chặt tới đâu:

- **Compute SP** (flexible) — giảm tới **66%**. Áp cho EC2 **bất kể family, size, region, OS, tenancy**, và áp luôn cho **Fargate** và **Lambda**. Đổi từ `c5` sang `m7g`, chuyển region, hay chuyển app từ EC2 sang Fargate thì vẫn được giảm.
- **EC2 Instance SP** — giảm tới **72%**, đây là "max discount". Đổi lại bị khoá vào **một family trong một region** (ví dụ `m5` ở us-east-1). Trong family đó vẫn đổi được size, OS và tenancy. Không áp cho Fargate hay Lambda.
- **SageMaker SP** — giảm tới 64%, cho usage của SageMaker (ML workload).
- **Database SP** — loại mới, giảm tới 35% cho Aurora, RDS, DynamoDB, ElastiCache… Tài liệu ôn thi SAA-C03 phần lớn viết trước khi có loại này, nên với đề thi, cam kết cho database vẫn là **RI** (§7.1) và **Reserved Capacity** (§7.3).

Quy luật chung: **càng linh hoạt thì giảm càng ít**. AWS giảm sâu hơn khi bạn chịu khoá vào đúng loại máy họ dễ lập kế hoạch.

**Commitment** tính bằng $/hour cho kỳ hạn **1 hoặc 3 năm**; 3 năm giảm sâu hơn 1 năm.

**Payment** có ba kiểu: **All upfront** (trả hết ngay), **Partial upfront** (trả trước khoảng một nửa, còn lại chia theo tháng), **No upfront** (chia đều theo tháng). All upfront có mức giảm cao nhất, No upfront thấp nhất, nhưng chênh nhau chỉ vài điểm phần trăm. Con số "tới 72%" là của tổ hợp cực đoan nhất: EC2 Instance SP + 3 năm + All upfront.

**Reserved Instance khác SP ở đâu.** RI cam kết **một cấu hình**, không phải một số tiền:

- **Standard RI** — giảm tới **72%**, gắn với instance type + region + OS + tenancy. Không đổi được family; bán lại được trên RI Marketplace.
- **Convertible RI** — giảm tới **66%**, được đổi sang family/OS khác trong kỳ hạn miễn giá trị mới bằng hoặc cao hơn.
- RI mua theo **region** thì áp cho mọi AZ trong region nhưng **không giữ chỗ**. RI mua theo **AZ** (zonal) thì kèm luôn capacity reservation ở AZ đó.

Mức giảm của Standard RI ngang EC2 Instance SP, của Convertible RI ngang Compute SP, nhưng SP tự áp vào usage nào khớp mà không cần bạn theo dõi từng cấu hình. Vì thế với EC2, SP đã thay RI trong hầu hết trường hợp ("RI legacy"). RI vẫn là cách cam kết chính cho **RDS, ElastiCache, Redshift, OpenSearch**.

> 🪤 Bẫy thi: **Spot không được tính vào Savings Plans** — tiền Spot không trừ vào cam kết SP, và SP không giảm thêm cho Spot. Và SP/RI chỉ giảm **giá**, không đảm bảo **capacity** (trừ zonal RI).

→ Recommendation: bắt đầu **Compute SP 1y no-upfront** sau khi workload ổn định 1 tháng. Lý do: Compute SP ít rủi ro khoá nhầm nhất, 1 năm ngắn đủ để sửa sai, no-upfront không chôn vốn. Mức cam kết lấy theo baseline, có thể xem gợi ý sẵn trong Cost Explorer (mục Savings Plans recommendations).

### 3.3 Right-sizing

**Right-sizing** là chọn cỡ instance vừa với tải thật. Một `m5.2xlarge` (8 vCPU) mà CPU chỉ quanh 10% thì hạ xuống `m5.large` (2 vCPU) giảm ngay 75% tiền máy đó — và việc này nên làm **trước** khi mua SP, kẻo cam kết luôn cho phần lãng phí.

- **Compute Optimizer** (free) — đọc metric CloudWatch của **14 ngày gần nhất** rồi gợi ý cỡ phù hợp hơn cho EC2, Auto Scaling group, EBS, Lambda (và cả RDS, ECS trên Fargate). Bật tính năng trả phí *enhanced infrastructure metrics* thì nhìn lại được 93 ngày, hợp với workload có chu kỳ theo tháng. Lưu ý: mặc định nó không thấy **RAM** của EC2, vì CloudWatch không có metric memory nếu bạn chưa cài CloudWatch agent.
- **Trusted Advisor** — bộ kiểm tra tự động của AWS, trong đó có nhóm cost: chỉ ra EC2 idle (CPU rất thấp nhiều ngày liền), EBS không gắn vào đâu, EIP không dùng. Bộ kiểm tra cost đầy đủ cần gói support Business trở lên.
- Verify **peak** + **headroom**, không chỉ avg. CPU trung bình 20% nhưng mỗi ngày có 1 giờ lên 90% thì hạ một nửa cỡ máy sẽ làm giờ đó quá tải. Xem p95/p99 và chừa lại khoảng trống trước khi hạ.

### 3.4 Spot

**Nó là gì.** Ở mỗi AZ, AWS luôn có một lượng máy chủ chưa ai thuê. Thay vì để trống, AWS cho thuê số đó với giá **Spot**, rẻ hơn On-Demand **tới 90%**. Giá Spot do AWS đặt cho từng loại instance ở từng AZ và thay đổi chậm theo cung cầu dài hạn; bạn không còn phải đấu giá như thời trước.

**Cái giá phải trả.** Khi có khách On-Demand cần đúng chỗ máy đó, AWS **thu hồi** instance Spot của bạn. Bạn nhận được một **cảnh báo trước 2 phút** (*Spot interruption notice*, đọc được qua instance metadata hoặc EventBridge), sau đó instance bị terminate, stop hoặc hibernate tuỳ cấu hình. Hai phút là đủ để ngừng nhận request mới và lưu vị trí đang xử lý, không đủ để chạy nốt một job dài.

Từ đó suy ra vì sao workload Spot phải **stateless và retryable**: mọi thứ nằm trên máy (session trong RAM, file tạm trên đĩa local, job đang chạy dở) có thể biến mất sau 2 phút. Workload chịu được điều đó là workload **làm lại được** mà không ai thấy:

- **CI**, **batch**, **ML training** có checkpoint — bị ngắt thì chạy lại từ bước gần nhất.
- **Stateless web** sau load balancer — mất một máy thì các máy khác gánh, ASG bật máy thay.
- Không hợp: database tự quản, máy giữ state duy nhất, job dài không có checkpoint.

**Giảm xác suất bị ngắt hàng loạt.** Mỗi cặp (loại instance, AZ) là một **Spot capacity pool** riêng, có lượng máy trống riêng. Nếu bạn chỉ xin `c5.large` ở một AZ, khi pool đó cạn thì cả đội máy bị thu hồi cùng lúc. Vì vậy:

- **Spot Fleet** (hoặc ASG với mixed instances policy) cho bạn khai báo **nhiều instance type trên nhiều AZ**, ví dụ `c5.large`, `c5a.large`, `m5.large` × 3 AZ = 9 pool. Một pool cạn thì chỉ mất phần máy nằm trong pool đó, và fleet tự xin bù từ pool khác.
- **Capacity-Optimized** allocation strategy: khi xin máy, fleet chọn pool đang **trống nhiều nhất**, tức là pool ít có khả năng bị thu hồi nhất trong thời gian tới. Đây là từ khoá đề thi hay dùng cho "minimize interruption". Docs hiện tại khuyên dùng **price-capacity-optimized** cho đa số trường hợp: vẫn ưu tiên pool trống nhiều, rồi chọn cái rẻ nhất trong số đó. Chiến lược **lowest-price** (chỉ nhìn giá) bị ngắt nhiều nhất và không còn được khuyên dùng.
- **Spot Block** (deprecated, no longer available 2021+): từng cho đặt Spot chạy cố định 1–6 giờ không bị ngắt. Nếu đáp án nhắc tới nó thì đó là đáp án cũ.
- **Spot Hibernation** — save state khi reclaim: thay vì terminate, instance được **hibernate**, tức RAM được ghi xuống EBS root volume; khi có capacity lại, instance bật lên tiếp tục từ đúng chỗ dừng. Trong lúc ngủ chỉ trả tiền EBS.

> 🪤 Bẫy thi: Spot ngừng do **AWS thu hồi capacity**, không phải do bạn "trả giá thấp". Và "workload không được phép gián đoạn" thì loại Spot ngay, dù đề bài nhấn mạnh rẻ nhất.

### 3.5 Graviton
- **Graviton** là dòng CPU kiến trúc **ARM** do AWS tự thiết kế, thay cho CPU x86 của Intel/AMD. AWS không phải trả phần lãi cho hãng chip nên bán rẻ hơn.
- Giá theo giờ thấp hơn khoảng **20%** so với instance x86 tương đương: `m7g.large` ~$0,0816/giờ so với `m7i.large` ~$0,1008/giờ, tức rẻ hơn 19%. Cộng thêm hiệu năng trên mỗi vCPU thường nhỉnh hơn, tài liệu ôn thi hay ghi **20-40% rẻ hơn cho cùng perf** (price-performance).
- Điều kiện là code chạy được trên ARM. Workload portable: Go/Java/Python/Node/Ruby chỉ cần build lại hoặc đổi base image. Phần mềm chỉ phát hành binary x86 thì không chuyển được.
- Suffix `g` trong family (m7g, c7g, r7g) là dấu hiệu nhận biết.

### 3.6 Schedule stop/start
- **Instance Scheduler** (CFN solution) hoặc Lambda + EventBridge: tự stop/start EC2 và RDS theo lịch gắn bằng tag.
- Dev/test stop 18:00 → start 9:00 weekday, nghỉ luôn cuối tuần:

```
Chạy:  9 giờ/ngày × 5 ngày = 45 giờ / 168 giờ một tuần ≈ 27%
→ tiết kiệm ~73% tiền compute
Lịch rộng hơn, chạy 12 giờ/ngày × 5 ngày = 60/168 giờ → tiết kiệm ~64% (mốc "save 60%" hay gặp)
```

- Instance stop rồi vẫn trả tiền **EBS volume** và Elastic IP; chỉ phần compute là về 0.

### 3.7 Lambda

Lambda tính tiền theo **GB-giây**: lượng memory cấp cho function × thời gian chạy, cộng một khoản nhỏ theo số request.

- **Right-size memory** (Compute Optimizer cho Lambda). Tăng memory thì Lambda cấp thêm CPU theo tỉ lệ, nên function chạy nhanh hơn; có khi gấp đôi memory làm thời gian chạy giảm hơn một nửa và tổng tiền lại **giảm**. Vì vậy phải đo, không đoán.
- **Provisioned Concurrency** giữ sẵn một số môi trường chạy luôn "ấm" để không bị cold start (độ trễ khởi tạo lần gọi đầu). Bạn trả tiền theo giờ cho phần giữ sẵn **dù không có request nào**: 1 môi trường 1 GB giữ cả tháng ~$11. Chỉ dùng cho production critical cần độ trễ ổn định.
- **arm64** Graviton cho Lambda → giá mỗi GB-giây rẻ hơn **20%** so với x86.

---

## 4. Storage cost

### 4.1 S3 class strategy

S3 có nhiều **storage class** — các hạng lưu trữ cho cùng một object, khác nhau ở giá. Nguyên tắc chung của mọi hạng lạnh: **tiền lưu rẻ hơn, đổi lại tiền lấy ra đắt hơn và có thêm ràng buộc**. Chọn class là đoán xem dữ liệu sẽ được đọc thường xuyên tới đâu.

| Class | Lưu (~$/GB-tháng) | So với Standard | Phí lấy ra | Thời gian lấy | Lưu tối thiểu |
|-------|-------------------|-----------------|------------|---------------|---------------|
| **Standard** | 0,023 | — | Không | ms | Không |
| **Standard-IA** (Infrequent Access) | 0,0125 | rẻ hơn 46% | $0,01/GB | ms | 30 ngày |
| **One Zone-IA** (chỉ 1 AZ) | 0,01 | rẻ hơn 57% | $0,01/GB | ms | 30 ngày |
| **Glacier Instant Retrieval** | 0,004 | rẻ hơn 83% | $0,03/GB | ms | 90 ngày |
| **Glacier Flexible Retrieval** | 0,0036 | rẻ hơn 84% | Tuỳ tốc độ (bulk miễn phí) | Phút → giờ | 90 ngày |
| **Glacier Deep Archive** | 0,00099 | rẻ hơn 96% | $0,02/GB (standard) | ~12 giờ | 180 ngày |

Lấy 1 TB log làm ví dụ:

```
1.024 GB × $0,023   = $23,55/tháng  ở Standard
1.024 GB × $0,0125  = $12,80/tháng  ở Standard-IA
1.024 GB × $0,004   = $4,10/tháng   ở Glacier Instant Retrieval
1.024 GB × $0,00099 = $1,01/tháng   ở Glacier Deep Archive
```

**Hai ràng buộc khiến hạng lạnh có thể đắt hơn Standard:**

- **Lưu tối thiểu** (minimum storage duration). Object vào Standard-IA rồi xoá sau 10 ngày vẫn bị tính đủ 30 ngày. Dữ liệu sống ngắn không nên vào hạng lạnh.
- **Kích thước tính tiền tối thiểu 128 KB** ("min size charge") ở Standard-IA, One Zone-IA và Glacier Instant Retrieval. Object nhỏ hơn vẫn bị tính tiền như 128 KB:

```
1 triệu object × 10 KB  = 10 GB thật
Ở Standard:     10 GB × $0,023               = $0,23/tháng
Ở Standard-IA:  tính như 1 triệu × 128 KB = 128 GB × $0,0125 = $1,60/tháng  → đắt gấp ~7 lần
```

Đó là ý của quy tắc **Object size > 128KB trước khi vào IA**.

**Từ đó ra chiến lược:**

- **Lifecycle** cho data predictable. Lifecycle rule là luật "sau N ngày thì chuyển class hoặc xoá", chạy tự động theo tuổi object. Hợp khi bạn biết trước dữ liệu nguội dần theo thời gian: logs 30d → IA, 90d → Glacier, vài năm sau thì xoá.
- **Intelligent-Tiering** cho data unknown pattern (auto move). Đây là một class mà bên trong S3 **tự theo dõi từng object**: 30 ngày liền không ai đọc thì chuyển object sang tầng giá Infrequent Access, 90 ngày thì sang tầng Archive Instant Access, có người đọc lại thì đưa về tầng Frequent. Khác các hạng lạnh ở trên, nó **không tính phí lấy ra**, nên đoán sai cũng không bị phạt. Đổi lại có phí theo dõi **$0,0025 cho mỗi 1.000 object mỗi tháng**. Object dưới 128 KB không được theo dõi và luôn nằm ở tầng Frequent.

```
100 TB, object trung bình 1 MB  →  ~100 triệu object
Phí theo dõi: 100.000.000 ÷ 1.000 × $0,0025 = $250/tháng   (so với ~$2.355/tháng tiền lưu Standard)
```

Với object lớn thì phí này không đáng kể; với hàng tỷ object nhỏ thì nó có thể ăn hết phần tiết kiệm.
- **Compression** + **Parquet/ORC** giảm 80% size + 90% Athena scan cost. Athena (dịch vụ chạy SQL thẳng trên file S3) tính **$5 cho mỗi TB dữ liệu phải quét**, nên giảm lượng quét là giảm tiền. Nén giảm số byte trên đĩa (gzip thường được khoảng 3:1). Parquet/ORC lưu **theo cột**, nên query chỉ cần 5 cột trong bảng 100 cột thì chỉ đọc 5 cột đó, thay vì đọc mọi dòng như CSV/JSON. Ví dụ trên trang giá Athena: file 3 TB, nén 3:1 còn 1 TB, query đọc 1 trong 4 cột → quét 0,25 TB, tốn $1,25 thay vì $15, tức giảm ~92%. Các con số 80% / 90% là mức điển hình kiểu đó, không phải cam kết.
- **Abort multipart** lifecycle bắt buộc. Upload file lớn được chia thành nhiều part (multipart upload). Nếu upload hỏng giữa chừng, các part đã lên **vẫn nằm trong bucket và vẫn bị tính tiền**, nhưng không hiện ra khi list object. Rule `AbortIncompleteMultipartUpload` sau 7 ngày dọn chúng tự động.
- **Storage Lens** review monthly. Storage Lens là dashboard tổng hợp dung lượng và hoạt động của S3 trên toàn account hoặc toàn Organization: bucket nào phình nhanh, bucket nào còn multipart dở, bao nhiêu dữ liệu là version cũ. Bộ metric cơ bản miễn phí.

> 🪤 Bẫy thi: "không biết access pattern" → **Intelligent-Tiering**. "Biết chắc sau 30 ngày hiếm khi đọc" → **Lifecycle sang Standard-IA**. "Lưu 7–10 năm cho compliance, chờ nửa ngày mới lấy được cũng chấp nhận" → **Glacier Deep Archive**. "Dữ liệu tái tạo được, hiếm đọc" → **One Zone-IA**.

### 4.2 EBS
- **gp3** thay gp2 → 20% rẻ: ~$0,08 so với ~$0,10 mỗi GB-tháng. Ngoài giá, gp3 cho sẵn 3.000 IOPS (số thao tác đọc/ghi mỗi giây) và 125 MB/s **không phụ thuộc dung lượng**, còn gp2 buộc IOPS vào kích thước volume (3 IOPS mỗi GB), nên trước đây người ta phải mua volume to hơn cần thiết chỉ để có IOPS. Đổi gp2 → gp3 làm online được bằng Elastic Volumes, không downtime.
- **Snapshot** incremental: snapshot đầu chép toàn bộ, các snapshot sau chỉ lưu những block đã thay đổi, nên giữ 30 bản hằng ngày không tốn gấp 30 lần. Dùng AWS Backup + lifecycle để tự xoá bản quá hạn.
- **Delete unattached volumes**. Terminate EC2 không tự xoá các volume phụ; chúng nằm ở trạng thái `available` và tính tiền đầy đủ.
- **Snapshot Archive** (2022) — 75% cheaper than standard snapshot cho long-term: ~$0,0125 so với ~$0,05 mỗi GB-tháng. Đổi lại snapshot trong archive là bản **đầy đủ** (không còn incremental), lưu tối thiểu 90 ngày, và muốn dùng phải restore mất 24–72 giờ. Chỉ hợp với bản giữ lâu cho compliance.

### 4.3 EFS
- **Lifecycle Management** move IA sau 30 ngày → save 92%. EFS Standard ~$0,30/GB-tháng, đắt gấp 13 lần S3 Standard; tầng EFS Infrequent Access ~$0,016–0,025/GB-tháng tuỳ cấu hình, rẻ hơn 92–95%. Đọc file ở tầng IA mất thêm phí theo GB, nên chỉ có lợi với file thật sự ít đọc.
- **Elastic throughput** thay Provisioned cho variable workload. Provisioned là trả tiền cố định cho một mức MB/s dù có dùng hay không; Elastic tính theo lượng dữ liệu thực đọc/ghi, nên tải thất thường không phải trả cho lúc rảnh.

### 4.4 Log retention
- **CloudWatch Logs** default **never expire** → đắt theo thời gian.
- Set retention 30-90 ngày.
- **Subscription filter** → Firehose → S3 + lifecycle Glacier cho long-term.

---

## 5. Data transfer cost (TRAP #1)

Data transfer là khoản phí cho **mỗi GB dữ liệu đi qua một ranh giới**: ra Internet, sang region khác, sang AZ khác. Nó không hiện trên trang giá của EC2 hay RDS nên hay bị bỏ sót khi ước tính. Quy tắc nhớ: dữ liệu **đi vào** AWS miễn phí; dữ liệu **đi ra**, hoặc đi ngang qua ranh giới AZ/region, thì tính tiền; càng đi xa càng đắt.

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

"Mỗi chiều" ở dòng Cross-AZ nghĩa là bên gửi bị tính $0,01 và bên nhận cũng bị tính $0,01, nên 1 GB qua lại giữa hai AZ thực tế tốn **$0,02**. Dòng "Same AZ public IP" là bẫy tương tự: hai instance cùng AZ mà gọi nhau bằng public IP thì traffic bị coi như đi vòng ra ngoài, nên luôn dùng private IP.

### Saving patterns

**1. Đừng để traffic tới S3/DynamoDB đi qua NAT Gateway.** Instance trong private subnet muốn gọi S3 thì mặc định phải đi qua NAT Gateway ra Internet, và NAT tính **$0,045 cho mỗi GB** nó xử lý (§6.1). **VPC Gateway Endpoint** là một dòng trong route table chỉ đường cho traffic S3/DynamoDB đi thẳng trong mạng AWS, không qua NAT. Nó miễn phí hoàn toàn (không phí giờ, không phí GB) và chỉ có cho **S3 và DynamoDB**.

```
App đọc/ghi S3 5.000 GB/tháng qua NAT:  5.000 × $0,045 = $225/tháng tiền xử lý của NAT
Qua Gateway Endpoint:                                    $0
```

**2. VPC Interface Endpoint cho service hay dùng → save NAT.** Các dịch vụ khác (ECR, SQS, CloudWatch, Secrets Manager…) không có Gateway Endpoint, chỉ có **Interface Endpoint**: một card mạng (ENI) đặt trong subnet của bạn, do PrivateLink cấp. Nó **có tính phí** vì AWS phải chạy ENI đó cho bạn: ~$0,01/giờ cho mỗi AZ + $0,01/GB. Vẫn rẻ hơn NAT ($0,045/GB) khi lưu lượng đủ lớn:

```
Phí cố định 1 endpoint × 3 AZ:  3 × $0,01 × 730 giờ = $21,90/tháng
Tiết kiệm mỗi GB so với NAT:    $0,045 − $0,01      = $0,035
Điểm hoà vốn:                   $21,90 ÷ $0,035     ≈ 626 GB/tháng cho dịch vụ đó
```

Dưới mức đó thì cứ để đi qua NAT. Điển hình đáng làm: ECR khi cluster kéo image nhiều, CloudWatch Logs khi log nhiều.

**3. CloudFront trước S3/ALB → giảm egress.** CloudFront là CDN của AWS, cache nội dung tại các điểm gần người dùng. Tiết kiệm đến từ hai chỗ: dữ liệu từ origin trong AWS (S3, ALB, EC2) ra CloudFront **không tính phí transfer**, và những request trúng cache không chạm tới origin nữa. Giá egress của CloudFront ra Internet cũng thấp hơn mức $0,09/GB khi đi thẳng từ EC2/S3.

**4. Direct Connect rẻ hơn egress Internet > 10TB/tháng.** Direct Connect (DX) là đường truyền riêng thuê từ data center của bạn tới AWS. Dữ liệu ra qua DX tính ~$0,02/GB thay vì $0,09/GB, nhưng phải trả phí cổng cố định:

```
Cổng 1 Gbps:  $0,30/giờ × 730 = $219/tháng
Tiết kiệm mỗi GB: $0,09 − $0,02 = $0,07
Hoà vốn riêng phí cổng: $219 ÷ $0,07 ≈ 3.130 GB ≈ 3 TB/tháng

Ở 10 TB/tháng:  Internet 10.000 × $0,09 = $900
                DX       10.000 × $0,02 + $219 = $419
```

Phép tính chưa gồm tiền thuê đường truyền vật lý từ nhà mạng/đối tác tới điểm DX (thường vài trăm đô mỗi tháng). Cộng khoản đó vào thì điểm hoà vốn thực tế rơi vào cỡ **10 TB/tháng**, là mốc bài nêu.

**5. Cross-AZ minimize.** Chạy nhiều AZ để chịu lỗi là đúng, nhưng mỗi GB chạy ngang giữa các AZ tốn $0,02 (hai chiều cộng lại). Hai service nói chuyện với nhau 2.000 GB/tháng mà nằm khác AZ thì tốn 2.000 × $0,02 = $40/tháng chỉ cho việc đó. Có ba chỗ cần để ý:

- **ALB cross-zone**: bật cross-zone nghĩa là node load balancer ở AZ-a được phép chuyển request cho target ở AZ-b. Việc này **làm tăng** traffic chéo AZ chứ không giảm, nhưng với **ALB** phần traffic đó AWS không tính phí, nên cứ để bật (mặc định đã bật) để tải chia đều theo số target. Với **NLB**, cross-zone mặc định tắt, và bật lên thì traffic chéo AZ **bị tính phí** $0,01/GB mỗi chiều. Đó là ý của "free ALB; NLB tính phí".
- **ASG balance**: giữ số instance đều giữa các AZ. Nếu AZ-a có 8 máy còn AZ-b có 2, phần lớn request vào node ALB ở AZ-b phải chuyển sang AZ-a, và các lời gọi tiếp theo tới service khác, cache, database cũng bị lệch theo.
- **Same-AZ data plane** (Kafka, ElastiCache) — partition aware client. "Data plane" là đường đi của dữ liệu thật (đọc/ghi), khác với đường điều khiển. Các hệ như Kafka hay ElastiCache có bản sao (replica) ở nhiều AZ. Client mặc định đọc từ node leader/primary, có thể nằm ở AZ khác, nên mỗi lần đọc là một lần trả phí cross-AZ. Client "biết" mình ở AZ nào thì chọn **replica cùng AZ** để đọc: Kafka gọi là *rack awareness* (khai báo `client.rack` bằng tên AZ để consumer fetch từ follower gần nhất), ElastiCache/Redis là đọc từ read replica cùng AZ. Ghi thì vẫn phải tới leader.

> 🪤 Bẫy thi: "hoá đơn NAT Gateway cao, app chủ yếu gọi S3" → **Gateway Endpoint** (miễn phí), không phải Interface Endpoint. "Giảm chi phí data transfer cho nội dung tĩnh phục vụ người dùng toàn cầu" → **CloudFront**.

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
- **RI** 1y/3y → 30-60% discount. Cơ chế giống RI của EC2 (§3.2): cam kết một cấu hình DB instance (class, engine, region, Single/Multi-AZ) để được giá thấp. RI chỉ giảm tiền **instance**, không giảm tiền storage hay backup.
- **Storage Auto-scaling** (chỉ tăng, không giảm — kế hoạch trước). RDS tự nới dung lượng đĩa khi gần đầy, tới mức trần bạn đặt. Storage đã cấp thì **không thu nhỏ lại được**; muốn giảm phải tạo instance mới rồi chuyển dữ liệu sang. Vì vậy cấp vừa phải lúc đầu và để auto-scaling lo phần tăng.
- **Stop dev/test** (max 7 ngày, auto start lại). RDS stop thì hết tiền instance nhưng vẫn tính tiền storage, và sau 7 ngày AWS **tự bật lại** để áp bản vá. Muốn tắt lâu hơn thì dùng scheduler stop lại định kỳ, hoặc snapshot rồi xoá instance.
- **Right-size** với Performance Insights — công cụ cho thấy database đang bận vì cái gì (CPU, I/O, chờ lock) theo từng câu query, để biết instance thừa hay thiếu trước khi đổi cỡ.

### 7.2 Aurora

Aurora mặc định (**Standard**) tính ba khoản: instance, storage ~$0,10/GB-tháng, và **I/O ~$0,20 cho mỗi triệu request** đọc/ghi xuống tầng lưu trữ. Khoản I/O khó đoán nhất, với workload ghi nhiều nó có thể lớn hơn cả tiền instance.

- **I/O Optimized** (2023) — I/O free, storage đắt hơn. Cụ thể: I/O về $0, đổi lại storage lên ~$0,225/GB-tháng (gấp 2,25 lần) và instance đắt hơn ~30%. Quy tắc của AWS: tốt khi **I/O > 25% tổng cost** Aurora.

```
db.r6i.large chạy cả tháng, 500 GB dữ liệu:
                 Standard                                   I/O-Optimized
Instance         $0,29 × 730  = $211,70                     $0,377 × 730 = $275,21
Storage          500 × $0,10  = $50,00                      500 × $0,225 = $112,50

I/O ít (100 triệu/tháng):   + $20   → Standard $281,70      I/O-Optimized $387,71  → giữ Standard (I/O chỉ 7% bill)
I/O nhiều (1 tỷ/tháng):     + $200  → Standard $461,70      I/O-Optimized $387,71  → đổi sang I/O-Optimized (I/O chiếm 43% bill)
```

- **Serverless v2** cho variable workload: capacity tự co giãn theo tải và tính tiền theo lượng capacity dùng mỗi giây, nên không phải trả cho instance lớn chạy suốt chỉ để chịu vài giờ cao điểm.
- **Headless reader region** Aurora Global cho cold standby: ở region phụ chỉ giữ **tầng storage** được replicate sang, không chạy DB instance nào ("headless" = không có đầu). Bạn chỉ trả tiền storage và replication; khi cần failover mới thêm instance vào. Đổi lại thời gian khôi phục dài hơn vì phải chờ instance khởi động.

### 7.3 DynamoDB

DynamoDB có hai chế độ tính tiền cho đọc/ghi. **On-Demand** trả theo từng request, không cần ước lượng gì. **Provisioned** là bạn đặt trước số **WCU/RCU** — số lượt ghi/đọc mỗi giây mà bảng được phép phục vụ (1 WCU = 1 lượt ghi item tới 1 KB mỗi giây; 1 RCU = 1 lượt đọc strongly consistent item tới 4 KB mỗi giây) — và trả tiền theo giờ cho mức đó dù có dùng hết hay không.

- **Provisioned + Auto Scaling** thay On-Demand cho steady. Tính thử một bảng ghi đều 1.000 lượt/giây suốt tháng:

```
On-Demand:    1.000 × 3.600 × 730 = 2,628 tỷ lượt ghi × $0,625/triệu     = $1.642,50
Provisioned:  1.000 WCU × $0,00065/giờ × 730                             = $474,50   → rẻ hơn ~3,5 lần
Provisioned, auto scaling giữ mức dùng 70% (đặt ~1.429 WCU)              = $677,86   → rẻ hơn ~2,4 lần
```

Con số **"7x rẻ hơn"** trong nhiều tài liệu ôn thi là của giá cũ: tháng 11/2024 AWS giảm một nửa giá On-Demand (từ $1,25 xuống $0,625 mỗi triệu lượt ghi), nên tỉ lệ hiện tại còn khoảng **3,5 lần ở mức dùng 100%**. Kết luận cho đề thi không đổi: tải **đều, đoán được** → Provisioned + Auto Scaling; tải **thất thường, khó đoán, hoặc bảng mới** → On-Demand. Lý do gốc: Provisioned bắt bạn trả cho cả công suất bỏ không, nên chỉ thắng khi công suất đó được dùng gần hết.
- **Reserved Capacity** thêm 50% off cho provisioned: cam kết trước một lượng WCU/RCU trong 1 năm (giảm tới ~54%) hoặc 3 năm (tới ~77%), giống RI nhưng cho capacity của DynamoDB. Chỉ áp cho Provisioned, không áp cho On-Demand.
- **TTL** xóa item cũ. Đặt một attribute chứa thời điểm hết hạn; DynamoDB tự xoá item quá hạn ở nền và **không tính WCU** cho việc xoá đó. Giảm tiền storage mà không phải viết job dọn dẹp.
- **Compress attribute** lớn vào S3 + reference. DynamoDB tính capacity theo **kích thước item**: ghi một item 100 KB tốn 100 WCU, gấp 100 lần item 1 KB. Dữ liệu to (ảnh, JSON lớn) nên nén lại, hoặc đưa lên S3 và chỉ lưu đường dẫn trong item. Storage S3 cũng rẻ hơn storage DynamoDB khoảng 10 lần.
- **Sparse index** (item không có attribute → không index). Một Global Secondary Index (GSI — bản sao của bảng sắp theo key khác để query theo chiều khác) chỉ chứa những item **có** attribute làm key của index. Tận dụng điều đó: chỉ gắn attribute `openOrder` cho đơn hàng đang mở, đơn đóng thì xoá attribute đi. Index khi đó chỉ chứa vài phần trăm số item, nên tốn ít storage và ít WCU cập nhật index hơn hẳn so với index toàn bảng.

### 7.4 Redshift

Redshift là data warehouse: một cụm node chạy SQL phân tích trên dữ liệu lớn. Tiền chủ yếu là tiền node chạy theo giờ.

- **RA3 nodes** separate compute-storage. Với loại node cũ, dữ liệu nằm trên đĩa gắn liền node, nên hết chỗ lưu là phải mua thêm node, kể cả khi CPU đang thừa. RA3 đưa dữ liệu ra tầng **managed storage** tính tiền riêng theo GB, nên bạn chọn số node theo nhu cầu tính toán và trả storage theo đúng lượng dữ liệu.
- **Concurrency Scaling** free 1h/day. Khi quá nhiều query cùng lúc làm query phải xếp hàng, Redshift tự bật thêm cụm tạm để chạy phần dư rồi tắt đi. Mỗi cluster tích được **1 giờ credit miễn phí cho mỗi ngày chạy** (dồn tối đa 30 giờ); dùng quá thì tính theo giây. Rẻ hơn nhiều so với mua cụm đủ to cho giờ cao điểm.
- **Pause cluster** ngoài giờ business: lúc pause chỉ trả tiền storage/backup, không trả tiền node. Hợp với warehouse chỉ phục vụ báo cáo giờ hành chính.
- **Spectrum** cho data lake không load vào cluster: chạy query Redshift thẳng trên file ở S3, tính **$5 mỗi TB quét** (như Athena). Dữ liệu cũ ít dùng để ở S3 thay vì chiếm storage của cluster.

---

## 8. Monitoring & alerts

### 8.1 Tools

Các công cụ dưới đây trả lời những câu hỏi khác nhau; đề thi thường mô tả câu hỏi rồi bắt chọn công cụ.

**Nhóm "tiền đã đi đâu":**

- **Cost Explorer** — phân tích + forecast. Giao diện biểu đồ chi phí khoảng 12 tháng gần nhất, lọc và nhóm theo service, account, region, tag; kèm dự báo cho các tháng tới và gợi ý mua SP/RI. Dùng để **xem và đào sâu bằng tay**; nó không tự báo động.
- **CUR** (Cost and Usage Report, nay nằm trong *Data Exports*) — bản dữ liệu billing **chi tiết nhất**: mỗi dòng là một resource trong một giờ. AWS xuất nó thành file vào S3. Chuỗi **CUR → S3 → Athena → QuickSight dashboard** nghĩa là: file nằm ở S3, Athena chạy SQL trên đó, QuickSight vẽ dashboard từ kết quả. Dùng khi Cost Explorer không đủ chi tiết hoặc cần báo cáo tuỳ biến.
- **Cost Allocation Tags** — chargeback. Tag gắn trên resource (ví dụ `Project=checkout`) chỉ xuất hiện trong báo cáo chi phí **sau khi được activate** trong Billing console, và chỉ có tác dụng từ lúc activate trở đi. *Chargeback* là tính tiền ngược lại cho từng team theo phần họ dùng.
- **Cost Categories** — group cost theo logic business: tự định nghĩa nhóm bằng luật, ví dụ "account A + mọi resource có tag `Team=payments` = nhóm Payments", để báo cáo theo cách công ty tổ chức thay vì theo cấu trúc account.

**Nhóm "báo cho tôi khi có chuyện":**

- **Budgets** — alert + Budgets Actions (stop EC2, deny IAM). Bạn **tự đặt ngưỡng** ("$5.000/tháng cho account này") và Budgets báo qua email/SNS khi chi phí thực tế hoặc **dự báo** chạm 80%, 100%… của ngưỡng. Budgets Actions đi xa hơn một bước: khi vượt ngưỡng thì tự gắn một IAM policy hoặc SCP chặn tạo resource mới, hoặc tự stop EC2/RDS chỉ định. Tạo budget và nhận thông báo miễn phí; hai budget có action đầu tiên miễn phí.
- **Cost Anomaly Detection** — ML, free. Không cần đặt ngưỡng: nó học mẫu chi tiêu bình thường (có tính cả chu kỳ tuần/tháng) rồi báo khi có khoản **lệch khỏi mẫu**, kèm phân tích nguyên nhân theo service, account, region. Nó chạy khoảng ba lần mỗi ngày trên dữ liệu trễ tới 24 giờ, nên phát hiện trong vòng một ngày chứ không tức thì.

Khác biệt gốc giữa hai cái: Budgets bắt được việc **vượt một con số bạn biết trước**; Anomaly Detection bắt được **thứ bạn không lường trước**, ví dụ một service bình thường $20/ngày bỗng lên $200/ngày trong khi tổng bill vẫn dưới budget.

**Nhóm "nên sửa cái gì":**

- **Compute Optimizer** — right-size: gợi ý cỡ EC2/EBS/Lambda/ASG từ metric sử dụng (§3.3).
- **Trusted Advisor** — waste detection: liệt kê resource lãng phí như EC2 idle, EBS không gắn, EIP không dùng (§3.3).

| Câu hỏi trong đề | Công cụ |
|------------------|---------|
| Xem chi phí theo service/tag, dự báo tháng tới | Cost Explorer |
| Dữ liệu billing chi tiết nhất, query bằng SQL | CUR + Athena |
| Cảnh báo khi sắp vượt ngân sách đã đặt | Budgets |
| Tự động chặn/stop khi vượt ngân sách | Budgets Actions |
| Phát hiện chi phí tăng bất thường, không đặt ngưỡng | Cost Anomaly Detection |
| Instance nào đang over-provisioned | Compute Optimizer |
| Resource nào đang bỏ không | Trusted Advisor |
| Chia chi phí theo team/project | Cost Allocation Tags, Cost Categories |

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
   <details><summary>Đáp án</summary>Set **retention 30 ngày** trong CW Logs. Export Firehose → S3 + lifecycle Glacier Deep Archive cho long-term cheap. Tính thử: 10 TB ở CW Logs ~ 10.240 GB × $0,03 = $307/tháng; ở Deep Archive ~ 10.240 × $0,00099 = $10/tháng.</details>

5. NAT GW $500/tháng. App đọc S3 nhiều. Fix?
   <details><summary>Đáp án</summary>**S3 Gateway Endpoint** (free) — traffic không qua NAT. Có thể save 80% NAT bill (nếu khoảng 80% lưu lượng qua NAT là tới S3; phần phí giờ của NAT thì vẫn còn).</details>

6. EBS gp2 100TB chuyển gp3 — kết quả?
   <details><summary>Đáp án</summary>Same perf + **20% cheaper** + IOPS/throughput config riêng. Migrate online qua Elastic Volumes. Tính thử: 102.400 GB × $0,10 = $10.240/tháng → × $0,08 = $8.192/tháng.</details>

7. DDB provisioned vs on-demand cho 10k req/s steady?
   <details><summary>Đáp án</summary>**Provisioned + Auto Scaling target 70%** — rẻ hơn On-Demand khoảng 2,4 lần ở mức dùng 70%, ~3,5 lần nếu dùng hết 100% (tài liệu cũ ghi ~7x, là giá On-Demand trước đợt giảm 11/2024; cách tính ở §7.3). Add Reserved Capacity giảm thêm ~50%.</details>

8. Multi-AZ ASG balance không tốt, traffic skew AZ-A. Cost vấn đề?
   <details><summary>Đáp án</summary>**Cross-AZ data transfer** $0.01/GB mỗi chiều. ASG rebalance + ALB cross-zone (free) hoặc partition client-aware.</details>

9. Aurora I/O Optimized vs Standard?
   <details><summary>Đáp án</summary>**I/O Optimized** trade off: I/O free, đổi lại storage đắt hơn (~$0,225 so với ~$0,10 mỗi GB-tháng) và instance đắt hơn ~30%. Profitable khi I/O > 25% tổng cost (workload IO-heavy). Phép tính mẫu ở §7.2.</details>

10. Dev/test EC2 chạy 24/7. Quick saving?
    <details><summary>Đáp án</summary>**Instance Scheduler** (CFN) hoặc Lambda + EventBridge stop 18:00 start 9:00 weekday → máy chỉ chạy 45/168 giờ mỗi tuần, save ~73% tiền compute (EBS vẫn tính).</details>

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
- **Graviton** save 20-40% (giá/giờ ~20%, phần còn lại nhờ hiệu năng).
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
- **DDB Provisioned + Reserved** thay On-Demand steady; On-Demand cho tải khó đoán.
- **Capacity Reservation** giữ chỗ, không giảm giá; **Spot** không tính vào SP.

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
- **Compute SP** flexible (tới 66%). **EC2 Instance SP** fix family max discount (tới 72%). **RI** legacy cho EC2, vẫn dùng cho RDS/Redshift/ElastiCache.
- **SP** = cam kết $/giờ: dùng vượt → phần vượt giá On-Demand; dùng thiếu → vẫn trả đủ.
- **Spot** = capacity dư, tới 90% off, thu hồi với cảnh báo 2 phút.
- **Spot capacity-optimized**.
- **Graviton** 20-40% rẻ.
- **Schedule stop/start** dev/test save 60-73% tiền compute (tuỳ lịch).
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
- **DDB Provisioned + Auto Scaling + Reserved** cho tải đều: rẻ hơn On-Demand ~2,5-3,5x (tài liệu cũ ghi 7x, trước đợt giảm giá 11/2024).
- **Aurora I/O Optimized** > 25% I/O.
- **Compute Optimizer** + **Trusted Advisor** + **Anomaly Detection** all free (Trusted Advisor đủ bộ cost check cần support Business+).
- **Budgets** = ngưỡng tự đặt; **Anomaly Detection** = ML tự phát hiện lệch mẫu.
- **Budgets Actions** auto-remediate.
- **Tag from day 1**.
