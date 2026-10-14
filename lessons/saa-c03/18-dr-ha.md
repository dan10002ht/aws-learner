# Bài 18 — DR & HA Strategies

**Foundation:** [[foundations-06-failure-modes]] — cascading failure, partition.

## 1. Mục tiêu
- Hiểu **RPO/RTO** và 4 DR strategy.
- Thiết kế Multi-AZ HA + Multi-Region DR.
- Patterns: pilot light, warm standby, active-active.
- Backup & restore với AWS Backup.

---

## 2. Khái niệm

Hai từ dùng suốt bài, cần tách ngay từ đầu:

- **HA (High Availability)** — hệ thống **tự chịu được** hỏng hóc nhỏ và thường gặp (một máy chết, một AZ mất điện) mà gần như không gián đoạn. Làm trong **một region**, trải qua nhiều AZ.
- **DR (Disaster Recovery)** — kế hoạch **khôi phục** sau thảm hoạ lớn mà HA không đỡ nổi: cả region sập, dữ liệu bị xoá nhầm hoặc bị ransomware mã hoá. Thường cần **region thứ hai** hoặc bản backup tách biệt.

HA trả lời "làm sao để không sập"; DR trả lời "sập rồi thì bao lâu dậy lại và mất bao nhiêu dữ liệu". Hai con số đo câu hỏi thứ hai là RPO và RTO.

### 2.1 RPO vs RTO
- **RPO (Recovery Point Objective)** — bao nhiêu data **được phép mất**, đo bằng **thời gian** tính ngược từ lúc sự cố về bản sao tốt gần nhất.
  - RPO = 0 → phải sync replication (ghi xong ở cả hai nơi rồi mới báo thành công, nên không mất gì).
  - RPO = 5 phút → cần bản sao không cũ quá 5 phút: backup mỗi 5 phút, hoặc replication liên tục có độ trễ dưới 5 phút.
- **RTO (Recovery Time Objective)** — bao lâu **phải back online**, tính từ lúc sự cố tới lúc phục vụ lại được.
  - RTO ≈ 0 → active-active (bên kia vốn đang chạy sẵn).
  - RTO = 4h → restore from backup acceptable.

Cả hai là **mục tiêu do business đặt ra** (chữ O = Objective), không phải thứ AWS cho sẵn. Kiến trúc bạn chọn quyết định có đạt được mục tiêu đó hay không.

**Một timeline cụ thể.** Cửa hàng online backup database mỗi đêm lúc 02:00. Hôm nay 14:00 database hỏng, đội vận hành restore xong lúc 16:00:

```
02:00            14:00            16:00
  |----------------|----------------|
backup cuối      sự cố           chạy lại

Dữ liệu mất  = 14:00 − 02:00 = 12 giờ   (mọi đơn hàng từ 02:00 tới 14:00)
Downtime     = 16:00 − 14:00 =  2 giờ
```

Nếu business yêu cầu **RPO 1 giờ, RTO 4 giờ** thì lần này RTO đạt (2 giờ < 4 giờ) nhưng RPO **vỡ nặng** (12 giờ so với 1 giờ). Với 1.000 đơn/giờ, đó là 12.000 đơn biến mất. Cách sửa không phải "restore nhanh hơn" mà là **backup dày hơn** (mỗi giờ) hoặc chuyển sang replication liên tục.

Rút ra: **RPO do tần suất sao chép dữ liệu quyết định; RTO do lượng hạ tầng đã dựng sẵn ở nơi dự phòng quyết định.** Bốn strategy dưới đây chính là bốn mức "dựng sẵn" khác nhau.

> 🪤 Bẫy thi: đề cho hai con số, bạn phải gắn đúng. *"Không được mất quá 15 phút dữ liệu"* là **RPO**. *"Phải hoạt động lại trong 1 giờ"* là **RTO**. Hạ RPO thì nhìn vào replication/backup; hạ RTO thì nhìn vào compute chờ sẵn và tự động hoá failover.

### 2.2 4 DR strategy

Bốn strategy xếp theo một trục duy nhất: **ở region dự phòng, bạn để sẵn những gì trước khi sự cố xảy ra.** Để sẵn càng nhiều thì khôi phục càng nhanh và hoá đơn hằng tháng càng cao.

- **Backup & Restore** — ở region DR chỉ có **bản backup** nằm trong S3/vault. Không có database, không có server nào chạy. Khi sự cố mới bắt đầu dựng lại tất cả từ đầu.
- **Pilot Light** ("ngọn lửa mồi" của bếp gas: lửa nhỏ luôn cháy để bật bếp lên được ngay) — **dữ liệu đã sống sẵn**: database ở region DR chạy liên tục và nhận replication. **Tầng app thì tắt**: chỉ có AMI, launch template, ASG với số instance bằng 0. Region DR **chưa phục vụ được request nào** cho tới khi bạn bật app lên.
- **Warm Standby** — như Pilot Light, cộng thêm **một bản thu nhỏ của app đang chạy thật** (load balancer + vài instance). Region DR **phục vụ được request ngay**, chỉ là chưa đủ sức gánh toàn bộ tải; failover chỉ còn việc scale lên.
- **Multi-Site Active/Active** — cả hai region chạy **đủ công suất** và **cùng nhận traffic thật** hằng ngày. Mất một region thì bên còn lại vốn đã phục vụ sẵn, gần như không có bước "failover".

Ranh giới hay bị nhầm nhất là **Pilot Light vs Warm Standby**. Phép thử một câu: *"ngay lúc này, gửi một request vào region DR thì có được trả lời không?"* Không (phải bật server trước) là Pilot Light. Có (dù chậm vì ít máy) là Warm Standby.

| Strategy | RPO | RTO | Cost | Mô tả |
|----------|-----|-----|------|-------|
| **Backup & Restore** | Hours | Hours | $ | Snapshot/backup cross-region. Standby = 0 resource. |
| **Pilot Light** | Minutes | 10s of minutes | $$ | DB replicate, app stopped/scaled-down. Activate khi failover. |
| **Warm Standby** | Seconds | Minutes | $$$ | DB replicate, app running min capacity. Scale-up khi failover. |
| **Multi-Site Active/Active** | ~0 | ~0 (sub-minute) | $$$$ | Cả 2 region serve traffic. |

**Các dấu `$` nghĩa là bao nhiêu?** Không có bảng giá chung, nhưng tính được theo tỷ lệ. Giả sử production tốn **10 phần** cho tầng app và **4 phần** cho database (tổng 14). Chi phí **cộng thêm** cho region DR:

```
                     DB chạy ở DR   App chạy ở DR   Cộng thêm   So với prod (14)
Backup & Restore          0              0             ~0         ~0%  (chỉ tiền lưu backup)
Pilot Light               4              0              4         ~29%
Warm Standby              4              2 (20%)        6         ~43%
Active/Active             4             10             14         100% (hoá đơn gấp đôi)
```

Trong ví dụ này Pilot Light rẻ hơn Active/Active khoảng 71% (4 so với 14), Warm Standby rẻ hơn khoảng 57%. Con số thật phụ thuộc tỷ lệ app/database của bạn: database càng chiếm phần lớn thì Pilot Light và Warm Standby càng sát nhau, vì thứ đắt nhất (database) cả hai đều phải chạy.

Vì sao RPO của Backup & Restore tính bằng giờ còn ba cái sau tính bằng giây tới phút? Vì ba cái sau dùng **replication liên tục** (thay đổi được gửi sang region kia gần như ngay), còn Backup & Restore chỉ có các bản chụp định kỳ. Vì sao RTO giảm dần? Vì mỗi bậc bớt đi một việc phải làm lúc sự cố: bậc 1 phải restore cả data lẫn dựng app, bậc 2 chỉ còn bật app, bậc 3 chỉ còn scale, bậc 4 không còn gì.

→ Chọn theo business criticality. Pricing tăng theo cấp.

> 🪤 Bẫy thi: đề luôn có cụm **"most cost-effective"** đi kèm một cặp RPO/RTO. Cách làm: chọn strategy **rẻ nhất mà vẫn đạt** hai con số đó, không chọn cái xịn nhất. RTO vài giờ → Backup & Restore. RTO vài chục phút, "core/critical components đã chạy sẵn" → Pilot Light. RTO vài phút, "scaled-down but fully functional" → Warm Standby. "Zero/near-zero downtime", "users ở nhiều châu lục" → Active/Active.

---

## 3. Multi-AZ HA (single region)

Một **Availability Zone (AZ)** là một hoặc vài data center có nguồn điện, làm mát và mạng riêng; mỗi region có từ 3 AZ trở lên, cách nhau đủ xa để một sự cố vật lý (cháy, mất điện, ngập) khó ảnh hưởng hai AZ cùng lúc, nhưng đủ gần để replication giữa chúng vẫn nhanh. Multi-AZ nghĩa là đặt bản sao của mỗi thành phần ở ít nhất hai AZ, để mất một AZ không làm mất dịch vụ.

### 3.1 Components level HA

Có hai nhóm. Nhóm **bạn phải tự cấu hình** Multi-AZ (EC2, RDS, ElastiCache, NAT Gateway) và nhóm **AWS làm sẵn** vì dịch vụ vốn chạy ở cấp region (S3, DynamoDB, Lambda, EFS Standard, Aurora storage).

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

Vài dòng cần nói rõ hơn:

- **EC2**: một instance luôn nằm trong đúng một AZ, không "Multi-AZ" được. HA đến từ việc có **nhiều instance ở nhiều AZ** đứng sau load balancer, và Auto Scaling Group (ASG) tự tạo instance mới thay cái chết.
- **RDS Multi-AZ**: RDS giữ một bản **standby** ở AZ khác, replicate **đồng bộ** (commit chỉ thành công khi cả hai bên đã ghi). Vì đồng bộ nên failover trong region **không mất dữ liệu**. Bản standby của kiểu "Multi-AZ instance" không đọc được; muốn vừa HA vừa đọc được thì dùng "Multi-AZ DB cluster" hoặc thêm read replica.
- **Aurora**: tầng storage tự giữ **6 bản sao dữ liệu trải trên 3 AZ**, không cần bật gì. Nhưng "6 bản" là của **storage**; nếu cluster chỉ có một instance writer mà không có reader ở AZ khác thì khi writer chết Aurora phải tạo instance mới, chậm hơn nhiều so với promote một reader có sẵn.
- **NAT Gateway**: mỗi NAT Gateway nằm trong một AZ. Nếu ba AZ dùng chung một NAT Gateway ở AZ-A thì AZ-A sập là private subnet ở AZ-B và AZ-C mất đường ra internet, dù máy của chúng vẫn sống. Vì vậy đặt **mỗi AZ một NAT Gateway** và route table của AZ nào trỏ về NAT của AZ đó.

### 3.2 Multi-AZ failure scenarios

Lấy một hệ thống cụ thể: ALB, 6 EC2 chia đều 3 AZ (mỗi AZ 2 máy, CPU đang ~60%), RDS Multi-AZ có primary ở AZ-A.

**Kịch bản 1 — AZ-A mất điện.** Ba việc diễn ra song song, mỗi việc có đồng hồ riêng:

1. **ALB phát hiện target chết.** ALB gọi health check định kỳ vào từng instance. Mặc định là mỗi **30 giây** một lần và sau **2 lần** fail liên tiếp mới đánh dấu unhealthy, nên mất tới khoảng **60 giây** ALB mới ngừng gửi request vào 2 máy đã chết. Trong khoảng đó, phần request rơi vào hai máy này bị lỗi hoặc timeout. Chỉnh interval xuống mức tối thiểu 5 giây thì còn khoảng 10 giây.
2. **RDS failover.** RDS thấy primary không còn, promote standby ở AZ khác rồi đổi bản ghi DNS của endpoint sang máy mới. Thường mất **60–120 giây**. Trong lúc đó mọi câu query đều lỗi, và app phải **kết nối lại** (connection cũ đã chết).
3. **ASG bù máy.** ASG thấy thiếu 2 instance, launch 2 máy mới ở AZ-B/C. Từ lúc launch tới lúc máy boot xong và qua được health check là **vài phút**.

```
Trước sự cố:  6 máy × 60% CPU
Mất AZ-A:     4 máy gánh cùng lượng tải → 6 × 60 ÷ 4 = 90% CPU mỗi máy
```

Bốn máy còn lại chạy 90% CPU cho tới khi ASG bù xong. Nếu ban đầu CPU đã ở 70% thì phép tính ra 105%: quá tải, lỗi lan sang cả các AZ còn sống. Đây là lý do thiết kế Multi-AZ phải **để dư công suất** sao cho mất một AZ vẫn chịu được.

Kết quả: user **có** thấy một đợt lỗi ngắn, cỡ **1–3 phút**, chủ yếu do RDS failover, rồi hệ thống tự hồi phục mà không ai phải can thiệp. "User không thấy gì" chỉ đúng khi app có retry và không phụ thuộc database ở request đó.

**Kịch bản 2 — AZ network partition** (AZ-A vẫn có điện nhưng mất kết nối mạng với phần còn lại). Từ góc nhìn của ALB thì giống kịch bản 1: health check tới các target ở AZ-A fail, sau ngưỡng thì ALB ngừng gửi request mới và để các request đang chạy dở hoàn tất (**connection draining**, mặc định chờ tối đa 300 giây). ASG thay các instance bị đánh dấu unhealthy và **rebalance**, tức phân bố lại để số máy giữa các AZ còn dùng được cân bằng. Điểm khác là các máy ở AZ-A vẫn đang chạy; nếu chúng còn tự ghi được vào đâu đó thì có nguy cơ dữ liệu lệch. RDS xử lý chuyện này bằng cách chỉ cho đúng một bên làm primary.

**Kịch bản 3 — Single instance fail.** Chỉ một máy chết: ALB loại nó sau ngưỡng health check, ASG terminate và launch máy thay thế. Lưu ý phải cấu hình ASG dùng **ELB health check**. Mặc định ASG chỉ nhìn EC2 status check, tức máy còn bật là coi như khoẻ, nên một máy có process app đã treo sẽ không bao giờ được thay.

> 🪤 Bẫy thi: Multi-AZ **không** cứu được ba trường hợp: cả region sập, ai đó `DROP TABLE` (lệnh xoá được replicate đồng bộ sang standby ngay lập tức), và ransomware. Ba trường hợp đó cần backup và/hoặc region thứ hai — tức là DR.

---

## 4. Multi-Region DR

### 4.1 Backup & Restore

Strategy đơn giản nhất: định kỳ chụp dữ liệu, **copy bản chụp sang region khác**, khi có sự cố thì dựng lại từ đó.

- **AWS Backup** centralize: RDS, EBS, EFS, DDB, Aurora, FSx, S3, Storage Gateway, Redshift. Thay vì mỗi dịch vụ một kiểu snapshot riêng, bạn viết một **backup plan** (lịch chạy + thời gian giữ) rồi gán resource vào bằng tag.
- **Backup Vault Lock** — immutable WORM (write once, read many): backup đã vào vault thì không ai xoá hay rút ngắn thời hạn giữ được. Chi tiết ở §8.1.
- **Cross-Region Copy** + **Cross-Account Copy** scheduled. Copy sang region khác để chống region sập; copy sang account khác để chống trường hợp account chính bị chiếm quyền rồi kẻ tấn công xoá luôn backup.
- Restore: tạo lại resource từ snapshot.
- Test restore quarterly.

**Vì sao RTO tính bằng giờ?** Vì lúc sự cố ở region DR chưa có gì ngoài các bản backup, và danh sách việc phải làm khá dài. Ước lượng cho một web app có database vài trăm GB (số phút chỉ để minh hoạ, mỗi hệ thống một khác):

```
Phát hiện sự cố + quyết định failover              ~30 phút
Dựng VPC, subnet, ALB, ASG bằng CloudFormation     ~20 phút
Restore database từ snapshot                       ~30–90 phút (tăng theo dung lượng)
Deploy app, trỏ config sang database mới           ~20 phút
Kiểm tra, đổi DNS, chờ DNS lan ra                  ~15 phút
                                           Tổng:   ~2–3 giờ
```

Hai điều rút ra. Thứ nhất, nếu hạ tầng **không** có sẵn dưới dạng infrastructure as code (CloudFormation/Terraform) mà phải dựng tay theo trí nhớ thì dòng thứ hai từ 20 phút thành nhiều giờ. Thứ hai, **RPO bằng khoảng cách giữa hai lần backup**: backup mỗi giờ thì trường hợp xấu nhất mất 60 phút dữ liệu.

> 💡 "Restore" luôn tạo ra **resource mới** (database mới với endpoint mới, volume mới), không ghi đè lên cái cũ. App phải được trỏ sang endpoint mới — bước này hay bị quên trong runbook.

### 4.2 Pilot Light
- **Database replicate cross-region** (Aurora Global, RDS Read Replica cross-region, DDB Global Tables). Dữ liệu ở region DR luôn gần như mới nhất nên RPO chỉ còn bằng độ trễ replication, cỡ giây.
- **Compute "off"** — AMI sẵn sàng, ASG min=0, hoặc Lambda code deployed but not invoked. Không có instance nào chạy nên không tốn tiền compute.
- **Failover**: Route 53 failover → trigger Lambda promote DB, scale ASG, update DNS. Cụ thể là ba việc: (1) **promote** database ở DR từ chỉ-đọc thành ghi được, (2) đặt ASG từ 0 lên đủ số instance và chờ chúng boot, (3) chuyển DNS sang region DR.
- RTO 10s of minutes.

So với §4.1, bước dài nhất (restore database) đã biến mất vì database vốn đang chạy. Phần còn lại của RTO là thời gian **bật compute từ số 0**: instance phải boot, tải app, qua health check, và ASG phải xin được đủ máy.

### 4.3 Warm Standby
- **DB replicate** + **app running min capacity** (1 ALB + 1-2 EC2). Ví dụ production chạy 10 instance thì DR chạy 2.
- **Failover**: scale ASG up, Route 53 failover, promote DB.
- RTO minutes.

Khác biệt với Pilot Light nằm ở chỗ app **đang chạy thật**, và điều đó cho ba lợi ích:

1. **Nhận traffic được ngay** khi DNS chuyển sang (chậm vì ít máy, nhưng không chết), rồi ASG scale lên dần.
2. **Biết chắc nó còn chạy được.** Bản thu nhỏ nhận deploy mỗi lần release và có health check liên tục. Với Pilot Light, bạn chỉ biết app có boot nổi ở region DR hay không vào đúng lúc cần nhất.
3. **Test DR dễ**: đẩy vài phần trăm traffic thật sang để kiểm tra bất cứ lúc nào.

Cái giá: trả tiền 24/7 cho ALB và mấy instance đó (xem phép tính ở §2.2).

> 🪤 Bẫy thi: nếu DR chạy **đủ 100% công suất** nhưng không nhận traffic thì đó là **hot standby** — vẫn là active/passive, đắt ngang Active/Active. Còn nếu region DR đã **đang phục vụ user thật** thì là Active/Active, không còn là Warm Standby.

### 4.4 Multi-Site Active/Active

Cả hai (hoặc nhiều) region cùng chạy đủ công suất và cùng phục vụ user hằng ngày. User ở Singapore vào region Singapore, user ở Frankfurt vào region Frankfurt.

- **DB**: Aurora Global, DDB Global Tables, hoặc data partition by region.
- **Compute**: full capacity both region.
- **Routing**: Route 53 latency + health check, hoặc Global Accelerator.
- RTO ~0.
- Phức tạp: conflict resolution, eventual consistency cross-region (foundation [[foundations-04-latency-vs-consistency]]).

**Phần compute và routing thì dễ.** Route 53 **latency-based routing** trả về region có độ trễ thấp nhất với từng user, kèm health check để loại region đang chết. Global Accelerator làm việc tương tự bằng hai địa chỉ IP tĩnh dùng chung cho mọi region, nên không phụ thuộc DNS cache phía client. Mất một region thì traffic của nó dồn sang region còn lại, vì vậy **mỗi region phải đủ sức gánh toàn bộ tải**. Đó là lý do chi phí gấp đôi chứ không phải "chia đôi tải cho hai nơi".

**Phần khó là dữ liệu: hai nơi cùng ghi thì ai đúng?** Replication giữa hai region là bất đồng bộ (async), tức ghi xong ở region này một lúc sau mới tới region kia. Ví dụ với DynamoDB Global Tables, một giỏ hàng có `cart = [áo]`:

```
t = 0 ms     User mở app trên điện thoại (vào Singapore): thêm "giày"  → Singapore ghi [áo, giày]
t = 200 ms   Cùng user trên laptop (vào Frankfurt, chưa nhận được bản ghi trên):
             thêm "mũ"                                                 → Frankfurt ghi [áo, mũ]
t ≈ 1 s      Hai bản ghi gặp nhau khi replicate. DynamoDB giữ bản có timestamp MUỘN hơn
             → cả hai region hội tụ về [áo, mũ]. "giày" biến mất, không có lỗi nào được báo.
```

Quy tắc đó gọi là **last-writer-wins**. Trong lúc chưa hội tụ, hai region trả về hai kết quả khác nhau cho cùng một câu hỏi; đó là **eventual consistency**: "cuối cùng sẽ giống nhau", không phải "lúc nào cũng giống nhau".

Có ba cách tổ chức việc ghi để sống chung với chuyện này:

| Cách ghi | Ý tưởng | Dịch vụ hợp | Đánh đổi |
|----------|---------|-------------|----------|
| **Write global** | Mọi lệnh ghi về **một** region, các region khác chỉ đọc | **Aurora Global Database** (1 region ghi) | Không có xung đột. User ở xa chịu độ trễ khi ghi; mất region ghi thì phải promote region khác |
| **Write local** | Ghi ở region gần nhất, chấp nhận xung đột và để hệ thống tự phân xử | **DynamoDB Global Tables** (last-writer-wins) | Ghi nhanh ở mọi nơi. Có thể mất một trong hai bản ghi đồng thời, như ví dụ giỏ hàng |
| **Write partitioned** ("data partition by region") | Mỗi bản ghi có **một region chủ** cố định, ví dụ theo user: user EU chỉ ghi ở Frankfurt, user châu Á chỉ ghi ở Singapore | Bất kỳ, kể cả S3 replication hai chiều | Không xung đột vì không bao giờ có hai region ghi cùng một bản ghi. App phải tự định tuyến lệnh ghi theo region chủ |

> 🪤 Bẫy thi: Active/Active trên database quan hệ thì **Aurora Global không cho ghi ở nhiều region** — chỉ một region ghi, các region còn lại đọc (hoặc bật *write forwarding* để chuyển lệnh ghi về primary). Đề nói *"multi-region, multi-active/multi-master writes"* → **DynamoDB Global Tables**.

---

## 5. Service-specific replication

Mỗi dịch vụ lưu dữ liệu có cách sao chép riêng. Với từng cái cần trả lời bốn câu: **đồng bộ hay bất đồng bộ** (quyết định RPO), **bên nhận có ghi được không**, **failover tự động hay phải tự bấm** (quyết định RTO), và **tốn thêm gì**.

Một nguyên tắc dùng cho cả mục này: replication giữa các **AZ trong một region** thường **đồng bộ** vì các AZ gần nhau, trễ mạng cỡ mili-giây. Replication **giữa các region** gần như luôn **bất đồng bộ**, vì bắt mỗi lệnh ghi chờ xác nhận từ nơi cách hàng nghìn km sẽ cộng thêm hàng chục tới hàng trăm mili-giây vào từng lệnh. Bất đồng bộ nghĩa là RPO lớn hơn 0: những gì chưa kịp gửi đi lúc region sập là mất.

### 5.1 RDS
- **Multi-AZ** = HA single region. Standby đồng bộ, failover **tự động** trong 60–120 giây, không mất dữ liệu (§3.1). Không giúp gì khi cả region sập.
- **Read Replica cross-region** = async, manual promote. Một bản sao chỉ-đọc ở region khác, nhận thay đổi với độ trễ dao động theo tải ghi. Khi cần failover, **bạn** phải ra lệnh promote; nó tách khỏi nguồn, reboot và trở thành một database độc lập ghi được, mất vài phút. Sau đó app phải trỏ sang endpoint mới, và muốn quay về region cũ thì phải dựng lại replication từ đầu.
- **Snapshot cross-region copy** = backup-based DR. Rẻ nhất, vì không có instance nào chạy ở DR; RPO bằng khoảng cách giữa hai snapshot, RTO bằng thời gian restore (§4.1).

Ba dòng này tương ứng đúng ba mức: HA trong region, Pilot Light/Warm Standby, và Backup & Restore.

### 5.2 Aurora
- **Aurora Global Database**: 1 writer + 5 reader region, < 1s lag, RPO 1s, RTO < 1 phút **managed failover**.
- Headless reader region (no compute, only storage) for cost saving.

**Cơ chế.** Một cluster **primary** ở một region nhận mọi lệnh ghi; các cluster **secondary** ở region khác chỉ đọc. Việc sao chép diễn ra ở **tầng storage** bằng hạ tầng riêng, không phải database engine tự đọc log rồi gửi đi như read replica của RDS. Vì thế độ trễ thường dưới 1 giây và gần như không ăn vào CPU của instance writer. Đó là nguyên nhân gốc khiến Aurora Global đạt RPO cỡ giây trong khi RDS cross-region read replica có độ trễ biến động.

**Hai thao tác đổi region, đừng nhầm:**

| | **Switchover** (có kế hoạch) | **Failover** (sự cố thật) |
|--|------------------------------|---------------------------|
| Khi dùng | Diễn tập DR, bảo trì, chuyển primary theo múi giờ | Region primary đã sập |
| Mất dữ liệu | **Không** (RPO = 0): Aurora chờ secondary đồng bộ xong mới đổi vai | **Có thể** vài giây: không chờ được vì primary đã chết |
| Ai kích hoạt | Bạn | **Cũng là bạn** — Aurora không tự failover sang region khác |

"Managed failover" nghĩa là sau khi bạn ra lệnh, Aurora tự lo phần còn lại: promote secondary, và khi region cũ sống lại thì tự gắn nó vào làm secondary. Nó **không** có nghĩa là tự động phát hiện sự cố rồi tự chuyển. Muốn tự động thì bạn phải dựng (CloudWatch alarm → Lambda gọi API failover).

**Headless secondary** là một cluster secondary **đã xoá hết DB instance**, chỉ còn volume storage vẫn được đồng bộ. Aurora tính tiền compute và storage tách riêng, nên bạn chỉ trả tiền storage và replication. Cái giá nằm ở RTO: trước khi failover sang đó **phải tạo một DB instance** gắn vào cluster rồi mới promote được, tức cộng thêm thời gian tạo instance. Headless là kiểu Pilot Light rẻ nhất cho Aurora, hợp với yêu cầu "phải có bản sao dữ liệu ở region khác" hơn là yêu cầu RTO ngắn.

> 📏 Số liệu: đề thi và nhiều tài liệu dùng **tối đa 5 secondary region, lag < 1 giây, RPO ~1 giây, RTO < 1 phút**. Docs hiện tại ghi **tới 10 secondary region**, mỗi secondary tối đa 16 reader instance, RPO "thường tính bằng giây" và RTO "cỡ vài phút" (switchover trên engine mới thường dưới 30 giây). Đi thi cứ nhớ bộ số "1 giây / 1 phút".

### 5.3 DynamoDB
- **Global Tables**: multi-region active-active, eventual consistency, last-writer-wins.
- **PITR**: 35 ngày.

**Global Tables.** Một bảng có **replica ở nhiều region và replica nào cũng ghi được**. Bạn ghi vào region gần nhất; DynamoDB tự chép thay đổi sang các region còn lại, thường trong khoảng 1 giây. Vì mọi replica đều nhận ghi nên **không có bước promote**: region A sập thì app chỉ việc gọi sang endpoint của region B. Cái giá là xung đột khi hai region cùng sửa một item, được phân xử bằng last-writer-wins (ví dụ giỏ hàng ở §4.4). Chi phí: mỗi lệnh ghi được tính ở **mọi** region có replica, nên bảng 3 region thì tiền ghi xấp xỉ gấp ba.

> 📏 Global Tables mặc định chạy chế độ eventual consistency như mô tả trên — đây cũng là chế độ đề thi hỏi. AWS đã thêm một chế độ thứ hai là **multi-Region strong consistency (MRSC)**: lệnh ghi được chép đồng bộ sang ít nhất một region khác trước khi báo thành công, nên RPO = 0; đổi lại bảng phải nằm ở đúng 3 region và lệnh ghi chậm hơn.

**PITR (Point-in-Time Recovery).** Khi bật, DynamoDB lưu backup liên tục và cho bạn khôi phục bảng về **bất kỳ giây nào trong 35 ngày gần nhất**. PITR trả lời một câu hỏi khác hẳn Global Tables: nếu một bản deploy lỗi ghi rác vào bảng lúc 10:15, Global Tables sẽ **replicate luôn chỗ rác đó** sang mọi region trong một giây; PITR mới cho bạn quay bảng về 10:14. Restore luôn tạo ra một **bảng mới**.

> 🪤 Bẫy thi: **replication không thay được backup.** Replication chống mất hạ tầng (region/AZ sập). Backup và PITR chống mất dữ liệu do xoá nhầm, bug, ransomware. Kiến trúc đủ thường cần cả hai.

### 5.4 S3
- **CRR / SRR** + versioning.
- **MRAP**: active-active S3 cross-region.
- **Batch Replication** cho object cũ.

**CRR (Cross-Region Replication)** tự chép object từ bucket nguồn sang bucket ở region khác; **SRR (Same-Region Replication)** làm y hệt nhưng trong cùng region, dùng để gom log về một bucket hoặc giữ bản sao ở account khác. Ba điều cần nhớ về cơ chế:

- **Phải bật versioning ở cả hai bucket**: replication chép theo từng version của object.
- **Bất đồng bộ.** Phần lớn object sang tới nơi trong vài giây tới vài phút, không có cam kết. Muốn có cam kết thì bật **S3 Replication Time Control (RTC)**: 99,9% object được chép trong vòng 15 phút, kèm metric và cảnh báo khi vượt ngưỡng. Đề hỏi *"replicate S3 với RPO 15 phút, có SLA"* → RTC.
- **Chỉ chép object được ghi SAU khi bật rule.** Object đã có từ trước không tự sang; phải chạy **S3 Batch Replication** một lần để chép chúng. Batch Replication cũng dùng để chép lại các object từng replicate lỗi.

Mặc định khi bạn xoá object ở bucket nguồn, delete marker **không** được chép sang đích. Nhờ vậy bucket đích không bị xoá theo khi có người xoá nhầm ở nguồn.

**MRAP (Multi-Region Access Point)** là **một endpoint toàn cầu duy nhất** đứng trước nhiều bucket ở nhiều region. App chỉ biết một tên; S3 tự đưa request tới bucket gần nhất còn hoạt động, đi qua mạng riêng của AWS (dùng Global Accelerator bên dưới). Lưu ý MRAP **chỉ định tuyến, không tự chép dữ liệu**: bạn vẫn phải cấu hình CRR giữa các bucket, hai chiều nếu muốn ghi ở đâu cũng được. Có thêm *failover controls* để đặt một region thành passive và chuyển hướng traffic trong vài phút. Không có MRAP thì khi một region sập bạn phải tự đổi tên bucket/endpoint trong config của app.

### 5.5 EBS / EFS
- **Snapshot cross-region copy** via AWS Backup.
- **EFS Replication**: continuous async, RPO < 15 phút (mới 2022).

**EBS** là ổ đĩa gắn vào EC2 và **nằm trong đúng một AZ**. Nó không có replication liên tục sang region khác; cách DR là chụp **snapshot** (lưu trên S3, tính tăng dần: chỉ lưu các block thay đổi so với lần trước) rồi copy snapshot sang region DR, lên lịch bằng AWS Backup hoặc Data Lifecycle Manager. RPO bằng khoảng cách giữa hai snapshot.

**EFS** là file system dùng chung cho nhiều máy, bản thân đã Multi-AZ. **EFS Replication** tự tạo và duy trì một file system bản sao ở region khác (hoặc cùng region), đồng bộ liên tục và bất đồng bộ, với RPO **15 phút** cho hầu hết file system. File system đích ở trạng thái **chỉ đọc** trong lúc đang nhận replication. Failover nghĩa là cho app mount bản sao và biến nó thành ghi được; khi region cũ hồi phục thì đảo chiều replication để failback.

Khác biệt gốc giữa hai cái: EFS có replication liên tục nên RPO cỡ phút mà không cần lịch; EBS chỉ có snapshot nên RPO phụ thuộc lịch chụp.

### 5.6 ElastiCache
- **Global Datastore** (Redis): 1 primary + up to 2 secondary region, cross-region replication.

Cluster **primary** ở một region nhận ghi; tối đa **2 region khác** có cluster **secondary** chỉ đọc, nhận replication bất đồng bộ. Dùng cho hai việc: user ở xa đọc cache gần mình, và DR. ElastiCache **không tự failover giữa các region**: khi primary sập bạn phải tự promote một secondary. Chi phí là một cluster đầy đủ ở mỗi region (các cluster phải cùng node type và cùng số shard), cộng tiền truyền dữ liệu giữa region.

Trước khi dùng nên hỏi: cache này có **dựng lại được** từ database không? Nếu có, cách rẻ hơn là để region DR chạy cache rỗng rồi tự làm nóng dần. Global Datastore đáng tiền khi Redis giữ thứ không có ở đâu khác (session, giỏ hàng, bảng xếp hạng) hoặc khi cache rỗng sẽ làm database quá tải ngay sau failover.

### 5.7 Đặt cạnh nhau

| Dịch vụ | Cơ chế cross-region | Sync? | Region kia ghi được? | Failover |
|---------|---------------------|-------|----------------------|----------|
| RDS | Cross-region read replica | Async | Không, cho tới khi promote | Tự promote bằng tay, vài phút |
| Aurora | Global Database | Async, thường < 1 giây | Không (1 region ghi) | Managed, nhưng bạn kích hoạt |
| DynamoDB | Global Tables | Async, ~1 giây (mặc định) | **Có**, mọi region | Không cần promote, đổi endpoint |
| S3 | CRR (+ MRAP để định tuyến) | Async; RTC cam kết 15 phút | Có nếu CRR hai chiều | MRAP tự định tuyến / failover controls |
| EFS | EFS Replication | Async, RPO 15 phút | Không (chỉ đọc) | Tự chuyển, rồi đảo chiều để failback |
| EBS | Copy snapshot | Theo lịch | — | Restore volume từ snapshot |
| ElastiCache | Global Datastore | Async | Không | Tự promote bằng tay |

> 🪤 Bẫy thi: *"RDS MySQL, cần DR sang region khác, RPO thấp"* → cross-region read replica. Vẫn câu đó nhưng thêm *"RPO ~1 giây, RTO ~1 phút"* hoặc *"ít ảnh hưởng hiệu năng primary"* → chuyển sang **Aurora Global Database**. Thêm *"ghi được ở mọi region"* → **DynamoDB Global Tables**.

---

## 6. Failure isolation patterns

Các mục trên xử lý việc **hạ tầng** hỏng. Mục này xử lý việc **một service phụ thuộc bị chậm hoặc lỗi**, và mục tiêu là không để nó kéo sập những phần còn khoẻ. Hiện tượng lỗi lan từ service này sang service khác gọi là **cascading failure**.

Dùng một kịch bản xuyên suốt: service **Order** nhận 100 request/giây, mỗi request gọi sang service **Payment**. Order có một **thread pool** 200 thread, tức tại một thời điểm xử lý được tối đa 200 request, mỗi request đang chạy chiếm một thread. Bình thường Payment trả lời trong 50 ms. Hôm nay Payment bị treo: không trả lỗi, chỉ im lặng cho tới khi timeout 30 giây.

```
Mỗi giây có 100 request mới, mỗi cái giữ 1 thread suốt 30 giây chờ Payment
→ 200 thread ÷ 100 request/giây = 2 giây là hết sạch thread
```

Sau 2 giây, Order không còn thread nào để phục vụ **bất cứ thứ gì**, kể cả trang "xem lịch sử đơn hàng" vốn không hề gọi Payment. Một service chậm đã làm sập cả service gọi nó. Năm pattern dưới đây mỗi cái chặn một khâu trong chuỗi này.

### 6.1 Circuit Breaker
- Detect downstream fail rate → "open" circuit → fail-fast không gọi nữa → recover sau timeout.
- App-level (Resilience4j, Polly) hoặc service mesh (App Mesh, Istio).

Tên lấy từ **cầu dao điện**: dòng quá tải thì cầu dao tự ngắt để bảo vệ phần còn lại của mạch. Ở đây nó là một lớp bọc quanh lời gọi sang Payment, có ba trạng thái:

| Trạng thái | Hành vi | Chuyển sang trạng thái khác khi |
|------------|---------|----------------------------------|
| **Closed** (đóng mạch, bình thường) | Cho mọi lời gọi đi qua và đếm tỷ lệ lỗi | Tỷ lệ lỗi vượt ngưỡng, ví dụ 50% trong 10 giây gần nhất → **Open** |
| **Open** (ngắt mạch) | **Không gọi Payment nữa**, trả lỗi ngay trong vài mili-giây (fail-fast) | Hết thời gian chờ, ví dụ 30 giây → **Half-open** |
| **Half-open** (thử lại) | Cho **một vài** lời gọi thăm dò đi qua | Thăm dò thành công → **Closed**. Vẫn lỗi → quay lại **Open** |

Áp vào kịch bản: sau vài giây lỗi, mạch chuyển sang open. Request đặt hàng nhận lỗi trong vài mili-giây thay vì giữ thread 30 giây, nên thread pool không cạn và các trang khác vẫn chạy. Payment cũng được lợi: trong 30 giây open nó khỏi phải nhận 100 × 30 = 3.000 lời gọi, có khoảng lặng để hồi phục. Half-open tồn tại để việc hồi phục diễn ra thận trọng: nếu mở lại toàn bộ traffic ngay thì một Payment vừa gượng dậy sẽ bị đè sập lần nữa.

Circuit breaker là logic trong **code hoặc sidecar proxy**, không phải một dịch vụ AWS bạn bật lên. Thư viện phổ biến là Resilience4j (Java) và Polly (.NET). Service mesh như Istio đặt logic này vào proxy chạy cạnh mỗi service nên không phải sửa code.

> 📏 AWS **App Mesh** đã ngừng hỗ trợ từ 30/9/2026; AWS hướng người dùng sang Amazon ECS Service Connect. Tài liệu ôn thi cũ vẫn nhắc App Mesh như lựa chọn service mesh của AWS.

### 6.2 Retry with exponential backoff + jitter
- Retry transient error nhưng tăng wait dần (1s, 2s, 4s, 8s).
- **Jitter** random offset → tránh thundering herd.

**Transient error** là lỗi thoáng qua, thử lại là được: mất một gói tin, bị throttle, một instance vừa bị thay. Retry là phản xạ đúng, nhưng retry ngay lập tức và liên tục lại là cách nhanh nhất để giết một service đang yếu. Nếu 1.000 client cùng gặp lỗi và mỗi client thử lại 3 lần liền nhau, service đang ngắc ngoải nhận tải gấp 4 lần bình thường. Hiện tượng đó gọi là **retry storm**.

**Exponential backoff** là chờ lâu gấp đôi sau mỗi lần thất bại:

```
Lần thử lại 1: chờ 1 giây
Lần thử lại 2: chờ 2 giây
Lần thử lại 3: chờ 4 giây
Lần thử lại 4: chờ 8 giây     → tổng cộng chờ 1 + 2 + 4 + 8 = 15 giây rồi mới bỏ cuộc
```

Nhưng backoff một mình chưa đủ. Giả sử service sập đúng lúc 12:00:00 và 1.000 client cùng nhận lỗi ở giây đó. Tất cả cùng chờ 1 giây và cùng gọi lại lúc 12:00:01; rồi cùng chờ 2 giây và cùng gọi lại lúc 12:00:03; rồi 12:00:07. Service nhận **những đợt sóng 1.000 request cùng một khoảnh khắc**, xen giữa là khoảng lặng. Đó là **thundering herd** ("đàn thú giẫm đạp"): rất nhiều client bị đồng bộ hoá vào cùng một thời điểm.

**Jitter** phá sự đồng bộ đó bằng cách cho mỗi client chờ một khoảng **ngẫu nhiên**. Kiểu phổ biến nhất là "full jitter": thay vì chờ đúng 4 giây, chờ một số ngẫu nhiên từ 0 tới 4 giây.

```
Không jitter:   client A chờ 1 → 2 → 4 → 8 giây   (y hệt 999 client còn lại)
Có full jitter: client A chờ 0,1 → 1,7 → 3,1 → 2,0 giây
                client B chờ 0,8 → 0,3 → 2,6 → 6,4 giây   ...mỗi client một kiểu
```

1.000 lời gọi lại giờ rải đều trong cả khoảng thời gian thay vì dồn vào một điểm. Hai giới hạn nên có thêm: **số lần thử tối đa** (không retry vô hạn) và **trần thời gian chờ**.

AWS SDK đã làm sẵn việc này cho mọi lời gọi tới API của AWS: boto3 mặc định thử tối đa 5 lần với backoff hệ số 2. Bạn chỉ phải tự viết cho lời gọi giữa các service của mình.

> 🪤 Chỉ retry những thao tác **idempotent**, tức gọi hai lần cho kết quả như gọi một lần. Retry một lệnh "trừ tiền" không có idempotency key là trừ tiền hai lần.

### 6.3 Bulkhead
- Isolate resource per service/tenant — 1 service fail không drain pool chung.

**Bulkhead** là vách ngăn chia thân tàu thành nhiều khoang kín: thủng một khoang thì chỉ khoang đó ngập, tàu vẫn nổi. Trong phần mềm, "khoang" là một phần tài nguyên được **chia riêng và có trần**: thread pool, connection pool, hạn mức concurrency.

Quay lại kịch bản. Vấn đề gốc là mọi loại request dùng **chung** một pool 200 thread, nên Payment treo có thể ăn hết cả 200. Chia lại:

```
Pool chung 200 thread  →  Pool "gọi Payment":  50 thread
                          Pool "mọi thứ khác": 150 thread
```

Payment treo thì nhiều nhất 50 thread bị kẹt; request đặt hàng thứ 51 bị từ chối ngay, còn 150 thread kia vẫn phục vụ bình thường. Thiệt hại bị nhốt trong một khoang.

Cùng ý tưởng ở những tầng khác trên AWS:

- **Lambda reserved concurrency**: đặt trần số bản chạy đồng thời cho một function, để nó không nuốt hết hạn mức concurrency của cả account và bóp nghẹt các function khác.
- **Theo tenant**: mỗi khách hàng lớn một queue, một nhóm worker hoặc một hạn mức riêng, để một khách gửi tải bất thường không làm chậm những khách còn lại (vấn đề "noisy neighbor").
- **Theo AZ hoặc cell**: chia hệ thống thành các cụm độc lập, mỗi cụm phục vụ một phần user, để một bản deploy lỗi chỉ ảnh hưởng một cụm.

### 6.4 Throttling
- Server-side rate limit để tự bảo vệ.
- API Gateway throttle, WAF rate-based rules (gắn vào ALB/CloudFront/API Gateway).

Ba pattern trên là client tự kiềm chế. Throttling là **phía server chủ động từ chối** phần request vượt ngưỡng nó chịu được, để phần còn lại vẫn được phục vụ tử tế. Lý do: một service nhận 150% công suất thường không phục vụ được 100% rồi bỏ 50%. Nó chậm dần với **tất cả**, hàng đợi dài ra, mọi request timeout, và cuối cùng phục vụ được gần 0%. Trả về `429 Too Many Requests` cho 50 request thừa rẻ hơn nhiều so với xử lý dở dang cả 150.

Công cụ trên AWS:

- **API Gateway throttling**: đặt giới hạn theo **rate** (số request/giây ổn định) và **burst** (số request dồn dập chấp nhận trong chốc lát), dùng thuật toán token bucket. Đặt được theo account, theo stage/method, hoặc theo từng client qua **usage plan** gắn với API key. Vượt ngưỡng thì trả `429`.
- **AWS WAF rate-based rule**: đếm request theo từng địa chỉ IP (hoặc khoá khác) trong một cửa sổ thời gian và chặn IP nào vượt ngưỡng. Gắn được vào **ALB**, CloudFront, API Gateway.
- ALB tự nó **không có tính năng rate limit**; muốn giới hạn tốc độ trước ALB thì gắn WAF vào ALB.

Throttling và retry phải đi cùng nhau: server trả `429`, client lùi lại bằng backoff + jitter. Client nhận `429` mà retry ngay lập tức thì throttling vô nghĩa.

### 6.5 Graceful degradation
- Fallback response khi downstream fail (e.g. cached version, default page).

Khi một thành phần phụ hỏng, hệ thống **giảm chức năng** thay vì trả lỗi cả trang. Câu hỏi thiết kế là: *"phần này hỏng thì user vẫn làm được việc chính không?"*

Ví dụ trang sản phẩm gọi ba service là thông tin sản phẩm, đánh giá của khách, và gợi ý "có thể bạn cũng thích":

- Service gợi ý sập → ẩn khối gợi ý, hoặc hiện danh sách bán chạy lấy từ cache. User vẫn mua được hàng.
- Service đánh giá chậm → hiện số sao đã cache từ một giờ trước kèm dòng "đang cập nhật".
- Service thông tin sản phẩm sập → đây là chức năng lõi, không có fallback hợp lý, lúc này mới trả trang lỗi.

Fallback thường gặp: dữ liệu cũ từ cache, giá trị mặc định, trang tĩnh trên S3 (CloudFront custom error page, hoặc Route 53 failover sang một static site báo bảo trì), hoặc nhận yêu cầu vào queue rồi xử lý sau khi downstream sống lại. Graceful degradation thường là **nhánh "open"** của circuit breaker: khi mạch ngắt, thay vì ném lỗi thì trả về fallback.

**Năm pattern cạnh nhau:**

| Pattern | Chặn chuyện gì | Ai thực hiện |
|---------|----------------|--------------|
| Circuit breaker | Gọi mãi vào một service đã chết, giữ thread vô ích | Phía gọi |
| Retry + backoff + jitter | Lỗi thoáng qua thành lỗi thật; retry dồn dập đè sập downstream | Phía gọi |
| Bulkhead | Một phụ thuộc hỏng ăn hết tài nguyên dùng chung | Phía gọi (hoặc nền tảng) |
| Throttling | Tải vượt công suất làm sập cả service | Phía được gọi |
| Graceful degradation | Thành phần phụ hỏng làm hỏng trải nghiệm chính | Phía gọi |

→ Foundation [[foundations-06-failure-modes]] đi sâu các pattern này.

---

## 7. Chaos Engineering

Ý tưởng: **chủ động gây lỗi có kiểm soát** để xem hệ thống có thật sự chịu được như thiết kế hay không, thay vì chờ sự cố thật trả lời hộ. Mọi cơ chế ở §3–§6 đều là giả định cho tới khi được thử.

- **AWS Fault Injection Service (FIS)** — managed chaos test (Netflix-style). Bạn viết một *experiment template* gồm: hành động gây lỗi, mục tiêu (chọn theo tag), và **stop condition** — một CloudWatch alarm mà khi kêu thì FIS tự dừng thí nghiệm.
- Inject failures: EC2 stop, throttle API, network latency, RDS reboot...
- Run in dev/staging trước prod.
- "Game Day" — team practice DR procedure. Đây là buổi diễn tập có lịch: cả đội chạy runbook failover thật, đo RTO/RPO thực tế rồi so với mục tiêu.

---

## 8. Backup best practices

### 8.1 AWS Backup
- **Backup Plan**: rule + schedule + retention + lifecycle (move to cold storage) + copy cross-region/account.
- **Backup Vault**: container + KMS encryption. Mỗi bản backup trong vault gọi là một *recovery point*.
- **Vault Lock**: immutable retention (compliance). Có hai chế độ: **governance** (user có đủ quyền IAM vẫn gỡ được lock) và **compliance** (sau thời gian "grace time" tối thiểu 3 ngày thì không ai gỡ hay xoá được nữa, kể cả root user và AWS, cho tới khi hết thời hạn giữ).
- **Audit Manager** integration: tự kiểm tra và báo cáo resource nào chưa được backup đúng chính sách.

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
   <details><summary>Đáp án</summary>**Multi-Site Active/Active** với **Aurora Global** (RPO ~1s, RTO < 1 phút theo số đề thi) + DDB Global Tables + Route 53 latency + GA.</details>

3. Aurora Global vs RDS Read Replica cross-region cho DR?
   <details><summary>Đáp án</summary>**Aurora Global** managed failover < 1 phút, RPO 1s, dedicated replication infra. **RDS Read Replica** manual promote, lag biến động. Aurora Global tốt hơn nếu engine support.</details>

4. App Multi-AZ. Một AZ down. User có nhận thấy không?
   <details><summary>Đáp án</summary>Nếu thiết kế đúng — **gần như không**: không ai phải can thiệp và hệ thống tự hồi phục, nhưng có một đợt lỗi transient ngắn. ELB mất tới ~60 giây (health check mặc định) để loại target chết, RDS Multi-AZ failover 60-120s, ASG launch instance ở AZ khác mất vài phút. Xem §3.2.</details>

5. Multi-region active-active. User write A, B đồng thời cùng key DDB Global Tables. Kết quả?
   <details><summary>Đáp án</summary>**Last-writer-wins** (timestamp-based). Data của write trước bị overwrite. Cần app-level conflict resolution nếu critical (vector clock, CRDT).</details>

6. Aurora Global headless reader region — ý nghĩa?
   <details><summary>Đáp án</summary>Region chỉ có storage replicate (cho compliance hoặc cold standby), không có compute → rẻ. Khi cần failover, phải tạo DB instance gắn vào cluster từ storage có sẵn rồi mới promote được, nên RTO dài hơn.</details>

7. EFS replicate cross-region. Lag bao nhiêu?
   <details><summary>Đáp án</summary>**< 15 phút** (RPO ~15 min). Continuous async.</details>

8. Backup Vault Lock immutable mode. Có xóa được không?
   <details><summary>Đáp án</summary>**Compliance mode** = không xóa được, kể cả root. **Governance mode** = user có quyền IAM phù hợp mới gỡ được lock. Compliance có grace time tối thiểu **3 ngày (72 giờ)** sau khi tạo lock; trong khoảng đó còn đổi ý được, hết grace time là khoá vĩnh viễn.</details>

9. Test DR procedure thực tế?
   <details><summary>Đáp án</summary>**Game Day** quarterly — team thực sự failover prod sang DR region, đo RTO actual, document gap. Hoặc dùng **AWS FIS** chaos test.</details>

10. Pattern chống thundering herd retry?
    <details><summary>Đáp án</summary>**Exponential backoff + jitter** — wait random within range tăng dần. boto3 mặc định đã retry kèm exponential backoff (mode `legacy`, tối đa 5 lần thử); mode `standard` và `adaptive` là tuỳ chọn, `adaptive` thêm rate limiting phía client.</details>

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
- **Pilot Light > Active/Active** nếu RTO vài chục phút acceptable: bỏ được toàn bộ compute chạy 24/7 ở region DR (ví dụ ở §2.2: rẻ hơn ~71%).

### Anti-pattern
- ❌ Backup không test restore → không biết RTO thật.
- ❌ Multi-region active-active không cần thiết (RTO 1h OK) → trả gấp đôi hạ tầng cho thứ Pilot Light làm được với ~30% chi phí cộng thêm.
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
