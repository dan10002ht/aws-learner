# Bài 12 — Rebalancing & request routing

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **rebalancing** là gì và vì sao nó là bài toán *không thể tránh* của mọi hệ có partition.
- Nói rõ **vì sao KHÔNG bao giờ dùng `hash mod N`** để gán partition cho node — và ba chiến lược đúng: **fixed number of partitions**, **dynamic partitioning**, **partition proportional to nodes**.
- Phân biệt ba kiểu **request routing**: client-aware, routing tier/proxy, node forwarding — ai giữ bản đồ "partition nào ở node nào".
- Dùng **service discovery & coordination** (ZooKeeper / etcd / gossip) để phát tán bản đồ đó một cách nhất quán khi topology thay đổi.

---

## 2. Lý thuyết

### 2.1 Đặt lại vấn đề: partition không đứng yên

Bài trước ta đã chia dữ liệu thành **partition** (còn gọi shard). Nhưng cluster là thứ *sống*: node mới thêm vào để tăng scale, node cũ chết cần thay, một node "nóng" cần san tải. Mỗi lần như vậy, **partition phải được di chuyển giữa các node** — đó chính là **rebalancing**.

> **Rebalancing** = quá trình di chuyển tải (partition + dữ liệu của nó) từ node này sang node khác để giữ cluster cân bằng khi số node hoặc phân bố tải thay đổi.

Một rebalance *tốt* phải thoả bốn yêu cầu, và chúng thường xung đột nhau:

| Yêu cầu | Ý nghĩa |
|---------|---------|
| **Cân bằng sau khi xong** | Tải & dữ liệu chia đều trên các node |
| **Vẫn phục vụ khi đang chạy** | Không được "khoá" cả hệ để di dời; đọc/ghi vẫn chạy |
| **Di chuyển tối thiểu** | Chỉ chuyển đúng phần cần thiết — chuyển thừa tốn băng thông đĩa & mạng, gây quá tải |
| **Xác định & kiểm soát được** | Không tự phát rebalance ồ ạt lúc chỉ đang nghi ngờ một node chết (chống *rebalance storm*) |

Chìa khoá của cả bài là yêu cầu thứ ba: **di chuyển tối thiểu**. Và đó là lý do đầu tiên khiến `hash mod N` bị loại.

### 2.2 Vì sao KHÔNG dùng `hash mod N`

Cách ngây thơ nhất để gán key vào node: có `N` node, tính `node = hash(key) % N`. Nó gọn, phân bố đều — và **sai về bản chất khi N thay đổi**.

Vấn đề: `% N` gắn cứng ánh xạ vào *số node hiện tại*. Đổi `N` (thêm/bớt 1 node) là **đổi mẫu số**, làm hầu như **mọi key** nhảy sang node khác.

<svg viewBox="0 0 700 250" role="img" aria-labelledby="mod-t mod-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="mod-t">hash mod N: thêm 1 node làm gần như mọi key phải di chuyển</title>
<desc id="mod-d">Bảng so sánh node đích của cùng các key khi N bằng 4 và khi N bằng 5, đa số ô đổi màu</desc>
<text x="60" y="30" font-size="13" fill="currentColor">key</text>
<text x="60" y="70" font-size="12" fill="currentColor">hash%4</text>
<text x="60" y="190" font-size="12" fill="currentColor">hash%5</text>
<rect x="130" y="15" width="90" height="200" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="175" y="35" text-anchor="middle" font-size="12" fill="currentColor">k=17</text>
<text x="175" y="70" text-anchor="middle" font-size="14" fill="currentColor">node 1</text>
<text x="175" y="190" text-anchor="middle" font-size="14" fill="#f43f5e">node 2</text>
<rect x="230" y="15" width="90" height="200" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="275" y="35" text-anchor="middle" font-size="12" fill="currentColor">k=8</text>
<text x="275" y="70" text-anchor="middle" font-size="14" fill="currentColor">node 0</text>
<text x="275" y="190" text-anchor="middle" font-size="14" fill="#f43f5e">node 3</text>
<rect x="330" y="15" width="90" height="200" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="375" y="35" text-anchor="middle" font-size="12" fill="currentColor">k=14</text>
<text x="375" y="70" text-anchor="middle" font-size="14" fill="currentColor">node 2</text>
<text x="375" y="190" text-anchor="middle" font-size="14" fill="#f43f5e">node 4</text>
<rect x="430" y="15" width="90" height="200" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="475" y="35" text-anchor="middle" font-size="12" fill="currentColor">k=6</text>
<text x="475" y="70" text-anchor="middle" font-size="14" fill="currentColor">node 2</text>
<text x="475" y="190" text-anchor="middle" font-size="14" fill="#f43f5e">node 1</text>
<text x="600" y="70" text-anchor="middle" font-size="12" fill="currentColor">N=4</text>
<text x="600" y="190" text-anchor="middle" font-size="12" fill="currentColor">N=5</text>
<text x="350" y="245" text-anchor="middle" font-size="12" fill="#f43f5e">~N/(N+1) số key phải copy sang node mới — quá tốn kém</text>
</svg>

Về mặt toán: khi đi từ `N` sang `N+1`, chỉ khoảng `1/(N+1)` số key giữ nguyên node; phần còn lại (~`N/(N+1)`) phải **di chuyển dữ liệu vật lý**. Với cluster đang chạy, đó là một cơn bão copy: đĩa I/O bão hoà, cache lạnh toàn bộ, latency tăng vọt — đúng lúc bạn đang cố *mở rộng* để giảm tải. `hash mod N` phân bố tốt nhưng **rebalance thảm hoạ**, nên bị loại.

Điều ta cần: một cơ chế **tách rời "key thuộc partition nào" khỏi "partition nằm ở node nào"**. Chỉ khi đó, thêm node mới chỉ di chuyển *một phần nhỏ* partition. Ba chiến lược dưới đây đều là hiện thân của ý tưởng tách rời này.

### 2.3 Chiến lược 1 — Fixed number of partitions (số partition cố định)

Tạo **nhiều partition hơn hẳn số node** ngay từ đầu, rồi cố định con số đó suốt vòng đời cluster. Ví dụ: 10 node nhưng tạo **1000 partition** → mỗi node giữ ~100 partition.

Khi thêm node thứ 11: node mới *"ăn cắp"* vài partition từ mỗi node cũ cho đến khi lại cân bằng (~91 partition/node). **Ranh giới key→partition không đổi**; chỉ ánh xạ **partition→node** thay đổi, và chỉ những partition được chọn mới phải copy.

<svg viewBox="0 0 700 220" role="img" aria-labelledby="fix-t fix-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="fix-t">Fixed partitions: node mới lấy vài partition từ mỗi node cũ</title>
<desc id="fix-d">Ba node mỗi node giữ nhiều partition, node thứ tư thêm vào lấy một phần từ mỗi node cũ</desc>
<rect x="20" y="30" width="150" height="70" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="22" text-anchor="middle" font-size="12" fill="currentColor">Node A (giữ p0..p9)</text>
<text x="95" y="70" text-anchor="middle" font-size="12" fill="currentColor">p0 p1 p2 p3 …</text>
<rect x="190" y="30" width="150" height="70" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="265" y="22" text-anchor="middle" font-size="12" fill="currentColor">Node B</text>
<text x="265" y="70" text-anchor="middle" font-size="12" fill="currentColor">p10 p11 p12 …</text>
<rect x="360" y="30" width="150" height="70" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="435" y="22" text-anchor="middle" font-size="12" fill="currentColor">Node C</text>
<text x="435" y="70" text-anchor="middle" font-size="12" fill="currentColor">p20 p21 p22 …</text>
<rect x="530" y="140" width="150" height="60" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="605" y="132" text-anchor="middle" font-size="12" fill="currentColor">Node D (mới)</text>
<text x="605" y="175" text-anchor="middle" font-size="12" fill="currentColor">nhận p3, p12, p22</text>
<line x1="95" y1="100" x2="560" y2="140" stroke="#f43f5e" stroke-width="1.3" marker-end="url(#fa)"/>
<line x1="265" y1="100" x2="580" y2="140" stroke="#f43f5e" stroke-width="1.3" marker-end="url(#fa)"/>
<line x1="435" y1="100" x2="600" y2="140" stroke="#f43f5e" stroke-width="1.3" marker-end="url(#fa)"/>
<defs><marker id="fa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#f43f5e"/></marker></defs>
</svg>

**Ưu điểm:** đơn giản, ánh xạ key→partition (thường là `hash(key) % P` với P cố định) *không bao giờ* đổi → chỉ di chuyển đúng phần cần. **Đây là cách Elasticsearch, Riak, Couchbase, Citus dùng.**

**Nhược điểm — chọn P là quyết định một chiều:**
- P quá **thấp** → giới hạn scale (không thể có nhiều node hơn số partition; mỗi partition quá to, khó chia).
- P quá **cao** → mỗi partition có overhead (metadata, file, quản lý routing, index); hàng trăm nghìn partition rỗng cũng tốn.
- Đổi P sau này = *re-partition toàn bộ* (đắt như `mod N`), nên thực tế người ta chọn P dư dả ngay từ đầu (ví dụ Elasticsearch: `number_of_shards` cố định lúc tạo index, muốn đổi phải reindex).

### 2.4 Chiến lược 2 — Dynamic partitioning (partition động)

Thay vì cố định số partition, để nó **tự tách/gộp theo lượng dữ liệu**. Đây là cách của các datastore **key-range** như **HBase, MongoDB (sharded), Bigtable, CockroachDB, TiKV**.

Cơ chế:
- Một partition khi **vượt ngưỡng** (ví dụ HBase: `hbase.hregion.max.filesize` ~ 10 GB) sẽ **split** thành hai partition, mỗi cái ôm nửa khoảng key.
- Một partition **teo lại** (do xoá nhiều) có thể **merge** với hàng xóm.
- Sau split, một trong hai nửa có thể được chuyển sang node khác để cân bằng.

**Ưu điểm:** số partition **thích ứng với dữ liệu** — dataset nhỏ thì ít partition (ít overhead), dataset lớn thì nhiều partition tự động. Hợp với dữ liệu có key-range (query theo khoảng: `WHERE ts BETWEEN ...`).

**Nhược điểm & cạm bẫy:**
- Lúc dataset còn nhỏ, chỉ có **1 partition** → tất cả ghi dồn vào **1 node** cho tới khi đủ lớn để split. Đây là *hotspot khởi đầu*. Cách chữa: **pre-splitting** — khai báo trước các điểm cắt để cluster khởi động đã có nhiều partition.
- Split là thao tác nặng, cần coordination để không bị hai node cùng nghĩ mình sở hữu một khoảng key.

```
# HBase — pre-split một bảng thành 4 region ngay khi tạo,
# tránh hotspot ghi dồn vào 1 region lúc đầu
create 'events', 'cf',
  { NUMREGIONS => 4, SPLITALGO => 'HexStringSplit' }

# hoặc chỉ định trực tiếp điểm cắt (split keys)
create 'events', 'cf',
  SPLITS => ['20260401', '20260701', '20261001']
```

```javascript
// MongoDB — bật sharding + pre-split trước khi nạp tải lớn
sh.enableSharding("app")
sh.shardCollection("app.events", { userId: "hashed" })  // hashed shard key: rải đều, tránh hotspot theo thời gian
// MongoDB tự chia "chunk" (~mặc định 128MB) và balancer di chuyển chunk giữa shard
```

### 2.5 Chiến lược 3 — Partitioning proportional to nodes (số partition tỉ lệ số node)

Ở hai chiến lược trên, số partition độc lập với số node. Chiến lược thứ ba **gắn số partition vào số node**: **mỗi node giữ một số partition cố định** (ví dụ 256). Thêm node → tổng số partition *tăng*; node mới chọn ngẫu nhiên vài partition đang tồn tại và **tách một phần** của chúng về mình.

Đây là cách **Cassandra (vnodes)** và **DynamoDB-style** hoạt động, và nó gắn chặt với **consistent hashing** (Bài 11): mỗi node đặt nhiều *virtual node* (token) lên vòng băm. Thêm một node thật = thêm nhiều token → mỗi token chỉ hút một cung nhỏ dữ liệu từ node kế → **di chuyển tối thiểu**, và tải được rải đều nhờ số token lớn.

```
# Cassandra — mỗi node có 256 virtual nodes (token) trên vòng băm.
# Thêm node mới chỉ hút ~1/(N+1) dữ liệu, rải từ nhiều node cũ.
# cassandra.yaml
num_tokens: 256
allocate_tokens_for_local_replication_factor: 3   # phân bổ token cân theo RF
```

| Chiến lược | Số partition | Ai dùng | Điểm mạnh | Cạm bẫy |
|-----------|-------------|---------|-----------|---------|
| **Fixed number** | Cố định, > số node nhiều lần | Elasticsearch, Riak, Couchbase | Đơn giản, ổn định | Chọn sai P là quyết định một chiều |
| **Dynamic** | Tách/gộp theo dữ liệu | HBase, MongoDB, CockroachDB | Thích ứng dataset, hợp key-range | Hotspot khởi đầu (cần pre-split) |
| **Proportional to nodes** | Cố định *mỗi node* | Cassandra, Dynamo | Rất hợp consistent hashing, rải đều | Cần đủ token để tránh lệch tải |

> **Nguyên tắc chung xuyên suốt cả ba:** *tách "key→partition" khỏi "partition→node"*. Miễn giữ được sự tách rời này, thêm/bớt node chỉ chạm tới một phần nhỏ. `hash mod N` vi phạm chính điều đó nên bị loại ngay.

---

## 3. Request routing — làm sao client tìm đúng node?

Partition đã có thể *di chuyển* giữa các node. Vậy khi một request đến với `key = "user:42"`, **ai biết partition chứa nó đang nằm ở node nào?** Đây là bài toán **request routing** (một dạng của *service discovery*). Có ba kiến trúc.

<svg viewBox="0 0 720 300" role="img" aria-labelledby="rr-t rr-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="rr-t">Ba kiểu request routing: client-aware, routing tier, node forwarding</title>
<desc id="rr-d">Ba cột minh hoạ ba cách đưa request tới đúng node giữ partition</desc>
<text x="120" y="20" text-anchor="middle" font-size="13" fill="currentColor">1. Client-aware</text>
<rect x="60" y="35" width="120" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="60" text-anchor="middle" font-size="12" fill="currentColor">Client (có bản đồ)</text>
<line x1="120" y1="75" x2="120" y2="230" stroke="currentColor" stroke-width="1.4" marker-end="url(#ra)"/>
<text x="185" y="150" text-anchor="middle" font-size="11" fill="currentColor">đi thẳng</text>
<rect x="60" y="235" width="120" height="40" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="260" text-anchor="middle" font-size="12" fill="currentColor">Node giữ partition</text>
<text x="360" y="20" text-anchor="middle" font-size="13" fill="currentColor">2. Routing tier / proxy</text>
<rect x="300" y="35" width="120" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="60" text-anchor="middle" font-size="12" fill="currentColor">Client (mù)</text>
<line x1="360" y1="75" x2="360" y2="120" stroke="currentColor" stroke-width="1.4" marker-end="url(#ra)"/>
<rect x="300" y="125" width="120" height="40" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="150" text-anchor="middle" font-size="12" fill="currentColor">Proxy (có bản đồ)</text>
<line x1="360" y1="165" x2="360" y2="230" stroke="currentColor" stroke-width="1.4" marker-end="url(#ra)"/>
<rect x="300" y="235" width="120" height="40" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="260" text-anchor="middle" font-size="12" fill="currentColor">Node giữ partition</text>
<text x="600" y="20" text-anchor="middle" font-size="13" fill="currentColor">3. Node forwarding</text>
<rect x="540" y="35" width="120" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="600" y="60" text-anchor="middle" font-size="12" fill="currentColor">Client (mù)</text>
<line x1="600" y1="75" x2="600" y2="120" stroke="currentColor" stroke-width="1.4" marker-end="url(#ra)"/>
<rect x="540" y="125" width="120" height="40" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="600" y="150" text-anchor="middle" font-size="12" fill="currentColor">Node bất kỳ</text>
<line x1="600" y1="165" x2="600" y2="230" stroke="currentColor" stroke-width="1.4" marker-end="url(#ra)"/>
<text x="670" y="200" text-anchor="middle" font-size="11" fill="currentColor">forward</text>
<rect x="540" y="235" width="120" height="40" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="600" y="260" text-anchor="middle" font-size="12" fill="currentColor">Node giữ partition</text>
<defs><marker id="ra" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 3.1 Client-aware (partition-aware client / smart client)
Client tự giữ bản đồ `partition→node` và đi **thẳng** tới node đúng — **0 hop thừa**, độ trễ thấp nhất.
- **Redis Cluster**: client nhận *slot map* (16384 slot); nếu đi sai, server trả về `MOVED`/`ASK` để client cập nhật.
- **Kafka**: producer/consumer lấy *metadata* (partition leader nằm ở broker nào) rồi kết nối thẳng leader.
- Nhược: logic routing nhét vào *mọi client* (nhiều ngôn ngữ), cập nhật bản đồ khi topology đổi phức tạp hơn.

### 3.2 Routing tier / proxy (dumb client)
Đặt một **tầng định tuyến** ở giữa; client cứ gửi bừa, proxy tra bản đồ rồi chuyển tiếp.
- **MongoDB**: `mongos` là router; **Couchbase**: `moxi`; **Vitess** (MySQL sharding): `vtgate`; **Twemproxy/Envoy** trước Redis.
- Ưu: client đơn giản, đổi topology chỉ cần proxy biết. Nhược: **thêm 1 network hop** (latency), và proxy trở thành thành phần cần HA & scale riêng.

### 3.3 Node forwarding (any-node + redirect/forward)
Client gửi tới **node bất kỳ**; nếu node đó không giữ partition, nó **tự chuyển tiếp** tới node đúng (hoặc redirect).
- **Cassandra / DynamoDB**: node nhận request đóng vai **coordinator**, forward tới replica đúng nhờ mọi node đều biết ring qua **gossip**.
- Ưu: client cực đơn giản, không cần proxy. Nhược: mỗi node phải mang logic routing + biết topology; có hop nội bộ thừa.

| Kiểu | Ai giữ bản đồ | Hop thừa | Ví dụ |
|------|---------------|----------|-------|
| Client-aware | Client | 0 | Redis Cluster, Kafka |
| Routing tier | Proxy riêng | 1 (qua proxy) | mongos, Vitess, Envoy |
| Node forwarding | Mọi node | 0–1 (nội bộ) | Cassandra, DynamoDB |

---

## 4. Coordination — ai là "nguồn sự thật" của bản đồ?

Cả ba kiểu routing đều cần một **bản đồ topology nhất quán**: partition nào ở node nào, node nào còn sống. Câu hỏi cốt tử: **khi partition vừa di chuyển, làm sao mọi bên (client/proxy/node) thấy cùng một sự thật, đúng lúc?** Nếu không, request bay tới node cũ đã không còn giữ partition → lỗi hoặc dữ liệu sai. Có hai trường phái.

### 4.1 Coordination tập trung (ZooKeeper / etcd)
Một **coordination service** đồng thuận mạnh (dựa trên **consensus** — ZAB cho ZooKeeper, **Raft** cho etcd, Bài 5) giữ *nguồn sự thật* về cluster membership và ánh xạ partition→node. Các node **đăng ký** mình vào đó; client/proxy **subscribe** (watch) để được thông báo khi bản đồ đổi.

<svg viewBox="0 0 680 250" role="img" aria-labelledby="zk-t zk-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="zk-t">ZooKeeper/etcd giữ bản đồ partition và thông báo cho routing tier</title>
<desc id="zk-d">Các node đăng ký vào ZooKeeper, routing tier watch để nhận bản đồ mới nhất</desc>
<rect x="250" y="15" width="180" height="55" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="340" y="38" text-anchor="middle" font-size="13" fill="currentColor">ZooKeeper / etcd</text>
<text x="340" y="57" text-anchor="middle" font-size="11" fill="currentColor">nguồn sự thật (Raft/ZAB)</text>
<rect x="40" y="180" width="120" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="100" y="207" text-anchor="middle" font-size="12" fill="currentColor">Node A</text>
<rect x="180" y="180" width="120" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="240" y="207" text-anchor="middle" font-size="12" fill="currentColor">Node B</text>
<rect x="320" y="180" width="120" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="380" y="207" text-anchor="middle" font-size="12" fill="currentColor">Node C</text>
<line x1="100" y1="180" x2="290" y2="70" stroke="currentColor" stroke-width="1.2" marker-end="url(#za)"/>
<line x1="240" y1="180" x2="330" y2="70" stroke="currentColor" stroke-width="1.2" marker-end="url(#za)"/>
<line x1="380" y1="180" x2="370" y2="70" stroke="currentColor" stroke-width="1.2" marker-end="url(#za)"/>
<text x="150" y="130" text-anchor="middle" font-size="10" fill="currentColor">register</text>
<rect x="500" y="180" width="150" height="45" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="575" y="200" text-anchor="middle" font-size="12" fill="currentColor">Routing tier</text>
<text x="575" y="217" text-anchor="middle" font-size="11" fill="currentColor">(watch)</text>
<line x1="430" y1="55" x2="575" y2="180" stroke="#10b981" stroke-width="1.4" marker-end="url(#za2)"/>
<text x="540" y="110" text-anchor="middle" font-size="10" fill="#10b981">push bản đồ mới</text>
<defs><marker id="za" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker><marker id="za2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#10b981"/></marker></defs>
</svg>

Cơ chế then chốt: **ephemeral node + watch**. Node giữ một *ephemeral znode*; nếu node chết, session ZooKeeper hết hạn → znode tự biến mất → mọi watcher được báo *ngay lập tức* rằng node đã rời cluster. Đây là cách **HBase, Kafka (bản cũ), SolrCloud, Vitess** phát hiện membership.

```python
# etcd (Python) — node tự đăng ký với lease; hết lease tự xoá (giống ephemeral).
# Router "watch" prefix để luôn có bản đồ mới nhất mà không cần polling.
import etcd3
etcd = etcd3.client(host="10.0.0.10", port=2379)

# Node đăng ký endpoint của mình dưới lease 10s, gia hạn định kỳ (heartbeat)
lease = etcd.lease(ttl=10)
etcd.put("/cluster/partitions/p42/leader", "10.0.0.7:9000", lease=lease)
lease.refresh()   # gọi lặp lại < 10s/lần; ngừng refresh (node chết) → key tự bay

# Router theo dõi thay đổi, cập nhật routing table tại chỗ
events, cancel = etcd.watch_prefix("/cluster/partitions/")
for ev in events:
    routing_table.apply(ev.key, ev.value)   # bản đồ luôn phản ánh topology hiện tại
```

Đánh đổi: mạnh về **nhất quán** (mọi bên thấy cùng bản đồ, thứ tự cập nhật rõ ràng) nhưng ZooKeeper/etcd trở thành **thành phần phải vận hành cẩn thận** (quorum 3–5 node, là điểm phụ thuộc chung).

### 4.2 Coordination phi tập trung (gossip)
Không có trung tâm. Mỗi node định kỳ **thì thầm** (gossip) trạng thái mình biết (ai sống, giữ token nào) với vài node ngẫu nhiên; thông tin **lan truyền dịch tễ** khắp cluster trong `O(log N)` vòng.
- **Cassandra, DynamoDB, Consul, Serf, Redis Cluster** dùng gossip.
- Ưu: **không có single point** cần vận hành riêng, chịu lỗi tốt, tự lành.
- Nhược: **hội tụ có độ trễ** (eventually consistent về membership) — trong khoảng lan truyền, các node có thể thấy bản đồ *hơi* khác nhau; phải chịu được sự tạm lệch đó. Đây đúng là đánh đổi CAP (Bài 4): gossip chọn AP cho lớp membership.

```
# Cassandra — cấu hình gossip: seed node là điểm khởi đầu để node mới
# "bắt sóng" cluster, sau đó gossip tự lan phần còn lại.
# cassandra.yaml
seed_provider:
  - class_name: org.apache.cassandra.locator.SimpleSeedProvider
    parameters:
      - seeds: "10.0.0.11,10.0.0.12,10.0.0.13"
# nodetool status  → xem ring, token, trạng thái Up/Down mà mỗi node học qua gossip
```

| | Tập trung (ZooKeeper/etcd) | Phi tập trung (gossip) |
|---|---------------------------|------------------------|
| Nhất quán bản đồ | Mạnh (consensus) | Eventually consistent |
| Điểm phụ thuộc | Có (cụm coordinator) | Không |
| Phát hiện node chết | Nhanh, dứt khoát (ephemeral) | Chậm hơn (qua nhiều vòng gossip) |
| Hợp với | Cần bản đồ chuẩn xác tức thời | Cần tự lành, không muốn vận hành coordinator |
| Ví dụ | HBase, Kafka(cũ), Vitess | Cassandra, DynamoDB, Consul |

> **Lưu ý xu hướng:** Kafka đã bỏ ZooKeeper, chuyển sang **KRaft** — nhúng thẳng Raft vào broker để tự quản metadata, loại bỏ phụ thuộc ngoài. Đây là ví dụ điển hình của việc *coordination vẫn cần consensus*, chỉ là đặt nó ở đâu.

---

## 5. Cạm bẫy thực chiến & con số

- **Rebalance storm:** đừng để hệ tự rebalance ngay khi *nghi ngờ* một node chết (mạng chớp một cái). Cassandra/Elasticsearch có `delay` chờ trước khi coi node là mất hẳn (ví dụ Elasticsearch `index.unassigned.node_left.delayed_timeout: 5m`) để tránh copy TB dữ liệu vô ích rồi lại copy về.
- **Copy tốn thật:** di dời 1 partition 50 GB qua mạng 1 Gbps mất ~7 phút *chỉ riêng truyền*, chưa kể đọc/ghi đĩa. Rebalance cả cluster là hàng giờ — phải bóp băng thông (throttle) để không giết tải production. Cassandra: `nodetool setstreamthroughput`.
- **Bản đồ cũ (stale routing):** client giữ bản đồ lỗi thời → gõ nhầm node. Thiết kế phải có đường *sửa sai*: Redis trả `MOVED`, Cassandra coordinator forward, MongoDB `mongos` refresh từ config server.
- **Automatic vs. manual rebalancing:** nhiều hệ (Riak, cũ) để *con người bấm nút* rebalance vì rebalance tự động + phát hiện lỗi sai có thể gây **cascading failure**. Cân nhắc **fully automatic** (tiện, nguy hiểm) ↔ **human-in-the-loop** (an toàn, chậm).

---

## 6. Tóm tắt
- **Rebalancing** là tất yếu vì cluster luôn thêm/bớt node; mục tiêu vàng là **di chuyển tối thiểu** trong khi vẫn phục vụ.
- **KHÔNG dùng `hash mod N`**: đổi N làm ~`N/(N+1)` số key phải copy — bão rebalance. Bí quyết là **tách "key→partition" khỏi "partition→node"**.
- Ba chiến lược đúng: **fixed number** (Elasticsearch/Riak — đơn giản, chọn P một chiều), **dynamic** (HBase/MongoDB — tự split/merge, coi chừng hotspot đầu, cần pre-split), **proportional to nodes** (Cassandra vnodes — khớp consistent hashing).
- **Request routing** có ba kiểu: **client-aware** (0 hop — Redis/Kafka), **routing tier/proxy** (client ngu, thêm hop — mongos/Vitess), **node forwarding** (mọi node biết đường — Cassandra/Dynamo).
- Bản đồ topology cần **coordination**: **ZooKeeper/etcd** (consensus, ephemeral+watch, nhất quán mạnh) hoặc **gossip** (phi tập trung, tự lành, eventually consistent). Chọn theo đánh đổi nhất quán ↔ vận hành.

> **Bài tiếp theo (Bài 13):** khi partition đi cùng **replication**, mỗi partition có nhiều bản sao — ta bước vào **secondary index phân tán & xử lý query trên dữ liệu đã chia** (scatter/gather), cùng cách giữ index nhất quán với dữ liệu.
