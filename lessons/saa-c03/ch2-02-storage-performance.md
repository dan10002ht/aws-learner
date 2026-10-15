# SAA Ch2.2 — Storage Performance

> Mục tiêu: Chọn đúng storage type cho từng workload (block / object / file / archive) và tune **IOPS, throughput, latency** theo SLA. Hiểu vì sao EBS gp3 thay thế gp2, khi nào dùng FSx for Lustre thay vì EFS, và S3 throughput "vô hạn" thực sự nghĩa là gì.

Tiền đề: [[ch2-01-compute-performance]], [[foundations-05-partitioning-and-sharding]], CLF [[05-s3]].

---

## 1. Câu chuyện mở đầu — Database "chậm vì disk"

DBA báo: Postgres p99 query latency 200ms, target 20ms. CPU chỉ 40%, RAM dư. `iostat` cho thấy **`%util = 99%`, `await = 50ms`** trên `/data`.

Để đọc được hai con số đó, và mọi bảng trong bài này, cần ba khái niệm trước.

### 1.1 Ba con số đo một ổ đĩa: IOPS, throughput, latency

Mỗi lần ứng dụng đọc hoặc ghi một mẩu dữ liệu xuống đĩa là một **thao tác I/O**. Mẩu đó to bao nhiêu gọi là **I/O size**: Postgres đọc từng trang 8 KiB, còn một job quét file log có thể đọc từng khối 1 MiB.

- **IOPS** (I/O operations per second) là **số thao tác** đĩa làm được mỗi giây, không quan tâm mỗi thao tác to hay nhỏ.
- **Throughput** là **lượng dữ liệu** đi qua mỗi giây, tính bằng MB/s (AWS ghi MiB/s; chênh nhau ~5%, đề thi coi như một).
- **Latency** là thời gian **một** thao tác hoàn tất, tính bằng mili-giây (ms) hoặc micro-giây (µs).

IOPS và throughput gắn với nhau qua I/O size:

```
throughput = IOPS × I/O size

3.000 IOPS ×   8 KiB  ≈  23 MiB/s    ← database: rất nhiều thao tác nhỏ
3.000 IOPS × 256 KiB  = 750 MiB/s    ← cùng số IOPS, I/O to gấp 32 lần
  500 IOPS ×   1 MiB  = 500 MiB/s    ← quét file tuần tự: ít thao tác, mỗi thao tác rất to
```

Mỗi volume có **hai trần riêng**, một cho IOPS và một cho throughput, và workload chạm trần nào trước thì nghẽn ở trần đó. Vì vậy câu hỏi đầu tiên luôn là workload thuộc kiểu nào:

| Kiểu workload | I/O trông thế nào | Trần chạm trước | Ví dụ |
|---------------|-------------------|-----------------|-------|
| **Random, I/O nhỏ** | Nhảy lung tung khắp đĩa, mỗi lần 4–16 KiB | **IOPS** | Database OLTP, boot volume |
| **Sequential, I/O lớn** | Đọc/ghi nối tiếp một dải dài, mỗi lần 256 KiB – 1 MiB | **Throughput** | Quét log, ETL, data warehouse, video |

Hai chỉ số của `iostat` trong câu chuyện:

- **`await`** là thời gian trung bình một thao tác phải chờ, **tính cả lúc xếp hàng** lẫn lúc đĩa thực sự xử lý. Một volume SSD khoẻ mạnh trả lời trong khoảng 1 ms; `await = 50ms` nghĩa là gần như toàn bộ thời gian là đứng xếp hàng.
- **`%util`** là phần trăm thời gian thiết bị đang bận. 99% nghĩa là đĩa không có lúc nào rảnh, yêu cầu mới đến chỉ còn cách chờ.

Hàng chờ đó có tên riêng là **queue length** (độ dài hàng đợi): số thao tác I/O đã gửi xuống nhưng chưa xong. Queue dài lên thì latency tăng theo, dù bản thân đĩa không hề chậm đi.

### 1.2 Quay lại câu chuyện

CPU 40%, RAM dư, đĩa bận 99%: đây là **disk-bound** (nghẽn ở đĩa), không phải compute-bound. Thêm CPU không giúp gì.

Giả sử `/data` là một volume gp3 mặc định (3.000 IOPS, 125 MiB/s) và giờ cao điểm Postgres cần đọc 6.000 trang mỗi giây:

```
Cần:   6.000 thao tác/s × 8 KiB ≈ 47 MiB/s
Trần:  3.000 IOPS  và  125 MiB/s

→ Throughput mới dùng 47/125, còn dư.
→ IOPS thiếu một nửa: mỗi giây 3.000 thao tác không được phục vụ, dồn vào hàng đợi
  → await leo từ ~1 ms lên hàng chục ms → query p99 200 ms.
```

Các hướng xử lý, từ rẻ tới đắt:

- **Tăng IOPS của chính volume đó.** Với gp3 chỉ là một lệnh chỉnh online: thêm 3.000 IOPS tốn khoảng 3.000 × $0.005 = **$15/tháng** (us-east-1). Vượt quá trần gp3 hoặc cần latency dưới 1 ms thì chuyển sang io2 (§3.3).
- **Đổi sang instance họ `i`** dùng Instance Store NVMe (§4) nếu cần IOPS rất cao và chấp nhận dữ liệu không bền.
- **Giảm số I/O phải làm**: cache ở tầng app, PgBouncer để gom connection, chuyển query đọc sang Aurora Reader (xem [[ch2-03-database-performance]]).

Lưu ý ngược lại: nếu workload là job quét log với I/O 1 MiB thì tăng IOPS vô ích, vì thứ bị chạm là trần throughput.

**Quy tắc 0**: storage performance = (IOPS, throughput, latency, durability, cost). Không có "tốt nhất", chỉ có "phù hợp profile workload".

---

## 2. Bốn loại storage chính

Bốn loại khác nhau ở **đơn vị dữ liệu mà ứng dụng nhìn thấy**, và điều đó quyết định ai dùng chung được với ai.

- **Block storage** đưa cho hệ điều hành một ổ đĩa trần: một dãy block đánh số. OS tự format filesystem (ext4, xfs, NTFS) lên trên rồi sửa từng block tại chỗ. Vì filesystem nằm trong OS của **một** máy, bình thường một volume chỉ gắn cho một instance. Hợp với boot volume và database.
- **File storage** là một filesystem đã dựng sẵn, chia sẻ qua mạng bằng giao thức **NFS** (Linux) hoặc **SMB** (Windows). Server giữ filesystem, nhiều client cùng mount và thấy chung một cây thư mục. Hợp khi nhiều máy phải đọc/ghi chung file.
- **Object storage** lưu từng **object** nguyên khối (dữ liệu + metadata) dưới một cái tên gọi là key, truy cập bằng HTTP API (`PUT`, `GET`). Không sửa được một phần object, muốn đổi thì ghi đè cả object. Bù lại không có giới hạn tổng dung lượng hay số object trong một bucket (§7.3 nói rõ cái gì *có* giới hạn).
- **Archive** là object storage đánh đổi tốc độ lấy ra để lấy giá: lưu rẻ hơn S3 Standard khoảng 6–23 lần (§7.1), nhưng lấy ra mất từ vài phút tới 48 giờ.

| Loại | AWS service | Truy cập | Đặc trưng |
|------|-------------|----------|-----------|
| **Block** | EBS, Instance Store | Attach 1 instance (EBS Multi-Attach = nhiều, xem §3.4) | OS thấy như disk, tự format filesystem |
| **File** | EFS, FSx (Lustre/Windows/NetApp/OpenZFS) | NFS/SMB, nhiều client | Cây thư mục, shared filesystem |
| **Object** | S3, S3 Glacier variants | HTTP API | Key-value, ghi đè nguyên object, không trần tổng dung lượng |
| **Archive** | S3 Glacier (Instant/Flexible/Deep) | API + thời gian retrieval | Rẻ nhất; Flexible và Deep phải chờ phút tới giờ mới đọc được |

### Quy tắc chọn nhanh

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 430" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cây quyết định chọn loại storage trên AWS</title>
  <desc>Cây quyết định: cần truy cập kiểu nào? Block một instance thì chọn EBS hoặc Instance Store; chia sẻ file nhiều client thì chọn EFS, FSx for Windows hoặc FSx for Lustre; lưu object qua API thì chọn S3 hoặc S3 Glacier theo tần suất truy cập.</desc>
  <text x="16" y="24" font-size="14.5" font-weight="700" fill="currentColor">Chọn loại storage — cây quyết định</text>
  <defs>
    <marker id="stArr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 z" fill="currentColor" fill-opacity="0.5"/></marker>
  </defs>
  <rect x="276" y="40" width="168" height="42" rx="9" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="360" y="59" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Kiểu truy cập?</text>
  <text x="360" y="75" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">block / file / object</text>
  <g stroke="currentColor" stroke-opacity="0.45" fill="none">
    <path d="M300 82 C200 110 130 110 130 132" marker-end="url(#stArr)"/>
    <path d="M360 82 v50" marker-end="url(#stArr)"/>
    <path d="M420 82 C590 110 590 110 590 132" marker-end="url(#stArr)"/>
  </g>
  <text x="150" y="106" font-size="10.5" font-weight="700" fill="currentColor" opacity="0.8">Block (1 máy)</text>
  <text x="360" y="106" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.8">File (nhiều client)</text>
  <text x="580" y="106" font-size="10.5" font-weight="700" text-anchor="end" fill="currentColor" opacity="0.8">Object (API)</text>
  <rect x="44" y="132" width="172" height="58" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="130" y="152" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Cần bền (persist)?</text>
  <text x="130" y="170" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">Có → EBS · Không (cache,</text>
  <text x="130" y="183" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">scratch) → Instance Store</text>
  <rect x="276" y="132" width="168" height="58" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="360" y="152" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Protocol / workload?</text>
  <text x="360" y="170" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">Linux NFS · Windows SMB</text>
  <text x="360" y="183" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">· HPC/ML throughput cao</text>
  <rect x="504" y="132" width="172" height="58" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="590" y="152" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Tần suất truy cập?</text>
  <text x="590" y="170" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">Nóng → S3 · Lạnh / archive</text>
  <text x="590" y="183" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">trên 90 ngày → Glacier</text>
  <g stroke="currentColor" stroke-opacity="0.4" fill="none">
    <path d="M130 190 v22" marker-end="url(#stArr)"/>
    <path d="M360 190 v22" marker-end="url(#stArr)"/>
    <path d="M590 190 v22" marker-end="url(#stArr)"/>
  </g>
  <g font-size="11" font-weight="700" text-anchor="middle" fill="#fff">
    <rect x="34" y="216" width="92" height="30" rx="8" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="80" y="235">EBS</text>
    <rect x="132" y="216" width="98" height="30" rx="8" fill="#3b82f6" fill-opacity="0.6"/>
    <text x="181" y="235">Instance Store</text>
    <rect x="270" y="216" width="58" height="30" rx="8" fill="#10b981" fill-opacity="0.9"/>
    <text x="299" y="235">EFS</text>
    <rect x="332" y="216" width="100" height="30" rx="8" fill="#10b981" fill-opacity="0.7"/>
    <text x="382" y="235">FSx Win/Lustre</text>
    <rect x="500" y="216" width="78" height="30" rx="8" fill="#f59e0b" fill-opacity="0.9"/>
    <text x="539" y="235">S3</text>
    <rect x="584" y="216" width="92" height="30" rx="8" fill="#f59e0b" fill-opacity="0.65"/>
    <text x="630" y="235">S3 Glacier</text>
  </g>
  <rect x="34" y="270" width="652" height="56" rx="9" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="46" y="290" font-size="11" font-weight="700" fill="currentColor" opacity="0.85">Bẫy thường gặp:</text>
  <text x="46" y="307" font-size="10.5" fill="currentColor" opacity="0.75">• "Share file giữa nhiều EC2" → EFS, KHÔNG phải EBS Multi-Attach (cần cluster-aware FS).</text>
  <text x="46" y="321" font-size="10.5" fill="currentColor" opacity="0.75">• "Low latency + bền" → io2 Block Express, KHÔNG phải Instance Store (mất data khi stop).</text>
  <text x="360" y="352" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">Chọn TYPE trước (cây trên), rồi mới tune IOPS / throughput trong từng type.</text>
</svg>

| Tình huống | Chọn |
|------------|------|
| Boot volume EC2, DB local | **EBS** |
| Cần share file giữa nhiều EC2 (Linux) | **EFS** |
| Cần share file Windows (AD-integrated) | **FSx for Windows File Server** |
| HPC, ML training, high throughput parallel | **FSx for Lustre** |
| NetApp ONTAP migration | **FSx for ONTAP** |
| Cực high IOPS, có thể mất khi instance terminate | **Instance Store (NVMe)** |
| Static web assets, backups, logs, data lake | **S3** |
| Archive > 90 ngày | **S3 Glacier** |
| Big data analytics trên S3 | S3 + **Athena / Spectrum / Redshift Spectrum** |

---

## 3. EBS — block storage

**EBS (Elastic Block Store)** là ổ đĩa **gắn qua mạng**: volume nằm trên một cụm storage riêng trong cùng AZ với instance, mỗi thao tác I/O đi qua mạng nội bộ của AWS. Hai hệ quả theo suốt cả section:

- Volume **sống độc lập với instance**. Stop hay terminate instance, dữ liệu vẫn còn, gắn sang instance khác được. Đổi lại, volume chỉ gắn được cho instance **cùng AZ**.
- Mỗi I/O có thêm một chặng mạng nên latency ở mức mili-giây, chậm hơn đĩa cắm thẳng vào host (Instance Store, §4).

### 3.1 Volume types (2024)

Có hai nhóm, chia theo đúng hai kiểu workload ở §1.1:

- **SSD** (`gp3`, `gp2`, `io2`, `io1`): random hay sequential đều nhanh như nhau, nên hợp với I/O nhỏ ngẫu nhiên. Hiệu năng đo bằng **IOPS**. AWS tính trần IOPS của nhóm này với I/O 16 KiB.
- **HDD** (`st1`, `sc1`): đĩa từ, chỉ nhanh khi đọc/ghi **tuần tự** khối lớn. Hiệu năng đo bằng **throughput**; IOPS được tính với I/O 1 MiB, nên con số "500 IOPS" của st1 thực chất là 500 MiB/s. Cho HDD làm việc random I/O 4 KiB thì 500 IOPS × 4 KiB chỉ còn khoảng 2 MiB/s. HDD cũng không làm boot volume được.

| Type | Max IOPS | Max throughput | Latency | Durability | Use case | Giá lưu (~us-east-1) |
|------|----------|----------------|---------|------------|----------|----------------------|
| **gp3** | 80.000 (đề thi: 16.000); kèm sẵn 3.000 | 2.000 MiB/s (đề thi: 1.000); kèm sẵn 125 | Một chữ số ms | 99,8–99,9% | Mặc định cho mọi thứ, thay gp2 | ~$0.08/GB-tháng |
| **gp2** | 16.000 (3 IOPS/GiB, burst theo credit) | 250 MiB/s | Một chữ số ms | 99,8–99,9% | Legacy, đang bị thay | ~$0.10/GB-tháng |
| **io2 Block Express** | 256.000 | 4.000 MiB/s | Trung bình dưới 0,5 ms | **99,999%** | DB mission-critical, SAP HANA | ~$0.125/GB-tháng + ~$0.065/IOPS-tháng |
| **io1** | 64.000 | 1.000 MiB/s | ms | 99,8–99,9% | Legacy của họ io | ~$0.125/GB-tháng + ~$0.065/IOPS-tháng |
| **st1** | 500 (I/O 1 MiB) | 500 MiB/s | Không phải chỉ số thiết kế | 99,8–99,9% | Big data, log processing, data warehouse | ~$0.045/GB-tháng |
| **sc1** | 250 (I/O 1 MiB) | 250 MiB/s | Không phải chỉ số thiết kế | 99,8–99,9% | Cold HDD, ít truy cập, rẻ nhất | ~$0.015/GB-tháng |

> Hai chỗ con số hiện tại lệch với tài liệu ôn thi:
> - **gp3**: trần đã được nâng lên **80.000 IOPS / 2.000 MiB/s / 64 TiB**. Đề thi và phần lớn tài liệu vẫn dùng **16.000 IOPS / 1.000 MiB/s / 16 TiB**, nên gặp câu "cần hơn 16.000 IOPS" thì đáp án đề thi vẫn là io2.
> - **io2**: tài liệu cũ tách hai dòng "io2 — 64.000 IOPS / 1.000 MiB/s" và "io2 Block Express — 256.000 IOPS / 4.000 MiB/s". Từ 30/4/2025 mọi volume io2 đều là Block Express. Mốc 64.000 chỉ còn là trần provision khi gắn vào instance không thuộc thế hệ Nitro (và thực tế chỉ đạt 32.000).

**HDD cũng dùng cơ chế burst.** Throughput của st1 và sc1 tỷ lệ với dung lượng: st1 có baseline 40 MiB/s mỗi TiB và burst 250 MiB/s mỗi TiB (trần 500); sc1 là 12 và 80 MiB/s mỗi TiB (trần 250). Một volume st1 5 TiB chạy đều được 5 × 40 = 200 MiB/s và burst lên 500 MiB/s khi còn credit.

Định vị các loại volume (và Instance Store) trên mặt phẳng **IOPS × throughput** — vị trí càng lên cao bên phải càng mạnh, nhưng cũng càng đắt; SSD nằm trên (IOPS cao, latency ms→sub-ms), HDD nằm dưới (throughput tốt cho dữ liệu tuần tự nhưng IOPS thấp):

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 440" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Định vị các loại EBS và Instance Store theo IOPS và throughput</title>
  <desc>Biểu đồ phân tán: trục ngang là IOPS (thang log từ thấp đến rất cao), trục dọc là throughput (MB trên giây). SSD gp3 và io1 nằm vùng IOPS cao; io2 Block Express và Instance Store ở góc trên phải IOPS và throughput cực cao; HDD st1 và sc1 nằm dưới với IOPS thấp nhưng throughput tuần tự khá. Màu đậm hơn thể hiện chi phí cao hơn.</desc>
  <text x="16" y="24" font-size="14.5" font-weight="700" fill="currentColor">Định vị EBS — IOPS × throughput (đắt dần khi lên góc phải-trên)</text>
  <line x1="70" y1="60" x2="70" y2="360" stroke="currentColor" stroke-opacity="0.4"/>
  <line x1="70" y1="360" x2="680" y2="360" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="60" y="64" font-size="11" text-anchor="end" fill="currentColor" opacity="0.7">4000</text>
  <text x="60" y="214" font-size="11" text-anchor="end" fill="currentColor" opacity="0.7">1000</text>
  <text x="60" y="306" font-size="11" text-anchor="end" fill="currentColor" opacity="0.7">250</text>
  <text x="30" y="200" font-size="11" font-weight="700" fill="currentColor" transform="rotate(-90 30 200)" text-anchor="middle">Throughput (MB/s) →</text>
  <text x="375" y="392" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">IOPS (thang log) →</text>
  <g font-size="10.5" fill="currentColor" opacity="0.6" text-anchor="middle">
    <text x="150" y="378">500</text>
    <text x="310" y="378">16k</text>
    <text x="470" y="378">64k</text>
    <text x="620" y="378">256k+</text>
  </g>
  <line x1="70" y1="214" x2="680" y2="214" stroke="currentColor" stroke-opacity="0.12" stroke-dasharray="4 4"/>
  <line x1="70" y1="306" x2="680" y2="306" stroke="currentColor" stroke-opacity="0.12" stroke-dasharray="4 4"/>
  <text x="100" y="80" font-size="10.5" font-weight="700" fill="currentColor" opacity="0.55">SSD — IOPS cao, latency ms→sub-ms</text>
  <text x="100" y="340" font-size="10.5" font-weight="700" fill="currentColor" opacity="0.55">HDD — throughput tuần tự, IOPS thấp</text>
  <g>
    <circle cx="310" cy="290" r="13" fill="#3b82f6" fill-opacity="0.45" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="310" y="270" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">gp3</text>
    <text x="310" y="258" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">80k (đề thi 16k) · 2000 (đề thi 1000) · $$</text>
  </g>
  <g>
    <circle cx="470" cy="214" r="15" fill="#8b5cf6" fill-opacity="0.55" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="470" y="192" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">io1</text>
    <text x="470" y="180" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">64k · 1000 · $$$</text>
  </g>
  <g>
    <circle cx="624" cy="84" r="19" fill="#8b5cf6" fill-opacity="0.85" stroke="currentColor" stroke-opacity="0.35"/>
    <text x="624" y="118" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">io2 Block Express</text>
    <text x="624" y="131" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">256k · 4000 · $$$$</text>
  </g>
  <g>
    <circle cx="654" cy="64" r="15" fill="#10b981" fill-opacity="0.7" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="660" y="50" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Instance Store</text>
    <text x="660" y="146" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">triệu IOPS · µs · KHÔNG bền</text>
  </g>
  <g>
    <circle cx="150" cy="306" r="12" fill="#f59e0b" fill-opacity="0.5" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="150" y="334" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">st1</text>
    <text x="150" y="346" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">500 · 500 · $</text>
  </g>
  <g>
    <circle cx="110" cy="328" r="10" fill="#f59e0b" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="110" y="354" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">sc1</text>
  </g>
  <text x="70" y="416" font-size="10.5" fill="currentColor" opacity="0.7">Mỗi điểm: IOPS · throughput(MB/s) · chi phí. gp3 = default. Đề thi: trên 16k IOPS → io2 (thực tế gp3 đã lên 80k); 5 nines → io2 Block Express.</text>
</svg>

Sơ đồ vẽ theo bộ số **đề thi** (gp3 ở mốc 16k IOPS / 1.000 MiB/s, io2 tách khỏi io2 Block Express). Thứ tự tương đối giữa các loại vẫn đúng; riêng trần gp3 hiện nay đã dịch sang phải tới 80k như ghi chú ở trên.

### 3.2 gp3 vs gp2 — luôn chọn gp3

**gp2 buộc IOPS vào dung lượng.** Mỗi GiB cho 3 IOPS baseline (tối thiểu 100, tối đa 16.000 ở 5.334 GiB). Volume nhỏ hơn 1 TiB được **burst** lên 3.000 IOPS nhờ một "xô" **I/O credit**: lúc rảnh, xô được nạp 3 credit mỗi GiB mỗi giây; lúc cần hơn baseline, mỗi I/O vượt mức tiêu một credit. Xô chứa tối đa 5,4 triệu credit.

```
gp2 100 GiB:
  baseline          = 100 × 3            = 300 IOPS
  burst 3.000 IOPS  → tiêu 3.000 − 300   = 2.700 credit/giây
  xô đầy 5,4 triệu  ÷ 2.700              = 2.000 giây ≈ 33 phút
  nạp lại từ rỗng   = 5,4 triệu ÷ 300    = 18.000 giây = 5 giờ
```

Đó là lý do gp2 "khó dự đoán": test tải 10 phút thấy 3.000 IOPS, chạy thật sau 33 phút rớt còn 300 IOPS, tức chậm đi 10 lần, và phải rảnh 5 giờ mới đầy lại. Theo dõi bằng metric `BurstBalance` trên CloudWatch. Cách duy nhất để có IOPS ổn định cao hơn trên gp2 là mua thêm dung lượng mà mình không cần.

**gp3 tách IOPS và throughput khỏi dung lượng.** Volume nào cũng có sẵn **3.000 IOPS và 125 MiB/s**, chạy được liên tục, không có credit. Cần hơn thì trả thêm theo từng IOPS và từng MiB/s, với hai ràng buộc: tối đa 500 IOPS mỗi GiB và 0,25 MiB/s mỗi IOPS đã provision.

**So giá** (us-east-1, ~). Giá lưu gp3 là ~$0.08/GB-tháng so với ~$0.10 của gp2, tức rẻ hơn 20% ngay cả khi không mua thêm gì. Khoảng cách nới rộng khi cần hiệu năng cao trên volume nhỏ:

```
Cần 500 GiB, 8.000 IOPS, 250 MiB/s

gp2: muốn 8.000 IOPS phải mua 8.000 ÷ 3 ≈ 2.667 GiB
     2.667 × $0.10                                  ≈ $267/tháng
gp3: 500 × $0.08                                    =  $40
     + (8.000 − 3.000) IOPS  × $0.005               =  $25
     + (250 − 125) MiB/s     × $0.06                =   $7,5
                                                    ≈ $72,5/tháng
io2: 500 × $0.125 + 8.000 × $0.065                  ≈ $582,5/tháng
```

Cùng hiệu năng, gp3 rẻ hơn gp2 khoảng 3,7 lần và rẻ hơn io2 8 lần. io2 chỉ đáng tiền khi cần thứ gp3 không có (§3.3).

**Migrate** gp2 → gp3 bằng `modify-volume` (tính năng Elastic Volumes): đổi type, IOPS, throughput trong lúc volume đang gắn và đang chạy, không downtime.

### 3.3 io2 Block Express

io2 là loại volume mà bạn **provision đúng số IOPS mình cần** và AWS cam kết giao đủ. So với gp3, nó hơn ở ba điểm:

- **IOPS và throughput cao hơn**: tới 256.000 IOPS và 4.000 MiB/s trên một volume, với tỷ lệ 1.000 IOPS mỗi GiB (muốn 256.000 IOPS cần volume từ 256 GiB).
- **Latency thấp và đều hơn**: trung bình dưới 0,5 ms cho I/O 16 KiB, so với "một chữ số ms" của gp3. "Sub-ms" trong đề thi nghĩa là mức này.
- **Durability 99,999%** (5 nines), trong khi gp3, gp2, io1, st1, sc1 đều là 99,8–99,9%. Diễn ra số: trong một năm, cứ 100.000 volume io2 thì dự kiến hỏng 1 cái, còn 1.000 volume gp3 thì hỏng tối đa 2 cái. Chênh nhau 100–200 lần.

Điều kiện: muốn đạt 256.000 IOPS phải gắn vào instance thế hệ Nitro (ví dụ r5b, x2idn), và instance đó phải có trần EBS đủ lớn (xem [[ch2-01-compute-performance]] §7.5 — trần băng thông EBS nằm ở instance, không ở volume).

Use case: Oracle / SQL Server giao dịch rất dày, SAP HANA. Dấu hiệu trong đề: "sub-millisecond latency", "mission-critical", "highest durability", "more than 16,000 IOPS".

### 3.4 EBS Multi-Attach

Multi-Attach cho phép gắn **một** volume vào nhiều instance cùng lúc, tất cả đều có quyền đọc và ghi.

- Chỉ io1/io2, các instance phải **cùng AZ**, tối đa **16 instance** (thế hệ Nitro). Không dùng làm boot volume được.
- App phải tự handle concurrent write, tức cần **cluster-aware filesystem** như GFS2 hoặc OCFS2.
- **Không** dùng cho mục đích "share file" — dùng EFS.

**Vì sao ext4/xfs gắn vào hai máy lại hỏng dữ liệu?** Một filesystem thông thường giữ sổ sách của nó (block nào còn trống, file nào nằm ở block nào) trong RAM của OS và mặc định rằng **chỉ có mình nó** ghi xuống đĩa. Gắn cùng volume vào hai instance thì có hai bản sổ sách độc lập trong hai bộ nhớ:

```
Instance A: thấy block 1.000 còn trống → cấp cho file a.log → ghi
Instance B: (không biết A vừa làm gì) thấy block 1.000 còn trống → cấp cho file b.log → ghi đè
→ a.log chứa dữ liệu của b.log, sổ sách trên đĩa mâu thuẫn, filesystem hỏng
```

Multi-Attach chỉ chia sẻ **block**, nó không điều phối ai ghi lúc nào. Cluster-aware filesystem giải quyết bằng một bộ khoá phân tán: node nào muốn sửa sổ sách phải xin khoá trước. EFS giải quyết theo cách khác hẳn: chỉ có **server NFS** chạm vào đĩa, client gửi yêu cầu "ghi file này" qua mạng. Vì vậy "nhiều EC2 dùng chung file" là bài toán của EFS, còn Multi-Attach chỉ dành cho phần mềm cluster tự lo việc khoá (ví dụ cụm database kiểu shared-disk).

### 3.5 Snapshot

**Snapshot** là bản sao của volume tại một thời điểm, AWS lưu trong S3 (bạn không thấy nó trong bucket của mình, chỉ quản lý qua API của EBS). Giá ~$0.05/GB-tháng ở us-east-1.

**Incremental nghĩa là gì.** Snapshot đầu tiên chép toàn bộ block có dữ liệu. Mỗi snapshot sau chỉ chép **những block đã thay đổi** kể từ lần trước, phần còn lại nó *tham chiếu* tới block đã lưu ở snapshot cũ.

```
Snap A: volume có 10 GiB dữ liệu             → lưu 10 GiB
Snap B: 4 GiB bị sửa                         → lưu  4 GiB, tham chiếu 6 GiB của A
Snap C: thêm 2 GiB mới                       → lưu  2 GiB, tham chiếu B và A
Tổng trả tiền: 10 + 4 + 2 = 16 GiB (không phải 10 + 10 + 12 = 32 GiB)
```

**Xoá snapshot ở giữa chuỗi có sao không?** Không. Khi xoá Snap A, EBS chỉ bỏ phần dữ liệu **không còn snapshot nào tham chiếu** (4 GiB đã bị sửa); 6 GiB mà Snap B còn cần được giữ lại và tính cho B. Snapshot nào còn tồn tại thì luôn restore được đầy đủ, nên chỉ cần giữ bản mới nhất. Hệ quả phụ: xoá snapshot cũ chưa chắc giảm được tiền.

**Restore và lazy load.** Volume tạo từ snapshot dùng được ngay lập tức, nhưng dữ liệu **chưa nằm trên volume**: block nào được đọc lần đầu thì EBS mới kéo block đó từ S3 về. Lần đọc đầu của mỗi block vì thế chậm hơn hẳn mức bình thường, và app thấy latency cao cho tới khi mọi block nó cần đã được chạm qua. Hai cách tránh:

- **Fast Snapshot Restore (FSR)**: bật cho một snapshot tại một AZ cụ thể, volume tạo ra ở AZ đó đủ hiệu năng ngay từ đầu. Tính tiền theo giờ cho mỗi cặp snapshot–AZ: ~$0.75/giờ, tức khoảng 1 × 720 giờ × $0.75 = **$540/tháng**. Nên chỉ bật cho snapshot cần restore gấp (golden AMI, DR).
- **Tự "làm nóng"**: đọc toàn bộ volume một lượt bằng `dd` hoặc `fio` trước khi đưa vào phục vụ. Miễn phí nhưng mất thời gian.

Hai điểm còn lại:
- **Cross-region**: volume không tự nhân sang region khác được. Phải **copy snapshot** sang region đích rồi tạo volume từ bản copy.
- **EBS direct APIs**: đọc/ghi nội dung snapshot theo từng block mà không cần tạo volume, dành cho các công cụ backup.

### 3.6 Encryption

- Mã hoá bằng AWS managed key hoặc customer managed KMS key (xem [[ch3-03-data-protection]]).
- Có thể bật "encryption by default" ở mức region: mọi volume mới tạo trong region đó tự được mã hoá.
- Snapshot đi theo volume: snapshot của volume đã mã hoá thì được mã hoá, và volume tạo từ snapshot đó cũng vậy.
- Mã hoá/giải mã diễn ra trên host chạy instance, nên ảnh hưởng tới latency rất nhỏ (dưới 1% trên instance Nitro).

---

## 4. Instance Store

**Instance Store** là ổ NVMe **cắm vật lý trong chính host** đang chạy instance. Không có chặng mạng nào giữa instance và đĩa, đó là nguyên nhân của cả ưu điểm lẫn nhược điểm:

- **Nhanh hơn EBS**: latency ở mức micro-giây (EBS gp3 là mili-giây, io2 là dưới 0,5 ms), IOPS từ hàng trăm nghìn tới hàng triệu tuỳ instance size. Không tính tiền riêng, đã nằm trong giá instance.
- **Không bền**: dữ liệu gắn với host đó. Instance **reboot** thì dữ liệu còn. Instance **stop, hibernate, terminate**, đổi instance type, hoặc đĩa/host hỏng thì dữ liệu **mất**, vì lần start sau instance có thể nằm trên host khác.
- Không tháo ra gắn sang instance khác được, không snapshot được như EBS.

Use case: cache layer, temporary scratch space, và các hệ NoSQL **tự replicate ở tầng ứng dụng** (Cassandra, Redis cluster) — mất một node thì dữ liệu vẫn còn ở node khác.

> Bẫy thi: "Cần low latency và data persistence" → **không phải instance store**. Là **io2 Block Express** hoặc **EBS io2**.

---

## 5. EFS — shared file

**EFS (Elastic File System)** là filesystem NFS do AWS quản lý. Bạn tạo file system, đặt một **mount target** (một địa chỉ IP) trong mỗi AZ, rồi nhiều EC2, container hay Lambda cùng mount vào và thấy chung một cây thư mục. Dung lượng tự co giãn, trả tiền theo GB đang lưu, không phải provision trước.

File system kiểu Regional lưu dữ liệu đồng thời ở nhiều AZ. Cái giá của việc đó là latency: khoảng **1 ms cho đọc và 2,7 ms cho ghi**, cao hơn EBS vài lần. Nhớ con số này khi đọc §5.4 và §6.1.

### 5.1 Performance modes

- **General Purpose** (default): latency thấp nhất, scale tới hàng nghìn client. AWS khuyến nghị dùng cho mọi file system.
- **Max I/O**: thế hệ cũ, thiết kế cho workload song song cực nhiều client, đổi lại latency mỗi thao tác cao hơn. Không hỗ trợ file system One Zone hay Elastic throughput. Hầu như không cần nữa (deprecated path); đề thi vẫn có thể nhắc tới như một đáp án nhiễu.

### 5.2 Throughput modes

Throughput mode quyết định file system được phép đẩy bao nhiêu MiB/s, và bạn trả tiền cho việc đó theo cách nào. Có ba mode.

**Bursting — throughput đi theo dung lượng.** Không trả thêm gì cho throughput. Mỗi GiB lưu ở lớp Standard cho **50 KiB/s baseline** (tương đương 50 MiB/s mỗi TiB). Cơ chế credit giống gp2: dùng dưới baseline thì tích **burst credit**, có credit thì được burst lên **100 MiB/s mỗi TiB, tối thiểu 100 MiB/s**. Thao tác đọc được tính nhẹ bằng 1/3 thao tác ghi, nên con số cho đọc gấp ba.

```
File system 100 GiB (Standard):
  baseline ghi   = 100 GiB × 50 KiB/s        ≈ 5 MiB/s   (đọc: ~15 MiB/s)
  burst          = 100 MiB/s (mức sàn cho mọi file system dưới 1 TiB)
  rảnh 24 giờ tích được 5 MiB/s × 86.400 s   = 432.000 MiB credit
  → burst 100 MiB/s được 432.000 ÷ 100       = 4.320 giây = 72 phút mỗi ngày

File system 1 TiB:  baseline 50 MiB/s, burst 100 MiB/s được 12 giờ mỗi ngày
File system 20 GiB: baseline theo công thức chỉ ~1 MiB/s (cũng là mức sàn AWS cấp)
```

Bẫy vận hành kinh điển nằm ở dòng cuối: file system nhỏ mà bị đọc/ghi liên tục sẽ cháy hết credit (metric `BurstCreditBalance` về 0) rồi rớt về vài MiB/s, app "đang chạy bình thường bỗng dưng treo".

**Provisioned — mua một mức throughput cố định.** Bạn chọn con số MiB/s, không phụ thuộc dung lượng hay credit. Trả ~$6 cho mỗi MiB/s mỗi tháng (us-east-1), tính trên phần vượt mức baseline đã kèm theo dung lượng.

**Elastic — tự co giãn, trả theo lượng dữ liệu đã chuyển.** Không có credit, không phải chọn con số nào. File system tự nâng throughput theo nhu cầu, và bạn trả theo **GB thực sự đọc/ghi**: ~$0.03/GB đọc, ~$0.06/GB ghi (us-east-1). Hiện là mode mặc định và được AWS khuyến nghị. **Nên chọn default này.**

**Khi nào chọn cái nào?** So bằng tiền với cùng file system 100 GiB:

```
Tải dồn theo đợt: mỗi ngày đọc 100 GB + ghi 20 GB, gói trong vài đợt ngắn cần ~100 MiB/s
  Elastic:      100 × 30 × $0.03 + 20 × 30 × $0.06   = 90 + 36 = $126/tháng
  Provisioned:  (100 − 5 MiB/s đã kèm) × $6          = $570/tháng   ← trả cho cả lúc ngồi không
  Bursting:     $0 thêm, nhưng chỉ burst được 72 phút/ngày

Tải đều: ghi liên tục 100 MiB/s suốt tháng ≈ 253.000 GB
  Elastic:      253.000 × $0.06                      ≈ $15.200/tháng
  Provisioned:  vẫn                                    $570/tháng
```

| Mode | Throughput đến từ đâu | Trả tiền | Chọn khi |
|------|----------------------|----------|----------|
| **Elastic** | Tự co giãn theo nhu cầu | Theo GB đọc/ghi | Tải thất thường, khó đoán, đỉnh cao nhưng ngắn (trung bình ≤ 5% so với đỉnh). Mặc định. |
| **Provisioned** | Con số bạn đặt | Theo MiB/s đã đặt | Tải cao và **đều**, biết trước cần bao nhiêu, dữ liệu ít nên baseline không đủ |
| **Bursting** | Tỷ lệ với dung lượng Standard | Không trả thêm | File system lớn (hàng TiB) mà nhu cầu throughput tăng theo dung lượng; chấp nhận quản lý credit |

Một giới hạn đáng nhớ cho §6: dù file system có thể đạt nhiều GiB/s tổng cộng, **mỗi client** chỉ đẩy được tối đa 500 MiB/s (1.500 MiB/s với Elastic và EFS client đời mới).

### 5.3 Storage classes

Giống S3, EFS có nhiều lớp lưu trữ đánh đổi giá lưu lấy phí và độ trễ khi đọc:

- **Standard**: dữ liệu nóng, nằm trên SSD. ~$0.30/GB-tháng (us-east-1) — đắt hơn S3 Standard khoảng 13 lần, đó là giá của việc có một filesystem dùng chung.
- **Infrequent Access (IA)**: dữ liệu vài tháng mới đọc một lần. ~$0.016/GB-tháng, rẻ hơn Standard khoảng 95% (tài liệu cũ ghi 92%, theo mức giá $0.025 trước đây). Đổi lại mỗi lần đọc tốn phí retrieval ~$0.01/GB và latency byte đầu tiên lên tới hàng chục ms.
- **Archive**: dữ liệu mỗi năm đọc vài lần. ~$0.008/GB-tháng, lưu tối thiểu 90 ngày, chỉ dùng được với Elastic throughput.
- **One Zone**: không phải một lớp lưu trữ mà là **kiểu file system** chỉ nằm trong 1 AZ (trái với Regional). Rẻ hơn (~$0.16/GB-tháng cho Standard), nhưng mất AZ là mất dữ liệu. Đề thi hay viết "One Zone" và "One Zone-IA" như hai storage class.
- **Lifecycle policy**: tự chuyển file sang IA sau N ngày không truy cập (rồi sang Archive), và có thể tự kéo về Standard khi file được đọc lại.

### 5.4 Use case EFS

- Web tier shared content (PHP/WordPress): nhiều web server sau load balancer cùng đọc một thư mục upload.
- ML training shared dataset, nếu mỗi máy training cần dưới ~1 GB/s (trần mỗi client ở §5.2). Cao hơn thì sang FSx for Lustre.
- Container persistent storage: ECS/EKS/Fargate mount EFS để pod chạy ở AZ nào cũng thấy cùng dữ liệu.
- Home directory cho EC2 cluster.

> EFS **không** tối ưu cho database — latency vài ms mỗi thao tác ghi (so với dưới 1 ms của io2), throughput mỗi client có trần. DB cần EBS hoặc io2.

---

## 6. FSx — purpose-built file system

EFS là filesystem do AWS tự thiết kế và chỉ nói NFS. **FSx** thì ngược lại: AWS chạy hộ bạn bốn hệ filesystem **có sẵn trên thị trường**, mỗi cái cho một nhóm workload đã quen với nó. Chọn FSx nào gần như chỉ phụ thuộc vào câu hỏi "workload này đang nói giao thức gì, cần tính năng của hệ nào".

| Variant | Protocol | Use case |
|---------|----------|----------|
| **FSx for Lustre** | POSIX (Lustre) | HPC, ML training, throughput hàng chục tới hàng trăm GB/s |
| **FSx for Windows File Server** | SMB, AD integration | Windows workload, .NET, shared drive cho user |
| **FSx for NetApp ONTAP** | NFS/SMB/iSCSI | Migrate workload đang dùng NetApp, snapshot, dedup |
| **FSx for OpenZFS** | NFS | Snapshot, clone instant, low latency |

### 6.1 FSx for Lustre

**Lustre là gì.** Một filesystem **song song** mã nguồn mở, sinh ra cho siêu máy tính, nơi hàng nghìn máy cùng đọc/ghi một tập dữ liệu khổng lồ. **HPC** (high-performance computing) là tên chung của loại workload đó: mô phỏng khí tượng, giải trình tự gen, render phim, và gần đây là training model ML.

**Vì sao nhanh hơn EFS.** Khác biệt nằm ở đường đi của dữ liệu:

- Với **EFS**, mọi thao tác của client đi qua giao thức NFS tới dịch vụ, và mỗi lần ghi phải được lưu bền ở nhiều AZ trước khi báo xong. Thiết kế đó ưu tiên độ bền và tính sẵn sàng, nên latency là mili-giây và mỗi client có trần 500–1.500 MiB/s.
- Với **Lustre**, dữ liệu được rải trên nhiều **storage server**, mỗi server có đĩa riêng. Client hỏi một **metadata server** "file này nằm ở đâu", rồi **nói chuyện thẳng và song song** với các storage server chứa nó. Một file lớn còn được **stripe** (cắt thành khúc, mỗi khúc nằm trên một server khác nhau), nên đọc một file 100 GB là kéo cùng lúc từ nhiều server. Thêm server thì throughput cộng dồn. Toàn bộ nằm trong **một AZ**, không có chặng đồng bộ liên AZ, nên latency dưới 1 ms.

**Con số.** Throughput của FSx for Lustre **tỷ lệ với dung lượng** bạn cấp. Loại Persistent 2 (SSD) cho chọn 125, 250, 500 hoặc 1.000 MB/s cho mỗi TiB; Scratch là 200 MB/s mỗi TiB (burst tới 1.300).

```
Dataset 20 TB (≈ 18,2 TiB), muốn > 10 GB/s    → cấp file system 24 TiB

Persistent 2 mức 500:   24 TiB ×   500 MB/s = 12.000 MB/s = 12 GB/s    ✓
Persistent 2 mức 1.000: 24 TiB × 1.000 MB/s = 24 GB/s                  ✓  (dư)
Scratch:                24 TiB ×   200 MB/s =  4,8 GB/s baseline       ✗  (chỉ burst mới tới)

Đọc hết 20 TB ở 10 GB/s mất 20.000 GB ÷ 10 GB/s = 2.000 giây ≈ 33 phút.
```

Với cùng cách tính, một file system 100 TiB mức 1.000 đạt 100 GB/s; tài liệu AWS mô tả mức tối đa là "nhiều TB/s và hàng triệu IOPS". Một client đơn lẻ kéo được tới 100 Gbps (khoảng 12,5 GB/s), gấp khoảng 8 lần trần mỗi client của EFS. Đó là ý nghĩa cụ thể của cụm "high throughput" khi đề thi nhắc tới Lustre.

**Hai kiểu deployment:**

| | **Scratch** | **Persistent** |
|--|-------------|----------------|
| Dữ liệu có được nhân bản? | **Không**. Một file server hỏng là mất phần dữ liệu trên server đó | Có, nhân bản **trong cùng AZ**; server hỏng được thay tự động trong vài phút |
| Dùng cho | Xử lý ngắn hạn, dữ liệu gốc đã nằm ở S3 nên mất cũng dựng lại được | Workload chạy dài ngày, dữ liệu phải giữ |
| Giá | Rẻ hơn | Đắt hơn |

"Scratch = max perf" trong tài liệu cũ nên hiểu là "rẻ nhất cho mỗi GB/s khi chỉ cần chạy tạm", vì nó bỏ phần nhân bản; mức throughput cao nhất mỗi TiB hiện thuộc về Persistent 2.

**Tích hợp S3.** Gắn file system với một bucket thì các object hiện ra như file trong thư mục Lustre. Nội dung chỉ được kéo từ S3 về lần đầu có máy đọc tới file đó; kết quả ghi ra có thể export ngược về S3. Nhờ vậy S3 làm kho lưu lâu dài giá rẻ, còn Lustre làm "bộ đệm tốc độ cao" chỉ tồn tại trong lúc chạy job.

Use case điển hình: ML training với dataset 100 TB ở S3, dùng FSx Lustre làm working set.

**Khi nào Lustre, khi nào EFS:**

| | **EFS** | **FSx for Lustre** |
|--|---------|--------------------|
| Giao thức | NFS — máy Linux nào cũng mount được, cả Lambda và Fargate | Lustre — client phải cài Lustre client |
| Latency | ~1 ms đọc, ~2,7 ms ghi | Dưới 1 ms |
| Throughput mỗi client | 500–1.500 MiB/s | Tới ~12,5 GB/s |
| Throughput tăng bằng cách nào | Tự co giãn (Elastic) | Cấp thêm dung lượng |
| Số AZ | Nhiều AZ (Regional) | Một AZ |
| Dung lượng | Tự co giãn, trả theo GB dùng | Cấp trước (lớp SSD) |
| Đọc thẳng dữ liệu từ S3 | Không | Có |

> Bẫy thi: *"HPC", "ML training", "hàng trăm/nghìn node đọc song song", "xử lý dữ liệu nằm sẵn trong S3", "sub-millisecond + throughput cao"* → **FSx for Lustre**. *"Nhiều web server/container dùng chung file", "multi-AZ", "không muốn quản lý dung lượng"* → **EFS**. Lustre không phải câu trả lời cho yêu cầu HA liên AZ.

### 6.2 FSx for Windows

Một Windows file server được quản lý sẵn, dành cho workload cần đúng "ổ mạng Windows":

- Native **SMB** (giao thức chia sẻ file của Windows) và **NTFS ACL** (phân quyền theo user/group kiểu Windows). EFS không có hai thứ này.
- Tích hợp **Active Directory** (AWS Managed Microsoft AD hoặc AD on-prem), nên user đăng nhập bằng tài khoản domain sẵn có.
- **Single-AZ** hoặc **Multi-AZ**: bản Multi-AZ có một file server dự phòng ở AZ khác và tự failover.
- **DFS Namespaces**: tính năng của Windows gom nhiều file share dưới một đường dẫn chung (`\\corp\share\...`), nhờ đó ghép được nhiều file system, kể cả ở region khác, thành một cây thư mục cho người dùng.

### 6.3 FSx for NetApp ONTAP

ONTAP là hệ điều hành storage của hãng NetApp, rất phổ biến trong datacenter doanh nghiệp.

- Use case migration: app và quy trình vận hành đã quen với tính năng NetApp như SnapMirror (replicate giữa các hệ ONTAP), FlexClone (nhân bản volume tức thì, không chép dữ liệu), dedup và nén.
- Hỗ trợ NFS, SMB và iSCSI **trên cùng một filesystem**, nên máy Linux, máy Windows và cả ứng dụng cần block device đều dùng chung được. Đây là điểm phân biệt với ba FSx còn lại.
- Storage tiering: dữ liệu nóng nằm trên SSD, dữ liệu nguội tự chuyển sang capacity pool rẻ hơn.

### 6.4 FSx for OpenZFS

Dành cho workload Linux đang chạy trên ZFS hoặc cần tính năng của ZFS: snapshot và clone tức thì, nén dữ liệu, latency thấp qua NFS. Trong đề SAA nó thường chỉ xuất hiện như một lựa chọn để loại trừ; dấu hiệu chọn là chữ "ZFS" trong đề.

---

## 7. S3 — object storage

S3 lưu **object** (dữ liệu + metadata) trong **bucket**, mỗi object có một **key** là chuỗi tên đầy đủ, ví dụ `logs/2026/10/13/app.log`. Không có thư mục thật: dấu `/` chỉ là một ký tự trong key, console hiển thị thành thư mục cho dễ nhìn. Nền tảng S3 xem lại ở CLF [[05-s3]]; section này tập trung vào hai thứ đề SAA hỏi về performance và cost: **chọn storage class** và **tốc độ request**.

### 7.1 Storage classes

Mọi class đều có durability 99,999999999% (11 số 9). Chúng khác nhau ở **ba khoản tiền** kéo ngược chiều nhau:

- **Giá lưu** mỗi GB mỗi tháng: class càng "lạnh" càng rẻ.
- **Phí retrieval** mỗi GB khi đọc ra: class càng lạnh càng đắt, và hai class lạnh nhất còn bắt chờ.
- **Thời gian lưu tối thiểu (min duration)**: xoá, ghi đè hoặc chuyển class sớm hơn mốc này thì **vẫn bị tính tiền cho đủ số ngày**. Các class có mốc này cũng thường tính mỗi object tối thiểu 128 KB.

Nói gọn: class lạnh là một vụ cá cược rằng dữ liệu sẽ nằm yên đủ lâu và hiếm khi bị đọc. Cược sai thì đắt hơn Standard.

| Class | Use case | Min duration | Retrieval | Giá lưu (~$/GB-tháng, us-east-1) | Phí retrieval (~$/GB) |
|-------|----------|--------------|-----------|----------------------------------|------------------------|
| **Standard** | Hot, đọc thường xuyên | — | Ngay (ms) | 0.023 | Không |
| **Intelligent-Tiering** | Pattern không biết trước | — | Ngay (tự chuyển tier) | 0.023 → 0.0125 → 0.004 theo tier | Không; có phí monitoring mỗi object |
| **Standard-IA** | Vẫn cần đọc ngay nhưng hiếm (khoảng mỗi tháng một lần) | 30 ngày | Ngay (ms) | 0.0125 | 0.01 |
| **One Zone-IA** | Bản sao phụ, dữ liệu tái tạo được; chỉ 1 AZ | 30 ngày | Ngay (ms) | 0.01 | 0.01 |
| **Glacier Instant Retrieval** | Archive nhưng thỉnh thoảng cần đọc ngay (khoảng mỗi quý một lần) | 90 ngày | Ngay (ms) | 0.004 | 0.03 |
| **Glacier Flexible Retrieval** | Archive, chờ được | 90 ngày | Expedited 1–5 phút · Standard 3–5 giờ · Bulk 5–12 giờ | 0.0036 | Standard 0.01 · Bulk miễn phí |
| **Glacier Deep Archive** | Compliance lưu nhiều năm | 180 ngày | Standard trong 12 giờ · Bulk trong 48 giờ | 0.00099 | Standard 0.02 · Bulk 0.0025 |

**Tính thử cho 1 TB (1.000 GB) lưu một tháng:**

```
Standard               1.000 × $0.023    = $23
Standard-IA            1.000 × $0.0125   = $12,5
One Zone-IA            1.000 × $0.01     = $10
Glacier Instant        1.000 × $0.004    = $4
Glacier Flexible       1.000 × $0.0036   = $3,6
Glacier Deep Archive   1.000 × $0.00099  ≈ $1      ← rẻ hơn Standard ~23 lần

Đọc lại toàn bộ 1 TB một lần:
Standard-IA      + 1.000 × $0.01 = +$10   → tháng đó $22,5, gần bằng Standard
Glacier Instant  + 1.000 × $0.03 = +$30   → tháng đó $34, đắt hơn Standard
Deep Archive     + 1.000 × $0.02 = +$20   và phải chờ tới 12 giờ
```

Từ đó có luôn điểm hoà vốn: Standard-IA chỉ rẻ hơn Standard khi mỗi tháng bạn đọc ra **ít hơn khoảng một lần toàn bộ dữ liệu**; Glacier Instant Retrieval thì phải ít hơn nhiều nữa. Đó là ý nghĩa của "infrequent".

**Min duration cắn thế nào:**

```
Ghi 1.000 GB vào Standard-IA, xoá sau 10 ngày:
  bị tính đủ 30 ngày             = $12,5
  để ở Standard 10 ngày thôi     = $23 × 10/30 ≈ $7,7
→ dữ liệu sống ngắn mà đưa vào IA thì đắt hơn để nguyên ở Standard
```

**Intelligent-Tiering tự chuyển tier bằng cách nào.** S3 ghi nhận lần truy cập gần nhất của **từng object**. Object không được đọc 30 ngày liên tiếp thì chuyển xuống tier Infrequent Access; 90 ngày thì xuống Archive Instant Access; có ai đọc thì nó quay ngay về Frequent Access. Cả ba tier đều đọc được tức thì, và **không có phí retrieval, không có min duration**. (Có thêm hai tier archive tuỳ chọn, bật lên thì object nằm im 90/180 ngày sẽ xuống mức giá Glacier Flexible/Deep Archive nhưng phải restore mới đọc được.)

Cái giá là **phí monitoring ~$0.0025 cho mỗi 1.000 object mỗi tháng**. 1 TB gồm một triệu object 1 MB tốn thêm $2,5/tháng, không đáng kể. Nhưng object dưới 128 KB **không được theo dõi và không bao giờ đổi tier** (luôn ở mức giá Frequent), nên bucket toàn file nhỏ sẽ không tiết kiệm được gì.

Chọn nhanh: biết chắc pattern truy cập thì dùng lifecycle chuyển thẳng sang class phù hợp; **không biết hoặc pattern thay đổi** thì Intelligent-Tiering.

### 7.2 Lifecycle policies

Lifecycle là bộ rule để S3 **tự** đổi class hoặc xoá object theo tuổi, không cần code:

- Tự transition class theo tuổi object (ví dụ 30 ngày sang Standard-IA, 365 ngày sang Deep Archive). Chỉ đi được theo chiều "nóng xuống lạnh".
- Tự expire (delete) sau N ngày.
- Lọc theo prefix, tag, và kích thước object. Mặc định rule transition bỏ qua object dưới 128 KB, vì phí transition tính theo từng object sẽ lớn hơn khoản tiết kiệm.
- Tránh lỗi: nếu bucket bật versioning, phải cấu hình rule riêng cho **non-current versions** (các bản cũ). Rất dễ quên, và các bản cũ cứ nằm đó tính tiền ở Standard.

Ví dụ thiết kế theo tuổi dữ liệu, với một app ghi log 200 MB/s liên tục:

```
200 MB/s × 86.400 giây = 17,28 TB mỗi ngày

0–30 ngày     tra cứu nhanh, thường xuyên   → Standard             (luôn có ~518 TB ở đây)
30 ngày–1 năm thỉnh thoảng query            → Standard-IA hoặc Glacier Instant Retrieval
1–7 năm       compliance, gần như không đọc → Glacier Deep Archive
sau 7 năm     → expire
```

### 7.3 Performance

S3 là dịch vụ HTTP: mỗi request tốn khoảng **100–200 ms** tới byte đầu tiên, tức chậm hơn EBS hai bậc độ lớn. Nó không dành cho workload cần latency thấp từng thao tác. Thế mạnh của nó là **làm rất nhiều request song song**.

- Hạn mức: ít nhất **3.500 PUT/COPY/POST/DELETE và 5.500 GET/HEAD mỗi giây cho mỗi prefix**.
- **Prefix** là phần đầu của key, ví dụ `logs/2024/01/`. Không giới hạn số prefix trong một bucket, nên rải request ra nhiều prefix thì hạn mức cộng dồn (§7.4 giải thích vì sao).
- Một kết nối đơn lẻ chỉ đạt cỡ 80–90 MB/s, nên file lớn phải chia nhỏ: **multipart upload** cho file trên 100 MB (§7.5), và **byte-range fetch** để tải song song nhiều khúc của một object bằng header `Range`.
- **S3 Transfer Acceleration**: client upload tới edge location gần nhất của CloudFront, từ đó dữ liệu đi trên mạng backbone của AWS về bucket thay vì đi internet công cộng. Có ích khi user ở xa region của bucket; cùng region thì không nhanh hơn.

```
Cần phục vụ 20.000 GET/giây:   20.000 ÷ 5.500 = 3,6  → rải đều trên ít nhất 4 prefix
Cần ghi 12.000 PUT/giây:       12.000 ÷ 3.500 = 3,4  → ít nhất 4 prefix
10 prefix đọc song song:       10 × 5.500 = 55.000 GET/giây
```

**Vậy "S3 scale vô hạn" nghĩa là gì?** Nghĩa là **không có trần** cho tổng dung lượng của bucket, số object, số prefix, và do đó cho tổng số request mỗi giây hay tổng throughput khi bạn song song hoá đủ rộng (AWS ghi nhận các data lake đạt nhiều terabit mỗi giây khi gộp nhiều instance). Những thứ **có trần**: request mỗi giây trên **một** prefix, tốc độ của **một** kết nối, latency của **một** request, và kích thước một object (đề thi: 5 TB; hiện tại đã nâng lên 50 TB). "Vô hạn" là theo chiều ngang, không phải cho từng request.

### 7.4 Tránh hot prefix

**Vì sao giới hạn tính theo prefix.** S3 giữ một bảng chỉ mục khổng lồ ánh xạ key tới vị trí dữ liệu, và bảng đó được **chia thành nhiều partition theo dải key** (cùng ý tưởng với range partitioning ở [[foundations-05-partitioning-and-sharding]]). Các key có chung phần đầu nằm cạnh nhau, tức cùng partition, và mỗi partition phục vụ được khoảng 3.500 ghi / 5.500 đọc mỗi giây. Khi một dải key bị dồn tải kéo dài, S3 **tự tách** partition đó làm đôi, ở bất kỳ độ sâu nào của key. Việc tách diễn ra dần dần chứ không tức thì; trong lúc đó request vượt mức nhận lỗi **`503 Slow Down`**.

Trước 2018: hạn mức thấp hơn nhiều và S3 khuyên hash đầu key (`a1b2c3-2024-01-01.log` thay vì `2024-01-01.log`) để các key rải đều qua nhiều partition ngay từ đầu.

**Sau 2018**: với hạn mức 3.500/5.500 và cơ chế tự tách, AWS đã bỏ khuyến nghị đó. Đặt key theo ngày tháng tuần tự là bình thường, **không cần** hashing nữa.

Hai câu sau đây không mâu thuẫn với điều trên, chúng nói về trường hợp tải rất cao:

- Nếu tải trên **một** prefix vượt 5.500 GET/s (hoặc 3.500 PUT/s), hãy thiết kế key để tải chia ra nhiều prefix **có ý nghĩa** (`logs/2024/01/01/`, `logs/2024/01/02/`, hoặc theo tenant, theo shard). Mục đích là song song hoá, không phải ngẫu nhiên hoá.
- Vì việc tách partition cần thời gian, tải tăng vọt đột ngột vẫn có thể gặp `503 Slow Down` vài phút đầu. Client phải retry với exponential backoff (SDK của AWS làm sẵn).

### 7.5 Multipart upload

Multipart upload cắt một file thành nhiều **part**, upload các part độc lập và song song, rồi S3 ghép lại thành một object. Lợi hai đường: nhanh hơn vì nhiều kết nối chạy cùng lúc, và part nào lỗi thì chỉ gửi lại part đó thay vì cả file.

- > 100 MB: nên multipart.
- > 5 GB: bắt buộc multipart (một lệnh PUT đơn tối đa 5 GB).
- Tối đa 10.000 part, mỗi part 5 MB – 5 GB (part cuối được nhỏ hơn).
- Part của một upload dang dở vẫn nằm trong bucket và **vẫn tính tiền** dù không hiện ra như object → đặt lifecycle rule "abort incomplete multipart upload" để dọn.

```
File 5 GB qua một kết nối ~85 MB/s:              5.120 MB ÷ 85     ≈ 60 giây
Chia 52 part 100 MB, chạy 10 part song song:     ≈ 60 ÷ 10         ≈ 6 giây
(nếu băng thông của client đủ; thường client mới là nút cổ chai)
```

### 7.6 Strong consistency

Sau Dec 2020: read-after-write strong cho mọi operation (xem [[foundations-02-consistency-models]]). Nghĩa là PUT thành công xong thì GET hay LIST ngay sau đó chắc chắn thấy bản mới. Không còn workaround nào cần làm, và không tốn thêm tiền hay hiệu năng.

### 7.7 S3 Select / Athena

Cả hai đều chạy SQL trên dữ liệu nằm trong S3 mà không cần tải file về, khác nhau ở phạm vi:

- **S3 Select**: SQL trên **một** object (CSV/JSON/Parquet). S3 lọc ngay phía server và chỉ trả về các dòng/cột khớp, nên giảm lượng dữ liệu phải truyền. Lưu ý: S3 Select **không còn mở cho khách hàng mới** (khách cũ vẫn dùng được); đề thi cũ vẫn có thể nhắc tới, còn thiết kế mới thì dùng Athena.
- **Athena**: SQL trên **nhiều** object, có schema khai báo trong Glue Data Catalog. Trả tiền theo lượng dữ liệu query phải quét.
- Parquet/ORC tốt hơn CSV/JSON cho analytics vì lưu **theo cột** và có nén: query chỉ cần 3 trong 50 cột thì chỉ đọc đúng 3 cột đó, vừa nhanh hơn vừa ít tiền quét hơn. Chi tiết ở [[ch2-06-data-ingestion-analytics]] §4.

---

## 8. Storage Gateway — bridge on-prem & cloud

**Storage Gateway** là một máy ảo (hoặc thiết bị phần cứng) đặt **tại on-prem**. Với ứng dụng trong datacenter, nó trông như một file server, một ổ đĩa mạng hay một tủ băng từ bình thường; phía sau, nó đẩy dữ liệu lên AWS và giữ một cache cục bộ cho dữ liệu hay dùng. Ứng dụng on-prem không phải sửa gì.

Hai thuật ngữ trong bảng:
- **iSCSI**: giao thức cho phép một máy dùng ổ đĩa ở xa qua mạng IP như thể ổ đó cắm trực tiếp (block storage qua mạng).
- **VTL** (virtual tape library): giả lập một tủ băng từ, để phần mềm backup sẵn có (Veeam, NetBackup…) tiếp tục "ghi ra băng" mà không biết băng thật ra là object trên S3.

| Type | Protocol on-prem | Backend AWS | Use case |
|------|------------------|-------------|----------|
| **File Gateway** | NFS/SMB | S3 (mỗi file thành một object) | Chuyển file share lên S3, vẫn truy cập như thư mục mạng |
| **Volume Gateway (Cached)** | iSCSI | S3 + EBS snapshot | Dữ liệu chính ở cloud, chỉ phần nóng cache local |
| **Volume Gateway (Stored)** | iSCSI | S3 snapshot | Toàn bộ dữ liệu ở local, backup bất đồng bộ lên cloud |
| **Tape Gateway** | VTL | S3 + Glacier | Thay hệ thống backup băng từ |

**Cached khác Stored ở chỗ bản chính nằm đâu.** Cached: bản chính trên S3, on-prem chỉ giữ phần hay dùng, nên tiết kiệm đĩa on-prem nhưng đọc dữ liệu nguội phải kéo từ cloud về. Stored: bản chính đầy đủ ở on-prem nên mọi thao tác đọc đều nhanh, AWS chỉ nhận snapshot làm backup.

Cách vận hành, các bẫy chọn giữa Storage Gateway và DataSync nằm ở [[ch2-05-migration-transfer]] §5.

---

## 9. Backup & DR storage

- **AWS Backup**: một chỗ quản lý backup cho nhiều dịch vụ (EBS, RDS, DynamoDB, EFS, FSx, S3…) bằng backup plan chung, thay vì cấu hình riêng từng nơi. Backup nằm trong **vault**; bật **Vault Lock** ở compliance mode thì không ai xoá hay rút ngắn thời hạn giữ được, kể cả root (immutability).
- **EBS Snapshot Lifecycle Manager** (Amazon Data Lifecycle Manager, DLM): tự tạo EBS snapshot theo lịch và tự xoá bản quá hạn. Chỉ lo EBS snapshot và AMI; cần nhiều dịch vụ thì dùng AWS Backup.
- **S3 Cross-Region Replication (CRR)** / **Same-Region Replication (SRR)**: tự sao object mới sang bucket khác region (DR, đưa dữ liệu gần user) hoặc cùng region (gom log, tách account). Bất đồng bộ, và cả hai bucket phải bật versioning.
- **S3 Replication Time Control (RTC)**: replication thường không cam kết thời gian. Bật RTC thì có cam kết: **99,9% object được replicate trong vòng 15 phút** (đa số xong trong vài giây), kèm metric và event báo object nào trễ. Dấu hiệu trong đề: "phải replicate trong 15 phút", "cần SLA cho replication".

---

## 10. Map performance metric

| Metric | Service | Tool monitor |
|--------|---------|--------------|
| Disk IOPS, throughput, queue depth | EBS | CloudWatch metrics (`VolumeReadOps`, `VolumeWriteBytes`, `VolumeQueueLength`) |
| EFS burst credit, throughput | EFS | CloudWatch `BurstCreditBalance`, `PermittedThroughput` |
| S3 request count, latency, 4xx/5xx | S3 | CloudWatch storage metrics + request metrics (phải bật) |
| FSx Lustre throughput | FSx | CloudWatch FSx metrics |

**Đọc metric EBS để biết nghẽn IOPS hay throughput.** `VolumeReadOps` và `VolumeWriteOps` là **tổng số thao tác trong một chu kỳ**, không phải IOPS. Phải chia cho số giây của chu kỳ:

```
gp3 provision 8.000 IOPS, throughput để mặc định 125 MiB/s. Trong 60 giây:

(VolumeReadOps + VolumeWriteOps) ÷ 60          = 4.000 IOPS    → mới dùng 50% IOPS
(VolumeReadBytes + VolumeWriteBytes) ÷ tổng Ops = 32 KiB        → I/O size trung bình
4.000 IOPS × 32 KiB                             = 125 MiB/s     → đã chạm trần THROUGHPUT

→ Mua thêm IOPS vô ích. Phải tăng throughput (và kiểm tra trần EBS của instance).
```

`VolumeQueueLength` là số I/O đang chờ. Mốc tham chiếu của AWS cho SSD là khoảng **1 cho mỗi 1.000 IOPS đã provision**: volume 8.000 IOPS có queue quanh 8 là đang được dùng hết công suất chứ chưa hẳn là hỏng; queue cao hơn hẳn mức đó trong thời gian dài, kèm latency tăng, mới là quá tải. Hai metric trả lời thẳng câu hỏi là `VolumeIOPSExceededCheck` và `VolumeThroughputExceededCheck` (bằng 1 khi workload cố đẩy vượt mức đã provision).

> Bẫy thi: "EBS volume slow, làm sao biết bottleneck IOPS hay throughput?" → xem `VolumeQueueLength` có cao kéo dài không (dấu hiệu saturate), rồi so `VolumeReadOps / period` với provisioned IOPS và bytes/giây với trần throughput. Với gp2/st1/sc1 xem thêm `BurstBalance`.

---

## 11. Ví dụ chọn storage cho 4 use case

### 11.1 Postgres OLTP, p99 5ms, 50k IOPS
- **io2 Block Express** trên instance Nitro (ví dụ r6i) có trần EBS đủ 50.000 IOPS. Lý do: OLTP là random I/O nhỏ nên thứ cần mua là IOPS, và p99 5 ms cho cả query đòi storage phải trả lời đều ở mức dưới 1 ms. Tỷ lệ 1.000 IOPS/GiB nghĩa là volume chỉ cần từ 50 GiB.
- Tránh gp3 vì theo đề thi IOPS cap ở 16k. (Trần gp3 hiện tại là 80.000 nên về con số đã đủ, nhưng io2 vẫn là lựa chọn cho latency ổn định và durability 99,999%.)
- Multi-AZ qua Aurora hoặc RDS Multi-AZ: volume EBS chỉ nằm trong một AZ, HA phải làm ở tầng database.

### 11.2 Video transcoding farm
- **Instance Store NVMe** cho scratch: file trung gian khi transcode cần ghi/đọc rất nhanh và mất cũng không sao, vì chạy lại job là có lại.
- **S3** cho input/output, upload bằng multipart vì file video thường nhiều GB.
- **MediaConvert** (dịch vụ transcode managed) hoặc Fargate worker nếu tự chạy ffmpeg.

### 11.3 ML training, dataset 50TB ở S3
- **FSx for Lustre Scratch** mount vào các training instance: nhiều node GPU đọc song song cùng dataset, đúng việc của filesystem song song. Chọn Scratch vì bản gốc đã ở S3, mất file system thì dựng lại.
- Gắn file system với bucket để Lustre nạp dữ liệu từ S3. Training xong thì xoá file system để khỏi trả tiền lúc không dùng.
- Lưu model output về S3.

### 11.4 SaaS app, user upload file, average 10 MB
- **S3** với upload thẳng từ client bằng **presigned URL** (URL có chữ ký, cho phép upload trong thời hạn ngắn mà không lộ credential), nhờ đó file không phải đi vòng qua app server. File 10 MB chưa cần multipart; file lớn hơn 100 MB mới nên dùng.
- **CloudFront** trước S3 cho download: cache ở edge gần user, giảm cả latency lẫn số GET tới bucket.
- **Lifecycle**: move sang Standard-IA sau 30 ngày, Glacier sau 1 năm. File 10 MB lớn hơn mốc 128 KB nên chuyển class có lợi thật.

---

## 12. Cạm bẫy đề thi (SAA)

1. **"EBS Multi-Attach để share file giữa nhiều EC2"** → **Sai**. Multi-Attach chỉ chia sẻ block, cần cluster-aware FS để không hỏng dữ liệu (§3.4). Để share file dùng EFS.
2. **"Instance store persistent qua stop/start"** → **Sai**, mất data khi stop. Chỉ reboot mới giữ được.
3. **"S3 Standard-IA rẻ nhất cho data cũ"** → **Sai**, Glacier Deep Archive rẻ hơn hơn 12 lần ($0.00099 so với $0.0125 mỗi GB-tháng) nếu chấp nhận chờ retrieval 12–48 giờ.
4. **"S3 Intelligent-Tiering không có downside"** → **Sai**, có monitoring fee per object. Object nhỏ < 128 KB không tier.
5. **"gp3 luôn rẻ hơn gp2"** → **Đúng** cho baseline (rẻ hơn 20% mỗi GB). Nếu bạn cần > 3000 IOPS hoặc > 125 MB/s, gp3 phụ phí — nhưng vẫn rẻ hơn gp2 (phải mua thừa dung lượng) và rẻ hơn io2 nhiều lần cho cùng IOPS (§3.2).
6. **"EFS phù hợp database shared"** → **Sai**, EFS latency vài ms, DB cần sub-ms. Dùng Aurora.
7. **"FSx for Lustre persistent = HA"** → **Sai**. Persistent (SSD/HDD) chỉ nhân bản dữ liệu **trong một AZ**; file system vẫn nằm ở một AZ. Muốn chịu được mất AZ phải có backup hoặc để bản gốc trên S3; shared file multi-AZ thì dùng EFS hoặc FSx for Windows/ONTAP Multi-AZ.
8. **"S3 cần hash prefix cho performance"** → **Cũ rồi**, từ 2018 không cần. Chỉ cần chia tải ra nhiều prefix khi vượt 3.500/5.500 request mỗi giây trên một prefix.

---

## 13. Tóm tắt 1 dòng

> Storage performance = chọn đúng **type** trước, rồi tune **provisioned IOPS/throughput**. EBS gp3 default cho block, EFS Elastic cho shared file, S3 + lifecycle cho object, FSx Lustre cho HPC. Đừng over-provision — measure trước.

---

## 14. Bài tập tự kiểm tra

1. App ghi log 200 MB/s liên tục. Lưu 30 ngày tra cứu nhanh, 1 năm để query đôi khi, 7 năm compliance. Design storage stack?
2. Postgres báo `VolumeQueueLength` thường xuyên > 5 trên gp3 với 8000 provisioned IOPS. CPU 50%. Bạn làm gì?
3. Team ML training cần đọc dataset 20TB từ S3, throughput muốn > 10 GB/s. Đáp án?
4. S3 bucket có 1000 user upload concurrent, mỗi user upload file 5 GB. Best practice?
5. EBS snapshot 1TB, restore vào volume mới, app báo latency cao 30 phút đầu. Vì sao? Fix?
6. So sánh EFS Bursting vs Elastic — khi nào chọn cái nào?

---

## 15. Đọc thêm

- AWS Whitepaper — *AWS Storage Services Overview*.
- AWS Builder's Library — *Caching challenges and strategies*.
- AWS docs — *EBS volume types*, *S3 performance guidelines*.
- *Performance at Scale with Amazon ElastiCache* whitepaper.

---

**Bài tiếp theo**: [[ch2-03-database-performance]] — Aurora tuning, DynamoDB throughput, ElastiCache, DAX.
