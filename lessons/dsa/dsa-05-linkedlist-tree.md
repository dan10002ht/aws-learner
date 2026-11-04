# Linked List & Tree/BST

Hai cấu trúc này là "ranh giới" giữa người chỉ biết dùng `array`/`map` có sẵn và người thực sự hiểu cách dữ liệu được nối với nhau bằng **con trỏ (pointer/reference)**. Trong công việc thật bạn hiếm khi tự cài `linked list`, nhưng tư duy "node trỏ tới node" xuất hiện ở khắp nơi: LRU cache, undo/redo, cây thư mục, DOM, index của database (B-tree là họ hàng của BST). Trong phỏng vấn thì đây là nhóm câu hỏi *kinh điển nhất*.

Bài này tập trung vào phần **thực dụng**: nhận diện khi nào dùng, các thao tác lõi, và mẫu giải cho những bài toán hay gặp.

## Linked List là gì

Khác với `array` (các phần tử nằm liền nhau trong bộ nhớ, truy cập theo chỉ số `O(1)`), **linked list** là chuỗi các **node** rời rạc, mỗi node giữ một giá trị và một con trỏ `next` chỉ tới node kế tiếp.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 180" role="img" aria-labelledby="dsa05a-list-t dsa05a-list-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa05a-list-t">Linked list: mỗi node giữ value và next</title>
<desc id="dsa05a-list-d">Linked list: mỗi node giữ value và next; các vị trí và mũi tên biểu diễn dữ liệu cùng hướng thao tác.</desc>
<defs>
<marker id="dsa05a-list-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M0 0 L10 5 L0 10z" fill="#10b981"/>
</marker>
</defs>
<text x="260" y="25" text-anchor="middle" font-size="14" fill="currentColor">Linked list: mỗi node giữ value và next</text>
<text x="65" y="62" text-anchor="middle" font-size="14" fill="currentColor">head</text>
<path d="M65 70 L65 98" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa05a-list-ar)"/>
<rect x="25" y="105" width="95" height="45" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="72.5" y="132.5" text-anchor="middle" font-size="14" fill="currentColor">10</text>
<path d="M123 127 L160 127" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa05a-list-ar)"/>
<rect x="165" y="105" width="95" height="45" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="212.5" y="132.5" text-anchor="middle" font-size="14" fill="currentColor">20</text>
<path d="M263 127 L300 127" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa05a-list-ar)"/>
<rect x="305" y="105" width="95" height="45" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="352.5" y="132.5" text-anchor="middle" font-size="14" fill="currentColor">30</text>
<path d="M403 127 L440 127" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa05a-list-ar)"/>
<text x="470" y="132" text-anchor="middle" font-size="14" fill="currentColor">null</text>
</svg>

- **Singly linked list**: mỗi node chỉ có `next`.
- **Doubly linked list**: mỗi node có thêm `prev` (đi lùi được) — nền tảng của LRU cache, deque.

### Khi nào dùng

- Cần **chèn/xoá ở đầu (hoặc giữa) liên tục** mà không muốn dịch chuyển cả mảng. Chèn vào đầu list là `O(1)`; chèn vào đầu array là `O(n)`.
- Không cần **truy cập ngẫu nhiên theo index** (linked list phải đi tuần tự, lấy phần tử thứ k là `O(k)`).
- Thực tế: implement `Queue`/`Deque`, `LRU cache` (doubly), danh sách phát nhạc, lịch sử trình duyệt.

> Ghi nhớ: array thắng ở **đọc theo index** và **cache locality**; linked list thắng ở **chèn/xoá tại vị trí đã biết** vì chỉ cần đổi vài con trỏ. Nếu bạn vẫn phải *tìm* vị trí trước khi xoá thì lợi thế biến mất.

### Bảng độ phức tạp

| Thao tác | Array | Singly Linked List |
|---|---|---|
| Truy cập phần tử thứ k | O(1) | O(k) |
| Tìm theo giá trị | O(n) | O(n) |
| Chèn vào đầu | O(n) | O(1) |
| Chèn vào cuối | O(1)* | O(1) nếu có `tail`, ngược lại O(n) |
| Xoá node đã biết con trỏ | O(n) | O(1) với doubly; O(n) với singly |
| Bộ nhớ phụ | thấp | cao hơn (mỗi node có con trỏ) |

(*) array động `append` là `O(1)` amortized.

### Định nghĩa node & duyệt

```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def print_list(head):
    cur = head
    while cur:
        print(cur.val, end=" -> ")
        cur = cur.next
    print("null")
```

```javascript
class ListNode {
  constructor(val = 0, next = null) {
    this.val = val;
    this.next = next;
  }
}

function printList(head) {
  let cur = head;
  const parts = [];
  while (cur) { parts.push(cur.val); cur = cur.next; }
  console.log(parts.join(" -> ") + " -> null");
}
```

```java
class ListNode {
    int val;
    ListNode next;
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

void printList(ListNode head) {
    ListNode cur = head;
    StringBuilder sb = new StringBuilder();
    while (cur != null) { sb.append(cur.val).append(" -> "); cur = cur.next; }
    System.out.println(sb + "null");
}
```

```go
type ListNode struct {
    Val  int
    Next *ListNode
}

func printList(head *ListNode) {
    for cur := head; cur != nil; cur = cur.Next {
        fmt.Printf("%d -> ", cur.Val)
    }
    fmt.Println("null")
}
```

```cpp
struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v = 0, ListNode* n = nullptr) : val(v), next(n) {}
};

void printList(ListNode* head) {
    for (ListNode* cur = head; cur != nullptr; cur = cur->next) {
        std::cout << cur->val << " -> ";
    }
    std::cout << "null" << std::endl;
}
```

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 335" role="img" aria-labelledby="dsa05a-links-t dsa05a-links-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa05a-links-t">Linked list: tạo, nối, rồi xoá node 15</title>
<desc id="dsa05a-links-d">Node 15 nằm dưới khe giữa 10 và 20; mỗi cạnh cũ biến mất khi được thay, bước cuối chỉ còn 10 sang 20 sang 30.</desc>
<defs>
<marker id="dsa05a-links-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M0 0 L10 5 L0 10z" fill="#10b981"/>
</marker>
</defs>
<text x="260" y="25" text-anchor="middle" font-size="14" fill="currentColor">Linked list: tạo, nối, rồi xoá node 15</text>
<rect x="20" y="105" width="80" height="43" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="60.0" y="131.5" text-anchor="middle" font-size="14" fill="currentColor">10</text>
<rect x="230" y="105" width="80" height="43" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="270.0" y="131.5" text-anchor="middle" font-size="14" fill="currentColor">20</text>
<rect x="410" y="105" width="80" height="43" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="450.0" y="131.5" text-anchor="middle" font-size="14" fill="currentColor">30</text>
<text x="60" y="75" text-anchor="middle" font-size="14" fill="currentColor">head</text>
<path d="M60 80 L60 100" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa05a-links-ar)"/>
<path d="M315 126 L405 126" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#dsa05a-links-ar)"/>
<g data-step="1" data-until="2">
<path d="M105 126 L225 126" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#dsa05a-links-ar)"/>
</g>
<g data-step="4">
<path d="M105 126 L225 126" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa05a-links-ar)"/>
</g>
<g data-step="1" data-until="3">
<rect x="125" y="190" width="80" height="43" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
<text x="165.0" y="216.5" text-anchor="middle" font-size="14" fill="currentColor">15</text>
<text x="165" y="260" text-anchor="middle" font-size="13" fill="currentColor">new</text>
</g>
<g data-step="2" data-until="3">
<path d="M205 204 L250 153" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa05a-links-ar)"/>
</g>
<g data-step="3" data-until="3">
<path d="M80 153 L125 188" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa05a-links-ar)"/>
</g>
<g data-step="1" data-until="1">
<text x="260" y="305" text-anchor="middle" font-size="14" fill="currentColor">Tạo new = node(15)</text>
</g>
<g data-step="2" data-until="2">
<text x="260" y="305" text-anchor="middle" font-size="14" fill="currentColor">new.next = node20</text>
</g>
<g data-step="3" data-until="3">
<text x="260" y="305" text-anchor="middle" font-size="14" fill="currentColor">node10.next = new</text>
</g>
<g data-step="4">
<text x="260" y="305" text-anchor="middle" font-size="14" fill="currentColor">node10.next = node20; bỏ 15</text>
</g>
</svg>
<step-note data-step="1">Bắt đầu với 10 → 20 → 30, tạo node 15 ở dưới khe giữa 10 và 20. Chưa thay liên kết của list.</step-note>
<step-note data-step="2">Gán new.next = node10.next, tức node 20. Giữ đường tới phần còn lại trước khi sửa node10.next.</step-note>
<step-note data-step="3">Gán node10.next = new: cạnh 10 → 20 cũ biến mất, list thành 10 → 15 → 20 → 30. Chỉ đổi con trỏ, không dịch dữ liệu.</step-note>
<step-note data-step="4">Xoá 15 bằng node10.next = node10.next.next: cạnh 10 → 15 và node 15 biến mất, cạnh 10 → 20 trở lại. Có sẵn con trỏ node trước nên chèn/xoá này O(1).</step-note>
</step-flow>

### Tự tay thử: linked list

Thử **Chèn tại i** hoặc **Xoá giá trị**: con trỏ `cur` phải đi từ `head` tới đúng vị trí (O(n)), sau đó chỉ việc nối lại vài con trỏ `next` (O(1)). Bấm **Đảo ngược** và bật **Từng bước** để theo dõi ba con trỏ `prev`/`cur`/`next` giống đoạn code ở mục dưới.

<ds-playground data-type="linked-list" data-init="10,20,30">
</ds-playground>

## Đảo ngược linked list

Bài toán "must-know" số một. Ý tưởng: đi qua từng node, **bẻ ngược con trỏ** `next` về node phía trước. Dùng ba biến: `prev`, `cur`, `nxt`.

<step-flow>
<svg viewBox="0 0 760 590" role="img" aria-labelledby="dsa05a-t dsa05a-d" style="width:100%;max-width:760px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa05a-t">Đảo ngược linked list 1, 2, 3 bằng ba con trỏ prev, cur, nxt</title>
<desc id="dsa05a-d">Năm hàng: bắt đầu với prev = null và cur ở node 1; ba vòng lặp, mỗi vòng lưu nxt = cur.next, bẻ cur.next = prev, rồi dời prev = cur và cur = nxt; kết thúc khi cur = null, prev ở node 3 là head mới.</desc>
<defs>
<marker id="dsa05a-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker>
<marker id="dsa05a-arrB" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#3b82f6"/></marker>
</defs>
<text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">Đảo ngược [1]→[2]→[3]: mỗi vòng bẻ đúng một con trỏ next</text>
<line x1="16" y1="44" x2="38" y2="44" stroke="#3b82f6" stroke-width="2.4" marker-end="url(#dsa05a-arrB)"/>
<text x="46" y="49" font-size="13" fill="currentColor" opacity="0.8">con trỏ vừa bẻ trong vòng này; nhãn dưới node là vị trí lúc vừa bẻ, trước hai dòng dời</text>
<g data-step="1">
<rect x="8" y="66" width="744" height="96" rx="8" fill="currentColor" fill-opacity="0.03" stroke="currentColor" stroke-opacity="0.15"/>
<text x="20" y="86" font-size="14" font-weight="700" fill="currentColor">Bắt đầu</text>
<text x="20" y="104" font-size="13" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="currentColor" opacity="0.85">prev = null</text>
<text x="20" y="121" font-size="13" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="currentColor" opacity="0.85">cur = head = [1]</text>
<text x="300" y="110" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.75">null</text>
<text x="700" y="110" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.75">null</text>
<rect x="344" y="88" width="52" height="34" rx="8" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="370" y="110" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">1</text>
<rect x="454" y="88" width="52" height="34" rx="8" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="480" y="110" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">2</text>
<rect x="564" y="88" width="52" height="34" rx="8" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="590" y="110" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">3</text>
<line x1="396" y1="105" x2="451" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#dsa05a-arr)"/>
<line x1="506" y1="105" x2="561" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#dsa05a-arr)"/>
<line x1="616" y1="105" x2="680" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#dsa05a-arr)"/>
<text x="300" y="144" text-anchor="middle" font-size="13" font-weight="700" fill="#10b981">prev</text>
<text x="370" y="144" text-anchor="middle" font-size="13" font-weight="700" fill="#3b82f6">cur</text>
</g>
<g data-step="2">
<rect x="8" y="170" width="744" height="96" rx="8" fill="currentColor" fill-opacity="0.03" stroke="currentColor" stroke-opacity="0.15"/>
<text x="20" y="190" font-size="14" font-weight="700" fill="currentColor">Vòng 1</text>
<text x="20" y="208" font-size="13" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="currentColor" opacity="0.85">nxt = cur.next → [2]</text>
<text x="20" y="225" font-size="13" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="currentColor" opacity="0.85">cur.next = prev → null</text>
<text x="20" y="242" font-size="13" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="currentColor" opacity="0.85">prev = cur → [1]</text>
<text x="20" y="259" font-size="13" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="currentColor" opacity="0.85">cur = nxt → [2]</text>
<text x="235" y="208" font-size="13" fill="currentColor" opacity="0.6">lưu</text>
<text x="235" y="225" font-size="13" fill="#3b82f6">bẻ</text>
<text x="235" y="242" font-size="13" fill="currentColor" opacity="0.6">dời</text>
<text x="235" y="259" font-size="13" fill="currentColor" opacity="0.6">dời</text>
<text x="300" y="214" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.75">null</text>
<text x="700" y="214" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.75">null</text>
<rect x="344" y="192" width="52" height="34" rx="8" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="370" y="214" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">1</text>
<rect x="454" y="192" width="52" height="34" rx="8" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="480" y="214" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">2</text>
<rect x="564" y="192" width="52" height="34" rx="8" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="590" y="214" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">3</text>
<line x1="344" y1="209" x2="320" y2="209" stroke="#3b82f6" stroke-width="2.4" marker-end="url(#dsa05a-arrB)"/>
<line x1="506" y1="209" x2="561" y2="209" stroke="currentColor" stroke-width="1.5" marker-end="url(#dsa05a-arr)"/>
<line x1="616" y1="209" x2="680" y2="209" stroke="currentColor" stroke-width="1.5" marker-end="url(#dsa05a-arr)"/>
<text x="300" y="248" text-anchor="middle" font-size="13" font-weight="700" fill="#10b981">prev</text>
<text x="370" y="248" text-anchor="middle" font-size="13" font-weight="700" fill="#3b82f6">cur</text>
<text x="480" y="248" text-anchor="middle" font-size="13" font-weight="700" fill="#f59e0b">nxt</text>
</g>
<g data-step="3">
<rect x="8" y="274" width="744" height="96" rx="8" fill="currentColor" fill-opacity="0.03" stroke="currentColor" stroke-opacity="0.15"/>
<text x="20" y="294" font-size="14" font-weight="700" fill="currentColor">Vòng 2</text>
<text x="20" y="312" font-size="13" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="currentColor" opacity="0.85">nxt = cur.next → [3]</text>
<text x="20" y="329" font-size="13" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="currentColor" opacity="0.85">cur.next = prev → [1]</text>
<text x="20" y="346" font-size="13" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="currentColor" opacity="0.85">prev = cur → [2]</text>
<text x="20" y="363" font-size="13" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="currentColor" opacity="0.85">cur = nxt → [3]</text>
<text x="235" y="312" font-size="13" fill="currentColor" opacity="0.6">lưu</text>
<text x="235" y="329" font-size="13" fill="#3b82f6">bẻ</text>
<text x="235" y="346" font-size="13" fill="currentColor" opacity="0.6">dời</text>
<text x="235" y="363" font-size="13" fill="currentColor" opacity="0.6">dời</text>
<text x="300" y="318" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.75">null</text>
<text x="700" y="318" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.75">null</text>
<rect x="344" y="296" width="52" height="34" rx="8" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="370" y="318" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">1</text>
<rect x="454" y="296" width="52" height="34" rx="8" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="480" y="318" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">2</text>
<rect x="564" y="296" width="52" height="34" rx="8" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="590" y="318" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">3</text>
<line x1="344" y1="313" x2="320" y2="313" stroke="currentColor" stroke-width="1.5" marker-end="url(#dsa05a-arr)"/>
<line x1="454" y1="313" x2="399" y2="313" stroke="#3b82f6" stroke-width="2.4" marker-end="url(#dsa05a-arrB)"/>
<line x1="616" y1="313" x2="680" y2="313" stroke="currentColor" stroke-width="1.5" marker-end="url(#dsa05a-arr)"/>
<text x="370" y="352" text-anchor="middle" font-size="13" font-weight="700" fill="#10b981">prev</text>
<text x="480" y="352" text-anchor="middle" font-size="13" font-weight="700" fill="#3b82f6">cur</text>
<text x="590" y="352" text-anchor="middle" font-size="13" font-weight="700" fill="#f59e0b">nxt</text>
</g>
<g data-step="4">
<rect x="8" y="378" width="744" height="96" rx="8" fill="currentColor" fill-opacity="0.03" stroke="currentColor" stroke-opacity="0.15"/>
<text x="20" y="398" font-size="14" font-weight="700" fill="currentColor">Vòng 3</text>
<text x="20" y="416" font-size="13" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="currentColor" opacity="0.85">nxt = cur.next → null</text>
<text x="20" y="433" font-size="13" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="currentColor" opacity="0.85">cur.next = prev → [2]</text>
<text x="20" y="450" font-size="13" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="currentColor" opacity="0.85">prev = cur → [3]</text>
<text x="20" y="467" font-size="13" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="currentColor" opacity="0.85">cur = nxt → null</text>
<text x="235" y="416" font-size="13" fill="currentColor" opacity="0.6">lưu</text>
<text x="235" y="433" font-size="13" fill="#3b82f6">bẻ</text>
<text x="235" y="450" font-size="13" fill="currentColor" opacity="0.6">dời</text>
<text x="235" y="467" font-size="13" fill="currentColor" opacity="0.6">dời</text>
<text x="300" y="422" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.75">null</text>
<text x="700" y="422" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.75">null</text>
<rect x="344" y="400" width="52" height="34" rx="8" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="370" y="422" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">1</text>
<rect x="454" y="400" width="52" height="34" rx="8" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="480" y="422" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">2</text>
<rect x="564" y="400" width="52" height="34" rx="8" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="590" y="422" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">3</text>
<line x1="344" y1="417" x2="320" y2="417" stroke="currentColor" stroke-width="1.5" marker-end="url(#dsa05a-arr)"/>
<line x1="454" y1="417" x2="399" y2="417" stroke="currentColor" stroke-width="1.5" marker-end="url(#dsa05a-arr)"/>
<line x1="564" y1="417" x2="509" y2="417" stroke="#3b82f6" stroke-width="2.4" marker-end="url(#dsa05a-arrB)"/>
<text x="480" y="456" text-anchor="middle" font-size="13" font-weight="700" fill="#10b981">prev</text>
<text x="590" y="456" text-anchor="middle" font-size="13" font-weight="700" fill="#3b82f6">cur</text>
<text x="700" y="456" text-anchor="middle" font-size="13" font-weight="700" fill="#f59e0b">nxt</text>
</g>
<g data-step="5">
<rect x="8" y="482" width="744" height="96" rx="8" fill="currentColor" fill-opacity="0.03" stroke="currentColor" stroke-opacity="0.15"/>
<text x="20" y="502" font-size="14" font-weight="700" fill="currentColor">Kết thúc</text>
<text x="20" y="520" font-size="13" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="currentColor" opacity="0.85">cur = null: thoát while</text>
<text x="20" y="537" font-size="13" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="currentColor" opacity="0.85">return prev → [3]</text>
<text x="300" y="526" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.75">null</text>
<text x="700" y="526" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.75">null</text>
<rect x="344" y="504" width="52" height="34" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="370" y="526" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">1</text>
<rect x="454" y="504" width="52" height="34" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="480" y="526" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">2</text>
<rect x="564" y="504" width="52" height="34" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="590" y="526" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">3</text>
<line x1="344" y1="521" x2="320" y2="521" stroke="currentColor" stroke-width="1.5" marker-end="url(#dsa05a-arr)"/>
<line x1="454" y1="521" x2="399" y2="521" stroke="currentColor" stroke-width="1.5" marker-end="url(#dsa05a-arr)"/>
<line x1="564" y1="521" x2="509" y2="521" stroke="currentColor" stroke-width="1.5" marker-end="url(#dsa05a-arr)"/>
<text x="590" y="560" text-anchor="middle" font-size="13" font-weight="700" fill="#10b981">prev (head mới)</text>
<text x="700" y="560" text-anchor="middle" font-size="13" font-weight="700" fill="#3b82f6">cur</text>
</g>
</svg>
<step-note data-step="1"><code>prev = null</code> vì node đầu sẽ thành đuôi, <code>next</code> của nó phải trỏ về <code>null</code>. <code>cur</code> đứng ở head.</step-note>
<step-note data-step="2">Lưu <code>nxt</code> trước: ngay khi <code>[1].next = null</code>, đường duy nhất từ <code>[1]</code> tới <code>[2]</code> mất, chỉ còn <code>nxt</code> giữ <code>[2]</code>. Hai dòng dời sau đó đưa <code>prev</code>, <code>cur</code> sang phải đúng một ô.</step-note>
<step-note data-step="3">Bên trái <code>cur</code> là đoạn đã đảo (đầu đoạn là <code>prev</code>), từ <code>nxt</code> trở đi là đoạn chưa đụng tới. Mỗi vòng chuyển đúng một node từ đoạn này sang đoạn kia.</step-note>
<step-note data-step="4"><code>[3]</code> là node cuối nên <code>nxt = null</code>. Sau hai dòng dời, <code>cur = null</code> và điều kiện <code>while</code> sai.</step-note>
<step-note data-step="5">Trả <code>prev</code> vì <code>cur</code> đã là <code>null</code>. Mỗi node được bẻ đúng một lần: thời gian <code>O(n)</code>, bộ nhớ <code>O(1)</code>.</step-note>
</step-flow>

Khởi tạo `prev = null`, `cur = head` trên list `1 → 2 → 3`. Mỗi vòng: lưu `nxt`, bẻ `cur.next`, rồi dời `prev` và `cur` như hình trên.

```python
def reverse_list(head):
    prev = None
    cur = head
    while cur:
        nxt = cur.next   # lưu lại trước khi bẻ
        cur.next = prev  # bẻ ngược
        prev = cur       # dời prev
        cur = nxt        # dời cur
    return prev          # prev là head mới
```

```javascript
function reverseList(head) {
  let prev = null, cur = head;
  while (cur) {
    const nxt = cur.next;
    cur.next = prev;
    prev = cur;
    cur = nxt;
  }
  return prev;
}
```

```java
ListNode reverseList(ListNode head) {
    ListNode prev = null, cur = head;
    while (cur != null) {
        ListNode nxt = cur.next;
        cur.next = prev;
        prev = cur;
        cur = nxt;
    }
    return prev;
}
```

```go
func reverseList(head *ListNode) *ListNode {
    var prev *ListNode
    cur := head
    for cur != nil {
        nxt := cur.Next
        cur.Next = prev
        prev = cur
        cur = nxt
    }
    return prev
}
```

```cpp
ListNode* reverseList(ListNode* head) {
    ListNode* prev = nullptr;
    ListNode* cur = head;
    while (cur != nullptr) {
        ListNode* nxt = cur->next;  // lưu lại trước khi bẻ
        cur->next = prev;           // bẻ ngược
        prev = cur;                 // dời prev
        cur = nxt;                  // dời cur
    }
    return prev;                    // prev là head mới
}
```

Độ phức tạp: thời gian `O(n)`, bộ nhớ `O(1)`.

> Bẫy: phải **lưu `nxt = cur.next` trước** khi gán `cur.next = prev`. Nếu bẻ con trỏ trước thì bạn mất đường đi tới phần còn lại của list.

## Fast–slow pointer: phát hiện chu trình

Kỹ thuật "hai con trỏ chạy khác tốc độ" (thuật toán **Floyd / tortoise–hare**). Con trỏ `slow` đi 1 bước, `fast` đi 2 bước. Nếu list có **chu trình (cycle)**, sớm muộn `fast` sẽ "đuổi kịp" `slow` và hai con trỏ gặp nhau. Nếu không có chu trình, vòng lặp dừng khi `fast` hoặc `fast.next` là `null`.

Biến thể tốc độ 1/2 còn dùng để tìm **node giữa** (khi `fast` tới cuối thì `slow` ở giữa). Tìm **node thứ k từ cuối** dùng hai con trỏ cách nhau k node rồi tiến cùng tốc độ, không dùng quy tắc 1/2 của Floyd.

<auto-anim data-dur="10">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 526" role="img" aria-labelledby="fix-dsa05-floyd-t fix-dsa05-floyd-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif,system-ui,sans-serif">
<title id="fix-dsa05-floyd-t">Floyd gặp lần đầu tại E; list thẳng năm node dừng ở fast.next null</title>
<desc id="fix-dsa05-floyd-d">Floyd gặp lần đầu tại E; list thẳng năm node dừng ở fast.next null</desc>
<defs><marker id="fix-dsa05-floyd-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker></defs>
<text x="16" y="24" font-size="15" text-anchor="start" fill="currentColor">Floyd: slow +1, fast +2; bắt đầu cùng tại A</text><path d="M59 85 H103" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#fix-dsa05-floyd-a)"/><path d="M144 85 H188" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#fix-dsa05-floyd-a)"/><path d="M229 85 H313" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#fix-dsa05-floyd-a)"/><path d="M335 104 V168" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#fix-dsa05-floyd-a)"/><path d="M316 190 H232" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#fix-dsa05-floyd-a)"/><path d="M210 171 V107" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#fix-dsa05-floyd-a)"/><rect x="21" y="66" width="38" height="38" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="40" y="90" font-size="14" text-anchor="middle" fill="currentColor">A</text><rect x="106" y="66" width="38" height="38" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="125" y="90" font-size="14" text-anchor="middle" fill="currentColor">B</text><rect x="191" y="66" width="38" height="38" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="210" y="90" font-size="14" text-anchor="middle" fill="currentColor">C</text><rect x="316" y="66" width="38" height="38" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="335" y="90" font-size="14" text-anchor="middle" fill="currentColor">D</text><rect x="316" y="171" width="38" height="38" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="335" y="195" font-size="14" text-anchor="middle" fill="currentColor">E</text><rect x="191" y="171" width="38" height="38" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="210" y="195" font-size="14" text-anchor="middle" fill="currentColor">F</text><text x="400" y="91" font-size="13" text-anchor="start" fill="currentColor">F → C</text><text x="400" y="113" font-size="13" text-anchor="start" fill="currentColor">khép cycle</text><circle cx="40" cy="57" r="7" fill="#10b981"><animate attributeName="cx" values="40;125;210;335;335;335" keyTimes="0;0.2;0.4;0.6;0.8;1" dur="10s" repeatCount="indefinite" calcMode="discrete"/><animate attributeName="cy" values="57;57;57;57;162;162" keyTimes="0;0.2;0.4;0.6;0.8;1" dur="10s" repeatCount="indefinite" calcMode="discrete"/></circle><circle cx="34" cy="255" r="6" fill="#10b981"/><text x="48" y="260" font-size="13" text-anchor="start" fill="currentColor">slow</text><circle cx="40" cy="113" r="7" fill="#f59e0b"><animate attributeName="cx" values="40;210;335;210;335;335" keyTimes="0;0.2;0.4;0.6;0.8;1" dur="10s" repeatCount="indefinite" calcMode="discrete"/><animate attributeName="cy" values="113;113;218;113;218;218" keyTimes="0;0.2;0.4;0.6;0.8;1" dur="10s" repeatCount="indefinite" calcMode="discrete"/></circle><circle cx="138" cy="255" r="6" fill="#f59e0b"/><text x="152" y="260" font-size="13" text-anchor="start" fill="currentColor">fast</text><text x="16" y="289" font-size="13" text-anchor="start" fill="currentColor">(A,A) → (B,C) → (C,E) → (D,C) → (E,E)</text><text x="16" y="312" font-size="13" text-anchor="start" fill="currentColor">Vòng 4 gặp E: thuật toán dừng (hình lặp lại).</text><path d="M40 330 H440" stroke="currentColor" fill="none"/>
<text x="40" y="351" text-anchor="middle" font-size="13" fill="currentColor">0</text><text x="140" y="351" text-anchor="middle" font-size="13" fill="currentColor">1</text><text x="240" y="351" text-anchor="middle" font-size="13" fill="currentColor">2</text><text x="340" y="351" text-anchor="middle" font-size="13" fill="currentColor">3</text><text x="440" y="351" text-anchor="middle" font-size="13" fill="currentColor">4</text><circle cx="40" cy="330" r="5" fill="#8b5cf6"><animate attributeName="cx" values="40;140;240;340;440;440" keyTimes="0;0.2;0.4;0.6;0.8;1" dur="10s" repeatCount="indefinite" calcMode="discrete"/></circle>
<text x="16" y="382" font-size="15" text-anchor="start" fill="currentColor">List thẳng: sau 2 vòng, slow=3, fast=5</text><rect x="21" y="413" width="38" height="38" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="40" y="437" font-size="14" text-anchor="middle" fill="currentColor">1</text><path d="M59 432 H113" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#fix-dsa05-floyd-a)"/><rect x="116" y="413" width="38" height="38" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="135" y="437" font-size="14" text-anchor="middle" fill="currentColor">2</text><path d="M154 432 H208" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#fix-dsa05-floyd-a)"/><rect x="211" y="413" width="38" height="38" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="230" y="437" font-size="14" text-anchor="middle" fill="currentColor">3</text><path d="M249 432 H303" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#fix-dsa05-floyd-a)"/><rect x="306" y="413" width="38" height="38" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="325" y="437" font-size="14" text-anchor="middle" fill="currentColor">4</text><path d="M344 432 H398" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#fix-dsa05-floyd-a)"/><rect x="401" y="413" width="38" height="38" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="420" y="437" font-size="14" text-anchor="middle" fill="currentColor">5</text><text x="230" y="478" font-size="13" text-anchor="middle" fill="currentColor">slow</text><text x="420" y="478" font-size="13" text-anchor="middle" fill="currentColor">fast</text><text x="16" y="509" font-size="13" text-anchor="start" fill="currentColor">fast.next = null → dừng; slow là node giữa.</text>
</svg>
</auto-anim>

```python
def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False

def middle_node(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow
```

```javascript
function hasCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}

function middleNode(head) {
  let slow = head, fast = head;
  while (fast && fast.next) { slow = slow.next; fast = fast.next.next; }
  return slow;
}
```

```java
boolean hasCycle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) return true;
    }
    return false;
}

ListNode middleNode(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) { slow = slow.next; fast = fast.next.next; }
    return slow;
}
```

```go
func hasCycle(head *ListNode) bool {
    slow, fast := head, head
    for fast != nil && fast.Next != nil {
        slow = slow.Next
        fast = fast.Next.Next
        if slow == fast {
            return true
        }
    }
    return false
}

func middleNode(head *ListNode) *ListNode {
    slow, fast := head, head
    for fast != nil && fast.Next != nil {
        slow = slow.Next
        fast = fast.Next.Next
    }
    return slow
}
```

```cpp
bool hasCycle(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) return true;
    }
    return false;
}

ListNode* middleNode(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
    }
    return slow;
}
```

Thời gian `O(n)`, bộ nhớ `O(1)` — vượt trội so với cách dùng `set` lưu các node đã thăm (tốn `O(n)` bộ nhớ).

> Ghi nhớ: thấy yêu cầu **tìm giữa / phát hiện vòng lặp / node thứ k từ cuối** trên linked list mà cấm dùng bộ nhớ phụ — nghĩ tới **hai con trỏ**: tốc độ 1/2 cho tìm giữa/chu trình; cách nhau k node và cùng tốc độ cho node thứ k từ cuối.

## Binary Tree (cây nhị phân)

Mỗi node có giá trị và tối đa **hai con**: `left` và `right`. Không còn tuyến tính như list — đây là cấu trúc **phi tuyến, phân cấp**. Ứng dụng thực tế: cây thư mục, cây biểu thức, cây quyết định, và quan trọng nhất là nền tảng cho BST / heap / B-tree.

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
```

```javascript
class TreeNode {
  constructor(val = 0, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}
```

```java
class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}
```

```go
type TreeNode struct {
    Val   int
    Left  *TreeNode
    Right *TreeNode
}
```

```cpp
struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr)
        : val(v), left(l), right(r) {}
};
```

### Duyệt cây DFS: preorder / inorder / postorder

Ba kiểu **DFS (depth-first)** chỉ khác nhau ở **thứ tự xử lý node gốc** so với hai cây con:

- **Preorder** (Node → Left → Right): dùng khi cần xử lý cha trước con, ví dụ **sao chép cây**, in cấu trúc thư mục.
- **Inorder** (Left → Node → Right): với **BST** cho ra dãy **đã sắp xếp tăng dần** — đây là tính chất vàng.
- **Postorder** (Left → Right → Node): xử lý con trước cha, ví dụ **xoá/giải phóng cây**, tính kích thước thư mục, đánh giá cây biểu thức.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Ba thứ tự duyệt DFS trên cùng một cây nhị phân tìm kiếm</title>
  <desc>Cùng một BST cho ba dãy khác nhau: preorder Node-Left-Right, inorder Left-Node-Right (sắp xếp tăng dần), postorder Left-Right-Node.</desc>
  <defs>
    <marker id="dfsArr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker>
  </defs>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Cùng một cây — ba thứ tự duyệt khác nhau</text>
  <g stroke="currentColor" stroke-opacity="0.45" fill="none">
    <path d="M170 76 L110 132"/><path d="M170 76 L230 132"/>
    <path d="M110 152 L70 208"/><path d="M110 152 L150 208"/>
    <path d="M230 152 L270 208"/>
  </g>
  <g font-size="13" font-weight="700">
    <circle cx="170" cy="64" r="20" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.5"/><text x="170" y="69" text-anchor="middle" fill="currentColor">8</text>
    <circle cx="110" cy="140" r="20" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.5"/><text x="110" y="145" text-anchor="middle" fill="currentColor">3</text>
    <circle cx="230" cy="140" r="20" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.5"/><text x="230" y="145" text-anchor="middle" fill="currentColor">10</text>
    <circle cx="70" cy="220" r="20" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.5"/><text x="70" y="225" text-anchor="middle" fill="currentColor">1</text>
    <circle cx="150" cy="220" r="20" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.5"/><text x="150" y="225" text-anchor="middle" fill="currentColor">6</text>
    <circle cx="270" cy="220" r="20" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.5"/><text x="270" y="225" text-anchor="middle" fill="currentColor">14</text>
  </g>
  <g font-size="11.5">
    <rect x="350" y="56" width="354" height="78" rx="9" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="364" y="78" font-weight="700" fill="currentColor">Preorder · Node → Left → Right</text>
    <text x="364" y="98" fill="currentColor" opacity="0.75">cha trước con — sao chép cây, in cấu trúc</text>
    <text x="364" y="122" font-size="14" font-weight="700" fill="currentColor">8 · 3 · 1 · 6 · 10 · 14</text>
    <rect x="350" y="148" width="354" height="78" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="364" y="170" font-weight="700" fill="currentColor">Inorder · Left → Node → Right</text>
    <text x="364" y="190" fill="currentColor" opacity="0.75">với BST: dãy SẮP XẾP tăng dần</text>
    <text x="364" y="214" font-size="14" font-weight="700" fill="currentColor">1 · 3 · 6 · 8 · 10 · 14</text>
    <rect x="350" y="240" width="354" height="78" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="364" y="262" font-weight="700" fill="currentColor">Postorder · Left → Right → Node</text>
    <text x="364" y="282" fill="currentColor" opacity="0.75">con trước cha — xoá cây, tính cây biểu thức</text>
    <text x="364" y="306" font-size="14" font-weight="700" fill="currentColor">1 · 6 · 3 · 14 · 10 · 8</text>
  </g>
  <g stroke="#10b981" fill="none" marker-end="url(#dfsArr)" stroke-width="1.4" stroke-opacity="0.8">
    <path d="M70 244 Q90 290 108 290"/><path d="M132 290 Q140 290 145 244"/>
    <path d="M165 244 Q200 350 305 248"/>
  </g>
  <text x="170" y="372" font-size="11" text-anchor="middle" fill="#10b981" opacity="0.9">Inorder bám trái → gốc → phải = đọc cây từ trái sang phải</text>
  <text x="170" y="394" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.8">→ chính là dãy đã sắp xếp của BST</text>
</svg>

```python
def preorder(node, out):
    if not node: return
    out.append(node.val)
    preorder(node.left, out)
    preorder(node.right, out)

def inorder(node, out):
    if not node: return
    inorder(node.left, out)
    out.append(node.val)
    inorder(node.right, out)

def postorder(node, out):
    if not node: return
    postorder(node.left, out)
    postorder(node.right, out)
    out.append(node.val)
```

```javascript
function preorder(node, out) {
  if (!node) return;
  out.push(node.val);
  preorder(node.left, out);
  preorder(node.right, out);
}

function inorder(node, out) {
  if (!node) return;
  inorder(node.left, out);
  out.push(node.val);
  inorder(node.right, out);
}

function postorder(node, out) {
  if (!node) return;
  postorder(node.left, out);
  postorder(node.right, out);
  out.push(node.val);
}
```

```java
void preorder(TreeNode node, List<Integer> out) {
    if (node == null) return;
    out.add(node.val);
    preorder(node.left, out);
    preorder(node.right, out);
}

void inorder(TreeNode node, List<Integer> out) {
    if (node == null) return;
    inorder(node.left, out);
    out.add(node.val);
    inorder(node.right, out);
}

void postorder(TreeNode node, List<Integer> out) {
    if (node == null) return;
    postorder(node.left, out);
    postorder(node.right, out);
    out.add(node.val);
}
```

```go
func preorder(node *TreeNode, out *[]int) {
    if node == nil { return }
    *out = append(*out, node.Val)
    preorder(node.Left, out)
    preorder(node.Right, out)
}

func inorder(node *TreeNode, out *[]int) {
    if node == nil { return }
    inorder(node.Left, out)
    *out = append(*out, node.Val)
    inorder(node.Right, out)
}

func postorder(node *TreeNode, out *[]int) {
    if node == nil { return }
    postorder(node.Left, out)
    postorder(node.Right, out)
    *out = append(*out, node.Val)
}
```

```cpp
void preorder(TreeNode* node, std::vector<int>& out) {
    if (node == nullptr) return;
    out.push_back(node->val);
    preorder(node->left, out);
    preorder(node->right, out);
}

void inorder(TreeNode* node, std::vector<int>& out) {
    if (node == nullptr) return;
    inorder(node->left, out);
    out.push_back(node->val);
    inorder(node->right, out);
}

void postorder(TreeNode* node, std::vector<int>& out) {
    if (node == nullptr) return;
    postorder(node->left, out);
    postorder(node->right, out);
    out.push_back(node->val);
}
```

Cả ba đều `O(n)` thời gian (thăm mỗi node một lần) và `O(h)` bộ nhớ cho stack đệ quy, với `h` là chiều cao cây.

### Duyệt BFS level-order

**BFS (breadth-first)** đi theo **từng tầng** từ trên xuống, trái sang phải — dùng một `queue`. Hữu ích khi cần xử lý theo mức: in cây theo tầng, tìm độ sâu nhỏ nhất, tìm node bên phải nhất mỗi tầng.

```python
from collections import deque

def level_order(root):
    if not root: return []
    result, q = [], deque([root])
    while q:
        level = []
        for _ in range(len(q)):   # cố định số node của tầng hiện tại
            node = q.popleft()
            level.append(node.val)
            if node.left:  q.append(node.left)
            if node.right: q.append(node.right)
        result.append(level)
    return result
```

```javascript
function levelOrder(root) {
  if (!root) return [];
  const result = [], q = [root];
  let head = 0;
  while (head < q.length) {
    const level = [], size = q.length - head;
    for (let i = 0; i < size; i++) {
      const node = q[head++];
      level.push(node.val);
      if (node.left) q.push(node.left);
      if (node.right) q.push(node.right);
    }
    result.push(level);
  }
  return result;
}
```

```java
List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> result = new ArrayList<>();
    if (root == null) return result;
    Queue<TreeNode> q = new LinkedList<>();
    q.offer(root);
    while (!q.isEmpty()) {
        int size = q.size();
        List<Integer> level = new ArrayList<>();
        for (int i = 0; i < size; i++) {
            TreeNode node = q.poll();
            level.add(node.val);
            if (node.left != null)  q.offer(node.left);
            if (node.right != null) q.offer(node.right);
        }
        result.add(level);
    }
    return result;
}
```

```go
func levelOrder(root *TreeNode) [][]int {
    result := [][]int{}
    if root == nil { return result }
    q := []*TreeNode{root}
    for len(q) > 0 {
        size := len(q)
        level := []int{}
        for i := 0; i < size; i++ {
            node := q[0]
            q = q[1:]
            level = append(level, node.Val)
            if node.Left != nil  { q = append(q, node.Left) }
            if node.Right != nil { q = append(q, node.Right) }
        }
        result = append(result, level)
    }
    return result
}
```

```cpp
std::vector<std::vector<int>> levelOrder(TreeNode* root) {
    std::vector<std::vector<int>> result;
    if (root == nullptr) return result;
    std::queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        int size = q.size();              // cố định số node của tầng hiện tại
        std::vector<int> level;
        for (int i = 0; i < size; i++) {
            TreeNode* node = q.front();
            q.pop();
            level.push_back(node->val);
            if (node->left  != nullptr) q.push(node->left);
            if (node->right != nullptr) q.push(node->right);
        }
        result.push_back(level);
    }
    return result;
}
```

> Ghi nhớ: đề bài có chữ **"theo tầng / theo level / shortest path không trọng số"** → dùng **BFS + queue**. Đề bài về **đường đi gốc-tới-lá / kiểm tra cấu trúc đệ quy** → dùng **DFS**.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 490" role="img" aria-labelledby="dsa05a-bfs-t dsa05a-bfs-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa05a-bfs-t">BFS theo tầng: dequeue làm queue đổi</title>
<desc id="dsa05a-bfs-d">Mỗi node rời queue khi được xử lý; level và result thay tại chỗ, size mỗi tầng cố định dù các con được enqueue.</desc>
<defs>
<marker id="dsa05a-bfs-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M0 0 L10 5 L0 10z" fill="#10b981"/>
</marker>
</defs>
<text x="260" y="25" text-anchor="middle" font-size="14" fill="currentColor">BFS theo tầng: dequeue làm queue đổi</text>
<path d="M260 97 L130 123" fill="none" stroke="currentColor" stroke-width="2"/>
<path d="M260 97 L390 123" fill="none" stroke="currentColor" stroke-width="2"/>
<path d="M130 167 L65 203" fill="none" stroke="currentColor" stroke-width="2"/>
<path d="M130 167 L195 203" fill="none" stroke="currentColor" stroke-width="2"/>
<path d="M390 167 L450 203" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="260" cy="75" r="22" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="260" y="80" text-anchor="middle" font-size="14" fill="currentColor">8</text>
<circle cx="130" cy="145" r="22" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="130" y="150" text-anchor="middle" font-size="14" fill="currentColor">3</text>
<circle cx="390" cy="145" r="22" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="390" y="150" text-anchor="middle" font-size="14" fill="currentColor">10</text>
<circle cx="65" cy="225" r="22" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="65" y="230" text-anchor="middle" font-size="14" fill="currentColor">1</text>
<circle cx="195" cy="225" r="22" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="195" y="230" text-anchor="middle" font-size="14" fill="currentColor">6</text>
<circle cx="450" cy="225" r="22" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="450" y="230" text-anchor="middle" font-size="14" fill="currentColor">14</text>
<text x="260" y="285" text-anchor="middle" font-size="14" fill="currentColor">queue: front → back</text>
<rect x="100" y="302" width="100" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<rect x="210" y="302" width="100" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<rect x="320" y="302" width="100" height="42" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<g data-step="1" data-until="1">
<text x="150" y="329" text-anchor="middle" font-size="14" fill="currentColor">8</text>
<text x="260" y="329" text-anchor="middle" font-size="14" fill="currentColor">∅</text>
<text x="370" y="329" text-anchor="middle" font-size="14" fill="currentColor">∅</text>
</g>
<g data-step="2" data-until="2">
<text x="150" y="329" text-anchor="middle" font-size="14" fill="currentColor">3</text>
<text x="260" y="329" text-anchor="middle" font-size="14" fill="currentColor">10</text>
<text x="370" y="329" text-anchor="middle" font-size="14" fill="currentColor">∅</text>
</g>
<g data-step="2">
<circle cx="260" cy="75" r="26" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
</g>
<g data-step="2" data-until="2">
<circle cx="260" cy="75" r="29" fill="none" stroke="#f59e0b" stroke-width="3"/>
</g>
<g data-step="3" data-until="3">
<text x="150" y="329" text-anchor="middle" font-size="14" fill="currentColor">10</text>
<text x="260" y="329" text-anchor="middle" font-size="14" fill="currentColor">1</text>
<text x="370" y="329" text-anchor="middle" font-size="14" fill="currentColor">6</text>
</g>
<g data-step="3">
<circle cx="130" cy="145" r="26" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
</g>
<g data-step="3" data-until="3">
<circle cx="130" cy="145" r="29" fill="none" stroke="#f59e0b" stroke-width="3"/>
</g>
<g data-step="4" data-until="4">
<text x="150" y="329" text-anchor="middle" font-size="14" fill="currentColor">1</text>
<text x="260" y="329" text-anchor="middle" font-size="14" fill="currentColor">6</text>
<text x="370" y="329" text-anchor="middle" font-size="14" fill="currentColor">14</text>
</g>
<g data-step="4">
<circle cx="390" cy="145" r="26" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
</g>
<g data-step="4" data-until="4">
<circle cx="390" cy="145" r="29" fill="none" stroke="#f59e0b" stroke-width="3"/>
</g>
<g data-step="5" data-until="5">
<text x="150" y="329" text-anchor="middle" font-size="14" fill="currentColor">6</text>
<text x="260" y="329" text-anchor="middle" font-size="14" fill="currentColor">14</text>
<text x="370" y="329" text-anchor="middle" font-size="14" fill="currentColor">∅</text>
</g>
<g data-step="5">
<circle cx="65" cy="225" r="26" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
</g>
<g data-step="5" data-until="5">
<circle cx="65" cy="225" r="29" fill="none" stroke="#f59e0b" stroke-width="3"/>
</g>
<g data-step="6" data-until="6">
<text x="150" y="329" text-anchor="middle" font-size="14" fill="currentColor">14</text>
<text x="260" y="329" text-anchor="middle" font-size="14" fill="currentColor">∅</text>
<text x="370" y="329" text-anchor="middle" font-size="14" fill="currentColor">∅</text>
</g>
<g data-step="6">
<circle cx="195" cy="225" r="26" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
</g>
<g data-step="6" data-until="6">
<circle cx="195" cy="225" r="29" fill="none" stroke="#f59e0b" stroke-width="3"/>
</g>
<g data-step="7">
<text x="150" y="329" text-anchor="middle" font-size="14" fill="currentColor">∅</text>
<text x="260" y="329" text-anchor="middle" font-size="14" fill="currentColor">∅</text>
<text x="370" y="329" text-anchor="middle" font-size="14" fill="currentColor">∅</text>
</g>
<g data-step="7">
<circle cx="450" cy="225" r="26" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
</g>
<g data-step="7">
<circle cx="450" cy="225" r="29" fill="none" stroke="#f59e0b" stroke-width="3"/>
</g>
<text x="260" y="373" text-anchor="middle" font-size="14" fill="currentColor">level đang xét / vừa hoàn tất</text>
<g data-step="1" data-until="1">
<text x="260" y="399" text-anchor="middle" font-size="14" fill="currentColor">[]</text>
</g>
<g data-step="2" data-until="2">
<text x="260" y="399" text-anchor="middle" font-size="14" fill="currentColor">[8]</text>
</g>
<g data-step="3" data-until="3">
<text x="260" y="399" text-anchor="middle" font-size="14" fill="currentColor">[3]</text>
</g>
<g data-step="4" data-until="4">
<text x="260" y="399" text-anchor="middle" font-size="14" fill="currentColor">[3, 10]</text>
</g>
<g data-step="5" data-until="5">
<text x="260" y="399" text-anchor="middle" font-size="14" fill="currentColor">[1]</text>
</g>
<g data-step="6" data-until="6">
<text x="260" y="399" text-anchor="middle" font-size="14" fill="currentColor">[1, 6]</text>
</g>
<g data-step="7">
<text x="260" y="399" text-anchor="middle" font-size="14" fill="currentColor">[1, 6, 14]</text>
</g>
<text x="260" y="434" text-anchor="middle" font-size="14" fill="currentColor">result</text>
<g data-step="1" data-until="1">
<text x="260" y="460" text-anchor="middle" font-size="14" fill="currentColor">[]</text>
</g>
<g data-step="2" data-until="3">
<text x="260" y="460" text-anchor="middle" font-size="14" fill="currentColor">[[8]]</text>
</g>
<g data-step="4" data-until="6">
<text x="260" y="460" text-anchor="middle" font-size="14" fill="currentColor">[[8], [3, 10]]</text>
</g>
<g data-step="7">
<text x="260" y="460" text-anchor="middle" font-size="14" fill="currentColor">[[8], [3, 10], [1, 6, 14]]</text>
</g>
</svg>
<step-note data-step="1">Khởi tạo queue [8]. Chốt size = 1 cho tầng gốc, level rỗng.</step-note>
<step-note data-step="2">Pop 8, enqueue 3 và 10; đủ một node của tầng gốc nên lưu result [[8]]. Bắt đầu tầng tiếp theo với size = 2.</step-note>
<step-note data-step="3">Pop 3, enqueue 1 và 6; queue thành [10, 1, 6]. Chưa xử lý hai con mới vì tầng hiện tại còn node 10.</step-note>
<step-note data-step="4">Pop 10, enqueue 14; level [3, 10] hoàn tất. Queue [1, 6, 14] là tầng tiếp theo, chốt size = 3.</step-note>
<step-note data-step="5">Pop 1 là lá, không enqueue con; queue còn [6, 14]. Level mới là [1].</step-note>
<step-note data-step="6">Pop 6 là lá, queue còn [14]. Level đang xử lý thành [1, 6], chưa đưa vào result.</step-note>
<step-note data-step="7">Pop 14, queue rỗng và lưu level [1, 6, 14]; hoàn tất kết quả ba tầng trong O(n) time. Queue logic O(w), riêng mảng nền JavaScript dùng head index giữ O(n).</step-note>
</step-flow>

## Binary Search Tree (BST)

Trong bài này BST lưu các giá trị phân biệt (không chèn trùng). BST là binary tree có thêm **bất biến sắp xếp**: với mọi node, **mọi giá trị bên trái nhỏ hơn** node, **mọi giá trị bên phải lớn hơn** node. Nhờ đó tìm/thêm/xoá chỉ cần đi xuống một nhánh — `O(h)`.

Cây minh hoạ bên dưới có gốc 8, hai con 3 và 10; node 3 có hai con 1 và 6, node 10 có con phải 14.

Inorder của cây trên: `1 3 6 8 10 14` — **luôn sắp xếp**. Đây là cách kiểm tra một cây có phải BST hợp lệ hay không.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 345" role="img" aria-labelledby="dsa05-insert-t dsa05-insert-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa05-insert-t">Chèn một giá trị vào BST</title>
<desc id="dsa05-insert-d">Theo đường 8 sang trái tới 3, sang phải tới 6 rồi chèn 5 vào con trái đang rỗng.</desc>
<text x="260" y="24" font-size="14" text-anchor="middle" fill="currentColor">Chèn 5 vào BST (các giá trị phân biệt)</text>
<path d="M260 84 L130 121" fill="none" stroke="currentColor" stroke-opacity="0.3"/>
<path d="M260 84 L390 121" fill="none" stroke="currentColor" stroke-opacity="0.3"/>
<path d="M130 159 L65 201" fill="none" stroke="currentColor" stroke-opacity="0.3"/>
<path d="M130 159 L195 201" fill="none" stroke="currentColor" stroke-opacity="0.3"/>
<path d="M390 159 L450 201" fill="none" stroke="currentColor" stroke-opacity="0.3"/>
<circle cx="260" cy="65" r="21" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="260" y="70" font-size="14" text-anchor="middle" fill="currentColor">8</text>
<circle cx="130" cy="140" r="21" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="130" y="145" font-size="14" text-anchor="middle" fill="currentColor">3</text>
<circle cx="390" cy="140" r="21" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="390" y="145" font-size="14" text-anchor="middle" fill="currentColor">10</text>
<circle cx="65" cy="220" r="21" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="65" y="225" font-size="14" text-anchor="middle" fill="currentColor">1</text>
<circle cx="195" cy="220" r="21" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="195" y="225" font-size="14" text-anchor="middle" fill="currentColor">6</text>
<circle cx="450" cy="220" r="21" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="450" y="225" font-size="14" text-anchor="middle" fill="currentColor">14</text>
<defs>
<marker id="dsa05-insert-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M0 0 L10 5 L0 10z" fill="#10b981"/>
</marker>
</defs>
<g data-step="1">
<path d="M260 87 L130 117" fill="none" stroke="#10b981" stroke-width="3" marker-end="url(#dsa05-insert-ar)"/>
<text x="153" y="84" font-size="13" text-anchor="middle" fill="currentColor">5 &lt; 8</text>
</g>
<g data-step="2">
<path d="M130 162 L195 197" fill="none" stroke="#10b981" stroke-width="3" marker-end="url(#dsa05-insert-ar)"/>
<text x="219" y="168" font-size="13" text-anchor="middle" fill="currentColor">5 &gt; 3</text>
</g>
<g data-step="3">
<path d="M187 241 L145 286" fill="none" stroke="#10b981" stroke-width="3" marker-end="url(#dsa05-insert-ar)"/>
<text x="238" y="277" font-size="13" text-anchor="middle" fill="currentColor">5 &lt; 6; trái rỗng</text>
<circle cx="130" cy="310" r="21" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
<text x="130" y="315" font-size="14" text-anchor="middle" fill="currentColor">5</text>
</g>
</svg>
<step-note data-step="1">5 nhỏ hơn 8, nên bất biến BST loại toàn bộ cây con phải khỏi tìm kiếm.</step-note>
<step-note data-step="2">5 lớn hơn 3; tiếp tục ở cây con phải, không cần xét node 1.</step-note>
<step-note data-step="3">5 nhỏ hơn 6 và vị trí con trái còn rỗng: gắn node mới tại đây, giữ bất biến sắp xếp.</step-note>
</step-flow>

### Tìm & thêm

```python
def search_bst(root, target):
    cur = root
    while cur:
        if target == cur.val: return cur
        cur = cur.left if target < cur.val else cur.right
    return None

def insert_bst(root, val):
    if not root: return TreeNode(val)
    if val < root.val:
        root.left = insert_bst(root.left, val)
    else:
        root.right = insert_bst(root.right, val)
    return root
```

```javascript
function searchBst(root, target) {
  let cur = root;
  while (cur) {
    if (target === cur.val) return cur;
    cur = target < cur.val ? cur.left : cur.right;
  }
  return null;
}

function insertBst(root, val) {
  if (!root) return new TreeNode(val);
  if (val < root.val) root.left = insertBst(root.left, val);
  else root.right = insertBst(root.right, val);
  return root;
}
```

```java
TreeNode searchBst(TreeNode root, int target) {
    TreeNode cur = root;
    while (cur != null) {
        if (target == cur.val) return cur;
        cur = target < cur.val ? cur.left : cur.right;
    }
    return null;
}

TreeNode insertBst(TreeNode root, int val) {
    if (root == null) return new TreeNode(val);
    if (val < root.val) root.left = insertBst(root.left, val);
    else root.right = insertBst(root.right, val);
    return root;
}
```

```go
func searchBst(root *TreeNode, target int) *TreeNode {
    cur := root
    for cur != nil {
        if target == cur.Val { return cur }
        if target < cur.Val {
            cur = cur.Left
        } else {
            cur = cur.Right
        }
    }
    return nil
}

func insertBst(root *TreeNode, val int) *TreeNode {
    if root == nil { return &TreeNode{Val: val} }
    if val < root.Val {
        root.Left = insertBst(root.Left, val)
    } else {
        root.Right = insertBst(root.Right, val)
    }
    return root
}
```

```cpp
TreeNode* searchBst(TreeNode* root, int target) {
    TreeNode* cur = root;
    while (cur != nullptr) {
        if (target == cur->val) return cur;
        cur = target < cur->val ? cur->left : cur->right;
    }
    return nullptr;
}

TreeNode* insertBst(TreeNode* root, int val) {
    if (root == nullptr) return new TreeNode(val);
    if (val < root->val) root->left = insertBst(root->left, val);
    else root->right = insertBst(root->right, val);
    return root;
}
```

### Xoá node

Ba trường hợp khi xoá node `target`:
1. **Không có con**: bỏ luôn (trả `null`).
2. **Một con**: nối thẳng node cha tới đứa con duy nhất.
3. **Hai con**: tìm **node kế vị inorder** (giá trị nhỏ nhất của cây con phải), chép giá trị đó lên, rồi xoá node kế vị đó (node này chắc chắn rơi vào case 1 hoặc 2).

```python
def delete_bst(root, key):
    if not root: return None
    if key < root.val:
        root.left = delete_bst(root.left, key)
    elif key > root.val:
        root.right = delete_bst(root.right, key)
    else:
        if not root.left:  return root.right
        if not root.right: return root.left
        succ = root.right          # node kế vị inorder
        while succ.left:
            succ = succ.left
        root.val = succ.val
        root.right = delete_bst(root.right, succ.val)
    return root
```

```javascript
function deleteBst(root, key) {
  if (!root) return null;
  if (key < root.val) root.left = deleteBst(root.left, key);
  else if (key > root.val) root.right = deleteBst(root.right, key);
  else {
    if (!root.left) return root.right;
    if (!root.right) return root.left;
    let succ = root.right;
    while (succ.left) succ = succ.left;
    root.val = succ.val;
    root.right = deleteBst(root.right, succ.val);
  }
  return root;
}
```

```java
TreeNode deleteBst(TreeNode root, int key) {
    if (root == null) return null;
    if (key < root.val) root.left = deleteBst(root.left, key);
    else if (key > root.val) root.right = deleteBst(root.right, key);
    else {
        if (root.left == null) return root.right;
        if (root.right == null) return root.left;
        TreeNode succ = root.right;
        while (succ.left != null) succ = succ.left;
        root.val = succ.val;
        root.right = deleteBst(root.right, succ.val);
    }
    return root;
}
```

```go
func deleteBst(root *TreeNode, key int) *TreeNode {
    if root == nil { return nil }
    if key < root.Val {
        root.Left = deleteBst(root.Left, key)
    } else if key > root.Val {
        root.Right = deleteBst(root.Right, key)
    } else {
        if root.Left == nil { return root.Right }
        if root.Right == nil { return root.Left }
        succ := root.Right
        for succ.Left != nil { succ = succ.Left }
        root.Val = succ.Val
        root.Right = deleteBst(root.Right, succ.Val)
    }
    return root
}
```

```cpp
TreeNode* deleteBst(TreeNode* root, int key) {
    if (root == nullptr) return nullptr;
    if (key < root->val) {
        root->left = deleteBst(root->left, key);
    } else if (key > root->val) {
        root->right = deleteBst(root->right, key);
    } else {
        if (root->left == nullptr)  return root->right;
        if (root->right == nullptr) return root->left;
        TreeNode* succ = root->right;          // node kế vị inorder
        while (succ->left != nullptr) succ = succ->left;
        root->val = succ->val;
        root->right = deleteBst(root->right, succ->val);
    }
    return root;
}
```

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 330" role="img" aria-labelledby="dsa05a-delete-t dsa05a-delete-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa05a-delete-t">Xoá BST: đổi gốc và nối lại con phải</title>
<desc id="dsa05a-delete-d">Giá trị gốc 8 biến mất, thay bằng 10 tại cùng toạ độ; node kế vị cũ được xoá và node 14 dời lên làm con phải trực tiếp.</desc>
<defs>
<marker id="dsa05a-delete-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M0 0 L10 5 L0 10z" fill="#10b981"/>
</marker>
</defs>
<text x="260" y="25" text-anchor="middle" font-size="14" fill="currentColor">Xoá BST: đổi gốc và nối lại con phải</text>
<path d="M260 97 L130 123" fill="none" stroke="currentColor" stroke-width="2"/>
<path d="M130 167 L65 203" fill="none" stroke="currentColor" stroke-width="2"/>
<path d="M130 167 L195 203" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="260" cy="75" r="22" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<g data-step="1" data-until="1">
<text x="260" y="80" text-anchor="middle" font-size="14" fill="currentColor">8</text>
</g>
<g data-step="2">
<text x="260" y="80" text-anchor="middle" font-size="14" fill="currentColor">10</text>
</g>
<circle cx="130" cy="145" r="22" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="130" y="150" text-anchor="middle" font-size="14" fill="currentColor">3</text>
<circle cx="65" cy="225" r="22" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="65" y="230" text-anchor="middle" font-size="14" fill="currentColor">1</text>
<circle cx="195" cy="225" r="22" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="195" y="230" text-anchor="middle" font-size="14" fill="currentColor">6</text>
<g data-step="1" data-until="2">
<path d="M260 97 L390 123" fill="none" stroke="currentColor" stroke-width="2"/>
<path d="M390 167 L450 203" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="390" cy="145" r="22" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="390" y="150" text-anchor="middle" font-size="14" fill="currentColor">10</text>
<circle cx="450" cy="225" r="22" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="450" y="230" text-anchor="middle" font-size="14" fill="currentColor">14</text>
</g>
<g data-step="1" data-until="1">
<circle cx="390" cy="145" r="27" fill="none" stroke="#10b981" stroke-width="3"/>
</g>
<g data-step="2" data-until="2">
<path d="M365 130 L284 86" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa05a-delete-ar)"/>
</g>
<g data-step="3">
<path d="M260 97 L390 123" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#dsa05a-delete-ar)"/>
<circle cx="390" cy="145" r="22" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
<text x="390" y="150" text-anchor="middle" font-size="14" fill="currentColor">14</text>
</g>
<g data-step="1" data-until="1">
<text x="260" y="295" text-anchor="middle" font-size="14" fill="currentColor">Tìm kế vị: 10 không có con trái</text>
</g>
<g data-step="2" data-until="2">
<text x="260" y="295" text-anchor="middle" font-size="14" fill="currentColor">root.val = 10; còn hai node giá trị 10</text>
</g>
<g data-step="3">
<text x="260" y="295" text-anchor="middle" font-size="14" fill="currentColor">Xoá 10 cũ; root.right = node14</text>
</g>
</svg>
<step-note data-step="1">Xoá key 8 có hai con: sang cây con phải tìm kế vị nhỏ nhất. Node 10 không có con trái nên là kế vị.</step-note>
<step-note data-step="2">Chép succ.val lên root.val: số 8 trong gốc biến mất, thay bằng 10 tại chỗ. Tạm thời còn node 10 cũ ở cây con phải.</step-note>
<step-note data-step="3">Xoá node 10 cũ chỉ có con phải 14, trả về 14 để gốc nối thẳng tới nó. Node 14 dời lên, cạnh cũ biến mất; inorder cuối [1, 3, 6, 10, 14], tổng O(h).</step-note>
</step-flow>

### Tự tay thử: BST

Cây dưới đây cùng dữ liệu với hình chèn ở trên. Thử **Tìm** và **Chèn** để thấy đường đi chỉ rẽ trái/phải ở mỗi tầng (O(h)). **Xoá** đủ ba trường hợp: một lá (1), một node một con, và gốc 8 có hai con (thay bằng successor nhỏ nhất bên phải). Các nút **Inorder**/**Preorder**/**Postorder**/**BFS** tô lần lượt từng node và ghi dãy kết quả. Thử **Đặt lại** rồi chèn dãy tăng dần 1, 2, 3, 4, 5 để thấy cây suy biến thành một đường thẳng, độ cao tăng theo n.

<ds-playground data-type="bst" data-init="8,3,10,1,6,14">
</ds-playground>

### Độ cao & cân bằng (ý tưởng)

- **Chiều cao (height)** `h` = số cạnh trên đường đi dài nhất từ gốc xuống lá. Tìm/thêm/xoá BST là `O(h + 1)` (thường viết gọn `O(h)` khi h ≥ 1); duyệt toàn cây vẫn là `O(n)`.
- Cây **cân bằng (balanced)**: `h ≈ log₂(n)` → thao tác `O(log n)`, rất nhanh.
- Cây **suy biến (skewed)**: nếu chèn dữ liệu *đã sắp xếp sẵn* vào BST thường, cây biến thành một "danh sách dọc", `h = n - 1` → thao tác tụt về `O(n)`.

> Bẫy: BST chỉ nhanh khi **cân bằng**. Trong sản phẩm thật, đừng tự cài BST thường rồi đổ dữ liệu sắp xếp vào — hãy dùng **self-balancing tree** (AVL, Red-Black). Thực tế `TreeMap` của Java, `std::map` của C++ chính là Red-Black tree; Python/Go thì thường dùng thẳng hash map (`dict`/`map`) trừ khi cần thứ tự.

| Thao tác BST | Cây cân bằng | Cây suy biến |
|---|---|---|
| search | O(log n) | O(n) |
| insert | O(log n) | O(n) |
| delete | O(log n) | O(n) |
| inorder (liệt kê có thứ tự) | O(n) | O(n) |

## Hai bài toán điển hình

**Bài 1 — Kiểm tra một cây có phải BST hợp lệ (Validate BST).**
Hướng giải: KHÔNG chỉ so node với hai con trực tiếp (sai khi cháu vi phạm bất biến). Đi DFS và truyền xuống **khoảng hợp lệ `(low, high)`**: node phải nằm trong khoảng, sang trái thì siết `high = node.val`, sang phải thì siết `low = node.val`. Cách thứ hai gọn không kém: làm **inorder** rồi kiểm tra dãy thu được có **tăng nghiêm ngặt** hay không.

**Bài 2 — Độ sâu lớn nhất của cây (Maximum Depth).**
Hướng giải kinh điển cho đệ quy cây: `depth(node) = 0` nếu node rỗng, ngược lại `1 + max(depth(left), depth(right))`. Đây là khung sườn (xử lý Left/Right rồi kết hợp tại Node — đúng kiểu postorder) tái dùng được cho hàng loạt bài: đếm node, tổng đường đi, kiểm tra cây cân bằng, đường kính cây (diameter).

> Ghi nhớ: phần lớn bài tree trong phỏng vấn là một biến thể của "DFS đệ quy, xử lý hai cây con rồi kết hợp tại node". Nắm chắc khung postorder `return f(left, right, node)` là gỡ được đa số.

Ví dụ phản chứng: gốc 8, con trái 3 (con 1 và 6), con phải 10 có con trái 7.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 330" role="img" aria-labelledby="dsg05-bounds-t dsg05-bounds-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsg05-bounds-t">Validate BST: ràng buộc từ tổ tiên</title>
<desc id="dsg05-bounds-d">Validate BST: ràng buộc từ tổ tiên</desc>
<defs><marker id="dsg05-bounds-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260.0" y="24" text-anchor="middle" font-size="16" fill="currentColor">Validate BST: ràng buộc từ tổ tiên</text>
<path d="M260 86 L120 124" fill="none" stroke="currentColor" marker-end="url(#dsg05-bounds-a)"/>
<path d="M260 86 L400 124" fill="none" stroke="currentColor" marker-end="url(#dsg05-bounds-a)"/>
<path d="M120 166 L55 214" fill="none" stroke="currentColor" marker-end="url(#dsg05-bounds-a)"/>
<path d="M120 166 L180 214" fill="none" stroke="currentColor" marker-end="url(#dsg05-bounds-a)"/>
<path d="M400 166 L335 214" fill="none" stroke="currentColor" marker-end="url(#dsg05-bounds-a)"/>
<rect x="238" y="44" width="44" height="42" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="260" y="70" text-anchor="middle" font-size="16" fill="currentColor">8</text>
<rect x="98" y="124" width="44" height="42" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="120" y="150" text-anchor="middle" font-size="16" fill="currentColor">3</text>
<rect x="378" y="124" width="44" height="42" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="400" y="150" text-anchor="middle" font-size="16" fill="currentColor">10</text>
<rect x="33" y="214" width="44" height="42" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="55" y="240" text-anchor="middle" font-size="16" fill="currentColor">1</text>
<rect x="158" y="214" width="44" height="42" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="180" y="240" text-anchor="middle" font-size="16" fill="currentColor">6</text>
<rect x="313" y="214" width="44" height="42" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="335" y="240" text-anchor="middle" font-size="16" fill="currentColor">7</text>
<g data-step="1" data-until="1"><text x="260" y="300" text-anchor="middle" font-size="14" fill="currentColor">Gốc 8: (−∞,+∞)</text><circle cx="260" cy="65" r="27" fill="none" stroke="#f59e0b" stroke-width="3"/></g>
<g data-step="2" data-until="2"><text x="260" y="300" text-anchor="middle" font-size="14" fill="currentColor">Con phải 10: (8,+∞)</text><circle cx="400" cy="145" r="27" fill="none" stroke="#f59e0b" stroke-width="3"/></g>
<g data-step="3"><text x="260" y="300" text-anchor="middle" font-size="14" fill="currentColor">Con trái của 10: (8,10); 7 không hợp lệ</text><circle cx="335" cy="235" r="27" fill="none" stroke="#f59e0b" stroke-width="3"/></g>
</svg>
<step-note data-step="1">Gốc chưa có giới hạn; sang cây con phải sẽ đặt low=8.</step-note>
<step-note data-step="2">Node 10 hợp lệ; sang trái của nó giữ low=8 và siết high=10.</step-note>
<step-note data-step="3">Node 7 nhỏ hơn cha 10 nhưng vi phạm low=8 từ gốc. Phải truyền cả khoảng, không chỉ so với cha.</step-note>
</step-flow>

Cây <code>[8,3,10,1,6,14]</code> dùng ở playground: tính từ lá lên gốc.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 340" role="img" aria-labelledby="dsg05-depth-t dsg05-depth-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsg05-depth-t">Maximum Depth: nhận kết quả từ hai con</title>
<desc id="dsg05-depth-d">Maximum Depth: nhận kết quả từ hai con</desc>
<defs><marker id="dsg05-depth-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260.0" y="24" text-anchor="middle" font-size="16" fill="currentColor">Maximum Depth: nhận kết quả từ hai con</text>
<path d="M260 85 L120 125" fill="none" stroke="currentColor" marker-end="url(#dsg05-depth-a)"/>
<path d="M260 85 L400 125" fill="none" stroke="currentColor" marker-end="url(#dsg05-depth-a)"/>
<path d="M120 165 L55 205" fill="none" stroke="currentColor" marker-end="url(#dsg05-depth-a)"/>
<path d="M120 165 L180 205" fill="none" stroke="currentColor" marker-end="url(#dsg05-depth-a)"/>
<path d="M400 165 L455 205" fill="none" stroke="currentColor" marker-end="url(#dsg05-depth-a)"/>
<rect x="238" y="45" width="44" height="40" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="260" y="70" text-anchor="middle" font-size="16" fill="currentColor">8</text>
<rect x="98" y="125" width="44" height="40" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="120" y="150" text-anchor="middle" font-size="16" fill="currentColor">3</text>
<rect x="378" y="125" width="44" height="40" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="400" y="150" text-anchor="middle" font-size="16" fill="currentColor">10</text>
<rect x="33" y="205" width="44" height="40" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="55" y="230" text-anchor="middle" font-size="16" fill="currentColor">1</text>
<rect x="158" y="205" width="44" height="40" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="180" y="230" text-anchor="middle" font-size="16" fill="currentColor">6</text>
<rect x="433" y="205" width="44" height="40" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="455" y="230" text-anchor="middle" font-size="16" fill="currentColor">14</text>
<g data-step="1"><text x="55" y="268" text-anchor="middle" font-size="13" fill="currentColor">depth=1</text><text x="180" y="268" text-anchor="middle" font-size="13" fill="currentColor">depth=1</text><text x="455" y="268" text-anchor="middle" font-size="13" fill="currentColor">depth=1</text></g>
<g data-step="1" data-until="1"><text x="260" y="307" text-anchor="middle" font-size="14" fill="currentColor">Lá: 1 + max(0,0) = 1</text></g>
<g data-step="2"><text x="120" y="188" text-anchor="middle" font-size="13" fill="currentColor">depth=2</text><text x="400" y="188" text-anchor="middle" font-size="13" fill="currentColor">depth=2</text></g>
<g data-step="2" data-until="2"><text x="260" y="307" text-anchor="middle" font-size="14" fill="currentColor">Cha: 1 + max(độ sâu hai con) = 2</text></g>
<g data-step="3"><text x="260" y="108" text-anchor="middle" font-size="13" fill="currentColor">depth=3</text></g>
<g data-step="3"><text x="260" y="307" text-anchor="middle" font-size="14" fill="currentColor">Gốc: 1 + max(2,2) = 3</text></g>
</svg>
<step-note data-step="1">Cây rỗng trả 0; mỗi lá nhận hai số 0 nên trả 1.</step-note>
<step-note data-step="2">Node 3 trả 1+max(1,1)=2; node 10 có con trái rỗng nên trả 1+max(0,1)=2.</step-note>
<step-note data-step="3">Gốc kết hợp sau khi hai con đã trả về: depth=3 node. Height tính bằng cạnh của cây này là 2.</step-note>
</step-flow>
