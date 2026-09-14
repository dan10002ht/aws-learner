# Bài 37 — Zero-allocation hot loop & bố trí dữ liệu

## 1. Mục tiêu

Sau bài này bạn có thể:

- Đọc một chuỗi tick p99 có gai và **chứng minh gai đó là GC** bằng số, không bằng cảm giác.
- Nói đúng **GC của Go tiêu tiền ở đâu**: STW pause là hàng chục µs và gần như không đổi theo heap; cái ăn ngân sách là mark assist.
- Chọn bố trí dữ liệu bằng **hai phép đo tách rời** — thời gian một step, và công GC phải quét — và biết cái nào thắng ở quy mô nào.
- Chỉ ra **các nguồn cấp phát ẩn trong Go** trên code có sẵn, xác nhận bằng output `-gcflags=-m` thật.
- Quyết định `sync.Pool` bằng bảng break-even, và nêu ba trường hợp Pool **làm chậm đi**.
- Vặn `GOGC`/`GOMEMLIMIT` theo bảng đánh đổi RAM ↔ GC-CPU, và nhận ra cấu hình gây GC thrash.
- Vạch **ranh giới hot loop** để không tối ưu cấp phát ở chỗ chẳng ai quan tâm.

---

## 2. Triệu chứng

Bài 36 dựng xong dashboard. Server 1.000 entity ở 60 Hz, serializer bình thường dựng snapshot cho 100 người chơi mỗi tick. Chạy 30 giây, 1.800 tick:

```
tick p50 =  98 µs      (0,59 % ngân sách 16,67 ms)
tick p90 = 151 µs
tick p99 = 291 µs
tick max = 3.201 µs    (19,2 % ngân sách)
```

p50 đẹp không chê được. p99 vẫn dư 98%. Nhưng nhìn danh sách những tick vượt 1 ms:

```
tick  606 : 2.310 µs
tick  782 : 2.542 µs
tick  958 : 3.201 µs
tick 1133 : 1.218 µs
tick 1481 : 1.127 µs
```

Khoảng cách giữa các gai: **176, 176, 175** tick — ở 60 Hz là **một gai mỗi 2,93 giây**, đều như đồng hồ. Không có gì trong logic game chạy theo chu kỳ 2,93 giây. Runtime thì có: cùng lần chạy đó, `runtime/metrics` báo **11 chu kỳ GC trong 1.800 tick**, trung bình một GC mỗi 164 tick.

Chu kỳ gai khớp chu kỳ GC. Và đây là chỗ phản trực giác: đo `PauseNs` của chính 11 chu kỳ đó ra **p50 = 29 µs, max = 61 µs**. Sáu mươi mốt micro giây không giải thích nổi một tick 3.201 µs. Ai đi tìm thủ phạm bằng cách nhìn stop-the-world pause sẽ không thấy gì và kết luận "GC ổn mà".

*(Apple M4, 10 core, 16 GB, Go 1.26.5, `GOGC` mặc định. Số dao động giữa các lần chạy — lần tệ nhất trong 6 lần có một tick **17.310 µs = 103,8 % ngân sách**, tức mất trọn một tick.)*

Bài này đi tìm 3.140 µs còn thiếu.

---

## ⏸ Dừng lại — đoán trước #1

**STW pause chỉ 61 µs mà tick nở ra 3.201 µs. Phần lớn thời gian đó đi đâu?**

```
(a) GC chạy trên goroutine riêng và OS scheduler đá goroutine tick ra khỏi core
(b) Chính goroutine tick bị runtime bắt đi quét heap hộ GC, ngay giữa lời gọi make()
(c) Cache bị GC quét làm bẩn, tick sau đó chạy chậm vì cache miss
(d) ReadMemStats trong vòng đo tự nó gây STW
```

Ba trong bốn đáp án có thật ở mức độ nào đó. Chỉ một cái là **thủ phạm chính**, và nó đo được.

---

## 3. Lý thuyết

### 3.1 GC của Go không phải một cú dừng — nó là một khoản thuế thu tại chỗ

Đáp án là **(b)**, và tên chính thức của nó là **mark assist**.

GC của Go chạy đồng thời từ 1.5; STW chỉ còn hai khoảnh khắc rất ngắn ở đầu và cuối chu kỳ. Nhưng "đồng thời" không phải "miễn phí": trong lúc GC đang mark, runtime buộc **mọi goroutine đang cấp phát** phải trả nợ — cấp phát *b* byte thì phải quét một lượng heap tương ứng trước khi được cấp. Cơ chế này giữ GC không bị bỏ lại phía sau, và nó thu thuế **đúng vào goroutine cấp phát nhiều nhất**. Trong game server, đó là goroutine chạy tick, vì nó dựng snapshot.

Chia tick của chính lần chạy mục 2 làm hai nhóm, theo `/cpu/classes/gc/total:cpu-seconds` có tăng trong tick đó hay không:

| Nhóm tick | Số tick | p50 | p99 | max |
|---|---|---|---|---|
| GC đang ngủ | 1.482 | **98 µs** | 249 µs | 503 µs |
| GC đang chạy | 18 | **270 µs** | 2.542 µs | **3.201 µs** |

*(1.500 tick sau khi bỏ 300 tick khởi động — heap còn đang lớn dần.)*

Mười tám trên một nghìn năm trăm là **1,2 %** — đúng lý do bài 36 nhấn mạnh p99: ở p50 và p90 nhóm này vô hình, tới p99 mới ló ra một nửa. Mỗi cái là một lần người chơi thấy khựng.

<svg viewBox="0 0 700 250" role="img" aria-labelledby="gs37-a-t gs37-a-d" style="width:100%;height:auto">
<title id="gs37-a-t">Một chu kỳ GC trải lên chuỗi tick: STW ngắn, mark assist dài</title>
<desc id="gs37-a-d">Trục thời gian gồm nhiều tick 16,67 mili giây. Hai vạch stop-the-world chỉ vài chục micro giây nằm ở đầu và cuối chu kỳ GC. Giữa hai vạch đó là pha mark kéo dài nhiều tick, và các tick nằm trong pha này bị mark assist làm nở ra từ 98 lên tới 3201 micro giây.</desc>
<text x="20" y="20" font-size="11" font-weight="bold" fill="currentColor">176 tick giữa hai gai — chu kỳ GC</text>
<line x1="20" y1="40" x2="680" y2="40" stroke="currentColor" stroke-opacity="0.35"/>
<g font-size="9" fill="currentColor" opacity="0.75">
<text x="20" y="34">tick 600</text>
<text x="640" y="34">tick 780</text>
</g>
<rect x="150" y="46" width="4" height="34" fill="#ef4444" fill-opacity="0.85"/>
<rect x="410" y="46" width="4" height="34" fill="#ef4444" fill-opacity="0.85"/>
<rect x="154" y="46" width="256" height="34" fill="#f59e0b" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.3"/>
<text x="282" y="67" text-anchor="middle" font-size="11" fill="currentColor">pha MARK — chạy đồng thời, kéo dài nhiều tick</text>
<text x="152" y="94" text-anchor="middle" font-size="9" fill="currentColor">STW 29 µs</text>
<text x="412" y="94" text-anchor="middle" font-size="9" fill="currentColor">STW</text>
<text x="20" y="128" font-size="10" font-weight="bold" fill="currentColor">thời gian làm việc của mỗi tick</text>
<g fill="#3b82f6" fill-opacity="0.55">
<rect x="20" y="196" width="16" height="6"/>
<rect x="42" y="196" width="16" height="6"/>
<rect x="64" y="196" width="16" height="6"/>
<rect x="86" y="196" width="16" height="6"/>
<rect x="108" y="196" width="16" height="6"/>
<rect x="130" y="196" width="16" height="6"/>
<rect x="440" y="196" width="16" height="6"/>
<rect x="462" y="196" width="16" height="6"/>
<rect x="484" y="196" width="16" height="6"/>
<rect x="506" y="196" width="16" height="6"/>
<rect x="528" y="196" width="16" height="6"/>
<rect x="550" y="196" width="16" height="6"/>
<rect x="572" y="196" width="16" height="6"/>
<rect x="594" y="196" width="16" height="6"/>
<rect x="616" y="196" width="16" height="6"/>
<rect x="638" y="196" width="16" height="6"/>
<rect x="660" y="196" width="16" height="6"/>
</g>
<g fill="#ef4444" fill-opacity="0.6">
<rect x="160" y="160" width="16" height="42"/>
<rect x="182" y="140" width="16" height="62"/>
<rect x="204" y="150" width="16" height="52"/>
<rect x="226" y="136" width="16" height="66"/>
<rect x="248" y="152" width="16" height="50"/>
<rect x="270" y="146" width="16" height="56"/>
<rect x="292" y="164" width="16" height="38"/>
<rect x="314" y="154" width="16" height="48"/>
<rect x="336" y="170" width="16" height="32"/>
<rect x="358" y="158" width="16" height="44"/>
<rect x="380" y="176" width="16" height="26"/>
</g>
<line x1="20" y1="202" x2="680" y2="202" stroke="currentColor" stroke-opacity="0.4"/>
<text x="82" y="216" text-anchor="middle" font-size="9" fill="currentColor">98 µs</text>
<text x="282" y="130" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">mark assist: 270 µs → 3.201 µs</text>
<text x="560" y="216" text-anchor="middle" font-size="9" fill="currentColor">98 µs</text>
<text x="20" y="238" font-size="9" fill="currentColor" opacity="0.75">Nhìn STW pause thì thấy 29 µs và kết luận GC ổn. Cái ăn ngân sách nằm ở phần cam.</text>
</svg>

Từ đây trở đi, "chi phí GC" nghĩa là **CPU mà GC lấy của goroutine tick**, không phải STW pause — hai đại lượng khác nhau hai bậc độ lớn.

### 3.2 Heap sống quyết định TẦN SUẤT, không quyết định độ dài pause

Đổi đúng một biến: lượng heap sống server giữ (entity, room state, cache). Cùng chương trình, cùng tải rác 320 KB/tick, 1.800 tick:

| Heap sống | Số GC / 30 s | Một GC mỗi | STW pause p50 | tick p50 khi GC ngủ |
|---|---|---|---|---|
| ~0 MB | **732** | 2 tick | 44 µs | 96 µs |
| 200 MB | 12 | 150 tick | 51 µs | 104 µs |
| 800 MB | 4 | 450 tick | 20 µs | 234 µs |
| 2.000 MB | 2 | 900 tick | 21 µs | 886 µs |

Hai điều đọc ra được:

**Một.** STW pause **không đi theo heap sống**: 44 µs ở heap gần rỗng, 21 µs ở heap 2 GB. Không phải sai số đo — mark termination của Go không quét heap nên không có lý do gì dài ra. Ai còn trực giác "pause tỉ lệ heap" từ Java đời cũ thì đây là chỗ trực giác đó sai với Go.

**Hai.** Cái đi theo heap sống là **tần suất**. `GOGC=100` nghĩa là "chạy GC khi heap phình gấp đôi phần đang sống", nên heap sống nhỏ → ngưỡng nhỏ → GC liên tục: dòng đầu là **một GC mỗi 2 tick**, và **58 %** số tick (873/1.500) có GC chạy trong đó. Không có gai nào cả vì thuế thu đều trên gần như mọi tick — kiểu hỏng này khó chẩn đoán hơn gai, vì p50 tự nó xấu và không có gì để so.

*(Dòng 2.000 MB có tick p50 = 886 µs ngay cả khi GC ngủ: đó là RSS ~4,2 GB trên máy 16 GB gây TLB miss và page fault, không phải hiệu ứng GC.)*

> Heap sống không làm pause dài ra. Nó làm GC **đến thường xuyên hơn hoặc thưa hơn**, và làm mỗi lần đến **quét nhiều hơn**. Cả hai đều lấy CPU của tick.

Muốn tick sạch thì có hai núm: **giảm rác sinh ra mỗi tick** (bớt số lần GC đến) và **giảm thứ GC phải quét** (bớt công mỗi lần đến). Mục 3.3 vặn núm thứ hai — núm gần như không ai vặn.

---

## ⏸ Dừng lại — đoán trước #2

Hai world, **cùng 200.000 entity, cùng dữ liệu**, chỉ khác bố trí:

```
AoS:  E []*Entity  -- mỗi entity một object trên heap; struct có
                      PX PY VX VY float32, Name string, Tags []string, Owner *Entity
SoA:  px, py, vx, vy []float32  -- bốn slice liền mạch, không con trỏ nào
```

Chạy cùng tải rác 2 GB cạnh cả hai. **Tổng CPU mà GC tiêu, bên nào cao hơn và gấp mấy?**

```
(a) Xấp xỉ nhau — GC quét theo byte, hai bên cùng lượng dữ liệu
(b) AoS cao hơn 2–3 lần
(c) AoS cao hơn khoảng 20 lần
(d) SoA cao hơn, vì slice lớn phải quét nguyên khối
```

Câu hỏi phụ, khó hơn: **ở 1.000 entity, `Step` của bên nào nhanh hơn?**

---

### 3.3 Bố trí dữ liệu: hai phép đo tách rời, và chúng không cùng đáp án

Bắt đầu bằng phép đo ai cũng nghĩ tới trước: thời gian một `Step`. Ba biến thể — AoS con trỏ vừa cấp phát xong (object còn nằm liền nhau), AoS **phân mảnh** (entity đã sinh–chết vài giờ nên con trỏ rải rác, xáo thứ tự — trạng thái bình thường của world đang chạy), và SoA:

| Số entity | AoS liền mạch | AoS phân mảnh | SoA | SoA nhanh hơn AoS phân mảnh |
|---|---|---|---|---|
| 1.000 | **771 ns** | 1.535 ns | 1.008 ns | 1,52 × |
| 10.000 | 12,65 µs | 14,15 µs | **10,14 µs** | 1,40 × |
| 100.000 | 126,5 µs | 355,9 µs | **102,3 µs** | **3,48 ×** |

*(`go test -bench -benchtime=2s`, cả ba đều 0 allocs/op.)*

Đọc dòng đầu trước, vì nó phá được niềm tin: ở **1.000 entity, AoS liền mạch nhanh hơn SoA 1,31 lần** (771 so với 1.008 ns). Dữ liệu vừa trong L2 nên cache không phải nút thắt, và vòng lặp AoS đọc bốn trường của một entity trong đúng một cache line trong khi SoA phải giữ bốn con trỏ chạy trên bốn slice. "SoA luôn nhanh hơn" là **sai** ở quy mô nhỏ.

Lợi thế SoA chỉ mở ra khi dữ liệu vượt cache, và rộng nhất khi so với hiện trạng thật (phân mảnh): **3,48 lần ở 100.000 entity** — 355,9 µs là **2,14 %** ngân sách, 102,3 µs là **0,61 %**.

Nhưng 1,5 % ngân sách không phải lý do người ta bỏ AoS. Lý do nằm ở phép đo thứ hai, thứ không xuất hiện trong bất kỳ benchmark `ns/op` nào — vì `ns/op` đo lúc GC không chạy.

Giữ 200.000 entity sống ở mỗi bố trí, ném cùng **2 GB rác** vào bên cạnh, đo xem GC phải làm bao nhiêu việc:

| | Heap sống | Số object GC phải theo dõi | Byte quét mỗi chu kỳ | Số GC | **Tổng CPU của GC** |
|---|---|---|---|---|---|
| **AoS + con trỏ** | 17,9 MB | **400.316** | 16,20 MB | 78 | **2,07 s** |
| **SoA không con trỏ** | 3,4 MB | **290** | **0,18 MB** | 539 | **0,09 s** |
| tỉ lệ | 5,3 × | **1.380 ×** | **90 ×** | 0,14 × | **23 ×** |

Đáp án hộp #2 là **(c)** — chính xác là 23 lần.

Chú ý dòng "Số GC": bản SoA chạy GC **gần 7 lần nhiều hơn** (539 so với 78) — heap sống bé tí nên ngưỡng `GOGC` chạm liên tục — mà tổng CPU của GC vẫn thấp hơn 23 lần.

> **Số lần GC không phải là chi phí. Công quét mới là.** Tối ưu "gọi GC ít lần hơn" mà không giảm công quét là tối ưu nhầm đại lượng.

Cơ chế: **allocator Go ghi nhớ span nào chứa con trỏ**. Một `[]float32` được đánh dấu *pointer-free* nên GC **bỏ qua nguyên khối**, không đọc byte nào bên trong — 3,2 MB dữ liệu mà chỉ là **4 object** trong mắt GC. Ngược lại mỗi `*Entity` là một object phải đi vào, bên trong lại có `Name string`, `Tags []string`, `Owner *Entity`: 200.000 entity nở thành 400.316 object và 16,2 MB phải đọc, mỗi chu kỳ, mãi mãi.

<svg viewBox="0 0 700 270" role="img" aria-labelledby="gs37-b-t gs37-b-d" style="width:100%;height:auto">
<title id="gs37-b-t">Cùng dữ liệu, hai bố trí: GC phải đi lần 400.316 object hay bỏ qua 4 khối</title>
<desc id="gs37-b-d">Bên trên là array-of-structs có con trỏ: slice con trỏ trỏ tới các entity rải rác, mỗi entity lại trỏ tới string và slice tags, GC phải theo từng mũi tên. Bên dưới là struct-of-arrays: bốn slice float32 liền mạch được đánh dấu không chứa con trỏ nên GC bỏ qua nguyên khối.</desc>
<text x="20" y="18" font-size="12" font-weight="bold" fill="currentColor">AoS + con trỏ — GC phải đi lần từng mũi tên</text>
<rect x="20" y="30" width="200" height="22" rx="4" fill="#ef4444" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.35"/>
<text x="120" y="45" text-anchor="middle" font-size="10" fill="currentColor">E []*Entity — 200.000 con trỏ</text>
<g fill="#ef4444" fill-opacity="0.28" stroke="currentColor" stroke-opacity="0.3">
<rect x="290" y="26" width="66" height="30" rx="4"/>
<rect x="400" y="60" width="66" height="30" rx="4"/>
<rect x="250" y="82" width="66" height="30" rx="4"/>
<rect x="520" y="26" width="66" height="30" rx="4"/>
</g>
<g font-size="9" fill="currentColor">
<text x="323" y="45" text-anchor="middle">Entity</text>
<text x="433" y="79" text-anchor="middle">Entity</text>
<text x="283" y="101" text-anchor="middle">Entity</text>
<text x="553" y="45" text-anchor="middle">Entity</text>
</g>
<g stroke="currentColor" stroke-opacity="0.5" stroke-width="1.2" fill="none">
<path d="M220 41 L290 41"/>
<path d="M220 45 L400 75"/>
<path d="M220 47 L250 97"/>
<path d="M220 39 L520 41"/>
<path d="M356 41 L420 30"/>
<path d="M466 75 L512 98"/>
<path d="M316 97 L360 110"/>
<path d="M586 41 L632 30"/>
</g>
<g fill="#f59e0b" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.25">
<rect x="420" y="20" width="44" height="16" rx="3"/>
<rect x="512" y="92" width="44" height="16" rx="3"/>
<rect x="360" y="104" width="44" height="16" rx="3"/>
<rect x="632" y="20" width="44" height="16" rx="3"/>
</g>
<text x="620" y="112" text-anchor="end" font-size="10" font-weight="bold" fill="currentColor">400.316 object · 16,20 MB quét/chu kỳ · GC-CPU 2,07 s</text>
<line x1="20" y1="132" x2="680" y2="132" stroke="currentColor" stroke-opacity="0.25"/>
<text x="20" y="156" font-size="12" font-weight="bold" fill="currentColor">SoA không con trỏ — GC nhìn thấy 4 khối và bỏ qua</text>
<g stroke="currentColor" stroke-opacity="0.3">
<rect x="20" y="168" width="640" height="18" rx="3" fill="#84cc16" fill-opacity="0.25"/>
<rect x="20" y="190" width="640" height="18" rx="3" fill="#84cc16" fill-opacity="0.25"/>
<rect x="20" y="212" width="640" height="18" rx="3" fill="#84cc16" fill-opacity="0.25"/>
<rect x="20" y="234" width="640" height="18" rx="3" fill="#84cc16" fill-opacity="0.25"/>
</g>
<g font-size="10" fill="currentColor">
<text x="30" y="181">px []float32 — 800 KB liền mạch, pointer-free</text>
<text x="30" y="203">py []float32</text>
<text x="30" y="225">vx []float32</text>
<text x="30" y="247">vy []float32</text>
</g>
<text x="660" y="181" text-anchor="end" font-size="10" font-weight="bold" fill="currentColor">4 object · 0,18 MB · GC-CPU 0,09 s</text>
</svg>

Đây là chỗ `internal/sim/world.go` của repo đang đứng, và comment trong file nói đúng hai lý do:

```go
// World dùng struct-of-arrays: mỗi thuộc tính một slice liền mạch, entity là
// một index. Vòng lặp quét tuyến tính qua bộ nhớ nên cache-friendly, và không
// có con trỏ nào để GC phải đi lần. Đây là dạng sơ khai của ECS.
type World struct {
	px, py []float32
	vx, vy []float32
	w, h   float32
}
```

Hai lý do trong comment là **hai phép đo khác nhau**: "cache-friendly" là bảng thứ nhất (1,4–3,5 ×), "không có con trỏ để GC đi lần" là bảng thứ hai (23 ×). Lý do thứ hai lớn hơn một bậc, và nó mới là lý do ECS tồn tại — không phải SIMD, không phải "kiến trúc đẹp".

Cái giá: entity là một `int` index chứ không phải con trỏ cầm được; xoá entity phải swap-remove và mọi index giữ ở nơi khác thành rác; thêm một trường là thêm một slice. Đổi **tiện tay khi viết** lấy **rẻ khi chạy** — mục 4 nói khi nào không đáng đổi.

### 3.4 Sáu nguồn cấp phát ẩn — và cách hỏi trình biên dịch

Giờ là phần thực hành: trong Go, thứ **trông như không cấp phát** mà lại cấp phát. Cách kiểm chứng duy nhất đáng tin là hỏi thẳng trình biên dịch:

```
go build -gcflags='-m' ./escape
```

Output thật, lọc còn những dòng quyết định:

```
escape.go:17:31: tick escapes to heap                                    <- interface boxing
escape.go:35:13: make([]byte, 0, 8) escapes to heap
escape.go:37:15: append escapes to heap                                  <- append vượt cap
escape.go:45:63: "player-" + name + "-" + fmt.Sprint(...) escapes to heap
escape.go:65:41: &Ent{...} escapes to heap                               <- trả con trỏ local
escape.go:76:30: func literal escapes to heap                            <- closure bị lưu lại
escape.go:52:3:  func literal does not escape                            <- closure được inline
```

Ghép với `allocs/op` thật đo bằng `testing.AllocsPerRun(1000, …)`:

| Nguồn | Ví dụ | allocs/op | Vì sao |
|---|---|---|---|
| **Interface boxing** | `log.Log(1_000_000)` | **1** | Giá trị phải lên heap để nhét vào `any` |
| Interface boxing | `log.Log(7)` | **0** | Runtime cache sẵn int 0–255 — **cái bẫy** |
| Interface boxing | `log.Log(float32(1.5))` | **1** | Không có cache cho float |
| **Closure** | định nghĩa và gọi tại chỗ | **0** | Được inline, không escape |
| Closure | `Handlers = append(Handlers, func(){…})` | **1** | Bị lưu lại → biến capture lên heap |
| **append vượt cap** | `make([]byte,0,8)` rồi append 200 lần | **6** | cap 8→16→32→64→128→256 |
| **string concat** | `"player-" + name + "-" + itoa(id)` | **1** | String bất biến → phải cấp bộ nhớ mới |
| **defer trong vòng lặp** | 64 lần `defer mu.Unlock()` | **0** | Open-coded defer, nhưng xem dưới |
| **trả `*T` của local** | `func New() *Ent { return &Ent{…} }` | **1** | Không thể nằm trên stack |
| trả `T` | `func New() Ent { return Ent{…} }` | **0** | Copy giá trị, ở lại stack |

Ba chỗ hay bị nói quá:

**`defer` không cấp phát nữa, nhưng vẫn có giá.** Từ Go 1.14 defer được open-code, `allocs/op = 0`. Đo thời gian: 64 cặp `Lock/defer Unlock` mất **86,40 ns**, 64 cặp `Lock/Unlock` trần mất **15,73 ns** — chênh **1,10 ns mỗi `defer`**. Ở hot loop 100.000 entity đó là **110 µs = 0,66 % ngân sách** cho một từ khoá không làm gì cả. Bỏ `defer` khỏi vòng lặp là đúng, nhưng vì lý do này chứ không phải vì cấp phát.

**Closure chỉ cấp phát khi nó escape.** `func literal does not escape` là bằng chứng: closure dùng tại chỗ được inline sạch. Lời khuyên đúng không phải "đừng dùng closure trong hot loop" mà là *đừng để closure escape*.

**Interface boxing nguy hiểm nhất vì nó vô hình trong code**: không `new`, không `make`, không `&`. Nó qua mặt được cả test nếu bạn tình cờ test với số nhỏ — `Log(7)` ra 0 allocs, `Log(1_000_000)` ra 1. Mọi `any`, `fmt.Stringer`, `error` khác `nil`, mọi tham số `log.Printf` đều là chỗ này.

### 3.5 `sync.Pool`: rẻ, nhưng không rẻ bằng không cần Pool

Khi không thể tránh cấp phát (buffer snapshot phải tồn tại), `sync.Pool` là công cụ tiếp theo. Đo get+put so với cấp phát mới:

| Kích thước | `make` | `Pool` Get+Put | Pool nhanh hơn |
|---|---|---|---|
| 64 B | 10,42 ns | **6,59 ns** | 1,58 × |
| 512 B | 62,29 ns | 6,72 ns | 9,3 × |
| 4 KB | 300,2 ns | 6,92 ns | **43 ×** |
| 64 KB | 2.665 ns | 6,97 ns | **382 ×** |

Chi phí Pool **phẳng ~6,7 ns bất kể kích thước**, còn `make` tăng tuyến tính theo byte (phải zero bộ nhớ). Pool đáng giá tỉ lệ thuận với kích thước object. Ba trường hợp nó phản tác dụng, cả ba đo được:

**1 — `Put` một giá trị thay vì con trỏ.** `p.Put(s)` với `s` là `[]byte` phải đóng gói slice header vào `any`: **16,37 ns và 1 alloc/op (24 B)** — một pool mà vẫn cấp phát mỗi lần dùng. Đây là lý do mọi pool đúng đều `Put(*[]byte)`, và `go vet` **không** cảnh báo chuyện này.

**2 — Bạn vốn có thể sở hữu hẳn buffer.** Buffer là field của struct room, tái sử dụng bằng `buf[:0]`: **1,907 ns** so với 6,92 ns của Pool cùng kích thước — **Pool chậm hơn 3,6 lần**. Pool tồn tại để chia sẻ giữa các goroutine không đoán trước được; simulation của một room là **single-threaded** (bài 28) và biết chính xác nó cần bao nhiêu buffer. Dùng Pool ở đây là trả 5 ns cho một bài toán bạn không có.

**3 — Pool bị dọn theo chu kỳ GC.** Put 100 object rồi đếm số lần `New` bị gọi lại:

```
sau 1 lần GC:   0/100 lần Get phải cấp phát mới   (victim cache giữ lại)
sau 2 lần GC: 100/100 lần Get phải cấp phát mới   (sạch trơn)
```

Với tần suất GC ở mục 3.2 (một GC mỗi 150 tick ở heap 200 MB), pool sống được ~300 tick = 5 giây: đủ tốt cho buffer dùng mỗi tick, **vô dụng** cho thứ dùng mỗi 30 giây — mỗi lần cần là một lần cấp phát mới, cộng thêm 6,7 ns phí Pool.

---

## ⏸ Dừng lại — đoán trước #3

Server 60 Hz đang bị GC ăn tick. Team đề xuất: **`GOGC=off` và `GOMEMLIMIT` để chặn trần RAM** — GC chỉ chạy khi sắp chạm trần, phần lớn thời gian không có GC nào cả. Máy có 8 GB, heap sống 200 MB.

Ai đó đặt `GOMEMLIMIT=280MiB` với lý do "heap sống có 200 MB, chừa 40 % là thoải mái, và giữ RSS thấp thì chạy được nhiều container hơn".

**Chuyện gì xảy ra với GC-CPU và tick p99?**

```
(a) Gần như không có GC — đúng như kỳ vọng
(b) GC chạy thưa hơn GOGC=100 một chút, RAM thấp hơn hẳn: lãi cả hai đầu
(c) GC chạy dày đặc hơn GOGC=100 nhiều lần và ăn gần nửa một core
(d) Chương trình OOM ngay khi rác vượt 80 MB
```

---

### 3.6 `GOGC` và `GOMEMLIMIT`: bảng đánh đổi RAM ↔ CPU

Cùng workload mục 2 (heap sống 200 MB, 320 KB rác/tick, 1.800 tick trong 30 s), chỉ đổi cấu hình runtime:

| Cấu hình | Số GC / 30 s | GC-CPU | = phần một core | RSS (`MemStats.Sys`) | tick max |
|---|---|---|---|---|---|
| `GOGC=100` (mặc định) | 11 | 2,47 s | 8,2 % | **481 MB** | 8.476 µs |
| `GOGC=400` | 3 | 0,65 s | 2,2 % | 1.138 MB | 9.202 µs |
| `GOGC=off` + `GOMEMLIMIT=1GiB` | 2 | 0,35 s | 1,2 % | 1.040 MB | 3.950 µs |
| `GOGC=off` + `GOMEMLIMIT=3GiB` | **0** | **0,00 s** | **0 %** | 2.570 MB | 4.565 µs |
| `GOGC=off` + `GOMEMLIMIT=280MiB` | **72** | **14,16 s** | **47,2 %** | 292 MB | 13.528 µs |

*(Cột `tick max` dao động mạnh giữa các lần chạy — chỉ so bậc độ lớn. Ba cột giữa lặp lại ổn định.)*

Đáp án hộp #3 là **(c)**, dòng cuối bảng: **72 chu kỳ GC trong 30 giây, 47,2 % một core cháy vào GC**, tick p99 nhảy lên **7.141 µs**. `GOMEMLIMIT` là trần **cứng** tính trên **toàn bộ bộ nhớ runtime**, không chỉ heap sống — và runtime chạy GC sớm hơn trần để không bao giờ chạm vào nó. Heap sống 200 MB cộng metadata đẩy `Sys` lên 292 MB, nên chỗ trống thật cho rác chỉ còn vài MB: đo được **một GC mỗi 25 tick**. Đây là lý do phép tính ngây thơ "280 − 200 = 80 MB chỗ trống, chia 320 KB/tick ra 250 tick giữa hai GC" sai **10 lần** — headroom danh nghĩa không phải headroom thật. Đây là **GC thrash** — biểu hiện y hệt spiral of death ở bài 6, chỉ khác thứ bị cạn không phải thời gian mà là chỗ trống trên heap.

Quy tắc rút ra:

> `GOMEMLIMIT` đặt theo **heap sống lúc đông nhất**, không theo lúc bình thường. Khoảng cách từ heap sống tới trần chính là thứ bạn đang mua; khoảng đó nhỏ hơn vài lần lượng rác sinh ra giữa hai GC thì bạn vừa mua GC thrash.

Ba dòng trên cùng là đánh đổi lành mạnh: `GOGC=100 → 400` làm RSS tăng 2,37 lần (481 → 1.138 MB) đổi lấy GC-CPU giảm 3,8 lần (2,47 → 0,65 s). Với game server đây gần như luôn là món hời — **RAM rẻ, tick p99 là sản phẩm**. Node 32 GB chạy 20 trận thì mỗi trận có 1,6 GB; tiêu 600 MB thay vì 250 MB để cắt 2/3 công GC là đổi đúng chiều.

Cấu hình dùng thật trong production Go stateful: **`GOGC=off` + `GOMEMLIMIT` ở khoảng 70–80 % RAM container**. *(70–80 % là kinh nghiệm vận hành phổ biến, không phải kết quả đo của bài này.)*

---

## 4. Ranh giới hot loop — và chỗ dừng lại

Mọi thứ ở mục 3 đều có giá bằng độ phức tạp code, và trả giá đó sai chỗ là lãng phí thuần. **Hot loop là code chạy `tick_rate × N` lần mỗi giây** — chỉ vậy. Vẽ ranh giới bằng phép nhân, không bằng cảm giác:

| Vùng | Tần suất ở 60 Hz, 1.000 entity, 100 player | Cấp phát cho phép |
|---|---|---|
| `sim.Step`, va chạm, AOI query | 60 × 1.000 = **60.000 lượt/s** | **0** |
| Dựng snapshot, serialize | 60 × 100 = 6.000 lượt/s *(20 × 100 nếu snapshot 20 Hz)* | 0, dùng buffer sở hữu sẵn |
| Xử lý input đến | ~6.000 lượt/s | 0 trên đường chính |
| Player join/leave | vài lần mỗi phút | thoải mái |
| Matchmaking, load room, ghi DB | vài lần mỗi phút, **không trên goroutine tick** | thoải mái |
| Log, metric, admin API | tuỳ | thoải mái, miễn không gọi từ trong tick |

Ba dòng đầu là hot loop. Ba dòng dưới **không**, và tối ưu chúng là đổi code dễ đọc lấy 0 µs.

Hai mốc để tự chặn tay, tính từ bench thật của repo — `sim.Step` 100.000 entity là **119 µs = 0,71 %** ngân sách với **0 allocs/op** *(bài 8; chạy lại hôm nay ra 124 µs, cùng bậc)*: vòng lặp vật lý đã chỉ chiếm 0,71 % ở quy mô lớn hơn mọi trận thật nên **không còn gì để cắt** — chỗ đáng làm là **serialization và bố trí dữ liệu**, vì chúng nhân với số player và sinh ra rác. Và hàm chạy dưới **1.000 lượt/giây** thì cấp phát của nó không xuất hiện trong bất kỳ profile nào; để nó yên.

### 4.1 Vì sao `TestStepDoesNotAllocate` đáng giá hơn một dòng comment

Repo `game-server` không viết comment "đừng cấp phát ở đây" mà viết cái này:

```go
// Ràng buộc quan trọng nhất của hot loop: không cấp phát. Test này sẽ đỏ ngay
// khi ai đó thêm một closure, một append, hay một interface boxing vào Step.
func TestStepDoesNotAllocate(t *testing.T) {
	w := NewWorld(1000, 1024, 1024, 7)
	if n := testing.AllocsPerRun(100, func() { w.Step(dt) }); n != 0 {
		t.Fatalf("Step cấp phát %v lần/tick, phải là 0", n)
	}
}
```

Khác biệt giữa comment và test này là **thời điểm phát hiện**. Cấp phát trong hot loop **không làm gì sai cả**: không crash, không sai kết quả, test logic vẫn xanh, p50 vẫn đẹp. Nó chỉ khiến GC đến thường xuyên hơn, và hậu quả hiện ra ở p99, trên production, sau vài tuần, dưới dạng "thỉnh thoảng game hơi giật".

Thử phá nó — copy package ra ngoài repo, thêm đúng một dòng ai cũng thấy vô hại:

```go
Sink = statLine{n: len(wd.px)} // "chỉ một dòng metric thôi mà"
```

`statLine` có method `String()`, `Sink` kiểu `fmt.Stringer`. Không `new`, không `make`, không `&`. Kết quả:

```
--- FAIL: TestStepDoesNotAllocate (0.00s)
    world_test.go:34: Step cấp phát 1 lần/tick, phải là 0
FAIL
```

Đỏ trong 0,27 giây, ở máy người viết, trước khi commit — thứ một comment không làm được. Ràng buộc hiệu năng **được diễn đạt bằng test hoặc nó không tồn tại**, vì reviewer không nhìn thấy interface boxing trong diff và `go vet` cũng không.

Nói luôn điểm mù của chính test này. `testing.AllocsPerRun` kết thúc bằng:

```go
return float64(mallocs / uint64(runs))   // chia SỐ NGUYÊN, có chú thích trong source
```

Chia số nguyên. Nên một cấp phát **khấu hao** — `Stats = append(Stats, …)` với slice tăng gấp đôi là khoảng 8 lần cấp phát trên 100 lần chạy — ra `8/100 = 0` và **test vẫn xanh**. Đã thử: thêm đúng dòng append đó vào `Step` thì test không bắt được.

Cách bịt: gác trên `B/op` của benchmark trong CI (`b.ReportAllocs()` đã có sẵn), hoặc gọi `AllocsPerRun` với `runs` nhỏ. Biết test bắt cái gì quan trọng ngang việc có nó.

---

## 5. Tính tay

**Bài 1.** Server 60 Hz, heap sống 400 MB, `GOGC=100`, mỗi tick sinh 500 KB rác.
- Bao nhiêu tick giữa hai chu kỳ GC? Bao nhiêu giây?
- Mark assist làm mỗi tick trong pha mark nở từ 100 lên 900 µs, pha mark kéo dài 20 tick. Một chu kỳ GC lấy thêm tổng cộng bao nhiêu ms?
- Trong một phút, bao nhiêu phần trăm số tick bị GC chạm vào? Con số đó lộ ra ở p90, p99 hay p99,9?

**Bài 2.** World 50.000 entity. AoS: mỗi entity 1 object 64 B + 1 slice `Tags` = 2 object. SoA: 6 slice `float32`.
- Mỗi bên bao nhiêu object trong mắt GC? Tỉ lệ?
- Nếu bản AoS quét 4,05 MB mỗi chu kỳ, dùng tỉ lệ 90 × ở mục 3.3 thì bản SoA quét bao nhiêu?
- SoA cần thêm trường `Owner` trỏ tới entity khác. Lưu thành `owner []*Entity` thì con số vừa tính ra sao — và `owner []int32` thì sao?

**Bài 3.** Snapshot buffer 8 KB, dựng mới mỗi tick cho mỗi player, 100 player, 20 Hz.
- Bao nhiêu MB rác mỗi giây? Với `GOGC=100` và heap sống 300 MB, bao nhiêu giây một chu kỳ GC?
- Dùng bảng mục 3.5: `sync.Pool` tiết kiệm bao nhiêu ns mỗi lần và bao nhiêu ms mỗi giây? *(Nội suy giữa mốc 4 KB và 64 KB — ghi rõ đây là nội suy.)*
- Nếu mỗi room sở hữu **một** buffer 8 KB dùng lại cho cả 100 player trong tick đó thì rác còn bao nhiêu MB/s, và Pool còn giải quyết vấn đề gì không?

---

## 6. Chuyển giao

**Bạn nhận một MMO-lite đang chạy production.** Một node giữ 12 room, mỗi room 3.000 entity, tổng heap sống 2,1 GB. Container 8 GB, `GOGC=100`, không đặt `GOMEMLIMIT`, tick 60 Hz. Dashboard: p50 = 1,4 ms, p99 = 19 ms trên ngân sách 16,67 ms. Người chơi than "giật đều đặn vài giây một lần". World dùng AoS con trỏ, mỗi entity có `Name string`, `Inventory []Item`, `Target *Entity`.

1. Số nào bạn đo **đầu tiên** để phân biệt "GC ăn tick" với "logic game chậm", và ngưỡng nào của số đó cho bạn kết luận?
2. Heap sống 2,1 GB với `GOGC=100`: GC kích hoạt ở mốc bao nhiêu? Con số đó so với container 8 GB nói gì về rủi ro OOM mà nhìn dashboard RSS sẽ không thấy?
3. Bạn đề xuất `GOGC=off` + `GOMEMLIMIT`. Đặt bao nhiêu, và cần biết thêm **một** con số nào trước khi dám đặt?
4. Chuyển AoS → SoA cho 36.000 entity là việc vài tuần. Dùng tỉ lệ 23 × GC-CPU ở mục 3.3, ước lượng phần tiết kiệm được — rồi chỉ ra ước lượng đó sai ở đâu, cụ thể `Inventory []Item` làm hỏng giả định nào.
5. Cách rẻ hơn, không đụng bố trí dữ liệu: **12 room = 12 process**, mỗi process heap sống 175 MB. Nó cắt được gì trong ba đại lượng (tần suất GC, công quét mỗi chu kỳ, mark assist trên goroutine tick), và **không** cắt được gì?
6. Một thành viên nói: "GC là vấn đề của Go, viết lại bằng Rust là hết." Với bộ số trên, phần nào của 19 ms p99 **vẫn còn nguyên** sau khi viết lại?
7. **Câu khó nhất.** Bạn làm hết: SoA, zero-alloc, `GOMEMLIMIT` đúng, p99 xuống 3 ms. Sáu tháng sau game thêm chợ trong game: mỗi giao dịch tạo object và giữ lịch sử, nên heap sống của một room **phình theo thời gian sống của room** thay vì theo số entity — room chạy 6 giờ có heap sống gấp 4 lần room vừa mở. `GOMEMLIMIT` cố định giờ sai với ít nhất một trong hai loại room. Có tồn tại một giá trị đúng cho cả hai không — và nếu không, thứ phải sửa nằm ở tầng runtime, tầng kiến trúc room, hay tầng thiết kế game? Trả lời phải nói được **ai** có quyền quyết định thứ đó.

---

## 7. Tóm tắt

- Gai p99 tuần hoàn là chữ ký của GC: **1 GC mỗi 164 tick**, gai cách nhau **176 tick = 2,93 s**, p50 = 98 µs nhưng max = 3.201 µs (**19,2 % ngân sách**); lần chạy tệ nhất 17.310 µs = **103,8 %** — mất trọn một tick.
- **STW pause không phải thủ phạm**: 29 µs p50, 61 µs max, và **không tăng theo heap sống** (44 µs ở heap rỗng, 21 µs ở heap 2 GB). Thủ phạm là **mark assist**: tick lúc GC chạy p50 **270 µs**, p99 **2.542 µs**, so với **98 µs** lúc GC ngủ.
- Heap sống quyết định **tần suất**, không quyết định độ dài pause. Heap gần rỗng → **một GC mỗi 2 tick, 58 % số tick bị GC chạm** — hỏng đều thay vì hỏng theo gai, khó chẩn đoán hơn.
- Bố trí dữ liệu có **hai phép đo, không cùng đáp án**. Tốc độ `Step` ở 100.000 entity: SoA nhanh hơn AoS phân mảnh **3,48 ×** (102,3 so với 355,9 µs), nhưng ở 1.000 entity SoA **chậm hơn 1,31 ×**. Chi phí GC với 200.000 entity: **290 object / 0,18 MB / 0,09 s GC-CPU** (SoA) so với **400.316 object / 16,20 MB / 2,07 s** (AoS) — **23 × CPU**. Đây mới là lý do ECS tồn tại.
- **Số lần GC không phải chi phí; công quét mới là.** SoA chạy GC nhiều hơn 7 lần mà tổng GC-CPU vẫn thấp hơn 23 lần.
- Cấp phát ẩn, xác nhận bằng `-gcflags=-m`: interface boxing 1 alloc — nhưng `Log(7)` ra **0** vì runtime cache int 0–255, đúng cái bẫy làm test qua mặt; closure **khi escape** 1; append vượt cap 6; string concat 1; trả `*T` của local 1. `defer` **không cấp phát** từ Go 1.14 nhưng tốn **1,10 ns/lần** = **0,66 % ngân sách** ở 100.000 entity.
- `sync.Pool` phẳng **~6,7 ns** bất kể kích thước nên lãi tỉ lệ thuận với object: **1,58 ×** ở 64 B, **382 ×** ở 64 KB. Phản tác dụng khi `Put` giá trị thay vì con trỏ (**16,37 ns + 1 alloc**), khi buffer sở hữu sẵn đủ dùng (**1,907 ns — Pool chậm hơn 3,6 ×**), và khi nhịp dùng thưa hơn nhịp GC (**sạch sau 2 chu kỳ**).
- `GOGC=100 → 400`: RSS **×2,37** đổi GC-CPU **÷3,8**. Nhưng `GOMEMLIMIT` sát heap sống (280 MiB cho heap sống 200 MB) gây **GC thrash: 72 chu kỳ/30 s, 47,2 % một core, tick p99 7.141 µs**. Đặt trần theo heap sống **lúc đông nhất**.
- **Hot loop = code chạy `tick_rate × N` lần/giây.** `sim.Step` 100.000 entity chỉ tốn **0,71 % ngân sách, 0 allocs/op** — không còn gì để cắt. Dưới 1.000 lượt/giây thì để yên.
- Ràng buộc hiệu năng **được diễn đạt bằng test hoặc nó không tồn tại**. `TestStepDoesNotAllocate` bắt một dòng interface boxing trong 0,27 giây; điểm mù là cấp phát khấu hao, vì `AllocsPerRun` chia **số nguyên** nên 8 alloc/100 lần chạy ra 0.

→ **Bài 38 — Concurrency đúng cách**: hot loop đã sạch cấp phát. Bài sau hỏi chuyện còn lại của Go: bao nhiêu goroutine là đủ, và chỗ nào song song hoá giúp được, chỗ nào chỉ thêm bug.
