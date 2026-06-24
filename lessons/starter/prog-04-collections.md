# Mảng, danh sách & từ điển

Hãy tưởng tượng bạn đi siêu thị. Bạn cần một **danh sách mua sắm** (ghi lần lượt: trứng, sữa, bánh mì), và một **cuốn sổ ghi giá** (tra tên món → biết giá tiền). Hai cách tổ chức dữ liệu này chính là hai "cấu trúc dữ liệu" quan trọng nhất trong lập trình: **danh sách (list/array)** và **từ điển (dictionary/map)**. Bài này sẽ giúp bạn hiểu chúng từ con số 0.

## 1. Tại sao cần "chứa nhiều thứ trong một biến"?

Ở các bài trước, mỗi biến (variable — ô nhớ có tên để cất một giá trị) chỉ chứa **một** giá trị: một con số, một chuỗi chữ. Nhưng đời thực hiếm khi chỉ có một thứ:

- Điểm thi của **40 học sinh** trong lớp.
- Danh sách **100 bài hát** trong playlist.
- Số điện thoại của **tất cả bạn bè**.

Nếu phải tạo 40 biến `diem1`, `diem2`, ..., `diem40` thì quá khổ sở. Ta cần một "chiếc hộp lớn" chứa được nhiều giá trị — đó là lúc danh sách xuất hiện.

## 2. List/Array — dãy có thứ tự

**List** (danh sách) hay **array** (mảng) là một dãy các giá trị **xếp theo thứ tự**, giống một dãy tủ khóa ở hồ bơi: tủ số 0, tủ số 1, tủ số 2... mỗi tủ chứa một món đồ.

Tạo một danh sách trái cây:

```python
trai_cay = ["táo", "cam", "chuối"]
print(trai_cay)
```
```javascript
const traiCay = ["táo", "cam", "chuối"];
console.log(traiCay);
```
```java
import java.util.ArrayList;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        List<String> traiCay = new ArrayList<>(List.of("táo", "cam", "chuối"));
        System.out.println(traiCay);
    }
}
```
```go
package main

import "fmt"

func main() {
    traiCay := []string{"táo", "cam", "chuối"}
    fmt.Println(traiCay)
}
```

```cpp
#include <iostream>
#include <vector>
#include <string>

int main() {
    std::vector<std::string> traiCay = {"táo", "cam", "chuối"};
    std::cout << "[";
    for (size_t i = 0; i < traiCay.size(); i++) {
        std::cout << traiCay[i];
        if (i + 1 < traiCay.size()) std::cout << ", ";
    }
    std::cout << "]" << std::endl;
}
```

Khác biệt nhỏ: Python và JavaScript có list/array "sẵn dùng" rất thoải mái. Java phân biệt mảng cố định (`String[]`) và `ArrayList` co giãn được — người mới thường dùng `ArrayList`. Go gọi dãy co giãn là **slice** (lát cắt), khai báo bằng `[]string{...}`.

### 2.1. Index — đánh số từ 0

Mỗi ô trong danh sách có một **index** (chỉ số — số thứ tự của ô). Điều khiến mọi người mới đều "ngã ngửa": **index bắt đầu từ 0, không phải 1**.

| Giá trị | "táo" | "cam" | "chuối" |
|---------|-------|-------|---------|
| Index   | 0     | 1     | 2       |

Analogy: index giống như "bạn đứng cách đầu hàng bao nhiêu bước". Người đầu hàng cách đầu hàng **0 bước**, nên mang số 0.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 220" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>List là dãy ô liền nhau, index đánh số từ 0</title>
  <desc>Danh sách trai_cay gồm ba ô liền nhau: ô index 0 chứa táo, ô index 1 chứa cam, ô index 2 chứa chuối. Index đánh số từ 0 nên index cuối cùng là N trừ 1. Truy cập index 3 là lỗi vì danh sách chỉ có 3 phần tử.</desc>
  <text x="16" y="26" font-size="14" font-weight="700" fill="currentColor">trai_cay = ["táo", "cam", "chuối"]</text>
  <g>
    <rect x="40" y="50" width="150" height="62" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="115" y="89" font-size="16" font-weight="700" text-anchor="middle" fill="currentColor">táo</text>
    <text x="115" y="135" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.8">index 0</text>
  </g>
  <g>
    <rect x="190" y="50" width="150" height="62" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="265" y="89" font-size="16" font-weight="700" text-anchor="middle" fill="currentColor">cam</text>
    <text x="265" y="135" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.8">index 1</text>
  </g>
  <g>
    <rect x="340" y="50" width="150" height="62" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="415" y="89" font-size="16" font-weight="700" text-anchor="middle" fill="currentColor">chuối</text>
    <text x="415" y="135" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.8">index 2</text>
  </g>
  <g>
    <rect x="510" y="50" width="150" height="62" rx="9" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="6 4"/>
    <text x="585" y="78" font-size="22" font-weight="700" text-anchor="middle" fill="#f59e0b">✕</text>
    <text x="585" y="100" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">không tồn tại</text>
    <text x="585" y="135" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.8">index 3</text>
  </g>
  <text x="265" y="172" font-size="12.5" text-anchor="middle" fill="currentColor" opacity="0.85">3 phần tử → index cuối = N − 1 = <tspan font-weight="700">2</tspan></text>
  <text x="585" y="172" font-size="12" text-anchor="middle" fill="#f59e0b" font-weight="700">trai_cay[3] → lỗi!</text>
  <text x="265" y="196" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.7">index hợp lệ: 0, 1, 2</text>
  <text x="585" y="196" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">index out of range</text>
</svg>

```python
trai_cay = ["táo", "cam", "chuối"]
print(trai_cay[0])   # táo
print(trai_cay[2])   # chuối
```
```javascript
const traiCay = ["táo", "cam", "chuối"];
console.log(traiCay[0]);   // táo
console.log(traiCay[2]);   // chuối
```
```java
List<String> traiCay = new ArrayList<>(List.of("táo", "cam", "chuối"));
System.out.println(traiCay.get(0));   // táo
System.out.println(traiCay.get(2));   // chuối
```
```go
traiCay := []string{"táo", "cam", "chuối"}
fmt.Println(traiCay[0])   // táo
fmt.Println(traiCay[2])   // chuối
```

```cpp
std::vector<std::string> traiCay = {"táo", "cam", "chuối"};
std::cout << traiCay[0] << std::endl;   // táo
std::cout << traiCay[2] << std::endl;   // chuối
```

> ⚠️ **Lỗi người mới hay gặp:** truy cập `trai_cay[3]` khi danh sách chỉ có 3 phần tử (index hợp lệ là 0, 1, 2). Chương trình sẽ báo lỗi "index out of range" (vượt quá phạm vi) hoặc trả về `undefined` (JavaScript). Quy tắc: danh sách có N phần tử thì index cuối cùng là **N − 1**.

### 2.2. Thêm và xóa phần tử

Danh sách sống động: bạn thêm món vào cuối, xóa món đã mua xong.

```python
gio_hang = ["trứng"]
gio_hang.append("sữa")      # thêm vào cuối: ["trứng", "sữa"]
gio_hang.append("bánh mì")  # ["trứng", "sữa", "bánh mì"]
gio_hang.remove("sữa")      # xóa theo giá trị: ["trứng", "bánh mì"]
print(len(gio_hang))        # 2 — len() đếm số phần tử
```
```javascript
const gioHang = ["trứng"];
gioHang.push("sữa");           // thêm vào cuối
gioHang.push("bánh mì");
gioHang.splice(gioHang.indexOf("sữa"), 1);  // tìm vị trí rồi xóa 1 phần tử
console.log(gioHang.length);   // 2
```
```java
List<String> gioHang = new ArrayList<>();
gioHang.add("trứng");
gioHang.add("sữa");
gioHang.add("bánh mì");
gioHang.remove("sữa");          // xóa theo giá trị
System.out.println(gioHang.size());  // 2
```
```go
gioHang := []string{"trứng"}
gioHang = append(gioHang, "sữa")      // append trả về slice mới, phải gán lại
gioHang = append(gioHang, "bánh mì")
gioHang = append(gioHang[:1], gioHang[2:]...) // xóa phần tử ở index 1
fmt.Println(len(gioHang))             // 2
```

```cpp
#include <vector>
#include <string>
#include <algorithm>

std::vector<std::string> gioHang = {"trứng"};
gioHang.push_back("sữa");        // thêm vào cuối
gioHang.push_back("bánh mì");
// xóa theo giá trị: tìm vị trí rồi erase
auto it = std::find(gioHang.begin(), gioHang.end(), "sữa");
if (it != gioHang.end()) gioHang.erase(it);
std::cout << gioHang.size() << std::endl;  // 2
```

Chú thích: Go không có hàm "xóa theo giá trị" sẵn — bạn ghép phần trước và phần sau vị trí cần xóa lại với nhau. Trong Go, `append` **phải gán lại** vào biến (`gioHang = append(...)`), quên gán là lỗi kinh điển.

### 2.3. Duyệt danh sách (đi qua từng phần tử)

**Duyệt** (loop/iterate) là đi lần lượt qua từng phần tử để làm gì đó — như điểm danh từng học sinh trong lớp.

```python
diem = [8, 9, 7, 10]
tong = 0
for d in diem:
    tong = tong + d
print("Tổng điểm:", tong)   # 34
```
```javascript
const diem = [8, 9, 7, 10];
let tong = 0;
for (const d of diem) {
    tong = tong + d;
}
console.log("Tổng điểm:", tong);   // 34
```
```java
List<Integer> diem = List.of(8, 9, 7, 10);
int tong = 0;
for (int d : diem) {
    tong = tong + d;
}
System.out.println("Tổng điểm: " + tong);   // 34
```
```go
diem := []int{8, 9, 7, 10}
tong := 0
for _, d := range diem {
    tong = tong + d
}
fmt.Println("Tổng điểm:", tong)   // 34
```

```cpp
#include <vector>

std::vector<int> diem = {8, 9, 7, 10};
int tong = 0;
for (int d : diem) {        // range-based for: duyệt từng giá trị
    tong = tong + d;
}
std::cout << "Tổng điểm: " << tong << std::endl;   // 34
```

Chú thích: Go dùng `range`, trả về cả index lẫn giá trị; dấu `_` nghĩa là "bỏ qua index, tôi không cần". JavaScript dùng `for...of` để lấy giá trị (đừng nhầm với `for...in` — cái đó lấy index).

> 💡 **Ghi nhớ:** List = dãy **có thứ tự**, truy cập bằng **index từ 0**, được phép **trùng giá trị** (hai học sinh cùng được 8 điểm là chuyện bình thường).

## 3. Dictionary/Map — tra cứu theo khóa

Bây giờ thử bài toán khác: lưu **số điện thoại của bạn bè**. Nếu dùng list, muốn tìm số của "Lan" bạn phải duyệt cả danh sách. Bất tiện như tra từ điển mà phải đọc từ trang 1!

**Dictionary** (từ điển — Python gọi là `dict`, JavaScript/Go gọi là **Map**, Java gọi là `HashMap`) lưu dữ liệu theo cặp **khóa → giá trị** (key → value). Đưa khóa vào, nhận ngay giá trị ra — như tra mục lục: biết tên chương, lật thẳng đến trang.

| Khóa (key) | Giá trị (value) |
|------------|-----------------|
| "Lan"      | "0901234567"    |
| "Minh"     | "0907654321"    |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 230" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Dictionary là bảng tra cứu khóa đến giá trị</title>
  <desc>Từ điển danh_ba ánh xạ khóa sang giá trị: khóa Lan trỏ thẳng tới giá trị 0901234567, khóa Minh trỏ thẳng tới giá trị 0907654321. Đưa khóa vào nhận ngay giá trị ra, không phải duyệt cả danh sách như list.</desc>
  <text x="16" y="26" font-size="14" font-weight="700" fill="currentColor">danh_ba — đưa khóa vào, nhận giá trị ra ngay</text>
  <text x="120" y="58" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.7">KHÓA (key)</text>
  <text x="560" y="58" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.7">GIÁ TRỊ (value)</text>
  <g>
    <rect x="40" y="74" width="160" height="48" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="120" y="104" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">"Lan"</text>
    <rect x="480" y="74" width="200" height="48" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="580" y="104" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">"0901234567"</text>
    <line x1="204" y1="98" x2="472" y2="98" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#dictArr)"/>
  </g>
  <g>
    <rect x="40" y="142" width="160" height="48" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="120" y="172" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">"Minh"</text>
    <rect x="480" y="142" width="200" height="48" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="580" y="172" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">"0907654321"</text>
    <line x1="204" y1="166" x2="472" y2="166" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#dictArr)"/>
  </g>
  <text x="338" y="214" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.75">tra thẳng tới giá trị — khác list phải duyệt từng phần tử</text>
  <defs>
    <marker id="dictArr" markerWidth="11" markerHeight="11" refX="8" refY="4" orient="auto"><path d="M0 0 L9 4 L0 8 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
</svg>

```python
danh_ba = {"Lan": "0901234567", "Minh": "0907654321"}
print(danh_ba["Lan"])          # tra cứu: 0901234567
danh_ba["Hoa"] = "0909999999"  # thêm cặp mới
del danh_ba["Minh"]            # xóa theo khóa
print("Lan" in danh_ba)        # kiểm tra khóa tồn tại: True
```
```javascript
const danhBa = new Map([["Lan", "0901234567"], ["Minh", "0907654321"]]);
console.log(danhBa.get("Lan"));     // 0901234567
danhBa.set("Hoa", "0909999999");    // thêm cặp mới
danhBa.delete("Minh");              // xóa theo khóa
console.log(danhBa.has("Lan"));     // true
```
```java
import java.util.HashMap;
import java.util.Map;

Map<String, String> danhBa = new HashMap<>();
danhBa.put("Lan", "0901234567");
danhBa.put("Minh", "0907654321");
System.out.println(danhBa.get("Lan"));      // 0901234567
danhBa.put("Hoa", "0909999999");            // thêm cặp mới
danhBa.remove("Minh");                      // xóa theo khóa
System.out.println(danhBa.containsKey("Lan")); // true
```
```go
danhBa := map[string]string{"Lan": "0901234567", "Minh": "0907654321"}
fmt.Println(danhBa["Lan"])        // 0901234567
danhBa["Hoa"] = "0909999999"      // thêm cặp mới
delete(danhBa, "Minh")            // xóa theo khóa
_, ton_tai := danhBa["Lan"]       // kiểm tra khóa tồn tại
fmt.Println(ton_tai)              // true
```

```cpp
#include <map>
#include <string>

std::map<std::string, std::string> danhBa = {
    {"Lan", "0901234567"}, {"Minh", "0907654321"}};
std::cout << danhBa["Lan"] << std::endl;   // 0901234567
danhBa["Hoa"] = "0909999999";              // thêm cặp mới
danhBa.erase("Minh");                      // xóa theo khóa
bool tonTai = danhBa.count("Lan") > 0;     // kiểm tra khóa tồn tại
std::cout << std::boolalpha << tonTai << std::endl;   // true
```

Chú thích: trong JavaScript, người ta cũng hay dùng object thường `{Lan: "090..."}` như một từ điển đơn giản — `Map` là phiên bản "chính quy" hơn. Go có cú pháp đặc biệt `gia_tri, ok := m[khoa]` để vừa lấy giá trị vừa biết khóa có tồn tại hay không.

### 3.1. Duyệt từ điển

```python
danh_ba = {"Lan": "0901234567", "Hoa": "0909999999"}
for ten, sdt in danh_ba.items():
    print(ten, "->", sdt)
```
```javascript
const danhBa = new Map([["Lan", "0901234567"], ["Hoa", "0909999999"]]);
for (const [ten, sdt] of danhBa) {
    console.log(ten, "->", sdt);
}
```
```java
Map<String, String> danhBa = new HashMap<>();
danhBa.put("Lan", "0901234567");
danhBa.put("Hoa", "0909999999");
for (Map.Entry<String, String> muc : danhBa.entrySet()) {
    System.out.println(muc.getKey() + " -> " + muc.getValue());
}
```
```go
danhBa := map[string]string{"Lan": "0901234567", "Hoa": "0909999999"}
for ten, sdt := range danhBa {
    fmt.Println(ten, "->", sdt)
}
```

```cpp
#include <map>
#include <string>

std::map<std::string, std::string> danhBa = {
    {"Lan", "0901234567"}, {"Hoa", "0909999999"}};
for (const auto& [ten, sdt] : danhBa) {   // structured binding (C++17)
    std::cout << ten << " -> " << sdt << std::endl;
}
```

> ⚠️ **Lỗi người mới hay gặp:** tra một khóa **không tồn tại**. Python ném lỗi `KeyError`; JavaScript `Map.get` trả về `undefined`; Java trả về `null`; Go trả về "giá trị rỗng" (chuỗi `""`, số `0`) một cách lặng lẽ — dễ gây nhầm. Luôn kiểm tra khóa tồn tại trước khi dùng, hoặc dùng cách lấy "có giá trị mặc định".

> 💡 **Ghi nhớ:** Khóa trong từ điển là **duy nhất** — gán lại cùng khóa sẽ **ghi đè** giá trị cũ (lưu số mới của Lan thì số cũ biến mất). Thứ tự các cặp nói chung **không quan trọng** (Go thậm chí duyệt theo thứ tự ngẫu nhiên có chủ đích).

## 4. Set — túi đựng không trùng lặp

**Set** (tập hợp) là một "chiếc túi" chứa các giá trị **không trùng nhau** và **không quan tâm thứ tự**. Giống danh sách khách mời đám cưới: mỗi người chỉ ghi tên một lần, ghi lần hai cũng vô nghĩa.

Dùng set khi câu hỏi của bạn là: *"Cái này đã có chưa?"*

```python
da_diem_danh = set()
da_diem_danh.add("Lan")
da_diem_danh.add("Minh")
da_diem_danh.add("Lan")          # thêm lần 2 — không có tác dụng
print(len(da_diem_danh))         # 2
print("Lan" in da_diem_danh)     # True
```
```javascript
const daDiemDanh = new Set();
daDiemDanh.add("Lan");
daDiemDanh.add("Minh");
daDiemDanh.add("Lan");           // thêm lần 2 — không có tác dụng
console.log(daDiemDanh.size);    // 2
console.log(daDiemDanh.has("Lan")); // true
```
```java
import java.util.HashSet;
import java.util.Set;

Set<String> daDiemDanh = new HashSet<>();
daDiemDanh.add("Lan");
daDiemDanh.add("Minh");
daDiemDanh.add("Lan");           // thêm lần 2 — không có tác dụng
System.out.println(daDiemDanh.size());          // 2
System.out.println(daDiemDanh.contains("Lan")); // true
```
```go
daDiemDanh := map[string]bool{}   // Go không có set sẵn, dùng map giả lập
daDiemDanh["Lan"] = true
daDiemDanh["Minh"] = true
daDiemDanh["Lan"] = true          // ghi đè — vẫn chỉ 1 "Lan"
fmt.Println(len(daDiemDanh))      // 2
fmt.Println(daDiemDanh["Lan"])    // true
```

```cpp
#include <set>
#include <string>

std::set<std::string> daDiemDanh;
daDiemDanh.insert("Lan");
daDiemDanh.insert("Minh");
daDiemDanh.insert("Lan");          // thêm lần 2 — không có tác dụng
std::cout << daDiemDanh.size() << std::endl;          // 2
std::cout << std::boolalpha
          << (daDiemDanh.count("Lan") > 0) << std::endl;  // true
```

Chú thích: Go không có kiểu set riêng — quy ước phổ biến là dùng `map[string]bool` (hoặc `map[string]struct{}` để tiết kiệm bộ nhớ hơn, nhưng người mới cứ dùng `bool` cho dễ hiểu).

## 5. Khi nào dùng gì?

| Câu hỏi của bạn | Cấu trúc nên dùng | Ví dụ đời thường |
|---|---|---|
| "Thứ tự quan trọng, tôi cần phần tử thứ N" | **List/Array** | Danh sách bài hát phát theo thứ tự |
| "Cho tôi tra X, trả về thông tin của X" | **Dictionary/Map** | Danh bạ điện thoại, bảng giá |
| "X đã xuất hiện chưa? Loại bỏ trùng lặp" | **Set** | Danh sách email đã gửi, khách đã điểm danh |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 290" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>So sánh ba cấu trúc: List, Dictionary và Set</title>
  <desc>Ba cột song song. List là dãy có thứ tự, cho phép trùng, hỏi phần tử thứ N. Dictionary là cặp khóa trỏ giá trị, hỏi tra X ra gì. Set là túi không trùng không thứ tự, hỏi X đã có chưa.</desc>
  <g>
    <rect x="16" y="20" width="216" height="252" rx="11" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="124" y="46" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">List</text>
    <text x="124" y="65" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">dãy CÓ THỨ TỰ, cho trùng</text>
    <rect x="40" y="82" width="48" height="40" rx="6" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="64" y="107" font-size="12" text-anchor="middle" fill="currentColor">8</text>
    <rect x="88" y="82" width="48" height="40" rx="6" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="112" y="107" font-size="12" text-anchor="middle" fill="currentColor">9</text>
    <rect x="136" y="82" width="48" height="40" rx="6" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="160" y="107" font-size="12" text-anchor="middle" fill="currentColor">8</text>
    <text x="64" y="138" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">0</text>
    <text x="112" y="138" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">1</text>
    <text x="160" y="138" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">2</text>
    <text x="124" y="166" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">(số 8 lặp lại — OK)</text>
    <line x1="40" y1="186" x2="208" y2="186" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="124" y="212" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.6">Câu hỏi đặc trưng:</text>
    <text x="124" y="240" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">"Phần tử</text>
    <text x="124" y="258" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">thứ N là gì?"</text>
  </g>
  <g>
    <rect x="252" y="20" width="216" height="252" rx="11" fill="#8b5cf6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="46" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Dictionary</text>
    <text x="360" y="65" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">cặp KHÓA → GIÁ TRỊ</text>
    <rect x="272" y="82" width="78" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="311" y="104" font-size="12" text-anchor="middle" fill="currentColor">"Lan"</text>
    <rect x="386" y="82" width="62" height="34" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="417" y="104" font-size="11" text-anchor="middle" fill="currentColor">090...</text>
    <line x1="350" y1="99" x2="382" y2="99" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#cmpArr)"/>
    <rect x="272" y="124" width="78" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="311" y="146" font-size="12" text-anchor="middle" fill="currentColor">"Minh"</text>
    <rect x="386" y="124" width="62" height="34" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="417" y="146" font-size="11" text-anchor="middle" fill="currentColor">090...</text>
    <line x1="350" y1="141" x2="382" y2="141" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#cmpArr)"/>
    <line x1="276" y1="186" x2="444" y2="186" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="360" y="212" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.6">Câu hỏi đặc trưng:</text>
    <text x="360" y="240" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">"Tra X ra</text>
    <text x="360" y="258" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">thông tin gì?"</text>
  </g>
  <g>
    <rect x="488" y="20" width="216" height="252" rx="11" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="596" y="46" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Set</text>
    <text x="596" y="65" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">túi KHÔNG TRÙNG, không thứ tự</text>
    <ellipse cx="596" cy="125" rx="92" ry="56" fill="#10b981" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="5 4"/>
    <text x="560" y="112" font-size="12" text-anchor="middle" fill="currentColor">"Lan"</text>
    <text x="630" y="135" font-size="12" text-anchor="middle" fill="currentColor">"Minh"</text>
    <text x="585" y="158" font-size="12" text-anchor="middle" fill="currentColor">"Hoa"</text>
    <text x="596" y="200" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">(thêm "Lan" lần 2 — bỏ qua)</text>
    <line x1="512" y1="186" x2="680" y2="186" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="596" y="212" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.6">Câu hỏi đặc trưng:</text>
    <text x="596" y="240" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">"X đã có</text>
    <text x="596" y="258" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">chưa?"</text>
  </g>
  <defs>
    <marker id="cmpArr" markerWidth="10" markerHeight="10" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
</svg>

Vài quy tắc ngón tay cái:

- Dữ liệu là **một dãy các thứ cùng loại, có trước có sau** → list.
- Dữ liệu là **cặp đôi "tên gọi → thông tin"** → dictionary.
- Chỉ cần biết **có hay không**, không cần thứ tự, không cần đếm số lần → set.
- Tra cứu trong dictionary/set **rất nhanh** dù chứa cả triệu phần tử; tìm một giá trị trong list thì phải duyệt từ đầu — chậm dần khi list lớn.

## 6. Bài mẫu: đếm tần suất từ

Bài toán kinh điển kết hợp mọi thứ vừa học: cho một câu, đếm **mỗi từ xuất hiện bao nhiêu lần**.

Ý tưởng (đọc kỹ trước khi xem code):

1. **Tách** câu thành danh sách các từ (split — cắt chuỗi theo dấu cách).
2. Tạo một **từ điển rỗng**: khóa là từ, giá trị là số lần xuất hiện.
3. **Duyệt** danh sách từ. Với mỗi từ: nếu đã có trong từ điển thì cộng 1; chưa có thì khởi tạo bằng 1.
4. In kết quả.

Giống như kiểm phiếu bầu: mỗi lá phiếu (từ) đọc lên, bạn gạch thêm một vạch cạnh tên ứng viên trên bảng (từ điển).

```python
cau = "mèo chó mèo cá chó mèo"
dem = {}
for tu in cau.split(" "):
    if tu in dem:
        dem[tu] = dem[tu] + 1
    else:
        dem[tu] = 1
for tu, so_lan in dem.items():
    print(tu, ":", so_lan)
# mèo : 3, chó : 2, cá : 1
```
```javascript
const cau = "mèo chó mèo cá chó mèo";
const dem = new Map();
for (const tu of cau.split(" ")) {
    if (dem.has(tu)) {
        dem.set(tu, dem.get(tu) + 1);
    } else {
        dem.set(tu, 1);
    }
}
for (const [tu, soLan] of dem) {
    console.log(tu, ":", soLan);
}
// mèo : 3, chó : 2, cá : 1
```
```java
import java.util.HashMap;
import java.util.Map;

public class Main {
    public static void main(String[] args) {
        String cau = "mèo chó mèo cá chó mèo";
        Map<String, Integer> dem = new HashMap<>();
        for (String tu : cau.split(" ")) {
            if (dem.containsKey(tu)) {
                dem.put(tu, dem.get(tu) + 1);
            } else {
                dem.put(tu, 1);
            }
        }
        for (Map.Entry<String, Integer> muc : dem.entrySet()) {
            System.out.println(muc.getKey() + " : " + muc.getValue());
        }
        // mèo : 3, chó : 2, cá : 1
    }
}
```
```go
package main

import (
    "fmt"
    "strings"
)

func main() {
    cau := "mèo chó mèo cá chó mèo"
    dem := map[string]int{}
    for _, tu := range strings.Split(cau, " ") {
        dem[tu] = dem[tu] + 1 // khóa chưa có thì dem[tu] mặc định là 0
    }
    for tu, soLan := range dem {
        fmt.Println(tu, ":", soLan)
    }
    // mèo : 3, chó : 2, cá : 1
}
```

```cpp
#include <iostream>
#include <map>
#include <string>
#include <sstream>

int main() {
    std::string cau = "mèo chó mèo cá chó mèo";
    std::map<std::string, int> dem;
    std::istringstream iss(cau);
    std::string tu;
    while (iss >> tu) {           // tách câu theo dấu cách
        dem[tu] = dem[tu] + 1;    // khóa chưa có thì dem[tu] mặc định là 0
    }
    for (const auto& [tu, soLan] : dem) {
        std::cout << tu << " : " << soLan << std::endl;
    }
    // mèo : 3, chó : 2, cá : 1
}
```

Chú thích thú vị: ở Go, tra khóa chưa tồn tại trả về `0` chứ không lỗi, nên bước "nếu chưa có thì khởi tạo bằng 1" được rút gọn thành một dòng `dem[tu] = dem[tu] + 1`. Python cũng có lối tắt tương tự với `dem.get(tu, 0) + 1`.

### Tự kiểm tra hiểu bài

Hãy thử trả lời (không chạy code) rồi mới kiểm chứng:

1. `["a", "b", "c"][1]` cho ra gì? (Gợi ý: index từ 0.)
2. Nếu chạy `dem["mèo"] = 99` sau khi đếm xong, từ điển còn nhớ "mèo : 3" không?
3. Cho danh sách `[3, 1, 3, 2, 3]`, đổ vào một set thì set chứa mấy phần tử?

Đáp án: (1) `"b"` — index 1 là phần tử thứ hai. (2) Không — gán lại cùng khóa sẽ ghi đè, giá trị mới là 99. (3) 3 phần tử: `{3, 1, 2}` — set loại bỏ trùng lặp.

## 7. Tóm tắt

- **List/Array**: dãy **có thứ tự**, cho phép trùng, truy cập bằng **index bắt đầu từ 0**, index cuối là N − 1.
- Thao tác cơ bản với list: **thêm vào cuối** (append/push/add), **xóa**, **duyệt** bằng vòng lặp.
- **Dictionary/Map**: cặp **khóa → giá trị**, khóa duy nhất, tra cứu cực nhanh; thêm/sửa bằng gán theo khóa, xóa theo khóa.
- **Set**: túi giá trị **không trùng lặp**, trả lời câu hỏi "đã có chưa?".
- Chọn cấu trúc theo **câu hỏi bạn cần trả lời**, không phải theo thói quen: thứ tự → list, tra cứu → dictionary, tồn tại/khử trùng → set.
- Bài đếm tần suất từ là khuôn mẫu "list + dictionary" mà bạn sẽ gặp lại suốt đời lập trình: duyệt một dãy, gom kết quả vào một bảng tra cứu.

> 💡 **Ghi nhớ cuối bài:** Gần như mọi chương trình thực tế đều xoay quanh hai động tác: **duyệt một danh sách** và **tra một từ điển**. Thành thạo hai thứ này, bạn đã nắm được trái tim của lập trình xử lý dữ liệu.
