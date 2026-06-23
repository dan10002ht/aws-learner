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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 220" role="img" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Giải phẫu một byte: 8 ô bit với place value và ví dụ decode</title>
  <desc>Tám ô bit cho byte 01101101. Giá trị vị trí từ trái sang phải là 128, 64, 32, 16, 8, 4, 2, 1. Các ô bit bằng 1 được tô đậm: 64 cộng 32 cộng 8 cộng 4 cộng 1 bằng 109.</desc>
  <text x="320" y="24" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">1 byte = 8 bit — ví dụ: 01101101</text>
  <text x="20" y="56" font-size="11" fill="currentColor" opacity="0.7">place value (luỹ thừa của 2)</text>
  <g font-size="12" text-anchor="middle">
    <text x="74"  y="70" fill="currentColor" opacity="0.75">128</text>
    <text x="146" y="70" fill="currentColor" opacity="0.75">64</text>
    <text x="218" y="70" fill="currentColor" opacity="0.75">32</text>
    <text x="290" y="70" fill="currentColor" opacity="0.75">16</text>
    <text x="362" y="70" fill="currentColor" opacity="0.75">8</text>
    <text x="434" y="70" fill="currentColor" opacity="0.75">4</text>
    <text x="506" y="70" fill="currentColor" opacity="0.75">2</text>
    <text x="578" y="70" fill="currentColor" opacity="0.75">1</text>
  </g>
  <g font-size="22" font-weight="700" text-anchor="middle">
    <rect x="42"  y="82" width="64" height="64" rx="9" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="74"  y="123" fill="currentColor" opacity="0.45">0</text>
    <rect x="114" y="82" width="64" height="64" rx="9" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="146" y="123" fill="currentColor">1</text>
    <rect x="186" y="82" width="64" height="64" rx="9" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="218" y="123" fill="currentColor">1</text>
    <rect x="258" y="82" width="64" height="64" rx="9" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="290" y="123" fill="currentColor" opacity="0.45">0</text>
    <rect x="330" y="82" width="64" height="64" rx="9" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="362" y="123" fill="currentColor">1</text>
    <rect x="402" y="82" width="64" height="64" rx="9" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="434" y="123" fill="currentColor">1</text>
    <rect x="474" y="82" width="64" height="64" rx="9" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="506" y="123" fill="currentColor" opacity="0.45">0</text>
    <rect x="546" y="82" width="64" height="64" rx="9" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="578" y="123" fill="currentColor">1</text>
  </g>
  <text x="320" y="186" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">64 + 32 + 8 + 4 + 1 = 109</text>
  <text x="320" y="206" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">(cộng giá trị các ô có bit = 1, được tô màu)</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 270" role="img" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Two's complement 8-bit: bit trái cùng mang giá trị -128</title>
  <desc>Byte 10000001 trong two's complement. Ô trái cùng mang giá trị âm -128, các ô còn lại 64, 32, 16, 8, 4, 2, 1 dương. Bit bật là -128 và 1, tổng là -127. Trục giá trị: 10000000 là -128, 11111111 là -1, 00000000 là 0, 01111111 là +127.</desc>
  <text x="320" y="24" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Two's complement 8-bit — ví dụ: 10000001</text>
  <g font-size="12" text-anchor="middle">
    <text x="74"  y="56" fill="#ef4444">-128</text>
    <text x="146" y="56" fill="currentColor" opacity="0.75">64</text>
    <text x="218" y="56" fill="currentColor" opacity="0.75">32</text>
    <text x="290" y="56" fill="currentColor" opacity="0.75">16</text>
    <text x="362" y="56" fill="currentColor" opacity="0.75">8</text>
    <text x="434" y="56" fill="currentColor" opacity="0.75">4</text>
    <text x="506" y="56" fill="currentColor" opacity="0.75">2</text>
    <text x="578" y="56" fill="currentColor" opacity="0.75">1</text>
  </g>
  <g font-size="22" font-weight="700" text-anchor="middle">
    <rect x="42"  y="68" width="64" height="64" rx="9" fill="#ef4444" fill-opacity="0.18" stroke="#ef4444" stroke-opacity="0.5"/>
    <text x="74"  y="109" fill="currentColor">1</text>
    <rect x="114" y="68" width="64" height="64" rx="9" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="146" y="109" fill="currentColor" opacity="0.45">0</text>
    <rect x="186" y="68" width="64" height="64" rx="9" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="218" y="109" fill="currentColor" opacity="0.45">0</text>
    <rect x="258" y="68" width="64" height="64" rx="9" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="290" y="109" fill="currentColor" opacity="0.45">0</text>
    <rect x="330" y="68" width="64" height="64" rx="9" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="362" y="109" fill="currentColor" opacity="0.45">0</text>
    <rect x="402" y="68" width="64" height="64" rx="9" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="434" y="109" fill="currentColor" opacity="0.45">0</text>
    <rect x="474" y="68" width="64" height="64" rx="9" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="506" y="109" fill="currentColor" opacity="0.45">0</text>
    <rect x="546" y="68" width="64" height="64" rx="9" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="578" y="109" fill="currentColor">1</text>
  </g>
  <text x="320" y="158" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">-128 + 1 = -127</text>
  <text x="74" y="158" font-size="10" text-anchor="middle" fill="#ef4444" opacity="0.85">bit dấu (âm)</text>
  <text x="320" y="186" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">Trục giá trị 8-bit có dấu:</text>
  <g stroke="currentColor" stroke-opacity="0.4">
    <line x1="60" y1="216" x2="580" y2="216"/>
    <line x1="60" y1="210" x2="60" y2="222"/>
    <line x1="233" y1="210" x2="233" y2="222"/>
    <line x1="320" y1="210" x2="320" y2="222"/>
    <line x1="580" y1="210" x2="580" y2="222"/>
  </g>
  <g font-size="11" text-anchor="middle" fill="currentColor">
    <text x="60"  y="240">-128</text>
    <text x="233" y="240">-1</text>
    <text x="320" y="240">0</text>
    <text x="580" y="240">+127</text>
  </g>
  <g font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">
    <text x="60"  y="254">10000000</text>
    <text x="233" y="254">11111111</text>
    <text x="320" y="254">00000000</text>
    <text x="580" y="254">01111111</text>
  </g>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 170" role="img" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cấu trúc số thực double 64-bit theo chuẩn IEEE 754</title>
  <desc>Thanh 64 bit chia ba vùng theo tỉ lệ độ rộng: 1 bit dấu, 11 bit exponent, 52 bit mantissa. Bit dấu quyết định âm hay dương, exponent là số mũ luỹ thừa 2 quyết định độ lớn, mantissa là các chữ số có nghĩa.</desc>
  <text x="340" y="24" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">IEEE 754 double — 64 bit = ± mantissa × 2^exponent</text>
  <g>
    <rect x="20"  y="44" width="20"  height="52" rx="5" fill="#ef4444" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="44"  y="44" width="118" height="52" rx="5" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="166" y="44" width="494" height="52" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
  </g>
  <g font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">
    <text x="30"  y="68">1</text>
    <text x="103" y="68">11 bit</text>
    <text x="413" y="68">52 bit</text>
  </g>
  <g font-size="11" text-anchor="middle" fill="currentColor" opacity="0.78">
    <text x="103" y="86">exponent</text>
    <text x="413" y="86">mantissa</text>
  </g>
  <g font-size="11" text-anchor="middle">
    <text x="30"  y="120" fill="#ef4444">sign</text>
    <text x="103" y="120" fill="currentColor" opacity="0.7">số mũ ×2^e</text>
    <text x="413" y="120" fill="currentColor" opacity="0.7">chữ số có nghĩa (phần định trị)</text>
  </g>
  <g font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">
    <text x="30"  y="138">±</text>
    <text x="103" y="138">độ lớn (tỉ lệ)</text>
    <text x="413" y="138">độ chính xác — chỉ 52 bit nên phải làm tròn</text>
  </g>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 260" role="img" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>UTF-8 biến đổi độ dài: code point ánh xạ sang 1 đến 4 byte</title>
  <desc>Bốn khoảng code point và số byte UTF-8: U+0000 đến U+007F dùng 1 byte trùng ASCII với ví dụ chữ A; U+0080 đến U+07FF dùng 2 byte ví dụ é; U+0800 đến U+FFFF dùng 3 byte ví dụ chữ ả tiếng Việt; từ U+10000 dùng 4 byte ví dụ emoji. Mỗi ô vuông là một byte.</desc>
  <text x="340" y="24" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">UTF-8 biến đổi độ dài: 1–4 byte tuỳ code point</text>
  <g font-size="11" fill="currentColor" opacity="0.7">
    <text x="20" y="50">Khoảng code point</text>
    <text x="250" y="50">Số byte UTF-8 (mỗi ô = 1 byte)</text>
    <text x="600" y="50" text-anchor="end">Ví dụ</text>
  </g>
  <g>
    <text x="20" y="80" font-size="12" fill="currentColor">U+0000 .. U+007F</text>
    <rect x="250" y="64" width="26" height="22" rx="4" fill="#10b981" fill-opacity="0.4" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="600" y="80" font-size="12" text-anchor="end" fill="currentColor">A  (= ASCII!)</text>
  </g>
  <g>
    <text x="20" y="120" font-size="12" fill="currentColor">U+0080 .. U+07FF</text>
    <rect x="250" y="104" width="26" height="22" rx="4" fill="#3b82f6" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="280" y="104" width="26" height="22" rx="4" fill="#3b82f6" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="600" y="120" font-size="12" text-anchor="end" fill="currentColor">é, ô, ñ</text>
  </g>
  <g>
    <text x="20" y="160" font-size="12" fill="currentColor">U+0800 .. U+FFFF</text>
    <rect x="250" y="144" width="26" height="22" rx="4" fill="#f59e0b" fill-opacity="0.4" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="280" y="144" width="26" height="22" rx="4" fill="#f59e0b" fill-opacity="0.4" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="310" y="144" width="26" height="22" rx="4" fill="#f59e0b" fill-opacity="0.4" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="600" y="160" font-size="12" text-anchor="end" fill="currentColor">ả (tiếng Việt có dấu), 中</text>
  </g>
  <g>
    <text x="20" y="200" font-size="12" fill="currentColor">U+10000 ..</text>
    <rect x="250" y="184" width="26" height="22" rx="4" fill="#8b5cf6" fill-opacity="0.4" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="280" y="184" width="26" height="22" rx="4" fill="#8b5cf6" fill-opacity="0.4" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="310" y="184" width="26" height="22" rx="4" fill="#8b5cf6" fill-opacity="0.4" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="340" y="184" width="26" height="22" rx="4" fill="#8b5cf6" fill-opacity="0.4" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="600" y="200" font-size="12" text-anchor="end" fill="currentColor">😀 emoji, ký tự hiếm</text>
  </g>
  <line x1="20" y1="222" x2="660" y2="222" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="340" y="244" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.72">"Phở" = P(1) + h(1) + ở(3) = 5 byte, dù chỉ 3 ký tự → byte ≠ số ký tự</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 200" role="img" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Luồng mojibake: ghi UTF-8 nhưng đọc nhầm Latin-1</title>
  <desc>Pipeline: ký tự é được encode bằng UTF-8 thành hai byte C3 và A9. Cùng hai byte đó nếu decode nhầm bằng Latin-1 thì C3 ra chữ Ã và A9 ra ký hiệu bản quyền, kết quả là chuỗi vỡ Ã©. Lỗi nằm ở encoding lúc đọc khác lúc ghi.</desc>
  <text x="340" y="22" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Mojibake = encode và decode lệch bảng mã</text>
  <g>
    <rect x="24" y="70" width="92" height="50" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="70" y="92" font-size="13" text-anchor="middle" fill="currentColor">ký tự</text>
    <text x="70" y="111" font-size="18" font-weight="700" text-anchor="middle" fill="currentColor">é</text>
    <rect x="246" y="70" width="120" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="306" y="92" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">2 byte trên đĩa</text>
    <text x="306" y="111" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">C3 A9</text>
    <rect x="540" y="36" width="120" height="50" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="600" y="58" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">đọc UTF-8 ✔</text>
    <text x="600" y="78" font-size="18" font-weight="700" text-anchor="middle" fill="currentColor">é</text>
    <rect x="540" y="104" width="120" height="50" rx="8" fill="#ef4444" fill-opacity="0.16" stroke="#ef4444" stroke-opacity="0.5"/>
    <text x="600" y="126" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">đọc Latin-1 ✗</text>
    <text x="600" y="146" font-size="18" font-weight="700" text-anchor="middle" fill="currentColor">Ã©</text>
  </g>
  <g stroke="currentColor" fill="none" stroke-opacity="0.55">
    <line x1="116" y1="95" x2="240" y2="95"/>
    <path d="M240 95 l-9 -4 v8 z" fill="currentColor" stroke="none"/>
    <line x1="366" y1="88" x2="534" y2="62"/>
    <path d="M534 62 l-10 0 4 7 z" fill="currentColor" stroke="none"/>
  </g>
  <g stroke="#ef4444" fill="none" stroke-opacity="0.7">
    <line x1="366" y1="104" x2="534" y2="128"/>
    <path d="M534 128 l-10 -1 4 7 z" fill="#ef4444" stroke="none"/>
  </g>
  <text x="200" y="58" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">encode UTF-8</text>
  <text x="455" y="60" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">decode đúng → é</text>
  <text x="455" y="146" font-size="10" text-anchor="middle" fill="#ef4444" opacity="0.85">C3→Ã, A9→© → "Ã©"</text>
  <text x="340" y="186" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.72">Cùng byte, sai bảng mã lúc đọc → chữ vỡ. Lỗi ở encoding, không ở dữ liệu.</text>
</svg>

> 💡 Ghi nhớ: Quy tắc vàng — **luôn khai báo encoding rõ ràng và thống nhất là UTF-8** ở *mọi* lớp: source file, HTTP header (`Content-Type: ...; charset=utf-8`), kết nối DB, cấu hình client. Mojibake gần như luôn là do một mắt xích trong chuỗi đó "đoán" sai encoding.

## Vì sao kỹ sư cần biết

- **Debug:** `0.1 + 0.2 != 0.3`, bộ đếm nhảy âm, tên tiếng Việt thành `Ã©`/`�` — đây là những bug bạn *sẽ* gặp ở production. Biết bản chất bit giúp bạn chẩn đoán trong vài giây thay vì hàng giờ "thử cho hên". Đọc được hex trong stack trace, packet dump, hay log hash là kỹ năng debug nền tảng.
- **Performance & chi phí:** Chọn `int` 32-bit thay vì 64-bit, hay biết một chuỗi tiếng Việt tốn ~3 byte/ký tự, ảnh hưởng trực tiếp tới kích thước record, băng thông và **hoá đơn**. Trên AWS, *data transfer out* và dung lượng *S3*/*DynamoDB* tính theo **byte** — UTF-8 vs UTF-16, hay nén số — đổi thành tiền thật ở quy mô lớn. Encoding gọn còn giúp nhiều dữ liệu lọt vào cache hơn (xem bài Memory Hierarchy).
- **System design & độ đúng đắn:** Thiết kế schema tiền tệ bằng `int` cent hoặc `NUMERIC` (không phải `float`); chọn `BIGINT` cho ID có thể vượt 2 tỷ; ép `utf8mb4` để chứa emoji; chuẩn hoá UTF-8 trên toàn pipeline (API, queue, DB, S3) để không mắt xích nào gây mojibake. Những quyết định "nhỏ" ở tầng biểu diễn dữ liệu này quyết định hệ thống của bạn có *chính xác về tài chính* và *quốc tế hoá được* hay không — những thứ rất khó sửa sau khi đã có dữ liệu thật.

---

Tóm lại: máy tính chỉ thấy bit; mọi "số", "chữ", "tiền", "emoji" đều là quy ước diễn giải các bit đó. Nắm bản chất two's complement, IEEE 754 và UTF-8 biến hàng loạt bug "kỳ bí" thành những hệ quả *đoán trước được* — và đó chính là khác biệt giữa người dùng được công cụ và người *hiểu* công cụ.
