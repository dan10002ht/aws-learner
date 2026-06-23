# Debug & đọc code người khác

Chào mừng bạn đến với một trong những kỹ năng quan trọng nhất của lập trình viên — và cũng là kỹ năng ít được dạy nhất: **tìm lỗi (debug)** và **đọc hiểu code do người khác viết**.

Sự thật bất ngờ: lập trình viên chuyên nghiệp dành phần lớn thời gian KHÔNG phải để viết code mới, mà để **đọc code có sẵn** và **sửa lỗi**. Vì vậy, học giỏi hai kỹ năng này sớm sẽ giúp bạn tiến bộ nhanh hơn bất kỳ ai chỉ biết "gõ code".

---

## 1. Bug là gì? Debug là gì?

**Bug** (con bọ) là lỗi trong chương trình — khi chương trình chạy sai so với ý muốn của bạn. **Debug** (gỡ lỗi) là quá trình tìm ra nguyên nhân và sửa lỗi đó.

> 💡 Ghi nhớ: Cái tên "bug" có thật! Năm 1947, một con bướm đêm bay vào máy tính Harvard Mark II làm máy chạy sai. Các kỹ sư dán con bướm vào sổ nhật ký và ghi: "Trường hợp đầu tiên tìm thấy bug thật sự".

### Ba loại lỗi thường gặp

| Loại lỗi | Tên tiếng Anh | Giống như... | Ví dụ |
|---|---|---|---|
| Lỗi cú pháp | Syntax error | Viết sai chính tả, máy không hiểu bạn nói gì | Quên dấu ngoặc, gõ sai tên lệnh |
| Lỗi khi chạy | Runtime error | Câu đúng ngữ pháp nhưng làm điều bất khả thi | Chia cho 0, mở file không tồn tại |
| Lỗi logic | Logic error | Nói đúng ngữ pháp, làm được, nhưng... sai ý | Muốn tính tổng nhưng lại nhân |

Lỗi cú pháp dễ nhất vì máy tính báo ngay. Lỗi logic **khó nhất** vì chương trình vẫn chạy êm ru — chỉ ra kết quả sai. Phần lớn thời gian debug là để săn lỗi logic.

---

## 2. Tư duy debug: làm thám tử, đừng đoán mò

Người mới khi gặp lỗi thường làm gì? **Sửa đại một chỗ rồi chạy lại, hy vọng hết lỗi.** Cách này giống như xe hỏng mà bạn đá lung tung vào các bộ phận xem có chạy lại không.

Người có kinh nghiệm làm như **thám tử điều tra**:

### Quy trình 5 bước

1. **Tái hiện lỗi (reproduce)** — làm cho lỗi xảy ra lại một cách ổn định. Lỗi mà lúc có lúc không thì chưa thể sửa.
2. **Đọc thông báo lỗi** — đừng hoảng, đọc kỹ từng chữ. 80% trường hợp, máy đã nói cho bạn biết lỗi ở đâu.
3. **Thu hẹp phạm vi (narrow down)** — chia đôi nghi vấn liên tục: "Lỗi ở nửa đầu hay nửa sau chương trình?" Giống trò đoán số từ 1 đến 100: mỗi câu hỏi loại bỏ một nửa khả năng.
4. **Lập giả thuyết và kiểm chứng** — "Tôi nghĩ biến `x` đang bằng 0 ở dòng này" → in giá trị ra để xác nhận. Mỗi lần chỉ kiểm tra MỘT giả thuyết.
5. **Sửa và xác nhận** — sửa xong, chạy lại để chắc chắn lỗi biến mất VÀ không sinh lỗi mới.

> ⚠️ Lỗi người mới hay gặp: sửa 3–4 chỗ cùng lúc rồi chạy lại. Nếu hết lỗi, bạn không biết chỗ nào đã cứu bạn; nếu thêm lỗi, bạn không biết chỗ nào gây ra. **Mỗi lần chỉ thay đổi một thứ.**

---

## 3. Vũ khí số 1: print/log — "soi đèn pin" vào chương trình

Cách debug đơn giản và phổ biến nhất: **in giá trị của biến ra màn hình** tại các điểm nghi vấn, để xem chương trình "nghĩ gì" tại thời điểm đó. Kỹ thuật này gọi là **print debugging** (gỡ lỗi bằng lệnh in).

Ví dụ: hàm tính điểm trung bình trả về kết quả sai. Ta thêm các lệnh in để soi:

```python
def diem_trung_binh(cac_diem):
    tong = 0
    for diem in cac_diem:
        tong += diem
        print("DEBUG: diem =", diem, "| tong =", tong)  # soi từng bước
    print("DEBUG: so luong =", len(cac_diem))
    return tong / len(cac_diem)

print(diem_trung_binh([8, 9, 7]))
```
```javascript
function diemTrungBinh(cacDiem) {
  let tong = 0;
  for (const diem of cacDiem) {
    tong += diem;
    console.log("DEBUG: diem =", diem, "| tong =", tong); // soi từng bước
  }
  console.log("DEBUG: so luong =", cacDiem.length);
  return tong / cacDiem.length;
}

console.log(diemTrungBinh([8, 9, 7]));
```
```java
public class Main {
    static double diemTrungBinh(int[] cacDiem) {
        int tong = 0;
        for (int diem : cacDiem) {
            tong += diem;
            System.out.println("DEBUG: diem = " + diem + " | tong = " + tong); // soi từng bước
        }
        System.out.println("DEBUG: so luong = " + cacDiem.length);
        return (double) tong / cacDiem.length;
    }

    public static void main(String[] args) {
        System.out.println(diemTrungBinh(new int[]{8, 9, 7}));
    }
}
```
```go
package main

import "fmt"

func diemTrungBinh(cacDiem []int) float64 {
    tong := 0
    for _, diem := range cacDiem {
        tong += diem
        fmt.Println("DEBUG: diem =", diem, "| tong =", tong) // soi từng bước
    }
    fmt.Println("DEBUG: so luong =", len(cacDiem))
    return float64(tong) / float64(len(cacDiem))
}

func main() {
    fmt.Println(diemTrungBinh([]int{8, 9, 7}))
}
```

```cpp
#include <iostream>
#include <vector>

double diemTrungBinh(const std::vector<int>& cacDiem) {
    int tong = 0;
    for (int diem : cacDiem) {
        tong += diem;
        std::cout << "DEBUG: diem = " << diem << " | tong = " << tong << "\n"; // soi từng bước
    }
    std::cout << "DEBUG: so luong = " << cacDiem.size() << "\n";
    return static_cast<double>(tong) / cacDiem.size();
}

int main() {
    std::cout << diemTrungBinh({8, 9, 7}) << "\n";
}
```

Chú ý nhỏ: ở Java và Go, vì `tong` là số nguyên nên phải đổi sang số thực (`(double)` / `float64`) trước khi chia — nếu quên, phép chia nguyên `24/3` thì đúng nhưng `25/3` sẽ ra `8` thay vì `8.33`. Đây chính là một bug logic kinh điển mà print debugging giúp bạn phát hiện!

### Mẹo in cho hiệu quả

- In **kèm nhãn**: `print("tong =", tong)` thay vì chỉ `print(tong)` — in 5 con số trần trụi ra màn hình bạn sẽ không biết số nào là số nào.
- In ở **đầu vào và đầu ra** của hàm nghi vấn: dữ liệu vào có đúng không? Kết quả ra có đúng không? Nếu vào đúng mà ra sai → lỗi nằm TRONG hàm này. Phạm vi đã thu hẹp!
- **Xóa hoặc tắt** các lệnh in debug khi đã sửa xong, đừng để rác lại.

> 💡 Ghi nhớ: print debugging giống như rải vụn bánh mì dọc đường đi của chương trình. Nhìn vụn bánh, bạn biết chương trình đã đi qua đâu và mang theo giá trị gì.

---

## 4. Vũ khí số 2: Debugger trong VS Code — "quay chậm" chương trình

**Debugger** là công cụ cho phép bạn **tạm dừng** chương trình tại một dòng bất kỳ, rồi **xem mọi biến** đang chứa gì, và **chạy từng dòng một** như xem video quay chậm. Mạnh hơn print rất nhiều vì bạn không cần đoán trước nên in cái gì.

### Các khái niệm cốt lõi

| Thuật ngữ | Nghĩa | Hình dung |
|---|---|---|
| **Breakpoint** (điểm dừng) | Đánh dấu một dòng để chương trình tạm dừng khi chạy tới | Đặt barie trên đường |
| **Step Over** (bước qua) | Chạy dòng hiện tại, dừng ở dòng kế tiếp | Đi từng bước, không rẽ vào nhà ai |
| **Step Into** (bước vào) | Nếu dòng hiện tại gọi một hàm, nhảy VÀO bên trong hàm đó | Rẽ vào nhà xem bên trong |
| **Step Out** (bước ra) | Chạy nốt hàm hiện tại rồi quay về nơi đã gọi | Đi ra khỏi nhà, về lại đường lớn |
| **Continue** (tiếp tục) | Chạy tiếp đến breakpoint kế tiếp (hoặc hết chương trình) | Lên xe phóng tới barie tiếp theo |
| **Variables/Watch** | Bảng hiển thị giá trị các biến tại thời điểm dừng | Màn hình theo dõi nhịp tim bệnh nhân |

### Cách dùng trong VS Code (các bước giống nhau cho mọi ngôn ngữ)

1. Cài **extension** (tiện ích mở rộng) cho ngôn ngữ của bạn: Python, JavaScript (có sẵn), Java (Extension Pack for Java), Go.
2. Mở file code, **click vào lề trái** cạnh số dòng → xuất hiện **chấm đỏ** = breakpoint.
3. Nhấn **F5** (Run and Debug) để chạy ở chế độ debug.
4. Chương trình dừng tại chấm đỏ. Nhìn panel **Variables** bên trái để xem giá trị mọi biến.
5. Dùng các nút trên thanh điều khiển: Continue (F5), Step Over (F10), Step Into (F11), Step Out (Shift+F11).

> ⚠️ Lỗi người mới hay gặp: nhấn F5 nhưng chương trình chạy vù một cái rồi kết thúc — vì **quên đặt breakpoint**. Không có barie thì xe chạy thẳng về đích! Hãy đặt breakpoint TRƯỚC khi nhấn F5.

### Khi nào dùng print, khi nào dùng debugger?

- **Print**: lỗi đơn giản, muốn xem nhanh 1–2 giá trị, hoặc chương trình chạy trên môi trường khó gắn debugger.
- **Debugger**: lỗi phức tạp, chưa biết nghi ngờ chỗ nào, muốn quan sát toàn cảnh từng bước. Đặc biệt hữu ích với vòng lặp và hàm lồng nhau.

Cả hai đều tốt — lập trình viên giỏi dùng cả hai tùy tình huống.

---

## 5. Đọc stack trace: thư "khai báo tai nạn" của chương trình

Khi chương trình gặp lỗi runtime và "sập", nó in ra một đoạn chữ trông đáng sợ gọi là **stack trace** (dấu vết ngăn xếp) — thực chất là bản tường trình: *lỗi gì, ở dòng nào, và chuỗi các hàm đã gọi nhau dẫn tới đó*.

Hãy gây ra một lỗi cố ý (chia cho 0) để xem:

```python
def chia(a, b):
    return a / b

def tinh_toan():
    return chia(10, 0)

tinh_toan()
```
```javascript
function chia(a, b) {
  if (b === 0) throw new Error("Chia cho 0!");
  return a / b;
}

function tinhToan() {
  return chia(10, 0);
}

tinhToan();
```
```java
public class Main {
    static int chia(int a, int b) {
        return a / b;
    }

    static int tinhToan() {
        return chia(10, 0);
    }

    public static void main(String[] args) {
        tinhToan();
    }
}
```
```go
package main

func chia(a, b int) int {
    return a / b
}

func tinhToan() int {
    return chia(10, 0)
}

func main() {
    tinhToan()
}
```

```cpp
#include <stdexcept>

int chia(int a, int b) {
    if (b == 0) throw std::runtime_error("Chia cho 0!");
    return a / b;
}

int tinhToan() {
    return chia(10, 0);
}

int main() {
    tinhToan();
}
```

(Lưu ý: trong JavaScript, `10 / 0` không sập mà trả về `Infinity` — nên ví dụ trên phải tự ném lỗi bằng `throw`. Đây là một khác biệt thú vị giữa các ngôn ngữ!)

Kết quả ở Python sẽ trông như thế này:

```
Traceback (most recent call last):
  File "main.py", line 7, in <module>
    tinh_toan()
  File "main.py", line 5, in tinh_toan
    return chia(10, 0)
  File "main.py", line 2, in chia
    return a / b
ZeroDivisionError: division by zero
```

Mỗi dòng trong stack trace ánh xạ tới một mắt xích trong chuỗi gọi hàm. Đọc nó như chuỗi domino: `main` gọi `tinh_toan`, `tinh_toan` gọi `chia` — domino đổ ở `chia` (chia cho 0), nhưng số 0 lại được `tinh_toan` truyền vào:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Ánh xạ stack trace sang chuỗi gọi hàm domino</title>
  <desc>Ba khung gọi hàm xếp chồng: main gọi tinh_toan, tinh_toan gọi chia. Mỗi dòng trong stack trace Python được nối tới đúng hàm tương ứng. Domino đổ ở chia vì chia cho 0, nhưng số 0 được tinh_toan truyền vào nên đó là nơi có lỗi gốc.</desc>
  <text x="16" y="24" font-size="13" font-weight="700" fill="currentColor">Stack trace (dòng)</text>
  <text x="430" y="24" font-size="13" font-weight="700" fill="currentColor">Chuỗi gọi hàm (domino)</text>

  <g font-size="11">
    <rect x="16" y="40" width="372" height="30" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="28" y="59" fill="currentColor">line 7, in &#60;module&#62; → tinh_toan()</text>
    <rect x="16" y="78" width="372" height="30" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="28" y="97" fill="currentColor">line 5, in tinh_toan → return chia(10, 0)</text>
    <rect x="16" y="116" width="372" height="30" rx="6" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="28" y="135" fill="currentColor">line 2, in chia → return a / b</text>
    <rect x="16" y="158" width="372" height="30" rx="6" fill="#ef4444" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="28" y="177" font-weight="700" fill="currentColor">ZeroDivisionError: division by zero</text>
  </g>

  <g stroke="currentColor" stroke-opacity="0.45" stroke-dasharray="4 3">
    <line x1="388" y1="55" x2="470" y2="76"/>
    <line x1="388" y1="93" x2="470" y2="146"/>
    <line x1="388" y1="131" x2="470" y2="216"/>
  </g>

  <g>
    <rect x="470" y="60" width="234" height="48" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="484" y="80" font-size="13" font-weight="700" fill="currentColor">main()</text>
    <text x="484" y="98" font-size="10.5" fill="currentColor" opacity="0.7">điểm bắt đầu — gọi tinh_toan</text>

    <rect x="470" y="130" width="234" height="60" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="484" y="150" font-size="13" font-weight="700" fill="currentColor">tinh_toan()</text>
    <text x="484" y="168" font-size="10.5" fill="currentColor" opacity="0.75">truyền số 0 → chia(10, 0)</text>
    <text x="484" y="183" font-size="10.5" font-weight="700" fill="#f59e0b">⚠ nguồn của lỗi gốc</text>

    <rect x="470" y="212" width="234" height="60" rx="8" fill="#ef4444" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="484" y="232" font-size="13" font-weight="700" fill="currentColor">chia()</text>
    <text x="484" y="250" font-size="10.5" fill="currentColor" opacity="0.75">a / b với b = 0</text>
    <text x="484" y="265" font-size="10.5" font-weight="700" fill="#ef4444">💥 nơi chương trình sập</text>
  </g>

  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <defs>
      <marker id="arrChia" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" fill-opacity="0.6"/>
      </marker>
    </defs>
    <line x1="587" y1="108" x2="587" y2="128" marker-end="url(#arrChia)"/>
    <line x1="587" y1="190" x2="587" y2="210" marker-end="url(#arrChia)"/>
  </g>
  <text x="600" y="122" font-size="10" fill="currentColor" opacity="0.65">gọi</text>
  <text x="600" y="204" font-size="10" fill="currentColor" opacity="0.65">gọi</text>

  <text x="16" y="312" font-size="11" fill="currentColor" opacity="0.8">Domino đổ ở chia (nơi sập), nhưng số 0 đến từ tinh_toan — nơi sập KHÔNG luôn là nơi có lỗi gốc.</text>
</svg>

### Cách đọc — 3 quy tắc vàng

1. **Đọc dòng cuối cùng trước** (với Python) — đó là TÊN LỖI và mô tả: `ZeroDivisionError: division by zero` (lỗi chia cho 0). Với Java/JavaScript/Go thì tên lỗi nằm ở **dòng đầu**, các hàm liệt kê bên dưới.
2. **Tìm dòng đầu tiên trỏ vào FILE CỦA BẠN** — stack trace có thể dài hàng chục dòng, nhiều dòng trỏ vào code của thư viện. Lỗi gần như luôn nằm ở dòng thuộc file bạn viết.
3. **Đọc chuỗi gọi hàm như chuỗi domino**: `main` gọi `tinh_toan`, `tinh_toan` gọi `chia`, và `chia` là nơi đổ vỡ. Domino đổ ở `chia`, nhưng nguyên nhân (số 0) được truyền từ `tinh_toan` — nơi sập KHÔNG phải lúc nào cũng là nơi có lỗi gốc!

> 💡 Ghi nhớ: Stack trace không phải để dọa bạn — nó là **bản đồ kho báu** chỉ thẳng tới chỗ lỗi. Người mới bỏ chạy khi thấy nó; người giỏi đọc nó đầu tiên.

> ⚠️ Lỗi người mới hay gặp: copy nguyên cả stack trace lên Google/AI mà chưa đọc dòng tên lỗi. Hãy tự đọc trước — rất nhiều lỗi (sai tên biến, thiếu dấu, index vượt quá) bạn tự sửa được trong 30 giây.

---

## 6. Rubber duck debugging: tâm sự với... con vịt cao su

Nghe buồn cười nhưng đây là kỹ thuật kinh điển: **giải thích code của bạn, từng dòng một, thành lời, cho một con vịt cao su** (hoặc bất kỳ vật vô tri nào trên bàn).

Tại sao hiệu quả? Vì khi đọc thầm, não bạn "đọc cái bạn TƯỞNG mình viết". Khi buộc phải **nói thành lời từng dòng**, bạn phải xử lý từng chi tiết — và rất thường xuyên, đang nói nửa chừng bạn sẽ thốt lên: *"Khoan... dòng này đâu có làm cái mình muốn!"*

### Cách thực hành

1. Đặt một "con vịt" (vịt cao su, gấu bông, cốc nước...) trước mặt.
2. Giải thích cho nó: **chương trình này phải làm gì** (mục tiêu).
3. Đi qua **từng dòng**: "Dòng này tôi khai báo biến tổng bằng 0. Dòng này tôi lặp qua từng phần tử. Dòng này tôi... ơ, tại sao tôi lại so sánh bằng `=` thay vì `==`?"
4. Khi phát hiện điểm bạn không giải thích trôi chảy được — **đó chính là nghi phạm số một**.

> 💡 Ghi nhớ: Bạn cũng có thể "rubber duck" với bạn bè. Hiện tượng nổi tiếng: vừa mô tả xong vấn đề cho đồng nghiệp thì tự nhiên thấy đáp án — chưa cần người kia nói gì. Việc DIỄN ĐẠT vấn đề chính là một nửa lời giải.

---

## 7. Đọc hiểu code người khác: kỹ năng bị đánh giá thấp nhất

Vào làm thực tế, bạn sẽ hiếm khi viết chương trình từ con số 0. Bạn sẽ tham gia dự án có sẵn hàng nghìn dòng code do người khác viết. Đọc hiểu code lạ giống như **chuyển đến một thành phố mới** — ban đầu lạc lối, nhưng có chiến lược thì làm quen rất nhanh.

### Chiến lược đọc code lạ: từ tổng quan xuống chi tiết

1. **Đọc README và tài liệu trước** — như đọc bản đồ tổng quan thành phố trước khi đi bộ.
2. **Chạy thử chương trình** — xem nó LÀM GÌ trước khi tìm hiểu nó làm NHƯ THẾ NÀO.
3. **Tìm điểm bắt đầu (entry point)** — hàm `main`, file `index`/`app`, nơi mọi thứ khởi động. Đó là "quảng trường trung tâm".
4. **Đi theo một luồng dữ liệu** — chọn MỘT tính năng (vd: "khi người dùng bấm nút Đăng nhập thì chuyện gì xảy ra?") và lần theo từ đầu đến cuối. Đừng cố hiểu tất cả cùng lúc.
5. **Tận dụng tên hàm/tên biến** — code tốt tự kể chuyện: `tinh_tong_don_hang()` thì khỏi cần đọc bên trong cũng đoán được 80% nhiệm vụ.
6. **Dùng tính năng của VS Code**: bấm **F12 (Go to Definition)** trên một tên hàm để nhảy tới nơi nó được định nghĩa; **Shift+F12 (Find All References)** để xem nó được dùng ở những đâu; **Ctrl+Shift+F** để tìm kiếm chữ trong toàn dự án.
7. **Đặt breakpoint và chạy debug** — cách "đọc" code sống động nhất: xem nó chạy thật, từng bước, với dữ liệu thật.
8. **Ghi chú khi đọc** — vẽ sơ đồ "hàm A gọi hàm B gọi hàm C" ra giấy. Não nhớ hình ảnh tốt hơn chữ.

### Những điều KHÔNG nên làm

> ⚠️ Lỗi người mới hay gặp:
> - **Đọc tuần tự từ dòng 1 đến hết file** như đọc tiểu thuyết — code không chạy theo thứ tự viết, hãy đi theo luồng thực thi.
> - **Cố hiểu 100% trước khi làm gì đó** — chấp nhận hiểu 70% rồi vừa làm vừa hiểu thêm. Lập trình viên kỳ cựu cũng không hiểu hết codebase lớn.
> - **Vội phán "code này viết dở, đập đi viết lại"** — code cũ thường chứa những bài học xương máu (xử lý trường hợp đặc biệt) mà bạn chưa thấy. Hiểu trước, sửa sau.

---

## 8. Dùng AI assistant để HỌC — không phải để CHÉP

Các trợ lý AI (như ChatGPT, Claude, GitHub Copilot) có thể giải thích lỗi, gợi ý code, viết cả hàm cho bạn. Đây là công cụ tuyệt vời — **nếu dùng đúng cách**. Dùng sai cách, nó sẽ khiến bạn mãi mãi không biết lập trình.

### Phép so sánh: AI như gia sư vs. AI như người làm bài hộ

- Thuê **gia sư** giảng cho bạn hiểu → bạn giỏi lên.
- Thuê người **làm bài hộ** → điểm cao hôm nay, trắng tay ngày thi.

AI có thể đóng cả hai vai. Bạn chọn vai nào cho nó.

### Cách hỏi AI để học (nên làm)

| Tình huống | Câu hỏi tốt | Câu hỏi hại bạn |
|---|---|---|
| Gặp lỗi | "Đây là lỗi và code của tôi. **Giải thích tại sao** lỗi xảy ra, gợi ý hướng sửa nhưng **đừng đưa code hoàn chỉnh**." | "Sửa code này giùm." |
| Đọc code lạ | "Giải thích **từng bước** đoạn code này làm gì, như cho người mới học." | "Tóm tắt đi, tôi lười đọc." |
| Làm bài tập | "Tôi định giải bằng cách X, hướng này có hợp lý không? Tôi đang kẹt ở bước Y." | "Làm bài này cho tôi." |
| Sau khi tự giải | "Đây là lời giải của tôi. **Nhận xét** và chỉ ra chỗ có thể viết tốt hơn." | (không hỏi gì, vì AI làm hộ từ đầu) |

### Quy tắc 3 bước khi dùng AI lúc đang học

1. **Tự thử trước ít nhất 15–30 phút.** Cảm giác "bí" chính là lúc não đang xây kết nối — đừng cướp mất khoảnh khắc đó.
2. **Khi nhận trả lời từ AI, phải hiểu được từng dòng.** Nếu AI đưa đoạn code có thứ bạn không hiểu, hỏi tiếp: "Dòng này nghĩa là gì?" cho đến khi hiểu hết.
3. **Gõ lại bằng tay và tự biến tấu**, đừng copy-paste. Sau đó **đóng AI lại và tự viết lại từ đầu** — nếu không viết lại được, tức là bạn chưa học được gì, chỉ mượn tạm.

> 💡 Ghi nhớ: AI cũng **có thể sai** — và sai rất tự tin (hiện tượng gọi là "hallucination" — ảo giác, tức AI bịa ra thông tin nghe rất thuyết phục). Luôn chạy thử và kiểm chứng code AI đưa. Kỹ năng đọc code + debug bạn học trong bài này chính là "máy phát hiện nói dối" của bạn đối với AI.

> ⚠️ Lỗi người mới hay gặp: dùng AI làm hết bài tập trong khóa học, cảm thấy mình tiến bộ thần tốc... cho đến buổi phỏng vấn xin việc đầu tiên, khi phải tự viết một vòng lặp đơn giản trên bảng trắng. Đừng để "cảm giác hiểu" đánh lừa — thước đo thật là **tự làm được khi không có trợ giúp**.

---

## 9. Checklist debug bỏ túi

Khi gặp lỗi, đi theo thứ tự này:

1. ☐ Đọc kỹ thông báo lỗi / stack trace — tên lỗi là gì, dòng nào, file nào?
2. ☐ Lỗi có tái hiện được ổn định không?
3. ☐ Giải thích cho con vịt: code này ĐÁNG LẼ làm gì, THỰC TẾ làm gì?
4. ☐ Thu hẹp phạm vi: in giá trị ở đầu vào / đầu ra các hàm nghi vấn.
5. ☐ Vẫn bí? Đặt breakpoint, chạy debugger, đi từng bước.
6. ☐ Vẫn bí sau 30 phút? Hỏi AI/bạn bè — kèm mô tả rõ ràng: muốn gì, đã thử gì, lỗi gì.
7. ☐ Sửa MỘT thứ mỗi lần, chạy lại xác nhận.
8. ☐ Sửa xong: tự hỏi "vì sao lỗi này xảy ra?" và ghi nhớ — lỗi cũ ít khi quay lại với người chịu rút kinh nghiệm.

---

## 10. Tóm tắt

- **Debug là điều tra, không phải đoán mò**: tái hiện → đọc lỗi → thu hẹp → giả thuyết → kiểm chứng.
- **Print debugging** là đèn pin nhanh gọn; **debugger trong VS Code** (breakpoint, step over/into, panel Variables) là máy quay chậm toàn cảnh.
- **Stack trace là bản đồ kho báu**: tìm tên lỗi, tìm dòng thuộc file của bạn, lần theo chuỗi gọi hàm.
- **Rubber duck**: nói thành lời từng dòng code — diễn đạt vấn đề là một nửa lời giải.
- **Đọc code lạ từ tổng quan xuống chi tiết**: README → chạy thử → entry point → theo một luồng → F12/tìm kiếm → debug.
- **AI là gia sư, không phải người làm bài hộ**: tự thử trước, hiểu từng dòng nhận về, gõ lại bằng tay, kiểm chứng mọi thứ.

Bài tiếp theo, bạn sẽ áp dụng toàn bộ kỹ năng này vào một dự án nhỏ thực tế. Còn bây giờ — hãy cố tình viết sai một đoạn code, rồi tự mình lần theo stack trace để sửa nó. Không có cách luyện tập nào tốt hơn!
