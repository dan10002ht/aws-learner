# Recursion, Graph & DP cơ bản

Đây là bài "tổng kết tư duy" của khoá. Ba chủ đề trong bài — **recursion (đệ quy)**, **graph (đồ thị)** và **dynamic programming (DP)** — nghe có vẻ rời rạc, nhưng thực ra chúng là một chuỗi liên tục: đệ quy là cách *diễn đạt* lời giải, graph là cách *mô hình hoá* quan hệ, còn DP là cách *tăng tốc* khi đệ quy tính lại quá nhiều thứ trùng lặp.

Mục tiêu rất thực dụng: bạn sẽ nhận ra **khi nào** một bài toán "có mùi" đệ quy, **khi nào** nó thực chất là duyệt graph, và **khi nào** thêm một cái bảng cache là biến lời giải từ chậm "vô vọng" thành nhanh tức thì. Đây cũng là nhóm câu hỏi xuất hiện dày đặc trong phỏng vấn.

## 1. Recursion — đệ quy

### 1.1. Trực giác

Đệ quy là khi một hàm **tự gọi chính nó** để giải một phiên bản *nhỏ hơn* của cùng bài toán. Hãy hình dung những con búp bê Nga (matryoshka): mở một con ra lại thấy một con nhỏ hơn bên trong, cứ thế cho đến con bé nhất không mở được nữa.

Mọi hàm đệ quy đúng đắn đều có hai phần:

- **Base case (trường hợp cơ sở)**: điều kiện dừng — con búp bê nhỏ nhất. Không có nó, hàm gọi mãi không ngừng.
- **Recursive case (bước đệ quy)**: thu nhỏ bài toán rồi gọi lại chính mình, tiến dần về base case.

Ví dụ kinh điển nhất: giai thừa `n! = n × (n-1)!`, với base case `0! = 1`.

```python
def factorial(n):
    if n <= 1:            # base case
        return 1
    return n * factorial(n - 1)   # recursive case
```
```javascript
function factorial(n) {
    if (n <= 1) return 1;              // base case
    return n * factorial(n - 1);      // recursive case
}
```
```java
static long factorial(int n) {
    if (n <= 1) return 1;             // base case
    return n * factorial(n - 1);      // recursive case
}
```
```go
func factorial(n int) int {
    if n <= 1 {                       // base case
        return 1
    }
    return n * factorial(n-1)         // recursive case
}
```

### 1.2. Call stack — vì sao đệ quy "ăn" bộ nhớ

Mỗi lần một hàm được gọi, máy đẩy một **stack frame** (khung chứa tham số, biến cục bộ, vị trí quay về) lên **call stack**. Với `factorial(4)`, stack chồng lên: `factorial(4)` → `factorial(3)` → `factorial(2)` → `factorial(1)`. Khi chạm base case, các frame lần lượt được lấy ra (pop) và nhân ngược lại: `1 → 2 → 6 → 24`.

Vì mỗi lần gọi tốn một frame, độ sâu đệ quy `d` tiêu tốn **O(d) bộ nhớ stack**. Đệ quy quá sâu (vài chục nghìn lần) sẽ tràn stack — `RecursionError` / `StackOverflowError`.

> ⚠️ Bẫy: Python mặc định giới hạn đệ quy ~1000 lần. Một vòng lặp đơn giản trên mảng 10^5 phần tử nếu viết kiểu đệ quy sẽ crash. Khi độ sâu có thể lớn, hãy chuyển sang **vòng lặp** hoặc dùng stack tường minh.

### 1.3. Đệ quy vs lặp (iteration)

Mọi thuật toán đệ quy đều **viết lại được** bằng vòng lặp, và ngược lại. Chọn cái nào?

| Tiêu chí | Đệ quy | Lặp |
| --- | --- | --- |
| Đọc/diễn đạt | Gọn, sát định nghĩa toán học | Dài hơn với bài "tự nhiên đệ quy" |
| Bộ nhớ | O(độ sâu) cho call stack | Thường O(1) |
| Cây/graph/chia để trị | Rất tự nhiên | Phải tự quản lý stack |
| Duyệt mảng tuyến tính | Lãng phí | Phù hợp nhất |

> 💡 Ghi nhớ: Dùng đệ quy khi bài toán **tự định nghĩa bằng chính nó** (cây, graph, chia để trị, backtracking). Dùng lặp khi chỉ đi tuyến tính qua dữ liệu — vừa nhanh hơn vừa không lo tràn stack.

## 2. Backtracking — quay lui

### 2.1. Trực giác

Backtracking là đệ quy có "tẩy". Bạn **thử** một lựa chọn, đi sâu vào nhánh đó; nếu thấy bế tắc (hoặc đã ra một kết quả), bạn **quay lui** — gỡ bỏ lựa chọn vừa rồi — rồi thử lựa chọn khác. Giống đi mê cung: gặp ngõ cụt thì lùi lại ngã rẽ gần nhất và chọn hướng khác.

Khung mẫu (template) của mọi bài backtracking gần như giống hệt nhau:

```text
backtrack(trạng_thái):
    nếu trạng_thái là lời giải hoàn chỉnh: ghi nhận, return
    với mỗi lựa chọn hợp lệ tiếp theo:
        thêm lựa chọn vào trạng_thái   # chọn
        backtrack(trạng_thái)          # đi sâu
        gỡ lựa chọn khỏi trạng_thái    # quay lui (undo)
```

### 2.2. Sinh hoán vị (permutations)

Bài điển hình: liệt kê mọi hoán vị của một mảng. Ý tưởng: ở mỗi vị trí, thử lần lượt từng phần tử *chưa dùng*.

```python
def permutations(nums):
    res, used, path = [], [False] * len(nums), []
    def backtrack():
        if len(path) == len(nums):
            res.append(path[:])          # copy lời giải
            return
        for i in range(len(nums)):
            if used[i]:
                continue
            used[i] = True; path.append(nums[i])   # chọn
            backtrack()                            # đi sâu
            used[i] = False; path.pop()            # quay lui
    backtrack()
    return res
```
```javascript
function permutations(nums) {
    const res = [], used = Array(nums.length).fill(false), path = [];
    function backtrack() {
        if (path.length === nums.length) { res.push([...path]); return; }
        for (let i = 0; i < nums.length; i++) {
            if (used[i]) continue;
            used[i] = true; path.push(nums[i]);     // chọn
            backtrack();                            // đi sâu
            used[i] = false; path.pop();            // quay lui
        }
    }
    backtrack();
    return res;
}
```
```java
static List<List<Integer>> permutations(int[] nums) {
    List<List<Integer>> res = new ArrayList<>();
    boolean[] used = new boolean[nums.length];
    List<Integer> path = new ArrayList<>();
    backtrack(nums, used, path, res);
    return res;
}
static void backtrack(int[] nums, boolean[] used, List<Integer> path, List<List<Integer>> res) {
    if (path.size() == nums.length) { res.add(new ArrayList<>(path)); return; }
    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        used[i] = true; path.add(nums[i]);          // chọn
        backtrack(nums, used, path, res);           // đi sâu
        used[i] = false; path.remove(path.size() - 1); // quay lui
    }
}
```
```go
func permutations(nums []int) [][]int {
    res := [][]int{}
    used := make([]bool, len(nums))
    path := []int{}
    var backtrack func()
    backtrack = func() {
        if len(path) == len(nums) {
            cp := append([]int{}, path...)
            res = append(res, cp)
            return
        }
        for i := range nums {
            if used[i] {
                continue
            }
            used[i] = true; path = append(path, nums[i])     // chọn
            backtrack()                                      // đi sâu
            used[i] = false; path = path[:len(path)-1]        // quay lui
        }
    }
    backtrack()
    return res
}
```

Số hoán vị là `n!`, nên độ phức tạp là **O(n × n!)** — backtracking vốn dĩ "đắt", chỉ dùng khi `n` nhỏ.

> 💡 Ghi nhớ: **Tổ hợp (combinations)** chỉ khác hoán vị ở một chỗ — để tránh đếm lặp `{1,2}` và `{2,1}`, ta truyền thêm một chỉ số `start` và vòng lặp chỉ chạy từ `start` trở đi, không quay lại các phần tử đã xét.

### 2.3. Ý tưởng N-queens

Bài N-queens: đặt `N` quân hậu lên bàn cờ `N×N` sao cho không quân nào ăn được quân nào (không cùng hàng, cột, đường chéo). Cách tiếp cận backtracking:

- Đặt **mỗi hàng đúng một quân hậu** (vì hai hậu cùng hàng là ăn nhau ngay).
- Ở hàng `r`, thử từng cột `c`. Kiểm tra `c` có an toàn không bằng ba tập đã chiếm: `cols`, đường chéo `\` (`r - c`), đường chéo `/` (`r + c`).
- An toàn thì đặt, đệ quy sang hàng `r+1`; xong thì gỡ ra (quay lui) để thử cột khác.

Mẹo phỏng vấn: dùng `set` để kiểm tra xung đột đường chéo trong O(1) thay vì quét cả bàn cờ — đây chính là chỗ kiến thức hash set của bài trước phát huy.

## 3. Graph — đồ thị

### 3.1. Khái niệm & biểu diễn

Graph gồm các **node (đỉnh)** nối với nhau bằng **edge (cạnh)**. Nó mô hình hoá *quan hệ*: mạng xã hội (ai theo dõi ai), bản đồ đường đi, dependency giữa các task, đồ thị gọi hàm... Rất nhiều bài "thực tế" thực ra là bài graph trá hình.

Cách biểu diễn thực dụng nhất là **adjacency list (danh sách kề)**: với mỗi node, lưu danh sách các node mà nó nối tới. Tốn **O(V + E)** bộ nhớ (V = số đỉnh, E = số cạnh), gọn hơn nhiều so với adjacency matrix `O(V²)` khi đồ thị thưa.

```python
from collections import defaultdict
graph = defaultdict(list)
def add_edge(u, v):          # cạnh vô hướng
    graph[u].append(v)
    graph[v].append(u)
```
```javascript
const graph = new Map();
function addEdge(u, v) {                 // cạnh vô hướng
    if (!graph.has(u)) graph.set(u, []);
    if (!graph.has(v)) graph.set(v, []);
    graph.get(u).push(v);
    graph.get(v).push(u);
}
```
```java
Map<Integer, List<Integer>> graph = new HashMap<>();
void addEdge(int u, int v) {             // cạnh vô hướng
    graph.computeIfAbsent(u, k -> new ArrayList<>()).add(v);
    graph.computeIfAbsent(v, k -> new ArrayList<>()).add(u);
}
```
```go
graph := map[int][]int{}
addEdge := func(u, v int) {              // cạnh vô hướng
    graph[u] = append(graph[u], v)
    graph[v] = append(graph[v], u)
}
```

### 3.2. BFS — duyệt theo chiều rộng

BFS lan từ node nguồn ra **theo từng lớp**: thăm tất cả hàng xóm trực tiếp trước, rồi mới đến hàng xóm-của-hàng-xóm. Dùng một **queue (FIFO)** và một tập `visited`. BFS đặc biệt giá trị vì trên đồ thị **không trọng số**, nó tìm được **đường đi ngắn nhất** (ít cạnh nhất).

```python
from collections import deque
def bfs(graph, start):
    visited, order = {start}, []
    q = deque([start])
    while q:
        node = q.popleft()
        order.append(node)
        for nb in graph[node]:
            if nb not in visited:
                visited.add(nb)
                q.append(nb)
    return order
```
```javascript
function bfs(graph, start) {
    const visited = new Set([start]), order = [];
    const q = [start];
    while (q.length) {
        const node = q.shift();
        order.push(node);
        for (const nb of (graph.get(node) || [])) {
            if (!visited.has(nb)) { visited.add(nb); q.push(nb); }
        }
    }
    return order;
}
```
```java
static List<Integer> bfs(Map<Integer, List<Integer>> graph, int start) {
    Set<Integer> visited = new HashSet<>(); visited.add(start);
    List<Integer> order = new ArrayList<>();
    Deque<Integer> q = new ArrayDeque<>(); q.add(start);
    while (!q.isEmpty()) {
        int node = q.poll();
        order.add(node);
        for (int nb : graph.getOrDefault(node, List.of())) {
            if (!visited.contains(nb)) { visited.add(nb); q.add(nb); }
        }
    }
    return order;
}
```
```go
func bfs(graph map[int][]int, start int) []int {
    visited := map[int]bool{start: true}
    order := []int{}
    q := []int{start}
    for len(q) > 0 {
        node := q[0]
        q = q[1:]
        order = append(order, node)
        for _, nb := range graph[node] {
            if !visited[nb] {
                visited[nb] = true
                q = append(q, nb)
            }
        }
    }
    return order
}
```

### 3.3. DFS — duyệt theo chiều sâu

DFS đi **sâu hết một nhánh** rồi mới quay lại. Viết tự nhiên bằng đệ quy (dùng call stack) hoặc bằng stack tường minh. DFS hợp cho: phát hiện chu trình, đếm thành phần liên thông, topological sort, "flood fill".

```python
def dfs(graph, node, visited, order):
    visited.add(node)
    order.append(node)
    for nb in graph[node]:
        if nb not in visited:
            dfs(graph, nb, visited, order)
    return order
```
```javascript
function dfs(graph, node, visited, order) {
    visited.add(node);
    order.push(node);
    for (const nb of (graph.get(node) || [])) {
        if (!visited.has(nb)) dfs(graph, nb, visited, order);
    }
    return order;
}
```
```java
static void dfs(Map<Integer, List<Integer>> graph, int node,
                Set<Integer> visited, List<Integer> order) {
    visited.add(node);
    order.add(node);
    for (int nb : graph.getOrDefault(node, List.of())) {
        if (!visited.contains(nb)) dfs(graph, nb, visited, order);
    }
}
```
```go
func dfs(graph map[int][]int, node int, visited map[int]bool, order *[]int) {
    visited[node] = true
    *order = append(*order, node)
    for _, nb := range graph[node] {
        if !visited[nb] {
            dfs(graph, nb, visited, order)
        }
    }
}
```

Cả BFS và DFS đều chạy **O(V + E)** vì mỗi đỉnh và mỗi cạnh được xét đúng một lần.

| Thuật toán | Cấu trúc | Đường ngắn nhất (không trọng số)? | Hợp cho |
| --- | --- | --- | --- |
| BFS | Queue (FIFO) | Có | Khoảng cách ngắn nhất, lan theo lớp |
| DFS | Stack / đệ quy | Không | Chu trình, liên thông, topo sort |

> ⚠️ Bẫy: **Luôn đánh dấu `visited`** trước/ngay khi đưa node vào queue/stack. Quên bước này, đồ thị có chu trình sẽ khiến bạn lặp vô hạn. Lỗi kinh điển: đánh dấu `visited` ở lúc *lấy ra* thay vì lúc *đưa vào* queue → cùng một node bị nhồi vào queue nhiều lần.

## 4. Dynamic Programming nhập môn

### 4.1. Khi nào dùng DP?

DP áp dụng khi bài toán có **hai dấu hiệu**:

1. **Overlapping subproblems (bài con trùng lặp)**: cùng một bài con bị tính đi tính lại nhiều lần.
2. **Optimal substructure (cấu trúc con tối ưu)**: lời giải tối ưu của bài lớn ghép từ lời giải tối ưu của các bài con.

Ý tưởng cốt lõi: **tính mỗi bài con đúng một lần và lưu kết quả lại** để dùng lại. Có hai trường phái:

- **Memoization (top-down)**: vẫn viết đệ quy như bình thường, nhưng thêm một cache; trước khi tính, kiểm tra cache.
- **Tabulation (bottom-up)**: bỏ đệ quy, điền dần một bảng từ bài con nhỏ nhất lên.

### 4.2. Fibonacci — minh hoạ sức mạnh của cache

`fib(n) = fib(n-1) + fib(n-2)`. Đệ quy ngây thơ là **O(2^n)** vì `fib(n-2)` bị tính lại vô số lần. Thêm cache → **O(n)**.

```python
from functools import lru_cache
@lru_cache(maxsize=None)          # memoization (top-down)
def fib_memo(n):
    if n < 2:
        return n
    return fib_memo(n - 1) + fib_memo(n - 2)

def fib_tab(n):                   # tabulation (bottom-up)
    if n < 2:
        return n
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b
```
```javascript
function fibMemo(n, cache = new Map()) {     // memoization
    if (n < 2) return n;
    if (cache.has(n)) return cache.get(n);
    const v = fibMemo(n - 1, cache) + fibMemo(n - 2, cache);
    cache.set(n, v);
    return v;
}
function fibTab(n) {                          // tabulation
    if (n < 2) return n;
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
    return b;
}
```
```java
static Map<Integer, Long> cache = new HashMap<>();
static long fibMemo(int n) {                  // memoization
    if (n < 2) return n;
    if (cache.containsKey(n)) return cache.get(n);
    long v = fibMemo(n - 1) + fibMemo(n - 2);
    cache.put(n, v);
    return v;
}
static long fibTab(int n) {                    // tabulation
    if (n < 2) return n;
    long a = 0, b = 1;
    for (int i = 2; i <= n; i++) { long t = a + b; a = b; b = t; }
    return b;
}
```
```go
func fibMemo(n int, cache map[int]int) int {   // memoization
    if n < 2 {
        return n
    }
    if v, ok := cache[n]; ok {
        return v
    }
    v := fibMemo(n-1, cache) + fibMemo(n-2, cache)
    cache[n] = v
    return v
}
func fibTab(n int) int {                        // tabulation
    if n < 2 {
        return n
    }
    a, b := 0, 1
    for i := 2; i <= n; i++ {
        a, b = b, a+b
    }
    return b
}
```

| Cách | Hướng | Bộ nhớ | Ưu điểm |
| --- | --- | --- | --- |
| Memoization | Top-down (đệ quy + cache) | O(n) + call stack | Viết nhanh, sát công thức truy hồi |
| Tabulation | Bottom-up (vòng lặp) | O(n), thường tối ưu xuống O(1) | Không tràn stack, hằng số nhỏ hơn |

### 4.3. Climbing stairs

Có `n` bậc thang, mỗi bước leo 1 hoặc 2 bậc. Hỏi có bao nhiêu cách leo lên đỉnh? Để tới bậc `n`, bạn vừa ở bậc `n-1` (rồi bước 1) hoặc bậc `n-2` (rồi bước 2). Vậy `ways(n) = ways(n-1) + ways(n-2)` — chính là **Fibonacci**! Đây là ví dụ tuyệt vời cho thấy nhiều bài DP nhập môn cùng một bộ xương: tìm **công thức truy hồi (recurrence)** rồi điền bảng.

### 4.4. Coin change — bài toán điển hình

Cho danh sách mệnh giá `coins` và số tiền `amount`, tìm **số đồng xu ít nhất** để gộp đúng `amount` (mỗi loại dùng vô hạn lần). Công thức truy hồi:

```text
dp[x] = số xu ít nhất tạo ra x
dp[0] = 0
dp[x] = 1 + min(dp[x - c])  với mọi coin c <= x
```

```python
def coin_change(coins, amount):
    INF = float("inf")
    dp = [0] + [INF] * amount
    for x in range(1, amount + 1):
        for c in coins:
            if c <= x and dp[x - c] + 1 < dp[x]:
                dp[x] = dp[x - c] + 1
    return -1 if dp[amount] == INF else dp[amount]
```
```javascript
function coinChange(coins, amount) {
    const INF = Infinity;
    const dp = new Array(amount + 1).fill(INF);
    dp[0] = 0;
    for (let x = 1; x <= amount; x++) {
        for (const c of coins) {
            if (c <= x && dp[x - c] + 1 < dp[x]) dp[x] = dp[x - c] + 1;
        }
    }
    return dp[amount] === INF ? -1 : dp[amount];
}
```
```java
static int coinChange(int[] coins, int amount) {
    int INF = amount + 1;
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, INF);
    dp[0] = 0;
    for (int x = 1; x <= amount; x++) {
        for (int c : coins) {
            if (c <= x && dp[x - c] + 1 < dp[x]) dp[x] = dp[x - c] + 1;
        }
    }
    return dp[amount] > amount ? -1 : dp[amount];
}
```
```go
func coinChange(coins []int, amount int) int {
    INF := amount + 1
    dp := make([]int, amount+1)
    for i := range dp {
        dp[i] = INF
    }
    dp[0] = 0
    for x := 1; x <= amount; x++ {
        for _, c := range coins {
            if c <= x && dp[x-c]+1 < dp[x] {
                dp[x] = dp[x-c] + 1
            }
        }
    }
    if dp[amount] > amount {
        return -1
    }
    return dp[amount]
}
```

Độ phức tạp **O(amount × số loại coin)** thời gian, **O(amount)** bộ nhớ.

> 💡 Ghi nhớ: Quy trình giải mọi bài DP gồm 4 bước — (1) định nghĩa **trạng thái** `dp[...]` nghĩa là gì; (2) viết **công thức truy hồi** nối trạng thái lớn với trạng thái nhỏ; (3) xác định **base case**; (4) chọn thứ tự điền bảng (top-down hay bottom-up). Nắm chắc bước 1 và 2 là giải được 80% bài.

> ⚠️ Bẫy: Với coin change, **không** tham lam chọn đồng mệnh giá lớn nhất trước. Ví dụ `coins = [1, 3, 4]`, `amount = 6`: tham lam ra `4+1+1 = 3 xu`, nhưng đáp án tối ưu là `3+3 = 2 xu`. Greedy chỉ đúng với một số hệ tiền tệ đặc biệt — DP mới luôn đúng.

## 5. Tổng kết & bản đồ quyết định

| Bài toán có dạng... | Công cụ nên nghĩ tới |
| --- | --- |
| Tự định nghĩa bằng phiên bản nhỏ hơn (cây, chia để trị) | Recursion |
| Liệt kê *mọi* khả năng / cấu hình hợp lệ | Backtracking |
| Quan hệ giữa các thực thể, "đi từ A tới B" | Graph (BFS/DFS) |
| Đường đi ít cạnh nhất, đồ thị không trọng số | BFS |
| Phát hiện chu trình, liên thông, topo sort | DFS |
| "Đếm số cách" / "tối ưu" + bài con trùng lặp | Dynamic Programming |

Bốn chủ đề này gắn kết hơn vẻ ngoài: backtracking là đệ quy có quay lui; DFS chính là đệ quy trên graph; DP là đệ quy được cache lại. Khi luyện phỏng vấn, hãy tập **đặt tên đúng cho bài toán trước** — nhận ra "à, đây là graph" hay "đây là DP" — vì một khi gắn đúng nhãn, bộ khung lời giải gần như tự hiện ra.

> 💡 Ghi nhớ cuối bài: Đừng học thuộc lời giải từng bài. Hãy thuộc **bộ khung (template)**: khung backtracking (chọn–đi sâu–quay lui), khung BFS/DFS (queue/đệ quy + visited), khung DP (định nghĩa trạng thái + truy hồi). Hàng trăm bài phỏng vấn chỉ là biến thể của vài bộ khung này.
