# Thiết kế Key-Value Store phân tán

> Bài này là case study "nặng" nhất của chương: thiết kế lại một hệ như **Amazon Dynamo / Apache Cassandra**. Cái khó không nằm ở `get`/`put` — một cái hash table 20 dòng code làm được. Cái khó nằm ở chỗ: khi bạn nhân bản dữ liệu lên nhiều máy để không bao giờ chết, bạn **tự tay tạo ra khả năng hai bản sao nói hai điều khác nhau**. Toàn bộ phần còn lại của bài — quorum, vector clock, gossip, hinted handoff, Merkle tree — chỉ là các câu trả lời khác nhau cho đúng một câu hỏi: *"khi các bản sao bất đồng, ai đúng và ai sửa?"*

Bài này đáng học kể cả khi bạn không bao giờ tự viết database: DynamoDB, Cassandra, Redis Cluster, ScyllaDB và cả tầng metadata của S3 đều là hiện thân của những đánh đổi ở đây. Hiểu nó, bạn sẽ đọc dòng chữ "eventually consistent read" trên console DynamoDB và biết chính xác nó đang bán cho bạn cái gì với giá nào.

---

## Bước 1: Làm rõ yêu cầu

Câu hỏi đầu tiên luôn là *"key-value store loại nào?"* — phổ của nó rất rộng, từ Redis (in-memory, một node) tới DynamoDB (multi-region, petabyte). Chốt scope trước khi vẽ.

**Functional**
- `put(key, value)` — ghi/đè một cặp key-value.
- `get(key)` — đọc giá trị theo key.
- Không query theo giá trị, không join, không transaction đa key. Chỉ **point lookup theo khoá** — chính việc chủ động vứt bỏ khả năng query là thứ đổi lấy khả năng phân tán.

**Non-functional** — mỗi dòng dưới đây sau này sẽ "đẻ" ra một component:

| Yêu cầu | Con số mục tiêu | Nó ép ta làm gì |
|---|---|---|
| Kích thước cặp KV nhỏ | value < 10 KB | Cho phép giữ nhiều thứ trong memory, network payload nhỏ |
| Big data | hàng trăm TB → PB | **Bắt buộc partition** — một node không chứa nổi |
| High availability | 99.99%+, luôn ghi được | Replication + chấp nhận đọc cũ (AP) |
| Low latency | p99 đọc < 10 ms | Cache in-memory, tránh coordinator nhiều hop |
| Scalability tự động | thêm/bớt node không downtime | **Consistent hashing** |
| Tunable consistency | app tự chọn mạnh/yếu | **Quorum N/W/R** cấu hình được |

**Giả định chốt** (nói to trong phỏng vấn):
1. Value nhỏ (< 10 KB) — nếu value là video 1 GB thì bài này thành bài *object store*, khác hẳn.
2. Không cần secondary index, không cần range scan trên key tuỳ ý.
3. Hệ chạy trong 1 công ty, nhiều datacenter, mạng giữa các node là mạng riêng (không phải Internet công cộng).
4. **Availability quan trọng hơn consistency tuyệt đối** — đây là giả định định hướng cả bài, mục CAP sẽ biện luận vì sao.

---

## Bước 2: Back-of-envelope estimation

Ước lượng không phải để khoe số, mà để trả lời 3 câu: *cần bao nhiêu node? mạng có nghẽn không? memory có đủ không?*

```
Giả định:
  100 tỉ cặp KV · trung bình 1.1 KB/cặp (key 40 B + value 1 KB + meta 60 B)
  500,000 rps đọc · 100,000 wps ghi · replication N = 3

Storage:
  Thô 1 bản  : 10^11 × 1.1 KB ≈ 110 TB
  Sau ×3     : 330 TB
  + overhead LSM (SSTable chưa compact, commit log, bloom filter, index) ~30%
             ≈ 430 TB → làm tròn ~450 TB đĩa thực

Số node:
  Node NVMe 4 TB hữu dụng (đã chừa 40% headroom cho compaction!)
  450 / 4 ≈ 115 → chốt ~128 node

QPS mỗi node:
  Đọc: 500K × R=2 = 1,000K node-read / 128 ≈ 8,000 read/s  → ổn với NVMe + bloom filter
  Ghi: 100K × N=3 =   300K node-write / 128 ≈ 2,300 write/s → LSM nuốt tốt (ghi tuần tự)

Bandwidth:
  Ghi vào cluster : 100K × 1.1 KB ≈ 110 MB/s
  Nhân bản nội bộ : ×3 ≈ 330 MB/s trên mạng nội bộ   ← đáng lưu ý
  Đọc ra          : 500K × 1.1 KB ≈ 550 MB/s ≈ 4.4 Gbps
  → mạng 10 Gbps là đủ, 1 Gbps thì chết.

Cache: 20% nóng = 22 TB, quá lớn để cache hết.
  Thực tế cache ~1% nóng nhất ≈ 1.1 TB / 128 node ≈ 9 GB/node
  → node 64 GB RAM (memtable + cache + heap) là hợp lý.
```

Ba con số dẫn tới ba quyết định lớn:

1. **110 TB > đĩa một máy** → bắt buộc partition. Không có lối thoát nào khác — đây là lý do consistent hashing xuất hiện.
2. **330 MB/s traffic nhân bản nội bộ** → replication không miễn phí; nó ăn băng thông và ăn latency ghi. Vì vậy ta muốn **quorum** (chờ W bản, không chờ hết N).
3. **Cache không phủ hết dữ liệu** → phần lớn read sẽ chạm đĩa → cấu trúc lưu trữ trên đĩa (LSM, bloom filter) là chuyện sống còn, không phải chi tiết nhỏ.

> **Nguyên tắc**: Chừa **40% đĩa trống** trên node LSM. Compaction cần chỗ ghi file mới trước khi xoá file cũ; đĩa đầy 90% là kịch bản kinh điển khiến cả cluster Cassandra "đông cứng" vì không compact được.


## Bước 3: API design

Cố tình tối giản — đây là điểm mạnh chứ không phải thiếu sót.

```
put(key: string, value: bytes, opts?) -> { version }
    opts: { W?: int, ttl?: seconds, context?: VectorClock }

get(key: string, opts?) -> { value(s), context }
    opts: { R?: int, consistency?: "ONE" | "QUORUM" | "ALL" }

delete(key: string, opts?) -> ok       # thực chất là ghi một "tombstone"
```

Ba chi tiết đáng nói ngay vì chúng lộ ra bạn hiểu hệ phân tán:

- **`context`** là "biên nhận version" (vector clock) mà client nhận từ `get` và phải trả lại khi `put`. Nó cho phép hệ phân biệt "ghi đè có ý thức" với "ghi đè mù".
- **`get` có thể trả về NHIỀU value.** Nghe vô lý với một KV store, nhưng đó là sự thật của hệ AP: khi hai client ghi đồng thời lên hai bản sao khác nhau, hệ **không có quyền tự chọn** cái nào đúng. Nó trả cả hai và để application quyết định (Dynamo gọi là *sibling*).
- **`delete` không xoá ngay.** Nếu xoá thật, một replica đang offline lúc đó sẽ "hồi sinh" bản ghi khi nó quay lại (bản ghi cũ của nó mới hơn... hư vô). Nên xoá = ghi tombstone có version, và chỉ dọn sạch sau `gc_grace_period`.

> **Bẫy kinh điển**: Quên tombstone → **zombie data**. Bạn xoá một record, ba tháng sau nó tự quay lại vì một node offline lâu ngày được đưa lại vào cluster. Đây là bug thật, xảy ra thường xuyên trên Cassandra khi node offline lâu hơn `gc_grace_seconds` (mặc định 10 ngày) rồi được join lại.

---

## Bước 4: Bắt đầu từ một node — và vì sao nó vỡ

Đừng nhảy ngay vào phân tán. Người phỏng vấn muốn thấy bạn **đi từ đơn giản và bị chính giới hạn đẩy tới phức tạp**.

**Single-node KV store** tầm thường đến mức buồn cười: một **hash table** trong memory, key → value, `get`/`put` đều O(1), latency micro-giây. Đây chính là Redis/Memcached ở dạng thuần.

Khi dữ liệu vượt RAM, có hai tối ưu quen thuộc trước khi phải phân tán:

| Tối ưu | Cách làm | Mua được gì | Trả giá gì |
|---|---|---|---|
| Nén (compression) | LZ4/Snappy trên value | 2–4× dung lượng | CPU mỗi lần đọc/ghi |
| Tách nóng/nguội | Nóng trong RAM, nguội xuống đĩa | Chứa được nhiều hơn RAM | Đọc dữ liệu nguội chậm đi ~100–1000× |

Nhưng cả hai chỉ **hoãn** vấn đề. Với 110 TB, nén 4× vẫn còn ~28 TB — không máy thường nào vừa chứa nổi vừa phục vụ 500K rps. Và quan trọng hơn dung lượng: **một node là một single point of failure**; máy chết là service chết, không thể chấp nhận với mục tiêu 99.99%.

Hai lý do ép ta phân tán, theo đúng thứ tự quan trọng:
1. **Availability** — phải có bản sao, vì máy chắc chắn sẽ chết.
2. **Capacity/throughput** — phải chia dữ liệu, vì một máy không đủ đĩa và không đủ IOPS.

Và khoảnh khắc ta có nhiều máy nói chuyện qua mạng, ta bước thẳng vào vùng cai trị của CAP.

---

## Bước 5: CAP theorem — và ta chọn gì

**CAP** nói một hệ lưu trữ phân tán không thể đồng thời đảm bảo: **C — Consistency** (mọi client đọc ra cùng giá trị mới nhất), **A — Availability** (mọi request đều nhận phản hồi không lỗi, kể cả khi một số node chết), **P — Partition tolerance** (vẫn hoạt động khi mạng giữa các node bị chia cắt).

Điểm rất nhiều người hiểu sai: **CAP không phải "chọn 2 trong 3" như menu**. Trong thực tế **P không phải lựa chọn** — mạng *sẽ* đứt: switch hỏng, cáp bị cắt, một AZ mất kết nối, hay GC pause 30 giây khiến node trông như đã chết. Vậy CAP thật ra là:

> **Khi (không phải "nếu") mạng bị chia cắt, bạn hi sinh C hay hi sinh A?**

Hệ **CA** chỉ tồn tại trên slide: một database single-node là CA, nhưng đó không phải hệ phân tán.

```
Bình thường:                       Khi mạng đứt:
  ┌────┐  ┌────┐  ┌────┐             ┌────┐  ┌────┐  ╎  ┌────┐
  │ n1 │──│ n2 │──│ n3 │             │ n1 │──│ n2 │  ╎  │ n3 │
  └────┘  └────┘  └────┘             └────┘  └────┘  ╎  └────┘
   ghi lan truyền đủ 3 bên            client A ghi vào n1
                                      client B đọc từ n3 → thấy gì?
```

- **Chọn CP**: n1/n2 **từ chối ghi** vì không đủ bản sao xác nhận, n3 **từ chối đọc** vì biết mình có thể đang cũ. Không ai đọc sai — nhưng một phần hệ **ngừng phục vụ**. Đây là lựa chọn của ngân hàng, sổ cái, quản lý tồn kho: thà báo lỗi còn hơn trừ tiền hai lần.
- **Chọn AP**: n1/n2 **vẫn nhận ghi**, n3 **vẫn trả đọc** dù có thể cũ; khi mạng nối lại thì **đồng bộ ngược** (anti-entropy) để hội tụ. Đây là lựa chọn của shopping cart, feed, session, telemetry: thà hiển thị hơi cũ còn hơn trắng trang.

**Bài này chọn AP**, vì yêu cầu non-functional đã nói "high availability, luôn ghi được". Amazon rút ra bài học này từ chính giỏ hàng của họ — *"giỏ hàng không thêm được món là mất tiền ngay; giỏ hàng hiển thị hơi cũ thì hoà giải sau được"*. Đó là nguồn gốc của Dynamo.

> **Nguyên tắc trả lời phỏng vấn**: Đừng nói "tôi chọn AP vì AP tốt hơn". Hãy nói: *"Với use case này, chi phí của việc từ chối ghi cao hơn chi phí đọc phải dữ liệu cũ 200 ms, nên tôi chọn AP — và tôi sẽ làm consistency tunable để app nào cần thì mua lại bằng quorum."*


## High-level design

Mọi node đều giống nhau — **không master, không single point of failure**. Đây là khác biệt lớn so với kiến trúc leader-follower (MySQL replica, MongoDB replica set).

```
                    ┌──────────────────────────────────┐
   client ─ get/put ▶│  bất kỳ node nào → COORDINATOR   │
                    └────────────────┬─────────────────┘
                                     │ tra ring (consistent hashing)
                                     │ → key "cart:9931" thuộc n4
                                     │ → N=3 replica: n4, n5, n6
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
                 ┌─────┐          ┌─────┐          ┌─────┐
                 │ n4  │          │ n5  │          │ n6  │
                 └─────┘          └─────┘          └─────┘
                 chờ W ack (vd W=2) → trả OK cho client
                 bản thứ 3 lan truyền nền (hoặc bù sau bằng hinted handoff)

   Ring toàn cục (consistent hashing, có virtual node):
        n1 ── n2 ── n3 ── n4 ── n5 ── n6 ── n7 ── n8 ─┐
        └──────────────────────────────────────────────┘
        key hash lên vòng → đi thuận chiều kim đồng hồ
        → node đầu tiên gặp = chủ sở hữu, N-1 node kế tiếp = replica
```

Mỗi node giữ ba vai trò cùng lúc, và đó là thứ làm hệ đối xứng hoàn toàn: **coordinator** khi nhận request từ client (client gọi node gần nhất cũng được), **replica** cho các khoảng key nó sở hữu, và **thành viên gossip** — tự biết ai sống ai chết, không cần hỏi ai.

Hệ quả thực tế: **thêm node = khởi động node mới, nó gossip vào cluster, nhận phần ring của mình, kéo dữ liệu về.** Không reconfig, không failover master. Đó chính là "automatic scaling" trong yêu cầu ban đầu.


## Deep dive 1 — Data partition bằng consistent hashing

Với 110 TB dữ liệu, câu hỏi "key này nằm ở node nào?" phải trả lời được **mà không cần tra bảng tập trung** (bảng tập trung = single point of failure + nút cổ chai).

Cách ngây thơ `node = hash(key) % N` hỏng ngay khi N đổi: thêm một node từ 8 lên 9 thì gần như **toàn bộ** key đổi chỗ — mỗi lần scale phải di chuyển ~100% của 110 TB. Không khả thi.

**Consistent hashing** giải bài đó: hash cả key lẫn node lên cùng một vòng tròn, key thuộc node đầu tiên gặp khi đi thuận chiều kim đồng hồ. Thêm/bớt một node chỉ ảnh hưởng các key nằm giữa nó và node liền trước — trung bình `1/N` dữ liệu phải dời.

Cơ chế chi tiết (vòng băm, virtual node, rebalance, hot-spot) đã có riêng một bài: **[Consistent Hashing](/courses/SYSTEM-DESIGN/learn/sd-09-consistent-hashing)**. Ba điều cần nhớ lại ở đây vì chúng ảnh hưởng trực tiếp tới replication bên dưới:

| Đặc tính | Nó cho KV store điều gì |
|---|---|
| Thêm/bớt node chỉ dời ~1/N dữ liệu | Scale ra/vào online, không downtime, không dồn mạng |
| **Virtual node** (mỗi node vật lý = nhiều điểm trên ring) | Phân bố đều hơn; và cho phép **node mạnh nhận nhiều vnode hơn** → xử lý được cluster không đồng nhất (heterogeneity) |
| Vị trí tính bằng hàm băm, không cần tra bảng | Mọi node tự tính được chủ sở hữu → không có metadata server trung tâm |

> **Bẫy khi ghép consistent hashing với replication**: nếu bạn lấy "N node kế tiếp trên ring" một cách máy móc, rất có thể vài vnode trong số đó **thuộc cùng một máy vật lý** (vì một máy có nhiều vnode rải khắp vòng). Khi đó N=3 nhưng thực chất chỉ có 2 máy giữ dữ liệu — mất 1 máy là mất 2/3 bản sao. Thuật toán chọn replica phải **bỏ qua vnode trùng máy, và ưu tiên trải sang rack/AZ khác**.

---

## Deep dive 2 — Replication và quorum

### Chọn replica ở đâu

Với mỗi key, đi thuận chiều kim đồng hồ từ vị trí của key và chọn **N node vật lý *khác nhau* đầu tiên**. Nhóm này gọi là **preference list** của key. N thường là 3 — đủ chịu mất 1 node mà vẫn còn quorum, chi phí lưu trữ chỉ 3×.

Nhưng "3 node khác nhau" chưa đủ: nếu cả 3 nằm cùng một rack/AZ và chỗ đó mất điện thì mất trắng. Chiến lược thật phải **rack-aware / AZ-aware** — ép 3 replica rơi vào 3 AZ khác nhau (Cassandra: `NetworkTopologyStrategy`; DynamoDB làm sẵn điều này).

### Quorum — trái tim của tunable consistency

Ba tham số, và chúng là **núm vặn của application**, không phải hằng số của hệ:

- **N** — số bản sao của mỗi key.
- **W** — số bản sao phải **ack ghi** thì coordinator mới trả OK.
- **R** — số bản sao phải **trả lời đọc** thì coordinator mới trả kết quả.

**Công thức vàng: `W + R > N` ⇒ đọc luôn thấy ghi mới nhất.** Lý do là nguyên lý chuồng bồ câu:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 600" role="img" aria-labelledby="sd10a-t sd10a-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="sd10a-t">Quorum N=3: tập ghi và tập đọc giao nhau khi W+R lớn hơn N</title>
<desc id="sd10a-d">Trên: N=3, W=2, R=2: ghi vào A và B; ba cách chọn 2 node để đọc đều chứa ít nhất một node đã có giá trị mới. Dưới: N=3, W=1, R=1: ghi vào A, đọc ở C, hai tập không giao nhau nên đọc ra giá trị cũ.</desc>
<rect x="10" y="10" width="480" height="330" rx="10" fill="#10b981" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.18"/>
<text x="250" y="38" font-size="15" text-anchor="middle" font-weight="700" fill="currentColor">W=2, R=2:  W+R = 4 &gt; 3</text>
<text x="24" y="85" font-size="14" font-weight="600" fill="currentColor">Ghi</text>
<circle cx="140" cy="80" r="17" fill="#10b981" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.4"/>
<text x="140" y="85" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">A</text>
<circle cx="195" cy="80" r="17" fill="#10b981" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.4"/>
<text x="195" y="85" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">B</text>
<circle cx="250" cy="80" r="17" fill="#64748b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
<text x="250" y="85" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">C</text>
<text x="290" y="85" font-size="14" opacity="0.85" fill="currentColor">A, B có v2</text>
<line x1="24" y1="112" x2="476" y2="112" stroke="currentColor" stroke-opacity="0.18"/>
<text x="24" y="153" font-size="14" font-weight="600" fill="currentColor">Đọc 1</text>
<rect x="117" y="125" width="46" height="46" rx="11" fill="none" stroke="#3b82f6" stroke-width="2.2" stroke-dasharray="6 4"/>
<rect x="172" y="125" width="46" height="46" rx="11" fill="none" stroke="#3b82f6" stroke-width="2.2" stroke-dasharray="6 4"/>
<circle cx="140" cy="148" r="17" fill="#10b981" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.4"/>
<text x="140" y="153" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">A</text>
<circle cx="195" cy="148" r="17" fill="#10b981" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.4"/>
<text x="195" y="153" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">B</text>
<circle cx="250" cy="148" r="17" fill="#64748b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
<text x="250" y="153" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">C</text>
<text x="290" y="153" font-size="14" font-weight="700" fill="currentColor">giao {A,B} ✓</text>
<text x="24" y="213" font-size="14" font-weight="600" fill="currentColor">Đọc 2</text>
<rect x="117" y="185" width="46" height="46" rx="11" fill="none" stroke="#3b82f6" stroke-width="2.2" stroke-dasharray="6 4"/>
<rect x="227" y="185" width="46" height="46" rx="11" fill="none" stroke="#3b82f6" stroke-width="2.2" stroke-dasharray="6 4"/>
<circle cx="140" cy="208" r="17" fill="#10b981" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.4"/>
<text x="140" y="213" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">A</text>
<circle cx="195" cy="208" r="17" fill="#10b981" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.4"/>
<text x="195" y="213" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">B</text>
<circle cx="250" cy="208" r="17" fill="#64748b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
<text x="250" y="213" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">C</text>
<text x="290" y="213" font-size="14" font-weight="700" fill="currentColor">giao {A} ✓</text>
<text x="24" y="273" font-size="14" font-weight="600" fill="currentColor">Đọc 3</text>
<rect x="172" y="245" width="46" height="46" rx="11" fill="none" stroke="#3b82f6" stroke-width="2.2" stroke-dasharray="6 4"/>
<rect x="227" y="245" width="46" height="46" rx="11" fill="none" stroke="#3b82f6" stroke-width="2.2" stroke-dasharray="6 4"/>
<circle cx="140" cy="268" r="17" fill="#10b981" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.4"/>
<text x="140" y="273" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">A</text>
<circle cx="195" cy="268" r="17" fill="#10b981" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.4"/>
<text x="195" y="273" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">B</text>
<circle cx="250" cy="268" r="17" fill="#64748b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
<text x="250" y="273" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">C</text>
<text x="290" y="273" font-size="14" font-weight="700" fill="currentColor">giao {B} ✓</text>
<text x="250" y="322" font-size="13.5" text-anchor="middle" opacity="0.85" fill="currentColor">Mọi tập đọc 2 node đều chạm ≥1 node có v2</text>
<rect x="10" y="352" width="480" height="200" rx="10" fill="#f43f5e" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.18"/>
<text x="250" y="380" font-size="15" text-anchor="middle" font-weight="700" fill="currentColor">W=1, R=1:  W+R = 2 ≤ 3</text>
<text x="24" y="427" font-size="14" font-weight="600" fill="currentColor">Ghi</text>
<circle cx="140" cy="422" r="17" fill="#10b981" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.4"/>
<text x="140" y="427" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">A</text>
<circle cx="195" cy="422" r="17" fill="#64748b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
<text x="195" y="427" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">B</text>
<circle cx="250" cy="422" r="17" fill="#64748b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
<text x="250" y="427" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">C</text>
<text x="290" y="427" font-size="14" opacity="0.85" fill="currentColor">chỉ A có v2</text>
<line x1="24" y1="454" x2="476" y2="454" stroke="currentColor" stroke-opacity="0.18"/>
<text x="24" y="495" font-size="14" font-weight="600" fill="currentColor">Đọc</text>
<rect x="227" y="467" width="46" height="46" rx="11" fill="none" stroke="#3b82f6" stroke-width="2.2" stroke-dasharray="6 4"/>
<circle cx="140" cy="490" r="17" fill="#10b981" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.4"/>
<text x="140" y="495" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">A</text>
<circle cx="195" cy="490" r="17" fill="#64748b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
<text x="195" y="495" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">B</text>
<circle cx="250" cy="490" r="17" fill="#64748b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
<text x="250" y="495" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">C</text>
<text x="290" y="495" font-size="14" font-weight="700" fill="currentColor">giao = ∅ ✗</text>
<text x="250" y="538" font-size="13.5" text-anchor="middle" opacity="0.85" fill="currentColor">C vẫn giữ v1: đọc ra giá trị cũ</text>
<circle cx="26" cy="580" r="8" fill="#10b981" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.4"/>
<text x="40" y="585" font-size="13" fill="currentColor">có v2 (mới)</text>
<circle cx="186" cy="580" r="8" fill="#64748b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
<text x="200" y="585" font-size="13" fill="currentColor">còn v1 (cũ)</text>
<rect x="336" y="571" width="22" height="18" rx="5" fill="none" stroke="#3b82f6" stroke-width="2" stroke-dasharray="5 3"/>
<text x="366" y="585" font-size="13" fill="currentColor">tập đọc R</text>
</svg>

`W + R = 4 > 3 = N` ⇒ tập ghi và tập đọc **bắt buộc chồng nhau** ⇒ luôn có ≥1 node giữ giá trị mới nhất ⇒ coordinator so version, chọn cái mới → đọc đúng.

Ngược lại nếu `W + R ≤ N` (vd W=1, R=1, N=3), tập ghi có thể là `{A}` còn tập đọc là `{C}` — **không giao nhau** — client đọc ra dữ liệu cũ. Không sai; chỉ là bạn đã cố tình mua tốc độ bằng độ tươi.

| Cấu hình | Ý nghĩa | Chịu lỗi | Dùng khi |
|---|---|---|---|
| `N=3, W=1, R=1` | Nhanh nhất, eventual | Tốt nhất | Telemetry, log, counter gần đúng |
| `N=3, W=3, R=1` | Ghi chậm, đọc cực nhanh | **Mất 1 node là không ghi được** | Read-heavy cực đoan, ghi hiếm |
| `N=3, W=1, R=3` | Ghi cực nhanh, đọc chậm | Mất 1 node là không đọc được | Write-heavy, ingest |
| **`N=3, W=2, R=2`** | **Cân bằng, strong consistency** | **Chịu mất 1 node cả đọc lẫn ghi** | **Mặc định nên nói trong phỏng vấn** |
| `N=5, W=3, R=3` | Bền hơn, đắt hơn | Chịu mất 2 node | Dữ liệu quan trọng, multi-AZ rộng |

> **Nguyên tắc**: `N=3, W=2, R=2` là điểm duy nhất vừa thoả `W+R>N` vừa **chịu mất một node ở CẢ hai chiều**. `W=3,R=1` cũng thoả công thức nhưng mất 1 node là tê liệt ghi — nghe "consistent" mà thực chất kém available hơn nhiều.

Một chi tiết tinh tế: **latency quorum bị chi phối bởi node chậm thứ W**, không phải node trung bình. Với W=2/N=3 bạn chờ node nhanh thứ nhì — điều này thực ra *giảm* đuôi latency so với chờ cả 3, vì bạn được phép bỏ qua node đang GC pause.

### Consistency models

"Consistency" không phải công tắc bật/tắt mà là một phổ:

| Model | Đảm bảo | Ví dụ thực tế |
|---|---|---|
| **Strong** | Mọi đọc trả về kết quả của ghi mới nhất đã commit | DynamoDB `ConsistentRead=true`; quorum `W+R>N`; Spanner |
| **Weak** | Không đảm bảo gì về việc đọc thấy ghi vừa rồi | Cache không invalidate; `R=1` ngay sau khi ghi node khác |
| **Eventual** | Ngừng ghi đủ lâu thì **mọi** bản sao hội tụ | DynamoDB read mặc định; Cassandra `ONE` |
| **Causal** | Thao tác có **quan hệ nhân quả** được thấy đúng thứ tự; thao tác độc lập thì không ràng buộc | Comment phải xuất hiện sau post gốc — vector clock là công cụ bắt quan hệ này |
| **Read-your-writes** | Client luôn thấy ghi *của chính mình* | Sticky routing; client mang theo version token |

Causal đáng nói kỹ vì nó là điểm ngọt: strong thì đắt (đồng thuận toàn cục), eventual thì **có thể hiển thị nghịch lý** (thấy câu trả lời trước câu hỏi). Causal chỉ ép thứ tự ở nơi thực sự có nhân quả — và **vector clock chính là cách đo quan hệ nhân quả đó**.

> **Bẫy**: "Eventual" nghe hiền nhưng không có cam kết thời gian. Production thường hội tụ trong **mili-giây tới vài trăm mili-giây**, nhưng có thể là **hàng giờ** nếu một replica offline và phải chờ anti-entropy. Đừng thiết kế luồng nghiệp vụ dựa vào giả định "chắc là nhanh thôi".


## Deep dive 3 — Giải quyết bất đồng bằng vector clock

Replication mua cho ta availability, nhưng nó **tạo ra** vấn đề: hai client ghi cùng lúc vào hai replica khác nhau (đang bị partition), và khi mạng nối lại ta có **hai giá trị đều "hợp lệ"**. Ai đúng?

### Vì sao "lấy cái mới nhất theo timestamp" là cái bẫy

Phản xạ đầu tiên là **Last Write Wins (LWW)**: gắn timestamp, cái nào lớn hơn thì thắng. Nhưng **đồng hồ các máy không khớp nhau** — clock skew vài chục ms đến vài giây là bình thường (NTP trôi, VM bị pause), nên một ghi *xảy ra sau* có thể mang timestamp *nhỏ hơn* → **âm thầm mất dữ liệu**, không lỗi, không log. Tệ hơn, LWW **không phân biệt được** "ghi đè có chủ ý" với "hai người cùng sửa hai thứ khác nhau": hai người thêm hai món vào giỏ, LWW vứt một món đi.

LWW vẫn được dùng rộng rãi (Cassandra, DynamoDB đều mặc định LWW) vì đơn giản và với đa số dữ liệu thì mất một bản ghi cạnh tranh là chấp nhận được. Nhưng nếu **không được phép mất ghi**, ta cần thứ đo *quan hệ nhân quả* thay vì *thời gian tường*.

### Vector clock là gì

**Vector clock** là danh sách cặp `[server, counter]` đi kèm mỗi phiên bản: `D([S1, 1], [S2, 2])` — "phiên bản này đã hấp thụ 1 lần ghi từ S1 và 2 lần từ S2".

Cập nhật khi node `Si` xử lý một lần ghi: nếu `Si` đã có trong clock → tăng counter lên 1; nếu chưa có → thêm mục `[Si, 1]`.

So sánh hai phiên bản X, Y:
- **X là tổ tiên của Y** (không xung đột) nếu **mọi** counter trong X `≤` counter tương ứng trong Y → vứt X, giữ Y.
- **X và Y là sibling (xung đột)** nếu có counter của X lớn hơn Y **và** có counter của Y lớn hơn X → hai nhánh phát triển song song, không nhánh nào biết nhánh kia.

### Ví dụ số cụ thể — giỏ hàng

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 440" role="img" aria-labelledby="sd10d-t sd10d-d" style="width:100%;max-width:760px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="sd10d-t">Vector clock của giỏ hàng qua 8 mốc thời gian</title>
<desc id="sd10d-d">D1 rồi D2 ghi tuần tự qua Sx. Mạng chia cắt; D3 ghi qua Sy, D4 ghi qua Sz song song từ D2. So D3 và D4: mỗi bên lớn hơn ở một chiều nên là sibling. Application hợp nhất thành D5 ghi qua Sx.</desc>
<defs><marker id="sd10d-arr" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker></defs>
<g data-step="1">
<rect x="10" y="110" width="125" height="80" rx="8" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="72.5" y="132" font-size="13.5" text-anchor="middle" font-weight="700" fill="currentColor">D1 · t1 · Sx</text>
<text x="72.5" y="154" font-size="13" text-anchor="middle" fill="currentColor">{sách}</text>
<text x="72.5" y="176" font-size="13" text-anchor="middle" font-weight="600" opacity="0.9" fill="currentColor">[Sx,1]</text>
</g>
<g data-step="2">
<line x1="137" y1="150" x2="162" y2="150" stroke="currentColor" stroke-opacity="0.75" stroke-width="1.8" marker-end="url(#sd10d-arr)"/>
<rect x="165" y="110" width="125" height="80" rx="8" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="227.5" y="132" font-size="13.5" text-anchor="middle" font-weight="700" fill="currentColor">D2 · t2 · Sx</text>
<text x="227.5" y="154" font-size="13" text-anchor="middle" fill="currentColor">{sách, bút}</text>
<text x="227.5" y="176" font-size="13" text-anchor="middle" font-weight="600" opacity="0.9" fill="currentColor">[Sx,2]</text>
<text x="227" y="212" font-size="12.5" text-anchor="middle" opacity="0.85" fill="currentColor">1 ≤ 2: D1 là tổ tiên</text>
</g>
<g data-step="3">
<line x1="300" y1="150" x2="530" y2="150" stroke="#f43f5e" stroke-width="2.2" stroke-dasharray="8 5"/>
<text x="415" y="143" font-size="13" text-anchor="middle" font-weight="700" fill="currentColor">t3 mạng chia cắt</text>
</g>
<g data-step="4">
<path d="M292 140 C310 140 310 70 336 70" fill="none" stroke="currentColor" stroke-opacity="0.75" stroke-width="1.8" marker-end="url(#sd10d-arr)"/>
<rect x="340" y="30" width="180" height="80" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="430.0" y="52" font-size="13.5" text-anchor="middle" font-weight="700" fill="currentColor">D3 · t4 · Sy (client A)</text>
<text x="430.0" y="74" font-size="13" text-anchor="middle" fill="currentColor">{sách, bút, vở}</text>
<text x="430.0" y="96" font-size="13" text-anchor="middle" font-weight="600" opacity="0.9" fill="currentColor">[Sx,2] [Sy,1]</text>
</g>
<g data-step="5">
<path d="M292 160 C310 160 310 230 336 230" fill="none" stroke="currentColor" stroke-opacity="0.75" stroke-width="1.8" marker-end="url(#sd10d-arr)"/>
<rect x="340" y="190" width="180" height="80" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="430.0" y="212" font-size="13.5" text-anchor="middle" font-weight="700" fill="currentColor">D4 · t5 · Sz (client B)</text>
<text x="430.0" y="234" font-size="13" text-anchor="middle" fill="currentColor">{sách, bút, tẩy}</text>
<text x="430.0" y="256" font-size="13" text-anchor="middle" font-weight="600" opacity="0.9" fill="currentColor">[Sx,2] [Sz,1]</text>
</g>
<g data-step="6">
<rect x="10" y="300" width="510" height="130" rx="8" fill="#f43f5e" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.3"/>
<text x="24" y="324" font-size="13.5" font-weight="700" fill="currentColor">t6 mạng nối lại, so từng chiều</text>
<text x="200" y="350" font-size="13" text-anchor="middle" font-weight="700" opacity="0.8" fill="currentColor">Sx</text>
<text x="270" y="350" font-size="13" text-anchor="middle" font-weight="700" opacity="0.8" fill="currentColor">Sy</text>
<text x="340" y="350" font-size="13" text-anchor="middle" font-weight="700" opacity="0.8" fill="currentColor">Sz</text>
<text x="130" y="374" font-size="13.5" text-anchor="middle" font-weight="700" fill="currentColor">D3</text>
<text x="200" y="374" font-size="13.5" text-anchor="middle" fill="currentColor">2</text>
<text x="270" y="374" font-size="13.5" text-anchor="middle" fill="currentColor">1</text>
<text x="340" y="374" font-size="13.5" text-anchor="middle" fill="currentColor">0</text>
<text x="130" y="398" font-size="13.5" text-anchor="middle" font-weight="700" fill="currentColor">D4</text>
<text x="200" y="398" font-size="13.5" text-anchor="middle" fill="currentColor">2</text>
<text x="270" y="398" font-size="13.5" text-anchor="middle" fill="currentColor">0</text>
<text x="340" y="398" font-size="13.5" text-anchor="middle" fill="currentColor">1</text>
<text x="270" y="420" font-size="12.5" text-anchor="middle" opacity="0.85" fill="currentColor">D3 hơn</text>
<text x="340" y="420" font-size="12.5" text-anchor="middle" opacity="0.85" fill="currentColor">D4 hơn</text>
<text x="395" y="374" font-size="13.5" font-weight="700" fill="currentColor">⇒ SIBLING</text>
<text x="395" y="398" font-size="13.5" font-weight="700" fill="currentColor">xung đột</text>
</g>
<g data-step="7">
<line x1="522" y1="70" x2="560" y2="136" stroke="currentColor" stroke-opacity="0.75" stroke-width="1.8" marker-end="url(#sd10d-arr)"/>
<line x1="522" y1="230" x2="560" y2="168" stroke="currentColor" stroke-opacity="0.75" stroke-width="1.8" marker-end="url(#sd10d-arr)"/>
<text x="650" y="40" font-size="13" text-anchor="middle" font-weight="700" fill="currentColor">t7 get trả CẢ HAI</text>
<text x="650" y="60" font-size="13" text-anchor="middle" opacity="0.85" fill="currentColor">app hợp nhất (union)</text>
</g>
<g data-step="8">
<rect x="565" y="104" width="185" height="96" rx="8" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="657.5" y="126" font-size="13.5" text-anchor="middle" font-weight="700" fill="currentColor">D5 · t8 · Sx</text>
<text x="657.5" y="148" font-size="13" text-anchor="middle" fill="currentColor">{sách, bút, vở, tẩy}</text>
<text x="657.5" y="170" font-size="13" text-anchor="middle" font-weight="600" opacity="0.9" fill="currentColor">[Sx,3] [Sy,1]</text>
<text x="657.5" y="188" font-size="13" text-anchor="middle" font-weight="600" opacity="0.9" fill="currentColor">[Sz,1]</text>
<text x="657" y="228" font-size="12.5" text-anchor="middle" opacity="0.85" fill="currentColor">hậu duệ của cả D3, D4</text>
</g>
</svg>
<step-note data-step="1">Lần ghi đầu qua <code>Sx</code>: <code>Sx</code> chưa có trong clock nên thêm mục <code>[Sx,1]</code>.</step-note>
<step-note data-step="2">Client đọc D1 rồi ghi tiếp qua <code>Sx</code>: đã có mục nên tăng 1 lên 2. Mọi counter của D1 ≤ D2, nên D1 bị vứt, không xung đột.</step-note>
<step-note data-step="3">Mạng chia cắt: phía <code>Sy</code> và phía <code>Sz</code> không thấy ghi của nhau, nhưng vẫn nhận ghi để giữ availability.</step-note>
<step-note data-step="4">Client A đọc D2, thêm vở, ghi qua <code>Sy</code>: clock giữ <code>[Sx,2]</code> và thêm <code>[Sy,1]</code>.</step-note>
<step-note data-step="5">Client B cũng đọc D2 (không thấy D3), thêm tẩy, ghi qua <code>Sz</code>: thêm <code>[Sz,1]</code>. Hai nhánh mọc song song từ cùng D2.</step-note>
<step-note data-step="6">Mục thiếu tính là 0. D3 lớn hơn ở chiều <code>Sy</code>, D4 lớn hơn ở chiều <code>Sz</code>: không cái nào là tổ tiên của cái kia. Kết luận không dựa vào đồng hồ.</step-note>
<step-note data-step="7">Hệ thống không tự chọn: <code>get(cart)</code> trả cả hai kèm context là clock hợp nhất. Với giỏ hàng, union là luật hoà giải hợp lý.</step-note>
<step-note data-step="8">Ghi bản đã hoà giải qua <code>Sx</code>: <code>Sx</code> tăng lên 3, giữ <code>[Sy,1]</code> và <code>[Sz,1]</code>. D5 trội hơn cả D3 lẫn D4 nên xung đột biến mất.</step-note>
</step-flow>

Điểm quan trọng nhất: **hệ thống không tự quyết**. Nó chỉ **phát hiện** xung đột một cách chắc chắn (không phụ thuộc đồng hồ) rồi đẩy quyết định lên application — nơi duy nhất biết "giỏ hàng thì union được, còn số dư tài khoản thì tuyệt đối không".

Và chú ý t2 so với t4/t5: cả hai đều là "đọc rồi ghi", nhưng t2 không xung đột vì **tuần tự**, còn t4/t5 xung đột vì **song song**. Vector clock phân biệt được chính xác điều đó, timestamp thì không.

### Giới hạn của vector clock

| Vấn đề | Chi tiết | Cách giảm nhẹ |
|---|---|---|
| **Đẩy phức tạp sang client** | Client phải mang `context` và phải có logic merge sibling | Đóng gói merge trong SDK; hoặc dùng **CRDT** (G-Counter, OR-Set) để merge tự động |
| **Clock phình to** | Mỗi server từng ghi key đều để lại một mục → key nóng có clock dài hàng trăm mục, có khi lớn hơn cả value | **Cắt tỉa**: gắn timestamp mỗi mục, vượt ngưỡng (Dynamo dùng 10) thì bỏ mục cũ nhất |
| **Cắt tỉa gây sai** | Bỏ mục cũ làm mất khả năng suy ra quan hệ tổ tiên → xung đột giả | Chấp nhận: xung đột giả chỉ tốn công merge thừa, còn **mất dữ liệu thì không cứu được** |
| **Sibling tích tụ** | App không hoà giải thì sibling nhân lên mỗi lần ghi song song | Bắt buộc ghi lại bản đã merge; giới hạn số sibling |

> **Nguyên tắc chọn**: Hỏi một câu — *"mất một ghi cạnh tranh có gây thiệt hại nghiệp vụ không?"* Không (log, telemetry, profile field) → **LWW**. Có (giỏ hàng, danh sách, tài liệu cộng tác) → **vector clock hoặc CRDT**.


## Deep dive 4 — Xử lý lỗi

Trong hệ 128 node, **luôn có node đang chết**. Đây không phải ngoại lệ mà là trạng thái vận hành bình thường — thiết kế phải coi lỗi là mặc định.

### 4.1 Phát hiện lỗi — gossip protocol

Cách ngây thơ thứ nhất: mỗi node ping mọi node khác. Với 128 node là 16,256 kết nối, traffic **O(n²)** — chính heartbeat sẽ giết cluster khi n lớn.

Cách ngây thơ thứ hai: tin lời một node báo "n3 chết rồi". Không tin được — có thể chỉ **mạng giữa hai node đó** hỏng, còn n3 vẫn phục vụ tốt cho phần còn lại. Kết luận vội dẫn tới **false positive**: đá một node khoẻ ra, kích hoạt rebalance hàng TB vô ích.

**Gossip protocol** giải cả hai:

```
Mỗi node giữ một bảng thành viên:
  ┌──────────┬───────────┬──────────────┐
  │ node_id  │ heartbeat │ last_updated │
  ├──────────┼───────────┼──────────────┤
  │   n1     │   9,910   │  15:30:11    │
  │   n2     │   8,301   │  15:28:44    │ ← không tăng 90s → NGHI NGỜ
  │   n3     │  10,229   │  15:30:12    │
  └──────────┴───────────┴──────────────┘

Vòng lặp mỗi node (vd mỗi 1 giây):
  1. Tự tăng heartbeat của CHÍNH MÌNH lên 1.
  2. Chọn NGẪU NHIÊN vài node (vd 3) trong cluster.
  3. Gửi cả bảng thành viên của mình cho chúng.
  4. Nhận bảng của người khác → với mỗi node, GIỮ heartbeat lớn hơn.

  → Tin lan như tin đồn: sau ~log(n) vòng cả cluster đều biết.
    128 node ≈ 7 vòng ≈ 7 giây.
```

Vì sao đúng hơn: **traffic O(n) mỗi node**; **không có điểm tập trung** (không có monitoring server chết là mù); và **chống false positive bằng nhiều nguồn** — node chỉ bị đánh dấu offline khi heartbeat không tăng theo quan sát lan truyền của nhiều node. Cassandra còn dùng **Phi Accrual Failure Detector**: thay vì ngưỡng cứng "quá 10s là chết", nó tính *xác suất* node đã chết dựa trên phân bố khoảng cách heartbeat trong quá khứ, nên mạng chậm ổn định thì ngưỡng tự nới ra.

> **Bẫy vận hành**: Đặt failure detector quá nhạy trong môi trường có **GC pause dài** (JVM stop-the-world 10–20 giây) → node khoẻ liên tục bị đánh dấu chết rồi sống lại (*flapping*), mỗi lần lại rebalance. Triệu chứng: cluster "rung" liên tục, latency tăng vọt mà không node nào thật sự hỏng.

### 4.2 Lỗi tạm thời — sloppy quorum + hinted handoff

Node chết 2 phút để reboot là *tạm thời*. Nếu khăng khăng đòi đúng W replica trong preference list, mất một node là mất khả năng ghi cho toàn bộ key nó sở hữu — **đúng là hi sinh availability, trái mục tiêu AP**.

**Sloppy quorum** nới lỏng: thay vì đòi đúng W node *trong preference list*, coordinator lấy **W node KHOẺ ĐẦU TIÊN** gặp trên ring, bỏ qua node chết.

```
Preference list của key K: [n4, n5, n6]     N=3, W=2.  n5 đang chết.

Strict quorum:  còn n4, n6 → vừa đủ W=2 → OK
                nhưng nếu n5 VÀ n6 cùng chết → chỉ còn 1 → TỪ CHỐI GHI
Sloppy quorum:  n4 ✓, n5 ✗  → đi tiếp trên ring → n7
                ghi vào [n4, n6, n7] → đủ W → OK
                n7 KHÔNG phải chủ thật của K, nó chỉ giữ hộ.
```

**Hinted handoff** là nửa còn lại: n7 lưu bản ghi kèm một **"hint"** — metadata ghi rõ *"cái này thực ra của n5, tôi giữ hộ"* — để trong vùng riêng, không trộn vào dữ liệu chính. Khi gossip báo n5 sống lại, n7 **đẩy toàn bộ hint về n5** rồi xoá bản tạm.

| | Mua được | Trả giá |
|---|---|---|
| Sloppy quorum | Ghi **không bao giờ bị từ chối** vì node chết tạm thời | `W+R>N` không còn đảm bảo strong consistency (tập ghi có thể nằm ngoài preference list → không giao với tập đọc) |
| Hinted handoff | Tự động bắt kịp, không cần can thiệp tay | Node giữ hint tốn đĩa; node đích chết **lâu** thì hint chất đống rồi **hết hạn và bị vứt** |

> **Bẫy nghiêm trọng**: Hint có thời hạn (Cassandra `max_hint_window_in_ms`, mặc định 3 giờ). Node chết lâu hơn ngưỡng → hint bị **xoá**, dữ liệu ghi trong lúc nó chết **không tự về**, và không ai báo. Đây chính là lý do bắt buộc phải có cơ chế thứ hai.

### 4.3 Lỗi vĩnh viễn — anti-entropy với Merkle tree

Node chết đĩa, thay máy, hoặc offline quá lâu → lệch hẳn so với replica khác. Cần cơ chế **so sánh và sửa toàn bộ dataset** giữa hai replica: **anti-entropy**. Cách ngây thơ — A gửi toàn bộ key cho B để so — nghĩa là **truyền 37 TB chỉ để phát hiện có thể chẳng có gì lệch**. Merkle tree sinh ra để giải đúng chuyện này.

**Merkle tree (hash tree)**: **lá** = hash của một *bucket* key (một khoảng key); **nút trong** = `hash(H(left) || H(right))`; **gốc** = một hash duy nhất đại diện toàn bộ dataset.

Xây cây cho 4 bucket:

1. Chia không gian key thành bucket: `b1: 0000–3FFF`, `b2: 4000–7FFF`, `b3: 8000–BFFF`, `b4: C000–FFFF`.
2. Hash từng key trong bucket bằng hàm băm đều.
3. Gộp thành MỘT hash cho mỗi bucket: `b1→H1`, `b2→H2`, `b3→H3`, `b4→H4`.
4. Gộp lên tầng trên (`H12`, `H34`) tới gốc `H1234`.

Đồng bộ replica A và B, số trên hình là thứ tự so:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 440" role="img" aria-labelledby="sd10b-t sd10b-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="sd10b-t">So hai replica bằng Merkle tree: đi từ gốc xuống lá</title>
<desc id="sd10b-d">Cây băm 4 bucket. So gốc thấy khác; so H12 thấy giống nên bỏ qua cả nửa trái; H34 khác nên đi xuống; H3 giống, H4 khác; chỉ đồng bộ bucket b4 (C000–FFFF).</desc>
<line x1="250" y1="60" x2="125" y2="102" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.6"/>
<line x1="250" y1="60" x2="375" y2="102" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.6"/>
<line x1="125" y1="150" x2="65" y2="191" stroke="currentColor" stroke-opacity="0.2" stroke-width="1.6"/>
<line x1="125" y1="150" x2="185" y2="191" stroke="currentColor" stroke-opacity="0.2" stroke-width="1.6"/>
<line x1="375" y1="150" x2="315" y2="191" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.6"/>
<line x1="375" y1="150" x2="435" y2="191" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.6"/>
<rect x="175.0" y="12" width="150" height="48" rx="8" fill="#f43f5e" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="250" y="33" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">ROOT = H1234</text>
<text x="250" y="51" font-size="13" text-anchor="middle" opacity="0.85" fill="currentColor">A ≠ B</text>
<circle cx="175.0" cy="12" r="11" fill="#3b82f6" fill-opacity="0.9"/>
<text x="175.0" y="16.5" font-size="13" text-anchor="middle" font-weight="700" fill="#fff">1</text>
<rect x="73.0" y="102" width="104" height="48" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="125" y="123" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">H12</text>
<text x="125" y="141" font-size="13" text-anchor="middle" opacity="0.85" fill="currentColor">A = B</text>
<circle cx="73.0" cy="102" r="11" fill="#3b82f6" fill-opacity="0.9"/>
<text x="73.0" y="106.5" font-size="13" text-anchor="middle" font-weight="700" fill="#fff">2</text>
<rect x="323.0" y="102" width="104" height="48" rx="8" fill="#f43f5e" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="375" y="123" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">H34</text>
<text x="375" y="141" font-size="13" text-anchor="middle" opacity="0.85" fill="currentColor">A ≠ B</text>
<circle cx="323.0" cy="102" r="11" fill="#3b82f6" fill-opacity="0.9"/>
<text x="323.0" y="106.5" font-size="13" text-anchor="middle" font-weight="700" fill="#fff">2</text>
<g opacity="0.45">
<rect x="13.0" y="191" width="104" height="48" rx="8" fill="#64748b" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.3"/>
<text x="65" y="212" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">H1</text>
<text x="65" y="230" font-size="13" text-anchor="middle" opacity="0.85" fill="currentColor">không cần so</text>
</g>
<g opacity="0.45">
<rect x="133.0" y="191" width="104" height="48" rx="8" fill="#64748b" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.3"/>
<text x="185" y="212" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">H2</text>
<text x="185" y="230" font-size="13" text-anchor="middle" opacity="0.85" fill="currentColor">không cần so</text>
</g>
<rect x="263.0" y="191" width="104" height="48" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="315" y="212" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">H3</text>
<text x="315" y="230" font-size="13" text-anchor="middle" opacity="0.85" fill="currentColor">A = B</text>
<circle cx="263.0" cy="191" r="11" fill="#3b82f6" fill-opacity="0.9"/>
<text x="263.0" y="195.5" font-size="13" text-anchor="middle" font-weight="700" fill="#fff">3</text>
<rect x="383.0" y="191" width="104" height="48" rx="8" fill="#f43f5e" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="435" y="212" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">H4</text>
<text x="435" y="230" font-size="13" text-anchor="middle" opacity="0.85" fill="currentColor">A ≠ B</text>
<circle cx="383.0" cy="191" r="11" fill="#3b82f6" fill-opacity="0.9"/>
<text x="383.0" y="195.5" font-size="13" text-anchor="middle" font-weight="700" fill="#fff">3</text>
<line x1="65" y1="239" x2="65" y2="280" stroke="currentColor" stroke-opacity="0.2" stroke-width="1.6"/>
<g opacity="0.45">
<rect x="11" y="280" width="108" height="46" rx="8" fill="#64748b" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="5 4"/>
<text x="65" y="299" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">b1</text>
<text x="65" y="317" font-size="13" text-anchor="middle" opacity="0.85" fill="currentColor">0000–3FFF</text>
</g>
<line x1="185" y1="239" x2="185" y2="280" stroke="currentColor" stroke-opacity="0.2" stroke-width="1.6"/>
<g opacity="0.45">
<rect x="131" y="280" width="108" height="46" rx="8" fill="#64748b" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="5 4"/>
<text x="185" y="299" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">b2</text>
<text x="185" y="317" font-size="13" text-anchor="middle" opacity="0.85" fill="currentColor">4000–7FFF</text>
</g>
<line x1="315" y1="239" x2="315" y2="280" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.6"/>
<rect x="261" y="280" width="108" height="46" rx="8" fill="#64748b" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="5 4"/>
<text x="315" y="299" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">b3</text>
<text x="315" y="317" font-size="13" text-anchor="middle" opacity="0.85" fill="currentColor">8000–BFFF</text>
<line x1="435" y1="239" x2="435" y2="280" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.6"/>
<rect x="381" y="280" width="108" height="46" rx="8" fill="#f59e0b" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.3"/>
<text x="435" y="299" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor">b4</text>
<text x="435" y="317" font-size="13" text-anchor="middle" opacity="0.85" fill="currentColor">C000–FFFF</text>
<circle cx="381" cy="280" r="11" fill="#3b82f6" fill-opacity="0.9"/>
<text x="381" y="284.5" font-size="13" text-anchor="middle" font-weight="700" fill="#fff">4</text>
<text x="250" y="356" font-size="13.5" text-anchor="middle" font-weight="600" fill="currentColor">Nửa trái: bỏ qua hoàn toàn</text>
<text x="250" y="375" font-size="13" text-anchor="middle" opacity="0.85" fill="currentColor">1 phép so 32 byte loại 50% dữ liệu</text>
<text x="250" y="407" font-size="13.5" text-anchor="middle" font-weight="600" fill="currentColor">Chỉ dữ liệu b4 được truyền</text>
<text x="250" y="426" font-size="13" text-anchor="middle" opacity="0.85" fill="currentColor">tỉ lệ với lượng lệch, không với dataset</text>
</svg>

1. So ROOT. GIỐNG → hai replica y hệt nhau, DỪNG (chi phí: 32 byte). KHÁC → đi xuống.
2. So H12 và H34. H12 giống, H34 khác → NỬA TRÁI ĐÚNG, bỏ qua hoàn toàn: loại 50% dữ liệu khỏi diện nghi vấn bằng 1 phép so 32 byte.
3. So H3, H4 → chỉ H4 khác ⇒ lệch nằm gọn trong bucket b4.
4. Chỉ đồng bộ dữ liệu của b4.

**Vì sao Merkle tree giảm mạnh dữ liệu phải so** — hai vế:

1. **Phát hiện "không có gì lệch" với chi phí gần bằng 0.** Trường hợp phổ biến nhất trong vận hành là hai replica *đã giống nhau*. Cách ngây thơ vẫn phải truyền toàn bộ; Merkle tree chỉ tốn **một lần so 32 byte**. Đây mới là phần tiết kiệm lớn nhất, vì anti-entropy chạy định kỳ hằng ngày.
2. **Khi có lệch, chi phí là logarit chứ không tuyến tính.** Mỗi tầng đi xuống loại một nửa không gian key. Với cây 2^20 ≈ 1 triệu bucket, tìm ra bucket lệch chỉ cần so **~20 cặp hash ≈ 640 byte**. Lượng **dữ liệu thật** phải truyền đúng bằng nội dung các bucket khác nhau — **tỉ lệ với lượng lệch thực sự, không phải với kích thước dataset**.

| | So trực tiếp | Merkle tree |
|---|---|---|
| Không có lệch | Truyền 37 TB | **32 byte** |
| Lệch 1 bucket (~40 MB) | Truyền 37 TB | ~640 B hash + 40 MB dữ liệu |
| Độ phức tạp phát hiện | O(n) | **O(log n)** |
| Chi phí thêm | Không | Phải **xây và giữ cây**; mỗi lần ghi cập nhật hash dọc một nhánh |

> **Bẫy**: Xây Merkle tree tốn CPU và I/O thật. Trên Cassandra, `nodetool repair` (chính là anti-entropy này) là thao tác **nặng nhất** trong vận hành — chạy nhiều node cùng lúc trong giờ cao điểm sẽ làm p99 tăng vọt. Thực tế: chạy **lệch giờ giữa các node**, và bắt buộc chạy **trước khi hết `gc_grace_seconds`** — nếu không, tombstone bị dọn trước khi kịp lan tới mọi replica và **dữ liệu đã xoá sẽ hồi sinh**.

Ba tầng sửa lỗi bổ sung nhau và cần **cả ba**: **hinted handoff** lo mức giây–giờ; **read repair** (khi đọc R bản thấy version lệch thì ghi ngay bản mới về replica cũ — gần như miễn phí, nhưng chỉ chạm được dữ liệu có người đọc); **Merkle-tree anti-entropy** lo phần dữ liệu nguội mà không ai đụng tới suốt nhiều tháng.

### 4.4 Lỗi cả datacenter

Mất nguyên một AZ/DC là chuyện có thật, và câu trả lời duy nhất là **replica phải nằm ở nhiều DC ngay từ đầu**, chứ không phải "backup sang DC khác".

```
   AZ-a           AZ-b           AZ-c
   [replica 1]    [replica 2]    [replica 3]
       └──────────────┴──────────────┘
     mất TRỌN một AZ vẫn còn 2/3 → W=2/R=2 vẫn chạy
```

Multi-region thì khác hẳn về chất, vì độ trễ giữa region là **hàng chục tới trăm mili-giây**:

| Chiến lược | Cách làm | Đánh đổi |
|---|---|---|
| **Multi-AZ trong 1 region** | 3 replica ở 3 AZ, quorum đồng bộ | Thêm ~1 ms. **Mặc định nên làm** |
| Multi-region async | Region chính ghi, nhân bản bất đồng bộ sang region phụ | Latency ghi không đổi; **mất dữ liệu chưa kịp nhân bản** (RPO > 0) |
| Multi-region quorum đồng bộ | Quorum trải qua region | Mỗi ghi cõng ~60–100 ms |
| **Active-active multi-region** | Cả hai region nhận ghi, hoà giải bằng LWW/CRDT | Availability cao nhất; **phải chấp nhận xung đột ghi chéo region** (DynamoDB Global Tables đi đường này, dùng LWW) |


## Deep dive 5 — Bên trong một node: write path, read path, LSM tree

Xong phần phân tán. Nhưng một node vẫn phải cất dữ liệu lên đĩa cho nhanh — và lựa chọn cấu trúc lưu trữ quyết định hệ này giỏi ghi hay giỏi đọc.

### Write path & read path

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 500" role="img" aria-labelledby="sd10c-t sd10c-d" style="width:100%;max-width:760px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="sd10c-t">Write path và read path trong một node LSM</title>
<desc id="sd10c-d">Bên trái đường ghi: commit log trên đĩa, memtable trong RAM, đầy thì flush thành SSTable mới. Bên phải đường đọc: memtable, bloom filter mỗi SSTable, đọc SSTable bằng sparse index, gộp lấy version mới nhất.</desc>
<defs><marker id="sd10c-arr" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker></defs>
<text x="190" y="24" font-size="13.5" text-anchor="middle" font-weight="700" opacity="0.7" fill="currentColor">WRITE PATH</text>
<text x="570" y="24" font-size="13.5" text-anchor="middle" font-weight="700" opacity="0.7" fill="currentColor">READ PATH</text>
<line x1="380" y1="10" x2="380" y2="490" stroke="currentColor" stroke-opacity="0.15" stroke-dasharray="4 4"/>
<rect x="130" y="38" width="120" height="32" rx="16" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="190" y="59" font-size="13.5" text-anchor="middle" font-weight="700" fill="currentColor">put(k, v)</text>
<rect x="80" y="120" width="220" height="54" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
<text x="190" y="142" font-size="13.5" text-anchor="middle" font-weight="700" fill="currentColor">COMMIT LOG · đĩa</text>
<text x="190" y="162" font-size="12.5" text-anchor="middle" opacity="0.8" fill="currentColor">append-only</text>
<rect x="80" y="225" width="220" height="54" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
<text x="190" y="247" font-size="13.5" text-anchor="middle" font-weight="700" fill="currentColor">MEMTABLE · RAM</text>
<text x="190" y="267" font-size="12.5" text-anchor="middle" opacity="0.8" fill="currentColor">skip list, key đã sắp xếp</text>
<rect x="30" y="380" width="105" height="50" rx="8" fill="#64748b" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.3"/>
<text x="82" y="402" font-size="13" text-anchor="middle" font-weight="700" fill="currentColor">SSTable-1</text>
<text x="82" y="420" font-size="12.5" text-anchor="middle" opacity="0.7" fill="currentColor">đĩa</text>
<rect x="145" y="380" width="105" height="50" rx="8" fill="#64748b" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.3"/>
<text x="197" y="402" font-size="13" text-anchor="middle" font-weight="700" fill="currentColor">SSTable-2</text>
<text x="197" y="420" font-size="12.5" text-anchor="middle" opacity="0.7" fill="currentColor">đĩa</text>
<rect x="510" y="38" width="120" height="32" rx="16" fill="#14b8a6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="570" y="59" font-size="13.5" text-anchor="middle" font-weight="700" fill="currentColor">get(k)</text>
<rect x="470" y="120" width="200" height="54" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
<text x="570" y="142" font-size="13.5" text-anchor="middle" font-weight="700" fill="currentColor">MEMTABLE · RAM</text>
<text x="570" y="162" font-size="12.5" text-anchor="middle" opacity="0.8" fill="currentColor">bản ghi mới nhất</text>
<rect x="470" y="225" width="200" height="54" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
<text x="570" y="247" font-size="13.5" text-anchor="middle" font-weight="700" fill="currentColor">BLOOM FILTER · RAM</text>
<text x="570" y="267" font-size="12.5" text-anchor="middle" opacity="0.8" fill="currentColor">1 cái / SSTable</text>
<rect x="470" y="330" width="200" height="54" rx="8" fill="#64748b" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.3"/>
<text x="570" y="352" font-size="13.5" text-anchor="middle" font-weight="700" fill="currentColor">SSTable trên đĩa</text>
<text x="570" y="372" font-size="12.5" text-anchor="middle" opacity="0.8" fill="currentColor">sparse index + binary search</text>
<rect x="470" y="430" width="200" height="50" rx="8" fill="#3b82f6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.3"/>
<text x="570" y="452" font-size="13.5" text-anchor="middle" font-weight="700" fill="currentColor">gộp nhiều SSTable</text>
<text x="570" y="470" font-size="12.5" text-anchor="middle" opacity="0.8" fill="currentColor">lấy version mới nhất</text>
<g data-step="1">
<line x1="190" y1="72" x2="190" y2="117" stroke="currentColor" stroke-opacity="0.75" stroke-width="1.8" marker-end="url(#sd10c-arr)"/>
<circle cx="168" cy="95" r="11" fill="#f59e0b" fill-opacity="0.9"/>
<text x="168" y="99.5" font-size="12.5" text-anchor="middle" font-weight="700" fill="#fff">1</text>
<text x="202" y="100" font-size="12.5" fill="currentColor">ghi tuần tự + fsync</text>
</g>
<g data-step="2">
<line x1="190" y1="176" x2="190" y2="222" stroke="currentColor" stroke-opacity="0.75" stroke-width="1.8" marker-end="url(#sd10c-arr)"/>
<circle cx="168" cy="199" r="11" fill="#8b5cf6" fill-opacity="0.9"/>
<text x="168" y="203.5" font-size="12.5" text-anchor="middle" font-weight="700" fill="#fff">2</text>
<path d="M300 252 H345 V54 H254" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#sd10c-arr)"/>
<text x="337" y="200" font-size="13" text-anchor="end" font-weight="700" fill="currentColor">ack</text>
</g>
<g data-step="3">
<rect x="260" y="380" width="105" height="50" rx="8" fill="#f59e0b" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.3"/>
<text x="312" y="402" font-size="13" text-anchor="middle" font-weight="700" fill="currentColor">SSTable-3</text>
<text x="312" y="420" font-size="12.5" text-anchor="middle" opacity="0.8" fill="currentColor">mới, immutable</text>
<line x1="250" y1="281" x2="300" y2="377" stroke="currentColor" stroke-opacity="0.75" stroke-width="1.8" marker-end="url(#sd10c-arr)"/>
<circle cx="258" cy="330" r="11" fill="#64748b" fill-opacity="0.9"/>
<text x="258" y="334.5" font-size="12.5" text-anchor="middle" font-weight="700" fill="#fff">3</text>
<text x="282" y="322" font-size="12.5" fill="currentColor">đầy 64 MB</text>
<text x="282" y="340" font-size="12.5" fill="currentColor">→ flush</text>
<text x="190" y="455" font-size="12.5" text-anchor="middle" opacity="0.8" fill="currentColor">số SSTable tăng dần theo thời gian</text>
</g>
<g data-step="4">
<line x1="570" y1="72" x2="570" y2="117" stroke="currentColor" stroke-opacity="0.75" stroke-width="1.8" marker-end="url(#sd10c-arr)"/>
<circle cx="548" cy="95" r="11" fill="#14b8a6" fill-opacity="0.9"/>
<text x="548" y="99.5" font-size="12.5" text-anchor="middle" font-weight="700" fill="#fff">4</text>
<text x="682" y="142" font-size="12.5" opacity="0.9" fill="currentColor">có →</text>
<text x="682" y="160" font-size="12.5" opacity="0.9" fill="currentColor">trả ngay</text>
</g>
<g data-step="5">
<line x1="570" y1="176" x2="570" y2="222" stroke="currentColor" stroke-opacity="0.75" stroke-width="1.8" marker-end="url(#sd10c-arr)"/>
<circle cx="548" cy="199" r="11" fill="#10b981" fill-opacity="0.9"/>
<text x="548" y="203.5" font-size="12.5" text-anchor="middle" font-weight="700" fill="#fff">5</text>
<text x="582" y="204" font-size="12.5" fill="currentColor">miss</text>
<text x="682" y="247" font-size="12.5" opacity="0.9" fill="currentColor">không có</text>
<text x="682" y="265" font-size="12.5" opacity="0.9" fill="currentColor">→ bỏ file</text>
</g>
<g data-step="6">
<line x1="570" y1="281" x2="570" y2="327" stroke="currentColor" stroke-opacity="0.75" stroke-width="1.8" marker-end="url(#sd10c-arr)"/>
<circle cx="548" cy="304" r="11" fill="#64748b" fill-opacity="0.9"/>
<text x="548" y="308.5" font-size="12.5" text-anchor="middle" font-weight="700" fill="#fff">6</text>
<text x="582" y="309" font-size="12.5" fill="currentColor">có thể có (~1% sai)</text>
</g>
<g data-step="7">
<line x1="570" y1="386" x2="570" y2="427" stroke="currentColor" stroke-opacity="0.75" stroke-width="1.8" marker-end="url(#sd10c-arr)"/>
<circle cx="548" cy="407" r="11" fill="#3b82f6" fill-opacity="0.9"/>
<text x="548" y="411.5" font-size="12.5" text-anchor="middle" font-weight="700" fill="#fff">7</text>
</g>
</svg>
<step-note data-step="1">Ghi log trước tiên vì đây là append tuần tự, rẻ, và là bản để replay khi máy mất điện làm bay RAM.</step-note>
<step-note data-step="2">Vào memtable xong là ack client ngay: ghi RAM nhanh, còn độ bền đã có log ở bước 1 lo.</step-note>
<step-note data-step="3">Memtable đầy ngưỡng (vd 64 MB) mới flush thành một file mới ghi một lượt từ đầu tới cuối, vẫn tuần tự. File không bao giờ sửa lại, key đã sắp xếp nên đọc được bằng binary search.</step-note>
<step-note data-step="4">Đọc hỏi memtable trước vì nó giữ các ghi mới nhất chưa flush; có là trả, không chạm đĩa.</step-note>
<step-note data-step="5">Miss thì hỏi bloom filter của từng SSTable (~10 bit/key, nằm hết trong RAM). Nó không bao giờ false negative, nên câu <code>chắc chắn không có</code> cho phép bỏ qua file an toàn.</step-note>
<step-note data-step="6">Chỉ file bị báo <code>có thể có</code> mới tốn lần đọc đĩa. Khoảng 1% là false positive: đọc xong mới biết key không có.</step-note>
<step-note data-step="7">Cùng một key có thể nằm ở nhiều SSTable từ các lần ghi khác nhau, nên phải gộp và giữ version mới nhất.</step-note>
</step-flow>

Cái hay nằm ở chỗ **mọi thao tác ghi xuống đĩa đều là ghi tuần tự**: commit log là append, flush memtable là ghi một file mới từ đầu tới cuối. Không random write, không seek — trên HDD là khác biệt 100×, trên SSD vẫn quan trọng vì tránh write amplification ở tầng flash.

Vì sao cần cả commit log *lẫn* memtable? Ack phát ra khi dữ liệu vào memtable (RAM) — nhanh — nhưng RAM bay khi mất điện; commit log là bảo hiểm để replay lúc khởi động lại. Ghi hai chỗ nghe lãng phí, nhưng cả hai đều tuần tự nên vẫn rẻ hơn một lần random write.

**Bloom filter** là mảnh ghép quyết định hiệu năng đọc. Sau một thời gian chạy, node có **hàng chục SSTable**; không có bloom filter thì mỗi lần `get` một key *không tồn tại* phải đọc thử **tất cả** — hàng chục lần chạm đĩa cho câu trả lời "không có". Bloom filter rất nhỏ (~10 bit/key → 1 triệu key chỉ ~1.2 MB, giữ hết trong RAM) và bất đối xứng: trả lời **"chắc chắn KHÔNG có"** thì tuyệt đối đúng (bỏ qua file an toàn), trả lời **"có thể có"** thì có thể sai (~1% false positive, phải đọc kiểm chứng). **Không bao giờ có false negative** — đó chính là điều làm nó dùng được ở đây.

### LSM tree vs B-tree

Cấu trúc vừa mô tả chính là **LSM tree (Log-Structured Merge tree)**. Đối thủ của nó là **B+tree** — thứ MySQL InnoDB và PostgreSQL dùng. Khác biệt gốc rễ nằm ở một câu: **B-tree cập nhật tại chỗ; LSM tree chỉ ghi thêm rồi dọn sau.**

| | **LSM tree** (Cassandra, RocksDB, DynamoDB, HBase) | **B-tree** (InnoDB, PostgreSQL) |
|---|---|---|
| Cách ghi | Append tuần tự vào log + memtable | Tìm đúng page, **ghi đè tại chỗ** (random write) |
| **Write amplification** | Thấp lúc ghi, nhưng **compaction ghi lại nhiều lần** (10–30×) | Ghi 100 byte phải ghi cả page 8–16 KB **+ WAL** |
| **Read amplification** | **Cao**: tra memtable + nhiều SSTable, có thể nhiều lần chạm đĩa cho 1 key | **Thấp, có giới hạn rõ**: ~3–4 lần chạm đĩa |
| Throughput ghi | **Rất cao** (tuần tự) | Trung bình (random I/O) |
| Latency đọc | Biến động theo số SSTable / trạng thái compaction | **Ổn định, dễ dự đoán** |
| Nén | Rất tốt (file immutable, sắp xếp sẵn) | Kém hơn (page chừa chỗ trống cho update tại chỗ) |
| Transaction / khoá | Khó (dữ liệu một key rải nhiều file) | Dễ (mỗi key một chỗ duy nhất) |
| Hợp với | **Write-heavy**, ingest, time-series, KV phân tán | **Read-heavy**, OLTP có transaction, range scan mạnh |

> **Nguyên tắc**: LSM tree **đổi read amplification lấy write amplification**. Nó thắng ở đây vì một KV store phân tán vốn đặt cược vào việc *ghi phải luôn nhanh và luôn nhận được* (AP), còn đọc thì cứu được bằng bloom filter + cache + nhiều replica cùng phục vụ. Nếu bài toán là OLTP có transaction và range query phức tạp thì B-tree mới đúng — đó là lý do người ta không thay PostgreSQL bằng Cassandra.

### Compaction — cái giá phải trả của LSM

SSTable là **bất biến**. Sửa một key = ghi bản mới ở SSTable mới; xoá = ghi tombstone. Hệ quả: SSTable chất đống, một key có thể có bản cũ rải rác ở 15 file. Đọc chậm dần, đĩa phình dần.

**Compaction** là tiến trình nền merge-sort nhiều SSTable thành ít hơn (chúng đã sắp xếp sẵn nên merge rất rẻ), **giữ version mới nhất của mỗi key, vứt bản cũ và tombstone quá hạn**.

| Chiến lược | Cách làm | Write amp | Read amp | Đĩa cần dư | Hợp với |
|---|---|---|---|---|---|
| **Size-tiered (STCS)** | Gom các SSTable **cùng cỡ** thành file lớn hơn | Thấp | **Cao** | **Cao** — có lúc cần gấp đôi | Write-heavy, ít đọc lại |
| **Leveled (LCS)** | Level L0..Ln lớn dần ~10×, **trong một level key không chồng lấn** | **Cao** (10–30×) | **Thấp** | Thấp, ổn định | Read-heavy, cần latency đọc ổn định |
| Time-window (TWCS) | Gom theo cửa sổ thời gian, hết TTL thì xoá nguyên file | Rất thấp | TB | Thấp | **Time-series có TTL** |

> **Bẫy vận hành kinh điển**: Compaction cạnh tranh I/O và CPU với traffic thật — triệu chứng là p99 **tăng đột biến theo từng đợt**. Ba việc cần làm: giới hạn `compaction_throughput`; chừa **≥40% đĩa trống** (STCS cần chỗ ghi file gộp trước khi xoá file nguồn — đĩa đầy thì compaction kẹt, SSTable chất đống, đọc chậm dần tới chết); và **không dùng LCS cho workload ghi cực nặng** vì write amplification sẽ nuốt hết IOPS.


## Bottleneck & failure mode

| Bottleneck | Triệu chứng | Nguyên nhân gốc | Cách gỡ |
|---|---|---|---|
| **Hot key / hot partition** | Một node CPU 100%, phần còn lại nhàn | Một key (hoặc một partition key) nhận phần lớn traffic | Thêm cache trước (DAX/Redis); **key salting** (`user123#1..N`); tách key nóng ra |
| Phân bố không đều | Vài node đầy đĩa, vài node trống | Ít virtual node, hoặc hàm băm kém | Tăng số vnode; kiểm tra lại hàm băm |
| **Đuôi latency do quorum** | p99 cao dù p50 tốt | Chờ node chậm thứ W (GC pause, đĩa bận compaction) | Giảm W/R nếu chấp nhận được; **hedged request** (gửi dư rồi lấy bản về trước); tách compaction khỏi giờ cao điểm |
| Compaction backlog | Số SSTable tăng dần, đọc chậm dần | Ghi vào nhanh hơn compact ra | Thêm node (giảm tải ghi/node); đổi chiến lược compaction; nâng IOPS |
| Sibling bùng nổ | Value phình to bất thường, đọc chậm | App không hoà giải sibling rồi ghi lại | Ép app merge; chuyển sang CRDT; hoặc LWW nếu nghiệp vụ cho phép |
| Vector clock phình | Metadata lớn hơn cả value | Key đi qua quá nhiều coordinator | Cắt tỉa theo ngưỡng; giảm số coordinator cho một key (sticky routing) |
| Repair quá tải | Latency tăng khi chạy `repair` | Anti-entropy đọc lại toàn bộ dữ liệu | Chạy lệch giờ, chia nhỏ theo dải token, giới hạn throughput |
| **Zombie data** | Dữ liệu đã xoá tự quay lại | Node offline > `gc_grace`; tombstone bị dọn trước khi lan hết | Repair định kỳ **trước** `gc_grace`; không join lại node offline quá lâu — xoá sạch và bootstrap lại từ đầu |

**Component chết thì sao?**

| Chết cái gì | Hệ ứng xử ra sao |
|---|---|
| 1 node (tạm thời) | Sloppy quorum ghi sang node khác + hinted handoff bù lại khi sống. Client **không thấy gì**. |
| 1 node (vĩnh viễn) | Thay máy → bootstrap, kéo dữ liệu từ replica; anti-entropy/Merkle tree đồng bộ phần còn thiếu. |
| 1 AZ | Còn 2/3 replica → `W=2, R=2` vẫn chạy bình thường. Latency có thể nhích lên. |
| Toàn bộ 1 region | Cần multi-region từ trước. Nếu async thì **có mất dữ liệu** (RPO > 0) — phải nói rõ con số RPO. |
| Mạng bị chia cắt (split-brain) | AP → **cả hai phía đều nhận ghi**, hoà giải bằng vector clock/LWW khi nối lại. Đây là hành vi *cố ý*, không phải bug. |
| Coordinator chết giữa chừng | Client retry sang node khác. Thao tác phải **idempotent** — đây là lý do `put` nên mang version/context thay vì là lệnh "tăng thêm 1". |

---

## Bảng tổng kết: mục tiêu → kỹ thuật

Đây là bảng đáng thuộc lòng — nó là bộ khung để trả lời gần như mọi câu hỏi phụ của bài này.

| Mục tiêu | Kỹ thuật | Cơ chế cốt lõi |
|---|---|---|
| Lưu dữ liệu lớn (> 1 máy) | **Data partition** | Consistent hashing + virtual node |
| Đọc/ghi HA | **Data replication** | N bản sao trên N node khác nhau, trải qua nhiều AZ |
| Tính nhất quán điều chỉnh được | **Quorum consensus** | N/W/R, `W+R>N` ⇒ strong consistency |
| Giải quyết bất đồng giữa bản sao | **Versioning** | Vector clock (hoặc LWW/CRDT tuỳ nghiệp vụ) |
| Phát hiện node chết | **Gossip protocol** | Heartbeat lan truyền ngẫu nhiên, O(n) mỗi node, cần nhiều nguồn xác nhận |
| Chịu lỗi tạm thời | **Sloppy quorum + hinted handoff** | Ghi vào node khoẻ kế tiếp, trả lại khi node gốc sống |
| Chịu lỗi vĩnh viễn | **Anti-entropy** | Merkle tree — so hash O(log n), chỉ truyền phần lệch |
| Chịu mất datacenter | **Cross-DC replication** | Replica trải qua nhiều AZ/region |
| Ghi nhanh & bền | **Commit log + memtable** | Ghi tuần tự, ack tại RAM, replay khi khởi động lại |
| Đọc nhanh trên đĩa | **SSTable + bloom filter + sparse index** | Loại sớm file không chứa key, tránh chạm đĩa vô ích |
| Giữ đĩa và đọc không xấu đi | **Compaction** | Merge SSTable, vứt bản cũ và tombstone |

---

## Liên hệ sang AWS

| Thành phần thiết kế | Dịch vụ AWS | Vì sao hợp |
|---|---|---|
| Toàn bộ KV store managed | **DynamoDB** | Hậu duệ thương mại của Dynamo: partition key băm tự động, 3 bản sao qua 3 AZ, không phải vận hành node nào |
| Data partition | **DynamoDB partition key** | Key được băm để chọn partition — đúng consistent hashing nhưng ẩn hoàn toàn. Đổi lại **bạn không kiểm soát được hot partition**, phải tự lo bằng thiết kế key |
| Chọn mức consistency | **`ConsistentRead`** | `false` (mặc định) = eventually consistent, **rẻ bằng nửa** và nhanh hơn; `true` = strongly consistent, đọc từ leader replica, tốn 2× RCU và không dùng được với GSI |
| Cache trước KV store | **DAX** | Cache write-through in-memory ngay trước DynamoDB, **mili-giây → micro-giây**; DAX luôn phục vụ eventually consistent — `ConsistentRead=true` đi thẳng qua DAX, không được cache |
| Tự vận hành Dynamo-style | **Cassandra / ScyllaDB trên EC2** | Khi cần kiểm soát tận tay: N/W/R theo từng query, chiến lược compaction, tuning repair. Đổi lại **bạn gánh toàn bộ vận hành** |
| Cassandra nhưng managed | **Amazon Keyspaces** | API tương thích CQL, serverless, không phải chạy `nodetool repair`; đổi lại mất một số tuỳ chọn của Cassandra |
| Tầng cache / KV in-memory | **ElastiCache (Redis / Valkey / Memcached)** | Chính là "single-node KV store" ở Bước 4, có cluster mode để shard. Rất nhanh nhưng **không bền bằng** — hợp làm cache/session, không hợp làm nguồn sự thật |
| Storage lớp dưới cho dữ liệu lớn/nguội | **S3** | Value vượt 10 KB (tới hàng MB): lưu value trên S3, **lưu con trỏ S3 key trong DynamoDB** — pattern chuẩn vì item DynamoDB giới hạn 400 KB. S3 cũng là nơi đổ SSTable/snapshot của các hệ tách compute–storage |
| Multi-region active-active | **DynamoDB Global Tables** | Nhân bản đa hướng, hoà giải bằng **LWW** — chính đánh đổi ở Deep dive 3; phải chấp nhận có thể mất một ghi cạnh tranh |
| Gossip / phát hiện lỗi | Ẩn trong DynamoDB; tự lo với Cassandra trên EC2 | Với Cassandra tự quản: seed node, `phi_convict_threshold`, và **đặt rack = AZ** để `NetworkTopologyStrategy` trải replica đúng |
| Stream thay đổi ra ngoài | **DynamoDB Streams → Lambda** | Bắt mọi thay đổi để đổ sang search index/analytics, thay cho việc tự đọc commit log |
| Backup / point-in-time | **PITR** của DynamoDB; snapshot S3 với Cassandra | Anti-entropy sửa lệch giữa replica, **không cứu được lỗi logic của app** (ghi đè nhầm). Hai chuyện khác nhau, phải có cả hai |

**Khi nào chọn gì**: **DynamoDB** nếu muốn đổi khả năng tuỳ chỉnh lấy việc không phải vận hành gì; **Cassandra/Scylla trên EC2** nếu thật sự cần vặn N/W/R theo từng truy vấn, cần multi-region quorum tuỳ biến, hoặc muốn tránh khoá chặt vào một nhà cung cấp; **ElastiCache** nếu dữ liệu chịu mất được và cần micro-giây.


## Cách trình bày khi phỏng vấn / review

1. **Chốt scope trong 2 phút.** "Value nhỏ dưới 10 KB, chỉ get/put theo key, không range query, không transaction đa key" — nói rõ ba điều bạn *không* làm cũng quan trọng như ba điều bạn làm. Rồi hỏi ngay: *"availability hay consistency quan trọng hơn?"* Câu trả lời đó định hình cả bài.
2. **Đi từ một node.** Vẽ hash table, nói nó nhanh và đơn giản, rồi chỉ ra hai thứ giết nó: hết RAM/đĩa, và SPOF. Người phỏng vấn cần thấy bạn bị **ép** vào phân tán, chứ không phải vẽ Dynamo vì đã học thuộc.
3. **Ra số trước khi vẽ box.** "110 TB dữ liệu, ×3 replica ≈ 450 TB đĩa, ~128 node, ~330 MB/s traffic nhân bản nội bộ." Mỗi con số biện minh cho một component.
4. **Nói CAP cho đúng.** Đừng nói "chọn 2 trong 3". Nói: *"P là bắt buộc vì mạng sẽ đứt; câu hỏi thật là khi đứt thì hi sinh C hay A."* Đây là câu phân biệt người đọc hiểu với người học thuộc.
5. **Viết `N=3, W=2, R=2` lên bảng và giải thích pigeonhole.** Vẽ ba ô, khoanh tập ghi, khoanh tập đọc, chỉ vào chỗ giao. Ba mươi giây này đáng giá hơn ba phút lý thuyết.
6. **Thuộc ví dụ số của vector clock** — `D1([Sx,1]) → D2([Sx,2]) → D3/D4 sibling → D5 merge`. Đây là chỗ hay bị đào sâu nhất. Luôn kèm phần **giới hạn** (clock phình, đẩy phức tạp sang client) và câu *"không dùng timestamp vì clock skew làm mất ghi âm thầm"* — nêu được nhược điểm của chính giải pháp mình chọn là dấu hiệu Senior.
7. **Phân biệt rõ ba tầng sửa lỗi**: hinted handoff (giây–giờ) → read repair (dữ liệu nóng) → Merkle-tree anti-entropy (dữ liệu nguội). Nói được **vì sao cần cả ba** là điểm cộng lớn.
8. **Giải thích Merkle tree bằng chi phí, không bằng định nghĩa**: "hai replica giống nhau thì chỉ tốn 32 byte để biết điều đó, thay vì truyền 37 TB."
9. **Chủ động chuyển vào node internals**: commit log → memtable → SSTable → bloom filter → compaction, đóng lại bằng **"LSM đổi read amplification lấy write amplification, và đó là đánh đổi đúng cho hệ ưu tiên ghi luôn nhận được."**
10. **Nêu bottleneck trước khi bị hỏi.** Hot key là bottleneck số một — chuẩn bị sẵn ba cách gỡ (cache, salting, tách key).
11. **Khi review thiết kế của người khác**, hỏi đúng bốn câu: *"N/W/R là bao nhiêu và vì sao? Hai người ghi cùng lúc thì ai thắng? Node chết 3 ngày rồi quay lại thì dữ liệu về bằng cách nào? Đĩa còn trống bao nhiêu phần trăm?"* Bốn câu này chạm đúng bốn chỗ hay vỡ nhất trong thực tế.

> **Nguyên tắc cuối**: Toàn bộ bài này chỉ là một chuỗi nhân quả duy nhất — *dữ liệu quá lớn → phải chia → chia rồi máy sẽ chết → phải nhân bản → nhân bản rồi các bản sẽ lệch → phải có cách phát hiện và hoà giải*. Kể được đúng chuỗi đó thì không cần nhớ tên kỹ thuật nào cả: mỗi kỹ thuật sẽ tự xuất hiện đúng chỗ nó cần.
