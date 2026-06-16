# Chương trình đầu tiên: biến & kiểu dữ liệu

Chào mừng bạn đến với bài học đầu tiên của hành trình lập trình! Trong bài này, chúng ta sẽ viết những dòng lệnh đầu tiên, học cách "nói chuyện" với máy tính, và làm quen với những viên gạch cơ bản nhất: **biến** (variable) và **kiểu dữ liệu** (data type). Không cần biết gì trước — chúng ta bắt đầu từ con số 0.

## 1. Chương trình là gì?

Hãy tưởng tượng bạn đưa cho một người bạn **công thức nấu phở**: bước 1 ninh xương, bước 2 chần bánh phở, bước 3 chan nước dùng... Người bạn đó làm **đúng từng bước, theo đúng thứ tự**, không tự sáng tạo gì thêm.

**Chương trình** (program) chính là một "công thức" như vậy, nhưng:

- Người thực hiện là **máy tính** — cực kỳ nhanh, cực kỳ chính xác, nhưng **hoàn toàn không có khả năng "đoán ý"**. Bạn viết sai một dấu chấm, nó dừng lại ngay.
- Công thức được viết bằng **ngôn ngữ lập trình** (programming language) — một loại "ngôn ngữ trung gian" mà cả người và máy đều hiểu được.

Trong khoá học này, chúng ta học song song **4 ngôn ngữ phổ biến**: Python, JavaScript, Java và Go. Đừng lo — ý tưởng cốt lõi giống hệt nhau, chỉ khác "giọng nói". Bạn chỉ cần đọc kỹ **một** ngôn ngữ mình thích, và liếc qua các ngôn ngữ còn lại để thấy sự tương đồng.

> 💡 Ghi nhớ: Chương trình = một dãy **lệnh** (instruction) được máy tính thực hiện **tuần tự từ trên xuống dưới**, từng dòng một.

## 2. Lệnh đầu tiên: in ra màn hình

"In ra màn hình" (print) nghĩa là bảo máy tính **hiển thị chữ** lên cửa sổ kết quả (gọi là console hay terminal — màn hình đen chữ trắng mà lập trình viên hay dùng). Đây là cách máy tính "nói" lại với chúng ta.

Truyền thống lâu đời của dân lập trình: chương trình đầu tiên luôn in ra dòng chữ "Hello, World!" (Xin chào, thế giới!). Chúng ta sẽ in tiếng Việt cho thân thuộc:

```python
print("Xin chào, thế giới!")
```
```javascript
console.log("Xin chào, thế giới!");
```
```java
public class Main {
    public static void main(String[] args) {
        System.out.println("Xin chào, thế giới!");
    }
}
```
```go
package main

import "fmt"

func main() {
    fmt.Println("Xin chào, thế giới!")
}
```

```cpp
#include <iostream>

int main() {
    std::cout << "Xin chào, thế giới!" << std::endl;
}
```

Bạn sẽ thấy ngay sự khác biệt về "độ dài dòng": Python và JavaScript chỉ cần 1 dòng, còn Java bắt buộc phải bọc lệnh trong một `class` và hàm `main` (điểm bắt đầu của chương trình), Go cần khai báo `package main` và `import "fmt"` (gói chứa lệnh in). Từ giờ trở đi, với Java và Go, **bạn hiểu ngầm rằng code luôn nằm bên trong khung `main` đó** — các ví dụ sau sẽ chỉ viết phần lõi cho gọn.

Mấy điểm cần để ý:

| Thành phần | Ý nghĩa |
|---|---|
| `print`, `console.log`, `System.out.println`, `fmt.Println` | Tên lệnh "in ra màn hình" của từng ngôn ngữ |
| Dấu ngoặc tròn `( )` | Bọc lấy "thứ cần in" |
| Dấu ngoặc kép `" "` | Đánh dấu một đoạn **chữ** (văn bản) |
| Dấu chấm phẩy `;` | JavaScript/Java dùng để kết thúc lệnh; Python/Go không cần |

> ⚠️ Lỗi người mới hay gặp: Quên dấu ngoặc kép, quên đóng ngoặc tròn, hoặc gõ sai chữ hoa/thường (ví dụ `Print` thay vì `print` trong Python). Máy tính phân biệt hoa thường **tuyệt đối** — `print` và `Print` là hai thứ khác nhau!

## 3. Biến — chiếc hộp đựng giá trị

### 3.1. Ý tưởng

Tưởng tượng bạn có nhiều **chiếc hộp**, mỗi hộp dán một **nhãn tên**. Bạn bỏ đồ vào hộp, sau này cần thì gọi đúng tên hộp để lấy đồ ra.

**Biến** (variable) chính là chiếc hộp đó:

- **Tên biến** = nhãn dán trên hộp (do bạn tự đặt).
- **Giá trị** (value) = món đồ bên trong (con số, đoạn chữ...).
- **Gán** (assign) = hành động bỏ đồ vào hộp, viết bằng dấu `=`.

Lưu ý quan trọng: trong lập trình, dấu `=` **không** có nghĩa "bằng nhau" như toán học, mà nghĩa là **"lấy thứ bên phải, bỏ vào hộp bên trái"**.

```python
tuoi = 18
ten = "Lan"
print(ten)
print(tuoi)
```
```javascript
let tuoi = 18;
let ten = "Lan";
console.log(ten);
console.log(tuoi);
```
```java
int tuoi = 18;
String ten = "Lan";
System.out.println(ten);
System.out.println(tuoi);
```
```go
tuoi := 18
ten := "Lan"
fmt.Println(ten)
fmt.Println(tuoi)
```

```cpp
int tuoi = 18;
std::string ten = "Lan";
std::cout << ten << std::endl;
std::cout << tuoi << std::endl;
```

Khác biệt đáng chú ý: Python chỉ cần `tên = giá_trị`. JavaScript thêm từ khoá `let` (báo "tôi tạo hộp mới"). Java bắt bạn **khai báo trước loại đồ** hộp sẽ chứa (`int` = số nguyên, `String` = chuỗi chữ). Go dùng `:=` khi tạo hộp mới và tự đoán loại đồ.

### 3.2. Thay đổi giá trị trong hộp

Biến gọi là "biến" vì giá trị bên trong **có thể thay đổi**: bỏ đồ mới vào thì đồ cũ bị thay thế.

```python
diem = 7
diem = 9   # bỏ 9 vào hộp, số 7 cũ biến mất
print(diem)  # in ra: 9
```
```javascript
let diem = 7;
diem = 9;   // bỏ 9 vào hộp, số 7 cũ biến mất
console.log(diem);  // in ra: 9
```
```java
int diem = 7;
diem = 9;   // bỏ 9 vào hộp, số 7 cũ biến mất
System.out.println(diem);  // in ra: 9
```
```go
diem := 7
diem = 9   // bỏ 9 vào hộp, số 7 cũ biến mất
fmt.Println(diem)  // in ra: 9
```

```cpp
int diem = 7;
diem = 9;   // bỏ 9 vào hộp, số 7 cũ biến mất
std::cout << diem << std::endl;  // in ra: 9
```

Để ý: phần chữ sau dấu `#` (Python) hoặc `//` (3 ngôn ngữ còn lại) là **chú thích** (comment) — ghi chú dành cho người đọc, máy tính bỏ qua hoàn toàn. Và ở Go, lần gán thứ hai dùng `=` chứ không phải `:=`, vì hộp đã tồn tại rồi.

### 3.3. Quy tắc đặt tên biến

- Dùng chữ cái, chữ số, dấu gạch dưới `_`; **không bắt đầu bằng chữ số**, không có dấu cách.
- Đặt tên **có nghĩa**: `tuoi`, `tong_tien` tốt hơn `x`, `a1`.
- Không dùng tiếng Việt có dấu trong tên biến (về kỹ thuật đôi khi được, nhưng quy ước chung là không).

> 💡 Ghi nhớ: Biến = hộp có nhãn tên. Dấu `=` là "đổ giá trị vào hộp", đọc từ **phải sang trái**. Vì vậy `x = x + 1` là hợp lệ: lấy giá trị cũ của x, cộng 1, rồi bỏ ngược lại vào hộp x.

## 4. Kiểu dữ liệu — đồ trong hộp thuộc loại gì?

Đồ trong hộp có nhiều loại: tiền, thư từ, quần áo... Mỗi loại có cách xử lý khác nhau (tiền thì đếm được, thư thì đọc được). Tương tự, giá trị trong biến có **kiểu dữ liệu** (data type). Ba kiểu cơ bản nhất:

| Kiểu | Tên tiếng Anh | Ví dụ | Dùng để |
|---|---|---|---|
| Số nguyên | integer (int) | `18`, `-5`, `0` | Đếm, tính toán không lẻ |
| Số thực | float / double | `3.14`, `-0.5` | Tính toán có phần thập phân |
| Chuỗi | string | `"Xin chào"`, `"18"` | Văn bản, chữ |
| Đúng/Sai | boolean (bool) | `true` / `false` | Trả lời câu hỏi có/không |

```python
so_nguyen = 42          # int
so_thuc = 3.14          # float
chuoi = "Học lập trình" # str
dung_sai = True         # bool (Python viết hoa True/False)
```
```javascript
let soNguyen = 42;            // number
let soThuc = 3.14;            // number (JS gộp chung một kiểu số)
let chuoi = "Học lập trình";  // string
let dungSai = true;           // boolean
```
```java
int soNguyen = 42;
double soThuc = 3.14;
String chuoi = "Học lập trình";
boolean dungSai = true;
```
```go
soNguyen := 42            // int
soThuc := 3.14            // float64
chuoi := "Học lập trình"  // string
dungSai := true           // bool
```

```cpp
int soNguyen = 42;                 // int
double soThuc = 3.14;              // double
std::string chuoi = "Học lập trình"; // string
bool dungSai = true;               // bool
```

Chú thích nhanh: Python viết `True`/`False` viết hoa; ba ngôn ngữ kia viết thường `true`/`false`. JavaScript không phân biệt số nguyên và số thực — tất cả đều là `number`.

### 4.1. Vì sao kiểu lại quan trọng? Số `5` khác chuỗi `"5"`!

Đây là cú "vỡ lẽ" đầu tiên của mọi người mới học: `5` (con số) và `"5"` (ký tự số năm viết trong ngoặc kép) là **hai thứ hoàn toàn khác nhau**. Giống như **tờ tiền 50.000đ** và **tấm ảnh chụp tờ tiền 50.000đ** — trông giống nhau nhưng chỉ một cái tiêu được.

Với số, dấu `+` là **phép cộng**. Với chuỗi, dấu `+` là **nối chữ** (ghép hai đoạn văn bản lại):

```python
print(5 + 3)      # 8  (cộng số)
print("5" + "3")  # "53" (nối chuỗi!)
```
```javascript
console.log(5 + 3);      // 8  (cộng số)
console.log("5" + "3");  // "53" (nối chuỗi!)
```
```java
System.out.println(5 + 3);      // 8  (cộng số)
System.out.println("5" + "3");  // "53" (nối chuỗi!)
```
```go
fmt.Println(5 + 3)      // 8  (cộng số)
fmt.Println("5" + "3")  // "53" (nối chuỗi!)
```

```cpp
#include <string>
using namespace std::string_literals;
std::cout << 5 + 3 << std::endl;        // 8  (cộng số)
std::cout << ("5"s + "3"s) << std::endl; // "53" (nối chuỗi!)
```

> ⚠️ Lỗi người mới hay gặp: Tưởng `"5" + "3"` ra `8`. Không! Hễ có ngoặc kép là **chữ**, và `+` với chữ là phép **ghép**. Đây là nguồn gốc của vô số bug (lỗi chương trình) ngoài đời thực.

## 5. Chuyển kiểu — đổi "ảnh chụp tiền" thành "tiền thật"

Nhiều khi ta cầm chuỗi `"25"` nhưng cần con số `25` để tính toán (ví dụ dữ liệu người dùng gõ vào luôn là chuỗi). Khi đó ta **chuyển kiểu** (type conversion / casting):

```python
chuoi_tuoi = "25"
tuoi = int(chuoi_tuoi)      # chuỗi -> số nguyên
print(tuoi + 5)             # 30
nguoc_lai = str(tuoi)       # số -> chuỗi: "25"
```
```javascript
let chuoiTuoi = "25";
let tuoi = Number(chuoiTuoi);   // chuỗi -> số
console.log(tuoi + 5);          // 30
let nguocLai = String(tuoi);    // số -> chuỗi: "25"
```
```java
String chuoiTuoi = "25";
int tuoi = Integer.parseInt(chuoiTuoi);  // chuỗi -> số nguyên
System.out.println(tuoi + 5);            // 30
String nguocLai = String.valueOf(tuoi);  // số -> chuỗi: "25"
```
```go
chuoiTuoi := "25"
tuoi, _ := strconv.Atoi(chuoiTuoi)  // chuỗi -> số nguyên (cần import "strconv")
fmt.Println(tuoi + 5)               // 30
nguocLai := strconv.Itoa(tuoi)      // số -> chuỗi: "25"
```

```cpp
std::string chuoiTuoi = "25";
int tuoi = std::stoi(chuoiTuoi);          // chuỗi -> số nguyên
std::cout << tuoi + 5 << std::endl;       // 30
std::string nguocLai = std::to_string(tuoi); // số -> chuỗi: "25"
```

Chú thích: Go trả về **hai** kết quả khi chuyển kiểu (giá trị + lỗi nếu chuỗi không phải số); dấu `_` nghĩa là "tạm bỏ qua phần lỗi" — bài sau sẽ học cách xử lý tử tế. Java dùng `Integer.parseInt` cho số nguyên và `Double.parseDouble` cho số thực.

> ⚠️ Lỗi người mới hay gặp: Chuyển chuỗi không phải số, ví dụ `int("hai mươi")` — chương trình sẽ **báo lỗi và dừng** (Python: `ValueError`, Java: `NumberFormatException`...). Chỉ chuyển được chuỗi có nội dung đúng là con số.

## 6. Nhập từ bàn phím — máy tính lắng nghe bạn

Chương trình sẽ thú vị hơn nhiều khi biết **hỏi** người dùng. Ta dùng lệnh đọc dữ liệu từ bàn phím (input). Lưu ý vàng: **thứ người dùng gõ vào luôn được nhận về dưới dạng chuỗi** (ở Python/JavaScript), nên muốn tính toán phải chuyển kiểu!

Ví dụ: hỏi tên và năm sinh, rồi tính tuổi (năm hiện tại 2026):

```python
ten = input("Bạn tên gì? ")
nam_sinh = int(input("Năm sinh của bạn? "))
tuoi = 2026 - nam_sinh
print("Chào " + ten + ", năm nay bạn " + str(tuoi) + " tuổi!")
```
```javascript
// Chạy bằng Node.js: dùng module readline (cách phổ biến nhất)
const readline = require("readline/promises");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const ten = await rl.question("Bạn tên gì? ");
const namSinh = Number(await rl.question("Năm sinh của bạn? "));
const tuoi = 2026 - namSinh;
console.log("Chào " + ten + ", năm nay bạn " + tuoi + " tuổi!");
rl.close();
```
```java
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.print("Bạn tên gì? ");
        String ten = sc.nextLine();
        System.out.print("Năm sinh của bạn? ");
        int namSinh = Integer.parseInt(sc.nextLine());
        int tuoi = 2026 - namSinh;
        System.out.println("Chào " + ten + ", năm nay bạn " + tuoi + " tuổi!");
    }
}
```
```go
package main

import (
    "bufio"
    "fmt"
    "os"
    "strconv"
    "strings"
)

func main() {
    reader := bufio.NewReader(os.Stdin)
    fmt.Print("Bạn tên gì? ")
    ten, _ := reader.ReadString('\n')
    ten = strings.TrimSpace(ten)
    fmt.Print("Năm sinh của bạn? ")
    dong, _ := reader.ReadString('\n')
    namSinh, _ := strconv.Atoi(strings.TrimSpace(dong))
    tuoi := 2026 - namSinh
    fmt.Println("Chào " + ten + ", năm nay bạn " + strconv.Itoa(tuoi) + " tuổi!")
}
```

```cpp
#include <iostream>
#include <string>

int main() {
    std::string ten;
    int namSinh;
    std::cout << "Bạn tên gì? ";
    std::getline(std::cin, ten);
    std::cout << "Năm sinh của bạn? ";
    std::cin >> namSinh;
    int tuoi = 2026 - namSinh;
    std::cout << "Chào " << ten << ", năm nay bạn " << tuoi << " tuổi!" << std::endl;
}
```

Chú thích: phần nhập liệu là chỗ 4 ngôn ngữ khác nhau nhiều nhất. Python gọn nhất với `input()`. Java dùng `Scanner` (máy quét bàn phím). Go phải đọc cả dòng rồi cắt bỏ ký tự xuống dòng bằng `TrimSpace`. JavaScript trong trình duyệt còn có cách siêu ngắn là `prompt("câu hỏi")`. Đừng cố thuộc lòng — cứ tra lại mẫu này khi cần, ai cũng vậy cả.

> 💡 Ghi nhớ: Quy trình kinh điển của mọi chương trình: **Nhập (input) → Xử lý (process) → Xuất (output)**. Ví dụ trên có đủ cả ba: hỏi năm sinh → lấy 2026 trừ đi → in lời chào.

## 7. Lỗi syntax đầu đời — đừng sợ chữ đỏ!

**Syntax** (cú pháp) là "ngữ pháp" của ngôn ngữ lập trình. Viết sai ngữ pháp — quên ngoặc, sai chính tả lệnh, thiếu dấu — máy tính sẽ từ chối chạy và in ra **thông báo lỗi** (error message). Tin vui: thông báo lỗi không phải lời mắng, mà là **bản chỉ đường** giúp bạn sửa.

Ví dụ cố tình viết sai (quên đóng ngoặc kép):

```python
print("Xin chào)
# SyntaxError: unterminated string literal (detected at line 1)
```
```javascript
console.log("Xin chào);
// SyntaxError: Invalid or unexpected token
```
```java
System.out.println("Xin chào);
// error: unclosed string literal
```
```go
fmt.Println("Xin chào)
// syntax error: ... string literal not terminated
```

```cpp
std::cout << "Xin chào;
// error: missing terminating '"' character
```

### Cách đọc một thông báo lỗi (kỹ năng quan trọng nhất bài này!)

Một thông báo lỗi thường có 3 phần, đọc theo thứ tự:

1. **Tên file và số dòng** — lỗi nằm ở đâu? Ví dụ `line 1` = dòng 1. (Đôi khi lỗi thật nằm ở dòng **ngay phía trên** dòng được báo.)
2. **Loại lỗi** — ví dụ `SyntaxError` = sai ngữ pháp, `NameError` = gọi tên biến chưa tồn tại, `TypeError` = dùng sai kiểu dữ liệu.
3. **Mô tả chi tiết** — ví dụ `unterminated string literal` = "chuỗi chưa được kết thúc" → bạn quên đóng ngoặc kép.

Một vài lỗi "kinh điển" của người mới:

| Bạn viết | Lỗi báo gì | Nguyên nhân |
|---|---|---|
| `prnt("Hi")` | NameError / not defined | Gõ sai tên lệnh `print` |
| `print("Hi"` | SyntaxError / unexpected end | Thiếu ngoặc tròn đóng `)` |
| `print(tuoi)` khi chưa tạo `tuoi` | NameError / cannot find symbol | Dùng hộp chưa tồn tại |
| `"5" + 3` (Python) | TypeError | Cộng chuỗi với số — Python từ chối |

> ⚠️ Lỗi người mới hay gặp: Thấy chữ đỏ là hoảng, đóng luôn chương trình. Đừng! Hãy **đọc dòng cuối cùng** của thông báo (thường là phần dễ hiểu nhất), tìm số dòng, nhìn kỹ dòng đó và dòng phía trên. 90% lỗi đầu đời chỉ là gõ thiếu/thừa một ký tự.

> 💡 Ghi nhớ: Lập trình viên giỏi không phải người không bao giờ gặp lỗi, mà là người **đọc lỗi nhanh và sửa nhanh**. Mỗi thông báo lỗi là một bài học miễn phí.

## 8. Tổng kết & bài tập tự luyện

### Những điều cốt lõi

- **Chương trình** = dãy lệnh, máy chạy tuần tự từ trên xuống.
- **In ra màn hình** là cách máy "nói" với ta; mỗi ngôn ngữ có lệnh in riêng nhưng ý nghĩa như nhau.
- **Biến** = hộp có nhãn; dấu `=` là gán (đổ giá trị vào hộp), không phải "bằng" toán học.
- **Kiểu dữ liệu**: số nguyên, số thực, chuỗi, boolean. `5` khác `"5"`!
- **Chuyển kiểu** khi cần tính toán trên dữ liệu dạng chuỗi; nhập từ bàn phím thường trả về chuỗi.
- **Lỗi syntax** là chuyện thường ngày — đọc số dòng, loại lỗi, mô tả, rồi sửa.

### Bài tập (làm bằng ngôn ngữ bạn chọn)

1. In ra màn hình họ tên đầy đủ của bạn và một câu châm ngôn yêu thích (2 dòng riêng biệt).
2. Tạo 3 biến: `ten` (chuỗi), `chieu_cao` (số thực, đơn vị mét), `thich_lap_trinh` (boolean). In cả 3 ra màn hình.
3. Viết chương trình hỏi người dùng **hai con số**, rồi in ra tổng của chúng. (Bẫy: nhớ chuyển kiểu, nếu không bạn sẽ nhận được `"53"` thay vì `8`!)
4. Cố tình tạo 3 lỗi syntax khác nhau (xoá một ngoặc, gõ sai tên lệnh, dùng biến chưa khai báo), chạy thử, và **đọc to** thông báo lỗi: lỗi loại gì, ở dòng mấy?

Bài sau, chúng ta sẽ dạy chương trình biết **suy nghĩ và lựa chọn** với câu lệnh điều kiện `if/else`. Hẹn gặp lại!
