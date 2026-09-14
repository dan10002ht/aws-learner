# Bài 22 — Rollback netcode (GGPO) & lockstep

## 1. Mục tiêu

Sau bài này bạn có thể:

- Tính **cái giá của việc bỏ trọng tài** theo cả hai chiều: tiết kiệm đúng cái gì, mất đúng cái gì không mua lại được.
- Chỉ ra vì sao **lockstep thuần** sống ở RTS mà chết ở fighting game, bằng bảng trần frame rate của bài 3.
- Viết **vòng lặp rollback dưới 15 dòng**, và suy ra ring buffer phải sâu bao nhiêu frame.
- Tính **chi phí lưu/khôi phục state** cỡ S byte, và chỉ ra vì sao "rollback cần state nhỏ" **không phải lý do thật**.
- Tính **số lần chạy lại mỗi giây** cho trận n người, và dùng nó để loại rollback khỏi FPS mà không cần thử.
- Chọn giữa **authoritative client-server + prediction · lockstep · rollback** bằng bốn câu hỏi có ngưỡng đo được.

---

## 2. Triệu chứng

Một game đối kháng 1v1 phát hành với **delay-based netcode** — mặc định của thể loại này suốt hai mươi năm: hai máy chạy lockstep, và để không ai phải chờ ai giữa frame, mọi input **của cả hai người** bị hoãn thi hành vài frame, đủ lâu cho gói tin đi một chiều.

Phản hồi của người chơi ở RTT 100 ms:

> "Offline thì tôi combo được. Online cùng một combo bấm y hệt thì rớt. Không phải tôi bấm sai — nhân vật *ăn phím muộn*."

Một năm sau, studio phát hành lại chính game đó với **rollback** — khác đúng một chỗ: không hoãn input nữa. Hai bản, cùng máy, cùng đường mạng; số frame hoãn là `ceil((RTT/2) / 16,67 ms)`:

| RTT | Frame phải hoãn | Delay-based: bấm tới thấy | Rollback: bấm tới thấy | Cắt được |
|---|---|---|---|---|
| 30 ms | 1 | 24,67 ms | **8 ms** | 16,67 ms (67,6 %) |
| 60 ms | 2 | 41,33 ms | **8 ms** | 33,33 ms (80,6 %) |
| 100 ms | 3 | **58,00 ms** | **8 ms** | 50,00 ms (86,2 %) |
| 150 ms | 5 | 91,33 ms | **8 ms** | 83,33 ms (91,2 %) |

*(8 ms là nửa chu kỳ khung hình ở 60 FPS — hằng số của bài 18. Cột delay-based = số frame hoãn × 16,67 + 8.)*

Ngưỡng fighting game ở bài 3 là **~50 ms**. Dòng RTT 100: delay-based ở **58,00 ms** đã vượt ngưỡng, trên một đường mạng bình thường trong nước. Cột rollback là **một hằng số**, y hệt cột prediction của bài 18.

Bạn đã thấy bảng hình dạng này rồi, và đó không phải trùng hợp: **rollback là client-side prediction đặt trong một thế giới không có server.** Bài 18 đoán trước kết quả input *của chính mình* trong khi chờ trọng tài xác nhận; bài này đoán input *của đối thủ*, và không có trọng tài nào để xác nhận. Bài 21 kết bằng câu: bốn bài vừa rồi đều dựng trên giả định có một server làm trọng tài — bài này bỏ giả định đó.

---

## ⏸ Dừng lại — đoán trước #1

Bỏ server trọng tài, hai máy nối thẳng nhau. **Bạn được gì?**

```
(a) Băng thông rẻ hơn nhiều — chỉ gửi input thay vì state
(b) Bớt được một chặng mạng: A→B thay vì A→server→B
(c) Server rẻ đi vì không phải chạy simulation
(d) Cả ba, và ở game đối kháng 1v1 thì đúng một trong ba có ý nghĩa
```

Đáp án là (d). Chỉ ra **cái nào** là việc của mục 3.1 — hai cái còn lại sai theo hai kiểu khác nhau.

---

## 3. Lý thuyết

### 3.1 Bỏ trọng tài: hoá đơn hai chiều

**Cái được thật sự là (b): một chặng mạng.** Bảng mục 2 cho thấy mỗi 33,3 ms RTT tiết kiệm được đổi thành đúng một frame input lag ít đi. Với ngân sách 50 ms, đó là khoản duy nhất trong ba khoản mà thể loại này cần.

**(a) sai ở 1v1, dù đúng ở RTS.** Bài 3 tính lockstep rẻ hơn client-server **500 lần** cho trận RTS 8 người/200 quân — nhưng con số đó tới từ *tỉ lệ entity trên người chơi*, không từ bản chất lockstep. Ở 1v1, với gói input 12 byte kèm 2 bản dự phòng của bài 17:

| | Client-server: 2 entity × 10 B × 64 Hz | P2P input: 12 B × 3 bản × 60 Hz |
|---|---|---|
| Mỗi chiều | **1,28 KB/s** | **2,16 KB/s** |

Gửi input **đắt hơn** gửi state. Lợi thế băng thông của lockstep chỉ xuất hiện khi số entity vượt xa số người chơi, và fighting game có đúng hai entity — biện minh cho rollback bằng băng thông là dùng lý lẽ của RTS cho một thể loại khác. Còn **(c)** đúng về hoá đơn hạ tầng, nhưng không studio nào chọn netcode vì tiền server; họ chọn vì 8 ms so với 58 ms.

Còn cái mất, và đây mới là phần đắt:

**Mất chống gian lận.** Mỗi máy tự tin kết quả của mình — một trong hai vấn đề chí tử của Doom mà bài 4 liệt kê, ba mươi năm sau vẫn chưa được giải. Cái làm P2P chấp nhận được ở fighting game không phải kỹ thuật mà là hoàn cảnh: 1v1 nên gian lận lộ ngay, và giải đấu chạy trên phần cứng có kiểm soát. Đổi sang 5v5 xếp hạng thì hoàn cảnh đó biến mất, và không có bản vá.

**Mất cơ chế sửa sai tự động.** Suốt chương 5, client tính sai thì snapshot 20 Hz kéo nó về — bài 18 dùng chính tính chất đó để chứng minh lệch 0,1 % chỉ còn **0,242 mm** mỗi lần sửa. Bỏ trọng tài thì không state nào "đúng hơn" state nào: hai máy lệch một bit thì cả hai đều tự tin, và khoảng cách chỉ có một chiều — **to lên**. Đó là **desync**, kết cục là hai trận đấu khác nhau chạy song song trên hai màn hình. Xử lý duy nhất trong thực tế: mỗi N frame trao đổi checksum state, lệch thì **huỷ trận**. Bạn không sửa được desync, bạn chỉ phát hiện được nó.

> Bốn bài trước, đoán sai là chuyện thường ngày và có người dọn. Từ bài này, đoán sai *về input* thì dọn được, còn tính sai *về luật chơi* thì không ai dọn.

### 3.2 Lockstep thuần: mọi máy chờ người tệ nhất

Luật của lockstep thuần chỉ có một dòng, bài 3 đã phát biểu:

> **Không máy nào bước sang frame N+1 khi chưa có input của tất cả mọi người ở frame N.**

Không có gì để tối ưu. Frame N cần input của đối thủ, input đó phải bay một chiều tới, nên mỗi frame tốn ít nhất RTT/2. Bảng trần frame rate của bài 3, thêm dòng 100 ms:

| RTT người tệ nhất | Chờ mỗi frame | Trần frame rate |
|---|---|---|
| 20 ms (LAN) | 10 ms | 100 frame/s |
| 60 ms | 30 ms | 33,3 frame/s |
| **100 ms** | 50 ms | **20 frame/s** |
| 150 ms (xuyên lục địa) | 75 ms | **13,3 frame/s** |
| 300 ms | 150 ms | **6,7 frame/s** |

**Vì sao RTS sống được.** Trục ngang của RTS ở bài 3 là ~250 ms, rộng gấp năm lần fighting game. Nên RTS không chạy lockstep thuần mà chạy lockstep **với turn delay**: mệnh lệnh bấm ở frame N thi hành ở frame N+2, đủ chỗ cho gói tin đi vòng, simulation giữ nguyên nhịp. Người chơi bấm "đưa quân tới đây" rồi thấy quân nhúc nhích 250 ms sau thì không nhận ra, vì trong đầu họ mệnh lệnh đó vốn dĩ mất vài giây.

**Vì sao fighting game không.** Cùng cơ chế đó áp lên ngân sách 50 ms cho ra đúng bảng mục 2. Và chú ý: turn delay hoãn **input của cả hai người, kể cả của chính bạn** — phải thế, vì chỉ hoãn input đối thủ thì hai máy chạy hai chuỗi khác nhau và desync ngay. Đó là lý do người chơi ở mục 2 nói "ăn phím muộn" chứ không nói "đối thủ giật": delay-based làm **chính bạn** chậm đi, hoàn toàn cố ý.

Cùng một RTT, lockstep cho bạn chọn một trong hai cách trả, và cả hai đều lấy tiền của người chơi:

<svg viewBox="0 0 700 250" role="img" aria-labelledby="gs22-a-t gs22-a-d" style="width:100%;height:auto">
<title id="gs22-a-t">Ba cách trả cho cùng một RTT 100 ms</title>
<desc id="gs22-a-d">Ba dải nằm ngang so sánh ba mô hình ở cùng RTT 100 mili giây. Lockstep thuần giữ input lag 8 mili giây nhưng frame rate rơi xuống 20 khung hình một giây. Delay-based giữ 60 khung hình một giây nhưng input lag lên 58 mili giây, vượt ngưỡng 50 mili giây của fighting game. Rollback giữ cả 60 khung hình một giây lẫn 8 mili giây input lag, và trả bằng CPU chạy lại cùng yêu cầu determinism tuyệt đối.</desc>
<text x="14" y="20" font-size="12" font-weight="bold" fill="currentColor">Cùng RTT 100 ms — ba cách trả cho cùng một hoá đơn</text>
<line x1="470" y1="34" x2="470" y2="228" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4 4" stroke-opacity="0.8"/>
<text x="470" y="244" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.85">ngưỡng fighting ~50 ms</text>
<text x="14" y="56" font-size="11" font-weight="bold" fill="currentColor">LOCKSTEP THUẦN</text>
<rect x="150" y="42" width="52" height="24" rx="4" fill="#84cc16" fill-opacity="0.45"/>
<text x="176" y="58" text-anchor="middle" font-size="10" fill="currentColor">8 ms</text>
<rect x="206" y="42" width="240" height="24" rx="4" fill="#ef4444" fill-opacity="0.28" stroke="currentColor" stroke-opacity="0.25"/>
<text x="326" y="58" text-anchor="middle" font-size="10" fill="currentColor">frame rate rơi xuống 20 FPS</text>
<text x="14" y="76" font-size="9" fill="currentColor" opacity="0.75">giữ input lag, hy sinh nhịp</text>
<text x="14" y="118" font-size="11" font-weight="bold" fill="currentColor">DELAY-BASED</text>
<rect x="150" y="104" width="330" height="24" rx="4" fill="#f59e0b" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.25"/>
<text x="315" y="120" text-anchor="middle" font-size="10" fill="currentColor">input lag 58 ms  (3 frame hoãn + 8)</text>
<rect x="484" y="104" width="80" height="24" rx="4" fill="#84cc16" fill-opacity="0.45"/>
<text x="524" y="120" text-anchor="middle" font-size="10" fill="currentColor">60 FPS</text>
<text x="14" y="138" font-size="9" fill="currentColor" opacity="0.75">giữ nhịp, hy sinh input lag</text>
<text x="14" y="180" font-size="11" font-weight="bold" fill="currentColor">ROLLBACK</text>
<rect x="150" y="166" width="52" height="24" rx="4" fill="#84cc16" fill-opacity="0.45"/>
<text x="176" y="182" text-anchor="middle" font-size="10" fill="currentColor">8 ms</text>
<rect x="206" y="166" width="80" height="24" rx="4" fill="#84cc16" fill-opacity="0.45"/>
<text x="246" y="182" text-anchor="middle" font-size="10" fill="currentColor">60 FPS</text>
<rect x="290" y="166" width="276" height="24" rx="4" fill="#8b5cf6" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.25"/>
<text x="428" y="182" text-anchor="middle" font-size="10" fill="currentColor">trả bằng CPU chạy lại + determinism mức C</text>
<text x="14" y="200" font-size="9" fill="currentColor" opacity="0.75">giữ cả hai, đổi trục thanh toán</text>
</svg>

Rollback không phá vỡ định luật nào — nó **đổi loại tiền tệ**: trả bằng CPU và kỷ luật kỹ thuật thay vì bằng thời gian của người chơi.

---

## ⏸ Dừng lại — đoán trước #2

Rollback không hoãn input: ở frame N, máy của bạn phải bước tiếp **trước khi** biết đối thủ bấm gì ở frame N. **Nó lấy input của đối thủ ở đâu ra?**

```
(a) Ngoại suy từ vận tốc nhân vật đối thủ, như bài 20 làm với entity
(b) Một mô hình học từ thói quen bấm của đối thủ trong trận
(c) Giả định đối thủ giữ nguyên input của frame trước
(d) Bỏ trống — chạy frame N với đối thủ đứng yên
```

Đáp án là cái đơn giản nhất trong bốn cái.

---

### 3.3 Rollback = lockstep + đoán trước + tua ngược

Đáp án là **(c)**, và đó là toàn bộ "thuật toán dự đoán" của GGPO: **đối thủ giữ nguyên input của frame trước.** Không mô hình, không thống kê. Khác với bài 18 ở một chỗ: ở đó client *biết* input của mình nên "đoán" thật ra là "tính trước"; ở đây nó là phỏng đoán thật.

Khi input thật tới và khác dự đoán, máy làm bốn việc **trong cùng một frame**, không việc nào được tràn sang frame sau: **tua ngược** về state đã lưu ở frame bắt đầu sai → **thay input** đã đoán bằng input thật → **chạy lại** tới frame hiện tại → **vẽ** đúng frame cuối. Người chơi không bao giờ thấy các frame trung gian.

<svg viewBox="0 0 720 300" role="img" aria-labelledby="gs22-b-t gs22-b-d" style="width:100%;height:auto">
<title id="gs22-b-t">Một lần rollback: đoán sai ở frame 13, phát hiện ở frame 16, chạy lại 3 frame</title>
<desc id="gs22-b-d">Hàng trên là bảy frame từ 10 tới 16, mỗi frame lưu một bản state vào ring buffer. Input của đối thủ ở frame 13, 14, 15 là dự đoán. Tới frame 16, input thật của frame 13 về và khác dự đoán. Hàng dưới cho thấy máy nạp lại state đã lưu ở frame 13, thay input, rồi chạy lại frame 13, 14, 15 và 16, tất cả nằm gọn trong 16,67 mili giây của frame 16, và chỉ frame 16 được vẽ ra màn hình.</desc>
<text x="14" y="18" font-size="12" font-weight="bold" fill="currentColor">ĐƯỜNG BÌNH THƯỜNG — mỗi frame lưu một bản state vào ring buffer</text>
<rect x="80" y="34" width="62" height="34" rx="5" fill="#3b82f6" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.3"/>
<text x="111" y="49" text-anchor="middle" font-size="10" fill="currentColor">f10</text>
<text x="111" y="62" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.8">thật</text>
<rect x="150" y="34" width="62" height="34" rx="5" fill="#3b82f6" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.3"/>
<text x="181" y="49" text-anchor="middle" font-size="10" fill="currentColor">f11</text>
<text x="181" y="62" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.8">thật</text>
<rect x="220" y="34" width="62" height="34" rx="5" fill="#3b82f6" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.3"/>
<text x="251" y="49" text-anchor="middle" font-size="10" fill="currentColor">f12</text>
<text x="251" y="62" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.8">thật</text>
<rect x="290" y="34" width="62" height="34" rx="5" fill="#f59e0b" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.3"/>
<text x="321" y="49" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">f13</text>
<text x="321" y="62" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.85">đoán</text>
<rect x="360" y="34" width="62" height="34" rx="5" fill="#f59e0b" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.3"/>
<text x="391" y="49" text-anchor="middle" font-size="10" fill="currentColor">f14</text>
<text x="391" y="62" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.85">đoán</text>
<rect x="430" y="34" width="62" height="34" rx="5" fill="#f59e0b" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.3"/>
<text x="461" y="49" text-anchor="middle" font-size="10" fill="currentColor">f15</text>
<text x="461" y="62" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.85">đoán</text>
<rect x="500" y="34" width="62" height="34" rx="5" fill="#f59e0b" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.3"/>
<text x="531" y="49" text-anchor="middle" font-size="10" fill="currentColor">f16</text>
<text x="531" y="62" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.85">đoán</text>
<circle cx="531" cy="92" r="6" fill="#ef4444"/>
<text x="580" y="96" font-size="10" font-weight="bold" fill="currentColor">input THẬT của f13 vừa tới</text>
<text x="580" y="110" font-size="9" fill="currentColor" opacity="0.8">và nó khác cái đã đoán</text>
<path d="M525 100 C 430 128, 360 128, 321 100" fill="none" stroke="#ef4444" stroke-width="2" stroke-opacity="0.8"/>
<text x="415" y="128" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">① tua ngược về f13</text>
<text x="14" y="164" font-size="12" font-weight="bold" fill="currentColor">TRONG ĐÚNG FRAME 16 — nạp lại, thay input, chạy lại</text>
<rect x="290" y="180" width="62" height="34" rx="5" fill="#84cc16" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.35"/>
<text x="321" y="195" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">f13</text>
<text x="321" y="208" text-anchor="middle" font-size="8" fill="currentColor">thật</text>
<rect x="360" y="180" width="62" height="34" rx="5" fill="#84cc16" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.35"/>
<text x="391" y="195" text-anchor="middle" font-size="10" fill="currentColor">f14</text>
<text x="391" y="208" text-anchor="middle" font-size="8" fill="currentColor">chạy lại</text>
<rect x="430" y="180" width="62" height="34" rx="5" fill="#84cc16" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.35"/>
<text x="461" y="195" text-anchor="middle" font-size="10" fill="currentColor">f15</text>
<text x="461" y="208" text-anchor="middle" font-size="8" fill="currentColor">chạy lại</text>
<rect x="500" y="180" width="62" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.4" stroke="currentColor" stroke-opacity="0.4"/>
<text x="531" y="195" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">f16</text>
<text x="531" y="208" text-anchor="middle" font-size="8" fill="currentColor">VẼ</text>
<text x="150" y="200" font-size="10" fill="currentColor">② nạp state đã lưu</text>
<line x1="278" y1="197" x2="288" y2="197" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5"/>
<line x1="290" y1="228" x2="562" y2="228" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<text x="426" y="244" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">③ tất cả nằm trong 16,67 ms của frame 16</text>
<text x="426" y="258" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.8">chỉ f16 ra màn hình — người chơi không thấy f13, f14, f15 chạy lần hai</text>
<text x="14" y="286" font-size="10" font-style="italic" fill="currentColor" opacity="0.8">Khoảng cách tua ngược d = 3 frame ứng với RTT 100 ms. Ring buffer phải sâu ít nhất d frame.</text>
</svg>

### 3.4 Cơ chế: ring buffer, và nó phải sâu bao nhiêu

Toàn bộ vòng lặp, chạy một lần mỗi frame:

```go
saved[frame%W] = SaveState(&world)          // ring buffer W frame
inputs[frame][me] = ReadInput()
net.Send(frame, inputs[frame][me], lastW)   // kèm W input gần nhất, chống mất gói

if first := firstWrongFrame(); first >= 0 { // input thật khác cái đã đoán
    LoadState(&world, saved[first%W])       // ① tua ngược
    for f := first; f < frame; f++ {        // ② chạy lại tới hiện tại
        saved[f%W] = SaveState(&world)
        world.Step(inputs[f])               // input đã được sửa
    }
}
inputs[frame][opp] = inputs[frame-1][opp]   // ③ đoán: giữ nguyên frame trước
world.Step(inputs[frame])
Render(world)                               // chỉ frame này ra màn hình
```

Những chi tiết mà bỏ đi thì hỏng:

- **`net.Send` gửi kèm W input gần nhất.** Một input mất là một lần rollback không bao giờ được sửa, tức desync. Input 12 byte nên gửi thừa gần như miễn phí (2,16 KB/s cho ba bản). Đây là reliability tự cài trên UDP theo bài 14, nhưng rẻ hơn nhiều vì payload nhỏ và **idempotent** — nhận trùng thì ghi đè cùng giá trị.
- **`saved[f%W] = SaveState` nằm *bên trong* vòng chạy lại**, vì frame chạy lại lần hai ra state khác lần đầu; quên dòng này thì lần rollback sau tua về một state chưa bao giờ tồn tại. Và **`firstWrongFrame` trả về frame sớm nhất sai**, không phải frame vừa nhận: f13 và f14 cùng về ở f16 thì tua một lần về f13.
- **`W` suy ra từ RTT tối đa bạn muốn hỗ trợ**, không phải từ một hằng số đẹp mắt. Bạn phải giữ state của mọi frame chưa xác nhận, và khoảng đó dài đúng bằng thời gian input đi một chiều:

| W | Chịu được input trễ một chiều | Tức RTT tối đa |
|---|---|---|
| 4 frame | 66,7 ms | 133,3 ms |
| **7 frame** | 116,7 ms | **233,3 ms** |
| 8 frame | 133,3 ms | 266,7 ms |
| 10 frame | 166,7 ms | 333,3 ms |

Con số 7–8 frame mà GGPO dùng không phải chọn bừa: nó là **RTT khoảng 230–270 ms** — đủ phủ gần hết Internet dân dụng trong một khu vực. Vượt W thì máy hết chỗ lưu và buộc phải **dừng chờ**, tức tụt về lockstep thuần trong chốc lát. Đó là hành vi rollback khi mạng quá tệ: nó không hỏng, nó thoái hoá.

### 3.5 Ngân sách chạy lại, và chi phí lưu state tính ra byte

Bài 4 đã đặt ngân sách: số frame phải đoán trước là `d = ceil((RTT/2) / 16,67)`, và khi đoán sai thì `d` bước simulation phải chen vào một frame.

| RTT | Số frame phải đoán trước (d) | Khi đoán sai, mỗi bước chạy lại có |
|---|---|---|
| 30 ms | 1 | 16,67 ms |
| 60 ms | 2 | 8,34 ms |
| 100 ms | 3 | **5,56 ms** |

*(Bảng của bài 4. Chặt hơn một chút trên thực tế: frame hiện tại cũng phải chạy một bước, nên frame nặng nhất có `d+1` bước — ở RTT 100 là **4,17 ms** mỗi bước.)*

Phần bài 4 chưa tính: **`SaveState` và `LoadState` tốn bao nhiêu?** Nếu state là khối phẳng S byte thì cả hai đều là `memcpy`. Đo trên máy dantt (Apple M-series, clang -O2, tốt nhất trong 7 lần, ring 8 đích luân phiên); một lần rollback ở `d = 3` là 1 `LoadState` cộng 3 `SaveState` — bốn lần copy:

| S | Ring 8 frame | 1 lần `SaveState` | Băng thông | 4 lần copy | % của frame 16,67 ms |
|---|---|---|---|---|---|
| 1 KB | 8 KB | **9,1 ns** | 112,5 GB/s | 36 ns | **0,0002 %** |
| 4 KB | 32 KB | **36,3 ns** | 112,8 GB/s | 145 ns | **0,0009 %** |
| 64 KB | 512 KB | **571,5 ns** | 114,7 GB/s | 2,29 µs | **0,014 %** |
| 1 MB | 8 MB | **14,19 µs** | 73,9 GB/s | 56,7 µs | **0,34 %** |
| 4 MB | 32 MB | **57,22 µs** | 73,3 GB/s | 229 µs | **1,37 %** |

*(Bậc độ lớn, không phải hằng số — thay đổi theo phần cứng, mức cache và tải. Ba dòng đầu nằm gọn trong cache; hai dòng cuối đã chạm băng thông RAM thật.)*

Nhìn cột phải cho kỹ trước khi đọc tiếp.

---

## ⏸ Dừng lại — đoán trước #3

Câu giải thích phổ biến nhất về rollback: *"nó chỉ khả thi ở fighting game vì state nhỏ — copy vài MB mỗi frame thì không kịp."* Nhưng bảng trên vừa nói copy 4 MB tốn **1,37 %** một frame.

**Vậy cái gì thật sự chặn rollback ở một game FPS 20 người?**

```
(a) Vẫn là copy state — 1,37 % nhân với nhiều lần rollback thì cộng dồn lên
(b) Số lần chạy lại, chứ không phải giá mỗi lần
(c) State của một engine 3D không phải khối phẳng nên không memcpy được
(d) (b) và (c), và (b) lớn hơn (c) một bậc
```

---

### 3.6 Cái thật sự giết rollback ở FPS: số lần chạy lại

Đáp án là **(d)**. Câu "state nhỏ nên copy nhanh" đúng về hướng nhưng sai về cơ chế, và sai chỗ đó khiến người ta đi tối ưu nhầm.

**Yếu tố lớn: số lần rollback nhân theo số đối thủ.** Rollback xảy ra mỗi khi input thật của **một** đối thủ khác dự đoán, tức mỗi khi đối thủ đó **đổi input**. Gọi `f` là số lần một người đổi input mỗi giây, `n` là số đối thủ:

```
rollback mỗi giây  =  n × f
bước sim thêm/giây =  n × f × d
tổng bước sim/giây =  60 + n × f × d
```

Với `f = 10` (người chơi đổi phím/hướng khoảng 10 lần mỗi giây) và `d = 3` (RTT 100 ms):

| | n | rollback/giây | bước sim/giây | So với 60 |
|---|---|---|---|---|
| Fighting 1v1 | 1 | 10 | **90** | **1,50×** |
| FPS 20 người | 19 | 190 | **630** | **10,50×** |

**Phần việc rollback tăng đúng 19 lần** — tỉ lệ số đối thủ, vì `f` và `d` triệt tiêu: `19·10·3 = 570` bước phụ so với `1·10·3 = 30`. Tính cả 60 bước nền thì tổng là **630 so với 90, tức 7,0×** — con số nhỏ hơn, nhưng phần nền 60 bước là thứ mọi mô hình đều phải trả, nên cái đáng nhìn là 19 lần ở phần phụ. Và 190 rollback/giây ở 60 FPS là **hơn ba lần rollback mỗi frame**: không còn "đường bình thường" nào nữa, mọi frame đều là frame chạy lại. Kể cả hạ `d` xuống 1 bằng cách hoãn input, FPS vẫn phải chạy 250 bước/giây — **4,17×**.

**Yếu tố nhỏ hơn: state của engine không phải khối phẳng.** Bảng mục 3.5 giả định `memcpy`, nhưng state engine 3D là đồ thị con trỏ — entity trỏ tới component, physics giữ contact cache riêng, animation giữ blend tree — nên sao chép nó là **duyệt đồ thị**. Đo trên cùng khối 288 KB: `memcpy` phẳng **3,90 µs**, deep copy 4.096 node có con trỏ **13,26 µs** — **đắt hơn 3,4 lần**. *(Cận dưới: bản đo không cấp phát và không gọi constructor.)*

3,4 lần thì không giết ai. **19 lần phần việc phụ, tức 7,0× tổng, thì có.** Phát biểu đúng của kết luận:

> Rollback không đòi state nhỏ vì copy đắt. Nó đòi **số người chơi ít** vì số lần chạy lại nhân thẳng theo đó — và nó đòi state **phẳng và tự chứa** vì bạn phải copy nó được, chứ không phải vì copy nó nhanh.

Phần còn lại của khoảng cách: state fighting ~1 KB, phẳng, POD; state FPS vài MB, đồ thị component. Và input fighting đổi ít — người chơi giữ hướng nhiều frame liền — còn chuột FPS đổi gần như mỗi frame, tức `f` của FPS còn cao hơn 10 chứ không bằng.

Con số ~1 KB tới từ đâu: một nhân vật đối kháng cần vị trí + vận tốc Q16.16 (16 B), máu/meter/hướng/cờ (8 B), state machine id + bộ đếm frame (4 B), hitstun/blockstun/hitstop (6 B), 8 hitbox+hurtbox × 8 B (64 B), 30 frame lịch sử input × 2 B (60 B), 4 đạn/hiệu ứng × 24 B (96 B) — **254 B**. Hai nhân vật 508 B, cộng phần chung (camera, đồng hồ trận, seed RNG, sân khấu) ~88 B → **~600 B**, làm tròn 1 KB. Ring 8 frame: **8 KB** — toàn bộ bộ nhớ rollback của một trận đấu nhỏ hơn một icon.

### 3.7 Determinism mức C là điều kiện, không phải khuyến nghị

Chương 3 dựng ba mức determinism và bài 18 đã nói mức nào dùng ở đâu. Ở đây chỉ còn một dòng phải nhắc, và nó khắc nghiệt nhất chương 5:

**Rollback và lockstep P2P cross-platform cần mức C — bit-for-bit trên mọi máy.** Không phải "cùng công thức", không phải "cùng ngữ nghĩa". Cùng bit.

Lý do đã nằm ở mục 3.1: không trọng tài thì không ai dập sai số. Lệch 0,1 % chỉ để lại 0,242 mm vì cửa sổ tích luỹ dài đúng một vòng round-trip; bỏ trọng tài thì cửa sổ đó **dài bằng cả trận**. Bài 11 đo con số cuối: cùng một file `.go` build cho arm64 và amd64 lệch **1 ULP ở frame 1** và **18,13 m ở frame 3.600** — 90,6 % chiều rộng bản đồ, và frame 3.600 là phút thứ nhất. Rollback còn thêm một yêu cầu mà lockstep thuần không có: `world.Step` chạy lại lần hai trên cùng state và cùng input phải ra **đúng kết quả lần đầu** — mức A của bài 18, nhưng ở đây không ai sửa hộ.

Lời giải là **bài 11**: bỏ float, Q16.16, `sqrt` Newton-Raphson, `sin` bằng bảng tra có nội suy. Giá đã cân sẵn ở đó: một bước sim đầy đủ chỉ đắt hơn **1,41 %** so với `float32`, nhưng đổi sang fixed-point là **viết lại lõi simulation** và làm mọi replay đã lưu không phát lại được. Quyết định của tuần đầu tiên — và bài này là lý do bạn cần biết mình chọn rollback từ tuần đầu tiên.

### 3.8 Người chơi trả bằng gì — đối thủ nhảy, không phải mình chậm

Rollback không miễn phí về mặt cảm giác — nó **dời chỗ đau**. Khi máy tua ngược và chạy lại, cái bị sửa không phải nhân vật của bạn (input của bạn luôn đúng vì bạn biết nó) mà là **đối thủ**: hắn vừa được vẽ ở chỗ dự đoán, giờ nhảy sang chỗ thật, cách đúng bằng quãng đường hắn đi trong `d` frame. Ở 5 m/s — con số bài 4, 17 và 18 đều dùng:

| d (frame) | RTT | Đối thủ nhảy tối đa |
|---|---|---|
| 1 | 30 ms | 8,33 cm |
| 2 | 60 ms | 16,67 cm |
| 3 | 100 ms | **25,0 cm** |
| 5 | 150 ms | 41,67 cm |

25 cm đúng là con số bài 17 gọi là "mắt người thấy rõ". Nó vẫn thấy rõ ở đây; khác biệt là **ai** bị giật. Phát biểu đầy đủ, theo khuôn của bài 4:

> Trong lockstep, một RTT phải được trả bằng một trong ba thứ: **frame rate** (lockstep thuần), **input lag của chính bạn** (delay-based), hoặc **hình ảnh của đối thủ** (rollback). Không có phương án thứ tư, và CPU nhanh hơn không tạo ra phương án thứ tư.

Ngành chọn cái thứ ba vì tay bạn là thứ bạn cảm nhận từng frame, còn đối thủ là thứ bạn vốn dĩ đang phản ứng theo: một cú nhảy 25 cm làm bạn đọc sai một đòn, 50 ms input lag làm **mọi** combo rớt. Lại là quyết định về *cảm giác* — giống hệt năm 2001 ở bài 4.

---

## 4. Ba mô hình cạnh nhau

Chương 5 dựng nhánh authoritative client-server qua năm bài (17–21); bài này dựng nốt nhánh kia. Cả ba ở cùng RTT 100 ms:

| | Authoritative CS + prediction (17–21) | Lockstep (+ turn delay) | Rollback |
|---|---|---|---|
| Độ trễ mình cảm nhận | **8 ms** (bài 18) | 58 ms, hoặc 20 FPS nếu không hoãn | **8 ms** |
| Độ trễ nhìn người khác | 182 ms (bài 8), tua ngược khi bắn (bài 21) | 58 ms — cùng nhịp với mình | ≤ 50 ms, nhưng có thể bị sửa lại |
| Băng thông | theo **số entity**: 6,2 KB/s ở FPS 5v5 | theo **số người**: 0,62 KB/s ở RTS 8 người/200 quân | 2,16 KB/s ở 1v1 |
| Chống gian lận | **có** | **không** | **không** |
| Determinism cần | mức A; B chỉ cần đúng ngữ nghĩa | **mức C** | **mức C**, và chạy lại phải ra y hệt |
| Số người chịu được | hàng chục tới hàng nghìn (bài 26, 32) | 8 người thoải mái; ràng buộc là RTT người tệ nhất | **2–4**; 630 bước sim/giây ở 20 người |
| CPU | 1 bước sim mỗi tick | 1 bước | **1,50× ở 1v1**; tệ nhất `d+1` bước trong một frame |
| Hỏng khi mạng tệ | rubber-band, giật (bài 19, 20) | cả trận chậm lại | thoái hoá về chờ khi vượt W |
| Thể loại | FPS, MOBA, MMO, battle royale, .io | RTS, auto-battler, co-op tất định | fighting, platform fighter, 1v1 hành động |

Bốn câu hỏi để chọn — bốn câu của bài 3, giờ có ngưỡng đo được gắn vào. Thứ tự là cố ý: hai câu đầu rẻ nhất để trả lời và loại được nhiều nhất.

**① Bao nhiêu người một trận?** Trên 4 → loại rollback bằng `n × f × d`. Trên ~8 mà vẫn cần độ trễ thấp → loại lockstep bằng bảng trần frame rate.

**② Người chơi đổi input bao nhiêu lần mỗi giây?** Vào thẳng `n × f × d`. Input đổi liên tục (chuột FPS) làm dự đoán "giữ nguyên frame trước" sai gần như mọi frame.

**③ State có phẳng, tự chứa, chạy lại bit-for-bit không?** Không → rollback và lockstep đóng cửa; bài 11 nói cái giá để mở lại.

**④ Có ai cần gian lận không?** Có → bắt buộc authoritative server, quay về bài 17–21. Không → P2P mở ra và trả lại cho bạn một chặng mạng.

---

## 5. Tính tay

**Bài 1 — ring buffer cho game của bạn.** Platform fighter 4 người, 60 FPS, muốn hỗ trợ tới RTT 180 ms.
- `d` bằng bao nhiêu frame? `W` tối thiểu bằng bao nhiêu?
- State mỗi nhân vật 254 B, phần chung 88 B. Với 4 nhân vật, ring `W` frame tốn bao nhiêu KB?
- Với 112,5 GB/s ở mục 3.5, một lần rollback (`d+1` lần copy) tốn bao nhiêu nano giây, bằng bao nhiêu phần trăm của 16,67 ms?

**Bài 2 — 4 người có chạy nổi không.** Vẫn game trên, `f = 10`.
- Rollback mỗi giây và bước sim mỗi giây là bao nhiêu? Gấp mấy lần 60?
- Frame nặng nhất chạy bao nhiêu bước, mỗi bước có bao nhiêu ms?
- Nếu một bước `world.Step` tốn 0,8 ms thì frame nặng nhất tốn bao nhiêu — có lọt 16,67 ms không? Nếu không, hạ `d` hay hạ chi phí `Step`, và cái nào bạn trả bằng tiền của người chơi?

**Bài 3 — ngưỡng đổi mô hình.** Thêm chế độ 8 người vào chính game đó, RTT 100 ms, `f = 10`.
- Bước sim mỗi giây là bao nhiêu? Gấp mấy lần con số 4 người ở bài 2?
- Chấp nhận trần 4× so với 60 bước/giây: với `d = 3` thì tối đa mấy người? Với `d = 1`?
- Hạ `d` từ 3 xuống 1 ở RTT 100 ms buộc hoãn input mấy frame, tức cộng bao nhiêu ms vào cột "bấm tới thấy" mục 2? So với ngưỡng 50 ms của bài 3 rồi kết luận: chế độ 8 người nên đi nhánh nào?

---

## 6. Chuyển giao

Không có đáp án trong bài.

**Bạn làm một game đấu bài chiến thuật 1v1 theo lượt-nhanh.** Mỗi lượt 30 giây, hai người **bấm cùng lúc** rồi kết quả giải quyết đồng thời. Giữa lượt có hoạt ảnh vật lý: quân bay lên, va chạm, rơi theo trọng lực, và kết quả va chạm **ảnh hưởng tới sát thương**. Giải đấu có tiền thưởng.

1. Đặt game này lên hai trục của bài 3 rồi trả lời bốn câu hỏi ở mục 4. Điều gì trong mô tả làm nó **không** rơi gọn vào góc turn-based, và câu hỏi nào ở mục 4 không cho đáp án dứt khoát?
2. Vật lý ảnh hưởng tới sát thương buộc mức determinism nào, **kể cả khi** bạn chọn authoritative server? Vì sao đáp án khác với một game bài không có vật lý?
3. Hai người bấm cùng lúc, nên trong 30 giây đó **không ai cần thấy input của người kia**. Rollback còn nghĩa gì không? Nếu không, thứ bạn thật sự cần từ chương này là gì?
4. "Tiền thưởng" đụng thẳng vào câu ④, nhưng authoritative server cộng một chặng mạng — mà game này không cần độ trễ thấp. Câu ④ ở đây có **tốn gì** không, và vì sao fighting game phải cân nhắc nó còn game này thì không?
5. Thêm chế độ khán giả xem trực tiếp, trễ 5 giây. Mô hình nào ở bảng mục 4 cho khán giả **rẻ gần như bằng không**, và vì sao?
6. **Câu khó nhất:** giả sử bạn chọn lockstep P2P, cộng một server nhẹ chỉ làm hai việc — ghép cặp và **lưu lại chuỗi input của cả hai người**. Trận xong, server chạy lại chuỗi đó bằng chính binary simulation của mình rồi so với kết quả hai máy báo về. Bạn vừa có thứ gần giống trọng tài mà **không** trả tiền cho chặng mạng phụ. Chỉ ra loại gian lận nào cách này bắt được, loại nào nó **không bao giờ** bắt được, và một điều kiện ở mục 3.7 mà thiếu nó thì toàn bộ thiết kế vô dụng.

Câu 6 là chỗ ba nhánh của course gặp nhau: netcode, determinism, chống gian lận.

---

## 7. Tóm tắt

- Bỏ trọng tài mua được **một chặng mạng** — đủ để đổi 58 ms input lag lấy **8 ms** ở RTT 100 ms. Không mua được băng thông: ở 1v1, gửi input **2,16 KB/s** đắt hơn gửi state **1,28 KB/s**. Lợi thế 500 lần của lockstep là lợi thế của RTS.
- Cái mất: **chống gian lận** và **cơ chế sửa sai tự động** — sai số không bị dập, chỉ có desync: phát hiện bằng checksum định kỳ, xử lý bằng huỷ trận.
- **Lockstep thuần**: RTT 100 → trần **20 FPS**, RTT 150 → 13,3. RTS sống nhờ turn delay và trục 250 ms; fighting game với 50 ms thì không, vì turn delay hoãn **cả input của chính bạn**.
- **Rollback** = đoán đối thủ giữ nguyên input frame trước; sai thì tua ngược → thay input → chạy lại, trong một frame. Ring buffer `W` frame chịu được RTT tới `2 × W × 16,67 ms`: **W = 7 → 233 ms**, đúng con số GGPO dùng. Vượt W thì thoái hoá về chờ.
- Ngân sách bài 4 giữ nguyên: RTT 100 → `d = 3` → **5,56 ms** mỗi bước (**4,17 ms** nếu tính cả bước của frame hiện tại). Copy state **không phải nút thắt**: **9,1 ns cho 1 KB**, và ngay cả **4 MB** thì bốn lần copy chỉ tốn **1,37 %** một frame; ring 8 frame của một trận đối kháng là **8 KB**.
- Nút thắt thật là **số lần chạy lại**: `bước sim/giây = 60 + n × f × d`. Fighting 1v1 → **90 (1,50×)**; FPS 20 người → **630 (10,50×)**, đúng **19 lần** nhiều hơn vì `f` và `d` triệt tiêu. Hạ `d` xuống 1 vẫn còn 4,17×. Yếu tố phụ: deep-copy đồ thị con trỏ đắt hơn memcpy **3,4 lần**.
- **Determinism mức C là điều kiện tồn tại**: bài 11 đo cùng file `.go` trên arm64 và amd64 lệch **18,13 m ở frame 3.600**. Fixed-point là lời giải, giá **+1,41 %** CPU, quyết định của tuần đầu tiên.
- Người chơi vẫn trả, chỉ là trả chỗ khác: đối thủ nhảy tối đa **25,0 cm** ở RTT 100 ms. Một RTT phải trả bằng **frame rate**, **input lag của mình**, hoặc **hình ảnh đối thủ** — không có phương án thứ tư, và CPU nhanh hơn không tạo ra phương án thứ tư.

→ **Chương 6 — Đồng bộ state & băng thông.** Năm chương vừa rồi lo chuyện người chơi cảm thấy gì. Bài 23 quay sang câu hỏi thực dụng hơn: mỗi giây bạn thật sự gửi bao nhiêu byte, và bao nhiêu trong số đó là lãng phí.
