# Bài 23 — Capstone: Thiết kế một distributed KV store

## 1. Mục tiêu
Đây là **dự án tổng kết**. Ta ghép mọi thứ đã học — partitioning, replication, quorum, consensus, CAP/PACELC, idempotency, failure handling — vào **một hệ thống thật**: một distributed key-value store kiểu Dynamo/Cassandra/Riak.

Sau bài này bạn có thể:
- Thiết kế đầy đủ một **distributed KV store** với API `get`/`put`, giải thích từng quyết định.
- Dùng **consistent hashing** để partition dữ liệu, **replication N=3** với **quorum W/R** để chịu lỗi.
- Tách hai mặt phẳng: **data plane** (đọc/ghi key, không cần consensus) và **control plane** (membership + partition map, dùng **Raft**).
- Xử lý **node join/leave** (rebalance), **node fail** (hinted handoff, read repair, anti-entropy).
- Lý luận **CP vs AP** theo **CAP/PACELC** và chọn cấu hình đúng cho từng use case.
- Làm cho **write idempotent** để retry an toàn khi mạng mất reply.

---

## 2. Đề bài & yêu cầu

Xây một KV store phục vụ session/cart/counter cho một hệ thương mại điện tử:
- **API tối thiểu:** `put(key, value)`, `get(key)`, `delete(key)`.
- **Quy mô:** hàng tỉ key, ~100 node, nhiều region; một node chết là chuyện thường ngày (**partial failure** — Bài 1).
- **Mục tiêu vận hành:** ghi/đọc p99 < 10ms, luôn nhận ghi kể cả khi vài node down, mất một node **không** mất dữ liệu.
- **Ràng buộc:** giá trị nhỏ (< 1MB), truy cập chủ yếu theo key (không cần range scan phức tạp lúc đầu).

Bốn câu hỏi thiết kế lớn, mỗi câu là một chương đã học:
1. Dữ liệu **nằm ở đâu**? → partitioning (consistent hashing).
2. Có **bao nhiêu bản sao** và đọc/ghi thế nào để chịu lỗi? → replication + quorum.
3. Ai giữ **sự thật về cụm** (ai còn sống, key nào ở node nào)? → coordination bằng Raft.
4. Khi **hỏng/thêm/bớt node** thì sao? → rebalance, hinted handoff, read repair.

---

## 3. Kiến trúc tổng thể — hai mặt phẳng

Sai lầm phổ biến của người mới: bắt **mọi** thao tác đi qua consensus (Raft/Paxos) cho "chắc ăn". Hậu quả: mọi `put` phải qua một leader → nghẽn, không scale, không AP được. Bài học cốt lõi của capstone: **tách hai mặt phẳng**.

<svg viewBox="0 0 700 300" role="img" aria-labelledby="arch-t arch-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="arch-t">Kiến trúc hai mặt phẳng: control plane (Raft) và data plane (quorum)</title>
<desc id="arch-d">Control plane dùng Raft giữ membership và partition map, data plane dùng quorum để đọc ghi key không qua leader</desc>
<rect x="20" y="20" width="660" height="110" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="40" y="45" font-size="13" fill="currentColor">Control plane — Raft (ít ghi, phải nhất quán mạnh)</text>
<rect x="45" y="60" width="150" height="55" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="83" text-anchor="middle" font-size="11" fill="currentColor">Membership</text>
<text x="120" y="100" text-anchor="middle" font-size="11" fill="currentColor">(ai còn sống)</text>
<rect x="215" y="60" width="150" height="55" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="290" y="83" text-anchor="middle" font-size="11" fill="currentColor">Partition map</text>
<text x="290" y="100" text-anchor="middle" font-size="11" fill="currentColor">(hash ring)</text>
<rect x="385" y="60" width="270" height="55" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="520" y="83" text-anchor="middle" font-size="11" fill="currentColor">Raft group 3-5 node, replicate log</text>
<text x="520" y="100" text-anchor="middle" font-size="11" fill="currentColor">version của map tăng đơn điệu</text>
<rect x="20" y="165" width="660" height="115" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="40" y="190" font-size="13" fill="currentColor">Data plane — quorum W/R (nhiều ghi, ưu tiên sẵn sàng)</text>
<rect x="45" y="205" width="120" height="55" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="235" text-anchor="middle" font-size="12" fill="currentColor">Node 1</text>
<rect x="185" y="205" width="120" height="55" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="245" y="235" text-anchor="middle" font-size="12" fill="currentColor">Node 2</text>
<rect x="325" y="205" width="120" height="55" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="385" y="235" text-anchor="middle" font-size="12" fill="currentColor">Node 3</text>
<text x="565" y="230" text-anchor="middle" font-size="11" fill="currentColor">... N node</text>
<text x="565" y="248" text-anchor="middle" font-size="11" fill="currentColor">peer-to-peer</text>
<line x1="290" y1="130" x2="290" y2="165" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#av)"/>
<text x="300" y="152" font-size="10" fill="currentColor">node đọc map</text>
<defs><marker id="av" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

- **Control plane** thay đổi hiếm (chỉ khi node join/leave/chết) nhưng **phải nhất quán tuyệt đối** — cả cụm không được bất đồng về "key X thuộc node nào". Đây là bài toán **consensus** → dùng **Raft** cho một nhóm nhỏ 3–5 node giữ **partition map** có version tăng đơn điệu.
- **Data plane** thay đổi liên tục (mỗi `put`/`get`) và **ưu tiên sẵn sàng + latency thấp**. Nó **không** qua Raft; mỗi request được một **coordinator** xử lý bằng **quorum** trực tiếp tới các replica. Đây chính là mô hình **Dynamo**.

Nguyên tắc vàng: **dùng consensus cho metadata ít-thay-đổi, dùng quorum cho data nhiều-thay-đổi.** Đừng bắt đường ghi nóng đi qua một leader.

---

## 4. Partitioning bằng consistent hashing

Ta có tỉ key và ~100 node. Cách ngây thơ `node = hash(key) % N` chết ngay khi N đổi: thêm/bớt một node là **gần như toàn bộ key phải di chuyển** (Bài về partitioning). Giải pháp: **consistent hashing** — băm cả key **và** node lên cùng một **vòng tròn** `[0, 2^64)`.

- Mỗi key đi **thuận chiều kim đồng hồ** tới node đầu tiên gặp → đó là node "chủ" của key.
- Thêm/bớt một node chỉ ảnh hưởng **một cung** kề nó, ~`K/N` key di chuyển thay vì gần hết.
- Để phân bố đều và tránh hotspot, mỗi node vật lý đặt **nhiều virtual node** (vnode, ví dụ 128–256 token) rải khắp vòng. Node mạnh hơn → nhiều vnode hơn → nhận nhiều dữ liệu hơn.

<svg viewBox="0 0 640 360" role="img" aria-labelledby="ring-t ring-d" style="width:100%;max-width:560px;height:auto;display:block;margin:1.25rem auto">
<title id="ring-t">Consistent hashing ring với replication N=3 theo chiều kim đồng hồ</title>
<desc id="ring-d">Key băm lên vòng tròn, đi thuận chiều kim đồng hồ tới node chủ rồi hai node kế tiếp làm bản sao</desc>
<circle cx="320" cy="180" r="130" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 4"/>
<circle cx="320" cy="50" r="9" fill="#3b82f6" fill-opacity="0.4" stroke="currentColor"/>
<text x="320" y="34" text-anchor="middle" font-size="12" fill="currentColor">Node A</text>
<circle cx="450" cy="180" r="9" fill="#10b981" fill-opacity="0.4" stroke="currentColor"/>
<text x="486" y="184" text-anchor="middle" font-size="12" fill="currentColor">Node B</text>
<circle cx="320" cy="310" r="9" fill="#f59e0b" fill-opacity="0.4" stroke="currentColor"/>
<text x="320" y="332" text-anchor="middle" font-size="12" fill="currentColor">Node C</text>
<circle cx="190" cy="180" r="9" fill="#8b5cf6" fill-opacity="0.4" stroke="currentColor"/>
<text x="150" y="184" text-anchor="middle" font-size="12" fill="currentColor">Node D</text>
<circle cx="392" cy="83" r="6" fill="#f43f5e" fill-opacity="0.6" stroke="currentColor"/>
<text x="410" y="70" text-anchor="middle" font-size="11" fill="currentColor">key k</text>
<path d="M 400 92 A 70 70 0 0 1 444 168" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#ar)"/>
<text x="320" y="175" text-anchor="middle" font-size="11" fill="currentColor">hash(k) rơi giữa A và B</text>
<text x="320" y="193" text-anchor="middle" font-size="11" fill="currentColor">chủ = B, bản sao = C, D</text>
<text x="320" y="211" text-anchor="middle" font-size="11" fill="currentColor">(N=3, đi thuận chiều)</text>
<defs><marker id="ar" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Partition map (bảng "token → node") là **artifact do control plane quản lý**. Mọi node cache bản đồ này kèm **version**; khi map đổi (rebalance), version tăng, node lan truyền và đồng bộ.

---

## 5. Replication N=3 & quorum W/R

Một bản sao là không đủ: node đó chết là mất key. Ta chọn **replication factor N=3** — mỗi key lưu ở **3 node liên tiếp** trên vòng (gọi là **preference list** của key). N=3 là điểm cân bằng kinh điển: chịu được **1 node chết mà vẫn còn đa số**, tốn 3x dung lượng (chấp nhận được).

Nhưng ghi cả 3 rồi mới trả lời thì một node chậm/chết làm treo ghi. Giải pháp: **quorum**. Đặt:
- **W** = số replica phải **ack** thì `put` coi là thành công.
- **R** = số replica phải **trả lời** thì `get` coi là hợp lệ.

**Bất biến then chốt:** nếu **W + R > N** thì tập replica đã-ghi và tập replica được-đọc **luôn giao nhau** ≥ 1 node → đọc luôn "chạm" được bản mới nhất (**read-your-writes** ở mức quorum). Đây là công cụ để trượt trên trục CAP.

| Cấu hình (N=3) | W | R | Ý nghĩa | Đặc tính |
|---|---|---|---|---|
| **Strong-ish (CP nghiêng)** | 3 | 1 | ghi cả 3, đọc 1 | đọc nhanh, ghi kém sẵn sàng (1 node down → ghi fail) |
| **Cân bằng (khuyên dùng)** | 2 | 2 | W+R=4 > 3 | chịu 1 node chết cho **cả** đọc lẫn ghi; overlap đảm bảo |
| **AP nghiêng (sẵn sàng cao)** | 1 | 1 | ghi 1, đọc 1 | luôn nhận ghi kể cả mất kết nối, **có thể đọc cũ** (W+R ≤ N) |
| **Đọc nặng** | 3 | 1 | — | tối ưu đọc, ghi đắt |

**W=2, R=2 với N=3** là mặc định vàng: `W+R=4 > 3`, mỗi phía chỉ cần 2/3 node → chịu được đúng 1 node bất kỳ down mà đọc/ghi vẫn chạy và vẫn thấy nhau.

### Luồng một `put(key,val)` với W=2

<svg viewBox="0 0 680 260" role="img" aria-labelledby="wr-t wr-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="wr-t">Luồng ghi quorum W=2 với coordinator gửi tới 3 replica</title>
<desc id="wr-d">Coordinator gửi ghi tới ba replica, chỉ cần hai ack là trả về thành công cho client, replica thứ ba theo sau</desc>
<rect x="20" y="110" width="90" height="44" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="65" y="137" text-anchor="middle" font-size="12" fill="currentColor">Client</text>
<rect x="150" y="110" width="120" height="44" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="210" y="132" text-anchor="middle" font-size="11" fill="currentColor">Coordinator</text>
<text x="210" y="147" text-anchor="middle" font-size="10" fill="currentColor">(1 node bất kỳ)</text>
<line x1="110" y1="132" x2="148" y2="132" stroke="currentColor" stroke-width="1.5" marker-end="url(#aw)"/>
<text x="129" y="124" text-anchor="middle" font-size="9" fill="currentColor">put</text>
<rect x="330" y="30" width="110" height="40" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="385" y="55" text-anchor="middle" font-size="11" fill="currentColor">Replica 1 ✓</text>
<rect x="330" y="112" width="110" height="40" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="385" y="137" text-anchor="middle" font-size="11" fill="currentColor">Replica 2 ✓</text>
<rect x="330" y="194" width="110" height="40" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="385" y="214" text-anchor="middle" font-size="11" fill="currentColor">Replica 3</text>
<text x="385" y="228" text-anchor="middle" font-size="9" fill="currentColor">(chậm/theo sau)</text>
<line x1="270" y1="128" x2="328" y2="55" stroke="currentColor" stroke-width="1.5" marker-end="url(#aw)"/>
<line x1="270" y1="132" x2="328" y2="132" stroke="currentColor" stroke-width="1.5" marker-end="url(#aw)"/>
<line x1="270" y1="136" x2="328" y2="205" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#aw)"/>
<text x="470" y="90" font-size="10" fill="#10b981">2 ack đủ W=2</text>
<text x="470" y="108" font-size="10" fill="currentColor">→ trả OK ngay,</text>
<text x="470" y="124" font-size="10" fill="currentColor">không đợi replica 3</text>
<defs><marker id="aw" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Bất kỳ node nào cũng có thể làm **coordinator**: nó tra partition map, tìm preference list của key, fan-out tới N replica, đợi W ack rồi trả về. Client không cần biết topology.

---

## 6. Xung đột & giải quyết: version, không dùng wall-clock

Với AP (W+R ≤ N) hai client có thể ghi **đồng thời** hai giá trị khác nhau cho cùng key ở hai replica khác nhau → **conflict**. Đừng dùng "last write wins theo đồng hồ tường" ngây thơ: **clock lệch** (Bài 1 — không có đồng hồ chung) khiến ghi mới bị ghi cũ đè.

Hai lựa chọn chuẩn:
- **Vector clock / version vector**: gắn mỗi giá trị một vector `{node: counter}`. Khi đọc, nếu hai version **không so sánh được** (concurrent) → trả **cả hai (siblings)** để tầng ứng dụng merge (ví dụ union giỏ hàng). Dynamo chọn cách này — không bao giờ mất ghi, nhưng ứng dụng phải biết merge.
- **LWW với logical/hybrid timestamp**: đơn giản hơn, dùng khi merge không quan trọng (session, cache). Cassandra dùng cell-level LWW nhưng với timestamp cẩn thận.

Điểm mấu chốt: **thứ tự nhân-quả phải suy ra từ version, không từ giờ giấc.**

---

## 7. Xử lý node fail — vẫn nhận ghi & tự lành

Node chết là **bình thường**, không phải ngoại lệ. Ba cơ chế phối hợp:

### 7.1 Hinted handoff — không chặn ghi khi replica down
Nếu một trong N replica đích đang chết, coordinator vẫn ghi đủ W bằng cách gửi bản ghi tới một node **thay thế tạm** (fallback) kèm **hint** "cái này vốn thuộc về node X". Khi X sống lại, node tạm **handoff** dữ liệu về đúng chỗ rồi xoá bản tạm. → giữ **sẵn sàng ghi** (AP) qua sự cố tạm thời.

### 7.2 Read repair — sửa lỗi trên đường đọc
Khi `get` với R replica, nếu thấy chúng **bất đồng** (một node có version cũ), coordinator trả về bản mới nhất cho client **và** âm thầm ghi bản mới xuống node bị cũ. Sửa lỗi "miễn phí" trên traffic đọc nóng.

### 7.3 Anti-entropy (Merkle tree) — quét nền bù chỗ ít đọc
Key hiếm khi đọc sẽ không được read repair. Nền chạy so **Merkle tree** giữa các replica: cây băm cho phép tìm nhánh khác nhau mà không cần so từng key → chỉ đồng bộ đúng phần lệch. Bù trôi dạt dài hạn.

<svg viewBox="0 0 680 210" role="img" aria-labelledby="heal-t heal-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="heal-t">Ba lớp tự lành: hinted handoff, read repair, anti-entropy</title>
<desc id="heal-d">Ba cơ chế phối hợp giữ dữ liệu hội tụ khi node chết và sống lại</desc>
<rect x="20" y="40" width="200" height="130" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="65" text-anchor="middle" font-size="12" fill="currentColor">1. Hinted handoff</text>
<text x="120" y="92" text-anchor="middle" font-size="10" fill="currentColor">lúc GHI, replica down</text>
<text x="120" y="110" text-anchor="middle" font-size="10" fill="currentColor">→ ghi tạm nơi khác</text>
<text x="120" y="128" text-anchor="middle" font-size="10" fill="currentColor">+ hint, trả về nhà sau</text>
<text x="120" y="150" text-anchor="middle" font-size="10" fill="currentColor">giữ sẵn sàng ghi</text>
<rect x="240" y="40" width="200" height="130" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="340" y="65" text-anchor="middle" font-size="12" fill="currentColor">2. Read repair</text>
<text x="340" y="92" text-anchor="middle" font-size="10" fill="currentColor">lúc ĐỌC, thấy lệch</text>
<text x="340" y="110" text-anchor="middle" font-size="10" fill="currentColor">→ ghi bản mới xuống</text>
<text x="340" y="128" text-anchor="middle" font-size="10" fill="currentColor">node cũ ngay</text>
<text x="340" y="150" text-anchor="middle" font-size="10" fill="currentColor">sửa trên traffic nóng</text>
<rect x="460" y="40" width="200" height="130" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="560" y="65" text-anchor="middle" font-size="12" fill="currentColor">3. Anti-entropy</text>
<text x="560" y="92" text-anchor="middle" font-size="10" fill="currentColor">NỀN, Merkle tree</text>
<text x="560" y="110" text-anchor="middle" font-size="10" fill="currentColor">so cây băm giữa replica</text>
<text x="560" y="128" text-anchor="middle" font-size="10" fill="currentColor">đồng bộ nhánh lệch</text>
<text x="560" y="150" text-anchor="middle" font-size="10" fill="currentColor">bù key ít đọc</text>
</svg>

Ba lớp này cho **eventual consistency**: kể cả AP, sau khi sự cố qua đi, mọi replica **hội tụ** về cùng giá trị.

---

## 8. Node join/leave — rebalance an toàn

Khi thêm node mới (mở rộng) hoặc rút node (bảo trì), partition map đổi. Quy trình do **control plane (Raft)** điều phối để cả cụm nhất quán:

1. **Cấp token cho node mới** trên vòng (nhiều vnode) → node mới "nhận trách nhiệm" một số cung.
2. **Streaming dữ liệu**: các cung đó được copy từ node cũ sang node mới **ở nền**, trong khi node cũ vẫn phục vụ (không downtime).
3. **Chuyển ownership**: khi stream xong, control plane publish **partition map version mới**; từ đó request cho cung đó đi thẳng node mới.
4. **Dọn dẹp**: node cũ xoá dữ liệu không còn thuộc về nó.

Nhờ consistent hashing + vnode, mỗi lần join/leave chỉ di chuyển ~`1/N` dữ liệu, và rải đều từ **nhiều** node nguồn (không dồn tải lên một node). Việc thay đổi map là **một quyết định consensus** nên không có chuyện hai node bất đồng về "ai sở hữu cung này" — đây chính là lý do metadata phải qua Raft.

---

## 9. Idempotency cho write — retry an toàn

Nhớ Bài 1: khi `put` timeout, client **không biết** ghi đã vào chưa (reply có thể bị mất). Nó sẽ **retry**. Nếu `put` không idempotent → ghi lặp (counter tăng 2 lần, cùng một event append 2 lần).

Cách làm cho ghi an toàn khi retry:
- **Key-value ghi đè (put)** vốn **tự nhiên idempotent** về nội dung: `put(k, v)` hai lần cho cùng trạng thái cuối. **Nhưng** với version vector, retry mù có thể tạo sibling giả → cần **write id**.
- **Idempotency key**: client sinh một `request-id` (UUID) cho mỗi thao tác *logic*, gửi kèm mọi lần retry. Coordinator dedup: nếu đã thấy `request-id` này → trả về kết quả cũ, không áp dụng lại. Bắt buộc cho thao tác **không** ghi đè thuần (increment, append, delete-if-exists).
- **Conditional put (CAS)**: `put(k, v, if-version = V)` chỉ ghi nếu version hiện tại đúng V → biến "increment" thành thao tác có thể retry mà không cộng dồn.

```text
# Giao thức ghi idempotent (client tự sinh id, retry cùng id)
PUT /kv/cart:42
  Idempotency-Key: 6f1c...e9   # cố định qua mọi lần retry của CÙNG thao tác
  If-Match: "v7"               # tuỳ chọn: chỉ ghi nếu version hiện là v7
  body: {"items": [...]}

# Coordinator:
#  1. Nếu Idempotency-Key đã xử lý -> trả kết quả đã lưu (không áp dụng lại)
#  2. Kiểm If-Match: version != v7 -> 409 Conflict (client đọc lại rồi thử)
#  3. Ghi tới N replica, đợi W ack, lưu (Idempotency-Key -> kết quả) có TTL
```

Quy tắc: **mọi mutation qua mạng phải trả lời được câu "nếu client gửi lại y hệt thì sao?"** — bằng put-đè, idempotency key, hoặc CAS.

---

## 10. Chọn CP hay AP — CAP & PACELC cho chính hệ này

Khi mạng **phân mảnh** (partition — hai nửa cụm không thấy nhau), theo **CAP** ta **buộc phải chọn**:

<svg viewBox="0 0 680 250" role="img" aria-labelledby="cap-t cap-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="cap-t">Lựa chọn CP và AP khi xảy ra network partition</title>
<desc id="cap-d">Khi mạng phân mảnh, cấu hình CP từ chối phục vụ để giữ nhất quán, cấu hình AP vẫn phục vụ nhưng chấp nhận đọc cũ</desc>
<line x1="340" y1="20" x2="340" y2="230" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<text x="340" y="14" text-anchor="middle" font-size="11" fill="#f43f5e">network partition</text>
<rect x="30" y="40" width="270" height="180" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="165" y="66" text-anchor="middle" font-size="13" fill="currentColor">CP — chọn Consistency</text>
<text x="165" y="94" text-anchor="middle" font-size="11" fill="currentColor">W=3 hoặc quorum chặt</text>
<text x="165" y="116" text-anchor="middle" font-size="11" fill="currentColor">nửa thiểu số KHÔNG đủ</text>
<text x="165" y="138" text-anchor="middle" font-size="11" fill="currentColor">quorum → từ chối ghi</text>
<text x="165" y="162" text-anchor="middle" font-size="11" fill="currentColor">không bao giờ đọc cũ,</text>
<text x="165" y="184" text-anchor="middle" font-size="11" fill="currentColor">nhưng mất sẵn sàng</text>
<text x="165" y="206" text-anchor="middle" font-size="10" fill="currentColor">dùng cho: số dư, tồn kho</text>
<rect x="380" y="40" width="270" height="180" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="515" y="66" text-anchor="middle" font-size="13" fill="currentColor">AP — chọn Availability</text>
<text x="515" y="94" text-anchor="middle" font-size="11" fill="currentColor">W=1,R=1 + hinted handoff</text>
<text x="515" y="116" text-anchor="middle" font-size="11" fill="currentColor">cả hai nửa vẫn nhận ghi</text>
<text x="515" y="138" text-anchor="middle" font-size="11" fill="currentColor">có thể đọc cũ / sinh</text>
<text x="515" y="160" text-anchor="middle" font-size="11" fill="currentColor">sibling, hội tụ sau</text>
<text x="515" y="184" text-anchor="middle" font-size="11" fill="currentColor">luôn phục vụ</text>
<text x="515" y="206" text-anchor="middle" font-size="10" fill="currentColor">dùng cho: cart, session</text>
</svg>

Nhưng partition **hiếm**. Phần lớn thời gian mạng **ổn**, và **PACELC** nhắc câu hỏi thực tế hơn: *Else (khi không có partition), chọn Latency hay Consistency?*
- **PC/EC** (ví dụ ép W=3, R=3): nhất quán cả khi partition lẫn bình thường, nhưng **latency cao** (đợi tất cả) và kém sẵn sàng.
- **PA/EL** (Dynamo, Cassandra mặc định): khi partition ưu tiên sẵn sàng, khi bình thường ưu tiên **latency thấp** (W=1/R=1) — đổi lại đọc có thể hơi cũ.
- **PA/EC** (W=2,R=2): partition thì nghiêng sẵn sàng ở mức "1 node chết vẫn chạy", bình thường thì quorum giao nhau cho nhất quán tốt — **cân bằng thực dụng**.

**Quyết định cho đề bài này (đa dịch vụ, một store):** làm store **cấu hình được per-key-space**.
- **Cart/session** → **PA/EL** (W=1,R=1, merge siblings): tuyệt đối không được từ chối "thêm vào giỏ".
- **Số dư ví / tồn kho** → **CP** hoặc **PC/EC** (quorum chặt hoặc route qua Raft group riêng): thà lỗi còn hơn bán âm kho.
- **Mặc định** → **PA/EC** (N=3, W=2, R=2).

Đây là bài học lớn nhất của capstone: **không có một cấu hình đúng cho mọi thứ; consistency là một cái núm (knob) chỉnh theo yêu cầu nghiệp vụ của từng loại dữ liệu.**

---

## 11. Ghép lại — vòng đời một request

`put(cart:42, {...})` với N=3, W=2:
1. Client gửi tới node bất kỳ + `Idempotency-Key`.
2. Node đó thành **coordinator**: tra **partition map** (từ control plane) → preference list `[B, C, D]`.
3. Fan-out ghi tới B, C, D. B, C ack (W=2 đủ) → trả **OK** cho client; D chậm sẽ bắt kịp qua read repair/anti-entropy. Nếu D đang chết → **hinted handoff** sang node tạm.
4. Sau đó `get(cart:42)` với R=2: coordinator hỏi 2/3 replica; nếu lệch version → **read repair** + trả bản mới (hoặc siblings để app merge).
5. Nửa đêm node E được thêm vào → control plane cấp token, stream cung liên quan, publish **map version mới**; rebalance ~1/N dữ liệu, không downtime.

Mọi mảnh ghép của khoá học nằm ở đây: fallacy/partial failure (§2,§9) → partitioning (§4) → replication+quorum (§5) → consensus cho metadata (§3,§8) → conflict/clock (§6) → failure handling (§7) → CAP/PACELC (§10) → idempotency (§9).

---

## 12. Tóm tắt
- **Tách hai mặt phẳng:** control plane (**Raft**, membership + partition map, ít ghi, nhất quán mạnh) vs data plane (**quorum**, đọc/ghi key, nhiều ghi, sẵn sàng cao). Đừng bắt đường ghi nóng qua leader.
- **Consistent hashing + vnode** để partition: thêm/bớt node chỉ dời ~1/N dữ liệu, phân bố đều, tránh hotspot.
- **N=3, quorum W/R với W+R>N** cho overlap; **W=2,R=2** là mặc định vàng (chịu 1 node down cả đọc lẫn ghi).
- **Xung đột giải bằng version vector**, không bằng wall-clock; concurrent → siblings để app merge.
- **Tự lành 3 lớp:** hinted handoff (giữ ghi khi replica down), read repair (sửa lúc đọc), anti-entropy/Merkle (bù nền) → eventual consistency.
- **Join/leave** điều phối qua Raft: cấp token → stream nền → đổi map version → dọn dẹp, không downtime.
- **Idempotency** bắt buộc: put-đè, **Idempotency-Key**, hoặc **CAS (If-Match)** để retry an toàn khi timeout.
- **CAP/PACELC là cái núm per-key-space:** cart/session → PA/EL; số dư/tồn kho → CP/PC-EC; mặc định PA/EC. **Consistency chỉnh theo nghiệp vụ, không one-size-fits-all.**

> Bạn vừa thiết kế lại Dynamo/Cassandra từ các nguyên lý gốc — mọi khái niệm trong khoá học đã hội tụ vào một hệ thống chạy được.
