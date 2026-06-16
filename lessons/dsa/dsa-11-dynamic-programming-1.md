# Dynamic Programming I: tư duy & 1D

Đây là bài "đổi đời" của khoá. Rất nhiều người chững lại đúng ở **dynamic programming (DP)**: nhìn lời giải mẫu thì hiểu, nhưng gặp bài lạ thì không biết bắt đầu từ đâu. Lý do gần như luôn giống nhau — họ học *thuộc đáp án* thay vì học *quy trình suy nghĩ*. Bài này trang bị cho bạn cái quy trình đó: một bộ khung 4 bước dùng được cho **mọi** bài DP.

Sau bài này, khi đọc một đề lạ bạn sẽ (1) **nhận ra** nó có phải DP không, (2) **định nghĩa được state** và **viết được transition**, (3) chọn giữa **memoization** và **tabulation**, (4) tối ưu được bộ nhớ. DP xuất hiện dày đặc ở phỏng vấn big-tech và là chủ đề "phân loại" ứng viên rõ rệt nhất.

## 1. Trực giác & cách nhận diện DP

### 1.1. DP thực ra là gì?

DP **không** phải một thuật toán cụ thể, nó là một **kỹ thuật**: *chia bài lớn thành các bài con, giải mỗi bài con đúng một lần, lưu kết quả lại để tái sử dụng*. Bản chất là **đệ quy + cache** (brute-force thông minh) — vẫn duyệt mọi khả năng nhưng không tính lại cái đã tính. DP có ích **chỉ khi** bài toán có hai tính chất sau cùng lúc.

```
                  ┌─────────────────────────────────┐
                  │   Bài toán có dùng DP được?      │
                  └─────────────────────────────────┘
                       │                     │
        Optimal substructure?       Overlapping subproblems?
        (lời giải lớn ghép từ        (cùng 1 bài con bị
         lời giải con tối ưu)         tính lại nhiều lần)
                       │                     │
                       └────── CẢ HAI? ──────┘
                                  │
                            ✅ Dùng DP
```

- **Optimal substructure (cấu trúc con tối ưu)**: lời giải tối ưu của bài lớn được **ghép từ** lời giải tối ưu của các bài con. Ví dụ: số xu ít nhất tạo ra `11` = `1 +` (số xu ít nhất tạo ra `11 - c`) với coin `c` tốt nhất nào đó.
- **Overlapping subproblems (bài con trùng lặp)**: cùng một bài con bị tính đi tính lại. Đây là điểm phân biệt DP với **divide & conquer** (như merge sort) — D&C cũng chia nhỏ nhưng các bài con *không* trùng nhau nên không cần cache.

### 1.2. Ba "mùi" của đề DP — nhận diện qua từ khoá

Đây là phần đắt giá nhất của bài. 90% bài DP rơi vào ba nhóm động từ sau. Khi đọc đề, hãy soi từ khoá:

| "Mùi" đề bài | Từ khoá thường gặp | Bản chất transition |
| --- | --- | --- |
| **Đếm số cách** | "có bao nhiêu cách", "number of ways", "count" | `dp[i] = dp[...] + dp[...]` (cộng các nhánh) |
| **Tối ưu (min/max)** | "ít nhất", "nhiều nhất", "longest", "minimum cost", "maximum" | `dp[i] = min/max(dp[...] ...)` |
| **Có thể hay không** | "có thể chia thành...", "can partition", "is reachable", "true/false" | `dp[i] = dp[...] OR dp[...]` (boolean) |

> 💡 Ghi nhớ: Ba dấu hiệu phụ trợ luôn đi kèm DP — (1) đề hỏi về **một con số/giá trị tối ưu** chứ không phải liệt kê mọi cấu hình (cái đó là backtracking); (2) ở mỗi bước bạn phải **ra một quyết định** (lấy/không lấy, đi bước 1 hay 2 bậc...); (3) bạn cảm thấy "thử hết thì mũ" nhưng nhiều nhánh **lặp lại**.

### 1.3. Phân biệt với các họ hàng

| Bạn thấy... | Đừng nhầm, đó là... |
| --- | --- |
| "Liệt kê **tất cả** subset/permutation hợp lệ" | Backtracking (không phải DP) — vì cần output mọi cấu hình |
| Chia nhỏ nhưng bài con **không** trùng (sort, search) | Divide & Conquer |
| Mỗi bước chọn cái "tốt nhất tại chỗ" và nó luôn đúng | Greedy (DP là greedy *không* luôn đúng → phải thử mọi nhánh) |
| "Đếm số cách / min / max" + bài con trùng | **DP** ✅ |

## 2. Quy trình 4 bước (khung suy nghĩ chuẩn)

Đây là bộ khung bạn sẽ lặp đi lặp lại cho mọi bài. Học **quy trình**, đừng học đáp án.

```
BƯỚC 1: ĐỊNH NGHĨA STATE
  dp[i] (hoặc dp[i][j]) nghĩa là GÌ?  ← viết thành 1 câu tiếng người
  vd: "dp[i] = số xu ít nhất tạo ra đúng số tiền i"

BƯỚC 2: TRANSITION (công thức truy hồi)
  dp[i] tính từ các dp nhỏ hơn như thế nào?
  vd: dp[i] = 1 + min(dp[i - c]) với mọi coin c <= i

BƯỚC 3: BASE CASE
  giá trị khởi đầu nhỏ nhất là gì?
  vd: dp[0] = 0

BƯỚC 4: THỨ TỰ TÍNH
  để dp[i] cần dp[i-1], dp[i-2]... → tính i tăng dần
  (chọn top-down memo hay bottom-up tabulation)
```

> ⚠️ Bẫy: Đừng nhảy thẳng vào code. **Bước 1 (định nghĩa state) sai thì cả bài sai.** State phải đủ thông tin để (a) tính ra đáp án cuối, và (b) suy ra từ state nhỏ hơn. Nếu transition của bạn cần một thông tin mà state không chứa → state thiếu chiều, phải thêm.

## 3. Template/khung code chuẩn

Hai cách hiện thực mọi bài DP. Dưới đây là khung tổng quát cho bài 1D (`dp` là mảng 1 chiều).

**Cách A — Memoization (top-down):** viết đệ quy tự nhiên theo transition, thêm cache để khỏi tính lại.

```python
from functools import lru_cache

def solve(n):
    @lru_cache(maxsize=None)        # cache tự động theo tham số
    def dp(i):
        if i <= 0:                  # BASE CASE
            return 0
        # TRANSITION: ghép từ các state nhỏ hơn
        return min(dp(i - 1), dp(i - 2)) + cost(i)
    return dp(n)
```
```javascript
function solve(n) {
    const memo = new Map();
    function dp(i) {
        if (i <= 0) return 0;                 // BASE CASE
        if (memo.has(i)) return memo.get(i);  // đã tính → trả cache
        const v = Math.min(dp(i - 1), dp(i - 2)) + cost(i); // TRANSITION
        memo.set(i, v);
        return v;
    }
    return dp(n);
}
```
```java
static int[] memo;
static int solve(int n) {
    memo = new int[n + 1];
    Arrays.fill(memo, -1);                     // -1 = chưa tính
    return dp(n);
}
static int dp(int i) {
    if (i <= 0) return 0;                       // BASE CASE
    if (memo[i] != -1) return memo[i];          // trả cache
    int v = Math.min(dp(i - 1), dp(i - 2)) + cost(i); // TRANSITION
    return memo[i] = v;
}
```
```go
func solve(n int) int {
    memo := make([]int, n+1)
    for i := range memo {
        memo[i] = -1                            // -1 = chưa tính
    }
    var dp func(i int) int
    dp = func(i int) int {
        if i <= 0 {                             // BASE CASE
            return 0
        }
        if memo[i] != -1 {                      // trả cache
            return memo[i]
        }
        v := min(dp(i-1), dp(i-2)) + cost(i)    // TRANSITION
        memo[i] = v
        return v
    }
    return dp(n)
}
```

**Cách B — Tabulation (bottom-up):** bỏ đệ quy, điền bảng từ base case đi lên theo thứ tự bước 4.

```python
def solve(n):
    dp = [0] * (n + 1)              # dp[0] = BASE CASE
    for i in range(1, n + 1):      # THỨ TỰ: nhỏ → lớn
        dp[i] = min(dp[i - 1], dp[max(i - 2, 0)]) + cost(i)   # TRANSITION
    return dp[n]
```
```javascript
function solve(n) {
    const dp = new Array(n + 1).fill(0);   // dp[0] = BASE CASE
    for (let i = 1; i <= n; i++) {         // nhỏ → lớn
        dp[i] = Math.min(dp[i - 1], dp[Math.max(i - 2, 0)]) + cost(i);
    }
    return dp[n];
}
```
```java
static int solve(int n) {
    int[] dp = new int[n + 1];             // dp[0] = 0 = BASE CASE
    for (int i = 1; i <= n; i++) {         // nhỏ → lớn
        dp[i] = Math.min(dp[i - 1], dp[Math.max(i - 2, 0)]) + cost(i);
    }
    return dp[n];
}
```
```go
func solve(n int) int {
    dp := make([]int, n+1)                 // dp[0] = 0 = BASE CASE
    for i := 1; i <= n; i++ {              // nhỏ → lớn
        prev2 := i - 2
        if prev2 < 0 {
            prev2 = 0
        }
        dp[i] = min(dp[i-1], dp[prev2]) + cost(i)
    }
    return dp[n]
}
```

### 3.1. Memoization vs Tabulation — chọn cái nào?

| Tiêu chí | Memoization (top-down) | Tabulation (bottom-up) |
| --- | --- | --- |
| Cách viết | Đệ quy + cache, sát transition | Vòng lặp điền bảng |
| Khi nào dễ hơn | Transition phức tạp, không gian state thưa | State đơn giản, dày đặc |
| Bộ nhớ | O(state) + call stack | O(state), **dễ tối ưu** xuống O(1) |
| Rủi ro | Tràn stack nếu state sâu | Phải xác định đúng thứ tự tính |
| Tốc độ thực tế | Hằng số lớn hơn (overhead gọi hàm) | Nhanh hơn, cache-friendly |

> 💡 Ghi nhớ: Lúc phỏng vấn, hãy **viết memo trước** (nó sinh ra rất tự nhiên từ transition), rồi nói "tôi có thể chuyển sang bottom-up để bỏ call stack và tối ưu bộ nhớ" — chuyển đổi giữa hai cách là kỹ năng được đánh giá cao.

## 4. Bảng DẠNG BÀI — 1D DP (problem patterns)

Đây là bộ "tủ" của DP 1D. Mỗi dạng: dấu hiệu → hướng làm → độ phức tạp → bài kinh điển.

| Dạng | Dấu hiệu nhận biết | Hướng làm (state + transition) | Độ phức tạp | Bài kinh điển |
| --- | --- | --- | --- | --- |
| **Fibonacci / 2 bước trước** | Đếm cách, mỗi bước phụ thuộc 1–2 state liền trước | `dp[i] = dp[i-1] + dp[i-2]` | O(n) / O(1) bộ nhớ | Climbing Stairs (LC 70), Fibonacci (LC 509) |
| **House Robber (kề nhau bị cấm)** | Tối ưu trên dãy, **không được chọn 2 phần tử kề** | `dp[i] = max(dp[i-1], dp[i-2] + a[i])` | O(n) / O(1) | House Robber (LC 198), House Robber II (LC 213) |
| **Coin Change (unbounded)** | Min/đếm cách gộp ra target, **mỗi loại dùng vô hạn lần** | `dp[x] = min/sum over coins` của `dp[x-c]` | O(amount × #coins) | Coin Change (LC 322), Coin Change II (LC 518) |
| **0/1 Knapsack** | Mỗi item **lấy hoặc bỏ (1 lần)**, ràng buộc tổng "sức chứa" | `dp[w] = max(dp[w], dp[w-wt]+val)`, duyệt w **giảm dần** | O(n × W) | Partition Equal Subset Sum (LC 416), Target Sum (LC 494) |
| **Decode Ways** | Chuỗi số, đếm cách "tách" hợp lệ phụ thuộc 1–2 ký tự trước | `dp[i] = dp[i-1]·(valid1) + dp[i-2]·(valid2)` | O(n) | Decode Ways (LC 91) |
| **Word Break** | Boolean "có thể tách chuỗi thành từ trong dict" | `dp[i] = OR(dp[j] and s[j:i] in dict)` | O(n²·L) hoặc O(n²) | Word Break (LC 139) |
| **LIS (dãy con tăng dài nhất)** | "longest increasing subsequence", thứ tự giữ nguyên | `dp[i] = 1 + max(dp[j])` với `j<i, a[j]<a[i]` | O(n²), có cách O(n log n) | Longest Increasing Subsequence (LC 300) |
| **Max Subarray (Kadane)** | "subarray tổng lớn nhất" (liên tục) | `cur = max(a[i], cur+a[i])`, `best = max(best,cur)` | O(n) | Maximum Subarray (LC 53) |

> 💡 Ghi nhớ: Để ý hai chữ rất quan trọng — **subsequence** (không liên tục, được bỏ phần tử) thường dẫn tới `dp[i]` dựa trên *mọi* `j < i` (O(n²)); còn **subarray** (liên tục) thường chỉ cần state cuộn O(1) như Kadane. Đọc nhầm hai khái niệm này là sai cả bài.

## 5. Bài mẫu giải chi tiết

### 5.1. Bài mẫu 1 — Climbing Stairs (LC 70): brute-force → memo → tabulation

**Hiểu đề.** Có `n` bậc thang. Mỗi bước leo **1 hoặc 2** bậc. Hỏi có **bao nhiêu cách** leo tới đỉnh? Từ khoá "bao nhiêu cách" → dạng *đếm số cách* → DP.

**Ý tưởng / vì sao.** Để đứng ở bậc `n`, ngay trước đó bạn phải ở **bậc `n-1`** (rồi bước 1 bậc) hoặc **bậc `n-2`** (rồi bước 2 bậc). Hai con đường này rời rạc nhau, nên tổng số cách:
```
ways(n) = ways(n-1) + ways(n-2)        ← TRANSITION (chính là Fibonacci)
ways(0) = 1   (đã ở đỉnh: 1 cách "không làm gì")
ways(1) = 1
```
- **State:** `ways(i)` = số cách leo tới bậc `i`.
- **Base:** `ways(0)=1, ways(1)=1`.
- **Thứ tự:** `i` tăng dần.

**Bước 1 — brute-force (để thấy vì sao cần DP).** Đệ quy thuần:

```python
def climb_brute(n):
    if n <= 1:
        return 1
    return climb_brute(n - 1) + climb_brute(n - 2)   # O(2^n) — tính lại quá nhiều
```
```javascript
function climbBrute(n) {
    if (n <= 1) return 1;
    return climbBrute(n - 1) + climbBrute(n - 2);     // O(2^n)
}
```
```java
static int climbBrute(int n) {
    if (n <= 1) return 1;
    return climbBrute(n - 1) + climbBrute(n - 2);     // O(2^n)
}
```
```go
func climbBrute(n int) int {
    if n <= 1 {
        return 1
    }
    return climbBrute(n-1) + climbBrute(n-2)           // O(2^n)
}
```

Cây gọi cho `n=5` cho thấy `climb(3)`, `climb(2)`... bị lặp lại nhiều lần → **overlapping subproblems** → thêm cache.

**Bước 2 — memoization (top-down).**

```python
def climb_memo(n):
    from functools import lru_cache
    @lru_cache(maxsize=None)
    def dp(i):
        if i <= 1:
            return 1
        return dp(i - 1) + dp(i - 2)
    return dp(n)
```
```javascript
function climbMemo(n) {
    const memo = new Map();
    function dp(i) {
        if (i <= 1) return 1;
        if (memo.has(i)) return memo.get(i);
        const v = dp(i - 1) + dp(i - 2);
        memo.set(i, v);
        return v;
    }
    return dp(n);
}
```
```java
static int climbMemo(int n) {
    int[] memo = new int[n + 1];
    Arrays.fill(memo, -1);
    return climbDp(n, memo);
}
static int climbDp(int i, int[] memo) {
    if (i <= 1) return 1;
    if (memo[i] != -1) return memo[i];
    return memo[i] = climbDp(i - 1, memo) + climbDp(i - 2, memo);
}
```
```go
func climbMemo(n int) int {
    memo := make([]int, n+1)
    for i := range memo {
        memo[i] = -1
    }
    var dp func(i int) int
    dp = func(i int) int {
        if i <= 1 {
            return 1
        }
        if memo[i] != -1 {
            return memo[i]
        }
        memo[i] = dp(i-1) + dp(i-2)
        return memo[i]
    }
    return dp(n)
}
```

**Bước 3 — tabulation + tối ưu O(1) bộ nhớ.** Vì chỉ cần 2 state liền trước, ta cuộn bằng 2 biến:

```python
def climb(n):
    a, b = 1, 1                 # ways(0), ways(1)
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b
```
```javascript
function climb(n) {
    let a = 1, b = 1;          // ways(0), ways(1)
    for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
    return b;
}
```
```java
static int climb(int n) {
    int a = 1, b = 1;          // ways(0), ways(1)
    for (int i = 2; i <= n; i++) { int t = a + b; a = b; b = t; }
    return b;
}
```
```go
func climb(n int) int {
    a, b := 1, 1               // ways(0), ways(1)
    for i := 2; i <= n; i++ {
        a, b = b, a+b
    }
    return b
}
```

**Phân tích độ phức tạp.** Brute-force O(2^n). Memo & tabulation **O(n)** thời gian; tabulation cuộn **O(1)** bộ nhớ. Đây là minh hoạ kinh điển: cùng một transition, ba cách hiện thực với chi phí khác nhau một trời một vực.

> ⚠️ Bẫy: `ways(0) = 1`, **không phải 0**. "Không bước nào" cũng là một cách hợp lệ để "đứng yên ở đỉnh". Đặt base case sai một ly là lệch toàn bộ kết quả.

### 5.2. Bài mẫu 2 — House Robber (LC 198)

**Hiểu đề.** Mảng `nums`, `nums[i]` là số tiền nhà thứ `i`. Bạn **không được trộm hai nhà kề nhau** (báo động). Tìm **số tiền lớn nhất** có thể trộm. Từ khoá "lớn nhất" + ràng buộc "không kề nhau" → dạng *tối ưu trên dãy với phần tử kề bị cấm*.

**Ý tưởng / vì sao.** Tại nhà `i`, bạn đứng trước **một quyết định nhị phân**:
- **Bỏ qua nhà `i`:** kết quả tốt nhất = `dp[i-1]` (giữ nguyên kết quả tới nhà trước).
- **Trộm nhà `i`:** thì **không được** trộm `i-1`, nên cộng vào `dp[i-2]`: `nums[i] + dp[i-2]`.

Lấy max hai lựa chọn:
```
dp[i] = max(dp[i-1], nums[i] + dp[i-2])     ← TRANSITION
dp[0] = nums[0]
dp[1] = max(nums[0], nums[1])
```
- **State:** `dp[i]` = tiền nhiều nhất trộm được khi chỉ xét nhà `0..i`.
- **Vì sao đúng (optimal substructure):** lựa chọn ở `i` chỉ phụ thuộc kết quả tối ưu của `i-1` và `i-2`, không cần biết *cách* đạt được chúng.

**Code (tabulation cuộn O(1) — vì chỉ cần 2 state trước).**

```python
def rob(nums):
    prev2, prev1 = 0, 0            # dp[i-2], dp[i-1]
    for x in nums:
        prev2, prev1 = prev1, max(prev1, prev2 + x)
    return prev1
```
```javascript
function rob(nums) {
    let prev2 = 0, prev1 = 0;       // dp[i-2], dp[i-1]
    for (const x of nums) {
        [prev2, prev1] = [prev1, Math.max(prev1, prev2 + x)];
    }
    return prev1;
}
```
```java
static int rob(int[] nums) {
    int prev2 = 0, prev1 = 0;        // dp[i-2], dp[i-1]
    for (int x : nums) {
        int cur = Math.max(prev1, prev2 + x);
        prev2 = prev1;
        prev1 = cur;
    }
    return prev1;
}
```
```go
func rob(nums []int) int {
    prev2, prev1 := 0, 0             // dp[i-2], dp[i-1]
    for _, x := range nums {
        cur := max(prev1, prev2+x)
        prev2, prev1 = prev1, cur
    }
    return prev1
}
```

**Phân tích độ phức tạp.** Một lần quét: **O(n)** thời gian, **O(1)** bộ nhớ (đã cuộn `dp` thành 2 biến).

> ⚠️ Bẫy: Cám dỗ greedy "cứ trộm nhà nhiều tiền nhất rồi nhảy cách 1" là **sai**. Ví dụ `[2, 1, 1, 2]`: greedy lấy hai số `2` ở hai đầu... nhưng chúng cách nhau hợp lệ nên ra 4 (đúng tình cờ); thử `[2, 7, 9, 3, 1]`: tối ưu là `2+9+1=12` chứ không phải chọn `9` rồi `7` (kề). Chỉ DP mới quét hết được mọi tổ hợp hợp lệ.

> 💡 Ghi nhớ: **House Robber II** (LC 213) chỉ thêm một twist — nhà xếp **thành vòng tròn** (nhà đầu và cuối cũng kề nhau). Cách giải: chạy House Robber hai lần — một lần bỏ nhà đầu, một lần bỏ nhà cuối — rồi lấy max. Mẹo "phá vòng thành 2 đoạn thẳng" này rất hay gặp.

### 5.3. Bài mẫu 3 — Coin Change (LC 322): brute-force → memo → tabulation

**Hiểu đề.** Cho `coins` (mệnh giá, dùng **vô hạn lần** mỗi loại) và `amount`. Tìm **số đồng xu ít nhất** để gộp đúng `amount`; không gộp được trả `-1`. Từ khoá "ít nhất" → *tối ưu min*; "vô hạn lần" → **unbounded knapsack**.

**Ý tưởng / vì sao.** Để tạo ra `x`, đồng xu **cuối cùng** bạn dùng là một coin `c` nào đó (`c <= x`). Bỏ đồng đó ra, phần còn lại `x - c` cũng phải được tạo tối ưu. Thử mọi coin và lấy nhánh tốt nhất:
```
dp[x] = số xu ít nhất tạo ra x
dp[0] = 0                              ← BASE: 0 xu tạo ra số tiền 0
dp[x] = 1 + min(dp[x - c])  ∀ coin c <= x
nếu không nhánh nào khả thi → dp[x] = ∞ (vô nghiệm)
```
- **State:** `dp[x]` = số xu ít nhất tạo đúng `x`.
- **Thứ tự:** `x` tăng dần từ `1` tới `amount` (cần `dp[x-c]` nhỏ hơn đã có).

**Bước 1 — brute-force.** Thử mọi coin ở mỗi mức, không cache → mũ:

```python
def coin_brute(coins, amount):
    if amount == 0:
        return 0
    if amount < 0:
        return float("inf")
    best = float("inf")
    for c in coins:
        best = min(best, 1 + coin_brute(coins, amount - c))   # rất nhiều nhánh lặp
    return best
```
```javascript
function coinBrute(coins, amount) {
    if (amount === 0) return 0;
    if (amount < 0) return Infinity;
    let best = Infinity;
    for (const c of coins) best = Math.min(best, 1 + coinBrute(coins, amount - c));
    return best;
}
```
```java
static int coinBrute(int[] coins, int amount) {
    if (amount == 0) return 0;
    if (amount < 0) return Integer.MAX_VALUE / 2;
    int best = Integer.MAX_VALUE / 2;
    for (int c : coins) best = Math.min(best, 1 + coinBrute(coins, amount - c));
    return best;
}
```
```go
func coinBrute(coins []int, amount int) int {
    const INF = 1 << 30
    if amount == 0 {
        return 0
    }
    if amount < 0 {
        return INF
    }
    best := INF
    for _, c := range coins {
        best = min(best, 1+coinBrute(coins, amount-c))
    }
    return best
}
```

**Bước 2 — memoization (top-down).** Cache theo `amount` còn lại:

```python
def coin_memo(coins, amount):
    from functools import lru_cache
    @lru_cache(maxsize=None)
    def dp(rem):
        if rem == 0:
            return 0
        if rem < 0:
            return float("inf")
        return min((1 + dp(rem - c) for c in coins), default=float("inf"))
    res = dp(amount)
    return -1 if res == float("inf") else res
```
```javascript
function coinMemo(coins, amount) {
    const memo = new Map();
    function dp(rem) {
        if (rem === 0) return 0;
        if (rem < 0) return Infinity;
        if (memo.has(rem)) return memo.get(rem);
        let best = Infinity;
        for (const c of coins) best = Math.min(best, 1 + dp(rem - c));
        memo.set(rem, best);
        return best;
    }
    const res = dp(amount);
    return res === Infinity ? -1 : res;
}
```
```java
static int coinMemo(int[] coins, int amount) {
    int[] memo = new int[amount + 1];
    Arrays.fill(memo, -2);                 // -2 = chưa tính
    int res = coinDp(coins, amount, memo);
    return res >= 1 << 29 ? -1 : res;
}
static int coinDp(int[] coins, int rem, int[] memo) {
    if (rem == 0) return 0;
    if (rem < 0) return 1 << 29;           // vô nghiệm
    if (memo[rem] != -2) return memo[rem];
    int best = 1 << 29;
    for (int c : coins) best = Math.min(best, 1 + coinDp(coins, rem - c, memo));
    return memo[rem] = best;
}
```
```go
func coinMemo(coins []int, amount int) int {
    const INF = 1 << 29
    memo := make([]int, amount+1)
    for i := range memo {
        memo[i] = -2                       // -2 = chưa tính
    }
    var dp func(rem int) int
    dp = func(rem int) int {
        if rem == 0 {
            return 0
        }
        if rem < 0 {
            return INF
        }
        if memo[rem] != -2 {
            return memo[rem]
        }
        best := INF
        for _, c := range coins {
            best = min(best, 1+dp(rem-c))
        }
        memo[rem] = best
        return best
    }
    res := dp(amount)
    if res >= INF {
        return -1
    }
    return res
}
```

**Bước 3 — tabulation (bottom-up).** Điền `dp[0..amount]` tăng dần:

```python
def coin_change(coins, amount):
    INF = amount + 1               # "vô cực" an toàn (đáp án tối đa = amount xu loại 1)
    dp = [0] + [INF] * amount
    for x in range(1, amount + 1):
        for c in coins:
            if c <= x:
                dp[x] = min(dp[x], dp[x - c] + 1)
    return -1 if dp[amount] == INF else dp[amount]
```
```javascript
function coinChange(coins, amount) {
    const INF = amount + 1;
    const dp = new Array(amount + 1).fill(INF);
    dp[0] = 0;
    for (let x = 1; x <= amount; x++) {
        for (const c of coins) {
            if (c <= x) dp[x] = Math.min(dp[x], dp[x - c] + 1);
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
            if (c <= x) dp[x] = Math.min(dp[x], dp[x - c] + 1);
        }
    }
    return dp[amount] == INF ? -1 : dp[amount];
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
            if c <= x {
                dp[x] = min(dp[x], dp[x-c]+1)
            }
        }
    }
    if dp[amount] == INF {
        return -1
    }
    return dp[amount]
}
```

**Phân tích độ phức tạp.** **O(amount × #coins)** thời gian, **O(amount)** bộ nhớ.

> ⚠️ Bẫy: **Không greedy** chọn coin lớn nhất trước! Với `coins=[1,3,4], amount=6`: greedy ra `4+1+1=3 xu`, nhưng tối ưu là `3+3=2 xu`. Greedy chỉ đúng với vài hệ tiền tệ "canonical"; DP luôn đúng. Bẫy thứ hai: chọn giá trị "INF" sai (vd dùng số quá lớn rồi `+1` tràn `int`) — dùng `amount+1` là khôn ngoan vì không bao giờ cần quá `amount` xu.

### 5.4. Điểm thưởng — 0/1 Knapsack (mỗi item lấy 1 lần)

**Hiểu đề.** `n` món, món `i` nặng `wt[i]`, giá trị `val[i]`. Balo chịu tối đa `W`. Mỗi món **lấy hoặc bỏ** (không lấy nhiều lần). Tối đa hoá tổng giá trị. Đây là khuôn của **Partition Equal Subset Sum** và **Target Sum**.

**Ý tưởng.** Với mỗi món, quyết định nhị phân lấy/bỏ. State 1D cuộn: `dp[w]` = giá trị max với sức chứa `w`. Mấu chốt là **duyệt `w` từ cao xuống thấp** để mỗi món chỉ được dùng **một lần** (duyệt tăng dần sẽ thành unbounded).

```
dp[w] = max(dp[w], dp[w - wt[i]] + val[i])    với mỗi món i, w từ W về wt[i]
```

```python
def knapsack(wt, val, W):
    dp = [0] * (W + 1)
    for i in range(len(wt)):
        for w in range(W, wt[i] - 1, -1):       # GIẢM DẦN → mỗi món 1 lần
            dp[w] = max(dp[w], dp[w - wt[i]] + val[i])
    return dp[W]
```
```javascript
function knapsack(wt, val, W) {
    const dp = new Array(W + 1).fill(0);
    for (let i = 0; i < wt.length; i++) {
        for (let w = W; w >= wt[i]; w--) {       // GIẢM DẦN
            dp[w] = Math.max(dp[w], dp[w - wt[i]] + val[i]);
        }
    }
    return dp[W];
}
```
```java
static int knapsack(int[] wt, int[] val, int W) {
    int[] dp = new int[W + 1];
    for (int i = 0; i < wt.length; i++) {
        for (int w = W; w >= wt[i]; w--) {        // GIẢM DẦN
            dp[w] = Math.max(dp[w], dp[w - wt[i]] + val[i]);
        }
    }
    return dp[W];
}
```
```go
func knapsack(wt, val []int, W int) int {
    dp := make([]int, W+1)
    for i := 0; i < len(wt); i++ {
        for w := W; w >= wt[i]; w-- {             // GIẢM DẦN
            dp[w] = max(dp[w], dp[w-wt[i]]+val[i])
        }
    }
    return dp[W]
}
```

**Độ phức tạp.** **O(n × W)** thời gian, **O(W)** bộ nhớ.

> 💡 Ghi nhớ — quy tắc vàng phân biệt hai loại knapsack: **0/1 (mỗi món 1 lần) → duyệt sức chứa GIẢM dần**; **unbounded (dùng vô hạn, như coin change) → duyệt TĂNG dần**. Đảo chiều là đổi hẳn bài toán. Đây là một trong những bẫy "kinh điển" của phỏng vấn.

## 6. Sai lầm thường gặp & cách tránh

| Sai lầm | Hậu quả | Cách tránh |
| --- | --- | --- |
| Định nghĩa state mơ hồ ("dp[i] là kết quả tới i") | Transition viết bừa, bài sai | Viết state thành **một câu tiếng người** đầy đủ trước khi code |
| Base case sai (vd `ways(0)=0`) | Lệch toàn bộ kết quả | Kiểm tra base bằng tay với `n=0,1,2` |
| Thứ tự tính sai (tabulation đọc `dp` chưa điền) | Đọc rác / kết quả sai | Đảm bảo state cần thiết đã tính **trước** state hiện tại |
| Knapsack 0/1 duyệt sức chứa tăng dần | Vô tình dùng item nhiều lần | 0/1 → duyệt **giảm dần**; unbounded → tăng dần |
| Greedy khi đề là DP | Sai ở test có "phản ví dụ" | Tự hỏi: "lựa chọn tốt tại chỗ có **luôn** tối ưu không?" Nếu nghi → DP |
| Lẫn subsequence vs subarray | O(n²) vs O(n), kết quả khác | Subsequence = bỏ phần tử được; subarray = phải liên tục |
| Memo nhưng quên cache đúng tham số | Vẫn O(mũ) | Cache theo **đúng** bộ tham số định nghĩa state |
| Tràn số khi dùng INF rồi `+1` | Kết quả âm bất ngờ (Java/Go) | Dùng "INF" vừa đủ (vd `amount+1`) hoặc check `< 0` |

> ⚠️ Bẫy lớn nhất với người mới: **nhảy vào code khi chưa viết được transition trên giấy.** Nếu chưa nói được bằng lời "dp[i] tính từ dp[...] thế nào", thì code chắc chắn sai. Hãy luôn viết 4 dòng (state / transition / base / thứ tự) ra trước.

## 7. Checklist tự luyện

Luyện theo **dạng**, không luyện ngẫu nhiên. Sau mỗi bài, viết ra 4 dòng state/transition/base/thứ tự rồi mới code.

- [ ] **Climbing Stairs (LC 70)** — dạng Fibonacci. Tự cài cả 3 cách (brute/memo/tab).
- [ ] **Fibonacci Number (LC 509)** — luyện cuộn O(1) bộ nhớ.
- [ ] **Min Cost Climbing Stairs (LC 746)** — biến thể Fibonacci có chi phí.
- [ ] **House Robber (LC 198)** — tối ưu dãy, phần tử kề bị cấm.
- [ ] **House Robber II (LC 213)** — mẹo "phá vòng tròn thành 2 đoạn thẳng".
- [ ] **Coin Change (LC 322)** — unbounded knapsack, min. Tự đối chiếu memo vs tab.
- [ ] **Coin Change II (LC 518)** — **đếm số cách** (đổi `min` thành tổng, cẩn thận thứ tự vòng lặp coin/amount để khỏi đếm trùng).
- [ ] **Decode Ways (LC 91)** — dạng "tách chuỗi", chú ý ký tự `0` và cặp `10–26`.
- [ ] **Word Break (LC 139)** — DP boolean, transition `OR`.
- [ ] **Longest Increasing Subsequence (LC 300)** — bản O(n²) trước, rồi thử bản O(n log n) với binary search.
- [ ] **Maximum Subarray (LC 53)** — Kadane, phân biệt rõ với subsequence.
- [ ] **Partition Equal Subset Sum (LC 416)** — 0/1 knapsack boolean (chia mảng thành 2 tổng bằng nhau).
- [ ] **Target Sum (LC 494)** — biến gán dấu +/- thành 0/1 knapsack đếm cách.

> 💡 Ghi nhớ cuối bài: DP không phải năng khiếu — nó là **quy trình lặp lại**. Cứ ép mình viết 4 dòng (state → transition → base → thứ tự) cho từng bài, sau khoảng 25–30 bài bạn sẽ "thấy" được state ngay khi đọc đề. Bài tiếp theo (DP II) mở rộng đúng bộ khung này sang **2D & string** (grid, LCS, edit distance) — nắm vững 1D ở đây là đã đi được nửa đường.
