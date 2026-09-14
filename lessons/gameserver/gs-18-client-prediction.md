# Bài 18 — Client-side prediction

## 1. Mục tiêu

Sau bài này bạn có thể:

- Chỉ ra **prediction cắt được chặng nào** trong ngân sách 182 ms của bài 8, và vì sao con số còn lại **không phụ thuộc RTT nữa**.
- Viết vòng lặp client có prediction trong dưới 15 dòng, và nói được mỗi dòng tồn tại vì lý do gì.
- Tính ra **độ lệch mà người chơi thật sự nhìn thấy** khi luật chơi hai phía không khớp — và giải thích vì sao lỗi 0,1% thì vô hình còn lỗi "đảo hai dòng code" thì thấy rõ.
- Phân loại bất kỳ hành động nào trong game vào **predict được / không nên predict**, bằng một tiêu chí duy nhất chứ không bằng danh sách học thuộc.
- Nói ra **cái giá vĩnh viễn** của prediction và ba cách giảm nó, kèm thứ mà mỗi cách đánh đổi.
- Phát biểu chính xác vấn đề còn lại mà bài 19 phải giải, và vì sao nó không tránh được bằng cách viết code cẩn thận hơn.

---

## 2. Triệu chứng

Cùng một game, cùng server, cùng người chơi, cùng đường mạng. Hai bản build khác nhau đúng **một tính năng**. Đây là mô tả của người test, nguyên văn kiểu mà QA vẫn viết:

> **Bản A:** "Nhân vật nặng. Tôi bấm W thì nó đi, nhưng nó đi *sau* tay tôi. Đổi hướng gấp thì trượt qua mất một đoạn. Chơi 20 phút thấy mệt."
>
> **Bản B:** "Bình thường. Không có gì để nói."

Hai người test đều ở RTT 40 ms — đường mạng tốt nhất trong danh sách của bài 4. Bây giờ đặt số của bài 4 và bài 8 cạnh nhau. Cột giữa là bản A với cấu hình phổ thông hôm nay (snapshot 20 Hz, tức phải chờ thêm nửa chu kỳ 50 ms = 25 ms):

| RTT | Bản A — bấm tới thấy | Bản A với snapshot 20 Hz | Bản B — bấm tới thấy |
|---|---|---|---|
| 40 ms | 56 ms | 81,3 ms | **8 ms** |
| 80 ms | 96 ms | 121,3 ms | **8 ms** |
| 150 ms | 166 ms | 191,3 ms | **8 ms** |
| 250 ms | 266 ms | 291,3 ms | **8 ms** |

Ngưỡng người chơi FPS bắt đầu thấy khó chịu, theo bài 3, là **khoảng 80 ms**. Đọc cột giữa: bản A vượt ngưỡng **ngay ở đường mạng tốt nhất** — 81,3 ms, ở RTT 40, trong nước. Không có đường truyền nào cứu được nó, vì phần lớn 81,3 ms đó không phải đường truyền.

Cột phải mới là chỗ đáng nhìn lâu. Nó **là một hằng số**. 8 ms là nửa chu kỳ khung hình ở 60 FPS — thứ duy nhất còn lại giữa tay người chơi và màn hình. Từ RTT 40 tới RTT 250, con số không nhúc nhích.

Cắt được: **48 ms (85,7%)** ở RTT 40, và **258 ms (97,0%)** ở RTT 250.

Đây là phát minh tháng 12 năm 1996 của QuakeWorld mà bài 4 đã kể tên. Bài này là hoá đơn của nó.

---

## ⏸ Dừng lại — đoán trước #1

Server vẫn là trọng tài duy nhất — không có gì thay đổi ở điều đó. RTT vẫn 40 ms, gói tin vẫn mất 20 ms mỗi chiều. Vậy 48 ms kia biến đi đâu?

```
(a) Client gửi input sớm hơn, trước cả khi người chơi bấm xong
(b) Nén gói input cho nhỏ lại để nó bay nhanh hơn
(c) Client không chờ server nữa — nó tự chạy luật chơi trên một bản sao
    state của riêng nó, vẽ ngay kết quả, đồng thời vẫn gửi input đi
(d) Server đoán trước người chơi sắp bấm gì rồi gửi kết quả sớm
```

Một trong bốn đáp án nghe như gian lận. Nó đúng, và nó là đáp án.

---

## 3. Lý thuyết

### 3.1 Vẽ một tương lai mà mình tự đoán

Đáp án là **(c)**.

Client giữ **bản sao của state** — vị trí, vận tốc, trạng thái nhân vật của chính nó. Khi người chơi bấm phím, client làm ba việc **trong cùng một frame**, không việc nào chờ việc nào:

```
1. gửi input lên server        (bay đi, không chờ trả lời)
2. chạy luật chơi lên bản sao local ngay lập tức
3. vẽ kết quả bước 2
```

Server vẫn nhận input, vẫn xử lý, vẫn là sự thật. Chỉ có điều client **không đợi để biết sự thật** — nó đoán trước, và nó đoán bằng cách chạy đúng thứ mà server sắp chạy.

Client không "đoán" theo nghĩa suy luận thống kê. Nó **biết** input của chính mình — người chơi vừa bấm, ngay đây. Cái nó thiếu là *kết quả server sẽ tính ra*; nếu nó chạy cùng công thức trên cùng đầu vào thì "đoán" trở thành "tính trước". Cả bài này là về việc giữ cho hai chữ đó đồng nghĩa.

Và phải nói ngay để chặn một hiểu nhầm phổ biến: **prediction không giảm độ trễ của hệ thống.** Server vẫn nhận input của bạn ở t = 20 ms, người khác vẫn thấy bạn ở t = 182 ms. Bài 8 đã nói câu này: prediction **chữa cho người bấm, không chữa cho người nhìn**. Nó không mua thời gian, nó mua **cảm giác điều khiển**.

### 3.2 Vòng lặp client

Giả định bài 17 đã dựng xong: input mang `seq` và `tick`, client chạy trước server một khoảng, server có input buffer. Phần thêm vào của bài này chỉ là hai dòng giữa.

```go
for {
    in := ReadInput()                      // phím đang bấm, hướng nhìn
    in.Seq, in.Tick = nextSeq(), clientTick()   // bài 17
    net.Send(in)                           // gửi đi, KHÔNG chờ trả lời

    sim.Step(&local, in, dt)               // áp dụng NGAY vào bản sao local
    pending = append(pending, in)          // giữ lại: server chưa xác nhận

    Render(local)                          // vẽ cái mình vừa tự tính ra
}
```

Ba điểm đáng nói, theo thứ tự quan trọng:

**`sim.Step` phải là cùng một hàm mà server gọi.** Không phải "hàm tương đương", không phải "hàm viết theo cùng spec". Mục 3.3 là toàn bộ về chữ *cùng* này.

**`pending` là lý do bài này không kết thúc ở đây.** Client đã vẽ kết quả của những input đó nhưng server chưa xác nhận cái nào. Danh sách chỉ bị cắt ngắn khi snapshot về mang theo "tôi đã xử lý tới seq bao nhiêu" — dùng snapshot đó để sửa state là bài 19. Ở đây `pending` có đúng một nhiệm vụ: **giữ đủ thông tin để sửa được sau này**. Không giữ thì không sửa được, và bạn không có prediction — bạn có một client tự bịa.

Chi phí của nó nên tính một lần rồi quên. Số input chưa ack xấp xỉ số tick trôi qua trong một vòng round-trip, ở 60 Hz:

| RTT | Input đang chờ ack | Bộ nhớ, ~8 byte/input |
|---|---|---|
| 40 ms | ~2,4 → 3 | 24 byte |
| 80 ms | ~4,8 → 5 | 40 byte |
| 150 ms | ~9,0 → 9 | 72 byte |
| 250 ms | ~15,0 → 15 | 120 byte |

Cộng khoảng client chạy trước server ở bài 17 thì vẫn dưới hai chục phần tử. **Buffer này miễn phí** — đừng tối ưu nó, đừng giới hạn nó bằng một hằng số đẹp mắt.

**`Render(local)` vẽ một thứ chưa ai xác nhận.** Trước bài này, màn hình client là hàm của dữ liệu server gửi về. Từ bài này, nó là **hàm của một simulation chạy trên máy người chơi**, và simulation đó có thể sai.

<svg viewBox="0 0 710 250" role="img" aria-labelledby="gs18-a-t gs18-a-d" style="width:100%;height:auto">
<title id="gs18-a-t">Cùng một lần bấm phím, không prediction và có prediction</title>
<desc id="gs18-a-d">Ở trên, không có prediction, người chơi bấm phím lúc 0 và chỉ thấy nhân vật nhúc nhích ở mốc 56 mili giây sau khi gói tin đi và về. Ở dưới, có prediction, client vẽ ngay ở mốc 8 mili giây, gói tin vẫn đi và về nhưng chỉ để xác nhận, và các input chưa được xác nhận nằm trong một buffer chờ.</desc>
<text x="14" y="18" font-size="12" font-weight="bold" fill="currentColor">KHÔNG PREDICTION — màn hình chờ server</text>
<line x1="60" y1="62" x2="690" y2="62" stroke="currentColor" stroke-opacity="0.35" stroke-width="1"/>
<circle cx="60" cy="62" r="5" fill="#ef4444"/>
<text x="60" y="46" text-anchor="middle" font-size="10" fill="currentColor">bấm W</text>
<path d="M60 62 L 285 62" stroke="#3b82f6" stroke-width="6" stroke-opacity="0.45"/>
<text x="172" y="80" text-anchor="middle" font-size="9" fill="currentColor">gói đi 20 ms</text>
<path d="M285 62 L 378 62" stroke="#84cc16" stroke-width="6" stroke-opacity="0.5"/>
<text x="331" y="80" text-anchor="middle" font-size="9" fill="currentColor">chờ tick 8,3</text>
<path d="M378 62 L 603 62" stroke="#3b82f6" stroke-width="6" stroke-opacity="0.45"/>
<text x="490" y="80" text-anchor="middle" font-size="9" fill="currentColor">gói về 20 ms</text>
<path d="M603 62 L 693 62" stroke="#64748b" stroke-width="6" stroke-opacity="0.5"/>
<circle cx="693" cy="62" r="5" fill="#ef4444"/>
<text x="676" y="46" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">thấy · 56 ms</text>
<text x="14" y="140" font-size="12" font-weight="bold" fill="currentColor">CÓ PREDICTION — màn hình không chờ ai</text>
<line x1="60" y1="184" x2="690" y2="184" stroke="currentColor" stroke-opacity="0.35" stroke-width="1"/>
<circle cx="60" cy="184" r="5" fill="#ef4444"/>
<text x="60" y="168" text-anchor="middle" font-size="10" fill="currentColor">bấm W</text>
<rect x="60" y="174" width="30" height="20" rx="4" fill="#84cc16" fill-opacity="0.55"/>
<circle cx="90" cy="184" r="5" fill="#ef4444"/>
<text x="128" y="168" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">thấy · 8 ms</text>
<path d="M60 200 L 285 200" stroke="#3b82f6" stroke-width="6" stroke-opacity="0.28"/>
<path d="M285 200 L 603 200" stroke="#3b82f6" stroke-width="6" stroke-opacity="0.28"/>
<text x="330" y="216" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.8">gói vẫn đi và về — nhưng chỉ để XÁC NHẬN, không ai chờ nó</text>
<circle cx="603" cy="200" r="4" fill="#8b5cf6"/>
<text x="638" y="204" font-size="9" fill="currentColor">ack tới đây</text>
<rect x="95" y="174" width="200" height="20" rx="4" fill="#8b5cf6" fill-opacity="0.28" stroke="currentColor" stroke-opacity="0.3"/>
<text x="195" y="189" text-anchor="middle" font-size="9" fill="currentColor">pending: 3 input chưa ack</text>
<text x="14" y="240" font-size="10" font-style="italic" fill="currentColor" opacity="0.8">RTT 40 ms, sim 60 Hz, render 60 FPS. Dòng dưới không đổi khi RTT tăng — chỉ ô tím dài ra.</text>
</svg>

### 3.3 Một luật chơi, hai nơi chạy — điều kiện không thương lượng

Prediction hoạt động vì client tính ra **đúng** cái server sắp tính. Nếu hai bên tính khác nhau, client không đoán trước nữa — nó **bịa ra một thế giới thứ hai**, và mỗi snapshot về là một lần thế giới đó bị bác bỏ. Chương 3 đã dựng ba mức determinism; bài này là chỗ chúng thôi là lý thuyết:

| Mức | Nội dung | Prediction cần không |
|---|---|---|
| **A** — cùng máy, cùng binary | không `rand` toàn cục, không đọc đồng hồ thật, thứ tự duyệt entity cố định | **Bắt buộc.** Bài 19 sẽ chạy lại `pending` trên state server gửi về. Chạy lại mà ra kết quả khác lần đầu thì nhân vật rung dù server chẳng phản đối gì |
| **B** — máy khác, cùng kiến trúc | khoá phiên bản binary, khoá cờ biên dịch, single-thread | **Không bắt buộc**, nhưng **luật chơi phải trùng nhau về mặt ngữ nghĩa**: cùng công thức, cùng `dt`, cùng thứ tự phép tính |
| **C** — cross-platform bit-for-bit | bỏ float, fixed-point, bảng tra | Không cần. Có trọng tài rồi |

Dòng giữa dễ đọc lướt nhất và đắt nhất. Bài 9 đã nói: reconciliation **không** đòi hai phía ra cùng một bit, vì server sửa 20 lần mỗi giây, sai số không có thời gian nở ra. Đúng. Nhưng "không cần cùng bit" **không có nghĩa là "sai bao nhiêu cũng được"**. Có một ngưỡng, và nó tính được.

Lấy nhân vật chạy 5 m/s — con số bài 4 dùng ở phần lag compensation. **Lệch tỉ lệ:** client dùng 5,005 m/s, server dùng 5,000 — lệch 0,1%, do ai đó sửa hằng số ở một file mà quên file kia. Nếu **không ai sửa gì cả**, hai bản sao rời nhau với vận tốc 0,005 m/s:

```
1 cm  sau  2 giây
10 cm sau  20 giây
1 m   sau  200 giây  = 3 phút 20 giây
```

Đọc con số cuối cho đúng: sau ba phút chạy **một chiều**, bạn-trên-màn-hình và bạn-theo-server đứng cách nhau **một mét** — đủ để bạn nấp sau góc tường trên màn hình mình trong khi theo server bạn vẫn phơi ra ngoài. Đúng triệu chứng của bài 4, nhưng lần này **do bug của bạn**.

Nhưng có ai sửa. Server gửi snapshot 20 Hz, và bài 19 sẽ đặt lại state client rồi chạy lại `pending`. Sai số **chỉ có cửa sổ dài bằng một vòng round-trip để tích luỹ**, không phải 200 giây. Ở RTT 40 ms, cửa sổ đó là 40 + 8,3 ≈ 48,3 ms:

```
5 m/s  ×  0,1 %  ×  48,3 ms  =  0,242 mm
```

**Không ai nhìn thấy 0,242 mm.** Kể cả ở RTT 250 ms, cửa sổ 258,3 ms, con số là 1,29 mm. Lỗi 0,1% là lỗi vô hình.

---

## ⏸ Dừng lại — đoán trước #2

Hai bug, cùng nằm trong hàm di chuyển. Nhân vật chạy 5 m/s, sim 60 Hz, RTT 40 ms, server sửa 20 lần mỗi giây.

```
(a) Client dùng hằng số tốc độ 5,005 thay vì 5,000 — lệch 0,1 %
(b) Client viết:  v += a·dt;  x += v·dt
    Server viết:  x += v·dt;  v += a·dt
    Đảo đúng hai dòng. Công thức y hệt, hằng số y hệt, dt y hệt.
```

**Bug nào người chơi nhìn thấy?** Và người chơi thấy nó **to bằng bao nhiêu**?

Trực giác nói (a) — vì (a) là "sai số" còn (b) chỉ là "sắp xếp lại". Trực giác sai.

---

### 3.4 Hai loại lệch, và loại nguy hiểm không phải loại bạn nghĩ

Đáp án là **(b)**, và đây là số đo. Cho nhân vật tăng tốc a = 40 m/s² tới trần 5 m/s, chạy hai bản đúng như hộp trên, so vị trí:

| Sau | Client (`v` trước) | Server (`x` trước) | Lệch |
|---|---|---|---|
| 0,25 s | 0,9778 m | 0,8944 m | **83,33 mm** |
| 1 s | 4,7278 m | 4,6444 m | **83,33 mm** |
| 5 s | 24,7278 m | 24,6444 m | **83,33 mm** |

Độ lệch **không lớn lên**. Nó đứng yên ở 83,33 mm, và con số đó không ngẫu nhiên: `5 m/s × 16,67 ms = 83,3 mm` — **đúng một tick di chuyển**. Đảo hai dòng đó tương đương một bên áp dụng vận tốc mới sớm hơn bên kia đúng một tick. Ghép với reconciliation:

| Loại lệch | Tích luỹ theo thời gian | Server sửa 20 Hz thì còn lại | Người chơi thấy |
|---|---|---|---|
| **Tỉ lệ** (hằng số tốc độ lệch 0,1%) | có — 1 m sau 200 s | 0,242 mm mỗi lần sửa | không thấy gì |
| **Hằng số** (lệch một tick) | không — chặn ở 83,33 mm | **83,33 mm, mỗi lần sửa, mãi mãi** | **rung liên tục** |

Loại tích luỹ bị reconciliation cắt cụt trước khi kịp lớn. Loại bị chặn thì **reconciliation không cứu được** — nó không lớn lên, nhưng cũng không nhỏ đi, và có mặt ở *mọi* lần sửa. Nhân vật bị kéo giật 8,33 cm, hai mươi lần mỗi giây, vĩnh viễn. Đó là thứ người chơi gọi là "rung", và là bug prediction kinh điển nhất.

> **Độ lệch nguy hiểm không phải độ lệch lớn nhất, mà là độ lệch không tự tắt.** Sai số tích luỹ có trọng tài dập; sai số cấu trúc thì trọng tài dập bao nhiêu lần cũng quay lại đúng bấy nhiêu.

Một mốc để so sánh khi debug: **sai số làm tròn của float không phải nguồn gây rung.** Lệch tương đối cỡ 1e-7 trên 5 m/s cho ra 5e-7 m/s — cần **23 ngày** chạy liên tục mới lệch 1 m. Nhân vật đang rung thì đừng đi tìm float; đi tìm một phép tính khác thứ tự, một `dt` khác, một điều kiện `if` chỉ có ở một phía.

---

## ⏸ Dừng lại — đoán trước #3

Năm thứ dưới đây đều xảy ra ngay sau khi người chơi bấm một phím. Xếp chúng vào hai nhóm: **client nên vẽ ngay** và **client phải chờ server**.

```
1. Nhân vật bắt đầu chạy tới trước
2. Tiếng bước chân, bụi bốc lên dưới chân
3. Máu đối thủ tụt đi khi bạn bắn trúng hắn
4. Cái rương mở ra khi bạn bấm E
5. Cooldown chiêu bắt đầu quay
```

Số 5 là số đáng nghĩ nhất. Nó không thuộc hẳn nhóm nào.

---

### 3.5 Cái gì predict được — và cái gì tuyệt đối không

Lỗi thường gặp không phải "quên làm prediction" mà là **làm prediction cho thứ không được phép**. Tiêu chí chỉ có một, không cần thuộc danh sách:

> **Predict được khi kết quả là hàm của (state của chính tôi, input của chính tôi).**
> Không predict khi kết quả phụ thuộc state của người khác, hoặc phụ thuộc một quyết định mà chỉ server mới đưa ra được.

Áp vào năm mục của hộp trên, và mở rộng ra:

| Việc | Predict? | Vì sao |
|---|---|---|
| Vị trí, vận tốc, va chạm với địa hình tĩnh của **chính mình** | có | chỉ cần input của tôi + luật vật lý + bản đồ mà tôi cũng có |
| Animation chạy/nhảy/nạp đạn, xoay người | có | hệ quả thị giác của dòng trên |
| Tiếng bước chân, bụi, khói nòng, vỏ đạn văng, giật màn hình | có | thuần trang trí — đoán sai cũng không ai chứng minh được |
| Cooldown bắt đầu quay | **tuỳ** | xem đoạn dưới |
| Sát thương gây ra / nhận vào | **KHÔNG** | phụ thuộc vị trí đối thủ, mà vị trí đó bạn đang thấy ở quá khứ (bài 20) và server còn tua ngược nó (bài 21) |
| Ai trúng ai, ai chết | **KHÔNG** | hệ quả của dòng trên |
| Nhặt item, mở rương, loot | **KHÔNG** | có tranh chấp — hai người cùng bấm, chỉ một người được, và người quyết là server |
| Vàng, kinh nghiệm, ô túi đồ | **KHÔNG** | persistent state của bài 1 — thứ mà mất đi thì người chơi mở ticket |

**Vì sao ranh giới đó gắt đến vậy.** Không phải vì nhóm dưới "khó predict hơn". Mà vì **hai nhóm sai theo hai kiểu khác nhau, và chỉ một kiểu sửa êm được**:

- Vị trí là đại lượng **liên tục**. Sai 3 cm thì có vô số trạng thái trung gian giữa chỗ sai và chỗ đúng — client kéo nhân vật về trong vài frame, mắt người không bắt được. Bài 19 sống nhờ tính chất này.
- "Cái rương đã mở" là đại lượng **rời rạc**. Giữa *có item trong túi* và *không có item trong túi* **không tồn tại trạng thái trung gian nào**. Không nội suy được một quyết định nhị phân. Cách duy nhất để sửa là giật: item hiện ra rồi biến mất, máu tụt 40 rồi hồi lại, đối thủ ngã xuống rồi đứng dậy chạy tiếp.

Và đây là kết luận thực dụng, ngược với bản năng "predict càng nhiều càng mượt":

> **Predict sai một thứ không nên predict thì tệ hơn là không predict thứ đó.** Người chơi chờ 96 ms để thấy máu đối thủ tụt thì không ai phàn nàn — họ không có gì để so sánh. Người chơi thấy máu tụt rồi hồi lại thì họ báo bug, và họ đúng.

**Về cooldown — chỗ tuỳ.** Cooldown rời rạc (sẵn sàng / chưa sẵn sàng) nhưng điều kiện của nó nằm trong tay bạn: đủ mana chưa, hết hồi chiêu chưa — client đều biết. Nên phần lớn game **có** predict phần hình ảnh: vòng tròn quay ngay khi bấm, nếu không người chơi bấm liên tục vì tưởng chưa ăn phím. Nhưng chúng **không** predict *hệ quả*: đạn bay ra là hiệu ứng dự đoán, ai trúng thì đợi server. Nếu server từ chối — bị choáng đúng lúc bấm, hoặc mana đã bị một chiêu khác trừ trước — client phải hoàn lại vòng tròn: một cú giật nhỏ, hiếm, chấp nhận được. Đây là **lựa chọn có đánh đổi**, không phải quy tắc; nói nó ra khi thiết kế, đừng để nó thành mặc định ngầm.

### 3.6 Hoá đơn: luật chơi tồn tại hai lần, vĩnh viễn

Bài 1 đã báo trước câu này và bài 4 đã gọi nó là hoá đơn của tháng 12/1996. Giờ là lúc trả.

Nếu client phải tính ra đúng cái server tính thì **toàn bộ luật di chuyển tồn tại ở cả hai phía**: vận tốc, gia tốc, ma sát, trọng lực, độ cao bước lên được, hình dạng collider, thứ tự giải quyết va chạm, luật trượt dọc tường, giới hạn tốc độ chéo. Mỗi mục là một chỗ có thể lệch.

Và không phải chi phí một lần. **Mỗi lần đội thiết kế đổi một con số** — buff tốc độ 5,0 lên 5,2, thêm dash, sửa ma sát trên băng — bạn sửa hai chỗ và chứng minh lại hai chỗ vẫn khớp. Hoá đơn định kỳ, trả tới ngày game đóng cửa. Ba cách giảm, không cách nào xoá được nó:

| Cách | Được | Mất |
|---|---|---|
| **Chung ngôn ngữ, chia sẻ package luật chơi** — Go cả hai đầu, hoặc C# cả hai đầu với Unity | Rẻ nhất, sửa một chỗ. Khớp theo định nghĩa | Khoá cả client lẫn server vào một ngôn ngữ. Muốn client chạy trên trình duyệt là hỏng ngay |
| **Compile simulation sang WASM**, hai phía nạp cùng một binary | Một nguồn sự thật thật sự, kể cả khi hai phía viết bằng hai ngôn ngữ khác nhau | Chi phí gọi qua biên WASM mỗi tick, khó debug, binary lớn, và bạn phải thiết kế simulation thành một module không chạm gì bên ngoài |
| **Viết hai lần, nhưng tách module thuần tuý + test đối chiếu** | Không khoá công nghệ. Dùng được với mọi tổ hợp ngôn ngữ | Đắt về công, và **chỉ hoạt động nếu bộ test thật sự tồn tại và thật sự chạy trong CI** |

Cách thứ ba phổ biến nhất và bị làm hỏng nhiều nhất. "Test đối chiếu" có nghĩa cụ thể: một tệp kịch bản gồm state đầu + chuỗi input cố định, nạp vào cả hai bản, **so từng tick một**, fail khi lệch vượt ngưỡng. So kết quả cuối cùng thì vô dụng — hai lỗi ngược dấu triệt tiêu nhau ở tick cuối là chuyện xảy ra thật.

> Nếu bạn chọn cách ba mà không có bộ test đó, bạn không chọn cách ba. Bạn chọn **phát hiện lệch bằng cách đọc báo cáo bug của người chơi**, và bảng ở mục 3.4 cho biết họ sẽ mô tả nó bằng từ "rung" — từ mơ hồ nhất có thể, chỉ đúng một chỗ trong hàng nghìn dòng luật chơi.

An ủi, theo mục 3.3: bạn cần khớp **về ngữ nghĩa**, không cần khớp **về bit** — không phải bỏ float, không phải fixed-point, không phải bảng tra sin. Mức C của bài 11 dành cho lockstep và rollback ở bài 22. Khoảng cách giữa "cùng công thức" và "cùng bit" là khoảng cách giữa một tuần và một quý.

### 3.7 Rồi server nói khác

Client vừa vẽ 3 tới 15 input mà chưa cái nào được xác nhận. Đa số lần snapshot về sẽ khớp và không có gì xảy ra. Bốn thứ dưới bảo đảm "đa số" không phải "luôn luôn":

1. **Luật chơi lệch** — mục 3.4. Cái này bạn sửa được, và bạn phải sửa.
2. **Gói input mất** (bài 15). Client đã áp dụng input seq 47 và vẽ nó. Server không bao giờ nhận được seq 47, nên nó xử lý 46 rồi 48. Hai bên rời nhau vì một lý do hoàn toàn không liên quan đến code.
3. **Người khác can thiệp.** Bạn dự đoán mình chạy thẳng năm mét. Server nói bạn đâm vào một người vừa lao ngang qua — người mà client bạn nhìn thấy ở vị trí 100 ms trước, hoặc chưa nhìn thấy chút nào.
4. **Server từ chối.** Chống gian lận chặn, rate limit cắt, hoặc trạng thái server nói bạn đang bị choáng.

Số 3 quan trọng nhất vì nó là loại duy nhất **không thể xoá bằng cách viết code cẩn thận hơn**: client không biết cái nó không nhìn thấy. Prediction sai với xác suất khác 0 là tính chất của mô hình, không phải bug đang chờ được sửa. Nên câu hỏi thật sự không phải "làm sao để không bao giờ đoán sai", mà là:

> Client đang vẽ vị trí P. Snapshot về nói vị trí đúng là Q, và nó nói về một thời điểm **đã cũ**, vì trong lúc gói tin bay thì người chơi đã bấm thêm mấy input nữa. Sửa thế nào để (a) về đúng Q-cộng-các-input-mới, và (b) người chơi không nhìn thấy cú sửa?

Hai yêu cầu đó kéo về hai hướng ngược nhau, và cân bằng chúng là toàn bộ bài 19.

---

## 4. Prediction chữa cho ai — đọc lại ngân sách 182 ms

Bài 8 bóc 182 ms thành bảy chặng, từ lúc A bấm tới lúc B nhìn thấy. Prediction không xoá chặng nào trong bảy chặng đó. Nó tạo ra một **đường thứ hai, ngắn hơn, chỉ dành cho A nhìn chính A**:

| Người quan sát | Nhìn cái gì | Độ trễ | Có prediction thay đổi gì |
|---|---|---|---|
| A nhìn **A** | nhân vật của chính mình | 8 ms | **có** — cắt từ 81,3 ms xuống, và cắt đứt liên hệ với RTT |
| A nhìn **B** | người khác | 182 ms | không — bài 20 và 21 lo |
| B nhìn **A** | người khác | 182 ms | không |
| Server nhìn A | sự thật | 28,3 ms sau khi A bấm | không — 20 ms mạng + 8,3 ms chờ tick |

Ba dòng dưới không đổi. Đó là toàn bộ giới hạn của kỹ thuật này, và là lý do chương 5 còn bốn bài nữa: prediction giải quyết **một trong bốn** ô, và là ô duy nhất client có đủ dữ liệu để tự lo. Ba ô còn lại cần nội suy, tua ngược, hoặc chấp nhận độ trễ. Không kỹ thuật nào trong chương này làm cho A và B nhìn thấy cùng một thế giới tại cùng một thời điểm — bài 4 đã kết luận và bài 21 sẽ kết luận lại bằng số: **không có phương án thứ ba.**

---

## 5. Tính tay

**Bài 1 — kích thước buffer.** Game bạn chạy sim 128 Hz (như Valorant ở bài 1), client chạy trước server 2 tick theo bài 17.
- Ở RTT 40 ms, `pending` chứa bao nhiêu input? Ở RTT 250 ms?
- Với 8 byte/input, tổng bộ nhớ cho 100 người chơi trên một node là bao nhiêu?
- Con số đó có xứng đáng để giới hạn `pending` bằng một hằng số không? Nếu bạn *vẫn* muốn giới hạn nó, lý do phải là gì — và nó có phải lý do về bộ nhớ không?

**Bài 2 — bug `dt`.** Đội bạn nâng sim tick từ 60 lên 64 Hz. Server đọc `dt` từ config nên nó thành 1/64. Client hard-code `dt = 1.0/60.0` và không ai để ý.
- Sau một giây chạy 64 tick, client đi được bao xa so với server? Ra bao nhiêu phần trăm?
- Đây là lệch **tỉ lệ** hay lệch **hằng số** theo phân loại mục 3.4?
- Ở RTT 80 ms và tốc độ 5 m/s, mỗi lần server sửa thì nhân vật bị kéo bao nhiêu milimét? So với 83,33 mm của bug đảo dòng — bug nào bị báo trước?

**Bài 3 — ngưỡng nhìn thấy.** Coi 1 cm là ngưỡng người chơi bắt đầu nhận ra cú kéo (ước lượng thô, phụ thuộc góc nhìn và tốc độ).
- Ở RTT 40 ms, luật chơi được phép lệch tối đa bao nhiêu phần trăm trước khi chạm ngưỡng đó?
- Ở RTT 250 ms thì con số là bao nhiêu?
- Tỉ số giữa hai câu trả lời nói gì về việc **ai** trong danh sách người chơi của bạn sẽ báo bug prediction đầu tiên?

---

## 6. Chuyển giao

Không có đáp án trong bài.

**Bạn làm một game MOBA góc nhìn từ trên xuống.** Nhân vật có một chiêu **Dash**: dịch chuyển 5 mét thẳng về phía trước trong 0,15 giây, hồi chiêu 8 giây, tốn 40 mana. Dash bị chặn nếu điểm đến nằm trong tường. Nếu Dash đi xuyên qua một đối thủ, đối thủ đó bị làm chậm 30% trong 2 giây.

1. Trong một lần bấm Dash có bao nhiêu thứ riêng biệt có thể predict hoặc không? Liệt kê rồi phân loại bằng tiêu chí ở mục 3.5.
2. Tường trong bản đồ là **tĩnh** và client có sẵn bản đồ. Vậy "Dash có bị chặn không" — predict được chứ? Điều gì trong câu hỏi này khiến nó **không** giống với "nhặt item"?
3. Bây giờ bản đồ có một loại tường **do người chơi dựng ra và phá được**. Câu trả lời số 2 đổi thế nào, và đổi vì lý do gì?
4. Mana 40 điểm là tài nguyên rời rạc. Client predict việc trừ mana hay chờ server? Trả lời cả hai chiều và nói cái nào bạn chọn.
5. Người chơi có RTT 250 ms bấm Dash đúng lúc đối thủ bấm chiêu choáng. Client bạn đã vẽ Dash xong từ 0,15 giây trước khi biết mình bị choáng. Bạn sửa thế nào, và **thứ tự** — vị trí trước hay hiệu ứng choáng trước?
6. Đội bạn chọn cách giảm đau số 3 ở mục 3.6: hai bản luật chơi, một bộ test đối chiếu. Viết ra kịch bản test nhỏ nhất mà **chắc chắn** bắt được bug đảo hai dòng ở mục 3.4. Nó phải chứa gì mà một kịch bản "chạy thẳng 5 giây" không chứa?
7. **Câu khó nhất:** một hôm bạn nhận ra có thể xoá hẳn hoá đơn viết-hai-lần — bằng cách cho client **không chạy luật chơi gì cả**, mà chỉ **phát lại** đúng chuỗi vị trí server đã gửi, với một khoảng đệm đủ dài để không bao giờ hết dữ liệu. Thiết kế này thật sự tồn tại và đang chạy ở quy mô lớn. Nó tên là gì, nó trả cái giá gì thay cho hoá đơn kia, và thể loại game nào chấp nhận được cái giá đó — thể loại nào thì không?

Câu 7 không có trong bài. Nếu bạn trả lời được nó thì bạn không còn coi prediction là "kỹ thuật đúng", mà là **một điểm trên một trục có ít nhất hai đầu**.

---

## 7. Tóm tắt

- Không prediction, ở RTT 40 ms với snapshot 20 Hz, từ bấm tới thấy là **81,3 ms** — đã vượt ngưỡng ~80 ms của bài 3 **ở đường mạng tốt nhất**.
- Có prediction, con số là **8 ms và là hằng số**: nửa chu kỳ khung hình. Cắt 48 ms (85,7%) ở RTT 40, 258 ms (97,0%) ở RTT 250.
- Client áp dụng input **ngay** vào bản sao local, vẽ luôn, gửi song song, giữ input chưa ack trong `pending` — **3 input ở RTT 40, 15 ở RTT 250, dưới 120 byte**: miễn phí.
- Prediction chỉ đúng nếu `sim.Step` hai phía **là cùng một luật**: cùng công thức, cùng `dt`, cùng thứ tự phép tính. Determinism **mức A bắt buộc**; mức B chỉ cần đúng ở nghĩa ngữ nghĩa; **mức C không cần** vì đã có trọng tài.
- Lệch **tỉ lệ** 0,1% tích luỹ tới 1 m sau 200 giây nếu không ai sửa — nhưng có server sửa thì chỉ còn **0,242 mm** mỗi lần: vô hình. Lệch **hằng số** do đảo hai dòng code bị chặn ở **83,33 mm = đúng một tick** — không lớn lên, nhưng quay lại **mọi** lần sửa: đó mới là thứ người chơi gọi là "rung".
- Sai số làm tròn float cần **23 ngày** mới lệch 1 m — không phải nguồn gây rung.
- Predict được khi kết quả là hàm của **(state của tôi, input của tôi)**: di chuyển, animation, hiệu ứng, âm thanh. Không predict sát thương, ai trúng ai, nhặt item, vàng — chúng **rời rạc**, và sai rời rạc thì không nội suy về được, chỉ giật. **Predict sai thứ không nên predict thì tệ hơn không predict.**
- Hoá đơn vĩnh viễn: **luật chơi tồn tại hai lần**, trả lại mỗi lần đổi một con số cân bằng. Ba cách giảm — chung package, WASM, hoặc hai bản cộng test đối chiếu từng tick — không cách nào xoá được nó.
- Prediction chữa **đúng một ô** trong bốn ô của bảng mục 4: A nhìn A. Ba ô còn lại vẫn là 182 ms.

→ **Bài 19 — Server reconciliation**: client đang vẽ một tương lai nó tự đoán. Bài sau xử lý chuyện tất yếu — khi server nói rằng tương lai đó sai.
