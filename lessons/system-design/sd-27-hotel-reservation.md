# Case study: Hotel Reservation System

> Gần như mọi bài case study trước trong course này đều là **bài toán tải**: 100K rps, 100 TB, petabyte log, hàng tỉ event mỗi ngày. Bài này thì ngược lại hoàn toàn. Một hệ thống đặt phòng khách sạn cỡ Marriott chỉ ghi khoảng **3 booking mỗi giây**. Ba. Một con Postgres chạy trên laptop cũng gánh được. Vậy tại sao nó vẫn là một trong những bài phỏng vấn khó nhất? Vì cái khó không nằm ở **nhiều**, mà nằm ở **đúng**: bán một căn phòng cho hai người là một lỗi mà không có cache nào, không có shard nào cứu được.

Nếu bạn vào bài này mà phản xạ đầu tiên là "shard theo hotel_id, đặt Redis trước DB, Kafka cho event" thì bạn đang trả lời sai câu hỏi. Người phỏng vấn muốn xem bạn có nhận ra đây là **bài toán về tính đúng đắn (correctness) dưới điều kiện tranh chấp (contention)** hay không — và bạn có đủ chiều sâu để nói về transaction isolation, locking, idempotency, và distributed transaction mà không lảm nhảm buzzword hay không.

Bài toán này còn có một đặc điểm rất "đời": nó giống hệt **đặt vé máy bay, đặt vé xem phim, bán vé concert, bán hàng flash sale, book lịch bác sĩ, thuê xe**. Tất cả đều là một biến thể của cùng một bài: *có một lượng tồn kho hữu hạn gắn với một chiều thời gian, nhiều người tranh nhau, và không được bán quá (trừ khi bạn cố ý bán quá)*. Học kỹ bài này là học một lần dùng cho cả họ bài toán.

---

## Bước 1 — Làm rõ yêu cầu

Như mọi bài, việc đầu tiên không phải vẽ box mà là hỏi. Dưới đây là bộ câu hỏi đáng hỏi nhất và câu trả lời ta sẽ chốt làm giả định cho phần còn lại của bài.

**"Quy mô hệ thống thế nào?"** — Một chuỗi khách sạn với **5,000 khách sạn** và tổng cộng **1 triệu phòng**. Đây không phải Booking.com (marketplace của hàng triệu property), mà là hệ thống của một chuỗi (Marriott, Accor). Khác biệt này quan trọng: chuỗi thì dữ liệu inventory nằm trong tay mình, còn marketplace thì phải tích hợp với hàng trăm channel manager bên ngoài — một bài toán khác hẳn.

**"Khách trả tiền lúc đặt hay lúc đến?"** — Trả đủ **ngay lúc đặt**. Điều này kéo theo một hệ quả lớn: luồng đặt phòng có bước **thanh toán**, tức là có một dịch vụ bên ngoài (payment gateway) nằm giữa "giữ phòng" và "xác nhận phòng". Đó chính là nơi distributed transaction xuất hiện.

**"Đặt qua kênh nào?"** — Chỉ web và mobile app. Không xử lý đặt qua điện thoại, qua OTA (Expedia, Agoda), qua GDS. (Trong đời thực thì kênh OTA mới là nguồn double-booking kinh khủng nhất, nhưng để ngoài scope.)

**"Có huỷ được không?"** — Có. Và huỷ phải trả lại tồn kho.

**"Còn gì nữa không?"** — Có: hệ thống cho phép **overbooking 10%**, tức bán tới 110% số phòng thật. Đây không phải bug, mà là chính sách kinh doanh có chủ đích, vì thống kê cho thấy một tỉ lệ khách sẽ huỷ hoặc no-show.

**"Giá phòng có cố định không?"** — Không. Giá thay đổi **theo từng ngày** cho từng loại phòng. Nghĩa là giá là một bảng theo (loại phòng × ngày), không phải một cột trong bảng phòng.

### Functional requirements

Chốt lại bốn nhóm chức năng, và cố ý giữ hẹp:

1. **Xem thông tin khách sạn và loại phòng** — trang chi tiết khách sạn, ảnh, tiện nghi, danh sách loại phòng.
2. **Xem phòng trống theo khoảng ngày** — "khách sạn X, từ 2026-07-01 đến 2026-07-04, loại Deluxe còn mấy phòng, giá bao nhiêu".
3. **Đặt phòng** — chọn loại phòng, số lượng, khoảng ngày, thanh toán, nhận xác nhận.
4. **Xem và huỷ booking** — lịch sử đặt phòng của user, chi tiết một booking, huỷ.
5. **Admin panel** — nhân viên khách sạn điều chỉnh tồn kho (đóng phòng để sửa chữa), xem/huỷ hộ khách, hoàn tiền.
6. **Hỗ trợ overbooking** có cấu hình được theo khách sạn / loại phòng / ngày.

Cố ý **để ngoài scope**: search đa tiêu chí toàn quốc ("khách sạn ở Đà Nẵng gần biển dưới 2 triệu"), gợi ý, loyalty, review. Không phải vì chúng dễ, mà vì chúng là bài toán *search* (đã học ở bài proximity service và autocomplete) chứ không phải bài toán *reservation*. Nói rõ điều này ra khi phỏng vấn là một điểm cộng: bạn cho thấy mình biết phân biệt độ khó nằm ở đâu.

### Non-functional requirements

**Tính đúng đắn tuyệt đối ở tồn kho.** Không bao giờ bán quá ngưỡng đã cấu hình (kể cả ngưỡng overbooking 110%). Không bao giờ trừ tiền mà không có phòng. Không bao giờ có phòng bị giữ mà không ai trả tiền. Đây là yêu cầu số một, và nó mạnh hơn mọi yêu cầu khác — nếu phải chọn giữa "chậm 2 giây" và "có thể bán trùng", ta chọn chậm.

**Chịu được tranh chấp cao cục bộ (high concurrency, low throughput).** Đây là cặp từ khoá quan trọng nhất của bài. Tổng throughput rất thấp, nhưng tại **một hàng dữ liệu cụ thể** — khách sạn nổi tiếng, ngày lễ, loại phòng còn 2 phòng cuối — có thể có hàng trăm người bấm "Đặt" trong cùng một giây. Contention tập trung chứ không dàn đều.

**Latency chấp nhận được, không cần cực thấp.** User chờ 1–2 giây cho một lần đặt phòng là hoàn toàn bình thường — họ vừa nhập thẻ tín dụng xong, họ đang hồi hộp chờ chữ "Confirmed". Đây là lý do ta được phép dùng những kỹ thuật "chậm mà chắc" (transaction, lock, retry) mà trong bài ad-click aggregation hay news feed ta không dám dùng.

**High availability cho đọc.** Người ta duyệt web xem phòng nhiều hơn đặt rất nhiều. Đường đọc chết là mất doanh thu ngay.

**Audit được.** Mọi thay đổi tồn kho và mọi giao dịch tiền phải có dấu vết. Khi khách cãi nhau với khách sạn, ta phải trả lời được "lúc 14:32:07 hệ thống đã làm gì".

> 💡 **Nguyên tắc**: Trước khi thiết kế, hãy phát biểu một câu "trục chi phối" của bài. Bài URL shortener: *read-heavy*. Bài ad-click: *write-heavy, cần chính xác gần đúng*. Bài này: **low-throughput, high-contention, correctness-critical, có tiền tham gia**. Mọi quyết định phía sau phải chiếu lại câu này.

---

## Bước 2 — Back-of-the-envelope estimation

Phần này ngắn nhưng là phần **thay đổi toàn bộ cuộc nói chuyện**. Hãy tính thật và nói to kết quả ra.

```
Giả định:
  Số phòng toàn hệ thống          : 1,000,000
  Tỉ lệ lấp đầy (occupancy)       : 70%
  Thời gian lưu trú trung bình    : 3 ngày/lượt
  1 ngày ≈ 86,400 s ≈ 10^5 s (làm tròn cho dễ nhẩm)

Số phòng-đêm bán ra mỗi ngày:
  1,000,000 × 70% = 700,000 phòng-đêm/ngày

Số lượt đặt (reservation) mỗi ngày:
  mỗi lượt chiếm trung bình 3 phòng-đêm
  700,000 / 3 ≈ 233,000  →  làm tròn ~240,000 booking/ngày

Write TPS (ghi booking):
  240,000 / 10^5 ≈ 2.4  →  ~3 booking/giây

Peak (mùa cao điểm, giờ vàng, hệ số ×10 cho an toàn):
  ~30 booking/giây
```

Ba booking mỗi giây. Ba mươi lúc cao điểm. Đây là con số nhỏ đến mức **gây sốc** nếu bạn vừa làm xong bài metrics hay ad-click aggregation.

Bây giờ tính lượt đọc. Không ai vào thẳng trang thanh toán — họ đi qua một phễu (funnel). Giả định tỉ lệ chuyển đổi 10% ở mỗi bước:

```
Phễu chuyển đổi (mỗi bậc ~10%):

  3 booking/s  (submit reservation)
        ↑ ×10
  30 view/s    (trang xác nhận/đặt phòng)
        ↑ ×10
  300 view/s   (trang chi tiết phòng + check availability)
        ↑ ×10
  3,000 view/s (trang tìm kiếm / danh sách khách sạn)

=> Read QPS đỉnh của hệ thống cỡ vài nghìn, tập trung gần như toàn bộ
   vào truy vấn "còn phòng không?" và "giá bao nhiêu?"
```

Và dung lượng lưu trữ:

```
Bảng reservation:
  240,000 booking/ngày × 365 × 5 năm ≈ 440 triệu bản ghi
  mỗi bản ghi ~500 B (id, user, hotel, room_type, dates, status, giá, ...)
  ≈ 220 GB trong 5 năm

Bảng room_type_inventory (sẽ giải thích ở phần data model):
  5,000 khách sạn × 20 loại phòng × 365 ngày × 2 năm = 73 triệu dòng
  mỗi dòng ~40 B  ≈ 3 GB

Bảng hotel / room / room_type:
  1 triệu phòng × ~200 B ≈ 200 MB. Không đáng kể.
```

### Con số này dẫn tới quyết định gì?

Đây là phần quan trọng nhất, và là chỗ phần lớn ứng viên bỏ lỡ. Con số không phải để khoe kỹ năng nhẩm, mà để **loại bỏ các hướng thiết kế**.

| Quan sát | Hệ quả thiết kế |
|---|---|
| Write TPS ~3 (peak ~30) | Không cần sharding. Không cần queue để absorb write. Không cần batching. **Một DB instance là đủ**, và còn dư rất nhiều. |
| Tổng dữ liệu nóng ~220 GB | Vừa vặn một Aurora/RDS instance. Không cần distributed database. |
| Read QPS vài nghìn, chủ yếu là dữ liệu tĩnh (thông tin khách sạn) | CDN + cache giải quyết gọn. Read replica cho phần còn lại. |
| Contention tập trung ở vài dòng inventory nóng | **Đây mới là chỗ cần đầu tư**: isolation level, locking strategy, retry. |
| Mỗi booking có tiền và có bên thứ ba (payment gateway) | Cần idempotency, cần saga/compensation, cần reconciliation. |

> 💡 **Nguyên tắc vàng của bài này**: *Đây là bài toán đúng đắn, không phải bài toán tải.* Hãy nói câu này thành tiếng trong phỏng vấn ngay sau khi tính xong estimation. Nó báo hiệu bạn đọc được bản chất bài toán, và nó cho phép bạn dành 80% thời gian còn lại cho phần thực sự khó (concurrency + distributed transaction) thay vì vẽ mười cái box scale.

> ⚠️ **Bẫy thường gặp**: Ứng viên tính ra 3 TPS rồi... vẫn vẽ Kafka, vẫn shard 16 mảnh, vẫn đặt Redis cluster. Người phỏng vấn sẽ hỏi ngược: "3 TPS thì shard để làm gì?" và bạn không có câu trả lời. Over-engineering khi đã có số trong tay là lỗi nặng hơn under-engineering khi chưa tính.

Có một câu hỏi phụ hay được hỏi sau đó: *"Nếu hệ thống này được dùng cho Booking.com, QPS gấp 1,000 lần thì sao?"* — Ta sẽ trả lời ở phần scale cuối bài. Nhưng thứ tự phải đúng: **thiết kế cho quy mô thật trước, rồi mới nói đường mở rộng**, không phải ngược lại.

---

## Bước 3 — API design

REST thuần, không có gì kỳ dị. Điểm đáng chú ý duy nhất nằm ở API đặt phòng.

### Hotel API (đọc công khai, ghi chỉ cho ops)

```
GET    /v1/hotels/{hotelId}                  # chi tiết khách sạn
GET    /v1/hotels/{hotelId}/room-types       # danh sách loại phòng
POST   /v1/hotels                            # ops only
PUT    /v1/hotels/{hotelId}                  # ops only
DELETE /v1/hotels/{hotelId}                  # ops only (soft delete)
```

### Room / Room type API

```
GET    /v1/hotels/{hotelId}/rooms/{roomId}
POST   /v1/hotels/{hotelId}/rooms            # ops only
PUT    /v1/hotels/{hotelId}/rooms/{roomId}   # ops only
DELETE /v1/hotels/{hotelId}/rooms/{roomId}   # ops only
```

### Availability & rate API — đường nóng của phần đọc

```
GET /v1/hotels/{hotelId}/availability
      ?roomTypeId=1001
      &startDate=2026-07-01
      &endDate=2026-07-04

200 -> {
  "hotelId": "245",
  "roomTypeId": "1001",
  "nights": [
    { "date": "2026-07-01", "available": 12, "rate": 2400000 },
    { "date": "2026-07-02", "available": 9,  "rate": 2600000 },
    { "date": "2026-07-03", "available": 3,  "rate": 3100000 }
  ],
  "minAvailable": 3,
  "totalRate": 8100000,
  "currency": "VND"
}
```

Chú ý hai chi tiết. Thứ nhất, `endDate` là ngày **check-out**, nên số đêm là `endDate - startDate` — khoảng 2026-07-01 → 2026-07-04 là **3 đêm** (01, 02, 03), không phải 4. Nhầm chỗ này là bug kinh điển, và nói ra được trong phỏng vấn cho thấy bạn từng chạm vào domain thật.

Thứ hai, `minAvailable` là **min của tất cả các đêm**, không phải max hay average. Khách cần ở liên tục 3 đêm, nên số phòng đặt được bị chặn bởi đêm khan hiếm nhất. Đây là một ràng buộc AND trên nhiều dòng — và chính nó là nguồn gốc của deadlock ở phần locking phía sau.

### Reservation API — chỗ có kỹ thuật

```
POST /v1/reservations
Idempotency-Key: 3f2b1c7e-...        # tuỳ chọn, xem phần idempotency
{
  "reservationId": "3f2b1c7e-9a44-4f5e-b8d2-1c0e9f7a2b31",
  "hotelId": "245",
  "roomTypeId": "1001",
  "startDate": "2026-07-01",
  "endDate": "2026-07-04",
  "roomCount": 2,
  "guest": { "name": "...", "email": "..." },
  "paymentToken": "tok_..."
}

201 -> { "reservationId": "...", "status": "CONFIRMED", "confirmationCode": "MAR-7KQ2X" }
409 -> { "error": "NOT_ENOUGH_INVENTORY", "date": "2026-07-03" }
200 -> (nếu reservationId đã tồn tại: trả lại đúng kết quả cũ, KHÔNG tạo mới)

GET    /v1/reservations                      # lịch sử của user hiện tại (phân trang)
GET    /v1/reservations/{reservationId}      # chi tiết
DELETE /v1/reservations/{reservationId}      # huỷ (soft: chuyển status -> CANCELLED)
```

Ba điểm đáng bàn:

**`reservationId` do client sinh, không phải server.** Nghe ngược đời, nhưng đây chính là cơ chế idempotency của bài. Ta sẽ mổ kỹ ở deep dive. Ngắn gọn: khi user mở trang thanh toán, frontend sinh sẵn một UUID; mọi lần bấm "Xác nhận" đều gửi cùng UUID đó; backend đặt `UNIQUE` trên cột này nên lần thứ hai sẽ bị DB chặn, và ta trả về kết quả của lần thứ nhất.

**Đặt theo `roomTypeId`, không theo `roomId`.** Đây là khác biệt cốt lõi giữa **hotel** và **Airbnb**. Ở Airbnb bạn đặt đúng căn nhà đó. Ở khách sạn bạn đặt "một phòng Deluxe giường đôi hướng biển" — số phòng cụ thể (1207) chỉ được gán lúc check-in, bởi lễ tân, theo tình trạng dọn phòng. Thiết kế mà cho user chọn `roomId` là sai domain, và nó làm bài toán tồn kho khó hơn gấp bội mà chẳng để làm gì.

**DELETE là soft delete.** Không bao giờ xoá thật một reservation — nó là chứng từ tài chính. `status` chuyển sang `CANCELLED`, đồng thời trả tồn kho.

> 💡 **Nguyên tắc**: API của hệ thống có tiền phải **idempotent trên mọi thao tác ghi**. Không chỉ "tạo booking" — cả "huỷ booking", "hoàn tiền", "trừ tồn kho" đều phải chịu được gọi lại hai lần. Mạng sẽ timeout, client sẽ retry, message queue sẽ deliver lại. Đó không phải trường hợp hiếm, đó là mặc định.

---

## Bước 4 — Data model

### 4.1. Chọn loại database trước, rồi mới vẽ bảng

Trước khi vẽ schema, hãy liệt kê **access pattern** — đây là thói quen đúng ở mọi bài:

1. Lấy thông tin chi tiết một khách sạn và các loại phòng của nó. (đọc, rất nhiều, dữ liệu gần như tĩnh)
2. Tìm số phòng trống của một loại phòng trong một khoảng ngày. (đọc, nhiều, dữ liệu động)
3. Ghi một reservation + trừ tồn kho cho từng đêm. (ghi, ít, **phải nguyên tử**)
4. Tra một reservation hoặc lịch sử booking của một user. (đọc, ít)
5. Huỷ reservation + hoàn tồn kho. (ghi, ít, **phải nguyên tử**)

Nhìn vào đó, ta chọn **relational database (RDBMS)**. Lý do — và hãy nói đủ bốn lý do, đừng chỉ nói "vì cần ACID":

**Một, cần ACID thật sự.** Thao tác đặt phòng là "kiểm tra tồn kho của N đêm, trừ tồn kho của N đêm, ghi một bản reservation" — ba việc phải hoặc cùng thành công hoặc cùng thất bại. Nếu trừ được đêm 01, 02 rồi đêm 03 hết phòng mà không rollback được, khách mất phòng mà khách sạn mất doanh thu. RDBMS cho ta cái này miễn phí bằng `BEGIN ... COMMIT`.

**Hai, tải rất thấp.** Lý do lớn nhất người ta rời bỏ RDBMS là write throughput và dung lượng. Ta có 3 TPS và 220 GB. Cả hai đều không phải vấn đề. Ta không phải trả cái giá "mất transaction" để mua thứ mình không cần.

**Ba, dữ liệu có cấu trúc rõ và nhiều quan hệ.** Hotel → room_type → room, reservation → user, rate theo (room_type, date). Đây là quan hệ thật, có join thật. Mô hình hoá bằng document sẽ phải denormalize rồi tự tay giữ nhất quán — tức tự tay viết lại thứ mà DB đã làm tốt hơn.

**Bốn, ta cần constraint làm lưới an toàn cuối cùng.** `UNIQUE`, `CHECK`, foreign key — những thứ này là tuyến phòng thủ cuối khi code ứng dụng có bug. Ta sẽ dùng chúng rất tích cực ở phần concurrency.

**Khi nào thì phải cân nhắc lại?** Đừng trả lời "không bao giờ" — người phỏng vấn đang chờ bạn nêu điều kiện lật ngược:

| Tình huống | Tại sao RDBMS đơn có thể không đủ | Hướng thay thế |
|---|---|---|
| Trở thành marketplace kiểu Booking.com, 10⁴ TPS ghi | Một primary không gánh nổi write | Shard theo `hotel_id`; hoặc tách inventory ra store riêng |
| Cần multi-region active-active (đặt phòng từ mọi châu lục, ghi ở mọi nơi) | RDBMS truyền thống chỉ có một primary ghi | Spanner / Aurora Global (write forwarding, có độ trễ) / CockroachDB — trả giá bằng latency commit |
| Hot partition cực đoan: một sự kiện bán 100K vé trong 60 giây | Contention trên một dòng vượt khả năng của lock | Chuyển sang mô hình *token/seat pre-materialized* + hàng đợi, xem phần cuối |
| Chỉ cần đếm tồn kho, không cần join phức tạp | Bảng inventory thực chất là một counter theo key | DynamoDB với **conditional write** — đây là ứng viên thay thế nghiêm túc nhất, bàn kỹ ở phần AWS |

> 💡 **Nguyên tắc**: "Chọn SQL vì cần ACID" là câu trả lời đúng nhưng nông. Câu trả lời sâu là: *"Tôi chọn SQL vì tải thấp nên tôi **được phép** chọn thứ mạnh về đảm bảo; nếu tải cao gấp 1,000 lần, tôi sẽ phải đổi mô hình tồn kho trước khi đổi database."*

### 4.2. Schema ngây thơ (và vì sao nó sai với khách sạn)

Bản năng đầu tiên là mô hình hoá theo **phòng cụ thể**:

```
hotel(id, name, address, location, ...)
room(id, hotel_id, room_number, room_type_id, floor, status)
reservation(id, room_id, user_id, start_date, end_date, status)
```

Muốn biết phòng 1207 có trống từ 01/07 đến 04/07 không? Query xem có reservation nào của `room_id = 1207` giao với khoảng ngày đó không.

```sql
SELECT 1 FROM reservation
WHERE room_id = 1207
  AND status = 'CONFIRMED'
  AND start_date < '2026-07-04'
  AND end_date   > '2026-07-01';
```

Mô hình này **đúng cho Airbnb**, nơi mỗi listing là một thực thể riêng biệt và khách chọn đúng listing đó. Nhưng nó **sai cho khách sạn**, vì ba lý do:

**Một, khách không đặt phòng — khách đặt loại phòng.** Không ai vào Marriott.com rồi chọn "phòng 1207". Họ chọn "Deluxe King, hướng thành phố". Số phòng gán lúc check-in.

**Hai, truy vấn availability trở nên đắt và khó.** Để biết "loại Deluxe còn mấy phòng đêm 02/07", ta phải lấy toàn bộ phòng Deluxe của khách sạn (có thể 200 phòng), rồi với mỗi phòng kiểm tra xem có reservation nào chồng lấn không. Đó là một anti-join trên khoảng thời gian — chậm, khó index, và tệ hơn: **khó khoá**. Ta sẽ khoá cái gì để tránh hai người cùng đếm ra "còn 1 phòng"?

**Ba, không mô hình hoá được overbooking.** Nếu tồn kho được suy ra gián tiếp từ "phòng nào chưa bị đặt", thì làm sao bán 110% số phòng? Không có phòng số 201 để bán khi khách sạn chỉ có 200 phòng.

> ⚠️ **Bẫy**: Rất nhiều ứng viên dừng ở schema này và nghĩ đã xong data model. Người phỏng vấn hầu như luôn hỏi tiếp: *"Nếu khách sạn có 200 phòng cùng loại thì sao?"* — và nếu bạn phải sửa lại schema tại chỗ, bạn mất điểm. Hãy chủ động nêu shortcoming này trước khi bị hỏi.

### 4.3. Schema cải tiến — trái tim là `room_type_inventory`

Ý tưởng then chốt: **tách tồn kho ra thành một bảng riêng, vật chất hoá (materialize) theo từng ngày.**

```
┌──────────────────────┐
│ hotel                │
│  id (PK)             │
│  name, address       │
│  city, country       │
│  location (lat,lng)  │
│  timezone            │◄── quan trọng: "ngày" là theo giờ khách sạn
└──────────┬───────────┘
           │ 1..n
┌──────────▼───────────┐        ┌──────────────────────────┐
│ room_type            │        │ room_type_rate           │
│  id (PK)             │◄───────┤  hotel_id                │
│  hotel_id (FK)       │  1..n  │  room_type_id            │
│  name  "Deluxe King" │        │  date                    │
│  max_occupancy       │        │  rate  (giá của đêm đó)  │
│  bed_config          │        │  PK(hotel_id,            │
└──────────┬───────────┘        │     room_type_id, date)  │
           │ 1..n               └──────────────────────────┘
┌──────────▼───────────┐
│ room                 │        ┌──────────────────────────────────┐
│  id (PK)             │        │ room_type_inventory   ★ TRUNG TÂM│
│  hotel_id (FK)       │        │  hotel_id                        │
│  room_type_id (FK)   │        │  room_type_id                    │
│  room_number "1207"  │        │  date                            │
│  status              │        │  total_inventory  INT NOT NULL   │
│   AVAILABLE          │        │  total_reserved   INT NOT NULL   │
│   OUT_OF_SERVICE     │        │  overbooking_pct  SMALLINT       │
└──────────────────────┘        │  version          BIGINT         │
                                │  PK(hotel_id, room_type_id, date)│
┌──────────────────────┐        └──────────────────────────────────┘
│ reservation          │
│  id (PK)  ← client sinh, UUID │
│  user_id                      │
│  hotel_id, room_type_id       │
│  start_date, end_date         │
│  room_count                   │
│  status  PENDING/CONFIRMED/   │
│          CANCELLED/REFUNDED   │
│  total_amount, currency       │
│  hold_expires_at              │
│  created_at, updated_at       │
└───────────────────────────────┘
```

Bảng `room_type_inventory` là nhân vật chính. Mỗi dòng trả lời đúng một câu hỏi: *"Khách sạn này, loại phòng này, **ngày này**, có bao nhiêu phòng và đã bán bao nhiêu?"*

| hotel_id | room_type_id | date | total_inventory | total_reserved |
|---|---|---|---|---|
| 211 | 1001 | 2026-07-01 | 100 | 80 |
| 211 | 1001 | 2026-07-02 | 100 | 82 |
| 211 | 1001 | 2026-07-03 | 100 | 86 |
| 211 | 1001 | ... | ... | ... |
| 211 | 1002 | 2026-07-01 | 200 | 16 |
| 2210 | 101 | 2026-07-01 | 30 | 23 |

### 4.4. Vì sao **phải** tách theo ngày?

Đây là câu hỏi người phỏng vấn giỏi sẽ hỏi, và câu trả lời cho thấy bạn hiểu bài hay chỉ học thuộc.

**Lý do 1 — Tồn kho khách sạn vốn dĩ là đại lượng theo ngày, không phải theo khoảng.** Một booking 01→04 tiêu thụ tồn kho của ba đêm riêng biệt. Nếu bạn chỉ lưu một con số "còn 15 phòng Deluxe", con số đó vô nghĩa: còn 15 phòng *ngày nào*? Không có cách nào biểu diễn "đêm 02 hết phòng nhưng đêm 01 và 03 còn" bằng một scalar.

**Lý do 2 — Biến bài toán khoảng (interval) thành bài toán khoá hàng (row lock).** Nếu tồn kho được suy ra từ các reservation chồng lấn, thì để đảm bảo đúng đắn bạn phải khoá *một khoảng thời gian* — tức là **predicate lock** hoặc **range lock**, thứ chỉ có ở isolation level `SERIALIZABLE` và đắt kinh khủng. Khi vật chất hoá theo ngày, mỗi đêm là **một dòng có primary key rõ ràng**, và bạn chỉ cần khoá đúng N dòng đó. Đây là bước chuyển hoá quan trọng nhất của bài: *chuyển một ràng buộc trên khoảng liên tục thành một tập ràng buộc rời rạc trên các dòng*.

**Lý do 3 — Cho phép overbooking và điều chỉnh tồn kho theo ngày.** Khách sạn muốn bán 115% vào ngày thường nhưng chỉ 100% vào đêm giao thừa? Đặt `overbooking_pct` khác nhau trên từng dòng. Muốn đóng 10 phòng để sơn lại tầng 12 trong tuần tới? Giảm `total_inventory` của đúng 7 dòng đó. Không có mô hình theo ngày thì cả hai đều không biểu diễn được.

**Lý do 4 — Truy vấn availability trở thành một range scan trên primary key.** `WHERE hotel_id=? AND room_type_id=? AND date BETWEEN ? AND ?` chạy trên PK composite là một index range scan liền mạch, trả về vài dòng. Nhanh, dễ đoán, dễ cache.

**Lý do 5 — Giá cũng theo ngày.** Bảng `room_type_rate` có đúng cấu trúc key ấy. Đặt hai bảng cùng grain (hotel, room_type, date) khiến việc join "còn phòng và giá bao nhiêu" trở nên tự nhiên.

> 💡 **Nguyên tắc tổng quát**: Khi một ràng buộc tài nguyên trải trên một chiều liên tục (thời gian, không gian), hãy **rời rạc hoá chiều đó thành các hàng có khoá** rồi áp ràng buộc lên từng hàng. Đây chính là kỹ thuật dùng lại ở đặt vé máy bay (theo chuyến × hạng ghế), đặt lịch phòng họp (theo slot 30 phút), rate limiter (theo window), booking sân bóng (theo khung giờ).

### 4.5. Tính số dòng — và vì sao con số này làm ta yên tâm

```
Giả định:
  5,000 khách sạn
  ~20 loại phòng / khách sạn  (thực tế 5–30, lấy 20 cho an toàn)
  mở bán trước 2 năm          (chuẩn ngành: 12–24 tháng)

Số dòng room_type_inventory:
  5,000 × 20 × 365 × 2 = 73,000,000 dòng

Kích thước mỗi dòng:
  hotel_id (8B) + room_type_id (8B) + date (4B)
  + total_inventory (4B) + total_reserved (4B)
  + overbooking_pct (2B) + version (8B) + overhead (~20B)
  ≈ 55–60 B/dòng

Tổng:
  73M × 60 B ≈ 4.4 GB dữ liệu + index
  → gọi tròn ~6–8 GB kể cả index phụ
```

**73 triệu dòng, chưa tới 10 GB.** Đây là kích thước mà một instance RDS `db.r6g.xlarge` (32 GB RAM) nuốt gọn **toàn bộ trong bộ nhớ**. Nghĩa là mọi truy vấn availability đều là in-memory lookup — chưa cần Redis đã nhanh rồi. Đây là một trong những lý do mạnh nhất để không over-engineer bài này.

Bảng `room_type_rate` có cùng grain nên cũng cỡ đó. Bảng `reservation` 440 triệu dòng / 220 GB sau 5 năm là bảng lớn nhất, nhưng nó chỉ bị đọc theo `id` hoặc theo `user_id` — index đơn giản, và ta có thể archive dữ liệu quá khứ.

### 4.6. Các dòng inventory đến từ đâu?

Không ai insert chúng bằng tay. Một **cron job hằng ngày** (hoặc scheduled Lambda) chạy lúc rạng sáng, nhìn xa 2 năm, và đảm bảo mọi (hotel, room_type, date) trong cửa sổ đó đều có dòng:

```
Mỗi ngày lúc 02:00:
  for each hotel, room_type:
      target_date = today + 730 ngày
      INSERT INTO room_type_inventory
        (hotel_id, room_type_id, date, total_inventory, total_reserved,
         overbooking_pct, version)
      VALUES (h, rt, target_date, (SELECT COUNT(*) FROM room
                                    WHERE room_type_id = rt
                                      AND status = 'AVAILABLE'), 0, 10, 0)
      ON CONFLICT (hotel_id, room_type_id, date) DO NOTHING;
```

Vài chi tiết đáng nói ra khi phỏng vấn:

- **`ON CONFLICT DO NOTHING`** khiến job này idempotent — chạy lại hai lần không hỏng gì. Job nền cũng phải idempotent, y hệt API.
- **Job này là điểm chết âm thầm**. Nếu nó fail 3 ngày liên tục mà không ai biết, ngày thứ 731 trong tương lai sẽ không có dòng inventory → API availability trả "hết phòng" cho một ngày rất xa. Không ai phát hiện vì chẳng ai đặt phòng 2 năm sau. Rồi đến một ngày, cửa sổ ấy trôi tới gần và bạn mất doanh thu. **Phải có alert dạng "tồn tại (hotel, room_type) nào không có dòng inventory cho ngày today+N không?"**
- Khi thêm phòng mới hoặc đóng phòng, không chỉ sửa bảng `room`, mà phải cập nhật `total_inventory` cho các ngày **tương lai** — và tuyệt đối không giảm xuống dưới `total_reserved` đang có (constraint sẽ chặn, xem phần sau).

---

## Bước 5 — High-level design

Ta chọn kiến trúc **microservices**, nhưng với một lưu ý quan trọng mà ta sẽ bảo vệ ở deep dive: **reservation và inventory nằm chung một service, chung một database.**

```
   ┌────────┐                            ┌─────────┐
   │  User  │                            │  Admin  │
   │ web/app│                            │  (ops)  │
   └───┬────┘                            └────┬────┘
       │                                      │
   ┌───▼──────┐                          ┌────▼──────────┐
   │   CDN    │ ảnh, JS, CSS, ảnh phòng  │ Internal API  │
   └───┬──────┘                          │  (sau VPN)    │
       │                                 └────┬──────────┘
   ┌───▼───────────────┐                      │
   │  Public API GW    │  auth, rate limit,   │
   │  (+ WAF)          │  TLS, request id     │
   └───┬───────────────┘                      │
       │                                      │
  ┌────┴───────┬──────────┬───────────┐       │
  │            │          │           │       │
┌─▼────────┐ ┌─▼──────┐ ┌─▼────────┐ ┌▼───────▼────────┐
│  Hotel   │ │  Rate  │ │Reservation│ │ Hotel Mgmt      │
│ Service  │ │Service │ │ Service   │ │ Service (ops)   │
│          │ │        │ │ + Inventory│ │                │
│ tĩnh,    │ │giá theo│ │ ★ ACID     │ │ đóng phòng,     │
│cache mạnh│ │ngày    │ │  ở đây     │ │ refund, report  │
└─┬────────┘ └─┬──────┘ └─┬─────────┘ └───┬─────────────┘
  │            │          │               │
  │         ┌──▼──────────▼───────────────▼──┐
  │         │        Payment Service          │
  │         │   (gọi Stripe/Adyen bên ngoài)  │
  │         └──────────────┬──────────────────┘
  │                        │
┌─▼────────────────────────▼───────────────────────────┐
│               Aurora / RDS (PostgreSQL|MySQL)        │
│   primary (ghi)  ──replica──>  read replica × 2      │
│   hotel, room, room_type, room_type_rate,            │
│   room_type_inventory, reservation, outbox           │
└──────────────────┬───────────────────────────────────┘
                   │ CDC (Debezium / DMS)
        ┌──────────▼───────────┐      ┌──────────────────┐
        │  Event bus (SQS/     │─────>│  Redis cache     │
        │  EventBridge/Kafka)  │      │  inventory, hotel│
        └──────────┬───────────┘      └──────────────────┘
                   │
        ┌──────────▼───────────┐
        │ Search read model    │  (OpenSearch: tìm KS theo
        │ (denormalized)       │   thành phố, giá, tiện nghi)
        └──────────────────────┘
```

Vai trò từng thành phần:

**CDN** — ảnh khách sạn, ảnh phòng, bundle JS/CSS. Đây là phần lớn bandwidth của hệ thống và nó hoàn toàn tĩnh. Đưa hết ra edge.

**Public API Gateway** — xác thực, rate limit (chống bot cào giá — rất phổ biến trong ngành travel), TLS termination, gắn `X-Request-Id` để trace.

**Hotel Service** — trả thông tin khách sạn, loại phòng, tiện nghi, ảnh. Dữ liệu này **gần như không đổi**: một khách sạn đổi mô tả vài tháng một lần. Cache cực mạnh, TTL hàng giờ, và đây là service dễ scale nhất.

**Rate Service** — trả giá theo (room_type, date). Giá đổi hằng ngày, đôi khi theo giờ (dynamic pricing nhìn vào occupancy). Cache TTL ngắn hơn, vài phút.

**Reservation Service (bao gồm Inventory)** — trái tim. Nhận request đặt phòng, kiểm tra + trừ tồn kho, ghi reservation, điều phối thanh toán, xử lý huỷ. **Đây là service duy nhất được phép ghi vào `room_type_inventory` và `reservation`.**

**Payment Service** — bọc payment gateway bên ngoài (Stripe, Adyen, VNPay). Tách riêng vì lý do tuân thủ (PCI-DSS: càng ít service chạm dữ liệu thẻ càng tốt) và vì nó có vòng đời riêng (webhook về muộn, refund bất đồng bộ).

**Hotel Management Service** — công cụ nội bộ: đóng phòng bảo trì, chỉnh overbooking, huỷ hộ khách, hoàn tiền, báo cáo. Đặt sau VPN, không lộ ra internet.

Giao tiếp giữa các service: **gRPC** cho lời gọi đồng bộ (nhanh, có schema, code-gen), **event bus** cho luồng bất đồng bộ (gửi email xác nhận, cập nhật read model, đồng bộ cache).

> ⚠️ **Bẫy kiến trúc**: Tách "Inventory Service" riêng khỏi "Reservation Service" nghe rất microservice và rất sạch. Nhưng làm thế là bạn **tự tay biến một local transaction thành một distributed transaction** cho thao tác quan trọng nhất hệ thống. Ta sẽ mổ xẻ cái giá đó ở deep dive 3 — và lý do vì sao thiết kế này cố ý giữ chúng chung một DB.

---

## Deep dive 1 — Concurrency: trái tim của bài

Đây là phần bạn nên dành nhiều thời gian nhất. Nếu chỉ kịp đi sâu một chỗ, hãy chọn chỗ này.

### 5.1. Luồng đặt phòng, viết ra bằng SQL trần

Trước khi nói về lock, hãy viết ra **chính xác** cái mà ta đang cố bảo vệ:

```sql
BEGIN;

-- Bước 1: đọc tồn kho của tất cả các đêm trong khoảng
SELECT date, total_inventory, total_reserved, overbooking_pct
FROM room_type_inventory
WHERE hotel_id = :hotelId
  AND room_type_id = :roomTypeId
  AND date >= :startDate AND date < :endDate;   -- endDate là ngày check-out

-- Bước 2: kiểm tra ở tầng ứng dụng
for each row:
    if (row.total_reserved + :roomCount)
         > row.total_inventory * (1 + row.overbooking_pct/100):
        ROLLBACK;  return 409 NOT_ENOUGH_INVENTORY

-- Bước 3: trừ tồn kho
UPDATE room_type_inventory
SET total_reserved = total_reserved + :roomCount
WHERE hotel_id = :hotelId
  AND room_type_id = :roomTypeId
  AND date >= :startDate AND date < :endDate;

-- Bước 4: ghi reservation
INSERT INTO reservation (id, user_id, hotel_id, room_type_id,
                         start_date, end_date, room_count, status, total_amount)
VALUES (:reservationId, :userId, ..., 'CONFIRMED', :amount);

COMMIT;
```

Nhìn có vẻ an toàn — có `BEGIN`/`COMMIT` mà. Nhưng **transaction không phải là lock**. Ở isolation level mặc định (`READ COMMITTED` ở PostgreSQL và Oracle, `REPEATABLE READ` ở MySQL InnoDB), một câu `SELECT` thuần **không khoá gì cả**. Hai transaction hoàn toàn có thể cùng đọc, cùng thấy "còn phòng", rồi cùng ghi.

### 5.2. Double booking xảy ra thế nào — timeline hai request

Giả sử `total_inventory = 100`, `total_reserved = 99`, `overbooking_pct = 0` → còn đúng **1 phòng**. Hai user cùng bấm "Đặt" lúc 14:32:07.

```
   thời gian →
   
   Transaction A (User Anh)              Transaction B (User Bình)
   ─────────────────────────             ─────────────────────────
t1 BEGIN
t2 SELECT total_reserved
     → đọc được 99
     (không khoá gì cả)
t3                                       BEGIN
t4                                       SELECT total_reserved
                                           → CŨNG đọc được 99
                                           (snapshot riêng, hợp lệ)
t5 check: 99 + 1 <= 100  ✓ OK
t6                                       check: 99 + 1 <= 100  ✓ OK
t7 UPDATE SET total_reserved
     = total_reserved + 1
     → 100
t8 INSERT reservation A
t9 COMMIT                      ← A ghi thành công, tồn kho = 100
t10                                      UPDATE SET total_reserved
                                           = total_reserved + 1
                                           → ĐỌC LẠI giá trị mới = 100
                                           → ghi 101
t11                                      INSERT reservation B
t12                                      COMMIT   ← B cũng thành công!

   KẾT QUẢ: total_reserved = 101 > total_inventory = 100
            Hai reservation, một phòng.  ✗ DOUBLE BOOKING
```

Vấn đề nằm ở khoảng **t2 → t7**: A đọc một giá trị, *quyết định dựa trên giá trị đó*, rồi mới ghi. Trong khoảng thời gian ấy giá trị có thể đã thay đổi. Đây chính là **race condition kinh điển read-modify-write**, hay theo ngôn ngữ ANSI SQL là **lost update** / **write skew** tuỳ biến thể.

Một chi tiết tinh tế đáng nói ra để ghi điểm: ở bước t10, câu `UPDATE ... SET total_reserved = total_reserved + 1` **tự nó là nguyên tử** — PostgreSQL/MySQL sẽ khoá dòng, đọc lại giá trị mới nhất (100), rồi cộng. Nên phép cộng không bị mất. Cái bị mất là **quyết định** ở bước t6, vốn dựa trên dữ liệu đã cũ. Đây là lý do "dùng `SET x = x + 1` là đủ" là câu trả lời sai: nó bảo vệ phép cộng chứ không bảo vệ điều kiện.

> ⚠️ **Bẫy hay gặp**: Ứng viên nói "em bọc trong transaction là xong". Hãy hỏi ngược chính mình: *transaction ở isolation level nào?* Chỉ `SERIALIZABLE` mới ngăn được tình huống trên một cách tự động — và nó ngăn bằng cách **abort một trong hai transaction**, tức bạn vẫn phải viết retry.

### 5.3. Còn một dạng double booking nữa: cùng một user bấm hai lần

Trước khi đi vào locking, hãy tách bạch hai vấn đề **khác nhau** mà người ta hay gộp:

| | Nhiều user tranh một phòng | Một user bấm hai lần |
|---|---|---|
| Bản chất | Race condition trên tài nguyên chung | Duplicate request |
| Triệu chứng | Bán quá tồn kho | User bị trừ tiền hai lần, có hai booking trùng |
| Cách chữa | Locking / constraint trên inventory | **Idempotency key** trên reservation |
| Có lock cũng không chữa được? | — | Đúng: lock hoàn hảo vẫn cho phép cùng user tạo 2 booking hợp lệ |

Hai vấn đề, hai cách chữa, không thay thế được cho nhau. Nói rõ điều này ra là một điểm cộng lớn.

### 5.4. Cách 1 — Pessimistic locking (khoá bi quan)

Ý tưởng: *"Tôi giả định sẽ có tranh chấp, nên tôi khoá trước, làm xong mới nhả."*

Trong MySQL/PostgreSQL, ta đổi `SELECT` thường thành `SELECT ... FOR UPDATE`:

```sql
BEGIN;

SELECT date, total_inventory, total_reserved, overbooking_pct
FROM room_type_inventory
WHERE hotel_id = :hotelId
  AND room_type_id = :roomTypeId
  AND date >= :startDate AND date < :endDate
ORDER BY date            -- ★ bắt buộc: xem phần deadlock bên dưới
FOR UPDATE;              -- ★ khoá độc quyền các dòng này tới khi COMMIT

-- kiểm tra ở tầng app (giờ đã an toàn: không ai đọc/ghi được các dòng này)
-- UPDATE
-- INSERT reservation

COMMIT;   -- lock được nhả ở đây
```

Timeline lúc này thay đổi hẳn:

```
   Transaction A                          Transaction B
   ─────────────────                      ─────────────────
t1 BEGIN
t2 SELECT ... FOR UPDATE
     → giữ lock trên 3 dòng (01,02,03)
     → đọc 99
t3                                        BEGIN
t4                                        SELECT ... FOR UPDATE
                                            → ⏳ BLOCKED, chờ A
t5 check 99+1 <= 100 ✓
t6 UPDATE → 100
t7 INSERT reservation A
t8 COMMIT → nhả lock
t9                                        → ⏵ được chạy tiếp
                                            → đọc lại: 100 (giá trị MỚI)
t10                                       check 100+1 <= 100  ✗
t11                                       ROLLBACK → 409 hết phòng ✓ ĐÚNG
```

Tranh chấp được **tuần tự hoá**. B chờ, rồi đọc dữ liệu mới nhất, rồi từ chối đúng.

**Ưu điểm.** Đơn giản để lý luận: chỉ một transaction chạm vào dòng tại một thời điểm. Không có retry, không có xung đột phải xử lý ở tầng app. Khi contention **cao**, đây lại là lựa chọn *hiệu quả hơn* optimistic, vì optimistic sẽ rollback liên tục và lãng phí công.

**Nhược điểm 1 — Deadlock.** Đây là vấn đề thật, không phải lý thuyết. Một booking khoá *nhiều* dòng (mỗi đêm một dòng). Nếu hai transaction khoá theo thứ tự khác nhau:

```
   A đặt 01→03 (khoá dòng ngày 01, 02)
   B đặt 02→04 (khoá dòng ngày 02, 03)

   A khoá được ngày 01 ─┐
   B khoá được ngày 02 ─┤
   A xin khoá ngày 02 → chờ B  ──┐
   B xin khoá ngày 03 → ok       │  vòng chờ
   B xin khoá ngày 02 (đã có)    │
   ...                            
   → nếu thứ tự khoá đảo nhau giữa các transaction → DEADLOCK
   → DB phát hiện sau ~1s, kill một transaction, ném lỗi 40001/1213
```

**Cách chữa: luôn khoá theo một thứ tự toàn cục cố định** — ở đây là `ORDER BY date`. Nếu mọi transaction đều khoá dòng theo thứ tự ngày tăng dần, vòng chờ không thể hình thành. Đây là một mẹo nhỏ nhưng cực kỳ đắt giá khi phỏng vấn: nó cho thấy bạn đã thực sự gặp deadlock trong đời, không chỉ đọc sách.

**Nhược điểm 2 — Throughput sụp khi transaction dài.** Lock được giữ **từ lúc `FOR UPDATE` tới lúc `COMMIT`**. Nếu giữa hai mốc đó bạn gọi payment gateway (300ms – 3s, đôi khi timeout 30s), thì bạn đang khoá tồn kho của cả khách sạn trong 3 giây cho **một** khách. 30 người xếp hàng = 90 giây. Người thứ 30 bỏ đi. Tệ hơn, connection pool của DB bị chiếm hết bởi các transaction đang chờ, và **toàn bộ hệ thống** (kể cả các khách sạn khác) đứng hình.

> ⚠️ **Quy tắc sắt**: **Không bao giờ giữ database lock qua một lời gọi mạng ra ngoài.** Không gọi payment, không gọi email, không gọi service khác trong lúc đang giữ `FOR UPDATE`. Nếu luồng nghiệp vụ bắt buộc phải làm thế, đó là dấu hiệu bạn cần tách thành nhiều transaction ngắn + trạng thái trung gian (chính là mô hình **hold** ở deep dive 2).

**Nhược điểm 3 — Không mở rộng qua nhiều database.** Lock là chuyện nội bộ của một DB instance. Nếu sau này shard, lock không còn tác dụng xuyên shard. (Với bài này thì không sao vì mọi dòng của cùng một `hotel_id` nằm cùng shard.)

**Biến thể đáng nhắc:** `SELECT ... FOR UPDATE NOWAIT` (lỗi ngay thay vì chờ) và `SELECT ... FOR UPDATE SKIP LOCKED` (bỏ qua dòng đang bị khoá — rất hay cho worker queue, nhưng **sai** cho inventory vì bỏ qua dòng nghĩa là bỏ qua ràng buộc).

### 5.5. Cách 2 — Optimistic locking (khoá lạc quan)

Ý tưởng ngược lại: *"Tôi giả định hiếm khi tranh chấp. Cứ làm, tới lúc ghi mới kiểm tra xem có ai chen ngang không. Nếu có thì làm lại."*

Thêm một cột `version` (hoặc `updated_at`, nhưng **version tốt hơn** vì đồng hồ server có thể lệch và hai update trong cùng một mili-giây sẽ không phân biệt được):

```sql
-- Bước 1: đọc, KHÔNG khoá
SELECT date, total_inventory, total_reserved, version
FROM room_type_inventory
WHERE hotel_id=:h AND room_type_id=:rt
  AND date >= :start AND date < :end;
-- giả sử ngày 01 có version = 42, total_reserved = 99

-- Bước 2: kiểm tra ở app (bình thường)

-- Bước 3: ghi CÓ ĐIỀU KIỆN — đây là mấu chốt
UPDATE room_type_inventory
SET total_reserved = total_reserved + :roomCount,
    version = version + 1
WHERE hotel_id=:h AND room_type_id=:rt AND date = '2026-07-01'
  AND version = 42;          -- ★ chỉ ghi nếu version chưa đổi

-- Nếu affected_rows = 0 → có người chen ngang → ROLLBACK toàn bộ, RETRY từ đầu
```

Timeline:

```
   Transaction A                          Transaction B
   ─────────────────                      ─────────────────
t1 SELECT → reserved=99, version=42
t2                                        SELECT → reserved=99, version=42
t3 UPDATE ... WHERE version=42
     → 1 row affected, version→43
t4 COMMIT ✓
t5                                        UPDATE ... WHERE version=42
                                            → 0 rows affected!  (version giờ là 43)
t6                                        ROLLBACK
t7                                        RETRY: SELECT → reserved=100, ver=43
t8                                        check 100+1 <= 100 ✗ → 409 ✓ ĐÚNG
```

**Ưu điểm.** Không giữ lock nào ở DB, nên không có hàng đợi, không có deadlock kiểu lock-wait, không có chuyện một transaction chậm kéo cả hệ thống. Khi contention **thấp** — đúng như bài này — gần như không bao giờ retry, nên hiệu năng tốt hơn pessimistic. Nó cũng hoạt động qua nhiều DB, nhiều region, và trên cả NoSQL (DynamoDB conditional write chính là optimistic locking).

**Nhược điểm.** Khi contention **cao**, tỉ lệ retry tăng vọt và bạn đốt công vô ích — mỗi lần retry là một vòng đọc + kiểm tra + ghi hỏng. Trong trường hợp xấu, một số request bị "đói" (starvation): cứ thử là thua. Ngoài ra, code ứng dụng phải tự viết retry loop, và retry loop phải **có giới hạn số lần + exponential backoff + jitter**, nếu không bạn tạo ra một cơn bão retry tự khuếch đại.

Retry loop nên trông như thế này:

```
MAX_RETRY = 3
for attempt in 0..MAX_RETRY:
    try:
        result = tryReserve(...)          # một transaction ngắn, đầy đủ
        return result
    except OptimisticConflict:
        if attempt == MAX_RETRY:
            return 409 "Phòng vừa được đặt hết, vui lòng thử lại"
        sleep(random(0, 50ms * 2^attempt))   # backoff + jitter
```

Một điểm tinh tế: khi retry, **phải đọc lại dữ liệu**, không được dùng lại giá trị cũ. Và số lần retry nên nhỏ (2–3) — nếu 3 lần đều thua thì gần như chắc chắn phòng đã hết thật, báo cho user còn tốt hơn là để họ chờ.

### 5.6. Cách 3 — Database constraint

Ý tưởng: *"Để chính database làm trọng tài. Nếu một phép ghi làm vi phạm quy tắc kinh doanh, DB từ chối ghi."*

```sql
ALTER TABLE room_type_inventory
ADD CONSTRAINT chk_inventory
CHECK (total_reserved >= 0
       AND total_reserved <= total_inventory * (1 + overbooking_pct / 100.0));
```

(Với MySQL 8+ dùng `CHECK`; MySQL 5.7 không thực thi `CHECK` nên phải dùng trigger hoặc `UPDATE ... WHERE` có điều kiện.)

Giờ luồng đặt phòng đơn giản đi rất nhiều — **bỏ hẳn bước SELECT kiểm tra**:

```sql
BEGIN;

UPDATE room_type_inventory
SET total_reserved = total_reserved + :roomCount
WHERE hotel_id=:h AND room_type_id=:rt
  AND date >= :start AND date < :end;
-- Nếu BẤT KỲ dòng nào vi phạm CHECK → DB ném lỗi → cả UPDATE fail

INSERT INTO reservation (...) VALUES (...);

COMMIT;
-- Bắt exception constraint violation → 409 NOT_ENOUGH_INVENTORY
```

Điều đẹp ở đây: `UPDATE` trên một dòng **vốn dĩ đã khoá dòng đó** trong suốt transaction, và DB đọc giá trị mới nhất để cộng. Cộng thêm `CHECK`, ta có một thao tác "kiểm tra và trừ" nguyên tử **không có khe hở nào** giữa đọc và ghi. Race condition ở mục 5.2 biến mất về mặt cấu trúc, chứ không phải bị vá.

Một biến thể tương đương, không cần `CHECK`, dùng khi DB không hỗ trợ — **đẩy điều kiện vào mệnh đề `WHERE`**:

```sql
UPDATE room_type_inventory
SET total_reserved = total_reserved + :roomCount
WHERE hotel_id=:h AND room_type_id=:rt
  AND date >= :start AND date < :end
  AND total_reserved + :roomCount
      <= total_inventory * (1 + overbooking_pct/100.0);   -- ★ điều kiện ở đây

-- affected_rows phải == số đêm. Nếu ít hơn → có đêm không đủ phòng → ROLLBACK
```

Cách này rất đáng nhớ vì nó là **cùng một ý tưởng với optimistic locking** (ghi có điều kiện), nhưng điều kiện là chính quy tắc kinh doanh thay vì một con số version. Và nó chuyển thẳng được sang DynamoDB `ConditionExpression`.

**Ưu điểm.** Dễ implement nhất — một dòng DDL. Là **tuyến phòng thủ cuối cùng**: ngay cả khi một service khác, một script migration, một anh DBA gõ tay `UPDATE` nhầm, constraint vẫn chặn. Đây là giá trị lớn nhất của nó, và là lý do bạn nên **luôn bật constraint kể cả khi đã dùng lock**.

**Nhược điểm.** Logic nghiệp vụ nằm trong DDL nên khó version-control, khó test, khó review cùng code (phải đi qua migration). Thông báo lỗi trả về từ DB thô, phải map lại thành lỗi nghiệp vụ có nghĩa. Không phải DB nào cũng hỗ trợ đầy đủ. Và giống optimistic, khi contention cao thì tỉ lệ thất bại tăng (dù chi phí mỗi lần thất bại rẻ hơn vì không cần vòng SELECT riêng).

### 5.7. Bảng so sánh và khuyến nghị

| Tiêu chí | Pessimistic (`FOR UPDATE`) | Optimistic (version) | DB constraint (`CHECK`) |
|---|---|---|---|
| Cơ chế | Khoá dòng tới khi COMMIT | Ghi có điều kiện trên `version` | Ghi có điều kiện trên quy tắc nghiệp vụ |
| Số round-trip DB | 2 (select+update) trong 1 tx | 2, ×(1+tỉ lệ retry) | **1** (chỉ update) |
| Hành vi khi contention thấp | Tốt, nhưng tốn lock | **Rất tốt**, gần như không retry | **Rất tốt** |
| Hành vi khi contention cao | **Tốt nhất** (xếp hàng, không lãng phí) | Kém (bão retry, có thể starvation) | Kém–trung bình (fail nhanh, rẻ) |
| Deadlock | **Có** — phải `ORDER BY` cố định | Không | Không (nhưng vẫn có lock-wait trên cùng dòng) |
| Rủi ro giữ lock qua network call | **Rất cao** — nguy hiểm nhất | Không | Không |
| Độ phức tạp ở tầng app | Thấp | Cao (retry + backoff) | Rất thấp (bắt exception) |
| Bảo vệ khỏi bug của service khác | Không | Không | **Có** — bảo vệ ở tầng dữ liệu |
| Version-control / test được | Có (là code app) | Có (là code app) | Kém (nằm trong DDL) |
| Hoạt động xuyên shard/region | Không | Có | Chỉ trong phạm vi một DB |
| Chuyển sang NoSQL được không | Không | Có (DynamoDB conditional write) | Có (`ConditionExpression`) |

**Khuyến nghị cho bài này:** dùng **kết hợp**, không chọn một.

1. **Tuyến chính: DB constraint + `UPDATE` có điều kiện.** Vì contention tổng thể thấp, vì nó chỉ tốn một round-trip, vì nó không có khe hở read-modify-write. Đây là thao tác đặt phòng mặc định.
2. **Bật `CHECK` như lưới an toàn vĩnh viễn**, kể cả khi đã có (1). Không tốn gì, mà chặn được mọi đường ghi sai từ bất kỳ đâu.
3. **Optimistic + retry ở tầng app** cho các luồng cần đọc-rồi-quyết-định phức tạp hơn (ví dụ: tính giá theo occupancy rồi mới trừ, hoặc admin điều chỉnh tồn kho).
4. **Pessimistic `FOR UPDATE`** chỉ dùng cho **các đợt cao điểm cực đoan** được biết trước (ngày mở bán sự kiện lớn) hoặc cho các thao tác admin cần đọc nhất quán nhiều dòng — và **luôn kèm `ORDER BY date`**, **luôn giữ transaction ngắn**, **tuyệt đối không có network call bên trong**.

> 💡 **Câu trả lời ăn điểm khi phỏng vấn**: *"Ba cách này không loại trừ nhau, chúng ở ba tầng khác nhau. Constraint là bất biến ở tầng dữ liệu — luôn bật. Ghi có điều kiện là cách tôi thực thi nghiệp vụ — mặc định. Lock bi quan là công cụ tôi rút ra khi profile cho thấy tỉ lệ retry vượt ngưỡng. Tôi bắt đầu từ cái rẻ nhất và chỉ leo thang khi có số liệu."*

### 5.8. Nói thêm về isolation level

Người phỏng vấn cấp cao sẽ hỏi: *"Sao không đơn giản là đặt `SERIALIZABLE`?"*

Câu trả lời trung thực: **có thể, và nó đúng, nhưng bạn vẫn phải viết retry.**

| Isolation level | Ngăn được kịch bản 5.2? | Cái giá |
|---|---|---|
| `READ UNCOMMITTED` | Không | — |
| `READ COMMITTED` (mặc định PostgreSQL) | **Không** | Rẻ nhất |
| `REPEATABLE READ` (mặc định MySQL InnoDB) | Không hoàn toàn — MySQL dùng gap lock nên chặn được nhiều trường hợp; PostgreSQL thì abort với lỗi serialization | Trung bình |
| `SERIALIZABLE` | **Có** | PostgreSQL dùng SSI: theo dõi phụ thuộc đọc/ghi, **abort** transaction vi phạm → bạn **bắt buộc** phải có retry loop. Throughput giảm đáng kể khi contention cao. |

Nghĩa là `SERIALIZABLE` không miễn cho bạn việc xử lý xung đột — nó chỉ chuyển việc phát hiện xung đột từ code của bạn sang engine. Với một thao tác đơn giản như "cộng có điều kiện", viết thẳng `UPDATE ... WHERE ... AND <điều kiện>` vừa rẻ hơn vừa rõ ràng hơn nhiều so với nâng isolation cho toàn bộ hệ thống.

> ⚠️ **Bẫy**: Nâng isolation level toàn cục để chữa một race condition cục bộ là một quyết định rất đắt và rất khó rút lại. Hãy nâng isolation cho **đúng transaction cần**, không phải cho cả connection pool.

---

## Deep dive 2 — Idempotency, hold, và overbooking có chủ đích

### 6.1. Vì sao "user bấm hai lần" là chuyện thường, không phải chuyện hiếm

Ứng viên hay coi nhẹ vấn đề này vì nghĩ "thì disable cái nút là xong". Nhưng hãy đếm xem có bao nhiêu đường dẫn tới một request trùng:

- User bấm "Xác nhận", spinner quay 4 giây, họ sốt ruột bấm lại. **Đây là hành vi mặc định của con người khi không có phản hồi.**
- Mạng 4G chập chờn: request đi tới server, server xử lý xong, nhưng response mất trên đường về. Client timeout và **tự động retry** — đây là hành vi mặc định của gần như mọi HTTP client library.
- Load balancer hoặc API Gateway có retry policy riêng, retry khi gặp 502/504.
- User bấm nút Back của trình duyệt rồi submit lại form.
- Message queue giữa các service đảm bảo **at-least-once delivery** — nghĩa là nó *sẽ* giao trùng, đó là hợp đồng của nó.
- User mở hai tab.

Vô hiệu hoá nút bấm chỉ chặn được đường thứ nhất, và còn không chắc (JS tắt, app crash rồi mở lại). Năm đường còn lại nằm ngoài tầm kiểm soát của frontend. Khi có tiền tham gia, "gần như không bao giờ trùng" là không đủ.

### 6.2. Cơ chế: `reservationId` sinh phía client + `UNIQUE` constraint

```
[1] User mở trang thanh toán
        frontend sinh reservationId = UUIDv4 "3f2b1c7e-..."
        (sinh MỘT LẦN, lưu trong state của trang)

[2] Bấm "Xác nhận" lần 1  ──POST /v1/reservations {id: 3f2b1c7e-...}──►
        server: BEGIN
                UPDATE inventory ...           (trừ tồn kho)
                INSERT reservation (id='3f2b1c7e-...', ...)
                COMMIT  ✓
        ◄── 201 CONFIRMED   (nhưng response này MẤT trên đường về)

[3] User bấm lại       ──POST /v1/reservations {id: 3f2b1c7e-...}──►
        server: BEGIN
                UPDATE inventory ...
                INSERT reservation (id='3f2b1c7e-...')
                  ✗ ERROR: duplicate key violates unique constraint
                ROLLBACK        ← ★ tồn kho ĐƯỢC hoàn nguyên tự động
        server: SELECT * FROM reservation WHERE id='3f2b1c7e-...'
        ◄── 200 CONFIRMED   (trả lại kết quả của lần 1)
```

Cái đẹp của thiết kế này: **`id` của bảng `reservation` vừa là primary key vừa là idempotency key.** Không cần bảng phụ, không cần Redis, không cần TTL. Và vì `INSERT` trùng nằm **trong cùng transaction** với `UPDATE` tồn kho, khi nó fail thì `ROLLBACK` tự động trả lại tồn kho đã trừ — không có chuyện tồn kho bị trừ hai lần rồi phải đi sửa tay.

Vì sao client sinh chứ không phải server? Vì nếu server sinh, thì lần bấm thứ hai server **không có cách nào biết** đó là cùng một ý định — nó sẽ sinh một id mới và tạo booking mới. Client là bên duy nhất biết "đây vẫn là lần đặt phòng đó". Nói cách khác: **idempotency key phải được sinh ở nơi biết được ranh giới của ý định người dùng.**

Vài chi tiết triển khai đáng nêu:

- **Trả 200 chứ không phải 409** khi trùng, kèm đúng nội dung của bản ghi gốc. 409 sẽ khiến user hoảng, còn 200 thì họ thấy y hệt lần đầu — đúng định nghĩa idempotent.
- **Phải so khớp payload.** Nếu cùng `reservationId` nhưng ngày/số phòng khác nhau, đó không phải retry mà là lỗi client (hoặc tấn công). Trả `422 IDEMPOTENCY_KEY_REUSED`. Cách làm thực tế: lưu hash của request body cùng bản ghi và đối chiếu.
- **Tình huống "đang xử lý".** Nếu request 2 đến khi request 1 còn chưa commit, request 2 sẽ **bị chặn** ở unique index cho tới khi request 1 xong (ở PostgreSQL, unique index gây lock-wait trên key trùng). Sau đó nó thấy conflict và trả kết quả đúng. Hành vi này miễn phí và rất tiện.
- Với API Gateway/Stripe-style, header `Idempotency-Key` là cách chuẩn hoá cùng ý tưởng ở tầng hạ tầng.

> 💡 **Nguyên tắc**: Idempotency chữa **duplicate**, locking chữa **race**. Bạn cần cả hai. Một hệ thống có lock hoàn hảo vẫn tạo hai booking khi user bấm hai lần; một hệ thống idempotent hoàn hảo vẫn bán quá phòng khi hai người cùng bấm.

Và đừng quên **huỷ cũng phải idempotent**: `DELETE /v1/reservations/{id}` gọi hai lần phải chỉ hoàn tồn kho một lần. Cách làm: chuyển trạng thái có điều kiện.

```sql
UPDATE reservation SET status='CANCELLED', cancelled_at=now()
WHERE id = :id AND status = 'CONFIRMED';     -- ★ chỉ đổi nếu đang CONFIRMED
-- affected_rows = 0 → đã huỷ rồi → trả 200, KHÔNG hoàn tồn kho lần nữa
-- affected_rows = 1 → mới huỷ → UPDATE inventory SET total_reserved -= room_count
```

Đây lại chính là **ghi có điều kiện** — cùng một khuôn mẫu lặp lại lần thứ ba trong bài. Nếu bạn chỉ mang một ý tưởng ra khỏi bài này, hãy mang ý tưởng đó.

### 6.3. Giữ chỗ tạm (hold) trong lúc thanh toán

Ta đã nói không được giữ DB lock qua lời gọi payment. Nhưng cũng không được để tồn kho "tự do" trong lúc user nhập thẻ — nếu không, hai người cùng nhập thẻ, cả hai cùng trả tiền, rồi một người phải bị hoàn tiền kèm lời xin lỗi. Giải pháp: **hold**, tức trừ tồn kho trước, có hạn dùng.

```
t0  POST /v1/reservations  (chưa thanh toán)
      ┌─ transaction NGẮN (vài ms) ────────────────────┐
      │ UPDATE inventory SET total_reserved += n       │
      │   WHERE ... AND <điều kiện đủ phòng>           │
      │ INSERT reservation(status='PENDING',           │
      │        hold_expires_at = now() + 10 phút)      │
      │ COMMIT                                         │
      └────────────────────────────────────────────────┘
      → 202 { reservationId, status: PENDING, expiresAt }
      → tồn kho ĐÃ bị trừ, KHÔNG có lock nào đang giữ

t1  Client gọi Payment Service (mất 0.5–30 giây, có thể fail)

t2a  Thanh toán OK → UPDATE reservation SET status='CONFIRMED'
                      WHERE id=? AND status='PENDING'
                   → không đụng tới inventory (đã trừ từ t0)

t2b  Thanh toán FAIL / user bỏ đi / hết 10 phút
     → Reaper job (chạy mỗi phút):
         SELECT id FROM reservation
         WHERE status='PENDING' AND hold_expires_at < now()
         FOR UPDATE SKIP LOCKED LIMIT 500;
         → với mỗi cái: status='EXPIRED'
                        UPDATE inventory SET total_reserved -= room_count
```

Mô hình này đổi **một transaction dài** thành **hai transaction ngắn + một trạng thái trung gian + một job dọn dẹp**. Đó là khuôn mẫu chung để loại bỏ lock dài ở mọi hệ thống, và nó cũng chính là bước đệm để hiểu Saga ở phần sau.

Vài lưu ý thực chiến:

- **Thời gian hold** là một trade-off kinh doanh: ngắn quá thì user chậm tay mất chỗ và bực; dài quá thì tồn kho bị "giam" và khách sạn mất doanh thu. 10–15 phút là con số phổ biến. Vé máy bay và vé concert thường 5–8 phút.
- **Reaper job phải idempotent và phải chạy đáng tin.** Nếu nó chết, tồn kho bị giam vĩnh viễn — một dạng rò rỉ tài nguyên rất khó phát hiện. Phải có alert "số reservation PENDING quá hạn > X".
- **`SKIP LOCKED`** ở đây là đúng chỗ: nhiều worker cùng dọn mà không giẫm chân nhau.
- **Webhook thanh toán đến muộn** sau khi hold đã hết hạn là tình huống ác mộng: tiền đã trừ mà phòng đã trả lại. Xử lý: khi nhận webhook cho một reservation `EXPIRED`, thử **giành lại tồn kho** (`UPDATE ... WHERE <đủ phòng>`); nếu được thì `CONFIRMED`, nếu không thì tự động hoàn tiền và gửi xin lỗi. Nói được tình huống này ra là dấu hiệu bạn đã làm hệ thống thanh toán thật.

### 6.4. Overbooking có chủ đích

Khách sạn **cố ý** bán quá số phòng, thường 5–15%, vì thống kê cho thấy một tỉ lệ khách sẽ huỷ muộn hoặc no-show. Nếu bán đúng 100%, khách sạn sẽ chạy ở khoảng 92–95% công suất thực và mất tiền vào những phòng trống oan.

Mô hình hoá rất gọn — ta đã đặt sẵn cột `overbooking_pct` trên từng dòng inventory:

```sql
-- điều kiện bán hàng, dùng ở cả UPDATE có điều kiện lẫn CHECK constraint
total_reserved + :roomCount <= FLOOR(total_inventory * (1 + overbooking_pct/100.0))
```

Vì sao đặt `overbooking_pct` **trên từng dòng (hotel, room_type, date)** chứ không phải một hằng số toàn cục?

| Trường hợp | Cấu hình |
|---|---|
| Ngày thường, khách sạn công tác (tỉ lệ huỷ cao) | 15% |
| Đêm giao thừa, sự kiện lớn trong thành phố (không ai huỷ, không còn phòng nào trong thành phố để "walk" khách sang) | **0%** |
| Loại suite cao cấp, chỉ có 4 phòng | 0% — không có phòng tương đương để bù |
| Loại phòng standard, 200 phòng | 10% |

Tức là tỉ lệ overbooking là một **biến số vận hành**, thay đổi theo ngày, theo loại phòng, theo dự báo. Đặt nó vào dữ liệu chứ không vào code là quyết định thiết kế đúng. Trong thực tế, con số này do một mô hình dự báo (revenue management) sinh ra hằng đêm và ghi đè.

Và phải nói cả mặt trái: khi overbooking "nổ" — khách đến mà hết phòng thật — khách sạn phải **walk the guest**: bố trí khách sạn khác cùng hạng, trả tiền chênh lệch, trả taxi, tặng đêm miễn phí. Chi phí này rất thật, nên bài toán tối ưu `overbooking_pct` là cân bằng giữa doanh thu phòng trống và chi phí walk. Hệ thống cần:

- Một **báo cáo rủi ro** hằng ngày: ngày nào `total_reserved > total_inventory` và bao nhiêu.
- Cơ chế **ưu tiên** khi phải walk (khách loyalty cao, khách ở dài ngày được giữ lại).
- Khả năng **ngắt overbooking khẩn cấp**: set `overbooking_pct = 0` cho một dải ngày — và điều này an toàn vì constraint chỉ chặn **lần bán tiếp theo**, không huỷ các booking đã có.

> ⚠️ **Bẫy**: Đừng implement overbooking bằng cách "cho phép `total_reserved` vượt `total_inventory` tuỳ ý rồi kiểm tra ở tầng app". Ngưỡng phải nằm trong constraint, nếu không bạn đã vứt bỏ lưới an toàn cuối cùng và một bug ở app có thể bán 300%.

---

## Deep dive 3 — Microservices và distributed transaction

### 7.1. Cái giá của việc tách service

Trong thiết kế trên, ta cố ý giữ **reservation + inventory chung một service, chung một database**. Người phỏng vấn sẽ chất vấn: *"Thế thì đâu còn là microservice? Mỗi service phải có DB riêng chứ."*

Đây là câu hỏi bẫy, và câu trả lời hay nhất là **bảo vệ lựa chọn bằng cách chỉ ra cái giá của lựa chọn kia**.

```
  MONOLITH / shared DB                  PURE MICROSERVICE
  ─────────────────────                 ──────────────────
  BEGIN                                 Reservation Svc: INSERT reservation ✓
    UPDATE inventory                    Inventory  Svc: UPDATE inventory   ✓
    INSERT reservation                  Payment    Svc: charge card        ✗ FAIL
    (payment ở ngoài)                    
  COMMIT  ← nguyên tử, DB lo             → ai rollback hai cái đầu?
          ← fail thì rollback hết        → không có COMMIT chung
                                         → phải TỰ VIẾT logic bù trừ
```

Khi `reservation` và `room_type_inventory` nằm trong cùng một database, thao tác quan trọng nhất của hệ thống — "trừ tồn kho và ghi booking" — là **một local transaction**, nguyên tử miễn phí, do engine đảm bảo, đã được kiểm chứng hàng chục năm.

Khi tách ra hai service hai DB, chính thao tác đó trở thành **distributed transaction**, và bạn phải tự xây lại tính nguyên tử bằng tay. Bạn đánh đổi một thứ đã đúng sẵn lấy một thứ bạn phải tự làm đúng.

> 💡 **Nguyên tắc**: Ranh giới service nên cắt ở nơi **ít cần tính nguyên tử nhất**. Nếu hai thực thể luôn phải thay đổi cùng nhau trong một transaction, chúng thuộc về **cùng một service**. Đó chính là định nghĩa của aggregate trong DDD, và `(reservation, inventory)` là một aggregate kinh điển.

Nhưng payment thì **bắt buộc** phải tách — vì lý do tuân thủ PCI-DSS, vì nó gọi ra bên thứ ba, vì nó có vòng đời bất đồng bộ riêng. Nên dù có giữ reservation+inventory chung, ta **vẫn có** một distributed transaction giữa reservation và payment. Không tránh được. Vậy giải quyết thế nào?

### 7.2. Two-phase commit (2PC) — và vì sao ít ai dùng

2PC có một coordinator điều phối tất cả participant qua hai pha:

```
  Pha 1 — PREPARE (bỏ phiếu)
    Coordinator ──"prepare?"──► Reservation DB   ──"YES" (đã ghi log, đã khoá)
                 ──"prepare?"──► Inventory DB     ──"YES"
                 ──"prepare?"──► Payment DB       ──"YES"

  Pha 2 — COMMIT
    Coordinator ──"commit!"───► tất cả  → mọi bên commit

  Nếu BẤT KỲ ai trả "NO" ở pha 1 → coordinator gửi "abort" cho tất cả.
```

Nó **đúng** — đây là giao thức duy nhất trong danh sách cho bạn ACID thật sự xuyên nhiều node. Nhưng nó gần như không được dùng trong hệ thống internet hiện đại, vì:

**Một, blocking.** Giữa "YES" và "commit", mỗi participant phải **giữ lock**. Nếu coordinator chết đúng lúc đó, participant kẹt vô thời hạn — không dám commit (có thể người khác đã abort), không dám abort (có thể người khác đã commit). Đây gọi là *in-doubt transaction*, và cách duy nhất thoát ra là con người vào can thiệp.

**Hai, latency là tổng của bên chậm nhất.** Hai vòng round-trip tới tất cả participant. Một service chậm làm chậm tất cả.

**Ba, coordinator là single point of failure**, và làm coordinator HA thì phải có consensus — tức là bạn vừa xây một nửa Paxos.

**Bốn, gần như không dùng được với bên thứ ba.** Stripe không tham gia 2PC của bạn. HTTP API không có pha prepare. Mà payment gateway chính là thứ bạn cần phối hợp nhất.

**Năm, không có sẵn.** Cần XA transaction, cần DB hỗ trợ, cần transaction manager. Kafka, Redis, DynamoDB, REST API đều không tham gia được.

Kết luận nên nói ra: *"2PC đúng về lý thuyết nhưng không phù hợp ở đây, vì nó blocking và vì payment gateway bên ngoài không thể là participant. Tôi sẽ dùng Saga."*

### 7.3. Saga pattern

Saga đổi mục tiêu: thay vì *nguyên tử*, ta chấp nhận **nhất quán cuối cùng (eventual consistency)**. Một nghiệp vụ dài được chia thành **chuỗi local transaction**; mỗi bước commit ngay lập tức ở service của mình; nếu một bước sau thất bại, ta chạy **compensating transaction** (giao dịch bù) để hoàn tác các bước trước.

Điểm mấu chốt về mặt tư duy: **compensating transaction không phải rollback.** Rollback xoá dấu vết như chưa từng xảy ra. Compensation là một hành động **mới**, có ý nghĩa nghiệp vụ riêng, được ghi lại: không phải "xoá khoản trừ tiền" mà là "thực hiện một khoản hoàn tiền". Trên sao kê ngân hàng của khách sẽ có **hai dòng**, không phải không dòng. Đó là bản chất của thế giới không nguyên tử, và nó ổn — vì nghiệp vụ thật vốn vận hành như vậy.

**Luồng đặt phòng dưới dạng saga:**

```
  T1  Reservation Svc : tạo reservation status=PENDING, hold tồn kho
  T2  Payment Svc     : trừ tiền thẻ
  T3  Reservation Svc : reservation → CONFIRMED
  T4  Notification    : gửi email xác nhận

  Nếu T2 FAIL (thẻ bị từ chối):
      C1  Reservation Svc : reservation → FAILED, hoàn tồn kho
      → không cần bù gì thêm, chưa có tiền nào bị trừ

  Nếu T3 FAIL (DB reservation chết sau khi đã trừ tiền):
      C2  Payment Svc     : REFUND toàn bộ      ← compensating transaction
      C1  Reservation Svc : → FAILED, hoàn tồn kho
      → khách thấy 2 dòng trên sao kê: trừ rồi hoàn. Đúng và giải thích được.

  Nếu T4 FAIL (email không gửi được):
      → KHÔNG bù. Booking vẫn hợp lệ. Chỉ retry gửi email.
      → bài học: không phải bước nào cũng cần compensation
```

**Chiều ngược lại — huỷ phòng — cũng là một saga:**

```
  T1  Reservation Svc : CONFIRMED → CANCELLING (ghi có điều kiện, idempotent)
  T2  Payment Svc     : hoàn tiền theo chính sách huỷ (có thể hoàn một phần)
  T3  Reservation Svc : → CANCELLED, hoàn tồn kho
  T4  Notification    : email xác nhận huỷ

  Nếu T2 FAIL (gateway lỗi):
      → KHÔNG bù ngược về CONFIRMED — khách đã yêu cầu huỷ, ép họ ở lại là sai nghiệp vụ.
      → Thay vào đó: retry T2 với backoff, sau N lần thì đưa vào hàng đợi xử lý thủ công.
      → Đây là saga "forward recovery": đi tiếp chứ không lùi.
```

Hai nhận xét đáng giá từ ví dụ trên: **không phải bước nào cũng cần compensation**, và đôi khi cách đúng là **tiến lên phía trước** (retry tới cùng) thay vì lùi lại.

### 7.4. Choreography vs Orchestration

Có hai cách điều phối một saga.

**Choreography (vũ đạo tự phát)** — không có nhạc trưởng. Mỗi service lắng nghe event và tự biết phải làm gì tiếp:

```
 Reservation Svc ──emit ReservationCreated──►┐
                                              │ event bus
 Payment Svc ◄──consume────────────────────── ┤
      │ trừ tiền
      └──emit PaymentSucceeded / PaymentFailed──►┐
                                                  │
 Reservation Svc ◄──consume──────────────────────┤
      │ PaymentSucceeded  → CONFIRMED
      │ PaymentFailed     → FAILED + hoàn tồn kho
      └──emit ReservationConfirmed──►┐
                                      │
 Notification Svc ◄──consume─────────┘  gửi email
```

**Orchestration (có nhạc trưởng)** — một orchestrator giữ state machine và ra lệnh từng bước:

```
                ┌──────────────────────────────┐
                │   Booking Saga Orchestrator  │
                │   (state machine bền vững)   │
                └───┬────────┬────────┬────────┘
        1. hold     │        │ 2. charge       │ 3. confirm
                    ▼        ▼                 ▼
            Reservation   Payment        Reservation
                Svc         Svc               Svc
                    
   Orchestrator lưu trạng thái: đang ở bước nào, đã làm gì,
   nếu bước 2 fail thì gọi compensation nào.
```

| | Choreography | Orchestration |
|---|---|---|
| Ghép nối (coupling) | Lỏng — service chỉ biết event | Chặt hơn — orchestrator biết hết |
| Nhìn thấy luồng ở đâu | **Không ở đâu cả** — phải đọc code của mọi service mới hiểu | Ở **một chỗ** — đọc state machine là hiểu |
| Debug khi hỏng | Khó: phải ghép log từ nhiều service để dựng lại timeline | Dễ: orchestrator có lịch sử execution |
| Thêm bước mới | Thêm consumer, không sửa ai | Sửa orchestrator |
| Rủi ro | Phụ thuộc vòng tròn, event storm, khó biết saga đã xong chưa | Orchestrator thành SPOF và thành "monolith mới" |
| Compensation | Mỗi service tự lo phần mình | Tập trung, dễ đảm bảo đầy đủ |
| Hợp với | Luồng ngắn 2–3 bước, coupling thấp | **Luồng có tiền, nhiều bước, cần audit** |

**Khuyến nghị cho bài này: orchestration cho luồng đặt/huỷ phòng, choreography cho việc phụ.**

Lý do: luồng đặt phòng có tiền, có compensation thật (refund), và khi có sự cố thì bộ phận chăm sóc khách hàng cần trả lời được "booking này đang kẹt ở đâu". Orchestrator cho bạn câu trả lời đó ngay. Ngược lại, các việc phụ — gửi email, cập nhật read model tìm kiếm, đẩy dữ liệu vào data warehouse, cập nhật cache — không cần compensation và không cần thứ tự, nên để chúng tự nghe event là gọn nhất.

> ⚠️ **Bẫy**: Saga khiến hệ thống **luôn ở trạng thái trung gian nhìn thấy được**. Trong khoảng giữa T1 và T3, có một reservation `PENDING` mà tiền đã trừ nhưng chưa `CONFIRMED`. UI phải hiển thị được trạng thái đó ("Đang xử lý..."), và API `GET /reservations/{id}` phải trả về nó một cách trung thực. Nếu bạn thiết kế UI giả định mọi thứ nguyên tử, bạn sẽ có một màn hình trắng và một khách hàng hoảng loạn.

### 7.5. Outbox pattern — mắt xích hay bị bỏ quên

Có một lỗ hổng ở ngay bước đầu tiên của mọi saga, và nó là câu hỏi phỏng vấn sâu nhất trong phần này: **làm sao vừa ghi DB vừa phát event một cách nguyên tử?**

```
  Cách ngây thơ:
      BEGIN
        INSERT reservation ...
        UPDATE inventory ...
      COMMIT                    ✓ thành công
      eventBus.publish(ReservationCreated)   ✗ CRASH ngay đây

  → DB có booking, nhưng KHÔNG AI biết → payment không bao giờ chạy
  → tồn kho bị giam, khách chờ mãi không được xác nhận

  Đảo ngược thứ tự cũng không cứu được:
      eventBus.publish(...)     ✓
      COMMIT                    ✗ FAIL
  → event đã bay đi cho một booking KHÔNG TỒN TẠI
  → payment trừ tiền cho một booking ma
```

Đây là **dual write problem**: hai hệ thống lưu trữ, không có transaction chung. Không có thứ tự nào đúng cả.

**Lời giải: transactional outbox.** Đừng ghi ra hai nơi. Ghi event vào **chính database đó**, trong **chính transaction đó**, rồi để một tiến trình riêng đọc và phát đi.

```sql
CREATE TABLE outbox (
  id            BIGSERIAL PRIMARY KEY,   -- thứ tự phát
  aggregate_id  UUID NOT NULL,           -- reservation_id (dùng làm partition key)
  event_type    VARCHAR(64) NOT NULL,    -- 'ReservationCreated'
  payload       JSONB NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  published_at  TIMESTAMPTZ              -- NULL = chưa phát
);
```

```
  BEGIN
    UPDATE room_type_inventory SET total_reserved = ... WHERE ...
    INSERT INTO reservation (...) VALUES (...)
    INSERT INTO outbox (aggregate_id, event_type, payload)
           VALUES (:resId, 'ReservationCreated', '{...}')   ← ★ cùng transaction
  COMMIT
      ↑ Hoặc CẢ BA cùng có, hoặc CẢ BA cùng không. Không có trạng thái lửng lơ.

  ┌── Relay process (một trong hai cách) ──────────────────────────────┐
  │ (a) Polling: SELECT * FROM outbox WHERE published_at IS NULL       │
  │              ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 100;         │
  │              → publish → UPDATE published_at = now()               │
  │                                                                    │
  │ (b) CDC: Debezium / AWS DMS đọc WAL (PostgreSQL) hoặc binlog       │
  │          (MySQL) → tự động đẩy mọi dòng outbox mới ra Kafka/Kinesis│
  │          → không cần polling, độ trễ mili-giây, không tải thêm DB  │
  └────────────────────────────────────────────────────────────────────┘
```

**Vì sao CDC là cách tốt hơn polling?** Polling đánh vào DB liên tục (dù có index cũng tốn), có độ trễ bằng chu kỳ poll, và cần dọn bảng outbox. CDC đọc **log giao dịch** — thứ mà DB đã phải ghi sẵn cho mục đích replication — nên gần như không tạo tải thêm, độ trễ rất thấp, và **không thể bỏ sót**: mọi commit đều nằm trong log, theo đúng thứ tự commit.

**Đảm bảo mà outbox cho bạn: at-least-once, có thứ tự theo aggregate.** Không phải exactly-once. Relay có thể phát một event rồi chết trước khi đánh dấu `published_at` → event được phát lại. Vì thế **mọi consumer phải idempotent** — và đây là lý do sâu xa vì sao mọi API trong bài này đều phải chịu được gọi lại. Cách chuẩn: consumer lưu `processed_event_ids` (hoặc dùng chính `event_id` làm khoá trong thao tác ghi có điều kiện).

**Ngoài saga, CDC còn dùng để làm gì?** Chính là phương tiện giữ nhất quán cho mọi bản sao dữ liệu phái sinh:

| Đích | Dùng để | Chấp nhận trễ? |
|---|---|---|
| Redis cache inventory | Tăng tốc đọc availability | Có, vài trăm ms |
| OpenSearch read model | Tìm kiếm khách sạn đa tiêu chí | Có, vài giây |
| Data warehouse (Redshift/BigQuery) | Báo cáo doanh thu, occupancy | Có, vài phút |
| Service khác (loyalty, CRM) | Cộng điểm, gửi marketing | Có |

Điểm chung: **tất cả đều là bản sao phái sinh (derived), tất cả đều được phép trễ, và không cái nào trong số đó được phép là nguồn sự thật khi bán phòng.** Ý cuối dẫn thẳng sang phần tiếp theo.

> 💡 **Nguyên tắc**: Hễ bạn thấy code có dạng `save(); publish();` thì bạn đang có một dual write chờ ngày hỏng. Outbox biến nó thành một write duy nhất. Đây là một trong những pattern có tỉ lệ "giá trị/độ phức tạp" cao nhất trong kiến trúc microservices.

---

## Deep dive 4 — Scale đọc, cache, và bẫy cache tồn kho

### 8.1. Ba loại dữ liệu, ba chiến lược cache khác nhau

Sai lầm phổ biến là coi "cache" là một quyết định duy nhất. Ở bài này có **ba loại dữ liệu với tính chất hoàn toàn khác nhau**:

| Dữ liệu | Tần suất đổi | Hậu quả khi cache cũ | Chiến lược |
|---|---|---|---|
| Hotel, room_type, ảnh, tiện nghi | vài tháng/lần | Gần như không có | CDN + Redis, **TTL hàng giờ**, cache thoải mái |
| Giá (`room_type_rate`) | vài lần/ngày | Hiển thị sai giá → phải tôn trọng giá đã hiện, mất chênh lệch | Redis TTL **1–5 phút**, invalidate khi đổi giá |
| **Tồn kho (`room_type_inventory`)** | **liên tục** | **Bán nhầm phòng không tồn tại** | Cache **chỉ để hiển thị**, **không bao giờ để quyết định** |

Hai loại đầu dễ. Loại thứ ba là chỗ người ta ngã.

### 8.2. Cache-miss thì ổn, cache-stale thì chết

Đây là ý quan trọng nhất của phần này, và nó đáng nói thành tiếng trong phỏng vấn:

```
  Cache MISS  → đi xuống DB → chậm hơn 5 ms → KHÔNG SAO CẢ.
  Cache STALE → cache nói "còn 3 phòng" nhưng DB đã hết
                → user thấy "còn phòng", bấm đặt
                → ...và điều gì xảy ra?
```

Câu trả lời phụ thuộc hoàn toàn vào một điều: **bạn có tin cache lúc commit hay không.**

```
  ✗ THIẾT KẾ SAI                          ✓ THIẾT KẾ ĐÚNG
  ───────────────                          ───────────────
  đọc cache → còn 3 phòng                  đọc cache → còn 3 phòng
  → hiển thị "còn phòng"                   → hiển thị "còn phòng"
  → user bấm Đặt                           → user bấm Đặt
  → TRỪ CACHE, ghi booking                 → UPDATE DB có ĐIỀU KIỆN
  → DB đã hết từ lâu                       → DB từ chối (constraint)
  → BÁN NHẦM. Tiền đã trừ.                 → 409 "Phòng vừa hết"
                                            → user tiếc nhưng KHÔNG mất tiền
```

Hệ thống đúng vẫn *có* dữ liệu cũ — không tránh được, vì cache và DB không bao giờ nhất quán tuyệt đối. Nhưng dữ liệu cũ chỉ gây ra một trải nghiệm hơi khó chịu ("phòng vừa được đặt mất"), chứ không gây ra lỗi tài chính. Và trải nghiệm đó **dù sao cũng phải xử lý**: một user mở trang lúc 14:00 rồi bấm đặt lúc 14:20 thì thông tin họ thấy đã cũ 20 phút, kể cả khi bạn không dùng cache chút nào.

> 💡 **Nguyên tắc bất di bất dịch**: **Không bao giờ tin cache tại thời điểm commit.** Cache là để *trả lời nhanh câu hỏi "có nên hy vọng không"*, không phải để *quyết định "có được bán không"*. Quyết định bán chỉ được đưa ra bởi một phép ghi có điều kiện trên nguồn sự thật. Nguyên tắc này áp dụng nguyên xi cho bán vé, flash sale, và mọi hệ thống tồn kho.

Hệ quả thực tế: cache tồn kho thậm chí **nên cố ý hơi bi quan**. Nếu còn 2 phòng, hiển thị "Chỉ còn vài phòng!" thay vì con số chính xác — vừa đúng về mặt kỹ thuật (con số kia có thể đã sai), vừa tốt cho chuyển đổi.

### 8.3. Cách cập nhật cache tồn kho

```
  key:   inv:{hotel_id}:{room_type_id}:{date}
  value: số phòng còn bán được = floor(total_inventory*(1+pct/100)) - total_reserved
  TTL:   60–300 giây, cộng jitter để tránh cache stampede
         (và TTL tự nhiên biến mất với các ngày đã trôi qua)
```

Cập nhật bằng **CDC** chứ không bằng ghi kép trong code ứng dụng — lại là bài học dual write ở mục 7.5: nếu app vừa ghi DB vừa ghi Redis, crash ở giữa sẽ để lại cache sai vĩnh viễn. Với CDC, mọi thay đổi dòng `room_type_inventory` chảy qua stream và một consumer nhỏ cập nhật Redis. Độ trễ điển hình vài chục tới vài trăm mili-giây — hoàn toàn chấp nhận được với nguyên tắc ở 8.2.

Đừng quên **negative caching**: khi DB trả về "hết phòng", cũng cache kết quả đó (TTL ngắn hơn, ~30s). Ngày lễ ở khách sạn hot là truy vấn bị lặp nhiều nhất, và phần lớn câu trả lời là "hết".

### 8.4. Tách read model cho tìm kiếm

Truy vấn "khách sạn ở Đà Nẵng, 01–04/07, 2 người, còn phòng, giá dưới 3 triệu, có hồ bơi, sắp xếp theo đánh giá" **không thuộc về** database giao dịch. Nó là full-text + geo + facet + range, chạm nhiều bảng, quét nhiều dòng, và nếu chạy trên primary sẽ cạnh tranh tài nguyên với chính luồng đặt phòng — tức là một truy vấn tìm kiếm nặng có thể làm chậm việc bán hàng.

```
  Aurora (write model)          CDC           OpenSearch (read model)
  ────────────────────      ─────────►       ───────────────────────
  hotel, room_type,          Debezium/        document mỗi khách sạn,
  room_type_rate,            DMS →            denormalize sẵn: tên, geo,
  room_type_inventory        Kinesis →        tiện nghi, giá min theo ngày,
                             Lambda           cờ "còn phòng" theo dải ngày
  ▲                                                    │
  │ ghi (3 TPS, phải đúng)                             │ đọc (nghìn QPS, được phép trễ)
  │                                                    ▼
  └──────── Reservation Svc ◄─── user bấm "Đặt" ◄── kết quả tìm kiếm
             (kiểm tra lại tồn kho THẬT ở đây)
```

Đây là **CQRS** ở dạng thực dụng nhất: một mô hình tối ưu cho ghi đúng, một mô hình tối ưu cho đọc nhanh, nối với nhau bằng CDC. Và nó tuân thủ nguyên tắc 8.2 — kết quả tìm kiếm có thể trễ vài giây, nhưng khi user bấm "Đặt" thì hệ thống vẫn kiểm tra lại ở nguồn sự thật.

### 8.5. Nếu QPS gấp 1,000 lần (câu hỏi follow-up kinh điển)

Giả sử hệ thống được dùng cho một OTA cỡ Booking.com: ~3,000 booking/giây, vài trăm nghìn read QPS. Thứ tự leo thang nên là:

1. **Read replica trước tiên.** Mọi truy vấn availability/hiển thị đọc từ replica. Chỉ luồng đặt phòng chạm primary. Một bước này đã giải quyết phần lớn tải đọc, và gần như miễn phí. Lưu ý replica lag — nhưng theo nguyên tắc 8.2 thì lag ở đường đọc là chấp nhận được.
2. **Cache tầng trước replica** (Redis) cho hotel/rate/inventory.
3. **Tách read model** cho search như 8.4.
4. **Sharding** khi primary không còn gánh nổi write. Shard key hiển nhiên là **`hotel_id`** — vì *mọi* truy vấn đều có `hotel_id`, nên mọi truy vấn đều là single-shard, và transaction đặt phòng không bao giờ xuyên shard. Đây là một shard key hiếm hoi gần như hoàn hảo. `hash(hotel_id) % 16` với 30,000 QPS cho ra ~1,875 QPS mỗi shard — nằm trong khả năng của một cluster MySQL/Postgres.
5. **Archive** reservation cũ: giữ hiện tại + tương lai trong DB nóng, đẩy quá khứ sang cold storage (S3 + Athena) để bảng `reservation` không phình.

> ⚠️ **Bẫy sharding**: `hotel_id` là shard key tốt nhưng **không đều**. Một khách sạn khổng lồ ở Las Vegas hoặc một chuỗi resort hot có thể tạo hot shard. Chuẩn bị sẵn câu trả lời: tách riêng các hotel nóng ra shard riêng (dedicated shard), hoặc đưa `hotel_id` nóng vào một bảng ánh xạ thủ công thay vì hash thuần.

---

## Bottleneck & failure mode

Câu hỏi cần trả lời được: *cái gì nghẽn trước, và khi từng thành phần chết thì hệ thống trông ra sao?*

**Nghẽn trước tiên — không phải throughput, mà là contention trên một dòng.** Với 3 TPS toàn hệ thống, CPU và IO của DB nhàn rỗi. Nhưng khi mở bán một sự kiện lớn, hàng nghìn request đổ vào đúng một `(hotel_id, room_type_id, date)`. Tất cả tuần tự hoá trên **một row lock**. Throughput tối đa của một dòng là `1 / thời_gian_giữ_lock` — nếu transaction giữ lock 5 ms thì trần là ~200 booking/giây **cho dòng đó**, bất kể bạn có bao nhiêu server. Đây là giới hạn vật lý, và cách duy nhất vượt qua là **chia nhỏ dòng** (ví dụ tách một dòng inventory thành 10 "bucket" mỗi bucket giữ 1/10 tồn kho, request rơi ngẫu nhiên vào một bucket — đổi độ chính xác biên lấy song song, giống striped counter).

| Thành phần chết | Triệu chứng | Cách chịu đựng |
|---|---|---|
| **DB primary** | Không đặt được phòng. Xem phòng vẫn chạy (qua replica/cache). | Multi-AZ failover (~30–60s). Đặt chế độ read-only degraded: vẫn cho duyệt, hiện banner "tạm chưa đặt được". |
| **Read replica** | Đọc dồn về primary → primary có thể sập theo | Circuit breaker: nếu replica lỗi, phục vụ từ cache và **giới hạn tỉ lệ** fallback về primary |
| **Redis cache** | Cache stampede: mọi request đổ xuống DB cùng lúc | TTL có jitter, request coalescing (single-flight), giữ cache tại chỗ (in-process) làm lớp đệm |
| **Payment gateway** | Booking kẹt ở `PENDING`, tồn kho bị giam | Hold expiry + reaper tự trả tồn kho. Circuit breaker. Cho phép "đặt giữ chỗ, trả sau" nếu nghiệp vụ chấp nhận. |
| **CDC / event bus** | Cache và read model bị cũ dần; email không gửi | **Đường bán hàng KHÔNG bị ảnh hưởng** (vì nó chỉ tin DB). Outbox tích lại, phát bù khi hồi phục. Alert theo `outbox` lag. |
| **Reaper job** | Tồn kho rò rỉ, hết phòng ảo | Alert: `COUNT(*) WHERE status='PENDING' AND hold_expires_at < now()` > ngưỡng |
| **Cron tạo inventory** | Ngày xa trong tương lai trả "hết phòng" | Alert: tồn tại (hotel, room_type) thiếu dòng cho `today + 700 ngày` |
| **Saga orchestrator** | Booking kẹt giữa chừng | State machine bền vững (Step Functions) → tự phục hồi sau restart; dashboard execution đang treo |

**Reconciliation job — thứ không được quên.** Mỗi đêm, chạy đối chiếu:

```sql
-- tồn kho có khớp với tổng booking đang hiệu lực không?
SELECT i.hotel_id, i.room_type_id, i.date, i.total_reserved, SUM(r.room_count)
FROM room_type_inventory i
LEFT JOIN reservation r
  ON r.hotel_id = i.hotel_id AND r.room_type_id = i.room_type_id
 AND i.date >= r.start_date AND i.date < r.end_date
 AND r.status IN ('CONFIRMED','PENDING')
GROUP BY 1,2,3
HAVING i.total_reserved <> COALESCE(SUM(r.room_count), 0);
```

Và đối chiếu tiền: tổng tiền trong bảng `reservation` với báo cáo settlement của payment gateway. Trong một hệ thống eventual-consistent có tiền, **reconciliation không phải là tuỳ chọn** — nó là cách bạn phát hiện những bug mà không ai báo cáo.

---

## Liên hệ sang AWS

| Thành phần thiết kế | Dịch vụ AWS | Vì sao hợp |
|---|---|---|
| DB giao dịch (inventory + reservation) | **Aurora PostgreSQL / MySQL** (Multi-AZ) | ACID thật, `SELECT FOR UPDATE`, `CHECK`, `UNIQUE`; failover tự động; 220 GB nằm gọn trong một instance. Đặt isolation ở mức transaction, không đổi toàn cục. |
| Scale đọc availability, trang chi tiết | **Aurora Read Replica** (tới 15 bản) + **RDS Proxy** | Replica gánh đường đọc; Proxy gộp connection, tránh cạn pool khi Lambda scale đột biến — chính là thứ cứu bạn khi lock-wait dồn |
| Ghi có điều kiện không cần RDBMS | **DynamoDB** `ConditionExpression` + `TransactWriteItems` | Item key `HOTEL#h#RT#rt#DATE#d`, `UpdateItem ADD total_reserved :n IF total_reserved + :n <= limit` — chính là optimistic locking. `TransactWriteItems` cho tối đa 100 item nguyên tử → **đủ cho một booking ≤ 100 đêm**. Đây là ứng viên thay RDBMS thật sự nếu cần scale ngang cực lớn; đánh đổi: mất join, mất truy vấn ad-hoc, mất `CHECK` cross-row. |
| Cache tồn kho / giá / thông tin khách sạn | **ElastiCache for Redis** (cluster mode) | Sub-ms, TTL, atomic ops. Nhớ: chỉ để hiển thị, không để commit. |
| Ảnh khách sạn, JS/CSS | **CloudFront + S3** | Phần lớn bandwidth là tĩnh, đẩy hết ra edge |
| API công khai, auth, rate limit | **API Gateway + WAF + Cognito** | Rate limit chống bot cào giá (rất phổ biến ngành travel); hỗ trợ header idempotency key ở tầng hạ tầng |
| Saga orchestrator | **Step Functions** (Standard workflow) | Chính là một state machine bền vững có sẵn: retry/backoff khai báo, `Catch` → gọi bước compensation, lịch sử execution đầy đủ để audit — đúng thứ CSKH cần khi booking kẹt. Standard (không Express) vì cần bền và cần lịch sử. |
| Choreography cho việc phụ | **EventBridge** (định tuyến theo rule) / **SQS** (hàng đợi bền, có DLQ) | EventBridge cho fan-out nhiều consumer; SQS + DLQ cho tác vụ phải làm bằng được (gửi email). FIFO queue với `MessageGroupId = reservation_id` nếu cần thứ tự theo booking. |
| Outbox relay / CDC | **DMS** (CDC mode) hoặc **MSK + Debezium** → **Kinesis Data Streams** | Đọc WAL/binlog, không thêm tải truy vấn, không bỏ sót, giữ thứ tự commit. Đây là cách đúng để đồng bộ cache, read model, warehouse. |
| Xử lý event (cập nhật cache, read model) | **Lambda** (trigger từ Kinesis/SQS) | Tải rất thấp và co giãn; nhớ viết consumer **idempotent** vì outbox là at-least-once |
| Reaper hold hết hạn, cron tạo inventory | **EventBridge Scheduler → Lambda** | Cron có sẵn, không cần nuôi server; alert bằng CloudWatch metric tự phát |
| Read model tìm kiếm | **OpenSearch Service** | Full-text + geo + facet + range trong một truy vấn; tách hẳn tải search khỏi primary |
| Kho lạnh reservation cũ | **S3 + Athena** (Parquet, partition theo tháng) | Giữ bảng nóng nhỏ; vẫn truy vấn được khi cần tra cứu/audit |
| Báo cáo doanh thu, occupancy, tối ưu overbooking | **Redshift** hoặc Athena trên S3 | Phân tích nặng không được đụng vào DB bán hàng |
| Thanh toán | **Lambda gọi Stripe/Adyen** + secrets ở **Secrets Manager** | Cô lập phạm vi PCI vào một service nhỏ nhất có thể |
| Quan sát | **CloudWatch + X-Ray** | Trace xuyên saga bằng `X-Amzn-Trace-Id`; alarm trên lock-wait, deadlock/s, tỉ lệ 409, outbox lag, PENDING quá hạn |

**Ghi chú về DynamoDB — khi nào nó thay được RDBMS ở bài này?** Đáng bàn kỹ vì đây là câu hỏi follow-up hay gặp trong phỏng vấn AWS.

Thay được, nếu: (1) bạn chấp nhận mô hình tồn kho thuần counter theo key, (2) mỗi booking không quá 100 đêm (giới hạn của `TransactWriteItems`), (3) bạn không cần truy vấn ad-hoc/join, (4) bạn cần scale ngang gần như vô hạn hoặc global tables đa vùng. `ConditionExpression` cho bạn đúng thứ cần nhất — ghi có điều kiện nguyên tử — và `TransactWriteItems` bọc cả việc trừ N đêm lẫn việc `Put` bản ghi reservation với `attribute_not_exists(id)` (idempotency) vào **một** giao dịch.

Không thay được, nếu: bạn cần `CHECK` liên quan nhiều dòng, cần báo cáo linh hoạt trên chính DB, cần join giá–tồn kho–khách sạn, hoặc đơn giản là **quy mô không đòi hỏi** — mà ở bài này thì đúng là không đòi hỏi. Với 3 TPS, chọn DynamoDB là trả giá bằng độ linh hoạt để mua một thứ mình không dùng đến.

---

## Cách trình bày khi phỏng vấn / review

1. **Hỏi trước, tính sau, vẽ sau cùng.** Năm câu hỏi đắt giá nhất: quy mô bao nhiêu khách sạn/phòng; trả tiền lúc nào; có huỷ không; có overbooking không; giá cố định hay đổi theo ngày. Mỗi câu trả lời đều đổi thiết kế.

2. **Tính estimation và lập tức nói ra kết luận.** "240K booking/ngày, khoảng **3 TPS**. Đây không phải bài toán tải — một database duy nhất dư sức. Cái khó nằm ở tính đúng đắn dưới tranh chấp. Tôi sẽ dành phần lớn thời gian cho chỗ đó." Câu này định khung toàn bộ phần còn lại và ngay lập tức phân biệt bạn với ứng viên trung bình.

3. **Chủ động nêu schema ngây thơ rồi tự phá nó.** Vẽ `reservation(room_id, ...)`, rồi nói "cách này đúng cho Airbnb nhưng sai cho khách sạn vì khách đặt *loại phòng*". Tự tìm ra shortcoming ăn điểm cao hơn nhiều so với bị người phỏng vấn chỉ ra.

4. **Dành đất cho `room_type_inventory` và giải thích vì sao tách theo ngày.** Ý mạnh nhất: *"Vật chất hoá theo ngày biến một ràng buộc trên khoảng thời gian thành một tập ràng buộc trên các dòng có khoá — nhờ đó tôi chỉ cần row lock thay vì predicate lock."* Kèm con số 73 triệu dòng / dưới 10 GB để chứng minh chi phí chấp nhận được.

5. **Vẽ timeline double booking bằng tay.** Hai cột, mốc thời gian t1…t12. Đây là hình vẽ có giá trị nhất của cả buổi — nó chứng minh bạn hiểu *vì sao* cần lock chứ không chỉ biết tên các loại lock. Chỉ rõ khe hở nằm giữa lúc đọc và lúc ghi.

6. **Trình bày cả ba cách chữa, rồi khuyến nghị kết hợp.** Đừng chọn một rồi bỏ hai. Câu chốt: constraint là bất biến ở tầng dữ liệu (luôn bật), ghi có điều kiện là cách thực thi nghiệp vụ (mặc định), pessimistic lock là công cụ leo thang khi số liệu cho thấy retry quá nhiều.

7. **Nhớ nhắc hai chi tiết "người từng làm thật mới biết"**: khoá theo `ORDER BY date` để tránh deadlock, và **không bao giờ giữ DB lock qua lời gọi payment**. Hai câu này thường là thứ người phỏng vấn ghi vào feedback.

8. **Tách bạch race condition và duplicate request.** Nêu rõ rằng lock không chữa được việc user bấm hai lần, và idempotency không chữa được việc hai người tranh một phòng. Rồi giải thích `reservationId` do client sinh + `UNIQUE` constraint, nhấn mạnh cái hay là nó nằm **trong cùng transaction** nên rollback tự động hoàn tồn kho.

9. **Đưa mô hình hold vào sớm.** Nó vừa giải quyết "không giữ lock qua payment", vừa là cầu nối tự nhiên sang saga. Nhớ nhắc reaper job và tình huống webhook về muộn.

10. **Khi bị hỏi "sao không tách Inventory Service riêng?", đừng lùi — hãy nêu giá.** "Tách ra là tôi tự biến một local transaction thành distributed transaction cho thao tác quan trọng nhất hệ thống. Ranh giới service nên cắt ở nơi ít cần nguyên tử nhất; reservation và inventory là một aggregate." Rồi thừa nhận payment thì buộc phải tách, và đó là lý do ta vẫn cần saga.

11. **Nói 2PC trước Saga, và nói vì sao loại 2PC.** Lý do mạnh nhất không phải "chậm" mà là **"payment gateway bên ngoài không thể tham gia pha prepare"** — một lý do mang tính cấu trúc, không phải hiệu năng.

12. **Nhấn mạnh compensating transaction ≠ rollback.** Sao kê của khách có hai dòng (trừ rồi hoàn), không phải không dòng. Đây là câu nói cho thấy bạn hiểu eventual consistency ở mức nghiệp vụ chứ không chỉ mức kỹ thuật.

13. **Chọn orchestration cho luồng có tiền và giải thích bằng góc nhìn vận hành**: khi booking kẹt, CSKH cần biết nó đang ở bước nào. Choreography không trả lời được câu đó.

14. **Nêu outbox mà không cần bị hỏi.** Vẽ cả hai thứ tự sai (`commit` rồi `publish`, và ngược lại) để chứng minh không thứ tự nào cứu được, rồi mới đưa outbox ra. Nói rõ đảm bảo là **at-least-once**, nên consumer phải idempotent.

15. **Câu vàng về cache**: *"Cache-miss thì chỉ chậm, cache-stale thì bán nhầm — nên tôi không bao giờ tin cache tại thời điểm commit."* Giải thích rằng cache tồn kho chỉ dùng để hiển thị, còn quyết định bán luôn là một phép ghi có điều kiện trên nguồn sự thật.

16. **Đừng shard khi chưa cần.** Nếu bị hỏi về scale, hãy nói thứ tự leo thang: replica → cache → read model → sharding → archive. Và khi nói shard, chỉ ra `hotel_id` là shard key gần như hoàn hảo vì mọi truy vấn đều mang nó, đồng thời tự nêu rủi ro hot shard.

17. **Kết bằng phần vận hành.** Reconciliation hằng đêm, alert cho reaper và cron inventory, đối chiếu tiền với settlement của gateway. Ứng viên senior nói về cách phát hiện lỗi; ứng viên junior chỉ nói về cách tránh lỗi.

---

## Tóm tắt

Hotel Reservation là bài case study đảo ngược trực giác quen thuộc: **tải nhỏ tới mức không đáng bàn, nhưng yêu cầu đúng đắn thì tuyệt đối**. Tính ra 3 TPS rồi tuyên bố "đây không phải bài toán tải" là bước đi đúng đầu tiên — nó giải phóng thời gian cho phần thực sự khó.

Quyết định thiết kế cốt lõi là bảng **`room_type_inventory` theo `(hotel_id, room_type_id, date)`**: vật chất hoá tồn kho theo từng đêm biến một ràng buộc trên khoảng thời gian thành các ràng buộc trên dòng có khoá, nhờ đó ta chỉ cần row lock và ghi có điều kiện thay vì predicate lock đắt đỏ. Nó cũng mở đường cho overbooking cấu hình được theo ngày, và nó nhỏ — 73 triệu dòng, dưới 10 GB.

Phần khó nhất là **concurrency**, và câu trả lời không phải chọn một trong ba mà là dùng cả ba ở ba tầng: `CHECK` constraint làm bất biến ở tầng dữ liệu, `UPDATE ... WHERE <điều kiện>` làm cách thực thi mặc định, pessimistic lock (kèm `ORDER BY date` chống deadlock) làm công cụ leo thang. Song song đó, **idempotency** bằng `reservationId` do client sinh + `UNIQUE` constraint chữa một vấn đề hoàn toàn khác — request trùng lặp — mà không lock nào chữa được.

Khi có tiền và có bên thứ ba, tính nguyên tử biến mất: 2PC không dùng được vì payment gateway không tham gia pha prepare, nên ta dùng **Saga** với orchestrator bền vững cho luồng có tiền và choreography cho việc phụ, cộng **outbox + CDC** để loại bỏ dual write giữa DB và event bus. Cuối cùng, mọi bản sao phái sinh — cache, read model, warehouse — đều được phép trễ, với đúng một điều kiện: **không bao giờ tin chúng tại thời điểm commit**.
