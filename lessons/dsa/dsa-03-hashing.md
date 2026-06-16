# Hash Map & Set

Nếu chỉ được mang theo **một** cấu trúc dữ liệu vào phòng phỏng vấn hay vào dự án thật, hãy chọn hash map. Nó biến phần lớn câu hỏi "đã từng thấy giá trị này chưa?", "giá trị này xuất hiện bao nhiêu lần?", "có cặp nào thoả điều kiện không?" từ vòng lặp lồng O(n²) chậm chạp thành một lần duyệt O(n). Bài này giải thích nó hoạt động ra sao, khi nào nên — và khi nào **không** nên — dùng, kèm bốn bài toán kinh điển luôn xuất hiện trong phỏng vấn lẫn công việc hằng ngày.

## 1. Trực giác: tủ đựng đồ có đánh số

Tưởng tượng một nhà thi đấu có 1000 tủ đồ đánh số 0–999. Bạn cầm chứng minh thư (key), một công thức biến số CMT thành số tủ (hash function), rồi bỏ đồ vào đúng tủ đó. Khi cần lấy lại, bạn **không** đi mở từng tủ — bạn chạy lại công thức, ra ngay số tủ, mở đúng một cái. Đó chính là toàn bộ ý tưởng của hash table:

1. **hash function** biến key (string, số, object) thành một số nguyên lớn.
2. Lấy số đó **modulo** số ô (bucket) trong mảng nội bộ → ra chỉ số ô để đặt giá trị.
3. Lúc tra cứu, lặp lại đúng phép tính → nhảy thẳng tới ô đó, không phải duyệt.

Vì bạn nhảy thẳng tới ô chứ không dò tuyến tính, thao tác `insert` / `lookup` / `delete` đều là **O(1) trung bình** — không phụ thuộc vào việc map đang chứa 10 hay 10 triệu phần tử.

## 2. Collision — khi hai key rơi vào cùng một ô

Công thức hash không hoàn hảo: hai key khác nhau có thể cho ra cùng một chỉ số ô. Đó là **collision** (va chạm). Hai cách xử lý phổ biến:

- **Chaining (móc xích)**: mỗi ô chứa một danh sách nhỏ. Va chạm thì thêm vào danh sách của ô đó; lúc tra cứu phải so sánh từng phần tử trong danh sách nhỏ ấy.
- **Open addressing (dò ô kế)**: nếu ô bị chiếm, nhảy sang ô tiếp theo theo một quy tắc cho tới khi tìm được ô trống.

Để các danh sách nhỏ không phình to, hash table theo dõi **load factor** = số phần tử / số ô. Khi vượt ngưỡng (thường ~0.75), nó **resize**: cấp mảng lớn gấp đôi và **rehash** toàn bộ phần tử sang mảng mới. Lần resize đó tốn O(n), nhưng vì nó hiếm và được "trải" ra trên rất nhiều thao tác, mỗi thao tác vẫn là **O(1) amortized** (trung bình khấu hao).

> 💡 Ghi nhớ: "O(1) của hash map" là **trung bình**, không phải đảm bảo cho từng lần. Trường hợp xấu nhất (mọi key va chạm vào một ô) là O(n). Trong phỏng vấn, cứ trả lời O(1) trung bình; nhưng phải biết tại sao xấu nhất là O(n) để không bị hỏi đuối.

## 3. Set vs Map — khác gì nhau

Cả hai dùng cùng bộ máy hash table bên dưới. Khác biệt chỉ ở chỗ bạn lưu gì:

- **Set**: chỉ lưu **key**, trả lời câu "phần tử này có tồn tại không?". Dùng để **dedup** (loại trùng) và kiểm tra thành viên.
- **Map / Dictionary**: lưu cặp **key → value**, trả lời câu "key này gắn với giá trị nào?". Dùng để **đếm**, **gom nhóm**, **lookup theo khoá**, làm cache.

Quy tắc chọn nhanh: chỉ cần biết "có hay không" → **set**; cần kèm thông tin theo mỗi khoá → **map**.

## 4. Bảng độ phức tạp

| Thao tác | Trung bình | Xấu nhất | Ghi chú |
|---|---|---|---|
| insert / put | O(1) | O(n) | xấu nhất khi va chạm dồn cục hoặc đang resize |
| lookup / get | O(1) | O(n) | |
| delete | O(1) | O(n) | |
| kiểm tra tồn tại (set) | O(1) | O(n) | |
| duyệt toàn bộ | O(n) | O(n) | thứ tự **không** đảm bảo (xem mục 6) |
| bộ nhớ | O(n) | O(n) | hệ số ẩn lớn: con trỏ + ô trống do load factor |

Để so sánh: tìm một phần tử trong mảng chưa sắp xếp là O(n), trong mảng đã sắp xếp dùng binary search là O(log n). Hash map cho **O(1)** — đổi lại bằng bộ nhớ phụ và mất thứ tự.

## 5. Bốn việc hash map làm tốt nhất

**Đếm tần suất (count)** — map từ phần tử → số lần xuất hiện. Một vòng duyệt là xong.

**Loại trùng (dedup)** — đẩy mọi phần tử vào set; trùng tự biến mất.

**Tra cứu nhanh (lookup)** — dựng index `id → record` một lần, sau đó mọi truy vấn theo id là O(1) thay vì quét cả danh sách.

**Gom nhóm (group by)** — map từ khoá nhóm → danh sách phần tử thuộc nhóm. Đây chính là `GROUP BY` của SQL viết bằng tay.

Bốn cách dùng:

```python
from collections import Counter, defaultdict

nums = [1, 2, 2, 3, 3, 3]

# Đếm tần suất
count = Counter(nums)            # {1: 1, 2: 2, 3: 3}

# Loại trùng
unique = set(nums)               # {1, 2, 3}

# Lookup theo khoá
users = [{"id": 7, "name": "An"}, {"id": 9, "name": "Bình"}]
by_id = {u["id"]: u for u in users}
print(by_id[7]["name"])          # "An"  — O(1)

# Gom nhóm theo tính chẵn/lẻ
groups = defaultdict(list)
for n in nums:
    groups[n % 2].append(n)      # {1: [1, 3, 3, 3], 0: [2, 2]}
```
```javascript
const nums = [1, 2, 2, 3, 3, 3];

// Đếm tần suất
const count = new Map();
for (const n of nums) count.set(n, (count.get(n) ?? 0) + 1); // {1:1,2:2,3:3}

// Loại trùng
const unique = new Set(nums);    // {1, 2, 3}

// Lookup theo khoá
const users = [{ id: 7, name: "An" }, { id: 9, name: "Bình" }];
const byId = new Map(users.map((u) => [u.id, u]));
console.log(byId.get(7).name);   // "An"  — O(1)

// Gom nhóm theo tính chẵn/lẻ
const groups = new Map();
for (const n of nums) {
  const k = n % 2;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(n);
}
```
```java
import java.util.*;

int[] nums = {1, 2, 2, 3, 3, 3};

// Đếm tần suất
Map<Integer, Integer> count = new HashMap<>();
for (int n : nums) count.merge(n, 1, Integer::sum); // {1=1,2=2,3=3}

// Loại trùng
Set<Integer> unique = new HashSet<>();
for (int n : nums) unique.add(n);                   // [1, 2, 3]

// Lookup theo khoá
Map<Integer, String> byId = new HashMap<>();
byId.put(7, "An");
byId.put(9, "Bình");
System.out.println(byId.get(7));                    // "An"  — O(1)

// Gom nhóm theo tính chẵn/lẻ
Map<Integer, List<Integer>> groups = new HashMap<>();
for (int n : nums)
    groups.computeIfAbsent(n % 2, k -> new ArrayList<>()).add(n);
```
```go
package main

import "fmt"

func main() {
    nums := []int{1, 2, 2, 3, 3, 3}

    // Đếm tần suất
    count := map[int]int{}
    for _, n := range nums {
        count[n]++ // {1:1, 2:2, 3:3}
    }

    // Loại trùng (Go không có set sẵn → dùng map[T]struct{})
    unique := map[int]struct{}{}
    for _, n := range nums {
        unique[n] = struct{}{}
    }

    // Lookup theo khoá
    byID := map[int]string{7: "An", 9: "Bình"}
    fmt.Println(byID[7]) // "An"  — O(1)

    // Gom nhóm theo tính chẵn/lẻ
    groups := map[int][]int{}
    for _, n := range nums {
        groups[n%2] = append(groups[n%2], n)
    }
    fmt.Println(count, unique, groups)
}
```

```cpp
#include <iostream>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <string>

int main() {
    std::vector<int> nums = {1, 2, 2, 3, 3, 3};

    // Đếm tần suất
    std::unordered_map<int, int> count;
    for (int n : nums) count[n]++; // {1:1, 2:2, 3:3}

    // Loại trùng
    std::unordered_set<int> unique(nums.begin(), nums.end()); // {1, 2, 3}

    // Lookup theo khoá
    std::unordered_map<int, std::string> byId = {{7, "An"}, {9, "Bình"}};
    std::cout << byId[7] << "\n"; // "An"  — O(1)

    // Gom nhóm theo tính chẵn/lẻ
    std::unordered_map<int, std::vector<int>> groups;
    for (int n : nums) {
        groups[n % 2].push_back(n);
    }
    return 0;
}
```

> 💡 Ghi nhớ: hễ bài toán có cụm "đã thấy chưa", "bao nhiêu lần", "có cặp/nhóm nào", "loại trùng", "tìm theo id" — phản xạ đầu tiên là hash map/set. Nó thường biến O(n²) thành O(n).

## 6. Khi nào KHÔNG dùng hash map

Hash map mạnh nhưng không phải búa vạn năng. Tránh nó khi:

- **Cần thứ tự**. Hash map **không giữ thứ tự chèn** một cách đảm bảo (Python 3.7+ và JS giữ thứ tự chèn theo đặc tả, nhưng Java `HashMap` và Go `map` thì **không** — duyệt Go map còn cố tình ngẫu nhiên). Cần sắp xếp theo key → dùng cây cân bằng (`TreeMap`, `std::map`) hoặc sort sau.
- **Cần truy vấn theo khoảng** ("mọi key trong [10, 50]", "key nhỏ nhất lớn hơn x"). Hash không có khái niệm thứ tự → vô dụng cho range query. Dùng cây hoặc mảng đã sắp xếp + binary search.
- **Dữ liệu nhỏ và nóng**. Với 5–10 phần tử, một mảng quét tuyến tính thường **nhanh hơn** hash map vì không tốn chi phí băm và thân thiện cache CPU hơn.
- **Bộ nhớ căng**. Hash map có overhead lớn: ô trống để giữ load factor thấp, con trỏ, đóng gói object. Một map int→int có thể tốn gấp nhiều lần một mảng tương đương.
- **Cần hashing mật mã**. Hash table dùng hàm băm nhanh, **không** an toàn mật mã. Đừng nhầm với SHA-256.

> ⚠️ Bẫy: đừng giả định thứ tự duyệt của map. Code "chạy đúng trên máy mình" nhờ thứ tự tình cờ sẽ vỡ khi đổi ngôn ngữ, đổi phiên bản, hoặc khi Go cố tình xáo trộn. Cần thứ tự thì sắp xếp một cách tường minh.

> ⚠️ Bẫy: key của map phải **immutable / hashable**. Đừng dùng list hay dict làm key trong Python (sẽ lỗi `unhashable`); trong Java đừng đổi field của object sau khi đã đưa vào map (sẽ "mất" phần tử). Object dùng làm key phải có `hashCode`/`equals` (Java) hoặc là kiểu so sánh được (Go) đúng đắn.

## 7. Bài toán điển hình

### 7.1 Two Sum — cặp cộng lại bằng target

> Cho mảng `nums` và số `target`, trả về chỉ số của **hai** phần tử cộng lại bằng `target`.

**Hướng giải.** Cách ngây thơ: hai vòng lồng O(n²). Tốt hơn: duyệt một lần, với mỗi số `x` ta cần `target - x` (phần bù). Lưu các số đã thấy vào map `giá trị → chỉ số`. Khi gặp `x`, kiểm tra phần bù đã có trong map chưa — nếu có, xong. Đây là minh hoạ tinh tuý cho việc map biến tìm cặp O(n²) thành O(n).

```python
def two_sum(nums, target):
    seen = {}                      # giá trị -> chỉ số
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:
            return [seen[need], i]
        seen[x] = i
    return None
```
```javascript
function twoSum(nums, target) {
  const seen = new Map();          // giá trị -> chỉ số
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return null;
}
```
```java
int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new HashMap<>(); // giá trị -> chỉ số
    for (int i = 0; i < nums.length; i++) {
        int need = target - nums[i];
        if (seen.containsKey(need)) return new int[]{seen.get(need), i};
        seen.put(nums[i], i);
    }
    return null;
}
```
```go
func twoSum(nums []int, target int) []int {
    seen := map[int]int{} // giá trị -> chỉ số
    for i, x := range nums {
        if j, ok := seen[target-x]; ok {
            return []int{j, i}
        }
        seen[x] = i
    }
    return nil
}
```

```cpp
#include <vector>
#include <unordered_map>

std::vector<int> twoSum(const std::vector<int>& nums, int target) {
    std::unordered_map<int, int> seen; // giá trị -> chỉ số
    for (int i = 0; i < (int)nums.size(); i++) {
        int need = target - nums[i];
        auto it = seen.find(need);
        if (it != seen.end()) return {it->second, i};
        seen[nums[i]] = i;
    }
    return {};
}
```

Độ phức tạp: **O(n)** thời gian, **O(n)** bộ nhớ.

### 7.2 Group Anagrams — gom các từ đảo chữ

> Cho danh sách từ, gom những từ là **anagram** của nhau (cùng tập chữ cái, khác thứ tự): `["eat","tea","tan","ate","nat","bat"]` → `[["eat","tea","ate"],["tan","nat"],["bat"]]`.

**Hướng giải.** Mọi anagram chia sẻ một **chữ ký (signature)** chung. Cách đơn giản nhất: sắp xếp các chữ cái trong từ — `"eat"`, `"tea"`, `"ate"` đều ra `"aet"`. Dùng signature đó làm key của map `signature → danh sách từ`. Đây chính là pattern **group by** với một khoá được tính ra.

```python
from collections import defaultdict

def group_anagrams(words):
    groups = defaultdict(list)
    for w in words:
        key = "".join(sorted(w))   # signature
        groups[key].append(w)
    return list(groups.values())
```
```javascript
function groupAnagrams(words) {
  const groups = new Map();
  for (const w of words) {
    const key = [...w].sort().join(""); // signature
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(w);
  }
  return [...groups.values()];
}
```
```java
List<List<String>> groupAnagrams(String[] words) {
    Map<String, List<String>> groups = new HashMap<>();
    for (String w : words) {
        char[] c = w.toCharArray();
        Arrays.sort(c);
        String key = new String(c);     // signature
        groups.computeIfAbsent(key, k -> new ArrayList<>()).add(w);
    }
    return new ArrayList<>(groups.values());
}
```
```go
func groupAnagrams(words []string) [][]string {
    groups := map[string][]string{}
    for _, w := range words {
        b := []byte(w)
        sort.Slice(b, func(i, j int) bool { return b[i] < b[j] })
        key := string(b) // signature
        groups[key] = append(groups[key], w)
    }
    out := [][]string{}
    for _, g := range groups {
        out = append(out, g)
    }
    return out
}
```

```cpp
#include <vector>
#include <string>
#include <algorithm>
#include <unordered_map>

std::vector<std::vector<std::string>> groupAnagrams(const std::vector<std::string>& words) {
    std::unordered_map<std::string, std::vector<std::string>> groups;
    for (const std::string& w : words) {
        std::string key = w;
        std::sort(key.begin(), key.end()); // signature
        groups[key].push_back(w);
    }
    std::vector<std::vector<std::string>> out;
    for (auto& [key, g] : groups) {
        out.push_back(g);
    }
    return out;
}
```

Độ phức tạp: **O(n·k log k)** với n từ, mỗi từ dài k (chi phí sort signature). Có thể bỏ sort, dùng mảng đếm 26 chữ cái làm key → **O(n·k)**.

### 7.3 Đếm tần suất + Top-K phần tử hay gặp

> Cho mảng số, trả về **K** giá trị xuất hiện nhiều nhất.

**Hướng giải.** Bước một là pattern **count** thuần: map `giá trị → số lần`. Bước hai chọn K khoá có count lớn nhất — đơn giản nhất là sort theo count rồi lấy K cái đầu (O(n log n)); nhanh hơn dùng heap kích thước K (O(n log K), học ở bài heap). Đây là khung xương của "top sản phẩm bán chạy", "từ khoá hot nhất".

```python
from collections import Counter

def top_k(nums, k):
    count = Counter(nums)                       # đếm: O(n)
    return [v for v, _ in count.most_common(k)] # chọn top-k
```
```javascript
function topK(nums, k) {
  const count = new Map();
  for (const n of nums) count.set(n, (count.get(n) ?? 0) + 1);
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([v]) => v);
}
```
```java
List<Integer> topK(int[] nums, int k) {
    Map<Integer, Integer> count = new HashMap<>();
    for (int n : nums) count.merge(n, 1, Integer::sum);
    return count.entrySet().stream()
        .sorted((a, b) -> b.getValue() - a.getValue())
        .limit(k)
        .map(Map.Entry::getKey)
        .toList();
}
```
```go
func topK(nums []int, k int) []int {
    count := map[int]int{}
    for _, n := range nums {
        count[n]++
    }
    keys := make([]int, 0, len(count))
    for v := range count {
        keys = append(keys, v)
    }
    sort.Slice(keys, func(i, j int) bool { return count[keys[i]] > count[keys[j]] })
    if k > len(keys) {
        k = len(keys)
    }
    return keys[:k]
}
```

```cpp
#include <vector>
#include <unordered_map>
#include <algorithm>

std::vector<int> topK(const std::vector<int>& nums, int k) {
    std::unordered_map<int, int> count;
    for (int n : nums) count[n]++;

    std::vector<int> keys;
    keys.reserve(count.size());
    for (auto& [v, c] : count) keys.push_back(v);

    std::sort(keys.begin(), keys.end(),
              [&](int a, int b) { return count[a] > count[b]; });

    if (k > (int)keys.size()) k = (int)keys.size();
    return std::vector<int>(keys.begin(), keys.begin() + k);
}
```

Độ phức tạp: **O(n)** để đếm, cộng **O(n log n)** để sort (hoặc O(n log K) với heap).

### 7.4 First Unique — ký tự không trùng đầu tiên

> Cho một chuỗi, trả về **chỉ số của ký tự đầu tiên không lặp lại**. Ví dụ `"leetcode"` → `0` (chữ `l`); `"loveleetcode"` → `2` (chữ `v`); không có thì trả `-1`.

**Hướng giải.** Hai lượt duyệt. Lượt một: đếm tần suất mỗi ký tự (pattern count). Lượt hai: duyệt chuỗi **theo thứ tự gốc**, trả về chỉ số đầu tiên có count bằng 1. Mấu chốt: lượt hai phải đi theo thứ tự chuỗi gốc chứ không phải theo thứ tự map (đây là chỗ thứ tự duyệt map không đáng tin — ta lấy thứ tự từ chuỗi).

```python
from collections import Counter

def first_unique(s):
    count = Counter(s)
    for i, ch in enumerate(s):     # theo thứ tự gốc của chuỗi
        if count[ch] == 1:
            return i
    return -1
```
```javascript
function firstUnique(s) {
  const count = new Map();
  for (const ch of s) count.set(ch, (count.get(ch) ?? 0) + 1);
  for (let i = 0; i < s.length; i++) {
    if (count.get(s[i]) === 1) return i;
  }
  return -1;
}
```
```java
int firstUnique(String s) {
    Map<Character, Integer> count = new HashMap<>();
    for (char ch : s.toCharArray()) count.merge(ch, 1, Integer::sum);
    for (int i = 0; i < s.length(); i++) {
        if (count.get(s.charAt(i)) == 1) return i;
    }
    return -1;
}
```
```go
func firstUnique(s string) int {
    count := map[rune]int{}
    for _, ch := range s {
        count[ch]++
    }
    for i, ch := range s { // với ASCII, i là chỉ số ký tự
        if count[ch] == 1 {
            return i
        }
    }
    return -1
}
```

```cpp
#include <string>
#include <unordered_map>

int firstUnique(const std::string& s) {
    std::unordered_map<char, int> count;
    for (char ch : s) count[ch]++;
    for (int i = 0; i < (int)s.size(); i++) { // theo thứ tự gốc của chuỗi
        if (count[s[i]] == 1) return i;
    }
    return -1;
}
```

Độ phức tạp: **O(n)** thời gian, **O(1)** bộ nhớ nếu bảng chữ cái cố định (ví dụ 26 chữ thường), ngược lại **O(k)** với k ký tự phân biệt.

> 💡 Ghi nhớ: rất nhiều bài "string/array" tách thành **hai lượt** — lượt một dựng map (count hoặc index), lượt hai dùng map để quyết định. Khi cần kết quả "đầu tiên/theo thứ tự", luôn lấy thứ tự từ dữ liệu gốc, đừng lấy từ map.

## 8. Tổng kết

- Hash table cho **insert/lookup/delete O(1) trung bình** nhờ băm key thẳng tới ô; xấu nhất O(n) vì collision/resize.
- **Set** trả lời "có không"; **Map** trả lời "gắn với gì". Cùng một bộ máy bên dưới.
- Bốn siêu năng lực: **đếm, dedup, lookup, group by** — nhận ra chúng là nhận ra 80% bài hash map.
- **Không** dùng khi cần thứ tự, range query, dữ liệu siêu nhỏ, hay bộ nhớ căng — khi đó chọn mảng đã sắp xếp hoặc cây.
- Đừng tin thứ tự duyệt map; key phải hashable/immutable.

Bài tiếp theo — **Stack, Queue & Monotonic** — chuyển sang các cấu trúc mà *thứ tự xử lý* mới là điểm cốt lõi.
