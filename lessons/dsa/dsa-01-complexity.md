# Độ phức tạp Big-O

Khi code chạy đúng, câu hỏi tiếp theo luôn là: **nó chạy nhanh đến mức nào khi dữ liệu lớn lên?** Big-O là ngôn ngữ chung để trả lời câu hỏi đó — không cần đo đồng hồ, không phụ thuộc máy, không phụ thuộc ngôn ngữ. Bài này dạy bạn cách *đọc* và *ước lượng* độ phức tạp đủ nhanh để dùng trong code review thật và trả lời trôi chảy khi phỏng vấn.

## Vì sao phải quan tâm hiệu năng?

Một thuật toán có thể chạy mượt với 100 phần tử nhưng treo cứng với 10 triệu phần tử. Sự khác biệt không nằm ở CPU nhanh hay chậm, mà ở **cách thời gian chạy tăng theo kích thước input** (gọi là `n`).

Ví dụ thực tế: bạn có 2 cách kiểm tra "user đã tồn tại chưa".

- Cách A: duyệt cả `list` user → mỗi lần kiểm tra tốn `O(n)`.
- Cách B: tra trong `set`/`hash map` → mỗi lần `O(1)`.

Với 1 triệu user và 1 triệu lần kiểm tra: cách A làm ~10^12 phép so sánh (vài phút đến vài giờ), cách B làm ~10^6 (vài mili-giây). Cùng một bài toán, khác nhau về **bậc tăng trưởng** — đó chính là điều Big-O nắm bắt.

> Ghi nhớ: Tối ưu *bậc tăng trưởng* (đổi `O(n)` thành `O(log n)`) gần như luôn đáng giá hơn tối ưu hằng số (làm vòng lặp nhanh hơn 2 lần). Hằng số bị `n` lớn nuốt chửng.

## Big-O notation là gì?

Big-O mô tả **giới hạn trên của tốc độ tăng trưởng** thời gian (hoặc bộ nhớ) khi `n → ∞`. Nó cố tình bỏ qua chi tiết để lộ ra bản chất:

1. **Bỏ hằng số:** `O(2n)` viết thành `O(n)`. Việc một phép tốn 3ns hay 5ns không đổi bậc.
2. **Giữ số hạng trội nhất:** `O(n^2 + n + 100)` viết thành `O(n^2)`. Khi `n` lớn, `n^2` áp đảo phần còn lại.

```python
# Tổng số thao tác: 3n + 2  ->  Big-O: O(n)
def total(items):
    s = 0                 # 1
    for x in items:       # n vòng
        s += x            # n
        s += 1            # n
    return s + 2          # 1
```
```javascript
// Tổng số thao tác: 3n + 2  ->  Big-O: O(n)
function total(items) {
  let s = 0;                       // 1
  for (const x of items) {         // n vòng
    s += x;                        // n
    s += 1;                        // n
  }
  return s + 2;                    // 1
}
```
```java
// Tổng số thao tác: 3n + 2  ->  Big-O: O(n)
static int total(int[] items) {
    int s = 0;                     // 1
    for (int x : items) {          // n vòng
        s += x;                    // n
        s += 1;                    // n
    }
    return s + 2;                  // 1
}
```
```go
// Tổng số thao tác: 3n + 2  ->  Big-O: O(n)
func total(items []int) int {
    s := 0                         // 1
    for _, x := range items {      // n vòng
        s += x                     // n
        s += 1                     // n
    }
    return s + 2                   // 1
}
```

```cpp
// Tổng số thao tác: 3n + 2  ->  Big-O: O(n)
int total(const std::vector<int>& items) {
    int s = 0;                     // 1
    for (int x : items) {          // n vòng
        s += x;                    // n
        s += 1;                    // n
    }
    return s + 2;                  // 1
}
```

## Các lớp độ phức tạp thường gặp

### O(1) — hằng số

Thời gian không đổi dù `n` bao lớn. Truy cập phần tử mảng theo index, tra `hash map`, push/pop `stack`.

```python
def first(arr):
    return arr[0]        # luôn 1 thao tác
```
```javascript
function first(arr) {
  return arr[0];         // luôn 1 thao tác
}
```
```java
static int first(int[] arr) {
    return arr[0];       // luôn 1 thao tác
}
```
```go
func first(arr []int) int {
    return arr[0]        // luôn 1 thao tác
}
```

```cpp
int first(const std::vector<int>& arr) {
    return arr[0];       // luôn 1 thao tác
}
```

### O(log n) — logarit

Mỗi bước **loại bỏ một nửa** dữ liệu còn lại. Kinh điển là `binary search`. Với `n = 1 tỷ`, chỉ cần ~30 bước. Cực nhanh, gần như "miễn phí".

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 230" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Binary search loại bỏ một nửa mỗi bước</title>
  <desc>Phạm vi tìm kiếm thu nhỏ một nửa qua từng bước: 16 phần tử còn 8, rồi 4, rồi 2, rồi 1 — chỉ tốn 4 bước, minh hoạ vì sao binary search là O(log n).</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Binary search: mỗi bước bỏ một nửa → O(log n)</text>
  <g font-size="11">
    <rect x="16" y="40" width="416" height="30" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="224" y="60" text-anchor="middle" fill="currentColor" font-weight="700">n = 16 phần tử</text>
    <text x="448" y="60" fill="currentColor" opacity="0.7">bước 0</text>
    <rect x="16" y="78" width="208" height="30" rx="6" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="224" y="78" width="208" height="30" rx="6" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.12" stroke-dasharray="3 3"/>
    <text x="120" y="98" text-anchor="middle" fill="currentColor" font-weight="700">8</text>
    <text x="328" y="98" text-anchor="middle" fill="currentColor" opacity="0.45">đã loại</text>
    <text x="448" y="98" fill="currentColor" opacity="0.7">bước 1</text>
    <rect x="16" y="116" width="104" height="30" rx="6" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="120" y="116" width="312" height="30" rx="6" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.12" stroke-dasharray="3 3"/>
    <text x="68" y="136" text-anchor="middle" fill="currentColor" font-weight="700">4</text>
    <text x="448" y="136" fill="currentColor" opacity="0.7">bước 2</text>
    <rect x="16" y="154" width="52" height="30" rx="6" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="68" y="154" width="364" height="30" rx="6" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.12" stroke-dasharray="3 3"/>
    <text x="42" y="174" text-anchor="middle" fill="currentColor" font-weight="700">2</text>
    <text x="448" y="174" fill="currentColor" opacity="0.7">bước 3</text>
    <rect x="16" y="192" width="26" height="30" rx="6" fill="#f59e0b" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="42" y="192" width="390" height="30" rx="6" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.12" stroke-dasharray="3 3"/>
    <text x="29" y="212" text-anchor="middle" fill="currentColor" font-weight="700">1</text>
    <text x="448" y="212" fill="currentColor" opacity="0.7">bước 4 → còn 1</text>
  </g>
  <text x="540" y="130" font-size="12" fill="currentColor" opacity="0.85">16 → 8 → 4 → 2 → 1</text>
  <text x="540" y="150" font-size="12" fill="currentColor" opacity="0.85">log₂16 = 4 bước</text>
</svg>

```python
def binary_search(arr, target):     # arr đã sắp xếp tăng dần
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
```
```javascript
function binarySearch(arr, target) {   // arr đã sắp xếp tăng dần
  let lo = 0, hi = arr.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (arr[mid] === target) return mid;
    else if (arr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}
```
```java
static int binarySearch(int[] arr, int target) {  // arr đã sắp xếp tăng dần
    int lo = 0, hi = arr.length - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}
```
```go
func binarySearch(arr []int, target int) int {  // arr đã sắp xếp tăng dần
    lo, hi := 0, len(arr)-1
    for lo <= hi {
        mid := lo + (hi-lo)/2
        if arr[mid] == target {
            return mid
        } else if arr[mid] < target {
            lo = mid + 1
        } else {
            hi = mid - 1
        }
    }
    return -1
}
```

```cpp
int binarySearch(const std::vector<int>& arr, int target) {  // arr đã sắp xếp tăng dần
    int lo = 0, hi = (int)arr.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}
```

> Bẫy: `binary search` chỉ đúng khi dữ liệu **đã sắp xếp**. Nếu phải sắp xếp trước rồi mới tìm, chi phí là `O(n log n)` cho lần sắp xếp — chỉ đáng nếu bạn tìm nhiều lần.

### O(n) — tuyến tính

Thời gian tăng tỉ lệ thuận với `n`. Duyệt một lần qua toàn bộ dữ liệu: tìm max, tính tổng, lọc. Đây là mức "rẻ và chấp nhận được" cho hầu hết tác vụ một-lượt.

### O(n log n) — tuyến tính-logarit

Bậc của các thuật toán **sắp xếp tốt** (`merge sort`, `quick sort`, `heap sort`) và nhiều thuật toán "chia để trị". Đây thực tế là **giới hạn dưới** cho sắp xếp so sánh tổng quát. Khi thấy "sắp xếp rồi xử lý", hãy nghĩ ngay `O(n log n)`.

```python
def sort_then_dedup(arr):
    arr = sorted(arr)            # O(n log n)
    out = []
    for x in arr:                # O(n)
        if not out or out[-1] != x:
            out.append(x)
    return out                   # tổng: O(n log n)
```
```javascript
function sortThenDedup(arr) {
  arr = [...arr].sort((a, b) => a - b);   // O(n log n)
  const out = [];
  for (const x of arr) {                  // O(n)
    if (out.length === 0 || out[out.length - 1] !== x) out.push(x);
  }
  return out;                             // tổng: O(n log n)
}
```
```java
static java.util.List<Integer> sortThenDedup(int[] arr) {
    java.util.Arrays.sort(arr);                 // O(n log n)
    java.util.List<Integer> out = new java.util.ArrayList<>();
    for (int x : arr) {                         // O(n)
        if (out.isEmpty() || out.get(out.size() - 1) != x) out.add(x);
    }
    return out;                                 // tổng: O(n log n)
}
```
```go
func sortThenDedup(arr []int) []int {
    sort.Ints(arr)                  // O(n log n)
    out := []int{}
    for _, x := range arr {         // O(n)
        if len(out) == 0 || out[len(out)-1] != x {
            out = append(out, x)
        }
    }
    return out                      // tổng: O(n log n)
}
```

```cpp
std::vector<int> sortThenDedup(std::vector<int> arr) {
    std::sort(arr.begin(), arr.end());      // O(n log n)
    std::vector<int> out;
    for (int x : arr) {                     // O(n)
        if (out.empty() || out.back() != x) out.push_back(x);
    }
    return out;                             // tổng: O(n log n)
}
```

### O(n^2) — bậc hai

Vòng lặp lồng vòng lặp, mỗi cái chạy `n` lần. So sánh mọi cặp phần tử. **Bắt đầu đau** ở `n` cỡ chục nghìn. Thường là dấu hiệu cần tối ưu bằng `hash map` hoặc sắp xếp.

```python
def has_dup_naive(arr):          # O(n^2)
    for i in range(len(arr)):
        for j in range(i + 1, len(arr)):
            if arr[i] == arr[j]:
                return True
    return False
```
```javascript
function hasDupNaive(arr) {       // O(n^2)
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j]) return true;
    }
  }
  return false;
}
```
```java
static boolean hasDupNaive(int[] arr) {   // O(n^2)
    for (int i = 0; i < arr.length; i++) {
        for (int j = i + 1; j < arr.length; j++) {
            if (arr[i] == arr[j]) return true;
        }
    }
    return false;
}
```
```go
func hasDupNaive(arr []int) bool {  // O(n^2)
    for i := 0; i < len(arr); i++ {
        for j := i + 1; j < len(arr); j++ {
            if arr[i] == arr[j] {
                return true
            }
        }
    }
    return false
}
```

```cpp
bool hasDupNaive(const std::vector<int>& arr) {   // O(n^2)
    for (size_t i = 0; i < arr.size(); i++) {
        for (size_t j = i + 1; j < arr.size(); j++) {
            if (arr[i] == arr[j]) return true;
        }
    }
    return false;
}
```

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 300" role="img" aria-labelledby="dsa01a-pairs-t dsa01a-pairs-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa01a-pairs-t">has_dup_naive: n = 4, không có phần tử trùng</title>
<desc id="dsa01a-pairs-d">has_dup_naive: n = 4, không có phần tử trùng; các vị trí và mũi tên biểu diễn dữ liệu cùng hướng thao tác.</desc>
<defs>
<marker id="dsa01a-pairs-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M0 0 L10 5 L0 10z" fill="#10b981"/>
</marker>
</defs>
<text x="260" y="25" text-anchor="middle" font-size="14" fill="currentColor">has_dup_naive: n = 4, không có phần tử trùng</text>
<text x="260" y="52" text-anchor="middle" font-size="14" fill="currentColor">Ô (i, j) = một phép so sánh arr[i] với arr[j]</text>
<text x="190" y="83" text-anchor="middle" font-size="13" fill="currentColor">j=0</text>
<text x="245" y="83" text-anchor="middle" font-size="13" fill="currentColor">j=1</text>
<text x="300" y="83" text-anchor="middle" font-size="13" fill="currentColor">j=2</text>
<text x="355" y="83" text-anchor="middle" font-size="13" fill="currentColor">j=3</text>
<text x="118" y="117" text-anchor="middle" font-size="13" fill="currentColor">i=0</text>
<rect x="168" y="95" width="44" height="35" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/>
<text x="190.0" y="117.5" text-anchor="middle" font-size="14" fill="currentColor">—</text>
<rect x="223" y="95" width="44" height="35" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<rect x="278" y="95" width="44" height="35" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<rect x="333" y="95" width="44" height="35" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="118" y="162" text-anchor="middle" font-size="13" fill="currentColor">i=1</text>
<rect x="168" y="140" width="44" height="35" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/>
<text x="190.0" y="162.5" text-anchor="middle" font-size="14" fill="currentColor">—</text>
<rect x="223" y="140" width="44" height="35" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/>
<text x="245.0" y="162.5" text-anchor="middle" font-size="14" fill="currentColor">—</text>
<rect x="278" y="140" width="44" height="35" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<rect x="333" y="140" width="44" height="35" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="118" y="207" text-anchor="middle" font-size="13" fill="currentColor">i=2</text>
<rect x="168" y="185" width="44" height="35" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/>
<text x="190.0" y="207.5" text-anchor="middle" font-size="14" fill="currentColor">—</text>
<rect x="223" y="185" width="44" height="35" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/>
<text x="245.0" y="207.5" text-anchor="middle" font-size="14" fill="currentColor">—</text>
<rect x="278" y="185" width="44" height="35" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/>
<text x="300.0" y="207.5" text-anchor="middle" font-size="14" fill="currentColor">—</text>
<rect x="333" y="185" width="44" height="35" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="118" y="252" text-anchor="middle" font-size="13" fill="currentColor">i=3</text>
<rect x="168" y="230" width="44" height="35" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/>
<text x="190.0" y="252.5" text-anchor="middle" font-size="14" fill="currentColor">—</text>
<rect x="223" y="230" width="44" height="35" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/>
<text x="245.0" y="252.5" text-anchor="middle" font-size="14" fill="currentColor">—</text>
<rect x="278" y="230" width="44" height="35" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/>
<text x="300.0" y="252.5" text-anchor="middle" font-size="14" fill="currentColor">—</text>
<rect x="333" y="230" width="44" height="35" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/>
<text x="355.0" y="252.5" text-anchor="middle" font-size="14" fill="currentColor">—</text>
<g data-step="1">
<rect x="223" y="95" width="44" height="35" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
<text x="245.0" y="117.5" text-anchor="middle" font-size="14" fill="currentColor">≠</text>
<rect x="278" y="95" width="44" height="35" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
<text x="300.0" y="117.5" text-anchor="middle" font-size="14" fill="currentColor">≠</text>
<rect x="333" y="95" width="44" height="35" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
<text x="355.0" y="117.5" text-anchor="middle" font-size="14" fill="currentColor">≠</text>
</g>
<g data-step="2">
<rect x="278" y="140" width="44" height="35" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
<text x="300.0" y="162.5" text-anchor="middle" font-size="14" fill="currentColor">≠</text>
<rect x="333" y="140" width="44" height="35" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
<text x="355.0" y="162.5" text-anchor="middle" font-size="14" fill="currentColor">≠</text>
</g>
<g data-step="3">
<rect x="333" y="185" width="44" height="35" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
<text x="355.0" y="207.5" text-anchor="middle" font-size="14" fill="currentColor">≠</text>
</g>
</svg>
<step-note data-step="1">Với i = 0, j chạy qua 1, 2, 3: so sánh ba cặp khác nhau. Giả sử chưa có cặp trùng để hàm không trả về sớm.</step-note>
<step-note data-step="2">Với i = 1, chỉ xét j = 2, 3. Không xét lại cặp đảo chiều và không so phần tử với chính nó.</step-note>
<step-note data-step="3">Với i = 2 còn một cặp; i = 3 không có cặp. Tổng 3 + 2 + 1 = 6, tổng quát n(n−1)/2 nên worst case O(n²), bộ nhớ phụ O(1).</step-note>
</step-flow>

### O(2^n) — hàm mũ

Mỗi phần tử thêm vào làm **gấp đôi** công việc. Sinh mọi tập con, đệ quy vét cạn không nhớ. Chỉ khả thi với `n` rất nhỏ (≤ ~25). Thấy `O(2^n)` là tín hiệu cần `dynamic programming` hoặc memoization.

## Time vs Space

Big-O áp dụng cho cả **thời gian** (số phép tính) lẫn **bộ nhớ** (`space complexity`) — lượng bộ nhớ phụ tăng theo `n`.

Hai cái thường **đánh đổi** cho nhau. Quay lại bài "đã tồn tại chưa": dùng `set` biến `O(n)` time thành `O(1)` time, nhưng tốn thêm `O(n)` space để lưu set. Đây là *space-time tradeoff* — đổi bộ nhớ lấy tốc độ, một trong những công cụ tối ưu phổ biến nhất.

```python
def has_dup_fast(arr):       # time O(n), space O(n)
    seen = set()
    for x in arr:
        if x in seen:
            return True
        seen.add(x)
    return False
```
```javascript
function hasDupFast(arr) {    // time O(n), space O(n)
  const seen = new Set();
  for (const x of arr) {
    if (seen.has(x)) return true;
    seen.add(x);
  }
  return false;
}
```
```java
static boolean hasDupFast(int[] arr) {   // time O(n), space O(n)
    java.util.Set<Integer> seen = new java.util.HashSet<>();
    for (int x : arr) {
        if (!seen.add(x)) return true;   // add trả false nếu đã có
    }
    return false;
}
```
```go
func hasDupFast(arr []int) bool {   // time O(n), space O(n)
    seen := make(map[int]struct{})
    for _, x := range arr {
        if _, ok := seen[x]; ok {
            return true
        }
        seen[x] = struct{}{}
    }
    return false
}
```

```cpp
bool hasDupFast(const std::vector<int>& arr) {   // time O(n), space O(n)
    std::unordered_set<int> seen;
    for (int x : arr) {
        if (!seen.insert(x).second) return true; // insert trả false nếu đã có
    }
    return false;
}
```

> Ghi nhớ: Khi phỏng vấn nói độ phức tạp, **luôn nêu cả time lẫn space**. "Giải pháp này `O(n)` time, `O(n)` space" nghe chuyên nghiệp hơn nhiều so với chỉ nói một vế.

## Amortized — chi phí trung bình khấu hao

Đôi khi một thao tác *thỉnh thoảng* rất đắt nhưng *thường xuyên* rất rẻ. **Amortized analysis** tính chi phí trung bình trải đều qua nhiều lần gọi.

Ví dụ kinh điển: **dynamic array** (`list` Python, `ArrayList` Java, slice Go, array JS). Hệ số tăng và cách biểu diễn tuỳ implementation, không phải mọi loại đều nhân đôi. Xét mô hình dynamic array có sức chứa ban đầu 1: khi đầy, cấp mảng **gấp đôi** và copy phần tử cũ — lần đó tốn `O(n)`. Với `n` lần append từ mảng rỗng, tổng số copy nhỏ hơn `2n`, cộng thêm `n` lần ghi mới. Chia đều ra, mỗi `append` là **amortized O(1)**.

<auto-anim data-dur="10">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 442" role="img" aria-labelledby="dsa01-amortized-t dsa01-amortized-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa01-amortized-t">Chi phí append khi mảng nhân đôi</title>
<desc id="dsa01-amortized-d">Các cột có đỉnh tại lần 2, 3, 5, 9; đường tổng chỉ tăng tuyến tính. Vạch tím lần lượt đánh dấu từng append.</desc>
<text x="260" y="23" font-size="14" text-anchor="middle" fill="currentColor">Mô hình nhân đôi: sức chứa ban đầu = 1</text>
<text x="260" y="46" font-size="13" text-anchor="middle" fill="currentColor">1 thao tác = ghi mới hoặc copy 1 phần tử</text>
<text x="28" y="75" font-size="13" text-anchor="start" fill="currentColor">Chi phí mỗi append</text>
<path d="M48 183 L490 183" fill="none" stroke="currentColor" stroke-opacity="0.15"/>
<text x="34" y="188" font-size="13" text-anchor="middle" fill="currentColor">0</text>
<path d="M48 133 L490 133" fill="none" stroke="currentColor" stroke-opacity="0.15"/>
<text x="34" y="138" font-size="13" text-anchor="middle" fill="currentColor">5</text>
<path d="M48 93 L490 93" fill="none" stroke="currentColor" stroke-opacity="0.15"/>
<text x="34" y="98" font-size="13" text-anchor="middle" fill="currentColor">9</text>
<rect x="55" y="173" width="26" height="10" rx="2" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="68" y="201" font-size="13" text-anchor="middle" fill="currentColor">1</text>
<text x="68" y="167" font-size="13" text-anchor="middle" fill="currentColor">1</text>
<rect x="102" y="163" width="26" height="20" rx="2" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
<text x="115" y="201" font-size="13" text-anchor="middle" fill="currentColor">2</text>
<text x="115" y="157" font-size="13" text-anchor="middle" fill="currentColor">2</text>
<rect x="149" y="153" width="26" height="30" rx="2" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
<text x="162" y="201" font-size="13" text-anchor="middle" fill="currentColor">3</text>
<text x="162" y="147" font-size="13" text-anchor="middle" fill="currentColor">3</text>
<rect x="196" y="173" width="26" height="10" rx="2" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="209" y="201" font-size="13" text-anchor="middle" fill="currentColor">4</text>
<text x="209" y="167" font-size="13" text-anchor="middle" fill="currentColor">1</text>
<rect x="243" y="133" width="26" height="50" rx="2" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
<text x="256" y="201" font-size="13" text-anchor="middle" fill="currentColor">5</text>
<text x="256" y="127" font-size="13" text-anchor="middle" fill="currentColor">5</text>
<rect x="290" y="173" width="26" height="10" rx="2" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="303" y="201" font-size="13" text-anchor="middle" fill="currentColor">6</text>
<text x="303" y="167" font-size="13" text-anchor="middle" fill="currentColor">1</text>
<rect x="337" y="173" width="26" height="10" rx="2" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="350" y="201" font-size="13" text-anchor="middle" fill="currentColor">7</text>
<text x="350" y="167" font-size="13" text-anchor="middle" fill="currentColor">1</text>
<rect x="384" y="173" width="26" height="10" rx="2" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="397" y="201" font-size="13" text-anchor="middle" fill="currentColor">8</text>
<text x="397" y="167" font-size="13" text-anchor="middle" fill="currentColor">1</text>
<rect x="431" y="93" width="26" height="90" rx="2" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
<text x="444" y="201" font-size="13" text-anchor="middle" fill="currentColor">9</text>
<text x="444" y="87" font-size="13" text-anchor="middle" fill="currentColor">9</text>
<text x="260" y="224" font-size="13" text-anchor="middle" fill="currentColor">Lần append →</text>
<text x="28" y="251" font-size="13" text-anchor="start" fill="currentColor">Tổng chi phí (gồm cả ghi mới)</text>
<path d="M48 365 L490 365" fill="none" stroke="currentColor" stroke-opacity="0.15"/>
<text x="34" y="370" font-size="13" text-anchor="middle" fill="currentColor">0</text>
<path d="M48 305 L490 305" fill="none" stroke="currentColor" stroke-opacity="0.15"/>
<text x="34" y="310" font-size="13" text-anchor="middle" fill="currentColor">15</text>
<path d="M48 257 L490 257" fill="none" stroke="currentColor" stroke-opacity="0.15"/>
<text x="34" y="262" font-size="13" text-anchor="middle" fill="currentColor">27</text>
<polyline points="68,361 115,353 162,341 209,337 256,317 303,313 350,309 397,305 444,269" fill="none" stroke="#10b981" stroke-width="3"/>
<circle cx="68" cy="361" r="3" fill="#10b981"/>
<text x="68" y="352" font-size="13" text-anchor="middle" fill="currentColor">1</text>
<circle cx="115" cy="353" r="3" fill="#10b981"/>
<text x="115" y="344" font-size="13" text-anchor="middle" fill="currentColor">3</text>
<circle cx="162" cy="341" r="3" fill="#10b981"/>
<text x="162" y="332" font-size="13" text-anchor="middle" fill="currentColor">6</text>
<circle cx="209" cy="337" r="3" fill="#10b981"/>
<text x="209" y="328" font-size="13" text-anchor="middle" fill="currentColor">7</text>
<circle cx="256" cy="317" r="3" fill="#10b981"/>
<text x="256" y="308" font-size="13" text-anchor="middle" fill="currentColor">12</text>
<circle cx="303" cy="313" r="3" fill="#10b981"/>
<text x="303" y="304" font-size="13" text-anchor="middle" fill="currentColor">13</text>
<circle cx="350" cy="309" r="3" fill="#10b981"/>
<text x="350" y="300" font-size="13" text-anchor="middle" fill="currentColor">14</text>
<circle cx="397" cy="305" r="3" fill="#10b981"/>
<text x="397" y="296" font-size="13" text-anchor="middle" fill="currentColor">15</text>
<circle cx="444" cy="269" r="3" fill="#10b981"/>
<text x="444" y="260" font-size="13" text-anchor="middle" fill="currentColor">24</text>
<text x="68" y="387" font-size="13" text-anchor="middle" fill="currentColor">1</text>
<text x="115" y="387" font-size="13" text-anchor="middle" fill="currentColor">2</text>
<text x="162" y="387" font-size="13" text-anchor="middle" fill="currentColor">3</text>
<text x="209" y="387" font-size="13" text-anchor="middle" fill="currentColor">4</text>
<text x="256" y="387" font-size="13" text-anchor="middle" fill="currentColor">5</text>
<text x="303" y="387" font-size="13" text-anchor="middle" fill="currentColor">6</text>
<text x="350" y="387" font-size="13" text-anchor="middle" fill="currentColor">7</text>
<text x="397" y="387" font-size="13" text-anchor="middle" fill="currentColor">8</text>
<text x="444" y="387" font-size="13" text-anchor="middle" fill="currentColor">9</text>
<line x1="68" y1="79" x2="68" y2="395" stroke="#8b5cf6" stroke-width="2" stroke-dasharray="4 4">
<animate attributeName="x1" values="68;115;162;209;256;303;350;397;444;444" keyTimes="0;0.1;0.2;0.3;0.4;0.5;0.6;0.7;0.8;1" calcMode="discrete" dur="10s" repeatCount="indefinite"/>
<animate attributeName="x2" values="68;115;162;209;256;303;350;397;444;444" keyTimes="0;0.1;0.2;0.3;0.4;0.5;0.6;0.7;0.8;1" calcMode="discrete" dur="10s" repeatCount="indefinite"/>
</line>
<text x="260" y="420" font-size="13" text-anchor="middle" fill="currentColor">n = 9 : 15 copies + 9 ghi mới = 24</text>
</svg>
</auto-anim>

Trong mô hình minh hoạ nhân đôi (không phải hệ số tăng cam kết của mọi thư viện), các lần resize copy 1, 2, 4, 8 phần tử. Với 9 lần append: 15 copies cộng 9 lần ghi mới, tổng 24 thao tác.

```python
arr = []
for i in range(n):
    arr.append(i)   # đa số O(1); thỉnh thoảng O(n) khi resize
                    # -> amortized O(1) mỗi append
```
```javascript
const arr = [];
for (let i = 0; i < n; i++) {
  arr.push(i);   // đa số O(1); thỉnh thoảng O(n) khi resize
                 // -> amortized O(1) mỗi push
}
```
```java
java.util.List<Integer> arr = new java.util.ArrayList<>();
for (int i = 0; i < n; i++) {
    arr.add(i);   // đa số O(1); thỉnh thoảng O(n) khi resize
                  // -> amortized O(1) mỗi add
}
```
```go
arr := []int{}
for i := 0; i < n; i++ {
    arr = append(arr, i)   // đa số O(1); thỉnh thoảng O(n) khi resize
                           // -> amortized O(1) mỗi append
}
```

```cpp
std::vector<int> arr;
for (int i = 0; i < n; i++) {
    arr.push_back(i);   // đa số O(1); thỉnh thoảng O(n) khi resize
                        // -> amortized O(1) mỗi push_back
}
```

> Bẫy: "Amortized O(1)" **không** có nghĩa "mỗi lần luôn O(1)". Một lần `append` cá biệt vẫn có thể tốn `O(n)`. Trong hệ thống real-time nhạy độ trễ (latency-sensitive), cú giật `O(n)` đó có thể đáng lo — khi đó hãy `reserve`/pre-allocate dung lượng trước.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 310" role="img" aria-labelledby="dsa01a-resize-t dsa01a-resize-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa01a-resize-t">Resize: copy rồi chuyển sang mảng mới</title>
<desc id="dsa01a-resize-d">Mảng cũ chứa 0 và 1 được copy sang mảng mới bốn ô; khi ghi 2 thì mảng cũ biến mất.</desc>
<defs>
<marker id="dsa01a-resize-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M0 0 L10 5 L0 10z" fill="#10b981"/>
</marker>
</defs>
<text x="260" y="25" text-anchor="middle" font-size="14" fill="currentColor">Resize: copy rồi chuyển sang mảng mới</text>
<text x="260" y="55" text-anchor="middle" font-size="14" fill="currentColor">Append 2: capacity 2 → 4</text>
<g data-step="1" data-until="2">
<text x="90" y="88" text-anchor="middle" font-size="14" fill="currentColor">Mảng cũ</text>
<rect x="35" y="110" width="62" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="66.0" y="136.0" text-anchor="middle" font-size="14" fill="currentColor">0</text>
<rect x="105" y="110" width="62" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="136.0" y="136.0" text-anchor="middle" font-size="14" fill="currentColor">1</text>
</g>
<text x="220" y="198" text-anchor="middle" font-size="14" fill="currentColor">Mảng mới</text>
<rect x="35" y="215" width="62" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="66" y="279" text-anchor="middle" font-size="13" fill="currentColor">0</text>
<rect x="105" y="215" width="62" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="136" y="279" text-anchor="middle" font-size="13" fill="currentColor">1</text>
<rect x="175" y="215" width="62" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="206" y="279" text-anchor="middle" font-size="13" fill="currentColor">2</text>
<rect x="245" y="215" width="62" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="276" y="279" text-anchor="middle" font-size="13" fill="currentColor">3</text>
<g data-step="1">
<text x="66" y="241" text-anchor="middle" font-size="14" fill="currentColor">0</text>
</g>
<g data-step="2">
<text x="136" y="241" text-anchor="middle" font-size="14" fill="currentColor">1</text>
</g>
<g data-step="3">
<text x="206" y="241" text-anchor="middle" font-size="14" fill="currentColor">2</text>
</g>
<g data-step="1" data-until="1">
<path d="M66 155 L66 210" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa01a-resize-ar)"/>
</g>
<g data-step="2" data-until="2">
<path d="M136 155 L136 210" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa01a-resize-ar)"/>
</g>
<text x="407" y="238" text-anchor="middle" font-size="14" fill="currentColor">capacity = 4</text>
<g data-step="1" data-until="1">
<text x="407" y="266" text-anchor="middle" font-size="14" fill="currentColor">size = 1</text>
</g>
<g data-step="2" data-until="2">
<text x="407" y="266" text-anchor="middle" font-size="14" fill="currentColor">size = 2</text>
</g>
<g data-step="3">
<text x="407" y="266" text-anchor="middle" font-size="14" fill="currentColor">size = 3</text>
</g>
</svg>
<step-note data-step="1">Cấp mảng mới có bốn ô và copy phần tử 0. Mảng mới hiện chứa một phần tử, mảng cũ vẫn giữ dữ liệu nguồn.</step-note>
<step-note data-step="2">Copy tiếp phần tử 1, giữ nguyên index. Với size n, copy đủ n phần tử cũ tốn O(n).</step-note>
<step-note data-step="3">Ghi 2 vào ô tiếp theo, dùng mảng mới và bỏ mảng cũ. Kết quả [0, 1, 2] có size 3, capacity 4; lần append này gồm hai copy và một ghi mới.</step-note>
</step-flow>

## Cách ước lượng nhanh từ vòng lặp

Khi đọc code, đếm độ phức tạp gần như theo phản xạ với vài quy tắc:

- **Không vòng lặp, không đệ quy** → thường `O(1)`.
- **Một vòng lặp chạy qua `n`** → `O(n)`.
- **Vòng lặp lồng nhau, cả hai theo `n`** → nhân vào: `O(n * n) = O(n^2)`. Ba tầng → `O(n^3)`.
- **Hai vòng lặp *nối tiếp* (không lồng)** → cộng rồi lấy trội: `O(n) + O(n) = O(n)`.
- **Mỗi bước chia đôi phạm vi** (`i *= 2`, hoặc đệ quy chia hai) → `O(log n)`.
- **Vòng ngoài `n`, vòng trong chia đôi** → `O(n log n)`.
- **Đệ quy phân nhánh đôi không memo** → nghi ngờ `O(2^n)`.

```python
# Vòng trong KHÔNG phụ thuộc n -> đây là O(n), KHÔNG phải O(n^2)
def linear(arr):
    for x in arr:            # n
        for _ in range(10):  # hằng số 10, không phải n
            do_work(x)
```
```javascript
// Vòng trong KHÔNG phụ thuộc n -> đây là O(n), KHÔNG phải O(n^2)
function linear(arr) {
  for (const x of arr) {        // n
    for (let k = 0; k < 10; k++) {  // hằng số 10, không phải n
      doWork(x);
    }
  }
}
```
```java
// Vòng trong KHÔNG phụ thuộc n -> đây là O(n), KHÔNG phải O(n^2)
static void linear(int[] arr) {
    for (int x : arr) {            // n
        for (int k = 0; k < 10; k++) {  // hằng số 10, không phải n
            doWork(x);
        }
    }
}
```
```go
// Vòng trong KHÔNG phụ thuộc n -> đây là O(n), KHÔNG phải O(n^2)
func linear(arr []int) {
    for _, x := range arr {        // n
        for k := 0; k < 10; k++ {  // hằng số 10, không phải n
            doWork(x)
        }
    }
}
```

```cpp
// Vòng trong KHÔNG phụ thuộc n -> đây là O(n), KHÔNG phải O(n^2)
void linear(const std::vector<int>& arr) {
    for (int x : arr) {            // n
        for (int k = 0; k < 10; k++) {  // hằng số 10, không phải n
            doWork(x);
        }
    }
}
```

> Bẫy: Một lời gọi hàm "vô hại" trong vòng lặp có thể giấu chi phí. `if x in my_list` (Python list) là `O(n)` ẩn → đặt nó trong vòng `n` thành `O(n^2)`. Luôn hỏi: *thao tác bên trong này tốn bao nhiêu?*

## Best / Worst / Average case

Cùng một thuật toán có thể nhanh hay chậm tuỳ **dữ liệu cụ thể**:

- **Best case** (tốt nhất): input may mắn nhất. Ví dụ tìm tuyến tính trúng ngay phần tử đầu → `O(1)`.
- **Worst case** (xấu nhất): input tệ nhất. Tìm tuyến tính mà phần tử ở cuối hoặc không có → `O(n)`.
- **Average case** (trung bình): kỳ vọng trên phân phối input ngẫu nhiên.

Mặc định, khi nói "độ phức tạp của thuật toán" mà không nói rõ, người ta hiểu là **worst case** — vì đó là bảo đảm an toàn nhất cho hệ thống.

Ví dụ nổi tiếng: `quick sort` trung bình `O(n log n)` nhưng worst case `O(n^2)` (khi pivot luôn chọn tệ). `hash map` lookup trung bình `O(1)` nhưng worst case `O(n)` khi nhiều khoá đụng độ (collision) vào cùng bucket.

> Ghi nhớ: Khi phỏng vấn hỏi độ phức tạp, hãy nêu **worst case** trước, rồi bổ sung average nếu nó khác biệt đáng kể (như quick sort hay hash map). Điều đó cho thấy bạn hiểu sắc thái, không học vẹt.

## Bảng so sánh các bậc tăng trưởng

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>So sánh đường cong các bậc tăng trưởng Big-O</title>
  <desc>Biểu đồ đường cong số thao tác theo n cho O(1), O(log n), O(n), O(n log n), O(n^2) và O(2^n). Khi n tăng, O(2^n) và O(n^2) vọt lên dốc đứng trong khi O(1) và O(log n) gần như nằm ngang.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Số thao tác tăng vọt thế nào khi n lớn</text>
  <g stroke="currentColor" stroke-opacity="0.4">
    <line x1="70" y1="40" x2="70" y2="320"/>
    <line x1="70" y1="320" x2="660" y2="320"/>
  </g>
  <text x="70" y="345" font-size="11" fill="currentColor" opacity="0.7">n nhỏ</text>
  <text x="660" y="345" font-size="11" text-anchor="end" fill="currentColor" opacity="0.7">n lớn →</text>
  <text x="24" y="48" font-size="11" fill="currentColor" opacity="0.7">nhiều</text>
  <text x="24" y="316" font-size="11" fill="currentColor" opacity="0.7">ít</text>
  <text x="42" y="185" font-size="11" fill="currentColor" opacity="0.7" transform="rotate(-90 42 185)">số thao tác</text>
  <path d="M70 312 L660 308" fill="none" stroke="#10b981" stroke-width="2.5"/>
  <text x="664" y="306" font-size="11" fill="#10b981" font-weight="700">O(1)</text>
  <path d="M70 308 C 220 290, 420 280, 660 272" fill="none" stroke="#3b82f6" stroke-width="2.5"/>
  <text x="664" y="272" font-size="11" fill="#3b82f6" font-weight="700">O(log n)</text>
  <path d="M70 312 L660 168" fill="none" stroke="#8b5cf6" stroke-width="2.5"/>
  <text x="664" y="166" font-size="11" fill="#8b5cf6" font-weight="700">O(n)</text>
  <path d="M70 312 C 300 250, 480 150, 600 60" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
  <text x="556" y="52" font-size="11" fill="#f59e0b" font-weight="700">O(n log n)</text>
  <path d="M70 314 C 230 300, 360 230, 470 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-opacity="0.85"/>
  <text x="476" y="50" font-size="11" fill="currentColor" font-weight="700">O(n²)</text>
  <path d="M70 316 C 180 312, 250 300, 300 48" fill="none" stroke="#ef4444" stroke-width="2.5"/>
  <text x="306" y="50" font-size="11" fill="#ef4444" font-weight="700">O(2ⁿ)</text>
</svg>

Số thao tác xấp xỉ theo `n` (bậc tăng từ nhanh đến chậm):

| Big-O | Tên gọi | n=10 | n=1.000 | n=1.000.000 | Ví dụ điển hình |
|-------|---------|------|---------|-------------|-----------------|
| O(1) | Hằng số | 1 | 1 | 1 | Tra hash map, truy cập theo index |
| O(log n) | Logarit | ~3 | ~10 | ~20 | Binary search |
| O(n) | Tuyến tính | 10 | 1.000 | 1.000.000 | Duyệt một lượt, tìm max |
| O(n log n) | Tuyến tính-log | ~33 | ~10.000 | ~2x10^7 | Merge/quick/heap sort |
| O(n^2) | Bậc hai | 100 | 1.000.000 | 10^12 (quá lớn) | Hai vòng lồng, so mọi cặp |
| O(2^n) | Hàm mũ | 1.024 | thiên văn | bất khả thi | Sinh mọi tập con, vét cạn |
| O(n!) | Giai thừa | 3.6 triệu | bất khả thi | bất khả thi | Sinh mọi hoán vị (TSP brute) |

**Quy tắc cảm nhận quy mô** (giới hạn ~1 giây trên máy thường, ~10^8 thao tác):

| `n` cỡ | Bậc còn chấp nhận được |
|--------|------------------------|
| ≤ 25 | Cả `O(2^n)` |
| ≤ 5.000 | `O(n^2)` |
| ≤ 10^6 | `O(n log n)` |
| ≤ 10^8 | `O(n)` |
| Rất lớn / streaming | `O(log n)` hoặc `O(1)` |

## Bài toán điển hình

### Bài 1: Two Sum

*Cho mảng số và một `target`, tìm hai phần tử cộng lại bằng `target`.*

- **Cách ngây thơ:** hai vòng lồng thử mọi cặp → `O(n^2)` time, `O(1)` space.
- **Cách tối ưu:** duyệt một lượt, với mỗi `x` kiểm tra xem `target - x` đã gặp chưa bằng `hash map` → `O(n)` time, `O(n)` space. Đây chính là space-time tradeoff: tốn thêm bộ nhớ cho map để bỏ một tầng vòng lặp.

```python
def two_sum(nums, target):       # O(n) time, O(n) space
    seen = {}                    # value -> index
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:
            return (seen[need], i)
        seen[x] = i
    return None
```
```javascript
function twoSum(nums, target) {  // O(n) time, O(n) space
  const seen = new Map();        // value -> index
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return null;
}
```
```java
static int[] twoSum(int[] nums, int target) {   // O(n) time, O(n) space
    java.util.Map<Integer, Integer> seen = new java.util.HashMap<>();
    for (int i = 0; i < nums.length; i++) {
        int need = target - nums[i];
        if (seen.containsKey(need)) return new int[]{seen.get(need), i};
        seen.put(nums[i], i);
    }
    return null;
}
```
```go
func twoSum(nums []int, target int) []int {   // O(n) time, O(n) space
    seen := make(map[int]int)   // value -> index
    for i, x := range nums {
        need := target - x
        if j, ok := seen[need]; ok {
            return []int{j, i}
        }
        seen[x] = i
    }
    return nil
}
```

```cpp
std::vector<int> twoSum(const std::vector<int>& nums, int target) {  // O(n) time, O(n) space
    std::unordered_map<int, int> seen;   // value -> index
    for (int i = 0; i < (int)nums.size(); i++) {
        int need = target - nums[i];
        auto it = seen.find(need);
        if (it != seen.end()) return {it->second, i};
        seen[nums[i]] = i;
    }
    return {};
}
```

**Hướng giải tổng quát:** Khi thấy "tìm cặp/bộ thoả điều kiện trong mảng" và cách ngây thơ là `O(n^2)`, hãy thử dùng `hash map`/`set` để tra "phần bù" trong `O(1)`, hạ xuống `O(n)`.

### Bài 2: Phân tích độ phức tạp một đoạn code

*Đoạn sau có độ phức tạp bao nhiêu?*

```python
def f(matrix):           # matrix là n x n
    n = len(matrix)
    total = 0
    for i in range(n):           # n
        for j in range(n):       # n  -> n*n
            total += matrix[i][j]
    for i in range(n):           # n (nối tiếp, không lồng)
        total += i
    return total
```
```javascript
function f(matrix) {             // matrix là n x n
  const n = matrix.length;
  let total = 0;
  for (let i = 0; i < n; i++) {         // n
    for (let j = 0; j < n; j++) {       // n  -> n*n
      total += matrix[i][j];
    }
  }
  for (let i = 0; i < n; i++) {         // n (nối tiếp, không lồng)
    total += i;
  }
  return total;
}
```
```java
static long f(int[][] matrix) {         // matrix là n x n
    int n = matrix.length;
    long total = 0;
    for (int i = 0; i < n; i++) {       // n
        for (int j = 0; j < n; j++) {   // n  -> n*n
            total += matrix[i][j];
        }
    }
    for (int i = 0; i < n; i++) {       // n (nối tiếp, không lồng)
        total += i;
    }
    return total;
}
```
```go
func f(matrix [][]int) int {            // matrix là n x n
    n := len(matrix)
    total := 0
    for i := 0; i < n; i++ {            // n
        for j := 0; j < n; j++ {        // n  -> n*n
            total += matrix[i][j]
        }
    }
    for i := 0; i < n; i++ {            // n (nối tiếp, không lồng)
        total += i
    }
    return total
}
```

```cpp
long long f(const std::vector<std::vector<int>>& matrix) {  // matrix là n x n
    int n = (int)matrix.size();
    long long total = 0;
    for (int i = 0; i < n; i++) {       // n
        for (int j = 0; j < n; j++) {   // n  -> n*n
            total += matrix[i][j];
        }
    }
    for (int i = 0; i < n; i++) {       // n (nối tiếp, không lồng)
        total += i;
    }
    return total;
}
```

**Hướng giải:** Phần lồng nhau là `O(n^2)`, phần nối tiếp là `O(n)`. Cộng lại `O(n^2 + n)`, lấy số hạng trội → **`O(n^2)` time, `O(1)` space**. Lưu ý: tuy "matrix có `n^2` phần tử", ta vẫn quy về theo `n` (chiều cạnh) — luôn nói rõ `n` của bạn nghĩa là gì khi trình bày.

---

Big-O không phải để khoe lý thuyết — nó là *bộ lọc trực giác* giúp bạn nhìn một đoạn code và đoán ngay nó có "scale" được không. Hãy luyện đến mức nhìn vòng lặp là bật ra bậc, nhìn cấu trúc dữ liệu là biết chi phí thao tác. Đó là nền tảng cho mọi bài học DSA tiếp theo.
