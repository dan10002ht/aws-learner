# Bài 28 — Room model & concurrency

## 1. Mục tiêu

Sau bài này bạn có thể:

- Dựng **mô hình ba loại goroutine** cho một room, và giải thích vì sao đúng ba loại chứ không phải hai hay bốn.
- **Bắt data race bằng `go run -race`**, đọc output của nó, và nói rõ vì sao race không crash nguy hiểm hơn race làm crash.
- Bảo vệ quyết định **simulation single-threaded** bằng hai lập luận độc lập: determinism, và "mutex không mua được song song".
- **Định giá channel bằng số đo được**, quy ra phần trăm ngân sách tick, và chọn chính sách **backpressure** cho writer.
- **Tính trần số room trên một node từ ba ràng buộc độc lập** — CPU, băng thông, scheduler — và nói được cái nào chạm trước ở cỡ trận nào.
- Phát hiện **goroutine leak** bằng một dòng code, chặn bằng `context`.

---

## 2. Triệu chứng

Server chạy 60 Hz, mỗi room một tiến trình logic, đã qua sáu chương tối ưu. Nó chạy đúng — gần như luôn luôn.

Rồi support gửi lên: *"tôi bị bắn 2 phát mà chết"*. Log không error. Replay ghi nhận đúng 2 phát. Chạy lại kịch bản đó 30 lần trên máy mình — đúng cả 30. Đóng ticket "không tái tạo được". Tuần sau nó lại tới, lần này là hồi máu: đứng ngoài giao tranh 10 giây mà HP không lên.

Rút gọn xuống thứ nhỏ nhất còn giữ hình dạng bug: 3 player, mỗi người nhận đúng 200 sát thương lẻ, simulation hồi đúng 200 máu. Kết quả bắt buộc là `[100 100 100]`.

```go
type World struct{ HP []int32 }              // HP[i] = máu của player i

// N goroutine reader: nhận input "trúng đạn" rồi GHI THẲNG vào world
go func(id int) { for i := 0; i < 200; i++ { w.HP[id] -= 1 } }(id)

// 1 goroutine simulation: mỗi tick hồi 1 máu cho mọi người
go func() { for t := 0; t < 200; t++ { for id := range w.HP { w.HP[id] += 1 } } }()
```

Chạy 200 lần *(Go 1.26.5, darwin/arm64, Apple M4, GOMAXPROCS=10)*:

```
107 / 200 lần cho [100 100 100]   — đúng
 93 / 200 lần cho thứ khác        — 46,5 %
```

Và những "thứ khác" đó là `[100 300 100]`, `[145 100 100]`, `[100 116 300]`, `[100 100 148]`, `[100 -3 100]`.

Không panic, không stack trace, exit code 0. `145` và `116` là những con số **hoàn toàn hợp lý cho một thanh máu** — không ai nhìn log mà thấy chúng sai. `-3` thì lộ, nhưng nó chỉ ra 1 lần trong 20.

---

## ⏸ Dừng lại — đoán trước #1

`w.HP[id] -= 1` là một dòng, `-=` trên `int32` là một phép toán. Bạn chọn cái nào?

```
(a) Bug nằm ở chỗ khác — một dòng gán int32 không thể sai
(b) Race thật, nhưng thêm mutex quanh W.HP là xong, và song song hoá vẫn giữ được
(c) Race thật, và nó là race vì `-=` không phải một thao tác mà là ba
(d) Race thật, nhưng vì 46,5 % lần sai nên chắc chắn test sẽ bắt được trước khi lên production
```

---

## 3. Lý thuyết

### 3.1 Race detector nói gì, và vì sao im lặng mới là tệ nhất

Đáp án là **(c)**, và không cần đoán — Go trả lời thẳng. Build lại với `-race`:

```
$ go run -race ./race
WARNING: DATA RACE
Read at 0x00c0000121a4 by goroutine 10:      main.main.func2()   main.go:36
Previous write at 0x00c0000121a4 by goroutine 7:  main.main.func1()   main.go:25
...
Found 1 data race(s)
exit status 66
```

Dòng 25 là `w.HP[id] -= 1` của reader, dòng 36 là `w.HP[id] += 1` của simulation, cùng địa chỉ `0x…21a4`.

`-=` biên dịch ra **ba lệnh máy**: nạp vào thanh ghi, trừ, ghi ngược ra. Hai goroutine chen vào giữa ba lệnh đó thì một bản ghi bị đè — **lost update**, đúng cái bạn biết ở tầng database, chỉ khác là không có transaction để cứu.

Chạy 20 lần với `-race`: **20/20 báo race**. Không `-race`: **107/200 cho kết quả đúng**. Toàn bộ vấn đề gói trong hai con số đó.

> Một race làm crash là một race **may mắn** — bạn có stack trace, có ticket, có bản vá. Một race không crash thì nó **âm thầm làm sai dữ liệu**, và cái sai đó đi thẳng vào snapshot gửi cho người chơi, vào replay, vào bản ghi persistence của bài 31. Bạn không sửa được thứ bạn không thấy.

Ba lý do nó không crash:

- **`int32` ghi nguyên tử về mặt phần cứng.** Store 4 byte căn chỉnh trên arm64/amd64 không ra giá trị nửa nạc nửa mỡ — bạn *mất* một update chứ không *được* một số rác. Với `string`/slice header/interface (2 word) thì khác: chỗ đó mới ra giá trị bất khả thi và crash.
- **Cửa sổ chen vào ≈ 1 ns**, hiếm ở một lần lặp — nhưng 60 tick/giây × 3.600 giây × số player thì production lặp đủ nhiều.
- **Máy dev êm hơn production**: ít contention, `GOMAXPROCS=1` giấu gần hết. Đây là lý do (d) sai — test *có thể* xanh 100 lần liên tiếp.

> **CI phải có một job `go test -race ./...`.** `-race` chậm 2–20 lần *(con số của tài liệu Go, không đo trong bài này)* nên không bật ở production, nhưng nó **không có false positive**: im lặng thì chưa chứng minh được gì (nó chỉ thấy đường chạy đã đi qua), còn kêu thì chắc chắn bạn có bug.

### 3.2 Bản đúng: ba loại goroutine, không phải hai, không phải bốn

Sửa bằng cách đổi *ai được chạm vào World*, không phải thêm khoá:

```go
type Input struct{ Player int; Damage int32 }

inbox := make(chan Input, 64)

go func() {                                   // goroutine SIMULATION — chủ sở hữu duy nhất
    w := &World{HP: []int32{100, 100, 100}}
    for t := 0; t < Iters; t++ {
        for drained := false; !drained; {     // drain inbox, KHÔNG chặn
            select {
            case in := <-inbox: w.HP[in.Player] -= in.Damage
            default:            drained = true
            }
        }
        step(w)                               // rồi mới step
    }
}()

// reader: parse rồi ĐẨY VÀO INBOX, không chạm World
go func(id int) { for i := 0; i < Iters; i++ { inbox <- Input{Player: id, Damage: 1} } }(id)
```

`go run -race`: không một dòng cảnh báo, exit 0. Chạy 20 lần: **20/20 lần ra `[100 100 100]`**.

Không phải vì channel "an toàn hơn", mà vì `w` giờ chỉ có **một** goroutine chạm vào — và một goroutine không race với chính nó. Channel chỉ là băng chuyền chuyển quyền sở hữu qua ranh giới đó. Mở rộng ra room thật thì có đúng ba loại goroutine:

<svg viewBox="0 0 720 300" role="img" aria-labelledby="gs28-a-t gs28-a-d" style="width:100%;height:auto">
<title id="gs28-a-t">Ba loại goroutine trong một room</title>
<desc id="gs28-a-d">Mỗi connection có một goroutine reader đọc socket và một goroutine writer ghi socket. Mọi reader đẩy input vào một inbox channel duy nhất. Một goroutine simulation sở hữu toàn bộ world state, đọc inbox và đẩy snapshot ra outbox riêng của từng writer.</desc>
<rect x="10" y="30" width="150" height="230" rx="8" fill="#3b82f6" fill-opacity="0.10" stroke="currentColor" stroke-opacity="0.25"/>
<text x="85" y="24" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">READER (1/conn)</text>
<rect x="22" y="48" width="126" height="34" rx="5" fill="#3b82f6" fill-opacity="0.28"/>
<text x="85" y="62" text-anchor="middle" font-size="10" fill="currentColor">conn 1: read socket</text>
<text x="85" y="75" text-anchor="middle" font-size="10" fill="currentColor">parse, validate</text>
<rect x="22" y="92" width="126" height="34" rx="5" fill="#3b82f6" fill-opacity="0.28"/>
<text x="85" y="113" text-anchor="middle" font-size="10" fill="currentColor">conn 2: read socket</text>
<text x="85" y="146" text-anchor="middle" font-size="14" fill="currentColor">...</text>
<rect x="22" y="160" width="126" height="34" rx="5" fill="#3b82f6" fill-opacity="0.28"/>
<text x="85" y="181" text-anchor="middle" font-size="10" fill="currentColor">conn N: read socket</text>
<text x="85" y="222" text-anchor="middle" font-size="10" font-style="italic" fill="currentColor">chặn ở read()</text>
<text x="85" y="238" text-anchor="middle" font-size="10" font-style="italic" fill="currentColor">0 % CPU khi im</text>
<line x1="160" y1="65" x2="215" y2="130" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<line x1="160" y1="109" x2="215" y2="135" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<line x1="160" y1="177" x2="215" y2="150" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<rect x="215" y="120" width="70" height="46" rx="5" fill="#f59e0b" fill-opacity="0.30"/>
<text x="250" y="139" text-anchor="middle" font-size="10" fill="currentColor">inbox</text>
<text x="250" y="152" text-anchor="middle" font-size="10" fill="currentColor">chan, buf 64</text>
<line x1="285" y1="143" x2="330" y2="143" stroke="currentColor" stroke-opacity="0.6" stroke-width="2"/>
<polygon points="330,143 322,139 322,147" fill="currentColor" fill-opacity="0.6"/>
<rect x="332" y="55" width="150" height="180" rx="8" fill="#84cc16" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/>
<text x="407" y="44" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">SIMULATION (1/room)</text>
<text x="407" y="80" text-anchor="middle" font-size="10" fill="currentColor">drain inbox</text>
<text x="407" y="98" text-anchor="middle" font-size="10" fill="currentColor">step(world, dt)</text>
<text x="407" y="116" text-anchor="middle" font-size="10" fill="currentColor">build snapshot</text>
<rect x="348" y="130" width="118" height="52" rx="5" fill="#84cc16" fill-opacity="0.30"/>
<text x="407" y="150" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">World state</text>
<text x="407" y="165" text-anchor="middle" font-size="10" fill="currentColor">KHÔNG chia sẻ</text>
<text x="407" y="177" text-anchor="middle" font-size="10" fill="currentColor">không mutex</text>
<text x="407" y="205" text-anchor="middle" font-size="10" font-style="italic" fill="currentColor">single-threaded</text>
<text x="407" y="221" text-anchor="middle" font-size="10" font-style="italic" fill="currentColor">tick 60 Hz</text>
<line x1="482" y1="143" x2="527" y2="143" stroke="currentColor" stroke-opacity="0.6" stroke-width="2"/>
<polygon points="527,143 519,139 519,147" fill="currentColor" fill-opacity="0.6"/>
<rect x="529" y="120" width="56" height="46" rx="5" fill="#f59e0b" fill-opacity="0.30"/>
<text x="557" y="139" text-anchor="middle" font-size="10" fill="currentColor">outbox</text>
<text x="557" y="152" text-anchor="middle" font-size="10" fill="currentColor">buf 1</text>
<rect x="600" y="30" width="112" height="230" rx="8" fill="#8b5cf6" fill-opacity="0.10" stroke="currentColor" stroke-opacity="0.25"/>
<text x="656" y="24" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">WRITER (1/conn)</text>
<rect x="610" y="48" width="92" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.28"/>
<text x="656" y="69" text-anchor="middle" font-size="10" fill="currentColor">conn 1: write</text>
<rect x="610" y="92" width="92" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.28"/>
<text x="656" y="113" text-anchor="middle" font-size="10" fill="currentColor">conn 2: write</text>
<text x="656" y="146" text-anchor="middle" font-size="14" fill="currentColor">...</text>
<rect x="610" y="160" width="92" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.28"/>
<text x="656" y="181" text-anchor="middle" font-size="10" fill="currentColor">conn N: write</text>
<text x="656" y="222" text-anchor="middle" font-size="10" font-style="italic" fill="currentColor">chặn được —</text>
<text x="656" y="238" text-anchor="middle" font-size="10" font-style="italic" fill="currentColor">xem mục 3.5</text>
<line x1="585" y1="140" x2="600" y2="70" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.2"/>
<line x1="585" y1="143" x2="600" y2="112" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.2"/>
<line x1="585" y1="150" x2="600" y2="178" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.2"/>
<text x="360" y="272" font-size="11" font-style="italic" fill="currentColor">Mọi mũi tên đi qua channel. Không mũi tên nào đi ngược vào World state.</text>
</svg>

**Không phải hai** (gộp reader với writer): đọc socket là lời gọi **chặn**, goroutine đang nằm trong `conn.Read()` không gửi snapshot được — client im 3 giây thì writer im 3 giây theo. Ép nó không chặn bằng deadline là tự viết lại event loop mà runtime đã làm sẵn.

**Không phải bốn** (thêm goroutine "tick" riêng): tick chính là vòng lặp của simulation (bài 5–7); tách ra thì cần thêm một channel để đánh thức sim, tức thêm một điểm đồng bộ và một điểm trễ, đổi lấy đúng con số không.

Room P player có **`1 + 2P` goroutine** — con số quyết định của mục 4.

### 3.3 Vì sao simulation phải single-threaded — hai lập luận độc lập

**Lập luận một — determinism.** Chương 3 dựng cả một chuỗi trên "cùng input, cùng thứ tự → cùng output": rollback bài 22, lockstep, replay verification bài 35. Cả ba chết nếu thứ tự thực thi trong một tick phụ thuộc vào scheduler hôm nay xếp lịch thế nào. Chia entity ra 8 worker thì thứ tự cập nhật thành ngẫu nhiên: va chạm A–B trước hay B–A trước cho hai kết quả lệch ở chữ số thứ 7 của float, và bài 10 đã đo — sai lệch float không tan đi, nó **nhân lên theo tick**.

**Lập luận hai — mutex không mua được gì.** Giả sử bạn không cần determinism: bọc `World` trong `sync.RWMutex`, cho 8 goroutine cùng chạy. Trong một tick, **bao nhiêu phần trăm thời gian có hơn một goroutine thật sự chạy?**

Gần như không. `step()` đọc *và ghi* trên hầu hết dữ liệu — vị trí, vận tốc, HP, cooldown — mà ghi thì phải `Lock()`, và `Lock()` là loại trừ. Bạn dựng đủ 8 luồng để 7 luồng xếp hàng chờ luồng thứ 8. Đúng cái bài 1 gọi tên, hạ xuống tầng goroutine.

Và mutex không miễn phí kể cả khi **không** ai tranh:

| Thao tác (bench Go, M4) | ns/op | So với gọi trực tiếp |
|---|---|---|
| `hp[i] -= 1` trong sim goroutine | **0,28** | 1 × |
| `mu.Lock(); hp[i] -= 1; mu.Unlock()` — 0 contention | **1,91** | **6,8 ×** |

*(`-benchtime=2s -count=3`; ba lần đo 1,906 / 1,908 / 1,910 ns.)*

6,8 lần cho trường hợp **tốt nhất**. Có contention thì nó là syscall futex và bậc độ lớn nhảy sang µs. Tổng lại:

> Song song hoá simulation **trả bằng determinism** để **mua một khoản tăng tốc gần bằng không**. Không có phương án thứ ba, và nhiều core hơn không tạo ra phương án thứ ba. Song song hoá có chỗ trong game server — nhưng ở *giữa các room*, không *trong* một room. Đó cũng là lý do mô hình này vẫn scale: node 10 core chạy nhiều room song song thoải mái, chỉ là mỗi room đơn luồng bên trong.

---

## ⏸ Dừng lại — đoán trước #2

Bạn vừa đổi từ "ghi thẳng vào state" sang "đẩy qua channel". Mọi input giờ đi qua một `chan Input` có buffer.

Một trận **100 player**, mỗi người gửi input **60 lần/giây**. Chi phí channel chiếm bao nhiêu phần trăm ngân sách **một tick 16,67 ms**?

```
(a) ~15 %   — channel là điểm đồng bộ, mỗi lần gửi là một lần chạm scheduler
(b) ~3 %    — đáng kể nhưng chấp nhận được, đây là cái giá của an toàn
(c) ~0,1 %  — nhỏ tới mức không cần nghĩ tới
(d) Không tính được — phụ thuộc hoàn toàn vào việc có bao nhiêu goroutine cùng gửi
```

---

### 3.4 Định giá channel — bằng bench, không bằng cảm giác

Đáp án gần **(c)** nhất, nhưng **(d) không sai** — và đó mới là phần đáng học. Bench trên cùng máy:

| Kịch bản | ns/op | Ghi chú |
|---|---|---|
| `chan` unbuffered, 1 producer + 1 consumer | **86,2** | mỗi lần gửi là một lần bàn giao goroutine |
| `chan` buffer 64, 1 producer + 1 consumer | **21,7** | producer không phải chờ consumer |
| `chan` buffer 64, **10** producer fan-in | **59,3** | tranh chấp trên cùng một hchan |
| `chan` buffer 64, **100** producer fan-in | **153,3** | 2,6 × so với 10 producer |

*(Trung vị 3 lần chạy `-benchtime=2s`; các lần chênh nhau dưới 5 %.)*

Ba điều đọc ra ngay: **buffer 0 → 64 là khoản lời lớn nhất** (86,2 → 21,7 ns, giảm **74,8 %**) vì unbuffered ép hai goroutine gặp nhau tại một điểm; **buffer 64 → 1024 không lời gì** (21,7 → 24,5) — buffer to mua chỗ chứa chứ không mua tốc độ, và mục 3.5 cho thấy chỗ chứa đó là *tiêu cực*; **fan-in mới là biến số**, đúng như (d) — 100 producer tốn 153,3 ns/op, gấp **7,1 lần** một producer.

Quy ra ngân sách tick, lấy con số xấu nhất (100 reader, 153,3 ns):

```
100 player × 60 Hz = 100 input mỗi tick → 100 × 153,3 ns = 15,33 µs
15,33 / 16.666,67 = 0,0920 % ngân sách một tick
```

Với 10 player (fan-in 10): `10 × 59,3 = 593 ns = 0,0036 %`.

Đối chiếu bài 8: `sim.Step` 1.000 entity tốn **1,18 µs = 0,007 %**. Ở trận 100 người, **chi phí channel lớn hơn chi phí mô phỏng 1.000 entity 13 lần** — cả hai cộng lại chưa tới 0,1 % một tick.

> **Đừng tối ưu channel trong một room.** Nó không nằm ở đâu gần đường tới hạn. Chỗ nó thật sự làm bạn đau không phải µs mỗi op, mà là hai thứ ở hai mục sau: nó **chặn** (3.5) và nó **giữ goroutine sống** (3.6).

### 3.5 Backpressure: chuyện gì xảy ra khi client đọc chậm

Client mạng kém, cửa sổ nhận đầy → `conn.Write()` chặn → writer đứng lại → outbox đầy dần → simulation gửi snapshot tiếp theo thì **nó** chặn nốt. **Một client tệ làm chậm cả room, gồm 99 người kia đang chơi bình thường.**

Đo thật: producer 20 Hz (nhịp snapshot bài 8), consumer 12 Hz, 10 giây, ba chính sách × ba cỡ buffer. "Tuổi" là tuổi snapshot **lúc client thật sự nhận được**:

| Chính sách | buffer | gửi được | client nhận | vứt | tuổi p50 | tuổi p99 |
|---|---|---|---|---|---|---|
| **buffer** (chặn khi đầy) | 1 | **125** | 124 | 0 | 167 ms | 168 ms |
| buffer | 64 | 185 | 121 | 0 | 2.033 ms | **4.000 ms** |
| **drop gói MỚI** | 1 | 200 | 119 | 80 | 66 ms | 84 ms |
| drop gói mới | 64 | 200 | 120 | 16 | 2.033 ms | 3.967 ms |
| **drop gói CŨ** | **1** | **200** | 120 | 79 | **33 ms** | **51 ms** |
| drop gói cũ | 8 | 200 | 119 | 73 | 367 ms | 401 ms |
| drop gói cũ | 64 | 200 | 120 | 16 | 2.034 ms | 3.200 ms |

Trong 10 giây ở 20 Hz, "gửi được" đúng phải là 200. Ba lát cắt:

**Buffer làm producer chậm lại, đúng nghĩa đen.** Dòng đầu chỉ gửi được **125/200** — writer bị kéo từ 20 Hz xuống **12,5 Hz**, đúng nhịp client chậm nhất. Nếu simulation gửi thẳng vào outbox thay vì qua writer riêng thì 12,5 Hz đó là **tick rate của cả room**.

**Buffer to là thứ tệ nhất trong bảng, bất kể chính sách.** Ở buffer 64 cả ba dòng đều cho tuổi p99 trên 3 giây, vì hàng đợi **FIFO** còn client rút từ đầu hàng — tức snapshot cũ nhất. Buffer 64 ở 20 Hz = client đang xem thế giới của `64 / 20 = 3,2` giây trước. Buffer không hấp thụ mất cân bằng tốc độ, **nó chuyển "mất gói" thành "nhận gói đã hỏng"**.

**Buffer 1 + drop gói cũ thắng cả hai chiều:** gửi đủ 200 *và* p50 **33 ms**, p99 **51 ms**. Nó vứt 79 snapshot, gần 40 % — và đó chính là lý do nó thắng. Nối bài 12:

> **Snapshot có hạn sử dụng.** Snapshot của 200 ms trước không phải "dữ liệu chậm", nó là **dữ liệu sai** — nó vẽ kẻ địch ở chỗ hắn đã rời khỏi, client nội suy (bài 20) trên điểm sai rồi giật ngược khi gói mới tới. Với dòng snapshot đầy đủ (bài 23), **gói mới luôn thay thế được gói cũ**, nên vứt gói cũ không mất thông tin nào cả.

Ba lựa chọn, mỗi cái một cái giá:

| Lựa chọn | Cái giá | Dùng khi |
|---|---|---|
| **Buffer**, chặn khi đầy | Backpressure lan ngược tới simulation; tuổi snapshot tăng tuyến tính theo cap | Kênh **reliable** bài 14 — message không thay thế nhau được |
| **Drop gói cũ**, cap = 1 | Nhận ít frame hơn, nhưng frame nào cũng tươi | **Dòng snapshot theo tick** (bài 23) — mặc định đúng |
| **Ngắt kết nối** | Người chơi bị đá khỏi trận | Outbox cap 1 vẫn đầy quá `3 × RTT` hoặc 5 giây — client không "chậm", nó **đã chết** |

Ngắt kết nối là **van cuối**, không phải thất bại của hai cái trên: thiếu nó thì socket zombie giữ goroutine, fd và slot trong trận vô thời hạn. Và kênh reliable với kênh snapshot là **hai channel, hai chính sách** trên cùng một connection — gộp chung là buộc phải chọn một chính sách sai cho một nửa lưu lượng.

### 3.6 Goroutine leak: rò mà không có dòng log nào

Goroutine chỉ chết khi hàm của nó `return`. Client rút dây mạng lúc 2 giờ sáng:

```go
outbox := make(chan []byte, 4)
go func() { for buf := range outbox { conn.Write(buf) } }()   // writer
go func() { readLoop(conn); /* socket chết -> thoát */ }()    // reader: quên đóng outbox
```

Reader thoát. Writer thì **không** — nó nằm trong `range outbox` mà không ai đóng `outbox`, tới khi tiến trình chết. Đo trực tiếp, 10.000 kết nối vào rồi ra, `runtime.GC()` hai đầu:

```
RÒ     10.000 kết nối vào-ra: goroutine 1 -> 10.001 (rò 10.000), heap 0,2 -> 8,5 MB
CHẶN   10.000 kết nối vào-ra: goroutine 10.001 -> 10.001 (rò 0),  heap 8,5 -> 8,6 MB
```

GC dọn không được: goroutine đang chờ channel vẫn là root sống, nên `outbox` và toàn bộ closure sống theo. **8,3 MB heap cho 10.000 kết nối đã đóng**, cộng ~3,4 KB stack mỗi cái (mục 4) là thêm 34 MB.

Bản chặn khác đúng một khái niệm — `context` bắc tín hiệu "chết rồi" qua mọi goroutine của cùng connection:

```go
ctx, cancel := context.WithCancel(roomCtx)
go func() {                                    // writer
    for {
        select {
        case buf := <-outbox: conn.Write(buf)
        case <-ctx.Done():    return           // <- lối thoát
        }
    }
}()
go func() { defer cancel(); readLoop(conn) }() // reader chết -> cancel -> writer chết theo
```

Ba quy tắc, cả ba là quy tắc *cấu trúc* chứ không phải kỷ luật cá nhân:

1. **Mọi goroutine phải có lối thoát không phụ thuộc phía bên kia.** `for range ch` chỉ thoát khi có người đóng `ch`; không chỉ ra được ai đóng và khi nào thì đổi sang `select` với `ctx.Done()`.
2. **`cancel()` luôn đi cùng `defer` ngay dòng sau khi tạo**, kể cả ở đường thành công.
3. **`roomCtx` là cha của mọi `connCtx`** — trận kết thúc, hủy một lần, `1 + 2P` goroutine thoát cùng lúc. Nền cho graceful drain của bài 31.

**Phát hiện.** Leak không có log, không error rate, không latency spike — nó chỉ đi lên. Metric `runtime.NumGoroutine()` mỗi 10 s là **cảnh báo duy nhất bạn thật sự cần**: đi lên đơn điệu trong khi số room đi ngang = leak. Rồi `/debug/pprof/goroutine?debug=1` gom nhóm theo stack, chỉ thẳng vào dòng code đang giữ 10.000 goroutine.

Bao nhiêu thời gian trước khi sập: **100 kết nối mới mỗi phút**, rò 1 goroutine mỗi kết nối → chạm ngưỡng 20.000 sau `20.000 / 100 = 200` phút = **3 giờ 20 phút**. Vừa đủ lâu để qua mọi bài test và staging, vừa đủ nhanh để sập giữa giờ cao điểm.

---

## 4. Một node chạy được bao nhiêu room

Ba ràng buộc **độc lập**, không cái nào suy ra được từ cái nào. Giả định: room `P` player, mỗi player **1 entity mô phỏng** (cận dưới, có ý thức); sim 60 Hz, snapshot 20 Hz; node 10 core, NIC 1 Gbps.

**Ràng buộc 1 — CPU.** Bench bài 8: `sim.Step` 1,18 µs cho 1.000 entity → **1,18 ns/entity**, 0 alloc. Cộng chi phí channel ở 3.4 (59,3 ns/input, mức fan-in 10):

```
CPU/room/giây = 60 tick × P × 1,18 ns + P × 60 input × 59,3 ns
P = 10 → 0,708 + 35,6 = 36,3 µs/giây → 10.000.000 / 36,3 = 275.573 room
```

**Ràng buộc 2 — băng thông.** Bài 24 chốt **13,68 B/entity** (bit-packed, đã phân bổ header), cộng 28 B header IPv4/UDP mỗi packet (bài 15):

```
mỗi player nhận 20 Hz × (P × 13,68 + 28) B/s
P = 10 → 20 × 164,8 = 3.296 B/s ; room 10 người = 32.960 B/s = 32,19 KB/s
NIC 1 Gbps = 125.000.000 B/s → 125.000.000 / 32.960 = 3.792 room
```

**Ràng buộc 3 — goroutine.** Không có công thức, phải đo: dựng `G` goroutine mỗi cái thức 60 lần/giây, rồi đo một goroutine tick 60 Hz **bị đánh thức muộn bao nhiêu** (lateness của bài 7):

| goroutine | p50 | p99 | RAM (Sys) | |
|---|---|---|---|---|
| 0 (đối chứng) | 1,02 ms | 1,06 ms | 8 MB | nền `time.Sleep`, khớp bài 7 |
| 1.000 | 0,01 ms | 0,10 ms | 18 MB | máy tỉnh hẳn |
| **20.000** | 0,03 ms | **1,54 ms** | 82 MB | ngưỡng an toàn cuối |
| 30.000 | 0,16 ms | **29,4 ms** | 116 MB | vượt một tick |
| 50.000 | 0,32 ms | 56,8 ms | 184 MB | ≈ 3 tick trễ |
| 100.000 | 13,6 ms | 149,6 ms | 350 MB | ≈ 9 tick trễ |
| 200.000 | 256 ms | 950 ms | 677 MB | **mất tick**: 136/180 |

*(Hai lần chạy độc lập, lấy lần xấu hơn. Mốc ≤ 20.000 luôn dưới 2 ms; mốc ≥ 30.000 luôn vượt.)*

**p50 vẫn đẹp trong khi p99 đã vỡ**: ở 50.000 goroutine p50 là 0,32 ms còn p99 là 56,8 ms, chênh **175 lần** — nhìn trung bình thì hệ thống trông hoàn hảo, đúng cái bài 7 cảnh báo. RAM cho giá một goroutine: `(677 − 8) MB / 200.000 = ` **3,4 KB**, tức 2 KB stack cộng sổ sách runtime.

Đo tiếp cái nằm dưới — **throughput đánh thức** của scheduler:

```
goroutine   mong đợi wake/s   thật   đạt
  20.000       1.199.976   1.199.966  100,0 %
  30.000       1.799.964   1.799.969  100,0 %
  50.000       2.999.940   2.923.968   97,5 %
 100.000       5.999.880   2.628.473   43,8 %
```

Trần là **~2,9–3,0 triệu lần đánh thức mỗi giây** trên 10 core, và quá tải rồi thì throughput **tụt xuống** (2,63 M < 2,92 M) chứ không đứng yên — scheduler tốn công cho chính nó. Nhưng ở 30.000 goroutine throughput vẫn 100 % trong khi p99 lateness đã 29,4 ms: **độ trễ vỡ trước throughput, sớm hơn gần 2 lần.**

Lấy **20.000 goroutine** làm trần vận hành → `20.000 / (1 + 2P)` room.

<svg viewBox="0 0 720 275" role="img" aria-labelledby="gs28-b-t gs28-b-d" style="width:100%;height:auto">
<title id="gs28-b-t">Ba trần số room theo số player mỗi trận</title>
<desc id="gs28-b-d">Trục hoành là số player mỗi trận từ 2 đến 100, trục tung là số room tối đa theo thang log. Trần CPU luôn cao nhất và không bao giờ chạm trước. Trần goroutine thấp nhất khi trận nhỏ; trần băng thông giảm nhanh hơn và cắt qua trần goroutine ở khoảng 45 player mỗi trận.</desc>
<line x1="95" y1="45" x2="95" y2="230" stroke="currentColor" stroke-opacity="0.4" stroke-width="1"/>
<line x1="95" y1="230" x2="660" y2="230" stroke="currentColor" stroke-opacity="0.4" stroke-width="1"/>
<text x="88" y="234" text-anchor="end" font-size="9" fill="currentColor" opacity="0.7">10</text>
<text x="88" y="203" text-anchor="end" font-size="9" fill="currentColor" opacity="0.7">100</text>
<text x="88" y="172" text-anchor="end" font-size="9" fill="currentColor" opacity="0.7">1.000</text>
<text x="88" y="142" text-anchor="end" font-size="9" fill="currentColor" opacity="0.7">10.000</text>
<text x="88" y="111" text-anchor="end" font-size="9" fill="currentColor" opacity="0.7">100 K</text>
<text x="88" y="80" text-anchor="end" font-size="9" fill="currentColor" opacity="0.7">1 M</text>
<text x="88" y="49" text-anchor="end" font-size="9" fill="currentColor" opacity="0.7">10 M</text>
<text x="20" y="30" font-size="10" font-weight="bold" fill="currentColor">room / node</text>
<line x1="95" y1="199" x2="660" y2="199" stroke="currentColor" stroke-opacity="0.12"/>
<line x1="95" y1="168" x2="660" y2="168" stroke="currentColor" stroke-opacity="0.12"/>
<line x1="95" y1="138" x2="660" y2="138" stroke="currentColor" stroke-opacity="0.12"/>
<line x1="95" y1="107" x2="660" y2="107" stroke="currentColor" stroke-opacity="0.12"/>
<line x1="95" y1="76" x2="660" y2="76" stroke="currentColor" stroke-opacity="0.12"/>
<text x="95" y="246" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">2</text>
<text x="225" y="246" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">5</text>
<text x="323" y="246" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">10</text>
<text x="422" y="246" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">20</text>
<text x="537" y="246" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">45</text>
<text x="650" y="246" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">100</text>
<text x="378" y="264" text-anchor="middle" font-size="10" fill="currentColor">số player mỗi trận (thang log)</text>
<polyline points="95,72 225,84 323,93 422,102 537,113 650,124" fill="none" stroke="#84cc16" stroke-width="2.5"/>
<polyline points="95,114 225,134 323,150 422,168 537,189 650,210" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
<polyline points="95,150 225,160 323,169 422,178 537,189 650,199" fill="none" stroke="#3b82f6" stroke-width="2.5"/>
<text x="600" y="118" font-size="10" fill="currentColor">CPU (10 core)</text>
<text x="580" y="222" font-size="10" fill="currentColor">băng thông 1 Gbps</text>
<text x="150" y="145" font-size="10" fill="currentColor">goroutine (20.000)</text>
<circle cx="537" cy="189" r="5" fill="none" stroke="#ef4444" stroke-width="2"/>
<text x="537" y="176" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">P ≈ 45</text>
<text x="180" y="196" font-size="10" font-style="italic" fill="currentColor">trần thật = đường THẤP nhất</text>
</svg>

| P | CPU (10 core) | Băng thông (1 Gbps) | Goroutine (20.000) | **Trần thật** | Chạm trần vì |
|---|---|---|---|---|---|
| 2 (1v1) | 1.377.866 | 56.449 | 4.000 | **4.000** | goroutine |
| 10 (5v5) | 275.573 | 3.792 | 952 | **952** | goroutine |
| 20 | 137.787 | 1.036 | 488 | **488** | goroutine |
| **45** | 61.238 | 216 | 220 | **216** | **giao điểm** |
| 60 (battle royale) | 45.929 | 123 | 165 | **123** | băng thông |
| 100 | 27.557 | 45 | 100 | **45** | băng thông |

**Một — CPU không bao giờ chạm trần trước, và chênh hai bậc độ lớn.** Ở P = 10, trần CPU là 275.573 room còn trần thật là 952: node đầy khi simulation dùng `952 / 275.573 = ` **0,35 %** năng lực CPU. Kiểm chéo: 952 × 60 × 10 × 1,18 ns = 674 µs/giây = **0,067 % một core** cho sim, cộng 952 × 600 × 59,3 ns = 33,9 ms/giây = **3,4 % một core** cho channel — chưa tới 3,5 % của **một** core trên máy 10 core.

> Bài 1 quay lại, lên một tầng. Bài 1: *CPU 8 % mà vẫn vỡ, vì thứ bạn tiêu là thời gian chứ không phải chu kỳ CPU*. Bài 28: **node đầy ở 3,5 % một core**, vì thứ bạn tiêu là **khe lịch của scheduler và byte trên dây**. Đừng autoscale theo CPU — con số đó nằm im ở 4 % cho tới lúc node chết.

**Hai — giao điểm P ≈ 45 chia thế giới làm hai chế độ.** Dưới 45 người/trận, thứ phải mua là **cách giảm số goroutine**; trên 45 là **băng thông**, và mọi kỹ thuật chương 6 chuyển thẳng thành số room theo đúng tỉ lệ. Giao điểm dịch theo NIC: 10 Gbps thì trần băng thông ×10 và goroutine chạm trước ở **mọi** cỡ trận trong bảng (P = 100: 447 so với 100).

**Ba — file descriptor không phải trần vật lý, nhưng phải kiểm.** `952 × 10 = 9.520` fd; `ulimit -n` mặc định máy này 1.048.576, nhưng container Linux hay đặt 1.024 — thấp hơn nhu cầu **9,3 lần**. Chỉ là một dòng config, nhưng quên thì nó chạm trước cả ba cái kia.

---

## 5. Tính tay

**Bài 1.** Game 5v5 (`P = 10`), node 10 core, NIC 1 Gbps, `1 + 2P`, node đầy ở 952 room.
- Egress lúc đó bao nhiêu MB/s, bằng bao nhiêu phần trăm NIC?
- Gộp writer lại còn `1 + P` goroutine mỗi room: trần goroutine mới là bao nhiêu room, và ràng buộc nào chạm trước, ở con số nào?
- 20.000 goroutine × 3,4 KB là bao nhiêu MB stack? So với 82 MB `Sys` ở mốc đó, phần chênh đi đâu?

**Bài 2.** Trận 100 người, snapshot 20 Hz, outbox mỗi client cap = 8, drop gói cũ, client chậm 40 % (nhận 12 Hz).
- Theo bảng 3.5, tuổi p99 là bao nhiêu? Ngân sách độ trễ 182 ms của bài 8 bị vượt bao nhiêu **lần**?
- Hạ cap xuống 1: tuổi p99 còn bao nhiêu, giảm bao nhiêu phần trăm? Client nhận bao nhiêu snapshot trong 10 giây — tương đương bao nhiêu Hz?
- Người chơi có nhận ra khác biệt giữa 20 Hz và tần suất đó không? Trả lời bằng con số buffer nội suy 100 ms của bài 8.

**Bài 3.** `runtime.NumGoroutine()` của node 5v5 (952 room, đầy) đọc **20.500** thay vì `952 × 21 = 19.992`.
- Rò bao nhiêu? Nếu rò 1 goroutine mỗi kết nối đóng và node đóng 8 kết nối/phút, leak bắt đầu bao nhiêu phút trước?
- Ở tốc độ đó, bao lâu nữa p99 vượt một tick? *(Mốc 30.000 goroutine, bảng mục 4.)*
- Ngưỡng cảnh báo nên đặt theo giá trị tuyệt đối hay đại lượng nào khác? Vì sao ngưỡng tuyệt đối cho false positive ở node đang scale lên?

---

## 6. Chuyển giao

Không có đáp án trong bài.

Bạn làm **game cờ theo lượt**: 2 người một trận, mỗi nước đi tối đa 30 giây, trận sống trung bình 12 phút, mỗi người gửi khoảng **24 gói tin** trong cả ván.

1. Mô hình `1 + 2P` cho 5 goroutine mỗi trận. Vòng lặp `for { drain; step; sleep }` ở 60 Hz cho một ván cờ tiêu tốn gì mà không sinh ra gì? Ước lượng số tick "rỗng" trong 12 phút.
2. Bỏ tick loop, chuyển sang **event-driven**: simulation chặn ở `<-inbox`, chỉ tỉnh khi có nước đi. Trần goroutine của mục 4 đổi thế nào — 20.000 còn đúng không, và phải đo lại bằng thí nghiệm nào?
3. Đồng hồ đếm ngược 30 giây do ai giữ? Nêu hai cách đặt và chỉ ra cách nào giữ được "một chủ sở hữu" của bài 1. Thêm ràng buộc: đóng tab rồi 3 phút sau mở lại thì trận phải còn nguyên — `roomCtx` là cha của `connCtx` còn đúng không?
4. Với event-driven, ba ràng buộc của mục 4 đổi thứ tự thế nào? Cái nào biến mất hẳn, và **cái nào mới xuất hiện** mà bài này chưa hề nhắc tới?
5. Cả hai người mất mạng cùng lúc, outbox đầy. Bảng 3.5 nói drop gói cũ thắng — ở game cờ chính sách đó hỏng theo kiểu gì, và điều đó nói gì về điều kiện thật sự khiến drop-gói-cũ đúng ở mục 3.5?
6. **Câu khó nhất:** 200.000 ván cờ mở cùng lúc, phần lớn đứng im chờ nước đi. Bảng mục 4 nói 200.000 goroutine cho p99 **950 ms** và mất 24 % số tick — nhưng ở đó mỗi goroutine thức **60 lần/giây**, còn ván cờ thức khoảng **0,067 lần/giây**, ít hơn `60 / 0,067 = 896` lần. Trần 2,9 triệu wakeup/giây có nghĩa là bạn giữ được 200.000 ván không? Nếu có, tại sao thí nghiệm mục 4 lại vỡ ở đúng con số đó — chỉ ra **đại lượng nào** trong phép đo ấy mới là thứ đang cạn, và nêu một phép đo tách được hai đại lượng đó ra khỏi nhau.

---

## 7. Tóm tắt

- **Data race không crash là loại tệ nhất.** Cùng chương trình, cùng máy: **107/200 lần chạy đúng**, 93 lần cho HP `145`, `116`, `-3` — không panic, exit 0. Với `-race`: **20/20 lần bắt được**, exit 66. `-race` chậm 2–20 lần nên chỉ chạy ở CI, nhưng nó không có false positive.
- **Ba loại goroutine mỗi room, `1 + 2P` cái.** Reader tách khỏi writer vì `conn.Read()` chặn; tick không tách vì nó chính là vòng lặp simulation. Chỉ simulation chạm world state.
- **Simulation single-threaded vì hai lý do độc lập:** song song hoá mất thứ tự xác định (chết rollback bài 22, replay bài 35); và mutex không mua được gì — **1,91 ns có khoá so với 0,28 ns không khoá, đắt 6,8 lần ngay cả khi 0 contention**, trong khi `step()` ghi lên hầu hết dữ liệu nên phần lớn thời gian vẫn chỉ một luồng chạy. Song song hoá nằm giữa các room.
- **Channel rẻ, đừng tối ưu nó.** Buffer 64 **21,7 ns/op** (unbuffered 86,2 — 0→64 giảm **74,8 %**; 64→1024 không lời gì); fan-in 100 producer 153,3 ns. Trận 100 người ở 60 Hz = **15,33 µs = 0,092 % ngân sách tick**. Chỗ channel làm đau là nó **chặn** và nó **giữ goroutine sống**.
- **Buffer to là lựa chọn tệ nhất, không phải an toàn nhất.** Producer 20 Hz / consumer 12 Hz: buffer 64 → p99 **4.000 ms**; buffer 1 chặn → producer tụt còn **12,5 Hz** kéo cả room theo; **buffer 1 + drop gói cũ → đủ 200/200, p50 33 ms, p99 51 ms**. Snapshot có hạn sử dụng (bài 12) nên vứt gói cũ không mất thông tin — kênh reliable bài 14 thì ngược lại. Và **10.000 kết nối vào-ra rò đúng 10.000 goroutine** (8,3 MB heap + 34 MB stack, GC không dọn được) nếu writer không có `ctx.Done()`; ở 100 kết nối/phút, node chạm trần sau **3 giờ 20 phút**.
- **Ba trần độc lập, CPU không bao giờ chạm trước.** Scheduler vỡ về độ trễ trước throughput: trần **~2,9–3,0 triệu wakeup/giây** nhưng p99 lateness đã **29,4 ms ở 30.000 goroutine** trong khi p50 vẫn 0,16 ms — trần vận hành **20.000 goroutine**, 3,4 KB mỗi cái. Ở P = 10: CPU 275.573 room / băng thông 3.792 / goroutine **952**, và node đầy khi sim dùng **0,067 % một core** — bài 1 lặp lại ở tầng node, nên **đừng autoscale theo CPU**. Giao điểm băng thông–goroutine ở **P ≈ 45**.

→ **Bài 29 — Gateway vs game node**: một tiến trình giữ được vài chục trận. Nhưng người chơi phải tìm được đúng tiến trình đang giữ trận của mình — và load balancer bạn quen dùng làm chuyện đó sai hoàn toàn.
