# Bài 4 — Redis Pub/Sub & Streams

## 1. Mục tiêu
Sau bài này bạn có thể:
- Hiểu bản chất **Pub/Sub**: mô hình **fire-and-forget**, vì sao message **mất** nếu subscriber offline, và khi nào chấp nhận được.
- Nắm **Redis Streams**: một **append-only log bền** — `XADD`/`XREAD`/`XRANGE`, và cách nó *khắc phục* điểm yếu của Pub/Sub.
- Dùng **consumer group** (`XREADGROUP`/`XACK`), hiểu **pending list**, cách **replay** và xử lý message chết.
- Biết **keyspace notifications** để lắng nghe thay đổi trên key.
- So sánh **Redis Streams với Kafka** để biết *khi nào Streams là đủ* và khi nào phải nâng cấp lên Kafka.

---

## 2. Lý thuyết

### 2.1 Hai triết lý gửi tin nhắn

Redis cho bạn **hai cơ chế messaging khác nhau về bản chất**, đừng nhầm lẫn:

- **Pub/Sub** — như một buổi **phát thanh trực tiếp (livestream)**. Đài phát (`PUBLISH`) nói vào micro; *ai đang mở radio thì nghe được*, ai tắt máy thì **mất luôn** đoạn đó — không có ghi âm. Người bật radio sau **không tua lại** được.
- **Streams** — như một **sổ nhật ký (logbook) ghi liên tục**. Mỗi sự kiện được **ghi thêm vào cuối sổ** (append-only), có số thứ tự, **nằm lại đó**. Người đến sau vẫn lật lại đọc từ trang bất kỳ; nhiều người cùng chia nhau đọc và **đánh dấu đã xử lý**.

Sự khác biệt cốt lõi: Pub/Sub **không lưu trạng thái, không lưu message**; Streams **lưu message thành một log bền, có con trỏ đọc**.

---

### 2.2 Pub/Sub — fire-and-forget

Mô hình: client `SUBSCRIBE` vào một **channel** (kênh); client khác `PUBLISH` message vào channel đó; Redis **đẩy ngay** tới *mọi subscriber đang kết nối tại thời điểm publish*.

```bash
# Terminal 1 — subscriber
127.0.0.1:6379> SUBSCRIBE news:sport
Reading messages... (press Ctrl-C to quit)
1) "subscribe"
2) "news:sport"
3) (integer) 1

# Terminal 2 — publisher
127.0.0.1:6379> PUBLISH news:sport "Việt Nam thắng 2-0"
(integer) 1          # số subscriber ĐÃ nhận (đang online)

# Terminal 1 nhận realtime:
1) "message"
2) "news:sport"
3) "Việt Nam thắng 2-0"
```

Con số `(integer) 1` trả về từ `PUBLISH` chính là **số subscriber đang online nhận được**. Nếu **không ai** subscribe, `PUBLISH` trả `0` và **message biến mất vĩnh viễn** — Redis không giữ lại gì.

**Pattern subscribe** — subscribe theo mẫu glob thay vì tên chính xác:

```bash
127.0.0.1:6379> PSUBSCRIBE news:*        # nghe mọi channel bắt đầu bằng news:
127.0.0.1:6379> PSUBSCRIBE order.*.paid  # order.vn.paid, order.us.paid...
```

**Bản chất & hệ quả phải nhớ về Pub/Sub:**
- **Fire-and-forget, at-most-once**: gửi xong là quên. Không ACK, không retry, không lưu.
- **Mất message nếu subscriber offline** (mạng chớp, deploy, restart) hoặc nếu subscriber xử lý *chậm* và buffer đầy → Redis **ngắt kết nối** subscriber đó.
- **Không bền**: restart Redis là sạch; không replay được lịch sử.
- **Fan-out thuần**: mọi subscriber của channel đều nhận **bản sao** — không chia tải được (muốn chia tải phải tự phân shard).

→ Pub/Sub hợp cho tín hiệu **realtime, được phép mất**: cập nhật tỉ số live, "typing indicator", invalidate cache, đẩy notification tức thời. **KHÔNG** dùng cho việc *không được mất* (đơn hàng, thanh toán, job).

---

### 2.3 Redis Streams — log bền

Streams sinh ra để vá đúng lỗ hổng đó. Một stream là một **append-only log** với ID tăng dần và message **nằm lại** cho tới khi bạn chủ động xoá/cắt.

<svg viewBox="0 0 660 240" role="img" aria-labelledby="st-t st-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="st-t">Cấu trúc một Redis Stream</title>
<desc id="st-d">Producer XADD ghi thêm entry vào cuối một log gồm các entry có ID timestamp-seq, consumer đọc từ một vị trí bất kỳ</desc>
<rect x="20" y="30" width="110" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="75" y="48" text-anchor="middle" font-size="12" fill="currentColor">Producer</text>
<text x="75" y="64" text-anchor="middle" font-size="11" fill="currentColor">XADD</text>
<line x1="130" y1="50" x2="175" y2="120" stroke="currentColor" stroke-width="1.5" marker-end="url(#se)"/>
<rect x="180" y="100" width="90" height="46" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="225" y="120" text-anchor="middle" font-size="11" fill="currentColor">1710-0</text>
<text x="225" y="136" text-anchor="middle" font-size="10" fill="currentColor">order 7</text>
<rect x="280" y="100" width="90" height="46" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="325" y="120" text-anchor="middle" font-size="11" fill="currentColor">1710-1</text>
<text x="325" y="136" text-anchor="middle" font-size="10" fill="currentColor">order 8</text>
<rect x="380" y="100" width="90" height="46" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="425" y="120" text-anchor="middle" font-size="11" fill="currentColor">1715-0</text>
<text x="425" y="136" text-anchor="middle" font-size="10" fill="currentColor">order 9</text>
<rect x="480" y="100" width="100" height="46" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="530" y="126" text-anchor="middle" font-size="10" fill="currentColor">append mới →</text>
<text x="325" y="88" text-anchor="middle" font-size="11" fill="currentColor">append-only log (ID = ms-seq, tăng dần)</text>
<rect x="240" y="185" width="120" height="38" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="300" y="208" text-anchor="middle" font-size="11" fill="currentColor">Consumer XREAD</text>
<line x1="300" y1="185" x2="300" y2="150" stroke="currentColor" stroke-width="1.2" marker-end="url(#se)"/>
<text x="300" y="172" text-anchor="middle" font-size="10" fill="currentColor">đọc từ ID bất kỳ</text>
<defs><marker id="se" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Mỗi entry có **ID dạng `<millisecond>-<sequence>`** (ví dụ `1710000000000-0`), do Redis tự sinh khi bạn dùng `*`, và **luôn tăng đơn điệu** — đây là "số trang" để tua tới/lui.

```bash
# XADD: ghi thêm entry, "*" = Redis tự sinh ID theo thời gian
127.0.0.1:6379> XADD orders '*' user 7 amount 250000 item "áo"
"1710000000000-0"
127.0.0.1:6379> XADD orders '*' user 8 amount 99000 item "mũ"
"1710000000000-1"      # cùng ms → seq tăng lên 1

# XLEN: độ dài stream
127.0.0.1:6379> XLEN orders
(integer) 2

# XRANGE: đọc theo khoảng ID ( - = đầu, + = cuối )
127.0.0.1:6379> XRANGE orders - +
1) 1) "1710000000000-0"
   2) 1) "user" 2) "7" 3) "amount" 4) "250000" 5) "item" 6) "áo"
2) 1) "1710000000000-1"
   2) 1) "user" 2) "8" 3) "amount" 4) "99000" 5) "item" 6) "mũ"

# XREAD: đọc entry MỚI HƠN một ID. "$" = chỉ những gì tới SAU khi block
127.0.0.1:6379> XREAD COUNT 10 BLOCK 5000 STREAMS orders 0
# BLOCK 5000 = chờ tối đa 5s nếu chưa có dữ liệu mới (long-poll)
```

`XREAD ... STREAMS orders 0` nghĩa "đọc mọi entry có ID > 0" (từ đầu). Muốn *chỉ* nhận cái tới trong tương lai, dùng ID đặc biệt `$`. `BLOCK` biến `XREAD` thành **long-polling**, không phải busy-loop.

**Vì sao Streams giải bài toán mà Pub/Sub thua:**
- Message **bền**: nằm trong log, restart vẫn còn (nếu bật AOF/RDB), subscriber offline rồi online lại vẫn **đọc tiếp từ ID cuối** đã xử lý → **không mất**.
- **Replay** lịch sử: `XRANGE`/`XREAD` từ ID bất kỳ để tua lại, debug, backfill.
- Nhiều consumer, có thể **chia tải** (consumer group, phần 2.4).

**Cắt log để RAM không phình mãi** — stream nằm trong RAM nên phải giới hạn:

```bash
# Giữ ~ 1 triệu entry gần nhất (xấp xỉ, "~" cho phép cắt hiệu quả hơn)
127.0.0.1:6379> XADD orders MAXLEN '~' 1000000 '*' user 9 amount 50000
# Hoặc cắt theo thời gian: bỏ entry cũ hơn ID mốc
127.0.0.1:6379> XTRIM orders MINID 1710000000000
```

---

### 2.4 Consumer Group — chia tải + at-least-once

`XREAD` thuần cho **fan-out** (mọi reader đọc *toàn bộ*). Muốn **N worker chia nhau** xử lý mỗi message *đúng một lần* và có **ACK + retry**, ta cần **consumer group**.

<svg viewBox="0 0 660 260" role="img" aria-labelledby="cg-t cg-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="cg-t">Consumer group chia message cho nhiều consumer</title>
<desc id="cg-d">Một stream cấp phát mỗi entry cho đúng một consumer trong group, entry chưa ACK nằm trong pending list</desc>
<rect x="30" y="20" width="600" height="60" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="330" y="42" text-anchor="middle" font-size="12" fill="currentColor">Stream "orders" — append-only log</text>
<text x="330" y="62" text-anchor="middle" font-size="11" fill="currentColor">[e1] [e2] [e3] [e4] [e5] [e6] ...</text>
<rect x="230" y="105" width="200" height="40" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="330" y="123" text-anchor="middle" font-size="12" fill="currentColor">Group "workers"</text>
<text x="330" y="139" text-anchor="middle" font-size="10" fill="currentColor">con trỏ last-delivered + PEL</text>
<line x1="330" y1="80" x2="330" y2="105" stroke="currentColor" stroke-width="1.2" marker-end="url(#ce)"/>
<rect x="60" y="185" width="140" height="50" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="130" y="206" text-anchor="middle" font-size="11" fill="currentColor">consumer-1</text>
<text x="130" y="223" text-anchor="middle" font-size="10" fill="currentColor">nhận e1, e4</text>
<rect x="260" y="185" width="140" height="50" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="330" y="206" text-anchor="middle" font-size="11" fill="currentColor">consumer-2</text>
<text x="330" y="223" text-anchor="middle" font-size="10" fill="currentColor">nhận e2, e5</text>
<rect x="460" y="185" width="140" height="50" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="530" y="206" text-anchor="middle" font-size="11" fill="currentColor">consumer-3</text>
<text x="530" y="223" text-anchor="middle" font-size="10" fill="currentColor">nhận e3, e6</text>
<line x1="290" y1="145" x2="130" y2="185" stroke="currentColor" stroke-width="1" marker-end="url(#ce)"/>
<line x1="330" y1="145" x2="330" y2="185" stroke="currentColor" stroke-width="1" marker-end="url(#ce)"/>
<line x1="370" y1="145" x2="530" y2="185" stroke="currentColor" stroke-width="1" marker-end="url(#ce)"/>
<defs><marker id="ce" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Trong một **group**, Redis giữ một con trỏ **last-delivered-id** dùng chung: mỗi entry được **cấp phát cho đúng một consumer** trong group (chia tải). Nhưng "đã cấp phát" **chưa phải** "đã xong" — entry đó vào **PEL (Pending Entries List)** cho tới khi consumer gọi `XACK`.

```bash
# 1) Tạo group. "$" = group chỉ nhận entry MỚI kể từ giờ.
#    Dùng "0" nếu muốn group xử lý cả lịch sử từ đầu. MKSTREAM tạo stream nếu chưa có.
127.0.0.1:6379> XGROUP CREATE orders workers '$' MKSTREAM
OK

# 2) Consumer đọc phần CHƯA cấp cho ai (">"). Redis nhớ ai nhận gì.
127.0.0.1:6379> XREADGROUP GROUP workers consumer-1 COUNT 5 BLOCK 5000 STREAMS orders '>'
1) 1) "orders"
   2) 1) 1) "1710000000000-0"
         2) 1) "user" 2) "7" 3) "amount" 4) "250000"

# 3) Xử lý xong → XACK để gỡ khỏi pending list
127.0.0.1:6379> XACK orders workers 1710000000000-0
(integer) 1

# 4) Xem pending: còn bao nhiêu chưa ACK, của ai, chờ bao lâu
127.0.0.1:6379> XPENDING orders workers
1) (integer) 3                       # tổng pending
2) "1710000000000-1"                 # ID nhỏ nhất
3) "1710000000005-0"                 # ID lớn nhất
4) 1) 1) "consumer-2" 2) "2"         # consumer-2 đang giữ 2 cái chưa ACK
```

**Vòng đời một message trong consumer group** — đây là chỗ đảm bảo **at-least-once**:

<svg viewBox="0 0 640 210" role="img" aria-labelledby="lc-t lc-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="lc-t">Vòng đời message trong consumer group</title>
<desc id="lc-d">Entry đi từ new sang delivered vào pending list, nếu ACK thì done, nếu consumer chết thì được claim lại để retry</desc>
<rect x="20" y="80" width="110" height="48" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="75" y="108" text-anchor="middle" font-size="12" fill="currentColor">New (chưa cấp)</text>
<line x1="130" y1="104" x2="185" y2="104" stroke="currentColor" stroke-width="1.2" marker-end="url(#le)"/>
<text x="157" y="96" text-anchor="middle" font-size="9" fill="currentColor">XREADGROUP</text>
<rect x="190" y="80" width="120" height="48" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="250" y="102" text-anchor="middle" font-size="11" fill="currentColor">Pending (PEL)</text>
<text x="250" y="118" text-anchor="middle" font-size="10" fill="currentColor">delivered, chờ ACK</text>
<line x1="310" y1="98" x2="480" y2="60" stroke="currentColor" stroke-width="1.2" marker-end="url(#le)"/>
<text x="400" y="68" text-anchor="middle" font-size="9" fill="currentColor">XACK</text>
<rect x="485" y="35" width="120" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="545" y="63" text-anchor="middle" font-size="12" fill="currentColor">Done ✓</text>
<line x1="310" y1="112" x2="480" y2="150" stroke="currentColor" stroke-width="1.2" marker-end="url(#le)"/>
<text x="392" y="146" text-anchor="middle" font-size="9" fill="currentColor">consumer chết</text>
<rect x="485" y="128" width="120" height="48" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="545" y="150" text-anchor="middle" font-size="11" fill="currentColor">XCLAIM /</text>
<text x="545" y="166" text-anchor="middle" font-size="11" fill="currentColor">XAUTOCLAIM</text>
<line x1="545" y1="128" x2="290" y2="128" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3" marker-end="url(#le)"/>
<text x="410" y="192" text-anchor="middle" font-size="10" fill="currentColor">claim lại về consumer khác → retry (at-least-once)</text>
<defs><marker id="le" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Nếu `consumer-2` **chết** giữa chừng, message của nó **vẫn kẹt trong PEL** (không mất, khác hẳn Pub/Sub). Một consumer khoẻ mạnh khác **claim lại** để xử lý tiếp:

```bash
# XAUTOCLAIM: tự nhận lại các entry pending đã quá 60s (idle) từ bất kỳ consumer nào
127.0.0.1:6379> XAUTOCLAIM orders workers consumer-3 60000 0
1) "0-0"                             # cursor cho lần quét kế
2) 1) 1) "1710000000000-1"          # entry được claim về consumer-3
      2) 1) "user" 2) "8"

# Đọc lại PHẦN CỦA MÌNH đã nhận nhưng chưa ACK (recovery sau restart):
127.0.0.1:6379> XREADGROUP GROUP workers consumer-1 STREAMS orders 0
# ID "0" (thay vì ">") = "trả lại những gì tôi đang pending", KHÔNG lấy cái mới
```

Cơ chế này cho **at-least-once**: message được xử lý ít nhất một lần (có thể *lặp* nếu claim rồi consumer cũ vẫn ACK muộn) → **consumer phải idempotent** (xử lý trùng ID không sinh tác dụng phụ, ví dụ chống double-charge bằng cách lưu ID đã xử lý).

**Dead-letter**: entry bị claim/retry nhiều lần vẫn lỗi → dùng số đếm `delivery count` (từ `XPENDING ... IDLE`/`XCLAIM`) để chuyển sang một stream `orders:dead` và `XACK` bản gốc, tránh kẹt hàng đợi.

---

### 2.5 Keyspace notifications — lắng nghe thay đổi trên key

Redis có thể **tự publish** một sự kiện Pub/Sub mỗi khi một key thay đổi/hết hạn — hữu ích để "phản ứng khi TTL hết" (ví dụ đơn hàng chưa thanh toán trong 15 phút thì huỷ).

```bash
# Bật: K = keyspace events, E = keyevent, x = expired, g = generic (DEL/EXPIRE)...
127.0.0.1:6379> CONFIG SET notify-keyspace-events Ex

# Lắng nghe MỌI key vừa hết hạn (channel: __keyevent@<db>__:expired)
127.0.0.1:6379> PSUBSCRIBE '__keyevent@0__:expired'

# Ở nơi khác: đặt key có TTL ngắn
127.0.0.1:6379> SET order:99:hold 1 EX 5
# Sau 5s subscriber nhận: message __keyevent@0__:expired "order:99:hold"
```

⚠️ Đây vẫn là **Pub/Sub bên dưới** → *at-most-once, mất nếu subscriber offline*. Với sự kiện hết-hạn **không được bỏ sót**, đừng chỉ dựa vào notification; hãy kết hợp một job quét định kỳ hoặc dùng Streams làm nguồn sự thật. Ngoài ra event `expired` bắn khi key **thực sự bị xoá** (lazy/active expiry), có thể **trễ** so với thời điểm TTL=0.

---

### 2.6 Redis Streams vs Kafka — khi nào Streams là đủ?

Streams "trông giống Kafka thu nhỏ" (log + consumer group + offset), nhưng chúng ở hai đẳng cấp khác nhau về quy mô và độ bền.

| Tiêu chí | **Redis Streams** | **Kafka** |
|----------|-------------------|-----------|
| Lưu trữ | Trong **RAM** (giới hạn MAXLEN) | Trên **đĩa**, giữ được TB–PB, retention ngày/tuần |
| Độ bền | AOF/RDB, phụ thuộc fsync; replica async | Ghi đĩa + **replication ISR**, bền hơn nhiều |
| Throughput | ~ hàng chục–trăm nghìn msg/s / node | **Hàng triệu** msg/s, scale ngang mạnh |
| Song song | 1 group chia theo consumer; **không có partition thật** | **Partition** = đơn vị song song + thứ tự |
| Thứ tự | Toàn cục theo ID trong 1 stream | Thứ tự **trong partition** |
| Hệ sinh thái | Gọn, ít công cụ | Connect, Streams API, Schema Registry, ksqlDB |
| Vận hành | **Rất nhẹ** (đã có sẵn Redis) | Nặng (broker, ZooKeeper/KRaft) |
| Reprocessing | XRANGE trong cửa sổ còn giữ | Replay cả lịch sử dài |

**Chọn Redis Streams khi:**
- Bạn **đã có Redis**, không muốn thêm hạ tầng.
- Khối lượng **vừa** (tới ~vài trăm nghìn msg/s), retention **ngắn** (giờ/ngày), dữ liệu vừa RAM.
- Cần một **job/task queue** bền, có ACK/retry, độ trễ thấp — thay cho List `LPUSH/BRPOP` mà vẫn muốn replay + consumer group.
- Realtime pipeline nhẹ: click stream tạm, notification, fan-in sự kiện nội bộ.

**Nâng lên Kafka khi:** cần retention dài (audit, event sourcing lâu dài), throughput cực lớn, **partition thật** để song song hoá theo key ở quy mô lớn, hoặc cần hệ sinh thái stream-processing (exactly-once, connectors). Quy tắc gọn: **Streams là "Kafka đủ dùng" cho quy mô vừa và dữ liệu tạm; Kafka là xương sống event ở quy mô lớn, bền lâu.**

---

## 3. Bảng chốt: Pub/Sub vs Streams

| | **Pub/Sub** | **Streams** |
|---|---|---|
| Lưu message | Không | **Có** (log bền) |
| Subscriber offline | **Mất** | Vẫn đọc tiếp được |
| Delivery | at-most-once | **at-least-once** (có ACK) |
| Replay lịch sử | Không | **Có** (XRANGE/XREAD) |
| Chia tải nhiều worker | Không (fan-out) | **Có** (consumer group) |
| Chi phí RAM | ~0 (không giữ) | Tốn RAM theo log |
| Hợp cho | Tín hiệu realtime được phép mất | Job/event **không được mất** |

---

## 4. Tóm tắt
- **Pub/Sub** = phát thanh live: `PUBLISH`/`SUBSCRIBE`, **fire-and-forget, at-most-once**, mất message nếu không ai online, không bền, không replay. Hợp tín hiệu realtime **được phép mất**.
- **Streams** = sổ nhật ký bền: `XADD`/`XREAD`/`XRANGE`, log append-only có ID tăng dần, message **nằm lại** → offline vẫn đọc tiếp, **replay** được, nhớ **XTRIM/MAXLEN** kẻo phình RAM.
- **Consumer group** (`XREADGROUP`/`XACK`, PEL, `XAUTOCLAIM`) cho **chia tải + at-least-once + recovery** → consumer phải **idempotent**, có đường **dead-letter**.
- **Keyspace notifications** báo thay đổi/hết-hạn key, nhưng bản chất vẫn là Pub/Sub → không dựa vào cho việc không được bỏ sót.
- **Streams đủ dùng** khi đã có Redis, quy mô vừa, retention ngắn; **lên Kafka** khi cần bền lâu, throughput khổng lồ, partition thật và hệ sinh thái stream-processing.

> **Bài tiếp theo (Bài 5):** persistence của Redis — **RDB vs AOF**, đánh đổi độ bền/hiệu năng, và điều đó ảnh hưởng thế nào tới độ tin cậy của chính Streams ở trên.
