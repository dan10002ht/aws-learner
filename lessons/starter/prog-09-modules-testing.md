# Module, package & viết test

Khi chương trình lớn dần, gom tất cả vào một file là con đường nhanh nhất dẫn tới hỗn loạn. Bài này dạy bạn **chia code thành module**, **dùng package của người khác qua trình quản lý gói**, và **viết test** để mỗi lần sửa code bạn không phải hồi hộp cầu nguyện.

## Vì sao tách code thành nhiều file?

Một file 2000 dòng có vài vấn đề rất thực tế:

- Tìm một hàm phải cuộn mỏi tay.
- Hai người không thể sửa cùng lúc mà không đụng độ.
- Mọi thứ dính chùm: sửa chỗ này, vỡ chỗ kia mà không biết.

Tách thành **module** (mỗi file lo một việc) giúp code **dễ đọc, dễ tái sử dụng, dễ test**. Nguyên tắc vàng: *một module nên có một trách nhiệm rõ ràng*. File `payment` lo thanh toán, file `email` lo gửi mail — đừng trộn.

> 💡 Ghi nhớ: "Module" chỉ là một file (hoặc thư mục) chứa code có liên quan. "Package" là một nhóm module được đóng gói để chia sẻ. Tách nhỏ không phải để màu mè, mà để **giới hạn vùng ảnh hưởng khi thay đổi**.

## Import / Export giữa các file

Khi đã tách file, ta cần cơ chế để file này **dùng** hàm của file kia. Đó là `import` / `export`.

Giả sử ta có một module `mathutils` cung cấp hàm cộng và một hằng số:

```python
# mathutils.py
PI = 3.14159

def add(a, b):
    return a + b
```
```javascript
// mathutils.js
export const PI = 3.14159;

export function add(a, b) {
  return a + b;
}
```
```java
// MathUtils.java
public class MathUtils {
    public static final double PI = 3.14159;

    public static int add(int a, int b) {
        return a + b;
    }
}
```
```go
// mathutils.go
package mathutils

const PI = 3.14159

func Add(a, b int) int {
    return a + b
}
```

```cpp
// mathutils.h
#ifndef MATHUTILS_H
#define MATHUTILS_H

constexpr double PI = 3.14159;

int add(int a, int b) {
    return a + b;
}

#endif
```

Và file chính dùng lại nó:

```python
# main.py
from mathutils import add, PI

print(add(2, 3))   # 5
print(PI)          # 3.14159
```
```javascript
// main.js
import { add, PI } from "./mathutils.js";

console.log(add(2, 3));  // 5
console.log(PI);         // 3.14159
```
```java
// Main.java
public class Main {
    public static void main(String[] args) {
        System.out.println(MathUtils.add(2, 3));  // 5
        System.out.println(MathUtils.PI);         // 3.14159
    }
}
```
```go
// main.go
package main

import (
    "fmt"
    "example.com/app/mathutils"
)

func main() {
    fmt.Println(mathutils.Add(2, 3)) // 5
    fmt.Println(mathutils.PI)        // 3.14159
}
```

```cpp
// main.cpp
#include <iostream>
#include "mathutils.h"

int main() {
    std::cout << add(2, 3) << "\n"; // 5
    std::cout << PI << "\n";        // 3.14159
}
```

Điểm cần nhớ về cách mỗi ngôn ngữ "phơi bày" thứ ra ngoài:

| Ngôn ngữ | Cách export | Cách import |
|----------|-------------|-------------|
| Python | Mọi thứ ở cấp module mặc định "public" | `from mathutils import add` |
| JavaScript (ESM) | Phải ghi rõ `export` | `import { add } from "./mathutils.js"` |
| Java | `public` trên class/method | Cùng package thì tự thấy, khác thì `import` |
| Go | Tên **viết hoa** = export ra ngoài | `import "đường-dẫn/mathutils"` rồi gọi `mathutils.Add` |

> ⚠️ Lỗi người mới hay gặp: Trong Go, đặt tên hàm `add` (chữ thường) rồi cố gọi từ package khác sẽ **không thấy**. Quy ước `Add` viết hoa mới là export. Còn trong JS ESM, quên `export` thì `import` sẽ ra `undefined`, không báo lỗi rõ ràng — rất khó chịu.

## Package manager & dependency

Bạn sẽ không tự viết mọi thứ. Cần gọi HTTP, xử lý ngày tháng, parse JSON — đã có người viết sẵn và đóng gói thành **package**. Trình quản lý gói (package manager) giúp bạn **tải về và quản lý phiên bản** chúng.

| Ngôn ngữ | Package manager | File khai báo phụ thuộc |
|----------|-----------------|--------------------------|
| Python | `pip` | `requirements.txt` |
| JavaScript | `npm` (hoặc yarn, pnpm) | `package.json` |
| Java | Maven / Gradle | `pom.xml` / `build.gradle` |
| Go | `go` modules | `go.mod` |

Cài một package:

```python
# pip cài thư viện gửi HTTP "requests"
pip install requests
```
```javascript
// npm cài thư viện ngày tháng "dayjs"
npm install dayjs
```
```java
// Maven: thêm dependency vào pom.xml rồi:
mvn install
```
```go
// Go tự thêm vào go.mod khi build:
go get github.com/google/uuid
```

```cpp
// vcpkg: cài thư viện tạo UUID "stduuid"
vcpkg install stduuid
```

Mỗi package có **dependency** riêng — nó lại phụ thuộc các package khác. Đó là cây phụ thuộc (dependency tree). Bạn cài 1 gói, đôi khi kéo theo 20 gói con. Trình quản lý gói lo việc đó tự động.

**Phiên bản (version)** rất quan trọng. Một dòng như `dayjs@^1.11.0` nghĩa là "chấp nhận bản 1.11.0 trở lên nhưng dưới 2.0". Ghim phiên bản giúp dự án của bạn chạy giống nhau trên mọi máy.

> 💡 Ghi nhớ: Luôn commit file khai báo phụ thuộc (`requirements.txt`, `package.json`, `go.mod`) vào git. Người khác clone về chỉ cần một lệnh là cài đủ đồ — không phải đoán xem cần thư viện gì.

## Virtual env & node_modules — cách ly phụ thuộc

Vấn đề: dự án A cần `requests` bản 2.20, dự án B cần bản 2.30. Nếu cài chung vào hệ thống, chúng đè nhau. Giải pháp là **cách ly từng dự án**.

- **Python**: `virtual environment` (venv) — một thư mục riêng chứa Python và các package cho riêng dự án này.
- **JavaScript**: thư mục `node_modules` ngay trong dự án — npm cài package vào đó, không đụng máy khác.
- **Java/Go**: phụ thuộc được tải về cache cục bộ và khoá theo phiên bản trong file build/`go.mod`.

```python
# Tạo và kích hoạt virtual env (Python)
python -m venv venv
source venv/bin/activate     # macOS / Linux
pip install requests
```
```javascript
// npm tự tạo node_modules/ trong thư mục dự án
npm install
// -> mọi package nằm gọn trong ./node_modules
```
```java
// Maven tải dependency về ~/.m2/repository và khoá version trong pom.xml
mvn install
```
```go
// Go tải về module cache, khoá chính xác trong go.sum
go mod tidy
```

```cpp
// vcpkg cài package vào thư mục cục bộ và khoá version trong vcpkg.json
vcpkg install
```

> ⚠️ Lỗi người mới hay gặp: **Đừng bao giờ commit `node_modules/` hay thư mục `venv/`** lên git. Chúng nặng hàng trăm MB và tái tạo được từ file khai báo. Thêm chúng vào `.gitignore`.

## Viết unit test — vì sao và như thế nào

**Unit test** là đoạn code nhỏ kiểm tra một đơn vị code (thường là một hàm) chạy đúng như mong đợi. Lợi ích lớn nhất không phải "bắt bug hôm nay" mà là **sự tự tin khi sửa code ngày mai**: bạn đổi hàm, chạy test, xanh hết — yên tâm là không làm hỏng cái cũ.

Cốt lõi của mọi test là **`assert`**: "khẳng định điều này đúng, nếu sai thì báo lỗi".

```python
def add(a, b):
    return a + b

assert add(2, 3) == 5
assert add(-1, 1) == 0
```
```javascript
function add(a, b) {
  return a + b;
}

console.assert(add(2, 3) === 5);
console.assert(add(-1, 1) === 0);
```
```java
import static org.junit.jupiter.api.Assertions.assertEquals;

assertEquals(5, MathUtils.add(2, 3));
assertEquals(0, MathUtils.add(-1, 1));
```
```go
if got := Add(2, 3); got != 5 {
    t.Errorf("Add(2,3) = %d; muốn 5", got)
}
```

```cpp
#include <cassert>

int add(int a, int b) {
    return a + b;
}

assert(add(2, 3) == 5);
assert(add(-1, 1) == 0);
```

### Dùng test framework

Viết `assert` thủ công thì được, nhưng **test framework** cho ta cách tổ chức, chạy hàng loạt và báo cáo đẹp. Phổ biến: **pytest** (Python), **Jest** (JS), **JUnit** (Java), gói `testing` (Go).

```python
# test_math.py  -> chạy: pytest
from mathutils import add

def test_add_positive():
    assert add(2, 3) == 5

def test_add_negative():
    assert add(-1, -1) == -2
```
```javascript
// math.test.js  -> chạy: npx jest
import { add } from "./mathutils.js";

test("cộng số dương", () => {
  expect(add(2, 3)).toBe(5);
});

test("cộng số âm", () => {
  expect(add(-1, -1)).toBe(-2);
});
```
```java
// MathUtilsTest.java  -> chạy bằng JUnit
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class MathUtilsTest {
    @Test
    void addPositive() {
        assertEquals(5, MathUtils.add(2, 3));
    }

    @Test
    void addNegative() {
        assertEquals(-2, MathUtils.add(-1, -1));
    }
}
```
```go
// mathutils_test.go  -> chạy: go test
package mathutils

import "testing"

func TestAddPositive(t *testing.T) {
    if got := Add(2, 3); got != 5 {
        t.Errorf("Add(2,3) = %d; muốn 5", got)
    }
}

func TestAddNegative(t *testing.T) {
    if got := Add(-1, -1); got != -2 {
        t.Errorf("Add(-1,-1) = %d; muốn -2", got)
    }
}
```

```cpp
// math_test.cpp  -> chạy bằng GoogleTest
#include <gtest/gtest.h>
#include "mathutils.h"

TEST(MathUtils, AddPositive) {
    EXPECT_EQ(add(2, 3), 5);
}

TEST(MathUtils, AddNegative) {
    EXPECT_EQ(add(-1, -1), -2);
}
```

Để ý quy ước: tên file thường có `test` (`test_*.py`, `*.test.js`, `*_test.go`), và framework tự **tìm rồi chạy** mọi hàm test cho bạn.

### Test cái gì?

Đừng test những thứ hiển nhiên. Hãy tập trung vào:

- **Trường hợp bình thường**: đầu vào điển hình cho ra kết quả đúng.
- **Trường hợp biên (edge case)**: số 0, danh sách rỗng, chuỗi rỗng, số âm, giá trị cực lớn.
- **Trường hợp lỗi**: đầu vào sai có ném lỗi đúng như mong đợi không?

| Loại test | Ví dụ cho hàm `divide(a, b)` |
|-----------|------------------------------|
| Bình thường | `divide(10, 2) == 5` |
| Biên | `divide(0, 5) == 0` |
| Lỗi | `divide(10, 0)` phải báo lỗi chia cho 0 |

### AAA pattern — bố cục một test tốt

Mỗi test nên gồm 3 phần rõ ràng, gọi là **AAA**:

1. **Arrange** (Sắp xếp): chuẩn bị dữ liệu, đối tượng đầu vào.
2. **Act** (Hành động): gọi hàm cần kiểm tra.
3. **Assert** (Khẳng định): so sánh kết quả thực với kết quả mong đợi.

```python
def test_total_with_tax():
    # Arrange
    cart = [10, 20, 30]
    tax_rate = 0.1
    # Act
    result = total_with_tax(cart, tax_rate)
    # Assert
    assert result == 66
```
```javascript
test("tổng tiền có thuế", () => {
  // Arrange
  const cart = [10, 20, 30];
  const taxRate = 0.1;
  // Act
  const result = totalWithTax(cart, taxRate);
  // Assert
  expect(result).toBe(66);
});
```
```java
@Test
void totalWithTax() {
    // Arrange
    int[] cart = {10, 20, 30};
    double taxRate = 0.1;
    // Act
    double result = Order.totalWithTax(cart, taxRate);
    // Assert
    assertEquals(66, result);
}
```
```go
func TestTotalWithTax(t *testing.T) {
    // Arrange
    cart := []int{10, 20, 30}
    taxRate := 0.1
    // Act
    result := TotalWithTax(cart, taxRate)
    // Assert
    if result != 66 {
        t.Errorf("muốn 66, nhận %v", result)
    }
}
```

```cpp
TEST(Order, TotalWithTax) {
    // Arrange
    std::vector<int> cart = {10, 20, 30};
    double taxRate = 0.1;
    // Act
    double result = totalWithTax(cart, taxRate);
    // Assert
    EXPECT_EQ(result, 66);
}
```

Tách rõ 3 khối giúp người đọc hiểu ngay test đang kiểm tra điều gì, và khi test đỏ bạn biết ngay sai ở bước nào.

> 💡 Ghi nhớ: Một test tốt là **độc lập** (không phụ thuộc test khác), **lặp lại được** (chạy 100 lần đều ra kết quả như nhau), và **kiểm tra đúng một thứ**. Tên test nên mô tả hành vi: `test_add_negative`, không phải `test1`.

> ⚠️ Lỗi người mới hay gặp: Viết test rồi cho nó luôn xanh bằng cách... so sánh kết quả với chính output của hàm (`assert add(2,3) == add(2,3)`). Như vậy test không kiểm tra gì cả. Luôn so với **giá trị mong đợi tự tính tay** (`== 5`).

## Tóm tắt

- **Module** chia code theo trách nhiệm, dùng `import`/`export` để liên kết. Mỗi ngôn ngữ có cú pháp riêng nhưng ý tưởng giống nhau.
- **Package manager** (pip, npm, Maven, go modules) tải và quản lý phiên bản thư viện bên ngoài; luôn commit file khai báo phụ thuộc.
- **Cách ly phụ thuộc** bằng venv / `node_modules` để dự án không đụng nhau; đừng commit chúng vào git.
- **Unit test** dựa trên `assert`, tổ chức bằng framework (pytest/Jest/JUnit/`testing`).
- Test **trường hợp bình thường, biên và lỗi**; viết theo **AAA** (Arrange – Act – Assert).
- Giá trị thật của test: cho bạn **tự tin sửa code** mà không sợ làm vỡ thứ đang chạy.
