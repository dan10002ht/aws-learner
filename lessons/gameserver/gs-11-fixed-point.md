# Bài 11 — Fixed-point & simulation tất định tuyệt đối

## 1. Mục tiêu

Sau bài này bạn có thể:

- Chỉ ra **bằng số đo** vì sao cùng một file `.go` chạy trên hai kiến trúc CPU lại ra hai thế giới khác nhau, và sau bao lâu thì khác biệt đó nhìn thấy được.
- Cài **Q16.16 trên `int32`** đủ bốn phép, và giải thích vì sao phép nhân **bắt buộc** mượn `int64`.
- Tính **dải, độ phân giải và ngưỡng tràn** của một định dạng Q bất kỳ rồi quy ra đơn vị game.
- Nói được **cái giá thật** bằng số: bao nhiêu phần trăm CPU, đắt hơn bao nhiêu lần ở `sqrt`, và vì sao tràn số ở đây nguy hiểm hơn ở float.
- Dựng `sqrt` bằng Newton-Raphson và `sin` bằng bảng tra, rồi **chọn kích thước bảng** từ sai số mục tiêu.
- Quyết định **khi nào KHÔNG dùng fixed-point**, và vì sao đó là quyết định của tuần đầu tiên.

---

## 2. Triệu chứng

Thí nghiệm sau chạy thật. Một simulation nhỏ: **8 entity trong hộp 20×20 m**, chịu trọng lực, đẩy nhau theo `1/r²`, nảy lại khi chạm tường. Toạ độ `float32`, `dt = 1/64` giây. Không mạng, không `rand`, không goroutine, không `map` — mọi thủ phạm bài 10 liệt kê đều đã bị loại. Cùng một file `.go`, biên dịch **hai lần**:

```
go build ./cmd/sim                 -> nhị phân arm64, chạy native trên Apple M4
GOARCH=amd64 go build ./cmd/sim    -> nhị phân amd64, chạy qua Rosetta 2
```

Hai tiến trình, cùng trạng thái khởi tạo, cùng số bước:

```
frame     1  (0,016 s) : vy của entity #5 lệch ĐÚNG 1 ULP
                        arm64 0x3ecd4ebf = 0,40099141001701355
                        amd64 0x3ecd4ec0 = 0,40099143981933594
                        chênh tuyệt đối 2,98e-08  —  tương đối 0,0000074 %
frame    28  (0,44 s) : toạ độ bắt đầu khác bit
frame   183  (2,86 s) : lệch 1 micromet
frame  1286 (20,09 s) : lệch 1 mm
frame  1519 (23,73 s) : lệch 1 cm        <- vẫn chưa ai nhìn thấy
frame  1783 (27,86 s) : lệch 10 cm       <- bắt đầu nhìn thấy
frame  2225 (34,77 s) : lệch 1 m
frame  2989 (46,70 s) : lệch 10 m
frame  3600 (56,25 s) : lệch 18,13 m trên bản đồ 20 m = 90,6 % chiều rộng
```

Chỗ đau nằm ở cột thời gian. Nó **không hỏng lúc khởi động** — nó chạy hoàn hảo hai mươi giây đầu, đủ để qua QA, đủ để qua CI, đủ để hai người chơi tin rằng họ đang chơi cùng một trận. Rồi ở giây thứ ba mươi, một người thấy quả đạn trúng, người kia thấy nó trượt.

Một bit. Năm mươi sáu giây. Hai trận đấu khác nhau.

Bài 10 chia thủ phạm giết determinism thành ba nhóm; nhóm 3 — khác biệt số học giữa các nền tảng — là nhóm **không vá được bằng kỷ luật code**. Bài này là lời giải cho đúng nhóm đó.

---

## ⏸ Dừng lại — đoán trước #1

**Không `rand`, không goroutine, không `map`. Vậy một bit kia từ đâu ra?**

```
(a) Rosetta 2 dịch sai — chạy trên CPU Intel thật thì không có chuyện này
(b) float32 trên hai kiến trúc có số bit mantissa khác nhau
(c) Compiler Go trên arm64 gộp a*b+c thành MỘT lệnh FMA, trên amd64 thì không
(d) Có data race mà race detector không bắt được
```

---

## 3. Lý thuyết

### 3.1 Thủ phạm: 19,92 % các biểu thức `a*b+c`

Đáp án là **(c)**, và nó đo được.

Lấy 200.000 bộ ba `(a, b, c)` ngẫu nhiên trong `[-1, 1]`, so hai cách viết **tương đương về toán học**:

```go
func plain(a, b, c float64) float64  { return a*b + c }          // compiler ĐƯỢC PHÉP fuse
func noFuse(a, b, c float64) float64 { return float64(a*b) + c } // ép làm tròn giữa chừng
```

| Kiến trúc | Số cặp khác bit | Tỉ lệ |
|---|---|---|
| **arm64** (Apple M4, native) | **39.837 / 200.000** | **19,92 %** |
| **amd64** (cùng Go 1.26.5, qua Rosetta) | **0 / 200.000** | **0,00 %** |

Một ví dụ trong số 39.837 cặp đó:

```
a = -0,86872596156504756   b = -0,68696149053441746   c = -0,80606096217103085
làm tròn hai lần (amd64) : -0,20927968074836067469   bits 0xbfcac9ad3444092c
fused một lần  (arm64)   : -0,20927968074836073020   bits 0xbfcac9ad3444092e
lệch 5,55e-17 = 2 ULP
```

Nếu bạn nhớ bài 10 đo ra **13,96 %** thì không có bài nào sai: bài đó lấy `(a,b,c)` trong
`[0,1)`, bài này lấy trong `[-1,1]`. **Tỉ lệ phụ thuộc mạnh vào phân phối đầu vào** — đo lại
trên cùng máy, cùng Go 1.26.5:

| Phân phối của `(a, b, c)` | Tỉ lệ khác bit |
|---|---|
| `a, b ~ U[0,1)`, `c ~ U[0,10)` | 4,19 % |
| `a, b, c ~ U[0,1)` | 11,65 % |
| `a, b, c ~ U[-1,1)` | 21,04 % |

Từ 4 % tới 21 % tuỳ dải số. Nên đừng nhớ con số — **nhớ rằng nó không bao giờ bằng 0**, và
dải giá trị trong simulation của bạn quyết định nó rơi vào đâu. Vận tốc có dấu âm dương như
`[-1,1]` là trường hợp phổ biến nhất trong game, và nó nằm ở đầu tệ của dải.

Cứ **một phần năm** phép nhân-cộng ra kết quả khác. Và `a*b + c` chính là hình dạng của **mọi dòng tích phân trong mọi simulation**: `v += a*dt` rồi `p += v*dt`.

Đây không phải bug của Go hay của ARM. Đặc tả Go **cho phép** gộp một phép nhân với phép cộng liền sau thành một lệnh chính xác hơn. ARM64 có `FMADD` nên compiler dùng; amd64 không đảm bảo mọi CPU có FMA nên compiler không dùng. Cả hai hợp chuẩn.

Bạn sẽ phản đối hợp lý: *vậy viết `float64(a*b) + c` ở mọi chỗ là xong.* Đi hết con đường đó: bạn tự tắt tối ưu ở đúng vòng lặp nóng nhất, và chỉ cần một người quên một dòng là hỏng — nhưng đó chưa phải chỗ cụt. Chỗ cụt là `math.Sin`, `math.Cos`, `math.Atan2`, `math.Pow`: **IEEE-754 không quy định kết quả của hàm siêu việt.** Mỗi thư viện toán, mỗi phiên bản, mỗi nền tảng được quyền trả về những bit khác nhau và vẫn hợp chuẩn. Không có gì để ép.

Con đường vá từng chỗ cụt không phải vì bạn lười, mà vì thứ bạn đang cố kiểm soát nằm ngoài quyền kiểm soát của bạn.

### 3.2 Ý tưởng: đuổi IEEE-754 ra khỏi phòng

FMA, làm tròn trung gian, thư viện toán, chế độ denormal, thanh ghi 80 bit của x87 — cả danh sách có đúng một điểm chung: **chúng là tự do mà đặc tả dấu chấm động trao cho người cài đặt.** Bỏ dấu chấm động thì cả danh sách biến mất cùng lúc.

| | Dấu chấm động | Số nguyên |
|---|---|---|
| Kết quả của `a*b` | làm tròn theo chế độ hiện hành | **duy nhất, định nghĩa đủ** |
| Compiler được gộp phép tính? | **có** (FMA) — đổi kết quả | có, nhưng **không đổi kết quả** |
| Độ rộng trung gian | 32/64/80 bit tuỳ nền tảng | do **bạn** viết ra trong code |
| `sqrt`, `sin`, `cos` | thư viện của nền tảng | **bạn tự viết**, nên giống nhau |
| Tràn số | bão hoà thành `±Inf` | **wrap around**, định nghĩa đủ trong Go |

Cột phải không có dòng nào phụ thuộc nền tảng. Đó là toàn bộ lý do fixed-point thắng — không phải vì nhanh hơn, không phải vì chính xác hơn (nó **kém** chính xác hơn), mà vì **nó không để lại chỗ nào cho hai CPU bất đồng ý kiến**.

Fixed-point không phải kiểu số mới. Nó là **số nguyên cộng một quy ước đọc**: coi `65536` nghĩa là `1,0`. CPU vẫn làm toán số nguyên và không hề biết bạn đang mô phỏng vật lý.

### 3.3 Q16.16 — bố cục bit và quy ra đơn vị game

<svg viewBox="0 0 700 220" role="img" aria-labelledby="gs11-a-t gs11-a-d" style="width:100%;height:auto">
<title id="gs11-a-t">Bố cục 32 bit của định dạng Q16.16</title>
<desc id="gs11-a-d">Một số nguyên 32 bit chia thành một bit dấu, mười lăm bit phần nguyên trọng số từ 2 mũ 14 xuống 2 mũ 0, và mười sáu bit phần thập phân trọng số từ một phần hai xuống một phần 65536.</desc>
<rect x="40" y="60" width="19.4" height="46" rx="3" fill="#ef4444" fill-opacity="0.30" stroke="currentColor" stroke-opacity="0.35"/>
<rect x="59.4" y="60" width="290.6" height="46" rx="3" fill="#3b82f6" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.35"/>
<rect x="350" y="60" width="310" height="46" rx="3" fill="#84cc16" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.35"/>
<text x="49.7" y="50" text-anchor="middle" font-size="10" fill="currentColor">dấu</text>
<text x="204.7" y="50" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">15 bit phần nguyên</text>
<text x="505" y="50" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">16 bit phần thập phân</text>
<text x="49.7" y="88" text-anchor="middle" font-size="11" fill="currentColor">s</text>
<text x="72" y="88" font-size="9" fill="currentColor" opacity="0.85">2^14</text>
<text x="330" y="88" text-anchor="end" font-size="9" fill="currentColor" opacity="0.85">2^0</text>
<text x="360" y="88" font-size="9" fill="currentColor" opacity="0.85">1/2</text>
<text x="648" y="88" text-anchor="end" font-size="9" fill="currentColor" opacity="0.85">1/65536</text>
<line x1="350" y1="56" x2="350" y2="112" stroke="currentColor" stroke-opacity="0.75" stroke-width="2"/>
<text x="350" y="126" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">dấu phẩy nằm ở đây — và nó KHÔNG di chuyển</text>
<text x="40" y="160" font-size="10" fill="currentColor">raw = round(x × 65536) · đọc ngược: x = raw / 65536</text>
<text x="40" y="182" font-size="10" fill="currentColor">ví dụ: 9,8 → raw 642.253 → đọc lại 9,8000030517578125 (lệch 3,05e-06)</text>
</svg>

`Q16.16` = 16 bit phần nguyên + 16 bit phần thập phân; bit dấu nằm trong phần nguyên nên thực chất là 1 dấu + 15 nguyên + 16 lẻ.

```go
type Fix int32

const FracBits = 16
const One = Fix(1 << FracBits) // 65536

func FromFloat(f float64) Fix { return Fix(math.Round(f * float64(One))) }
func (a Fix) Float() float64  { return float64(a) / float64(One) }
```

`FromFloat` chỉ dùng lúc **nạp cấu hình và asset**, không bao giờ nằm trong vòng lặp simulation. Đó là ranh giới: `float64` được phép tồn tại ở rìa hệ thống, không được bước vào trong.

Ba con số của Q16.16 với quy ước **1 đơn vị = 1 mét** — và quy tiếp ra chuyển động, vì đó mới là chỗ thấy được nó đủ hay thiếu:

```
1 LSB = 1/65536 = 0,0000152587890625  →  15,26 micromet = 0,0153 mm
dải [−32.768 ; +32.767,99998474]      →  ±32,768 km

entity chạy 10 m/s, tick 64 Hz → mỗi tick đi 0,15625 m = 10.240 LSB
đạn bay   900 m/s, tick 64 Hz → mỗi tick đi 14,0625 m = 921.600 LSB
vận tốc chậm nhất biểu diễn được: 1 LSB mỗi tick = 0,9766 mm/s
```

10.240 bước phân giải cho một bước đi của nhân vật là thừa thãi. Nỗi lo "fixed-point không đủ mịn" gần như luôn sai với Q16.16 ở quy mô người và mét. Nỗi lo đúng nằm ở chỗ khác — mục 3.6.

### 3.4 Bốn phép — và cái bẫy ở phép nhân

Cộng trừ không có gì để nói: hai số cùng thang `65536`, cộng thẳng số nguyên. Nhân thì khác — `a` và `b` cùng mang thang `65536` nên tích mang thang `65536²`, phải dịch phải 16 bit để về thang cũ. Viết thẳng ra:

```go
func (a Fix) MulNaive(b Fix) Fix { return Fix((int32(a) * int32(b)) >> FracBits) }
```

---

## ⏸ Dừng lại — đoán trước #2

`MulNaive` nhìn đúng về thang đo. Chạy nó với hai con số bé xíu:

```
2,5 × 3,5   (đáp số toán học: 8,75)
```

**Nó trả về bao nhiêu?**

```
(a) 8,75 — đúng
(b) 8,74997... — sai một chút do làm tròn
(c) 0 — kết quả bị dịch mất
(d) Một số âm
```

---

### 3.5 Đáp án — phép nhân bắt buộc mượn `int64`

Đáp án là **(d)**: `MulNaive(2,5 ; 3,5)` trả về **−0,25**. Output thật:

```
     a  ×      b   | raw a     raw b     | dùng int64      | dùng int32
   2,5  ×    3,5   | 163840    229376    |      8,7500     |     −0,2500
 100,0  ×  200,0   | 6553600   13107200  |  20000,0000     |      0,0000
 300,0  ×  200,0   | 19660800  13107200  |  −5536,0000     |      0,0000
 181,0  ×  181,0   | 11862016  11862016  |  32761,0000     |      0,0000
```

Lý do hiện ra khi viết tích: `2,5` là `163.840`, `3,5` là `229.376`, tích là `37.580.963.840` — vượt trần `int32` (`2.147.483.647`) **hơn 17 lần**, trong khi hai số vào chỉ là 2,5 và 3,5. Với `300 × 200`, tích là `257.698.037.760.000`, cần **49 bit**. Quy tắc không có ngoại lệ: **tích hai số N bit cần 2N bit.**

```go
func (a Fix) Mul(b Fix) Fix { return Fix((int64(a) * int64(b)) >> FracBits) }
func (a Fix) Div(b Fix) Fix { return Fix((int64(a) << FracBits) / int64(b)) }
```

Chia đối xứng: muốn thương mang thang `65536` thì phải dịch trái số bị chia **trước khi** chia, và `a << 16` cũng tràn `int32` ngay với `a` lớn hơn 32.768. Lại `int64`.

Chi tiết dễ bỏ: `>> 16` trên số âm trong Go là dịch phải số học, tức làm tròn **xuống phía âm vô cực**, không phải cắt về 0. Nó **tất định** nên không giết determinism, nhưng là một quyết định thiết kế — muốn làm tròn đến số gần nhất thì cộng `1 << 15` trước khi dịch. Chọn rồi thì đừng đổi giữa chừng, vì đổi là hỏng mọi replay cũ.

### 3.6 Cái giá thứ nhất: tràn số **im lặng**

Khi float tràn, nó **bão hoà**: `float32(3e38) * 10 = +Inf`. Đó là tín hiệu — `Inf − Inf = NaN`, `NaN` so sánh gì cũng `false`, nhân vật biến mất, log đầy `NaN`. Xấu xí, nhưng **bạn biết ngay là đã hỏng**.

Khi fixed-point tràn, nó **quay vòng, và im lặng**:

```
 1000 × 100   = −31.072      (đúng phải là 100.000)
  200 × 200   = −25.536      (đúng phải là 40.000)
32000 × 2     =  −1.536      (đúng phải là 64.000)
```

Không exception, không `NaN`, không một dòng log — chỉ một con số hợp lệ hoàn hảo về kiểu dữ liệu và hoàn toàn sai về vật lý.

Chỗ nó cắn thật là công thức phổ biến nhất trong mọi game: bình phương khoảng cách `dx.Mul(dx) + dy.Mul(dy)`. Kết quả mang đơn vị **mét bình phương**, mà trần Q16.16 là `32.767,99998474`, tức ngưỡng an toàn `sqrt(32.767,99998474) = 181,02 m`:

| Khoảng cách `d` | `d.Mul(d)` cho ra | Đúng phải là | |
|---|---|---|---|
| 100 m | 10.000,00 | 10.000 | OK |
| **181 m** | **32.761,00** | 32.761 | OK — sát mép |
| **182 m** | **−32.412,00** | 33.124 | **tràn, đổi dấu** |
| 200 m | −25.536,00 | 40.000 | tràn |
| **1.000 m** | **+16.960,00** | 1.000.000 | **tràn, ra số DƯƠNG HỢP LÝ** |

Dòng cuối là dòng ác nhất. Hai entity cách nhau **1 km**; `d2` trả về `16.960`, căn ra **130,2 m**. Area of Interest tin chúng gần nhau. Va chạm tin chúng gần nhau. Không gì cảnh báo, vì `16.960` là giá trị hoàn toàn hợp lệ.

> **Toạ độ nằm trong dải không đảm bảo phép tính trên toạ độ nằm trong dải.** Q16.16 cho bạn bản đồ ±32,768 km, nhưng bình phương khoảng cách có trần thật là **181 m**.

Ba cách xử lý, cả ba là quyết định kiến trúc chứ không phải mẹo vặt: tính `d2` ở `int64` rồi mới hạ xuống; đổi sang Q32.32 (mục 3.7); hoặc đổi đơn vị — cho 1 đơn vị = 1 **centimet**, bản đồ thu về ±327,68 m nhưng ngưỡng `d2` đổi thang tương ứng. Thang đo là thứ bạn chọn, không phải thứ trời cho. Bất kể chọn cách nào: **viết test cho ngưỡng tràn**. Fixed-point không tự kêu; bạn phải lắp còi cho nó.

### 3.7 Chọn định dạng Q — đánh đổi chỉ có một chiều

Tổng số bit cố định, nên mỗi bit chuyển từ phần nguyên sang phần thập phân là **gấp đôi độ phân giải và chia đôi dải**. Bảng tính cho quy ước 1 đơn vị = 1 mét:

| Định dạng | Kiểu | Dải (mét) | Dải quy ra | Độ phân giải | Ngưỡng `d²` | Dùng khi |
|---|---|---|---|---|---|---|
| **Q8.24** | `int32` | ±128 | ±128 m | **0,0596 micromet** | 11,3 m | Bản đồ tí hon, cần cực mịn — hiếm |
| **Q16.16** | `int32` | ±32.768 | **±32,768 km** | **15,26 micromet** | **181 m** | **Mặc định.** 2D, arena, fighting |
| **Q24.8** | `int32` | ±8.388.608 | ±8.388 km | 3,906 mm | 2.896 m | Bản đồ rộng, mịn milimet là đủ |
| **Q32.32** | `int64` | ±2.147.483.648 | ±2,147 triệu km | **0,233 nanomet** | 46.341 m | 3D, world lớn, muốn ngủ ngon |
| **Q40.24** | `int64` | ±549.755.813.888 | ±550 triệu km | 59,6 nanomet | 741 km | Không gian vũ trụ |

Đọc bảng theo cột **ngưỡng `d²`**, đừng đọc theo cột dải — mục 3.6 vừa cho thấy cột dải là con số dễ làm người ta yên tâm sai.

- **2D, bản đồ dưới 30 km, chuyển động quy mô người** → **Q16.16**. Mặc định đúng, và là lý do nó phổ biến tới mức thành tên gọi chung của cả kỹ thuật.
- **3D, hoặc bản đồ lớn, hoặc có thành phần rất nhanh** → **Q32.32 trên `int64`**. Đắt gấp đôi bộ nhớ mỗi toạ độ nhưng gần như xoá sổ nhóm bug tràn số.
- **Nghi ngờ** → chọn cái rộng hơn. Chi phí Q32.32 là bộ nhớ, đo được và dự đoán được. Chi phí một lần tràn im lặng ở production là một tuần debug và một bản replay không tái hiện được.

### 3.8 `dt` cũng phải biểu diễn được — 64 Hz thắng 60 Hz

Bài 5 đã chốt `dt` là hằng số. Câu hỏi tiếp theo trong fixed-point: hằng số đó có biểu diễn **chính xác** không?

| Tick rate | `dt` thật | raw | đọc lại | Sai số mỗi bước | Sau 3.600 bước |
|---|---|---|---|---|---|
| 30 Hz | 0,033333333… | 2185 | 0,0333404541015625 | 7,12e-06 | 0,025635 s |
| **60 Hz** | 0,016666666… | 1092 | 0,01666259765625 | **4,07e-06** | **0,014648 s** |
| **64 Hz** | **0,015625** | **1024** | **0,015625** | **0** | **0** |
| 100 Hz | 0,01 | 655 | 0,0099945068359375 | 5,49e-06 | 0,019775 s |
| 144 Hz | 0,006944444… | 455 | 0,0069427490234375 | 1,70e-06 | 0,006104 s |
| **128 Hz** / **256 Hz** | **0,0078125** / **0,00390625** | 512 / 256 | chính xác | **0** | **0** |

Ba dòng sai số bằng **đúng 0** đều là luỹ thừa của 2. Không trùng hợp: `1/2^k` là thứ duy nhất mà một định dạng nhị phân biểu diễn không mất gì.

Điều này **không phá determinism** — 60 Hz trong fixed-point vẫn tất định tuyệt đối, vì `1092` là `1092` trên mọi CPU. Nhưng thế giới chạy hơi lệch đồng hồ thật: ở 60 Hz, sau một phút chơi, thời gian mô phỏng lệch **0,0146 giây**. Với game thì vô hại; với hệ thống ghi replay đối chiếu theo dấu thời gian thì không.

> Đã chọn fixed-point thì chọn luôn tick rate là **luỹ thừa của 2**. 64 thay vì 60, 128 thay vì 120. Miễn phí, và xoá một nguồn lệch.

*(Nhiều engine rollback chạy 60 Hz vì lý do lịch sử — màn hình NTSC. Lập luận "chọn 64 để `dt` chính xác" là của bài này, không phải sự thật lịch sử về engine cụ thể nào.)*

Cùng logic áp cho **mọi hằng số game**, và đây là chỗ tốn công nhất khi di cư:

```
9,8  (trọng lực) → raw 642.253 → 9,8000030517578125   lệch 0,00003 %
0,8  (hệ số nảy) → raw  52.429 → 0,8000030517578125   lệch 0,00038 %
0,1              → raw   6.554 → 0,100006103515625    lệch 0,0061 %
pi               → raw 205.887 → 3,1415863037109375   lệch 0,0002 %
0,5              → raw  32.768 → 0,5                  lệch 0 %
```

Không con số nào đáng lo về vật lý. Cái đáng lo là **số lượng**: mọi hằng số trong mọi file cân bằng phải đi qua bước này, và mỗi lần designer chỉnh một số là một lần nữa.

*(Đây cũng là lý do bài này chọn `dt = 1/64` cho mọi thí nghiệm ở trên.)*

### 3.9 Bằng chứng: chạy lại thí nghiệm ở mục 2

Cùng simulation của mục 2, viết **hai bản** — một `float32`, một Q16.16 — vẫn build cho hai kiến trúc. Checksum FNV-1a của **toàn bộ state** (32 giá trị `px`, `py`, `vx`, `vy` của 8 entity):

| Frame | `float32` arm64 | `float32` amd64 | | Q16.16 arm64 | Q16.16 amd64 | |
|---|---|---|---|---|---|---|
| 1 | `0xf7d0a958…` | `0xa855e282…` | **khác** | `0x193e563ae098796e` | `0x193e563ae098796e` | **khớp** |
| 60 | `0x1cabeca7…` | `0xf6fcda60…` | **khác** | `0x5a626f0d1c745812` | `0x5a626f0d1c745812` | **khớp** |
| 600 | `0xcb994b24…` | `0x94dc0659…` | **khác** | `0xaa84d071e216894f` | `0xaa84d071e216894f` | **khớp** |
| 3.600 | `0xe2adf094…` | `0xf0144e5a…` | **khác** | `0x134fb64df1160454` | `0x134fb64df1160454` | **khớp** |

Giá trị cụ thể ở frame 3.600:

```
float32  px[0] :  arm64  17,905649185     amd64  7,840567112     lệch 10,07 m
Q16.16   px[0] :  arm64  620.724 raw      amd64  620.724 raw     lệch 0
```

<svg viewBox="0 0 700 260" role="img" aria-labelledby="gs11-b-t gs11-b-d" style="width:100%;height:auto">
<title id="gs11-b-t">Độ lệch giữa hai kiến trúc theo frame, thang log</title>
<desc id="gs11-b-d">Đường float32 leo từ một phần triệu mét ở frame 28 lên mười tám mét ở frame 3600, trong khi đường Q16.16 nằm phẳng ở độ lệch bằng không suốt toàn bộ.</desc>
<line x1="40" y1="30" x2="40" y2="212" stroke="currentColor" stroke-opacity="0.45"/>
<line x1="40" y1="212" x2="668" y2="212" stroke="currentColor" stroke-opacity="0.45"/>
<text x="34" y="169" text-anchor="end" font-size="9" fill="currentColor">1 µm</text>
<text x="34" y="118" text-anchor="end" font-size="9" fill="currentColor">1 mm</text>
<text x="34" y="84" text-anchor="end" font-size="9" fill="currentColor">10 cm</text>
<text x="34" y="67" text-anchor="end" font-size="9" fill="currentColor">1 m</text>
<text x="34" y="50" text-anchor="end" font-size="9" fill="currentColor">10 m</text>
<line x1="40" y1="166" x2="668" y2="166" stroke="currentColor" stroke-opacity="0.12"/>
<line x1="40" y1="115" x2="668" y2="115" stroke="currentColor" stroke-opacity="0.12"/>
<line x1="40" y1="81" x2="668" y2="81" stroke="currentColor" stroke-opacity="0.12"/>
<line x1="40" y1="47" x2="668" y2="47" stroke="currentColor" stroke-opacity="0.12"/>
<polyline points="44.8,181.6 71.5,166 261.5,115 301.6,98 347.1,81 423.2,64 554.7,47 660,42.6" fill="none" stroke="#ef4444" stroke-width="2.5"/>
<circle cx="44.8" cy="181.6" r="3.5" fill="#ef4444"/>
<circle cx="347.1" cy="81" r="3.5" fill="#ef4444"/>
<circle cx="660" cy="42.6" r="3.5" fill="#ef4444"/>
<text x="360" y="74" font-size="9" fill="currentColor">frame 1.783 — 10 cm, người chơi bắt đầu thấy</text>
<text x="660" y="34" text-anchor="end" font-size="10" font-weight="bold" fill="currentColor">18,13 m — 90,6 % bản đồ</text>
<line x1="40" y1="212" x2="668" y2="212" stroke="#84cc16" stroke-width="3"/>
<text x="356" y="228" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">Q16.16 — lệch đúng 0 ở mọi frame, trên cả hai kiến trúc</text>
<text x="44.8" y="248" text-anchor="middle" font-size="9" fill="currentColor">f.28</text>
<text x="356" y="248" text-anchor="middle" font-size="9" fill="currentColor">frame (dt = 1/64 s)</text>
<text x="660" y="248" text-anchor="end" font-size="9" fill="currentColor">f.3600</text>
<text x="52" y="42" font-size="10" font-weight="bold" fill="currentColor">float32</text>
</svg>

Nói rõ giới hạn, vì không được nói quá: **amd64 ở đây chạy qua Rosetta 2**, tức mã máy x86-64 do compiler Go sinh ra, dịch động sang ARM để thực thi. Thí nghiệm chứng minh chắc chắn rằng **compiler sinh hai chuỗi lệnh khác nhau cho cùng một file nguồn, và hai chuỗi đó cho hai kết quả khác nhau**. Nó **không** chứng minh mọi cặp CPU thật ngoài đời đều lệch đúng như vậy — số cụ thể thay đổi theo CPU, phiên bản compiler và cờ build. Cái không đổi là **chiều** của kết luận: float cho bạn một lời hứa không ai ký, fixed-point cho bạn một lời hứa mà số nguyên ký thay.

Một hệ quả vận hành: cột `float32` ở frame 1 — **checksum đã khác ngay bước đầu tiên**. Lockstep kiểm checksum mỗi frame sẽ **phát hiện desync ở frame 1**, trong khi mắt người phải chờ tới frame 1.783. Bài 22 dùng lại đúng cơ chế này.

---

## ⏸ Dừng lại — đoán trước #3

**Một bước simulation đầy đủ (8 entity, 28 cặp tương tác, có phép chia) viết bằng Q16.16 đắt hơn bản `float32` bao nhiêu?**

```
(a) Rẻ hơn — số nguyên nhanh hơn dấu chấm động
(b) Đắt hơn khoảng 1–2 %
(c) Đắt hơn 2–3 lần
(d) Đắt hơn 10 lần trở lên
```

Câu này có **hai** đáp án đúng tuỳ bạn nhìn phép nào.

---

### 3.10 Đo giá: số học gần như miễn phí, hàm siêu việt thì không

Bench trên **Apple M4, Go 1.26.5**, mỗi mục 7 lần lấy trung vị, `0 allocs/op` ở tất cả:

| Phép | Q16.16 | `float32` | Tỉ lệ |
|---|---|---|---|
| Cộng | **0,322 ns** | 0,683 ns | fixed **nhanh hơn 2,12×** |
| Nhân | **0,344 ns** | 0,839 ns | fixed **nhanh hơn 2,44×** |
| Chia | **0,536 ns** | 0,619 ns | fixed nhanh hơn 1,15× |
| **Căn bậc hai** | **7,602 ns** | **0,504 ns** | **fixed CHẬM HƠN 15,1×** |

*(Đây là **thông lượng** đo trong vòng lặp có khai thác song song lệnh, không phải độ trễ một lệnh đơn lẻ. CPU hiện đại có nhiều cổng ALU số nguyên hơn cổng dấu chấm động nên tỉ lệ thiên vị số nguyên. Bậc độ lớn đáng tin; con số chính xác thay đổi theo CPU và compiler.)*

Bây giờ đo thứ thật sự quan trọng — **một bước simulation đầy đủ**: 8 entity, 28 cặp tương tác (mỗi cặp một phép chia), cộng va chạm tường. Mỗi phép đo là 64 bước liên tiếp, tức **một giây game ở 64 Hz**:

| | 64 bước | Một bước | % ngân sách tick 15,625 ms |
|---|---|---|---|
| `float32` | **3.415 ns** | 53,4 ns | 0,00034 % |
| **Q16.16** | **3.463 ns** | 54,1 ns | 0,00035 % |
| Chênh lệch | **+48 ns** | +0,7 ns | **+1,41 %** |

Đáp án hộp #3 là **(b)** nếu nhìn cả bước simulation, và **(a)** nếu chỉ nhìn phép cộng và phép nhân. Cả hai đều thật, và cùng dẫn tới một kết luận:

> **Fixed-point không đắt về CPU.** Một bước sim tốn thêm **1,41 %**, trên một thứ vốn chỉ tiêu 0,00035 % ngân sách một tick.

Từ chối fixed-point vì "sợ chậm" là từ chối vì một lý do không có thật; lý do thật nằm ở mục 4. Nhưng dòng `sqrt` trong bảng đầu thì thật, và nó dẫn thẳng sang mục sau.

### 3.11 `sqrt`, `sin`, `cos` — bạn phải tự viết

Bỏ `math.Sqrt` nghĩa là bỏ toàn bộ `math` và dựng lại từng hàm bạn dùng.

**`sqrt` bằng Newton-Raphson.** Lặp `x ← (x + a/x) / 2`, hội tụ bậc hai — mỗi vòng gấp đôi số chữ số đúng. Mấu chốt là **hạt giống**: đoán bừa `x₀ = 1` thì cần rất nhiều vòng; lấy `x₀ = 2^((log2(a)+16)/2)` — nửa số bit của `a` — thì 6 vòng đủ cho toàn dải:

```go
func (a Fix) Sqrt() Fix {
	if a <= 0 { return 0 }
	n := uint(0)
	for v := uint64(a); v > 1; v >>= 1 { n++ }
	x := Fix(1) << ((n + FracBits) / 2)
	for i := 0; i < 6; i++ { x = (x + a.Div(x)) >> 1 }
	return x
}
```

Sai số đo thật, đối chiếu `math.Sqrt`:

```
sqrt(2)     fixed 1,414200   thật 1,414214   lệch 0,90 LSB
sqrt(1000)  fixed 31,622772  thật 31,622777  lệch 0,29 LSB
sqrt(20000) fixed 141,421356 thật 141,421356 lệch 0,002 LSB
quét 0,01 → 2.000 (bước 0,01): sai số lớn nhất 2,60 LSB = 0,0000397 = 39,7 micromet
```

Bốn mươi micromet trên dải hai nghìn mét — độ chính xác **không phải** vấn đề. Tốc độ mới là: `7,602 ns` mỗi lần gọi, **15,1 lần** đắt hơn lệnh phần cứng. Quy ra ngân sách một tick 64 Hz (15,625 ms):

| Entity, mỗi entity 1 `sqrt`/tick | Q16.16 | % ngân sách | `float32` | % ngân sách |
|---|---|---|---|---|
| 100 | 0,76 µs | 0,0049 % | 0,05 µs | 0,0003 % |
| 1.000 | 7,60 µs | **0,0487 %** | 0,50 µs | 0,0032 % |
| 10.000 | 76,02 µs | **0,4865 %** | 5,04 µs | 0,0322 % |

Ở 10.000 entity, `sqrt` ăn **0,49 %** ngân sách — vẫn nhỏ, nhưng **gấp 15 lần** phần dấu chấm động, và là dòng duy nhất trong bài mà con số bắt đầu đáng nhìn. Cách chữa cổ điển: **đừng gọi `sqrt`** — so khoảng cách thì so `d²` với `r²` là xong. Mẹo này đúng cả với float, nhưng với fixed-point nó chuyển từ "tối ưu nhỏ" thành "thói quen bắt buộc".

**`sin` và `cos` bằng bảng tra.** Newton-Raphson không áp được cho lượng giác, nên đổi chiến thuật: dựng sẵn bảng `Fix` cho một vòng tròn rồi tra. Câu hỏi thiết kế là bảng bao nhiêu mục và **có nội suy hay không**. Sai số lớn nhất trên 100.000 góc quét đều:

| Số mục | Bộ nhớ | Tra thẳng (nearest) | Nội suy tuyến tính |
|---|---|---|---|
| 64 | 260 B | 6.417,7 LSB | **80,00 LSB** |
| **256** | **1,0 KB** | 1.602,1 LSB | **6,28 LSB** |
| 1.024 | 4,0 KB | 396,1 LSB | **1,70 LSB** |
| 4.096 | 16,0 KB | 94,7 LSB | **1,43 LSB** |

Đọc bảng theo đường chéo:

> Bảng **256 mục có nội suy** (1,0 KB, sai 6,28 LSB) **chính xác hơn 15,1 lần** so với bảng **4.096 mục tra thẳng** (16,0 KB, sai 94,7 LSB), trong khi tốn **ít hơn 15,9 lần** bộ nhớ.

Nội suy tuyến tính tốn thêm một trừ, một nhân, một cộng — khoảng 1 ns theo bảng mục 3.10 — và mua được nhiều hơn việc nhân bảng lên 16 lần. Một trong số ít chỗ mà đánh đổi **không** đối xứng: gần như luôn nên nội suy.

Chú ý hai dòng cuối: từ 1.024 lên 4.096 mục, sai số chỉ giảm 1,70 → 1,43 LSB. Bảng hết tác dụng — thứ giới hạn giờ là **sàn lượng tử của chính Q16.16**, nên tăng bảng thêm là mua bộ nhớ đổi lấy không gì cả. 1.024 mục (4 KB) là điểm dừng hợp lý.

---

## 4. Khi nào **không** nên dùng fixed-point

Cái bẫy phổ biến nhất sau khi đọc một bài về determinism là đi viết lại simulation bằng fixed-point cho một game không cần nó. Bài 9 chia determinism thành ba mức; đặt cột "fixed-point mua được gì" bên cạnh:

| Mức | Nghĩa là | Ai cần | Fixed-point mua được gì |
|---|---|---|---|
| **(a) cùng máy, cùng binary** | chạy lại hai lần trong một tiến trình ra kết quả giống nhau | replay server-side, unit test, reconciliation trong một process | **Gần như không gì.** `float64` đã tất định ở mức này; việc cần làm là loại `map`, `rand` toàn cục, thứ tự duyệt bất định |
| **(b) cùng kiến trúc, khác máy** | hai server cùng CPU family cho kết quả giống nhau | fleet server đồng nhất, verify replay ở backend | **Rất ít.** Cùng binary trên cùng kiến trúc thường đã khớp — miễn là khoá cờ compiler |
| **(c) cross-platform** | ARM vs x86, client vs server, Windows vs iOS | **rollback / lockstep P2P** trên nhiều loại máy | **Tất cả.** Mức duy nhất mà float **chắc chắn** thất bại (mục 3.1) |

Câu then chốt, vì nó loại phần lớn dự án ra khỏi danh sách:

> **Có authoritative server làm trọng tài thì bạn chỉ cần mức A.**

Lý do là kiến trúc của bài 1: một trận có **một chủ sở hữu**, chạy trên **một máy, một binary**. Client dự đoán sai thì server sửa — đó chính là reconciliation của bài 19, và nó **được thiết kế để hoạt động** ngay cả khi client tính ra số hơi khác. Không ai cần client và server khớp từng bit; chỉ cần khớp đủ gần để độ lệch nằm dưới ngưỡng bỏ qua.

Ba câu hỏi tự quyết, theo thứ tự:

1. **Có một máy duy nhất nắm quyền phán quyết không?** Có → mức A → **không cần fixed-point**.
2. **Không có trọng tài, mọi máy tự chạy simulation và kết quả phải khớp?** (lockstep RTS, rollback fighting game) → sang câu 3.
3. **Các máy đó cùng kiến trúc CPU không?** Chỉ PC Windows x86 → mức B, float **có thể** đủ nếu khoá chặt cờ compiler và tránh hàm siêu việt, nhưng bạn đang đi trên băng mỏng. **Có cả PC lẫn console lẫn di động** → mức C → **fixed-point, không có phương án thứ hai**.

Nhắc lại cho công bằng: cái giá CPU là **+1,41 %**. Với dự án ở mức A, 1,41 % đó mua về **đúng không gì cả** — và bạn vẫn trả toàn bộ phần còn lại của hoá đơn: tràn số im lặng, tự viết `sqrt`/`sin`, code khó đọc hơn, mọi hằng số phải chuyển đổi, mọi người mới vào đội phải học lại cách viết một phép nhân.

### 4.1 Con đường di cư: đây là viết lại, không phải refactor

Giả sử bạn ở mức A, đã có sáu tháng code `float32`, rồi producer quyết định thêm chế độ rollback P2P chạy được cả trên di động. Bạn vừa nhảy lên mức C. Câu hỏi tự nhiên là "đổi kiểu số mất bao lâu", và câu trả lời là **nó không phải một lần đổi kiểu**, vì kiểu số là thứ **lan toả**:

```
đổi Vec2 từ float32 sang Fix
  → mọi hàm nhận Vec2 phải đổi
    → mọi hằng số trong file cân bằng phải đổi        (mục 3.8)
      → mọi công thức gọi math.* phải viết lại        (mục 3.11)
        → mọi biểu thức bình phương phải soát tràn    (mục 3.6)
          → mọi test golden phải sinh lại — số kỳ vọng cũ SAI HẾT
            → mọi asset có toạ độ (map, spawn, hitbox) phải chuyển đổi
              → mọi replay đã lưu thành KHÔNG PHÁT LẠI ĐƯỢC
```

Không adapter nào bắc qua chuỗi đó. Bạn không thể để nửa simulation dùng `Fix` và nửa kia dùng `float32` — chỗ nối giữa hai nửa **chính là** chỗ float chui lại vào, và nó phá determinism y như thể bạn chưa làm gì.

> **Fixed-point là quyết định của tuần đầu tiên, không phải của tháng thứ sáu.** Câu hỏi ở tuần đầu không phải "có cần fixed-point không", mà là **"game này có bao giờ cần mức C không"** — kể cả ở một chế độ chơi chưa ai nhắc tới.

Nếu câu trả lời là "chắc là không, nhưng có thể", có đường giữa: **đóng gói toàn bộ số học vào một kiểu `Scalar` từ ngày đầu**, không bao giờ viết `float32` trần trong code simulation, không bao giờ gọi `math.*` trực tiếp. Nó không làm việc di cư thành miễn phí — vẫn phải sinh lại golden test và soát tràn số — nhưng biến "sửa ở mười nghìn chỗ" thành "sửa ở một chỗ và soát mười nghìn chỗ".

---

## 5. Tính tay

**Bài 1.** Một đội chọn **Q20.12 trên `int32`** (1 bit dấu, 19 bit nguyên, 12 bit lẻ), quy ước 1 đơn vị = 1 mét.
- Dải bao nhiêu mét (quy ra km), và độ phân giải bao nhiêu milimet?
- Ngưỡng tràn khi tính `dx*dx + dy*dy` là bao nhiêu mét? So với 181 m của Q16.16 thì tốt hơn hay tệ hơn, và vì sao kết quả đó là tất yếu?
- Game của họ là bắn súng góc nhìn thứ nhất, bản đồ 4×4 km, nhân vật cao 1,8 m. Định dạng này đúng hay sai, và nếu sai thì sai ở cột nào của bảng mục 3.7?

**Bài 2.** Một game lockstep chạy **50 Hz** bằng Q16.16.
- `dt = 0,02`. Raw của nó là bao nhiêu (làm tròn đến số nguyên gần nhất), đọc ngược ra bao nhiêu, sai số mỗi bước?
- Sau **một giờ** chơi liên tục, thời gian mô phỏng lệch bao nhiêu giây so với đồng hồ thật?
- Sai số đó có phá determinism không? Trả lời có/không kèm một câu giải thích.
- Nếu được đổi tick rate, bạn chọn số nào, và nó đổi cả ba con số trên thành gì?

**Bài 3.** Một MMO-lite: **5.000 entity**, tick **64 Hz**, mỗi entity gọi `sqrt` **hai lần** mỗi tick. Dùng `7,602 ns` cho fixed-point và `0,504 ns` cho `float32`.
- Mỗi tick tốn bao nhiêu micro giây cho riêng `sqrt` ở mỗi phương án, và bao nhiêu phần trăm ngân sách 15,625 ms? Chênh lệch giữa hai phương án là bao nhiêu micro giây mỗi giây?
- Cần bao nhiêu lời gọi `sqrt` fixed-point mỗi tick để nó ăn hết **10 %** ngân sách?
- Bạn bỏ được lời gọi thứ nhất bằng cách so `d²` với `r²`. Số ở câu đầu đổi thành gì, và điều đó nói gì về thứ tự ưu tiên khi tối ưu một simulation fixed-point?

---

## 6. Chuyển giao

**Bạn làm một game đấu bài kết hợp chiến thuật theo lượt.** Không server: hai người chơi kết nối P2P, mỗi máy chạy đủ simulation và tin máy kia ra cùng kết quả. Một trận khoảng **15 phút**. Người chơi trên **iOS (ARM), Android (ARM), Windows (x86), Steam Deck (x86)**. Producer nói thẳng là sẽ không bao giờ có authoritative server.

1. Theo ba mức của mục 4, dự án này ở mức nào? Fixed-point là bắt buộc, nên có, hay lãng phí?
2. Simulation gần như không có vật lý liên tục — chỉ tính sát thương, hiệu ứng trạng thái và thứ tự hành động. Điều đó có làm câu 1 đổi đáp án không? Lập luận cho **cả hai** phía trước khi chốt.
3. Có lá bài "gây sát thương bằng **35 %** máu hiện tại, làm tròn xuống". Máu là số nguyên. Viết phép tính đó bằng Q16.16, chỉ ra chính xác chỗ có thể lệch giữa hai máy, và cách bạn loại bỏ nó mà **không** cần fixed-point.
4. Trận 15 phút ở 64 Hz là **57.600 frame**. Đường phân kỳ ở mục 3.9 (10 cm ở frame 1.783) có áp được cho game này không? Nếu không thì vì sao, và cái gì mới là đơn vị đo phân kỳ đúng ở đây?
5. Bạn gửi **checksum state mỗi 60 frame** để bắt desync sớm. Với game này, checksum lệch ở frame 60 nên là lỗi nghiêm trọng hay cảnh báo? Và nếu nó lệch, bạn làm gì với ván đang chơi — có phương án nào ngoài huỷ trận không?
6. **Câu khó nhất:** đội dùng fixed-point cho toàn bộ gameplay và mọi thứ chạy đúng. Sáu tháng sau, designer muốn thêm **hiệu ứng hạt và vật lý mềm cho lá bài bay trên bàn** — thuần thị giác, không ảnh hưởng luật chơi — và thư viện duy nhất có sẵn chạy `float64` trên GPU. Câu hỏi không phải "có làm được không", mà là: **ranh giới giữa "phần tất định" và "phần trang trí" nằm chính xác ở đâu, ai có quyền vẽ nó, và điều gì xảy ra khi một hiệu ứng trang trí vô tình trở thành thông tin mà người chơi dùng để ra quyết định?** Đây không thuần tuý là câu hỏi kỹ thuật: nghĩ xem chuyện gì xảy ra khi một lá bài "trang trí" rơi chậm hơn ở máy này so với máy kia.

---

## 7. Tóm tắt

- Cùng một file `.go` build cho arm64 và amd64: lệch **1 ULP ở frame 1**, **10 cm ở frame 1.783 (27,9 s)**, **18,13 m ở frame 3.600 — 90,6 % bản đồ 20 m**. Nó không hỏng lúc khởi động; nó hỏng ở giữa trận.
- Thủ phạm đo được: trên arm64, **19,92 % trong 200.000 biểu thức `a*b+c`** khác bit so với bản không fuse; trên amd64 là **0,00 %**. Compiler được phép gộp thành FMA — đây là nhóm mà bài 10 xếp là **không vá được bằng kỷ luật code**.
- Fixed-point thắng vì **nó là số nguyên**: phép toán số nguyên định nghĩa đủ, không làm tròn tuỳ nền tảng, không FMA làm đổi kết quả, không thư viện `sin`/`cos` riêng từng hệ. IEEE-754 không tham gia.
- **Q16.16** = 1 dấu + 15 nguyên + 16 lẻ. Với 1 đơn vị = 1 m: độ phân giải **15,26 micromet**, dải **±32,768 km**, và một entity 10 m/s ở 64 Hz đi **10.240 LSB** mỗi tick — thừa mịn.
- **Nhân phải mượn `int64`** (tích hai số 32 bit cần 64 bit): `MulNaive(2,5 ; 3,5)` trả về **−0,25**, còn `300 × 200` cần **49 bit**.
- **Tràn số nguy hơn ở fixed-point**: float bão hoà thành `+Inf` (nhìn là biết hỏng), fixed-point **quay vòng im lặng**. `dx²+dy²` trong Q16.16 có trần thật **181,02 m**; khoảng cách 1 km trả về `16.960` tức "130 m", và AOI sẽ tin điều đó. Chọn định dạng theo cột **ngưỡng `d²`**: Q16.16 → 181 m, Q24.8 → 2.896 m, **Q32.32 → 46.341 m**.
- `dt` phải biểu diễn được: **1/64, 1/128, 1/256 chính xác tuyệt đối; 1/60 lệch 4,07e-06 mỗi bước = 0,0146 s sau một phút**. Dùng fixed-point thì chọn tick rate là luỹ thừa của 2.
- **Giá CPU gần như bằng không**: một bước sim đầy đủ tốn **+1,41 %** so với `float32` (54,1 ns vs 53,4 ns = 0,00035 % ngân sách tick 64 Hz); cộng và nhân fixed-point còn **nhanh hơn** 2,1–2,4 lần.
- **Giá thật nằm ở hàm siêu việt và ở con người**: `sqrt` Newton-Raphson tốn **7,602 ns, đắt hơn 15,1 lần** lệnh phần cứng (sai tối đa 2,60 LSB = 39,7 micromet). `sin` bằng bảng **256 mục có nội suy** (1,0 KB, 6,28 LSB) chính xác hơn **15,1 lần** bảng **4.096 mục tra thẳng** (16,0 KB, 94,7 LSB) — luôn nội suy.
- **Có authoritative server thì chỉ cần mức A, và fixed-point là chi phí thuần.** Chỉ **rollback/lockstep P2P cross-platform** — mức C — mới thật sự bắt buộc. Và đổi từ float sang fixed-point là **viết lại lõi simulation**, làm **mọi replay đã lưu không phát lại được** — quyết định của tuần đầu tiên.

→ **Chương 4 — Mạng nền tảng.** Ba chương vừa rồi dựng một simulation chạy đúng nhịp và chạy lại được y hệt. Bài 12 hỏi câu tiếp theo: kết quả của nó đi tới người chơi bằng đường nào, và vì sao chọn sai đường thì mọi thứ ở trên thành vô nghĩa.
