# Dynamic Programming II: 2D & string

Ở bài DP I bạn đã nắm bộ xương: định nghĩa **state** → viết **transition** → đặt **base case** → chọn thứ tự điền bảng. Toàn bộ ví dụ ở đó đều dùng bảng **1 chiều** `dp[i]`. Bài này lên một nấc: khi state cần **hai tham số** thì bảng trở thành **2 chiều** `dp[i][j]`, và đây chính là nhóm bài hay xuất hiện nhất trong phỏng vấn big-tech: DP trên **grid**, DP trên **hai chuỗi**, và **interval DP** (chia khoảng).

Mục tiêu thực dụng của bài: nhìn đề là **đoán ngay được chiều của bảng** và **ý nghĩa từng ô**. Khi bạn nói đúng câu "`dp[i][j]` là... xét tới ký tự thứ i của chuỗi A và thứ j của chuỗi B" thì 80% lời giải đã xong — phần còn lại chỉ là điền công thức truy hồi. Chúng ta sẽ luyện đúng phản xạ đó, kèm hai bài mẫu (LCS và edit distance) có **bảng DP vẽ từng ô** để bạn thấy nó chạy thế nào.

## 1. Trực giác: khi nào DP nhảy lên 2 chiều?

Một state 1D `dp[i]` đủ khi "vị trí hiện tại" mô tả trọn vẹn bài con — ví dụ "đứng ở bậc thang `i`" hay "xét tới phần tử `i`". DP nhảy lên 2D khi **một con số không đủ** để mô tả bài con; bạn cần hai trục độc lập:

- **Hai chuỗi đi song song**: state là "đã xét tới ký tự `i` của chuỗi A *và* ký tự `j` của chuỗi B" → bảng `dp[i][j]`. (LCS, edit distance, regex matching.)
- **Tọa độ trên lưới**: state là "đứng tại ô `(r, c)`" → bảng `dp[r][c]`. (Unique paths, min path sum, maximal square.)
- **Một khoảng con `[i..j]`**: state là "đã giải xong đoạn từ `i` đến `j`" → bảng `dp[i][j]` nhưng `j` là **điểm cuối khoảng**, không phải chuỗi thứ hai. (Interval DP: matrix chain, burst balloons, palindrome.)

> Ghi nhớ: Hỏi mình một câu — "Cần bao nhiêu con số để định danh duy nhất một bài con?". Một con số → 1D. Hai con số độc lập → 2D. Đó là toàn bộ trực giác về chiều của bảng.

### Bảng nhận diện pattern DP (rất quan trọng)

| Thấy gì trong đề | Khả năng cao là | State điển hình |
| --- | --- | --- |
| **Hai chuỗi/mảng** so khớp với nhau (subsequence chung, biến đổi A thành B, khớp pattern) | **String DP 2D** | `dp[i][j]` = kết quả khi xét tới `A[..i]`, `B[..j]` |
| Lưới `m×n`, đi từ góc này sang góc kia, chỉ được sang phải/xuống | **Grid DP** | `dp[r][c]` = kết quả tối ưu để tới ô `(r,c)` |
| Lưới, tìm **hình vuông/hình chữ nhật** con thỏa điều kiện | **Grid DP** (ô = góc dưới-phải) | `dp[r][c]` = cạnh/diện tích max kết thúc tại `(r,c)` |
| "Chia một dãy/chuỗi thành các **khoảng**", chi phí phụ thuộc cách chia | **Interval DP** | `dp[i][j]` = tối ưu cho đoạn `[i..j]` |
| Một chuỗi, hỏi về **đối xứng / palindrome** | **Interval DP** (hoặc 2D) | `dp[i][j]` = thông tin về `s[i..j]` |
| "Số cách đi" / "min-max chi phí" + bài con trùng lặp | DP (chiều tùy bài) | tùy số tham số |

> Bẫy: "Hai chuỗi → 2D" và "chia khoảng → 2D" **trông giống nhau** (đều `dp[i][j]`) nhưng ý nghĩa hai chỉ số khác hẳn. String DP: `i`, `j` thuộc hai chuỗi *khác nhau*. Interval DP: `i`, `j` là *hai đầu* của cùng một dãy. Xác định nhầm là sai từ gốc.

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

> Ghi nhớ: Quy ước **chỉ số lệch 1** — `dp[i][j]` xét **`i` ký tự đầu** của A và **`j` ký tự đầu** của B, nên ký tự hiện tại là `A[i-1]`, `B[j-1]`. Hàng 0 và cột 0 ứng với "chuỗi rỗng". Quy ước này khử được phần lớn lỗi off-by-one của DP 2D.

## 3. Bảng DẠNG BÀI (problem patterns)

### 3.1. Grid DP — đi trên lưới

| Dạng | Dấu hiệu nhận biết | Hướng làm | Độ phức tạp | Bài kinh điển |
| --- | --- | --- | --- | --- |
| Đếm đường đi | Lưới `m×n`, chỉ sang phải/xuống, hỏi "có bao nhiêu cách" | `dp[r][c] = dp[r-1][c] + dp[r][c-1]`; biên = 1 | O(mn) / O(n) | Unique Paths (LC 62), Unique Paths II (LC 63) |
| Min/max chi phí đường | Mỗi ô có chi phí, tìm đường tổng nhỏ nhất | `dp[r][c] = grid[r][c] + min(dp[r-1][c], dp[r][c-1])` | O(mn) / O(n) | Minimum Path Sum (LC 64), Triangle (LC 120) |
| Hình vuông/CN con | Tìm hình vuông toàn số 1 lớn nhất | `dp[r][c] = 1 + min(trên, trái, chéo)` nếu ô = 1 | O(mn) / O(n) | Maximal Square (LC 221) |
| Đi với rào cản | Có ô cấm (obstacle) | Như đếm đường nhưng `dp=0` tại ô cấm | O(mn) | Unique Paths II (LC 63) |

Ví dụ không có ô cấm: bắt đầu (0,0), chỉ đi phải hoặc xuống tới (2,2).

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 320" role="img" aria-labelledby="dsg12-grid-t dsg12-grid-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsg12-grid-t">Unique Paths: điền lưới 3×3</title>
<desc id="dsg12-grid-d">Unique Paths: điền lưới 3×3</desc>
<defs><marker id="dsg12-grid-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260.0" y="24" text-anchor="middle" font-size="16" fill="currentColor">Unique Paths: điền lưới 3×3</text>
<rect x="150" y="65" width="60" height="48" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<g data-step="1"><text x="180" y="95" text-anchor="middle" font-size="18" fill="currentColor">1</text></g>
<rect x="224" y="65" width="60" height="48" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<g data-step="2"><text x="254" y="95" text-anchor="middle" font-size="18" fill="currentColor">1</text></g>
<rect x="298" y="65" width="60" height="48" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<g data-step="3"><text x="328" y="95" text-anchor="middle" font-size="18" fill="currentColor">1</text></g>
<rect x="150" y="130" width="60" height="48" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<g data-step="4"><text x="180" y="160" text-anchor="middle" font-size="18" fill="currentColor">1</text></g>
<rect x="224" y="130" width="60" height="48" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<g data-step="5"><text x="254" y="160" text-anchor="middle" font-size="18" fill="currentColor">2</text></g>
<g data-step="5" data-until="5"><path d="M254 113 L254 128" fill="none" stroke="currentColor" marker-end="url(#dsg12-grid-a)"/><path d="M210 154 L222 154" fill="none" stroke="currentColor" marker-end="url(#dsg12-grid-a)"/></g>
<rect x="298" y="130" width="60" height="48" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<g data-step="6"><text x="328" y="160" text-anchor="middle" font-size="18" fill="currentColor">3</text></g>
<g data-step="6" data-until="6"><path d="M328 113 L328 128" fill="none" stroke="currentColor" marker-end="url(#dsg12-grid-a)"/><path d="M284 154 L296 154" fill="none" stroke="currentColor" marker-end="url(#dsg12-grid-a)"/></g>
<rect x="150" y="195" width="60" height="48" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<g data-step="7"><text x="180" y="225" text-anchor="middle" font-size="18" fill="currentColor">1</text></g>
<rect x="224" y="195" width="60" height="48" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<g data-step="8"><text x="254" y="225" text-anchor="middle" font-size="18" fill="currentColor">3</text></g>
<g data-step="8" data-until="8"><path d="M254 178 L254 193" fill="none" stroke="currentColor" marker-end="url(#dsg12-grid-a)"/><path d="M210 219 L222 219" fill="none" stroke="currentColor" marker-end="url(#dsg12-grid-a)"/></g>
<rect x="298" y="195" width="60" height="48" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<g data-step="9"><text x="328" y="225" text-anchor="middle" font-size="18" fill="currentColor">6</text></g>
<g data-step="9"><path d="M328 178 L328 193" fill="none" stroke="currentColor" marker-end="url(#dsg12-grid-a)"/><path d="M284 219 L296 219" fill="none" stroke="currentColor" marker-end="url(#dsg12-grid-a)"/></g>
<text x="260" y="292" text-anchor="middle" font-size="14" fill="currentColor">dp[2][2]=6 đường đi · O(số hàng × số cột)</text>
</svg>
<step-note data-step="1">Ô biên (0,0) có đúng 1 đường đi từ (0,0); chỉ sang phải hoặc xuống.</step-note>
<step-note data-step="2">Ô biên (0,1) có đúng 1 đường đi từ (0,0); chỉ sang phải hoặc xuống.</step-note>
<step-note data-step="3">Ô biên (0,2) có đúng 1 đường đi từ (0,0); chỉ sang phải hoặc xuống.</step-note>
<step-note data-step="4">Ô biên (1,0) có đúng 1 đường đi từ (0,0); chỉ sang phải hoặc xuống.</step-note>
<step-note data-step="5">dp[1][1] = 1 (trên) + 1 (trái) = 2: hai hướng bước cuối không trùng nhau.</step-note>
<step-note data-step="6">dp[1][2] = 1 (trên) + 2 (trái) = 3: hai hướng bước cuối không trùng nhau.</step-note>
<step-note data-step="7">Ô biên (2,0) có đúng 1 đường đi từ (0,0); chỉ sang phải hoặc xuống.</step-note>
<step-note data-step="8">dp[2][1] = 2 (trên) + 1 (trái) = 3: hai hướng bước cuối không trùng nhau.</step-note>
<step-note data-step="9">dp[2][2] = 3 (trên) + 3 (trái) = 6: hai hướng bước cuối không trùng nhau.</step-note>
</step-flow>

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

> Ghi nhớ: Với **interval DP dạng chia/gộp**, có một vòng lặp `k` *bên trong* `(i, j)` để duyệt "điểm chia/điểm cuối cùng", nên thường là **O(n³)**. Riêng palindrome chỉ cần khoảng trong `dp[i+1][j-1]`, không duyệt `k`, nên **O(n²)**. Ý nghĩa hai chỉ số (hai đầu một khoảng) mới là dấu hiệu phân biệt với string DP trên hai chuỗi.

Ví dụ palindrome substring <code>s="aba"</code>: <code>dp[i][j] = s[i]==s[j] and (j-i&lt;2 or dp[i+1][j-1])</code>.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 330" role="img" aria-labelledby="dsg12-interval-t dsg12-interval-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsg12-interval-t">Interval DP: từ khoảng ngắn tới dài</title>
<desc id="dsg12-interval-d">Interval DP: từ khoảng ngắn tới dài</desc>
<defs><marker id="dsg12-interval-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260.0" y="24" text-anchor="middle" font-size="16" fill="currentColor">Interval DP: từ khoảng ngắn tới dài</text>
<text x="260" y="50" text-anchor="middle" font-size="14" fill="currentColor">s="aba" · dp[i][j]: s[i..j] đối xứng</text>
<text x="160" y="75" text-anchor="middle" font-size="13" fill="currentColor">0:a</text>
<text x="90" y="117" text-anchor="middle" font-size="13" fill="currentColor">0:a</text>
<text x="230" y="75" text-anchor="middle" font-size="13" fill="currentColor">1:b</text>
<text x="90" y="177" text-anchor="middle" font-size="13" fill="currentColor">1:b</text>
<text x="300" y="75" text-anchor="middle" font-size="13" fill="currentColor">2:a</text>
<text x="90" y="237" text-anchor="middle" font-size="13" fill="currentColor">2:a</text>
<rect x="130" y="88" width="60" height="48" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<rect x="200" y="88" width="60" height="48" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<rect x="270" y="88" width="60" height="48" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<rect x="200" y="148" width="60" height="48" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<rect x="270" y="148" width="60" height="48" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<rect x="270" y="208" width="60" height="48" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<g data-step="1"><text x="160" y="118" text-anchor="middle" font-size="17" fill="currentColor">T</text></g>
<g data-step="2"><text x="230" y="178" text-anchor="middle" font-size="17" fill="currentColor">T</text></g>
<g data-step="3"><text x="300" y="238" text-anchor="middle" font-size="17" fill="currentColor">T</text></g>
<g data-step="4"><text x="230" y="118" text-anchor="middle" font-size="17" fill="currentColor">F</text></g>
<g data-step="5"><text x="300" y="178" text-anchor="middle" font-size="17" fill="currentColor">F</text></g>
<g data-step="6"><text x="300" y="118" text-anchor="middle" font-size="17" fill="currentColor">T</text></g>
<g data-step="6"><path d="M230 148 L285 128" fill="none" stroke="currentColor" marker-end="url(#dsg12-interval-a)"/></g>
<text x="260" y="300" text-anchor="middle" font-size="14" fill="currentColor">Thứ tự độ dài: 1 → 2 → 3 · O(n²)</text>
</svg>
<step-note data-step="1">Độ dài 1: dp[0][0]=True, mọi ký tự đơn là palindrome.</step-note>
<step-note data-step="2">Độ dài 1: dp[1][1]=True, mọi ký tự đơn là palindrome.</step-note>
<step-note data-step="3">Độ dài 1: dp[2][2]=True, mọi ký tự đơn là palindrome.</step-note>
<step-note data-step="4">Độ dài 2: hai đầu khác nhau nên dp[0][1]=False.</step-note>
<step-note data-step="5">Độ dài 2: hai đầu khác nhau nên dp[1][2]=False.</step-note>
<step-note data-step="6">Độ dài 3: s[0]=s[2]=a và dp[1][1]=True đã tính, nên dp[0][2]=True. Không điền theo hàng từ trên xuống.</step-note>
</step-flow>

## 4. Bài mẫu giải chi tiết

### 4.1. Bài mẫu 1 — Longest Common Subsequence (LC 1143)

**Hiểu đề.** Cho hai chuỗi `text1`, `text2`. Một *subsequence* là chuỗi thu được bằng cách xóa bớt ký tự nhưng **giữ nguyên thứ tự** (không cần liền nhau). Tìm độ dài subsequence **chung** dài nhất. Ví dụ `text1 = "abcde"`, `text2 = "ace"` → LCS là `"ace"`, độ dài **3**.

**Ý tưởng & vì sao.** Đây là dạng kinh điển "hai chuỗi → 2D". Định nghĩa:

> `dp[i][j]` = độ dài LCS của `i` ký tự đầu của `text1` và `j` ký tự đầu của `text2`.

Xét ký tự cuối đang so — `text1[i-1]` và `text2[j-1]`:

- **Khớp** (`text1[i-1] == text2[j-1]`): cặp ký tự này chắc chắn nên đưa vào LCS. Bỏ cả hai ra, giải bài nhỏ hơn: `dp[i][j] = dp[i-1][j-1] + 1`.
- **Không khớp**: ít nhất một trong hai ký tự cuối *không* nằm trong LCS. Thử bỏ ký tự cuối của `text1` (→ `dp[i-1][j]`) hoặc bỏ ký tự cuối của `text2` (→ `dp[i][j-1]`), lấy cái lớn hơn: `dp[i][j] = max(dp[i-1][j], dp[i][j-1])`.

Base case: nếu một chuỗi rỗng thì LCS = 0 → hàng 0 và cột 0 toàn 0 (đã tự đúng nhờ khởi tạo).

**Bảng DP minh họa** với `text1 = "abcde"` (hàng), `text2 = "ace"` (cột). Mỗi bước điền một hàng của `text1`; ô tô màu là nơi ký tự khớp (lấy chéo + 1), bước cuối truy vết ra chuỗi:

<step-flow>
<svg viewBox="0 0 640 460" role="img" aria-labelledby="dsa12a-t dsa12a-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa12a-t">Điền bảng DP của LCS giữa "abcde" và "ace" theo từng hàng</title>
<desc id="dsa12a-d">Bảng 6x4: hàng 0 và cột 0 bằng 0; mỗi bước điền một hàng của text1. Ô khớp ký tự lấy chéo trên-trái cộng 1 (a=a ra 1, c=c ra 2, e=e ra 3), ô lệch lấy max của ô trên và ô trái. Đáp án dp[5][3] = 3 ở góc dưới-phải; truy vết ngược qua các ô khớp ra chuỗi ace.</desc>
<defs>
<marker id="dsa12a-ag" markerWidth="8" markerHeight="8" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#10b981"/></marker>
<marker id="dsa12a-aa" markerWidth="8" markerHeight="8" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#f59e0b"/></marker>
</defs>
<text x="280" y="24" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">LCS: "abcde" × "ace"</text>
<text x="60" y="54" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.7">text1 ↓ / text2 →</text>
<g font-size="14" font-weight="700" fill="currentColor" text-anchor="middle">
<text x="160" y="80">""</text>
<text x="240" y="80">a</text>
<text x="320" y="80">c</text>
<text x="400" y="80">e</text>
<text x="100" y="120">""</text>
<text x="100" y="170">a</text>
<text x="100" y="220">b</text>
<text x="100" y="270">c</text>
<text x="100" y="320">d</text>
<text x="100" y="370">e</text>
</g>
<g stroke="currentColor" stroke-opacity="0.25" fill="none">
<rect x="120" y="90" width="320" height="300" rx="6"/>
<line x1="200" y1="90" x2="200" y2="390"/>
<line x1="280" y1="90" x2="280" y2="390"/>
<line x1="360" y1="90" x2="360" y2="390"/>
<line x1="120" y1="140" x2="440" y2="140"/>
<line x1="120" y1="190" x2="440" y2="190"/>
<line x1="120" y1="240" x2="440" y2="240"/>
<line x1="120" y1="290" x2="440" y2="290"/>
<line x1="120" y1="340" x2="440" y2="340"/>
</g>
<g data-step="1">
<text x="160" y="120" font-size="14" text-anchor="middle" fill="currentColor">0</text>
<text x="240" y="120" font-size="14" text-anchor="middle" fill="currentColor">0</text>
<text x="320" y="120" font-size="14" text-anchor="middle" fill="currentColor">0</text>
<text x="400" y="120" font-size="14" text-anchor="middle" fill="currentColor">0</text>
<text x="160" y="170" font-size="14" text-anchor="middle" fill="currentColor">0</text>
<text x="160" y="220" font-size="14" text-anchor="middle" fill="currentColor">0</text>
<text x="160" y="270" font-size="14" text-anchor="middle" fill="currentColor">0</text>
<text x="160" y="320" font-size="14" text-anchor="middle" fill="currentColor">0</text>
<text x="160" y="370" font-size="14" text-anchor="middle" fill="currentColor">0</text>
<text x="456" y="120" font-size="13" fill="currentColor">base: chuỗi rỗng → 0</text>
</g>
<g data-step="2">
<line x1="174" y1="127" x2="226" y2="155" stroke="#10b981" stroke-width="1.8" marker-end="url(#dsa12a-ag)"/>
<rect x="201" y="141" width="78" height="48" fill="#10b981" fill-opacity="0.18"/>
<text x="240" y="170" font-size="14" text-anchor="middle" fill="currentColor" font-weight="700">1</text>
<text x="320" y="170" font-size="14" text-anchor="middle" fill="currentColor">1</text>
<text x="400" y="170" font-size="14" text-anchor="middle" fill="currentColor">1</text>
<text x="456" y="170" font-size="13" fill="#10b981">a = a: chéo 0 + 1 = 1</text>
</g>
<g data-step="3">
<text x="240" y="220" font-size="14" text-anchor="middle" fill="currentColor">1</text>
<text x="320" y="220" font-size="14" text-anchor="middle" fill="currentColor">1</text>
<text x="400" y="220" font-size="14" text-anchor="middle" fill="currentColor">1</text>
<text x="456" y="220" font-size="13" fill="currentColor">lệch: max(trên, trái)</text>
</g>
<g data-step="4">
<line x1="254" y1="227" x2="306" y2="255" stroke="#10b981" stroke-width="1.8" marker-end="url(#dsa12a-ag)"/>
<text x="240" y="270" font-size="14" text-anchor="middle" fill="currentColor">1</text>
<rect x="281" y="241" width="78" height="48" fill="#10b981" fill-opacity="0.18"/>
<text x="320" y="270" font-size="14" text-anchor="middle" fill="currentColor" font-weight="700">2</text>
<text x="400" y="270" font-size="14" text-anchor="middle" fill="currentColor">2</text>
<text x="456" y="270" font-size="13" fill="#10b981">c = c: chéo 1 + 1 = 2</text>
</g>
<g data-step="5">
<text x="240" y="320" font-size="14" text-anchor="middle" fill="currentColor">1</text>
<text x="320" y="320" font-size="14" text-anchor="middle" fill="currentColor">2</text>
<text x="400" y="320" font-size="14" text-anchor="middle" fill="currentColor">2</text>
<text x="456" y="320" font-size="13" fill="currentColor">lệch: max(trên, trái)</text>
</g>
<g data-step="6">
<line x1="334" y1="327" x2="386" y2="355" stroke="#10b981" stroke-width="1.8" marker-end="url(#dsa12a-ag)"/>
<text x="240" y="370" font-size="14" text-anchor="middle" fill="currentColor">1</text>
<text x="320" y="370" font-size="14" text-anchor="middle" fill="currentColor">2</text>
<rect x="361" y="341" width="78" height="48" fill="#f59e0b" fill-opacity="0.2"/>
<text x="400" y="370" font-size="14" text-anchor="middle" fill="currentColor" font-weight="700">3</text>
<text x="456" y="370" font-size="13" fill="#10b981">e = e: chéo 2 + 1 = 3</text>
</g>
<g data-step="7">
<line x1="376" y1="361" x2="328" y2="335" stroke="#f59e0b" stroke-width="2" marker-end="url(#dsa12a-aa)"/>
<line x1="342" y1="309" x2="342" y2="275" stroke="#f59e0b" stroke-width="2" marker-end="url(#dsa12a-aa)"/>
<line x1="296" y1="261" x2="248" y2="235" stroke="#f59e0b" stroke-width="2" marker-end="url(#dsa12a-aa)"/>
<line x1="262" y1="209" x2="262" y2="175" stroke="#f59e0b" stroke-width="2" marker-end="url(#dsa12a-aa)"/>
<line x1="216" y1="161" x2="168" y2="135" stroke="#f59e0b" stroke-width="2" marker-end="url(#dsa12a-aa)"/>
<rect x="364" y="344" width="72" height="42" rx="5" fill="none" stroke="#f59e0b" stroke-width="2"/>
<rect x="284" y="294" width="72" height="42" rx="5" fill="none" stroke="#f59e0b" stroke-width="2"/>
<rect x="284" y="244" width="72" height="42" rx="5" fill="none" stroke="#f59e0b" stroke-width="2"/>
<rect x="204" y="194" width="72" height="42" rx="5" fill="none" stroke="#f59e0b" stroke-width="2"/>
<rect x="204" y="144" width="72" height="42" rx="5" fill="none" stroke="#f59e0b" stroke-width="2"/>
<rect x="124" y="94" width="72" height="42" rx="5" fill="none" stroke="#f59e0b" stroke-width="2"/>
<text x="280" y="446" font-size="13" text-anchor="middle" fill="#f59e0b">truy vết: khớp → nhận ký tự, đi chéo; lệch → lên ô cùng giá trị ⇒ "ace"</text>
</g>
<text x="280" y="418" font-size="13" text-anchor="middle" fill="#10b981">khớp → lấy chéo + 1; lệch → max(trên, trái); góc dưới-phải = đáp án</text>
</svg>
<step-note data-step="1">Hàng 0 và cột 0 là LCS với một chuỗi rỗng nên luôn bằng 0. Khởi tạo bảng toàn 0 là đã có sẵn base case.</step-note>
<step-note data-step="2">Hàng <code>i = 1</code> (<code>a</code>): chỉ cột <code>a</code> khớp nên lấy <code>dp[0][0] + 1 = 1</code>. Hai ô sau lệch, lấy max(trên 0, trái 1) = 1: đã có LCS dài 1 thì nối thêm ký tự vào <code>text2</code> không làm nó ngắn đi.</step-note>
<step-note data-step="3"><code>b</code> không có trong <code>"ace"</code>, nên cả hàng đều lấy max(trên, trái) và chép lại hàng trên: thêm một ký tự không khớp không làm LCS dài ra.</step-note>
<step-note data-step="4"><code>(c, c)</code> khớp: chéo <code>dp[2][1] = 1</code> cộng 1 thành 2. Ô <code>(c, e)</code> lệch: max(trên 1, trái 2) = 2, tức là kế thừa luôn kết quả vừa tạo ở ô bên trái.</step-note>
<step-note data-step="5"><code>d</code> không khớp ký tự nào của <code>"ace"</code>: hàng chép lại 1, 2, 2 từ hàng trên.</step-note>
<step-note data-step="6"><code>(e, e)</code> khớp: chéo <code>dp[4][2] = 2</code> cộng 1 thành 3. Ô góc <code>dp[5][3] = 3</code> là đáp án vì nó xét đủ 5 ký tự của <code>text1</code> và 3 ký tự của <code>text2</code>.</step-note>
<step-note data-step="7">Bảng chỉ cho độ dài. Muốn lấy chính chuỗi thì đi ngược từ góc: ô khớp thì nhận ký tự rồi đi chéo, ô lệch thì đi tới láng giềng (trên hoặc trái) có cùng giá trị. Gom được <code>e, c, a</code>, đảo lại là <code>"ace"</code>.</step-note>
</step-flow>

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

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 380" role="img" aria-labelledby="dsa12c-edit-t dsa12c-edit-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa12c-edit-t">Edit distance điền bảng horse và ros</title>
<desc id="dsa12c-edit-d">Hàng/cột base tương ứng chuỗi rỗng, mỗi hàng xuất hiện theo bước; ô cuối bằng 3.</desc>
<defs><marker id="dsa12c-edit-a" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="currentColor"/></marker></defs>
<text x="260" y="25" font-size="14" text-anchor="middle" fill="currentColor">Edit Distance: horse → ros</text><text x="146" y="56" font-size="14" text-anchor="middle" fill="currentColor">∅</text><text x="208" y="56" font-size="14" text-anchor="middle" fill="currentColor">r</text><text x="270" y="56" font-size="14" text-anchor="middle" fill="currentColor">o</text><text x="332" y="56" font-size="14" text-anchor="middle" fill="currentColor">s</text><text x="95" y="90" font-size="14" text-anchor="middle" fill="currentColor">∅</text><rect x="118" y="65" width="56" height="41" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><rect x="180" y="65" width="56" height="41" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><rect x="242" y="65" width="56" height="41" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><rect x="304" y="65" width="56" height="41" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><text x="95" y="137" font-size="14" text-anchor="middle" fill="currentColor">h</text><rect x="118" y="112" width="56" height="41" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><rect x="180" y="112" width="56" height="41" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><rect x="242" y="112" width="56" height="41" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><rect x="304" y="112" width="56" height="41" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><text x="95" y="184" font-size="14" text-anchor="middle" fill="currentColor">o</text><rect x="118" y="159" width="56" height="41" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><rect x="180" y="159" width="56" height="41" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><rect x="242" y="159" width="56" height="41" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><rect x="304" y="159" width="56" height="41" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><text x="95" y="231" font-size="14" text-anchor="middle" fill="currentColor">r</text><rect x="118" y="206" width="56" height="41" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><rect x="180" y="206" width="56" height="41" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><rect x="242" y="206" width="56" height="41" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><rect x="304" y="206" width="56" height="41" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><text x="95" y="278" font-size="14" text-anchor="middle" fill="currentColor">s</text><rect x="118" y="253" width="56" height="41" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><rect x="180" y="253" width="56" height="41" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><rect x="242" y="253" width="56" height="41" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><rect x="304" y="253" width="56" height="41" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><text x="95" y="325" font-size="14" text-anchor="middle" fill="currentColor">e</text><rect x="118" y="300" width="56" height="41" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><rect x="180" y="300" width="56" height="41" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><rect x="242" y="300" width="56" height="41" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><rect x="304" y="300" width="56" height="41" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
<g data-step="1">
<text x="146" y="90" font-size="14" text-anchor="middle" fill="currentColor">0</text><text x="208" y="90" font-size="14" text-anchor="middle" fill="currentColor">1</text><text x="270" y="90" font-size="14" text-anchor="middle" fill="currentColor">2</text><text x="332" y="90" font-size="14" text-anchor="middle" fill="currentColor">3</text><text x="146" y="137" font-size="14" text-anchor="middle" fill="currentColor">1</text><text x="146" y="184" font-size="14" text-anchor="middle" fill="currentColor">2</text><text x="146" y="231" font-size="14" text-anchor="middle" fill="currentColor">3</text><text x="146" y="278" font-size="14" text-anchor="middle" fill="currentColor">4</text><text x="146" y="325" font-size="14" text-anchor="middle" fill="currentColor">5</text>
</g>
<g data-step="2">
<text x="208" y="137" font-size="14" text-anchor="middle" fill="currentColor">1</text><text x="270" y="137" font-size="14" text-anchor="middle" fill="currentColor">2</text><text x="332" y="137" font-size="14" text-anchor="middle" fill="currentColor">3</text><line x1="174" y1="105" x2="180" y2="112" stroke="currentColor" stroke-width="2"  marker-end="url(#dsa12c-edit-a)"/><text x="435" y="145" font-size="14" text-anchor="middle" fill="currentColor">h ≠ r:</text><text x="435" y="170" font-size="14" text-anchor="middle" fill="currentColor">1+min(0,1,1)=1</text>
</g>
<g data-step="3">
<text x="208" y="184" font-size="14" text-anchor="middle" fill="currentColor">2</text><text x="270" y="184" font-size="14" text-anchor="middle" fill="currentColor">1</text><text x="332" y="184" font-size="14" text-anchor="middle" fill="currentColor">2</text>
</g>
<g data-step="4">
<text x="208" y="231" font-size="14" text-anchor="middle" fill="currentColor">2</text><text x="270" y="231" font-size="14" text-anchor="middle" fill="currentColor">2</text><text x="332" y="231" font-size="14" text-anchor="middle" fill="currentColor">2</text>
</g>
<g data-step="5">
<text x="208" y="278" font-size="14" text-anchor="middle" fill="currentColor">3</text><text x="270" y="278" font-size="14" text-anchor="middle" fill="currentColor">3</text><text x="332" y="278" font-size="14" text-anchor="middle" fill="currentColor">2</text>
</g>
<g data-step="6">
<text x="208" y="325" font-size="14" text-anchor="middle" fill="currentColor">4</text><text x="270" y="325" font-size="14" text-anchor="middle" fill="currentColor">4</text><text x="332" y="325" font-size="14" text-anchor="middle" fill="currentColor">3</text>
</g>
</svg>
<step-note data-step="1">Khởi tạo hàng 0 bằng số lần insert, cột 0 bằng số lần delete. Biên không thể để toàn 0 như LCS.</step-note>
<step-note data-step="2">Điền hàng h từ trái sang phải; khớp thì giữ chéo, lệch lấy min(trên, trái, chéo)+1. Mỗi ô O(1).</step-note>
<step-note data-step="3">Điền hàng o từ trái sang phải; khớp thì giữ chéo, lệch lấy min(trên, trái, chéo)+1. Mỗi ô O(1).</step-note>
<step-note data-step="4">Điền hàng r từ trái sang phải; khớp thì giữ chéo, lệch lấy min(trên, trái, chéo)+1. Mỗi ô O(1).</step-note>
<step-note data-step="5">Điền hàng s từ trái sang phải; khớp thì giữ chéo, lệch lấy min(trên, trái, chéo)+1. Mỗi ô O(1).</step-note>
<step-note data-step="6">Điền hàng e từ trái sang phải; khớp thì giữ chéo, lệch lấy min(trên, trái, chéo)+1. Mỗi ô O(1).</step-note>
</step-flow>

Đọc vài ô: `(o, o)` khớp → lấy chéo `dp[1][1]=1`, giữ nguyên `1`. `(r, r)` khớp → chéo `dp[2][0]=2`. Ô `(s, s)`: `s==s` khớp → chéo `dp[3][2]=2`, nên `dp[4][3]=2`. Hàng cuối là `e` (ký tự cuối của `horse`); góc dưới-phải `dp[5][3] = 3` (ô màu cam) chính là đáp án.

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

So sánh hai kiểu phụ thuộc ô trên lưới — grid DP thường (unique paths / min path sum) chỉ cần **ô trên + ô trái**, còn maximal square cần thêm **ô chéo trên-trái** (lấy min cả 3):

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 660 280" role="img" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Hướng phụ thuộc của ô (r,c) trong grid DP và maximal square</title>
  <desc>Bên trái: ô (r,c) trong unique paths và min path sum phụ thuộc ô trên và ô trái. Bên phải: maximal square phụ thuộc thêm ô chéo trên-trái, lấy min của ba láng giềng rồi cộng 1.</desc>
  <text x="160" y="24" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Grid DP: trên + trái</text>
  <text x="500" y="24" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Maximal Square: min 3 láng giềng</text>
  <defs>
    <marker id="gridArrow" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#3b82f6"/></marker>
    <marker id="sqArrow" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#10b981"/></marker>
  </defs>
  <g stroke="currentColor" stroke-opacity="0.18" fill="none">
    <rect x="80" y="50" width="160" height="160" rx="6"/>
    <line x1="133" y1="50" x2="133" y2="210"/>
    <line x1="186" y1="50" x2="186" y2="210"/>
    <line x1="80" y1="103" x2="240" y2="103"/>
    <line x1="80" y1="156" x2="240" y2="156"/>
  </g>
  <rect x="134" y="104" width="51" height="51" fill="#3b82f6" fill-opacity="0.10"/>
  <rect x="134" y="51" width="51" height="51" fill="#3b82f6" fill-opacity="0.16"/>
  <rect x="81" y="104" width="51" height="51" fill="#3b82f6" fill-opacity="0.16"/>
  <g font-size="11" fill="currentColor">
    <text x="159" y="83" text-anchor="middle" opacity="0.8">trên</text>
    <text x="106" y="134" text-anchor="middle" opacity="0.8">trái</text>
    <text x="159" y="134" text-anchor="middle" font-weight="700">(r,c)</text>
  </g>
  <g stroke="#3b82f6" stroke-width="1.6" fill="none" marker-end="url(#gridArrow)">
    <line x1="159" y1="98" x2="159" y2="122"/>
    <line x1="127" y1="130" x2="151" y2="130"/>
  </g>
  <text x="160" y="234" font-size="10.5" text-anchor="middle" fill="#3b82f6">dp[r][c] = dp[r-1][c] + dp[r][c-1]</text>
  <text x="160" y="250" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">(min path sum: grid[r][c] + min(trên, trái))</text>
  <g stroke="currentColor" stroke-opacity="0.18" fill="none">
    <rect x="420" y="50" width="160" height="160" rx="6"/>
    <line x1="473" y1="50" x2="473" y2="210"/>
    <line x1="526" y1="50" x2="526" y2="210"/>
    <line x1="420" y1="103" x2="580" y2="103"/>
    <line x1="420" y1="156" x2="580" y2="156"/>
  </g>
  <rect x="474" y="104" width="51" height="51" fill="#10b981" fill-opacity="0.10"/>
  <rect x="474" y="51" width="51" height="51" fill="#10b981" fill-opacity="0.16"/>
  <rect x="421" y="104" width="51" height="51" fill="#10b981" fill-opacity="0.16"/>
  <rect x="421" y="51" width="51" height="51" fill="#10b981" fill-opacity="0.16"/>
  <g font-size="10.5" fill="currentColor">
    <text x="446" y="80" text-anchor="middle" opacity="0.8">chéo</text>
    <text x="499" y="83" text-anchor="middle" opacity="0.8">trên</text>
    <text x="446" y="134" text-anchor="middle" opacity="0.8">trái</text>
    <text x="499" y="134" text-anchor="middle" font-weight="700">(r,c)</text>
  </g>
  <g stroke="#10b981" stroke-width="1.6" fill="none" marker-end="url(#sqArrow)">
    <line x1="467" y1="98" x2="491" y2="122"/>
    <line x1="499" y1="98" x2="499" y2="122"/>
    <line x1="467" y1="130" x2="491" y2="130"/>
  </g>
  <text x="500" y="234" font-size="10.5" text-anchor="middle" fill="#10b981">dp[r][c] = 1 + min(trên, trái, chéo)</text>
  <text x="500" y="250" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">(chỉ khi matrix[r][c] == 1)</text>
</svg>

**Code.**

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 290" role="img" aria-labelledby="dsa12c-square-t dsa12c-square-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa12c-square-t">Maximal Square mọc từ ba láng giềng</title>
<desc id="dsa12c-square-d">Ví dụ 2×2 toàn 1, ba láng giềng cho cạnh 1, ô cuối cạnh 2, diện tích 4.</desc>
<defs><marker id="dsa12c-square-a" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="currentColor"/></marker></defs>
<text x="260" y="25" font-size="14" text-anchor="middle" fill="currentColor">Ví dụ nhỏ: matrix = [[1,1],[1,1]]</text><text x="260" y="50" font-size="14" text-anchor="middle" fill="currentColor">dp có hàng 0, cột 0 đệm bằng 0</text><rect x="125" y="75" width="58" height="48" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><rect x="190" y="75" width="58" height="48" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><rect x="255" y="75" width="58" height="48" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><rect x="125" y="130" width="58" height="48" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><rect x="190" y="130" width="58" height="48" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><rect x="255" y="130" width="58" height="48" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><rect x="125" y="185" width="58" height="48" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><rect x="190" y="185" width="58" height="48" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><rect x="255" y="185" width="58" height="48" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
<g data-step="1">
<text x="154" y="104" font-size="14" text-anchor="middle" fill="currentColor">0</text><text x="219" y="104" font-size="14" text-anchor="middle" fill="currentColor">0</text><text x="284" y="104" font-size="14" text-anchor="middle" fill="currentColor">0</text><text x="154" y="159" font-size="14" text-anchor="middle" fill="currentColor">0</text><text x="154" y="214" font-size="14" text-anchor="middle" fill="currentColor">0</text>
</g>
<g data-step="2">
<text x="219" y="159" font-size="14" text-anchor="middle" fill="currentColor">1</text><text x="284" y="159" font-size="14" text-anchor="middle" fill="currentColor">1</text><text x="219" y="214" font-size="14" text-anchor="middle" fill="currentColor">1</text>
</g>
<g data-step="3">
<text x="284" y="214" font-size="14" text-anchor="middle" fill="currentColor">2</text><line x1="245" y1="166" x2="259" y2="190" stroke="currentColor" stroke-width="2"  marker-end="url(#dsa12c-square-a)"/><line x1="284" y1="178" x2="284" y2="188" stroke="currentColor" stroke-width="2"  marker-end="url(#dsa12c-square-a)"/><line x1="248" y1="207" x2="251" y2="207" stroke="currentColor" stroke-width="2"  marker-end="url(#dsa12c-square-a)"/>
</g>
<g data-step="4">
<rect x="190" y="130" width="123" height="103" fill="#10b981" fill-opacity="0.14" stroke="#10b981" stroke-width="3"/><text x="260" y="265" font-size="14" text-anchor="middle" fill="currentColor">best=2 → diện tích=2²=4</text>
</g>
</svg>
<step-note data-step="1">Đệm biên 0 để ô đầu tiên cũng dùng được cùng một công thức, không cần nhánh riêng.</step-note>
<step-note data-step="2">Ba ô 1 đầu tiên đều có ít nhất một láng giềng biên bằng 0 nên cạnh lớn nhất ở đó là 1.</step-note>
<step-note data-step="3">Ô cuối: 1+min(1,1,1)=2. Cả trên, trái và chéo đều phải hỗ trợ thì hình vuông mới mở rộng được.</step-note>
<step-note data-step="4">Viền xanh bao đúng vùng 2×2 toàn 1. Code trả best*best=4, không trả độ dài cạnh 2.</step-note>
</step-flow>

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

**Phân tích độ phức tạp.** **Thời gian O(n·m)**, **bộ nhớ O(n·m)** (giảm xuống O(m) bằng rolling array vì mỗi ô chỉ cần hàng trên, ô trái và ô chéo trên-trái). **Bẫy:** trả về **diện tích** (`cạnh²`) chứ không phải cạnh; và đề dùng ký tự `'1'`/`'0'` (char), không phải số nguyên.

## 5. Sai lầm thường gặp & cách tránh

- **Nhầm ý nghĩa hai chỉ số.** Với string DP, `i`/`j` thuộc hai chuỗi khác nhau; với interval DP, chúng là hai đầu của một dãy. Trước khi code, viết ra giấy đúng một câu định nghĩa `dp[i][j]`. Nếu không nói thành lời được, đừng code.
- **Quên/đặt sai base case.** LCS có hàng/cột rỗng bằng 0; Unique Paths không có vật cản có biên bằng 1; edit distance có biên `i`, `j`. Sai base làm cả bảng sai mà không có lỗi runtime — rất khó debug. Luôn điền biên trước.
- **Off-by-one giữa kích thước bảng và chỉ số.** Quy ước `(n+1)×(m+1)` và `A[i-1]`/`B[j-1]` cho tiền tố rỗng; trộn lẫn quy ước "đệm 1" với "không đệm" là nguồn lỗi số một.
- **Thứ tự điền sai trong interval DP.** Phải điền theo **độ dài khoảng tăng dần** (khoảng ngắn trước), vì `dp[i][j]` cần `dp[i+1][j-1]` (khoảng ngắn hơn) đã sẵn sàng. Vòng `for length`, rồi `for i`, suy ra `j = i + length - 1`.
- **Tối ưu rolling array khi vế phải còn cần giá trị cũ.** Khi nén 2D xuống 1D, ô `dp[i-1][j-1]` (chéo) bị `dp[j-1]` của hàng mới đè mất nếu duyệt sai chiều. Phải lưu lại giá trị chéo trong một biến tạm trước khi cập nhật (xem 6).
- **Nhầm substring với subsequence.** Subsequence: lệch thì lấy `max` của hai hướng (không reset). Substring liên tục: lệch thì `dp = 0`. Đọc kỹ đề chữ "con liên tiếp" hay không.

## 6. Tối ưu không gian (rolling array)

Nhiều bài DP 2D chỉ phụ thuộc **hàng trước** (`dp[i-1][...]`) và **ô bên trái** cùng hàng (`dp[i][j-1]`). Vậy không cần giữ cả bảng — chỉ cần **một hàng** (cuộn lại qua mỗi `i`). Bộ nhớ tụt từ O(n·m) xuống O(m). Đây là tối ưu hay bị hỏi follow-up trong phỏng vấn.

Khó duy nhất: ô chéo `dp[i-1][j-1]`. Khi duyệt `j` tăng dần trên mảng 1D, `dp[j-1]` đã bị giá trị **hàng mới** đè trước khi ta dùng. Cách xử lý: dùng một biến `prev` giữ lại giá trị "chéo" (hàng cũ tại `j-1`) ngay trước khi ghi đè.

Ví dụ LCS dưới đây dùng **hai mảng** `prev` (hàng cũ) và `cur` (hàng mới), nén xuống O(min(n, m)) bộ nhớ. Vì không ghi đè `prev` khi tính `cur`, code không cần biến `diag` riêng:

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 260" role="img" aria-labelledby="dsa12c-roll-t dsa12c-roll-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa12c-roll-t">Rolling array hai hàng cho LCS</title>
<desc id="dsa12c-roll-d">Hai mảng prev và cur cố định, nối đúng các nguồn trên, trái, chéo khi điền hàng c.</desc>
<defs><marker id="dsa12c-roll-a" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="currentColor"/></marker></defs>
<text x="260" y="25" font-size="14" text-anchor="middle" fill="currentColor">LCS: từ hàng b sang hàng c (abcde / ace)</text><text x="70" y="110" font-size="14" text-anchor="middle" fill="currentColor">prev</text><text x="70" y="210" font-size="14" text-anchor="middle" fill="currentColor">cur</text><text x="158" y="60" font-size="14" text-anchor="middle" fill="currentColor">∅</text><rect x="130" y="80" width="56" height="40" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><text x="158.0" y="105.0" font-size="14" text-anchor="middle" fill="currentColor">0</text><rect x="130" y="180" width="56" height="40" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><text x="233" y="60" font-size="14" text-anchor="middle" fill="currentColor">a</text><rect x="205" y="80" width="56" height="40" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><text x="233.0" y="105.0" font-size="14" text-anchor="middle" fill="currentColor">1</text><rect x="205" y="180" width="56" height="40" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><text x="308" y="60" font-size="14" text-anchor="middle" fill="currentColor">c</text><rect x="280" y="80" width="56" height="40" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><text x="308.0" y="105.0" font-size="14" text-anchor="middle" fill="currentColor">1</text><rect x="280" y="180" width="56" height="40" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><text x="383" y="60" font-size="14" text-anchor="middle" fill="currentColor">e</text><rect x="355" y="80" width="56" height="40" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/><text x="383.0" y="105.0" font-size="14" text-anchor="middle" fill="currentColor">1</text><rect x="355" y="180" width="56" height="40" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
<g data-step="1">
<text x="158" y="205" font-size="14" text-anchor="middle" fill="currentColor">0</text>
</g>
<g data-step="2">
<text x="233" y="205" font-size="14" text-anchor="middle" fill="currentColor">1</text><line x1="233" y1="123" x2="233" y2="177" stroke="currentColor" stroke-width="2"  marker-end="url(#dsa12c-roll-a)"/><line x1="187" y1="200" x2="200" y2="200" stroke="currentColor" stroke-width="2"  marker-end="url(#dsa12c-roll-a)"/>
</g>
<g data-step="3">
<text x="308" y="205" font-size="14" text-anchor="middle" fill="currentColor">2</text><line x1="248" y1="123" x2="292" y2="177" stroke="currentColor" stroke-width="2"  marker-end="url(#dsa12c-roll-a)"/>
</g>
<g data-step="4">
<text x="383" y="205" font-size="14" text-anchor="middle" fill="currentColor">2</text><line x1="383" y1="123" x2="383" y2="177" stroke="currentColor" stroke-width="2"  marker-end="url(#dsa12c-roll-a)"/><line x1="337" y1="200" x2="350" y2="200" stroke="currentColor" stroke-width="2"  marker-end="url(#dsa12c-roll-a)"/>
</g>
</svg>
<step-note data-step="1">Đang tính i=3, ký tự c; prev chứa hàng b=[0,1,1,1]. Tạo cur mới với base cur[0]=0, không ghi đè prev.</step-note>
<step-note data-step="2">j=1: c khác a, cur[1]=max(prev[1],cur[0])=1. Hai ô được đọc đều đã có.</step-note>
<step-note data-step="3">j=2: c khớp c, lấy chéo prev[1]+1=2. Hai mảng giữ nguyên chéo hàng cũ, không cần biến diag riêng.</step-note>
<step-note data-step="4">j=3: c khác e, max(prev[3],cur[2])=2. Xong hàng mới gán prev=cur, lặp tiếp; bộ nhớ O(m).</step-note>
</step-flow>

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

> Ghi nhớ: Quy tắc nén bộ nhớ DP 2D — nếu transition chỉ chạm **hàng `i-1`** và **cùng hàng bên trái**, bạn nén được xuống 1–2 mảng 1D. Nếu chạm cả `dp[i-1][j-1]`, giữ một biến `prev`/`diag`. Nếu transition chạm ô **cách xa** (như interval DP) thì thường **không** nén được dễ dàng — cứ giữ bảng 2D.

> Bẫy: Trong phỏng vấn, **viết bản 2D đầy đủ trước** cho đúng và dễ giải thích, rồi mới nói "em có thể nén xuống O(m) bộ nhớ thế này". Nhảy thẳng vào bản nén thường gây lỗi chéo và mất điểm vì khó đọc.

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

> Ghi nhớ cuối bài: Mọi bài DP 2D trong phỏng vấn rút gọn về ba câu hỏi. (1) **Bao nhiêu tham số định danh một bài con?** → ra chiều bảng. (2) **Ô hiện tại phụ thuộc ô nào?** → ra transition và thứ tự điền. (3) **Bài con nhỏ nhất là gì?** → ra base case. Trả lời được ba câu này trên giấy thì code chỉ là chép lại. Kết hợp với DP I, bạn đã có đủ khung để xử lý gần như mọi bài DP mức phỏng vấn.
