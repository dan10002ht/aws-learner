# Consistent Hashing — phân phối dữ liệu khi cụm co giãn

Bài toán nghe rất tầm thường: có `N` máy chủ, có hàng tỷ key, hãy quyết định key nào nằm ở máy nào. Nếu `N` là hằng số vĩnh viễn thì đây là bài tập lập trình 5 phút — `hash(key) % N` là xong. Cái khó nằm ở chỗ **`N` không bao giờ là hằng số**: bạn scale-out lúc cao điểm, scale-in lúc đêm, một node chết vì ổ đĩa hỏng, một node bị thay khi nâng cấp instance type. Mỗi lần `N` đổi, câu hỏi không còn là "key này ở đâu" mà là "**bao nhiêu key phải chuyển chỗ**". Consistent hashing là câu trả lời cho đúng một câu hỏi đó: làm sao để khi cụm co giãn, chỉ một phần **rất nhỏ** dữ liệu phải di chuyển, thay vì gần như toàn bộ.

Đây là bài **concept** — không có user, không có API, nhưng nó là viên gạch nằm dưới đáy của DynamoDB, Cassandra, Memcached, CDN, và cả cách load balancer định tuyến request. Hiểu nó không phải để "biết thuật toán", mà để trả lời được ba câu trong review: *dữ liệu chia thế nào, khi thêm node thì cái gì phải copy, và khi một key nóng bất thường thì kiến trúc này sập ở đâu*.

> 💡 Nguyên tắc xuyên bài: Consistent hashing **không làm tải cân bằng hơn** một cách kỳ diệu. Nó làm cho *sự thay đổi ánh xạ* trở nên rẻ. Cân bằng tải là một tính chất phải mua thêm bằng virtual node — và ngay cả thế vẫn có giới hạn.

---

## 1. Vấn đề nền: ánh xạ key → node trong một cụm sống

Bất cứ khi nào dữ liệu hoặc trạng thái không vừa trong một máy, bạn phải **phân mảnh (partitioning / sharding)**. Và bất cứ sơ đồ phân mảnh nào cũng phải trả lời bốn câu:

| Câu hỏi | Ý nghĩa thực tế |
|---|---|
| **Lookup** — key này thuộc node nào? | Phải tính được nhanh (µs) ở phía client hoặc router, không được tra DB |
| **Balance** — mỗi node giữ bao nhiêu? | Lệch tải nghĩa là node nóng nhất quyết định capacity cả cụm |
| **Monotonicity** — đổi `N` thì ai phải chuyển? | Quyết định chi phí scale: copy 1% dữ liệu hay 99% |
| **Membership** — ai biết danh sách node, biết lúc nào? | Nếu hai client có hai "bản đồ" khác nhau → đọc trượt, ghi lạc |

Ba sơ đồ phân mảnh phổ biến, để đặt consistent hashing vào đúng chỗ: **range partitioning** (chia theo khoảng khoá — range scan cực nhanh nhưng dễ hot-spot khi key có thứ tự thời gian, như HBase/TiKV), **hash partitioning** (phân bố đều gần như miễn phí nhưng mất range scan), và **directory/lookup table** (linh hoạt tuyệt đối nhưng bảng tra thành single point of truth cần HA).

Consistent hashing nằm trong nhánh **hash partitioning**, giải bài toán cụ thể "hash thế nào để đổi `N` không phải rehash tất cả".

---

## 2. Cách tiếp cận ngây thơ: `hash(key) % N` — và vì sao nó hỏng

Cách hiển nhiên nhất:

```python
def get_node(key, nodes):
    return nodes[hash(key) % len(nodes)]
```

Với `N` cố định, đây là sơ đồ **hoàn hảo**: lookup O(1), không tốn bộ nhớ, phân bố đều tuyệt vời (giả sử hàm hash tốt). Vấn đề xuất hiện đúng vào khoảnh khắc `N` đổi.

### Chuyện gì xảy ra khi thêm một node

Giả sử 4 node, thêm 1 node thành 5. Một key có `hash(key) = h`. Trước: `h % 4`. Sau: `h % 5`. Hai giá trị này trùng nhau chỉ khi `h % 4 == h % 5`, tức là với tỉ lệ rất nhỏ các `h`.

Tổng quát: khi đi từ `N` sang `N+1`, tỉ lệ key **giữ nguyên vị trí** xấp xỉ `1/(N+1)`. Nghĩa là:

| Chuyển đổi | Tỉ lệ key phải di chuyển | Ý nghĩa |
|---|---|---|
| 4 → 5 node | ~80% | 4/5 dữ liệu phải copy qua mạng |
| 10 → 11 node | ~91% | Gần như rehash toàn bộ |
| 100 → 101 node | ~99% | Thêm 1% capacity, trả giá bằng 99% traffic nội bộ |

Đây chính là **rehashing problem**. Nhìn bằng con số cho thấy mức độ tàn khốc: giả sử cụm cache có 100 node × 64 GB = **6.4 TB** dữ liệu nóng. Thêm một node → ~6.3 TB phải đổi chủ. Nếu đó là cache (Memcached), bạn thậm chí không copy — bạn chỉ đơn giản **mất** 99% cache hit:

```
Trước thêm node:  hit rate 95%, DB nhận 5% × 200K rps = 10K rps   ← DB sống khoẻ
Sau khi thêm node: hit rate ~1%, DB nhận 99% × 200K rps = 198K rps ← DB chết
```

Đây là kịch bản **cache stampede / thundering herd** kinh điển: một thao tác "vô hại" là thêm một cache node lại giết chết database phía sau. Nhiều sự cố production nổi tiếng bắt đầu đúng như vậy.

### Còn khi một node chết?

Tệ hơn nữa, vì bạn không chọn thời điểm. `N` tụt từ 10 xuống 9, ~90% key đổi chủ **ngay lập tức**, trong lúc cụm đang thiếu 10% capacity. Đúng lúc hệ thống yếu nhất thì nó lại tự tạo ra một cơn bão traffic nội bộ.

> ⚠️ Bẫy thiết kế: Nhiều người "sửa" modulo hashing bằng cách giữ `N` cố định và chỉ thay node chết bằng node mới cùng chỉ số (hot spare). Cách này chặn được rehash, nhưng biến `N` thành trần cứng: muốn tăng capacity phải downtime hoặc migrate thủ công cả cụm. Nó trì hoãn vấn đề chứ không giải quyết.

### Cái ta thực sự muốn

Một hàm ánh xạ `key → node` thoả:

1. **Minimal disruption**: khi thêm/bớt 1 trong `N` node, chỉ khoảng `1/N` số key đổi chủ — đúng bằng phần "công bằng" của node đó, không hơn.
2. **Không cần phối hợp**: mọi client tự tính được, không phải hỏi một service trung tâm mỗi request.
3. **Balance**: mỗi node nhận xấp xỉ `1/N` dữ liệu.
4. **Rẻ**: lookup nhanh, bộ nhớ nhỏ.

Consistent hashing (Karger et al., MIT 1997 — sinh ra chính từ bài toán web cache) đạt 1, 2, 4 một cách tự nhiên, và đạt 3 sau khi thêm virtual node.

---

## 3. Hash ring — ý tưởng lõi

Mẹo là **tách việc hash key ra khỏi việc đếm node**. Thay vì chia cho `N`, ta ánh xạ cả key *và* node vào **cùng một không gian hash**, rồi để hình học quyết định ai thuộc về ai.

Không gian hash là dải giá trị của hàm hash, ví dụ SHA-1 cho `[0, 2^160 − 1]`, MD5 cho `[0, 2^128 − 1]`, hay thực dụng hơn là 32/64-bit. Ta **uốn dải này thành vòng tròn**: sau giá trị lớn nhất là quay lại 0.

```
                 0 / 2^32
                     ┬
          k7    ╭────┴────╮    N-A
              ╭─╯         ╰─╮
            ╭─╯             ╰─╮  k1
     N-D   ╡                   ╞
            ╰─╮             ╭─╯  N-B
              ╰─╮         ╭─╯
          k4    ╰────┬────╯   k2
                 N-C ┴
                     
  N-A..N-D: vị trí hash(tên/IP node) trên vòng
  k1..k7  : vị trí hash(key) trên vòng
```

Quy tắc gán chỉ có một dòng:

> **Một key thuộc về node đầu tiên gặp được khi đi theo chiều kim đồng hồ từ vị trí của key.**

Nói cách khác, mỗi node "sở hữu" cung tròn nằm **ngay trước nó** (ngược chiều kim đồng hồ) cho tới node trước đó. Cung đó gọi là **token range** (thuật ngữ Cassandra) hoặc **key range**.

```
ring (trải phẳng, 0 ──────────────────────────► 2^32)

 0        N-A          N-B                 N-C        N-D     2^32
 ├────────●────────────●───────────────────●──────────●────────┤
 │◄ của A►│◄── của B ─►│◄───── của C ─────►│◄─ của D ►│◄ của A ►│
          ▲                                                (wrap-around)
       key rơi vào đoạn nào thì thuộc node đóng đoạn đó bên phải
```

Điểm mấu chốt: **vị trí của node trên vòng không phụ thuộc vào số node khác**. `hash("cache-07.prod")` là một con số cố định, dù cụm có 3 node hay 300 node. Đó là lý do thêm/bớt một node không làm xáo trộn phần còn lại — đây chính là tính chất **monotonicity** mà modulo không có.

### Chọn hàm hash nào

| Hàm | Tốc độ | Phân bố | Ghi chú |
|---|---|---|---|
| MD5 / SHA-1 | Chậm (~100–500 ns) | Rất đều | Dùng khi ring build 1 lần, lookup nhiều; DynamoDB dùng MD5 |
| MurmurHash3 | Rất nhanh (~5 ns) | Đều | Mặc định của Cassandra (Murmur3Partitioner) |
| xxHash / CityHash | Cực nhanh | Đều | Hợp cho đường nóng, client-side |
| CRC32 | Nhanh | Kém hơn, chỉ 32-bit | Redis Cluster dùng CRC16 cho slot — chấp nhận được vì chỉ cần 16384 giá trị |
| `hash()` của Python | Nhanh | Đều nhưng **randomized per process** | ⚠️ Không dùng — mỗi process cho kết quả khác nhau |

> ⚠️ Bẫy kinh điển: dùng hàm hash **không ổn định giữa các process/phiên bản ngôn ngữ** (Python `hash()` với `PYTHONHASHSEED` ngẫu nhiên, `Object.hashCode()` của Java cho object không override). Client A và client B sẽ tính ra hai node khác nhau cho cùng một key → dữ liệu ghi một nơi, đọc một nẻo. Luôn dùng hàm hash **xác định, chỉ định rõ, giống nhau ở mọi ngôn ngữ client**.

Cũng không cần hàm hash mật mã "an toàn" — chỉ cần **phân bố đều** và **nhanh**. MD5 vẫn phổ biến trong consistent hashing dù đã vỡ về mặt mật mã, vì ở đây ta không chống kẻ tấn công tìm collision (trừ khi kẻ tấn công có thể *chọn key* để dồn tải — xem phần hot partition).

---

## 4. Tìm node: binary search trên sorted ring

Cài đặt thực tế không dựng "vòng tròn" gì cả. Ta chỉ giữ một **mảng đã sắp xếp** các vị trí node, rồi tìm phần tử nhỏ nhất ≥ vị trí key. Đó đúng là `bisect_left` / `lower_bound`, và nếu chạy quá cuối mảng thì wrap về phần tử 0.

```python
import bisect, hashlib

def h(s: str) -> int:
    # hash xác định, ổn định giữa mọi process và ngôn ngữ
    return int.from_bytes(hashlib.md5(s.encode()).digest()[:8], "big")

class Ring:
    def __init__(self, nodes=()):
        self._points = []   # danh sách vị trí hash đã sắp xếp
        self._owner  = {}   # vị trí -> tên node
        for n in nodes:
            self.add(n)

    def add(self, node: str) -> None:
        p = h(node)
        if p in self._owner:              # va chạm vị trí: cực hiếm nhưng phải xử lý
            raise ValueError("collision")
        bisect.insort(self._points, p)
        self._owner[p] = node

    def remove(self, node: str) -> None:
        p = h(node)
        i = bisect.bisect_left(self._points, p)
        self._points.pop(i)
        del self._owner[p]

    def get(self, key: str) -> str:
        if not self._points:
            raise ValueError("ring rỗng")
        p = h(key)
        i = bisect.bisect_left(self._points, p)   # O(log V)
        if i == len(self._points):                # đi hết vòng -> quay về đầu
            i = 0
        return self._owner[self._points[i]]
```

Phân tích chi phí, với `V` = số điểm trên ring:

| Thao tác | Chi phí | Ghi chú |
|---|---|---|
| `get(key)` | O(log V) + 1 lần hash | Với V = 10.000 thì log₂V ≈ 14 lần so sánh — vài trăm ns |
| `add(node)` | O(V) do chèn vào mảng | Hiếm xảy ra, chấp nhận được |
| Bộ nhớ | O(V) | 10.000 điểm × ~32 byte ≈ 320 KB — không đáng kể |

Trong Java, `TreeMap.ceilingKey()` / `tailMap()` cho đúng ngữ nghĩa này; trong Go là `sort.Search`; trong C++ là `std::map::lower_bound`. Nếu ring gần như tĩnh và cần lookup ở đường siêu nóng (load balancer), có thể "nướng" ring thành **lookup table phẳng**: chia không gian hash thành `M` ô đều nhau (ví dụ 65.536), tính trước chủ sở hữu từng ô → lookup thành O(1) bằng một phép dịch bit + index mảng. Envoy `ring_hash` và Maglev đi đúng hướng này.

---

## 5. Thêm / bớt node: chính xác key nào phải di chuyển

Đây là phần phải nói trôi chảy trong phỏng vấn, vì nó là toàn bộ giá trị của consistent hashing.

### Thêm node

Node mới `E` hash vào một vị trí trên vòng, rơi vào **giữa cung đang do một node nào đó sở hữu**. Từ vị trí `E`, đi **ngược chiều kim đồng hồ** cho tới khi gặp node liền trước (gọi là `D`). Toàn bộ key nằm trong khoảng `(D, E]` — trước đây thuộc về node kế tiếp theo chiều kim đồng hồ của `E` — nay thuộc về `E`.

```
Trước:   ──●D───────────────────────────●C──
            │◄──── tất cả thuộc C ─────►│

Thêm E:  ──●D──────────●E───────────────●C──
            │◄ về E ──►│◄── vẫn của C ─►│
                 ▲
         chỉ đoạn (D, E] phải copy từ C sang E
```

Hệ quả quan trọng: **chỉ đúng một node (`C`) bị ảnh hưởng**, và nó chỉ phải nhường đi một phần dữ liệu của mình. Mọi node khác không mất một byte nào, không một client nào phải đổi ánh xạ cho key của các node đó.

### Bớt node (hoặc node chết)

Node `B` biến mất. Cung mà `B` sở hữu, tức `(A, B]`, được **node kế tiếp theo chiều kim đồng hồ** (`C`) tiếp quản. Lại chỉ một node bị ảnh hưởng.

```
Trước:   ──●A─────────●B─────────────●C──
            │◄ của B ►│◄── của C ───►│

Mất B:   ──●A───────────────────────●C──
            │◄──── giờ đều của C ───►│
```

### Con số

Với `N` node phân bố đều, mỗi node sở hữu ~`1/N` không gian khoá. Thêm hoặc bớt một node ⇒ **~1/N số key phải chuyển chỗ**, so với `~(N−1)/N` của modulo. Quay lại ví dụ 100 node × 64 GB = 6.4 TB:

| Sơ đồ | Dữ liệu di chuyển khi thêm 1 node | Thời gian copy ở 1 Gbps |
|---|---|---|
| `hash % N` | ~6.34 TB | ~14 giờ (và cache hit gần như về 0 ngay lập tức) |
| Consistent hashing | ~64 GB | ~9 phút, chỉ 1 node nguồn bị ảnh hưởng |

> 💡 Nguyên tắc: Consistent hashing biến chi phí thay đổi topology từ **O(toàn bộ dữ liệu)** thành **O(dữ liệu của một node)**. Đó là điều biến việc scale từ "sự kiện có kế hoạch, có downtime" thành "thao tác thường ngày, tự động".

### Nhưng: sự bất đối xứng khó chịu

Để ý là gánh nặng **không được chia đều**. Khi `B` chết, chỉ mình `C` gánh toàn bộ phần của `B` — tải của `C` tăng gấp đôi. Trong một cụm đang có sự cố, đó là kịch bản **cascading failure** hoàn hảo: `C` quá tải rồi cũng chết, `D` gánh cả ba phần, và cứ thế. Đây là một trong hai lý do khiến virtual node không phải "tuỳ chọn tối ưu" mà là **bắt buộc**.

---

## 6. Lệch tải và virtual node

### Vì sao ring cơ bản lệch tải

Ring cơ bản có hai vấn đề chồng lên nhau:

1. **Cung không đều.** `N` điểm ngẫu nhiên trên vòng tròn **không** chia vòng thành `N` phần bằng nhau. Về mặt thống kê, độ dài các cung tuân theo phân phối mũ: cung dài nhất trung bình dài gấp khoảng `ln N` lần cung trung bình. Với 10 node, node "xui" có thể sở hữu 25–30% vòng thay vì 10%.
2. **Key không rải đều trong cung.** Ngay cả khi cung đều, key thật (user id, tên file) có thể vón cục nếu hàm hash kém.

Thêm vào đó là bất đối xứng khi node rời đi đã nói ở trên. Ba vấn đề, một giải pháp.

### Virtual node (vnode / token)

Thay vì đặt mỗi node **một điểm** lên ring, ta đặt nó **V điểm**, bằng cách hash các nhãn dẫn xuất:

```
hash("cache-07#0"), hash("cache-07#1"), ..., hash("cache-07#149")
```

Mỗi điểm là một **virtual node**; tất cả đều trỏ về cùng một máy vật lý. Node vật lý giờ sở hữu 150 cung nhỏ rải khắp vòng thay vì 1 cung lớn.

```
V = 1 (ring cơ bản)
 ├───A────────────────────B──C─────────────────────────D───┤
   A rất nhỏ, D khổng lồ → lệch tải nặng

V = 4
 ├──A─C─B──D─A──B─D──C──A─D──C─B──A──B──C─D──┤
   mỗi node có 4 mảnh rải đều → tổng phần rất sát 1/N
```

Hai lợi ích, cả hai đều quan trọng:

- **Cân bằng tải tốt hơn.** Tổng của `V` mảnh ngẫu nhiên có phương sai nhỏ hơn nhiều so với một mảnh. Cụ thể, **độ lệch chuẩn tương đối** của phần tải giảm theo `1/√V`.
- **Chia đều gánh nặng khi node chết.** Node `B` có 150 mảnh, mỗi mảnh có một hàng xóm khác nhau. `B` chết → 150 mảnh phân tán về ~mọi node còn lại, mỗi node gánh thêm ~`1/(N−1)` phần của `B`, thay vì một node gánh 100%. Tương tự khi thêm node: node mới kéo dữ liệu **song song từ nhiều nguồn**, nên thời gian rebuild ngắn hơn hẳn.

### Số vnode ảnh hưởng thế nào tới độ lệch chuẩn

Đây là bảng nên nhớ (kết quả mô phỏng chuẩn, cũng là con số Alex Xu trích dẫn):

| Số vnode / node (V) | Độ lệch chuẩn tải (~%) | Bộ nhớ ring (N=100) | Nhận xét |
|---|---|---|---|
| 1 | ~100% | 100 điểm | Không dùng được: có node gánh gấp 3 node khác |
| 5 | ~45% | 500 | Vẫn lệch nặng |
| 10 | ~32% | 1.000 | Tạm chấp nhận cho cache nhỏ |
| 50 | ~14% | 5.000 | Ngưỡng "đủ dùng" cho phần lớn hệ |
| 100 | ~10% | 10.000 | Khuyến nghị phổ biến |
| 200 | ~7% | 20.000 | Cassandra mặc định cũ (256 token) ở đây |
| 1.000 | ~3% | 100.000 | Ring nặng, lookup log chậm hơn, rebuild membership tốn |

Quy luật: **giảm sai lệch một nửa thì phải tăng V gấp 4** (vì `1/√V`). Đó là lợi tức giảm dần rất nhanh — lý do không ai dùng V = 10.000.

### Chọn V thế nào trong thực tế

| Bối cảnh | V gợi ý | Lý do |
|---|---|---|
| Cụm nhỏ (3–10 node), cache | 100–200 | N nhỏ thì phương sai lớn, cần nhiều vnode bù lại |
| Cụm lớn (100+ node), cache | 50–100 | N lớn đã tự trung bình hoá; tiết kiệm bộ nhớ ring |
| Datastore có replication (Cassandra) | 16–64 (khuyến nghị mới) | vnode nhiều làm **tăng xác suất mất dữ liệu**: mỗi vnode thêm một tổ hợp replica mới, nên nhiều vnode ⇒ hầu như mọi bộ 3 node đều là một preference list nào đó ⇒ chỉ cần 3 node bất kỳ chết là chắc chắn mất một range |
| Node không đồng nhất (instance to/nhỏ lẫn lộn) | V tỉ lệ với capacity | Máy gấp đôi RAM thì cấp gấp đôi vnode — đây là cách cấp "trọng số" tự nhiên nhất của ring |

> ⚠️ Bẫy: "Cứ tăng vnode cho chắc." Với **cache thuần** thì gần như vô hại. Với **datastore có replica** thì sai lầm: Cassandra từng mặc định `num_tokens=256` và đã hạ xuống 16 chính vì lý do độ bền dữ liệu và chi phí repair/streaming ở trên. Số vnode là đánh đổi giữa *cân bằng tải* và *xác suất mất dữ liệu + chi phí vận hành*, không phải "càng nhiều càng tốt".

### Cài đặt ring có vnode

```python
import bisect, hashlib

def h(s: str) -> int:
    return int.from_bytes(hashlib.md5(s.encode()).digest()[:8], "big")

class ConsistentHashRing:
    def __init__(self, vnodes: int = 150):
        self.vnodes = vnodes
        self._ring  = []    # vị trí đã sort
        self._map   = {}    # vị trí -> node vật lý

    def _points(self, node: str, weight: int = 1):
        # weight cho phép node "to" chiếm nhiều vnode hơn
        for i in range(self.vnodes * weight):
            yield h(f"{node}#{i}")

    def add_node(self, node: str, weight: int = 1) -> None:
        for p in self._points(node, weight):
            if p in self._map:          # va chạm -> bỏ qua điểm này
                continue
            bisect.insort(self._ring, p)
            self._map[p] = node

    def remove_node(self, node: str, weight: int = 1) -> None:
        for p in self._points(node, weight):
            if self._map.get(p) == node:
                del self._map[p]
                i = bisect.bisect_left(self._ring, p)
                self._ring.pop(i)

    def get_node(self, key: str) -> str:
        if not self._ring:
            raise ValueError("ring rỗng")
        i = bisect.bisect_left(self._ring, h(key))
        return self._map[self._ring[i % len(self._ring)]]

    def get_nodes(self, key: str, count: int) -> list[str]:
        """Preference list: `count` node VẬT LÝ khác nhau, đi theo chiều kim đồng hồ.
        Đây là nền của replication — bỏ qua vnode trùng node vật lý."""
        if not self._ring:
            raise ValueError("ring rỗng")
        start, seen, out = bisect.bisect_left(self._ring, h(key)), set(), []
        for step in range(len(self._ring)):
            node = self._map[self._ring[(start + step) % len(self._ring)]]
            if node not in seen:
                seen.add(node)
                out.append(node)
                if len(out) == count:
                    break
        return out
```

Hai chi tiết dễ sai mà đoạn code này xử lý:

1. **`get_nodes` phải khử trùng node vật lý.** Nếu cứ lấy 3 vnode kế tiếp, rất có thể cả 3 đều thuộc cùng một máy → "3 bản sao" thực chất nằm trên một ổ đĩa. Đây là bug thật, từng xuất hiện trong nhiều cài đặt tự viết.
2. **Wrap-around bằng `% len(ring)`** thay vì kiểm tra `if i == len`, gọn và đúng cho cả `get_nodes`.

Trong hệ thật còn một tầng nữa: preference list phải **trải trên nhiều rack / Availability Zone**, tức là khi đi vòng phải bỏ qua node cùng AZ với node đã chọn. Cassandra gọi đó là `NetworkTopologyStrategy`; DynamoDB làm tương tự ở tầng dưới để 3 bản sao luôn nằm ở 3 AZ.

---

## 7. Replication trên ring: preference list và N/R/W

Consistent hashing hiếm khi được dùng "trần". Trong datastore, node đầu tiên theo chiều kim đồng hồ là **coordinator/primary** của key, và `N−1` node kế tiếp (khác máy vật lý, khác AZ) giữ bản sao. Danh sách đó là **preference list** (thuật ngữ Dynamo).

```
ring:  ──●──────●──────●──────●──────●──────●──►
         A      B      C      D      E      F
              ▲
           key k ở đây → preference list N=3: [B, C, D]
           (B là coordinator; C, D giữ replica)
```

Trên nền đó là quorum `N/R/W`: nếu `W + R > N` thì hai quorum chắc chắn giao nhau nên đọc luôn thấy ghi mới nhất; cấu hình phổ biến `N=3, W=2, R=2` chịu được 1 node chết cho cả đọc lẫn ghi, còn `W=1, R=1` nhanh hơn nhưng đọc có thể cũ và phải dựa vào read-repair.

Khi một node trong preference list tạm chết, Dynamo dùng **hinted handoff**: node kế tiếp nhận hộ bản ghi kèm "hint" rằng nó thuộc về ai, và trả lại khi node kia sống dậy. Cơ chế này giữ cho `W` vẫn đạt được trong lúc có sự cố — và nó chỉ khả thi vì ring cho ta một thứ tự kế tiếp xác định.

> 💡 Nguyên tắc: Ring trả lời câu "**ai giữ key này**"; quorum trả lời câu "**bao nhiêu người phải đồng ý**". Trong phỏng vấn, tách bạch hai tầng này cho thấy bạn hiểu kiến trúc chứ không chỉ thuộc thuật toán.

---

## 8. Hot key, hot partition, và giới hạn thật của consistent hashing

Đây là phần hay bị bỏ qua nhất, và cũng là phần phân biệt người "đọc qua" với người "đã vận hành".

### Consistent hashing cân bằng *key*, không cân bằng *traffic*

Ring đảm bảo mỗi node giữ xấp xỉ cùng **số lượng key**. Nó hoàn toàn không nói gì về việc mỗi key được truy cập bao nhiêu lần, hay mỗi key lớn bao nhiêu byte. Thực tế traffic gần như luôn theo phân phối **Zipf**: một số rất ít key chiếm phần lớn request.

Ba dạng lệch thường gặp:

| Dạng lệch | Ví dụ | Ring có cứu được không |
|---|---|---|
| **Hot key** — một key bị đọc/ghi cực nhiều | Post của celebrity, tỉ số trận chung kết, flag cấu hình toàn cục | ❌ Không. 1 key = 1 node, dù có 10.000 vnode |
| **Big key** — một key có giá trị khổng lồ | Một set Redis 5 GB, một partition DynamoDB phình | ❌ Không. Ring chia key, không chia *bên trong* key |
| **Hot partition** — một nhóm key cùng prefix | Mọi ghi đều có `tenant_id = BIG_CUSTOMER` | ❌ Không, nếu partition key chính là prefix đó |

### Cách xử lý (không thuộc về consistent hashing, phải thêm tầng khác)

1. **Replicate hot key ra nhiều node.** Với read-heavy: ghi key dưới `K#0..K#9`, client đọc ngẫu nhiên một hậu tố → tải chia cho 10. Đổi lại: ghi đắt gấp 10 và có thể lệch phiên bản giữa các bản sao.
2. **Client-side / local cache cho hot key.** Phát hiện top-K key nóng (count-min sketch) rồi cache ngay trong process app vài trăm ms. Rất hiệu quả; đổi lại là stale ngắn hạn. Đây là cách Facebook và Twitter chống hot key ở tầng memcache.
3. **Write sharding / salting.** Thêm hậu tố ngẫu nhiên vào partition key khi ghi (`BIG_CUSTOMER#3`), rồi fan-out khi đọc. Chuẩn mực chống hot partition của DynamoDB.
4. **Bounded-load consistent hashing** (phần biến thể bên dưới) — chặn trần tải mỗi node ở tầng thuật toán.
5. **Tách hot key ra tier riêng.** Một cụm nhỏ chuyên phục vụ vài nghìn key nóng nhất.

> ⚠️ Bẫy: Nếu key do người dùng chọn (username, tên file do client đặt), kẻ tấn công có thể **cố tình sinh key hash về cùng một cung** để dồn tải vào một node — một dạng **algorithmic DoS**. Phòng bằng cách thêm secret vào hàm hash (keyed hash như SipHash) hoặc không cho key ngoài quyết định trực tiếp partition.

### Các giới hạn khác cần nói ra

- **Không hỗ trợ range query.** Hash phá vỡ thứ tự: `user#1000` và `user#1001` nằm ở hai đầu cụm. Cần range scan thì phải range partitioning, hoặc thêm clustering key *bên trong* một partition (đúng cách DynamoDB/Cassandra làm: hash partition key, sort theo sort key trong partition).
- **Membership là một bài toán phân tán riêng.** Ring chỉ đúng nếu mọi client nhìn thấy **cùng một danh sách node**. Danh sách đó lan truyền qua gossip (Cassandra, Dynamo), qua config service (ZooKeeper/etcd), hoặc qua control plane (Redis Cluster). Trong lúc lan truyền chưa hội tụ, hai client có hai bản đồ → ghi lạc chỗ, đọc trượt.
- **Flapping rất tốn.** Node chập chờn (sống–chết–sống) khiến dữ liệu bị stream qua lại. Vì thế hệ thật không remove node khỏi ring ngay khi mất heartbeat mà dùng ngưỡng, phân biệt "tạm không truy cập được" (dùng hinted handoff) với "đã ngừng vĩnh viễn" (mới re-balance).

---

## 9. Các biến thể thực tế

Consistent hashing cổ điển không phải lựa chọn duy nhất. Có mấy biến thể đáng biết, vì chúng hay được hỏi ngay sau khi bạn vẽ xong cái ring.

### Rendezvous hashing (Highest Random Weight, HRW)

Không có ring. Với mỗi key, tính `w = hash(key, node)` **cho từng node**, rồi chọn node có `w` lớn nhất.

```python
def rendezvous(key: str, nodes: list[str]) -> str:
    return max(nodes, key=lambda n: h(f"{key}:{n}"))
```

- **Ưu**: cân bằng tải rất tốt **không cần vnode** (mỗi key được "bốc thăm" độc lập); lấy top-`k` để làm preference list là chuyện hiển nhiên (sắp xếp theo `w`); không cần cấu trúc dữ liệu, chỉ cần danh sách node; thêm/bớt node vẫn chỉ chuyển `1/N` key (thoả minimal disruption).
- **Nhược**: lookup **O(N)** — với 10 node thì nhanh hơn cả binary search trên ring 1.500 điểm, nhưng với 1.000 node thì quá đắt cho đường nóng (có biến thể skeleton-based cho O(log N)).
- **Dùng ở đâu**: chọn cache trong CDN, chọn shard trong cụm nhỏ–vừa, một số cài đặt gossip. Đây là lựa chọn mặc định tốt khi `N` nhỏ (dưới ~100).

### Jump consistent hash (Google, 2014)

Một hàm ~10 dòng, ánh xạ `(key, num_buckets) → bucket` với phân bố **hoàn hảo** và minimal disruption, **không tốn bộ nhớ**, chạy O(log N).

```python
def jump_hash(key: int, num_buckets: int) -> int:
    b, j = -1, 0
    while j < num_buckets:
        b = j
        key = (key * 2862933555777941757 + 1) & 0xFFFFFFFFFFFFFFFF
        j = int((b + 1) * (1 << 31) / ((key >> 33) + 1))
    return b
```

- **Ưu**: cân bằng gần hoàn hảo, 0 byte state, cực nhanh.
- **Nhược lớn**: bucket được đánh số `0..N−1` và **chỉ thêm/bớt được ở cuối dãy**. Không thể xoá bucket số 3 giữa dãy mà vẫn giữ nguyên các bucket khác. Nghĩa là: hợp cho **số shard tăng dần theo kế hoạch**, không hợp cho cụm mà node chết bất kỳ lúc nào.
- **Dùng ở đâu**: chia shard cho storage backend nội bộ, phân mảnh dữ liệu offline, nơi danh sách shard là logic và ổn định (có thể ánh xạ shard logic → máy vật lý ở một tầng riêng, và chính tầng đó xử lý node chết).

### Consistent hashing with bounded loads (Google/Vimeo, 2016)

Giữ ring bình thường, nhưng thêm một trần: không node nào được vượt quá `c × (tải trung bình)` với `c > 1` (ví dụ `c = 1.25`). Nếu node đích đã đầy, đi tiếp theo chiều kim đồng hồ tới node còn chỗ.

- **Ưu**: giải đúng bài toán hot key ở mức thuật toán — bảo đảm trần tải trong khi vẫn giữ được phần lớn tính "dính" (affinity).
- **Nhược**: phải **biết tải hiện tại** của mỗi node ⇒ cần state, hợp với load balancer (biết số request đang xử lý) hơn là với client cache stateless.
- **Dùng ở đâu**: HAProxy, Envoy (`maglev`/`ring_hash` + least-request), Vimeo dùng cho phân phối video.

### Maglev hashing (Google, 2016)

Xây trước một **bảng lookup** cỡ `M` (số nguyên tố lớn, ví dụ 65.537) bằng thuật toán điền chỗ sao cho mỗi backend chiếm gần đúng `M/N` ô. Lookup = `table[hash(key) % M]`, tức **O(1) không có binary search**.

- **Ưu**: lookup cực nhanh và cân bằng rất đều (lệch < 1%), hợp cho load balancer xử lý hàng triệu pps.
- **Nhược**: khi thay đổi tập backend phải dựng lại bảng; disruption nhỏ nhưng **không tối thiểu tuyệt đối** như ring.
- **Dùng ở đâu**: Google Maglev LB, Envoy `maglev` policy, Cilium.

### Bảng so sánh

| Thuật toán | Lookup | Bộ nhớ | Cân bằng | Minimal disruption | Hợp nhất cho |
|---|---|---|---|---|---|
| `hash % N` | O(1) | 0 | Hoàn hảo | ❌ Rất tệ | Cụm cố định vĩnh viễn |
| Ring + vnode | O(log V) | O(N·V) | Tốt (phụ thuộc V) | ✅ | Datastore, cache, cụm co giãn thường xuyên |
| Rendezvous (HRW) | O(N) | O(N) | Rất tốt, không cần vnode | ✅ | N nhỏ–vừa, cần top-k replica |
| Jump hash | O(log N) | 0 | Gần hoàn hảo | ✅ nhưng chỉ ở cuối dãy | Số shard tăng dần, bucket logic |
| Bounded-load | O(log V) + state | O(N·V) | Có trần cứng | ✅ (gần) | Load balancer, chống hot key |
| Maglev | O(1) | O(M) | Rất đều | ⚠️ Gần tối thiểu | LB throughput cực cao |

---

## 10. Sharding theo slot: biến thể "cố định số partition"

Có một cách tiếp cận khác, đơn giản hơn ring và cực kỳ phổ biến trong production: **hash vào một số cố định các partition logic, rồi gán partition cho node**.

```
key ──hash──► slot (0..16383) ──bảng gán──► node

16384 slot, 3 node:
  node-1: slot 0     – 5460
  node-2: slot 5461  – 10922
  node-3: slot 10923 – 16383

Thêm node-4  ⇒  mỗi node nhường ~1/4 slot của mình:
  node-1: 0–4095, node-2: 5461–9556, node-3: 10923–15018, node-4: phần còn lại
```

Đây chính là cách **Redis Cluster** (16.384 slot, CRC16), **Kafka** (số partition cố định cho mỗi topic), **Elasticsearch** (số primary shard chốt lúc tạo index) hoạt động. Ý tưởng: số partition **không đổi**, chỉ có **ánh xạ partition → node** thay đổi.

| Tiêu chí | Ring + vnode | Slot cố định |
|---|---|---|
| Ai quyết định ánh xạ | Hàm hash (phi tập trung) | Bảng gán (control plane / thoả thuận cluster) |
| Thêm node | Tự động, key tự chảy về | Phải **ra lệnh** di chuyển slot (resharding) |
| Kiểm soát vận hành | Thấp — hash quyết định | Cao — di chuyển từng slot, tạm dừng được, theo dõi được |
| Đổi số partition | Không có khái niệm | **Rất đau** (Kafka: đổi số partition phá vỡ thứ tự theo key; ES: phải reindex) |
| Cân bằng | Phụ thuộc V | Rất tốt nếu slot ≫ node |
| Client cần biết gì | Danh sách node + hàm hash | Toàn bộ bảng slot (Redis: client cache bảng, gặp `MOVED`/`ASK` thì refresh) |

> 💡 Nguyên tắc: Slot cố định là "consistent hashing có người lái". Bạn đánh đổi tính tự động lấy **quyền kiểm soát khi nào và cái gì di chuyển** — điều rất quý khi vận hành một cụm stateful. Ngược lại bạn phải chọn đúng số slot ngay từ đầu, vì đổi sau rất đắt.

Nói cách khác: hãy chọn số slot lớn hơn nhiều so với số node tối đa bạn sẽ từng có (16.384 slot cho một cụm tối đa vài trăm node là dư dả), rồi coi slot như "vnode có tên cố định".

---

## 11. Bottleneck & failure mode

Điều gì thực sự hỏng trong một hệ dùng consistent hashing:

### 1. Membership không hội tụ (bản đồ lệch pha)
Client A tin `B` còn sống, client B tin `B` đã chết. Cùng một key đi tới hai node khác nhau → ghi lạc chỗ, đọc trượt, và tệ hơn là **hai bản ghi phân kỳ**.
*Giảm nhẹ*: một nguồn chân lý cho membership (ZooKeeper/etcd hoặc gossip có version/epoch), client cache bản đồ kèm số epoch; server **từ chối** request mang epoch cũ và trả về bản đồ mới (Redis Cluster trả `MOVED`; Dynamo trả redirect).

### 2. Bão rebalance khi đổi topology
Thêm node ⇒ stream dữ liệu. Nếu không bóp băng thông, việc stream sẽ ăn hết NIC và làm tăng p99 của traffic thường.
*Giảm nhẹ*: throttle stream (`stream_throughput_outbound` kiểu Cassandra), thêm node **từng cái một** chứ không ồ ạt, làm vào giờ thấp điểm, và ưu tiên QoS cho traffic khách hàng.

### 3. Cascading failure do gánh nặng dồn
Đã nói ở mục 5: không có vnode thì node chết đẩy 100% tải của nó sang **một** hàng xóm.
*Giảm nhẹ*: vnode (bắt buộc), cộng thêm load shedding và circuit breaker để node kế tiếp từ chối bớt thay vì chết theo.

### 4. Cache stampede sau khi mất node
Dù chỉ `1/N` key mất cache, nếu `N` nhỏ (3 node) thì đó vẫn là 33% miss đổ thẳng vào DB trong vài giây.
*Giảm nhẹ*: request coalescing (một miss cho một key thì chỉ một request đi xuống DB), jitter TTL, negative caching, và giữ `N` đủ lớn để `1/N` là con số DB chịu được. Hot key/partition (mục 8) thì ring không cứu được — phải dùng local cache, replicate hot key, write sharding hoặc bounded-load.

### 5. Node không đồng nhất
Cụm gồm máy 16 GB lẫn 64 GB nhưng cấp cùng số vnode ⇒ máy nhỏ OOM trước, và **capacity cả cụm bị quyết định bởi máy yếu nhất**.
*Giảm nhẹ*: cấp vnode theo trọng số capacity (tham số `weight` trong đoạn code ở mục 6), hoặc giữ cụm đồng nhất — cách vận hành đơn giản hơn rất nhiều.

### 6. Va chạm hash / hàm hash lệch
Hiếm với 64/128-bit, nhưng **hash không ổn định giữa các client** thì không hiếm chút nào.
*Giảm nhẹ*: chốt thuật toán hash bằng văn bản trong spec, có test vector chung cho mọi ngôn ngữ client, và không bao giờ đổi hàm hash mà không có kế hoạch migrate (đổi hàm hash = rehash 100%, đúng bằng thảm hoạ ta vừa tránh).

---

## 12. Ai dùng trong thực tế

| Hệ thống | Cách dùng | Chi tiết đáng nhớ |
|---|---|---|
| **Amazon Dynamo / DynamoDB** | Ring + vnode ("virtual node"), preference list N=3 | Bài báo Dynamo 2007 là tài liệu kinh điển; DynamoDB ngày nay che giấu hoàn toàn ring sau khái niệm partition, tự split khi partition vượt 10 GB hoặc 3.000 RCU/1.000 WCU |
| **Apache Cassandra** | Ring + `num_tokens` vnode, Murmur3Partitioner | Mặc định mới là 16 token (giảm từ 256) vì lý do độ bền + chi phí repair; `NetworkTopologyStrategy` rải replica theo rack/AZ |
| **Riak, Voldemort, ScyllaDB** | Ring kiểu Dynamo | Riak dùng số vnode cố định (`ring_size`, luỹ thừa của 2) — lai giữa ring và slot |
| **Memcached (client-side)** | `libketama` / ketama consistent hashing, ~160 điểm/server | Server không biết gì cả — **client** giữ ring. Đây là ví dụ sạch nhất: 0 phối hợp server-side |
| **Redis Cluster** | 16.384 hash slot (CRC16), **không phải ring** | Slot cố định + bảng gán; hỗ trợ hash tag `{user123}` để ép nhiều key về cùng slot cho thao tác đa key |
| **Akamai / CloudFront / CDN** | Consistent hashing chọn edge cache giữ object | Ý tưởng gốc của bài báo 1997; giữ cache hit cao khi edge server thêm/bớt |
| **Envoy / Istio** | `ring_hash` và `maglev` LB policy | Định tuyến theo header/cookie/IP để đạt session affinity mà không cần sticky state |
| **Discord** | Consistent hashing chọn node giữ session/guild | Nổi tiếng với bài viết về scale trạng thái real-time |
| **Kafka** | `hash(key) % num_partitions` — **modulo thuần** | Cố ý: số partition không đổi nên modulo là đủ; nhưng vì thế đổi số partition sẽ phá vỡ thứ tự theo key |

Điều đáng để ý: **Kafka cố tình dùng modulo**. Đó không phải sai lầm — nó cho thấy consistent hashing chỉ cần thiết khi *mẫu số thay đổi*. Nếu bạn giữ mẫu số cố định (partition logic) và chỉ di chuyển ánh xạ partition → máy, bạn đã tránh được bài toán rehash bằng một cách khác đơn giản hơn.

---

## Liên hệ sang AWS

| Thành phần thiết kế | Dịch vụ AWS | Vì sao hợp |
|---|---|---|
| Phân mảnh dữ liệu key-value theo hash | **DynamoDB** | Partition key được hash (nội bộ) để chọn partition; AWS lo toàn bộ ring, split/merge partition, và rải 3 bản sao qua 3 AZ. Bạn chỉ còn phải lo **chọn partition key có cardinality cao** |
| Chống hot partition | **DynamoDB write sharding + adaptive capacity** | Thêm hậu tố `#0..#9` vào partition key khi ghi, fan-out khi đọc. Adaptive capacity tự mượn throughput cho partition nóng, nhưng **không cứu được** key nóng đơn lẻ — vẫn phải sharding ở tầng schema |
| Cache phân tán có slot | **ElastiCache for Redis (cluster mode enabled)** | Dùng **16.384 slot** chứ không phải hash ring thuần: ánh xạ slot→shard do cluster quản, resharding là thao tác có kiểm soát (online resharding), client dùng cluster-aware library và xử lý `MOVED`/`ASK`. Khác biệt quan trọng với ring: **bạn điều khiển được cái gì di chuyển khi nào**, đổi lại không có tính "tự chảy" |
| Cache phân tán kiểu ring | **ElastiCache for Memcached** | Client-side consistent hashing (ketama) qua Auto Discovery; server hoàn toàn không biết về ring. Thêm/bớt node → client cập nhật danh sách và chỉ ~1/N key bị miss |
| Session affinity ở tầng LB | **ALB** (sticky cookie) / **NLB** (flow hash 5-tuple) / **Envoy `ring_hash` trên EKS** | ALB dùng cookie chứ không phải consistent hashing — mất target là mất session. Cần affinity theo *key nghiệp vụ* thì dùng Envoy/Istio `ring_hash` hoặc `maglev` trên EKS, hash theo header (`x-user-id`) để cùng user luôn về cùng pod |
| Cache ở edge | **CloudFront** | Nội bộ dùng consistent hashing để chọn edge cache giữ object; cache key do bạn định nghĩa (cache policy). Chọn cache key quá "rộng" (đưa header biến thiên vào) = tự làm phân mảnh cache, hit rate sụp |
| Datastore kiểu Cassandra tự quản | **Keyspaces (Apache Cassandra compatible)** hoặc Cassandra trên **EC2** | Keyspaces che giấu token ring (serverless, tính theo request); tự quản trên EC2 thì bạn phải chọn `num_tokens`, rải node theo AZ, throttle streaming khi scale |
| Phân mảnh stream | **Kinesis Data Streams** | Shard được chia theo **khoảng hash MD5 của partition key** — đúng mô hình range-on-hash-space. Split/merge shard là thao tác thủ công/qua API: rất giống resharding theo slot |
| Membership / bản đồ cụm | **ECS Service Discovery / Cloud Map**, **EKS Endpoints**, hoặc **DynamoDB** làm registry | Ring chỉ đúng nếu mọi client thấy cùng danh sách node — cần một nguồn chân lý có version, không phải file config copy tay |
| Rebalance khi scale cụm stateful | **EKS + StatefulSet + PodDisruptionBudget**, hoặc ElastiCache online resharding | Điểm chung: thêm node **từng cái**, throttle stream, và không bao giờ thay đổi topology lúc cao điểm |

**Kết luận thực dụng cho AWS**: trong 90% trường hợp bạn **không tự cài consistent hashing** — DynamoDB, ElastiCache, Kinesis đã làm sẵn. Giá trị của việc hiểu nó nằm ở chỗ bạn biết *vì sao* phải chọn partition key có cardinality cao, *vì sao* resharding ElastiCache lại là một sự kiện cần lên lịch, và *vì sao* thêm node vào cụm Memcached thì DB phía sau đột nhiên tăng tải.

---

## Cách trình bày khi phỏng vấn / review

1. **Bắt đầu bằng vấn đề, không bằng giải pháp.** Viết `hash(key) % N` lên bảng, rồi hỏi ngược: "khi N đổi từ 10 lên 11 thì bao nhiêu key phải di chuyển?" Ra con số **~91%** — đó là lý do tồn tại của cả bài. Người phỏng vấn cần thấy bạn hiểu *tại sao cần*, không chỉ *cái gì*.
2. **Vẽ ring, giải thích quy tắc bằng một câu.** "Key thuộc node đầu tiên gặp theo chiều kim đồng hồ." Rồi chỉ vào hình: thêm node chỉ ảnh hưởng một cung, một node hàng xóm. Đừng vẽ 12 vòng tròn — một vòng với 4 node, 3 key là đủ.
3. **Chủ động nêu hai điểm yếu của ring cơ bản** trước khi bị hỏi: cung không đều, và node chết thì một hàng xóm gánh hết. Rồi mới rút ra virtual node như *hệ quả*, không phải như một tính năng rời rạc.
4. **Nói được con số vnode.** "V ≈ 100–200 cho cache, độ lệch chuẩn xuống ~10%; giảm lệch một nửa phải tăng V gấp 4 vì tỉ lệ `1/√V`." Và ngay sau đó nêu mặt trái: với datastore có replica, vnode quá nhiều làm tăng xác suất mất dữ liệu — Cassandra đã hạ mặc định từ 256 xuống 16. Chi tiết này gây ấn tượng rất mạnh vì nó chỉ đến từ kinh nghiệm vận hành.
5. **Nêu cài đặt thật:** mảng sorted + binary search O(log V), hoặc nướng thành lookup table O(1) nếu là đường siêu nóng. Nhấn mạnh hàm hash phải **xác định và giống nhau ở mọi client** — đây là bug production phổ biến nhất của consistent hashing tự viết.
6. **Chủ động chỉ ra giới hạn:** ring cân bằng *key*, không cân bằng *traffic*. Hot key vẫn dồn vào một node dù có 10.000 vnode. Kèm ngay giải pháp (local cache, replicate hot key, write sharding, bounded-load). Việc tự nêu giới hạn của giải pháp mình vừa đề xuất là dấu hiệu rõ nhất của level cao.
7. **Biết ít nhất hai biến thể và khi nào dùng.** Rendezvous khi `N` nhỏ và cần top-k replica; jump hash khi số shard tăng dần theo kế hoạch; bounded-load khi đây là load balancer và bạn biết tải hiện tại; Maglev khi cần O(1) ở triệu pps.
8. **Phân biệt ring với slot.** Nếu ai đó nói "Redis Cluster dùng consistent hashing", hãy chỉnh nhẹ: nó dùng **16.384 slot cố định + bảng gán**, tức là "consistent hashing có người lái" — đánh đổi tính tự động lấy quyền kiểm soát khi nào migrate cái gì.
9. **Khi review một thiết kế**, hỏi đúng bốn câu: *Partition key là gì và cardinality bao nhiêu? Thêm node thì cái gì phải copy và mất bao lâu? Node chết thì ai gánh? Key nóng nhất chiếm bao nhiêu phần trăm traffic?* Bốn câu này lộ ra gần như mọi lỗi phân mảnh.

> 💡 **Nguyên tắc cuối**: Consistent hashing không phải "thuật toán chia dữ liệu tốt nhất" — nó là **thuật toán làm cho việc đổi ý về topology trở nên rẻ**. Nếu cụm của bạn không bao giờ co giãn, modulo tốt hơn. Nếu bạn cần kiểm soát chặt từng lần migrate, slot cố định tốt hơn. Chọn đúng công cụ nghĩa là biết chính xác *cái giá* mà mỗi công cụ làm cho rẻ đi.
