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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Một class KhachHang đúc ra nhiều object, mỗi object có bản sao dữ liệu riêng</title>
  <desc>Khuôn class KhachHang ở bên trái với các ô thuộc tính ten và so_du; hai mũi tên khởi tạo trỏ sang hai object khach_a (An, 500k) và khach_b (Bình, 2 triệu), mỗi object giữ dữ liệu riêng độc lập.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Một khuôn class → nhiều object, mỗi object dữ liệu riêng</text>

  <rect x="16" y="52" width="220" height="180" rx="12" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
  <rect x="32" y="68" width="120" height="22" rx="11" fill="#8b5cf6" fill-opacity="0.9"/>
  <text x="92" y="83" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">class (khuôn)</text>
  <text x="32" y="116" font-size="14" font-weight="700" fill="currentColor">KhachHang</text>
  <text x="32" y="142" font-size="11.5" fill="currentColor" opacity="0.75">Bản thiết kế:</text>
  <rect x="32" y="152" width="188" height="26" rx="7" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="42" y="169" font-size="11.5" fill="currentColor">ten · so_du (mọi KH đều có)</text>
  <rect x="32" y="184" width="188" height="26" rx="7" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="42" y="201" font-size="11.5" fill="currentColor">gui_tien() · rut_tien()</text>

  <g stroke="currentColor" stroke-opacity="0.55" fill="none">
    <path d="M236 110 C 290 110, 300 96, 348 96" marker-end="url(#oopArr1)"/>
    <path d="M236 174 C 290 174, 300 196, 348 196" marker-end="url(#oopArr1)"/>
  </g>
  <defs>
    <marker id="oopArr1" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <text x="266" y="84" font-size="10.5" fill="currentColor" opacity="0.7">khởi tạo</text>
  <text x="266" y="224" font-size="10.5" fill="currentColor" opacity="0.7">khởi tạo</text>

  <rect x="350" y="60" width="354" height="78" rx="11" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.28"/>
  <rect x="364" y="72" width="92" height="20" rx="10" fill="#10b981" fill-opacity="0.9"/>
  <text x="410" y="86" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">object khach_a</text>
  <text x="364" y="114" font-size="12" fill="currentColor">ten = "An"</text>
  <text x="364" y="131" font-size="12" fill="currentColor">so_du = 500.000đ</text>

  <rect x="350" y="160" width="354" height="78" rx="11" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.28"/>
  <rect x="364" y="172" width="92" height="20" rx="10" fill="#3b82f6" fill-opacity="0.9"/>
  <text x="410" y="186" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">object khach_b</text>
  <text x="364" y="214" font-size="12" fill="currentColor">ten = "Bình"</text>
  <text x="364" y="231" font-size="12" fill="currentColor">so_du = 2.000.000đ</text>

  <text x="16" y="262" font-size="11" fill="currentColor" opacity="0.72">Hai object cùng khuôn nhưng dữ liệu tách biệt: sửa khach_a không đụng khach_b.</text>
</svg>

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

```cpp
#include <iostream>

class Cho {
    // khuôn rỗng, chưa có gì
};

int main() {
    Cho* cho1 = new Cho(); // đúc chiếc bánh thứ nhất
    Cho* cho2 = new Cho(); // đúc chiếc bánh thứ hai
    std::cout << std::boolalpha << (cho1 == cho2) << "\n"; // false — hai đối tượng khác nhau
    delete cho1;
    delete cho2;
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

```cpp
#include <iostream>
#include <string>

class Cho {
public:
    std::string ten; // thuộc tính
    int tuoi;

    Cho(std::string ten, int tuoi) // constructor (trùng tên class)
        : ten(ten), tuoi(tuoi) {}  // gán thuộc tính

    void sua() { // phương thức
        std::cout << ten << ": Gâu gâu!\n";
    }
};

int main() {
    Cho choAn("An", 3);
    Cho choBinh("Bình", 5);
    choAn.sua();                    // An: Gâu gâu!
    choBinh.sua();                  // Bình: Gâu gâu!
    std::cout << choAn.tuoi << "\n"; // 3
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

```cpp
#include <iostream>
#include <string>

class TaiKhoanNganHang {
public:
    std::string chuTk;
    int soDu;

    TaiKhoanNganHang(std::string chuTk, int soDuBanDau)
        : chuTk(chuTk), soDu(soDuBanDau) {}

    void guiTien(int soTien) {
        soDu += soTien;
        std::cout << chuTk << " gửi " << soTien << ". Số dư: " << soDu << "\n";
    }

    void rutTien(int soTien) {
        if (soTien > soDu) {
            std::cout << chuTk << ": không đủ số dư!\n";
        } else {
            soDu -= soTien;
            std::cout << chuTk << " rút " << soTien << ". Số dư: " << soDu << "\n";
        }
    }
};

int main() {
    TaiKhoanNganHang tk("Lan", 100);
    tk.guiTien(50);  // Lan gửi 50. Số dư: 150
    tk.rutTien(200); // Lan: không đủ số dư!
    tk.rutTien(120); // Lan rút 120. Số dư: 30
}
```

Hãy để ý điều quan trọng: bên ngoài chỉ cần gọi `tk.rut_tien(200)` — **không cần biết** bên trong kiểm tra ra sao. Object tự bảo vệ dữ liệu của mình. Nguyên tắc "giấu chi tiết bên trong, chỉ phơi ra hành động" gọi là **encapsulation** (đóng gói) — một trong những trụ cột của OOP.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 330" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cấu tạo một object và nguyên tắc encapsulation</title>
  <desc>Một hộp object gồm hai phần: phần thuộc tính chứa dữ liệu ten và so_du được bọc bên trong, phần phương thức gui_tien và rut_tien là lớp vỏ hành động. Bên ngoài chỉ gọi được phương thức; dữ liệu được object tự bảo vệ.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Cấu tạo một object: dữ liệu được bọc, chỉ hành động lộ ra</text>

  <rect x="120" y="44" width="480" height="236" rx="16" fill="#10b981" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.32"/>
  <rect x="136" y="56" width="216" height="22" rx="11" fill="#10b981" fill-opacity="0.9"/>
  <text x="244" y="71" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">object: tk (TaiKhoanNganHang)</text>

  <text x="142" y="104" font-size="11.5" font-weight="700" fill="currentColor">Phương thức — hành động (lớp vỏ công khai)</text>
  <rect x="142" y="112" width="200" height="30" rx="8" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.28"/>
  <text x="242" y="131" font-size="12" text-anchor="middle" fill="currentColor">gui_tien(so_tien)</text>
  <rect x="358" y="112" width="200" height="30" rx="8" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.28"/>
  <text x="458" y="131" font-size="12" text-anchor="middle" fill="currentColor">rut_tien(so_tien)</text>

  <rect x="142" y="158" width="416" height="100" rx="12" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="156" y="180" font-size="11.5" font-weight="700" fill="currentColor">Thuộc tính — dữ liệu (được giấu bên trong)</text>
  <rect x="156" y="190" width="180" height="28" rx="7" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="166" y="209" font-size="12" fill="currentColor">ten = "Lan"</text>
  <rect x="156" y="224" width="180" height="28" rx="7" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="166" y="243" font-size="12" fill="currentColor">so_du = 30</text>
  <text x="352" y="210" font-size="11" fill="currentColor" opacity="0.75">rut_tien tự kiểm tra</text>
  <text x="352" y="226" font-size="11" fill="currentColor" opacity="0.75">đủ số dư trước khi</text>
  <text x="352" y="242" font-size="11" fill="currentColor" opacity="0.75">đụng vào so_du.</text>

  <g stroke="currentColor" stroke-opacity="0.55" fill="none">
    <path d="M40 127 H 138" marker-end="url(#encOk)"/>
    <path d="M40 204 H 138" stroke-dasharray="5 4"/>
  </g>
  <defs>
    <marker id="encOk" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <text x="16" y="115" font-size="11" fill="currentColor" opacity="0.85">Bên ngoài</text>
  <text x="16" y="131" font-size="10.5" fill="#10b981" font-weight="700">gọi được ✓</text>
  <text x="44" y="222" font-size="10.5" fill="#f59e0b" font-weight="700">chạm thẳng dữ liệu ✗</text>

  <text x="120" y="306" font-size="11" fill="currentColor" opacity="0.72">Encapsulation = bên ngoài chỉ đi qua phương thức; dữ liệu được object tự bảo vệ.</text>
</svg>

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

```cpp
#include <iostream>
#include <string>

// C++ có kế thừa thật: kế thừa public từ class cha
class TaiKhoanTietKiem : public TaiKhoanNganHang {
public:
    TaiKhoanTietKiem(std::string chuTk, int soDuBanDau)
        : TaiKhoanNganHang(chuTk, soDuBanDau) {} // gọi constructor của "bố mẹ"

    void tinhLai() {
        int lai = (int)(soDu * 0.05);
        guiTien(lai); // dùng lại phương thức của "bố mẹ"
    }
};

int main() {
    TaiKhoanTietKiem tk("Mai", 1000);
    tk.rutTien(100); // thừa hưởng: Mai rút 100. Số dư: 900
    tk.tinhLai();    // riêng có:   Mai gửi 45. Số dư: 945
}
```

Chú thích khác biệt: Python ghi class cha trong ngoặc `(TaiKhoanNganHang)`; JavaScript và Java dùng từ khoá `extends` (Java còn cần `super(...)` để gọi constructor cha). Go **không có kế thừa** thực sự — thay vào đó dùng **embedding** (nhúng struct này vào struct kia), kết quả sử dụng gần giống nhau.

Thuật ngữ: class gốc gọi là **class cha** (parent / superclass), class kế thừa gọi là **class con** (child / subclass). Quan hệ kế thừa đọc là "**là một**" (is-a): tài khoản tiết kiệm *là một* tài khoản ngân hàng.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 350" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cây kế thừa và phân biệt quan hệ là-một với có-một</title>
  <desc>Bên trái: class cha TaiKhoanNganHang với gui_tien và rut_tien, mũi tên là-một đi từ class con TaiKhoanTietKiem lên cha; con thừa hưởng gui_tien rut_tien và thêm tinh_lai. Bên phải so sánh: Xe là một PhuongTien dùng kế thừa, còn XeHoi có BanhXe là quan hệ có-một dùng thuộc tính.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Kế thừa: cây cha → con, và "là một" khác "có một"</text>

  <rect x="60" y="44" width="260" height="62" rx="11" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
  <rect x="74" y="54" width="80" height="20" rx="10" fill="#8b5cf6" fill-opacity="0.9"/>
  <text x="114" y="68" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">class cha</text>
  <text x="74" y="92" font-size="13" font-weight="700" fill="currentColor">TaiKhoanNganHang</text>
  <text x="166" y="68" font-size="10.5" fill="currentColor" opacity="0.7">gui_tien() · rut_tien()</text>

  <g stroke="currentColor" stroke-opacity="0.55" fill="none">
    <path d="M190 220 V 106" marker-end="url(#inhArr)"/>
  </g>
  <defs>
    <marker id="inhArr" markerWidth="12" markerHeight="12" refX="5" refY="2" orient="auto"><path d="M0 8 L5 0 L10 8 z" fill="none" stroke="currentColor" stroke-opacity="0.6"/></marker>
  </defs>
  <text x="200" y="168" font-size="11" font-weight="700" fill="currentColor">là một (is-a)</text>

  <rect x="60" y="220" width="260" height="86" rx="11" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
  <rect x="74" y="230" width="80" height="20" rx="10" fill="#10b981" fill-opacity="0.9"/>
  <text x="114" y="244" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">class con</text>
  <text x="74" y="268" font-size="13" font-weight="700" fill="currentColor">TaiKhoanTietKiem</text>
  <text x="74" y="288" font-size="10.5" fill="currentColor" opacity="0.7">thừa hưởng: gui_tien() · rut_tien()</text>
  <text x="74" y="302" font-size="10.5" fill="currentColor" opacity="0.9">thêm riêng: tinh_lai()</text>

  <line x1="360" y1="44" x2="360" y2="320" stroke="currentColor" stroke-opacity="0.2"/>

  <text x="392" y="60" font-size="12" font-weight="700" fill="#10b981">"là một" → kế thừa ✓</text>
  <rect x="392" y="72" width="120" height="34" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="452" y="93" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">PhuongTien</text>
  <path d="M452 150 V 106" fill="none" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#inhArr)"/>
  <text x="462" y="132" font-size="10.5" fill="currentColor" opacity="0.8">là một</text>
  <rect x="392" y="150" width="120" height="34" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="452" y="171" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Xe</text>

  <text x="392" y="218" font-size="12" font-weight="700" fill="#f59e0b">"có một" → thuộc tính ✗ kế thừa</text>
  <rect x="392" y="230" width="120" height="34" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="452" y="251" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">XeHoi</text>
  <path d="M512 247 H 580" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-dasharray="5 4" marker-end="url(#inhArr2)"/>
  <defs>
    <marker id="inhArr2" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <text x="520" y="240" font-size="10.5" fill="currentColor" opacity="0.8">có một</text>
  <rect x="582" y="230" width="120" height="34" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="642" y="251" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">BanhXe</text>
  <text x="392" y="292" font-size="10.5" fill="currentColor" opacity="0.72">XeHoi không *là* BanhXe — nó *có* BanhXe,</text>
  <text x="392" y="307" font-size="10.5" fill="currentColor" opacity="0.72">nên BanhXe là thuộc tính, không phải class cha.</text>
</svg>

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
