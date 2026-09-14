# Bài 42 — Capstone 2: agar-lite chơi được

## 1. Mục tiêu

Sau bài này bạn có thể:

- Áp **sáu kỹ thuật của chương 5 và chương 6** lên một codebase đang chạy, từng cái một, và **đo lại sau mỗi cái** thay vì áp cả gói rồi đoán cái nào có tác dụng.
- Chỉ ra bằng số vì sao **prediction không cắt một mili giây nào** khỏi đường truyền mà vẫn xoá được 150 ms người chơi cảm thấy.
- Chọn **ngưỡng bỏ qua sai lệch** của reconciliation từ hai con số đo được, và chứng minh chọn sai một bậc thì tỉ lệ phải sửa nhảy **từ 3,93 % lên 29,18 %**.
- Tách phần tiết kiệm băng thông thành **hai thừa số nhân nhau** — byte/entity và số entity — rồi nói mỗi thừa số thuộc về kỹ thuật nào.
- Cài **lag compensation** cho hit detection và đo tỉ lệ trúng trước/sau: **10,21 % → 100 %**.
- Đọc **bảng tổng kết cuối course**: mỗi con số bài lý thuyết dự đoán đặt cạnh con số đo được, và giải thích từng chỗ lệch bằng cơ chế chứ không bằng "máy khác nhau".

---

## 2. Triệu chứng

Bài 41 để lại một bản chạy được và chơi rất dở, nhưng thủ phạm đã lộ nguyên hình, không cần điều tra thêm: **`json.Marshal` chiếm 98,4 % thời gian broadcast, và broadcast chiếm 83,8 % ngân sách tick ở 100 player.** Trần một room là 114 người, đặt bởi việc serialize một bản đầy đủ cho từng người. Còn phía người chơi thì bấm phím xong đếm được **158,2 ms** mới thấy mình nhúc nhích.

Bài này sửa nó bằng sáu lớp xếp chồng, mỗi lớp là một bài của chương 5 hoặc chương 6, và **sau mỗi lớp là một lần đo lại**.

Số trong bài đo trên cùng máy với bài 41 (Apple M4, 10 core, Go 1.26), cùng cấu hình: 511 pellet, world 2.000 × 2.000, sim 60 Hz, snapshot 20 Hz, RTT giả lập 100 ms. Bot không đầu chạy **đúng cùng đoạn code client** với trình duyệt — cả hai gọi chung `shared.StepPlayer`, đúng lời khuyên của bài 18.

Điểm khởi hành, đo lại từ đầu để chắc chắn cùng thước đo:

| | bài 41 báo cáo | bản dựng bài 42, chạy lại |
|---|---|---|
| snapshot JSON, 50 player | 17.591 B — 31,4 B/entity | **17.613 B — 31,40 B/entity** |
| `json.Marshal` mỗi conn, p50 | 123 µs | **123,5 µs** |
| broadcast p99 ở 100 player | 83,8 % ngân sách | **84,7 %** |
| băng thông mỗi player | 351.820 B/s | **351.387 B/s** |

Bốn con số khớp trong khoảng 1 %. Chúng ta đang đứng đúng chỗ bài 41 dừng lại.

---

## ⏸ Dừng lại — đoán trước #1

Việc dễ nhất trong sáu việc là bỏ JSON, thay bằng struct nhị phân có quantization như bài 24. Không đụng gameplay, không đụng client logic, chỉ đổi hàm mã hoá.

**Chỉ làm mỗi việc đó thôi — broadcast p99 ở 50 player, đang là 65,4 % ngân sách tick, xuống còn bao nhiêu?**

```
(a) ~40 % — van con phai duyet 561 entity cho moi conn
(b) ~20 % — binary nhanh hon JSON khoang 3 lan
(c) ~5 %  — JSON dat hon rat nhieu so voi cai no lam
(d) ~1 %  — chi con memcpy
```

---

## 3. Sáu lớp, đo lại sau mỗi lớp

### 3.1 Lớp 1 — input có địa chỉ (bài 17)

Bài 41 gửi `{seq, dx, dy}` và áp dụng nó vào tick đang chạy lúc gói tới. Bài 17 nói cái đó thiếu **tick đích** — không có nó thì bài 18 và 19 không tồn tại, vì cả hai đều là câu "chạy lại từ tick T".

```go
type Input struct {
	Seq  uint32  `json:"seq"`
	Tick uint32  `json:"tick"`   // moi
	DX, DY float32
}
```

Client ước lượng tick server rồi cộng **lead = RTT/2 + d·dt** với `d = 3`. Server bỏ input vào ring 32 ô đánh chỉ số theo tick, mỗi tick lấy đúng ô của mình:

```go
func (rm *Room) consume() {
	s := rm.tick % inBufN
	for _, c := range rm.order {
		i := rm.w.Index(c.id)
		if c.have[s] {
			in := c.buf[s]; c.have[s] = false; c.last = in
			rm.w.dx[i], rm.w.dy[i] = in.DX, in.DY
			rm.w.lastSeq[i] = in.Seq
		} else {
			rm.w.dx[i], rm.w.dy[i] = c.last.DX, c.last.DY // doi: LAP tin hieu muc
		}
	}
}
```

Bài 17 chốt: metric quan trọng nhất của chương là **phân phối độ sớm của input lúc server tiêu thụ**, và `p50` phải bằng `d`. Đo 45.288 gói input, 50 bot, RTT 100 ms:

| lead (tick) | tỉ lệ | nghĩa |
|---|---|---|
| 3 | **68,04 %** | tới đúng hạn, còn nguyên đệm |
| 2 | 31,19 % | tới muộn 1 tick, vẫn kịp |
| 1 | 0,15 % | sát vực |
| 0 | 0,14 % | dùng ngay tick này |
| < 0 | **0,48 %** | tới sau khi tick đích đã chạy — phải bịa |

`p50 = 3` đúng bằng `d`. Tỉ lệ tick phải bịa vì thiếu input là **2,25 %** ở bản JSON và **0,97 %** ở bản binary — cùng `d`, cùng RTT, khác nhau vì bản JSON làm goroutine sim bận 6,5 ms mỗi ba tick và cái bận đó đẩy phân phối lệch. **Chi phí serialize còn ăn cả vào độ tin cậy của input pipeline** — quan hệ mà không bảng lý thuyết nào của course chỉ ra.

Đo xong lớp 1: người chơi **không thấy khác gì cả**. Lớp này chỉ dựng chỗ đứng cho ba lớp sau.

### 3.2 Lớp 2 — prediction (bài 18)

Trước khi bật prediction, đo lại cho chắc con số đau: thời gian từ lúc gửi một `seq` tới lúc nhận được snapshot có `ack` bằng chính nó.

```
ack-latency p50 150,1 ms   p99 151,3 ms   (n = 304)
```

Cộng ~8 ms render là **158,1 ms** — trùng 158,2 ms của bài 41 tới 0,06 %, dù thành phần bên trong đã khác (bài 41 mất 16,7 ms lấy mẫu và 25 ms chờ snapshot; bản này mất 50 ms nằm trong input buffer của lớp 1). Hai đường đi khác nhau, cùng một tổng — vì cả hai đều đi qua đúng một vòng round-trip.

Bật prediction: client áp input vào bản sao local **ngay trong khung hình đọc phím**, đẩy vào `pending`, rồi mới gửi.

```go
if *predict && haveLocal {
	local.X, local.Y = shared.StepPlayer(local.X, local.Y, dx, dy,
		local.R, dtf, shared.WorldW, shared.WorldH)
	pending = append(pending, pend{seq, dx, dy})
}
```

Ba dòng. Độ trễ cảm nhận từ **150,1 ms xuống 0 tick chờ mạng** — còn lại chỉ nửa khung hình render, 8,3 ms *(số học của 60 fps, không phải số đo — bot không đầu không có màn hình)*.

Điều đáng đo là **prediction đang che bao nhiêu** — khoảng cách giữa vị trí server nói và vị trí client đang vẽ:

```
khoang cach auth <-> local   p50 28,65   p99 29,38  don vi
pending trung binh 7,94 input  (p99 = 8)
```

7,94 tick × 16,667 ms = **132,3 ms**, nhân tốc độ thực đo 216,5 đơn vị/giây ra đúng 28,65. Đây là số đo của chữ "trước" trong "vẽ trước cái chưa xảy ra": **28,65 đơn vị = 2,39 lần bán kính**. Prediction hỏng ngày nào, đó là khoảng cách nhân vật giật về ngày đó.

Và đúng như bài 18 cảnh báo, prediction **chỉ chữa một ô**: 49 vòng tròn còn lại vẫn giật y như cũ.

### 3.3 Lớp 3 — reconciliation (bài 19)

Prediction không có reconciliation thì tệ hơn không prediction — bài 19 nói thẳng thế. Ba bước, chạy trong đúng khung hình nhận snapshot: cắt `pending` tới `ack`, đặt local = state server, chạy lại phần `pending` còn lại.

```go
cx, cy := auth.X, auth.Y
for _, p := range pending {          // replay, cung ham voi server
	cx, cy = shared.StepPlayer(cx, cy, p.dx, p.dy, auth.R, dtf, W, H)
}
e := math.Hypot(float64(cx-local.X), float64(cy-local.Y))
if e > threshold {                   // duoi nguong: KHONG dong vao
	local.X, local.Y = cx, cy
}
```

Chi phí replay, đo trong lúc chạy thật chứ không bench cô lập:

```
replay p50 667 ns (7,94 buoc = 84,0 ns/buoc)   p99 1.709 ns = 0,0103 % mot frame
```

Bài 19 dự đoán 1,18 µs mỗi bước. Bản này rẻ hơn **14,0 lần** vì `StepPlayer` của agar-lite chỉ là bốn phép nhân và một `math.Pow`. Lệch 14 lần, **kết luận không đổi một chữ**: muốn replay ăn 10 % một frame cần 19.845 bước, tức RTT 331 giây.

---

## ⏸ Dừng lại — đoán trước #2

Client và server chạy **cùng một hàm `StepPlayer`**, cùng `dt`, cùng thứ tự phép tính — đúng điều kiện determinism mức A của bài 18.

**Vậy `err` sau khi replay, ở p50, bằng bao nhiêu?**

```
(a) khoang 0,2 don vi — float32 tich luy sai so
(b) dung 0,0000 — cung ham thi cung ket qua
(c) khoang 3 don vi — vi mat input
(d) tang dan theo thoi gian choi
```

---

### 3.4 Lớp 3 (tiếp) — ngưỡng, và cái bẫy nằm ngay dưới nó

Đáp án là **(b), nhưng chỉ ở bản JSON**:

| protocol | err p50 | err p90 | err p99 | % phải sửa (ngưỡng 0,5) |
|---|---|---|---|---|
| JSON (float32 nguyên bản) | **0,0000** | 0,3977 | 3,5066 | **2,62 %** |
| binary quantized | **0,2354** | 0,4951 | 0,5908 | **9,51 %** |

Bản JSON cho `err` **đúng bằng không** ở quá nửa số lần — không phải "rất nhỏ", mà là 0,0000: hai máy chạy cùng một hàm float32 với cùng đầu vào thì ra cùng một bit. Đuôi p99 = 3,5066 đến từ 2,25 % tick server phải bịa input.

Bản binary thì `err` p50 nhảy lên **0,2354**, gấp 15,4 lần sai số lượng tử hoá vị trí tối đa (0,0153 đơn vị, tức nửa độ phân giải 0,0305). Đây là **bản sai** tôi đã cho chạy, và là loại sai dễ mắc nhất trong bài:

> *"Vị trí quantize xuống 16 bit, sai số tối đa 0,015 đơn vị trên bán kính 12 — vô hình. Bán kính thì lại càng không quan trọng, cho nó 1 byte bước 0,5 là xong."*

Sai số bán kính đúng là vô hình khi **vẽ**. Nhưng client còn **nạp bán kính vào công thức tốc độ** để replay:

```go
sp := baseSpeed * math.Pow(baseRadius/r, 0.4)
```

`r = 12,37` bị lượng tử thành `12,50`. Lệch 1,05 %, qua số mũ 0,4 thành lệch tốc độ 0,42 %, nhân 28,65 đơn vị đường đi chưa ack ra **0,12 đơn vị** — cộng nhiễu vị trí thì đúng bằng 0,2354 đo được. Đây chính xác là "**quantize state là bẫy chết người**" của bài 24, chỉ khác ở chỗ cái bị quantize không phải vị trí mà là **một tham số của luật chơi**. Hậu quả: tỉ lệ phải sửa từ 2,62 % lên 9,51 %, gấp **3,63 lần**, vì một byte tiết kiệm sai chỗ.

Chọn ngưỡng theo đúng phương pháp bài 19 — kẹp giữa **sàn nhiễu** (err p50 bản binary, 0,2354) và **trần nhìn thấy** (1,0 đơn vị = 8,3 % bán kính). Trung bình nhân 0,485 → **X = 0,5**. Quét lại để kiểm:

| ngưỡng X (đơn vị) | % phải sửa | err p50 trôi tới |
|---|---|---|
| 0,1 | **29,18 %** | 0,0753 |
| 0,5 | 9,51 % | 0,2354 |
| 1,0 | 3,93 % | 0,5410 |
| 2,0 | 1,97 % | 0,4909 |

**Thấp hơn một bậc thì cứ ba snapshot lại giật một lần** — 29,18 % ở 20 Hz là 5,8 lần rung mỗi giây, đúng thứ bài 19 gọi là chữ ký của reconciliation. Cột phải là giá của chiều ngược lại: ngưỡng càng cao, độ lệch thường trực càng bám sát **X/2**.

### 3.5 Lớp 4 — interpolation (bài 20)

Bốn mươi chín vòng tròn kia không predict được vì không có input của họ. Đo trước khi sửa: khoảng dịch chuyển của một đối thủ **giữa hai khung hình liên tiếp**, 60 fps, dữ liệu 20 Hz.

```
raw    p99 11,000   max 11,000  don vi
interp p99  3,690   max  6,329  don vi
```

11,000 không ngẫu nhiên: `220 / 20 = 11,0` — trọn một khoảng snapshot dồn vào một khung hình, hai khung còn lại đứng im. Sau nội suy p99 là **3,690**, và `220 / 60 = 3,667`: chuyển động đã **trải đều lên cả ba khung**. Tỉ số 2,98 chính là 60 / 20.

Giá là **100 ms cộng thẳng vào ngân sách**, không giảm giá. Bài 20 nói đệm đo bằng *khoảng snapshot*, và 100 ms ở 20 Hz đúng bằng 2 T — vừa đủ chịu một gói rơi. Bật mất gói 5 % để kiểm:

| đệm | jump p99 | jump **max** |
|---|---|---|
| không nội suy | 11,017 | **42,529** |
| 50 ms | 3,695 | 35,407 |
| 100 ms | 3,620 | **24,304** |
| 150 ms | 3,682 | 14,202 |

Cột `p99` **không đổi theo độ sâu đệm** — 99 % số khung hình đã mượt từ mốc 50 ms. Toàn bộ tác dụng nằm ở cột `max`: 100 → 150 ms cắt cú giật tệ nhất **41,6 %**. Bài 20 nói "đệm sâu hơn gần như không mua được gì trước mất gói theo cụm"; số này làm rõ: không mua được gì cho *p99*, chỉ mua *phần đuôi*. Chọn đệm là chọn tối ưu cho cảm giác trung bình hay cho lần tệ nhất trong một phút.

<svg viewBox="0 0 700 250" role="img" aria-labelledby="gs42-a-t gs42-a-d" style="width:100%;height:auto">
<title id="gs42-a-t">Ba lớp netcode chia nhau ba bài toán khác nhau</title>
<desc id="gs42-a-d">Trục thời gian client: prediction xử lý nhân vật của chính mình ở hiện tại, reconciliation sửa lại quá khứ gần khi snapshot về, interpolation vẽ đối thủ ở quá khứ 100 mili giây.</desc>
<line x1="40" y1="120" x2="660" y2="120" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<text x="656" y="112" text-anchor="end" font-size="10" fill="currentColor">thoi gian client</text>
<line x1="480" y1="100" x2="480" y2="140" stroke="currentColor" stroke-opacity="0.8" stroke-width="2"/>
<text x="480" y="158" text-anchor="middle" font-size="11" fill="currentColor">bay gio</text>
<rect x="180" y="60" width="180" height="34" rx="6" fill="#84cc16" fill-opacity="0.25"/>
<text x="270" y="82" text-anchor="middle" font-size="11" fill="currentColor">doi thu ve o day (−100 ms)</text>
<line x1="270" y1="94" x2="270" y2="118" stroke="#84cc16" stroke-width="2"/>
<text x="270" y="176" text-anchor="middle" font-size="10" fill="currentColor">INTERPOLATION</text>
<text x="270" y="192" text-anchor="middle" font-size="10" fill="currentColor">jump 11,0 → 3,69 don vi</text>
<rect x="290" y="20" width="190" height="30" rx="6" fill="#f59e0b" fill-opacity="0.25"/>
<text x="385" y="40" text-anchor="middle" font-size="11" fill="currentColor">7,94 input chua ack = 132 ms</text>
<line x1="385" y1="50" x2="385" y2="118" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4 3"/>
<text x="385" y="210" text-anchor="middle" font-size="10" fill="currentColor">RECONCILIATION chay lai doan nay</text>
<text x="385" y="226" text-anchor="middle" font-size="10" fill="currentColor">84 ns/buoc · sua 9,51 % so lan</text>
<rect x="486" y="96" width="120" height="30" rx="6" fill="#3b82f6" fill-opacity="0.30"/>
<text x="546" y="116" text-anchor="middle" font-size="11" fill="currentColor">toi o day, ngay</text>
<text x="546" y="150" text-anchor="middle" font-size="10" fill="currentColor">PREDICTION</text>
<text x="546" y="166" text-anchor="middle" font-size="10" fill="currentColor">150,1 ms → 0</text>
<line x1="348" y1="118" x2="348" y2="104" stroke="#8b5cf6" stroke-width="2"/>
<text x="348" y="98" text-anchor="middle" font-size="10" fill="currentColor">server biet toi o day</text>
<text x="40" y="240" font-size="10" fill="currentColor">Cung mot man hinh, ba he quy chieu thoi gian khac nhau — do la toan bo noi dung chuong 5.</text>
</svg>

Ba lớp vừa rồi đổi hẳn cảm giác chơi và **không cắt một byte nào**: băng thông vẫn 351.387 B/s mỗi người, broadcast vẫn ăn 84,7 % ngân sách ở 100 player.

### 3.6 Lớp 5 — binary + quantization (bài 24)

Header 14 B, player 7 B, pellet 4 B. Vị trí `uint16` trên dải 2.000 cho độ phân giải **0,0305 đơn vị**; sai số đo thật trên 50 player: trung bình 0,0079, tối đa 0,0150 — đúng một nửa độ phân giải, như bài 24 nói.

```go
binary.LittleEndian.PutUint16(e[0:], uint16(s.P[i].ID))
binary.LittleEndian.PutUint16(e[2:], qpos(s.P[i].X))
binary.LittleEndian.PutUint16(e[4:], qpos(s.P[i].Y))
e[6] = byte(s.P[i].R*radScale + 0.5)   // 0,5 don vi/buoc — xem lai muc 3.4
dst = append(dst, e[:]...)
```

Cùng một snapshot 561 entity, hai bộ mã hoá:

| | tổng | B/entity | B/field |
|---|---|---|---|
| JSON | 17.613 B | 31,40 | **12,73** (player) |
| binary quantized | **2.408 B** | **4,29** | **1,75** (player) |
| tỉ số | **7,31×** | 7,31× | 7,27× |

Bài 24 đo entity 9 field: **112,7 B JSON, 13 B bit-packed, chênh 8,7 lần**. Bản này ra **4,29 B/entity**, nhỏ hơn 13 B tới 3,03 lần — không phải vì giỏi hơn, mà vì entity agar-lite có 4 field chứ không phải 9. Quy về mỗi trường số thì hai bài gặp nhau: bài 24 cho 13 / 9 = **1,44 B/field** (gói sát bit), bản này 7 / 4 = **1,75 B/field** (căn byte); chênh 21,5 %, đúng phần "gói sát bit tiết kiệm 13,3 %" cộng việc `id` của tôi tốn nguyên 16 bit.

Đây là chỗ đóng lại một mạch chạy suốt hai bài capstone. Bài 41: JSON tốn **~12,5 B mỗi trường số**. Bài này: binary căn byte tốn **~1,75 B mỗi trường số**. Tỉ số hai hằng số là **7,27**; tỉ số đo trực tiếp trên snapshot 561 entity là **7,31**. Lệch 0,55 %. Cả hai định dạng tuyến tính theo *số trường*, không theo số entity.

Đáp án hộp #1 là **(c)**. Đo trên server thật, 50 player:

| | broadcast p50 | p99 | % ngân sách p99 | B/s mỗi player |
|---|---|---|---|---|
| JSON full | 6.576 µs | 10.902 µs | **65,4 %** | 351.387 |
| binary full | **296 µs** | **833 µs** | **5,0 %** | 48.147 |

Nhưng **48.147 B/s vẫn gấp 4,81 lần mục tiêu 10.000 B/s** của chương 6: binary một mình chỉ tấn công một trong hai thừa số của bài 41.

### 3.7 Lớp 6 — AOI (bài 26)

Bán kính tầm nhìn `R = 400`, ô lưới bằng đúng `R` như bài 26 chốt — lưới 5 × 5 cho pellet, player thì quét thẳng.

```go
gx, gy := int32(cx/R), int32(cy/R)
for ox := gx - 1; ox <= gx+1; ox++ {
	for oy := gy - 1; oy <= gy+1; oy++ {
		for _, j := range rm.grid[[2]int32{ox, oy}] {
			ddx, ddy := w.fx[j]-cx, w.fy[j]-cy
			if ddx*ddx+ddy*ddy <= R2 { c.fv = append(c.fv, ...) }
		}
	}
}
```

Diện tích tầm nhìn `π·400² / 2000²` = **12,57 %** world, nên pellet kỳ vọng là 511 × 0,1257 = **64,2**. Đo thật ở 50 player: **k trung bình 57,3 entity**, p99 = 82 — thấp hơn kỳ vọng vì người chơi ăn sạch pellet quanh mình.

| 50 player | B/snapshot | B/s mỗi player | broadcast p99 | % ngân sách |
|---|---|---|---|---|
| JSON full | 17.569 | 351.387 | 10.902 µs | 65,4 % |
| binary full | 2.407 | 48.147 | 833 µs | 5,0 % |
| **binary + AOI** | **263** | **5.267** | **288 µs** | **1,7 %** |

Kiểm lại phép nhân của bài 41: entity 561 → 57,3 là **9,79 lần**; byte/entity 31,32 → 4,59 là **6,82 lần**; tích **66,80**. Đo trực tiếp 17.569 / 263 = **66,80**. Khớp tuyệt đối — hai sai lầm vừa phải **nhân** với nhau, mỗi thừa số một kỹ thuật xoá.

**5.267 B/s là 52,7 % mục tiêu 10.000 B/s** mà chương 3 tới chương 6 dùng làm giả định. Lần đầu trong course số đo thật nằm **dưới** con số lý thuyết — vì entity agar-lite mỏng hơn entity 3D của bài 24.

---

## ⏸ Dừng lại — đoán trước #3

Bài 41 tính trần một room là **114 player**, và nói rõ trần đó do `json.Marshal` đặt chứ không do vật lý.

**Sau khi bỏ JSON và bật AOI, trần mới khoảng bao nhiêu?**

```
(a) ~250 player  — van O(N) conn nhan snapshot
(b) ~600 player  — nut that chuyen sang sim.Step O(P × F)
(c) ~2.000 player — nut that chuyen sang cho khac han
(d) khong doi    — 114 la tran cua WebSocket, khong phai cua JSON
```

---

### 3.8 Trần mới, và nút thắt thứ ba

Đo thật, bot không đầu, mỗi mức 16 giây:

| player | sim p99 | broadcast p99 | tổng | % ngân sách | k trung bình | B/s mỗi player |
|---|---|---|---|---|---|---|
| 50 | 93 µs | 288 µs | 0,38 ms | 2,3 % | 57,3 | 5.267 |
| 100 | 180 µs | 781 µs | 0,96 ms | 5,8 % | 62,6 | 5.716 |
| 200 | 399 µs | 1.426 µs | 1,83 ms | 11,0 % | 72,2 | 6.974 |
| 400 | 407 µs | 1.321 µs | 1,73 ms | 10,4 % | 94,2 | 9.696 |
| 800 | 882 µs | 3.667 µs | 4,55 ms | **27,3 %** | 138,3 | 14.716 |

Đáp án là **(c)**. Ngoại suy từ 400 → 800 (số mũ đo được 1,40) cho **~2.000 player** một node — nhưng con số đó cần ba dấu hoa thị:

1. **Nút thắt đã chuyển sang cấp phát.** Ở 1.600 conn mô phỏng, mỗi broadcast sinh **3,39 MB rác**, chỉ riêng việc copy snapshot ra một slice cho từng writer; nhân 20 Hz là 67,8 MB/s. Đó là bài 37, xuất hiện đúng lúc bài 37 nói nó sẽ xuất hiện: sau khi phần tính toán hết chỗ cắt.
2. **`k` tăng theo N** — 57,3 lên 138,3 khi đi từ 50 lên 800, vì world vẫn 2.000 × 2.000. AOI cắt số entity *ở một mật độ cho trước*, nó không cắt được mật độ, nên đòn bẩy `(N−1)/k` mòn dần.
3. **p99 ở N cao rất nhiễu.** Cùng 1.600 conn, ba lần chạy cho p99 từ 7,7 tới 19,7 ms trong khi p50 chỉ dao động 6,4–7,0 ms. *(Bậc độ lớn, không phải hằng số — trần thật phụ thuộc GC, số core và mật độ thế giới.)*

Nên con số ghi là **"trên 800, cỡ 2.000"**, không phải "2.028". Điều chắc chắn: **trần tăng ít nhất 7 lần so với 114**, không nhờ tối ưu vòng lặp nào — nhờ ngừng gửi thứ không cần gửi.

Quy ra tiền, cùng công thức bài 40 và bài 41, $0,09/GB, 100 player một node:

| | egress/node | GB/tháng | $/tháng | **$/CCU/tháng** |
|---|---|---|---|---|
| bài 41, JSON full | 37,84 MB/s | 98.081 | 8.827 | **88,27** |
| bài 42, binary + AOI | **0,57 MB/s** | 1.482 | 133 | **1,33** |

**Rẻ hơn 66,2 lần.** Bài 40 báo cáo khoảng chuẩn ngành $6,75–7,17 mỗi CCU mỗi tháng: bài 41 đắt hơn khoảng đó 12,3 lần, bài 42 rẻ hơn 5,1–5,4 lần. Cùng codebase, cùng máy, cách nhau **hai quyết định về định dạng và phạm vi**.

### 3.9 Lớp 7 — lag compensation (bài 21)

Agar-lite không có súng nhưng có một hành động phân xử tức thời: **người to nuốt người nhỏ** — điều kiện tua ngược của bài 21 thoả. Vòng đệm 64 tick (1,067 s), mỗi tick ghi `{x, y, r}` của mọi player, tua ngược về `t_view = RTT/2 + đệm nội suy`.

```go
h := hist[tick%histN]
for i := range w.id { h[i] = histRec{w.px[i], w.py[i], w.r[i]} }
...
rec := hist[(tick-viewLagTicks+histN*2)%histN][target]   // khoi phuc
if math.Hypot(float64(ax-rec.x), float64(ay-rec.y)) <= float64(rec.r) { hit() }
```

50 player chạy 3.000 tick, cứ 5 tick chọn ngẫu nhiên một cặp, người tấn công **nhắm hoàn hảo** vào vị trí mình đã thấy. 578 lần thử mỗi mức:

| độ trễ nhìn | D trung bình | trúng, **không** bù | trúng, **có** bù |
|---|---|---|---|
| 50 ms | 8,93 đv (0,74 r) | 100,00 % | 100,00 % |
| 100 ms | 17,54 đv (1,46 r) | 38,24 % | 100,00 % |
| **150 ms** | **26,06 đv (2,17 r)** | **10,21 %** | **100,00 %** |
| 200 ms | 34,32 đv (2,86 r) | 6,57 % | 100,00 % |

Ở cấu hình chuẩn của chính bản dựng này — RTT 100 ms, đệm nội suy 100 ms, `t_view` lùi 150 ms — người nhắm hoàn hảo **trượt 9 trên 10 lần** nếu server không bù. Bài 21 dự đoán `D = v·(RTT/2 + d)`: với v đo được 174 đơn vị/giây thì D = 26,1, đúng số đo. Bảng cũng chỉ ra ngưỡng đau: **50 ms còn tha thứ được (D nhỏ hơn một bán kính), 100 ms thì hỏng rồi.**

Chi phí: truy vấn tua ngược **p99 = 42 ns**, lịch sử **37,5 KiB** cho 50 player × 64 tick — ở quy mô này không đáng nhắc.

Cái tôi **chưa** cài và nói rõ: kẹp (`clamp`) trần tua ngược chống lag switch, và `Undo()` để cửa sổ tua ngược không sống qua lệnh khác. Ở agar-lite một người một hành động thì không thấy khác biệt; ở game có đạn bay và hiệu ứng vùng thì thiếu `Undo()` là bug nghiêm trọng nhất trong file.

---

## 4. Bảng tổng kết cuối course

Mỗi dòng: một mệnh đề lý thuyết, con số nó dự đoán, con số capstone đo được, và nếu lệch thì lệch vì cơ chế gì.

| # | Mệnh đề | Bài | Dự đoán | Đo được | Phán quyết |
|---|---|---|---|---|---|
| 1 | deadline scheduler không tích luỹ drift | 7 | 0,00 % | 959/960 tick, dropped 0 | **khớp** |
| 2 | vật lý không phải nút thắt | 8 | < 1 % ngân sách | 0,55 % ở 50p, 5,3 % ở 800p | **khớp** |
| 3 | `p50` độ sớm input phải bằng `d` | 17 | `d` = 3 tick | p50 = 3, late 0,45–0,56 % | **khớp** |
| 4 | prediction xoá độ trễ vòng round-trip | 18 | về ~8 ms | 150,1 ms → 0 tick chờ mạng | **khớp** |
| 5 | prediction che một đoạn `v × (RTT/2 + d)` | 18 | — | 28,65 đv = 132,3 ms = 7,94 input | **khớp** |
| 6 | replay không phải bài toán hiệu năng | 19 | 1,18 µs/bước, 0,106 % frame | **84 ns/bước**, 0,0103 % | rẻ hơn **14,0×**, kết luận đứng |
| 7 | client/server cùng luật → sai lệch bằng 0 | 3+18 | "rất nhỏ" | **đúng 0,0000** ở p50 (JSON) | **khớp, mạnh hơn dự đoán** |
| 8 | ngưỡng X kẹp giữa sàn nhiễu và trần nhìn thấy | 19 | X = 5 mm ≈ 1,0 ms chuyển động | X = 0,5 đv ≈ 2,3 ms chuyển động | **khớp phương pháp** |
| 9 | quantize state là bẫy | 24 | sai số thành thiên lệch | bán kính 1 B → % sửa ×3,63 | **khớp**, qua đường không ngờ |
| 10 | nội suy đổi 100 ms lấy mượt | 20 | 3,0 khung/mẫu | jump 11,0 → 3,69 đv (2,98×) | **khớp** |
| 11 | đệm sâu hơn mua được ít | 20 | gần như vô ích | p99 **không đổi**, max −41,6 % | khớp, nhưng chỉ đúng với p99 |
| 12 | JSON ~12,5 B mỗi trường số | 41 | 12,52–12,63 | **12,73** | **khớp**, 0,8 % |
| 13 | binary quantized ~13 B/entity | 24 | 13 B (9 field) | **4,29 B** (4 field) = 1,75 B/field | lệch vì **số field**, không vì kỹ thuật |
| 14 | JSON đắt hơn binary ~8,7× | 24 | 8,7× | **7,31×** | lệch 16 %: tôi căn byte, bài 24 gói sát bit |
| 15 | AOI cắt entity theo `(N−1)/k` | 26 | phụ thuộc mật độ | 561 → 57,3 = **9,79×** | **khớp**, nhưng `k` lớn lên theo N |
| 16 | AOI là đòn bẩy lớn nhất chương 6 | 26 | — | 9,79× (AOI) vs 6,82× (binary) | **khớp — sát hơn dự đoán** |
| 17 | băng thông = số entity × B/entity, **nhân** | 41 | 66,8× nếu gỡ cả hai | 9,79 × 6,82 = **66,80×** | **khớp tuyệt đối** |
| 18 | 10 KB/s mỗi player | ch.6 | 10.000 B/s | **5.267 B/s** | thấp hơn 47,3 % — entity mỏng |
| 19 | `D = v·(RTT/2 + d)` không xoá được | 21 | — | 26,06 đv; trúng 10,21 % → 100 % | **khớp** |
| 20 | trần room do serialize đặt, không do sim | 41 | 114 player | **> 800, cỡ 2.000** | **khớp** — gỡ serialize thì trần bay lên |
| 21 | chi phí theo CCU | 40 | $6,75–7,17/CCU | 41: **$88,27** → 42: **$1,33** | hai đầu cách khoảng chuẩn 12,3× và 5,1× |

Ba dòng đáng nhớ nhất, không dòng nào nói về tốc độ code:

- **Dòng 17.** Băng thông là một phép nhân, nên hai kỹ thuật độc lập cho kết quả **nhân** nhau. Chỉ làm binary thì dừng ở 6,82× và vẫn gấp 4,8 lần mục tiêu.
- **Dòng 9.** Con số sai duy nhất tôi cài vào rồi phải gỡ ra không nằm trong netcode — nó nằm ở một byte bán kính, và hiện ra ở tỉ lệ reconciliation phải sửa, cách chỗ gây lỗi ba lớp trừu tượng.
- **Dòng 13 và 14.** Hai chỗ "lệch" duy nhất so với bài 24, cả hai lệch vì **entity của tôi khác entity của bài 24**. Con số có đơn vị "trên mỗi entity" không chuyển được sang game khác; con số "trên mỗi trường" thì chuyển được.

---

## 5. Tính tay

**Bài 1.** Ngân sách độ trễ end-to-end của bản cuối, RTT 100 ms, `d` = 3, đệm nội suy 100 ms.
- Với **vòng tròn của chính mình**: tổng bao nhiêu ms? (Gợi ý: prediction xoá chặng nào.)
- Với **đối thủ**: tổng bao nhiêu ms, và bao nhiêu đơn vị lệch ở tốc độ 220?
- Bài 8 nói ngân sách là 182,3 ms. Hai con số trên nằm ở đâu so với nó, và vì sao chỉ một trong hai đáng đem ra so?

**Bài 2.** Ngưỡng reconciliation.
- Bản binary có `err` p50 = 0,2354. Nếu bỏ quantize bán kính (dùng float32, +3 B/player) thì sàn nhiễu còn lại là bao nhiêu, và ngưỡng X mới theo phương pháp trung bình nhân là bao nhiêu?
- Với X mới đó, tỉ lệ phải sửa rơi vào khoảng nào — dùng bảng quét ngưỡng ở mục 3.4?
- 3 byte đó làm băng thông mỗi player tăng bao nhiêu phần trăm, biết snapshot AOI trung bình có 57,3 entity trong đó ~3 là player?

**Bài 3.** Trần và tiền.
- Ở 800 player, tổng egress một node là bao nhiêu MB/s, và $/CCU/tháng là bao nhiêu?
- Vì sao $/CCU ở 800 player **cao hơn** ở 100 player, dù tổng hạ tầng dùng chung nhiều hơn?
- Muốn giữ $/CCU không tăng theo N thì phải cắt cái gì — và bài nào của chương 6 dạy cái đó?

---

## 6. Chuyển giao

1. Bạn tăng snapshot rate từ 20 lên 30 Hz. Theo bài 20, đệm nội suy được phép giảm còn bao nhiêu, ngân sách người-nhìn-đối-thủ cắt được bao nhiêu ms, và băng thông tăng bao nhiêu phần trăm? Đổi này lời hay lỗ với agar-lite?
2. World giữ nguyên 2.000 × 2.000 nhưng bạn nâng lên 800 player. `k` đo được là 138,3. Nếu muốn `k` quay về 57,3 mà không đổi số người, bạn có đúng hai núm — chỉ ra cả hai, và nói núm nào đổi gameplay.
3. Một client gian lận khai `d = 400 ms` để được tua ngược sâu hơn. Với bảng ở mục 3.9, nó chiếm được lợi thế bao nhiêu đơn vị, và trần clamp 200 ms cắt được bao nhiêu phần trăm lợi thế đó?
4. `err` p99 của bản JSON là 3,5066 đơn vị trong khi p50 = 0. Theo ba hình dạng của bài 19, cái đuôi đó là nguyên nhân nào, và số nào khác trong bài này xác nhận chẩn đoán của bạn?
5. Bạn muốn thêm delta compression (bài 25) lên trên binary + AOI. Với `k` = 57,3 và 0,058 lượt-vào-tầm mỗi giây trên mỗi entity (bài 26), ước lượng phần trăm băng thông mà spawn chiếm sau khi delta đã cắt cập nhật xuống ~2 B — và nói vì sao con số đó khiến delta ít đáng làm hơn ở agar-lite so với ở MMO.
6. Ở 1.600 conn, mỗi broadcast sinh 3,39 MB rác vì mỗi writer nhận một bản copy. Đề xuất một cách bỏ hẳn phần copy đó **mà không** dùng mutex, và nói cách của bạn hỏng ở tình huống nào.
7. **Câu khó nhất:** cả 21 dòng của bảng tổng kết đều so *một con số* với *một con số*. Nhưng có một mệnh đề của course mà thiết kế capstone này **không thể** kiểm chứng dù chạy bao nhiêu lần — nó không phải là "chưa đo", mà là "không đo được bằng bộ thí nghiệm này". Chỉ ra mệnh đề đó, giải thích vì sao hai bài capstone bị mù trước nó, và mô tả thí nghiệm nhỏ nhất bạn phải thêm để nhìn thấy nó.

---

## 7. Tóm tắt

- **Ba lớp đầu (input sync, prediction, reconciliation) không cắt một byte nào; hai lớp sau (binary, AOI) không cắt một mili giây độ trễ cảm nhận nào.** Chúng chữa hai bệnh khác nhau, không thay nhau được.
- Input có trường `tick` + buffer server cho **p50 lead = 3 đúng bằng `d`**, 0,45–0,56 % gói tới muộn. Tỉ lệ tick đói input **2,25 %** ở bản JSON so với 0,97 % ở bản binary — chi phí serialize ăn cả vào độ tin cậy của input pipeline.
- Prediction đưa độ trễ cảm nhận từ **150,1 ms xuống 0 tick chờ mạng**, và cái nó che là **28,65 đơn vị = 2,39 bán kính = 7,94 input chưa ack**.
- Reconciliation tốn **84 ns/bước**, rẻ hơn dự đoán bài 19 **14 lần**, kết luận không đổi. Với luật chơi dùng chung, `err` p50 là **đúng 0,0000** — chương 3 trả bài ở đây. **Một byte bán kính quantize sai chỗ** làm tỉ lệ phải sửa tăng **3,63 lần** (2,62 % → 9,51 %), vì client nạp bán kính vào công thức tốc độ.
- Ngưỡng X = 0,5 đơn vị chọn bằng trung bình nhân của sàn nhiễu 0,2354 và trần nhìn thấy 1,0. Lệch một bậc xuống 0,1 thì phải sửa **29,18 %** số snapshot — 5,8 lần rung mỗi giây.
- Nội suy biến bậc thang **11,0 đơn vị mỗi 3 khung hình** thành **3,69 đơn vị mỗi khung** — đúng tỉ số 60/20. Đệm sâu hơn 100 ms **không cải thiện p99**, chỉ cắt cú giật tệ nhất (100 → 150 ms cắt 41,6 %).
- Binary quantized: **31,40 → 4,29 B/entity, 7,31×**. Bất biến thật không phải B/entity mà là **B/field**: JSON 12,73 · binary căn byte 1,75 · tỉ số 7,27 — khớp tỉ số đo trực tiếp 7,31 trong vòng 0,55 %.
- AOI R = 400 cắt **561 → 57,3 entity (9,79×)**. Tích hai kỹ thuật: **66,80×**, và đo trực tiếp cũng ra 66,80. Băng thông **351.387 → 5.267 B/s mỗi player**, tức 52,7 % mục tiêu 10.000 B/s của cả course.
- Broadcast ở 100 player: **84,7 % → 4,7 % ngân sách tick**. Trần room từ **114 lên trên 800, cỡ 2.000** — và nút thắt tiếp theo không còn là tính toán mà là **cấp phát: 3,39 MB rác mỗi broadcast ở 1.600 conn**, đúng chỗ bài 37 chỉ.
- Lag compensation: ở `t_view` lùi 150 ms, nhắm hoàn hảo mà **trượt 89,79 % số phát** nếu không bù; có bù thì **100 %**. Giá: 42 ns mỗi truy vấn, 37,5 KiB lịch sử cho 50 player.
- Tiền: **$88,27 → $1,33 mỗi CCU mỗi tháng**, giảm 66,2 lần, toàn bộ nằm ở egress. Không tối ưu một vòng lặp nào.

---

## Đi tiếp từ đây

Course dừng ở một room, một node, một trận. Những thứ nó **không** dạy:

| Chủ đề | Vì sao course không chứa | Đọc tiếp |
|---|---|---|
| **MMO seamless world** | bài 32 dừng ở handoff giữa node; thế giới liền mạch cần interest management phân tán và quyền sở hữu entity di động | kiến trúc EVE Online, replication graph của Unreal |
| **Voice chat** | codec, jitter buffer, mixing là bài toán audio, dùng chung rất ít với snapshot | RFC 3550 (RTP), tài liệu Opus |
| **Replay & spectator** | bài 9 nói determinism cho phép replay, nhưng lưu/tua/seek + tương thích phiên bản là hệ thống riêng | GDC talk về replay của Rocket League |
| **Live-ops** | A/B test cân bằng, event theo mùa, hot-patch luật chơi mà không drain trận đang chạy | phần vận hành trong tài liệu Agones |
| **Matchmaking nâng cao** | bài 30 dừng ở MMR + hàng đợi; backfill, party, role queue, chống smurf là tối ưu nhiều ràng buộc | OpenMatch, TrueSkill 2 |

Ba nguồn đọc ngay, theo thứ tự: **Gaffer On Games** (Glenn Fiedler) cho mạng và fixed timestep; **Source Multiplayer Networking** của Valve cho prediction/lag compensation, viết bởi người cài nó; **GDC vault** phần netcode cho các bản mổ xẻ hệ thật.

---

Mười chương là một dây suy diễn, và bây giờ nó khép lại thành một vòng.

Chương 1 nói game server không thể là BE App vì công việc do **thời gian** khởi tạo. Chương 2 biến thời gian thành vòng lặp có ngân sách 16,67 ms rồi bóc 182 ms thành bảy chặng. Chương 3 đòi vòng lặp đó cho **cùng một kết quả ở hai máy** — và chính đòi hỏi đó trả lại `err` p50 bằng đúng 0,0000. Chương 4 chọn đường ống. Chương 5 dùng determinism của chương 3 để **giấu** độ trễ của chương 4, giấu đúng 132,3 ms. Chương 6 hỏi ngược lại: không giấu được thì đừng gửi — cắt 66,8 lần. Chương 7 nhân lên nhiều node, chương 8 giả định người chơi nói dối, chương 9 đo bằng p99 thay vì trung bình. Chương 10 dựng thật, và mọi con số đứng đúng chỗ nó được hứa.

Bạn không học xong netcode. Bạn học xong cách **không tin một con số nào cho tới khi tự đo nó** — và đó là thứ duy nhất trong 42 bài không hết hạn.
