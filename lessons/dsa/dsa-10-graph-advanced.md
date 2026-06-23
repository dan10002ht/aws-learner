# Graph nâng cao: Topo, Union-Find, Dijkstra

Bài này gom **bốn vũ khí graph** mà big-tech hỏi đi hỏi lại: biểu diễn graph cho gọn, **BFS/DFS** thành thạo, **topological sort** cho lịch trình/dependency, **Union-Find (DSU)** cho thành phần liên thông & chu trình vô hướng, và **Dijkstra** cho đường đi ngắn nhất có trọng số dương. Bạn đã biết array/hash/tree — graph chính là chỗ ba thứ đó hợp lại: adjacency list là hash-of-array, BFS/DFS là tree-traversal trên đồ thị có chu trình, còn Dijkstra là BFS + heap.

Mục tiêu không phải học thuộc bài, mà là **nhận diện**: nhìn đề lạ và nói được "à, đây là topo sort" hay "đây là DSU". Một khi gắn đúng nhãn, template gần như tự chạy ra lời giải. Phần lớn bài graph trong phỏng vấn chỉ là biến thể của 5-6 template trong bài này.

## 1. Trực giác & khi nào dùng

Rất nhiều bài "thực tế" là graph **trá hình**. Hãy tự hỏi: *bài này có "thực thể" và "quan hệ giữa chúng" không?* Nếu có, gần như chắc chắn là graph.

| Dấu hiệu trong đề | Nghĩ ngay tới |
| --- | --- |
| "lưới (grid)", "vùng", "đảo", "lan ra" | BFS/DFS trên grid (flood fill) |
| "đường đi **ngắn nhất**" + **không** trọng số | BFS |
| "đường đi ngắn nhất" + cạnh có **trọng số dương** | Dijkstra |
| "thứ tự thực hiện", "prerequisite", "build order", "lịch học" | Topological sort |
| "có thể hoàn thành không?", "phát hiện **chu trình** trên đồ thị **có hướng**" | Topo sort (detect cycle) |
| "gộp nhóm", "có cùng nhóm không", "thêm cạnh nào tạo chu trình" (vô hướng) | Union-Find (DSU) |
| "số thành phần liên thông", "số đảo", "số tỉnh" | DSU **hoặc** DFS/BFS đếm cụm |
| "biến đổi từng bước từ A → B", "ít bước nhất" | BFS trên không gian trạng thái (Word Ladder) |

> 💡 Ghi nhớ: **Ngắn nhất + không trọng số = BFS; ngắn nhất + trọng số dương = Dijkstra; thứ tự/phụ thuộc = Topo; gộp nhóm/chu trình vô hướng = DSU.** Học thuộc một dòng này, bạn lọc được 90% bài graph chỉ trong 10 giây đọc đề.

### 1.1. Biểu diễn graph

Hai cách chính: **adjacency list** (danh sách kề) và **adjacency matrix** (ma trận kề).

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Adjacency list so với adjacency matrix cho cùng một đồ thị 4 đỉnh</title>
  <desc>Đồ thị vô hướng 4 đỉnh 0-1-2-3 thành hình vuông. Bên trái biểu diễn bằng adjacency list tốn O(V+E) bộ nhớ. Bên phải bằng adjacency matrix tốn O(V^2). Matrix tra cạnh O(1), list tra cạnh theo bậc đỉnh.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Cùng một đồ thị, hai cách biểu diễn</text>

  <text x="100" y="58" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Đồ thị (vô hướng)</text>
  <g stroke="currentColor" stroke-width="1.5">
    <line x1="60" y1="92" x2="140" y2="92"/>
    <line x1="60" y1="92" x2="60" y2="168"/>
    <line x1="140" y1="92" x2="140" y2="168"/>
    <line x1="60" y1="168" x2="140" y2="168"/>
  </g>
  <g>
    <circle cx="60" cy="92" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
    <text x="60" y="97" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">0</text>
    <circle cx="140" cy="92" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
    <text x="140" y="97" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">1</text>
    <circle cx="60" cy="168" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
    <text x="60" y="173" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">2</text>
    <circle cx="140" cy="168" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
    <text x="140" y="173" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">3</text>
  </g>

  <g>
    <rect x="216" y="44" width="216" height="216" rx="10" fill="#10b981" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="324" y="68" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Adjacency list</text>
    <text x="324" y="86" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">hash/array of list</text>
    <g font-size="12.5" fill="currentColor">
      <text x="240" y="120">0 → [1, 2]</text>
      <text x="240" y="148">1 → [0, 3]</text>
      <text x="240" y="176">2 → [0, 3]</text>
      <text x="240" y="204">3 → [1, 2]</text>
    </g>
    <text x="324" y="234" font-size="11.5" font-weight="700" text-anchor="middle" fill="#10b981">Bộ nhớ O(V + E)</text>
    <text x="324" y="251" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">tra cạnh: O(bậc của u)</text>
  </g>

  <g>
    <rect x="456" y="44" width="248" height="216" rx="10" fill="#f59e0b" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="580" y="68" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Adjacency matrix</text>
    <text x="580" y="86" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">bảng V×V số 0/1</text>
    <g font-size="12" font-family="ui-monospace, monospace" fill="currentColor">
      <text x="520" y="112" opacity="0.7">  0 1 2 3</text>
      <text x="500" y="134">0  0 1 1 0</text>
      <text x="500" y="156">1  1 0 0 1</text>
      <text x="500" y="178">2  1 0 0 1</text>
      <text x="500" y="200">3  0 1 1 0</text>
    </g>
    <text x="580" y="234" font-size="11.5" font-weight="700" text-anchor="middle" fill="#f59e0b">Bộ nhớ O(V²)</text>
    <text x="580" y="251" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">tra cạnh (u,v): O(1)</text>
  </g>

  <text x="360" y="290" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.75">Đồ thị thưa → list gọn hơn nhiều; matrix chỉ thắng khi cần tra cạnh liên tục và V nhỏ.</text>
</svg>

| Tiêu chí | Adjacency list | Adjacency matrix |
| --- | --- | --- |
| Bộ nhớ | **O(V + E)** | O(V²) |
| Kiểm tra cạnh (u,v) có tồn tại? | O(bậc của u) | **O(1)** |
| Duyệt mọi hàng xóm của u | O(bậc của u) | O(V) |
| Hợp với | Đồ thị **thưa** (E nhỏ) — đa số bài | Đồ thị **dày**, V nhỏ, cần tra cạnh nhanh |

Trong phỏng vấn, **mặc định dùng adjacency list** (đồ thị thật thường thưa). Chỉ dùng matrix khi V ≤ vài trăm và bạn cần tra (u,v) liên tục, hoặc đề đã cho sẵn dạng grid/matrix.

```python
from collections import defaultdict
graph = defaultdict(list)
def add_edge(u, v, directed=False):
    graph[u].append(v)
    if not directed:
        graph[v].append(u)        # vô hướng: thêm cả chiều ngược
```
```javascript
const graph = new Map();
function addEdge(u, v, directed = false) {
    if (!graph.has(u)) graph.set(u, []);
    if (!graph.has(v)) graph.set(v, []);
    graph.get(u).push(v);
    if (!directed) graph.get(v).push(u);   // vô hướng: cả hai chiều
}
```
```java
Map<Integer, List<Integer>> graph = new HashMap<>();
void addEdge(int u, int v, boolean directed) {
    graph.computeIfAbsent(u, k -> new ArrayList<>()).add(v);
    if (!directed)
        graph.computeIfAbsent(v, k -> new ArrayList<>()).add(u);
}
```
```go
graph := map[int][]int{}
addEdge := func(u, v int, directed bool) {
    graph[u] = append(graph[u], v)
    if !directed {
        graph[v] = append(graph[v], u) // vô hướng: cả hai chiều
    }
}
```

```cpp
#include <unordered_map>
#include <vector>
std::unordered_map<int, std::vector<int>> graph;
void addEdge(int u, int v, bool directed = false) {
    graph[u].push_back(v);
    if (!directed)
        graph[v].push_back(u);          // vô hướng: cả hai chiều
}
```

### 1.2. BFS/DFS recap (nền của mọi thứ)

BFS lan **theo từng lớp** bằng **queue (FIFO)** → tìm đường ngắn nhất (ít cạnh nhất) trên đồ thị không trọng số. DFS đi **sâu hết nhánh** bằng đệ quy/stack → hợp cho chu trình, liên thông, topo sort. Cả hai đều **O(V + E)** vì mỗi đỉnh/cạnh xét đúng một lần.

```python
from collections import deque
def bfs(graph, start):
    visited, q = {start}, deque([start])
    while q:
        node = q.popleft()
        for nb in graph[node]:
            if nb not in visited:
                visited.add(nb)       # đánh dấu KHI ĐƯA VÀO queue
                q.append(nb)

def dfs(graph, node, visited):
    visited.add(node)
    for nb in graph[node]:
        if nb not in visited:
            dfs(graph, nb, visited)
```
```javascript
function bfs(graph, start) {
    const visited = new Set([start]), q = [start];
    while (q.length) {
        const node = q.shift();
        for (const nb of graph.get(node) || []) {
            if (!visited.has(nb)) { visited.add(nb); q.push(nb); }
        }
    }
}
function dfs(graph, node, visited) {
    visited.add(node);
    for (const nb of graph.get(node) || [])
        if (!visited.has(nb)) dfs(graph, nb, visited);
}
```
```java
void bfs(Map<Integer,List<Integer>> graph, int start) {
    Set<Integer> visited = new HashSet<>(); visited.add(start);
    Deque<Integer> q = new ArrayDeque<>(); q.add(start);
    while (!q.isEmpty()) {
        int node = q.poll();
        for (int nb : graph.getOrDefault(node, List.of()))
            if (visited.add(nb)) q.add(nb);   // add() trả false nếu đã có
    }
}
void dfs(Map<Integer,List<Integer>> graph, int node, Set<Integer> visited) {
    visited.add(node);
    for (int nb : graph.getOrDefault(node, List.of()))
        if (!visited.contains(nb)) dfs(graph, nb, visited);
}
```
```go
func bfs(graph map[int][]int, start int) {
    visited := map[int]bool{start: true}
    q := []int{start}
    for len(q) > 0 {
        node := q[0]; q = q[1:]
        for _, nb := range graph[node] {
            if !visited[nb] { visited[nb] = true; q = append(q, nb) }
        }
    }
}
func dfs(graph map[int][]int, node int, visited map[int]bool) {
    visited[node] = true
    for _, nb := range graph[node] {
        if !visited[nb] { dfs(graph, nb, visited) }
    }
}
```

```cpp
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <queue>
void bfs(std::unordered_map<int, std::vector<int>>& graph, int start) {
    std::unordered_set<int> visited{start};
    std::queue<int> q;
    q.push(start);
    while (!q.empty()) {
        int node = q.front(); q.pop();
        for (int nb : graph[node]) {
            if (!visited.count(nb)) {    // đánh dấu KHI ĐƯA VÀO queue
                visited.insert(nb);
                q.push(nb);
            }
        }
    }
}
void dfs(std::unordered_map<int, std::vector<int>>& graph, int node,
         std::unordered_set<int>& visited) {
    visited.insert(node);
    for (int nb : graph[node])
        if (!visited.count(nb)) dfs(graph, nb, visited);
}
```

> ⚠️ Bẫy kinh điển: trong BFS, **đánh dấu `visited` ngay khi đưa node vào queue**, KHÔNG phải lúc lấy ra. Nếu đánh dấu lúc lấy ra, một node có thể bị nhồi vào queue nhiều lần → chậm và có thể sai khoảng cách.

## 2. Topological Sort (Kahn + DFS)

### 2.1. Trực giác

Topo sort sắp **các đỉnh của một DAG (Directed Acyclic Graph)** thành một hàng sao cho **mọi cạnh u → v thì u đứng trước v**. Đây chính là "làm việc gì trước, việc gì sau": muốn mặc áo khoác phải mặc áo trong trước, muốn học DP phải học đệ quy trước. Topo sort **chỉ tồn tại khi đồ thị KHÔNG có chu trình** — nếu A cần B mà B lại cần A thì không thể xếp thứ tự (deadlock).

Có hai cách: **Kahn (BFS theo in-degree)** và **DFS + post-order đảo ngược**. Kahn dễ phát hiện chu trình hơn nên thường được ưu tiên trong phỏng vấn.

### 2.2. Template Kahn (BFS — đếm in-degree)

Ý tưởng: đỉnh nào **in-degree = 0** (không ai cần nó trước) thì làm được ngay → bỏ vào queue. Lấy ra, "xoá" nó, giảm in-degree các đỉnh nó trỏ tới; đỉnh nào tụt về 0 thì đến lượt. Nếu xếp được **đủ V đỉnh** → DAG; nếu thiếu → **có chu trình**.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Kahn topological sort theo in-degree với 3 bước lan dần</title>
  <desc>DAG có cạnh A→B, A→C, B→D, C→D. In-degree ban đầu A=0, B=1, C=1, D=2. Bước 1 lấy A in-degree 0 vào queue rồi xoá, giảm in-degree B và C về 0. Bước 2 lấy B và C, xoá, giảm in-degree D về 0. Bước 3 lấy D. Thứ tự hợp lệ A, B, C, D.</desc>
  <text x="16" y="22" font-size="14" font-weight="700" fill="currentColor">Kahn: xoá đỉnh in-degree 0, lan dần ra thứ tự</text>

  <defs>
    <marker id="kahnArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>

  <g font-size="12.5" fill="currentColor">
    <text x="120" y="52" font-weight="700" text-anchor="middle">Bước 1</text>
    <text x="360" y="52" font-weight="700" text-anchor="middle">Bước 2</text>
    <text x="600" y="52" font-weight="700" text-anchor="middle">Bước 3</text>
  </g>

  <g stroke="currentColor" stroke-width="1.4" fill="none" marker-end="url(#kahnArrow)" opacity="0.55">
    <path d="M120 80 L80 120"/>
    <path d="M120 80 L160 120"/>
    <path d="M80 152 L120 192"/>
    <path d="M160 152 L120 192"/>
  </g>
  <g>
    <circle cx="120" cy="72" r="18" fill="#10b981" fill-opacity="0.9" stroke="currentColor"/>
    <text x="120" y="77" font-size="13" font-weight="700" text-anchor="middle" fill="#fff">A</text>
    <text x="120" y="58" font-size="9.5" text-anchor="middle" fill="#10b981" font-weight="700">in=0</text>
    <circle cx="72" cy="136" r="18" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
    <text x="72" y="141" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">B</text>
    <text x="46" y="141" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">1</text>
    <circle cx="168" cy="136" r="18" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
    <text x="168" y="141" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">C</text>
    <text x="194" y="141" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">1</text>
    <circle cx="120" cy="200" r="18" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
    <text x="120" y="205" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">D</text>
    <text x="120" y="232" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">in=2</text>
  </g>
  <text x="120" y="270" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">A in-degree 0 → queue,</text>
  <text x="120" y="285" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">xoá A → B, C tụt về 0</text>

  <g stroke="currentColor" stroke-width="1.4" fill="none" marker-end="url(#kahnArrow)" opacity="0.55">
    <path d="M312 152 L352 192"/>
    <path d="M408 152 L368 192"/>
  </g>
  <g>
    <circle cx="360" cy="72" r="18" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-dasharray="3 3" opacity="0.4"/>
    <text x="360" y="77" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.4">A</text>
    <circle cx="312" cy="136" r="18" fill="#10b981" fill-opacity="0.9" stroke="currentColor"/>
    <text x="312" y="141" font-size="13" font-weight="700" text-anchor="middle" fill="#fff">B</text>
    <text x="286" y="141" font-size="9.5" text-anchor="middle" fill="#10b981" font-weight="700">0</text>
    <circle cx="408" cy="136" r="18" fill="#10b981" fill-opacity="0.9" stroke="currentColor"/>
    <text x="408" y="141" font-size="13" font-weight="700" text-anchor="middle" fill="#fff">C</text>
    <text x="434" y="141" font-size="9.5" text-anchor="middle" fill="#10b981" font-weight="700">0</text>
    <circle cx="360" cy="200" r="18" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
    <text x="360" y="205" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">D</text>
    <text x="360" y="232" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">in=0</text>
  </g>
  <text x="360" y="270" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">lấy B, C → queue,</text>
  <text x="360" y="285" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">xoá cả hai → D tụt về 0</text>

  <g>
    <circle cx="600" cy="72" r="18" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-dasharray="3 3" opacity="0.4"/>
    <text x="600" y="77" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.4">A</text>
    <circle cx="552" cy="136" r="18" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-dasharray="3 3" opacity="0.4"/>
    <text x="552" y="141" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.4">B</text>
    <circle cx="648" cy="136" r="18" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-dasharray="3 3" opacity="0.4"/>
    <text x="648" y="141" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.4">C</text>
    <circle cx="600" cy="200" r="18" fill="#10b981" fill-opacity="0.9" stroke="currentColor"/>
    <text x="600" y="205" font-size="13" font-weight="700" text-anchor="middle" fill="#fff">D</text>
    <text x="600" y="232" font-size="9.5" text-anchor="middle" fill="#10b981" font-weight="700">0</text>
  </g>
  <text x="600" y="270" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">lấy D → xong</text>
  <text x="600" y="285" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">đủ 4 đỉnh ⇒ là DAG</text>

  <rect x="16" y="312" width="688" height="34" rx="8" fill="#10b981" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="40" y="334" font-size="12.5" font-weight="700" fill="currentColor">Thứ tự topo:</text>
  <text x="140" y="334" font-size="13" font-weight="700" fill="#10b981">A → B → C → D</text>
  <text x="360" y="334" font-size="11" fill="currentColor" opacity="0.75">(mọi cạnh u→v: u luôn đứng trước v)</text>
</svg>

```python
from collections import deque, defaultdict
def topo_kahn(n, edges):              # edges: list [u, v] nghĩa u -> v
    graph = defaultdict(list)
    indeg = [0] * n
    for u, v in edges:
        graph[u].append(v)
        indeg[v] += 1
    q = deque(i for i in range(n) if indeg[i] == 0)
    order = []
    while q:
        node = q.popleft()
        order.append(node)
        for nb in graph[node]:
            indeg[nb] -= 1
            if indeg[nb] == 0:
                q.append(nb)
    return order if len(order) == n else []   # [] => có chu trình
```
```javascript
function topoKahn(n, edges) {              // edges: [u, v] nghĩa u -> v
    const graph = Array.from({ length: n }, () => []);
    const indeg = new Array(n).fill(0);
    for (const [u, v] of edges) { graph[u].push(v); indeg[v]++; }
    const q = [];
    for (let i = 0; i < n; i++) if (indeg[i] === 0) q.push(i);
    const order = [];
    while (q.length) {
        const node = q.shift();
        order.push(node);
        for (const nb of graph[node]) if (--indeg[nb] === 0) q.push(nb);
    }
    return order.length === n ? order : [];   // [] => có chu trình
}
```
```java
int[] topoKahn(int n, int[][] edges) {        // edges: {u, v} nghĩa u -> v
    List<List<Integer>> graph = new ArrayList<>();
    for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
    int[] indeg = new int[n];
    for (int[] e : edges) { graph.get(e[0]).add(e[1]); indeg[e[1]]++; }
    Deque<Integer> q = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (indeg[i] == 0) q.add(i);
    int[] order = new int[n]; int idx = 0;
    while (!q.isEmpty()) {
        int node = q.poll();
        order[idx++] = node;
        for (int nb : graph.get(node)) if (--indeg[nb] == 0) q.add(nb);
    }
    return idx == n ? order : new int[0];     // rỗng => có chu trình
}
```
```go
func topoKahn(n int, edges [][]int) []int {   // edges: {u, v} nghĩa u -> v
    graph := make([][]int, n)
    indeg := make([]int, n)
    for _, e := range edges {
        graph[e[0]] = append(graph[e[0]], e[1])
        indeg[e[1]]++
    }
    q := []int{}
    for i := 0; i < n; i++ {
        if indeg[i] == 0 { q = append(q, i) }
    }
    order := []int{}
    for len(q) > 0 {
        node := q[0]; q = q[1:]
        order = append(order, node)
        for _, nb := range graph[node] {
            indeg[nb]--
            if indeg[nb] == 0 { q = append(q, nb) }
        }
    }
    if len(order) == n {
        return order
    }
    return []int{} // có chu trình
}
```

```cpp
#include <vector>
#include <queue>
std::vector<int> topoKahn(int n, std::vector<std::vector<int>>& edges) { // edges: {u, v} nghĩa u -> v
    std::vector<std::vector<int>> graph(n);
    std::vector<int> indeg(n, 0);
    for (auto& e : edges) { graph[e[0]].push_back(e[1]); indeg[e[1]]++; }
    std::queue<int> q;
    for (int i = 0; i < n; i++) if (indeg[i] == 0) q.push(i);
    std::vector<int> order;
    while (!q.empty()) {
        int node = q.front(); q.pop();
        order.push_back(node);
        for (int nb : graph[node]) if (--indeg[nb] == 0) q.push(nb);
    }
    return (int)order.size() == n ? order : std::vector<int>{}; // rỗng => có chu trình
}
```

### 2.3. Topo bằng DFS (post-order đảo)

DFS xong một đỉnh (đã thăm hết hậu duệ) thì đẩy nó vào stack. Đảo stack lại chính là topo order. Để phát hiện chu trình, dùng 3 trạng thái: `0` chưa thăm, `1` đang trong stack đệ quy (gray), `2` đã xong (black). Gặp lại đỉnh đang `1` → **có chu trình (back edge)**.

```text
Trạng thái màu (white/gray/black) phát hiện chu trình có hướng:
  0 = white (chưa thăm)
  1 = gray  (đang đệ quy — nằm trên đường hiện tại)
  2 = black (đã xong)
  Gặp cạnh tới đỉnh GRAY  => back edge => CÓ CHU TRÌNH
```

Độ phức tạp cả hai cách: **O(V + E)** thời gian, **O(V + E)** bộ nhớ.

> 💡 Ghi nhớ: Kahn xếp được **< V đỉnh** ⟺ DFS gặp **đỉnh gray** ⟺ đồ thị **có chu trình** ⟺ **không** topo được. Câu hỏi "có hoàn thành tất cả khoá học không?" thực chất là "DAG này có chu trình không?".

## 3. Union-Find / DSU (Disjoint Set Union)

### 3.1. Trực giác

DSU trả lời siêu nhanh hai câu hỏi: *"hai phần tử này có cùng nhóm không?"* (`find`) và *"gộp hai nhóm lại"* (`union`). Hình dung mỗi nhóm là một cây, gốc cây là "đại diện" (leader). Hai phần tử cùng nhóm ⟺ cùng gốc.

DSU vượt trội cho: đếm **connected components**, phát hiện **chu trình trên đồ thị VÔ HƯỚNG** (gộp hai đỉnh đã cùng nhóm ⟹ cạnh này tạo chu trình), và các bài "gộp dần" online.

### 3.2. Template DSU (path compression + union by rank)

Hai tối ưu làm `find`/`union` gần như **O(1)** (chính xác là O(α(n)) — hàm Ackermann ngược, ≤ 4 với mọi n thực tế):

- **Path compression**: khi `find`, trỏ thẳng mọi nút trên đường về gốc.
- **Union by rank/size**: gắn cây thấp vào cây cao để cây không bị "cao lêu nghêu".

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Union-Find: rừng các cây, union gộp hai cây, path compression làm phẳng cây</title>
  <desc>DSU là rừng các cây, mỗi cây một gốc đại diện. Hàng trên: union gộp cây gốc 0 và cây gốc 3 bằng cách gắn gốc thấp dưới gốc cao. Hàng dưới: trước path compression đỉnh 5 nằm sâu qua 4 và 3, sau find đỉnh 5 và 4 trỏ thẳng về gốc 3.</desc>

  <line x1="360" y1="20" x2="360" y2="320" stroke="currentColor" stroke-opacity="0.18" stroke-dasharray="4 4"/>

  <text x="180" y="26" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">union(0, 3): gộp hai cây</text>
  <g stroke="currentColor" stroke-width="1.4">
    <line x1="120" y1="78" x2="90" y2="128"/>
    <line x1="120" y1="78" x2="150" y2="128"/>
    <line x1="250" y1="78" x2="250" y2="128"/>
  </g>
  <g>
    <circle cx="120" cy="72" r="16" fill="#8b5cf6" fill-opacity="0.9" stroke="currentColor"/>
    <text x="120" y="77" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">0</text>
    <text x="120" y="56" font-size="9" text-anchor="middle" fill="#8b5cf6" font-weight="700">gốc</text>
    <circle cx="90" cy="134" r="15" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
    <text x="90" y="139" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">1</text>
    <circle cx="150" cy="134" r="15" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
    <text x="150" y="139" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">2</text>
    <circle cx="250" cy="72" r="16" fill="#3b82f6" fill-opacity="0.9" stroke="currentColor"/>
    <text x="250" y="77" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">3</text>
    <text x="250" y="56" font-size="9" text-anchor="middle" fill="#3b82f6" font-weight="700">gốc</text>
    <circle cx="250" cy="134" r="15" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
    <text x="250" y="139" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">4</text>
  </g>
  <text x="180" y="172" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.8">union by rank: gắn gốc cây thấp (0) dưới gốc cây cao (3)</text>

  <g stroke="currentColor" stroke-width="1.4">
    <line x1="180" y1="222" x2="120" y2="270"/>
    <line x1="180" y1="222" x2="240" y2="270"/>
    <line x1="120" y1="282" x2="90" y2="312"/>
    <line x1="120" y1="282" x2="150" y2="312"/>
  </g>
  <g>
    <circle cx="180" cy="216" r="16" fill="#3b82f6" fill-opacity="0.9" stroke="currentColor"/>
    <text x="180" y="221" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">3</text>
    <text x="180" y="200" font-size="9" text-anchor="middle" fill="#3b82f6" font-weight="700">gốc chung</text>
    <circle cx="120" cy="276" r="15" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
    <text x="120" y="281" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">0</text>
    <circle cx="240" cy="276" r="15" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
    <text x="240" y="281" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">4</text>
    <circle cx="90" cy="318" r="14" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
    <text x="90" y="323" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">1</text>
    <circle cx="150" cy="318" r="14" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
    <text x="150" y="323" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">2</text>
  </g>

  <text x="540" y="26" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">path compression khi find(5)</text>
  <text x="450" y="60" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.85">TRƯỚC</text>
  <g stroke="currentColor" stroke-width="1.4">
    <line x1="450" y1="84" x2="450" y2="130"/>
    <line x1="450" y1="140" x2="450" y2="186"/>
    <line x1="450" y1="196" x2="450" y2="242"/>
  </g>
  <g>
    <circle cx="450" cy="78" r="15" fill="#3b82f6" fill-opacity="0.9" stroke="currentColor"/>
    <text x="450" y="83" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">3</text>
    <circle cx="450" cy="136" r="14" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
    <text x="450" y="141" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">4</text>
    <circle cx="450" cy="192" r="14" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
    <text x="450" y="197" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">5</text>
    <circle cx="450" cy="248" r="14" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
    <text x="450" y="253" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">6</text>
  </g>
  <text x="450" y="280" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">cây "cao lêu nghêu"</text>

  <text x="624" y="60" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.85">SAU</text>
  <g stroke="currentColor" stroke-width="1.4">
    <line x1="624" y1="92" x2="588" y2="150"/>
    <line x1="624" y1="92" x2="624" y2="150"/>
    <line x1="624" y1="92" x2="660" y2="150"/>
  </g>
  <g>
    <circle cx="624" cy="78" r="15" fill="#10b981" fill-opacity="0.9" stroke="currentColor"/>
    <text x="624" y="83" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">3</text>
    <circle cx="588" cy="156" r="14" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
    <text x="588" y="161" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">4</text>
    <circle cx="624" cy="156" r="14" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
    <text x="624" y="161" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">5</text>
    <circle cx="660" cy="156" r="14" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
    <text x="660" y="161" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">6</text>
  </g>
  <text x="624" y="190" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">trỏ thẳng về gốc</text>
  <text x="624" y="204" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">→ cây phẳng, find sau O(1)</text>
</svg>

```python
class DSU:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.count = n               # số nhóm hiện tại
    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]  # path compression
            x = self.parent[x]
        return x
    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False             # đã cùng nhóm => cạnh tạo chu trình
        if self.rank[ra] < self.rank[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1
        self.count -= 1
        return True
```
```javascript
class DSU {
    constructor(n) {
        this.parent = Array.from({ length: n }, (_, i) => i);
        this.rank = new Array(n).fill(0);
        this.count = n;              // số nhóm hiện tại
    }
    find(x) {
        while (this.parent[x] !== x) {
            this.parent[x] = this.parent[this.parent[x]]; // path compression
            x = this.parent[x];
        }
        return x;
    }
    union(a, b) {
        let ra = this.find(a), rb = this.find(b);
        if (ra === rb) return false;     // đã cùng nhóm => chu trình
        if (this.rank[ra] < this.rank[rb]) [ra, rb] = [rb, ra];
        this.parent[rb] = ra;
        if (this.rank[ra] === this.rank[rb]) this.rank[ra]++;
        this.count--;
        return true;
    }
}
```
```java
class DSU {
    int[] parent, rank; int count;
    DSU(int n) {
        parent = new int[n]; rank = new int[n]; count = n;
        for (int i = 0; i < n; i++) parent[i] = i;
    }
    int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];     // path compression
            x = parent[x];
        }
        return x;
    }
    boolean union(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;            // đã cùng nhóm => chu trình
        if (rank[ra] < rank[rb]) { int t = ra; ra = rb; rb = t; }
        parent[rb] = ra;
        if (rank[ra] == rank[rb]) rank[ra]++;
        count--;
        return true;
    }
}
```
```go
type DSU struct {
    parent, rank []int
    count        int
}
func NewDSU(n int) *DSU {
    p := make([]int, n)
    for i := range p { p[i] = i }
    return &DSU{parent: p, rank: make([]int, n), count: n}
}
func (d *DSU) Find(x int) int {
    for d.parent[x] != x {
        d.parent[x] = d.parent[d.parent[x]] // path compression
        x = d.parent[x]
    }
    return x
}
func (d *DSU) Union(a, b int) bool {
    ra, rb := d.Find(a), d.Find(b)
    if ra == rb { return false } // đã cùng nhóm => chu trình
    if d.rank[ra] < d.rank[rb] { ra, rb = rb, ra }
    d.parent[rb] = ra
    if d.rank[ra] == d.rank[rb] { d.rank[ra]++ }
    d.count--
    return true
}
```

```cpp
#include <vector>
#include <numeric>
struct DSU {
    std::vector<int> parent, rank;
    int count;                              // số nhóm hiện tại
    DSU(int n) : parent(n), rank(n, 0), count(n) {
        std::iota(parent.begin(), parent.end(), 0);
    }
    int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];  // path compression
            x = parent[x];
        }
        return x;
    }
    bool unite(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;         // đã cùng nhóm => chu trình
        if (rank[ra] < rank[rb]) std::swap(ra, rb);
        parent[rb] = ra;
        if (rank[ra] == rank[rb]) rank[ra]++;
        count--;
        return true;
    }
};
```

> 💡 Ghi nhớ: `union(a, b)` trả về `false` ⟺ a và b **đã** cùng nhóm ⟺ cạnh (a,b) **tạo chu trình** (đồ thị vô hướng). Đây là cách phát hiện chu trình vô hướng nhanh và sạch nhất.

## 4. Dijkstra (shortest path có trọng số dương)

### 4.1. Trực giác

Dijkstra tìm đường **ngắn nhất từ một nguồn** tới mọi đỉnh, khi cạnh có **trọng số KHÔNG ÂM**. Ý tưởng: BFS "tham lam" có ưu tiên — luôn mở rộng đỉnh **gần nguồn nhất chưa chốt**, dùng **min-heap (priority queue)** theo khoảng cách. Khi một đỉnh được lấy ra khỏi heap lần đầu, khoảng cách của nó đã là tối ưu (chốt được).

Tại sao BFS thường không đủ? Vì BFS đếm **số cạnh**, không cộng **trọng số**. Đường ít cạnh chưa chắc nhẹ nhất. Heap giúp ta luôn "đi tiếp theo hướng rẻ nhất".

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Dijkstra lan theo trọng số bằng min-heap, chốt đỉnh gần nguồn nhất từng bước</title>
  <desc>Đồ thị 5 đỉnh A B C D E với trọng số dương, có hướng. Nguồn A. Cạnh A→B=2, A→C=5, B→C=1, B→D=7, C→E=3, E→D=1. Min-heap luôn lấy đỉnh gần nguồn nhất chưa chốt rồi relax các cạnh kề. Khoảng cách cuối: A=0, B=2, C=3, E=6, D=7. Lưu ý đường ít cạnh A→C=5 thua đường nhiều cạnh A→B→C=3.</desc>
  <text x="16" y="22" font-size="14" font-weight="700" fill="currentColor">Dijkstra: chốt đỉnh rẻ nhất, relax cạnh, lan theo trọng số</text>

  <defs>
    <marker id="dijArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>

  <g stroke="currentColor" stroke-width="1.5" opacity="0.55" fill="none" marker-end="url(#dijArrow)">
    <line x1="138" y1="108" x2="282" y2="92"/>
    <line x1="138" y1="132" x2="282" y2="228"/>
    <line x1="300" y1="102" x2="300" y2="218"/>
    <line x1="320" y1="92" x2="480" y2="108"/>
    <line x1="320" y1="252" x2="520" y2="268"/>
    <line x1="528" y1="260" x2="512" y2="142"/>
  </g>
  <g font-size="12" font-weight="700" fill="currentColor">
    <rect x="195" y="86" width="22" height="18" rx="5" fill="#f59e0b" fill-opacity="0.2"/>
    <text x="206" y="99" text-anchor="middle">2</text>
    <rect x="195" y="178" width="22" height="18" rx="5" fill="#f59e0b" fill-opacity="0.2"/>
    <text x="206" y="191" text-anchor="middle">5</text>
    <rect x="288" y="151" width="22" height="18" rx="5" fill="#f59e0b" fill-opacity="0.2"/>
    <text x="299" y="164" text-anchor="middle">1</text>
    <rect x="388" y="86" width="22" height="18" rx="5" fill="#f59e0b" fill-opacity="0.2"/>
    <text x="399" y="99" text-anchor="middle">7</text>
    <rect x="408" y="252" width="22" height="18" rx="5" fill="#f59e0b" fill-opacity="0.2"/>
    <text x="419" y="265" text-anchor="middle">3</text>
    <rect x="518" y="196" width="22" height="18" rx="5" fill="#f59e0b" fill-opacity="0.2"/>
    <text x="529" y="209" text-anchor="middle">1</text>
  </g>

  <g>
    <circle cx="120" cy="120" r="22" fill="#10b981" fill-opacity="0.9" stroke="currentColor"/>
    <text x="120" y="118" font-size="14" font-weight="700" text-anchor="middle" fill="#fff">A</text>
    <text x="120" y="132" font-size="10" text-anchor="middle" fill="#fff">d=0</text>
    <text x="120" y="160" font-size="9.5" text-anchor="middle" fill="#10b981" font-weight="700">nguồn</text>

    <circle cx="300" cy="80" r="22" fill="#10b981" fill-opacity="0.9" stroke="currentColor"/>
    <text x="300" y="78" font-size="14" font-weight="700" text-anchor="middle" fill="#fff">B</text>
    <text x="300" y="92" font-size="10" text-anchor="middle" fill="#fff">d=2</text>

    <circle cx="300" cy="240" r="22" fill="#10b981" fill-opacity="0.9" stroke="currentColor"/>
    <text x="300" y="238" font-size="14" font-weight="700" text-anchor="middle" fill="#fff">C</text>
    <text x="300" y="252" font-size="10" text-anchor="middle" fill="#fff">d=3</text>

    <circle cx="500" cy="120" r="22" fill="#10b981" fill-opacity="0.9" stroke="currentColor"/>
    <text x="500" y="118" font-size="14" font-weight="700" text-anchor="middle" fill="#fff">D</text>
    <text x="500" y="132" font-size="10" text-anchor="middle" fill="#fff">d=7</text>

    <circle cx="540" cy="280" r="22" fill="#10b981" fill-opacity="0.9" stroke="currentColor"/>
    <text x="540" y="278" font-size="14" font-weight="700" text-anchor="middle" fill="#fff">E</text>
    <text x="540" y="292" font-size="10" text-anchor="middle" fill="#fff">d=6</text>
  </g>

  <g font-size="11">
    <rect x="22" y="200" width="18" height="14" rx="4" fill="#10b981" fill-opacity="0.9"/>
    <text x="48" y="211" fill="currentColor">đã chốt (lấy khỏi heap, d tối ưu)</text>
    <rect x="22" y="222" width="18" height="14" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
    <text x="48" y="233" fill="currentColor">chưa chốt</text>
  </g>

  <rect x="16" y="304" width="688" height="62" rx="9" fill="#3b82f6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="32" y="326" font-size="11.5" font-weight="700" fill="currentColor">Thứ tự chốt theo min-heap:</text>
  <text x="230" y="326" font-size="11.5" font-weight="700" fill="#10b981">A(0) → B(2) → C(3) → E(6) → D(7)</text>
  <text x="32" y="350" font-size="11" fill="currentColor" opacity="0.85">Đường ít cạnh A→C = 5 THUA đường nhiều cạnh A→B→C = 3 → BFS đếm cạnh sẽ sai; heap cộng trọng số mới đúng.</text>
</svg>

### 4.2. Template Dijkstra (heap)

```text
Lazy Dijkstra (cho phép phần tử cũ nằm lại trong heap):
  dist[src] = 0, các đỉnh khác = vô cực
  heap = [(0, src)]
  lặp: lấy (d, u) nhỏ nhất từ heap
       nếu d > dist[u]: bỏ qua (đây là bản cũ, stale)
       với mỗi cạnh (u -> v, w): nếu d + w < dist[v]:
            dist[v] = d + w; đẩy (dist[v], v) vào heap
```

```python
import heapq
def dijkstra(n, graph, src):          # graph[u] = list (v, w), w >= 0
    dist = [float("inf")] * n
    dist[src] = 0
    heap = [(0, src)]                 # (khoảng cách, đỉnh)
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:               # bản cũ (stale) -> bỏ
            continue
        for v, w in graph[u]:
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd
                heapq.heappush(heap, (nd, v))
    return dist
```
```javascript
function dijkstra(n, graph, src) {     // graph[u] = [[v, w], ...], w >= 0
    const dist = new Array(n).fill(Infinity);
    dist[src] = 0;
    const heap = new MinHeap();        // min-heap theo phần tử [d, u]
    heap.push([0, src]);
    while (heap.size()) {
        const [d, u] = heap.pop();
        if (d > dist[u]) continue;     // bản cũ -> bỏ
        for (const [v, w] of graph[u]) {
            const nd = d + w;
            if (nd < dist[v]) { dist[v] = nd; heap.push([nd, v]); }
        }
    }
    return dist;
}
// (Thực chiến: JS không có heap sẵn — tự cài MinHeap so sánh theo phần tử [0])
```
```java
int[] dijkstra(int n, List<int[]>[] graph, int src) { // graph[u]: {v, w}, w>=0
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
    pq.add(new int[]{0, src});         // {khoảng cách, đỉnh}
    while (!pq.isEmpty()) {
        int[] top = pq.poll();
        int d = top[0], u = top[1];
        if (d > dist[u]) continue;     // bản cũ -> bỏ
        for (int[] e : graph[u]) {
            int v = e[0], w = e[1], nd = d + w;
            if (nd < dist[v]) { dist[v] = nd; pq.add(new int[]{nd, v}); }
        }
    }
    return dist;
}
```
```go
import "container/heap"
// item: [2]int{dist, node}; cài Len/Less/Swap/Push/Pop cho PQ (min theo [0])
func dijkstra(n int, graph [][][2]int, src int) []int { // graph[u]: {v, w}, w>=0
    const INF = int(1e18)
    dist := make([]int, n)
    for i := range dist { dist[i] = INF }
    dist[src] = 0
    pq := &PQ{{0, src}}               // {khoảng cách, đỉnh}
    heap.Init(pq)
    for pq.Len() > 0 {
        cur := heap.Pop(pq).([2]int)
        d, u := cur[0], cur[1]
        if d > dist[u] { continue }    // bản cũ -> bỏ
        for _, e := range graph[u] {
            v, w := e[0], e[1]
            if nd := d + w; nd < dist[v] {
                dist[v] = nd
                heap.Push(pq, [2]int{nd, v})
            }
        }
    }
    return dist
}
```

```cpp
#include <vector>
#include <queue>
#include <climits>
// graph[u] = vector<pair<v, w>>, w >= 0
std::vector<long long> dijkstra(int n, std::vector<std::vector<std::pair<int,int>>>& graph, int src) {
    const long long INF = LLONG_MAX;
    std::vector<long long> dist(n, INF);
    dist[src] = 0;
    // min-heap theo khoảng cách: {khoảng cách, đỉnh}
    using P = std::pair<long long, int>;
    std::priority_queue<P, std::vector<P>, std::greater<P>> pq;
    pq.push({0, src});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;     // bản cũ (stale) -> bỏ
        for (auto& [v, w] : graph[u]) {
            long long nd = d + w;
            if (nd < dist[v]) {
                dist[v] = nd;
                pq.push({nd, v});
            }
        }
    }
    return dist;
}
```

Độ phức tạp: **O((V + E) log V)** với binary heap. Không gian **O(V + E)**.

> ⚠️ Bẫy lớn: Dijkstra **SAI** khi có **cạnh trọng số ÂM**. Cần âm thì dùng **Bellman-Ford** (O(V·E)). Nếu mọi cạnh **trọng số bằng nhau** thì khỏi cần heap — BFS thường là đủ và nhanh hơn.

## 5. BẢNG DẠNG BÀI (problem patterns)

| Dạng bài | Dấu hiệu nhận biết | Hướng làm | Độ phức tạp | Bài kinh điển (LeetCode) |
| --- | --- | --- | --- | --- |
| **Connected components / flood fill** | Grid/đồ thị, đếm "đảo"/cụm, vùng liền nhau | BFS/DFS đánh dấu cụm, **hoặc** DSU đếm `count` | O(V+E) hoặc O(R·C) | Number of Islands; Max Area of Island |
| **Sao chép đồ thị** | "deep copy" node + neighbors | BFS/DFS + hash map `old → new` tránh lặp | O(V+E) | Clone Graph |
| **Đường ngắn nhất, KHÔNG trọng số** | "ít bước nhất", "ít cạnh nhất", mọi bước như nhau | BFS theo lớp, đếm số lớp | O(V+E) | Word Ladder; Rotting Oranges |
| **Đường ngắn nhất, trọng số dương** | Cạnh có chi phí/thời gian khác nhau, ≥ 0 | Dijkstra + min-heap | O((V+E) log V) | Network Delay Time; Path with Min Effort |
| **Thứ tự / dependency / scheduling** | "prerequisite", "build order", "làm gì trước" | Topo sort (Kahn hoặc DFS) | O(V+E) | Course Schedule I & II |
| **Phát hiện chu trình — CÓ hướng** | "có thể hoàn thành tất cả không?" | Topo: xếp < V đỉnh ⟹ có chu trình | O(V+E) | Course Schedule |
| **Phát hiện chu trình — VÔ hướng / gộp nhóm** | "thêm cạnh nào tạo chu trình", "tỉnh/nhóm" | DSU: `union` trả `false` ⟹ chu trình | O(E·α(n)) | Redundant Connection; Number of Provinces |
| **Bipartite / tô 2 màu** | "chia 2 nhóm", "ai thù ai" | BFS/DFS tô màu xen kẽ, mâu thuẫn ⟹ không | O(V+E) | Is Graph Bipartite; Possible Bipartition |

## 6. BÀI MẪU GIẢI CHI TIẾT

### 6.1. Course Schedule II — Topological Sort

**Hiểu đề.** `numCourses` khoá, mảng `prerequisites` với `[a, b]` nghĩa "muốn học `a` phải học `b` trước". Trả về **một thứ tự học hợp lệ**; nếu không thể (có chu trình) trả về mảng rỗng.

**Ý tưởng / vì sao.** `[a, b]` là cạnh **b → a** (b trước a). Bài hỏi "xếp thứ tự tôn trọng mọi phụ thuộc" = **topological sort**. Dùng **Kahn**: khoá nào in-degree 0 (không cần học gì trước) thì học được ngay; học xong giảm in-degree các khoá phụ thuộc nó. Nếu xếp đủ `numCourses` khoá → ra thứ tự; thiếu → có chu trình → rỗng.

```python
from collections import deque, defaultdict
def findOrder(numCourses, prerequisites):
    graph = defaultdict(list)
    indeg = [0] * numCourses
    for a, b in prerequisites:        # [a, b] => cạnh b -> a
        graph[b].append(a)
        indeg[a] += 1
    q = deque(c for c in range(numCourses) if indeg[c] == 0)
    order = []
    while q:
        c = q.popleft()
        order.append(c)
        for nxt in graph[c]:
            indeg[nxt] -= 1
            if indeg[nxt] == 0:
                q.append(nxt)
    return order if len(order) == numCourses else []
```
```javascript
function findOrder(numCourses, prerequisites) {
    const graph = Array.from({ length: numCourses }, () => []);
    const indeg = new Array(numCourses).fill(0);
    for (const [a, b] of prerequisites) { graph[b].push(a); indeg[a]++; }
    const q = [];
    for (let c = 0; c < numCourses; c++) if (indeg[c] === 0) q.push(c);
    const order = [];
    while (q.length) {
        const c = q.shift();
        order.push(c);
        for (const nxt of graph[c]) if (--indeg[nxt] === 0) q.push(nxt);
    }
    return order.length === numCourses ? order : [];
}
```
```java
int[] findOrder(int numCourses, int[][] prerequisites) {
    List<List<Integer>> graph = new ArrayList<>();
    for (int i = 0; i < numCourses; i++) graph.add(new ArrayList<>());
    int[] indeg = new int[numCourses];
    for (int[] p : prerequisites) { graph.get(p[1]).add(p[0]); indeg[p[0]]++; }
    Deque<Integer> q = new ArrayDeque<>();
    for (int c = 0; c < numCourses; c++) if (indeg[c] == 0) q.add(c);
    int[] order = new int[numCourses]; int idx = 0;
    while (!q.isEmpty()) {
        int c = q.poll();
        order[idx++] = c;
        for (int nxt : graph.get(c)) if (--indeg[nxt] == 0) q.add(nxt);
    }
    return idx == numCourses ? order : new int[0];
}
```
```go
func findOrder(numCourses int, prerequisites [][]int) []int {
    graph := make([][]int, numCourses)
    indeg := make([]int, numCourses)
    for _, p := range prerequisites {
        graph[p[1]] = append(graph[p[1]], p[0])
        indeg[p[0]]++
    }
    q := []int{}
    for c := 0; c < numCourses; c++ {
        if indeg[c] == 0 { q = append(q, c) }
    }
    order := []int{}
    for len(q) > 0 {
        c := q[0]; q = q[1:]
        order = append(order, c)
        for _, nxt := range graph[c] {
            indeg[nxt]--
            if indeg[nxt] == 0 { q = append(q, nxt) }
        }
    }
    if len(order) == numCourses {
        return order
    }
    return []int{}
}
```

```cpp
#include <vector>
#include <queue>
std::vector<int> findOrder(int numCourses, std::vector<std::vector<int>>& prerequisites) {
    std::vector<std::vector<int>> graph(numCourses);
    std::vector<int> indeg(numCourses, 0);
    for (auto& p : prerequisites) {     // [a, b] => cạnh b -> a
        graph[p[1]].push_back(p[0]);
        indeg[p[0]]++;
    }
    std::queue<int> q;
    for (int c = 0; c < numCourses; c++) if (indeg[c] == 0) q.push(c);
    std::vector<int> order;
    while (!q.empty()) {
        int c = q.front(); q.pop();
        order.push_back(c);
        for (int nxt : graph[c]) if (--indeg[nxt] == 0) q.push(nxt);
    }
    return (int)order.size() == numCourses ? order : std::vector<int>{};
}
```

**Độ phức tạp.** Thời gian **O(V + E)** (V = numCourses, E = số prerequisites), bộ nhớ **O(V + E)**.

**Bẫy.** (1) Xác định **chiều cạnh** cho đúng: `[a, b]` là **b → a**, dễ vẽ ngược. (2) Đừng quên trường hợp khoá không có ràng buộc — chúng vào queue ngay từ đầu. (3) Course Schedule **I** chỉ hỏi có/không (so `len(order) == numCourses`); bản **II** cần trả cả thứ tự.

### 6.2. Redundant Connection — Union-Find

**Hiểu đề.** Một cây có `n` đỉnh ban đầu (n-1 cạnh, không chu trình) bị thêm **đúng một cạnh thừa** → thành đồ thị vô hướng có **đúng một chu trình**. Tìm cạnh thừa đó; nếu nhiều đáp án, trả cạnh **xuất hiện sau cùng** trong input.

**Ý tưởng / vì sao.** Thêm cạnh `(u, v)`: nếu u và v **đã cùng nhóm** thì nối thêm sẽ **tạo chu trình** → đây chính là cạnh thừa. DSU `union(u, v)` trả `false` đúng lúc đó. Vì duyệt cạnh theo thứ tự input và trả cạnh đầu tiên gây chu trình, ta tự động lấy được cạnh xuất hiện sau (cạnh khép vòng).

```python
def findRedundantConnection(edges):
    n = len(edges)
    parent = list(range(n + 1))       # đỉnh đánh số 1..n
    rank = [0] * (n + 1)
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    def union(a, b):
        ra, rb = find(a), find(b)
        if ra == rb:
            return False              # đã cùng nhóm => cạnh thừa
        if rank[ra] < rank[rb]:
            ra, rb = rb, ra
        parent[rb] = ra
        if rank[ra] == rank[rb]:
            rank[ra] += 1
        return True
    for u, v in edges:
        if not union(u, v):
            return [u, v]
    return []
```
```javascript
function findRedundantConnection(edges) {
    const n = edges.length;
    const parent = Array.from({ length: n + 1 }, (_, i) => i);
    const rank = new Array(n + 1).fill(0);
    const find = (x) => {
        while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    };
    const union = (a, b) => {
        let ra = find(a), rb = find(b);
        if (ra === rb) return false;          // đã cùng nhóm => cạnh thừa
        if (rank[ra] < rank[rb]) [ra, rb] = [rb, ra];
        parent[rb] = ra;
        if (rank[ra] === rank[rb]) rank[ra]++;
        return true;
    };
    for (const [u, v] of edges) if (!union(u, v)) return [u, v];
    return [];
}
```
```java
int[] findRedundantConnection(int[][] edges) {
    int n = edges.length;
    int[] parent = new int[n + 1], rank = new int[n + 1];
    for (int i = 0; i <= n; i++) parent[i] = i;
    for (int[] e : edges) {
        int ra = find(parent, e[0]), rb = find(parent, e[1]);
        if (ra == rb) return e;               // đã cùng nhóm => cạnh thừa
        if (rank[ra] < rank[rb]) { int t = ra; ra = rb; rb = t; }
        parent[rb] = ra;
        if (rank[ra] == rank[rb]) rank[ra]++;
    }
    return new int[0];
}
int find(int[] parent, int x) {
    while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
}
```
```go
func findRedundantConnection(edges [][]int) []int {
    n := len(edges)
    parent := make([]int, n+1)
    rank := make([]int, n+1)
    for i := range parent { parent[i] = i }
    var find func(int) int
    find = func(x int) int {
        for parent[x] != x {
            parent[x] = parent[parent[x]]
            x = parent[x]
        }
        return x
    }
    for _, e := range edges {
        ra, rb := find(e[0]), find(e[1])
        if ra == rb {
            return e // đã cùng nhóm => cạnh thừa
        }
        if rank[ra] < rank[rb] { ra, rb = rb, ra }
        parent[rb] = ra
        if rank[ra] == rank[rb] { rank[ra]++ }
    }
    return []int{}
}
```

```cpp
#include <vector>
#include <numeric>
std::vector<int> findRedundantConnection(std::vector<std::vector<int>>& edges) {
    int n = edges.size();
    std::vector<int> parent(n + 1), rank(n + 1, 0); // đỉnh đánh số 1..n
    std::iota(parent.begin(), parent.end(), 0);
    std::function<int(int)> find = [&](int x) {
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    };
    for (auto& e : edges) {
        int ra = find(e[0]), rb = find(e[1]);
        if (ra == rb) return e;             // đã cùng nhóm => cạnh thừa
        if (rank[ra] < rank[rb]) std::swap(ra, rb);
        parent[rb] = ra;
        if (rank[ra] == rank[rb]) rank[ra]++;
    }
    return {};
}
```

**Độ phức tạp.** Thời gian **O(n · α(n)) ≈ O(n)**, bộ nhớ **O(n)**.

**Bẫy.** (1) Đỉnh đánh số **từ 1**, nên cấp `parent` cỡ `n+1`. (2) Đây là đồ thị **vô hướng** — DSU mới đúng; nếu đề là **có hướng** (Redundant Connection II) phải xử lý thêm trường hợp một đỉnh có 2 cha. (3) Trả **đúng định dạng** `[u, v]` như trong input.

### 6.3. Network Delay Time — Dijkstra

**Hiểu đề.** `times[i] = [u, v, w]`: tín hiệu từ `u` tới `v` mất `w` thời gian. Phát tín hiệu từ đỉnh `k`, hỏi **thời gian để TẤT CẢ n đỉnh nhận được** (đỉnh xa nhất). Không tới được hết → trả `-1`.

**Ý tưởng / vì sao.** "Tất cả đỉnh nhận được" = thời điểm muộn nhất trong các đường ngắn nhất từ `k` = **max của dist[]** sau Dijkstra. Cạnh có trọng số dương → Dijkstra chuẩn. Sau khi tính `dist`, nếu còn đỉnh `= ∞` thì không reachable → `-1`; ngược lại trả `max(dist)`.

```python
import heapq
from collections import defaultdict
def networkDelayTime(times, n, k):
    graph = defaultdict(list)
    for u, v, w in times:
        graph[u].append((v, w))
    dist = {}
    heap = [(0, k)]                   # (thời gian, đỉnh)
    while heap:
        d, u = heapq.heappop(heap)
        if u in dist:                 # đã chốt -> bỏ
            continue
        dist[u] = d
        for v, w in graph[u]:
            if v not in dist:
                heapq.heappush(heap, (d + w, v))
    return max(dist.values()) if len(dist) == n else -1
```
```javascript
function networkDelayTime(times, n, k) {
    const graph = new Map();
    for (const [u, v, w] of times) {
        if (!graph.has(u)) graph.set(u, []);
        graph.get(u).push([v, w]);
    }
    const dist = new Map();
    const heap = new MinHeap();        // min-heap theo [d, u]
    heap.push([0, k]);
    while (heap.size()) {
        const [d, u] = heap.pop();
        if (dist.has(u)) continue;     // đã chốt -> bỏ
        dist.set(u, d);
        for (const [v, w] of graph.get(u) || [])
            if (!dist.has(v)) heap.push([d + w, v]);
    }
    if (dist.size !== n) return -1;
    return Math.max(...dist.values());
}
```
```java
int networkDelayTime(int[][] times, int n, int k) {
    Map<Integer, List<int[]>> graph = new HashMap<>();
    for (int[] t : times)
        graph.computeIfAbsent(t[0], x -> new ArrayList<>()).add(new int[]{t[1], t[2]});
    int[] dist = new int[n + 1];
    Arrays.fill(dist, Integer.MAX_VALUE);
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
    pq.add(new int[]{0, k}); dist[k] = 0;
    int seen = 0, ans = 0;
    while (!pq.isEmpty()) {
        int[] top = pq.poll();
        int d = top[0], u = top[1];
        if (d > dist[u]) continue;     // bản cũ -> bỏ
        seen++; ans = Math.max(ans, d);
        for (int[] e : graph.getOrDefault(u, List.of())) {
            int nd = d + e[1];
            if (nd < dist[e[0]]) { dist[e[0]] = nd; pq.add(new int[]{nd, e[0]}); }
        }
    }
    return seen == n ? ans : -1;
}
```
```go
import "container/heap"
func networkDelayTime(times [][]int, n int, k int) int {
    graph := map[int][][2]int{}
    for _, t := range times {
        graph[t[0]] = append(graph[t[0]], [2]int{t[1], t[2]})
    }
    const INF = int(1e18)
    dist := make([]int, n+1)
    for i := range dist { dist[i] = INF }
    dist[k] = 0
    pq := &PQ{{0, k}}                  // {thời gian, đỉnh}
    heap.Init(pq)
    for pq.Len() > 0 {
        cur := heap.Pop(pq).([2]int)
        d, u := cur[0], cur[1]
        if d > dist[u] { continue }    // bản cũ -> bỏ
        for _, e := range graph[u] {
            if nd := d + e[1]; nd < dist[e[0]] {
                dist[e[0]] = nd
                heap.Push(pq, [2]int{nd, e[0]})
            }
        }
    }
    ans := 0
    for i := 1; i <= n; i++ {
        if dist[i] == INF { return -1 }
        if dist[i] > ans { ans = dist[i] }
    }
    return ans
}
```

```cpp
#include <vector>
#include <queue>
#include <unordered_map>
#include <climits>
int networkDelayTime(std::vector<std::vector<int>>& times, int n, int k) {
    std::unordered_map<int, std::vector<std::pair<int,int>>> graph;
    for (auto& t : times) graph[t[0]].push_back({t[1], t[2]});
    const int INF = INT_MAX;
    std::vector<int> dist(n + 1, INF);  // đỉnh đánh số 1..n
    dist[k] = 0;
    using P = std::pair<int,int>;       // {thời gian, đỉnh}
    std::priority_queue<P, std::vector<P>, std::greater<P>> pq;
    pq.push({0, k});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;      // bản cũ -> bỏ
        for (auto& [v, w] : graph[u]) {
            int nd = d + w;
            if (nd < dist[v]) { dist[v] = nd; pq.push({nd, v}); }
        }
    }
    int ans = 0;
    for (int i = 1; i <= n; i++) {
        if (dist[i] == INF) return -1;
        ans = std::max(ans, dist[i]);
    }
    return ans;
}
```

**Độ phức tạp.** Thời gian **O((V + E) log V)**, bộ nhớ **O(V + E)**.

**Bẫy.** (1) Đỉnh đánh số **1..n** — cấp mảng `n+1` và kiểm tra reachable kỹ. (2) Đáp án là **max** của các khoảng cách, không phải tổng. (3) Bản "lazy" cho phép phần tử cũ trong heap; **luôn so `d > dist[u]` để bỏ bản cũ**, nếu không sẽ cập nhật sai/chậm.

## 7. Sai lầm thường gặp & cách tránh

> ⚠️ **Quên `visited` hoặc đánh dấu sai thời điểm (BFS).** Đánh dấu khi *đưa vào* queue, không phải khi *lấy ra*. Sai chỗ này → node bị thêm trùng, sai khoảng cách, có khi loop vô hạn.

> ⚠️ **Dùng Dijkstra cho cạnh ÂM.** Dijkstra giả định "đã lấy ra là tối ưu" — cạnh âm phá vỡ giả định này. Có cạnh âm → **Bellman-Ford**. Mọi cạnh bằng nhau → **BFS**.

> ⚠️ **Nhầm chiều cạnh trong topo sort.** `[a, b]` thường nghĩa "a cần b trước" ⟹ cạnh **b → a**, và in-degree của **a** tăng. Đọc kỹ đề, vẽ thử 2-3 đỉnh trước khi code.

> ⚠️ **Dùng DSU phát hiện chu trình cho đồ thị CÓ hướng.** DSU chỉ đúng với **vô hướng**. Chu trình có hướng phải dùng **topo sort** hoặc **DFS 3 màu (white/gray/black)**.

> ⚠️ **Quên path compression / union by rank.** Thiếu cả hai, DSU có thể tụt về O(n) mỗi thao tác → cây suy biến thành danh sách. Luôn cài cả hai để đạt ~O(α(n)).

> ⚠️ **Không xử lý đồ thị nhiều thành phần.** Đếm components / topo cho cả đồ thị: phải **lặp qua mọi đỉnh** làm điểm xuất phát, không chỉ từ một node.

> ⚠️ **shift() trong JS làm BFS chậm.** `Array.shift()` là O(n). Với input lớn, dùng con trỏ `head` (`q[head++]`) hoặc deque thật để giữ BFS ở O(V+E).

> ⚠️ **JS/Go không có heap sẵn.** Phỏng vấn JS/Go cho Dijkstra: chuẩn bị sẵn lớp `MinHeap` (JS) hoặc `container/heap` (Go) — đừng để loay hoay cài heap giữa giờ.

## 8. Checklist tự luyện

Luyện theo **pattern**, không theo số bài. Mỗi bài tự hỏi "dạng gì?" trước khi code:

- [ ] **Number of Islands** — flood fill (BFS/DFS hoặc DSU đếm cụm).
- [ ] **Clone Graph** — BFS/DFS + hash map `old → new` tránh thăm lặp.
- [ ] **Course Schedule** — topo sort, phát hiện chu trình có hướng (có/không).
- [ ] **Course Schedule II** — topo sort trả về thứ tự (đã giải mẫu).
- [ ] **Redundant Connection** — DSU, chu trình vô hướng (đã giải mẫu).
- [ ] **Number of Provinces** — DSU hoặc DFS đếm thành phần liên thông.
- [ ] **Network Delay Time** — Dijkstra, max(dist) (đã giải mẫu).
- [ ] **Path with Minimum Effort** — Dijkstra biến thể (minimize max-edge).
- [ ] **Cheapest Flights Within K Stops** — BFS theo lớp / Bellman-Ford giới hạn bước.
- [ ] **Word Ladder** — BFS trên không gian trạng thái, đếm số lớp.
- [ ] **Rotting Oranges** — multi-source BFS (nhiều nguồn cùng lúc).
- [ ] **Is Graph Bipartite?** — BFS/DFS tô 2 màu, kiểm tra mâu thuẫn.
- [ ] **Graph Valid Tree** — DSU: đúng n-1 cạnh **và** không chu trình **và** liên thông.

> 💡 Ghi nhớ cuối bài: Đừng thuộc lời giải — thuộc **5 template**: adjacency list, BFS/DFS + visited, Kahn (in-degree), DSU (find/union + path compression), Dijkstra (heap + bỏ bản cũ). Mọi bài graph phỏng vấn chỉ là biến thể của năm bộ xương này. Xem lại nền tảng tại [[dsa-07-recursion-graph-dp]] và bước tiếp sang [[dsa-11-dynamic-programming-1]].
