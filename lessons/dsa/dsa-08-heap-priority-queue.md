# Heap & Priority Queue

Bạn đã có array/hash/tree/sort trong tay. Bài này dạy một cấu trúc dữ liệu mà rất nhiều bài "lạ" trong phỏng vấn big-tech quy về: **heap** (đống) và người anh em ứng dụng của nó — **priority queue** (hàng đợi ưu tiên). Điểm mạnh của heap không phải là "sắp xếp toàn bộ" mà là **luôn lấy ra phần tử nhỏ nhất hoặc lớn nhất trong O(log n)**, kể cả khi dữ liệu liên tục thay đổi. Đó chính là thứ phân biệt một ứng viên giải được "Top-K trên dữ liệu streaming" với một ứng viên chỉ biết `sort()`.

Mục tiêu bài này rất thực dụng: giúp bạn **nhận diện** một bài là bài heap chỉ qua vài dấu hiệu trong đề, **thuộc lòng template** push/pop/heapify cho cả 4 ngôn ngữ, và quan trọng nhất — biết **khi nào heap thắng sort, khi nào quickselect thắng heap**. Đây là nhóm câu hỏi xuất hiện dày đặc ở Google, Meta, Amazon, ByteDance.

## 1. Trực giác & khi nào dùng

### 1.1. Heap là gì?

**Heap** là một cây nhị phân *gần đầy đủ* (complete binary tree) thoả **heap property**:

- **Min-heap**: mỗi node ≤ các con của nó → **gốc là phần tử nhỏ nhất**.
- **Max-heap**: mỗi node ≥ các con của nó → **gốc là phần tử lớn nhất**.

Điểm tinh tế: heap **không** sắp xếp toàn bộ. Anh em ruột (sibling) không có thứ tự gì với nhau. Heap chỉ đảm bảo *một* việc duy nhất — **phần tử cực trị (min hoặc max) luôn nằm ở gốc**, lấy ra trong O(1) và cập nhật lại trong O(log n). Đây là "sự lười biếng có chủ đích": ta chỉ sắp đủ để biết cái cực trị, không tốn công sắp phần còn lại.

Vì là complete binary tree, heap được lưu **phẳng trong một mảng**, không cần con trỏ:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 410" role="img" aria-labelledby="ds8-map-t ds8-map-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="ds8-map-t">Heap [1,3,2,7,4,5]: cây và mảng</title>
<desc id="ds8-map-d">Heap [1,3,2,7,4,5]: cây và mảng. Các vị trí trong cấu trúc cố định; các bước lần lượt làm nổi phần đang xử lý.</desc>
<defs><marker id="ds8-map-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260.0" y="25" font-size="15" text-anchor="middle" fill="currentColor">Heap [1,3,2,7,4,5]: cây và mảng</text>
<path d="M200 65 L110 135" stroke="currentColor" stroke-opacity="0.3"/><path d="M200 65 L330 135" stroke="currentColor" stroke-opacity="0.3"/><path d="M110 135 L60 205" stroke="currentColor" stroke-opacity="0.3"/><path d="M110 135 L160 205" stroke="currentColor" stroke-opacity="0.3"/><path d="M330 135 L280 205" stroke="currentColor" stroke-opacity="0.3"/><circle cx="200" cy="65" r="21" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="200" y="70" font-size="14" text-anchor="middle" fill="currentColor">1</text><text x="228" y="50" font-size="13" text-anchor="middle" fill="currentColor">i=0</text><rect x="75" y="270" width="52" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="101.0" y="294" font-size="14" text-anchor="middle" fill="currentColor">1</text><text x="101" y="330" font-size="13" text-anchor="middle" fill="currentColor">0</text><circle cx="110" cy="135" r="21" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="110" y="140" font-size="14" text-anchor="middle" fill="currentColor">3</text><text x="138" y="120" font-size="13" text-anchor="middle" fill="currentColor">i=1</text><rect x="135" y="270" width="52" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="161.0" y="294" font-size="14" text-anchor="middle" fill="currentColor">3</text><text x="161" y="330" font-size="13" text-anchor="middle" fill="currentColor">1</text><circle cx="330" cy="135" r="21" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="330" y="140" font-size="14" text-anchor="middle" fill="currentColor">2</text><text x="358" y="120" font-size="13" text-anchor="middle" fill="currentColor">i=2</text><rect x="195" y="270" width="52" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="221.0" y="294" font-size="14" text-anchor="middle" fill="currentColor">2</text><text x="221" y="330" font-size="13" text-anchor="middle" fill="currentColor">2</text><circle cx="60" cy="205" r="21" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="60" y="210" font-size="14" text-anchor="middle" fill="currentColor">7</text><text x="88" y="190" font-size="13" text-anchor="middle" fill="currentColor">i=3</text><rect x="255" y="270" width="52" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="281.0" y="294" font-size="14" text-anchor="middle" fill="currentColor">7</text><text x="281" y="330" font-size="13" text-anchor="middle" fill="currentColor">3</text><circle cx="160" cy="205" r="21" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="160" y="210" font-size="14" text-anchor="middle" fill="currentColor">4</text><text x="188" y="190" font-size="13" text-anchor="middle" fill="currentColor">i=4</text><rect x="315" y="270" width="52" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="341.0" y="294" font-size="14" text-anchor="middle" fill="currentColor">4</text><text x="341" y="330" font-size="13" text-anchor="middle" fill="currentColor">4</text><circle cx="280" cy="205" r="21" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="280" y="210" font-size="14" text-anchor="middle" fill="currentColor">5</text><text x="308" y="190" font-size="13" text-anchor="middle" fill="currentColor">i=5</text><rect x="375" y="270" width="52" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="401.0" y="294" font-size="14" text-anchor="middle" fill="currentColor">5</text><text x="401" y="330" font-size="13" text-anchor="middle" fill="currentColor">5</text><text x="260" y="365" font-size="13" text-anchor="middle" fill="currentColor">trái = 2i+1; phải = 2i+2; cha = (i−1)//2</text><text x="260" y="390" font-size="13" text-anchor="middle" fill="currentColor">i=0 là gốc; anh em không cần có thứ tự</text>
</svg>


### 1.2. Khi nào nên nghĩ tới heap? (dấu hiệu nhận diện)

Khi đọc đề, hãy bật "radar heap" nếu thấy bất kỳ tín hiệu nào sau:

| Dấu hiệu trong đề | Vì sao là heap |
| --- | --- |
| "k phần tử lớn nhất / nhỏ nhất" | Giữ heap kích thước k thay vì sort toàn bộ |
| "k phần tử frequent / phổ biến nhất" | Đếm tần suất rồi lấy top-k bằng heap |
| "**luôn** lấy ra min/max trong khi dữ liệu **thay đổi liên tục**" | sort không kham nổi vì mỗi lần đổi phải sort lại |
| "merge nhiều danh sách/luồng đã sắp xếp" | Heap chứa "đầu" mỗi luồng, luôn lấy min |
| "median của dòng dữ liệu (data stream)" | Hai heap cân bằng |
| "khoảng cách / chi phí nhỏ nhất tiếp theo" (Dijkstra, Prim) | Priority queue chọn cạnh rẻ nhất |
| "lập lịch theo độ ưu tiên / thời gian gần nhất" | Priority queue |

> Ghi nhớ: Cụm từ **"k lớn nhất/nhỏ nhất"**, **"k frequent"**, và **"luôn lấy min/max khi dữ liệu đang đổi"** là ba lá cờ đỏ kinh điển báo hiệu heap. Thấy chúng, đừng sort vội — hỏi xem heap có rẻ hơn không.

### 1.3. Priority queue — heap mang áo ADT

**Priority queue (PQ)** là một *abstract data type*: hàng đợi mà phần tử lấy ra không theo thứ tự vào (FIFO) mà theo **độ ưu tiên** (priority). Heap chính là cách hiện thực PQ hiệu quả nhất. Trong thực hành, ta hay coi hai từ này là một: "đẩy phần tử kèm priority vào, lấy ra phần tử ưu tiên nhất".

## 2. Template/khung code chuẩn

Bốn ngôn ngữ đều có heap min sẵn dùng. **Mẹo max-heap quan trọng**: ngôn ngữ chỉ cho min-heap (Python, Go) thì **phủ định giá trị** (`-x`) hoặc đảo comparator để biến min thành max.

```python
import heapq

# --- MIN-HEAP (mặc định của Python) ---
heap = []
heapq.heappush(heap, 5)        # push: O(log n)
heapq.heappush(heap, 1)
heapq.heappush(heap, 3)
smallest = heap[0]             # peek min: O(1)
x = heapq.heappop(heap)        # pop min: O(log n) -> 1

# Heapify cả mảng tại chỗ: O(n), nhanh hơn push từng cái O(n log n)
arr = [5, 1, 3, 8, 2]
heapq.heapify(arr)             # O(n)

# --- MAX-HEAP: phủ định giá trị khi push, phủ định lại khi pop ---
maxh = []
for v in [5, 1, 3]:
    heapq.heappush(maxh, -v)
largest = -maxh[0]            # = 5
top = -heapq.heappop(maxh)    # = 5

# Đẩy tuple để có priority + payload; so sánh theo phần tử đầu
pq = []
heapq.heappush(pq, (priority, item))   # ví dụ (dist, node)
```
```javascript
// JS KHÔNG có heap built-in -> tự cài binary heap (min-heap).
class MinHeap {
  constructor() { this.a = []; }
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {                                  // O(log n)
    this.a.push(x);
    let i = this.a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.a[p] <= this.a[i]) break;
      [this.a[p], this.a[i]] = [this.a[i], this.a[p]];
      i = p;
    }
  }
  pop() {                                     // O(log n)
    const top = this.a[0], last = this.a.pop();
    if (this.a.length) {
      this.a[0] = last;
      let i = 0, n = this.a.length;
      while (true) {
        let l = 2*i+1, r = 2*i+2, s = i;
        if (l < n && this.a[l] < this.a[s]) s = l;
        if (r < n && this.a[r] < this.a[s]) s = r;
        if (s === i) break;
        [this.a[s], this.a[i]] = [this.a[i], this.a[s]];
        i = s;
      }
    }
    return top;
  }
}
// Max-heap: push -x, đọc -pop(); hoặc đổi dấu so sánh "<" thành ">".
```
```java
import java.util.*;

// Min-heap sẵn có:
PriorityQueue<Integer> minHeap = new PriorityQueue<>();
minHeap.offer(5); minHeap.offer(1); minHeap.offer(3);  // push O(log n)
int top = minHeap.peek();        // O(1) -> 1
int x = minHeap.poll();          // pop O(log n) -> 1

// Max-heap: truyền comparator đảo chiều
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Collections.reverseOrder());

// Heapify O(n): nạp cả collection qua constructor
PriorityQueue<Integer> h = new PriorityQueue<>(Arrays.asList(5,1,3,8,2));

// Priority + payload: dùng comparator trên trường priority
PriorityQueue<int[]> pq =
    new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));  // sắp theo a[0]=dist
```
```go
import "container/heap"

// Phải tự implement interface heap.Interface (5 method).
type MinHeap []int
func (h MinHeap) Len() int            { return len(h) }
func (h MinHeap) Less(i, j int) bool  { return h[i] < h[j] } // ">" => max-heap
func (h MinHeap) Swap(i, j int)       { h[i], h[j] = h[j], h[i] }
func (h *MinHeap) Push(x any)         { *h = append(*h, x.(int)) }
func (h *MinHeap) Pop() any {
    old := *h; n := len(old); x := old[n-1]; *h = old[:n-1]; return x
}

// Dùng:
h := &MinHeap{5, 1, 3, 8, 2}
heap.Init(h)                 // heapify O(n)
heap.Push(h, 4)              // push O(log n)
top := (*h)[0]              // peek O(1)
x := heap.Pop(h).(int)     // pop O(log n)
```

```cpp
#include <queue>
#include <vector>
using namespace std;

// Min-heap sẵn có: priority_queue mặc định là MAX-heap, nên truyền greater<>.
priority_queue<int, vector<int>, greater<int>> minHeap;
minHeap.push(5); minHeap.push(1); minHeap.push(3);  // push O(log n)
int top = minHeap.top();        // peek O(1) -> 1
minHeap.pop();                  // pop O(log n), pop() không trả giá trị

// Max-heap: mặc định ">" => gốc là lớn nhất
priority_queue<int> maxHeap;

// Heapify O(n): nạp cả vector qua constructor
vector<int> data = {5, 1, 3, 8, 2};
priority_queue<int, vector<int>, greater<int>> h(data.begin(), data.end());

// Priority + payload: dùng comparator trên trường priority (sắp theo .first=dist)
priority_queue<pair<int,int>, vector<pair<int,int>>, greater<pair<int,int>>> pq;
```

> Bẫy: `heapify` (xây heap từ mảng có sẵn) là **O(n)**, *không* phải O(n log n). Còn push từng phần tử một là O(n log n). Nếu đã có sẵn cả mảng, luôn dùng `heapify`/`heap.Init`/constructor — đừng push vòng lặp.

### 2.1. Vì sao push/pop là O(log n) và heapify là O(n)?

<auto-anim data-dur="8">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 315" role="img" aria-labelledby="ds8-push-t ds8-push-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="ds8-push-t">Push 2: thêm cuối rồi sift up</title>
<desc id="ds8-push-d">Push 2: thêm cuối rồi sift up. Các vị trí trong cấu trúc cố định; các bước lần lượt làm nổi phần đang xử lý.</desc>
<defs><marker id="ds8-push-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260.0" y="25" font-size="15" text-anchor="middle" fill="currentColor">Push 2: thêm cuối rồi sift up</text>
<path d="M260 95 L150 125" stroke="currentColor" stroke-opacity="0.3"/><path d="M260 95 L370 125" stroke="currentColor" stroke-opacity="0.3"/><path d="M150 165 L95 195" stroke="currentColor" stroke-opacity="0.3"/><path d="M150 165 L205 195" stroke="currentColor" stroke-opacity="0.3"/><circle cx="260" cy="75" r="23" fill="none" stroke="currentColor" stroke-opacity="0.3"/><text x="293" y="60" font-size="13" text-anchor="middle" fill="currentColor">0</text><circle cx="150" cy="145" r="23" fill="none" stroke="currentColor" stroke-opacity="0.3"/><text x="183" y="130" font-size="13" text-anchor="middle" fill="currentColor">1</text><circle cx="370" cy="145" r="23" fill="none" stroke="currentColor" stroke-opacity="0.3"/><text x="403" y="130" font-size="13" text-anchor="middle" fill="currentColor">2</text><circle cx="95" cy="215" r="23" fill="none" stroke="currentColor" stroke-opacity="0.3"/><text x="128" y="200" font-size="13" text-anchor="middle" fill="currentColor">3</text><circle cx="205" cy="215" r="23" fill="none" stroke="currentColor" stroke-opacity="0.3"/><text x="238" y="200" font-size="13" text-anchor="middle" fill="currentColor">4</text>
<g opacity="1"><animate attributeName="opacity" dur="8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.25;0.5;0.75;1.0" values="1;0;0;0;1"/><text x="260" y="80" font-size="17" text-anchor="middle" fill="currentColor">5</text><text x="150" y="150" font-size="17" text-anchor="middle" fill="currentColor">8</text><text x="370" y="150" font-size="17" text-anchor="middle" fill="currentColor">9</text><text x="95" y="220" font-size="17" text-anchor="middle" fill="currentColor">10</text><text x="260" y="273" font-size="13" text-anchor="middle" fill="currentColor">Heap ban đầu: [5,8,9,10]</text></g>
<g opacity="0"><animate attributeName="opacity" dur="8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.25;0.5;0.75;1.0" values="0;1;0;0;0"/><text x="260" y="80" font-size="17" text-anchor="middle" fill="currentColor">5</text><text x="150" y="150" font-size="17" text-anchor="middle" fill="currentColor">8</text><text x="370" y="150" font-size="17" text-anchor="middle" fill="currentColor">9</text><text x="95" y="220" font-size="17" text-anchor="middle" fill="currentColor">10</text><text x="205" y="220" font-size="17" text-anchor="middle" fill="currentColor">2</text><text x="260" y="273" font-size="13" text-anchor="middle" fill="currentColor">Thêm 2 ở index 4: 2 &lt; cha 8</text></g>
<g opacity="0"><animate attributeName="opacity" dur="8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.25;0.5;0.75;1.0" values="0;0;1;0;0"/><text x="260" y="80" font-size="17" text-anchor="middle" fill="currentColor">5</text><text x="150" y="150" font-size="17" text-anchor="middle" fill="currentColor">2</text><text x="370" y="150" font-size="17" text-anchor="middle" fill="currentColor">9</text><text x="95" y="220" font-size="17" text-anchor="middle" fill="currentColor">10</text><text x="205" y="220" font-size="17" text-anchor="middle" fill="currentColor">8</text><text x="260" y="273" font-size="13" text-anchor="middle" fill="currentColor">Đổi 2 với 8; tiếp tục vì 2 &lt; 5</text></g>
<g opacity="0"><animate attributeName="opacity" dur="8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.25;0.5;0.75;1.0" values="0;0;0;1;0"/><text x="260" y="80" font-size="17" text-anchor="middle" fill="currentColor">2</text><text x="150" y="150" font-size="17" text-anchor="middle" fill="currentColor">5</text><text x="370" y="150" font-size="17" text-anchor="middle" fill="currentColor">9</text><text x="95" y="220" font-size="17" text-anchor="middle" fill="currentColor">10</text><text x="205" y="220" font-size="17" text-anchor="middle" fill="currentColor">8</text><text x="260" y="273" font-size="13" text-anchor="middle" fill="currentColor">Đổi 2 với 5; đã tới gốc, O(log n)</text></g>
<path d="M30 297 H490" stroke="currentColor" stroke-opacity="0.3"/><circle cx="30" cy="297" r="4" fill="currentColor"><animate attributeName="cx" dur="8s" repeatCount="indefinite" values="30;490"/></circle>
</svg>
</auto-anim>

<auto-anim data-dur="8">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 315" role="img" aria-labelledby="ds8-pop-t ds8-pop-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="ds8-pop-t">Pop min: đưa cuối lên rồi sift down</title>
<desc id="ds8-pop-d">Pop min: đưa cuối lên rồi sift down. Các vị trí trong cấu trúc cố định; các bước lần lượt làm nổi phần đang xử lý.</desc>
<defs><marker id="ds8-pop-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260.0" y="25" font-size="15" text-anchor="middle" fill="currentColor">Pop min: đưa cuối lên rồi sift down</text>
<path d="M260 95 L150 125" stroke="currentColor" stroke-opacity="0.3"/><path d="M260 95 L370 125" stroke="currentColor" stroke-opacity="0.3"/><path d="M150 165 L95 195" stroke="currentColor" stroke-opacity="0.3"/><path d="M150 165 L205 195" stroke="currentColor" stroke-opacity="0.3"/><path d="M370 165 L315 195" stroke="currentColor" stroke-opacity="0.3"/><circle cx="260" cy="75" r="23" fill="none" stroke="currentColor" stroke-opacity="0.3"/><text x="293" y="60" font-size="13" text-anchor="middle" fill="currentColor">0</text><circle cx="150" cy="145" r="23" fill="none" stroke="currentColor" stroke-opacity="0.3"/><text x="183" y="130" font-size="13" text-anchor="middle" fill="currentColor">1</text><circle cx="370" cy="145" r="23" fill="none" stroke="currentColor" stroke-opacity="0.3"/><text x="403" y="130" font-size="13" text-anchor="middle" fill="currentColor">2</text><circle cx="95" cy="215" r="23" fill="none" stroke="currentColor" stroke-opacity="0.3"/><text x="128" y="200" font-size="13" text-anchor="middle" fill="currentColor">3</text><circle cx="205" cy="215" r="23" fill="none" stroke="currentColor" stroke-opacity="0.3"/><text x="238" y="200" font-size="13" text-anchor="middle" fill="currentColor">4</text><circle cx="315" cy="215" r="23" fill="none" stroke="currentColor" stroke-opacity="0.3"/><text x="348" y="200" font-size="13" text-anchor="middle" fill="currentColor">5</text>
<g opacity="1"><animate attributeName="opacity" dur="8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.25;0.5;0.75;1.0" values="1;0;0;0;1"/><text x="260" y="80" font-size="17" text-anchor="middle" fill="currentColor">1</text><text x="150" y="150" font-size="17" text-anchor="middle" fill="currentColor">3</text><text x="370" y="150" font-size="17" text-anchor="middle" fill="currentColor">4</text><text x="95" y="220" font-size="17" text-anchor="middle" fill="currentColor">6</text><text x="205" y="220" font-size="17" text-anchor="middle" fill="currentColor">7</text><text x="315" y="220" font-size="17" text-anchor="middle" fill="currentColor">10</text><text x="260" y="273" font-size="13" text-anchor="middle" fill="currentColor">Heap [1,3,4,6,7,10]; lấy min = 1</text></g>
<g opacity="0"><animate attributeName="opacity" dur="8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.25;0.5;0.75;1.0" values="0;1;0;0;0"/><text x="260" y="80" font-size="17" text-anchor="middle" fill="currentColor">10</text><text x="150" y="150" font-size="17" text-anchor="middle" fill="currentColor">3</text><text x="370" y="150" font-size="17" text-anchor="middle" fill="currentColor">4</text><text x="95" y="220" font-size="17" text-anchor="middle" fill="currentColor">6</text><text x="205" y="220" font-size="17" text-anchor="middle" fill="currentColor">7</text><text x="260" y="273" font-size="13" text-anchor="middle" fill="currentColor">Đưa 10 từ cuối lên gốc, mảng còn 5 ô</text></g>
<g opacity="0"><animate attributeName="opacity" dur="8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.25;0.5;0.75;1.0" values="0;0;1;0;0"/><text x="260" y="80" font-size="17" text-anchor="middle" fill="currentColor">3</text><text x="150" y="150" font-size="17" text-anchor="middle" fill="currentColor">10</text><text x="370" y="150" font-size="17" text-anchor="middle" fill="currentColor">4</text><text x="95" y="220" font-size="17" text-anchor="middle" fill="currentColor">6</text><text x="205" y="220" font-size="17" text-anchor="middle" fill="currentColor">7</text><text x="260" y="273" font-size="13" text-anchor="middle" fill="currentColor">Chọn con nhỏ hơn: 3 &lt; 4; đổi 10 với 3</text></g>
<g opacity="0"><animate attributeName="opacity" dur="8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.25;0.5;0.75;1.0" values="0;0;0;1;0"/><text x="260" y="80" font-size="17" text-anchor="middle" fill="currentColor">3</text><text x="150" y="150" font-size="17" text-anchor="middle" fill="currentColor">6</text><text x="370" y="150" font-size="17" text-anchor="middle" fill="currentColor">4</text><text x="95" y="220" font-size="17" text-anchor="middle" fill="currentColor">10</text><text x="205" y="220" font-size="17" text-anchor="middle" fill="currentColor">7</text><text x="260" y="273" font-size="13" text-anchor="middle" fill="currentColor">Chọn 6 &lt; 7; đổi 10 với 6, O(log n)</text></g>
<path d="M30 297 H490" stroke="currentColor" stroke-opacity="0.3"/><circle cx="30" cy="297" r="4" fill="currentColor"><animate attributeName="cx" dur="8s" repeatCount="indefinite" values="30;490"/></circle>
</svg>
</auto-anim>

- **push** ("sift up"): thêm vào cuối mảng rồi đẩy lên cho tới khi đúng chỗ. Chiều cao cây là `log n` → tối đa `log n` lần đổi chỗ → **O(log n)**.
- **pop** ("sift down"): lấy gốc, đưa phần tử cuối lên gốc, dìm xuống dần. Cũng tối đa `log n` bước → **O(log n)**.
- **heapify**: trực giác sai là "n phần tử × log n = O(n log n)". Nhưng đa số phần tử nằm ở *gần đáy* (chiều cao nhỏ), chỉ ít node ở gần gốc mới phải dìm xa. Tổng công việc hội tụ về **O(n)** (chứng minh bằng chuỗi `Σ n/2^h · h`).

<auto-anim data-dur="8">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 315" role="img" aria-labelledby="ds8-build-t ds8-build-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="ds8-build-t">Heapify [5,1,3,8,2]: từ dưới lên</title>
<desc id="ds8-build-d">Heapify [5,1,3,8,2]: từ dưới lên. Các vị trí trong cấu trúc cố định; các bước lần lượt làm nổi phần đang xử lý.</desc>
<defs><marker id="ds8-build-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260.0" y="25" font-size="15" text-anchor="middle" fill="currentColor">Heapify [5,1,3,8,2]: từ dưới lên</text>
<path d="M260 95 L150 125" stroke="currentColor" stroke-opacity="0.3"/><path d="M260 95 L370 125" stroke="currentColor" stroke-opacity="0.3"/><path d="M150 165 L95 195" stroke="currentColor" stroke-opacity="0.3"/><path d="M150 165 L205 195" stroke="currentColor" stroke-opacity="0.3"/><circle cx="260" cy="75" r="23" fill="none" stroke="currentColor" stroke-opacity="0.3"/><text x="293" y="60" font-size="13" text-anchor="middle" fill="currentColor">0</text><circle cx="150" cy="145" r="23" fill="none" stroke="currentColor" stroke-opacity="0.3"/><text x="183" y="130" font-size="13" text-anchor="middle" fill="currentColor">1</text><circle cx="370" cy="145" r="23" fill="none" stroke="currentColor" stroke-opacity="0.3"/><text x="403" y="130" font-size="13" text-anchor="middle" fill="currentColor">2</text><circle cx="95" cy="215" r="23" fill="none" stroke="currentColor" stroke-opacity="0.3"/><text x="128" y="200" font-size="13" text-anchor="middle" fill="currentColor">3</text><circle cx="205" cy="215" r="23" fill="none" stroke="currentColor" stroke-opacity="0.3"/><text x="238" y="200" font-size="13" text-anchor="middle" fill="currentColor">4</text>
<g opacity="1"><animate attributeName="opacity" dur="8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.25;0.5;0.75;1.0" values="1;0;0;0;1"/><text x="260" y="80" font-size="17" text-anchor="middle" fill="currentColor">5</text><text x="150" y="150" font-size="17" text-anchor="middle" fill="currentColor">1</text><text x="370" y="150" font-size="17" text-anchor="middle" fill="currentColor">3</text><text x="95" y="220" font-size="17" text-anchor="middle" fill="currentColor">8</text><text x="205" y="220" font-size="17" text-anchor="middle" fill="currentColor">2</text><text x="260" y="273" font-size="13" text-anchor="middle" fill="currentColor">Bắt đầu i=n//2−1=1; lá đã là heap</text></g>
<g opacity="0"><animate attributeName="opacity" dur="8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.25;0.5;0.75;1.0" values="0;1;0;0;0"/><text x="260" y="80" font-size="17" text-anchor="middle" fill="currentColor">5</text><text x="150" y="150" font-size="17" text-anchor="middle" fill="currentColor">1</text><text x="370" y="150" font-size="17" text-anchor="middle" fill="currentColor">3</text><text x="95" y="220" font-size="17" text-anchor="middle" fill="currentColor">8</text><text x="205" y="220" font-size="17" text-anchor="middle" fill="currentColor">2</text><text x="260" y="273" font-size="13" text-anchor="middle" fill="currentColor">i=1: 1 ≤ 8 và 2, giữ nguyên</text></g>
<g opacity="0"><animate attributeName="opacity" dur="8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.25;0.5;0.75;1.0" values="0;0;1;0;0"/><text x="260" y="80" font-size="17" text-anchor="middle" fill="currentColor">1</text><text x="150" y="150" font-size="17" text-anchor="middle" fill="currentColor">5</text><text x="370" y="150" font-size="17" text-anchor="middle" fill="currentColor">3</text><text x="95" y="220" font-size="17" text-anchor="middle" fill="currentColor">8</text><text x="205" y="220" font-size="17" text-anchor="middle" fill="currentColor">2</text><text x="260" y="273" font-size="13" text-anchor="middle" fill="currentColor">i=0: đổi 5 với con nhỏ hơn là 1</text></g>
<g opacity="0"><animate attributeName="opacity" dur="8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.25;0.5;0.75;1.0" values="0;0;0;1;0"/><text x="260" y="80" font-size="17" text-anchor="middle" fill="currentColor">1</text><text x="150" y="150" font-size="17" text-anchor="middle" fill="currentColor">2</text><text x="370" y="150" font-size="17" text-anchor="middle" fill="currentColor">3</text><text x="95" y="220" font-size="17" text-anchor="middle" fill="currentColor">8</text><text x="205" y="220" font-size="17" text-anchor="middle" fill="currentColor">5</text><text x="260" y="273" font-size="13" text-anchor="middle" fill="currentColor">Dìm 5 qua 2; kết quả [1,2,3,8,5]</text></g>
<path d="M30 297 H490" stroke="currentColor" stroke-opacity="0.3"/><circle cx="30" cy="297" r="4" fill="currentColor"><animate attributeName="cx" dur="8s" repeatCount="indefinite" values="30;490"/></circle>
</svg>
</auto-anim>

### 2.2. Tự tay thử: push, pop và heapify

Ba hình trên chạy theo kịch bản cố định. Khung dưới đây cho bạn tự chọn dữ liệu: nhập số rồi bấm **Thêm (push)** để xem phần tử mới đi từ cuối mảng lên (sift up), bấm **Lấy min (pop)** để xem phần tử cuối được đưa lên gốc rồi chìm xuống (sift down), hoặc nhập một dãy rồi bấm **Heapify**. Cây và mảng được tô cùng lúc, nên bạn thấy ngay vì sao cha của index `i` nằm ở `(i-1)/2`. Bật **Từng bước** để tự bấm **Tiếp** qua từng lần so sánh và đổi chỗ.

<ds-playground data-type="heap" data-init="5,3,8,1,9,2">
</ds-playground>

## 3. Bảng DẠNG BÀI (problem patterns)

| Dạng | Dấu hiệu nhận biết | Hướng làm | Độ phức tạp | Bài kinh điển (LeetCode) |
| --- | --- | --- | --- | --- |
| **Top-K largest/smallest** | "k phần tử lớn/nhỏ nhất" | Min-heap kích thước **k** cho largest (max-heap size k cho smallest) | O(n log k) | Kth Largest Element in an Array (215) |
| **K most frequent** | "k phần tử frequent nhất" | Hash đếm tần suất → heap size k theo count (hoặc bucket sort O(n)) | O(n log k) | Top K Frequent Elements (347) |
| **Merge K sorted** | "gộp k danh sách/luồng đã sắp xếp" | Min-heap giữ "đầu" mỗi luồng, pop min rồi đẩy phần tử kế tiếp | O(N log k) | Merge k Sorted Lists (23) |
| **Median of stream** | "median của data stream đang chạy" | **Two heaps**: max-heap nửa nhỏ + min-heap nửa lớn, giữ cân bằng | push O(log n), median O(1) | Find Median from Data Stream (295) |
| **K closest points** | "k điểm/phần tử gần nhất theo khoảng cách" | Max-heap size k theo distance (giữ k cái gần nhất) | O(n log k) | K Closest Points to Origin (973) |
| **Task / interval scheduling** | "lập lịch theo độ ưu tiên / thời gian / cooldown" | PQ chọn việc ưu tiên nhất; đôi khi 2 PQ (đang chạy / chờ) | O(n log n) | Task Scheduler (621), Meeting Rooms II (253) |
| **K-th smallest trong cấu trúc đã sắp** | "phần tử thứ k nhỏ nhất trong matrix/2 mảng đã sort" | Min-heap mở rộng dần "biên giới" | O(k log n) | Kth Smallest in a Sorted Matrix (378) |
| **Greedy + "rẻ nhất tiếp theo"** | "chọn cạnh/chi phí nhỏ nhất kế tiếp" | Priority queue (Dijkstra/Prim/Huffman) | O(E log V) | Network Delay Time (743) |

> Ghi nhớ về kích thước heap (cực kỳ hay sai): muốn **k phần tử LỚN nhất**, dùng **MIN-heap size k** (gốc là cái nhỏ nhất trong nhóm k → phần tử mới lớn hơn gốc thì đẩy gốc ra). Muốn **k phần tử NHỎ nhất**, dùng **MAX-heap size k**. Nhớ ngược lại là lỗi kinh điển.

## 4. Bài mẫu giải chi tiết

### 4.1. Bài mẫu 1 — Kth Largest Element (LeetCode 215)

**Hiểu đề.** Cho mảng `nums` và số `k`, trả về phần tử **lớn thứ k** (theo thứ tự đã sắp, không phải k phần tử lớn nhất riêng biệt). Ví dụ `nums = [3,2,1,5,6,4], k = 2` → `5` (lớn nhất là 6, lớn thứ hai là 5).

**Ý tưởng / vì sao.** Cách ngây thơ: sort giảm dần rồi lấy phần tử thứ `k-1` — O(n log n). Tốt hơn: giữ một **min-heap kích thước k**. Heap này luôn chứa *k phần tử lớn nhất đã gặp*, và **gốc của nó chính là cái nhỏ nhất trong k cái lớn nhất** — tức là phần tử lớn thứ k. Khi duyệt: đẩy phần tử vào, nếu heap > k thì pop bỏ cái nhỏ nhất. Vì sao min-heap chứ không phải max-heap? Vì ta muốn *vứt cái nhỏ* khi heap đầy, mà min-heap cho phép vứt cái nhỏ nhất trong O(log k).

<auto-anim data-dur="12">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 285" role="img" aria-labelledby="ds8-topk-t ds8-topk-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="ds8-topk-t">Top-2: pop cái nhỏ khi heap vượt k</title>
<desc id="ds8-topk-d">Top-2: pop cái nhỏ khi heap vượt k. Các vị trí trong cấu trúc cố định; các bước lần lượt làm nổi phần đang xử lý.</desc>
<defs><marker id="ds8-topk-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260.0" y="25" font-size="15" text-anchor="middle" fill="currentColor">Top-2: pop cái nhỏ khi heap vượt k</text>
<text x="260" y="55" font-size="14" text-anchor="middle" fill="currentColor">nums = [3,2,1,5,6,4], k = 2</text><rect x="190" y="110" width="60" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><rect x="110" y="175" width="60" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="150" y="135" font-size="13" text-anchor="middle" fill="currentColor">gốc</text><path d="M210 145 L150 170" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#ds8-topk-a)"/>
<g opacity="1"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.166667;0.333333;0.5;0.666667;0.833333;1.0" values="1;0;0;0;0;0;1"/><text x="220" y="134" font-size="17" text-anchor="middle" fill="currentColor">3</text><text x="260" y="243" font-size="13" text-anchor="middle" fill="currentColor">Đọc 3 → heap [3]</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.166667;0.333333;0.5;0.666667;0.833333;1.0" values="0;1;0;0;0;0;0"/><text x="220" y="134" font-size="17" text-anchor="middle" fill="currentColor">2</text><text x="140" y="199" font-size="17" text-anchor="middle" fill="currentColor">3</text><text x="260" y="243" font-size="13" text-anchor="middle" fill="currentColor">Đọc 2 → heap [2,3]</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.166667;0.333333;0.5;0.666667;0.833333;1.0" values="0;0;1;0;0;0;0"/><text x="220" y="134" font-size="17" text-anchor="middle" fill="currentColor">2</text><text x="140" y="199" font-size="17" text-anchor="middle" fill="currentColor">3</text><text x="260" y="243" font-size="13" text-anchor="middle" fill="currentColor">Push 1 rồi pop 1 → [2,3]</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.166667;0.333333;0.5;0.666667;0.833333;1.0" values="0;0;0;1;0;0;0"/><text x="220" y="134" font-size="17" text-anchor="middle" fill="currentColor">3</text><text x="140" y="199" font-size="17" text-anchor="middle" fill="currentColor">5</text><text x="260" y="243" font-size="13" text-anchor="middle" fill="currentColor">Push 5 rồi pop 2 → [3,5]</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.166667;0.333333;0.5;0.666667;0.833333;1.0" values="0;0;0;0;1;0;0"/><text x="220" y="134" font-size="17" text-anchor="middle" fill="currentColor">5</text><text x="140" y="199" font-size="17" text-anchor="middle" fill="currentColor">6</text><text x="260" y="243" font-size="13" text-anchor="middle" fill="currentColor">Push 6 rồi pop 3 → [5,6]</text></g>
<g opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.166667;0.333333;0.5;0.666667;0.833333;1.0" values="0;0;0;0;0;1;0"/><text x="220" y="134" font-size="17" text-anchor="middle" fill="currentColor">5</text><text x="140" y="199" font-size="17" text-anchor="middle" fill="currentColor">6</text><text x="260" y="243" font-size="13" text-anchor="middle" fill="currentColor">Push 4 rồi pop 4 → [5,6]; trả gốc 5</text></g>
<path d="M30 267 H490" stroke="currentColor" stroke-opacity="0.3"/><circle cx="30" cy="267" r="4" fill="currentColor"><animate attributeName="cx" dur="12s" repeatCount="indefinite" values="30;490"/></circle>
</svg>
</auto-anim>

```python
import heapq
def find_kth_largest(nums, k):
    heap = []
    for x in nums:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)   # bỏ cái nhỏ nhất
    return heap[0]                # gốc = lớn thứ k
```
```javascript
function findKthLargest(nums, k) {
  const heap = new MinHeap();    // dùng MinHeap ở mục template
  for (const x of nums) {
    heap.push(x);
    if (heap.size() > k) heap.pop();
  }
  return heap.peek();
}
```
```java
int findKthLargest(int[] nums, int k) {
    PriorityQueue<Integer> heap = new PriorityQueue<>(); // min-heap
    for (int x : nums) {
        heap.offer(x);
        if (heap.size() > k) heap.poll();
    }
    return heap.peek();
}
```
```go
func findKthLargest(nums []int, k int) int {
    h := &MinHeap{}
    heap.Init(h)
    for _, x := range nums {
        heap.Push(h, x)
        if h.Len() > k {
            heap.Pop(h)
        }
    }
    return (*h)[0]
}
```

```cpp
int findKthLargest(vector<int>& nums, int k) {
    priority_queue<int, vector<int>, greater<int>> heap; // min-heap
    for (int x : nums) {
        heap.push(x);
        if ((int)heap.size() > k) heap.pop();  // bỏ cái nhỏ nhất
    }
    return heap.top();                         // gốc = lớn thứ k
}
```

**Phân tích độ phức tạp.** Mỗi phần tử push/pop trên heap kích thước ≤ k tốn O(log k). Tổng **O(n log k)** thời gian, **O(k)** bộ nhớ. So với sort O(n log n) và bộ nhớ O(1)/O(n): khi `k ≪ n` (ví dụ tìm top-10 trong 10 triệu phần tử), heap thắng đậm.

**Bẫy.** (1) Dùng nhầm max-heap size k → gốc thành cái *lớn* nhất, không phải thứ k. (2) Đề hỏi "lớn thứ k" (kth largest, tính cả trùng theo vị trí sắp) chứ không phải "phần tử distinct lớn thứ k" — đọc kỹ. (3) Nếu phỏng vấn ép O(n) trung bình, đáp án là **quickselect** (mục 6).

### 4.2. Bài mẫu 2 — Top K Frequent Elements (LeetCode 347)

**Hiểu đề.** Cho mảng `nums` và `k`, trả về `k` phần tử **xuất hiện nhiều lần nhất**. Ví dụ `nums = [1,1,1,2,2,3], k = 2` → `[1,2]` (1 xuất hiện 3 lần, 2 xuất hiện 2 lần).

**Ý tưởng / vì sao.** Hai bước: (1) **đếm tần suất** bằng hash map — O(n); (2) lấy ra k khoá có count cao nhất. Bước 2 lại chính là bài Top-K: giữ **min-heap size k theo count**. Phần tử nào có count lớn hơn gốc thì thay gốc. Cuối cùng heap chứa đúng k phần tử frequent nhất.



<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 300" role="img" aria-labelledby="dsg08-freq-t dsg08-freq-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsg08-freq-t">Min-heap theo (count,num), k=2</title>
<desc id="dsg08-freq-d">Min-heap theo (count,num), k=2</desc>
<defs><marker id="dsg08-freq-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260.0" y="24" text-anchor="middle" font-size="16" fill="currentColor">Min-heap theo (count,num), k=2</text>
<rect x="167.0" y="85" width="59" height="45" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="198.0" y="72" text-anchor="middle" font-size="13" fill="currentColor">0</text>
<rect x="229.0" y="85" width="59" height="45" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="260.0" y="72" text-anchor="middle" font-size="13" fill="currentColor">1</text>
<rect x="291.0" y="85" width="59" height="45" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="322.0" y="72" text-anchor="middle" font-size="13" fill="currentColor">2</text>
<text x="260" y="150" text-anchor="middle" font-size="13" fill="currentColor">Vàng: vị trí / đoạn đang xét</text>
<g data-step="1" data-until="1"><rect x="167.0" y="85" width="59" height="45" rx="5" fill="#f59e0b" fill-opacity=".16" stroke="#f59e0b" stroke-width="3"/><text x="198.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">(3,1)</text><text x="260.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">—</text><text x="322.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">—</text><text x="260" y="190" text-anchor="middle" font-size="14" fill="currentColor">Thêm (3,1) → heap=[(3,1)]</text></g>
<g data-step="2" data-until="2"><rect x="167.0" y="85" width="59" height="45" rx="5" fill="#f59e0b" fill-opacity=".16" stroke="#f59e0b" stroke-width="3"/><rect x="229.0" y="85" width="59" height="45" rx="5" fill="#f59e0b" fill-opacity=".16" stroke="#f59e0b" stroke-width="3"/><text x="198.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">(2,2)</text><text x="260.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">(3,1)</text><text x="322.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">—</text><text x="260" y="190" text-anchor="middle" font-size="14" fill="currentColor">Thêm (2,2): 2 &lt; 3 → nổi lên</text></g>
<g data-step="3" data-until="3"><rect x="167.0" y="85" width="59" height="45" rx="5" fill="#f59e0b" fill-opacity=".16" stroke="#f59e0b" stroke-width="3"/><rect x="229.0" y="85" width="59" height="45" rx="5" fill="#f59e0b" fill-opacity=".16" stroke="#f59e0b" stroke-width="3"/><rect x="291.0" y="85" width="59" height="45" rx="5" fill="#f59e0b" fill-opacity=".16" stroke="#f59e0b" stroke-width="3"/><text x="198.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">(1,3)</text><text x="260.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">(3,1)</text><text x="322.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">(2,2)</text><text x="260" y="190" text-anchor="middle" font-size="14" fill="currentColor">Thêm (1,3): 1 &lt; 2 → nổi lên</text><text x="260" y="218" text-anchor="middle" font-size="14" fill="currentColor">Có 3 phần tử &gt; k: lấy min ra</text></g>
<g data-step="4"><rect x="167.0" y="85" width="59" height="45" rx="5" fill="#f59e0b" fill-opacity=".16" stroke="#f59e0b" stroke-width="3"/><rect x="229.0" y="85" width="59" height="45" rx="5" fill="#f59e0b" fill-opacity=".16" stroke="#f59e0b" stroke-width="3"/><text x="198.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">(2,2)</text><text x="260.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">(3,1)</text><text x="322.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">—</text><text x="260" y="190" text-anchor="middle" font-size="14" fill="currentColor">Lấy (1,3) ra → heap=[(2,2),(3,1)]</text><text x="260" y="218" text-anchor="middle" font-size="14" fill="currentColor">Trả về các khoá [2,1]; thứ tự không bắt buộc</text></g>
</svg>
<step-note data-step="1">Đếm trước: 1 có count 3, 2 có count 2, 3 có count 1. Đưa tuple (3,1) vào heap.</step-note>
<step-note data-step="2">Heap ưu tiên count nhỏ hơn, vì ta muốn loại key ít xuất hiện nhất.</step-note>
<step-note data-step="3">Đúng như code: push trước rồi mới kiểm len>k; heap tạm có k+1 tuple.</step-note>
<step-note data-step="4">Loại key 3 vì count thấp nhất. Hai key còn lại là 1 và 2, không cần sort kết quả.</step-note>
</step-flow>

```python
import heapq
from collections import Counter
def top_k_frequent(nums, k):
    count = Counter(nums)                 # O(n) đếm tần suất
    heap = []                              # min-heap theo (count, num)
    for num, c in count.items():
        heapq.heappush(heap, (c, num))
        if len(heap) > k:
            heapq.heappop(heap)            # bỏ phần tử ít frequent nhất
    return [num for c, num in heap]
```
```javascript
function topKFrequent(nums, k) {
  const count = new Map();
  for (const x of nums) count.set(x, (count.get(x) || 0) + 1);
  // Heap chứa [count, num], min theo count -> cài MinHeap so sánh theo [0]
  const heap = new MinHeapBy((a, b) => a[0] - b[0]);
  for (const [num, c] of count) {
    heap.push([c, num]);
    if (heap.size() > k) heap.pop();
  }
  return heap.a.map(([, num]) => num);
}
```
```java
int[] topKFrequent(int[] nums, int k) {
    Map<Integer, Integer> count = new HashMap<>();
    for (int x : nums) count.merge(x, 1, Integer::sum);
    PriorityQueue<int[]> heap =
        new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));  // min theo count
    for (var e : count.entrySet()) {
        heap.offer(new int[]{e.getValue(), e.getKey()});
        if (heap.size() > k) heap.poll();
    }
    int[] res = new int[k];
    for (int i = 0; i < k; i++) res[i] = heap.poll()[1];
    return res;
}
```
```go
func topKFrequent(nums []int, k int) []int {
    count := map[int]int{}
    for _, x := range nums {
        count[x]++
    }
    h := &PairHeap{} // min theo count, mỗi item [2]int{count, num}
    heap.Init(h)
    for num, c := range count {
        heap.Push(h, [2]int{c, num})
        if h.Len() > k {
            heap.Pop(h)
        }
    }
    res := make([]int, 0, k)
    for _, p := range *h {
        res = append(res, p[1])
    }
    return res
}
```

```cpp
vector<int> topKFrequent(vector<int>& nums, int k) {
    unordered_map<int, int> count;          // O(n) đếm tần suất
    for (int x : nums) count[x]++;
    // min-heap theo count: mỗi item {count, num}, gốc là count nhỏ nhất
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<pair<int,int>>> heap;
    for (auto& [num, c] : count) {
        heap.push({c, num});
        if ((int)heap.size() > k) heap.pop(); // bỏ phần tử ít frequent nhất
    }
    vector<int> res;
    while (!heap.empty()) {
        res.push_back(heap.top().second);
        heap.pop();
    }
    return res;
}
```

**Phân tích độ phức tạp.** Đếm O(n). Có `m` khoá distinct (`m ≤ n`); duyệt heap size k → O(m log k). Tổng **O(n log k)** thời gian, O(n) bộ nhớ. Khi `k` gần `m`, có thể tệ hơn sort; lúc đó cân nhắc **bucket sort** O(n).

**Bẫy.** (1) Sai chiều heap: ở đây ta muốn *giữ k count CAO nhất*, nên loại bỏ cái thấp → **min-heap theo count**. (2) Quên rằng so sánh phải theo `count`, không theo `num`. (3) Nếu được yêu cầu O(n) tuyệt đối, dùng bucket sort: tạo mảng `buckets[freq]`, freq tối đa là n, duyệt ngược lấy k phần tử.

### 4.3. Bài mẫu 3 — Find Median from Data Stream (LeetCode 295), kỹ thuật Two Heaps

**Hiểu đề.** Thiết kế cấu trúc hỗ trợ hai thao tác trên một **dòng số liên tục**: `addNum(x)` thêm số, `findMedian()` trả median hiện tại. Median = phần tử giữa nếu lẻ phần tử, trung bình hai phần tử giữa nếu chẵn. Dữ liệu đến từng cái một và **không bao giờ kết thúc**, nên không thể sort lại mỗi lần hỏi.

**Ý tưởng / vì sao (two heaps).** Chia dòng số thành hai nửa:

- **`small`** = một **max-heap** chứa nửa **nhỏ** → gốc là *lớn nhất của nửa nhỏ*.
- **`large`** = một **min-heap** chứa nửa **lớn** → gốc là *nhỏ nhất của nửa lớn*.

Hai gốc này chính là hai phần tử sát giữa. Median nằm gọn giữa hai gốc.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Two heaps tìm median: max-heap nửa nhỏ và min-heap nửa lớn</title>
  <desc>Dòng số chia làm hai nửa cân bằng: max-heap chứa nửa nhỏ với gốc là số lớn nhất nửa nhỏ (4), min-heap chứa nửa lớn với gốc là số nhỏ nhất nửa lớn (5). Hai gốc gặp nhau ở giữa là hai phần tử giữa của dòng, median tính từ chúng.</desc>
  <text x="180" y="24" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">small — MAX-heap (nửa nhỏ)</text>
  <text x="540" y="24" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">large — MIN-heap (nửa lớn)</text>
  <g stroke="currentColor" stroke-opacity="0.35" fill="none">
    <path d="M260 64 L200 122"/>
    <path d="M260 64 L320 122"/>
    <path d="M200 134 L150 186"/>
    <path d="M200 134 L240 186"/>
  </g>
  <g>
    <circle cx="260" cy="56" r="20" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.5"/>
    <text x="260" y="61" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">4</text>
    <text x="260" y="34" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">gốc = max nửa nhỏ</text>
    <circle cx="200" cy="136" r="18" fill="#f59e0b" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="200" y="141" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">2</text>
    <circle cx="320" cy="136" r="18" fill="#f59e0b" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="320" y="141" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">3</text>
    <circle cx="150" cy="188" r="18" fill="#f59e0b" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="150" y="193" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">1</text>
    <circle cx="240" cy="188" r="18" fill="#f59e0b" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="240" y="193" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">2</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.35" fill="none">
    <path d="M460 64 L400 122"/>
    <path d="M460 64 L520 122"/>
    <path d="M520 134 L480 186"/>
    <path d="M520 134 L560 186"/>
  </g>
  <g>
    <circle cx="460" cy="56" r="20" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.5"/>
    <text x="460" y="61" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">5</text>
    <text x="460" y="34" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">gốc = min nửa lớn</text>
    <circle cx="400" cy="136" r="18" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="400" y="141" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">6</text>
    <circle cx="520" cy="136" r="18" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="520" y="141" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">7</text>
    <circle cx="480" cy="188" r="18" fill="#3b82f6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="480" y="193" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">8</text>
    <circle cx="560" cy="188" r="18" fill="#3b82f6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="560" y="193" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">9</text>
  </g>
  <line x1="280" y1="56" x2="440" y2="56" stroke="currentColor" stroke-opacity="0.5" stroke-dasharray="4 4"/>
  <text x="360" y="50" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.8">hai phần tử giữa</text>
  <g>
    <rect x="100" y="236" width="520" height="68" rx="9" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="360" y="262" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Invariant: |small| == |large| hoặc |small| == |large| + 1</text>
    <text x="360" y="282" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.9">chẵn phần tử → median = (4 + 5) / 2 = 4.5</text>
    <text x="360" y="298" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.9">lẻ phần tử (small dư 1) → median = gốc small = 4</text>
  </g>
</svg>

Trong ví dụ dãy 1 đến 8, ranh giới hai nửa là gốc 4 và 5: khi hai nửa bằng nhau, median = (4 + 5)/2 = 4.5; nếu small nhiều hơn đúng một phần tử, median là gốc small (4 trong ví dụ).

**Quy tắc cân bằng (invariant):** luôn giữ `len(small) == len(large)` hoặc `len(small) == len(large) + 1`. Mỗi lần `addNum`: đẩy vào `small`, "tràn" gốc `small` sang `large`, rồi nếu `large` đông hơn thì đẩy ngược một cái về `small`. Cách này tự động giữ thứ tự đúng.

Ví dụ dưới chạy đúng chuỗi `addNum(1)`, `addNum(2)`, `addNum(3)`; số trên hình là giá trị thật (Python lưu số âm trong `small`).

<auto-anim data-dur="16">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 310" role="img" aria-labelledby="ds8-median-t ds8-median-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="ds8-median-t">Two heaps: addNum(1), addNum(2), addNum(3)</title>
<desc id="ds8-median-d">Two heaps: addNum(1), addNum(2), addNum(3). Các vị trí trong cấu trúc cố định; các bước lần lượt làm nổi phần đang xử lý.</desc>
<defs><marker id="ds8-median-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260.0" y="25" font-size="15" text-anchor="middle" fill="currentColor">Two heaps: addNum(1), addNum(2), addNum(3)</text>
<text x="150" y="65" font-size="14" text-anchor="middle" fill="currentColor">small: max-heap</text><text x="375" y="65" font-size="14" text-anchor="middle" fill="currentColor">large: min-heap</text><rect x="125" y="90" width="50" height="40" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><rect x="70" y="160" width="50" height="40" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><rect x="350" y="90" width="50" height="40" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><rect x="295" y="160" width="50" height="40" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="150" y="230" font-size="13" text-anchor="middle" fill="currentColor">nửa nhỏ</text><text x="375" y="230" font-size="13" text-anchor="middle" fill="currentColor">nửa lớn</text>
<path d="M140 130 L105 160" stroke="currentColor" stroke-opacity="0.3"/><path d="M365 130 L330 160" stroke="currentColor" stroke-opacity="0.3"/>
<g opacity="1"><animate attributeName="opacity" dur="16s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.125;0.25;0.375;0.5;0.625;0.75;0.875;1.0" values="1;0;0;0;0;0;0;0;1"/><text x="150" y="115" font-size="17" text-anchor="middle" fill="currentColor">1</text><text x="260" y="268" font-size="13" text-anchor="middle" fill="currentColor">Push 1 vào small</text></g>
<g opacity="0"><animate attributeName="opacity" dur="16s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.125;0.25;0.375;0.5;0.625;0.75;0.875;1.0" values="0;1;0;0;0;0;0;0;0"/><text x="375" y="115" font-size="17" text-anchor="middle" fill="currentColor">1</text><text x="260" y="268" font-size="13" text-anchor="middle" fill="currentColor">Chuyển max(small)=1 sang large</text></g>
<g opacity="0"><animate attributeName="opacity" dur="16s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.125;0.25;0.375;0.5;0.625;0.75;0.875;1.0" values="0;0;1;0;0;0;0;0;0"/><text x="150" y="115" font-size="17" text-anchor="middle" fill="currentColor">1</text><text x="260" y="268" font-size="13" text-anchor="middle" fill="currentColor">large đông hơn → chuyển 1 về; median=1</text></g>
<g opacity="0"><animate attributeName="opacity" dur="16s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.125;0.25;0.375;0.5;0.625;0.75;0.875;1.0" values="0;0;0;1;0;0;0;0;0"/><text x="150" y="115" font-size="17" text-anchor="middle" fill="currentColor">2</text><text x="95" y="185" font-size="17" text-anchor="middle" fill="currentColor">1</text><text x="260" y="268" font-size="13" text-anchor="middle" fill="currentColor">Push 2 vào small; gốc mới là 2</text></g>
<g opacity="0"><animate attributeName="opacity" dur="16s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.125;0.25;0.375;0.5;0.625;0.75;0.875;1.0" values="0;0;0;0;1;0;0;0;0"/><text x="150" y="115" font-size="17" text-anchor="middle" fill="currentColor">1</text><text x="375" y="115" font-size="17" text-anchor="middle" fill="currentColor">2</text><text x="260" y="268" font-size="13" text-anchor="middle" fill="currentColor">Chuyển 2 sang large; median=(1+2)/2</text></g>
<g opacity="0"><animate attributeName="opacity" dur="16s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.125;0.25;0.375;0.5;0.625;0.75;0.875;1.0" values="0;0;0;0;0;1;0;0;0"/><text x="150" y="115" font-size="17" text-anchor="middle" fill="currentColor">3</text><text x="95" y="185" font-size="17" text-anchor="middle" fill="currentColor">1</text><text x="375" y="115" font-size="17" text-anchor="middle" fill="currentColor">2</text><text x="260" y="268" font-size="13" text-anchor="middle" fill="currentColor">Push 3 vào small; tạm chưa đúng phân nửa</text></g>
<g opacity="0"><animate attributeName="opacity" dur="16s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.125;0.25;0.375;0.5;0.625;0.75;0.875;1.0" values="0;0;0;0;0;0;1;0;0"/><text x="150" y="115" font-size="17" text-anchor="middle" fill="currentColor">1</text><text x="375" y="115" font-size="17" text-anchor="middle" fill="currentColor">2</text><text x="320" y="185" font-size="17" text-anchor="middle" fill="currentColor">3</text><text x="260" y="268" font-size="13" text-anchor="middle" fill="currentColor">Chuyển 3 sang large; large đông hơn</text></g>
<g opacity="0"><animate attributeName="opacity" dur="16s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.125;0.25;0.375;0.5;0.625;0.75;0.875;1.0" values="0;0;0;0;0;0;0;1;0"/><text x="150" y="115" font-size="17" text-anchor="middle" fill="currentColor">2</text><text x="95" y="185" font-size="17" text-anchor="middle" fill="currentColor">1</text><text x="375" y="115" font-size="17" text-anchor="middle" fill="currentColor">3</text><text x="260" y="268" font-size="13" text-anchor="middle" fill="currentColor">Chuyển min(large)=2 về small; median=2</text></g>
<path d="M30 292 H490" stroke="currentColor" stroke-opacity="0.3"/><circle cx="30" cy="292" r="4" fill="currentColor"><animate attributeName="cx" dur="16s" repeatCount="indefinite" values="30;490"/></circle>
</svg>
</auto-anim>

```python
import heapq
class MedianFinder:
    def __init__(self):
        self.small = []   # max-heap (lưu số âm)
        self.large = []   # min-heap
    def addNum(self, x):
        heapq.heappush(self.small, -x)             # vào nửa nhỏ
        heapq.heappush(self.large, -heapq.heappop(self.small))  # tràn sang nửa lớn
        if len(self.large) > len(self.small):      # cân bằng lại
            heapq.heappush(self.small, -heapq.heappop(self.large))
    def findMedian(self):
        if len(self.small) > len(self.large):
            return -self.small[0]
        return (-self.small[0] + self.large[0]) / 2
```
```javascript
class MedianFinder {
  constructor() {
    this.small = new MaxHeap();  // nửa nhỏ
    this.large = new MinHeap();  // nửa lớn
  }
  addNum(x) {
    this.small.push(x);
    this.large.push(this.small.pop());          // tràn gốc small sang large
    if (this.large.size() > this.small.size())
      this.small.push(this.large.pop());        // cân bằng
  }
  findMedian() {
    if (this.small.size() > this.large.size()) return this.small.peek();
    return (this.small.peek() + this.large.peek()) / 2;
  }
}
```
```java
class MedianFinder {
    PriorityQueue<Integer> small = new PriorityQueue<>(Collections.reverseOrder());
    PriorityQueue<Integer> large = new PriorityQueue<>();
    public void addNum(int x) {
        small.offer(x);
        large.offer(small.poll());               // tràn sang nửa lớn
        if (large.size() > small.size()) small.offer(large.poll());
    }
    public double findMedian() {
        if (small.size() > large.size()) return small.peek();
        return (small.peek() + large.peek()) / 2.0;
    }
}
```
```go
type MedianFinder struct {
    small *MaxHeap // nửa nhỏ
    large *MinHeap // nửa lớn
}
func Constructor() MedianFinder {
    return MedianFinder{small: &MaxHeap{}, large: &MinHeap{}}
}
func (m *MedianFinder) AddNum(x int) {
    heap.Push(m.small, x)
    heap.Push(m.large, heap.Pop(m.small).(int))      // tràn sang nửa lớn
    if m.large.Len() > m.small.Len() {
        heap.Push(m.small, heap.Pop(m.large).(int))  // cân bằng
    }
}
func (m *MedianFinder) FindMedian() float64 {
    if m.small.Len() > m.large.Len() {
        return float64((*m.small)[0])
    }
    return float64((*m.small)[0]+(*m.large)[0]) / 2.0
}
```

```cpp
class MedianFinder {
    priority_queue<int> small;                                   // max-heap: nửa nhỏ
    priority_queue<int, vector<int>, greater<int>> large;        // min-heap: nửa lớn
public:
    void addNum(int x) {
        small.push(x);                       // vào nửa nhỏ
        large.push(small.top()); small.pop();// tràn gốc small sang large
        if (large.size() > small.size()) {   // cân bằng lại
            small.push(large.top()); large.pop();
        }
    }
    double findMedian() {
        if (small.size() > large.size()) return small.top();
        return (small.top() + large.top()) / 2.0;
    }
};
```

**Phân tích độ phức tạp.** `addNum` làm vài thao tác heap → **O(log n)**. `findMedian` chỉ đọc hai gốc → **O(1)**. Bộ nhớ O(n). Đây là lý do two heaps đánh bại mọi cách sort lại (O(n log n) mỗi lần hỏi).

**Bẫy.** (1) Trong Python, `small` là max-heap nên phải **lưu số âm** và nhớ đảo dấu khi đọc. (2) Quên bước "tràn rồi cân bằng" sẽ khiến hai gốc không còn là hai phần tử giữa. (3) Chia median: với chẵn phần tử phải trả `(gốc + gốc)/2` kiểu **float**, đừng để integer division cắt phần lẻ.

## 5. So sánh heap vs sort vs quickselect

Đây là phần phỏng vấn rất thích đào sâu. Cùng bài "Top-K", có ba vũ khí:

| Tiêu chí | **Sort** rồi cắt | **Heap** size k | **Quickselect** |
| --- | --- | --- | --- |
| Thời gian | O(n log n) | O(n log k) | O(n) trung bình, O(n²) xấu nhất |
| Bộ nhớ thêm | O(1)–O(n) | O(k) | O(1) (in-place) |
| Kết quả có sắp xếp? | Có (cả mảng) | k phần tử (chưa sắp) | k phần tử (chưa sắp) |
| Hợp với **streaming** (dữ liệu chảy vào)? | Không | **Có** — heap cập nhật được | Không (cần cả mảng) |
| Ổn định, dễ code đúng? | Rất dễ | Trung bình | Khó (pivot, phân hoạch) |

**Khi nào chọn cái nào — quy tắc thực dụng:**

- **Cần cả mảng đã sắp xếp**, hoặc `k` gần bằng `n` → cứ **sort**, đơn giản và đủ nhanh.
- **Dữ liệu streaming / online**, hoặc `k ≪ n` và cần bộ nhớ nhỏ → **heap** size k. Đây là default an toàn trong phỏng vấn.
- **Có sẵn toàn bộ mảng trong RAM, chỉ cần top-k một lần, muốn nhanh nhất trung bình** → **quickselect** (Hoare's selection): phân hoạch quanh pivot như quicksort nhưng chỉ đệ quy vào *một* nửa, đạt O(n) kỳ vọng.

> Ghi nhớ: Câu trả lời "ăn điểm" khi phỏng vấn hỏi Top-K: "Heap cho **O(n log k)** và xử lý được **streaming**; nếu có sẵn cả mảng và muốn nhanh hơn, **quickselect** cho **O(n) trung bình** nhưng xấu nhất O(n²) và không stream được." Nói được trade-off này là khác biệt giữa "biết code" và "hiểu vấn đề".

Khung quickselect tham khảo (Kth largest, O(n) trung bình):



<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 300" role="img" aria-labelledby="dsg08-select-t dsg08-select-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsg08-select-t">Quickselect: [3,2,1,5,6,4], k=2</title>
<desc id="dsg08-select-d">Quickselect: [3,2,1,5,6,4], k=2</desc>
<defs><marker id="dsg08-select-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260.0" y="24" text-anchor="middle" font-size="16" fill="currentColor">Quickselect: [3,2,1,5,6,4], k=2</text>
<rect x="74.0" y="85" width="59" height="45" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="105.0" y="72" text-anchor="middle" font-size="13" fill="currentColor">0</text>
<rect x="136.0" y="85" width="59" height="45" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="167.0" y="72" text-anchor="middle" font-size="13" fill="currentColor">1</text>
<rect x="198.0" y="85" width="59" height="45" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="229.0" y="72" text-anchor="middle" font-size="13" fill="currentColor">2</text>
<rect x="260.0" y="85" width="59" height="45" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="291.0" y="72" text-anchor="middle" font-size="13" fill="currentColor">3</text>
<rect x="322.0" y="85" width="59" height="45" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="353.0" y="72" text-anchor="middle" font-size="13" fill="currentColor">4</text>
<rect x="384.0" y="85" width="59" height="45" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="415.0" y="72" text-anchor="middle" font-size="13" fill="currentColor">5</text>
<text x="260" y="150" text-anchor="middle" font-size="13" fill="currentColor">Vàng: vị trí / đoạn đang xét</text>
<g data-step="1" data-until="1"><rect x="384.0" y="85" width="59" height="45" rx="5" fill="#f59e0b" fill-opacity=".16" stroke="#f59e0b" stroke-width="3"/><text x="105.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">3</text><text x="167.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">2</text><text x="229.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">1</text><text x="291.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">5</text><text x="353.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">6</text><text x="415.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">4</text><text x="260" y="190" text-anchor="middle" font-size="14" fill="currentColor">target=n−k=4; pivot=4 ở cuối mảng</text><text x="260" y="218" text-anchor="middle" font-size="14" fill="currentColor">i=0; j quét các chỉ số 0..4</text></g>
<g data-step="2" data-until="2"><rect x="74.0" y="85" width="59" height="45" rx="5" fill="#f59e0b" fill-opacity=".16" stroke="#f59e0b" stroke-width="3"/><rect x="136.0" y="85" width="59" height="45" rx="5" fill="#f59e0b" fill-opacity=".16" stroke="#f59e0b" stroke-width="3"/><rect x="198.0" y="85" width="59" height="45" rx="5" fill="#f59e0b" fill-opacity=".16" stroke="#f59e0b" stroke-width="3"/><text x="105.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">3</text><text x="167.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">2</text><text x="229.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">1</text><text x="291.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">5</text><text x="353.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">6</text><text x="415.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">4</text><text x="260" y="190" text-anchor="middle" font-size="14" fill="currentColor">3,2,1 &lt; 4 → i=3</text><text x="260" y="218" text-anchor="middle" font-size="14" fill="currentColor">5,6 ≥ 4 → không đổi chỗ</text></g>
<g data-step="3" data-until="3"><rect x="260.0" y="85" width="59" height="45" rx="5" fill="#f59e0b" fill-opacity=".16" stroke="#f59e0b" stroke-width="3"/><text x="105.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">3</text><text x="167.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">2</text><text x="229.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">1</text><text x="291.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">4</text><text x="353.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">6</text><text x="415.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">5</text><text x="260" y="190" text-anchor="middle" font-size="14" fill="currentColor">Đổi chỗ pivot với a[i] → p=3</text><text x="260" y="218" text-anchor="middle" font-size="14" fill="currentColor">p &lt; target → lo=4; loại các chỉ số 0..3</text></g>
<g data-step="4"><rect x="322.0" y="85" width="59" height="45" rx="5" fill="#f59e0b" fill-opacity=".16" stroke="#f59e0b" stroke-width="3"/><text x="105.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">3</text><text x="167.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">2</text><text x="229.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">1</text><text x="291.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">4</text><text x="353.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">5</text><text x="415.0" y="114" text-anchor="middle" font-size="15" fill="currentColor">6</text><text x="260" y="190" text-anchor="middle" font-size="14" fill="currentColor">Khoảng [4,5], pivot=5 → p=4</text><text x="260" y="218" text-anchor="middle" font-size="14" fill="currentColor">p == target → trả về a[4]=5</text></g>
</svg>
<step-note data-step="1">Một lần chọn ngẫu nhiên có thể chọn chính phần tử cuối 4; chỉ theo dõi nhánh chứa index mục tiêu 4.</step-note>
<step-note data-step="2">Lomuto giữ vùng nhỏ hơn pivot ở bên trái i, vùng đang xét ở bên phải.</step-note>
<step-note data-step="3">Pivot 4 vào đúng index 3. Khác quicksort, quickselect chỉ tiếp tục bên phải.</step-note>
<step-note data-step="4">Lần chọn tiếp theo lấy pivot 5, partition đặt nó tại index 4. Kết quả lớn thứ hai là 5; O(n) kỳ vọng, O(n²) xấu nhất.</step-note>
</step-flow>

```python
import random
def quickselect_kth_largest(nums, k):
    target = len(nums) - k          # chỉ số khi sắp tăng dần
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        p = partition(nums, lo, hi)
        if p == target: return nums[p]
        if p < target: lo = p + 1
        else: hi = p - 1

def partition(a, lo, hi):
    r = random.randint(lo, hi)      # pivot ngẫu nhiên -> tránh xấu nhất
    a[r], a[hi] = a[hi], a[r]
    pivot, i = a[hi], lo
    for j in range(lo, hi):
        if a[j] < pivot:
            a[i], a[j] = a[j], a[i]; i += 1
    a[i], a[hi] = a[hi], a[i]
    return i
```
```javascript
function quickselectKthLargest(nums, k) {
  let target = nums.length - k, lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const p = partition(nums, lo, hi);
    if (p === target) return nums[p];
    if (p < target) lo = p + 1; else hi = p - 1;
  }
}
function partition(a, lo, hi) {
  const r = lo + Math.floor(Math.random() * (hi - lo + 1));
  [a[r], a[hi]] = [a[hi], a[r]];
  const pivot = a[hi]; let i = lo;
  for (let j = lo; j < hi; j++)
    if (a[j] < pivot) { [a[i], a[j]] = [a[j], a[i]]; i++; }
  [a[i], a[hi]] = [a[hi], a[i]];
  return i;
}
```
```java
int quickselectKthLargest(int[] a, int k) {
    int target = a.length - k, lo = 0, hi = a.length - 1;
    while (lo <= hi) {
        int p = partition(a, lo, hi);
        if (p == target) return a[p];
        if (p < target) lo = p + 1; else hi = p - 1;
    }
    return -1;
}
int partition(int[] a, int lo, int hi) {
    int r = lo + new Random().nextInt(hi - lo + 1);
    int t = a[r]; a[r] = a[hi]; a[hi] = t;
    int pivot = a[hi], i = lo;
    for (int j = lo; j < hi; j++)
        if (a[j] < pivot) { int s = a[i]; a[i] = a[j]; a[j] = s; i++; }
    int s = a[i]; a[i] = a[hi]; a[hi] = s;
    return i;
}
```
```go
func quickselectKthLargest(a []int, k int) int {
    target, lo, hi := len(a)-k, 0, len(a)-1
    for lo <= hi {
        p := partition(a, lo, hi)
        if p == target {
            return a[p]
        }
        if p < target {
            lo = p + 1
        } else {
            hi = p - 1
        }
    }
    return -1
}
func partition(a []int, lo, hi int) int {
    r := lo + rand.Intn(hi-lo+1)
    a[r], a[hi] = a[hi], a[r]
    pivot, i := a[hi], lo
    for j := lo; j < hi; j++ {
        if a[j] < pivot {
            a[i], a[j] = a[j], a[i]
            i++
        }
    }
    a[i], a[hi] = a[hi], a[i]
    return i
}
```

```cpp
#include <random>

int partition(vector<int>& a, int lo, int hi) {
    static mt19937 gen(random_device{}());
    int r = lo + (int)(gen() % (hi - lo + 1)); // pivot ngẫu nhiên -> tránh xấu nhất
    swap(a[r], a[hi]);
    int pivot = a[hi], i = lo;
    for (int j = lo; j < hi; j++)
        if (a[j] < pivot) swap(a[i++], a[j]);
    swap(a[i], a[hi]);
    return i;
}

int quickselectKthLargest(vector<int>& a, int k) {
    int target = (int)a.size() - k;            // chỉ số khi sắp tăng dần
    int lo = 0, hi = (int)a.size() - 1;
    while (lo <= hi) {
        int p = partition(a, lo, hi);
        if (p == target) return a[p];
        if (p < target) lo = p + 1; else hi = p - 1;
    }
    return -1;
}
```

> Bẫy quickselect: **luôn chọn pivot ngẫu nhiên** (hoặc median-of-three). Pivot cố định (luôn lấy phần tử cuối) gặp mảng đã sắp xếp sẽ tụt xuống **O(n²)**. Đây là lỗi khiến nhiều lời giải "đúng" bị TLE.

## 6. Sai lầm thường gặp & cách tránh

| Sai lầm | Hậu quả | Cách tránh |
| --- | --- | --- |
| Dùng max-heap khi cần "k lớn nhất" | Gốc thành cái lớn nhất, không phải thứ k; logic loại bỏ sai | **k lớn nhất → MIN-heap size k**; k nhỏ nhất → MAX-heap size k |
| Push từng phần tử để xây heap từ mảng có sẵn | O(n log n) thay vì O(n) | Dùng `heapify`/`heap.Init`/constructor → O(n) |
| Quên max-heap ở Python/Go | Lấy nhầm min | Phủ định `-x` khi push, đảo dấu khi đọc; Go đổi `Less` thành `>` |
| Heap không giới hạn kích thước trong bài Top-K | O(n log n) bộ nhớ O(n), mất lợi thế | Pop ngay khi `size > k` để giữ heap đúng k |
| Median: integer division | Median chẵn phần tử sai (cắt phần lẻ) | Chia kiểu float `/2.0` |
| So sánh tuple/object không xác định khi count bằng nhau | Lỗi "không so sánh được" (Python so sánh tới phần tử thứ 2) | Đảm bảo phần tử thứ 2 cũng so sánh được, hoặc dùng counter/index phụ |
| Dùng `list.sort()` mỗi lần với streaming | O(n log n) mỗi lần thêm → chậm khủng khiếp | Two heaps / heap incremental: cập nhật O(log n) |
| Pivot cố định trong quickselect | Xấu nhất O(n²), TLE | Pivot ngẫu nhiên |
| Heap "đẩy hết rồi pop k cái" cho Top-K | O(n log n), không tận dụng heap size k | Giữ heap đúng size k → O(n log k) |

> Ghi nhớ: 90% lỗi heap trong phỏng vấn chỉ là **chọn sai chiều heap** (min vs max) và **quên giới hạn kích thước**. Trước khi code, viết ra hai câu: "Tôi muốn lấy ra cái gì khi heap đầy?" và "Gốc heap đang là min hay max?". Hai câu này khoá đúng chiều ngay.

## 7. Checklist tự luyện

Luyện theo đúng thứ tự pattern dưới đây để xây phản xạ "thấy đề → gọi tên dạng → bê template":

- [ ] **Top-K cơ bản** — Kth Largest Element in an Array (215) · *pattern: min-heap size k* (rồi giải lại bằng quickselect để so sánh).
- [ ] **K most frequent** — Top K Frequent Elements (347) · *pattern: hash đếm + heap size k* (thử thêm bản bucket sort O(n)).
- [ ] **K most frequent words** — Top K Frequent Words (692) · *pattern: heap với comparator phụ (count giảm, từ tăng theo alphabet)*.
- [ ] **Merge K sorted** — Merge k Sorted Lists (23) · *pattern: min-heap giữ đầu mỗi list*.
- [ ] **K closest points** — K Closest Points to Origin (973) · *pattern: max-heap size k theo distance*.
- [ ] **Two heaps** — Find Median from Data Stream (295) · *pattern: max-heap nửa nhỏ + min-heap nửa lớn*; rồi Sliding Window Median (480) để nâng cấp.
- [ ] **Scheduling** — Task Scheduler (621) · *pattern: max-heap theo tần suất + cooldown*; và Meeting Rooms II (253) · *pattern: min-heap theo end time*.
- [ ] **K-th trong cấu trúc đã sắp** — Kth Smallest Element in a Sorted Matrix (378) · *pattern: heap mở rộng biên giới*.
- [ ] **Greedy + PQ** — Last Stone Weight (1046) khởi động, rồi Network Delay Time (743) · *pattern: priority queue / Dijkstra*.

> Ghi nhớ cuối bài: Heap không phải để "sắp xếp" — nó là để **luôn biết cực trị trong khi dữ liệu thay đổi**. Mỗi khi đề có chữ "k", "frequent", hay "liên tục lấy min/max", hãy dừng lại hỏi: *heap size k có rẻ hơn sort không? Có cần stream không? Quickselect có gọn hơn không?* Trả lời được ba câu đó, bạn đã giải đúng hướng trước cả khi viết dòng code đầu tiên.
