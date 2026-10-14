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

Hoá đơn của một database quan hệ trên AWS gồm bốn khoản, và mỗi mục con dưới đây cắt vào một khoản:

| Khoản | Tính theo | Mục xử lý |
|-------|-----------|-----------|
| **Compute** (instance) | Giờ chạy, kể cả khi instance rảnh | §2.1, §2.2, §2.5, §2.6, §2.8 |
| **Storage** | GB cấp phát (RDS) hoặc GB thực dùng (Aurora) mỗi tháng | §2.3, §2.4 |
| **I/O** | IOPS cấp phát (RDS io1/io2) hoặc số request đọc/ghi đĩa (Aurora Standard) | §2.3, §2.4 |
| **Backup** | GB snapshot vượt phần miễn phí | §2.7 |

Hai thuật ngữ dùng suốt mục này. **IOPS** (I/O operations per second) là số thao tác đọc/ghi đĩa mỗi giây mà volume phục vụ được. **Multi-AZ** là cấu hình có thêm một bản sao database ở Availability Zone khác để tự chuyển sang khi AZ chính hỏng.

### 2.1 Right-size instance

Right-size nghĩa là hạ instance xuống cỡ vừa với tải thật. Lý do nó đứng đầu danh sách: compute thường là khoản lớn nhất, và giá instance **gấp đôi mỗi lần lên một cỡ** — `db.r6i.4xlarge` (16 vCPU, 128 GiB RAM) giá gấp đôi `db.r6i.2xlarge`. Hạ được một cỡ là cắt 50% tiền compute của instance đó.

Cách tìm instance thừa:

- **CloudWatch** cho biết CPU, RAM còn trống (`FreeableMemory`), số connection, IOPS thực tế. Một instance có CPU trung bình 20% và đỉnh không quá 40% trong 2–4 tuần là ứng viên hạ một cỡ.
- **Performance Insights** là công cụ của RDS vẽ "tải database" theo thời gian và chỉ ra query nào, đang chờ gì (CPU, lock, I/O). Dùng nó để chắc rằng instance thừa thật chứ không phải đang nghẽn ở chỗ khác.

Môi trường non-prod (dev, staging) thì hạ mạnh tay, vì chậm một chút không ảnh hưởng khách hàng. Với workload lên xuống thất thường, **Aurora Serverless v2** tự co giãn compute theo tải nên không phải chọn cỡ instance — xem §2.8 về đơn vị ACU của nó.

### 2.2 Reserved Instance / Savings Plan

**Reserved Instance (RI)** không phải một loại máy khác. Nó là một **cam kết thanh toán**: bạn hứa dùng một cấu hình instance trong 1 hoặc 3 năm, đổi lại AWS giảm giá giờ chạy. Instance vẫn y như cũ, chỉ có hoá đơn thay đổi.

- **RDS RI** giảm **tối đa ~69%** so với on-demand. Mức cao nhất là kỳ hạn 3 năm trả trước; kỳ hạn 1 năm không trả trước giảm khoảng 30%.
- RI gắn với **engine, họ instance, region và kiểu triển khai** (Single-AZ hay Multi-AZ). Mua RI cho `db.r6i` PostgreSQL thì không áp được cho `db.r6g` hay cho MySQL.
- Có **size flexibility** trong cùng họ instance với hầu hết engine: một RI `db.r6i.4xlarge` phủ được hai `db.r6i.2xlarge`. SQL Server và Oracle License Included không có tính năng này.
- **RDS không có Convertible RI.** Loại RI đổi được họ instance là của EC2. Muốn đổi engine hay họ instance giữa kỳ hạn thì RI cũ coi như bỏ phí, nên **right-size trước rồi mới mua RI** (đúng thứ tự trong câu chuyện ở §1).
- **Aurora** cũng mua RI theo cách tương tự cho instance provisioned: tới ~45% kỳ 1 năm, ~66% kỳ 3 năm.

> 📏 **Đề thi và thực tế hiện nay.** Đề SAA-C03 coi là đúng: *"Compute Savings Plans không áp cho RDS — database phải dùng Reserved Instance"*. Hiện AWS đã có thêm **Database Savings Plans**: cam kết một mức chi $/giờ trong 1 năm, không trả trước, giảm tới ~35%, áp chung cho Aurora, RDS, DynamoDB, ElastiCache (Valkey), DocumentDB, Neptune và không khoá vào engine hay họ instance. Mức giảm thấp hơn RI nhưng linh hoạt hơn. Gặp câu hỏi thi cũ thì vẫn chọn RI cho RDS.

### 2.3 Storage tier (Aurora I/O-Optimized vs Standard)

Aurora tính tiền I/O khác RDS. Ở RDS bạn trả cho dung lượng và IOPS **cấp phát**. Ở Aurora bạn không cấp phát gì: storage tự lớn theo dữ liệu, và có hai cách tính tiền cho cùng một cluster.

| | **Aurora Standard** | **Aurora I/O-Optimized** |
|--|---------------------|--------------------------|
| Storage | ~$0,10/GB-tháng | ~$0,225/GB-tháng |
| I/O | **~$0,20 cho mỗi triệu request** đọc/ghi đĩa | **$0** |
| Compute | Giá gốc | Đắt hơn ~30% |

(Giá us-east-1.) Nói gọn: **Standard** là trả theo lượng I/O thực tế, **I/O-Optimized** là trả một khoản cố định cao hơn cho compute và storage để I/O không còn bị tính tiền.

**Ngưỡng 25% từ đâu ra.** Chuyển sang I/O-Optimized thì compute đội thêm ~30% và storage đắt hơn, đổi lại tiền I/O về 0. Vậy I/O-Optimized chỉ lời khi tiền I/O đang trả **lớn hơn phần đội thêm đó**. Với cluster mà compute chiếm phần lớn hoá đơn, điều kiện "I/O > 30% tiền compute" tương đương "I/O chiếm hơn ~23% tổng bill" — AWS làm tròn thành quy tắc **I/O trên 25% tổng chi Aurora thì chuyển** (và nói tiết kiệm được tới 40%).

**Tính thử** với cluster 1 writer + 1 reader `db.r6i.4xlarge`, 1 TB dữ liệu, tháng 730 giờ. Đây cũng là cách làm bài tập 6:

```
Tải nặng: 50.000 I/O mỗi giây liên tục
  Số I/O một tháng: 50.000 × 3.600 × 730        = 131,4 tỷ request
  Standard:      compute 2 × $2,32 × 730         = $3.387
                 storage 1.024 GB × $0,10        = $102
                 I/O     131.400 triệu × $0,20   = $26.280
                 Tổng                            ≈ $29.770/tháng   (I/O chiếm 88%)
  I/O-Optimized: compute 2 × $3,016 × 730        = $4.403
                 storage 1.024 GB × $0,225       = $230
                 I/O                             = $0
                 Tổng                            ≈ $4.634/tháng    → rẻ hơn ~6 lần

Tải nhẹ: 1.000 I/O mỗi giây
  Standard:      $3.387 + $102 + $526 (I/O)      ≈ $4.015/tháng    (I/O chiếm 13%)
  I/O-Optimized: vẫn                             ≈ $4.634/tháng    → Standard rẻ hơn
```

Điểm hoà vốn của cluster này là khoảng 2.200 I/O mỗi giây (tiền I/O ≈ $1.144/tháng, đúng bằng phần compute và storage đội thêm). Con số I/O thực tế xem ở metric `VolumeReadIOPs` và `VolumeWriteIOPs` của cluster. Nó không trùng hẳn với "IOPS" của ứng dụng vì Aurora gộp nhiều lần ghi nhỏ vào một request.

### 2.4 Storage rightsizing

Mục này nói về **RDS thường** (MySQL, PostgreSQL, SQL Server…), nơi storage là volume EBS mà bạn chọn loại. Aurora không có lựa chọn này.

**gp2 sang gp3.** Cả hai là SSD đa dụng và cùng giá ~$0,115/GB-tháng. Khác nhau ở cách có IOPS:

- **gp2** buộc IOPS vào dung lượng: 3 IOPS cho mỗi GB. Volume 100 GB chỉ có 300 IOPS, muốn 3.000 IOPS phải mua 1.000 GB dù không cần chỗ chứa.
- **gp3** tách hai thứ ra: volume nào cũng có sẵn **3.000 IOPS và 125 MiB/s**, và trên RDS từ **400 GB trở lên thì có sẵn 12.000 IOPS và 500 MiB/s**. Cần hơn thì mua thêm IOPS riêng (~$0,02/IOPS-tháng) mà không phải mua thêm GB.

Vì thế chuyển gp2 sang gp3 gần như không có mặt trái: cùng giá, IOPS nền bằng hoặc cao hơn. Ngoại lệ hiếm là volume gp2 rất lớn (trên 4.000 GB) vốn đã có hơn 12.000 IOPS nhờ quy tắc 3 IOPS/GB; chuyển sang gp3 thì phải mua bù phần chênh.

**io1/io2 (Provisioned IOPS).** Loại này trả riêng cho từng IOPS cấp phát, ~$0,10/IOPS-tháng cộng ~$0,125/GB-tháng, và **trả đủ dù không dùng tới**. Đây là chỗ tiền rò nhiều nhất. Lấy đúng volume trong câu chuyện ở §1 (2 TB, cấp 30.000 IOPS, thực dùng trung bình 3.000):

```
io2 2 TB + 30.000 IOPS:  2.048 GB × $0,125 + 30.000 × $0,10  = $3.256/tháng
gp3 2 TB (có sẵn 12.000 IOPS, gấp 4 lần mức đang dùng):
                         2.048 GB × $0,115                    = $236/tháng
→ tiết kiệm ≈ $3.000/tháng cho mỗi bản sao storage
  (Multi-AZ có 2 bản sao nên giá storage và IOPS đều nhân đôi)
```

Nếu thật sự cần Provisioned IOPS (latency dưới 1 ms ổn định, hoặc hơn 64.000 IOPS là trần của gp3 trên RDS) thì chọn **io2 Block Express** thay io1: cùng giá, bền hơn, lên tới 256.000 IOPS.

🪤 **Giảm dung lượng đã cấp phát thì không làm được tại chỗ.** RDS chỉ cho tăng storage. Snapshot rồi restore cũng không thu nhỏ được, vì bản restore phải có dung lượng ít nhất bằng bản gốc. Muốn nhỏ lại phải tạo instance mới với volume nhỏ hơn rồi chuyển dữ liệu sang (dump/restore hoặc DMS). Vì vậy đừng cấp dư "cho chắc": cấp vừa đủ và bật **storage autoscaling** để RDS tự tăng khi gần đầy.

### 2.5 Multi-AZ vs Single-AZ

**RDS Multi-AZ** chạy thêm một instance **standby** ở AZ khác, có volume riêng và được ghi đồng bộ từ primary. Standby chỉ ngồi chờ failover, không phục vụ query nào. Bạn trả tiền cho cả hai instance và cả hai volume, nên **Multi-AZ đúng bằng 2 lần Single-AZ**:

```
db.r6i.4xlarge PostgreSQL, us-east-1, 730 giờ/tháng
  Single-AZ: $2,00/giờ → $1.460/tháng
  Multi-AZ:  $4,00/giờ → $2.920/tháng   (storage và IOPS cũng tính gấp đôi)
```

Khoản gấp đôi này mua khả năng tự failover trong khoảng 1–2 phút khi AZ hỏng. Production cần nó. Dev và staging thường thì không: mất database dev 30 phút rẻ hơn nhiều so với trả gấp đôi cả năm. Tắt Multi-AZ ở non-prod là một trong những khoản cắt dễ nhất.

**Aurora khác ở tầng storage.** Aurora tách compute khỏi storage: dữ liệu nằm trên một **cluster volume dùng chung**, tự nhân thành 6 bản trải trên 3 AZ, và bạn chỉ trả tiền storage **một lần** dù có bao nhiêu instance. Hệ quả:

- Độ bền dữ liệu qua nhiều AZ đã có sẵn, kể cả khi cluster chỉ có một instance.
- "Multi-AZ" của Aurora nghĩa là **thêm một reader instance ở AZ khác**. Khi writer hỏng, reader đó được đưa lên làm writer. Nó là tuỳ chọn, và khác standby của RDS ở chỗ **reader này phục vụ được query đọc** trong lúc chờ, nên tiền bỏ ra không nằm không.
- Không có reader thì Aurora vẫn tự dựng lại một writer mới, nhưng lâu hơn nhiều: cỡ chục phút, so với khoảng một phút khi đã có sẵn reader để đưa lên.

### 2.6 Read Replica strategy

Read replica là một bản sao chỉ đọc của database, dùng để san bớt query `SELECT` khỏi primary. Về tiền thì cần nhớ một điều: **mỗi replica là một instance tính tiền đầy đủ**, chạy 24/7 dù có query hay không. Trong §1, ba trên bốn replica có CPU dưới 5%, tức là đang trả ba instance để gần như không làm gì.

Khác biệt giữa RDS và Aurora lại nằm ở storage:

```
Primary 1 TB + 2 read replica
  RDS:    3 volume riêng → 3 × 1.024 GB × $0,115 = $353/tháng tiền storage
  Aurora: 1 cluster volume dùng chung → 1.024 GB × $0,10 = $102/tháng
```

Replica của RDS phải có volume riêng vì nó là một database độc lập nhận dữ liệu qua replication. Reader của Aurora đọc thẳng từ cluster volume chung nên không tốn thêm storage — nhưng **compute thì vẫn trả đủ**. "Aurora replica rẻ hơn" chỉ đúng với phần storage.

Nếu tải đọc lên xuống theo giờ, dùng **reader Aurora Serverless v2**: reader tự co về mức thấp lúc vắng thay vì giữ một instance to cho giờ cao điểm. Còn nếu query đọc lặp lại nhiều (cùng một trang sản phẩm), một lớp cache ElastiCache thường rẻ hơn thêm replica.

### 2.7 Backup

RDS backup tự động gồm hai phần: **snapshot hằng ngày** của volume và **transaction log** ghi liên tục, để khôi phục về một thời điểm bất kỳ trong **retention period** (thời hạn giữ backup, 1–35 ngày).

Cách tính tiền: RDS **miễn phí dung lượng backup tới bằng tổng dung lượng database đã cấp phát** trong region. Phần vượt tính ~$0,095/GB-tháng. Snapshot là incremental (chỉ lưu block thay đổi), nên retention 7 ngày của một database ít ghi thường nằm trọn trong phần miễn phí. Retention càng dài và database càng ghi nhiều thì lượng block thay đổi tích lại càng lớn, và vượt ngưỡng.

```
Database 2 TB cấp phát → miễn phí 2.048 GB backup
Retention 35 ngày, tích luỹ 12 TB backup → vượt ~10.240 GB × $0,095 ≈ $973/tháng
Hạ về 7 ngày, còn ~3 TB → vượt ~1.024 GB × $0,095 ≈ $97/tháng
```

(Lượng backup tích luỹ ở trên là số giả định để minh hoạ; số thật xem ở hoá đơn mục *backup storage*. Kết quả khớp với khoản "tiết kiệm $1k" trong §1.)

Hai chỗ hay bị quên:

- **Manual snapshot không bao giờ tự hết hạn.** Snapshot tự động bị xoá khi quá retention, còn snapshot bạn bấm tay (hoặc script tạo trước mỗi lần deploy) nằm đó tới khi có người xoá, kể cả sau khi database đã bị xoá. Cần dọn định kỳ.
- **AWS Backup** quản lý backup tập trung cho nhiều dịch vụ (RDS, EBS, DynamoDB, EFS…) bằng *backup plan*. Plan có lifecycle rule: tự xoá sau N ngày, và với các dịch vụ hỗ trợ thì chuyển bản backup cũ sang **cold storage** rẻ hơn. Dùng nó khi cần giữ backup dài hạn vì compliance mà không muốn trả giá storage nóng.

### 2.8 Stop instance khi không dùng

Database dev chỉ dùng giờ hành chính thì 128 trên 168 giờ mỗi tuần là chạy không. Có hai cách ngừng trả tiền compute cho khoảng đó.

**Stop RDS instance.** Khi stop, bạn **không trả giờ instance** nhưng **vẫn trả storage, IOPS cấp phát và backup**. Giới hạn: tối đa **7 ngày liên tục**, sau đó RDS **tự bật lại** để không lỡ các bản vá bảo trì. Muốn tắt lâu hơn phải có lịch (EventBridge + Lambda) stop lại, hoặc snapshot rồi xoá hẳn instance. Instance đang có read replica thì không stop được.

**Aurora Serverless v2.** Thay vì chọn cỡ instance, bạn đặt một khoảng **ACU** (Aurora Capacity Unit). 1 ACU là khoảng **2 GiB RAM kèm CPU và network tương ứng**, giá ~$0,12/ACU-giờ. Aurora tự co giãn trong khoảng min–max đó theo tải, mỗi bước 0,5 ACU, và tính tiền theo ACU thực dùng từng giây.

- Đặt **min = 0 ACU** thì cluster **tự pause khi không có connection** (scale-to-0, có từ 11/2024) và chỉ còn trả storage. Query đầu tiên sau đó phải chờ cluster thức dậy, cỡ 15 giây.
- Đặt **min > 0** (mặc định cũ là 0,5 ACU) thì luôn bị tính tối thiểu mức đó: `0,5 × $0,12 × 730 ≈ $44/tháng` cho một cluster không ai dùng.

---

## 3. DynamoDB cost optimization

DynamoDB không có instance. Bạn trả cho ba thứ: **số lần đọc/ghi**, **dung lượng lưu**, và các tính năng phụ (backup, global table, stream). Tiền đọc/ghi là khoản lớn nhất ở hầu hết bảng nên §3.1 quan trọng nhất.

### 3.1 Capacity mode

**Đơn vị đo trước đã.** DynamoDB đo khả năng đọc/ghi bằng *capacity unit*:

- **1 WCU** (write capacity unit) = **1 lần ghi mỗi giây** cho item tối đa **1 KB**. Item 10 KB tốn 10 WCU mỗi lần ghi.
- **1 RCU** (read capacity unit) = **1 lần đọc strongly consistent mỗi giây** cho item tối đa **4 KB**, hoặc 2 lần đọc eventually consistent. Item 10 KB tốn 3 RCU mỗi lần đọc strongly consistent (làm tròn lên theo bội số 4 KB).

Có hai cách trả tiền cho các đơn vị đó:

- **Provisioned**: bạn **đặt trước** bảng có bao nhiêu RCU và WCU, và trả theo **giờ** cho con số đó **dù có dùng hết hay không**. Vượt mức đã đặt thì request bị từ chối (throttle). Thường đi kèm **auto scaling**: DynamoDB tự nâng hạ mức đặt trước để giữ tỉ lệ sử dụng quanh một mục tiêu, mặc định 70%.
- **On-demand**: không đặt trước gì, trả theo **từng request** thực tế. Không có request thì không tốn tiền đọc/ghi.

**Giá (us-east-1) và tỉ lệ giữa hai mode:**

```
On-demand:    $0,625 / triệu lần ghi      $0,125 / triệu lần đọc
Provisioned:  $0,00065 / WCU-giờ          $0,00013 / RCU-giờ

1 WCU provisioned dùng hết 100% suốt 1 giờ = 3.600 lần ghi, giá $0,00065
3.600 lần ghi đó ở on-demand: 3.600 × $0,625 / 1.000.000   = $0,00225
→ on-demand đắt gấp 0,00225 ÷ 0,00065 ≈ 3,5 lần provisioned dùng hết 100%
   (phía đọc ra cùng tỉ lệ: 3.600 × $0,125 / 1.000.000 ÷ 0,00013 ≈ 3,5)
```

**Mức sử dụng (utilization)** là phần capacity đã đặt trước mà bạn thật sự dùng: đặt 1.000 WCU, trung bình ghi 300 lần/giây thì utilization là 30%. Provisioned bắt bạn trả cả 70% còn lại. Vì on-demand đắt gấp ~3,5 lần cho mỗi request, **điểm hoà vốn là utilization ≈ 1 ÷ 3,5 ≈ 29%**:

| Utilization trung bình của capacity đã đặt | Mode rẻ hơn |
|--------------------------------------------|-------------|
| Trên ~29% (tải đều, hoặc auto scaling bám sát được) | **Provisioned + auto scaling** |
| Dưới ~29% (tải giật cục, phần lớn thời gian gần 0, hoặc chưa biết tải) | **On-demand** |

> 📏 Nhiều tài liệu ôn thi còn ghi *"on-demand đắt ~7 lần, hoà vốn ở ~18%"* (thực ra 1/7 là ~14%). Đó là giá trước khi AWS **giảm 50% giá on-demand vào tháng 11/2024**. Kết luận định tính mà đề thi kiểm tra thì không đổi: **tải đều và đoán được → provisioned; tải thất thường → on-demand.**

**Tính thử** — đây là bài tập 2. Bảng đang on-demand, 23 giờ mỗi ngày đọc 5.000 lần/giây, 1 giờ cao điểm đọc 50.000 lần/giây (item dưới 4 KB, strongly consistent):

```
Số lần đọc mỗi ngày: 5.000 × 3.600 × 23 + 50.000 × 3.600   = 594 triệu
Mỗi tháng (30 ngày):                                        = 17,82 tỷ

On-demand:                      17.820 triệu × $0,125       = $2.228/tháng

Provisioned + auto scaling (mục tiêu 70%):
  23 giờ đặt 5.000 ÷ 0,7 ≈ 7.143 RCU; 1 giờ đặt 50.000 ÷ 0,7 ≈ 71.429 RCU
  RCU-giờ mỗi ngày: 7.143 × 23 + 71.429                     ≈ 235.700
  Mỗi tháng: 235.700 × 30 × $0,00013                        ≈ $919/tháng  → rẻ hơn ~59%

Provisioned CỐ ĐỊNH ở 50.000 RCU cả ngày (không auto scaling):
  50.000 × 24 × 30 × $0,00013                               = $4.680/tháng
  utilization = 594 triệu ÷ (50.000 × 86.400)               ≈ 14%  → đắt hơn cả on-demand
```

Bài học: provisioned chỉ rẻ khi capacity đặt trước **bám theo tải**. Lưu ý auto scaling phản ứng sau vài phút, nên với đỉnh tăng vọt đúng giờ như ví dụ này phải dùng **scheduled scaling** nâng capacity lên trước giờ cao điểm, nếu không sẽ bị throttle ở những phút đầu.

### 3.2 Reserved Capacity

Reserved Capacity là bản RI của DynamoDB: cam kết trả cho một lượng RCU/WCU provisioned trong 1 hoặc 3 năm để được giảm giá, tới **~54% (1 năm)** và **~77% (3 năm)**. Nó chỉ áp cho **provisioned mode** với table class **Standard**; on-demand và Standard-IA không mua được. Chỉ nên mua cho phần capacity nền mà bảng dùng quanh năm, không mua cho phần đỉnh.

### 3.3 Storage cost

DynamoDB có hai **table class** — hai bảng giá cho cùng một bảng dữ liệu, đổi qua lại được mà không ảnh hưởng hiệu năng:

| | **Standard** (mặc định) | **Standard-IA** (Infrequent Access) |
|--|-------------------------|--------------------------------------|
| Storage | ~$0,25/GB-tháng | ~$0,10/GB-tháng (**rẻ hơn 60%**) |
| Đọc/ghi | Giá gốc | **Đắt hơn ~25%** (on-demand: $0,78/triệu ghi, $0,155/triệu đọc) |

Đây là một phép đổi: Standard-IA rẻ ở storage và đắt ở request, nên nó lời khi **storage là khoản lớn nhất** của bảng. Quy tắc của AWS: chuyển sang Standard-IA khi **tiền storage vượt ~50% tiền đọc/ghi** của bảng đó. Ví dụ điển hình là log ứng dụng, lịch sử đơn hàng cũ, bài đăng cũ — giữ nhiều, đọc ít.

```
Bảng lịch sử đơn hàng: 1 TB, mỗi tháng 10 triệu lần đọc + 2 triệu lần ghi (on-demand)
  Standard:     1.024 × $0,25 + 10 × $0,125 + 2 × $0,625   = $258,5/tháng
  Standard-IA:  1.024 × $0,10 + 10 × $0,155 + 2 × $0,78    = $105,5/tháng   → rẻ hơn 59%

Bảng session: 50 GB, mỗi tháng 2 tỷ lần đọc + 500 triệu lần ghi
  Standard:     50 × $0,25 + 2.000 × $0,125 + 500 × $0,625 = $575/tháng
  Standard-IA:  50 × $0,10 + 2.000 × $0,155 + 500 × $0,78  = $705/tháng     → đắt hơn 23%
```

Một số tài liệu nêu ngưỡng theo "số lần truy cập mỗi item mỗi tháng". Con số đó phụ thuộc kích thước item nên không dùng chung được; so tiền storage với tiền đọc/ghi trên hoá đơn như trên thì chắc hơn.

### 3.4 Item size optimization

Vì RCU và WCU tính theo kích thước item (§3.1), item càng to thì mỗi lần đọc/ghi càng đắt, và storage cũng tăng theo:

```
Item 1 KB:   ghi 1 WCU,   đọc strongly consistent 1 RCU
Item 10 KB:  ghi 10 WCU,  đọc 3 RCU      → ghi đắt gấp 10 lần cho cùng một thao tác
Item 400 KB (trần của DynamoDB): ghi 400 WCU, đọc 100 RCU
```

Ba cách giảm:

- **Để blob ngoài bảng.** Ảnh, PDF, JSON lớn nên nằm ở S3; item chỉ giữ đường dẫn tới object. S3 lưu ~$0,023/GB-tháng so với $0,25 của DynamoDB.
- **Nén attribute lớn** (gzip rồi lưu dạng binary) khi không cần query vào bên trong nó.
- **Bỏ attribute không dùng** và đặt tên attribute ngắn, vì tên attribute cũng được tính vào kích thước item.

### 3.5 TTL

**TTL** (Time To Live) là tính năng cho bạn chỉ định một attribute chứa thời điểm hết hạn của item (dạng Unix timestamp). DynamoDB tự xoá item sau thời điểm đó, và lần xoá này **không tốn WCU**. Nếu tự viết job quét rồi `DeleteItem`, bạn trả RCU cho lần quét cộng WCU cho từng lần xoá.

Dùng cho dữ liệu có vòng đời ngắn: session, token, giỏ hàng bỏ dở, log tạm. Hai lưu ý: việc xoá diễn ra **trong vòng vài ngày** sau khi hết hạn chứ không đúng giây, nên query phải tự lọc item đã quá hạn; và với global table, lần xoá được replicate sang region khác **có** tốn write ở các region đó.

### 3.6 GSI overhead

**GSI** (Global Secondary Index) là một chỉ mục cho phép query bảng theo một khoá khác với khoá chính. Ví dụ bảng `Orders` có khoá chính là `order_id`; muốn tìm đơn theo `customer_id` thì tạo GSI với khoá `customer_id`.

Về chi phí, GSI thực chất là **một bảng thứ hai do DynamoDB tự đồng bộ**. Nó có storage riêng, và **mỗi lần ghi vào bảng gốc kéo theo một lần ghi vào từng GSI** liên quan. Bảng có 3 GSI thì một lần ghi có thể tốn gấp 4 lần WCU.

Thứ bạn điều khiển được là **projection** — GSI sao chép những attribute nào từ bảng gốc:

| Projection | GSI chứa gì | Chi phí |
|------------|-------------|---------|
| `KEYS_ONLY` | Chỉ các khoá | Nhỏ nhất: ít storage, ghi rẻ nhất |
| `INCLUDE` | Khoá + vài attribute bạn chọn | Ở giữa |
| `ALL` | Toàn bộ item | Gấp đôi storage của bảng, mỗi lần ghi item lớn cũng ghi lại nguyên item vào GSI |

Chọn `KEYS_ONLY` hoặc `INCLUDE` vừa đủ attribute mà query cần. Đổi lại, nếu query cần attribute không có trong GSI thì phải đọc thêm từ bảng gốc. GSI không còn query nào dùng thì xoá, vì nó vẫn ăn WCU mỗi lần ghi.

### 3.7 Stream + DAX

**DynamoDB Streams** ghi lại mọi thay đổi của bảng (thêm, sửa, xoá) thành một dòng sự kiện giữ trong 24 giờ, để dịch vụ khác phản ứng theo. Bật stream không tốn tiền; tiền tính theo lần đọc stream (`GetRecords`, ~$0,02 cho 100.000 lần). **Lambda đọc stream thì miễn phí** phần đọc, chỉ trả tiền chạy Lambda — đây là cách dùng phổ biến nhất nên mới có câu "stream miễn phí". Consumer tự viết bằng SDK/KCL thì bị tính, sau 2,5 triệu lần đọc miễn phí mỗi tháng.

**DAX** (DynamoDB Accelerator) là một cụm cache in-memory đặt trước DynamoDB. Request đọc trúng cache (*cache hit*) được trả về trong vài trăm micro giây và **không tốn RCU**; request trượt (*cache miss*) mới xuống bảng. **Hit rate** là tỉ lệ request trúng cache.

DAX tính tiền theo **giờ node**, chạy 24/7 (thường 3 node để HA), không theo request. Vì vậy nó chỉ đáng khi cả hai điều kiện đúng: bảng **đọc nhiều** đến mức tiền RCU tiết kiệm được lớn hơn tiền cụm, và các key được đọc **lặp lại** nhiều để hit rate cao. Bảng mà mỗi key chỉ đọc một lần thì hit rate gần 0, DAX thành khoản chi thêm.

### 3.8 RDS vs DynamoDB — khi nào rẻ hơn?

Không phải "NoSQL luôn rẻ". Chi phí phụ thuộc **hình dạng traffic** và **access pattern**, không phải loại DB.

| Tiêu chí | RDS / Aurora (relational) | DynamoDB (key-value) |
|----------|---------------------------|----------------------|
| Billing model | Trả theo **instance-hour** (chạy 24/7 dù idle) + storage + IOPS | Trả theo **request** (on-demand) hoặc RCU/WCU provisioned + storage |
| Traffic steady, util cao | **Rẻ hơn** — RI/Reserved kéo giá xuống, amortize instance tốt | Provisioned + Reserved Capacity cũng ổn nhưng ít linh hoạt |
| Traffic spiky / intermittent / scale-to-0 | Đắt — instance idle vẫn bill (trừ Aurora Serverless v2 min=0 ACU) | **Rẻ hơn** — on-demand không có idle cost, trả đúng lượng request |
| Query pattern | Cần **join, transaction đa bảng, ad-hoc SQL, aggregate** | Chỉ **key/PK-SK lookup** đơn giản, biết trước access pattern |
| Scale write cực lớn | Giới hạn bởi instance size (scale-up) | Scale-out gần như vô hạn, phẳng chi phí theo request |

> 💡 **Quy tắc chọn theo chi phí**: workload **relational + steady + util cao** → RDS/Aurora + RI thường rẻ nhất. Workload **key-value + spiky/khó đoán + có lúc idle** → DynamoDB on-demand thắng vì không trả tiền cho instance nằm không.

> 🪤 Bẫy thi: đề mô tả app **traffic đều 24/7, cần join phức tạp** nhưng đáp án gài "chuyển sang DynamoDB để tiết kiệm" → **Sai**. Ngược lại, app **traffic burst vài giờ/ngày, còn lại gần 0** mà giữ RDS instance chạy suốt → lãng phí, DynamoDB on-demand mới rẻ.

---

## 4. ElastiCache cost

ElastiCache là dịch vụ cache in-memory được quản lý (engine Valkey, Redis OSS hoặc Memcached). Dữ liệu nằm trong **RAM**, nên thứ bạn trả tiền chủ yếu là **RAM của các node chạy 24/7** — đắt hơn nhiều lần so với cùng dung lượng trên đĩa. Tối ưu ElastiCache vì vậy xoay quanh hai câu hỏi: cần bao nhiêu RAM, và cần bao nhiêu node.

### 4.1 Right-size

Chọn cỡ node theo hai con số trên CloudWatch chứ không theo CPU:

- **Bộ nhớ đã dùng** (`DatabaseMemoryUsagePercentage`). Cache đầy thì bắt đầu đẩy key cũ ra (*eviction*). Bộ nhớ dùng dưới ~50% trong thời gian dài và không có eviction nghĩa là node đang thừa một cỡ.
- **Số connection** (`CurrConnections`). Mỗi cỡ node có trần connection; app mở quá nhiều connection có thể buộc bạn dùng node to hơn mức RAM cần.

Sau khi chọn đúng cỡ thì mới cam kết: **Reserved node** kỳ hạn 1 hoặc 3 năm giảm **tới ~55%** so với on-demand. Thêm một khoản dễ lấy: cùng cỡ node, engine **Valkey rẻ hơn Redis OSS khoảng 20%** (`cache.r6g.xlarge`: ~$0,329/giờ so với ~$0,411/giờ ở us-east-1), và Valkey tương thích với client Redis.

### 4.2 Redis cluster mode

Một cụm Redis/Valkey có hai cách tổ chức:

- **Cluster mode disabled**: toàn bộ dữ liệu nằm trên **một node primary** (kèm tối đa 5 replica chỉ đọc). Dung lượng cache bị giới hạn bởi RAM của một node, và mọi lệnh ghi dồn vào một node.
- **Cluster mode enabled**: dữ liệu được **chia thành nhiều shard** (sharding — mỗi shard giữ một phần key, có primary và replica riêng). Thêm shard là thêm cả RAM lẫn khả năng ghi.

Cluster mode enabled tốn hơn theo hai nghĩa: nhiều node hơn (mỗi shard ít nhất một primary, thường kèm replica), và client phải hỗ trợ cluster, một số lệnh thao tác trên nhiều key bị hạn chế. Vì vậy chỉ bật khi **dữ liệu không vừa RAM của node lớn nhất bạn chịu trả**, hoặc **lượng ghi vượt sức một primary**. Dataset 20 GB với tải ghi vừa phải thì một node `r6g.xlarge` (~26 GB RAM) ở cluster mode disabled là đủ và đơn giản hơn.

### 4.3 Snapshot

ElastiCache có thể chụp snapshot dữ liệu trong RAM ra storage hằng ngày, tính ~$0,085/GiB-tháng. Câu hỏi cần đặt ra là dữ liệu này có cần khôi phục không:

- Nếu cache chỉ chứa **bản sao của dữ liệu đã có ở database** (kết quả query, trang đã render), mất cache chỉ làm vài phút đầu chậm vì phải nạp lại. Snapshot ở đây là tiền thừa — tắt đi.
- Nếu Redis đang giữ **dữ liệu không có ở đâu khác** (session, bảng xếp hạng, hàng đợi) thì giữ snapshot, với retention ngắn nhất chấp nhận được.

### 4.4 Global Datastore

Global Datastore nhân một cụm Redis/Valkey sang **region khác**: region chính nhận ghi, các region phụ có bản sao chỉ đọc được cập nhật liên tục. Bạn trả hai khoản thêm:

- **Một cụm node đầy đủ ở mỗi region phụ**, chạy 24/7.
- **Data transfer cross-region** cho toàn bộ dữ liệu replicate, ~$0,02/GB tính ở region chính.

Chỉ dùng khi thật sự cần một trong hai thứ: user ở châu lục khác phải **đọc cache với latency thấp tại chỗ**, hoặc cần cụm dự phòng để **DR sang region khác**. Nếu chỉ một region phục vụ user, đây là nhân đôi tiền cache mà không được gì.

### 4.5 MemoryDB vs ElastiCache

Cả hai đều nói giao thức Redis/Valkey, nhưng khác nhau ở chỗ dữ liệu được coi là gì:

- **ElastiCache** là **cache**. Lệnh ghi được xác nhận khi đã vào RAM của primary; replication sang replica là bất đồng bộ. Primary chết đúng lúc thì vài lệnh ghi cuối có thể mất.
- **MemoryDB** là **database chính** chạy trong RAM. Mỗi lệnh ghi được lưu vào một **transaction log trải trên nhiều AZ** rồi mới báo thành công, nên không mất dữ liệu khi node chết và đọc trên primary là strongly consistent.

Độ bền đó có giá: node MemoryDB đắt hơn node ElastiCache cùng cỡ **khoảng 30% với Valkey và 50% với Redis OSS** (`r6g.xlarge` us-east-1: $0,432 so với $0,329; $0,617 so với $0,411), cộng thêm phí theo GB dữ liệu ghi. Chỉ chọn MemoryDB khi Redis **là nơi duy nhất giữ dữ liệu** và không được phép mất. Cache đứng trước RDS hay DynamoDB thì ElastiCache là đủ.

---

## 5. Other databases

### 5.1 Redshift

Redshift là data warehouse: database dạng cột dành cho query phân tích trên lượng dữ liệu lớn. Bản truyền thống là một **cluster gồm các node chạy 24/7**, trả theo giờ node. Bốn cách giảm tiền:

- **Reserved node** cho cluster chạy liên tục. Tài liệu ôn thi thường ghi giảm tới ~75% với kỳ 3 năm; trang giá hiện tại chỉ nói "giảm đáng kể" nên coi đây là con số tham khảo.
- **Pause cluster** ở môi trường non-prod: lúc pause không tính giờ node, chỉ còn tiền storage và backup. Nếu tải thất thường thì **Redshift Serverless** hợp hơn: không có cluster, tính theo dung lượng compute dùng trong lúc query chạy (đơn vị RPU-giờ), không query thì không tốn compute.
- **Concurrency Scaling** là tính năng tự thêm cluster tạm khi quá nhiều query xếp hàng cùng lúc, rồi gỡ đi khi hết. Mỗi cluster chính được tặng **1 giờ Concurrency Scaling miễn phí mỗi ngày** (cộng dồn tối đa 30 giờ); dùng quá thì trả theo giây ở giá on-demand. Nó rẻ hơn nhiều so với nâng cỡ cluster cả ngày chỉ để chịu một giờ cao điểm.
- **Redshift Spectrum** cho cluster query thẳng file nằm trên S3 mà không cần nạp vào Redshift. Phần này tính **~$5 cho mỗi TB dữ liệu được quét**, không tính theo giờ node. Dữ liệu cũ ít đụng tới nên để ở S3 và query qua Spectrum, thay vì thêm node chỉ để chứa nó.

### 5.2 Neptune / DocumentDB

Neptune (graph database) và DocumentDB (tương thích MongoDB) có kiến trúc giống Aurora: instance tính theo giờ, storage dùng chung tự nhân bản qua 3 AZ. Các đòn tối ưu vì thế giống §2: right-size instance (§2.1), cam kết dài hạn (§2.2), cân nhắc số replica (§2.5–2.6), và tắt hoặc thu nhỏ non-prod.

### 5.3 OpenSearch

OpenSearch Service là cụm tìm kiếm và phân tích log (hậu duệ của Elasticsearch). Tiền nằm ở **node chạy 24/7** và **storage gắn với node**.

- **Reserved Instance** giảm ~35% (1 năm) tới **~52%** (3 năm, trả trước toàn bộ).
- **OpenSearch Serverless** bỏ việc chọn node, tính theo đơn vị compute OCU dùng thực tế. Hợp với workload không đều; cần xem mức OCU tối thiểu của loại collection trước khi kết luận nó rẻ hơn một cụm nhỏ.
- **Phân tầng storage cho log.** Log 7 ngày gần nhất được query liên tục, log 6 tháng trước hầu như không ai mở. OpenSearch có ba tầng:

| Tầng | Dữ liệu nằm ở đâu | Giá storage (us-east-1) | Query |
|------|-------------------|--------------------------|-------|
| **Hot** | SSD (EBS) gắn vào data node | ~$0,122/GB-tháng | Nhanh nhất, ghi được |
| **UltraWarm** | S3, có node warm riêng làm cache | ~$0,024/GB-tháng (**rẻ hơn ~5 lần**) | Chậm hơn, chỉ đọc |
| **Cold** | S3, không gắn compute | Rẻ hơn UltraWarm | Phải "attach" lên UltraWarm rồi mới query được |

Chuyển index cũ từ hot xuống UltraWarm rồi cold (tự động bằng Index State Management) là khoản cắt lớn nhất cho cụm log.

### 5.4 Athena

Athena chạy SQL thẳng trên file ở S3, không có server nào để bật tắt. Giá: **~$5 cho mỗi TB dữ liệu mà query phải quét**. Tiền vì thế phụ thuộc hoàn toàn vào việc mỗi query đọc bao nhiêu byte:

- **Định dạng cột (Parquet, ORC).** File CSV/JSON buộc Athena đọc cả dòng dù query chỉ cần 3 trên 50 cột. Parquet lưu theo cột và có nén, nên Athena chỉ đọc đúng cột cần.
- **Partition.** Chia dữ liệu thành thư mục theo ngày (`dt=2026-10-13/`). Query có `WHERE dt = ...` chỉ quét thư mục của ngày đó thay vì cả bảng.
- **Query result reuse.** Athena có thể trả lại kết quả của lần chạy trước nếu câu query giống hệt, không quét lại nên không tốn tiền. Tính năng này **phải bật cho từng query**; kết quả được dùng lại trong **60 phút theo mặc định**, chỉnh được tới tối đa 7 ngày.

Tính thử tác dụng của hai điểm đầu:

```
Bảng log 1 TB dạng CSV, query lấy 3 cột của 1 ngày trong 100 ngày
  CSV, không partition:        quét 1 TB           → $5,00 mỗi lần chạy
  Parquet + partition theo ngày: quét cỡ vài trăm MB → dưới $0,01 mỗi lần chạy
```

(Con số Parquet là ước lượng: 1/100 số ngày, vài cột trên tổng số cột, cộng nén. Mức giảm thực tế tuỳ dữ liệu, nhưng thường trên 90%.)

---

## 6. Data transfer cost — silent killer

Data transfer là tiền trả cho **mỗi GB dữ liệu đi qua một ranh giới mạng** của AWS. Nó bị gọi là "silent killer" vì không có resource nào tên "data transfer" để nhìn vào: nó rải rác trong hoá đơn của EC2, S3, NAT Gateway, và chỉ lộ ra khi tổng lại.

### 6.1 Bảng pricing (US, simplified)

Toàn bộ bảng giá gói trong ba quy tắc:

1. **Dữ liệu đi vào AWS từ Internet thì miễn phí.** AWS chỉ tính chiều đi ra và chiều đi ngang.
2. **Càng đi xa càng đắt.** Trong cùng một AZ bằng private IP là miễn phí. Sang AZ khác trong cùng region tốn $0,01/GB **mỗi chiều** (bên gửi trả $0,01, bên nhận trả $0,01, tức 1 GB đi qua ranh giới AZ tốn tổng $0,02). Sang region khác ~$0,02/GB. Ra Internet ~$0,09/GB.
3. **Thiết bị trung gian thu thêm phí xử lý** theo GB, cộng vào phí đường đi: NAT Gateway, Transit Gateway, VPC Interface endpoint.

Chữ "private IP" ở quy tắc 2 có nghĩa thật: hai EC2 cùng AZ mà gọi nhau qua **public IP hoặc Elastic IP** thì bị tính như cross-AZ ($0,01/GB mỗi chiều), vì traffic đi vòng ra ngoài VPC rồi quay lại.

**VPC endpoint** là cổng nối thẳng từ VPC tới một dịch vụ AWS mà không đi qua Internet hay NAT. Có hai loại, giá khác hẳn nhau:

- **Gateway endpoint** — chỉ có cho **S3 và DynamoDB**. Nó là một dòng trong route table. **Miễn phí hoàn toàn**: không phí giờ, không phí GB.
- **Interface endpoint** (PrivateLink) — cho hầu hết dịch vụ còn lại (SQS, Secrets Manager, ECR, CloudWatch…). Nó là một card mạng (ENI) đặt trong subnet của bạn, tính **~$0,01/giờ cho mỗi AZ** cộng **~$0,01/GB** dữ liệu đi qua.

Bảng giá tham khảo (us-east-1):

| Path | Cost |
|------|------|
| Internet vào AWS | Free |
| Internet egress, 10 TB đầu mỗi tháng | $0.09/GB (100 GB đầu miễn phí) |
| Internet egress, 40 TB tiếp theo | $0.085/GB |
| Internet egress, 100 TB tiếp theo | $0.07/GB |
| Internet egress, trên 150 TB | $0.05/GB |
| CloudFront egress (US/EU) | $0.085/GB sau 1 TB miễn phí mỗi tháng; giảm dần theo volume |
| Cross-region (US ↔ US) | $0.02/GB (riêng us-east-1 ↔ us-east-2: $0.01/GB) |
| Cross-continent | $0.02-0.09/GB tuỳ region nguồn |
| Cross-AZ (same region) | $0.01/GB each way |
| Same-AZ private IP | Free |
| VPC **Gateway** endpoint (S3, DynamoDB) | Free |
| VPC **Interface** endpoint | $0.01/h mỗi AZ + $0.01/GB |
| ELB to backend (same AZ) | Free for ALB |
| RDS cross-AZ (Multi-AZ replication) | Free |

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

Năm chỗ dưới đây chiếm phần lớn các hoá đơn data transfer bất ngờ. Mỗi cái kèm một phép nhân để thấy cỡ tiền.

**1. Đọc S3 qua NAT Gateway.** NAT Gateway là dịch vụ cho máy trong private subnet (không có public IP) gọi ra ngoài; chi tiết ở §6.5. Nó tính **$0,045 cho mỗi GB đi qua, cả hai chiều**, cộng $0,045/giờ. Điều dễ quên: S3 và DynamoDB là endpoint công khai, nên EC2 hay Lambda trong private subnet gọi S3 thì mặc định **đi qua NAT**, dù S3 nằm cùng region.

```
Job ETL đọc 10 TB từ S3 mỗi tháng qua NAT Gateway:
  10.240 GB × $0,045                    = $461/tháng phí xử lý
  + $0,045 × 730 giờ                    = $33/tháng phí giờ (mỗi NAT Gateway)
Cùng lượng đó qua Gateway endpoint S3:  = $0
```

**2. CloudWatch Logs.** Không phải data transfer theo nghĩa hẹp nhưng cùng bản chất: trả theo GB dữ liệu đẩy đi. Phí ingest **$0,50/GB**, lưu $0,03/GB-tháng. App để log mức DEBUG ở production rất dễ tới con số này:

```
100 GB log mỗi ngày × 30 ngày × $0,50  = $1.500/tháng chỉ riêng ingest
```

**3. Cross-AZ chat.** Microservice ở AZ-a gọi database hoặc service khác ở AZ-b: mỗi GB tốn $0,01 chiều đi cộng $0,01 chiều nhận, tức **$0,02/GB**. Từng request thì nhỏ, nhưng service gọi nhau liên tục thì cộng lại nhanh: hoá đơn cross-AZ $2.000/tháng tương ứng `2.000 ÷ 0,02 = 100.000 GB`, tức khoảng 100 TB chạy qua lại giữa các AZ mỗi tháng.

**4. Egress thẳng ra Internet.** API hoặc web server trả ảnh, video, file tải về trực tiếp cho user ở giá $0,09/GB, không qua CloudFront. 40 TB mỗi tháng là khoảng $3.500 (xem §6.4 để biết CloudFront giảm khoản này bằng cách nào).

**5. Data lake đọc chéo region.** Công cụ phân tích chạy ở region A query dữ liệu S3 nằm ở region B. Mỗi lần quét kéo dữ liệu qua ranh giới region ở giá $0,02/GB: quét 50 TB mỗi tháng là `51.200 × $0,02 ≈ $1.024`. Cách sửa là đặt compute cùng region với dữ liệu.

### 6.3 Optimization patterns

| Vấn đề | Giải pháp |
|--------|-----------|
| Lambda/EC2 đọc S3 qua NAT | **VPC Gateway endpoint S3** (free) |
| ECS task gọi DynamoDB qua NAT | **VPC Gateway endpoint DynamoDB** (free) |
| ECS gọi SQS/Secrets Manager qua NAT | **VPC Interface endpoint** (PrivateLink): $0,01/GB thay cho $0,045/GB của NAT, đổi lại trả phí giờ cho endpoint |
| Web egress to internet | **CloudFront** đứng trước origin (§6.4) |
| Microservice cross-AZ chat | **Topology aware routing**, zonal DNS (giải thích bên dưới) |
| Cross-region read replica | Cân nhắc cache tại region đọc thay vì replicate toàn bộ |
| CloudWatch Logs ingest cao | Lọc log trước khi gửi, sampling, đẩy log lưu trữ thẳng ra S3 thay vì qua Logs |

**Interface endpoint có đáng không.** Nó không miễn phí như Gateway endpoint, nên phải so với NAT. Mỗi endpoint đặt ở 3 AZ tốn `3 × $0,01 × 730 ≈ $22/tháng` phí giờ, và mỗi GB rẻ hơn NAT `$0,045 − $0,01 = $0,035`. Hoà vốn ở `22 ÷ 0,035 ≈ 630 GB/tháng` cho mỗi dịch vụ. Dưới mức đó, lý do dựng Interface endpoint là bảo mật (traffic không rời mạng AWS), không phải tiền.

**Giữ traffic trong cùng AZ.** Mặc định, một service gọi service khác sẽ được chia đều tới mọi bản sao ở mọi AZ, nên khoảng 2/3 số request của cụm 3 AZ đi chéo AZ. Hai kỹ thuật giảm tỉ lệ đó:

- **Topology aware routing** là tính năng của Kubernetes (và của service mesh như Istio/Envoy): khi chọn pod đích, ưu tiên pod **cùng AZ** với bên gọi, chỉ sang AZ khác khi AZ mình không còn pod khoẻ.
- **Zonal DNS**: mỗi load balancer ngoài tên DNS chung còn có tên DNS riêng cho từng AZ. Client gọi vào tên của đúng AZ mình (hoặc tắt cross-zone load balancing) thì request vào và ở lại AZ đó.

Cả hai đánh đổi một phần cân bằng tải lấy tiền transfer, nên mỗi AZ phải có đủ bản sao để tự gánh phần của mình.

### 6.4 CloudFront pricing

CloudFront là CDN của AWS: mạng các điểm biên (edge location) giữ bản cache nội dung gần user. Về chi phí, đặt CloudFront trước origin giảm tiền theo ba đường:

- **Origin ở AWS gửi dữ liệu tới CloudFront miễn phí.** S3, EC2, ALB trả dữ liệu cho CloudFront không bị tính $0,09/GB. Bạn chỉ trả giá egress của CloudFront.
- **Giá egress của CloudFront thấp hơn hoặc bằng**, và có phần miễn phí lớn hơn: **1 TB và 10 triệu request miễn phí mỗi tháng** (so với 100 GB của egress thường), sau đó ~$0,085/GB ở US/EU và giảm dần theo volume.
- **Request trúng cache không về tới origin**, nên giảm cả phí request S3 lẫn compute của origin.

Chi tiết cần nhớ:

- **Giá theo vùng của user.** Egress tới user ở US/EU ~$0,085/GB, châu Á ~$0,12/GB, Nam Mỹ ~$0,11/GB. **Price class** cho phép chỉ dùng các edge ở vùng rẻ để giảm tiền, đổi lại user ở vùng khác chậm hơn.
- **Cam kết để giảm giá.** Hai cơ chế: **Security Savings Bundle** (cam kết mức chi hằng tháng trong 1 năm, giảm tới 30%) và **giá riêng** khi cam kết từ **10 TB/tháng trở lên** trong ít nhất 12 tháng. Tài liệu cũ gọi chung là "reserved capacity pricing".
- **Origin Shield** là một lớp cache trung tâm nằm giữa các edge và origin. Nó tính thêm phí theo request (~$0,0075 cho 10.000 request ở US), đổi lại nhiều edge cùng trượt cache chỉ sinh ra một request về origin. Đáng bật khi origin đắt hoặc yếu, user rải nhiều vùng.

> 📏 Hiện CloudFront còn có các **gói giá cố định theo tháng** (Free, Pro, Business, Premium) gộp sẵn CDN, WAF và một lượng traffic. Đề SAA-C03 hỏi theo mô hình trả theo GB ở trên.

### 6.5 NAT Gateway vs NAT Instance — chọn cái nào về chi phí

Cả hai đều cho private subnet ra Internet, nhưng **mô hình chi phí khác nhau hoàn toàn**.

| Tiêu chí | NAT Gateway (managed) | NAT Instance (tự quản EC2) |
|----------|------------------------|-----------------------------|
| Cost model | **$0.045/giờ** + **$0.045/GB processing** (US) | Chỉ **EC2 instance-hour** + data transfer chuẩn — **không có phí processing/GB** |
| HA | HA trong 1 AZ; muốn chịu lỗi AZ phải deploy **1 NAT GW / AZ** | Single point of failure — tự làm failover (script + 2 instance, route table swap) |
| Bandwidth | Auto scale tới **~100 Gbps**, không phải lo | Giới hạn bởi **instance type** (network của EC2), phải right-size thủ công |
| Quản lý | AWS lo hết (patch, scale) | Tự patch OS, quản security group, source/dest check off, monitor |

> 💡 **Khi nào rẻ hơn**: traffic **rất thấp / dev-test** hoặc muốn instance kiêm **bastion** → NAT Instance (t4g.nano/micro) rẻ hơn vì không có phí $0.045/GB. Traffic **vừa–cao hoặc cần HA + zero-ops** → NAT Gateway thắng: phí/GB đáng, nhưng bù lại HA và không tốn công vận hành. Điểm hòa vốn nghiêng về NAT GW rất nhanh khi throughput tăng.

> 🪤 Bẫy thi: đề đòi **giảm chi phí NAT cho traffic ra S3/DynamoDB** → đáp án đúng thường **không phải** "đổi sang NAT Instance" mà là **VPC Gateway endpoint** (free, bỏ NAT hoàn toàn cho AWS service đó).

### 6.6 Hybrid connectivity cost — Internet vs VPN vs Direct Connect

Nối on-prem với VPC có 3 đường, khác nhau ở **chi phí cố định**, **$/GB egress**, và **độ ổn định**.

| Tiêu chí | Public Internet | Site-to-Site VPN | Direct Connect (DX) |
|----------|-----------------|------------------|----------------------|
| Chi phí cố định | Không | **~$0.05/giờ** mỗi VPN connection (~$36/tháng) | **Port fee** theo giờ (1 Gbps và 10 Gbps...) + cross-connect/partner fee |
| $/GB egress (US) | **$0.09/GB** (giá Internet chuẩn) | **$0.09/GB** (vẫn đi qua Internet egress) | **~$0.02/GB** (DX data transfer out, rẻ hơn nhiều) |
| Độ ổn định / latency | Kém, biến thiên, không SLA băng thông | Trung bình; qua Internet nên latency biến thiên; ~1.25 Gbps/tunnel | **Cao nhất** — dedicated, latency ổn định, có SLA |
| Bảo mật | Không mã hoá (tự lo TLS) | **IPsec mã hoá** sẵn | Riêng tư (không public); muốn mã hoá thêm VPN over DX |

> 💡 **Break-even theo volume**: VPN thắng khi **volume thấp/vừa** (phí cố định gần như bằng 0, chấp nhận $0.09/GB). Direct Connect có phí port cố định cao nhưng **$/GB egress rẻ hơn ~4-5 lần** → khi **egress lớn và ổn định (nhiều TB/tháng)**, phần tiết kiệm $/GB vượt phí port → DX rẻ hơn tổng thể, đồng thời cho latency ổn định. Pattern thi phổ biến: **DX cho backbone + VPN làm backup** (failover rẻ khi DX chết).

### 6.7 Transit Gateway vs VPC Peering — cost khi nối nhiều VPC

| Tiêu chí | VPC Peering | Transit Gateway (TGW) |
|----------|-------------|------------------------|
| Phí | **Không phí processing** cho bản thân peering; chỉ trả data transfer cross-AZ/cross-region chuẩn | **$0.05/giờ mỗi attachment** + **$0.02/GB data processing** qua TGW |
| Topology | **Non-transitive** — phải full mesh: N VPC cần **N·(N-1)/2** kết nối | **Hub-and-spoke, transitive** — mỗi VPC 1 attachment, TGW route giữa tất cả |
| Độ phức tạp | Rẻ nhưng **bùng nổ số kết nối** và route table khi nhiều VPC | Đơn giản khi scale, quản lý tập trung, hỗ trợ cross-region peering |

> 💡 **Khi nào chọn**: **ít VPC (2-3), cost-sensitive, quan hệ tĩnh** → VPC Peering rẻ hơn (không mất $0.02/GB). **Nhiều VPC / cần transitive / hub trung tâm / nối cả VPN+DX** → Transit Gateway: chấp nhận phí attachment + $0.02/GB để đổi lấy topology gọn, tránh mesh chằng chịt.

> 🪤 Bẫy thi: "TGW luôn rẻ hơn peering" → **Sai**. TGW có phí per-GB processing mà peering không có; peering rẻ hơn cho ít VPC. Ngược lại, "peering scale tốt cho hàng chục VPC" cũng **Sai** vì non-transitive gây mesh bùng nổ.

---

## 7. CloudWatch & monitoring cost

Monitoring là khoản hay bị coi là "đi kèm miễn phí", nhưng CloudWatch tính tiền theo từng thứ bạn gửi vào và từng thứ bạn tạo ra.

### 7.1 CloudWatch

Bảng giá (us-east-1) và thứ làm mỗi dòng phình to:

| Thành phần | Giá | Phình khi nào |
|------------|-----|---------------|
| **Custom metric** | $0.30/metric/tháng (10.000 metric đầu) | Mỗi tổ hợp tên metric + dimension là **một metric riêng**. Gắn `user_id` làm dimension thì 10.000 user thành 10.000 metric, tức $3.000/tháng |
| **Logs** | $0.50/GB ingest + $0.03/GB-tháng storage | Log DEBUG ở production; log group để retention "Never expire" |
| **Dashboard** | $3/dashboard/tháng | Ít khi đáng kể |
| **Alarm** | $0.10/alarm/tháng (standard) | Tạo alarm cho từng instance trong fleet lớn |
| **Logs Insights query** | $0.005/GB scanned | Query quét cả năm log thay vì giới hạn khoảng thời gian |

Metric mặc định mà dịch vụ AWS tự gửi (CPU của EC2, số request của ALB…) không tính tiền. Khoản $0,30 áp cho metric do bạn tự đẩy lên và metric chi tiết bật thêm.

### 7.2 Optimization

- **Giảm độ chi tiết của log.** Production chạy mức INFO, không DEBUG. Đây là thay đổi một dòng cấu hình và thường cắt phần lớn lượng ingest.
- **Lọc log tại agent trước khi gửi.** Agent thu log (Fluent Bit, CloudWatch agent) có thể bỏ các dòng không cần, như health check, ngay trên máy. Dòng nào không gửi đi thì không bị tính $0,50/GB.
- **Lưu trữ dài hạn ở S3.** Log cần giữ nhiều năm vì compliance nên nằm ở S3 (~$0,023/GB-tháng, có lifecycle sang Glacier) thay vì CloudWatch Logs. Đặt **retention** cho mọi log group; mặc định là giữ mãi mãi.
- **Gộp metric tại app.** Thay vì gọi `PutMetricData` 1.000 lần cho 1.000 sự kiện, app cộng dồn rồi đẩy một lần mỗi phút kèm thống kê (count, sum, min, max).

### 7.3 X-Ray

X-Ray ghi lại đường đi của từng request qua các service (*trace*) để tìm chỗ chậm. Giá ~$5 cho 1 triệu trace được ghi. Ghi 100% request của một API bận là thừa: **sampling 1–5%** ở production vẫn đủ thấy xu hướng latency và lỗi, với 1/20 tới 1/100 chi phí.

---

## 8. Patterns enterprise cost

Bốn cơ chế dưới đây nằm ở tầng hợp đồng và tổ chức, không phải kiến trúc. Đề SAA chỉ cần biết chúng tồn tại và làm gì.

### 8.1 Multi-account billing

**Consolidated Billing** (một tính năng của AWS Organizations) gộp usage của mọi account trong organization vào một hoá đơn. Lợi ích về tiền: các bậc giá theo volume (S3, data transfer egress) được tính trên **tổng usage của cả organization**, nên các account cùng nhau chạm bậc giá rẻ sớm hơn so với tính riêng từng account. Việc này diễn ra tự động.

### 8.2 Enterprise Discount Program (EDP)
- Cam kết mức chi hằng năm (thường từ $1M trở lên) để nhận chiết khấu riêng (khoảng 5–20%) trên toàn bộ hoá đơn.
- Đàm phán lại theo kỳ hạn hợp đồng.

### 8.3 Private Pricing Agreement (PPA)
- Giá riêng đàm phán cho **một dịch vụ cụ thể** mà tổ chức dùng với volume lớn (ví dụ data transfer hoặc S3).

### 8.4 AWS Marketplace
- Phần mềm của bên thứ ba mua qua Marketplace được tính chung vào hoá đơn AWS, và được **tính vào mức cam kết EDP**.

---

## 9. Patterns optimization cho 3 use case

Ba kiến trúc mẫu ghép các đòn ở trên lại. Điểm chung: chọn dịch vụ **tính tiền theo lượng dùng** cho phần tải không đều, và giữ dữ liệu ở gần nơi xử lý nó.

### 9.1 Analytics pipeline

Workload phân tích ad-hoc (vài query mỗi ngày, không đều) không nên trả cho một cluster chạy 24/7:

- **Glue** làm ETL serverless: trả theo thời gian job chạy.
- Dữ liệu nằm ở **S3 dạng Parquet, có partition** (§5.4) để mỗi query quét ít nhất có thể.
- **Athena** query trực tiếp, trả theo TB quét.
- **QuickSight** làm dashboard.
- Tránh Redshift cluster chạy 24/7 nếu query thưa; dùng **Redshift Serverless** hoặc Athena. Cluster cố định chỉ hợp lý khi query chạy dày đặc cả ngày.

### 9.2 SaaS B2B với 100 customer

- **DynamoDB multi-tenant** (mọi tenant chung một bảng, khoá chính bắt đầu bằng `tenant_id`): chi phí đi theo số request của từng tenant, tenant ít dùng gần như không tốn gì.
- **Aurora Serverless v2** cho phần cần SQL: co giãn theo tải chung thay vì cấp một instance cho mỗi tenant.
- **Tag theo tenant** trên các resource riêng, bật làm cost allocation tag để báo cáo chi phí theo từng khách hàng (làm cơ sở tính giá) — xem bài kế tiếp.

### 9.3 Global API

- **CloudFront cache mạnh tay** cho mọi response cache được (§6.4).
- **Đặt origin ở region rẻ**: us-east-1 thường có giá thấp nhất cho đa số dịch vụ. Cùng một instance ở São Paulo hay Sydney có thể đắt hơn vài chục phần trăm.
- **VPC endpoint cho mọi lời gọi tới dịch vụ AWS** để không trả phí NAT $0,045/GB (§6.2).
- **Lambda trên Graviton** (CPU ARM) cho tầng compute: giá mỗi GB-giây thấp hơn x86 khoảng 20%.

---

## 10. Cạm bẫy đề thi (SAA)

1. **"DynamoDB on-demand luôn rẻ hơn"** → **Sai**. Mỗi request ở on-demand đắt gấp ~3,5 lần provisioned dùng hết công suất (tài liệu cũ ghi ~7 lần, trước đợt giảm giá 11/2024). Tải đều, utilization trên ~29% thì provisioned rẻ hơn (§3.1).
2. **"Read Replica giảm bill"** → **Sai**, mỗi replica là một instance tính tiền đầy đủ (§2.6).
3. **"Multi-AZ standby phục vụ read"** → **Sai** với RDS Multi-AZ instance: standby chỉ chờ failover. Reader của Aurora thì đọc được (§2.5).
4. **"VPC endpoint S3 phải pay"** → **Sai**, Gateway endpoint (S3, DynamoDB) miễn phí. Interface endpoint mới tốn phí giờ và phí GB (§6.1).
5. **"CloudFront tăng cost so với serve direct"** → thường **Sai**: origin AWS gửi tới CloudFront miễn phí, và giá egress của CloudFront không cao hơn egress trực tiếp (§6.4).
6. **"NAT Gateway free intra-VPC"** → **Sai**, mọi GB đi qua NAT Gateway đều bị tính $0.045, kể cả khi đích là S3 cùng region.
7. **"CloudWatch Logs free trong AWS"** → **Sai**, tính cả ingest lẫn storage.
8. **"Aurora Serverless v2 luôn tốn tối thiểu 0.5 ACU"** → **Lỗi thời**: từ 11/2024 v2 hỗ trợ **scale-to-0 ACU** (auto-pause) nếu cấu hình min capacity = 0; nhưng nếu để min ≥ 0.5 ACU (mặc định cũ) thì vẫn bill mức đó — đọc kỹ min capacity.
9. **"Dùng Savings Plan cho RDS"** → trong phạm vi đề thi là **Sai**: Compute Savings Plans không phủ RDS, đáp án đúng là Reserved Instance. (Database Savings Plans ra sau đề thi — §2.2.)

---

## 11. Tóm tắt 1 dòng

> DB: right-size + RI + đúng capacity mode. Data transfer: VPC endpoint everywhere, CloudFront trước origin, same-AZ routing, log discipline. **Data transfer là 20-40% bill ở nhiều org — đừng bỏ qua.**

---

## 12. Bài tập tự kiểm tra

1. RDS Postgres r6i.4xlarge Multi-AZ + 3 Read Replica. CPU avg 20%. Bill $20k/tháng. Plan optimize? *(gợi ý: thứ tự làm ở §1, §2.1–2.2, §2.6)*
2. DynamoDB table on-demand, RCU avg 5000, peak 50k 1h/ngày. Provisioned + auto-scale rẻ hơn không? Tính. *(cách tính: §3.1)*
3. Web app egress bill $5000/tháng. 70% là image download direct from S3. Action? *(§6.4)*
4. Microservice K8s, 5 service trong 3 AZ, full mesh chat. Cross-AZ bill $2000/tháng. Reduce thế nào? *(§6.2 mục 3, §6.3)*
5. CloudWatch Logs ingest 100 GB/ngày, cost $1500/tháng. Optimization? *(§6.2 mục 2, §7.2)*
6. So sánh Aurora I/O-Optimized vs Standard cho workload 50k IOPS sustained. Cái nào rẻ hơn? *(cách tính: §2.3)*

---

## 13. Đọc thêm

- AWS docs — *RDS pricing*, *DynamoDB pricing*, *Data transfer pricing*.
- AWS Builder's Library — *Cost optimization*.
- *AWS Cost Optimization Pillar Whitepaper*.

---

**Bài tiếp theo**: [[ch4-04-cost-visibility]] — Cost Explorer, Budgets, Anomaly Detection, tagging strategy, FinOps.
