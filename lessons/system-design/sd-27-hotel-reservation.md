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
