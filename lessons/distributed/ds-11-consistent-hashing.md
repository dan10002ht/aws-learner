# Bài 11 — Consistent hashing &amp; virtual nodes

## 1. Mục tiêu
Sau bài này bạn có thể:
- Chỉ ra **vì sao `hash(key) mod N` sụp đổ** khi thêm/bớt node: gần như **toàn bộ** key phải rehash.
- Giải thích **consistent hashing ring** ở mức bản chất: vì sao thêm/bớt 1 node chỉ dịch chuyển **~1/N** số key.
- Hiểu **virtual node (vnode)** giải quyết mất cân bằng tải và **hot node** như thế nào.
- Viết được code **ring + lookup** (đặt node lên vòng, tìm node phụ trách một key).
- Nhận ra kỹ thuật này nằm dưới **Cassandra, DynamoDB, Riak, Redis Cluster (hash slot), CDN, memcached (ketama)**.

---

## 2. Lý thuyết

### 2.1 Bài toán: chia key cho N node sao cho ít xáo trộn khi N đổi

Bạn có hàng triệu key (user, ảnh, session, cache entry) và một cụm N node. Cần một hàm **quyết định key nào ở node nào** thoả:
- **Đều tay**: mỗi node giữ xấp xỉ như nhau (không node nào quá tải).
- **Không cần thư mục trung tâm**: mọi client tự tính ra node từ key (tránh một bảng tra cứu là single point of failure).
- **Ổn định khi topology đổi**: thêm/bớt node thì **ít key phải di chuyển** nhất có thể.

Điều kiện thứ ba là mấu chốt. Trong hệ phân tán, di chuyển key nghĩa là **copy dữ liệu qua mạng** (Cassandra) hoặc **cache miss hàng loạt đập thẳng vào database** (memcached). Xáo trộn nhiều = downtime, nghẽn, sập tầng dưới.

### 2.2 Vì sao `hash(key) mod N` là một cái bẫy

Cách ngây thơ nhất: `node = hash(key) % N`. Với N cố định thì phân bố rất đều. Vấn đề chỉ lộ ra khi **N thay đổi**.

Giả sử N = 4, xét key có `hash(key) = 100`:

| N | `100 % N` | Node đích |
|---|-----------|-----------|
| 4 | 0 | node 0 |
| 5 (thêm 1 node) | 0 | node 0 |

Trông may mắn, nhưng hãy nhìn toàn cục. Khi N đổi từ 4 → 5, một key **giữ nguyên node** chỉ khi `h % 4 == h % 5`. Tỉ lệ đó rất nhỏ: về mặt xác suất **khoảng (N-1)/N ≈ 80%** số key phải đổi node. Không phải 1/5 — mà là **gần hết**.

<svg viewBox="0 0 700 250" role="img" aria-labelledby="mod-t mod-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="mod-t">hash mod N: thêm 1 node làm rehash gần hết key</title>
<desc id="mod-d">So sánh phân bố 8 key khi N=4 và N=5, hầu hết key nhảy sang node khác</desc>
<text x="60" y="30" font-size="13" fill="currentColor">N = 4</text>
<text x="60" y="150" font-size="13" fill="currentColor">N = 5</text>
<rect x="60" y="45" width="70" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="67" text-anchor="middle" font-size="11" fill="currentColor">k→n0</text>
<rect x="140" y="45" width="70" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="175" y="67" text-anchor="middle" font-size="11" fill="currentColor">k→n1</text>
<rect x="220" y="45" width="70" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="255" y="67" text-anchor="middle" font-size="11" fill="currentColor">k→n2</text>
<rect x="300" y="45" width="70" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="335" y="67" text-anchor="middle" font-size="11" fill="currentColor">k→n3</text>
<rect x="60" y="165" width="60" height="34" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="187" text-anchor="middle" font-size="11" fill="currentColor">k→n2</text>
<rect x="128" y="165" width="60" height="34" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="158" y="187" text-anchor="middle" font-size="11" fill="currentColor">k→n4</text>
<rect x="196" y="165" width="60" height="34" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="226" y="187" text-anchor="middle" font-size="11" fill="currentColor">k→n0</text>
<rect x="264" y="165" width="60" height="34" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="294" y="187" text-anchor="middle" font-size="11" fill="currentColor">k→n3</text>
<rect x="332" y="165" width="60" height="34" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="362" y="187" text-anchor="middle" font-size="11" fill="currentColor">k→n1</text>
<text x="470" y="100" font-size="12" fill="currentColor">Chỉ +1 node,</text>
<text x="470" y="120" font-size="12" fill="#f43f5e">~80% key đổi chỗ</text>
<text x="470" y="140" font-size="12" fill="currentColor">= rehash gần hết</text>
</svg>

Trong thực tế điều này nghĩa là: chỉ cần **một node chết** hay bạn **thêm một node để scale**, gần như **toàn bộ cache bị invalid**, mọi request biến thành cache miss, database bị **thundering herd** đánh sập. `mod N` khiến việc co giãn cụm — thứ ta làm suốt — trở thành thảm hoạ.

### 2.3 Ý tưởng consistent hashing: bỏ N ra khỏi công thức

David Karger &amp; cộng sự (MIT, 1997) đưa ra lời giải: **đừng hash vào N khe, hãy hash vào một không gian cố định khổng lồ rồi uốn nó thành một vòng tròn.**

Cụ thể:
1. Chọn một hash cho ra số trong `[0, 2^32)` (hoặc 2^160 với SHA-1). Tưởng tượng dải số này **cuộn thành vòng tròn**, hết 2^32 quay lại 0.
2. **Đặt mỗi node lên vòng** tại vị trí `hash(node_id)`.
3. **Đặt mỗi key lên vòng** tại vị trí `hash(key)`.
4. Key thuộc về **node đầu tiên gặp khi đi theo chiều kim đồng hồ** kể từ vị trí của key (node "kế tiếp").

<svg viewBox="0 0 460 400" role="img" aria-labelledby="ring-t ring-d" style="width:100%;max-width:440px;height:auto;display:block;margin:1.25rem auto">
<title id="ring-t">Consistent hashing ring với 4 node</title>
<desc id="ring-d">Vòng tròn hash với 4 node đặt quanh vòng, key đi theo chiều kim đồng hồ tới node kế tiếp</desc>
<circle cx="230" cy="200" r="140" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.5"/>
<circle cx="230" cy="60" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="230" y="64" text-anchor="middle" font-size="11" fill="currentColor">A</text>
<circle cx="370" cy="200" r="16" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="370" y="204" text-anchor="middle" font-size="11" fill="currentColor">B</text>
<circle cx="230" cy="340" r="16" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="230" y="344" text-anchor="middle" font-size="11" fill="currentColor">C</text>
<circle cx="90" cy="200" r="16" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="204" text-anchor="middle" font-size="11" fill="currentColor">D</text>
<circle cx="320" cy="95" r="7" fill="#f43f5e" fill-opacity="0.6" stroke="currentColor"/>
<text x="345" y="88" font-size="10" fill="currentColor">key k1</text>
<path d="M 327 100 A 90 90 0 0 1 358 185" fill="none" stroke="#f43f5e" stroke-width="1.5" marker-end="url(#ar)"/>
<text x="300" y="150" font-size="10" fill="currentColor">CW → B</text>
<text x="230" y="200" text-anchor="middle" font-size="11" fill="currentColor">2^32 ring</text>
<text x="230" y="218" text-anchor="middle" font-size="10" fill="currentColor" fill-opacity="0.7">0 ở đỉnh, CW tăng dần</text>
<defs><marker id="ar" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#f43f5e"/></marker></defs>
</svg>

**Vì sao điều này giải quyết bài toán?** Node đích của một key chỉ phụ thuộc vào **vị trí tương đối trên vòng**, không phụ thuộc vào **số lượng** node. Khi bạn:
- **Thêm node E** vào vòng: E chỉ "cướp" các key nằm trong cung từ node đứng trước nó tới E. Các key khác **không đổi chủ**. Chỉ **~1/N** key di chuyển (từ đúng một node láng giềng sang E).
- **Bớt node B** (chết): các key của B trôi tiếp CW sang node kế tiếp của B. Các node khác **không bị đụng tới**. Cũng chỉ **~1/N** key phải chuyển.

Đây là khác biệt sinh tử so với `mod N`: **O(K/N)** key di chuyển thay vì **O(K)**.

| Tiêu chí | `hash % N` | Consistent hashing |
|----------|-----------|--------------------|
| Key di chuyển khi ±1 node | ~ toàn bộ (O(K)) | ~1/N (O(K/N)) |
| Cần bảng tra cứu trung tâm | Không | Không (client tự tính) |
| Ảnh hưởng khi node chết | Rehash cả cụm | Chỉ 1 node láng giềng gánh |
| Cân bằng tải tự nhiên | Rất đều | Lệch nếu ít node (xem 2.4) |

### 2.4 Vấn đề còn lại: phân bố lệch &amp; hot node

Ring cơ bản có một khuyết điểm: với **ít node**, hash đặt chúng lên vòng **không đều**. Có thể node B chiếm một cung rất rộng (nhận nhiều key), node D cung hẹp (ít key). Tệ hơn:
- Khi một node chết, **toàn bộ tải của nó dồn đúng vào một node kế tiếp** — biến node đó thành **hot node**, dễ sập dây chuyền (cascading failure).
- Node mạnh và node yếu nhận tải như nhau, không phản ánh được capacity khác nhau.

### 2.5 Virtual node (vnode): rải mỗi node thành nhiều điểm

Lời giải: mỗi node vật lý được đặt lên vòng **không phải 1 điểm mà V điểm** (ví dụ 128–256 điểm), mỗi điểm là một **virtual node** với hash riêng (`hash(node_id + "#" + i)`).

<svg viewBox="0 0 680 260" role="img" aria-labelledby="vn-t vn-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="vn-t">Không có vnode so với có vnode</title>
<desc id="vn-d">Bên trái mỗi node một điểm gây lệch tải, bên phải mỗi node nhiều điểm rải đều quanh vòng</desc>
<text x="120" y="28" text-anchor="middle" font-size="12" fill="currentColor">1 điểm/node — lệch</text>
<circle cx="120" cy="140" r="90" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.5"/>
<circle cx="120" cy="50" r="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<circle cx="205" cy="115" r="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<circle cx="185" cy="200" r="9" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<circle cx="55" cy="180" r="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<path d="M 120 50 A 90 90 0 0 1 205 115" fill="none" stroke="#f43f5e" stroke-width="4" stroke-opacity="0.5"/>
<text x="120" y="245" text-anchor="middle" font-size="10" fill="#f43f5e">cung B rất rộng = hot</text>
<text x="500" y="28" text-anchor="middle" font-size="12" fill="currentColor">V điểm/node — đều</text>
<circle cx="500" cy="140" r="90" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.5"/>
<circle cx="500" cy="50" r="6" fill="#3b82f6" fill-opacity="0.2" stroke="currentColor"/>
<circle cx="560" cy="70" r="6" fill="#10b981" fill-opacity="0.2" stroke="currentColor"/>
<circle cx="588" cy="128" r="6" fill="#f59e0b" fill-opacity="0.2" stroke="currentColor"/>
<circle cx="572" cy="188" r="6" fill="#8b5cf6" fill-opacity="0.2" stroke="currentColor"/>
<circle cx="518" cy="225" r="6" fill="#3b82f6" fill-opacity="0.2" stroke="currentColor"/>
<circle cx="452" cy="222" r="6" fill="#10b981" fill-opacity="0.2" stroke="currentColor"/>
<circle cx="415" cy="175" r="6" fill="#f59e0b" fill-opacity="0.2" stroke="currentColor"/>
<circle cx="412" cy="108" r="6" fill="#8b5cf6" fill-opacity="0.2" stroke="currentColor"/>
<circle cx="440" cy="65" r="6" fill="#3b82f6" fill-opacity="0.2" stroke="currentColor"/>
<text x="500" y="245" text-anchor="middle" font-size="10" fill="#10b981">mỗi node rải khắp = đều</text>
</svg>

Vnode đem lại ba lợi ích quyết định:
- **Cân bằng tải mượt**: mỗi node giữ nhiều cung nhỏ trải khắp vòng, tổng lại xấp xỉ đều. Càng nhiều vnode, độ lệch (variance) càng nhỏ — với ~100–200 vnode/node, lệch tải thường dưới vài %.
- **Chết node là chia đều gánh, không dồn một chỗ**: khi node chết, hàng trăm cung nhỏ của nó được **nhiều node khác nhau** hứng — không tạo hot node.
- **Trọng số theo capacity (weight)**: node mạnh gấp đôi thì cấp gấp đôi số vnode → nhận gấp đôi tải. Cụm heterogeneous vẫn cân.

Cái giá phải trả: ring có nhiều điểm hơn (V×N entry) → tốn chút bộ nhớ và lookup phải binary-search trên mảng lớn hơn (vẫn O(log(V·N)), không đáng kể).

---

## 3. Code: ring + lookup có vnode

Dưới đây là một implement gọn, đúng, chạy được bằng Python (chỉ dùng thư viện chuẩn). Nó dựng ring bằng `bisect` (binary search) — đúng cách các hệ thật làm.

```python
import hashlib
from bisect import bisect_right, insort

class ConsistentHashRing:
    def __init__(self, vnodes=150):
        self.vnodes = vnodes          # số virtual node mỗi node vật lý
        self._ring = {}               # hash-điểm -> tên node vật lý
        self._sorted = []             # danh sách hash-điểm đã sort (để bisect)

    def _hash(self, key: str) -> int:
        # MD5 lấy 32 bit đầu -> điểm trên vòng [0, 2^32)
        h = hashlib.md5(key.encode()).digest()
        return int.from_bytes(h[:4], "big")

    def add_node(self, node: str, weight: int = 1):
        # weight nhân số vnode -> node mạnh hơn nhận nhiều tải hơn
        for i in range(self.vnodes * weight):
            point = self._hash(f"{node}#{i}")
            self._ring[point] = node
            insort(self._sorted, point)     # giữ mảng luôn sort

    def remove_node(self, node: str, weight: int = 1):
        for i in range(self.vnodes * weight):
            point = self._hash(f"{node}#{i}")
            if point in self._ring:
                del self._ring[point]
                self._sorted.remove(point)

    def get_node(self, key: str) -> str:
        if not self._ring:
            raise ValueError("ring rỗng")
        p = self._hash(key)
        # đi theo chiều kim đồng hồ: điểm đầu tiên > p
        idx = bisect_right(self._sorted, p)
        if idx == len(self._sorted):
            idx = 0                          # vượt cuối vòng thì quay về đầu
        return self._ring[self._sorted[idx]]
```

Điểm cốt lõi cần nắm trong code này:
- **`get_node` là O(log M)**: `bisect_right` tìm nhị phân trên mảng điểm đã sort. Đây chính là bước "đi CW tới node kế tiếp".
- **Vòng cuộn lại**: nếu key nằm sau điểm cuối cùng, `idx` reset về 0 — đúng ngữ nghĩa vòng tròn.
- **`weight` nhân vnode**: nút mạnh cấp nhiều vnode hơn, nhận nhiều key hơn — đó là cách cụm không đồng nhất vẫn cân bằng.

Kiểm chứng tính chất "chỉ ~1/N key di chuyển" bằng một đoạn đo thực nghiệm:

```python
ring = ConsistentHashRing(vnodes=150)
for n in ["A", "B", "C", "D"]:
    ring.add_node(n)

keys = [f"key-{i}" for i in range(100_000)]
before = {k: ring.get_node(k) for k in keys}

ring.add_node("E")                       # thêm 1 node -> N: 4 -> 5
after = {k: ring.get_node(k) for k in keys}

moved = sum(1 for k in keys if before[k] != after[k])
print(f"Di chuyển {moved/len(keys):.1%} key")   # ~ 20% (≈ 1/5), KHÔNG phải ~80%

# Đếm phân bố tải để thấy vnode giữ cân bằng
from collections import Counter
print(Counter(after.values()))           # 5 node xấp xỉ 20% mỗi node
```

Kết quả điển hình: thêm node E chỉ dời **~20% key** (đúng 1/5), và tất cả số key dời đều **chảy vào E** — các node cũ gần như không đụng nhau. Đổi sang `hash % N` cùng phép đo sẽ cho **~80%** key nhảy lung tung. Đó là toàn bộ giá trị của consistent hashing thể hiện bằng con số.

---

## 4. Ứng dụng thật — nó ở khắp nơi

| Hệ thống | Dùng consistent hashing để làm gì | Chi tiết đáng nhớ |
|----------|-----------------------------------|-------------------|
| **Amazon DynamoDB / Dynamo paper** | Partition dữ liệu quanh ring, replica là N node kế tiếp CW | Chính paper Dynamo (2007) phổ biến hoá vnode |
| **Apache Cassandra** | Mỗi node giữ nhiều **token** (vnode) trên ring; replica = các node kế tiếp | `num_tokens: 256` trong `cassandra.yaml` chính là số vnode |
| **Riak** | Ring 2^160 chia thành `ring_size` partition (mặc định 64) | Partition gán vòng cho node |
| **memcached (ketama)** | Client rải key qua nhiều server cache; thêm/bớt server ít cache miss | Thư viện `libketama` là chuẩn de-facto |
| **CDN (Akamai, Varnish)** | Chọn edge/cache server cho một URL sao cho ổn định khi thêm/bớt edge | Bài toán gốc của Karger 1997 là cache web |

### 4.1 Ngoại lệ quan trọng: Redis Cluster dùng **hash slot**, không phải ring

Redis Cluster **cố tình không** dùng consistent hashing ring. Thay vào đó nó chia không gian key thành **16384 hash slot** cố định:

```
slot = CRC16(key) % 16384
```

Mỗi master phụ trách một dải slot (ví dụ node1: 0–5460, node2: 5461–10922, node3: 10923–16383). Khi thêm/bớt node, ta **di chuyển từng slot** giữa các node (resharding), và cụm tự thông báo bản đồ slot cho client.

```bash
# Xem key thuộc slot nào
redis-cli cluster keyslot user:1000       # -> ví dụ 1649

# Di chuyển 1000 slot từ node nguồn sang node đích khi resharding
redis-cli --cluster reshard 127.0.0.1:7000 \
  --cluster-from <src-node-id> \
  --cluster-to   <dst-node-id> \
  --cluster-slots 1000 --cluster-yes
```

Vì sao slot thay vì ring? Vì **16384 slot là một mức trừu tượng cố định, dễ quản lý và di chuyển từng phần**: bạn kiểm soát chính xác slot nào đi đâu, và **hash tag** (`{...}`) cho phép ép nhiều key vào **cùng một slot** để chạy multi-key command (MSET, transaction) trên chúng:

```
user:{1000}:profile   và   user:{1000}:cart
```

Cả hai băm phần trong `{}` là `1000` → cùng slot → cùng node → làm được lệnh multi-key. Ring thuần không cho bạn khả năng "ghim cùng chỗ" tiện lợi này. Về bản chất, slot là **một biến thể rời rạc hoá của consistent hashing**: 16384 "vnode toàn cục" mà node nào cũng có thể sở hữu bất kỳ tập slot nào.

---

## 5. Cạm bẫy &amp; lưu ý thực chiến

- **Chọn hash tốt**: hàm hash phải phân bố đều (MD5/Murmur3/xxHash). Dùng `hashCode()` của Java hay `id % something` sẽ vón cục và làm hỏng cân bằng.
- **Số vnode**: quá ít → lệch tải; quá nhiều → tốn RAM cho ring và chậm rebuild. Thực tế 100–256/node là vùng ngọt.
- **Replica đặt ở đâu**: đừng để N replica rơi vào N vnode **cùng một node vật lý**. Hệ thật (Cassandra/Dynamo) bỏ qua các vnode trùng node/rack/DC khi chọn replica CW để đảm bảo replica nằm trên **máy khác nhau** (rack awareness).
- **Bounded loads**: ring cơ bản không chặn được một node bị dồn quá mức khi key phân bố lệch bất thường. Google có biến thể **consistent hashing with bounded loads** (2016) đặt trần tải mỗi node, tràn thì tràn sang node kế — dùng trong Vimeo, HAProxy.
- **Không phải lúc nào cũng cần**: nếu cụm cố định N và không bao giờ co giãn (hiếm), `mod N` đơn giản hơn. Nhưng trong cloud/k8s nơi node đến đi liên tục (fallacy 5 — "topology doesn't change"), consistent hashing gần như bắt buộc.

---

## 6. Tóm tắt
- **`hash % N` sụp đổ khi N đổi**: thêm/bớt 1 node buộc rehash **~80%** key → cache miss hàng loạt, thundering herd đập DB.
- **Consistent hashing** hash node và key lên **một vòng cố định 2^32**; key thuộc node **kế tiếp theo chiều kim đồng hồ**. Thêm/bớt node chỉ dời **~1/N** key, không đụng các node khác.
- **Virtual node** rải mỗi node thành nhiều điểm trên vòng → **cân bằng tải đều**, **chết node thì chia gánh cho nhiều node** (tránh hot node), và **weight theo capacity**.
- Code cốt lõi: mảng điểm đã sort + **binary search (`bisect`)** để tìm node kế tiếp — O(log M).
- Có mặt trong **Cassandra (num_tokens), DynamoDB/Dynamo, Riak, memcached ketama, CDN**. **Redis Cluster** dùng biến thể rời rạc — **16384 hash slot** — để resharding từng phần và hỗ trợ hash tag.

> **Bài tiếp theo (Bài 12):** khi đã chia được dữ liệu ra nhiều node, làm sao **giữ nhiều bản sao (replication)** cho nhất quán và chịu lỗi — leader-based vs leaderless, và quorum.
