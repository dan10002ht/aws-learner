# Sorting & Binary Search

Sắp xếp (sorting) và tìm kiếm nhị phân (binary search) là cặp đôi xuất hiện ở khắp nơi: từ việc hiển thị danh sách đơn hàng theo ngày, dedup dữ liệu, cho đến phỏng vấn. Điểm mấu chốt thực dụng: **gần như không bao giờ bạn tự viết hàm sort trong code production** — bạn dùng built-in. Nhưng bạn PHẢI hiểu nó để biết độ phức tạp, biết khi nào sort là "stable", biết sort theo key, và đặc biệt là làm chủ binary search cùng các biến thể của nó (đây mới là phần dễ sai và hay được hỏi).

Bài này tập trung vào những gì dùng được ngay: ý tưởng của các thuật toán sort O(n log n), stable sort là gì và vì sao bạn quan tâm, sort theo key, rồi đào sâu vào binary search và 4 biến thể quan trọng (tìm chính xác, lower bound, upper bound, và "search on answer").

---

## 1. Sorting tổng quan: bức tranh lớn

### Vì sao O(n log n) là "trần" của comparison sort

Mọi thuật toán sort dựa trên **so sánh hai phần tử** (comparison sort) không thể nhanh hơn O(n log n) trong trường hợp xấu nhất — đây là giới hạn lý thuyết đã được chứng minh. Vậy nên merge sort, quick sort, heap sort, và built-in của mọi ngôn ngữ đều xoay quanh mốc này.

Các sort O(n²) như bubble/insertion/selection sort chỉ dùng để học hoặc cho mảng rất nhỏ. Trong thực tế bạn không gặp chúng ở production.

### Bảng so sánh các thuật toán sort

| Thuật toán | Trung bình | Xấu nhất | Bộ nhớ | Stable? | Ghi chú |
|---|---|---|---|---|---|
| Quick sort | O(n log n) | O(n²) | O(log n) | Không | Nhanh trong thực tế, in-place |
| Merge sort | O(n log n) | O(n log n) | O(n) | Có | Ổn định, dễ dự đoán |
| Heap sort | O(n log n) | O(n log n) | O(1) | Không | In-place nhưng chậm hơn quick |
| Timsort (built-in Python/Java) | O(n log n) | O(n log n) | O(n) | Có | Tận dụng dữ liệu gần sắp xếp |
| Insertion sort | O(n²) | O(n²) | O(1) | Có | Chỉ tốt với n nhỏ / gần sắp xếp |

> 💡 Ghi nhớ: Quick sort **trung bình** rất nhanh nhưng **xấu nhất** là O(n²) (khi pivot chọn tệ). Merge sort luôn O(n log n) nhưng tốn O(n) bộ nhớ phụ. Built-in của Python (Timsort) và Java (cho object) là **stable**.

---

## 2. Ý tưởng Merge Sort & Quick Sort

Bạn không cần thuộc lòng code, nhưng cần hiểu ý tưởng để trả lời phỏng vấn và để biết tính chất.

**Merge sort** — chia để trị (divide and conquer): chia mảng làm đôi, sort từng nửa (đệ quy), rồi **trộn (merge)** hai nửa đã sắp xếp lại. Merge là chỗ tốn O(n) mỗi tầng, có log n tầng → O(n log n). Nó stable vì khi merge, nếu hai phần tử bằng nhau ta luôn lấy phần tử bên trái trước.

```python
def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

def merge(left, right):
    result, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:   # <= giữ tính stable
            result.append(left[i]); i += 1
        else:
            result.append(right[j]); j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result
```
```javascript
function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  return merge(left, right);
}

function merge(left, right) {
  const result = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) result.push(left[i++]); // <= giữ stable
    else result.push(right[j++]);
  }
  return result.concat(left.slice(i)).concat(right.slice(j));
}
```
```java
static int[] mergeSort(int[] arr) {
    if (arr.length <= 1) return arr;
    int mid = arr.length / 2;
    int[] left = mergeSort(Arrays.copyOfRange(arr, 0, mid));
    int[] right = mergeSort(Arrays.copyOfRange(arr, mid, arr.length));
    return merge(left, right);
}

static int[] merge(int[] left, int[] right) {
    int[] result = new int[left.length + right.length];
    int i = 0, j = 0, k = 0;
    while (i < left.length && j < right.length) {
        if (left[i] <= right[j]) result[k++] = left[i++]; // <= giữ stable
        else result[k++] = right[j++];
    }
    while (i < left.length) result[k++] = left[i++];
    while (j < right.length) result[k++] = right[j++];
    return result;
}
```
```go
func mergeSort(arr []int) []int {
	if len(arr) <= 1 {
		return arr
	}
	mid := len(arr) / 2
	left := mergeSort(arr[:mid])
	right := mergeSort(arr[mid:])
	return merge(left, right)
}

func merge(left, right []int) []int {
	result := make([]int, 0, len(left)+len(right))
	i, j := 0, 0
	for i < len(left) && j < len(right) {
		if left[i] <= right[j] { // <= giữ stable
			result = append(result, left[i]); i++
		} else {
			result = append(result, right[j]); j++
		}
	}
	result = append(result, left[i:]...)
	result = append(result, right[j:]...)
	return result
}
```

**Quick sort** — chọn một **pivot**, phân hoạch (partition) mảng thành "nhỏ hơn pivot" và "lớn hơn pivot", rồi đệ quy hai bên. Trung bình O(n log n), nhưng nếu pivot luôn chọn tệ (ví dụ mảng đã sắp xếp + luôn lấy phần tử cuối) thì thành O(n²). Thực tế người ta chọn pivot ngẫu nhiên hoặc "median of three" để tránh trường hợp xấu.

> ⚠️ Bẫy: Đừng nói "quick sort luôn nhanh hơn merge sort". Quick sort không stable và có thể O(n²). Khi phỏng vấn hỏi "chọn sort nào", câu trả lời tốt là tuỳ ràng buộc: cần stable → merge/Timsort; cần in-place tiết kiệm bộ nhớ → heap/quick.

---

## 3. Stable sort là gì và vì sao bạn quan tâm

**Stable sort**: khi hai phần tử có cùng khoá sắp xếp, thứ tự tương đối của chúng được **giữ nguyên** như trong mảng gốc.

Ví dụ thực tế: bạn có danh sách nhân viên đã sắp theo tên, giờ muốn sort theo phòng ban. Với stable sort, trong cùng một phòng ban, các nhân viên vẫn giữ thứ tự theo tên. Điều này cho phép **sort nhiều tiêu chí bằng cách sort nhiều lần** (sort theo tiêu chí phụ trước, tiêu chí chính sau).

> 💡 Ghi nhớ: Python `sorted()`/`list.sort()` và Java `Collections.sort()` (cho object) đều **stable**. JavaScript `Array.sort()` được đảm bảo stable từ ES2019 trở đi. Go `sort.Slice` **KHÔNG stable** — dùng `sort.SliceStable` nếu cần ổn định.

---

## 4. Sort theo key (điều bạn dùng 90% thời gian)

Trong công việc, bạn hiếm khi sort số nguyên thuần. Bạn sort danh sách object theo một trường: theo giá, theo ngày, giảm dần theo điểm rồi tăng dần theo tên. Mọi ngôn ngữ đều cho bạn truyền một **hàm key / comparator**.

```python
people = [{"name": "An", "age": 30}, {"name": "Binh", "age": 25}, {"name": "Cuong", "age": 30}]

# Sort theo age tang dan
people.sort(key=lambda p: p["age"])

# Sort da tieu chi: age tang, roi name tang
people.sort(key=lambda p: (p["age"], p["name"]))

# Giam dan theo age, nhung name van tang dan:
# thu thuat: so thi dao dau, dam bao mot lan sort
people.sort(key=lambda p: (-p["age"], p["name"]))
```
```javascript
const people = [{name: "An", age: 30}, {name: "Binh", age: 25}, {name: "Cuong", age: 30}];

// Sort theo age tang dan (sort tai cho, doi mang goc)
people.sort((a, b) => a.age - b.age);

// Da tieu chi: age tang, roi name tang
people.sort((a, b) => a.age - b.age || a.name.localeCompare(b.name));

// Giam dan theo age, name tang dan
people.sort((a, b) => b.age - a.age || a.name.localeCompare(b.name));
```
```java
record Person(String name, int age) {}
List<Person> people = new ArrayList<>(List.of(
    new Person("An", 30), new Person("Binh", 25), new Person("Cuong", 30)));

// Sort theo age tang dan
people.sort(Comparator.comparingInt(Person::age));

// Da tieu chi: age tang, roi name tang
people.sort(Comparator.comparingInt(Person::age).thenComparing(Person::name));

// Giam dan theo age, name tang dan
people.sort(Comparator.comparingInt(Person::age).reversed()
        .thenComparing(Person::name));
```
```go
type Person struct {
	Name string
	Age  int
}
people := []Person{{"An", 30}, {"Binh", 25}, {"Cuong", 30}}

// Sort theo age tang dan
sort.Slice(people, func(i, j int) bool { return people[i].Age < people[j].Age })

// Da tieu chi: age tang, roi name tang
sort.Slice(people, func(i, j int) bool {
	if people[i].Age != people[j].Age {
		return people[i].Age < people[j].Age
	}
	return people[i].Name < people[j].Name
})
```

> ⚠️ Bẫy: Trong JS, `arr.sort()` mặc định so sánh theo **chuỗi**, nên `[10, 2, 1].sort()` ra `[1, 10, 2]`. Luôn truyền comparator khi sort số: `arr.sort((a, b) => a - b)`.

### Khi nào tự cài sort vs dùng built-in?

- **Dùng built-in** trong gần như mọi trường hợp công việc: nó đã được tối ưu, stable (đa số), và ít lỗi.
- **Tự cài** chỉ khi: (1) phỏng vấn yêu cầu, (2) bạn cần counting sort / radix sort cho dữ liệu số nguyên trong khoảng hẹp để đạt O(n) — vượt giới hạn O(n log n) của comparison sort, (3) môi trường nhúng không có thư viện.

---

## 5. Binary Search — phần quan trọng nhất

Binary search tìm phần tử trong **mảng ĐÃ sắp xếp** với O(log n): mỗi bước loại bỏ một nửa không gian tìm kiếm. Đây là kỹ thuật bị hỏi nhiều và dễ viết sai (off-by-one, vòng lặp vô hạn). Hãy nắm vững một template và bám theo nó.

| Thao tác | Độ phức tạp |
|---|---|
| Binary search (mảng đã sort) | O(log n) |
| Sort rồi binary search nhiều lần | O(n log n) + O(q log n) |
| Linear search (mảng chưa sort) | O(n) |

### Tìm chính xác một giá trị

Quy ước an toàn: dùng nửa khoảng `[lo, hi)` với `hi = len(arr)` và điều kiện vòng lặp `lo < hi`, tính `mid = lo + (hi - lo) // 2` để tránh tràn số.

```python
def binary_search(arr, target):
    lo, hi = 0, len(arr)          # [lo, hi)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return -1                     # khong tim thay
```
```javascript
function binarySearch(arr, target) {
  let lo = 0, hi = arr.length;   // [lo, hi)
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (arr[mid] === target) return mid;
    else if (arr[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return -1;
}
```
```java
static int binarySearch(int[] arr, int target) {
    int lo = 0, hi = arr.length;   // [lo, hi)
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) lo = mid + 1;
        else hi = mid;
    }
    return -1;
}
```
```go
func binarySearch(arr []int, target int) int {
	lo, hi := 0, len(arr) // [lo, hi)
	for lo < hi {
		mid := lo + (hi-lo)/2
		if arr[mid] == target {
			return mid
		} else if arr[mid] < target {
			lo = mid + 1
		} else {
			hi = mid
		}
	}
	return -1
}
```

> ⚠️ Bẫy: `mid = (lo + hi) / 2` có thể **tràn số nguyên** với mảng cực lớn trong Java/Go (lo + hi vượt Int max). Luôn viết `lo + (hi - lo) / 2`. Và đừng quên cập nhật `lo = mid + 1` (cộng 1!) — quên `+1` gây vòng lặp vô hạn.

---

## 6. Biến thể: Lower Bound & Upper Bound

Đây là phần **thực dụng nhất** của binary search. Thay vì tìm "có hay không", ta tìm **vị trí biên**:

- **lower_bound(target)**: chỉ số đầu tiên có `arr[i] >= target` (vị trí chèn để giữ thứ tự, vị trí xuất hiện đầu tiên của target nếu có).
- **upper_bound(target)**: chỉ số đầu tiên có `arr[i] > target` (vị trí ngay sau lần xuất hiện cuối của target).

Từ hai hàm này bạn suy ra mọi thứ: số lần xuất hiện của `target` = `upper_bound - lower_bound`; vị trí xuất hiện đầu/cuối; đếm số phần tử trong khoảng `[a, b]`.

```python
def lower_bound(arr, target):     # dau tien arr[i] >= target
    lo, hi = 0, len(arr)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo

def upper_bound(arr, target):     # dau tien arr[i] > target
    lo, hi = 0, len(arr)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if arr[mid] <= target:
            lo = mid + 1
        else:
            hi = mid
    return lo

# Dem so lan xuat hien cua target
def count(arr, target):
    return upper_bound(arr, target) - lower_bound(arr, target)
```
```javascript
function lowerBound(arr, target) {   // dau tien arr[i] >= target
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function upperBound(arr, target) {   // dau tien arr[i] > target
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (arr[mid] <= target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function count(arr, target) {
  return upperBound(arr, target) - lowerBound(arr, target);
}
```
```java
static int lowerBound(int[] arr, int target) {   // dau tien arr[i] >= target
    int lo = 0, hi = arr.length;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (arr[mid] < target) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

static int upperBound(int[] arr, int target) {   // dau tien arr[i] > target
    int lo = 0, hi = arr.length;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (arr[mid] <= target) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

static int count(int[] arr, int target) {
    return upperBound(arr, target) - lowerBound(arr, target);
}
```
```go
func lowerBound(arr []int, target int) int { // dau tien arr[i] >= target
	lo, hi := 0, len(arr)
	for lo < hi {
		mid := lo + (hi-lo)/2
		if arr[mid] < target {
			lo = mid + 1
		} else {
			hi = mid
		}
	}
	return lo
}

func upperBound(arr []int, target int) int { // dau tien arr[i] > target
	lo, hi := 0, len(arr)
	for lo < hi {
		mid := lo + (hi-lo)/2
		if arr[mid] <= target {
			lo = mid + 1
		} else {
			hi = mid
		}
	}
	return lo
}

func count(arr []int, target int) int {
	return upperBound(arr, target) - lowerBound(arr, target)
}
```

> 💡 Ghi nhớ: Khác biệt duy nhất giữa lower và upper bound là dấu so sánh: lower dùng `arr[mid] < target`, upper dùng `arr[mid] <= target`. Hầu hết ngôn ngữ có sẵn: Python `bisect.bisect_left` / `bisect_right`, Java `Arrays.binarySearch` (nhưng vị trí phần tử trùng không xác định), Go `sort.SearchInts`.

---

## 7. Biến thể: Search on Answer (tìm nhị phân trên đáp án)

Đây là kỹ thuật "nâng cao" nhưng cực kỳ hữu ích và hay xuất hiện trong phỏng vấn. Ý tưởng: khi đáp án nằm trong một **khoảng số** và có tính **đơn điệu** (nếu giá trị `x` thoả thì mọi giá trị lớn hơn cũng thoả, hoặc ngược lại), ta binary search trên chính khoảng đáp án thay vì trên mảng.

Mẫu nhận diện: "tìm giá trị **nhỏ nhất / lớn nhất** sao cho điều kiện đúng". Ta viết một hàm `feasible(x)` trả về true/false, rồi binary search tìm biên.

Ví dụ kinh điển: **Koko ăn chuối** — có `n` đống chuối, Koko ăn tốc độ `k` quả/giờ, cần ăn hết trong `h` giờ. Tìm `k` nhỏ nhất. `feasible(k)` = tổng số giờ cần ≤ h. Tốc độ càng lớn càng dễ thoả → binary search `k` trong `[1, max(piles)]`.

```python
import math

def min_eating_speed(piles, h):
    def feasible(k):
        hours = sum(math.ceil(p / k) for p in piles)
        return hours <= h
    lo, hi = 1, max(piles)          # dap an nam trong [lo, hi]
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if feasible(mid):
            hi = mid                # mid thoa -> thu nho hon
        else:
            lo = mid + 1
    return lo
```
```javascript
function minEatingSpeed(piles, h) {
  const feasible = (k) => {
    let hours = 0;
    for (const p of piles) hours += Math.ceil(p / k);
    return hours <= h;
  };
  let lo = 1, hi = Math.max(...piles);
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (feasible(mid)) hi = mid;    // mid thoa -> thu nho hon
    else lo = mid + 1;
  }
  return lo;
}
```
```java
static int minEatingSpeed(int[] piles, int h) {
    int hi = 0;
    for (int p : piles) hi = Math.max(hi, p);
    int lo = 1;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        long hours = 0;
        for (int p : piles) hours += (p + mid - 1) / mid; // ceil
        if (hours <= h) hi = mid;    // mid thoa -> thu nho hon
        else lo = mid + 1;
    }
    return lo;
}
```
```go
func minEatingSpeed(piles []int, h int) int {
	hi := 0
	for _, p := range piles {
		if p > hi {
			hi = p
		}
	}
	lo := 1
	for lo < hi {
		mid := lo + (hi-lo)/2
		hours := 0
		for _, p := range piles {
			hours += (p + mid - 1) / mid // ceil
		}
		if hours <= h { // mid thoa -> thu nho hon
			hi = mid
		} else {
			lo = mid + 1
		}
	}
	return lo
}
```

> 💡 Ghi nhớ: Điều kiện để dùng search on answer là tính **đơn điệu** của `feasible`: khi tăng `x`, kết quả chuyển từ false sang true (hoặc ngược lại) **đúng một lần**. Nếu không đơn điệu thì không dùng được.

---

## 8. Bài toán điển hình

### Bài 1 — Search in Rotated Sorted Array (xoay vòng)

Cho mảng đã sắp tăng nhưng bị **xoay** tại một điểm (ví dụ `[4,5,6,7,0,1,2]`), tìm `target`. Yêu cầu O(log n).

**Hướng giải**: vẫn binary search, nhưng tại mỗi `mid` ta xác định **nửa nào đang được sắp xếp đúng** (so `arr[lo]` với `arr[mid]`). Nếu nửa trái sắp xếp và target nằm trong khoảng `[arr[lo], arr[mid])` thì đi trái, ngược lại đi phải; xử lý đối xứng cho nửa phải. Mỗi bước vẫn loại nửa không gian → O(log n).

### Bài 2 — First/Last Position of Element

Cho mảng đã sort có phần tử lặp, tìm vị trí xuất hiện **đầu** và **cuối** của target. Trả `[-1, -1]` nếu không có.

**Hướng giải**: dùng đúng `lower_bound` và `upper_bound` ở mục 6. Vị trí đầu = `lower_bound(target)` (kiểm tra `arr[idx] == target`); vị trí cuối = `upper_bound(target) - 1`. Đây là ứng dụng trực tiếp, không cần viết lại logic.

### Bài 3 — Merge Intervals (ứng dụng của sort)

Cho danh sách khoảng `[start, end]`, gộp các khoảng chồng lấn. Ví dụ `[[1,3],[2,6],[8,10]]` → `[[1,6],[8,10]]`.

**Hướng giải**: **sort theo start** trước (đây là chìa khoá), rồi duyệt một lượt: nếu khoảng hiện tại chồng lên khoảng cuối trong kết quả (`start <= last.end`) thì mở rộng `last.end = max(last.end, end)`, ngược lại thêm khoảng mới. Tổng O(n log n) do sort. Nhiều bài "lịch họp", "đặt phòng", "gộp log theo thời gian" trong công việc đều quy về mẫu này.

---

## Tổng kết

- Comparison sort không thể nhanh hơn **O(n log n)**; merge sort luôn đạt nó và **stable**, quick sort nhanh trung bình nhưng xấu nhất O(n²) và không stable.
- **Stable sort** giữ thứ tự phần tử bằng khoá — cho phép sort đa tiêu chí. Biết ngôn ngữ của bạn stable hay không (Go `sort.Slice` không stable).
- Trong công việc, **dùng built-in + sort theo key**; chỉ tự cài khi phỏng vấn hoặc cần counting/radix sort để vượt O(n log n).
- **Binary search** O(log n) trên mảng đã sort. Nắm một template nửa khoảng `[lo, hi)` để tránh off-by-one.
- Làm chủ **lower_bound / upper_bound** — chúng giải được hầu hết bài tìm biên, đếm xuất hiện, vị trí chèn.
- **Search on answer**: khi tìm min/max thoả một điều kiện đơn điệu, binary search trên khoảng đáp án với hàm `feasible(x)`.
