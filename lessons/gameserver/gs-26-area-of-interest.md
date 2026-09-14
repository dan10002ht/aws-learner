# Bài 26 — Area of Interest & interest management

## 1. Mục tiêu

Sau bài này bạn có thể:

- Chứng minh bằng số vì sao replication đầy đủ là **O(N²) băng thông**, và tính được đúng con số người chơi mà một node vỡ trần.
- Tính được **AOI đổi O(N²) thành O(N·k)** và chỉ ra tỉ lệ tiết kiệm **tăng tuyến tính theo N** — khác hẳn hai đòn bẩy trước.
- Chọn giữa **quét toàn bộ / lưới ô / cây không gian** bằng ngưỡng số cụ thể, chứ không bằng "grid thì nhanh hơn".
- Tính **kích thước ô tối ưu** của uniform grid và giải thích vì sao ô quá nhỏ cũng tệ như ô quá to.
- Định lượng **chi phí spawn khi entity vào tầm** — thứ AOI tạo ra và hầu như không ai tính vào ngân sách.
- Thiết kế **hysteresis** cho biên tầm nhìn và nói được nó mua gì với giá bao nhiêu.
- Chỉ ra chỗ AOI **không** phải biện pháp chống wallhack, dù ai cũng nói nó là.

---

## 2. Triệu chứng

Một arena shooter kiểu `.io`. Một node giữ một trận, mỗi trận một world. Entity đã qua bài 24 (quantize xuống **10 B**) và bài 25 (delta theo baseline đã ack). Snapshot **20 Hz**. Ngoài người chơi, world còn đạn và vật thể tạm — thống kê thực tế là **khoảng 4 entity động cho mỗi người chơi**.

Hạ tầng: VM có NIC 1 Gbps, thiết kế nhồi **25 trận đồng thời** trên một VM. Chia ra: **ngân sách 40 Mbps cho mỗi trận**.

Đội mở trần phòng dần:

```
50 người   4×50 = 200 entity   mỗi player nhận  40,0 KB/s   trận  16,00 Mbps   40,0% ngân sách
70 người              280      mỗi player       56,0 KB/s         31,36 Mbps   78,4%
79 người              316      mỗi player       63,2 KB/s         39,94 Mbps   99,9%
80 người              320      mỗi player       64,0 KB/s         40,96 Mbps  102,4%   VỠ
```

Ở đây có một chi tiết đáng dừng lại. Từ 50 lên 80 người, **số người tăng 1,6 lần**. Nếu băng thông tuyến tính theo số người, 16,00 Mbps sẽ thành 25,6 Mbps — còn cách trần rất xa. Thực tế nó thành 40,96 Mbps, tức **tăng 2,56 lần**.

Và 2,56 = 1,6². Đây không phải "hơi quá tải". Đây là một hàm bậc hai, và bạn đang ở khúc nó bắt đầu dựng đứng.

Khó chịu hơn: bài 24 vừa cắt 8,7 lần, bài 25 cắt thêm 2–5 lần. Cả hai là **hệ số cố định** — chúng dịch đường cong xuống chứ không đổi hình dạng nó. Nhân một parabol với 1/50 vẫn ra một parabol.

---

## ⏸ Dừng lại — đoán trước #1

**Trần 40 Mbps hiện vỡ ở người thứ 80. Muốn chứa 500 người trên cùng ngân sách đó, phải làm gì?**

```
(a) Nén thêm: đẩy entity từ 10 B xuống 5 B (bài 24 nói vẫn còn dư địa)
(b) Delta hung hãn hơn: chỉ gửi entity đổi nhiều, bỏ entity đổi ít
(c) Hạ snapshot từ 20 Hz xuống 10 Hz
(d) Không cái nào trong ba cái trên đủ, kể cả làm cả ba
```

Ba phương án đầu đều là kỹ thuật thật, cộng lại được nhiều nhất khoảng 8 lần. Từ 80 lên 500 người, băng thông tăng `(500/80)² = 39 lần`. Đáp án là **(d)**, và mục 3.1 đưa ra con số.

---

## 3. Lý thuyết

### 3.1 Vì sao replication đầy đủ là O(N²)

Mô hình tối giản, dùng lại cho cả bài: **N entity, mỗi entity 10 B, snapshot 20 Hz**. Mỗi player nhận `N−1` entity kia.

```
mỗi player nhận = (N−1) × 10 B × 20 Hz          → tuyến tính theo N
tổng chiều ra   = N × (N−1) × 10 B × 20 Hz      → bậc hai theo N
```

| N | Mỗi player nhận | Tổng chiều ra | | 
|---|---|---|---|
| 10 | 1,8 KB/s | 18 KB/s | 0,14 Mbps |
| 50 | 9,8 KB/s | 490 KB/s | 3,92 Mbps |
| 100 | 19,8 KB/s | 1,98 MB/s | 15,84 Mbps |
| 500 | 99,8 KB/s | 49,9 MB/s | **399,20 Mbps** |
| 1.000 | 199,8 KB/s | 199,8 MB/s | **1.598,40 Mbps** |

Giải `200 · N(N−1) · 8 = 10⁹`: **N = 792 là người đầu tiên đẩy chiều ra vượt 1 Gbps** (ở 791 là 0,9998 Gbps, ở 792 là 1,0024 Gbps). Nghĩa là: một world 800 người, entity đã tối ưu hết cỡ, chỉ 10 byte mỗi entity, vẫn **ăn trọn một card mạng 1 Gbps**.

Chú ý cột giữa: ở N = 1.000, mỗi player phải **nhận** 199,8 KB/s ≈ 1,6 Mbps. Server có thể có 10 Gbps, người chơi 4G thì không — trần thật nằm ở chiều xuống của client và nó tới sớm hơn nhiều.

### 3.2 AOI: O(N²) → O(N·k)

Area of Interest: mỗi observer chỉ nhận entity **nằm trong tầm quan tâm** của mình. Gọi `k` là số entity trung bình trong tầm. Với bán kính và mật độ cố định, `k` **không phụ thuộc N** — thêm người thì bản đồ rộng ra, cái bạn nhìn thấy quanh mình vẫn chừng đó.

```
mỗi player nhận = k × 10 B × 20 Hz              → HẰNG SỐ
tổng chiều ra   = N × k × 10 B × 20 Hz          → tuyến tính theo N
```

Lấy `k = 20` (con số của gs-03 cho battle royale) và đặt cạnh bảng trên:

| N | Đầy đủ (tổng) | AOI k=20 (tổng) | Mỗi player, AOI | Tiết kiệm |
|---|---|---|---|---|
| 10 | 18 KB/s | 18 KB/s | 1,8 KB/s | **1,00×** |
| 50 | 490 KB/s | 200 KB/s | 4,0 KB/s | **2,45×** |
| 100 | 1,98 MB/s | 400 KB/s | 4,0 KB/s | **4,95×** |
| 500 | 49,9 MB/s | 2,0 MB/s | 4,0 KB/s | **24,95×** |
| 1.000 | 199,8 MB/s | 4,0 MB/s | 4,0 KB/s | **49,95×** |

*(Ở N = 10 chỉ có 9 entity khác, ít hơn k = 20, nên AOI không cắt được gì. Đó là câu trả lời cho "game 4 người co-op có cần AOI không": không.)*

Tỉ lệ tiết kiệm là `(N−1)/k`. Không phải hằng số — **là một hàm tuyến tính của N**. Đây là điểm khác biệt duy nhất đáng nhớ của bài này:

| Đòn bẩy | Bản chất | Hệ số | Tăng theo N? |
|---|---|---|---|
| Bài 24 — quantization | mỗi entity ít byte hơn | 8,7× (đo ở bài 24) | Không |
| Bài 25 — delta | bỏ entity **không đổi** | 2–5× | Không |
| **Bài 26 — AOI** | bỏ entity **không nhìn thấy** | (N−1)/k | **Có, tuyến tính** |

Ba cái nhân với nhau chứ không cộng — chúng tác động lên ba chiều khác nhau của cùng một tích. Nhưng ở trận đông, AOI một mình thắng cả hai cái kia cộng lại, và khoảng cách còn nới ra theo N.

<svg viewBox="0 0 700 300" role="img" aria-labelledby="gs26-a-t gs26-a-d" style="width:100%;height:auto">
<title id="gs26-a-t">Băng thông chiều ra: replication đầy đủ so với AOI, thang log</title>
<desc id="gs26-a-d">Bốn cặp cột trên thang logarit. Với 50 người, đầy đủ 3,92 Mbps so với AOI 1,60 Mbps, tiết kiệm 2,45 lần. Với 100 người, 15,84 so với 3,20 Mbps, tiết kiệm 4,95 lần. Với 500 người, 399,2 so với 16,0 Mbps, tiết kiệm 24,95 lần. Với 1000 người, 1598,4 so với 32,0 Mbps, tiết kiệm 49,95 lần. Khoảng cách giữa hai cột nới rộng đều theo số người.</desc>
<line x1="70" y1="250" x2="670" y2="250" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<line x1="70" y1="250" x2="70" y2="25" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<text x="30" y="253" font-size="9" fill="currentColor" opacity="0.7">1</text>
<text x="24" y="193" font-size="9" fill="currentColor" opacity="0.7">10</text>
<text x="18" y="133" font-size="9" fill="currentColor" opacity="0.7">100</text>
<text x="14" y="73" font-size="9" fill="currentColor" opacity="0.7">1000</text>
<text x="20" y="20" font-size="9" fill="currentColor" opacity="0.7">Mbps (log)</text>
<line x1="70" y1="193" x2="670" y2="193" stroke="currentColor" stroke-opacity="0.15"/>
<line x1="70" y1="133" x2="670" y2="133" stroke="currentColor" stroke-opacity="0.15"/>
<line x1="70" y1="73" x2="670" y2="73" stroke="currentColor" stroke-opacity="0.15"/>
<rect x="120" y="196" width="45" height="54" rx="3" fill="#ef4444" fill-opacity="0.35"/>
<rect x="170" y="220" width="45" height="30" rx="3" fill="#84cc16" fill-opacity="0.45"/>
<text x="167" y="268" text-anchor="middle" font-size="11" fill="currentColor">N = 50</text>
<text x="167" y="284" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.75">2,45×</text>
<rect x="270" y="160" width="45" height="90" rx="3" fill="#ef4444" fill-opacity="0.35"/>
<rect x="320" y="202" width="45" height="48" rx="3" fill="#84cc16" fill-opacity="0.45"/>
<text x="317" y="268" text-anchor="middle" font-size="11" fill="currentColor">N = 100</text>
<text x="317" y="284" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.75">4,95×</text>
<rect x="420" y="76" width="45" height="174" rx="3" fill="#ef4444" fill-opacity="0.35"/>
<rect x="470" y="160" width="45" height="90" rx="3" fill="#84cc16" fill-opacity="0.45"/>
<text x="467" y="268" text-anchor="middle" font-size="11" fill="currentColor">N = 500</text>
<text x="467" y="284" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.75">24,95×</text>
<rect x="570" y="40" width="45" height="210" rx="3" fill="#ef4444" fill-opacity="0.35"/>
<rect x="620" y="142" width="45" height="108" rx="3" fill="#84cc16" fill-opacity="0.45"/>
<text x="617" y="268" text-anchor="middle" font-size="11" fill="currentColor">N = 1000</text>
<text x="617" y="284" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.75">49,95×</text>
<text x="142" y="188" text-anchor="middle" font-size="9" fill="currentColor">3,92</text>
<text x="292" y="152" text-anchor="middle" font-size="9" fill="currentColor">15,8</text>
<text x="442" y="68" text-anchor="middle" font-size="9" fill="currentColor">399</text>
<text x="592" y="32" text-anchor="middle" font-size="9" fill="currentColor">1598</text>
<text x="192" y="214" text-anchor="middle" font-size="9" fill="currentColor">1,6</text>
<text x="342" y="196" text-anchor="middle" font-size="9" fill="currentColor">3,2</text>
<text x="492" y="154" text-anchor="middle" font-size="9" fill="currentColor">16</text>
<text x="642" y="136" text-anchor="middle" font-size="9" fill="currentColor">32</text>
<rect x="86" y="30" width="12" height="10" rx="2" fill="#ef4444" fill-opacity="0.35"/>
<text x="104" y="39" font-size="10" fill="currentColor">đầy đủ O(N²)</text>
<rect x="190" y="30" width="12" height="10" rx="2" fill="#84cc16" fill-opacity="0.45"/>
<text x="208" y="39" font-size="10" fill="currentColor">AOI O(N·k), k=20</text>
</svg>

Với AOI, ngưỡng 1 Gbps chuyển từ 792 người sang `125·10⁶ / 4.000 = 31.250` người. Không phải vì AOI thần kỳ, mà vì bài toán đã đổi bậc.

---

## ⏸ Dừng lại — đoán trước #2

Bạn cài AOI cách ngây thơ nhất: mỗi tick, với mỗi observer, duyệt hết N entity và so khoảng cách. Đó là O(N²) CPU — vừa bỏ O(N²) băng thông thì rước lại O(N²) CPU.

**Ở tick 60 Hz (16,67 ms), cho AOI 10% ngân sách tick, một phép so khoảng cách bình phương ~5 ns. Cách ngây thơ này chịu được bao nhiêu entity?**

```
(a) Khoảng 50 — phải dùng grid ngay từ đầu
(b) Khoảng 150
(c) Khoảng 580
(d) Khoảng 5.000
```

---

### 3.3 Ba cách cài đặt, và ngưỡng chuyển giữa chúng

**Cách 1 — quét toàn bộ mỗi tick.** Đáp án hộp trên là **(c)**:

| N | Số cặp | Thời gian | % tick 16,67 ms |
|---|---|---|---|
| 100 | 10.000 | 50 µs | 0,30 % |
| 500 | 250.000 | 1,25 ms | 7,50 % |
| 1.000 | 1.000.000 | 5,00 ms | 30,00 % |
| 2.000 | 4.000.000 | 20,00 ms | 120,00 % |

`N² × 5 ns ≤ 0,1 × 16,67 ms` → **N ≤ 577**. Hết sạch ngân sách tick ở **N = 1.826**.

*(5 ns mỗi cặp là bậc độ lớn, không phải hằng số — vị trí lưu trong slice liền kề, so bình phương khoảng cách nên không có `sqrt`. Cache miss hoặc struct béo có thể đẩy lên 20–50 ns, kéo ngưỡng xuống một nửa tới một phần ba.)*

Ngược với trực giác: **với arena 100–200 người, quét toàn bộ là cách đúng.** 50 µs mỗi tick, không cấu trúc dữ liệu, không bug cập nhật index, không phải nghĩ về biên ô. Băng thông đã vỡ ở 80 người trong khi CPU chưa nhúc nhích ở 500 — hai giới hạn cách nhau gần một bậc.

**Cách 2 — uniform grid.** Chia bản đồ thành ô vuông cạnh `c`. Mỗi entity thuộc đúng một ô; truy vấn chỉ duyệt các ô phủ hình tròn bán kính `R`.

```go
type Grid struct {
    cell  float64
    cols  int
    cells [][]EntityID   // len = cols*cols
}

func (g *Grid) Query(x, y, r float64, out []EntityID) []EntityID {
    m := int(math.Ceil(r / g.cell))
    cx, cy := int(x/g.cell), int(y/g.cell)
    for gy := cy - m; gy <= cy+m; gy++ {
        for gx := cx - m; gx <= cx+m; gx++ {
            // clamp/wrap gx,gy rồi lọc lại theo r² thật
            out = append(out, g.cells[gy*g.cols+gx]...)
        }
    }
    return out
}
```

Chọn `c` thế nào? Có hai chi phí ngược chiều nhau, và điểm tối ưu nằm giữa:

- `c` nhỏ → phải quét `(2⌈R/c⌉+1)²` ô. Mỗi lần chạm một ô là một lần đọc slice header ở địa chỉ ngẫu nhiên: **~20 ns**, kể cả ô rỗng.
- `c` to → mỗi ô ôm quá nhiều entity ngoài bán kính. Vẫn phải so khoảng cách từng con: **~5 ns** mỗi entity thừa.

Bản đồ 1.000 × 1.000 m, N = 1.000 (mật độ 0,001 entity/m²), `R` = 100 m. Trong bán kính thật sự có `0,001 × π × 100² = 31,4` entity:

| Cạnh ô `c` | Số ô quét | Entity phải xét | Thừa | Thời gian/truy vấn |
|---|---|---|---|---|
| 10 m | 441 | 44,1 | 1,40× | 9,041 µs |
| 25 m | 81 | 50,6 | 1,61× | 1,873 µs |
| 50 m | 25 | 62,5 | 1,99× | 0,813 µs |
| **100 m** | **9** | **90,0** | **2,86×** | **0,630 µs** |
| 200 m | 9 | 360,0 | 11,46× | 1,980 µs |
| 500 m | 9 | 2.250,0 | 71,62× | 11,430 µs |

Đáy nằm ở **`c` = `R`**. Lý do hình học: khi `c ≥ R` thì `⌈R/c⌉ = 1`, luôn quét đúng 9 ô — không giảm thêm được, nên tăng `c` chỉ làm phình diện tích theo `c²`. Đi ngược xuống dưới `R`, số ô tăng theo `1/c²` trong khi diện tích thừa chỉ giảm dần về giới hạn `πR²`. Hai nhánh gặp nhau đúng chỗ `c = R`.

**Quy tắc rút gọn: cạnh ô bằng bán kính tầm nhìn.** Sai một hệ số 2 theo chiều nào cũng chỉ mất ~30%; sai một hệ số 5 thì mất 3 lần trở lên.

Grid so với quét toàn bộ, cùng mật độ:

| N | Quét toàn bộ | Grid `c=R` | |
|---|---|---|---|
| 100 | 0,050 ms | 0,063 ms | grid **thua** |
| 1.000 | 5,000 ms | 0,630 ms | 7,9× |
| 10.000 | 500,000 ms | 6,300 ms | 79,4× |
| 100.000 | 50.000 ms | 63,000 ms | 793,7× |

Hoà vốn ở `0,630 µs / 5 ns` = **N = 126**. Dưới ngưỡng đó grid chỉ là chi phí bảo trì index không đổi lấy gì.

**Cách 3 — cây không gian (quadtree / k-d).** Grid đặc có một điểm chết: nó cấp phát ô cho **toàn bộ** bản đồ, kể cả vùng không có ai. Ô 100 m, mỗi ô một slice header 24 B:

| Bản đồ | Số ô | RAM chỉ để giữ ô rỗng |
|---|---|---|
| 1 × 1 km | 100 | ~0 |
| 10 × 10 km | 10.000 | 0,24 MB |
| 100 × 100 km | 1.000.000 | 24 MB |
| 1.000 × 1.000 km | 100.000.000 | 2.400 MB |

Cây (hoặc hash grid — bảng băm `(gx,gy)` → slice) chỉ trả tiền cho vùng có entity. Đổi lại, mỗi lần entity qua biên phải cập nhật cấu trúc: với cây cân bằng là `O(log N)` kèm con trỏ nhảy lung tung, đắt hơn hẳn grid vốn chỉ là hai phép chia số nguyên và hai lần `append`/xoá.

Trong game, entity **di chuyển mỗi tick**: tỉ lệ cập nhật/truy vấn xấp xỉ 1:1, không phải kiểu build-một-lần-query-nhiều của đồ hoạ. Vì vậy:

| Tình huống | Chọn |
|---|---|
| N < ~130, bản đồ nhỏ | Quét toàn bộ |
| Mật độ tương đối đều, bản đồ ≤ vài chục km | **Uniform grid, `c = R`** — mặc định đúng cho gần hết game |
| Bản đồ khổng lồ, phần lớn rỗng | Hash grid (thưa) trước, cây sau |
| Cần truy vấn nhiều thang bán kính rất khác nhau, hoặc entity gần như đứng yên | Quadtree / k-d |

Một kỳ vọng sai hay gặp: **quadtree không cứu được mật độ không đều về mặt băng thông.** Nếu 800 trên 1.000 người dồn vào một góc thì `k` của mỗi người ở đó thật sự là ~800 — họ nhìn thấy nhau thật. Cây chỉ giúp CPU tìm ra danh sách đó nhanh hơn; danh sách vẫn dài. Cắt danh sách dài là việc của bài 27.

---

### 3.4 Chi phí ẩn: entity vào và ra tầm nhìn

Đây là phần AOI **tạo thêm** việc, và là phần hay bị bỏ khỏi ngân sách.

Bài 25 dựng delta trên một baseline: snapshot gần nhất client đã ack. Khi entity `E` mới lọt vào tầm của observer `O`, **baseline của `O` không hề có `E`**. Không có gì để trừ. Bắt buộc gửi **full state** — id, loại, vị trí đầy đủ, hướng, máu, và ở MMO thì cả tên, trang bị, model, buff đang chạy. Gọi đây là một **spawn**.

Ngược lại, khi `E` rời tầm, phải gửi một **despawn** (rẻ: 1 id) — nếu không, client giữ `E` đứng chết tại chỗ mãi mãi.

Vấn đề: **bao nhiêu lượt vào mỗi giây?** Không giải bằng giấy được vì nó phụ thuộc cách entity chuyển động. Mô phỏng: 100 entity trên bản đồ 400 × 400 m hình xuyến, tốc độ không đổi, hướng random-walk (nhiễu Gauss 0,25 rad mỗi tick), 20 Hz, R = 100 m, 60 giây. Mật độ này cho `k` ≈ 19,2 — đúng mức `k = 20` của bảng trên.

| Tốc độ | Lượt vào tầm / giây (toàn trận) | Trên mỗi người | `k` |
|---|---|---|---|
| 2 m/s (đi bộ chậm) | 65,2 | 0,65 | 19,11 |
| 5 m/s (chạy) | 111,5 | 1,11 | 19,21 |
| 10 m/s | 190,2 | 1,90 | 19,40 |
| 20 m/s (xe) | 346,6 | 3,47 | 19,26 |

Kiểm chứng thêm: nhân đôi mật độ (200 entity, cùng bản đồ) thì `k` lên 39,10 và lượt vào lên 2,228/người/giây — **cả hai đúng gấp đôi**. Nghĩa là tỉ số `lượt-vào / k` là **bất biến theo mật độ**: ở 5 m/s nó là `1,115 / 19,21` = **0,058 lượt vào mỗi giây trên mỗi entity đang thấy**. Đông hơn không làm spawn chiếm tỉ lệ cao hơn. **Chạy nhanh hơn thì có.**

Từ đó tính được tỉ lệ spawn trong tổng băng thông. Với mỗi entity đang thấy: cập nhật thường xuyên tốn `B_upd × 20 Hz` B/s, spawn tốn `0,058 × S` B/s.

| Kiểu game | Cập nhật | Payload spawn `S` | Tốc độ | Spawn chiếm |
|---|---|---|---|---|
| Arena, entity mỏng | 10 B/tick | 32 B | 5 m/s | **0,92 %** |
| MOBA/co-op, nhân vật có trang bị | 10 B/tick | 100 B | 5 m/s | **2,82 %** |
| MMO, nhân vật đầy đủ | 10 B/tick | 300 B | 5 m/s | **8,00 %** |
| MMO có xe cộ | 10 B/tick | 300 B | 20 m/s | **21,26 %** |
| MMO, delta hiệu quả tới 4 B/tick | 4 B/tick | 300 B | 20 m/s | **40,30 %** |

Đọc dòng cuối kỹ. **Delta càng tốt thì spawn càng chiếm tỉ lệ lớn**, vì delta nén được phần cập nhật chứ không nén được spawn. Bài 25 làm phần thường xuyên teo lại, bài 26 tạo ra phần không teo được — ở giới hạn, tối ưu tiếp phần cập nhật là vô nghĩa.

Tỉ lệ trung bình còn giấu vấn đề thứ hai: **spawn đến theo cụm.** Người nhảy dù rơi vào giữa đám 20 entity thì trong đúng một tick phải gửi `20 × 300 B = 6.000 B` — gấp **30 lần** một tick bình thường (`20 × 10 = 200 B`), và với MTU 1.200 B là **5 gói** thay vì một phần của một gói. Trung bình 8 % nhưng đỉnh 30×: bài 15 (phân mảnh) và bài 27 (ngân sách gói) gõ cửa cùng lúc.

---

## ⏸ Dừng lại — đoán trước #3

Một entity đi men theo đúng vòng tròn bán kính 100 m quanh bạn. Nó không "vào" hay "ra" theo nghĩa gameplay — nó chỉ lảng vảng ở biên. Nhưng mỗi lần khoảng cách nhích qua 100 m rồi nhích lại, hệ thống ghi nhận một lượt ra và một lượt vào, tức **một despawn + một full spawn**.

**Nới biên ra thành "vào ở 95 m, ra ở 105 m" (±5 %) thì số lượt vào giảm bao nhiêu?**

```
(a) Gần như không đổi — biên chỉ dịch chỗ, không bớt lần cắt
(b) Khoảng 10 %
(c) Khoảng 28 %
(d) Khoảng 70 %
```

---

### 3.5 Hysteresis: hai bán kính thay vì một

Đáp án là **(c)**, và cái giá thì gần bằng không.

Cơ chế: dùng **hai** bán kính. Entity **vào** danh sách khi khoảng cách `< R_in`, chỉ **ra** khi `> R_out`, với `R_in < R_out`. Giữa hai vòng là vùng nhớ — đã thấy thì tiếp tục thấy, chưa thấy thì tiếp tục chưa thấy.

<svg viewBox="0 0 700 250" role="img" aria-labelledby="gs26-b-t gs26-b-d" style="width:100%;height:auto">
<title id="gs26-b-t">Hysteresis: vùng đệm giữa bán kính vào và bán kính ra</title>
<desc id="gs26-b-d">Hai vòng tròn đồng tâm quanh observer. Vòng trong bán kính 95 mét là ngưỡng vào, vòng ngoài 105 mét là ngưỡng ra. Entity dao động trong vành giữa hai vòng giữ nguyên trạng thái cũ, không tạo spawn hay despawn. Bên phải là đường thời gian so sánh: một ngưỡng duy nhất tạo bốn lần spawn khi entity dao động qua biên, hai ngưỡng tạo một lần.</desc>
<circle cx="150" cy="125" r="105" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="4 3"/>
<circle cx="150" cy="125" r="95" fill="#3b82f6" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.4"/>
<circle cx="150" cy="125" r="4" fill="#3b82f6"/>
<text x="150" y="112" text-anchor="middle" font-size="10" fill="currentColor">observer</text>
<text x="150" y="150" text-anchor="middle" font-size="10" fill="currentColor">R_in = 95</text>
<text x="150" y="18" text-anchor="middle" font-size="10" fill="currentColor">R_out = 105</text>
<text x="150" y="245" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.8">vành đệm: giữ nguyên trạng thái</text>
<circle cx="250" cy="125" r="5" fill="#ef4444"/>
<line x1="235" y1="125" x2="268" y2="125" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.2"/>
<line x1="268" y1="125" x2="262" y2="121" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.2"/>
<line x1="268" y1="125" x2="262" y2="129" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.2"/>
<line x1="235" y1="125" x2="241" y2="121" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.2"/>
<line x1="235" y1="125" x2="241" y2="129" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.2"/>
<line x1="400" y1="30" x2="670" y2="30" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.2"/>
<text x="400" y="20" font-size="10" fill="currentColor">một ngưỡng: 4 spawn</text>
<circle cx="430" cy="30" r="5" fill="#ef4444" fill-opacity="0.8"/>
<circle cx="490" cy="30" r="5" fill="#ef4444" fill-opacity="0.8"/>
<circle cx="550" cy="30" r="5" fill="#ef4444" fill-opacity="0.8"/>
<circle cx="610" cy="30" r="5" fill="#ef4444" fill-opacity="0.8"/>
<line x1="400" y1="80" x2="670" y2="80" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.2"/>
<text x="400" y="70" font-size="10" fill="currentColor">hai ngưỡng: 1 spawn</text>
<circle cx="430" cy="80" r="5" fill="#84cc16" fill-opacity="0.9"/>
<text x="400" y="122" font-size="10" fill="currentColor">đo thật, v = 5 m/s, 100 entity, 60 s:</text>
<text x="410" y="142" font-size="10" fill="currentColor">100/100 → 111,5 lượt vào/s  ·  k = 19,21</text>
<text x="410" y="160" font-size="10" fill="currentColor">95/105  →  80,3 lượt vào/s  ·  k = 19,04</text>
<text x="410" y="178" font-size="10" fill="currentColor">90/110  →  66,5 lượt vào/s  ·  k = 18,65</text>
<text x="410" y="196" font-size="10" fill="currentColor">80/120  →  50,1 lượt vào/s  ·  k = 17,30</text>
<text x="400" y="222" font-size="10" fill="currentColor" opacity="0.8">băng rộng cắt spawn nhiều hơn, nhưng bắt đầu ăn vào k</text>
</svg>

Cùng mô phỏng ở 3.4, v = 5 m/s:

| `R_in` / `R_out` | Lượt vào/s | Giảm | `k` | `k` giảm |
|---|---|---|---|---|
| 100 / 100 | 111,5 | — | 19,21 | — |
| 97 / 103 | 87,6 | 21,4 % | 19,12 | 0,5 % |
| **95 / 105** | **80,3** | **28,0 %** | **19,04** | **0,9 %** |
| 90 / 110 | 66,5 | 40,3 % | 18,65 | 2,9 % |
| 85 / 115 | 57,6 | 48,4 % | 18,15 | 5,5 % |
| 80 / 120 | 50,1 | 55,1 % | 17,30 | 9,9 % |

Đọc hai cột cuối cùng nhau. Băng ±5 % cắt **28 %** số spawn và chỉ làm `k` nhỏ đi **0,9 %**. Băng ±20 % cắt 55 % nhưng `k` tụt gần 10 % — mà `k` tụt nghĩa là **người chơi thật sự thấy ít hơn**, tức đổi gameplay chứ không còn là tối ưu vô hình. Một chi tiết tế nhị: `R_out` lớn hơn `R` gốc thì entity xa hơn tầm thiết kế vẫn được gửi (tốn thêm), còn `R_in` nhỏ hơn thì entity xuất hiện muộn hơn (tiết kiệm). Bảng cho thấy vế thứ hai thắng — `k` giảm chứ không tăng.

Điểm cân bằng thực tế: **±5 % tới ±10 % bán kính**. Ba dòng code, và nó xoá luôn lớp bug báo cáo kiểu "địch nhấp nháy ở rìa màn hình".

Con số 111,5 lượt vào/giây đáng soi thêm. Công thức thông lượng qua biên (`ρ · 2R · v_tương_đối / π`) chỉ ra ~25 lượt/giây — chênh 4,4 lần, và không phải vì công thức sai: **entity vượt biên rồi vượt lại nhiều lần** vì hướng đi tự nó dao động. Chính đám vượt-đi-vượt-lại đó là thứ hysteresis giết, và cũng là lý do đừng tin ước lượng giấy ở chỗ này — phải đo trên chuyển động thật của game bạn.

---

### 3.6 AOI không phải chỉ là khoảng cách

"Trong bán kính R" là tiêu chí mặc định, không phải duy nhất. Interest management đúng nghĩa: **mỗi loại thông tin có tập người quan tâm riêng.**

| Thông tin | Tiêu chí lọc | Vì sao không dùng bán kính |
|---|---|---|
| Vị trí đồng đội | Luôn gửi, mọi khoảng cách | Minimap phải đúng kể cả đồng đội ở đầu kia bản đồ |
| Người vừa bắn trúng bạn | Luôn gửi, kèm hướng đạn | Nếu không, chỉ báo sát thương chỉ vào chỗ trống |
| Vị trí kẻ địch | Bán kính hình + hysteresis | Mặc định |
| Âm thanh súng / nổ | Bán kính **âm thanh**, thường 3–5× bán kính hình | Nghe thấy trước khi thấy là cơ chế gameplay chính của BR |
| Mục tiêu bị đánh dấu / ping | Luôn gửi trong thời gian đánh dấu | Đánh dấu vô nghĩa nếu chỉ thấy khi đã ở gần |
| Boss, sự kiện toàn cục | Luôn gửi cho cả zone | Cả zone phải phản ứng cùng lúc |
| Chat theo kênh | Theo kênh, không theo không gian | Không gian không liên quan |
| Chỉ số leaderboard | Tần suất thấp (1 Hz), gửi tất cả | Rẻ, và ai cũng cần |

Hệ quả kiến trúc: **AOI trả về nhiều tập, không phải một tập** — mỗi loại có bán kính, tần suất, mức tin cậy riêng. Đừng gộp thành một hàm `VisibleEntities(id) []Entity`; nó sẽ phải tách ra ngay ở tính năng thứ hai.

Bán kính âm thanh đáng nói riêng vì nó phá tính toán ở 3.2: tầm nghe 3× tầm nhìn thì diện tích 9×, tức `k_âm_thanh ≈ 9 × k_hình`. May là âm thanh rời rạc (một tiếng súng) chứ không phải dòng 20 Hz, nên nó vào ngân sách như event chứ không như state — mô hình event-based của bài 23.

---

### 3.7 Cái bẫy: AOI **gần như** là biện pháp chống wallhack

Lập luận đúng và mạnh: wallhack đọc bộ nhớ client để vẽ địch xuyên tường. Server **không gửi** thì client không có gì để đọc. AOI là hình thức mạnh nhất của authority (bài 33) vì nó chặn ở gốc chứ không kiểm tra ở ngọn.

Chỗ lập luận gãy: **AOI theo bán kính vẫn gửi người đứng sau tường.** Địch cách 30 m, tường bê tông chắn giữa — 30 < 100 nên nó nằm trong tập gửi. Client hợp lệ không vẽ vì bị tường che; client hack thì vẽ. Và đó đúng là tình huống wallhack có giá trị nhất: địch 300 m sau tường thì biết cũng chẳng làm gì, địch 30 m sau tường quyết định pha giao tranh. **AOI bán kính lọc mất phần vô hại và giữ nguyên phần nguy hiểm.**

Chặn thật thì cần lọc theo **tầm nhìn thẳng** — raycast từ mắt observer tới entity, hoặc tính trước bảng "ô nào nhìn thấy ô nào" (PVS). Cái giá:

- Raycast mỗi cặp mỗi tick đắt hơn so khoảng cách hàng chục lần, mà bảng ở 3.3 vốn đã tính bằng nano giây.
- Che khuất đổi nhanh hơn snapshot: địch chạy khỏi mép tường trong 100 ms, nếu tick trước server đã lọc bỏ thì client phải spawn nó khi đạn đã bay. Đó là **pop-in** — bug gameplay, không phải bug đồ hoạ.
- Che khuất phải tính **rộng hơn** thực tế vì lag compensation (bài 21) tua ngược thời gian.

Nói cho gọn: **AOI theo bán kính cắt được ~95 % băng thông và ~0 % wallhack trong giao tranh gần.** Đừng ghi "chống wallhack" vào cột lợi ích của nó. Bài 34 phân loại cheat và nói rõ cái nào chặn được tuyệt đối, cái nào chỉ giảm được — wallhack nằm nhóm thứ hai.

---

## 4. Ba đòn bẩy của chương 6, đặt cạnh nhau

Một trận 500 người, snapshot 20 Hz, `k` = 20, dùng **số đo thật của bài 24** (JSON 112,7 B/entity → quantized 13 B), áp lần lượt từng bài:

| Áp tới | Mỗi player nhận | Tổng chiều ra | So với gốc |
|---|---|---|---|
| Không tối ưu (JSON 112,7 B/entity, đầy đủ) | 1.124,7 KB/s | 562,4 MB/s | 1× |
| + bài 24 quantize (→13 B) | 129,7 KB/s | 64,9 MB/s | 8,67× |
| + bài 25 delta (giả định 2,5×) | 51,9 KB/s | 25,9 MB/s | 21,7× |
| + bài 26 AOI (`k`=20) | 2,1 KB/s | 1,04 MB/s | **540,7× ¹** |

*¹ Ba hệ số nhân nhau: `8,67 × 2,5 × 24,95 = 540,7`. Đối chiếu trực tiếp `1.124,7 / 2,08 = 540,7`.*

Cột cuối là chỗ phải để ý: hai bài đầu đóng góp `8,67 × 2,5 = 21,7`, cố định mãi mãi. Bài 26 đóng góp 24,95 ở N = 500 — và nếu trận lên 1.000 người thì hai bài đầu vẫn 21,7 còn bài 26 thành 49,95. **Chỉ có một trong ba đòn bẩy lớn lên cùng bài toán.**

Đổi lại, AOI là đòn bẩy duy nhất **thay đổi thứ người chơi nhìn thấy**. Quantization làm vị trí lệch vài milimét, delta hoàn toàn vô hình, còn AOI quyết định ai tồn tại trên màn hình bạn. Sai bán kính là sai gameplay — và nó không hiện ra ở bất kỳ metric hạ tầng nào.

---

## 5. Tính tay

**Bài 1.** Trận 200 người, mỗi người 1 entity, 10 B/entity, 20 Hz.
a) Không AOI: mỗi player nhận bao nhiêu KB/s? Tổng chiều ra bao nhiêu Mbps?
b) AOI với `k` = 25: hai con số đó thành bao nhiêu?
c) Tiết kiệm bao nhiêu lần? Kiểm bằng công thức `(N−1)/k`.

**Bài 2.** Với AOI `k` = 20, 10 B, 20 Hz: bao nhiêu người chơi thì tổng chiều ra chạm 1 Gbps? Làm lại với `k` = 50. Vì sao lần này đáp số **không** cần lấy căn bậc hai?

**Bài 3.** Game của bạn: tỉ số bất biến `lượt-vào / k` = 0,058 mỗi giây (v = 5 m/s), payload spawn 150 B, cập nhật 8 B mỗi tick ở 20 Hz. Spawn chiếm bao nhiêu phần trăm băng thông state? Nếu bài 25 kéo cập nhật xuống còn 4 B thì tỉ lệ đó thành bao nhiêu — và tổng băng thông tăng hay giảm?

**Bài 4.** Bản đồ 2.000 × 2.000 m, R = 150 m. Bạn chọn ô 30 m vì "ô nhỏ thì chính xác hơn". Tính số ô phải quét mỗi truy vấn, và so với lựa chọn `c = R`. Sai bao nhiêu lần?

---

## 6. Chuyển giao

1. Game co-op 4 người trong một hầm ngục hẹp. Có nên cài AOI không? Trả lời bằng bảng ở 3.2, không bằng cảm giác.
2. Đạn bay 300 m/s, tick 20 Hz. Giữa hai tick nó đi 15 m. Một viên đạn ở ngoài tầm 100 m của bạn tại tick `t` có thể trúng bạn ở tick `t+1` không? Nếu có, AOI theo vị trí hiện tại của đạn hỏng ở đâu, và sửa bằng cách nào?
3. Bạn có chế độ khán giả (spectator) bay tự do. `k` của khán giả tính thế nào, và vì sao 20 khán giả có thể tốn hơn 100 người chơi?
4. Đội gameplay muốn thêm ống nhòm zoom 8×, nhìn xa 800 m. Bán kính AOI của người đang zoom phải đổi. Diện tích tăng bao nhiêu lần, `k` tăng bao nhiêu lần, và điều gì xảy ra với chi phí spawn tại đúng khoảnh khắc họ bấm zoom?
5. Bạn có teleport. Một người dịch chuyển 500 m tức thời. Hysteresis xử lý tình huống này thế nào — và vì sao nếu không đặc biệt hoá teleport thì bạn vừa tạo ra một cú burst đúng bằng cả `k` entity spawn cùng lúc?
6. Server chạy AOI ở 20 Hz cùng nhịp snapshot để tiết kiệm CPU. Một người chạy 10 m/s có thể đi 0,5 m giữa hai lần tính AOI. Trường hợp nào 0,5 m đó đủ gây lỗi nhìn thấy được?
7. **Câu khó nhất.** Battle royale 100 người: `k` = 20, AOI tiết kiệm 4,95×, ngân sách thoải mái. Vòng bo co lại, 30 người sống sót đứng trong một vòng bán kính 50 m. Bây giờ `k` = 29 — **mọi người đều ở trong tầm mọi người**, tỉ lệ tiết kiệm rơi về đúng 1,0×. Nghĩa là AOI mất sạch tác dụng đúng vào phút quan trọng nhất của trận, trong khi entity mỗi người sinh ra (đạn, khói, hiệu ứng) lại đông nhất. Đây không phải bug cài đặt — đó là bản chất của một tiêu chí lọc theo không gian trên một thế giới đang co lại. Bạn xử lý thế nào?

---

## 7. Tóm tắt

- Replication đầy đủ là `N(N−1) × 10 B × 20 Hz`: **N = 792 người là chỗ chiều ra vượt 1 Gbps**, dù entity chỉ 10 byte.
- AOI đổi O(N²) thành **O(N·k)**; tỉ lệ tiết kiệm là `(N−1)/k` — **2,45× ở N=50, 49,95× ở N=1.000**. Đây là đòn bẩy duy nhất của chương 6 **lớn lên theo N**.
- Quét toàn bộ chịu được **N = 577** ở 10% ngân sách tick 60 Hz; grid chỉ **hoà vốn từ N = 126**. Dưới ngưỡng đó, grid là chi phí không lấy lại được.
- Uniform grid: **cạnh ô = bán kính tầm nhìn**. Ở R=100 m, `c`=100 m cho 0,630 µs/truy vấn; `c`=10 m cho 9,041 µs, `c`=500 m cho 11,430 µs.
- Grid đặc trả tiền cho ô rỗng: bản đồ 1.000 km với ô 100 m tốn **2,4 GB** chỉ để giữ ô trống. Đó — chứ không phải tốc độ — là lúc chuyển sang hash grid hoặc cây.
- Entity vào tầm buộc phải gửi **full state**, không delta được. Đo thật: **0,058 lượt vào/giây trên mỗi entity đang thấy** ở 5 m/s — bất biến theo mật độ, tỉ lệ thuận với tốc độ.
- Spawn chiếm **0,92 %** băng thông ở arena entity mỏng, **21,26 %** ở MMO có xe cộ, **40,30 %** khi delta đã kéo cập nhật xuống 4 B. Delta càng tốt, spawn càng chiếm phần lớn.
- Hysteresis ±5 % (`R_in`=95, `R_out`=105) cắt **28 % số spawn** và chỉ làm `k` giảm **0,9 %**. Nới lên ±20 % cắt 55 % nhưng `k` giảm 9,9 % — lúc đó đã là đổi gameplay.
- AOI là nhiều tập lọc, không phải một: đồng đội luôn thấy, người vừa bắn mình luôn thấy, âm thanh dùng bán kính riêng (3–5× → diện tích 9–25×).
- **AOI bán kính không chặn wallhack trong giao tranh gần** — địch cách 30 m sau tường vẫn được gửi, và đó đúng là trường hợp wallhack có giá trị nhất. Bài 34.

→ **Bài 27 — Priority & ngân sách băng thông**: đã bỏ hết cái không nhìn thấy. Nhưng cái nhìn thấy vẫn có thể quá nhiều cho một gói tin — và lúc đó phải chọn ai bị bỏ lại.
