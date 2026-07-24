# Bài 9 — Kafka storage: log segment, retention, replication

## 1. Mục tiêu
Sau bài này bạn có thể:
- Hình dung một **partition** thực chất là **chuỗi file log segment + index** trên đĩa, không phải cấu trúc bí ẩn.
- Cấu hình **retention** theo **thời gian** hoặc **kích thước**, và hiểu **log compaction** (giữ bản mới nhất mỗi key) để làm changelog/state.
- Giải thích **replication**: mỗi partition có **leader + follower**, **ISR (in-sync replicas)**, và bộ đôi `min.insync.replicas` + `acks=all` để **không mất dữ liệu**.
- Nói rõ **high watermark**: vì sao message chỉ được đọc *sau khi* đã commit, và điều gì xảy ra khi **leader election**.
- Trả lời câu hỏi kinh điển: **vì sao Kafka ghi ĐĨA mà vẫn nhanh** — sequential write, OS page cache, zero-copy `sendfile`.

---

## 2. Lý thuyết

### 2.1 Analogy: partition là một cuốn sổ cái ghi nối đuôi

Hãy tưởng tượng partition như một **cuốn sổ cái kế toán** khổng lồ: bạn chỉ được **ghi thêm dòng mới xuống cuối** (append-only), không tẩy xóa dòng cũ. Mỗi dòng có một **số thứ tự tăng dần** — đó là **offset**. Khi cuốn sổ dày quá, bạn không viết mãi vào một quyển; bạn **đóng quyển cũ lại và mở quyển mới** — mỗi quyển là một **log segment**.

Chính bản chất "chỉ ghi nối đuôi" này là lý do Kafka nhanh và bền: ghi tuần tự cực rẻ với đĩa, và không bao giờ sửa dữ liệu cũ nên không cần lock phức tạp.

### 2.2 Cấu trúc trên đĩa: segment + index

Một partition (ví dụ topic `orders`, partition `0`) tương ứng với **một thư mục** trên broker. Trong đó là nhiều **segment**, mỗi segment gồm ba file cùng tên (là base offset của segment):

```text
/var/lib/kafka/data/orders-0/
├── 00000000000000000000.log     # dữ liệu message, offset 0 .. 16383
├── 00000000000000000000.index   # ánh xạ offset  → vị trí byte trong .log
├── 00000000000000000000.timeindex# ánh xạ timestamp → offset
├── 00000000000000016384.log     # segment kế, base offset = 16384
├── 00000000000000016384.index
├── 00000000000000016384.timeindex
└── leader-epoch-checkpoint
```

- File `.log` chứa các **record batch** ghi nối đuôi. Tên file = **base offset** (offset của message đầu tiên trong segment).
- **Segment đang ghi** gọi là **active segment** — chỉ có nó nhận append. Các segment cũ là **read-only**.
- File `.index` là **sparse index**: cứ mỗi ~4KB (`log.index.interval.bytes`) mới ghi một mục `(relative offset → byte position)`. Muốn đọc offset 16500, Kafka tìm segment chứa nó (base 16384), tra `.index` để nhảy gần đúng, rồi **scan tuần tự** một đoạn ngắn tới đúng record. Đây là lý do đọc theo offset là **O(log n) tìm segment + quét ngắn**, rất nhanh.
- File `.timeindex` cho phép tìm theo thời gian (dùng cho retention theo time và cho consumer `seek` theo timestamp).

<svg viewBox="0 0 660 250" role="img" aria-labelledby="seg-t seg-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="seg-t">Partition là chuỗi log segment với index sparse</title>
<desc id="seg-d">Một partition gồm nhiều segment nối tiếp theo base offset; segment cuối là active nhận ghi; mỗi segment có file log và index</desc>
<text x="330" y="20" text-anchor="middle" font-size="13" fill="currentColor">partition orders-0 = chuỗi segment (append về bên phải)</text>
<rect x="30" y="45" width="150" height="90" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="63" text-anchor="middle" font-size="10" fill="currentColor">segment base=0</text>
<text x="105" y="80" text-anchor="middle" font-size="9" fill="currentColor">.log offset 0..16383</text>
<text x="105" y="97" text-anchor="middle" font-size="9" fill="currentColor">.index (sparse)</text>
<text x="105" y="114" text-anchor="middle" font-size="9" fill="currentColor">read-only</text>
<rect x="200" y="45" width="150" height="90" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="275" y="63" text-anchor="middle" font-size="10" fill="currentColor">segment base=16384</text>
<text x="275" y="80" text-anchor="middle" font-size="9" fill="currentColor">.log 16384..32767</text>
<text x="275" y="97" text-anchor="middle" font-size="9" fill="currentColor">.index (sparse)</text>
<text x="275" y="114" text-anchor="middle" font-size="9" fill="currentColor">read-only</text>
<rect x="370" y="45" width="150" height="90" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="445" y="63" text-anchor="middle" font-size="10" fill="currentColor">segment base=32768</text>
<text x="445" y="80" text-anchor="middle" font-size="9" fill="currentColor">.log 32768..</text>
<text x="445" y="97" text-anchor="middle" font-size="9" fill="currentColor">ACTIVE</text>
<text x="445" y="114" text-anchor="middle" font-size="9" fill="currentColor">nhận append</text>
<line x1="180" y1="90" x2="200" y2="90" stroke="currentColor" stroke-width="1" marker-end="url(#as)"/>
<line x1="350" y1="90" x2="370" y2="90" stroke="currentColor" stroke-width="1" marker-end="url(#as)"/>
<line x1="540" y1="90" x2="620" y2="90" stroke="currentColor" stroke-width="1.5" marker-end="url(#as)"/>
<text x="585" y="82" text-anchor="middle" font-size="9" fill="currentColor">ghi mới</text>
<rect x="200" y="165" width="320" height="60" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="184" text-anchor="middle" font-size="10" fill="currentColor">.index sparse: offset → byte position</text>
<text x="360" y="201" text-anchor="middle" font-size="9" fill="currentColor">0→0  4096→…  8192→…  (mỗi ~4KB một mục)</text>
<text x="360" y="216" text-anchor="middle" font-size="9" fill="currentColor">tra index nhảy gần đúng, rồi quét tuần tự đoạn ngắn</text>
<line x1="275" y1="135" x2="300" y2="165" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<defs><marker id="as" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.3 Retention: dọn dữ liệu cũ theo time hoặc size

Kafka **không xóa message khi consumer đã đọc** (khác RabbitMQ). Message ở lại tới khi **retention policy** dọn nó. Có hai chính sách (đặt qua `cleanup.policy`):

**a) `delete` (mặc định) — xóa cả segment cũ theo thời gian/kích thước.**

| Tham số | Ý nghĩa | Mặc định |
|---------|---------|----------|
| `retention.ms` | Giữ dữ liệu bao lâu (theo time) | 7 ngày (604800000) |
| `retention.bytes` | Giữ tối đa bao nhiêu byte **mỗi partition** | -1 (không giới hạn) |
| `segment.bytes` | Kích thước tối đa mỗi segment trước khi roll | 1GB |
| `segment.ms` | Thời gian tối đa trước khi roll segment | 7 ngày |

Điểm mấu chốt: retention **làm việc ở mức segment, không phải mức message**. Kafka chỉ có thể xóa **cả một segment** khi *mọi* message trong đó đã quá hạn. Vì thế active segment **không bao giờ** bị xóa, và dữ liệu có thể sống lâu hơn `retention.ms` một chút cho tới khi segment được roll rồi đủ điều kiện xóa. Đó là lý do `segment.bytes`/`segment.ms` ảnh hưởng trực tiếp tới độ "mịn" của việc dọn dẹp.

```bash
# Tạo topic giữ 3 ngày, tối đa 50GB/partition, segment 512MB
kafka-topics.sh --create --topic orders \
  --bootstrap-server localhost:9092 \
  --partitions 6 --replication-factor 3 \
  --config retention.ms=259200000 \
  --config retention.bytes=53687091200 \
  --config segment.bytes=536870912

# Đổi retention của topic đang chạy (không cần restart)
kafka-configs.sh --alter --topic orders \
  --bootstrap-server localhost:9092 \
  --add-config retention.ms=86400000
```

**b) `compact` — log compaction: giữ bản GHI MỚI NHẤT của mỗi key.**

Thay vì xóa theo tuổi, compaction quét log và **chỉ giữ record mới nhất cho mỗi key**; các bản cũ hơn cùng key bị loại. Kết quả: log trở thành một "snapshot" cập nhật của trạng thái *theo key*, mà vẫn giữ được thứ tự tương đối của các key còn sống.

```text
Trước compaction (theo offset):
  k=A v=1 | k=B v=1 | k=A v=2 | k=C v=1 | k=A v=3 | k=B v=2
Sau compaction (giữ bản mới nhất mỗi key):
  k=C v=1 | k=A v=3 | k=B v=2
```

Compaction dùng để lưu **changelog / state**: bảng "trạng thái hiện tại theo key" (số dư tài khoản theo userId, cấu hình theo deviceId). Kafka Streams dùng compacted topic làm **changelog** để khôi phục state store sau khi crash. Topic hệ thống `__consumer_offsets` cũng là compacted.

- Gửi `key=K, value=null` là một **tombstone** — báo "xóa key K". Tombstone được giữ thêm `delete.retention.ms` (mặc định 24h) để consumer kịp thấy lệnh xóa, rồi mới bị dọn.
- Có thể kết hợp `cleanup.policy=compact,delete` — vừa compact vừa áp retention theo time (giữ bản mới nhất *và* không giữ quá X ngày).

```bash
kafka-topics.sh --create --topic account-balance \
  --bootstrap-server localhost:9092 \
  --partitions 6 --replication-factor 3 \
  --config cleanup.policy=compact \
  --config min.cleanable.dirty.ratio=0.5 \
  --config delete.retention.ms=86400000
```

### 2.4 Replication: leader, follower, và ISR

Mỗi partition được nhân bản thành **replication-factor** bản (ví dụ 3), đặt trên 3 broker khác nhau. Trong đó:
- **1 leader**: nhận **mọi** đọc và ghi cho partition đó. Producer/consumer luôn nói chuyện với leader.
- **N-1 follower**: liên tục **fetch** dữ liệu từ leader để copy y hệt. Follower **không** phục vụ client (trừ tính năng fetch-from-follower cho đọc gần vùng địa lý).

**ISR (In-Sync Replicas)** là tập các replica (gồm cả leader) đang **theo kịp** leader — cụ thể là đã fetch trong vòng `replica.lag.time.max.ms` (mặc định 30s). Follower tụt lại quá lâu bị **loại khỏi ISR**; khi bắt kịp lại thì được thêm vào. ISR là "danh sách những bản đủ tin cậy để bầu làm leader mới".

<svg viewBox="0 0 660 300" role="img" aria-labelledby="rep-t rep-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="rep-t">Replication: producer ghi leader, follower fetch, ISR và high watermark</title>
<desc id="rep-d">Producer gửi tới leader trên broker 1; hai follower trên broker 2 và 3 fetch để đồng bộ; ISR gồm cả ba; high watermark là offset đã được mọi ISR sao chép</desc>
<rect x="30" y="60" width="160" height="120" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="110" y="80" text-anchor="middle" font-size="11" fill="currentColor">Broker 1 — LEADER</text>
<text x="110" y="100" text-anchor="middle" font-size="9" fill="currentColor">log: 0 1 2 3 4 5</text>
<text x="110" y="118" text-anchor="middle" font-size="9" fill="currentColor">LEO = 6</text>
<text x="110" y="150" text-anchor="middle" font-size="9" fill="currentColor">HW = 5 (offset 0..4 đã commit)</text>
<rect x="30" y="70" width="115" height="16" rx="3" fill="#10b981" fill-opacity="0.14" stroke="none"/>
<rect x="470" y="40" width="160" height="90" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="550" y="60" text-anchor="middle" font-size="11" fill="currentColor">Broker 2 — follower</text>
<text x="550" y="80" text-anchor="middle" font-size="9" fill="currentColor">log: 0 1 2 3 4</text>
<text x="550" y="98" text-anchor="middle" font-size="9" fill="currentColor">theo kịp → trong ISR</text>
<rect x="470" y="150" width="160" height="90" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="550" y="170" text-anchor="middle" font-size="11" fill="currentColor">Broker 3 — follower</text>
<text x="550" y="190" text-anchor="middle" font-size="9" fill="currentColor">log: 0 1 2 3 4</text>
<text x="550" y="208" text-anchor="middle" font-size="9" fill="currentColor">theo kịp → trong ISR</text>
<rect x="30" y="215" width="180" height="55" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="234" text-anchor="middle" font-size="10" fill="currentColor">Producer acks=all</text>
<text x="120" y="251" text-anchor="middle" font-size="9" fill="currentColor">chỉ được ack khi ISR đã copy</text>
<line x1="120" y1="215" x2="110" y2="180" stroke="currentColor" stroke-width="1.5" marker-end="url(#ar)"/>
<line x1="190" y1="95" x2="470" y2="80" stroke="currentColor" stroke-width="1" marker-end="url(#ar)"/>
<text x="330" y="80" text-anchor="middle" font-size="9" fill="currentColor">fetch</text>
<line x1="190" y1="130" x2="470" y2="190" stroke="currentColor" stroke-width="1" marker-end="url(#ar)"/>
<text x="330" y="175" text-anchor="middle" font-size="9" fill="currentColor">fetch</text>
<text x="330" y="285" text-anchor="middle" font-size="10" fill="currentColor">ISR = {B1, B2, B3}. HW = min(LEO các ISR) = 5 → consumer chỉ đọc offset &lt; HW (tới offset 4)</text>
<defs><marker id="ar" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.5 High watermark: chỉ đọc được cái đã commit

Mỗi replica có **LEO (Log End Offset)** = offset kế tiếp sẽ ghi. Leader theo dõi LEO của mọi ISR và tính **High Watermark (HW)** = **min(LEO của tất cả replica trong ISR)**. Ý nghĩa:

- Một message được coi là **committed** khi **mọi replica trong ISR đã sao chép** nó — tức offset của nó **< HW**.
- **Consumer chỉ được đọc tới HW.** Message đã nằm trên leader nhưng chưa được ISR sao chép hết (offset ≥ HW) thì **vô hình** với consumer.

Vì sao? Để đảm bảo **không đọc trúng dữ liệu có thể biến mất**. Nếu leader chết trước khi follower kịp copy các message ở đuôi (offset ≥ HW), những message đó có thể mất khi leader mới lên — nên Kafka **không bao giờ để consumer thấy chúng**. Consumer chỉ thấy dữ liệu đã "chốt" trên đủ nhiều bản sao ⇒ đọc luôn nhất quán và bền.

### 2.6 acks + min.insync.replicas: hợp đồng không mất dữ liệu

Hai tham số này phối hợp để định nghĩa "ghi thành công nghĩa là gì":

| `acks` | Producer coi là thành công khi... | Rủi ro mất dữ liệu |
|--------|-----------------------------------|--------------------|
| `0` | gửi xong, **không đợi** | Cao — mất nếu leader chưa nhận |
| `1` | **leader** đã ghi vào log | Trung bình — mất nếu leader chết trước khi follower copy |
| `all` (`-1`) | **mọi replica trong ISR** đã ghi | Thấp nhất |

`acks=all` **một mình chưa đủ**. Nếu ISR co lại chỉ còn **mình leader** (2 follower rớt), thì "mọi ISR đã ghi" = "leader đã ghi" — quay về mức an toàn của `acks=1`. Đây là lúc **`min.insync.replicas`** vào cuộc: nó là **số replica tối thiểu trong ISR** để một lần ghi `acks=all` được chấp nhận. Nếu ISR nhỏ hơn ngưỡng, broker **từ chối ghi** (ném `NotEnoughReplicasException`) — thà lỗi ngay còn hơn ghi vào chỗ không đủ bền.

**Công thức vàng cho durability** với replication-factor = 3:

```properties
# broker/topic config
replication.factor = 3
min.insync.replicas = 2      # cần ít nhất 2 bản (leader + 1 follower) đồng bộ

# producer config
acks = all                   # đợi mọi ISR
enable.idempotence = true    # chống ghi trùng khi retry
retries = 2147483647         # retry cho tới khi được (idempotence đảm bảo không trùng)
max.in.flight.requests.per.connection = 5   # <=5 khi idempotence bật
```

Vì sao `min.insync.replicas=2` chứ không phải 3 với RF=3? Đây là cân bằng **durability vs availability**: với 2, bạn chịu được **mất 1 broker** mà vẫn ghi được (còn 2 trong ISR), và vẫn đảm bảo mỗi ghi nằm trên ≥2 bản. Nếu đặt =3, chỉ cần 1 broker bảo trì là **toàn bộ ghi dừng**. Nếu đặt =1 thì mất luôn đảm bảo bền. Quy tắc phổ biến: `min.insync.replicas = replication.factor - 1`.

### 2.7 Leader election: chuyện gì xảy ra khi leader chết

Controller (trong KRaft mode là quorum controller; bản cũ là ZooKeeper) phát hiện leader chết và **bầu leader mới từ ISR**. Vì mọi thành viên ISR đều đã sao chép tới HW, **bầu bất kỳ ai trong ISR đều không mất message đã committed**.

- **Clean leader election** (mặc định, `unclean.leader.election.enable=false`): chỉ bầu từ ISR. Nếu ISR trống (mọi bản đồng bộ đều chết), partition **ngừng phục vụ** (offline) cho tới khi một ISR quay lại — **ưu tiên không mất dữ liệu hơn tính sẵn sàng**.
- **Unclean leader election** (`=true`): cho phép bầu một replica **ngoài ISR** (bị tụt lại) làm leader để partition sống lại — **đánh đổi bằng mất dữ liệu** (những message committed mà bản này chưa copy sẽ biến mất). Chỉ bật khi bạn thà mất ít dữ liệu còn hơn downtime.

Sau khi có leader mới, follower nào có log "đi xa hơn" HW cũ sẽ bị **truncate** về đúng điểm nhất quán rồi fetch lại từ leader mới — nhờ **leader epoch** (file `leader-epoch-checkpoint`) để xác định đúng điểm cắt, tránh phân kỳ dữ liệu.

---

## 3. Vì sao ghi ĐĨA mà vẫn nhanh?

Nghịch lý ai cũng hỏi: Kafka lưu mọi thứ xuống đĩa, sao throughput vẫn hàng triệu message/giây? Ba trụ cột:

### 3.1 Sequential write — ghi tuần tự

Đĩa **rất chậm khi seek ngẫu nhiên** nhưng **rất nhanh khi ghi/đọc tuần tự** (kể cả HDD có thể đạt hàng trăm MB/s tuần tự, gấp hàng trăm lần random). Log append-only của Kafka **chỉ ghi tuần tự vào cuối active segment** — đúng "gu" của đĩa. Không update-in-place, không B-tree phải seek khắp nơi. Đây là quyết định thiết kế nền tảng: đánh đổi tính linh hoạt (không sửa được message) lấy tốc độ ghi tối đa.

### 3.2 OS page cache — để hệ điều hành làm cache

Kafka **không tự quản một heap cache** trong JVM. Nó ghi qua `write()` vào **page cache** của OS; OS gom rồi flush xuống đĩa. Đọc cũng lấy từ page cache. Hệ quả:
- Consumer đọc **kịp thời** (gần đuôi log) hầu như luôn **hit page cache** — dữ liệu vừa ghi còn nóng trong RAM, **không chạm đĩa** thật.
- Cache nằm **ngoài heap** nên không gây áp lực GC, và **sống sót qua restart** tiến trình Kafka (page cache thuộc OS, không mất khi JVM khởi động lại).
- Kafka giao việc quản lý bộ nhớ cho OS — đơn giản hơn và tận dụng toàn bộ RAM rảnh của máy.

### 3.3 Zero-copy với sendfile()

Khi gửi dữ liệu cho consumer, cách thông thường phải copy 4 lần và chuyển ngữ cảnh kernel↔user nhiều lần:

```text
Thông thường: đĩa → page cache → buffer ứng dụng (user) → socket buffer (kernel) → NIC
Zero-copy:    đĩa → page cache ─────────────(sendfile)────────────→ NIC
```

Vì Kafka **gửi nguyên byte** từ file log ra socket **không cần biến đổi** (format trên đĩa = format trên mạng), nó dùng syscall **`sendfile()`**: kernel chuyển thẳng từ page cache ra network card, **bỏ qua** việc copy vào không gian user và trở lại. Tiết kiệm CPU, băng thông bộ nhớ, và số lần chuyển ngữ cảnh — cho phép một broker phục vụ rất nhiều consumer cùng lúc.

> Cộng hưởng ba yếu tố: **ghi tuần tự** nhanh + **page cache** hấp thụ đọc nóng + **zero-copy** phát dữ liệu rẻ ⇒ Kafka dùng đĩa như một "hàng đợi tuần tự" chứ không như một "cơ sở dữ liệu random access". Đó là bí quyết, không phải phép màu.

---

## 4. Kiểm chứng trên máy

```bash
# Xem cấu hình động (retention, cleanup.policy...) của một topic
kafka-configs.sh --describe --topic orders \
  --bootstrap-server localhost:9092

# Xem leader/replicas/ISR của từng partition
kafka-topics.sh --describe --topic orders \
  --bootstrap-server localhost:9092
# Topic: orders  Partition: 0  Leader: 1  Replicas: 1,2,3  Isr: 1,2,3

# Nhìn thẳng vào file segment: dump nội dung .log ra người đọc được
kafka-dump-log.sh \
  --files /var/lib/kafka/data/orders-0/00000000000000000000.log \
  --print-data-log
```

Đọc dòng `--describe`: `Replicas: 1,2,3` là danh sách bản sao, `Isr: 1,2,3` là những bản đang đồng bộ. Khi ISR tụt xuống `Isr: 1` mà `min.insync.replicas=2`, producer `acks=all` sẽ **bắt đầu bị từ chối ghi** — đây là tín hiệu vàng để cảnh báo giám sát (`UnderMinIsr`).

---

## 5. Tóm tắt
- **Partition = chuỗi log segment** trên đĩa (`.log` + `.index` sparse + `.timeindex`); chỉ **active segment** nhận ghi nối đuôi; retention dọn theo **mức segment**.
- **Retention**: `delete` xóa segment cũ theo `retention.ms`/`retention.bytes`; **`compact`** giữ **bản mới nhất mỗi key** (làm changelog/state), `value=null` là **tombstone** xóa key.
- **Replication**: mỗi partition có **1 leader + N follower**; **ISR** là các bản theo kịp. **HW = min(LEO của ISR)**; consumer **chỉ đọc tới HW** ⇒ không thấy dữ liệu chưa bền.
- **Không mất dữ liệu** = `acks=all` + `min.insync.replicas ≥ 2` (với RF=3) + idempotent producer; ISR nhỏ hơn ngưỡng thì broker **từ chối ghi** thay vì ghi vào chỗ không đủ bền.
- **Leader election** bầu từ ISR (clean) nên không mất message đã committed; `unclean=true` đánh đổi mất dữ liệu lấy availability.
- Ghi đĩa vẫn nhanh nhờ **sequential write** + **OS page cache** + **zero-copy `sendfile`** — dùng đĩa như hàng đợi tuần tự, không phải DB random.

> **Bài tiếp theo (Bài 10):** consumer group, offset commit và rebalancing — cách nhiều consumer chia nhau partition, cam kết tiến độ đọc, và điều gì xảy ra khi thành viên vào/ra nhóm.
