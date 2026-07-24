# Bài 10 — Partitioning / Sharding

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **vì sao phải partition** — bản chất là vượt **trần của một máy** về dung lượng, throughput ghi và bộ nhớ.
- Phân biệt **range partitioning** và **hash partitioning**: mỗi cái tốt/dở ở đâu, đánh đổi giữa **range query** và **phân bố đều**.
- Hiểu **hot spot / skew** vì sao xuất hiện và các kỹ thuật xử lý (salting, split, consistent hashing...).
- Thiết kế **secondary index** trong hệ đã partition: **local (document-partitioned)** vs **global (term-partitioned)** — mỗi loại đắt ở đường đọc hay đường ghi.
- Ghép **partitioning với replication** để vừa scale vừa chịu lỗi, và định tuyến request tới đúng node.

---

## 2. Lý thuyết

### 2.1 Vì sao phải partition? Trần của một máy

Ở [Bài 9 — Replication](#) ta nhân **bản sao** của cùng một tập dữ liệu ra nhiều node để chịu lỗi và tăng đọc. Nhưng replication **không giải quyết** được hai thứ:
- **Dung lượng**: mỗi replica vẫn phải chứa **toàn bộ** dataset. 50 TB dữ liệu thì mọi replica đều cần 50 TB đĩa.
- **Throughput ghi**: mọi ghi cuối cùng vẫn phải chạy qua **một leader**, và leader vẫn là một máy.

Khi dataset hoặc tải ghi vượt trần một máy, ta phải **chia** dữ liệu thành nhiều mảnh — **partition** (nhiều nơi gọi là **shard**) — và đặt mỗi mảnh lên một node khác nhau. Mỗi node giờ chỉ chịu **một phần** dữ liệu và một phần tải.

> **Partition (shard)**: một tập con của dữ liệu, sao cho mỗi bản ghi (mỗi key) thuộc **đúng một** partition. Đây là **chia theo chiều dữ liệu**, khác hẳn với **replication** là **nhân bản** cùng một dữ liệu.

Đây là **scale ngang (horizontal scaling)** đúng nghĩa: muốn gấp đôi năng lực, thêm node và chia lại partition, thay vì mua một máy to gấp đôi (scale dọc — luôn có trần và giá phi tuyến).

<svg viewBox="0 0 700 250" role="img" aria-labelledby="pt-t pt-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="pt-t">Replication so với Partitioning</title>
<desc id="pt-d">Replication nhân toàn bộ dữ liệu ra nhiều node, partitioning chia dữ liệu thành các mảnh rời trên các node khác nhau</desc>
<text x="175" y="24" text-anchor="middle" font-size="14" fill="currentColor">Replication (nhân bản)</text>
<rect x="40" y="45" width="80" height="120" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="100" text-anchor="middle" font-size="11" fill="currentColor">Node 1</text>
<text x="80" y="118" text-anchor="middle" font-size="11" fill="currentColor">A B C D</text>
<rect x="135" y="45" width="80" height="120" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="175" y="100" text-anchor="middle" font-size="11" fill="currentColor">Node 2</text>
<text x="175" y="118" text-anchor="middle" font-size="11" fill="currentColor">A B C D</text>
<rect x="230" y="45" width="80" height="120" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="270" y="100" text-anchor="middle" font-size="11" fill="currentColor">Node 3</text>
<text x="270" y="118" text-anchor="middle" font-size="11" fill="currentColor">A B C D</text>
<text x="175" y="190" text-anchor="middle" font-size="11" fill="currentColor">Mỗi node giữ TOÀN BỘ</text>
<text x="175" y="207" text-anchor="middle" font-size="11" fill="currentColor">→ chịu lỗi, tăng đọc</text>
<line x1="345" y1="45" x2="345" y2="215" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<text x="530" y="24" text-anchor="middle" font-size="14" fill="currentColor">Partitioning (chia mảnh)</text>
<rect x="390" y="45" width="80" height="120" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="430" y="100" text-anchor="middle" font-size="11" fill="currentColor">Node 1</text>
<text x="430" y="118" text-anchor="middle" font-size="11" fill="currentColor">A B</text>
<rect x="485" y="45" width="80" height="120" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="525" y="100" text-anchor="middle" font-size="11" fill="currentColor">Node 2</text>
<text x="525" y="118" text-anchor="middle" font-size="11" fill="currentColor">C D</text>
<rect x="580" y="45" width="80" height="120" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="620" y="100" text-anchor="middle" font-size="11" fill="currentColor">Node 3</text>
<text x="620" y="118" text-anchor="middle" font-size="11" fill="currentColor">E F</text>
<text x="525" y="190" text-anchor="middle" font-size="11" fill="currentColor">Mỗi node giữ MỘT PHẦN</text>
<text x="525" y="207" text-anchor="middle" font-size="11" fill="currentColor">→ vượt trần dung lượng và ghi</text>
</svg>

### 2.2 Câu hỏi cốt lõi: key nào về partition nào?

Toàn bộ nghệ thuật partitioning gói trong một câu: **cho một key, làm sao biết nó nằm ở partition nào?** Cách trả lời quyết định hệ thống nhanh hay chậm, cân bằng hay lệch. Có hai họ chính: **range** và **hash**.

---

### 2.3 Range partitioning

Chia không gian key thành các **khoảng liên tục** (contiguous ranges), mỗi khoảng là một partition — giống **bộ bách khoa toàn thư** chia theo vần: tập 1 chứa A–C, tập 2 chứa D–F...

| Partition | Khoảng key |
|-----------|-----------|
| P0 | `user_00000` → `user_19999` |
| P1 | `user_20000` → `user_39999` |
| P2 | `user_40000` → `user_59999` |

**Ưu điểm lớn nhất — range query hiệu quả.** Vì các key liền kề nằm cạnh nhau, một truy vấn kiểu *"tất cả bản ghi từ `2026-01-01` đến `2026-01-07`"* chỉ chạm **một hoặc vài partition liền nhau**, và trong mỗi partition dữ liệu được **sắp xếp** nên quét tuần tự rất rẻ. Đây là lý do HBase, Bigtable, MongoDB (ranged) chọn range.

**Nhược điểm chí mạng — dễ hot spot.** Nếu key là **timestamp** và tải chủ yếu là ghi dữ liệu *mới nhất*, thì mọi ghi đổ hết vào partition chứa khoảng thời gian gần nhất — một node "nóng rực" còn các node khác ngồi chơi. Ranh giới khoảng cũng phải **chọn khéo hoặc để hệ tự chia (auto-split)** vì phân bố key thực tế thường không đều (nhiều user tên bắt đầu bằng "S", ít bằng "X").

### 2.4 Hash partitioning

Đưa key qua một **hàm băm** rồi lấy kết quả để chọn partition. Ý tưởng: hàm băm tốt **rải đều** mọi key (kể cả key liền kề) ra toàn không gian, nên tải phân bố đồng đều.

```
partition = hash(key) mod N   // N = số partition
```

**Ưu điểm — phân bố đều, chống hot spot theo key tuần tự.** `hash("user_00001")` và `hash("user_00002")` rơi vào hai chỗ hoàn toàn khác nhau, nên dù ghi các user liên tiếp, tải vẫn trải đều. Dynamo, Cassandra, Riak, Redis Cluster dùng hash (biến thể).

**Nhược điểm — mất range query.** Chính vì băm phá vỡ thứ tự, các key liền kề bị rải khắp nơi. Truy vấn *"từ ngày X đến Y"* giờ phải **hỏi TẤT CẢ partition** (scatter/gather) rồi gộp — đắt và chậm. Cassandra giải quyết một phần bằng **compound key**: phần **partition key** đem băm (để chọn node), phần **clustering key** giữ **sắp xếp trong partition** (để range query *bên trong* một partition vẫn nhanh).

> **⚠️ Cạm bẫy `mod N`:** khi thêm/bớt node, N đổi → **gần như mọi key phải di chuyển** partition (rehash toàn bộ). Đây là lý do các hệ thực tế dùng **consistent hashing** hoặc **số partition cố định lớn** (fixed partitions) thay cho `mod N` thô. Xem 2.7.

### 2.5 Bảng so sánh

| Tiêu chí | Range partitioning | Hash partitioning |
|----------|--------------------|--------------------|
| **Range query** (`BETWEEN`, scan) | ✅ Rất tốt — chạm ít partition, dữ liệu sorted | ❌ Kém — phải scatter/gather mọi partition |
| **Phân bố tải** | ⚠️ Dễ lệch theo phân bố key thật | ✅ Đều nếu hàm băm tốt |
| **Hot spot với key tuần tự** (timestamp) | ❌ Rất dễ — dồn vào 1 partition | ✅ Tránh được (băm rải đều) |
| **Point lookup** (1 key) | ✅ Tốt | ✅ Tốt |
| **Rebalance khi thêm node** | ✅ Chỉ chia đôi partition lớn (dynamic split) | ⚠️ `mod N` thì tệ; consistent hashing thì tốt |
| **Ví dụ hệ dùng** | HBase, Bigtable, MongoDB (ranged) | Cassandra, DynamoDB, Riak, Redis Cluster |

**Kết luận thực dụng:** cần **range query nhiều** (analytics theo thời gian, log, time-series) → range. Cần **ghi phân bố đều, chủ yếu point lookup** (session, user profile theo id) → hash. Nhiều hệ cho **cả hai**: hash ở partition key, sort ở clustering key.

---

### 2.6 Hot spot và skew — vấn đề dai dẳng nhất

**Skew** = tải phân bố **không đều** giữa các partition. **Hot spot** = một partition (hoặc một key) nóng bất thường. Ba nguồn gốc:

1. **Skew do phân bố key** (range): key tuần tự dồn vào một range.
2. **Hot key** (celebrity problem): dù băm đều, **một key duy nhất** quá nóng — bài đăng của người nổi tiếng, sản phẩm flash-sale. Băm không cứu được vì **một key vẫn nằm trên một partition**.
3. **Skew sau rebalance**: chia partition không khéo làm một node ôm nhiều partition nóng.

**Kỹ thuật xử lý:**

- **Đổi partition key**: nếu timestamp gây hot, ghép thêm tiền tố phân tán, ví dụ `bucket = hash(entity) % 16` rồi key = `bucket#timestamp`. Ghi rải ra 16 partition; khi đọc range thì đọc song song 16 bucket rồi gộp.
- **Salting hot key**: tách một hot key thành nhiều **sub-key** `key#0`..`key#9`, ghi chia ngẫu nhiên vào 10 sub-key (giảm áp lực ghi 10 lần), đọc thì cộng dồn 10 sub-key. Đánh đổi: đọc đắt hơn.
- **Dynamic splitting**: hệ tự **chia đôi** một partition khi nó vượt ngưỡng dung lượng/tải (HBase region split, DynamoDB adaptive capacity), rồi chuyển nửa mới sang node khác.
- **Cache trước hot key**: đặt hot key vào cache/CDN để chặn phần lớn đọc trước khi chạm storage.

<svg viewBox="0 0 700 240" role="img" aria-labelledby="hs-t hs-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="hs-t">Hot spot trước và sau khi salting</title>
<desc id="hs-d">Trước khi salting một partition nhận toàn bộ tải, sau khi salting tải chia đều ra nhiều partition</desc>
<text x="170" y="24" text-anchor="middle" font-size="14" fill="currentColor">Trước: hot key dồn 1 partition</text>
<rect x="40" y="120" width="70" height="90" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="75" y="228" text-anchor="middle" font-size="11" fill="currentColor">P0 (nóng)</text>
<rect x="125" y="185" width="70" height="25" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="160" y="228" text-anchor="middle" font-size="11" fill="currentColor">P1</text>
<rect x="210" y="185" width="70" height="25" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="245" y="228" text-anchor="middle" font-size="11" fill="currentColor">P2</text>
<text x="75" y="108" text-anchor="middle" font-size="11" fill="currentColor">100% ghi</text>
<line x1="355" y1="30" x2="355" y2="215" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<text x="530" y="24" text-anchor="middle" font-size="14" fill="currentColor">Sau: salt key#0..#2</text>
<rect x="415" y="150" width="70" height="60" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="450" y="228" text-anchor="middle" font-size="11" fill="currentColor">P0</text>
<rect x="500" y="150" width="70" height="60" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="535" y="228" text-anchor="middle" font-size="11" fill="currentColor">P1</text>
<rect x="585" y="150" width="70" height="60" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="620" y="228" text-anchor="middle" font-size="11" fill="currentColor">P2</text>
<text x="535" y="138" text-anchor="middle" font-size="11" fill="currentColor">~33% mỗi partition</text>
</svg>

---

### 2.7 Rebalancing và consistent hashing (vì sao không dùng `mod N`)

Khi thêm node để scale, ta muốn **di chuyển ít key nhất có thể**. Với `hash(key) mod N`, đổi N từ 3 lên 4 làm **hầu hết** key đổi partition → một cơn bão copy dữ liệu làm ngộp mạng.

Hai cách chuẩn trong thực tế:

- **Fixed number of partitions**: tạo sẵn **rất nhiều** partition (ví dụ 1024) ngay từ đầu, nhiều hơn số node. Mỗi node ôm nhiều partition. Thêm node → chỉ **chuyển vài partition nguyên khối** sang node mới; **không rehash key**. (Elasticsearch, Riak, Couchbase dùng cách này — số shard cố định lúc tạo index.)
- **Consistent hashing**: đặt cả key và node lên một **vòng băm (hash ring)**. Key thuộc về node đầu tiên gặp khi đi theo chiều kim đồng hồ. Thêm/bớt node chỉ ảnh hưởng **các key giữa node đó và node kề trước** — khoảng `K/N` key phải chuyển, phần còn lại đứng yên. Dùng **virtual nodes** (mỗi node vật lý = nhiều điểm trên vòng) để tải phân bố đều hơn. (Dynamo, Cassandra, Redis Cluster ở dạng biến thể slot.)

> **Redis Cluster** dùng **16384 hash slot** cố định: `slot = CRC16(key) mod 16384`. Node được gán các dải slot; thêm node là **di chuyển slot** giữa các node, dữ liệu ngoài slot đang chuyển không bị đụng.

---

### 2.8 Secondary index: local vs global

Partition thường theo **primary key**. Nhưng ứng dụng hay hỏi theo **thuộc tính khác** — "tìm mọi xe **màu đỏ**", "mọi đơn hàng **status = PENDING**". Đó là **secondary index**, và có hai cách đặt nó trong hệ đã partition. Đây là một trong những đánh đổi khó nhất.

**a) Local index (document-partitioned).** Mỗi partition tự giữ index **chỉ cho dữ liệu của chính nó**. Index "color" trên P0 chỉ trỏ tới các document nằm trên P0.
- **Ghi rẻ**: thêm/sửa một document chỉ đụng index **cùng partition** đó — một thao tác cục bộ, một node.
- **Đọc đắt (scatter/gather)**: hỏi "mọi xe đỏ" phải gửi query tới **TẤT CẢ** partition, mỗi nơi tra local index, rồi **gộp** kết quả. Latency = partition chậm nhất.
- Dùng bởi: Elasticsearch, MongoDB, Cassandra (secondary index), DynamoDB **LSI**.

**b) Global index (term-partitioned).** Index được **partition riêng theo giá trị term** (không theo document). Toàn bộ entry "color=red" nằm **cùng một partition index** (có thể ở node khác với document gốc).
- **Đọc rẻ**: "mọi xe đỏ" đi thẳng tới **đúng một** partition index chứa term "red" — không scatter.
- **Ghi đắt & phức tạp**: một document có nhiều thuộc tính (color, make, year) → cập nhật đụng **nhiều partition index khác nhau**, thường phải **async** nên index có thể **trễ (eventually consistent)** so với document.
- Dùng bởi: DynamoDB **GSI** (global secondary index), Riak (search), một số search engine.

| Tiêu chí | Local (document-partitioned) | Global (term-partitioned) |
|----------|------------------------------|----------------------------|
| Index chia theo | Cùng partition với document | Theo giá trị term (riêng) |
| **Đường ghi** | ✅ Rẻ, 1 partition, đồng bộ | ❌ Đắt, nhiều partition, thường async |
| **Đường đọc** | ❌ Scatter/gather mọi partition | ✅ Trỏ thẳng 1 partition |
| Tính nhất quán index | Dễ giữ đồng bộ | Thường eventually consistent |
| Ví dụ | ES, Cassandra, DynamoDB LSI | DynamoDB GSI |

> **Nguyên tắc chọn:** ghi nhiều / đọc theo thuộc tính lẻ tẻ → **local**. Đọc theo thuộc tính rất thường xuyên và cần nhanh, chấp nhận index trễ → **global**.

---

### 2.9 Partitioning KẾT HỢP replication

Partitioning và replication **không loại trừ nhau — luôn dùng CHUNG** trong hệ thực tế. Partition để **scale**, replication để **chịu lỗi**: nếu một node chết mà partition của nó không có bản sao thì mất luôn phần dữ liệu đó.

Cách ghép chuẩn: chia dataset thành N partition; **mỗi partition lại có R replica** đặt trên các node khác nhau. Mỗi partition có một **leader** (nhận ghi) và các **follower**. Điểm tinh tế: **leader của các partition khác nhau nằm rải trên nhiều node** để tải ghi trải đều — node A làm leader cho P0 nhưng làm follower cho P1, P2.

<svg viewBox="0 0 700 260" role="img" aria-labelledby="pr-t pr-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="pr-t">Partition kết hợp replication trên 3 node</title>
<desc id="pr-d">Ba partition mỗi partition có một leader và hai follower, leader rải đều trên ba node</desc>
<rect x="30" y="60" width="180" height="170" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="50" text-anchor="middle" font-size="13" fill="currentColor">Node A</text>
<rect x="255" y="60" width="180" height="170" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="345" y="50" text-anchor="middle" font-size="13" fill="currentColor">Node B</text>
<rect x="480" y="60" width="180" height="170" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="570" y="50" text-anchor="middle" font-size="13" fill="currentColor">Node C</text>
<rect x="50" y="80" width="140" height="40" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="104" text-anchor="middle" font-size="11" fill="currentColor">P0 leader</text>
<rect x="275" y="80" width="140" height="40" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="345" y="104" text-anchor="middle" font-size="11" fill="currentColor">P0 follower</text>
<rect x="500" y="80" width="140" height="40" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="570" y="104" text-anchor="middle" font-size="11" fill="currentColor">P0 follower</text>
<rect x="50" y="128" width="140" height="40" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="152" text-anchor="middle" font-size="11" fill="currentColor">P1 follower</text>
<rect x="275" y="128" width="140" height="40" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="345" y="152" text-anchor="middle" font-size="11" fill="currentColor">P1 leader</text>
<rect x="500" y="128" width="140" height="40" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="570" y="152" text-anchor="middle" font-size="11" fill="currentColor">P1 follower</text>
<rect x="50" y="176" width="140" height="40" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="200" text-anchor="middle" font-size="11" fill="currentColor">P2 follower</text>
<rect x="275" y="176" width="140" height="40" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="345" y="200" text-anchor="middle" font-size="11" fill="currentColor">P2 follower</text>
<rect x="500" y="176" width="140" height="40" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="570" y="200" text-anchor="middle" font-size="11" fill="currentColor">P2 leader</text>
</svg>

Nhìn sơ đồ: 3 partition × 3 replica trên 3 node. Mỗi node là **leader của một partition** và **follower của hai partition kia** → tải ghi cân bằng. Node A chết: P0 mất leader (một follower ở B hoặc C được **bầu lên leader**), còn P1/P2 A chỉ là follower nên vẫn đủ bản sao. Đây chính là mô hình của **Kafka** (partition + replica, mỗi partition một leader), **Cassandra**, **Elasticsearch**.

### 2.10 Định tuyến request — ai biết key nào ở đâu?

Client gửi `GET key=user_42` — request phải tới đúng node giữ partition đó. Ba kiến trúc:
1. **Client-aware / partition-aware driver**: client tự tính partition (biết ánh xạ slot→node) rồi gọi thẳng. Redis Cluster, Cassandra driver làm vậy — nhanh nhất, ít hop.
2. **Routing tier / proxy**: một tầng định tuyến (mongos của MongoDB, proxy) nhận mọi request rồi chuyển tiếp. Client đơn giản, thêm một hop.
3. **Any node forwards**: gửi tới node bất kỳ, node đó chuyển tiếp nếu không giữ key (Cassandra coordinator, Redis `MOVED` redirect).

Ánh xạ partition→node thay đổi khi rebalance, nên cần một **nguồn sự thật** về topology — thường là một dịch vụ **coordination** như **ZooKeeper / etcd** (hoặc gossip protocol như Cassandra) để mọi node/driver biết bố cục hiện tại.

---

## 3. Ví dụ thực tế & con số

**Kafka topic 12 partition, replication factor 3.** Một topic `orders` có 12 partition; message routing bằng `hash(key) mod 12` (key = `order_id`). 12 partition cho phép **12 consumer** trong một consumer group chạy song song — throughput gấp ~12 lần một partition. RF=3 nghĩa mỗi partition có 3 bản trên 3 broker; chịu được mất 2 broker (với `min.insync.replicas` phù hợp). Nếu chọn key kém (ví dụ 90% message cùng một `customer_id` VIP) → **partition đó nóng**, một consumer nghẽn còn 11 consumer rảnh — đúng bài toán hot key ở 2.6.

**DynamoDB.** Chia dữ liệu theo **partition key** (hash). Nếu bạn để partition key là ngày `2026-07-24` và ghi log dồn vào ngày hiện tại → hot partition, bị **throttle** dù tổng capacity thừa. Cách khắc phục kinh điển: thêm **suffix ngẫu nhiên** `2026-07-24#7` (write sharding), hoặc dùng partition key có **cardinality cao** (userId). Truy vấn theo thuộc tính khác → tạo **GSI** (global, term-partitioned): đọc nhanh nhưng ghi tốn thêm capacity và index trễ.

**Cassandra time-series.** Bảng đo sensor: partition key = `sensor_id`, clustering key = `timestamp DESC`. Băm theo `sensor_id` rải đều các sensor ra cluster (không hot theo thời gian), nhưng **trong một sensor** dữ liệu vẫn **sorted theo thời gian** → range query "7 ngày gần nhất của sensor X" nhanh. Đây là ví dụ đẹp của việc **kết hợp hash (chọn node) + range (sort trong partition)**.

---

## 4. Tóm tắt
- **Partition/shard** = chia dữ liệu theo chiều ngang để **vượt trần một máy** về dung lượng và throughput ghi; khác với **replication** (nhân bản để chịu lỗi). Thực tế luôn **ghép cả hai**.
- **Range partitioning**: khoảng key liên tục → **range query rất tốt**, nhưng **dễ hot spot** với key tuần tự (timestamp).
- **Hash partitioning**: băm rải đều → **phân bố tải tốt, chống hot spot tuần tự**, nhưng **mất range query** (phải scatter/gather). Compound key (hash partition + sort clustering) lấy được cả hai.
- Tránh `hash mod N` thô; dùng **fixed partitions** hoặc **consistent hashing** để rebalance chuyển ít dữ liệu.
- **Hot key** (celebrity) băm không cứu được — xử lý bằng **salting, split động, cache**.
- **Secondary index**: **local** = ghi rẻ / đọc scatter; **global** = đọc rẻ / ghi đắt & thường trễ. Chọn theo tỉ lệ đọc-ghi.
- Định tuyến qua **partition-aware driver / proxy / forward**, với topology giữ ở **ZooKeeper/etcd** hoặc gossip.

> **Bài tiếp theo (Bài 11):** khi một partition có nhiều replica, làm sao các replica **đồng ý** thứ tự ghi và bầu leader khi leader chết — bước vào **consensus & Raft**.
