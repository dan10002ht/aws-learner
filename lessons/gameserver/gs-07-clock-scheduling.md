# Bài 7 — Đồng hồ & scheduling: drift, jitter, lateness

## 1. Mục tiêu

Sau bài này bạn có thể:

- Chỉ ra **dòng code** làm sai số cộng dồn trong `sleep(dt)`, và dòng làm nó không cộng dồn trong deadline tuyệt đối.
- Tính drift của một vòng lặp naive từ đúng ba đại lượng: `dt`, thời gian xử lý, sai số của `sleep`.
- Nói chính xác naive **mất gì và KHÔNG mất gì** — kể cả khi trực giác nói ngược lại.
- Giải thích vì sao **cách sai báo cáo metric đẹp hơn cách đúng**, và rút mệnh đề dùng được ngoài game server.
- Quyết định có trả **12% một core** cho busy-wait không, dựa trên số của game bạn chứ không dựa trên "best practice".
- Dùng đúng ba từ **drift**, **jitter**, **lateness**, và bắt được lỗi khi người khác dùng lẫn.

---

## 2. Triệu chứng

Bài 6 vừa chốt: accumulator giữ đúng **thời gian mô phỏng**. Còn lại câu hỏi kia — ai giữ đúng **thời điểm tỉnh dậy**?

Cùng vòng lặp 60 Hz, cùng world 1.000 entity, cùng máy. Chỉ đổi cách quyết định "khi nào tỉnh dậy". Hai báo cáo, chạy thật:

```
scheduler=naive     20s
  ticks       1138 / 1201 kỳ vọng    drift -63 tick (-5,25%)
  wake lateness   p50       0s   p99      1µs   max     12µs

scheduler=deadline   5s
  ticks        301 /  301 kỳ vọng    drift  +0 tick (+0,00%)
  wake lateness   p50   1,01ms   p99   1,06ms   max   1,26ms
```

Đọc cột lateness. `naive` trễ **1 micro giây** ở p99; `deadline` trễ **1,06 mili giây** — chậm hơn một nghìn lần.

Nếu hai dòng này lên dashboard, bạn mở ticket cho cái nào? Bạn sẽ mở cho `deadline`. Và bạn sẽ sai — `deadline` là cái đang chạy đúng.

---

## ⏸ Dừng lại — đoán trước #1

**Vì sao `naive` báo lateness gần bằng 0 trong khi nó mất 5,25% số tick?**

```
(a) Nó thật sự tỉnh đúng giờ; -5,25% là lỗi của công cụ đo
(b) Nó ngủ hụt nên tỉnh sớm, lateness âm bị làm tròn về 0
(c) Nó không có mốc nào để so, nên theo định nghĩa nó không bao giờ trễ
(d) Lateness đo bằng monotonic clock còn drift đo bằng wall clock — hai đồng hồ lệch nhau
```

---

## 3. Lý thuyết

### 3.1 Hai câu trả lời cho "khi nào tỉnh dậy"

Đáp án là **(c)**. Cả hai cài cùng một interface trong `internal/loop/scheduler.go`: `WaitFor(n)` chờ tới lượt tick thứ `n`, rồi trả về **mốc mà tick đó lẽ ra phải bắt đầu**.

```go
// Naive: ngủ đúng dt sau mỗi tick.
func (n *Naive) WaitFor(int64) time.Time {
	time.Sleep(n.dt)
	return time.Now() // không có khái niệm "đáng lẽ", nên không thấy mình trễ
}
```

```go
// Deadline: mốc tuyệt đối start + n*dt.
func (d *Deadline) WaitFor(n int64) time.Time {
	target := d.start.Add(time.Duration(n) * d.dt)

	if wait := time.Until(target) - d.spin; wait > 0 {
		time.Sleep(wait)
	}
	for time.Now().Before(target) { // busy-wait đoạn cuối, khi spin > 0
		runtime.Gosched()
	}
	return target
}
```

Khác biệt nằm ở **giá trị trả về**, không ở chỗ ngủ. `Naive` trả `time.Now()`, nên loop **so hiện tại với chính hiện tại** — kết quả luôn xấp xỉ 0, và `p99 1µs` chỉ là chi phí gọi `time.Now()` hai lần. `Deadline` trả `target`, một mốc tính từ `start`, độc lập với việc lần này ngủ ngon hay ngủ dở; lateness của nó mới là đại lượng có nghĩa.

### 3.2 Vì sao naive drift — và drift đúng bằng bao nhiêu

Mỗi vòng của `naive` tiêu `dt + thời gian xử lý + sai số của time.Sleep`. `time.Sleep` không hứa ngủ **đúng** `dt`, nó hứa ngủ **ít nhất** `dt`. Phần thừa — granularity timer OS cộng thời gian chờ được xếp lịch chạy lại — nhỏ, nhưng **luôn dương** và **cộng dồn**, vì vòng sau bắt đầu đếm từ chỗ vòng trước kết thúc.

Lấy số thật từ run 20 giây ở mục 2:

```
20,019 s / 1138 vòng = 17,59 ms mỗi vòng
                     − 16,67 ms (dt)
                     =  0,92 ms dôi ra mỗi vòng
```

Trong 0,92 ms đó, thời gian xử lý chiếm bao nhiêu? Cùng báo cáo: `step work p50 5µs`, tức **0,005 ms** — gần như toàn bộ phần dôi là sai số `time.Sleep`, **không phải việc bạn làm**. Nhân lên: `0,92 × 1138 = 1.047 ms`, chia `dt` được `62,8` tick. Báo cáo nói mất **63 tick**. Khớp.

> Drift không phải hậu quả của việc server bận. Nó là hậu quả của việc server **không biết mình đang ở đâu trên lịch**.

`deadline` gặp đúng sai số ~1 ms đó — nhìn lại mục 2, `lateness p50 1,01ms`. Cùng OS, cùng timer. Khác biệt duy nhất: nó neo vào `start + n·dt`, nên ngủ quá 1 ms ở tick 100 thì `time.Until(target)` ở tick 101 tự ngắn lại đúng 1 ms. Sai số **bị tiêu thụ tại chỗ thay vì được tích luỹ**.

<ab-toggle data-labels="sleep(dt) ngây thơ|lịch tuyệt đối">
<svg viewBox="0 0 520 330" role="img" aria-labelledby="gs7a1-t gs7a1-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif"><title id="gs7a1-t">sleep(dt) ngây thơ: sai số cộng dồn qua từng vòng</title><desc id="gs7a1-d">Trục thời gian với các vạch lịch start cộng n nhân dt cách nhau 16,67 ms, cùng tỉ lệ thật. Scheduler sleep(dt) mỗi vòng dài 17,59 ms nên lần tỉnh thứ n trễ n nhân 0,92 ms: 0,92, 1,84, 2,76 rồi 15,64 ở vòng 17 và 16,56 ở vòng 18, lúc đó nó tỉnh gần đúng mốc 19, tức đã mất một tick. Sau 1.138 vòng, 0,92 nhân 1.138 bằng 1.047 ms, khoảng 62,8 tick, báo cáo ghi mất 63 tick.</desc><text x="14" y="22" font-size="14" font-weight="700" fill="#f43f5e">sleep(dt): vòng sau đếm từ lúc vòng trước xong</text><text x="14" y="42" font-size="13" fill="currentColor" opacity="0.75">vạch đứt = lịch start + n·dt, cách 16,67 ms (đúng tỉ lệ)</text><text x="14" y="68" font-size="13" fill="currentColor" opacity="0.75">mốc</text><text x="50.0" y="68" text-anchor="middle" font-size="13" fill="currentColor">0</text><text x="106.7" y="68" text-anchor="middle" font-size="13" fill="currentColor">1</text><text x="163.4" y="68" text-anchor="middle" font-size="13" fill="currentColor">2</text><text x="220.0" y="68" text-anchor="middle" font-size="13" fill="currentColor">3</text><text x="300.0" y="68" text-anchor="middle" font-size="13" fill="currentColor">17</text><text x="356.7" y="68" text-anchor="middle" font-size="13" fill="currentColor">18</text><text x="413.4" y="68" text-anchor="middle" font-size="13" fill="currentColor">19</text><g stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="3 4"><line x1="50.0" y1="76" x2="50.0" y2="140"/><line x1="106.7" y1="76" x2="106.7" y2="140"/><line x1="163.4" y1="76" x2="163.4" y2="140"/><line x1="220.0" y1="76" x2="220.0" y2="140"/><line x1="300.0" y1="76" x2="300.0" y2="140"/><line x1="356.7" y1="76" x2="356.7" y2="140"/><line x1="413.4" y1="76" x2="413.4" y2="140"/></g><line x1="40" y1="120" x2="245" y2="120" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/><line x1="280" y1="120" x2="490" y2="120" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/><text x="262" y="125" text-anchor="middle" font-size="14" fill="currentColor" opacity="0.7">…</text><text x="14" y="104" font-size="13" fill="currentColor" opacity="0.75">vòng</text><rect x="106.7" y="126" width="3.1" height="10" fill="#f43f5e" fill-opacity="0.55"/><circle cx="109.8" cy="120" r="5" fill="#f43f5e"/><text x="109.8" y="104" text-anchor="middle" font-size="13" fill="currentColor">#1</text><text x="109.8" y="156" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">0,92</text><rect x="163.4" y="126" width="6.3" height="10" fill="#f43f5e" fill-opacity="0.55"/><circle cx="169.6" cy="120" r="5" fill="#f43f5e"/><text x="169.6" y="104" text-anchor="middle" font-size="13" fill="currentColor">#2</text><text x="169.6" y="156" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">1,84</text><rect x="220.0" y="126" width="9.4" height="10" fill="#f43f5e" fill-opacity="0.55"/><circle cx="229.4" cy="120" r="5" fill="#f43f5e"/><text x="229.4" y="104" text-anchor="middle" font-size="13" fill="currentColor">#3</text><text x="229.4" y="156" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">2,76</text><rect x="300.0" y="126" width="53.2" height="10" fill="#f43f5e" fill-opacity="0.55"/><circle cx="353.2" cy="120" r="5" fill="#f43f5e"/><text x="353.2" y="104" text-anchor="middle" font-size="13" fill="currentColor">#17</text><text x="353.2" y="156" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">15,64</text><rect x="356.7" y="126" width="56.3" height="10" fill="#f43f5e" fill-opacity="0.55"/><circle cx="413.0" cy="120" r="5" fill="#f43f5e"/><text x="413.0" y="104" text-anchor="middle" font-size="13" fill="currentColor">#18</text><text x="413.0" y="156" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">16,56</text><text x="14" y="178" font-size="13" fill="currentColor" opacity="0.75">số = lần tỉnh trễ so với vạch của nó, ms</text><rect x="10" y="192" width="500" height="128" rx="8" fill="#f43f5e" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/><text x="24" y="216" font-size="13" fill="currentColor">mỗi vòng 17,59 ms = 16,67 (dt) + 0,92 dôi ra</text><text x="24" y="239" font-size="13" fill="currentColor">dôi = sai số time.Sleep; việc xử lý chỉ 0,005 ms</text><text x="24" y="262" font-size="13" fill="currentColor">vòng #18 trễ 16,56 ms ≈ 1 dt: tỉnh ở mốc 19, mất 1 tick</text><text x="24" y="285" font-size="13" fill="currentColor">1.138 vòng × 0,92 = 1.047 ms ≈ 62,8 tick</text><text x="24" y="308" font-size="13" font-weight="700" fill="currentColor">20 s: 1138 / 1201 tick, báo cáo mất 63 tick (−5,25%)</text></svg>
<svg viewBox="0 0 520 330" role="img" aria-labelledby="gs7a2-t gs7a2-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif"><title id="gs7a2-t">Lịch tuyệt đối: sai số bị hấp thụ tại chỗ</title><desc id="gs7a2-d">Cùng trục thời gian và cùng các vạch lịch 16,67 ms. Scheduler deadline nhắm mốc tuyệt đối start cộng n nhân dt, mỗi lần tỉnh vẫn trễ khoảng 1 ms (p50 1,01 ms, p99 1,06 ms) nhưng khoảng trễ không lớn dần, vòng 18 vẫn tỉnh ngay sau mốc 18. Chạy 5 giây được 301 trên 301 tick, drift 0.</desc><text x="14" y="22" font-size="14" font-weight="700" fill="#10b981">deadline: mỗi lần tỉnh nhắm start + n·dt</text><text x="14" y="42" font-size="13" fill="currentColor" opacity="0.75">vạch đứt = lịch start + n·dt, cách 16,67 ms (đúng tỉ lệ)</text><text x="14" y="68" font-size="13" fill="currentColor" opacity="0.75">mốc</text><text x="50.0" y="68" text-anchor="middle" font-size="13" fill="currentColor">0</text><text x="106.7" y="68" text-anchor="middle" font-size="13" fill="currentColor">1</text><text x="163.4" y="68" text-anchor="middle" font-size="13" fill="currentColor">2</text><text x="220.0" y="68" text-anchor="middle" font-size="13" fill="currentColor">3</text><text x="300.0" y="68" text-anchor="middle" font-size="13" fill="currentColor">17</text><text x="356.7" y="68" text-anchor="middle" font-size="13" fill="currentColor">18</text><text x="413.4" y="68" text-anchor="middle" font-size="13" fill="currentColor">19</text><g stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="3 4"><line x1="50.0" y1="76" x2="50.0" y2="140"/><line x1="106.7" y1="76" x2="106.7" y2="140"/><line x1="163.4" y1="76" x2="163.4" y2="140"/><line x1="220.0" y1="76" x2="220.0" y2="140"/><line x1="300.0" y1="76" x2="300.0" y2="140"/><line x1="356.7" y1="76" x2="356.7" y2="140"/><line x1="413.4" y1="76" x2="413.4" y2="140"/></g><line x1="40" y1="120" x2="245" y2="120" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/><line x1="280" y1="120" x2="490" y2="120" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/><text x="262" y="125" text-anchor="middle" font-size="14" fill="currentColor" opacity="0.7">…</text><text x="14" y="104" font-size="13" fill="currentColor" opacity="0.75">vòng</text><rect x="106.7" y="126" width="3.4" height="10" fill="#10b981" fill-opacity="0.55"/><circle cx="110.1" cy="120" r="5" fill="#10b981"/><text x="110.1" y="104" text-anchor="middle" font-size="13" fill="currentColor">#1</text><text x="110.1" y="156" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">1,01</text><rect x="163.4" y="126" width="3.4" height="10" fill="#10b981" fill-opacity="0.55"/><circle cx="166.8" cy="120" r="5" fill="#10b981"/><text x="166.8" y="104" text-anchor="middle" font-size="13" fill="currentColor">#2</text><text x="166.8" y="156" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">1,01</text><rect x="220.0" y="126" width="3.4" height="10" fill="#10b981" fill-opacity="0.55"/><circle cx="223.5" cy="120" r="5" fill="#10b981"/><text x="223.5" y="104" text-anchor="middle" font-size="13" fill="currentColor">#3</text><text x="223.5" y="156" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">1,01</text><rect x="300.0" y="126" width="3.4" height="10" fill="#10b981" fill-opacity="0.55"/><circle cx="303.4" cy="120" r="5" fill="#10b981"/><text x="303.4" y="104" text-anchor="middle" font-size="13" fill="currentColor">#17</text><text x="303.4" y="156" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">1,01</text><rect x="356.7" y="126" width="3.4" height="10" fill="#10b981" fill-opacity="0.55"/><circle cx="360.1" cy="120" r="5" fill="#10b981"/><text x="360.1" y="104" text-anchor="middle" font-size="13" fill="currentColor">#18</text><text x="360.1" y="156" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">1,01</text><text x="14" y="178" font-size="13" fill="currentColor" opacity="0.75">số = lần tỉnh trễ so với vạch của nó, ms</text><rect x="10" y="192" width="500" height="128" rx="8" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/><text x="24" y="216" font-size="13" fill="currentColor">vẫn trễ ~1 ms mỗi lần: p50 1,01 ms, p99 1,06 ms</text><text x="24" y="239" font-size="13" fill="currentColor">cùng OS, cùng timer, cùng sai số như sleep(dt)</text><text x="24" y="262" font-size="13" fill="currentColor">trễ 1 ms ở tick 100 → time.Until(target) ở tick 101</text><text x="24" y="285" font-size="13" fill="currentColor">tự ngắn lại 1 ms: sai số không mang sang vòng sau</text><text x="24" y="308" font-size="13" font-weight="700" fill="currentColor">5 s: 301 / 301 tick, drift 0 tick (+0,00%)</text></svg>
<ab-note>Phần trễ mỗi vòng chỉ 0,92 ms, nhưng vòng sau bắt đầu đếm từ chỗ vòng trước kết thúc, nên thanh trễ dài thêm 0,92 ms mỗi vòng. Khoảng vòng thứ 18 nó đã trễ trọn một <code>dt</code>: một tick biến mất mà không ai báo lỗi.</ab-note>
<ab-note>Cùng sai số khoảng 1 ms, nhưng mốc tiếp theo tính từ <code>start</code> chứ không từ lần tỉnh trước, nên thanh trễ đứng yên ở mọi vòng. Lateness của nó lớn hơn <code>naive</code> nhưng không bao giờ cộng dồn thành drift.</ab-note>
</ab-toggle>

---

## ⏸ Dừng lại — đoán trước #2

Hộp quan trọng nhất của bài; gần như ai cũng đoán sai, kể cả người vừa đọc kỹ mục 3.2.

`naive` chạy 20 giây và mất **5,25% số tick**. Vòng lặp đó đang mô phỏng một world có vật lý.

**Sau 20 giây thực, thế giới mô phỏng đã chạy được bao lâu?**

```
(a) 18,95 s — chậm 1,05 giây, đúng 5,25% của 20 giây
(b) 20 s chẵn, nhưng vật lý sai vì mỗi bước phải dùng dt lớn hơn để bù
(c) 20 s chẵn, vật lý đúng tuyệt đối, không mất một bước nào
(d) Không xác định được — phụ thuộc tải máy lúc đó
```

Chọn (a) là mắc đúng cái lỗi mục sau tồn tại để sửa. Chọn (b) là nhớ đúng bài 5 nhưng nhầm cơ chế.

---

### 3.3 Sự thật dễ nói sai nhất trong cả chương 2

Đáp án là **(c)**. Đây là dòng mà mục 2 đã cố tình cắt đi:

```
scheduler=naive     20s
  ticks       1138 / 1201 kỳ vọng    drift -63 tick (-5,25%)
  sim steps   1201   catch-up 63   tick rỗng 0   dropped 0
```

**Số tick mất 63. Số sim step mất 0.**

Vì accumulator ở bài 6 nạp **thời gian thật đã trôi qua**, không đếm số vòng lặp. Một vòng ngủ quá tay 0,92 ms thì lần tỉnh sau accumulator có 17,59 ms trong tay; nó vẫn chạy 1 step và giữ lại 0,92 ms. Tới khoảng lần thứ 18 phần giữ lại cộng đủ `dt`, và tick đó chạy **2 step** — đó chính là `catch-up 63`. Kiểm bằng số học: `1.138 + 63 = 1.201`, đúng bằng số step kỳ vọng.

> `naive` mất 63 lần **tỉnh dậy**. Nó không mất một mili giây nào của **thời gian mô phỏng**.

Hai cơ chế, hai loại lỗi, **không thay thế được nhau**:

| | Chống cái gì | Hỏng thì mất gì |
|---|---|---|
| **Accumulator** (bài 6) | thời gian mô phỏng lệch thời gian thật | vật lý chạy nhanh/chậm theo tốc độ máy |
| **Deadline scheduler** (bài này) | thời điểm tỉnh dậy lệch lịch | nhịp quan sát và nhịp phản ứng của server |

Một hệ có accumulator mà thiếu deadline scheduler — chính là `naive` — vẫn mô phỏng đúng; nó chỉ **quan sát thế giới bên ngoài với tần suất sai**. Nói ngược lại cũng đáng nhớ: ai viết "sau 10 phút world chậm 30 giây" là đang mô tả một hệ **không có accumulator**.

### 3.4 Vậy naive mất gì — ba thứ, không thứ nào tên là "thời gian"

**(a) Độ phân giải input.** `1138 / 20,019 s = 56,8 Hz` — server đọc socket và gom input **56,8 lần mỗi giây** thay vì 60. Nhưng số trung bình chưa phải chỗ đau. Chỗ đau là **63 lần tick chạy 2 step**: hai bước đó xảy ra tại cùng một thời điểm thực, dùng **cùng một ảnh chụp input**. Bước đầu trong cặp lẽ ra phải chạy sớm hơn một `dt`, nên input của nó bị dùng muộn tới **2·dt = 33,3 ms**. Bài 8 sẽ cho thấy toàn bộ ngân sách từ lúc bấm phím tới lúc người khác nhìn thấy chỉ có 182 ms — và bạn vừa ném 33 ms vào đó, vô hình, 63 lần mỗi 20 giây.

**(b) Nhịp gửi snapshot, nếu đếm theo vòng lặp.** Cách viết tự nhiên nhất của snapshot 20 Hz trên tick 60 Hz là "cứ 3 tick gửi một lần": `56,8 / 3 = 18,9` snapshot mỗi giây. Bạn nghĩ đang gửi 20, thực tế gửi **19**. Client dựng buffer nội suy theo kỳ vọng 50 ms một snapshot và nhận trung bình 52,9 ms — không lỗi, không cảnh báo, chỉ là buffer mỏng dần hơn dự tính. Nên **nhịp gửi phải bám vào sim step, không bám vào số lần vòng lặp quay**, và câu đó đúng cả sau khi bạn đã sửa scheduler, vì bài 6 cho thấy jitter cũng đẻ ra tick rỗng.

**(c) Sai số tăng theo tải.** Cùng máy, cùng scheduler, chỉ đổi số entity:

| Scheduler | 1.000 entity | 200.000 entity |
|---|---|---|
| `naive` | −5,00% (285/300) | **−9,00%** (273/300) |
| `deadline` | +0,00% (301/301) | +0,00% (300/300) |

*(Mỗi run 5 giây trên Apple M-series. Lần chạy trước trong repo cho −5,32% và −10,00% ở cùng hai mốc — con số dao động vài phần mười phần trăm giữa các lần chạy, chiều thì không.)*

Lý do nằm trong công thức mục 3.2: tăng tải là tăng số hạng giữa, và số hạng giữa **cũng cộng dồn**. `deadline` không có số hạng nào cộng dồn — `time.Until(target)` tự trừ đi cả thời gian xử lý lẫn sai số của vòng trước. Đáng đọc thêm: `deadline` ở 200.000 entity vẫn ra 300/300 nhưng báo `catch-up 41, tick rỗng 41` — nó **không giả vờ mọi thứ hoàn hảo**, nó cho jitter hiện ra đúng chỗ jitter nằm rồi vẫn về đúng lịch.

Hệ quả thực dụng: **server dùng `naive` có nhịp khác nhau ở dev và ở production.** Bạn tune buffer nội suy trên máy mình ở 57 Hz, deploy lên node đang gánh 5 trận thì nó là 52 Hz, và không metric nào đổi màu.

---

## ⏸ Dừng lại — đoán trước #3

Quay lại chỗ khó chịu nhất của mục 2: `naive` báo p99 1 µs, `deadline` báo 1,06 ms. Bạn đã biết vì sao. Câu hỏi bây giờ là câu hỏi về **nghề**, không về game:

**Trong bốn tình huống sau, cái nào KHÔNG cùng một dạng lỗi với `naive` báo lateness 1 µs?**

```
(a) Health check trả 200 vì nó chỉ kiểm tra "process còn sống", không gọi DB
(b) p99 latency đo từ lúc handler bắt đầu chạy, bỏ qua thời gian nằm trong queue
(c) Tỉ lệ lỗi 0% vì mọi exception đều bị catch rồi trả 200 kèm body {"error": ...}
(d) CPU 8% ở bài 1 — server vỡ ở người thứ 6 mà CPU vẫn thấp
```

---

### 3.5 Một metric luôn xanh thường là metric không so với cái gì cả

Đáp án: **(d)** là cái khác.

(a), (b), (c) đều là **metric đo sai đối tượng** — đo một thứ có thật, nhưng không phải thứ bạn quan tâm. Health check đo process chứ không đo khả năng phục vụ; latency-từ-handler đo thời gian xử lý chứ không đo thời gian người dùng chờ; error rate đo số exception thoát ra chứ không đo số request thất bại. Và `naive` đo `Now() − Now()`.

(d) khác hẳn: CPU 8% là **con số hoàn toàn đúng**, đo đúng cái nó nói là đang đo — sai lầm ở bài 1 là dùng đúng số để trả lời sai câu hỏi. Hai lỗi, hai cách sửa: cái đầu phải **sửa metric**, cái sau phải **đổi câu hỏi**.

Từ đó rút được mệnh đề dùng xa ngoài game server:

> Một metric **không bao giờ đỏ** thì hoặc hệ thống của bạn hoàn hảo, hoặc metric đó không so với cái gì cả. Xác suất của vế sau cao hơn nhiều.

Cách kiểm rẻ tới mức không có lý do bỏ qua: **bắt metric chỉ ra mốc so sánh của nó.** `naive` không chỉ ra được — nó lấy `time.Now()`. `deadline` chỉ ra được — `start + n·dt`. Cái nào không nói được nó so với cái gì thì chưa phải metric, nó là một con số. Đây cũng là lý do `deadline` báo cáo *xấu hơn*: nó là scheduler duy nhất có đủ thông tin để biết mình trễ. **Khả năng báo cáo mình sai là một tính năng.**

### 3.6 Busy-wait: đổi CPU lấy đuôi phân bố

`deadline` hết drift nhưng còn lateness ~1 ms, và nguồn của nó là lời hứa "ngủ **ít nhất**" của timer OS. Cách duy nhất để né lời hứa đó là không nhờ nó ở đoạn cuối: ngủ hụt một khoảng `spin` rồi tự quay vòng chờ nốt — chính tham số `spin` ở mục 3.1.

Đo thật, 60 Hz, 1.000 entity, 5 giây mỗi run:

| | lateness p50 | lateness p99 | max |
|---|---|---|---|
| `spin = 0` | 1,01 ms | 1,06 ms | 1,26 ms |
| `spin = 2ms` (4 lần chạy) | 0 s | 10 – 23 µs | 19 – 128 µs |

p99 rơi từ **1,06 ms xuống khoảng 10–23 µs**, tốt lên **khoảng 45 tới 100 lần**. *(Dải chứ không phải một số: đuôi phân bố dao động giữa các lần chạy — lần ghi trong repo cho 17 µs. Con số của bạn sẽ khác theo OS, governor và tải.)*

Giá tính được chính xác: `2 ms / 16,67 ms = 12,0%` của **một core**, cháy vô ích — 12% một core **cho mỗi vòng lặp**, nên node chạy 8 trận là gần một core bị đốt để không làm gì.

Có đáng không? **Không có đáp án chung**, và đây là chỗ cần từ chối "best practice":

| Loại game | Ngân sách tới lúc thấy | 1 ms lateness là | Kết luận |
|---|---|---|---|
| FPS thi đấu | ~50 ms | 2% ngân sách, cộng vào jitter nhìn thấy được | thường đáng trả |
| MOBA | ~150 ms | dưới ngưỡng nhận biết | đo trước rồi hẵng quyết |
| Game thẻ bài | vài giây | không ai phát hiện nổi | không đáng, kể cả 0,1% CPU |

Cùng một con số 1 ms, ba kết luận khác nhau. **Ngưỡng không nằm trong hệ thống, nó nằm trong game** — mô-típ đã gặp ở bài 1 và bài 3.

Lưu ý cài đặt: đoạn spin trong repo dùng `runtime.Gosched()` chứ không quay vòng trần, nên nó giữ CPU bận nhưng vẫn nhường P cho goroutine khác — goroutine mạng không bị đói. Một số nền tảng có API ngủ chính xác hơn, đủ để không cần spin ở mức này.

### 3.7 Đồng hồ nào — và vì sao đây không phải chuyện học thuật

`deadline` neo vào `start + n·dt`. Nếu `start` là **wall clock** — thứ `date` in ra, thứ NTP chỉnh — thì cái neo có thể bị kéo đi giữa lúc server đang chạy: NTP điều chỉnh (nhảy hoặc chạy nhanh/chậm lại), DST và đổi timezone, leap second (tuỳ hệ mà lặp một giây hoặc bôi trơn ra 24 giờ).

Kịch bản tệ nhất không phải server chạy nhanh, mà là wall clock **nhảy lùi**: `time.Until(target)` trả về một khoảng dương rất lớn, và vòng lặp ngủ đúng như được bảo. Nên **tick loop phải dùng monotonic clock** — đồng hồ có đúng tính chất bạn cần: không bao giờ lùi, không ai chỉnh được.

Ở Go, `time.Now()` trả về một `Time` mang **cả hai** phần, phần monotonic hiện ra thành hậu tố `m=`:

```
time.Now()   : 2026-09-09 15:05:02.859266 +0700 +07 m=+0.000088751
Round(0)     : 2026-09-09 15:05:02.859266 +0700 +07
MarshalJSON  : "2026-09-09T15:05:02.859266+07:00"
```

`Sub`, `Since`, `Until` — toàn bộ những gì `Deadline.WaitFor` dùng — ưu tiên phần monotonic khi cả hai `Time` đều có nó, nên tick loop trong repo an toàn mà không cần làm gì thêm.

Nhưng để ý hai dòng dưới: **phần monotonic biến mất khi `Time` đi ra khỏi tiến trình.** `Round(0)`, `MarshalJSON`, `Format`, ghi file, gửi qua network — tất cả chỉ mang wall clock. Một `Time` serialize rồi parse lại **không còn là mốc monotonic**, dù trông y hệt.

> **Khoảng thời gian** thì tính bằng monotonic, trong cùng một tiến trình. **Thời điểm** gửi ra ngoài thì đừng gửi đồng hồ — gửi **số tick**.

Số tick là số nguyên đếm từ `start`, không phụ thuộc đồng hồ của ai. Đây là nền của bài 17: client và server không đồng bộ giờ, chúng đồng bộ **chỉ số tick**.

---

## 4. Ba từ hay bị dùng lẫn

<svg viewBox="0 0 720 240" role="img" aria-labelledby="gs7-b-t gs7-b-d" style="width:100%;height:auto">
<title id="gs7-b-t">Lateness, jitter và drift trên cùng một trục thời gian</title>
<desc id="gs7-b-d">Một trục thời gian với các vạch lịch cách đều và các điểm tỉnh dậy thực tế lệch dần sang phải. Lateness là khoảng cách của một điểm so với vạch lịch của chính nó, jitter là mức dao động của các khoảng cách đó, drift là tổng độ lệch tích luỹ sau nhiều tick.</desc>
<text x="14" y="18" font-size="11" fill="currentColor" opacity="0.75">vạch đứt = deadline theo lịch · chấm = lúc thực sự tỉnh dậy</text>
<g stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="3 4">
<line x1="80" y1="38" x2="80" y2="118"/><line x1="160" y1="38" x2="160" y2="118"/>
<line x1="240" y1="38" x2="240" y2="118"/><line x1="320" y1="38" x2="320" y2="118"/>
<line x1="400" y1="38" x2="400" y2="118"/><line x1="480" y1="38" x2="480" y2="118"/>
<line x1="560" y1="38" x2="560" y2="118"/><line x1="640" y1="38" x2="640" y2="118"/>
</g>
<line x1="60" y1="98" x2="700" y2="98" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5"/>
<g fill="#3b82f6">
<circle cx="85" cy="98" r="5"/><circle cx="171" cy="98" r="5"/><circle cx="254" cy="98" r="5"/>
<circle cx="342" cy="98" r="5"/><circle cx="426" cy="98" r="5"/><circle cx="515" cy="98" r="5"/>
<circle cx="598" cy="98" r="5"/><circle cx="687" cy="98" r="5"/>
</g>
<line x1="240" y1="62" x2="254" y2="62" stroke="#f59e0b" stroke-width="3"/>
<line x1="247" y1="62" x2="247" y2="92" stroke="#f59e0b" stroke-width="1" stroke-opacity="0.6"/>
<text x="247" y="54" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">LATENESS</text>
<text x="247" y="34" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.75">một lần, so với deadline của chính nó</text>
<rect x="370" y="126" width="170" height="28" rx="6" fill="#8b5cf6" fill-opacity="0.2"/>
<text x="455" y="145" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">JITTER</text>
<text x="455" y="170" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.75">dao động của các lateness</text>
<line x1="640" y1="200" x2="687" y2="200" stroke="#ef4444" stroke-width="3"/>
<line x1="640" y1="104" x2="640" y2="200" stroke="#ef4444" stroke-width="1" stroke-opacity="0.45"/>
<line x1="687" y1="104" x2="687" y2="200" stroke="#ef4444" stroke-width="1" stroke-opacity="0.45"/>
<text x="663" y="220" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">DRIFT</text>
<text x="330" y="234" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.75">tổng tích luỹ sau nhiều tick — chỉ có khi sai số không bị tiêu thụ tại chỗ</text>
</svg>

| Từ | Định nghĩa | Đo thế nào | Sửa bằng |
|---|---|---|---|
| **lateness** | một lần tỉnh muộn bao lâu so với **deadline của chính nó** | `now − (start + n·dt)`, ghi từng mẫu | `spin`, hoặc chấp nhận — tuỳ ngân sách |
| **jitter** | mức dao động của lateness quanh trung bình | p99 − p50, hoặc max − p50 | giảm nguồn nhiễu: GC, syscall lạc vào hot path, máy chạy chung |
| **drift** | lệch **tích luỹ** so với lịch sau nhiều tick | `ticks thực tế − ticks kỳ vọng` | deadline tuyệt đối; không có cách khác |

**Drift là thứ duy nhất trong ba cái mà thiết kế xoá được hoàn toàn** — `deadline` cho +0,00% ở cả 1.000 lẫn 200.000 entity; lateness và jitter chỉ giảm được, vì nguồn của chúng là OS. Từ đó, hai cặp số đáng dán lên tường:

- **Lateness cao, drift 0** — hệ khoẻ và trung thực (dòng `deadline` ở mục 2).
- **Lateness 0, drift âm** — hệ đang nói dối bạn (dòng `naive`), và gần như luôn nghĩa là bạn quên chọn mốc so sánh.

---

## 5. Tính tay

**Bài 1.** Server 60 Hz dùng `naive`. Bạn đo mỗi vòng thực tế mất **17,2 ms**.
- Phần dôi mỗi vòng là bao nhiêu, và sau bao nhiêu vòng thì nó cộng đủ một `dt`?
- Chạy 5 phút mất bao nhiêu tick, drift bao nhiêu phần trăm?
- Server tỉnh bao nhiêu lần mỗi giây? Nếu snapshot gửi mỗi 3 vòng lặp, client nhận bao nhiêu snapshot mỗi giây?
- Câu bẫy: **thời gian mô phỏng có chậm không?** Trả lời kèm điều kiện.

**Bài 2.** Cân nhắc `spin`. Số của bài: `spin=0` cho p99 1,06 ms; `spin=2ms` cho p99 ~15 µs với giá 12,0% một core.
- `spin = 0,5ms` thì giá CPU là bao nhiêu phần trăm một core?
- Node 8 core chạy 12 trận, mỗi trận một vòng lặp. `spin=2ms` đốt mất bao nhiêu core, bằng bao nhiêu phần trăm node?
- Ngân sách người chơi thấy được của game bạn là 120 ms. 1,06 ms chiếm bao nhiêu phần trăm? Với con số đó bạn có trả 12% CPU không — và cần đo thêm **cái gì** trước khi kết luận?

**Bài 3.** Bạn thừa hưởng một service. Metric: `tick lateness p50 0s, p99 0s, max 3µs`, uptime 60 ngày, chưa một lần cảnh báo.
- Hai giả thuyết giải thích con số đó là gì, và bạn đặt cược cái nào?
- Nêu **một** thứ duy nhất phải đọc trong code để phân biệt hai giả thuyết. (Gợi ý: mục 3.1 — nó dài đúng một dòng.)
- Không được sửa code thì bạn đo cái gì **từ bên ngoài** để biết service đó có drift?

---

## 6. Chuyển giao

Không có đáp án trong bài.

**Bạn viết một job chạy nền, không phải game.** Nó quét một hàng đợi **mỗi 100 ms**, chạy 24/7 trên Kubernetes, và quyết định thời điểm gửi thông báo đẩy. Người trước viết `for { work(); time.Sleep(100 * time.Millisecond) }`.

1. Job đó drift bao nhiêu mỗi ngày, nếu `work()` mất trung bình 8 ms và sai số sleep là 1 ms? Đổi ra số lần quét bị mất trong 24 giờ.
2. Job này **không có accumulator**. Hậu quả khác gì so với `naive` trong bài — cụ thể thứ gì bị mất mà ở game server không mất?
3. Bạn sửa sang deadline tuyệt đối. Pod bị evict rồi khởi động lại lúc 3 giờ sáng: `start` mới lấy từ đâu, và điều đó ảnh hưởng gì tới các mốc `start + n·dt` mà hệ thống khác đang trông đợi?
4. Có nên dùng `spin` ở đây không? Trả lời bằng cách so 1 ms với ngân sách của bài toán này, đừng trả lời bằng nguyên tắc.
5. Ba pod chạy job này cho ba shard, mỗi pod một `start` riêng, khởi động cách nhau vài giây. Có vấn đề gì không — và nếu neo tất cả vào một mốc chung (epoch chia hết cho 100 ms) thì bạn vừa tạo ra vấn đề gì mới?
6. **Câu khó nhất:** bài này kết luận "tick loop phải dùng monotonic clock". Nhưng job của bạn có yêu cầu game server không có: thông báo phải gửi đúng **9 giờ sáng theo giờ người dùng** — một mốc **wall clock**. Monotonic không biết 9 giờ sáng là lúc nào; wall clock thì nhảy. Thiết kế cách để job vừa giữ nhịp bằng monotonic vừa trúng mốc wall clock, và nói rõ **cái gì sai** trong khoảnh khắc NTP kéo đồng hồ lùi 2 giây ngay trước 9 giờ.

Câu 6 là chỗ hai loại đồng hồ buộc phải sống chung. Trả lời được thì bạn sẽ không bao giờ viết `time.Sleep(until9AM)` nữa.

---

## 7. Tóm tắt

- Khác biệt giữa `naive` và `deadline` nằm ở **giá trị trả về**, không ở chỗ ngủ: `time.Now()` so với `start + n·dt`.
- Mỗi vòng `naive` tiêu `dt + xử lý + sai số sleep`. Đo được **0,92 ms dôi mỗi vòng**, xử lý chỉ 0,005 ms — thủ phạm là `time.Sleep`. Nhân lên: `0,92 × 1.138 = 1.047 ms = 63 tick`, đúng bằng drift báo cáo (−5,25%).
- **Naive mất 63 tick nhưng mất 0 sim step**: `1.138 + 63 catch-up = 1.201`. Accumulator ở bài 6 hấp thụ toàn bộ, thế giới **không** chậm đi. Câu "sau 10 phút world chậm 30 giây" mô tả một hệ không có accumulator.
- Naive thật sự mất: **độ phân giải input** (56,8 Hz; input bước đầu trong cặp catch-up bị dùng muộn tới 33,3 ms), **nhịp gửi** (18,9 snapshot/giây thay vì 20), và **drift tăng theo tải** (−5,00% ở 1.000 entity, −9,00% ở 200.000; `deadline` 0,00% ở cả hai).
- Nghịch lý metric: `naive` báo p99 **1 µs**, `deadline` báo **1,06 ms** — cách sai đẹp hơn vì nó không có mốc để so. **Một metric luôn xanh thường là metric không so với cái gì cả.**
- `spin = 2ms` kéo p99 từ 1,06 ms xuống **10–23 µs** (~45–100 lần), giá **12,0% một core** cháy vô ích. Đáng với FPS thi đấu, vô nghĩa với game thẻ bài.
- Tick loop phải neo vào **monotonic clock**; NTP, DST, leap second đều có thể kéo wall clock lùi. Go giữ sẵn phần monotonic trong `time.Now()` và `Sub`/`Until` dùng nó, **nhưng phần đó mất khi `Time` được serialize**. Ra ngoài thì gửi **số tick**, không gửi đồng hồ.
- Ba đại lượng: **lateness** một lần so với deadline của chính nó; **jitter** dao động của lateness; **drift** lệch tích luỹ. Chỉ drift là thứ thiết kế xoá được hoàn toàn.

→ **Bài 8 — Ba loại nhịp & ngân sách độ trễ**: nhịp đã đúng và đo được rồi. Giờ tính xem 16,67 ms đó thực sự mua được gì — và vì sao thứ được tranh cãi nhiều nhất lại là thứ đáng tối ưu ít nhất.
