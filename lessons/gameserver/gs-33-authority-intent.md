# Bài 33 — Authority: client gửi ý định, không gửi kết quả

## 1. Mục tiêu

Sau bài này bạn có thể:

- Chỉ ra **bằng số** vì sao kiểm tra quãng đường **mỗi tick** để bắt speed hack luôn sai, và tính được tỉ lệ chặn nhầm mà nó gây ra.
- Tự dẫn ra luật **`W × ε = B`** — độ nhạy nhân với thời gian phát hiện là một hằng số do jitter mạng quyết định, không do bạn chọn — và dùng nó để chọn cửa sổ.
- Xếp bốn kiểm tra hành động (cooldown, rate limit, tầm với, line-of-sight) theo chi phí CPU đo thật trên thang **1,18 µs / 1.000 entity** của bài 8, và biết cái nào chạy mỗi tick được, cái nào chỉ chạy theo sự kiện.
- Nêu đúng **ba chỗ nguyên tắc intent-vs-result gãy**, và với mỗi chỗ nói được server còn *giới hạn biên* được cái gì khi nó không *kiểm chứng* được.
- Trả lời "authoritative đắt gấp mấy lần server chuyển tiếp" bằng số đo được, và nói vì sao con số đó nhỏ hơn nhiều so với người ta tưởng.
- Điền được bảng thiết kế: mỗi loại hành động → client gửi gì, server kiểm gì, bỏ kiểm thì mở ra cheat nào.

---

## 2. Triệu chứng

Bạn vừa bật hệ thống chống speed hack đầu tiên. Nó đơn giản đến mức không thể sai: nhân vật đi tối đa **5 m/s**, tick 60 Hz, nên **mỗi tick nhiều nhất 83,33 mm**. Server nhớ vị trí tick trước, mỗi tick đo khoảng cách, cho thêm **5 %** dung sai. Vượt thì ghi cờ.

Bạn bật trên môi trường staging với 200 tài khoản người thật, mỗi người một trận 10 phút — **36.000 tick**.

```
người chơi bị ghi cờ ít nhất một lần : 200 / 200  = 100 %
tỉ lệ tick bị ghi cờ, trung vị        : 11.856 / 36.000 = 32,93 %
chuỗi tick bị cờ liên tiếp dài nhất   : trung vị 7 tick, cực đại 12 tick (200 ms)
```

Không ai trong 200 người dùng cheat. Không tick nào có nhân vật đi nhanh hơn 5 m/s. Ping trung bình 40 ms, đường mạng bình thường.

Và con số nghiệt nhất: nếu bạn nới dung sai từ 5 % lên **50 %**, tỉ lệ tick bị cờ **không giảm một phần trăm nào** — vẫn đúng 32,93 %.

---

## ⏸ Dừng lại — đoán trước #1

Nới dung sai từ 5 % lên 50 % mà tỉ lệ chặn nhầm **không đổi một chút nào**. Chi tiết đó loại được ba trong bốn giả thuyết dưới đây. Chọn cái còn lại:

```
(a) Sai số float khi server tính vị trí — cộng dồn qua nhiều tick
(b) Lượng tử hoá vị trí (bài 24) làm khoảng cách đo được lệch lên
(c) Có tick server xử lý HAI input của cùng một người thay vì một
(d) Đồng hồ tick trôi (bài 7) làm dt thật lớn hơn 16,67 ms
```

---

## 3. Lý thuyết

### 3.1 Nguyên tắc, ba câu, rồi đi tiếp

Bài 1 đã dựng nguyên tắc: client gửi **ý định** (phím đang bấm, hướng đang nhìn), server tự tính **kết quả** (vị trí, sát thương, ai nhặt được item). Mọi tham số trỏ tới thế giới — `itemId: 7` — là một khẳng định cần kiểm chứng, không phải một dữ kiện.

Nguyên tắc đó đúng, không có gì tranh cãi thêm. Bài này hỏi ba câu khác: **kiểm chứng bằng cách nào, tốn bao nhiêu, và ở đâu thì không kiểm chứng được nữa.** Cả ba đều có đáp án bằng số, và câu đầu bắt đầu ngay ở chỗ hầu hết người ta làm sai lần đầu.

### 3.2 Vì sao "khoảng cách mỗi tick" luôn sai

Đáp án ⏸ #1 là **(c)**, và dấu hiệu nhận ra nó chính là chi tiết "nới dung sai không giúp gì": khi một tick xử lý hai input, quãng đường tick đó là **đúng 2 lần** giới hạn — 166,67 mm. Dung sai 5 %, 20 % hay 50 % đều nằm dưới mức đó; chỉ **100 %** mới cho lọt, mà 100 % nghĩa là không kiểm gì cả.

Vì sao một tick có hai input? Bài 17: client gửi 1 gói input mỗi tick nhưng mạng không giao hàng đều, nên server giữ hàng đợi và mỗi tick tiêu thụ **tối đa 2 input** để bù tick trước bị đói — đúng logic `MaxCatchUp` của bài 6, khác chỗ áp dụng.

Mô phỏng đúng cấu hình đó: một chiều 20 ms, jitter gamma lệch phải, buffer mục tiêu `d = 3` tick, tối đa 2 input mỗi tick, 36.000 tick.

| σ jitter | tick nhận **2** input | tick nhận **0** input |
|---|---|---|
| 5 ms | 24,342 % | 24,333 % |
| 10 ms | 27,683 % | 27,675 % |
| 15 ms | 32,969 % | 32,961 % |

Hai cột **bằng nhau tới ba chữ số thập phân**, và đó không phải trùng hợp: mỗi input tới muộn tạo ra đúng một tick đói *và* đúng một tick gộp.

> Bunching không phải là chuyển động thừa. Nó là chuyển động **bị dời chỗ** — vay của tick trước, trả vào tick sau. Nhìn ở độ phân giải một tick thì nó giống hệt speed hack. Nhìn ở độ phân giải hai tick thì nó biến mất.

<svg viewBox="0 0 720 300" role="img" aria-labelledby="gs33-a-t gs33-a-d" style="width:100%;height:auto">
<title id="gs33-a-t">Jitter dời chỗ chuyển động chứ không tạo thêm chuyển động</title>
<desc id="gs33-a-d">Mười hai tick liên tiếp: một số tick không nhận input nào, một số nhận hai. Kiểm tra quãng đường từng tick báo động ở các tick nhận hai input, trong khi tổng quãng đường trên cửa sổ mười hai tick vẫn đúng bằng mức hợp lệ.</desc>
<text x="12" y="18" font-size="12" font-weight="bold" fill="currentColor">12 tick liên tiếp — cùng một người chơi thật, 5 m/s, không cheat</text>
<text x="12" y="42" font-size="10" fill="currentColor" opacity="0.7">input tiêu thụ</text>
<line x1="100" y1="118" x2="700" y2="118" stroke="currentColor" stroke-opacity="0.4" stroke-width="1"/>
<line x1="100" y1="60" x2="700" y2="60" stroke="#ef4444" stroke-opacity="0.85" stroke-width="1.5" stroke-dasharray="5 3"/>
<text x="104" y="56" font-size="10" fill="currentColor">ngưỡng mỗi tick = 83,33 mm × 1,05</text>
<rect x="105" y="89" width="34" height="29" rx="3" fill="#84cc16" fill-opacity="0.45"/>
<rect x="155" y="89" width="34" height="29" rx="3" fill="#84cc16" fill-opacity="0.45"/>
<rect x="205" y="118" width="34" height="0" rx="3" fill="#64748b" fill-opacity="0.3"/>
<text x="222" y="112" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.6">đói</text>
<rect x="255" y="60" width="34" height="58" rx="3" fill="#ef4444" fill-opacity="0.5"/>
<rect x="305" y="89" width="34" height="29" rx="3" fill="#84cc16" fill-opacity="0.45"/>
<rect x="355" y="118" width="34" height="0" rx="3" fill="#64748b" fill-opacity="0.3"/>
<text x="372" y="112" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.6">đói</text>
<rect x="405" y="60" width="34" height="58" rx="3" fill="#ef4444" fill-opacity="0.5"/>
<rect x="455" y="89" width="34" height="29" rx="3" fill="#84cc16" fill-opacity="0.45"/>
<rect x="505" y="89" width="34" height="29" rx="3" fill="#84cc16" fill-opacity="0.45"/>
<rect x="555" y="118" width="34" height="0" rx="3" fill="#64748b" fill-opacity="0.3"/>
<text x="572" y="112" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.6">đói</text>
<rect x="605" y="60" width="34" height="58" rx="3" fill="#ef4444" fill-opacity="0.5"/>
<rect x="655" y="89" width="34" height="29" rx="3" fill="#84cc16" fill-opacity="0.45"/>
<text x="272" y="136" text-anchor="middle" font-size="9" fill="#ef4444">CỜ</text>
<text x="422" y="136" text-anchor="middle" font-size="9" fill="#ef4444">CỜ</text>
<text x="622" y="136" text-anchor="middle" font-size="9" fill="#ef4444">CỜ</text>
<text x="100" y="158" font-size="10" fill="currentColor" opacity="0.7">tổng 12 tick: 12 input × 83,33 mm = 1,000 m — đúng bằng 5 m/s × 0,2 s. Không thừa một milimét.</text>
<rect x="100" y="180" width="600" height="34" rx="6" fill="#3b82f6" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.3"/>
<text x="400" y="202" text-anchor="middle" font-size="11" fill="currentColor">kiểm trên CỬA SỔ 12 tick → 1,000 m so với trần 1,000 m → không có cờ nào</text>
<text x="100" y="240" font-size="11" font-style="italic" fill="currentColor">Cùng một chuỗi chuyển động. Đổi độ phân giải quan sát, đổi luôn kết luận.</text>
<text x="100" y="264" font-size="10" fill="currentColor" opacity="0.7">3 cờ giả / 12 tick ở ví dụ này; đo trên 36.000 tick với σ = 15 ms cho 32,93 %.</text>
</svg>

### 3.3 Cửa sổ N tick, và luật `W × ε = B`

Đổi sang: cộng dồn quãng đường trên **W tick gần nhất**, so với trần `W × 83,33 mm × (1 + ε)`. Câu hỏi thiết kế duy nhất còn lại là **chọn W và ε bao nhiêu**. Quét cả hai trên 200 người chơi thật mô phỏng (σ = 15 ms, 10 phút mỗi người), lấy ε nhỏ nhất mà **không một ai** bị cờ:

| W (tick) | W × dt | ε nhỏ nhất không chặn nhầm | quy ra `B = W × ε` |
|---|---|---|---|
| 1 | 16,7 ms | 100,00 % | 1,00 input |
| 10 | 166,7 ms | 100,00 % | 10,00 input |
| 30 | 500,0 ms | 46,67 % | **14,00 input** |
| 60 | 1.000 ms | 23,33 % | **14,00 input** |
| 120 | 2.000 ms | 11,67 % | **14,00 input** |
| 300 | 5.000 ms | 4,67 % | **14,01 input** |
| 600 | 10.000 ms | 2,33 % | **13,98 input** |

Cột cuối là kết quả đáng giá của cả bài. Từ W = 30 trở lên nó **là một hằng số**:

> **`W × ε = B`**, với `B` = số input nhiều nhất mà jitter có thể dồn lại rồi trả ra trong một cụm. Ở cấu hình này `B = 14 input = 233,3 ms`.

`B` không phải tham số bạn chọn. Nó là **bề rộng đuôi jitter chia cho dt** — thuộc về đường mạng của người chơi. Bạn chỉ chọn được cách chia nó: W dài thì ε nhỏ, W ngắn thì ε phải to.

Hai dòng đầu bảng là chỗ luật bị chặn trên bởi thứ khác: server tiêu thụ tối đa 2 input/tick nên trong W tick không quá 2W input; với W ≤ 14 cái trần đó siết trước và ε = 100 %, tức không kiểm được gì. **Không tồn tại cửa sổ ngắn nào dùng được.**

Đảo luật lại thành công thức thiết kế:

```
muốn bắt hack ×(1+h)  →  cần ε < h  →  cần W > B / h  →  trễ phát hiện = W × dt

h = 30 %  →  W >  47 tick  =  0,78 giây
h = 10 %  →  W > 140 tick  =  2,33 giây
h =  5 %  →  W > 280 tick  =  4,67 giây
h =  3 %  →  W > 467 tick  =  7,78 giây
```

Kiểm chứng ngược: đặt W = 60, ε = 23,33 % (mức không chặn nhầm ai trong 200 người), rồi cho hack chạy:

| hack | % cửa sổ vượt trần | bắt được mấy / 20 người |
|---|---|---|
| ×1,05 | 0,00 % | 0 |
| ×1,10 | 0,00 % | 8 |
| ×1,15 | 0,22 % | **20** |
| ×1,20 | 11,74 % | 20 |
| ×1,30 | 99,11 % | 20 |

Dòng ×1,10 nên nhìn lâu: tỉ lệ cửa sổ vượt trần làm tròn xuống 0,00 %, nhưng **8 trong 20 người vẫn bị bắt** vì chỉ cần một cửa sổ vượt trong 10 phút là đủ. Hai metric khác nhau, và trộn chúng là cách dễ nhất để kết luận sai.

Cái phải chấp nhận: **hack ×1,05 lọt hoàn toàn** ở W = 60; muốn bắt nó phải lên W = 280, tức kẻ gian lận chạy nhanh hơn 5 % trong gần 5 giây trước khi hệ thống biết. Không có cấu hình nào vừa nhạy vừa nhanh — `W × ε = B` cấm điều đó.

---

## ⏸ Dừng lại — đoán trước #2

Bốn kiểm tra dưới đây chạy cho **1.000 người chơi, mỗi tick**. Xếp chúng theo chi phí CPU, từ rẻ nhất tới đắt nhất — và đoán xem cái đắt nhất gấp bao nhiêu lần `sim.Step` của bài 8 (1,18 µs cho 1.000 entity):

```
1. Cooldown: chiêu này đã hồi xong chưa
2. Rate limit: người này gửi input quá nhanh không
3. Tầm với: mục tiêu có nằm trong 2 m không
4. Line-of-sight: có tường chắn giữa hai người không
```

Con số gấp bao nhiêu lần mới là phần đáng đoán, không phải thứ tự.

---

### 3.4 Bốn kiểm tra hành động, và giá của chúng

Di chuyển khó vì nó liên tục. Hành động rời rạc dễ hơn nhiều và đều quy về một câu: **thứ quyết định tính hợp lệ phải nằm trong RAM của server, không nằm trong gói tin.**

- **Cooldown**: client gửi `{"cast":"fireball"}`, hết. Server có `readyTick[player][skill]` và chính server ghi `readyTick = tick + 90`; trường `"cooldownRemaining"` client gửi kèm thì không ai đọc.
- **Rate limit**: token bucket mỗi kết nối. Không chống cheat gameplay mà chặn client sửa vòng lặp gửi 6.000 gói/giây — input có nhịp cố định (bài 17) nên vượt nhịp là bất thường ở tầng dưới.
- **Tầm với**: so bình phương khoảng cách, không lấy căn. Chính là phần "ở gần tôi" trong ba khẳng định của gói `pickup itemId: 7`.
- **Line-of-sight**: quét tia qua lưới ô, dừng khi chạm ô đặc. Kiểm tra duy nhất phải đọc **địa hình** — và giá của nó phản ánh đúng điều đó.

Đo trên Apple M4, Go 1.26, 0 alloc/op, trung bình ba lần chạy. Thang là `sim.Step` 1.000 entity — bench cho **1,261 µs** ở đây so với **1,18 µs** ở bài 8, lệch 6,9 %: cùng bậc, dùng được.

| Kiểm tra, 1.000 player, 1 tick | ns | µs | % ngân sách 16,67 ms | × sim.Step |
|---|---|---|---|---|
| Tầm với (bình phương khoảng cách) | 232,9 | 0,233 | 0,0014 % | 0,18 |
| Cooldown, 4 chiêu mỗi người | 413,6 | 0,414 | 0,0025 % | 0,33 |
| Tốc độ, cửa sổ 2 ô tích luỹ | 509,4 | 0,509 | 0,0031 % | 0,40 |
| Rate limit token bucket | 547,4 | 0,547 | 0,0033 % | 0,43 |
| *Tốc độ, ring buffer 60 ô* | *1.790,0* | *1,790* | *0,0107 %* | *1,42* |
| **Line-of-sight, tia ~30 m** | **28.573,7** | **28,574** | **0,1714 %** | **22,65** |

Ba điều rút ra, theo thứ tự bất ngờ dần.

**Một — bốn kiểm tra rẻ cộng lại vẫn không đáng kể.** Tầm với + cooldown + tốc độ (bản 2 ô) + rate limit = **1,703 µs = 0,0102 % ngân sách = 1,35 lần** một `sim.Step`. Toàn bộ tầng validate của 1.000 người tốn hơn phần vật lý của họ đúng 35 %, nên câu "authoritative đắt vì phải kiểm mọi thứ" không sống sót qua dòng này.

**Hai — cấu trúc dữ liệu quan trọng hơn bản thân phép kiểm.** Ring buffer 60 ô mỗi người là **234 KiB** cho 1.000 người, quét ra khỏi cache, tốn **1,790 µs — đắt hơn cả `sim.Step`**. Hai ô tích luỹ (ô đang chạy + ô trước, hoán vị mỗi W tick) còn **7,8 KiB, rẻ đi 3,51 lần**; giá là cửa sổ trượt thành *xấp xỉ* trượt, độ dài dao động giữa W và 2W. Theo `W × ε = B` thì cửa sổ dài hơn chỉ làm ε an toàn hơn — đánh đổi gần như miễn phí.

**Ba — LOS đắt gấp 22,65 lần, và đó vẫn không phải vấn đề**, vì LOS **không chạy mỗi tick** mà chạy khi có sự kiện:

```
LOS mỗi tick, 1.000 player : 60 × 1.000 lần/s = 1,71 ms/s = 0,171 % một core
LOS theo sự kiện, 4 phát bắn/giây/người : 4.000 lần/s = 114,3 µs/s = 0,0114 % một core
                                                          → rẻ hơn 15 lần
```

Rate limit chính là thứ giữ con số 4.000 đó đứng yên. **Nó không chỉ chống spam — nó là cái chặn trên của ngân sách validate.** Không có nó, một client sửa code bắt server chạy 60.000 LOS mỗi giây cho riêng nó.

> **Kiểm tra liên tục thì phải rẻ hơn `sim.Step`; kiểm tra đắt thì phải gắn vào sự kiện có rate limit.** Kiểm tra đắt chạy mỗi tick là lỗi thiết kế, không phải lỗi hiệu năng.

---

## ⏸ Dừng lại — đoán trước #3

Bài 21 dạy lag compensation: server tua ngược thế giới về thời điểm người bắn **nhìn thấy**, rồi mới phán trúng hay trượt. Muốn tua ngược thì phải biết tua về đâu, và con số đó đến từ client.

Trong bốn thứ client gửi lên dưới đây, **đúng một thứ** thuộc loại khác hẳn ba thứ còn lại theo tiêu chí của bài 1. Chọn nó, và nói xem server dùng state nào của mình để bác bỏ nó:

```
(a) "tôi đang giữ phím W"
(b) "camera tôi đang nhìn hướng (0,7 ; 0,7)"
(c) "tôi bấm bắn khi tôi đang thấy thế giới ở thời điểm t = 12.847 ms"
(d) "tôi muốn nhặt item số 7"
```


---

### 3.5 Ba chỗ nguyên tắc gãy

Đáp án ⏸ #3 là **(c)**, và ba mục dưới đây nói vì sao. Tới đây nguyên tắc trông toàn thắng: client gửi ý định, server kiểm hết, giá gần bằng không. Bài 1 dừng ở chỗ đó. Đây là chỗ nó không đứng vững.

**Gãy thứ nhất — thứ chỉ client biết.** Hướng nhìn camera là **input** chứ không phải kết quả: nó sinh ra từ con chuột, không suy ra được từ state server. Server không kiểm chứng được "người này *thật sự* đang nhìn hướng đó", chỉ **giới hạn biên** được bằng cách kẹp `|Δyaw| / dt`.

Cái kẹp đó đáng giá bao nhiêu? Mục tiêu cách 20 m, lệch ngang 2 m → góc cần quay `atan(2/20) = 5,71°`. Xấu nhất là quay hết trường nhìn 90°:

| kẹp | mỗi tick 60 Hz | quay hết 90° mất |
|---|---|---|
| 1.000 °/s | 16,7° | 5,4 tick = 90 ms |
| 3.000 °/s | 50,0° | 1,8 tick = 30 ms |

Phản xạ người ở mức ~200 ms *(bậc độ lớn, không phải hằng số)*, tức 12 tick. Aimbot chỉ cần rải cú quay 5,71° đó qua 3 tick là nằm dưới **mọi** dòng trong bảng mà vẫn nhanh hơn người 4 lần. **Kẹp tốc độ quay chặn được teleport-aim, không chặn được aimbot.** Vẫn nên có vì nó rẻ — nhưng đừng ghi vào tài liệu là "chống aimbot".

**Gãy thứ hai — vật lý server không mô phỏng lại nổi.** Ragdoll và xe cộ không phải chất điểm. Tôi đo một ragdoll Verlet **tối giản** — 15 hạt, 20 ràng buộc khoảng cách, 10 vòng lặp solver, không va chạm với địa hình:

```
1 ragdoll / tick      = 1.890 ns  →  gấp 1.499 lần một entity chất điểm
100 ragdoll / tick    = 189,0 µs  =  1,134 % ngân sách
1.000 ragdoll / tick  = 1,890 ms  =  11,34 %
đầy 100 % ngân sách ở 8.818 ragdoll
```

Đọc bảng này cho đúng. Với trận 100 người, **1,134 % ngân sách là rẻ** — không ai bỏ authority vì con số đó. Chi phí thật nằm chỗ khác: bản ragdoll trên là **sàn dưới** (không có va chạm địa hình lẫn ma sát), và quan trọng hơn, client chạy nó bằng PhysX hoặc Havok còn server không thể chạy **cùng binary với cùng thứ tự phép tính** (bài 10, 11). Hai bên lệch, reconciliation nổ liên tục, người chơi thấy xe mình bị kéo giật mỗi lần chạm tường.

Nên nhiều studio chọn: **client giữ authority cho phần vật lý phụ của chính nó** — ragdoll xác chết, mảnh vỡ, xe của chính người lái — server chỉ kẹp biên vị trí và vận tốc. Đây là **đánh đổi thật, không phải lười**: giá là cheat va chạm xe có thật và chặn không nổi bằng server, và studio biết điều đó khi ký.

**Gãy thứ ba — và đây là chỗ độc nhất.** Lag compensation (bài 21) cần biết người chơi **nhìn thấy thế giới ở thời điểm nào** khi bấm nút. Client gửi con số đó. Nó trông như ý định — "tôi bắn lúc tôi thấy khung hình t" — nhưng là **kết quả trá hình**: nó khẳng định một sự kiện đã xảy ra ở thời điểm cụ thể trên máy người khác, và không state nào của server phủ định được nó.

Server có hai lớp chống đỡ, cả hai đều là biên chứ không phải kiểm chứng:

1. **Trần cứng** cho lượng tua ngược — bài 21 đo được nó cắt **55,6 %** giá trị của lag switch (lợi từ 0,90 m xuống 0,40 m).
2. **Đối chiếu với thời điểm gói tin thật sự tới**, tức ước lượng RTT/2 của bài 17.

Lớp thứ hai có một sàn không xoá được. Bài 17 đã tính: khi đường đi và đường về không đối xứng — ví dụ 78 ms / 24 ms — ước lượng một chiều lệch **27,0 ms**, và *gửi thêm bao nhiêu ping cũng không khử được*, vì thiên lệch có trong mọi mẫu. Nghĩa là mọi lời khai timestamp nằm trong ±27,0 ms đều **không phân biệt được với thật**:

```
5 m/s × 27,0 ms = 135 mm  =  27,0 % thân người 0,5 m
so với:  nói dối 100 ms  →  0,50 m  =  trọn một thân người
```

Trần cứng cắt được cái thứ hai; cái thứ nhất không ai cắt được. **135 mm là phần lợi thế mà thiết kế authoritative đúng nhất vẫn phải cho không.**

Ba chỗ gãy có chung một hình dạng, và đó là câu quan trọng nhất của bài:

> Server chỉ kiểm chứng được thứ nó **tự sinh lại được**. Với thứ chỉ tồn tại ở phía client — hướng chuột, thời điểm nhận thức, kết quả một solver không chạy được ở đây — server không có "đúng/sai", chỉ có **"trong biên / ngoài biên"**. Chọn biên là công việc thiết kế, và mọi biên đều để lọt phần nằm dưới nó.

---

## 4. Cái giá thật của authoritative, và bảng thiết kế

### 4.1 Đắt gấp mấy lần một server chuyển tiếp?

Câu này thường được trả lời bằng cảm giác. Đo thử, phòng **100 người**, cùng máy, cùng ngôn ngữ, 0 alloc/op:

- **Server chuyển tiếp**: nhận 100 gói input 12 byte (bài 17), ghép và gửi cho 99 người còn lại. Không chạy luật chơi gì cả.
- **Server authoritative**: `sim.Step` 100 entity + bốn kiểm tra ở 3.4 + dựng snapshot riêng cho từng người, lượng tử hoá vị trí và vận tốc (bài 24).

```
chuyển tiếp, 1 lần fanout        =  16,02 µs
authoritative, sim + validate    =   0,419 µs   ← toàn bộ luật chơi nằm ở đây
authoritative, dựng snapshot     =  25,32 µs
```

Cộng theo nhịp thật của từng bên. Chuyển tiếp phải fanout ở **60 Hz** vì nó chuyển tiếp input; authoritative sim 60 Hz nhưng chỉ gửi snapshot **20 Hz** (bài 8) — nó được quyền vì nó *có* state để tóm tắt, còn bên kia không có gì để tóm tắt:

| | µs mỗi giây | % một core |
|---|---|---|
| chuyển tiếp, fanout 60 Hz | 961,4 | 0,0961 % |
| **authoritative, sim 60 Hz + snapshot 20 Hz** | **531,5** | **0,0532 %** |
| chuyển tiếp giả định fanout 20 Hz | 320,5 | 0,0320 % |

Ở nhịp thật của hai kiến trúc, **authoritative rẻ hơn 1,81 lần**; ép về cùng nhịp gửi 20 Hz cho công bằng thì nó đắt hơn **1,659 lần**. Không phải 10 lần, không phải 100 lần. Và cách bóc con số 531,5 µs mới là chỗ đáng nhớ:

```
luật chơi (sim + validate) : 60 × 0,419 µs =  25,1 µs  =  4,73 %
đóng gói và gửi byte       : 20 × 25,32 µs = 506,4 µs  = 95,27 %
```

> **Chạy toàn bộ luật chơi cho 100 người chiếm 4,73 % CPU của game server. 95,27 % còn lại là đóng gói byte — thứ server chuyển tiếp cũng phải trả.**

Nghĩa là câu "authoritative đắt" hầu như luôn sai khi hiểu là CPU. Hoá đơn thật của authority ghi bằng **mili giây độ trễ** và **luật chơi viết hai lần** — đúng hai thứ chương 5 đã trả: prediction (bài 18), reconciliation (bài 19), lag compensation (bài 21). Chương 5 không tồn tại vì mạng chậm; nó tồn tại vì **server giữ authority**.

Kiểm chéo lên quy mô node của bài 32: 20 phòng × 100 người = 2.000 người → **1,063 % một core** cho authoritative so với 0,641 % cho chuyển tiếp 20 Hz. Cả hai nằm sâu dưới trần NIC mà bài 32 chỉ ra là cái chạm trước. Kết luận của bài 32 giữ nguyên — bạn shard vì hết băng thông, không bao giờ vì hết CPU — và **thêm authority không đổi điều đó**.

### 4.2 Bảng thiết kế

Mỗi dòng một mạch: client gửi gì → server kiểm gì → bỏ kiểm thì mở cửa cho ai.

| Hành động | Client gửi | Server kiểm | Bỏ kiểm → cheat |
|---|---|---|---|
| Di chuyển | phím đang giữ, tick đích | quãng đường tích luỹ trên W tick, `W × ε = B` | speed hack, teleport |
| Nhảy | cạnh "bấm nhảy" | đang chạm đất; số lần nhảy giữa hai lần chạm đất | bunny hop vô hạn, bay |
| Dùng chiêu | id chiêu | `readyTick` do server ghi; đủ mana; chưa bị choáng | spam chiêu không hồi |
| Bắn | cạnh "bấm bắn" + hướng nhìn | rate limit; đạn trong băng do server đếm; raycast do server chạy | rapid fire, đạn vô hạn |
| Trúng ai | **không gửi gì** | server tự raycast tại `t_view` (bài 21) | aimbot tuyệt đối, one-hit kill |
| Sát thương | **không gửi gì** | server tự tra bảng và tự trừ | one-hit kill |
| Nhặt item | `itemId` | item còn tồn tại; trong tầm; chưa ai lấy; LOS | duplicate item, nhặt xuyên map |
| Mở rương / mua | id đối tượng | trong tầm; đủ tiền; tồn kho | duplicate, mua âm tiền |
| Hướng nhìn | vector nhìn | **chỉ kẹp biên** `Δyaw/dt` | aimbot (không chặn được) |
| `t_view` cho lag comp | timestamp | **chỉ kẹp trần** + đối chiếu RTT, sàn 27,0 ms | lag switch (giảm 55,6 %) |
| Ragdoll / vật lý phụ | trạng thái cuối | **chỉ kẹp biên** vị trí và vận tốc | cheat va chạm (chấp nhận) |

Ba dòng cuối in đậm chữ "chỉ kẹp" là **toàn bộ bề mặt tấn công còn lại** sau khi làm đúng tám dòng trên — bài 34 và 35 sống trên đúng ba dòng đó. Và để ý hai dòng đắt nhất, *trúng ai* và *sát thương*, có ô cột client **trống**: trường nào thêm vào gói tin cũng là một trường phải kiểm, nên **cách kiểm rẻ nhất là không nhận trường đó.**

---

## 5. Tính tay

**Bài 1 — chọn cửa sổ cho game khác.** Game đua xe của bài 17: xe chạy 60 m/s, server 60 Hz. Đường mạng của người chơi tệ hơn, đo được `B = 25 input`.
- a) Quãng đường hợp lệ mỗi tick là bao nhiêu mm?
- b) Muốn bắt hack ×1,15 thì W tối thiểu bao nhiêu tick, và trễ phát hiện bao nhiêu giây?
- c) Trần cửa sổ ở W đó, tính ra mét, là bao nhiêu? So nó với chiều dài một vòng đua 3 km: người gian lận đi được bao nhiêu phần vòng trước khi bị phát hiện?

**Bài 2 — ngân sách validate.** Node của bài 32 giữ 2.000 người, tick 60 Hz.
- a) Bốn kiểm tra rẻ (bản 2 ô) tốn bao nhiêu % ngân sách một tick?
- b) Đội gameplay muốn thêm LOS **mỗi tick** cho mỗi cặp người chơi trong tầm — dùng `k = 62,83` entity trong AOI của bài 32, và giả sử một nửa số đó là người chơi. Tốn bao nhiêu % ngân sách? Còn chạy được không?
- c) Chuyển LOS đó sang chạy theo sự kiện với rate limit 4 phát/giây/người thì còn bao nhiêu % một core? Tỉ lệ giữa (b) và (c) là bao nhiêu?

**Bài 3 — hoá đơn authority.** Ba số đo ở 4.1 (0,419 µs sim+validate, 25,32 µs snapshot, 16,02 µs fanout), phòng 100 người.
- a) Nếu bạn nâng snapshot từ 20 Hz lên 30 Hz, phần "luật chơi" tụt từ 4,73 % xuống bao nhiêu %?
- b) Ở snapshot rate nào thì authoritative đắt **đúng bằng** chuyển tiếp 60 Hz?
- c) Câu (b) chứng minh điều gì về việc "authoritative hay không" là biến quyết định chi phí CPU?

---

## 6. Chuyển giao

**MOBA 5 đấu 5, tick 30 Hz.** Có một chiêu dịch chuyển tức thời tầm 400 m, hồi 90 giây, bay theo đường thẳng, **xuyên tường mỏng nhưng không xuyên tường dày**.

1. Mỗi lần dùng chiêu, quãng đường trong cửa sổ nhảy 400 m. Sửa bằng cách nào mà **không** nới ε — và vì sao nới ε là câu trả lời sai?
2. Tick 30 Hz thay vì 60. `B` đo bằng *số input* đổi thế nào, còn `B` đo bằng *mili giây* đổi thế nào? Cái nào là đại lượng chuyển được sang cấu hình khác?
3. "Xuyên tường mỏng nhưng không tường dày" biến LOS từ phép trả lời có/không thành phép tích luỹ độ dày. Chi phí so với 28,57 ns/lần ở 3.4 tăng theo hướng nào, và nó vẫn thuộc nhóm "theo sự kiện" chứ?
4. Client gửi điểm đến của cú dịch chuyển — đó là ý định hay kết quả? Trả lời theo tiêu chí của bài 1, rồi trả lời lại theo tiêu chí "server tự sinh lại được không" của mục 3.5. Hai câu trả lời có giống nhau không?
5. Một người mất kết nối đúng 900 ms rồi vào lại. Khi hàng đợi input của anh ta được xả, kiểm tra cửa sổ nhìn thấy gì? Xử thế nào để nó không thành lệnh ban — và cách xử đó có mở cửa sau cho người cố tình ngắt mạng không?
6. Đội muốn cho **client** quyết định chiêu có bị tường chặn hay không, để nó hiện ra tức thời không chờ RTT. Dùng bảng 4.2 và ba chỗ gãy ở 3.5: cheat nào mở ra, và mức kẹp biên rẻ nhất cắt được phần lớn nó?
7. **Câu khó nhất.** `W × ε = B` giả định `B` là **một** con số cho cả server. Nhưng `B` là thuộc tính của **từng kết nối**: cáp quang thì nhỏ, 4G trên tàu thì lớn gấp mấy lần. Đặt `ε` theo `B` xấu nhất thì người mạng tốt được hưởng một vùng gian lận rộng mà họ không cần. Đặt `ε` riêng cho từng người theo `B` đo được thì **`B` đo từ hành vi của chính client đó** — và client biết điều này sẽ cố tình làm jitter của mình xấu đi để tự nới ε, hệt trò ở câu 6 bài 17. Tồn tại cách đo `B` mà client không tự bơm lên được không? Nếu không, `ε` nên neo vào đại lượng nào khác — và cái giá của lựa chọn đó là gì?

---

## 7. Tóm tắt

- Kiểm khoảng cách **mỗi tick** chặn nhầm **100 % người chơi thật** trong trận 10 phút, **32,93 % số tick** ở σ jitter 15 ms. Nới dung sai 5 % → 50 % không giảm một phần trăm nào: tick bị gộp có quãng đường **đúng 2 lần** giới hạn.
- Bunching không sinh thêm chuyển động: tỉ lệ tick nhận 2 input và tỉ lệ tick đói **bằng nhau tới ba chữ số** (24,342 / 24,333 ở σ = 5 ms). Jitter **dời chỗ** chuyển động; cửa sổ tích luỹ hoàn nguyên đúng phép dời đó.
- **`W × ε = B`**, với `B` = 14 input = 233,3 ms ở cấu hình đo, hằng số từ W = 30 trở lên và do đuôi jitter quyết định chứ không do server. Suy ra `W > B/h` để bắt hack ×(1+h): **×1,30 cần 0,78 s; ×1,10 cần 2,33 s; ×1,05 cần 4,67 s**. Cửa sổ W ≤ 14 bị trần "2 input/tick" siết trước và ε phải bằng 100 % — không dùng được.
- Bốn kiểm tra rẻ cho 1.000 người = **1,703 µs = 0,0102 % ngân sách = 1,35 lần `sim.Step`**. Cấu trúc dữ liệu quan trọng hơn phép kiểm: ring 60 ô tốn 234 KiB và 1,790 µs; hai ô tích luỹ tốn 7,8 KiB, **rẻ hơn 3,51 lần**.
- LOS đắt **22,65 lần `sim.Step`**, nhưng chạy theo sự kiện thay vì mỗi tick làm nó **rẻ đi 15 lần** (114,3 µs/s so với 1,71 ms/s). **Rate limit là cái chặn trên của ngân sách validate.**
- **Ba chỗ nguyên tắc gãy** — hướng nhìn camera, vật lý phức tạp, timestamp cho lag comp — cùng một hình dạng: server chỉ kiểm chứng được thứ nó tự sinh lại được, còn lại chỉ **kẹp biên**. Kẹp `Δyaw` 2.000 °/s cho 33,3° mỗi tick trong khi aimbot chỉ cần 5,71°: chặn teleport-aim, **không chặn aimbot**.
- Ragdoll tối giản tốn **1.499 lần** một entity chất điểm, nhưng 100 con chỉ là 1,134 % ngân sách: cái đắt không phải CPU mà là **không chạy lại được bit-exact cái PhysX của client**.
- Timestamp `t_view` là **kết quả trá hình**. Trần cứng cắt 55,6 % lag switch; phần còn lại có sàn cứng ở **27,0 ms bất đối xứng RTT = 135 mm = 27,0 % thân người** — cho không, không xoá được.
- **Authoritative rẻ hơn server chuyển tiếp 1,81 lần** ở nhịp thật (531,5 so với 961,4 µs/s cho 100 người), đắt hơn **1,659 lần** khi ép cùng nhịp gửi 20 Hz. Trong đó **luật chơi chỉ chiếm 4,73 %**, còn 95,27 % là đóng gói byte mà bên nào cũng phải trả. Hoá đơn của authority ghi bằng mili giây, không bằng CPU.
- Cách kiểm rẻ nhất một trường là **không nhận trường đó**: hai dòng đắt nhất bảng 4.2 — *trúng ai* và *sát thương* — có ô client trống.

→ **Bài 34 — Phân loại cheat & phòng thủ server-side**: biết nguyên tắc và biết chỗ nó gãy. Bài sau liệt kê đầy đủ cái gì người ta thật sự làm — và cái nào server chặn được tuyệt đối, cái nào chỉ giảm được, cái nào không chặn nổi.
