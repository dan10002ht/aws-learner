# Case study: Nearby Friends — vị trí động realtime

> Bài trước — [Proximity Service](./sd-23-proximity-service.md) — hỏi *"quanh tôi có nhà hàng nào?"*. Bài này hỏi *"bạn bè tôi ai đang ở gần?"*. Nghe như cùng một bài toán chỉ đổi loại điểm dữ liệu, và đó chính là cái bẫy. Nhà hàng **đứng yên**: bạn dựng index không gian một lần, cả năm sau nó vẫn đúng, mọi thứ còn lại là bài toán đọc. Con người **di chuyển liên tục**: mỗi 30 giây, mười triệu toạ độ đồng loạt đổi giá trị, và mỗi lần đổi phải chảy tới hàng chục người khác **trong vài giây**. Index không gian gần như biến mất khỏi bức tranh — thứ bạn thật sự phải thiết kế là một **đường ống fan-out ghi-nặng, độ trễ thấp, giữ hàng chục triệu kết nối bền**.

Nếu Proximity Service là bài **read-heavy có index tĩnh**, thì Nearby Friends là bài **write-heavy có fan-out động** — hai đầu đối lập của phổ thiết kế. Cùng một câu hỏi "ai gần ai", nhưng câu trả lời kiến trúc gần như không có một hộp nào chung. Nếu chỉ nhớ một câu từ bài này: **vấn đề không phải tìm kiếm không gian, mà là phát tán (dissemination)**.

---

## 1. Làm rõ yêu cầu

### Functional

| # | Yêu cầu | Ghi chú phạm vi |
|---|---|---|
| 1 | **Thấy bạn bè trong bán kính 5 dặm** | Bán kính **cấu hình được** (5 dặm là mặc định). Khoảng cách tính theo **đường chim bay** — không đi qua routing engine, không quan tâm sông núi |
| 2 | **Danh sách cập nhật vài giây một lần** | Đây là chữ "realtime" của bài. Không phải millisecond, nhưng cũng không phải "làm mới khi kéo xuống" |
| 3 | Mỗi bạn hiện kèm **khoảng cách + timestamp** | Timestamp quan trọng hơn vẻ ngoài: nó là cách UI nói *"dữ liệu này cũ 4 phút rồi"* thay vì nói dối |
| 4 | **Lịch sử vị trí (tuỳ chọn)** | Không phục vụ tính năng chính. Dùng cho ML, gợi ý, phân tích. Ghi được phép trễ, được phép mất lác đác |
| 5 | Bạn **không hoạt động 10 phút** thì biến mất khỏi danh sách | Ràng buộc này rất quý — nó biến "trạng thái" thành **TTL**, xem §7.1 |

Cố ý **để ngoài phạm vi**, và nói ra là để ghi điểm chứ không phải để né: đồ thị bạn bè (đã có sẵn từ app mẹ — đây là *tính năng* trong một mạng xã hội lớn, không phải app độc lập); chat; xử lý người lạ (sẽ quay lại như một **biến thể** ở §11); và bản đồ/định tuyến.

### Non-functional

| Thuộc tính | Mục tiêu | Nó lái thiết kế thế nào |
|---|---|---|
| **Độ trễ thấp** | Vị trí đổi → bạn bè thấy trong **vài giây** | Loại thẳng kiến trúc batch. Buộc phải **push**, không thể pull. Là lý do có WebSocket (§4) |
| **Khả năng ghi** | ~**334.000 update/s**, đỉnh gấp 2–3 | Ràng buộc **số một**. Mọi thành phần trên đường nóng phải chịu được ghi liên tục ở mức này |
| **Fan-out** | Mỗi ghi sinh ~**40 lần phát tán** | Ràng buộc **số hai**, và là thứ nhân mọi con số khác lên 40 lần |
| **Reliability** | Mất lác đác **chấp nhận được** | Con vàng của bài. Mất một điểm vị trí → 30 giây sau có điểm mới. Cho phép bỏ ack, bỏ retry, bỏ persistence trên đường nóng |
| **Consistency** | **Eventual** là đủ | Không ai chết vì thấy bạn ở vị trí của 3 giây trước. Không cần quorum, không cần transaction |
| **Availability** | Suy giảm mềm | Mất tính năng "nearby" không được kéo sập app mẹ |
| **Privacy** | Opt-in, thu hồi được, làm mờ được | §12. Đây là bài duy nhất trong loạt case study mà *thiết kế sai gây hại thân thể thật* |

### Giả định chốt

```
1 tỉ user đăng ký, 10% dùng tính năng    →  100 triệu DAU
Đồng thời online cùng lúc: 10%            →   10 triệu kết nối hoạt động
Chu kỳ cập nhật vị trí:                       30 giây
Trung bình số bạn:                            400
Tỉ lệ bạn đang online cùng lúc:               10%   → ~40 người nhận mỗi update
Bán kính "gần":                               5 dặm (~8 km)
Trang hiển thị:                               20 bạn gần nhất
Timeout "không hoạt động":                    10 phút
Giữ lịch sử vị trí:                           ~1 năm
```

> 💡 **Nguyên tắc**: giả định nào không nhân lên thành một con số ở mục sau thì cắt bỏ. Ở bài này, hai giả định *"30 giây"* và *"40 bạn online"* là hai cái quan trọng nhất — chúng là **mẫu số** và **hệ số nhân** của toàn bộ hệ thống. Trong phỏng vấn, hãy hỏi rõ chính xác hai con số này trước mọi thứ khác.

---

## 2. Back-of-envelope estimation

### 2.1 Write QPS — con số định hình tất cả

```
Người dùng đang online:              10.000.000
Chu kỳ gửi vị trí:                           30 s

Location update QPS = 10.000.000 / 30  ≈  334.000 update/giây
Giờ cao điểm (×2–3)                    ≈  700.000 – 1.000.000 update/giây
```

**334.000 lần ghi mỗi giây, đều đặn, 24/7.** Để có cảm giác: URL Shortener (sd-03) ghi ~1.160/s, Google Drive ghi metadata ~3.500/s, Twitter lúc cao điểm ~6.000 tweet/s — bài này lớn hơn **55 tới 290 lần**. Một cụm PostgreSQL được chăm sóc tốt làm được vài chục nghìn ghi/giây. Ta đang cần gấp **mười tới ba mươi lần** thế, mỗi giây, mãi mãi. Kết luận rơi ra gần như tức khắc: **không có database quan hệ nào trên đường nóng**. Vị trí hiện tại phải sống trong bộ nhớ.

### 2.2 Fan-out — và đây mới là con số thật sự đáng sợ

Write QPS mới là nửa đầu câu chuyện. Mỗi lần ghi phải **chảy tiếp tới bạn bè**:

```
Mỗi update phải đẩy tới: 400 bạn × 10% online  =  40 người nhận

Tổng lượng phát tán = 334.000 × 40  ≈  13.400.000 thông điệp/giây
Giờ cao điểm                        ≈  30.000.000 – 40.000.000/giây
```

**13,4 triệu thông điệp mỗi giây** trong hệ thống nội bộ. Đây là con số dùng để mua máy, không phải 334k.

> ⚠️ **Bẫy kinh điển**: ứng viên tính ra 334k update/s, gật gù "cũng lớn nhỉ", rồi vẽ kiến trúc. Con số thật lớn hơn **40 lần**, và nó nằm ở chỗ khác hẳn — không phải ở tầng ghi, mà ở **tầng phát tán**. Ai bỏ sót phép nhân này sẽ thiết kế đúng một hệ thống nhỏ hơn 40 lần so với hệ thống thật.

Tính lại từ **phía người nhận**, vì cách này soi ra bản chất rõ hơn:

```
Mỗi user online nhận: 40 bạn online × (1 update / 30 s)  =  1,33 thông điệp/giây
Toàn hệ thống: 10.000.000 × 1,33                          ≈  13,3 triệu/giây   ✓
```

Hai phép tính gặp nhau. Phép thứ hai cho thêm một điều quan trọng: **mỗi điện thoại chỉ nhận hơn một tin mỗi giây** — tải trên từng client rất nhẹ, cái khó dồn hết vào **tổng**. Đây là hệ thống không chỗ nào khó, chỉ có *quá nhiều chỗ*.

### 2.3 Bao nhiêu trong số đó thật sự xuống tới điện thoại?

Một tinh chỉnh ít người nêu: 13,4 triệu/giây là lưu lượng **bên trong** hệ thống. Nhưng phần lớn bạn bè **không nằm trong 5 dặm** — họ ở thành phố khác, nước khác — và việc lọc chỉ xảy ra sau khi server nhận được tin:

```
Tỉ lệ bạn online nằm trong 5 dặm: ước lượng ~2–5%
Thông điệp thật sự đẩy xuống điện thoại
  = 13,4 triệu × 3%  ≈  400.000/giây

Kích thước payload nhị phân gọn: ~40 byte (user_id 8 + lat 4 + lng 4 + ts 4 + khung)
Egress tới client = 400.000 × 40 B  ≈  16 MB/s   ≈ 1,4 TB/ngày

Nếu dùng JSON rườm rà ~200 byte:  80 MB/s  ≈ 7 TB/ngày   (đắt gấp 5)
```

Chỗ đáng nói: **lọc bán kính xảy ra ở server người nhận, sau pub/sub**, nên nó không giảm tải nội bộ, chỉ giảm tải ra ngoài:

| Tầng | Lưu lượng | Ràng buộc chính |
|---|---:|---|
| Client → server (ghi vào) | 334k/s | CPU + kết nối |
| Nội bộ pub/sub (fan-out) | **13,4 triệu/s** | **CPU của Redis — nút thắt số một** |
| Server → client (sau lọc) | ~400k/s | Băng thông egress, tiền điện toán đám mây |

> 💡 Khi ai đó hỏi *"tại sao không lọc khoảng cách trước khi publish cho đỡ tốn?"* — câu trả lời: **người publish không biết bạn bè mình đang ở đâu**, đó chính là thứ đang được truyền đi. Muốn lọc trước thì phải tra vị trí của 400 người bạn *trước mỗi lần publish* → biến 334k ghi/giây thành 134 triệu lượt đọc/giây. Chữa còn tệ hơn bệnh. Ta cố tình **phát tán rộng rồi lọc ở biên**.

### 2.4 Bộ nhớ cho pub/sub — hàng trăm triệu channel

Thiết kế (§6) cấp cho **mỗi user một channel riêng**. Nghe hoang đường: 100 triệu channel. Nhưng hãy tính ra số thay vì cảm tính:

```
A. Bản thân channel (rỗng, chưa ai subscribe):
   Redis giữ channel trong một dict: key là chuỗi, value là danh sách subscriber.
   Channel KHÔNG có subscriber nào thì hoàn toàn KHÔNG chiếm bộ nhớ — nó
   không tồn tại. Chi phí chỉ phát sinh khi có người subscribe.
   → 90 triệu user offline: 0 byte.  ← chi tiết cứu cả thiết kế

B. Channel đang có người nghe (10 triệu user online):
   key "loc:{user_id}" ~20 B + dict entry ~64 B + đầu danh sách ~40 B
   ≈ 125 B × 10 triệu  ≈  1,25 GB          ← không đáng kể

C. Các đăng ký (subscription) — chỗ tốn thật:
   Mỗi user online subscribe channel của TẤT CẢ bạn mình (để biết khi họ
   lên mạng), 400 channel/người:
      10 triệu × 400 = 4 tỉ subscription
   Mỗi subscription ~45 B (con trỏ client + node danh sách)
      4 tỉ × 45 B  ≈  180 GB

   Tối ưu: chỉ subscribe bạn ĐANG online (40 người), còn việc "bạn vừa lên
   mạng" thì đi qua kênh presence riêng:
      10 triệu × 40 × 45 B  ≈  18 GB       ← rẻ hơn 10 lần

Tổng bộ nhớ pub/sub:  ~180 GB (đơn giản)  hoặc  ~20 GB (có presence riêng)
```

Với ~200 GB, **hai node Redis 100 GB là đủ về bộ nhớ**. Và đây là cú twist đẹp nhất của bài:

> ⚠️ **Bộ nhớ không phải nút thắt. CPU mới là.** Một node Redis đẩy được cỡ **100.000 thông điệp/giây** (pub/sub là single-threaded, mỗi lần publish phải lặp qua danh sách subscriber và ghi vào từng socket). Cần 13,4 triệu/giây → **~140 node**. Ta cần 140 máy không phải vì thiếu RAM (mỗi máy chỉ dùng ~1,5 GB trong số 100 GB), mà **vì thiếu lõi CPU**. Cụm Redis pub/sub của ta bị định cỡ bởi **thông lượng**, và nó sẽ trông cực kỳ "lãng phí RAM" với bất kỳ ai nhìn bảng monitor mà không hiểu vì sao.

Nhận ra và **nói ra** điều này trong phỏng vấn là một trong hai, ba khoảnh khắc ghi điểm mạnh nhất của bài.

### 2.5 Location cache — nhỏ đến bất ngờ

```
Mỗi bản ghi: user_id(8) + lat(8) + lng(8) + timestamp(8) = 32 B dữ liệu
Overhead Redis (key, hash entry, TTL, con trỏ)             ~100 B
→ ~130 B/user active

10 triệu user active × 130 B  ≈  1,3 GB
Kể cả đệm cho user "vừa offline chưa hết TTL" (×2)  ≈  3 GB
```

**Ba gigabyte.** Toàn bộ "vị trí hiện tại của mười triệu người" vừa vặn trong RAM của một cái laptop. Đây là lý do sâu xa khiến thiết kế này khả thi: **trạng thái nóng cực kỳ nhỏ**, chỉ có **tốc độ thay đổi** của nó là khổng lồ. Ta có thể shard vì thông lượng, không phải vì dung lượng.

### 2.6 Lịch sử vị trí — ngược lại, khổng lồ

```
334.000 bản ghi/giây × 40 B  ≈  13 MB/s
Mỗi ngày:   334k × 86.400 = 28,9 tỉ bản ghi  ≈  1,2 TB thô
Nhân hệ số nhân bản 3 (Cassandra RF=3)       ≈  3,5 TB/ngày
Mỗi năm                                       ≈  1,3 PB
```

Hơn một petabyte mỗi năm cho dữ liệu **không phục vụ tính năng chính**. Đây là lý do §7.3 sẽ tách hẳn nó ra khỏi đường nóng và đặt câu hỏi rất thẳng: *giữ đủ một năm có đáng không, hay lấy mẫu 1/10 là đủ cho ML?* (Giảm 10 lần → 130 TB/năm, và phần lớn giá trị phân tích vẫn còn.)

### 2.7 Kết nối — kích thước thật của flotilla

```
Mỗi kết nối: 2 socket buffer + trạng thái ứng dụng ≈ 10–40 KB
   (tuned kỹ ~10 KB; để mặc định Linux: 100+ KB)
→ một máy 64 GB chứa được 150–250k kết nối XÉT RIÊNG BỘ NHỚ

Nhưng xét theo thông điệp: 100k user/máy × 1,33 msg/s = 133k msg/s phải đẩy ra
→ CPU chặn trước bộ nhớ. Dự trù ~100.000 kết nối/máy
→ 100 máy + dự phòng N+2 + đệm cao điểm  ≈  150 server WebSocket
```

### 2.8 Bảng tổng kết — và câu kết luận rút ra

| Đại lượng | Con số | Dẫn tới quyết định |
|---|---:|---|
| Write QPS | 334k/s (đỉnh ~1M) | Không DB quan hệ trên đường nóng; state nóng nằm trong RAM |
| Fan-out nội bộ | **13,4 triệu msg/s** | Cần cụm pub/sub ~140 node; đây là nút thắt |
| Egress tới client | ~400k msg/s, 16 MB/s | Payload nhị phân, không JSON |
| Bộ nhớ pub/sub | ~180 GB | Chỉ 2 node về RAM — nhưng cần 140 node về CPU |
| Location cache | **3 GB** | Nhỏ tới mức có thể nhân bản thoải mái |
| Lịch sử vị trí | 1,3 PB/năm | Tách khỏi đường nóng, ghi qua queue, cân nhắc lấy mẫu |
| Kết nối đồng thời | 10 triệu | ~150 server stateful → §8, phần khó nhất về vận hành |

> 💡 **Câu kết luận của toàn bộ phần estimation** — và là câu nên nói thành lời trong phỏng vấn: *"Hệ này write-heavy gấp 300 lần một hệ CRUD thông thường, nhưng trạng thái nóng chỉ 3 GB. Dữ liệu thì bé, tốc độ thay đổi thì khổng lồ. Nên tôi sẽ không thiết kế một hệ lưu trữ — tôi sẽ thiết kế một **bus phát tán**, và đối xử với vị trí như **dòng sự kiện phù du (ephemeral stream)** chứ không phải như **bản ghi**."*

---

## 3. Vì sao bài này ngược hẳn Proximity Service

Đặt cạnh nhau thì mọi quyết định đều tự giải thích:

| | **Proximity Service** (sd-23) | **Nearby Friends** (bài này) |
|---|---|---|
| Dữ liệu | ~200 triệu địa điểm **tĩnh** | 10 triệu người **động** |
| Tần suất đổi | Vài nghìn/ngày | **334.000/giây** |
| Tỉ lệ đọc:ghi | ~10.000 : 1 | ~**1 : 40** (mỗi ghi sinh 40 lần đẩy) |
| Mô hình truy vấn | Client **hỏi**, server trả | Server **đẩy**, client chỉ nghe |
| Cấu trúc chủ đạo | **Geohash / quadtree / S2** index | **Pub/sub channel + bảng bạn bè** |
| Tập ứng viên | Mọi thứ trong ô không gian | Chỉ **bạn bè** — đã bị đồ thị xã hội chặn sẵn |
| Lưu trữ nóng | DB + cache đọc | Redis TTL, **không có DB** |
| Giao thức | HTTP request/response | **WebSocket** bền |
| Nút thắt | Thông lượng đọc, lệch hot cell | **CPU fan-out + số kết nối** |
| Nhất quán | Cache lệch vài phút cũng không sao | Trễ vài giây là hỏng trải nghiệm |

Điểm mấu chốt để hiểu **vì sao index không gian gần như biến mất** khỏi bài này:

```
Proximity:  "Ai/cái gì ở gần tôi?"  →  không gian ứng viên = TẤT CẢ 200 triệu
                                        →  BẮT BUỘC cắt nhỏ không gian bằng index

Nearby Friends: "Bạn bè nào ở gần tôi?" →  không gian ứng viên = 400 người
                                        →  đồ thị xã hội đã lọc giúp 99,9999% rồi
                                        →  vòng lặp 400 phép Haversine ~ vài chục µs
                                        →  index không gian là THỪA
```

> 💡 **Nguyên tắc sâu hơn một bài toán**: trước khi dựng một cấu trúc dữ liệu, hãy hỏi *"tập ứng viên của tôi thật sự lớn bao nhiêu?"*. Ở đây **đồ thị bạn bè chính là index** — nó thu hẹp không gian tìm kiếm mạnh hơn bất cứ quadtree nào. Đem geohash vào bài này (khi chỉ có bạn bè) là **giải sai bài**, và người phỏng vấn có kinh nghiệm sẽ nhận ra ngay. Geohash chỉ quay lại đúng lúc yêu cầu đổi thành *"cả người lạ"* — §11, và lúc đó nó lại là lựa chọn duy nhất đúng.

Nếu muốn ôn lại geohash/quadtree/S2, xem [sd-23 Proximity Service](./sd-23-proximity-service.md). Từ đây trở đi, ta nói về cái khác: **sự chuyển động**.

---

## 4. Giao thức: vì sao WebSocket, không phải HTTP polling

Đây là quyết định đầu tiên, và mọi thứ phía sau treo lên nó. Đừng chọn WebSocket vì "nó realtime" — hãy chọn bằng con số.

### 4.1 Bản chất của lưu lượng

```
Chiều LÊN  (client → server): đều đặn, 1 tin mỗi 30 giây, nhỏ (~40 B)
Chiều XUỐNG (server → client): KHÔNG đoán trước được, dồn cụm, trung bình
                                1,33 tin/giây nhưng có thể bùng khi đi vào
                                khu đông bạn bè
```

Chiều xuống **không đoán trước được** chính là lý do quyết định. Client không có cách nào biết khi nào nên hỏi.

### 4.2 So sánh sòng phẳng các phương án

| Phương án | Độ trễ | Overhead mỗi tin | Vấn đề chí mạng ở quy mô này |
|---|---|---|---|
| **Short polling** (hỏi mỗi 3 s) | 0–3 s | ~800 B header HTTP mỗi lần | 10M ÷ 3 = **3,3 triệu request/giây**, >95% trả về rỗng. Đánh thức radio điện thoại 20 lần/phút → **pin chết trong vài giờ** |
| **Long polling** | ~0 | ~800 B mỗi chu kỳ | Với 1,33 tin/giây thì mỗi kết nối bị đóng và mở lại **hơn một lần mỗi giây** → suy biến thành short polling nhưng tốn hơn. Hợp khi sự kiện *thưa*, ở đây thì *dày* |
| **SSE (Server-Sent Events)** | ~0 | ~10 B | Đúng cho chiều xuống, nhưng **một chiều**. Chiều lên vẫn phải POST 334k/s riêng → hai kết nối, hai mã nguồn, hai lần bắt tay TLS |
| **WebSocket** ✅ | ~0 | **2–6 B khung** | Một kết nối, hai chiều, bắt tay một lần rồi thôi. Đổi lại: **server có trạng thái (stateful)** → §8 |
| **MQTT** | ~0 | ~2 B | Cũng rất hợp (thiết kế cho thiết bị yếu pin, có QoS, có LWT báo mất kết nối). Nhược: cần broker riêng, hệ sinh thái web mỏng hơn. AWS IoT Core chính là cái này — xem phần *Liên hệ sang AWS* |
| **gRPC bidi streaming** | ~0 | ~5 B | Tốt cho server↔server; trên mobile/trình duyệt thì lôi thôi hơn WebSocket |
| **UDP/QUIC thuần** | Thấp nhất | Nhỏ nhất | Hấp dẫn về lý thuyết (mất gói vốn chấp nhận được!) nhưng NAT, tường lửa doanh nghiệp, và việc phải tự viết lại mọi thứ khiến nó không đáng — trừ khi bạn là Google |

### 4.3 Phép tính khiến polling chết ngay tại chỗ

```
SHORT POLLING mỗi 3 giây          WEBSOCKET
  3.300.000 req/s (gấp 10× ghi!)    bắt tay 1 lần duy nhất mỗi phiên
  2,6 GB/s chỉ riêng HTTP header    khung 2–6 B/tin, egress 16 MB/s
  >95% trả về "không có gì mới"     chỉ truyền khi có dữ liệu thật
  radio bật 20 lần/phút → chết pin  radio bật đúng lúc cần
                                    → rẻ hơn ~150 LẦN về băng thông
```

> 💡 **Cách phát biểu trong phỏng vấn**: *"Tôi chọn WebSocket vì chiều xuống vừa **không đoán trước được** vừa **dày** — đó chính xác là miền mà polling suy biến. Và tôi trả giá bằng thứ đắt nhất trong bài này: server trở thành stateful, nên deploy và autoscaling biến từ chuyện vặt thành một vấn đề thiết kế thật sự. Tôi sẽ nói kỹ chỗ đó."* Tự nêu cái giá trước khi bị hỏi, luôn luôn.

> ⚠️ Một hiểu lầm phổ biến: *"WebSocket miễn phí vì nó chỉ là TCP"*. Không. Mỗi kết nối rỗi vẫn tiêu bộ nhớ kernel, vẫn cần ping/pong giữ NAT (thường 30–60 s), vẫn chiếm một khe trong bảng kết nối của load balancer, và — quan trọng nhất — vẫn **trói một người dùng vào một máy cụ thể**. Cái giá không nằm ở byte, nó nằm ở **tính stateful**.

---

## 5. API design

Tách làm hai nhóm, vì chúng chạy trên hai loại server khác nhau và có hình dạng lưu lượng khác hẳn nhau.

### 5.1 Các routine trên WebSocket (đường nóng)

```
── CLIENT → SERVER ────────────────────────────────────────────────────
{"t":"init",   "lat":37.7749, "lng":-122.4194}
      # gửi ngay sau khi bắt tay xong. Server lấy danh sách bạn, subscribe
      # channel của họ, đọc vị trí từ cache, trả về seed ban đầu.

{"t":"loc",    "lat":37.7751, "lng":-122.4180, "ts":1757808000}
      # nhịp tim của hệ thống. 334.000 tin này mỗi giây.
      # KHÔNG có ack, KHÔNG có message_id, KHÔNG retry.

{"t":"sub",    "fid":"u_8812"}      # kết bạn mới → theo dõi thêm
{"t":"unsub",  "fid":"u_4410"}      # huỷ bạn / người đó tắt chia sẻ
{"t":"cfg",    "radius_m":8047, "ghost":false}

── SERVER → CLIENT ────────────────────────────────────────────────────
{"t":"seed",   "friends":[{"fid":"u_991","lat":..,"lng":..,"ts":..,"d_m":1320}, ...]}
      # trả lời "init". Đây là lời gọi ĐẮT NHẤT trong hệ thống — §10.2.

{"t":"loc",    "fid":"u_991", "lat":.., "lng":.., "ts":.., "d_m":1320}
      # bản tin chủ lực. Chỉ gửi khi d_m <= radius_m.

{"t":"gone",   "fid":"u_991", "why":"offline"|"out_of_range"|"ghost"}
      # nói rõ VÌ SAO biến mất, để UI không phải đoán.

{"t":"cadence","interval_s":60}
      # server ra lệnh cho client đổi nhịp gửi — §12.3. Rất quan trọng.

{"t":"bye",    "reconnect_after_ms":4200}
      # server sắp tắt (draining). Có kèm delay để chống thundering herd — §10.1.
```

Ba chi tiết nhỏ nhưng lộ ra toàn bộ triết lý thiết kế:

**Không có ack cho `loc`.** Đây là lựa chọn có chủ ý, dựa thẳng vào yêu cầu *"mất lác đác chấp nhận được"*. Thêm ack là nhân đôi số thông điệp (668k/s thay vì 334k/s) để bảo vệ một dữ liệu mà **30 giây nữa sẽ tự hết hạn**. Đây là ví dụ sạch nhất của nguyên tắc: **độ tin cậy chỉ nên mua khi nó đáng tiền**.

**`d_m` (khoảng cách) do server tính, không phải client.** Server đằng nào cũng phải tính để quyết định có gửi hay không — gửi kèm thì miễn phí, và quan trọng hơn, nó mở đường cho chế độ **chỉ gửi khoảng cách chứ không gửi toạ độ** (§12.2).

**`cadence` là lệnh từ server xuống client.** Nhìn thì lạ (thường client tự quyết), nhưng nó cho ta van điều tiết tải mạnh nhất trong toàn hệ thống: quá tải → bảo tất cả client giãn từ 30 s lên 60 s → **tải giảm một nửa tức thì**, không cần thêm một máy nào. Đây là backpressure ở tầng ứng dụng.

### 5.2 HTTP API (đường lạnh, server thường)

```
GET  /v1/friends/nearby?limit=20        # fallback khi WS không kết nối được
POST /v1/location/settings              # opt-in, ghost mode, danh sách loại trừ
GET  /v1/location/history?from=&to=     # lịch sử của CHÍNH mình
DELETE /v1/location/history             # quyền xoá — bắt buộc, §12.1
GET  /v1/ws/endpoint                    # trả về host WS gần nhất + token ngắn hạn
```

`GET /v1/ws/endpoint` nhỏ nhưng đáng giá: nó tách **việc chọn server** ra khỏi **việc kết nối**, cho phép hướng client tới vùng gần nhất, chặn client ở phiên bản quá cũ, và — lúc sự cố — chủ động phân tải lại đàn client thay vì để DNS quyết định.

---

## 6. High-level design

### 6.1 Kiến trúc tổng thể

```
                        ┌──────────────┐
    📱 điện thoại  ────►│ Load Balancer│  (L4/NLB cho WS, L7/ALB cho REST)
    (10 triệu cái)      └──────┬───────┘
                               │
            ┌──────────────────┼──────────────────────┐
            ▼                  ▼                      ▼
   ┌─────────────────┐  ┌──────────────┐   ┌────────────────────┐
   │ WebSocket       │  │ WebSocket    │   │ REST API servers   │
   │ server #1       │  │ server #150  │   │ (STATELESS, dễ     │
   │ (STATEFUL)      │  │              │   │  autoscale)        │
   │ ~100k kết nối   │  │              │   └─────────┬──────────┘
   └───┬──────┬──────┘  └──────────────┘             │
       │      │                                       ▼
       │      │                            ┌────────────────────┐
       │      │                            │ User / Friend DB   │
       │      │                            │ (shard theo user)  │
       │      │                            └────────────────────┘
       │      │
       │      └──────────────────────────┐
       ▼                                 ▼
┌──────────────────────┐      ┌────────────────────────────────┐
│ Location Cache       │      │  Redis Pub/Sub CLUSTER         │
│ Redis, TTL 10 phút   │      │  ~140 node                     │
│ key: loc:{user_id}   │      │  channel: loc:{user_id}        │
│ ~3 GB TỔNG           │      │  13,4 triệu msg/giây           │
└──────────────────────┘      └────────────┬───────────────────┘
                                            │ vị trí channel nào ở node nào?
                                            ▼
                              ┌────────────────────────────────┐
                              │ etcd / ZooKeeper               │
                              │ vòng consistent hashing        │
                              │ + danh sách node còn sống      │
                              └────────────────────────────────┘
       │
       │ (bất đồng bộ, KHÔNG chặn đường nóng)
       ▼
┌──────────────┐    ┌──────────────────┐    ┌────────────────────┐
│ Queue / Kafka│───►│ History consumer │───►│ Cassandra          │
│ (đệm ghi)    │    │ (ghi theo lô)    │    │ location_history   │
└──────────────┘    └──────────────────┘    │ ~1,3 PB/năm        │
                                             └────────────────────┘
```

### 6.2 Vai trò từng thành phần — và vì sao nó ở đó

| Thành phần | Việc của nó | Vì sao **phải** là một hộp riêng |
|---|---|---|
| **Load balancer** | Rải kết nối WS và request REST | WS cần **L4** (không cần đọc HTTP sau bắt tay) và **idle timeout rất dài**; REST cần L7. Hai chế độ khác nhau → thường là hai LB |
| **WebSocket server** | Giữ kết nối; nhận `loc`; tính khoảng cách; đẩy xuống client | **Stateful**. Là nơi duy nhất biết "ai đang nối vào máy nào". Mọi cái khó vận hành ở §8 đều nằm ở đây |
| **REST API server** | Bạn bè, hồ sơ, cài đặt, lịch sử | Stateless → autoscale tầm thường. Tách ra để **đợt tăng REST không bao giờ chạm vào đường nóng** |
| **Location cache (Redis + TTL)** | Vị trí *gần nhất* của user active | Thay cho DB. TTL biến "ai còn active" từ một trạng thái phải quản thành một **thuộc tính tự hết hạn** |
| **Redis Pub/Sub cluster** | Bus fan-out, channel theo `user_id` | Trái tim của bài. Nó là thứ biến 334k ghi thành 13,4 triệu lần đẩy |
| **etcd / ZooKeeper** | Danh sách node pub/sub còn sống + vòng hash | Không có nó, WS server không biết publish/subscribe vào đâu khi cụm co giãn |
| **User/Friend DB** | Đồ thị bạn bè | Đọc lúc `init`, hầu như không đụng trên đường nóng. Shard theo `user_id` |
| **Queue → Cassandra** | Lịch sử vị trí | Ghi-nặng, không cần đọc realtime → đúng tủ của Cassandra. Qua queue để **không bao giờ** làm chậm đường nóng |

> 💡 Để ý: **không có database nào trên đường nóng**. Cả vòng đời một bản cập nhật — từ lúc rời điện thoại tới lúc hiện trên máy bạn bè — chỉ chạm vào **bộ nhớ**. Không phải trùng hợp, đó là hệ quả trực tiếp của 334k QPS.

---

## 7. Luồng cập nhật vị trí — chi tiết từng bước

Đây là phần nên vẽ chậm và kỹ trong phỏng vấn, vì nó chứa toàn bộ ý tưởng của bài.

```
 Alice (đang đi bộ ở SF)                              Bob (bạn Alice, cách 1 km)
        │                                                        ▲
   ① {"t":"loc", lat, lng, ts}                                   │ ⑧
        ▼                                                        │
  ┌─────────────────────┐                          ┌──────────────────────────┐
  │ WS server A         │                          │ WS server B              │
  │ (giữ kết nối Alice) │                          │ (giữ kết nối Bob)        │
  └──────┬──────────────┘                          └──────────────▲───────────┘
         │                                                        │
   ② ghi cache: SET loc:alice "37.77,-122.41,t" EX 600            │ ⑦ tính d(Bob,Alice)
   ③ đẩy vào queue → Cassandra (bất đồng bộ, fire-and-forget)     │   1 km ≤ 8 km ✓
   ④ cập nhật bản sao in-memory của Alice trên server A           │
         │                                                        │
   ⑤ PUBLISH loc:alice {lat,lng,ts}                               │
         ▼                                                        │
  ┌────────────────────────────────────────────────────────────┐  │
  │            REDIS PUB/SUB   channel = loc:alice             │  │
  │  subscriber: mọi WS server đang giữ ÍT NHẤT MỘT bạn Alice  │──┘ ⑥
  └────────────────────────────────────────────────────────────┘
```

Từng bước, kèm lý do:

**① Client gửi `loc`** mỗi 30 giây — sớm hơn nếu đang di chuyển nhanh, muộn hơn nếu đứng yên (§12.3). Payload nhị phân, không chờ phản hồi.

**② Ghi location cache kèm TTL.** `SET loc:{uid} <payload> EX 600`. Một lệnh, O(1), không transaction. TTL **10 phút** chính là hiện thực hoá yêu cầu *"không hoạt động 10 phút thì biến mất"* — ta không cần job quét "ai đã offline", Redis tự quên giúp. **Trạng thái tự dọn dẹp là trạng thái không bao giờ rò rỉ.**

**③ Bắn vào queue để ghi lịch sử.** Fire-and-forget, có buffer cục bộ, mất thì thôi. Nếu bước này **chặn** thì Cassandra chậm một nhịp sẽ dội ngược lên toàn bộ đường nóng — chi tiết ở §7.3.

**④ Cập nhật bản sao in-memory trên chính server A.** Lưu trùng khi đã có cache để làm gì? Vì server A cũng giữ kết nối của **những người bạn khác** của Alice và sẽ cần vị trí Alice để tính khoảng cách cho họ. 10 triệu user × 40 bạn = 400 triệu lượt tra vị trí mỗi chu kỳ — giữ trong RAM tiến trình khiến gần như toàn bộ số đó không bao giờ đi ra mạng.

**⑤ `PUBLISH loc:alice`.** Alice publish vào **channel của chính mình**. Cô ấy không biết — và không cần biết — ai đang nghe.

**⑥ Redis phát tới mọi subscriber của `loc:alice`.** Subscriber là các **WS server**, không phải người dùng. Nếu 40 bạn online của Alice rải trên 150 server thì có ~40 server nhận (mỗi server chỉ subscribe một lần cho một channel dù nó giữ 5 người bạn của Alice) — chi tiết quan trọng ở §9.3.

**⑦ Server B tính khoảng cách** — vị trí Bob đã nằm sẵn trong RAM của nó, một phép Haversine cỡ **50 ns**. Trong bán kính → gửi; vừa vượt ra ngoài → gửi `gone{why:"out_of_range"}`.

**⑧ Bob thấy Alice nhích trên bản đồ**, tổng độ trễ thường **dưới 200 ms**.

> 💡 **Cái đẹp của luồng này**: người gửi hoàn toàn **không biết** ai là người nhận, còn việc lọc khoảng cách xảy ra **ở biên**, tại nơi vốn đã sẵn có dữ liệu cần thiết. Không có bước nào phải tra "bạn bè của Alice đang ở đâu" — thứ sẽ ngay lập tức biến thành 134 triệu lượt đọc mỗi giây.

### 7.1 Location cache: vì sao TTL thay cho DB

| Cách làm | Nó hỏng ở đâu |
|---|---|
| Ghi vị trí vào PostgreSQL | 334k UPDATE/giây lên cùng một tập hàng. Vacuum không đuổi kịp, WAL nổ, replica lag. Chết trong vài phút |
| Ghi vào DynamoDB/Cassandra rồi đọc lại | Có thể chịu được ghi, nhưng thêm 5–20 ms mỗi lượt và **tốn tiền theo từng ghi** — 28,9 tỉ ghi/ngày |
| Redis + TTL ✅ | O(1), dưới 1 ms, hết hạn tự động, tổng bộ nhớ 3 GB. Mất dữ liệu khi node chết — **và điều đó không sao**, 30 giây sau có bản mới |

Vì sao **TTL 10 phút** chứ không phải 30 giây (đúng bằng chu kỳ)? Vì ranh giới giữa *"mạng chập chờn"* và *"thật sự đã đi"* phải đủ rộng. Người dùng đi vào thang máy, mất sóng 90 giây rồi quay lại — nếu TTL là 30 s thì bạn bè thấy anh ta "biến mất rồi hiện lại" liên tục, và UI nhấp nháy như đèn disco. Mười phút biến trạng thái thành thứ **ổn định**. Timestamp gửi kèm cho phép UI tự nói "4 phút trước", nên dữ liệu cũ vẫn trung thực chứ không phải dối trá.

> ⚠️ **Bẫy khi triển khai**: đừng dùng sự kiện hết hạn của Redis (keyspace notification) làm cơ chế báo "user đã offline". Redis xoá key hết hạn theo kiểu **lười (lazy) + lấy mẫu ngẫu nhiên**, nên thông báo có thể tới muộn hàng phút và **không được đảm bảo** gửi tới. Hãy để người nhận tự suy luận từ `ts` — mô hình pull-based mềm mại này chịu lỗi tốt hơn nhiều so với việc phụ thuộc một sự kiện có thể không bao giờ tới.

### 7.2 Bản sao in-memory: hai tầng cache và lý do

```
Tầng 1 — RAM tiến trình WS server:
   HashMap<user_id, (lat, lng, ts)> cho ~100.000 user nối vào máy này
   + vị trí GẦN NHẤT của bạn bè họ mà máy đã nhận qua pub/sub
   → tra cứu ~50 ns, không qua mạng

Tầng 2 — Redis location cache (dùng chung):
   chỉ được đụng tới lúc `init` (seed), hoặc khi tầng 1 thiếu

→ Trên đường nóng ổn định, có thể KHÔNG hề chạm Redis cache lần nào
```

Đây là nơi tính stateful *trả công* cho ta: vì Bob luôn nối vào server B, server B giữ được toàn bộ ngữ cảnh của Bob trong RAM. Kiến trúc stateless sẽ cần một lượt tra ngoài cho mỗi bản tin — nhân 13,4 triệu/giây, đó là cả một cụm cache khổng lồ chỉ để bù cho việc "quên".

### 7.3 Lịch sử vị trí: ra khỏi đường nóng bằng mọi giá

```
❌ SAI:  WS server ──(ghi đồng bộ)──► Cassandra ──► rồi mới publish
          Cassandra GC 200 ms → 334k update/s dồn ứ → buffer đầy →
          rớt kết nối hàng loạt → thundering herd. Một sự cố kho lạnh
          vừa kéo sập tính năng realtime.

✅ ĐÚNG: WS server ──► buffer cục bộ (gộp lô 1 s) ──► Kafka/Kinesis
                                                      └► consumer ──► Cassandra
          Cassandra chết → queue phình → tính năng chính KHÔNG hề hấn gì.
```

Ba lý do kỹ thuật để chọn Cassandra (hoặc họ hàng LSM-tree) cho kho này:

1. **Ghi-nặng, tuần tự, không cần đọc lại ngay** — đúng mô tả của LSM-tree.
2. **Khoá phân mảnh tự nhiên**: `PARTITION KEY ((user_id, ngày)), CLUSTERING KEY (ts DESC)`. Ghép `ngày` vào khoá để **partition không phình vô hạn** — một user ghi cả năm thì partition thành 10 triệu dòng, Cassandra rất ghét chuyện đó.
3. **TTL sẵn có ở tầng cell**: đặt TTL 1 năm, dữ liệu tự rụng, đồng thời là cách rẻ nhất để tuân thủ chính sách lưu trữ.

Và một câu hỏi nên **chủ động nêu**: *có thật sự cần cả 28,9 tỉ điểm mỗi ngày không?* Với mục đích ML, lấy mẫu 1/10 hoặc chỉ ghi khi **di chuyển quá 50 m** giữ lại gần như toàn bộ tín hiệu mà giảm 10 lần chi phí. Nêu ra chuyện này cho thấy bạn phân biệt được *"lưu vì có ích"* và *"lưu vì lỡ tay"*.

### 7.4 Client initialization — đường đắt nhất trong hệ thống

```
Client mở app → bắt tay WS → gửi {"t":"init"}
  │
  ├─ ① lấy danh sách bạn (400 người)          ← DB hoặc cache friend-list
  ├─ ② lọc ra ai đang active                  ← MGET loc:{f} cho 400 khoá
  ├─ ③ SUBSCRIBE channel của những người đó   ← 40–400 lệnh subscribe
  ├─ ④ tính khoảng cách, lấy 20 người gần nhất
  └─ ⑤ gửi {"t":"seed", ...}
```

Chỉ một lần mỗi phiên, nhưng **đắt gấp hàng trăm lần** một bản tin `loc`. Nó là lý do vì sao **reconnect storm** (§10.1) mới là chế độ hỏng nguy hiểm nhất của cả bài: khi một server chết, 100.000 client không chỉ nối lại — chúng đồng loạt chạy **đường đắt nhất** cùng một lúc. 100.000 × 400 = **40 triệu lệnh subscribe** trong vài giây.

Cách giảm tải, theo thứ tự hiệu quả:

| Kỹ thuật | Giảm được gì |
|---|---|
| Cache friend-list trong Redis (`SMEMBERS friends:{uid}`, TTL 1 h) | Bỏ ① khỏi DB |
| Một `MGET` 400 khoá thay vì 400 `GET` | ② từ 400 RTT còn 1 |
| Chỉ subscribe bạn **đang active** (40 thay vì 400), presence đi kênh riêng | ③ giảm 10 lần, và giảm 10 lần bộ nhớ pub/sub (§2.4) |
| Gộp `SUBSCRIBE` theo lô, gom theo node đích | 40 lệnh → vài lệnh |
| Client giữ snapshot cũ, gửi `since_ts`, server chỉ trả phần khác | Payload seed nhỏ đi nhiều |
| **Ngẫu nhiên hoá thời điểm reconnect** (§10.1) | Trải đỉnh ra theo thời gian — hiệu quả nhất |

---

## 8. Deep dive 1 — Scale tầng WebSocket stateful

Đây là phần mà hầu hết ứng viên trượt, không phải vì thiếu kiến thức phân tán mà vì thiếu **kinh nghiệm vận hành**. Server stateless là chuyện đã giải xong từ lâu: thêm máy, bớt máy, deploy lúc nào cũng được. Server giữ 100.000 kết nối bền **phá vỡ mọi giả định** đó.

### 8.1 Vì sao stateful làm hỏng autoscaling

| Giả định của autoscaling stateless | Vì sao nó sai với WebSocket |
|---|---|
| "Thêm máy → tải giảm ngay" | **Sai.** Máy mới bắt đầu với **0 kết nối**. Kết nối cũ vẫn dính vào máy cũ cho tới khi client tự ngắt. Có thể cả tiếng sau máy mới vẫn rỗng còn máy cũ vẫn ngộp |
| "Bớt máy → chỉ việc tắt" | **Sai.** Tắt máy = ép 100.000 client nối lại đồng loạt = chạy đường đắt nhất (§7.4) cùng lúc |
| "CPU là chỉ báo tải" | **Sai.** CPU có thể 15% trong khi máy đã sắp cạn bộ nhớ hoặc file descriptor. Tải thật ≈ **số kết nối**, không phải CPU |
| "Health check HTTP là đủ" | **Sai.** Tiến trình còn trả 200 OK trong khi vòng lặp đẩy tin đã tắc và mọi client đang bị trễ 40 giây |

Ba hệ quả thiết kế rút ra:

**(1) Scale theo chỉ số đúng.** Chính sách autoscaling phải dựa trên **kết nối đang mở trên mỗi instance** (và phụ là msg/s ra, độ sâu hàng đợi gửi), không phải CPU. Ngưỡng nên ở khoảng 70% sức chứa để còn chỗ hấp thụ đàn client khi một máy khác chết.

**(2) Scale lên sớm, scale xuống cực chậm.** Bất đối xứng có chủ ý: thêm máy thì rẻ và vô hại, bớt máy thì gây một trận bão reconnect. Thực tế thường là *lên trong vài phút, xuống theo giờ*, và chỉ xuống vào lúc thấp điểm.

**(3) Đừng chờ kết nối tự tản đều — hãy ép nó.** Kỹ thuật hiệu quả nhất mà ít người biết: **giới hạn tuổi thọ kết nối**. Mỗi kết nối có hạn sống ngẫu nhiên **45–90 phút**; tới hạn server gửi `bye`, client nối lại (rất có thể vào máy khác). Lợi ích:

```
• Kết nối liên tục tự rải lại → máy mới đầy lên trong vài chục phút, không phải vài giờ
• Reconnect trở thành chuyện THƯỜNG NGÀY, được thử nghiệm mỗi giờ,
  thay vì một đường code chỉ chạy lúc sự cố (và luôn có bug)
• Deploy bớt đáng sợ: đằng nào một phần đàn client cũng đang xoay vòng
• Ngẫu nhiên hoá hạn sống → reconnect trải đều, không dồn cụm
```

> 💡 **Nguyên tắc**: với hệ thống stateful giữ kết nối lâu, hãy biến **việc mất kết nối thành trạng thái bình thường liên tục xảy ra**, thay vì một sự kiện hiếm. Đường code chạy mỗi phút thì đúng; đường code chạy mỗi quý thì hỏng.

### 8.2 Connection draining và graceful shutdown — làm cho đúng

Tắt một WS server đúng cách là một **vũ điệu nhiều bước**, không phải một lệnh `kill`:

```
GIAI ĐOẠN 0 — Announce  (t=0)
   • Đánh dấu instance là "draining" trong service discovery
   • Gỡ khỏi vòng quay của load balancer → KHÔNG nhận kết nối MỚI nữa
   • Kết nối đang có: giữ nguyên, phục vụ bình thường

GIAI ĐOẠN 1 — Bleed  (t = 0 … 10 phút)
   • Không làm gì cả. Kết nối tự rụng dần (đóng app, chuyển mạng, hết hạn tuổi thọ)
   • Thường rụng 30–60% trong 10 phút nếu có giới hạn tuổi thọ ở §8.1

GIAI ĐOẠN 2 — Nudge  (t = 10 … 25 phút)
   • Chủ động gửi {"t":"bye","reconnect_after_ms": jitter(0, 60_000)}
     cho từng NHÓM NHỎ, ví dụ 500 kết nối mỗi giây
   • jitter là bắt buộc — nó chính là thứ chống thundering herd
   • 100.000 kết nối ÷ 500/s ≈ 200 giây để đẩy hết, rất êm

GIAI ĐOẠN 3 — Cleanup
   • UNSUBSCRIBE mọi channel mà instance này đang nghe
     (nếu quên: Redis vẫn đẩy tin cho một socket đã chết → lãng phí + rò bộ nhớ)
   • Flush buffer lịch sử vị trí vào queue
   • Xoá đăng ký khỏi etcd

GIAI ĐOẠN 4 — Terminate  (t ≈ 30 phút)
   • SIGTERM → chờ hết grace period → SIGKILL
   • Nếu còn sót kết nối, chúng nhận RST và đi theo đường reconnect có backoff
```

> ⚠️ **Ba bẫy thực chiến, cái nào cũng từng gây sự cố thật:**
> 1. **Grace period của orchestrator quá ngắn.** Mặc định của ECS/Kubernetes thường 30 giây. Ta cần **30 phút** (`terminationGracePeriodSeconds`, `stopTimeout`). Quên chỉnh → mọi lần deploy là một trận bão reconnect.
> 2. **Không gửi `bye` mà chỉ đóng socket.** Client không biết phân biệt "server bảo đi chỗ khác" với "mạng rớt", nên nó nối lại **ngay lập tức** — và 100.000 client cùng làm thế. `bye` kèm delay ngẫu nhiên biến một cú sốc thành một dòng chảy.
> 3. **Quên UNSUBSCRIBE.** Redis vẫn serialize và đẩy tin cho subscriber đã chết cho tới khi TCP phát hiện đứt — có thể hàng phút. Ở 13,4 triệu msg/s, "hàng phút" là rất nhiều công vô ích.

### 8.3 Deploy: chuyện khó nhất của cả hệ thống

Deploy 150 máy giữ 10 triệu kết nối, làm ngây thơ là **10 triệu lượt reconnect** — chạy đường `init` đắt nhất mười triệu lần trong vài phút.

| Chiến lược | Cách làm | Đánh giá |
|---|---|---|
| **Rolling chậm** ✅ | Mỗi lần 1–2 máy, drain 30 phút mỗi máy | 150 máy × ~10 phút hiệu dụng ≈ **cả ngày** cho một lần deploy. Nghe kinh khủng, nhưng là chuẩn ngành cho tầng kết nối bền |
| **Deploy lúc thấp điểm** ✅ | 3–5 giờ sáng theo múi giờ đang phục vụ | Ít kết nối hơn 3–5 lần → rẻ hơn đúng chừng đó lần |
| **Blue/green** ❌ | Dựng cụm mới, chuyển hết sang | Chuyển hết = reconnect 100%, tệ nhất trong các cách. Chỉ dùng khi buộc phải đổi giao thức |
| **Tách tầng kết nối / tầng logic** ✅✅ | Một tiến trình mỏng *chỉ* giữ socket (gần như không bao giờ đổi), logic nằm ở tiến trình sau nó | Deploy logic **không đụng tới kết nối** — nghiệp vụ đổi hằng tuần, tầng socket đổi hằng quý. Đây là cách các hệ thống trưởng thành làm |
| **Hot reload / code swap** ⚠️ | Nạp code mới trong tiến trình đang chạy (Erlang làm được thật) | Rất mạnh, nhưng chỉ khả thi trên nền tảng hỗ trợ sẵn |

> 💡 Chi tiết *tách tầng kết nối khỏi tầng logic* đáng nói ra trong phỏng vấn, vì nó chứng tỏ bạn từng sống với một hệ như thế: *"Tôi sẽ để tầng giữ socket mỏng và gần như bất biến, đẩy mọi logic hay đổi xuống một tầng stateless phía sau. Như vậy nhịp deploy hằng tuần không bao giờ chạm vào 10 triệu kết nối."*

### 8.4 Service discovery: etcd / ZooKeeper để làm gì

Hai câu hỏi mà hệ thống phải trả lời liên tục, và cả hai đều cần một nguồn sự thật chung:

```
1. "Channel loc:u_8812 nằm ở node Redis nào?"        ← để publish/subscribe đúng chỗ
2. "Những node pub/sub nào đang còn sống?"           ← để né node chết, để rebalance
```

Nội dung lưu trong etcd rất nhỏ, chỉ là **vòng consistent hashing** (xem [sd-09](./sd-09-consistent-hashing.md)) cộng danh sách node:

```
/pubsub/ring/epoch          = 47
/pubsub/nodes/node-012      = {host, port, slots:[1024..2047], state:"live"}
/pubsub/nodes/node-013      = {..., state:"draining"}
```

Mỗi WS server **cache vòng này trong RAM** và **watch** thay đổi; tra channel → node là phép hash cục bộ, **không có lời gọi mạng nào trên đường nóng**. etcd chỉ bị đụng tới khi topology đổi — vài lần một ngày.

| Vì sao etcd/ZooKeeper chứ không phải cách khác | |
|---|---|
| Cấu hình tĩnh trong file | Không phản ứng được khi node chết; sửa cấu hình phải deploy lại 150 máy |
| DNS | TTL làm trễ, không có ngữ nghĩa "còn sống" (liveness), không watch được |
| Tự viết bằng Redis | Ai giữ trạng thái của cái giữ trạng thái? Vòng luẩn quẩn |
| **etcd/ZooKeeper** ✅ | Watch, lease/ephemeral node, nhất quán mạnh, số lần ghi nhỏ. Đúng công cụ cho **metadata hiếm khi đổi nhưng phải đúng tuyệt đối** |

> ⚠️ **Đừng bắt etcd chịu tải đường nóng.** etcd đồng thuận bằng Raft; nó xử lý được cỡ vài nghìn ghi/giây, không phải 334k. Nó lưu **ai ở đâu**, tuyệt đối không lưu **cái gì đang xảy ra**. Nhầm vai trò này là một trong những cách chắc chắn nhất để sập cả cụm.

### 8.5 Đo lường: chỉ số nào nói lên sức khoẻ

| Chỉ số | Vì sao quan trọng hơn CPU |
|---|---|
| **Kết nối / instance** | Chỉ báo tải thật. Cơ sở để autoscale |
| **Độ sâu hàng đợi gửi (send queue)** | Cảnh báo sớm nhất. Queue phình = ta đang tạo tin nhanh hơn đẩy đi được |
| **Tuổi của bản tin khi tới client** (p50/p99) | Chỉ số **trải nghiệm** thật sự. "Realtime" là lời hứa về con số này |
| **Tỉ lệ reconnect/giây** | Đột biến = có máy vừa chết, hoặc một mạng di động vừa có sự cố |
| **Subscribe/giây** | Chỉ báo trực tiếp của reconnect storm (§10.1) |
| **Tin bị rớt / bị hợp nhất** | Ta *cho phép* rớt — nhưng phải biết mình đang rớt bao nhiêu |
| CPU | Hữu ích, nhưng là chỉ báo **thứ cấp** ở tầng này |

---

## 9. Deep dive 2 — Pub/Sub một channel cho mỗi user

### 9.1 Vì sao chia channel theo user là thiết kế đúng

Có ba cách phân phối tự nhiên. Đặt cạnh nhau thì lựa chọn gần như tự hiện ra:

| Cách | Cơ chế | Ưu | Nhược chí mạng |
|---|---|---|---|
| **Fan-out trực tiếp giữa các server** | Server A tra xem 40 bạn của Alice nằm ở server nào, gửi thẳng | Không cần hạ tầng trung gian | Server A phải **biết topology của mọi kết nối** → cần một registry toàn cục cập nhật 334k lần/giây. Đồ thị kết nối N×N, 150 máy = 22.350 liên kết phải tự quản. Một máy chết là mọi máy phải cập nhật |
| **Channel theo geohash** | Publish vào ô không gian, ai ở ô đó thì nghe | Hợp với **người lạ**; số channel cố định | Ô Manhattan giờ tan tầm = **hot channel** kinh hoàng; người nhận phải tự lọc bạn/không-bạn trong hàng nghìn tin rác; người đứng ở ranh giới ô phải nghe 4–9 ô |
| **Channel theo user** ✅ | Mỗi user một channel; ai quan tâm thì subscribe | Người gửi **không cần biết gì** về người nhận; định tuyến trở thành phép hash thuần; tự nhiên song song hoá; hoàn toàn không có hot channel (mỗi channel đúng 1 người publish, đúng 1 tin mỗi 30 s) | Số channel rất lớn (100 triệu) — nhưng §2.4 cho thấy chi phí chấp nhận được |

Lý do sâu nhất đáng phát biểu thành một câu: **channel theo user làm cho việc định tuyến trùng khớp chính xác với đồ thị quan tâm**. Bạn subscribe đúng những người bạn quan tâm, không hơn một ai. Không có tin thừa nào phải lọc bỏ, không có điểm nóng nào, và người publish được giải thoát hoàn toàn khỏi việc biết ai đang nghe.

Còn một tính chất mà bảng trên chưa nêu: **mỗi channel có đúng một người viết**. Không tranh chấp, không cần thứ tự giữa nhiều nguồn, và tốc độ ghi trên mỗi channel bị chặn cứng ở 1 tin/30 giây. Đây là kiểu phân mảnh (partitioning) mà bạn hiếm khi gặp được — **phân bố đều một cách hoàn hảo theo định nghĩa**, vì nó chia theo chính con người.

### 9.2 Chi phí bộ nhớ, và chi tiết cứu cả thiết kế

Phản bác đầu tiên người phỏng vấn sẽ đưa ra: *"100 triệu channel? Chắc chắn nổ RAM."* Số đã tính ở §2.4: **~20–180 GB**, hai node Redis 100 GB là đủ về bộ nhớ. Lý do là chi tiết cứu cả thiết kế — **Redis không cấp phát gì cho channel không có subscriber**; 90 triệu user offline chiếm đúng 0 byte.

Hệ quả vận hành tinh tế hơn: vì channel **miễn phí khi rỗng**, ta có thể coi như đã **cấp phát sẵn channel cho cả 100 triệu user** ngay từ đầu. Không có bước "tạo channel", không phải thông báo cho các server rằng có channel mới, không có tình trạng chạy đua khi ai đó vừa lên mạng. `PUBLISH` vào channel không ai nghe chỉ trả về 0 và không làm gì. **Sự vắng mặt của cả một giai đoạn vòng đời** chính là món quà lớn nhất của cách chia này.

### 9.3 Fan-out thật sự là bao nhiêu — một chi tiết hay bị tính sai

```
Alice publish 1 tin. Bao nhiêu lần Redis phải ghi ra socket?

Câu trả lời NGÂY THƠ: 40 (số bạn online)
Câu trả lời ĐÚNG:    = số WS SERVER đang subscribe loc:alice
                     = min(40 bạn, 150 server) ≈ 40 trong trường hợp rải đều

Vì sao lại là server chứ không phải người: một WS server giữ 5 người bạn
của Alice chỉ SUBSCRIBE loc:alice MỘT lần, rồi tự nhân bản trong bộ nhớ
cho cả 5 kết nối. Việc nhân bản nội bộ rẻ hơn nhiều so với gửi qua mạng.
```

Hệ quả phản trực giác đáng nói ra: **càng ít WS server thì fan-out qua Redis càng nhỏ**, vì bạn bè dồn về ít máy hơn. Nếu chủ động **gom bạn bè về cùng server** — ví dụ định tuyến theo vùng địa lý, mà người ở gần nhau về mặt vật lý cũng hay là bạn nhau — fan-out qua mạng giảm đáng kể. Nêu được hướng này là đủ ghi điểm.

### 9.4 Scale cụm pub/sub: vì sao 140 node

```
Thông lượng cần:        13,4 triệu msg/giây (đỉnh 30–40 triệu)
Một node Redis đẩy được: ~100.000 msg/giây
  (pub/sub là single-threaded: mỗi PUBLISH phải duyệt danh sách
   subscriber và ghi vào từng socket — chi phí tuyến tính theo fan-out)

→ 13,4 triệu / 100.000  ≈  134 node   → làm tròn 140
→ có dự phòng cho đỉnh   →  ~200 node
```

Và điểm cần nhấn mạnh lần nữa vì nó rất dễ bị hiểu sai khi nhìn dashboard:

> 💡 **Ta mua 140 máy vì CPU, không vì RAM.** Mỗi node chỉ dùng ~1,5 GB trong khi có thể có 16–64 GB. Bất kỳ ai nhìn biểu đồ "memory utilization 3%" cũng sẽ đòi cắt giảm cụm. Hãy viết lý do này vào runbook, và hãy để **msg/s** là chỉ số hiển thị chính chứ không phải bộ nhớ. Đây cũng là lý do nên chọn instance **nhiều lõi nhỏ / nhiều node nhỏ** thay vì ít máy RAM lớn — ngược hoàn toàn với trực giác "Redis thì mua máy nhiều RAM".

### 9.5 Phân bố channel bằng consistent hashing

```
node = ring.lookup( hash("loc:" + user_id) )

• Thêm/bớt node chỉ di chuyển K/N channel, không phải toàn bộ
• Vòng hash sống trong etcd, WS server cache lại trong RAM
• Dùng virtual node (150–200 điểm ảo/node thật) để san bằng lệch
```

Khi cụm co giãn, tin bị mất trong khoảng vài trăm mili-giây lúc chuyển giao — **và điều đó chấp nhận được** theo đúng yêu cầu phi chức năng. Nhưng vẫn nên giảm thiểu:

| Rủi ro khi rebalance | Cách giảm nhẹ |
|---|---|
| **Bão resubscribe**: channel chuyển node → mọi WS server phải subscribe lại | Chuyển từng nhóm nhỏ (vài % số slot mỗi lần); thêm jitter; gộp lệnh theo lô |
| Tin rơi trong lúc chuyển | Cho subscribe **chồng lấn**: subscribe node mới *trước*, bỏ node cũ *sau* vài giây. Trùng tin thì client tự khử bằng `ts` |
| Co giãn giữa giờ cao điểm | Job định kỳ theo **lịch dự báo tải** (co giãn lúc 4 giờ sáng), không phải phản ứng tức thời. Cộng thêm cấp dư 30% |
| Vòng hash lệch phiên bản giữa các server | Gắn `epoch` vào vòng; server thấy epoch cũ thì nạp lại trước khi publish |

### 9.6 "Hot channel" — và vì sao bài này gần như miễn nhiễm

Trong hầu hết hệ pub/sub, hot channel là nỗi ám ảnh. Ở đây, cấu trúc **theo user** đã dập tắt phần lớn:

```
Mỗi channel:  đúng 1 người publish, tần suất bị chặn cứng 1 tin/30 s
              → không channel nào có thể trở thành hot về mặt GHI
```

Chỉ còn một dạng lệch: **người có quá nhiều bạn** (whale). Một người 5.000 bạn với 500 người online tạo ra fan-out gấp 12 lần bình thường.

| Cách xử | Đánh giá |
|---|---|
| **Đặt trần số bạn** (Facebook: 5.000) ✅ | Đơn giản nhất, chặn cứng trường hợp xấu nhất. Thường đã có sẵn trong app mẹ |
| Phân biệt "bạn" với "người theo dõi": chỉ bạn hai chiều mới thấy vị trí ✅ | Vừa đúng về sản phẩm, vừa chặn tự nhiên fan-out. Người nổi tiếng không nên phát vị trí cho 10 triệu follower — đó là **rủi ro an toàn thân thể**, không chỉ là vấn đề kỹ thuật |
| Dành node riêng cho whale | Phức tạp, hiếm khi đáng |
| Giãn nhịp cập nhật cho whale (60 s thay vì 30 s) ✅ | Rẻ và hiệu quả. Dùng luôn kênh `cadence` sẵn có |

> 💡 Điểm đáng nói: **trần 5.000 bạn không phải giới hạn kỹ thuật tuỳ tiện — nó là thứ chặn đuôi phân bố (tail) cho cả hệ thống.** Nhiều giới hạn sản phẩm trông có vẻ độc đoán thật ra là quyết định kiến trúc được ngụy trang.

---

## 10. Bottleneck & failure mode

### 10.1 Chế độ hỏng nguy hiểm nhất: reconnect storm

```
Một WS server chết đột ngột (kernel panic, mất AZ, OOM kill)
   │
   ▼  100.000 client phát hiện đứt sau 5–30 giây
Tất cả nối lại NGAY LẬP TỨC, cùng lúc
   │
   ▼  mỗi client chạy đường `init` — đắt nhất hệ thống (§7.4)
100.000 × (1 lần lấy friend-list + 1 MGET 400 khoá + ~40 SUBSCRIBE)
   = 40 triệu lệnh subscribe trong vài giây
   │
   ▼  cụm Redis pub/sub ngộp → chậm cho TẤT CẢ
Các server khác trễ theo → client của họ tưởng đứt → cũng nối lại
   │
   ▼  ☠️  SỤP ĐỔ DÂY CHUYỀN (cascading failure)
```

Đây là ví dụ sách giáo khoa của **thundering herd**: một sự cố cục bộ (1/150 công suất) biến thành sự cố toàn cục, và **hồi phục lại chính là thứ giết hệ thống**. Phòng thủ phải xếp nhiều lớp:

| Lớp | Biện pháp | Vì sao cần |
|---|---|---|
| Client | **Exponential backoff + full jitter**: `sleep = random(0, min(60s, 2^n))` | Bắt buộc. Backoff **không có jitter** vẫn đồng bộ cả đàn — jitter mới là phần quan trọng, không phải backoff |
| Client | Chờ ngẫu nhiên 0–30 s **ngay lần thử đầu** | Khác với retry thông thường: ở đây ngay cú đầu tiên đã là 100.000 client cùng lúc |
| Client | Server gửi `bye` kèm `reconnect_after_ms` đã jitter | Khi ta chủ động tắt máy, ta **điều khiển được** nhịp quay lại |
| Client | Giảm cấp mềm: WS hỏng → HTTP polling 60 s | Người dùng thấy tính năng "chậm", không thấy "hỏng" |
| Server | **Admission control**: mỗi instance chỉ chấp nhận N `init`/giây, vượt thì trả `bye` kèm delay | Van an toàn cuối. Thà từ chối lịch sự còn hơn chết cả cụm |
| Server | Cache friend-list; gộp `MGET`/`SUBSCRIBE` theo lô | Giảm chi phí mỗi lần init xuống mức chịu được |
| Hạ tầng | LB **slow start**; cấp dư 30%; rải instance qua nhiều AZ | Đàn client 100.000 phải có chỗ để hạ cánh |
| Hạ tầng | **Circuit breaker** trước Redis + tách nhóm (bulkhead) theo shard | Ngăn một shard ngộp kéo theo toàn bộ |

> ⚠️ **Nghịch lý phải nói thành lời**: giết một máy chỉ mất 0,7% công suất — nhưng **đàn client quay lại** mới là thứ có thể giết 100%. Với hệ giữ kết nối bền, **đường hồi phục nguy hiểm hơn đường hỏng**. Vì vậy nó phải được diễn tập thường xuyên (§8.1: giới hạn tuổi thọ kết nối chính là bài diễn tập tự động chạy mỗi giờ).

### 10.2 Bảng các chế độ hỏng còn lại

| Hỏng cái gì | Ảnh hưởng ngay | Xử lý | Suy giảm |
|---|---|---|---|
| **1 WS server** | 100k user mất realtime 5–30 s | Client reconnect có jitter → máy khác | Mềm, cục bộ |
| **1 node pub/sub** | Các channel trên node đó ngưng phát tán | etcd báo chết → vòng hash loại node → resubscribe | Bạn bè "đứng hình" tới khi resubscribe xong |
| **Cả cụm pub/sub** | Không ai thấy ai di chuyển | Hạ cấp: WS server **poll** location cache mỗi 30 s cho bạn bè của mình | Vẫn dùng được nhưng trễ hơn, tải cache tăng vọt |
| **Location cache** | `init` không seed được | Tính năng vẫn chạy từ lúc kết nối: tin realtime vẫn tới, chỉ thiếu trạng thái ban đầu | Bản đồ trống rồi đầy dần trong 30 s |
| **Cassandra / queue** | Mất lịch sử | Queue đệm; quá hạn thì **bỏ** | **Không ảnh hưởng** tính năng chính — đúng như thiết kế |
| **Friend DB** | Không init được user mới | Cache friend-list che phần lớn | Người đang online không bị gì |
| **etcd** | Không rebalance được | Vòng hash đã cache trong RAM → chạy tiếp bình thường | **Đóng băng chứ không sập** — nếu thiết kế đúng |
| **Mất cả một AZ** | ~33% kết nối đứt | Đây là reconnect storm cỡ lớn: 3,3 triệu client | Đường duy nhất sống sót: jitter + admission control + cấp dư |

### 10.3 Thứ tự nghẽn — cái gì gãy trước

```
1. CPU cụm Redis pub/sub      ← nghẽn ĐẦU TIÊN, ở ~13,4 triệu msg/s
2. Số kết nối / WS server     ← bộ nhớ và fd, ~100–200k mỗi máy
3. Đường init lúc reconnect   ← không nghẽn khi ổn định, nhưng chết lúc khủng hoảng
4. Egress băng thông          ← chuyện tiền bạc trước khi thành chuyện kỹ thuật
5. Thông lượng ghi Cassandra  ← có queue che, nghẽn muộn nhất
6. Location cache             ← gần như không bao giờ nghẽn (chỉ 3 GB)
```

Nói được đúng **thứ tự** này quan trọng hơn nói được từng con số, vì nó chứng tỏ bạn có mô hình tinh thần về hệ thống chứ không chỉ có một danh sách thành phần.

---

## 11. Các thiết kế thay thế

### 11.1 Pub/sub theo ô geohash — và khi nào nó mới đúng

Đảo ngược trục phân phối: thay vì channel theo *người*, channel theo *ô không gian*.

```
Channel = geo:{geohash_prefix}       ví dụ  geo:9q8yy  (~1,2 km × 0,6 km)

Publish:   user publish vào channel của Ô MÌNH ĐANG ĐỨNG
Subscribe: user subscribe ô mình đang đứng + 8 ô kề (để không bị mù ở ranh giới)
Khi đi qua ranh giới: unsubscribe ô cũ, subscribe ô mới
```

| | Channel theo **user** (chọn) | Channel theo **geohash** |
|---|---|---|
| Trả lời được câu hỏi | "Bạn bè nào ở gần?" | "**Ai** ở gần?" — kể cả người lạ |
| Số channel | 100 triệu (rỗng thì miễn phí) | ~vài triệu ô, cố định |
| Phân bố tải | **Hoàn hảo** — 1 người viết/channel | **Rất lệch** — ô Times Square vs ô sa mạc |
| Tin thừa phải lọc | Không có | **Rất nhiều**: nhận mọi người trong ô rồi mới lọc bạn bè |
| Khi di chuyển | Không đổi gì | Phải re-subscribe mỗi lần qua ranh giới ô |
| Kích thước ô | — | Bài toán không có lời giải đẹp: ô to → hot; ô nhỏ → phải nghe quá nhiều ô |
| Hợp với | **Nearby Friends** | **"Người lạ gần đây"**, game theo vị trí, điều phối xe |

Vì sao geohash **sai** cho bài này: bạn bè của bạn rải khắp thế giới; bạn *không* quan tâm tới 5.000 người lạ trong ô Manhattan. Đăng ký theo ô buộc bạn nhận hết rồi lọc — đúng thứ mà pub/sub sinh ra để tránh. Còn tệ hơn: hot channel quay lại đầy đủ, vì mật độ người là thứ **lệch cực kỳ nặng**.

Vì sao geohash **đúng** khi thêm tính năng "người lạ gần đây": lúc đó bạn **không có đồ thị bạn bè để lọc trước**, nên không thể biết trước ai quan tâm tới ai. Không gian trở lại làm trục phân phối duy nhất khả dĩ. Xử hot cell bằng đúng các kỹ thuật ở [sd-23](./sd-23-proximity-service.md): ô có độ sâu thích ứng (quadtree), lấy mẫu thưa trong ô đông, hoặc chặn trần số người phát ra từ mỗi ô.

Kiến trúc thực tế nếu cần cả hai: **chạy song song hai bus** — channel-theo-user cho bạn bè (chính xác, không rác) và channel-theo-geohash cho người lạ (lấy mẫu, độ chính xác thấp, có thể giãn nhịp mạnh). Chúng có yêu cầu chất lượng khác nhau, nên trộn chung là ép cả hai chịu ràng buộc của cái khắt khe hơn.

### 11.2 Erlang / mô hình actor phân tán

Thay vì Redis + WS server, dùng nền tảng mà **mỗi user online là một tiến trình nhẹ** (~2 KB, hàng triệu cái trên một máy): process đó giữ kết nối, giữ vị trí, giữ danh sách bạn; cập nhật vị trí là gửi message thẳng tới process của từng người bạn, còn việc định tuyến trong máy hay xuyên máy do chính runtime lo, trong suốt với code.

| Ưu | Nhược |
|---|---|
| Bỏ được **cả một tầng hạ tầng** (Redis pub/sub) — bớt 140 máy phải vận hành | Erlang/Elixir là ngách; tuyển người khó, thư viện mỏng |
| Mô hình lập trình khớp bài toán gần như hoàn hảo (một actor = một người) | Vẫn phải tự giải bài phân bố process xuyên cụm và cây giám sát khi máy chết |
| Có **hot code swap** — deploy không rớt kết nối (giải được §8.3) | Kết nối giữa các node Erlang là mesh đầy đủ → mở rộng rất khó quá ~100 node, phải chia cluster |
| Cơ chế giám sát (supervisor) + cách ly lỗi từng process rất mạnh | Khó chẩn đoán nếu đội chưa quen; hệ sinh thái quan sát (observability) yếu hơn |

Đây không phải lựa chọn viển vông: **WhatsApp giữ hơn 2 triệu kết nối trên một máy Erlang**, và Discord dùng Elixir cho chính tầng fan-out kiểu này. Cách nói khôn ngoan trong phỏng vấn: *"Mô hình actor khớp bài toán đẹp hơn hẳn, và nếu tôi đang xây từ đầu với một đội biết BEAM thì tôi sẽ chọn nó. Nhưng trong một tổ chức lớn đã chuẩn hoá quanh JVM/Go và Redis, tôi chọn Redis pub/sub — quyết định ở đây là **vận hành được**, không phải **thanh lịch nhất**."*

### 11.3 Vài biến thể khác, ngắn gọn

| Thay thế | Khi nào hợp |
|---|---|
| **Kafka thay Redis pub/sub** | Khi cần **bền vững + phát lại (replay)**. Nhưng 100 triệu topic là bất khả thi (Kafka đắt theo từng partition) → phải gom nhiều user vào một partition → người nhận lại phải lọc. Kafka đúng cho *lịch sử*, sai cho *fan-out theo người* |
| **MQTT broker (EMQX, HiveMQ)** | Rất hợp: sinh ra cho thiết bị yếu pin, topic rẻ, có QoS và "last will". Đổi WebSocket lấy MQTT-over-WSS gần như không mất gì |
| **Phân vùng theo địa lý (cell/region)** | Cụm độc lập theo vùng, chỉ bắc cầu cho cặp bạn bè xuyên vùng — giảm cả độ trễ lẫn bán kính vụ nổ, đổi lấy phức tạp khi người dùng đi du lịch |

---

## 12. Quyền riêng tư, pin và hành vi client

### 12.1 Quyền riêng tư không phải mục "làm thêm nếu kịp"

Đây là bài duy nhất trong cả loạt case study mà **thiết kế sai gây nguy hiểm thân thể thật**. Chia sẻ vị trí liên tục là công cụ theo dõi lý tưởng cho kẻ bạo hành, kẻ rình rập, và cho cả sự tò mò không lành mạnh. Ba trường hợp thật đã xảy ra trong ngành: Strava lộ vị trí căn cứ quân sự qua bản đồ nhiệt; nhiều app hẹn hò bị **trilateration** để suy ra toạ độ chính xác từ trường khoảng cách; và các vụ theo dõi bạn đời qua tính năng chia sẻ vị trí "vô hại".

| Yêu cầu | Cách hiện thực | Vì sao bắt buộc |
|---|---|---|
| **Opt-in, không phải opt-out** | Mặc định TẮT. Bật phải là hành động chủ động | Không ai được bị theo dõi vì không đọc changelog |
| **Chia sẻ hai chiều, theo từng người** | Chia sẻ với A không có nghĩa chia sẻ với B. "Thấy tôi" và "tôi thấy bạn" là hai công tắc riêng | Quyền riêng tư là **quan hệ**, không phải một công tắc toàn cục |
| **Ghost mode** | Tắt tức thì: ngừng publish, xoá khỏi cache (`DEL loc:{uid}`), bạn bè nhận `gone{why:"ghost"}` | Phải có hiệu lực **trong vài giây**, không phải sau TTL 10 phút |
| **Ghost mode không được lộ ra** | Với bạn bè, "ghost" phải **không phân biệt được** với "offline" | Nếu phân biệt được, kẻ rình biết bạn đang trốn hắn — đúng thứ ta muốn ngăn |
| **Chia sẻ có hạn định** | "Chia sẻ 1 giờ" rồi tự tắt | Chống *rò rỉ vì lãng quên* — kiểu rò phổ biến nhất |
| **Làm mờ vị trí** | Xem §12.2 | Chống trilateration |
| **Xoá lịch sử** | `DELETE /v1/location/history` xoá thật, lan tới mọi bản sao và backup | Vừa là nghĩa vụ pháp lý (GDPR/CCPA) vừa là đạo đức tối thiểu |
| **Nhật ký truy cập** | Ghi lại mọi lượt truy cập vị trí của user, kể cả từ nội bộ | Kẻ rình đôi khi là nhân viên. Netflix/Uber đều từng có bê bối kiểu này |
| **Giới hạn lưu trữ** | TTL 1 năm, cộng lấy mẫu thưa dần | Dữ liệu không tồn tại là dữ liệu không thể bị đánh cắp hay bị trát toà đòi |

### 12.2 Làm mờ vị trí và cuộc tấn công trilateration

```
❌ NGÂY THƠ: gửi khoảng cách chính xác tới mét
   Kẻ tấn công tạo 3 tài khoản giả, đặt ở 3 điểm đã biết,
   đọc 3 khoảng cách → GIẢI HỆ PHƯƠNG TRÌNH → ra toạ độ chính xác.
   Đây là lỗ hổng đã xảy ra thật ở nhiều app hẹn hò.

✅ ĐÚNG: làm tròn TRƯỚC KHI tính, và làm tròn ỔN ĐỊNH
   1. Bám lưới (grid snapping): quy vị trí về ô ~100 m, KHÔNG ĐỔI
      khi người dùng còn trong ô. Nhiễu ngẫu nhiên mỗi lần gửi thì
      lấy trung bình nhiều mẫu là khử được nhiễu — bám lưới thì không.
   2. Tính khoảng cách trên toạ độ ĐÃ bám lưới
   3. Trả về KHOẢNG: "<100 m", "~500 m", "1–2 km", "gần 5 km"
   4. Chỉ gửi toạ độ thật khi cả hai bên cùng bật chế độ chính xác cao
      (ví dụ đang hẹn gặp nhau), và có hạn định thời gian
```

> ⚠️ **Nguyên tắc chống trilateration**: tấn công nhắm vào **độ chính xác**, không nhắm vào toạ độ. Nếu output của bạn là một con số đủ mịn và thay đổi trơn theo vị trí thật, thì ba phép đo là đủ để đảo ngược. Cách chữa là làm cho output **rời rạc và ổn định** — rời rạc để mất thông tin, ổn định để không lấy trung bình khử được.

### 12.3 Pin điện thoại và nhịp cập nhật thích ứng

Pin là ràng buộc *sản phẩm* dễ giết tính năng nhất: cái gì ngốn 20% pin mỗi ngày sẽ bị tắt, và mọi công sức kỹ thuật thành vô nghĩa. Xếp theo mức tốn: **bật chip GPS** (~50–100 mA) ≫ **đánh thức radio** (đắt ở lúc bật, không ở lúc truyền) > đánh thức CPU ≫ *số byte truyền đi* (rẻ nhất — đừng tối ưu chỗ này trước). Vì vậy **nhịp cố định 30 giây là sai** trừ khi đang di chuyển:

| Tín hiệu | Nhịp | Lý do |
|---|---|---|
| Cảm biến gia tốc báo **đứng yên** | 5 phút, hoặc chỉ gửi khi có sự kiện | Người không di chuyển thì cập nhật không mang thông tin nào |
| Đi bộ (≈1,4 m/s) | 30 giây | 30 s × 1,4 m/s ≈ 42 m — mịn hơn mức cần thiết cho bán kính 8 km |
| Lái xe (≈25 m/s) | 10 giây | Giữ sai số vị trí ở mức so sánh được |
| **Không có bạn nào trong ~20 km** | 5 phút | Cập nhật mịn cũng không đổi được kết quả nào |
| App chạy nền | 2–5 phút, dùng API "thay đổi vị trí đáng kể" của hệ điều hành | iOS/Android cung cấp sẵn, rẻ hơn GPS liên tục nhiều lần |
| Pin < 20% | Giãn gấp đôi, hoặc tự tạm dừng | Được người dùng cảm kích, và giảm tải server đúng lúc |
| **Server ra lệnh** (`cadence`) | Bất kỳ | Van backpressure toàn cục của ta |

Thủ thuật thực chiến đáng nêu:

- **Dùng geofence thay vì lấy mẫu định kỳ.** Đăng ký với hệ điều hành một hàng rào ảo bán kính ~200 m; chỉ khi ra khỏi hàng rào mới gửi cập nhật. Hệ điều hành hiện thực việc này bằng cell tower và Wi-Fi — rẻ hơn GPS hàng chục lần.
- **Gộp vào chung nhịp với ping/pong giữ kết nối.** Đằng nào cũng phải đánh thức radio để giữ NAT — đính vị trí vào đó thì miễn phí.
- **Chỉ gửi delta khi đứng yên**: nếu vị trí không đổi quá 10 m, gửi một heartbeat 2 byte thay vì toạ độ đầy đủ. Vừa giữ TTL sống, vừa gần như không tốn gì.

> 💡 Nhịp thích ứng không chỉ cứu pin — nó là **công cụ giảm tải mạnh nhất trong toàn hệ thống**. Nếu 60% người dùng đang đứng yên và họ chuyển sang nhịp 5 phút, write QPS rơi từ 334k xuống khoảng **140k**, và fan-out rơi theo đúng tỉ lệ. Một quyết định phía client vừa xoá sổ hơn một nửa hạ tầng phía server. Trong phỏng vấn, đây là ý làm người nghe ngồi thẳng lên.

---

## Liên hệ sang AWS

| Thành phần thiết kế | Dịch vụ AWS | Vì sao hợp (và bẫy) |
|---|---|---|
| Tầng WebSocket — **phương án được chọn** | **NLB → ECS/EKS** tự chạy WS (Go/Netty/Elixir) | Kiểm soát hoàn toàn draining, tuổi thọ kết nối, admission control — đúng những thứ §8 cần. NLB là L4 nên hầu như không giới hạn thời gian sống kết nối; đặt `deregistration_delay` = **30 phút** (mặc định 300 s là **quá ngắn**) và `stopTimeout`/`terminationGracePeriodSeconds` tương ứng. Trả tiền theo giờ compute, không theo từng tin |
| Tầng WebSocket — phương án dựng nhanh | **API Gateway WebSocket API** | Có `@connections` để push, không phải tự quản socket. ⚠️ **Tính tiền theo phút-kết-nối và theo tin**: 10 triệu kết nối × 1.440 phút/ngày = 14,4 tỉ phút-kết-nối/ngày (≈ **3.600 USD/ngày** chỉ riêng kết nối) cộng ~400k tin/s ra client (≈ **34 tỉ tin/ngày**). Hàng triệu đô mỗi tháng. Thêm giới hạn cứng: **idle 10 phút**, **kết nối tối đa 2 giờ**, khung 128 KB. Đúng cho MVP hoặc khi kết nối ít; **sai cho quy mô này** |
| Rải kết nối cho REST | **ALB** (L7) | Tách khỏi NLB của WS — hai vòng đời, hai kiểu health check, hai chính sách scale |
| Tăng tốc bắt tay toàn cầu | **Global Accelerator** | IP anycast tĩnh → gói vào mạng xương sống AWS ở POP gần nhất, rút ngắn TCP+TLS handshake (rất đáng khi 10 triệu client reconnect). IP tĩnh còn giúp client "ghim" endpoint thay vì phụ thuộc TTL DNS lúc sự cố |
| Redis Pub/Sub cluster | **ElastiCache for Redis/Valkey** — bắt buộc **sharded pub/sub** (`SPUBLISH`/`SSUBSCRIBE`, Redis ≥ 7) | ⚠️ **Bẫy lớn nhất của cả bài trên AWS**: pub/sub *cổ điển* trong cluster mode **phát bản tin tới MỌI node** — thêm node **không** tăng thông lượng, chỉ nhân tải lên. Sharded pub/sub giới hạn bản tin trong slot của channel, khi đó thêm shard mới thật sự scale. Chọn nhiều node **nhiều CPU, ít RAM** (pub/sub single-threaded) — ngược với trực giác mua Redis |
| Pub/sub khi cần vượt trần | **Redis/Valkey tự chạy trên EC2**, hoặc **EMQX/NATS trên EKS** | 140–200 node CPU-bound thì chi phí ElastiCache rất đắt; tự vận hành cho phép chỉnh kernel, `SO_REUSEPORT`, pin CPU. Đổi lại gánh nặng vận hành |
| Location cache (3 GB, TTL 10 phút) | **ElastiCache Redis** (cụm riêng, tách khỏi pub/sub) | Tách vì hai loại tải khác hẳn: cache là ghi O(1) đều đặn, pub/sub là CPU fan-out. Chung cụm thì một bên đói CPU sẽ kéo bên kia. 3 GB → nhân bản thoải mái |
| Khi cần cache vị trí **bền** | **MemoryDB for Redis** | Tốc độ Redis + nhật ký giao dịch đa AZ (bền vững thật). Ở bài này gần như **không cần** — mất vị trí thì 30 giây sau có bản mới. Chỉ đáng khi phải chịu ràng buộc tuân thủ về trạng thái |
| Vòng hash + danh sách node sống | **etcd/ZooKeeper tự chạy**, hoặc **Cloud Map / DynamoDB + Streams** | Cloud Map giải quyết đăng ký dịch vụ ở mức cơ bản nhưng không có ngữ nghĩa watch mạnh như etcd. DynamoDB + Streams là mẹo rẻ: bảng vòng hash nhỏ, mỗi WS server nghe Stream để cập nhật cache cục bộ |
| Bảng bạn bè / cài đặt | **DynamoDB** (PK `user_id`) hoặc **Aurora** sharded | Đọc theo khoá, không có truy vấn phức tạp trên đường nóng. DAX nếu cần che đợt reconnect storm |
| TTL trạng thái ở tầng bền | **DynamoDB TTL** | ⚠️ **Không dùng cho vòng đời 10 phút của ta**: DynamoDB TTL xoá **trong vòng tối đa 48 giờ**, hoàn toàn không phải cơ chế hết hạn chính xác. Dùng nó để dọn *lịch sử/phiên cũ*, còn hết hạn realtime phải là **TTL của Redis** |
| Đường ống lịch sử vị trí | **Kinesis Data Streams → Firehose → S3** (Parquet) | 334k bản ghi/s ≈ **334 shard** (1 MB/s hoặc 1.000 bản ghi/s mỗi shard) — dùng **on-demand** để khỏi tự chia. Firehose gộp lô, nén, chuyển sang Parquet, phân vùng theo ngày. Truy vấn bằng **Athena**. Rẻ hơn Cassandra rất nhiều cho dữ liệu chỉ phân tích |
| Lịch sử cần đọc theo user, độ trễ thấp | **Keyspaces (Cassandra-compatible)**, hoặc Cassandra tự chạy trên EC2 | Keyspaces bỏ được gánh vận hành, khoá `((user_id, ngày), ts DESC)` như §7.3. ⚠️ Tính tiền **theo từng lượt ghi**: 28,9 tỉ ghi/ngày khiến chế độ on-demand **cực kỳ đắt** — phải dùng provisioned + lấy mẫu, hoặc chỉ dùng S3 nếu không cần đọc điểm |
| **Lựa chọn ít người nghĩ tới**: tầng vận chuyển | **AWS IoT Core** (MQTT over WSS) | Sinh ra đúng cho bài này: hàng triệu thiết bị pin yếu gửi điểm dữ liệu nhỏ liên tục. Có sẵn **broker được quản lý, topic theo cấu trúc phân cấp, QoS 0/1, last-will (biết thiết bị mất kết nối ngay), Device Shadow (chính là "vị trí gần nhất" + TTL!), Rules Engine định tuyến thẳng sang Kinesis/DynamoDB/Lambda**. Thay được cả WS server *lẫn* pub/sub. ⚠️ Kiểm tra hạn mức: tin/giây mỗi tài khoản, độ dài topic, 128 KB mỗi tin, và mô hình giá theo phút-kết-nối + theo tin ở quy mô 13 triệu tin/s |
| Điều tiết & backpressure | Kênh `cadence` **của chính ứng dụng** | ⚠️ Đừng trông vào WAF/API Gateway throttling cho đường nóng — chúng cắt request, còn ta cần **giãn nhịp**. Backpressure ở tầng ứng dụng là công cụ duy nhất đúng |
| Quan sát hệ thống | **CloudWatch** (metric tuỳ biến: connections/instance, send-queue depth, msg age p99), **Container Insights**, **X-Ray** cho đường init | Metric autoscaling phải là **connections**, không phải CPU (§8.1). Đặt cảnh báo theo **tuổi bản tin p99** — đó là SLO thật với người dùng |
| Autoscale theo chỉ số đúng | **ECS/EKS target tracking** trên metric tuỳ biến `connections_per_task` | Đặt ngưỡng ~70%; **scale-in cooldown rất dài** (hàng giờ), scale-out nhanh |
| Bảo vệ quyền riêng tư | **KMS** cho lịch sử, **CloudTrail + Lake** cho nhật ký truy cập, **Macie** quét rò rỉ, **Cognito** cho auth | Nhật ký truy cập vị trí (§12.1) là **yêu cầu tuân thủ**, không phải tuỳ chọn. Token WS nên ngắn hạn và ràng theo thiết bị |
| Cách ly vùng lỗi | Nhiều **AZ** bắt buộc; nhiều **Region** nếu phân vùng địa lý (§11.3) | Mất một AZ = 3,3 triệu reconnect. Rải đều instance và **cấp dư đủ để AZ còn lại hấp thụ được đàn client** |

**Ba câu chốt đáng nhớ:**

1. *"API Gateway WebSocket tính tiền **theo phút-kết-nối**. Tôi có 10 triệu kết nối gần như im lặng, tức là tôi sẽ trả tiền cho sự im lặng — 14 tỉ phút mỗi ngày. Nên tôi tự chạy WebSocket trên ECS sau NLB, và cái tôi mua bằng công vận hành là quyền kiểm soát draining."*
2. *"Trên ElastiCache, pub/sub cổ điển trong cluster mode **broadcast tới mọi node**, nên thêm node không tăng thông lượng. Tôi bắt buộc dùng sharded pub/sub — không thì cụm 140 node của tôi chạy chậm hơn một node."*
3. *"Cụm pub/sub của tôi bị định cỡ bởi **CPU**, không phải RAM: 1,5 GB dùng trên 64 GB có sẵn. Ai nhìn dashboard bộ nhớ cũng sẽ đòi cắt cụm — nên chỉ số hiển thị chính phải là msg/giây."*

---

## Cách trình bày khi phỏng vấn / review

1. **Mở bằng cách đặt bài toán vào đúng chỗ của nó.** *"Nghe thì giống Proximity Service, nhưng điểm dữ liệu ở đây **di chuyển**. Điều đó lật ngược mọi thứ: từ read-heavy có index tĩnh thành **write-heavy có fan-out động**. Index không gian gần như biến mất, vì đồ thị bạn bè đã thu hẹp tập ứng viên từ 200 triệu xuống 400."* Một câu này tách bạn ngay khỏi người sắp vẽ một cái quadtree.

2. **Ra số, rồi nhân số đó với fan-out — đừng dừng ở QPS.** *"334k update/giây. Nhưng mỗi update phải tới 40 bạn đang online, nên lưu lượng nội bộ là **13,4 triệu thông điệp/giây**. Đó mới là con số tôi dùng để định cỡ."* Rất nhiều ứng viên bỏ qua phép nhân này và thiết kế một hệ nhỏ hơn 40 lần hệ thật.

3. **Chốt giao thức bằng hình dạng lưu lượng, không bằng từ khoá.** *"Chiều xuống vừa không đoán trước được vừa dày — đúng miền mà polling suy biến. Short polling 3 giây cho tôi 3,3 triệu request/giây mà 95% trả về rỗng, và đánh thức radio 20 lần mỗi phút; pin chết trước cả server."* Rồi **tự nêu cái giá**: stateful, deploy khó.

4. **Giải thích vì sao channel-theo-user là trục phân phối đúng** — đây là hạt nhân của bài: *"Người gửi không cần biết ai đang nghe; định tuyến chỉ còn là một phép hash; và mỗi channel có đúng một người viết ở nhịp 1 tin/30 giây, nên **hot channel về mặt ghi là không thể tồn tại**. So với channel theo geohash thì tôi không phải nhận rồi lọc bỏ tin của người lạ."*

5. **Chủ động dập phản bác '100 triệu channel thì nổ RAM' bằng con số.** *"Channel không có subscriber thì không chiếm byte nào — 90 triệu user offline là 0 byte. Phần tốn thật là subscription: ~180 GB, và xuống ~20 GB nếu chỉ subscribe bạn đang online. Hai node là đủ về RAM."* Rồi nói ngay cú twist: ***"nhưng tôi vẫn cần 140 node — vì CPU, không vì RAM."*** Đây là khoảnh khắc ghi điểm cao nhất của bài.

6. **Dùng TTL như một quyết định thiết kế, không phải một thiết lập.** *"Yêu cầu 'không hoạt động 10 phút thì biến mất' biến trạng thái presence thành TTL. Tôi không cần job quét ai offline — Redis tự quên. Trạng thái tự dọn dẹp là trạng thái không bao giờ rò rỉ."* Kèm lý do vì sao TTL 10 phút chứ không phải 30 giây: để phân biệt "mất sóng trong thang máy" với "đã đi thật".

7. **Nói rõ vì sao lịch sử vị trí nằm ngoài đường nóng.** *"1,3 PB/năm cho dữ liệu không phục vụ tính năng chính. Nó đi qua queue, fire-and-forget. Nếu tôi ghi đồng bộ, một đợt GC của Cassandra sẽ dội ngược lên 334k update/giây và kéo sập realtime."* Rồi hỏi lại một câu rất người lớn: *"mà có thật sự cần giữ đủ không, hay lấy mẫu 1/10 là đủ cho ML?"*

8. **Dành thời gian nhiều nhất cho tầng stateful — đây là chỗ phân loại ứng viên.** Nêu đủ bốn ý: autoscale theo **số kết nối** chứ không theo CPU; **draining nhiều giai đoạn** (đánh dấu → chảy tự nhiên → chủ động đẩy từng nhóm có jitter → unsubscribe → tắt), grace period **30 phút** chứ không phải 30 giây mặc định; deploy rolling chậm và **tách tầng socket khỏi tầng logic**; và mẹo **giới hạn tuổi thọ kết nối ngẫu nhiên 45–90 phút** để reconnect trở thành chuyện thường ngày. Ý cuối cho thấy bạn đã từng vận hành thật.

9. **Trình bày reconnect storm như chế độ hỏng nguy hiểm nhất, chứ không phải server chết.** *"Mất một máy chỉ mất 0,7% công suất. Nhưng 100.000 client quay lại cùng lúc sẽ chạy đường đắt nhất — 40 triệu lệnh subscribe trong vài giây — và kéo sập cụm pub/sub cho tất cả mọi người. **Đường hồi phục nguy hiểm hơn đường hỏng.**"* Rồi liệt kê phòng thủ nhiều lớp, nhấn mạnh **jitter mới là phần quan trọng, không phải backoff**.

10. **Khi được hỏi 'thêm người lạ gần đây thì sao?', hãy đổi trục phân phối chứ đừng vá.** *"Lúc đó không còn đồ thị bạn bè để lọc trước, nên không gian trở lại làm trục duy nhất: channel theo geohash, subscribe ô mình và 8 ô kề. Đổi lại tôi phải nhận rồi lọc, và hot cell quay lại. Tôi sẽ chạy **hai bus song song** — theo-user cho bạn bè, theo-ô cho người lạ — vì hai bên có yêu cầu chất lượng khác hẳn nhau."*

11. **Nêu Erlang/actor như một lựa chọn nghiêm túc, rồi từ chối nó vì lý do đúng.** *"Mô hình một actor cho một người khớp bài toán đẹp hơn, bỏ được cả tầng Redis, và có hot code swap — giải luôn bài toán deploy. WhatsApp giữ 2 triệu kết nối trên một máy Erlang. Tôi không chọn vì lý do tổ chức chứ không phải kỹ thuật: tuyển người và hệ sinh thái quan sát."* Từ chối có lý do luôn mạnh hơn im lặng.

12. **Đưa quyền riêng tư vào như một ràng buộc thiết kế, không phải một lời hứa đạo đức.** *"Chia sẻ vị trí liên tục là công cụ rình rập lý tưởng. Nên: opt-in, hai chiều theo từng người, ghost mode có hiệu lực tức thì và **không phân biệt được với offline**, chia sẻ có hạn định, nhật ký truy cập kể cả với nhân viên nội bộ. Và tôi làm tròn vị trí theo lưới trước khi tính khoảng cách — vì khoảng cách chính xác cộng ba tài khoản giả là **trilateration**, lỗ hổng đã xảy ra thật ở các app hẹn hò."* Chi tiết cuối chứng tỏ bạn nghĩ như kẻ tấn công.

13. **Đóng lại bằng nhịp cập nhật thích ứng, vì nó là đòn bẩy lớn nhất mà lại nằm ở phía client.** *"Nếu 60% người dùng đang đứng yên và tôi giãn họ xuống 5 phút, write QPS rơi từ 334k xuống 140k và fan-out rơi theo đúng tỉ lệ. Một quyết định phía client vừa xoá bỏ hơn nửa hạ tầng phía server — và đồng thời cứu pin, thứ sẽ quyết định tính năng này sống hay chết."*

> 💡 **Nguyên tắc cuối, gói cả bài trong một câu**: ở Proximity Service, cái khó là **tìm**; ở Nearby Friends, cái khó là **phát tán**. Khi dữ liệu thay đổi nhanh hơn tốc độ nó được truy vấn, hãy thôi thiết kế một kho lưu trữ và bắt đầu thiết kế một **bus**. Từ đó mọi thứ còn lại là hệ quả: trạng thái nóng nhỏ xíu sống trong RAM với TTL, mỗi người là một channel, người gửi không biết người nhận, lọc ở biên nơi đã sẵn dữ liệu, và toàn bộ sự khó nhọc dồn về hai chỗ — **CPU fan-out** và **mười triệu kết nối stateful**.
