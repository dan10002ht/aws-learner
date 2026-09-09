# Bài 6 — Accumulator, catch-up & spiral of death

## 1. Mục tiêu

Sau bài này bạn có thể:

- Đọc dòng log `ticks 1200 / sim steps 1200 / tick rỗng 15 / catch-up 15` và nói được **vì sao bốn con số đó bắt buộc khớp nhau như vậy**.
- Viết vòng accumulator bằng bốn dòng, và chỉ ra dòng nào giữ cho thời gian mô phỏng không bị trôi.
- Giải thích vì sao **số vòng lặp không bằng số bước mô phỏng**, và vì sao đếm nhầm hai cái đó làm hỏng nhịp gửi snapshot chứ không làm hỏng thế giới.
- Phát biểu **điều kiện chính xác** để spiral of death xảy ra — một bất đẳng thức, không phải một cảm giác — và chỉ ra tải nào thoả nó.
- Dùng `dropped = floor(stall/dt) − MaxCatchUp` để **dự đoán trước** server vứt bao nhiêu bước khi gặp cú khựng dài bao nhiêu, rồi kiểm lại bằng đo.
- Chọn `MaxCatchUp` như một tham số thiết kế: nói được nó tương ứng với câu hỏi sản phẩm nào.

---

## 2. Triệu chứng

Bài 5 vừa chốt một điều dứt khoát: `dt` là **hằng số của hệ thống**. Simulation không bao giờ được nhìn thấy thời gian thật; nó luôn nhận đúng 16,6667 ms mỗi bước, bất kể máy nhanh hay chậm.

Nghe rất gọn. Cho tới khi bạn chạy vòng lặp 20 giây ở 60 Hz và nó in ra dòng này:

```
ticks       1200 thực tế / 1200 kỳ vọng   drift +0 tick (+0.00%)
sim steps   1200   catch-up 15   tick rỗng 15   dropped 0
```

*(Đo thật, `go run ./cmd/tickloop -duration 20s`, 60 Hz, 1.000 entity, sched=deadline, máy Apple M-series.)*

Vòng lặp quay đúng **1200** lần, simulation chạy đúng **1200** bước. Nhưng **15 vòng không chạy bước nào** (`tick rỗng 15`), và **15 bước phải chạy bù** — tức 15 vòng nào đó đã chạy 2 bước thay vì 1.

Nếu 15 vòng chạy 0 bước, tổng phải là 1185. Vậy mà tổng vẫn 1200. Và con số 15 xuất hiện **hai lần**, ở hai cột khác nhau — trong mọi lần chạy:

| Lần chạy | ticks | sim steps | tick rỗng | catch-up |
|---|---|---|---|---|
| 5 s, 1.000 entity | 300 | 300 | 0 | 0 |
| 5 s, 1.000 entity (lần khác) | 300 | 300 | 4 | 4 |
| 20 s, 1.000 entity | 1200 | 1200 | 15 | 15 |
| 5 s, **200.000** entity | 300 | 300 | 34 | 34 |

*(Bốn lần chạy thật. Hai cột cuối thay đổi theo nhiễu của OS; cái không đổi là chúng luôn bằng nhau.)*

Không dòng code nào ép hai cột đó bằng nhau — không ai đếm rồi bù. Vậy cái gì ép? Và dòng cuối còn khó chịu hơn: tải nặng gấp 200 lần thì `tick rỗng` nhảy từ 1 lên 34, còn `sim steps` **không nhúc nhích**.

---

## ⏸ Dừng lại — đoán trước #1

Chọn một đáp án trước khi đọc tiếp.

**Vì sao có 15 vòng lặp không chạy bước mô phỏng nào, mà tổng số bước vẫn đúng 1200?**

```
(a) Vòng lặp bỏ qua tick khi không có gì để làm — tối ưu hoá, không có gì lạ
(b) Bộ đếm bị sai; thực tế vẫn chạy 1200 vòng có ích, log đếm nhầm
(c) Vòng lặp không hỏi "đến lượt chạy chưa", nó hỏi "từ lần trước tới giờ
    đã trôi qua bao nhiêu thời gian thật" — và có lúc câu trả lời là chưa đủ một dt
(d) Scheduler đánh thức sớm 15 lần; 15 tick đó bị bỏ và mất luôn, log sai ở cột sim steps
```

Sự khác nhau giữa (a) và (c) là toàn bộ bài này. Chọn xong hãy đọc tiếp.

---

## 3. Lý thuyết

### 3.1 Hai đồng hồ, và không ai bắt chúng khớp

Đáp án là **(c)**.

Bài 5 để lại một khoảng trống mà lúc đó chưa cần nhìn tới. `dt` cố định 16,6667 ms là **thời gian mô phỏng**. Nhưng vòng lặp sống trong **thời gian thật**, và thời gian thật thì không cố định gì cả: OS hứa `sleep` **ít nhất** ngần này chứ không hứa **đúng** ngần này; timer kernel có độ hạt; máy còn hàng trăm tiến trình khác xin CPU; GC và page fault lỡ rơi vào hot path. Nên thực tế mỗi vòng lặp trôi qua **17,2 — 16,1 — 16,9 — 16,4 ms**… loanh quanh 16,67 nhưng gần như không bao giờ trúng.

Bạn có hai đại lượng buộc phải nối lại: một cái **không được phép sai** (thời gian mô phỏng — sai là mất determinism, hỏng cả chương 3 và 5), một cái **chắc chắn sẽ sai** (thời gian thật — OS quyết, không phải bạn).

Nối hai thứ đó là việc của **accumulator**. Nó không phải thủ thuật tối ưu — nó là cây cầu duy nhất, và không có nó thì hoặc bạn phá `dt`, hoặc thế giới trôi lệch khỏi đồng hồ treo tường.

Chỗ dễ nhầm nhất với dân backend: bạn quen vòng lặp hỏi **"đến lượt chưa?"**. Accumulator hỏi câu khác — **"từ lần trước tới giờ đời thật trôi bao nhiêu, và số đó chia được cho `dt` mấy lần?"**

### 3.2 Bốn dòng code

Đây là toàn bộ cơ chế, trích nguyên văn từ `internal/loop/loop.go`:

```go
acc += woke.Sub(prev)
prev = woke

steps := 0
for acc >= dt && steps < cfg.MaxCatchUp {
	step(dt)
	acc -= dt
	steps++
}
```

Bốn dòng, ba ý:

1. **`acc += woke.Sub(prev)`** — nạp vào một cái xô đúng lượng thời gian thật vừa trôi qua. Không làm tròn, không cắt bớt.
2. **`for acc >= dt`** — rút ra từng khối `dt` **nguyên vẹn**. Simulation luôn nhận đúng hằng số, không bao giờ nhận phần lẻ.
3. **`acc -= dt`** — dòng quan trọng nhất mà mắt hay lướt qua: phần dư **ở lại trong xô**. Không bị vứt, không bị làm tròn, không bị "thôi coi như đủ". Nó chờ tick sau. Đổi dòng này thành `acc = 0` là bạn có một server trôi chậm dần so với đời thật, và không metric nào kêu lên.

Chạy thử bằng tay ba tick, `dt = 16,6667 ms`, xô bắt đầu rỗng:

| Tick | Thời gian thật trôi qua | Xô trước khi rút | Số step chạy | Xô sau |
|---|---|---|---|---|
| 1 | 17,2 ms | 17,20 | **1** | 0,53 |
| 2 | 16,1 ms | 16,63 | **0** | 16,63 |
| 3 | 16,9 ms | 33,53 | **2** | 0,20 |
| | **50,2 ms** | | **3 step = 50,00 ms** | dư 0,20 |

Tick 2 chính là một dòng `tick rỗng` trong log ở mục 2: xô có 16,63 ms, thiếu 0,04 ms so với `dt`, nên vòng lặp quay nhưng simulation đứng yên. Tick 3 là một dòng `catch-up`: xô đầy 33,53 ms, đủ hai khối.

Và nhìn cột cuối cùng: 50,2 ms đời thật đã sinh ra đúng 3 bước = 50,00 ms thời gian mô phỏng, còn 0,20 ms nằm trong xô chờ tick sau. **Không mất, không thừa.**

<svg viewBox="0 0 720 300" role="img" aria-labelledby="gs6-a-t gs6-a-d" style="width:100%;height:auto">
<title id="gs6-a-t">Accumulator nạp thời gian thật và rút ra các khối dt nguyên vẹn</title>
<desc id="gs6-a-d">Ba tick liên tiếp. Tick một nạp 17,2 mili giây và rút ra một bước, dư 0,53. Tick hai nạp 16,1 nhưng tổng mới chỉ 16,63 nên không rút được bước nào, xô giữ nguyên 16,63. Tick ba nạp 16,9 thành 33,53 nên rút ra hai bước, dư 0,20. Tổng 50,2 mili giây thật cho ra đúng ba bước mô phỏng.</desc>
<text x="14" y="20" font-size="12" font-weight="bold" fill="currentColor">Nạp vào — thời gian THẬT trôi qua</text>
<rect x="14" y="30" width="180" height="30" rx="6" fill="#f59e0b" fill-opacity="0.28"/>
<text x="104" y="50" text-anchor="middle" font-size="11" fill="currentColor">tick 1 — 17,2 ms</text>
<rect x="204" y="30" width="168" height="30" rx="6" fill="#f59e0b" fill-opacity="0.28"/>
<text x="288" y="50" text-anchor="middle" font-size="11" fill="currentColor">tick 2 — 16,1 ms</text>
<rect x="382" y="30" width="177" height="30" rx="6" fill="#f59e0b" fill-opacity="0.28"/>
<text x="470" y="50" text-anchor="middle" font-size="11" fill="currentColor">tick 3 — 16,9 ms</text>
<text x="14" y="118" font-size="12" font-weight="bold" fill="currentColor">Xô — accumulator (rút khi đủ 16,6667), phần dư không bao giờ bị vứt</text>
<rect x="14" y="128" width="690" height="44" rx="8" fill="#64748b" fill-opacity="0.10" stroke="currentColor" stroke-opacity="0.25"/>
<text x="90" y="146" text-anchor="middle" font-size="10" fill="currentColor">sau tick 1</text>
<text x="90" y="164" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">dư 0,53</text>
<text x="330" y="146" text-anchor="middle" font-size="10" fill="currentColor">sau tick 2 — chưa đủ dt</text>
<text x="330" y="164" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">giữ 16,63</text>
<text x="590" y="146" text-anchor="middle" font-size="10" fill="currentColor">sau tick 3</text>
<text x="590" y="164" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">dư 0,20</text>
<text x="14" y="204" font-size="12" font-weight="bold" fill="currentColor">Rút ra — bước MÔ PHỎNG, luôn đúng 16,6667 ms</text>
<rect x="14" y="214" width="172" height="30" rx="6" fill="#84cc16" fill-opacity="0.30"/>
<text x="100" y="234" text-anchor="middle" font-size="11" fill="currentColor">step 1</text>
<rect x="196" y="214" width="120" height="30" rx="6" fill="#64748b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 3"/>
<text x="256" y="234" text-anchor="middle" font-size="11" fill="currentColor">0 step</text>
<rect x="326" y="214" width="172" height="30" rx="6" fill="#84cc16" fill-opacity="0.30"/>
<text x="412" y="234" text-anchor="middle" font-size="11" fill="currentColor">step 2</text>
<rect x="508" y="214" width="172" height="30" rx="6" fill="#84cc16" fill-opacity="0.30"/>
<text x="594" y="234" text-anchor="middle" font-size="11" fill="currentColor">step 3</text>
<line x1="14" y1="258" x2="704" y2="258" stroke="currentColor" stroke-opacity="0.35" stroke-width="1"/>
<text x="14" y="278" font-size="11" fill="currentColor">3 vòng lặp · 50,2 ms thật</text>
<text x="704" y="278" text-anchor="end" font-size="11" font-weight="bold" fill="currentColor">3 sim step = 50,00 ms mô phỏng, dư 0,20 chờ tiếp</text>
</svg>

### 3.3 Hệ quả 1: số tick ≠ số sim step, và đó không phải lỗi

Bây giờ dòng log ở mục 2 hết bí ẩn.

Trong 20 giây, đời thật trôi đúng 20 giây, chia cho `dt` được đúng 1200 khối. Accumulator chỉ biết làm một việc — rút hết khối nào rút được — nên nó **buộc phải** sinh ra 1200 bước. Số đó do đồng hồ quyết định, không do vòng lặp quyết định. Còn vòng lặp quay 1200 lần vì scheduler deadline đánh thức nó 1200 lần (bài 7). Hai cái 1200 này đến từ **hai nguồn độc lập**, chỉ tình cờ bằng nhau vì cùng đo một khoảng thời gian.

Ép hai số bằng nhau, đại số làm nốt phần còn lại:

```
sim steps = (số tick chạy ≥1 step) + (số step chạy bù)
   1200   = (1200 − tick rỗng)      + catch-up
```

→ `catch-up = tick rỗng`. **Bắt buộc.** Không có dòng code nào ép, chính đẳng thức ép.

Kiểm lại bằng ba lần chạy thật ở mục 2 và mục 4:

| Lần chạy | ticks | rỗng | bù | `(ticks − rỗng) + bù` | sim steps đo được |
|---|---|---|---|---|---|
| 20 s, bình thường | 1200 | 15 | 15 | 1200 | **1200** ✓ |
| 6 s, `-stall 300ms` | 360 | 17 | 4 | 347 | **347** ✓ |
| 5 s, 20 triệu entity | 41 | 4 | 140 | 177 | **177** ✓ |

Ba tải hoàn toàn khác nhau, một công thức. Dòng cuối đáng nhìn kỹ: **41 vòng lặp sinh ra 177 bước** — tỉ lệ 1:4,3, không phải 1:1. Còn dòng giữa, 360 vòng chỉ ra 347 bước, là dòng duy nhất bị **mất** thật; mục 3.5 nói vì sao.

Phát biểu gọn để mang theo cả course:

> Vòng lặp quay bao nhiêu lần là chuyện của **OS**. Simulation chạy bao nhiêu bước là chuyện của **đồng hồ**. Chúng không phải một, và mọi lần bạn dùng nhầm cái này thay cái kia đều hỏng ở chỗ khó tìm.

### 3.4 Hệ quả 2: nhịp gửi snapshot phải đếm theo sim step

Đây là chỗ hệ quả 1 biến thành bug thật, và là lý do bài này nằm trước chương 6 chứ không nằm sau.

Bạn muốn gửi snapshot 20 lần mỗi giây trong khi mô phỏng 60 Hz. Cách viết tự nhiên nhất, và cách gần như ai cũng viết lần đầu:

```go
// SAI — đếm số vòng lặp
for n := 1; ; n++ {
    ...
    if n%3 == 0 { sendSnapshot() }
}
```

Nó **trông** đúng: 60 chia 3 bằng 20. Và trên máy rảnh nó chạy đúng — bảng mục 2 có hai lần chạy `tick rỗng 0`, ở đó vòng lặp và bước mô phỏng trùng khít, bug không lộ ra.

Rồi máy bận lên. Lấy đúng số đo: 5 giây với 200.000 entity cho `tick rỗng 34`. 34 lần trong 300 vòng, vòng lặp quay mà thế giới đứng yên — nhưng bộ đếm `n` vẫn nhích. Nghĩa là bạn gửi cho client những snapshot **giống hệt cái vừa gửi**, và ngược lại có những vòng chạy 2 bước mà chỉ gửi một snapshot.

Sửa bằng cách chuyển bộ đếm **vào bên trong** vòng rút step, ngay sau `steps++`. Khác biệt là một chỗ đặt. Nhưng nó quyết định nhịp gửi lấy nguồn từ đâu: **scheduler của OS**, hay **đồng hồ**. Trên máy rảnh cả hai cùng ra 20 Hz; trên máy bận, bản đếm-theo-vòng-lặp dao động quanh 20 và không đều.

Đó là vế đắt, vì client dựng chuyển động mượt bằng cách nội suy giữa hai snapshot (bài 20), và phép nội suy đó **giả định khoảng cách giữa chúng đều**. Nhịp gửi dao động theo jitter của OS làm nhân vật của người khác chạy nhanh chậm thất thường trên màn hình — triệu chứng cực khó debug: nó xuất hiện ở client, chỉ khi server bận, và không metric nào của server đỏ lên.

> Quy tắc: mọi nhịp nhìn thấy được từ bên ngoài — snapshot, hồi máu mỗi 5 giây, đếm ngược trận đấu — đều phải neo vào **số bước mô phỏng**, không neo vào số vòng lặp. Vòng lặp là thứ của máy; bước mô phỏng là thứ của thế giới.

---

## ⏸ Dừng lại — đoán trước #2

Server bị GC pause 300 ms. Vòng lặp tỉnh lại, `acc` đang có 300 ms — tức **18 bước nợ** (300 / 16,6667 = 18,0).

**Nó chạy hết 18 bước ngay lúc đó chứ?** Ở 1.000 entity, một bước mô phỏng tốn **1,18 µs** (đo bằng bench, bài 8 sẽ dùng lại). 18 bước = 21 µs, chưa tới 0,13 % ngân sách một tick.

```
(a) Chạy hết 18 — rẻ như vậy thì có gì phải nghĩ, thế giới đuổi kịp ngay
(b) Chạy hết 18, nhưng gửi 18 snapshot nên nghẽn băng thông
(c) Chỉ chạy 5 và VỨT 13 bước — thế giới nhảy cóc, người chơi thấy giật
(d) Không chạy bước nào, đợi accumulator tự cạn
```

Nếu bạn chọn (a): con số 21 µs là thật, phép tính của bạn không sai chỗ nào. Vòng lặp vẫn chọn (c). Mục sau nói vì sao — và vì sao lý do đó **không nằm trong con số 21 µs**.

---

### 3.5 Spiral of death — điều kiện chính xác

Hãy để bản (a) chạy trước, vì nó thuyết phục. Bỏ `MaxCatchUp` đi: sau cú khựng 300 ms, vòng lặp chạy 18 bước hết 21 µs, `acc` về 0, thế giới đuổi kịp hoàn toàn, không mất bước nào, không ai thấy giật. Rõ ràng tốt hơn phương án vứt 13 bước. Ở tải này, **lập luận đó đúng**, và không phép tính nào bác được nó.

Bây giờ đại số hoá, vì tải không đứng yên. Gọi `T` là thời gian thật để chạy **một** bước mô phỏng. Trong lúc bạn chạy `k` bước trả nợ, đời thật trôi thêm `k·T`, mà mỗi `dt` đời thật lại sinh một bước nợ mới:

```
nợ trả được   = k bước
nợ mới sinh ra = k·T / dt bước
nợ ròng thay đổi = k·(T/dt − 1)
```

Toàn bộ số phận của vòng lặp nằm trong tỉ số **`T/dt`**:

| `T/dt` | Chạy bù thì sao | Kết cục |
|---|---|---|
| `< 1` | mỗi bước trả nhiều hơn số nợ nó sinh | đuổi kịp, xô cạn dần |
| `= 1` | trả được đúng bằng sinh ra | nợ đứng yên **mãi mãi** — không bao giờ hết |
| `> 1` | mỗi bước sinh nợ nhiều hơn trả | **nợ tăng vô hạn** |

Dòng cuối là **spiral of death**: càng chạy bù càng tụt hậu, mỗi vòng nợ nhiều hơn vòng trước, cho tới khi vòng lặp không bao giờ ra khỏi khối `for` nữa. Server không crash — nó tệ hơn crash: tiến trình vẫn sống, health check vẫn xanh, port vẫn mở, và không client nào nhận được gì.

Con số của bạn ở 1.000 entity: `T/dt = 1,18 µs / 16,6667 ms = 0,00007` — cách ngưỡng **14.000 lần**. Bản (a) an toàn tuyệt đối. Đó chính là cái bẫy.

Vì `T` không phải hằng số. Nó là hàm của số entity, của gameplay bạn thêm vào tháng sau, của một GC pause rơi đúng giữa vòng chạy bù. Đây là cùng một máy, cùng một binary, chỉ đổi số entity:

```
go run ./cmd/tickloop -entities 20000000 -duration 5s

  ticks         41 thực tế / 301 kỳ vọng   drift -260 tick (-86.38%)
  sim steps    177   catch-up 140   tick rỗng 4   dropped 115
  wake lateness  p50 1.763s    p99 4.133s
  step work      p50 140.12ms  p99 143.65ms   — 861.9% ngân sách, QUÁ TẢI
```

`T = 140,12 ms`, `dt = 16,6667 ms` → **`T/dt = 8,4`**. Mỗi bước chạy bù sinh ra 8,4 bước nợ mới: đúng dòng `> 1` của bảng trên, đo được trên máy thật.

Hậu quả: vòng lặp chỉ tỉnh **41 lần** trong 5 giây thay vì 301 — nó kẹt trong khối `for` gần hết thời gian. `wake lateness` p50 lên **1,763 giây** trên ngân sách 16,67 ms. Ở trạng thái đó, socket không được đọc, input không được xử lý, không snapshot nào được gửi.

Và `dropped 115` chính là thứ giữ cho nó còn in ra được bảng này: với `MaxCatchUp = 5`, mỗi lần tỉnh vòng lặp chạy tối đa 5 bước rồi **bắt buộc** thoát ra, dù nợ còn bao nhiêu. Không có nó, dòng lệnh đó không bao giờ trả về prompt.

Điểm cần nhớ, ngược với cách trực giác xếp hạng nguyên nhân:

> Spiral of death **không phải hậu quả của cú khựng**. Cú khựng chỉ tạo ra nợ ban đầu. Cái quyết định là `T/dt` — chi phí một bước so với ngân sách một bước. Một server có `T/dt = 0,9` sống sót qua cú khựng 2 giây; một server có `T/dt = 1,1` chết vì một GC pause 50 ms.

### 3.6 `MaxCatchUp = 5` là một câu hỏi sản phẩm, không phải một hằng số ma thuật

Giờ mới trả lời được (c) ở hộp ⏸ #2 cho tử tế.

`MaxCatchUp` không giúp gì cho tải 1.000 entity — ở đó nó không bao giờ chạm trần. Nó là **phí bảo hiểm**: trả bằng việc chấp nhận thế giới nhảy cóc trong những cú khựng dài, để đổi lấy đảm bảo rằng vòng lặp **luôn** thoát khỏi khối `for` trong thời gian hữu hạn, ở mọi tải, kể cả tải bạn chưa thấy. Cái nó chặn là kịch bản `T/dt > 1` bên trên — thứ bạn không kiểm soát được, vì `T` phụ thuộc vào tải production chứ không phụ thuộc vào đoạn code bạn vừa đọc lại.

Hai lựa chọn, đặt cạnh nhau:

| Tình huống | Bỏ `MaxCatchUp` | Giữ `MaxCatchUp = 5` |
|---|---|---|
| Khựng ngắn (< 83 ms) | không mất gì | **không mất gì** |
| Khựng dài, `T/dt < 1` | đuổi kịp, không mất bước | mất một ít bước, thế giới nhảy cóc |
| Khựng dài, `T/dt > 1` | **vòng lặp không thoát ra nữa** | vẫn quay, vẫn đọc socket, vẫn gửi được |
| Người chơi thấy | hoàn hảo, cho tới lúc **mất trắng trận đấu** | giật một cái, rồi chơi tiếp |

Dòng cuối là chỗ ra quyết định, và nó không phải quyết định kỹ thuật. "Chạy bù bằng hết" cho ra một server **chết**, và server chết thì **tất cả cùng mất trận** — kể cả người đang thắng, kể cả người mạng tốt. "Vứt bớt" cho ra một cú giật mà mọi người cùng chịu rồi cùng chơi tiếp.

Đây là bài 1 quay lại: **chậm bằng hỏng**. Một bước mô phỏng chạy muộn 2 giây không giá trị hơn một bước không chạy — thế giới đã đi tiếp rồi.

Vậy chọn số 5 thế nào? Đọc ngược từ nghĩa của nó:

> `MaxCatchUp × dt` = **ngưỡng tha thứ**. Cú khựng ngắn hơn ngưỡng này thì server nuốt trọn, không ai biết. Dài hơn thì phần vượt bị vứt, và thế giới nhảy cóc đúng phần vượt đó.

Với `MaxCatchUp = 5` và 60 Hz: `5 × 16,6667 = 83,3 ms`. Câu hỏi bạn thực sự trả lời khi gõ số 5 là:

**"Một cú khựng dài bao nhiêu thì tôi chấp nhận cho thế giới nhảy cóc?"**

Đó là câu hỏi sản phẩm — game bắn súng thi đấu trả lời khác game thẻ bài. Và nó có hệ quả ngay: một server 128 Hz (`dt = 7,81 ms`) muốn giữ ngưỡng 83 ms phải đặt `MaxCatchUp ≈ 11`, không phải 5, vì ngưỡng là **thời gian** còn `MaxCatchUp` chỉ là số bước.

---

## 4. Công thức — một dự đoán, rồi đem đi kiểm

Từ mục 3.6 rút ra một dự đoán định lượng, đủ chặt để sai thì biết ngay. Một cú khựng dài `stall` nạp `stall` ms vào xô, tức `floor(stall/dt)` bước nợ; lần tỉnh tiếp theo chạy tối đa `MaxCatchUp` bước; phần còn lại bị vứt:

```
dropped = max(0,  floor(stall / dt) − MaxCatchUp)
```

Với `dt = 16,6667 ms` và `MaxCatchUp = 5`, công thức **dự đoán trước khi chạy**:

| `stall` | `floor(stall/dt)` = nợ | trừ 5 | **dự đoán `dropped`** |
|---|---|---|---|
| 60 ms | 3 | −2 | **0** |
| 80 ms | 4 | −1 | **0** |
| 100 ms | 6 | 1 | **1** |
| 150 ms | 9 | 4 | **4** |
| 300 ms | 18 | 13 | **13** |

Giờ chạy thật, `go run ./cmd/tickloop -duration 6s -stall <X>` (một cú khựng duy nhất chèn vào giữa run):

```
60ms:   sim steps 360   catch-up 15   tick rỗng 15   dropped 0
80ms:   sim steps 361   catch-up  5   tick rỗng  5   dropped 0
100ms:  sim steps 359   catch-up  7   tick rỗng  8   dropped 1
150ms:  sim steps 356   catch-up  7   tick rỗng 11   dropped 4
300ms:  sim steps 347   catch-up  4   tick rỗng 17   dropped 13
```

**Khớp cả năm mốc**, không mốc nào lệch một đơn vị.

Còn một cách kiểm thứ hai, độc lập với cột `dropped`: 6 giây ở 60 Hz đáng lẽ cho 360 bước, nên số bước thực tế phải là `360 − dropped` — và đúng là vậy ở cả bốn mốc: 360, 359, 356, 347. *(Mốc 80 ms ra 361, hơn 360 một bước, vì thời gian chạy thật là 6,00x giây chứ không tròn 6,000 — lệch ở bộ đếm, không phải ở accumulator.)*

Hai cột đến từ hai chỗ khác nhau trong code và cùng chỉ về một số. Đến đây công thức không còn là thứ được tuyên bố.

<svg viewBox="0 0 720 290" role="img" aria-labelledby="gs6-b-t gs6-b-d" style="width:100%;height:auto">
<title id="gs6-b-t">Cú khựng 300 mili giây sinh 18 bước nợ, chạy bù 5, vứt 13</title>
<desc id="gs6-b-d">Trục thời gian: server chạy đều, gặp cú khựng 300 mili giây tương đương 18 bước nợ. Lần tỉnh dậy tiếp theo chỉ chạy 5 bước theo giới hạn MaxCatchUp, 13 bước còn lại bị vứt, tương đương thế giới nhảy cóc 216,7 mili giây. Ngưỡng tha thứ là 5 nhân 16,67 bằng 83,3 mili giây.</desc>
<text x="14" y="20" font-size="12" font-weight="bold" fill="currentColor">Trục thời gian thật</text>
<rect x="14" y="32" width="150" height="28" rx="6" fill="#84cc16" fill-opacity="0.28"/>
<text x="89" y="51" text-anchor="middle" font-size="11" fill="currentColor">chạy đều, 1 step/tick</text>
<rect x="168" y="32" width="230" height="28" rx="6" fill="#ef4444" fill-opacity="0.30"/>
<text x="283" y="51" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">KHỰNG 300 ms — không tick nào chạy</text>
<rect x="402" y="32" width="88" height="28" rx="6" fill="#f59e0b" fill-opacity="0.32"/>
<text x="446" y="51" text-anchor="middle" font-size="11" fill="currentColor">tỉnh dậy</text>
<rect x="494" y="32" width="210" height="28" rx="6" fill="#84cc16" fill-opacity="0.28"/>
<text x="599" y="51" text-anchor="middle" font-size="11" fill="currentColor">chạy đều trở lại</text>
<line x1="446" y1="66" x2="446" y2="92" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<text x="14" y="112" font-size="12" font-weight="bold" fill="currentColor">Accumulator lúc tỉnh dậy: 300 ms ÷ 16,6667 = 18 bước nợ</text>
<rect x="14" y="124" width="192" height="34" rx="6" fill="#84cc16" fill-opacity="0.32" stroke="currentColor" stroke-opacity="0.35"/>
<text x="110" y="146" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">5 bước ĐƯỢC CHẠY</text>
<rect x="212" y="124" width="492" height="34" rx="6" fill="#ef4444" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="5 4"/>
<text x="458" y="146" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">13 bước BỊ VỨT — thế giới nhảy cóc 216,7 ms</text>
<text x="110" y="176" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.8">MaxCatchUp = 5</text>
<text x="110" y="192" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.8">= 83,3 ms tha thứ</text>
<line x1="14" y1="212" x2="704" y2="212" stroke="currentColor" stroke-opacity="0.35" stroke-width="1"/>
<text x="14" y="238" font-size="12" font-weight="bold" fill="currentColor">dropped = max(0, floor(stall / dt) − MaxCatchUp)</text>
<text x="14" y="262" font-size="11" fill="currentColor">dự đoán 60→0 · 80→0 · 100→1 · 150→4 · 300→13</text>
<text x="704" y="262" text-anchor="end" font-size="11" font-weight="bold" fill="currentColor">đo được: 0 · 0 · 1 · 4 · 13</text>
</svg>

Đọc lại mốc 300 ms, mốc duy nhất trong bảng mà người chơi cảm nhận được: nợ 18 bước, chạy 5, vứt 13 → `13 × 16,6667 =` **216,7 ms** thời gian mô phỏng không bao giờ được chạy. Một nhân vật chạy 5 m/s bỏ qua **1,08 mét** dịch chuyển — biến mất chỗ này, xuất hiện chỗ kia. Một viên đạn 100 m/s đi hết **21,7 mét** giữa hai khung hình; nếu code va chạm của bạn kiểm tra theo điểm chứ không theo đoạn, viên đạn đó xuyên qua tường.

Vế cuối là hoá đơn thật của quyết định này, và bài 6 không trả nó — bài 21 mới trả. Nói ra để bạn biết `MaxCatchUp` không phải van an toàn miễn phí: nó đẩy một loại lỗi khác sang phần code khác.

---

## 5. Tính tay

Không cần code. Mọi số cần dùng đều nằm trong bài.

**Bài 1.** Server 60 Hz, `MaxCatchUp = 5`. Bạn đo được GC pause p99 = 120 ms.
- Mỗi lần chạm p99 thì vứt bao nhiêu bước, thế giới nhảy cóc bao nhiêu ms?
- Muốn **không vứt gì** ở mức p99 đó, `MaxCatchUp` phải bằng bao nhiêu?
- Đặt `MaxCatchUp` bằng con số vừa tính có phải là quyết định đúng không? Trả lời bằng cách nhìn vào cột `T/dt` ở bảng mục 3.5, không phải bằng cảm giác.

**Bài 2.** Cùng một game, hai cấu hình: server A chạy 60 Hz `MaxCatchUp = 5`, server B chạy 128 Hz `MaxCatchUp = 5`.
- Ngưỡng tha thứ của mỗi bên là bao nhiêu ms?
- Cùng gặp cú khựng 100 ms: mỗi bên vứt bao nhiêu bước, thế giới nhảy cóc bao nhiêu ms?
- Kết quả này nói gì về việc tăng tick rate mà giữ nguyên `MaxCatchUp`? (Bài 8 sẽ tính nốt cái giá còn lại của việc tăng tick rate.)

**Bài 3.** Bạn đo `T` — thời gian một bước mô phỏng — được 12 ms trên server 60 Hz.
- `T/dt` bằng bao nhiêu? Server này ở dòng nào của bảng mục 3.5?
- Nó gặp cú khựng 200 ms. Với `MaxCatchUp = 5`, một lần tỉnh dậy chạy 5 bước hết bao nhiêu thời gian thật, và trong lúc đó sinh ra thêm bao nhiêu bước nợ?
- Nợ ròng sau lần tỉnh đó tăng hay giảm? Sau bao nhiêu lần tỉnh thì hết nợ?
- Bây giờ `T` tăng lên 18 ms (thêm một hệ thống gameplay). Trả lời lại ba câu trên. Con số nào đổi dấu?

---

## 6. Chuyển giao

Không có đáp án trong bài.

**Game server của bạn chạy trên máy ảo ở cloud.** Nhà cung cấp thỉnh thoảng **live-migrate** VM sang máy vật lý khác. Trong lúc migrate, VM bị đóng băng — không phải 300 ms mà **1,2 giây**. Vài lần mỗi tuần, không báo trước, không tắt được.

1. Với 60 Hz và `MaxCatchUp = 5`: mỗi lần migrate, thế giới nhảy cóc bao nhiêu ms? Tính ra số.
2. Đồng hồ trong VM có thể bị nhảy khi migrate. Điều đó ảnh hưởng tới `woke.Sub(prev)` thế nào, và nó có thể nạp vào accumulator một giá trị **âm** không? Bốn dòng ở mục 3.2 xử lý trường hợp đó ra sao?
3. Client cũng có accumulator riêng để chạy prediction (bài 18). Server nhảy cóc 1,2 giây còn client thì không — hai bên lệch bao nhiêu bước, và ai sửa cho ai?
4. Bạn nghĩ tới việc **phát hiện** khựng dài rồi xử lý riêng thay vì vứt lặng lẽ: tạm dừng trận, đếm ngược 3 giây, chạy tiếp. Cái đó cần gì mà bốn dòng ở mục 3.2 không có?
5. Người chơi mạng tệ mất gói 1,2 giây cũng thấy thế giới nhảy cóc y hệt. Từ phía **client**, hai nguyên nhân đó phân biệt được không? Từ phía **server** thì sao?
6. **Câu khó nhất:** ở đây `MaxCatchUp` cứu *server* bằng cách hy sinh *tính đúng đắn của thế giới*. Nhưng trong một hệ thống bạn làm hàng ngày — hàng đợi message có backlog dồn lại sau sự cố — bạn gặp đúng lựa chọn này dưới tên khác. Chỉ ra nó tên gì, `dt` tương ứng với cái gì, `T/dt > 1` tương ứng với triệu chứng nào, và **vì sao ở đó ngành thường chọn ngược lại với game server**.

Trả lời được câu 6 thì bạn thấy `MaxCatchUp` không phải mẹo của game — nó là một họ quyết định bạn đã ra nhiều lần, chỉ chưa gọi tên.

---

## 7. Tóm tắt

- `dt` là hằng số, thời gian thật thì không. **Accumulator là cây cầu duy nhất**: nạp thời gian thật vừa trôi, rút ra từng khối `dt` nguyên vẹn, **giữ lại phần dư**. Dòng quan trọng nhất là `acc -= dt`, không phải `step(dt)` — đổi nó thành `acc = 0` là có một server trôi chậm dần mà không metric nào kêu.
- **Số tick ≠ số sim step.** Vòng lặp quay bao nhiêu lần là chuyện của OS; simulation chạy bao nhiêu bước là chuyện của đồng hồ. Đo thật: **41 vòng lặp sinh 177 bước** ở tải 20 triệu entity.
- Đẳng thức `(ticks − rỗng) + bù = sim steps` khớp ở cả ba lần chạy — 1200, 347, 177. `catch-up = tick rỗng` không do code ép, do đại số ép.
- **Nhịp gửi snapshot phải đếm theo sim step**, không theo vòng lặp. Đếm nhầm thì snapshot rate dao động theo jitter của OS, và triệu chứng chỉ lộ ra ở client, chỉ khi server bận.
- Spiral of death có **điều kiện chính xác**: `T/dt > 1`, với `T` là chi phí thật một bước. Cú khựng chỉ tạo nợ ban đầu; thứ giết server là tỉ số này — đo được **8,4** ở tải 20 triệu entity, kèm `wake lateness` p50 **1,763 giây**.
- `MaxCatchUp = 5` là **quyết định có ý thức**: chấp nhận thế giới nhảy cóc để vòng lặp luôn thoát ra trong thời gian hữu hạn. Lựa chọn ngược lại cho ra server chết, và server chết thì **tất cả cùng mất trận**.
- `MaxCatchUp × dt` là **ngưỡng tha thứ** — 83,3 ms ở 60 Hz. Tham số thiết kế, không phải hằng số ma thuật: đổi tick rate mà giữ nguyên `MaxCatchUp` là vô tình đổi luôn ngưỡng đó.
- `dropped = max(0, floor(stall/dt) − MaxCatchUp)` **dự đoán đúng cả 5 mốc đo** (60→0, 80→0, 100→1, 150→4, 300→13), kiểm chéo được bằng `sim steps = 360 − dropped`. Giá của mốc 300 ms: **216,7 ms** bị vứt = 1,08 m ở tốc độ 5 m/s, hoặc 21,7 m với viên đạn 100 m/s.

→ **Bài 7 — Đồng hồ & scheduling**: accumulator giữ đúng thời gian mô phỏng. Nhưng ai giữ đúng thời điểm tỉnh dậy — và vì sao cách sai lại báo cáo metric đẹp hơn?
