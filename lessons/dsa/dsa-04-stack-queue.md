# Stack, Queue & Monotonic

`Stack` và `Queue` là hai cấu trúc dữ liệu tuyến tính cơ bản nhất nhưng cũng hữu dụng nhất trong công việc thực tế lẫn phỏng vấn. Điểm khác biệt duy nhất nằm ở **thứ tự lấy phần tử ra**. Khi nắm vững chúng, bạn sẽ mở khoá được hàng loạt kỹ thuật mạnh hơn như `DFS`, `BFS`, và đặc biệt là `monotonic stack/queue` — vũ khí giải các bài toán "next greater element" hay "sliding window maximum" trong thời gian tuyến tính.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>So sánh Stack (LIFO) và Queue (FIFO)</title>
  <desc>Hai cột: Stack vào và ra cùng một đỉnh theo nguyên tắc LIFO; Queue thêm ở cuối và lấy ra ở đầu theo nguyên tắc FIFO.</desc>
  <text x="180" y="28" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">Stack — LIFO</text>
  <text x="540" y="28" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">Queue — FIFO</text>
  <text x="180" y="46" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">vào/ra cùng một đỉnh</text>
  <text x="540" y="46" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">vào cuối, ra đầu</text>
  <defs>
    <marker id="sqarrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker>
  </defs>
  <g>
    <rect x="120" y="120" width="120" height="160" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="132" y="244" width="96" height="28" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="180" y="263" font-size="13" text-anchor="middle" fill="currentColor">10</text>
    <rect x="132" y="208" width="96" height="28" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="180" y="227" font-size="13" text-anchor="middle" fill="currentColor">20</text>
    <rect x="132" y="172" width="96" height="28" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="180" y="191" font-size="13" text-anchor="middle" fill="currentColor">30</text>
    <text x="252" y="160" font-size="11" fill="currentColor" opacity="0.7">đỉnh (top)</text>
    <path d="M180 100 v54" stroke="currentColor" fill="none" marker-end="url(#sqarrow)"/>
    <text x="98" y="92" font-size="11.5" font-weight="600" fill="currentColor">push</text>
    <path d="M132 154 q-40 -20 -40 -54" stroke="currentColor" fill="none" marker-end="url(#sqarrow)"/>
    <text x="222" y="92" font-size="11.5" font-weight="600" fill="currentColor">pop</text>
  </g>
  <g>
    <rect x="420" y="160" width="240" height="48" rx="8" fill="#10b981" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="432" y="170" width="48" height="28" rx="5" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="456" y="189" font-size="13" text-anchor="middle" fill="currentColor">10</text>
    <rect x="492" y="170" width="48" height="28" rx="5" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="516" y="189" font-size="13" text-anchor="middle" fill="currentColor">20</text>
    <rect x="552" y="170" width="48" height="28" rx="5" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="576" y="189" font-size="13" text-anchor="middle" fill="currentColor">30</text>
    <text x="456" y="232" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">đầu (front)</text>
    <text x="624" y="232" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">cuối (back)</text>
    <path d="M690 184 h-22" stroke="currentColor" fill="none" marker-end="url(#sqarrow)"/>
    <text x="640" y="150" font-size="11.5" font-weight="600" fill="currentColor">enqueue</text>
    <path d="M432 184 h-22" stroke="currentColor" fill="none" marker-end="url(#sqarrow)"/>
    <text x="394" y="150" font-size="11.5" font-weight="600" fill="currentColor">dequeue</text>
  </g>
  <text x="180" y="305" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">phần tử vào sau cùng (30) ra trước</text>
  <text x="540" y="305" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">phần tử vào trước (10) ra trước</text>
</svg>

## Stack (LIFO)

`Stack` hoạt động theo nguyên tắc **LIFO** (Last In, First Out): phần tử vào sau cùng sẽ ra trước tiên. Hãy hình dung một chồng đĩa: bạn đặt đĩa lên trên cùng và cũng lấy đĩa từ trên cùng.

Hai thao tác cốt lõi:
- `push(x)`: đẩy phần tử lên đỉnh.
- `pop()`: lấy phần tử ở đỉnh ra.
- `peek()`/`top()`: xem đỉnh mà không lấy ra.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 345" role="img" aria-labelledby="dsa04a-stack-t dsa04a-stack-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa04a-stack-t">Stack: pop lấy ô 2 ra khỏi đỉnh</title>
<desc id="dsa04a-stack-d">Ô 2 chỉ ở trong stack ở bước 2; khi pop, nó xuất hiện bên trên stack và top dời xuống ô 1.</desc>
<defs>
<marker id="dsa04a-stack-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M0 0 L10 5 L0 10z" fill="#10b981"/>
</marker>
</defs>
<text x="260" y="25" text-anchor="middle" font-size="14" fill="currentColor">Stack: pop lấy ô 2 ra khỏi đỉnh</text>
<path d="M150 130 L150 260 L270 260 L270 130" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="210" y="285" text-anchor="middle" font-size="14" fill="currentColor">đáy</text>
<g data-step="1">
<rect x="160" y="205" width="100" height="43" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="210.0" y="231.5" text-anchor="middle" font-size="14" fill="currentColor">1</text>
</g>
<g data-step="2" data-until="2">
<rect x="160" y="155" width="100" height="43" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
<text x="210.0" y="181.5" text-anchor="middle" font-size="14" fill="currentColor">2</text>
</g>
<g data-step="3">
<rect x="160" y="65" width="100" height="43" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
<text x="210.0" y="91.5" text-anchor="middle" font-size="14" fill="currentColor">2</text>
<path d="M210 150 L210 113" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa04a-stack-ar)"/>
</g>
<g data-step="1" data-until="1">
<path d="M330 226 L275 226" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa04a-stack-ar)"/>
<text x="375" y="231" text-anchor="middle" font-size="14" fill="currentColor">top</text>
</g>
<g data-step="2" data-until="2">
<path d="M330 176 L275 176" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa04a-stack-ar)"/>
<text x="375" y="181" text-anchor="middle" font-size="14" fill="currentColor">top</text>
</g>
<g data-step="3">
<path d="M330 226 L275 226" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa04a-stack-ar)"/>
<text x="375" y="231" text-anchor="middle" font-size="14" fill="currentColor">top</text>
</g>
<g data-step="1" data-until="1">
<text x="260" y="320" text-anchor="middle" font-size="14" fill="currentColor">push(1)</text>
</g>
<g data-step="2" data-until="2">
<text x="260" y="320" text-anchor="middle" font-size="14" fill="currentColor">push(2); peek() = 2</text>
</g>
<g data-step="3">
<text x="260" y="320" text-anchor="middle" font-size="14" fill="currentColor">pop() → 2 đã lấy ra</text>
</g>
</svg>
<step-note data-step="1">Push 1 vào stack rỗng; top chỉ tới 1 ở đáy.</step-note>
<step-note data-step="2">Push 2 lên trên 1; top dời tới 2. Peek đọc 2, không lấy ra.</step-note>
<step-note data-step="3">Pop lấy ô 2 ra ngoài, top trở lại 1; không còn ô 2 trong stack. Pop O(1), push trên mảng động O(1) amortized.</step-note>
</step-flow>

### Khi nào dùng Stack?

- **Kiểm tra ngoặc hợp lệ** (parser, compiler, formatter).
- **Undo/Redo** trong editor: mỗi hành động push vào stack, undo thì pop.
- **DFS** (duyệt sâu) và mô phỏng call stack đệ quy.
- **Tính biểu thức** (postfix/infix evaluation).
- **Quay lui** trạng thái: lịch sử trình duyệt (nút Back).

### Độ phức tạp

| Thao tác | Time | Space |
|---|---|---|
| `push` | O(1) | O(1) |
| `pop` | O(1) | O(1) |
| `peek` | O(1) | O(1) |
| Toàn bộ stack | — | O(n) |

> **Ghi nhớ**: Bất cứ khi nào bạn cần "nhớ lại thứ gần đây nhất" hoặc "đảo ngược thứ tự", hãy nghĩ ngay đến `Stack`.

### Code mẫu Stack

```python
stack = []
stack.append(1)      # push
stack.append(2)
top = stack[-1]      # peek -> 2
x = stack.pop()      # pop  -> 2
empty = len(stack) == 0
```
```javascript
const stack = [];
stack.push(1);          // push
stack.push(2);
const top = stack[stack.length - 1]; // peek -> 2
const x = stack.pop();  // pop  -> 2
const empty = stack.length === 0;
```
```java
Deque<Integer> stack = new ArrayDeque<>();
stack.push(1);          // push
stack.push(2);
int top = stack.peek(); // peek -> 2
int x = stack.pop();    // pop  -> 2
boolean empty = stack.isEmpty();
```
```go
stack := []int{}
stack = append(stack, 1)         // push
stack = append(stack, 2)
top := stack[len(stack)-1]       // peek -> 2
x := stack[len(stack)-1]         // pop ...
stack = stack[:len(stack)-1]     // ... cắt phần tử cuối
empty := len(stack) == 0
_ = top; _ = x; _ = empty
```

```cpp
#include <stack>
std::stack<int> stack;
stack.push(1);                   // push
stack.push(2);
int top = stack.top();           // peek -> 2
int x = stack.top();             // pop ...
stack.pop();                     // ... lấy phần tử đỉnh ra
bool empty = stack.empty();
```

> **Bẫy**: Trong Java, đừng dùng class `java.util.Stack` cũ (nó kế thừa `Vector`, có khoá đồng bộ chậm). Hãy dùng `ArrayDeque` làm stack.

### Tự tay thử: stack

Nhập số rồi bấm **Thêm (push)** hoặc **Lấy (pop)**: mọi thao tác chỉ đụng phần tử trên cùng (`top`), nên dù stack dài bao nhiêu chi phí vẫn là O(1). Thử pop đến khi rỗng để xem trường hợp stack rỗng.

<ds-playground data-type="stack" data-init="3,7,1">
</ds-playground>

### Bài toán điển hình: Ngoặc hợp lệ (Valid Parentheses)

Cho chuỗi gồm `()[]{}`, kiểm tra xem các ngoặc có đóng/mở đúng thứ tự không.

**Hướng giải**: Duyệt từng ký tự. Gặp ngoặc mở thì `push`. Gặp ngoặc đóng thì kiểm tra đỉnh stack có phải ngoặc mở tương ứng không — nếu đúng thì `pop`, sai thì trả về `false`. Cuối cùng stack phải rỗng. Độ phức tạp O(n) time, O(n) space.

```python
def is_valid(s):
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    for c in s:
        if c in pairs:
            if not stack or stack.pop() != pairs[c]:
                return False
        else:
            stack.append(c)
    return not stack
```
```javascript
function isValid(s) {
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  for (const c of s) {
    if (c in pairs) {
      if (stack.pop() !== pairs[c]) return false;
    } else {
      stack.push(c);
    }
  }
  return stack.length === 0;
}
```
```java
boolean isValid(String s) {
    Map<Character, Character> pairs = Map.of(')', '(', ']', '[', '}', '{');
    Deque<Character> stack = new ArrayDeque<>();
    for (char c : s.toCharArray()) {
        if (pairs.containsKey(c)) {
            if (stack.isEmpty() || stack.pop() != pairs.get(c)) return false;
        } else {
            stack.push(c);
        }
    }
    return stack.isEmpty();
}
```
```go
func isValid(s string) bool {
    pairs := map[rune]rune{')': '(', ']': '[', '}': '{'}
    stack := []rune{}
    for _, c := range s {
        if open, ok := pairs[c]; ok {
            if len(stack) == 0 || stack[len(stack)-1] != open {
                return false
            }
            stack = stack[:len(stack)-1]
        } else {
            stack = append(stack, c)
        }
    }
    return len(stack) == 0
}
```

```cpp
#include <string>
#include <stack>
#include <unordered_map>
bool isValid(const std::string& s) {
    std::unordered_map<char, char> pairs{{')', '('}, {']', '['}, {'}', '{'}};
    std::stack<char> stack;
    for (char c : s) {
        if (pairs.count(c)) {
            if (stack.empty() || stack.top() != pairs[c]) return false;
            stack.pop();
        } else {
            stack.push(c);
        }
    }
    return stack.empty();
}
```

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 405" role="img" aria-labelledby="dsa04a-brackets-t dsa04a-brackets-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa04a-brackets-t">Ngoặc hợp lệ: pop làm stack ngắn lại</title>
<desc id="dsa04a-brackets-d">Với chuỗi ([]), hai ngoặc mở được push, rồi dấu đóng lần lượt pop đúng đỉnh cho tới stack rỗng.</desc>
<defs>
<marker id="dsa04a-brackets-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M0 0 L10 5 L0 10z" fill="#10b981"/>
</marker>
</defs>
<text x="260" y="25" text-anchor="middle" font-size="14" fill="currentColor">Ngoặc hợp lệ: pop làm stack ngắn lại</text>
<rect x="100" y="75" width="74" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="137.0" y="60" text-anchor="middle" font-size="13" fill="currentColor">0</text>
<rect x="180" y="75" width="74" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="217.0" y="60" text-anchor="middle" font-size="13" fill="currentColor">1</text>
<rect x="260" y="75" width="74" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="297.0" y="60" text-anchor="middle" font-size="13" fill="currentColor">2</text>
<rect x="340" y="75" width="74" height="44" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="377.0" y="60" text-anchor="middle" font-size="13" fill="currentColor">3</text>
<text x="137" y="102" text-anchor="middle" font-size="14" fill="currentColor">(</text>
<text x="217" y="102" text-anchor="middle" font-size="14" fill="currentColor">[</text>
<text x="297" y="102" text-anchor="middle" font-size="14" fill="currentColor">]</text>
<text x="377" y="102" text-anchor="middle" font-size="14" fill="currentColor">)</text>
<path d="M170 195 L170 335 L290 335 L290 195" fill="none" stroke="currentColor" stroke-width="2"/>
<g data-step="1" data-until="3">
<rect x="180" y="280" width="100" height="43" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="230.0" y="306.5" text-anchor="middle" font-size="14" fill="currentColor">(</text>
</g>
<g data-step="2" data-until="2">
<rect x="180" y="230" width="100" height="43" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
<text x="230.0" y="256.5" text-anchor="middle" font-size="14" fill="currentColor">[</text>
</g>
<g data-step="3" data-until="3">
<rect x="360" y="225" width="70" height="43" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
<text x="395.0" y="251.5" text-anchor="middle" font-size="14" fill="currentColor">[</text>
<path d="M285 251 L355 251" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa04a-brackets-ar)"/>
</g>
<g data-step="4">
<rect x="360" y="280" width="70" height="43" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
<text x="395.0" y="306.5" text-anchor="middle" font-size="14" fill="currentColor">(</text>
<path d="M285 301 L355 301" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa04a-brackets-ar)"/>
<text x="230" y="290" text-anchor="middle" font-size="14" fill="currentColor">rỗng</text>
</g>
<g data-step="1" data-until="1">
<path d="M137.0 142 L137.0 125" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa04a-brackets-ar)"/>
<text x="137.0" y="162" text-anchor="middle" font-size="13" fill="currentColor">đọc (</text>
</g>
<g data-step="2" data-until="2">
<path d="M217.0 142 L217.0 125" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa04a-brackets-ar)"/>
<text x="217.0" y="162" text-anchor="middle" font-size="13" fill="currentColor">đọc [</text>
</g>
<g data-step="3" data-until="3">
<path d="M297.0 142 L297.0 125" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa04a-brackets-ar)"/>
<text x="297.0" y="162" text-anchor="middle" font-size="13" fill="currentColor">đọc ]</text>
</g>
<g data-step="4">
<path d="M377.0 142 L377.0 125" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa04a-brackets-ar)"/>
<text x="377.0" y="162" text-anchor="middle" font-size="13" fill="currentColor">đọc )</text>
</g>
<g data-step="1" data-until="1">
<text x="260" y="375" text-anchor="middle" font-size="14" fill="currentColor">push (</text>
</g>
<g data-step="2" data-until="2">
<text x="260" y="375" text-anchor="middle" font-size="14" fill="currentColor">push [</text>
</g>
<g data-step="3" data-until="3">
<text x="260" y="375" text-anchor="middle" font-size="14" fill="currentColor">] khớp [: pop [</text>
</g>
<g data-step="4">
<text x="260" y="375" text-anchor="middle" font-size="14" fill="currentColor">) khớp (: pop (; true</text>
</g>
</svg>
<step-note data-step="1">Input "([])": gặp ( thì push. Ngoặc mở gần nhất đang ở đỉnh.</step-note>
<step-note data-step="2">Gặp [ thì push lên trên (. Dấu [ phải được đóng trước dấu (.</step-note>
<step-note data-step="3">Gặp ]: đỉnh [ khớp nên pop ra ngoài; ô [ trong stack biến mất. Nếu đỉnh khác thì trả false ngay.</step-note>
<step-note data-step="4">Gặp ): pop ( ra ngoài; stack rỗng nên trả true. Mỗi ký tự push hoặc pop tối đa một lần, O(n) time và O(n) space.</step-note>
</step-flow>

## Queue (FIFO)

`Queue` hoạt động theo nguyên tắc **FIFO** (First In, First Out): phần tử vào trước sẽ ra trước, đúng như xếp hàng mua vé. Người đến trước được phục vụ trước.

Hai thao tác cốt lõi:
- `enqueue(x)`/`push`: thêm vào **cuối** hàng.
- `dequeue()`/`pop`: lấy ra từ **đầu** hàng.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 315" role="img" aria-labelledby="dsa04a-queue-t dsa04a-queue-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa04a-queue-t">Queue: dequeue lấy 1 khỏi đầu hàng</title>
<desc id="dsa04a-queue-d">Ô 1 biến mất khỏi hàng khi dequeue và xuất hiện phía ngoài bên trái; front chỉ tới ô 2, back vẫn là 2.</desc>
<defs>
<marker id="dsa04a-queue-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M0 0 L10 5 L0 10z" fill="#10b981"/>
</marker>
</defs>
<text x="260" y="25" text-anchor="middle" font-size="14" fill="currentColor">Queue: dequeue lấy 1 khỏi đầu hàng</text>
<text x="260" y="57" text-anchor="middle" font-size="14" fill="currentColor">enqueue ở cuối; dequeue ở đầu</text>
<g data-step="1" data-until="2">
<rect x="160" y="145" width="85" height="48" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="202.5" y="174.0" text-anchor="middle" font-size="14" fill="currentColor">1</text>
</g>
<g data-step="2">
<rect x="310" y="145" width="85" height="48" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="352.5" y="174.0" text-anchor="middle" font-size="14" fill="currentColor">2</text>
</g>
<g data-step="3">
<rect x="25" y="145" width="75" height="48" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
<text x="62.5" y="174.0" text-anchor="middle" font-size="14" fill="currentColor">1</text>
<path d="M155 169 L105 169" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa04a-queue-ar)"/>
</g>
<g data-step="1" data-until="1">
<text x="202" y="125" text-anchor="middle" font-size="13" fill="currentColor">front</text>
<path d="M202 130 L202 141" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa04a-queue-ar)"/>
<text x="202" y="229" text-anchor="middle" font-size="13" fill="currentColor">back</text>
<path d="M202 211 L202 197" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa04a-queue-ar)"/>
</g>
<g data-step="2" data-until="2">
<text x="202" y="125" text-anchor="middle" font-size="13" fill="currentColor">front</text>
<path d="M202 130 L202 141" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa04a-queue-ar)"/>
<text x="352" y="229" text-anchor="middle" font-size="13" fill="currentColor">back</text>
<path d="M352 211 L352 197" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa04a-queue-ar)"/>
</g>
<g data-step="3">
<text x="352" y="125" text-anchor="middle" font-size="13" fill="currentColor">front</text>
<path d="M352 130 L352 141" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa04a-queue-ar)"/>
<text x="352" y="229" text-anchor="middle" font-size="13" fill="currentColor">back</text>
<path d="M352 211 L352 197" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa04a-queue-ar)"/>
</g>
<g data-step="1" data-until="1">
<text x="260" y="285" text-anchor="middle" font-size="14" fill="currentColor">enqueue(1)</text>
</g>
<g data-step="2" data-until="2">
<text x="260" y="285" text-anchor="middle" font-size="14" fill="currentColor">enqueue(2)</text>
</g>
<g data-step="3">
<text x="260" y="285" text-anchor="middle" font-size="14" fill="currentColor">dequeue() → 1 đã ra ngoài</text>
</g>
</svg>
<step-note data-step="1">Enqueue 1: front và back cùng chỉ tới 1.</step-note>
<step-note data-step="2">Enqueue 2 ở cuối, giữ 1 ở đầu. Thứ tự chờ là 1 rồi 2.</step-note>
<step-note data-step="3">Dequeue đưa 1 ra ngoài, front chuyển sang 2. Với deque hoặc head index chỉ đổi đầu hàng, không dịch cả mảng; thao tác lấy đầu O(1).</step-note>
</step-flow>

### Khi nào dùng Queue?

- **BFS** (duyệt rộng): tìm đường đi ngắn nhất theo số bước trên đồ thị/lưới.
- **Hàng đợi tác vụ**: job queue, message queue, in ấn theo thứ tự.
- **Rate limiting / buffering**: xử lý sự kiện đến theo thứ tự.
- **Producer–consumer**: luồng sản xuất đẩy vào, luồng tiêu thụ lấy ra.

### Độ phức tạp

| Thao tác | Time | Space |
|---|---|---|
| `enqueue` | O(1) | O(1) |
| `dequeue` | O(1) amortized | O(1) |
| Toàn bộ queue | — | O(n) |

> **Bẫy**: Trong Python đừng dùng `list.pop(0)` làm dequeue — nó O(n) vì phải dịch chuyển toàn bộ phần tử. Hãy dùng `collections.deque`. Trong JavaScript, `array.shift()` cũng O(n); với dữ liệu lớn nên dùng con trỏ đầu hoặc cấu trúc deque.

### Code mẫu Queue

```python
from collections import deque
q = deque()
q.append(1)        # enqueue
q.append(2)
front = q[0]       # peek -> 1
x = q.popleft()    # dequeue -> 1
empty = len(q) == 0
```
```javascript
const q = [];
let head = 0;
q.push(1);                 // enqueue
q.push(2);
const front = q[head];     // peek -> 1
const x = q[head++];       // dequeue -> 1 (dịch con trỏ, tránh shift O(n))
const empty = head >= q.length;
```
```java
Deque<Integer> q = new ArrayDeque<>();
q.offer(1);            // enqueue
q.offer(2);
int front = q.peek(); // peek -> 1
int x = q.poll();     // dequeue -> 1
boolean empty = q.isEmpty();
```
```go
q := []int{}
q = append(q, 1)      // enqueue
q = append(q, 2)
front := q[0]         // peek -> 1
x := q[0]             // dequeue ...
q = q[1:]             // ... dịch đầu hàng
empty := len(q) == 0
_ = front; _ = x; _ = empty
```

```cpp
#include <queue>
std::queue<int> q;
q.push(1);            // enqueue
q.push(2);
int front = q.front(); // peek -> 1
int x = q.front();    // dequeue ...
q.pop();              // ... lấy phần tử đầu ra
bool empty = q.empty();
```

### Tự tay thử: queue

Phần tử vào ở `rear` và ra ở `front`: bấm **Thêm (enqueue)** vài lần rồi **Lấy (dequeue)** để thấy phần tử vào trước luôn ra trước (FIFO), phần còn lại dồn lên.

<ds-playground data-type="queue" data-init="3,7,1">
</ds-playground>

### Bài toán điển hình: BFS trên lưới (số bước ngắn nhất)

Cho lưới 0/1 hình chữ nhật, không rỗng, tìm số bước ít nhất đi từ ô `(0,0)` đến `(n-1,m-1)` (0 là đi được).

**Hướng giải**: Đặt ô xuất phát vào queue với khoảng cách 0, đánh dấu đã thăm. Lặp: lấy ô đầu hàng, mở rộng 4 hướng; ô hợp lệ & chưa thăm thì enqueue với `dist+1`. Vì BFS mở rộng theo từng lớp, lần đầu chạm đích chính là đường ngắn nhất. O(n·m) time.

```python
from collections import deque
def shortest_path(grid):
    n, m = len(grid), len(grid[0])
    if grid[0][0] != 0 or grid[n - 1][m - 1] != 0:
        return -1
    q = deque([(0, 0, 0)])          # (row, col, dist)
    seen = {(0, 0)}
    while q:
        r, c, d = q.popleft()
        if r == n - 1 and c == m - 1:
            return d
        for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < n and 0 <= nc < m and grid[nr][nc] == 0 \
                    and (nr, nc) not in seen:
                seen.add((nr, nc))
                q.append((nr, nc, d + 1))
    return -1
```
```javascript
function shortestPath(grid) {
  const n = grid.length, m = grid[0].length;
  if (grid[0][0] !== 0 || grid[n - 1][m - 1] !== 0) return -1;
  const q = [[0, 0, 0]];                 // [row, col, dist]
  const seen = new Set(["0,0"]);
  let head = 0;
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  while (head < q.length) {
    const [r, c, d] = q[head++];
    if (r === n - 1 && c === m - 1) return d;
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < n && nc >= 0 && nc < m &&
          grid[nr][nc] === 0 && !seen.has(nr + "," + nc)) {
        seen.add(nr + "," + nc);
        q.push([nr, nc, d + 1]);
      }
    }
  }
  return -1;
}
```
```java
int shortestPath(int[][] grid) {
    int n = grid.length, m = grid[0].length;
    if (grid[0][0] != 0 || grid[n - 1][m - 1] != 0) return -1;
    Deque<int[]> q = new ArrayDeque<>();
    q.offer(new int[]{0, 0, 0});            // row, col, dist
    boolean[][] seen = new boolean[n][m];
    seen[0][0] = true;
    int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};
    while (!q.isEmpty()) {
        int[] cur = q.poll();
        int r = cur[0], c = cur[1], d = cur[2];
        if (r == n - 1 && c == m - 1) return d;
        for (int[] dd : dirs) {
            int nr = r + dd[0], nc = c + dd[1];
            if (nr >= 0 && nr < n && nc >= 0 && nc < m &&
                grid[nr][nc] == 0 && !seen[nr][nc]) {
                seen[nr][nc] = true;
                q.offer(new int[]{nr, nc, d + 1});
            }
        }
    }
    return -1;
}
```
```go
func shortestPath(grid [][]int) int {
    n, m := len(grid), len(grid[0])
    if grid[0][0] != 0 || grid[n-1][m-1] != 0 {
        return -1
    }
    type node struct{ r, c, d int }
    q := []node{{0, 0, 0}}
    seen := make([][]bool, n)
    for i := range seen {
        seen[i] = make([]bool, m)
    }
    seen[0][0] = true
    dirs := [4][2]int{{1, 0}, {-1, 0}, {0, 1}, {0, -1}}
    for len(q) > 0 {
        cur := q[0]
        q = q[1:]
        if cur.r == n-1 && cur.c == m-1 {
            return cur.d
        }
        for _, dd := range dirs {
            nr, nc := cur.r+dd[0], cur.c+dd[1]
            if nr >= 0 && nr < n && nc >= 0 && nc < m &&
                grid[nr][nc] == 0 && !seen[nr][nc] {
                seen[nr][nc] = true
                q = append(q, node{nr, nc, cur.d + 1})
            }
        }
    }
    return -1
}
```

```cpp
#include <vector>
#include <queue>
#include <array>
int shortestPath(const std::vector<std::vector<int>>& grid) {
    int n = grid.size(), m = grid[0].size();
    if (grid[0][0] != 0 || grid[n - 1][m - 1] != 0) return -1;
    std::queue<std::array<int, 3>> q;      // {row, col, dist}
    q.push({0, 0, 0});
    std::vector<std::vector<bool>> seen(n, std::vector<bool>(m, false));
    seen[0][0] = true;
    std::array<std::array<int, 2>, 4> dirs{{{1, 0}, {-1, 0}, {0, 1}, {0, -1}}};
    while (!q.empty()) {
        auto [r, c, d] = q.front();
        q.pop();
        if (r == n - 1 && c == m - 1) return d;
        for (auto& dd : dirs) {
            int nr = r + dd[0], nc = c + dd[1];
            if (nr >= 0 && nr < n && nc >= 0 && nc < m &&
                grid[nr][nc] == 0 && !seen[nr][nc]) {
                seen[nr][nc] = true;
                q.push({nr, nc, d + 1});
            }
        }
    }
    return -1;
}
```

> **Ghi nhớ**: `Stack` → `DFS`, `Queue` → `BFS`. BFS luôn cho đường ngắn nhất khi mỗi cạnh có trọng số bằng nhau (đếm theo số bước).

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 455" role="img" aria-labelledby="dsa04a-grid-t dsa04a-grid-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa04a-grid-t">BFS: frontier và queue đổi cùng nhau</title>
<desc id="dsa04a-grid-d">Mỗi bước dequeue một ô, enqueue các ô mới và thay nội dung queue tại chỗ; khoảng cách đã phát hiện được giữ lại, đích trả 4.</desc>
<defs>
<marker id="dsa04a-grid-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M0 0 L10 5 L0 10z" fill="#10b981"/>
</marker>
</defs>
<text x="260" y="25" text-anchor="middle" font-size="14" fill="currentColor">BFS: frontier và queue đổi cùng nhau</text>
<text x="260" y="55" text-anchor="middle" font-size="14" fill="currentColor">grid = [[0,0,0], [0,1,0], [0,0,0]]</text>
<text x="260" y="79" text-anchor="middle" font-size="14" fill="currentColor">Chữ số trong ô đi được = khoảng cách</text>
<rect x="110" y="110" width="70" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<g data-step="1">
<rect x="110" y="110" width="70" height="42" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
<text x="145" y="136" text-anchor="middle" font-size="14" fill="currentColor">0</text>
</g>
<rect x="195" y="110" width="70" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<g data-step="2">
<rect x="195" y="110" width="70" height="42" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
<text x="230" y="136" text-anchor="middle" font-size="14" fill="currentColor">1</text>
</g>
<rect x="280" y="110" width="70" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<g data-step="4">
<rect x="280" y="110" width="70" height="42" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
<text x="315" y="136" text-anchor="middle" font-size="14" fill="currentColor">2</text>
</g>
<rect x="110" y="165" width="70" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<g data-step="2">
<rect x="110" y="165" width="70" height="42" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
<text x="145" y="191" text-anchor="middle" font-size="14" fill="currentColor">1</text>
</g>
<rect x="195" y="165" width="70" height="42" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/>
<text x="230" y="191" text-anchor="middle" font-size="13" fill="currentColor">chặn</text>
<rect x="280" y="165" width="70" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<g data-step="6">
<rect x="280" y="165" width="70" height="42" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
<text x="315" y="191" text-anchor="middle" font-size="14" fill="currentColor">3</text>
</g>
<rect x="110" y="220" width="70" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<g data-step="3">
<rect x="110" y="220" width="70" height="42" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
<text x="145" y="246" text-anchor="middle" font-size="14" fill="currentColor">2</text>
</g>
<rect x="195" y="220" width="70" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<g data-step="5">
<rect x="195" y="220" width="70" height="42" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
<text x="230" y="246" text-anchor="middle" font-size="14" fill="currentColor">3</text>
</g>
<rect x="280" y="220" width="70" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<g data-step="7">
<rect x="280" y="220" width="70" height="42" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
<text x="315" y="246" text-anchor="middle" font-size="14" fill="currentColor">4</text>
</g>
<g data-step="2" data-until="2">
<rect x="110" y="110" width="70" height="42" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
</g>
<g data-step="3" data-until="3">
<rect x="110" y="165" width="70" height="42" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
</g>
<g data-step="4" data-until="4">
<rect x="195" y="110" width="70" height="42" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
</g>
<g data-step="5" data-until="5">
<rect x="110" y="220" width="70" height="42" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
</g>
<g data-step="6" data-until="6">
<rect x="280" y="110" width="70" height="42" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
</g>
<g data-step="7" data-until="7">
<rect x="195" y="220" width="70" height="42" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
</g>
<g data-step="8" data-until="8">
<rect x="280" y="165" width="70" height="42" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
</g>
<g data-step="9">
<rect x="280" y="220" width="70" height="42" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
</g>
<text x="260" y="297" text-anchor="middle" font-size="14" fill="currentColor">queue: front → back</text>
<rect x="95" y="315" width="140" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<rect x="270" y="315" width="140" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<g data-step="1" data-until="1">
<text x="165" y="342" text-anchor="middle" font-size="14" fill="currentColor">(0,0): 0</text>
<text x="340" y="342" text-anchor="middle" font-size="14" fill="currentColor">∅</text>
</g>
<g data-step="2" data-until="2">
<text x="165" y="342" text-anchor="middle" font-size="14" fill="currentColor">(1,0): 1</text>
<text x="340" y="342" text-anchor="middle" font-size="14" fill="currentColor">(0,1): 1</text>
</g>
<g data-step="3" data-until="3">
<text x="165" y="342" text-anchor="middle" font-size="14" fill="currentColor">(0,1): 1</text>
<text x="340" y="342" text-anchor="middle" font-size="14" fill="currentColor">(2,0): 2</text>
</g>
<g data-step="4" data-until="4">
<text x="165" y="342" text-anchor="middle" font-size="14" fill="currentColor">(2,0): 2</text>
<text x="340" y="342" text-anchor="middle" font-size="14" fill="currentColor">(0,2): 2</text>
</g>
<g data-step="5" data-until="5">
<text x="165" y="342" text-anchor="middle" font-size="14" fill="currentColor">(0,2): 2</text>
<text x="340" y="342" text-anchor="middle" font-size="14" fill="currentColor">(2,1): 3</text>
</g>
<g data-step="6" data-until="6">
<text x="165" y="342" text-anchor="middle" font-size="14" fill="currentColor">(2,1): 3</text>
<text x="340" y="342" text-anchor="middle" font-size="14" fill="currentColor">(1,2): 3</text>
</g>
<g data-step="7" data-until="7">
<text x="165" y="342" text-anchor="middle" font-size="14" fill="currentColor">(1,2): 3</text>
<text x="340" y="342" text-anchor="middle" font-size="14" fill="currentColor">(2,2): 4</text>
</g>
<g data-step="8" data-until="8">
<text x="165" y="342" text-anchor="middle" font-size="14" fill="currentColor">(2,2): 4</text>
<text x="340" y="342" text-anchor="middle" font-size="14" fill="currentColor">∅</text>
</g>
<g data-step="9">
<text x="165" y="342" text-anchor="middle" font-size="14" fill="currentColor">∅</text>
<text x="340" y="342" text-anchor="middle" font-size="14" fill="currentColor">∅</text>
</g>
<g data-step="1" data-until="1">
<text x="260" y="390" text-anchor="middle" font-size="14" fill="currentColor">Khởi tạo; d = 0</text>
</g>
<g data-step="2" data-until="2">
<text x="260" y="390" text-anchor="middle" font-size="14" fill="currentColor">pop (0,0), d = 0</text>
</g>
<g data-step="3" data-until="3">
<text x="260" y="390" text-anchor="middle" font-size="14" fill="currentColor">pop (1,0), d = 1</text>
</g>
<g data-step="4" data-until="4">
<text x="260" y="390" text-anchor="middle" font-size="14" fill="currentColor">pop (0,1), d = 1</text>
</g>
<g data-step="5" data-until="5">
<text x="260" y="390" text-anchor="middle" font-size="14" fill="currentColor">pop (2,0), d = 2</text>
</g>
<g data-step="6" data-until="6">
<text x="260" y="390" text-anchor="middle" font-size="14" fill="currentColor">pop (0,2), d = 2</text>
</g>
<g data-step="7" data-until="7">
<text x="260" y="390" text-anchor="middle" font-size="14" fill="currentColor">pop (2,1), d = 3</text>
</g>
<g data-step="8" data-until="8">
<text x="260" y="390" text-anchor="middle" font-size="14" fill="currentColor">pop (1,2), d = 3</text>
</g>
<g data-step="9">
<text x="260" y="390" text-anchor="middle" font-size="14" fill="currentColor">pop (2,2), d = 4</text>
</g>
<g data-step="9">
<text x="260" y="425" text-anchor="middle" font-size="14" fill="currentColor">Đích được dequeue: trả 4</text>
</g>
</svg>
<step-note data-step="1">Queue khởi tạo [(0,0):0], đánh dấu seen ngay khi enqueue. Ô giữa là vật cản.</step-note>
<step-note data-step="2">Pop (0,0), rồi enqueue (1,0) và (0,1) với d = 1 theo thứ tự hướng trong code.</step-note>
<step-note data-step="3">Pop (1,0), enqueue (2,0) với d = 2. (0,1) vẫn ở đầu, tới lượt trước ô mới.</step-note>
<step-note data-step="4">Pop (0,1), enqueue (0,2) với d = 2. Queue đang giữ hai ô cùng khoảng cách 2.</step-note>
<step-note data-step="5">Pop (2,0), enqueue (2,1) với d = 3. Ô cũ không còn nằm trong queue.</step-note>
<step-note data-step="6">Pop (0,2), enqueue (1,2) với d = 3. Khoảng cách trên lưới giữ lại để thấy vùng đã phát hiện.</step-note>
<step-note data-step="7">Pop (2,1), enqueue đích (2,2) với d = 4 và đánh dấu seen.</step-note>
<step-note data-step="8">Pop (1,2): đích đã seen nên không enqueue trùng. Queue chỉ còn đích.</step-note>
<step-note data-step="9">Pop đích (2,2), queue trở về rỗng và trả 4. Mỗi ô enqueue tối đa một lần, toàn bộ O(n·m).</step-note>
</step-flow>

## Deque (Double-Ended Queue)

`Deque` là hàng đợi hai đầu: bạn có thể thêm/xoá ở **cả đầu lẫn cuối** trong O(1). Nó là cấu trúc tổng quát — vừa làm được Stack, vừa làm được Queue, và là nền tảng cho `monotonic queue`.

| Thao tác | Time |
|---|---|
| `push_front` / `push_back` | O(1) |
| `pop_front` / `pop_back` | O(1) |
| Truy cập ngẫu nhiên | O(n) (không phải thế mạnh) |

```python
from collections import deque
dq = deque()
dq.append(1)       # thêm cuối
dq.appendleft(0)   # thêm đầu
dq.pop()           # xoá cuối
dq.popleft()       # xoá đầu
```
```javascript
// JS không có deque sẵn; dùng array với 2 con trỏ hoặc thư viện.
const dq = [];
dq.push(1);        // thêm cuối
dq.unshift(0);     // thêm đầu (O(n), chỉ dùng khi dữ liệu nhỏ)
dq.pop();          // xoá cuối
dq.shift();        // xoá đầu
```
```java
Deque<Integer> dq = new ArrayDeque<>();
dq.addLast(1);     // thêm cuối
dq.addFirst(0);    // thêm đầu
dq.pollLast();     // xoá cuối
dq.pollFirst();    // xoá đầu
```
```go
dq := []int{}
dq = append(dq, 1)              // thêm cuối
dq = append([]int{0}, dq...)    // thêm đầu (O(n) khi copy)
dq = dq[:len(dq)-1]             // xoá cuối
dq = dq[1:]                     // xoá đầu
```

```cpp
#include <deque>
std::deque<int> dq;
dq.push_back(1);    // thêm cuối
dq.push_front(0);   // thêm đầu
dq.pop_back();      // xoá cuối
dq.pop_front();     // xoá đầu
```

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 300" role="img" aria-labelledby="dsa04a-deque-t dsa04a-deque-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa04a-deque-t">Deque: pop cuối rồi popleft đầu</title>
<desc id="dsa04a-deque-d">Sau thêm đầu 0, deque có 0 và 1; pop loại 1 ở cuối, popleft loại 0 ở đầu rồi deque rỗng.</desc>
<defs>
<marker id="dsa04a-deque-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M0 0 L10 5 L0 10z" fill="#10b981"/>
</marker>
</defs>
<text x="260" y="25" text-anchor="middle" font-size="14" fill="currentColor">Deque: pop cuối rồi popleft đầu</text>
<path d="M90 140 L90 208 L350 208 L350 140" fill="none" stroke="currentColor" stroke-width="2"/>
<g data-step="1" data-until="2">
<rect x="110" y="155" width="80" height="43" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
<text x="150.0" y="181.5" text-anchor="middle" font-size="14" fill="currentColor">0</text>
</g>
<g data-step="1" data-until="1">
<rect x="250" y="155" width="80" height="43" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="290.0" y="181.5" text-anchor="middle" font-size="14" fill="currentColor">1</text>
</g>
<g data-step="2" data-until="2">
<rect x="250" y="65" width="80" height="43" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
<text x="290.0" y="91.5" text-anchor="middle" font-size="14" fill="currentColor">1</text>
<path d="M290 150 L290 113" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa04a-deque-ar)"/>
</g>
<g data-step="3">
<rect x="15" y="155" width="75" height="43" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
<text x="52.5" y="181.5" text-anchor="middle" font-size="14" fill="currentColor">0</text>
<path d="M105 177 L94 177" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa04a-deque-ar)"/>
</g>
<g data-step="1" data-until="1">
<text x="150" y="132" text-anchor="middle" font-size="13" fill="currentColor">front</text>
<text x="290" y="132" text-anchor="middle" font-size="13" fill="currentColor">back</text>
</g>
<g data-step="2" data-until="2">
<text x="150" y="132" text-anchor="middle" font-size="13" fill="currentColor">front = back</text>
</g>
<g data-step="3">
<text x="260" y="175" text-anchor="middle" font-size="14" fill="currentColor">deque rỗng</text>
</g>
<g data-step="1" data-until="1">
<text x="260" y="270" text-anchor="middle" font-size="14" fill="currentColor">appendleft(0): [0, 1]</text>
</g>
<g data-step="2" data-until="2">
<text x="260" y="270" text-anchor="middle" font-size="14" fill="currentColor">pop() → 1, còn [0]</text>
</g>
<g data-step="3">
<text x="260" y="270" text-anchor="middle" font-size="14" fill="currentColor">popleft() → 0, còn []</text>
</g>
</svg>
<step-note data-step="1">Bắt đầu từ append(1), thêm đầu 0 bằng appendleft(0). Deque có [0, 1], hai đầu riêng biệt.</step-note>
<step-note data-step="2">pop() lấy 1 ở cuối ra ngoài, deque chỉ còn 0. Front và back cùng chỉ tới 0.</step-note>
<step-note data-step="3">popleft() lấy 0 ở đầu, deque rỗng thật sự. Với deque thích hợp, các thao tác hai đầu O(1).</step-note>
</step-flow>

## Monotonic Stack

`Monotonic stack` là một stack mà các phần tử bên trong luôn được giữ **đơn điệu** (tăng dần hoặc giảm dần). Trước khi `push` phần tử mới, ta `pop` hết những phần tử phá vỡ tính đơn điệu. Mẹo này biến bài toán "tìm phần tử lớn/nhỏ hơn gần nhất" từ O(n²) xuống **O(n)** vì mỗi phần tử chỉ vào và ra stack đúng một lần.

### Khi nào dùng?

- **Next Greater/Smaller Element**: với mỗi phần tử, tìm phần tử lớn hơn (hoặc nhỏ hơn) đầu tiên bên phải/trái.
- **Daily Temperatures**: chờ bao nhiêu ngày để có nhiệt độ cao hơn.
- **Largest Rectangle in Histogram**, **Trapping Rain Water**.

### Bài toán điển hình: Next Greater Element

Cho mảng `nums`, với mỗi phần tử tìm giá trị lớn hơn đầu tiên nằm bên phải; nếu không có thì `-1`.

**Hướng giải**: Duyệt từ phải sang trái, giữ một stack **giảm dần** chứa các "ứng viên" lớn hơn. Trước khi xét `nums[i]`, pop hết các phần tử nhỏ hơn hoặc bằng nó (chúng không còn là ứng viên cho các phần tử chưa xét bên trái). Đỉnh stack còn lại chính là đáp án. Rồi push `nums[i]`. O(n) time.

```python
def next_greater(nums):
    res = [-1] * len(nums)
    stack = []                      # giảm dần, lưu giá trị
    for i in range(len(nums) - 1, -1, -1):
        while stack and stack[-1] <= nums[i]:
            stack.pop()
        if stack:
            res[i] = stack[-1]
        stack.append(nums[i])
    return res
```
```javascript
function nextGreater(nums) {
  const res = new Array(nums.length).fill(-1);
  const stack = [];                 // giảm dần
  for (let i = nums.length - 1; i >= 0; i--) {
    while (stack.length && stack[stack.length - 1] <= nums[i]) {
      stack.pop();
    }
    if (stack.length) res[i] = stack[stack.length - 1];
    stack.push(nums[i]);
  }
  return res;
}
```
```java
int[] nextGreater(int[] nums) {
    int[] res = new int[nums.length];
    Arrays.fill(res, -1);
    Deque<Integer> stack = new ArrayDeque<>(); // giảm dần
    for (int i = nums.length - 1; i >= 0; i--) {
        while (!stack.isEmpty() && stack.peek() <= nums[i]) {
            stack.pop();
        }
        if (!stack.isEmpty()) res[i] = stack.peek();
        stack.push(nums[i]);
    }
    return res;
}
```
```go
func nextGreater(nums []int) []int {
    res := make([]int, len(nums))
    stack := []int{} // giảm dần
    for i := len(nums) - 1; i >= 0; i-- {
        res[i] = -1
        for len(stack) > 0 && stack[len(stack)-1] <= nums[i] {
            stack = stack[:len(stack)-1]
        }
        if len(stack) > 0 {
            res[i] = stack[len(stack)-1]
        }
        stack = append(stack, nums[i])
    }
    return res
}
```

```cpp
#include <vector>
#include <stack>
std::vector<int> nextGreater(const std::vector<int>& nums) {
    std::vector<int> res(nums.size(), -1);
    std::stack<int> stack;  // giảm dần
    for (int i = (int)nums.size() - 1; i >= 0; i--) {
        while (!stack.empty() && stack.top() <= nums[i]) {
            stack.pop();
        }
        if (!stack.empty()) res[i] = stack.top();
        stack.push(nums[i]);
    }
    return res;
}
```

<step-flow>
<svg viewBox="0 0 760 548" role="img" aria-labelledby="dsa04b-t dsa04b-d" style="width:100%;max-width:760px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa04b-t">Monotonic stack tìm Next Greater Element</title>
<desc id="dsa04b-d">Duyệt mảng [2, 1, 5, 3] từ phải sang trái; stack giữ thứ tự giảm dần, pop các phần tử nhỏ hơn hoặc bằng phần tử hiện tại rồi đọc đỉnh làm đáp án. Kết quả [5, 5, -1, -1].</desc>
<defs><marker id="dsa04b-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker></defs>
<text x="20" y="28" font-size="17" font-weight="700" fill="currentColor">Next Greater Element: nums = [2, 1, 5, 3]</text>
<text x="20" y="50" font-size="13" fill="currentColor" opacity="0.75">Duyệt phải → trái · stack giảm dần, đỉnh ở bên phải · đáp án = đỉnh sau khi pop</text>
<text x="20" y="92" font-size="13" font-weight="700" fill="currentColor" opacity="0.8">i, x = nums[i] · thao tác</text>
<text x="300" y="92" font-size="13" font-weight="700" fill="currentColor" opacity="0.8">stack (đáy → đỉnh)</text>
<text x="500" y="80" font-size="13" font-weight="700" fill="currentColor" opacity="0.8">res</text>
<text x="526" y="100" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.7">[0]</text>
<text x="586" y="100" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.7">[1]</text>
<text x="646" y="100" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.7">[2]</text>
<text x="706" y="100" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.7">[3]</text>
<line x1="20" y1="110" x2="740" y2="110" stroke="currentColor" stroke-opacity="0.25"/>
<g data-step="1">
<rect x="14" y="114" width="732" height="54" rx="7" fill="#3b82f6" fill-opacity="0.06"/>
<text x="30" y="137" font-size="14" font-weight="700" fill="currentColor">i=3, x=3</text>
<text x="120" y="137" font-size="13" fill="currentColor">stack rỗng: res[3] = -1</text>
<text x="120" y="158" font-size="13" fill="currentColor" opacity="0.75">push 3</text>
<rect x="300" y="124" width="40" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
<text x="320" y="146" font-size="15" text-anchor="middle" fill="currentColor">3</text>
<rect x="500" y="124" width="52" height="34" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 3"/>
<text x="526" y="146" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.35">-1</text>
<rect x="560" y="124" width="52" height="34" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 3"/>
<text x="586" y="146" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.35">-1</text>
<rect x="620" y="124" width="52" height="34" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 3"/>
<text x="646" y="146" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.35">-1</text>
<rect x="680" y="124" width="52" height="34" rx="5" fill="#f59e0b" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.4"/>
<text x="706" y="146" font-size="15" text-anchor="middle" fill="currentColor" font-weight="700">-1</text>
</g>
<g data-step="2">
<rect x="14" y="174" width="732" height="54" rx="7" fill="#3b82f6" fill-opacity="0.06"/>
<text x="30" y="197" font-size="14" font-weight="700" fill="currentColor">i=2, x=5</text>
<text x="120" y="197" font-size="13" fill="currentColor">pop 3 (3 ≤ 5)</text>
<text x="120" y="218" font-size="13" fill="currentColor" opacity="0.75">3 bị 5 che từ đây về trái</text>
<rect x="300" y="184" width="40" height="34" rx="5" fill="#f43f5e" fill-opacity="0.14" stroke="#f43f5e" stroke-dasharray="4 3"/>
<text x="320" y="206" font-size="15" text-anchor="middle" fill="currentColor" opacity="0.6">3</text>
<line x1="304" y1="214" x2="336" y2="188" stroke="#f43f5e" stroke-width="2"/>
<text x="350" y="206" font-size="13" fill="#f43f5e">pop</text>
<text x="384" y="206" font-size="13" fill="currentColor" opacity="0.75">→ rỗng</text>
<rect x="500" y="184" width="52" height="34" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 3"/>
<text x="526" y="206" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.35">-1</text>
<rect x="560" y="184" width="52" height="34" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 3"/>
<text x="586" y="206" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.35">-1</text>
<rect x="620" y="184" width="52" height="34" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 3"/>
<text x="646" y="206" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.35">-1</text>
<rect x="680" y="184" width="52" height="34" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.4"/>
<text x="706" y="206" font-size="15" text-anchor="middle" fill="currentColor">-1</text>
</g>
<g data-step="3">
<rect x="14" y="234" width="732" height="54" rx="7" fill="#3b82f6" fill-opacity="0.06"/>
<text x="30" y="257" font-size="14" font-weight="700" fill="currentColor">i=2, x=5</text>
<text x="120" y="257" font-size="13" fill="currentColor">stack rỗng: res[2] = -1</text>
<text x="120" y="278" font-size="13" fill="currentColor" opacity="0.75">push 5</text>
<rect x="300" y="244" width="40" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
<text x="320" y="266" font-size="15" text-anchor="middle" fill="currentColor">5</text>
<rect x="500" y="244" width="52" height="34" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 3"/>
<text x="526" y="266" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.35">-1</text>
<rect x="560" y="244" width="52" height="34" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 3"/>
<text x="586" y="266" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.35">-1</text>
<rect x="620" y="244" width="52" height="34" rx="5" fill="#f59e0b" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.4"/>
<text x="646" y="266" font-size="15" text-anchor="middle" fill="currentColor" font-weight="700">-1</text>
<rect x="680" y="244" width="52" height="34" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.4"/>
<text x="706" y="266" font-size="15" text-anchor="middle" fill="currentColor">-1</text>
</g>
<g data-step="4">
<rect x="14" y="294" width="732" height="54" rx="7" fill="#3b82f6" fill-opacity="0.06"/>
<text x="30" y="317" font-size="14" font-weight="700" fill="currentColor">i=1, x=1</text>
<text x="120" y="317" font-size="13" fill="currentColor">đỉnh 5 &gt; 1, giữ: res[1] = 5</text>
<text x="120" y="338" font-size="13" fill="currentColor" opacity="0.75">push 1</text>
<rect x="300" y="304" width="40" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
<text x="320" y="326" font-size="15" text-anchor="middle" fill="currentColor">5</text>
<rect x="346" y="304" width="40" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
<text x="366" y="326" font-size="15" text-anchor="middle" fill="currentColor">1</text>
<rect x="500" y="304" width="52" height="34" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 3"/>
<text x="526" y="326" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.35">-1</text>
<rect x="560" y="304" width="52" height="34" rx="5" fill="#f59e0b" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.4"/>
<text x="586" y="326" font-size="15" text-anchor="middle" fill="currentColor" font-weight="700">5</text>
<rect x="620" y="304" width="52" height="34" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.4"/>
<text x="646" y="326" font-size="15" text-anchor="middle" fill="currentColor">-1</text>
<rect x="680" y="304" width="52" height="34" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.4"/>
<text x="706" y="326" font-size="15" text-anchor="middle" fill="currentColor">-1</text>
</g>
<g data-step="5">
<rect x="14" y="354" width="732" height="54" rx="7" fill="#3b82f6" fill-opacity="0.06"/>
<text x="30" y="377" font-size="14" font-weight="700" fill="currentColor">i=0, x=2</text>
<text x="120" y="377" font-size="13" fill="currentColor">pop 1 (1 ≤ 2)</text>
<text x="120" y="398" font-size="13" fill="currentColor" opacity="0.75">đỉnh lộ ra là 5</text>
<rect x="300" y="364" width="40" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
<text x="320" y="386" font-size="15" text-anchor="middle" fill="currentColor">5</text>
<rect x="346" y="364" width="40" height="34" rx="5" fill="#f43f5e" fill-opacity="0.14" stroke="#f43f5e" stroke-dasharray="4 3"/>
<text x="366" y="386" font-size="15" text-anchor="middle" fill="currentColor" opacity="0.6">1</text>
<line x1="350" y1="394" x2="382" y2="368" stroke="#f43f5e" stroke-width="2"/>
<text x="396" y="386" font-size="13" fill="#f43f5e">pop</text>
<rect x="500" y="364" width="52" height="34" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 3"/>
<text x="526" y="386" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.35">-1</text>
<rect x="560" y="364" width="52" height="34" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.4"/>
<text x="586" y="386" font-size="15" text-anchor="middle" fill="currentColor">5</text>
<rect x="620" y="364" width="52" height="34" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.4"/>
<text x="646" y="386" font-size="15" text-anchor="middle" fill="currentColor">-1</text>
<rect x="680" y="364" width="52" height="34" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.4"/>
<text x="706" y="386" font-size="15" text-anchor="middle" fill="currentColor">-1</text>
</g>
<g data-step="6">
<rect x="14" y="414" width="732" height="54" rx="7" fill="#3b82f6" fill-opacity="0.06"/>
<text x="30" y="437" font-size="14" font-weight="700" fill="currentColor">i=0, x=2</text>
<text x="120" y="437" font-size="13" fill="currentColor">đỉnh 5 &gt; 2: res[0] = 5</text>
<text x="120" y="458" font-size="13" fill="currentColor" opacity="0.75">push 2</text>
<rect x="300" y="424" width="40" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
<text x="320" y="446" font-size="15" text-anchor="middle" fill="currentColor">5</text>
<rect x="346" y="424" width="40" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
<text x="366" y="446" font-size="15" text-anchor="middle" fill="currentColor">2</text>
<rect x="500" y="424" width="52" height="34" rx="5" fill="#f59e0b" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.4"/>
<text x="526" y="446" font-size="15" text-anchor="middle" fill="currentColor" font-weight="700">5</text>
<rect x="560" y="424" width="52" height="34" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.4"/>
<text x="586" y="446" font-size="15" text-anchor="middle" fill="currentColor">5</text>
<rect x="620" y="424" width="52" height="34" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.4"/>
<text x="646" y="446" font-size="15" text-anchor="middle" fill="currentColor">-1</text>
<rect x="680" y="424" width="52" height="34" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.4"/>
<text x="706" y="446" font-size="15" text-anchor="middle" fill="currentColor">-1</text>
</g>
<g data-step="7">
<rect x="14" y="484" width="732" height="54" rx="8" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
<text x="30" y="506" font-size="14" font-weight="700" fill="currentColor">Kết quả: res = [5, 5, -1, -1]</text>
<text x="30" y="527" font-size="13" fill="currentColor" opacity="0.85">4 lần push, 2 lần pop: mỗi phần tử vào stack 1 lần, ra nhiều nhất 1 lần → O(n)</text>
</g>
</svg>
<step-note data-step="1">Bắt đầu từ phần tử cuối: bên phải nó không còn gì, nên <code>res[3]</code> giữ <code>-1</code>. Push 3 để làm ứng viên cho các phần tử bên trái.</step-note>
<step-note data-step="2">3 ≤ 5 nên pop: mọi phần tử bên trái đều nhìn thấy 5 trước 3, và 5 lớn hơn, nên 3 không bao giờ là next greater của ai nữa.</step-note>
<step-note data-step="3">Pop xong stack rỗng: không có gì lớn hơn 5 ở bên phải, <code>res[2] = -1</code>. Push 5.</step-note>
<step-note data-step="4">Đỉnh 5 lớn hơn 1 nên không pop; đỉnh chính là phần tử lớn hơn gần nhất bên phải. Push 1 lên trên 5, stack vẫn giảm dần.</step-note>
<step-note data-step="5">1 ≤ 2 nên pop 1: nó bị 2 che với mọi phần tử còn lại bên trái. Vòng <code>while</code> dừng vì đỉnh mới là 5 &gt; 2.</step-note>
<step-note data-step="6">Đỉnh 5 là đáp án của 2. Push 2; nếu mảng còn phần tử bên trái, ứng viên của nó là 2 rồi tới 5.</step-note>
<step-note data-step="7">Vòng <code>while</code> nằm trong <code>for</code> nhưng không thành O(n²): tổng số pop của cả thuật toán không vượt tổng số push, tức n.</step-note>
</step-flow>

> **Ghi nhớ**: Hỏi "phần tử lớn hơn gần nhất" → stack giảm dần. Hỏi "phần tử nhỏ hơn gần nhất" → stack tăng dần. Thường lưu **index** thay vì giá trị để tính được khoảng cách.

## Monotonic Queue (Sliding Window Maximum)

`Monotonic queue` là một `deque` giữ các phần tử đơn điệu, dùng để truy vấn nhanh **max/min trong cửa sổ trượt**. Khác monotonic stack ở chỗ ta còn loại bỏ phần tử ở **đầu** khi nó trượt ra khỏi cửa sổ.

### Bài toán điển hình: Sliding Window Maximum

Cho mảng `nums` và cửa sổ kích thước `k`, trả về giá trị lớn nhất của mỗi cửa sổ khi trượt.

**Hướng giải**: Dùng deque lưu **index**, giữ giá trị giảm dần từ đầu đến cuối.
1. Trước khi thêm `i`, pop từ **cuối** mọi index có giá trị `<= nums[i]` (chúng không thể là max nữa).
2. Pop từ **đầu** index đã ra khỏi cửa sổ (`< i - k + 1`).
3. Đầu deque luôn là index của max hiện tại.

Mỗi index vào/ra deque một lần → O(n) time, O(k) space.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 400" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Sliding Window Maximum bằng monotonic deque</title>
  <desc>Mảng [1, 3, -1, -3, 5] với cửa sổ k=3 trượt từ trái sang phải; deque giữ index có giá trị giảm dần, pop cuối khi giá trị nhỏ hơn, pop đầu khi index ra khỏi cửa sổ, đầu deque là max.</desc>
  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">Sliding Window Maximum: nums = [1, 3, -1, -3, 5], k = 3</text>
  <g font-size="13">
    <rect x="40" y="44" width="56" height="40" rx="6" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="68" y="69" text-anchor="middle" fill="currentColor">1</text>
    <rect x="100" y="44" width="56" height="40" rx="6" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="128" y="69" text-anchor="middle" fill="currentColor">3</text>
    <rect x="160" y="44" width="56" height="40" rx="6" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="188" y="69" text-anchor="middle" fill="currentColor">-1</text>
    <rect x="220" y="44" width="56" height="40" rx="6" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="248" y="69" text-anchor="middle" fill="currentColor">-3</text>
    <rect x="280" y="44" width="56" height="40" rx="6" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="308" y="69" text-anchor="middle" fill="currentColor">5</text>
    <text x="68" y="100" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.55">i=0</text>
    <text x="128" y="100" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.55">i=1</text>
    <text x="188" y="100" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.55">i=2</text>
    <text x="248" y="100" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.55">i=3</text>
    <text x="308" y="100" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.55">i=4</text>
  </g>
  <g stroke="currentColor" fill="none" stroke-opacity="0.5">
    <rect x="36" y="40" width="184" height="48" rx="8" stroke="#f59e0b" stroke-opacity="0.9" stroke-width="2"/>
    <rect x="156" y="118" width="184" height="0"/>
  </g>
  <text x="380" y="68" font-size="11" fill="#f59e0b" opacity="0.95">cửa sổ đầu</text>
  <g font-size="11.5">
    <text x="16" y="150" font-size="12.5" font-weight="700" fill="currentColor">Trạng thái deque (lưu index, giá trị giảm dần):</text>
    <text x="40" y="178" fill="currentColor"><tspan font-weight="600">i=0</tspan>  deque=[0]            (val 1)</text>
    <text x="40" y="200" fill="currentColor"><tspan font-weight="600">i=1</tspan>  pop 0 (1≤3) → [1]   (val 3)</text>
    <text x="40" y="222" fill="currentColor"><tspan font-weight="600">i=2</tspan>  -1&lt;3 → [1, 2]      → cửa sổ [1,3,-1], max = nums[1] = 3</text>
    <text x="40" y="244" fill="currentColor"><tspan font-weight="600">i=3</tspan>  -3&lt;-1 → [1, 2, 3]  → cửa sổ [3,-1,-3], max = nums[1] = 3</text>
    <text x="40" y="266" fill="currentColor"><tspan font-weight="600">i=4</tspan>  pop cuối 3,2,1 (≤5) → [4]</text>
    <text x="76" y="287" fill="currentColor">→ cửa sổ [-1,-3,5], max = nums[4] = 5</text>
  </g>
  <g>
    <rect x="40" y="306" width="640" height="78" rx="9" fill="#f59e0b" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="60" y="330" font-size="11.5" fill="currentColor" opacity="0.9">• Pop <tspan font-weight="600">cuối</tspan> deque khi giá trị ≤ nums[i] (phần tử cũ không bao giờ là max nữa).</text>
    <text x="60" y="352" font-size="11.5" fill="currentColor" opacity="0.9">• Pop <tspan font-weight="600">đầu</tspan> deque khi index trượt ra khỏi cửa sổ (index ≤ i − k).</text>
    <text x="60" y="374" font-size="11.5" font-weight="600" fill="currentColor">• <tspan font-weight="700">Đầu deque luôn = index của max hiện tại.</tspan>  Kết quả: [3, 3, 5].</text>
  </g>
</svg>

```python
from collections import deque
def max_sliding_window(nums, k):
    dq = deque()                    # lưu index, giá trị giảm dần
    res = []
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()
        if i >= k - 1:
            res.append(nums[dq[0]])
    return res
```
```javascript
function maxSlidingWindow(nums, k) {
  const dq = [];                    // lưu index, giá trị giảm dần
  const res = [];
  for (let i = 0; i < nums.length; i++) {
    while (dq.length && nums[dq[dq.length - 1]] <= nums[i]) {
      dq.pop();
    }
    dq.push(i);
    if (dq[0] <= i - k) dq.shift();
    if (i >= k - 1) res.push(nums[dq[0]]);
  }
  return res;
}
```
```java
int[] maxSlidingWindow(int[] nums, int k) {
    Deque<Integer> dq = new ArrayDeque<>(); // lưu index, giảm dần
    int[] res = new int[nums.length - k + 1];
    int idx = 0;
    for (int i = 0; i < nums.length; i++) {
        while (!dq.isEmpty() && nums[dq.peekLast()] <= nums[i]) {
            dq.pollLast();
        }
        dq.offerLast(i);
        if (dq.peekFirst() <= i - k) dq.pollFirst();
        if (i >= k - 1) res[idx++] = nums[dq.peekFirst()];
    }
    return res;
}
```
```go
func maxSlidingWindow(nums []int, k int) []int {
    dq := []int{} // lưu index, giá trị giảm dần
    res := []int{}
    for i, x := range nums {
        for len(dq) > 0 && nums[dq[len(dq)-1]] <= x {
            dq = dq[:len(dq)-1]
        }
        dq = append(dq, i)
        if dq[0] <= i-k {
            dq = dq[1:]
        }
        if i >= k-1 {
            res = append(res, nums[dq[0]])
        }
    }
    return res
}
```

```cpp
#include <vector>
#include <deque>
std::vector<int> maxSlidingWindow(const std::vector<int>& nums, int k) {
    std::deque<int> dq;     // lưu index, giá trị giảm dần
    std::vector<int> res;
    for (int i = 0; i < (int)nums.size(); i++) {
        while (!dq.empty() && nums[dq.back()] <= nums[i]) {
            dq.pop_back();
        }
        dq.push_back(i);
        if (dq.front() <= i - k) dq.pop_front();
        if (i >= k - 1) res.push_back(nums[dq.front()]);
    }
    return res;
}
```

> **Bẫy**: Hãy nhớ deque lưu **index**, không lưu giá trị — vì ta cần biết phần tử nào đã trượt ra khỏi cửa sổ (so sánh `dq[0] <= i - k`). Nếu chỉ lưu giá trị, bạn sẽ không loại được phần tử cũ đúng cách.

## Tổng kết & so sánh

| Cấu trúc | Thứ tự | Thao tác chính | Ứng dụng tiêu biểu |
|---|---|---|---|
| Stack | LIFO | push/pop đỉnh | Ngoặc, undo, DFS, eval |
| Queue | FIFO | enqueue cuối / dequeue đầu | BFS, job queue, buffer |
| Deque | Hai đầu | thêm/xoá 2 đầu | Nền tảng monotonic, sliding |
| Monotonic stack | Đơn điệu | pop khi phá đơn điệu | Next greater/smaller, histogram |
| Monotonic queue | Đơn điệu + cửa sổ | pop 2 đầu | Sliding window max/min |

> **Ghi nhớ cuối**: Khi gặp bài "với mỗi phần tử, tìm phần tử lân cận thoả điều kiện so sánh" → nghĩ tới **monotonic stack**. Khi gặp "max/min của mọi cửa sổ trượt cố định" → nghĩ tới **monotonic queue**. Cả hai đều biến O(n²) thành O(n).
