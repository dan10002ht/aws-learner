# Dynamic Programming II: 2D & string

Ở bài DP I bạn đã nắm bộ xương: định nghĩa **state** → viết **transition** → đặt **base case** → chọn thứ tự điền bảng. Toàn bộ ví dụ ở đó đều dùng bảng **1 chiều** `dp[i]`. Bài này lên một nấc: khi state cần **hai tham số** thì bảng trở thành **2 chiều** `dp[i][j]`, và đây chính là nhóm bài hay xuất hiện nhất trong phỏng vấn big-tech: DP trên **grid**, DP trên **hai chuỗi**, và **interval DP** (chia khoảng).

Mục tiêu thực dụng của bài: nhìn đề là **đoán ngay được chiều của bảng** và **ý nghĩa từng ô**. Khi bạn nói đúng câu "`dp[i][j]` là... xét tới ký tự thứ i của chuỗi A và thứ j của chuỗi B" thì 80% lời giải đã xong — phần còn lại chỉ là điền công thức truy hồi. Chúng ta sẽ luyện đúng phản xạ đó, kèm hai bài mẫu (LCS và edit distance) có **bảng DP vẽ từng ô** để bạn thấy nó chạy thế nào.

## 1. Trực giác: khi nào DP nhảy lên 2 chiều?

Một state 1D `dp[i]` đủ khi "vị trí hiện tại" mô tả trọn vẹn bài con — ví dụ "đứng ở bậc thang `i`" hay "xét tới phần tử `i`". DP nhảy lên 2D khi **một con số không đủ** để mô tả bài con; bạn cần hai trục độc lập:

- **Hai chuỗi đi song song**: state là "đã xét tới ký tự `i` của chuỗi A *và* ký tự `j` của chuỗi B" → bảng `dp[i][j]`. (LCS, edit distance, regex matching.)
- **Tọa độ trên lưới**: state là "đứng tại ô `(r, c)`" → bảng `dp[r][c]`. (Unique paths, min path sum, maximal square.)
- **Một khoảng con `[i..j]`**: state là "đã giải xong đoạn từ `i` đến `j`" → bảng `dp[i][j]` nhưng `j` là **điểm cuối khoảng**, không phải chuỗi thứ hai. (Interval DP: matrix chain, burst balloons, palindrome.)

> 💡 Ghi nhớ: Hỏi mình một câu — "Cần bao nhiêu con số để định danh duy nhất một bài con?". Một con số → 1D. Hai con số độc lập → 2D. Đó là toàn bộ trực giác về chiều của bảng.

### Bảng nhận diện pattern DP (rất quan trọng)

| Thấy gì trong đề | Khả năng cao là | State điển hình |
| --- | --- | --- |
| **Hai chuỗi/mảng** so khớp với nhau (subsequence chung, biến đổi A thành B, khớp pattern) | **String DP 2D** | `dp[i][j]` = kết quả khi xét tới `A[..i]`, `B[..j]` |
| Lưới `m×n`, đi từ góc này sang góc kia, chỉ được sang phải/xuống | **Grid DP** | `dp[r][c]` = kết quả tối ưu để tới ô `(r,c)` |
| Lưới, tìm **hình vuông/hình chữ nhật** con thỏa điều kiện | **Grid DP** (ô = góc dưới-phải) | `dp[r][c]` = cạnh/diện tích max kết thúc tại `(r,c)` |
| "Chia một dãy/chuỗi thành các **khoảng**", chi phí phụ thuộc cách chia | **Interval DP** | `dp[i][j]` = tối ưu cho đoạn `[i..j]` |
| Một chuỗi, hỏi về **đối xứng / palindrome** | **Interval DP** (hoặc 2D) | `dp[i][j]` = thông tin về `s[i..j]` |
| "Số cách đi" / "min-max chi phí" + bài con trùng lặp | DP (chiều tùy bài) | tùy số tham số |

> ⚠️ Bẫy: "Hai chuỗi → 2D" và "chia khoảng → 2D" **trông giống nhau** (đều `dp[i][j]`) nhưng ý nghĩa hai chỉ số khác hẳn. String DP: `i`, `j` thuộc hai chuỗi *khác nhau*. Interval DP: `i`, `j` là *hai đầu* của cùng một dãy. Xác định nhầm là sai từ gốc.

## 2. Template/khung code chuẩn

Khung chung cho mọi bài DP 2D tabulation: cấp phát bảng `(n+1) × (m+1)` (cộng 1 cho hàng/cột base case rỗng), khởi tạo biên, rồi điền theo thứ tự sao cho mọi ô **phụ thuộc đều đã có giá trị** trước khi tính ô hiện tại.

```python
def dp_2d_template(A, B):
    n, m = len(A), len(B)
    # dp có (n+1) x (m+1); hàng/cột 0 là base case (tiền tố rỗng)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    # 1) khởi tạo biên (base case) nếu cần: dp[i][0], dp[0][j]
    # 2) điền bảng theo thứ tự tăng dần i, j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if A[i - 1] == B[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1          # transition khi khớp
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])  # transition khi không khớp
    return dp[n][m]
```
```javascript
function dp2dTemplate(A, B) {
    const n = A.length, m = B.length;
    // dp (n+1) x (m+1); hàng/cột 0 là base case (tiền tố rỗng)
    const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            if (A[i - 1] === B[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;             // khớp
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]); // không khớp
            }
        }
    }
    return dp[n][m];
}
```
```java
static int dp2dTemplate(String A, String B) {
    int n = A.length(), m = B.length();
    int[][] dp = new int[n + 1][m + 1];   // mặc định 0 -> base case rỗng
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (A.charAt(i - 1) == B.charAt(j - 1)) {
                dp[i][j] = dp[i - 1][j - 1] + 1;             // khớp
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]); // không khớp
            }
        }
    }
    return dp[n][m];
}
```
```go
func dp2dTemplate(A, B string) int {
    n, m := len(A), len(B)
    dp := make([][]int, n+1)
    for i := range dp {
        dp[i] = make([]int, m+1) // mặc định 0 -> base case rỗng
    }
    for i := 1; i <= n; i++ {
        for j := 1; j <= m; j++ {
            if A[i-1] == B[j-1] {
                dp[i][j] = dp[i-1][j-1] + 1 // khớp
            } else {
                dp[i][j] = max(dp[i-1][j], dp[i][j-1]) // không khớp
            }
        }
    }
    return dp[n][m]
}
```

```cpp
int dp2dTemplate(const string& A, const string& B) {
    int n = A.size(), m = B.size();
    // dp (n+1) x (m+1); hàng/cột 0 là base case (tiền tố rỗng)
    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (A[i - 1] == B[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;             // khớp
            } else {
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]); // không khớp
            }
        }
    }
    return dp[n][m];
}
```

> 💡 Ghi nhớ: Quy ước **chỉ số lệch 1** — `dp[i][j]` xét **`i` ký tự đầu** của A và **`j` ký tự đầu** của B, nên ký tự hiện tại là `A[i-1]`, `B[j-1]`. Hàng 0 và cột 0 ứng với "chuỗi rỗng". Quy ước này khử được phần lớn lỗi off-by-one của DP 2D.

## 3. Bảng DẠNG BÀI (problem patterns)

### 3.1. Grid DP — đi trên lưới

| Dạng | Dấu hiệu nhận biết | Hướng làm | Độ phức tạp | Bài kinh điển |
| --- | --- | --- | --- | --- |
| Đếm đường đi | Lưới `m×n`, chỉ sang phải/xuống, hỏi "có bao nhiêu cách" | `dp[r][c] = dp[r-1][c] + dp[r][c-1]`; biên = 1 | O(mn) / O(n) | Unique Paths (LC 62), Unique Paths II (LC 63) |
| Min/max chi phí đường | Mỗi ô có chi phí, tìm đường tổng nhỏ nhất | `dp[r][c] = grid[r][c] + min(dp[r-1][c], dp[r][c-1])` | O(mn) / O(n) | Minimum Path Sum (LC 64), Triangle (LC 120) |
| Hình vuông/CN con | Tìm hình vuông toàn số 1 lớn nhất | `dp[r][c] = 1 + min(trên, trái, chéo)` nếu ô = 1 | O(mn) / O(n) | Maximal Square (LC 221) |
| Đi với rào cản | Có ô cấm (obstacle) | Như đếm đường nhưng `dp=0` tại ô cấm | O(mn) | Unique Paths II (LC 63) |

### 3.2. String DP — hai chuỗi

| Dạng | Dấu hiệu nhận biết | Hướng làm | Độ phức tạp | Bài kinh điển |
| --- | --- | --- | --- | --- |
| Subsequence chung dài nhất | "Chuỗi con chung" (giữ thứ tự, không cần liền) của 2 chuỗi | khớp → `dp[i-1][j-1]+1`; lệch → `max(dp[i-1][j], dp[i][j-1])` | O(nm) / O(min) | Longest Common Subsequence (LC 1143) |
| Biến đổi chuỗi | "Số phép sửa ít nhất" để A thành B (insert/delete/replace) | min của 3 hướng + 1 (xem 4.2) | O(nm) / O(m) | Edit Distance (LC 72) |
| Khớp pattern | A khớp pattern có `.`/`*` hay `?`/`*` | `dp[i][j]` đúng/sai theo luật wildcard | O(nm) | Wildcard (LC 44), Regex (LC 10) |
| Đếm subsequence | "Có bao nhiêu cách S chứa T như subsequence" | khớp → `dp[i-1][j-1]+dp[i-1][j]`; lệch → `dp[i-1][j]` | O(nm) | Distinct Subsequences (LC 115) |
| Palindrome dài nhất (subsequence) | 1 chuỗi, hỏi palindromic subsequence dài nhất | LCS của `s` với `reverse(s)`, hoặc interval DP | O(n²) | Longest Palindromic Subsequence (LC 516) |

### 3.3. Interval DP — chia khoảng

| Dạng | Dấu hiệu nhận biết | Hướng làm | Độ phức tạp | Bài kinh điển |
| --- | --- | --- | --- | --- |
| Đối xứng trên 1 chuỗi | Palindrome substring/subsequence | `dp[i][j]` từ `dp[i+1][j-1]`; điền theo độ dài khoảng | O(n²) | Longest Palindromic Substring (LC 5), LPS (LC 516) |
| Gộp/cắt tốn phí | "Chia/gộp dãy, chi phí phụ thuộc cách chia" | `dp[i][j] = min/max over k (dp[i][k] + dp[k+1][j] + cost)` | O(n³) | Matrix Chain, Stone Game, Burst Balloons (LC 312) |
| Điểm chia tối ưu | "Nổ/ghép phần tử theo thứ tự chọn" | duyệt điểm `k` cuối cùng trong khoảng | O(n³) | Burst Balloons (LC 312) |

> 💡 Ghi nhớ: Dấu hiệu **interval DP** rất đặc trưng — có một vòng lặp `k` *bên trong* `(i, j)` để duyệt "điểm chia/điểm cuối cùng". Đó là điểm phân biệt với string DP (chỉ có 2 vòng `i, j`). Vì có 3 vòng lồng nhau, interval DP thường là **O(n³)**.

## 4. Bài mẫu giải chi tiết

### 4.1. Bài mẫu 1 — Longest Common Subsequence (LC 1143)

**Hiểu đề.** Cho hai chuỗi `text1`, `text2`. Một *subsequence* là chuỗi thu được bằng cách xóa bớt ký tự nhưng **giữ nguyên thứ tự** (không cần liền nhau). Tìm độ dài subsequence **chung** dài nhất. Ví dụ `text1 = "abcde"`, `text2 = "ace"` → LCS là `"ace"`, độ dài **3**.

**Ý tưởng & vì sao.** Đây là dạng kinh điển "hai chuỗi → 2D". Định nghĩa:

> `dp[i][j]` = độ dài LCS của `i` ký tự đầu của `text1` và `j` ký tự đầu của `text2`.

Xét ký tự cuối đang so — `text1[i-1]` và `text2[j-1]`:

- **Khớp** (`text1[i-1] == text2[j-1]`): cặp ký tự này chắc chắn nên đưa vào LCS. Bỏ cả hai ra, giải bài nhỏ hơn: `dp[i][j] = dp[i-1][j-1] + 1`.
- **Không khớp**: ít nhất một trong hai ký tự cuối *không* nằm trong LCS. Thử bỏ ký tự cuối của `text1` (→ `dp[i-1][j]`) hoặc bỏ ký tự cuối của `text2` (→ `dp[i][j-1]`), lấy cái lớn hơn: `dp[i][j] = max(dp[i-1][j], dp[i][j-1])`.

Base case: nếu một chuỗi rỗng thì LCS = 0 → hàng 0 và cột 0 toàn 0 (đã tự đúng nhờ khởi tạo).

**Bảng DP minh họa** với `text1 = "abcde"` (hàng), `text2 = "ace"` (cột). Ô tô đậm là nơi ký tự khớp (lấy chéo + 1):

```text
          ""   a    c    e        <- text2
     ""   0    0    0    0
     a    0   [1]   1    1
     b    0    1    1    1
     c    0    1   [2]   2
     d    0    1    2    2
     e    0    1    2   [3]
     ^ text1
```

Đọc bảng: ô `(a, a)` khớp → lấy chéo `0 + 1 = 1`. Ô `(c, c)` khớp → chéo `1 + 1 = 2`. Ô `(e, e)` khớp → chéo `2 + 1 = 3`. Các ô không khớp lấy max(trên, trái). Đáp án nằm ở góc dưới-phải: `dp[5][3] = 3`.

**Code.**

```python
def longest_common_subsequence(text1, text2):
    n, m = len(text1), len(text2)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if text1[i - 1] == text2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[n][m]
```
```javascript
function longestCommonSubsequence(text1, text2) {
    const n = text1.length, m = text2.length;
    const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            if (text1[i - 1] === text2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp[n][m];
}
```
```java
static int longestCommonSubsequence(String text1, String text2) {
    int n = text1.length(), m = text2.length();
    int[][] dp = new int[n + 1][m + 1];
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (text1.charAt(i - 1) == text2.charAt(j - 1)) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp[n][m];
}
```
```go
func longestCommonSubsequence(text1, text2 string) int {
    n, m := len(text1), len(text2)
    dp := make([][]int, n+1)
    for i := range dp {
        dp[i] = make([]int, m+1)
    }
    for i := 1; i <= n; i++ {
        for j := 1; j <= m; j++ {
            if text1[i-1] == text2[j-1] {
                dp[i][j] = dp[i-1][j-1] + 1
            } else {
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
            }
        }
    }
    return dp[n][m]
}
```

```cpp
int longestCommonSubsequence(const string& text1, const string& text2) {
    int n = text1.size(), m = text2.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (text1[i - 1] == text2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp[n][m];
}
```

**Phân tích độ phức tạp.** Bảng có `(n+1)(m+1)` ô, mỗi ô O(1) → **thời gian O(n·m)**, **bộ nhớ O(n·m)**. Có thể giảm bộ nhớ xuống O(min(n, m)) bằng rolling array (xem phần 6).

**Bẫy.** (1) Đừng nhầm **subsequence** (không cần liền) với **substring** (phải liền) — substring chung dài nhất là bài khác (`dp[i][j]` reset về 0 khi lệch). (2) Off-by-one: nhớ `text1[i-1]` chứ không phải `text1[i]`.

### 4.2. Bài mẫu 2 — Edit Distance / Levenshtein (LC 72)

**Hiểu đề.** Cho `word1`, `word2`. Mỗi bước được phép **chèn (insert)**, **xóa (delete)** hoặc **thay (replace)** một ký tự. Tìm số bước **ít nhất** để biến `word1` thành `word2`. Ví dụ `"horse" → "ros"` cần **3** bước (`horse → rorse` thay h→r, `rorse → rose` xóa r, `rose → ros` xóa e).

**Ý tưởng & vì sao.** Vẫn là "hai chuỗi → 2D":

> `dp[i][j]` = số phép biến đổi ít nhất để biến `i` ký tự đầu của `word1` thành `j` ký tự đầu của `word2`.

Xét ký tự cuối:

- **Khớp** (`word1[i-1] == word2[j-1]`): không tốn thao tác nào cho cặp này → `dp[i][j] = dp[i-1][j-1]`.
- **Không khớp**: lấy min của 3 lựa chọn, mỗi cái + 1 thao tác:
  - **Replace**: thay `word1[i-1]` thành `word2[j-1]` → `dp[i-1][j-1] + 1`.
  - **Delete**: xóa `word1[i-1]` → `dp[i-1][j] + 1`.
  - **Insert**: chèn `word2[j-1]` vào cuối `word1` → `dp[i][j-1] + 1`.

Base case (rất quan trọng ở bài này, **không** mặc định 0): biến chuỗi rỗng thành `j` ký tự cần `j` lần insert → `dp[0][j] = j`; biến `i` ký tự thành rỗng cần `i` lần delete → `dp[i][0] = i`.

**Bảng DP minh họa** với `word1 = "horse"` (hàng), `word2 = "ros"` (cột). Lưu ý hàng 0 = `0,1,2,3` và cột 0 = `0,1,2,3,4,5` (chính là base case):

```text
          ""   r    o    s        <- word2
     ""    0   1    2    3
     h     1   1    2    3
     o     2   2   [1]   2
     r     3  [2]   2    2
     s     4   3    3   [2]
     e     5   4    4    3
     ^ word1
```

Đọc vài ô: `(o, o)` khớp → lấy chéo `dp[1][1]=1`, giữ nguyên `1`. `(r, r)` khớp → chéo `dp[2][0]=2`. Ô không khớp như `(s, s)` cuối: `s==s` khớp → chéo `dp[4][2]=2`. Góc dưới-phải `dp[5][3] = 3` chính là đáp án.

**Code.**

```python
def min_distance(word1, word2):
    n, m = len(word1), len(word2)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i                 # base: xóa hết
    for j in range(m + 1):
        dp[0][j] = j                 # base: chèn hết
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if word1[i - 1] == word2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j - 1],  # replace
                                   dp[i - 1][j],      # delete
                                   dp[i][j - 1])      # insert
    return dp[n][m]
```
```javascript
function minDistance(word1, word2) {
    const n = word1.length, m = word2.length;
    const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
    for (let i = 0; i <= n; i++) dp[i][0] = i;   // base: xóa hết
    for (let j = 0; j <= m; j++) dp[0][j] = j;   // base: chèn hết
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            if (word1[i - 1] === word2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], // replace
                                        dp[i - 1][j],     // delete
                                        dp[i][j - 1]);    // insert
            }
        }
    }
    return dp[n][m];
}
```
```java
static int minDistance(String word1, String word2) {
    int n = word1.length(), m = word2.length();
    int[][] dp = new int[n + 1][m + 1];
    for (int i = 0; i <= n; i++) dp[i][0] = i;   // base: xóa hết
    for (int j = 0; j <= m; j++) dp[0][j] = j;   // base: chèn hết
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (word1.charAt(i - 1) == word2.charAt(j - 1)) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j - 1],
                              Math.min(dp[i - 1][j], dp[i][j - 1]));
            }
        }
    }
    return dp[n][m];
}
```
```go
func minDistance(word1, word2 string) int {
    n, m := len(word1), len(word2)
    dp := make([][]int, n+1)
    for i := range dp {
        dp[i] = make([]int, m+1)
        dp[i][0] = i // base: xóa hết
    }
    for j := 0; j <= m; j++ {
        dp[0][j] = j // base: chèn hết
    }
    for i := 1; i <= n; i++ {
        for j := 1; j <= m; j++ {
            if word1[i-1] == word2[j-1] {
                dp[i][j] = dp[i-1][j-1]
            } else {
                dp[i][j] = 1 + min(dp[i-1][j-1], min(dp[i-1][j], dp[i][j-1]))
            }
        }
    }
    return dp[n][m]
}
```

```cpp
int minDistance(const string& word1, const string& word2) {
    int n = word1.size(), m = word2.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));
    for (int i = 0; i <= n; i++) dp[i][0] = i;   // base: xóa hết
    for (int j = 0; j <= m; j++) dp[0][j] = j;   // base: chèn hết
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (word1[i - 1] == word2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + min({dp[i - 1][j - 1],  // replace
                                    dp[i - 1][j],      // delete
                                    dp[i][j - 1]});    // insert
            }
        }
    }
    return dp[n][m];
}
```

**Phân tích độ phức tạp.** **Thời gian O(n·m)**, **bộ nhớ O(n·m)** (giảm được xuống O(m) bằng rolling array). Mỗi ô chỉ nhìn 3 ô láng giềng → O(1).

**Bẫy.** (1) **Quên base case** — nếu để hàng/cột 0 toàn 0 (như LCS) thì sai ngay, vì biến rỗng thành "abc" tốn 3 chứ không phải 0. (2) Lẫn lộn hướng insert/delete: nhớ delete = bỏ ký tự của `word1` (đi từ `dp[i-1][j]`), insert = thêm ký tự của `word2` (đi từ `dp[i][j-1]`).

### 4.3. Bài mẫu 3 — Maximal Square (LC 221)

**Hiểu đề.** Cho ma trận nhị phân `matrix` gồm `0` và `1`. Tìm **hình vuông** lớn nhất chỉ chứa toàn `1`, trả về **diện tích** của nó.

**Ý tưởng & vì sao.** Dạng grid DP với mẹo "ô = góc dưới-phải":

> `dp[r][c]` = cạnh của hình vuông toàn `1` **lớn nhất có góc dưới-phải tại ô `(r, c)`**.

Nếu `matrix[r][c] == 1`, hình vuông tại đây chỉ "mọc" được tới mức mà **cả ba** hình vuông láng giềng (trên, trái, chéo trên-trái) cùng cho phép — nên lấy **min** rồi + 1:

```text
dp[r][c] = 1 + min(dp[r-1][c], dp[r][c-1], dp[r-1][c-1])   nếu matrix[r][c] == 1
dp[r][c] = 0                                               nếu matrix[r][c] == 0
```

Trực giác `min`: một hình vuông cạnh `k+1` kết thúc tại `(r,c)` tồn tại khi và chỉ khi cả ba hướng đều đỡ được hình vuông cạnh `k`. Đáp án là `(max ô)²`.

**Code.**

```python
def maximal_square(matrix):
    if not matrix:
        return 0
    n, m = len(matrix), len(matrix[0])
    dp = [[0] * (m + 1) for _ in range(n + 1)]   # đệm 1 hàng/cột 0
    best = 0
    for r in range(1, n + 1):
        for c in range(1, m + 1):
            if matrix[r - 1][c - 1] == "1":
                dp[r][c] = 1 + min(dp[r - 1][c], dp[r][c - 1], dp[r - 1][c - 1])
                best = max(best, dp[r][c])
    return best * best
```
```javascript
function maximalSquare(matrix) {
    if (!matrix.length) return 0;
    const n = matrix.length, m = matrix[0].length;
    const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
    let best = 0;
    for (let r = 1; r <= n; r++) {
        for (let c = 1; c <= m; c++) {
            if (matrix[r - 1][c - 1] === "1") {
                dp[r][c] = 1 + Math.min(dp[r - 1][c], dp[r][c - 1], dp[r - 1][c - 1]);
                best = Math.max(best, dp[r][c]);
            }
        }
    }
    return best * best;
}
```
```java
static int maximalSquare(char[][] matrix) {
    if (matrix.length == 0) return 0;
    int n = matrix.length, m = matrix[0].length, best = 0;
    int[][] dp = new int[n + 1][m + 1];
    for (int r = 1; r <= n; r++) {
        for (int c = 1; c <= m; c++) {
            if (matrix[r - 1][c - 1] == '1') {
                dp[r][c] = 1 + Math.min(dp[r - 1][c],
                              Math.min(dp[r][c - 1], dp[r - 1][c - 1]));
                best = Math.max(best, dp[r][c]);
            }
        }
    }
    return best * best;
}
```
```go
func maximalSquare(matrix [][]byte) int {
    if len(matrix) == 0 {
        return 0
    }
    n, m, best := len(matrix), len(matrix[0]), 0
    dp := make([][]int, n+1)
    for i := range dp {
        dp[i] = make([]int, m+1)
    }
    for r := 1; r <= n; r++ {
        for c := 1; c <= m; c++ {
            if matrix[r-1][c-1] == '1' {
                dp[r][c] = 1 + min(dp[r-1][c], min(dp[r][c-1], dp[r-1][c-1]))
                if dp[r][c] > best {
                    best = dp[r][c]
                }
            }
        }
    }
    return best * best
}
```

```cpp
int maximalSquare(vector<vector<char>>& matrix) {
    if (matrix.empty()) return 0;
    int n = matrix.size(), m = matrix[0].size(), best = 0;
    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0)); // đệm 1 hàng/cột 0
    for (int r = 1; r <= n; r++) {
        for (int c = 1; c <= m; c++) {
            if (matrix[r - 1][c - 1] == '1') {
                dp[r][c] = 1 + min({dp[r - 1][c], dp[r][c - 1], dp[r - 1][c - 1]});
                best = max(best, dp[r][c]);
            }
        }
    }
    return best * best;
}
```

**Phân tích độ phức tạp.** **Thời gian O(n·m)**, **bộ nhớ O(n·m)** (giảm xuống O(m) bằng rolling array vì mỗi ô chỉ cần hàng trên + ô trái). **Bẫy:** trả về **diện tích** (`cạnh²`) chứ không phải cạnh; và đề dùng ký tự `'1'`/`'0'` (char), không phải số nguyên.

## 5. Sai lầm thường gặp & cách tránh

- **Nhầm ý nghĩa hai chỉ số.** Với string DP, `i`/`j` thuộc hai chuỗi khác nhau; với interval DP, chúng là hai đầu của một dãy. Trước khi code, viết ra giấy đúng một câu định nghĩa `dp[i][j]`. Nếu không nói thành lời được, đừng code.
- **Quên/đặt sai base case.** Grid và LCS thường base = 0; edit distance base = `i`, `j`. Sai base làm cả bảng sai mà không có lỗi runtime — rất khó debug. Luôn điền biên trước.
- **Off-by-one giữa kích thước bảng và chỉ số.** Quy ước `(n+1)×(m+1)` và `A[i-1]`/`B[j-1]` cho tiền tố rỗng; trộn lẫn quy ước "đệm 1" với "không đệm" là nguồn lỗi số một.
- **Thứ tự điền sai trong interval DP.** Phải điền theo **độ dài khoảng tăng dần** (khoảng ngắn trước), vì `dp[i][j]` cần `dp[i+1][j-1]` (khoảng ngắn hơn) đã sẵn sàng. Vòng `for length`, rồi `for i`, suy ra `j = i + length - 1`.
- **Tối ưu rolling array khi vế phải còn cần giá trị cũ.** Khi nén 2D xuống 1D, ô `dp[i-1][j-1]` (chéo) bị `dp[j-1]` của hàng mới đè mất nếu duyệt sai chiều. Phải lưu lại giá trị chéo trong một biến tạm trước khi cập nhật (xem 6).
- **Nhầm substring với subsequence.** Subsequence: lệch thì lấy `max` của hai hướng (không reset). Substring liên tục: lệch thì `dp = 0`. Đọc kỹ đề chữ "con liên tiếp" hay không.

## 6. Tối ưu không gian (rolling array)

Nhiều bài DP 2D chỉ phụ thuộc **hàng trước** (`dp[i-1][...]`) và **ô bên trái** cùng hàng (`dp[i][j-1]`). Vậy không cần giữ cả bảng — chỉ cần **một hàng** (cuộn lại qua mỗi `i`). Bộ nhớ tụt từ O(n·m) xuống O(m). Đây là tối ưu hay bị hỏi follow-up trong phỏng vấn.

Khó duy nhất: ô chéo `dp[i-1][j-1]`. Khi duyệt `j` tăng dần trên mảng 1D, `dp[j-1]` đã bị giá trị **hàng mới** đè trước khi ta dùng. Cách xử lý: dùng một biến `prev` giữ lại giá trị "chéo" (hàng cũ tại `j-1`) ngay trước khi ghi đè.

Ví dụ LCS nén xuống O(min(n, m)) bộ nhớ:

```python
def lcs_rolling(text1, text2):
    if len(text2) > len(text1):           # đảm bảo text2 là chuỗi ngắn -> mảng nhỏ
        text1, text2 = text2, text1
    n, m = len(text1), len(text2)
    prev = [0] * (m + 1)
    for i in range(1, n + 1):
        cur = [0] * (m + 1)
        for j in range(1, m + 1):
            if text1[i - 1] == text2[j - 1]:
                cur[j] = prev[j - 1] + 1          # chéo (hàng trước)
            else:
                cur[j] = max(prev[j], cur[j - 1]) # trên / trái
        prev = cur
    return prev[m]
```
```javascript
function lcsRolling(text1, text2) {
    if (text2.length > text1.length) [text1, text2] = [text2, text1];
    const n = text1.length, m = text2.length;
    let prev = new Array(m + 1).fill(0);
    for (let i = 1; i <= n; i++) {
        const cur = new Array(m + 1).fill(0);
        for (let j = 1; j <= m; j++) {
            if (text1[i - 1] === text2[j - 1]) cur[j] = prev[j - 1] + 1;
            else cur[j] = Math.max(prev[j], cur[j - 1]);
        }
        prev = cur;
    }
    return prev[m];
}
```
```java
static int lcsRolling(String a, String b) {
    if (b.length() > a.length()) { String t = a; a = b; b = t; }
    int n = a.length(), m = b.length();
    int[] prev = new int[m + 1];
    for (int i = 1; i <= n; i++) {
        int[] cur = new int[m + 1];
        for (int j = 1; j <= m; j++) {
            if (a.charAt(i - 1) == b.charAt(j - 1)) cur[j] = prev[j - 1] + 1;
            else cur[j] = Math.max(prev[j], cur[j - 1]);
        }
        prev = cur;
    }
    return prev[m];
}
```
```go
func lcsRolling(a, b string) int {
    if len(b) > len(a) {
        a, b = b, a
    }
    n, m := len(a), len(b)
    prev := make([]int, m+1)
    for i := 1; i <= n; i++ {
        cur := make([]int, m+1)
        for j := 1; j <= m; j++ {
            if a[i-1] == b[j-1] {
                cur[j] = prev[j-1] + 1
            } else {
                cur[j] = max(prev[j], cur[j-1])
            }
        }
        prev = cur
    }
    return prev[m]
}
```

```cpp
int lcsRolling(string a, string b) {
    if (b.size() > a.size()) swap(a, b); // đảm bảo b là chuỗi ngắn -> mảng nhỏ
    int n = a.size(), m = b.size();
    vector<int> prev(m + 1, 0);
    for (int i = 1; i <= n; i++) {
        vector<int> cur(m + 1, 0);
        for (int j = 1; j <= m; j++) {
            if (a[i - 1] == b[j - 1]) cur[j] = prev[j - 1] + 1; // chéo (hàng trước)
            else cur[j] = max(prev[j], cur[j - 1]);             // trên / trái
        }
        prev = cur;
    }
    return prev[m];
}
```

> 💡 Ghi nhớ: Quy tắc nén bộ nhớ DP 2D — nếu transition chỉ chạm **hàng `i-1`** và **cùng hàng bên trái**, bạn nén được xuống 1–2 mảng 1D. Nếu chạm cả `dp[i-1][j-1]`, giữ một biến `prev`/`diag`. Nếu transition chạm ô **cách xa** (như interval DP) thì thường **không** nén được dễ dàng — cứ giữ bảng 2D.

> ⚠️ Bẫy: Trong phỏng vấn, **viết bản 2D đầy đủ trước** cho đúng và dễ giải thích, rồi mới nói "em có thể nén xuống O(m) bộ nhớ thế này". Nhảy thẳng vào bản nén thường gây lỗi chéo và mất điểm vì khó đọc.

## 7. Checklist tự luyện

Luyện theo đúng quy trình: nói thành lời định nghĩa `dp[i][j]` → viết transition → đặt base case → code → thử nén bộ nhớ.

- [ ] **Unique Paths (LC 62)** — *grid, đếm đường*: `dp[r][c] = dp[r-1][c] + dp[r][c-1]`, biên = 1. Nén O(n).
- [ ] **Unique Paths II (LC 63)** — *grid + obstacle*: như trên nhưng `dp=0` tại ô cấm. Bẫy: ô xuất phát có thể là rào.
- [ ] **Minimum Path Sum (LC 64)** — *grid, min chi phí*: `dp[r][c] = grid[r][c] + min(trên, trái)`.
- [ ] **Maximal Square (LC 221)** — *grid, hình vuông*: ôn lại bài mẫu 3, tự nén xuống O(m).
- [ ] **Longest Common Subsequence (LC 1143)** — *string DP*: bài mẫu 1, tự cài bản rolling.
- [ ] **Edit Distance (LC 72)** — *string DP*: bài mẫu 2, chú ý base case `i`, `j`.
- [ ] **Distinct Subsequences (LC 115)** — *string DP, đếm cách*: khớp → `dp[i-1][j-1] + dp[i-1][j]`.
- [ ] **Longest Palindromic Subsequence (LC 516)** — *interval/LCS*: làm bằng cả hai cách (LCS với reverse, và interval DP).
- [ ] **Longest Palindromic Substring (LC 5)** — *interval DP*: `dp[i][j]` đúng khi `s[i]==s[j]` và `dp[i+1][j-1]` đúng; điền theo độ dài khoảng.
- [ ] **Burst Balloons (LC 312)** — *interval DP O(n³)*: duyệt quả bóng nổ **cuối cùng** `k` trong khoảng `(i, j)`. Khó, để cuối.

> 💡 Ghi nhớ cuối bài: Mọi bài DP 2D trong phỏng vấn rút gọn về ba câu hỏi. (1) **Bao nhiêu tham số định danh một bài con?** → ra chiều bảng. (2) **Ô hiện tại phụ thuộc ô nào?** → ra transition và thứ tự điền. (3) **Bài con nhỏ nhất là gì?** → ra base case. Trả lời được ba câu này trên giấy thì code chỉ là chép lại. Kết hợp với DP I, bạn đã có đủ khung để xử lý gần như mọi bài DP mức phỏng vấn.
