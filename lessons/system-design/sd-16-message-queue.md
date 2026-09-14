# Case study: Distributed Message Queue

Bài này dễ bị trả lời sai không phải vì khó hiểu, mà vì hầu hết mọi người trả lời **sai bài toán**. Họ mô tả một cái hàng đợi: producer đẩy vào, consumer lấy ra, lấy xong thì xoá. Mô tả đó đúng với RabbitMQ. Nhưng khi đề bài thêm ba chữ — *giữ lại hai tuần*, *đọc lại được nhiều lần*, *giữ đúng thứ tự* — thì bạn không còn thiết kế một hàng đợi nữa. Bạn đang thiết kế **một cái log phân tán ghi hàng trăm nghìn message mỗi giây lên đĩa, giữ nguyên chúng hàng tuần, và cho N nhóm người đọc độc lập lướt qua với tốc độ khác nhau**. Đó là bài toán **lưu trữ**, không phải bài toán hàng đợi. Và gần như mọi quyết định thú vị trong bài — append-only log, batching, page cache, zero-copy, partition, offset do consumer giữ — đều là hệ quả trực tiếp của việc chuyển góc nhìn đó.

> 💡 **Nguyên tắc xuyên suốt**: message queue truyền thống coi message là **việc cần làm** — làm xong thì xoá. Event streaming platform coi message là **sự thật đã xảy ra** — sự thật thì không xoá, chỉ hết hạn lưu trữ. Hai thế giới quan này đẻ ra hai kiến trúc khác hẳn nhau, và câu đầu tiên bạn phải làm rõ là mình đang xây cái nào.

---

## 0. Hai loại hệ thống — phân biệt ngay dòng đầu tiên

**Message queue truyền thống** (RabbitMQ, ActiveMQ, Amazon SQS). Broker giữ message như hộp thư: message vào, một consumer lấy ra, ack về, broker **xoá**. Trạng thái "message này đã xử lý chưa" nằm **ở broker**, per-message: đã giao cho ai, giao lúc nào, có cần giao lại không. Broker vì thế phải có cấu trúc cho phép **xoá ngẫu nhiên ở giữa**.

**Event streaming platform** (Kafka, Pulsar, Kinesis). Broker giữ một **log chỉ ghi thêm** (append-only log); mỗi message có một số thứ tự gọi là **offset**. Không ai xoá message khi đọc. Consumer tự nhớ "tôi đang ở offset 4211" và tự tiến lên. Broker chỉ biết nối byte vào cuối file và trả byte từ một offset.

| Khía cạnh | Message queue (RabbitMQ/SQS) | Event streaming (Kafka/Kinesis) |
|---|---|---|
| Sau khi consume | Message bị xoá | Vẫn nằm đó tới hết retention |
| Ai giữ trạng thái tiêu thụ | **Broker**, per-message | **Consumer**, một offset per-partition |
| Cấu trúc lưu trữ | Queue có xoá ngẫu nhiên ở giữa | File append-only, ghi tuần tự |
| Đọc lại lịch sử | Không | Có — tua offset lùi lại |
| Nhiều nhóm consumer độc lập | Cần fan-out ở broker (SNS→N queue) | Miễn phí: N consumer group |
| Thứ tự | Khó; redelivery làm loạn thứ tự | Có, nhưng **chỉ trong một partition** |
| Chi phí state ở broker | O(số message tồn đọng) | O(số partition × số group) |
| Định tuyến phức tạp, priority, TTL từng message | Rất mạnh | Gần như không có |
| Mạnh nhất ở | Phân phối công việc, retry tinh vi | Throughput khổng lồ, replay, nhiều consumer |

Dòng quan trọng nhất là **chi phí state ở broker**. RabbitMQ với 50 triệu message tồn đọng phải theo dõi 50 triệu mẩu trạng thái — bộ nhớ phình theo backlog, và đó là lúc nó chậm thảm hại. Kafka với backlog 50 triệu chỉ là "offset consumer thấp hơn offset cuối 50 triệu đơn vị": chi phí state là **một con số**. Đây là lý do sâu xa nhất khiến log nuốt được backlog hàng terabyte còn queue truyền thống thì không.

Đề bài của ta (giữ 2 tuần, đọc lại được, giữ thứ tự) chỉ giải được bằng mô hình thứ hai. Phần còn lại là thiết kế **một Kafka thu nhỏ** — nhưng ta sẽ liên tục quay lại so sánh, vì biết *khi nào không cần Kafka* có giá trị ngang biết cách xây nó.

> ⚠️ **Bẫy phỏng vấn**: nhảy ngay vào "em dùng Kafka" mà không nói vì sao. Nếu yêu cầu thật chỉ là "gửi email bất đồng bộ, không cần thứ tự, không cần replay" thì SQS đơn giản hơn nhiều lần về vận hành và Kafka là over-engineering.

**Hai mô hình giao tiếp** hay bị lẫn với hai họ trên. *Point-to-point*: message vào queue, **đúng một consumer** nhận — thêm consumer nghĩa là làm *nhanh hơn*. *Publish-subscribe*: message gắn với **topic**, **mọi** subscriber nhận bản sao — thêm subscriber nghĩa là thêm một hệ thống quan tâm tới sự kiện.

```
  POINT-TO-POINT                      PUBLISH-SUBSCRIBE
   P ──► [ queue ] ──┬──► C1            P ──► [ topic ] ──┬──► Sub A (analytics)
                     ├──► C2                              ├──► Sub B (search index)
                     └──► C3                              └──► Sub C (audit log)
   mỗi message tới MỘT trong C1..C3      mỗi message tới CẢ BA, tiến độ riêng
```

Thiết kế của ta hợp nhất cả hai bằng **consumer group**: trong cùng group thì hành xử point-to-point; giữa các group thì hành xử pub-sub. Một cơ chế, hai ngữ nghĩa — ý tưởng đẹp nhất của mô hình Kafka.

---

## 1. Làm rõ yêu cầu

| Câu hỏi cần hỏi | Vì sao nó đổi thiết kế |
|---|---|
| Message to bao nhiêu? | Vài KB → thiết kế quanh batching và nén. File 50 MB → phải dùng **claim-check** (payload lên S3, chỉ gửi con trỏ) |
| Có đọc lại nhiều lần không? | Có → bắt buộc log + retention, không thể dùng queue xoá-sau-khi-đọc |
| Cần thứ tự theo cái gì? | Thứ tự toàn cục bất khả thi ở quy mô lớn; thứ tự theo `user_id` thì khả thi → partition key |
| Giữ bao lâu? | 2 tuần → chốt con số dung lượng đĩa, và chốt rằng dữ liệu **phải** ở đĩa |
| Delivery semantics? | at-least-once là mặc định thực tế; exactly-once đắt và có điều kiện |
| Throughput hay latency? | Quyết định batch size, `linger.ms`, `acks`, nén — bốn tham số kéo nhau ngược hướng |

**Yêu cầu chức năng**: producer gửi vào **topic**, consumer subscribe topic; message được tiêu thụ **một hoặc nhiều lần** bởi các group độc lập; **giữ thứ tự** trong phạm vi một partition; truncate dữ liệu cũ theo retention; message cỡ KB; **delivery semantics cấu hình được**.

**Yêu cầu phi chức năng**:
- **Throughput cao *hoặc* latency thấp — cấu hình được.** Câu này hay bị đọc lướt. Nó không nói "vừa cao vừa thấp"; nó nói hệ thống phải **tune được về một trong hai đầu**, vì cùng hạ tầng phải phục vụ cả log aggregation (nuốt GB/s, trễ 500 ms không sao) lẫn thông báo giao dịch (dưới 50 ms, throughput thấp).
- **Scalable**: thêm broker, partition, consumer đều phải là thao tác trực tuyến.
- **Persistent & durable**: dữ liệu trên đĩa, replicate qua nhiều node; mất một broker (hoặc cả một AZ) không mất message đã xác nhận.
- **Availability**: broker chết thì partition của nó có leader mới trong vài giây.

**Giả định chốt**: 1 triệu msg/s lúc cao điểm, message 1 KB; mỗi message được đọc bởi trung bình 3 consumer group; retention 14 ngày; replication factor 3; nén 4:1.

---

## 2. Back-of-envelope estimation

```
GHI   1.000.000 msg/s × 1 KB   = 1 GB/s thô vào cluster
      nén 4:1                  = 250 MB/s thật sự chạm mạng và đĩa
      × replication factor 3   = 750 MB/s tổng ghi đĩa toàn cluster

ĐỌC  1 GB/s × 3 consumer group = 3 GB/s thô (750 MB/s sau nén)

ĐĨA  250 MB/s × 86.400 s       ≈ 21,6 TB/ngày (một bản, đã nén)
      × 14 ngày × RF 3         ≈ 907 TB
      + 30% headroom           ≈ 1,2 PB tổng đĩa cần có

MẠNG một broker (1/100 tải): 2,5 (ghi vào) + 5 (replicate ra) + 5 (nhận replicate)
                             + 7,5 (phục vụ consumer) ≈ 20 MB/s ≈ 160 Mbps
```

**750 MB/s ghi đĩa liên tục** là con số đầu tiên đáng nhớ. HDD 7200 rpm ghi **tuần tự** được 150–200 MB/s nhưng ghi **ngẫu nhiên** rơi xuống dưới 2 MB/s — nếu thiết kế tạo ra pattern ngẫu nhiên, ta cần hơn 400 ổ đĩa chỉ để theo kịp. Con số này một mình loại bỏ mọi thiết kế dựa trên B-tree/database và ép ta về append-only log. **Nó là lý do §5 tồn tại.**

Về phía đọc, chỉ phần nhỏ thật sự chạm đĩa: consumer bám sát đầu log đọc trúng dữ liệu vừa ghi, tức vẫn còn trong **page cache**; chỉ consumer lag hoặc đang replay mới xuống đĩa thật. Từ đó ra mục tiêu: **đường đọc dữ liệu nóng không được chạm đĩa và không được copy qua user space**. Còn **1,2 PB** chốt hai điều: dữ liệu phải ở đĩa **rẻ trên mỗi TB** (ghi tuần tự nên HDD đủ nhanh mà rẻ hơn SSD 5–10 lần), và với 100 broker thì mỗi broker gánh ~12 TB và ~7,5 MB/s ghi — trong tầm một máy thường.

**Số partition**: partition là đơn vị song song hoá **duy nhất**. Với ~10 MB/s an toàn mỗi partition, `250 ÷ 10 = 25` là tối thiểu về throughput. Nhưng số partition còn phải ≥ số consumer song song trong một group (mỗi partition chỉ gán cho **một** consumer trong group). Muốn 200 consumer song song thì cần ≥ 200 partition. Thực tế chọn **vài trăm** — và §6.3 sẽ cho thấy vì sao không được quá nhiều.

Mạng thoải mái với NIC 10 Gbps — **mạng không phải bottleneck**. Nhưng nhớ phép nhân: RF=3 nghĩa là mỗi byte producer gửi tạo ra 3 byte qua mạng và 3 byte chạm đĩa. Khi ai đó đề nghị nâng RF lên 5 "cho an toàn", hãy đưa phép nhân này ra.

> 💡 **Bốn con số cần thuộc**: 1 GB/s vào, 750 MB/s ghi đĩa sau replication, 1,2 PB đĩa, ~25 partition tối thiểu (thực tế vài trăm). Mỗi con số dẫn thẳng tới một quyết định: append-only log, HDD rẻ, page cache + zero-copy, partition là đơn vị scale.

---

## 3. API design

```
PRODUCER
  produce(topic, partition_key?, value, headers?) -> (partition, offset)

CONSUMER
  subscribe(group_id, topics[])        -> assignment[]
  poll(timeout_ms)                     -> messages[]      // long polling, pull model
  commit(group_id, partition, offset)                     // xác nhận đã xử lý tới đâu
  seek(partition, offset | timestamp)                     // tua để replay

ADMIN
  createTopic(name, num_partitions, replication_factor, retention)
  alterTopic(name, num_partitions)     // chỉ tăng được — xem §6.3
  describeGroup(group_id)  -> per-partition: committed_offset, log_end_offset, lag
```

Ba điểm đáng nói. **Không có `delete(message_id)`** — dấu hiệu nhận biết event streaming platform; consumer chỉ dịch chuyển một con trỏ. So sánh: trong SQS, `DeleteMessage` là thao tác bắt buộc và là thứ mà toàn bộ độ phức tạp của visibility timeout xoay quanh. **`commit` tách rời `poll`** — chính chỗ tách này sinh ra ba loại delivery semantics (§9). **`seek` theo timestamp** — trong vận hành thật, khi ai đó nói "chạy lại từ 3 giờ sáng", không ai biết offset của 3 giờ sáng; cần một index phụ timestamp→offset (§5.3).

---

## 4. High-level design

```
   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │ Producer │   │ Producer │   │ Producer │  client lib: buffer + batch + nén + biết
   └────┬─────┘   └────┬─────┘   └────┬─────┘  partition nào ở broker nào
        └──────────────┼──────────────┘
                       │ push (batch đã nén)
   ════════════════════▼══════════════════════════════════════════
   │                BROKER CLUSTER                                │
   │  ┌────────Broker 1─────────┐   ┌────────Broker 2──────────┐  │
   │  │ T-A/P0 (leader)         │   │ T-A/P0 (follower)        │  │
   │  │ T-A/P1 (follower)       │   │ T-A/P1 (leader)          │  │
   │  │ T-B/P0 (leader)         │   │ T-B/P0 (follower)        │  │
   │  │ data = append-only log  │◄──┤ follower PULL từ leader  │  │
   │  │ segment file + index    │   │ (replication = fetch)    │  │
   │  └─────────────────────────┘   └──────────────────────────┘  │
   ══════════▲═══════════════════════════════▲═══════════════════
              │ pull (fetch từ offset)         │ heartbeat / join / commit
   ┌──────────┴───────────┐       ┌───────────┴──────────────┐
   │ group "etl"          │       │ group "search"           │
   │  C1←P0  C2←P1        │       │  C1←P0,P1                │
   │  offset riêng        │       │  offset riêng            │
   └──────────────────────┘       └──────────────────────────┘

   ┌──────────────────────────────────────────────────────────┐
   │ COORDINATION SERVICE (ZooKeeper / Raft nội bộ)           │
   │  · service discovery: broker nào còn sống                │
   │  · leader election: ai là leader của partition nào        │
   │  · METADATA: số partition, retention, replica plan, ACL   │
   └──────────────────────────────────────────────────────────┘
   ┌──────────────────────────────────────────────────────────┐
   │ STATE: offset đã commit của (group, topic, partition)     │
   │  thực tế là một topic nội bộ, compacted (§10.2)           │
   └──────────────────────────────────────────────────────────┘
```

**Producer** không chỉ là "client gửi HTTP" — nó là thư viện có trạng thái: buffer trong bộ nhớ để gộp batch, bản đồ metadata biết partition nào do broker nào làm leader, và tự nén.

**Broker** làm đúng hai việc: nối byte vào cuối file, và trả byte từ một offset. Sự đơn giản này là chủ ý — mọi thứ phức tạp bị đẩy ra client.

**State storage** giữ offset đã commit. Pattern truy cập: **nhỏ, ghi thường xuyên, ngẫu nhiên, cần nhất quán cao** — khác hẳn message data (tuần tự, khổng lồ). Hai pattern khác nhau thì phải hai kho khác nhau.

**Metadata storage** giữ cấu hình topic và replica plan: nhỏ, hiếm đổi, nhưng cần **nhất quán tuyệt đối** (hai broker không được bất đồng về ai là leader) → việc của một hệ đồng thuận.

**Coordination service** lo service discovery, phát hiện broker chết qua heartbeat, bầu leader. Nó **không nằm trên data path** — message không đi qua ZooKeeper — nhưng nếu chết thì cluster mất khả năng thay đổi cấu trúc (không bầu được leader mới, không tạo được topic).

### 4.1 Vì sao producer tự route thay vì có routing layer

Một **routing layer** đứng giữa nghe hợp lý (producer cực ngu, cứ gửi bừa) nhưng có hai nhược điểm giết nó ở quy mô này: **thêm một chặng mạng** cho mọi message ở 1 triệu msg/s, và **nó phá vỡ batching** — batching chỉ hiệu quả khi gom message *cùng đích* trước khi rời tiến trình gửi, mà chỉ producer mới biết nó sắp gửi thêm gì. Nên ta **nhúng routing vào producer**: tự lấy metadata, tự tính `hash(key) % N`, gom batch theo từng broker đích, nén, gửi một request chứa nhiều batch. Cái giá rất thật — **client trở nên nặng** (metadata cache, buffer, retry, nén), và viết lại client cho mỗi ngôn ngữ là một dự án; đây chính xác là lý do Kafka nổi tiếng có client "khó". Nếu đề bài thêm "hỗ trợ IoT bằng 8 ngôn ngữ" thì câu trả lời đúng là **cả hai**: gateway mỏng cho client nhẹ, đường trực tiếp cho service nội bộ.

---

## 5. Deep dive 1 — Data storage: vì sao lại là một file nối đuôi

Mọi con số throughput ở §2 đứng hoặc sụp ở phần này.

### 5.0 Loại bỏ các phương án khác

Message có ba tính chất rất đặc trưng: **ghi nặng và đọc cũng nặng**; **không bao giờ update, không xoá ở giữa** (chỉ nối vào cuối, cắt bỏ phần đầu khi hết hạn); **truy cập gần như hoàn toàn tuần tự**.

| Phương án | Vì sao không |
|---|---|
| **RDBMS** | B-tree tối ưu cho đọc ngẫu nhiên theo khoá và update tại chỗ — không phải thứ ta cần. Mỗi insert đụng index → ghi ngẫu nhiên; ở 1M insert/s không cấu hình nào cứu được |
| **LSM-tree KV (RocksDB, Cassandra)** | Ghi tuần tự (tốt) nhưng duy trì thứ tự theo **key** và phải **compaction** liên tục. Ta không tra cứu theo key, ta đọc theo thứ tự thời gian — trả tiền cho tính năng không dùng |
| **In-memory queue** | 1,2 PB. Hết chuyện |
| **Object storage (S3)** | Latency hàng chục–trăm ms, không hợp real-time; nhưng **rất hợp làm tầng lạnh** (§10.3) |
| **Append-only log trên đĩa** | Khớp cả ba tính chất. Ghi = nối vào cuối. Đọc = quét tuần tự. Xoá = xoá nguyên file segment |

Chọn append-only log không phải vì nó "hiện đại", mà vì **pattern truy cập của bài toán trùng khớp với pattern mà đĩa quay nhanh nhất**.

### 5.1 Vì sao ghi tuần tự trên HDD nhanh hơn ghi ngẫu nhiên trên SSD

Một ổ HDD 7200 rpm có hai loại chi phí hoàn toàn khác nhau: **chi phí định vị** (seek 4–9 ms + rotational latency ~4 ms ≈ **8–10 ms cho mỗi lần nhảy tới vị trí mới**) và **chi phí truyền** (khi đầu đọc đã đúng chỗ, dữ liệu chảy 150–200 MB/s).

```
Ghi NGẪU NHIÊN 4 KB, HDD : ~8 ms định vị/thao tác → ~125 IOPS → ~0,5 MB/s   ◄ thảm hoạ
Ghi TUẦN TỰ, HDD         : định vị 1 lần rồi chảy → 150–200 MB/s            ◄ nhanh gấp ~300×
Ghi NGẪU NHIÊN 4 KB, NVMe: ~100.000 IOPS          → ~400 MB/s
Ghi TUẦN TỰ, NVMe        :                          2–7 GB/s
```

Điều quan trọng không phải "ai thắng ai", mà là **khoảng cách giữa tuần tự và ngẫu nhiên trên cùng một ổ lớn tới 2–3 bậc độ lớn — lớn hơn nhiều lần khoảng cách giữa HDD và SSD**. HDD ghi tuần tự (200 MB/s) đã ngang ngửa SSD SATA phổ thông ghi ngẫu nhiên, và vượt xa HDD ghi ngẫu nhiên gấp 300 lần.

Hệ quả kinh tế rất cụ thể: ta cần 1,2 PB. Ép được pattern về tuần tự thì dùng được HDD — **rẻ hơn SSD 5–10 lần trên mỗi TB** — mà vẫn đạt throughput. Ở quy mô PB, đó là hàng triệu đô.

> 💡 **Câu để nói trong phỏng vấn**: *"Tôi không tối ưu cho đĩa nhanh, tôi tối ưu cho **pattern truy cập**. Chọn đúng pattern cho 2–3 bậc độ lớn; chọn đúng phần cứng chỉ cho 1 bậc — và tốn 10 lần tiền."*

Một sắc thái để không bị bắt bẻ: trên SSD, ghi tuần tự vẫn tốt hơn, không vì seek mà vì **write amplification** — SSD xoá theo block vài MB nhưng ghi theo page 4–16 KB, nên ghi ngẫu nhiên làm garbage collection phải đọc–xoá–ghi lại nhiều dữ liệu hợp lệ, giảm throughput và ăn mòn tuổi thọ ổ.

### 5.2 Page cache và zero-copy — chìa khoá throughput

**Page cache.** Broker ghi vào file là ghi vào **page cache** của kernel, OS flush xuống đĩa theo lịch của nó. Consumer đọc dữ liệu vừa ghi vài giây trước thì **đọc trúng page cache, không chạm đĩa** — đúng tình huống của consumer real-time.

Quyết định đi kèm rất phản trực giác: **broker cố ý KHÔNG tự cache message trong heap của mình**, vì (a) duplicate với page cache, lãng phí một nửa RAM; (b) heap lớn trên JVM = GC pause dài, mà GC pause làm trễ heartbeat → bầu lại leader không cần thiết; (c) page cache **sống sót qua restart tiến trình**, cache tự quản thì mất sạch và broker vừa khởi động sẽ nện đĩa; (d) thuật toán thay trang của OS đã được tinh chỉnh 40 năm. Cấu hình điển hình: **heap nhỏ 6–12 GB, toàn bộ RAM còn lại cho page cache**.

**Zero-copy.** Đường đi truyền thống của một byte từ file ra socket:

```
CÁCH THƯỜNG (4 copy, 4 lần chuyển kernel↔user):
  đĩa ─DMA─► page cache ─copy─► buffer ứng dụng ─copy─► socket buffer ─DMA─► NIC
               (kernel)          (user space)            (kernel)
  Dữ liệu vào user space rồi quay ra, dù ứng dụng KHÔNG đọc hay sửa nó.

ZERO-COPY (sendfile / FileChannel.transferTo):
  đĩa ─DMA─► page cache ──────────────────────────────► NIC
                    (chỉ truyền mô tả buffer, DMA gather)
```

Giảm ~2 lần copy bộ nhớ và ~2 lần context switch mỗi lần truyền — thường cải thiện throughput gửi 2–3 lần khi ràng buộc CPU. Ở 750 MB/s ra, đó là chênh lệch giữa CPU nhàn và CPU cháy.

Nhưng zero-copy có **một điều kiện tiên quyết ít người nói ra**: nó chỉ hoạt động khi broker **không cần hiểu và không cần biến đổi** nội dung message — byte trên đĩa phải giống hệt byte ra socket. Điều đó buộc ta tới một loạt quyết định:

- **Format message thống nhất** giữa producer, broker, consumer. Broker không parse, không đổi schema.
- **Nén do producer làm, consumer giải nén**; broker lưu nguyên khối đã nén.
- **Không mã hoá lại ở broker.** Bật TLS trên kết nối consumer buộc broker mã hoá → dữ liệu phải vào user space → **mất zero-copy**, throughput giảm đáng kể. Cách giảm đau: mã hoá payload ở tầng ứng dụng, để đường broker↔consumer plaintext trong VPC tin cậy.
- **Không lọc message theo payload ở broker** (§12.6 dùng tag trong header thay thế).

> ⚠️ **Bẫy**: thêm một tính năng nghe rất hợp lý — "broker lọc giúp consumer cho đỡ tốn băng thông" — và bạn vừa phá vỡ zero-copy cho **mọi** message, kể cả message không bị lọc. Một tính năng nhỏ đánh đổi một thuộc tính kiến trúc lớn.

### 5.3 Segment file và index

Một partition không thể là một file duy nhất: file 12 TB không cắt bỏ phần đầu được một cách rẻ tiền — mà retention chính là thao tác cắt bỏ phần đầu. Nên partition được cắt thành **segment** (thường 1 GB, hoặc theo thời gian):

```
/data/orders-7/                        ← topic "orders", partition 7
  00000000000000000000.log             ← segment, tên = offset ĐẦU TIÊN trong đó
  00000000000000000000.index           ← offset → vị trí byte   (sparse)
  00000000000000000000.timeindex       ← timestamp → offset     (sparse)
  00000000000001048576.log
  ...
  00000000000002097152.log             ← ACTIVE segment: chỉ file này được ghi vào
```

**Tên file chính là offset đầu tiên** → tìm message ở offset 1.500.000 chỉ cần **binary search trên danh sách tên file**, không cần index toàn cục nào. Một mẹo cực rẻ.

**Chỉ segment cuối được ghi**; mọi segment cũ là read-only. Điều này làm mọi thứ đơn giản đến kinh ngạc: không khoá, không đồng bộ phức tạp, và segment cũ có thể nén lại / đẩy lên S3 thoải mái.

**Index là *sparse*** — một mục mỗi ~4 KB dữ liệu, không phải mỗi message:

```
Index đầy đủ: 1M msg/s × 8 byte = 8 MB/s index → index to gần bằng dữ liệu
Index thưa  : một mục mỗi 4 KB  → ~0,2% kích thước log → nằm gọn trong RAM
```

Tra cứu offset trở thành: binary search tên file → binary search index thưa → **quét tuần tự vài KB** tới đúng message. Quét vài KB tuần tự là thứ đĩa làm giỏi nhất. Nguyên tắc rút ra: *đừng làm index chính xác nếu quét tuyến tính một đoạn ngắn đã đủ rẻ.* File `.timeindex` giải bài `seek(timestamp)` ở §3 — cho phép "chạy lại từ 3 giờ sáng" mà không quét cả 14 ngày.

### 5.4 Cấu trúc một message

Message **bất biến (immutable)**, layout cố định để tránh mọi copy/parse thừa:

| Trường | Vai trò | Ghi chú |
|---|---|---|
| `crc` | Checksum toàn message | Kiểm ở consumer, **không** kiểm ở broker (để giữ zero-copy) |
| `magic` / version | Phiên bản format | Cho phép tiến hoá format không phá client cũ |
| `attributes` | Cờ: codec nén, kiểu timestamp | 1 byte |
| `timestamp` | Lúc tạo, hoặc lúc broker nhận | Phân biệt hai loại này rất quan trọng khi debug lag |
| `key` (+len) | Quyết định partition | **Không cần unique**, được phép null |
| `value` (+len) | Payload | Text, Avro/Protobuf, hoặc khối đã nén |
| `headers` | Cặp key-value tuỳ ý | Nơi đặt `trace_id`, `tenant`, `event_type`, tag để lọc |
| `offset` | Vị trí trong partition | Do **broker** gán khi ghi, không do producer |

**`key` không phải khoá chính** — hiểu nhầm phổ biến nhất. Nó chỉ làm một việc: `hash(key) % num_partitions`. Trùng key là bình thường, null key cũng hợp lệ (rải round-robin, **không có đảm bảo thứ tự**). **Định vị một message = `(topic, partition, offset)`**; không có ID toàn cục, và đó là chủ ý — ID toàn cục đòi phối hợp giữa các partition, phá vỡ tính độc lập vốn là nguồn gốc của khả năng scale. **Bất biến sinh ra khả năng chia sẻ**: cùng một vùng page cache phục vụ đồng thời 3 consumer group không cần copy hay khoá — immutability là *điều kiện* để zero-copy đa consumer hoạt động.

### 5.5 Batching — thứ quyết định throughput nhiều nhất

Áp dụng ở cả ba nơi: producer gom trước khi gửi, broker ghi cả batch như một đơn vị, consumer fetch cả batch. Lý do: **chi phí cố định mỗi thao tác lớn hơn nhiều lần chi phí biến đổi theo byte**.

```
1000 message gửi lẻ : 1000 × (round-trip + syscall + header + xử lý request)
                       ≈ 1000 × 50–100 µs = 50–100 ms CPU thuần chi phí cố định
1 batch 1000 msg     : ~0,1 ms cố định + ~1 ms truyền 1 MB
```

Hai hiệu ứng phụ rất lớn: **nén hiệu quả hơn hẳn** (một message JSON 1 KB nén được 2:1; 1000 message tương tự nhau trong một khối nén được 5–10:1 vì thuật toán thấy pattern lặp giữa các message), và **ghi đĩa thành tuần tự thật sự** (một batch 1 MB là một thao tác ghi liên tục 1 MB). Cái giá là **latency**: message đầu batch phải chờ batch đầy hoặc hết `linger.ms`.

| batch size / linger | Throughput | Latency p50 | Dùng khi |
|---|---|---|---|
| 1 msg / 0 ms | Rất thấp | ~1–2 ms | Command cần phản hồi tức thì; hầu như luôn là lựa chọn sai |
| 16 KB / 5 ms | Trung bình | ~5–10 ms | Mặc định cân bằng cho giao dịch |
| 64 KB / 20 ms | Cao | ~20–30 ms | Event pipeline thông thường |
| 1 MB / 100 ms | Rất cao (GB/s) | ~100–150 ms | Log aggregation, clickstream, metrics |
| 1 MB / 100 ms + zstd | Cao nhất (băng thông hiệu dụng) | ~110–160 ms | Ingest khối lượng lớn, tiết kiệm mạng/đĩa |

Đây chính là cách yêu cầu "**high throughput OR low latency, cấu hình được**" được hiện thực hoá: **không phải bằng hai kiến trúc, mà bằng ba tham số trên cùng một kiến trúc** — `batch.size`, `linger.ms`, `compression.type`.

> 💡 `linger.ms` là **trần latency bạn tự nguyện trả để mua throughput**. Đặt nó bằng đúng ngân sách trễ mà nghiệp vụ chịu được rồi để batch lớn. Đặt `linger.ms = 0` mà than throughput thấp là hiểu sai công cụ.

> ⚠️ **Bẫy**: batch lớn làm **mất mát khi crash lớn hơn** (1 MB trong buffer RAM, process chết là mất sạch) và làm **một message lỗi kéo cả batch phải retry**. Dữ liệu mà mất là chết người thì batch nhỏ + `acks=all` + retry idempotent.

---

## 6. Deep dive 2 — Partition và bài toán thứ tự

### 6.1 Vì sao chỉ hứa thứ tự trong một partition

Muốn "thứ tự toàn cục" thì phải có một điểm đồng thuận duy nhất để gán số thứ tự — tức **một writer duy nhất**, tức **không song song hoá được**. Toàn hệ thống bị giới hạn bởi throughput của một máy. Với mục tiêu 1 GB/s, đó là dấu chấm hết.

Nên ta đổi: **chia topic thành N partition, mỗi partition là một log độc lập có thứ tự chặt; giữa các partition không có đảm bảo nào.**

```
topic "orders", 4 partition
P0: [o12][o27][o44][o51]     thứ tự trong P0: đảm bảo tuyệt đối
P1: [o13][o19][o88]          thứ tự trong P1: đảm bảo tuyệt đối
P2: [o01][o33]
P3: [o07][o60][o61][o72]
Giữa o27 (P0) và o19 (P1): KHÔNG có đảm bảo nào.
```

Lối thoát rất thực dụng: **hầu hết nghiệp vụ không cần thứ tự toàn cục, chỉ cần thứ tự theo một thực thể**. Bạn cần "mọi sự kiện của order #123 theo đúng thứ tự"; bạn không cần order #123 xếp trước order #456. Đặt `partition_key = order_id` là bài toán tan biến.

### 6.2 Chọn partition key

`partition = hash(key) % num_partitions`. Đây là quyết định có hậu quả lâu dài nhất trong cả hệ thống, vì đổi về sau rất đau.

| Cân nhắc | Nội dung |
|---|---|
| **Phạm vi thứ tự** | Key xác định *cái gì được đảm bảo thứ tự*. Chọn đơn vị nhỏ nhất mà nghiệp vụ cần |
| **Phân bố đều** | Key lệch tạo **hot partition**. `country_code` nghe hợp lý tới khi 60% traffic là một nước. Thêm broker **không cứu được** — một partition chỉ có một leader |
| **Lực lượng** | Số giá trị key phân biệt phải lớn hơn nhiều lần số partition |
| **Quan hệ với consumer** | Partition theo `user_id` cho phép consumer giữ state cục bộ trong bộ nhớ — tối ưu cực lớn cho stream processing |

Xử lý **hot key**, ba cách và không cách nào miễn phí: (1) **salt key** `tenant:hash(event_id)%10` — rải ra 10 partition, được throughput nhưng **mất thứ tự trong tenant đó**; (2) **topic riêng** cho tenant lớn — cách ly tốt nhất, vận hành phức tạp hơn; (3) **chấp nhận, scale dọc** — đơn giản, có trần.

> ⚠️ **Bẫy kinh điển**: `null` key → rải round-robin → **không có đảm bảo thứ tự nào**. Nhiều sự cố "sao event thanh toán đến trước event tạo đơn" bắt nguồn từ việc ai đó quên set key. Nếu nghiệp vụ cần thứ tự, key phải bắt buộc và được kiểm ở tầng schema.

### 6.3 Số partition — tăng dễ, giảm khó

Thêm partition là thao tác trực tuyến nhưng có hai hậu quả. (1) **Phá vỡ ánh xạ key→partition**: `hash(key)%4` khác `hash(key)%8`; message của `user_42` nay vào P5 trong khi lịch sử của nó nằm ở P1 → **thứ tự bị phá ở ranh giới thời điểm thay đổi**. Không copy dữ liệu cũ (quá đắt). Đây là lý do nên chọn số partition rộng rãi từ đầu. (2) **Kích hoạt rebalance** toàn group (§7.2).

Giảm partition còn tệ hơn: ngừng ghi vào partition bị loại → consumer **vẫn phải đọc nó** → hết retention (14 ngày!) mới truncate và rebalance lần cuối. Một thao tác kéo dài hai tuần.

**Bao nhiêu là đủ?** Quá ít → trần throughput và trần song song consumer thấp. Quá nhiều → hàng chục nghìn file descriptor; producer cần buffer riêng cho **mỗi** partition; bầu lại leader khi broker chết phải xử lý nhiều partition hơn → **downtime dài hơn**; batch bị chia nhỏ nên nén kém hơn. Quy tắc: `max(throughput_mục_tiêu / throughput_một_partition, số_consumer_song_song_tối_đa) × 2`. Với bài này: `max(25, 200) × 2 = 400`.

---

## 7. Deep dive 3 — Consumer group, rebalancing và offset

### 7.1 Cơ chế

```
topic "orders" 4 partition; group "billing" có 3 consumer
  P0 ──► C1 ┐
  P1 ──► C2 ├─ group "billing": offset {P0:1200, P1:990, P2:1500, P3:870}
  P2 ──► C3 │
  P3 ──► C1 ┘  (C1 gánh 2 vì 4 không chia hết cho 3)

Cùng lúc, group "analytics" 1 consumer đọc cả 4 partition,
offset riêng hoàn toàn {P0:40, P1:12, P2:98, P3:3} — đang lag rất xa, không sao cả
```

Ba quy tắc bất di bất dịch:
- **Một partition chỉ được gán cho đúng một consumer trong một group** — cách duy nhất giữ thứ tự khi có nhiều consumer.
- Suy ra: **số consumer hữu ích trong một group ≤ số partition.** Consumer thứ 5 trong group với topic 4 partition sẽ **ngồi không**. Partition là trần scale của consumer.
- **Các group độc lập hoàn toàn**: thêm group mới chỉ tốn thêm băng thông đọc.

**Group coordinator** là một broker được chọn bằng `hash(group_id)`, nên mọi consumer của group chắc chắn nói chuyện với cùng một broker — không cần dịch vụ phân tán nào để đồng bộ. Phân biệt: group coordinator là **một broker thường**, khác với **coordination service (ZooKeeper)** lo việc toàn cluster.

### 7.2 Rebalancing — và cái giá stop-the-world

Kích hoạt khi consumer join, leave, chết (hết heartbeat), hoặc số partition thay đổi.

```
1. Coordinator phát hiện thay đổi → đánh dấu group cần rebalance
2. Báo cho consumer qua RESPONSE của heartbeat (passive, không push chủ động)
3. MỌI consumer ngừng đọc, TỪ BỎ toàn bộ partition đang giữ   ◄── stop-the-world BẮT ĐẦU
4. Mọi consumer gửi JoinGroup
5. Coordinator chọn một consumer làm group leader
6. Group leader tính kế hoạch phân bổ (round-robin / range / sticky)
7. Leader gửi kế hoạch → coordinator phát cho cả group qua SyncGroup
8. Consumer đọc tiếp từ offset đã commit của partition mới       ◄── KẾT THÚC
```

**Bước 3 là chỗ đau**: từ bước 3 tới 8, **không consumer nào trong group xử lý bất kỳ message nào**. Group nhỏ mất vài trăm ms; group 200 consumer và vài trăm partition có thể mất **hàng chục giây**, trong khi backlog dồn lại.

Tệ hơn là **rebalance dây chuyền**: `session.timeout.ms` quá ngắn hoặc consumer xử lý một batch lâu hơn `max.poll.interval.ms` → coordinator tưởng nó chết → rebalance → các consumer khác gánh thêm partition → chậm hơn → lại trễ heartbeat → rebalance tiếp. Group rebalance liên tục và **throughput về gần 0 dù mọi tiến trình đều sống**. Đây là sự cố vận hành phổ biến nhất của Kafka trong thực tế.

| Giảm nhẹ | Cơ chế | Đổi lại |
|---|---|---|
| **Sticky assignment** | Cố giữ nguyên partition cũ cho consumer cũ, di chuyển tối thiểu | Không có; nên bật mặc định |
| **Incremental cooperative rebalance** | Không từ bỏ hết; chỉ partition **cần đổi chủ** mới dừng | Giao thức phức tạp hơn, cần client mới |
| **Static membership** (`group.instance.id`) | ID cố định; restart trong `session.timeout` **không** gây rebalance | Consumer chết thật cũng không bị phát hiện ngay |
| **Tách heartbeat khỏi xử lý** | Heartbeat ở thread riêng; `max.poll.records` nhỏ | Chỉnh sai thì gây rebalance dây chuyền |

> 💡 Đặt `max.poll.interval.ms` lớn hơn **thời gian xử lý xấu nhất** của một batch (không phải trung bình), và giữ `max.poll.records` đủ nhỏ để một vòng poll luôn xong trong ngân sách đó. Phần lớn sự cố rebalance là do chỉnh theo thời gian trung bình.

### 7.3 Offset commit — nơi sinh ra delivery semantics

| Nơi lưu offset | Ưu | Nhược |
|---|---|---|
| **ZooKeeper / KV ngoài** | Đơn giản, nhất quán mạnh | ZooKeeper **không** chịu được ghi tần suất cao; commit mỗi vài trăm ms × hàng nghìn consumer sẽ giết nó — lý do Kafka đời đầu bỏ cách này |
| **Topic nội bộ compacted** (`__consumer_offsets`) | Tận dụng chính hạ tầng log: ghi tuần tự, replicate sẵn, compaction chỉ giữ giá trị mới nhất mỗi khoá | Thêm một vòng phụ thuộc vào chính mình; khởi động cluster phức tạp hơn |

Ta chọn phương án thứ hai: nó dùng lại đúng thứ đã được tối ưu cực mạnh, và **log compaction** (§10.2) biến một topic append-only thành một bảng KV tự nhiên với khoá `(group, topic, partition)`.

| | Auto commit | Manual commit |
|---|---|---|
| Cơ chế | Client tự commit sau mỗi `auto.commit.interval.ms` (mặc định 5 s) | Code gọi `commit()` khi nó muốn |
| Ngữ nghĩa thật | Offset có thể commit **trước khi** message xử lý xong → **at-most-once trá hình** | Kiểm soát hoàn toàn |
| Rủi ro | Crash sau auto-commit nhưng trước khi xử lý → **mất message trong im lặng** | Quên commit → xử lý lại sau restart |
| Dùng khi | Metric, log, dữ liệu mất được | Mọi thứ quan trọng |

> ⚠️ **Bẫy phổ biến nhất trong cả bài**: để `enable.auto.commit=true` (mặc định của nhiều client) rồi tin rằng mình có at-least-once. **Bạn không có.** Auto commit chạy theo đồng hồ, không theo tiến độ xử lý. Muốn at-least-once thật thì phải tắt nó và commit sau khi xử lý xong.

---

## 8. Deep dive 4 — Replication, ISR và `acks`

Mỗi partition có RF bản sao trên các broker khác nhau; một là **leader**, còn lại **follower**. Producer luôn ghi vào leader; follower **pull** từ leader bằng **đúng cùng cơ chế fetch mà consumer dùng** — replication không cần đường dẫn riêng, nó chỉ là một consumer đặc biệt. Replica plan phải thoả: không hai replica cùng partition trên cùng broker, và lý tưởng là rải qua nhiều **rack/AZ**. Rải qua AZ tốn phí băng thông và +1–2 ms cho đường `acks=all`; rải qua **region** thì thêm hàng chục–trăm ms và gần như luôn sai — đa region phải làm bằng **mirroring bất đồng bộ**, không phải kéo giãn một cluster.

### 8.1 In-sync replicas (ISR)

**ISR** là tập replica đang theo kịp leader (tụt không quá `replica.lag.time.max.ms`). Leader tự theo dõi và cập nhật tập này.

```
Partition P0, RF=3, ISR = {leader, R2, R3}; R4 đã bị loại
leader : [..10][11][12][13][14][15]   log end offset = 15
R2/R3  : [..10][11][12][13]           caught up tới 13
R4     : [..10][11]                   tụt quá xa → BỊ LOẠI khỏi ISR

high-water mark = 13  ← offset cao nhất mà MỌI replica trong ISR đều có
Consumer CHỈ đọc được tới 13. Message 14–15 có trên leader nhưng "chưa committed".
```

**High-water mark** là khái niệm then chốt: consumer không bao giờ nhìn thấy message chưa được nhân bản đủ. Nhờ vậy, leader chết ngay bây giờ thì mọi thứ consumer **đã từng nhìn thấy** chắc chắn còn tồn tại ở nơi khác. Không có tình huống "tôi đã xử lý một message mà sau đó hệ thống bảo nó chưa từng tồn tại".

ISR là cơ chế **tự cân bằng giữa độ bền và tính sẵn sàng**: đòi *tất cả* replica sync mới commit thì một replica chậm treo cả partition; ISR cho phép loại nó ra và cho quay lại khi bắt kịp. `min.insync.replicas` đặt sàn — ISR co dưới sàn thì leader **từ chối ghi** thay vì âm thầm giảm độ bền. Cấu hình kinh điển: `RF=3, min.insync.replicas=2, acks=all`.

### 8.2 `acks` — một dòng cấu hình, ba thế giới

| `acks` | Trả lời khi nào | Mất dữ liệu khi | Latency | Dùng cho |
|---|---|---|---|---|
| `0` | Ngay khi producer đẩy ra socket | Gói rớt, broker chết, thậm chí broker không tồn tại — producer không biết | Thấp nhất | Metric, log debug |
| `1` | Khi **leader** ghi vào log của nó | Leader chết trước khi follower kịp pull → message đã committed với producer nhưng **biến mất** | Thấp | Pipeline analytics "đủ tốt" |
| `all` | Khi **mọi replica trong ISR** đã có (và ISR ≥ `min.insync.replicas`) | Chỉ khi mất đồng thời toàn bộ ISR | Cao nhất | Giao dịch, tài chính |

Hai sắc thái hay bị bỏ. **`acks=1` mất dữ liệu âm thầm** — không lỗi, không log, không metric; producer nhận `SUCCESS`. Đó là loại mất mát tệ nhất vì chỉ phát hiện khi đối soát sổ sách. Và **`acks=all` không có nghĩa "đã nằm trên đĩa"** — nó nghĩa là "đã nằm trong page cache của N máy"; mất điện cả rack cùng lúc vẫn mất dữ liệu chưa flush. Ép `fsync` mỗi message thì throughput sụp. Thiết kế đúng là **dựa vào replication chứ không dựa vào fsync**: xác suất N máy ở N AZ cùng mất điện trong một giây thấp hơn nhiều so với chi phí fsync. Nói được điều này cho thấy bạn hiểu độ bền là bài toán xác suất.

### 8.3 Unclean leader election

Leader chết, và **mọi replica trong ISR cũng chết**; chỉ còn một replica đã bị loại khỏi ISR từ lâu, thiếu 50.000 message cuối.

| | `unclean.leader.election=false` (nên dùng) | `=true` |
|---|---|---|
| Hành vi | Partition **offline** tới khi một replica trong ISR sống lại | Bầu replica tụt hậu làm leader ngay |
| Hậu quả | Mất **tính sẵn sàng** | Mất **dữ liệu** — 50.000 message biến mất vĩnh viễn |
| Tệ hơn | — | Offset bị **tua lùi**: consumer đã đọc tới 1.000.000 nay thấy log chỉ dài 950.000 → trạng thái downstream có thể vô nghĩa |

Đây là bản trình bày trần trụi nhất của CAP trong bài: khi phân mảnh xảy ra, chọn **C** (từ chối phục vụ, giữ đúng dữ liệu) hay **A** (tiếp tục phục vụ, chấp nhận mất). Mặc định đúng là `false` — mất availability tạm thời còn sửa được, mất dữ liệu thì không. Chỉ bật `true` cho telemetry thuần tuý tạm thời.

---

## 9. Deep dive 5 — Delivery semantics

Ba mức đảm bảo không phải ba tính năng; chúng là **hệ quả của thứ tự các thao tác**.

**At-most-once** — có thể mất, không bao giờ lặp:
```
Producer: gửi async, KHÔNG retry (acks=0/1, retries=0)
Consumer: poll → COMMIT offset → xử lý
                     ▲ crash ở đây: offset đã tiến, message không bao giờ được xử lý
```
Dùng cho metric, log, telemetry IoT dày đặc — nơi mất 0,01% không đổi kết luận mà xử lý trùng thì sai.

**At-least-once** — không bao giờ mất, có thể lặp:
```
Producer: acks=all, retries=∞   ← retry khi ack rớt = nguồn bản sao phía producer
Consumer: poll → XỬ LÝ → commit offset
                            ▲ crash ở đây: đã xử lý nhưng offset chưa tiến → xử lý lại
```
Đây là **mặc định thực tế** của gần như mọi hệ thống production, gồm cả SQS và Kinesis. Bản sao đến từ hai nguồn độc lập: producer retry khi ack mất trên đường về, và consumer crash giữa xử-lý và commit.

Nguyên tắc quan trọng nhất của cả mục: **làm consumer idempotent, rồi at-least-once là đủ cho 95% hệ thống.** Ba cách: (1) **ghi có điều kiện theo khoá tự nhiên** — `INSERT ... ON CONFLICT DO NOTHING` với `event_id`, hoặc DynamoDB `attribute_not_exists(event_id)`; (2) **thao tác vốn dĩ idempotent** — `SET status='paid'` thay vì `balance = balance + 10` (gán tuyệt đối an toàn, cộng dồn thì không); (3) **bảng khử trùng có TTL**, với cửa sổ dài hơn khoảng retry xấu nhất.

**Exactly-once** — thường bị hiểu là "message chỉ tồn tại một lần trên đường truyền". Điều đó **bất khả thi** trong hệ phân tán (bài toán Two Generals). Cái thực sự đạt được là **exactly-once *processing***: hiệu ứng của việc xử lý xảy ra đúng một lần, dù message được truyền lại bao nhiêu lần. Hai mảnh ghép:

*(a) Idempotent producer.* Producer có `producer_id`, mỗi message mang **sequence number** tăng dần theo từng partition. Broker nhớ sequence cuối của mỗi `(producer_id, partition)`.
```
gửi seq=7 ──► broker ghi seq=7, trả ACK ──X ACK rớt trên đường về
gửi lại seq=7 ──► broker: "đã có seq=7" → bỏ qua, vẫn trả ACK → KHÔNG có bản sao trong log
```
Chi phí gần bằng 0, và nó xoá bỏ **nguồn trùng lặp phía producer**. Nên bật mặc định trong mọi hệ thống nghiêm túc.

*(b) Transaction.* Giải nguồn trùng phía consumer cho pattern **consume → process → produce**. Ghi topic B và commit offset topic A là hai thao tác ở hai nơi; crash ở giữa thì ghi B lặp lại. Giải pháp: gói cả hai vào một transaction do broker điều phối:
```
beginTransaction()
   produce(topicB, kết quả)
   sendOffsetsToTransaction(offset của topicA)   ← offset commit NẰM TRONG transaction
commitTransaction()
```
Consumer downstream đặt `isolation.level=read_committed` sẽ không thấy message của transaction chưa commit.

| | Idempotent producer | Transaction |
|---|---|---|
| Giải quyết | Trùng do producer retry | Nguyên tử giữa "ghi kết quả" và "tiến offset" |
| Chi phí | Không đáng kể | Throughput −10..30%, latency tăng, consumer phải chờ commit marker |
| Phạm vi | Trong một partition | Trong **một cluster** |

**Giới hạn quan trọng nhất**: exactly-once chỉ đúng **bên trong biên giới hệ thống queue**. Consumer ghi vào Postgres hay gọi Stripe thì transaction của queue **không bao trùm** — không có commit hai pha với thế giới bên ngoài; vẫn phải **idempotent ở downstream**.

> 💡 **Kết luận thực chiến**: bật idempotent producer (gần như miễn phí), dùng at-least-once, làm consumer idempotent. Chỉ dùng transaction khi thật sự làm stream processing queue→queue.

---

## 10. Retention, compaction và tiered storage

**Retention là thao tác xoá nguyên file segment**, không bao giờ xoá từng message — đó là lý do segment tồn tại.

| Chính sách | Cơ chế | Lưu ý |
|---|---|---|
| **Theo thời gian** (`retention.ms`) | Segment có timestamp lớn nhất cũ hơn ngưỡng → xoá cả file | Dễ suy luận nghiệp vụ ("replay được 2 tuần") nhưng **không chặn được chi phí** khi traffic tăng đột biến |
| **Theo dung lượng** (`retention.bytes`) | Vượt ngưỡng → xoá segment cũ nhất | Chặn chi phí, nhưng burst làm cửa sổ thời gian co lại âm thầm — đúng lúc cần replay nhất thì lịch sử đã bị cắt |

Đặt **cả hai**: thời gian là hợp đồng nghiệp vụ, dung lượng là van an toàn — và **alert khi van dung lượng kích hoạt**. Hệ quả vận hành: **retention là đồng hồ đếm ngược cho consumer bị lag**. Lag 15 ngày với retention 14 ngày → `OffsetOutOfRange`, chỉ còn hai lựa chọn tệ: nhảy tới đầu log (mất dữ liệu) hoặc về cuối (xử lý lại từ đầu). Đây là lý do §12.5 coi lag là metric số một.

**Log compaction** — với topic kiểu "trạng thái mới nhất của mỗi thực thể" (hồ sơ user, offset của group, cấu hình), xoá theo thời gian là sai; ta muốn giữ **giá trị mới nhất của mỗi key mãi mãi**.

```
Trước:  k=u1 v=A | k=u2 v=B | k=u1 v=A2 | k=u3 v=C | k=u1 v=A3 | k=u2 v=null ← tombstone
Sau  :  k=u1 v=A3 | k=u3 v=C          (u2 biến mất sau delete.retention.ms)
```

Ba điều cần nhớ: compaction **không đảm bảo xoá ngay** (chạy nền, phần đầu log chưa compact vẫn có bản cũ — đảm bảo *eventual*); **tombstone** (key có, value null) là cách duy nhất xoá thật một key, quan trọng cho GDPR; **offset không bị đánh số lại**, log trở nên thưa và consumer phải chấp nhận lỗ hổng offset. Đây chính là cơ chế cho phép `__consumer_offsets` vừa là log ghi tuần tự vừa hành xử như bảng KV, và là nền tảng của **event sourcing** / changelog topic — consumer mới dựng lại toàn bộ state bằng cách đọc từ đầu topic compacted.

**Tiered storage**: 1,2 PB trên đĩa cục bộ là đắt và cứng nhắc, nên segment cũ (read-only!) được đẩy lên object storage còn broker chỉ giữ phần nóng — ví dụ 6 giờ gần nhất ở local cho đường real-time zero-copy, 14 ngày còn lại ở S3 cho replay (rẻ hơn ~10×, latency cao hơn). Đây là chỗ tính chất "segment cũ bất biến" (§5.3) trả cổ tức.

---

## 11. Push vs pull — và vì sao pull thắng

| | **Push** (broker đẩy) | **Pull** (consumer hỏi) |
|---|---|---|
| Latency khi có dữ liệu | Thấp nhất | Cao hơn (giảm bằng long polling) |
| Consumer chậm hơn producer | Broker **làm ngộp** consumer; cần backpressure phức tạp | Consumer tự điều tiết, đơn giản tụt lại |
| Consumer có sức xử lý khác nhau | Broker phải biết năng lực từng consumer — bất khả thi | Mỗi consumer lấy theo sức mình |
| Batching | Broker phải đoán consumer nuốt được bao nhiêu | Consumer tự nói "cho tôi tối đa 5 MB" — **batch tối ưu tự nhiên** |
| Khi không có dữ liệu | Không tốn gì | Tốn request rỗng (giảm bằng long polling) |
| Replay / tua lại | Rất khó — broker phải nhớ đã đẩy tới đâu cho ai | Tầm thường — đổi offset |
| State ở broker | Theo dõi từng consumer | Gần như không có |

Ta chọn **pull** vì ba lý do theo thứ tự quan trọng: (1) **backpressure miễn phí** — consumer chậm chỉ đơn giản hỏi ít hơn; trong mô hình push, bảo vệ consumer khỏi ngộp là cả một hệ thống con phức tạp và luôn là nguồn bug; (2) **consumer quyết định kích thước batch** nên luôn lấy được batch lớn nhất mà nó xử lý nổi — điều kiện tiên quyết cho throughput (§5.5); (3) **replay trở nên tầm thường**, mà replay là yêu cầu chức năng số một của bài này.

Nhược điểm duy nhất — request rỗng — được xử lý bằng **long polling**: fetch với `max.wait.ms=500` và `min.bytes=1 MB`, broker **giữ request lại** cho tới khi đủ byte hoặc hết thời gian chờ. Bận thì batch lớn, rảnh thì latency vẫn thấp và không có vòng lặp poll đốt CPU. "Pull chậm hơn push" là lời chê đã lỗi thời.

> 💡 Chú ý **replication cũng dùng pull**: follower fetch từ leader bằng đúng API của consumer. Một cơ chế, hai mục đích — dấu hiệu của một thiết kế đã hội tụ.

---

## 12. Bottleneck & failure mode

### 12.1 Cái gì nghẽn trước

1. **Một partition nóng** — bottleneck số một và là bottleneck **không giải quyết được bằng cách thêm máy**: một partition có đúng một leader trên đúng một broker. Chỉ có thể đổi partition key hoặc tăng số partition (và chịu hậu quả §6.3). Vì vậy quyết định về key ở §6.2 quan trọng hơn mọi quyết định hạ tầng.
2. **Consumer lag** — thường là bottleneck của *ứng dụng* chứ không của queue.
3. **Page cache bị đuổi.** Một job replay đọc dữ liệu cũ sẽ **đuổi dữ liệu nóng ra khỏi page cache**, làm mọi consumer real-time đột nhiên phải đọc đĩa. Một job replay có thể làm chậm cả cluster — hiện tượng phản trực giác và rất khó chẩn đoán. Cách ly bằng cách cho job replay đọc từ follower hoặc tiered storage.
4. **Số partition quá lớn** làm chậm mọi lần bầu lại leader và phình metadata.
5. **Rebalance dây chuyền** (§7.2) — throughput về 0 dù mọi thứ đều "sống".

### 12.2 Broker chết

```
t0  Broker 3 mất heartbeat với coordination service
t1  Tuyên bố chết sau session timeout (6–18 s)
t2  Với MỌI partition mà broker 3 là leader: chọn một replica trong ISR làm leader mới
t3  Cập nhật metadata; producer/consumer refresh và chuyển sang leader mới
t4  Broker 3 sống lại → làm follower, pull để bắt kịp, vào lại ISR
```

Cửa sổ không phục vụ của một partition ≈ session timeout + bầu cử + client refresh metadata, thường **vài giây tới chục giây**. Producer nhận `NotLeaderForPartition` và **phải retry** — đây là lý do `retries` phải lớn và `delivery.timeout.ms` phải đủ rộng, nếu không một sự cố 10 giây thành mất dữ liệu ở tầng ứng dụng.

Thêm ba điểm: **rải replica qua AZ** để mất một AZ không mất partition; **mất toàn bộ replica = mất vĩnh viễn**, chống bằng đa AZ + mirroring sang region khác + archive; **thêm broker mới không tự cân bằng lại**, phải chạy reassignment và phải **throttle** nó, nếu không việc di chuyển dữ liệu bóp nghẹt traffic thật.

### 12.3 Consumer chết

Nhẹ hơn nhiều vì consumer gần như không có trạng thái: hết heartbeat → rebalance → partition được giao cho consumer khác → đọc tiếp **từ offset đã commit**. Hệ quả trực tiếp: **message đã xử lý nhưng chưa commit sẽ được xử lý lại** — chính là at-least-once, và chính là lý do consumer phải idempotent.

### 12.4 Poison message và DLQ

Một message không bao giờ xử lý được (JSON hỏng, schema sai phiên bản, tham chiếu tới bản ghi đã xoá):

```
poll → xử lý → exception → không commit → restart → poll ĐÚNG message đó → exception → ...
```

Consumer kẹt vĩnh viễn ở một offset, partition đứng im, lag tăng tuyến tính. Và vì **head-of-line blocking**, mọi message phía sau đều bị chặn dù hoàn toàn bình thường. Trong queue truyền thống, một message hỏng chỉ ảnh hưởng chính nó; trong một log có thứ tự, nó chặn cả dòng. **Đây là cái giá của việc đảm bảo thứ tự** và cần được nói ra.

Chiến lược, theo thứ tự áp dụng:

1. **Retry tại chỗ có giới hạn**, exponential backoff — chữa lỗi tạm thời (DB timeout, downstream 503). Có trần, không bao giờ retry vô hạn tại chỗ.
2. **Retry topic theo bậc**: sau N lần thất bại, đẩy sang `orders.retry.5s` → `orders.retry.1m` → `orders.retry.10m`, mỗi topic có consumer riêng chờ đúng khoảng đó. Lợi ích lớn: **partition chính được thông ngay lập tức**.
3. **Dead letter queue**: hết mọi bậc thì đẩy sang `orders.dlq` kèm **ngữ cảnh chẩn đoán** (offset gốc, partition, stack trace, số lần thử), rồi **commit offset** để dòng chảy tiếp.
4. **Alert trên DLQ.** DLQ không ai nhìn là DLQ vô dụng — nó chỉ là nơi lịch sự để đánh mất dữ liệu. Alert trên *tốc độ vào DLQ*, không chỉ số lượng tích luỹ.
5. **Công cụ replay từ DLQ** phải có sẵn, đừng viết vội lúc đang có sự cố.

> ⚠️ **Bẫy**: dùng retry topic cho message **cần thứ tự**. Đưa lại một message sau 10 phút nghĩa là nó bị xử lý **sau** các message đến sau nó — với chuỗi trạng thái đơn hàng thì kết quả có thể sai nghiêm trọng. Luồng cần thứ tự chặt thì lựa chọn đúng là **dừng partition và báo động**, không phải lặng lẽ đẩy qua một bên.

### 12.5 Lag là metric số một

`lag = log_end_offset − committed_offset` của mỗi (group, partition). Nó là **tín hiệu duy nhất tổng hợp được sức khoẻ end-to-end trong một con số**: consumer chết → lag tăng; consumer chậm → lag tăng; producer bùng nổ → lag tăng; rebalance dây chuyền → lag tăng; poison message → lag của **một** partition tăng trong khi các partition khác bình thường (dấu hiệu nhận biết rất đặc trưng).

Dùng đúng cách: alert trên **đạo hàm** (lag tăng liên tục 10 phút), không chỉ ngưỡng tuyệt đối — lag 1 triệu đang giảm đều thì bình thường, lag 50.000 đang tăng đều thì sắp có sự cố. Theo dõi **theo từng partition**, vì tổng của group che giấu đúng dấu hiệu poison message và hot partition. Và quy đổi lag sang **thời gian** (`lag ÷ tốc độ tiêu thụ`) để so với retention — "đang tụt 6 giờ, retention 14 ngày" là câu nói được cho người không rành kỹ thuật.

Metric bổ trợ: ISR shrink/expand, `UnderReplicatedPartitions` (phải luôn 0), `OfflinePartitionsCount` (khác 0 là sự cố nghiêm trọng), thời gian mỗi vòng poll, tốc độ vào DLQ.

---

## Liên hệ sang AWS

| Thành phần thiết kế | Dịch vụ AWS | Vì sao hợp |
|---|---|---|
| Queue truyền thống (point-to-point, xoá sau ack) | **SQS Standard** | Đúng mô hình queue: `ReceiveMessage` → xử lý → `DeleteMessage`. Không quản lý gì, scale gần như vô hạn. At-least-once, **không đảm bảo thứ tự** |
| Queue cần thứ tự + khử trùng | **SQS FIFO** | Thứ tự trong **message group id** (≈ partition key), khử trùng bằng **dedupe id** trong cửa sổ 5 phút |
| Event streaming, log giữ lại, replay | **Kinesis Data Streams** | Chính là mô hình log/offset: **shard** ≈ partition, **sequence number** ≈ offset, **iterator** ≈ con trỏ đọc. Retention 24 giờ, mở rộng tới 365 ngày |
| Kafka nguyên bản, cần tương thích API | **MSK** / **MSK Serverless** | Kafka được vận hành hộ: giữ nguyên client, Connect, Streams. Serverless bỏ luôn việc chọn số broker; MSK có tiered storage |
| Fan-out một message tới N hệ thống | **SNS → nhiều SQS** | Bù việc SQS không có consumer group: mỗi subscriber một queue riêng, tiến độ độc lập, hỏng một bên không ảnh hưởng bên kia |
| Định tuyến theo nội dung, tích hợp SaaS | **EventBridge** | Rule khớp pattern JSON, schema registry, **archive + replay** có sẵn. Là "event bus", không phải "log throughput cao" |
| Coordination + state storage | **DynamoDB** (qua KCL) | Trong KCL, DynamoDB giữ **lease của shard và checkpoint** — đúng vai trò state storage: ghi nhỏ, thường xuyên, ngẫu nhiên, cần nhất quán |
| Tiered storage / archive lịch sử | **S3** (+ **Kinesis Data Firehose**) | Firehose đổ thẳng stream sang S3/Parquet; MSK tiered storage đẩy segment nguội sang lưu trữ rẻ |
| Consumer chạy serverless | **Lambda event source mapping** | Lambda tự poll SQS/Kinesis/MSK, tự batch, tự scale; với Kinesis/MSK giữ **một Lambda cho mỗi shard/partition** nên vẫn bảo toàn thứ tự |
| DLQ | **SQS làm DLQ** cho SQS/SNS/Lambda/EventBridge | Redrive policy với `maxReceiveCount`; console có sẵn **redrive** để bơm ngược sau khi sửa bug |
| Retry có bậc | **`ChangeMessageVisibility` tăng dần**, hoặc Step Functions | Chính là exponential backoff phía server |
| Quan sát lag | **CloudWatch**: `ApproximateAgeOfOldestMessage` (SQS), `GetRecords.IteratorAgeMilliseconds` (Kinesis), `SumOffsetLag` (MSK/Lambda) | Kinesis và SQS đã quy đổi lag sang **thời gian** — đúng thứ nên alert (§12.5) |

### SQS: ba khái niệm phải hiểu

**Visibility timeout** là cách SQS thay thế offset. Consumer nhận message → message bị **ẩn đi** N giây; xử lý xong gọi `DeleteMessage`; consumer chết thì hết N giây message **hiện lại** cho người khác. Đây chính là at-least-once, hiện thực bằng timeout thay vì con trỏ. Hệ quả: thời gian xử lý **dài hơn** visibility timeout thì message hiện lại trong khi consumer thứ nhất vẫn đang chạy → **hai consumer cùng xử lý một message**. Chữa bằng cách đặt timeout lớn hơn thời gian xử lý xấu nhất, hoặc gọi `ChangeMessageVisibility` để gia hạn (heartbeat).

**Message group id** (FIFO) tương đương partition key: message cùng group được giao tuần tự, một lúc một cái; song song đến từ việc có nhiều group — giống hệt partition. Và cũng giống hệt vậy: một group "nóng" là bottleneck không chia nhỏ được. Khác biệt lớn với Kafka: trong FIFO, một message kẹt sẽ **chặn cả group** cho tới khi nó được xoá hoặc vào DLQ.

**Deduplication id** (FIFO) là idempotent producer của AWS: trong cửa sổ **5 phút**, message cùng dedupe id bị bỏ qua. Giới hạn 5 phút là điểm cần nhớ — nó **không** thay thế idempotency phía ứng dụng cho retry xa hơn.

| | SQS Standard | SQS FIFO |
|---|---|---|
| Thứ tự | Best-effort, thực tế hay sai | Chặt chẽ trong message group |
| Trùng lặp | Có thể (at-least-once) | Khử trong cửa sổ 5 phút |
| Throughput | Gần như không giới hạn | ~3.000 msg/s với batching (high-throughput mode) |
| Song song | Không giới hạn | Bằng số message group đang hoạt động |

### Kinesis Data Streams

**Shard** là partition: 1 MB/s hoặc 1.000 record/s ghi, 2 MB/s đọc. Partition key băm vào shard đúng như `hash(key) % N`. **Sequence number** là offset. **Shard iterator** là con trỏ đọc: `TRIM_HORIZON` (từ đầu), `LATEST` (từ cuối), `AT_TIMESTAMP` — chính là `seek()` ở §3.

Hai điều đặc trưng: **2 MB/s đọc được chia sẻ giữa mọi consumer của shard** — ba consumer app trên cùng shard thì mỗi bên chỉ còn ~0,67 MB/s. **Enhanced fan-out** giải đúng vấn đề này: mỗi consumer đăng ký được **2 MB/s riêng** và broker **push** qua HTTP/2 (~70 ms thay vì ~200 ms của polling), đổi lại là phí theo consumer-shard-giờ. Một ngoại lệ thú vị: AWS cho bạn chọn lại mô hình **push** khi sẵn sàng trả tiền. Và **resharding** (split/merge) làm thay đổi ánh xạ key→shard — cùng hệ quả với đổi số partition ở §6.3; `on-demand mode` tự làm việc này, đổi lấy chi phí cao hơn.

### Chọn cái nào

| Tiêu chí | **SQS** | **Kinesis Data Streams** | **MSK (Kafka)** | **EventBridge** |
|---|---|---|---|---|
| Mô hình | Queue, xoá sau ack | Log có retention | Log có retention | Event bus định tuyến |
| Replay lịch sử | Không | Có (tới 365 ngày) | Có (retention/tiered) | Có (archive + replay) |
| Thứ tự | Chỉ FIFO, trong group | Trong shard | Trong partition | Không đảm bảo |
| Nhiều consumer độc lập | Cần SNS fan-out | Có | Có (consumer group) | Có (nhiều rule/target) |
| Throughput trần | Rất cao (Standard) | Theo số shard | Rất cao | Trung bình |
| Latency điển hình | ~10–100 ms | ~200 ms polling, ~70 ms EFO | ~5–50 ms | ~vài trăm ms |
| Gánh nặng vận hành | Gần như không | Thấp (quản shard) | Cao nhất (trừ Serverless) | Gần như không |
| Định tuyến theo nội dung | Không | Không | Không | **Mạnh nhất** |
| Hợp nhất với | Phân phối công việc, buffer bất đồng bộ, DLQ | Clickstream, telemetry, IoT, analytics | Cần API Kafka, Connect/Streams, throughput cực lớn, đa cloud | Event-driven giữa service, tích hợp SaaS |

**Quy tắc chọn nhanh**: (1) message là **việc cần làm**, làm một lần, không replay → **SQS** (FIFO nếu cần thứ tự); (2) message là **sự kiện đã xảy ra**, nhiều bên quan tâm, cần replay và thứ tự → **Kinesis** nếu muốn ít vận hành, **MSK** nếu cần API/hệ sinh thái Kafka hoặc throughput vượt tầm shard; (3) cần **định tuyến theo nội dung** tới nhiều dịch vụ, lưu lượng vừa phải → **EventBridge**; (4) cần **fan-out đơn giản** mà mỗi bên vẫn muốn ngữ nghĩa queue → **SNS → nhiều SQS**.

> 💡 Câu chốt đáng nói: *"MSK là khi tôi cần chính Kafka; Kinesis là khi tôi cần mô hình của Kafka mà không muốn vận hành Kafka; SQS là khi tôi không cần mô hình của Kafka chút nào."*

---

## Cách trình bày khi phỏng vấn / review

1. **Câu đầu tiên phải là phân loại bài toán**: *"Đây là message queue truyền thống hay event streaming platform? Message bị xoá sau khi consume hay được giữ lại — điều đó quyết định toàn bộ phần còn lại của thiết kế."* Không câu nào cho thấy nhiều hiểu biết bằng câu này.
2. **Ra số trước khi vẽ**: 1 GB/s vào → 750 MB/s ghi đĩa sau replication → 1,2 PB cho 14 ngày. Rồi kết luận: *"1,2 PB nghĩa là phải nằm trên đĩa rẻ; 750 MB/s nghĩa là pattern ghi phải tuần tự — hai con số này đã loại bỏ mọi phương án database."*
3. **Giải thích sequential I/O bằng cơ chế, không bằng khẩu hiệu**: seek 8 ms so với 200 MB/s truyền → khoảng cách tuần tự/ngẫu nhiên là 2–3 bậc độ lớn, lớn hơn khoảng cách HDD/SSD. Đây là chỗ phân biệt người đã hiểu với người đã thuộc.
4. **Nêu zero-copy kèm ràng buộc của nó.** Nhiều người nhắc `sendfile`; rất ít người nói tiếp *"và vì thế broker không được phép biến đổi message — nên nén phải do client làm, và bật TLS ở broker sẽ đánh mất zero-copy."*
5. **Phát biểu rõ phạm vi đảm bảo thứ tự**: *"Chỉ trong một partition; thứ tự toàn cục đòi một writer duy nhất nên không scale. Thực tế nghiệp vụ chỉ cần thứ tự theo thực thể nên tôi chọn key là `order_id`."* Kèm cảnh báo hot key và null key.
6. **Vẽ commit ↔ semantics như một chuỗi nhân quả**, không như ba định nghĩa rời: commit trước khi xử lý → at-most-once; commit sau → at-least-once; gói offset vào transaction → exactly-once trong biên giới cluster.
7. **Nói rõ giới hạn của exactly-once**: *"Chỉ đúng bên trong cluster. Consumer ghi ra Postgres hay gọi Stripe thì không có commit hai pha — vẫn phải idempotent ở downstream."* Câu này phân biệt kinh nghiệm thật với kiến thức sách.
8. **Trình bày `acks` như một thanh trượt**, kèm `min.insync.replicas`, và nhấn rằng `acks=1` mất dữ liệu **im lặng** — loại mất mát tệ nhất vì không có tín hiệu nào.
9. **Chủ động nêu rebalance là stop-the-world**: *"Rebalance dừng toàn bộ group; với 200 consumer có thể mất hàng chục giây, và chỉnh sai timeout sẽ gây rebalance dây chuyền làm throughput về 0."* Cho thấy bạn đã vận hành thật.
10. **Kết bằng vận hành, không bằng kiến trúc**: lag là metric số một (alert trên đạo hàm, theo từng partition); retention là đồng hồ đếm ngược cho consumer lag; poison message chặn cả partition nên phải có retry topic + DLQ + công cụ replay.
11. **Nếu bị hỏi "vì sao không dùng SQS?"** — đừng phòng thủ: *"Bỏ ba yêu cầu retention, replay và ordering thì SQS đúng hơn, vì rẻ hơn về vận hành hàng chục lần. Tôi chọn mô hình log vì ba yêu cầu đó, không phải vì nó hiện đại hơn."*

> 💡 **Nguyên tắc cuối**: cả bài chỉ là một ý tưởng được đẩy tới cùng — **biến mọi thao tác thành ghi thêm vào cuối một file và đọc tuần tự từ một vị trí**. Append-only log cho ghi nhanh; offset do consumer giữ cho phép nhiều người đọc độc lập và replay; partition cho song song; replication cho độ bền; batching cho throughput; page cache và zero-copy để không lãng phí một byte nào. Nếu chỉ nhớ một câu: **đây không phải bài toán hàng đợi, đây là bài toán lưu trữ đội lốt hàng đợi.**
