# Bài 7 — Kafka là gì? Log-based, topic/partition/offset

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích Kafka là **distributed append-only commit log**, KHÔNG phải một message queue truyền thống.
- Hiểu ba khái niệm trục: **topic**, **partition** (đơn vị song song + đơn vị thứ tự), **offset** (số thứ tự tăng dần trong partition).
- Nắm bản chất **retention**: đọc message **không xoá** nó → nhiều consumer độc lập cùng đọc + **replay** lịch sử.
- Chỉ ra vì sao mô hình này **khác hẳn RabbitMQ**: broker Kafka **không theo dõi** từng message ai đã đọc; **consumer tự giữ offset**.
- Viết được producer/consumer tối giản và đọc log partition bằng CLI.

---

## 2. Lý thuyết

### 2.1 Analogy: cuốn sổ cái ghi thêm, không tẩy xoá

Hãy hình dung một **cuốn sổ cái kế toán** (ledger). Mỗi giao dịch mới được **ghi thêm xuống dòng kế tiếp**, không ai được tẩy xoá dòng cũ. Mỗi dòng có **số thứ tự** cố định: dòng 0, 1, 2, 3... Bất kỳ ai muốn "cập nhật tình hình" chỉ cần nhớ **mình đã đọc tới dòng số mấy**, rồi lần sau đọc tiếp từ đó. Người kế toán A đọc tới dòng 100, người kiểm toán B mới đọc tới dòng 5 — hai người **độc lập hoàn toàn**, cùng đọc **cùng một cuốn sổ**, và cuốn sổ **không thay đổi** vì bị ai đọc.

Đó chính xác là Kafka. Kafka **không phải hàng đợi** kiểu "lấy ra là biến mất". Nó là một **commit log** — một chuỗi bản ghi **chỉ ghi thêm ở cuối (append-only)**, **bất biến (immutable)**, có **thứ tự**, được **giữ lại một thời gian** bất kể ai đã đọc.

### 2.2 Sự khác biệt gốc rễ: Kafka KHÔNG phải RabbitMQ

Đây là điểm dễ hiểu sai nhất khi chuyển từ RabbitMQ/SQS sang Kafka.

Trong **queue truyền thống (RabbitMQ, SQS)**: message giống **lá thư trong hộp**. Consumer lấy thư ra, `ack`, và broker **xoá** lá thư đó khỏi hộp. Broker phải **theo dõi trạng thái từng message**: đã gửi cho ai? đã được ack chưa? cần gửi lại không? Khi message đã xử lý xong → nó **biến mất vĩnh viễn**. Muốn 3 hệ thống cùng nhận một tin → phải fan-out ra 3 queue riêng, mỗi bản một copy.

Trong **Kafka**: message giống **một dòng trong sổ cái**. Consumer đọc dòng đó nhưng **KHÔNG xoá** nó. Broker **không quan tâm** ai đã đọc tới đâu — nó chỉ giữ log và phục vụ đọc theo offset. **Consumer tự chịu trách nhiệm nhớ offset** của mình. Message chỉ bị dọn khi **hết hạn retention** (vd 7 ngày), không phải khi bị đọc.

| | **RabbitMQ / SQS** (queue) | **Kafka** (log) |
|--|---------------------------|-----------------|
| Bản chất | Hàng đợi, message **rời đi** khi xử lý xong | **Log** append-only, message **ở lại** theo retention |
| Đọc = xoá? | Có (ack → xoá) | **Không** (đọc không đụng tới dữ liệu) |
| Ai theo dõi tiến độ? | **Broker** theo dõi từng message đã ack | **Consumer** tự giữ **offset** |
| Nhiều bên cùng nhận | Fan-out ra nhiều queue, mỗi bên 1 copy | Nhiều **consumer group** đọc **cùng log**, không nhân bản dữ liệu |
| Đọc lại quá khứ (replay) | Không thể (đã xoá rồi) | **Được** — seek về offset cũ và đọc lại |
| State broker giữ | Nặng (per-message) | Nhẹ (chỉ log tuần tự + vị trí commit) |

Chính vì broker **không giữ state per-message**, Kafka đạt được throughput cực cao (hàng triệu message/giây trên phần cứng thường): ghi tuần tự xuống đĩa, đọc tuần tự, tận dụng page cache của OS — không có chi phí quản lý trạng thái từng lá thư.

### 2.3 Topic → Partition → Offset

Một **topic** là một tên logic cho một luồng dữ liệu, vd `orders`, `payments`, `user-clicks`. Nhưng topic **không phải một file log duy nhất**. Để scale, mỗi topic được chia thành nhiều **partition**. Mỗi partition **mới là một commit log thật sự**: một chuỗi bản ghi có thứ tự, đánh số bằng **offset** (0, 1, 2, ... tăng dần, không bao giờ tái sử dụng).

<svg viewBox="0 0 660 300" role="img" aria-labelledby="kp-t kp-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="kp-t">Cấu trúc topic gồm nhiều partition, mỗi partition là log append-only đánh offset</title>
<desc id="kp-d">Topic orders chia thành ba partition; producer ghi vào cuối mỗi partition theo offset tăng dần; consumer đọc từ một offset đã lưu</desc>
<text x="330" y="22" text-anchor="middle" font-size="14" fill="currentColor">Topic "orders" = 3 partition, mỗi partition là 1 log</text>
<rect x="30" y="45" width="70" height="40" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="65" y="69" text-anchor="middle" font-size="11" fill="currentColor">Producer</text>
<text x="150" y="60" text-anchor="middle" font-size="10" fill="currentColor">append vào CUỐI →</text>
<text x="30" y="118" font-size="11" fill="currentColor">P0</text>
<rect x="55" y="100" width="34" height="26" rx="3" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="72" y="117" text-anchor="middle" font-size="9" fill="currentColor">0</text>
<rect x="91" y="100" width="34" height="26" rx="3" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="108" y="117" text-anchor="middle" font-size="9" fill="currentColor">1</text>
<rect x="127" y="100" width="34" height="26" rx="3" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="144" y="117" text-anchor="middle" font-size="9" fill="currentColor">2</text>
<rect x="163" y="100" width="34" height="26" rx="3" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="180" y="117" text-anchor="middle" font-size="9" fill="currentColor">3</text>
<rect x="199" y="100" width="34" height="26" rx="3" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-dasharray="3 2"/><text x="216" y="117" text-anchor="middle" font-size="9" fill="currentColor">4←</text>
<text x="30" y="163" font-size="11" fill="currentColor">P1</text>
<rect x="55" y="145" width="34" height="26" rx="3" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/><text x="72" y="162" text-anchor="middle" font-size="9" fill="currentColor">0</text>
<rect x="91" y="145" width="34" height="26" rx="3" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/><text x="108" y="162" text-anchor="middle" font-size="9" fill="currentColor">1</text>
<rect x="127" y="145" width="34" height="26" rx="3" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-dasharray="3 2"/><text x="144" y="162" text-anchor="middle" font-size="9" fill="currentColor">2←</text>
<text x="30" y="208" font-size="11" fill="currentColor">P2</text>
<rect x="55" y="190" width="34" height="26" rx="3" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/><text x="72" y="207" text-anchor="middle" font-size="9" fill="currentColor">0</text>
<rect x="91" y="190" width="34" height="26" rx="3" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/><text x="108" y="207" text-anchor="middle" font-size="9" fill="currentColor">1</text>
<rect x="127" y="190" width="34" height="26" rx="3" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/><text x="144" y="207" text-anchor="middle" font-size="9" fill="currentColor">2</text>
<rect x="163" y="190" width="34" height="26" rx="3" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-dasharray="3 2"/><text x="180" y="207" text-anchor="middle" font-size="9" fill="currentColor">3←</text>
<text x="255" y="117" font-size="9" fill="currentColor">← ô nét đứt = vị trí ghi kế tiếp (log end)</text>
<line x1="240" y1="113" x2="560" y2="113" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<rect x="470" y="185" width="90" height="40" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="515" y="203" text-anchor="middle" font-size="10" fill="currentColor">Consumer</text>
<text x="515" y="217" text-anchor="middle" font-size="9" fill="currentColor">offset P2 = 2</text>
<line x1="197" y1="203" x2="468" y2="203" stroke="currentColor" stroke-width="1" marker-end="url(#ka)"/>
<text x="330" y="258" text-anchor="middle" font-size="11" fill="currentColor">Offset chỉ tăng, KHÔNG bao giờ tái dùng. Đọc offset 2 không xoá offset 0,1.</text>
<text x="330" y="278" text-anchor="middle" font-size="11" fill="currentColor">Thứ tự chỉ được đảm bảo TRONG một partition, KHÔNG xuyên partition.</text>
<defs><marker id="ka" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Ba tính chất phải khắc cốt:

1. **Partition là đơn vị song song (parallelism).** Muốn xử lý nhanh gấp N → chia topic thành N partition, cho N consumer chạy song song, mỗi consumer "sở hữu" một partition. Số partition đặt **trần** cho mức song song của một consumer group: 6 partition → tối đa 6 consumer active trong một group (consumer thứ 7 sẽ ngồi không).

2. **Partition là đơn vị thứ tự (ordering).** Kafka **chỉ** đảm bảo thứ tự **trong một partition**, **không** xuyên partition. Nếu bạn cần các event của cùng một `order_id` xử lý đúng thứ tự → phải cho chúng vào **cùng một partition**. Cơ chế: producer chọn partition qua **key** — `partition = hash(key) % số_partition`. Cùng key → cùng partition → cùng thứ tự. Không có key → phân bổ round-robin, mất đảm bảo thứ tự theo thực thể.

3. **Offset định danh vị trí, là con trỏ đọc.** Offset là số nguyên tăng dần, **cục bộ theo partition** (P0 offset 5 và P1 offset 5 là hai bản ghi khác nhau). Consumer đọc bằng cách nói "cho tôi từ partition P2, offset 2 trở đi". Vì offset chỉ là một con số consumer nắm giữ, consumer có thể **tua lại (seek)** về offset cũ để đọc lại, hoặc **nhảy tới cuối** để bỏ qua tồn đọng.

### 2.4 Retention: đọc không xoá → replay & multi-consumer

Message ở lại partition theo chính sách **retention**, cấu hình theo **thời gian** (`retention.ms`, vd 7 ngày) hoặc theo **dung lượng** (`retention.bytes`). Trong khoảng đó, dữ liệu **bất biến** và ai cũng đọc lại được. Điều này mở ra hai siêu năng lực:

- **Nhiều consumer độc lập:** service `fraud-check`, `analytics`, `email` cùng đọc topic `orders` mà **không giẫm chân nhau** — mỗi group giữ offset riêng, đọc theo nhịp riêng. Không cần nhân ba bản dữ liệu như RabbitMQ; tất cả cùng đọc **một log**.
- **Replay lịch sử:** deploy service `analytics` phiên bản mới có bug tính sai? Chỉ cần **reset offset về 0** và cho nó đọc lại toàn bộ 7 ngày event để tính lại — dữ liệu vẫn còn nguyên. Với queue truyền thống điều này bất khả thi vì message đã bị xoá lúc ack.

> **Bản chất:** Kafka tách rời hai việc mà queue gộp làm một — "message đã được **lưu**" và "message đã được **xử lý**". Lưu là việc của log (retention). Xử lý-tới-đâu là **offset** do consumer nắm. Broker nhẹ gánh vì không phải nhớ giùm ai.

### 2.5 Consumer group & vì sao broker không cần theo dõi từng message

Nhiều consumer hợp thành một **consumer group** (định danh bằng `group.id`). Kafka **gán mỗi partition cho đúng một consumer** trong group đó (rebalance tự động khi có consumer vào/ra). Đây là cách Kafka **kết hợp cả queue lẫn pub/sub**:
- Trong **cùng một group** → các partition chia cho các consumer → **chia tải** như queue (mỗi message xử lý một lần trong group).
- **Nhiều group khác nhau** → mỗi group nhận **đủ toàn bộ** log → **fan-out** như pub/sub.

Consumer định kỳ **commit offset** — ghi lại "group này đã xử lý tới offset X của partition Y" vào một topic nội bộ tên `__consumer_offsets`. Lưu ý điều tinh tế: broker **không** dõi theo từng message đã ack hay chưa; nó chỉ lưu **một con số cao nhất** cho mỗi (group, partition). Đó là lý do state của broker cực nhẹ, và cũng là lý do delivery mặc định là **at-least-once**: nếu consumer xử lý xong nhưng chết **trước khi** commit offset, lần sau nó đọc lại từ offset commit cũ → xử lý lại (Bài về idempotency/exactly-once sẽ đào sâu).

Vì mỗi partition có một log-end-offset (offset sẽ ghi kế tiếp) và mỗi (group, partition) có một committed offset, "consumer đang tụt lại bao xa" chỉ là một phép trừ: **lag = log-end-offset − committed offset** (chính cột `LAG` mà lệnh `kafka-consumer-groups.sh --describe` ở mục 3 in ra). Hình dưới mô phỏng một partition (số minh hoạ): producer append 1 message mỗi giây, consumer xử lý và commit 1 message mỗi 2 giây. Ô xanh lá là đã commit, ô xanh dương là đã ghi nhưng group chưa commit, khung nét đứt là message consumer đang xử lý. Committed offset là offset **kế tiếp** cần đọc: commit 7 nghĩa là offset 0..6 đã xong.

<auto-anim data-dur="12">
<svg viewBox="0 0 480 346" role="img" aria-labelledby="msg07a-t msg07a-d" font-family="ui-sans-serif, system-ui, sans-serif" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="msg07a-t">Consumer chậm hơn producer: lag = log-end-offset trừ committed offset lớn dần</title>
<desc id="msg07a-d">Một partition. Lúc 0 giây log có offset 0 và 1, đều đã commit, lag 0. Producer append 1 message mỗi giây vào cuối log; consumer xử lý xong và commit 1 message mỗi 2 giây. Sau 10 giây log-end-offset là 12, committed offset là 7, lag là 5 và vẫn đang tăng khoảng 1 message mỗi 2 giây.</desc>
<text x="24" y="22" font-size="13" fill="currentColor">1 partition · producer append 1 msg mỗi giây</text>
<text x="24" y="42" font-size="13" fill="currentColor">consumer xử lý + commit 1 msg mỗi 2 giây</text>
<g opacity="1"><rect x="24" y="74" width="34" height="34" rx="3" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.5"></rect><text x="41.0" y="96" text-anchor="middle" font-size="13" fill="currentColor">0</text></g>
<g opacity="1"><rect x="60" y="74" width="34" height="34" rx="3" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.5"></rect><text x="77.0" y="96" text-anchor="middle" font-size="13" fill="currentColor">1</text></g>
<g opacity="1"><rect x="96" y="74" width="34" height="34" rx="3" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.5"><animate attributeName="fill" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.1667;1" values="#3b82f6;#10b981;#10b981"/></rect><text x="113.0" y="96" text-anchor="middle" font-size="13" fill="currentColor">2</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;1" values="0;1;1"/><rect x="132" y="74" width="34" height="34" rx="3" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.5"><animate attributeName="fill" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.3333;1" values="#3b82f6;#10b981;#10b981"/></rect><text x="149.0" y="96" text-anchor="middle" font-size="13" fill="currentColor">3</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.1667;1" values="0;1;1"/><rect x="168" y="74" width="34" height="34" rx="3" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.5"><animate attributeName="fill" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.5000;1" values="#3b82f6;#10b981;#10b981"/></rect><text x="185.0" y="96" text-anchor="middle" font-size="13" fill="currentColor">4</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.2500;1" values="0;1;1"/><rect x="204" y="74" width="34" height="34" rx="3" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.5"><animate attributeName="fill" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.6667;1" values="#3b82f6;#10b981;#10b981"/></rect><text x="221.0" y="96" text-anchor="middle" font-size="13" fill="currentColor">5</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.3333;1" values="0;1;1"/><rect x="240" y="74" width="34" height="34" rx="3" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.5"><animate attributeName="fill" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.8333;1" values="#3b82f6;#10b981;#10b981"/></rect><text x="257.0" y="96" text-anchor="middle" font-size="13" fill="currentColor">6</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.4167;1" values="0;1;1"/><rect x="276" y="74" width="34" height="34" rx="3" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.5"></rect><text x="293.0" y="96" text-anchor="middle" font-size="13" fill="currentColor">7</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.5000;1" values="0;1;1"/><rect x="312" y="74" width="34" height="34" rx="3" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.5"></rect><text x="329.0" y="96" text-anchor="middle" font-size="13" fill="currentColor">8</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.5833;1" values="0;1;1"/><rect x="348" y="74" width="34" height="34" rx="3" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.5"></rect><text x="365.0" y="96" text-anchor="middle" font-size="13" fill="currentColor">9</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.6667;1" values="0;1;1"/><rect x="384" y="74" width="34" height="34" rx="3" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.5"></rect><text x="401.0" y="96" text-anchor="middle" font-size="13" fill="currentColor">10</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.7500;1" values="0;1;1"/><rect x="420" y="74" width="34" height="34" rx="3" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.5"></rect><text x="437.0" y="96" text-anchor="middle" font-size="13" fill="currentColor">11</text></g>
<rect x="94" y="72" width="38" height="38" rx="4" fill="none" stroke="#10b981" stroke-width="2.5" stroke-dasharray="4 3"><animate attributeName="x" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.1667;0.3333;0.5000;0.6667;0.8333;1" values="94;130;166;202;238;274;274"/></rect>
<g><animateTransform attributeName="transform" type="translate" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;1" values="0 0;36 0;72 0;108 0;144 0;180 0;216 0;252 0;288 0;324 0;360 0;360 0"/><polygon points="88,58 102,58 95,70" fill="#3b82f6"/></g>
<g><animateTransform attributeName="transform" type="translate" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.1667;0.3333;0.5000;0.6667;0.8333;1" values="0 0;36 0;72 0;108 0;144 0;180 0;180 0"/><polygon points="88,124 102,124 95,112" fill="#10b981"/></g>
<rect x="95" y="130" width="0" height="6" fill="#f43f5e"><animate attributeName="x" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.1667;0.3333;0.5000;0.6667;0.8333;1" values="95;131;167;203;239;275;275"/><animate attributeName="width" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.2500;0.4167;0.5833;0.7500;1" values="0;36;72;108;144;180;180"/></rect>
<polygon points="24,157 36,157 30,167" fill="#3b82f6"/><text x="44" y="168" font-size="13" fill="currentColor">log-end-offset</text>
<polygon points="24,191 36,191 30,181" fill="#10b981"/><text x="44" y="192" font-size="13" fill="currentColor">committed offset</text>
<rect x="24" y="208" width="12" height="6" fill="#f43f5e"/><text x="44" y="216" font-size="13" font-weight="700" fill="currentColor">lag</text>
<g opacity="1"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;1" values="1;0;0"/><text x="200" y="168" font-size="13" font-weight="700" fill="currentColor">2</text><text x="200" y="192" font-size="13" font-weight="700" fill="currentColor">2</text><text x="200" y="216" font-size="13" font-weight="700" fill="#f43f5e">2 − 2 = 0</text><text x="456" y="192" text-anchor="end" font-size="20" font-weight="700" fill="currentColor">t = 0s</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;1" values="0;1;0;0"/><text x="200" y="168" font-size="13" font-weight="700" fill="currentColor">3</text><text x="200" y="192" font-size="13" font-weight="700" fill="currentColor">2</text><text x="200" y="216" font-size="13" font-weight="700" fill="#f43f5e">3 − 2 = 1</text><text x="456" y="192" text-anchor="end" font-size="20" font-weight="700" fill="currentColor">t = 1s</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.1667;0.2500;1" values="0;1;0;0"/><text x="200" y="168" font-size="13" font-weight="700" fill="currentColor">4</text><text x="200" y="192" font-size="13" font-weight="700" fill="currentColor">3</text><text x="200" y="216" font-size="13" font-weight="700" fill="#f43f5e">4 − 3 = 1</text><text x="456" y="192" text-anchor="end" font-size="20" font-weight="700" fill="currentColor">t = 2s</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.2500;0.3333;1" values="0;1;0;0"/><text x="200" y="168" font-size="13" font-weight="700" fill="currentColor">5</text><text x="200" y="192" font-size="13" font-weight="700" fill="currentColor">3</text><text x="200" y="216" font-size="13" font-weight="700" fill="#f43f5e">5 − 3 = 2</text><text x="456" y="192" text-anchor="end" font-size="20" font-weight="700" fill="currentColor">t = 3s</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.3333;0.4167;1" values="0;1;0;0"/><text x="200" y="168" font-size="13" font-weight="700" fill="currentColor">6</text><text x="200" y="192" font-size="13" font-weight="700" fill="currentColor">4</text><text x="200" y="216" font-size="13" font-weight="700" fill="#f43f5e">6 − 4 = 2</text><text x="456" y="192" text-anchor="end" font-size="20" font-weight="700" fill="currentColor">t = 4s</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.4167;0.5000;1" values="0;1;0;0"/><text x="200" y="168" font-size="13" font-weight="700" fill="currentColor">7</text><text x="200" y="192" font-size="13" font-weight="700" fill="currentColor">4</text><text x="200" y="216" font-size="13" font-weight="700" fill="#f43f5e">7 − 4 = 3</text><text x="456" y="192" text-anchor="end" font-size="20" font-weight="700" fill="currentColor">t = 5s</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.5000;0.5833;1" values="0;1;0;0"/><text x="200" y="168" font-size="13" font-weight="700" fill="currentColor">8</text><text x="200" y="192" font-size="13" font-weight="700" fill="currentColor">5</text><text x="200" y="216" font-size="13" font-weight="700" fill="#f43f5e">8 − 5 = 3</text><text x="456" y="192" text-anchor="end" font-size="20" font-weight="700" fill="currentColor">t = 6s</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.5833;0.6667;1" values="0;1;0;0"/><text x="200" y="168" font-size="13" font-weight="700" fill="currentColor">9</text><text x="200" y="192" font-size="13" font-weight="700" fill="currentColor">5</text><text x="200" y="216" font-size="13" font-weight="700" fill="#f43f5e">9 − 5 = 4</text><text x="456" y="192" text-anchor="end" font-size="20" font-weight="700" fill="currentColor">t = 7s</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.6667;0.7500;1" values="0;1;0;0"/><text x="200" y="168" font-size="13" font-weight="700" fill="currentColor">10</text><text x="200" y="192" font-size="13" font-weight="700" fill="currentColor">6</text><text x="200" y="216" font-size="13" font-weight="700" fill="#f43f5e">10 − 6 = 4</text><text x="456" y="192" text-anchor="end" font-size="20" font-weight="700" fill="currentColor">t = 8s</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.7500;0.8333;1" values="0;1;0;0"/><text x="200" y="168" font-size="13" font-weight="700" fill="currentColor">11</text><text x="200" y="192" font-size="13" font-weight="700" fill="currentColor">6</text><text x="200" y="216" font-size="13" font-weight="700" fill="#f43f5e">11 − 6 = 5</text><text x="456" y="192" text-anchor="end" font-size="20" font-weight="700" fill="currentColor">t = 9s</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.8333;1" values="0;1;1"/><text x="200" y="168" font-size="13" font-weight="700" fill="currentColor">12</text><text x="200" y="192" font-size="13" font-weight="700" fill="currentColor">7</text><text x="200" y="216" font-size="13" font-weight="700" fill="#f43f5e">12 − 7 = 5</text><text x="456" y="192" text-anchor="end" font-size="20" font-weight="700" fill="currentColor">t = 10s</text></g>
<text x="24" y="246" font-size="13" fill="currentColor" opacity="0.8">lag theo thời gian</text>
<line x1="28" y1="318" x2="460" y2="318" stroke="currentColor" stroke-opacity="0.45"/>
<text x="44" y="338" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.75">0s</text>
<text x="124" y="338" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.75">2s</text>
<text x="204" y="338" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.75">4s</text>
<text x="284" y="338" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.75">6s</text>
<text x="364" y="338" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.75">8s</text>
<text x="444" y="338" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.75">10s</text>
<g opacity="1"><rect x="33" y="316" width="22" height="2" fill="#f43f5e" fill-opacity="0.75"/><text x="44" y="311" text-anchor="middle" font-size="13" fill="currentColor">0</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;1" values="0;1;1"/><rect x="73" y="309" width="22" height="9" fill="#f43f5e" fill-opacity="0.75"/><text x="84" y="304" text-anchor="middle" font-size="13" fill="currentColor">1</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.1667;1" values="0;1;1"/><rect x="113" y="309" width="22" height="9" fill="#f43f5e" fill-opacity="0.75"/><text x="124" y="304" text-anchor="middle" font-size="13" fill="currentColor">1</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.2500;1" values="0;1;1"/><rect x="153" y="300" width="22" height="18" fill="#f43f5e" fill-opacity="0.75"/><text x="164" y="295" text-anchor="middle" font-size="13" fill="currentColor">2</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.3333;1" values="0;1;1"/><rect x="193" y="300" width="22" height="18" fill="#f43f5e" fill-opacity="0.75"/><text x="204" y="295" text-anchor="middle" font-size="13" fill="currentColor">2</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.4167;1" values="0;1;1"/><rect x="233" y="291" width="22" height="27" fill="#f43f5e" fill-opacity="0.75"/><text x="244" y="286" text-anchor="middle" font-size="13" fill="currentColor">3</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.5000;1" values="0;1;1"/><rect x="273" y="291" width="22" height="27" fill="#f43f5e" fill-opacity="0.75"/><text x="284" y="286" text-anchor="middle" font-size="13" fill="currentColor">3</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.5833;1" values="0;1;1"/><rect x="313" y="282" width="22" height="36" fill="#f43f5e" fill-opacity="0.75"/><text x="324" y="277" text-anchor="middle" font-size="13" fill="currentColor">4</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.6667;1" values="0;1;1"/><rect x="353" y="282" width="22" height="36" fill="#f43f5e" fill-opacity="0.75"/><text x="364" y="277" text-anchor="middle" font-size="13" fill="currentColor">4</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.7500;1" values="0;1;1"/><rect x="393" y="273" width="22" height="45" fill="#f43f5e" fill-opacity="0.75"/><text x="404" y="268" text-anchor="middle" font-size="13" fill="currentColor">5</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.8333;1" values="0;1;1"/><rect x="433" y="273" width="22" height="45" fill="#f43f5e" fill-opacity="0.75"/><text x="444" y="268" text-anchor="middle" font-size="13" fill="currentColor">5</text></g>
<line x1="44" y1="252" x2="44" y2="322" stroke="currentColor" stroke-opacity="0.6" stroke-dasharray="3 3"><animate attributeName="x1" dur="12s" repeatCount="indefinite" keyTimes="0;0.8333;1" values="44;444;444"/><animate attributeName="x2" dur="12s" repeatCount="indefinite" keyTimes="0;0.8333;1" values="44;444;444"/><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.8250;1" values="1;0;0"/></line>
</svg>
</auto-anim>

Sau 10 giây: log-end-offset 12, committed 7, lag 5, và cứ 2 giây lag tăng thêm 1 vì producer nhanh gấp đôi consumer. Lag tăng đều như vậy nghĩa là consumer không bao giờ đuổi kịp; cách gỡ là thêm consumer vào group (tối đa bằng số partition) hoặc làm consumer xử lý nhanh hơn.

---

## 3. Bắt tay: tạo topic và đọc log bằng CLI

Kafka đi kèm bộ script CLI. Giả sử broker chạy ở `localhost:9092`.

```bash
# Tạo topic "orders" với 3 partition, 3 bản sao (replication)
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --partitions 3 \
  --replication-factor 3

# Xem chi tiết: mỗi partition có leader/replica ở broker nào
kafka-topics.sh --describe --topic orders --bootstrap-server localhost:9092

# Bơm message có KEY (key\tvalue) — cùng key rơi vào cùng partition
kafka-console-producer.sh --bootstrap-server localhost:9092 \
  --topic orders --property "parse.key=true" --property "key.separator=:"
> order-42:{"event":"created","amount":250}
> order-42:{"event":"paid","amount":250}

# Đọc TỪ ĐẦU (--from-beginning) — chứng minh message KHÔNG bị xoá khi đọc,
# và in kèm partition + offset để thấy cấu trúc log
kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic orders --from-beginning \
  --property print.partition=true --property print.offset=true

# Xem offset commit của một consumer group (broker giữ MỘT số/partition)
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group analytics
# CURRENT-OFFSET | LOG-END-OFFSET | LAG cho từng partition

# REPLAY: reset offset của group "analytics" về đầu để đọc lại toàn bộ lịch sử
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group analytics --topic orders \
  --reset-offsets --to-earliest --execute
```

Chạy `--from-beginning` **nhiều lần** vẫn ra **cùng dữ liệu** — bằng chứng trực quan rằng đọc **không** tiêu thụ/xoá message, khác hẳn `basic.get` + `ack` của RabbitMQ.

---

## 4. Code: producer & consumer tối giản (Python)

Dùng thư viện `confluent-kafka` (bọc librdkafka, chuẩn production).

```python
# pip install confluent-kafka
from confluent_kafka import Producer

producer = Producer({"bootstrap.servers": "localhost:9092"})

def delivery(err, msg):
    if err:
        print("Gửi lỗi:", err)
    else:
        # Sau khi ghi, broker trả về partition + offset đã cấp cho message
        print(f"OK → partition={msg.partition()} offset={msg.offset()}")

# key=order_id ⇒ mọi event của cùng đơn hàng vào CÙNG partition ⇒ giữ thứ tự
producer.produce("orders", key="order-42",
                 value='{"event":"created","amount":250}',
                 callback=delivery)
producer.produce("orders", key="order-42",
                 value='{"event":"paid","amount":250}',
                 callback=delivery)
producer.flush()   # chờ gửi hết trước khi thoát
```

```python
from confluent_kafka import Consumer

consumer = Consumer({
    "bootstrap.servers": "localhost:9092",
    "group.id": "analytics",          # định danh consumer group
    "auto.offset.reset": "earliest",  # group MỚI: đọc từ offset 0 (đầu log)
    "enable.auto.commit": False,      # tự commit thủ công cho chắc chắn
})
consumer.subscribe(["orders"])

try:
    while True:
        msg = consumer.poll(1.0)          # long-poll 1s
        if msg is None:
            continue
        if msg.error():
            print("Lỗi:", msg.error()); continue

        # Xử lý XONG rồi mới commit ⇒ at-least-once (chết giữa chừng sẽ đọc lại)
        print(f"P{msg.partition()}@{msg.offset()} "
              f"key={msg.key()} val={msg.value()}")
        consumer.commit(msg)              # ghi offset đã xử lý vào __consumer_offsets
finally:
    consumer.close()                      # kích hoạt rebalance, nhả partition
```

Điểm cốt lõi trong code:
- Producer nhận lại `partition` và `offset` **sau khi** broker ghi — offset do broker cấp, tăng dần.
- Consumer khai báo `group.id`; đổi `group.id` khác → thành một "người đọc" độc lập, đọc lại **từ đầu** log (nhờ `auto.offset.reset=earliest`) mà không ảnh hưởng group cũ.
- **Commit sau khi xử lý** cho at-least-once. Commit **trước** khi xử lý sẽ thành at-most-once (chết là mất message). Không có cấu hình "broker xoá message sau ack" — vì Kafka **không xoá theo ack**, chỉ theo retention.

---

## 5. Sai lầm thường gặp

| Ngộ nhận | Thực tế |
|----------|---------|
| "Đọc message xong nó biến mất" | Không. Đọc **không** xoá; message ở lại tới hết retention. |
| "Kafka đảm bảo thứ tự toàn topic" | Chỉ **trong một partition**. Cần thứ tự theo thực thể → dùng **key** để dồn về một partition. |
| "Thêm partition thoải mái để scale" | Tăng partition **phá** ánh xạ `hash(key)%N` → key cũ đổi partition, hỏng thứ tự lịch sử. Cân nhắc kỹ số partition từ đầu. |
| "Nhiều consumer trong 1 group đọc nhanh gấp bội" | Chỉ tới **số partition**. 3 partition thì consumer thứ 4 trong group ngồi không. |
| "Broker biết message nào đã xử lý" | Broker chỉ giữ **một offset commit / (group, partition)**. Việc xử lý-tới-đâu là của consumer. |

---

## 6. Tóm tắt
- Kafka là **distributed append-only commit log**, **không phải** queue truyền thống: đọc **không xoá**, message ở lại theo **retention**.
- **Topic** chia thành **partition**; mỗi partition là một log riêng, đánh **offset** tăng dần, bất biến.
- **Partition = đơn vị song song** (trần số consumer trong một group) **và = đơn vị thứ tự** (chỉ đảm bảo trong partition; dùng **key** để dồn cùng thực thể về một partition).
- **Retention** cho phép **nhiều consumer group độc lập** cùng đọc một log và **replay** lịch sử — điều queue truyền thống không làm được.
- Khác RabbitMQ ở gốc rễ: broker Kafka **không theo dõi từng message đã đọc**; **consumer tự giữ offset** (chỉ commit một con số cao nhất / group / partition) → broker nhẹ, throughput cực cao, delivery mặc định **at-least-once**.

> **Bài tiếp theo (Bài 8):** đi sâu vào **replication, leader/follower, ISR và acks** — cách Kafka giữ log không mất dữ liệu khi broker chết, và đánh đổi giữa độ bền và độ trễ khi ghi.
