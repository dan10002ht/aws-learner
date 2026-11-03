# Array, String, Two-pointer & Sliding Window

Array và string là hai cấu trúc nền tảng bạn gặp mỗi ngày: từ xử lý danh sách bản ghi, parse dữ liệu, tới hầu hết câu hỏi phỏng vấn vòng đầu. Hiểu rõ chi phí thao tác và ba kỹ thuật **two-pointer**, **sliding window**, **prefix sum** sẽ giúp bạn biến nhiều bài O(n²) thành O(n).

## 1. Array & String: thao tác cơ bản và chi phí

### Mô hình bộ nhớ

Array là một vùng nhớ **liên tục** (contiguous). Vì các phần tử nằm cạnh nhau và có cùng kích thước, truy cập theo index là phép tính địa chỉ đơn giản `base + i * size` → **O(1)**. Đó là siêu năng lực của array: **random access** tức thì.

Cái giá phải trả nằm ở chèn/xoá giữa mảng: muốn chèn vào đầu, bạn phải dịch toàn bộ phần tử phía sau sang phải → **O(n)**.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 285" role="img" aria-labelledby="dsa02a-insert-t dsa02a-insert-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa02a-insert-t">Chèn đầu mảng: dịch rồi ghi tại chỗ</title>
<desc id="dsa02a-insert-d">Từng ô đích được ghi đè từ phải sang trái; cuối cùng mảng là 9,2,4,1,7,3,5.</desc>
<defs>
<marker id="dsa02a-insert-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M0 0 L10 5 L0 10z" fill="#10b981"/>
</marker>
</defs>
<text x="260" y="25" text-anchor="middle" font-size="14" fill="currentColor">Chèn đầu mảng: dịch rồi ghi tại chỗ</text>
<text x="260" y="57" text-anchor="middle" font-size="14" fill="currentColor">Chèn 9 vào đầu [2, 4, 1, 7, 3, 5]</text>
<rect x="25" y="125" width="62" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="56.0" y="110" text-anchor="middle" font-size="13" fill="currentColor">0</text>
<rect x="93" y="125" width="62" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="124.0" y="110" text-anchor="middle" font-size="13" fill="currentColor">1</text>
<rect x="161" y="125" width="62" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="192.0" y="110" text-anchor="middle" font-size="13" fill="currentColor">2</text>
<rect x="229" y="125" width="62" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="260.0" y="110" text-anchor="middle" font-size="13" fill="currentColor">3</text>
<rect x="297" y="125" width="62" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="328.0" y="110" text-anchor="middle" font-size="13" fill="currentColor">4</text>
<rect x="365" y="125" width="62" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="396.0" y="110" text-anchor="middle" font-size="13" fill="currentColor">5</text>
<rect x="433" y="125" width="62" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="464.0" y="110" text-anchor="middle" font-size="13" fill="currentColor">6</text>
<g data-step="1" data-until="7">
<text x="56.0" y="152" text-anchor="middle" font-size="14" fill="currentColor">2</text>
</g>
<g data-step="8">
<text x="56.0" y="152" text-anchor="middle" font-size="14" fill="currentColor">9</text>
</g>
<g data-step="1" data-until="6">
<text x="124.0" y="152" text-anchor="middle" font-size="14" fill="currentColor">4</text>
</g>
<g data-step="7">
<text x="124.0" y="152" text-anchor="middle" font-size="14" fill="currentColor">2</text>
</g>
<g data-step="1" data-until="5">
<text x="192.0" y="152" text-anchor="middle" font-size="14" fill="currentColor">1</text>
</g>
<g data-step="6">
<text x="192.0" y="152" text-anchor="middle" font-size="14" fill="currentColor">4</text>
</g>
<g data-step="1" data-until="4">
<text x="260.0" y="152" text-anchor="middle" font-size="14" fill="currentColor">7</text>
</g>
<g data-step="5">
<text x="260.0" y="152" text-anchor="middle" font-size="14" fill="currentColor">1</text>
</g>
<g data-step="1" data-until="3">
<text x="328.0" y="152" text-anchor="middle" font-size="14" fill="currentColor">3</text>
</g>
<g data-step="4">
<text x="328.0" y="152" text-anchor="middle" font-size="14" fill="currentColor">7</text>
</g>
<g data-step="1" data-until="2">
<text x="396.0" y="152" text-anchor="middle" font-size="14" fill="currentColor">5</text>
</g>
<g data-step="3">
<text x="396.0" y="152" text-anchor="middle" font-size="14" fill="currentColor">3</text>
</g>
<g data-step="1" data-until="1">
<text x="464.0" y="152" text-anchor="middle" font-size="14" fill="currentColor">∅</text>
</g>
<g data-step="2">
<text x="464.0" y="152" text-anchor="middle" font-size="14" fill="currentColor">5</text>
</g>
<g data-step="2" data-until="2">
<path d="M396 119 Q430.0 70 464 119" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-insert-ar)"/>
<rect x="433" y="125" width="62" height="44" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
</g>
<g data-step="3" data-until="3">
<path d="M328 119 Q362.0 70 396 119" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-insert-ar)"/>
<rect x="365" y="125" width="62" height="44" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
</g>
<g data-step="4" data-until="4">
<path d="M260 119 Q294.0 70 328 119" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-insert-ar)"/>
<rect x="297" y="125" width="62" height="44" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
</g>
<g data-step="5" data-until="5">
<path d="M192 119 Q226.0 70 260 119" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-insert-ar)"/>
<rect x="229" y="125" width="62" height="44" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
</g>
<g data-step="6" data-until="6">
<path d="M124 119 Q158.0 70 192 119" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-insert-ar)"/>
<rect x="161" y="125" width="62" height="44" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
</g>
<g data-step="7" data-until="7">
<path d="M56 119 Q90.0 70 124 119" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-insert-ar)"/>
<rect x="93" y="125" width="62" height="44" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
</g>
<g data-step="8">
<rect x="25" y="125" width="62" height="44" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
</g>
<g data-step="1" data-until="7">
<text x="260" y="217" text-anchor="middle" font-size="14" fill="currentColor">size = 6</text>
</g>
<g data-step="8">
<text x="260" y="217" text-anchor="middle" font-size="14" fill="currentColor">size = 7</text>
</g>
<text x="260" y="253" text-anchor="middle" font-size="14" fill="currentColor">Dịch phải → trái; giá trị ô đích đổi tại chỗ</text>
</svg>
<step-note data-step="1">Mảng có sáu phần tử và một ô sức chứa dư (∅). Chưa cần resize; bắt đầu dịch từ cuối để không mất dữ liệu.</step-note>
<step-note data-step="2">Gán a[6] = a[5]: giá trị 5 xuất hiện ngay ở ô đích, thay giá trị cũ. Ô nguồn vẫn giữ nguyên để bước trước đó chưa bị mất dữ liệu.</step-note>
<step-note data-step="3">Gán a[5] = a[4]: giá trị 3 xuất hiện ngay ở ô đích, thay giá trị cũ. Tiếp tục đi sang trái, mỗi lần gán O(1).</step-note>
<step-note data-step="4">Gán a[4] = a[3]: giá trị 7 xuất hiện ngay ở ô đích, thay giá trị cũ. Tiếp tục đi sang trái, mỗi lần gán O(1).</step-note>
<step-note data-step="5">Gán a[3] = a[2]: giá trị 1 xuất hiện ngay ở ô đích, thay giá trị cũ. Tiếp tục đi sang trái, mỗi lần gán O(1).</step-note>
<step-note data-step="6">Gán a[2] = a[1]: giá trị 4 xuất hiện ngay ở ô đích, thay giá trị cũ. Tiếp tục đi sang trái, mỗi lần gán O(1).</step-note>
<step-note data-step="7">Gán a[1] = a[0]: giá trị 2 xuất hiện ngay ở ô đích, thay giá trị cũ. Tiếp tục đi sang trái, mỗi lần gán O(1).</step-note>
<step-note data-step="8">Ghi 9 vào a[0], tăng size thành 7. Hàng duy nhất trở thành [9, 2, 4, 1, 7, 3, 5]; tổng chi phí dịch O(n).</step-note>
</step-flow>

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

> Ghi nhớ: `push`/`pop` ở **cuối** mảng là rẻ (O(1) amortized). Mọi thao tác ở **đầu** hoặc **giữa** đều O(n) vì phải dịch dữ liệu. Khi cần thao tác đầu/cuối thường xuyên, hãy nghĩ tới deque/linked list.

### String là array bất biến

Trong đa số ngôn ngữ (Python, Java, JavaScript, Go), string là **immutable** — không sửa được tại chỗ. Mỗi lần "nối chuỗi" thực ra tạo một string mới, sao chép toàn bộ ký tự cũ.

> Bẫy: nối chuỗi trong vòng lặp bằng `s += ...` là **O(n²)** vì mỗi lần nối phải copy lại toàn bộ. Hãy gom các mảnh vào một list/builder rồi `join` một lần ở cuối — O(n).

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

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 295" role="img" aria-labelledby="dsa02a-reverse-t dsa02a-reverse-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa02a-reverse-t">reverse: đổi giá trị trong cùng một mảng</title>
<desc id="dsa02a-reverse-d">Ba cặp giá trị đổi chỗ tại index cố định; left và right tiến vào giữa rồi vượt nhau.</desc>
<defs>
<marker id="dsa02a-reverse-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M0 0 L10 5 L0 10z" fill="#10b981"/>
</marker>
</defs>
<text x="260" y="25" text-anchor="middle" font-size="14" fill="currentColor">reverse: đổi giá trị trong cùng một mảng</text>
<rect x="45" y="110" width="64" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="77.0" y="95" text-anchor="middle" font-size="13" fill="currentColor">0</text>
<rect x="115" y="110" width="64" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="147.0" y="95" text-anchor="middle" font-size="13" fill="currentColor">1</text>
<rect x="185" y="110" width="64" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="217.0" y="95" text-anchor="middle" font-size="13" fill="currentColor">2</text>
<rect x="255" y="110" width="64" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="287.0" y="95" text-anchor="middle" font-size="13" fill="currentColor">3</text>
<rect x="325" y="110" width="64" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="357.0" y="95" text-anchor="middle" font-size="13" fill="currentColor">4</text>
<rect x="395" y="110" width="64" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="427.0" y="95" text-anchor="middle" font-size="13" fill="currentColor">5</text>
<g data-step="1" data-until="1">
<text x="77.0" y="137" text-anchor="middle" font-size="14" fill="currentColor">1</text>
</g>
<g data-step="2">
<text x="77.0" y="137" text-anchor="middle" font-size="14" fill="currentColor">15</text>
</g>
<g data-step="1" data-until="2">
<text x="147.0" y="137" text-anchor="middle" font-size="14" fill="currentColor">3</text>
</g>
<g data-step="3">
<text x="147.0" y="137" text-anchor="middle" font-size="14" fill="currentColor">11</text>
</g>
<g data-step="1" data-until="3">
<text x="217.0" y="137" text-anchor="middle" font-size="14" fill="currentColor">5</text>
</g>
<g data-step="4">
<text x="217.0" y="137" text-anchor="middle" font-size="14" fill="currentColor">8</text>
</g>
<g data-step="1" data-until="3">
<text x="287.0" y="137" text-anchor="middle" font-size="14" fill="currentColor">8</text>
</g>
<g data-step="4">
<text x="287.0" y="137" text-anchor="middle" font-size="14" fill="currentColor">5</text>
</g>
<g data-step="1" data-until="2">
<text x="357.0" y="137" text-anchor="middle" font-size="14" fill="currentColor">11</text>
</g>
<g data-step="3">
<text x="357.0" y="137" text-anchor="middle" font-size="14" fill="currentColor">3</text>
</g>
<g data-step="1" data-until="1">
<text x="427.0" y="137" text-anchor="middle" font-size="14" fill="currentColor">15</text>
</g>
<g data-step="2">
<text x="427.0" y="137" text-anchor="middle" font-size="14" fill="currentColor">1</text>
</g>
<text x="260" y="60" text-anchor="middle" font-size="14" fill="currentColor">a = [1, 3, 5, 8, 11, 15]</text>
<g data-step="1" data-until="1">
<path d="M77.0 184 L77.0 167" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-reverse-ar)"/>
<text x="77.0" y="204" text-anchor="middle" font-size="13" fill="currentColor">left</text>
</g>
<g data-step="1" data-until="1">
<path d="M427.0 245 L427.0 228" fill="none" stroke="#8b5cf6" stroke-width="2" marker-end="url(#dsa02a-reverse-ar)"/>
<text x="427.0" y="265" text-anchor="middle" font-size="13" fill="currentColor">right</text>
</g>
<g data-step="2" data-until="2">
<path d="M147.0 184 L147.0 167" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-reverse-ar)"/>
<text x="147.0" y="204" text-anchor="middle" font-size="13" fill="currentColor">left</text>
</g>
<g data-step="2" data-until="2">
<path d="M357.0 245 L357.0 228" fill="none" stroke="#8b5cf6" stroke-width="2" marker-end="url(#dsa02a-reverse-ar)"/>
<text x="357.0" y="265" text-anchor="middle" font-size="13" fill="currentColor">right</text>
</g>
<g data-step="2" data-until="2">
<path d="M77 103 Q252.0 45 427 103" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-reverse-ar)"/>
<path d="M427 157 Q252.0 186 77 157" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-reverse-ar)"/>
</g>
<g data-step="3" data-until="3">
<path d="M217.0 184 L217.0 167" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-reverse-ar)"/>
<text x="217.0" y="204" text-anchor="middle" font-size="13" fill="currentColor">left</text>
</g>
<g data-step="3" data-until="3">
<path d="M287.0 245 L287.0 228" fill="none" stroke="#8b5cf6" stroke-width="2" marker-end="url(#dsa02a-reverse-ar)"/>
<text x="287.0" y="265" text-anchor="middle" font-size="13" fill="currentColor">right</text>
</g>
<g data-step="3" data-until="3">
<path d="M147 103 Q252.0 45 357 103" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-reverse-ar)"/>
<path d="M357 157 Q252.0 186 147 157" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-reverse-ar)"/>
</g>
<g data-step="4">
<path d="M287.0 184 L287.0 167" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-reverse-ar)"/>
<text x="287.0" y="204" text-anchor="middle" font-size="13" fill="currentColor">left</text>
</g>
<g data-step="4">
<path d="M217.0 245 L217.0 228" fill="none" stroke="#8b5cf6" stroke-width="2" marker-end="url(#dsa02a-reverse-ar)"/>
<text x="217.0" y="265" text-anchor="middle" font-size="13" fill="currentColor">right</text>
</g>
<g data-step="4">
<path d="M217 103 Q252.0 45 287 103" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-reverse-ar)"/>
<path d="M287 157 Q252.0 186 217 157" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-reverse-ar)"/>
</g>
</svg>
<step-note data-step="1">Ban đầu left = 0, right = 5. Chỉ đổi chỗ khi left nhỏ hơn right.</step-note>
<step-note data-step="2">Đổi a[0] với a[5], rồi đưa left tới 1 và right về 4. Hai ô đầu/cuối nay mang 15 và 1.</step-note>
<step-note data-step="3">Đổi a[1] với a[4], rồi left = 2, right = 3. Đoạn chưa xử lý còn hai ô.</step-note>
<step-note data-step="4">Đổi a[2] với a[3], rồi left = 3 vượt right = 2 nên dừng. Mảng cuối [15, 11, 8, 5, 3, 1]; O(n) time, O(1) space.</step-note>
</step-flow>

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

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 350" role="img" aria-labelledby="dsa02a-remove-t dsa02a-remove-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa02a-remove-t">Remove in-place: slow ghi đè tại chỗ</title>
<desc id="dsa02a-remove-d">Fast quét sang phải; slow ghi các giá trị giữ lại vào prefix. Ô 5 ở đuôi cuối cùng mờ vì không thuộc kết quả.</desc>
<defs>
<marker id="dsa02a-remove-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M0 0 L10 5 L0 10z" fill="#10b981"/>
</marker>
</defs>
<text x="260" y="25" text-anchor="middle" font-size="14" fill="currentColor">Remove in-place: slow ghi đè tại chỗ</text>
<text x="260" y="56" text-anchor="middle" font-size="14" fill="currentColor">remove_element(a, 5)</text>
<rect x="45" y="105" width="64" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="77.0" y="90" text-anchor="middle" font-size="13" fill="currentColor">0</text>
<rect x="115" y="105" width="64" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="147.0" y="90" text-anchor="middle" font-size="13" fill="currentColor">1</text>
<rect x="185" y="105" width="64" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="217.0" y="90" text-anchor="middle" font-size="13" fill="currentColor">2</text>
<rect x="255" y="105" width="64" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="287.0" y="90" text-anchor="middle" font-size="13" fill="currentColor">3</text>
<rect x="325" y="105" width="64" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="357.0" y="90" text-anchor="middle" font-size="13" fill="currentColor">4</text>
<rect x="395" y="105" width="64" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="427.0" y="90" text-anchor="middle" font-size="13" fill="currentColor">5</text>
<g data-step="1">
<text x="77" y="132" text-anchor="middle" font-size="14" fill="currentColor">1</text>
</g>
<g data-step="1">
<text x="147" y="132" text-anchor="middle" font-size="14" fill="currentColor">3</text>
</g>
<g data-step="1" data-until="4">
<text x="217" y="132" text-anchor="middle" font-size="14" fill="currentColor">5</text>
</g>
<g data-step="5">
<text x="217" y="132" text-anchor="middle" font-size="14" fill="currentColor">8</text>
</g>
<g data-step="1" data-until="5">
<text x="287" y="132" text-anchor="middle" font-size="14" fill="currentColor">8</text>
</g>
<g data-step="6">
<text x="287" y="132" text-anchor="middle" font-size="14" fill="currentColor">11</text>
</g>
<g data-step="1" data-until="6">
<text x="357" y="132" text-anchor="middle" font-size="14" fill="currentColor">11</text>
</g>
<g data-step="7">
<text x="357" y="132" text-anchor="middle" font-size="14" fill="currentColor">15</text>
</g>
<g data-step="1" data-until="6">
<text x="427" y="132" text-anchor="middle" font-size="14" fill="currentColor">15</text>
</g>
<g data-step="7">
<g opacity="0.28">
<text x="427" y="132" text-anchor="middle" font-size="14" fill="currentColor">15</text>
</g>
</g>
<g data-step="1" data-until="1">
<path d="M77.0 190 L77.0 173" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-remove-ar)"/>
<text x="77.0" y="210" text-anchor="middle" font-size="13" fill="currentColor">slow</text>
</g>
<g data-step="1" data-until="1">
<path d="M77.0 255 L77.0 238" fill="none" stroke="#8b5cf6" stroke-width="2" marker-end="url(#dsa02a-remove-ar)"/>
<text x="77.0" y="275" text-anchor="middle" font-size="13" fill="currentColor">fast</text>
</g>
<g data-step="2" data-until="2">
<rect x="45" y="98" width="64" height="58" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
</g>
<g data-step="2" data-until="2">
<path d="M147.0 190 L147.0 173" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-remove-ar)"/>
<text x="147.0" y="210" text-anchor="middle" font-size="13" fill="currentColor">slow</text>
</g>
<g data-step="2" data-until="2">
<path d="M147.0 255 L147.0 238" fill="none" stroke="#8b5cf6" stroke-width="2" marker-end="url(#dsa02a-remove-ar)"/>
<text x="147.0" y="275" text-anchor="middle" font-size="13" fill="currentColor">fast</text>
</g>
<g data-step="3" data-until="3">
<rect x="45" y="98" width="134" height="58" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
</g>
<g data-step="3" data-until="3">
<path d="M217.0 190 L217.0 173" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-remove-ar)"/>
<text x="217.0" y="210" text-anchor="middle" font-size="13" fill="currentColor">slow</text>
</g>
<g data-step="3" data-until="3">
<path d="M217.0 255 L217.0 238" fill="none" stroke="#8b5cf6" stroke-width="2" marker-end="url(#dsa02a-remove-ar)"/>
<text x="217.0" y="275" text-anchor="middle" font-size="13" fill="currentColor">fast</text>
</g>
<g data-step="4" data-until="4">
<rect x="45" y="98" width="134" height="58" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
</g>
<g data-step="4" data-until="4">
<path d="M217.0 190 L217.0 173" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-remove-ar)"/>
<text x="217.0" y="210" text-anchor="middle" font-size="13" fill="currentColor">slow</text>
</g>
<g data-step="4" data-until="4">
<path d="M287.0 255 L287.0 238" fill="none" stroke="#8b5cf6" stroke-width="2" marker-end="url(#dsa02a-remove-ar)"/>
<text x="287.0" y="275" text-anchor="middle" font-size="13" fill="currentColor">fast</text>
</g>
<g data-step="5" data-until="5">
<rect x="45" y="98" width="204" height="58" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
</g>
<g data-step="5" data-until="5">
<path d="M287.0 190 L287.0 173" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-remove-ar)"/>
<text x="287.0" y="210" text-anchor="middle" font-size="13" fill="currentColor">slow</text>
</g>
<g data-step="5" data-until="5">
<path d="M357.0 255 L357.0 238" fill="none" stroke="#8b5cf6" stroke-width="2" marker-end="url(#dsa02a-remove-ar)"/>
<text x="357.0" y="275" text-anchor="middle" font-size="13" fill="currentColor">fast</text>
</g>
<g data-step="5" data-until="5">
<path d="M287 101 Q252.0 65 217 101" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-remove-ar)"/>
</g>
<g data-step="6" data-until="6">
<rect x="45" y="98" width="274" height="58" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
</g>
<g data-step="6" data-until="6">
<path d="M357.0 190 L357.0 173" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-remove-ar)"/>
<text x="357.0" y="210" text-anchor="middle" font-size="13" fill="currentColor">slow</text>
</g>
<g data-step="6" data-until="6">
<path d="M427.0 255 L427.0 238" fill="none" stroke="#8b5cf6" stroke-width="2" marker-end="url(#dsa02a-remove-ar)"/>
<text x="427.0" y="275" text-anchor="middle" font-size="13" fill="currentColor">fast</text>
</g>
<g data-step="6" data-until="6">
<path d="M357 101 Q322.0 65 287 101" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-remove-ar)"/>
</g>
<g data-step="7">
<rect x="45" y="98" width="344" height="58" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
</g>
<g data-step="7">
<path d="M427.0 190 L427.0 173" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-remove-ar)"/>
<text x="427.0" y="210" text-anchor="middle" font-size="13" fill="currentColor">slow</text>
</g>
<g data-step="7">
<text x="420" y="275" text-anchor="middle" font-size="14" fill="currentColor">fast = n; dừng</text>
</g>
<g data-step="7">
<path d="M427 101 Q392.0 65 357 101" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-remove-ar)"/>
</g>
<g data-step="1" data-until="1">
<text x="260" y="325" text-anchor="middle" font-size="14" fill="currentColor">Prefix hợp lệ: 0 phần tử</text>
</g>
<g data-step="2" data-until="2">
<text x="260" y="325" text-anchor="middle" font-size="14" fill="currentColor">Prefix hợp lệ: 1 phần tử</text>
</g>
<g data-step="3" data-until="4">
<text x="260" y="325" text-anchor="middle" font-size="14" fill="currentColor">Prefix hợp lệ: 2 phần tử</text>
</g>
<g data-step="5" data-until="5">
<text x="260" y="325" text-anchor="middle" font-size="14" fill="currentColor">Prefix hợp lệ: 3 phần tử</text>
</g>
<g data-step="6" data-until="6">
<text x="260" y="325" text-anchor="middle" font-size="14" fill="currentColor">Prefix hợp lệ: 4 phần tử</text>
</g>
<g data-step="7">
<text x="260" y="325" text-anchor="middle" font-size="14" fill="currentColor">Prefix hợp lệ: 5 phần tử</text>
</g>
</svg>
<step-note data-step="1">Khởi tạo slow = fast = 0, chưa có prefix hợp lệ. slow là vị trí sẽ ghi tiếp theo.</step-note>
<step-note data-step="2">fast đọc 1: giữ ở a[0], slow tăng thành 1. fast chuyển tới index 1.</step-note>
<step-note data-step="3">fast đọc 3: giữ ở a[1], slow tăng thành 2. fast chuyển tới phần tử 5 ở index 2.</step-note>
<step-note data-step="4">fast đọc 5 bằng val nên bỏ qua, không ghi và không tăng slow. fast tới index 3.</step-note>
<step-note data-step="5">Ghi 8 từ index 3 đè lên 5 tại index 2, rồi slow = 3. Giá trị 5 cũ biến mất khỏi ô đích.</step-note>
<step-note data-step="6">Ghi 11 từ index 4 vào index 3, rồi slow = 4. Không ghi vào vùng chưa được fast đọc.</step-note>
<step-note data-step="7">Ghi 15 từ index 5 vào index 4, trả slow = 5. Chỉ [1, 3, 8, 11, 15] là kết quả; ô đuôi mờ không thuộc prefix, O(n) time và O(1) space.</step-note>
</step-flow>

### Bài toán điển hình: Two Sum II (mảng đã sort)

> Cho mảng `a` **đã sort tăng dần** và `target`, tìm hai chỉ số có tổng bằng `target`.

**Hướng giải:** đặt `left` ở đầu, `right` ở cuối. Tính `sum = a[left] + a[right]`. Vì mảng đã sort:
- `sum < target` → cần lớn hơn → `left++`.
- `sum > target` → cần nhỏ hơn → `right--`.
- `sum == target` → tìm thấy.

Mỗi bước loại bỏ một ứng viên → **O(n)** thời gian, **O(1)** bộ nhớ. (Lưu ý: nếu mảng *chưa* sort, dùng hash map sẽ tốt hơn — xem mục prefix sum/hash.)

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 250" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Two-pointer hai đầu trên mảng đã sort</title>
  <desc>Con trỏ left ở đầu và right ở cuối mảng đã sort cùng tiến vào giữa; nếu tổng a[left]+a[right] nhỏ hơn target thì left tăng, nếu lớn hơn target thì right giảm, bằng target là tìm thấy.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Two-pointer hai đầu (mảng đã sort) — tiến vào giữa</text>
  <g font-size="14" fill="currentColor">
    <rect x="40" y="48" width="58" height="48" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="106" y="48" width="58" height="48" rx="6" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="172" y="48" width="58" height="48" rx="6" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="238" y="48" width="58" height="48" rx="6" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="304" y="48" width="58" height="48" rx="6" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="370" y="48" width="58" height="48" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="69" y="78" text-anchor="middle">1</text>
    <text x="135" y="78" text-anchor="middle">3</text>
    <text x="201" y="78" text-anchor="middle">5</text>
    <text x="267" y="78" text-anchor="middle">8</text>
    <text x="333" y="78" text-anchor="middle">11</text>
    <text x="399" y="78" text-anchor="middle">15</text>
  </g>
  <text x="69" y="118" font-size="12" font-weight="700" text-anchor="middle" fill="#3b82f6">left</text>
  <text x="399" y="118" font-size="12" font-weight="700" text-anchor="middle" fill="#10b981">right</text>
  <g stroke="currentColor" stroke-opacity="0.45" stroke-width="1.6" fill="none">
    <path d="M75 130 h120" marker-end="url(#tparr)"/>
    <path d="M393 130 h-120" marker-end="url(#tparr)"/>
  </g>
  <text x="234" y="126" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">cùng tiến vào giữa</text>
  <text x="40" y="172" font-size="12.5" font-weight="700" fill="currentColor">Quyết định theo sum = a[left] + a[right] so với target:</text>
  <g font-size="12">
    <rect x="40" y="184" width="200" height="46" rx="7" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="52" y="204" fill="currentColor" font-weight="700">sum &lt; target</text>
    <text x="52" y="222" fill="currentColor">cần lớn hơn → left++</text>
    <rect x="256" y="184" width="200" height="46" rx="7" fill="#f59e0b" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="268" y="204" fill="currentColor" font-weight="700">sum &gt; target</text>
    <text x="268" y="222" fill="currentColor">cần nhỏ hơn → right--</text>
    <rect x="472" y="184" width="200" height="46" rx="7" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="484" y="204" fill="currentColor" font-weight="700">sum == target</text>
    <text x="484" y="222" fill="currentColor">tìm thấy cặp</text>
  </g>
  <defs>
    <marker id="tparr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
</svg>

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

> Ghi nhớ: hễ thấy "mảng **đã sort**" + "tìm cặp/bộ thoả tổng", phản xạ đầu tiên là two-pointer hai đầu.

## 3. Sliding Window (cửa sổ trượt)

### Trực quan

Sliding window là two-pointer áp dụng cho bài toán **dãy con liên tiếp** (contiguous subarray/substring). Ta giữ một "cửa sổ" `[left, right]`:

- **Mở rộng** cửa sổ bằng cách tăng `right` để thu nạp phần tử mới.
- Khi cửa sổ vi phạm điều kiện, **co lại** bằng cách tăng `left`.

Vì mỗi con trỏ chỉ đi một chiều và mỗi phần tử vào/ra cửa sổ tối đa một lần → tổng cộng **O(n)**, dù trông như hai vòng lồng nhau.

Hình dưới chạy hàm `longest_unique("pwwkew")` ở mục bài toán điển hình bên dưới, mỗi hàng là một vòng `right`; bấm từng bước để xem lúc nào cửa sổ giãn, lúc nào co.

<step-flow>
<svg viewBox="0 0 720 476" role="img" aria-labelledby="dsa02b-t dsa02b-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa02b-t">Sliding window chạy từng vòng right trên chuỗi pwwkew</title>
<desc id="dsa02b-d">Mỗi hàng là một vòng right của longest_unique("pwwkew"): right tăng để thu nạp ký tự mới; khi ký tự mới đã có trong cửa sổ thì left tăng, bỏ ký tự bên trái cho tới hết trùng. right đi 6 lần, left đi 3 lần, đáp án best = 3 (wke). Mỗi phần tử vào và ra cửa sổ tối đa một lần nên tổng là O(n).</desc>
<defs>
<marker id="dsa02b-am" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="#f59e0b"/></marker>
</defs>
<text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Sliding window: mở rộng (right++), trùng thì co lại (left++)</text>
<rect x="16" y="38" width="16" height="16" rx="3" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/>
<text x="38" y="51" font-size="13" fill="currentColor" opacity="0.85">cửa sổ [left, right]</text>
<rect x="208.0" y="38" width="16" height="16" rx="3" fill="#10b981" fill-opacity="0.16" stroke="#10b981"/>
<text x="230.0" y="51" font-size="13" fill="currentColor" opacity="0.85">ký tự vừa vào</text>
<rect x="348.2" y="38" width="16" height="16" rx="3" fill="#f59e0b" fill-opacity="0.16" stroke="#f59e0b"/>
<text x="370.2" y="51" font-size="13" fill="currentColor" opacity="0.85">bị đẩy ra (left++)</text>
<text x="16" y="82" font-size="13" fill="currentColor" opacity="0.7">chỉ số</text>
<text x="124" y="82" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.7">0</text>
<text x="170" y="82" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.7">1</text>
<text x="216" y="82" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.7">2</text>
<text x="262" y="82" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.7">3</text>
<text x="308" y="82" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.7">4</text>
<text x="354" y="82" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.7">5</text>
<text x="392" y="82" font-size="13" fill="currentColor" opacity="0.7">trạng thái sau vòng</text>
<g data-step="1">
<text x="16" y="114" font-size="13" font-weight="700" fill="currentColor">right=0</text>
<rect x="104" y="96" width="40" height="28" rx="5" fill="#10b981" fill-opacity="0.16" stroke="#10b981" stroke-width="2"/>
<text x="124" y="115" font-size="14" text-anchor="middle" fill="currentColor">p</text>
<rect x="150" y="96" width="40" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.25"/>
<text x="170" y="115" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.45">w</text>
<rect x="196" y="96" width="40" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.25"/>
<text x="216" y="115" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.45">w</text>
<rect x="242" y="96" width="40" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.25"/>
<text x="262" y="115" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.45">k</text>
<rect x="288" y="96" width="40" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.25"/>
<text x="308" y="115" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.45">e</text>
<rect x="334" y="96" width="40" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.25"/>
<text x="354" y="115" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.45">w</text>
<path d="M106 135 V139 H142 V135" stroke="#3b82f6" stroke-width="2" fill="none"/>
<text x="392" y="108" font-size="13" fill="currentColor">left=0 · seen={p} · best=1</text>
<text x="392" y="128" font-size="13" fill="#10b981">p chưa có: thêm vào; độ dài 1</text>
</g>
<g data-step="2">
<text x="16" y="168" font-size="13" font-weight="700" fill="currentColor">right=1</text>
<rect x="104" y="150" width="40" height="28" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-width="1"/>
<text x="124" y="169" font-size="14" text-anchor="middle" fill="currentColor">p</text>
<rect x="150" y="150" width="40" height="28" rx="5" fill="#10b981" fill-opacity="0.16" stroke="#10b981" stroke-width="2"/>
<text x="170" y="169" font-size="14" text-anchor="middle" fill="currentColor">w</text>
<rect x="196" y="150" width="40" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.25"/>
<text x="216" y="169" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.45">w</text>
<rect x="242" y="150" width="40" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.25"/>
<text x="262" y="169" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.45">k</text>
<rect x="288" y="150" width="40" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.25"/>
<text x="308" y="169" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.45">e</text>
<rect x="334" y="150" width="40" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.25"/>
<text x="354" y="169" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.45">w</text>
<path d="M106 189 V193 H188 V189" stroke="#3b82f6" stroke-width="2" fill="none"/>
<text x="392" y="162" font-size="13" fill="currentColor">left=0 · seen={p, w} · best=2</text>
<text x="392" y="182" font-size="13" fill="#10b981">w chưa có: thêm vào; độ dài 2</text>
</g>
<g data-step="3">
<text x="16" y="222" font-size="13" font-weight="700" fill="currentColor">right=2</text>
<rect x="104" y="204" width="40" height="28" rx="5" fill="#f59e0b" fill-opacity="0.16" stroke="#f59e0b" stroke-width="1.5"/>
<text x="124" y="223" font-size="14" text-anchor="middle" fill="currentColor">p</text>
<rect x="150" y="204" width="40" height="28" rx="5" fill="#f59e0b" fill-opacity="0.16" stroke="#f59e0b" stroke-width="1.5"/>
<text x="170" y="223" font-size="14" text-anchor="middle" fill="currentColor">w</text>
<rect x="196" y="204" width="40" height="28" rx="5" fill="#10b981" fill-opacity="0.16" stroke="#10b981" stroke-width="2"/>
<text x="216" y="223" font-size="14" text-anchor="middle" fill="currentColor">w</text>
<rect x="242" y="204" width="40" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.25"/>
<text x="262" y="223" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.45">k</text>
<rect x="288" y="204" width="40" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.25"/>
<text x="308" y="223" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.45">e</text>
<rect x="334" y="204" width="40" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.25"/>
<text x="354" y="223" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.45">w</text>
<path d="M124 237 H204" stroke="#f59e0b" stroke-width="2" fill="none" marker-end="url(#dsa02b-am)"/>
<path d="M198 243 V247 H234 V243" stroke="#3b82f6" stroke-width="2" fill="none"/>
<text x="392" y="216" font-size="13" fill="currentColor">left=2 · seen={w} · best=2</text>
<text x="392" y="236" font-size="13" fill="#f59e0b">w trùng: bỏ p, w, left 0→2; độ dài 1</text>
</g>
<g data-step="4">
<text x="16" y="276" font-size="13" font-weight="700" fill="currentColor">right=3</text>
<rect x="104" y="258" width="40" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.25"/>
<text x="124" y="277" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.45">p</text>
<rect x="150" y="258" width="40" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.25"/>
<text x="170" y="277" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.45">w</text>
<rect x="196" y="258" width="40" height="28" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-width="1"/>
<text x="216" y="277" font-size="14" text-anchor="middle" fill="currentColor">w</text>
<rect x="242" y="258" width="40" height="28" rx="5" fill="#10b981" fill-opacity="0.16" stroke="#10b981" stroke-width="2"/>
<text x="262" y="277" font-size="14" text-anchor="middle" fill="currentColor">k</text>
<rect x="288" y="258" width="40" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.25"/>
<text x="308" y="277" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.45">e</text>
<rect x="334" y="258" width="40" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.25"/>
<text x="354" y="277" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.45">w</text>
<path d="M198 297 V301 H280 V297" stroke="#3b82f6" stroke-width="2" fill="none"/>
<text x="392" y="270" font-size="13" fill="currentColor">left=2 · seen={w, k} · best=2</text>
<text x="392" y="290" font-size="13" fill="#10b981">k chưa có: thêm vào; độ dài 2</text>
</g>
<g data-step="5">
<text x="16" y="330" font-size="13" font-weight="700" fill="currentColor">right=4</text>
<rect x="104" y="312" width="40" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.25"/>
<text x="124" y="331" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.45">p</text>
<rect x="150" y="312" width="40" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.25"/>
<text x="170" y="331" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.45">w</text>
<rect x="196" y="312" width="40" height="28" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-width="1"/>
<text x="216" y="331" font-size="14" text-anchor="middle" fill="currentColor">w</text>
<rect x="242" y="312" width="40" height="28" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-width="1"/>
<text x="262" y="331" font-size="14" text-anchor="middle" fill="currentColor">k</text>
<rect x="288" y="312" width="40" height="28" rx="5" fill="#10b981" fill-opacity="0.16" stroke="#10b981" stroke-width="2"/>
<text x="308" y="331" font-size="14" text-anchor="middle" fill="currentColor">e</text>
<rect x="334" y="312" width="40" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.25"/>
<text x="354" y="331" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.45">w</text>
<path d="M198 351 V355 H326 V351" stroke="#3b82f6" stroke-width="2" fill="none"/>
<text x="392" y="324" font-size="13" fill="currentColor">left=2 · seen={w, k, e} · best=3</text>
<text x="392" y="344" font-size="13" fill="#10b981">e chưa có: thêm vào; độ dài 3</text>
</g>
<g data-step="6">
<text x="16" y="384" font-size="13" font-weight="700" fill="currentColor">right=5</text>
<rect x="104" y="366" width="40" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.25"/>
<text x="124" y="385" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.45">p</text>
<rect x="150" y="366" width="40" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.25"/>
<text x="170" y="385" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.45">w</text>
<rect x="196" y="366" width="40" height="28" rx="5" fill="#f59e0b" fill-opacity="0.16" stroke="#f59e0b" stroke-width="1.5"/>
<text x="216" y="385" font-size="14" text-anchor="middle" fill="currentColor">w</text>
<rect x="242" y="366" width="40" height="28" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-width="1"/>
<text x="262" y="385" font-size="14" text-anchor="middle" fill="currentColor">k</text>
<rect x="288" y="366" width="40" height="28" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-width="1"/>
<text x="308" y="385" font-size="14" text-anchor="middle" fill="currentColor">e</text>
<rect x="334" y="366" width="40" height="28" rx="5" fill="#10b981" fill-opacity="0.16" stroke="#10b981" stroke-width="2"/>
<text x="354" y="385" font-size="14" text-anchor="middle" fill="currentColor">w</text>
<path d="M216 399 H250" stroke="#f59e0b" stroke-width="2" fill="none" marker-end="url(#dsa02b-am)"/>
<path d="M244 405 V409 H372 V405" stroke="#3b82f6" stroke-width="2" fill="none"/>
<text x="392" y="378" font-size="13" fill="currentColor">left=3 · seen={k, e, w} · best=3</text>
<text x="392" y="398" font-size="13" fill="#f59e0b">w trùng: bỏ w, left 2→3; độ dài 3</text>
</g>
<g data-step="7">
<rect x="12" y="416" width="696" height="44" rx="8" fill="#8b5cf6" fill-opacity="0.13"/>
<text x="24" y="434" font-size="13" font-weight="700" fill="currentColor">Kết quả best = 3 (cửa sổ "wke", chỉ số 2..4). right đi 6 lần, left đi 3 lần: 9 ≤ 2n = 12.</text>
<text x="24" y="452" font-size="13" fill="currentColor">Mỗi phần tử vào (right++) và ra (left++) cửa sổ tối đa một lần → O(n).</text>
</g>
</svg>
<step-note data-step="1">Cửa sổ rỗng, <code>right</code> thu nạp <code>p</code>. Mọi ký tự trong cửa sổ khác nhau nên độ dài 1 là một đáp án hợp lệ.</step-note>
<step-note data-step="2"><code>w</code> chưa có trong <code>seen</code> nên chỉ việc mở rộng; không có gì phải bỏ. Tra set là O(1), nên mỗi vòng không quét lại cửa sổ.</step-note>
<step-note data-step="3">Thêm <code>w</code> sẽ có hai chữ <code>w</code>: vi phạm. Vòng <code>while</code> tăng <code>left</code> tới khi hết trùng; phải bỏ cả <code>p</code> vì cửa sổ chỉ được liên tiếp, không thể nhảy qua <code>w</code> cũ mà giữ <code>p</code>.</step-note>
<step-note data-step="4"><code>left</code> không lùi lại: các cửa sổ bắt đầu ở 0 hay 1 đã chứa hai chữ <code>w</code> khi tới chỉ số 2, nên không cần thử lại.</step-note>
<step-note data-step="5">Độ dài 3 vượt <code>best</code> cũ, cập nhật <code>best = right - left + 1 = 3</code>.</step-note>
<step-note data-step="6">Lần này chỉ bỏ một ký tự (<code>w</code> ở chỉ số 2) là hết trùng. Cửa sổ <code>kew</code> cũng dài 3, không vượt <code>best</code>.</step-note>
<step-note data-step="7">Tổng số lần dịch con trỏ bị chặn bởi <code>2n</code> dù code có hai vòng lồng nhau: vòng <code>while</code> trong không bao giờ đưa <code>left</code> vượt quá <code>right</code>.</step-note>
</step-flow>

### Khi nào dùng

- "Dãy con / chuỗi con **liên tiếp** dài nhất / ngắn nhất / tổng lớn nhất thoả điều kiện X".
- Có hai kiểu: **cửa sổ kích thước cố định** (window size k) và **cửa sổ co giãn** (variable, theo điều kiện).

> Bẫy: sliding window chỉ áp dụng cho **dãy con liên tiếp**. Nếu bài cho phép chọn phần tử **không liền kề** (subsequence) hoặc cho phép số âm phá vỡ tính đơn điệu, cửa sổ trượt thường sai — cân nhắc DP hoặc prefix sum + hash.

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Prefix sum và công thức tổng đoạn</title>
  <desc>Mảng gốc a có 6 phần tử và mảng prefix pre dài 7 với pre[0]=0, mỗi pre[k] là tổng các phần tử a[0..k-1]; tổng đoạn a[1..3] bằng pre[4] trừ pre[1].</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Prefix sum: pre dài n+1, pre[0]=0, sum(i..j) = pre[j+1] − pre[i]</text>
  <text x="16" y="58" font-size="12" font-weight="700" fill="currentColor">Mảng gốc a (n = 6) — tô đoạn cần tính: a[1..3]</text>
  <g font-size="13" fill="currentColor">
    <rect x="40" y="68" width="56" height="44" rx="6" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="98" y="68" width="56" height="44" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="156" y="68" width="56" height="44" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="214" y="68" width="56" height="44" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="272" y="68" width="56" height="44" rx="6" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="330" y="68" width="56" height="44" rx="6" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="68" y="96" text-anchor="middle">2</text>
    <text x="126" y="96" text-anchor="middle">4</text>
    <text x="184" y="96" text-anchor="middle">1</text>
    <text x="242" y="96" text-anchor="middle">7</text>
    <text x="300" y="96" text-anchor="middle">3</text>
    <text x="358" y="96" text-anchor="middle">5</text>
  </g>
  <g font-size="10.5" fill="currentColor" opacity="0.6">
    <text x="68" y="128" text-anchor="middle">0</text>
    <text x="126" y="128" text-anchor="middle">1</text>
    <text x="184" y="128" text-anchor="middle">2</text>
    <text x="242" y="128" text-anchor="middle">3</text>
    <text x="300" y="128" text-anchor="middle">4</text>
    <text x="358" y="128" text-anchor="middle">5</text>
  </g>
  <text x="16" y="168" font-size="12" font-weight="700" fill="currentColor">Mảng prefix pre (n+1 = 7) — pre[k] = tổng a[0..k-1]</text>
  <g font-size="13" fill="currentColor">
    <rect x="40" y="178" width="56" height="44" rx="6" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="98" y="178" width="56" height="44" rx="6" fill="#f59e0b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="156" y="178" width="56" height="44" rx="6" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="214" y="178" width="56" height="44" rx="6" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="272" y="178" width="56" height="44" rx="6" fill="#f59e0b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="330" y="178" width="56" height="44" rx="6" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="388" y="178" width="56" height="44" rx="6" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="68" y="206" text-anchor="middle">0</text>
    <text x="126" y="206" text-anchor="middle">2</text>
    <text x="184" y="206" text-anchor="middle">6</text>
    <text x="242" y="206" text-anchor="middle">7</text>
    <text x="300" y="206" text-anchor="middle">14</text>
    <text x="358" y="206" text-anchor="middle">17</text>
    <text x="416" y="206" text-anchor="middle">22</text>
  </g>
  <g font-size="10.5" fill="currentColor" opacity="0.6">
    <text x="68" y="238" text-anchor="middle">pre[0]</text>
    <text x="126" y="238" text-anchor="middle">pre[1]</text>
    <text x="184" y="238" text-anchor="middle">pre[2]</text>
    <text x="242" y="238" text-anchor="middle">pre[3]</text>
    <text x="300" y="238" text-anchor="middle">pre[4]</text>
    <text x="358" y="238" text-anchor="middle">pre[5]</text>
    <text x="416" y="238" text-anchor="middle">pre[6]</text>
  </g>
  <g font-size="13" fill="currentColor">
    <text x="40" y="282" font-weight="700">sum(1..3) = pre[4] − pre[1] = 14 − 2 = 12</text>
    <text x="40" y="304" opacity="0.75" font-size="12">(kiểm chứng: a[1]+a[2]+a[3] = 4 + 1 + 7 = 12)</text>
  </g>
</svg>

Ta đánh đổi một lần tiền xử lý O(n) và O(n) bộ nhớ để mỗi truy vấn đoạn về O(1), thay vì O(n) mỗi lần cộng lại.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 300" role="img" aria-labelledby="dsa02a-prefix-t dsa02a-prefix-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa02a-prefix-t">build_prefix: điền từ trái sang phải</title>
<desc id="dsa02a-prefix-d">build_prefix: điền từ trái sang phải; các vị trí và mũi tên biểu diễn dữ liệu cùng hướng thao tác.</desc>
<defs>
<marker id="dsa02a-prefix-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M0 0 L10 5 L0 10z" fill="#10b981"/>
</marker>
</defs>
<text x="260" y="25" text-anchor="middle" font-size="14" fill="currentColor">build_prefix: điền từ trái sang phải</text>
<rect x="42" y="80" width="60" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="72.0" y="106.0" text-anchor="middle" font-size="14" fill="currentColor">2</text>
<text x="72.0" y="68" text-anchor="middle" font-size="13" fill="currentColor">0</text>
<rect x="107" y="80" width="60" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="137.0" y="106.0" text-anchor="middle" font-size="14" fill="currentColor">4</text>
<text x="137.0" y="68" text-anchor="middle" font-size="13" fill="currentColor">1</text>
<rect x="172" y="80" width="60" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="202.0" y="106.0" text-anchor="middle" font-size="14" fill="currentColor">1</text>
<text x="202.0" y="68" text-anchor="middle" font-size="13" fill="currentColor">2</text>
<rect x="237" y="80" width="60" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="267.0" y="106.0" text-anchor="middle" font-size="14" fill="currentColor">7</text>
<text x="267.0" y="68" text-anchor="middle" font-size="13" fill="currentColor">3</text>
<rect x="302" y="80" width="60" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="332.0" y="106.0" text-anchor="middle" font-size="14" fill="currentColor">3</text>
<text x="332.0" y="68" text-anchor="middle" font-size="13" fill="currentColor">4</text>
<rect x="367" y="80" width="60" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="397.0" y="106.0" text-anchor="middle" font-size="14" fill="currentColor">5</text>
<text x="397.0" y="68" text-anchor="middle" font-size="13" fill="currentColor">5</text>
<text x="260" y="51" text-anchor="middle" font-size="14" fill="currentColor">a</text>
<text x="260" y="176" text-anchor="middle" font-size="14" fill="currentColor">pre: mỗi ô lấy ô trước cộng a[i]</text>
<rect x="25" y="210" width="62" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="56.0" y="236.0" text-anchor="middle" font-size="14" fill="currentColor">0</text>
<text x="56" y="278" text-anchor="middle" font-size="13" fill="currentColor">0</text>
<rect x="93" y="210" width="62" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="124" y="278" text-anchor="middle" font-size="13" fill="currentColor">1</text>
<rect x="161" y="210" width="62" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="192" y="278" text-anchor="middle" font-size="13" fill="currentColor">2</text>
<rect x="229" y="210" width="62" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="260" y="278" text-anchor="middle" font-size="13" fill="currentColor">3</text>
<rect x="297" y="210" width="62" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="328" y="278" text-anchor="middle" font-size="13" fill="currentColor">4</text>
<rect x="365" y="210" width="62" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="396" y="278" text-anchor="middle" font-size="13" fill="currentColor">5</text>
<rect x="433" y="210" width="62" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="464" y="278" text-anchor="middle" font-size="13" fill="currentColor">6</text>
<g data-step="1" data-until="1"><path d="M56 205 Q90 170 124 205" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-prefix-ar)"/></g>
<g data-step="1">
<text x="124" y="237" text-anchor="middle" font-size="14" fill="currentColor">2</text>
</g>
<g data-step="2" data-until="2"><path d="M124 205 Q158 170 192 205" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-prefix-ar)"/></g>
<g data-step="2">
<text x="192" y="237" text-anchor="middle" font-size="14" fill="currentColor">6</text>
</g>
<g data-step="3" data-until="3"><path d="M192 205 Q226 170 260 205" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-prefix-ar)"/></g>
<g data-step="3">
<text x="260" y="237" text-anchor="middle" font-size="14" fill="currentColor">7</text>
</g>
<g data-step="4" data-until="4"><path d="M260 205 Q294 170 328 205" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-prefix-ar)"/></g>
<g data-step="4">
<text x="328" y="237" text-anchor="middle" font-size="14" fill="currentColor">14</text>
</g>
<g data-step="5" data-until="5"><path d="M328 205 Q362 170 396 205" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-prefix-ar)"/></g>
<g data-step="5">
<text x="396" y="237" text-anchor="middle" font-size="14" fill="currentColor">17</text>
</g>
<g data-step="6"><path d="M396 205 Q430 170 464 205" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-prefix-ar)"/></g>
<g data-step="6">
<text x="464" y="237" text-anchor="middle" font-size="14" fill="currentColor">22</text>
</g>
</svg>
<step-note data-step="1">pre[1] = pre[0] + a[0] = 0 + 2 = 2. pre[0] = 0 là mốc ban đầu, không đọc a[-1].</step-note>
<step-note data-step="2">pre[2] = pre[1] + a[1] = 2 + 4 = 6. Mỗi ô dùng kết quả đã tính ngay bên trái, tốn O(1).</step-note>
<step-note data-step="3">pre[3] = pre[2] + a[2] = 6 + 1 = 7. Mỗi ô dùng kết quả đã tính ngay bên trái, tốn O(1).</step-note>
<step-note data-step="4">pre[4] = pre[3] + a[3] = 7 + 7 = 14. Mỗi ô dùng kết quả đã tính ngay bên trái, tốn O(1).</step-note>
<step-note data-step="5">pre[5] = pre[4] + a[4] = 14 + 3 = 17. Mỗi ô dùng kết quả đã tính ngay bên trái, tốn O(1).</step-note>
<step-note data-step="6">pre[6] = pre[5] + a[5] = 17 + 5 = 22. Mỗi ô dùng kết quả đã tính ngay bên trái, tốn O(1).</step-note>
</step-flow>

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

> Ghi nhớ: dùng `pre` có **độ dài n+1** với `pre[0] = 0`. Quy ước này khử trường hợp đặc biệt khi đoạn bắt đầu từ index 0, giúp công thức `pre[j+1] - pre[i]` luôn đúng.

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

> Bẫy: với Max Subarray, đừng khởi tạo `best = 0`. Nếu mọi phần tử đều âm, đáp án phải là số âm lớn nhất; khởi tạo `0` sẽ trả sai. Hãy khởi tạo bằng `a[0]`.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 335" role="img" aria-labelledby="dsa02a-kadane-t dsa02a-kadane-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa02a-kadane-t">Kadane: cập nhật hai biến cur và best</title>
<desc id="dsa02a-kadane-d">Hai ô cur và best thay giá trị tại chỗ; thanh tím chỉ đoạn kết thúc tại i, thanh xanh chỉ đoạn tốt nhất đã gặp.</desc>
<defs>
<marker id="dsa02a-kadane-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M0 0 L10 5 L0 10z" fill="#10b981"/>
</marker>
</defs>
<text x="260" y="25" text-anchor="middle" font-size="14" fill="currentColor">Kadane: cập nhật hai biến cur và best</text>
<text x="260" y="56" text-anchor="middle" font-size="14" fill="currentColor">a = [-2, 4, -1, 7, -3, 5]</text>
<rect x="45" y="100" width="64" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="77.0" y="85" text-anchor="middle" font-size="13" fill="currentColor">0</text>
<rect x="115" y="100" width="64" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="147.0" y="85" text-anchor="middle" font-size="13" fill="currentColor">1</text>
<rect x="185" y="100" width="64" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="217.0" y="85" text-anchor="middle" font-size="13" fill="currentColor">2</text>
<rect x="255" y="100" width="64" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="287.0" y="85" text-anchor="middle" font-size="13" fill="currentColor">3</text>
<rect x="325" y="100" width="64" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="357.0" y="85" text-anchor="middle" font-size="13" fill="currentColor">4</text>
<rect x="395" y="100" width="64" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="427.0" y="85" text-anchor="middle" font-size="13" fill="currentColor">5</text>
<text x="77" y="127" text-anchor="middle" font-size="14" fill="currentColor">-2</text>
<text x="147" y="127" text-anchor="middle" font-size="14" fill="currentColor">4</text>
<text x="217" y="127" text-anchor="middle" font-size="14" fill="currentColor">-1</text>
<text x="287" y="127" text-anchor="middle" font-size="14" fill="currentColor">7</text>
<text x="357" y="127" text-anchor="middle" font-size="14" fill="currentColor">-3</text>
<text x="427" y="127" text-anchor="middle" font-size="14" fill="currentColor">5</text>
<rect x="85" y="260" width="140" height="48" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<rect x="295" y="260" width="140" height="48" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
<text x="155" y="255" text-anchor="middle" font-size="14" fill="currentColor">cur</text>
<text x="365" y="255" text-anchor="middle" font-size="14" fill="currentColor">best</text>
<g data-step="1" data-until="1">
<text x="155" y="291" text-anchor="middle" font-size="14" fill="currentColor">-2</text>
</g>
<g data-step="2" data-until="2">
<text x="155" y="291" text-anchor="middle" font-size="14" fill="currentColor">4</text>
</g>
<g data-step="3" data-until="3">
<text x="155" y="291" text-anchor="middle" font-size="14" fill="currentColor">3</text>
</g>
<g data-step="4" data-until="4">
<text x="155" y="291" text-anchor="middle" font-size="14" fill="currentColor">10</text>
</g>
<g data-step="5" data-until="5">
<text x="155" y="291" text-anchor="middle" font-size="14" fill="currentColor">7</text>
</g>
<g data-step="6">
<text x="155" y="291" text-anchor="middle" font-size="14" fill="currentColor">12</text>
</g>
<g data-step="1" data-until="1">
<text x="365" y="291" text-anchor="middle" font-size="14" fill="currentColor">-2</text>
</g>
<g data-step="2" data-until="3">
<text x="365" y="291" text-anchor="middle" font-size="14" fill="currentColor">4</text>
</g>
<g data-step="4" data-until="5">
<text x="365" y="291" text-anchor="middle" font-size="14" fill="currentColor">10</text>
</g>
<g data-step="6">
<text x="365" y="291" text-anchor="middle" font-size="14" fill="currentColor">12</text>
</g>
<text x="260" y="175" text-anchor="middle" font-size="14" fill="currentColor">Đoạn kết thúc tại i</text>
<text x="260" y="218" text-anchor="middle" font-size="14" fill="currentColor">Đoạn tốt nhất đã gặp</text>
<g data-step="1" data-until="1">
<rect x="45" y="100" width="64" height="44" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
<path d="M77 88 L77 96" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-kadane-ar)"/>
</g>
<g data-step="1" data-until="1">
<rect x="45" y="184" width="64" height="9" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/>
<rect x="45" y="228" width="64" height="9" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
</g>
<g data-step="2" data-until="2">
<rect x="115" y="100" width="64" height="44" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
<path d="M147 88 L147 96" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-kadane-ar)"/>
</g>
<g data-step="2" data-until="2">
<rect x="115" y="184" width="64" height="9" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/>
<rect x="115" y="228" width="64" height="9" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
</g>
<g data-step="3" data-until="3">
<rect x="185" y="100" width="64" height="44" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
<path d="M217 88 L217 96" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-kadane-ar)"/>
</g>
<g data-step="3" data-until="3">
<rect x="115" y="184" width="134" height="9" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/>
<rect x="115" y="228" width="64" height="9" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
</g>
<g data-step="4" data-until="4">
<rect x="255" y="100" width="64" height="44" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
<path d="M287 88 L287 96" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-kadane-ar)"/>
</g>
<g data-step="4" data-until="4">
<rect x="115" y="184" width="204" height="9" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/>
<rect x="115" y="228" width="204" height="9" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
</g>
<g data-step="5" data-until="5">
<rect x="325" y="100" width="64" height="44" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
<path d="M357 88 L357 96" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-kadane-ar)"/>
</g>
<g data-step="5" data-until="5">
<rect x="115" y="184" width="274" height="9" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/>
<rect x="115" y="228" width="204" height="9" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
</g>
<g data-step="6">
<rect x="395" y="100" width="64" height="44" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
<path d="M427 88 L427 96" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa02a-kadane-ar)"/>
</g>
<g data-step="6">
<rect x="115" y="184" width="344" height="9" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/>
<rect x="115" y="228" width="344" height="9" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
</g>
</svg>
<step-note data-step="1">Khởi tạo cur = best = −2 từ a[0]. Đoạn không rỗng nên không khởi tạo bằng 0.</step-note>
<step-note data-step="2">Tại 4: max(4, −2 + 4) = 4, bắt đầu lại từ index 1. Cả cur và best đổi thành 4.</step-note>
<step-note data-step="3">Tại −1: nối được cur = 3 nhưng best vẫn 4. Đoạn tốt nhất đã gặp vẫn chỉ gồm phần tử 4.</step-note>
<step-note data-step="4">Tại 7: nối thành cur = 10 và cập nhật best = 10. Cả hai đoạn đang là index 1..3.</step-note>
<step-note data-step="5">Tại −3: cur giảm còn 7, best giữ 10. Thanh tím kéo dài nhưng tổng không vượt đoạn xanh cũ.</step-note>
<step-note data-step="6">Tại 5: cur = best = 12 từ đoạn index 1..5. Mỗi bước cập nhật hai biến O(1), toàn bộ O(n) time và O(1) space.</step-note>
</step-flow>

## 5. Tổng kết: chọn kỹ thuật nào?

| Dấu hiệu trong đề | Kỹ thuật |
|---|---|
| Mảng **đã sort** + tìm cặp/bộ theo tổng | Two-pointer hai đầu |
| Đảo ngược, palindrome, merge sorted | Two-pointer hai đầu |
| Xoá/lọc/dedup in-place | Two-pointer cùng chiều (fast/slow) |
| Dãy con **liên tiếp** dài/ngắn nhất thoả điều kiện | Sliding window |
| Nhiều truy vấn tổng đoạn / đếm subarray tổng = k | Prefix sum (+ hash) |
| Tổng subarray lớn nhất (có số âm) | Kadane |

> Ghi nhớ: khi gặp bài "subarray/substring", trước khi viết hai vòng O(n²), hãy tự hỏi: **đề có nói liên tiếp không? mảng có sort không? có truy vấn lặp lại không?** Câu trả lời thường chỉ thẳng tới one trong bốn kỹ thuật ở trên và đưa lời giải về O(n).

Cả bốn kỹ thuật đều chung một triết lý: **dùng thông tin cấu trúc (đã sort, liên tiếp, tích luỹ) để tránh xét lại công việc đã làm**. Nắm vững chúng, bạn xử lý gọn phần lớn câu hỏi array/string trong phỏng vấn lẫn công việc thực tế.
