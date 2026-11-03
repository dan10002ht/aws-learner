# Bài 1 — Vì sao async messaging? Queue vs Pub/Sub & decoupling

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **vì sao cần messaging bất đồng bộ** thay vì gọi API đồng bộ trực tiếp.
- Nói rõ ba lợi ích cốt lõi: **decoupling**, **buffering (chịu spike)**, **khả năng mở rộng**.
- Phân biệt **message queue (point-to-point)** với **publish/subscribe (fan-out)**.
- Gọi tên đúng các vai: **producer, broker, consumer, message**.
- Nhận ra **cái giá** của messaging (độ trễ, eventual consistency, phức tạp vận hành) để không lạm dụng.

---

## 2. Lý thuyết

### 2.1 Vấn đề: gọi đồng bộ trực tiếp

Hãy xét luồng đặt hàng: khi user bấm "Đặt hàng", `Order service` phải báo cho `Email`, `Inventory`, `Analytics`. Cách ngây thơ là gọi HTTP đồng bộ lần lượt:

```text
OrderService → gọi EmailService     (đợi...)
             → gọi InventoryService (đợi...)
             → gọi AnalyticsService (đợi...)
             → rồi mới trả lời user
```

Ba vấn đề nảy sinh:
1. **Coupling chặt**: Order phải *biết* địa chỉ cả 3 service và *chờ* cả 3. Thêm một service mới (vd `Loyalty`) → phải sửa code Order.
2. **Chậm & mong manh**: thời gian phản hồi = tổng thời gian cả 3. Chỉ cần Analytics chậm hoặc chết, user *cũng* phải chờ / đặt hàng *cũng* fail — dù analytics chẳng liên quan tới việc đặt hàng thành công.
3. **Không chịu nổi spike**: 10.000 đơn/giây ập tới, cả 3 service phải xử lý *tức thì* cùng lúc, không có chỗ "đệm".

### 2.2 Giải pháp: chèn một broker ở giữa

Messaging bất đồng bộ đảo ngược mô hình: Order chỉ **gửi một message** "OrderPlaced" vào **broker** rồi **trả lời user ngay**. Các service khác **tự lấy** message về xử lý theo nhịp của mình.

<ab-toggle data-labels="Đồng bộ|Qua broker">
<svg viewBox="0 0 520 300" role="img" aria-labelledby="msg01-compare0-t msg01-compare0-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="msg01-compare0-t">Gọi đồng bộ</title>
<desc id="msg01-compare0-d">Gọi đồng bộ</desc>
<defs><marker id="msg01-compare0-a" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="currentColor"/></marker></defs>
<rect x="15" y="105" width="90" height="45" rx="7" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/><text x="60.0" y="132.5" text-anchor="middle" font-size="13" fill="currentColor">Order</text><rect x="380" y="25" width="120" height="40" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="440.0" y="50.0" text-anchor="middle" font-size="13" fill="currentColor">Email</text><path d="M105 128 L380 45" fill="none" stroke="currentColor" marker-end="url(#msg01-compare0-a)"/><rect x="380" y="115" width="120" height="40" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="440.0" y="140.0" text-anchor="middle" font-size="13" fill="currentColor">Inventory</text><path d="M105 128 L380 135" fill="none" stroke="currentColor" marker-end="url(#msg01-compare0-a)"/><rect x="380" y="205" width="120" height="40" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="440.0" y="230.0" text-anchor="middle" font-size="13" fill="currentColor">Analytics</text><path d="M105 128 L380 225" fill="none" stroke="currentColor" marker-end="url(#msg01-compare0-a)"/><text x="260" y="278" text-anchor="middle" font-size="13" fill="currentColor">Order chờ 3 service</text>
</svg>
<svg viewBox="0 0 520 300" role="img" aria-labelledby="msg01-compare1-t msg01-compare1-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="msg01-compare1-t">Gửi qua broker</title>
<desc id="msg01-compare1-d">Gửi qua broker</desc>
<defs><marker id="msg01-compare1-a" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="currentColor"/></marker></defs>
<rect x="15" y="105" width="90" height="45" rx="7" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/><text x="60.0" y="132.5" text-anchor="middle" font-size="13" fill="currentColor">Order</text><rect x="380" y="25" width="120" height="40" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="440.0" y="50.0" text-anchor="middle" font-size="13" fill="currentColor">Email</text><path d="M315 128 L380 45" fill="none" stroke="currentColor" marker-end="url(#msg01-compare1-a)"/><rect x="380" y="115" width="120" height="40" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="440.0" y="140.0" text-anchor="middle" font-size="13" fill="currentColor">Inventory</text><path d="M315 128 L380 135" fill="none" stroke="currentColor" marker-end="url(#msg01-compare1-a)"/><rect x="380" y="205" width="120" height="40" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="440.0" y="230.0" text-anchor="middle" font-size="13" fill="currentColor">Analytics</text><path d="M315 128 L380 225" fill="none" stroke="currentColor" marker-end="url(#msg01-compare1-a)"/><rect x="200" y="100" width="115" height="55" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="257.5" y="132.5" text-anchor="middle" font-size="13" fill="currentColor">Broker (queue)</text><path d="M105 128 L200 128" fill="none" stroke="currentColor" marker-end="url(#msg01-compare1-a)"/><text x="260" y="278" text-anchor="middle" font-size="13" fill="currentColor">Order trả lời user sau khi gửi broker</text>
</svg>
<ab-note>Ba cạnh đi thẳng khiến Order phụ thuộc vào cả ba service.</ab-note>
<ab-note>Broker giữ message để các consumer tự xử lý theo nhịp riêng.</ab-note>
</ab-toggle>

### 2.3 Ba lợi ích cốt lõi

| Lợi ích | Ý nghĩa |
|---------|---------|
| **Decoupling** | Producer không cần biết ai tiêu thụ, bao nhiêu consumer. Thêm consumer mới **không đụng** producer. |
| **Buffering / chịu spike** | Broker là "hồ chứa": tải dồn vào hàng đợi, consumer xử lý theo năng lực (smoothing). Spike không đánh sập consumer. |
| **Khả năng mở rộng & bền** | Nhiều consumer chia nhau hàng đợi (scale ngang); message được lưu nên consumer chết/xong-restart vẫn không mất việc. |

Nói ngắn gọn: messaging biến một chuỗi phụ thuộc **thời gian thực, dây chuyền** thành các mảnh **độc lập, tự nhịp**. Đây là nền tảng của kiến trúc **event-driven** (học sâu ở Chương 5).

### 2.4 Đánh đổi — đừng lạm dụng

Messaging không miễn phí:
- **Eventual consistency**: user được báo "đặt hàng thành công" *trước khi* email/inventory xử lý xong. Hệ thống chỉ *đúng cuối cùng*, không tức thì.
- **Độ trễ end-to-end** có thể cao hơn cho một tác vụ đơn.
- **Phức tạp**: thêm một hạ tầng phải vận hành, giám sát; debug luồng bất đồng bộ khó hơn (message ở đâu? tại sao chưa xử lý?).
- **Khó về thứ tự & trùng lặp** (Bài 2).

> **Quy tắc:** dùng messaging cho việc **có thể trễ một chút** và cần **tách rời** (gửi email, cập nhật analytics, xử lý ảnh...). Việc **cần trả lời ngay & nhất quán tức thì** (kiểm tra số dư trước khi trừ tiền) thì gọi đồng bộ vẫn đúng hơn.

---

## 3. Hai mô hình nền tảng: Queue vs Pub/Sub

| | **Message Queue** (point-to-point) | **Publish/Subscribe** (fan-out) |
|--|-----------------------------------|--------------------------------|
| Mỗi message tới | **Một** consumer trong nhóm xử lý | **Mọi** subscriber đều nhận một bản |
| Mục đích | Chia **tải công việc** (task) | **Phát tin** cho nhiều bên quan tâm |
| Ví dụ | Xử lý ảnh: 5 worker chia nhau job | "OrderPlaced" → Email + Inventory + Analytics đều nhận |
| Analogy | Hàng người xếp trước **một** quầy (ai rảnh phục vụ khách kế) | Đài phát thanh: **mọi** máy đang bật đều nghe |

<svg viewBox="0 0 660 210" role="img" aria-labelledby="qp-t qp-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="qp-t">Queue point-to-point vs Pub/Sub fan-out</title>
<desc id="qp-d">Bên trái một message tới một trong nhiều consumer; bên phải mỗi message được sao cho mọi subscriber</desc>
<text x="150" y="20" text-anchor="middle" font-size="13" fill="currentColor">Queue: 1 message → 1 consumer</text>
<rect x="30" y="80" width="60" height="34" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="60" y="102" text-anchor="middle" font-size="10" fill="currentColor">Queue</text>
<line x1="90" y1="90" x2="150" y2="60" stroke="currentColor" stroke-width="1" marker-end="url(#aq)"/>
<line x1="90" y1="97" x2="150" y2="97" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<line x1="90" y1="104" x2="150" y2="134" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<rect x="153" y="44" width="80" height="30" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="193" y="63" text-anchor="middle" font-size="10" fill="currentColor">Worker 1 ✓</text>
<rect x="153" y="82" width="80" height="30" rx="5" fill="#3b82f6" fill-opacity="0.10" stroke="currentColor"/>
<text x="193" y="101" text-anchor="middle" font-size="10" fill="currentColor">Worker 2</text>
<rect x="153" y="120" width="80" height="30" rx="5" fill="#3b82f6" fill-opacity="0.10" stroke="currentColor"/>
<text x="193" y="139" text-anchor="middle" font-size="10" fill="currentColor">Worker 3</text>
<text x="510" y="20" text-anchor="middle" font-size="13" fill="currentColor">Pub/Sub: 1 message → mọi subscriber</text>
<rect x="390" y="80" width="60" height="34" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="420" y="102" text-anchor="middle" font-size="10" fill="currentColor">Topic</text>
<line x1="450" y1="90" x2="510" y2="60" stroke="currentColor" stroke-width="1" marker-end="url(#aq)"/>
<line x1="450" y1="97" x2="510" y2="97" stroke="currentColor" stroke-width="1" marker-end="url(#aq)"/>
<line x1="450" y1="104" x2="510" y2="134" stroke="currentColor" stroke-width="1" marker-end="url(#aq)"/>
<rect x="513" y="44" width="90" height="30" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="558" y="63" text-anchor="middle" font-size="10" fill="currentColor">Email ✓</text>
<rect x="513" y="82" width="90" height="30" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="558" y="101" text-anchor="middle" font-size="10" fill="currentColor">Inventory ✓</text>
<rect x="513" y="120" width="90" height="30" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="558" y="139" text-anchor="middle" font-size="10" fill="currentColor">Analytics ✓</text>
<defs><marker id="aq" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Kafka (Chương 3) thú vị ở chỗ **kết hợp cả hai**: nhiều consumer trong *cùng* một group chia tải (như queue), nhưng *nhiều group khác nhau* mỗi group nhận đủ bản sao (như pub/sub) — nhờ cơ chế offset & log giữ lại.

---

## 4. Từ vựng cần thuộc

| Thuật ngữ | Nghĩa |
|-----------|-------|
| **Message** | Đơn vị dữ liệu gửi đi (event/command), gồm payload + metadata (header) |
| **Producer** (publisher) | Bên tạo & gửi message |
| **Consumer** (subscriber) | Bên nhận & xử lý message |
| **Broker** | Server trung gian nhận, lưu, chuyển message (RabbitMQ, Kafka, SQS...) |
| **Queue / Topic** | Nơi message được gom & phân phối |
| **Ack** | Consumer báo "đã xử lý xong" để broker khỏi gửi lại (Bài 2) |

---

## 5. Tóm tắt
- Gọi đồng bộ trực tiếp gây **coupling chặt, chậm/mong manh, không chịu spike**.
- **Async messaging** chèn một **broker** ở giữa → producer gửi rồi đi tiếp; consumer tự lấy theo nhịp.
- Ba lợi ích: **decoupling**, **buffering (chịu spike)**, **scale & bền**.
- Hai mô hình nền: **Queue** (1 message → 1 consumer, chia tải) và **Pub/Sub** (1 message → mọi subscriber, phát tin).
- Cái giá: **eventual consistency, độ trễ, phức tạp, thứ tự/trùng lặp** — dùng đúng chỗ "có thể trễ & cần tách rời", đừng lạm dụng.

> **Bài tiếp theo (Bài 2):** những đảm bảo mà mọi hệ messaging phải đối mặt — **delivery semantics (at-least/at-most/exactly-once), ordering, và Dead Letter Queue** — nền tảng để dùng RabbitMQ/Kafka cho đúng.
