# Case study: Object Storage kiểu S3

> Bài này dễ bị coi nhẹ vì API của nó chỉ có bốn động từ: `PUT`, `GET`, `DELETE`, `LIST`. Không join, không transaction, không index, không schema. Nhưng đúng cái sự nghèo nàn đó mới là điểm bắt đầu: **object storage đắt giá không phải vì nó làm được nhiều, mà vì nó từ chối làm gần hết mọi thứ**. Nó bỏ khả năng sửa tại chỗ (in-place update), bỏ cây thư mục thật, bỏ khoá POSIX, bỏ quyền theo inode — và đổi lại được một thứ mà file system không bao giờ có: **khả năng mở rộng gần như vô hạn với chi phí mỗi GB rẻ hơn một bậc độ lớn**.
>
> Nếu chỉ nhớ một câu: **object storage là một key-value store khổng lồ, bất biến (immutable), trong đó value nằm một nơi và key nằm một nơi khác — và toàn bộ thiết kế là hệ quả của việc tách hai nơi đó ra.**

---

## 1. Ba loại storage — và vì sao "phẳng + bất biến" mở khoá được scale

**Block storage** là lớp thấp nhất, ra đời từ thập niên 1960 và về bản chất chưa đổi: một thiết bị phơi ra một dãy khối (block) đánh số từ 0 tới N, mỗi khối 512 B hoặc 4 KB. Nó không biết "file" là gì. HDD, SSD, một volume EBS, một LUN iSCSI — tất cả đều là block device. Ai đó ở trên (hệ điều hành) phải format nó thành ext4/XFS/NTFS, hoặc dùng thẳng khối thô như cách các database engine vẫn làm. Đặc trưng: **độ trễ thấp nhất, cho phép ghi đè bất kỳ khối nào tại chỗ, nhưng gắn với đúng một máy tại một thời điểm**.

**File storage** dựng trên block storage và thêm vào đó một trừu tượng hoá: cây thư mục, tên file, quyền POSIX, con trỏ đọc/ghi, khoá (locking). Nó cho phép nhiều máy cùng gắn (NFS, SMB) và cùng nhìn thấy một cây. Cái giá là **metadata trở thành một cấu trúc cây có ràng buộc chặt**: đổi tên một thư mục phải là thao tác nguyên tử với mọi thứ bên dưới, `stat` một file phải đi ngược lên kiểm tra quyền từng cấp, và inode là tài nguyên hữu hạn.

**Object storage** vứt bỏ cái cây đó. Mỗi object là một cặp (khoá, byte) nằm phẳng trong một bucket, truy cập qua HTTP, **không sửa được tại chỗ** — muốn đổi nội dung thì ghi đè cả object (hoặc tạo version mới).

| | Block storage | File storage | Object storage |
|---|---|---|---|
| **Đơn vị** | Khối 512 B / 4 KB đánh số | File trong cây thư mục | Object trong bucket phẳng |
| **Sửa tại chỗ** | Có, ghi đè bất kỳ offset | Có, `seek` + `write` | **Không** — chỉ thay cả object (có versioning) |
| **Không gian tên** | Không có | Cây phân cấp, có ràng buộc | **Phẳng**, khoá là chuỗi tuỳ ý |
| **Giao thức** | SAS / iSCSI / NVMe-oF / FC | NFS, SMB/CIFS, POSIX | REST qua HTTP(S) |
| **Độ trễ** | Thấp nhất (µs–ms) | Thấp–trung bình | **Trung bình–cao** (chục ms, TTFB) |
| **Thông lượng mỗi client** | Giới hạn bởi một volume | Giới hạn bởi NAS head | **Gần như không giới hạn** (song song ngang) |
| **Nhất quán** | Strong | Strong (POSIX) | Strong read-after-write (ngày nay) |
| **Khả năng mở rộng** | Trung bình (TB tới vài chục TB/volume) | Cao (PB) | **Rất cao** (EB) |
| **Chi phí/GB** | Cao | Trung bình–cao | **Thấp nhất** |
| **Hợp với** | Máy ảo, database, filesystem | Chia sẻ file, home directory, lift-and-shift | Blob, backup, media, data lake, log, artifact |

Bảng trên là thứ ai cũng thuộc. Phần ít ai nói ra — và là phần đáng nói — là **vì sao hai đặc tính "phẳng" và "bất biến" lại chính là thứ mở khoá được khả năng mở rộng**.

**Phẳng giết chết mọi thao tác xuyên-đối-tượng.** Trong file system, đổi tên `/a` thành `/b` phải thay đổi ngữ nghĩa của hàng tỉ đường dẫn con — đó là một giao dịch có thể chạm toàn bộ cây. Muốn `stat` một file phải duyệt quyền từ gốc xuống. Những thao tác này ép metadata phải nằm cùng nhau, tức ép nó phải nằm trên một máy hoặc một cụm có phối hợp chặt. Object store nói: **không có cây, nên không có thao tác nào chạm nhiều hơn một khoá**. Một khi mọi thao tác chỉ chạm một khoá, bạn có thể băm khoá đó ra 10.000 shard và mỗi shard không cần biết các shard khác tồn tại. Đây chính là lý do S3 đi tới exabyte còn NFS thì không.

**Bất biến giết chết bài toán đồng thời (concurrency).** Nếu object không bao giờ bị sửa tại chỗ, thì bản sao của nó ở AZ khác không bao giờ "cũ theo kiểu sai" — nó hoặc là chính nó, hoặc chưa tồn tại. Không cần khoá phân tán, không cần giao thức ghi có phối hợp, không cần lo hai writer cùng sửa một byte. Cache có thể giữ vô thời hạn nếu khoá gắn với nội dung. Retry trở nên idempotent tự nhiên: `PUT` lại cùng byte thì kết quả không đổi. Và quan trọng nhất — **bất biến biến "ghi" thành "append", mà append là thao tác rẻ nhất trên đĩa quay**.

> 💡 **Nguyên tắc**: khả năng mở rộng hiếm khi đến từ việc thêm máy. Nó đến từ việc **bỏ bớt lời hứa** cho tới khi không còn thao tác nào cần phối hợp giữa các máy. Object store là ví dụ sạch nhất của nguyên tắc này: nó bỏ cây, bỏ in-place update, bỏ khoá POSIX — và nhận lại exabyte.

---

## 2. Làm rõ yêu cầu

### 2.1 Functional

| # | Yêu cầu | Ghi chú phạm vi |
|---|---|---|
| 1 | **Tạo / xoá bucket** | Tên bucket là **duy nhất toàn cục** — giống tên miền. Số bucket mỗi tài khoản có giới hạn (vài nghìn) |
| 2 | **Upload / download object** | Kích thước từ vài KB tới vài TB. Phải hiệu quả cho cả object nhỏ lẫn rất lớn |
| 3 | **Xoá object** | Xoá là thao tác logic trước, thu hồi dung lượng là việc nền |
| 4 | **Liệt kê object trong bucket theo prefix** | Có phân trang. Đây là chỗ khó nhất — §9 |
| 5 | **Versioning** | Giữ nhiều phiên bản của cùng một khoá; xoá tạo **delete marker** |
| 6 | **Multipart upload** | Cắt file lớn thành phần, tải song song, ghép lại |

Cố ý **ngoài phạm vi** (nói ra để chứng tỏ đã cân nhắc, không phải để né): tìm kiếm toàn văn nội dung object, truy vấn nội dung kiểu SQL (S3 Select), xử lý sự kiện/trigger, CDN edge, và mô hình quyền chi tiết — ta giả định có sẵn một dịch vụ **IAM** tách rời để trả lời câu "user này có được đọc bucket này không".

### 2.2 Non-functional — và mỗi con số dẫn tới quyết định gì

| Thuộc tính | Mục tiêu | Nó ép ta phải làm gì |
|---|---|---|
| **Dung lượng** | **100 PB** trong một region, tăng dần | Không hệ quản trị dữ liệu nào một cụm chịu nổi → phải phân mảnh cả dữ liệu lẫn metadata |
| **Durability** | **99,999999999%** (11 số 9) | Ràng buộc chi phối toàn bài. Không đạt được bằng một kỹ thuật đơn lẻ → cần nhân bản **đa vùng lỗi** + kiểm tra tính toàn vẹn định kỳ (§7, §8) |
| **Availability** | **99,99%** (≈ 52 phút/năm) | Mọi component phải có bản dự phòng; mặt phẳng điều khiển phải chịu được mất một AZ |
| **Đa region** | Nhân bản chéo region tuỳ chọn | Nhân bản **bất đồng bộ** — đồng bộ chéo region là không khả thi về độ trễ (§12) |
| **Hiệu quả lưu trữ** | Chi phí mỗi GB thấp nhất có thể ở mức durability đó | Chính là lý do erasure coding tồn tại: 1,5× thay vì 3× (§7) |
| **Mô hình truy cập** | Ghi một lần, đọc nhiều lần; ~95% thao tác là đọc | Tối ưu đọc; ghi có thể đắt hơn để đổi lấy an toàn |

### 2.3 Giả định chốt

```
- 100 PB dữ liệu người dùng trong một region
- Phân bố kích thước object:
    20% nhỏ    (< 1 MB)     — median ~0,5 MB   (thumbnail, JSON, log nhỏ)
    60% vừa    (1–64 MB)    — median ~32 MB    (ảnh, tài liệu, chunk video)
    20% lớn    (> 64 MB)    — median ~200 MB   (backup, media, dataset)
- Object BẤT BIẾN: ghi đè = tạo bản mới, không sửa tại chỗ
- Metadata mỗi object ~1 KB (khoá, kích thước, etag, content-type, tag, ACL...)
- Ổ HDD SATA 7200 rpm: ~100–150 IOPS ngẫu nhiên, ~200 MB/s tuần tự, 20 TB/ổ
- Tỉ lệ hỏng ổ mỗi năm (AFR) ~0,81%
- Một máy data node cắm 20 ổ
- Hệ số sử dụng dung lượng thực tế ~40% (phần còn lại là dư phòng, parity, khoảng trống để tái cân bằng)
```

---

## 2b. Back-of-envelope estimation

### Số lượng object

```
Dung lượng thực chứa dữ liệu = 100 PB = 10^11 MB
Kích thước trung bình có trọng số:
   0,2 × 0,5 MB  +  0,6 × 32 MB  +  0,2 × 200 MB
 = 0,1          +  19,2          +  40
 = 59,3 MB/object

Với hệ số sử dụng 40%:
   dung lượng dữ liệu hữu ích ≈ 10^11 × 0,4 = 4 × 10^10 MB
   số object ≈ 4 × 10^10 / 59,3 ≈ 6,8 × 10^8  ≈  680 TRIỆU object
```

### Metadata

```
680 triệu object × 1 KB = 680 GB  ≈ 0,68 TB metadata
```

Con số này là **cú twist đầu tiên của bài**, và đáng dừng lại. 100 PB dữ liệu chỉ sinh ra chưa tới 1 TB metadata — **tỉ lệ 1 : 150.000**. Hai khối này khác nhau tới mức không còn cùng loại bài toán:

| | Mặt phẳng dữ liệu (data plane) | Mặt phẳng metadata (metadata plane) |
|---|---|---|
| Kích thước | 100 PB | ~0,7 TB |
| Bản ghi | 680 triệu blob, mỗi cái ~59 MB | 680 triệu hàng, mỗi hàng ~1 KB |
| Thao tác | Đọc/ghi tuần tự, lớn | Tra cứu khoá, chèn, liệt kê theo prefix |
| Nghẽn ở | **Dung lượng đĩa và băng thông** | **IOPS và độ trễ truy vấn** |
| Phần cứng hợp | HDD dung lượng lớn, rẻ, dày đặc | SSD NVMe, RAM nhiều, ít máy |
| Yêu cầu nhất quán | Bất biến → dễ | Mutable, phải đúng → khó |
| Cách mở rộng | Thêm ổ, thêm data node | Sharding + replica đọc |

> 💡 **Đây là lý do gốc của quyết định kiến trúc lớn nhất cả bài: tách data plane và metadata plane thành hai hệ độc lập.** Không phải vì "tách ra cho sạch", mà vì hai khối này có **hình dạng tải, loại phần cứng, mô hình nhất quán và đường cong mở rộng hoàn toàn khác nhau**. Nhét chung vào một hệ thì bạn buộc phải chọn một điểm thoả hiệp tệ cho cả hai: hoặc trả tiền SSD cho 100 PB, hoặc chịu độ trễ HDD cho mọi lần tra khoá.

### IOPS và thông lượng

```
Giả sử 1% object được truy cập mỗi ngày (mô hình "ghi một lần, đọc nhiều lần" nhưng đuôi dài lạnh):
   680M × 1% = 6,8 triệu request đọc/ngày ÷ 86.400 ≈ 79 rps trung bình
   → quá nhỏ để đáng lo. Nhưng đó là trung bình của một hệ NỘI BỘ.

Lấy số thực tế hơn — một object store production cỡ này phục vụ:
   đọc:  ~20.000 rps ổn định, peak ×3 = 60.000 rps
   ghi:  ~1.000 rps  ổn định, peak ×3 =  3.000 rps
   → tỉ lệ đọc:ghi ≈ 20:1
```

Quy đổi ra phần cứng:

```
Số ổ cần cho 100 PB (sau khi tính dư phòng erasure coding 1,5×):
   150 PB thô ÷ 20 TB/ổ = 7.500 ổ
   ÷ 20 ổ/máy = 375 data node

IOPS khả dụng:
   7.500 ổ × 125 IOPS = 937.500 IOPS ngẫu nhiên

Băng thông tuần tự khả dụng:
   7.500 ổ × 200 MB/s = 1,5 TB/s  (lý thuyết; thực tế nghẽn ở mạng trước)
```

### Băng thông mạng

```
Peak đọc: 60.000 rps × 59 MB trung bình = 3,5 TB/s   ← KHÔNG thực tế
```

Con số này vô lý, và chính sự vô lý của nó dạy ta một điều: **request lớn và request nhỏ không thể trộn vào một phép tính**. Thực tế hình dạng tải là:

```
Object nhỏ (< 1 MB):  chiếm ~85% số REQUEST, ~2% số BYTE
Object lớn (> 64 MB): chiếm ~1%  số REQUEST, ~70% số BYTE

→ Hai đường tối ưu khác nhau hoàn toàn:
   - Object nhỏ: tối ưu ĐỘ TRỄ và IOPS (cache metadata, gộp file, SSD cho index)
   - Object lớn: tối ưu THÔNG LƯỢNG (multipart, đọc song song, streaming, không bao giờ buffer cả object vào RAM)
```

---

## 3. API design

Object store nổi tiếng vì API tối giản. Ta giữ đúng tinh thần đó — REST trên HTTP, tài nguyên định danh bằng URI `/{bucket}/{key}`.

```
── Bucket ────────────────────────────────────────────────────────────
PUT    /{bucket}                       tạo bucket (tên duy nhất toàn cục)
DELETE /{bucket}                       xoá bucket (phải rỗng)
GET    /{bucket}?list-type=2&prefix=photos/2024/&delimiter=/
                 &max-keys=1000&continuation-token={tok}
                                       liệt kê object theo prefix, phân trang

── Object ────────────────────────────────────────────────────────────
PUT    /{bucket}/{key}                 upload (body = nội dung)
GET    /{bucket}/{key}                 download
GET    /{bucket}/{key}   Range: bytes=1048576-2097151
                                       đọc một khoảng byte
HEAD   /{bucket}/{key}                 chỉ lấy metadata (size, etag, content-type)
DELETE /{bucket}/{key}                 xoá (tạo delete marker nếu bật versioning)
GET    /{bucket}/{key}?versionId={v}   đọc một phiên bản cụ thể

── Multipart ─────────────────────────────────────────────────────────
POST   /{bucket}/{key}?uploads                      → { uploadId }
PUT    /{bucket}/{key}?partNumber=N&uploadId={id}   → ETag của part
POST   /{bucket}/{key}?uploadId={id}                 { parts: [{N, ETag}...] }
DELETE /{bucket}/{key}?uploadId={id}                 huỷ, giải phóng part
```

Một request upload thật trông như sau:

```
PUT /bucket-to-share/reports/2024/q4.pdf HTTP/1.1
Host: bucket-to-share.s3example.org
Date: Sun, 12 Sep 2021 17:51:00 GMT
Authorization: AWS4-HMAC-SHA256 Credential=.../s3/aws4_request, Signature=...
Content-Type: application/pdf
Content-Length: 4567
x-amz-meta-author: Alex          ← metadata do người dùng tự đặt
x-amz-storage-class: STANDARD_IA

[4567 byte nội dung]
```

**`Range` header** — đọc được một khoảng byte giữa object 10 GB mà không tải cả file. Điều này chỉ khả thi nếu data node biết **chính xác object nằm ở file nào, offset nào**, nghĩa là đã có sẵn bảng ánh xạ mà ta sẽ xây ở §6.4. Nó cũng là nền cho video streaming và cho việc đọc song song file lớn.

**`ETag`** — với upload thường, ETag là MD5 của nội dung, tức là **một checksum khách hàng kiểm chứng được**. Với multipart, ETag là "MD5 của các MD5" kèm hậu tố `-N`. Client dùng nó để phát hiện dữ liệu hỏng đường truyền, và để làm điều kiện `If-None-Match` cho cache. Một checksum lộ ra ở API không phải tiện ích — nó là **hợp đồng về tính toàn vẹn**.

---

## 4. High-level design

```
                          ┌──────────┐
      Client ───HTTPS───▶ │ Load     │
                          │ Balancer │
                          └────┬─────┘
                               │
                    ┌──────────▼───────────┐        ┌─────────┐
                    │   API Service        │◀──────▶│   IAM   │  xác thực +
                    │   (stateless, N bản) │        │ service │  phân quyền
                    └───┬──────────────┬───┘        └─────────┘
                        │              │
        ══ luồng ═══════│══════════════│════════════ luồng ═══
           METADATA     │              │               DỮ LIỆU
        ════════════════│══════════════│═══════════════════════
                        │              │
            ┌───────────▼──────┐   ┌───▼─────────────────────────────────┐
            │  Metadata Store  │   │            Data Store               │
            │  ~0,7 TB, SSD    │   │            100 PB, HDD              │
            │                  │   │                                     │
            │  bucket  (nhỏ)   │   │  ┌────────────────────────────┐     │
            │  object  (shard) │   │  │   Data Routing Service     │     │
            │  listing (denorm)│   │  │   (stateless)              │     │
            └──────────────────┘   │  └──────┬──────────────┬──────┘     │
                                   │         │              │            │
                                   │   ┌─────▼──────┐   ┌───▼────────┐   │
                                   │   │ Placement  │   │ Data Nodes │   │
                                   │   │ Service    │   │ (375 máy,  │   │
                                   │   │ 5–7 replica│   │ 7.500 ổ)   │   │
                                   │   │ Paxos/Raft │   │            │   │
                                   │   └─────┬──────┘   └───▲────────┘   │
                                   │         └──heartbeat───┘            │
                                   └─────────────────────────────────────┘
```

**API service** — **không lưu trạng thái (stateless)**, và đây là điều kiện tiên quyết để mở rộng ngang. Nó là nhạc trưởng: xác thực với IAM, tra metadata, gọi data store, ghép kết quả. Nó **không bao giờ tự lưu dữ liệu**, cũng không giữ trạng thái phiên upload trong RAM — mọi trạng thái (kể cả trạng thái multipart đang dở) đều nằm ở metadata store, nếu không thì một máy API chết giữa chừng sẽ làm hỏng upload đang chạy.

**Metadata store** — nơi ánh xạ `(bucket, key) → object_id` cùng mọi thuộc tính. Nhỏ nhưng **nóng**: mỗi request đọc hay ghi đều phải qua nó ít nhất một lần.

> 💡 **Phép loại suy đáng dùng trong phỏng vấn**: object store hoạt động y hệt **inode của UNIX**. Trong UNIX, tên file nằm trong directory entry, trỏ tới một inode; inode chứa metadata cộng danh sách con trỏ tới các block dữ liệu nằm rải rác trên đĩa. Object store dựng đúng cấu trúc đó nhưng **kéo giãn ra quy mô cụm**: metadata store đóng vai inode table, data store đóng vai vùng block, và `object_id` (một UUID) đóng vai số inode. Nói được câu này trong phỏng vấn thì bạn vừa giải thích xong toàn bộ kiến trúc trong 20 giây, và cho thấy bạn hiểu tại sao phải tách hai mặt phẳng chứ không chỉ thuộc lòng rằng phải tách.

### 4.1 Vì sao tách data plane / metadata plane là quyết định lớn nhất

Ta đã thấy hai khối lệch nhau 150.000 lần về kích thước. Nhưng lý do tách còn sâu hơn con số:

**Mở rộng độc lập.** Một khách hàng đổ vào 10 PB ảnh vệ tinh, mỗi ảnh 5 GB: data plane cần thêm 500 ổ, metadata plane gần như không đổi (chỉ thêm 2 triệu hàng). Một khách hàng khác đổ vào 10 TB gồm 10 tỉ file JSON nhỏ: data plane gần như không đổi, còn metadata plane vừa **tăng gấp mười lăm lần** và trở thành nghẽn. Nếu gộp chung, bạn phải mở rộng cả hai cho cả hai tình huống — lãng phí trong cả hai chiều.

**Phần cứng khác nhau tới mức không thể thoả hiệp.** Metadata cần SSD NVMe và RAM để cache index B-tree; data cần HDD 20 TB rẻ nhất thị trường. Giá mỗi GB lệch nhau 15–20 lần. Đặt 100 PB lên SSD là phá sản; đặt index metadata lên HDD là mỗi lần tra khoá tốn 8 ms thay vì 100 µs.

**Mô hình nhất quán khác nhau.** Object bất biến — nhân bản nó không cần phối hợp, vì hai bản sao không bao giờ mâu thuẫn. Metadata thì **mutable**: `PUT` cùng một khoá hai lần phải quyết định ai thắng, và người dùng ra quyết định dựa trên nó. Metadata cần giao dịch, còn data thì không. Trộn chung nghĩa là bắt 100 PB phải trả giá cho một cơ chế giao dịch mà chỉ 0,7 TB cần.

---

## 5. Bucket, object, và cái không gian tên phẳng giả vờ có thư mục

**Bucket** là hộp chứa logic. Tên bucket **duy nhất toàn cục** trên cả hệ thống — không chỉ trong một tài khoản. Lý do không phải kỹ thuật mà là **địa chỉ**: bucket được truy cập qua `https://tên-bucket.s3example.org/khoá`, tức tên bucket trở thành một phần của DNS. Khi đã nằm trong DNS thì buộc phải duy nhất toàn cầu, y hệt tên miền. Hệ quả: bảng `bucket` phải có ràng buộc `UNIQUE` toàn cục, nên nó **không được sharding theo cách thông thường** — phải là một bảng nhỏ, nhân bản đọc rộng rãi, ghi hiếm.

**Object** là cặp (khoá, byte) + metadata. Khoá là **chuỗi tuỳ ý, không có cấu trúc**. Đây là điểm người mới hiểu sai nhiều nhất:

```
photos/2024/summer/beach.jpg
```

Với người dùng đây trông như bốn cấp thư mục. Với hệ thống nó là **một chuỗi 28 ký tự**, không hơn. Không có thư mục `photos/`, không có thư mục `photos/2024/`. Không có inode nào cho chúng. Ký tự `/` không có ý nghĩa đặc biệt gì ngoài việc **API liệt kê đồng ý coi nó như dấu phân cách nếu bạn bảo thế**.

Ảo giác thư mục được dựng lên bằng đúng hai tham số của API `LIST`:

```
Bucket chứa:
   photos/2024/a.jpg
   photos/2024/b.jpg
   photos/2025/c.jpg
   docs/readme.md

LIST prefix="photos/" delimiter="/"
   → CommonPrefixes: ["photos/2024/", "photos/2025/"]     ← "thư mục con" giả
   → Contents:       []                                    ← không object nào nằm TRỰC TIẾP ở photos/

LIST prefix="photos/2024/" delimiter="/"
   → CommonPrefixes: []
   → Contents:       [photos/2024/a.jpg, photos/2024/b.jpg]

LIST prefix="photos/" (không delimiter)
   → Contents: cả 3 object, phẳng, không nhóm
```

`delimiter` bảo server: *"gộp mọi khoá có chung phần đầu tới lần xuất hiện đầu tiên của ký tự này, và trả về phần đầu chung đó thay vì từng khoá"*. Toàn bộ trải nghiệm "duyệt thư mục" trên console S3 chỉ là một chuỗi lời gọi `LIST` với `prefix` và `delimiter="/"`.

Sự khác biệt này không hàn lâm — nó gây hậu quả thật:

| Thao tác | File system | Object store |
|---|---|---|
| Đổi tên thư mục | O(1) — sửa một directory entry | **O(n)** — copy rồi xoá từng object |
| Di chuyển file | O(1) — unlink + link | Copy + delete, tốn băng thông bằng cả file |
| Đếm file trong thư mục | Đọc directory | **Quét toàn bộ prefix**, phân trang qua hàng triệu khoá |
| Xoá thư mục | `rm -rf`, đệ quy | Liệt kê rồi xoá từng cái (theo lô 1.000) |
| Thư mục rỗng | Tồn tại được | **Không tồn tại** — không có object thì không có gì cả |
| Kiểm tra quyền | Kế thừa từ cây | Chỉ theo policy trên bucket/prefix, không kế thừa thật |

> ⚠️ **Bẫy production kinh điển**: `aws s3 mv s3://b/folder/ s3://b/folder2/ --recursive` trên một prefix 5 triệu object. Nó **không** phải rename — nó là 5 triệu lần COPY cộng 5 triệu lần DELETE, chạy hàng giờ, tốn phí request khủng khiếp, và nếu đứt giữa chừng thì bạn có nửa ở chỗ này nửa ở chỗ kia mà không có giao dịch nào để rollback. Biết trước điều này là khác biệt giữa người đã dùng S3 và người mới đọc về nó.

---

## 6. Deep dive 1 — Data store

### 6.1 Luồng upload, từng bước một

```
 Client          API svc         IAM       Metadata      Data Routing     Placement    Data Node
   │                │             │           │               │               │            │
   │ PUT /b/k ─────▶│             │           │               │               │            │
   │                │──authz─────▶│           │               │               │            │
   │                │◀──ok────────│           │               │               │            │
   │                │                                         │               │            │
   │                │──── stream byte + content-length ──────▶│               │            │
   │                │                                         │──"cho tôi ba ─▶│           │
   │                │                                         │  node cho UUID"│           │
   │                │                                         │◀─[n17,n42,n88]─│           │
   │                │                                         │                            │
   │                │                                         │──── ghi (primary n17) ────▶│
   │                │                                         │                            │──▶ n42
   │                │                                         │                            │──▶ n88
   │                │                                         │◀─── ack sau khi đủ bản ────│
   │                │◀──────────── object_id (UUID) ──────────│                            │
   │                │                                                                      │
   │                │──ghi hàng object(bucket_id, key, object_id, size, etag,...)──▶ Metadata
   │◀── 200 OK ─────│    ETag: "9b2cf5..."
```

**1. Placement service chọn nhóm node, không chọn từng node.** Nó trả về một **replication group** được xác định **tất định (deterministic)** từ UUID bằng consistent hashing. Tất định là điểm mấu chốt: khi đọc lại, data routing service tính đúng nhóm đó mà **không cần tra bảng nào**, tiết kiệm một vòng round-trip trên mọi lượt đọc.

**2. Primary nhân bản đồng bộ sang hai secondary rồi mới ack.** Đây là một đánh đổi có chủ đích: **chậm hơn để đúng hơn**. Nếu ack ngay sau khi primary ghi xong rồi mới nhân bản nền, bạn có cửa sổ vài trăm ms mà dữ liệu chỉ tồn tại ở một bản — primary chết trong cửa sổ đó là mất dữ liệu vĩnh viễn, tức phá thẳng mục tiêu durability. Với object store, **durability luôn thắng latency**.

**3. Metadata ghi SAU CÙNG.** Thứ tự này không phải chi tiết thủ tục: thứ tự này biến lỗi tệ (khoá tồn tại nhưng không đọc được) thành lỗi chịu được (byte mồ côi chờ GC dọn).

### 6.2 Luồng download

```
 Client         API svc        Metadata       Data Routing        Data Node
   │              │               │                │                  │
   │ GET /b/k ───▶│               │                │                  │
   │              │──authz (IAM, có cache 5s)      │                  │
   │              │──tra (bucket,key)─▶│           │                  │
   │              │◀─ object_id, size, etag, class │                  │
   │              │──── GET object_id ────────────▶│                  │
   │              │                                │─hash(uuid)→nhóm  │
   │              │                                │─chọn node GẦN nhất, tải nhẹ nhất
   │              │                                │─────────────────▶│
   │              │                                │                  │─ tra object_mapping
   │              │                                │                  │─ seek file, offset
   │              │                                │                  │─ đọc, verify checksum
   │              │◀═══════ stream byte ═══════════│◀═════════════════│
   │◀═════════════│
```

Khác biệt quan trọng nhất so với upload: **đọc chỉ cần MỘT bản sao**, nên data routing service được tự do chọn bản "tốt nhất" — cùng rack, tải thấp nhất, ổ khoẻ nhất. Đây là lý do nhân bản không chỉ cho durability mà còn **nhân thông lượng đọc lên 3 lần**.

### 6.3 Dữ liệu được tổ chức trên đĩa như thế nào — và vì sao KHÔNG phải "mỗi object một file"

Cách hiển nhiên nhất: object UUID `a3f2...` → file `/data/a3f2...`. Đơn giản, dễ debug, và **hỏng ở quy mô**.

Ba lý do, theo thứ tự nghiêm trọng tăng dần — bắt đầu từ chuyện nhỏ là mỗi object 500 byte vẫn chiếm trọn một block 4 KB:

**Cạn kiệt inode.** Mỗi file tốn một inode, và số inode được ấn định lúc format — không tăng được sau đó mà không format lại. Một ổ ext4 20 TB có khoảng 1,2 tỉ inode. Nghe là dư, cho đến khi bạn nhận ra `fsck` sau một lần mất điện phải duyệt hết số inode đó và mất **hàng giờ**, trong khi ổ đó đang giữ 1/7500 dữ liệu của bạn và SLA là 52 phút downtime mỗi năm.

**Metadata filesystem trở thành nghẽn.** Đây mới là lý do giết chết phương án. Mỗi lần tạo file là: cấp inode, cập nhật bitmap, ghi directory entry, ghi journal. Với 3.000 ghi/giây, filesystem journal trở thành điểm nóng tuần tự. Tệ hơn, thư mục chứa hàng triệu entry làm mọi thao tác tra tên thoái hoá, và các công cụ vận hành (`ls`, `rsync`, backup metadata) trở nên vô dụng.

**Giải pháp: gộp nhiều object nhỏ vào một file lớn, ghi kiểu write-ahead log.**

```
/data/a   (đã đóng, 2,8 GB)   ─── chỉ đọc ────────────────────────────
/data/b   (đã đóng, 3,0 GB)   ─── chỉ đọc ────────────────────────────
/data/c   (ĐANG MỞ, 1,4 GB)   ─── chỉ APPEND vào cuối ────────────────

  ┌──────────────┬─────────────┬──────────────┬──────────────┬── ▶ append
  │ obj_7f1 2MB  │ obj_a3f 512K│ obj_92c 48MB │ obj_11e 700K │
  └──────────────┴─────────────┴──────────────┴──────────────┴──
   offset 0       2097152       2621440        52953088        ← con trỏ ghi
```

Quy tắc: luôn có đúng **một file đang mở** cho mỗi luồng ghi; object mới được **nối vào cuối**; khi file đạt ngưỡng (vài GB) thì đóng lại vĩnh viễn và mở file mới.

Vì sao cách này thắng:

- **Ghi tuần tự thuần tuý.** Append vào cuối file là mô hình truy cập tốt nhất có thể cho HDD: không seek, đầu từ đi thẳng. 200 MB/s thay vì 100–150 IOPS ngẫu nhiên. Chênh lệch cỡ **hai bậc độ lớn**.
- **Số file giảm hàng nghìn lần.** 100 PB chia cho file 3 GB = ~35 triệu file trên 7.500 ổ, tức ~4.600 file/ổ. Filesystem thở phào.
- **File đã đóng là bất biến** → nhân bản chỉ là copy byte, kiểm tra toàn vẹn chỉ là hash lại một lần, cache tầng OS hoạt động tốt.
- **Khớp hoàn hảo với tính bất biến của object.** Không bao giờ cần ghi đè giữa file, vì object không bao giờ sửa tại chỗ.

> ⚠️ **Nhược điểm phải tự nêu ra**: chỉ có một con trỏ ghi cho mỗi file, nên **mọi luồng ghi phải nối đuôi nhau** — tranh khoá (lock contention) giữa các core. Cách gỡ chuẩn: **gán file cho core** — mỗi core (hoặc mỗi worker thread) sở hữu file đang mở riêng, ghi vào đó mà không cần khoá. Đánh đổi: nhiều file mở hơn, phân mảnh hơn một chút. Đây là mẫu "phân vùng để khỏi khoá" (partition instead of lock) rất đáng nêu trong phỏng vấn vì nó cho thấy bạn nghĩ tới cả tầng CPU chứ không chỉ tầng kiến trúc.

### 6.4 Bảng `object_mapping` — cái inode của riêng ta

Khi nhiều object nằm chung một file, data node buộc phải nhớ object nào ở đâu:

| object_id | filename | start_offset | object_size | checksum |
|---|---|---|---|---|
| `7f1e...` | `/data/c` | 0 | 2.097.152 | `d41d8c...` |
| `a3f2...` | `/data/c` | 2.097.152 | 524.288 | `9b2cf5...` |
| `92c4...` | `/data/c` | 2.621.440 | 50.331.648 | `1a79a4...` |

**Đặt bảng này ở đâu?** Hai phương án, và lựa chọn nói lên khá nhiều về tư duy thiết kế:

| | Cụm database dùng chung | Database nhúng trong từng data node |
|---|---|---|
| Số hàng phải chứa | 680 triệu (toàn hệ) | ~1,8 triệu (phần của node đó) |
| Độ trễ tra cứu | 0,5–2 ms (qua mạng) | **~50 µs (đọc file cục bộ)** |
| Trên đường nóng | Thêm một round-trip cho **mọi** lượt đọc | Không có round-trip nào |
| Mở rộng | Phải mở rộng cụm theo tổng lưu lượng đọc | **Tự động** — thêm data node là thêm cả năng lực tra cứu |
| Miền lỗi | Cụm chết = **toàn hệ** không đọc được | Node chết = chỉ node đó, mà dữ liệu đã có bản sao |
| Vận hành | Thêm một hệ stateful phải chăm sóc | Chỉ là một file nằm cạnh dữ liệu |
| Rắc rối | Không | Backup/khôi phục phải đi kèm với ổ |

Chọn **nhúng**, và lý do mạnh nhất không phải độ trễ mà là **tính cục bộ (locality) của dữ liệu**: bảng ánh xạ chỉ có ý nghĩa với đúng các ổ nằm trên node đó. Đặt nó ở nơi khác là tự tạo ra một sự phụ thuộc phân tán cho một thông tin thuần tuý cục bộ — và mọi phụ thuộc phân tán đều là một cách mới để hệ thống chết.

**SQLite** là lựa chọn kinh điển: một file, không cần tiến trình riêng, giao dịch ACID đầy đủ, đọc cực nhanh. Mô hình tải ở đây là **ghi ít đọc nhiều** (mỗi object ghi một lần, đọc nhiều lần), đúng sở trường của SQLite. RocksDB cũng dùng được và ghi tốt hơn, nhưng ta không cần thế mạnh đó, mà lại mất đi khả năng truy vấn quan hệ tiện lợi khi vận hành và khi compaction cần quét theo file.

### 6.5 Luồng ghi hoàn chỉnh ở data node

```
1. Nhận byte object (UUID đã cấp)
2. Append vào file đang mở /data/c, ghi nhớ offset bắt đầu
3. fsync (hoặc dựa vào ghi có pin bảo vệ / battery-backed cache)
4. Tính checksum của object
5. INSERT vào object_mapping (object_id, '/data/c', offset, size, checksum)
6. Chỉ sau khi bước 5 commit mới trả ack
```

Thứ tự 2→5 lại là một lần nữa của cùng một nguyên tắc: **byte trước, con trỏ sau**. Chết giữa bước 2 và 5 để lại vài MB rác trong file — vô hại, GC dọn. Nếu làm ngược lại, ta có một hàng ánh xạ trỏ tới vùng dữ liệu chưa từng được ghi, và lần đọc đầu tiên sẽ trả về rác hoặc lỗi. **Rác thì dọn được; con trỏ treo thì không.** Nguyên tắc này lặp lại ở ba tầng trong bài (API↔metadata, data node↔mapping, multipart↔manifest) — nêu được sự lặp lại đó là cách rất gọn để chứng minh bạn hiểu bản chất.

---

## 7. Deep dive 2 — Durability: 11 số 9 nghĩa là gì và làm sao đạt được

### 7.1 Dịch con số ra tiếng người

99,999999999% durability nghĩa là: **lưu 10 triệu object, kỳ vọng mất một object sau 10.000 năm**. Hoặc: nếu bạn giữ 10 tỉ object, kỳ vọng mất một cái mỗi 10 năm.

Không có kỹ thuật đơn lẻ nào đạt được mức này. Nó là tích của bốn lớp phòng thủ:

```
1. Dư thừa (redundancy)      — nhân bản hoặc erasure coding
2. Cách ly miền lỗi          — trải các bản qua rack / AZ / nguồn điện khác nhau
3. Phát hiện hỏng âm thầm    — checksum + scrubbing nền
4. Sửa chữa nhanh            — khôi phục dư thừa trong vài giờ, không phải vài ngày
```

Lớp 4 là lớp bị quên nhiều nhất và lại quan trọng bậc nhất. Durability không phải hàm của "có bao nhiêu bản" mà là hàm của **"bao lâu thì bạn ở trạng thái suy giảm"**. Ba bản mà mất 3 tuần mới khôi phục thì kém an toàn hơn hai bản mà khôi phục trong 2 giờ, bởi xác suất hỏng chồng lấn tỉ lệ với độ dài cửa sổ suy giảm.

### 7.2 Nhân bản — cách đơn giản

Giữ 3 bản giống hệt, **mỗi bản ở một miền lỗi khác nhau**.

```
AFR của một ổ HDD = 0,81%  →  xác suất hỏng trong 1 năm ≈ 0,0081
Ba bản độc lập cùng hỏng trong một năm:
   0,0081³ ≈ 5,3 × 10⁻⁷   →  durability ≈ 99,99995%  ≈ 6 số 9
```

Chữ **độc lập** là toàn bộ trò chơi. Ba bản trên ba ổ cùng một máy thì không độc lập — nguồn điện chết, cả ba đi. Cùng một rack thì switch top-of-rack chết, cả ba mất liên lạc. Cùng một toà nhà thì hoả hoạn hoặc sự cố làm mát xoá sạch. Vì thế phải phân bố có chủ đích:

```
Bản 1 → AZ-a, rack 12, ổ 3
Bản 2 → AZ-b, rack 40, ổ 7      ← khác toà nhà, khác nguồn, khác mạng
Bản 3 → AZ-c, rack 77, ổ 1
```

> 💡 **Sự kiện tương quan (correlated failure) là kẻ giết người thật sự.** Phép nhân xác suất chỉ đúng khi các biến cố độc lập. Trong thực tế, ổ cùng lô sản xuất hỏng cùng thời điểm, firmware lỗi làm hỏng cả đội, một bug trong chính phần mềm của bạn ghi sai lên cả ba bản cùng lúc. Đây là lý do các nhà cung cấp lớn còn trộn nhiều nhà sản xuất ổ, nhiều lô, và triển khai phần mềm theo từng đợt qua các AZ chứ không đồng loạt. Nói được điều này là bạn vượt hẳn mức "đọc sách".

Giá phải trả: **overhead 200%** — 100 PB dữ liệu tốn 300 PB đĩa thật.

### 7.3 Erasure coding — trả ít đĩa hơn, trả nhiều CPU hơn

Ý tưởng đến từ lý thuyết mã sửa lỗi: cắt dữ liệu thành **k** mảnh, tính thêm **m** mảnh **parity**, rải cả k+m mảnh ra k+m miền lỗi. Bất kỳ **k** mảnh nào trong k+m cũng đủ để dựng lại toàn bộ dữ liệu gốc.

**Reed-Solomon**, cái tên bạn sẽ nghe nhắc đến, làm việc đó bằng đại số trên **trường hữu hạn** (Galois field, thường là GF(2⁸) — tức mỗi "số" là một byte). Trực giác dễ nhớ nhất là **nội suy đa thức**: hai điểm xác định duy nhất một đường thẳng; ba điểm xác định duy nhất một parabol. Tổng quát, **k điểm xác định duy nhất một đa thức bậc k−1**. Reed-Solomon coi k mảnh dữ liệu như hệ số của một đa thức, rồi **đánh giá đa thức đó tại k+m điểm khác nhau** — mỗi giá trị là một mảnh được lưu. Mất mảnh nào cũng được, miễn còn k mảnh: k điểm là đủ để nội suy ngược lại đa thức, và từ đó ra k hệ số, tức dữ liệu gốc.

Ví dụ nhỏ cho dễ hình dung (chỉ để nắm ý, thực tế làm trên GF(2⁸)):

```
Dữ liệu: d1=3, d2=5   (k=2)
Đa thức: f(x) = 3 + 5x

Mảnh lưu tại 4 điểm (k+m = 2+2):
   f(1) = 8      f(2) = 13      f(3) = 18      f(4) = 23

Mất f(1) và f(3)? Còn f(2)=13 và f(4)=23:
   3 + 5·2 = 13
   3 + 5·4 = 23
   → giải hệ 2 phương trình 2 ẩn → d1=3, d2=5.  Khôi phục hoàn toàn.
```

Với sơ đồ **8+4** (k=8, m=4) mà ta chọn:

```
Object 96 MB  →  8 mảnh dữ liệu × 12 MB  +  4 mảnh parity × 12 MB
              →  12 mảnh, rải ra 12 miền lỗi khác nhau
              →  chịu được MẤT BẤT KỲ 4 mảnh nào

Dung lượng thật: 12 × 12 MB = 144 MB  cho 96 MB dữ liệu  →  overhead 1,5×
So với 3 bản:    288 MB                                    →  overhead 3,0×

Tiết kiệm 144 MB trên mỗi 96 MB dữ liệu — tức GIẢM MỘT NỬA hoá đơn đĩa.
Ở quy mô 100 PB: 150 PB thay vì 300 PB. Với ổ 20 TB, đó là 7.500 ổ thay vì 15.000.
```

### 7.4 Vậy vì sao không dùng erasure coding cho mọi thứ?

Vì cái giá không nằm ở dung lượng mà nằm ở **đường đọc lúc hệ thống đang suy giảm** — và ở độ phức tạp.

| | Nhân bản 3 bản | Erasure coding 8+4 |
|---|---|---|
| Overhead dung lượng | **3,0×** | **1,5×** |
| Chịu được số mất mát | 2 | **4** |
| Durability | ~6 số 9 | **~11 số 9** |
| Đọc lúc khoẻ | **1 kết nối mạng**, độ trễ ổ đơn | **8 kết nối song song**, chờ cái chậm nhất |
| Đọc lúc hỏng | Chuyển sang bản khác, gần như không tốn thêm | **Tải 8 mảnh + giải mã Reed-Solomon**, tốn CPU, độ trễ tăng vài lần |
| CPU khi ghi | ~0 (chỉ copy byte) | Mã hoá GF(2⁸) — đáng kể, cần lệnh SIMD |
| Lưu lượng khôi phục 1 ổ 20 TB | Copy 20 TB từ một bản | **Đọc 8×20 = 160 TB** rồi giải mã |
| Đọc Range (một phần object) | Đọc thẳng đúng đoạn | Phải lấy đủ các mảnh liên quan, khuếch đại đọc |
| Độ phức tạp cài đặt | Thấp | **Cao** — dễ sai, khó kiểm thử |
| Hợp với | Object nhỏ, dữ liệu nóng, nhạy độ trễ | Object lớn, dữ liệu ấm/lạnh, tối ưu chi phí |

**Độ trễ đuôi (tail latency) xấu đi.** Đọc bằng erasure coding phải chờ **8 node chậm nhất trong 8** thay vì 1 node. Nếu p99 của một node là 50 ms, thì p99 của phép đọc 8 mảnh tệ hơn nhiều — đây là hiệu ứng "tail amplification" kinh điển. Cách giảm nhẹ: **đọc dư (hedged read)** — gửi 10 yêu cầu thay vì 8, dùng 8 cái về trước, huỷ phần còn lại.

**Object nhỏ không hợp.** Chia object 10 KB thành 8 mảnh được 8 mảnh 1,25 KB — nhỏ hơn block 4 KB, nên mỗi mảnh vẫn chiếm trọn một block. Overhead thật thành 12 × 4 KB = 48 KB cho 10 KB dữ liệu, tức **4,8×** — tệ hơn cả nhân bản. Vì thế thực tế: **object nhỏ dùng nhân bản, object lớn dùng erasure coding**, ngưỡng đâu đó quanh 1 MB.

### 7.5 Bit rot — hỏng âm thầm và cách bắt nó

Ổ chết hẳn thì dễ: heartbeat tắt, ta biết ngay, khôi phục ngay. Nguy hiểm hơn nhiều là **ổ vẫn sống và vẫn trả về dữ liệu — nhưng dữ liệu đã sai**.

```
Đọc toàn bộ 100 PB một lần = 8 × 10¹⁷ bit
   → kỳ vọng ~800 lỗi bit không phát hiện được, MỖI LẦN QUÉT TOÀN BỘ.
```

**Phòng thủ lớp một: checksum ở nhiều tầng.**

```
Mỗi object:  checksum lưu trong object_mapping  → verify mỗi lần ĐỌC
Mỗi file:    checksum của cả file /data/c        → verify khi scrub và khi nhân bản
Mỗi mảnh EC: checksum riêng cho từng mảnh        → verify TRƯỚC khi giải mã
```

Tầng cuối quan trọng đặc biệt và hay bị quên: nếu bạn gom 8 mảnh rồi giải mã mà **không** kiểm tra từng mảnh trước, một mảnh hỏng sẽ tạo ra kết quả giải mã **sai hoàn toàn nhưng trông hợp lệ** — hỏng âm thầm được khuếch đại chứ không bị chặn. Phải verify từng mảnh, loại mảnh hỏng ra, rồi mới lấy 8 mảnh lành.

**Phòng thủ lớp hai: scrubbing nền.** Không thể chờ ai đó đọc mới phát hiện hỏng — 95% object hiếm khi được đọc, có khi nhiều năm. Một tiến trình nền chạy liên tục, đọc lại toàn bộ dữ liệu theo chu kỳ và đối chiếu checksum:

```
Chu kỳ scrub mục tiêu: 14 ngày cho toàn bộ dữ liệu
   100 PB ÷ 14 ngày = 7,1 PB/ngày = 83 GB/s toàn cụm
   ÷ 7.500 ổ = 11 MB/s mỗi ổ   ← ~5% băng thông tuần tự của ổ

Chấp nhận được. Chạy với độ ưu tiên I/O thấp, nhường đường cho lưu lượng khách.
Phát hiện sai → sửa ngay từ bản sao hoặc từ parity → ghi lại vào chỗ lành,
đánh dấu vùng hỏng để không dùng lại.
```

> ⚠️ Chu kỳ scrub phải **ngắn hơn nhiều** so với thời gian kỳ vọng để đủ số bản bị hỏng chồng lên nhau. Scrub 14 ngày với 8+4 nghĩa là để mất dữ liệu, bạn cần 5 mảnh hỏng trong cùng cửa sổ 14 ngày — xác suất cực nhỏ. Scrub 6 tháng thì cửa sổ dài gấp 13 lần, và con số durability tụt đi vài bậc. **Tần suất scrub là một tham số durability chứ không phải một chi tiết vận hành.**

### 7.6 Placement service: bộ não cần phải luôn đúng

Placement service giữ **bản đồ cụm ảo (virtual cluster map)** — topology vật lý thật: có những data node nào, mỗi node có mấy ổ, ổ nào còn bao nhiêu chỗ, node nào thuộc rack nào, rack nào thuộc AZ nào.

Nó dùng bản đồ đó để trả lời đúng một câu: *"Object UUID này nên nằm ở nhóm node nào?"* — và câu trả lời phải thoả **ràng buộc phân tán miền lỗi**: các bản/mảnh không được rơi vào cùng một rack, lý tưởng là không cùng một AZ.

**Tất định.** Ánh xạ được tính bằng **consistent hashing** trên UUID, nên data routing service khi đọc có thể tự tính ra nhóm mà không cần hỏi placement service. Nếu phải hỏi, placement service nằm trên đường nóng của mọi request — vừa thành nghẽn, vừa thành điểm chết đơn lẻ. (Xem lại bài **Consistent Hashing** cho phần rebalance khi thêm/bớt node: chỉ 1/N khoá phải di chuyển.)

**Luôn sống và luôn nhất quán.** Bản đồ cụm sai lệch giữa các bản là thảm hoạ: hai bản khác nhau về việc node 42 còn sống hay không sẽ dẫn tới hai quyết định đặt chỗ mâu thuẫn, và dữ liệu có thể bị ghi vào nơi không ai đi tìm. Vì thế placement service chạy **5 hoặc 7 bản, đồng bộ bằng Paxos hoặc Raft**:

```
5 node → chịu được 2 node chết (đa số = 3)
7 node → chịu được 3 node chết (đa số = 4)

Vì sao số lẻ? Để "đa số" luôn xác định được, tránh chia đôi khi mạng phân mảnh.
Vì sao không nhiều hơn 7? Mỗi lần đồng thuận phải chờ đa số phản hồi;
   thêm node là thêm độ trễ, mà 7 đã cho mức chịu lỗi thừa đủ.
```

**Heartbeat** là đường vào của thông tin: mỗi data node chạy một daemon gửi nhịp tim định kỳ (vài giây một lần), mang theo: số ổ đang quản, dung lượng còn trống mỗi ổ, tình trạng SMART của ổ, tải hiện tại. Placement service dùng nó cho ba việc: phát hiện node chết (mất vài nhịp liên tiếp → loại khỏi bản đồ, khởi động khôi phục), cân bằng dung lượng (ưu tiên node trống hơn cho object mới), và tránh node đang ốm (SMART báo sắp hỏng → ngừng ghi vào, rút dữ liệu ra dần).

---

## 8. Deep dive 3 — Metadata store

### 8.1 Schema

```sql
bucket                                  object
─────────────────────────               ────────────────────────────────
bucket_id      UUID  PK                 object_id       UUID   PK
bucket_name    TEXT  UNIQUE(toàn cục)   bucket_id       UUID
owner_id       UUID                     object_name     TEXT   -- khoá đầy đủ
region         TEXT                     object_version  TIMEUUID
created_at     TS                       size            BIGINT
versioning     BOOL                     etag            TEXT
lifecycle      JSON                     content_type    TEXT
                                        storage_class   TEXT
                                        is_delete_marker BOOL
                                        created_at      TS
                                        UNIQUE(bucket_id, object_name, object_version)
```

| Truy vấn | Tần suất | Độ khó |
|---|---|---|
| Tra `object_id` theo `(bucket, key)` | Mọi GET/HEAD — ~60.000 rps | **Dễ** — tra khoá chính xác, băm được |
| Chèn / xoá theo `(bucket, key)` | Mọi PUT/DELETE — ~3.000 rps | **Dễ** — ghi một hàng |
| Liệt kê object trong bucket theo prefix | Ít hơn nhiều | **Rất khó** — §9 |

Bảng `bucket` nhỏ (số bucket bị giới hạn nên cỡ vài triệu hàng) và có ràng buộc duy nhất toàn cục → **giữ nguyên một cụm, nhân bản đọc rộng rãi, cache mạnh**. Bảng `object` 680 triệu hàng và tăng không giới hạn → **bắt buộc shard**.

### 8.2 Shard bảng `object` theo gì?

| Khoá shard | Ưu | Nhược |
|---|---|---|
| `bucket_id` | Liệt kê trong một bucket gọn trong **một shard** → LIST nhanh | **Hotspot chết người**: một bucket có thể chứa hàng tỉ object và nuốt toàn bộ lưu lượng. Bucket lớn không tách được |
| `object_id` (UUID) | Phân bố hoàn hảo | **Tra theo tên phải quét mọi shard** — mà tra theo tên là 95% lưu lượng. Vô dụng |
| **`hash(bucket_name, object_name)`** | Phân bố đều; tra theo `(bucket, key)` đi thẳng **một shard** — đúng đường nóng | **LIST theo prefix phải hỏi mọi shard** |

Chọn phương án ba, vì nguyên tắc chọn khoá shard luôn là: **tối ưu cho truy vấn chiếm phần lớn lưu lượng, chấp nhận truy vấn hiếm chạy chậm**. Ở đây tra khoá chính xác áp đảo, còn LIST vừa hiếm vừa được người dùng ngầm chấp nhận là chậm — nhưng "chấp nhận chậm" không có nghĩa là bỏ mặc, xem §9.

### 8.3 Cache

```
Cache ánh xạ (bucket, key) → object_id, TTL ngắn:
   680M object × 1% nóng = 6,8M mục × ~200 B = 1,4 GB   → vừa RAM thoải mái
   Hit rate thực tế ~80–90% với phân bố Zipf điển hình
```

Lưu ý tinh tế: object **bất biến** nên nội dung cache theo `object_id` có thể giữ vĩnh viễn, nhưng ánh xạ `(bucket, key) → object_id` **thì không** — nó đổi mỗi lần ghi đè. Vì thế TTL phải ngắn (vài giây) hoặc phải chủ động vô hiệu hoá khi ghi. Đây chính là mầm mống của bài toán nhất quán ở §11.

---

## 9. Deep dive 4 — Liệt kê theo prefix: chỗ khó nhất của cả bài

Trên một database duy nhất, câu này tầm thường:

```sql
SELECT object_name, size, etag FROM object
WHERE bucket_id = '123' AND object_name LIKE 'photos/2024/%'
ORDER BY object_name LIMIT 1000;
```

**Cách ngây thơ: scatter-gather.** Hỏi cả 1.000 shard, mỗi shard trả 1.000 khoá khớp prefix, gom lại, sắp xếp, cắt lấy 1.000 đầu tiên. Nó *chạy*, nhưng hỏng theo ba cách:

- **Khuếch đại đọc 1.000 lần.** Một request người dùng thành 1.000 truy vấn. Một khách hàng lướt console thong thả cũng đủ tạo tải khó chịu.
- **Độ trễ bằng shard chậm nhất.** p99 của phép gom 1.000 kết quả xấp xỉ p99,9 của một shard đơn.
- **Phân trang là ác mộng.** Trang sau phải tiếp tục từ đúng vị trí, nhưng mỗi shard đã đi tới một độ sâu khác nhau — bạn phải mang theo **1.000 con trỏ** trong continuation token, và bất kỳ thay đổi nào ở giữa cũng có thể làm mất hoặc lặp khoá.

**Cách đúng: một bảng phi chuẩn hoá (denormalized) riêng cho việc liệt kê, shard theo `bucket_id`.**

```
object_listing  (shard theo bucket_id)
──────────────────────────────────────────────────
bucket_id  │ object_name (đã sắp xếp) │ object_id │ size │ etag │ created_at
   PK trên (bucket_id, object_name)  → quét khoảng theo prefix là O(kết quả)
```

Giờ `LIST prefix=...` đi tới **đúng một shard**, quét khoảng trên index đã sắp xếp, phân trang bằng **một** con trỏ duy nhất (chính là khoá cuối cùng đã trả — "key marker"), y hệt trường hợp database đơn.

Ta vừa cố tình đánh đổi:

| | `object` (shard theo hash) | `object_listing` (shard theo bucket_id) |
|---|---|---|
| Tối ưu cho | Tra khoá chính xác — 95% lưu lượng | Quét prefix — LIST |
| Phân bố | Đều hoàn hảo | **Lệch** — bucket lớn thành shard nóng |
| Cách chịu lệch | — | Tách bucket khổng lồ ra shard riêng; chia nhỏ theo dải prefix |
| Nhất quán | Nguồn sự thật | **Cập nhật bất đồng bộ** — trễ vài trăm ms tới vài giây |

> 💡 Đây là mẫu **CQRS thu nhỏ**: cùng một dữ liệu, hai cách tổ chức, mỗi cách phục vụ một hình dạng truy vấn, đồng bộ bất đồng bộ giữa chúng. Chấp nhận ghi trùng lặp và độ trễ nhỏ để đổi lấy việc cả hai truy vấn đều nhanh. Chính vì vậy mà **LIST của S3 có thể trả về kết quả hơi cũ ngay cả khi GET đã strong consistency** — đây không phải bug, nó là hệ quả trực tiếp của việc bảng liệt kê là một chỉ mục phụ cập nhật sau.

---

## 10. Versioning, xoá, multipart, và garbage collection

### 10.1 Versioning và delete marker

Bật versioning trên bucket thì `PUT` cùng một khoá **không ghi đè** mà thêm một hàng mới với `object_version` là **TIMEUUID** (UUID nhúng timestamp, nên sắp xếp được theo thời gian). Phiên bản mới nhất là hàng có `object_version` lớn nhất.

```
bucket_id │ object_name │ object_version │ object_id │ is_delete_marker
──────────┼─────────────┼────────────────┼───────────┼──────────────────
   123    │ script.txt  │  v1 (10:00)    │  a3f2...  │ false
   123    │ script.txt  │  v2 (11:30)    │  7c11...  │ false     ← GET trả về cái này
```

Điều tinh tế nhất là **xoá**. Nếu xoá thật thì versioning vô nghĩa — mục đích của nó là chống mất dữ liệu do lỡ tay. Nên `DELETE` tạo thêm **một phiên bản mới đánh dấu là "đã xoá"** (delete marker):

```
   123    │ script.txt  │  v1 (10:00)    │  a3f2...  │ false
   123    │ script.txt  │  v2 (11:30)    │  7c11...  │ false
   123    │ script.txt  │  v3 (14:00)    │  (null)   │ TRUE      ← delete marker
```

- `GET /b/script.txt` → phiên bản mới nhất là delete marker → trả **404**, đúng như người dùng mong đợi.
- `GET /b/script.txt?versionId=v2` → vẫn đọc được bình thường. **Dữ liệu chưa hề mất.**
- Khôi phục = xoá delete marker (`DELETE ?versionId=v3`) → v2 lại thành mới nhất. Một thao tác, không cần copy byte nào.
- Dung lượng **vẫn bị tính tiền cho cả v1 và v2** — đây là nguồn gốc của vô số hoá đơn S3 gây sốc.

> ⚠️ **Bẫy vận hành hay gặp nhất với versioning**: xoá một bucket 50 TB rồi ngạc nhiên vì hoá đơn không giảm. Xoá chỉ tạo delete marker; byte vẫn nằm đó. Phải có **lifecycle rule xoá các phiên bản không phải bản mới nhất (noncurrent versions)** sau N ngày, và dọn cả **delete marker đã hết tác dụng (expired object delete marker)** — nếu không, bucket của bạn đầy những "bia mộ" trỏ vào hư không, làm chậm mọi lần LIST.

### 10.2 Multipart upload cho file lớn

Upload một file 5 TB bằng một request HTTP hỏng ở mọi phương diện: rớt mạng ở 99% là mất sạch công; không song song hoá được nên bị chặn bởi một luồng TCP duy nhất; server phải giữ trạng thái nửa chừng rất lâu; và không biết trước kích thước thì không đặt chỗ được.

```
1. POST /b/big.iso?uploads              → { uploadId: "u-88f2" }
2. Client cắt file thành các part 5–100 MB, tải SONG SONG:
      PUT /b/big.iso?partNumber=1&uploadId=u-88f2  → ETag "d41d8c..."
      PUT /b/big.iso?partNumber=2&uploadId=u-88f2  → ETag "9b2cf5..."
      ...                                (thất bại part nào retry ĐÚNG part đó)
3. POST /b/big.iso?uploadId=u-88f2
      { parts: [{1,"d41d8c"},{2,"9b2cf5"},...] }
   → server kiểm tra đủ part, đúng ETag, rồi ghép
4. → 200 OK, ETag = "<md5 của các md5>-N"
```

**"Ghép" không nên là copy.** Cách ngây thơ là đọc hết các part rồi ghi lại thành một object liền mạch — với 5 TB thì đó là 5 TB đọc cộng 5 TB ghi, mất hàng giờ. Cách đúng: các part **đã** nằm sẵn trong các file WAL ở data node; bước hoàn tất chỉ cần ghi một **bản kê (manifest)** liệt kê `(part_number → object_id, offset, size)` theo thứ tự. Lúc đọc, data routing service nối các đoạn lại khi stream. Ghép trở thành thao tác **metadata**, gần như tức thời.

**Trạng thái upload nằm ở metadata store, không ở RAM của API server.** Nếu không, một lần deploy giữa chừng sẽ giết mọi upload đang dở — mà upload 5 TB có thể kéo dài nhiều giờ.

> ⚠️ Upload dở dang mà không ai hoàn tất hay huỷ sẽ **nằm lại vĩnh viễn và vẫn bị tính tiền** — chúng vô hình với `LIST` thường, nên nhiều tổ chức trả tiền cho hàng chục TB rác suốt nhiều năm mà không biết. Bắt buộc phải có lifecycle rule huỷ multipart dở dang sau 7 ngày.

### 10.3 Garbage collection

Bất biến + append-only nghĩa là **không gì được xoá tại chỗ**. Rác tích tụ từ bốn nguồn:

| Nguồn rác | Sinh ra khi nào |
|---|---|
| Xoá lười (lazy deletion) | Object bị đánh dấu xoá; byte vẫn nằm trong file WAL |
| Ghi đè | Phiên bản cũ hết hạn theo lifecycle nhưng byte còn đó |
| Dữ liệu mồ côi | Ghi data xong, ghi metadata hỏng (§4.1); part multipart bị bỏ dở |
| Dữ liệu hỏng | Khối không qua được checksum lúc scrub |

**Cơ chế thu hồi: compaction.** Vì không thể "khoét lỗ" giữa một file WAL đã đóng, ta viết lại nó:

```
/data/b  (3 GB, trong đó 1,7 GB đã là rác)
   │
   ├─ đọc tuần tự, BỎ QUA các object đã chết
   │
   ▼
/data/d  (1,3 GB, chỉ chứa object còn sống)
   │
   ├─ cập nhật object_mapping trong MỘT GIAO DỊCH:
   │     mọi object sống giờ trỏ tới ('/data/d', offset mới)
   │
   ▼
xoá /data/b   ← chỉ sau khi giao dịch commit thành công
```

- **Giao dịch, không phải cập nhật từng hàng.** Chết giữa chừng mà mapping đã cập nhật một nửa là thảm hoạ. Commit một lần hoặc không commit gì.
- **Xoá file cũ SAU CÙNG.** Chết trước khi commit → `/data/d` thành rác, dọn ở vòng sau; không mất dữ liệu. Ngược lại thì mất vĩnh viễn.
- **Chỉ compact khi đáng.** Ngưỡng thường là "tỉ lệ rác > 30–50%". Compact một file 3 GB để thu hồi 100 MB là đốt 3 GB đọc + 2,9 GB ghi để lấy về gần như không gì — và bạn vừa cướp băng thông của khách hàng.

---

## 11. Mô hình nhất quán: từ eventual tới strong read-after-write

Từ 2006 tới 2020, S3 chỉ hứa **eventual consistency** cho việc ghi đè và xoá: `PUT` một khoá đã tồn tại rồi `GET` ngay có thể trả về **nội dung cũ**, trong vài giây. Tháng 12/2020, AWS công bố **strong read-after-write consistency** cho mọi thao tác, không tính thêm tiền, không giảm hiệu năng.

Vì sao thay đổi này khó tới mức mất 14 năm? Vì eventual consistency không phải một lựa chọn lười biếng — nó là **hệ quả kiến trúc** của ba thứ đồng thời:

**Cache phân tán không có cách vô hiệu hoá toàn cục.** Ánh xạ `(bucket, key) → object_id` được cache ở hàng nghìn máy trong nhiều AZ. Ghi đè phải làm mọi bản cache đó thấy giá trị mới **trước khi** ack cho client — nghĩa là một giao thức vô hiệu hoá đồng bộ trên đường nóng, thứ vừa đắt vừa dễ chết.

**Metadata được nhân bản và bản thân nó cũng eventual.** Nếu ghi vào bản chính rồi đọc từ bản sao chưa kịp nhận, bạn thấy dữ liệu cũ — kinh điển. Muốn strong thì phải hoặc đọc theo quorum, hoặc luôn đọc từ bản chính, hoặc theo dõi được "phiên bản mới nhất đã biết".

**Không gian tên phẳng có nghĩa là không có điểm phối hợp tự nhiên.** Trong một file system, thư mục cha là nơi để đặt khoá. Ở đây mỗi khoá độc lập, nên bạn cần một cơ chế đặt hàng (ordering) cho từng khoá mà không có cấu trúc chung nào để bám vào.

Đường thoát về mặt thiết kế, theo thứ tự chi phí tăng dần:

| Cách | Cơ chế | Chi phí |
|---|---|---|
| Đọc từ bản chính (read-your-writes) | Định tuyến GET tới đúng shard chính giữ khoá | Mất khả năng phân tải đọc sang replica |
| Quorum R + W > N | Ghi đủ W bản, đọc đủ R bản, lấy version mới nhất | Thêm độ trễ cho mọi thao tác |
| **Con trỏ metadata nguyên tử** | Mỗi khoá có một hàng "con trỏ" duy nhất, cập nhật nguyên tử trong shard của nó; ghi đè = đổi con trỏ | Rẻ khi khoá đã shard theo hash — mỗi khoá gọn trong một shard |
| Cache có đánh phiên bản | Cache lưu kèm version; đọc kèm "version tối thiểu tôi chấp nhận" | Thêm một trường, không thêm round-trip |

Cách thứ ba là chìa khoá và nó **được mở ra chính bởi lựa chọn shard ở §8.2**: vì `hash(bucket, key)` đưa mọi thao tác trên một khoá vào **đúng một shard**, ta có thể dùng giao dịch cục bộ của shard đó để đổi con trỏ một cách nguyên tử — **không cần đồng thuận phân tán**. Tính bất biến của object lo phần còn lại: byte mới đã nằm sẵn trên đĩa từ trước khi con trỏ đổi, nên khoảnh khắc con trỏ đổi là khoảnh khắc ghi có hiệu lực, và nó là nguyên tử.

> ⚠️ Lưu ý: strong consistency áp dụng cho **GET/HEAD theo khoá**. **LIST vẫn có thể trễ** vì nó phục vụ từ bảng phi chuẩn hoá cập nhật bất đồng bộ (§9). Và **nhân bản chéo region luôn là bất đồng bộ** (§12) — "strong" chỉ có nghĩa trong phạm vi một region.

---

## 12. Đa region và phân tầng lưu trữ

### 12.1 Nhân bản chéo region

Nhân bản đồng bộ giữa hai region cách nhau 100 ms là bất khả thi: mỗi `PUT` sẽ tốn ít nhất 200 ms chỉ cho đường truyền, và một region gặp sự cố sẽ kéo region kia chết theo — đúng thứ mà đa region sinh ra để tránh. Nên nhân bản chéo region luôn **bất đồng bộ**:

```
PUT tới region A  ──▶ ack cho client ngay (đã bền vững trong A)
                  └─▶ hàng đợi nhân bản ──▶ region B  (trễ vài giây tới vài phút)
```

Ba hệ quả phải nói rõ với người dùng:

- **RPO khác 0.** Mất cả region A ngay sau khi ghi → các object chưa kịp sao chép **mất thật**. Cửa sổ này thường vài giây tới vài phút, và phải giám sát nó như một chỉ số vận hành.
- **Xoá có nhân bản hay không là một lựa chọn.** Nhân bản delete marker thì B là bản sao trung thực của A — kể cả khi ai đó xoá nhầm hoặc bị tấn công. Không nhân bản thì B trở thành bản lưu dự phòng chống xoá nhầm, đổi lại hai bên lệch nhau. Mặc định của S3 là **không** nhân bản delete marker, và đó là mặc định đúng cho hầu hết trường hợp.
- **Object có thể tới không đúng thứ tự.** Ghi đè cùng một khoá hai lần liên tiếp có thể tới B theo thứ tự ngược. Phải giải quyết bằng timestamp/version chứ không bằng thứ tự đến.

### 12.2 Phân tầng theo vòng đời

Vì 95% thao tác là đọc nhưng phần lớn object hầu như **không bao giờ** được đọc sau vài tuần đầu, việc giữ tất cả trên phần cứng nhanh nhất là lãng phí lớn nhất của hệ.

| Tầng | Đối tượng | Chi phí tương đối | Thời gian lấy ra | Cách cài đặt |
|---|---|---|---|---|
| Nóng | Ghi trong 30 ngày, truy cập thường xuyên | 1,0× | mili giây | Nhân bản 3 bản, có thể có SSD đệm |
| Ấm | 30–90 ngày, thỉnh thoảng đọc | ~0,55× | mili giây | Erasure coding 8+4 trên HDD |
| Lạnh | > 90 ngày, hiếm khi đọc | ~0,15× | phút → giờ | EC với k lớn hơn (vd 12+4), ổ mật độ cao, có thể tắt bớt điện |
| Băng giá | Lưu trữ tuân thủ, > 180 ngày | ~0,036× | tới 12 giờ | Băng từ hoặc ổ tắt nguồn, chỉ bật khi cần |

> ⚠️ **Cái bẫy đắt tiền nhất của phân tầng**: **thời gian lưu tối thiểu và phí chuyển tầng**. Chuyển một object xuống tầng lạnh rồi xoá nó sau một tuần thường **đắt hơn** là cứ để yên, vì bạn vẫn bị tính đủ số ngày tối thiểu cộng phí chuyển tính theo *từng object*. Với hàng trăm triệu object nhỏ, phí per-object có thể nuốt trọn phần tiết kiệm dung lượng. Nguyên tắc: **chỉ phân tầng khi object đủ lớn và đủ già**; với object nhỏ, gộp lại trước hoặc đừng phân tầng.

---

## 13. Bottleneck và failure mode

**Cái gì nghẽn trước?** Theo thứ tự thực tế:

| Thứ tự | Nghẽn | Triệu chứng | Cách gỡ |
|---|---|---|---|
| 1 | **IOPS metadata store** | Độ trễ GET tăng dù đĩa còn trống | Cache nóng, thêm replica đọc, tách shard nóng |
| 2 | **Băng thông mạng của data node** | Thông lượng chạm trần dù CPU và đĩa rảnh | Thêm node (thêm NIC), nhân bản để phân tải đọc, cân bằng lại dữ liệu |
| 3 | **Lưu lượng khôi phục** | Mỗi lần ổ hỏng làm độ trễ khách hàng xấu đi | Giới hạn tốc độ khôi phục, dùng LRC, trải mảnh rộng hơn |
| 4 | **Dung lượng đĩa** | Chỉ đơn thuần hết chỗ | Thêm ổ — nghẽn dễ chịu nhất vì có thể dự báo trước hàng tháng |

**Component chết thì sao?**

| Chết cái gì | Hậu quả tức thì | Hệ thống phản ứng |
|---|---|---|
| Một **API service** | Không gì cả — stateless | LB rút khỏi vòng, request đi máy khác |
| Một **data node** | Vài phần nghìn object mất một bản | Heartbeat lỡ → placement service khởi động khôi phục; đọc chuyển sang bản khác, khách không thấy gì |
| Một **ổ** trong node | Như trên, phạm vi nhỏ hơn | SMART cảnh báo sớm → rút dữ liệu ra trước khi hỏng hẳn |
| **Placement service** mất đa số | **Không ghi mới được** (không chọn được chỗ đặt) | Đọc vẫn chạy bình thường vì ánh xạ tất định — đây chính là phần thưởng của việc giữ nó ngoài đường nóng |
| Một **shard metadata** | Các khoá thuộc shard đó **không truy cập được** | Failover sang replica; phạm vi ảnh hưởng giới hạn ở 1/N khoá — lý do phải có nhiều shard nhỏ thay vì ít shard to |
| Cả **metadata store** | **Toàn hệ ngừng** — có byte mà không tra được khoá | Không có cách gỡ nhanh. Vì thế nó phải là hệ được đầu tư dự phòng mạnh nhất |
| Một **AZ** | Mất ~1/3 bản sao | Vẫn phục vụ đủ; khôi phục dư thừa trong nền, có giới hạn tốc độ |
| Một **region** | Mất toàn bộ nếu không nhân bản chéo | Chuyển sang region khác, chấp nhận RPO khác 0 |

> ⚠️ **Chế độ hỏng nguy hiểm nhất không có trong bảng: cơn bão khôi phục.** Một sự kiện làm nhiều node "chết" cùng lúc (thường là lỗi mạng chứ không phải lỗi ổ) khiến hệ khởi động khôi phục hàng PB, lưu lượng khôi phục làm nghẽn mạng, mạng nghẽn làm thêm node lỡ heartbeat, và vòng lặp tự khuếch đại. Ba lớp bảo vệ bắt buộc: **giới hạn tốc độ khôi phục** (không bao giờ vượt X% băng thông cụm), **độ trễ trước khi hành động** (chờ vài phút trước khi coi là chết thật), và **cầu dao an toàn** (nếu > X% cụm có vẻ chết thì dừng tự động và gọi người — vì gần như chắc chắn lỗi nằm ở ta, không ở ổ).

> 💡 Một chế độ hỏng thứ hai ít ai nêu: **hỏng do chính phần mềm của ta**. Dư thừa bảo vệ trước ổ hỏng, **không** bảo vệ trước một bug ghi sai dữ liệu lên cả 3 bản hay cả 12 mảnh cùng lúc. Phòng thủ ở đây không phải dư thừa mà là: checksum tính ở **phía client** (end-to-end), versioning để có đường lùi, Object Lock/WORM cho dữ liệu không được phép đổi, và triển khai theo từng đợt qua các AZ để một bản build lỗi không chạm mọi bản sao trong cùng một giờ.

---

## Liên hệ sang AWS

| Thành phần thiết kế | Dịch vụ AWS | Vì sao hợp |
|---|---|---|
| Toàn bộ object store | **Amazon S3** | Chính là hệ ta vừa thiết kế: 11 số 9 durability, 99,99% availability (S3 Standard), API REST `PUT/GET/LIST`, không gian tên phẳng, object bất biến |
| Phân tầng nóng/ấm/lạnh | **S3 Storage Class**: Standard → Standard-IA → Glacier Instant/Flexible → Deep Archive | Đúng bốn tầng §12.2. ⚠️ Mỗi hạng có **thời gian lưu tối thiểu** (IA 30 ngày, Glacier 90, Deep Archive 180) và **phí truy xuất** — chuyển sớm rồi xoá sớm thì đắt hơn để yên |
| Dữ liệu tái tạo được, chấp nhận mất một AZ | **S3 One Zone-IA** | Rẻ hơn ~20% vì chỉ giữ trong **một AZ** — tức bỏ đi lớp cách ly miền lỗi ở §7.2. Chỉ dùng cho thứ dựng lại được (thumbnail, cache, bản sao thứ hai) |
| Truy cập không đoán trước được | **S3 Intelligent-Tiering** | Tự chuyển hạng theo hành vi thật, không phí truy xuất. ⚠️ Có phí giám sát **tính theo từng object**; object < 128 KB không được phân hạng — với hàng trăm triệu object nhỏ thì phí này có thể lớn hơn phần tiết kiệm |
| Lấy dữ liệu từ băng giá | **Glacier retrieval tiers**: Expedited (1–5 phút) / Standard (3–5 giờ) / Bulk (5–12 giờ) | Đúng đánh đổi "chi phí ↔ thời gian lấy ra" ở §12.2. Expedited cần đặt chỗ trước (provisioned capacity) nếu muốn đảm bảo trong sự cố |
| Tự động chuyển tầng và dọn rác | **S3 Lifecycle** | Chuyển hạng theo tuổi; **xoá phiên bản không phải bản mới nhất**; **huỷ multipart dở dang sau 7 ngày**; xoá delete marker hết tác dụng. Hai quy tắc sau là §10.2–10.3, và là hai quy tắc bị quên nhiều nhất |
| Versioning + delete marker | **S3 Versioning** (+ **MFA Delete**) | Cài đặt y hệt §10.1. ⚠️ Bật rồi **không tắt được**, chỉ suspend; và dung lượng phiên bản cũ **vẫn tính tiền** cho tới khi có lifecycle dọn |
| Bất biến bắt buộc, chống cả admin | **S3 Object Lock** (WORM) — Governance / Compliance mode | Phòng thủ trước **bug của chính ta** và trước ransomware (§13). Compliance mode thì **kể cả tài khoản gốc cũng không xoá được** trước hạn — đúng yêu cầu của SEC 17a-4, FINRA |
| Upload file lớn | **S3 Multipart Upload** | Part 5 MB–5 GB, tối đa 10.000 part, object tối đa 5 TB. Part lỗi chỉ gửi lại part đó; tải song song để lấp đủ băng thông (§10.2) |
| Client ở xa region | **S3 Transfer Acceleration** | Đi vào edge CloudFront gần nhất rồi qua **xương sống nội bộ AWS** tới bucket — thắng ~50–500% khi độ trễ và mất gói cao. Tính phí thêm mỗi GB; chỉ bật khi đo được lợi |
| Object nhỏ, cần độ trễ vài ms | **S3 Express One Zone** | Độ trễ thấp hơn ~10 lần, phí request rẻ hơn ~50%. Đổi lại: **một AZ duy nhất**, giá lưu trữ mỗi GB cao hơn, tên bucket theo directory bucket. Đúng cho vùng tạm của ML training, phân tích tương tác — **không** cho lưu trữ lâu dài |
| Ghi trực tiếp từ client | **Presigned URL** | Client `PUT` thẳng lên S3, không đi qua tầng ứng dụng của ta → tiết kiệm băng thông và tránh nghẽn (giống §6.1 nhưng bỏ hẳn một chặng) |
| Thao tác hàng loạt trên hàng tỉ object | **S3 Batch Operations** | Chính là câu trả lời cho vấn đề "rename thư mục là O(n)" ở §5. Nhận một manifest (S3 Inventory hoặc CSV), chạy copy / đổi storage class / gắn tag / gọi Lambda / đặt Object Lock trên hàng tỉ khoá, **có retry và báo cáo hoàn tất** — thay vì tự viết vòng lặp rồi tự gánh chuyện thất bại giữa chừng |
| Danh mục object để khỏi phải LIST | **S3 Inventory** | Xuất báo cáo hằng ngày/tuần ra CSV/Parquet. Đúng cách gỡ cho §9: đừng LIST hàng tỉ khoá trên đường nóng, hãy đọc bản kê đã dựng sẵn |
| Biết có object mới mà không cần LIST | **S3 Event Notification** → SQS / SNS / Lambda, hoặc **EventBridge** | Thay thế mẫu polling bằng LIST (§9). Cũng là cách chuẩn để kích hoạt xử lý sau khi upload |
| Metadata store của ta | **DynamoDB** (khoá phân mảnh `hash(bucket,key)`), hoặc **Aurora** sharded | Tra khoá chính xác hàng chục nghìn rps, độ trễ vài ms, tự mở rộng. Đúng hình dạng §8.2 |
| Bảng `object_listing` phi chuẩn hoá | **DynamoDB** PK `bucket_id`, SK `object_name` + **GSI** | Quét khoảng theo prefix trong một phân mảnh, phân trang bằng một `LastEvaluatedKey` — đúng §9 |
| Placement service | **etcd / Consul** tự vận hành, hoặc **DynamoDB** làm kho cấu hình | Cần đồng thuận (Paxos/Raft) — không có dịch vụ AWS đóng gói sẵn cho đúng vai trò này |
| Mã hoá | **SSE-S3** (mặc định), **SSE-KMS** + **S3 Bucket Keys**, hoặc **DSSE-KMS** | ⚠️ Với SSE-KMS **bắt buộc bật Bucket Keys** — nếu không, mỗi GET là một lời gọi KMS; ở hàng chục nghìn rps bạn vừa đụng trần quota vừa đội chi phí (Bucket Keys giảm ~99% số lời gọi) |
| Nhân bản chéo region / trong region | **S3 Replication** (CRR / SRR), **RTC** nếu cần SLA | Đúng §12.1 — bất đồng bộ. **RTC** cam kết 99,99% object sao chép trong **15 phút**, tức biến RPO mơ hồ thành con số có hợp đồng |

### So sánh với các dịch vụ lưu trữ khác của AWS

| | **S3** (object) | **EBS** (block) | **EFS** (file) | **FSx** (file chuyên dụng) |
|---|---|---|---|---|
| Mô hình | Object phẳng, HTTP | Volume gắn vào một EC2 | NFS đa client | Lustre / Windows / NetApp / OpenZFS |
| Sửa tại chỗ | Không | Có | Có | Có |
| Gắn nhiều máy | Không gắn — truy cập HTTP | Một (trừ io2 Multi-Attach) | **Có**, hàng nghìn | Có |
| Dung lượng | Không giới hạn | Tới 64 TB/volume | Tự co giãn, PB | PB |
| Độ trễ | ~10–100 ms (Express: vài ms) | **Dưới 1 ms** | Vài ms | Rất thấp (Lustre) |
| Giá mỗi GB-tháng | **Thấp nhất** (~0,023 USD) | ~0,08 USD (gp3) | ~0,30 USD (Standard) | Cao |
| Dùng cho | Data lake, backup, media, artifact, log | Ổ khởi động, database, filesystem | Home directory, web content chia sẻ, lift-and-shift | HPC, ML training, workload Windows |
| Chọn khi | Ghi một lần đọc nhiều lần, không cần POSIX | Cần IOPS thấp và in-place write | Cần ngữ nghĩa POSIX từ nhiều máy | Cần hiệu năng hoặc giao thức đặc thù |

### Nếu tự dựng thay vì dùng S3

| | **MinIO** | **Ceph RADOS Gateway** | **S3** |
|---|---|---|---|
| Tương thích API S3 | Rất cao | Cao | Chuẩn gốc |
| Erasure coding | Có, cấu hình được (mặc định EC:4) | Có, linh hoạt | Có (ẩn) |
| Độ phức tạp vận hành | **Thấp** — một binary | **Cao** — MON, OSD, MDS, CRUSH map | Không có |
| Cũng làm được block/file | Không | **Có** — RBD và CephFS cùng một cụm | Cần EBS/EFS riêng |
| Dùng khi | Edge, on-prem, môi trường dev, cụm nhỏ–vừa | Muốn một hệ lưu trữ hợp nhất, có đội vận hành riêng | Mặc định trên cloud |

---

## Cách trình bày khi phỏng vấn / review

1. **Mở bằng việc đặt lại bản chất bài toán.** *"API chỉ có bốn động từ, nên cái khó không nằm ở API. Nó nằm ở ba chỗ: tách data plane khỏi metadata plane, đạt 11 số 9 durability với chi phí chấp nhận được, và liệt kê theo prefix trên một không gian tên đã bị băm ra nghìn shard."* Câu này vạch sẵn dàn bài cho cả buổi và cho thấy bạn biết chỗ nào đáng tiêu thời gian.

2. **Ra số, rồi để số giết một phương án.** Con số đáng nhớ nhất của bài là **100 PB dữ liệu sinh ra chưa tới 1 TB metadata — tỉ lệ 150.000:1**. Từ đó suy ra ngay quyết định kiến trúc lớn nhất. Con số thứ hai: nếu mỗi object là một file riêng thì cạn inode và filesystem journal thành nghẽn — và đó là lý do phải gộp WAL.

3. **Nói rõ vì sao tách hai mặt phẳng, bằng bốn trục chứ không bằng "cho sạch"**: mở rộng độc lập, phần cứng khác nhau (SSD vs HDD, lệch giá 15–20 lần), mô hình nhất quán khác nhau (mutable vs immutable), và bán kính ảnh hưởng khi hỏng khác nhau. Kèm phép loại suy inode của UNIX — nó gói cả kiến trúc vào một câu.

4. **Dành nhiều thời gian nhất cho durability, và đừng chỉ nói "replicate 3 bản".** Ba tầng lập luận: (a) nhân bản 3 bản ở **ba miền lỗi khác nhau** cho ~6 số 9 — nhấn mạnh chữ *độc lập*, và nói luôn rằng lỗi tương quan (cùng lô ổ, cùng firmware, cùng bản deploy) mới là kẻ giết người thật; (b) erasure coding 8+4 cho overhead 1,5× **và** durability cao hơn; (c) durability là hàm của **thời gian ở trạng thái suy giảm**, nên tốc độ khôi phục và tần suất scrub là tham số durability, không phải chi tiết vận hành.

5. **Giải thích Reed-Solomon bằng nội suy đa thức, không bằng công thức.** *"k mảnh dữ liệu là hệ số của một đa thức bậc k−1; ta lưu giá trị của nó tại k+m điểm. Bất kỳ k điểm nào cũng nội suy ngược ra đa thức, tức ra dữ liệu gốc."* Rồi cho số cụ thể: 8+4 nghĩa là 12 mảnh, chịu được mất 4, tốn 1,5× thay vì 3×; ở 100 PB đó là 7.500 ổ thay vì 15.000.

6. **Tự nêu mặt tối của erasure coding trước khi bị hỏi** — đây là chỗ phân biệt người đã vận hành với người mới đọc: đọc phải chờ 8 node nên độ trễ đuôi xấu đi (gỡ bằng hedged read); khôi phục một ổ 20 TB phải đọc 160 TB; object nhỏ thì EC **tệ hơn** cả nhân bản vì mỗi mảnh vẫn chiếm trọn một block 4 KB. Kết luận đúng là **dùng cả hai theo kích thước và nhiệt độ**, và coi việc chuyển tầng là cơ hội mã hoá lại.

7. **Đừng quên bit rot** — rất nhiều ứng viên bỏ qua. *"UBER 10⁻¹⁵ nghĩa là quét hết 100 PB một lần thì kỳ vọng ~800 bit sai. Với 11 số 9 tôi không được để lọt cái nào."* Rồi nói checksum ở ba tầng (object / file / **từng mảnh EC trước khi giải mã**) và scrubbing nền chu kỳ 14 ngày, kèm phép tính cho thấy nó chỉ tốn ~5% băng thông ổ.

8. **Trình bày phần listing như một bài toán CQRS, không như một câu SQL.** *"Tôi shard theo `hash(bucket,key)` vì 95% lưu lượng là tra khoá chính xác. Chính lựa chọn đó phá huỷ tính cục bộ mà LIST cần. Nên tôi dựng một bảng phi chuẩn hoá riêng cho LIST, shard theo `bucket_id`, cập nhật bất đồng bộ."* Rồi nêu cái giá một cách trung thực: bảng đó **lệch tải** với bucket khổng lồ, và **LIST trả kết quả hơi cũ** — chính là lý do LIST của S3 không strong trong khi GET thì có.

9. **Với consistency, quy bài toán khó về bài toán dễ.** *"Object bất biến nên nhất quán không phải bài toán của dữ liệu mà của con trỏ. Byte đã nằm trên đĩa trước khi con trỏ đổi; tôi chỉ cần một cập nhật nguyên tử trên một hàng — và lựa chọn shard theo hash từ trước đã đảm bảo hàng đó nằm gọn trong một shard, nên không cần đồng thuận phân tán."* Thêm bối cảnh lịch sử để cho thấy bạn hiểu vì sao nó khó: S3 mất 14 năm mới chuyển từ eventual sang strong, vì vướng cache phân tán, replica metadata, và việc không gian tên phẳng không có điểm phối hợp tự nhiên.

10. **Đóng lại bằng chi phí, vì với hệ storage thì chi phí *là* kiến trúc.** Erasure coding cắt một nửa hoá đơn đĩa; phân tầng cắt tiếp một bậc độ lớn cho dữ liệu nguội; nhưng cả hai đều có ngưỡng dưới mà bên dưới đó chúng **lỗ**. Câu chốt: *"Tôi không chọn một sơ đồ dư thừa — tôi chọn một chính sách, và chính sách đó lấy kích thước object và tuổi của nó làm đầu vào."*

> 💡 **Nguyên tắc cuối**: cả bài chỉ là một ý tưởng được đẩy tới cùng — **object bất biến và không gian tên phẳng**. Từ đó mọi thứ còn lại là hệ quả: tách được metadata khỏi data vì hai bên có hình dạng khác nhau; gộp được object vào file WAL vì không bao giờ phải ghi đè giữa file; nhân bản được không cần khoá vì hai bản sao không thể mâu thuẫn; cache được vĩnh viễn theo `object_id`; retry idempotent tự nhiên; và nhất quán rút gọn về một cập nhật con trỏ nguyên tử. Cái giá — rename O(n), LIST chậm, không in-place write, không POSIX — chính là **học phí mua lấy exabyte**. Nếu chỉ nhớ một câu: **object store không mở rộng được vì nó làm được nhiều; nó mở rộng được vì nó từ chối làm gần hết mọi thứ.**
