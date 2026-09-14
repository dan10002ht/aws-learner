# Bài 19 — Server reconciliation & rewind-replay

## 1. Mục tiêu

Sau bài này bạn có thể:

- Viết vòng xử lý snapshot **đủ ba bước** — cắt pending, đặt lại state, **chạy lại** — và nói được bỏ bước nào thì hỏng kiểu gì.
- Chứng minh bằng số rằng bỏ bước chạy lại **xoá sạch toàn bộ lợi ích của bài 18**, và tính ra nhân vật bị kéo lùi bao nhiêu centimet.
- Tính **chi phí CPU của replay** ở một RTT bất kỳ từ bench 1,18 µs của bài 8, và kết luận rẻ hay đắt bằng phần trăm ngân sách frame.
- Tự tính **ngưỡng bỏ qua sai lệch** cho game của mình từ ba con số có sẵn, không chép hằng số.
- Chọn độ dài **smoothing** bằng ràng buộc, và chỉ ra điểm mà smoothing dài hơn thì **tệ hơn**.
- Nhìn hình dạng cú giật mà **đọc ra nguyên nhân** trong ba nguyên nhân — và nhận ra cái thứ ba không có bản sửa.

---

## 2. Triệu chứng

Một báo cáo QA điển hình: *"nhân vật rung"* — từ mơ hồ nhất trong danh mục bug, đúng như bài 18 cảnh báo. Nhưng lần này người test quay màn hình ở **240 fps** và bạn đếm được khung hình. Ba số đo:

```
chu kỳ rung : đỉnh cách nhau đúng 12 khung của bản quay 240 fps
              12 / 240 = 50,0 ms  ->  20,0 Hz
biên độ     : 24,15 cm, đo bằng toạ độ debug in ra màn hình
điều kiện   : RTT 40 ms, chạy thẳng 5 m/s, không có ai xung quanh
```

**Số thứ nhất là manh mối, không phải triệu chứng.** Trong hệ thống bạn dựng từ bài 5 tới bài 18, sim chạy 60 Hz, render 60 fps, input gửi 60 Hz. Đúng **một** thứ chạy 20 Hz: **snapshot từ server**. Rung 20,0 Hz nghĩa là nhân vật bị dịch chuyển **mỗi lần snapshot về, và chỉ khi đó** — thủ phạm là đoạn code xử lý snapshot, không phải vật lý, không phải render, không phải mạng.

Số thứ hai chỉ ra nó làm sai cái gì. Bài 18 tính cửa sổ round-trip ở RTT 40 ms là `40 + 8,3 = 48,3 ms`. Nhân với tốc độ chạy:

```
5 m/s × 48,3 ms = 241,5 mm = 24,15 cm
```

Khớp biên độ đo được tới từng milimet. Cú dịch chuyển kia bằng **đúng quãng đường nhân vật đi được trong một vòng round-trip** — mỗi lần snapshot về, client ném đi đúng lượng công việc prediction vừa làm rồi làm lại từ đầu. Tần số và biên độ **không đổi** khi tắt hết người chơi khác: không phải va chạm, không phải mất gói. Đây là bug trong ba dòng code.

---

## ⏸ Dừng lại — đoán trước #1

Snapshot của server mang theo state authoritative và một trường `LastProcessedSeq` — số thứ tự input cuối cùng server đã xử lý (bài 17 dựng `seq` chính vì chỗ này). Client đang có `pending` chứa các input chưa được xác nhận, đúng như bài 18 để lại.

Đoạn code gây ra triệu chứng trên viết như sau:

```go
func OnSnapshot(s Snapshot) {
    pending = dropUpTo(pending, s.LastProcessedSeq)
    local = s.State
}
```

**Nó thiếu gì?**

```
(a) Thiếu kiểm tra thứ tự — snapshot cũ tới sau snapshot mới sẽ ghi đè
(b) Thiếu nội suy — phải kéo nhân vật về từ từ chứ không đặt thẳng
(c) Thiếu bước chạy lại toàn bộ input còn trong pending lên state vừa đặt
(d) Thiếu ngưỡng — sai lệch nhỏ thì không nên sửa
```

Ba trong bốn phương án là thứ bạn sẽ phải thêm vào trước khi hết bài. Chỉ **một** cái giải thích được con số 241,5 mm.

---

## 3. Lý thuyết

### 3.1 Ba bước, và bước thứ ba là bước duy nhất có nội dung

Đáp án là **(c)**. Snapshot mô tả thế giới ở một thời điểm **đã cũ**: nó rời server khi server mới xử lý tới `seq` nào đó, rồi mất RTT/2 để bay về, và trong lúc nó bay thì người chơi vẫn bấm, `pending` vẫn dài ra. Đặt `local = s.State` là đặt nhân vật về quá khứ và **bỏ trắng mọi thứ đã xảy ra từ đó**. Ba bước đầy đủ:

```go
func OnSnapshot(s Snapshot) {
    // 1. vứt input server đã xác nhận — chúng không còn "đang chờ" nữa
    for len(pending) > 0 && pending[0].Seq <= s.LastProcessedSeq {
        pending = pending[1:]
    }
    // 2. đặt lại state local = sự thật server vừa gửi
    local = s.State

    // 3. CHẠY LẠI mọi input server chưa nhìn thấy, đúng thứ tự cũ
    for i := range pending {
        sim.Step(&local, pending[i], dt)
    }
}
```

Đọc bước 3 cho đúng: nó **không** chạy lại từ đầu trận, mà chỉ đoạn giữa *"thời điểm của snapshot"* và *"bây giờ"* — chính là các input còn sót trong `pending`. Bảng bài 18 đã đếm: 3 phần tử ở RTT 40, 15 ở RTT 250.

Điều kiện để bước 3 có nghĩa là **determinism mức A** của bài 18: chạy lại cùng input trên cùng state phải ra cùng kết quả. Nếu không, mỗi lần replay tự tạo ra sai lệch mới và bạn không sửa gì cả — bạn đang trộn state.

`dt` ở bước 3 là `dt` cố định của bài 5, không phải thời gian thật giữa hai frame — mười lăm bước replay xảy ra trong **cùng một khung hình**, nên đo đồng hồ để lấy `dt` thì cả mười lăm bước có `dt` gần 0 và nhân vật không nhúc nhích.

<svg viewBox="0 0 720 300" role="img" aria-labelledby="gs19-a-t gs19-a-d" style="width:100%;height:auto">
<title id="gs19-a-t">Ba bước của một lần reconcile</title>
<desc id="gs19-a-d">Trước khi snapshot về, pending chứa sáu input từ seq 45 tới seq 50 và vị trí dự đoán nằm ở bên phải. Snapshot mang state của server kèm lastProcessedSeq bằng 47, ứng với một vị trí lùi lại phía sau. Bước một vứt ba input 45, 46, 47. Bước hai đặt vị trí về đúng state server. Bước ba chạy lại ba input còn lại 48, 49, 50 và đưa vị trí trở lại gần chỗ ban đầu.</desc>
<text x="14" y="18" font-size="12" font-weight="bold" fill="currentColor">TRƯỚC — pending giữ 6 input chưa ack, client đang vẽ P</text>
<rect x="60" y="30" width="62" height="26" rx="4" fill="#64748b" fill-opacity="0.3"/><text x="91" y="47" text-anchor="middle" font-size="11" fill="currentColor">45</text>
<rect x="126" y="30" width="62" height="26" rx="4" fill="#64748b" fill-opacity="0.3"/><text x="157" y="47" text-anchor="middle" font-size="11" fill="currentColor">46</text>
<rect x="192" y="30" width="62" height="26" rx="4" fill="#64748b" fill-opacity="0.3"/><text x="223" y="47" text-anchor="middle" font-size="11" fill="currentColor">47</text>
<rect x="258" y="30" width="62" height="26" rx="4" fill="#3b82f6" fill-opacity="0.45"/><text x="289" y="47" text-anchor="middle" font-size="11" fill="currentColor">48</text>
<rect x="324" y="30" width="62" height="26" rx="4" fill="#3b82f6" fill-opacity="0.45"/><text x="355" y="47" text-anchor="middle" font-size="11" fill="currentColor">49</text>
<rect x="390" y="30" width="62" height="26" rx="4" fill="#3b82f6" fill-opacity="0.45"/><text x="421" y="47" text-anchor="middle" font-size="11" fill="currentColor">50</text>
<circle cx="560" cy="43" r="7" fill="#f59e0b"/><text x="600" y="47" font-size="11" fill="currentColor">P — vị trí đang vẽ</text>
<text x="14" y="88" font-size="12" font-weight="bold" fill="currentColor">SNAPSHOT VỀ — state Q, LastProcessedSeq = 47</text>
<circle cx="322" cy="112" r="7" fill="#8b5cf6"/><text x="360" y="116" font-size="11" fill="currentColor">Q — sự thật, nhưng của 48,3 ms trước</text>
<line x1="322" y1="112" x2="548" y2="112" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4 3"/>
<text x="435" y="132" text-anchor="middle" font-size="10" fill="currentColor">khoảng cách P–Q = 241,5 mm</text>
<text x="14" y="164" font-size="12" font-weight="bold" fill="currentColor">BƯỚC 1 — vứt 45, 46, 47 · BƯỚC 2 — local = Q</text>
<rect x="60" y="176" width="194" height="26" rx="4" fill="#ef4444" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="3 3"/>
<text x="157" y="193" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.7">đã ack — bỏ</text>
<rect x="258" y="176" width="62" height="26" rx="4" fill="#3b82f6" fill-opacity="0.45"/><text x="289" y="193" text-anchor="middle" font-size="11" fill="currentColor">48</text>
<rect x="324" y="176" width="62" height="26" rx="4" fill="#3b82f6" fill-opacity="0.45"/><text x="355" y="193" text-anchor="middle" font-size="11" fill="currentColor">49</text>
<rect x="390" y="176" width="62" height="26" rx="4" fill="#3b82f6" fill-opacity="0.45"/><text x="421" y="193" text-anchor="middle" font-size="11" fill="currentColor">50</text>
<text x="14" y="234" font-size="12" font-weight="bold" fill="currentColor">BƯỚC 3 — chạy lại 48, 49, 50 trên Q, trong CÙNG một khung hình</text>
<circle cx="322" cy="258" r="6" fill="#8b5cf6"/>
<path d="M322 258 L 400 258" stroke="#84cc16" stroke-width="5" stroke-opacity="0.6"/>
<path d="M400 258 L 478 258" stroke="#84cc16" stroke-width="5" stroke-opacity="0.6"/>
<path d="M478 258 L 556 258" stroke="#84cc16" stroke-width="5" stroke-opacity="0.6"/>
<circle cx="556" cy="258" r="7" fill="#84cc16"/>
<text x="361" y="250" text-anchor="middle" font-size="9" fill="currentColor">48</text>
<text x="439" y="250" text-anchor="middle" font-size="9" fill="currentColor">49</text>
<text x="517" y="250" text-anchor="middle" font-size="9" fill="currentColor">50</text>
<text x="600" y="262" font-size="11" fill="currentColor">P' — vừa đúng, vừa ở hiện tại</text>
<text x="14" y="290" font-size="10" font-style="italic" fill="currentColor" opacity="0.8">Bỏ bước 3 thì nhân vật dừng ở Q: lùi 241,5 mm, hai mươi lần mỗi giây. Đó là triệu chứng ở mục 2.</text>
</svg>

### 3.2 Bỏ bước 3 = trả lại toàn bộ tiền bài 18 vừa kiếm được

Không cần lý luận, chỉ cần nhân. Bỏ bước 3 nghĩa là mỗi snapshot kéo nhân vật về vị trí của `RTT + nửa tick` trước đó:

| RTT | Cửa sổ round-trip | Kéo lùi ở 5 m/s | Tần suất |
|---|---|---|---|
| 40 ms | 48,3 ms | **241,5 mm** | 20 lần/giây |
| 100 ms | 108,3 ms | **541,5 mm** | 20 lần/giây |
| 250 ms | 258,3 ms | **1.291,5 mm** | 20 lần/giây |

Ở RTT 250, nhân vật giật lùi **hơn một mét, hai mươi lần mỗi giây**. Nhưng thứ đáng nói không phải biên độ mà là **vị trí trung bình**: chạy tới rồi bị kéo về, lặp lại — **cái người chơi thấy bám theo state server**, tức bám theo quá khứ 48,3 ms. Đó chính xác là bản A của bài 18, bản mà QA gọi là "nhân vật nặng", cộng thêm một cơn rung mà bản A không có.

> **Prediction không có replay không phải prediction chưa hoàn thiện — nó tệ hơn là không có prediction.** Bản A trễ nhưng mượt; bản này vừa trễ vừa rung.

Bước 1 là dọn rác, bước 2 là nhận sự thật, và cả hai đều **phá** trạng thái hiển thị. Chỉ bước 3 dựng lại nó.

### 3.3 Replay tốn bao nhiêu — tính, đừng đoán

Nỗi lo tự nhiên: chạy lại 15 bước simulation trong một khung hình, hai mươi lần mỗi giây, nghe như một khoản tiền lớn. Bài 8 đã đo `sim.Step`: **1,18 µs cho một bước với 1.000 entity, 0 allocs/op**. Số bước phải chạy lại xấp xỉ `ceil(RTT / dt)` với `dt` = 16,67 ms:

| RTT | Bước replay | Chi phí một lần reconcile | % của một frame 16,67 ms | Cộng dồn 20 lần/giây |
|---|---|---|---|---|
| 40 ms | 3 | **3,54 µs** | 0,0212 % | 70,8 µs/s = 0,0071 % |
| 100 ms | 6 | **7,08 µs** | 0,0425 % | 141,6 µs/s = 0,0142 % |
| 250 ms | 15 | **17,70 µs** | 0,1062 % | 354,0 µs/s = 0,0354 % |

Kể cả ở RTT 250 ms — tệ nhất trong danh sách của bài 4 — replay ăn **một phần nghìn** ngân sách frame và **ba phần vạn** tổng thời gian CPU. Ngưỡng để nó thành vấn đề: muốn replay chiếm 10 % một frame (1.667 µs) thì cần **1.412 bước**, tức RTT **23,5 giây**. Không tồn tại.

Một chỗ cần nói cho chính xác: cột "bước replay" tính `ceil(RTT/dt)`, tức **cận dưới**.
Buffer `pending` thật còn chứa cả phần lead mà bài 17 cố ý cho client chạy trước server, nên
số bước thật cao hơn 2–3 bước. Ở RTT 250 ms là 15 → khoảng 18 bước, tức 21,2 µs thay vì 17,70 —
vẫn nằm dưới 0,13 % ngân sách frame, nên kết luận không đổi.

Bảng trên còn là cận trên rộng: 1,18 µs là chi phí bước cho **cả 1.000 entity**, trong khi client chỉ chạy lại entity của chính nó cộng địa hình tĩnh — nó không có input của ai khác để chạy lại (lý do đầy đủ ở bài 20). Và mục 3.4 sắp cắt phần lớn số lần reconcile bằng một phép so sánh.

Kết luận định hình mọi lựa chọn còn lại: **replay không phải bài toán hiệu năng.** Cân nhắc "replay ít bước hơn cho nhẹ" là tối ưu 0,1 % để đổi lấy sai vị trí. Mọi đánh đổi thật của reconciliation nằm ở **thị giác**, không ở CPU.

---

## ⏸ Dừng lại — đoán trước #2

Bước 3 giờ đã có. Nhân vật đúng vị trí. Nhưng QA vẫn báo rung — biên độ lần này chỉ **2 mm**, và vẫn đúng **20 Hz**.

Client và server khớp nhau về luật chơi, replay chạy đúng. Sai lệch 2 mm đến từ chỗ khác: server gửi vị trí đã **lượng tử hoá** để tiết kiệm băng thông — `int16` trải trên bản đồ 256 m, bước lượng tử `256 / 65.536 = 3,90625 mm`, sai số làm tròn tối đa **1,953 mm**.

**Sai 2 mm trên màn hình là vô hình. Vậy vì sao người ta thấy?**

```
(a) Vì màn hình 4K nên 2 mm trong game thành nhiều pixel
(b) Vì 2 mm cộng dồn — mỗi giây 20 lần thành 4 cm
(c) Vì mắt người không đo khoảng cách, nó đo CHUYỂN ĐỘNG — và 20 Hz
    là nhịp mà một chuyển động bất thường lặp lại thì thấy rõ nhất
(d) Vì lượng tử hoá làm sai lệch tăng dần mỗi lần replay
```

Phương án (b) sai theo một cách đáng nhớ: sai lệch lượng tử hoá **không cộng dồn**, vì mỗi snapshot là một lần làm tròn độc lập quanh giá trị đúng.

---

### 3.4 Ngưỡng bỏ qua — con số bạn phải tự tính

Đáp án là **(c)**. Sai lệch 2 mm **đứng yên** thì không ai thấy; 2 mm **xuất hiện rồi biến mất hai mươi lần mỗi giây** thì nó là một tín hiệu chuyển động tuần hoàn, và hệ thị giác được tối ưu để bắt đúng loại tín hiệu đó. Đo cụ thể trên nhân vật chạy 5 m/s:

```
cú dịch trung bình mỗi snapshot : 0,977 mm   (trung bình |u| của làm tròn đều ±1,953 mm)
xung vận tốc thị giác tối đa    : 1,953 mm / 16,67 ms = 0,117 m/s = 2,34 % tốc độ chạy
quãng đường thừa mỗi giây       : 20 × 0,977 = 19,5 mm/s = 0,39 % quãng đường thật
tần số                          : 20,0 Hz
```

Một cú lệch 0,39 % thì không ai chứng minh được; một dao động 20 Hz thì ai cũng thấy. **Cái gây rung không phải độ lớn, mà là tính tuần hoàn** — và reconciliation, theo thiết kế, tuần hoàn đúng bằng snapshot rate.

Cách chữa là bước 0 đặt trước cả ba bước: **nếu `|local − s.State|` nhỏ hơn ngưỡng X, đừng sửa gì cả** — giữ nguyên state đã predict, vứt input đã ack, đi tiếp. X bị kẹp giữa hai ràng buộc, cả hai tính được từ số đã có:

**Sàn — X phải lớn hơn sai lệch mà bạn biết là vô hại.** Hai nguồn cộng lại trong ca xấu nhất:

```
sai số lượng tử hoá vị trí, tối đa            1,953 mm
lệch luật chơi 0,1 % qua cửa sổ 258,3 ms       1,290 mm   (bài 18, RTT 250)
                                              --------
sàn                                            3,243 mm
```

**Trần — X phải nhỏ hơn ngưỡng người chơi nhận ra một cú kéo**, mà bài 18 lấy **10 mm** làm mốc thô.

Khoảng hợp lệ là `[3,243 mm ; 10 mm]`. Đặt X vào giữa theo trung bình nhân: `√(3,243 × 10) = 5,69 mm`. Làm tròn **xuống** — thà sửa thừa vài lần còn hơn để lọt một lỗi thật:

> **X = 5 mm**, cách sàn 1,54 lần và cách trần 2,0 lần.

Kiểm chéo với bài 18: bug đảo hai dòng cho lệch **83,33 mm cố định** = **16,7 lần** ngưỡng, không cách nào lọt; sai lệch 0,242 mm ở RTT 40 bị chặn với biên **20,7 lần**. Ngưỡng này phân tách hai nhóm rất sạch, và đó là điều kiện để nó dùng được.

**X là một khoảng thời gian, không phải một khoảng cách.** 5 mm ở 5 m/s là **1,0 ms chuyển động** — đó mới là đại lượng chuyển được sang game khác: xe đua 60 m/s ở bài 17 thì 1,0 ms là **60 mm**, và đặt X = 5 mm cho game đó là bắt nó reconcile gần như mọi snapshot. *(Quy đổi theo tốc độ là bậc độ lớn, không phải luật — góc camera và độ zoom cũng đổi ngưỡng nhìn thấy.)*

Ngưỡng xoá nhiễu nền, không xoá sai thật: sai lệch vượt X vẫn phải sửa và cú sửa đó vẫn nhìn thấy được. Mục sau lo phần đó.

### 3.5 Smoothing: đổi độ giật lấy độ lệch, và điểm mà đổi thêm là lỗ

Khi sai lệch vượt X, bước 2 đặt `local` về đúng state server — không thương lượng, vì đó là sự thật. Nhưng **cái vẽ ra màn hình không bắt buộc phải là `local`**. Tách hai thứ:

```
local     state mô phỏng — luôn đúng ngay lập tức sau reconcile
offset    hiệu giữa chỗ đang vẽ và local, giảm dần mỗi frame
render    vẽ tại  local + offset
```

Ở mỗi lần reconcile, cộng vào `offset` đúng lượng vừa bị sửa; mỗi frame nhân `offset` với `(1 − 1/N)`. `N` là núm vặn duy nhất. Lấy một sai lệch 30 mm (cỡ một lần va chạm nhẹ, gấp 6 lần ngưỡng) và đo ba giá trị N ở 60 fps:

| N | Cú dịch lớn nhất trong một frame | Quy ra vận tốc thị giác thừa | So với 5 m/s | Thời gian để offset < 1 mm |
|---|---|---|---|---|
| **1 — snap ngay** | 30,00 mm | 1,80 m/s | **36,0 %** | 16,7 ms (1 frame) |
| **3 frame** | 10,00 mm | 0,60 m/s | 12,0 % | 150,0 ms (9 frame) |
| **10 frame** | 3,00 mm | 0,18 m/s | 3,6 % | **550,0 ms (33 frame)** |

Cột giữa là thứ mắt bắt: snap ngay bơm thêm **36 %** tốc độ chạy vào đúng một khung hình — đó là định nghĩa của "giật". N = 10 hạ nó xuống 3,6 %, dưới ngưỡng nhận biết.

Nhưng cột phải là chỗ kỹ thuật này sập. Snapshot về **mỗi 50 ms**, còn N = 10 cần **550 ms** để tiêu hoá một cú sửa — **gấp 11 lần**. Cú sửa sau chồng lên cú trước chưa xong và `offset` không bao giờ về 0. Trạng thái dừng khi mỗi snapshot đều mang sai lệch 30 mm cùng chiều là `30 / (1 − (1−1/N)³)`:

| N | Offset ở trạng thái dừng | So với 83,33 mm của bug một tick |
|---|---|---|
| 1 | 30,00 mm | 0,36 lần |
| 3 | 42,63 mm | 0,51 lần |
| 10 | **110,70 mm** | **1,33 lần** |

N = 10 làm nhân vật hiển thị lệch authoritative **110,7 mm thường trực** — lớn hơn cả cú giật 83,33 mm mà bài 18 gọi là bug prediction kinh điển nhất. Bạn vừa đổi một cú giật nhìn thấy được lấy một sai vị trí **thường trực** mà người chơi không thấy nhưng **server thì có**: bạn ngắm bằng vị trí trên màn hình, server phán bằng `local`.

Ràng buộc rút ra:

> **N × thời-gian-một-frame ≤ khoảng cách giữa hai snapshot.**
> Ở 60 fps với snapshot 20 Hz: `N ≤ 50,0 / 16,67 = 3,0`.

Ba frame. Nâng snapshot lên 30 Hz thì khoảng cách còn 33,3 ms và N tụt xuống 2 — mượt hơn ở chỗ này thì **ít chỗ để giấu hơn** ở chỗ kia. Đây là một hệ quả của bài 8 mà bảng "bốn cách cắt ngân sách" không ghi.

<svg viewBox="0 0 720 265" role="img" aria-labelledby="gs19-b-t gs19-b-d" style="width:100%;height:auto">
<title id="gs19-b-t">Offset hiển thị tắt dần sau một cú sửa 30 milimet</title>
<desc id="gs19-b-d">Ba đường cong bắt đầu cùng ở 30 milimet. Đường snap ngay rơi thẳng xuống 0 sau một khung hình. Đường N bằng 3 giảm còn dưới 1 milimet sau chín khung hình. Đường N bằng 10 sau mười hai khung hình vẫn còn hơn 8 milimet, trong khi ba snapshot mới đã tới.</desc>
<line x1="70" y1="210" x2="670" y2="210" stroke="currentColor" stroke-opacity="0.4" stroke-width="1"/>
<line x1="70" y1="30" x2="70" y2="210" stroke="currentColor" stroke-opacity="0.4" stroke-width="1"/>
<text x="60" y="214" text-anchor="end" font-size="10" fill="currentColor">0</text>
<text x="60" y="158" text-anchor="end" font-size="10" fill="currentColor">10</text>
<text x="60" y="101" text-anchor="end" font-size="10" fill="currentColor">20</text>
<text x="60" y="45" text-anchor="end" font-size="10" fill="currentColor">30 mm</text>
<line x1="218" y1="30" x2="218" y2="210" stroke="#8b5cf6" stroke-width="1" stroke-dasharray="3 4" stroke-opacity="0.7"/>
<line x1="365" y1="30" x2="365" y2="210" stroke="#8b5cf6" stroke-width="1" stroke-dasharray="3 4" stroke-opacity="0.7"/>
<line x1="513" y1="30" x2="513" y2="210" stroke="#8b5cf6" stroke-width="1" stroke-dasharray="3 4" stroke-opacity="0.7"/>
<line x1="660" y1="30" x2="660" y2="210" stroke="#8b5cf6" stroke-width="1" stroke-dasharray="3 4" stroke-opacity="0.7"/>
<text x="513" y="26" text-anchor="middle" font-size="10" fill="currentColor">snapshot kế tiếp về, mỗi 3 frame</text>
<polyline points="70,41 119,210 168,210 218,210 267,210 316,210 365,210 414,210 463,210 513,210 562,210 611,210 660,210" fill="none" stroke="#ef4444" stroke-width="2.5"/>
<polyline points="70,41 119,97 168,135 218,160 267,177 316,188 365,195 414,200 463,203 513,206 562,207 611,208 660,209" fill="none" stroke="#84cc16" stroke-width="2.5"/>
<polyline points="70,41 119,58 168,73 218,87 267,99 316,110 365,120 414,129 463,137 513,145 562,151 611,157 660,162" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
<text x="140" y="230" font-size="11" fill="#ef4444">snap ngay</text>
<text x="250" y="230" font-size="11" fill="#84cc16">N = 3</text>
<text x="340" y="230" font-size="11" fill="#f59e0b">N = 10 — chưa xong thì cú sửa sau đã tới</text>
<text x="365" y="252" text-anchor="middle" font-size="10" font-style="italic" fill="currentColor" opacity="0.85">trục ngang: khung hình sau lần reconcile, 16,67 ms mỗi khung · trục dọc: offset hiển thị còn lại</text>
</svg>

---

## ⏸ Dừng lại — đoán trước #3

Ba người chơi, ba mô tả khác nhau, cùng một build đã có đủ ba bước, ngưỡng 5 mm và N = 3.

```
1. "Rung đều đặn, lúc nào cũng rung, kể cả chạy một mình giữa bản đồ trống."
2. "Bình thường 20 giây, rồi giật một cái thật mạnh, rồi lại bình thường."
3. "Chỉ giật khi có người chạy sát bên. Đứng một mình thì hoàn hảo."
```

**Ba nguyên nhân, ba cách sửa. Cái nào bạn KHÔNG sửa được?**

---

### 3.6 Đọc hình dạng cú giật để ra nguyên nhân

Ba mô tả trên là ba nguyên nhân duy nhất, phân biệt được bằng **hình dạng theo thời gian**, không cần đọc code:

| # | Mô tả của người chơi | Hình dạng | Nguyên nhân | Bằng chứng xác nhận |
|---|---|---|---|---|
| 1 | rung đều, luôn luôn | **tuần hoàn 20 Hz, biên độ gần như hằng số** | logic client/server lệch (bài 18 mục 3.4) | p50 sai lệch **khác 0 và ổn định**; chạy một mình cũng có; biên độ không đổi theo RTT |
| 2 | thỉnh thoảng giật mạnh | **thưa, đột ngột, biên độ theo cụm** | input mất nên server xử lý thiếu (bài 15, bài 17) | tương quan 1–1 với `% muộn` của metric bài 17; biên độ là bội của 83,33 mm |
| 3 | chỉ giật khi gần người khác | **tương quan với khoảng cách tới entity khác** | va chạm mà client không biết trước | tắt va chạm giữa người chơi thì hết; tần suất tỉ lệ với mật độ người chơi |

**Nguyên nhân 1 — sửa được, và phải sửa.** Cái duy nhất là bug theo nghĩa thông thường, và cũng là cái duy nhất ngưỡng X **không** che được — đúng như thiết kế, vì 83,33 mm là 16,7 lần ngưỡng. Công cụ là bộ test đối chiếu từng tick của bài 18 mục 3.6.

**Nguyên nhân 2 — giảm được, không xoá được.** Một input mất là 83,33 mm ở 5 m/s, ba cái liên tiếp là 25,0 cm (bài 17). Cách giảm đã có sẵn: gửi kèm 2 input gần nhất trong mỗi gói, giá 2,16 KB/s. Nó biến "mất một gói" thành "mất ba gói liên tiếp mới đau" — ở nhóm 4G p = 0,20 của bài 17 thì `0,20³ = 0,8 %`.

**Nguyên nhân 3 — không có bản sửa.** Client không biết cái nó không nhìn thấy. Người kia hiện trên màn hình bạn ở vị trí của 100 ms trước (bài 20), hoặc chưa hiện. Không có lượng code nào làm client biết trước một thông tin nó chưa nhận được.

Ba cách **giảm đau**, cả ba là đánh đổi chứ không phải sửa:

| Cách | Được | Mất |
|---|---|---|
| Tăng N riêng cho sai lệch do va chạm, giữ N = 3 cho phần còn lại | cú giật va chạm mượt hơn hẳn | vi phạm `N ≤ 3` trong lúc smooth — chấp nhận offset thường trực vài trăm ms |
| Không predict va chạm người-với-người: coi người khác là đi xuyên qua được | không đoán thì không đoán trượt | nhân vật chồng lên nhau tới khi server sửa; chỉ hợp game mà va chạm người-người không phải cơ chế chính |
| Giảm khoảng đệm nội suy của người khác (bài 20) | thấy người khác gần thời điểm thật hơn, trượt ít hơn | trả bằng đúng thứ bài 20 sẽ tính: đệm mỏng thì đối thủ giật |

Không cách nào xoá được nguyên nhân 3, và **tick rate cao hơn không tạo ra cách thứ tư** — nó chỉ làm mỗi cú giật nhỏ đi theo tỉ lệ.

### 3.7 Đo cái gì: một phân phối và một tỉ lệ

Với **mỗi** snapshot, trước khi quyết định sửa hay bỏ qua, ghi lại đúng hai thứ:

```
err       = |local − s.State|   tính TRƯỚC bước 2, đơn vị mm
corrected = err > X             có phải sửa không
```

Từ đó dựng một histogram và một counter. Chúng nói ba chuyện khác nhau, và như bài 17 đã dạy, phải đọc cùng nhau:

| Chỉ số | Sức khoẻ | Báo động gì |
|---|---|---|
| **p50 của `err`** | dưới 2 mm — tức dưới sai số lượng tử hoá | p50 = 83,33 mm hoặc bất kỳ giá trị **ổn định khác 0** nào → nguyên nhân 1. Đây là chỉ số bắt lệch logic sớm nhất, trước cả khi ai kịp báo bug |
| **p99 của `err`** | dưới X = 5 mm | vọt lên trong khi p50 vẫn sạch → nguyên nhân 2 hoặc 3; phân biệt bằng cách chấm thêm mật độ người chơi tại thời điểm đó |
| **tỉ lệ `corrected`** | dưới 1 % | vượt 5 % → smoothing chạy liên tục, offset không kịp về 0, `N ≤ 3` bị vi phạm ngay cả khi bạn đặt N = 3 |

p50 và p99 nói *bạn sai ở đâu*; `% corrected` nói *bạn còn giấu được không*. Cả ba tính từ **một số float mỗi snapshot**, 20 lần một giây, ở client. Đây là metric anh em của "độ sớm input" ở bài 17 — bài 17 đo đường lên, bài này đo đường xuống — và hai cái ghép lại trả lời gần hết câu hỏi "vì sao người này chơi tệ hơn người kia".

---

## 4. Ba núm, và thứ tự vặn

Reconciliation có đúng ba tham số bạn được chọn. Vặn sai thứ tự thì mỗi núm che triệu chứng của núm trước và bạn không bao giờ tìm ra bug thật:

| Thứ tự | Núm | Đúng thì | Sai thì bạn thấy | Vì sao phải làm trước |
|---|---|---|---|---|
| 1 | **Replay có chạy không** | nhân vật đúng vị trí, không lùi | rung 20 Hz, biên độ = quãng đường một RTT | Đúng/sai, không phải đánh đổi. Không có nó thì hai núm sau vô nghĩa |
| 2 | **Ngưỡng X** | nhiễu lượng tử hoá bị chặn hết | rung 20 Hz, biên độ vài mm | Có X thì `% corrected` mới là con số có nghĩa để chỉnh núm 3 |
| 3 | **Độ dài smoothing N** | cú sửa thật trở nên khó thấy | hoặc giật mạnh, hoặc lệch thường trực | Nó **che** chứ không sửa |

Núm 3 cám dỗ nhất vì nó làm mọi triệu chứng đẹp lên ngay lập tức: tăng N thì bug logic của nguyên nhân 1 cũng trông mượt hơn — mượt, nhưng nhân vật thường trực đứng lệch chỗ server nghĩ, và bạn vẫn chết sau bức tường như bài 4 mô tả. **Smoothing là mỹ phẩm; đặt nó lên một vết thương chưa khâu thì vết thương vẫn ở đó.**

Và cái duy nhất không có núm: bài 18 đã nói prediction sai với xác suất khác 0 là **tính chất của mô hình**. Reconciliation không làm xác suất đó nhỏ đi — nó chỉ quyết định **người chơi nhìn thấy hậu quả dưới hình dạng nào**: một cú giật, một đoạn trượt mượt, hay một khoảng lệch thường trực. Ba lựa chọn, không có lựa chọn thứ tư.

---

## 5. Tính tay

**Bài 1 — replay ở cấu hình khác.** Game bạn chạy sim 128 Hz (`dt` = 7,81 ms), snapshot 30 Hz, người chơi RTT 200 ms.
- Bao nhiêu bước replay mỗi lần reconcile? Dùng 1,18 µs/bước, tốn bao nhiêu µs?
- Cộng dồn một giây là bao nhiêu µs, và bao nhiêu phần trăm một giây?
- So với dòng RTT 250 của bảng mục 3.3: chi phí tăng hay giảm, và **thứ gì trong cấu hình mới** là nguyên nhân chính?

**Bài 2 — ngưỡng cho game khác.** Bạn làm game đua xe của bài 17: xe chạy 60 m/s, sim 60 Hz, snapshot 20 Hz. Vị trí lượng tử hoá `int16` trên bản đồ 4 km.
- Bước lượng tử là bao nhiêu mm? Sai số làm tròn tối đa?
- Lấy cửa sổ round-trip 108,3 ms (RTT 100) và lệch luật chơi 0,1 %: sàn của X là bao nhiêu?
- Giữ nguyên trần 10 mm thì khoảng hợp lệ còn không? Nếu không, con số nào trong bài **phải** đổi trước — và đổi nó có hợp lý không?

**Bài 3 — smoothing dưới snapshot rate cao.** Đội bạn nâng snapshot từ 20 lên 60 Hz để giảm độ trễ.
- Ràng buộc `N × 16,67 ms ≤ khoảng cách snapshot` cho N bằng bao nhiêu?
- Với sai lệch 30 mm, cú dịch lớn nhất trong một frame khi đó là bao nhiêu mm, và bao nhiêu phần trăm của 5 m/s?
- Bảng bài 8 nói nâng snapshot 20 → 30 Hz cắt 8,3 ms nhưng băng thông **+50 %**. Bài này vừa thêm một cái giá nữa vào cùng phép đổi đó. Phát biểu nó thành một câu.

---

## 6. Chuyển giao

Không có đáp án trong bài.

**Bạn làm một game bắn súng có cơ chế trượt (slide):** giữ `Shift` khi đang chạy thì nhân vật trượt 2,5 m trong 0,4 giây, trong lúc trượt thì **không điều khiển được hướng**, và **hitbox thấp xuống một nửa**. Trượt vào một người khác thì cả hai bị đẩy ra.

1. Một lần trượt kéo dài 0,4 s. Ở RTT 40 ms, có bao nhiêu snapshot về trong khoảng đó, và bao nhiêu lần reconcile có thể xảy ra giữa chừng một cú trượt?
2. Trong lúc trượt, người chơi không điều khiển được. Điều đó làm prediction **dễ hơn hay khó hơn**? Trả lời bằng cách chỉ ra một nguồn sai lệch biến mất và một nguồn không biến mất.
3. Hitbox thấp xuống là một thay đổi **rời rạc** — bài 18 nói rời rạc thì không nội suy được. Nhưng nó lại là hệ quả trực tiếp của một hành động client biết chắc. Bạn predict nó hay không, và nếu có thì `offset` của mục 3.5 áp lên cái gì — vị trí thôi, hay cả hitbox?
4. Ngưỡng X = 5 mm tính cho nhân vật chạy 5 m/s. Trong 0,4 giây trượt, tốc độ trung bình là bao nhiêu, và X có nên đổi trong lúc trượt không? Nếu đổi thì bạn vừa tạo ra một hành vi **phụ thuộc trạng thái** — nó có nguy hiểm gì?
5. Hai người cùng trượt vào nhau. Cả hai client đều predict "tôi trượt xuyên qua", server nói cả hai bị đẩy ra. Đây là nguyên nhân số mấy ở mục 3.6? Cả ba cách giảm đau ở đó có cách nào dùng được không, và cách nào **làm tình hình tệ hơn**?
6. Bạn thêm log `err` như mục 3.7 và thấy: p50 = 0,8 mm, p99 = 4,6 mm, `% corrected` = 0,3 %. Đọc ba số này ra một câu kết luận về sức khoẻ hệ thống. Rồi: cùng bản build đó, một người chơi báo giật nặng. Ba số của **riêng người đó** có thể trông thế nào, và bạn hỏi họ câu gì đầu tiên?
7. **Câu khó nhất:** ba bước của mục 3.1 giả định một điều mà bài chưa bao giờ nói ra — rằng **state server gửi về đủ để khởi động lại simulation từ đó**. Với vị trí và vận tốc thì đúng. Nhưng cú trượt có một biến ẩn: *"đã trượt được bao nhiêu giây trong 0,4 giây"*. Nếu snapshot không mang biến đó, bước 3 chạy lại 3 input trên một nhân vật mà client tưởng vừa **bắt đầu** trượt. Hãy tìm ra: (a) triệu chứng nhìn thấy được của lỗi này khác gì ba hình dạng ở mục 3.6; (b) vì sao **thêm mọi biến vào snapshot** không phải câu trả lời, và ngân sách nào ở bài 8 sẽ chặn bạn; (c) có một lớp giải pháp không cần gửi thêm byte nào — nó dựa trên tính chất gì của `pending` mà bài này đã có sẵn nhưng chưa dùng tới?

Câu 7 là chỗ reconciliation chạm vào thiết kế state — chương 6 sẽ quay lại nó dưới tên khác.

---

## 7. Tóm tắt

- Rung ở **đúng snapshot rate** là chữ ký của reconciliation: cả hệ thống chỉ một thứ chạy 20 Hz. Tần số chỉ ra **ai**, biên độ chỉ ra **cái gì** — 241,5 mm ở RTT 40 là `5 m/s × 48,3 ms`, đúng một vòng round-trip.
- Reconcile là **ba bước**: cắt `pending` tới `LastProcessedSeq`, đặt `local = s.State`, rồi **chạy lại** phần `pending` còn lại với `dt` cố định, trong cùng một khung hình. Bỏ bước 3 thì màn hình bám theo **quá khứ 48,3 ms** — quay về bản A của bài 18 cộng thêm rung. **Prediction không replay thì tệ hơn không prediction.**
- Replay **không phải bài toán hiệu năng**: 3 bước ở RTT 40 tốn 3,54 µs, 15 bước ở RTT 250 tốn 17,70 µs — **0,106 % một frame**, 0,0354 % thời gian CPU. Muốn nó chiếm 10 % một frame cần **1.412 bước, tức RTT 23,5 giây**.
- Sửa mọi sai lệch dù nhỏ thì gây rung không phải vì độ lớn mà vì **tính tuần hoàn**: nhiễu lượng tử hoá 1,953 mm cho xung vận tốc **0,117 m/s = 2,34 %** tốc độ chạy, lặp lại **20,0 Hz**.
- **Ngưỡng X kẹp giữa hai số tính được**: sàn `1,953 + 1,290 = 3,243 mm` (lượng tử hoá + lệch luật 0,1 % của bài 18), trần 10 mm (ngưỡng nhìn thấy). Trung bình nhân 5,69 → **X = 5 mm**. Bug đảo hai dòng 83,33 mm là **16,7 lần** ngưỡng: không lọt được. X thực chất là **1,0 ms chuyển động**, nên nó đổi theo tốc độ của game.
- Smoothing đổi độ giật lấy độ lệch: snap ngay bơm **36 %** tốc độ chạy vào một frame; N = 3 còn 12 %; N = 10 còn 3,6 % **nhưng cần 550 ms** — gấp 11 lần khoảng cách snapshot — và cho offset thường trực **110,7 mm**, lớn hơn cả bug một tick. Ràng buộc: **`N × 16,67 ms ≤ khoảng cách hai snapshot`** → N ≤ 3 ở 20 Hz.
- Ba nguyên nhân, đọc bằng hình dạng: **đều đặn** = logic lệch (sửa được, dùng test đối chiếu); **từng cơn** = mất input (giảm được bằng 2 input dự phòng, 2,16 KB/s); **chỉ khi gần người khác** = va chạm không đoán trước — **không sửa được**, chỉ có ba cách giảm đau và tick rate cao hơn không tạo ra cách thứ tư.
- Đo **phân phối `err`** trước bước 2 và **tỉ lệ vượt ngưỡng**: p50 khác 0 mà ổn định → lệch logic; p99 vọt trong khi p50 sạch → mất input hoặc va chạm; `% corrected` > 5 % → smoothing đã bão hoà. Thứ tự vặn ba núm: **replay → ngưỡng → smoothing** — smoothing là mỹ phẩm, làm đẹp cả triệu chứng của bug thật, vặn nó trước là tự bịt mắt.

→ **Bài 20 — Entity interpolation & extrapolation**: nhân vật của bạn giờ vừa tức thì vừa đúng. Còn hai mươi người kia trên màn hình thì sao — bạn không có input của họ.
