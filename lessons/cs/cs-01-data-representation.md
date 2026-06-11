# Biểu diễn dữ liệu: binary, số & ký tự

Bên dưới mọi dòng code của bạn — chuỗi, số, ảnh, JSON gửi qua AWS — chỉ có một thứ duy nhất: **các bit 0 và 1**. Hiểu cách máy tính *gói* dữ liệu thành bit không phải kiến thức hàn lâm; nó là lý do thật sự đằng sau những bug kinh điển: `0.1 + 0.2` ra `0.30000000000000004`, tên tiếng Việt bị vỡ thành `Ä‘`, hay một bộ đếm "nhảy âm" sau khi vượt ngưỡng. Bài này giải thích bản chất đó bằng ví dụ cụ thể.

## Vì sao máy tính dùng nhị phân?

Máy tính được xây từ **transistor** — về cơ bản là công tắc điện tử, chỉ có hai trạng thái ổn định: **có điện** hoặc **không điện**. Phân biệt hai mức "0V và 5V" thì dễ và chống nhiễu tốt; phân biệt mười mức điện áp khác nhau (để dùng hệ thập phân) thì cực kỳ mong manh — một chút nhiễu là đọc sai.

Vậy nên toàn bộ phần cứng "nói" bằng hệ cơ số 2 (**binary**). Mọi thứ khác — số thập phân, chữ cái, emoji — đều là *quy ước* để con người diễn giải các nhóm bit đó.

> 💡 Ghi nhớ: Máy tính không "biết" gì là số, gì là chữ. Cùng một dãy bit `01000001` có thể là **số 65**, **ký tự `A`**, hoặc một phần của màu pixel — *tuỳ vào kiểu dữ liệu (type) mà code của bạn áp lên nó*. Type chính là "kính lúp" để đọc bit.

## Bit và byte

- **Bit**: một chữ số nhị phân, giá trị `0` hoặc `1`. Đơn vị nhỏ nhất.
- **Byte**: nhóm **8 bit**. Đây là đơn vị địa chỉ hoá cơ bản — bộ nhớ được đánh số theo từng byte.

Một byte có `2^8 = 256` tổ hợp khác nhau, biểu diễn được 256 giá trị (ví dụ số `0` đến `255`).

```
1 byte = 8 bit:   [ b7 b6 b5 b4 b3 b2 b1 b0 ]
                    128 64 32 16  8  4  2  1   <- giá trị mỗi vị trí (place value)
```

Số bit gấp đôi thì số tổ hợp **bình phương lên** (không phải gấp đôi):

| Số bit | Số tổ hợp | Dùng làm gì |
|--------|-----------|-------------|
| 8 (1 byte) | 256 | 1 ký tự ASCII, màu 1 kênh (0-255) |
| 16 | 65.536 | `short`, mã Unicode cơ bản |
| 32 | ~4,3 tỷ | `int` thường, địa chỉ IPv4 |
| 64 | ~1,8 x 10^19 | `long`, con trỏ 64-bit, timestamp |

> ⚠️ Bẫy: Đừng nhầm **bit** (`b`) với **byte** (`B`). Đường mạng "100 Mbps" là **mega*bit*/giây**, nên tải file thực tế chỉ ~12,5 MB/giây. Hoá đơn băng thông AWS (data transfer) tính bằng **byte** (GB), còn thông số tốc độ link thường bằng **bit**. Lẫn hai cái là sai 8 lần.

## Đọc hex (cơ số 16)

Viết binary dài bằng tay rất mệt: `11111111` chỉ là 255. **Hexadecimal (hex)** là cách viết gọn: cơ số 16, dùng ký tự `0-9` rồi `A-F` (A=10 ... F=15).

Điểm đẹp: **đúng 1 chữ số hex = đúng 4 bit (1 nibble)**. Vì thế 1 byte = 2 chữ số hex. Đổi qua lại chỉ là tra bảng từng nhóm 4 bit, không cần tính toán.

```
binary : 1010   1111
nibble :  A      F
hex    :  0xAF   = 175 thập phân
```

| Hex | Bin | Dec |   | Hex | Bin | Dec |
|-----|------|-----|---|-----|------|-----|
| 0 | 0000 | 0 |   | 8 | 1000 | 8 |
| 1 | 0001 | 1 |   | 9 | 1001 | 9 |
| 2 | 0010 | 2 |   | A | 1010 | 10 |
| 3 | 0011 | 3 |   | B | 1011 | 11 |
| 4 | 0100 | 4 |   | C | 1100 | 12 |
| 5 | 0101 | 5 |   | D | 1101 | 13 |
| 6 | 0110 | 6 |   | E | 1110 | 14 |
| 7 | 0111 | 7 |   | F | 1111 | 15 |

Bạn gặp hex khắp nơi: màu CSS `#FF8800`, địa chỉ MAC, mã màu, dump bộ nhớ trong debugger, hash (`SHA-256` in ra hex), `0x7fff...` trong stack trace. Tiền tố `0x` báo "đây là hex".

> 💡 Ghi nhớ: Thấy `0x` hay chuỗi chỉ gồm `0-9A-F` là nghĩ ngay "mỗi 2 ký tự = 1 byte". `#FF8800` = 3 byte = đỏ 255, lục 136, lam 0 → màu cam.

## Chuyển binary ↔ decimal nhanh

**Binary → Decimal:** mỗi vị trí là một luỹ thừa của 2; cộng giá trị các vị trí có bit `1`.

```
   1 0 1 1 0 1   (binary)
  32 . 8 4 . 1   (place value: 32,16,8,4,2,1)
 = 32 + 8 + 4 + 1 = 45
```

**Decimal → Binary** (cách "trừ dần luỹ thừa của 2"): lấy luỹ thừa 2 lớn nhất ≤ số đó, đặt bit 1, trừ ra, lặp lại.

```
45 ?
 32 <= 45  -> bit 1, còn 13
 16 > 13   -> bit 0
  8 <= 13  -> bit 1, còn 5
  4 <= 5   -> bit 1, còn 1
  2 > 1    -> bit 0
  1 <= 1   -> bit 1, còn 0
 => 101101
```

Vài mốc nên thuộc lòng để ước lượng nhanh: `2^10 = 1024 ≈ 1K`, `2^20 ≈ 1M`, `2^30 ≈ 1G`. Nhờ vậy bạn biết ngay `int` 32-bit chứa tới ~`2^31 ≈ 2,1 tỷ` (có dấu), và một cột `INT` trong DB sẽ tràn ở mức đó.

## Số âm: two's complement

Câu hỏi: chỉ có 0 và 1, làm sao biểu diễn số **âm**? Giải pháp gần như mọi CPU dùng là **two's complement (bù 2)**.

Ý tưởng: với số `n` bit, bit cao nhất (leftmost) mang **giá trị âm**. Ví dụ 8-bit:

```
giá trị vị trí:  -128  64  32  16   8   4   2   1
bit:                1   0   0   0   0   0   0   1
                  = -128 + 1 = -127
```

- `00000000` = 0
- `01111111` = +127 (số dương lớn nhất)
- `10000000` = -128 (số âm nhỏ nhất)
- `11111111` = -1

Vì sao thiết kế kỳ lạ này thắng thế? **Vì phép cộng/trừ dùng chung một mạch, không cần xử lý dấu riêng.** Ví dụ `5 + (-5)`:

```
  00000101   (5)
+ 11111011   (-5)
-----------
 100000000   -> tràn bit thứ 9, bị cắt bỏ
= 00000000   (0)  ✔ đúng, "miễn phí"
```

Mẹo lấy số đối (negate): **đảo mọi bit rồi cộng 1**. `5 = 00000101` → đảo `11111010` → +1 → `11111011` = -5.

> ⚠️ Bẫy: Đây là gốc rễ của lỗi "asymmetric range". Với 32-bit có dấu, miền giá trị là `-2.147.483.648 .. +2.147.483.647` — phía âm **nhiều hơn 1**. Nên `abs(Integer.MIN_VALUE)` trong Java vẫn ra số âm (vì `+2.147.483.648` không tồn tại trong 32-bit)! Code phòng thủ phải để ý ca biên này.

## Integer overflow

Vì `int` chỉ có số bit cố định, cộng vượt ngưỡng sẽ **wrap around** (quay vòng) — bit tràn bị cắt, số "nhảy" về phía bên kia.

```
8-bit signed, max = 127:
  127 + 1 = 10000000 (binary)  ->  -128   (!!)
```

Đây là nguyên nhân thật của nhiều sự cố nổi tiếng: thanh tiến trình (progress bar) nhảy âm, biến đếm "view" tụt về số âm khổng lồ, hay vụ video "Gangnam Style" làm tràn bộ đếm 32-bit của YouTube khiến họ phải đổi sang 64-bit.

```java
int a = 2_000_000_000;
int b = 2_000_000_000;
int sum = a + b;          // tràn -> -294967296, KHÔNG báo lỗi
long ok = (long) a + b;   // ép sang 64-bit TRƯỚC khi cộng -> 4_000_000_000
```

```python
# Python int tự động "to ra" (arbitrary precision) -> KHÔNG tràn
a = 2_000_000_000
print(a + a)              # 4000000000, an toàn
```

Lưu ý sắc thái ngôn ngữ: C/C++/Java/Go dùng số nguyên cố định bit → **tràn im lặng**. Python/Ruby dùng số nguyên độ lớn tuỳ ý → không tràn nhưng số rất lớn sẽ chậm và tốn bộ nhớ. JavaScript thì *mọi số* là float 64-bit, nên `int` an toàn chỉ tới `2^53` (xem mục dưới).

> ⚠️ Bẫy: Overflow là lỗ hổng bảo mật cổ điển. Cấp phát bộ nhớ `len * size` mà `len * size` tràn về số nhỏ → cấp buffer thiếu → ghi đè (buffer overflow). Luôn dùng kiểu đủ rộng cho các phép nhân kích thước, hoặc kiểm tra tràn trước.

## Số thực: dấu phẩy động (IEEE 754)

Số thực (`float`, `double`) được lưu theo chuẩn **IEEE 754**, ý tưởng giống *ký pháp khoa học nhị phân*: `± mantissa × 2^exponent`. Một `double` 64-bit chia thành:

```
[ 1 bit dấu ][ 11 bit exponent ][ 52 bit mantissa (phần định trị) ]
   ±            tỉ lệ (×2^e)        các chữ số có nghĩa
```

Điều then chốt: bạn có **số bit hữu hạn** cho mantissa, nên chỉ những phân số mà mẫu số là **luỹ thừa của 2** mới biểu diễn *chính xác*. `0.5 (1/2)`, `0.25 (1/4)`, `0.75` thì đúng tuyệt đối. Còn `0.1`?

### Vì sao 0.1 + 0.2 != 0.3

Trong hệ 10, `1/3 = 0.3333...` lặp vô hạn — không viết hết được. Trong hệ **2**, chính `0.1` (một phần mười) cũng là số nhị phân **tuần hoàn vô hạn**:

```
0.1 (decimal) = 0.00011001100110011001100... (binary, lặp mãi)
```

Máy phải *làm tròn* để nhét vào 52 bit, nên `0.1` lưu trong máy *xấp xỉ hơi lớn hơn* 0.1 thật một chút. `0.2` cũng vậy. Cộng hai sai số nhỏ lại:

```python
print(0.1 + 0.2)              # 0.30000000000000004
print(0.1 + 0.2 == 0.3)      # False  (!!)
```

Đây **không phải bug của ngôn ngữ** — mọi ngôn ngữ dùng IEEE 754 (gần như tất cả) đều cho kết quả y hệt. Đó là hệ quả tất yếu của việc nén số thực vào bit hữu hạn.

Cách so sánh đúng: đừng dùng `==`, hãy kiểm tra **độ chênh nhỏ hơn một epsilon**:

```python
def gan_bang(a, b, eps=1e-9):
    return abs(a - b) < eps

gan_bang(0.1 + 0.2, 0.3)     # True
```

> 💡 Ghi nhớ: **Không bao giờ so sánh hai số float bằng `==`.** Luôn so "chênh lệch < epsilon". Và đừng tích luỹ float qua hàng triệu phép cộng (ví dụ cộng dồn tiền từng dòng) — sai số gom lại sẽ lệch thấy rõ.

### Khi nào dùng integer/decimal cho tiền

Sai số float là **thảm hoạ với tiền bạc**. `0.1 + 0.2` lệch một femto-đồng nghe vô hại, nhưng nhân lên triệu giao dịch và một báo cáo tài chính phải khớp đến từng xu thì hệ thống audit sẽ "đỏ".

Hai cách đúng:

1. **Lưu bằng số nguyên đơn vị nhỏ nhất.** Đừng lưu `19.99` USD; lưu `1999` **cent** dạng `int`/`long`. Mọi phép cộng trừ là số nguyên — chính xác tuyệt đối, không có epsilon.
2. **Dùng kiểu decimal chính xác.** `BigDecimal` (Java), `decimal.Decimal` (Python), `NUMERIC/DECIMAL` (SQL). Chúng lưu chữ số theo cơ số 10 nên `0.1` là chính xác.

```python
from decimal import Decimal
print(Decimal("0.1") + Decimal("0.2"))   # 0.3  (đúng chính xác)
# Lưu ý: phải khởi tạo từ CHUỖI "0.1", không phải từ float 0.1
```

| Tình huống | Nên dùng |
|-----------|----------|
| Tiền, số dư, kế toán | `int` (đơn vị nhỏ nhất) hoặc `decimal`/`NUMERIC` |
| Đo lường khoa học, đồ hoạ, ML | `float`/`double` (chấp nhận sai số nhỏ) |
| ID, đếm, index | `int`/`long` |
| So sánh "bằng nhau" của số thực | epsilon, không bao giờ `==` |

> ⚠️ Bẫy: Trong DynamoDB, kiểu `Number` được lưu và truyền dưới dạng *chuỗi* chính xác tới 38 chữ số — an toàn cho tiền. Nhưng nếu SDK của bạn (đặc biệt JavaScript) tự ép `Number` về float 64-bit khi đọc lên, bạn lại dính sai số. Hãy đọc dưới dạng string/`BigInt` cho các trường tiền và ID lớn.

## Ký tự: ASCII vs Unicode vs UTF-8

Số đã xong; còn **chữ**? Cần một *bảng tra* gán mỗi ký tự một con số (code point), rồi lưu con số đó bằng bit.

### ASCII

Chuẩn cũ (1960s): dùng **7 bit**, đánh số 128 ký tự — đủ cho tiếng Anh: `A=65`, `a=97`, `0 (chữ số)=48`, dấu cách `=32`, cùng vài ký tự điều khiển. Gọn nhưng **không có** chữ có dấu tiếng Việt, không emoji, không tiếng Trung/Nhật/Hàn.

```
'A' = 65 = 0x41 = 01000001
'a' = 97 = 0x61   ('a' - 'A' = 32, nên hạ chữ hoa = +32)
'0' = 48          (chú ý: ký tự '0' KHÁC số 0)
```

### Unicode

Unicode là **bảng danh mục khổng lồ**: gán cho *mọi* ký tự của mọi ngôn ngữ (và emoji) một con số gọi là **code point**, viết dạng `U+xxxx`. Ví dụ `U+0041` là `A`, `U+1EA3` là `ả`, `U+1F600` là 😀.

Quan trọng: **Unicode chỉ định nghĩa "ký tự nào ↔ số nào", KHÔNG quy định lưu số đó bằng bao nhiêu byte.** Việc lưu là nhiệm vụ của *encoding*.

### UTF-8

**UTF-8** là cách *mã hoá* code point thành byte phổ biến nhất (hơn 98% web). Nó **biến đổi độ dài (variable-length)**: 1 đến 4 byte tuỳ ký tự.

```
Code point        | Số byte UTF-8 | Ví dụ
U+0000 .. U+007F  | 1 byte        | A, 0, dấu cách (trùng ASCII!)
U+0080 .. U+07FF  | 2 byte        | ả, ô, é, ñ
U+0800 .. U+FFFF  | 3 byte        | 中, 한, hầu hết CJK
U+10000 ..        | 4 byte        | 😀 emoji, ký tự hiếm
```

Điểm thiên tài: **128 ký tự ASCII vẫn là đúng 1 byte y hệt cũ** → mọi file ASCII cũ tự động là UTF-8 hợp lệ. Đây là lý do UTF-8 thắng tuyệt đối.

### Vì sao tiếng Việt & emoji tốn nhiều byte

```
"Hi"   -> H(1) i(1)                     = 2 byte
"Hủ"   -> H(1) ủ(3 byte UTF-8)          = 4 byte   (ủ là 3 byte!)
"😀"    -> 1 emoji                        = 4 byte
```

Hệ quả thực tế cực kỳ hay gây bug: **độ dài "ký tự" ≠ số byte ≠ số code unit.**

```python
s = "Phở"
len(s)              # 3  (ký tự, Python đếm code point)
len(s.encode())     # 5  (byte UTF-8: P=1, h=1, ở=3)
```

```javascript
"😀".length          // 2  (!!) JS đếm UTF-16 code unit, emoji = 2 unit
[..."😀"].length     // 1  (đúng số ký tự, dùng iterator)
```

> ⚠️ Bẫy phổ biến #1 — **cắt chuỗi giữa ký tự đa byte.** Cột DB `VARCHAR(10)` đôi khi giới hạn theo *byte*, không theo ký tự; cắt một tên tiếng Việt đúng giữa byte của `ở` sẽ tạo byte rác (`�`). Đặt giới hạn theo **ký tự** và dùng `utf8mb4` trong MySQL (chú ý: `utf8` của MySQL cũ chỉ tối đa 3 byte → **lưu emoji bị lỗi**, phải dùng `utf8mb4`).

> ⚠️ Bẫy phổ biến #2 — **mojibake (chữ vỡ).** Khi bạn *ghi* chuỗi bằng UTF-8 nhưng *đọc* lại bằng Latin-1 (hay Windows-1252), từng byte bị diễn giải sai. `é` (2 byte UTF-8 `C3 A9`) hiện thành `Ã©`; tên tiếng Việt thành chuỗi `Ä‘á»™`. Bug này không nằm ở dữ liệu mà ở **encoding lúc đọc/ghi không khớp**.

```
Ghi (UTF-8)     :  é -> bytes C3 A9
Đọc (Latin-1)   :  C3 -> Ã   ,  A9 -> ©    => "Ã©"   (mojibake)
```

> 💡 Ghi nhớ: Quy tắc vàng — **luôn khai báo encoding rõ ràng và thống nhất là UTF-8** ở *mọi* lớp: source file, HTTP header (`Content-Type: ...; charset=utf-8`), kết nối DB, cấu hình client. Mojibake gần như luôn là do một mắt xích trong chuỗi đó "đoán" sai encoding.

## Vì sao kỹ sư cần biết

- **Debug:** `0.1 + 0.2 != 0.3`, bộ đếm nhảy âm, tên tiếng Việt thành `Ã©`/`�` — đây là những bug bạn *sẽ* gặp ở production. Biết bản chất bit giúp bạn chẩn đoán trong vài giây thay vì hàng giờ "thử cho hên". Đọc được hex trong stack trace, packet dump, hay log hash là kỹ năng debug nền tảng.
- **Performance & chi phí:** Chọn `int` 32-bit thay vì 64-bit, hay biết một chuỗi tiếng Việt tốn ~3 byte/ký tự, ảnh hưởng trực tiếp tới kích thước record, băng thông và **hoá đơn**. Trên AWS, *data transfer out* và dung lượng *S3*/*DynamoDB* tính theo **byte** — UTF-8 vs UTF-16, hay nén số — đổi thành tiền thật ở quy mô lớn. Encoding gọn còn giúp nhiều dữ liệu lọt vào cache hơn (xem bài Memory Hierarchy).
- **System design & độ đúng đắn:** Thiết kế schema tiền tệ bằng `int` cent hoặc `NUMERIC` (không phải `float`); chọn `BIGINT` cho ID có thể vượt 2 tỷ; ép `utf8mb4` để chứa emoji; chuẩn hoá UTF-8 trên toàn pipeline (API, queue, DB, S3) để không mắt xích nào gây mojibake. Những quyết định "nhỏ" ở tầng biểu diễn dữ liệu này quyết định hệ thống của bạn có *chính xác về tài chính* và *quốc tế hoá được* hay không — những thứ rất khó sửa sau khi đã có dữ liệu thật.

---

Tóm lại: máy tính chỉ thấy bit; mọi "số", "chữ", "tiền", "emoji" đều là quy ước diễn giải các bit đó. Nắm bản chất two's complement, IEEE 754 và UTF-8 biến hàng loạt bug "kỳ bí" thành những hệ quả *đoán trước được* — và đó chính là khác biệt giữa người dùng được công cụ và người *hiểu* công cụ.
