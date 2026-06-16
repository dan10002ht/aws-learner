# Array, String, Two-pointer & Sliding Window

Array và string là hai cấu trúc nền tảng bạn gặp mỗi ngày: từ xử lý danh sách bản ghi, parse dữ liệu, tới hầu hết câu hỏi phỏng vấn vòng đầu. Hiểu rõ chi phí thao tác và ba kỹ thuật **two-pointer**, **sliding window**, **prefix sum** sẽ giúp bạn biến nhiều bài O(n²) thành O(n).

## 1. Array & String: thao tác cơ bản và chi phí

### Mô hình bộ nhớ

Array là một vùng nhớ **liên tục** (contiguous). Vì các phần tử nằm cạnh nhau và có cùng kích thước, truy cập theo index là phép tính địa chỉ đơn giản `base + i * size` → **O(1)**. Đó là siêu năng lực của array: **random access** tức thì.

Cái giá phải trả nằm ở chèn/xoá giữa mảng: muốn chèn vào đầu, bạn phải dịch toàn bộ phần tử phía sau sang phải → **O(n)**.

### Bảng chi phí

| Thao tác | Array (dynamic) | Ghi chú |
|---|---|---|
| Truy cập theo index `a[i]` | O(1) | điểm mạnh nhất |
| Cập nhật `a[i] = x` | O(1) | |
| Append cuối (`push`) | O(1) amortized | thỉnh thoảng phải resize |
| Chèn/xoá đầu hoặc giữa | O(n) | phải dịch phần tử |
| Tìm kiếm tuyến tính | O(n) | array chưa sort |
| Binary search | O(log n) | yêu cầu đã sort |
| Duyệt toàn bộ | O(n) | |

> 💡 Ghi nhớ: `push`/`pop` ở **cuối** mảng là rẻ (O(1) amortized). Mọi thao tác ở **đầu** hoặc **giữa** đều O(n) vì phải dịch dữ liệu. Khi cần thao tác đầu/cuối thường xuyên, hãy nghĩ tới deque/linked list.

### String là array bất biến

Trong đa số ngôn ngữ (Python, Java, JavaScript, Go), string là **immutable** — không sửa được tại chỗ. Mỗi lần "nối chuỗi" thực ra tạo một string mới, sao chép toàn bộ ký tự cũ.

> ⚠️ Bẫy: nối chuỗi trong vòng lặp bằng `s += ...` là **O(n²)** vì mỗi lần nối phải copy lại toàn bộ. Hãy gom các mảnh vào một list/builder rồi `join` một lần ở cuối — O(n).

```python
# SAI: O(n^2)
s = ""
for part in parts:
    s += part

# ĐÚNG: O(n)
s = "".join(parts)
```
```javascript
// SAI: O(n^2)
let s = "";
for (const part of parts) {
  s += part;
}

// ĐÚNG: O(n)
const s = parts.join("");
```
```java
// SAI: O(n^2)
String s = "";
for (String part : parts) {
    s += part;
}

// ĐÚNG: O(n)
StringBuilder sb = new StringBuilder();
for (String part : parts) sb.append(part);
String s = sb.toString();
```
```go
// SAI: O(n^2)
s := ""
for _, part := range parts {
    s += part
}

// ĐÚNG: O(n)
var sb strings.Builder
for _, part := range parts {
    sb.WriteString(part)
}
s := sb.String()
```

```cpp
// SAI: O(n^2)
std::string s = "";
for (const auto& part : parts) {
    s += part;
}

// ĐÚNG: O(n)
std::ostringstream oss;
for (const auto& part : parts) {
    oss << part;
}
std::string s = oss.str();
```

## 2. Two-pointer (kỹ thuật hai con trỏ)

### Trực quan

Thay vì dùng hai vòng lặp lồng nhau (O(n²)) để xét mọi cặp, ta đặt **hai con trỏ** chạy trên mảng và di chuyển chúng một cách thông minh dựa trên điều kiện bài toán. Phần lớn biến bài O(n²) thành **O(n)**.

Có hai biến thể chính:

- **Hai đầu (opposite ends):** một con trỏ ở đầu `left`, một ở cuối `right`, tiến vào giữa. Dùng cho mảng đã **sort**, đảo ngược, kiểm tra palindrome.
- **Cùng chiều (fast/slow):** cả hai đi từ trái sang phải với tốc độ khác nhau. Dùng cho remove tại chỗ, dedup, tách phần tử.

### Khi nào dùng

- Mảng đã sort và cần tìm cặp thoả điều kiện (tổng, hiệu).
- Đảo ngược mảng/chuỗi tại chỗ.
- Xoá/lọc phần tử in-place mà không cấp thêm bộ nhớ.
- Merge hai mảng đã sort.

### Đảo ngược mảng tại chỗ (hai đầu)

```python
def reverse(a):
    left, right = 0, len(a) - 1
    while left < right:
        a[left], a[right] = a[right], a[left]
        left += 1
        right -= 1
    return a
```
```javascript
function reverse(a) {
  let left = 0, right = a.length - 1;
  while (left < right) {
    [a[left], a[right]] = [a[right], a[left]];
    left++;
    right--;
  }
  return a;
}
```
```java
int[] reverse(int[] a) {
    int left = 0, right = a.length - 1;
    while (left < right) {
        int tmp = a[left];
        a[left] = a[right];
        a[right] = tmp;
        left++;
        right--;
    }
    return a;
}
```
```go
func reverse(a []int) []int {
    left, right := 0, len(a)-1
    for left < right {
        a[left], a[right] = a[right], a[left]
        left++
        right--
    }
    return a
}
```

```cpp
std::vector<int> reverse(std::vector<int>& a) {
    int left = 0, right = (int)a.size() - 1;
    while (left < right) {
        std::swap(a[left], a[right]);
        left++;
        right--;
    }
    return a;
}
```

### Remove in-place (cùng chiều)

Xoá mọi phần tử bằng `val`, trả về độ dài mới. `slow` đánh dấu vị trí ghi tiếp theo; `fast` quét toàn mảng.

```python
def remove_element(a, val):
    slow = 0
    for fast in range(len(a)):
        if a[fast] != val:
            a[slow] = a[fast]
            slow += 1
    return slow
```
```javascript
function removeElement(a, val) {
  let slow = 0;
  for (let fast = 0; fast < a.length; fast++) {
    if (a[fast] !== val) {
      a[slow] = a[fast];
      slow++;
    }
  }
  return slow;
}
```
```java
int removeElement(int[] a, int val) {
    int slow = 0;
    for (int fast = 0; fast < a.length; fast++) {
        if (a[fast] != val) {
            a[slow] = a[fast];
            slow++;
        }
    }
    return slow;
}
```
```go
func removeElement(a []int, val int) int {
    slow := 0
    for fast := 0; fast < len(a); fast++ {
        if a[fast] != val {
            a[slow] = a[fast]
            slow++
        }
    }
    return slow
}
```

```cpp
int removeElement(std::vector<int>& a, int val) {
    int slow = 0;
    for (int fast = 0; fast < (int)a.size(); fast++) {
        if (a[fast] != val) {
            a[slow] = a[fast];
            slow++;
        }
    }
    return slow;
}
```

### Bài toán điển hình: Two Sum II (mảng đã sort)

> Cho mảng `a` **đã sort tăng dần** và `target`, tìm hai chỉ số có tổng bằng `target`.

**Hướng giải:** đặt `left` ở đầu, `right` ở cuối. Tính `sum = a[left] + a[right]`. Vì mảng đã sort:
- `sum < target` → cần lớn hơn → `left++`.
- `sum > target` → cần nhỏ hơn → `right--`.
- `sum == target` → tìm thấy.

Mỗi bước loại bỏ một ứng viên → **O(n)** thời gian, **O(1)** bộ nhớ. (Lưu ý: nếu mảng *chưa* sort, dùng hash map sẽ tốt hơn — xem mục prefix sum/hash.)

```python
def two_sum_sorted(a, target):
    left, right = 0, len(a) - 1
    while left < right:
        s = a[left] + a[right]
        if s == target:
            return [left, right]
        elif s < target:
            left += 1
        else:
            right -= 1
    return [-1, -1]
```
```javascript
function twoSumSorted(a, target) {
  let left = 0, right = a.length - 1;
  while (left < right) {
    const s = a[left] + a[right];
    if (s === target) return [left, right];
    else if (s < target) left++;
    else right--;
  }
  return [-1, -1];
}
```
```java
int[] twoSumSorted(int[] a, int target) {
    int left = 0, right = a.length - 1;
    while (left < right) {
        int s = a[left] + a[right];
        if (s == target) return new int[]{left, right};
        else if (s < target) left++;
        else right--;
    }
    return new int[]{-1, -1};
}
```
```go
func twoSumSorted(a []int, target int) []int {
    left, right := 0, len(a)-1
    for left < right {
        s := a[left] + a[right]
        if s == target {
            return []int{left, right}
        } else if s < target {
            left++
        } else {
            right--
        }
    }
    return []int{-1, -1}
}
```

```cpp
std::vector<int> twoSumSorted(const std::vector<int>& a, int target) {
    int left = 0, right = (int)a.size() - 1;
    while (left < right) {
        int s = a[left] + a[right];
        if (s == target) return {left, right};
        else if (s < target) left++;
        else right--;
    }
    return {-1, -1};
}
```

> 💡 Ghi nhớ: hễ thấy "mảng **đã sort**" + "tìm cặp/bộ thoả tổng", phản xạ đầu tiên là two-pointer hai đầu.

## 3. Sliding Window (cửa sổ trượt)

### Trực quan

Sliding window là two-pointer áp dụng cho bài toán **dãy con liên tiếp** (contiguous subarray/substring). Ta giữ một "cửa sổ" `[left, right]`:

- **Mở rộng** cửa sổ bằng cách tăng `right` để thu nạp phần tử mới.
- Khi cửa sổ vi phạm điều kiện, **co lại** bằng cách tăng `left`.

Vì mỗi con trỏ chỉ đi một chiều và mỗi phần tử vào/ra cửa sổ tối đa một lần → tổng cộng **O(n)**, dù trông như hai vòng lồng nhau.

### Khi nào dùng

- "Dãy con / chuỗi con **liên tiếp** dài nhất / ngắn nhất / tổng lớn nhất thoả điều kiện X".
- Có hai kiểu: **cửa sổ kích thước cố định** (window size k) và **cửa sổ co giãn** (variable, theo điều kiện).

> ⚠️ Bẫy: sliding window chỉ áp dụng cho **dãy con liên tiếp**. Nếu bài cho phép chọn phần tử **không liền kề** (subsequence) hoặc cho phép số âm phá vỡ tính đơn điệu, cửa sổ trượt thường sai — cân nhắc DP hoặc prefix sum + hash.

### Bài toán điển hình: Longest Substring không lặp ký tự

> Cho chuỗi `s`, tìm độ dài chuỗi con dài nhất **không có ký tự lặp lại**.

**Hướng giải:** mở rộng `right` và đưa ký tự vào một set. Nếu ký tự mới đã có trong cửa sổ, co `left` (loại ký tự khỏi set) cho tới khi không còn trùng. Sau mỗi bước cập nhật đáp án `right - left + 1`. **O(n)** thời gian, **O(k)** bộ nhớ với k là số ký tự phân biệt.

```python
def longest_unique(s):
    seen = set()
    left = 0
    best = 0
    for right in range(len(s)):
        while s[right] in seen:
            seen.remove(s[left])
            left += 1
        seen.add(s[right])
        best = max(best, right - left + 1)
    return best
```
```javascript
function longestUnique(s) {
  const seen = new Set();
  let left = 0, best = 0;
  for (let right = 0; right < s.length; right++) {
    while (seen.has(s[right])) {
      seen.delete(s[left]);
      left++;
    }
    seen.add(s[right]);
    best = Math.max(best, right - left + 1);
  }
  return best;
}
```
```java
int longestUnique(String s) {
    Set<Character> seen = new HashSet<>();
    int left = 0, best = 0;
    for (int right = 0; right < s.length(); right++) {
        while (seen.contains(s.charAt(right))) {
            seen.remove(s.charAt(left));
            left++;
        }
        seen.add(s.charAt(right));
        best = Math.max(best, right - left + 1);
    }
    return best;
}
```
```go
func longestUnique(s string) int {
    seen := make(map[byte]bool)
    left, best := 0, 0
    for right := 0; right < len(s); right++ {
        for seen[s[right]] {
            delete(seen, s[left])
            left++
        }
        seen[s[right]] = true
        if right-left+1 > best {
            best = right - left + 1
        }
    }
    return best
}
```

```cpp
int longestUnique(const std::string& s) {
    std::unordered_set<char> seen;
    int left = 0, best = 0;
    for (int right = 0; right < (int)s.size(); right++) {
        while (seen.count(s[right])) {
            seen.erase(s[left]);
            left++;
        }
        seen.insert(s[right]);
        best = std::max(best, right - left + 1);
    }
    return best;
}
```

## 4. Prefix Sum (tổng tiền tố)

### Trực quan

Prefix sum là mảng `pre` trong đó `pre[i]` = tổng các phần tử từ đầu tới `i-1`. Khi đã có nó, **tổng của bất kỳ đoạn `[i, j]`** tính được trong **O(1)**:

```
sum(i..j) = pre[j + 1] - pre[i]
```

Ta đánh đổi một lần tiền xử lý O(n) và O(n) bộ nhớ để mỗi truy vấn đoạn về O(1), thay vì O(n) mỗi lần cộng lại.

### Khi nào dùng

- Nhiều truy vấn "tổng của đoạn con" trên mảng **không đổi**.
- Đếm số subarray có tổng bằng k (prefix sum + hash map).
- Mọi bài cần "tổng tích luỹ" hoặc chênh lệch giữa hai mốc.

```python
def build_prefix(a):
    pre = [0] * (len(a) + 1)
    for i in range(len(a)):
        pre[i + 1] = pre[i] + a[i]
    return pre

def range_sum(pre, i, j):  # tong a[i..j]
    return pre[j + 1] - pre[i]
```
```javascript
function buildPrefix(a) {
  const pre = new Array(a.length + 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    pre[i + 1] = pre[i] + a[i];
  }
  return pre;
}

function rangeSum(pre, i, j) {  // tong a[i..j]
  return pre[j + 1] - pre[i];
}
```
```java
int[] buildPrefix(int[] a) {
    int[] pre = new int[a.length + 1];
    for (int i = 0; i < a.length; i++) {
        pre[i + 1] = pre[i] + a[i];
    }
    return pre;
}

int rangeSum(int[] pre, int i, int j) {  // tong a[i..j]
    return pre[j + 1] - pre[i];
}
```
```go
func buildPrefix(a []int) []int {
    pre := make([]int, len(a)+1)
    for i := 0; i < len(a); i++ {
        pre[i+1] = pre[i] + a[i]
    }
    return pre
}

func rangeSum(pre []int, i, j int) int { // tong a[i..j]
    return pre[j+1] - pre[i]
}
```

```cpp
std::vector<int> buildPrefix(const std::vector<int>& a) {
    std::vector<int> pre(a.size() + 1, 0);
    for (int i = 0; i < (int)a.size(); i++) {
        pre[i + 1] = pre[i] + a[i];
    }
    return pre;
}

int rangeSum(const std::vector<int>& pre, int i, int j) { // tong a[i..j]
    return pre[j + 1] - pre[i];
}
```

> 💡 Ghi nhớ: dùng `pre` có **độ dài n+1** với `pre[0] = 0`. Quy ước này khử trường hợp đặc biệt khi đoạn bắt đầu từ index 0, giúp công thức `pre[j+1] - pre[i]` luôn đúng.

### Bài toán điển hình: Maximum Subarray (Kadane)

> Cho mảng có thể chứa số âm, tìm **tổng lớn nhất** của một subarray liên tiếp (không rỗng).

**Hướng giải — Kadane's algorithm:** đây là biến thể tư duy prefix sum. Duyệt qua mảng giữ `cur` = tổng lớn nhất của subarray **kết thúc tại i**. Tại mỗi phần tử ta chọn: hoặc nối tiếp subarray trước đó, hoặc bắt đầu lại từ chính nó:

```
cur = max(a[i], cur + a[i])
best = max(best, cur)
```

Một lần duyệt → **O(n)** thời gian, **O(1)** bộ nhớ.

```python
def max_subarray(a):
    cur = best = a[0]
    for i in range(1, len(a)):
        cur = max(a[i], cur + a[i])
        best = max(best, cur)
    return best
```
```javascript
function maxSubarray(a) {
  let cur = a[0], best = a[0];
  for (let i = 1; i < a.length; i++) {
    cur = Math.max(a[i], cur + a[i]);
    best = Math.max(best, cur);
  }
  return best;
}
```
```java
int maxSubarray(int[] a) {
    int cur = a[0], best = a[0];
    for (int i = 1; i < a.length; i++) {
        cur = Math.max(a[i], cur + a[i]);
        best = Math.max(best, cur);
    }
    return best;
}
```
```go
func maxSubarray(a []int) int {
    cur, best := a[0], a[0]
    for i := 1; i < len(a); i++ {
        if a[i] > cur+a[i] {
            cur = a[i]
        } else {
            cur = cur + a[i]
        }
        if cur > best {
            best = cur
        }
    }
    return best
}
```

```cpp
int maxSubarray(const std::vector<int>& a) {
    int cur = a[0], best = a[0];
    for (int i = 1; i < (int)a.size(); i++) {
        cur = std::max(a[i], cur + a[i]);
        best = std::max(best, cur);
    }
    return best;
}
```

> ⚠️ Bẫy: với Max Subarray, đừng khởi tạo `best = 0`. Nếu mọi phần tử đều âm, đáp án phải là số âm lớn nhất; khởi tạo `0` sẽ trả sai. Hãy khởi tạo bằng `a[0]`.

## 5. Tổng kết: chọn kỹ thuật nào?

| Dấu hiệu trong đề | Kỹ thuật |
|---|---|
| Mảng **đã sort** + tìm cặp/bộ theo tổng | Two-pointer hai đầu |
| Đảo ngược, palindrome, merge sorted | Two-pointer hai đầu |
| Xoá/lọc/dedup in-place | Two-pointer cùng chiều (fast/slow) |
| Dãy con **liên tiếp** dài/ngắn nhất thoả điều kiện | Sliding window |
| Nhiều truy vấn tổng đoạn / đếm subarray tổng = k | Prefix sum (+ hash) |
| Tổng subarray lớn nhất (có số âm) | Kadane |

> 💡 Ghi nhớ: khi gặp bài "subarray/substring", trước khi viết hai vòng O(n²), hãy tự hỏi: **đề có nói liên tiếp không? mảng có sort không? có truy vấn lặp lại không?** Câu trả lời thường chỉ thẳng tới one trong bốn kỹ thuật ở trên và đưa lời giải về O(n).

Cả bốn kỹ thuật đều chung một triết lý: **dùng thông tin cấu trúc (đã sort, liên tiếp, tích luỹ) để tránh xét lại công việc đã làm**. Nắm vững chúng, bạn xử lý gọn phần lớn câu hỏi array/string trong phỏng vấn lẫn công việc thực tế.
