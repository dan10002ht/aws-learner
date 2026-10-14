# Decoupling & Loosely Coupled Architectures

Trong Domain 2 (Design Resilient Architectures), tư duy cốt lõi là: **giảm sự phụ thuộc trực tiếp giữa các thành phần**. Khi component A gọi thẳng component B (synchronous, tight coupling), nếu B chậm hoặc chết thì A cũng kéo theo. Decoupling chèn một lớp trung gian (queue, topic, event bus) để các tier hoạt động độc lập, scale độc lập và chịu lỗi độc lập.

Đề thi SAA-C03 cực kỳ thích dạng câu hỏi: "Cho yêu cầu X (ordering / fan-out / event-driven / xử lý peak load), chọn dịch vụ decoupling phù hợp." Bài này giúp bạn ra quyết định nhanh và tránh các bẫy phổ biến.

## 1. Vì sao phải decouple?

- **Resilience**: producer không sập khi consumer lỗi — message nằm an toàn trong queue.
- **Scalability**: thêm/bớt consumer mà không động đến producer.
- **Queue-based load leveling**: queue hấp thụ spike traffic, consumer xử lý theo nhịp ổn định của nó → không cần over-provision.
- **Stateless design**: mỗi instance không giữ session/state cục bộ → có thể bị thay thế bất kỳ lúc nào (Auto Scaling, Spot termination) mà không mất dữ liệu.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 250" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Queue-based load leveling — SQS hấp thụ spike, consumer xử lý theo nhịp ổn định</title>
  <desc>Producer bắn traffic gập ghềnh (spike) vào hàng đợi SQS làm buffer; fleet consumer (Auto Scaling hoặc Lambda) scale theo độ sâu queue và xử lý với throughput ổn định.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">Queue-based load leveling</text>
  <defs>
    <marker id="llArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
  <rect x="16" y="60" width="150" height="120" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="91" y="82" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Producer</text>
  <text x="91" y="100" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">traffic gập ghềnh</text>
  <polyline points="30,160 44,138 58,166 72,120 86,158 100,128 114,164 128,134 142,160 152,150" fill="none" stroke="#3b82f6" stroke-opacity="0.85" stroke-width="2"/>
  <text x="91" y="174" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">spike</text>
  <line x1="166" y1="120" x2="218" y2="120" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#llArr)"/>
  <rect x="224" y="60" width="200" height="120" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="324" y="82" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">SQS — buffer</text>
  <g stroke="currentColor" stroke-opacity="0.3" fill="#f59e0b" fill-opacity="0.5">
    <rect x="246" y="104" width="22" height="40" rx="3"/>
    <rect x="272" y="104" width="22" height="40" rx="3"/>
    <rect x="298" y="104" width="22" height="40" rx="3"/>
    <rect x="324" y="104" width="22" height="40" rx="3"/>
    <rect x="350" y="104" width="22" height="40" rx="3"/>
    <rect x="376" y="104" width="22" height="40" rx="3"/>
  </g>
  <text x="324" y="166" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">hấp thụ spike, giữ message an toàn</text>
  <line x1="424" y1="120" x2="476" y2="120" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#llArr)"/>
  <text x="450" y="112" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">poll</text>
  <rect x="482" y="60" width="222" height="120" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="593" y="82" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Fleet Consumer</text>
  <g fill="#10b981" fill-opacity="0.55" stroke="currentColor" stroke-opacity="0.3">
    <rect x="500" y="98" width="46" height="30" rx="5"/>
    <rect x="556" y="98" width="46" height="30" rx="5"/>
    <rect x="612" y="98" width="46" height="30" rx="5"/>
  </g>
  <text x="593" y="148" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">ASG / Lambda — scale theo queue depth</text>
  <text x="593" y="166" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">throughput ỔN ĐỊNH</text>
</svg>

**Tính thử để thấy queue "hấp thụ" nghĩa là gì.** Giả sử backend xử lý được 200 request/giây, bình thường nhận 50 request/giây, và một đợt flash sale đẩy lên 1.000 request/giây trong 5 phút:

```
Không có queue:  1.000 đến − 200 xử lý được = 800 request/giây bị từ chối hoặc timeout
                 800 × 300 giây              = 240.000 request mất trong 5 phút

Có SQS ở giữa:   240.000 message nằm chờ trong queue, không mất cái nào
                 Hết spike, tải về 50/giây → consumer dư 200 − 50 = 150 message/giây để xả hàng tồn
                 240.000 ÷ 150               = 1.600 giây ≈ 27 phút là queue về 0
```

Cái giá của load leveling là **độ trễ**: request cuối đợt spike phải chờ gần nửa tiếng mới được xử lý. Muốn rút ngắn thì cho fleet consumer scale theo độ sâu queue (số message đang chờ), thay vì nuôi sẵn 1.000 request/giây công suất cho 5 phút cao điểm mỗi ngày.

> 💡 Mẹo thi: Hễ câu hỏi nhắc "spike traffic làm backend quá tải / mất request", đáp án gần như luôn là **đặt SQS ở giữa** (queue-based load leveling) để buffer.

### Stateless là gì và lưu state ở đâu?

Tier xử lý KHÔNG nên giữ state trên local disk/memory. Đẩy state ra ngoài:

| Loại state | Lưu ở đâu |
|---|---|
| Session người dùng | DynamoDB, ElastiCache (Redis/Memcached) |
| File upload tạm | S3 |
| Dữ liệu chia sẻ giữa instance | EFS, RDS, DynamoDB |
| Trạng thái workflow | Step Functions |

> ⚠️ Bẫy: ELB "sticky sessions" giúp giữ user trên một instance, nhưng KHÔNG phải giải pháp stateless thật sự — instance chết là mất session. Đề thường muốn câu trả lời "lưu session vào DynamoDB/ElastiCache".

## 2. Amazon SQS — hàng đợi message

SQS là một **hàng đợi message**: **producer** (bên gửi) bỏ message vào queue, **consumer** (bên xử lý) lấy ra làm rồi xoá đi. Nó là **pull-based**, nghĩa là SQS không tự đẩy message cho ai cả; consumer phải chủ động gọi API `ReceiveMessage` để hỏi "có việc không?" (động tác này gọi là *poll*). Mỗi message chỉ dành cho **một** consumer xử lý, nên SQS là dịch vụ decoupling "mặc định" cho kiểu **point-to-point** (một bên gửi, một nhóm worker cùng loại nhận).

Message chưa ai xử lý sẽ nằm trong queue theo **retention**: mặc định **4 ngày**, chỉnh được từ **60 giây tới 14 ngày**. Quá hạn thì SQS tự xoá. Đây là lý do consumer chết cả cuối tuần mà thứ Hai bật lại vẫn còn đủ việc để làm.

### Standard vs FIFO

SQS có hai loại queue, khác nhau ở chỗ chúng đánh đổi **thứ tự và chống trùng** lấy **thông lượng**.

**Standard queue — nhanh, nhưng có thể trùng và lệch thứ tự.** SQS lưu mỗi message thành nhiều bản trên nhiều server để không mất dữ liệu. Hệ quả của cách lưu phân tán này:

- **At-least-once delivery** (giao ít nhất một lần): nếu lúc bạn gọi `DeleteMessage` có một server giữ bản sao đang không liên lạc được, bản sao đó vẫn còn và message có thể được giao **lần nữa**. Hiếm, nhưng có.
- **Best-effort ordering**: SQS cố giao theo thứ tự gửi nhưng không cam kết, vì mỗi lần poll chỉ lấy mẫu từ một số server.
- Đổi lại, không có nút cổ chai nào: docs ghi thông lượng "gần như không giới hạn" số lời gọi API mỗi giây, tức bạn không phải khai báo hay xin trước công suất.

Vì có thể nhận trùng, consumer của Standard queue phải **idempotent**: xử lý cùng một message hai lần cho kết quả giống xử lý một lần. Ví dụ "đặt trạng thái đơn #123 = PAID" là idempotent; "trừ 100.000đ trong ví" thì không, chạy hai lần là trừ hai lần.

**FIFO queue — đúng thứ tự, không trùng, nhưng có trần thông lượng.** FIFO (first-in-first-out) thêm hai cơ chế:

- **`MessageGroupId` — giữ thứ tự theo nhóm.** Mỗi message gửi vào FIFO queue phải kèm một group ID (ví dụ `order-123` hoặc `user-42`). Trong **cùng một group**, SQS giao đúng thứ tự gửi và **không giao message kế tiếp cho tới khi message trước được xoá** (hoặc hết visibility timeout). Các group khác nhau thì chạy song song. Nên chọn group ID càng mịn càng tốt: dùng chung một group cho cả queue thì toàn bộ queue chỉ xử lý được từng message một.
- **Khử trùng (deduplication) trong 5 phút.** Mỗi message có một `MessageDeduplicationId`. Nếu trong vòng **5 phút** có message thứ hai mang cùng ID, SQS nhận lời gọi nhưng **không đưa thêm bản nào vào queue**. Bạn tự cấp ID này, hoặc bật **content-based deduplication** để SQS tự lấy mã băm SHA-256 của nội dung message làm ID (hai message nội dung y hệt trong 5 phút coi như một). Tình huống điển hình: producer gửi xong bị timeout mạng, không biết đã vào chưa nên gửi lại. Với FIFO, lần gửi lại bị loại.

"Exactly-once" của FIFO vì thế nên hiểu là: **không có bản trùng nào được đưa vào queue**, và mỗi message chỉ giao cho một consumer tại một thời điểm. Nếu consumer xử lý quá visibility timeout mà chưa xoá thì message vẫn hiện lại như thường (xem mục Visibility Timeout bên dưới).

**Vì sao FIFO chậm hơn?** Giữ thứ tự và tra bảng khử trùng buộc SQS xử lý tuần tự thay vì rải tự do ra nhiều server, nên có hạn mức cứng: **300 lời gọi API mỗi giây** cho mỗi loại thao tác (gửi, nhận, xoá). Mỗi lời gọi batch chở tối đa 10 message, nên trần thực tế là:

```
Không batch:  300 lời gọi/giây × 1 message   =   300 message/giây
Có batch:     300 lời gọi/giây × 10 message  = 3.000 message/giây
```

Cần hơn nữa thì bật **high throughput mode**: SQS chia queue thành nhiều partition theo `MessageGroupId`, trần lên tới **70.000 lời gọi/giây** ở us-east-1, us-west-2, eu-west-1 (các Region khác thấp hơn, từ 2.400 tới 19.000). Điều kiện đi kèm là phải có nhiều group ID khác nhau, vì thứ tự chỉ còn được giữ trong từng group.

Ví dụ chọn loại queue: hệ thống ghi nhận 5.000 giao dịch/giây, yêu cầu đúng thứ tự theo từng tài khoản. FIFO thường (3.000 message/giây khi batch) không đủ; dùng FIFO high throughput với `MessageGroupId = account_id`. Còn nếu là 5.000 job resize ảnh/giây, không cần thứ tự, thì Standard là đủ và không phải nghĩ tới hạn mức.

| Tiêu chí | Standard | FIFO |
|---|---|---|
| Throughput | Gần như không giới hạn, không cần khai báo trước | 300 lời gọi API/giây (3.000 message/giây khi batch 10); high throughput mode tới 70.000 lời gọi/giây ở Region lớn |
| Ordering | Best-effort, **không đảm bảo** | Đảm bảo thứ tự **trong từng `MessageGroupId`** |
| Delivery | **At-least-once** (có thể trùng) | **Exactly-once** (khử trùng trong cửa sổ 5 phút) |
| Tên queue | bất kỳ | phải kết thúc `.fifo` |
| Dedup | không, consumer phải idempotent | `MessageDeduplicationId` tự cấp, hoặc content-based (SHA-256 của body) |

> 💡 Mẹo thi: "Order of transactions matters" / "no duplicates" → **SQS FIFO**. "Maximum throughput, order không quan trọng" → **SQS Standard**.

> ⚠️ Bẫy: Standard queue có thể giao **duplicate** và **out-of-order**. Nếu app không idempotent thì xử lý trùng sẽ sai. Đề hay gài "Standard nhưng yêu cầu no duplicates" — sai, phải FIFO.

### Visibility Timeout

Khi consumer nhận message, message bị "ẩn" trong khoảng **visibility timeout** (mặc định 30s, max 12h) để consumer khác không nhận trùng. Consumer xử lý xong phải gọi `DeleteMessage`. Nếu không xóa kịp (timeout hết), message **xuất hiện lại** và bị xử lý lần nữa.

- Timeout **quá ngắn** → message xử lý chưa xong đã hiện lại → xử lý trùng (double processing).
- Timeout **quá dài** → message lỗi (consumer crash) mất nhiều thời gian mới được retry.
- Consumer cần thêm thời gian → gọi `ChangeMessageVisibility` để gia hạn.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 330" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Vòng đời message SQS theo Visibility Timeout</title>
  <desc>Message ở trạng thái Available; khi consumer ReceiveMessage nó chuyển sang In-flight (ẩn trong visibility timeout); xử lý xong gọi DeleteMessage để xoá hẳn, còn nếu timeout hết thì quay lại Available; vượt maxReceiveCount thì chuyển sang Dead-Letter Queue.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">Vòng đời message — Visibility Timeout</text>
  <defs>
    <marker id="vtArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <rect x="40" y="60" width="170" height="64" rx="10" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="125" y="90" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Available</text>
  <text x="125" y="108" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">sẵn sàng để nhận</text>
  <rect x="40" y="210" width="170" height="64" rx="10" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="125" y="238" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">In-flight (ẩn)</text>
  <text x="125" y="256" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">trong visibility timeout</text>
  <rect x="510" y="60" width="170" height="64" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="595" y="90" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Đã xoá</text>
  <text x="595" y="108" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">DeleteMessage → xong</text>
  <rect x="510" y="210" width="170" height="64" rx="10" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="595" y="238" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Dead-Letter Queue</text>
  <text x="595" y="256" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">vượt maxReceiveCount</text>
  <line x1="125" y1="124" x2="125" y2="208" stroke="currentColor" stroke-opacity="0.55" stroke-width="1.5" marker-end="url(#vtArr)"/>
  <text x="134" y="170" font-size="10.5" fill="currentColor" opacity="0.85">ReceiveMessage</text>
  <path d="M210 226 C 360 200, 360 90, 508 90" fill="none" stroke="currentColor" stroke-opacity="0.55" stroke-width="1.5" marker-end="url(#vtArr)"/>
  <text x="360" y="142" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">xử lý xong → DeleteMessage</text>
  <path d="M148 208 C 240 150, 240 130, 200 100" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#vtArr)"/>
  <text x="270" y="186" font-size="10" fill="currentColor" opacity="0.75">timeout hết / không xoá kịp → trở lại</text>
  <line x1="210" y1="242" x2="508" y2="242" stroke="currentColor" stroke-opacity="0.55" stroke-width="1.5" marker-end="url(#vtArr)"/>
  <text x="360" y="234" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">lỗi lặp lại quá N lần</text>
</svg>

> ⚠️ Bẫy kinh điển: "Message bị xử lý nhiều lần / xử lý trùng" trong khi consumer xử lý lâu → nguyên nhân là **visibility timeout quá ngắn**, tăng nó lên.

### Long Polling vs Short Polling

Vì SQS là pull-based, consumer phải hỏi liên tục, và SQS tính tiền theo **số lời gọi API** kể cả khi câu trả lời là "không có gì". Hai cách hỏi:

- **Short polling** (mặc định, `WaitTimeSeconds = 0`): SQS trả lời ngay lập tức, queue rỗng thì trả về rỗng. Consumer lại phải hỏi tiếp.
- **Long polling** (`WaitTimeSeconds` từ 1 tới **20 giây**): nếu queue đang rỗng, SQS **giữ kết nối** và chỉ trả lời khi có message tới hoặc hết thời gian chờ. Message vừa tới là consumer nhận được ngay, không phải đợi tới lượt hỏi kế tiếp.

```
Queue rỗng suốt 1 ngày, 1 consumer:
Short polling, hỏi mỗi 100 ms:  10 lời gọi/giây × 86.400 giây = 864.000 lời gọi rỗng
Long polling 20 giây:            3 lời gọi/phút × 1.440 phút  =   4.320 lời gọi rỗng   (ít hơn 200 lần)
```

| | Short polling | Long polling |
|---|---|---|
| Hành vi | Trả lời ngay, có thể rỗng | Chờ tới khi có message (tối đa `WaitTimeSeconds`, max 20s) |
| Chi phí | Nhiều empty response → tốn API call/tiền | Giảm empty response, **rẻ hơn** |
| Khuyến nghị | Hiếm khi | Mặc định nên dùng |

> 💡 Mẹo thi: "Giảm số empty response / giảm chi phí SQS / giảm latency phát hiện message" → **Long Polling** (set `ReceiveMessageWaitTimeSeconds = 20`).

### Dead-Letter Queue (DLQ)

DLQ là queue riêng nhận các message **xử lý thất bại nhiều lần**. Cấu hình `maxReceiveCount`: sau N lần message bị nhận mà không delete (xử lý lỗi), nó được chuyển sang DLQ để điều tra, tránh "poison pill" làm tắc queue.

> 💡 Mẹo thi: "Message lỗi cứ retry vô hạn làm nghẽn queue" / "cần giữ lại message thất bại để debug" → cấu hình **DLQ** với `maxReceiveCount`.

### SQS — các tính năng khác hay hỏi

**Delay queue.** Message gửi vào sẽ bị **ẩn một khoảng thời gian rồi mới cho consumer thấy**, từ 0 (mặc định) tới tối đa **15 phút**. Dùng khi muốn hoãn xử lý, ví dụ "gửi email nhắc sau 10 phút nếu khách chưa thanh toán". Khác visibility timeout ở thời điểm: delay ẩn message **ngay khi vừa gửi vào**, còn visibility timeout ẩn message **sau khi một consumer đã nhận**.

**Message size.** SQS chở dữ liệu dạng text (JSON, XML), không phải để chuyển file. Đề thi và hầu hết tài liệu dùng trần **256 KB/message**; docs hiện tại đã nâng lên **1 MiB**. Lớn hơn thế (ảnh, video, file báo cáo) thì dùng **SQS Extended Client Library**: thư viện tự upload nội dung lên **S3** và chỉ bỏ vào queue một con trỏ (bucket + key); phía consumer thư viện tự tải về. Cách này chở được payload tới 2 GB.

**Lambda trigger (event source mapping).** Lambda không tự biết trong queue có gì. **Event source mapping** là một bộ phận của dịch vụ Lambda **poll queue thay bạn**: nó gọi `ReceiveMessage`, gom message thành lô (batch), gọi hàm của bạn với lô đó, và nếu hàm chạy xong không lỗi thì tự xoá message khỏi queue. Bạn không viết vòng lặp poll, không nuôi EC2 để chạy consumer. Nếu hàm báo lỗi, message không bị xoá, hết visibility timeout sẽ hiện lại và được thử lại; quá `maxReceiveCount` thì sang DLQ. Vì vậy visibility timeout của queue phải dài hơn timeout của hàm (AWS khuyên ít nhất **gấp 6 lần**: hàm timeout 30 giây thì đặt 180 giây), nếu không message hiện lại khi hàm vẫn đang chạy và bị xử lý trùng.

## 3. Amazon SNS — Pub/Sub

SNS (Simple Notification Service) làm việc ngược với SQS. Ở SQS, một message chỉ tới **một** consumer và consumer phải tự đi lấy. Ở SNS, bên gửi (**publisher**) đăng message lên một **topic** (kênh có tên), và SNS **tự đẩy một bản sao tới mọi bên đã đăng ký** (**subscriber**) của topic đó. Mô hình này gọi là **pub/sub**, và vì SNS chủ động đẩy nên nó là **push-based**: subscriber không poll gì cả.

Các loại subscriber: **SQS**, **Lambda**, **HTTP/S endpoint**, **Email**, **SMS**, mobile push, và **Kinesis Data Firehose** (để lưu mọi message xuống S3). Một topic Standard nhận được tới 12,5 triệu subscription.

**SNS không phải nơi lưu message.** Publish xong là SNS giao ngay, và topic Standard không giữ lại bản nào để đọc sau. Nếu subscriber đang lỗi, SNS thử giao lại theo một lịch cố định rồi **bỏ message**:

| Loại subscriber | SNS thử lại tới đâu |
|---|---|
| Do AWS quản lý: **SQS, Lambda** | 100.015 lần, trải trong **23 ngày** |
| Do bạn quản lý: **HTTP/S, Email, SMS, mobile push** | 50 lần, trải trong **6 giờ** |

Đọc bảng này cho đúng: retry chỉ cứu được trường hợp **đích tạm thời không nhận được**. Web server của bạn (HTTP endpoint) sập quá 6 giờ là mất message. Với Lambda, SNS giao thành công ngay khi Lambda *nhận* event; nếu sau đó hàm chạy lỗi thì đó là chuyện retry của Lambda (3 lần, xem §6), không còn là của SNS. Muốn giữ lại message giao hỏng thì gắn **DLQ (một SQS queue) vào subscription**.

**SNS FIFO** là loại topic giữ thứ tự và khử trùng giống SQS FIFO, dùng khi cần fan-out mà vẫn đúng thứ tự. Nó chỉ giao tới **SQS queue**, không giao tới Lambda, HTTP, email hay SMS.

### Fan-out: SNS + SQS

Pattern kinh điển: publish **một** message lên SNS topic, topic fan-out tới **nhiều** SQS queue, mỗi queue cho một microservice xử lý độc lập.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 290" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Fan-out SNS + SQS — một message tới nhiều queue, mỗi service xử lý độc lập</title>
  <desc>Producer publish một message lên SNS topic; topic fan-out tới ba SQS queue (mỗi queue có buffer, retry và DLQ riêng); mỗi SQS queue đẩy cho một service xử lý độc lập.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">Fan-out: SNS → nhiều SQS → nhiều Service</text>
  <defs>
    <marker id="foArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
  <rect x="16" y="118" width="116" height="54" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="74" y="142" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Producer</text>
  <text x="74" y="159" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">publish 1 lần</text>
  <line x1="132" y1="145" x2="178" y2="145" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#foArr)"/>
  <rect x="182" y="112" width="116" height="66" rx="10" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="240" y="140" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">SNS topic</text>
  <text x="240" y="158" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">fan-out</text>
  <path d="M298 130 C 340 92, 360 70, 408 64" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#foArr)"/>
  <path d="M298 145 H 408" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#foArr)"/>
  <path d="M298 160 C 340 198, 360 220, 408 226" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#foArr)"/>
  <g>
    <rect x="412" y="40" width="150" height="48" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="487" y="60" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">SQS queue A</text>
    <text x="487" y="77" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">buffer · retry · DLQ</text>
  </g>
  <g>
    <rect x="412" y="121" width="150" height="48" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="487" y="141" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">SQS queue B</text>
    <text x="487" y="158" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">buffer · retry · DLQ</text>
  </g>
  <g>
    <rect x="412" y="202" width="150" height="48" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="487" y="222" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">SQS queue C</text>
    <text x="487" y="239" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">buffer · retry · DLQ</text>
  </g>
  <line x1="562" y1="64" x2="606" y2="64" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#foArr)"/>
  <line x1="562" y1="145" x2="606" y2="145" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#foArr)"/>
  <line x1="562" y1="226" x2="606" y2="226" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#foArr)"/>
  <g fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22">
    <rect x="610" y="44" width="98" height="40" rx="9"/>
    <rect x="610" y="125" width="98" height="40" rx="9"/>
    <rect x="610" y="206" width="98" height="40" rx="9"/>
  </g>
  <text x="659" y="69" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Service A</text>
  <text x="659" y="150" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Service B</text>
  <text x="659" y="231" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Service C</text>
</svg>

Ưu điểm so với cho producer publish thẳng vào nhiều queue:
- Producer chỉ publish 1 lần.
- Thêm subscriber mới không cần sửa producer (loose coupling thật sự).
- Mỗi SQS queue cho khả năng **buffer + retry + DLQ** riêng — không mất message nếu một service down.

> 💡 Mẹo thi: "Một sự kiện cần được nhiều hệ thống xử lý song song, mỗi hệ thống độc lập và không được mất message" → **SNS fan-out tới nhiều SQS queue**. (SNS một mình không có buffer bền vững → ghép SQS để đảm bảo durability.)

> ⚠️ Bẫy: Câu hỏi muốn fan-out + đảm bảo không mất message → đừng chọn "SNS to multiple Lambda". Lambda có thể throttle/lỗi; **SNS → SQS → Lambda** mới có buffer an toàn.

### Amazon MQ — messaging chuẩn công nghiệp (khi nào KHÔNG dùng SQS/SNS)

**Amazon MQ** là managed message broker cho **ActiveMQ** và **RabbitMQ**, hỗ trợ các giao thức messaging chuẩn công nghiệp: **AMQP, MQTT, STOMP, JMS, OpenWire, WebSocket**. Nó tồn tại để phục vụ ứng dụng **on-premises đang chạy sẵn** trên các broker này muốn di dời lên AWS mà **không phải viết lại code**.

| Dấu hiệu trong đề | Chọn |
|---|---|
| App **đã dùng messaging chuẩn** (AMQP/MQTT/STOMP/JMS/OpenWire) | **Amazon MQ** |
| **Lift-and-shift / migrate** từ ActiveMQ hoặc RabbitMQ on-prem | **Amazon MQ** |
| "Không muốn viết lại app / giữ nguyên protocol hiện có" | **Amazon MQ** |
| App **cloud-native mới**, chấp nhận API riêng của AWS | **SQS / SNS** |
| Cần scale gần như vô hạn, ít vận hành nhất, fan-out đơn giản | **SQS / SNS** |

> 💡 Mẹo thi: Cứ thấy các từ khóa **AMQP / MQTT / STOMP / JMS**, **ActiveMQ**, **RabbitMQ**, "migrate messaging without changing code" → đáp án là **Amazon MQ**. Ngược lại, hệ thống dựng mới trên AWS thì **SQS/SNS** là lựa chọn mặc định (rẻ hơn, serverless, scale tự động, không phải quản lý broker).

> ⚠️ Bẫy: Amazon MQ chạy trên **broker instance** (có thể multi-AZ active/standby) — bạn vẫn phải chọn size/patch ở mức nhất định và throughput **không "vô hạn"** như SQS. Đừng chọn Amazon MQ chỉ vì "cần một hàng đợi"; nó dành cho tương thích **protocol chuẩn**, không phải để thay SQS trong app mới.

## 4. Amazon EventBridge — Event Bus

Một **event** là một bản ghi JSON nói rằng "có chuyện vừa xảy ra": một object vừa được upload lên S3, một EC2 instance vừa đổi trạng thái, một đơn hàng vừa được tạo. **Kiến trúc event-driven** là kiểu hệ thống mà các thành phần không gọi nhau trực tiếp, chỉ phát event và phản ứng với event của nhau.

EventBridge (tên cũ: CloudWatch Events) là một **event bus** serverless: một đường ống chung nhận event từ nhiều nguồn, so từng event với các **rule** bạn viết, rồi chuyển event khớp tới **target** tương ứng. Khác SNS ở hai điểm gốc. Thứ nhất, publisher của SNS phải biết và chọn topic để gửi; còn với EventBridge, nguồn cứ phát event lên bus, việc ai nhận do **rule soi nội dung event** quyết định. Thứ hai, rất nhiều nguồn đã **phát event sẵn** mà bạn không phải viết gì: hơn 90 AWS service và hơn 45 đối tác SaaS.

Các thành phần:

- **Event bus** có ba loại. **Default bus** có sẵn trong mỗi account, nhận event do AWS service tự phát. **Custom bus** do bạn tạo để ứng dụng của mình tự gửi event vào (API `PutEvents`). **Partner bus** nhận event từ SaaS như Zendesk, Datadog, Shopify.
- **Rule** gồm một **event pattern** (mẫu để so khớp) và tối đa **5 target**. Target có thể là Lambda, SQS, SNS, Step Functions, Kinesis, ECS task, hoặc một bus ở account khác.
- **Schema registry** lưu "khuôn dạng" của event: event loại này có những field nào, kiểu gì. EventBridge tự suy ra schema từ các event chạy qua bus, và từ schema đó sinh sẵn class Java/Python/TypeScript để code của bạn đọc event có gợi ý field thay vì dò JSON bằng tay. Tiện cho dev, hiếm khi là đáp án đề thi.
- **Scheduler / scheduled rule** phát event theo lịch (cron hoặc "mỗi 5 phút"), thay cho việc nuôi một EC2 chỉ để chạy crontab.

Ví dụ một event pattern:

```json
{
  "source": ["aws.s3"],
  "detail-type": ["Object Created"],
  "detail": { "bucket": { "name": ["my-bucket"] } }
}
```

Pattern này khớp event thoả **cả ba** điều kiện: nguồn phát là S3, loại event là "Object Created", và trong phần `detail` tên bucket là `my-bucket`. Upload file vào bucket khác, hoặc *xoá* object trong `my-bucket`, đều không khớp và rule không chạy. Mỗi giá trị là một mảng nên có thể liệt kê nhiều lựa chọn (`["my-bucket", "other-bucket"]` nghĩa là "một trong hai"). Ngoài so khớp chính xác còn có prefix, suffix, khoảng số, `anything-but`. Đây là ý nghĩa của **content-based filtering**: lọc theo bất kỳ field nào nằm sâu trong thân event.

EventBridge cũng giao lại khi target lỗi: mặc định thử trong **24 giờ, tối đa 185 lần**, sau đó bỏ event trừ khi rule có gắn DLQ. Nó còn có **archive & replay**: lưu event đã qua bus và phát lại vào bus khi cần (ví dụ để chạy lại sau khi sửa bug ở consumer).

### SNS vs EventBridge — phân biệt cho đề thi

Cả hai đều "một nguồn, nhiều đích", nên đề thi phân biệt bằng các chi tiết sau. Điểm cần nhớ về tốc độ: SNS được thiết kế để giao thật nhanh tới thật nhiều đích, còn EventBridge mất thêm thời gian so khớp rule, đổi lại lọc được kỹ hơn.

| | SNS | EventBridge |
|---|---|---|
| Mô hình | Pub/sub: publisher chọn topic | Event bus: rule soi nội dung để định tuyến |
| Filtering | Có, bằng filter policy trên message attributes hoặc body | **Content-based trên toàn bộ JSON**, nhiều toán tử hơn, kèm biến đổi input trước khi giao |
| Độ trễ điển hình | Dưới 30 ms | Khoảng 0,5 giây |
| Thông lượng mặc định (us-east-1) | 30.000 message/giây mỗi account | 10.000 lời gọi `PutEvents`/giây (cả hai đều xin tăng được) |
| Tích hợp AWS services | Một số service publish được vào topic | **90+ AWS service phát event sẵn** vào default bus |
| SaaS / third-party | Không | **Có (partner event source)** |
| Số đích | Tới 12,5 triệu subscription/topic | Tối đa **5 target/rule** (mỗi bus 300 rule) |
| Replay/Archive | Không (topic Standard) | **Có archive & replay event** |

> 💡 Mẹo thi:
> - "React tới event từ AWS service (S3 upload, EC2 state change), hoặc từ SaaS, có filtering phức tạp, hoặc cần schedule (cron)" → **EventBridge**.
> - "Fan-out đơn giản, throughput cao, độ trễ thấp tới SQS/Lambda/email/SMS" → **SNS**.

## 5. Amazon Kinesis — Streaming dữ liệu

**Streaming** là dữ liệu đến liên tục, từng mẩu nhỏ, không có điểm kết thúc: mỗi cú click, mỗi dòng log, mỗi lần cảm biến đo là một **record** (thường vài trăm byte tới vài KB). Kinesis là họ dịch vụ nhận loại dữ liệu này. Trong bài decoupling chỉ cần nắm nó khác queue ở đâu; chi tiết về shard, Firehose và Flink nằm ở bài ch2-06 (Data ingestion & analytics).

**Kinesis Data Streams là một cuốn log chỉ ghi nối đuôi, không phải queue.** Ở SQS, consumer xử lý xong thì **xoá** message, không ai đọc lại được nữa. Ở Kinesis, record ghi vào sẽ **nằm yên theo đúng thứ tự cho tới khi hết hạn lưu**; consumer đọc không làm mất gì, nó chỉ tự nhớ mình đã đọc tới đâu. Từ một khác biệt đó suy ra ba tính chất đề thi hay hỏi:

- **Nhiều consumer độc lập.** Team fraud, team analytics, team archive cùng đọc một stream, mỗi bên giữ vị trí đọc riêng, không ai lấy mất dữ liệu của ai. Với SQS muốn vậy phải fan-out ra ba queue.
- **Replay.** Consumer có bug thì sửa xong lùi vị trí đọc về hôm qua rồi đọc lại. Chỉ làm được trong **retention**: mặc định **24 giờ**, tăng được tới **365 ngày**.
- **Thứ tự theo partition key.** Mỗi record gửi kèm một **partition key** (ví dụ `device_id`). Stream được chia thành nhiều **shard**, mỗi shard là một làn log riêng; Kinesis băm partition key để chọn shard, nên record cùng key luôn vào cùng shard và giữ đúng thứ tự trong shard đó. Thứ tự được đảm bảo **theo từng key**, không phải trên toàn stream.

**"Volume lớn" là bao nhiêu?** Shard cũng là đơn vị đo công suất. Mỗi shard nhận ghi **1 MB/giây hoặc 1.000 record/giây** (chạm cái nào trước thì bị chặn) và cho đọc **2 MB/giây**. Cần nhiều hơn thì thêm shard, không có trần số shard:

```
Tải: 2.000 thiết bị IoT, mỗi thiết bị gửi 1 record 1 KB mỗi giây
     = 2.000 record/giây = 2 MB/giây

Theo dung lượng:  2 MB/giây ÷ 1 MB/giây              = 2 shard
Theo số record:   2.000 record/giây ÷ 1.000 record/giây = 2 shard
→ cần 2 shard. Tải gấp 100 lần (200 MB/giây) thì 200 shard.
```

Vậy tín hiệu "thousands of records per second", "clickstream", "IoT telemetry" trong đề nghĩa là cỡ hàng nghìn record/giây trở lên, liên tục, và thường có nhiều bên cùng cần đọc. Không muốn tự tính shard thì chọn chế độ **on-demand**, AWS tự thêm bớt shard theo tải.

**Kinesis Data Firehose** (tên mới: Amazon Data Firehose) là dịch vụ khác hẳn: một băng chuyền một chiều nhận record, gom thành lô rồi tự ghi vào S3, Redshift hoặc OpenSearch. Nó không lưu dữ liệu để đọc lại và không có consumer nào do bạn viết. Vì phải gom lô nên nó là **near-real-time**, không phải real-time.

### Kinesis Data Streams vs Data Firehose — phân biệt tình huống

Hai dịch vụ khác nhau về bản chất: **Data Streams** là một stream bạn tự đọc/xử lý (real-time thật), còn **Firehose** là một **đường ống nạp (delivery pipeline)** managed, no-code, đổ dữ liệu vào đích lưu trữ.

| Tiêu chí | Kinesis Data Streams | Kinesis Data Firehose |
|---|---|---|
| Mục đích | **Custom real-time**: tự viết consumer xử lý từng record | **Nạp (ingest) near-real-time** vào đích, **no-code** |
| Đích đến | Bất kỳ (Lambda, KCL app, Flink, Firehose...) | **S3, Redshift, OpenSearch, Splunk**, HTTP endpoint |
| Độ trễ | Real-time (~200 ms) | Near-real-time do gom lô theo size/time. Đề thi dùng mốc **~60 giây trở lên**; hiện nay chỉnh được thời gian đệm từ 0 tới 900 giây (mặc định 300 giây với đích S3) |
| Replay | **Có** (retention 24 giờ → 365 ngày) | **Không** (không lưu trữ, không đọc lại) |
| Multi-consumer | **Có** (nhiều app đọc độc lập, fan-out) | Không (chỉ chảy tới đích đã cấu hình) |
| Vận hành | Quản lý shard/on-demand, quản lý consumer | **Fully managed, tự scale**, không có shard |
| Transform | Trong consumer của bạn | Lambda transform + convert sang Parquet/ORC |

> 💡 Mẹo thi:
> - "Chỉ cần **đưa streaming data vào S3/Redshift/OpenSearch** mà không viết consumer, ít vận hành" → **Firehose**.
> - "Cần **xử lý real-time tùy biến**, **replay**, hoặc **nhiều consumer** đọc cùng dữ liệu" → **Data Streams**.
> - Pattern thường gặp: **Data Streams → Firehose → S3** (stream real-time cho nhiều consumer, đồng thời một nhánh Firehose archive xuống S3).

### Amazon MSK vs Kinesis — chọn nền tảng streaming

**Amazon MSK (Managed Streaming for Apache Kafka)** là Kafka được AWS quản lý. Nó tồn tại khi bạn cần **Kafka API và hệ sinh thái Kafka** (Kafka Connect, Kafka Streams, schema registry, các connector có sẵn) hoặc **migrate cluster Kafka on-prem** mà không đổi code.

| Dấu hiệu trong đề | Chọn |
|---|---|
| **Đã có / cần Kafka API**, hệ sinh thái Kafka (Connect, Streams), migrate từ Kafka | **Amazon MSK** |
| Team đã quen Kafka, cần tương thích protocol Kafka | **Amazon MSK** |
| Muốn **streaming managed thuần AWS, ít vận hành nhất**, tích hợp sẵn AWS | **Kinesis** |
| Serverless, không muốn quản lý broker/cluster/partition | **Kinesis** (Data Streams / Firehose) |

> 💡 Mẹo thi: Từ khóa **"Kafka" / "Kafka API" / "existing Kafka application"** → **Amazon MSK**. Nếu đề chỉ mô tả nhu cầu streaming chung chung, "managed", "ít ops nhất", "serverless" mà **không nhắc Kafka** → **Kinesis**. (MSK Serverless tồn tại nhưng vẫn là Kafka; điểm mấu chốt phân biệt vẫn là "có ràng buộc Kafka hay không".)

### SQS vs SNS vs EventBridge vs Kinesis

Bốn dịch vụ khác nhau ở hai câu hỏi gốc: message **giao cho một bên hay nhiều bên**, và **giao xong thì còn hay mất**. SQS giao cho một bên rồi xoá. SNS và EventBridge đẩy cho nhiều bên rồi không giữ. Kinesis giữ lại cho nhiều bên tự đọc.

| Yêu cầu | Chọn |
|---|---|
| Point-to-point queue, buffer load, retry, DLQ | **SQS** |
| Đảm bảo ordering + no duplicate, mỗi message chỉ một nhóm worker cùng loại xử lý | **SQS FIFO** |
| Fan-out 1→nhiều, pub/sub, giao nhanh (dưới 30 ms) tới rất nhiều subscriber | **SNS** |
| Event-driven từ AWS services/SaaS, filtering phức tạp, schedule | **EventBridge** |
| Streaming real-time từ hàng nghìn record/giây, nhiều consumer đọc lại, replay, big data, ordering theo partition key (trong từng shard) | **Kinesis** |

> 💡 Mẹo thi: Tín hiệu nhận diện Kinesis: "real-time analytics", "clickstream", "IoT telemetry", "thousands of records/sec", "multiple consumers replaying data", "ordered per device". Nếu chỉ là "decouple 2 service / buffer task" thì **đừng** chọn Kinesis (overkill) → SQS.

> ⚠️ Bẫy: SQS message bị **xóa sau khi consume** và không replay được. Nếu đề yêu cầu "nhiều ứng dụng đọc cùng stream và có thể replay" → **Kinesis**, không phải SQS.

## 6. API Gateway + Lambda — decoupling tầng API

Pattern serverless điển hình: **API Gateway** (cửa ngõ HTTP) → **Lambda** (xử lý) → backend (DynamoDB...). Client tách hoàn toàn khỏi compute.

API Gateway cung cấp:
- **Throttling / rate limiting** & usage plans (bảo vệ backend khỏi quá tải).
- **Caching** để giảm tải và latency.
- **Authorization**: IAM, Cognito, Lambda authorizer.
- Tích hợp trực tiếp (service integration) tới SQS, Step Functions... mà không cần Lambda.

### Async decoupling với Lambda

Lambda có ba kiểu được gọi, và mỗi kiểu xử lý lỗi khác nhau. Biết kiểu nào đang dùng thì mới biết message có bị mất khi hàm lỗi hay không.

| Kiểu gọi | Ai gọi | Hàm lỗi thì sao |
|---|---|---|
| **Synchronous** (đồng bộ) | API Gateway, ALB, SDK gọi trực tiếp | Bên gọi **đứng chờ** kết quả và nhận luôn lỗi. Lambda **không tự retry**; thử lại hay không là việc của bên gọi |
| **Asynchronous** (bất đồng bộ) | SNS, S3 event, EventBridge | Lambda nhận event, xếp vào hàng đợi nội bộ của nó và trả lời "đã nhận" ngay. Hàm lỗi thì Lambda **tự chạy lại 2 lần nữa** (tổng 3 lần): chờ 1 phút trước lần hai, 2 phút trước lần ba |
| **Event source mapping** | Lambda tự poll SQS, Kinesis, DynamoDB Streams | Message không bị xoá khỏi nguồn, nên được thử lại theo cơ chế của nguồn (với SQS: visibility timeout rồi DLQ) |

Với kiểu async, sau 3 lần vẫn lỗi thì Lambda **bỏ event**. Muốn giữ lại, cấu hình **on-failure destination** (SQS, SNS, EventBridge hoặc một Lambda khác nhận bản ghi về lần gọi hỏng) hoặc DLQ cho hàm. Event cũng bị bỏ nếu nằm chờ trong hàng đợi nội bộ quá **6 giờ** (mặc định), chẳng hạn khi hàm bị throttle kéo dài.

Để chống quá tải downstream, dùng **API Gateway → SQS → Lambda** thay vì API Gateway gọi thẳng Lambda. Khi gọi thẳng, 1.000 request tới cùng lúc sẽ thành 1.000 bản Lambda chạy song song cùng mở kết nối vào database. Có queue ở giữa, API Gateway chỉ ghi message vào SQS rồi trả lời client ngay, còn Lambda rút message ra theo nhịp bạn giới hạn được (batch size, maximum concurrency của event source mapping).

> ⚠️ Bẫy: API Gateway có timeout tích hợp **29 giây**: backend không trả lời kịp thì client nhận lỗi 504 dù Lambda vẫn đang chạy. (Hiện nay xin nâng được mức này cho REST API loại Regional và private, đánh đổi bằng việc giảm throttle quota của account; đề thi vẫn coi 29 giây là giới hạn.) Tác vụ chạy lâu → trả về 202 ngay, đẩy job vào **SQS/Step Functions** xử lý bất đồng bộ, đừng giữ kết nối đồng bộ.

### Step Functions — orchestration nhiều bước

Khi một quy trình gồm **nhiều bước tuần tự/rẽ nhánh** (gọi Lambda A → chờ → Lambda B → nếu lỗi thì retry/bù trừ), đừng để các **Lambda tự gọi nhau** (chuỗi khó theo dõi, khó retry, khó xử lý lỗi). **AWS Step Functions** là dịch vụ **orchestration** quản lý state machine: định nghĩa các bước bằng JSON (Amazon States Language), tự lo **retry, catch lỗi, rẽ nhánh (Choice), chạy song song (Parallel/Map), chờ (Wait)** và **theo dõi trạng thái** trực quan.

| | Standard workflow | Express workflow |
|---|---|---|
| Thời lượng tối đa | **Tới 1 năm** | **≤ 5 phút** |
| Mô hình thực thi | Exactly-once, lưu lịch sử từng bước 90 ngày để audit | Async: at-least-once (có thể chạy lặp, bước phải idempotent). Sync: at-most-once |
| Tần suất | Ít execution, chạy dài. Quota mặc định ở us-east-1: khởi động ~300 execution/giây | Nhiều execution ngắn. Quota mặc định: khởi động 6.000 execution/giây, không giới hạn số state transition |
| Giá | Theo **state transition** | Theo **số execution + thời gian/bộ nhớ** |
| Hợp với | Quy trình nghiệp vụ dài (order fulfillment, ETL, human approval) | Sự kiện high-volume, xử lý ngắn (IoT ingestion, streaming backend) |

> 💡 Mẹo thi:
> - "Điều phối **nhiều Lambda/step** với retry và xử lý lỗi, cần **visual workflow** / audit" → **Step Functions** (thay chuỗi Lambda gọi nhau).
> - Workflow **chạy lâu, chờ approval, tới hàng giờ/ngày** → **Standard**.
> - Workflow **rất ngắn, tần suất cực cao** → **Express**.

> ⚠️ Bẫy: Đừng chọn "Lambda gọi Lambda nhau" hay "chuỗi SQS thủ công" khi đề nhấn mạnh **orchestration / điều phối / theo dõi trạng thái nhiều bước** — đó là dấu hiệu của **Step Functions**.

Đề thi đôi khi đặt Step Functions cạnh một dịch vụ workflow đời cũ là Amazon SWF; phần so sánh nằm ở §7b bên dưới.

## 7. Microservices: ECS / EKS / Fargate

Decoupling ở tầng compute = tách monolith thành **microservices** độc lập, giao tiếp qua queue/event/API.

| | ECS (EC2 launch type) | ECS Fargate | EKS |
|---|---|---|---|
| Bản chất | Container orchestration của AWS, chạy trên EC2 bạn quản lý | Serverless container (không quản lý EC2) | Managed Kubernetes |
| Quản lý hạ tầng | Bạn quản lý EC2 (patch, scale node) | AWS quản lý, trả theo vCPU/RAM | Bạn (hoặc Fargate) quản lý node |
| Khi nào dùng | Cần kiểm soát instance, dùng Spot tiết kiệm | Không muốn quản lý server, workload biến động | Đã chuẩn Kubernetes, multi-cloud, hệ sinh thái K8s |

> 💡 Mẹo thi:
> - "Run containers without managing servers/EC2" → **Fargate**.
> - "Already using Kubernetes / cần portability K8s" → **EKS**.
> - "Cần kiểm soát instance hoặc tiết kiệm bằng Spot/Reserved" → **ECS on EC2**.

Microservices nên giao tiếp **bất đồng bộ qua SQS/SNS/EventBridge** thay vì gọi REST đồng bộ thành chuỗi dài. Lý do là **cascade failure** (lỗi dây chuyền): nếu A gọi B, B gọi C, C gọi D và tất cả đều đứng chờ, thì khi D chậm, C giữ kết nối chờ D, B chờ C, A chờ B. Mỗi service cạn dần thread và connection, và một service chậm kéo sập cả chuỗi. Có queue ở giữa thì A gửi xong là xong, D chậm chỉ làm queue dài ra.

Khi vẫn cần gọi trực tiếp, hai câu hỏi phải trả lời:

- **Service kia đang ở địa chỉ nào?** Container sinh ra và mất đi liên tục, IP đổi theo. **Service discovery** là cơ chế để service tìm nhau bằng **tên** thay vì IP cứng. **AWS Cloud Map** là sổ đăng ký đó: ECS tự ghi IP của từng task vào khi task khởi động và xoá khi task chết; service khác tra tên (ví dụ `orders.internal`) qua DNS hoặc API để lấy địa chỉ đang sống.
- **Chia tải giữa nhiều bản của cùng một service thế nào?** Đặt một **ALB** nội bộ phía trước. ALB định tuyến theo đường dẫn (`/orders/*` về service orders, `/users/*` về service users, gọi là path-based routing) hoặc theo tên miền (host-based routing), nên một ALB phục vụ được nhiều microservice.

## 7b. Step Functions vs Amazon SWF (service cũ)

Mục này nối tiếp phần Step Functions ở §6: cả hai đều là dịch vụ điều phối workflow nhiều bước.

**Amazon Simple Workflow Service (SWF)** là service điều phối workflow đời đầu. SWF chỉ giữ **trạng thái và lịch sử thực thi**; mọi logic do hai loại chương trình bạn tự viết và tự chạy (trên EC2 hoặc on-premises) đảm nhận:

- **Activity worker** là chương trình làm **một bước việc cụ thể** (charge thẻ, gửi email, encode video). Nó poll SWF để nhận task, làm xong thì báo kết quả.
- **Decider** là chương trình chứa **logic điều phối**: mỗi khi một bước xong, SWF đưa lịch sử cho decider, decider đọc và quyết định bước tiếp theo là gì (chạy bước B, retry, hay kết thúc).

Nói cách khác, phần mà Step Functions cho bạn khai báo bằng JSON thì ở SWF bạn phải viết thành code và nuôi server để chạy nó. Đổi lại sự linh hoạt đó là phải tự vận hành code điều phối.

**AWS Step Functions** là lựa chọn mặc định cho ứng dụng mới: định nghĩa state machine bằng JSON,
không phải nuôi decider, tích hợp sẵn với hơn 200 service, có retry/catch khai báo được.

| Đề mô tả | Chọn |
|---|---|
| Workflow mới, muốn ít vận hành, ghép nhiều AWS service | **Step Functions** |
| Cần **luồng có bước thao tác thủ công của con người** kéo dài, hoặc signal từ hệ thống ngoài, và cần điều khiển ở mức code | **SWF** |
| Chỉ cần tách producer/consumer, không cần trạng thái workflow | **SQS/SNS/EventBridge** |

> 🪤 Bẫy: SWF vẫn xuất hiện trong đề như một mồi nhử. Trừ khi đề nhấn mạnh **human task** hoặc
> **decider tự viết**, đáp án gần như luôn là Step Functions.

## 8. Tổng hợp cây quyết định cho đề thi

Đọc câu hỏi và bắt từ khóa:

- "Order matters / no duplicates" → **SQS FIFO**
- "Buffer spike / smooth out load / decouple producer-consumer" → **SQS Standard**
- "Message xử lý trùng khi consumer chậm" → tăng **visibility timeout**
- "Message lỗi gây nghẽn / giữ lại để debug" → **DLQ**
- "Giảm empty response / chi phí poll" → **Long polling**
- "Một event → nhiều hệ thống độc lập, không mất message" → **SNS → nhiều SQS (fan-out)**
- "React tới AWS service event / SaaS / filtering phức tạp / cron schedule" → **EventBridge**
- "Real-time stream, replay, nhiều consumer, big data" → **Kinesis**
- "Run containers serverless" → **Fargate**
- "Long-running task qua API" → **API Gateway → SQS/Step Functions (async)**

## 9. Checklist các bẫy thường gặp

- ❌ Standard queue nhưng yêu cầu **no duplicate/ordering** → phải **FIFO**.
- ❌ Chọn SNS một mình cho fan-out cần **durability** → phải ghép **SQS**.
- ❌ Dùng SQS khi cần **replay/nhiều consumer độc lập** → phải **Kinesis**.
- ❌ Dùng Kinesis cho task decouple đơn giản → **overkill**, dùng **SQS**.
- ❌ Quên rằng SQS message có trần kích thước (**256 KB** trong đề thi, 1 MiB theo docs hiện tại) → payload lớn dùng **S3 + Extended Client**.
- ❌ Giữ session trên instance (stateful) → đẩy ra **DynamoDB/ElastiCache**.
- ❌ Tác vụ > 29s qua API Gateway đồng bộ → chuyển **async**.
- ❌ Visibility timeout quá ngắn → **double processing**.

> 💡 Tư duy cốt lõi: Khi nghi ngờ giữa các lựa chọn, hỏi 3 câu — (1) Cần **ordering** không? (2) Cần **fan-out** tới nhiều consumer không? (3) Cần **replay/nhiều consumer độc lập** không? Trả lời 3 câu này gần như luôn dẫn thẳng tới SQS / SNS / EventBridge / Kinesis đúng.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cây quyết định chọn dịch vụ decoupling theo 3 câu hỏi</title>
  <desc>Cây quyết định: hỏi cần replay hoặc nhiều consumer độc lập thì chọn Kinesis; nếu cần fan-out tới nhiều consumer thì hỏi tiếp có cần filtering nâng cao hay event từ AWS/SaaS không — có thì EventBridge, không thì SNS (ghép SQS để durable); nếu không fan-out thì hỏi có cần ordering hoặc no-duplicate không — có thì SQS FIFO, không thì SQS Standard.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">Chọn dịch vụ decoupling — 3 câu hỏi</text>
  <defs>
    <marker id="dtArr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
  <rect x="250" y="40" width="220" height="50" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="62" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">1. Cần replay / nhiều</text>
  <text x="360" y="79" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">consumer độc lập?</text>
  <path d="M470 65 H 640 V 110" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#dtArr)"/>
  <text x="556" y="58" font-size="10.5" fill="#10b981" opacity="0.95" font-weight="700">CÓ</text>
  <rect x="566" y="112" width="148" height="46" rx="10" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="640" y="140" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Kinesis</text>
  <path d="M360 90 V 130" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#dtArr)"/>
  <text x="370" y="116" font-size="10.5" fill="currentColor" opacity="0.7">KHÔNG</text>
  <rect x="250" y="132" width="220" height="50" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="154" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">2. Cần fan-out tới</text>
  <text x="360" y="171" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">nhiều consumer?</text>
  <path d="M470 157 H 540 V 175 H 607 V 198" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#dtArr)"/>
  <text x="500" y="150" font-size="10.5" fill="#10b981" opacity="0.95" font-weight="700">CÓ</text>
  <rect x="500" y="200" width="214" height="56" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="607" y="222" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Filtering nâng cao /</text>
  <text x="607" y="238" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">event AWS/SaaS /</text>
  <text x="607" y="251" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">cron?</text>
  <path d="M555 256 V 282" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#dtArr)"/>
  <text x="500" y="274" font-size="10" fill="currentColor" opacity="0.7">KHÔNG</text>
  <rect x="533" y="282" width="148" height="46" rx="10" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="607" y="304" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">SNS</text>
  <text x="607" y="320" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">+ SQS để durable</text>
  <path d="M698 256 V 348" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#dtArr)"/>
  <text x="703" y="290" font-size="10" fill="#10b981" opacity="0.95" font-weight="700">CÓ</text>
  <rect x="566" y="350" width="148" height="46" rx="10" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="640" y="378" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">EventBridge</text>
  <path d="M360 182 V 222" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#dtArr)"/>
  <text x="370" y="208" font-size="10.5" fill="currentColor" opacity="0.7">KHÔNG</text>
  <rect x="250" y="224" width="220" height="50" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="246" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">3. Cần ordering /</text>
  <text x="360" y="263" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">no-duplicate?</text>
  <path d="M250 249 H 170 V 290" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#dtArr)"/>
  <text x="180" y="242" font-size="10.5" fill="#10b981" opacity="0.95" font-weight="700">CÓ</text>
  <rect x="96" y="292" width="148" height="46" rx="10" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="170" y="320" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">SQS FIFO</text>
  <path d="M360 274 V 314" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#dtArr)"/>
  <text x="370" y="300" font-size="10.5" fill="currentColor" opacity="0.7">KHÔNG</text>
  <rect x="286" y="316" width="148" height="46" rx="10" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="344" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">SQS Standard</text>
</svg>
