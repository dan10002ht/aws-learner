# Hàm: đóng gói logic

Hãy tưởng tượng bạn là chủ một quán phở. Mỗi sáng bạn đều làm đúng một chuỗi việc: ninh xương, trần bánh phở, thái thịt, chan nước dùng. Thay vì mỗi lần có khách lại phải nghĩ lại từng bước, bạn viết hẳn một **công thức** dán lên tường, đặt tên là "Làm một tô phở". Từ đó, ai trong quán cũng chỉ cần nói "làm một tô phở" là xong — không cần đọc lại 20 bước chi tiết.

Trong lập trình, công thức được đặt tên đó gọi là **hàm** (function — một khối lệnh được đặt tên, có thể gọi đi gọi lại nhiều lần). Đây là một trong những khái niệm quan trọng nhất bạn sẽ học, vì gần như toàn bộ phần mềm trên thế giới được xây từ những "công thức" như vậy ghép lại với nhau.

## 1. Vì sao cần hàm? Nguyên tắc DRY

Giả sử bạn cần in lời chào cho 3 người khách. Người mới học thường viết kiểu "copy — dán":

```python
print("Xin chào An! Chúc một ngày tốt lành.")
print("Xin chào Bình! Chúc một ngày tốt lành.")
print("Xin chào Chi! Chúc một ngày tốt lành.")
```
```javascript
console.log("Xin chào An! Chúc một ngày tốt lành.");
console.log("Xin chào Bình! Chúc một ngày tốt lành.");
console.log("Xin chào Chi! Chúc một ngày tốt lành.");
```
```java
System.out.println("Xin chào An! Chúc một ngày tốt lành.");
System.out.println("Xin chào Bình! Chúc một ngày tốt lành.");
System.out.println("Xin chào Chi! Chúc một ngày tốt lành.");
```
```go
fmt.Println("Xin chào An! Chúc một ngày tốt lành.")
fmt.Println("Xin chào Bình! Chúc một ngày tốt lành.")
fmt.Println("Xin chào Chi! Chúc một ngày tốt lành.")
```

Trông không sao... cho đến khi sếp bảo: "Đổi câu chúc thành *Chúc buổi sáng vui vẻ* nhé". Bạn phải sửa **3 chỗ**. Nếu là 300 chỗ thì sao? Chỉ cần quên sửa 1 chỗ là chương trình hiển thị lung tung.

Đây là lúc nguyên tắc **DRY** (Don't Repeat Yourself — "đừng lặp lại chính mình") ra đời: *mỗi mẩu logic chỉ nên được viết ở đúng một nơi*. Khi cần thay đổi, bạn sửa một nơi duy nhất, và mọi chỗ dùng nó tự động được cập nhật.

Hàm chính là công cụ để làm điều đó. Viết lại bằng hàm:

```python
def chao(ten):
    print(f"Xin chào {ten}! Chúc một ngày tốt lành.")

chao("An")
chao("Bình")
chao("Chi")
```
```javascript
function chao(ten) {
  console.log(`Xin chào ${ten}! Chúc một ngày tốt lành.`);
}

chao("An");
chao("Bình");
chao("Chi");
```
```java
static void chao(String ten) {
    System.out.println("Xin chào " + ten + "! Chúc một ngày tốt lành.");
}

// Trong main:
chao("An");
chao("Bình");
chao("Chi");
```
```go
func chao(ten string) {
    fmt.Println("Xin chào " + ten + "! Chúc một ngày tốt lành.")
}

// Trong main:
chao("An")
chao("Bình")
chao("Chi")
```

Khác biệt nhỏ giữa các ngôn ngữ: Python dùng từ khoá `def`, JavaScript dùng `function`, còn Java và Go bắt buộc khai báo **kiểu dữ liệu** của tham số (`String ten`, `ten string`). Trong Java, hàm luôn phải nằm trong một class; trong Go, hàm nằm trong một package và chương trình chạy từ hàm `main`.

Giờ muốn đổi câu chúc? Sửa **đúng 1 dòng** bên trong hàm. Đó là sức mạnh của DRY.

> 💡 **Ghi nhớ:** Định nghĩa hàm giống như viết công thức nấu ăn — viết xong chưa có gì xảy ra cả. Phải **gọi hàm** (viết tên hàm kèm dấu ngoặc, ví dụ `chao("An")`) thì code bên trong mới thực sự chạy.

## 2. Tham số: "nguyên liệu" đưa vào hàm

Trong ví dụ trên, `ten` là **tham số** (parameter — biến giữ chỗ trong định nghĩa hàm), còn `"An"`, `"Bình"` là **đối số** (argument — giá trị thật được truyền vào lúc gọi). Bạn có thể hình dung:

| Khái niệm | Analogy đời thường | Ví dụ |
|---|---|---|
| Hàm | Công thức "pha trà sữa" | `phaTraSua(...)` |
| Tham số | Ô trống trong công thức: "___ thìa đường" | `soThiaDuong` |
| Đối số | Con số thật khách yêu cầu: 2 thìa | `phaTraSua(2)` |

Một hàm có thể nhận nhiều tham số, ngăn cách bằng dấu phẩy:

```python
def tinh_tien(don_gia, so_luong):
    print(don_gia * so_luong)

tinh_tien(30000, 2)   # in ra 60000
```
```javascript
function tinhTien(donGia, soLuong) {
  console.log(donGia * soLuong);
}

tinhTien(30000, 2);   // in ra 60000
```
```java
static void tinhTien(int donGia, int soLuong) {
    System.out.println(donGia * soLuong);
}

tinhTien(30000, 2);   // in ra 60000
```
```go
func tinhTien(donGia int, soLuong int) {
    fmt.Println(donGia * soLuong)
}

tinhTien(30000, 2)   // in ra 60000
```

> ⚠️ **Lỗi người mới hay gặp:** Truyền đối số **sai thứ tự**. Nếu gọi `tinhTien(2, 30000)` thì kết quả nhân vẫn đúng (vì phép nhân giao hoán), nhưng với hàm kiểu `chuyenTien(nguoiGui, nguoiNhan)` mà đảo thứ tự thì... tiền đi nhầm người! Thứ tự đối số phải khớp đúng thứ tự tham số.

## 3. Giá trị trả về: hàm "đưa lại" kết quả

Hàm `tinhTien` ở trên có một hạn chế: nó chỉ **in** kết quả ra màn hình. Nhưng nếu bạn muốn lấy số tiền đó để cộng tiếp vào hoá đơn, hoặc trừ khuyến mãi thì sao? In ra màn hình rồi thì không "bắt" lại được nữa.

Giải pháp là cho hàm **trả về** (return) kết quả — giống như bạn nhờ người đi chợ: thay vì họ về kể "tôi thấy rau 10 nghìn" (chỉ in ra), họ **đưa tận tay** bó rau cho bạn để bạn nấu tiếp.

```python
def tinh_tien(don_gia, so_luong):
    return don_gia * so_luong

tien_pho = tinh_tien(50000, 2)
tien_tra = tinh_tien(30000, 1)
tong = tien_pho + tien_tra
print(tong)   # 130000
```
```javascript
function tinhTien(donGia, soLuong) {
  return donGia * soLuong;
}

const tienPho = tinhTien(50000, 2);
const tienTra = tinhTien(30000, 1);
const tong = tienPho + tienTra;
console.log(tong);   // 130000
```
```java
static int tinhTien(int donGia, int soLuong) {
    return donGia * soLuong;
}

int tienPho = tinhTien(50000, 2);
int tienTra = tinhTien(30000, 1);
int tong = tienPho + tienTra;
System.out.println(tong);   // 130000
```
```go
func tinhTien(donGia int, soLuong int) int {
    return donGia * soLuong
}

tienPho := tinhTien(50000, 2)
tienTra := tinhTien(30000, 1)
tong := tienPho + tienTra
fmt.Println(tong)   // 130000
```

Lưu ý: ở Java và Go, bạn phải khai báo **kiểu của giá trị trả về** (chữ `int` trước/sau tên hàm). Hàm không trả về gì thì Java ghi `void`, Go bỏ trống, còn Python/JavaScript không cần ghi gì.

Hai điều quan trọng về `return`:

1. **`return` kết thúc hàm ngay lập tức.** Code đứng sau dòng `return` (trong cùng nhánh) sẽ không bao giờ chạy.
2. **In ra (`print`) khác với trả về (`return`).** `print` chỉ hiện chữ cho con người xem; `return` đưa giá trị cho chương trình dùng tiếp.

> ⚠️ **Lỗi người mới hay gặp:** Viết hàm dùng `print` thay vì `return`, rồi thắc mắc tại sao `tong = tinhTien(...) + 5` ra kết quả lạ (ở Python là lỗi vì hàm trả về `None`, ở JavaScript ra `NaN`). Quy tắc: nếu kết quả cần được **dùng tiếp**, hãy `return`; chỉ `print` khi mục đích duy nhất là hiển thị.

## 4. Scope: biến "sống" ở đâu?

**Scope** (phạm vi biến — vùng code mà một biến tồn tại và dùng được) là khái niệm khiến nhiều người mới bối rối. Hãy nghĩ thế này: mỗi hàm giống một **căn phòng riêng**. Đồ đạc (biến) tạo ra trong phòng nào thì chỉ dùng được trong phòng đó; bước ra khỏi phòng là đồ biến mất.

```python
def tinh_thue():
    thue = 0.1          # biến cục bộ, chỉ sống trong hàm
    print(thue)

tinh_thue()
# print(thue)  # LỖI! Bên ngoài không nhìn thấy 'thue'
```
```javascript
function tinhThue() {
  const thue = 0.1;     // biến cục bộ, chỉ sống trong hàm
  console.log(thue);
}

tinhThue();
// console.log(thue);  // LỖI! Bên ngoài không nhìn thấy 'thue'
```
```java
static void tinhThue() {
    double thue = 0.1;  // biến cục bộ, chỉ sống trong hàm
    System.out.println(thue);
}

tinhThue();
// System.out.println(thue);  // LỖI BIÊN DỊCH! Không nhìn thấy 'thue'
```
```go
func tinhThue() {
    thue := 0.1         // biến cục bộ, chỉ sống trong hàm
    fmt.Println(thue)
}

tinhThue()
// fmt.Println(thue)  // LỖI BIÊN DỊCH! Không nhìn thấy 'thue'
```

Biến tạo **bên trong hàm** gọi là **biến cục bộ** (local variable). Biến tạo **bên ngoài mọi hàm** gọi là **biến toàn cục** (global variable) — giống đồ đặt ở sảnh chung, phòng nào cũng nhìn thấy được.

Vậy tại sao không cho mọi biến ra "sảnh chung" cho tiện? Vì khi chương trình lớn lên, ai cũng có thể vô tình sửa biến toàn cục, và bạn sẽ không biết lỗi từ đâu ra — giống như để ví tiền ở sảnh chung cư: tiện thật, nhưng ai cũng đụng vào được.

> 💡 **Ghi nhớ:** Cách trao đổi dữ liệu lành mạnh giữa các hàm là: đưa vào qua **tham số**, lấy ra qua **giá trị trả về**. Hạn chế tối đa biến toàn cục — chương trình của bạn sẽ dễ hiểu và dễ sửa hơn rất nhiều.

Một điểm hay nữa: tham số cũng là biến cục bộ. Hai hàm khác nhau có thể cùng đặt tên tham số là `x` mà không hề "đụng hàng", giống như hai căn phòng đều có thể có một chiếc ghế tên "ghế của tôi".

## 5. Hàm gọi hàm: xây tháp từ những viên gạch

Sức mạnh thật sự của hàm xuất hiện khi các hàm **gọi lẫn nhau**. Quay lại quán phở: công thức "Làm một tô phở" không tự mô tả cách ninh xương — nó chỉ ghi "bước 1: làm theo công thức Ninh xương". Công thức lớn được ghép từ các công thức nhỏ.

Ví dụ tính hoá đơn có thuế VAT:

```python
def tinh_tien_hang(don_gia, so_luong):
    return don_gia * so_luong

def tinh_thue(tien):
    return tien * 0.1

def tinh_hoa_don(don_gia, so_luong):
    tien_hang = tinh_tien_hang(don_gia, so_luong)
    thue = tinh_thue(tien_hang)
    return tien_hang + thue

print(tinh_hoa_don(50000, 2))   # 110000.0
```
```javascript
function tinhTienHang(donGia, soLuong) {
  return donGia * soLuong;
}

function tinhThue(tien) {
  return tien * 0.1;
}

function tinhHoaDon(donGia, soLuong) {
  const tienHang = tinhTienHang(donGia, soLuong);
  const thue = tinhThue(tienHang);
  return tienHang + thue;
}

console.log(tinhHoaDon(50000, 2));   // 110000
```
```java
static int tinhTienHang(int donGia, int soLuong) {
    return donGia * soLuong;
}

static double tinhThue(int tien) {
    return tien * 0.1;
}

static double tinhHoaDon(int donGia, int soLuong) {
    int tienHang = tinhTienHang(donGia, soLuong);
    double thue = tinhThue(tienHang);
    return tienHang + thue;
}

System.out.println(tinhHoaDon(50000, 2));   // 110000.0
```
```go
func tinhTienHang(donGia int, soLuong int) int {
    return donGia * soLuong
}

func tinhThue(tien int) float64 {
    return float64(tien) * 0.1
}

func tinhHoaDon(donGia int, soLuong int) float64 {
    tienHang := tinhTienHang(donGia, soLuong)
    thue := tinhThue(tienHang)
    return float64(tienHang) + thue
}

fmt.Println(tinhHoaDon(50000, 2))   // 110000
```

(Ở Java và Go, vì thuế là số thập phân nên kiểu trả về là `double`/`float64`; Go còn yêu cầu đổi kiểu tường minh bằng `float64(...)` — Go rất nghiêm khắc chuyện trộn kiểu số.)

Hãy để ý `tinhHoaDon` đọc lên **gần như văn xuôi**: tính tiền hàng, tính thuế, cộng lại. Mỗi hàm nhỏ làm **một việc**, và hàm lớn chỉ "chỉ huy" các hàm nhỏ. Đây chính là cách mọi phần mềm lớn — từ Facebook đến game — được xây: hàng nghìn hàm nhỏ gọi lẫn nhau, mỗi hàm một nhiệm vụ rõ ràng.

> 💡 **Ghi nhớ:** Một hàm tốt làm **một việc duy nhất** và làm tốt việc đó. Nếu bạn phải dùng chữ "và" để mô tả hàm ("hàm này tính tiền *và* gửi email *và* in hoá đơn") — đó là dấu hiệu nên tách thành nhiều hàm.

## 6. Đặt tên hàm: viết cho người đọc

Máy tính không quan tâm bạn đặt tên hàm là gì — `xyz()` hay `tinhThue()` đều chạy như nhau. Nhưng **đồng nghiệp của bạn** (và chính bạn của 3 tháng sau) thì rất quan tâm. Tên hàm tốt là một dạng tài liệu miễn phí.

Vài quy tắc vàng:

| Quy tắc | Tên tệ ❌ | Tên tốt ✅ |
|---|---|---|
| Bắt đầu bằng động từ (hàm là hành động) | `thue()` | `tinhThue()` |
| Nói rõ làm gì, không mơ hồ | `xuLy()`, `lam1()` | `guiEmailXacNhan()` |
| Hàm trả về đúng/sai nên đọc như câu hỏi | `kiemTra()` | `laSoChan()`, `isEmpty()` |
| Không viết tắt khó hiểu | `tT_hD()` | `tinhHoaDon()` |
| Tên khớp với việc thực làm | `tinhThue()` mà lại gửi email | tách riêng hai hàm |

Về **kiểu viết tên**, mỗi ngôn ngữ có thông lệ riêng (không bắt buộc nhưng cả cộng đồng tuân theo):

- **Python**: `snake_case` — chữ thường, nối bằng gạch dưới: `tinh_hoa_don`
- **JavaScript, Java, Go**: `camelCase` — viết hoa chữ đầu mỗi từ từ từ thứ hai: `tinhHoaDon`
- **Go** có thêm quy tắc đặc biệt: hàm viết hoa chữ cái đầu (`TinhHoaDon`) sẽ được "xuất khẩu" cho package khác dùng; viết thường thì chỉ dùng nội bộ.

> ⚠️ **Lỗi người mới hay gặp:** Đặt tên kiểu `ham1`, `ham2`, `test`, `abc` vì "để sau đổi". Sự thật là chẳng ai quay lại đổi cả, và 2 tuần sau chính bạn cũng không nhớ `ham2` làm gì. Dành 30 giây nghĩ tên tốt ngay từ đầu — đó là khoản đầu tư lãi nhất trong lập trình.

## 7. Thực hành: refactor code lặp thành hàm

**Refactor** (tái cấu trúc — sửa lại cách viết code cho sạch hơn mà **không đổi** hành vi của chương trình) là kỹ năng bạn sẽ dùng cả đời. Bài tập kinh điển nhất: phát hiện đoạn code lặp và gói nó vào hàm.

Đề bài: chương trình tính điểm trung bình và xếp loại cho 2 học sinh. Phiên bản "copy — dán":

```python
# Học sinh 1
tb1 = (8 + 7 + 9) / 3
if tb1 >= 8:
    print("An: Giỏi")
else:
    print("An: Khá")

# Học sinh 2 — lặp y hệt!
tb2 = (6 + 9 + 10) / 3
if tb2 >= 8:
    print("Bình: Giỏi")
else:
    print("Bình: Khá")
```
```javascript
// Học sinh 1
const tb1 = (8 + 7 + 9) / 3;
if (tb1 >= 8) {
  console.log("An: Giỏi");
} else {
  console.log("An: Khá");
}

// Học sinh 2 — lặp y hệt!
const tb2 = (6 + 9 + 10) / 3;
if (tb2 >= 8) {
  console.log("Bình: Giỏi");
} else {
  console.log("Bình: Khá");
}
```
```java
// Học sinh 1
double tb1 = (8 + 7 + 9) / 3.0;
if (tb1 >= 8) {
    System.out.println("An: Giỏi");
} else {
    System.out.println("An: Khá");
}

// Học sinh 2 — lặp y hệt!
double tb2 = (6 + 9 + 10) / 3.0;
if (tb2 >= 8) {
    System.out.println("Bình: Giỏi");
} else {
    System.out.println("Bình: Khá");
}
```
```go
// Học sinh 1
tb1 := (8.0 + 7 + 9) / 3
if tb1 >= 8 {
    fmt.Println("An: Giỏi")
} else {
    fmt.Println("An: Khá")
}

// Học sinh 2 — lặp y hệt!
tb2 := (6.0 + 9 + 10) / 3
if tb2 >= 8 {
    fmt.Println("Bình: Giỏi")
} else {
    fmt.Println("Bình: Khá")
}
```

Quy trình refactor gồm 3 bước:

1. **Tìm phần lặp**: cấu trúc "tính trung bình → so sánh → in" xuất hiện 2 lần.
2. **Tìm phần khác nhau giữa các lần lặp**: tên học sinh và 3 điểm số → đó chính là **tham số**.
3. **Gói phần lặp vào hàm**, biến phần khác nhau thành tham số:

```python
def trung_binh(d1, d2, d3):
    return (d1 + d2 + d3) / 3

def xep_loai(diem_tb):
    if diem_tb >= 8:
        return "Giỏi"
    return "Khá"

def bao_cao(ten, d1, d2, d3):
    tb = trung_binh(d1, d2, d3)
    print(f"{ten}: {xep_loai(tb)}")

bao_cao("An", 8, 7, 9)
bao_cao("Bình", 6, 9, 10)
```
```javascript
function trungBinh(d1, d2, d3) {
  return (d1 + d2 + d3) / 3;
}

function xepLoai(diemTb) {
  if (diemTb >= 8) return "Giỏi";
  return "Khá";
}

function baoCao(ten, d1, d2, d3) {
  const tb = trungBinh(d1, d2, d3);
  console.log(`${ten}: ${xepLoai(tb)}`);
}

baoCao("An", 8, 7, 9);
baoCao("Bình", 6, 9, 10);
```
```java
static double trungBinh(double d1, double d2, double d3) {
    return (d1 + d2 + d3) / 3;
}

static String xepLoai(double diemTb) {
    if (diemTb >= 8) return "Giỏi";
    return "Khá";
}

static void baoCao(String ten, double d1, double d2, double d3) {
    double tb = trungBinh(d1, d2, d3);
    System.out.println(ten + ": " + xepLoai(tb));
}

baoCao("An", 8, 7, 9);
baoCao("Bình", 6, 9, 10);
```
```go
func trungBinh(d1, d2, d3 float64) float64 {
    return (d1 + d2 + d3) / 3
}

func xepLoai(diemTb float64) string {
    if diemTb >= 8 {
        return "Giỏi"
    }
    return "Khá"
}

func baoCao(ten string, d1, d2, d3 float64) {
    tb := trungBinh(d1, d2, d3)
    fmt.Println(ten + ": " + xepLoai(tb))
}

baoCao("An", 8, 7, 9)
baoCao("Bình", 6, 9, 10)
```

Thêm học sinh thứ 100? Chỉ cần thêm **1 dòng** `baoCao(...)`. Muốn đổi tiêu chuẩn "Giỏi" từ 8 xuống 7.5? Sửa **1 con số** trong `xepLoai`. So với bản copy — dán phải sửa hàng trăm chỗ, bạn vừa tận mắt thấy DRY đáng giá thế nào.

> 💡 **Ghi nhớ — quy tắc số 3:** Lặp code lần thứ nhất: chấp nhận được. Lần thứ hai: bắt đầu khó chịu. Đến lần thứ ba: dừng lại và refactor thành hàm. Đừng đợi đến lần thứ ba mươi.

## Tóm tắt

| Khái niệm | Một câu chốt |
|---|---|
| Hàm | Khối lệnh được đặt tên, định nghĩa một lần, gọi nhiều lần |
| DRY | Mỗi mẩu logic chỉ viết ở một nơi duy nhất |
| Tham số / đối số | Ô trống trong công thức / giá trị thật điền vào khi gọi |
| `return` | Đưa kết quả ra ngoài để dùng tiếp (khác với `print` chỉ để xem) |
| Scope | Biến trong hàm là "đồ trong phòng riêng", bên ngoài không thấy |
| Hàm gọi hàm | Ghép hàm nhỏ thành hàm lớn, mỗi hàm một việc |
| Tên hàm tốt | Động từ + rõ nghĩa; tên là tài liệu miễn phí |
| Refactor | Tìm phần lặp → phần khác nhau thành tham số → gói vào hàm |

Bài sau, chúng ta sẽ dùng hàm kết hợp với **cấu trúc dữ liệu** (danh sách, từ điển) để xử lý không chỉ 2 học sinh mà cả nghìn học sinh chỉ với vài dòng code.
