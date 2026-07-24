# Bài 9 — Leaderless & quorum (Dynamo-style)

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **leaderless replication** kiểu Dynamo/Cassandra khác gì với single-leader (Bài 8): **client tự ghi/đọc trên nhiều bản**, không có ai làm "sếp".
- Chứng minh vì sao điều kiện **W + R > N** đảm bảo đọc luôn "chạm" được ít nhất một bản có dữ liệu mới nhất.
- Hiểu **sloppy quorum + hinted handoff** giữ hệ vẫn ghi được khi node đích chết, và cái giá của nó.
- Nắm cơ chế hội tụ dữ liệu nền: **read repair** (khi đọc) và **anti-entropy** dùng **Merkle tree** (chạy ngầm).
- Chỉ ra **giới hạn**: quorum KHÔNG chống được **concurrent write conflict** — vẫn cần versioning để hoà giải.

---

## 2. Lý thuyết

### 2.1 Ôn nhanh: từ single-leader sang leaderless

Bài 8 dùng **single-leader**: mọi ghi đi qua một leader, leader nhân bản xuống các follower. Đơn giản để suy luận, nhưng leader là **điểm nghẽn** và khi leader chết phải **failover** (một khoảng không ghi được).

**Leaderless** (Amazon Dynamo 2007, và các hậu duệ Cassandra, Riak, ScyllaDB, Voldemort) bỏ hẳn vai trò leader. Mọi bản sao (replica) đều **bình đẳng**. Client (hoặc một node điều phối gọi là *coordinator*) **gửi ghi thẳng tới nhiều replica cùng lúc** và cũng **đọc từ nhiều replica cùng lúc**. Không có bước bầu lại leader, nên **không có cửa sổ mất khả năng ghi** khi một node chết — đây là lý do Dynamo sinh ra: Amazon cần giỏ hàng **luôn ghi được (always writeable)**.

> **Analogy đời thường:** một nhóm 3 thư ký cùng giữ chung một cuốn sổ ghi số dư khách. Không có "thư ký trưởng". Muốn cập nhật, bạn đi báo cho **2 trong 3** người và chờ 2 người xác nhận đã ghi. Muốn tra cứu, bạn hỏi **2 trong 3** người rồi lấy con số **mới nhất** trong các câu trả lời. Vì hai nhóm "2 người" bất kỳ trong 3 người **luôn giao nhau ít nhất 1 người**, người tra cứu chắc chắn gặp được ít nhất một thư ký đã nghe tin mới. Đó chính là toàn bộ tinh thần của quorum.

### 2.2 N, W, R — ba con số quyết định

- **N** = số replica giữ mỗi mảnh dữ liệu (replication factor). Với consistent hashing (Bài 4), N node kế tiếp trên vòng băm chịu trách nhiệm cho một key.
- **W** = số replica phải **ack ghi thành công** thì client mới coi ghi là OK (write quorum).
- **R** = số replica phải **trả lời khi đọc** thì client mới nhận kết quả (read quorum).

W và R do **client/tuỳ query** chọn, không cố định — đây là điểm mạnh: mỗi truy vấn tự chọn điểm trên trục nhất quán ↔ độ trễ.

**Điều kiện quorum: `W + R > N`.**

<svg viewBox="0 0 700 260" role="img" aria-labelledby="q-t q-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="q-t">Quorum W+R&gt;N với N=3, W=2, R=2</title>
<desc id="q-d">Ba replica; ghi tới 2 bản, đọc từ 2 bản, hai tập luôn giao nhau ít nhất một bản</desc>
<text x="350" y="24" text-anchor="middle" font-size="14" fill="currentColor">N=3, W=2, R=2 → W+R=4 &gt; 3</text>
<rect x="60" y="60" width="120" height="60" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="88" text-anchor="middle" font-size="13" fill="currentColor">Replica 1</text>
<text x="120" y="107" text-anchor="middle" font-size="11" fill="currentColor">v2 (mới)</text>
<rect x="290" y="60" width="120" height="60" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="88" text-anchor="middle" font-size="13" fill="currentColor">Replica 2</text>
<text x="350" y="107" text-anchor="middle" font-size="11" fill="currentColor">v2 (mới)</text>
<rect x="520" y="60" width="120" height="60" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="580" y="88" text-anchor="middle" font-size="13" fill="currentColor">Replica 3</text>
<text x="580" y="107" text-anchor="middle" font-size="11" fill="currentColor">v1 (cũ)</text>
<rect x="40" y="150" width="380" height="38" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="230" y="174" text-anchor="middle" font-size="12" fill="currentColor">WRITE tới R1, R2  (W=2 ack)</text>
<rect x="290" y="200" width="380" height="38" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="480" y="224" text-anchor="middle" font-size="12" fill="currentColor">READ từ R2, R3  (R=2 reply)</text>
<text x="350" y="256" text-anchor="middle" font-size="12" fill="currentColor">Giao nhau tại R2 → đọc thấy v2 mới nhất</text>
</svg>

### 2.3 Vì sao W + R > N đảm bảo đọc thấy ghi mới?

Đây là **nguyên lý ngăn kéo (pigeonhole)** thuần tuý, không có phép màu:

- Tập replica đã nhận bản ghi mới có kích thước **≥ W**.
- Tập replica bạn hỏi khi đọc có kích thước **= R**.
- Cả hai đều là tập con của N replica. Nếu `W + R > N` thì **hai tập bắt buộc giao nhau** (nếu tách rời được thì tổng kích thước ≤ N, mâu thuẫn với W+R > N).
- Giao nhau ⇒ trong R replica bạn đọc có **ít nhất một** replica đang giữ giá trị mới. Bạn **so version** (timestamp/vector clock) giữa các câu trả lời và chọn cái mới nhất ⇒ **đọc thấy ghi mới**.

Với **N=3, W=2, R=2**: một ghi thành công nằm trên ≥ 2 bản; một đọc chạm 2 bản; 2+2=4 > 3 nên chắc chắn có 1 bản chung. Đây là cấu hình mặc định kinh điển của Dynamo/Cassandra: chịu được **1 node chết** mà vẫn ghi và đọc quorum được.

**Chọn W, R theo nhu cầu** (cùng N=3):

| Cấu hình | W | R | Đặc tính | Dùng khi |
|----------|---|---|----------|----------|
| Cân bằng | 2 | 2 | Đọc thấy ghi mới, chịu 1 node chết | Mặc định phổ biến |
| Ghi nhanh | 1 | 3 | Ghi chỉ cần 1 ack (nhanh, ít bền), đọc phải hỏi cả 3 | Ghi nhiều, đọc hiếm |
| Đọc nhanh | 3 | 1 | Đọc chỉ 1 bản (nhanh), ghi phải chạm cả 3 | Đọc nhiều, ghi hiếm |
| Không quorum | 1 | 1 | W+R=2 ≤ 3: **có thể đọc dữ liệu cũ** | Cần độ trễ thấp, chịu stale |

> **Lưu ý bản chất:** quorum chỉ đảm bảo tính chất giao nhau, **không** đảm bảo linearizability. Vẫn có các trường hợp mép (đọc-trong-lúc-ghi, ghi thất bại một phần, sloppy quorum) khiến đọc thấy giá trị cũ. Muốn nhất quán mạnh tuyệt đối phải dùng consensus (Raft/Paxos — Bài về consensus), không phải quorum trần.

### 2.4 Luồng ghi và đọc thực tế

<svg viewBox="0 0 700 300" role="img" aria-labelledby="fl-t fl-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="fl-t">Luồng ghi quorum W=2 và đọc quorum R=2 với read repair</title>
<desc id="fl-d">Coordinator gửi ghi tới ba replica, đợi hai ack; khi đọc gộp hai bản và sửa bản cũ</desc>
<rect x="20" y="20" width="120" height="44" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="47" text-anchor="middle" font-size="12" fill="currentColor">Coordinator</text>
<rect x="300" y="20" width="70" height="36" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="335" y="43" text-anchor="middle" font-size="12" fill="currentColor">R1</text>
<rect x="400" y="20" width="70" height="36" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="435" y="43" text-anchor="middle" font-size="12" fill="currentColor">R2</text>
<rect x="500" y="20" width="70" height="36" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="535" y="43" text-anchor="middle" font-size="12" fill="currentColor">R3</text>
<text x="80" y="95" text-anchor="middle" font-size="12" fill="currentColor">WRITE v2</text>
<line x1="140" y1="100" x2="335" y2="100" stroke="#10b981" stroke-width="1.5" marker-end="url(#ar)"/>
<line x1="140" y1="112" x2="435" y2="112" stroke="#10b981" stroke-width="1.5" marker-end="url(#ar)"/>
<line x1="140" y1="124" x2="535" y2="124" stroke="#f43f5e" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#ar)"/>
<text x="600" y="128" font-size="11" fill="#f43f5e">R3 chậm/mất</text>
<text x="230" y="150" text-anchor="middle" font-size="11" fill="currentColor">R1,R2 ack ⇒ W=2 đạt ⇒ báo OK</text>
<line x1="20" y1="170" x2="680" y2="170" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="80" y="200" text-anchor="middle" font-size="12" fill="currentColor">READ (R=2)</text>
<line x1="140" y1="205" x2="435" y2="205" stroke="#8b5cf6" stroke-width="1.5" marker-end="url(#ar)"/>
<line x1="140" y1="217" x2="535" y2="217" stroke="#8b5cf6" stroke-width="1.5" marker-end="url(#ar)"/>
<text x="335" y="245" text-anchor="middle" font-size="11" fill="currentColor">R2→v2, R3→v1</text>
<text x="335" y="262" text-anchor="middle" font-size="11" fill="currentColor">chọn v2 (mới) trả client</text>
<line x1="500" y1="280" x2="360" y2="280" stroke="#f59e0b" stroke-width="1.5" marker-end="url(#ar)"/>
<text x="510" y="284" font-size="11" fill="#f59e0b">read repair: ghi v2 vá R3</text>
<defs><marker id="ar" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Khi đọc, coordinator không chỉ lấy 1 bản: nó **gộp R câu trả lời**, so version, trả cái mới nhất cho client — rồi tiện thể **vá** những bản đang cũ (mục 2.6).

### 2.5 Sloppy quorum + hinted handoff — giữ "luôn ghi được"

Vấn đề: với N=3, W=2, nếu **2 trong 3 node "nhà" (home node) của key** cùng chết hoặc bị network partition, ta không đủ W ⇒ ghi thất bại. Với Amazon, "không ghi được giỏ hàng" = mất tiền. Dynamo chọn **hy sinh nhất quán để luôn ghi được**.

- **Sloppy quorum:** nếu không gom đủ W node "nhà", coordinator **mượn tạm** các node khoẻ khác (ngoài N node home) để nhận ghi cho đủ W. Ghi vẫn thành công dù người nhận không phải chủ thật của key.
- **Hinted handoff:** node mượn tạm lưu bản ghi kèm một **hint** ("cái này thật ra của node X, X đang chết"). Khi node X sống lại, node tạm **chuyển giao (handoff)** dữ liệu về đúng X rồi xoá bản tạm.

<svg viewBox="0 0 700 210" role="img" aria-labelledby="hh-t hh-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="hh-t">Sloppy quorum và hinted handoff</title>
<desc id="hh-d">Node đích chết, node tạm nhận ghi kèm hint rồi chuyển giao lại khi node đích hồi phục</desc>
<rect x="30" y="80" width="110" height="50" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="85" y="102" text-anchor="middle" font-size="12" fill="currentColor">Coordinator</text>
<text x="85" y="119" text-anchor="middle" font-size="11" fill="currentColor">cần W=2</text>
<rect x="300" y="20" width="120" height="46" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="41" text-anchor="middle" font-size="12" fill="currentColor">Node X (home)</text>
<text x="360" y="58" text-anchor="middle" font-size="11" fill="#f43f5e">CHẾT</text>
<rect x="300" y="140" width="120" height="46" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="161" text-anchor="middle" font-size="12" fill="currentColor">Node Z (tạm)</text>
<text x="360" y="178" text-anchor="middle" font-size="11" fill="currentColor">giữ + hint→X</text>
<line x1="140" y1="100" x2="300" y2="55" stroke="#f43f5e" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#a2)"/>
<line x1="140" y1="112" x2="300" y2="160" stroke="#10b981" stroke-width="1.5" marker-end="url(#a2)"/>
<text x="205" y="150" text-anchor="middle" font-size="11" fill="currentColor">ghi tạm vào Z</text>
<line x1="360" y1="140" x2="360" y2="70" stroke="#8b5cf6" stroke-width="1.5" marker-end="url(#a2)"/>
<text x="530" y="105" text-anchor="middle" font-size="11" fill="currentColor">X sống lại ⇒ Z handoff</text>
<text x="530" y="122" text-anchor="middle" font-size="11" fill="currentColor">dữ liệu về X, xoá bản tạm</text>
<defs><marker id="a2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Cái giá:** sloppy quorum **phá vỡ đảm bảo giao nhau** của W+R>N. Trong lúc dữ liệu còn nằm ở node tạm Z (chưa handoff), một đọc quorum trên đúng N node home **có thể không thấy** bản ghi mới đó ⇒ đọc ra dữ liệu cũ. Nói cách khác: sloppy quorum tăng **durability/availability** cho ghi, nhưng **không** còn là "read-your-write" chặt. Đây là đánh đổi cố ý, phải hiểu rõ khi bật nó.

### 2.6 Làm sao các bản hội tụ lại? Read repair + anti-entropy

Ghi quorum W=2 để lại vấn đề: bản thứ 3 (và các bản bị sloppy/hint) đang **cũ**. Nếu không có cơ chế đồng bộ, chúng cũ mãi. Dynamo dùng **hai** cơ chế bổ trợ nhau:

**1) Read repair (đồng bộ theo lối đọc — chủ động khi có đọc):**
Như mục 2.4: mỗi khi đọc chạm nhiều bản và phát hiện bản lệch version, coordinator **ghi đè bản mới xuống bản cũ** ngay trong luồng đọc. Rẻ, tức thời, nhưng **chỉ chữa những key được đọc**. Key ít khi đọc sẽ không bao giờ được vá bằng cách này.

**2) Anti-entropy với Merkle tree (đồng bộ nền — quét toàn bộ):**
Để chữa cả những key **không ai đọc**, các replica định kỳ **so sánh toàn bộ dữ liệu** với nhau. So từng key thì tốn khủng khiếp, nên Dynamo dùng **Merkle tree**: cây băm mà **lá là hash của từng khoảng key**, **node cha là hash của các con**. Hai replica so **gốc cây trước**:
- Gốc **bằng nhau** ⇒ toàn bộ dữ liệu giống hệt ⇒ **không cần truyền gì** (đây là điểm ăn tiền).
- Gốc **khác** ⇒ đi xuống chỉ những **nhánh có hash khác**, bỏ qua nhánh giống, cho tới khi tìm ra đúng các key lệch. Chỉ những key khác biệt mới cần đồng bộ.

<svg viewBox="0 0 700 250" role="img" aria-labelledby="mk-t mk-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="mk-t">Merkle tree để anti-entropy so sánh hai replica hiệu quả</title>
<desc id="mk-d">So gốc cây trước; chỉ đi xuống nhánh có hash khác nhau để tìm key lệch</desc>
<rect x="300" y="20" width="100" height="38" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="43" text-anchor="middle" font-size="12" fill="currentColor">root khác</text>
<rect x="150" y="95" width="100" height="36" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="200" y="118" text-anchor="middle" font-size="11" fill="currentColor">hash L = nhau</text>
<rect x="450" y="95" width="100" height="36" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="500" y="118" text-anchor="middle" font-size="11" fill="currentColor">hash R khác</text>
<line x1="330" y1="58" x2="215" y2="95" stroke="currentColor" stroke-width="1.2"/>
<line x1="370" y1="58" x2="490" y2="95" stroke="currentColor" stroke-width="1.2"/>
<text x="200" y="150" text-anchor="middle" font-size="11" fill="#10b981">bỏ qua cả nhánh</text>
<rect x="400" y="165" width="90" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="445" y="187" text-anchor="middle" font-size="11" fill="currentColor">key 40-49 =</text>
<rect x="520" y="165" width="90" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="565" y="187" text-anchor="middle" font-size="11" fill="currentColor">key 50-59 ≠</text>
<line x1="480" y1="131" x2="445" y2="165" stroke="currentColor" stroke-width="1.2"/>
<line x1="520" y1="131" x2="565" y2="165" stroke="currentColor" stroke-width="1.2"/>
<text x="565" y="222" text-anchor="middle" font-size="11" fill="#8b5cf6">chỉ đồng bộ key 50-59</text>
</svg>

Hai cơ chế bù nhau: read repair chữa **nóng** (key đang được truy cập), anti-entropy/Merkle chữa **nguội** (key lạnh, và sau khi node chết lâu quay lại). Cassandra còn có `nodetool repair` chạy anti-entropy bằng Merkle tree đúng như vậy.

### 2.7 Giới hạn: concurrent write vẫn conflict

Đây là điểm nhiều người hiểu sai. **Quorum không hề chống được xung đột ghi đồng thời.** Xét N=3, W=2:

- Client A ghi `cart = {sách}` tới R1, R2.
- Cùng lúc client B ghi `cart = {đĩa}` tới R2, R3 (mạng làm hai ghi đến R2 theo thứ tự khác nhau ở các bản, hoặc dựa trên bản đọc cũ).
- Không có leader để **serial hoá** thứ tự ⇒ các replica có thể kết thúc với giá trị khác nhau, và **không có "ai đúng"** tự nhiên.

Chỉ dựa **timestamp lớn hơn thắng (last-write-wins)** thì đơn giản nhưng **mất dữ liệu**: một trong hai ghi hợp lệ biến mất, còn phụ thuộc clock lệch (Bài về clock). Dynamo giải bằng **versioning để phát hiện đồng thời**, không tự quyết bừa:

- **Vector clock / version vector** gắn vào mỗi giá trị. Khi đọc, nếu các version **so sánh được** (cái này là hậu duệ của cái kia) ⇒ giữ cái mới. Nếu **không so sánh được** (đồng thời thật sự) ⇒ đó là **conflict**, hệ trả về **cả hai bản (siblings)** cho ứng dụng.
- **Application-level merge:** ứng dụng tự hoà giải theo ngữ nghĩa. Giỏ hàng Dynamo hợp nhất bằng **union** hai giỏ (thà thêm nhầm món còn hơn mất món) — chính là ví dụ gốc trong paper. Hoặc dùng **CRDT** để merge tự động, đúng đắn.

> **Chốt:** W+R>N giải quyết "đọc có thấy ghi mới không" khi các ghi **tuần tự**. Nó **không** giải quyết "hai ghi cùng lúc chọn cái nào" — cái đó cần **version vector + merge/CRDT**, hoặc phải leo lên **consensus** nếu muốn một thứ tự tuyệt đối.

---

## 3. Thực hành: Cassandra (leaderless Dynamo-style)

Cassandra hiện thực gần như nguyên vẹn mô hình Dynamo. Consistency level (CL) chính là W và R chọn theo từng câu lệnh.

```sql
-- Keyspace với replication factor N = 3 (SimpleStrategy cho demo 1 DC)
CREATE KEYSPACE shop
  WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 3};

USE shop;
CREATE TABLE cart (user_id uuid PRIMARY KEY, items set<text>);
```

```sql
-- GHI với W=2  (QUORUM của N=3 là ceil((3+1)/2)=2)
CONSISTENCY QUORUM;
INSERT INTO cart (user_id, items)
  VALUES (11111111-1111-1111-1111-111111111111, {'book'});

-- ĐỌC với R=2
CONSISTENCY QUORUM;
SELECT * FROM cart
  WHERE user_id = 11111111-1111-1111-1111-111111111111;
-- QUORUM ghi + QUORUM đọc ⇒ W+R = 2+2 = 4 > 3 ⇒ đọc thấy ghi mới nhất
```

Các mức CL và ý nghĩa (N=3):

| CONSISTENCY | Số bản chờ | Vai trò | Ghi chú |
|-------------|-----------|---------|---------|
| `ONE` | 1 | W=1 hoặc R=1 | Nhanh nhất, có thể stale |
| `QUORUM` | 2 | W=2 hoặc R=2 | QUORUM ghi + QUORUM đọc ⇒ strong-ish |
| `ALL` | 3 | W=3 hoặc R=3 | Chậm, mất 1 node là fail |
| `LOCAL_QUORUM` | quorum trong 1 DC | đa datacenter | Tránh chờ chéo DC |

```bash
# Anti-entropy thủ công bằng Merkle tree trên toàn cluster
nodetool repair shop cart
# So Merkle tree giữa các replica, chỉ stream các range dữ liệu lệch nhau
```

> **Quy tắc vàng để có "đọc thấy ghi mới":** đừng nhìn W hay R riêng lẻ — chỉ cần đảm bảo **CL_write + CL_read > N**. `QUORUM` cho cả hai (2+2>3) là lựa chọn mặc định an toàn. Nếu ghi `ONE` và đọc `ONE` (1+1 ≤ 3) thì phải chấp nhận đọc dữ liệu cũ.

---

## 4. Tình huống thực tế & con số

**Giỏ hàng Amazon (bài toán gốc của Dynamo).** Mục tiêu: giỏ hàng **luôn thêm được món** kể cả khi vài node chết hay đứt mạng giữa các DC.
- N=3, W=1 hoặc sloppy quorum ⇒ ghi gần như không bao giờ fail (always writeable).
- Khi khách mở giỏ sau sự cố mạng, có thể thấy **hai phiên bản giỏ** (siblings) do ghi đồng thời từ hai thiết bị/hai DC. App **union** hai giỏ ⇒ khách thấy đủ món (thà dư còn hơn thiếu — dư thì khách bỏ ra, thiếu thì mất đơn).
- Trade-off chấp nhận được vì "mất món trong giỏ" tệ hơn nhiều so với "hiện dư một món đã xoá".

**Vì sao không dùng leaderless cho tài khoản ngân hàng?** Vì `union` hai số dư là vô nghĩa và LWW làm mất giao dịch. Nghiệp vụ cần **một thứ tự tuyệt đối** ⇒ dùng single-leader + consensus (Raft) hoặc transaction, không phải quorum thuần.

---

## 5. Tóm tắt
- **Leaderless (Dynamo/Cassandra):** mọi replica bình đẳng, client/coordinator **ghi tới nhiều bản, đọc từ nhiều bản**, không failover ⇒ **always writeable**.
- **N/W/R** do query chọn; **W+R>N** đảm bảo tập ghi và tập đọc **giao nhau** ⇒ đọc chạm được ít nhất một bản mới ⇒ **đọc thấy ghi mới** (khi ghi tuần tự). Ví dụ chuẩn **N=3, W=2, R=2**.
- **Sloppy quorum + hinted handoff:** mượn node tạm để đủ W khi node home chết; giữ hint rồi handoff về sau. Đổi lại **phá vỡ đảm bảo giao nhau** trong lúc chưa handoff.
- **Hội tụ:** **read repair** vá nóng khi đọc; **anti-entropy + Merkle tree** vá nguội, so gốc cây trước nên chỉ truyền phần dữ liệu lệch.
- **Giới hạn cốt tử:** quorum **không** chống **concurrent write** — cần **version vector** để phát hiện đồng thời và **merge/CRDT** (hoặc consensus) để hoà giải; LWW đơn thuần sẽ mất dữ liệu.

> **Bài tiếp theo:** làm sao nhiều node **đồng thuận một thứ tự tuyệt đối** khi leaderless quorum không đủ — **consensus & Raft** (leader election, log replication, commit an toàn).
