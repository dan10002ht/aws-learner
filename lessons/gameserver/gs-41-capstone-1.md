# Bài 41 — Capstone 1: agar-lite chạy được

## 1. Mục tiêu

Sau bài này bạn có thể:

- Dựng một **game server 60 Hz chạy thật** từ thư mục rỗng: deadline scheduler, accumulator, WebSocket, snapshot — dưới 600 dòng Go.
- Bố trí room theo mô hình **1 goroutine sim + inbox channel + 1 reader/1 writer mỗi connection**, và chứng minh nó không có data race mà không dùng một `Mutex` nào.
- Đo **tick p50/p99 và tách ngân sách** thành sim, serialize, gửi — rồi chỉ đích danh chặng nào ăn hết.
- Tính ra **số player tối đa một room chịu được** từ hai lần đo, và nói vì sao con số đó không do vật lý quyết định.
- Cắm **delay 100/200 ms và drop 5% ngay trong client**, rồi mô tả chính xác cái bạn nhìn thấy bằng ngôn ngữ của bài 8.
- So số đo thật với **dự đoán của bài 8 và bài 24**, và giải thích từng chỗ lệch bằng nguyên nhân, không bằng "chắc do máy".

---

## 2. Triệu chứng

Bạn vừa đọc chín chương lý thuyết và **chưa viết một dòng game server nào**. Bạn biết 182 ms gồm bảy chặng, biết JSON tốn 112,7 byte mỗi entity, biết deadline scheduler giữ drift 0,00 %. Toàn là số của người khác.

Bài này dựng agar-lite thật. Nhưng có một quyết định về thứ tự cần nói trước, vì nó ngược với bản năng:

**Bản dựng ở bài này cố tình chơi rất dở.** Không prediction — vòng tròn của chính bạn phản hồi sau **158,2 ms**. Không interpolation — mỗi gói mất là một cú giật. Không AOI — mỗi snapshot chở toàn bộ 561 entity. Không binary — JSON thô, **362,6 KB/s mỗi người chơi**.

Nếu sửa bốn thứ đó ngay từ đầu, bạn sẽ có một game chơi được và **không biết mình đã mua gì bằng cái gì**. Prediction che 158 ms — nhưng che 158 ms trông như thế nào nếu bạn chưa từng thấy 158 ms trần? Bài 42 chỉ có nghĩa nếu bài 41 để lại một vết đau đo được.

Nên thứ tự là: chạy được trước, đo, **tự tay cảm thấy độ trễ**, rồi mới che.

---

## ⏸ Dừng lại — đoán trước #1

Server 60 Hz, room 50 player, world 511 pellet, snapshot JSON đầy đủ ở 20 Hz. Ngân sách một tick là 16,67 ms.

**Ở 50 player, chặng nào ăn nhiều ngân sách tick nhất?**

```
(a) sim.Step — 50 player × 511 pellet là 25.550 phép kiểm tra va chạm mỗi tick
(b) json.Marshal snapshot, một lần cho mỗi connection
(c) ghi dữ liệu xuống 50 socket
(d) GC, vì mỗi tick sinh gần 1 MB rác JSON
```

---

## 3. Dựng

### 3.1 Bước 1 — bộ khung và nhịp

Cây thư mục cuối cùng, 512 dòng Go phía server:

```
agarlite/
  go.mod              gorilla/websocket  la phu thuoc duy nhat
  loop.go       62 d  deadline scheduler + thu thap p50/p99
  world.go     115 d  struct-of-arrays, Step()
  proto.go      37 d  Input, Snapshot — JSON
  room.go      215 d  goroutine sim: drain inbox -> step -> broadcast
  main.go       83 d  http, upgrade WS, reader/writer moi conn
  static/index.html  79 d  client canvas + gia lap delay/drop
  cmd/bot/main.go    78 d  bot khong dau, de do bang thong
```

Nhịp lấy nguyên từ bài 7 — mốc tuyệt đối `start + n·dt`, không phải `sleep(dt)`:

```go
func (d *deadlineSched) waitFor(n int64) time.Time {
	target := d.start.Add(time.Duration(n) * d.dt)
	if wait := time.Until(target) - d.spin; wait > 0 {
		time.Sleep(wait)
	}
	for time.Now().Before(target) { // spin=0 mac dinh: vong nay khong chay
		runtime.Gosched()
	}
	return target
}
```

Chạy 14 giây với `-duration 14s`: **839 tick / 840 kỳ vọng**, `dropped 0`. Drift bằng 0 đúng như bài 7 hứa.

Ba lệnh là hết vòng đời của bản dựng này:

```
go run .                          # server + client tai localhost:8080
go run . -duration 14s            # chay roi tu in bao cao, dung de do
go run ./cmd/bot -n 50 -d 15s     # 50 bot khong dau, input 30 Hz, dem byte
```

Kiểm tra sống bằng tay, không cần trình duyệt — bắt tay WebSocket thô rồi bơm một input vào:

```
handshake: HTTP/1.1 101 Switching Protocols
{"you":1,"w":2000,"h":2000,"hz":60,"snapHz":20}
{"t":66,"ack":1,"you":1,"p":[{"id":1,"x":1319.9292,"y":1970.6913,"r":12}],"f":[...
```

`ack:1` là `seq` của gói input vừa gửi, quay ngược về trong snapshot kế tiếp. Vòng tròn đã khép: input đi qua reader, qua inbox, vào world, ra snapshot, về client.

Một chỗ lệch đáng ghi: bài 7 đo `spin=0` cho **lateness p99 ~1,06 ms**. Ở đây, cùng `spin=0` nhưng có thêm 100 goroutine mạng và network stack tranh CPU, p99 là **2,05 ms** — gấp 1,93 lần. Bản thân drift vẫn 0 vì deadline scheduler không cộng dồn sai số; cái tăng là *độ giật của từng tick*. Đây là lần đầu bạn thấy chi phí của I/O đè lên một con số đo trong phòng thí nghiệm.

### 3.2 Bước 2 — world tối thiểu

Struct-of-arrays theo bài 37: entity là một index, mỗi thuộc tính một slice liền mạch.

```go
type World struct {
	id      []uint32
	px, py  []float32
	dx, dy  []float32 // huong input da chuan hoa, [-1,1]
	r       []float32 // ban kinh
	lastSeq []uint32  // seq input cuoi cung — bai 42 se can
	fx, fy  []float32 // pellet
	alive   []bool
	w, h    float32
}
```

Gameplay đủ để có cái mà chơi: đi theo hướng input, càng to càng chậm, chạm pellet thì to ra theo **diện tích** chứ không theo bán kính.

```go
sp := baseSpeed * float32(math.Pow(float64(baseRadius/wd.r[i]), 0.4))
wd.px[i] += wd.dx[i] * sp * dt
// ... kep bien ...
if ddx*ddx+ddy*ddy <= rr {          // ddx, ddy: pellet - player
	wd.alive[j] = false
	wd.r[i] = float32(math.Sqrt(float64(wd.r[i]*wd.r[i] + 9)))
}
```

Vòng ăn pellet là **O(P × F)** — 50 × 511 = 25.550 phép kiểm tra mỗi tick. Không có lưới không gian, không có quadtree. Cố ý: đo trước rồi hãy tối ưu.

Đo được gì: `sim.Step` p50 **87 µs**, p99 **101 µs** ở 50 player. Chia ra là **3,41 ns mỗi phép kiểm tra**, và **0,61 % ngân sách tick** ở p99. Ở 100 player, p99 là 166 µs — **0,996 %**.

Bài 8 đã tuyên bố "vật lý không phải nút thắt" dựa trên bench `sim.Step` cô lập. Bản chạy thật, có cả va chạm bậc hai, xác nhận: **dưới 1 % ngân sách**.

### 3.3 Bước 3 — WebSocket, và chống race bằng kiến trúc

Bài 28 chốt mô hình **1 + 2P goroutine**: một goroutine simulation sở hữu duy nhất `World`, mỗi connection một reader và một writer. Reader parse xong thì **đẩy vào inbox**, không chạm world.

```go
func reader(room *Room, c *conn) {
	defer func() { room.inbox <- inboxMsg{conn: c, quit: true}; c.ws.Close() }()
	for {
		_, data, err := c.ws.ReadMessage()
		if err != nil { return }
		var in Input
		if json.Unmarshal(data, &in) != nil { continue }
		select {
		case room.inbox <- inboxMsg{conn: c, in: in}:
		default: // inbox day: bo input, KHONG chan reader
		}
	}
}
```

Hai chữ `default` trong bài này đều là quyết định thiết kế, không phải phòng thủ cho vui:

| Chỗ | Khi kênh đầy | Hậu quả nếu chặn thay vì bỏ |
|---|---|---|
| reader → `inbox` | bỏ input của **một** người | reader đứng, TCP window đóng, người đó bị nghẽn dây |
| sim → `c.out` | bỏ snapshot của **một** người | **cả room đứng** vì một client đọc chậm |

Ô thứ hai là lý do writer phải là goroutine riêng. `WriteMessage` là lời gọi chặn; nếu goroutine sim tự ghi, một người dùng 3G kéo 49 người còn lại đứng theo.

Bản đầu tiên của `reader` có thêm `close(c.out)` trong `defer` — nghe rất hợp lý, ai mở thì người đó dọn. `go build -race`, 20 bot, 12 giây:

```
WARNING: DATA RACE
Read at 0x00c00151e010 by goroutine 18:
  runtime.chansend1()
  main.(*Room).broadcast()   room.go:147
```

Room đang gửi snapshot vào một kênh mà reader vừa đóng. Kiến trúc "một chủ sở hữu" đã chặn được race trên `World`, nhưng `c.out` vẫn có **hai** người can thiệp: sim gửi vào, reader đóng. Cách sửa không phải là thêm khoá mà là kéo nó về đúng nguyên tắc cũ — **ai sở hữu `conns` thì người đó đóng `out`**:

```go
case m.quit:
	delete(rm.conns, m.conn.id) // xoa TRUOC
	close(m.conn.out)           // roi moi dong: khong con ai gui vao duoc nua
	rm.w.RemovePlayer(m.conn.id)
```

Và `reader` gửi `quit` bằng phép gửi **chặn**, không `default`: mất một input thì không sao, mất tin báo ngắt kết nối thì rò rỉ một goroutine writer vĩnh viễn. Sau khi sửa: `go build -race`, 20 bot, 12 giây, **0 cảnh báo**.

<svg viewBox="0 0 700 250" role="img" aria-labelledby="gs41-a-t gs41-a-d" style="width:100%;height:auto">
<title id="gs41-a-t">Dòng dữ liệu một room agar-lite</title>
<desc id="gs41-a-d">Mỗi connection có một goroutine reader đẩy input vào một inbox channel dùng chung và một goroutine writer nhận snapshot từ outbox channel riêng; chỉ goroutine simulation ở giữa chạm vào World.</desc>
<rect x="10" y="20" width="120" height="46" rx="8" fill="#3b82f6" fill-opacity="0.22"/>
<text x="70" y="40" text-anchor="middle" font-size="11" fill="currentColor">reader #1</text>
<text x="70" y="56" text-anchor="middle" font-size="10" fill="currentColor">parse JSON</text>
<rect x="10" y="80" width="120" height="46" rx="8" fill="#3b82f6" fill-opacity="0.22"/>
<text x="70" y="100" text-anchor="middle" font-size="11" fill="currentColor">reader #2 .. #P</text>
<text x="70" y="116" text-anchor="middle" font-size="10" fill="currentColor">P goroutine</text>
<rect x="10" y="160" width="120" height="46" rx="8" fill="#84cc16" fill-opacity="0.22"/>
<text x="70" y="180" text-anchor="middle" font-size="11" fill="currentColor">writer #1 .. #P</text>
<text x="70" y="196" text-anchor="middle" font-size="10" fill="currentColor">P goroutine</text>
<rect x="185" y="50" width="105" height="46" rx="8" fill="#f59e0b" fill-opacity="0.25"/>
<text x="237" y="70" text-anchor="middle" font-size="11" fill="currentColor">inbox chan</text>
<text x="237" y="86" text-anchor="middle" font-size="10" fill="currentColor">buffer 1024</text>
<rect x="185" y="160" width="105" height="46" rx="8" fill="#f59e0b" fill-opacity="0.25"/>
<text x="237" y="180" text-anchor="middle" font-size="11" fill="currentColor">out chan × P</text>
<text x="237" y="196" text-anchor="middle" font-size="10" fill="currentColor">buffer 8</text>
<rect x="350" y="60" width="180" height="130" rx="10" fill="#8b5cf6" fill-opacity="0.20"/>
<text x="440" y="84" text-anchor="middle" font-size="12" fill="currentColor">goroutine SIMULATION</text>
<text x="440" y="104" text-anchor="middle" font-size="10" fill="currentColor">1. drain inbox (khong chan)</text>
<text x="440" y="122" text-anchor="middle" font-size="10" fill="currentColor">2. Step(dt) × accumulator</text>
<text x="440" y="140" text-anchor="middle" font-size="10" fill="currentColor">3. moi 3 tick: broadcast</text>
<rect x="375" y="152" width="130" height="28" rx="6" fill="#ef4444" fill-opacity="0.22"/>
<text x="440" y="171" text-anchor="middle" font-size="11" fill="currentColor">World — 1 chu so huu</text>
<line x1="130" y1="43" x2="183" y2="66" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<line x1="130" y1="103" x2="183" y2="82" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<line x1="290" y1="73" x2="348" y2="90" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<line x1="348" y1="165" x2="292" y2="180" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<line x1="183" y1="183" x2="132" y2="183" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<text x="600" y="90" text-anchor="middle" font-size="10" fill="currentColor">khong Mutex nao</text>
<text x="600" y="108" text-anchor="middle" font-size="10" fill="currentColor">go build -race sach</text>
<text x="600" y="126" text-anchor="middle" font-size="10" fill="currentColor">1 + 2P goroutine</text>
</svg>

Trước khi đi tiếp, cho **bản sai** chạy một lượt, vì nó là phản xạ đúng của dev backend: *"1 + 2P goroutine cho 100 người là 201 goroutine, nghe phí. Cứ để reader ghi thẳng vào `World` rồi bọc một `sync.Mutex` là xong."*

Nó **không** cho race detector kêu. Nó hỏng ở chỗ khác: bài 28 đã đo, `step()` đọc và ghi trên hầu hết dữ liệu nên khoá phải bao gần trọn tick, và lúc đó mutex chỉ là hàng đợi có thêm chi phí. Còn cái mất lớn hơn không đo bằng ns: input được áp dụng **vào lúc gói tới**, tức tại một điểm ngẫu nhiên giữa hai tick. Hai lần chạy cùng một chuỗi input cho ra hai world khác nhau — mất đúng thứ chương 3 dựng suốt bốn bài. Còn 201 goroutine thì tốn 201 × 8 KB stack khởi điểm ≈ **1,6 MB**, ít hơn một snapshot broadcast của chính room này.

Vòng sim đúng khung bài 5–6, chỉ thêm một dòng broadcast:

```go
acc += woke.Sub(prev); prev = woke
for drained := false; !drained; {          // 1. drain inbox
	select {
	case m := <-rm.inbox: rm.apply(m)
	default:              drained = true
	}
}
steps := 0                                  // 2. step co dinh
for acc >= dt && steps < maxCatchUp { rm.w.Step(dtf); acc -= dt; steps++ }
if acc >= dt { dropped = int(acc / dt); acc %= dt }
if n%int64(every) == 0 { rm.broadcast(n) }  // 3. moi 3 tick = 20 Hz
```

`every = 60/20 = 3`. Đây là chỗ ba nhịp của bài 8 gặp nhau trong một hàm: input đi vào ở bước 1 với nhịp của client, sim chạy 60 Hz ở bước 2, snapshot ra 20 Hz ở bước 3.

### 3.4 Bước 4 — protocol JSON, cố ý

```go
type Input struct {
	Seq uint32  `json:"seq"`
	DX  float32 `json:"dx"`
	DY  float32 `json:"dy"`
}
type PlayerView struct {
	ID uint32  `json:"id"`
	X  float32 `json:"x"`
	Y  float32 `json:"y"`
	R  float32 `json:"r"`
}
type Snapshot struct {
	T   int64        `json:"t"`
	Ack uint32       `json:"ack"`
	You uint32       `json:"you"`
	P   []PlayerView `json:"p"`
	F   []PelletView `json:"f"`
}
```

Full snapshot, không delta, không AOI. `Ack` chở về `seq` cuối cùng server đã áp dụng — bài 42 sẽ dùng nó, ở đây nó chỉ để nhìn.

---

## ⏸ Dừng lại — đoán trước #2

Bài 24 đo entity 9 field và ra **112,7 byte/entity** với JSON. Entity của agar-lite mỏng hơn nhiều: player 4 field, pellet 2 field.

**Snapshot 50 player + 511 pellet — tổng 561 entity — `json.Marshal` ra bao nhiêu byte?**

```
(a) ~7.300 B  — entity mong hon 2–4 lan nen re hon nhieu
(b) ~17.600 B — khoang 31 B/entity
(c) ~36.000 B — vi float32 in ra day chu so
(d) ~63.200 B — 561 × 112,7, JSON la JSON
```

---

### 3.5 Đo đúng cái đó

Đáp án là **(b): 17.591 B, tức 31,4 B/entity.** Tách ra:

| Phần | Byte | Số field | B/entity | B/field |
|---|---|---|---|---|
| Mảng 50 player | 2.527 | 4 | **50,5** | 12,63 |
| Mảng 511 pellet | 15.026 | 2 | **29,4** | 14,70 |
| Header (`t`, `ack`, `you`, dấu ngoặc) | 38 | — | — | — |
| **Toàn snapshot** | **17.591** | — | **31,4** | — |

Một player thật, in nguyên từ chương trình:

```
{"id":1,"x":1209.3206,"y":1881.0182,"r":23.811762}   50 B
{"x":823.5254,"y":1105.1608}                         28 B
```

Bây giờ đối chiếu với bài 24. Entity ở đó có 9 field và tốn 112,7 B → **12,52 B/field**. Player ở đây có 4 field và tốn 50,5 B → **12,63 B/field**. Tỉ số byte là 112,7 / 50,5 = **2,2317**, tỉ số số field là 9 / 4 = **2,25**. Lệch **0,81 %**.

Kết luận không phải "JSON tốn 112,7 B/entity" — đó là con số của một entity cụ thể. Cái bất biến là: **JSON tốn khoảng 12,5 byte cho mỗi trường số**, gần như bất kể trường đó chở gì. Pellet đắt hơn trên mỗi field (14,70) vì hai dấu ngoặc và dấu phẩy phân bổ trên 2 field thay vì 9.

Và điều đó dẫn tới chỗ đau: agar-lite **không** thoát được bằng cách có entity mỏng. Nó tự bắn vào chân bằng **số lượng** entity — 561 thay vì 50.

### 3.6 Bước 5 — client, một file HTML

Không framework, không build step, không `npm`. Mở `http://localhost:8080` là chạy.

```js
let dx = (keys.ArrowRight||keys.d?1:0) - (keys.ArrowLeft||keys.a?1:0);
let dy = (keys.ArrowDown ||keys.s?1:0) - (keys.ArrowUp  ||keys.w?1:0);
const l = Math.hypot(dx,dy); if (l) { dx/=l; dy/=l; }
net.send(m => ws.readyState===1 && ws.send(m),
         JSON.stringify({seq:++seq, dx, dy}));
```

Vẽ thì tầm thường: `arc()` cho từng pellet và từng player, camera bám vòng tròn của mình. `snap.p.find(p => p.id === me)` — tìm tuyến tính trong 50 phần tử, 60 lần mỗi giây, và nó không hề là vấn đề.

### 3.7 Bước 6 — độ trễ và mất gói, đặt ở CLIENT

Đây là phần quan trọng nhất của bài. Chín dòng:

```js
const net = {
  delay: () => +document.getElementById('delay').value,   // 0 / 100 / 200 ms
  drop:  () => +document.getElementById('drop').value,    // 0 / 0.05
  send(fn, payload) {
    if (Math.random() < this.drop()) return;   // goi nay bien mat, khong bao ai
    const d = this.delay() / 2;                // one-way = RTT/2
    d ? setTimeout(() => fn(payload), d) : fn(payload);
  }
};
```

Mọi gói đi qua nó, **cả hai chiều**: `ws.onmessage` không xử lý ngay mà đẩy vào `net.send`, và mỗi input cũng vậy. Chạy 20.000 gói qua đúng object này: mất **5,30 %** (cấu hình 5 %, sai lệch trong khoảng nhiễu của cỡ mẫu), độ trễ một chiều p50 **50 ms**, p99 **52 ms**.

Đặt ở client, không phải ở server, vì hai lý do. Thứ nhất: `tc netem` cần root và làm hỏng cả máy; một `setTimeout` thì đổi được bằng dropdown giữa lúc đang chơi. Thứ hai và quan trọng hơn: bạn cần **chính mình** ở đầu chịu độ trễ, không phải nhìn nó qua log.

Bây giờ chơi thử. Bảng dưới là thứ cần nhìn ở từng nấc, cùng con số sinh ra nó — tốc độ 220 đơn vị/giây, bán kính khởi điểm 12:

| Cấu hình | Cái bạn thấy | Số làm nó xảy ra |
|---|---|---|
| delay 0, drop 0 | mượt, nhưng vòng tròn **đứng yên 2 frame rồi nhảy** | snapshot 20 Hz, render 60 Hz → 11,0 đơn vị = 0,92 bán kính mỗi bậc |
| delay 100 | bấm phím rồi mới nhúc nhích | 158,2 ms — quãng đường lẽ ra đã đi: **34,8 đơn vị = 2,90 bán kính** |
| delay 200 | không còn điều khiển được, chỉ ước lượng | 258,2 ms = **56,8 đơn vị = 4,73 bán kính** |
| drop 5 % | giật một cái mỗi giây | 20 Hz × 5 % = **1 gói mất/giây** → lỗ 100 ms = 22,0 đơn vị = 1,83 bán kính |
| drop 5 %, xui | thỉnh thoảng một cú dịch chuyển tức thời | mất 2 gói liền: 0,05 lần/giây = **một lần mỗi 20 giây**, lỗ 150 ms |

Dòng đầu là dòng gây bất ngờ nhiều nhất: **kể cả với mạng hoàn hảo, không delay không drop, game vẫn giật.** Nguồn giật không phải mạng — là chênh lệch giữa 20 Hz dữ liệu và 60 Hz màn hình. Không có gói nào mất, không có mili giây nào bị trễ, và nó vẫn xấu. Đó chính xác là lỗ hổng mà buffer nội suy 100 ms của bài 8 sinh ra để bịt, và là lý do nó nằm trong ngân sách chứ không bị ai cắt.

Bảng cần đọc chậm — đây là ngân sách bài 8 áp lên bản dựng thật, ở nấc `delay = 100 ms`:

| Chặng | Bài 8 (RTT 40) | agar-lite (RTT 100) |
|---|---|---|
| chờ lấy mẫu input (30 Hz) | — | 16,7 |
| A → server | 20 | 50 |
| chờ tick 60 Hz | 8,3 | 8,3 |
| xử lý | 1 | 0,2 |
| chờ snapshot 20 Hz | 25 | 25 |
| server → B | 20 | 50 |
| **buffer nội suy** | **100** | **0** |
| render | 8 | 8 |
| **tổng** | **182,3 ms** | **158,2 ms** |

Bản dựng này **thấp hơn 182 ms tới 23,8 ms** — và chơi tệ hơn hẳn. Vì 100 ms bị bỏ đi kia không phải mỡ thừa: nó là buffer nội suy của bài 20, thứ duy nhất biến một chuỗi snapshot rời rạc 20 Hz thành chuyển động liên tục. Bỏ nó đi thì mỗi gói mất là một lỗ thủng nhìn thấy được.

Và 158,2 ms đó **áp lên chính vòng tròn của bạn**. Không có prediction, `dx` bạn bấm phải bay sang server, chờ tick, chờ snapshot, bay về. Bạn bấm phím rồi đếm đến một phần sáu giây mới thấy mình nhúc nhích. Ở nấc 200 ms thì tổng là **258,2 ms**.

<svg viewBox="0 0 700 210" role="img" aria-labelledby="gs41-b-t gs41-b-d" style="width:100%;height:auto">
<title id="gs41-b-t">158,2 ms của agar-lite so với 182,3 ms của bài 8</title>
<desc id="gs41-b-d">Hai thanh ngang so sánh: bài 8 dài 182,3 ms trong đó 100 ms là buffer nội suy, agar-lite dài 158,2 ms và không có buffer nội suy nào.</desc>
<text x="8" y="30" font-size="11" fill="currentColor">Bai 8 — 182,3 ms</text>
<rect x="8" y="40" width="66" height="26" rx="3" fill="#3b82f6" fill-opacity="0.30"/>
<rect x="74" y="40" width="28" height="26" rx="3" fill="#8b5cf6" fill-opacity="0.30"/>
<rect x="102" y="40" width="86" height="26" rx="3" fill="#f59e0b" fill-opacity="0.30"/>
<rect x="188" y="40" width="66" height="26" rx="3" fill="#3b82f6" fill-opacity="0.30"/>
<rect x="254" y="40" width="330" height="26" rx="3" fill="#84cc16" fill-opacity="0.35"/>
<rect x="584" y="40" width="26" height="26" rx="3" fill="#64748b" fill-opacity="0.35"/>
<text x="419" y="58" text-anchor="middle" font-size="11" fill="currentColor">buffer noi suy 100 ms</text>
<text x="8" y="110" font-size="11" fill="currentColor">agar-lite bai 41 — 158,2 ms</text>
<rect x="8" y="120" width="55" height="26" rx="3" fill="#64748b" fill-opacity="0.35"/>
<rect x="63" y="120" width="165" height="26" rx="3" fill="#3b82f6" fill-opacity="0.30"/>
<rect x="228" y="120" width="28" height="26" rx="3" fill="#8b5cf6" fill-opacity="0.30"/>
<rect x="256" y="120" width="83" height="26" rx="3" fill="#f59e0b" fill-opacity="0.30"/>
<rect x="339" y="120" width="165" height="26" rx="3" fill="#3b82f6" fill-opacity="0.30"/>
<rect x="504" y="120" width="26" height="26" rx="3" fill="#64748b" fill-opacity="0.35"/>
<line x1="530" y1="112" x2="530" y2="154" stroke="#ef4444" stroke-width="2"/>
<text x="612" y="137" text-anchor="middle" font-size="11" fill="currentColor">buffer = 0</text>
<text x="145" y="138" text-anchor="middle" font-size="10" fill="currentColor">mang 50 ms</text>
<text x="421" y="138" text-anchor="middle" font-size="10" fill="currentColor">mang 50 ms</text>
<text x="8" y="180" font-size="10" fill="currentColor">xanh duong = mang · tim = cho tick 8,3 · cam = cho snapshot 25 · xanh la = buffer · xam = lay mau input / render</text>
<text x="8" y="196" font-size="10" fill="currentColor">Ngan hon 23,8 ms va choi te hon — 100 ms bi cat khong phai mo thua.</text>
</svg>

---

## 4. Đo thật — và cái ăn hết ngân sách

Bốn lần chạy, mỗi lần 14 giây, bot không đầu gửi input 30 Hz. Máy Apple M4, `go 1.26`.

| Player | sim.Step p50/p99 | broadcast p50/p99 | tick work p99 | % ngân sách | egress/player |
|---|---|---|---|---|---|
| 1 | 5 / 10 µs | 170 / 251 µs | 246 µs | **1,5 %** | 328,9 KB/s |
| 10 | 20 / 30 µs | 1,26 / 1,49 ms | 1,44 ms | **8,7 %** | 323,7 KB/s |
| 50 | 87 / 101 µs | 6,25 / 7,04 ms | 6,96 ms | **41,8 %** | 338,5 KB/s |
| 100 | 113 / 166 µs | 11,79 / 14,89 ms | 13,97 ms | **83,8 %** | 362,6 KB/s |

Đáp án hộp #1 là **(b)**. Tách sâu hơn vào bên trong `broadcast` ở 50 player:

```
build (dung 2 mang view)   p50     5 µs
json.Marshal × 50 conn     p50  6,15 ms      <- 98,4 %
gui vao out chan × 50      p50    87 µs
```

Không phải (a): sim là **87 µs**, tức broadcast tốn gấp **71,8 lần** ở 50 player và **104,3 lần** ở 100 player. Không phải (c): 50 lần đẩy vào channel là 87 µs, việc ghi socket nằm ở goroutine writer, ngoài đường tick. Không phải (d): 100 player sinh **40,1 MB/s** rác, 31 lần GC trong 14 giây, tổng pause 1,73 ms — chia đều là **2,06 µs mỗi tick**.

Còn một chỗ lệch phải nói ra, vì nó là bài học về *cách đo*:

| Cách đo 50 lần `json.Marshal` | Thời gian | % ngân sách |
|---|---|---|
| `go test -bench`, cô lập | 2,44 ms | 14,63 % |
| trong server thật, 101 goroutine đang chạy | 6,15 ms | 36,9 % |

Chênh **2,52 lần**. Không phải GC: chạy lại bench với `GOGC=off` cho 2,54 ms, gần như y hệt. Phần chênh còn lại đến từ việc goroutine sim phải chia 10 core với 100 goroutine mạng và network stack của kernel. *(Đây là quy kết theo loại trừ, không phải chứng minh — tôi loại được GC bằng thí nghiệm, phần còn lại là suy đoán hợp lý.)* Bài học: **một microbench báo cáo 14,6 % ngân sách có thể là 36,9 % khi cắm vào hệ thật.**

### 4.1 Trần của một room, tính từ hai điểm

`json.Marshal` mỗi connection tốn **123 µs** ở 50 player và **116 µs** ở 100 player — tuyến tính theo số connection, đúng như phải thế: mỗi người nhận một bản sao đầy đủ.

Lấy p99 (146 µs/conn) và ngân sách 16,67 ms: **114 player**. Ở 100 player p99 đã là 89,4 % — đo và ngoại suy khớp nhau.

Con số đáng nhớ: **trần của room này không do vật lý quyết định.** Ở 114 player, `sim.Step` vẫn dưới 200 µs, còn nguyên 98 % ngân sách nếu bỏ được cái vòng marshal. Nút thắt là **serialize một bản đầy đủ cho từng người**, và bài 42 tấn công đúng chỗ đó bằng hai thứ: AOI cắt số entity, binary cắt byte/entity.

## ⏸ Dừng lại — đoán trước #3

Suốt chương 3 tới chương 6, mọi bảng băng thông đều dùng cùng một dòng: **50 entity × 10 B × 20 Hz = 10.000 B/s mỗi player.** Bản dựng này đo ra **351.820 B/s**.

**Sai số 35 lần đó đến từ đâu?**

```
(a) Chu yeu tu JSON: 31,4 B/entity thay vi 10 B — hon 3 lan
(b) Chu yeu tu so entity: 561 thay vi 50 — hon 11 lan
(c) Ca hai, va chung NHAN voi nhau chu khong cong
(d) Tu WebSocket framing va TCP header, khong phai tu payload
```

### 4.2 Dự đoán của các chương trước, chấm điểm

| Dự đoán | Nguồn | Đo thật | Khớp? |
|---|---|---|---|
| drift 0,00 % với deadline scheduler | bài 7 | 839/840 tick, dropped 0 | **khớp** |
| lateness p99 ~1,06 ms, spin=0 | bài 7 | 2,05 ms | lệch 1,93× — có I/O |
| vật lý không phải nút thắt | bài 8 | 0,996 % ngân sách ở 100 player | **khớp** |
| JSON 112,7 B/entity | bài 24 | 31,4 B/entity, nhưng **12,6 B/field** vs 12,52 | **khớp ở mức field, 0,81 %** |
| 10 KB/s mỗi player | chương 6 | **351.820 B/s** = 343,6 KB/s | lệch **35,2×** |

Dòng cuối là dòng phải mổ, và đáp án hộp #3 là **(c)**. Số đo trên là payload thuần — bot đếm `len(message)`, chưa tính một byte framing nào — nên (d) bị loại ngay. `50 entity × 10 B × 20 Hz = 10.000 B/s` giả định hai thứ mà bản dựng này vi phạm cả hai:

```
so entity :  561 / 50   = 11,22 lan
B/entity  : 31,4 / 10   =  3,14 lan
tich      : 11,22 × 3,14 = 35,23 lan   (do thuc te: 35,18)
```

Không phải một sai lầm lớn — là **hai sai lầm vừa phải nhân với nhau**. Và mỗi thừa số có một tên riêng: 11,22 là cái AOI xoá, 3,14 là cái binary xoá. Bài 42 gỡ đúng theo thứ tự đó.

Quy ra tiền theo cách bài 40 làm, ở 100 player trên một node: **37,1 MB/s = 297,1 Mbps** egress, 96.252 GB/tháng, $0,09/GB → **$8.663/tháng**, tức **$86,63 mỗi CCU mỗi tháng**. Bài 40 báo cáo $6,75–7,17. Bản này đắt hơn **12,1–12,8 lần**, và toàn bộ khoảng chênh nằm ở egress.

---

## 5. Tính tay

**Bài 1.** Drop 5 %, snapshot 20 Hz, không nội suy. Player bán kính 12 đi với tốc độ 220 đơn vị/giây.
- Mất **một** gói tạo lỗ thủng bao nhiêu ms, và vòng tròn nhảy bao nhiêu đơn vị? Bằng mấy lần bán kính?
- Mô phỏng 100.000 gói cho chuỗi mất liên tiếp dài nhất là **3 gói**. Cú nhảy tệ nhất khi đó là bao nhiêu ms và bao nhiêu đơn vị?
- Buffer nội suy phải dài ít nhất bao nhiêu ms để che được chuỗi 3 gói đó? So với 100 ms của bài 8 — thừa hay thiếu?

**Bài 2.** Marshal 123 µs/conn ở p50, 146 µs ở p99. Ngân sách tick 16,67 ms.
- Muốn giữ p99 broadcast **dưới 50 %** ngân sách thì room tối đa bao nhiêu player?
- Nếu chuyển từ marshal-cho-từng-người sang marshal **một lần** rồi gửi chung bộ đệm (bỏ field `you`/`ack` khỏi snapshot), chi phí broadcast còn lại là gì, và trần room nhảy lên khoảng bao nhiêu? *(Gợi ý: `build` p50 = 5 µs, `chan-send` = 87 µs cho 50 conn.)*
- Trần mới đó bị chặn bởi cái gì tiếp theo — hãy chỉ ra dòng số trong bài chứng minh điều đó.

**Bài 3.** Từ 351.820 B/s mỗi player về mục tiêu 10.000 B/s.
- AOI cắt 561 entity xuống còn 50 thì còn bao nhiêu B/s? Đã đủ chưa?
- Thêm binary 13 B/entity (bài 24) thì còn bao nhiêu B/s, hơn hay kém mục tiêu?
- Ở 100 player, tổng hai bước đó tiết kiệm bao nhiêu USD/tháng theo giá $0,09/GB?

---

## 6. Chuyển giao

1. Bạn đổi `every` từ 3 xuống 1 để snapshot chạy 60 Hz. Egress và `broadcast` p99 mỗi thứ nhân mấy lần, và cái nào chạm trần trước?
2. Một người chơi mở laptop từ chế độ sleep sau 8 giây. Accumulator nạp 8 s, `MaxCatchUp = 5`. Theo công thức bài 6, bao nhiêu step bị bỏ, và **client** nhìn thấy điều đó dưới dạng gì — biết rằng client này không có nội suy?
3. Bot gửi input 30 Hz, sim chạy 60 Hz. Bao nhiêu phần trăm tick nhận được input mới? Nếu người chơi đổi hướng đúng vào tick không có input, độ trễ thêm là bao nhiêu, và nó nằm ở chặng nào trong bảng 158,2 ms?
4. `select { case room.inbox <- ...: default: }` bỏ input khi inbox đầy. Với buffer 1024 và 100 player gửi 30 Hz, phải xảy ra chuyện gì thì inbox mới đầy? Nếu nó đầy thật, bỏ input có phải phản ứng đúng không — hay nên bỏ *cái khác*?
5. Bạn muốn thêm cơ chế player to nuốt player nhỏ. Vòng va chạm thành O(P²) bên cạnh O(P × F). Ở 100 player, phần P² thêm bao nhiêu µs nếu mỗi phép kiểm tra vẫn là 3,41 ns, và nó có đổi kết luận "vật lý không phải nút thắt" không?
6. Trong bản này, đặt delay ở **client** nghĩa là cả input đi lên lẫn snapshot đi xuống đều bị hoãn. Nếu thay bằng đặt delay ở **server**, có tình huống nào bạn đo ra kết quả khác không, và tình huống nào bạn **không** thể mô phỏng được nữa?
7. **Câu khó nhất:** ngân sách agar-lite là **158,2 ms**, ngắn hơn 182,3 ms của bài 8 tới **23,8 ms**, vậy mà chơi tệ hơn rõ rệt. Hãy chỉ ra vì sao "tổng độ trễ" là một chỉ số **sai** để đánh giá cảm giác chơi ở đây — rồi định nghĩa một đại lượng đo được, chỉ dùng số có trong bài, mà cho ra kết quả *đúng thứ tự* giữa hai cấu hình: bản 182,3 ms có buffer 100 ms, và bản 158,2 ms không có buffer. Đại lượng đó của bạn nói gì về một bản thứ ba, RTT 40 ms và buffer 50 ms?

---

## 7. Tóm tắt

- agar-lite chạy được nằm trong **512 dòng Go + 79 dòng HTML**, một phụ thuộc duy nhất là `gorilla/websocket`.
- Deadline scheduler giữ **839/840 tick, dropped 0** — nhưng lateness p99 là **2,05 ms** chứ không phải 1,06 ms của bài 7, vì 100 goroutine mạng tranh CPU. Drift không đổi, độ giật thì đổi.
- Mô hình **1 + 2P goroutine** cho `go build -race` sạch mà không có một `Mutex` nào: `World` chỉ có đúng một goroutine chạm vào. Race duy nhất tìm thấy nằm ở **`close(c.out)`** — sai vì đóng kênh từ goroutine không sở hữu nó, sửa bằng cách trả quyền đóng về goroutine sim, không phải bằng khoá.
- `sim.Step` với cả va chạm O(P × F) tốn **0,996 % ngân sách ở 100 player**. Bài 8 đúng: vật lý không phải nút thắt.
- `json.Marshal` chiếm **98,4 %** thời gian broadcast, và broadcast chiếm **83,8 %** ngân sách tick ở 100 player — gấp **104,3 lần** sim.
- Cùng phép marshal đó: **14,63 %** ngân sách trong microbench, **36,9 %** trong server thật. Chênh **2,52 lần**, và không phải do GC (`GOGC=off` cho kết quả y hệt).
- Trần room = **114 player**, đặt bởi serialize-một-bản-cho-mỗi-người, không phải bởi simulation.
- JSON không tốn 112,7 B/entity — nó tốn **~12,5 B mỗi trường số**. Bài 24: 112,7/9 = 12,52. Bài này: 50,5/4 = 12,63. Lệch **0,81 %**.
- Băng thông thật **351.820 B/s mỗi player**, gấp **35,2 lần** dự đoán 10.000 B/s của chương 6 — tích của **11,22×** (số entity, AOI sẽ xoá) và **3,14×** (byte/entity, binary sẽ xoá).
- Giá: **$86,63/CCU/tháng** ở 100 player, so với **$6,75–7,17** của bài 40 — đắt hơn **12,1–12,8 lần**, toàn bộ nằm ở egress.
- Ngân sách end-to-end **158,2 ms** ở delay 100 ms, **258,2 ms** ở 200 ms. Ngắn hơn bài 8 **23,8 ms** và chơi tệ hơn: 100 ms bị cắt là buffer nội suy, không phải mỡ thừa.

→ **Bài 42 — Capstone 2: agar-lite chơi được**: bạn vừa dựng đúng cái server mà chương 1 tới 4 mô tả, và bạn vừa tự tay cảm thấy 182 ms. Bài cuối cùng áp chương 5 và chương 6 lên nó — rồi đo lại mọi con số bạn đã dự đoán suốt course.
