# Case study: YouTube — video upload & streaming

> Bài này khác hẳn URL Shortener hay Rate Limiter ở một điểm: **ràng buộc chi phối không phải latency, không phải QPS, mà là TIỀN**. Một request redirect tốn vài trăm byte; một lượt xem video tốn hàng trăm MB. Nhân với vài triệu user mỗi ngày, hoá đơn CDN vượt xa mọi chi phí compute và storage cộng lại. Vì vậy ở bài YouTube, câu hỏi đúng tại mọi ngã rẽ không phải *"cái nào nhanh hơn?"* mà là *"cái nào rẻ hơn ở cùng một mức trải nghiệm?"*.

YouTube là case study nặng ký nhất trong bộ System Design kinh điển vì nó gộp ba hệ thống rất khác nhau: một **hệ thống upload file khổng lồ** (file hàng GB, mạng người dùng chập chờn), một **pipeline batch tính toán cực nặng** (transcoding — biến một file gốc thành hàng chục phiên bản), và một **hệ thống phân phối nội dung ở quy mô internet** (streaming). Upload là write-heavy với file lớn; transcoding là CPU-bound offline; streaming là read-heavy cực đoan với payload khổng lồ. Người phỏng vấn chấm bạn ở chỗ **có tách được ba luồng đó ra và thiết kế riêng cho từng cái** hay không, thay vì vẽ một cục "backend" rồi nhét tất cả vào.

Định cỡ bài toán thật (số liệu 2020): 2 tỉ người dùng hàng tháng, 5 tỉ lượt xem mỗi ngày, ~37% traffic internet trên di động. Ta sẽ thu nhỏ về một giả định hợp lý rồi biện luận.

---

## Bước 1: Làm rõ yêu cầu

"Thiết kế YouTube" mà ôm cả comment, subscription, recommendation, live stream, monetization thì 45 phút không đủ nói tử tế bất cứ phần nào. Câu mở đầu chuẩn: *"Tôi đề xuất tập trung vào hai luồng lõi là **upload video** và **xem video**; comment/recommendation/live tôi sẽ nhắc ở cuối nếu còn thời gian."*

**Functional (trong scope)**
- Upload video (tối đa 1 GB), hệ thống xử lý xong thì video sẵn sàng xem.
- Xem video mượt trên mobile / web / smart TV.
- Đổi chất lượng: 144p → 1080p, và **tự hạ chất lượng khi mạng yếu**.
- Metadata: tiêu đề, mô tả, thumbnail, thời lượng, kênh sở hữu.

**Ngoài scope**: comment, like, subscribe, recommendation, live, ads, search. Nói thẳng "ngoài scope" là kỷ luật, không phải né tránh.

**Non-functional**

| Yêu cầu | Vì sao quan trọng |
|---|---|
| **Chi phí thấp** | **Ràng buộc số một.** Video là loại dữ liệu đắt nhất để lưu và để truyền. Thiết kế "đúng kỹ thuật" nhưng đốt $500K/ngày là thiết kế sai |
| **High availability** | Người xem nhiều gấp hàng trăm lần người upload → đường xem phải HA hơn đường upload |
| **Scalability** | Storage tăng tuyến tính vĩnh viễn — video không bao giờ bị xoá |
| **Reliability** | Mất video gốc = mất nội dung không tạo lại được. Durability quan trọng hơn availability ở tầng storage |
| **Trải nghiệm mượt** | Chỉ số kinh doanh thật của platform video là *rebuffer ratio* và *startup time* |

> 💡 **Nguyên tắc**: Mỗi bài chọn ra **một trục chi phối** và tuyên bố ngay từ đầu. URL Shortener là *read-heavy*. Web Crawler là *politeness + scale*. YouTube là **cost**. Mọi trade-off sau đó phải quy chiếu về trục này, nếu không bạn trôi dạt giữa các lựa chọn mà không có tiêu chí quyết định.

**Giả định chốt**
```
DAU                       : 5 triệu
Mỗi user xem              : 5 video / ngày
Tỉ lệ upload : view       : 1 : 200
Kích thước video TB       : 300 MB (file gốc)
Giới hạn upload           : 1 GB / video
Chi phí CDN tham chiếu    : ~$0.02 / GB
```
Tỉ lệ **1:200** phải hỏi và chốt sớm: cứ 200 lượt xem mới có 1 lượt upload. Nghĩa là đường upload được phép chậm hơn, phức tạp hơn, thậm chí đôi lúc lỗi và retry; còn đường xem phải cực rẻ và cực nhanh.

---

## Bước 2: Back-of-envelope estimation

Khác các bài khác nơi estimation chỉ biện minh cho cache/sharding, ở đây estimation **loại bỏ cả một lớp giải pháp**.

**Storage mỗi ngày**
```
User upload/ngày = 5,000,000 / 200 = 25,000
Storage thô      = 25,000 × 300 MB ≈ 7.5 TB / ngày

Mỗi video còn transcode ra ~6 rendition (144p→1080p),
tổng transcoded ≈ 1.5–2× file gốc:
Storage thực     ≈ 7.5 TB × 3 ≈ 22 TB / ngày  (≈ 8 PB / năm, không bao giờ xoá)
```
Con số chính xác không quan trọng bằng **bậc độ lớn**: hàng chục TB/ngày, tăng vĩnh viễn. Không cụm database tự quản nào theo kịp — bắt buộc phải là **object storage phân tán (blob)**.

**Bandwidth và chi phí — con số đau đớn nhất**
```
View/ngày        = 5,000,000 × 5 = 25,000,000
Data / view      ≈ 0.3 GB (cận trên)
Bandwidth/ngày   = 25M × 0.3 GB = 7.5 PB  ≈ 87 GB/s liên tục

Chi phí CDN      = 7,500,000 GB × $0.02 = $150,000 / NGÀY
                 ≈ $4.5 triệu/tháng ≈ $54 triệu/năm
```
So sánh: storage 22 TB/ngày trên S3 Standard chỉ ~$500/ngày.
```
Cấu trúc chi phí:
  CDN egress   ██████████████████████████  ~90%
  Transcoding  ███                         ~5–8%
  Storage      █                           ~2%
  API / DB     ▏                           <1%
```

> 💡 **Nguyên tắc**: Ở bài YouTube, **egress là kẻ thù**. Mọi tối ưu đáng giá đều nhắm vào việc giảm số byte đi qua CDN. Tối ưu database ở đây gần như vô nghĩa về mặt tiền bạc.

**QPS**
```
View QPS   = 25M / 86,400 ≈ 290 rps  (peak ×3 ≈ 900 rps)
Upload QPS = 25,000 / 86,400 ≈ 0.3 rps (!)
```
Rất phản trực giác và rất đáng nêu: **QPS của YouTube thấp đến mức đáng ngạc nhiên**. Cái khó không nằm ở số request/giây mà ở **số byte/giây** — 87 GB/s.

> ⚠️ **Bẫy thiết kế**: Phản xạ "290 rps thì cần LB + 10 app server + Redis" là đúng nhưng lạc đề. Người phỏng vấn muốn nghe: *"QPS ở đây không phải vấn đề — vấn đề là 87 GB/s data plane và hoá đơn CDN."*

**Transcoding cost**
```
1 video ~10 phút, encode 6 rendition ≈ 60–120 phút CPU
25,000 video × 90 phút = 37,500 giờ CPU/ngày → ~1,560 core chạy 24/7
EC2 c6i on-demand (~$0.043/vCPU-giờ) ≈ $1,600/ngày
Với Spot (giảm ~70%)                 ≈ $500/ngày
```
Transcoding là batch, retry được, không cần realtime — đúng chân dung workload cho **Spot Instance**.

---

## Bước 3: API design

Điểm quan trọng nhất: **byte của video KHÔNG đi qua API server**. API chỉ trao đổi metadata và *giấy phép ghi*.

```
# --- Upload ---
POST /api/v1/videos/upload-url
  body: { "fileName": "vlog.mp4", "fileSize": 314572800, "mimeType": "video/mp4" }
  201 -> { "videoId": "vid_9f3a", "uploadId": "...",
           "partUrls": [ {"partNumber":1,"url":"https://blob/.../part-1?X-Amz-Signature=..."}, ...],
           "expiresIn": 3600 }
  # Client PUT thẳng từng part lên blob storage bằng các URL này.

POST /api/v1/videos/{videoId}/complete
  body: { "uploadId":"...", "parts":[{"partNumber":1,"etag":"..."},...] }
  200 -> { "status": "PROCESSING" }      # server ghép part + đẩy job vào encoding queue

PUT  /api/v1/videos/{videoId}/metadata   # gửi SONG SONG với byte, không chờ nhau
GET  /api/v1/videos/{videoId}/status
  200 -> { "status":"PROCESSING", "progress":0.62, "readyRenditions":["360p","720p"] }

# --- Streaming ---
GET /api/v1/videos/{videoId}
  200 -> { "title":"...", "durationSec":612, "thumbnailUrl":"...",
           "manifestUrl":"https://cdn/.../master.m3u8?Policy=...&Signature=..." }
  # Trả về MANIFEST URL đã ký, KHÔNG trả về file video.

GET https://cdn/.../master.m3u8          # player tải manifest
GET https://cdn/.../720p/seg_042.m4s     # player tải từng segment — đi THẲNG tới CDN
```

> 💡 **Nguyên tắc**: Trong mọi hệ thống có file lớn (video, ảnh, backup, dataset), tách **control plane** (API metadata: nhẹ, có auth, có logic) khỏi **data plane** (byte thật: nặng, đi thẳng tới storage/CDN). Trộn hai cái là sai lầm kiến trúc phổ biến nhất ở loại bài này.

---

## Bước 4: High-level design

Hệ thống có **hai luồng gần như độc lập** dùng chung một kho storage.

```
                         ┌──────────────────────────────┐
                         │           CLIENT             │
                         └───────┬──────────────┬───────┘
             ── LUỒNG UPLOAD ────┘              └──── LUỒNG XEM ──
                                 │                            │
                                 v                            v
                   ┌─────────────────────────┐      ┌────────────────────┐
                   │      API SERVERS        │      │        CDN         │
                   │ auth, metadata, presign │      │  (edge, toàn cầu)  │
                   └───┬──────────────┬──────┘      └─────────┬──────────┘
                       │              │                       │ miss
                       v              v                       v
              ┌────────────────┐  ┌─────────────────────────────────┐
              │  METADATA DB   │  │       TRANSCODED STORAGE        │
              │ (video, user,  │  │  (segment HLS/DASH nhiều mức    │
              │  trạng thái)   │  │   + manifest)                   │
              └────────────────┘  └─────────────────▲───────────────┘
                                                    │ ghi output
   client PUT byte thẳng ─────┐                     │
   (presigned URL)            v                     │
              ┌────────────────────┐      ┌─────────┴───────────┐
              │  ORIGINAL STORAGE  │─────▶│  TRANSCODING FARM   │
              │  (file gốc)        │ job  │  (DAG + task worker)│
              └────────────────────┘      └─────────┬───────────┘
                                                    │ event "xong"
                                          ┌─────────▼───────────┐
                                          │  COMPLETION QUEUE   │
                                          │  → cập nhật DB,     │
                                          │    notify user,     │
                                          │    prewarm CDN      │
                                          └─────────────────────┘
```

| Thành phần | Vai trò | Vì sao tách riêng |
|---|---|---|
| **Client** | Chia file, PUT lên blob, phát HLS/DASH | Logic chọn bitrate (ABR) nằm ở player |
| **API server** | Auth, cấp presigned URL, ghi metadata | Stateless, scale ngang dễ; **không đụng byte video** |
| **Original storage** | Lưu file gốc | Nguồn chân lý để re-encode khi có codec mới |
| **Transcoding farm** | Sinh nhiều rendition | CPU-bound, offline, elastic — scale khác hẳn API |
| **Transcoded storage** | Segment + manifest sẵn sàng phát | Là origin của CDN |
| **CDN** | Phát video tới người xem | 90% chi phí và toàn bộ trải nghiệm nằm ở đây |
| **Metadata DB** | Tiêu đề, trạng thái, danh sách rendition | Nhỏ, QPS thấp, nhưng là điểm truy vấn nóng |
| **Completion queue** | Tách hậu xử lý khỏi transcoding | Worker không nên gọi thẳng DB/notification |

---

## Deep dive 1 — Video uploading flow

### Vì sao byte KHÔNG được đi qua API server

Câu hỏi gần như chắc chắn bị hỏi. Cách ngây thơ — client `POST /upload` file 300 MB lên API server, server nhận rồi ghi vào blob — có năm vấn đề:

1. **Gấp đôi băng thông và độ trễ.** Byte đi client → API → blob. Trả tiền băng thông hai lần, thời gian upload dài gấp đôi.
2. **API server bị giữ chỗ rất lâu.** 300 MB trên mạng 5 Mbps mất ~8 phút; suốt 8 phút đó một connection bị chiếm. Với vài nghìn upload đồng thời, server chết vì cạn connection chứ không phải vì CPU.
3. **Phá vỡ tính stateless.** Upload đứt giữa chừng thì phần đã nhận nằm trên đĩa local của *server nào*? Muốn resume phải quay lại đúng server đó → sticky session → mất khả năng scale ngang.
4. **Giới hạn cứng hạ tầng.** API Gateway giới hạn payload 10 MB, Lambda 6 MB, ALB có timeout. Riêng điều này đã loại bỏ hướng đi qua API.
5. **Chi phí.** Trả tiền compute chỉ để chuyển byte.

**Giải pháp: presigned URL.** API server không nhận byte, nó cấp một **giấy phép có chữ ký**:
```
1. Client: "Tôi muốn upload vlog.mp4, 300 MB"  ──▶ API server
2. API server: kiểm auth/quota → tạo videoId, ghi bản ghi PENDING
   → ký URL: blob/bucket/vid_9f3a?Signature=...&Expires=+1h
     ▲ chữ ký chứng minh "user này được PUT vào ĐÚNG key này, trong 1 giờ tới"
3. Client PUT byte THẲNG lên blob storage bằng URL đó
4. Blob storage tự kiểm chữ ký (secret dùng chung) → cho ghi
```
Chữ ký thay thế việc backend đứng canh: blob storage tự xác thực được mà không cần hỏi lại API. Đổi lại, **URL đó là một bearer token** — ai có URL đều ghi được, nên phải hạn ngắn (15–60 phút) và ràng buộc chặt.

> ⚠️ **Bẫy thiết kế**: Ký presigned URL không ràng buộc `Content-Length` hay key → user ghi đè file người khác hoặc upload 500 GB rác. Presigned URL phải kèm điều kiện: key do server sinh, giới hạn kích thước, cố định content-type.

### Multipart upload

File 1 GB PUT một phát rất mong manh — rớt mạng ở phút 12 là mất sạch. Giải pháp: **chia thành nhiều part** (5–100 MB) upload độc lập.
```
File 1 GB
 ├── part 1 ──▶ PUT ✓ etag "a1b2"
 ├── part 2 ──▶ PUT ✓ etag "c3d4"
 ├── part 3 ──▶ PUT ✗ lỗi mạng → RETRY CHỈ PART NÀY
 ├── part 4 ──▶ PUT ✓  (song song với part 3)
 └── ...
      ▼ CompleteMultipartUpload(uploadId, [{part, etag}...])
   blob storage ghép các part thành một object (không copy byte)
```

| Lợi ích | Cơ chế | Vì sao quan trọng |
|---|---|---|
| **Resumable** | Retry chỉ part hỏng | Mạng di động rớt là chuyện thường, không phải ngoại lệ |
| **Song song** | Upload 4–8 part cùng lúc | Một TCP connection không dùng hết băng thông (cửa sổ tắc nghẽn); nhiều connection thì có |
| **Throughput** | Nhiều luồng | Giảm thời gian upload thực tế 2–5× |
| **Vượt giới hạn size** | Object ghép từ part | S3 PUT đơn tối đa 5 GB; multipart tới 5 TB |

Phải có lifecycle rule **huỷ multipart chưa complete sau 7 ngày** — nếu không, upload dở dang chiếm dung lượng mãi mãi và **vẫn bị tính tiền**.

### Metadata upload chạy song song

```
       CLIENT
      ┌───┴───┐
 (A) byte    (B) metadata
  8 phút      50 ms
     v           v
 BLOB STORAGE   API SERVER ──▶ METADATA DB
```
Metadata nhỏ và nhanh; người dùng điền form trong lúc file đang lên. Bắt chờ upload xong mới cho điền là làm hỏng trải nghiệm vô ích. Hai luồng ghi vào hai nơi, gắn với nhau bằng `videoId` API sinh ở bước đầu.

Hệ quả: có **trạng thái trung gian** cần quản lý — metadata đã tồn tại nhưng file chưa lên xong. Cần một state machine tường minh:
```
PENDING ──(upload complete)──▶ UPLOADED ──(job enqueued)──▶ PROCESSING
                                              ┌──────────────┴──────────┐
                                              v                         v
                                           FAILED                    READY
                                    (báo user, cho retry)   (công khai, prewarm CDN)
```

> 💡 **Nguyên tắc**: Mọi pipeline bất đồng bộ cần một **state machine tường minh lưu trong DB**, không phải trạng thái ngầm trong queue. Queue không trả lời được câu hỏi "video này đang ở đâu trong pipeline?" — mà đó là câu người dùng và đội vận hành hỏi mỗi ngày.

### Resumable upload và failure recovery

Multipart mới giải quyết nửa vấn đề. Nửa còn lại: client biết mình upload tới đâu bằng cách nào sau khi app bị kill?
```
Mở lại app → GET /api/v1/videos/{videoId}/upload-state
Server gọi ListParts(uploadId) trên blob → [1, 2, 4, 5]  (thiếu part 3)
Client upload lại part 3 rồi complete.
```
Mấu chốt: **trạng thái "đã upload tới đâu" nằm ở blob storage, không ở API server**. Nhờ đó API vẫn stateless và request resume rơi vào server nào cũng được. Đây là lý do sâu xa khiến presigned + multipart là cặp bài trùng — chúng đẩy state ra khỏi tầng compute. (Chuẩn tương đương cho trình duyệt: giao thức **tus**.)

Tối ưu bổ sung khi user ở xa: cho client upload vào **edge location gần nhất** rồi đi backbone của nhà cung cấp thay vì internet công cộng — trên AWS là **S3 Transfer Acceleration**.

### Deduplicate video giống hệt nhau

Cùng một clip viral được hàng nghìn người tải lại. Lưu và transcode lại từng bản là lãng phí thuần tuý.
```
Client tính SHA-256 file trước khi upload
  ──▶ POST /videos/check-duplicate { "hash": "9af3..." }
        ├── đã tồn tại & READY → tạo metadata mới TRỎ TỚI cùng bộ rendition
        │                        → bỏ qua hoàn toàn upload + transcoding  ✓
        └── chưa có            → cấp presigned URL bình thường
```

| Mức | Cách làm | Bắt được gì | Chi phí |
|---|---|---|---|
| **Byte-exact** | Hash toàn file | File y hệt từng byte | Gần như miễn phí |
| **Content-level** | Hash sau khi bỏ metadata container | Cùng nội dung, khác tag/EXIF | Rẻ |
| **Perceptual** | Video/audio fingerprint (pHash) | Cùng nội dung dù khác độ phân giải, có crop, có logo | Đắt, cần ML |

Mức perceptual chính là nền tảng của **Content ID**. Câu trả lời đủ trong phỏng vấn: "byte-exact rẻ nên làm ngay; perceptual đắt nên chỉ chạy phục vụ mục đích bản quyền."

---

## Deep dive 2 — Transcoding pipeline (phần lõi của bài)

Nếu chỉ kịp nói kỹ một thứ trong cả bài, hãy chọn phần này.

### Vì sao bắt buộc phải transcode

1. **Dung lượng.** File user upload thường có bitrate cao hơn mức cần nhiều lần. Transcode với preset tốt giảm 30–50% dung lượng ở cùng chất lượng cảm nhận → giảm thẳng hoá đơn CDN.
2. **Tương thích thiết bị.** Smart TV đời 2016 không giải mã AV1; Safari cũ không phát VP9. Chỉ có một bản thì một phần người dùng không xem được gì cả.
3. **Thích ứng băng thông.** Người xem trên 4G không kéo nổi 1080p 5 Mbps; phải có sẵn bản 240p 400 kbps để rơi xuống.
4. **Chuẩn hoá cho streaming.** File MP4 nguyên khối không phục vụ được adaptive streaming — phải cắt thành **segment** đều nhau và sinh **manifest**.

### Container vs codec

- **Container** (`.mp4`, `.webm`, `.ts`, `.m4s`) là *cái hộp*: đóng gói luồng video, audio, phụ đề, metadata đồng bộ thời gian — không nén gì.
- **Codec** (H.264, H.265, VP9, AV1) là *thuật toán nén* tạo ra byte thật.

| Codec | Hiệu quả nén | Thiết bị hỗ trợ | Chi phí encode | Ghi chú |
|---|---|---|---|---|
| **H.264 (AVC)** | Tham chiếu | ~100% | Rẻ, có hardware encoder khắp nơi | Bản "an toàn" bắt buộc |
| **H.265 (HEVC)** | Tốt hơn ~40% | Tốt trên Apple, kém trên web | 2–5× | Vướng patent/licensing |
| **VP9** | Tốt hơn ~40% | Chrome/Android tốt, Safari hạn chế | Đắt | Miễn phí bản quyền |
| **AV1** | Tốt hơn ~50% | Thiết bị đời mới | 5–10× | Chỉ encode cho video siêu phổ biến |

Đây là trade-off chi phí kinh điển: **trả thêm CPU một lần lúc encode để tiết kiệm băng thông mãi mãi**. Điểm hoà vốn phụ thuộc lượt xem:
```
10 view:  AV1 tốn thêm ~$0.50 CPU, tiết kiệm 10 × 0.15 GB × $0.02 = $0.03   → LỖ
10M view: tốn thêm ~$0.50,        tiết kiệm 10M × 0.15 GB × $0.02 = $30,000 → LÃI LỚN
```

> 💡 **Nguyên tắc**: Số bản encode nên **tỉ lệ thuận với độ phổ biến của video**, không cố định cho mọi video. Đây là một trong những tối ưu chi phí lớn nhất của bài.

### DAG — mô hình hoá công việc transcoding

Transcoding không phải một tác vụ đơn lẻ mà là **tập nhiệm vụ có phụ thuộc**. Mô hình chuẩn là **DAG (Directed Acyclic Graph)**: node = task, cạnh = ràng buộc "phải xong trước".

```
              ┌──────────────┐
              │  VIDEO GỐC   │
              └──────┬───────┘
              ┌──────▼───────┐  file hợp lệ không: codec gì, fps,
              │  INSPECTION  │  độ phân giải, có corrupt, có audio
              └──────┬───────┘
       ┌─────────────┼─────────────┐
   ┌───▼───┐    ┌────▼────┐   ┌────▼─────┐        ← STAGE 1: tách luồng
   │ VIDEO │    │  AUDIO  │   │ METADATA │
   └───┬───┘    └────┬────┘   └──────────┘
   ┌───┼────────┐    │
┌──▼──┐│ ┌──────▼─┐ ┌▼─────────┐                  ← STAGE 2: song song
│VIDEO││ │THUMBNAIL│ │WATERMARK│
│ENCODE││ │(trích+ │ │(overlay │
│ × N ││ │ chọn)  │ │ nhận dạng)│
└──┬──┘│ └──────┬─┘ └┬─────────┘
   └───┴────────┴────┘
         ┌──────▼───────┐ ghép audio+video, cắt segment,
         │  PACKAGING   │ sinh manifest .m3u8 / .mpd
         └──────┬───────┘
         ┌──────▼───────┐
         │    OUTPUT    │ → transcoded storage → CDN
         └──────────────┘
```

DAG mang lại ba thứ:
1. **Song song tự động.** Nhìn đồ thị là biết task nào chạy cùng lúc được: thumbnail không phụ thuộc watermark, ba rendition hoàn toàn độc lập. Scheduler chỉ cần chạy mọi node đã đủ dependency.
2. **Khả năng cấu hình.** DAG sinh từ **file cấu hình** (YAML/JSON: cần rendition nào, có watermark không, thumbnail lấy ở giây nào). Đổi yêu cầu không cần sửa code pipeline.
3. **Retry chính xác.** Task nào fail retry đúng task đó. Với video 2 giờ, khác biệt này là hàng chục phút CPU mỗi lần lỗi.

### Chia video thành chunk để encode song song — ý tưởng cốt lõi

Đây là **ý tưởng quan trọng nhất của cả phần transcoding**, và là chỗ phân biệt rõ nhất giữa người đã nghĩ kỹ và người chỉ thuộc sơ đồ.

**Vấn đề:** encode một video 2 giờ 1080p là công việc tuần tự tốn hàng giờ CPU. Giao cho một máy thì người upload phải chờ rất lâu, và **thêm máy cũng không rút ngắn được** — một tiến trình FFmpeg đơn không scale vượt quá một máy.

**Ý tưởng:** video không phải khối liền mạch không cắt được. Nó là chuỗi **GOP (Group of Pictures)**.
```
 │ I │ P │ P │ B │ P │ P │ I │ P │ P │ B │ P │ P │ I │ P │ ...
 └────── GOP 1 ──────┘└────── GOP 2 ──────┘└─ GOP 3 ─...

 I-frame (keyframe): khung hình HOÀN CHỈNH, giải mã ĐỘC LẬP
 P-frame: chỉ lưu khác biệt so với khung TRƯỚC
 B-frame: khác biệt so với khung trước VÀ sau
```
Mấu chốt: **I-frame là điểm cắt an toàn** — mọi thứ sau một I-frame không cần biết gì về những gì đứng trước. Vậy ta cắt video tại biên GOP thành các **chunk độc lập** và encode từng chunk trên một máy khác nhau.

```
Video 2 giờ
   ├── cắt tại biên GOP (mỗi chunk ~30 giây, đúng vào I-frame)
   ├── chunk 001 ──▶ worker A ──▶ encode 360p/720p/1080p ─┐
   ├── chunk 002 ──▶ worker B ──▶ ...                     ├──▶ ghép lại
   ├── ...        (240 chunk trên 240 worker)             │   (concat bitstream)
   └── chunk 240 ──▶ worker Z ──▶ ...                     ┘
                                                          ▼
   Thời gian: 4 GIỜ tuần tự  →  ~2 PHÚT song song    video hoàn chỉnh
```

Vì sao việc này không làm hỏng video:
- **Ghép không cần re-encode.** Mỗi chunk bắt đầu bằng I-frame và kết thúc trọn một GOP, nên nối các chunk đã encode chỉ là thao tác trên container, không phải decode rồi encode lại.
- **Segment HLS/DASH cũng cắt tại biên GOP.** Ranh giới chunk-để-encode và ranh giới segment-để-stream **trùng nhau** — một mũi tên trúng hai đích. Nếu chọn chunk = segment (cả hai 4–6 giây), output của worker chính là file segment cuối cùng, không cần ghép gì thêm.

Ba điểm tinh tế phải xử lý (nêu được thì rất ăn điểm):

| Vấn đề | Vì sao xảy ra | Cách xử lý |
|---|---|---|
| **Bitrate lệch giữa chunk** | Mỗi worker encode độc lập nên rate control không nhìn thấy toàn cục; chunk cảnh tĩnh và cảnh động chất lượng lệch nhau | **2-pass**: pass 1 phân tích toàn video sinh thống kê độ phức tạp, pass 2 encode từng chunk theo ngân sách bitrate đã tính |
| **Nhấp nháy ở ranh giới** | Encoder "khởi động lại" mỗi chunk, quality ramp-up gây giật nhẹ | Cho worker encode thêm vài GOP **chồng lấn (overlap)** ở đầu chunk rồi bỏ phần thừa |
| **File cũ GOP không đều** | Video user upload có thể có GOP rất dài hoặc bất thường | **Preprocessor re-align GOP trước**: decode rồi chèn I-frame đều đặn, sau đó mới cắt |

> ⚠️ **Bẫy thiết kế**: Nói "chia video thành các đoạn bằng nhau theo thời gian rồi encode song song" mà không nhắc GOP/I-frame là sai về kỹ thuật. Cắt giữa một GOP tạo ra chunk không giải mã độc lập được, và khi ghép sẽ vỡ hình ở mọi ranh giới.

Hệ quả thực tế rất đáng nêu: nhờ chunk-based encoding mà hệ thống **phát hành từng rendition dần dần** — bản 360p encode nhanh nhất nên xong trước, cho xem ngay sau 1–2 phút, trong khi 4K vẫn chạy nền. Đó là lý do video mới upload lúc đầu chỉ có vài mức chất lượng.

### Kiến trúc transcoding farm

```
  ┌───────────────┐
  │ ORIGINAL BLOB │
  └───────┬───────┘
  ┌───────▼──────────────────────────────────────────────┐
  │ PREPROCESSOR                                         │
  │  1. chia chunk theo biên GOP   2. re-align GOP       │
  │  3. sinh DAG từ file cấu hình  4. ghi vào TEMP STORE │
  └───────┬──────────────────────────────────────────────┘
  ┌───────▼──────────────────────────────────────────────┐
  │ DAG SCHEDULER — cắt DAG thành stage tuần tự, task    │
  │ độc lập trong cùng stage chạy song song → task queue │
  └───────┬──────────────────────────────────────────────┘
  ┌───────▼──────────────────────────────────────────────┐
  │ RESOURCE MANAGER                                     │
  │   [TASK QUEUE]   [WORKER QUEUE]   [RUNNING QUEUE]    │
  │    task chờ       ai rảnh/tải      đang chạy ở đâu   │
  │        └──────┬───────┘                  ▲           │
  │          ┌────▼─────────────┐            │           │
  │          │ TASK SCHEDULER   │────────────┘           │
  │          │ ghép task↔worker │                        │
  │          └────┬─────────────┘                        │
  └───────────────┼──────────────────────────────────────┘
      ┌───────────┼───────────┬───────────┐
      v           v           v           v
 ┌────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐
 │ encode │ │thumbnail│ │watermark│ │ encode │   ← TASK WORKERS
 └────┬───┘ └────┬────┘ └────┬────┘ └────┬───┘
      └──────────┴───────────┴───────────┘
                 │ đọc/ghi trung gian
         ┌───────▼────────┐ chunk gốc + kết quả từng stage,
         │  TEMP STORAGE  │ giữ lại để RETRY khi lỗi
         └───────┬────────┘
         ┌───────▼────────────┐
         │ TRANSCODED STORAGE │ → CDN
         └────────────────────┘
```

**Preprocessor** — bốn nhiệm vụ, cả bốn đều cần: (1) chia chunk tại biên GOP, nền tảng cho song song hoá; (2) re-align GOP cho file có keyframe bất thường — không làm thì mọi thứ phía sau vỡ; (3) sinh DAG từ cấu hình, khiến pipeline **linh hoạt mà không cần deploy lại**; (4) ghi chunk vào temp storage để retry khỏi làm lại từ file gốc.

**DAG Scheduler** biến đồ thị thành **các stage tuần tự** (stage 1 tách video/audio/metadata; stage 2 mới chạy encode và thumbnail song song), chỉ đưa task vào hàng đợi khi mọi dependency đã xong.

**Resource Manager** — ba hàng đợi và một bộ lập lịch:

| Thành phần | Chứa gì | Dùng để |
|---|---|---|
| **Task queue** | Hàng đợi ưu tiên các task đang chờ | Ưu tiên video kênh lớn / video ngắn |
| **Worker queue** | Hàng đợi ưu tiên thông tin tài nguyên từng worker | Biết ai rảnh, ai có GPU, ai gần dữ liệu |
| **Running queue** | Task đang chạy và worker nào chạy | Phát hiện task treo (timeout) để reschedule |
| **Task scheduler** | Logic ghép cặp | Chọn *task ưu tiên nhất* × *worker phù hợp nhất* rồi ra lệnh chạy |

Tách riêng worker queue cho phép ghép việc thông minh: encode AV1 nặng → máy nhiều core/GPU; thumbnail nhẹ → máy nhỏ. Một hàng đợi chung buộc mọi worker phải giống nhau — lãng phí.

**Task workers** là tiến trình thực thi (thường là FFmpeg trong container). Phải **stateless và idempotent**: chạy lại cùng input phải ra cùng output, vì hệ thống sẽ retry.

**Temporary storage** — chọn theo đặc tính dữ liệu:

| Dữ liệu trung gian | Kích thước | Vòng đời | Lưu ở đâu |
|---|---|---|---|
| Metadata DAG, trạng thái task | KB | Ngắn | In-memory store (Redis) |
| Chunk đã tiền xử lý / kết quả encode | Hàng trăm MB | Giờ | Blob storage |
| Thumbnail ứng viên | MB | Ngắn | Blob hoặc cache |

Phải có lifecycle xoá temp sau vài ngày, nếu không nó phình bằng cả kho video chính.

### Message queue giữa các stage

Các mũi tên giữa stage không nên là lời gọi hàm trực tiếp mà là **message queue**.
```
Gọi trực tiếp:  Encoding ──gọi──▶ Thumbnail ──gọi──▶ Watermark
   Vấn đề: coupling chặt. Thumbnail chậm → encoding bị chặn.
           Watermark chết → cả dây chuyền dừng.
           Thêm bước mới → phải sửa code module trước.

Dùng queue:     Encoding ──▶ [completion queue] ──▶ Thumbnail worker
                                     ├──▶ Watermark worker   ← thêm consumer
                                     └──▶ Notification worker   không sửa producer
```
Bốn lợi ích: **decoupling** (producer không cần biết ai tiêu thụ); **buffering trước burst** (10,000 video cùng upload thì queue hấp thụ, khỏi phải over-provision cho peak); **retry và dead-letter** (message fail vào DLQ để điều tra thay vì mất luôn); **scale độc lập** (số worker encode và số worker thumbnail điều chỉnh riêng theo độ dài hàng đợi tương ứng).

> 💡 **Nguyên tắc**: Ở mọi chỗ có hai module với **tốc độ xử lý** hoặc **độ tin cậy** khác nhau đáng kể, hãy đặt queue vào giữa. Queue là cách rẻ nhất để một hệ thống chậm không kéo sập một hệ thống nhanh.

---

## Deep dive 3 — Video streaming flow

### Streaming khác download ở chỗ nào

Khác biệt không phải "streaming xem được luôn" mà là **mô hình truyền dữ liệu**:

| | Download | Streaming |
|---|---|---|
| Đơn vị truyền | Toàn bộ file | Từng segment 2–10 giây |
| Bắt đầu xem được | Sau khi tải xong | Sau segment đầu (~1–3 giây) |
| Bộ nhớ client | Chứa cả file | Buffer vài chục giây |
| Đổi chất lượng giữa chừng | Không | Được, ở mọi ranh giới segment |
| Tua (seek) | Cần sẵn dữ liệu | Chỉ tải segment tại vị trí đó |
| Băng thông lãng phí | Tải hết dù bỏ sau 10 giây | Chỉ tải phần thực sự xem |

Dòng cuối là tối ưu chi phí lớn: phần lớn người xem bỏ giữa chừng — download trả tiền 100% dung lượng, streaming chỉ trả cho phần đã phát.

### Adaptive Bitrate Streaming (HLS / DASH)

Ta có **nhiều phiên bản cùng nội dung ở các bitrate khác nhau**, mỗi phiên bản cắt thành segment **có ranh giới thời gian trùng khớp**. Player đo tốc độ mạng và **chọn phiên bản cho từng segment**.
```
 master.m3u8  (manifest gốc — danh sách rendition)
 ├── 240p/index.m3u8  → seg_001 seg_002 seg_003 ...   400 kbps
 ├── 480p/index.m3u8  → seg_001 seg_002 seg_003 ...  1200 kbps
 ├── 720p/index.m3u8  → seg_001 seg_002 seg_003 ...  2500 kbps
 └── 1080p/index.m3u8 → seg_001 seg_002 seg_003 ...  5000 kbps
                           ▲        ▲        ▲
 Timeline:              0–6s     6–12s    12–18s   (MỌI rendition cắt cùng mốc)

 Player khi mạng thay đổi:
   seg_001 → 480p  (khởi động thận trọng)
   seg_002 → 720p  (đo được mạng tốt, nâng)
   seg_003 → 1080p
   seg_004 → 360p  (vào thang máy, mạng tụt → hạ ngay, KHÔNG buffering)
   seg_005 → 720p  (ra khỏi thang máy)
```
Vì các rendition cắt cùng mốc thời gian và mỗi segment bắt đầu bằng I-frame, player chuyển mức bất cứ lúc nào mà hình không gián đoạn. Đây chính là lý do phần transcoding phải cắt theo GOP — nó là **điều kiện kỹ thuật để ABR hoạt động**.

| | **HLS** (Apple) | **MPEG-DASH** |
|---|---|---|
| Manifest | `.m3u8` (text) | `.mpd` (XML) |
| Segment | `.ts` (cũ), fMP4 (mới) | `.m4s` (fMP4) |
| Chuẩn hoá | De-facto do Apple định | Chuẩn quốc tế ISO, mở |
| Hỗ trợ | Bắt buộc trên iOS/Safari | Rộng trên Android/web, không native trên Safari |
| Thực tế | Phải có nếu phục vụ Apple | Phải có nếu muốn linh hoạt tối đa |

Giải pháp hiện đại là **CMAF** — định dạng segment fMP4 chung mà **cả HLS và DASH đều tham chiếu được**: chỉ lưu **một bộ segment**, sinh hai manifest, tiết kiệm ~50% storage tầng transcoded.

> ⚠️ **Bẫy thiết kế**: Encode hai bộ segment riêng cho HLS (`.ts`) và DASH (`.m4s`) là nhân đôi cả chi phí transcoding lẫn storage cho cùng nội dung. Nêu CMAF cho thấy bạn biết thực tế production, không chỉ thuộc sách.

### CDN và cái giá của nó

CDN làm streaming khả thi — segment cache tại edge gần người xem — nhưng cũng là **90% hoá đơn**. Vấn đề cốt lõi: **đẩy toàn bộ video lên CDN là lãng phí khủng khiếp**, vì phân bố lượt xem cực lệch.
```
  Số lượt xem
      │ █
      │ █
      │ █ █
      │ █ █ █ ▄ ▄ ▄ ▁ ▁ ▁ ▁ ▁ ▁ ▁ ▁ ▁ ▁ ▁ ▁ ▁ ▁ ▁ ▁ ▁
      └──────────────────────────────────────────────▶
        20% video "nóng"        80% video "long tail"
        → 80% lượt xem          → 20% lượt xem (rất nhiều video 0–10 view mãi mãi)
```
Đẩy 100% video lên CDN nghĩa là trả tiền lưu trữ tại hàng trăm edge cho hàng triệu video **gần như không ai xem**. Chiến lược đúng:
```
   Người xem ──▶ CDN EDGE (chỉ chứa video PHỔ BIẾN)
                    │ cache MISS (long tail)
                    ▼
                 HIGH-CAPACITY ORIGIN (transcoded storage, vài region)
```

| Chiến lược | Chi phí | Trải nghiệm | Khi nào |
|---|---|---|---|
| Mọi video push lên CDN | Rất cao | Tốt đều | Chỉ hợp catalogue nhỏ |
| Chỉ video phổ biến lên CDN | Thấp hơn nhiều | Video hiếm chậm hơn chút | **Mặc định nên chọn** |
| Không dùng CDN | Đắt ở origin, latency tệ | Kém | Không nên |

Ngưỡng "phổ biến" có thể rất đơn giản: vượt N view trong 24 giờ thì **prewarm** lên CDN; không được xem trong 30 ngày thì evict. CDN vốn tự làm bằng LRU, nhưng chủ động điều khiển thì tối ưu tốt hơn.

**Pre-fetch tại client.** Player tải trước vài segment vào buffer. Buffer dài chống rớt mạng tốt hơn nhưng lãng phí băng thông khi người xem bỏ giữa chừng — thực tế thường 20–30 giây, và **giảm buffer khi phát hiện người dùng hay lướt qua**.

**Video prewarming cho kênh lớn.** Kênh 50 triệu subscriber upload video mới thì chắc chắn có hàng triệu lượt xem trong 10 phút tới. Thay vì để lượt xem đầu ở mỗi region chịu cache-miss, hệ thống **chủ động đẩy segment lên edge các region đông subscriber ngay khi transcoding xong** — giảm latency lượt xem đầu và tránh thundering herd đập vào origin.
```
transcode xong ──▶ tra số subscriber & phân bố địa lý
                     ├── > 1 triệu sub → PREWARM lên edge các region top
                     └── kênh nhỏ      → để CDN tự cache theo nhu cầu thật
```

**Phân vùng theo khu vực.** Video tiếng Việt gần như chỉ xem ở Việt Nam — không có lý do replicate sang edge Brazil. Quyết định replicate dựa trên **phân bố địa lý thực tế của lượt xem**, không rải đều.

**Custom CDN / peering ISP.** Giải pháp cuối ở quy mô lớn: tự xây CDN, đặt server cache ngay trong datacenter nhà mạng (Google Global Cache, Netflix Open Connect). Traffic không qua internet công cộng nữa → chi phí giảm mạnh, ISP cũng tiết kiệm transit. Chỉ hợp lý khi đủ lớn để đàm phán được.

---

## Deep dive 4 — Tối ưu chi phí

### Tiered storage

Video mới được xem nhiều vài ngày đầu rồi rơi vào quên lãng, nhưng file vẫn phải giữ mãi.
```
  Lượt xem
     │ █
     │ █▄
     │ █ █▄▄▄▄▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁
     └───────────────────────────────────▶
      ngày 0–7   tuần 2–4      tháng 2+
        HOT        WARM          COLD
```

| Tầng | Dùng cho | Đặc tính | Chi phí tương đối |
|---|---|---|---|
| **Hot** | Video mới/trending, segment đang phục vụ | Đọc tức thì | 1× |
| **Warm / IA** | Video vài tháng tuổi, thỉnh thoảng có người xem | Rẻ hơn ~45% lưu, **tính phí mỗi lần đọc** | ~0.55× + phí retrieval |
| **Cold / Archive** | **File gốc** của video cũ | Rất rẻ, khôi phục mất phút–giờ | ~0.1–0.02× |

Điểm hay bị bỏ sót: **file gốc và file transcoded có vòng đời hoàn toàn khác nhau**. File transcoded đang phục vụ người xem → phải ở tầng nhanh. File gốc sau khi transcode xong **gần như không bao giờ đọc lại** (chỉ cần khi re-encode sang codec mới, vài năm một lần) → ứng viên hoàn hảo cho archive tier.
```
original/*     : 30 ngày Standard → Glacier Deep Archive (rẻ hơn ~95%)
transcoded/*   : Intelligent-Tiering (tự chuyển tầng theo truy cập thật)
temp/*         : xoá sau 7 ngày
multipart dở   : abort sau 7 ngày
```

> ⚠️ **Bẫy thiết kế**: Đưa file **đang phục vụ streaming** vào Infrequent Access để "tiết kiệm". IA rẻ hơn ở phí lưu nhưng **tính phí mỗi GET**; segment được đọc hàng triệu lần → hoá đơn retrieval đắt hơn phần tiết kiệm rất nhiều. IA/Archive chỉ dành cho dữ liệu thật sự hiếm khi đọc.

### Giảm số bản encode theo mức độ phổ biến

```
Video MỚI (chưa biết hot hay không)
  → encode tối thiểu: 360p + 720p, chỉ H.264  (đủ xem ngay, rẻ)
      ├── < 1,000 view sau 7 ngày → DỪNG, không encode thêm  (~80% số video)
      ├── > 10,000 view           → thêm 1080p, VP9
      └── > 1,000,000 view        → thêm 4K, AV1, bitrate ladder dày
                                     (tiết kiệm băng thông thừa bù chi phí encode)
```
Biến thể cực đoan hơn: **encode on-demand (JIT)** cho long tail — chỉ giữ một bản, có người xem mức khác thì transcode lúc đó.

| | Pre-encode | On-demand (JIT) |
|---|---|---|
| Chi phí storage | Cao (giữ mọi rendition) | Thấp (1 bản + gốc) |
| Chi phí compute | Trả một lần | Trả mỗi lần có người xem lạ |
| Latency lượt xem đầu | Thấp | Cao (giây → chục giây) |
| Hợp với | Video phổ biến | Long tail, rendition hiếm |

### Bảng tổng hợp các đòn bẩy chi phí

| Đòn bẩy | Giảm gì | Tiết kiệm ước tính | Cái giá |
|---|---|---|---|
| Chỉ CDN hoá video phổ biến | Egress + storage edge | 30–50% chi phí CDN | Video hiếm khởi động chậm hơn |
| Codec tốt hơn (VP9/AV1) cho video hot | Egress | 30–50% byte video hot | Chi phí encode tăng nhiều lần |
| CMAF dùng chung HLS+DASH | Storage + transcoding | ~50% tầng transcoded | Cần packager hỗ trợ |
| Archive file gốc | Storage | ~95% chi phí lưu file gốc | Khôi phục chậm khi cần re-encode |
| Intelligent-Tiering cho transcoded | Storage | 20–40% | Phí monitoring mỗi object |
| Spot instance cho transcoding | Compute | ~70% | Phải chịu được bị thu hồi giữa chừng |
| Ít rendition cho long tail | Compute + storage | 40–60% chi phí encode | Ít lựa chọn chất lượng |
| Regional distribution | Egress liên vùng | 10–20% | Logic phân phối phức tạp hơn |
| Peering / custom CDN | Egress | Rất lớn ở quy mô đủ to | Đầu tư hạ tầng + đàm phán ISP |

---

## Deep dive 5 — An toàn, bản quyền, kiểm duyệt

### Bảo vệ nội dung

| Cơ chế | Cách hoạt động | Chống được | Không chống được |
|---|---|---|---|
| **Signed URL / signed cookie** | URL kèm chữ ký có hạn; CDN từ chối nếu hết hạn/sai IP | Chia sẻ link, hotlinking | Người dùng hợp lệ tự tải về |
| **AES-128 (HLS)** | Segment mã hoá, key lấy qua endpoint có auth | Tải trực tiếp segment từ CDN | Người có key vẫn giải mã |
| **DRM** (Widevine/FairPlay/PlayReady) | Key quản lý trong môi trường bảo mật thiết bị, giải mã trong hardware | Gần như mọi hình thức sao chép | Quay màn hình bằng camera |

Với platform nội dung do user tạo, **signed URL thường là đủ**; DRM chỉ cần cho nội dung premium — vì DRM đắt license, phức tạp vận hành và làm hỏng trải nghiệm trên nhiều thiết bị. Nêu được sự phân biệt này quan trọng hơn kể tên hết các loại DRM.

**Watermarking** khác về bản chất: không ngăn sao chép mà nhúng thông tin nhận dạng để **truy vết nguồn rò rỉ** — logo hiển thị, hoặc forensic watermark nhúng chìm theo từng phiên phát.

### Copyright, DMCA và Content ID

**DMCA (phản ứng, sau khiếu nại):**
```
Takedown notice ──▶ gỡ video (hoặc chặn theo lãnh thổ) ──▶ báo người upload
                        ├── không phản đối → gỡ vĩnh viễn, kênh nhận strike
                        └── counter-notice → chuyển xử lý pháp lý giữa hai bên
```
Yêu cầu kỹ thuật: **audit log không thể sửa** (dữ liệu pháp lý) và phải gỡ được **cả trên CDN** — xoá ở origin là chưa đủ, cần invalidate cache mọi edge.

**Content ID (chủ động, fingerprint):**
```
Video mới ──▶ FINGERPRINT EXTRACTION
                - Video: pHash theo khung hình (bền trước crop, scale, đổi màu)
                - Audio: phổ tần số → chuỗi hash theo thời gian (bền trước nén)
           ──▶ MATCHING (ANN search trên kho tham chiếu đã đăng ký)
           ──▶ Chủ sở hữu chọn chính sách:
                 ├── BLOCK    : chặn
                 ├── MONETIZE : cho phép, doanh thu về chủ sở hữu
                 └── TRACK    : cho phép, chỉ thống kê
```
Điểm kỹ thuật đáng nêu: fingerprint phải **bền trước biến đổi** — cùng bài hát dù nén lại, đổi tốc độ nhẹ, hay phát qua loa rồi thu lại vẫn phải khớp. Đây là bài toán **approximate nearest neighbor** trên hàng trăm triệu vector, không phải so hash chính xác — cũng chính là kỹ thuật dùng cho dedup perceptual ở trên.

### Moderation

Không thể để người thật xem hết 25,000 video/ngày. Kiến trúc chuẩn là **lọc nhiều tầng**:
```
Tầng 1 — TỰ ĐỘNG trong pipeline (rẻ, nhanh, recall cao)
  - Trích khung hình mỗi 1–5 giây → model phân loại ảnh
  - Audio → text → phân loại ngôn từ thù ghét
  - So khớp hash với kho nội dung cấm đã biết
      ├── điểm rất cao  → CHẶN NGAY
      ├── điểm trung bình → xuất bản nhưng giới hạn (không đề xuất, không
      │                     kiếm tiền) + đưa vào hàng chờ duyệt
      └── điểm thấp     → xuất bản bình thường
Tầng 2 — NGƯỜI DUYỆT: hàng chờ ưu tiên video nhiều view / bị report nhiều
Tầng 3 — CỘNG ĐỒNG REPORT: tăng ưu tiên trong hàng chờ tầng 2
```
Trade-off trung tâm là **precision vs recall**: chặn nhầm làm mất lòng creator, bỏ lọt gây khủng hoảng truyền thông và rủi ro pháp lý. Vì vậy không dùng một ngưỡng duy nhất mà chia nhiều dải hành động, ngưỡng điều chỉnh theo mức nghiêm trọng của từng loại vi phạm.

---

## Bottleneck và failure mode

**Thứ tự nghẽn khi tải tăng:**
```
1. EGRESS / HOÁ ĐƠN CDN      ← nghẽn đầu tiên, và là nghẽn về TIỀN (87 GB/s, $150K/ngày)
2. CÔNG SUẤT TRANSCODING     ← hàng đợi encode dài ra, video chờ hàng giờ mới xem được
3. STORAGE TĂNG VÔ HẠN       ← không nghẽn tức thời nhưng chi phí tích luỹ không ngừng
4. METADATA DB               ← chỉ ~900 rps peak, xa nhất mới tới
```
Nói rõ thứ tự này chứng minh bạn không tối ưu nhầm chỗ.

| Thành phần chết | Hậu quả | Xử lý |
|---|---|---|
| **API server** | Không upload mới, không mở video mới; **video đang xem vẫn chạy** (segment đi thẳng từ CDN) | Nhiều instance sau LB, multi-AZ |
| **Metadata DB** | Không mở trang video mới | Read replica; cache metadata TTL ngắn; failover tự động |
| **Transcoding worker** | Task đang chạy mất | Task idempotent + running queue phát hiện timeout → reschedule. Dữ liệu trung gian còn trong temp storage nên retry rẻ |
| **Cả transcoding farm** | Video mới không xử lý được, **video cũ vẫn xem bình thường** | Queue giữ job; hồi phục thì tiêu thụ dần — đây là lý do phải có queue thay vì gọi trực tiếp |
| **Message queue** | Pipeline đứng | Queue có replication multi-AZ; producer retry với backoff |
| **CDN edge / một PoP** | Người xem vùng đó chậm | CDN tự route sang PoP khác; multi-CDN nếu cần HA cao hơn (đổi lại: phức tạp, khó tối ưu cache hit) |
| **Transcoded storage (origin)** | CDN miss thì video hiếm không xem được | Multi-region replication cho nội dung quan trọng; chấp nhận degrade cho long tail |
| **Original storage** | Không re-encode được; video đã transcode vẫn phục vụ | Durability 11 số 9 + versioning — dữ liệu không được phép mất |

> 💡 **Nguyên tắc**: Trong hệ thống video, luôn kiểm tra rằng **sự cố ở control plane không làm dừng data plane**. Người đang xem không nên bị ảnh hưởng khi API server hay database gặp sự cố — vì segment họ đang tải đi thẳng từ CDN.

### Error handling theo từng stage

Phân biệt **lỗi khôi phục được** (retry) và **lỗi không khôi phục được** (dừng, báo lỗi, đừng đốt tài nguyên).

| Stage | Khôi phục được | Không khôi phục được | Xử lý |
|---|---|---|---|
| **Upload** | Mất mạng, part timeout, presigned URL hết hạn | Không phải video, vượt kích thước, có virus | Retry part; cấp lại URL. Lỗi cứng → mã lỗi rõ ràng, xoá bản ghi PENDING |
| **Inspection** | Timeout đọc file từ blob | File corrupt, codec không hỗ trợ, không có luồng video | **Fail nhanh ở đây rất quan trọng** — đừng để file hỏng đi vào transcoding và đốt hàng giờ CPU |
| **Transcoding** | Worker bị thu hồi (spot), OOM, lỗi tạm FFmpeg | Bitstream hỏng giữa video, DAG cấu hình sai | Retry task (tối đa 3 lần, exponential backoff) từ chunk trong temp storage; quá số lần → DLQ + đánh dấu FAILED |
| **Packaging** | Lỗi ghi storage | Thiếu rendition do stage trước fail | Retry; thiếu rendition thì publish các bản có sẵn (**degrade có kiểm soát**) |
| **Publish / CDN** | Invalidation lỗi, edge tạm không tới | — | Retry; CDN tự sync theo TTL |
| **Notification** | Push service tạm lỗi | Token thiết bị không còn hợp lệ | Retry qua queue riêng; lỗi cứng thì xoá token |

Hai chi tiết thực chiến: **retry phải có giới hạn và backoff** (một video corrupt bị retry vô hạn sẽ chiếm worker mãi mãi và nghẽn cả hàng đợi); và **partial success đáng giá hơn all-or-nothing** (5/6 rendition xong thì publish 5 bản đó, retry bản 4K ở nền — fail toàn bộ vì một rendition là lãng phí công sức đã bỏ).

---

## Liên hệ sang AWS

| Thành phần thiết kế | Dịch vụ AWS | Vì sao hợp |
|---|---|---|
| Original storage | **S3** + versioning | Durability 11 số 9; **multipart upload** và **presigned URL** là tính năng gốc — đúng hai cơ chế bài này cần |
| Cấp giấy phép ghi | **S3 presigned URL / POST policy** | Ký được điều kiện chặt: key cố định, giới hạn kích thước, content-type, hạn ngắn |
| Upload từ user ở xa | **S3 Transfer Acceleration** | Upload vào edge gần nhất rồi đi backbone AWS — nhanh và ổn định hơn internet công cộng |
| Tiered storage | **S3 Intelligent-Tiering** (transcoded) + **Glacier Deep Archive** (original) | Intelligent-Tiering tự chuyển tầng theo truy cập thật; Deep Archive rẻ ~95% cho file gốc gần như không đọc lại |
| Dọn rác | **S3 Lifecycle rules** | Upload dở dang và temp data vẫn bị tính tiền nếu không dọn |
| Transcoding — managed | **AWS Elemental MediaConvert** | Tính tiền theo phút output; tự lo DAG/chunk/ABR/packaging HLS+DASH+CMAF; có QVBR giảm bitrate ở cùng chất lượng |
| Transcoding — thế hệ cũ | **Elastic Transcoder** | Tiền thân của MediaConvert, ít tính năng hơn (không AV1) — thực tế nên chọn MediaConvert |
| Transcoding — tự quản | **FFmpeg trên EC2 Spot / ECS Fargate Spot / AWS Batch** | Rẻ hơn nhiều ở quy mô lớn, toàn quyền tuỳ biến; đổi lại phải tự xây preprocessor, chunking, DAG, retry |
| Điều phối DAG | **AWS Step Functions** (+ Map state) | Mô hình hoá DAG trực tiếp, retry/catch/timeout built-in, nhìn được trạng thái từng bước; Map chạy song song các chunk |
| Hàng đợi giữa stage | **SQS** (+ DLQ) hoặc **Kinesis/MSK** | SQS cho phân phối công việc kèm dead-letter; Kafka/Kinesis khi nhiều consumer cùng đọc một event stream |
| Resource manager | **AWS Batch** hoặc **ECS scaling theo độ dài SQS queue** | Batch có job queue + compute environment + ưu tiên — chính là "resource manager" dạng managed |
| Metadata DB | **DynamoDB** hoặc **Aurora** | DynamoDB: point-lookup theo videoId, scale ngang, TTL sẵn. Aurora: khi cần join kênh/playlist/quyền và transaction |
| Transcoded storage (origin) | **S3** + **CloudFront OAC** | OAC đảm bảo chỉ CloudFront đọc được bucket, user không truy cập trực tiếp |
| CDN | **CloudFront** | Hàng trăm PoP; hỗ trợ HLS/DASH tốt; **Origin Shield** giảm tải origin khi nhiều edge cùng miss |
| Bảo vệ nội dung | **CloudFront signed URL / signed cookie** | Signed **cookie** hợp hơn cho streaming: một phiên xem gồm hàng trăm request segment — ký một lần dùng cho cả prefix |
| Đóng gói & DRM | **AWS Elemental MediaPackage** (+ SPEKE) | Đóng gói HLS/DASH/CMAF và tích hợp Widevine/FairPlay/PlayReady qua chuẩn SPEKE |
| Live streaming | **MediaLive** → **MediaPackage** → **CloudFront** (LL-HLS) | Ngoài scope, nhưng nên nêu: live là pipeline khác hẳn — encode realtime, ràng buộc chính là latency chứ không phải chi phí |
| Moderation | **Rekognition Video** + **Transcribe** + **Comprehend** | Rekognition quét khung hình nội dung nhạy cảm; Transcribe ra text, Comprehend phân loại ngôn từ |
| Fingerprint / Content ID | **OpenSearch k-NN** hoặc **SageMaker** + vector index | ANN search trên vector fingerprint cho bản quyền và dedup perceptual |
| Giám sát & chi phí | **CloudWatch** + **Cost Explorer** + **S3 Storage Lens** | Theo dõi độ dài queue, tỉ lệ transcode fail, cache hit ratio CloudFront, và hoá đơn egress theo thời gian |

### So sánh phương án transcoding (quyết định tốn tiền nhất ở tầng compute)

| Tiêu chí | **MediaConvert** (managed) | **FFmpeg trên EC2/Fargate Spot** |
|---|---|---|
| Mô hình giá | Theo phút output (nhân theo độ phân giải & codec) | Theo giờ compute thực dùng |
| Quy mô nhỏ | Rẻ hơn (không nuôi cụm, không phí vận hành) | Đắt hơn tương đối vì overhead |
| Quy mô lớn | Đắt hơn đáng kể (thường 2–5×) | **Rẻ hơn nhiều**, nhất là Spot (~70% off) |
| Công sức xây | Rất thấp — gọi API | Cao: tự làm preprocessor, chunking, DAG, retry, autoscaling |
| Tuỳ biến | Trong khuôn khổ preset AWS | Toàn quyền: preset riêng, per-title encoding, codec mới |
| Độ tin cậy | AWS lo | Tự lo spot interruption, task treo, worker chết |
| Time-to-market | Ngày | Tháng |
| Hợp với | Giai đoạn đầu, khối lượng vừa, đội nhỏ | Quy mô lớn, chi phí encode đã đáng kể, có đội chuyên |

Câu trả lời thực chiến nhất là **hybrid**: bắt đầu bằng MediaConvert để ra mắt nhanh và đo chi phí; khi khối lượng đủ lớn thì chuyển phần "encode hàng loạt rendition phổ thông" sang cụm FFmpeg trên Spot, giữ MediaConvert cho ca đặc thù (codec lạ, DRM, định dạng hiếm).

### Kiến trúc AWS tham chiếu

```
 Client
   ├─(1) POST /upload-url ─▶ API Gateway ─▶ Lambda ─▶ DynamoDB (PENDING)
   │                                          └─▶ trả S3 presigned multipart URLs
   ├─(2) PUT parts ───────────▶ S3 (originals)  [+ Transfer Acceleration]
   ├─(3) POST /complete ─▶ Lambda ─▶ S3 CompleteMultipartUpload
   │                                   └─▶ EventBridge "ObjectCreated"
   │                                          ▼
   │                                 Step Functions (DAG)
   │                                   ├── Lambda: inspect (ffprobe)
   │                                   ├── Map: chunk → MediaConvert
   │                                   │          hoặc AWS Batch (FFmpeg Spot)
   │                                   ├── Lambda: thumbnail (Rekognition)
   │                                   ├── Rekognition: moderation
   │                                   └── MediaPackage: đóng gói HLS/DASH (CMAF)
   │                                          ▼
   │                                   S3 (transcoded) ─▶ SNS "video READY"
   │                                          ├─▶ Lambda: DynamoDB → READY
   │                                          ├─▶ Lambda: prewarm CloudFront
   │                                          └─▶ Pinpoint: notify user
   └─(4) GET video ─▶ CloudFront ─(miss)─▶ S3 transcoded  [OAC + signed cookie]
```

---

## Cách trình bày khi phỏng vấn / review

1. **Cắt scope trong 60 giây đầu.** *"YouTube có rất nhiều thứ; tôi tập trung upload và streaming, bỏ comment/recommendation/live."* Ôm hết mọi tính năng là hết giờ mà không nói sâu được gì.

2. **Tuyên bố trục chi phối ngay sau estimation**: *"Ràng buộc số một ở đây là chi phí — cụ thể là egress CDN, ~90% hoá đơn. Tôi sẽ đánh giá mọi lựa chọn theo trục đó."* Một câu này định khung cả phần còn lại.

3. **Ra con số trước khi vẽ box.** Ba con số phải thuộc: **~22 TB storage/ngày**, **~7.5 PB egress/ngày**, **~$150K/ngày CDN**. Rồi nêu điều phản trực giác: *"QPS chỉ ~900 lúc peak — nút thắt không phải số request mà là số byte."* Câu này làm người phỏng vấn ngồi thẳng lên.

4. **Vẽ hai luồng tách biệt**, đừng vẽ một sơ đồ rối: *"upload và streaming chia sẻ storage nhưng đặc tính hoàn toàn khác nhau nên tôi tách ra."*

5. **Giải thích presigned URL bằng lý do, không bằng tên.** *"Byte không đi qua API server vì tốn băng thông hai lần, giữ connection 8 phút, và làm mất tính stateless khi cần resume."* Ba lý do cụ thể mạnh hơn một cái tên công nghệ.

6. **Dành nhiều thời gian nhất cho transcoding, nhấn vào chunk-based encoding**: cắt tại **biên GOP/I-frame** → mỗi chunk giải mã độc lập → encode song song trên hàng trăm worker → 4 giờ tuần tự thành 2 phút. Kèm ba vấn đề tinh tế: bitrate lệch (2-pass), nhấp nháy ranh giới (overlap), file cũ GOP không đều (re-align).

7. **Nối transcoding với streaming.** Ranh giới chunk khi encode và ranh giới segment HLS/DASH **là cùng một thứ** — đó là lý do ABR chuyển mức mượt. Liên kết được hai phần cho thấy bạn hiểu hệ thống như một tổng thể.

8. **Đưa quy luật 80/20 vào quyết định CDN.** *"20% video tạo 80% lượt xem, nên tôi chỉ đẩy video phổ biến lên CDN; long tail phục vụ từ origin băng thông cao — đổi vài trăm ms latency cho video hiếm lấy 30–50% chi phí CDN."* Vừa có số, vừa có trade-off, vừa gắn trục chi phối.

9. **Chủ động nêu bottleneck** theo thứ tự: egress → công suất transcoding → storage tích luỹ → cuối cùng mới tới DB. Kèm câu: *"tôi sẽ không tối ưu database ở bài này vì nó không phải nút thắt."* Biết **không** tối ưu cái gì cũng quan trọng như biết tối ưu cái gì. Và nhấn tính chất control/data plane khi nói failure: *"API server chết thì không upload được, nhưng người đang xem vẫn xem tiếp vì segment đi thẳng từ CDN."*

10. **Có sẵn danh sách cost optimization** cho câu "làm sao rẻ hơn": chỉ CDN hoá video hot, archive file gốc, số rendition tỉ lệ độ phổ biến, Spot cho transcoding, CMAF dùng chung HLS+DASH, cuối cùng là peering với ISP khi đủ lớn.

11. **Nhắc bản quyền và moderation dù không được hỏi**, 30 giây cũng được — một platform video không có DMCA workflow, fingerprint và moderation thì không tồn tại được trong thực tế.

12. **Khi được hỏi về AWS, đừng liệt kê — hãy so sánh.** *"MediaConvert để ra mắt nhanh và đo chi phí; khối lượng lớn thì chuyển encode hàng loạt sang FFmpeg trên Spot giảm ~70%, giữ MediaConvert cho ca đặc thù."* Lộ trình theo giai đoạn thuyết phục hơn một lựa chọn cứng nhắc. Còn thời gian thì mở rộng đúng **một** hướng: *live streaming* (MediaLive + MediaPackage + LL-HLS, latency là ràng buộc chính thay vì chi phí) hoặc *per-title encoding* (bitrate ladder riêng theo độ phức tạp từng video, tiết kiệm 20–30% byte).

> 💡 **Nguyên tắc cuối**: Bài YouTube kiểm tra một kỹ năng mà các bài khác không kiểm tra được — **khả năng thiết kế dưới ràng buộc kinh tế**. Ở đây luôn tồn tại một phương án kỹ thuật "tốt hơn" nhưng đắt hơn nhiều lần, và việc của kiến trúc sư là tìm điểm mà chất lượng trải nghiệm và chi phí giao nhau hợp lý. Một thiết kế đẹp mà lỗ vốn là một thiết kế thất bại.
