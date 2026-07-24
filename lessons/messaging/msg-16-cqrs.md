# Bài 16 — CQRS: tách đường ghi và đường đọc

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **CQRS (Command Query Responsibility Segregation)** là gì: tách **model GHI** (command) khỏi **model ĐỌC** (query).
- Nói rõ **vì sao** tách: đọc và ghi có **yêu cầu, tải, và shape dữ liệu khác nhau**; scale riêng; dựng **nhiều read model** từ một nguồn.
- Hiểu vì sao CQRS thường đi cùng **Event Sourcing**: event là nguồn sự thật, **projection** cập nhật read model.
- Xử lý **eventual consistency** giữa write side và read side, và cách "giấu" độ trễ đó trong UX.
- ⚠️ Nhận ra **over-engineering**: đa số CRUD **KHÔNG cần** CQRS. Biết chính xác khi nào nên dùng.

---

## 2. Lý thuyết

### 2.1 Analogy: nhà bếp nhà hàng vs quầy trưng bày

Trong nhà hàng, **bếp** (nơi *ghi*: nấu, chế biến, kiểm soát nguyên liệu) và **quầy trưng bày / thực đơn có hình** (nơi *đọc*: khách xem, chọn) là **hai nơi khác nhau**, tối ưu cho hai mục đích khác nhau. Bếp cần dao, bếp lửa, quy trình an toàn thực phẩm; quầy trưng bày cần ánh sáng đẹp, ảnh món hấp dẫn, giá niêm yết. Bạn **không bắt khách vào bếp tự nhìn nồi** để quyết định gọi món.

CQRS đúng như vậy: **đường ghi** được thiết kế để *đảm bảo tính đúng đắn* (validate, business rule, transaction), còn **đường đọc** được thiết kế để *hiển thị nhanh & tiện* (denormalize sẵn, join sẵn, đúng shape màn hình cần). Hai bên có model dữ liệu **tách rời**, thậm chí **hai database khác nhau**.

### 2.2 Bản chất: Command vs Query

Nền tảng của CQRS là một sự phân đôi cũ (Bertrand Meyer — CQS): **mọi thao tác chia làm hai loại**.

| | **Command** (đường ghi) | **Query** (đường đọc) |
|--|------------------------|----------------------|
| Làm gì | **Thay đổi** trạng thái | **Đọc** trạng thái |
| Trả về | Không trả data (chỉ ok/lỗi) | Trả data, **không đổi** gì |
| Ví dụ | `PlaceOrder`, `CancelOrder`, `AddItem` | `GetOrderSummary`, `ListMyOrders` |
| Cần | Validate, business rule, transaction, khoá | Nhanh, denormalized, cache-friendly |
| Tối ưu cho | **Đúng** (consistency, invariant) | **Đọc nhanh & đúng shape hiển thị** |

Điểm mấu chốt: **Command mô tả *ý định* dạng động từ** ("PlaceOrder"), khác với CRUD chỉ "update row". Command đi qua tầng nghiệp vụ để *chấp nhận hoặc từ chối*.

CQRS = nâng CQS lên tầm **kiến trúc**: không chỉ tách *method*, mà tách hẳn **hai model** (và thường hai store) cho ghi và đọc.

<svg viewBox="0 0 660 260" role="img" aria-labelledby="cq-t cq-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="cq-t">Kiến trúc CQRS tách write side và read side</title>
<desc id="cq-d">Command đi vào write model ghi vào write store và sinh event; event qua projection cập nhật read model để query đọc</desc>
<rect x="20" y="110" width="70" height="40" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="55" y="128" text-anchor="middle" font-size="10" fill="currentColor">Client</text>
<text x="55" y="142" text-anchor="middle" font-size="9" fill="currentColor">(UI)</text>
<text x="200" y="30" text-anchor="middle" font-size="12" fill="currentColor">WRITE SIDE (command)</text>
<line x1="90" y1="120" x2="150" y2="80" stroke="currentColor" stroke-width="1.5" marker-end="url(#ac)"/>
<text x="118" y="90" text-anchor="middle" font-size="9" fill="currentColor">command</text>
<rect x="150" y="55" width="110" height="46" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="205" y="74" text-anchor="middle" font-size="10" fill="currentColor">Write model</text>
<text x="205" y="90" text-anchor="middle" font-size="9" fill="currentColor">validate + rule</text>
<rect x="150" y="120" width="110" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="205" y="138" text-anchor="middle" font-size="10" fill="currentColor">Write store</text>
<text x="205" y="152" text-anchor="middle" font-size="9" fill="currentColor">(event log)</text>
<line x1="205" y1="101" x2="205" y2="120" stroke="currentColor" stroke-width="1" marker-end="url(#ac)"/>
<line x1="260" y1="140" x2="330" y2="140" stroke="currentColor" stroke-width="1.5" marker-end="url(#ac)"/>
<text x="295" y="132" text-anchor="middle" font-size="9" fill="currentColor">event</text>
<rect x="330" y="118" width="90" height="44" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="375" y="137" text-anchor="middle" font-size="10" fill="currentColor">Projection</text>
<text x="375" y="151" text-anchor="middle" font-size="9" fill="currentColor">(cập nhật)</text>
<text x="520" y="30" text-anchor="middle" font-size="12" fill="currentColor">READ SIDE (query)</text>
<line x1="420" y1="140" x2="470" y2="140" stroke="currentColor" stroke-width="1.5" marker-end="url(#ac)"/>
<rect x="470" y="80" width="120" height="40" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="530" y="98" text-anchor="middle" font-size="10" fill="currentColor">Read model A</text>
<text x="530" y="112" text-anchor="middle" font-size="9" fill="currentColor">(list nhanh)</text>
<rect x="470" y="160" width="120" height="40" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="530" y="178" text-anchor="middle" font-size="10" fill="currentColor">Read model B</text>
<text x="530" y="192" text-anchor="middle" font-size="9" fill="currentColor">(search / báo cáo)</text>
<line x1="470" y1="130" x2="470" y2="100" stroke="currentColor" stroke-width="1" marker-end="url(#ac)"/>
<line x1="470" y1="150" x2="470" y2="180" stroke="currentColor" stroke-width="1" marker-end="url(#ac)"/>
<line x1="55" y1="150" x2="55" y2="220" stroke="currentColor" stroke-width="1"/>
<line x1="55" y1="220" x2="530" y2="220" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<line x1="530" y1="220" x2="530" y2="200" stroke="currentColor" stroke-width="1" marker-end="url(#ac)"/>
<text x="290" y="238" text-anchor="middle" font-size="9" fill="currentColor">query đọc thẳng read model (không đụng write side)</text>
<defs><marker id="ac" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.3 Vì sao lại tách? Bốn động lực thật

**(1) Đọc và ghi có yêu cầu khác nhau về nhất quán và tính đúng.**
Đường ghi cần **transaction, validate, invariant** ("không được rút quá số dư", "không đặt trùng ghế"). Đường đọc thường **chịu được trễ vài trăm ms** và chỉ cần "đủ mới". Ép chung một model buộc bên đọc phải trả giá cho sự nghiêm ngặt của bên ghi (khoá, join phức tạp).

**(2) Tải rất lệch — scale riêng.**
Đa số hệ thống **đọc nhiều gấp 10–1000 lần ghi**. Một sàn thương mại điện tử có thể 50.000 lượt xem sản phẩm/giây nhưng chỉ 500 đơn/giây. Nếu chung DB, bạn phải scale cả cụm cho pha đọc, kéo theo cả pha ghi. Tách ra: read side có thể **replicate rộng, cache mạnh, dùng store chuyên đọc** (Elasticsearch, Redis, materialized view) mà không đụng write side.

**(3) Shape dữ liệu khác nhau.**
Model ghi chuẩn hoá (normalized) để tránh trùng lặp & giữ invariant. Nhưng màn hình "Chi tiết đơn hàng" cần **join 6 bảng** (order, item, customer, address, payment, shipping). Query đó nặng và lặp đi lặp lại. Read model có thể là **một document dẹt (denormalized)** chứa sẵn mọi thứ màn hình cần — đọc **một phát**, không join.

**(4) Nhiều read model từ một nguồn.**
Cùng một sự kiện `OrderPlaced`, ta có thể dựng **nhiều projection song song**: một bảng SQL cho "danh sách đơn của tôi", một index Elasticsearch cho "tìm kiếm đơn", một bảng tổng hợp cho "doanh thu theo ngày" (analytics), một cache Redis cho "đơn gần nhất". Mỗi read model tối ưu cho **một cách hỏi**, tất cả **suy ra được** từ cùng một dòng event.

### 2.4 Vì sao thường đi cùng Event Sourcing

CQRS và **Event Sourcing** (Bài 15) là cặp bài trùng, dù **không bắt buộc đi cùng**.

- **Write side dùng Event Sourcing**: mọi thay đổi được ghi thành **event bất biến** (`OrderPlaced`, `ItemAdded`, `OrderPaid`) vào một **event log** — đây là *nguồn sự thật* duy nhất.
- **Read side lắng nghe dòng event** và chạy **projection**: mỗi event tới, cập nhật read model tương ứng. Đây chính là ứng dụng trực tiếp của messaging/streaming (Kafka, hoặc bảng outbox → consumer).

Điểm đẹp: event log là **kênh tự nhiên** nối write → read. Không cần "đồng bộ hai DB" thủ công; read model chỉ là **hàm fold trên dòng event**. Muốn thêm read model mới? **Replay** toàn bộ event từ đầu để dựng lại — không cần bên ghi biết gì.

```text
Event log (nguồn sự thật, append-only):
  #1 OrderPlaced{id:42, customer:7}
  #2 ItemAdded{id:42, sku:"A1", qty:2}
  #3 ItemAdded{id:42, sku:"B9", qty:1}
  #4 OrderPaid{id:42, amount:530000}

Projection "order_summary" fold các event → 1 row read model:
  order 42 | customer 7 | items:3 | total:530000 | status:PAID
```

> **Lưu ý:** CQRS **không đòi** Event Sourcing. Bạn có thể CQRS "nhẹ": write vào một SQL chuẩn hoá, rồi bắn event/CDC để cập nhật một read store denormalized. Ngược lại cũng dùng CQRS mà write & read **chung một DB**, chỉ tách *model/lớp code* — đơn giản nhất, thường là đủ.

### 2.5 Eventual consistency — cái giá phải hiểu

Khi write store và read store **tách rời**, có một khoảng trễ giữa lúc command thành công và lúc read model phản ánh nó. Đây là **eventual consistency**: read side rồi *sẽ* đúng, nhưng **không tức thì**.

<svg viewBox="0 0 620 250" role="img" aria-labelledby="ec-t ec-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="ec-t">Độ trễ eventual consistency giữa write side và read side</title>
<desc id="ec-d">Command ghi thành công ngay nhưng projection cập nhật read model sau một khoảng trễ, query giữa khoảng đó thấy dữ liệu cũ</desc>
<line x1="40" y1="40" x2="40" y2="210" stroke="currentColor" stroke-width="1"/>
<line x1="40" y1="210" x2="580" y2="210" stroke="currentColor" stroke-width="1" marker-end="url(#ae)"/>
<text x="575" y="230" text-anchor="middle" font-size="10" fill="currentColor">thời gian</text>
<circle cx="110" cy="70" r="5" fill="#3b82f6" fill-opacity="0.6" stroke="currentColor"/>
<text x="110" y="55" text-anchor="middle" font-size="9" fill="currentColor">t0: command OK</text>
<text x="110" y="90" text-anchor="middle" font-size="8" fill="currentColor">write store đã ghi</text>
<circle cx="420" cy="70" r="5" fill="#10b981" fill-opacity="0.6" stroke="currentColor"/>
<text x="420" y="55" text-anchor="middle" font-size="9" fill="currentColor">t1: projection xong</text>
<text x="420" y="90" text-anchor="middle" font-size="8" fill="currentColor">read model cập nhật</text>
<rect x="110" y="120" width="310" height="40" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="265" y="138" text-anchor="middle" font-size="10" fill="currentColor">cửa sổ trễ (lag): read model còn CŨ</text>
<text x="265" y="152" text-anchor="middle" font-size="9" fill="currentColor">query lúc này thấy dữ liệu trước command</text>
<line x1="110" y1="75" x2="110" y2="120" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<line x1="420" y1="75" x2="420" y2="120" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<circle cx="265" cy="185" r="5" fill="#f43f5e" fill-opacity="0.6" stroke="currentColor"/>
<text x="265" y="203" text-anchor="middle" font-size="9" fill="currentColor">user query ở đây → stale</text>
<defs><marker id="ae" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Ví dụ kinh điển: user bấm "Đăng bài", server trả 200 OK, nhưng khi màn hình reload danh sách bài **chưa thấy bài vừa đăng** vì projection chậm 300ms. User hoang mang "mất bài rồi?".

**Cách xử lý ở tầng UX (quan trọng hơn ta tưởng):**

| Kỹ thuật | Cách làm |
|----------|----------|
| **Optimistic UI** | Sau khi command OK, **client tự chèn** kết quả vào UI ngay (không đợi read model). Khi read model đuổi kịp thì đồng bộ lại. |
| **Read-your-writes** | Ngay sau ghi, đọc **từ write side** (hoặc sticky vào replica đã cập nhật) cho *chính user đó*, chỉ người khác mới thấy đường đọc eventual. |
| **Trả về kết quả trong command response** | Command trả luôn state mới đủ để render, tránh một vòng query nữa. |
| **Version / token** | Command trả `version=N`; client query kèm "chờ đến version ≥ N" (đợi projection bắt kịp) rồi mới render. |
| **Báo trạng thái rõ ràng** | Hiển thị "đang xử lý…" thay vì làm như đã xong-mà-không-thấy. |

Nguyên tắc vàng: **thu hẹp cửa sổ trễ** (projection phải nhanh, thường < 1s) **và** thiết kế UX để độ trễ đó **không đập vào mặt user**.

---

## 3. ⚠️ Cảnh báo over-engineering: đa số KHÔNG cần CQRS

Đây là phần quan trọng nhất của bài. CQRS là con dao hai lưỡi: giải quyết đúng vấn đề thì tuyệt, dùng sai thì **nhân đôi độ phức tạp mà chẳng được gì**.

**Cái giá bạn phải trả khi làm CQRS đầy đủ:**
- **Hai model, hai store** → nhiều code hơn, nhiều thứ phải deploy & giám sát.
- **Eventual consistency** → phải xử lý stale read, phải giáo dục cả team về nó.
- **Projection có thể lỗi/trôi** → cần cơ chế rebuild, monitor lag, xử lý poison event.
- **Debug khó hơn**: "dữ liệu sai ở read model" — do event? do projection? do replay?

**Với một CRUD bình thường** (form đăng ký, quản lý danh mục, blog admin), một database quan hệ + ORM là **đủ và tốt hơn**: nhất quán mạnh, đơn giản, dễ debug. Thêm CQRS vào đây chỉ là **complexity không mua được gì**.

<svg viewBox="0 0 640 230" role="img" aria-labelledby="ov-t ov-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="ov-t">CRUD đơn giản vs CQRS: chọn theo nhu cầu</title>
<desc id="ov-d">Bên trái CRUD một model một database gọn nhẹ cho đa số ca; bên phải CQRS hai model chỉ dùng khi thật sự cần</desc>
<text x="160" y="24" text-anchor="middle" font-size="12" fill="currentColor">Đa số ca: CRUD 1 model</text>
<rect x="90" y="45" width="140" height="34" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="160" y="66" text-anchor="middle" font-size="10" fill="currentColor">App (read + write)</text>
<line x1="160" y1="79" x2="160" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#ao)"/>
<rect x="90" y="108" width="140" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="160" y="129" text-anchor="middle" font-size="10" fill="currentColor">1 database</text>
<text x="160" y="170" text-anchor="middle" font-size="10" fill="currentColor">Gọn, nhất quán mạnh,</text>
<text x="160" y="186" text-anchor="middle" font-size="10" fill="currentColor">dễ debug ✓</text>
<line x1="320" y1="30" x2="320" y2="200" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<text x="480" y="24" text-anchor="middle" font-size="12" fill="currentColor">Chỉ khi thật cần: CQRS</text>
<rect x="410" y="45" width="66" height="30" rx="5" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="443" y="64" text-anchor="middle" font-size="9" fill="currentColor">Write</text>
<rect x="490" y="45" width="66" height="30" rx="5" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="523" y="64" text-anchor="middle" font-size="9" fill="currentColor">Read</text>
<rect x="410" y="100" width="66" height="30" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="443" y="119" text-anchor="middle" font-size="9" fill="currentColor">Write DB</text>
<rect x="490" y="100" width="66" height="30" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="523" y="119" text-anchor="middle" font-size="9" fill="currentColor">Read DB</text>
<line x1="443" y1="75" x2="443" y2="100" stroke="currentColor" stroke-width="1" marker-end="url(#ao)"/>
<line x1="523" y1="75" x2="523" y2="100" stroke="currentColor" stroke-width="1" marker-end="url(#ao)"/>
<line x1="476" y1="115" x2="490" y2="115" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2" marker-end="url(#ao)"/>
<text x="483" y="170" text-anchor="middle" font-size="10" fill="currentColor">Mạnh nhưng phức tạp,</text>
<text x="483" y="186" text-anchor="middle" font-size="10" fill="currentColor">eventual consistency ⚠️</text>
<defs><marker id="ao" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 3.1 Khi nào NÊN dùng CQRS

Dùng khi **có ít nhất một** dấu hiệu rõ:
- **Tỷ lệ đọc/ghi lệch mạnh** và cần scale hai bên độc lập.
- **Query đọc nặng, phức tạp** (join nhiều bảng, aggregate) làm chậm cả đường ghi.
- Cần **nhiều biểu diễn đọc khác nhau** cho cùng dữ liệu (SQL + search + cache + analytics).
- Domain **giàu business logic ở đường ghi** (nhiều invariant, hợp tự nhiên với Event Sourcing).
- Tranh chấp khoá giữa read và write đang là **nút cổ chai thực tế** (đã đo, không phải đoán).

### 3.2 Khi nào KHÔNG nên (mặc định là không)

- CRUD đơn giản, ít logic, đọc/ghi cân bằng → **dùng một DB**.
- Team nhỏ, chưa quen eventual consistency → chi phí học & vận hành lớn hơn lợi ích.
- Chỉ vì "nghe hay", "trong bài blog người ta khen" → đây là **cargo-culting**.
- Có thể áp CQRS **cục bộ** cho **một** bounded context nóng, không cần cho cả hệ.

> **Quy tắc thực dụng:** bắt đầu bằng một model đơn giản. Chỉ tách read/write khi **áp lực thật** xuất hiện (đã đo bằng số liệu). CQRS là kết quả của **áp lực có thật**, không phải điểm khởi đầu.

---

## 4. Ví dụ luồng thực tế: đặt vé sự kiện

Một hệ bán vé có đường ghi giàu invariant ("không bán quá số ghế", "một ghế một người") và đường đọc cực nặng (hàng chục nghìn người refresh sơ đồ ghế cùng lúc lúc mở bán) — **ứng viên chuẩn cho CQRS**.

```text
WRITE SIDE
  Command: ReserveSeat{event:99, seat:"A12", user:7}
    → Aggregate kiểm tra invariant (ghế A12 còn trống?)
    → chấp nhận → sinh event SeatReserved{event:99, seat:"A12", user:7}
    → append vào event log  (nguồn sự thật)

EVENT → PROJECTIONS (mỗi cái 1 read model)
  proj_seatmap  → cập nhật Redis: seat A12 = TAKEN     (cho UI sơ đồ ghế, đọc cực nhanh)
  proj_myticket → cập nhật SQL: user 7 giữ vé A12       (cho trang "vé của tôi")
  proj_sales    → +1 vào bảng doanh thu theo sự kiện     (cho dashboard analytics)

READ SIDE
  Query GetSeatMap(event 99)   → đọc thẳng Redis  (không đụng write side, không join)
  Query GetMyTickets(user 7)   → đọc thẳng SQL đã denormalized
```

Con số minh hoạ: lúc mở bán, sơ đồ ghế nhận **80.000 lượt đọc/giây** trong khi chỉ **~2.000 lượt đặt/giây**. Read model trên Redis phục vụ pha đọc mà **không hề chạm** vào write store; write store chỉ lo giữ invariant cho 2.000 command/giây. Nếu chung một DB, khoá ghi trên hàng "seat" sẽ **serialize** cả đọc lẫn ghi → sập.

Độ trễ projection ở đây ~50–200ms; UX bù bằng **optimistic UI** (bấm chọn ghế thì tô màu ngay ở client) và **read-your-writes** cho trang "vé của tôi".

---

## 5. Tóm tắt
- **CQRS** = tách **model GHI** (command: validate, business rule, sinh event) khỏi **model ĐỌC** (query: projection denormalized, tối ưu hiển thị) — thường là **hai store** khác nhau.
- Bốn động lực: **yêu cầu nhất quán khác nhau**, **tải đọc/ghi lệch → scale riêng**, **shape dữ liệu khác nhau**, **nhiều read model từ một nguồn**.
- Thường đi cùng **Event Sourcing**: event là nguồn sự thật, **projection** fold event → cập nhật read model; muốn read model mới thì **replay**.
- Cái giá là **eventual consistency**: xử lý bằng **optimistic UI, read-your-writes, version token, báo trạng thái** — và thu hẹp lag projection.
- ⚠️ **Đa số CRUD KHÔNG cần CQRS.** Nó nhân đôi phức tạp; chỉ dùng khi có **áp lực thật** (đọc/ghi lệch mạnh, query nặng, nhiều read model, domain giàu invariant). Mặc định: một model, một DB.

> **Bài tiếp theo (Bài 17):** **Saga & quản lý transaction phân tán** — khi một nghiệp vụ trải qua nhiều service/aggregate, làm sao giữ nhất quán mà không cần distributed transaction hai pha.
