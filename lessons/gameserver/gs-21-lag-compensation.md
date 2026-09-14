# Bài 21 — Lag compensation: tua ngược thế giới

## 1. Mục tiêu

Sau bài này bạn có thể:

- Dựng **vòng đệm lịch sử** ở server và tính thời điểm `t_view = now − RTT/2 − d` mà người chơi đã thực sự nhìn thấy.
- Tự tính **hoá đơn bộ nhớ** của lịch sử đó cho 20 / 100 / 1.000 entity, và biết chỗ cắt được 5 lần mà không mất gì.
- **Chứng minh bằng bất đẳng thức** — không phải bằng khẳng định — rằng không tồn tại phương án phân xử thứ ba.
- Đặt **trần tua ngược** và nói chính xác ai mất bao nhiêu mét vì nó.
- Liệt kê bốn loại tình huống lag compensation **không được phép** áp dụng, kèm lý do chung của cả bốn.
- Chỉ ra vì sao **lượng tua ngược một phần do client khai**, và vì sao trần cứng cũng là biện pháp chống gian lận.

---

## 2. Triệu chứng

Cuộc họp thiết kế, tuần thứ ba của closed beta. Trên màn hình là một dòng log của một pha giao tranh duy nhất:

```
duel #5120  shooter=P17 rtt=180ms interp_buf=100ms  rewind=190ms
            victim=P03  speed=5.0 m/s  displacement_during_rewind=0.95 m
            result=HIT (head)
```

Trên máy P03, lúc trúng đạn anh ta đã vào hẳn sau khung cửa **0,95 m** — gần hai thân người. Anh ta gửi clip kèm một câu: *"tắt cái trò tua ngược này đi."* Phòng chia làm hai, mỗi bên một con số.

**Phe tắt** lấy chính 0,95 m đó — gần trọn chiều rộng một cửa ra vào. Hệ thống đang giết người ở một vị trí mà **không ai trong trận**, kể cả người bắn, nhìn thấy nạn nhân đứng ở đó vào thời điểm đó.

**Phe giữ** không cãi con số ấy mà hỏi ngược: nếu tắt, thì người **ping tốt nhất phòng**, RTT 40 ms, muốn bắn trúng mục tiêu chạy ngang 5 m/s phải ngắm chệch trước **bao nhiêu**? Đó là câu quyết định cuộc họp, và bài 20 đã để sẵn đủ dữ kiện.

---

## ⏸ Dừng lại — đoán trước #1

Bài 20 chốt: bạn nhìn người khác ở quá khứ, lệch tối thiểu `RTT/2 + d` — với cấu hình chuẩn (RTT 40 ms, đệm 100 ms) là **120 ms**.

**Nếu server phân xử bằng vị trí hiện tại, người chơi RTT 40 ms phải ngắm chệch trước một mục tiêu chạy ngang 5 m/s bao nhiêu để trúng?**

```
(a) Khoảng 0 — 40 ms là quá nhỏ để phải bù bằng tay
(b) 0,12 m — nhỏ hơn thân người, nên vẫn trúng
(c) 0,60 m — lớn hơn cả chiều rộng thân người
(d) Tuỳ tick rate: 128 tick thì gần như bằng 0
```

---

## 3. Lý thuyết

### 3.1 Đáp án 0,60 m, và tick rate không đụng được vào nó

Đáp án là **(c)**. Lấy thẳng con số 120 ms của bài 20:

```
D = v · (RTT/2 + d) = 5 m/s × 0,120 s = 0,60 m
```

Thân người rộng khoảng **0,50 m**, nên `0,60 / 0,50 = 1,2` — độ lệch **hơn 120% một thân người**. Người ping tốt nhất phòng, ngắm hoàn hảo vào giữa ngực đối thủ trên màn hình, **trượt sạch**: tia raycast đi qua khoảng không. Muốn trúng, anh ta phải ngắm ra chỗ trống trước mặt đối thủ hơn một thân mình — trò chơi thành bài toán dẫn bắn mà mỗi người tự giải lại theo ping của chính mình, thay đổi từng giây.

Hai chi tiết trong công thức chặn hai đường thoát ai cũng nghĩ tới đầu tiên:

- **Không có `tick`, không có `T`.** `D` chỉ phụ thuộc `v`, RTT và `d`. Nâng sim 60 → 128 Hz cắt 4,4 ms trong ngân sách (bài 8) và **không đụng vào 120 ms này**. Đây đúng là câu bài 4 nói mà chưa chứng minh: *tick rate cao hơn không tạo ra phương án thứ ba*.
- **`d` là thứ ta tự nguyện thêm vào.** `d ≥ T` là ràng buộc cứng của bài 20 — bỏ nó thì hình ảnh giật 25 cm mỗi 50 ms. Ta đã trả 100 ms mua độ mượt; hoá đơn đến ở đây.

Phe giữ thắng cuộc họp. Nhưng 0,95 m của phe tắt không biến mất, nó chỉ đổi chủ — phần còn lại của bài là chuyện ai trả và trả bao nhiêu.

### 3.2 Cơ chế: vòng đệm lịch sử và ba bước tua

Lag compensation là một câu: **server phân xử phát bắn trong thế giới người bắn đã nhìn thấy, không phải thế giới hiện tại.** Muốn vậy thì thế giới cũ phải còn tồn tại — nên server giữ **vòng đệm lịch sử**: mỗi tick ghi vị trí và hitbox của mọi entity có thể bị bắn. Khi gói `Fire` của P tới, ba bước:

```go
func (w *World) ResolveShot(p *Player, cmd FireCmd, now Tick) HitResult {
    lag := clampDur(p.RTT/2+p.InterpBuf, 0, MaxRewind) // MaxRewind = 200ms
    tView := now - Tick(lag/w.TickDur)
    snap := w.hist.RestoreAt(tView, cmd.Ray)  // chỉ entity gần tia
    defer snap.Undo()                          // trả world về hiện tại
    return w.raycast(cmd.Ray, snap.Bodies)
}
```

`defer snap.Undo()` là dòng dễ quên nhất và hỏng nặng nhất. Trong lúc world bị tua ngược, **không được** chạy vật lý, không xử lý gói của người khác, không tick — nếu cửa sổ vài micro giây đó rò ra ngoài thì mọi va chạm của mọi người trong tick này tính theo một thế giới quá khứ.

<svg viewBox="0 0 720 280" role="img" aria-labelledby="gs21-a-t gs21-a-d" style="width:100%;height:auto">
<title id="gs21-a-t">Server tua ngược thế giới về thời điểm người bắn đã nhìn thấy</title>
<desc id="gs21-a-d">Trục thời gian ở server. Vòng đệm lịch sử ghi vị trí nạn nhân mỗi tick. Gói bắn tới ở hiện tại, server lùi một trăm hai mươi mili giây gồm nửa RTT là hai mươi và đệm nội suy là một trăm, khôi phục hitbox nạn nhân tại đó rồi raycast, sau đó trả thế giới về hiện tại.</desc>
<line x1="40" y1="170" x2="690" y2="170" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5"/>
<rect x="180" y="120" width="440" height="50" fill="#64748b" fill-opacity="0.14"/>
<text x="400" y="112" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.85">vòng đệm lịch sử — mỗi tick một bản ghi</text>
<circle cx="200" cy="170" r="4" fill="#64748b" fill-opacity="0.7"/>
<circle cx="240" cy="170" r="4" fill="#64748b" fill-opacity="0.7"/>
<circle cx="280" cy="170" r="4" fill="#64748b" fill-opacity="0.7"/>
<circle cx="320" cy="170" r="4" fill="#64748b" fill-opacity="0.7"/>
<circle cx="360" cy="170" r="4" fill="#64748b" fill-opacity="0.7"/>
<circle cx="400" cy="170" r="4" fill="#64748b" fill-opacity="0.7"/>
<circle cx="440" cy="170" r="4" fill="#64748b" fill-opacity="0.7"/>
<circle cx="480" cy="170" r="4" fill="#64748b" fill-opacity="0.7"/>
<circle cx="520" cy="170" r="4" fill="#64748b" fill-opacity="0.7"/>
<circle cx="560" cy="170" r="4" fill="#64748b" fill-opacity="0.7"/>
<circle cx="600" cy="170" r="4" fill="#64748b" fill-opacity="0.7"/>
<circle cx="320" cy="170" r="8" fill="#3b82f6" fill-opacity="0.45" stroke="#3b82f6" stroke-width="2"/>
<circle cx="640" cy="170" r="8" fill="#ef4444" fill-opacity="0.35" stroke="#ef4444" stroke-width="2"/>
<line x1="320" y1="170" x2="640" y2="170" stroke="#f59e0b" stroke-width="2.5"/>
<polygon points="320,170 334,164 334,176" fill="#f59e0b"/>
<text x="480" y="190" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">tua ngược 120 ms</text>
<text x="480" y="204" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.8">= RTT/2 (20) + đệm nội suy d (100)</text>
<text x="640" y="196" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">now</text>
<text x="640" y="210" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.8">gói Fire tới</text>
<text x="320" y="230" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">t_view</text>
<text x="320" y="244" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.8">thế giới P17 đã THẤY</text>
<rect x="300" y="52" width="40" height="52" rx="4" fill="#3b82f6" fill-opacity="0.3" stroke="#3b82f6"/>
<text x="320" y="44" text-anchor="middle" font-size="9" fill="currentColor">nạn nhân lúc đó</text>
<rect x="620" y="52" width="40" height="52" rx="4" fill="#ef4444" fill-opacity="0.2" stroke="#ef4444" stroke-dasharray="4 3"/>
<text x="660" y="44" text-anchor="middle" font-size="9" fill="currentColor">bây giờ: đã nấp</text>
<line x1="120" y1="78" x2="298" y2="78" stroke="#84cc16" stroke-width="2"/>
<polygon points="298,78 286,72 286,84" fill="#84cc16"/>
<text x="120" y="68" font-size="10" font-weight="bold" fill="currentColor">tia raycast bắn vào ĐÂY</text>
<text x="40" y="268" font-size="10" fill="currentColor">Sau raycast: Undo() trả mọi hitbox về hiện tại. Cửa sổ tua ngược không được sống qua một dòng lệnh nào khác.</text>
</svg>

### 3.3 Con số tua ngược một phần do client khai

`RTT/2` server tự đo được (bài 14). `d` thì **không** — đệm nội suy sống trong client, và bài 20 mục 4.2 vừa kết luận nó phải **thích ứng động** theo jitter từng người. Hằng số 100 ms trong config thì sai với mọi ai không dùng đúng 100; suy `d` từ ack thì gần đúng nhưng phức tạp và trễ. Nên mọi engine đều làm cách thứ ba: **client gửi kèm `d` trong mỗi gói `Fire`** — tham số trỏ tới thế giới do client cung cấp, đúng loại thứ bài 33 gọi là "khẳng định cần kiểm chứng". Khai `d = 500 ms` thì server tua ngược nửa giây. Chặn nó là việc của mục 4.1, và cách chặn trùng đúng với cái trần mục 3.7 dựng lên vì lý do khác hẳn.

### 3.4 Hoá đơn bộ nhớ — tự tính, đừng chép

Mỗi bản ghi lịch sử chứa gì — hai mức:

```
gọn  : pos 3×f32 (12 B) + yaw,pitch 2×f32 (8 B) + tick u32 (4 B) + cờ/state (8 B) =  32 B
đầy  : 16 hitbox xương × (pos 3×f32 + góc 3×f32 = 24 B) = 384 B, + 32 B header    = 416 B
```

Giữ **1 giây** ở **60 Hz** là 60 bản ghi mỗi entity. Nhân lên:

| N entity | 32 B/bản ghi | 416 B/bản ghi |
|---|---|---|
| 20 | 37,5 KiB | 487,5 KiB |
| 100 | 187,5 KiB | 2,38 MiB |
| 1.000 | 1,83 MiB | **23,8 MiB** |

Kết luận ngược trực giác: **bộ nhớ không phải ràng buộc.** Trường hợp xấu nhất — nghìn nhân vật có xương đầy đủ — là 23,8 MiB, chưa bằng một tấm ảnh. Nhưng có hai chỗ đáng cắt vì lý do khác:

**Cắt theo chiều dài, không theo tần số.** Nếu trần là 200 ms (mục 3.7) thì mọi bản ghi cũ hơn 200 ms không bao giờ được đọc: `200 / 16,67 = 12` tick thay vì 60 — nhỏ đi **5 lần**, 416 B × 12 × 1.000 = **4,76 MiB**. Cái lợi thật nằm ở **cache**: mỗi phát bắn là một lần duyệt vòng đệm. Giữ 1 giây theo truyền thống là vì replay và debug, không phải vì lag comp cần.

**Đừng cắt theo tần số.** "Lưu thưa 20 Hz rồi nội suy lại" nghe hợp lý — tiết kiệm 3 lần. Sai số khi mục tiêu 5 m/s bẻ 90° đúng giữa khoảng lưu là `(v·Δt/2)/√2`:

| Tần số lưu | Khoảng Δt | Sai số nội suy tối đa |
|---|---|---|
| 60 Hz (mỗi tick) | 16,67 ms | 2,95 cm |
| 20 Hz (mỗi snapshot) | 50 ms | **8,84 cm** |
| 10 Hz | 100 ms | 17,7 cm |

Đầu người rộng khoảng 20 cm, nên 8,84 cm là **44,2% chiều rộng một cái đầu** — đủ để biến headshot thành trượt và ngược lại, ở đúng loại phát bắn người chơi nhớ lâu nhất. Đổi ngần ấy độ chính xác lấy 1,6 MiB là giao dịch tồi. **Ghi mỗi tick.**

*(32 B và 416 B là kích thước bản ghi của một thiết kế cụ thể — bậc độ lớn, không phải hằng số.)*

---

## ⏸ Dừng lại — đoán trước #2

Bài 4 tuyên bố "không có phương án thứ ba" rồi đi tiếp. Thử phá tuyên bố đó: server đâu bắt buộc chọn một trong hai đầu — nó có thể phân xử ở **giữa** `t_view` và `now`, tua ngược 60 ms thay vì 120. Người bắn chỉ lệch một nửa, nạn nhân cũng chỉ chết oan một nửa. Nghe như thoả hiệp hoàn hảo.

**Với `D` = 0,60 m, tổng sai số mà hai người phải chia nhau khi server phân xử ở chính giữa là bao nhiêu?**

```
(a) 0,30 m — chia đôi thì tổng cũng giảm một nửa
(b) 0,42 m — giảm theo căn bậc hai
(c) 0,60 m — không đổi, chỉ đổi người trả
(d) Tuỳ đường chạy của nạn nhân, không nói trước được
```

---

### 3.5 Định luật bảo toàn: vì sao thật sự không có phương án thứ ba

Đáp án là **(c)**, và lần này ta chứng minh chứ không tuyên bố.

Gọi `x(t)` là vị trí thật của nạn nhân theo đồng hồ server. Người bắn ngắm vào `x(t_view)` — thứ duy nhất màn hình cho anh ta thấy. Server chọn thời điểm phân xử `t*` bất kỳ trong `[t_view, now]`, sinh ra đúng hai sai số:

```
e_s = |x(t*) − x(t_view)|   NGƯỜI BẮN chịu: tia trỏ vào chỗ server không xét
e_v = |x(now) − x(t*)|      NẠN NHÂN chịu: chết ở chỗ mình đã rời khỏi
```

Bất đẳng thức tam giác cho ngay `e_s + e_v ≥ |x(now) − x(t_view)| = D`, dấu bằng khi nạn nhân chạy thẳng.

`D = v · (RTT/2 + d)` **không phụ thuộc `t*`**. Chọn `t*` ở đâu cũng không đổi được tổng; nó chỉ trượt dọc một đoạn thẳng, chuyển tiền từ túi này sang túi kia. Ba mốc trên đoạn ấy:

<svg viewBox="0 0 700 200" role="img" aria-labelledby="gs21-b-t gs21-b-d" style="width:100%;height:auto">
<title id="gs21-b-t">Tổng sai số của người bắn và nạn nhân là hằng số</title>
<desc id="gs21-b-d">Một đoạn thẳng dài không phẩy sáu mét biểu diễn quãng đường nạn nhân đi trong một trăm hai mươi mili giây. Thời điểm phân xử trượt dọc đoạn này; phần bên trái là sai số người bắn chịu, phần bên phải là sai số nạn nhân chịu. Tổng hai phần luôn bằng không phẩy sáu mét dù đặt điểm phân xử ở đâu.</desc>
<line x1="80" y1="80" x2="620" y2="80" stroke="currentColor" stroke-opacity="0.5" stroke-width="3"/>
<circle cx="80" cy="80" r="7" fill="#3b82f6" fill-opacity="0.5" stroke="#3b82f6" stroke-width="2"/>
<circle cx="620" cy="80" r="7" fill="#ef4444" fill-opacity="0.5" stroke="#ef4444" stroke-width="2"/>
<text x="80" y="60" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">x(t_view)</text>
<text x="80" y="46" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.8">người bắn thấy ở đây</text>
<text x="620" y="60" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">x(now)</text>
<text x="620" y="46" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.8">nạn nhân đang ở đây</text>
<polygon points="350,80 342,66 358,66" fill="#f59e0b"/>
<line x1="350" y1="66" x2="350" y2="30" stroke="#f59e0b" stroke-width="2"/>
<text x="350" y="22" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">t* trượt tự do</text>
<line x1="80" y1="112" x2="348" y2="112" stroke="#3b82f6" stroke-width="4" stroke-opacity="0.6"/>
<line x1="352" y1="112" x2="620" y2="112" stroke="#ef4444" stroke-width="4" stroke-opacity="0.6"/>
<text x="214" y="130" text-anchor="middle" font-size="10" fill="currentColor">e_s — người bắn trả</text>
<text x="486" y="130" text-anchor="middle" font-size="10" fill="currentColor">e_v — nạn nhân trả</text>
<line x1="80" y1="152" x2="620" y2="152" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.6"/>
<line x1="80" y1="146" x2="80" y2="158" stroke="currentColor" stroke-width="1.5"/>
<line x1="620" y1="146" x2="620" y2="158" stroke="currentColor" stroke-width="1.5"/>
<text x="350" y="172" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">e_s + e_v = D = v · (RTT/2 + d) = 0,60 m — hằng số</text>
<text x="350" y="190" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.8">phân xử ở đâu cũng không đổi tổng, chỉ đổi người trả</text>
</svg>

`t* = now` cho `(e_s, e_v) = (0,60 ; 0)` — không bù. `t* = t_view` cho `(0 ; 0,60)` — bù đầy đủ. Còn "thoả hiệp" giữa chừng cho `(0,30 ; 0,30)`, và bây giờ mới thấy vì sao nó không phải phương án thứ ba: nó **nằm trên chính đoạn thẳng đó**, và sinh ra *cả hai* lời phàn nàn cùng lúc thay vì một. Người bắn lệch 0,30 m — hơn nửa thân người, vẫn trượt phần lớn phát bắn vào mục tiêu chạy ngang. Nạn nhân vẫn chết sau khi đã khuất 0,30 m.

Bốn "phương án thứ ba" hay được đề xuất, và chỗ chết của từng cái:

1. **Tăng tick rate** — `D` không chứa `T`, không đụng được (mục 3.1).
2. **Chia đôi sai số** — là một điểm trên đoạn, không phải điểm ngoài đoạn.
3. **Hỏi client nạn nhân lúc đó ở đâu** — trả quyền phân xử cho client, tức bỏ cuộc (bài 33). Client nạn nhân cũng chỉ có góc nhìn trễ của riêng nó, và có động cơ nói dối.
4. **Cảnh báo cho nạn nhân để né** — cộng thêm một RTT, và trong lúc chờ trả lời server phải giữ world: tua ngược ở dạng tệ hơn.

Chỉ có **một** cách thoát: **giảm `D`**, mà `D` chỉ có ba thừa số. `RTT` là hạ tầng — đắt, hữu hạn. `d` thì bài 20 đã tính hết: mỗi mili giây trả bằng số lần giật, và `d ≥ T` là sàn cứng. Thừa số thứ ba, **`v`**, là thiết kế game — thứ bài 4 không nói tới.

Nếu `D ≤ w` với `w` là chiều rộng hitbox, thì tồn tại `t*` mà **cả hai** sai số đều dưới `w/2`: tia vẫn nằm trong hitbox *và* nạn nhân chết trong phạm vi nửa thân mình. Tranh cãi biến mất. Ngưỡng:

```
v* = w / (RTT/2 + d) = w / 0,12 s
w = 0,50 m (thân)  ->  v* = 4,17 m/s
w = 0,20 m (đầu)   ->  v* = 1,67 m/s
```

Đó là lý do vật lý — không phải thẩm mỹ — khiến các game bắn súng đặt nặng độ chính xác cho nhân vật đi **chậm** và bắt dừng lại khi ngắm. Ở 2,5 m/s, `D` = 0,30 m < 0,50 m: cả phòng họp hết chuyện để cãi. Ở 8–10 m/s kiểu arena thì `D` gần 1 m và tranh cãi là bắt buộc.

Nhưng với **hitbox đầu, ngưỡng là 1,67 m/s — chậm hơn người đi bộ.** Với headshot, không tốc độ thực tế nào làm tranh cãi biến mất; headshot luôn phải chọn phe. Đó là dạng mạnh nhất của "không có phương án thứ ba", và là hệ quả của `e_s + e_v ≥ D` chứ không phải một khẳng định.

### 3.6 Ba lựa chọn, và cảm giác của từng bên

Vì tổng cố định, mọi thiết kế chỉ là một cách chọn `t*` và chặn nó. Ba lựa chọn thật sự có trên thị trường:

| | (1) Không bù | (2) Bù đầy đủ | (3) Bù có trần |
|---|---|---|---|
| `t*` | `now` | `t_view` | `max(t_view, now − cap)` |
| Bắn, RTT 40 ms | lệch 0,60 m — **trượt sạch** | trúng cái đã ngắm | trúng cái đã ngắm |
| Bắn, RTT 200 ms | lệch 1,00 m — bỏ game | trúng cái đã ngắm | trúng cái đã ngắm |
| Bắn, RTT 400 ms | lệch 1,50 m | trúng cái đã ngắm | vẫn phải dẫn **0,50 m** |
| Nạn nhân chịu tối đa | 0 | **1,50 m**, không trần | **1,00 m** (trần 200 ms) |
| Ai được lợi | ping thấp nhất phòng | ping cao nhất phòng | phần giữa phân phối |
| Người bắn thấy | *"ngắm trúng mà không ăn đạn"* | *"chuẩn"* | *"chuẩn, trừ khi mạng tôi tệ"* |
| Nạn nhân thấy | *"chuẩn"* | *"chết sau khi đã nấp, không hiểu vì sao"* | *"thỉnh thoảng oan, không quá vô lý"* |

Ngành chọn (3); lịch sử của quyết định đó tại GDC 2001 nằm ở bài 4. Điều bài 4 chưa nói: (2) và (3) khác nhau ở **đúng một dòng** — "nạn nhân chịu tối đa". (2) để hở, và đại lượng để hở trong hệ thống có người chơi thì sớm muộn cũng có người kéo nó đi xa nhất có thể.

### 3.7 Trần tua ngược: ai thiệt, tính ra mét

Chọn trần là chọn con số ở dòng cuối bảng trên: với `v` = 5 m/s, trần chính là **quãng tối đa một nạn nhân có thể bị giết sau lưng**.

```
cap 200 ms  ->  nạn nhân chịu tối đa 5 × 0,200 = 1,00 m
```

1,00 m là chiều rộng một khung cửa: *"không ai bị bắn chết khi đã vào sâu sau khung cửa quá một bước chân"* — một câu người không biết gì về mạng cũng hiểu, và đó là **cách đúng để chọn trần**: bắt đầu từ mét chứ không từ mili giây.

Ai trả? Người bắn có `RTT/2 + d > cap`; với `d` = 100 ms, ngưỡng là `RTT = 2 × (200 − 100) = 200 ms`:

| RTT người bắn | Cần tua | Được tua | Mất | Phải tự dẫn bắn |
|---|---|---|---|---|
| 40 ms | 120 ms | 120 ms | 0 | 0 |
| 200 ms | 200 ms | 200 ms | 0 | 0 |
| 240 ms | 220 ms | 200 ms | 20 ms | 0,10 m |
| 300 ms | 250 ms | 200 ms | 50 ms | 0,25 m |
| **400 ms** | 300 ms | 200 ms | **100 ms** | **0,50 m** |

Người RTT 400 ms mất đúng 100 ms tua ngược, quy ra **0,50 m ở 5 m/s — trọn một thân người**. Anh ta không bị loại khỏi cuộc chơi như ở phương án (1) (lệch 1,50 m, gấp ba thân), nhưng phải ngắm chệch một thân — trên mục tiêu chạy ngang đó là ranh giới trúng/trượt. Trần vì thế là **quyết định sản phẩm chứ không phải kỹ thuật**: *ai được bảo vệ khỏi chết oan quá 1 m, và ai bị đẩy sang trạng thái phải tự dẫn bắn?* Hạ xuống 150 ms thì nạn nhân chỉ chịu tối đa 0,75 m nhưng ngưỡng thiệt tụt về `RTT = 100 ms` — khoảng rất đông người. Nâng lên 300 ms thì gần như không ai phải dẫn bắn, đổi lại chết oan tới 1,50 m.

---

## ⏸ Dừng lại — đoán trước #3

Cùng server, cùng trần 200 ms. Người chơi RTT 180 ms bắn hai loại vũ khí vào cùng một mục tiêu: **súng trường** hitscan trúng tức thì, và **rocket** bay 3 giây mới chạm — mục tiêu nhìn thấy nó bay tới và né được.

**Server nên tua ngược 190 ms cho phát nào?**

```
(a) Cả hai — cùng một người bắn, cùng một độ trễ, phải đối xử như nhau
(b) Chỉ súng trường
(c) Chỉ rocket, vì đạn bay lâu nên càng cần bù nhiều
(d) Cả hai, nhưng rocket tua 3.190 ms cho đủ cả thời gian bay
```

---

### 3.8 Bốn chỗ lag compensation không được phép chạm vào

Đáp án là **(b)**, và tiêu chí sau đây bao trùm cả bốn trường hợp:

> Tua ngược chỉ hợp lệ khi kết quả **đã được định đoạt tại `t_view`**. Nếu kết quả phụ thuộc vào bất cứ quyết định nào nạn nhân đưa ra **sau** `t_view`, thì tua ngược không phải bù độ trễ — nó là **xoá bỏ quyền phản ứng**.

Với súng trường, giữa `t_view` và lúc trúng đạn nạn nhân không có gì để phản ứng: không thấy viên đạn, không nghe phát súng. Xoá 190 ms đó không xoá quyết định nào của anh ta — chỉ xoá quãng đường anh ta tình cờ đi được. Với rocket thì ngược hẳn: nạn nhân **nhìn thấy nó suốt 3 giây**, và mọi bước chân trong 3 giây đó là quyết định có ý thức.

Bốn nhóm không áp dụng được, đều là hệ quả của câu trên:

| Tình huống | Vì sao vỡ | Cách đúng |
|---|---|---|
| **Vũ khí có thời gian bay** (rocket, mũi tên, lựu đạn) | Va chạm xảy ra ở tương lai chứ không ở `t_view`; nạn nhân thấy đạn và né được. | Chỉ tua ngược lúc **sinh** viên đạn (vị trí + hướng nòng theo thứ người bắn thấy), rồi thả vào hiện tại và mô phỏng bình thường. |
| **Hiệu ứng vùng** (nổ, khí độc, hồi máu diện rộng) | Bán kính chạm nhiều entity cùng lúc; tua tất cả về `t_view` của một người tạo ra thế giới **chưa từng tồn tại với bất kỳ ai** — kể cả người ném. | Đánh giá vùng ở **hiện tại**. Chấp nhận người ping cao ném lệch chút — lựu đạn vốn không đòi độ chính xác của viên đạn. |
| **Địa hình thay đổi** (tường phá được, cửa, khiên) | Vòng đệm lưu entity chứ không lưu hình học; tua entity mà để tường ở hiện tại thì tia xuyên qua thứ đáng lẽ chắn nó, và ngược lại. | Coi mảnh địa hình động **là entity** và cho vào cùng vòng đệm, hoặc cấm tua ngược ở khu vực đang biến dạng. |
| **Thứ nạn nhân phản ứng được** (khiên, dịch chuyển, bất tử tạm thời) | Nạn nhân bấm khiên ở `t_view + 50 ms`; tua về `t_view` là **huỷ nút bấm sau khi anh ta đã bấm**. | Kỹ năng phòng thủ có hiệu lực từ tick server nhận được, **không** bị tua ngược. Bất đối xứng có chủ đích. |

Dòng cuối là quy tắc dễ quên nhất: **lag compensation là một chiều.** Nó bù cho người hành động và không được tháo bỏ hành động của người khác; khi hai chiều đụng nhau, ưu tiên hành động đến sau theo đồng hồ server — người bấm khiên thắng.

Giới hạn thứ năm nằm ở chi phí chứ không ở tính đúng đắn: tua ngược **toàn bộ** entity cho mỗi phát bắn là lãng phí. Chỉ khôi phục entity có AABB mở rộng theo `D` cắt tia bắn — khác biệt giữa duyệt 1.000 bản ghi và vài chục.

---

## 4. Gian lận và đo đạc

### 4.1 Lag switch: trần cứng là biện pháp chống gian lận, không chỉ là thoả hiệp

Lượng tua ngược tỉ lệ với `RTT/2 + d`, nên **ping càng cao server càng tua ngược nhiều cho tôi**: độ trễ, thứ vốn là hình phạt, thành tài nguyên. Hai cách khai thác khác nhau về chất — **lag switch** làm nghẽn đường lên vài trăm mili giây ngay trước khi bắn (cần thiết bị ngoài game), và **khai gian `d`** ở mục 3.3, chỉ sửa một con số client gửi lên: rẻ hơn nhiều, không chạm vào mạng, và **không để lại dấu vết trên đồ thị RTT**.

Lợi ích của kẻ gian, `v` = 5 m/s, RTT thật 40 ms:

```
trung thực            : tua 120 ms -> mục tiêu bị bắt ở chỗ 0,60 m trước
đẩy lên RTT 400, KHÔNG trần : tua 300 ms -> 1,50 m        lợi thêm 0,90 m
đẩy lên RTT 400, trần 200   : tua 200 ms -> 1,00 m        lợi thêm 0,40 m
```

Trần cứng cắt **`(0,90 − 0,40) / 0,90 = 55,6%`** giá trị của trò này, và làm thế **mà không cần phát hiện ra ai đang gian lận** — không heuristic, không false positive, không ban. Nó cũng đóng luôn lỗ hổng 3.3, vì `clampDur(...)` không quan tâm `d` từ đâu tới: cái trần đặt ra vì lý do công bằng hoá ra là hàng rào kiểm chứng đầu vào.

Trần không xoá hết — kẻ gian vẫn ăn 0,40 m so với người trung thực cùng đường truyền, phần còn lại phải bắt bằng thống kê, và **phân loại đầy đủ các kiểu cheat là nội dung bài 34**. Đóng góp của bài này: đây là kiểu cheat mà **không gói tin nào sai cả** — mọi giá trị đều hợp lệ, chỉ hoàn cảnh sinh ra chúng là giả.

### 4.2 Đo cái gì

Hai đại lượng, không cái nào là trung bình.

**Một — phân phối lượng tua ngược đã áp dụng**, không phải phân phối RTT: hai người cùng RTT 100 ms nhưng đệm 60 và 160 ms được tua khác nhau. Ghi thẳng biến `lag` sau khi clamp. Mô hình RTT ba nhóm (85% quanh 42 ms, 12% quanh 110 ms, 3% quanh 260 ms, log-normal), 200.000 phát bắn, `d` = 100 ms:

```
tua ngược:  p50 = 123 ms   p90 = 156 ms   p99 = 280 ms
```

`p50 = 123 ms` gần trùng 120 ms lý thuyết — hệ thống lành. Đáng nhìn là **khoảng cách p50 → p99, gấp 2,3 lần**; p99 tụt sát p50 nghĩa là trần quá thấp, hoặc bạn đã mất hết người chơi ping cao.

**Hai — tỉ lệ phát bắn bị cắt vì chạm trần.** Con số biến việc chọn trần thành quyết định có dữ liệu:

| Trần | Nạn nhân chịu tối đa (5 m/s) | % phát bắn bị cắt |
|---|---|---|
| 150 ms | 0,75 m | **12,05%** |
| **200 ms** | **1,00 m** | **3,43%** |
| 250 ms | 1,25 m | 1,49% |
| 300 ms | 1,50 m | 0,76% |

*(Suy từ mô hình RTT ba nhóm ở trên — bậc độ lớn, không phải hằng số. Thay bằng phân phối đo thật thì mọi con số đổi; cách tính thì không.)*

Hạ 200 → 150 ms rút quãng chết oan tối đa được 0,25 m, đổi lại **gấp 3,5 lần số phát bắn bị cắt** (12,05 / 3,43 = 3,51). Nâng 200 → 300 ms giảm số phát bị cắt còn 0,76% nhưng cho phép chết oan ở 1,50 m — ba thân người. 200 ms là chỗ đường cong bắt đầu phẳng; đó mới là lý do của con số đó, không phải vì nó tròn.

Ba thứ đáng ghi thêm: **tua ngược tách theo trúng/trượt** (phát *trúng* lệch hẳn sang phải so với phát *trượt* ở cùng một người nghĩa là tua ngược đang mua sát thương chứ không mua công bằng); **tua ngược theo thời gian của từng người** (RTT thật trôi chậm, `lag` nhảy vọt đúng 300 ms trước mỗi lần hạ gục là chân dung lag switch — đầu vào cho bài 34); và **tỉ lệ "chết sau khi đã nấp"**, phần trăm cú trúng mà tại `now` nạn nhân đã khuất tầm nhìn người bắn. Cái cuối là con số duy nhất khớp với lời phàn nàn: nếu nó không giảm khi bạn hạ trần thì cái bạn đang chữa không phải cái người chơi đang kêu.

---

## 5. Tính tay

**Bài 1.** Game bắn súng chiến thuật: đi bộ 3 m/s, chạy 6 m/s, snapshot 30 Hz nên `d = 2T`. Người bắn RTT 60 ms: `d`, lượng tua ngược và `D` ở hai tốc độ là bao nhiêu? Hitbox thân 0,5 m — ở tốc độ nào thì `D ≤ w` và tranh cãi biến mất (mục 3.5)? Muốn giữ tính chất đó cả khi chạy, phải hạ tốc độ chạy xuống bao nhiêu, hoặc nâng snapshot lên bao nhiêu Hz?

**Bài 2.** Server 128 người, sim 60 Hz, bản ghi 416 B, trần 250 ms. Vòng đệm đúng kích thước cần bao nhiêu tick mỗi entity, tổng bao nhiêu MiB? Giữ 1 giây thì lãng phí mấy lần? Đội đề xuất lưu 30 Hz để cắt đôi: sai số nội suy tối đa ở 6 m/s bẻ 90° là bao nhiêu cm, bằng bao nhiêu phần trăm hitbox đầu 0,2 m?

**Bài 3.** Vẫn `v` = 5 m/s, `d` = 100 ms. Yêu cầu sản phẩm: *"không ai chết khi đã khuất sau tường quá 0,60 m"*. Trần phải đặt bao nhiêu ms? Từ RTT bao nhiêu trở lên thì người bắn phải tự dẫn? Người RTT 200 ms phải dẫn mấy mét, so với thân người 0,5 m thế nào? Dùng bảng 4.2: trần này nằm giữa hai dòng nào, tỉ lệ phát bắn bị cắt ước trong khoảng nào?

---

## 6. Chuyển giao

**Game đấu kiếm 1 đấu 1.** Nhân vật đi 4 m/s, lướt tránh (dash) 12 m/s trong 0,2 giây. Đòn chém là quét hình nón tầm 2 m, tức thời khi bấm. Có nút **đỡ (parry)** cửa sổ hiệu lực 150 ms. Snapshot 30 Hz, `d = 2T`, RTT trung bình 70 ms.

1. Tính `d`, lượng tua ngược và `D` ở 4 m/s và 12 m/s. Ở tốc độ dash, `D` so với tầm đòn 2 m thế nào — và điều đó nói gì về việc người dash có "an toàn" khi đã ra khỏi tầm không?
2. Parry rơi đúng vào dòng cuối bảng 3.8. Viết hai thứ tự xử lý có thể xảy ra khi một đòn chém (tua ngược 135 ms) và một parry (không tua ngược) tới cùng một tick, kèm kết quả mỗi thứ tự. Bạn chọn cái nào, và ai sẽ viết ticket?
3. Đội muốn tua ngược **cả hình nón lẫn nạn nhân** cho đối xứng. Cho một ví dụ chỉ ra vì sao đối xứng ở đây lại sai — gợi ý: người ra đòn cũng đang di chuyển và biết vị trí của chính mình theo thời gian thực (bài 18).
4. Trần nên đặt bao nhiêu? Xuất phát từ **mét** như mục 3.7: chọn quãng "chết sau khi đã lướt đi" tối đa chấp nhận được rồi quy ngược ra ms. Trần đó chạm vào ai từ RTT bao nhiêu trở lên?
5. **Câu khó nhất:** dash 12 m/s chỉ kéo dài 0,2 giây, ngắn hơn lượng tua ngược của người RTT 300 ms. Tồn tại phát chém mà **toàn bộ cú dash nằm gọn trong cửa sổ tua ngược** — server khôi phục nạn nhân về điểm xuất phát cú dash, trong khi hiện tại anh ta đã cách đó 2,4 m và cú dash đã xong. `e_s + e_v ≥ D` vẫn đúng nhưng **không còn mô tả được cảm giác** của hai người. Giả thiết nào của mục 3.5 đã vỡ khi chuyển động không còn thẳng đều, và bạn thay `D` bằng đại lượng nào để nó đo được thứ người chơi thật sự cảm nhận?

---

## 7. Tóm tắt

- Tua ngược `= RTT/2 + d`; `D = v · (RTT/2 + d)` là **độ lệch không xoá được**. Cấu hình chuẩn bài 20 cho 120 ms → **0,60 m ở 5 m/s, hơn 120% thân người 0,5 m**: không bù thì cả người ping tốt nhất phòng cũng trượt sạch mục tiêu chạy ngang. **`D` không chứa tick rate.**
- Cơ chế: ghi lịch sử mỗi tick, khôi phục hitbox tại `t_view`, raycast, `Undo()` ngay trong cùng tick — cửa sổ tua ngược không được sống qua bất cứ lệnh nào khác.
- **Bộ nhớ không phải ràng buộc**: 1.000 entity × 60 bản ghi × 416 B = **23,8 MiB**. Vòng đệm nên dài đúng bằng trần chứ không phải 1 giây — 200 ms là 12 tick, **nhỏ đi 5 lần còn 4,76 MiB**, và cái được là cache. **Đừng lưu thưa**: 20 Hz thay vì 60 Hz gây sai số **8,84 cm = 44,2% hitbox đầu** để đổi lấy 1,6 MiB.
- **Định luật bảo toàn `e_s + e_v ≥ D`**: phân xử ở thời điểm nào cũng không đổi tổng sai số, chỉ đổi người trả. Phân xử "ở giữa" cho **0,30 m mỗi bên** — sinh cả hai lời phàn nàn thay vì một. Đó là lý do không có phương án thứ ba.
- Lối thoát duy nhất là **giảm `D`** — RTT (hạ tầng), `d` (bài 20, có sàn cứng), **`v` (thiết kế game)**. Tranh cãi biến mất khi `D ≤ w`: `v* = w/0,12` cho **4,17 m/s với thân người** nhưng chỉ **1,67 m/s với hitbox đầu**, nên headshot luôn phải chọn phe.
- **Trần chọn từ mét, không từ mili giây**: 200 ms = "không ai chết quá **1,00 m** sau khi khuất". Giá: RTT 400 ms mất 100 ms tua ngược, phải tự dẫn **0,50 m — trọn một thân**; ngưỡng bắt đầu thiệt là RTT 200 ms.
- **Tua ngược chỉ hợp lệ khi kết quả đã định đoạt tại `t_view`.** Không áp dụng cho vũ khí có thời gian bay (chỉ bù lúc sinh đạn), hiệu ứng vùng (xử ở hiện tại), địa hình đổi, và mọi hành động phòng thủ bấm sau `t_view`. **Lag compensation là một chiều.**
- `d` là **con số client khai** — lỗ hổng kiểu bài 33. Trần cứng cắt **55,6%** giá trị của lag switch (lợi 0,90 → 0,40 m) mà không cần phát hiện ai gian lận; phần còn lại là bài 34.
- Đo **phân phối tua ngược đã clamp** (mô hình: p50 123, p99 280 ms) và **tỉ lệ chạm trần**: 150 ms cắt **12,05%**, 200 ms **3,43%**, 300 ms 0,76%.

→ **Bài 22 — Rollback netcode & lockstep**: bốn bài vừa rồi đều dựng trên một giả định — có một server làm trọng tài. Bài cuối chương bỏ giả định đó, và mọi thứ đổi.
