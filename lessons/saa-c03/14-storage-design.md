# Bài 14 — Storage Design Patterns

## 1. Mục tiêu
- Chọn đúng storage cho từng workload (block / file / object).
- S3 patterns nâng cao: multipart, Transfer Acceleration, S3 Select, MRAP, Object Lock.
- EBS types deep + Multi-Attach.
- EFS vs FSx variants.
- Storage Gateway + DataSync cho hybrid.

---

## 2. Decision tree

Trước khi nhìn cây quyết định, cần phân biệt được ba kiểu storage. Gần như mọi câu hỏi storage trong đề đều bắt đầu bằng việc nhận ra workload đang cần kiểu nào.

### 2.1 Block, file, object — khác nhau ở cái "giao diện" mà ứng dụng nhìn thấy

**Block storage** đưa cho máy chủ một **ổ đĩa thô**: một dãy các khối (block) đánh số, mỗi khối vài KiB. Storage không biết "file" là gì. Hệ điều hành tự format ổ đó thành ext4/xfs/NTFS rồi mới có thư mục và file. Vì mọi thao tác chỉ là "đọc/ghi khối số N", block storage có độ trễ thấp nhất (dưới 1 ms tới vài ms) và là thứ database cần. Cái giá: một ổ thường chỉ gắn vào **một máy**, vì hai hệ điều hành cùng ghi vào một file system thông thường sẽ làm hỏng nó. Trên AWS: **EBS**.

**File storage** đưa cho máy chủ một **cây thư mục dùng chung qua mạng**. File system nằm ở phía dịch vụ, nên dịch vụ lo việc khoá file và phân quyền, nhờ vậy **hàng trăm máy cùng mount một lúc** và thấy cùng một cây thư mục. Ứng dụng vẫn gọi `open()`, `read()`, `write()` như với ổ local, không phải sửa code. Trên AWS: **EFS** và họ **FSx**.

**Object storage** không có ổ đĩa, không có thư mục thật. Mỗi object là một cục dữ liệu nguyên vẹn kèm metadata, định danh bằng một **key**, truy cập qua **HTTP API** (`PUT`, `GET`). Không sửa được 10 byte giữa object: muốn đổi phải ghi lại cả object. Đổi lại nó không có giới hạn tổng dung lượng, rẻ nhất tính theo GB, và truy cập được từ bất kỳ đâu có mạng. Trên AWS: **S3**.

| | Block (EBS) | File (EFS, FSx) | Object (S3) |
|--|-------------|-----------------|-------------|
| Ứng dụng thấy gì | Ổ đĩa (`/dev/nvme1n1`) | Thư mục mount qua mạng | URL / API key-value |
| Bao nhiêu máy dùng chung | Thường 1 | Hàng trăm tới hàng nghìn | Không giới hạn |
| Sửa một phần dữ liệu | Được (ghi đè vài block) | Được (ghi đè vài byte trong file) | Không, phải ghi lại cả object |
| Giá lưu trữ, us-east-1 | ~$0.08/GB-tháng (gp3) | ~$0.30/GB-tháng (EFS Standard) | Rẻ nhất trong ba loại (xem bảng giá các class ở bài ch4-02) |
| Hợp với | Ổ boot, database | Thư mục chung của nhiều server | Ảnh, video, backup, log, data lake |

### 2.2 Cây quyết định

Cây dưới đây là bản đồ của cả bài. Lần đọc đầu chưa cần hiểu hết các tên dịch vụ, mỗi nhánh được giải thích ở section ghi trong ngoặc. Đọc xong bài hãy quay lại đây.

```
Workload cần gì?
├── Block storage gắn 1 EC2 → EBS gp3 / io2                                  (§3)
├── Block shared multi-EC2 cluster-aware → EBS io1/io2 Multi-Attach (same AZ) (§3.2)
├── File shared Linux multi-AZ → EFS                                          (§4)
├── File Windows SMB → FSx for Windows                                        (§5.1)
├── HPC scratch file → FSx for Lustre                                         (§5.2)
├── NetApp ONTAP feature → FSx ONTAP                                          (§5.3)
├── ZFS-like → FSx OpenZFS                                                    (§5.4)
├── Object scale lớn, low cost → S3                                           (§6)
├── Archive 7+ năm → S3 Glacier Deep Archive
├── Hybrid on-prem cache S3 → Storage Gateway (File/Volume/Tape)              (§7.1)
└── Migrate data hàng TB → DataSync / Snowball / Snowmobile                   (§7.2–7.3)
```

Hai từ trong cây cần giải thích ngay. **Cluster-aware** là loại phần mềm biết rằng có nhiều máy cùng ghi vào một ổ và tự điều phối để không ghi đè lên nhau (§3.2). **HPC** (High Performance Computing) là tính toán song song trên hàng trăm tới hàng nghìn máy, ví dụ mô phỏng thời tiết hay train model ML; **scratch** là vùng dữ liệu tạm, mất cũng tính lại được.

---

## 3. EBS deep

**EBS (Elastic Block Store)** là ổ đĩa mạng gắn vào EC2. Ổ không nằm trong máy vật lý chạy instance mà nằm trong một hệ thống lưu trữ riêng của AZ, nối với instance qua mạng nội bộ. Nhờ vậy instance chết thì ổ vẫn còn, và có thể tháo ổ khỏi instance này gắn sang instance khác. Cũng vì vậy mà ổ **bị khoá trong một AZ** (§3.3).

### 3.1 Types

**Hai thước đo hiệu năng của một ổ đĩa.** Bảng các loại EBS chỉ có nghĩa khi phân biệt được hai con số này:

- **IOPS** (I/O operations per second) là **số thao tác** đọc/ghi mỗi giây, không quan tâm mỗi thao tác to hay nhỏ.
- **Throughput** là **lượng dữ liệu** chuyển được mỗi giây, đo bằng MiB/s.

Hai số liên hệ qua kích thước mỗi thao tác: `throughput = IOPS × kích thước một I/O`. Workload nào chạm trần nào trước là do kích thước I/O của nó:

```
Ổ gp3 mặc định: trần 3.000 IOPS và 125 MiB/s

Database OLTP, mỗi I/O 16 KiB (đọc ghi ngẫu nhiên, nhỏ):
  3.000 IOPS × 16 KiB ≈ 47 MiB/s      → chạm trần IOPS trước, throughput còn dư

Job quét log, mỗi I/O 256 KiB (đọc tuần tự, to):
  125 MiB/s ÷ 256 KiB = 500 IOPS      → chạm trần throughput trước, mới dùng 500/3.000 IOPS
```

Vì thế database giao dịch (nhiều thao tác nhỏ, vị trí ngẫu nhiên) cần **IOPS**, còn big data, Kafka, xử lý log (đọc ghi tuần tự từng khối lớn) cần **throughput**. Đây cũng là lý do có hai họ ổ. **SSD** không có bộ phận cơ học nên nhảy tới vị trí bất kỳ gần như tức thời, hợp I/O ngẫu nhiên. **HDD** phải quay đĩa và dịch đầu đọc, nên I/O ngẫu nhiên rất chậm (vài trăm IOPS) nhưng đọc tuần tự vẫn nhanh và rẻ hơn nhiều tính theo GB.

**Họ SSD — tối ưu cho IOPS:**

| Type | IOPS | Throughput | Durability | Dùng khi |
|------|------|------------|------------|----------|
| **gp3** (default mới) | Có sẵn 3.000, mua thêm tới 16.000 (đề thi) | Có sẵn 125 MiB/s, mua thêm tới 1.000 MiB/s (đề thi) | 99,8–99,9% | Mặc định cho gần như mọi thứ: ổ boot, app, DB vừa. **Rẻ hơn gp2 20%** mỗi GB |
| **gp2** (legacy) | 3 IOPS/GiB, tối thiểu 100, tối đa 16.000 | 128–250 MiB/s tuỳ dung lượng | 99,8–99,9% | Chỉ còn ở hệ thống cũ, nên migrate sang gp3 |
| **io1** | Tự chọn, tới 64.000 | Tới 1.000 MiB/s | 99,8–99,9% | DB quan trọng cần hơn 16.000 IOPS (đời cũ của io2) |
| **io2** | Tự chọn, tới 64.000 (đề thi) | Tới 1.000 MiB/s (đề thi) | **99,999%** | DB mission-critical: cần IOPS ổn định và ổ ít hỏng hơn |
| **io2 Block Express** | Tới **256.000**, độ trễ dưới 1 ms | Tới 4.000 MiB/s | **99,999%** | SAP HANA, Oracle, SQL Server cỡ lớn |

**Họ HDD — tối ưu cho throughput**, không dùng làm ổ boot được, dung lượng từ 125 GiB:

| Type | IOPS (đo với I/O 1 MiB) | Throughput | Dùng khi |
|------|------|------------|----------|
| **st1** (Throughput Optimized HDD) | Tối đa 500 | Tối đa 500 MiB/s | Big data, log, Kafka, data warehouse: đọc ghi tuần tự, truy cập thường xuyên |
| **sc1** (Cold HDD) | Tối đa 250 | Tối đa 250 MiB/s | Dữ liệu ít đụng tới, cần giá lưu thấp nhất trong các loại EBS: backup, archive |

Để ý cột IOPS của HDD được đo với I/O **1 MiB**, còn SSD đo với I/O 16 KiB. 500 IOPS × 1 MiB = 500 MiB/s: một ổ st1 chuyển dữ liệu tuần tự nhanh hơn gp3 mặc định 4 lần, nhưng đem chạy database thì chỉ được 500 thao tác mỗi giây.

**gp2 khác gp3 ở đâu.** Ở gp2, IOPS **dính vào dung lượng**: 3 IOPS cho mỗi GiB. Muốn nhiều IOPS hơn thì phải mua ổ to hơn dù không cần chỗ. gp3 tách hai thứ ra: ổ nào cũng có sẵn 3.000 IOPS và 125 MiB/s, cần thêm thì mua riêng.

```
Cần ổ 500 GiB cho database:
  gp2: 500 GiB × 3 IOPS/GiB = 1.500 IOPS    giá ~500 × $0.10 = $50/tháng
  gp3: 3.000 IOPS có sẵn                    giá ~500 × $0.08 = $40/tháng
→ gp3 rẻ hơn 20% mà IOPS gấp đôi.

gp2 muốn đạt trần 16.000 IOPS phải mua ổ 5.334 GiB (5.334 × 3 ≈ 16.000).
```

gp2 dưới 1 TiB còn có cơ chế **burst**: tích "I/O credit" lúc rảnh để tạm vọt lên 3.000 IOPS, hết credit thì rơi về mức 3 IOPS/GiB. Đây là nguồn gốc của kiểu sự cố "ổ đang nhanh tự dưng chậm" trên hệ thống cũ. gp3 không có burst, lúc nào cũng chạy đúng mức đã mua.

**Khi nào cần io2 thay vì gp3.** Có hai lý do, và đề thi hỏi cả hai:

1. **Cần nhiều IOPS hơn mức trần của gp3**, hoặc cần độ trễ ổn định dưới 1 ms.
2. **Cần ổ ít hỏng hơn.** "Durability" ở đây là xác suất một volume **không** hỏng trong một năm. gp3 là 99,8–99,9%, tức tỉ lệ hỏng 0,1–0,2%/năm. io2 là 99,999%, tức 0,001%/năm. Con số "bền hơn 100 lần" là từ đây: 0,1% ÷ 0,001% = 100.

```
Chạy 1.000 volume trong một năm:
  gp3 / gp2 / io1 / st1 / sc1:  0,1–0,2% × 1.000 = 1 đến 2 volume hỏng
  io2:                          0,001% × 1.000   = 0,01 → 100.000 volume mới hỏng 1
```

Cái giá của io2 là trả tiền theo từng IOPS đã mua:

```
Ổ 500 GiB, 16.000 IOPS (giá tham khảo trên trang EBS pricing):
  gp3: 500 × $0.08  + (16.000 − 3.000) × $0.005 = $40   + $65    = ~$105/tháng
  io2: 500 × $0.125 + 16.000 × $0.065           = $62,5 + $1.040 = ~$1.102/tháng
→ cùng số IOPS, io2 đắt hơn khoảng 10 lần. Chỉ dùng khi thật sự cần độ bền hoặc vượt trần gp3.
```

> 📏 Con số "đề thi" và con số hiện tại: tài liệu ôn thi và đề SAA-C03 dùng trần gp3 là **16.000 IOPS / 1.000 MiB/s**, io2 là **64.000 IOPS**, và coi io2 Block Express là một loại riêng đạt **256.000 IOPS / 4.000 MiB/s**. Docs hiện tại đã nâng gp3 lên **80.000 IOPS / 2.000 MiB/s** và gộp io2 với io2 Block Express làm một (mọi ổ io2 đều đạt tới 256.000 IOPS trên instance Nitro). Quy tắc chọn không đổi: gp3 là mặc định, io2 khi cần IOPS rất lớn hoặc durability 99,999%, HDD khi cần throughput tuần tự giá rẻ.

> 🪤 Bẫy thi: *"database cần 50.000 IOPS ổn định"* → io2 / io2 Block Express (vượt trần gp3 của đề). *"giảm chi phí cho các volume gp2 mà không giảm hiệu năng"* → đổi sang gp3. *"xử lý log / big data đọc tuần tự, chi phí thấp"* → st1. *"dữ liệu ít truy cập, rẻ nhất"* → sc1. *"ổ boot"* → không bao giờ là st1/sc1.

### 3.2 Features

**Encryption at rest.** Bật khi tạo volume, EBS dùng key trong KMS để mã hoá dữ liệu trên ổ, dữ liệu đi giữa instance và ổ, và mọi snapshot tạo ra từ ổ đó. Ứng dụng không phải sửa gì. Nên bật luôn **Encryption by default** ở mức account (theo từng region) để mọi volume mới tự được mã hoá, không phụ thuộc người tạo có nhớ tick hay không.

**Snapshot.** Snapshot là bản sao của volume tại một thời điểm, do AWS lưu trong S3 (bạn không thấy bucket đó). Snapshot là **incremental**: bản đầu chép toàn bộ block đang dùng, các bản sau chỉ chép những block **đã thay đổi** kể từ bản trước. Ổ 500 GiB mỗi ngày đổi 5 GiB thì mỗi snapshot hằng ngày chỉ tốn thêm khoảng 5 GiB. Vì nằm trong S3 nên snapshot thuộc về **cả region** chứ không thuộc một AZ. Đó là cách đưa một volume sang AZ khác, và copy được sang region khác hoặc account khác để làm DR.

**Fast Snapshot Restore (FSR).** Khi tạo volume từ snapshot, volume dùng được **ngay lập tức** dù dữ liệu chưa kịp chép về. EBS chép kiểu lười (lazy load): block nào được đọc lần đầu thì mới kéo block đó từ S3 về. Hậu quả là **lần đọc đầu tiên của mỗi block rất chậm**. Một database vừa restore có thể chạy ì ạch hàng giờ cho tới khi mọi block đã được chạm qua một lần. FSR giải đúng chuyện này: bật FSR cho một snapshot ở một AZ thì volume tạo từ snapshot đó ở AZ đó có đủ hiệu năng ngay từ giây đầu. Tính tiền theo từng cặp (snapshot, AZ), khoảng $0.75/giờ:

```
1 snapshot × 1 AZ × 720 giờ × $0.75 = ~$540/tháng
```

Nên FSR chỉ bật cho vài snapshot thật sự cần khôi phục nhanh, ví dụ AMI gốc của Auto Scaling Group hoặc bản backup DB dùng cho DR. Cách miễn phí thay thế là tự đọc qua toàn bộ ổ một lượt sau khi restore (gọi là initialize volume), nhưng mất thời gian.

**Multi-Attach.** Cho phép gắn **một** volume vào **nhiều instance cùng lúc**, tất cả đều đọc và ghi được. Giới hạn: chỉ **io1/io2**, các instance phải **cùng một AZ**, tối đa **16 instance**. Điều hay bị hiểu sai là Multi-Attach **không** biến EBS thành ổ chia sẻ file. File system thông thường như ext4 hay xfs được viết với giả định chỉ một máy ghi: mỗi máy giữ bản cache riêng về cấu trúc ổ trong RAM, hai máy cùng ghi sẽ đè lên nhau và **làm hỏng file system**. Muốn dùng Multi-Attach phải có **cluster-aware file system** (GFS2, OCFS2) hoặc ứng dụng tự điều phối việc ghi, ví dụ một số database cluster. Còn nếu chỉ cần "nhiều máy chung một thư mục" thì câu trả lời là EFS.

**Elastic Volumes.** Tăng dung lượng, đổi loại (gp2 → gp3), đổi IOPS và throughput **trong lúc ổ đang gắn và đang chạy**, không downtime. Chỉ tăng được dung lượng, không giảm được. Sau khi tăng còn phải mở rộng file system trong hệ điều hành (`growpart`, `resize2fs`/`xfs_growfs`).

### 3.3 Bẫy
- EBS gắn **1 AZ** — instance fail over AZ phải snapshot → restore AZ khác.
- Snapshot có thể chứa data nhạy cảm — encrypt + tag access control.
- `DeleteOnTermination=true` cho root volume (default) — additional volume default false.

---

## 4. EFS

### 4.1 Đặc điểm

**EFS (Elastic File System)** là thư mục dùng chung qua mạng cho Linux, AWS quản lý toàn bộ: không chọn dung lượng trước, không có server nào để vá.

- Dùng giao thức **NFSv4**. NFS (Network File System) là giao thức chia sẻ file chuẩn của Linux/Unix: máy client mount một thư mục ở xa và dùng như thư mục local.
- **POSIX** compliant. POSIX là bộ quy ước mà ứng dụng Linux mong đợi ở một file system: quyền `rwx`, owner/group, khoá file, đổi tên nguyên tử. Nhờ vậy app Linux chạy trên EFS không cần sửa code. S3 không có những thứ này.
- **Multi-AZ**: loại Regional tự lưu dữ liệu trên ít nhất 3 AZ. Mỗi AZ có một **mount target** (một địa chỉ IP trong subnet), EC2 ở AZ nào mount qua mount target của AZ đó.
- Tự co giãn tới cỡ **petabyte**, **hàng nghìn EC2** mount đồng thời. Chỉ trả tiền cho dung lượng thực dùng.
- Mount: `mount.efs <fs-id>:/ /mnt` (cùng VPC + security group mở cổng 2049 của NFS).
- **Chỉ dành cho Linux.** Windows cần SMB → FSx for Windows (§5.1).

### 4.2 Storage classes

File mới luôn ghi vào Standard. Các class rẻ hơn dành cho file lâu không ai đọc: giá lưu thấp hơn nhưng **mỗi lần đọc tính thêm phí theo GB** và byte đầu tiên về chậm hơn (vài chục ms, so với khoảng 1 ms của Standard).

- **Standard** — multi-AZ, frequent access, lưu trên SSD.
- **Standard-IA** (Infrequent Access) — multi-AZ, cho file chỉ đọc vài lần mỗi quý. Giá lưu rẻ hơn Standard tới khoảng 92% theo số AWS công bố.
- **One Zone** — 1 AZ, frequent. Rẻ hơn Regional, đổi lại mất AZ đó là mất quyền truy cập.
- **One Zone-IA** — 1 AZ, infrequent (rẻ nhất trong bốn class này).
- **Archive** — class mới hơn, cho file chỉ đọc vài lần mỗi năm, rẻ hơn IA, thời gian lưu tối thiểu 90 ngày. Đề thi ít hỏi.
- **Lifecycle Management** tự chuyển file sang IA sau một số ngày không ai đọc (mặc định **30 ngày**; đề thi thường nêu khoảng 7–90 ngày) và sang Archive sau 90 ngày. Có thể bật thêm chiều ngược lại: file được đọc thì tự về Standard.

### 4.3 Performance modes

Performance mode quyết định **độ trễ của từng thao tác**.

- **General Purpose** (default) — độ trễ thấp nhất: khoảng 1 ms cho đọc và 2,7 ms cho ghi. Dùng cho gần như mọi workload: web server, CMS, home directory, CI/CD.
- **Max I/O** — thiết kế đời trước cho workload **song song rất cao** (hàng nghìn client cùng đọc ghi, kiểu big data). Nó đổi độ trễ lấy sức chịu tải: mỗi thao tác chậm hơn General Purpose, bù lại tổng số thao tác của cả cụm cao hơn. Không dùng được với One Zone và với Elastic throughput.

AWS hiện khuyên **luôn chọn General Purpose**. Trên đề thi, Max I/O chỉ đúng khi đề nhấn mạnh "hàng nghìn instance truy cập song song và chấp nhận latency cao hơn".

### 4.4 Throughput modes

Throughput mode quyết định **mỗi giây file system chuyển được bao nhiêu MiB**, và bạn trả tiền cho việc đó thế nào.

**Bursting** — throughput **tỉ lệ với dung lượng đang lưu** ở class Standard. Mức nền là **50 KiB/s cho mỗi GiB** (tức 50 MiB/s mỗi TiB). Lúc dùng dưới mức nền, file system tích **burst credit**; lúc cần nó tiêu credit để vọt lên 100 MiB/s mỗi TiB, tối thiểu 100 MiB/s. Hết credit thì rơi về mức nền.

```
File system 100 GiB:
  Mức nền:            100 GiB × 50 KiB/s ≈ 5 MiB/s
  Rảnh trọn 24 giờ:   5 MiB/s × 86.400 s = 432.000 MiB credit
  Burst ở 100 MiB/s:  432.000 ÷ 100 = 4.320 giây = 72 phút mỗi ngày
  Hết credit:         còn 5 MiB/s

File system 1 TiB:    mức nền 50 MiB/s, burst 100 MiB/s được tới 12 giờ mỗi ngày
```

Bẫy kinh điển nằm ngay trong phép tính: **file system nhỏ mà traffic lớn**. Một thư mục 20 GiB chứa code của web app có mức nền chỉ khoảng 1 MiB/s. Chạy ổn một thời gian nhờ credit tích được lúc vắng, tới ngày tiêu hết credit thì cả site chậm hẳn mà không ai sửa gì. Theo dõi bằng metric `BurstCreditBalance` trên CloudWatch.

**Provisioned** — tự đặt một mức throughput cố định, **không phụ thuộc dung lượng**, và trả tiền cho phần MiB/s vượt mức nền, kể cả lúc không dùng. Hợp khi biết rõ nhu cầu và tải đều. Ví dụ file system 20 GiB nhưng lúc nào cũng cần 50 MiB/s.

**Elastic** — AWS tự nới throughput theo nhu cầu tức thời, không có credit. Trả tiền theo **GB thực sự đọc/ghi**. Hợp với tải giật cục, khó đoán: đỉnh cao nhưng phần lớn thời gian gần như đứng yên. AWS đưa mốc: nếu throughput trung bình chỉ bằng **5% đỉnh trở xuống** thì Elastic rẻ hơn, cao hơn mức đó thì Provisioned rẻ hơn.

| | **Bursting** | **Provisioned** | **Elastic** |
|--|--------------|-----------------|-------------|
| Throughput phụ thuộc | Dung lượng lưu ở Standard | Con số bạn đặt | Nhu cầu thực tế |
| Trả tiền throughput | Không trả riêng (gói trong tiền lưu) | Theo MiB/s đã đặt, kể cả lúc rảnh | Theo GB đọc/ghi |
| Rủi ro | Hết credit thì chậm | Trả tiền cho lúc idle | Hoá đơn khó đoán nếu tải tăng bất thường |
| Hợp khi | Dữ liệu lớn dần và tải tăng theo dữ liệu | Tải đều, biết trước | Tải spike, không muốn tính toán |

> 📏 Tài liệu ôn thi thường ghi Bursting là mode mặc định. Docs hiện tại coi **Elastic** là mặc định và là lựa chọn khuyến nghị. Trên đề, hãy chọn theo mô tả workload chứ đừng dựa vào chữ "default".

### 4.5 EFS vs EBS

Nguyên nhân gốc của mọi khác biệt trong bảng: EBS là **ổ đĩa của một máy**, nằm trong một AZ, file system do hệ điều hành của máy đó giữ. EFS là **dịch vụ file** chạy trên nhiều AZ, file system do AWS giữ nên nhiều máy dùng chung được. Cái giá của EFS là mỗi thao tác đi qua giao thức NFS trên mạng nên chậm hơn ổ block, và giá mỗi GB cao hơn khoảng 3–4 lần.

| | EFS | EBS |
|--|-----|-----|
| Type | File NFS | Block |
| Multi-AZ | ✅ | ❌ |
| Multi-EC2 | ✅ (thousands) | Multi-Attach io1/io2 max 16, same AZ |
| Resize | Auto | Manual (Elastic Volumes) |
| Cost | Cao (~$0.30/GB Std) | gp3 ~$0.08/GB |
| Use case | Shared content, lift-shift NFS | Boot disk, DB |

> 🪤 Bẫy thi: *"nhiều EC2 ở nhiều AZ cùng đọc ghi một thư mục, Linux"* → EFS. *"database cần độ trễ thấp nhất trên một instance"* → EBS. Đừng chọn EFS cho database chỉ vì nó multi-AZ: HA cho database là việc của RDS Multi-AZ hoặc Aurora.

---

## 5. FSx variants

EFS chỉ nói NFS và chỉ phục vụ Linux. **FSx** là họ dịch vụ "thuê một file system có tên tuổi, AWS vận hành hộ": bạn nhận đúng phần mềm file server mà doanh nghiệp đã quen (Windows File Server, Lustre, NetApp ONTAP, OpenZFS), còn AWS lo máy chủ, vá lỗi, backup, failover. Bốn biến thể giải bốn bài toán khác hẳn nhau, nên đề thi gần như luôn cài sẵn một từ khoá để nhận ra.

### 5.1 FSx for Windows File Server

Là một Windows file server thật, chạy trên Windows Server, lưu bằng NTFS. Nó có hai thứ EFS không có:

- **SMB** (Server Message Block) — giao thức chia sẻ file của Windows, thứ đứng sau các đường dẫn kiểu `\\server\share`. Máy Windows không mount được NFS của EFS một cách tự nhiên.
- **Active Directory (AD)** — hệ thống danh bạ user và group của doanh nghiệp dùng Windows. FSx Windows join vào AD, nên quyền trên từng thư mục gán thẳng cho user/group AD bằng Windows ACL, nhân viên đăng nhập bằng tài khoản công ty sẵn có.

Có Single-AZ và **Multi-AZ** (một file server dự phòng ở AZ khác, tự failover). Truy cập được từ Windows, Linux, và từ on-prem qua VPN/Direct Connect. Chọn được ổ SSD (độ trễ dưới 1 ms) hoặc HDD (rẻ hơn, cho home directory).

Từ khoá nhận diện: *Windows, SMB, Active Directory, NTFS, DFS, SharePoint, .NET app, home directory của nhân viên.*

### 5.2 FSx for Lustre

**Lustre** là file system mã nguồn mở viết cho siêu máy tính. Ý tưởng cốt lõi: một file được **cắt ra và rải trên nhiều storage server**, client đọc **song song từ tất cả server cùng lúc**. Thêm server là thêm throughput, nên cả cụm đạt được mức mà một file server đơn không tới nổi: docs ghi tới nhiều **TB/s** tổng cộng, hàng triệu IOPS, độ trễ dưới 1 ms. Để so sánh: một file system EFS Elastic tối đa vài chục GiB/s, một ổ EBS tối đa 4.000 MiB/s.

Throughput **tỉ lệ với dung lượng** bạn cấp, theo hệ số của từng loại deployment:

```
Scratch (200 MB/s mỗi TiB):            10 TiB × 200   = 2.000 MB/s nền,
                                       burst tới 6 lần mức nền
Persistent 2 (chọn 125 → 1.000 MB/s
              mỗi TiB):                10 TiB × 1.000 = 10.000 MB/s = 10 GB/s
```

**Scratch và Persistent** khác nhau ở chỗ dữ liệu có được nhân bản hay không:

- **Scratch** — dữ liệu **không nhân bản**, một file server hỏng là mất phần dữ liệu trên server đó. Rẻ. Dùng cho job chạy vài giờ tới vài ngày mà dữ liệu gốc vẫn nằm ở nơi khác (thường là S3).
- **Persistent** — dữ liệu được nhân bản trong AZ, server hỏng thì tự thay trong vài phút. Dùng cho workload chạy lâu dài.

Cả hai đều nằm trong **một AZ**. Lustre đổi tính sẵn sàng đa AZ lấy tốc độ.

**Liên kết với S3** là lý do nó hay xuất hiện trong đề. Gắn file system vào một bucket thì các object hiện ra như file. Lúc đầu Lustre chỉ nạp danh sách file; nội dung từng file được kéo từ S3 về ở lần đọc đầu tiên, và kết quả ghi ngược lại S3 được. Mô hình điển hình: dataset nằm lâu dài và rẻ trên S3, tới lúc train thì dựng Lustre lên xử lý ở tốc độ cao, xong việc thì xoá Lustre.

Chỉ dành cho **Linux** (cần cài Lustre client). Từ khoá nhận diện: *HPC, machine learning training, xử lý video, mô phỏng tài chính, "hàng trăm GB/s", "sub-millisecond", "dataset trên S3 cần xử lý như file".*

### 5.3 FSx for NetApp ONTAP

**ONTAP** là hệ điều hành lưu trữ của hãng NetApp, rất phổ biến trong data center doanh nghiệp. Công ty đã dùng NetApp on-prem có sẵn script, quy trình backup và công cụ viết riêng cho ONTAP. FSx ONTAP đưa nguyên bộ đó lên AWS để họ chuyển lên cloud mà không phải học lại hay viết lại.

Điểm riêng:

- **Đa giao thức trên cùng dữ liệu**: NFS (Linux), SMB (Windows) và **iSCSI**. iSCSI là giao thức gửi lệnh đọc/ghi block qua mạng IP, làm cho một ổ ở xa hiện ra như ổ gắn trong máy. Tức ONTAP phục vụ được cả file lẫn block. Truy cập được từ Linux, Windows và macOS.
- **Snapshot và clone tức thời** (FlexClone): tạo bản sao ghi-được của cả một volume trong vài giây mà gần như không tốn thêm dung lượng, vì bản sao chỉ lưu phần khác biệt. Tiện cho việc dựng môi trường test từ dữ liệu production.
- **SnapMirror**: nhân bản giữa hai hệ ONTAP, kể cả từ NetApp on-prem lên FSx. Đây là đường migrate và DR quen thuộc của khách NetApp.
- **Tự phân tầng**: dữ liệu ít đụng tới tự chuyển từ SSD xuống tầng lưu trữ rẻ hơn; có nén và khử trùng lặp (dedup).
- Có Single-AZ và **Multi-AZ**.

Từ khoá nhận diện: *NetApp, ONTAP, SnapMirror, cần cả NFS lẫn SMB trên cùng dữ liệu, cần iSCSI, clone nhanh cho dev/test.*

### 5.4 FSx for OpenZFS

**ZFS** là một file system nổi tiếng trong giới Linux/Unix vì snapshot, clone và nén dữ liệu có sẵn, cùng cơ chế tự kiểm tra tính toàn vẹn dữ liệu. FSx OpenZFS dành cho đội đang chạy file server ZFS hoặc NFS Linux tự dựng và muốn chuyển lên AWS, giữ nguyên các tính năng đó.

- Chỉ **NFS**.
- Khác EFS ở chỗ nó là **một file server có cấu hình cố định** (bạn chọn dung lượng, IOPS, throughput), cho độ trễ thấp và ổn định hơn với workload nhiều file nhỏ. EFS thì tự co giãn và không phải chọn gì.
- Khác Lustre ở chỗ nó không rải dữ liệu song song trên nhiều server, nên không dành cho HPC.
- Có Single-AZ và, ở các bản hiện tại, cả **Multi-AZ** (failover thường dưới 60 giây).

Từ khoá nhận diện: *ZFS, migrate NFS file server Linux on-prem, cần snapshot/clone/compression, độ trễ thấp cho NFS.*

### 5.5 Đặt bốn dịch vụ cạnh nhau

| | FSx for Windows | FSx for Lustre | FSx for ONTAP | FSx for OpenZFS |
|--|-----------------|-----------------|----------------|------------------|
| Protocol | SMB | Lustre (POSIX) | NFS, SMB, iSCSI | NFS |
| Client | Windows (Linux cũng mount được) | Linux | Linux, Windows, macOS | Linux |
| Use case | Windows file server, .NET app, AD-integrated | HPC, ML training scratch | NetApp customer, hybrid, snapshot+clone | High-perf Linux NFS |
| Performance | Độ trễ dưới 1 ms với SSD; một file server | **TB/s aggregate** nhờ đọc song song nhiều server | Tới hàng chục GB/s mỗi file system | Độ trễ thấp cho NFS; một file server, không scale-out |
| Trả tiền theo | Dung lượng + throughput capacity | Per GB + throughput | Dung lượng SSD + throughput + tầng capacity pool (nhiều thành phần nhất) | Dung lượng + IOPS + throughput |
| Multi-AZ | ✅ | Single-AZ (scratch hoặc persistent) | ✅ | ✅ ở bản hiện tại (tài liệu cũ ghi Single-AZ) |

**Use case map:**
- **AD-integrated Windows file share** → FSx Windows.
- **ML training với S3 source data** → FSx Lustre + S3 linked.
- **NetApp ONTAP customer migrate** → FSx ONTAP.
- **Linux NFS workload high perf** → FSx OpenZFS.

> 🪤 Bẫy thi: thấy **Windows / SMB / Active Directory** → FSx Windows, không phải EFS (EFS chỉ NFS). Thấy **HPC / ML + S3** → Lustre. Thấy *"cả Linux lẫn Windows cùng truy cập một bộ dữ liệu"* → ONTAP (đa giao thức). Thấy *"Linux, nhiều AZ, không muốn quản lý dung lượng"* mà không có từ khoá nào ở trên → vẫn là EFS.

---

## 6. S3 Advanced Patterns

### 6.1 Multipart Upload
- **Required** > 5GB single object.
- **Recommended** > 100MB.
- Parallel parts → resume từ part failed.
- **Lifecycle Abort Incomplete** bắt buộc (orphan parts tốn tiền).

### 6.2 Transfer Acceleration

**Bài toán.** User ở Việt Nam upload file lớn vào bucket ở `us-east-1`. Gói tin phải đi qua nhiều nhà mạng trên Internet công cộng, tuyến đường do các nhà mạng chọn theo chi phí của họ chứ không theo tốc độ. Trên tuyến dài, độ trễ cao và tỉ lệ rớt gói làm TCP tự giảm tốc. Kết quả thường thấy là đường truyền 100 Mbps nhưng upload chỉ đạt vài Mbps.

**Cơ chế.** Bật Transfer Acceleration trên bucket rồi upload tới endpoint riêng `<bucket>.s3-accelerate.amazonaws.com`. Tên này trỏ tới **edge location** gần user nhất. Edge location là các điểm hiện diện của CloudFront đặt ở hàng trăm thành phố. Kết nối TCP của user kết thúc ngay ở đó, tức chỉ đi một đoạn ngắn trên Internet công cộng. Từ edge về bucket, dữ liệu chạy trên **mạng backbone riêng của AWS**: cáp do AWS vận hành, không tranh băng thông với Internet, tuyến đã được tối ưu.

```
Không TA:  user ──────────── Internet công cộng, nhiều chặng ───────────→ S3 us-east-1
Có TA:     user ── đoạn ngắn ──→ edge location ══ backbone AWS ══════════→ S3 us-east-1
```

**Nhanh hơn bao nhiêu?** Không có con số cố định, vì nó phụ thuộc đường truyền của user đang tệ tới mức nào. User ở xa bucket, file lớn thì lợi nhiều. User ở gần region của bucket thì gần như không lợi gì. AWS có sẵn công cụ **Speed Comparison** để đo từ vị trí của bạn tới từng region trước khi quyết định bật.

**Chi phí và điều kiện:**
- Phí thêm **$0.04/GB** khi đi qua edge ở Mỹ, châu Âu, Nhật; **$0.08/GB** qua các edge còn lại (cộng thêm vào phí S3 thông thường). Upload 50 GB từ Việt Nam: 50 × $0.08 = ~$4.
- Tên bucket không được chứa dấu chấm, và phải gọi theo kiểu virtual-hosted (tên bucket nằm trong hostname).
- Endpoint `<bucket>.s3-accelerate.amazonaws.com`. Endpoint thường vẫn dùng song song được.

Transfer Acceleration và Multipart giải hai chuyện khác nhau nên hay đi cùng nhau: Multipart cắt file để gửi song song và resume được, Transfer Acceleration làm mỗi kết nối đi nhanh hơn.

> 🪤 Bẫy thi: *"user toàn cầu upload vào một bucket trung tâm, cần nhanh hơn"* → Transfer Acceleration. *"user toàn cầu **download** nội dung"* → CloudFront (có cache). *"chuyển dữ liệu từ data center lên S3 định kỳ"* → DataSync (§7.2), không phải Transfer Acceleration.

### 6.3 S3 Select & Glacier Select

**Bài toán.** Có một file CSV 2 GB trên S3 và chỉ cần những dòng có `status = 'ERROR'`. Cách thường là `GET` cả 2 GB về rồi lọc ở client: tốn băng thông, tốn thời gian, tốn RAM của Lambda.

**Cơ chế.** S3 Select cho gửi kèm request một câu SQL đơn giản (`SELECT ... FROM S3Object s WHERE ...`). S3 **tự lọc ở phía server** và chỉ trả về những byte khớp điều kiện. Việc quét vẫn diễn ra trên cả object, cái tiết kiệm được là lượng dữ liệu đi qua mạng và công xử lý ở client.

- Hỗ trợ object dạng **CSV, JSON, Parquet** (CSV/JSON có thể nén GZIP/BZIP2).
- Mỗi request chỉ query **một object**. Không JOIN, không query cả bucket hay cả prefix. Muốn SQL trên nhiều object thì dùng **Athena**.
- S3 Select không đọc được object đang nằm ở các class lưu trữ lạnh Glacier Flexible Retrieval / Deep Archive. **Glacier Select** là biến thể riêng cho đúng trường hợp đó: chạy SQL trên object đã archive mà không phải restore cả object về trước.

> 📏 Docs hiện ghi: **S3 Select không còn mở cho khách hàng mới**, khách cũ vẫn dùng bình thường. AWS hướng người dùng mới sang Athena hoặc tự lọc ở client. Đề thi và tài liệu ôn vẫn có thể nhắc S3 Select, với ý cần nhớ là *"chỉ lấy một phần dữ liệu trong **một** object bằng SQL, giảm dữ liệu truyền về"*. Còn *"query SQL trên cả tập dữ liệu trong S3"* thì luôn là Athena.

### 6.4 Object Lock (WORM)
- Bật khi **tạo bucket** (không enable sau).
- **Governance mode**: user có `BypassGovernanceRetention` mới override.
- **Compliance mode**: **không ai** override, kể cả root.
- **Retention period** + **Legal Hold** (vô thời hạn).
- Use case: SEC 17a-4, FINRA, GDPR.

> 📏 Đề thi và tài liệu ôn dùng quy tắc "chỉ bật được lúc tạo bucket". Docs hiện tại cho phép bật Object Lock trên **bucket đã có** (bucket phải bật versioning). Điều không đổi: đã bật thì **không tắt được**, và không tạm dừng versioning được nữa.

### 6.5 Access Points
- 1 bucket → nhiều endpoint, mỗi cái policy riêng.
- Multi-tenant: app A access point chỉ thấy prefix `a/`, app B chỉ `b/`.
- **Multi-Region Access Point (MRAP)** — 1 global endpoint routing đến bucket region gần nhất (active-active S3 cross-region).

Access Point sinh ra vì một bucket dùng chung cho nhiều team sẽ có bucket policy phình thành hàng trăm dòng, sửa cho team này dễ làm hỏng quyền của team khác. Tách thành mỗi team một access point thì mỗi policy ngắn và độc lập.

MRAP không tự chép dữ liệu. Bạn vẫn phải tạo bucket ở từng region và bật replication giữa chúng (§6.6). MRAP chỉ lo phần định tuyến: request đi vào mạng AWS rồi tới bucket gần nhất đang hoạt động, và cho phép chuyển traffic sang region khác khi một region gặp sự cố.

### 6.6 Replication
- **CRR** (cross-region) — DR.
- **SRR** (same-region) — log aggregation, account separation.
- **Bidirectional** — bucket A↔B (2-way sync).
- **Replication Time Control (RTC)** — SLA 15 phút (có phí).
- **Batch Replication** — replicate object cũ (replication thường KHÔNG retroactive).
- Yêu cầu: **versioning** cả 2.

Replication chạy **bất đồng bộ**: object ghi xong ở bucket nguồn rồi mới được chép sang đích, thường trong vài giây tới vài phút, nhưng mặc định không có cam kết thời gian. RTC thêm cam kết đó: phần lớn object được chép trong vài giây và 99,9% trong vòng 15 phút, kèm metric và cảnh báo khi trễ. Đề thi hỏi RTC khi có yêu cầu compliance kiểu "phải chứng minh dữ liệu sang region kia trong 15 phút".

Replication chỉ áp dụng cho object ghi **sau khi bật rule**, vì nó hoạt động bằng cách phản ứng với từng thao tác ghi mới. Object có từ trước không sinh ra sự kiện nào nên không được chép. Đó là việc của Batch Replication.

### 6.7 Event Notification + EventBridge
- S3 event → SQS/SNS/Lambda hoặc **EventBridge** (mới, schema + filter mạnh hơn).
- Use case: image processing, ETL trigger, audit.

### 6.8 Storage Lens
- Org-wide analytics: usage, activity, recommendation.
- Free tier (basic metrics), advanced có phí.

### 6.9 S3 Inventory
- Báo cáo CSV/Parquet/ORC list mọi object hàng ngày/tuần.
- Use case: compliance audit, big data analytics on bucket content.

---

## 7. Hybrid storage

"Hybrid" là khi một phần hệ thống vẫn nằm ở data center của công ty (**on-premises**, viết tắt on-prem) và một phần ở AWS. Có hai bài toán khác nhau: **dùng lâu dài** storage của AWS từ on-prem (Storage Gateway), và **chuyển một lần** dữ liệu lên AWS (DataSync, Snow).

### 7.1 Storage Gateway

**Bài toán.** Ứng dụng on-prem chỉ biết nói các giao thức storage truyền thống (NFS, SMB, iSCSI, băng từ). Chúng không biết gọi S3 API, và bạn không muốn hoặc không thể sửa chúng. Nhưng công ty muốn dữ liệu nằm trên AWS: rẻ hơn, bền hơn, không phải mua thêm tủ đĩa.

**Nó là gì.** Storage Gateway là một **máy trung gian đặt ngay trong data center của bạn**. Thường là một máy ảo chạy trên VMware ESXi, Hyper-V hoặc KVM; cũng có bản thiết bị phần cứng mua của AWS, hoặc chạy trên EC2. Phía on-prem, nó nói giao thức cũ mà ứng dụng đã quen. Phía sau, nó chuyển dữ liệu lên S3 qua HTTPS. Nó có ổ đĩa local làm **cache**, nên dữ liệu vừa dùng được đọc với tốc độ mạng LAN chứ không phải chờ kéo từ AWS về.

```
App on-prem ── NFS / SMB / iSCSI ──→ [Storage Gateway + cache local] ══ HTTPS ══→ S3 / Glacier
              (mạng LAN, nhanh)        (VM trong data center)          (Internet hoặc Direct Connect)
```

Có ba họ, ứng với ba kiểu giao diện mà ứng dụng cần.

**File Gateway (S3 File Gateway).** Ứng dụng thấy một thư mục chia sẻ **NFS hoặc SMB**. Mỗi file ghi vào trở thành **đúng một object** trong S3. Điểm quan trọng là object đó đọc được trực tiếp bằng S3 API, nên các dịch vụ khác (Athena, Lambda, lifecycle sang Glacier) dùng được ngay. File dùng gần đây nằm ở cache local. Dùng khi muốn thay file server on-prem bằng S3, hoặc đưa dữ liệu on-prem lên S3 để phân tích trên cloud.

**Volume Gateway.** Ứng dụng thấy một **ổ đĩa block qua iSCSI** (giao thức đã nói ở §5.3: ổ ở xa hiện ra như ổ gắn trong máy). Có hai chế độ, khác nhau ở chỗ **bản chính của dữ liệu nằm ở đâu**:

| | **Cached volumes** | **Stored volumes** |
|--|--------------------|--------------------|
| Bản chính nằm ở | **S3** | **Đĩa on-prem** của bạn |
| On-prem giữ gì | Chỉ phần dữ liệu hay dùng (cache) | Toàn bộ dữ liệu |
| AWS giữ gì | Toàn bộ dữ liệu | Bản backup, chép lên **bất đồng bộ** dưới dạng EBS snapshot |
| Độ trễ đọc | Nhanh với dữ liệu đang trong cache, chậm với dữ liệu phải kéo từ S3 | Luôn nhanh, vì mọi thứ ở local |
| Cần bao nhiêu đĩa on-prem | Ít: khoảng 20% tổng dữ liệu để làm cache | Đủ chứa 100% dữ liệu |
| Mất kết nối tới AWS | Chỉ đọc được phần đang trong cache | Vẫn chạy bình thường, backup dồn lại chờ |
| Dung lượng tối đa | 32 volume × 32 TiB = 1.024 TiB mỗi gateway | 32 volume × 16 TiB = 512 TiB mỗi gateway |
| Chọn khi | Tủ đĩa on-prem sắp đầy, muốn mở rộng mà không mua thêm | Cần mọi dữ liệu luôn ở local với độ trễ thấp, AWS chỉ để backup/DR |

Ở cả hai chế độ, snapshot của volume là **EBS snapshot**, nên khi cần DR có thể tạo EBS volume từ snapshot đó và gắn vào EC2.

**Tape Gateway.** Nhiều doanh nghiệp vẫn backup ra **băng từ**. **LTO** là chuẩn băng cartridge phổ biến, đặt trong một tủ robot gọi là tape library. Phần mềm backup (Veeam, Veritas NetBackup, Commvault…) được viết để điều khiển tủ băng. Tape Gateway giả làm một tủ băng: nó trình ra một **VTL** (Virtual Tape Library, thư viện băng ảo) qua iSCSI. Phần mềm backup tưởng mình đang ghi băng thật, không phải đổi cấu hình hay quy trình. Mỗi "băng ảo" (100 GiB tới 15 TiB) thực chất nằm trên S3. Khi phần mềm backup "đẩy băng ra khỏi tủ", băng được chuyển xuống **S3 Glacier Flexible Retrieval hoặc Deep Archive** với giá lưu trữ lạnh. Dùng khi muốn bỏ băng từ vật lý mà giữ nguyên phần mềm và quy trình backup.

Tổng hợp lại:

| Type | Protocol | Use case |
|------|----------|----------|
| **File Gateway** | NFS/SMB → S3 | Lift-shift file server, on-prem cache S3 |
| **Volume Gateway Cached** | iSCSI, hot data cached on-prem, primary S3 | Limited on-prem storage |
| **Volume Gateway Stored** | iSCSI, primary on-prem, async backup S3 | Full local + cloud backup |
| **Tape Gateway** | iSCSI VTL → S3 Glacier | Replace LTO tape library |

> 🪤 Bẫy thi: từ khoá quyết định là **giao thức ứng dụng cần**. NFS/SMB + "file thành object S3" → File Gateway. iSCSI/block + "hết chỗ on-prem" → Volume Cached. iSCSI/block + "độ trễ thấp cho toàn bộ dữ liệu, backup lên AWS" → Volume Stored. "tape, backup software hiện có, VTL" → Tape Gateway. Còn *"chuyển một lần rồi tắt hệ thống cũ"* thì không phải Storage Gateway mà là DataSync.

### 7.2 DataSync

**Nó là gì.** DataSync là dịch vụ **chép dữ liệu qua mạng**, dùng cho migration hoặc đồng bộ theo lịch. Khác Storage Gateway ở mục đích: Storage Gateway là cầu nối để ứng dụng on-prem **dùng** storage AWS hằng ngày, còn DataSync **chuyển** dữ liệu từ A sang B rồi thôi.

- **Nguồn và đích:** từ on-prem (NFS, SMB, HDFS, object storage tự dựng) hoặc cloud khác lên **S3, EFS, FSx**, và cả AWS↔AWS (ví dụ S3 → EFS, EFS region này → EFS region khác).
- **Agent:** với nguồn on-prem, cài một máy ảo DataSync agent trong data center. Agent đọc dữ liệu bằng NFS/SMB rồi gửi lên AWS. Chép giữa hai dịch vụ AWS thì không cần agent.
- **Incremental sync:** mỗi lần chạy, DataSync so nguồn với đích và chỉ chép phần khác nhau. Nhờ vậy làm được kiểu migrate ít downtime: chép lần đầu mất nhiều ngày trong khi hệ thống cũ vẫn chạy, rồi chạy lại nhiều lần để bắt kịp, lần cuối chỉ mất vài phút trước khi chuyển hẳn.
- **Vì sao nhanh hơn `rsync` tự chạy:** DataSync dùng giao thức truyền riêng, mở nhiều luồng song song, nén dữ liệu trên đường đi, tự kiểm checksum và tự retry. Tài liệu ôn thi thường ghi "10x faster than open-source tools". Con số chắc chắn hơn từ docs hiện tại: **một task dùng hết được đường truyền 10 Gbps**.
- Đặt được lịch chạy (giờ/ngày/tuần) và **giới hạn băng thông** để không chiếm hết đường truyền trong giờ làm việc. Giữ nguyên quyền file và metadata.

### 7.3 Snowball / Snowcone / Snowmobile

**Bài toán: khi nào chép qua mạng là không khả thi.** Thời gian chuyển dữ liệu qua mạng tính được bằng một phép chia, và đây là phép tính đề thi muốn bạn làm được:

```
Thời gian = dung lượng (bit) ÷ băng thông (bit/giây)

100 TB qua đường 100 Mbps:
  100 TB = 100 × 10^12 byte × 8 = 8 × 10^14 bit
  8 × 10^14 ÷ (100 × 10^6 bit/s) = 8.000.000 giây ≈ 93 ngày
  (đó là khi dùng 100% đường truyền suốt 24/7; thực tế dùng được ~80% → khoảng 116 ngày)

Cùng 100 TB:
  qua 1 Gbps  → ~9 ngày
  qua 10 Gbps → ~1 ngày

10 TB qua 100 Mbps → ~9 ngày
```

Khi con số ra **nhiều tuần tới nhiều tháng**, hoặc khi địa điểm gần như không có mạng (tàu biển, mỏ, vùng xa), thì gửi ổ cứng bằng đường bưu kiện nhanh hơn. Đó là họ **Snow**: AWS gửi tới một thiết bị lưu trữ chống va đập, dữ liệu trên đó được mã hoá. Bạn chép dữ liệu vào qua mạng LAN, gửi trả, AWS nạp vào S3. Tổng thời gian tính bằng ngày tới vài tuần gồm cả vận chuyển, và không phụ thuộc đường truyền Internet của bạn.

- **Snowcone** — 8TB, edge computing. Thiết bị nhỏ cỡ hộp khăn giấy, xách tay được.
- **Snowball Edge** — 80TB, edge + compute. Cỡ một cái vali, có sẵn CPU để chạy EC2/Lambda tại chỗ khi không có mạng. Có bản Storage Optimized (thiên về dung lượng) và Compute Optimized (thiên về xử lý).
- **Snowmobile** — **100 PB**, semi-truck. Một container 45 feet do xe đầu kéo chở tới, dành cho việc chuyển cả data center cỡ exabyte.
- Use case: data > 10TB hoặc bandwidth limited.

Mốc "> 10 TB" là quy tắc ngón tay cái của đề thi. Phép tính ở trên mới là cách quyết định thật: 10 TB qua đường 1 Gbps chỉ mất khoảng một ngày, khi đó DataSync hợp lý hơn.

> 📏 Hiện trạng thật khác với đề thi. Đề SAA-C03 và tài liệu ôn vẫn dùng bộ ba Snowcone / Snowball Edge / Snowmobile với các con số ở trên, nên **vẫn phải thuộc**. Ngoài đời: **Snowmobile** đã ngừng từ 2024; **Snowcone** và bản Snowball Edge 80 TB ngừng từ 12/11/2024, chỉ còn Snowball Edge Storage Optimized **210 TB** và Compute Optimized; từ 7/11/2025 Snowball Edge **không nhận khách hàng mới**, và AWS thông báo ngừng hỗ trợ Snowball ở các region thương mại vào 31/12/2026. AWS hướng khách mới sang **DataSync** (online, kèm Direct Connect nếu thiếu băng thông) hoặc **AWS Data Transfer Terminal** (mang ổ cứng tới một điểm của AWS để upload).

**Chọn nhanh giữa các cách chuyển dữ liệu:**

| Tình huống | Chọn |
|------------|------|
| Chuyển online, có băng thông, cần lịch chạy + incremental + kiểm checksum | **DataSync** |
| Ứng dụng on-prem cần dùng S3 lâu dài qua NFS/SMB/iSCSI | **Storage Gateway** |
| Hàng chục TB trở lên mà tính ra mất nhiều tuần qua mạng, hoặc không có mạng | **Snowball Edge** |
| Cỡ exabyte (theo đề thi) | **Snowmobile** |
| User khắp thế giới upload vào một bucket | **S3 Transfer Acceleration** |

### 7.4 AWS Backup
- Centralize backup: RDS, EBS, EFS, DynamoDB, Aurora, FSx, Storage Gateway, S3, Redshift.
- **Backup Vault** + Vault Lock (immutable WORM).
- Cross-region + cross-account copy.

---

## 8. Tự kiểm tra

1. EBS volume gắn vào EC2 ở AZ-a. EC2 fail. Move volume sang AZ-b?
   <details><summary>Đáp án</summary>**Không trực tiếp**. Phải snapshot → restore ở AZ-b (snapshot lưu S3 region-wide).</details>

2. 50 EC2 cần shared file Linux multi-AZ. Chọn?
   <details><summary>Đáp án</summary>**EFS**. EBS Multi-Attach max 16, same AZ, cần cluster FS.</details>

3. ML training cần 1TB/s read từ S3 dataset. Storage?
   <details><summary>Đáp án</summary>**FSx for Lustre** với S3 linked — copy data từ S3, expose POSIX FS với throughput TB/s.</details>

4. Compliance giữ log 7 năm không sửa được. S3 config?
   <details><summary>Đáp án</summary>**Object Lock Compliance mode** + retention 2555 ngày + Glacier Deep Archive. Hoặc **Vault Lock** với AWS Backup.</details>

5. Object 50GB upload từ Việt Nam vào S3 us-east-1. Chậm. Fix?
   <details><summary>Đáp án</summary>**Multipart upload** (parallel) + **Transfer Acceleration**. Hoặc replicate bucket sang ap-southeast-1.</details>

6. Cần replicate 10TB object cũ sang region khác. CRR đủ không?
   <details><summary>Đáp án</summary>**Không** — CRR chỉ replicate object mới sau khi bật. Dùng **S3 Batch Replication** cho object cũ.</details>

7. Multi-tenant SaaS, mỗi tenant có prefix riêng. Cấp quyền per-tenant?
   <details><summary>Đáp án</summary>**S3 Access Points** — mỗi tenant 1 access point với policy giới hạn prefix. Tenant dùng endpoint riêng.</details>

8. EFS workload spike đột ngột rồi quiet 90% thời gian. Throughput mode?
   <details><summary>Đáp án</summary>**Elastic throughput** — pay per use, auto scale. Provisioned đắt khi idle, Bursting có thể không đủ khi spike.</details>

9. App on-prem cần read/write file S3 dùng NFS không cần code thay đổi. Service?
   <details><summary>Đáp án</summary>**Storage Gateway File Gateway** — expose NFS/SMB endpoint, sync S3 phía sau.</details>

10. Lift-shift 200TB tape archive lên AWS, không muốn thay app backup. Service?
    <details><summary>Đáp án</summary>**Tape Gateway** — VTL iSCSI, app vẫn dùng như tape library, AWS lưu S3 + Glacier.</details>

11. Cần chuyển 100 TB từ data center lên S3, đường truyền 100 Mbps, hạn 3 tuần. Online hay offline?
    <details><summary>Đáp án</summary>**Offline (Snowball Edge)**. 100 TB qua 100 Mbps mất khoảng 93 ngày ngay cả khi dùng hết đường truyền (phép tính ở §7.3), vượt xa hạn 3 tuần. Nếu đường truyền là 1 Gbps (~9 ngày) thì DataSync mới khả thi.</details>

12. Database cần ổ 500 GiB với 16.000 IOPS. Team đang định dùng io2. Có cách rẻ hơn không?
    <details><summary>Đáp án</summary>**gp3** mua thêm IOPS: ~$105/tháng so với ~$1.102/tháng của io2 (phép tính ở §3.1). Chỉ cần io2 khi phải vượt trần IOPS của gp3, cần độ trễ ổn định dưới 1 ms, hoặc cần durability 99,999%.</details>

---

## 9. Đối chiếu GCP

| AWS | GCP |
|-----|-----|
| EBS | **Persistent Disk** (zonal/regional) |
| EBS gp3/io2 | **PD Balanced / Extreme** |
| Instance Store | **Local SSD** |
| EBS Multi-Attach | **PD multi-writer** (preview) |
| EFS | **Filestore** |
| FSx Windows | **Filestore SMB** (Enterprise tier) hoặc **NetApp Volumes** |
| FSx Lustre | **Lustre on GCE** / partner |
| FSx ONTAP | **NetApp Cloud Volumes ONTAP** |
| FSx OpenZFS | (không có native) |
| S3 | **Cloud Storage** |
| S3 Glacier | **Coldline / Archive** |
| S3 Object Lock | **Bucket Lock + Retention Policy** |
| S3 Access Points | (không có direct equivalent) |
| S3 MRAP | **Multi-region bucket** built-in |
| Storage Gateway | **Cloud Storage Transfer Service + Filestore** |
| DataSync | **Transfer Service / gcloud rsync** |
| Snowball | **Transfer Appliance** |
| AWS Backup | **Backup and DR** |

**Bẫy:**
1. GCP **PD Regional** (sync replicate 2 zone) — AWS không có equivalent EBS, phải EFS hoặc app replication.
2. GCP **Cloud Storage multi-region** built-in (us, eu, asia). AWS S3 bị khoá region, phải MRAP.
3. **Object Lock Compliance mode** AWS không ai override. GCP Bucket Lock tương tự nhưng cú pháp khác.

---

## 10. Lưu ý SAA

- **EBS** 1 AZ. Multi-Attach io1/io2 cùng AZ, cluster FS.
- **IOPS** = số thao tác/giây (database), **throughput** = MiB/giây (big data, log). SSD (gp3/io2) cho IOPS, HDD (st1/sc1) cho throughput.
- **EFS** multi-AZ NFS.
- **FSx Lustre** + S3 link cho HPC/ML.
- **Multipart** > 5GB bắt buộc, > 100MB khuyên.
- **Transfer Acceleration** cho upload global.
- **S3 Select** giảm bytes scan trên CSV/JSON/Parquet.
- **Object Lock** ON khi tạo bucket, không enable sau.
- **MRAP** active-active S3 cross-region.
- **Storage Gateway** 4 loại (File/Volume Cached/Volume Stored/Tape).
- **DataSync** migrate, **Snowball** offline > 10TB.
- **AWS Backup Vault Lock** immutable.
- **FSR** snapshot warm cho fast restore.

## 11. Lưu ý đi làm

### Best practice
- **EBS encryption by default** account-level.
- **gp3** default cho mọi volume mới.
- **Snapshot lifecycle** với AWS Backup (CRR + retention).
- **EFS lifecycle** chuyển IA sau 30 ngày không access.
- **S3 BPA + disable ACL** mặc định.
- **S3 lifecycle abort multipart** mọi bucket.
- **S3 Intelligent-Tiering** cho data unknown pattern.
- **MRAP** cho global app.

### Anti-pattern
- ❌ EBS Multi-Attach với ext4/xfs → corrupt.
- ❌ EFS không lifecycle IA → cost cao.
- ❌ S3 versioning không lifecycle expire noncurrent → bucket phình lớn.
- ❌ Object Lock Compliance + retention quá dài → khóa data vĩnh viễn.
- ❌ Self-managed NFS trên EC2 → EFS/FSx.
- ❌ Snapshot không cross-region → DR fail nếu region down.

## 12. Foundations
- **CAP** liên quan storage replication. S3 strong consistency (2020+), EFS strong, EBS strong (single-attach).
- **Quorum** trong S3 — 3+ AZ multi-AZ class. Quorum là nguyên tắc "một lần ghi chỉ được báo thành công khi **đủ số bản sao tối thiểu** đã lưu xong". Các class S3 đa AZ (mọi class trừ các class One Zone) lưu mỗi object dư thừa trên ít nhất 3 AZ và chỉ trả `200 OK` khi dữ liệu đã nằm bền trên nhiều AZ. Vì thế mất trọn một AZ ngay sau khi ghi vẫn không mất object, và lần đọc ngay sau đó thấy đúng dữ liệu mới.

## 13. Flashcard

- **EBS gp3** default, rẻ hơn gp2 20%.
- **IOPS vs throughput**: throughput = IOPS × kích thước I/O. DB cần IOPS, big data cần throughput.
- **io2 Block Express** 256k IOPS, sub-ms.
- **io2 durability** 99,999% so với 99,8–99,9% của gp3 → bền hơn ~100 lần.
- **Multi-Attach** io1/io2 same AZ max 16.
- **Snapshot** incremental, S3 backed.
- **FSR** warm snapshot.
- **EFS** multi-AZ NFS thousands EC2.
- **EFS Bursting** nền 50 MiB/s mỗi TiB, hết credit thì chậm; **Elastic** cho tải spike.
- **FSx Lustre** HPC + S3 linked.
- **FSx Windows** SMB AD-integrated.
- **FSx ONTAP** NetApp feature.
- **Multipart** > 100MB recommended.
- **Transfer Acceleration** upload global.
- **S3 Select** SQL on object.
- **Object Lock** WORM, Governance/Compliance.
- **Compliance mode** nobody override.
- **Access Points** multi-tenant policy.
- **MRAP** active-active global.
- **CRR/SRR** + versioning required.
- **Batch Replication** cho object cũ.
- **Storage Gateway**: File (NFS/SMB→S3), Volume Cached/Stored (iSCSI), Tape (VTL→Glacier).
- **Volume Cached** bản chính ở S3; **Volume Stored** bản chính on-prem, backup async lên AWS.
- **DataSync** online migration.
- **Snowball** offline > 10TB.
- **AWS Backup Vault Lock** immutable.
