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

Lưu ý: Python viết gọn `elif`, ba ngôn ngữ còn lại viết đầy đủ `else if`.

> 💡 **Ghi nhớ**: Máy tính kiểm tra các điều kiện **từ trên xuống dưới** và chỉ chạy **nhánh đầu tiên đúng**, rồi bỏ qua tất cả nhánh còn lại. Với điểm 7.5, máy thấy `7.5 >= 8` sai, sang `7.5 >= 6.5` đúng → in "Khá" và dừng, không xét tiếp.

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

> ⚠️ **Lỗi người mới hay gặp**: Nhầm `=` với `==`. Một dấu bằng (`=`) là **gán giá trị** ("cho hộp `x` chứa số 5"), hai dấu bằng (`==`) là **hỏi xem có bằng nhau không**. Viết `if x = 5` thay vì `if x == 5` là lỗi kinh điển — đa số ngôn ngữ sẽ báo lỗi, nhưng đôi khi nó âm thầm chạy sai.

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

Python dùng chữ tiếng Anh dễ đọc: `and`, `or`, `not`. JavaScript, Java và Go dùng ký hiệu: `&&` (và), `||` (hoặc), `!` (phủ định). Ý nghĩa hoàn toàn giống nhau.

> 💡 **Ghi nhớ**: `and` khó tính — chỉ cần một vế sai là cả câu sai. `or` dễ tính — chỉ cần một vế đúng là cả câu đúng.

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

Giải phẫu vòng for "kiểu C" (JavaScript/Java/Go) gồm 3 phần, ngăn cách bởi dấu chấm phẩy:

1. `i := 1` — **khởi tạo**: đặt biến đếm bắt đầu từ 1 (biến `i` như cái máy đếm số lần).
2. `i <= 5` — **điều kiện**: còn đúng thì còn lặp tiếp.
3. `i++` — **bước nhảy**: sau mỗi vòng, tăng `i` thêm 1 (`i++` là viết tắt của `i = i + 1`).

Python đi đường khác: `range(1, 6)` tạo sẵn dãy số rồi `for` duyệt qua từng số. Chú ý `range(1, 6)` **không bao gồm số 6** — tính từ 1 đến *trước* 6.

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

Điểm thú vị: Go **không có** từ khoá `while` — vòng `for` chỉ ghi mỗi điều kiện chính là "while phiên bản Go".

> ⚠️ **Lỗi người mới hay gặp — VÒNG LẶP VÔ HẠN (infinite loop)**: Nếu trong thân vòng `while` bạn **quên thay đổi** thứ liên quan đến điều kiện (ví dụ quên dòng `tien = tien - 30`), điều kiện mãi mãi đúng → chương trình lặp **vĩnh viễn**, treo máy hoặc ngốn CPU. Quy tắc an toàn: mỗi khi viết `while`, tự hỏi ngay *"điều gì trong thân vòng sẽ khiến điều kiện này sai vào một lúc nào đó?"*. Nếu lỡ dính vòng vô hạn, nhấn `Ctrl + C` trong cửa sổ dòng lệnh để ngắt chương trình.

## 4. break và continue — hai nút điều khiển khẩn cấp

Đang lặp giữa chừng, đôi khi bạn muốn:

- **break** ("bẻ gãy"): **thoát hẳn** vòng lặp ngay lập tức. Như đang tìm chìa khoá trong từng túi áo — tìm thấy rồi thì dừng luôn, không cần lục túi còn lại.
- **continue** ("tiếp tục"): **bỏ qua phần còn lại của lượt này**, nhảy ngay sang lượt kế tiếp. Như đang phát quà cho từng người trong hàng — gặp người đã có quà thì bỏ qua, sang người tiếp theo.

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

Ký hiệu `%` gọi là **phép chia lấy dư (modulo)**: `7 % 2` bằng 1 vì 7 chia 2 được 3 **dư 1**. Đây là cách kinh điển để kiểm tra chẵn/lẻ hoặc "chia hết". (JavaScript có `===` — phiên bản so sánh nghiêm ngặt hơn `==`, người mới cứ ưu tiên dùng `===` trong JavaScript.)

> 💡 **Ghi nhớ**: `break` = "tôi xong việc, ra khỏi vòng lặp". `continue` = "lượt này bỏ qua, cho lượt tiếp theo".

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

Kết quả: `1, 2, Fizz, 4, Buzz, Fizz, 7, 8, Fizz, Buzz, 11, Fizz, 13, 14, FizzBuzz`.

> ⚠️ **Lỗi người mới hay gặp**: Đặt nhánh "FizzBuzz" **xuống cuối**. Nhớ rằng if/elif chạy nhánh đầu tiên đúng — số 15 vừa chia hết cho 3, nếu kiểm tra "chia hết cho 3" trước thì máy in "Fizz" rồi dừng, không bao giờ chạm tới "FizzBuzz". **Điều kiện cụ thể nhất phải kiểm tra trước.**

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

Vài chú thích: Java cần bọc mọi thứ trong `class` và hàm `main`, đọc bàn phím qua `Scanner`; Go cần `package main` và `func main`, đọc qua `fmt.Scan`; vòng "lặp mãi mãi" trong Go chỉ đơn giản là `for { }` không điều kiện. Mẫu "lặp vô hạn có chủ đích + `break` khi xong" rất phổ biến — đây là vòng vô hạn **có lối thoát**, khác với vòng vô hạn do quên cập nhật điều kiện ở phần 3.2.

## 7. Lỗi lệch 1 (off-by-one) — kẻ thù thầm lặng

**Off-by-one** là lỗi vòng lặp chạy **thừa hoặc thiếu đúng 1 lần**. Nó phổ biến đến mức có tên riêng.

Hình dung: hàng rào dài 10 mét, mỗi 1 mét cắm một cọc — cần bao nhiêu cọc? Nhiều người trả lời 10, đáp án đúng là **11** (có cọc ở cả hai đầu). Trong lập trình, sai kiểu này xảy ra khi nhầm giữa `<` và `<=`, hoặc quên rằng `range` của Python **không lấy số cuối**:

| Ý định | Viết đúng | Viết sai (lệch 1) |
|--------|-----------|--------------------|
| In 1 → 10 (Python) | `range(1, 11)` | `range(1, 10)` → thiếu số 10 |
| In 1 → 10 (JS/Java/Go) | `i = 1; i <= 10` | `i = 1; i < 10` → thiếu số 10 |
| Lặp đúng 10 lần từ 0 | `i = 0; i < 10` | `i = 0; i <= 10` → thừa 1 lần (11 lần) |

> ⚠️ **Lỗi người mới hay gặp**: Khi vòng lặp cho kết quả "gần đúng nhưng sai sai", việc đầu tiên hãy nghi ngờ lệch 1. Cách kiểm tra nhanh: **thử bằng tay với trường hợp nhỏ** — thay vì 1000 lần, chạy thử 3 lần rồi đếm xem có đúng 3 không, và kiểm tra **giá trị đầu tiên** lẫn **giá trị cuối cùng** có đúng như mong đợi.

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
