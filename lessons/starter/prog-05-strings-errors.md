# Chuỗi & xử lý lỗi

Hãy tưởng tượng bạn làm việc ở quầy lễ tân khách sạn. Mỗi ngày bạn phải: đọc tên khách trên giấy tờ (xử lý **chuỗi** — dãy ký tự), ghi sổ nhật ký (đọc/ghi **file**), và đối phó với những tình huống bất ngờ như khách đưa giấy tờ rách nát (xử lý **lỗi**). Bài học này dạy bạn cả ba kỹ năng đó trong lập trình.

## 1. Chuỗi (string) là gì? Ôn lại nhanh

**Chuỗi (string)** là một dãy ký tự — chữ cái, chữ số, dấu cách, ký hiệu — được đặt trong dấu nháy. Ví dụ: `"Xin chào"`, `"0901234567"`, `"a@b.com"`.

Điểm quan trọng: máy tính xem chuỗi như một **dãy ô được đánh số**, bắt đầu từ **0** (không phải 1). Giống dãy ghế trong rạp phim mà ghế đầu tiên mang số 0:

```
Chuỗi:    H  E  L  L  O
Vị trí:   0  1  2  3  4
```

> 💡 Ghi nhớ: Vị trí (gọi là **index** — chỉ số) luôn bắt đầu từ 0. Ký tự cuối của chuỗi dài n nằm ở vị trí n-1.

## 2. Thao tác chuỗi cơ bản

### 2.1. Nối chuỗi (concatenation)

Nối chuỗi giống dán hai mảnh giấy lại với nhau:

```python
ho = "Nguyễn"
ten = "An"
hoten = ho + " " + ten
print(hoten)  # Nguyễn An
```
```javascript
const ho = "Nguyễn";
const ten = "An";
const hoten = ho + " " + ten;
console.log(hoten);  // Nguyễn An
```
```java
String ho = "Nguyễn";
String ten = "An";
String hoten = ho + " " + ten;
System.out.println(hoten);  // Nguyễn An
```
```go
ho := "Nguyễn"
ten := "An"
hoten := ho + " " + ten
fmt.Println(hoten)  // Nguyễn An
```

```cpp
std::string ho = "Nguyễn";
std::string ten = "An";
std::string hoten = ho + " " + ten;
std::cout << hoten << "\n";  // Nguyễn An
```

### 2.2. Độ dài chuỗi

Đếm xem chuỗi có bao nhiêu ký tự:

```python
s = "hello"
print(len(s))  # 5
```
```javascript
const s = "hello";
console.log(s.length);  // 5
```
```java
String s = "hello";
System.out.println(s.length());  // 5
```
```go
s := "hello"
fmt.Println(len(s))  // 5
```

```cpp
std::string s = "hello";
std::cout << s.length() << "\n";  // 5
```

*Chú thích:* trong Go, `len()` đếm **byte** chứ không phải ký tự — với tiếng Việt có dấu (chiếm nhiều byte), kết quả sẽ lớn hơn số chữ bạn nhìn thấy. Muốn đếm đúng ký tự tiếng Việt trong Go, dùng `len([]rune(s))`.

### 2.3. Cắt chuỗi (slicing / substring)

Cắt lấy một đoạn của chuỗi, giống cắt một khúc bánh mì. Quy ước phổ biến: lấy từ vị trí bắt đầu **đến trước** vị trí kết thúc (không bao gồm vị trí kết thúc):

```python
s = "Hello World"
print(s[0:5])   # Hello (vị trí 0 đến 4)
print(s[6:])    # World (từ vị trí 6 đến hết)
```
```javascript
const s = "Hello World";
console.log(s.slice(0, 5));  // Hello
console.log(s.slice(6));     // World
```
```java
String s = "Hello World";
System.out.println(s.substring(0, 5));  // Hello
System.out.println(s.substring(6));     // World
```
```go
s := "Hello World"
fmt.Println(s[0:5])  // Hello
fmt.Println(s[6:])   // World
```

```cpp
std::string s = "Hello World";
std::cout << s.substr(0, 5) << "\n";  // Hello (từ vị trí 0, lấy 5 ký tự)
std::cout << s.substr(6) << "\n";     // World (từ vị trí 6 đến hết)
```

> ⚠️ Lỗi người mới hay gặp: nghĩ rằng `s[0:5]` lấy 6 ký tự (0,1,2,3,4,5). Sai! Nó lấy 5 ký tự, **dừng trước** vị trí 5. Mẹo nhớ: số ký tự lấy được = kết thúc − bắt đầu (5 − 0 = 5).

### 2.4. Tìm kiếm trong chuỗi

Hai câu hỏi thường gặp: "chuỗi này có chứa từ kia không?" và "từ kia nằm ở vị trí nào?":

```python
s = "Hello World"
print("World" in s)        # True (có chứa)
print(s.find("World"))     # 6 (vị trí bắt đầu; trả về -1 nếu không thấy)
```
```javascript
const s = "Hello World";
console.log(s.includes("World"));  // true
console.log(s.indexOf("World"));   // 6 (trả về -1 nếu không thấy)
```
```java
String s = "Hello World";
System.out.println(s.contains("World"));  // true
System.out.println(s.indexOf("World"));   // 6 (trả về -1 nếu không thấy)
```
```go
s := "Hello World"
fmt.Println(strings.Contains(s, "World"))  // true
fmt.Println(strings.Index(s, "World"))     // 6 (trả về -1 nếu không thấy)
```

```cpp
std::string s = "Hello World";
std::cout << (s.find("World") != std::string::npos) << "\n";  // 1 (true: có chứa)
std::cout << s.find("World") << "\n";  // 6 (trả về std::string::npos nếu không thấy)
```

*Chú thích:* Go gom các hàm xử lý chuỗi vào gói `strings`, cần thêm `import "strings"` ở đầu file.

### 2.5. Các phép biến đổi hay dùng

| Việc cần làm | Python | JavaScript | Java | Go |
|---|---|---|---|---|
| Viết HOA | `s.upper()` | `s.toUpperCase()` | `s.toUpperCase()` | `strings.ToUpper(s)` |
| viết thường | `s.lower()` | `s.toLowerCase()` | `s.toLowerCase()` | `strings.ToLower(s)` |
| Cắt khoảng trắng 2 đầu | `s.strip()` | `s.trim()` | `s.trim()` | `strings.TrimSpace(s)` |
| Thay thế | `s.replace(a, b)` | `s.replaceAll(a, b)` | `s.replace(a, b)` | `strings.ReplaceAll(s, a, b)` |
| Tách thành danh sách | `s.split(",")` | `s.split(",")` | `s.split(",")` | `strings.Split(s, ",")` |

> 💡 Ghi nhớ: chuỗi là **bất biến (immutable)** trong cả 4 ngôn ngữ — các hàm trên KHÔNG sửa chuỗi gốc mà trả về **chuỗi mới**. Viết `s.upper()` rồi vứt kết quả thì `s` vẫn y nguyên; phải gán lại: `s = s.upper()`.

### 2.6. Định dạng chuỗi (format) — trộn chữ với biến

Thay vì nối từng mảnh bằng dấu `+` (dài dòng, dễ quên dấu cách), ta dùng "khuôn mẫu có chỗ trống" rồi điền biến vào — giống điền tên vào thiệp mời in sẵn:

```python
ten = "An"
tuoi = 20
print(f"Bạn {ten} năm nay {tuoi} tuổi")
```
```javascript
const ten = "An";
const tuoi = 20;
console.log(`Bạn ${ten} năm nay ${tuoi} tuổi`);
```
```java
String ten = "An";
int tuoi = 20;
System.out.println(String.format("Bạn %s năm nay %d tuổi", ten, tuoi));
```
```go
ten := "An"
tuoi := 20
fmt.Printf("Bạn %s năm nay %d tuổi\n", ten, tuoi)
```

```cpp
std::string ten = "An";
int tuoi = 20;
std::cout << "Bạn " << ten << " năm nay " << tuoi << " tuổi\n";
```

*Chú thích:* Python dùng `f"..."` (f-string), JavaScript dùng dấu **backtick** `` ` `` với `${...}` (template literal). Java và Go dùng kiểu "chỗ trống đánh dấu": `%s` cho chuỗi, `%d` cho số nguyên — biến được điền vào theo đúng thứ tự.

## 3. Đọc và ghi file text

**File** là tài liệu lưu trên ổ đĩa — như một trang sổ tay mà chương trình có thể đọc lại sau khi tắt máy (biến trong chương trình thì mất hết khi tắt). Quy trình luôn là 3 bước: **mở → đọc/ghi → đóng** (giống mở sổ, viết, gấp sổ lại).

### 3.1. Ghi file

```python
with open("chao.txt", "w", encoding="utf-8") as f:
    f.write("Xin chào!\nDòng thứ hai.")
# "with" tự đóng file giúp bạn
```
```javascript
// Chạy bằng Node.js
const fs = require("fs");
fs.writeFileSync("chao.txt", "Xin chào!\nDòng thứ hai.");
```
```java
import java.nio.file.*;

Files.writeString(Path.of("chao.txt"), "Xin chào!\nDòng thứ hai.");
```
```go
import "os"

os.WriteFile("chao.txt", []byte("Xin chào!\nDòng thứ hai."), 0644)
```

```cpp
#include <fstream>

std::ofstream f("chao.txt");
f << "Xin chào!\nDòng thứ hai.";
f.close();  // đóng file lại sau khi ghi
```

*Chú thích:* `\n` là ký hiệu xuống dòng. Trong Go, số `0644` là "quyền truy cập file" (ai được đọc/ghi) — cứ dùng giá trị này là ổn. Java cần khai báo `throws IOException` hoặc try/catch (sẽ học ngay bên dưới).

### 3.2. Đọc file

```python
with open("chao.txt", "r", encoding="utf-8") as f:
    noidung = f.read()
print(noidung)
```
```javascript
const fs = require("fs");
const noidung = fs.readFileSync("chao.txt", "utf-8");
console.log(noidung);
```
```java
import java.nio.file.*;

String noidung = Files.readString(Path.of("chao.txt"));
System.out.println(noidung);
```
```go
import "os"

data, err := os.ReadFile("chao.txt")
if err != nil {
    fmt.Println("Lỗi:", err)
    return
}
fmt.Println(string(data))
```

```cpp
#include <fstream>
#include <sstream>

std::ifstream f("chao.txt");
std::stringstream buffer;
buffer << f.rdbuf();           // đọc toàn bộ nội dung file
std::string noidung = buffer.str();
std::cout << noidung << "\n";
```

> ⚠️ Lỗi người mới hay gặp: đọc một file **không tồn tại** → chương trình "văng" ngay lập tức. Đây chính là lý do ta cần học phần tiếp theo: xử lý lỗi.

## 4. Vì sao chương trình "văng"? — Exception

Quay lại ví dụ lễ tân: bạn yêu cầu khách đưa CMND, nhưng khách... đưa tờ giấy trắng. Quy trình bình thường bị phá vỡ — bạn không thể tiếp tục ghi sổ. Trong lập trình, tình huống bất thường như vậy gọi là **exception (ngoại lệ)** — một sự cố xảy ra lúc chương trình đang chạy khiến nó không thể tiếp tục bình thường.

Các nguồn lỗi kinh điển:

| Tình huống | Ví dụ | Tên lỗi thường thấy |
|---|---|---|
| Chia cho 0 | `10 / 0` | ZeroDivisionError / ArithmeticException |
| Đổi chữ thành số thất bại | biến `"abc"` thành số | ValueError / NumberFormatException |
| File không tồn tại | mở `"khongco.txt"` | FileNotFoundError / IOException |
| Truy cập vị trí không có | lấy ký tự thứ 100 của chuỗi 5 ký tự | IndexError / IndexOutOfBounds |

Khi exception xảy ra mà không ai "đỡ", chương trình **dừng đột ngột** (dân gian gọi là "văng", "crash") và in ra một đoạn báo lỗi đỏ lòm. Người dùng thật sẽ rất hoang mang. Nhiệm vụ của ta: **đoán trước chỗ có thể lỗi và chuẩn bị phương án B**.

## 5. try/catch — tấm lưới an toàn

Cơ chế: "**Thử (try)** làm việc này; nếu có sự cố thì **bắt (catch)** lấy và xử lý nhẹ nhàng thay vì văng". Giống diễn viên xiếc đi trên dây có lưới bên dưới — ngã thì rơi vào lưới chứ không rơi xuống đất.

Ví dụ: đổi chuỗi người dùng nhập thành số — việc rất dễ thất bại nếu họ gõ chữ:

```python
chuoi = "abc"
try:
    so = int(chuoi)
    print("Số bạn nhập:", so)
except ValueError:
    print("Đó không phải là số hợp lệ!")
print("Chương trình vẫn chạy tiếp.")
```
```javascript
const chuoi = "abc";
const so = parseInt(chuoi);
if (isNaN(so)) {
    console.log("Đó không phải là số hợp lệ!");
} else {
    console.log("Số bạn nhập:", so);
}
console.log("Chương trình vẫn chạy tiếp.");
```
```java
String chuoi = "abc";
try {
    int so = Integer.parseInt(chuoi);
    System.out.println("Số bạn nhập: " + so);
} catch (NumberFormatException e) {
    System.out.println("Đó không phải là số hợp lệ!");
}
System.out.println("Chương trình vẫn chạy tiếp.");
```
```go
chuoi := "abc"
so, err := strconv.Atoi(chuoi)
if err != nil {
    fmt.Println("Đó không phải là số hợp lệ!")
} else {
    fmt.Println("Số bạn nhập:", so)
}
fmt.Println("Chương trình vẫn chạy tiếp.")
```

```cpp
#include <string>
#include <stdexcept>

std::string chuoi = "abc";
try {
    int so = std::stoi(chuoi);
    std::cout << "Số bạn nhập: " << so << "\n";
} catch (const std::invalid_argument& e) {
    std::cout << "Đó không phải là số hợp lệ!\n";
}
std::cout << "Chương trình vẫn chạy tiếp.\n";
```

*Chú thích quan trọng về triết lý mỗi ngôn ngữ:*
- **Python** dùng `try` / `except`; **Java** và **JavaScript** dùng `try` / `catch` — cùng một ý tưởng, khác tên.
- **JavaScript**: `parseInt("abc")` không văng mà trả về giá trị đặc biệt `NaN` (Not a Number), nên ta kiểm tra bằng `isNaN()`. JavaScript vẫn có `try/catch` đầy đủ cho các lỗi khác (ví dụ đọc file hỏng).
- **Go** đi con đường riêng: hàm có thể lỗi sẽ **trả về thêm một giá trị `err`**, bạn kiểm tra `if err != nil` (nil = rỗng = không có lỗi). Go gần như không dùng try/catch — lỗi là giá trị bình thường được trao tay.

### 5.1. Khối finally — việc luôn phải làm dù lỗi hay không

Đôi khi có việc **bắt buộc làm cuối cùng** bất kể thành công hay thất bại — như tắt bếp dù món ăn ngon hay cháy:

```python
try:
    f = open("data.txt", encoding="utf-8")
    print(f.read())
except FileNotFoundError:
    print("Không tìm thấy file!")
finally:
    print("Dọn dẹp xong.")  # luôn chạy
```
```javascript
const fs = require("fs");
try {
    const data = fs.readFileSync("data.txt", "utf-8");
    console.log(data);
} catch (e) {
    console.log("Không tìm thấy file!");
} finally {
    console.log("Dọn dẹp xong.");  // luôn chạy
}
```
```java
try {
    String data = Files.readString(Path.of("data.txt"));
    System.out.println(data);
} catch (IOException e) {
    System.out.println("Không tìm thấy file!");
} finally {
    System.out.println("Dọn dẹp xong.");  // luôn chạy
}
```
```go
func docFile() {
    defer fmt.Println("Dọn dẹp xong.")  // luôn chạy khi hàm kết thúc
    data, err := os.ReadFile("data.txt")
    if err != nil {
        fmt.Println("Không tìm thấy file!")
        return
    }
    fmt.Println(string(data))
}
```

```cpp
#include <fstream>
#include <sstream>
#include <stdexcept>

try {
    std::ifstream f("data.txt");
    if (!f) {
        throw std::runtime_error("không mở được file");
    }
    std::stringstream buffer;
    buffer << f.rdbuf();
    std::cout << buffer.str() << "\n";
} catch (const std::exception& e) {
    std::cout << "Không tìm thấy file!\n";
} 
// C++ không có finally; phần dọn dẹp đặt sau khối try/catch
std::cout << "Dọn dẹp xong.\n";  // luôn chạy
```

*Chú thích:* Go không có `finally`; thay vào đó dùng `defer` — "hẹn" một lệnh chạy lúc hàm kết thúc, dù kết thúc kiểu gì.

> ⚠️ Lỗi người mới hay gặp: bọc try/catch quanh **toàn bộ chương trình** rồi catch im lặng không in gì cả. Hậu quả: lỗi xảy ra mà bạn không hề biết, bug "tàng hình" cực khó tìm. Chỉ try những đoạn thật sự có thể lỗi, và trong catch luôn thông báo/ghi lại lỗi.

## 6. Validate input — đừng tin người dùng gõ đúng

**Validate** (kiểm tra hợp lệ) nghĩa là kiểm tra dữ liệu người dùng nhập **trước khi** dùng nó. Nguyên tắc vàng của lập trình: *người dùng sẽ gõ mọi thứ bạn không ngờ tới* — chữ thay vì số, để trống, dán cả đoạn văn vào ô tuổi.

Chiến lược 2 lớp:
1. **Kiểm tra chủ động**: chuỗi có rỗng không? có đúng định dạng không? (dùng kỹ năng chuỗi ở phần 2)
2. **Lưới an toàn**: bọc bước chuyển đổi nguy hiểm bằng try/catch (phần 5)

Ví dụ hoàn chỉnh — kiểm tra tuổi hợp lệ (là số, từ 1 đến 120):

```python
def kiem_tra_tuoi(chuoi):
    chuoi = chuoi.strip()              # lớp 1: bỏ khoảng trắng thừa
    if chuoi == "":
        return "Bạn chưa nhập gì cả!"
    try:                               # lớp 2: lưới an toàn khi đổi sang số
        tuoi = int(chuoi)
    except ValueError:
        return "Tuổi phải là một con số!"
    if tuoi < 1 or tuoi > 120:
        return "Tuổi phải từ 1 đến 120!"
    return f"Hợp lệ: {tuoi} tuổi"

print(kiem_tra_tuoi("  25 "))   # Hợp lệ: 25 tuổi
print(kiem_tra_tuoi("abc"))     # Tuổi phải là một con số!
print(kiem_tra_tuoi("999"))     # Tuổi phải từ 1 đến 120!
```
```javascript
function kiemTraTuoi(chuoi) {
    chuoi = chuoi.trim();              // lớp 1: bỏ khoảng trắng thừa
    if (chuoi === "") {
        return "Bạn chưa nhập gì cả!";
    }
    const tuoi = Number(chuoi);        // lớp 2: Number trả NaN nếu không phải số
    if (isNaN(tuoi) || !Number.isInteger(tuoi)) {
        return "Tuổi phải là một con số!";
    }
    if (tuoi < 1 || tuoi > 120) {
        return "Tuổi phải từ 1 đến 120!";
    }
    return `Hợp lệ: ${tuoi} tuổi`;
}

console.log(kiemTraTuoi("  25 "));  // Hợp lệ: 25 tuổi
console.log(kiemTraTuoi("abc"));    // Tuổi phải là một con số!
console.log(kiemTraTuoi("999"));    // Tuổi phải từ 1 đến 120!
```
```java
static String kiemTraTuoi(String chuoi) {
    chuoi = chuoi.trim();              // lớp 1: bỏ khoảng trắng thừa
    if (chuoi.isEmpty()) {
        return "Bạn chưa nhập gì cả!";
    }
    int tuoi;
    try {                              // lớp 2: lưới an toàn khi đổi sang số
        tuoi = Integer.parseInt(chuoi);
    } catch (NumberFormatException e) {
        return "Tuổi phải là một con số!";
    }
    if (tuoi < 1 || tuoi > 120) {
        return "Tuổi phải từ 1 đến 120!";
    }
    return String.format("Hợp lệ: %d tuổi", tuoi);
}

// kiemTraTuoi("  25 ") → Hợp lệ: 25 tuổi
// kiemTraTuoi("abc")   → Tuổi phải là một con số!
// kiemTraTuoi("999")   → Tuổi phải từ 1 đến 120!
```
```go
func kiemTraTuoi(chuoi string) string {
    chuoi = strings.TrimSpace(chuoi)   // lớp 1: bỏ khoảng trắng thừa
    if chuoi == "" {
        return "Bạn chưa nhập gì cả!"
    }
    tuoi, err := strconv.Atoi(chuoi)   // lớp 2: kiểm tra err
    if err != nil {
        return "Tuổi phải là một con số!"
    }
    if tuoi < 1 || tuoi > 120 {
        return "Tuổi phải từ 1 đến 120!"
    }
    return fmt.Sprintf("Hợp lệ: %d tuổi", tuoi)
}

// kiemTraTuoi("  25 ") → Hợp lệ: 25 tuổi
// kiemTraTuoi("abc")   → Tuổi phải là một con số!
// kiemTraTuoi("999")   → Tuổi phải từ 1 đến 120!
```

```cpp
#include <string>
#include <stdexcept>

std::string kiemTraTuoi(std::string chuoi) {
    // lớp 1: bỏ khoảng trắng thừa
    size_t dau = chuoi.find_first_not_of(" \t\n\r");
    size_t cuoi = chuoi.find_last_not_of(" \t\n\r");
    chuoi = (dau == std::string::npos) ? "" : chuoi.substr(dau, cuoi - dau + 1);
    if (chuoi.empty()) {
        return "Bạn chưa nhập gì cả!";
    }
    int tuoi;
    try {                              // lớp 2: lưới an toàn khi đổi sang số
        size_t pos;
        tuoi = std::stoi(chuoi, &pos);
        if (pos != chuoi.size()) {     // còn ký tự thừa => không phải số thuần
            return "Tuổi phải là một con số!";
        }
    } catch (const std::exception& e) {
        return "Tuổi phải là một con số!";
    }
    if (tuoi < 1 || tuoi > 120) {
        return "Tuổi phải từ 1 đến 120!";
    }
    return "Hợp lệ: " + std::to_string(tuoi) + " tuổi";
}

// kiemTraTuoi("  25 ") → Hợp lệ: 25 tuổi
// kiemTraTuoi("abc")   → Tuổi phải là một con số!
// kiemTraTuoi("999")   → Tuổi phải từ 1 đến 120!
```

Để ý mẫu hình chung của cả 4 ngôn ngữ: **kiểm tra sớm, trả về thông báo lỗi rõ ràng ngay khi phát hiện vấn đề** — code đọc như một danh sách rào chắn từ trên xuống.

> 💡 Ghi nhớ: thông báo lỗi tốt nói cho người dùng biết **họ cần làm gì** ("Tuổi phải từ 1 đến 120"), không phải thuật ngữ máy móc ("ValueError: invalid literal").

## 7. Tóm tắt

| Khái niệm | Một câu tóm gọn |
|---|---|
| Chuỗi & index | Dãy ký tự đánh số từ 0; cắt `[a:b]` lấy từ a đến trước b |
| Nối / tìm / format | `+` để nối, `find/indexOf` để tìm vị trí, f-string/template để trộn biến vào chữ |
| Chuỗi bất biến | Mọi phép biến đổi trả về chuỗi MỚI, phải gán lại |
| File | Mở → đọc/ghi → đóng; dữ liệu sống sót sau khi tắt chương trình |
| Exception | Sự cố lúc chạy khiến chương trình "văng" nếu không ai đỡ |
| try/catch | Tấm lưới an toàn: thử làm, lỗi thì xử lý êm đẹp; Go dùng `if err != nil` thay thế |
| finally / defer | Việc dọn dẹp luôn chạy dù lỗi hay không |
| Validate input | Không bao giờ tin người dùng: kiểm tra rỗng, định dạng, khoảng giá trị trước khi dùng |

### Bài tập tự luyện

1. Viết hàm nhận họ tên đầy đủ (vd `"  nguyễn văn an "`), cắt khoảng trắng thừa và in ra tên viết HOA.
2. Ghi danh sách 3 món ăn yêu thích vào file `monan.txt`, mỗi món một dòng, rồi đọc lại và in ra màn hình.
3. Viết hàm kiểm tra email đơn giản: không rỗng, có chứa ký tự `@`, và phần sau `@` có chứa dấu `.`. Trả về thông báo lỗi cụ thể cho từng trường hợp sai.
4. Viết chương trình chia hai số do người dùng nhập; xử lý cả hai lỗi: nhập không phải số, và chia cho 0.
