# Khung giải bài & chiến lược phỏng vấn

Bạn đã đi qua array, hash, tree, sort, heap, backtracking, graph và DP. Nhưng kiến thức rời rạc không tự biến thành kỹ năng "thấy đề lạ là biết hướng làm". Khoảng cách giữa người **học thuộc 300 bài** và người **giải được bài chưa từng gặp** không nằm ở số lượng bài đã làm — nó nằm ở khả năng **nhận diện pattern** từ vài dấu hiệu trong đề, và ở **quy trình giải có kỷ luật** khi đứng trước whiteboard với phỏng vấn viên đang nhìn.

Bài này là bài **xương sống (capstone)** của cả khoá. Nó không dạy thuật toán mới — nó dạy cách *kết nối* mọi thứ bạn đã học thành một bộ khung quyết định, một quy trình phỏng vấn 7 bước, và một lộ trình luyện tập theo pattern (không phải theo số lượng). Đây là phần mà ứng viên giỏi và ứng viên trượt khác nhau rõ nhất — không phải vì ai biết nhiều thuật toán hơn, mà vì ai có **hệ thống** rõ ràng hơn.

> 💡 Ghi nhớ: Mục tiêu của bài này không phải "biết thêm". Mục tiêu là **phản xạ**: đọc đề → trong 60 giây gắn được vào 1-2 pattern → biết ngay độ phức tạp mục tiêu và cấu trúc dữ liệu cần dùng. Phản xạ đó đến từ bảng tra dưới đây cộng với luyện tập có chủ đích.

---

## 1. Trực giác cốt lõi: mọi bài đều là biến thể của vài khung

Một sự thật giải phóng tâm lý: **phỏng vấn DSA không vô hạn**. Có khoảng **15-20 pattern** lặp đi lặp lại trong gần như mọi bài LeetCode mức medium/hard mà big-tech hỏi. Khi bạn nội hoá được các pattern này, một bài "lạ" thực ra chỉ là một pattern quen khoác áo mới.

Quá trình giải một bài lạ luôn đi theo cùng một mạch:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 480" role="img" style="width:100%;max-width:420px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Phễu giải một bài DSA lạ: từ đọc đề tới test</title>
  <desc>Quy trình sáu bước theo chiều dọc: đọc đề, trích tín hiệu (hình dạng input, dạng kết quả, ràng buộc n), map sang pattern bằng bảng tra mục 3, suy ra cấu trúc dữ liệu và độ phức tạp mục tiêu, dựng khung code, rồi test edge case và phân tích time/space.</desc>
  <defs>
    <marker id="fnl-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <g text-anchor="middle">
    <rect x="110" y="14" width="200" height="44" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="210" y="41" font-size="13.5" font-weight="700" fill="currentColor">Đọc đề</text>

    <rect x="40" y="86" width="340" height="62" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="210" y="108" font-size="13" font-weight="700" fill="currentColor">Trích "tín hiệu" (signals)</text>
    <text x="210" y="127" font-size="10.5" fill="currentColor" opacity="0.75">hình dạng input · dạng kết quả cần</text>
    <text x="210" y="141" font-size="10.5" fill="currentColor" opacity="0.75">ràng buộc n</text>

    <rect x="40" y="176" width="340" height="48" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="210" y="200" font-size="13" font-weight="700" fill="currentColor">Map tín hiệu → pattern</text>
    <text x="210" y="216" font-size="10.5" fill="currentColor" opacity="0.75">dùng BẢNG TRA mục 3</text>

    <rect x="40" y="252" width="340" height="48" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="210" y="276" font-size="13" font-weight="700" fill="currentColor">Suy ra cấu trúc dữ liệu</text>
    <text x="210" y="292" font-size="10.5" fill="currentColor" opacity="0.75">+ độ phức tạp mục tiêu</text>

    <rect x="40" y="328" width="340" height="48" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="210" y="352" font-size="13" font-weight="700" fill="currentColor">Dựng khung code của pattern</text>
    <text x="210" y="368" font-size="10.5" fill="currentColor" opacity="0.75">→ điền chi tiết bài</text>

    <rect x="40" y="404" width="340" height="48" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="210" y="428" font-size="13" font-weight="700" fill="currentColor">Test edge case</text>
    <text x="210" y="444" font-size="10.5" fill="currentColor" opacity="0.75">→ phân tích time/space</text>
  </g>
  <g stroke="currentColor" stroke-width="1.6" fill="none" marker-end="url(#fnl-arrow)" stroke-opacity="0.7">
    <path d="M210 58 V84"/>
    <path d="M210 148 V174"/>
    <path d="M210 224 V250"/>
    <path d="M210 300 V326"/>
    <path d="M210 376 V402"/>
  </g>
</svg>

> 💡 Ghi nhớ: Hai tín hiệu mạnh nhất luôn là (1) **hình dạng input** (mảng đã sort? cây? đồ thị? chuỗi?) và (2) **dạng kết quả cần** (một số đếm? min/max? tất cả tổ hợp? có/không? phần tử thứ k?). Chỉ riêng hai cái này đã loại được 80% pattern không liên quan.

### Ràng buộc `n` tiết lộ độ phức tạp mục tiêu

Trước khi nghĩ thuật toán, hãy nhìn `n` (kích thước input). Nó **bật mí** độ phức tạp mà người ra đề mong đợi — đây là một mẹo cực mạnh ít người dùng:

| `n` cỡ | Độ phức tạp chấp nhận được | Gợi ý kỹ thuật |
|---|---|---|
| n ≤ 12 | O(n!) | permutation, brute-force toàn bộ |
| n ≤ 20 | O(2^n) | subset/bitmask, backtracking đầy đủ |
| n ≤ 100-500 | O(n^3) | DP 3 chiều, Floyd-Warshall |
| n ≤ 10^3-10^4 | O(n^2) | DP 2D, brute-force cặp, nested loop |
| n ≤ 10^5-10^6 | O(n log n) | sort, heap, binary search, divide & conquer |
| n ≤ 10^7-10^8 | O(n) hoặc O(n log n) | two-pointer, sliding window, prefix sum, hash |
| n cực lớn / nhiều query | O(log n) / O(1) mỗi query | binary search, công thức toán, precompute |

> ⚠️ Bẫy: Đừng nhảy vào tối ưu O(log n) khi `n ≤ 20`. Với `n` nhỏ, backtracking O(2^n) là **đáp án mong đợi** và sạch hơn nhiều — cố ép DP/greedy phức tạp chỉ tốn thời gian và dễ sai. Luôn để `n` dẫn đường.

---

## 2. Khung tư duy chung khi đứng trước một bài

Trước khi đến bảng tra cụ thể, hãy nắm bộ câu hỏi tổng quát tự đặt cho **mọi** bài. Đây là "template suy nghĩ" — không phải code:

```
1. Input là gì?      mảng / chuỗi / cây / graph / matrix / số
2. Input có sort?    nếu có → nghĩ binary search / two-pointer
3. Kết quả cần?      đếm / min-max / liệt kê tất cả / kiểm tra tồn tại / thứ k
4. Có "tối ưu hoá"?  min/max/đếm cách → nghĩ DP hoặc greedy
5. Có "tất cả/mọi"?  liệt kê tất cả → nghĩ backtracking
6. Có quan hệ kề?    connect/cycle/path → nghĩ graph (BFS/DFS/DSU)
7. Cần lookup nhanh?  "đã thấy chưa", "đếm tần suất" → hash map/set
8. Cần thứ k / top k?  → heap (priority queue)
9. Cửa sổ liên tiếp?  substring/subarray liên tục → sliding window
10. n bao nhiêu?     → suy độ phức tạp mục tiêu (bảng mục 1)
```

Đi qua 10 câu này trong đầu mất chừng một phút và gần như luôn ghim được pattern.

---

## 3. BẢNG TRA "THẤY GÌ → NGHĨ PATTERN GÌ" (phần quan trọng nhất)

Đây là trái tim của bài. Học thuộc bảng này — nó là từ điển dịch từ "ngôn ngữ đề bài" sang "ngôn ngữ giải thuật". Mỗi dòng: **dấu hiệu trong đề → pattern → độ phức tạp điển hình → bài kinh điển**.

### Nhóm A — Array / String tuyến tính

| Thấy gì trong đề | Nghĩ pattern | Độ phức tạp | Bài kinh điển (LeetCode) |
|---|---|---|---|
| Mảng **đã sort**, tìm cặp/tổng | **Two-pointer** (2 đầu) | O(n) | Two Sum II, 3Sum |
| Mảng **đã sort**, tìm 1 giá trị / biên | **Binary search** | O(log n) | Binary Search, Search Insert Position |
| **Substring / subarray liên tục** thoả điều kiện | **Sliding window** | O(n) | Longest Substring Without Repeating, Min Size Subarray Sum |
| Tổng/đếm trên **nhiều range** của mảng | **Prefix sum** | O(n) precompute, O(1) query | Range Sum Query, Subarray Sum Equals K |
| "Đã thấy chưa", "đếm tần suất", "bù (complement)" | **Hash map / set** | O(n) | Two Sum, Group Anagrams |
| Tìm min/max **lớn nhất sao cho điều kiện đúng** | **Binary search on answer** | O(n log(range)) | Koko Eating Bananas, Capacity to Ship |
| Đảo chỗ / xoá tại chỗ, hai con trỏ đọc-ghi | **Two-pointer (đọc/ghi)** | O(n) | Remove Duplicates, Move Zeroes |

### Nhóm B — Cấu trúc dữ liệu chuyên dụng

| Thấy gì trong đề | Nghĩ pattern | Độ phức tạp | Bài kinh điển |
|---|---|---|---|
| "**k** phần tử lớn nhất/nhỏ nhất", "top k", "thứ k" | **Heap (priority queue)** | O(n log k) | Kth Largest Element, Top K Frequent |
| "Merge **k** danh sách đã sort", median của stream | **Heap** | O(n log k) | Merge k Sorted Lists, Find Median from Stream |
| Tìm "phần tử kế tiếp **lớn hơn/nhỏ hơn**" | **Monotonic stack** | O(n) | Daily Temperatures, Next Greater Element |
| Dấu mở/đóng, lồng nhau, undo gần nhất | **Stack** | O(n) | Valid Parentheses, Min Stack |
| Max/min trong **cửa sổ trượt** | **Monotonic deque** | O(n) | Sliding Window Maximum |
| Tra cứu tiền tố chuỗi, autocomplete | **Trie** | O(L) mỗi từ | Implement Trie, Word Search II |

### Nhóm C — Tree / Graph

| Thấy gì trong đề | Nghĩ pattern | Độ phức tạp | Bài kinh điển |
|---|---|---|---|
| Duyệt cây, đường đi gốc→lá, đối xứng | **DFS đệ quy trên tree** | O(n) | Max Depth, Path Sum, Invert Tree |
| Cây theo **từng tầng (level)** | **BFS (level-order)** | O(n) | Level Order Traversal, Right Side View |
| "Có **đường đi** giữa hai node", "**connected**" | **Graph BFS/DFS / Union-Find** | O(V+E) | Number of Islands, Graph Valid Tree |
| Đếm "số cụm/đảo/nhóm" | **DSU (Union-Find)** hoặc flood fill | O(V·α) | Number of Provinces, Number of Islands |
| Có **chu trình (cycle)** không / thứ tự phụ thuộc | **Topological sort / DFS cycle** | O(V+E) | Course Schedule I/II |
| Đường đi **ngắn nhất, trọng số dương** | **Dijkstra (heap)** | O(E log V) | Network Delay Time, Cheapest Flights |
| Đường ngắn nhất trên **grid không trọng số** | **BFS** | O(V+E) | Rotting Oranges, Shortest Path in Binary Matrix |

### Nhóm D — Đệ quy / Tổ hợp

| Thấy gì trong đề | Nghĩ pattern | Độ phức tạp | Bài kinh điển |
|---|---|---|---|
| "**Liệt kê tất cả** tổ hợp / hoán vị / tập con" | **Backtracking** | O(2^n) / O(n!) | Subsets, Permutations, Combination Sum |
| "Tìm **một** cấu hình thoả mãn" (đặt quân, điền số) | **Backtracking + pruning** | mũ | N-Queens, Sudoku Solver, Word Search |
| Bài chia nhỏ độc lập rồi gộp | **Divide & conquer** | thường O(n log n) | Merge Sort, Maximum Subarray (D&C) |

### Nhóm E — Dynamic Programming

| Thấy gì trong đề | Nghĩ pattern | Độ phức tạp | Bài kinh điển |
|---|---|---|---|
| "**Đếm số cách**" làm gì đó | **DP đếm** | O(n) / O(n·m) | Climbing Stairs, Unique Paths, Coin Change II |
| "Giá trị **min/max**" qua chuỗi lựa chọn | **DP tối ưu** | O(n) / O(n·m) | House Robber, Min Path Sum, Coin Change |
| "Có thể đạt được / chia được không" (boolean) | **DP khả thi** | O(n·sum) | Partition Equal Subset Sum, Word Break |
| Hai chuỗi: so khớp / chỉnh sửa / chung dài nhất | **DP 2D trên string** | O(n·m) | Edit Distance, Longest Common Subsequence |
| Dãy con tăng / đặc tính trên subsequence | **DP subsequence** | O(n^2) → O(n log n) | Longest Increasing Subsequence |
| Chọn item với sức chứa giới hạn | **Knapsack** | O(n·W) | 0/1 Knapsack, Target Sum |

> 💡 Ghi nhớ: Ba từ khoá quyết định nhất trong đề DP là **"đếm số cách"** (count), **"min/max"** (optimize), và **"có thể không"** (feasibility). Thấy một trong ba + có *lựa chọn lặp lại với cấu trúc con chồng lấn* → gần như chắc chắn là DP.

> ⚠️ Bẫy: Đừng nhầm **DP** với **greedy**. Cả hai đều xử lý min/max. Greedy chỉ đúng khi "chọn tốt nhất tại mỗi bước" dẫn tới tối ưu toàn cục (cần chứng minh hoặc ràng buộc đặc biệt). Khi nghi ngờ, DP an toàn hơn — coin change `[1,3,4]` cho `amount=6` là phản ví dụ kinh điển khiến greedy sai.

---

## 4. Những cặp pattern hay bị nhầm (và cách phân biệt)

Nhận diện pattern không phải là khớp một-một — nguy hiểm nhất là *nhầm* hai pattern gần giống. Đây là các cặp gây bẫy nhiều nhất trong phỏng vấn, kèm câu hỏi quyết định để phân biệt:

| Hai pattern dễ nhầm | Câu hỏi quyết định | Chọn cái nào |
|---|---|---|
| Sliding window vs Prefix sum | Cửa sổ có co/giãn **đơn điệu** không? (có số âm?) | Có số âm → prefix sum + hash; toàn dương → sliding window |
| Two-pointer vs Binary search | Cần *quét cặp* hay *tìm 1 vị trí*? | Quét cặp trên mảng sort → two-pointer; tìm 1 giá trị/biên → binary search |
| Backtracking vs DP | Cần *liệt kê tất cả* hay chỉ *đếm/giá trị tối ưu*? | Liệt kê tất cả → backtracking; chỉ cần số đếm/min-max → DP |
| BFS vs DFS (graph) | Cần *đường ngắn nhất* (số cạnh) không? | Ngắn nhất không trọng số → BFS; chỉ cần *tới được/đếm cụm* → DFS |
| Dijkstra vs BFS | Cạnh **có trọng số** khác nhau không? | Có trọng số dương → Dijkstra (heap); cạnh đều 1 → BFS thường |
| Heap vs Sort | Có cần *toàn bộ* thứ tự, hay chỉ *top-k*? | Chỉ top-k → heap O(n log k); cần toàn bộ sort → built-in sort |
| DP vs Greedy | "Chọn tốt nhất mỗi bước" có chắc tối ưu toàn cục? | Không chắc / có phản ví dụ → DP; chứng minh được → greedy |

> 💡 Ghi nhớ: Khi phân vân giữa hai pattern, đừng đoán bừa — hãy tìm một **phản ví dụ nhỏ** cho pattern "rẻ" hơn. Nếu sliding window/greedy sai trên một ví dụ con, bạn vừa loại nó và xác nhận pattern còn lại. Phản ví dụ là công cụ debug tư duy mạnh nhất.

### Mẹo "tháo gỡ" khi hoàn toàn bí

Nếu sau khi tra bảng vẫn không thấy pattern, thử các đòn bẩy sau theo thứ tự:

```
1. Sort input thử xem  → mở ra two-pointer / binary search / greedy
2. Đảo bài toán        → "tìm max X" ↔ "tìm min của phần bù"
3. Brute force rồi tìm "chỗ tính lặp"  → chỗ lặp = nơi đặt hash/memo/DP
4. Vẽ ra ví dụ lớn hơn → pattern thường lộ ra khi nhìn dữ liệu cụ thể
5. Giảm về bài con đã biết → "đây có phải Two Sum/LIS/Island trá hình?"
```

> ⚠️ Bẫy: Đừng ngồi im suy nghĩ quá 3-4 phút mà không nói gì. Nếu bí, hãy *nói to* bạn đang thử đòn bẩy nào ("tôi thử sort xem có giúp gì không..."). Phỏng vấn viên thường gợi ý (hint) khi nghe được hướng đi — nhưng họ chỉ gợi ý nếu biết bạn đang nghĩ gì.

---

## 5. Quy trình giải một bài phỏng vấn: 7 bước (UMPIRE)

Bảng tra giúp bạn *biết hướng*. Nhưng trong phòng phỏng vấn, **cách bạn trình bày** quan trọng ngang với lời giải. Phỏng vấn viên đánh giá tư duy có hệ thống, giao tiếp, và xử lý edge case — không chỉ "có chạy đúng không". Dùng quy trình 7 bước này (mẹo nhớ: **UMPIRE**):

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Quy trình UMPIRE 6 bước và phân bổ thời gian 25/50/25</title>
  <desc>Sáu bước nối tiếp từ trái sang phải: Understand (hiểu đề, clarify, xác nhận input/output), Match (map vào pattern), Plan (brute force trước rồi tối ưu), Implement (viết code sạch, vừa viết vừa nói), Review (đọc lại code, chạy thử bằng tay), Evaluate (phân tích time/space và edge case). Hai bước đầu chiếm khoảng 25% thời gian, Implement khoảng 50%, hai bước cuối khoảng 25%.</desc>
  <defs>
    <marker id="ump-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>

  <g text-anchor="middle">
    <circle cx="60" cy="70" r="26" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="60" y="78" font-size="20" font-weight="800" fill="#fff">U</text>
    <text x="60" y="118" font-size="12" font-weight="700" fill="currentColor">Understand</text>
    <text x="60" y="135" font-size="9.5" fill="currentColor" opacity="0.75">hiểu đề · clarify</text>
    <text x="60" y="148" font-size="9.5" fill="currentColor" opacity="0.75">xác nhận in/out</text>

    <circle cx="190" cy="70" r="26" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="190" y="78" font-size="20" font-weight="800" fill="#fff">M</text>
    <text x="190" y="118" font-size="12" font-weight="700" fill="currentColor">Match</text>
    <text x="190" y="135" font-size="9.5" fill="currentColor" opacity="0.75">map vào pattern</text>
    <text x="190" y="148" font-size="9.5" fill="currentColor" opacity="0.75">(bảng mục 3)</text>

    <circle cx="320" cy="70" r="26" fill="#10b981" fill-opacity="0.95"/>
    <text x="320" y="78" font-size="20" font-weight="800" fill="#fff">P</text>
    <text x="320" y="118" font-size="12" font-weight="700" fill="currentColor">Plan</text>
    <text x="320" y="135" font-size="9.5" fill="currentColor" opacity="0.75">brute force trước</text>
    <text x="320" y="148" font-size="9.5" fill="currentColor" opacity="0.75">rồi tối ưu</text>

    <circle cx="450" cy="70" r="26" fill="#10b981" fill-opacity="0.95"/>
    <text x="450" y="78" font-size="20" font-weight="800" fill="#fff">I</text>
    <text x="450" y="118" font-size="12" font-weight="700" fill="currentColor">Implement</text>
    <text x="450" y="135" font-size="9.5" fill="currentColor" opacity="0.75">code sạch</text>
    <text x="450" y="148" font-size="9.5" fill="currentColor" opacity="0.75">vừa viết vừa nói</text>

    <circle cx="580" cy="70" r="26" fill="#f59e0b" fill-opacity="0.95"/>
    <text x="580" y="78" font-size="20" font-weight="800" fill="#fff">R</text>
    <text x="580" y="118" font-size="12" font-weight="700" fill="currentColor">Review</text>
    <text x="580" y="135" font-size="9.5" fill="currentColor" opacity="0.75">đọc lại code</text>
    <text x="580" y="148" font-size="9.5" fill="currentColor" opacity="0.75">chạy thử tay</text>

    <circle cx="680" cy="70" r="26" fill="#f59e0b" fill-opacity="0.95"/>
    <text x="680" y="78" font-size="20" font-weight="800" fill="#fff">E</text>
    <text x="680" y="118" font-size="12" font-weight="700" fill="currentColor">Evaluate</text>
    <text x="680" y="135" font-size="9.5" fill="currentColor" opacity="0.75">time/space</text>
    <text x="680" y="148" font-size="9.5" fill="currentColor" opacity="0.75">+ edge case</text>
  </g>

  <g stroke="currentColor" stroke-width="1.6" fill="none" marker-end="url(#ump-arrow)" stroke-opacity="0.7">
    <path d="M86 70 H160"/>
    <path d="M216 70 H290"/>
    <path d="M346 70 H420"/>
    <path d="M476 70 H550"/>
    <path d="M606 70 H650"/>
  </g>

  <text x="360" y="222" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Phân bổ thời gian một vòng (~35–45 phút)</text>

  <g>
    <rect x="34" y="238" width="252" height="44" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="294" y="238" width="172" height="44" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="474" y="238" width="212" height="44" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  </g>
  <g text-anchor="middle">
    <text x="160" y="258" font-size="13" font-weight="800" fill="currentColor">~25%</text>
    <text x="160" y="274" font-size="10" fill="currentColor" opacity="0.78">clarify + plan (U·M·P)</text>
    <text x="380" y="258" font-size="13" font-weight="800" fill="currentColor">~50%</text>
    <text x="380" y="274" font-size="10" fill="currentColor" opacity="0.78">code (I)</text>
    <text x="580" y="258" font-size="13" font-weight="800" fill="currentColor">~25%</text>
    <text x="580" y="274" font-size="10" fill="currentColor" opacity="0.78">test + phân tích (R·E)</text>
  </g>

  <text x="360" y="318" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">Đừng dồn 30 phút tìm lời giải hoàn hảo rồi không kịp code — brute force chạy được hơn lời giải tối ưu dở dang.</text>
</svg>

### Bước 1 — Understand: CLARIFY trước khi viết một dòng nào

Đây là bước **bị bỏ qua nhiều nhất** và là lý do trượt phổ biến nhất. Đừng lao vào code. Hãy hỏi:

- **Phạm vi giá trị**: số âm? số 0? trùng lặp? rỗng? `n` lớn cỡ nào?
- **Định dạng output**: trả index hay giá trị? một đáp án hay tất cả? có cần sort kết quả?
- **Ràng buộc đặc biệt**: input đã sort chưa? có được sửa input gốc không? giới hạn bộ nhớ?
- **Tie-break**: nếu nhiều đáp án thì trả cái nào? (đầu tiên / bất kỳ / từ điển nhỏ nhất?)

> 💡 Ghi nhớ: Mỗi câu clarify là một **điểm cộng** — nó cho thấy bạn nghĩ về edge case trước khi code. Phỏng vấn viên thường *cố tình* ra đề mơ hồ để xem bạn có hỏi không. Im lặng lao vào code là red flag.

### Bước 2-3 — Đưa ví dụ + Brute force trước

Tự dựng **một ví dụ nhỏ** rồi giải bằng tay, nói to suy nghĩ. Sau đó **luôn nêu brute force trước** kèm độ phức tạp, kể cả khi nó tệ:

> "Cách ngây thơ là duyệt mọi cặp, O(n²) thời gian, O(1) bộ nhớ. Giờ tôi sẽ tối ưu..."

Điều này (1) cho bạn điểm tựa, (2) chứng tỏ bạn hiểu đề, (3) thường gợi ra hướng tối ưu (chỗ nào đang lặp thừa → thay bằng hash/sort/two-pointer).

### Bước 4 — Optimize: nhận pattern, công bố mục tiêu

Nói rõ độ phức tạp **mục tiêu** dựa trên `n` rồi gắn pattern: *"n lên tới 10^5 nên O(n²) sẽ TLE; tôi cần O(n log n) hoặc O(n). Vì cần đếm 'đã thấy chưa', tôi dùng hash map để hạ xuống O(n)."* Đây chính là lúc bảng tra mục 3 phát huy.

### Bước 5 — Implement: code sạch, vừa viết vừa nói

- Đặt tên biến rõ nghĩa (`left/right`, `seen`, `count`), không `a/b/x`.
- Tách hàm phụ nếu logic phức tạp (ví dụ `isValid()`, `dfs()`).
- **Nói khi viết**: "ở đây tôi dùng vòng while với hai con trỏ..." — im lặng gõ code khiến phỏng vấn viên mất dấu tư duy của bạn.

### Bước 6 — Test edge case bằng tay

Chạy code qua **ví dụ gốc** và ít nhất một **edge case**: rỗng, một phần tử, toàn trùng, số âm, đã sort/ngược. Tìm bug *trước khi* phỏng vấn viên tìm ra — đó là dấu hiệu của kỹ sư cẩn thận.

### Bước 7 — Evaluate: phân tích time/space và đề xuất cải tiến

Kết bằng phân tích rõ ràng: *"Thời gian O(n) vì duyệt một lượt, bộ nhớ O(n) cho hash map. Nếu input đã sort thì có thể dùng two-pointer để hạ bộ nhớ xuống O(1)."* Chủ động nêu trade-off cho thấy độ chín.

> ⚠️ Bẫy: Quản lý thời gian. Một vòng phỏng vấn coding thường 35-45 phút cho 1-2 bài. Phân bổ khoảng: clarify + plan ~25%, code ~50%, test + phân tích ~25%. **Đừng** dành 30 phút tìm lời giải tối ưu hoàn hảo rồi không kịp code. Một brute force *chạy được* và nêu rõ hướng tối ưu tốt hơn một lời giải tối ưu *dở dang*.

---

## 6. Ví dụ minh hoạ quy trình: từ đề lạ tới lời giải

Hãy diễn lại toàn bộ quy trình trên một bài, để thấy framework hoạt động ra sao.

**Đề**: "Cho mảng số nguyên `nums` và số `k`, tìm độ dài subarray liên tục dài nhất có tổng đúng bằng `k`."

**U — Understand / Clarify**: Có số âm không? (Giả sử *có* — đây là chìa khoá.) Subarray phải *liên tục*? (Có.) Nếu không tồn tại thì trả 0? (Có.) `n` cỡ nào? (10^5.)

**M — Match**: Tín hiệu = "**subarray liên tục**" + "**tổng bằng k**" + có số âm. "Subarray liên tục" gợi sliding window — *nhưng* sliding window cổ điển chỉ đúng khi tất cả số dương (cửa sổ co/giãn đơn điệu). Có số âm → window không đơn điệu → **loại**. Tín hiệu "tổng trên range" + "đếm/tìm" → **prefix sum + hash map**.

**P — Plan**: Brute force: thử mọi (i, j), tính tổng — O(n²), với n=10^5 là 10^10 phép → TLE. Tối ưu: gọi `pre[i]` = tổng tiền tố. Subarray `(i,j]` có tổng `k` ⟺ `pre[j] - pre[i] = k` ⟺ `pre[i] = pre[j] - k`. Vừa duyệt vừa lưu vào hash map "giá trị prefix sum → index *sớm nhất* nó xuất hiện", tra `pre[j] - k` trong O(1). → O(n).

**I — Implement**:

```python
def longest_subarray_sum_k(nums, k):
    first_index = {0: -1}     # prefix sum -> chi so som nhat. 0 tai vi tri -1
    prefix = 0
    best = 0
    for j, x in enumerate(nums):
        prefix += x
        if prefix - k in first_index:
            best = max(best, j - first_index[prefix - k])
        # chi luu LAN DAU (de subarray dai nhat) -> khong ghi de
        if prefix not in first_index:
            first_index[prefix] = j
    return best
```
```javascript
function longestSubarraySumK(nums, k) {
  const firstIndex = new Map([[0, -1]]); // prefix -> chi so som nhat
  let prefix = 0, best = 0;
  for (let j = 0; j < nums.length; j++) {
    prefix += nums[j];
    if (firstIndex.has(prefix - k)) {
      best = Math.max(best, j - firstIndex.get(prefix - k));
    }
    if (!firstIndex.has(prefix)) firstIndex.set(prefix, j); // chi luu lan dau
  }
  return best;
}
```
```java
static int longestSubarraySumK(int[] nums, int k) {
    Map<Long, Integer> firstIndex = new HashMap<>();
    firstIndex.put(0L, -1);              // prefix -> chi so som nhat
    long prefix = 0;
    int best = 0;
    for (int j = 0; j < nums.length; j++) {
        prefix += nums[j];
        if (firstIndex.containsKey(prefix - k)) {
            best = Math.max(best, j - firstIndex.get(prefix - k));
        }
        firstIndex.putIfAbsent(prefix, j); // chi luu lan dau
    }
    return best;
}
```
```go
func longestSubarraySumK(nums []int, k int) int {
	firstIndex := map[int]int{0: -1} // prefix -> chi so som nhat
	prefix, best := 0, 0
	for j, x := range nums {
		prefix += x
		if idx, ok := firstIndex[prefix-k]; ok {
			if j-idx > best {
				best = j - idx
			}
		}
		if _, ok := firstIndex[prefix]; !ok { // chi luu lan dau
			firstIndex[prefix] = j
		}
	}
	return best
}
```

```cpp
int longestSubarraySumK(const vector<int>& nums, int k) {
    unordered_map<int, int> firstIndex{{0, -1}}; // prefix -> chi so som nhat
    int prefix = 0, best = 0;
    for (int j = 0; j < (int)nums.size(); j++) {
        prefix += nums[j];
        auto it = firstIndex.find(prefix - k);
        if (it != firstIndex.end()) {
            best = max(best, j - it->second);
        }
        // chi luu LAN DAU (de subarray dai nhat) -> khong ghi de
        firstIndex.emplace(prefix, j);
    }
    return best;
}
```

**R — Review**: Chạy `nums=[1,-1,5,-2,3], k=3`. prefix: 1,0,5,3,6. Tại j=3, prefix=3, tìm `3-3=0` → index -1 và 1 (lưu lần đầu là -1) → độ dài `3-(-1)=4`. Đúng (subarray `[1,-1,5,-2]`).

**E — Evaluate**: Time O(n) một lượt, space O(n) hash map. Bẫy chính: phải lưu prefix sum **lần đầu** (early index) để subarray dài nhất, và khởi tạo `{0: -1}` để bắt subarray bắt đầu từ index 0.

> 💡 Ghi nhớ: Lời giải trên minh hoạ điều quý nhất của framework: tín hiệu "subarray liên tục" *gợi ý* sliding window, nhưng tín hiệu "có số âm" *bác bỏ* nó và đẩy sang prefix sum + hash. Nhận diện pattern là một quá trình **lọc**, không phải khớp một-một.

---

## 7. Cách học DSA hiệu quả: theo pattern, không theo số lượng

Đây là phần thay đổi cuộc chơi. Đa số người luyện sai: cày 300-500 bài ngẫu nhiên, làm xong quên, gặp lại bài tương tự vẫn bí. Vấn đề không phải *làm ít* — mà là *học sai cách*.

### Nguyên tắc 1 — Học theo pattern, làm theo cụm

Đừng làm bài ngẫu nhiên. Hãy chọn **một pattern** (ví dụ sliding window), làm liền **5-8 bài cùng pattern** từ dễ tới khó. Khi làm cụm, não bạn trừu tượng hoá ra *cái chung*, và đó chính là "phản xạ nhận diện" bạn cần.

### Nguyên tắc 2 — Spaced repetition (lặp lại ngắt quãng)

Làm xong một bài khó **không phải là xong**. Lịch ôn hiệu quả:

```
Làm lần 1  →  ôn lại sau 1 ngày  →  sau 3 ngày  →  sau 1 tuần  →  sau 2 tuần
```

Mỗi lần ôn, *tự giải lại từ đầu* không nhìn lời giải. Nếu giải được trôi chảy → giãn khoảng cách. Nếu bí → quay lại đầu chu kỳ. Một bài bạn giải lại được sau 2 tuần đáng giá hơn 10 bài làm một lần rồi quên.

### Nguyên tắc 3 — Active recall, không đọc thụ động

Đọc lời giải xong **không** có nghĩa là hiểu. Bài kiểm tra thật: đóng lời giải, tự code lại từ đầu, *giải thích to* tại sao mỗi bước đúng. Nếu không tự code lại được → bạn mới *nhận ra* lời giải chứ chưa *nắm* nó.

### Nguyên tắc 4 — Sổ tay pattern (pattern journal)

Giữ một file ghi: mỗi pattern → dấu hiệu nhận biết + khung code + 2-3 bài đại diện + bẫy đã mắc. Khi gặp bài mới, đối chiếu sổ này. Sau vài tuần, sổ này trở thành "bộ não thứ hai" và bạn sẽ thấy mình tra nó ngày càng ít.

> 💡 Ghi nhớ: Chất lượng > số lượng. **80 bài làm kỹ theo pattern + ôn ngắt quãng** đánh bại 400 bài cày một lần rồi quên. Mỗi bài bạn nên *học* (rút pattern, ghi sổ, ôn lại), không chỉ *giải*.

---

## 8. Lộ trình luyện tập gợi ý (8-12 tuần)

Một lộ trình cụ thể, theo pattern, tăng dần độ khó. Mỗi tuần làm cụm bài cùng pattern + ôn lại bài tuần trước:

| Giai đoạn | Tuần | Pattern trọng tâm | Mục tiêu |
|---|---|---|---|
| Nền tảng | 1-2 | Two-pointer, sliding window, hash map, prefix sum | Phản xạ với array/string |
| Cấu trúc | 3-4 | Stack/monotonic, binary search (+ on answer), heap/top-k | Chọn đúng cấu trúc dữ liệu |
| Phi tuyến | 5-6 | Tree DFS/BFS, graph BFS/DFS, Union-Find, topo sort | Tư duy đệ quy & đồ thị |
| Tổ hợp | 7-8 | Backtracking (subset/permutation/combination), pruning | Sinh & cắt nhánh |
| Tối ưu | 9-10 | DP 1D → 2D → string, knapsack | Định nghĩa state & transition |
| Tổng hợp | 11-12 | Mock interview, bài hỗn hợp, bài hard, đúng giờ | Vận dụng dưới áp lực |

> ⚠️ Bẫy: Đừng nhảy thẳng vào DP/graph khi chưa vững two-pointer và hash. Các pattern nền tảng xuất hiện *bên trong* bài nâng cao (ví dụ một bài graph có bước dùng hash set để track visited). Bỏ nền tảng = xây nhà trên cát.

---

## 9. Sai lầm thường gặp & cách tránh

| Sai lầm | Hậu quả | Cách tránh |
|---|---|---|
| Lao vào code, bỏ clarify | Giải sai đề, mất điểm giao tiếp | Luôn hỏi 3-4 câu trước khi viết |
| Im lặng khi nghĩ/code | Phỏng vấn viên mất dấu tư duy | Nói to mọi bước, kể cả lúc bí |
| Cố tối ưu ngay từ đầu | Bí, hết giờ, không có gì để show | Nêu brute force trước, rồi tối ưu |
| Học thuộc lời giải từng bài | Gặp biến thể là tịt | Học *pattern + template*, không học bài |
| Cày số lượng, không ôn lại | Làm xong quên hết | Spaced repetition + pattern journal |
| Bỏ qua edge case | Code crash khi demo | Test rỗng/1 phần tử/âm/trùng bằng tay |
| Không phân tích time/space | Thiếu chiều sâu kỹ sư | Luôn kết bằng O(...) và trade-off |
| Ngó lơ ràng buộc `n` | Chọn sai độ phức tạp mục tiêu | Đọc `n` đầu tiên → suy độ phức tạp |
| Nhầm DP với greedy | Greedy ra đáp án sai | Nghi ngờ → dùng DP; tìm phản ví dụ |
| Quên cập nhật con trỏ (+1) | Vòng lặp vô hạn | Bám một template binary search cố định |

> 💡 Ghi nhớ: Sai lầm số một khiến ứng viên giỏi vẫn trượt không phải thiếu kiến thức — mà là **giao tiếp kém và bỏ qua quy trình**. Một người giải được 80% bài nhưng trình bày có hệ thống, hỏi clarify, test cẩn thận thường được đánh giá cao hơn người im lặng giải xong 100% nhưng không giải thích.

---

## 10. Checklist nhanh trong phòng phỏng vấn

In cái này ra đầu, chạy qua mỗi bài:

```
[ ] Đã đọc đề kỹ + nhắc lại bằng lời của mình?
[ ] Đã hỏi clarify (giá trị âm/0/rỗng/trùng, output, n)?
[ ] Đã dựng 1 ví dụ nhỏ + giải tay?
[ ] Đã nêu brute force + độ phức tạp của nó?
[ ] Đã nhìn n → suy độ phức tạp mục tiêu?
[ ] Đã map vào pattern (bảng "thấy gì → nghĩ gì")?
[ ] Đã nói to khi code, đặt tên biến rõ?
[ ] Đã test edge case bằng tay?
[ ] Đã phân tích time/space + nêu trade-off?
```

---

## 11. Checklist tự luyện (bài đề xuất kèm pattern)

Làm các bài này theo cụm pattern, áp dụng quy trình UMPIRE đầy đủ cho từng bài, rồi ôn lại theo lịch spaced repetition:

- **Two Sum** — hash map (complement). *Tín hiệu: "đã thấy bù chưa".*
- **Longest Substring Without Repeating Characters** — sliding window. *Tín hiệu: substring liên tục + điều kiện.*
- **Subarray Sum Equals K** — prefix sum + hash. *Tín hiệu: tổng trên range + có thể có số âm.*
- **Koko Eating Bananas** — binary search on answer. *Tín hiệu: min sao cho điều kiện đơn điệu đúng.*
- **Top K Frequent Elements** — heap / bucket. *Tín hiệu: "k phần tử nhiều nhất".*
- **Daily Temperatures** — monotonic stack. *Tín hiệu: "phần tử kế tiếp lớn hơn".*
- **Number of Islands** — graph DFS/BFS / Union-Find. *Tín hiệu: đếm cụm liên thông.*
- **Course Schedule** — topological sort. *Tín hiệu: thứ tự phụ thuộc + phát hiện cycle.*
- **Subsets / Permutations** — backtracking. *Tín hiệu: "liệt kê tất cả".*
- **Coin Change** — DP tối ưu. *Tín hiệu: min số đồng, lựa chọn lặp.*
- **Longest Common Subsequence** — DP 2D string. *Tín hiệu: hai chuỗi + chung dài nhất.*
- **Word Search** — backtracking trên grid + pruning. *Tín hiệu: tìm một cấu hình thoả trên lưới.*

Với **mỗi** bài: tự đặt câu hỏi clarify → nêu brute force → gắn pattern → code 1 ngôn ngữ → test edge → phân tích. Ghi pattern và bẫy vào sổ tay. Sau 1 ngày, 3 ngày, 1 tuần — giải lại từ đầu không nhìn.

---

## Tổng kết

- Phỏng vấn DSA xoay quanh **15-20 pattern** lặp lại; bài "lạ" chỉ là pattern quen khoác áo mới.
- Hai tín hiệu mạnh nhất: **hình dạng input** và **dạng kết quả cần**. Ràng buộc **`n`** tiết lộ độ phức tạp mục tiêu — đọc nó *đầu tiên*.
- Thuộc lòng bảng **"thấy gì → nghĩ pattern gì"** (mục 3) — nó là từ điển dịch đề bài sang giải thuật.
- Trong phòng phỏng vấn, đi theo quy trình **UMPIRE**: Understand (clarify!) → Match → Plan (brute force trước) → Implement (nói to) → Review → Evaluate (time/space + trade-off).
- **Giao tiếp và quy trình** quan trọng ngang lời giải; quản lý thời gian ~25/50/25.
- Học **theo pattern, không theo số lượng**: cụm bài cùng pattern + spaced repetition + active recall + sổ tay pattern. 80 bài học kỹ > 400 bài cày quên.
- Bám lộ trình tăng dần: nền tảng (two-pointer/hash) → cấu trúc → phi tuyến → tổ hợp → DP → mock đúng giờ.
