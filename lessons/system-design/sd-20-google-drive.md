# Case study: Google Drive — đồng bộ file

> Bài này trông giống "một cái ổ cứng trên mây", và đó chính là cái bẫy. Lưu file không khó — S3 làm việc đó từ 2006. Cái khó nằm ở chữ **đồng bộ (sync)**: cùng một file tồn tại đồng thời trên năm thiết bị và trên server, mỗi bản có thể bị sửa bất cứ lúc nào, mạng có thể rớt giữa chừng, và người dùng kỳ vọng "mở máy lên là thấy đúng". Bài toán thật sự là **quản lý trạng thái phân tán của hàng trăm tỉ đối tượng có thể thay đổi (mutable)**, không phải bài toán lưu trữ.

Đây cũng là case study hiếm hoi mà **băng thông**, chứ không phải QPS hay dung lượng, là thứ giết bạn trước. Cách cứu nó — cắt file thành block, chỉ gửi block đã đổi — đơn giản tới mức dễ bị coi nhẹ, nhưng nó lan vào *mọi* phần còn lại: schema metadata, dedupe, version history, mã hoá, conflict, chi phí. Nếu chỉ nhớ một câu: **file không phải là đơn vị của hệ thống; block mới là.**

---

## 1. Làm rõ yêu cầu

### Functional

| # | Yêu cầu | Phạm vi |
|---|---|---|
| 1 | **Upload / download** | File từ vài KB tới 10 GB. Upload phải **resumable** — rớt mạng không mất công đã tải. |
| 2 | **Sync tự động giữa nhiều thiết bị** | Sửa trên laptop → máy bàn và điện thoại tự cập nhật. Đây là core. |
| 3 | **Chia sẻ** | File/folder với quyền `viewer / commenter / editor`; folder kế thừa xuống con. |
| 4 | **Version history** | Xem và khôi phục phiên bản cũ. |
| 5 | **Notification khi file đổi** | Client biết có thay đổi để kéo về; UI hiện "X đã sửa file Y". |

Cố ý **bỏ ngoài phạm vi** — nói ra để ghi điểm chứ không phải để né: chỉnh sửa cộng tác thời gian thực kiểu Google Docs (bài toán khác hẳn, cần OT/CRDT, chỉ áp dụng cho định dạng Google sở hữu — Drive *lưu trữ* `.docx`, `.psd`, `.mp4`, tức **blob nhị phân** không hợp nhất được); tìm kiếm toàn văn; preview/quét virus.

### Non-functional

| Thuộc tính | Mục tiêu | Nó dẫn dắt thiết kế thế nào |
|---|---|---|
| **Durability** | Mất dữ liệu là **không chấp nhận được** | Replication đa AZ, không ghi đè in-place, version history như lưới an toàn |
| **Bandwidth efficiency** | Không gửi lại byte nào không cần gửi | Ràng buộc **số một**. Client ngồi sau đường upload nhà 10–50 Mbps → delta sync |
| **Scalability / Availability** | 50 triệu DAU, tăng petabyte/tháng, 99,99% cho đọc | Không component nào được phép là một máy; server chết không được làm thư mục local "biến mất" |
| **Consistency** | **Strong cho metadata, eventual cho block** | Quyết định quan trọng nhất, §7. Metadata sai → client xoá nhầm file. Block chậm 300 ms → không ai chết |

### Giả định chốt

```
- 50 triệu DAU, 1.5 thiết bị/user        → ~75 triệu thiết bị
- 10 GB miễn phí/user, file lớn nhất 10 GB
- 2 file upload/ngày/user, trung bình 500 KB
- ~2.000 file/folder mỗi user
- Client desktop chạy nền, online khi máy bật
- Giữ tối đa 10 version gần nhất mỗi file
```

> 💡 **Nguyên tắc**: mỗi giả định phải là thứ **sau này sẽ nhân lên để ra một con số**. "1,5 thiết bị/user" không phải chi tiết trang trí — nó là hệ số fan-out của notification, và nó sẽ quyết định vì sao ta chọn long polling.

---

## 2. Back-of-envelope estimation

### Storage

```
Cấp phát:  50M × 10 GB = 500 PB     ← con số "hứa"
Thực dùng: 50M × ~1 GB =  50 PB     ← con số "thật" (phân bố lệch nặng)

Tăng mới/ngày: 50M × 2 × 500 KB = 50 TB/ngày byte thô
  sau delta sync + dedupe + nén, giữ ~40% → 20 TB/ngày ≈ 7,3 PB/năm
```

Khoảng cách 500 PB / 50 PB chính là lý do mô hình freemium sống được, và là lý do phải **thin provisioning**: chỉ tính tiền theo byte thật.

### Băng thông

```
Upload:   50 TB/ngày ÷ 86.400 ≈ 580 MB/s TB; peak ×3 ≈ 1,7 GB/s
Download: fan-out ≈ 2 (thiết bị khác của user 0,5 + collaborator 1,5)
          → ~1,2 GB/s TB, peak ~3,5 GB/s
```

### QPS — và cú twist

```
GHI (tạo/sửa/xoá/đổi tên):
  50M × 2/ngày = 100M/ngày ÷ 86.400 ≈ 1.160 wps; peak ×3 ≈ 3.500 wps

ĐỌC:
  metadata chủ động (duyệt thư mục, stat)          ≈ 400.000 rps
  thao tác block (presign, GET/PUT)                ≈  50.000 rps
  notification long polling:
     75M thiết bị × 50% online peak = 37,5M kết nối
     timeout 45 s rồi nối lại → 37,5M ÷ 45         ≈ 833.000 rps

Tổng peak ≈ 1,3 triệu QPS      →  Read : Write ≈ 370 : 1
```

Nhưng 370:1 che giấu điều quan trọng hơn. Bóc ra:

| Thành phần | QPS peak | % | Mang thông tin gì |
|---|---:|---:|---|
| Long-poll reconnect | 833.000 | **64%** | Hầu hết là *"chưa có gì mới"* |
| Đọc metadata chủ động | 400.000 | 31% | Có ích |
| Thao tác block | 50.000 | 4% | Có ích |
| Ghi | 3.500 | **0,27%** | Toàn bộ sự thay đổi của hệ thống |

> ⚠️ **Bẫy lớn nhất của bài**: gần **hai phần ba hạ tầng request-serving tồn tại chỉ để trả lời "chưa có gì thay đổi"**. Vẽ xong kiến trúc mà không nhận ra điều này là bỏ lỡ chỗ tốn tiền nhất. Mọi tối ưu ở §8.3 đều nhắm vào ô 64% đó.

Kết luận thứ hai, ngược hẳn bài URL Shortener: **về số byte, read:write chỉ ~2:1**. Drive **không** phải hệ read-heavy theo nghĩa thường. Nó là hệ **write-amplified, connection-heavy**: ghi ít nhưng mỗi ghi đắt, còn kết nối thì nhiều kinh khủng.

### Metadata

```
file:  50M × 2.000 = 100 tỉ row × ~500 B ≈ 50 TB
block: ~3 block/file kể cả version → ~300 tỉ row × 100 B ≈ 30 TB
Tổng ≈ 80–100 TB, cần strong consistency + truy vấn quan hệ  →  BẮT BUỘC SHARD (§11.3)
```

> 💡 500 PB block là bài toán *đã được giải* — ném vào S3, xong. **100 TB metadata có ràng buộc giao dịch mới là bài toán chưa giải sẵn.**

---

## 3. API design

Tách rõ ba nhóm — vì chúng nằm trên ba hệ thống lưu trữ khác nhau.

```
── Metadata ──────────────────────────────────────────────────────────
GET  /api/v1/files?namespace={ns}&cursor={c}&limit=1000

POST /api/v1/files
     { path, size, block_hashes: ["a3f...","b71...",...], parent_version: 41 }
     201 → { file_id, version: 42, status: "pending",
             missing_blocks: ["b71...","e0c..."] }    # server chỉ xin cái nó thiếu
     409 → { error: "version_conflict", server_version: 43 }

GET/POST /api/v1/files/{id}/revisions[/{rev}/restore]      DELETE /api/v1/files/{id}
POST     /api/v1/files/{id}/permissions  { grantee, role }

── Block ─────────────────────────────────────────────────────────────
POST /api/v1/blocks/presign  { hashes: [...] }
     → { "b71...": "https://s3...?X-Amz-Signature=..." }   # client PUT THẲNG lên S3
GET  /api/v1/blocks/{hash}   → 302 tới CDN

── Notification ──────────────────────────────────────────────────────
GET /api/v1/changes?namespace={ns}&since_cursor={c}
    # long polling, giữ tối đa 45 s; có thay đổi thì trả ngay
    200 → { changes: [...], next_cursor }
```

Hai trường đã hé lộ toàn bộ kiến trúc:

**`missing_blocks`** — client khai báo danh sách hash của nội dung mới, server đối chiếu và **chỉ xin về block nó chưa từng thấy**. Delta sync và dedupe gộp làm một trong đúng một trường JSON. File đã tồn tại đâu đó → `missing_blocks` rỗng → upload 1 GB xong trong 200 ms mà không truyền byte nội dung nào.

**`parent_version`** — client nói "tôi sửa từ v41"; server đang ở v43 → có người ghi chen vào → 409. Đây là **optimistic concurrency control**, nền của toàn bộ §9.

> 💡 API tốt là API mà nhìn signature đã đoán được kiến trúc: content-addressed storage + dedupe + optimistic locking.

---

## 4. Từ một máy chủ tới hệ phân tán

### 4.1 Thiết kế một máy

Một web server + một MySQL giữ metadata + một thư mục `/drive/` trên đĩa cục bộ, bên trong chia thành các **namespace** (`/drive/ns_alice/work/report.pdf`).

Ý tưởng namespace đáng giữ lại: `(namespace, relative_path)` định danh duy nhất một file. Sau này folder được chia sẻ cũng là một namespace mà nhiều user cùng gắn vào — nhờ vậy notify theo namespace thay vì theo từng user.

Thiết kế này chết theo đúng thứ tự: (1) **hết đĩa** ở vài chục TB — chỉ vài nghìn user; (2) **hết băng thông NIC** — 10 Gbps ≈ 1,2 GB/s trong khi cần 1,7 GB/s chỉ riêng upload peak; (3) **single point of failure**; (4) **metadata DB** — 100 TB không vào nổi một instance.

### 4.2 Gỡ từng nút

**Tách file ra khỏi server** — đưa nội dung lên object store. Lý do không chỉ là dung lượng: object store cho durability 11 số 9 và replication đa AZ gần như miễn phí về công sức, nhưng quan trọng hơn, nó cho client **upload/download trực tiếp bằng presigned URL** — nghĩa là 1,7 GB/s kia **không đi qua server của ta**; server chỉ còn 3.500 wps metadata. Cả một bậc độ lớn về chi phí.

**Shard metadata theo `namespace_id`** (§11.3), **LB + API server stateless**, và **tách notification thành service riêng** — vì 833K QPS long-poll có đặc tính tài nguyên hoàn toàn khác: **giữ kết nối rất lâu nhưng gần như không dùng CPU**. Trộn chung sẽ buộc bạn scale API server theo số kết nối thay vì theo tải tính toán.

### 4.3 Kiến trúc mục tiêu

```
   Client (desktop / mobile / web)
     │(1) metadata  │(2) block PUT/GET  │(3) long poll
     ▼              │   TRỰC TIẾP       ▼
┌──────────┐        │           ┌──────────────────┐
│    LB    │        │           │  Notification    │◀── pub/sub
└────┬─────┘        │           │  (long polling)  │    (Redis/Kafka)
     ▼              │           └────────▲─────────┘
┌──────────┐        │                    │ publish change
│   API    │────────┼────────────────────┘
│ servers  │        │           ┌──────────────────┐
└────┬─────┘        └──────────▶│ Block servers    │
     │                          │ (cắt/nén/mã hoá) │
     ▼                          └────────┬─────────┘
┌─────────────────┐                      ▼
│  Metadata DB    │          ┌──────────────────┐   ┌─────────────┐
│  sharded,       │          │  Object store    │──▶│ Cold storage│
│  strong cons.   │          │  content-addr.   │   │  (Glacier)  │
│  + cache        │          └──────────────────┘   └─────────────┘
└─────────────────┘   + offline: change log append-only theo namespace (§8.4)
```

Điểm phải nhấn: **hai đường dữ liệu tách hẳn nhau**. Metadata nhỏ, đồng bộ, cần giao dịch, đi qua server ta; block to, bất đồng bộ, eventual, đi thẳng tới object store. Mọi thứ khó ở bài này đến từ chỗ **hai đường đó phải khớp nhau** (§7.3).

---

## 5. Deep dive 1 — Block-level sync: ý tưởng cốt lõi

### 5.1 Vấn đề: nhân bản ghi khủng khiếp

File thuyết trình 1 GB. Bạn sửa một dòng rồi Save; ứng dụng ghi lại **toàn bộ** file, client thấy `mtime` đổi → upload 1 GB. Với đường upload nhà 20 Mbps đó là **~7 phút**. Sửa 10 lần trong buổi chiều = 70 phút upload, 10 GB băng thông và 10 GB storage version — hết sạch hạn mức miễn phí — cho ~200 byte thay đổi thật. Đây là **sản phẩm không dùng được**.

### 5.2 Giải pháp: file là danh sách block

```
report.pdf (1 GB)
  ├── block[0]   4 MB → hash 9a3f...
  ├── block[1]   4 MB → hash 71bc...
  ...
  └── block[255] 4 MB → hash 4c8a...

File (ở tầng metadata) = danh sách CÓ THỨ TỰ các block hash
                       = ["9a3f...","71bc...", ..., "4c8a..."]
```

Mỗi block được hash (SHA-256), và hash đó chính là **tên** của block trong object store — **content-addressed storage**: nội dung giống nhau ⇒ tên giống nhau ⇒ chỉ lưu một bản, tự động. File không còn là dữ liệu nữa; **nó là một công thức lắp ráp**.

### 5.3 Delta sync: chỉ gửi cái đã đổi

```
Trước:  [9a3f][71bc][e0d2][...][4c8a]      256 block
Sau:    [9a3f][71bc][ff41][...][4c8a]      chỉ block[2] đổi hash

Client hash 256 block          → ~2 giây CPU
Gửi danh sách hash             → ~8 KB
Server trả missing_blocks      → ["ff41..."]
Client upload 1 block          → 4 MB (nén còn ~1,2 MB)

1 GB → 4 MB  =  giảm 99,6% băng thông.   7 phút → ~2 giây.
```

Một hệ quả rất đẹp: **version history gần như miễn phí**. v42 và v41 dùng chung 255/256 block, nên giữ 10 version của file 1 GB tốn 1 GB + 9×4 MB ≈ 1,04 GB thay vì 10 GB. Không có block-level, "giữ 10 version" đã bất khả thi về kinh tế.

> 💡 **Nguyên tắc**: delta sync không chỉ tiết kiệm băng thông — nó khiến **version history, dedupe và resumable upload trở thành hệ quả tự nhiên** thay vì ba tính năng phải xây riêng. Quyết định kiến trúc tốt là quyết định trả lời nhiều câu hỏi cùng lúc.

### 5.4 Vì sao 4 MB

Ba trục đánh đổi kéo ngược nhau. **Block nhỏ (64 KB)**: delta mịn hơn, nhưng số row metadata ×64 (file 1 GB thành 16.384 row), số PUT/GET ×64 khiến phí API của object store áp đảo phí lưu trữ, và overhead per-object chiếm tỉ lệ lớn. **Block lớn (64 MB)**: ít row, ít request, overhead không đáng kể — nhưng sửa 1 byte phải gửi lại 64 MB và gần như không song song hoá được.

4 MB nằm ở chỗ giao: đủ lớn để chi phí per-request không áp đảo, đủ nhỏ để một lần sửa chỉ tốn 4 MB, và khớp ngưỡng thực dụng của multipart upload. Con số không thiêng liêng (Dropbox 4 MB, restic ~1 MB, ZFS dedupe 128 KB) — nhưng ba trục đánh đổi thì luôn đúng.

### 5.5 Bẫy chết người: chunking cố định và phép dịch nội dung

Chia block theo **offset cố định** chỉ hoạt động khi thay đổi là **ghi đè tại chỗ**. Nếu bạn **chèn** 100 byte vào đầu file:

```
Trước:  [ A A A A ][ B B B B ][ C C C C ][ D D D D ]
Sau:    [ x A A A ][ A B B B ][ B C C C ][ C D D D ][ D ]
          ▲ đổi      ▲ đổi      ▲ đổi      ▲ đổi      ▲ mới
→ MỌI block đổi hash → upload lại toàn bộ file
```

Một phép chèn nhỏ phá sạch delta sync. Với file text, log, hay `.docx` (thực chất là zip — đổi một byte làm đổi toàn bộ luồng nén phía sau), điều này xảy ra thường xuyên.

**Giải pháp: content-defined chunking (CDC)** — biên giới block xác định bởi *nội dung*, không bởi vị trí. Dùng **rolling hash** (Rabin fingerprint, Buzhash/Gear): trượt cửa sổ 48 byte qua file, cắt block mỗi khi hash thoả điều kiện (vd 13 bit thấp bằng 0 → trung bình một biên mỗi 8 KB), kèm min/max size. Vì biên bám vào nội dung, chèn byte ở đầu chỉ làm **block đầu tiên** đổi; các biên sau tự "trượt về" đúng chỗ cũ. Cái giá là CPU: rolling hash chạy trên **từng byte**, và kích thước block trở nên biến thiên (0,5×–4×). Dropbox dùng fixed-size, còn restic/borg/rsync/Veeam dùng CDC.

Thực tế nhiều hệ thống **kết hợp**: fixed-size cho media lớn, CDC cho tài liệu và backup.

> ⚠️ Đừng hứa "delta sync tiết kiệm 99% cho mọi file". Với file đã nén hoặc mã hoá (zip, jpg, mp4), sửa một chút có thể đổi toàn bộ luồng byte. Delta sync hiệu quả nhất với file **lớn, không nén, thay đổi cục bộ**: VM image, DB dump, PSD, văn bản thuần.

### 5.6 Nén và mã hoá từng block

```
 block thô (4 MB)
   ├─▶ (1) HASH   SHA-256 trên NỘI DUNG GỐC → tên/địa chỉ của block
   ├─▶ (2) NÉN    zstd/gzip, chọn theo loại file
   └─▶ (3) MÃ HOÁ AES-256-GCM  →  lưu vào object store dưới khoá = hash ở (1)
```

Thứ tự này không tuỳ tiện:

**Hash trước nén/mã hoá** vì hash là *danh tính* của nội dung. Hash sau khi nén thì hai client dùng mức nén khác nhau cho ra hash khác nhau cho **cùng một nội dung** → dedupe chết; hash sau khi mã hoá thì IV ngẫu nhiên làm mỗi lần ra byte khác → dedupe chết hoàn toàn. Quy tắc: **hash trên plaintext, lưu ciphertext**.

**Nén trước mã hoá** vì ciphertext tốt không phân biệt được với nhiễu ngẫu nhiên — entropy tối đa — nên **không nén được**.

**Nén theo block chứ không cả file**, vì nén cả file phá tính độc lập của block: muốn lấy block 200 phải giải nén từ đầu. Per-block giữ được truy cập ngẫu nhiên và giữ được delta sync. Với `.jpg`/`.mp4`/`.zip`, nén là lãng phí CPU thuần tuý — thực dụng: nén thử 64 KB đầu, tỉ lệ < 10% thì bỏ qua.

**Làm ở đâu?** Ở **client** là lý tưởng (tiết kiệm băng thông, cho phép end-to-end encryption). Nhưng mã hoá client bằng khoá chỉ client biết thì server **không dedupe cross-user được, không tạo preview/tìm kiếm được** — đánh đổi sản phẩm dẫn thẳng tới §6.

---

## 6. Deep dive 2 — Dedupe, và cái giá bảo mật của nó

### 6.1 Trong phạm vi một user

Dễ và an toàn. User tải cùng một đính kèm ba lần, copy một thư mục, giữ 10 version — content-addressed storage khiến dedupe xảy ra **tự động, không cần code riêng**. Tiết kiệm thực tế thường **20–40%**.

Cơ chế cần thêm là **reference counting**: một block được nhiều file/version trỏ tới, nên xoá file chỉ giảm refcount, về 0 mới xoá block. Refcount chính xác trong hệ phân tán là **khó**: sai chiều này thì rò rỉ block, sai chiều kia thì **xoá nhầm block đang dùng → hỏng file**. Cách an toàn: **không xoá đồng bộ** — đánh dấu ứng viên, rồi chạy job **mark-and-sweep** định kỳ, chỉ xoá block không ai trỏ tới **và đã cũ hơn N ngày**. Độ trễ N ngày là lớp đệm chống race: block vừa upload mà metadata chưa commit sẽ không bị quét nhầm.

> 💡 Trong hệ lưu trữ, **thà rò rỉ vài TB rác còn hơn xoá nhầm một byte của khách** — rác thì trả tiền được, dữ liệu mất thì không mua lại được.

### 6.2 Cross-user — và vì sao nó nguy hiểm

Nếu 10 triệu người cùng lưu một PDF sách giáo khoa hay một ISO cài Windows, ta chỉ cần **một bản**; với dịch vụ backup, tỉ lệ dedupe cross-user đạt **5–10×**. Và vì client "hỏi trước, upload sau" (`missing_blocks`), nó tiết kiệm cả **băng thông**: user thứ hai upload 1 GB xong trong 1 giây. Đó chính xác là lỗ hổng.

**Tấn công 1 — existence oracle.** Kẻ tấn công có trong tay một file nhạy cảm (tài liệu rò rỉ, báo cáo nội bộ, một tấm ảnh) và upload nó. Nếu server trả `missing_blocks: []` và hoàn tất tức thì, hắn **biết chắc có người trong hệ thống đang giữ file này**. Tệ hơn, nó cho phép **vét cạn nội dung entropy thấp**: có mẫu hợp đồng, chỉ cần đoán con số lương? Tạo 200 biến thể, upload từng cái, cái nào "tức thì" là cái đúng.

**Tấn công 2 — biến kho lưu trữ thành kênh truyền tin.** Nếu chỉ cần biết hash là lấy được block, hash thành một thứ mật khẩu chia sẻ được: A gửi B 32 byte qua kênh khác, B tải về mà không quan hệ chia sẻ nào được ghi nhận — mọi kiểm soát truy cập và audit log bị đi vòng.

| Phòng thủ | Cách làm | Đánh đổi |
|---|---|---|
| **Kiểm soát truy cập theo hash** | `GET /blocks/{hash}` phải kiểm tra user có file nào trỏ tới block này không | Bắt buộc, rẻ, chặn tấn công 2 |
| **Proof of ownership** | Thách thức client: *"đọc cho tôi byte 1.048.291–1.048.323"* — chỉ ai thật sự có nội dung mới trả lời được | Chặn tấn công 1 khá tốt, thêm round-trip |
| **Ngưỡng dedupe** | Chỉ dedupe cross-user khi block xuất hiện ở ≥ N user độc lập (vd 10) | Mất ít, vì block hiếm vốn không giúp gì cho dedupe |
| **Chỉ dedupe phía server** | Client **luôn** upload; dedupe sau khi byte đã lên | Chặn hoàn toàn oracle, nhưng mất phần tiết kiệm **băng thông** |

**Lựa chọn thực dụng:** dedupe cross-user **ở phía server** (client vẫn upload) + kiểm soát truy cập chặt theo hash. Ta hy sinh tiết kiệm băng thông cross-user — vốn không lớn vì phần lớn upload là nội dung độc nhất — để đổi lấy việc **không tồn tại existence oracle**. Dedupe trong phạm vi một user thì làm ở client thoải mái, vì oracle chỉ lộ thông tin về chính user đó.

> ⚠️ Rất nhiều ứng viên tự hào "tôi dedupe cross-user, tiết kiệm 10×" mà không ai nhắc existence oracle. Nêu được rủi ro **và** biện pháp giảm thiểu (thay vì chỉ nói "nguy hiểm nên thôi") là điểm phân biệt rõ rệt ở vòng Senior/Staff. Dropbox từng phải tắt tính năng này vì đúng lý do đó.

---

## 7. Deep dive 3 — Metadata: schema và mô hình nhất quán

### 7.1 Schema

```sql
user   (user_id PK, email UNIQUE, quota_bytes, used_bytes, created_at)

device (device_id PK, user_id FK, device_name, last_seen_at,
        sync_cursor)          -- ĐÃ ĐỒNG BỘ TỚI ĐÂU — trường quan trọng nhất

namespace (namespace_id PK, owner_id FK,
           type)              -- 'root' | 'shared_folder'

file   (file_id PK, namespace_id FK, parent_id FK→file, name, is_folder,
        current_version INT,  -- optimistic locking
        status,               -- 'pending' | 'uploaded' | 'trashed'
        size_bytes, updated_at,
        UNIQUE (namespace_id, parent_id, name))

file_version (file_id FK, version INT, block_list,  -- mảng CÓ THỨ TỰ block_hash
              size_bytes, created_by_device, created_at,
              PRIMARY KEY (file_id, version))

block  (block_hash PK,        -- SHA-256, CHÍNH LÀ khoá trong object store
        size_bytes, ref_count, storage_class, created_at)

permission (namespace_id FK, grantee_user_id FK, role,
            PRIMARY KEY (namespace_id, grantee_user_id))
```

**`block_list` gắn vào `file_version`, không gắn vào `file`.** Mỗi version là một danh sách block **bất biến**. Khôi phục version cũ = trỏ `current_version` về đó, không phục hồi byte nào. Cực rẻ.

**Quyền gắn vào `namespace`, không gắn vào `file`.** Gắn vào file thì chia sẻ thư mục 50.000 file cần 50.000 lần ghi và mỗi lần kiểm tra quyền phải leo ngược cây; gắn vào namespace thì một row, một lookup. Cái giá: chia sẻ một **file lẻ** cần namespace nhỏ hoặc bảng ngoại lệ.

### 7.2 Vì sao metadata cần strong consistency

Metadata là **nguồn sự thật về việc file có tồn tại không, tên gì, ở đâu, gồm block nào**. Eventual consistent thì ba tai nạn xảy ra:

1. **Xoá nhầm.** Alice tạo file trên laptop; điện thoại hỏi replica chậm, không thấy, và client có logic "server không có mà local có → chắc vừa bị xoá nơi khác → xoá local". File biến mất khỏi máy người dùng — lớp bug làm sập niềm tin vào sản phẩm.
2. **Ghi đè mất dữ liệu.** Hai thiết bị đọc `current_version = 41` từ hai replica, cả hai ghi v42, một bản thắng âm thầm — **mất dữ liệu im lặng**, loại tệ nhất.
3. **Kiểm tra quyền sai.** Bob bị thu hồi quyền nhưng replica chậm vẫn trả `editor` — lỗ hổng bảo mật.

Nói gọn: metadata là nơi mọi **quyết định** được đưa ra, và quyết định dựa trên dữ liệu cũ thì sai theo kiểu không phục hồi được.

### 7.3 Vì sao block được phép eventual — và cách khớp hai thế giới

Block **bất biến và định danh bằng nội dung**. Khoá `9a3f...` hoặc chưa tồn tại, hoặc chứa đúng nội dung có SHA-256 bằng `9a3f...`. **Không có trạng thái trung gian sai.** Tệ nhất là "chưa thấy" — thử lại sau vài trăm ms là có. Không bao giờ đọc được *nội dung sai*.

| | Metadata | Block |
|---|---|---|
| Bản chất | **Mutable** (đổi tên, version, quyền) | **Immutable** |
| Định danh | ID nhân tạo (`file_id`) | Chính nội dung (hash) |
| Lỗi tệ nhất khi stale | **Giá trị sai** → quyết định sai → mất dữ liệu | **404** → thử lại |
| Yêu cầu | Strong consistency, ACID | Eventual; read-after-write cho key mới là đủ |
| Kích thước / ghi | ~100 TB / 3.500 wps | ~500 PB / 50.000 ops/s |
| Công nghệ | Aurora / Spanner / DynamoDB | S3 / GCS |

> 💡 **Nguyên tắc trung tâm của bài**: **tách cái nhỏ-mà-phải-đúng ra khỏi cái to-mà-được-phép-trễ.** Nhét chung thì bạn phải chọn: hoặc trả giá strong consistency cho 500 PB (đắt kinh khủng), hoặc chấp nhận eventual cho metadata (mất dữ liệu). Tách ra thì mỗi bên được thứ nó cần. Mẫu hình này lặp lại ở rất nhiều hệ thống.

Nhưng hai thế giới **phải khớp nhau**, và hai kịch bản hỏng thì bất đối xứng:

```
A — commit metadata TRƯỚC, upload block SAU
    metadata nói file gồm [9a3f, 71bc] nhưng 71bc chưa lên S3
    → file HỎNG. Client khác tải về gặp 404 giữa chừng.
    → THẢM HOẠ: người dùng thấy file mà không mở được.

B — upload block TRƯỚC, commit metadata SAU
    71bc đã trên S3 nhưng metadata chưa commit (server chết)
    → block mồ côi, tốn 4 MB, GC dọn sau. Người dùng không thấy gì bất thường.
```

Quy tắc: **luôn ghi block trước, commit metadata sau**. Metadata commit chính là **điểm commit của toàn bộ giao dịch**. Trường `status` hiện thực hoá điều này chi tiết hơn:

```
1. Client cắt block, hash, hỏi missing_blocks
2. Client PUT block còn thiếu lên object store        ← chưa ai thấy gì
3. Client POST metadata → row status = 'pending'      ← vẫn chưa ai thấy
4. Server xác minh mọi block trong block_list tồn tại (HEAD, hoặc event từ S3)
5. status = 'uploaded'                                ← ĐIỂM COMMIT
6. Publish change event → notification service
```

Chỉ file `uploaded` mới xuất hiện trong `GET /files` và mới sinh notification; `pending` quá 24 giờ bị dọn. Đây là **two-phase commit phiên bản nghèo**, đủ đúng vì bước 4 kiểm chứng lại được — block bất biến nên kiểm tra tồn tại là idempotent.

---

## 8. Deep dive 4 — Sync flow và notification

### 8.1 Luồng đầy đủ: từ một lần Ctrl-S tới thiết bị khác

```
 Alice/laptop        API server     Object store   Notify svc   Bob (đang long-poll)
 (1) FS watcher đổi       │              │             │◀══════════════╡
 (2) cắt block + hash     │              │             │               │
 (3) ├POST /files────────▶│ row pending  │             │               │
     │◀ missing:["ff41"]──┤              │             │               │
 (4) ├─── PUT ff41 (4 MB, nén+mã hoá) ──▶│             │               │
 (5) ├POST commit────────▶├ HEAD ff41 ──▶│             │               │
     │◀──── 200 ──────────┤ v42 uploaded ◀═ COMMIT     │               │
 (6)                      ├ publish {ns,file,v42} ────▶│               │
 (7)                      │              │             ├trả long-poll─▶│
 (8)                      │◀─ GET /files?since_cursor ─────────────────┤
     │                    ├── delta metadata ─────────────────────────▶│
 (9) │                    │              │◀ GET ff41 qua CDN ──────────┤
     │                    │              ├──── 4 MB ──────────────────▶│
(10) │                    │              │             │  ghép block, ghi local
```

**Notification chỉ mang tín hiệu, không mang dữ liệu.** Payload là *"namespace N có thay đổi, cursor mới là X"* — vài chục byte. Client nhận xong mới **chủ động kéo** metadata (bước 8). Vì sao không nhét luôn nội dung vào notification? Vì (a) phải fan-out cùng payload tới hàng triệu kết nối, tốn băng thông vô ích; (b) notification có thể **mất hoặc lặp** — mà một tín hiệu "có gì đó đổi" thì mất-lặp đều vô hại, cứ pull là ra đúng trạng thái. Nếu nó mang dữ liệu thì mất một cái = mất một thay đổi vĩnh viễn. **Tín hiệu thì idempotent; dữ liệu thì không.**

**Bước 9 đi qua CDN.** Block bất biến, định danh bằng hash → **cache vĩnh viễn, `immutable`, không bao giờ cần invalidate**. Block phổ biến (file chia sẻ cả công ty) được phục vụ từ edge, origin chỉ chạm một lần.

### 8.2 Long polling vs WebSocket — vì sao Drive chọn long polling

Câu trả lời "WebSocket hiện đại hơn" là câu trả lời sai. Trước hết phải đặt đúng bản chất lưu lượng: 37,5 triệu kết nối đồng thời lúc peak, nhưng chỉ **3.500 sự kiện/giây** thật sự cần gửi. Một kết nối trung bình nhận **chưa tới một sự kiện mỗi ba giờ**. Đây là lưu lượng **cực kỳ thưa và một chiều**.

| | **Long polling** | **WebSocket** |
|---|---|---|
| Hình dạng hợp | Một chiều, sự kiện **thưa**, chịu được vài trăm ms | Hai chiều, sự kiện **dày**, cần ~chục ms (chat, game, collab) |
| Trạng thái server | Gần như stateless — request rơi vào **bất kỳ** server nào | **Stateful** — kết nối gắn chặt một server; cần bảng định tuyến user→server |
| Rolling restart | Dễ — kết nối vốn hết hạn sau 45 s, restart gần như vô hình | Khó — đứt hàng triệu kết nối cùng lúc → **thundering herd** |
| Qua proxy doanh nghiệp | HTTP thuần, đi được mọi nơi | Cần `Upgrade`; nhiều proxy chặn |
| Chi phí khi im lặng | 1 request/45 s — nhỏ nhưng **không** bằng 0 | Gần 0, chỉ heartbeat |

Lý do thật sự:

1. **Lưu lượng một chiều và thưa** — client không đẩy gì qua kênh này (nó dùng REST), nên toàn bộ khả năng hai chiều của WebSocket bị bỏ phí trong khi cái giá stateful thì trả đủ. Và vài trăm ms là hoàn toàn chấp nhận được.
2. **Vận hành ở 37,5 triệu kết nối** — lý do nặng nhất. Long polling: kết nối tự đứt và nối lại mỗi 45 s nên deploy chỉ là **rút dần server khỏi LB**, một phút là xong, không ai nhận ra. WebSocket: phải xây drain, phải rải reconnect ngẫu nhiên chống thundering herd, phải giữ và cập nhật bảng `user_id → notification server` khi server chết. Cả một hệ thống con, cho lợi ích không ai cảm nhận được.

> 💡 Chọn giao thức theo **hình dạng lưu lượng** và **chi phí vận hành ở quy mô đích**, không theo độ hiện đại. WebSocket đúng cho chat (dày, hai chiều, cần dưới 100 ms). Long polling đúng cho Drive (thưa, một chiều, chịu được vài trăm ms). Cùng bài toán, hai đáp án — biết *vì sao khác* mới là thứ được chấm.

### 8.3 Giảm tải cho 64% lưu lượng "không có gì mới"

**Timeout thích ứng.** Mặc định 45 s, nhưng thiết bị im lặng 2 giờ thì kéo lên 5 phút — riêng điều này giảm QPS reconnect ~6×, từ 833K xuống ~140K. Giới hạn trên bị chặn bởi idle timeout của proxy trung gian (nhiều proxy cắt ở 60 s) nên client phải dò tìm.

**Backoff theo trạng thái thiết bị.** Máy khoá màn hình, laptop chạy pin, điện thoại chạy nền → giãn poll ra 5–15 phút, dựa vào push của hệ điều hành (APNs/FCM) để đánh thức khi cần.

**Gộp notification theo cửa sổ (delay batching).** Người đang biên tập lưu 30 lần trong 10 phút; gom thay đổi trong cửa sổ **2–5 giây** cho mỗi namespace rồi bắn **một** tín hiệu. Vì payload chỉ là "có gì đó đổi + cursor mới", gộp là **hoàn toàn không mất thông tin**. Giảm 5–20×, đổi lấy 2–5 s độ trễ — vô hình với người dùng.

**Không notify ngược về thiết bị đã gây ra thay đổi.** Hiển nhiên nhưng cực dễ quên, và lợi ích lớn hơn tiết kiệm QPS: nó tránh **vòng lặp sync** (client nhận notification về chính thay đổi của mình → tưởng có cái mới → ghi lại → lặp vô tận). Gắn `origin_device_id` vào change event và lọc ở tầng phát.

### 8.4 Client offline và sync queue

**Cách A — hàng đợi riêng cho từng thiết bị**: thay đổi nhét vào queue của thiết bị offline, phát lại khi nó online. Nhược điểm: storage nhân bản theo N thiết bị, queue của thiết bị offline 6 tháng phình vô hạn, phải quản lý vòng đời queue.

**Cách B — cursor + change log (chọn cái này)**: không queue riêng cho ai cả. Mỗi namespace có một **change log nối đuôi (append-only)**; mỗi thiết bị chỉ nhớ `sync_cursor`, online lại thì gọi `GET /changes?since_cursor=X`.

Cách B thắng vì lý do sâu hơn tiết kiệm storage: nó biến sync thành phép **đọc log từ một vị trí**, đúng như replica đọc binlog. Mọi thiết bị — online liên tục hay mới cài (cursor = 0) — chạy **cùng một đoạn code**, chỉ khác giá trị cursor. Không có đường xử lý đặc biệt cho "thiết bị vừa online lại", nghĩa là không có lớp bug đặc biệt cho nó.

Change log cần retention (vd 90 ngày). Cursor cũ hơn thì nhận `410 Gone` và phải **full resync**: tải danh sách toàn bộ file + hash, so với local, kéo phần thiếu. Nhờ dedupe theo block, full resync sau nhiều tháng rẻ hơn tưởng tượng — phần lớn block đã có sẵn trên đĩa.

**Hàng đợi phía client cũng phải tồn tại** và bền vững trên đĩa (thường là SQLite), vì khi offline người dùng vẫn sửa file. Hai điều quan trọng: nó phải **gộp được** (sửa một file 20 lần khi offline chỉ upload trạng thái cuối) và phải giữ **thứ tự phụ thuộc** (tạo folder trước khi upload file vào trong nó, không thì server trả `parent_not_found`).

---

## 9. Deep dive 5 — Conflict resolution

### 9.1 Phát hiện

Hai người mở cùng file lúc 10:00; Alice lưu lúc 10:05, Bob lưu lúc 10:06 nhưng dựa trên nội dung lúc 10:00. Không ai sai — đây là **hệ quả toán học** của việc cho phép sửa song song/offline.

```
Server: file 77, current_version = 42   (bản của Alice)
Bob gửi: { file_id: 77, parent_version: 41, ... }
                          ▲ Bob dựa trên v41, server đã ở v42
→ 409 Conflict { server_version: 42 }
```

**Optimistic concurrency control**, và nó **không thể bỏ sót**: mọi lần ghi đều khai báo version cha, mọi lệch đều bị bắt. So với "so sánh timestamp" — thứ hỏng ngay khi đồng hồ hai máy lệch, hoặc hai lần lưu rơi vào cùng một mili-giây.

### 9.2 Vì sao không thể tự động hợp nhất

Cám dỗ tự nhiên: "sao không merge như Git?". Git merge được vì nó biết ba điều Drive không biết:

1. **Cấu trúc nội dung.** Git giả định file là các dòng text. `.psd`, `.mp4`, `.sqlite`, `.xlsx` không có "dòng"; chèn một byte vào giữa file zip thì mọi thứ sau đó thành rác.
2. **Ngữ nghĩa thay đổi.** Với `.xlsx`, hai người sửa hai ô khác nhau *về mặt logic* là hợp nhất được — nhưng Drive chỉ thấy hai chuỗi byte. Muốn hợp nhất phải hiểu OOXML, tức **viết một trình soạn thảo bảng tính**. Nhân với số định dạng file trên đời.
3. **Tính hợp lệ của kết quả.** Git cho ra file conflict-marker rồi người dùng sửa; "hợp nhất" hai file PSD thì cho ra file **không mở được** và mất **cả hai** bản gốc — hỏng im lặng, không hồi phục.

Với định dạng do chính Google sở hữu (Docs/Sheets), hợp nhất tự động *có* xảy ra bằng Operational Transformation — nhưng đó là **sản phẩm khác** trên mô hình dữ liệu khác (chuỗi thao tác, không phải blob).

> 💡 Khi không thể hợp nhất an toàn, **đừng cố hợp nhất — hãy bảo toàn**. Không mất dữ liệu của ai, rồi đẩy quyết định cho người duy nhất có đủ ngữ cảnh: người dùng.

### 9.3 First-write-wins + tạo bản copy

```
t=10:05  Alice commit → v42  ✅ trở thành bản chính
t=10:06  Bob commit   → 409  ❌ (parent_version=41)

Client của Bob xử lý 409:
  1. Giữ nguyên nội dung của Bob — KHÔNG ghi đè, KHÔNG vứt bỏ
  2. Upload nó thành file độc lập:
       "report (bản xung đột của Bob 2026-09-14).pdf"
  3. Tải v42 về, đặt ở tên gốc "report.pdf"
  4. Báo Bob: "File đã bị người khác sửa. Bản của bạn được lưu thành bản sao riêng."

Thư mục của Bob:
  report.pdf                                    ← bản của Alice (chính)
  report (bản xung đột của Bob 2026-09-14).pdf  ← bản của Bob
```

Vì sao **first**-write-wins chứ không last? Vì "first" nghĩa là **bản đầu tiên tới điểm commit của server** — thứ tự khách quan do server quyết, không phụ thuộc đồng hồ client. Last-write-wins đòi so sánh timestamp giữa các máy (đồng hồ lệch, múi giờ sai) và tệ hơn, nó mang nghĩa "ghi đè" — tức **mất dữ liệu là kết quả bình thường**.

Điểm quan trọng nhất: chiến lược này **không bao giờ mất dữ liệu**. Người dùng bị làm phiền — phải tự so và gộp — nhưng "bị làm phiền" rẻ hơn "mất buổi chiều làm việc" vô cùng nhiều.

Các phương án còn lại đều thua ở đúng cột "mất dữ liệu": last-write-wins mất im lặng; khoá file (pessimistic lock) không mất nhưng chết khi offline — ai giữ khoá rồi đi nghỉ thì file kẹt; merge tự động và CRDT/OT thì đúng cho Docs nhưng không áp dụng được cho blob.

### 9.4 Các loại xung đột hay bị bỏ sót

**Trùng tên.** Alice và Bob cùng tạo `/work/plan.md`. `UNIQUE(namespace, parent, name)` bắt được — nhưng chỉ khi đó là ràng buộc **thật trong DB**; shard sao cho hai file rơi hai shard là ràng buộc biến mất (một lý do nữa để shard theo namespace). **Xoá vs sửa**: Alice xoá `report.pdf`, Bob sửa nó → nguyên tắc bảo toàn quyết định, **sửa thắng xoá**. **Vượt quota giữa chừng**: `used_bytes` cập nhật bất đồng bộ nên hai thiết bị cùng lọt rồi cộng lại thì vượt → cho vượt tạm rồi chặn upload mới, **không** xoá gì.

**Di chuyển thư mục tạo chu trình** là loại khó nhất. Alice chuyển `/A` vào `/B`, Bob chuyển `/B` vào `/A`; áp dụng cả hai thì cây thành vòng tròn tách khỏi gốc và toàn bộ nội dung "biến mất" khỏi giao diện. Phải **phát hiện chu trình khi áp dụng move** và từ chối cái thứ hai. Rất ít người nghĩ tới — nêu chủ động thì rất hiệu quả.

---

## 10. Bottleneck và failure mode

### 10.1 Cái gì nghẽn trước

| # | Nghẽn | Vì sao | Cách gỡ |
|---|---|---|---|
| 1 | **Số kết nối notification** | 37,5M kết nối; mỗi máy giữ ~100–500K (fd, bộ nhớ per-connection) → ~100–300 máy chỉ để *chờ* | Timeout thích ứng, backoff theo trạng thái thiết bị, runtime async (Go/Netty) |
| 2 | **Băng thông** | 1,7 GB/s lên, 3,5 GB/s xuống | Client đi **thẳng** tới object store bằng presigned URL; download qua CDN |
| 3 | **Shard metadata nóng** | Một khách doanh nghiệp 10M file đè một shard | Tách namespace lớn ra shard riêng; rate-limit ghi theo namespace |

### 10.2 Khi từng thành phần chết

**Block store chết / mất một AZ.** Upload–download block thất bại, nhưng **metadata vẫn sống**: người dùng vẫn duyệt thư mục, thấy tên file, thấy version history. Client xếp hàng và retry với exponential backoff; có cross-region replication thì chuyển đọc sang vùng khác, hoãn ghi. **Suy giảm là bộ phận, không toàn phần** — phần thưởng cho việc tách metadata khỏi block ở §7.

**Metadata DB chết.** Nghiêm trọng hơn — không nhận được ghi mới. Promote replica (RTO ~30 s); trong lúc đó **đọc vẫn phục vụ từ replica**. Quan trọng nhất là hành vi client: **tuyệt đối không được coi "không đọc được metadata" là "file không tồn tại"**. Phải phân biệt *lỗi* với *rỗng* — đây là bug kinh điển làm người dùng mất file.

**Notification service chết** là suy giảm nhẹ nhất: client **fallback về polling định kỳ** (5 phút gọi `GET /changes`), sync vẫn đúng chỉ chậm — phần thưởng cho quyết định "notification chỉ mang tín hiệu" ở §8.1. Khi service sống lại, hàng chục triệu client nối lại cùng lúc → thundering herd, bắt buộc có **jitter**.

**Upload dở dang** — ba tầng bảo vệ: (1) *trong một block*, multipart upload giữ lại part đã xong; (2) *giữa các block*, block độc lập và content-addressed nên nối lại chỉ cần hỏi `missing_blocks` lần nữa — **tiến độ không bao giờ mất**; (3) *trước commit metadata*, file ở `pending` và vô hình với mọi người, job dọn xoá row quá 24 giờ, GC thu block mồ côi sau. Đáng nhấn: **resumable upload không phải tính năng phải xây riêng — nó rơi ra từ thiết kế block.**

**Client tự làm hỏng dữ liệu** (đĩa lỗi, mất điện khi ghi): vì mỗi block có hash của nội dung gốc, client **kiểm chứng lại sau khi ghép** và tải lại block không khớp — **end-to-end checksum** bắt được cả lỗi của tầng dưới lẫn bug của chính ta.

**Retry phải idempotent.** `PUT block` idempotent tự nhiên (cùng hash, cùng nội dung). `POST /files` phải mang **idempotency key**, nếu không một mạng chập chờn sẽ đẻ ra hàng chục version trùng nhau.

---

## 11. Tối ưu chi phí và scale metadata

### 11.1 Tiered storage

Phân bố truy cập cực lệch: **phần lớn file không được chạm lại sau 30 ngày**.

| Hạng | Đối tượng | Giá tương đối | Độ trễ lấy về |
|---|---|---|---|
| Hot | Block của file sửa trong 30 ngày | 1,0× | ms |
| Infrequent access | 30–180 ngày | ~0,55× | ms |
| Archive | > 180 ngày, hoặc version cũ | ~0,1× | phút → giờ |
| Deep archive | Version rất cũ, thùng rác quá hạn | ~0,036× | tới 12 giờ |

Chuyển hạng phải làm ở **mức block, theo thời điểm truy cập cuối** — một file có thể gồm block cũ (phần thân không đổi) và block mới (phần vừa sửa). Bẫy: **phí transition và thời gian lưu tối thiểu** (30–180 ngày) — chuyển một block rồi xoá sau một tuần thì **đắt hơn** để yên, và với block 4 MB phí per-object có thể nuốt hết phần tiết kiệm. Ngoài ra độ trễ khôi phục phải thể hiện trên UI, không để người dùng nhìn spinner quay 4 tiếng.

### 11.2 Chính sách version

```
- Giữ tối đa 10 version gần nhất            (chặn trần)
- Giữ MỌI version trong 30 ngày qua         (cửa sổ "lỡ tay")
- Sau 30 ngày, thưa dần (thinning):
    1 version/ngày  cho tháng đầu
    1 version/tuần  cho năm đầu
    1 version/tháng sau đó
- Version > 1 năm → deep archive
- Không tính version vào quota — khả thi chính vì delta sync làm version rẻ
```

Ý tưởng **thưa dần** đáng nêu: giá trị một version giảm theo thời gian nhưng không về 0 — người dùng cần "bản hôm qua" theo giờ, "bản năm ngoái" theo tháng. Giống hệt cách ZFS snapshot hay Time Machine làm.

### 11.3 Scale metadata bằng sharding

**Khoá shard: `namespace_id`** (thay vì `file_id`), vì ba lý do:

- **Mọi truy vấn đường nóng nằm trong một namespace**: liệt kê thư mục, kiểm tra trùng tên, duyệt cây, kiểm tra quyền. Không có truy vấn xuyên shard.
- **Giao dịch nằm gọn trong một shard**: cập nhật `file` + `file_version` + refcount cho một lần commit đều cùng shard → dùng ACID cục bộ, **không cần two-phase commit phân tán**. Shard theo `file_id` thì mỗi lần đổi tên hay di chuyển file trở thành giao dịch phân tán — ác mộng.
- **Ràng buộc `UNIQUE(namespace, parent, name)` vẫn thực thi được** vì cả cây chung một shard.

| Vấn đề | Xử lý |
|---|---|
| **Hot shard** — doanh nghiệp 50.000 nhân viên chung namespace | Tách namespace lớn ra shard riêng, hoặc chia theo cây con. Cần bảng ánh xạ linh hoạt, **không** dùng `hash % N` cứng |
| **Rebalance khi thêm shard** | Consistent hashing hoặc **bảng tra cứu**. Bảng tra cứu chậm hơn chút nhưng cho phép di chuyển từng namespace — rất quý khi phải gỡ hot shard |
| **"Chia sẻ với tôi" là truy vấn xuyên shard** | Bảng phụ `shared_with_me(user_id, namespace_id)` shard theo `user_id`, cập nhật bất đồng bộ. Eventual ở đây chấp nhận được vì nó chỉ ảnh hưởng **hiển thị danh sách**, không ảnh hưởng quyền truy cập thật |
| **Bảng `block`** | Shard theo chính `block_hash` (phân bố đều sẵn). Nó là bảng tra cứu thuần, không tham gia giao dịch với cây file → tách ra thoải mái |

> 💡 Chọn khoá shard bằng cách hỏi *"ranh giới giao dịch của tôi ở đâu?"*, không phải *"cái gì phân bố đều nhất?"*. Phân bố đều mà cắt ngang giao dịch là đổi một bài toán dễ lấy một bài toán rất khó.

---

## Liên hệ sang AWS

| Thành phần thiết kế | Dịch vụ AWS | Vì sao hợp |
|---|---|---|
| Block store (500 PB, content-addressed) | **S3 Standard**, key = `blocks/{sha256}` | Durability 11 số 9, đa AZ mặc định. Key bằng hash nên bất biến, không bao giờ cần invalidate |
| Upload lớn / resumable | **S3 Multipart Upload** + **presigned URL** | Part tối đa 5 GB, 10.000 part; part lỗi chỉ gửi lại part đó. Presigned URL cho client PUT **thẳng** lên S3 → 1,7 GB/s peak không qua server ta. Nhớ lifecycle `AbortIncompleteMultipartUpload` sau 7 ngày |
| Version history | **Tự quản trong metadata**; S3 Versioning chỉ làm lưới an toàn | ⚠️ Version của ta là *danh sách block* trong DB. S3 Versioning tạo version của **cả object**, mà object của ta là block bất biến — không bao giờ bị ghi đè nên gần như vô dụng. Vẫn bật để chống xoá nhầm, kèm MFA Delete |
| Tiered storage | **S3 Lifecycle** → Standard-IA → Glacier → Deep Archive | Đúng bốn hạng §11.1. ⚠️ Phí lưu tối thiểu (IA 30, Glacier 90, Deep Archive 180 ngày) và phí transition per-object — với block 4 MB phải tính kỹ mới có lãi |
| Pattern truy cập không đoán được | **S3 Intelligent-Tiering** | Đúng bài của Drive. Tự chuyển hạng theo hành vi thật, không phí truy xuất khi nóng lại; đổi lấy phí giám sát per-object (object < 128 KB không được phân hạng) |
| Mã hoá block | **SSE-KMS** + **S3 Bucket Keys** | KMS cho khoá theo tenant, audit CloudTrail, thu hồi bằng key policy. ⚠️ **Bắt buộc bật Bucket Keys** — không thì mỗi GET block là một lời gọi KMS; ở 50K ops/s vừa đụng trần quota vừa đội chi phí (Bucket Keys giảm ~99%) |
| Khách tự giữ khoá | **SSE-C** hoặc mã hoá client | ⚠️ Server không đọc được nội dung → **không dedupe cross-user, không preview, không quét virus** |
| Metadata DB | **Aurora PostgreSQL** sharded theo `namespace_id` (hoặc Aurora Limitless); thay thế: **DynamoDB** PK `namespace_id` + SK `path` | Cần ACID, UNIQUE `(namespace, parent, name)`, truy vấn cây; read replica độ trễ thấp, failover ~30 s. DynamoDB hợp nếu bỏ được ràng buộc quan hệ (scale ngang, strongly consistent read, transaction trong một partition) ⚠️ nhưng coi chừng **hot partition** với namespace doanh nghiệp lớn |
| Bảng `block` + refcount; cache | **DynamoDB** (PK `block_hash`); **ElastiCache (Redis/Valkey)** | Bảng block là tra cứu khoá thuần, phân bố đều theo hash, `ADD` nguyên tử cho refcount. Redis cache cây thư mục + kết quả kiểm tra quyền, invalidate theo `namespace_id`, đồng thời là pub/sub cho notification |
| Change log / sync cursor | **DynamoDB Streams** hoặc **Kinesis Data Streams** | Log nối đuôi theo namespace, cursor = sequence number. Streams giữ 24 h (đủ fan-out realtime), Kinesis tới 365 ngày (đủ cho thiết bị offline lâu) |
| Notification — WebSocket | **API Gateway WebSocket API** | Có `@connections` để push, không phải tự quản kết nối. ⚠️ Tính tiền **theo phút kết nối**: 37,5M kết nối × 24 h không thể biện minh cho 3.500 sự kiện/giây. Hợp khi kết nối ít, sự kiện dày |
| Notification — long polling (**chọn**) | **ALB → ECS/EKS** (Go/Netty), idle timeout 60–120 s | Lý do ở §8.2; trả tiền theo request + giờ compute. ⚠️ ALB idle timeout phải **lớn hơn** long-poll timeout, không thì LB cắt trước khi server trả lời |
| Việc bất đồng bộ sau commit | **SQS** + **DLQ** | Fan-out notification, refcount, thumbnail, quét virus, `used_bytes`. Tách khỏi đường nóng để commit metadata luôn nhanh. **FIFO với `MessageGroupId = namespace_id`** khi thứ tự quan trọng |
| Sự kiện "block đã lên S3" | **S3 Event Notifications → EventBridge/Lambda** | Đúng bước 4 §7.3: xác nhận block tồn tại rồi chuyển `pending → uploaded`, thay vì API server tự HEAD từng block |
| Download block | **CloudFront** + `max-age=31536000, immutable`, **OAC** | Block bất biến định danh bằng hash → **cache vĩnh viễn, không bao giờ invalidate**. Giảm cả egress lẫn độ trễ toàn cầu |
| Chống lỗi vùng, chống xoá nhầm | **S3 CRR** + **Aurora Global Database**; **Object Lock** + Versioning + MFA Delete | CRR bất đồng bộ nên **RPO vài phút** — nói rõ, đừng hứa 0. Bug trong job GC của chính ta là rủi ro thật; Object Lock khiến nó không thể xoá vĩnh viễn |
| GC block mồ côi | **S3 Inventory** + **Athena** + **S3 Batch Operations** | Đừng LIST 500 PB. Inventory sinh báo cáo Parquet hằng ngày; join với refcount bằng Athena; xoá bằng Batch Operations |
| Auth & phân quyền, link chia sẻ | **Cognito** + phân quyền ở tầng ứng dụng; **CloudFront signed URL** | ⚠️ Đừng ánh xạ quyền chia sẻ sang IAM policy — IAM giới hạn kích thước và không thiết kế cho hàng tỉ ACL. Quyền là **dữ liệu ứng dụng** trong bảng `permission` |
| **Khi nào EFS/FSx hợp hơn S3** | **EFS** (NFS), **FSx for Windows** (SMB), **FSx for Lustre** | Khi cần **ngữ nghĩa POSIX/SMB thật**: ghi tại chỗ theo offset, khoá file, `rename` nguyên tử, quyền cấp thư mục — S3 **không** có. FSx for Windows tích hợp AD + shadow copy (file server lift-and-shift); Lustre cho HPC/ML. ⚠️ Nhưng cho **Drive** thì **sai**: đắt hơn nhiều lần/GB, không có tầng lạnh sâu, và ta vốn *không cần* POSIX vì client tự ghép block |
| Nhập dữ liệu ban đầu; khách chỉ biết SFTP | **AWS DataSync**; **AWS Transfer Family** | DataSync đồng bộ hàng loạt từ NFS/SMB/HDFS/S3 khác vào S3 kèm kiểm tra toàn vẹn — đúng cho onboarding khách có sẵn 500 TB file server. Transfer Family dựng endpoint SFTP/FTPS/AS2 thẳng trước bucket S3 cho đối tác cũ |

**Ba câu chốt đáng nhớ:**

1. *"S3 giải phần dễ (500 PB block), Aurora/DynamoDB giải phần khó (100 TB metadata có giao dịch). Cái tôi thật sự phải thiết kế là **ranh giới** giữa hai cái đó."*
2. *"Tôi chọn long polling trên ALB thay vì API Gateway WebSocket vì WebSocket tính tiền **theo phút kết nối** — mà lưu lượng của tôi là 37 triệu kết nối nhàn rỗi phục vụ 3.500 sự kiện/giây. Tôi sẽ trả tiền cho sự im lặng."*
3. *"Block bất biến định danh bằng hash cho tôi ba thứ miễn phí: cache CloudFront vĩnh viễn không cần invalidate, dedupe không cần code riêng, và retry idempotent tự nhiên."*

---

## Cách trình bày khi phỏng vấn / review

1. **Mở bằng việc đặt lại bản chất bài toán**: *"Đây không phải bài lưu trữ — S3 đã giải xong phần đó. Đây là bài đồng bộ trạng thái phân tán của các đối tượng mutable, và ràng buộc chi phối là băng thông client, không phải dung lượng."* Câu này tách bạn ngay khỏi những người sắp vẽ một box tên "File Storage".

2. **Ra số rồi bóc số.** Đừng dừng ở "1,3 triệu QPS": *"64% là long-poll reconnect chỉ để nói 'chưa có gì mới'; ghi thật chỉ 3.500/s tức 0,27%. Hai phần ba hạ tầng của tôi phục vụ sự im lặng, và đó là chỗ tôi tối ưu đầu tiên."* Nói thêm rằng bài này **không** read-heavy theo nghĩa thường — về byte chỉ ~2:1, về request 370:1 nhưng toàn request rỗng. Nhận ra khác biệt đó chứng tỏ bạn đang tính chứ không đang nhớ khuôn mẫu.

3. **Dành nhiều thời gian nhất cho block-level sync, và dùng ví dụ cụ thể**: *"File 1 GB, block 4 MB → 256 block. Sửa một dòng → một block đổi hash → upload 4 MB thay vì 1 GB. Bảy phút thành hai giây."* Con số cụ thể thuyết phục hơn mười phút lý thuyết.

4. **Tự nêu lỗ hổng của fixed-size chunking trước khi bị hỏi**: *"Cắt theo offset cố định hỏng ngay khi có phép chèn — chèn 100 byte ở đầu làm mọi block đổi hash; thực tế cần content-defined chunking bằng rolling hash."* Một trong hai chỗ ghi điểm mạnh nhất của bài. Kèm thứ tự hash → nén → mã hoá giải thích bằng nguyên nhân: hash trên plaintext vì hash là danh tính nội dung; nén trước mã hoá vì ciphertext có entropy tối đa nên nén sau là vô ích.

5. **Chủ động nêu rủi ro của dedupe cross-user** — chỗ ghi điểm mạnh thứ hai: *"Client hỏi trước rồi mới upload là tôi vừa tạo ra một existence oracle. Tôi chọn dedupe phía server: mất tiết kiệm băng thông, đổi lấy việc oracle không tồn tại."*

6. **Phát biểu ranh giới nhất quán như một nguyên tắc**, không như hai lựa chọn rời: *"Metadata mutable và người ta ra quyết định dựa trên nó → strong. Block immutable và định danh bằng nội dung → lỗi tệ nhất chỉ là 404 → eventual là đủ."* Kèm thứ tự commit và tính bất đối xứng của nó: *"Block trước, metadata sau; ngược lại thì người dùng thấy file mà không mở được."*

7. **Trả lời long polling vs WebSocket bằng hình dạng lưu lượng và chi phí vận hành**, không bằng "cái nào hiện đại hơn": một chiều và thưa; vài trăm ms là đủ; 37 triệu kết nối stateful biến mọi lần deploy thành một chiến dịch. Rồi thêm: *"Nếu yêu cầu đổi thành collaborative editing dưới 100 ms, tôi đổi sang WebSocket ngay — quyết định bám vào yêu cầu, không bám vào công nghệ."*

8. **Với conflict, nói vì sao merge bất khả thi trước khi nói bạn làm gì**: *"Blob nhị phân không có khái niệm 'dòng', không có ngữ nghĩa để hợp nhất, và một lần merge sai tạo ra file không mở được — mất cả hai bản. Nên tôi không merge: first-write-wins theo thứ tự đến ở server, bản thua giữ thành file copy có tên rõ ràng."* Rồi nêu loại conflict người khác quên — **di chuyển thư mục tạo chu trình** — cho thấy bạn coi cây thư mục là cấu trúc dữ liệu có bất biến cần bảo vệ, không chỉ là một cột `path`.

9. **Đưa quyết định sharding về ranh giới giao dịch**: *"Shard theo `namespace_id` vì mọi thao tác nằm gọn trong một namespace; shard theo `file_id` thì mỗi lần move file là một giao dịch phân tán."* Rồi tự nêu điểm yếu (hot shard doanh nghiệp) và cách gỡ (bảng tra cứu thay vì `hash % N`).

10. **Khi nói về failure, nói về hành vi của client, không chỉ của server**: *"Client tuyệt đối không được coi 'không đọc được metadata' là 'file đã bị xoá'. Phải phân biệt lỗi với rỗng — nếu không, một sự cố DB biến thành hàng triệu người mất file cục bộ."* Loại hiểu biết chỉ đến từ việc đã vận hành thật.

11. **Đóng lại bằng chi phí, vì với hệ storage thì chi phí *là* kiến trúc**: tiered theo block chứ không theo file; thưa dần version thay vì cắt cụt; thùng rác có hạn để GC chạy được; và cảnh báo phí lưu tối thiểu — chuyển block 4 MB xuống Glacier rồi xoá sau một tuần thì **đắt hơn** là để yên.

> 💡 **Nguyên tắc cuối**: cả bài chỉ là một quyết định được đẩy tới cùng — **thôi coi file là đơn vị của hệ thống; coi block bất biến định danh bằng hash là đơn vị.** Từ đó delta sync, dedupe, version history rẻ, resumable upload, cache CDN vĩnh viễn và retry idempotent đều là hệ quả. Phần còn lại — metadata strong consistency, long polling, first-write-wins — chỉ là việc xây một lớp **mutable, phải-đúng, và nhỏ** ở trên một biển dữ liệu **immutable, được-phép-trễ, và rất to**. Nếu chỉ nhớ một câu: **file là công thức lắp ráp, không phải dữ liệu.**
