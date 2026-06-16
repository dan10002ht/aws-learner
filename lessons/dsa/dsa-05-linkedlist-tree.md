# Linked List & Tree/BST

Hai cấu trúc này là "ranh giới" giữa người chỉ biết dùng `array`/`map` có sẵn và người thực sự hiểu cách dữ liệu được nối với nhau bằng **con trỏ (pointer/reference)**. Trong công việc thật bạn hiếm khi tự cài `linked list`, nhưng tư duy "node trỏ tới node" xuất hiện ở khắp nơi: LRU cache, undo/redo, cây thư mục, DOM, index của database (B-tree là họ hàng của BST). Trong phỏng vấn thì đây là nhóm câu hỏi *kinh điển nhất*.

Bài này tập trung vào phần **thực dụng**: nhận diện khi nào dùng, các thao tác lõi, và mẫu giải cho những bài toán hay gặp.

## Linked List là gì

Khác với `array` (các phần tử nằm liền nhau trong bộ nhớ, truy cập theo chỉ số `O(1)`), **linked list** là chuỗi các **node** rời rạc, mỗi node giữ một giá trị và một con trỏ `next` chỉ tới node kế tiếp.

```
[10|•] -> [20|•] -> [30|•] -> null
 head
```

- **Singly linked list**: mỗi node chỉ có `next`.
- **Doubly linked list**: mỗi node có thêm `prev` (đi lùi được) — nền tảng của LRU cache, deque.

### Khi nào dùng

- Cần **chèn/xoá ở đầu (hoặc giữa) liên tục** mà không muốn dịch chuyển cả mảng. Chèn vào đầu list là `O(1)`; chèn vào đầu array là `O(n)`.
- Không cần **truy cập ngẫu nhiên theo index** (linked list phải đi tuần tự, lấy phần tử thứ k là `O(k)`).
- Thực tế: implement `Queue`/`Deque`, `LRU cache` (doubly), danh sách phát nhạc, lịch sử trình duyệt.

> 💡 Ghi nhớ: array thắng ở **đọc theo index** và **cache locality**; linked list thắng ở **chèn/xoá tại vị trí đã biết** vì chỉ cần đổi vài con trỏ. Nếu bạn vẫn phải *tìm* vị trí trước khi xoá thì lợi thế biến mất.

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

## Đảo ngược linked list

Bài toán "must-know" số một. Ý tưởng: đi qua từng node, **bẻ ngược con trỏ** `next` về node phía trước. Dùng ba biến: `prev`, `cur`, `nxt`.

```
prev=null  cur=[1]->[2]->[3]
mỗi bước: nxt = cur.next ; cur.next = prev ; prev = cur ; cur = nxt
```

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

> ⚠️ Bẫy: phải **lưu `nxt = cur.next` trước** khi gán `cur.next = prev`. Nếu bẻ con trỏ trước thì bạn mất đường đi tới phần còn lại của list.

## Fast–slow pointer: phát hiện chu trình

Kỹ thuật "hai con trỏ chạy khác tốc độ" (thuật toán **Floyd / tortoise–hare**). Con trỏ `slow` đi 1 bước, `fast` đi 2 bước. Nếu list có **chu trình (cycle)**, sớm muộn `fast` sẽ "đuổi kịp" `slow` và hai con trỏ gặp nhau. Nếu không có chu trình, `fast` sẽ chạm `null` rồi dừng.

Cùng kỹ thuật này còn dùng để tìm **node giữa** (khi `fast` tới cuối thì `slow` đang ở giữa) và tìm **node thứ k từ cuối**.

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

> 💡 Ghi nhớ: thấy yêu cầu **tìm giữa / phát hiện vòng lặp / node thứ k từ cuối** trên linked list mà cấm dùng bộ nhớ phụ — phản xạ ngay là **fast–slow pointer**.

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
  while (q.length) {
    const level = [], size = q.length;
    for (let i = 0; i < size; i++) {
      const node = q.shift();
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

> 💡 Ghi nhớ: đề bài có chữ **"theo tầng / theo level / shortest path không trọng số"** → dùng **BFS + queue**. Đề bài về **đường đi gốc-tới-lá / kiểm tra cấu trúc đệ quy** → dùng **DFS**.

## Binary Search Tree (BST)

BST là binary tree có thêm **bất biến sắp xếp**: với mọi node, **mọi giá trị bên trái nhỏ hơn** node, **mọi giá trị bên phải lớn hơn** node. Nhờ đó tìm/thêm/xoá chỉ cần đi xuống một nhánh — `O(h)`.

```
        8
       / \
      3   10
     / \    \
    1   6    14
```

Inorder của cây trên: `1 3 6 8 10 14` — **luôn sắp xếp**. Đây là cách kiểm tra một cây có phải BST hợp lệ hay không.

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

### Độ cao & cân bằng (ý tưởng)

- **Chiều cao (height)** `h` = số cạnh trên đường đi dài nhất từ gốc xuống lá. Mọi thao tác BST là `O(h)`.
- Cây **cân bằng (balanced)**: `h ≈ log₂(n)` → thao tác `O(log n)`, rất nhanh.
- Cây **suy biến (skewed)**: nếu chèn dữ liệu *đã sắp xếp sẵn* vào BST thường, cây biến thành một "danh sách dọc", `h = n` → thao tác tụt về `O(n)`.

> ⚠️ Bẫy: BST chỉ nhanh khi **cân bằng**. Trong sản phẩm thật, đừng tự cài BST thường rồi đổ dữ liệu sắp xếp vào — hãy dùng **self-balancing tree** (AVL, Red-Black). Thực tế `TreeMap` của Java, `std::map` của C++ chính là Red-Black tree; Python/Go thì thường dùng thẳng hash map (`dict`/`map`) trừ khi cần thứ tự.

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

> 💡 Ghi nhớ: phần lớn bài tree trong phỏng vấn là một biến thể của "DFS đệ quy, xử lý hai cây con rồi kết hợp tại node". Nắm chắc khung postorder `return f(left, right, node)` là gỡ được đa số.
