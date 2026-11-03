# Rẽ nhánh & vòng lặp

Chào mừng bạn quay lại với khoá Lập trình nhập môn! Ở các bài trước, chương trình của chúng ta chạy theo một đường thẳng: từ trên xuống dưới, mỗi dòng chạy đúng một lần. Nhưng cuộc sống không thẳng tắp như vậy — và chương trình cũng thế.

Hôm nay bạn sẽ học hai "siêu năng lực" biến chương trình từ một tờ giấy ghi việc thành một trợ lý biết suy nghĩ:

- **Rẽ nhánh (branching)**: cho máy tính khả năng **quyết định** — "nếu trời mưa thì mang ô, nếu không thì thôi".
- **Vòng lặp (loop)**: cho máy tính khả năng **lặp lại** — "rửa từng cái bát cho đến khi hết chồng bát".

## 1. Rẽ nhánh với if / else — dạy máy tính ra quyết định

### 1.1. Hình dung đời thường

Hãy tưởng tượng bạn đứng trước ngã ba đường, trên cột có tấm biển:

> "NẾU bạn dưới 18 tuổi → rẽ trái (khu thiếu nhi). NGƯỢC LẠI → rẽ phải (khu người lớn)."

Đó chính xác là câu lệnh `if/else` (đọc là "íp/eo", nghĩa là "nếu/ngược lại"). Máy tính kiểm tra một **điều kiện (condition)** — một câu hỏi chỉ có thể trả lời **đúng (true)** hoặc **sai (false)** — rồi chọn đúng một nhánh để đi.

### 1.2. Cú pháp cơ bản

Ví dụ: kiểm tra một người có đủ tuổi bầu cử (18 tuổi) hay không.

```python
tuoi = 20

if tuoi >= 18:
    print("Bạn đủ tuổi bầu cử")
else:
    print("Bạn chưa đủ tuổi")
```
```javascript
let tuoi = 20;

if (tuoi >= 18) {
    console.log("Bạn đủ tuổi bầu cử");
} else {
    console.log("Bạn chưa đủ tuổi");
}
```
```java
int tuoi = 20;

if (tuoi >= 18) {
    System.out.println("Bạn đủ tuổi bầu cử");
} else {
    System.out.println("Bạn chưa đủ tuổi");
}
```
```go
tuoi := 20

if tuoi >= 18 {
    fmt.Println("Bạn đủ tuổi bầu cử")
} else {
    fmt.Println("Bạn chưa đủ tuổi")
}
```

```cpp
int tuoi = 20;

if (tuoi >= 18) {
    std::cout << "Bạn đủ tuổi bầu cử" << std::endl;
} else {
    std::cout << "Bạn chưa đủ tuổi" << std::endl;
}
```

Vài khác biệt nhỏ giữa các ngôn ngữ: Python dùng dấu hai chấm `:` và **thụt lề** để đánh dấu khối lệnh; JavaScript và Java bắt buộc có ngoặc tròn `( )` quanh điều kiện và ngoặc nhọn `{ }` quanh khối lệnh; Go dùng ngoặc nhọn nhưng **không** cần ngoặc tròn quanh điều kiện.

### 1.3. Nhiều hơn hai nhánh: else if

Đời không chỉ có hai lựa chọn. Ví dụ xếp loại điểm số:

```python
diem = 7.5

if diem >= 8:
    print("Giỏi")
elif diem >= 6.5:
    print("Khá")
elif diem >= 5:
    print("Trung bình")
else:
    print("Cần cố gắng")
```
```javascript
let diem = 7.5;

if (diem >= 8) {
    console.log("Giỏi");
} else if (diem >= 6.5) {
    console.log("Khá");
} else if (diem >= 5) {
    console.log("Trung bình");
} else {
    console.log("Cần cố gắng");
}
```
```java
double diem = 7.5;

if (diem >= 8) {
    System.out.println("Giỏi");
} else if (diem >= 6.5) {
    System.out.println("Khá");
} else if (diem >= 5) {
    System.out.println("Trung bình");
} else {
    System.out.println("Cần cố gắng");
}
```
```go
diem := 7.5

if diem >= 8 {
    fmt.Println("Giỏi")
} else if diem >= 6.5 {
    fmt.Println("Khá")
} else if diem >= 5 {
    fmt.Println("Trung bình")
} else {
    fmt.Println("Cần cố gắng")
}
```

```cpp
double diem = 7.5;

if (diem >= 8) {
    std::cout << "Giỏi" << std::endl;
} else if (diem >= 6.5) {
    std::cout << "Khá" << std::endl;
} else if (diem >= 5) {
    std::cout << "Trung bình" << std::endl;
} else {
    std::cout << "Cần cố gắng" << std::endl;
}
```

Lưu ý: Python viết gọn `elif`, ba ngôn ngữ còn lại viết đầy đủ `else if`.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 0 740 470" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Flowchart rẽ nhánh if/else và bậc thang xếp loại điểm</title>
  <desc>Bên trái: ô điều kiện hình thoi tuoi lớn hơn hoặc bằng 18 rẽ hai nhánh Đúng và Sai. Bên phải: chuỗi if/elif/else xếp loại điểm kiểm tra lần lượt từ trên xuống diem lớn hơn hoặc bằng 8 Giỏi, lớn hơn hoặc bằng 6.5 Khá, lớn hơn hoặc bằng 5 Trung bình, ngược lại Cần cố gắng, dừng ở nhánh đầu tiên đúng.</desc>
  <defs>
    <marker id="cfArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <text x="16" y="22" font-size="13.5" font-weight="700" fill="currentColor">if / else — chọn một trong hai nhánh</text>
  <ellipse cx="120" cy="52" rx="54" ry="17" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.35"/>
  <text x="120" y="56" font-size="11.5" text-anchor="middle" fill="currentColor">Bắt đầu</text>
  <line x1="120" y1="69" x2="120" y2="88" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#cfArr)"/>
  <polygon points="120,92 196,134 120,176 44,134" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="120" y="131" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">tuoi &gt;= 18 ?</text>
  <text x="120" y="148" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">điều kiện</text>
  <line x1="44" y1="134" x2="22" y2="134" stroke="currentColor" stroke-opacity="0.5"/>
  <line x1="22" y1="134" x2="22" y2="210" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#cfArr)"/>
  <text x="30" y="200" font-size="10.5" fill="#ef4444" opacity="0.95" font-weight="700">Sai</text>
  <line x1="196" y1="134" x2="218" y2="134" stroke="currentColor" stroke-opacity="0.5"/>
  <line x1="218" y1="134" x2="218" y2="210" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#cfArr)"/>
  <text x="200" y="200" font-size="10.5" fill="#10b981" opacity="0.95" font-weight="700">Đúng</text>
  <rect x="-12" y="214" width="68" height="40" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="22" y="238" font-size="10.5" text-anchor="middle" fill="currentColor">chưa đủ tuổi</text>
  <rect x="184" y="214" width="68" height="40" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="218" y="238" font-size="10.5" text-anchor="middle" fill="currentColor">đủ tuổi bầu cử</text>
  <text x="300" y="22" font-size="13.5" font-weight="700" fill="currentColor">if / elif / else — bậc thang xếp loại điểm</text>
  <text x="300" y="40" font-size="10.5" fill="currentColor" opacity="0.7">kiểm tra từ trên xuống, dừng ở nhánh ĐÚNG đầu tiên</text>
  <g>
    <polygon points="360,52 432,76 360,100 288,76" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="360" y="80" font-size="11" text-anchor="middle" fill="currentColor">diem &gt;= 8 ?</text>
    <line x1="432" y1="76" x2="556" y2="76" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#cfArr)"/>
    <text x="470" y="69" font-size="10" fill="#10b981" font-weight="700">Đúng</text>
    <rect x="560" y="60" width="140" height="32" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="630" y="80" font-size="11" text-anchor="middle" fill="currentColor">in "Giỏi" → dừng</text>
    <line x1="360" y1="100" x2="360" y2="124" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#cfArr)"/>
    <text x="368" y="116" font-size="10" fill="#ef4444" font-weight="700">Sai</text>
  </g>
  <g>
    <polygon points="360,128 432,152 360,176 288,152" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="360" y="156" font-size="11" text-anchor="middle" fill="currentColor">diem &gt;= 6.5 ?</text>
    <line x1="432" y1="152" x2="556" y2="152" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#cfArr)"/>
    <text x="470" y="145" font-size="10" fill="#10b981" font-weight="700">Đúng</text>
    <rect x="560" y="136" width="140" height="32" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="630" y="156" font-size="11" text-anchor="middle" fill="currentColor">in "Khá" → dừng</text>
    <line x1="360" y1="176" x2="360" y2="200" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#cfArr)"/>
    <text x="368" y="192" font-size="10" fill="#ef4444" font-weight="700">Sai</text>
  </g>
  <g>
    <polygon points="360,204 432,228 360,252 288,228" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="360" y="232" font-size="11" text-anchor="middle" fill="currentColor">diem &gt;= 5 ?</text>
    <line x1="432" y1="228" x2="556" y2="228" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#cfArr)"/>
    <text x="470" y="221" font-size="10" fill="#10b981" font-weight="700">Đúng</text>
    <rect x="560" y="212" width="140" height="32" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="630" y="232" font-size="11" text-anchor="middle" fill="currentColor">in "Trung bình" → dừng</text>
    <line x1="360" y1="252" x2="360" y2="276" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#cfArr)"/>
    <text x="368" y="268" font-size="10" fill="#ef4444" font-weight="700">Sai</text>
  </g>
  <rect x="290" y="280" width="140" height="34" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="301" font-size="11" text-anchor="middle" fill="currentColor">else: in "Cần cố gắng"</text>
</svg>

> **Ghi nhớ**: Máy tính kiểm tra các điều kiện **từ trên xuống dưới** và chỉ chạy **nhánh đầu tiên đúng**, rồi bỏ qua tất cả nhánh còn lại. Với điểm 7.5, máy thấy `7.5 >= 8` sai, sang `7.5 >= 6.5` đúng → in "Khá" và dừng, không xét tiếp.

## 2. So sánh và logic — ngôn ngữ của điều kiện

### 2.1. Toán tử so sánh (comparison operators)

Điều kiện được xây từ các **phép so sánh** — giống câu hỏi đúng/sai:

| Toán tử | Ý nghĩa | Ví dụ | Kết quả |
|---------|---------|-------|---------|
| `==` | bằng nhau | `5 == 5` | đúng |
| `!=` | khác nhau | `5 != 3` | đúng |
| `>` | lớn hơn | `3 > 5` | sai |
| `<` | nhỏ hơn | `3 < 5` | đúng |
| `>=` | lớn hơn hoặc bằng | `5 >= 5` | đúng |
| `<=` | nhỏ hơn hoặc bằng | `6 <= 5` | sai |

> **Lỗi người mới hay gặp**: Nhầm `=` với `==`. Một dấu bằng (`=`) là **gán giá trị** ("cho hộp `x` chứa số 5"), hai dấu bằng (`==`) là **hỏi xem có bằng nhau không**. Viết `if x = 5` thay vì `if x == 5` là lỗi kinh điển — đa số ngôn ngữ sẽ báo lỗi, nhưng đôi khi nó âm thầm chạy sai.

### 2.2. Toán tử logic: and / or / not — ghép nhiều điều kiện

Đôi khi quyết định phụ thuộc nhiều yếu tố cùng lúc, giống như điều kiện thuê xe: "phải đủ 18 tuổi **VÀ** có bằng lái".

| Phép logic | Đời thường | Đúng khi nào? |
|------------|-----------|----------------|
| **and** (và) | "đủ tuổi VÀ có bằng lái" | cả hai vế cùng đúng |
| **or** (hoặc) | "có thẻ sinh viên HOẶC thẻ người cao tuổi thì được giảm giá" | ít nhất một vế đúng |
| **not** (phủ định) | "KHÔNG mưa thì đi chơi" | đảo ngược đúng ↔ sai |

```python
tuoi = 25
co_bang_lai = True

if tuoi >= 18 and co_bang_lai:
    print("Được thuê xe")

if tuoi < 12 or tuoi >= 65:
    print("Được giảm giá vé")

if not co_bang_lai:
    print("Vui lòng thi bằng lái trước")
```
```javascript
let tuoi = 25;
let coBangLai = true;

if (tuoi >= 18 && coBangLai) {
    console.log("Được thuê xe");
}

if (tuoi < 12 || tuoi >= 65) {
    console.log("Được giảm giá vé");
}

if (!coBangLai) {
    console.log("Vui lòng thi bằng lái trước");
}
```
```java
int tuoi = 25;
boolean coBangLai = true;

if (tuoi >= 18 && coBangLai) {
    System.out.println("Được thuê xe");
}

if (tuoi < 12 || tuoi >= 65) {
    System.out.println("Được giảm giá vé");
}

if (!coBangLai) {
    System.out.println("Vui lòng thi bằng lái trước");
}
```
```go
tuoi := 25
coBangLai := true

if tuoi >= 18 && coBangLai {
    fmt.Println("Được thuê xe")
}

if tuoi < 12 || tuoi >= 65 {
    fmt.Println("Được giảm giá vé")
}

if !coBangLai {
    fmt.Println("Vui lòng thi bằng lái trước")
}
```

```cpp
int tuoi = 25;
bool coBangLai = true;

if (tuoi >= 18 && coBangLai) {
    std::cout << "Được thuê xe" << std::endl;
}

if (tuoi < 12 || tuoi >= 65) {
    std::cout << "Được giảm giá vé" << std::endl;
}

if (!coBangLai) {
    std::cout << "Vui lòng thi bằng lái trước" << std::endl;
}
```

Python dùng chữ tiếng Anh dễ đọc: `and`, `or`, `not`. JavaScript, Java và Go dùng ký hiệu: `&&` (và), `||` (hoặc), `!` (phủ định). Ý nghĩa hoàn toàn giống nhau.

> **Ghi nhớ**: `and` khó tính — chỉ cần một vế sai là cả câu sai. `or` dễ tính — chỉ cần một vế đúng là cả câu đúng.

## 3. Vòng lặp — dạy máy tính làm việc lặp đi lặp lại

Máy tính mạnh nhất ở chỗ: nó **không chán**. Bảo nó in 1 triệu dòng, nó làm trong nháy mắt, không một lời than thở. Công cụ để ra lệnh đó là **vòng lặp (loop)**.

Có hai loại chính, tương ứng hai kiểu công việc đời thường:

| Loại vòng lặp | Câu hỏi đời thường | Khi nào dùng |
|---------------|--------------------|--------------|
| **for** | "Chống đẩy đúng 20 cái" | **biết trước** số lần lặp |
| **while** | "Khuấy nồi súp **cho đến khi** sôi" | lặp **chừng nào điều kiện còn đúng**, không biết trước bao nhiêu lần |

### 3.1. Vòng lặp for — biết trước số lần

In các số từ 1 đến 5:

```python
for i in range(1, 6):  # range(1, 6) tạo dãy 1, 2, 3, 4, 5
    print(i)
```
```javascript
for (let i = 1; i <= 5; i++) {
    console.log(i);
}
```
```java
for (int i = 1; i <= 5; i++) {
    System.out.println(i);
}
```
```go
for i := 1; i <= 5; i++ {
    fmt.Println(i)
}
```

```cpp
for (int i = 1; i <= 5; i++) {
    std::cout << i << std::endl;
}
```

Giải phẫu vòng for "kiểu C" (JavaScript/Java/Go) gồm 3 phần, ngăn cách bởi dấu chấm phẩy:

1. `i := 1` — **khởi tạo**: đặt biến đếm bắt đầu từ 1 (biến `i` như cái máy đếm số lần).
2. `i <= 5` — **điều kiện**: còn đúng thì còn lặp tiếp.
3. `i++` — **bước nhảy**: sau mỗi vòng, tăng `i` thêm 1 (`i++` là viết tắt của `i = i + 1`).

Python đi đường khác: `range(1, 6)` tạo sẵn dãy số rồi `for` duyệt qua từng số. Chú ý `range(1, 6)` **không bao gồm số 6** — tính từ 1 đến *trước* 6.

<auto-anim data-dur="16">
<svg viewBox="0 0 520 400" role="img" aria-labelledby="pr02a-t pr02a-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="pr02a-t">Vòng for chạy từng bước: khởi tạo, điều kiện, thân, bước nhảy, lặp 5 vòng rồi thoát</title>
<desc id="pr02a-d">Sơ đồ khối của for: khởi tạo i bằng 1 chạy một lần, rồi kiểm tra điều kiện i nhỏ hơn hoặc bằng 5; đúng thì chạy thân print(i), rồi bước nhảy i = i + 1 và quay lại kiểm tra; sai thì thoát vòng lặp. Khối đang chạy được tô sáng, ô bên phải cho thấy giá trị i và phép so sánh, màn hình in dần 1, 2, 3, 4, 5. Khi i bằng 6, điều kiện 6 &lt;= 5 sai nên thoát. Dải dưới cùng chia thời gian thành vòng 1 đến vòng 5.</desc>
<defs><marker id="pr02a-m" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker></defs>
<rect x="20" y="16" width="170" height="48" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
<polygon points="105,92 190,134 105,176 20,134" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
<rect x="236" y="110" width="160" height="48" rx="9" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<rect x="236" y="196" width="160" height="48" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<rect x="20" y="240" width="170" height="44" rx="9" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3"/>
<rect x="20" y="16" width="170" height="48" rx="9" fill="#8b5cf6" fill-opacity="0" stroke="#f59e0b" stroke-width="4" opacity="1"><animate attributeName="opacity" dur="16.0s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0500;0.1000;0.1500;0.2000;0.2500;0.3000;0.3500;0.4000;0.4500;0.5000;0.5500;0.6000;0.6500;0.7000;0.7500;0.8000;0.8500;0.9000;0.9500;1" values="1;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0"/></rect>
<polygon points="105,92 190,134 105,176 20,134" fill="#3b82f6" fill-opacity="0" stroke="#f59e0b" stroke-width="4" opacity="0"><animate attributeName="opacity" dur="16.0s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0500;0.1000;0.1500;0.2000;0.2500;0.3000;0.3500;0.4000;0.4500;0.5000;0.5500;0.6000;0.6500;0.7000;0.7500;0.8000;0.8500;0.9000;0.9500;1" values="0;1;0;0;1;0;0;1;0;0;1;0;0;1;0;0;1;0;0;0;0"/></polygon>
<rect x="236" y="110" width="160" height="48" rx="9" fill="#10b981" fill-opacity="0" stroke="#f59e0b" stroke-width="4" opacity="0"><animate attributeName="opacity" dur="16.0s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0500;0.1000;0.1500;0.2000;0.2500;0.3000;0.3500;0.4000;0.4500;0.5000;0.5500;0.6000;0.6500;0.7000;0.7500;0.8000;0.8500;0.9000;0.9500;1" values="0;0;1;0;0;1;0;0;1;0;0;1;0;0;1;0;0;0;0;0;0"/></rect>
<rect x="236" y="196" width="160" height="48" rx="9" fill="#f59e0b" fill-opacity="0" stroke="#f59e0b" stroke-width="4" opacity="0"><animate attributeName="opacity" dur="16.0s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0500;0.1000;0.1500;0.2000;0.2500;0.3000;0.3500;0.4000;0.4500;0.5000;0.5500;0.6000;0.6500;0.7000;0.7500;0.8000;0.8500;0.9000;0.9500;1" values="0;0;0;1;0;0;1;0;0;1;0;0;1;0;0;1;0;0;0;0;0"/></rect>
<rect x="20" y="240" width="170" height="44" rx="9" fill="currentColor" fill-opacity="0" stroke="#f59e0b" stroke-width="4" opacity="0"><animate attributeName="opacity" dur="16.0s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0500;0.1000;0.1500;0.2000;0.2500;0.3000;0.3500;0.4000;0.4500;0.5000;0.5500;0.6000;0.6500;0.7000;0.7500;0.8000;0.8500;0.9000;0.9500;1" values="0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;1;1;1;1"/></rect>
<text x="105" y="36" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">1. Khởi tạo</text>
<text x="105" y="55" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.8">i = 1 (chỉ một lần)</text>
<text x="105" y="131" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">2. Điều kiện</text>
<text x="105" y="149" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.85">i &lt;= 5 ?</text>
<text x="316" y="130" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">Thân vòng lặp</text>
<text x="316" y="149" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.8">print(i)</text>
<text x="316" y="216" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">3. Bước nhảy</text>
<text x="316" y="235" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.8">i = i + 1 (i++)</text>
<text x="105" y="267" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">Thoát vòng lặp</text>
<line x1="105" y1="64" x2="105" y2="89" stroke="currentColor" stroke-opacity="0.55" stroke-width="1.6" marker-end="url(#pr02a-m)"/>
<line x1="190" y1="134" x2="233" y2="134" stroke="currentColor" stroke-opacity="0.55" stroke-width="1.6" marker-end="url(#pr02a-m)"/>
<text x="212" y="125" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor" fill-opacity="1" style="fill:#10b981">Đúng</text>
<line x1="316" y1="158" x2="316" y2="193" stroke="currentColor" stroke-opacity="0.55" stroke-width="1.6" marker-end="url(#pr02a-m)"/>
<path d="M236 220 H160 V164" fill="none" stroke="currentColor" stroke-opacity="0.55" stroke-width="1.6" marker-end="url(#pr02a-m)"/>
<text x="198" y="214" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.75">quay lại</text>
<line x1="105" y1="176" x2="105" y2="237" stroke="currentColor" stroke-opacity="0.55" stroke-width="1.6" marker-end="url(#pr02a-m)"/>
<text x="88" y="214" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor" style="fill:#f43f5e">Sai</text>
<rect x="420" y="16" width="90" height="48" rx="9" fill="#8b5cf6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.3"/>
<rect x="420" y="92" width="90" height="84" rx="9" fill="#3b82f6" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.3"/>
<text x="465" y="112" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.7">so sánh</text>
<text x="465" y="47" text-anchor="middle" font-size="18" font-weight="700" fill="currentColor" opacity="1">i = 1<animate attributeName="opacity" dur="16.0s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0500;0.1000;0.1500;0.2000;0.2500;0.3000;0.3500;0.4000;0.4500;0.5000;0.5500;0.6000;0.6500;0.7000;0.7500;0.8000;0.8500;0.9000;0.9500;1" values="1;1;1;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0"/></text>
<text x="465" y="47" text-anchor="middle" font-size="18" font-weight="700" fill="currentColor" opacity="0">i = 2<animate attributeName="opacity" dur="16.0s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0500;0.1000;0.1500;0.2000;0.2500;0.3000;0.3500;0.4000;0.4500;0.5000;0.5500;0.6000;0.6500;0.7000;0.7500;0.8000;0.8500;0.9000;0.9500;1" values="0;0;0;1;1;1;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0"/></text>
<text x="465" y="47" text-anchor="middle" font-size="18" font-weight="700" fill="currentColor" opacity="0">i = 3<animate attributeName="opacity" dur="16.0s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0500;0.1000;0.1500;0.2000;0.2500;0.3000;0.3500;0.4000;0.4500;0.5000;0.5500;0.6000;0.6500;0.7000;0.7500;0.8000;0.8500;0.9000;0.9500;1" values="0;0;0;0;0;0;1;1;1;0;0;0;0;0;0;0;0;0;0;0;0"/></text>
<text x="465" y="47" text-anchor="middle" font-size="18" font-weight="700" fill="currentColor" opacity="0">i = 4<animate attributeName="opacity" dur="16.0s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0500;0.1000;0.1500;0.2000;0.2500;0.3000;0.3500;0.4000;0.4500;0.5000;0.5500;0.6000;0.6500;0.7000;0.7500;0.8000;0.8500;0.9000;0.9500;1" values="0;0;0;0;0;0;0;0;0;1;1;1;0;0;0;0;0;0;0;0;0"/></text>
<text x="465" y="47" text-anchor="middle" font-size="18" font-weight="700" fill="currentColor" opacity="0">i = 5<animate attributeName="opacity" dur="16.0s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0500;0.1000;0.1500;0.2000;0.2500;0.3000;0.3500;0.4000;0.4500;0.5000;0.5500;0.6000;0.6500;0.7000;0.7500;0.8000;0.8500;0.9000;0.9500;1" values="0;0;0;0;0;0;0;0;0;0;0;0;1;1;1;0;0;0;0;0;0"/></text>
<text x="465" y="47" text-anchor="middle" font-size="18" font-weight="700" fill="currentColor" opacity="0">i = 6<animate attributeName="opacity" dur="16.0s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0500;0.1000;0.1500;0.2000;0.2500;0.3000;0.3500;0.4000;0.4500;0.5000;0.5500;0.6000;0.6500;0.7000;0.7500;0.8000;0.8500;0.9000;0.9500;1" values="0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;1;1;1;1;1;1"/></text>
<g opacity="0"><animate attributeName="opacity" dur="16.0s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0500;0.1000;0.1500;0.2000;0.2500;0.3000;0.3500;0.4000;0.4500;0.5000;0.5500;0.6000;0.6500;0.7000;0.7500;0.8000;0.8500;0.9000;0.9500;1" values="0;1;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0"/><text x="465" y="140" text-anchor="middle" font-size="16" font-weight="700" fill="currentColor">1 &lt;= 5</text><text x="465" y="163" text-anchor="middle" font-size="14" font-weight="700" fill="#10b981">Đúng</text></g>
<g opacity="0"><animate attributeName="opacity" dur="16.0s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0500;0.1000;0.1500;0.2000;0.2500;0.3000;0.3500;0.4000;0.4500;0.5000;0.5500;0.6000;0.6500;0.7000;0.7500;0.8000;0.8500;0.9000;0.9500;1" values="0;0;0;0;1;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0"/><text x="465" y="140" text-anchor="middle" font-size="16" font-weight="700" fill="currentColor">2 &lt;= 5</text><text x="465" y="163" text-anchor="middle" font-size="14" font-weight="700" fill="#10b981">Đúng</text></g>
<g opacity="0"><animate attributeName="opacity" dur="16.0s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0500;0.1000;0.1500;0.2000;0.2500;0.3000;0.3500;0.4000;0.4500;0.5000;0.5500;0.6000;0.6500;0.7000;0.7500;0.8000;0.8500;0.9000;0.9500;1" values="0;0;0;0;0;0;0;1;0;0;0;0;0;0;0;0;0;0;0;0;0"/><text x="465" y="140" text-anchor="middle" font-size="16" font-weight="700" fill="currentColor">3 &lt;= 5</text><text x="465" y="163" text-anchor="middle" font-size="14" font-weight="700" fill="#10b981">Đúng</text></g>
<g opacity="0"><animate attributeName="opacity" dur="16.0s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0500;0.1000;0.1500;0.2000;0.2500;0.3000;0.3500;0.4000;0.4500;0.5000;0.5500;0.6000;0.6500;0.7000;0.7500;0.8000;0.8500;0.9000;0.9500;1" values="0;0;0;0;0;0;0;0;0;0;1;0;0;0;0;0;0;0;0;0;0"/><text x="465" y="140" text-anchor="middle" font-size="16" font-weight="700" fill="currentColor">4 &lt;= 5</text><text x="465" y="163" text-anchor="middle" font-size="14" font-weight="700" fill="#10b981">Đúng</text></g>
<g opacity="0"><animate attributeName="opacity" dur="16.0s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0500;0.1000;0.1500;0.2000;0.2500;0.3000;0.3500;0.4000;0.4500;0.5000;0.5500;0.6000;0.6500;0.7000;0.7500;0.8000;0.8500;0.9000;0.9500;1" values="0;0;0;0;0;0;0;0;0;0;0;0;0;1;0;0;0;0;0;0;0"/><text x="465" y="140" text-anchor="middle" font-size="16" font-weight="700" fill="currentColor">5 &lt;= 5</text><text x="465" y="163" text-anchor="middle" font-size="14" font-weight="700" fill="#10b981">Đúng</text></g>
<g opacity="0"><animate attributeName="opacity" dur="16.0s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0500;0.1000;0.1500;0.2000;0.2500;0.3000;0.3500;0.4000;0.4500;0.5000;0.5500;0.6000;0.6500;0.7000;0.7500;0.8000;0.8500;0.9000;0.9500;1" values="0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;1;0;0;0;0"/><text x="465" y="140" text-anchor="middle" font-size="16" font-weight="700" fill="currentColor">6 &lt;= 5</text><text x="465" y="163" text-anchor="middle" font-size="14" font-weight="700" fill="#f43f5e">Sai</text></g>
<rect x="236" y="262" width="274" height="44" rx="9" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.3"/>
<text x="246" y="289" text-anchor="start" font-size="13" fill="currentColor" opacity="0.75">Màn hình:</text>
<text x="336" y="291" text-anchor="middle" font-size="17" font-weight="700" fill="currentColor" opacity="0">1<animate attributeName="opacity" dur="16.0s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0500;0.1000;0.1500;0.2000;0.2500;0.3000;0.3500;0.4000;0.4500;0.5000;0.5500;0.6000;0.6500;0.7000;0.7500;0.8000;0.8500;0.9000;0.9500;1" values="0;0;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1"/></text>
<text x="372" y="291" text-anchor="middle" font-size="17" font-weight="700" fill="currentColor" opacity="0">2<animate attributeName="opacity" dur="16.0s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0500;0.1000;0.1500;0.2000;0.2500;0.3000;0.3500;0.4000;0.4500;0.5000;0.5500;0.6000;0.6500;0.7000;0.7500;0.8000;0.8500;0.9000;0.9500;1" values="0;0;0;0;0;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1"/></text>
<text x="408" y="291" text-anchor="middle" font-size="17" font-weight="700" fill="currentColor" opacity="0">3<animate attributeName="opacity" dur="16.0s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0500;0.1000;0.1500;0.2000;0.2500;0.3000;0.3500;0.4000;0.4500;0.5000;0.5500;0.6000;0.6500;0.7000;0.7500;0.8000;0.8500;0.9000;0.9500;1" values="0;0;0;0;0;0;0;0;1;1;1;1;1;1;1;1;1;1;1;1;1"/></text>
<text x="444" y="291" text-anchor="middle" font-size="17" font-weight="700" fill="currentColor" opacity="0">4<animate attributeName="opacity" dur="16.0s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0500;0.1000;0.1500;0.2000;0.2500;0.3000;0.3500;0.4000;0.4500;0.5000;0.5500;0.6000;0.6500;0.7000;0.7500;0.8000;0.8500;0.9000;0.9500;1" values="0;0;0;0;0;0;0;0;0;0;0;1;1;1;1;1;1;1;1;1;1"/></text>
<text x="480" y="291" text-anchor="middle" font-size="17" font-weight="700" fill="currentColor" opacity="0">5<animate attributeName="opacity" dur="16.0s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0500;0.1000;0.1500;0.2000;0.2500;0.3000;0.3500;0.4000;0.4500;0.5000;0.5500;0.6000;0.6500;0.7000;0.7500;0.8000;0.8500;0.9000;0.9500;1" values="0;0;0;0;0;0;0;0;0;0;0;0;0;0;1;1;1;1;1;1;1"/></text>
<text x="20" y="334" text-anchor="start" font-size="13" fill="currentColor" opacity="0.7">thời gian</text>
<rect x="21.0" y="346" width="22.0" height="14" rx="3" fill="#8b5cf6" fill-opacity="0.3"/>
<rect x="45.0" y="346" width="70.0" height="14" rx="3" fill="#3b82f6" fill-opacity="0.3"/>
<text x="80.0" y="380" text-anchor="middle" font-size="13" fill="currentColor">vòng 1</text>
<rect x="117.0" y="346" width="70.0" height="14" rx="3" fill="#10b981" fill-opacity="0.3"/>
<text x="152.0" y="380" text-anchor="middle" font-size="13" fill="currentColor">vòng 2</text>
<rect x="189.0" y="346" width="70.0" height="14" rx="3" fill="#3b82f6" fill-opacity="0.3"/>
<text x="224.0" y="380" text-anchor="middle" font-size="13" fill="currentColor">vòng 3</text>
<rect x="261.0" y="346" width="70.0" height="14" rx="3" fill="#10b981" fill-opacity="0.3"/>
<text x="296.0" y="380" text-anchor="middle" font-size="13" fill="currentColor">vòng 4</text>
<rect x="333.0" y="346" width="70.0" height="14" rx="3" fill="#3b82f6" fill-opacity="0.3"/>
<text x="368.0" y="380" text-anchor="middle" font-size="13" fill="currentColor">vòng 5</text>
<rect x="405.0" y="346" width="94.0" height="14" rx="3" fill="#64748b" fill-opacity="0.3"/>
<text x="452.0" y="380" text-anchor="middle" font-size="13" fill="currentColor">thoát</text>
<rect x="20" y="340" width="3" height="26" fill="#f59e0b"><animate attributeName="x" dur="16.0s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0500;0.1000;0.1500;0.2000;0.2500;0.3000;0.3500;0.4000;0.4500;0.5000;0.5500;0.6000;0.6500;0.7000;0.7500;0.8000;0.8500;0.9000;0.9500;1" values="20.0;44.0;68.0;92.0;116.0;140.0;164.0;188.0;212.0;236.0;260.0;284.0;308.0;332.0;356.0;380.0;404.0;428.0;452.0;476.0;476.0"/></rect>
</svg>
</auto-anim>

### 3.2. Vòng lặp while — lặp đến khi điều kiện sai

`while` (nghĩa là "trong khi") giống việc khuấy nồi súp: bạn không biết trước cần khuấy bao nhiêu lần, chỉ biết "trong khi súp chưa sôi thì còn khuấy".

Ví dụ: một số tiền 100 nghìn, mỗi ngày tiêu 30 nghìn, hỏi tiêu được mấy ngày?

```python
tien = 100
ngay = 0

while tien >= 30:
    tien = tien - 30
    ngay = ngay + 1

print("Tiêu được", ngay, "ngày, còn dư", tien)
```
```javascript
let tien = 100;
let ngay = 0;

while (tien >= 30) {
    tien = tien - 30;
    ngay = ngay + 1;
}

console.log("Tiêu được", ngay, "ngày, còn dư", tien);
```
```java
int tien = 100;
int ngay = 0;

while (tien >= 30) {
    tien = tien - 30;
    ngay = ngay + 1;
}

System.out.println("Tiêu được " + ngay + " ngày, còn dư " + tien);
```
```go
tien := 100
ngay := 0

for tien >= 30 { // Go không có từ khoá while, dùng for với một điều kiện
    tien = tien - 30
    ngay = ngay + 1
}

fmt.Println("Tiêu được", ngay, "ngày, còn dư", tien)
```

```cpp
int tien = 100;
int ngay = 0;

while (tien >= 30) {
    tien = tien - 30;
    ngay = ngay + 1;
}

std::cout << "Tiêu được " << ngay << " ngày, còn dư " << tien << std::endl;
```

Điểm thú vị: Go **không có** từ khoá `while` — vòng `for` chỉ ghi mỗi điều kiện chính là "while phiên bản Go".

> **Lỗi người mới hay gặp — VÒNG LẶP VÔ HẠN (infinite loop)**: Nếu trong thân vòng `while` bạn **quên thay đổi** thứ liên quan đến điều kiện (ví dụ quên dòng `tien = tien - 30`), điều kiện mãi mãi đúng → chương trình lặp **vĩnh viễn**, treo máy hoặc ngốn CPU. Quy tắc an toàn: mỗi khi viết `while`, tự hỏi ngay *"điều gì trong thân vòng sẽ khiến điều kiện này sai vào một lúc nào đó?"*. Nếu lỡ dính vòng vô hạn, nhấn `Ctrl + C` trong cửa sổ dòng lệnh để ngắt chương trình.

Cùng đoạn code trên chạy hai lần: bản trên đầy đủ, bản dưới quên dòng `tien = tien - 30`.

<auto-anim data-dur="10.8">
<svg viewBox="0 0 520 362" role="img" aria-labelledby="pr02b-t pr02b-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="pr02b-t">while tien &gt;= 30: có trừ tiền thì dừng sau 3 ngày, quên trừ tiền thì lặp mãi</title>
<desc id="pr02b-d">Hai bản chạy song song trên cùng trục thời gian. Bản trên có dòng tien = tien - 30: thanh tiền ngắn dần 100, 70, 40, 10; khi còn 10, điều kiện 10 &gt;= 30 sai nên dừng, in Tiêu được 3 ngày, còn dư 10. Bản dưới quên dòng trừ tiền: thanh tiền đứng yên ở 100, điều kiện luôn đúng, số ngày cứ tăng mãi, chỉ dừng khi bấm Ctrl + C.</desc>
<rect x="8" y="10" width="504" height="138" rx="10" fill="#10b981" fill-opacity="0.06" stroke="#10b981" stroke-opacity="0.4"/>
<text x="20" y="34" font-size="14" font-weight="700" fill="currentColor">Có dòng tien = tien - 30</text>
<rect x="20" y="50" width="340.0" height="26" rx="4" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.2"/>
<rect x="20" y="50" height="26" rx="4" fill="#f59e0b" fill-opacity="0.45" width="340.0"><animate attributeName="width" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="340.0;238.0;238.0;136.0;136.0;34.0;34.0;34.0;34.0;34.0;34.0;34.0;34.0"/></rect>
<line x1="122.0" y1="44" x2="122.0" y2="82" stroke="#f43f5e" stroke-width="2" stroke-dasharray="4 3"/>
<text x="122.0" y="98" text-anchor="middle" font-size="13" fill="#f43f5e" font-weight="700">30</text>
<text x="372.0" y="69" font-size="14" font-weight="700" fill="currentColor" opacity="0">tien = 10<animate attributeName="opacity" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="0;0;0;0;0;1;1;1;1;1;1;1;1"/></text>
<text x="372.0" y="69" font-size="14" font-weight="700" fill="currentColor" opacity="0">tien = 40<animate attributeName="opacity" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="0;0;0;1;1;0;0;0;0;0;0;0;0"/></text>
<text x="372.0" y="69" font-size="14" font-weight="700" fill="currentColor" opacity="0">tien = 70<animate attributeName="opacity" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="0;1;1;0;0;0;0;0;0;0;0;0;0"/></text>
<text x="372.0" y="69" font-size="14" font-weight="700" fill="currentColor" opacity="1">tien = 100<animate attributeName="opacity" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="1;0;0;0;0;0;0;0;0;0;0;0;0"/></text>
<text x="20" y="122" font-size="14" font-weight="700" fill="currentColor" opacity="1">ngay = 0<animate attributeName="opacity" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="1;0;0;0;0;0;0;0;0;0;0;0;0"/></text>
<text x="20" y="122" font-size="14" font-weight="700" fill="currentColor" opacity="0">ngay = 1<animate attributeName="opacity" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="0;1;1;0;0;0;0;0;0;0;0;0;0"/></text>
<text x="20" y="122" font-size="14" font-weight="700" fill="currentColor" opacity="0">ngay = 2<animate attributeName="opacity" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="0;0;0;1;1;0;0;0;0;0;0;0;0"/></text>
<text x="20" y="122" font-size="14" font-weight="700" fill="currentColor" opacity="0">ngay = 3<animate attributeName="opacity" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="0;0;0;0;0;1;1;1;1;1;1;1;1"/></text>
<text x="130" y="122" font-size="14" fill="currentColor" opacity="1">100 &gt;= 30 đúng: lặp tiếp<animate attributeName="opacity" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="1;0;0;0;0;0;0;0;0;0;0;0;0"/></text>
<text x="130" y="122" font-size="14" fill="currentColor" opacity="0">chạy thân vòng lặp<animate attributeName="opacity" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="0;1;0;1;0;1;0;0;0;0;0;0;0"/></text>
<text x="130" y="122" font-size="14" fill="currentColor" opacity="0">70 &gt;= 30 đúng: lặp tiếp<animate attributeName="opacity" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="0;0;1;0;0;0;0;0;0;0;0;0;0"/></text>
<text x="130" y="122" font-size="14" fill="currentColor" opacity="0">40 &gt;= 30 đúng: lặp tiếp<animate attributeName="opacity" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="0;0;0;0;1;0;0;0;0;0;0;0;0"/></text>
<text x="130" y="122" font-size="14" fill="#f43f5e" opacity="0">10 &gt;= 30 sai: dừng<animate attributeName="opacity" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="0;0;0;0;0;0;1;1;1;1;1;1;1"/></text>
<rect x="8" y="158" width="504" height="138" rx="10" fill="#f43f5e" fill-opacity="0.06" stroke="#f43f5e" stroke-opacity="0.4"/>
<text x="20" y="182" font-size="14" font-weight="700" fill="currentColor">Quên dòng trừ tiền</text>
<rect x="20" y="198" width="340.0" height="26" rx="4" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.2"/>
<rect x="20" y="198" height="26" rx="4" fill="#f59e0b" fill-opacity="0.45" width="340.0"><animate attributeName="width" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="340.0;340.0;340.0;340.0;340.0;340.0;340.0;340.0;340.0;340.0;340.0;340.0;340.0"/></rect>
<line x1="122.0" y1="192" x2="122.0" y2="230" stroke="#f43f5e" stroke-width="2" stroke-dasharray="4 3"/>
<text x="122.0" y="246" text-anchor="middle" font-size="13" fill="#f43f5e" font-weight="700">30</text>
<text x="372.0" y="217" font-size="14" font-weight="700" fill="currentColor" opacity="1">tien = 100<animate attributeName="opacity" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="1;1;1;1;1;1;1;1;1;1;1;1;1"/></text>
<text x="20" y="270" font-size="14" font-weight="700" fill="currentColor" opacity="1">ngay = 0<animate attributeName="opacity" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="1;0;0;0;0;0;0;0;0;0;0;0;0"/></text>
<text x="20" y="270" font-size="14" font-weight="700" fill="currentColor" opacity="0">ngay = 1<animate attributeName="opacity" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="0;1;1;0;0;0;0;0;0;0;0;0;0"/></text>
<text x="20" y="270" font-size="14" font-weight="700" fill="currentColor" opacity="0">ngay = 2<animate attributeName="opacity" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="0;0;0;1;1;0;0;0;0;0;0;0;0"/></text>
<text x="20" y="270" font-size="14" font-weight="700" fill="currentColor" opacity="0">ngay = 3<animate attributeName="opacity" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="0;0;0;0;0;1;1;0;0;0;0;0;0"/></text>
<text x="20" y="270" font-size="14" font-weight="700" fill="currentColor" opacity="0">ngay = 4<animate attributeName="opacity" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="0;0;0;0;0;0;0;1;1;0;0;0;0"/></text>
<text x="20" y="270" font-size="14" font-weight="700" fill="currentColor" opacity="0">ngay = 5<animate attributeName="opacity" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="0;0;0;0;0;0;0;0;0;1;1;0;0"/></text>
<text x="20" y="270" font-size="14" font-weight="700" fill="currentColor" opacity="0">ngay = 6<animate attributeName="opacity" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="0;0;0;0;0;0;0;0;0;0;0;1;1"/></text>
<text x="130" y="270" font-size="14" fill="currentColor" opacity="1">100 &gt;= 30 đúng: lặp tiếp<animate attributeName="opacity" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="1;0;1;0;1;0;1;0;1;0;1;0;0"/></text>
<text x="130" y="270" font-size="14" fill="currentColor" opacity="0">chạy thân vòng lặp<animate attributeName="opacity" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="0;1;0;1;0;1;0;1;0;1;0;1;1"/></text>
<text x="500" y="34" text-anchor="end" font-size="13" font-weight="700" fill="#10b981" opacity="0">✓ 3 ngày, dư 10<animate attributeName="opacity" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="0;0;0;0;0;0;1;1;1;1;1;1;1"/></text>
<text x="500" y="182" text-anchor="end" font-size="13" font-weight="700" fill="#f43f5e" opacity="0">✗ vô hạn: Ctrl + C<animate attributeName="opacity" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="0;0;0;0;0;0;0;1;1;1;1;1;1"/></text>
<text x="20" y="310" font-size="13" fill="currentColor" opacity="0.7">thời gian (mỗi ô: một lần kiểm tra hoặc một lần chạy thân)</text>
<rect x="21.0" y="320" width="38.0" height="14" rx="3" fill="#3b82f6" fill-opacity="0.3"/>
<rect x="61.0" y="320" width="38.0" height="14" rx="3" fill="#f59e0b" fill-opacity="0.3"/>
<rect x="101.0" y="320" width="38.0" height="14" rx="3" fill="#3b82f6" fill-opacity="0.3"/>
<rect x="141.0" y="320" width="38.0" height="14" rx="3" fill="#f59e0b" fill-opacity="0.3"/>
<rect x="181.0" y="320" width="38.0" height="14" rx="3" fill="#3b82f6" fill-opacity="0.3"/>
<rect x="221.0" y="320" width="38.0" height="14" rx="3" fill="#f59e0b" fill-opacity="0.3"/>
<rect x="261.0" y="320" width="38.0" height="14" rx="3" fill="#3b82f6" fill-opacity="0.3"/>
<rect x="301.0" y="320" width="38.0" height="14" rx="3" fill="#f59e0b" fill-opacity="0.3"/>
<rect x="341.0" y="320" width="38.0" height="14" rx="3" fill="#3b82f6" fill-opacity="0.3"/>
<rect x="381.0" y="320" width="38.0" height="14" rx="3" fill="#f59e0b" fill-opacity="0.3"/>
<rect x="421.0" y="320" width="38.0" height="14" rx="3" fill="#3b82f6" fill-opacity="0.3"/>
<rect x="461.0" y="320" width="38.0" height="14" rx="3" fill="#f59e0b" fill-opacity="0.3"/>
<rect x="20" y="342" width="12" height="12" rx="2" fill="#3b82f6" fill-opacity="0.3"/>
<text x="38" y="353" font-size="13" fill="currentColor">kiểm tra điều kiện</text>
<rect x="190" y="342" width="12" height="12" rx="2" fill="#f59e0b" fill-opacity="0.3"/>
<text x="208" y="353" font-size="13" fill="currentColor">chạy thân</text>
<rect x="20" y="315" width="3" height="24" fill="#f59e0b"><animate attributeName="x" dur="10.8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0000;0.0833;0.1667;0.2500;0.3333;0.4167;0.5000;0.5833;0.6667;0.7500;0.8333;0.9167;1" values="20.0;60.0;100.0;140.0;180.0;220.0;260.0;300.0;340.0;380.0;420.0;460.0;460.0"/></rect>
</svg>
</auto-anim>

## 4. break và continue — hai nút điều khiển khẩn cấp

Đang lặp giữa chừng, đôi khi bạn muốn:

- **break** ("bẻ gãy"): **thoát hẳn** vòng lặp ngay lập tức. Như đang tìm chìa khoá trong từng túi áo — tìm thấy rồi thì dừng luôn, không cần lục túi còn lại.
- **continue** ("tiếp tục"): **bỏ qua phần còn lại của lượt này**, nhảy ngay sang lượt kế tiếp. Như đang phát quà cho từng người trong hàng — gặp người đã có quà thì bỏ qua, sang người tiếp theo.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>break và continue trên cùng một vòng lặp</title>
  <desc>Một vòng lặp với các bước đầu vòng, lệnh continue và lệnh break trong thân. continue nhảy về đầu vòng để sang lượt tiếp theo, bỏ phần còn lại của lượt. break nhảy ra ngoài vòng lặp, kết thúc hẳn.</desc>
  <defs>
    <marker id="bcArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <text x="16" y="22" font-size="13.5" font-weight="700" fill="currentColor">break vs continue — hai kiểu nhảy trong vòng lặp</text>
  <rect x="150" y="44" width="300" height="232" rx="14" fill="#3b82f6" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.22" stroke-dasharray="6 4"/>
  <text x="166" y="64" font-size="11" fill="currentColor" opacity="0.7">vòng lặp for / while</text>
  <rect x="190" y="76" width="220" height="34" rx="8" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="300" y="97" font-size="11.5" text-anchor="middle" fill="currentColor">đầu vòng (kiểm tra điều kiện)</text>
  <line x1="300" y1="110" x2="300" y2="132" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#bcArr)"/>
  <rect x="190" y="136" width="220" height="34" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="300" y="157" font-size="11.5" text-anchor="middle" fill="currentColor">if số chẵn → continue</text>
  <line x1="300" y1="170" x2="300" y2="192" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#bcArr)"/>
  <rect x="190" y="196" width="220" height="34" rx="8" fill="#ef4444" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="300" y="217" font-size="11.5" text-anchor="middle" fill="currentColor">if i == 9 → break</text>
  <line x1="300" y1="230" x2="300" y2="252" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#bcArr)"/>
  <rect x="210" y="252" width="180" height="20" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="300" y="266" font-size="11" text-anchor="middle" fill="currentColor">phần còn lại: print(i)</text>
  <path d="M190 153 H110 V93 H186" fill="none" stroke="#f59e0b" stroke-opacity="0.9" stroke-width="1.6" marker-end="url(#bcArr)"/>
  <text x="40" y="120" font-size="11.5" font-weight="700" fill="#f59e0b">continue</text>
  <text x="40" y="136" font-size="10" fill="currentColor" opacity="0.7">về đầu vòng,</text>
  <text x="40" y="149" font-size="10" fill="currentColor" opacity="0.7">bỏ phần còn lại</text>
  <path d="M410 213 H540 V296 H300" fill="none" stroke="#ef4444" stroke-opacity="0.9" stroke-width="1.6" marker-end="url(#bcArr)"/>
  <text x="556" y="200" font-size="11.5" font-weight="700" fill="#ef4444">break</text>
  <text x="556" y="216" font-size="10" fill="currentColor" opacity="0.7">nhảy ra ngoài,</text>
  <text x="556" y="229" font-size="10" fill="currentColor" opacity="0.7">kết thúc vòng lặp</text>
  <rect x="200" y="288" width="200" height="22" rx="7" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="300" y="303" font-size="11" text-anchor="middle" fill="currentColor">lệnh sau vòng lặp</text>
</svg>

Ví dụ: duyệt số 1 → 10, bỏ qua số chẵn, và dừng hẳn khi gặp số 9.

```python
for i in range(1, 11):
    if i % 2 == 0:   # i chia 2 dư 0 nghĩa là số chẵn
        continue     # bỏ qua, sang số tiếp theo
    if i == 9:
        break        # thoát hẳn vòng lặp
    print(i)         # in ra: 1, 3, 5, 7
```
```javascript
for (let i = 1; i <= 10; i++) {
    if (i % 2 === 0) {  // i chia 2 dư 0 nghĩa là số chẵn
        continue;       // bỏ qua, sang số tiếp theo
    }
    if (i === 9) {
        break;          // thoát hẳn vòng lặp
    }
    console.log(i);     // in ra: 1, 3, 5, 7
}
```
```java
for (int i = 1; i <= 10; i++) {
    if (i % 2 == 0) {   // i chia 2 dư 0 nghĩa là số chẵn
        continue;       // bỏ qua, sang số tiếp theo
    }
    if (i == 9) {
        break;          // thoát hẳn vòng lặp
    }
    System.out.println(i); // in ra: 1, 3, 5, 7
}
```
```go
for i := 1; i <= 10; i++ {
    if i%2 == 0 {  // i chia 2 dư 0 nghĩa là số chẵn
        continue   // bỏ qua, sang số tiếp theo
    }
    if i == 9 {
        break      // thoát hẳn vòng lặp
    }
    fmt.Println(i) // in ra: 1, 3, 5, 7
}
```

```cpp
for (int i = 1; i <= 10; i++) {
    if (i % 2 == 0) {   // i chia 2 dư 0 nghĩa là số chẵn
        continue;       // bỏ qua, sang số tiếp theo
    }
    if (i == 9) {
        break;          // thoát hẳn vòng lặp
    }
    std::cout << i << std::endl; // in ra: 1, 3, 5, 7
}
```

Ký hiệu `%` gọi là **phép chia lấy dư (modulo)**: `7 % 2` bằng 1 vì 7 chia 2 được 3 **dư 1**. Đây là cách kinh điển để kiểm tra chẵn/lẻ hoặc "chia hết". (JavaScript có `===` — phiên bản so sánh nghiêm ngặt hơn `==`, người mới cứ ưu tiên dùng `===` trong JavaScript.)

> **Ghi nhớ**: `break` = "tôi xong việc, ra khỏi vòng lặp". `continue` = "lượt này bỏ qua, cho lượt tiếp theo".

## 5. Bài toán mẫu 1: FizzBuzz — bài kiểm tra kinh điển

FizzBuzz là bài phỏng vấn lập trình nổi tiếng nhất thế giới, luật chơi như trò đếm số trẻ con:

- Đếm từ 1 đến 15.
- Số chia hết cho 3 → nói "Fizz".
- Số chia hết cho 5 → nói "Buzz".
- Chia hết cho **cả 3 và 5** → nói "FizzBuzz".
- Còn lại → nói chính số đó.

```python
for i in range(1, 16):
    if i % 3 == 0 and i % 5 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)
```
```javascript
for (let i = 1; i <= 15; i++) {
    if (i % 3 === 0 && i % 5 === 0) {
        console.log("FizzBuzz");
    } else if (i % 3 === 0) {
        console.log("Fizz");
    } else if (i % 5 === 0) {
        console.log("Buzz");
    } else {
        console.log(i);
    }
}
```
```java
for (int i = 1; i <= 15; i++) {
    if (i % 3 == 0 && i % 5 == 0) {
        System.out.println("FizzBuzz");
    } else if (i % 3 == 0) {
        System.out.println("Fizz");
    } else if (i % 5 == 0) {
        System.out.println("Buzz");
    } else {
        System.out.println(i);
    }
}
```
```go
for i := 1; i <= 15; i++ {
    if i%3 == 0 && i%5 == 0 {
        fmt.Println("FizzBuzz")
    } else if i%3 == 0 {
        fmt.Println("Fizz")
    } else if i%5 == 0 {
        fmt.Println("Buzz")
    } else {
        fmt.Println(i)
    }
}
```

```cpp
for (int i = 1; i <= 15; i++) {
    if (i % 3 == 0 && i % 5 == 0) {
        std::cout << "FizzBuzz" << std::endl;
    } else if (i % 3 == 0) {
        std::cout << "Fizz" << std::endl;
    } else if (i % 5 == 0) {
        std::cout << "Buzz" << std::endl;
    } else {
        std::cout << i << std::endl;
    }
}
```

Kết quả: `1, 2, Fizz, 4, Buzz, Fizz, 7, 8, Fizz, Buzz, 11, Fizz, 13, 14, FizzBuzz`.

> **Lỗi người mới hay gặp**: Đặt nhánh "FizzBuzz" **xuống cuối**. Nhớ rằng if/elif chạy nhánh đầu tiên đúng — số 15 vừa chia hết cho 3, nếu kiểm tra "chia hết cho 3" trước thì máy in "Fizz" rồi dừng, không bao giờ chạm tới "FizzBuzz". **Điều kiện cụ thể nhất phải kiểm tra trước.**

## 6. Bài toán mẫu 2: Đoán số — kết hợp tất cả

Trò chơi: máy "nghĩ" sẵn số bí mật, người chơi đoán; máy gợi ý "lớn hơn" hay "nhỏ hơn" cho đến khi đoán trúng. Bài này gom đủ: `while` (chưa biết đoán mấy lần), `if/elif/else` (so sánh), `break` (trúng thì dừng).

```python
so_bi_mat = 7
so_lan = 0

while True:  # lặp "mãi mãi", chỉ thoát bằng break
    doan = int(input("Đoán một số từ 1 đến 10: "))
    so_lan = so_lan + 1
    if doan < so_bi_mat:
        print("Số bí mật LỚN hơn!")
    elif doan > so_bi_mat:
        print("Số bí mật NHỎ hơn!")
    else:
        print("Chính xác! Bạn đoán", so_lan, "lần.")
        break
```
```javascript
// Chạy bằng Node.js với gói readline-sync (cài: npm install readline-sync)
const readline = require("readline-sync");
const soBiMat = 7;
let soLan = 0;

while (true) { // lặp "mãi mãi", chỉ thoát bằng break
    const doan = Number(readline.question("Đoán một số từ 1 đến 10: "));
    soLan = soLan + 1;
    if (doan < soBiMat) {
        console.log("Số bí mật LỚN hơn!");
    } else if (doan > soBiMat) {
        console.log("Số bí mật NHỎ hơn!");
    } else {
        console.log("Chính xác! Bạn đoán " + soLan + " lần.");
        break;
    }
}
```
```java
import java.util.Scanner;

public class DoanSo {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int soBiMat = 7;
        int soLan = 0;

        while (true) { // lặp "mãi mãi", chỉ thoát bằng break
            System.out.print("Đoán một số từ 1 đến 10: ");
            int doan = sc.nextInt();
            soLan = soLan + 1;
            if (doan < soBiMat) {
                System.out.println("Số bí mật LỚN hơn!");
            } else if (doan > soBiMat) {
                System.out.println("Số bí mật NHỎ hơn!");
            } else {
                System.out.println("Chính xác! Bạn đoán " + soLan + " lần.");
                break;
            }
        }
    }
}
```
```go
package main

import "fmt"

func main() {
    soBiMat := 7
    soLan := 0

    for { // for không điều kiện = lặp "mãi mãi", chỉ thoát bằng break
        var doan int
        fmt.Print("Đoán một số từ 1 đến 10: ")
        fmt.Scan(&doan)
        soLan = soLan + 1
        if doan < soBiMat {
            fmt.Println("Số bí mật LỚN hơn!")
        } else if doan > soBiMat {
            fmt.Println("Số bí mật NHỎ hơn!")
        } else {
            fmt.Println("Chính xác! Bạn đoán", soLan, "lần.")
            break
        }
    }
}
```

```cpp
#include <iostream>

int main() {
    int soBiMat = 7;
    int soLan = 0;

    while (true) { // while(true) = lặp "mãi mãi", chỉ thoát bằng break
        int doan;
        std::cout << "Đoán một số từ 1 đến 10: ";
        std::cin >> doan;
        soLan = soLan + 1;
        if (doan < soBiMat) {
            std::cout << "Số bí mật LỚN hơn!" << std::endl;
        } else if (doan > soBiMat) {
            std::cout << "Số bí mật NHỎ hơn!" << std::endl;
        } else {
            std::cout << "Chính xác! Bạn đoán " << soLan << " lần." << std::endl;
            break;
        }
    }
    return 0;
}
```

Vài chú thích: Java cần bọc mọi thứ trong `class` và hàm `main`, đọc bàn phím qua `Scanner`; Go cần `package main` và `func main`, đọc qua `fmt.Scan`; vòng "lặp mãi mãi" trong Go chỉ đơn giản là `for { }` không điều kiện. Mẫu "lặp vô hạn có chủ đích + `break` khi xong" rất phổ biến — đây là vòng vô hạn **có lối thoát**, khác với vòng vô hạn do quên cập nhật điều kiện ở phần 3.2.

## 7. Lỗi lệch 1 (off-by-one) — kẻ thù thầm lặng

**Off-by-one** là lỗi vòng lặp chạy **thừa hoặc thiếu đúng 1 lần**. Nó phổ biến đến mức có tên riêng.

Hình dung: hàng rào dài 10 mét, mỗi 1 mét cắm một cọc — cần bao nhiêu cọc? Nhiều người trả lời 10, đáp án đúng là **11** (có cọc ở cả hai đầu). Trong lập trình, sai kiểu này xảy ra khi nhầm giữa `<` và `<=`, hoặc quên rằng `range` của Python **không lấy số cuối**:

| Ý định | Viết đúng | Viết sai (lệch 1) |
|--------|-----------|--------------------|
| In 1 → 10 (Python) | `range(1, 11)` | `range(1, 10)` → thiếu số 10 |
| In 1 → 10 (JS/Java/Go) | `i = 1; i <= 10` | `i = 1; i < 10` → thiếu số 10 |
| Lặp đúng 10 lần từ 0 | `i = 0; i < 10` | `i = 0; i <= 10` → thừa 1 lần (11 lần) |

<svg viewBox="0 0 520 330" role="img" aria-labelledby="pr02c-t pr02c-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="pr02c-t">Lệch 1: hàng rào 10 m cần 11 cọc; range(1, 11) lấy 1 đến 10, range(1, 10) thiếu số 10</title>
<desc id="pr02c-d">Trên: hàng rào dài 10 mét, mỗi mét một cọc, có cọc ở cả hai đầu nên 10 khoảng cần 11 cọc. Dưới: trục số từ 1 đến 11. range(1, 11) lấy 1 đến 10, dừng trước 11, đủ 10 số. range(1, 10) dừng trước 10 nên chỉ có 9 số, thiếu số 10.</desc>
<text x="16" y="22" font-size="14" font-weight="700" fill="currentColor">Hàng rào 10 m, mỗi 1 m một cọc</text>
<path d="M40 44 V36 H480 V44" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<text x="260.0" y="58" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.8">10 khoảng × 1 m</text>
<line x1="40" y1="78" x2="480" y2="78" stroke="#f59e0b" stroke-width="3" stroke-opacity="0.6"/>
<line x1="40" y1="96" x2="480" y2="96" stroke="#f59e0b" stroke-width="3" stroke-opacity="0.6"/>
<rect x="35" y="66" width="10" height="44" rx="2" fill="#8b5cf6" fill-opacity="0.6" stroke="#8b5cf6"/>
<text x="40" y="128" text-anchor="middle" font-size="13" fill="currentColor">1</text>
<rect x="79" y="66" width="10" height="44" rx="2" fill="#8b5cf6" fill-opacity="0.35" stroke="#8b5cf6"/>
<text x="84" y="128" text-anchor="middle" font-size="13" fill="currentColor">2</text>
<rect x="123" y="66" width="10" height="44" rx="2" fill="#8b5cf6" fill-opacity="0.35" stroke="#8b5cf6"/>
<text x="128" y="128" text-anchor="middle" font-size="13" fill="currentColor">3</text>
<rect x="167" y="66" width="10" height="44" rx="2" fill="#8b5cf6" fill-opacity="0.35" stroke="#8b5cf6"/>
<text x="172" y="128" text-anchor="middle" font-size="13" fill="currentColor">4</text>
<rect x="211" y="66" width="10" height="44" rx="2" fill="#8b5cf6" fill-opacity="0.35" stroke="#8b5cf6"/>
<text x="216" y="128" text-anchor="middle" font-size="13" fill="currentColor">5</text>
<rect x="255" y="66" width="10" height="44" rx="2" fill="#8b5cf6" fill-opacity="0.35" stroke="#8b5cf6"/>
<text x="260" y="128" text-anchor="middle" font-size="13" fill="currentColor">6</text>
<rect x="299" y="66" width="10" height="44" rx="2" fill="#8b5cf6" fill-opacity="0.35" stroke="#8b5cf6"/>
<text x="304" y="128" text-anchor="middle" font-size="13" fill="currentColor">7</text>
<rect x="343" y="66" width="10" height="44" rx="2" fill="#8b5cf6" fill-opacity="0.35" stroke="#8b5cf6"/>
<text x="348" y="128" text-anchor="middle" font-size="13" fill="currentColor">8</text>
<rect x="387" y="66" width="10" height="44" rx="2" fill="#8b5cf6" fill-opacity="0.35" stroke="#8b5cf6"/>
<text x="392" y="128" text-anchor="middle" font-size="13" fill="currentColor">9</text>
<rect x="431" y="66" width="10" height="44" rx="2" fill="#8b5cf6" fill-opacity="0.35" stroke="#8b5cf6"/>
<text x="436" y="128" text-anchor="middle" font-size="13" fill="currentColor">10</text>
<rect x="475" y="66" width="10" height="44" rx="2" fill="#8b5cf6" fill-opacity="0.6" stroke="#8b5cf6"/>
<text x="480" y="128" text-anchor="middle" font-size="13" fill="currentColor">11</text>
<text x="504" y="22" text-anchor="end" font-size="14" font-weight="700" fill="#8b5cf6">11 cọc, không phải 10</text>
<line x1="16" y1="146" x2="504" y2="146" stroke="currentColor" stroke-opacity="0.15"/>
<text x="16" y="172" font-size="14" font-weight="700" fill="currentColor">range của Python dừng TRƯỚC số cuối</text>
<text x="40" y="198" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.7">1</text>
<text x="84" y="198" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.7">2</text>
<text x="128" y="198" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.7">3</text>
<text x="172" y="198" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.7">4</text>
<text x="216" y="198" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.7">5</text>
<text x="260" y="198" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.7">6</text>
<text x="304" y="198" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.7">7</text>
<text x="348" y="198" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.7">8</text>
<text x="392" y="198" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.7">9</text>
<text x="436" y="198" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.7">10</text>
<text x="480" y="198" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.7">11</text>
<text x="16" y="220" font-size="13" font-weight="700" fill="currentColor" font-family="ui-monospace, monospace">range(1, 11)</text>
<text x="504" y="220" text-anchor="end" font-size="13" font-weight="700" fill="#10b981">10 số: 1 → 10 ✓</text>
<line x1="40" y1="234" x2="436" y2="234" stroke="#10b981" stroke-width="3" stroke-opacity="0.5"/>
<circle cx="40" cy="234" r="8" fill="#10b981" fill-opacity="0.75"/>
<circle cx="84" cy="234" r="8" fill="#10b981" fill-opacity="0.75"/>
<circle cx="128" cy="234" r="8" fill="#10b981" fill-opacity="0.75"/>
<circle cx="172" cy="234" r="8" fill="#10b981" fill-opacity="0.75"/>
<circle cx="216" cy="234" r="8" fill="#10b981" fill-opacity="0.75"/>
<circle cx="260" cy="234" r="8" fill="#10b981" fill-opacity="0.75"/>
<circle cx="304" cy="234" r="8" fill="#10b981" fill-opacity="0.75"/>
<circle cx="348" cy="234" r="8" fill="#10b981" fill-opacity="0.75"/>
<circle cx="392" cy="234" r="8" fill="#10b981" fill-opacity="0.75"/>
<circle cx="436" cy="234" r="8" fill="#10b981" fill-opacity="0.75"/>
<circle cx="480" cy="234" r="8" fill="none" stroke="#10b981" stroke-width="2" stroke-dasharray="3 2"/>
<text x="480" y="258" text-anchor="middle" font-size="13" fill="#10b981">dừng</text>
<text x="16" y="284" font-size="13" font-weight="700" fill="currentColor" font-family="ui-monospace, monospace">range(1, 10)</text>
<text x="504" y="284" text-anchor="end" font-size="13" font-weight="700" fill="#f43f5e">9 số: thiếu 10 ✗</text>
<line x1="40" y1="298" x2="392" y2="298" stroke="#f43f5e" stroke-width="3" stroke-opacity="0.5"/>
<circle cx="40" cy="298" r="8" fill="#f43f5e" fill-opacity="0.75"/>
<circle cx="84" cy="298" r="8" fill="#f43f5e" fill-opacity="0.75"/>
<circle cx="128" cy="298" r="8" fill="#f43f5e" fill-opacity="0.75"/>
<circle cx="172" cy="298" r="8" fill="#f43f5e" fill-opacity="0.75"/>
<circle cx="216" cy="298" r="8" fill="#f43f5e" fill-opacity="0.75"/>
<circle cx="260" cy="298" r="8" fill="#f43f5e" fill-opacity="0.75"/>
<circle cx="304" cy="298" r="8" fill="#f43f5e" fill-opacity="0.75"/>
<circle cx="348" cy="298" r="8" fill="#f43f5e" fill-opacity="0.75"/>
<circle cx="392" cy="298" r="8" fill="#f43f5e" fill-opacity="0.75"/>
<circle cx="436" cy="298" r="8" fill="none" stroke="#f43f5e" stroke-width="2" stroke-dasharray="3 2"/>
<text x="436" y="322" text-anchor="middle" font-size="13" fill="#f43f5e">dừng</text>
</svg>

> **Lỗi người mới hay gặp**: Khi vòng lặp cho kết quả "gần đúng nhưng sai sai", việc đầu tiên hãy nghi ngờ lệch 1. Cách kiểm tra nhanh: **thử bằng tay với trường hợp nhỏ** — thay vì 1000 lần, chạy thử 3 lần rồi đếm xem có đúng 3 không, và kiểm tra **giá trị đầu tiên** lẫn **giá trị cuối cùng** có đúng như mong đợi.

## 8. Tóm tắt

| Khái niệm | Vai trò | Câu thần chú |
|-----------|---------|--------------|
| `if / else if / else` | Quyết định, rẽ nhánh | "Nếu... thì..., ngược lại..." |
| `==  !=  >  <  >=  <=` | So sánh, tạo điều kiện đúng/sai | `=` là gán, `==` là hỏi |
| `and / or / not` (`&& \|\| !`) | Ghép nhiều điều kiện | and khó tính, or dễ tính |
| `for` | Lặp khi **biết trước** số lần | "Chống đẩy 20 cái" |
| `while` | Lặp **chừng nào còn đúng** | "Khuấy đến khi sôi" |
| `break` | Thoát hẳn vòng lặp | "Xong, nghỉ!" |
| `continue` | Bỏ lượt này, sang lượt sau | "Bỏ qua, tiếp!" |

Hai cạm bẫy phải khắc cốt ghi tâm: **vòng lặp vô hạn** (quên làm điều kiện trở thành sai) và **lệch 1** (nhầm `<` với `<=`, quên `range` không lấy số cuối).

### Bài tập tự luyện

1. In các số **chẵn** từ 2 đến 20 (gợi ý: dùng `%` hoặc bước nhảy 2).
2. Tính tổng 1 + 2 + ... + 100 bằng vòng lặp (đáp án đúng: 5050 — nếu ra 4950 hay 5151, bạn vừa dính lỗi lệch 1 đấy!).
3. Sửa FizzBuzz: thêm luật "chia hết cho 7 → in 'Bang'".
4. Nâng cấp trò đoán số: giới hạn tối đa 5 lần đoán, hết lượt thì in "Thua rồi!" (gợi ý: thêm điều kiện đếm số lần và `break`).

Bài sau, chúng ta sẽ học cách **gói các đoạn lệnh thành hàm (function)** để tái sử dụng — hết cảnh viết đi viết lại cùng một đoạn code. Hẹn gặp lại!
