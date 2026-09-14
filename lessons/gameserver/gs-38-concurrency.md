# Bài 38 — Concurrency đúng cách trong game server

## 1. Mục tiêu

Sau bài này bạn có thể:

- Nói ra **ngưỡng hoà vốn** của việc song song hoá một vòng lặp: dưới bao nhiêu đơn vị công việc thì chia cho 10 goroutine làm hệ **chậm đi**, và chậm đi bao nhiêu lần.
- Định giá từng nguyên thuỷ đồng bộ (`go`, `WaitGroup`, channel, atomic, mutex) bằng ns/op, rồi dùng nó để **dự đoán trước** một chỗ có đáng song song hoá không, trước khi viết code.
- Xếp mọi công việc của một game node vào ba nhóm — **bắt buộc tuần tự / song song được / song song có lãi** — và giải thích cái nào rơi vào nhóm nào bằng số, không bằng cảm giác.
- Nhận ra **false sharing** từ triệu chứng "thêm core mà chậm hơn", và sửa nó bằng padding.
- Chỉ ra vì sao **tăng GOMAXPROCS không cải thiện thông lượng** của một hệ đã đủ nhanh, và vì sao chỉ số duy nhất đáng nhìn là lateness.
- Tính được **pipeline cộng bao nhiêu ms** vào ngân sách 182 ms của bài 8, và quyết định được khi nào cái giá đó đáng trả.

---

## 2. Triệu chứng

Một team có server chạy ổn: mỗi room mô phỏng 1.000 entity, 60 Hz, mọi thứ trong một goroutine đúng như bài 28 dựng. Rồi ai đó mở Activity Monitor và thấy tiến trình dùng chưa tới một core trên máy 10 core.

Kết luận nghe rất hợp lý: *đang phí 9 core.* Họ chia vòng lặp `for i := range entities` cho một worker pool 10 goroutine — pool bền vững, không spawn lại mỗi tick, chia chunk đều, `sync.WaitGroup` chờ xong. Code đúng, race detector im lặng, kết quả mô phỏng giống hệt bản cũ.

Server chạy **chậm hơn**. Đo lại một bước sim, cùng máy, cùng dữ liệu:

| Số entity trong room | 1 goroutine | 10 goroutine | Kết quả |
|---|---|---|---|
| 100 | **91,74 ns** | 1.712 ns | chậm **18,66 ×** |
| 1.000 | **961,7 ns** | 2.777 ns | chậm **2,89 ×** |

*(Apple M4 10 core, go1.26.5, `-benchtime=300ms`; toàn bộ số trong bài đo trên cùng máy này.)*

Không có bug. Không có contention. Không có mutex nào. Mười core rảnh, và việc chia cho chúng làm bước sim của một room 1.000 entity **đắt lên gần ba lần**.

---

## ⏸ Dừng lại — đoán trước #1

Song song hoá không phải lúc nào cũng lỗ — ở một cỡ N nào đó nó bắt đầu có lãi. Với đúng vòng lặp trên, chia cho 10 goroutine trên 10 core:

**N phải lớn tới đâu thì bản song song mới bắt kịp bản tuần tự?**

```
(a) N ≈ 300     — chỉ cần công việc lớn hơn một lần chuyển ngữ cảnh
(b) N ≈ 1.500   — cỡ một room đông người
(c) N ≈ 6.500   — lớn hơn một room bình thường rất nhiều
(d) Không bao giờ — chia nhỏ vòng lặp này luôn lỗ
```

---

## 3. Lý thuyết

### 3.1 Ngưỡng hoà vốn, đo chứ không đoán

Đáp án là **(c)**. Quét N từ 100 tới 1.000.000, cùng một hàm `StepRange(lo, hi)`:

| N | 1 goroutine | K=2 | K=4 | K=10 | Tăng tốc tốt nhất |
|---|---|---|---|---|---|
| 100 | **91,74 ns** | 596,4 | 986,7 | 1.712 | **0,15 ×** (lỗ) |
| 1.000 | **961,7 ns** | 2.047 | 2.242 | 2.777 | **0,47 ×** (lỗ) |
| 6.000 | **5.773 ns** | — | — | 5.960 | **0,97 ×** (lỗ) |
| 7.000 | 6.560 ns | — | — | **5.836** | **1,12 ×** |
| 10.000 | 10.220 ns | 11.521 | 9.823 | **8.517** | 1,20 × |
| 100.000 | 100.189 ns | 58.581 | 58.846 | **44.166** | 2,27 × |
| 1.000.000 | 900.083 ns | 482.481 | 342.712 | **279.763** | **3,22 ×** |

*(Trung vị 3 lần chạy; các lần chênh nhau dưới 2 % ở mọi ô trừ N=100 nơi chênh tới 8 %.)*

Ba điều đọc ra, mỗi điều đáng nhớ riêng.

**Điểm hoà vốn nằm giữa 6.000 và 7.000 entity.** Ở N=6.000 bản song song còn chậm hơn 3,2 %; ở N=7.000 nó nhanh hơn 11,0 %. Lấy tròn: **≈ 6.500**. Một room 100 người với 10 entity mỗi người là 1.000 entity — **thấp hơn ngưỡng 6,5 lần**. Kích thước room thật nằm ở phía *lỗ* của bảng, không phải phía lãi.

**Trần tăng tốc là 3,22 ×, không phải 10 ×.** Ngay ở một triệu entity, nơi chi phí đồng bộ đã tan biến thành nhiễu, 10 core chỉ cho 3,22 lần. Vòng lặp này đọc–ghi 16 byte mỗi entity và làm 5 phép float; nó **nghẽn ở băng thông bộ nhớ**, không ở ALU. Thêm core không thêm băng thông. Đây là trần vật lý, không phải lỗi code.

**Lỗ càng nặng khi công việc càng nhỏ.** N=100 với K=10 chậm 18,66 lần. Chi phí đồng bộ gần như là hằng số, còn công việc thì tỉ lệ với N — nên tỉ số hai bên nổ tung về phía N nhỏ.

<svg viewBox="0 0 700 240" role="img" aria-labelledby="gs38-a-t gs38-a-d" style="width:100%;height:auto">
<title id="gs38-a-t">Tỉ số thời gian song song / tuần tự theo số entity</title>
<desc id="gs38-a-d">Đường cong đi xuống cắt mức hoà vốn 1,0 ở khoảng 6.500 entity: dưới ngưỡng đó bản 10 goroutine chậm hơn bản một goroutine, trên ngưỡng đó nhanh hơn, tiến dần tới 0,31 ở một triệu entity.</desc>
<line x1="50" y1="130" x2="660" y2="130" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5" stroke-dasharray="5 4"/>
<text x="50" y="123" font-size="11" fill="currentColor">hoà vốn = 1,0</text>
<rect x="50" y="20" width="610" height="110" fill="#ef4444" fill-opacity="0.07"/>
<rect x="50" y="130" width="610" height="70" fill="#84cc16" fill-opacity="0.09"/>
<text x="655" y="38" text-anchor="end" font-size="11" fill="currentColor">song song CHẬM hơn</text>
<text x="655" y="194" text-anchor="end" font-size="11" fill="currentColor">song song NHANH hơn</text>
<polyline points="70,41 180,98 290,130 370,136 480,155 600,166" fill="none" stroke="#3b82f6" stroke-width="2.5"/>
<circle cx="70" cy="41" r="4" fill="#ef4444"/>
<circle cx="180" cy="98" r="4" fill="#ef4444"/>
<circle cx="290" cy="130" r="4" fill="#f59e0b"/>
<circle cx="370" cy="136" r="4" fill="#84cc16"/>
<circle cx="480" cy="155" r="4" fill="#84cc16"/>
<circle cx="600" cy="166" r="4" fill="#84cc16"/>
<text x="70" y="32" text-anchor="middle" font-size="11" fill="currentColor">18,66</text>
<text x="180" y="89" text-anchor="middle" font-size="11" fill="currentColor">2,89</text>
<text x="290" y="120" text-anchor="middle" font-size="11" fill="currentColor">1,00</text>
<text x="370" y="152" text-anchor="middle" font-size="11" fill="currentColor">0,83</text>
<text x="480" y="171" text-anchor="middle" font-size="11" fill="currentColor">0,44</text>
<text x="600" y="182" text-anchor="middle" font-size="11" fill="currentColor">0,31</text>
<text x="70" y="220" text-anchor="middle" font-size="11" fill="currentColor">100</text>
<text x="180" y="220" text-anchor="middle" font-size="11" fill="currentColor">1.000</text>
<text x="290" y="220" text-anchor="middle" font-size="11" fill="currentColor">6.500</text>
<text x="370" y="220" text-anchor="middle" font-size="11" fill="currentColor">10.000</text>
<text x="480" y="220" text-anchor="middle" font-size="11" fill="currentColor">100.000</text>
<text x="600" y="220" text-anchor="middle" font-size="11" fill="currentColor">1.000.000</text>
<text x="355" y="236" text-anchor="middle" font-size="11" fill="currentColor">số entity trong một bước sim (trục không tuyến tính)</text>
</svg>

### 3.2 Hoá đơn đồng bộ — cái gì đắt và đắt bao nhiêu

Ngưỡng 6.500 không phải hằng số vũ trụ; nó là thương của hai đại lượng đo được. Đo riêng phần đồng bộ, cho worker pool chạy chunk **rỗng** để chỉ còn lại chi phí điều phối:

| Thao tác | ns/op | Ghi chú |
|---|---|---|
| `x += 3` trên biến thường | **1,238** | mốc so sánh |
| `atomic.AddInt64` | **1,649** | +33,2 % so với cộng thường, không tranh chấp |
| `mu.Lock/Unlock`, 0 tranh chấp | **1,921** | khớp 1,91 ns của bài 28 |
| `mu.Lock/Unlock`, **10 goroutine tranh** | **57,60** | **30,0 ×** bản không tranh chấp |
| channel round-trip (gửi + nhận lại) | **164,5** | hai lần bàn giao goroutine |
| `go func()` + chờ nó đóng channel | **206,4** | tạo goroutine mới mỗi lần |
| fan-out/fan-in, pool bền vững, **K=2** | **364,9** | công việc rỗng |
| fan-out/fan-in, pool bền vững, **K=4** | **630,4** | |
| fan-out/fan-in, pool bền vững, **K=10** | **1.285** | |
| `go` × 10 + `WaitGroup`, spawn lại mỗi lần | **1.623** | pool bền vững tiết kiệm 20,8 % |

Bốn kết luận nằm sẵn trong bảng:

1. **Chi phí fan-out tăng gần tuyến tính theo K**: 364,9 → 630,4 → 1.285 ns cho K = 2, 4, 10. Mỗi worker phải được **đánh thức**, và đánh thức là việc của scheduler chứ không phải của bạn.
2. **Pool bền vững chỉ tiết kiệm 20,8 %** so với spawn goroutine mới mỗi tick (1.285 so với 1.623). Người ta hay tưởng pool là tối ưu lớn; nó không phải. Cái đắt là *đánh thức*, không phải *tạo*.
3. **atomic gần như miễn phí khi không tranh chấp** — 1,649 ns. Dùng nó cho counter metric của bài 36 thoải mái.
4. **Mutex đắt lên 30 lần ngay khi có tranh chấp thật.** Con số 1,92 ns của bài 28 là trường hợp tốt nhất và bạn hiếm khi ở đó.

Từ đây rút ra quy tắc bỏ túi, kiểm chứng ngược lại được với bảng 3.1:

> **Khối công việc tuần tự phải lớn hơn chi phí fan-out khoảng 5 lần thì chia cho 10 goroutine mới hoà vốn.**
> Kiểm: `6.500 entity × 0,96 ns = 6.240 ns`, chia cho `1.285 ns` fan-out = **4,86 lần**.

Quy tắc này dùng được *trước khi viết code*: đo đoạn tuần tự bằng một bench 5 dòng, chia cho 1.285 ns, nếu thương nhỏ hơn 5 thì đóng editor lại.

### 3.3 Cái gì bắt buộc tuần tự, cái gì không

Bài 28 đã chốt: simulation phải chạy trong một goroutine, vì determinism (chương 3) và vì mutex không mua được gì. Bài này không mở lại vụ đó. Câu hỏi ở đây khác hẳn: **một game node làm rất nhiều việc, và simulation chỉ là một trong số đó.** Bài 33 đã cân đo và ra con số làm nhiều người ngạc nhiên — luật chơi chiếm **4,73 %** chi phí CPU, còn **95,27 %** là đóng gói byte để gửi đi.

Nghĩa là: cái phải tuần tự thì nhỏ, và **cái to thì không phải tuần tự**.

| Công việc | Song song được? | Vì sao |
|---|---|---|
| `sim.Step` — di chuyển, va chạm, sát thương | **Không** | thứ tự thực thi là một phần của kết quả; rollback bài 22 và replay bài 35 chết theo |
| Đọc socket, giải mã gói vào | **Có, đã rồi** | mỗi connection một reader goroutine (bài 28); kết quả đổ vào inbox, sim đọc theo thứ tự tick |
| Tính AOI — ai nhìn thấy ai | **Có** | chỉ **đọc** world; kết quả là một danh sách id, không đụng vào state |
| Dựng + lượng tử hoá snapshot (bài 24) | **Có** | đọc world, ghi vào buffer **riêng của từng player** — không có ô nhớ nào chung |
| Delta so với ack cuối (bài 25) | **Có** | baseline là dữ liệu riêng của từng connection |
| Nén, mã hoá, `conn.Write` | **Có, đã rồi** | mỗi connection một writer goroutine (bài 28) |
| Ghi log, đẩy metric, checkpoint (bài 31) | **Có** | không ai chờ kết quả trong tick này |
| Matchmaking, tải/lưu profile | **Có** | khác room, khác vòng đời hoàn toàn |

Đọc bảng theo chiều dọc thì thấy nguyên tắc: **thứ nào ghi vào world thì tuần tự; thứ nào chỉ đọc world và ghi ra chỗ riêng thì song song được.** Ranh giới không phải "nặng hay nhẹ", mà là **quyền ghi**.

Nhưng "song song được" chưa phải "song song có lãi" — mục 3.1 vừa cho thấy hai thứ đó cách nhau một ngưỡng 6.500. Nên phải đo tiếp.

---

## ⏸ Dừng lại — đoán trước #2

Bài 33 nói đóng gói chiếm 95,27 % CPU. Nó cũng là việc chỉ-đọc-world, ghi vào buffer riêng từng người — ứng viên hoàn hảo. Room **400 người**, dựng snapshot cho tất cả, tuần tự mất **37,78 µs**.

**Chia cho 10 goroutine trên 10 core được bao nhiêu?**

```
(a) ~4,2 µs   — gần tuyến tính, vì các buffer hoàn toàn độc lập
(b) ~9,5 µs   — mất một phần cho fan-out nhưng vẫn lãi to
(c) ~25,4 µs  — chỉ nhanh hơn 1,49 lần
(d) ~45 µs    — vẫn lỗ, y như vòng lặp sim
```

---

### 3.4 Song song hoá đóng gói — chỗ lãi nhất, và nó lãi ít hơn bạn nghĩ

Đáp án **(c)**. Và điều bất ngờ hơn nằm ở cột bên cạnh: **K=4 thắng K=10**.

| Số player trong room | Tuần tự | K=2 | K=4 | K=10 | Tốt nhất |
|---|---|---|---|---|---|
| 20 | **1.775 ns** | 3.048 | 2.809 | 2.850 | tuần tự (song song lỗ 1,58 ×) |
| 100 | 9.182 ns | 10.718 | 8.029 | **7.326** | **1,25 ×** |
| 400 | 37.780 ns | 26.331 | **22.042** | 25.376 | **1,72 ×** với K=4 |

*(Mỗi player nhìn thấy 50 entity, mỗi entity đóng thành 11 byte: id, x, y, vx, vy lượng tử hoá 16 bit + hp. Trung vị 3 lần chạy.)*

Kiểm lại bằng quy tắc 3.2: `9.182 / 1.285 = 7,15` lần chi phí fan-out — vừa qua ngưỡng 5, và đúng là chỉ lãi mỏng (1,25 ×). `37.780 / 1.285 = 29,4` lần — lãi rõ hơn (1,72 ×). Còn `1.775 / 1.285 = 1,38` lần thì dưới ngưỡng, và đúng là lỗ. Quy tắc đứng vững ở một workload hoàn toàn khác với workload sinh ra nó.

**Vì sao K=4 nhanh hơn K=10?** Con chip này có **4 core hiệu năng và 6 core tiết kiệm điện** (`hw.perflevel0.logicalcpu = 4`, `hw.perflevel1.logicalcpu = 6`). "10 core" không phải mười thứ giống nhau. Khi chia đều 400 người cho 10 worker, mỗi worker nhận 40 người — và cả nhóm chỉ xong khi **worker chậm nhất** xong, tức một worker đang nằm trên core tiết kiệm điện. Chia cho 4 thì mỗi worker 100 người, và bốn worker nhiều khả năng nằm gọn trên bốn core hiệu năng.

> **Fan-out đồng đều là sai khi core không đồng đều.** Muốn dùng cả 10 core thì phải chia thành nhiều chunk nhỏ hơn số worker và cho worker tự bốc chunk tiếp theo khi rảnh (work stealing) — nhưng cái đó lại đẩy chi phí đồng bộ lên, và mục 3.1 vừa cho thấy chi phí đó là thứ ăn hết phần lãi.

Đặt 1,72 × cạnh 95,27 % của bài 33: đóng gói tụt từ 95,27 % xuống `95,27 / 1,72 = 55,39 %`, tổng hoá đơn còn `4,73 + 55,39 = 60,12 %` — tiết kiệm **39,9 %** CPU của cả game node. Đó là khoản lớn nhất bài này tìm được, và nó **không** nằm ở vòng lặp sim mà mọi người nhìn vào đầu tiên.

### 3.5 False sharing — thứ chỉ hiện ra khi đo

Hai goroutine, hai biến khác nhau, không mutex, không channel, không chia sẻ gì về mặt logic. Chỉ có điều hai biến nằm cạnh nhau trong một mảng, tức **cùng một cache line 64 byte**. CPU không đồng bộ theo biến, nó đồng bộ theo cache line: mỗi lần goroutine A ghi, bản sao line đó trong core của B bị vô hiệu hoá, và ngược lại.

```go
c := make([]int64, k)          // k biến, 8 byte mỗi cái -> cùng 1 line khi k <= 8

type padded struct {           // bản đã tách
    v int64
    _ [56]byte                 // đệm cho đủ 64 byte, mỗi biến một line riêng
}
```

Mỗi goroutine `i` làm 20 triệu lần `atomic.AddInt64` lên ô của **chính nó**:

| Số goroutine | Chung cache line | Có padding | Chậm hơn |
|---|---|---|---|
| 2 | 6,49 ns | 1,78 ns | **3,65 ×** |
| 4 | 36,20 ns | 2,44 ns | **14,84 ×** |
| 8 | **157,04 ns** | 3,69 ns | **42,56 ×** |

*(Thời gian tường chia cho 20 triệu; lấy lần nhanh nhất trong 3 lần để loại nhiễu nền.)*

Ba điều:

**Nó xấu đi theo số core, không tốt lên.** 2 → 8 goroutine làm mỗi thao tác đắt lên `157,04 / 6,49 = 24,2` lần. Đây chính là hình dạng của triệu chứng "thêm core mà chậm hơn", và nó không xuất hiện trong bất kỳ profile CPU nào — profile sẽ chỉ nói dòng `atomic.AddInt64` tốn nhiều thời gian, hoàn toàn không gợi ý vì sao.

**Padding rẻ tới mức không cần cân nhắc.** 56 byte đệm cho mỗi counter. Với 10 counter là 560 byte, đổi lấy 42,56 lần.

**Chỗ nó cắn trong game server** là đúng chỗ bạn hay đặt counter: mảng thống kê mỗi worker (`packedBytes[i]`, `ticksDone[i]`), mảng metric mỗi room, hoặc struct nhỏ đặt cạnh nhau trong một slice mà nhiều goroutine cùng ghi. Nếu mỗi worker chỉ ghi vào **biến cục bộ** trong hàm rồi cộng dồn một lần lúc kết thúc, vấn đề biến mất mà không cần padding — và đó là cách sửa nên chọn trước.

---

## ⏸ Dừng lại — đoán trước #3

Node chạy **800 room** cùng lúc, mỗi room sim 1.000 entity ở 60 Hz và dựng snapshot cho 100 người ở 20 Hz. Chạy 3 giây, đo hai thứ: **số tick hoàn thành** và **lateness** (tick tỉnh muộn bao nhiêu so với lịch).

**Đổi `GOMAXPROCS` từ 1 lên 10 thì cái gì đổi?**

```
(a) Số tick hoàn thành tăng khoảng 10 lần, lateness gần như không đổi
(b) Số tick không đổi, lateness p50 giảm mạnh, p99 giảm nhẹ
(c) Số tick không đổi, lateness p50 giảm nhẹ, p99 giảm mạnh
(d) Cả hai đều tệ đi vì scheduler phải điều phối nhiều core hơn
```

---

### 3.6 GOMAXPROCS: thông lượng không phải chỉ số của hệ có deadline

Đáp án **(c)**, và cái đáng học là **vì sao (a) sai**.

| GOMAXPROCS | Tick hoàn thành | lateness p50 | lateness p99 |
|---|---|---|---|
| 1 | 144.800 / 144.800 (**100 %**) | 2,316 ms | **37,065 ms** |
| 2 | 144.800 / 144.800 (100 %) | 1,715 ms | 15,825 ms |
| 4 | 144.800 / 144.800 (100 %) | 1,330 ms | 9,425 ms |
| 10 | 144.800 / 144.800 (100 %) | **1,417 ms** | **5,274 ms** |

*(Trung vị 5 lượt chạy xen kẽ nhau để san nhiễu nền; p99 lệch tới 3 lần giữa các lượt ở GOMAXPROCS 1–2, chỉ ổn định từ 4 trở lên.)*

**Cột thông lượng là một hàng số giống hệt nhau.** Kể cả trên **một** core, node vẫn hoàn thành đủ 144.800 tick. Việc thật sự phải làm mỗi giây là `800 × (60 × 0,96 µs + 20 × 9,18 µs) = 800 × 241,3 µs = 193 ms` — tức **19,3 %** của một core. Chưa bao giờ thiếu CPU. Chín core kia không giải quyết vấn đề gì thuộc loại "không kịp làm".

Cái chúng giải quyết là **xếp hàng**. Với một core, 800 goroutine cùng hết hạn ngủ trong một khoảnh khắc thì 799 cái phải chờ; p99 lên 37,065 ms, tức **2,22 tick** muộn. Với 10 core, hàng đợi chia mười, p99 xuống 5,274 ms — **giảm 7,03 lần** trong khi p50 chỉ giảm 1,63 lần. Thêm core mua **đuôi**, không mua **trung vị**, và không mua thông lượng nào cả.

> Đây là chỗ tư duy backend gãy lần nữa. Ở BE App, thêm core = thêm request/giây. Ở đây thêm core **không đổi một request nào** — nó chỉ đổi việc bạn có kịp giờ hay không. Bài 1 nói "chậm bằng hỏng"; bài này bổ sung: **thông lượng không phải chỉ số, lateness p99 mới là.**

Và nhiều core cũng không phải luôn tốt: mục 3.4 vừa cho một phản ví dụ đo được — K=10 thua K=4 vì 6 trong 10 core là core tiết kiệm điện. Một hệ có deadline bị chấm bằng **worker chậm nhất**, nên nó nhạy với sự **không đồng đều** giữa các core theo cách hệ thông lượng không hề nhạy.

### 3.7 Pipeline: mua thông lượng bằng đúng một tick độ trễ

Còn một cách "song song" nữa không phải chia vòng lặp: **xếp tầng**. Tick N chạy sim, trong khi tick N−1 đang được đóng gói và gửi.

<svg viewBox="0 0 700 210" role="img" aria-labelledby="gs38-b-t gs38-b-d" style="width:100%;height:auto">
<title id="gs38-b-t">Tuần tự so với pipeline hai tầng</title>
<desc id="gs38-b-d">Ở bản tuần tự, mô phỏng và đóng gói của cùng một tick nằm nối nhau trong một tick; ở bản pipeline, đóng gói của tick N chạy trong tick N cộng một, nên snapshot rời server muộn hơn đúng một tick.</desc>
<text x="10" y="26" font-size="11" fill="currentColor">tuần tự</text>
<line x1="90" y1="14" x2="90" y2="82" stroke="currentColor" stroke-opacity="0.3"/>
<line x1="280" y1="14" x2="280" y2="82" stroke="currentColor" stroke-opacity="0.3"/>
<line x1="470" y1="14" x2="470" y2="82" stroke="currentColor" stroke-opacity="0.3"/>
<line x1="660" y1="14" x2="660" y2="82" stroke="currentColor" stroke-opacity="0.3"/>
<rect x="92" y="18" width="30" height="22" rx="4" fill="#3b82f6" fill-opacity="0.35"/>
<text x="107" y="33" text-anchor="middle" font-size="10" fill="currentColor">sim</text>
<rect x="124" y="18" width="90" height="22" rx="4" fill="#f59e0b" fill-opacity="0.35"/>
<text x="169" y="33" text-anchor="middle" font-size="10" fill="currentColor">đóng gói N</text>
<text x="220" y="55" font-size="10" fill="currentColor">snapshot N rời server ở đây</text>
<line x1="214" y1="40" x2="214" y2="50" stroke="#84cc16" stroke-width="2"/>
<rect x="282" y="18" width="30" height="22" rx="4" fill="#3b82f6" fill-opacity="0.35"/>
<rect x="314" y="18" width="90" height="22" rx="4" fill="#f59e0b" fill-opacity="0.35"/>
<text x="107" y="98" text-anchor="middle" font-size="11" fill="currentColor">tick N</text>
<text x="297" y="98" text-anchor="middle" font-size="11" fill="currentColor">tick N+1</text>
<text x="487" y="98" text-anchor="middle" font-size="11" fill="currentColor">tick N+2</text>
<text x="10" y="136" font-size="11" fill="currentColor">pipeline</text>
<line x1="90" y1="118" x2="90" y2="186" stroke="currentColor" stroke-opacity="0.3"/>
<line x1="280" y1="118" x2="280" y2="186" stroke="currentColor" stroke-opacity="0.3"/>
<line x1="470" y1="118" x2="470" y2="186" stroke="currentColor" stroke-opacity="0.3"/>
<line x1="660" y1="118" x2="660" y2="186" stroke="currentColor" stroke-opacity="0.3"/>
<rect x="92" y="122" width="30" height="22" rx="4" fill="#3b82f6" fill-opacity="0.35"/>
<text x="107" y="137" text-anchor="middle" font-size="10" fill="currentColor">sim</text>
<rect x="282" y="122" width="30" height="22" rx="4" fill="#3b82f6" fill-opacity="0.35"/>
<rect x="282" y="150" width="90" height="22" rx="4" fill="#f59e0b" fill-opacity="0.35"/>
<text x="327" y="165" text-anchor="middle" font-size="10" fill="currentColor">đóng gói N</text>
<rect x="472" y="122" width="30" height="22" rx="4" fill="#3b82f6" fill-opacity="0.35"/>
<rect x="472" y="150" width="90" height="22" rx="4" fill="#f59e0b" fill-opacity="0.35"/>
<line x1="372" y1="172" x2="372" y2="182" stroke="#ef4444" stroke-width="2"/>
<text x="378" y="182" font-size="10" fill="currentColor">snapshot N rời server muộn hơn 16,67 ms</text>
</svg>

Cái giá thì tính được ngay, và nó là một khoản cố định. Ngân sách bấm nút tới nhìn thấy của bài 8 là **182 ms**; pipeline chèn thêm đúng một tick 60 Hz:

```
182 + 16,67 = 198,67 ms      → tăng 16,67 / 182 = 9,16 %
```

Bây giờ tính cái nó mua. Room 400 người, mỗi tick sim 0,96 µs, đóng gói 37,78 µs:

| Phương án | Đường tới hạn của tick | Cắt được | Cộng vào ngân sách |
|---|---|---|---|
| Tuần tự | 0,96 + 37,78 = **38,74 µs** | — | 0 ms |
| **Pipeline** hai tầng | max(0,96 ; 37,78) = **37,78 µs** | **2,48 %** | **+16,67 ms** |
| **Đóng gói song song K=4** | 0,96 + 22,04 = **23,00 µs** | **40,62 %** | **0 ms** |

Pipeline mua 2,48 % và tính giá 9,16 % ngân sách độ trễ. Song song hoá đóng gói mua 40,62 % và **miễn phí về độ trễ**. Không có tình huống nào ở cỡ này mà chọn pipeline là đúng.

Điều kiện để pipeline thật sự có lãi viết được thành một bất đẳng thức: nó chỉ đáng khi **riêng tầng đóng gói đã không lọt vào một tick**, tức `pack > 16,67 ms − 0,96 µs`. Ở nhịp 94,45 ns mỗi player-snapshot đo được:

```
16.669 µs / 0,09445 µs = 176.485 player trong MỘT room
```

Một room 176.485 người không tồn tại; nếu bạn tiến gần tới đó thì vấn đề của bạn là sharding (bài 32), không phải pipeline. Kết luận thẳng:

> **Trong một room, pipeline hai tầng ở mức tick là lời giải cho một bài toán bạn không có.** Cái pipeline duy nhất bạn cần đã nằm sẵn trong mô hình bài 28: sim đẩy snapshot vào outbox rồi đi tiếp, writer goroutine lo `Write()`. Nó là pipeline nhưng **không cộng tick nào**, vì bàn giao xảy ra bên trong cùng một tick.

### 3.8 Đo cái gì để biết mình đúng

Ba thứ, mỗi thứ bắt một loại lỗi khác nhau, và cả ba đều **không** nhìn thấy được trong profile CPU.

**Số goroutine theo thời gian** — `runtime.NumGoroutine()` mỗi 10 giây, vẽ cùng biểu đồ với số room đang mở. Đi lên đơn điệu trong khi số room đi ngang là leak (bài 28 đã tính: rò 1 goroutine mỗi kết nối, 100 kết nối/phút thì 3 giờ 20 phút là sập). Với bài này nó còn bắt một lỗi nữa: **pool sinh sôi** — mỗi room tự tạo pool 10 worker của riêng nó, 800 room thành 8.000 worker goroutine cho một máy 10 core.

**Block profile** — `go test -blockprofile`, hoặc `runtime.SetBlockProfileRate(n)` trong production. Chạy trên bản song song hoá N=2.000 (dưới ngưỡng hoà vốn):

```
1.640,33 ms  67,02%  runtime.chanrecv2        <- worker ngồi chờ job, vô hại
  590,06 ms  24,11%  runtime.chanrecv1
  216,33 ms   8,84%  sync.(*WaitGroup).Wait   <- goroutine sim ĐỨNG IM
```

Đọc bảng này sai là chuyện thường: 91,13 % thời gian chặn nằm ở worker đang rảnh, và đó là **bình thường** — worker không chờ thì mới lạ. Chỉ có dòng cuối nằm trên đường tới hạn của tick. Quy nó về mỗi bước sim: `216,33 ms / 43.129 lần = 5.016 ns`, trên tổng `5.484 ns/op` đo cùng lượt chạy — **91,46 % thời gian của một bước sim "song song" là goroutine chính đứng chờ người khác.** (Bật block profile làm bench chậm đi từ 3.629 lên 5.484 ns/op, nên đọc tỉ lệ chứ đừng đọc con số tuyệt đối.)

**Mutex profile** — `-mutexprofile` / `runtime.SetMutexProfileFraction(n)`. Trên bench mutex tranh chấp:

```
14,06 s  92,68%  sync.(*Mutex).Unlock
```

Bench đó chỉ chạy **0,321 giây** thời gian tường. Tổng delay **15,17 s** là **47,3 lần** wall clock, vì nó cộng dồn thời gian chờ của mọi goroutine. Đừng hoảng vì con số tuyệt đối — thứ đáng hành động là **tên hàm đứng đầu bảng** và tỉ lệ giữa các dòng.

> Cả ba profile này rẻ tới mức bật thường trực được ở tỉ lệ lấy mẫu thấp (`SetBlockProfileRate(10000)` ~ 1 mẫu mỗi 10 µs bị chặn). Bật sẵn thì lúc sự cố xảy ra bạn có dữ liệu; bật sau thì bạn có một sự cố đã qua.

---

## 4. Bảng quyết định

Gộp mọi thứ đo được thành một quy trình bốn bước. Trả lời theo thứ tự, dừng ở dòng nào ra "không" thì dừng hẳn.

| Bước | Câu hỏi | Ngưỡng đo được | Không đạt thì |
|---|---|---|---|
| 1 | Đoạn này có **ghi** vào world không? | ghi → tuần tự, hết | bài 28: chuyển sang gửi lệnh qua inbox |
| 2 | Đoạn tuần tự tốn bao nhiêu? | phải `> 5 × 1.285 ns ≈ 6,4 µs` | dưới ngưỡng → để nguyên, song song hoá sẽ **chậm hơn tới 18,66 ×** |
| 3 | Các worker có ghi vào ô nhớ gần nhau không? | cùng cache line → **tới 42,56 ×** phạt | dồn vào biến cục bộ, hoặc padding 56 byte |
| 4 | K bao nhiêu? | thử K = số **core hiệu năng** trước, không phải `NumCPU()` | K=10 thua K=4 ở workload 400 player |

Và ba thứ **không** phải câu trả lời, mỗi thứ kèm số:

- **Tăng GOMAXPROCS** — thông lượng không đổi một tick nào (144.800/144.800 ở cả 1 và 10 core).
- **Pipeline mức tick** — cộng 16,67 ms vào 182 ms để cắt 2,48 %, trong khi song song hoá đúng chỗ cắt 40,62 % miễn phí.
- **Song song hoá vòng lặp sim** — trần 3,22 × ở một triệu entity, và room thật thì nhỏ hơn ngưỡng hoà vốn 6,5 lần.

---

## 5. Tính tay

**Bài 1.** Một room có 2.500 entity. Bạn muốn song song hoá bước sim. Dùng ngưỡng ở 3.2 (`0,96 ns/entity`, fan-out K=10 tốn `1.285 ns`), tính tỉ số "công việc / chi phí fan-out" rồi kết luận. Sau đó tính xem cần bao nhiêu room như vậy gộp vào **một** bước sim chung thì mới vượt ngưỡng.

**Bài 2.** Node của bạn chạy 300 room, mỗi room 250 người, snapshot 20 Hz. Dùng `94,45 ns` cho mỗi player-snapshot: tính CPU mỗi giây node tiêu cho riêng việc đóng gói, quy ra bao nhiêu core. Rồi tính lại nếu áp dụng tăng tốc `1,72 ×` của K=4 — tiết kiệm được bao nhiêu core?

**Bài 3.** Ngân sách 182 ms của bài 8 có mục "buffer nội suy 100 ms". Giả sử bạn đã cắt nó xuống 50 ms (khoản `−50 ms, không tốn gì`). Bây giờ có người đề xuất pipeline, cộng 16,67 ms. Tính phần trăm mà 16,67 ms chiếm trong ngân sách **mới**, so với 9,16 % trong ngân sách cũ. Rút ra một mệnh đề về thứ tự làm việc: nên cắt ngân sách trước hay thêm pipeline trước?

---

## 6. Chuyển giao

Bạn nhận một game node đang chạy thật. Nó phục vụ 120 room, mỗi room 30 người, và p99 lateness là 14 ms trên một tick 16,67 ms — chưa vỡ nhưng không còn chỗ thở. CPU tổng: 22 %.

Người tiền nhiệm để lại hai patch chưa merge. Patch A: song song hoá `sim.Step` cho mỗi room bằng pool 10 worker. Patch B: gom việc dựng snapshot của **mọi room trên node** vào một pool 4 worker dùng chung, chạy sau khi tất cả room đã sim xong tick đó.

Câu hỏi bạn phải trả lời trước khi chạm vào code: patch nào có thể làm p99 **xấu đi**, và bằng con số nào trong bài? Patch còn lại có làm p99 tốt lên không, hay nó chỉ cắt CPU trong khi p99 do một nguyên nhân khác gây ra — và nếu vậy thì nguyên nhân khác đó là gì, biết rằng CPU chỉ 22 %?

Rồi tới câu không có đáp án trong bài. Patch B gom snapshot của mọi room vào một pool dùng chung, nghĩa là room thứ 120 phải chờ 119 room kia được xếp lịch xong. Nếu một room bỗng nặng gấp mười (boss spawn 300 quái), pool dùng chung biến sự cố của **một** room thành lateness của **cả node** — trong khi mô hình một-goroutine-mỗi-room của bài 28 cô lập được nó. Vậy: có cách nào giữ được khoản tiết kiệm 39,9 % CPU của việc song song hoá đóng gói mà **không** tạo ra điểm đồng bộ toàn node? Nếu có, cái giá của nó trả bằng gì — thêm goroutine, thêm bộ nhớ, hay thêm độ trễ?

---

## 7. Tóm tắt

- Ngưỡng hoà vốn của việc chia một vòng lặp sim cho 10 goroutine là **≈ 6.500 entity**. Room thật (1.000 entity) nằm dưới ngưỡng đó và bị **chậm 2,89 ×**; 100 entity thì chậm **18,66 ×**.
- Quy tắc dự đoán trước khi viết code: **công việc tuần tự phải lớn hơn chi phí fan-out (1.285 ns cho K=10) khoảng 5 lần**. Đã kiểm đúng trên cả workload sim lẫn workload đóng gói.
- Trần tăng tốc của vòng lặp sim là **3,22 ×** trên 10 core ở một triệu entity — nghẽn băng thông bộ nhớ, không phải nghẽn code.
- Ranh giới song song hoá không phải "nặng hay nhẹ" mà là **quyền ghi**: ghi vào world → tuần tự; chỉ đọc world, ghi ra buffer riêng → song song được.
- Chỗ lãi nhất là **đóng gói snapshot** (95,27 % hoá đơn theo bài 33): 400 người, **1,72 ×** với K=4, cắt **39,9 %** CPU của cả node, không tốn ms độ trễ nào.
- **K = 4 thắng K = 10** trên chip 4 core hiệu năng + 6 core tiết kiệm điện, vì nhóm chỉ xong khi worker chậm nhất xong.
- **False sharing** phạt tới **42,56 ×** với 8 goroutine ghi vào cùng cache line; padding 56 byte mỗi biến xoá sạch.
- Tăng GOMAXPROCS 1 → 10 **không đổi thông lượng** (144.800/144.800 ở cả hai) nhưng cắt lateness p99 **7,03 lần**. Hệ có deadline được chấm bằng p99, không bằng số tick.
- **Pipeline mức tick cộng 16,67 ms = 9,16 %** ngân sách 182 ms để cắt 2,48 % — thua song song hoá đóng gói (40,62 %, 0 ms) mọi mặt. Nó chỉ có lãi từ **176.485 người trong một room** trở lên, tức không bao giờ.
- Block profile của bản song song hoá dưới ngưỡng: **91,46 %** thời gian một bước sim là goroutine chính đứng chờ worker. Mutex profile cộng dồn nhiều goroutine nên delay có thể gấp **47,3 lần** wall clock — đọc thứ hạng, đừng đọc số tuyệt đối.

→ **Bài 39 — Load test bằng bot client headless**: đã tối ưu từng chỗ. Bài sau hỏi câu bạn không tự trả lời được trên máy dev: một node thật sự chịu được bao nhiêu người, và cái gì gãy trước.
