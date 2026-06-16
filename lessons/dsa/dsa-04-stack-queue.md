# Stack, Queue & Monotonic

`Stack` và `Queue` là hai cấu trúc dữ liệu tuyến tính cơ bản nhất nhưng cũng hữu dụng nhất trong công việc thực tế lẫn phỏng vấn. Điểm khác biệt duy nhất nằm ở **thứ tự lấy phần tử ra**. Khi nắm vững chúng, bạn sẽ mở khoá được hàng loạt kỹ thuật mạnh hơn như `DFS`, `BFS`, và đặc biệt là `monotonic stack/queue` — vũ khí giải các bài toán "next greater element" hay "sliding window maximum" trong thời gian tuyến tính.

## Stack (LIFO)

`Stack` hoạt động theo nguyên tắc **LIFO** (Last In, First Out): phần tử vào sau cùng sẽ ra trước tiên. Hãy hình dung một chồng đĩa: bạn đặt đĩa lên trên cùng và cũng lấy đĩa từ trên cùng.

Hai thao tác cốt lõi:
- `push(x)`: đẩy phần tử lên đỉnh.
- `pop()`: lấy phần tử ở đỉnh ra.
- `peek()`/`top()`: xem đỉnh mà không lấy ra.

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

> 💡 **Ghi nhớ**: Bất cứ khi nào bạn cần "nhớ lại thứ gần đây nhất" hoặc "đảo ngược thứ tự", hãy nghĩ ngay đến `Stack`.

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

> ⚠️ **Bẫy**: Trong Java, đừng dùng class `java.util.Stack` cũ (nó kế thừa `Vector`, có khoá đồng bộ chậm). Hãy dùng `ArrayDeque` làm stack.

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

## Queue (FIFO)

`Queue` hoạt động theo nguyên tắc **FIFO** (First In, First Out): phần tử vào trước sẽ ra trước, đúng như xếp hàng mua vé. Người đến trước được phục vụ trước.

Hai thao tác cốt lõi:
- `enqueue(x)`/`push`: thêm vào **cuối** hàng.
- `dequeue()`/`pop`: lấy ra từ **đầu** hàng.

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

> ⚠️ **Bẫy**: Trong Python đừng dùng `list.pop(0)` làm dequeue — nó O(n) vì phải dịch chuyển toàn bộ phần tử. Hãy dùng `collections.deque`. Trong JavaScript, `array.shift()` cũng O(n); với dữ liệu lớn nên dùng con trỏ đầu hoặc cấu trúc deque.

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

### Bài toán điển hình: BFS trên lưới (số bước ngắn nhất)

Cho lưới 0/1, tìm số bước ít nhất đi từ ô `(0,0)` đến `(n-1,m-1)` (0 là đi được).

**Hướng giải**: Đặt ô xuất phát vào queue với khoảng cách 0, đánh dấu đã thăm. Lặp: lấy ô đầu hàng, mở rộng 4 hướng; ô hợp lệ & chưa thăm thì enqueue với `dist+1`. Vì BFS mở rộng theo từng lớp, lần đầu chạm đích chính là đường ngắn nhất. O(n·m) time.

```python
from collections import deque
def shortest_path(grid):
    n, m = len(grid), len(grid[0])
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

> 💡 **Ghi nhớ**: `Stack` → `DFS`, `Queue` → `BFS`. BFS luôn cho đường ngắn nhất khi mỗi cạnh có trọng số bằng nhau (đếm theo số bước).

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

## Monotonic Stack

`Monotonic stack` là một stack mà các phần tử bên trong luôn được giữ **đơn điệu** (tăng dần hoặc giảm dần). Trước khi `push` phần tử mới, ta `pop` hết những phần tử phá vỡ tính đơn điệu. Mẹo này biến bài toán "tìm phần tử lớn/nhỏ hơn gần nhất" từ O(n²) xuống **O(n)** vì mỗi phần tử chỉ vào và ra stack đúng một lần.

### Khi nào dùng?

- **Next Greater/Smaller Element**: với mỗi phần tử, tìm phần tử lớn hơn (hoặc nhỏ hơn) đầu tiên bên phải/trái.
- **Daily Temperatures**: chờ bao nhiêu ngày để có nhiệt độ cao hơn.
- **Largest Rectangle in Histogram**, **Trapping Rain Water**.

### Bài toán điển hình: Next Greater Element

Cho mảng `nums`, với mỗi phần tử tìm giá trị lớn hơn đầu tiên nằm bên phải; nếu không có thì `-1`.

**Hướng giải**: Duyệt từ phải sang trái, giữ một stack **giảm dần** chứa các "ứng viên" lớn hơn. Trước khi xét `nums[i]`, pop hết các phần tử nhỏ hơn hoặc bằng nó (chúng không bao giờ là next greater của ai nữa). Đỉnh stack còn lại chính là đáp án. Rồi push `nums[i]`. O(n) time.

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

> 💡 **Ghi nhớ**: Hỏi "phần tử lớn hơn gần nhất" → stack giảm dần. Hỏi "phần tử nhỏ hơn gần nhất" → stack tăng dần. Thường lưu **index** thay vì giá trị để tính được khoảng cách.

## Monotonic Queue (Sliding Window Maximum)

`Monotonic queue` là một `deque` giữ các phần tử đơn điệu, dùng để truy vấn nhanh **max/min trong cửa sổ trượt**. Khác monotonic stack ở chỗ ta còn loại bỏ phần tử ở **đầu** khi nó trượt ra khỏi cửa sổ.

### Bài toán điển hình: Sliding Window Maximum

Cho mảng `nums` và cửa sổ kích thước `k`, trả về giá trị lớn nhất của mỗi cửa sổ khi trượt.

**Hướng giải**: Dùng deque lưu **index**, giữ giá trị giảm dần từ đầu đến cuối.
1. Trước khi thêm `i`, pop từ **cuối** mọi index có giá trị `<= nums[i]` (chúng không thể là max nữa).
2. Pop từ **đầu** index đã ra khỏi cửa sổ (`< i - k + 1`).
3. Đầu deque luôn là index của max hiện tại.

Mỗi index vào/ra deque một lần → O(n) time, O(k) space.

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

> ⚠️ **Bẫy**: Hãy nhớ deque lưu **index**, không lưu giá trị — vì ta cần biết phần tử nào đã trượt ra khỏi cửa sổ (so sánh `dq[0] <= i - k`). Nếu chỉ lưu giá trị, bạn sẽ không loại được phần tử cũ đúng cách.

## Tổng kết & so sánh

| Cấu trúc | Thứ tự | Thao tác chính | Ứng dụng tiêu biểu |
|---|---|---|---|
| Stack | LIFO | push/pop đỉnh | Ngoặc, undo, DFS, eval |
| Queue | FIFO | enqueue cuối / dequeue đầu | BFS, job queue, buffer |
| Deque | Hai đầu | thêm/xoá 2 đầu | Nền tảng monotonic, sliding |
| Monotonic stack | Đơn điệu | pop khi phá đơn điệu | Next greater/smaller, histogram |
| Monotonic queue | Đơn điệu + cửa sổ | pop 2 đầu | Sliding window max/min |

> 💡 **Ghi nhớ cuối**: Khi gặp bài "với mỗi phần tử, tìm phần tử lân cận thoả điều kiện so sánh" → nghĩ tới **monotonic stack**. Khi gặp "max/min của mọi cửa sổ trượt cố định" → nghĩ tới **monotonic queue**. Cả hai đều biến O(n²) thành O(n).

---

Lưu ý: kho repo này (`/Users/dantt1002/projects/aws/web`) hiện chỉ chứa nội dung luyện thi chứng chỉ AWS (`data/lessons.ts`, `data/courses.ts`), không có khoá DSA hay file Markdown bài học nào. Tôi đã trả về phần thân bài học dạng Markdown ở trên (khoảng 330 dòng, không frontmatter, không bọc trong code fence) để script điều phối tự lưu vào nơi phù hợp.
