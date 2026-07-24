# Bài 18 — Ordering & total order broadcast

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân biệt **5 mức broadcast** theo thứ tự sức mạnh tăng dần: **best-effort → reliable → FIFO → causal → total order**, và nói rõ mỗi mức thêm bảo đảm gì.
- Định nghĩa **total order broadcast** (còn gọi là **atomic broadcast**) và giải thích **vì sao nó TƯƠNG ĐƯƠNG consensus** — hai bài toán quy về được lẫn nhau.
- Dùng total order broadcast làm nền cho **replicated state machine (RSM)**: mọi bản sao chạy cùng một chuỗi lệnh theo cùng thứ tự → hội tụ về cùng một trạng thái.
- Nhìn ra abstraction này trong đời thực: **một partition của Kafka = một total order log**, và **Raft log = total order broadcast được hiện thực bằng consensus**.

---

## 2. Lý thuyết

### 2.1 Broadcast là gì và tại sao "thứ tự" lại là vấn đề

**Broadcast** (multicast tới cả nhóm) nghĩa là: một process muốn **gửi một message tới tất cả** các process trong nhóm, kể cả chính nó. Nghe đơn giản, nhưng trong hệ phân tán có hai câu hỏi khó:

1. **Ai nhận được?** — Nếu người gửi chết giữa chừng, có node nhận có node không → nhóm **phân kỳ**.
2. **Nhận theo thứ tự nào?** — Hai người cùng broadcast, node X thấy `A` rồi `B`, node Y thấy `B` rồi `A`. Nếu message là **lệnh cập nhật state**, hai node kết thúc ở **trạng thái khác nhau**.

> **Analogy đời thường.** Hình dung một nhóm chat công việc. *Best-effort* = bạn hét trong phòng ồn, ai nghe được thì nghe. *Reliable* = bạn nhắn group, đảm bảo mọi thành viên đọc được (kể cả người đang offline, khi họ online sẽ thấy). *FIFO* = tin nhắn của **cùng một người** hiện đúng thứ tự họ gõ. *Causal* = "trả lời" luôn hiện **sau** tin gốc nó reply, kể cả của người khác. *Total order* = **mọi thành viên** nhìn thấy **toàn bộ** tin nhắn theo **cùng một trình tự tuyệt đối** — như thể ai cũng đọc chung một cuốn nhật ký đánh số 1, 2, 3...

Mấu chốt: thứ tự không phải chuyện thẩm mỹ. Với **replicated state machine**, cùng lệnh + khác thứ tự = khác kết quả. `SET x=1` rồi `SET x=2` cho `x=2`; đảo lại cho `x=1`. Muốn các bản sao **giống hệt nhau**, chúng phải apply **cùng chuỗi lệnh, cùng thứ tự**.

### 2.2 Thang 5 mức broadcast — mỗi bậc thêm một bảo đảm

Đây là "hệ phân cấp" kinh điển. Mỗi mức trên **bao hàm** mức dưới và cộng thêm một ràng buộc.

| Mức | Bảo đảm cộng thêm | Ví dụ vi phạm nếu thiếu |
|-----|-------------------|--------------------------|
| **1. Best-effort** | Nếu người gửi **không chết**, mọi node đúng đều nhận. Người gửi chết → không hứa gì. | Sender crash giữa chừng: node 1 nhận, node 2 không → phân kỳ. |
| **2. Reliable** | **Agreement**: nếu **một** node đúng nhận `m` thì **mọi** node đúng đều nhận `m` (kể cả khi sender chết sau khi gửi được 1 bản). | Không còn cảnh "có người nhận, có người trượt". Nhưng thứ tự vẫn tự do. |
| **3. FIFO** | Reliable **+**: message từ **cùng một sender** được nhận đúng thứ tự sender gửi. | Sender gửi `m1` rồi `m2`; cấm node nào nhận `m2` trước `m1`. Message của **sender khác** vẫn có thể xen kẽ tuỳ ý. |
| **4. Causal** | FIFO **+**: nếu `m1` → `m2` (m1 *happens-before* m2, kể cả khác sender), thì mọi node nhận `m1` trước `m2`. | Cấm cảnh "thấy câu trả lời trước câu hỏi". Nhưng hai message **đồng thời** (concurrent) vẫn có thể khác thứ tự ở các node. |
| **5. Total order** | Reliable **+**: **mọi** node đúng nhận **tất cả** message theo **cùng một thứ tự tổng** — kể cả những message đồng thời, không liên quan nhau. | Không còn bất kỳ khe hở nào: cả nhóm thống nhất một trình tự duy nhất. |

Vài điểm bản chất hay bị hiểu nhầm:

- **Reliable ≠ có thứ tự.** Reliable chỉ lo *ai nhận*, không lo *thứ tự nhận*. Bạn có thể có reliable broadcast mà mỗi node nhận một trật tự khác nhau.
- **FIFO và Causal chỉ ràng buộc các message *có quan hệ*.** Hai message không liên quan (concurrent) được tự do sắp xếp khác nhau ở mỗi node. Vì vậy FIFO/causal **rẻ** — làm được **không cần consensus**, chỉ cần đánh số sequence theo sender (FIFO) hoặc gắn vector clock (causal).
- **Total order là mức duy nhất bắt buộc một trình tự *toàn cục* cho *cả những message đồng thời*.** Chính đòi hỏi "phải chọn một trong nhiều thứ tự hợp lệ và mọi người theo nó" là chỗ **cần các node đồng thuận** — và đó là lý do total order broadcast đắt bằng consensus, còn 4 mức kia thì không.

> Lưu ý thuật ngữ: **Total order broadcast** không đòi hỏi thứ tự tổng phải *tôn trọng causal*. Nếu vừa total vừa causal thì gọi là **causal total order** (FIFO-total còn yếu hơn). Đa số hệ thực dụng (Kafka, Raft) chỉ cần total order theo nghĩa "cùng một log cho mọi bản sao".

<svg viewBox="0 0 700 250" role="img" aria-labelledby="ord-t ord-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="ord-t">Thang 5 mức broadcast xếp chồng theo sức mạnh</title>
<desc id="ord-d">Best-effort ở đáy, lên reliable, FIFO, causal, và total order ở đỉnh; total order cần consensus</desc>
<rect x="120" y="200" width="460" height="34" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="222" text-anchor="middle" font-size="13" fill="currentColor">1. Best-effort — sender sống thì mọi node nhận</text>
<rect x="150" y="160" width="400" height="34" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="182" text-anchor="middle" font-size="13" fill="currentColor">2. Reliable — 1 node nhận thì mọi node nhận</text>
<rect x="180" y="120" width="340" height="34" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="142" text-anchor="middle" font-size="13" fill="currentColor">3. FIFO — đúng thứ tự cùng một sender</text>
<rect x="210" y="80" width="280" height="34" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="102" text-anchor="middle" font-size="13" fill="currentColor">4. Causal — tôn trọng happens-before</text>
<rect x="240" y="40" width="220" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="62" text-anchor="middle" font-size="13" fill="currentColor">5. Total order</text>
<text x="640" y="52" text-anchor="middle" font-size="11" fill="currentColor">= consensus</text>
<text x="640" y="66" text-anchor="middle" font-size="11" fill="currentColor">(đắt)</text>
<text x="90" y="182" text-anchor="middle" font-size="11" fill="currentColor">không</text>
<text x="90" y="196" text-anchor="middle" font-size="11" fill="currentColor">cần</text>
<text x="90" y="210" text-anchor="middle" font-size="11" fill="currentColor">đồng thuận</text>
</svg>

### 2.3 Định nghĩa hình thức total order broadcast

Một giao thức **total order broadcast** cung cấp hai primitive: `broadcast(m)` (gửi) và một sự kiện `deliver(m)` (khi message được "giao" lên tầng ứng dụng để xử lý). Nó phải thoả **4 tính chất**:

- **Validity**: nếu một process đúng broadcast `m`, thì cuối cùng nó tự deliver `m`.
- **(Uniform) Agreement**: nếu một process (đúng) deliver `m`, thì mọi process đúng đều deliver `m`.
- **(Uniform) Integrity**: mỗi `m` được deliver **nhiều nhất một lần**, và chỉ khi thực sự có ai đó broadcast nó (không bịa message).
- **Total order**: nếu process `p` deliver `m1` trước `m2`, thì **mọi** process `q` deliver `m1` trước `m2` (và không process nào deliver `m2` mà thiếu `m1`).

Hai tính chất đầu = reliable broadcast. Tính chất thứ tư là thứ nâng nó lên tầm consensus. Chú ý từ khoá **deliver**: message có thể *đến* (receive) sớm nhưng bị **giữ lại** trong buffer, chỉ được *deliver* khi giao thức chắc chắn vị trí của nó trong thứ tự tổng đã cố định — không bao giờ phải chèn thêm cái gì vào *trước* nó nữa.

### 2.4 Vì sao total order broadcast TƯƠNG ĐƯƠNG consensus

Đây là kết quả nền tảng (Chandra–Toueg): **total order broadcast và consensus quy về được lẫn nhau** — giải được cái này thì giải được cái kia, và ngược lại. Cả hai cùng "khó" như nhau: trong hệ async có lỗi crash, cả hai đều **không thể giải quyết đơn định** (hệ quả của FLP), và cùng **giải được** nếu có thêm giả định (failure detector, timeout, số node đúng > n/2).

**Chiều A — dùng consensus để làm total order broadcast:**
Chạy một **chuỗi các phiên consensus** đánh số `1, 2, 3, ...`. Phiên thứ `i` quyết định "message nào chiếm vị trí (slot) thứ `i` trong log". Vì mọi node đều chạy cùng các phiên và mỗi phiên consensus cho **một kết quả duy nhất mà mọi node đồng ý**, nên node nào cũng thu được **cùng một dãy** message theo cùng thứ tự. Node deliver message theo đúng số slot tăng dần → total order. **Đây chính xác là cách Raft/Paxos/Zab hoạt động**: mỗi entry trong log là kết quả của một quyết định đồng thuận cho một chỉ số log.

**Chiều B — dùng total order broadcast để làm consensus:**
Muốn mọi node đồng ý một giá trị? Mỗi node cứ `broadcast` giá trị đề xuất của mình. Nhờ total order, **mọi node deliver các đề xuất theo đúng cùng một thứ tự**. Quy ước đơn giản: **giá trị được deliver đầu tiên chính là giá trị quyết định**. Vì thứ tự deliver giống nhau ở mọi node → mọi node chọn cùng một giá trị → đạt consensus (agreement + validity + termination).

<svg viewBox="0 0 700 210" role="img" aria-labelledby="eq-t eq-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="eq-t">Total order broadcast tương đương consensus qua chuỗi phiên đồng thuận</title>
<desc id="eq-d">Mỗi slot log là một phiên consensus quyết định message chiếm slot đó</desc>
<text x="350" y="24" text-anchor="middle" font-size="13" fill="currentColor">Chuỗi phiên consensus = một total order log</text>
<rect x="60" y="60" width="120" height="46" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="80" text-anchor="middle" font-size="12" fill="currentColor">consensus #1</text>
<text x="120" y="98" text-anchor="middle" font-size="11" fill="currentColor">→ SET x=1</text>
<rect x="200" y="60" width="120" height="46" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="260" y="80" text-anchor="middle" font-size="12" fill="currentColor">consensus #2</text>
<text x="260" y="98" text-anchor="middle" font-size="11" fill="currentColor">→ SET y=9</text>
<rect x="340" y="60" width="120" height="46" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="400" y="80" text-anchor="middle" font-size="12" fill="currentColor">consensus #3</text>
<text x="400" y="98" text-anchor="middle" font-size="11" fill="currentColor">→ DEL x</text>
<rect x="480" y="60" width="120" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="540" y="80" text-anchor="middle" font-size="12" fill="currentColor">consensus #4</text>
<text x="540" y="98" text-anchor="middle" font-size="11" fill="currentColor">→ (đang bầu)</text>
<line x1="180" y1="83" x2="200" y2="83" stroke="currentColor" stroke-width="1.5" marker-end="url(#ae)"/>
<line x1="320" y1="83" x2="340" y2="83" stroke="currentColor" stroke-width="1.5" marker-end="url(#ae)"/>
<line x1="460" y1="83" x2="480" y2="83" stroke="currentColor" stroke-width="1.5" marker-end="url(#ae)"/>
<text x="350" y="150" text-anchor="middle" font-size="12" fill="currentColor">Mọi node deliver theo đúng thứ tự slot 1→2→3 → cùng một log</text>
<text x="350" y="178" text-anchor="middle" font-size="12" fill="currentColor">1 phiên = 1 quyết định duy nhất mọi node đồng ý = total order</text>
<defs><marker id="ae" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Hệ quả thực dụng cực kỳ quan trọng: **total order broadcast không "rẻ" hơn consensus**. Đừng mơ có một total order log "nhẹ nhàng không cần bầu leader". Muốn total order thật, bạn **phải trả giá của consensus**: cần đa số (quorum) node phản hồi cho mỗi message, cần bầu leader, và **mất khả dụng khi mất quorum** (đúng như CAP đã cảnh báo — total order là mô hình CP).

### 2.5 Replicated State Machine (RSM) — ứng dụng số một

Đây là lý do total order broadcast đáng học. **Mô hình RSM** biến bài toán "làm sao nhiều bản sao của một service luôn nhất quán" thành một công thức máy móc:

> Nếu (1) tất cả bản sao khởi động từ **cùng trạng thái ban đầu**, và (2) mỗi bản sao là một **hàm chuyển trạng thái đơn định** (deterministic — cùng input cho cùng output, không random, không đọc `now()`, không phụ thuộc thứ tự thread), thì: cho chúng apply **cùng một chuỗi lệnh theo cùng thứ tự** → chúng **luôn ở cùng trạng thái**.

Total order broadcast chính là bộ máy tạo ra "cùng chuỗi lệnh, cùng thứ tự" đó. Sơ đồ luồng:

```
             ┌─── deliver (cùng thứ tự) ──┐
 client ──▶  │  Total Order Broadcast     │
 (lệnh)      │  (= consensus, vd Raft)    │
             └──┬──────────┬──────────┬───┘
                ▼          ▼          ▼
            Replica A   Replica B   Replica C
            apply log   apply log   apply log
            → state S   → state S   → state S   (giống hệt nhau)
```

Điều kiện **đơn định** là cái bẫy thực chiến hay bị bỏ quên. Nếu state machine của bạn dùng `random()`, `System.currentTimeMillis()`, iterate một `HashMap` theo thứ tự không xác định, hay phụ thuộc dấu phẩy động khác nhau giữa CPU — thì cùng log vẫn ra khác state, và replication "đúng" vẫn cho kết quả sai. Cách xử lý: **đưa mọi nguồn không đơn định vào chính message** trước khi broadcast (ví dụ leader sinh timestamp/UUID/seed random rồi ghi vào lệnh, các replica đọc lại từ log thay vì tự sinh).

RSM là bộ khung nằm dưới gần như mọi hệ nhất quán mạnh bạn từng nghe: etcd, ZooKeeper, Consul, CockroachDB range, TiKV region, Kafka controller (KRaft)... tất cả đều là "một state machine + một total order log".

### 2.6 Kafka: một partition = một total order log

Kafka là ví dụ đời thực đẹp nhất — và cũng giải thích cả **giới hạn** của total order.

- Mỗi **partition** là một **append-only log**, mỗi bản ghi có **offset** tăng nghiêm ngặt `0, 1, 2, ...`. **Trong một partition**, mọi consumer đọc đúng **cùng một thứ tự** = total order.
- **Nhưng giữa các partition thì KHÔNG có thứ tự tổng.** Kafka scale bằng cách chia topic thành nhiều partition chạy song song; đổi lại nó **từ bỏ** total order toàn topic. Đây chính là đánh đổi ở mục 2.4: total order **không song song hoá được** trên cùng một log — muốn throughput cao, bạn phải **cắt** thành nhiều log độc lập, và chấp nhận chỉ có thứ tự *trong* mỗi log.
- Hệ quả thiết kế: nếu các message **phải** theo thứ tự (vd mọi event của cùng một `order_id`), bạn **phải cho chúng vào cùng một partition** — thường bằng cách đặt **key = order_id** để Kafka hash cùng key về cùng partition.

Cách Kafka giữ total order *bền vững* trong một partition **cũng chính là consensus**: partition có một **leader** và các **follower (ISR — in-sync replicas)**; một bản ghi chỉ được coi là **committed** khi đã sao chép đủ ISR. Đây là replication kiểu leader + quorum — đúng tinh thần mục 2.4. Từ Kafka 3.x, ngay cả metadata cluster cũng chạy trên **KRaft** = Raft = total order broadcast.

```bash
# Tạo topic 3 partition: total order chỉ đảm bảo TRONG mỗi partition
kafka-topics.sh --create --topic orders \
  --partitions 3 --replication-factor 3 \
  --config min.insync.replicas=2 --bootstrap-server localhost:9092

# Producer: ép mọi event cùng order_id về cùng 1 partition -> giữ thứ tự
#   key = order_id  => Kafka hash key -> partition cố định
# acks=all  + min.insync.replicas=2 => chỉ committed khi đủ quorum ISR
kafka-console-producer.sh --topic orders \
  --property "parse.key=true" --property "key.separator=:" \
  --producer-property acks=all \
  --bootstrap-server localhost:9092
# gõ:  order-42:{"evt":"CREATED"}
#      order-42:{"evt":"PAID"}      <- cùng key order-42 => cùng partition => PAID luôn sau CREATED
```

Ba tham số đáng nhớ để total order *không bị phá*:
- `acks=all` + `min.insync.replicas=2`: bản ghi chỉ committed khi đủ quorum → không mất thứ tự khi leader chết.
- `enable.idempotence=true` (mặc định bật ở producer mới): tránh producer retry tạo bản ghi trùng làm lệch offset.
- `max.in.flight.requests.per.connection ≤ 5` **với idempotence bật**: đảm bảo Kafka không ghi đảo thứ tự khi retry.

### 2.7 Liên hệ Raft log: total order broadcast "đóng hộp"

Raft (bài về consensus) chính là một hiện thực total order broadcast **được kỹ sư hoá cho dễ hiểu**. Ánh xạ 1–1:

| Khái niệm total order broadcast | Trong Raft |
|---------------------------------|------------|
| `broadcast(m)` | client gửi command tới **leader**; leader `AppendEntries` xuống followers |
| Chọn vị trí (slot) cho message | **log index** — leader gán index tăng dần cho mỗi entry |
| Message được "cố định thứ tự" | entry **committed** khi đã sao chép tới **đa số (quorum)** node |
| `deliver(m)` | entry committed được **apply** vào state machine |
| Total order được đảm bảo bởi | **Log Matching Property** + chỉ leader mới ghi + bầu leader qua term |

Raft đảm bảo: nếu hai node có một entry tại **cùng index với cùng term**, thì **toàn bộ log trước index đó cũng giống hệt nhau**. Đó chính là "mọi node deliver cùng thứ tự" của total order broadcast, được phát biểu lại dưới dạng bất biến của log. Và vì committed cần **quorum**, Raft (như mọi total order thật) **ngừng nhận ghi khi mất đa số** — CP over A.

---

## 3. Bảng tổng: chọn mức nào cho việc gì

| Nhu cầu thực tế | Mức tối thiểu đủ dùng | Ghi chú giá phải trả |
|-----------------|------------------------|----------------------|
| Bắn metric/log "mất vài cái cũng được" | Best-effort | Rẻ nhất, không hứa gì khi sender chết |
| Phát cấu hình tới mọi node, không được sót | Reliable | Cần retransmit/gossip; thứ tự tự do |
| Stream event của **cùng một user** đúng trình tự | FIFO (per-key) | Kafka key = user_id giải quyết đúng ca này |
| Feed mạng xã hội "reply luôn sau post" | Causal | Vector clock / dependency tracking; không cần consensus |
| **Replicated state machine**, ghi phải nhất quán tuyệt đối | **Total order** | Phải trả giá consensus: quorum, leader, mất khả dụng khi mất quorum |

Nguyên tắc vàng: **đừng dùng total order khi FIFO/causal là đủ.** Total order là mức đắt nhất (không song song hoá, giới hạn throughput ở tốc độ một leader + một vòng quorum). Rất nhiều hệ tưởng cần "thứ tự toàn cục" thực ra chỉ cần **thứ tự per-key** — và đó là lý do Kafka partition-by-key thắng lớn trong thực tế.

---

## 4. Tình huống thực tế & con số

**Ví dụ: ví điện tử replicate 3 node.** Lệnh `NẠP +100k` rồi `RÚT -100k` cho số dư 0; đảo thứ tự thành `RÚT -100k` (khi số dư đang 0) → bị từ chối, rồi `NẠP +100k` → số dư 100k. **Cùng hai lệnh, khác thứ tự, lệch 100k.** Nếu ba node không thống nhất thứ tự, ba node báo ba số dư khác nhau — thảm hoạ. Total order broadcast (Raft) ép cả ba apply **đúng một chuỗi** → luôn khớp.

**Con số về giá của total order.** Mỗi lệnh phải qua một vòng quorum: leader gửi tới followers, chờ **đa số** ack rồi mới commit. Với cụm 3 node cùng datacenter, đó là ~1 round-trip nội bộ (~0.5–2 ms). Cụm trải 3 vùng địa lý (vd Raft/Paxos xuyên vùng), một round-trip có thể **50–100 ms** → throughput ghi tuần tự của **một** log bị chặn ở cỡ **vài nghìn op/s**. Muốn hơn: **sharding** (nhiều Raft group / nhiều Kafka partition, mỗi cái một total order log riêng) — đánh đổi total order toàn cục lấy song song, y như Kafka.

**Cái bẫy đơn định.** Một team để state machine sinh `expires_at = now() + 24h` **tại mỗi replica** khi apply lệnh. Ba replica apply cùng lệnh ở ba thời điểm micro giây lệch nhau → ba `expires_at` khác nhau → state phân kỳ dù log giống hệt. Sửa: **leader** tính `expires_at` một lần, ghi vào entry, replica đọc từ log. Bài học: total order log chỉ đảm bảo *cùng input cùng thứ tự*; **tính đơn định của state machine là trách nhiệm của bạn.**

---

## 5. Tóm tắt
- **5 mức broadcast** mạnh dần: best-effort → reliable → FIFO → causal → **total order**. Reliable lo *ai nhận*; FIFO/causal lo thứ tự của message *có quan hệ* (làm được không cần đồng thuận); **total order** ép một trình tự tổng cho **cả message đồng thời**.
- **Total order broadcast (atomic broadcast) TƯƠNG ĐƯƠNG consensus**: quy về nhau được (chuỗi phiên consensus ↔ một total order log). Nên total order **đắt bằng consensus** — cần quorum, cần leader, **mất khả dụng khi mất quorum** (CP).
- Ứng dụng số một là **replicated state machine**: cùng trạng thái đầu + state machine **đơn định** + **cùng chuỗi lệnh cùng thứ tự** ⇒ mọi bản sao **cùng trạng thái**. Tính đơn định là trách nhiệm của bạn.
- Đời thực: **một Kafka partition = một total order log** (offset), nhưng **giữa partition không có thứ tự tổng** — đó là cách Kafka đổi total order toàn cục lấy song song; ép thứ tự per-key bằng `key`. **Raft log = total order broadcast đóng hộp**: log index = slot, committed-khi-quorum = cố định thứ tự, apply = deliver.
- Nguyên tắc vàng: **chỉ dùng total order khi thật cần**; phần lớn nhu cầu chỉ cần **thứ tự per-key** (FIFO), rẻ hơn nhiều và song song hoá được.

> **Bài tiếp theo:** đi sâu vào **cách một total order log tự chữa lành** khi leader chết — bầu leader, log reconciliation, và vì sao "chỉ node có log mới nhất mới được làm leader".
