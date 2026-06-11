# Hướng đối tượng cơ bản

Cho đến giờ, chúng ta đã biết viết chương trình bằng biến, hàm, vòng lặp. Nhưng khi chương trình lớn dần — quản lý hàng nghìn khách hàng, hàng nghìn sản phẩm — cách viết "rời rạc" đó bắt đầu rối. **Lập trình hướng đối tượng** (Object-Oriented Programming, viết tắt **OOP** — cách tổ chức code xoay quanh các "đối tượng" mô phỏng sự vật thật) ra đời để giải quyết vấn đề này.

## 1. Vì sao cần OOP? Mô hình hoá thế giới

Hãy tưởng tượng bạn viết phần mềm quản lý ngân hàng. Mỗi khách hàng có:

- **Thông tin**: tên, số tài khoản, số dư.
- **Hành động**: gửi tiền, rút tiền, xem số dư.

Nếu không có OOP, bạn phải tạo hàng loạt biến rời rạc: `ten_khach_1`, `so_du_khach_1`, `ten_khach_2`, `so_du_khach_2`... rồi viết hàm `rut_tien(ten, so_du, so_tien)` và cầu nguyện mình không truyền nhầm số dư của khách này cho khách kia. Với 10.000 khách hàng thì đây là ác mộng.

OOP nói: **hãy gói thông tin và hành động liên quan vào chung một "đối tượng"**, giống ngoài đời — mỗi khách hàng là một con người hoàn chỉnh, tự mang theo tên và ví tiền của mình, chứ không phải một đống giấy tờ vứt lung tung.

> 💡 Ghi nhớ: OOP = mô hình hoá thế giới thật vào code. Mỗi "thứ" trong bài toán (khách hàng, tài khoản, sản phẩm, xe hơi...) trở thành một **đối tượng** tự chứa dữ liệu và hành vi của chính nó.

## 2. Class và Object: khuôn bánh và chiếc bánh

Đây là hai khái niệm nền tảng nhất:

| Khái niệm | Tiếng Anh | Analogy đời thường |
|---|---|---|
| **Class** (lớp) | class | **Khuôn bánh** — bản thiết kế, mô tả bánh sẽ có hình gì, vị gì |
| **Object** (đối tượng) | object / instance | **Chiếc bánh** — sản phẩm thật được đúc ra từ khuôn |

Từ **một** khuôn bánh, bạn đúc được **nhiều** chiếc bánh. Các bánh giống nhau về cấu trúc (đều có hình tròn, đều có nhân) nhưng mỗi chiếc là một thực thể riêng (bánh này nhân đậu, bánh kia nhân thịt). Tương tự:

- Class `KhachHang` mô tả: mọi khách hàng đều có *tên* và *số dư*.
- Object `khach_a` là khách hàng cụ thể tên "An", số dư 500.000đ.
- Object `khach_b` là khách hàng cụ thể tên "Bình", số dư 2.000.000đ.

Hành động tạo object từ class gọi là **khởi tạo** (instantiate — "đúc bánh từ khuôn").

Hãy xem class đơn giản nhất có thể — một khuôn `Cho` (chó) và đúc ra hai chú chó:

```python
class Cho:
    pass  # khuôn rỗng, chưa có gì

cho_1 = Cho()  # đúc chiếc bánh thứ nhất
cho_2 = Cho()  # đúc chiếc bánh thứ hai
print(cho_1 is cho_2)  # False — hai đối tượng khác nhau
```
```javascript
class Cho {
  // khuôn rỗng, chưa có gì
}

const cho1 = new Cho(); // đúc chiếc bánh thứ nhất
const cho2 = new Cho(); // đúc chiếc bánh thứ hai
console.log(cho1 === cho2); // false — hai đối tượng khác nhau
```
```java
class Cho {
    // khuôn rỗng, chưa có gì
}

public class Main {
    public static void main(String[] args) {
        Cho cho1 = new Cho(); // đúc chiếc bánh thứ nhất
        Cho cho2 = new Cho(); // đúc chiếc bánh thứ hai
        System.out.println(cho1 == cho2); // false — hai đối tượng khác nhau
    }
}
```
```go
package main

import "fmt"

type Cho struct {
	// khuôn rỗng, chưa có gì
}

func main() {
	cho1 := &Cho{} // đúc chiếc bánh thứ nhất
	cho2 := &Cho{} // đúc chiếc bánh thứ hai
	fmt.Println(cho1 == cho2) // false — hai đối tượng khác nhau
}
```

Chú thích khác biệt: Python tạo object bằng `Cho()`, JavaScript và Java dùng từ khoá `new`. Go không có từ khoá `class` — Go dùng `struct` (cấu trúc dữ liệu) đóng vai trò tương đương khuôn. Java bắt buộc mọi code chạy nằm trong một class có hàm `main`.

## 3. Thuộc tính và phương thức

Một object có hai thành phần:

| Thành phần | Tiếng Anh | Là gì | Ví dụ với "con chó" |
|---|---|---|---|
| **Thuộc tính** | attribute / field / property | Dữ liệu mà object **có** | tên, tuổi, màu lông |
| **Phương thức** | method | Hành động mà object **làm được** | sủa, chạy, ăn |

Phương thức thực chất là **hàm được gắn vào class** — chỉ object của class đó mới gọi được, và nó được phép truy cập thuộc tính của chính object đó. Analogy: "sủa" là kỹ năng của con chó; bạn không thể bảo cái bàn "sủa" được.

Cú pháp gọi rất đặc trưng: `đối_tượng.phương_thức()` — dấu chấm đọc là "của". `cho_1.sua()` nghĩa là "gọi hành động sủa **của** con chó số 1".

## 4. Constructor: dây chuyền đổ nhân bánh

Khi đúc bánh, bạn cần đổ nhân ngay lúc đúc — không ai đúc bánh rỗng rồi nhét nhân sau. Trong OOP, **constructor** (hàm khởi tạo — hàm đặc biệt tự chạy đúng một lần khi object được tạo) làm việc đó: nhận nguyên liệu (tên, tuổi...) và gán vào thuộc tính của object mới.

Bên trong constructor và các phương thức, ta cần một cách để chỉ "chính object đang được xử lý" — đó là `self` (Python), `this` (JavaScript/Java), hoặc receiver (Go). Hiểu nôm na: khi con chó An sủa, `self` chính là "tôi — con An", để phân biệt với con Bình.

Ví dụ class `Cho` đầy đủ với thuộc tính, constructor và phương thức:

```python
class Cho:
    def __init__(self, ten, tuoi):   # constructor
        self.ten = ten               # gán thuộc tính
        self.tuoi = tuoi

    def sua(self):                   # phương thức
        print(f"{self.ten}: Gâu gâu!")

cho_an = Cho("An", 3)
cho_binh = Cho("Bình", 5)
cho_an.sua()          # An: Gâu gâu!
cho_binh.sua()        # Bình: Gâu gâu!
print(cho_an.tuoi)    # 3
```
```javascript
class Cho {
  constructor(ten, tuoi) {  // constructor
    this.ten = ten;         // gán thuộc tính
    this.tuoi = tuoi;
  }

  sua() {                   // phương thức
    console.log(`${this.ten}: Gâu gâu!`);
  }
}

const choAn = new Cho("An", 3);
const choBinh = new Cho("Bình", 5);
choAn.sua();              // An: Gâu gâu!
choBinh.sua();            // Bình: Gâu gâu!
console.log(choAn.tuoi);  // 3
```
```java
class Cho {
    String ten;   // khai báo thuộc tính
    int tuoi;

    Cho(String ten, int tuoi) {  // constructor (trùng tên class)
        this.ten = ten;          // gán thuộc tính
        this.tuoi = tuoi;
    }

    void sua() {                 // phương thức
        System.out.println(ten + ": Gâu gâu!");
    }
}

public class Main {
    public static void main(String[] args) {
        Cho choAn = new Cho("An", 3);
        Cho choBinh = new Cho("Bình", 5);
        choAn.sua();                     // An: Gâu gâu!
        choBinh.sua();                   // Bình: Gâu gâu!
        System.out.println(choAn.tuoi);  // 3
    }
}
```
```go
package main

import "fmt"

type Cho struct {
	Ten  string // thuộc tính
	Tuoi int
}

// Go không có constructor riêng; quy ước viết hàm NewXxx
func NewCho(ten string, tuoi int) *Cho {
	return &Cho{Ten: ten, Tuoi: tuoi}
}

// Phương thức: hàm có "receiver" (c *Cho) phía trước tên
func (c *Cho) Sua() {
	fmt.Println(c.Ten + ": Gâu gâu!")
}

func main() {
	choAn := NewCho("An", 3)
	choBinh := NewCho("Bình", 5)
	choAn.Sua()             // An: Gâu gâu!
	choBinh.Sua()           // Bình: Gâu gâu!
	fmt.Println(choAn.Tuoi) // 3
}
```

Chú thích khác biệt:

- **Python**: constructor có tên cố định kỳ lạ `__init__`, và `self` phải viết tường minh làm tham số đầu tiên của mọi phương thức.
- **JavaScript**: constructor tên cố định `constructor`; `this` có sẵn, không khai báo.
- **Java**: constructor **trùng tên class**; thuộc tính phải khai báo kèm kiểu dữ liệu trước.
- **Go**: không có constructor — lập trình viên tự viết hàm `NewCho` theo quy ước. Phương thức là hàm gắn "receiver" `(c *Cho)`; `c` chính là `self`.

> ⚠️ Lỗi người mới hay gặp: trong Python, quên `self.` khi gán (`ten = ten` thay vì `self.ten = ten`) — biến chỉ sống tạm trong hàm rồi biến mất, object không lưu gì cả. Trong JavaScript, quên từ khoá `new` khi tạo object cũng gây lỗi tương tự khó hiểu.

## 5. Ví dụ trọn vẹn: Tài khoản ngân hàng

Giờ áp dụng tất cả vào bài toán thực tế. Class `TaiKhoanNganHang` cần:

- **Thuộc tính**: `chu_tk` (chủ tài khoản), `so_du` (số dư).
- **Phương thức**: `gui_tien(so_tien)`, `rut_tien(so_tien)` — và rút tiền phải **kiểm tra đủ số dư**. Đây chính là cái hay của OOP: logic "không cho rút quá số dư" nằm ngay trong object, không ai từ bên ngoài bỏ qua được kiểm tra này.

```python
class TaiKhoanNganHang:
    def __init__(self, chu_tk, so_du_ban_dau):
        self.chu_tk = chu_tk
        self.so_du = so_du_ban_dau

    def gui_tien(self, so_tien):
        self.so_du += so_tien
        print(f"{self.chu_tk} gửi {so_tien}. Số dư: {self.so_du}")

    def rut_tien(self, so_tien):
        if so_tien > self.so_du:
            print(f"{self.chu_tk}: không đủ số dư!")
        else:
            self.so_du -= so_tien
            print(f"{self.chu_tk} rút {so_tien}. Số dư: {self.so_du}")

tk = TaiKhoanNganHang("Lan", 100)
tk.gui_tien(50)    # Lan gửi 50. Số dư: 150
tk.rut_tien(200)   # Lan: không đủ số dư!
tk.rut_tien(120)   # Lan rút 120. Số dư: 30
```
```javascript
class TaiKhoanNganHang {
  constructor(chuTk, soDuBanDau) {
    this.chuTk = chuTk;
    this.soDu = soDuBanDau;
  }

  guiTien(soTien) {
    this.soDu += soTien;
    console.log(`${this.chuTk} gửi ${soTien}. Số dư: ${this.soDu}`);
  }

  rutTien(soTien) {
    if (soTien > this.soDu) {
      console.log(`${this.chuTk}: không đủ số dư!`);
    } else {
      this.soDu -= soTien;
      console.log(`${this.chuTk} rút ${soTien}. Số dư: ${this.soDu}`);
    }
  }
}

const tk = new TaiKhoanNganHang("Lan", 100);
tk.guiTien(50);   // Lan gửi 50. Số dư: 150
tk.rutTien(200);  // Lan: không đủ số dư!
tk.rutTien(120);  // Lan rút 120. Số dư: 30
```
```java
class TaiKhoanNganHang {
    String chuTk;
    int soDu;

    TaiKhoanNganHang(String chuTk, int soDuBanDau) {
        this.chuTk = chuTk;
        this.soDu = soDuBanDau;
    }

    void guiTien(int soTien) {
        soDu += soTien;
        System.out.println(chuTk + " gửi " + soTien + ". Số dư: " + soDu);
    }

    void rutTien(int soTien) {
        if (soTien > soDu) {
            System.out.println(chuTk + ": không đủ số dư!");
        } else {
            soDu -= soTien;
            System.out.println(chuTk + " rút " + soTien + ". Số dư: " + soDu);
        }
    }
}

public class Main {
    public static void main(String[] args) {
        TaiKhoanNganHang tk = new TaiKhoanNganHang("Lan", 100);
        tk.guiTien(50);   // Lan gửi 50. Số dư: 150
        tk.rutTien(200);  // Lan: không đủ số dư!
        tk.rutTien(120);  // Lan rút 120. Số dư: 30
    }
}
```
```go
package main

import "fmt"

type TaiKhoanNganHang struct {
	ChuTk string
	SoDu  int
}

func NewTaiKhoan(chuTk string, soDuBanDau int) *TaiKhoanNganHang {
	return &TaiKhoanNganHang{ChuTk: chuTk, SoDu: soDuBanDau}
}

func (t *TaiKhoanNganHang) GuiTien(soTien int) {
	t.SoDu += soTien
	fmt.Printf("%s gửi %d. Số dư: %d\n", t.ChuTk, soTien, t.SoDu)
}

func (t *TaiKhoanNganHang) RutTien(soTien int) {
	if soTien > t.SoDu {
		fmt.Printf("%s: không đủ số dư!\n", t.ChuTk)
	} else {
		t.SoDu -= soTien
		fmt.Printf("%s rút %d. Số dư: %d\n", t.ChuTk, soTien, t.SoDu)
	}
}

func main() {
	tk := NewTaiKhoan("Lan", 100)
	tk.GuiTien(50)   // Lan gửi 50. Số dư: 150
	tk.RutTien(200)  // Lan: không đủ số dư!
	tk.RutTien(120)  // Lan rút 120. Số dư: 30
}
```

Hãy để ý điều quan trọng: bên ngoài chỉ cần gọi `tk.rut_tien(200)` — **không cần biết** bên trong kiểm tra ra sao. Object tự bảo vệ dữ liệu của mình. Nguyên tắc "giấu chi tiết bên trong, chỉ phơi ra hành động" gọi là **encapsulation** (đóng gói) — một trong những trụ cột của OOP.

> 💡 Ghi nhớ: mỗi object có **bản sao dữ liệu riêng**. Tạo `tk2 = TaiKhoanNganHang("Hùng", 999)` thì `tk2` rút tiền không ảnh hưởng gì đến số dư của `tk` — giống hai chiếc bánh, cắn bánh này không làm vơi bánh kia.

> ⚠️ Lỗi người mới hay gặp: nhầm class với object. Viết `TaiKhoanNganHang.rut_tien(50)` (gọi trên **khuôn**) sẽ lỗi — khuôn bánh không ăn được! Phải tạo object trước (`tk = TaiKhoanNganHang(...)`) rồi gọi trên object: `tk.rut_tien(50)`.

## 6. Kế thừa: con nhà tông

**Kế thừa** (inheritance — class mới tự động nhận thuộc tính và phương thức của class có sẵn) giúp tránh viết lại code trùng lặp. Analogy: con cái thừa hưởng đặc điểm của bố mẹ, rồi có thêm nét riêng.

Ví dụ ngân hàng có `TaiKhoanTietKiem` (tài khoản tiết kiệm): nó **vẫn là** một tài khoản (vẫn gửi/rút tiền được y hệt), chỉ **thêm** khả năng tính lãi. Thay vì chép lại toàn bộ code, ta cho nó *kế thừa* `TaiKhoanNganHang`:

```python
class TaiKhoanTietKiem(TaiKhoanNganHang):  # kế thừa
    def tinh_lai(self):
        lai = int(self.so_du * 0.05)
        self.gui_tien(lai)  # dùng lại phương thức của "bố mẹ"

tk = TaiKhoanTietKiem("Mai", 1000)
tk.rut_tien(100)   # thừa hưởng: Mai rút 100. Số dư: 900
tk.tinh_lai()      # riêng có:   Mai gửi 45. Số dư: 945
```
```javascript
class TaiKhoanTietKiem extends TaiKhoanNganHang { // kế thừa
  tinhLai() {
    const lai = Math.floor(this.soDu * 0.05);
    this.guiTien(lai); // dùng lại phương thức của "bố mẹ"
  }
}

const tk = new TaiKhoanTietKiem("Mai", 1000);
tk.rutTien(100);  // thừa hưởng: Mai rút 100. Số dư: 900
tk.tinhLai();     // riêng có:   Mai gửi 45. Số dư: 945
```
```java
class TaiKhoanTietKiem extends TaiKhoanNganHang { // kế thừa
    TaiKhoanTietKiem(String chuTk, int soDuBanDau) {
        super(chuTk, soDuBanDau); // gọi constructor của "bố mẹ"
    }

    void tinhLai() {
        int lai = (int) (soDu * 0.05);
        guiTien(lai); // dùng lại phương thức của "bố mẹ"
    }
}

public class Main {
    public static void main(String[] args) {
        TaiKhoanTietKiem tk = new TaiKhoanTietKiem("Mai", 1000);
        tk.rutTien(100); // thừa hưởng: Mai rút 100. Số dư: 900
        tk.tinhLai();    // riêng có:   Mai gửi 45. Số dư: 945
    }
}
```
```go
package main

import "fmt"

// Go không có kế thừa; dùng "nhúng" (embedding) struct cho hiệu quả tương tự
type TaiKhoanTietKiem struct {
	TaiKhoanNganHang // nhúng — tự có mọi thuộc tính/phương thức của nó
}

func (t *TaiKhoanTietKiem) TinhLai() {
	lai := t.SoDu * 5 / 100
	t.GuiTien(lai) // dùng lại phương thức được nhúng
}

func main() {
	tk := &TaiKhoanTietKiem{TaiKhoanNganHang{ChuTk: "Mai", SoDu: 1000}}
	tk.RutTien(100) // thừa hưởng: Mai rút 100. Số dư: 900
	tk.TinhLai()    // riêng có:   Mai gửi 45. Số dư: 945
}
```

Chú thích khác biệt: Python ghi class cha trong ngoặc `(TaiKhoanNganHang)`; JavaScript và Java dùng từ khoá `extends` (Java còn cần `super(...)` để gọi constructor cha). Go **không có kế thừa** thực sự — thay vào đó dùng **embedding** (nhúng struct này vào struct kia), kết quả sử dụng gần giống nhau.

Thuật ngữ: class gốc gọi là **class cha** (parent / superclass), class kế thừa gọi là **class con** (child / subclass). Quan hệ kế thừa đọc là "**là một**" (is-a): tài khoản tiết kiệm *là một* tài khoản ngân hàng.

> ⚠️ Lỗi người mới hay gặp: lạm dụng kế thừa cho mọi thứ. Chỉ kế thừa khi quan hệ "là một" đúng nghĩa. `Xe là một PhuongTien` ✓; nhưng `XeHoi kế thừa BanhXe` ✗ — xe hơi không *là* bánh xe, xe hơi *có* bánh xe (quan hệ "có một" thì dùng thuộc tính).

## 7. Tóm tắt

| Khái niệm | Analogy | Một câu chốt |
|---|---|---|
| Class | Khuôn bánh | Bản thiết kế, mô tả thuộc tính + phương thức |
| Object | Chiếc bánh | Thực thể cụ thể đúc từ class, có dữ liệu riêng |
| Thuộc tính | Nhân bánh | Dữ liệu object **có** (`ten`, `so_du`) |
| Phương thức | Kỹ năng | Hành động object **làm** (`rut_tien()`) |
| Constructor | Đổ nhân lúc đúc | Hàm tự chạy khi tạo object, gán giá trị ban đầu |
| `self` / `this` | "Chính tôi" | Cách object tự chỉ vào bản thân trong phương thức |
| Kế thừa | Con nhà tông | Class con nhận sẵn mọi thứ của class cha, thêm nét riêng |

**Bài tập tự luyện**: viết class `HocSinh` có thuộc tính `ten` và `diem` (danh sách điểm), phương thức `them_diem(d)` và `diem_trung_binh()`. Sau đó viết class `HocSinhGioi` kế thừa `HocSinh`, thêm phương thức `nhan_thuong()` chỉ in lời khen khi điểm trung bình ≥ 8. Thử cài bằng cả 4 ngôn ngữ để cảm nhận sự khác biệt cú pháp nhưng tương đồng tư duy.
