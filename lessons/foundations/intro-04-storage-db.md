# Lưu trữ & Cơ sở dữ liệu 101

Mọi ứng dụng đều phải trả lời hai câu hỏi: **dữ liệu nằm ở đâu** và **lấy ra như thế nào cho nhanh**. Bài này xây nền tảng về lưu trữ (storage) và cơ sở dữ liệu (database) từ con số 0 — bằng những ví dụ đời thường — để khi bạn gặp S3, EBS hay DynamoDB trên AWS, bạn hiểu *tại sao* chúng tồn tại chứ không chỉ *tên* chúng là gì.

## 1. Ba kiểu lưu trữ: block, file, object

Hãy tưởng tượng bạn cần cất giữ đồ đạc. Có ba cách:

### 1.1. Block storage — "tủ ngăn kéo đánh số"

Block storage chia ổ đĩa thành các **khối (block)** nhỏ bằng nhau, đánh số tuần tự. Hệ điều hành muốn ghi gì thì tự quyết định ghi vào block số mấy.

```
Ổ đĩa = dãy block đánh số:
+----+----+----+----+----+----+
| 0  | 1  | 2  | 3  | 4  | 5  | ...
+----+----+----+----+----+----+
  ↑ OS tự quản lý: "file A nằm ở block 1, 4, 5"
```

- **Analogy**: tủ ngăn kéo trống đánh số. Tủ không biết bạn cất gì; *bạn* (hệ điều hành) phải tự ghi nhớ "áo ở ngăn 3, tất ở ngăn 7".
- **Đặc điểm**: rất nhanh, độ trễ thấp, gắn trực tiếp vào **một** máy chủ (như ổ cứng cắm vào máy). Đây là nơi cài hệ điều hành, chạy database.
- **Hạn chế**: thường chỉ một máy dùng tại một thời điểm; muốn chia sẻ phải có lớp khác bên trên.

### 1.2. File storage — "tủ hồ sơ có thư mục"

File storage tổ chức dữ liệu thành **cây thư mục** quen thuộc: `/home/an/baocao/quy1.docx`. Nhiều máy có thể cùng mount (gắn) và đọc/ghi chung qua mạng (giao thức như NFS, SMB).

- **Analogy**: tủ hồ sơ văn phòng có ngăn, kẹp, nhãn. Ai trong phòng cũng mở được, tìm theo đường dẫn.
- **Đặc điểm**: chia sẻ được giữa nhiều máy, có phân quyền, khóa file. Phù hợp nội dung dùng chung: thư mục home, web assets dùng bởi nhiều server.
- **Hạn chế**: mở rộng đến hàng tỷ file thì cây thư mục trở nên cồng kềnh.

### 1.3. Object storage — "gửi đồ ở quầy ký gửi"

Object storage bỏ hẳn khái niệm thư mục và block. Mỗi mẩu dữ liệu là một **object** = nội dung + metadata + một **key** (tên định danh duy nhất). Bạn thao tác qua API: `PUT key`, `GET key`, `DELETE key`.

- **Analogy**: quầy ký gửi đồ ở siêu thị. Bạn đưa túi đồ, nhận một mã số. Muốn lấy lại, đưa mã số. Bạn **không** được mở túi sửa một góc — muốn đổi thì gửi túi mới thay thế (object là bất biến từng phần: ghi đè cả object, không sửa giữa chừng).
- **Đặc điểm**: mở rộng gần như vô hạn, rẻ, truy cập qua HTTP từ bất cứ đâu, kèm metadata phong phú. Lý tưởng cho ảnh, video, backup, log, dữ liệu phân tích.
- **Hạn chế**: độ trễ cao hơn block; không phải là filesystem để cài app lên.

### 1.4. Bảng so sánh nhanh

| Tiêu chí | Block | File | Object |
|---|---|---|---|
| Đơn vị | Block đánh số | File trong thư mục | Object + key |
| Truy cập | Gắn vào 1 máy | Nhiều máy mount chung | API HTTP từ mọi nơi |
| Sửa một phần file | Có | Có | Không (ghi đè cả object) |
| Độ trễ | Thấp nhất | Trung bình | Cao hơn |
| Quy mô | Theo ổ đĩa | Lớn | Gần như vô hạn |
| Dùng cho | OS, database | Thư mục dùng chung | Ảnh, video, backup, data lake |

> 💡 Ghi nhớ: Block = ngăn kéo cho **một máy** (nhanh nhất). File = tủ hồ sơ **dùng chung** theo đường dẫn. Object = quầy ký gửi **vô hạn** truy cập bằng key qua API.

## 2. Durability vs Availability — bền và sẵn sàng là hai chuyện khác nhau

Hai từ này hay bị dùng lẫn, nhưng chúng trả lời hai câu hỏi khác nhau:

- **Durability (độ bền)**: dữ liệu của tôi có **mất vĩnh viễn** không? Mười năm sau quay lại, file còn nguyên không?
- **Availability (độ sẵn sàng)**: **ngay bây giờ** tôi có truy cập được dữ liệu không?

**Analogy**: vàng cất trong két ngân hàng có durability rất cao — gần như không bao giờ mất. Nhưng nếu ngân hàng đóng cửa cuối tuần, availability lúc đó bằng 0: vàng vẫn còn, chỉ là bạn chưa lấy ra được.

```
Sự cố mạng 1 giờ:   Availability ↓  (tạm thời không truy cập được)
                    Durability   —  (dữ liệu vẫn nguyên vẹn)

Cháy ổ đĩa duy nhất: Durability  ↓  (mất dữ liệu vĩnh viễn)
```

Người ta đo bằng "số 9": availability 99,99% nghĩa là cho phép gián đoạn ~52 phút/năm. Durability "11 số 9" (99,999999999%) nghĩa là gửi 10 triệu object thì trung bình 10.000 năm mới kỳ vọng mất 1 object.

> 💡 Ghi nhớ: Durability = dữ liệu **còn tồn tại** hay không. Availability = dữ liệu **truy cập được lúc này** hay không. Hệ thống có thể tạm "sập" (availability giảm) mà không mất byte nào (durability nguyên vẹn).

## 3. RAID và replication — chống mất dữ liệu bằng bản sao

Ổ đĩa **chắc chắn sẽ hỏng** — câu hỏi chỉ là khi nào. Giải pháp chung: đừng giữ một bản duy nhất.

### 3.1. RAID — ghép nhiều ổ đĩa trong một máy

RAID (Redundant Array of Independent Disks) kết hợp nhiều ổ vật lý thành một ổ logic:

| Kiểu | Ý tưởng | Được gì | Mất gì |
|---|---|---|---|
| RAID 0 (striping) | Chia dữ liệu rải đều lên nhiều ổ | Nhanh hơn | **Một ổ hỏng = mất hết** |
| RAID 1 (mirroring) | Ghi y hệt lên 2 ổ | Hỏng 1 ổ vẫn còn bản kia | Tốn gấp đôi dung lượng |
| RAID 5/6 (parity) | Rải dữ liệu + mã kiểm tra (parity) | Chịu được 1–2 ổ hỏng, tiết kiệm hơn mirror | Ghi chậm hơn, rebuild lâu |

**Analogy**: RAID 1 như photo công chứng giấy tờ quan trọng — bản gốc rách thì còn bản sao.

### 3.2. Replication — bản sao giữa nhiều máy, nhiều nơi

RAID chỉ cứu bạn khỏi hỏng **ổ đĩa**; nếu cả máy chủ cháy, cả tòa data center mất điện thì sao? **Replication** sao chép dữ liệu sang máy khác, phòng máy khác, thậm chí thành phố khác.

```
        Ghi vào
          ↓
     [Primary] ──sao chép──▶ [Replica 1]  (cùng data center)
          └─────sao chép──▶ [Replica 2]  (data center khác)
```

Hai chế độ chính:

- **Synchronous (đồng bộ)**: ghi xong ở bản sao rồi mới báo "thành công". An toàn hơn, chậm hơn một chút.
- **Asynchronous (bất đồng bộ)**: báo thành công ngay, sao chép sau. Nhanh hơn, nhưng nếu primary chết đúng lúc đó có thể mất vài giây dữ liệu mới nhất.

Replica còn có ích phụ: cho phép **đọc** từ bản sao để giảm tải cho primary (read replica).

> 💡 Ghi nhớ: RAID bảo vệ trong phạm vi **một máy**; replication bảo vệ trong phạm vi **nhiều máy / nhiều địa điểm**. Hệ thống cloud nghiêm túc luôn dùng cả hai tầng tư duy này.

## 4. SQL vs NoSQL — chọn đúng "kệ" cho đúng "đồ"

### 4.1. SQL (relational) — bảng tính có kỷ luật

Database quan hệ (relational) tổ chức dữ liệu thành **bảng** có cột cố định (schema), liên kết nhau bằng khóa, truy vấn bằng ngôn ngữ SQL, và đảm bảo **ACID** — đặc biệt là transaction: một loạt thao tác hoặc thành công hết, hoặc không có gì xảy ra.

**Analogy**: sổ kế toán. Mọi dòng đúng định dạng, chuyển tiền thì bút toán nợ và có phải đi cùng nhau — không bao giờ trừ tiền người này mà quên cộng cho người kia.

Dùng khi: dữ liệu có cấu trúc rõ, nhiều mối quan hệ, cần JOIN linh hoạt, cần transaction nghiêm ngặt (ngân hàng, đơn hàng, tồn kho). Ví dụ: MySQL, PostgreSQL.

### 4.2. NoSQL — bốn họ chính

NoSQL ra đời khi quy mô internet vượt khả năng mở rộng tiện lợi của một máy SQL. Đổi lại sự linh hoạt và scale ngang, bạn từ bỏ một phần JOIN và schema cứng.

| Họ | Mô hình | Analogy | Dùng khi | Ví dụ |
|---|---|---|---|---|
| Key-value | key → value | Tủ gửi đồ: đưa mã, nhận túi | Tra cứu cực nhanh theo khóa: session, giỏ hàng, profile game | Redis, DynamoDB |
| Document | key → tài liệu JSON lồng nhau | Bìa hồ sơ bệnh án: mỗi bệnh nhân một bìa, bên trong tự do | Dữ liệu mỗi bản ghi tự chứa, schema thay đổi thường xuyên: catalog sản phẩm | MongoDB |
| Wide-column | hàng có hàng triệu cột thưa, nhóm theo column family | Bảng chấm công khổng lồ: mỗi người chỉ điền những ô liên quan | Ghi cực nhiều, dữ liệu time-series, log, IoT | Cassandra, HBase |
| Graph | đỉnh (node) + cạnh (quan hệ) | Sơ đồ "ai quen ai" dán tường của thám tử | Quan hệ là trọng tâm: mạng xã hội, gợi ý, phát hiện gian lận | Neo4j, Neptune |

### 4.3. Chọn thế nào?

Câu hỏi quyết định không phải "cái nào xịn hơn" mà là **"bạn truy vấn dữ liệu theo kiểu gì?"**

- Cần JOIN nhiều bảng, transaction chặt → **SQL**.
- Truy cập chủ yếu theo một khóa, cần scale ngang lớn, độ trễ mili giây ổn định → **key-value/document**.
- Ghi dồn dập theo thời gian → **wide-column**.
- Câu hỏi dạng "bạn của bạn của bạn" → **graph**.

> 💡 Ghi nhớ: SQL = sổ kế toán (chặt chẽ, quan hệ, transaction). NoSQL = đánh đổi schema cứng và JOIN để lấy **scale ngang** và **tốc độ theo access pattern**. Chọn database theo **cách bạn truy vấn**, không theo mốt.

## 5. Index — mục lục của database

Không có index, database tìm một bản ghi bằng cách **đọc lần lượt từ đầu đến cuối** (full scan) — như tìm một từ trong sách bằng cách lật từng trang.

**Index** giống **mục lục/bảng tra cứu cuối sách**: một cấu trúc phụ sắp xếp sẵn (thường là B-tree), trỏ thẳng đến vị trí bản ghi.

```
Không index:  [hàng 1]→[hàng 2]→ ... →[hàng 9.999.999]  😫 chậm
Có index:     tra "Nguyễn Văn A" trong cây sắp xếp → nhảy thẳng tới hàng  ⚡
```

Nhưng mục lục không miễn phí:

- **Tốn chỗ**: index chiếm thêm dung lượng.
- **Ghi chậm hơn**: mỗi lần thêm/sửa bản ghi phải cập nhật cả index — như mỗi lần dán thêm trang vào sách phải sửa lại mục lục.

Vì vậy: đánh index trên các cột **hay dùng để tìm kiếm/lọc**, đừng đánh index mọi cột.

> 💡 Ghi nhớ: Index đổi **dung lượng + tốc độ ghi** lấy **tốc độ đọc**. Đọc nhiều → đáng giá; ghi nhiều mà ít tra cứu → cân nhắc.

## 6. Cache — sổ tay ghi nhanh

Cache là lớp lưu tạm **kết quả hay được hỏi** ở nơi truy cập cực nhanh (RAM), để khỏi hỏi lại nguồn gốc chậm hơn (database, API).

**Analogy**: nhân viên quán cà phê thuộc lòng món của khách quen. Khách quen bước vào — trả lời ngay (nhanh). Khách lạ — phải hỏi và tra menu (chậm), nhưng lần sau sẽ nhớ.

### 6.1. Hit, miss và TTL

```
Request ──▶ Cache có sẵn?
              ├─ Có  → CACHE HIT  → trả ngay (micro/mili giây)
              └─ Không → CACHE MISS → xuống database lấy
                                      → lưu vào cache → trả về
```

- **Hit ratio** (tỷ lệ hit) càng cao, database càng nhàn, người dùng càng thấy nhanh.
- **TTL (Time To Live)**: thời hạn sống của một mục trong cache, ví dụ 60 giây. Hết hạn thì mục bị coi là cũ và bị loại — lần hỏi sau sẽ miss và lấy dữ liệu mới. TTL là cách đơn giản nhất xử lý bài toán khó nhất của cache: **dữ liệu cũ (stale)**.

Đánh đổi TTL: TTL dài → hit nhiều nhưng dễ trả dữ liệu lỗi thời; TTL ngắn → tươi mới nhưng database vất vả hơn.

### 6.2. Lưu ý quan trọng

Cache thường nằm trong RAM nên **mất điện là mất** — cache là bản *tăng tốc*, không bao giờ là nơi *lưu trữ chính* (source of truth vẫn là database).

> 💡 Ghi nhớ: Cache = trả lời từ trí nhớ thay vì tra sổ. Hit = có sẵn, miss = phải đi lấy. TTL điều khiển độ "tươi" của dữ liệu. Cache tăng tốc, **không** thay thế database.

## 7. Backup vs Snapshot — hai cách "quay ngược thời gian"

Cả hai đều để khôi phục dữ liệu khi có sự cố (xóa nhầm, ransomware, lỗi phần mềm), nhưng cơ chế khác nhau:

| | Backup | Snapshot |
|---|---|---|
| Analogy | Photo toàn bộ hồ sơ, cất két ở **tòa nhà khác** | **Chụp ảnh** trạng thái tủ hồ sơ tại một thời điểm |
| Cơ chế | Sao chép đầy đủ (hoặc incremental) sang hệ thống lưu trữ **độc lập** | Ghi lại trạng thái tại thời điểm chụp, thường chỉ lưu **phần thay đổi** so với lần trước (incremental, copy-on-write) |
| Tốc độ tạo | Chậm hơn | Gần như tức thì |
| Độc lập với nguồn | Cao — nguồn chết hẳn vẫn còn backup | Thường gắn với hạ tầng storage gốc |
| Dùng cho | Phòng thảm họa, lưu dài hạn, yêu cầu tuân thủ | Quay lại nhanh trước khi nâng cấp, khôi phục vận hành hằng ngày |

Hai con số bạn sẽ gặp khi bàn về khôi phục:

- **RPO (Recovery Point Objective)**: chấp nhận mất tối đa bao nhiêu **dữ liệu** (ví dụ: backup mỗi giờ → có thể mất tới 1 giờ dữ liệu).
- **RTO (Recovery Time Objective)**: chấp nhận mất tối đa bao nhiêu **thời gian** để hệ thống chạy lại.

> 💡 Ghi nhớ: Snapshot = nhanh, tiện, gắn với hệ thống gốc — tốt cho khôi phục thường ngày. Backup = bản sao độc lập, để được lâu — tấm lưới an toàn cuối cùng. Replication **không thay thế** backup: lệnh xóa nhầm cũng được replicate sang bản sao ngay lập tức!

## 8. Liên hệ sang AWS

Khi bước vào CLF/SAA/DVA, các khái niệm trên ánh xạ gần như một-một sang service AWS:

| Khái niệm trong bài | Service AWS | Ghi chú nhanh |
|---|---|---|
| Block storage | **Amazon EBS** | "Ổ cứng mạng" gắn vào một EC2 instance; chạy OS, database |
| File storage | **Amazon EFS** | Filesystem dùng chung, nhiều EC2 mount cùng lúc, tự co giãn |
| Object storage | **Amazon S3** | Bucket + key + object qua HTTP; durability "11 số 9" |
| SQL / relational | **Amazon RDS** (MySQL, PostgreSQL...) | Database quan hệ được AWS quản lý; có Multi-AZ (replication đồng bộ) và read replica |
| NoSQL key-value/document | **Amazon DynamoDB** | Scale ngang, độ trễ mili giây, serverless |
| Cache | **Amazon ElastiCache** (Redis/Memcached) | Cache trong RAM đặt trước database |
| Snapshot | **EBS Snapshot**, RDS automated backup/snapshot | Snapshot EBS lưu incremental vào S3 |
| Replication đa địa điểm | Multi-AZ, S3 Cross-Region Replication | "AZ" = data center độc lập trong một Region |

Vài kết nối đáng nhớ:

- Câu hỏi thi rất hay xoay quanh **block vs file vs object** → chính là chọn giữa **EBS vs EFS vs S3**.
- "11 số 9 durability" của S3 đạt được nhờ ý tưởng mục 3: tự động sao chép object ra nhiều thiết bị, nhiều AZ.
- RDS **Multi-AZ** = replication đồng bộ để tăng availability; **read replica** = replication bất đồng bộ để tăng hiệu năng đọc — đúng hai chế độ ở mục 3.2.
- DynamoDB buộc bạn thiết kế theo **access pattern** (mục 4.3) thay vì theo bảng quan hệ.
- ElastiCache đặt trước RDS chính là sơ đồ hit/miss ở mục 6.

Nắm chắc bài này, bạn đã có "bộ khung" để mọi service lưu trữ AWS rơi đúng vào ô của nó.
