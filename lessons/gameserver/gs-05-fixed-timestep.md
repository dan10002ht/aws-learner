# Bài 5 — Fixed timestep: vì sao dt phải là hằng số

## 1. Mục tiêu

Sau bài này bạn có thể:

- Chỉ ra **bằng số** vì sao cùng một công thức vật lý chạy ở 60 Hz và 144 Hz cho ra hai thế giới khác nhau, và khác nhau đúng bao nhiêu centimet.
- Phân biệt **sai số tích phân rời rạc** với **lỗi float** chỉ bằng cách nhìn quy luật của sai số, trước khi mở debugger.
- Bác bỏ được phản xạ "**đo `dt` thật rồi dùng luôn, tổng quãng đường vẫn bằng nhau**" bằng chính bảng số trong bài.
- Tính ra cái giá của việc "chốt tick rate thật cao cho chính xác", và chỉ ra vì sao nó vẫn không giải quyết được vấn đề.
- Phát biểu lại mục tiêu của simulation từ "**chính xác**" thành "**giống nhau**", và đọc được ràng buộc đó trong một chữ ký hàm.

---

## 2. Triệu chứng

Cả chương 1 dựa vào một giả định: server có một nhịp đập đều đặn và đáng tin. Chương này tháo giả định đó ra — và chỗ nó vỡ đầu tiên không nằm ở mạng, nó nằm ở hai dòng số học.

Bạn làm một game platformer, có một cú nhảy qua vực. Bạn chỉnh tay cho tới khi nó vừa khít: mép bên kia cao **2,45 m**, nhân vật bật lên với vận tốc đầu **7 m/s**, `g = 9,8 m/s²`. Test trên máy bạn: qua được, mà chỉ vừa đủ qua — đúng cảm giác bạn muốn. Ship.

Ba ngày sau, hai bug report về cùng lúc. Nội dung **ngược nhau hoàn toàn**:

```
#218  "Không nhảy qua được vực ở màn 3. Đã thử 40 lần. Không lần nào qua."
      máy: laptop, màn hình 60 Hz

#224  "Màn 3 dễ quá, nhảy qua vực mà không cần lấy đà. Bug à?"
      máy: PC, màn hình 144 Hz
```

Cùng một build. Cùng một map. Cùng một file config. Không ai sửa gì giữa hai lần.

Bạn mở code nhảy. Nó đúng hai dòng, và **không có chỗ nào nhắc tới FPS**:

```
v -= g * dt
y += v * dt
```

Bạn chạy chính hai dòng đó ở hai tần số, in ra độ cao lớn nhất đạt được:

```
 60 Hz  →  đỉnh nhảy 2,4418 m   →  2,4418 < 2,45   không qua
144 Hz  →  đỉnh nhảy 2,4757 m   →  2,4757 > 2,45   qua
```

**Chênh 3,39 cm.** Mép vực rơi đúng vào giữa hai con số đó. Và không có dòng code nào của bạn tạo ra 3,39 cm ấy.

---

## ⏸ Dừng lại — đoán trước #1

Chọn một đáp án trước khi đọc tiếp. Chỗ này đáng chọn sai một lần, vì cái sai ở đây là cái sai mà phần lớn dev backend mắc.

**Hai dòng code không nhắc tới FPS. 3,39 cm kia ở đâu ra?**

```
(a) Sai số làm tròn của float32 — chuyển sang float64 là hết
(b) `dt` bị đo sai trên máy 144 Hz — vấn đề nằm ở chỗ lấy thời gian
(c) Ở đâu đó trong engine có một đoạn code phụ thuộc framerate, phải đi tìm
(d) Công thức không sai, và không có bug nào cả — phép cộng dồn rời rạc
    cho ra kết quả khác nhau khi số bước khác nhau
```

Nếu bạn chọn (a) hoặc (c), phần lớn thời gian debug sẽ đổ vào đúng chỗ không có gì. Mục 3.1 giải thích vì sao.

---

## 3. Lý thuyết

### 3.1 Không phải bug. Là số học.

Đáp án là **(d)**.

Bỏ cú nhảy sang một bên, lấy bài toán đơn giản nhất: **thả rơi tự do đúng 1 giây**. Cùng công thức Euler nửa ẩn (`v += g·dt` rồi `y += v·dt`), `g = 9,8`, chỉ đổi số bước:

| Tần số | Số bước trong 1 s | Quãng rơi sau 1 s | Lệch so với đúng |
|---|---|---|---|
| 30 Hz | 30 | 5,0633 m | **+16,3 cm** |
| 60 Hz | 60 | 4,9817 m | +8,2 cm |
| 120 Hz | 120 | 4,9408 m | +4,1 cm |
| 144 Hz | 144 | 4,9340 m | +3,4 cm |
| 240 Hz | 240 | 4,9204 m | +2,0 cm |
| *giải tích (½·g·t²)* | *∞* | *4,9000 m* | *—* |

*(Số đo bằng cách chạy chính vòng lặp đó — tự kiểm chứng được bằng vài dòng Python.)*

Không dòng nào là "đúng". Có **năm kết quả khác nhau cho cùng một hiện tượng vật lý**, và cái duy nhất phân biệt chúng là số lần bạn bấm nút cộng.

Chuyện đang xảy ra: bạn muốn tính diện tích dưới một đường cong, nhưng bạn tính bằng cách xếp hình chữ nhật. Vận tốc tăng liên tục trong khoảng `dt`, nhưng bạn nhân **một** giá trị vận tốc với **cả** khoảng đó. Ít hình chữ nhật thì thừa nhiều, nhiều hình chữ nhật thì thừa ít.

<svg viewBox="0 0 700 275" role="img" aria-labelledby="gs5-a-t gs5-a-d" style="width:100%;height:auto">
<title id="gs5-a-t">Vì sao bước lớn cho sai số lớn: xấp xỉ diện tích bằng hình chữ nhật</title>
<desc id="gs5-a-d">Hai đồ thị vận tốc theo thời gian, cùng một đường thẳng v bằng g nhân t. Bên trái chia thành năm bước lớn, phần thừa phía trên đường cong rất rộng. Bên phải chia thành mười bước nhỏ, phần thừa hẹp lại còn một nửa.</desc>
<text x="50" y="26" font-size="12" font-weight="bold" fill="currentColor">dt lớn — ít bước</text>
<text x="50" y="42" font-size="10" fill="currentColor" opacity="0.7">phần thừa rộng → cộng dư nhiều</text>
<rect x="50" y="180" width="54" height="30" fill="#ef4444" fill-opacity="0.22"/>
<rect x="104" y="150" width="54" height="60" fill="#ef4444" fill-opacity="0.22"/>
<rect x="158" y="120" width="54" height="90" fill="#ef4444" fill-opacity="0.22"/>
<rect x="212" y="90" width="54" height="120" fill="#ef4444" fill-opacity="0.22"/>
<rect x="266" y="60" width="54" height="150" fill="#ef4444" fill-opacity="0.22"/>
<line x1="50" y1="210" x2="320" y2="60" stroke="#3b82f6" stroke-width="2.5"/>
<line x1="50" y1="210" x2="330" y2="210" stroke="currentColor" stroke-opacity="0.55" stroke-width="1.5"/>
<line x1="50" y1="210" x2="50" y2="52" stroke="currentColor" stroke-opacity="0.55" stroke-width="1.5"/>
<text x="336" y="214" font-size="10" fill="currentColor">t</text>
<text x="42" y="48" font-size="10" fill="currentColor">v</text>
<text x="190" y="240" text-anchor="middle" font-size="10" fill="currentColor">5 bước · phần đỏ = cái bạn cộng dư vào</text>
<text x="190" y="258" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">30 Hz → 5,0633 m (+16,3 cm)</text>
<text x="390" y="26" font-size="12" font-weight="bold" fill="currentColor">dt nhỏ — nhiều bước</text>
<text x="390" y="42" font-size="10" fill="currentColor" opacity="0.7">phần thừa hẹp → cộng dư ít, nhưng vẫn dư</text>
<rect x="390" y="195" width="27" height="15" fill="#f59e0b" fill-opacity="0.28"/>
<rect x="417" y="180" width="27" height="30" fill="#f59e0b" fill-opacity="0.28"/>
<rect x="444" y="165" width="27" height="45" fill="#f59e0b" fill-opacity="0.28"/>
<rect x="471" y="150" width="27" height="60" fill="#f59e0b" fill-opacity="0.28"/>
<rect x="498" y="135" width="27" height="75" fill="#f59e0b" fill-opacity="0.28"/>
<rect x="525" y="120" width="27" height="90" fill="#f59e0b" fill-opacity="0.28"/>
<rect x="552" y="105" width="27" height="105" fill="#f59e0b" fill-opacity="0.28"/>
<rect x="579" y="90" width="27" height="120" fill="#f59e0b" fill-opacity="0.28"/>
<rect x="606" y="75" width="27" height="135" fill="#f59e0b" fill-opacity="0.28"/>
<rect x="633" y="60" width="27" height="150" fill="#f59e0b" fill-opacity="0.28"/>
<line x1="390" y1="210" x2="660" y2="60" stroke="#3b82f6" stroke-width="2.5"/>
<line x1="390" y1="210" x2="670" y2="210" stroke="currentColor" stroke-opacity="0.55" stroke-width="1.5"/>
<line x1="390" y1="210" x2="390" y2="52" stroke="currentColor" stroke-opacity="0.55" stroke-width="1.5"/>
<text x="676" y="214" font-size="10" fill="currentColor">t</text>
<text x="382" y="48" font-size="10" fill="currentColor">v</text>
<text x="525" y="240" text-anchor="middle" font-size="10" fill="currentColor">10 bước · gấp đôi số bước, phần thừa còn một nửa</text>
<text x="525" y="258" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">60 Hz → 4,9817 m (+8,2 cm)</text>
</svg>

Không có "phiên bản đúng" trên máy tính — có vô số kết quả, mỗi tần số một cái. Ngay cả 240 Hz vẫn lệch 2 cm.

### 3.2 Dấu vân tay của sai số: đúng một nửa mỗi lần gấp đôi

Nhìn lại cột lệch, nhưng lần này nhìn **tỉ lệ giữa các dòng**:

```
16,3 → 8,2 → 4,1 → 2,0
 ×2     ×2     ×2
```

Tỉ lệ đo được là **2,000** ở cả ba lần gấp đôi tần số. Không phải "khoảng 2". Đúng 2.

Đây là công cụ chẩn đoán, không phải kiến thức trang trí:

> Sai số của tích phân bậc nhất tỉ lệ nghịch với số bước — gấp đôi tần số thì giảm đúng một nửa, mỗi lần, không lệch. **Lỗi float không bao giờ có quy luật đó**: nó phụ thuộc giá trị cụ thể và thứ tự phép tính, và nó nhảy loạn xạ chứ không xếp thành cấp số nhân.

Nên khi gặp chênh lệch giữa hai máy, bạn có bài test 30 giây trước khi mở debugger: **chạy lại ở gấp đôi tần số**. Giảm đúng một nửa → bài toán tích phân, đi tiếp mục 3.4. Nhảy lung tung hoặc không đổi → chuyện khác, bài 10 nói về nhóm đó.

Hệ quả rút thẳng từ tỉ lệ 2: muốn sai số quãng rơi 1 giây xuống **dưới 1 cm**, cần khoảng **490 Hz** — mục 3.5 dùng lại con số này.

### 3.3 Từ quãng rơi tới mép vực

Quay lại cú nhảy. Ở tần số thấp mỗi bước "rơi dư" một chút nên nhân vật mất độ cao nhanh hơn, và cú nhảy lên **thấp hơn**. Cùng `v0 = 7 m/s`:

| Tần số | Đỉnh nhảy | Mép vực 2,45 m |
|---|---|---|
| 30 Hz | 2,3847 m | ✗ không qua |
| 60 Hz | 2,4418 m | ✗ không qua |
| 120 Hz | 2,4709 m | ✓ qua |
| 144 Hz | 2,4757 m | ✓ qua |
| 240 Hz | 2,4854 m | ✓ qua |
| *giải tích (v0²/2g)* | *2,5000 m* | *✓* |

<svg viewBox="0 0 700 190" role="img" aria-labelledby="gs5-b-t gs5-b-d" style="width:100%;height:auto">
<title id="gs5-b-t">Đỉnh nhảy ở từng tần số so với mép vực 2,45 mét</title>
<desc id="gs5-b-d">Trục số từ 2,38 tới 2,51 mét. Mép vực nằm ở 2,45 mét chia trục làm hai. Đỉnh nhảy ở 30 Hz và 60 Hz nằm bên trái nên không qua được, còn 120 Hz, 144 Hz, 240 Hz và giá trị giải tích nằm bên phải nên qua được.</desc>
<rect x="40" y="70" width="343" height="34" fill="#ef4444" fill-opacity="0.12"/>
<rect x="383" y="70" width="277" height="34" fill="#84cc16" fill-opacity="0.14"/>
<line x1="40" y1="104" x2="670" y2="104" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<line x1="383" y1="52" x2="383" y2="124" stroke="#ef4444" stroke-width="3"/>
<text x="383" y="44" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">mép vực 2,45 m</text>
<text x="200" y="92" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">KHÔNG QUA</text>
<text x="520" y="92" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">QUA</text>
<circle cx="82" cy="104" r="5" fill="#ef4444"/>
<text x="82" y="126" text-anchor="middle" font-size="10" fill="currentColor">30 Hz</text>
<text x="82" y="140" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">2,3847</text>
<circle cx="345" cy="104" r="5" fill="#ef4444"/>
<text x="340" y="126" text-anchor="middle" font-size="10" fill="currentColor">60 Hz</text>
<text x="340" y="140" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">2,4418</text>
<circle cx="480" cy="104" r="5" fill="#84cc16"/>
<text x="480" y="126" text-anchor="middle" font-size="10" fill="currentColor">120 Hz</text>
<text x="480" y="140" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">2,4709</text>
<circle cx="502" cy="104" r="5" fill="#84cc16"/>
<text x="516" y="158" text-anchor="middle" font-size="10" fill="currentColor">144 Hz</text>
<text x="516" y="172" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">2,4757</text>
<line x1="502" y1="110" x2="512" y2="146" stroke="currentColor" stroke-opacity="0.4" stroke-width="1"/>
<circle cx="546" cy="104" r="5" fill="#84cc16"/>
<text x="580" y="126" text-anchor="middle" font-size="10" fill="currentColor">240 Hz</text>
<text x="580" y="140" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">2,4854</text>
<line x1="546" y1="110" x2="572" y2="118" stroke="currentColor" stroke-opacity="0.4" stroke-width="1"/>
<circle cx="614" cy="104" r="5" fill="#3b82f6"/>
<text x="640" y="160" text-anchor="middle" font-size="10" fill="currentColor">giải tích</text>
<text x="640" y="174" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">2,5000</text>
<line x1="614" y1="110" x2="634" y2="148" stroke="currentColor" stroke-opacity="0.4" stroke-width="1"/>
</svg>

Bạn không viết một game. Bạn vô tình viết **một họ game**, đánh số bằng framerate của máy người chơi, và mép vực 2,45 m là đường phân chia họ đó làm hai. Khoảng cách 30 Hz ↔ 144 Hz là **9,11 cm** — biên độ mà thiết kế màn chơi của bạn đang trôi qua lại, không kiểm soát được.

> Người có máy mạnh không "chơi mượt hơn". Họ **chơi một game khác**.

Và cả hai bug report **đều đúng** — không report nào đóng được là "không tái hiện được". Ở BE App, hai report ngược nhau trên cùng một input là dấu hiệu có race condition. Ở đây không có race nào cả, chỉ có hai máy chạy hai số bước khác nhau.

---

## ⏸ Dừng lại — đoán trước #2

Bạn đã biết nguyên nhân. Giờ chọn cách sửa. Hai phương án dưới đây là hai phản xạ tự nhiên nhất.

```
(a) Đo dt thật mỗi frame rồi dùng luôn: dt = now - lastFrame.
    Máy nhanh bước nhỏ, máy chậm bước to — tổng quãng đường vẫn bằng nhau.

(b) Chốt cứng 240 Hz. Bảng nói rõ tần số càng cao càng gần đúng,
    nên lấy mức cao nhất máy chịu được là xong.

(c) Cả hai đều sai, và lý do khiến (a) sai đã nằm sẵn trong bài rồi.
```

Nếu bạn chọn (c), hãy tự trả lời tiếp: **cái gì trong bài đã là phản chứng của (a)?** Chỉ ra được đúng chỗ đó thì mục sau bạn đọc trong 20 giây.

---

### 3.4 Cách sửa thứ nhất: đo `dt` thật rồi dùng luôn

Đây là phản xạ đầu tiên của gần như tất cả mọi người, kể cả người viết engine:

```go
dt := now.Sub(lastFrame)   // máy nhanh bước nhỏ, máy chậm bước to
world.Update(dt)           // tổng quãng đường thì vẫn bằng nhau chứ?
```

Lập luận nghe kín kẽ: đi 10 bước mỗi bước 0,1 giây hay 100 bước mỗi bước 0,01 giây thì cũng là 1 giây. Thời gian có mất đi đâu.

**Nhưng bảng ở mục 3.1 chính là bảng đó.** Mỗi dòng *là* một `dt` đo được khác nhau: dòng 30 Hz là `dt = 33,3 ms`, dòng 144 Hz là `dt = 6,94 ms`. Cả hai đều đúng 1 giây, và chúng cho ra 5,0633 m với 4,9340 m — chênh 12,9 cm. Variable timestep không sửa vấn đề, **nó là vấn đề**, chỉ khác cái tên.

Và nó tệ hơn một bậc so với tình trạng hiện tại: `dt` giờ khác nhau **giữa hai frame trên cùng một máy**. Frame nào GC chạy, frame nào OS lấy CPU đi làm việc khác, frame đó `dt` dài ra. Hậu quả:

- Cùng một người chơi, cùng một cú nhảy, độ cao khác nhau tuỳ máy có đang bận hay không.
- Bug hết tái hiện được. Ở mục 2, người ở #218 ít nhất còn *luôn luôn* không qua nên debug được; với variable timestep anh ta qua được 7 lần trong 40 lần thử và không ai biết vì sao.
- Test tự động mất tác dụng: cùng kịch bản chạy hai lần trên cùng một máy ra hai kết quả.

Bạn vừa đổi một bug tất định lấy một bug ngẫu nhiên. Đây là chỗ trực giác phản bội, nên nó đáng ghi lại:

> Phép tích phân rời rạc **không tuyến tính theo số bước**. Chia nhỏ rồi cộng lại không cho ra cùng một kết quả. Mọi lập luận kiểu "tổng thì vẫn bằng nhau" đều sai ở đây, nghe hợp lý đến đâu cũng vậy.

### 3.5 Cách sửa thứ hai: vậy chốt 240 Hz cho chính xác

Phương án này thông minh hơn hẳn: nó **cố định** `dt`, nên đã đi đúng nửa đường. Lập luận: tần số càng cao càng gần đúng, vậy chốt mức cao nhất máy chịu được. Ba vấn đề, xếp theo mức chí tử tăng dần.

**Một — đắt gấp 4.** Ngân sách mỗi bước tụt từ **16,67 ms xuống 4,17 ms**. Với một game server chạy nhiều trận trên một máy, số trận mỗi máy chia 4. Đây là tiền thật, trả hàng tháng.

**Hai — vẫn không đúng.** 240 Hz lệch **2,0 cm**. Bạn vừa trả gấp 4 tiền để mua một con số **vẫn sai**, chỉ là sai ít hơn. Muốn xuống dưới 1 cm cần ~490 Hz (mục 3.2), gấp hơn 8 lần 60 Hz — và vẫn không phải 0. Đường tiệm cận này không chạm đáy: mỗi centimet tiếp theo đắt gấp đôi centimet trước.

**Ba — chỗ chết: không phải máy nào cũng giữ nổi 240 Hz.** Một máy tụt xuống 180 Hz vì tải, vì pin yếu, vì thermal throttling — và bạn quay về đúng bài toán ban đầu:

```
180 Hz → đỉnh nhảy 2,4806 m
240 Hz → đỉnh nhảy 2,4854 m
chênh 4,8 mm — hai máy, hai kết quả, y hệt vấn đề cũ
```

4,8 mm nhỏ hơn 3,39 cm rất nhiều, nhưng "nhỏ hơn" không phải "hết". Mép vực nào rơi vào khe đó sẽ tạo ra đúng cặp bug report ở mục 2 — và lần này bạn debug lâu hơn, vì con số nhỏ nên nó trông giống lỗi float hơn.

Đây là chỗ nhận ra bạn đã hỏi sai câu hỏi ngay từ đầu:

> Vấn đề chưa bao giờ là **"sai số bao nhiêu"**. Vấn đề là **"sai số của tôi có bằng sai số của bạn không"**.

Tăng Hz tấn công câu hỏi thứ nhất. Câu hỏi thứ hai nó không chạm được — và đó mới là câu tạo ra bug report.

### 3.6 Cách sửa đúng: bỏ mục tiêu "chính xác", lấy mục tiêu "giống nhau"

```go
const dt = time.Second / 60   // 16,666666 ms — hằng số của hệ thống, không bao giờ đổi
```

Với hằng số này, nhân vật rơi 4,9817 m thay vì 4,9000 m. Sai **8,2 cm** so với vật lý thật — **vĩnh viễn, ở mọi máy, ở mọi lần chạy**.

Và điều đó hoàn toàn ổn. Bạn không mô phỏng vũ trụ, bạn mô phỏng một game — `g = 9,8` cũng đã là con số bịa, vì nhân vật của bạn nhảy cao 2,5 m thì chẳng ai trên Trái Đất làm được. Nếu 8,2 cm làm cú nhảy sai ý đồ thiết kế, bạn chỉnh `v0`: một hằng số trong file config, sửa một lần, mọi máy nhận cùng một sửa đổi.

Sai số hệ thống thì chỉnh được bằng một hằng số. Sai số *khác nhau giữa các máy* thì không chỉnh được bằng bất cứ gì, vì bạn không biết máy nào đang chạy ở đâu.

Câu hỏi tiếp theo: **máy chậm thì sao?** Nếu nó không chạy nổi 60 bước mỗi giây?

> Simulation không được phép biết máy nhanh hay chậm.
> Máy chậm chạy **ít bước hơn trong một giây**, chứ không phải chạy **bước dài hơn**.

Hai vế nghe gần giống nhau nhưng khác hẳn về hậu quả. "Bước dài hơn" nghĩa là máy chậm mô phỏng ra một thế giới khác — đúng bug ở mục 2. "Ít bước hơn" nghĩa là nó mô phỏng ra **cùng một thế giới, chỉ tụt lại phía sau thời gian thật**. Vấn đề thứ hai có cách xử lý, và cách xử lý đó là bài 6.

### 3.7 Đóng đinh ràng buộc vào chữ ký hàm

Một hằng số `dt` không tự bảo vệ được mình: sáu tháng nữa sẽ có người thêm hiệu ứng mới và gọi `time.Now()` bên trong nó, vì lúc đó đó là cách nhanh nhất làm xong việc. Cách chặn không phải comment, là chữ ký hàm:

```go
func Run(ctx context.Context, cfg Config, sched Scheduler, step func(dt time.Duration), st *Stats)
```

`step` **nhận `dt` từ bên ngoài** và bên trong nó **không có đường nào lấy được thời gian thật**. Không phải viết thế cho đẹp — mà vì nếu để ngỏ, người dùng sai sẽ không nhận được lỗi biên dịch, không panic, không log. Họ nhận được hai bug report ngược nhau, sáu tháng sau, từ người chơi.

Nguyên tắc thì backend đã quen ở chỗ khác — truyền `context` vào thay vì để hàm tự tạo, truyền `clock` vào thay vì gọi `time.Now()` để test được: **thứ gì là nguồn của sự không xác định thì phải đi qua tham số**. Ở game server nó không phải best practice mà là điều kiện để hệ thống chạy đúng. Và `dt` cố định mở đường cho một tính chất lớn hơn nhiều — cùng state đầu vào cộng cùng chuỗi input cho ra cùng kết quả, ở mọi máy — thứ mà chương 3 và bài 9 dựng lên.

---

## 4. Ngành đã vấp đúng chỗ này, ở những chỗ không ai ngờ

**Đánh dấu mức độ chắc chắn trước khi đọc.** Hai ví dụ dưới đây được biết rộng rãi trong cộng đồng game nhưng tôi **không verify được từ nguồn gốc** (mã nguồn, thông báo chính thức của studio) trong lúc viết bài. Đọc như **giai thoại kỹ thuật để nhớ hình dạng của lỗi**, đừng trích như tài liệu chính thống.

**Dark Souls II (2014) — độ bền vũ khí.** Cộng đồng ghi nhận: độ bền vũ khí bị trừ **mỗi frame** thay vì mỗi đơn vị thời gian. Trên console 30 FPS thì cân bằng đúng thiết kế. Bản PC chạy 60 FPS, vũ khí hỏng **nhanh gấp đôi**.

Điều đáng rút ra không phải "họ ẩu" — FromSoftware năm 2014 có nhiều kinh nghiệm hơn bạn và tôi cộng lại — mà là **lỗi này không nằm ở chỗ bạn nhìn**:

> Không ai đi review dòng code trừ độ bền vũ khí để tìm bug phụ thuộc framerate. Người ta đi review code vật lý.

Lỗi loại này xuất hiện ở **bất cứ đâu có đại lượng bị cộng hoặc trừ theo frame** — hồi chiêu, độc, hồi máu, tích nộ, tăng nhiệt, đếm combo. Danh sách đó rất dài, nằm rải rác khắp codebase gameplay, và phần lớn do người viết gameplay viết chứ không phải người viết engine.

**Dòng engine của Bethesda (Skyrim, Fallout 4) — vật lý gắn vào framerate.** Chuyện được biết rộng rãi: vật lý Havok trong dòng engine này chạy theo nhịp frame, nên trên màn hình trên 60 Hz thì đồ vật rung, bay lên, một số chuyển động đổi tốc độ. Đây là lý do các game đó từng khoá FPS ở 60 và người chơi PC phải vá tay.

Hai ví dụ, một hình dạng chung — chính là câu ở mục 3.6 nhìn từ phía hậu quả:

> Chỗ nào trong code có phép `x += something` chạy mỗi frame mà không nhân với `dt`, chỗ đó đang đo thời gian bằng đơn vị "frame". Và "frame" không phải đơn vị thời gian — nó là đơn vị **phần cứng**.

Cả hai trường hợp đều sống qua nhiều bản vá, ở những studio làm game hàng chục năm.

---

## 5. Tính tay

Giấy và bút. Mọi số cần thiết đều có trong bài.

**Bài 1 — ngoại suy sai số.**
Bảng mục 3.1: cứ gấp đôi tần số thì sai số quãng rơi 1 giây giảm đúng một nửa.
- Từ mốc 240 Hz lệch 2,0 cm, suy ra sai số ở 480 Hz và ở 960 Hz.
- Muốn sai số dưới 1 cm thì cần bao nhiêu Hz? Dưới 1 mm thì cần bao nhiêu?
- Ngân sách mỗi bước ở tần số cuối cùng đó là bao nhiêu mili giây? So với 16,67 ms.

**Bài 2 — thiết kế màn chơi ngược.**
Bạn muốn cú nhảy `v0 = 7 m/s` qua được vực ở **mọi** tần số từ 30 Hz tới 240 Hz.
- Mép vực cao nhất bạn được phép đặt là bao nhiêu? (Dùng bảng mục 3.3, chú ý lấy dòng nào.)
- Bây giờ đảo lại: bạn muốn nó **không** qua được ở mọi tần số. Mép vực thấp nhất là bao nhiêu?
- Khoảng ở giữa hai con số đó rộng bao nhiêu centimet? Đó chính là **vùng cấm thiết kế** nếu bạn dùng variable timestep. Bạn có sẵn sàng nhớ tránh nó ở 200 màn chơi không?

**Bài 3 — cái giá của "chính xác".**
Server 60 Hz, mỗi bước sim tốn 1,18 µs cho 1.000 entity (số đo thật, bài 8 sẽ dùng lại).
- Ở 60 Hz, sim chiếm bao nhiêu phần trăm ngân sách 16,67 ms?
- Chuyển lên 490 Hz để mua sai số dưới 1 cm: ngân sách mỗi bước còn bao nhiêu, và sim chiếm bao nhiêu phần trăm?
- Con số thứ hai vẫn rất nhỏ. Vậy vì sao **vẫn không nên** làm thế? (Gợi ý: lý do không nằm ở CPU. Nó nằm ở mục 3.5, vấn đề số ba.)

---

## 6. Chuyển giao

Không có đáp án trong bài.

**Bạn được giao làm một game idle/incremental.** Người chơi mua máy sản xuất, mỗi máy sinh tài nguyên theo thời gian. Không vật lý, không va chạm. Đặc điểm riêng: game vẫn **tính tiếp khi người chơi đóng app** — mở lại sau 3 ngày phải nhận đủ tài nguyên của 3 ngày đó. Người chơi trả tiền thật để mua máy, nên số liệu sai là mất tiền của họ.

1. Ở đây có phép tích phân rời rạc không? Nếu tốc độ sản xuất là hằng số, sai số ở mục 3.1 có xuất hiện không — và câu trả lời đổi thế nào nếu tốc độ sản xuất **tăng dần theo số máy đang có**?
2. "Nhận đủ tài nguyên của 3 ngày offline" — tính bằng cách chạy bù 3 ngày × 60 bước/giây, hay bằng một công thức đóng? Mỗi cách trả giá bằng gì?
3. Nếu dùng công thức đóng cho phần offline nhưng vẫn tick 60 Hz khi app mở, bạn vừa tạo ra **hai đường tính khác nhau cho cùng một đại lượng**. Người tắt-mở app liên tục nhận được nhiều hay ít hơn người để app chạy suốt?
4. Người chơi báo: "tôi để máy 8 tiếng được ít tài nguyên hơn bạn tôi, cùng cấu hình". Bạn kiểm tra ba giả thuyết nào, theo thứ tự nào? Bài test 30 giây ở mục 3.2 dùng được ở đây không?
5. Tick rate game này nên là bao nhiêu, và lập luận khác gì với game bắn súng? **Cái gì trong bài này vẫn đúng** dù tick rate xuống 1 Hz?
6. **Câu khó nhất:** sai số 8,2 cm ở mục 3.6 quy sang game này là "người chơi nhận ít hơn 1,67% tài nguyên so với công thức toán học đúng". Bạn **chấp nhận** nó vĩnh viễn như bài này khuyên, hay bạn **không được phép**? Trả lời rồi hỏi tiếp: điều gì ở game này khác platformer khiến câu trả lời đổi — và nếu không được phép chấp nhận, thì nguyên tắc "giống nhau quan trọng hơn chính xác" còn đúng không, hay nó chỉ đúng trong một lớp bài toán cụ thể?

Câu 6 đo xem bạn đã hiểu hay chỉ vừa đọc xong. Mọi nguyên tắc kỹ thuật đều có một miền hiệu lực, và người dùng nguyên tắc mà không biết miền của nó sẽ áp nó vào đúng chỗ nó sai.

---

## 7. Tóm tắt

- Cùng công thức, chỉ đổi số bước, ra **năm kết quả khác nhau**: rơi 1 giây được 5,0633 m ở 30 Hz và 4,9340 m ở 144 Hz; giải tích 4,9000 m. Không dòng nào là "đúng".
- Sai số giảm **đúng một nửa mỗi lần gấp đôi tần số** (tỉ lệ đo được 2,000) — dấu vân tay của tích phân bậc nhất. **Lỗi float không có quy luật đó**, nên đây là bài test 30 giây trước khi mở debugger.
- Đỉnh nhảy `v0 = 7 m/s`: **2,4418 m ở 60 Hz, 2,4757 m ở 144 Hz**, mép vực 2,45 m rơi đúng vào giữa. Hai bug report ngược nhau, cả hai đều đúng, không có bug nào để sửa.
- "Đo `dt` thật rồi dùng luôn" **không sửa gì** — bảng sai số chính là bảng các `dt` khác nhau — và còn tệ hơn: `dt` đổi giữa hai frame trên **cùng một máy**, biến bug tất định thành bug ngẫu nhiên.
- "Chốt 240 Hz cho chính xác" tốn **CPU gấp 4** (ngân sách 16,67 → 4,17 ms), **vẫn sai 2,0 cm**, và chết khi một máy tụt xuống 180 Hz — chênh 4,8 mm là vấn đề cũ với con số nhỏ hơn.
- Câu hỏi đúng không phải "sai số bao nhiêu" mà **"sai số của tôi có bằng sai số của bạn không"**. Tăng Hz chỉ tấn công câu thứ nhất.
- `dt` là **hằng số của hệ thống**. Sai 8,2 cm vĩnh viễn ở mọi máy thì chỉnh được bằng một hằng số config; hai máy ra hai kết quả thì không chỉnh được bằng gì.
- **Máy chậm chạy ít bước hơn, không phải bước dài hơn.** Ràng buộc đóng đinh vào chữ ký `step(dt time.Duration)` — không có đường lấy thời gian thật từ bên trong, cố ý.
- Lỗi này không nằm ở code vật lý mà ở mọi chỗ có `x += something` mỗi frame: độ bền vũ khí, hồi chiêu, độc, hồi máu. *(Dark Souls II và dòng engine Bethesda — giai thoại kỹ thuật được biết rộng rãi, không verify từ nguồn gốc.)*

→ **Bài 6 — Accumulator, catch-up & spiral of death**: `dt` cố định rồi, nhưng thời gian thật thì không — ai nối hai cái lại?
