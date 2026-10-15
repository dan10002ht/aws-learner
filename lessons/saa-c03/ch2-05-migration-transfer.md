# SAA Ch2.5 — Data Transfer & Migration

> Mục tiêu: Chọn đúng dịch vụ **di chuyển dữ liệu & migration** cho từng tình huống — online vs offline, một lần vs liên tục, file vs database vs object. Nắm chắc các cặp exam hay bẫy: **DataSync vs Snowball vs Storage Gateway**, **DMS vs DataSync**, và ba loại **Storage Gateway**. Đây là cụm dịch vụ hay bị học thiếu nhất nhưng ra đề đều đặn (Domain 3 — data ingestion & transfer, Domain 4 — hybrid/cost).

---

## 1. Câu chuyện mở đầu — "chuyển 500TB lên cloud"

Một công ty có **500 TB** dữ liệu trên NAS on-prem cần đưa lên S3, đường truyền Internet chỉ **500 Mbps**. Bạn của bạn đề xuất "cứ `aws s3 cp` là xong". Hãy tính:

> 500 TB qua 500 Mbps (lý tưởng, không nghẽn) ≈ **~92 ngày**. Thực tế còn chậm hơn vì chia sẻ băng thông với production.

### 1.1 Cách tính thời gian chuyển — kỹ năng đề thi bắt tự làm

Con số 92 ngày không cần thuộc, vì tính được trong 30 giây. Chỗ dễ sai duy nhất là đơn vị: dung lượng đo bằng **byte** (TB), còn băng thông đo bằng **bit** mỗi giây (Mbps), và 1 byte = 8 bit.

```
Thời gian (giây) = dung lượng (bit) ÷ băng thông (bit/giây)

500 TB  = 500 × 10^12 byte × 8      = 4 × 10^15 bit
500 Mbps                            = 5 × 10^8 bit/giây

4 × 10^15 ÷ 5 × 10^8                = 8.000.000 giây
8.000.000 ÷ 86.400 giây/ngày        ≈ 92,6 ngày
```

Trong phòng thi, dùng một mốc nhẩm cho nhanh: **1 TB qua đường 100 Mbps mất khoảng 1 ngày** (chính xác là 22,2 giờ). Từ mốc đó chỉ việc nhân chia: dung lượng gấp bao nhiêu lần thì nhân bấy nhiêu, băng thông gấp bao nhiêu lần thì chia bấy nhiêu.

```
500 TB qua 500 Mbps:   500 TB ÷ (500 Mbps ÷ 100 Mbps) = 500 ÷ 5 = ~100 ngày   (tính kỹ: 92,6)
200 TB qua 1 Gbps:     200 TB ÷ (1.000 ÷ 100)         = 200 ÷ 10 = ~20 ngày   (tính kỹ: 18,5)
```

Đó là khi dùng **toàn bộ** đường truyền suốt 24 giờ. Nếu production đang dùng chung và bạn chỉ được phép lấy một nửa băng thông, thời gian gấp đôi: 500 TB thành khoảng 185 ngày.

Với khối lượng đó, **DataSync** (chuyển online, xem §3) dù tối ưu tới đâu cũng không vượt được giới hạn vật lý của đường truyền, nên vẫn mất hơn 3 tháng. **Snow Family** (chuyển offline bằng cách gửi thiết bị, xem §4) không phụ thuộc đường truyền Internet, nên tính bằng tuần thay vì tháng. Chọn sai dịch vụ là lệch cả tháng. Đây chính là dạng câu hỏi exam yêu thích: cho **dung lượng + băng thông + thời hạn**, hỏi bạn chọn gì.

---

## 2. Bản đồ quyết định

Trước khi đi vào từng dịch vụ, nắm cây quyết định dưới đây. Nó hỏi ba điều theo thứ tự: thứ cần chuyển là **database** hay **file/object**; chuyển qua mạng có **kịp hạn** không (phép tính ở §1.1); và sau khi chuyển, app on-prem có **còn dùng tiếp** dữ liệu đó không. ("On-prem", viết tắt của on-premises, là hạ tầng đặt tại trung tâm dữ liệu của chính công ty, đối lập với cloud.)

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" aria-labelledby="mt-t mt-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="mt-t">Cây quyết định chọn dịch vụ di chuyển dữ liệu</title>
<desc id="mt-d">Phân nhánh theo loại dữ liệu (database, file/object) và online hay offline</desc>
<rect x="270" y="12" width="180" height="40" rx="8" fill="currentColor" fill-opacity="0.10" stroke="currentColor"/>
<text x="360" y="37" text-anchor="middle" font-size="13" fill="currentColor">Cần di chuyển dữ liệu?</text>
<rect x="30" y="95" width="180" height="46" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="114" text-anchor="middle" font-size="12" fill="currentColor">Là DATABASE?</text>
<text x="120" y="131" text-anchor="middle" font-size="11" fill="currentColor">→ DMS (+ SCT)</text>
<rect x="270" y="95" width="180" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="114" text-anchor="middle" font-size="12" fill="currentColor">File/Object, ONLINE</text>
<text x="360" y="131" text-anchor="middle" font-size="11" fill="currentColor">→ DataSync</text>
<rect x="510" y="95" width="180" height="46" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="600" y="114" text-anchor="middle" font-size="12" fill="currentColor">Quá lớn / băng thông thấp</text>
<text x="600" y="131" text-anchor="middle" font-size="11" fill="currentColor">→ Snow Family (offline)</text>
<rect x="150" y="190" width="200" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="250" y="209" text-anchor="middle" font-size="12" fill="currentColor">Giữ app on-prem, cần cloud</text>
<text x="250" y="226" text-anchor="middle" font-size="11" fill="currentColor">→ Storage Gateway (hybrid)</text>
<rect x="390" y="190" width="200" height="46" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="490" y="209" text-anchor="middle" font-size="12" fill="currentColor">Đối tác đang dùng SFTP</text>
<text x="490" y="226" text-anchor="middle" font-size="11" fill="currentColor">→ Transfer Family</text>
<line x1="330" y1="52" x2="140" y2="93" stroke="currentColor" stroke-width="1"/>
<line x1="360" y1="52" x2="360" y2="93" stroke="currentColor" stroke-width="1"/>
<line x1="390" y1="52" x2="580" y2="93" stroke="currentColor" stroke-width="1"/>
<line x1="330" y1="52" x2="250" y2="188" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<line x1="400" y1="52" x2="490" y2="188" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<text x="360" y="270" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.85">Quy tắc: DB → DMS · file online → DataSync · quá lớn/chậm → Snow · giữ app on-prem → Storage Gateway</text>
</svg>

---

## 3. AWS DataSync — di chuyển ONLINE, tối ưu

**Nó là gì.** DataSync là dịch vụ **copy file và object giữa hai hệ thống lưu trữ qua mạng**: từ on-prem lên AWS, từ AWS về on-prem, hoặc giữa hai dịch vụ AWS với nhau. Nó thay cho việc bạn tự viết script `rsync` hay `aws s3 cp` rồi tự lo chạy song song, retry khi rớt mạng, và kiểm tra xem file tới nơi có nguyên vẹn không.

### 3.1 Ba thành phần: agent, location, task

- **Agent** là một **máy ảo (VM) do AWS cung cấp sẵn**, bạn tải về và chạy trên hypervisor on-prem (VMware ESXi, KVM, Hyper-V), đặt gần hệ thống lưu trữ nguồn. Agent mount NAS của bạn qua NFS hoặc SMB giống như một máy client bình thường, đọc file ra, rồi mở kết nối **đi ra ngoài** tới dịch vụ DataSync trên AWS. "Agent-based" nghĩa là vậy: phải có một phần mềm của AWS nằm trong mạng nội bộ thì mới đọc được NAS, vì AWS không tự với tay vào data center của bạn được.
- **Location** là một đầu của đường chuyển: nguồn hoặc đích. Ví dụ "NFS share `10.0.0.5:/export/video`" hay "bucket S3 `my-archive`".
- **Task** là một cấu hình chuyển từ location nguồn sang location đích, kèm các tuỳ chọn (lọc file nào, giới hạn băng thông, lịch chạy). Mỗi lần task chạy gọi là một **task execution**.

Khi cả nguồn lẫn đích đều là dịch vụ AWS trong cùng account (ví dụ S3 sang EFS, kể cả khác region) thì **không cần agent**: dữ liệu đi trong mạng AWS.

**Nguồn và đích hỗ trợ.** Nguồn có thể là NFS, SMB, HDFS (hệ file của Hadoop), object storage tự quản, hoặc storage của cloud khác. Đích phía AWS là **S3, EFS, FSx** (Windows File Server, Lustre, NetApp ONTAP, OpenZFS). DataSync chuyển được **cross-region** và **cross-account**.

### 3.2 Một lần chạy gồm ba pha — và "incremental" thực chất là gì

Mỗi task execution đi qua ba pha:

1. **Prepare (chuẩn bị).** DataSync **quét cả nguồn lẫn đích**, so sánh nội dung và metadata (kích thước, thời điểm sửa…) của từng file để tìm ra chỗ khác nhau.
2. **Transfer (chuyển).** Chỉ copy những file khác nhau vừa tìm được, kèm metadata và quyền truy cập.
3. **Verify (kiểm tra).** Tính **checksum** (một chuỗi băm đại diện cho nội dung file) ở cả hai đầu rồi so sánh. Lệch thì báo lỗi.

Từ đó hiểu được chữ **incremental**: DataSync không có "nhật ký thay đổi" nào cả. Nó phát hiện file mới hoặc file bị sửa bằng cách **quét lại và so sánh ở mỗi lần chạy**. Hai hệ quả thực tế:

- Lần chạy thứ hai trở đi chỉ tốn băng thông cho phần thay đổi. NAS 50 TB mà mỗi đêm chỉ thêm 2 TB thì mỗi đêm chỉ chuyển 2 TB.
- Pha prepare vẫn phải duyệt qua **toàn bộ** cây thư mục, nên thời gian chuẩn bị phụ thuộc vào **số lượng file**, không phụ thuộc lượng dữ liệu đổi. Một share chứa hàng chục triệu file nhỏ sẽ quét lâu dù chỉ đổi vài file.

Task chạy **một lần** (migration) hoặc **theo lịch** (scheduled). Lưu ý "theo lịch" nghĩa là copy định kỳ từng đợt, không phải đồng bộ tức thời từng lần ghi.

### 3.3 Nhanh hơn script ở chỗ nào, và không nhanh hơn ở chỗ nào

Một lệnh `cp` hay `rsync` thông thường copy tuần tự từng file trên một luồng. DataSync dùng giao thức truyền riêng, mở nhiều luồng **song song**, và **nén dữ liệu trên đường truyền**. Tài liệu AWS nêu con số cụ thể: **một task có thể dùng hết một đường truyền 10 Gbps**. (AWS từng quảng cáo "nhanh hơn tới 10 lần công cụ mã nguồn mở"; đề thi có thể nhắc con số này, nhưng mốc 10 Gbps mới là thứ đo được.)

Điều DataSync **không** làm được là tạo thêm băng thông. Đường 500 Mbps thì trần vẫn là 500 Mbps, và 500 TB vẫn mất hơn 92 ngày như §1.1 đã tính. Ngược lại, vì DataSync đủ sức ăn hết đường truyền, nó có sẵn tính năng **giới hạn băng thông** (bandwidth throttle) để không bóp nghẹt production trong giờ làm việc.

Toàn bộ dữ liệu trên đường đi được **mã hoá bằng TLS**.

**Chi phí.** DataSync tính tiền theo **GB đã chuyển**, khoảng **~$0,0125/GB** ở các region US East (chế độ Basic; chế độ Enhanced mới hơn là ~$0,015/GB cộng một khoản nhỏ mỗi lần chạy).

```
Migration một lần 500 TB:   500 × 1.024 GB × $0,0125  ≈ $6.400
Đồng bộ 2 TB mỗi đêm:       2 × 1.024 GB × $0,0125    ≈ $25,6 mỗi đêm

Thời gian cho 2 TB mỗi đêm qua đường 1 Gbps:
2 × 10^12 byte × 8 ÷ 10^9 bit/giây = 16.000 giây ≈ 4,4 giờ   → vừa một cửa sổ ban đêm
```

> DataSync là lựa chọn mặc định cho **"di chuyển/đồng bộ file qua mạng"** khi băng thông đủ. Nếu câu hỏi nói *"scheduled"*, *"ongoing replication"*, *"NFS/SMB sang EFS/FSx"* → gần như chắc chắn là DataSync.

---

## 4. AWS Snow Family — di chuyển OFFLINE (gửi thiết bị)

**Nó là gì.** Khi **dữ liệu quá lớn** hoặc **băng thông quá thấp** để chuyển online kịp hạn, AWS **gửi một thiết bị lưu trữ vật lý** tới chỗ bạn. Bạn cắm nó vào mạng nội bộ, copy dữ liệu vào, rồi gửi trả; AWS nạp dữ liệu từ thiết bị lên S3. "Offline" ở đây nghĩa là dữ liệu đi bằng xe tải chứ không đi qua Internet.

### 4.1 Vì sao gửi thiết bị lại nhanh hơn đường truyền

Thiết bị nằm ngay trong data center của bạn nên việc copy diễn ra qua **mạng LAN**, vốn nhanh hơn đường Internet đi ra ngoài rất nhiều. Snowball Edge có cổng mạng 10, 25 và 100 Gbit; lấy mức khiêm tốn là 10 Gbps:

```
500 TB qua Internet 500 Mbps:   ≈ 92,6 ngày
500 TB qua LAN 10 Gbps:         500 × 10^12 × 8 ÷ 10^10 bit/giây ≈ 4,6 ngày
```

Cùng 500 TB, nhanh gấp 20 lần chỉ vì đổi từ đường WAN sang đường LAN. Phần còn lại là thời gian xe chở thiết bị về AWS.

### 4.2 Các thiết bị

| Thiết bị | Dung lượng | Điểm nhấn | Tình trạng hiện nay |
|----------|-----------|-----------|---------------------|
| **Snowcone** | ~8 TB (HDD) hoặc ~14 TB (SSD) | Nhỏ, nhẹ, chịu môi trường khắc nghiệt (edge, drone); chạy được DataSync agent ngay trên thiết bị | Ngừng cung cấp từ 12/11/2024 |
| **Snowball Edge — Storage Optimized** | **210 TB** (đời cũ: ~80 TB) | Chủ lực cho migration khối lượng lớn | Model 80 TB ngừng từ 12/11/2024; model 210 TB là bản hiện hành |
| **Snowball Edge — Compute Optimized** | 28 TB NVMe, **104 vCPU**, 416 GB RAM (đời cũ: 52 vCPU, có tuỳ chọn GPU) | Vừa chuyển vừa **chạy compute tại edge** (EC2 instance, Lambda ngay trên thiết bị) để xử lý trước khi gửi | Model 52 vCPU và model GPU ngừng từ 12/11/2024 |
| **Snowmobile** | tới ~100 PB | Xe container cho dữ liệu cỡ exabyte | Đã khai tử năm 2024, hiếm gặp trong đề |

"Edge" là nơi dữ liệu sinh ra nhưng ở xa data center và thường thiếu mạng ổn định: nhà máy, giàn khoan, tàu biển. Compute Optimized khác Storage Optimized ở **mục đích**: một bên dành ổ đĩa cho dữ liệu cần chở đi, một bên dành tài nguyên để chạy ứng dụng tại chỗ.

> **Con số đề thi và con số hiện tại.** Đề thi và hầu hết tài liệu ôn vẫn dùng bộ số cũ: Snowcone 8–14 TB, Snowball Edge **~80 TB**, Snowmobile 100 PB. Trên docs hiện tại, Storage Optimized là **210 TB**. Quan trọng hơn: từ **7/11/2025** Snowball Edge chỉ còn bán cho khách hàng hiện hữu, và AWS thông báo **ngừng hỗ trợ thiết bị Snowball tại các region thương mại vào 31/12/2026**. Khách hàng mới được AWS hướng sang **DataSync** (online), **AWS Data Transfer Terminal** (địa điểm của AWS để bạn tự mang ổ cứng tới và upload qua đường truyền tốc độ cao), hoặc **Outposts** cho compute tại edge. Đi thi thì vẫn trả lời theo logic "quá lớn / mạng yếu → Snow"; làm thật thì kiểm tra lại tình trạng dịch vụ trước khi đề xuất.

### 4.3 Tính thử: 500 TB cần mấy thiết bị, mất bao lâu

```
Số thiết bị (model 210 TB):   500 ÷ 210 = 2,4  → 3 thiết bị
Số thiết bị (model 80 TB cũ): 500 ÷ 80  = 6,25 → 7 thiết bị
```

Một job đi qua các chặng sau. Số nào lấy từ tài liệu AWS thì ghi rõ, số nào là ước lượng thì ghi "ước lượng":

| Chặng | Thời gian |
|-------|-----------|
| AWS chuẩn bị thiết bị sau khi đặt | Tài liệu AWS: **có thể tới 4 tuần**; thường nhanh hơn |
| Vận chuyển tới bạn | Mặc định giao 2 ngày |
| Copy 500 TB vào thiết bị qua LAN | ~4,6 ngày ở 10 Gbps lý tưởng; ước lượng thực tế 1–2 tuần (nhiều file nhỏ sẽ chậm hơn) |
| Vận chuyển về AWS | 2 ngày |
| AWS nạp lên S3 | Ước lượng vài ngày, AWS không công bố con số cố định |

Cộng lại, một job thực tế mất **khoảng 3 tới 7 tuần**, so với hơn 13 tuần nếu đi đường 500 Mbps. Câu "Snowball chỉ mất vài ngày ship" đúng với riêng chặng vận chuyển chứ không đúng cho cả job; đề thi thường đơn giản hoá cả quy trình thành "khoảng một tuần".

Đó cũng là gốc của **quy tắc ngón tay cái trong đề thi: nếu chuyển online mất hơn ~1 tuần thì nghiêng về Snow.** Dưới một tuần thì thời gian chờ thiết bị và vận chuyển đã ăn hết lợi thế, cứ dùng DataSync.

### 4.4 Bảo mật trên đường vận chuyển

Thiết bị rời khỏi tầm kiểm soát của bạn trong lúc nằm trên xe, nên mọi dữ liệu ghi vào đều được **mã hoá 256-bit, khoá do KMS quản lý** và khoá không nằm trên thiết bị. Vỏ máy có cơ chế chống cạy mở. Nhãn gửi hàng là màn hình **E Ink** tự đổi sang địa chỉ trả về khi job xong, tránh dán nhầm nhãn. Sau khi nạp xong, AWS xoá thiết bị theo chuẩn NIST 800-88.

> Bẫy thi: "Nhà máy ở vùng sâu, mạng yếu, cần vừa **thu thập + xử lý** dữ liệu tại chỗ rồi đưa về AWS" → **Snowball Edge Compute Optimized** (không phải DataSync — mạng yếu; không phải Storage Optimized — cần compute).

---

## 5. AWS Storage Gateway — HYBRID (giữ app on-prem, lưu ở cloud)

**Nó giải quyết bài toán gì.** DataSync và Snow **chuyển dữ liệu một chiều rồi thôi**: sau khi chuyển, bạn dùng dữ liệu ở AWS. Storage Gateway dành cho trường hợp khác: app vẫn chạy **on-prem**, vẫn đọc ghi hằng ngày, nhưng bạn muốn dữ liệu thật sự nằm ở AWS để khỏi mua thêm ổ cứng, khỏi lo backup. App thì không sửa được (phần mềm kế toán cũ, phần mềm backup mua bản quyền), nó chỉ biết nói các giao thức lưu trữ truyền thống.

**Về mặt vật lý, gateway là gì.** Nó là một **máy ảo chạy phần mềm của AWS**, bạn cài trên hypervisor on-prem (VMware ESXi, Hyper-V, KVM); cũng có bản thiết bị phần cứng (hardware appliance) cho nơi không có hạ tầng ảo hoá. Máy này đứng giữa và làm phiên dịch:

- Mặt quay vào trong, nó **giả làm một thiết bị lưu trữ quen thuộc**: một file server, một ổ cứng, hoặc một tủ băng từ.
- Mặt quay ra ngoài, nó đẩy dữ liệu lên **S3** qua HTTPS.
- Ở giữa, nó giữ một **cache trên đĩa cục bộ** chứa dữ liệu vừa dùng gần đây, để các lần đọc lại nhanh như đọc trong LAN thay vì phải tải từ S3 về.

Ba loại gateway khác nhau ở chỗ nó **giả làm thiết bị gì**.

### 5.1 File Gateway — giả làm file server

App thấy một **file share** bình thường và truy cập qua **NFS** (giao thức chia sẻ file của Linux/Unix) hoặc **SMB** (giao thức chia sẻ file của Windows). Phía sau, mỗi file được lưu thành **một object trên S3** theo quan hệ một-một: file `\\gateway\ketoan\2026\thang10.xlsx` trở thành object `ketoan/2026/thang10.xlsx` trong bucket.

Vì dữ liệu nằm trên S3 dưới dạng object thật, bạn dùng được mọi tính năng của S3 lên nó: **versioning** để lấy lại bản cũ, **lifecycle** để tự chuyển file lâu không đụng tới sang Glacier, và các dịch vụ khác (Athena, Lambda) đọc thẳng được những file đó. Đây là điểm File Gateway hơn hẳn hai loại còn lại, nơi dữ liệu trên S3 là định dạng nội bộ không đọc trực tiếp được.

### 5.2 Volume Gateway — giả làm ổ cứng

App server thấy một **ổ đĩa** (block device) qua giao thức **iSCSI**. iSCSI là cách gửi lệnh đọc/ghi đĩa qua mạng TCP/IP, khiến một ổ nằm ở máy khác hiện ra như ổ gắn trong máy; hệ điều hành format và dùng nó như ổ thường. Khác với File Gateway, ở đây gateway **không biết gì về file**, nó chỉ thấy các khối dữ liệu (block).

Có hai chế độ, khác nhau ở chỗ **bản chính của dữ liệu nằm đâu**:

| | **Cached volume** | **Stored volume** |
|--|-------------------|-------------------|
| Bản chính nằm ở | **S3** | **Đĩa on-prem** |
| On-prem giữ gì | Chỉ cache phần dữ liệu hay dùng | Toàn bộ dữ liệu |
| Lên AWS bằng cách | Mọi lần ghi đều đẩy lên S3 | Sao lưu **bất đồng bộ** lên S3 dưới dạng snapshot |
| Đọc dữ liệu ít dùng | Phải tải từ S3 về, chậm hơn | Luôn nhanh như đĩa cục bộ |
| Giới hạn | 32 TB mỗi volume, 1 PB mỗi gateway (tức 32 volume) | 16 TB mỗi volume, 512 TB mỗi gateway |
| Chọn khi | Muốn **giảm đĩa on-prem**: có 100 TB dữ liệu nhưng chỉ cần mua vài TB đĩa làm cache | Cần **độ trễ thấp cho toàn bộ dữ liệu**, cloud chỉ là nơi backup/DR |

Trong cả hai chế độ, bạn chụp được bản sao tại một thời điểm của volume dưới dạng **EBS snapshot**. Từ snapshot đó có thể tạo ra một EBS volume và gắn vào EC2, nghĩa là khi data center gặp sự cố, bạn dựng lại được server trên AWS với đúng dữ liệu đó.

### 5.3 Tape Gateway — giả làm tủ băng từ

Nhiều doanh nghiệp vẫn backup ra **băng từ** (tape): phần mềm backup (Veeam, NetBackup…) ghi vào các cuộn băng nằm trong một tủ robot gọi là tape library, rồi băng cũ được chở đi cất ở kho ngoài. Tape Gateway giả làm tủ đó, gọi là **VTL (Virtual Tape Library, thư viện băng từ ảo)**, cũng qua iSCSI. Phần mềm backup vẫn tưởng mình đang "ghi tape" và "đẩy băng ra khỏi tủ", **không phải đổi quy trình hay cấu hình lại job**.

Thực tế mỗi cuộn băng ảo (từ 100 GiB tới 15 TiB, tối đa 1.500 cuộn trong một VTL) được lưu trên **S3**. Khi phần mềm backup "đẩy băng ra khỏi tủ", băng đó được chuyển sang **S3 Glacier** hoặc **Glacier Deep Archive**, tương đương việc chở băng đi cất kho nhưng không còn xe tải và không còn băng hỏng vì ẩm mốc.

### 5.4 Đặt ba loại cạnh nhau

| Loại | Giao thức on-prem | Lưu ở đâu | Use case |
|------|-------------------|-----------|----------|
| **File Gateway** | NFS / SMB | S3 (file = object) | App NFS/SMB nhưng backend là S3; tận dụng lifecycle/Glacier |
| **Volume Gateway** | iSCSI (block) | S3, backup dạng EBS snapshot | **Cached**: dữ liệu chính ở S3, cache nóng on-prem · **Stored**: dữ liệu chính on-prem, async backup lên S3 |
| **Tape Gateway (VTL)** | iSCSI VTL | S3 / Glacier | **Thay thư viện băng từ vật lý**; backup software cũ vẫn "ghi tape" |

> Bẫy thi: "Muốn **bỏ tủ băng từ (tape library)** nhưng giữ nguyên phần mềm backup" → **Tape Gateway**. "App on-prem cần truy cập file qua **SMB** với backend S3" → **File Gateway**. "Hết chỗ đĩa on-prem, muốn dữ liệu chính lên cloud nhưng vẫn truy cập nhanh phần hay dùng" → **Volume Gateway Cached**. "Cần toàn bộ dữ liệu ở on-prem với độ trễ thấp, chỉ backup lên AWS" → **Volume Gateway Stored**.

---

## 6. AWS DMS (+ SCT) — migration DATABASE

**Nó giải quyết bài toán gì.** Cách chuyển database quen thuộc là dump rồi restore: dừng app, xuất toàn bộ dữ liệu ra file, nạp vào database mới, bật app lại. Suốt thời gian đó hệ thống ngừng phục vụ. Với database 2 TB, giả sử dump và restore đạt 100 MB/giây:

```
2 × 10^12 byte ÷ 10^8 byte/giây = 20.000 giây ≈ 5,6 giờ downtime (chưa kể tạo lại index)
```

**DMS (Database Migration Service)** cho phép **database nguồn vẫn chạy và nhận ghi** trong lúc dữ liệu được copy sang đích. Downtime co lại còn đúng khoảng thời gian đổi kết nối của app.

### 6.1 Các thành phần

- **Replication instance** là một máy chủ do AWS quản lý (bản chất là một EC2 chạy phần mềm DMS) nằm trong VPC của bạn. Nó là bên làm việc: kết nối tới nguồn, đọc dữ liệu, chuyển đổi kiểu dữ liệu, ghi vào đích. Dữ liệu **đi qua** máy này chứ không đi thẳng từ nguồn sang đích, nên máy yếu thì migration chậm. (Có thêm bản **DMS Serverless** tự chọn dung lượng thay bạn.)
- **Endpoint** là thông tin kết nối tới một database. Mỗi migration có một source endpoint và một target endpoint. DMS hỗ trợ nguồn/đích rộng: RDS, Aurora, S3, DynamoDB, Redshift, database on-prem… với điều kiện **ít nhất một đầu phải nằm trên AWS**; DMS không dùng để chuyển on-prem sang on-prem.
- **Task** là một công việc migration: chuyển những bảng nào, theo kiểu nào (chỉ full load, full load + CDC, hoặc chỉ CDC).

### 6.2 CDC — bắt thay đổi từ đâu

**CDC (Change Data Capture)** là kỹ thuật ghi nhận liên tục mọi thay đổi (insert, update, delete) trên database nguồn. DMS **không** bắt thay đổi bằng cách query lại các bảng. Nó đọc **transaction log** của database, tức cuốn nhật ký mà chính database engine ghi lại mọi thay đổi để phục hồi khi sập:

| Engine nguồn | DMS đọc từ |
|--------------|-----------|
| Oracle | Redo log |
| MySQL | Binary log (binlog), phải bật chế độ row-based |
| PostgreSQL | WAL, qua logical replication slot |
| SQL Server | Transaction log |

Đọc log có hai lợi ích: gần như không tạo thêm tải query lên database nguồn, và không sót thay đổi nào vì log ghi lại tất cả theo đúng thứ tự. Đổi lại, bạn phải cấu hình nguồn để log đủ chi tiết và được giữ đủ lâu cho DMS kịp đọc.

### 6.3 Trình tự một cuộc migration

1. **Full load.** DMS copy toàn bộ dữ liệu hiện có, từng bảng một. App vẫn ghi vào nguồn bình thường. Những thay đổi phát sinh trong lúc này được DMS **đệm lại trên replication instance** (gọi là cached changes).
2. **Áp cached changes.** Bảng nào load xong thì DMS áp ngay các thay đổi đã đệm cho bảng đó.
3. **Ongoing replication (CDC).** Từ đây DMS liên tục đọc log và áp thay đổi mới sang đích. Lúc đầu đích còn chậm hơn nguồn một khoảng (replication lag) vì phải xử lý phần tồn đọng; sau đó độ trễ giảm dần về mức ổn định.
4. **Cutover (chuyển hẳn).** Chọn một thời điểm vắng: dừng app, chờ độ trễ về 0, trỏ app sang database mới, bật app lại.

**"Downtime tối thiểu" là bao lâu?** Chỉ còn bước 4. AWS không cam kết con số, nhưng về bản chất đó là thời gian dừng app + chờ vài thay đổi cuối cùng được áp + đổi connection string, thường tính bằng **phút**, so với 5,6 giờ ở ví dụ dump/restore phía trên. Bước 1–3 có thể kéo dài nhiều ngày mà người dùng không hề biết.

Lưu ý: CDC của DMS **không phải real-time**. AWS nói rõ là không có SLA về độ trễ, và độ trễ có thể lên tới vài phút hoặc hơn khi nguồn ghi nhiều. Vì vậy mới cần bước "chờ độ trễ về 0" trước khi cutover.

### 6.4 Homogeneous vs heterogeneous — vì sao cần SCT

DMS chuyển **dữ liệu**, không chuyển **logic**. Ở đích nó chỉ tạo những thứ tối thiểu cần để nạp dữ liệu: bảng, primary key, đôi khi unique index. Nó **không** tạo secondary index, view, stored procedure, trigger, function.

- **Homogeneous** (cùng engine, vd Oracle→Oracle, MySQL→Aurora MySQL): hai bên dùng chung cú pháp nên schema và code chuyển sang được bằng công cụ gốc của engine. DMS chạy trực tiếp, lo phần dữ liệu.
- **Heterogeneous** (khác engine, vd **Oracle→Aurora PostgreSQL**): kiểu dữ liệu khác nhau (`NUMBER` của Oracle so với `numeric` của PostgreSQL), ngôn ngữ stored procedure khác nhau (PL/SQL so với PL/pgSQL). Phải có một bước **dịch schema và code** trước. Đó là việc của **SCT (Schema Conversion Tool)**: nó đọc schema nguồn, sinh ra schema tương đương cho engine đích, và đánh dấu những chỗ không tự dịch được để bạn sửa tay. Sau đó DMS mới chuyển dữ liệu vào schema đã dịch.

SCT là một ứng dụng desktop tải về máy. Hiện DMS còn có **DMS Schema Conversion**, cùng chức năng nhưng chạy ngay trong console. Đề thi dùng chữ "SCT".

> Từ khoá nhận diện: *"migrate database with minimal downtime"*, *"ongoing replication"* → **DMS**. Nếu **đổi engine** (Oracle→Aurora) → **DMS + SCT**. Đừng nhầm với DataSync (file, không hiểu schema DB).

---

## 7. AWS Transfer Family — cổng SFTP/FTPS/FTP/AS2 quản lý

**Nó giải quyết bài toán gì.** Nhiều đối tác (ngân hàng, hãng vận chuyển, nhà cung cấp) trao đổi dữ liệu với bạn bằng cách upload file lên một server **SFTP** (truyền file qua SSH), **FTPS** (FTP có mã hoá TLS), **FTP** thuần, hoặc **AS2** (giao thức trao đổi chứng từ giữa doanh nghiệp, phổ biến trong bán lẻ và logistics). Quy trình phía họ đã cố định, bạn không bắt họ đổi sang gọi S3 API được.

Transfer Family là một **endpoint do AWS vận hành** nói đúng các giao thức đó. Đối tác vẫn kết nối bằng client SFTP cũ với tài khoản cũ, nhưng file họ upload **đáp thẳng vào S3 hoặc EFS**. Bạn không phải nuôi server FTP tự quản: không vá hệ điều hành, không lo scale, không lo ổ đĩa đầy.

> Bẫy thi: "Nhiều đối tác **đang dùng SFTP** upload file, muốn lưu vào S3 mà không đổi quy trình của họ" → **Transfer Family** (không phải Storage Gateway, không phải DataSync).

Transfer Family khác File Gateway ở chỗ ai là người kết nối: File Gateway phục vụ **app trong mạng nội bộ** của bạn qua NFS/SMB, còn Transfer Family phục vụ **bên ngoài** kết nối vào qua Internet bằng SFTP/FTPS.

---

## 8. AWS Application Migration Service (MGN) — rehost server

**Nó là gì.** MGN chuyển **nguyên một máy chủ** (hệ điều hành, ứng dụng, cấu hình, dữ liệu trên đĩa) từ máy vật lý, VM hoặc cloud khác lên thành một **EC2 instance**, không sửa gì bên trong. Chiến lược này gọi là **rehost** hay **lift-and-shift**: nhấc lên và đặt xuống, chưa tối ưu gì cho cloud. MGN thay cho hai công cụ cũ là CloudEndure Migration và SMS (Server Migration Service). (Docs hiện gọi dịch vụ là *AWS Transform MGN*; đề thi dùng tên *Application Migration Service*.)

**Cơ chế, theo thứ tự:**

1. **Cài AWS Replication Agent lên từng máy nguồn.** Agent là một phần mềm nhỏ chạy trong hệ điều hành của máy đó.
2. **Initial sync.** Agent đọc toàn bộ ổ đĩa ở mức **block** (từng khối dữ liệu thô, không quan tâm bên trong là file gì) và gửi về AWS. Vì copy ở mức block nên mọi thứ trên đĩa đi theo nguyên trạng, kể cả bootloader và registry.
3. **Dữ liệu đáp vào staging area.** Đây là một subnet trong VPC của bạn, nơi MGN dựng các **replication server** (EC2 nhỏ) nhận dữ liệu và ghi vào **EBS volume**. Đây chưa phải server chạy thật, chỉ là nơi giữ bản sao của ổ đĩa.
4. **Continuous replication.** Sau lần sync đầu, agent tiếp tục gửi mọi block thay đổi gần như ngay lập tức. Máy nguồn vẫn phục vụ bình thường, bản sao trên AWS luôn bám sát.
5. **Launch test instance.** Bạn bấm launch, MGN dựng một EC2 từ bản sao đó (tự chuyển đổi driver và cấu hình boot cho hợp với EC2) để kiểm tra app có chạy không. Test bao nhiêu lần cũng được, **máy nguồn không bị ảnh hưởng**.
6. **Cutover.** Khi test ổn: dừng app ở nguồn, chờ các block cuối cùng sync xong, launch cutover instance, trỏ DNS sang EC2 mới. AWS mô tả cửa sổ cutover điển hình tính bằng **phút**.

So với DMS: cùng ý tưởng "copy liên tục trong lúc nguồn vẫn chạy rồi chuyển hẳn trong vài phút", nhưng DMS hiểu **bảng và transaction** của database, còn MGN chỉ thấy **block trên đĩa** của cả một máy. Database chạy trên một VM vẫn rehost được bằng MGN (ra EC2 tự quản database), còn muốn chuyển sang RDS/Aurora thì phải dùng DMS.

Từ khoá: *"rehost VMs to EC2 with minimal changes"*, *"lift-and-shift"*, *"migrate servers with minimal downtime"*.

---

## 9. Bảng quyết định tổng

Sau khi đã hiểu từng dịch vụ chạy thế nào, bảng dưới gom lại thành dạng tra nhanh: cột trái là cách đề thi mô tả tình huống, cột phải là đáp án.

| Tình huống | Dịch vụ |
|-----------|---------|
| Đồng bộ NFS/SMB → EFS/FSx/S3 qua mạng, theo lịch | **DataSync** |
| Chuyển hàng trăm TB tới PB / băng thông thấp / online mất hơn ~1 tuần | **Snow Family** |
| Thu thập + xử lý tại edge rồi gửi về | **Snowball Edge Compute Optimized** |
| App on-prem cần truy cập S3 qua NFS/SMB | **Storage Gateway — File** |
| Thay thư viện băng từ vật lý | **Storage Gateway — Tape** |
| Backup block on-prem lên cloud, cache nóng | **Storage Gateway — Volume (Cached)** |
| Migrate DB downtime tối thiểu, cùng engine | **DMS** |
| Migrate DB **đổi engine** (Oracle→Aurora) | **DMS + SCT** |
| Đối tác dùng SFTP, lưu vào S3 | **Transfer Family** |
| Rehost VM/server lên EC2 | **Application Migration Service (MGN)** |

---

## 10. Các cặp so sánh exam hay bẫy

- **DataSync vs Snowball:** đều chuyển dữ liệu một chiều. DataSync = **online** (băng thông đủ, ongoing); Snowball = **offline** (quá lớn/mạng yếu). Cùng lượng data mà "chuyển online mất >1 tuần" → Snowball.
- **DataSync vs Storage Gateway:** DataSync = **chuyển rồi thôi** (migration/replication). Storage Gateway = **truy cập lai liên tục** (app on-prem vẫn dùng đều). "One-time/scheduled transfer" → DataSync; "keep using on-prem app" → Storage Gateway.
- **DMS vs DataSync:** DMS hiểu **database & schema/CDC**; DataSync chỉ hiểu **file/object**. Migrate DB → DMS, không bao giờ DataSync.
- **Snowball Edge Storage vs Compute Optimized:** chỉ chuyển data → Storage; cần **chạy xử lý tại edge** → Compute.

---

## 11. Ví dụ chọn dịch vụ

**11.1** *200 TB video archive, đường truyền 1 Gbps, cần lên S3 Glacier trong 2 tuần.* → Tính theo §1.1:

```
200 × 10^12 byte × 8 ÷ 10^9 bit/giây = 1.600.000 giây ≈ 18,5 ngày   (dùng trọn 1 Gbps suốt 24 giờ)
```

18,5 ngày đã vượt hạn 14 ngày ngay cả trong điều kiện lý tưởng, nên chuyển online bị loại → **Snowball Edge Storage Optimized** (một thiết bị 210 TB là đủ; với model 80 TB trong đề thi thì cần 3). Sau đó dùng lifecycle chuyển sang Glacier.

**11.2** *Mỗi đêm đồng bộ 2 TB file mới từ NAS (NFS) on-prem sang EFS cho phân tích.* → Ongoing, scheduled, file qua mạng → **DataSync** (incremental). 2 TB qua đường 1 Gbps mất khoảng 4,4 giờ, vừa một cửa sổ ban đêm (phép tính ở §3.3).

**11.3** *Di chuyển Oracle 11g on-prem sang Aurora PostgreSQL, downtime tối thiểu.* → Đổi engine + CDC → **DMS + SCT**.

**11.4** *App kế toán on-prem ghi file qua SMB, muốn backend là S3 để dùng lifecycle & versioning, app không đổi.* → **Storage Gateway — File Gateway**.

**11.5** *Trạm quan trắc ngoài khơi, mạng vệ tinh chập chờn, cần lọc/nén dữ liệu cảm biến tại chỗ rồi gửi về hàng tháng.* → **Snowball Edge Compute Optimized** (compute tại edge + offline transfer).

---

## 12. Tóm tắt
- Cụm **Migration & Transfer** map vào **Domain 3 (data ingestion/transfer)** và **Domain 4 (hybrid/cost)** — ra đề đều, hay bị học thiếu.
- **DataSync** = online file/object (scheduled, NFS/SMB→EFS/FSx/S3). **Snow Family** = offline khi quá lớn/mạng yếu (Compute Optimized cho edge compute).
- **Storage Gateway** = hybrid *truy cập liên tục*: File (S3 qua NFS/SMB), Volume (iSCSI block, cached/stored), Tape (thay băng từ).
- **DMS (+SCT)** = migration database, homogeneous vs heterogeneous, CDC downtime tối thiểu. **Transfer Family** = SFTP/FTPS→S3/EFS. **MGN** = rehost server lên EC2.
- Thuộc **bảng quyết định (§9)** và **cặp so sánh (§10)** là đủ trả lời hầu hết câu hỏi cụm này.

> Nhớ 4 câu quyết định: **DB? → DMS · file online? → DataSync · quá lớn/offline? → Snow · giữ app on-prem? → Storage Gateway.**
