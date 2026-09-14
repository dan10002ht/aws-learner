# Bài 34 — Phân loại cheat & phòng thủ server-side

## 1. Mục tiêu

Sau bài này bạn có thể:

- Xếp một loại cheat bất kỳ vào **đúng một trong bốn nhóm theo mức chặn được**, và nói ngay server làm được gì với nó — thay vì đi tìm "cách chống aimbot".
- Chỉ ra vì sao nhóm chặn tuyệt đối **gần như miễn phí** (0,0120% một core cho 1.000 player) còn nhóm chỉ-giảm-được thì **không bao giờ xong**.
- Tính được **AOI theo bán kính cắt 97,17% thông tin thừa nhưng để lại 42% số entity nằm sau tường** — và vì sao đúng 42% đó là phần wallhack cần.
- Định lượng **chi phí CPU của occlusion culling phía server**: 45,1 ns mỗi raycast, 2,55% một core ở 1.000 entity, và ×4,25 nữa khi thêm biên an toàn.
- Phân biệt cheat **thuộc trách nhiệm server** với cheat không thuộc — và nói được vì sao macro chuột không phải bug của bạn.
- Cài **chống replay** bằng chính cơ chế sequence number của bài 14, và chỉ ra hai chỗ nó thủng: cửa sổ 550 ms và điểm wrap 18,2 phút.

---

## 2. Triệu chứng

Một studio phát hiện speed hack tràn lan. Họ làm đúng bài: chuyển movement sang server-authoritative, client chỉ gửi phím bấm, server tự tích phân vị trí. Speed hack biến mất **hoàn toàn** — không phải giảm, mà là không còn biểu diễn được nữa. Họ viết patch note: *"đã chặn 100% speed hack"*.

Ba tháng sau, bảng ticket khiếu nại gian lận:

| Nội dung ticket | Trước patch | Sau patch |
|---|---|---|
| Di chuyển bất thường / dịch chuyển tức thời | 742 (5,95%) | ~0 |
| Bắn quá chuẩn (aimbot, triggerbot) | 5.910 (47,36%) | 5.910 |
| Biết trước vị trí (wallhack, ESP) | 4.480 (35,90%) | 4.480 |
| Khác | 1.348 (10,80%) | 1.348 |
| **Tổng** | **12.480** | **11.738** |

Chặn **100%** một loại cheat làm tổng khiếu nại giảm **5,95%**.

*(Tỉ lệ nội dung ticket là giả định của bài để có chỗ bám; điều không giả định là phép tính: chặn sạch một hạng mục chiếm 5,95% thì tổng giảm đúng 5,95%.)*

Không ai nói dối. Patch đúng, số đo đúng, và cảm nhận của người chơi cũng đúng: game vẫn đầy cheater. Studio đã tiêu công sức vào nhóm cheat mà **server vốn đã thắng sẵn**, rồi tưởng mình đã xong.

---

## ⏸ Dừng lại — đoán trước #1

**Vì sao speed hack "chặn được 100%" còn aimbot thì không, khi cả hai đều là client gửi gói tin lên?**

```
(a) Aimbot khó phát hiện hơn — cần thuật toán tinh vi hơn
(b) Speed hack sửa dữ liệu, aimbot sửa hành vi; server chỉ kiểm được dữ liệu
(c) Gói tin của aimbot HỢP LỆ — nó là gói tin một người chơi giỏi cũng gửi
(d) Aimbot chạy trong driver chuột nên server không thấy
```

---

## 3. Lý thuyết

### 3.1 Trục phân loại đúng không phải tên cheat

Danh sách "speed hack, aimbot, wallhack, item dup, macro…" vô dụng vì nó xếp theo *triệu chứng ở phía người chơi*. Xếp lại theo **quyền quyết định**: với mỗi loại cheat, hỏi đúng một câu — *client có đang quyết định thứ gì mà server không tự tính lại được không?*

Câu trả lời chia làm bốn nhóm, và bốn nhóm này đòi bốn loại công cụ khác hẳn nhau:

| Nhóm | Đặc điểm | Công cụ | Kết quả |
|---|---|---|---|
| **1** | Client khai một giá trị server tự tính được | Server tự tính, bỏ giá trị client khai | Chặn **tuyệt đối** |
| **2** | Client gửi input hợp lệ, chỉ nhanh và chuẩn hơn người | Không có luật nào tách được | Chỉ **giảm** |
| **3** | Client nhận dữ liệu nó không được phép biết | **Không gửi** — kiến trúc, không kiểm tra | Chặn được, **đắt** |
| **4** | Không có gói tin nào bất thường | Ngoài phạm vi server | Không phải việc của bạn |

Đáp án hộp #1 là **(c)**. Nhóm 1 và nhóm 2 khác nhau không phải ở độ khó thuật toán mà ở chỗ **có tồn tại một hàm kiểm tra hay không**. Với speed hack, hàm đó tồn tại và tầm thường. Với aimbot, hàm đó **không tồn tại** — vì tập gói tin aimbot sinh ra là tập con của tập gói tin người chơi hợp lệ sinh ra.

Bốn mục tiếp theo đi theo đúng thứ tự chi phí tăng dần.

---

### 3.2 Nhóm 1 — server chặn tuyệt đối, và gần như miễn phí

Đặc trưng chung: **cheat này chỉ tồn tại nếu client được quyền quyết định.** Bỏ quyền đó đi thì cheat không còn *sai* — nó không còn *biểu diễn được*.

| Cheat | Client làm gì | Server giữ gì | Vì sao đủ |
|---|---|---|---|
| Speed hack | Nhân tốc độ, hoặc gửi vị trí đã dịch xa | `pos` là biến của server; input là bitmask phím | Không có trường nào mang tốc độ để sửa |
| Teleport | Gửi `pos` nhảy cóc | Như trên | Như trên |
| One-hit kill | Gửi `damage = 9999` | Bảng damage theo `weapon_id` server tra | Client không gửi damage, chỉ gửi "đã bắn" |
| Infinite ammo | Bỏ qua trừ đạn phía client | Bộ đếm đạn 2 byte/vũ khí trên server | Client bắn khi hết đạn → server bỏ lệnh |
| Item duplication | Dùng một item hai lần | Kho đồ là state của server, thao tác trong **một** goroutine room (bài 28) | Hai lệnh nối tiếp nhau, lệnh sau thấy kho đã trừ |

Chi phí thật của cả nhóm: **bạn đã trả rồi**. Server giữ `pos`, giữ bảng damage, giữ kho đồ — không phải vì chống gian lận mà vì bài 1 (RAM-first, một trận một chủ sở hữu) và bài 28 (simulation single-threaded) đã ép như vậy. Chống gian lận là **sản phẩm phụ**.

Con số cho phần *thêm* duy nhất — các phép clamp:

```
1 phép kiểm tra ~2 ns × 1.000 player × 60 Hz = 0,120 ms CPU mỗi giây
                                             = 0,0120 % một core
(kể cả đắt gấp 5, ~10 ns/phép, vẫn chỉ 0,0600 %)
```

*(2–10 ns là bậc độ lớn cho một phép so sánh trên dữ liệu đã nằm trong cache — không phải hằng số.)*

**Hai chỗ nhóm 1 vẫn thủng, và cả hai đều không phải lỗi "quên kiểm tra".**

**Thủng thứ nhất — game cho client tự tính movement.** Có game buộc phải làm vậy (bài 18: prediction cần client tự chạy trước). Khi đó server nhận `pos` từ client và phải clamp. Cạm bẫy nằm ở mẫu số: ở 60 Hz với `v_max` = 5 m/s, một tick đi tối đa **0,0833 m** — nhưng nếu 4 gói input trước bị mất, gói tới mang chuyển động của 5 tick, hợp lệ ở **0,4167 m**. Clamp theo *gói* thì đá nhầm người mạng kém; clamp theo *thời gian trôi qua kể từ gói hợp lệ gần nhất* mới đúng. Đây là ràng buộc, không phải heuristic: đường đi của người chơi thật luôn nằm dưới `v_max × Δt`.

**Thủng thứ hai — item duplication khi có hai chủ sở hữu.** Tính nguyên tử của nhóm 1 đến từ chỗ chỉ có **một** goroutine sở hữu state. Bài 32 phá đúng giả định đó: trong lúc handoff, entity tồn tại trên cả node cũ lẫn node mới. Cửa sổ 80 ms ở 60 Hz là **4,8 tick** — đủ để gửi "dùng item" tới cả hai node và được chấp nhận hai lần. Item dup gần như không bao giờ là lỗi kiểm tra đầu vào; nó là lỗi **có hai authority cùng lúc**. Chỗ phải sửa là giao thức handoff (một node đóng băng entity trước khi node kia mở), không phải hàm `useItem`.

---

### 3.3 Nhóm 2 — chỉ giảm được, và server không có công cụ nào

Aimbot đọc vị trí địch trong bộ nhớ client rồi đặt góc ngắm thẳng vào đó. Cái nó gửi lên server: **một góc yaw/pitch và một bit "đã bắn"** — đúng hai thứ mà mọi client hợp lệ đều gửi, đúng 60 lần mỗi giây.

Thử dựng hàm kiểm tra và xem nó gãy ở đâu:

| Luật định thử | Aimbot lách bằng | Ai bị đá nhầm |
|---|---|---|
| Tốc độ xoay > X °/s là bot | Nội suy góc qua 3–4 tick | Người flick chuột — 180° trong 50 ms là 3.600 °/s, hoàn toàn người làm được |
| Bắn trong ≤ 1 tick sau khi tâm chạm địch | Chờ thêm 9 tick (150 ms) rồi mới bắn | Người **pre-fire** — bóp cò *trước* khi địch xuất hiện, "thời gian phản xạ" đo ra bằng 0 hoặc âm |
| Độ chính xác > Y% là bot | Cố ý bắn trượt theo tỉ lệ | Người chơi hàng top, đúng nhóm khiếu nại nhiều nhất |

Recoil script còn tệ hơn: pattern giật của vũ khí là **tất định** (bài 9 đòi hỏi thế), nên chuỗi bù giật hoàn hảo là nghịch đảo của một hàm server biết trước — nhưng người tập 500 giờ cũng tạo ra chuỗi rất gần chuỗi đó.

Ở 60 Hz, độ phân giải thời gian của mọi phép đo phía server là **16,67 ms** — không đo được phản xạ mịn hơn một tick. Triggerbot tự nguyện trả 150 ms độ trễ thì nằm gọn trong dải phản xạ người (bậc độ lớn 150–250 ms) và mất gần như không gì: nó vẫn không bao giờ bắn hụt.

> Ranh giới của nhóm 2, nói một lần cho gọn: **mọi luật định trên một mẫu đơn lẻ đều có phản ví dụ là một người chơi thật.** Thứ duy nhất tách được aimbot khỏi tay giỏi là **phân phối qua hàng nghìn mẫu**, và đó không phải luật — đó là thống kê, bài 35.

Cái server *có thể* làm mà không tốn gì: **giảm giá trị đầu vào của aimbot**. Aimbot chỉ chuẩn bằng dữ liệu nó có. Nếu server không gửi vị trí địch sau tường (mục 3.4), aimbot mất luôn khả năng ngắm sẵn qua tường. Đây là điểm nối quan trọng của bài: **nhóm 3 làm giảm nhóm 2**, còn ngược lại thì không.

---

### 3.4 Nhóm 3 — chặn bằng kiến trúc, không bằng kiểm tra

Wallhack, ESP, map hack không gửi gói tin nào lên server cả. Chúng chỉ **đọc** — đọc bộ nhớ client, vẽ lại thứ client đã có. Không có gì để kiểm tra, vì không có yêu cầu nào từ client.

Cách duy nhất: **đừng gửi.** Bài 26 đã dựng sẵn cơ chế — AOI. Câu hỏi còn lại là AOI cắt được bao nhiêu, và bao nhiêu là chưa đủ.

Đo trên một bản đồ cụ thể để có số thật: **1.000 × 1.000 m, 100 toà nhà 60 × 60 m đặt trên lưới 100 m (che 36% diện tích), N entity rải đều ngoài nhà, bán kính AOI R = 100 m.**

| N | k trong bán kính | k thật sự nhìn thấy | Bị tường che |
|---|---|---|---|
| 100 | 2,58 | 1,50 | 41,86% |
| 200 | 5,35 | 3,36 | 37,20% |
| 500 | 13,90 | 8,08 | 41,86% |
| 1.000 | 28,25 | 16,24 | 42,49% |

Với N = 1.000, mỗi observer nhận 28,25 trong 999 entity khác: **AOI bán kính cắt `1 − 28,25/999` = 97,17% lượng thông tin thừa.** Tuyệt vời cho băng thông — và **vô dụng cho wallhack**, vì trong 28,25 entity còn lại thì **42,49% đang đứng sau tường**. Đó chính xác là tập mà wallhack tồn tại để vẽ: đủ gần để quyết định pha giao tranh, đủ khuất để mắt thường không thấy.

*(Con số 42% dao động theo seed và theo bố cục bản đồ — hai seed cho 40,60% và 42,49%. Cái đáng nhớ là **bậc: khoảng hai phần năm**, không phải chữ số thứ hai.)*

<svg viewBox="0 0 700 320" role="img" aria-labelledby="gs34-a-t gs34-a-d" style="width:100%;height:auto">
<title id="gs34-a-t">AOI theo bán kính so với lọc theo tầm nhìn thẳng</title>
<desc id="gs34-a-d">Một observer ở giữa vòng tròn bán kính AOI. Các entity ngoài vòng tròn bị AOI loại. Trong vòng tròn, một bức tường chia entity thành nhóm nhìn thấy được và nhóm bị che; AOI bán kính vẫn gửi cả hai nhóm, chỉ occlusion culling mới loại nhóm bị che.</desc>
<circle cx="170" cy="155" r="115" fill="#3b82f6" fill-opacity="0.10" stroke="#3b82f6" stroke-opacity="0.6" stroke-width="1.5" stroke-dasharray="5 4"/>
<rect x="200" y="60" width="18" height="125" rx="2" fill="#64748b" fill-opacity="0.75"/>
<text x="238" y="55" font-size="10" fill="currentColor">tường</text>
<circle cx="170" cy="155" r="6" fill="#3b82f6"/>
<text x="150" y="177" font-size="10" fill="currentColor">observer</text>
<circle cx="250" cy="90" r="5" fill="#ef4444"/>
<circle cx="265" cy="130" r="5" fill="#ef4444"/>
<circle cx="238" cy="162" r="5" fill="#ef4444"/>
<circle cx="95" cy="110" r="5" fill="#84cc16"/>
<circle cx="120" cy="215" r="5" fill="#84cc16"/>
<circle cx="200" cy="255" r="5" fill="#84cc16"/>
<circle cx="72" cy="180" r="5" fill="#84cc16"/>
<circle cx="400" cy="70" r="5" fill="#64748b"/>
<circle cx="60" cy="42" r="5" fill="#64748b"/>
<circle cx="330" cy="255" r="5" fill="#64748b"/>
<text x="112" y="288" font-size="10" fill="currentColor">R = 100 m</text>
<line x1="430" y1="45" x2="430" y2="290" stroke="currentColor" stroke-opacity="0.25" stroke-width="1"/>
<circle cx="452" cy="70" r="5" fill="#64748b"/>
<text x="466" y="74" font-size="11" fill="currentColor">ngoài bán kính — AOI loại: 970,75 entity</text>
<circle cx="452" cy="118" r="5" fill="#ef4444"/>
<text x="466" y="122" font-size="11" fill="currentColor">trong bán kính, SAU TƯỜNG: 12,01</text>
<text x="466" y="136" font-size="10" fill="currentColor">AOI bán kính vẫn gửi — wallhack sống ở đây</text>
<circle cx="452" cy="180" r="5" fill="#84cc16"/>
<text x="466" y="184" font-size="11" fill="currentColor">nhìn thấy thật: 16,24</text>
<text x="466" y="198" font-size="10" fill="currentColor">bắt buộc phải gửi</text>
<text x="452" y="248" font-size="11" fill="currentColor">N = 1.000 · AOI cắt 97,17%</text>
<text x="452" y="264" font-size="11" fill="currentColor">phần còn lại: 42,49% bị che</text>
</svg>

#### ⏸ Dừng lại — đoán trước #2

Muốn cắt nốt 42,49% đó thì phải kiểm tra tầm nhìn thẳng: raycast từ mắt observer tới từng entity trong bán kính, đụng tường thì bỏ.

**Một phép raycast đoạn thẳng vs 100 hình hộp so với một phép so bình phương khoảng cách — đắt hơn bao nhiêu lần?**

```
(a) ~3 lần — cùng là vài phép nhân
(b) ~60 lần nếu có lưới lọc trước, ~300 lần nếu duyệt hết nhà
(c) ~2.000 lần
(d) Không so được — raycast phải hỏi engine vật lý
```

---

### 3.5 Occlusion culling phía server: đắt ở đâu và đắt bao nhiêu

Đáp án là **(b)**. Đo trên cùng một máy, 1.000.000 phép mỗi loại, cùng bản đồ 100 toà nhà:

| Phép | Thời gian | So với so khoảng cách |
|---|---|---|
| So bình phương khoảng cách | **0,72 ns** | 1× |
| Raycast, duyệt hết 100 nhà | **222 ns** | **308×** |
| Raycast, lưới 50 m lọc nhà trước | **45,1 ns** | **62,6×** |

Lưới lọc nhà là bắt buộc — cắt 79,7% chi phí, dùng lại đúng cấu trúc grid của bài 26.

*(Bài 26 dùng con số thận trọng **5 ns** cho một phép so khoảng cách, và ghi rõ đó là ước lượng bậc độ lớn. Bench ở đây đo được **0,72 ns** vì vòng lặp chạy trên mảng liền mạch, nhánh dễ dự đoán, dữ liệu nằm gọn trong cache — tức là cận dưới. Với layout ECS thật, entity nằm rời rạc trong bộ nhớ, con số rơi vào khoảng giữa. Lấy 5 ns thì tỉ lệ raycast/so-khoảng-cách còn khoảng 9× thay vì 62,6× — kết luận "chỉ chạy occlusion trên tập đã lọc bởi AOI" không đổi ở cả hai đầu dải.)* Nhưng ngay cả sau tối ưu, **một raycast vẫn đắt hơn một phép so khoảng cách 62,6 lần**. Đó là lý do occlusion culling không bao giờ chạy trên tập N², chỉ chạy trên tập đã lọc bởi AOI.

Chi phí thật, N = 1.000, snapshot 20 Hz (bài 8), tổng 28.246 cặp trong bán kính mỗi vòng:

| Phương án | Số raycast/vòng | Thời gian/vòng | CPU @20 Hz |
|---|---|---|---|
| Raycast trên tập AOI, có lưới | 28.246 | 1,274 ms | **2,55% một core** |
| Raycast trên tập AOI, không lưới | 28.246 | 6,271 ms | 12,54% |
| Raycast trên **mọi cặp** (bỏ AOI trước) | 999.000 | 45,05 ms | **0,90 core** |

Bỏ AOI mà raycast thẳng thì đắt gấp **35,3 lần** cho ra đúng kết quả đó. Thứ tự bắt buộc: **lọc rẻ trước, lọc đắt sau** — y như grid rồi mới so khoảng cách ở bài 26.

**Nhưng 2,55% chưa phải giá cuối.** Occlusion culling đúng thì tạo ra pop-in: entity chạy khỏi mép tường, tick trước server chưa gửi, tick này client phải spawn nó từ hư không — trong khi đạn đã bay. Muốn tránh, phải gửi cả những ai **sắp** nhìn thấy được, với biên rộng bằng quãng đường đi trong toàn bộ độ trễ từ lúc server quyết định tới lúc client vẽ: `50 ms (chờ snapshot) + 100 ms (buffer nội suy) + 20 ms (RTT/2)` = 170 ms, ở 5 m/s là **0,85 m**.

Cách cài: entity được gửi nếu chính nó nhìn thấy được, **hoặc** một trong 8 điểm trên vòng tròn bán kính 0,85 m quanh nó nhìn thấy được. Đo lại:

| Biên | % tập bán kính bị cắt | Raycast/observer | CPU @20 Hz, N=1.000 |
|---|---|---|---|
| 0 m | 40,60% | 27,69 | 2,50% core |
| **0,85 m** | **39,88%** | **117,61** | **10,61% core** |
| 2,00 m | 38,87% | — | — |
| 5,00 m | 36,29% | — | — |

Đây là chỗ đáng nhớ nhất của mục này, và nó ngược trực giác: **biên an toàn gần như không tốn băng thông (số entity gửi tăng 1,22%) nhưng tốn CPU gấp 4,25 lần.** Lý do bất đối xứng: entity nhìn thấy được thoát ngay ở raycast đầu tiên, còn entity bị che phải chạy đủ 9 phép mới dám kết luận là bị che. Bạn trả CPU cho những người bạn **không** gửi.

Đường thoát khỏi chi phí runtime là **PVS** — tính trước bảng "ô nào nhìn thấy ô nào", tra bảng thay vì raycast. Giá là bộ nhớ, bình phương theo độ mịn:

| Cạnh ô | Số ô | Bảng bit | Bộ nhớ |
|---|---|---|---|
| 20 m | 2.500 | 6.250.000 bit | **0,8 MB** |
| 10 m | 10.000 | 100.000.000 bit | **12,5 MB** |
| 5 m | 40.000 | 1.600.000.000 bit | **200 MB** |

12,5 MB cho ô 10 m là rẻ. Nhưng PVS chỉ đúng khi **hình học tĩnh**: một cánh cửa mở được, một bức tường phá được, một chiếc xe đỗ chắn tầm nhìn là bảng sai — phần động vẫn phải raycast.

Ranh giới của nhóm 3: **chặn được thật, nhưng trả bằng CPU và bằng một loại bug gameplay mới (pop-in), không phải bằng một hàm kiểm tra.**

---

### 3.6 Nhóm 4 — không thuộc về server

Bốn thứ hay bị gộp nhầm vào bài toán anti-cheat backend:

| Hiện tượng | Vì sao server không thấy | Thuộc về ai |
|---|---|---|
| **Macro chuột / phần cứng** (bù giật trong firmware chuột) | Gói tin sinh ra từ chuyển động chuột vật lý thật — không phân biệt được với tay người | Nhóm 2 về bản chất: thống kê, bài 35 |
| **Stream sniping** | Kẻ gian không chạm vào game của bạn, hắn xem stream | Thiết kế sản phẩm: delay stream, ẩn tên |
| **Wintrading** (hẹn nhau thua để đẩy rank) | Mọi input đều hợp lệ, mọi trận đều thật | Matchmaking + phân tích quan hệ (bài 30) |
| **Smurf** (tài khoản phụ chơi ở rank thấp) | Không cheat gì cả — chỉ là MMR sai | Bài toán xếp hạng (bài 30) |

Nêu nhóm này không phải để bỏ qua, mà để **đừng tiêu ngân sách tick vào nó**: ba trong bốn dòng trên được giải bằng thiết kế hoặc chính sách, không bằng một dòng code trong vòng lặp simulation.

---

### 3.7 Replay attack: cơ chế chống mất gói cũng là cơ chế chống phát lại

Một loại cheat không nằm gọn trong bốn nhóm trên vì nó tấn công **tầng vận chuyển** chứ không tấn công logic game: client bắt một gói tin cũ của chính mình rồi gửi lại. Gói đó hoàn toàn hợp lệ — nó **đã từng** hợp lệ. Gửi lại 20 lần gói "dùng bình máu" là item duplication mà không cần sửa một byte.

Điểm hay: bạn **đã cài xong** phòng thủ cho nó ở bài 14, vì lý do khác. Header 8 byte `seq / ack / ack_bits` phục vụ chống mất gói, nhưng nó cũng là bộ lọc replay:

```
unreliable-sequenced:  bỏ mọi gói có seq <= seq mới nhất đã nhận
                       -> gói cũ phát lại bị bỏ ngay, MIỄN PHÍ
reliable-ordered:      seq đã nằm trong received-bitfield -> đã xử lý, bỏ
                       -> đây mới là idempotency thật
```

Chỗ dễ làm sai: **ack một gói không đồng nghĩa với ghi nhớ đã xử lý gói đó.** Nếu bạn ack rồi xoá seq khỏi bộ nhớ, gói phát lại đến sau sẽ trông như mới. Bộ lọc replay phải là **received-bitfield**, không phải hàng đợi gửi lại.

Và hai chỗ nó thủng, cả hai đều là hệ quả của việc bitfield hữu hạn:

**Thủng 1 — cửa sổ quá ngắn.** `ack_bits` 32 bit nhớ được 33 gói: ở 60 Hz là **550 ms**, ở nhịp 20 Hz là **1.650 ms**. Gói phát lại muộn hơn cửa sổ rơi ra ngoài bitfield. Xử lý "cũ quá thì bỏ" thì an toàn; xử lý "không biết thì cho qua" thì 550 ms chính là lỗ hổng.

**Thủng 2 — điểm wrap.** `seq` 16 bit quay vòng sau 65.536 gói. Phép so "mới hơn" phải là so vòng (`(a−b) mod 65536 < 32768`), nếu không thì gói `seq = 5` sau khi wrap trông như cũ hơn `seq = 65.000` và bị bỏ oan. Nhưng chính phép so vòng đó khiến một gói phát lại **đúng một vòng sau** trông như hợp lệ:

| Nhịp gửi | Một vòng 16 bit | Một vòng 32 bit |
|---|---|---|
| 60 Hz | **18,2 phút** | 2,3 năm |
| 20 Hz | 54,61 phút | — |

18,2 phút ngắn hơn một trận đấu. Cách sửa rẻ nhất là gắn thêm **session id + epoch** vào gói và đổi khoá mỗi trận, hoặc đơn giản là dùng `seq` 32 bit — 4 byte thêm mỗi gói, ở 60 Hz cho 1.000 player là 240 KB/s, và bạn mua được 2,3 năm.

Ràng buộc cuối: **`seq` chỉ chống replay nếu kẻ gian không sửa được `seq`** — trên UDP trần hắn sửa được, hắn là chủ máy đó. Cơ chế này phòng **phát lại nguyên xi**, không phòng **soạn gói mới**. Cái phòng gói soạn mới vẫn là nhóm 1: server tự tính, kho đồ một chủ.

---

## 4. Bảng tổng hợp và kinh tế học của chống gian lận

Gộp lại tất cả, kèm cái giá:

| Cheat | Nhóm | Server làm được gì | Chi phí |
|---|---|---|---|
| Speed hack, teleport | 1 | Không biểu diễn được | ~0 (đã trả ở bài 1) |
| One-hit kill, infinite ammo | 1 | Server tra bảng, giữ bộ đếm | ~0 |
| Item duplication | 1 | Một chủ sở hữu / room | ~0, **trừ lúc handoff (bài 32)** |
| Replay gói cũ | 1 | received-bitfield của bài 14 | ~0, đã có sẵn |
| Khai gian `d` / lag switch | 1 phần | Trần cứng cắt 55,6% giá trị (bài 21) | ~0 |
| **Wallhack, ESP, map hack** | **3** | Không gửi: AOI + occlusion | **2,55–10,61% một core** ở N=1.000 |
| Map hack (RTS, fog of war) | 3 | Như trên, lọc theo fog thay vì raycast | Rẻ hơn — fog vốn đã tính |
| **Aimbot, triggerbot, recoil script** | **2** | Giảm đầu vào (nhóm 3), rồi thống kê | **1,40 TB/30 ngày** telemetry, không bao giờ xong |
| Macro phần cứng | 2 | Như aimbot | Như trên |
| Stream sniping, wintrading, smurf | 4 | Không gì, ở tầng tick | Thiết kế / matchmaking |

Con số telemetry của nhóm 2, để thấy nó khác hạng với ba nhóm kia: muốn làm thống kê ở bài 35 thì phải **giữ lại** input, tối thiểu yaw + pitch + bitmask nút = 9 B mỗi tick.

```
9 B × 60 Hz            = 540 B/s mỗi player
× 1.000 CCU            = 0,54 MB/s  → 46,66 GB/ngày → 1,40 TB/30 ngày
× 10.000 CCU           = 5,40 MB/s  → 466,56 GB/ngày → 14,00 TB/30 ngày
```

Và đó mới là lưu trữ — chưa tính CPU phân tích, đội xử lý khiếu nại, và vòng lặp *cheat mới ra → mô hình cũ mù → thu thêm dữ liệu*.

<svg viewBox="0 0 700 300" role="img" aria-labelledby="gs34-b-t gs34-b-d" style="width:100%;height:auto">
<title id="gs34-b-t">Chi phí so với tỉ lệ chặn được, theo bốn nhóm cheat</title>
<desc id="gs34-b-d">Trục ngang là chi phí phía server theo thang bậc độ lớn, trục dọc là phần trăm cheat chặn được. Nhóm một nằm góc trên bên trái: gần như miễn phí và chặn tuyệt đối. Nhóm ba nằm giữa: tốn vài phần trăm một core và chặn khoảng bốn mươi phần trăm. Nhóm hai nằm bên phải với hiệu quả không xác định. Nhóm bốn nằm góc dưới bên trái với hiệu quả bằng không.</desc>
<line x1="60" y1="255" x2="640" y2="255" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<line x1="60" y1="255" x2="60" y2="45" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<text x="80" y="272" font-size="10" fill="currentColor" text-anchor="middle">0,01%</text>
<text x="200" y="272" font-size="10" fill="currentColor" text-anchor="middle">0,1%</text>
<text x="320" y="272" font-size="10" fill="currentColor" text-anchor="middle">1%</text>
<text x="440" y="272" font-size="10" fill="currentColor" text-anchor="middle">10%</text>
<text x="575" y="272" font-size="10" fill="currentColor" text-anchor="middle">không có trần</text>
<text x="350" y="291" font-size="11" fill="currentColor" text-anchor="middle">chi phí server (% một core, thang bậc độ lớn)</text>
<text x="52" y="55" font-size="10" fill="currentColor" text-anchor="end">100%</text>
<text x="52" y="157" font-size="10" fill="currentColor" text-anchor="end">50%</text>
<text x="52" y="258" font-size="10" fill="currentColor" text-anchor="end">0%</text>
<line x1="60" y1="55" x2="640" y2="55" stroke="currentColor" stroke-opacity="0.15" stroke-width="1"/>
<line x1="500" y1="45" x2="500" y2="255" stroke="currentColor" stroke-opacity="0.2" stroke-width="1" stroke-dasharray="4 4"/>
<circle cx="85" cy="55" r="7" fill="#84cc16"/>
<text x="98" y="50" font-size="11" fill="currentColor">Nhóm 1 — 0,0120% core, chặn tuyệt đối</text>
<text x="98" y="64" font-size="10" fill="currentColor">đã trả sẵn vì lý do khác</text>
<line x1="369" y1="168" x2="443" y2="168" stroke="#f59e0b" stroke-width="4"/>
<circle cx="369" cy="168" r="6" fill="#f59e0b"/>
<circle cx="443" cy="168" r="6" fill="#f59e0b"/>
<text x="300" y="150" font-size="11" fill="currentColor">Nhóm 3 — 2,55% → 10,61% khi thêm biên</text>
<text x="300" y="192" font-size="10" fill="currentColor">cắt 42,49% tập trong bán kính</text>
<circle cx="575" cy="205" r="7" fill="#ef4444"/>
<text x="575" y="196" font-size="11" fill="currentColor" text-anchor="middle">Nhóm 2 — 1,40 TB/30 ngày</text>
<text x="575" y="224" font-size="10" fill="currentColor" text-anchor="middle">hiệu quả không xác định trước</text>
<circle cx="68" cy="255" r="6" fill="#64748b"/>
<text x="82" y="243" font-size="11" fill="currentColor">Nhóm 4 — 0% ở server</text>
</svg>

Ba mệnh đề rút ra, theo thứ tự bắt buộc khi phân bổ công sức:

1. **Nhóm 1 phải xong trước và nó gần như không tốn gì.** Nếu bạn còn cheat nhóm 1, bạn không có bài toán anti-cheat, bạn có bug kiến trúc. Sửa xong thì đóng lại vĩnh viễn.
2. **Nhóm 3 là khoản đầu tư có đáy.** 2,55% một core, biết trước, không tăng theo số cheater. Nó còn **làm giảm nhóm 2** — aimbot không ngắm được thứ nó không nhận.
3. **Nhóm 2 là chi phí vận hành vĩnh viễn, không phải dự án.** Nó không có ngày kết thúc, và giá trị của nó phụ thuộc vào chất lượng dữ liệu mà nhóm 3 để lọt.

Thứ tự này giải thích luôn tình huống ở mục 2: studio kia hoàn thành xuất sắc bước 1 — bước duy nhất gần như miễn phí — rồi tưởng đó là toàn bộ bài toán.

---

## 5. Tính tay

**Bài 1.** Trận 200 người, bản đồ và mật độ như mục 3.4 (k trong bán kính = 5,35, nhìn thấy thật = 3,36). Snapshot 20 Hz, mỗi entity 13 B (số quantized của bài 24). Tính băng thông chiều ra khi chỉ có AOI bán kính, và khi có thêm occlusion culling. Occlusion tiết kiệm bao nhiêu KB/s, và với giá 45,1 ns mỗi raycast thì tốn bao nhiêu phần trăm một core?

**Bài 2.** Game của bạn ở 30 Hz thay vì 60 Hz, `v_max` = 7 m/s, và bạn chấp nhận mất tối đa 6 gói input liên tiếp trước khi coi là mất kết nối. Ngưỡng clamp `|Δp|` tối đa cho một gói tới sau chuỗi mất gói tệ nhất là bao nhiêu mét? Nếu bạn cài nhầm thành clamp-theo-gói (`v_max × 1/30`), người mạng kém bị đá oan ở đúng tỉ lệ mất gói nào?

**Bài 3.** Bạn dùng `seq` 16 bit và gửi input ở 60 Hz. Một kẻ gian ghi lại gói "dùng item" ở phút thứ 2 của trận và phát lại đúng một vòng wrap sau. Trận đấu dài 25 phút — hắn có kịp không? Nếu bạn đổi sang 20 Hz thì sao? Và nếu bạn giữ 16 bit nhưng thêm 1 byte epoch tăng mỗi khi wrap, cửa sổ an toàn thành bao lâu?

---

## 6. Chuyển giao

Bạn làm một game bắn súng góc nhìn thứ nhất, 60 người mỗi trận, bản đồ đô thị nhiều nhà.

1. Bạn có 2,55% một core cho occlusion culling ở N = 1.000. Trận của bạn chỉ 60 người — hãy ước lượng lại chi phí, và nói xem ở quy mô đó occlusion culling còn đáng làm không, hay AOI bán kính đã đủ.
2. Bạn thêm một vũ khí bắn xuyên tường mỏng. Occlusion culling đang lọc bỏ đúng những người đứng sau tường mỏng đó. Cơ chế lọc phải đổi thế nào để vũ khí vẫn dùng được mà không mở lại toàn bộ cửa cho wallhack?
3. Đội design muốn thêm âm thanh bước chân nghe xa 300 m. Bài 26 nói tầm nghe 3× tầm nhìn thì `k` âm thanh ≈ 9× `k` hình. Sự kiện âm thanh có phải chịu occlusion culling không, và nếu có thì raycast tới đâu — tới nguồn âm hay tới đường truyền âm?
4. Một người chơi bị report 40 lần trong một tuần. Bạn kiểm tra log: mọi gói tin của anh ta đều qua hết kiểm tra nhóm 1. Bạn xếp anh ta vào nhóm nào, và điều đó quyết định bước tiếp theo của bạn ra sao?
5. Bạn phát hiện một cheat mới: client sửa file cấu hình để tắt hiệu ứng khói, nhìn xuyên lựu đạn khói mà mọi người khác bị mù. Xếp nó vào nhóm nào? Chú ý: khói là entity **động, sống ngắn, do server sinh ra**.
6. Nếu bạn phải chọn **một** khoản đầu tư duy nhất cho năm tới — hoàn thiện occlusion culling (nhóm 3) hay dựng pipeline thống kê (nhóm 2) — bạn chọn cái nào, và con số nào trong bài này đứng về phía bạn?
7. Câu khó nhất: occlusion culling làm giảm giá trị của wallhack, nhưng nó **tạo ra một kênh rò rỉ mới**. Client hợp lệ biết chính xác server đang gửi cho nó những entity nào — và tập đó chính là "những người đang nhìn thấy tôi". Kẻ gian không cần vẽ ai xuyên tường nữa; hắn chỉ cần đọc **kích thước tập entity mình đang nhận** để biết mình có bị nhìn thấy hay không, tức là một radar cảnh báo hoàn hảo mà mọi dữ liệu đều hợp lệ. Cheat này thuộc nhóm nào, và có tồn tại cách sửa nào **không** làm hỏng chính lợi ích băng thông mà bạn vừa mua bằng 2,55% một core?

---

## 7. Tóm tắt

- Phân loại cheat theo **quyền quyết định**, không theo tên: bốn nhóm đòi bốn công cụ khác hẳn nhau, và ba trong bốn nhóm không dùng "kiểm tra đầu vào".
- Chặn 100% một loại cheat chiếm 5,95% khiếu nại làm tổng giảm đúng **5,95%**. Nhóm dễ chặn nhất cũng là nhóm ít gây hại nhất.
- **Nhóm 1** (speed hack, teleport, one-hit kill, infinite ammo, item dup) chặn **tuyệt đối** với **0,0120% một core** cho 1.000 player — vì đã trả tiền ở bài 1 và bài 28. Hai chỗ thủng: clamp phải theo **thời gian trôi qua** (0,4167 m sau 5 tick mất gói, không phải 0,0833 m), và **handoff 80 ms = 4,8 tick hai chủ sở hữu** (bài 32).
- **Nhóm 2** (aimbot, triggerbot, recoil script) không có hàm kiểm tra nào tồn tại: mọi ngưỡng đều có phản ví dụ là người chơi thật — 180° trong 50 ms là 3.600 °/s và tay người làm được. Độ phân giải đo của server là **16,67 ms**; triggerbot chờ 150 ms là biến mất khỏi mọi luật định.
- **Nhóm 3** chặn bằng kiến trúc: AOI bán kính cắt **97,17%** thông tin thừa nhưng **42,49% phần còn lại vẫn đứng sau tường** — đúng tập mà wallhack cần.
- Occlusion culling: **45,1 ns/raycast** (có lưới lọc nhà; 222 ns nếu duyệt hết 100 nhà) = **62,6× so khoảng cách**. N = 1.000 @20 Hz: **2,55% một core**. Chạy trên N² thay vì trên tập AOI đắt gấp **35,3 lần**.
- Biên chống pop-in 0,85 m (= 5 m/s × 170 ms) tốn **+1,22% băng thông nhưng ×4,25 CPU** → 10,61% một core. Bạn trả CPU cho những entity bạn **không** gửi.
- PVS đổi CPU lấy RAM: ô 10 m = **12,5 MB**, ô 5 m = **200 MB** — chỉ dùng được với hình học tĩnh.
- Replay attack chặn bằng **received-bitfield của bài 14**, miễn phí. Hai lỗ: cửa sổ 32 bit = **550 ms @60 Hz**, và wrap `seq` 16 bit = **18,2 phút** — ngắn hơn một trận. `seq` 32 bit mua 2,3 năm với giá 4 byte/gói.
- Kinh tế học: nhóm 1 ~0 và xong hẳn; nhóm 3 có đáy 2,55% một core và **làm giảm nhóm 2**; nhóm 2 là **1,40 TB/30 ngày ở 1.000 CCU** và không có ngày kết thúc.

→ **Bài 35 — Phát hiện gian lận & vận hành**: nhóm 2 không chặn được bằng luật. Bài cuối chương hỏi cái còn lại: làm sao biết ai đang gian lận khi mọi gói tin họ gửi đều hợp lệ.
