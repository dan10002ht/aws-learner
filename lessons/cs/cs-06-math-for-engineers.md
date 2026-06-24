# Toán cho kỹ sư (thực dụng)

Phần lớn kỹ sư không cần giải tích hay đại số tuyến tính để làm việc hằng ngày. Nhưng có một nhúm khái niệm toán rời rạc xuất hiện đi xuất hiện lại trong code, trong bug, trong thiết kế hệ thống — và nếu nắm được, bạn sẽ "đọc" được tại sao một câu `if` bị sai, tại sao hash bị lệch tải, tại sao p99 latency cao gấp mười p50, tại sao `O(log n)` lại "phép màu". Bài này gom đúng nhúm đó: logic boolean, set, modulo, graph, tổ hợp đếm, xác suất, và logarit — toàn bộ qua analogy và ví dụ code thật, **không** một dòng chứng minh hình thức.

## 1. Logic boolean & De Morgan — gỡ rối điều kiện phức tạp

Mọi câu lệnh `if` đều là một biểu thức boolean: kết quả chỉ là `true` hoặc `false`. Khi điều kiện đơn giản thì không sao, nhưng khi nó dài ra — `if (a && !b || c && !d)` — bug thường nằm ở chỗ bạn **đảo ngược** điều kiện sai cách.

Ba phép cơ bản:

| Phép | Ký hiệu code | Đúng khi |
|---|---|---|
| AND | `&&` | cả hai vế đúng |
| OR | `\|\|` | ít nhất một vế đúng |
| NOT | `!` | đảo ngược |

**De Morgan** là quy tắc duy nhất bạn cần thuộc lòng để phủ định an toàn:

```
!(A && B)  ==  !A || !B
!(A || B)  ==  !A && !B
```

Đọc bằng lời: "phủ định của (A **và** B)" = "(không A) **hoặc** (không B)". Lưu ý phép AND/OR **đổi chỗ** cho nhau khi bạn đẩy dấu `!` vào trong. Đây chính là chỗ người ta hay sai.

Ví dụ thật — bạn muốn cho phép truy cập khi user **vừa** đã đăng nhập **vừa** đã verify email:

```js
if (loggedIn && verified) allow();
```

Giờ cần nhánh "chặn" — nhiều người viết vội:

```js
if (!loggedIn && !verified) block();   // ❌ SAI
```

Điều kiện chặn đúng là phủ định của điều kiện cho phép. Theo De Morgan:

```
!(loggedIn && verified)  ==  !loggedIn || !verified
```

```js
if (!loggedIn || !verified) block();   // ✅ chặn nếu THIẾU bất kỳ điều kiện nào
```

Cách viết sai chỉ chặn khi **cả hai** đều thiếu — nghĩa là một user đã đăng nhập nhưng chưa verify vẫn lọt qua. Đây là dạng lỗ hổng phân quyền kinh điển.

> 💡 Ghi nhớ: Khi đẩy `!` vào trong ngoặc, `&&` biến thành `||` và ngược lại. Sai chỗ này là sai logic auth/filter — loại bug rất khó thấy vì test "happy path" vẫn xanh.

### Short-circuit — thứ tự quan trọng

`&&` và `||` đánh giá **từ trái sang phải và dừng sớm**:

- `A && B`: nếu A là `false`, B **không** chạy (kết quả chắc chắn false).
- `A || B`: nếu A là `true`, B **không** chạy.

```js
if (user != null && user.isAdmin) { ... }   // an toàn: nếu user null, không đọc .isAdmin
if (user.isAdmin && user != null) { ... }    // 💥 crash nếu user null
```

> ⚠️ Bẫy: Đặt điều kiện "rẻ và bảo vệ" (null check) **trước** điều kiện "đắt hoặc nguy hiểm". Short-circuit vừa tránh crash vừa là một thủ thuật tối ưu (đặt điều kiện hay false nhất lên đầu của `&&` để bỏ qua phần còn lại).

## 2. Set & quan hệ — nền tảng của SQL và dedup

Một **set** là tập hợp các phần tử **không trùng nhau**, **không quan tâm thứ tự**. Ba phép quan hệ bạn dùng mỗi ngày (kể cả khi không gọi tên):

```
A = {1, 2, 3}      B = {2, 3, 4}

union (A ∪ B)        = {1, 2, 3, 4}   gộp, bỏ trùng
intersection (A ∩ B) = {2, 3}         phần chung
difference (A − B)   = {1}            có trong A, không trong B
```

Sơ đồ Venn hai tập A, B — ba vùng map thẳng sang SQL:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Sơ đồ Venn hai tập A và B với ba vùng A−B, A∩B, B−A</title>
  <desc>Hai vòng tròn A và B giao nhau. Vùng chỉ thuộc A (A−B) tô xanh ứng với EXCEPT, vùng giao A∩B tô lục ứng với INNER JOIN, vùng chỉ thuộc B (B−A) tô hổ phách; toàn bộ hai vòng là UNION.</desc>
  <text x="360" y="28" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">Venn hai tập → phép quan hệ SQL</text>
  <defs>
    <clipPath id="clipA"><circle cx="290" cy="155" r="115"/></clipPath>
    <clipPath id="clipB"><circle cx="430" cy="155" r="115"/></clipPath>
  </defs>
  <circle cx="290" cy="155" r="115" fill="#3b82f6" fill-opacity="0.14"/>
  <circle cx="430" cy="155" r="115" fill="#f59e0b" fill-opacity="0.14"/>
  <g clip-path="url(#clipA)"><circle cx="430" cy="155" r="115" fill="#10b981" fill-opacity="0.30"/></g>
  <circle cx="290" cy="155" r="115" fill="none" stroke="currentColor" stroke-opacity="0.5"/>
  <circle cx="430" cy="155" r="115" fill="none" stroke="currentColor" stroke-opacity="0.5"/>
  <text x="218" y="92" font-size="15" font-weight="700" fill="currentColor">A</text>
  <text x="502" y="92" font-size="15" font-weight="700" fill="currentColor">B</text>
  <text x="225" y="150" font-size="17" font-weight="700" text-anchor="middle" fill="currentColor">1</text>
  <text x="360" y="150" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">2 · 3</text>
  <text x="495" y="150" font-size="17" font-weight="700" text-anchor="middle" fill="currentColor">4</text>
  <text x="225" y="175" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">A−B</text>
  <text x="360" y="175" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">A∩B</text>
  <text x="495" y="175" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">B−A</text>
  <g font-size="11.5">
    <rect x="40" y="288" width="14" height="14" rx="3" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="60" y="299" fill="currentColor">A−B = EXCEPT</text>
    <rect x="250" y="288" width="14" height="14" rx="3" fill="#10b981" fill-opacity="0.30" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="270" y="299" fill="currentColor">A∩B = INNER JOIN</text>
    <rect x="480" y="288" width="14" height="14" rx="3" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="500" y="299" fill="currentColor">cả hai vòng = UNION</text>
  </g>
</svg>

**Liên hệ SQL** — đây chính xác là các phép JOIN/set operation:

| Toán học | SQL |
|---|---|
| A ∩ B | `INNER JOIN` (chỉ hàng khớp ở cả hai bảng) |
| A ∪ B (bỏ trùng) | `UNION` |
| A ∪ B (giữ trùng) | `UNION ALL` |
| A − B | `EXCEPT` / `LEFT JOIN ... WHERE B.id IS NULL` |

Hiểu được bản chất set giúp bạn biết tại sao `UNION` chậm hơn `UNION ALL`: `UNION` phải **dedup** (loại trùng), tốn thêm một bước sort/hash toàn bộ kết quả.

**Liên hệ dedup** — loại trùng trong code:

```python
emails = ["a@x.com", "b@x.com", "a@x.com"]
unique = set(emails)          # {"a@x.com", "b@x.com"} — O(n)
```

Dùng set để dedup là O(n) vì kiểm tra "đã có chưa?" là O(1) (xem bài Hash Map). Nếu dùng list và `if x not in list` thì mỗi lần kiểm tra là O(n) → tổng O(n²). Cùng một việc, sai cấu trúc dữ liệu là chậm gấp bội.

> 💡 Ghi nhớ: "Loại trùng", "đã thấy chưa", "phần chung của hai danh sách" → nghĩ ngay tới **set**. Đừng dùng list với vòng lặp lồng nhau.

## 3. Modulo — phép toán âm thầm chạy hạ tầng

`a % n` là **số dư** khi chia `a` cho `n`. Kết quả luôn nằm trong `[0, n-1]`. Tính chất "gói gọn vào một khoảng cố định" này khiến modulo có mặt khắp nơi.

```
17 % 5 = 2        17 % 12 = 5  (đồng hồ: 17h = 5h chiều)
```

Ba ứng dụng cốt lõi:

**a) Round-robin** — chia việc đều cho N worker:

```python
worker = request_id % num_workers   # 0,1,2,0,1,2,... xoay vòng
```

**b) Sharding / hashing** — quyết định data nằm ở node nào:

```python
shard = hash(user_id) % num_shards   # luôn ra cùng node cho cùng user
```

**c) Bucket trong hash table** — biến số hash khổng lồ thành chỉ số mảng:

```python
index = hash(key) % bucket_count
```

> ⚠️ Bẫy — modulo sharding & việc thêm node: Nếu bạn shard bằng `hash(key) % N` rồi tăng N từ 4 lên 5 node, thì **gần như mọi key đổi shard** (vì số dư đổi). Hậu quả: cache miss hàng loạt, phải di chuyển gần hết dữ liệu. Đây là lý do hệ thống thật dùng **consistent hashing** (thứ DynamoDB, Cassandra, nhiều CDN dùng) thay vì modulo thuần — thêm/bớt node chỉ ảnh hưởng một phần nhỏ key.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>So sánh modulo sharding và consistent hashing khi thêm node</title>
  <desc>Bên trái: shard bằng hash % N, thêm 1 node từ 4 lên 5 làm gần như 100% key đổi shard. Bên phải: consistent hashing trên vòng tròn, thêm node chỉ làm khoảng 1 trên N key phải di chuyển.</desc>
  <text x="180" y="26" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Modulo % N — thêm node</text>
  <text x="540" y="26" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Consistent hashing — thêm node</text>
  <line x1="360" y1="44" x2="360" y2="320" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="40" y="62" font-size="11" fill="currentColor" opacity="0.7">Trước: hash(key) % 4</text>
  <g font-size="11">
    <rect x="40" y="72" width="28" height="22" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><text x="54" y="87" text-anchor="middle" fill="currentColor">0</text>
    <rect x="78" y="72" width="28" height="22" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><text x="92" y="87" text-anchor="middle" fill="currentColor">1</text>
    <rect x="116" y="72" width="28" height="22" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><text x="130" y="87" text-anchor="middle" fill="currentColor">2</text>
    <rect x="154" y="72" width="28" height="22" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><text x="168" y="87" text-anchor="middle" fill="currentColor">3</text>
  </g>
  <text x="40" y="128" font-size="11" fill="currentColor" opacity="0.7">Sau: hash(key) % 5 → số dư đổi hết</text>
  <g font-size="11">
    <rect x="40" y="138" width="28" height="22" rx="4" fill="#ef4444" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/><text x="54" y="153" text-anchor="middle" fill="currentColor">0</text>
    <rect x="78" y="138" width="28" height="22" rx="4" fill="#ef4444" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/><text x="92" y="153" text-anchor="middle" fill="currentColor">1</text>
    <rect x="116" y="138" width="28" height="22" rx="4" fill="#ef4444" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/><text x="130" y="153" text-anchor="middle" fill="currentColor">2</text>
    <rect x="154" y="138" width="28" height="22" rx="4" fill="#ef4444" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/><text x="168" y="153" text-anchor="middle" fill="currentColor">3</text>
    <rect x="192" y="138" width="28" height="22" rx="4" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.4"/><text x="206" y="153" text-anchor="middle" fill="currentColor">4</text>
  </g>
  <text x="40" y="205" font-size="13" font-weight="700" fill="currentColor">~100% key phải di chuyển</text>
  <text x="40" y="226" font-size="11" fill="currentColor" opacity="0.7">→ bão cache miss, dời gần hết dữ liệu</text>
  <circle cx="540" cy="170" r="95" fill="none" stroke="currentColor" stroke-opacity="0.35" stroke-width="2"/>
  <g>
    <circle cx="540" cy="75" r="11" fill="#3b82f6" fill-opacity="0.85"/><text x="540" y="79" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">N1</text>
    <circle cx="630" cy="200" r="11" fill="#3b82f6" fill-opacity="0.85"/><text x="630" y="204" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">N2</text>
    <circle cx="450" cy="200" r="11" fill="#3b82f6" fill-opacity="0.85"/><text x="450" y="204" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">N3</text>
    <circle cx="612" cy="100" r="11" fill="#10b981" fill-opacity="0.9"/><text x="612" y="104" font-size="10" font-weight="700" text-anchor="middle" fill="#fff">N4</text>
  </g>
  <circle cx="500" cy="86" r="4" fill="currentColor"/>
  <circle cx="588" cy="240" r="4" fill="currentColor"/>
  <circle cx="465" cy="135" r="4" fill="currentColor"/>
  <text x="612" y="135" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">N4 mới</text>
  <path d="M583 118 a95 95 0 0 1 12 28" fill="none" stroke="#10b981" stroke-width="3" stroke-opacity="0.7"/>
  <text x="540" y="305" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">chỉ ~1/N key đổi node</text>
  <text x="540" y="324" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">→ DynamoDB, Cassandra, CDN dùng cách này</text>
</svg>

Một bẫy nhỏ về dấu: trong nhiều ngôn ngữ (Python an toàn, nhưng JS/Java/C++ thì không) `-7 % 3` có thể ra số **âm**. Nếu dùng kết quả làm chỉ số mảng → crash. Phòng thủ: `((a % n) + n) % n`.

## 4. Graph cơ bản — khi dữ liệu là "quan hệ"

Graph chỉ gồm **node** (đỉnh) và **edge** (cạnh nối hai node). Nghe trừu tượng nhưng bạn gặp graph mỗi ngày:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Graph node và edge — directed graph và DAG</title>
  <desc>Bên trái là directed graph có chu trình: A theo B, B theo C, C theo A. Bên phải là DAG đồ thị phụ thuộc package không có chu trình. Edge biểu diễn quan hệ như follow, import module, gọi service.</desc>
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="180" y="26" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Directed graph (có chu trình)</text>
  <text x="540" y="26" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">DAG (không chu trình)</text>
  <line x1="360" y1="44" x2="360" y2="300" stroke="currentColor" stroke-opacity="0.25"/>
  <g stroke="currentColor" stroke-opacity="0.6" stroke-width="1.6" fill="none" marker-end="url(#arrow)">
    <path d="M115 95 L245 95"/>
    <path d="M255 120 L150 215"/>
    <path d="M110 215 L100 120"/>
  </g>
  <g>
    <circle cx="100" cy="95" r="22" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.5"/><text x="100" y="100" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">A</text>
    <circle cx="260" cy="95" r="22" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.5"/><text x="260" y="100" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">B</text>
    <circle cx="130" cy="225" r="22" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.5"/><text x="130" y="230" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">C</text>
  </g>
  <text x="180" y="92" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">follow</text>
  <text x="270" y="290" font-size="10.5" text-anchor="middle" fill="#ef4444">A→B→C→A: cycle!</text>
  <g stroke="currentColor" stroke-opacity="0.6" stroke-width="1.6" fill="none" marker-end="url(#arrow)">
    <path d="M540 117 L470 165"/>
    <path d="M540 117 L610 165"/>
    <path d="M468 192 L535 240"/>
    <path d="M612 192 L545 240"/>
  </g>
  <g>
    <circle cx="540" cy="95" r="22" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.5"/><text x="540" y="100" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">app</text>
    <circle cx="455" cy="180" r="22" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.5"/><text x="455" y="185" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">libA</text>
    <circle cx="625" cy="180" r="22" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.5"/><text x="625" y="185" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">libB</text>
    <circle cx="540" cy="262" r="22" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.5"/><text x="540" y="267" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">util</text>
  </g>
  <text x="478" y="138" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">import</text>
  <text x="540" y="305" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">topological sort chạy được</text>
  <text x="360" y="318" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">edge = quan hệ: bạn bè · follow · import module · gọi service · foreign key</text>
</svg>

| Bài toán thực tế | Là graph gì |
|---|---|
| Mạng xã hội (ai follow ai) | directed graph |
| Đồ thị phụ thuộc package (npm/pip) | directed acyclic graph (DAG) |
| Map đường đi (Google Maps) | weighted graph (trọng số = khoảng cách) |
| Microservice gọi lẫn nhau | directed graph |
| Foreign key giữa các bảng | graph |

Hai thuật toán duyệt bạn nên nhận diện:

- **BFS** (duyệt theo lớp): "đường ngắn nhất qua bao nhiêu bước?" — gợi ý bạn bè chung, số bậc kết nối.
- **DFS** (đi sâu hết nhánh rồi quay lại): phát hiện **cycle** (chu trình).

Phát hiện cycle cực kỳ thực dụng: nếu module A import B, B import C, C import A → **circular dependency**, nhiều bundler báo lỗi. Hệ thống build (Make, Bazel, terraform) phải sắp xếp thứ tự thực thi bằng **topological sort** trên DAG — và nó chỉ chạy được nếu **không có cycle**.

> 💡 Ghi nhớ: Khi dữ liệu của bạn là "X liên quan tới Y", bạn đang có một graph. Câu hỏi "có đường nối không / ngắn nhất bao xa / có vòng lặp không" đều là bài toán graph đã có lời giải sẵn.

## 5. Tổ hợp đếm — đếm khả năng để ước lượng rủi ro

Bạn không cần học thuộc công thức; chỉ cần một trực giác: **đếm số khả năng** để biết một sự kiện "hiếm" thực ra hiếm tới đâu.

Quy tắc nhân: nếu bước 1 có `a` cách, bước 2 có `b` cách thì tổng là `a × b`.

```
Password 4 chữ số:        10 × 10 × 10 × 10 = 10^4 = 10.000 khả năng
UUID v4 (122 bit ngẫu nhiên): ~ 5.3 × 10^36 khả năng
```

Con số "số khả năng" này quyết định **xác suất collision** (đụng độ). Không gian càng lớn, càng khó trùng. Đây là cầu nối sang mục xác suất.

> 💡 Ghi nhớ: Trước khi tin "ID ngẫu nhiên thì không bao giờ trùng", hãy hỏi: không gian có bao nhiêu khả năng, và mình sinh ra bao nhiêu ID? Trực giác của con người về số lần va chạm gần như **luôn sai** (xem mục dưới).

## 6. Xác suất thực dụng

### Birthday paradox & hash collision

Câu đố kinh điển: trong phòng có bao nhiêu người thì xác suất **có hai người trùng ngày sinh** vượt 50%? Trực giác nói "phải nhiều, cỡ 180". Đáp án thật: **chỉ 23 người**.

Lý do: bạn không so một người với một ngày cố định, mà so **mọi cặp** với nhau. 23 người tạo ra `23×22/2 = 253` cặp — đủ nhiều để va chạm thành chuyện thường.

Hệ quả kỹ thuật: collision xảy ra sớm hơn nhiều so với cảm nhận. Quy tắc ngón tay cái — với không gian `N` khả năng, bạn bắt đầu kỳ vọng có collision sau khoảng **√N** lần sinh (chứ không phải N).

```
Hash 32-bit:  N = 2^32 ≈ 4.3 tỷ
              √N ≈ 65.000  → chỉ ~65k phần tử đã có ~50% khả năng đụng!
```

> ⚠️ Bẫy: Một hash 32-bit (như CRC32 hay 8 ký tự hex đầu của SHA) **không** an toàn làm khoá duy nhất ở quy mô lớn — bạn đụng collision sau vài chục nghìn item. Muốn ID gần như chắc chắn không trùng, dùng không gian đủ lớn: UUID v4 (122 bit) hay SHA-256. Đây cũng là lý do hash table cần xử lý collision thay vì giả vờ nó không xảy ra.

### p99 latency — tại sao "trung bình" lừa bạn

Khi đo độ trễ, **giá trị trung bình (mean) gần như vô dụng** vì latency có phân phối lệch đuôi dài (long tail): đa số request nhanh, một số ít cực chậm. Người ta dùng **percentile**:

```
p50 (median) = 20ms   → 50% request nhanh hơn 20ms
p99          = 800ms  → 99% nhanh hơn 800ms; 1% chậm hơn
p99.9        = 3s     → đuôi xa
```

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Phân phối latency long-tail với p50, p99, p99.9</title>
  <desc>Histogram lệch phải: đa số request rất nhanh tạo cột cao quanh p50 ở 20ms, đuôi dài bên phải gồm rất ít request nhưng cực chậm tại p99 800ms và p99.9 3 giây.</desc>
  <text x="360" y="26" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">Phân phối latency — đuôi dài (long tail)</text>
  <text x="20" y="50" font-size="11" fill="currentColor" opacity="0.7">số request</text>
  <line x1="70" y1="60" x2="70" y2="270" stroke="currentColor" stroke-opacity="0.4"/>
  <line x1="70" y1="270" x2="700" y2="270" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="700" y="290" font-size="11" text-anchor="end" fill="currentColor" opacity="0.7">latency →</text>
  <g fill="#3b82f6" fill-opacity="0.6" stroke="currentColor" stroke-opacity="0.25">
    <rect x="78" y="200" width="22" height="70"/>
    <rect x="102" y="120" width="22" height="150"/>
    <rect x="126" y="80" width="22" height="190"/>
    <rect x="150" y="100" width="22" height="170"/>
    <rect x="174" y="150" width="22" height="120"/>
    <rect x="198" y="195" width="22" height="75"/>
    <rect x="222" y="225" width="22" height="45"/>
    <rect x="246" y="240" width="22" height="30"/>
    <rect x="270" y="248" width="22" height="22"/>
    <rect x="294" y="253" width="22" height="17"/>
    <rect x="318" y="257" width="22" height="13"/>
    <rect x="342" y="259" width="22" height="11"/>
    <rect x="366" y="261" width="22" height="9"/>
    <rect x="390" y="262" width="22" height="8"/>
    <rect x="438" y="263" width="22" height="7"/>
    <rect x="486" y="264" width="22" height="6"/>
    <rect x="540" y="265" width="22" height="5"/>
    <rect x="600" y="265" width="22" height="5"/>
    <rect x="660" y="266" width="22" height="4"/>
  </g>
  <text x="300" y="170" font-size="11.5" fill="currentColor" opacity="0.75">đuôi dài: ít request nhưng RẤT chậm</text>
  <path d="M430 175 q120 5 240 85" fill="none" stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="4 3"/>
  <g stroke="currentColor" stroke-opacity="0.55" stroke-dasharray="3 3">
    <line x1="137" y1="60" x2="137" y2="270"/>
    <line x1="449" y1="90" x2="449" y2="270"/>
    <line x1="671" y1="120" x2="671" y2="270"/>
  </g>
  <g font-size="11.5" font-weight="700" text-anchor="middle">
    <text x="137" y="300" fill="#10b981">p50</text>
    <text x="449" y="300" fill="#f59e0b">p99</text>
    <text x="671" y="300" fill="#ef4444">p99.9</text>
  </g>
  <g font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">
    <text x="137" y="316">20ms</text>
    <text x="449" y="316">800ms</text>
    <text x="671" y="316">3s</text>
  </g>
</svg>

Tại sao p99 là con số quan trọng nhất:

- 1% nghe nhỏ, nhưng nếu một trang gọi **100 microservice** nội bộ, xác suất **ít nhất một** call rơi vào p99 là `1 − 0.99^100 ≈ 63%`. Nghĩa là **đa số** request người dùng sẽ "đụng" cái đuôi chậm của ít nhất một service.
- Tối ưu p50 không giúp gì cho trải nghiệm tệ nhất; phải săn p99/p99.9.

> 💡 Ghi nhớ: Đừng bao giờ chỉ nhìn latency trung bình. Một service "trung bình 30ms" có thể có p99 là 2s — và đó mới là thứ user khó chịu cảm nhận được. AWS CloudWatch cho phép theo dõi percentile (`p99`, `p99.9`) chứ không chỉ Average — hãy alarm trên p99.

### Load balancing — tải có thực sự "đều"?

Chia request ngẫu nhiên cho các server **không** cho tải đều tuyệt đối. Giống như ném bóng ngẫu nhiên vào các giỏ, sẽ có giỏ nhiều giỏ ít. Nếu bạn rải `n` request vào `n` server ngẫu nhiên, server bận nhất kỳ vọng nhận cỡ `~ln n / ln ln n` request — lệch đáng kể khi quy mô lớn.

Đó là lý do kỹ thuật **"power of two choices"** ra đời: thay vì chọn 1 server ngẫu nhiên, chọn **2** ngẫu nhiên rồi đẩy vào cái đang ít việc hơn. Chỉ một thay đổi nhỏ này giảm độ lệch tải xuống cực mạnh — nhiều load balancer hiện đại (kể cả của AWS) dùng ý tưởng họ hàng với nó thay vì round-robin/random thuần.

## 7. Logarit & growth — vì sao O(log n) là "phép màu"

`log₂(n)` trả lời câu: "**chia đôi n bao nhiêu lần thì còn 1?**". Chỉ vậy thôi — không cần nhớ công thức gì thêm.

```
n = 8  → chia đôi: 8→4→2→1  = 3 lần   → log₂(8) = 3
n = 1.000.000  → log₂ ≈ 20
n = 1.000.000.000 (1 tỷ) → log₂ ≈ 30
```

Hãy nhìn con số đó cho thật kỹ: dữ liệu **một tỷ** phần tử, một thuật toán `O(log n)` chỉ cần **~30 bước**. Đó là sức mạnh của binary search và cây cân bằng (B-tree).

Bảng so sánh số bước khi `n` tăng:

| n | O(log n) | O(n) | O(n log n) | O(n²) |
|---|---|---|---|---|
| 10 | ~3 | 10 | ~33 | 100 |
| 1.000 | ~10 | 1.000 | ~10.000 | 1 triệu |
| 1.000.000 | ~20 | 1 triệu | ~20 triệu | 10^12 (treo máy) |

Đường tăng trưởng — cùng một trục, khác nhau một trời một vực:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>So sánh đường tăng trưởng O(log n), O(n), O(n log n), O(n²)</title>
  <desc>Bốn đường cùng một trục số bước theo n. O(log n) gần như phẳng, O(n) tuyến tính, O(n log n) cong nhẹ trên tuyến tính, O(n bình phương) bùng nổ dốc đứng lên trên.</desc>
  <text x="360" y="26" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">Tốc độ tăng theo n</text>
  <text x="20" y="48" font-size="11" fill="currentColor" opacity="0.7">số bước</text>
  <line x1="70" y1="56" x2="70" y2="300" stroke="currentColor" stroke-opacity="0.4"/>
  <line x1="70" y1="300" x2="690" y2="300" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="690" y="320" font-size="11" text-anchor="end" fill="currentColor" opacity="0.7">n →</text>
  <path d="M70 300 Q160 70 280 60" fill="none" stroke="#ef4444" stroke-width="2.5"/>
  <text x="288" y="66" font-size="12" font-weight="700" fill="#ef4444">O(n²)</text>
  <path d="M70 300 Q330 150 560 70" fill="none" stroke="#8b5cf6" stroke-width="2.5"/>
  <text x="566" y="74" font-size="12" font-weight="700" fill="#8b5cf6">O(n log n)</text>
  <path d="M70 300 L640 150" fill="none" stroke="#3b82f6" stroke-width="2.5"/>
  <text x="646" y="150" font-size="12" font-weight="700" fill="#3b82f6">O(n)</text>
  <path d="M70 300 Q150 270 250 268 T640 262" fill="none" stroke="#10b981" stroke-width="2.5"/>
  <text x="500" y="282" font-size="12" font-weight="700" fill="#10b981">O(log n) gần như phẳng</text>
</svg>

**Liên hệ thực tế** — đây chính là lý do **database index** đáng giá:

- Không index: tìm 1 hàng trong 10 triệu hàng = quét toàn bảng = O(n) = 10 triệu lần đọc.
- Có index (B-tree): O(log n) ≈ **24 lần đọc**.

Chênh lệch ~400.000 lần. Một câu query từ 5 giây xuống 5ms chỉ nhờ thêm đúng một index.

> 💡 Ghi nhớ: Mỗi khi `n` tăng gấp đôi, thuật toán `O(log n)` chỉ tốn thêm **đúng 1 bước**. Đó là lý do nó "miễn nhiễm" với quy mô. Khi thấy query chậm tuyến tính theo số hàng → gần như luôn là thiếu index biến O(n) thành O(log n).

## Vì sao kỹ sư cần biết

- **Debug**: Lỗi auth/filter "lọt người không nên lọt" thường là phủ định điều kiện sai — De Morgan và short-circuit cho bạn công cụ kiểm tra lại logic một cách máy móc thay vì đoán.
- **Performance**: Biết set/log/modulo giúp bạn nhìn ra ngay khi nào một đoạn code đang là O(n²) lẽ ra phải O(n), hay vì sao thêm một index biến O(n) thành O(log n) — chênh lệch hàng trăm nghìn lần.
- **System design**: Birthday paradox cảnh báo bạn chọn độ rộng ID/hash đủ lớn; modulo vs consistent hashing quyết định việc thêm node có gây "bão" di chuyển dữ liệu hay không; power-of-two-choices giải thích cách load balancer chia tải đều.
- **Đo lường & vận hành (chạm AWS)**: Hiểu percentile khiến bạn alarm CloudWatch trên **p99/p99.9** thay vì Average — đo đúng thứ user thực sự cảm nhận. Khi một request gọi hàng chục service nội bộ, xác suất chạm đuôi chậm cộng dồn rất nhanh, và đó là gốc rễ của phần lớn sự cố "lúc nhanh lúc chậm" khó tái hiện.
