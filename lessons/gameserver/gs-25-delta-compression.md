# Bài 25 — Delta compression & baseline

## 1. Mục tiêu

Sau bài này bạn có thể:

- Định nghĩa **baseline** bằng đúng một câu và chỉ ra **ack bitfield của bài 14** là cơ chế duy nhất cho server biết baseline nào an toàn.
- Tính chi phí **CPU và RAM** của việc giữ baseline riêng cho từng client, và nói được ở quy mô nào chi phí đó vượt qua lợi ích băng thông.
- Đọc phân phối **tuổi baseline** và giải thích vì sao tuổi tối thiểu là 2 snapshot **ngay cả khi không mất một gói nào**.
- Chọn **K** — số snapshot phải giữ — từ tỉ lệ keyframe mong muốn, thay vì đoán.
- Tính **điểm hoà vốn** của delta theo phần trăm entity đổi, và chỉ ra vùng mà delta **đắt hơn** full snapshot.
- Nói rõ vì sao **quantize phải đứng trước delta**, và điều gì hỏng nếu đảo thứ tự.

---

## 2. Triệu chứng

Bạn vừa bật delta compression. Thế giới 1.000 entity, mỗi entity 10 byte sau khi đã quantize ở bài 24, snapshot 20 Hz. Full snapshot là **10.000 byte**. Delta chỉ gửi entity nào khác với bản client đã xác nhận: mỗi entity đổi tốn `2 byte id + 10 byte payload = 12 byte`.

Trên máy dev, 8 client, người chơi đi lại bình thường — **11% entity khác baseline** mỗi lần gửi:

```
full snapshot :  8 × 10.000 × 20 = 1,60 MB/s
delta         :  8 ×  1.320 × 20 = 0,21 MB/s      −86,8 %
```

Bạn deploy. Ba ngày sau, giờ cao điểm, 100 người trong một trận hỗn chiến ở giữa bản đồ — **86,1% entity khác baseline**:

```
full snapshot : 100 × 10.000 × 20 = 20,00 MB/s
delta         : 100 × 10.332 × 20 = 20,66 MB/s    +3,3 %
```

Băng thông **tăng**. Không phải "tiết kiệm ít đi" — tăng thật, vượt qua chính cái nó thay thế. Và đó mới là nửa nhẹ của hoá đơn. Nửa nặng nằm ở chỗ không hiện trên biểu đồ bandwidth: server bây giờ dựng **100 gói khác nhau mỗi tick**, mỗi gói so với một mốc khác nhau, vì mỗi client đã ack tới một chỗ khác nhau.

Bài 23 nói delta là mô hình rẻ nhất cho state thay đổi liên tục, "nhưng cần mốc". Bài này là hoá đơn của cái mốc đó.

*(Mọi con số byte và µs trong bài đo bằng một chương trình Go 1.26 encode 1.000 entity thật; phân phối tuổi baseline lấy từ mô phỏng 200.000 snapshot. Cách đo ghi ở mục 3.3.)*

---

## ⏸ Dừng lại — đoán trước #1

**Vì sao delta compression làm băng thông TĂNG ở trường hợp trên, trong khi nó gửi ít thông tin hơn full snapshot?**

```
(a) Vì phải gửi thêm keyframe định kỳ để reset baseline
(b) Vì mỗi entity đổi phải mang thêm id, còn full snapshot thì không cần id nào
(c) Vì delta cần header lớn hơn để mô tả baseline nào đang được dùng
(d) Vì ack bị mất nên baseline cũ, và delta so với baseline cũ thì to hơn
```

Ba trong bốn phương án đều là chi phí có thật. Chỉ một cái đủ lớn để lật dấu.

---

## 3. Lý thuyết

### 3.1 Baseline: mốc, không phải bản nén

Delta không nén gì cả. Nó **trừ**. Muốn trừ thì phải có số bị trừ, và số bị trừ đó phải là thứ **client chắc chắn đang có trong tay**.

> **Baseline của một client = snapshot gần nhất mà server đã có bằng chứng client đó nhận được.**
> Không phải "snapshot gần nhất đã gửi". Gửi không phải là bằng chứng.

Chỗ này là nơi bài 14 quay lại. Server gửi snapshot trên kênh **unreliable-sequenced** — không gửi lại, không chờ. Bằng chứng duy nhất là trường `Ack` + `AckBits` mà client gắn vào mọi packet nó gửi lên. Mỗi packet ack báo trạng thái của 33 snapshot gần nhất, nên server chỉ cần lấy `Ack` cao nhất đã nhận là ra baseline.

```go
// server, mỗi khi nhận packet từ client
func (c *ClientConn) onAck(h Header) {
    if seqGreaterThan(h.Ack, c.baselineSeq) {  // hàm wrap-safe của bài 14
        c.baselineSeq = h.Ack
    }
}
// dựng snapshot: diff(world, history[c.baselineSeq])
```

Ba dòng. Toàn bộ phần "khó" của delta compression nằm ở chỗ khác: **`c.baselineSeq` là một biến riêng của từng client**, và `history[...]` là thứ server phải giữ lại.

Chú ý một hệ quả trực tiếp: delta compression **chỉ chạy được trên kênh có ack**. Bài 14 nói snapshot không cần gửi lại nên "ack chỉ để đo RTT" — sai một nửa. Ack còn là thứ dịch baseline. Bỏ ack đi thì không có delta.

### 3.2 Baseline là PER-CLIENT — và đây là toàn bộ cái giá

Full snapshot có một tính chất mà bạn chỉ nhận ra khi mất nó: **một gói dùng cho mọi người** — serialize một lần, `sendto` 100 lần. Delta không có tính chất đó. Client A ack tới snapshot 1.041, client B tới 1.039, client C vừa reconnect và chưa ack gì: ba gói khác nhau mô tả **cùng một thế giới**.

<svg viewBox="0 0 700 300" role="img" aria-labelledby="gs25-a-t gs25-a-d" style="width:100%;height:auto">
<title id="gs25-a-t">Một thế giới, ba baseline, ba gói delta khác nhau</title>
<desc id="gs25-a-d">Server giữ một vòng lịch sử tám snapshot từ 1036 tới 1043. Client A trỏ baseline vào snapshot 1041 nên delta chỉ hai tick, gói nhỏ. Client B trỏ vào 1039, delta bốn tick, gói lớn hơn. Client C trỏ vào 1035 đã rơi khỏi vòng lịch sử nên phải nhận một keyframe full snapshot.</desc>
<text x="20" y="22" font-size="11" font-weight="bold" fill="currentColor">vòng lịch sử của server — K = 8 snapshot (dùng chung cho mọi client)</text>
<rect x="20" y="34" width="72" height="34" rx="5" fill="#64748b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
<text x="56" y="55" text-anchor="middle" font-size="10" fill="currentColor">1036</text>
<rect x="98" y="34" width="72" height="34" rx="5" fill="#64748b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
<text x="134" y="55" text-anchor="middle" font-size="10" fill="currentColor">1037</text>
<rect x="176" y="34" width="72" height="34" rx="5" fill="#64748b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
<text x="212" y="55" text-anchor="middle" font-size="10" fill="currentColor">1038</text>
<rect x="254" y="34" width="72" height="34" rx="5" fill="#f59e0b" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.4"/>
<text x="290" y="55" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">1039</text>
<rect x="332" y="34" width="72" height="34" rx="5" fill="#64748b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
<text x="368" y="55" text-anchor="middle" font-size="10" fill="currentColor">1040</text>
<rect x="410" y="34" width="72" height="34" rx="5" fill="#84cc16" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.4"/>
<text x="446" y="55" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">1041</text>
<rect x="488" y="34" width="72" height="34" rx="5" fill="#64748b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
<text x="524" y="55" text-anchor="middle" font-size="10" fill="currentColor">1042</text>
<rect x="566" y="34" width="72" height="34" rx="5" fill="#3b82f6" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.4"/>
<text x="602" y="49" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">1043</text>
<text x="602" y="62" text-anchor="middle" font-size="9" fill="currentColor">đang gửi</text>
<text x="646" y="55" font-size="10" fill="currentColor" opacity="0.75">80 KB</text>
<line x1="446" y1="72" x2="200" y2="112" stroke="#84cc16" stroke-width="1.5" stroke-opacity="0.8"/>
<line x1="290" y1="72" x2="200" y2="182" stroke="#f59e0b" stroke-width="1.5" stroke-opacity="0.8"/>
<line x1="30" y1="72" x2="200" y2="252" stroke="#ef4444" stroke-width="1.5" stroke-opacity="0.7" stroke-dasharray="4 3"/>
<text x="24" y="86" font-size="9" fill="currentColor" opacity="0.7">1035 đã rơi khỏi vòng</text>
<rect x="200" y="98" width="440" height="30" rx="5" fill="#84cc16" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
<text x="212" y="118" font-size="10" fill="currentColor">client A · baseline 1041 · tuổi 2 · delta 2.707 B</text>
<rect x="200" y="168" width="440" height="30" rx="5" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
<text x="212" y="188" font-size="10" fill="currentColor">client B · baseline 1039 · tuổi 4 · delta 4.804 B</text>
<rect x="200" y="238" width="440" height="30" rx="5" fill="#ef4444" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
<text x="212" y="258" font-size="10" fill="currentColor">client C · baseline hết hạn · KEYFRAME · 10.000 B</text>
<text x="20" y="118" font-size="10" font-weight="bold" fill="currentColor">A</text>
<text x="20" y="188" font-size="10" font-weight="bold" fill="currentColor">B</text>
<text x="20" y="258" font-size="10" font-weight="bold" fill="currentColor">C</text>
<text x="20" y="288" font-size="10" fill="currentColor" opacity="0.8">một thế giới · ba mốc · ba gói phải dựng riêng mỗi tick</text>
</svg>

**Bộ nhớ.** Cách làm ngây thơ: mỗi client giữ bản sao K snapshot gần nhất của riêng nó. Snapshot `S = 1.000 × 10 = 10.000 byte`:

| Thế giới | S | K | Client | Ngây thơ (bản sao/client) | Vòng dùng chung |
|---|---|---|---|---|---|
| 1.000 ent × 10 B | 10 KB | 8 | 100 | 80 KB × 100 = **8 MB** | **80 KB** |
| 1.000 ent × 10 B | 10 KB | 8 | 1.000 | 80 KB × 1.000 = **80 MB** | **80 KB** |
| 10.000 ent × 10 B | 100 KB | 8 | 1.000 | 800 KB × 1.000 = **800 MB** | **800 KB** |
| 10.000 ent × 24 B | 240 KB | 16 | 5.000 | 3,84 MB × 5.000 = **19,2 GB** | **3,84 MB** |

Cột cuối là lối thoát và nó gần như miễn phí: **trước khi có AOI, mọi client nhìn cùng một thế giới**, nên K snapshot đó giống hệt nhau. Giữ **một** vòng lịch sử cho cả server, mỗi client chỉ giữ một `uint16 baselineSeq` — chi phí per-client rơi từ 80 KB xuống **2 byte**. Bảng trên vì thế không phải chi phí của delta; nó là chi phí của một cách cài sai mà rất nhiều người cài đúng như thế lần đầu.

**CPU thì không có lối thoát tương tự.** Dù lịch sử dùng chung, phép trừ vẫn phải chạy riêng cho từng client vì mốc khác nhau. Đo trên M-series, encode 1.000 entity:

```
encodeFull            3,20 µs/op
delta mức entity      1,51 µs/op  (10% đổi)  →  2,34 µs (100% đổi)
delta mức field       2,05 µs/op  (10% đổi)  →  3,08 µs (100% đổi)
```

**2,05 ns cho mỗi entity được so sánh.** Nhân lên:

| Client | Entity | Phép so sánh mỗi tick | Thời gian/tick | Ở 20 Hz |
|---|---|---|---|---|
| 100 | 1.000 | 0,10 M | 0,21 ms | **0,41% một core** |
| 500 | 5.000 | 2,50 M | 5,12 ms | 10,25% một core |
| 1.000 | 10.000 | 10,0 M | 20,50 ms | **41% một core** |
| 5.000 | 50.000 | 250 M | **512,50 ms** | **10,25 core** |

*(Bậc độ lớn, không phải hằng số — thay đổi theo phần cứng, cách bố trí bộ nhớ và tỉ lệ entity đổi.)*

Chi phí là `client × entity`, và trong hầu hết game số entity **tăng theo số người chơi** — nên đó là `O(N²)`. Ở 100 client, delta tốn 0,41% một core để tiết kiệm `100 × 7.206 × 20 = 14,41 MB/s`: không có gì để tranh luận. Ở 5.000 client, riêng phép trừ ăn 10 core và vượt ngân sách 50 ms của một chu kỳ snapshot **10,25 lần**.

> **Delta đổi CPU và RAM lấy băng thông. Ở quy mô nhỏ đó là món hời lố bịch. Ở quy mô lớn nó là một vòng lặp bậc hai, và không có hằng số nào cứu được vòng lặp bậc hai.**

Bài 26 phá cái `O(N²)` đó bằng cách cắt vế `entity` xuống — nhưng đó là bài sau.

### 3.3 Tuổi baseline: 2 tick, kể cả khi không mất gói nào

Baseline già cỡ nào? Trực giác nói mạng sạch thì baseline là snapshot ngay trước — tuổi 1. Trực giác sai. Mô phỏng: snapshot 20 Hz, một chiều 20 ms (RTT 40 ms), client gửi packet ack 30 Hz mang bitfield 33 của bài 14, **cả snapshot lẫn packet ack đều chịu cùng tỉ lệ mất**, 200.000 snapshot mỗi cấu hình.

| Loss | Tuổi TB | p99 | Max | Phân bố (K = 8) |
|---|---|---|---|---|
| 0% | **2,000** | 2 | 2 | tuổi 2: 100% |
| 5% | 2,079 | 3 | 6 | 2: 92,53% · 3: 7,09% · 4: 0,363% · 5: 0,018% · 6: 0,0005% |
| 10% | 2,166 | 4 | 8 | — |
| 20% | 2,380 | 5 | 9 | — |

**Ở loss 0% tuổi baseline là đúng 2, không dao động một chút nào.** Đó không phải hệ quả của mất gói mà của vòng đi-về: snapshot rời server → tới client (20 ms) → chờ lượt packet ack kế tiếp (0–33,3 ms) → ack về server (20 ms). Tổng 40–73,3 ms trong khi một snapshot chỉ dài 50 ms, nên thông tin ack mới nhất luôn trễ hai nhịp. Hai hệ quả:

- **Delta bạn gửi là delta 100 ms, không phải 50 ms.** Mọi ước lượng kích thước gói dựa trên "% entity đổi trong một tick" đang tính thiếu một nửa.
- **RTT và nhịp ack quyết định sàn, mất gói chỉ làm cái đuôi.** Muốn baseline trẻ hơn thì tăng tần suất ack, không phải giảm loss.

Cái đuôi đó nhẹ hơn người ta tưởng. Lấy mô hình churn ngẫu nhiên 12% entity mỗi tick — so với baseline tuổi `a`, tỉ lệ entity khác là `1 − 0,88^a` — rồi trung bình theo đúng phân phối tuổi ở trên:

```
loss  0 % : 2.707 B / snapshot
loss  5 % : 2.794 B / snapshot   +3,22 %
loss 20 % : 3.117 B / snapshot  +15,14 %
```

**Loss 5% chỉ làm delta phồng 3,22%.** Ack bitfield của bài 14 đã làm gần hết việc: mất một packet ack không mất thông tin vì 32 packet sau lặp lại nó. Cài ack từng gói thay vì bitfield thì cột này mới xấu — đó là lý do bài 14 phải đứng trước bài 25.

*(Mô hình churn ngẫu nhiên là **cận trên**. Trong game thật, entity đang di chuyển thì tick nào cũng đổi và entity đứng im thì không tick nào đổi, nên phần "entity mới đổi thêm" khi baseline già đi ít hơn công thức này. Dùng nó để chọn K, đừng dùng để hứa băng thông.)*

---

## ⏸ Dừng lại — đoán trước #2

Server giữ K snapshot gần nhất. Baseline của một client rơi ra ngoài K thì server **không còn cái để trừ** và buộc phải gửi full snapshot — một **keyframe**.

**Ở loss 5%, snapshot 20 Hz, RTT 40 ms, ack bitfield 33 — với K = 4 thì bao lâu server phải gửi một keyframe cho một client?**

```
(a) khoảng 2 giây một lần
(b) khoảng 30 giây một lần
(c) khoảng 5 phút một lần
(d) không bao giờ, trừ khi client vừa vào trận hoặc mất kết nối
```

Câu hỏi phụ: đổi K từ 4 xuống 2 thì con số đó thay đổi bao nhiêu lần?

---

### 3.4 Keyframe, và vì sao K là núm vặn duy nhất

Đáp án là **(c)** — và nó gần (d) hơn bạn nghĩ.

Chạy cùng mô phỏng ở mục 3.3, đếm số snapshot phải chuyển thành keyframe, với băng thông tính theo mô hình churn 12%:

| K | Keyframe | Một keyframe mỗi | Băng thông TB | Keyframe chiếm | So với K = 8 |
|---|---|---|---|---|---|
| **2** | 7,4710% | 13 snapshot = **0,67 s** | 3.252 B | **22,97%** | **+16,38%** |
| **4** | 0,0180% | 5.550 snapshot = **277,5 s** | 2.795 B | 0,064% | +0,03% |
| **8** | 0% trong 200.000 | — | 2.794 B | 0% | — |
| **16** | 0% trong 200.000 | — | 2.794 B | 0% | — |

Bảng này nói ba điều, và cả ba đều phản trực giác:

**Một — K = 2 là thảm hoạ, K = 8 là thừa thãi, và giữa hai cái cách nhau 6 snapshot.** Đi từ K = 2 lên K = 8 tốn `6 × 10 KB = 60 KB` cho **cả server** (vòng dùng chung, mục 3.2). Sáu chục kilobyte xoá sạch 22,97% băng thông: không có đánh đổi ở đây, chỉ có một cấu hình sai và một cấu hình đúng.

**Hai — "cứ N tick thì gửi keyframe cho chắc" là chính sách sai.** Nó biến một sự kiện xác suất 0,018% thành lịch cố định: ở K = 4, chính sách "keyframe mỗi 2 giây" tạo 139 keyframe thừa cho mỗi 1 cái thật sự cần. Điều kiện đúng chỉ có một: **baseline không còn trong lịch sử**.

**Ba — vì sao K = 8 cho ra 0 keyframe trong 200.000 snapshot (2 giờ 46 phút).** Baseline chỉ già quá 8 khi 8 snapshot liên tiếp không được ack. Phía ack thì bài 14 đã tính: mất thông tin cần 33 packet ack liên tiếp bị mất, `10⁻⁴³` ở loss 5%. Phía snapshot là `0,05⁸ = 3,9 × 10⁻¹¹`. Cả hai đều là "không xảy ra". **Ở loss 5%, keyframe chỉ phục vụ hai tình huống: client vừa vào trận, và client im lặng lâu hơn cửa sổ lịch sử.** K = 8 ở 20 Hz là 400 ms — bạn phát hiện baseline chết **trước** ngưỡng "kết nối đang xấu = 1 s" của bài 14.

Một chi tiết cài đặt hay bị bỏ: **keyframe không tự trở thành baseline khi gửi xong** — nó cũng là snapshot unreliable, cũng phải được ack. Trong lúc chờ, mọi snapshot tiếp theo vẫn phải là keyframe. Nên 100 client cùng reconnect sau một sự cố mạng tạo ra `100 × 10.000 × 20 = 20 MB/s` cho tới khi ack đầu tiên về — thundering herd, và bài 27 mới rải nó theo ngân sách.

### 3.5 Delta chống lại cái gì — và điểm nó thua

Bây giờ trả lời hộp #1. Đáp án là **(b)**.

Full snapshot xếp entity theo index nên **không cần id**: byte `10i` tới `10i+9` là entity `i`. Delta gửi một tập con rời rạc nên mỗi mục phải mang id 2 byte — một entity đổi tốn 12 byte trong delta nhưng chỉ 10 byte trong full.

`10.000 / 12 = 833,33`. Đó là con số:

| % entity khác baseline | Delta mức entity | % của full | Tiết kiệm |
|---|---|---|---|
| 5% | 600 B | 6,0% | 94,0% |
| 10% | 1.200 B | 12,0% | 88,0% |
| 30% | 3.600 B | 36,0% | 64,0% |
| 50% | 6.000 B | 60,0% | 40,0% |
| **83,33%** | **10.000 B** | **100%** | **0% — hoà vốn** |
| 86,1% | 10.332 B | 103,3% | **−3,3%** |
| 100% | 12.000 B | 120,0% | **−20,0%** |

Đường cong này giải thích chính xác triệu chứng ở mục 2: máy dev ngồi ở hàng 10%, production giờ cao điểm ngồi ở hàng 86,1%, và giữa hai hàng có một điểm đổi dấu.

Cái bẫy là **đường cong không dốc**: từ 50% xuống 10% mua thêm 48 điểm phần trăm tiết kiệm, từ 10% xuống 5% chỉ mua 6 điểm. **Delta trả gần hết phần thưởng ở vùng entity ít đổi và không còn gì để trả ở vùng entity đổi nhiều.** Nó tối ưu chiều "cái gì đã đổi", và chiều đó có đáy — lý do chương này còn hai bài nữa.

Cách xử lý điểm hoà vốn thì tầm thường và bạn nên cài ngay: **dựng cả hai, gửi cái nhỏ hơn.** Delta 1,51 µs, full 3,20 µs cho 1.000 entity — so hai độ dài rồi chọn là chi phí bỏ đi được. Một bit trong header nói gói này là delta hay keyframe.

```go
d := encodeDelta(cur, base, dbuf)
if d+hdr >= encodeFull(cur, fbuf) { send(FULL, fbuf) } else { send(DELTA, base.Seq, dbuf) }
```

### 3.6 Delta mức field: bitmask

Mục trên coi entity là nguyên tử: đổi một field thì gửi cả 10 byte. Nhưng entity đang chạy thẳng chỉ đổi `x, y, yaw` — 5 trên 10 byte; `hp, state, anim` giữ nguyên hàng trăm tick liền. Giải pháp là **bitmask**: mỗi field một bit, bit bật thì field đó có mặt trong gói.

<svg viewBox="0 0 700 200" role="img" aria-labelledby="gs25-b-t gs25-b-d" style="width:100%;height:auto">
<title id="gs25-b-t">Bố cục một mục delta mức field</title>
<desc id="gs25-b-d">Một mục delta gồm id hai byte, bitmask một byte cho tám field, rồi chỉ những field có bit bật. Ví dụ mask 00000011 nhị phân chỉ mang x và y, tổng năm byte, so với mười hai byte của delta mức entity.</desc>
<text x="20" y="22" font-size="11" font-weight="bold" fill="currentColor">delta mức entity — luôn 12 byte</text>
<rect x="20" y="32" width="56" height="26" rx="4" fill="#64748b" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.3"/>
<text x="48" y="49" text-anchor="middle" font-size="10" fill="currentColor">id 2B</text>
<rect x="80" y="32" width="280" height="26" rx="4" fill="#ef4444" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.3"/>
<text x="220" y="49" text-anchor="middle" font-size="10" fill="currentColor">x y yaw hp state anim vx vy — cả 10 byte, đổi hay không cũng gửi</text>
<text x="20" y="92" font-size="11" font-weight="bold" fill="currentColor">delta mức field — mask 00000011, chỉ x và y đổi: 5 byte</text>
<rect x="20" y="102" width="56" height="26" rx="4" fill="#64748b" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.3"/>
<text x="48" y="119" text-anchor="middle" font-size="10" fill="currentColor">id 2B</text>
<rect x="80" y="102" width="56" height="26" rx="4" fill="#8b5cf6" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.4"/>
<text x="108" y="119" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">mask 1B</text>
<rect x="140" y="102" width="52" height="26" rx="4" fill="#84cc16" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.4"/>
<text x="166" y="119" text-anchor="middle" font-size="10" fill="currentColor">x 2B</text>
<rect x="196" y="102" width="52" height="26" rx="4" fill="#84cc16" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.4"/>
<text x="222" y="119" text-anchor="middle" font-size="10" fill="currentColor">y 2B</text>
<text x="262" y="119" font-size="10" fill="currentColor" opacity="0.75">yaw hp state anim vx vy — vắng mặt hoàn toàn</text>
<text x="80" y="150" font-size="10" fill="currentColor" opacity="0.85">bit 0 = x · bit 1 = y · bit 2 = yaw · bit 3 = hp · bit 4 = state · bit 5 = anim · bit 6 = vx · bit 7 = vy</text>
<text x="20" y="178" font-size="11" fill="currentColor">mask ăn <tspan font-weight="bold">1 / 5 = 20%</tspan> gói này — và mua lại 7 byte. Ở entity 32 field, cùng phép này mask ăn <tspan font-weight="bold">50%</tspan>.</text>
</svg>

Đo thật trên 1.000 entity, mỗi entity đổi trung bình 2,58 field (4,37 byte): delta mức field tốn **7,37 byte mỗi entity đổi** so với 12 byte của mức entity — **rẻ hơn 38,6%**. Điểm hoà vốn dời lên `10.000 / 7,37 = 1.356,9` entity, tức **135,7%**: vượt 100%, nghĩa là **delta mức field không bao giờ thua full snapshot** ở cỡ entity này. Giá là CPU — 2,05 µs so với 1,51 µs, **đắt hơn 35,8%**, vì phải so từng field thay vì `memcmp` cả struct.

Bitmask đáng hay không thì phụ thuộc entity rộng bao nhiêu:

| Entity | Field đổi | Delta mức field | Delta mức entity | Mask chiếm % gói | Tiết kiệm |
|---|---|---|---|---|---|
| **8 field, 10 B, mask 1 B** | 1 | 4,25 B | 12 B | 23,5% | 64,6% |
| | 2 | 5,50 B | 12 B | 18,2% | 54,2% |
| | 4 | 8,00 B | 12 B | 12,5% | 33,3% |
| | 8 | 13,00 B | 12 B | 7,7% | **−8,3%** |
| **32 field, 64 B, mask 4 B** | 1 | 8,00 B | 66 B | **50,0%** | 87,9% |
| | 2 | 10,00 B | 66 B | 40,0% | 84,8% |
| | 8 | 22,00 B | 66 B | 18,2% | 66,7% |
| | 32 | 70,00 B | 66 B | 5,7% | **−6,1%** |

Hoà vốn của bitmask: `mask + f × cỡ_field = payload` → entity 8 field cho `f = 7,2 / 8`, entity 32 field cho `f = 30 / 32`. **Bitmask chỉ thua khi gần như mọi field đều đổi**, và `if mask == full { gửi nguyên entity }` xử lý xong.

Cột "mask chiếm % gói" mới là cột quan trọng. Entity 32 field đổi đúng 1 field: gói 8 byte, trong đó **4 byte là mask** — nửa gói dùng để nói "31 field kia không đổi". Cách sửa là **mask phân cấp**: chia 32 field thành 8 nhóm 4, 1 byte mask nhóm cộng mask con chỉ cho nhóm có bit bật. Đổi 1 field tốn `1 + 1 = 2 byte` thay vì 4, gói còn 6 byte — **rẻ hơn 25%**.

> **Quy tắc: mask phẳng đúng tới khoảng 16 field. Rộng hơn thì mask bắt đầu tự nó là payload.**

### 3.7 Thứ tự: quantize TRƯỚC, delta SAU

Bài 24 chuyển `float32` thành số nguyên trên một lưới. Bài này trừ hai giá trị. Hai phép đó giao hoán với nhau về mặt đại số nhưng **không** giao hoán về mặt kỹ thuật, và đảo thứ tự là một trong những bug khó tìm nhất của cả chương.

**Cách đúng — quantize rồi mới delta.** State trong snapshot là số nguyên, phép so sánh là so sánh số nguyên. Entity đứng im có `qx_cur == qx_base` **đúng bằng nhau, không phải xấp xỉ**, nên bit mask bằng 0 và entity đó chiếm **0 byte**. Không sai số nào tích luỹ, vì mỗi snapshot tái tạo được giá trị tuyệt đối `base + delta` bằng số nguyên.

Nó còn tặng **lọc rung miễn phí**. Với lưới `1/64 m` và snapshot 20 Hz, entity đi `v` m/s chỉ vượt một ô sau `0,015625 / v` giây:

| v | Ô/snapshot | Tỉ lệ snapshot mà `x` KHÔNG đổi |
|---|---|---|
| 0,05 m/s | 0,160 | **84,0%** |
| 0,10 m/s | 0,320 | 68,0% |
| 0,15625 m/s | 0,500 | 50,0% |
| 0,30 m/s | 0,960 | 4,0% |
| ≥ 0,32 m/s | ≥ 1,0 | 0% |

Một NPC đi chậm biến mất khỏi 84% số gói mà không cần một dòng logic nào.

**Cách sai — delta rồi mới quantize.** State giữ ở float, bạn tính hiệu `dx = x_cur − x_base` rồi quantize cái hiệu. Nghe còn hợp lý hơn: hiệu nhỏ thì cần ít bit hơn giá trị tuyệt đối. Nhưng:

```
lưới 1/64 m = 0,015625 m ; snapshot 20 Hz
entity đi 0,10 m/s  →  dx = 0,005 m mỗi snapshot
quantize(0,005 / 0,015625) = round(0,32) = 0     →  client cộng 0
```

**Mọi entity chậm hơn `0,0078125 / 0,05 = 0,15625 m/s` đứng im vĩnh viễn trên máy client** — không phải "hơi trễ", mà đứng im mãi mãi trong khi server đã cho nó đi nửa bản đồ. Dùng `floor` thay `round` thì ngưỡng thành `0,3125 m/s` và **mọi** entity bị kéo lùi mỗi snapshot: sai số không triệt tiêu mà **cộng dồn**, vì client chỉ có `base + Σdx` chứ không bao giờ thấy giá trị tuyệt đối nữa.

Cứu được bằng cách giữ phần dư: server nhớ `residual = dx − dequantize(qdx)` **cho từng client, từng field** rồi cộng vào lần sau. Nó chạy — và nó vừa nhét lại một mảng float per-client vào đúng hệ thống mà mục 3.2 vừa gỡ state per-client ra.

> **Quantize là hàm của giá trị. Delta là hàm của hai giá trị đã quantize. Đảo thứ tự thì delta thành hàm của sai số làm tròn, và sai số làm tròn thì cộng dồn.**

### 3.8 Đo cái gì

Bốn metric, không cái nào là "bytes/s" — bytes/s là thứ bạn đã đo trước khi bật delta.

| Metric | Cách tính | Đọc ra sao |
|---|---|---|
| **Tỉ lệ nén thực tế** | `bytes_delta_gửi / bytes_full_nếu_gửi` mỗi snapshot | Ở mục 3.3 là 2.794/10.000 = **27,9%**. Trên 100% là bạn đang ở bên kia điểm hoà vốn — và ở đó full snapshot rẻ hơn. |
| **Tuổi baseline TB và p99** | `seq_hiện_tại − baselineSeq`, histogram theo client | Sàn là 2 ở RTT 40/ack 30 Hz. p99 nhảy lên 5–6 là mạng đang xấu **hoặc** client giảm tần suất gửi ack. |
| **Tần suất keyframe** | `keyframe / tổng snapshot`, tách riêng "vào trận" và "baseline hết hạn" | Loại thứ hai lớn hơn 0,1% nghĩa là **K đang quá nhỏ**, không phải mạng đang tệ. |
| **Thời gian dựng gói mỗi tick** | tổng µs của vòng lặp encode, chia theo client | So với ngân sách 50 ms của một chu kỳ snapshot. Vượt 20% là đã đến lúc đọc bài 26. |

Metric bị bỏ quên nhiều nhất là cái thứ hai. Tuổi baseline là biến duy nhất nối **chất lượng mạng** với **kích thước gói**, và nó nằm hoàn toàn ở phía server — không cần client báo cáo gì, không thêm một byte nào trên dây.

---

## 4. Bảng quyết định

| Tình huống | Delta có đáng không | Vì sao |
|---|---|---|
| < 30% entity đổi so với baseline | **Rất đáng** | Tiết kiệm ≥ 64%, CPU không đáng kể ở dưới 1.000 client |
| 30–83% đổi | Đáng, ít dần | Vẫn dương nhưng đường cong đã phẳng |
| > 83,33% đổi, mức entity | **Không** | Id 2 byte làm gói to hơn full. Cài `min(delta, full)` là xong |
| Entity ≥ 16 field | Dùng mức field + mask phân cấp | Mask phẳng bắt đầu tự nó là payload |
| Client × entity > ~10 M mỗi tick | **Delta một mình không đủ** | 20,5 ms/tick chỉ để trừ; cần cắt số entity (bài 26) |
| Message rời rạc: "cửa đã mở" | Không áp dụng | Không có state trước để trừ — event, bài 23 |
| Client vừa vào trận / reconnect | Keyframe | Chưa có baseline nào để trừ |

---

## 5. Tính tay

**Bài 1.** Thế giới 4.000 entity × 8 byte, snapshot 30 Hz, 250 client, RTT 60 ms, client gửi ack 20 Hz.
- Full snapshot bao nhiêu byte, và ở 250 client / 30 Hz thì bao nhiêu MB/s?
- Sàn tuổi baseline là bao nhiêu snapshot? (Tính vòng đi-về rồi chia cho chu kỳ snapshot.) So với sàn 2 của mục 3.3, biến nào đẩy nó lên?
- Delta mức entity dùng id 2 byte: điểm hoà vốn ở bao nhiêu phần trăm entity đổi, và vì sao khác 83,33% của bài?

**Bài 2.** Vẫn thế giới bài 1, K = 6, giữ **một bản sao lịch sử cho mỗi client** thay vì vòng dùng chung.
- Tốn bao nhiêu MB? Chuyển sang vòng dùng chung thì còn bao nhiêu KB, và tỉ lệ là bao nhiêu lần?
- Cửa sổ K = 6 ở 30 Hz phủ được bao nhiêu mili giây? So với ngưỡng "kết nối đang xấu = 1 s" của bài 14 — server phát hiện baseline chết trước hay sau khi tầng kết nối kêu?
- Với 2,05 ns mỗi phép so sánh entity, 250 client × 4.000 entity ở 30 Hz ăn bao nhiêu phần trăm một core?

**Bài 3.** Entity của bạn có 12 field, payload 18 byte, id 2 byte. Trung bình 3 field đổi, tổng 6 byte.
- Mask phẳng tốn mấy byte? Kích thước một mục delta mức field so với mức entity? Mask chiếm bao nhiêu phần trăm gói?
- Điểm hoà vốn của mask là bao nhiêu trên 12 field?
- Bạn quantize vị trí trên lưới `1/128 m`, snapshot 30 Hz. Nếu cài nhầm thứ tự (delta trước, quantize sau, làm tròn gần nhất, không giữ dư) thì entity chậm hơn bao nhiêu m/s sẽ đứng im vĩnh viễn?

---

## 6. Chuyển giao

**MMO khu vực mở: 800 người một shard, 12.000 entity (người chơi, NPC, đạn, vật phẩm rơi), snapshot 15 Hz, entity 20 byte / 14 field.** Delta mức field, K = 8, vòng lịch sử dùng chung.

1. Tính thời gian dựng gói mỗi tick với 2,05 ns/entity. Nó chiếm bao nhiêu phần trăm chu kỳ 66,67 ms? Bạn còn bao nhiêu cho simulation?
2. Một sự kiện trong game làm 9.000 trên 12.000 entity đổi cùng lúc trong 3 giây. Delta mức field còn thắng full snapshot không? Nếu bạn chỉ cài mức entity thì sao? Con số nào ở mục 3.5 và 3.6 quyết định câu trả lời?
3. Một client dùng 4G, RTT dao động 80–500 ms. Sàn tuổi baseline của riêng nó là bao nhiêu ở hai đầu dải? Với K = 8, có lúc nào nó rơi vào keyframe liên tục không — và nếu có, K phải bằng bao nhiêu để hết?
4. Bạn muốn cắt CPU bằng cách **gộp client theo baseline**: mọi client có cùng `baselineSeq` dùng chung một gói delta đã encode. Ở loss 5%, theo phân bố tuổi của mục 3.3, có bao nhiêu nhóm và nhóm lớn nhất chiếm bao nhiêu phần trăm client? CPU giảm bao nhiêu lần? Cách này hỏng ở đâu khi bài 26 vào cuộc?
5. Server của bạn thỉnh thoảng bị GC pause 40 ms. Trong pause, không snapshot nào được gửi và không ack nào được xử lý. Pause đó làm tuổi baseline tăng bao nhiêu, và nó có đẩy client nào ra ngoài K = 8 không? Nếu pause là 600 ms thì sao?
6. **Câu khó nhất:** delta compression giả định client giữ được baseline **nguyên vẹn** để cộng delta vào. Nhưng bài 19 nói client chạy reconciliation — nó **rewind rồi replay** state của chính nhân vật mình sau mỗi snapshot, nên state hiển thị của entity local **không bằng** state trong snapshot mà nó vừa ack. Câu hỏi: client phải ack **cái gì** — bản snapshot thô nó nhận được, hay bản đã reconcile nó đang hiển thị? Nếu là bản thô thì client phải giữ hai bản state song song và tốn thêm bao nhiêu bộ nhớ cho 12.000 entity; nếu là bản đã reconcile thì server đang trừ với một baseline mà **chính nó không có**, và delta gửi đi sai ở đúng những entity mà người chơi nhìn kỹ nhất. Có cách thứ ba không, hay đây là lý do mọi engine đều loại trừ entity local ra khỏi cơ chế delta?

---

## 7. Tóm tắt

- **Baseline = snapshot gần nhất client đã ACK**, không phải gần nhất đã gửi. Cơ chế cấp bằng chứng đó là `Ack` + `AckBits` của bài 14 — bỏ ack đi thì không có delta compression.
- **Baseline là per-client**: 100 client = 100 gói delta khác nhau mỗi tick. CPU đo được **2,05 ns mỗi entity so sánh** → 100 client × 1.000 entity = 0,41% một core, nhưng 5.000 client × 50.000 entity = **512,5 ms/tick, 10,25 core**. Công việc là `client × entity` và entity thường tăng theo client: `O(N²)`.
- **Bộ nhớ per-client là chi phí giả.** Trước AOI mọi client nhìn cùng thế giới, nên một vòng lịch sử dùng chung `8 × 10 KB = 80 KB` thay cho 8 MB bản sao — rẻ hơn **100 lần** ở 100 client, và state per-client rơi từ 80 KB xuống **2 byte**.
- **Tuổi baseline có sàn cứng 2 snapshot ngay ở loss 0%** — do RTT 40 ms cộng nhịp ack 30 Hz, không do mất gói. Delta bạn gửi là delta **100 ms**, không phải 50 ms. Loss chỉ làm cái đuôi: ở 5% tuổi TB 2,079 / p99 3 / max 6, băng thông phồng **3,22%**; ở 20% là +15,14%. Ack bitfield 33 của bài 14 giữ con số đó nhỏ.
- **K quyết định tần suất keyframe, và K nhỏ là lỗi cấu hình chứ không phải đánh đổi.** K = 2 → keyframe mỗi 0,67 s, chiếm **22,97% băng thông**; K = 4 → mỗi 277,5 s; K = 8 → **0 lần trong 200.000 snapshot**. Giá đi từ K = 2 lên K = 8 là 60 KB cho cả server.
- **Điểm hoà vốn của delta mức entity là 83,33%** entity đổi — vì mỗi mục delta mang id 2 byte mà full snapshot không cần. Ở 86,1% đổi delta **đắt hơn full 3,3%**, ở 100% đổi đắt hơn **20%**. Cài `min(delta, full)` và một bit trong header.
- **Delta mức field rẻ hơn mức entity 38,6%** (7,37 B vs 12 B mỗi entity đổi) và đẩy hoà vốn lên 135,7% — không bao giờ thua. Giá: CPU +35,8%. Mask phẳng tự nó thành payload từ khoảng 16 field: entity 32 field đổi 1 field thì **mask chiếm 50% gói**, mask phân cấp cắt gói đó 25%.
- **Quantize trước, delta sau.** Đúng thứ tự: entity đứng im cho delta **đúng bằng 0**, entity đi 0,10 m/s biến mất khỏi **68%** số gói. Sai thứ tự: mọi entity chậm hơn **0,15625 m/s đứng im vĩnh viễn** trên client và sai số làm tròn cộng dồn.
- **Đo bốn thứ**: tỉ lệ nén thực tế (27,9% ở ví dụ của bài), tuổi baseline TB/p99, tần suất keyframe **tách riêng loại "baseline hết hạn"**, thời gian dựng gói mỗi tick so với chu kỳ snapshot. Không cái nào là bytes/s.

→ **Bài 26 — Area of Interest**: mỗi gói đã gọn hết mức và chỉ chứa cái đã đổi. Bài sau hỏi câu đắt nhất chương: vì sao phải gửi entity mà người chơi còn không nhìn thấy?
