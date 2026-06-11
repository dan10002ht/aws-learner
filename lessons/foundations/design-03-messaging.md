# Async & Messaging Patterns

Hãy tưởng tượng bạn gọi món ở hai quán ăn khác nhau:

- **Quán A:** bạn đứng tại quầy, gọi món, và **đứng chờ tại chỗ** cho đến khi đầu bếp nấu xong rồi mới được rời đi.
- **Quán B:** bạn gọi món, nhận **số thứ tự**, rồi đi tìm chỗ ngồi, lướt điện thoại. Khi món xong, loa gọi số của bạn.

Quán A là **synchronous (đồng bộ)**. Quán B là **asynchronous (bất đồng bộ)**. Cả hai đều phục vụ được khách — nhưng khi quán đông nghẹt, quán B vận hành trơn tru hơn hẳn: quầy gọi món không bị tắc, đầu bếp cứ nấu theo nhịp của mình, khách không phải dồn cục trước quầy.

Bài này giải thích vì sao các hệ thống phân tán lớn gần như luôn dùng messaging bất đồng bộ ở đâu đó, và những "cái bẫy" đi kèm: retry, idempotency, ordering.

## 1. Sync vs Async — hai cách hai service nói chuyện

### 1.1 Synchronous: gọi và chờ

Khi service A gọi service B theo kiểu sync (ví dụ HTTP request):

```
A ----request----> B
A (đứng chờ...)    B (đang xử lý)
A <---response---- B
A tiếp tục chạy
```

A bị **block** (hoặc ít nhất là giữ tài nguyên chờ) cho đến khi B trả lời. Điều này tạo ra một sự **ràng buộc chặt (tight coupling)** về thời gian:

- B chậm → A chậm theo.
- B chết → A lỗi theo (hoặc phải tự xử lý timeout).
- B chỉ chịu được 100 request/giây → A không được gửi nhanh hơn thế.

### 1.2 Asynchronous: gửi rồi đi tiếp

Với async, A không nói chuyện trực tiếp với B. A gửi một **message** (thông điệp) vào một trạm trung gian, rồi tiếp tục việc của mình:

```
A ---message---> [ hộp thư trung gian ] ---> B (lấy ra xử lý khi rảnh)
A đi làm việc khác ngay
```

Giống như gửi email thay vì gọi điện thoại: người nhận không cần online đúng lúc bạn gửi.

### 1.3 So sánh nhanh

| Tiêu chí | Synchronous | Asynchronous |
|---|---|---|
| Người gọi phải chờ? | Có | Không |
| B chết thì sao? | A lỗi ngay | Message nằm chờ, B sống lại xử lý sau |
| B quá tải thì sao? | A bị chậm/lỗi theo | Message xếp hàng, B xử lý theo sức mình |
| Nhận kết quả | Ngay trong response | Phải có cơ chế riêng (callback, polling, event) |
| Phù hợp khi | Cần trả lời ngay (login, tra cứu) | Việc có thể làm sau (gửi email, resize ảnh, xuất báo cáo) |
| Độ phức tạp | Đơn giản, dễ debug | Phức tạp hơn: retry, trùng lặp, thứ tự |

> 💡 **Ghi nhớ:** Async không "nhanh hơn" sync cho một request đơn lẻ — nó **bền vững hơn dưới tải** và **tách rời số phận** của các service. Đổi lại, bạn mất câu trả lời tức thì và phải xử lý các vấn đề mới (retry, duplicate).

### 1.4 Vì sao phải decouple (tách rời)?

**Coupling (ràng buộc)** giữa hai service có ba dạng:

1. **Ràng buộc thời gian:** cả hai phải sống cùng lúc. Async phá vỡ ràng buộc này — B có thể bảo trì 10 phút, message vẫn chờ trong queue.
2. **Ràng buộc tốc độ:** A phải gửi đúng nhịp B chịu được. Queue làm bộ đệm, mỗi bên chạy theo nhịp riêng.
3. **Ràng buộc hiểu biết:** A phải biết địa chỉ, API của B. Với pub/sub (xem mục 4), A chỉ cần "phát thanh" sự kiện, không cần biết ai nghe.

Decouple là lý do tồn tại của toàn bộ messaging. Hệ càng lớn, càng nhiều service, decouple càng quan trọng — vì xác suất "có ít nhất một service đang chậm hoặc chết" tăng theo số lượng service.

## 2. Message Queue — hàng đợi thông điệp

### 2.1 Mô hình producer/consumer

Queue là một hàng đợi: bên gửi gọi là **producer**, bên nhận gọi là **consumer**.

```
                    QUEUE
Producer ---> [ M5 M4 M3 M2 M1 ] ---> Consumer 1
Producer --->                    ---> Consumer 2
                                 ---> Consumer 3
```

Đặc điểm cốt lõi của queue: **mỗi message chỉ được xử lý bởi MỘT consumer**. Ba consumer cùng đọc một queue nghĩa là họ **chia việc** cho nhau (giống ba nhân viên cùng lấy đơn từ một xấp phiếu), chứ không phải mỗi người nhận một bản sao.

Muốn xử lý nhanh hơn? Thêm consumer. Đây là cách scale tự nhiên nhất: queue dài ra → bật thêm worker → queue ngắn lại.

### 2.2 Ack — xác nhận đã xử lý xong

Câu hỏi quan trọng: khi nào message được xoá khỏi queue?

Cách ngây thơ: xoá ngay khi consumer **nhận** message. Nguy hiểm! Nếu consumer nhận xong rồi crash giữa chừng, message mất vĩnh viễn — đơn hàng "bốc hơi".

Cách đúng: consumer nhận message, xử lý xong, rồi gửi **acknowledgement (ack)** — "tôi đã làm xong, xoá đi được rồi". Trong lúc chờ ack, message bị **ẩn tạm thời** khỏi các consumer khác (để không ai xử lý trùng):

```
1. Consumer lấy message M  → M bị ẩn (invisible) trong X giây
2. Consumer xử lý M...
3a. Xong → gửi ack → M bị xoá khỏi queue. Hoàn tất.
3b. Consumer crash / quá X giây không ack
    → M hiện lại trong queue → consumer khác lấy xử lý (REDELIVERY)
```

### 2.3 Redelivery — giao lại

Redelivery (giao lại message) là **tính năng**, không phải lỗi: nó bảo đảm message không bị mất chỉ vì một worker chết. Đây là nền tảng của bảo đảm **at-least-once delivery** — mỗi message được giao **ít nhất một lần**, nhưng có thể nhiều hơn một lần.

Vì sao "có thể nhiều hơn một lần"? Tình huống kinh điển: consumer xử lý **xong** rồi mới crash, **chưa kịp gửi ack**. Queue không biết việc đã xong, nên giao lại message → message bị xử lý **hai lần**. Đây chính là lý do cần idempotency (mục 6).

### 2.4 DLQ — Dead Letter Queue

Có những message "độc": dữ liệu hỏng, bug khiến consumer crash mỗi lần xử lý nó. Message này sẽ bị giao lại mãi mãi — crash, giao lại, crash, giao lại — làm nghẽn cả hệ thống. Người ta gọi nó là **poison message**.

Giải pháp: sau N lần giao lại thất bại, chuyển message sang một queue riêng gọi là **Dead Letter Queue (DLQ)** — "nghĩa địa thư chết":

```
Queue chính ---(thất bại quá 3 lần)---> DLQ
                                          |
                                  Người vận hành xem xét:
                                  sửa bug → đưa lại queue chính,
                                  hoặc bỏ hẳn
```

DLQ vừa bảo vệ luồng chính, vừa giữ lại "vật chứng" để debug. Một hệ thống messaging nghiêm túc **luôn** có DLQ và cảnh báo khi DLQ có message.

> 💡 **Ghi nhớ:** Bộ ba ack — redelivery — DLQ là "lưới an toàn" của queue: ack chống mất message, redelivery chống worker chết, DLQ chống message độc làm tê liệt hệ thống.

## 3. Pub/Sub vs Queue — chia việc hay phát thanh?

Queue trả lời câu hỏi "**ai đó** hãy làm việc này". Nhưng có lúc bạn cần "**mọi người** hãy biết chuyện này" — đó là **publish/subscribe (pub/sub)**.

### 3.1 Mô hình pub/sub

Producer (giờ gọi là **publisher**) phát message vào một **topic**. Mọi **subscriber** đã đăng ký topic đó đều nhận được **một bản sao riêng**:

```
                         ┌──> Subscriber: Email service  (gửi mail xác nhận)
Publisher ──> [ TOPIC ] ─┼──> Subscriber: Kho hàng       (trừ tồn kho)
"Đơn hàng    "đơn mới"   └──> Subscriber: Analytics      (ghi thống kê)
 #123 mới"
```

Giống đài phát thanh: ai bật đúng kênh đều nghe được, và phát thanh viên không cần biết có bao nhiêu người đang nghe. Thêm subscriber mới (ví dụ service chống gian lận) **không cần sửa publisher** — đây là sức mạnh decouple lớn nhất của pub/sub.

### 3.2 So sánh

| | Queue | Pub/Sub |
|---|---|---|
| Một message đến tay | 1 consumer duy nhất | Tất cả subscriber |
| Mục đích | Phân phối công việc | Lan truyền sự kiện |
| Analogy | Xấp phiếu order, ai rảnh thì lấy | Đài phát thanh |
| Thêm bên nhận mới | Chia mỏng việc hơn | Bên mới nhận đủ mọi sự kiện |
| Ví dụ | Resize 1000 ảnh bằng 10 worker | Báo "user vừa đăng ký" cho 5 service |

### 3.3 Kết hợp: fan-out

Pattern phổ biến nhất thực tế là **topic phát vào nhiều queue** — mỗi nhóm consumer có queue riêng để vừa nhận đủ sự kiện, vừa có ack/retry/DLQ:

```
                  ┌──> Queue email  ──> các worker email
Topic "đơn mới" ──┼──> Queue kho    ──> các worker kho
                  └──> Queue ship   ──> các worker giao hàng
```

Đây gọi là **fan-out**: một sự kiện toả ra nhiều nhánh xử lý độc lập. Nhánh kho chậm không ảnh hưởng nhánh email.

## 4. Event-Driven Architecture — kiến trúc hướng sự kiện

Đẩy ý tưởng pub/sub lên mức toàn hệ thống, ta có **event-driven architecture (EDA)**: các service không gọi lệnh nhau, mà **công bố sự kiện** (event) về những gì đã xảy ra, và **phản ứng** với sự kiện của nhau.

Khác biệt tư duy quan trọng giữa **command** và **event**:

| | Command (mệnh lệnh) | Event (sự kiện) |
|---|---|---|
| Ngữ nghĩa | "Hãy làm X" | "X **đã** xảy ra" |
| Hướng đến | Một bên nhận cụ thể | Bất kỳ ai quan tâm |
| Ai quyết định hệ quả | Bên gửi | Bên nghe |
| Ví dụ | `SendEmail(user)` | `OrderPlaced(#123)` |

Trong EDA, service Đơn hàng chỉ tuyên bố `OrderPlaced`. Nó **không biết và không cần biết** ai sẽ gửi email, ai trừ kho. Trách nhiệm "phải làm gì khi có đơn" thuộc về các bên nghe. Nhờ vậy:

- Thêm tính năng mới = thêm một subscriber, không đụng code cũ.
- Mỗi service hỏng độc lập, sửa độc lập, deploy độc lập.
- Hệ thống mô tả đúng nghiệp vụ: chuỗi sự kiện `OrderPlaced → PaymentCaptured → OrderShipped` đọc lên như câu chuyện.

Cái giá phải trả: **luồng xử lý trở nên vô hình**. Không còn một hàm `processOrder()` đọc từ trên xuống dưới — logic rải khắp các subscriber. Debug cần công cụ tracing tốt, và dữ liệu giữa các service chỉ **eventually consistent** (nhất quán sau một độ trễ).

> 💡 **Ghi nhớ:** Event nói về **quá khứ** ("đã xảy ra"), command nói về **mong muốn** ("hãy làm"). Hệ thống event-driven lỏng lẻo (loosely coupled) hơn nhưng khó nhìn toàn cảnh hơn — đó là một sự đánh đổi, không phải bữa trưa miễn phí.

## 5. Backpressure & Load Leveling — chống "vỡ trận" khi tải dồn

### 5.1 Bài toán

Hệ thống bán vé concert: bình thường 50 đơn/giây, lúc mở bán vọt lên 5.000 đơn/giây trong 2 phút. Nếu xử lý sync, database nhận 5.000 ghi/giây → quá tải → timeout → user bấm lại → tải càng tăng → sập dây chuyền.

### 5.2 Load leveling: queue làm hồ điều hoà

Đặt queue vào giữa, hệ thống thành cái **hồ điều hoà** (như hồ chứa chống lũ):

```
Tải vào (gồ ghề):  ▂▂▂█████▂▂▂▂█▂▂      5.000/s lúc đỉnh
                        |
                   [ QUEUE phình ra rồi xẹp dần ]
                        |
Tải ra (phẳng):    ▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃      500/s đều đặn — đúng sức backend
```

Backend luôn chạy ở nhịp nó chịu được. Đỉnh tải biến thành **độ trễ tạm thời** (đơn của bạn xử lý sau 30 giây thay vì 1 giây) thay vì **sự cố sập hệ thống**. Pattern này gọi là **queue-based load leveling**.

### 5.3 Backpressure: nói "chậm lại" ngược dòng

Nhưng hồ nào cũng có dung tích. Nếu producer cứ bơm nhanh hơn consumer mãi mãi, queue phình vô hạn → hết bộ nhớ/hết tiền, và message nằm chờ hàng giờ (xử lý đơn sau 3 tiếng thì còn ý nghĩa gì?).

**Backpressure** là cơ chế cho phép áp lực truyền **ngược** về phía nguồn: hạ nguồn quá tải thì thượng nguồn phải chậm lại. Các hình thức:

- **Chặn/giới hạn nhận:** từ chối bớt request mới (trả lỗi 429 "Too Many Requests") khi queue vượt ngưỡng.
- **Giới hạn kích thước queue:** queue đầy thì producer phải chờ hoặc bị từ chối.
- **Shed load:** chủ động bỏ những việc ít quan trọng (tắt tính năng gợi ý, giữ tính năng thanh toán).
- **Auto scaling theo độ dài queue:** queue dài quá → tự bật thêm consumer.

> 💡 **Ghi nhớ:** Queue **hấp thụ đỉnh tải tạm thời**, không cứu được tình trạng quá tải **kéo dài**. Khi tải vào > tải ra liên tục, bạn cần backpressure (giảm đầu vào) hoặc scale consumer (tăng đầu ra) — queue chỉ mua thời gian.

## 6. Idempotency — vì sao bắt buộc khi có retry

### 6.1 Duplicate là điều chắc chắn xảy ra

Nhắc lại mục 2.3: với at-least-once delivery, message **có thể** đến hai lần (consumer xong việc nhưng ack thất lạc; network timeout khiến producer gửi lại; redelivery sau crash...). Trong hệ phân tán, không có cách rẻ nào để loại bỏ hoàn toàn khả năng này. Vậy nên nguyên tắc là:

**Đừng cố ngăn duplicate — hãy làm cho duplicate trở nên vô hại.**

### 6.2 Idempotent nghĩa là gì?

Một thao tác là **idempotent** nếu thực hiện nó **nhiều lần cho kết quả y hệt thực hiện một lần**.

Analogy: nút bấm thang máy. Bấm tầng 5 một lần hay mười lần, thang vẫn chỉ dừng tầng 5 đúng một lần. Ngược lại, "bỏ thêm một viên đường vào ly" không idempotent — làm 3 lần được 3 viên đường.

| Thao tác | Idempotent? | Vì sao |
|---|---|---|
| `SET balance = 100` | ✅ | Chạy lại vẫn ra 100 |
| `balance = balance - 50` | ❌ | Chạy 2 lần trừ 100 |
| `DELETE đơn #123` | ✅ | Xoá lần 2 chẳng còn gì để xoá |
| `INSERT đơn mới` | ❌ | Chạy 2 lần tạo 2 đơn |
| Gửi email xác nhận | ❌ | User nhận 2 email |

### 6.3 Cách làm thao tác trở nên idempotent

Kỹ thuật phổ biến nhất: **idempotency key**. Mỗi message/request mang một ID duy nhất; consumer ghi lại các ID đã xử lý:

```
Nhận message (id = "abc-123"):
  1. Đã có "abc-123" trong bảng processed_ids? 
       → CÓ: bỏ qua, chỉ ack. Xong.
       → CHƯA: xử lý + ghi "abc-123" vào bảng (trong CÙNG một transaction)
  2. Ack
```

Điểm tinh tế: bước "xử lý" và "ghi ID" phải **nguyên tử** (cùng transaction), nếu không lại tạo ra khe hở crash-giữa-chừng y như bài toán ack ban đầu.

Cách khác: thiết kế thao tác tự nhiên idempotent — dùng `UPSERT` thay `INSERT`, dùng `SET` trạng thái đích thay vì cộng/trừ delta.

> 💡 **Ghi nhớ:** Retry và idempotency là cặp bài trùng **bắt buộc đi đôi**. Retry mà không idempotent = trừ tiền hai lần, gửi email hai lần. Bất cứ khi nào hệ thống có chữ "retry", câu hỏi đầu tiên phải là "consumer đã idempotent chưa?".

## 7. Ordering & Exactly-Once — hai thứ nghe dễ mà rất khó

### 7.1 Vì sao thứ tự (ordering) khó giữ?

Trực giác bảo: queue là hàng đợi FIFO, vào trước ra trước, thứ tự đương nhiên đúng chứ? Không hẳn, vì:

- **Nhiều consumer chạy song song:** message 1 vào tay worker A, message 2 vào tay worker B. Worker B nhanh hơn → message 2 **hoàn thành trước** message 1.
- **Redelivery:** message 1 thất bại, được giao lại **sau** khi message 2, 3 đã xong.
- **Nhiều partition/server:** queue lớn được chia mảnh để scale, mỗi mảnh một thứ tự riêng.

Hệ quả thực tế: sự kiện `CapNhatDiaChi` có thể được xử lý trước `TaoTaiKhoan` — và code của bạn phải sống được với điều đó.

Giải pháp thoả hiệp phổ biến: **thứ tự theo nhóm (per-key ordering)**. Không hứa thứ tự toàn cục, chỉ hứa các message **cùng một khoá** (cùng `user_id`, cùng `order_id`) đi vào cùng một "làn" và được xử lý tuần tự. Các làn khác nhau chạy song song thoải mái. Đây là cách FIFO queue và streaming platform (Kinesis, Kafka) hoạt động — và cái giá là **làn nào nghẽn thì cả làn đó chờ**, throughput thấp hơn queue thường.

### 7.2 Vì sao exactly-once gần như bất khả thi?

Ba mức bảo đảm giao message:

| Mức | Ý nghĩa | Cái giá |
|---|---|---|
| **At-most-once** | Giao tối đa 1 lần, có thể **mất** | Nhanh, đơn giản; chấp nhận mất (vd: số liệu metric) |
| **At-least-once** | Không mất, có thể **trùng** | Cần consumer idempotent — mặc định của đa số queue |
| **Exactly-once** | Đúng 1 lần, không mất không trùng | Cực khó, đắt, và thường chỉ là ảo giác |

Vì sao exactly-once khó? Quay lại khe hở định mệnh: consumer xử lý xong, gửi ack, ack **thất lạc trên mạng**. Lúc này queue đứng trước hai lựa chọn, và **không có cách nào biết chắc** chuyện gì đã xảy ra phía consumer:

- Không giao lại → nếu consumer thực ra chưa xử lý, message **mất** (vi phạm "không mất").
- Giao lại → nếu consumer đã xử lý rồi, message **trùng** (vi phạm "không trùng").

Đây là hệ quả của bài toán **Two Generals**: hai bên liên lạc qua kênh không tin cậy không bao giờ chắc chắn 100% về trạng thái của nhau. Những hệ thống quảng cáo "exactly-once" thực chất là **at-least-once delivery + xử lý idempotent/dedup ở phía nhận** — tức exactly-once *processing* (xử lý hiệu quả đúng một lần), không phải exactly-once *delivery*.

> 💡 **Ghi nhớ:** Mặc định thực dụng của ngành: **at-least-once delivery + idempotent consumer + per-key ordering khi thật sự cần**. Đừng đòi hỏi global ordering hay exactly-once delivery trừ khi sẵn sàng trả giá rất đắt về hiệu năng và độ phức tạp.

## 8. Tổng kết các pattern

```
Decouple thời gian/tốc độ  ──> Message Queue (producer/consumer, ack, DLQ)
Một sự kiện, nhiều bên nghe ──> Pub/Sub + fan-out vào nhiều queue
Cả hệ thống phản ứng sự kiện ─> Event-Driven Architecture
Tải dồn cục bộ              ──> Load leveling (queue làm hồ điều hoà)
Quá tải kéo dài             ──> Backpressure + scale consumer
Có retry                    ──> BẮT BUỘC idempotency
Cần thứ tự                  ──> Per-key ordering (FIFO theo nhóm), chấp nhận chậm hơn
```

## Liên hệ sang AWS

Khi học CLF/SAA/DVA, các khái niệm trong bài map gần như 1-1 sang dịch vụ AWS:

| Khái niệm trong bài | Dịch vụ AWS | Ghi chú nhanh |
|---|---|---|
| Message queue (producer/consumer, ack, visibility, DLQ) | **Amazon SQS** | Standard queue = at-least-once, best-effort ordering. "Ẩn tạm khi đang xử lý" = *visibility timeout*. DLQ cấu hình qua *redrive policy* + `maxReceiveCount` |
| Per-key ordering + chống trùng | **SQS FIFO queue** | Ordering theo `MessageGroupId` (đúng per-key ordering mục 7.1), dedup 5 phút qua deduplication ID — throughput thấp hơn Standard |
| Pub/sub, fan-out | **Amazon SNS** | Topic phát bản sao tới nhiều subscriber. Pattern kinh điển trong đề thi: **SNS → nhiều SQS queue** (fan-out, mục 3.3) |
| Event-driven architecture, định tuyến event theo nội dung | **Amazon EventBridge** | Event bus + *rules* lọc/định tuyến event giữa các service AWS, SaaS và app của bạn; chọn EventBridge khi cần lọc theo nội dung event và tích hợp nhiều nguồn |
| Streaming, per-key ordering, replay dữ liệu | **Amazon Kinesis Data Streams** | Ordering theo *partition key* trong từng *shard*; nhiều consumer cùng đọc lại được dữ liệu (khác SQS — đọc xong là xoá). Dùng cho real-time analytics, log/clickstream |
| Load leveling trước backend | SQS đứng giữa API và worker (EC2/Lambda) | Câu hỏi thi hay gặp: "decouple để chống mất request khi backend quá tải" → đáp án thường là SQS |
| Idempotency khi retry | Lambda + SQS/DynamoDB | Lambda retry tự động → handler phải idempotent; bảng DynamoDB hay được dùng làm nơi lưu idempotency key |

Cách nhớ nhanh khi vào đề thi: **SQS = chia việc (1 message → 1 consumer), SNS = phát thanh (1 message → nhiều subscriber), EventBridge = tổng đài định tuyến sự kiện thông minh, Kinesis = băng chuyền streaming có thứ tự và replay được.** Nắm chắc bài này, bạn sẽ thấy các câu hỏi messaging trong CLF/SAA/DVA chỉ là việc gọi đúng tên AWS cho những pattern bạn đã hiểu.
