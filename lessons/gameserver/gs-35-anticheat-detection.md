# Bài 35 — Phát hiện gian lận & vận hành

## 1. Mục tiêu

Sau bài này bạn có thể:

- Tính bằng **định lý Bayes** tỉ lệ người bị đánh dấu thật sự gian lận, và chỉ ra vì sao "độ chính xác 99%" cho ra kết quả thảm hoạ khi lớp cần tìm cực hiếm.
- Nói ra **độ đặc hiệu tối thiểu** mà một hệ thống ban tự động phải đạt, và vì sao con số đó không xây được bằng thống kê hành vi.
- Kể tên năm tín hiệu thống kê server nhìn thấy được, và với mỗi tín hiệu, **chỉ ra kiểu người chơi thật nào bị nó bắt oan**.
- Tính chi phí CPU và chi phí lưu trữ của **replay verification** ở quy mô 180.000 trận/ngày, và nói được nó bắt được nhóm cheat nào, bỏ sót nhóm nào.
- Trình bày anti-cheat phía client như một **bài toán chi phí tấn công**, kèm cái giá phải trả bằng quyền riêng tư và tương thích.
- Thiết kế **thang bậc xử lý** (đánh dấu → shadow pool → xem lại thủ công → ban theo đợt) và giải thích bằng số vì sao mỗi nấc tồn tại.
- Chọn bộ metric mà trong đó có đúng một chỉ số đo được false positive **thật**.

---

## 2. Triệu chứng

Game của bài 31: đỉnh **10.000 CCU**, trận **10 người / 8 phút**, **180.000 trận mỗi ngày**. Quy ra người: 1.800.000 lượt tham gia, mỗi người chơi trung bình 10 trận, tức khoảng **180.000 người chơi hoạt động mỗi ngày**.

Đội bạn dựng một bộ phát hiện aimbot bằng thống kê hành vi, đo trên tập đã gán nhãn (2.000 tài khoản đã bị ban thủ công có bằng chứng, 2.000 tài khoản của streamer và nhân viên):

```
bắt đúng cheat  : 99 trên 100   → độ nhạy (sensitivity) 99%
không đánh dấu nhầm người sạch : 99 trên 100 → độ đặc hiệu (specificity) 99%
```

Hai con số 99%. Report được duyệt, bật auto-ban. Tỉ lệ gian lận trong dân số ước lượng **1%**, lấy từ các đợt ban thủ công trước.

Sau **7 ngày**: hệ thống ban **24.948 tài khoản**. Kênh khiếu nại nhận hàng nghìn đơn. Support lấy mẫu 200 đơn xem lại thủ công và thấy **phần lớn không có dấu hiệu gian lận nào** — trong đó có ba streamer đứng top bảng xếp hạng.

Không có bug. Bộ phát hiện chạy đúng như lúc đo. **Cả hai con số 99% đều thật.**

---

## ⏸ Dừng lại — đoán trước #1

Chọn một đáp án trước khi đọc tiếp.

**Trong số tài khoản bị hệ thống này ban, bao nhiêu phần trăm thật sự gian lận?**

```
(a) ~99% — hai con số đều 99% thì kết quả cũng quanh đó
(b) ~90% — mất chút vì sai số cộng dồn
(c) ~50% — một nửa số người bị ban là vô tội
(d) ~10% — gần như toàn bộ là oan
```

---

## 3. Lý thuyết

### 3.1 Đây là bài toán thống kê, không phải bài toán game

Đáp án là **(c)**, và không cần dữ liệu gì thêm ngoài ba con số đã có.

Chia 180.000 người chơi trong một ngày làm hai nhóm rồi cho bộ phát hiện chạy qua từng nhóm:

```
gian lận   : 180.000 × 1%  =   1.800 người → bắt được 99% =  1.782  (đúng)
sạch       : 180.000 × 99% = 178.200 người → nhầm     1% =  1.782  (oan)
                                            tổng đánh dấu = 3.564
```

<svg viewBox="0 0 700 250" role="img" aria-labelledby="gs35-a-t gs35-a-d" style="width:100%;height:auto">
<title id="gs35-a-t">Vì sao 99% + 99% cho ra 50%</title>
<desc id="gs35-a-d">180.000 người chơi chia thành 1.800 gian lận và 178.200 sạch; bộ phát hiện 99/99 đánh dấu 1.782 người từ mỗi nhóm, nên nửa số bị đánh dấu là oan.</desc>
<rect x="10" y="20" width="150" height="34" rx="8" fill="#64748b" fill-opacity="0.25"/>
<text x="85" y="42" text-anchor="middle" font-size="12" fill="currentColor">180.000 người/ngày</text>
<rect x="10" y="90" width="150" height="30" rx="8" fill="#ef4444" fill-opacity="0.3"/>
<text x="85" y="110" text-anchor="middle" font-size="11" fill="currentColor">1.800 gian lận (1%)</text>
<rect x="10" y="150" width="150" height="30" rx="8" fill="#84cc16" fill-opacity="0.3"/>
<text x="85" y="170" text-anchor="middle" font-size="11" fill="currentColor">178.200 sạch (99%)</text>
<line x1="85" y1="54" x2="85" y2="90" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<line x1="85" y1="120" x2="85" y2="150" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<line x1="160" y1="105" x2="250" y2="105" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<line x1="160" y1="165" x2="250" y2="165" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<text x="205" y="99" text-anchor="middle" font-size="10" fill="currentColor">× 99%</text>
<text x="205" y="159" text-anchor="middle" font-size="10" fill="currentColor">× 1%</text>
<rect x="250" y="88" width="160" height="34" rx="8" fill="#ef4444" fill-opacity="0.35"/>
<text x="330" y="110" text-anchor="middle" font-size="12" fill="currentColor">1.782 bắt đúng</text>
<rect x="250" y="148" width="160" height="34" rx="8" fill="#f59e0b" fill-opacity="0.4"/>
<text x="330" y="170" text-anchor="middle" font-size="12" fill="currentColor">1.782 bắt oan</text>
<line x1="410" y1="105" x2="470" y2="130" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<line x1="410" y1="165" x2="470" y2="140" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<rect x="470" y="106" width="215" height="58" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="577" y="130" text-anchor="middle" font-size="13" fill="currentColor">3.564 bị ban</text>
<text x="577" y="150" text-anchor="middle" font-size="13" fill="currentColor">đúng 50,00% là oan</text>
<text x="350" y="225" text-anchor="middle" font-size="11" fill="currentColor">1% của một nhóm lớn gấp 99 lần thì bằng 99% của nhóm nhỏ. Đó là toàn bộ cơ chế.</text>
</svg>

`1.782 / 3.564` = **50,00%**. Một nửa số tài khoản bị ban không gian lận. Trong 7 ngày: `3.564 × 7` = **24.948** ban, trong đó `1.782 × 7` = **12.474 người oan**.

Cơ chế: độ đặc hiệu tính trên mẫu số khổng lồ (178.200), độ nhạy tính trên mẫu số bé xíu (1.800). Hai con số cùng là "99%" nhưng không cùng đơn vị nghiệp vụ.

Đại lượng bạn cần không phải độ nhạy hay độ đặc hiệu mà là **giá trị dự đoán dương** (PPV) — xác suất một người bị đánh dấu là gian lận thật:

```
PPV = (nhạy × p) / (nhạy × p + (1 − đặc hiệu) × (1 − p))
```

với `p` là tỉ lệ gian lận trong dân số. Đây là định lý Bayes viết gọn. Nó phụ thuộc `p` — thứ **không nằm trong bộ phát hiện** và không xuất hiện trong bất kỳ report benchmark nào.

Bảng dưới cố định bộ phát hiện ở **độ nhạy 95% / độ đặc hiệu 99%** — một bộ thực tế hơn cái vừa rồi — và chỉ đổi `p`:

| Tỉ lệ gian lận `p` | Bị đánh dấu / 180.000 | Trong đó đúng | Trong đó oan | **PPV** |
|---|---|---|---|---|
| 0,1% | 1.969 | 171 | 1.798 | **8,68%** |
| 1% | 3.492 | 1.710 | 1.782 | **48,97%** |
| 5% | 10.260 | 8.550 | 1.710 | **83,33%** |

Cùng một bộ phát hiện, không đổi một dòng code, PPV chạy từ **8,68%** tới **83,33%** chỉ vì dân số khác nhau. Ở game sạch (0,1%), **hơn 91% số ban là oan** — nghịch lý cay đắng: **game càng sạch, hệ thống chống gian lận càng gây hại**.

Cột "trong đó oan" gần như đứng yên (1.710–1.798) ở cả ba dòng, vì `(1 − đặc hiệu) × (1 − p)` gần như không đổi khi `p` nhỏ: số người oan mỗi ngày **do độ đặc hiệu quyết định, không do có bao nhiêu cheater**.

### 3.2 Độ đặc hiệu cần bao nhiêu để ban tự động?

Hỏi ngược: giữ độ nhạy 95%, `p` = 1%, muốn PPV = 99% thì tỉ lệ dương giả phải là bao nhiêu?

```
0,99 = (0,95 × 0,01) / (0,95 × 0,01 + FPR × 0,99)
→ FPR = (0,95 × 0,01 × 0,01) / (0,99 × 0,99) = 9,693e-5
→ độ đặc hiệu = 99,99031%   ≈ 1 lần nhầm trên 10.317 người sạch
```

Từ **99%** lên **99,9903%** là giảm tỉ lệ nhầm `0,01 / 9,693e-5` = **103,2 lần**. Không tín hiệu hành vi nào làm được, vì lý do đơn giản: **phân phối của người chơi giỏi và của bot chồng lấn nhau thật**, không phải do bạn đo kém — mục 3.3 chỉ ra chỗ chồng lấn đó.

Kết luận vận hành, và nó cứng: **không ban tự động dựa trên thống kê hành vi.** Đầu ra của bộ phát hiện là *một ưu tiên trong hàng đợi*, không phải một bản án. Mục 3.6 xây phần còn lại quanh sự thật đó.

---

## ⏸ Dừng lại — đoán trước #2

**Bộ phát hiện dựa vào "thời gian phản ứng quá ổn định" sẽ bắt nhầm nhiều nhất ở nhóm người chơi nào?**

```
(a) Người mới — thao tác lộn xộn nên số đo nhiễu
(b) Người chơi trung bình — đông nhất nên số ca nhầm tuyệt đối lớn nhất
(c) Người chơi rất giỏi — nhanh hơn và ổn định hơn, tức là giống bot hơn
(d) Người ping cao — mạng làm méo mọi số đo
```

---

### 3.3 Năm tín hiệu server nhìn thấy được

Bài 34 kết luận nhóm 2 (aimbot, triggerbot) chỉ gửi input **hợp lệ** nên không luật nào chặn được. Còn lại một đường: không xét từng input, mà xét **phân phối của nhiều input**. Một cú bắn hoàn hảo là may mắn; một nghìn cú bắn hoàn hảo là một phân phối, và phân phối thì có hình dạng.

| Tín hiệu | Bắt được gì | Người thật giỏi giống bot ở chỗ nào |
|---|---|---|
| Phân phối thời gian phản ứng | Bot có phương sai gần bằng 0; người có đuôi phải dài | Pro nhanh hơn **và** đều hơn — chính là hướng mà bộ phát hiện coi là đáng ngờ |
| Độ chính xác theo khoảng cách | Aimbot phẳng theo cự ly; người tụt mạnh khi xa | Người dùng súng ngắm có đường phẳng một cách tự nhiên |
| Tốc độ xoay góc nhìn | Snap tức thì trong một tick, không có đường cong gia tốc | Flick của pro rất nhanh; mất gói làm nhiều mẫu gộp thành một |
| Tỉ lệ headshot | Aimbot khoá một điểm ngắm cố định | Meta vũ khí đổi thì cả server cùng tăng headshot; nhân vật cao thấp khác nhau |
| Trễ giữa "thấy mục tiêu" và "bắn" | Triggerbot bắn ở đúng tick mục tiêu vào tâm ngắm | Người đã ngắm sẵn góc chờ (pre-aim) cũng ra số đo như vậy |

Hai tín hiệu định lượng được ngay bằng số của course.

**Tốc độ xoay.** Cú flick người thật xoay 180° trong ~150 ms → `180 / 0,150` = **1.200 °/s**. Aimbot snap trong đúng một tick 16,67 ms → `180 / 0,01667` = **10.800 °/s**, gấp **9,0 lần**. Ngưỡng nghe rất rõ ràng — cho tới khi tính đường truyền: input lấy mẫu theo tick (bài 17), nên ở 60 Hz cú flick người thật là **20 °/tick**; client lấy mẫu 30 Hz thì cũng cú đó thành **40 °/mẫu**; mất 3 gói liên tiếp thì server nhận một mẫu gộp **80°**. Ngưỡng phải đặt trên `80 °/mẫu` để tránh oan hàng loạt — **rất gần vùng 180 °/tick của bot**. Chồng lấn này do *hệ thống truyền* tạo ra, không do người chơi.

**Thời gian phản ứng.** Mô phỏng đồ chơi 200.000 mẫu mỗi nhóm: người chơi lognormal quanh 230 ms, pro lognormal quanh 170 ms, bot chuẩn 95 ms ± 18 ms. *(Mô hình minh hoạ để thấy hình dạng phân phối — không phải số đo từ game thật.)*

| Nhóm | p50 | p95 | p99 | Hệ số biến thiên (sd/mean) |
|---|---|---|---|---|
| Người chơi thường | 230 ms | 409 ms | 520 ms | **0,360** |
| Người chơi rất giỏi | 170 ms | 269 ms | 325 ms | **0,285** |
| Bot | 95 ms | 125 ms | 137 ms | **0,189** |

Đuôi phải là dấu vân tay của con người: p99 của người thường **gấp 2,26 lần** p50 (`520 / 230`), của bot chỉ **1,44 lần** (`137 / 95`). Nhưng chú ý pro nằm ở đâu: **giữa**. Cho bộ phát hiện chạy trên hệ số biến thiên đo qua `N` lần giao tranh, ngưỡng `CV < 0,24`:

| Số giao tranh `N` | Bắt được bot | Nhầm người thường | **Nhầm pro** |
|---|---|---|---|
| 30 | 98,2% | 1,23% | **18,29%** |
| 100 | 100% | 0,00% | **2,48%** |
| 300 | 100% | 0,00% | **0,01%** |

Đáp án hộp #2 là **(c)**, và bảng cho thấy nó tệ tới mức nào: ở `N` = 30, cứ **5 người chơi giỏi thì gần 1 người bị đánh dấu** — trong khi người chơi thường chỉ 1,23%. Bộ phát hiện của bạn là **bộ phát hiện kỹ năng cao** đội lốt bộ phát hiện gian lận, và nó bắn thẳng vào nhóm người chơi mà bạn ít muốn mất nhất. Ba streamer ở mục 2 không phải tai nạn; họ là **đầu ra thiết kế** của tín hiệu này.

Cột cuối cũng cho đòn bẩy rẻ nhất trong cả bài: **chờ thêm dữ liệu**. Từ `N` = 30 lên `N` = 300, tỉ lệ nhầm pro giảm `18,29 / 0,01` = **1.829 lần**, không đổi một dòng thuật toán. Với ~25 lần giao tranh mỗi trận *(ước lượng, thay bằng số đo của game bạn)*, `N` = 300 là **12 trận** = `12 × 8` = **96 phút chơi**. Cái giá của việc chắc chắn là một tiếng rưỡi trễ, và bạn sẽ thấy ở mục 3.6 rằng trễ **không phải cái giá** — nó là tính năng.

### 3.4 Replay verification: chính xác tuyệt đối, nhưng chỉ với nhóm 1

Thống kê cho xác suất. Còn một thứ cho **câu trả lời đúng/sai không có xác suất**: chạy lại trận trên server sạch. Bài 9 đã dựng đủ điều kiện — determinism mức B, trận lưu dưới dạng seed + state đầu + chuỗi input, **2,30 MB** thô (`28.800 tick × 10 người × 8 B` = 2.304.000 B, đúng bằng con số bài 9 cho cấu hình 8 người × 10 phút).

Chi phí CPU, lấy `sim.Step` 1.000 entity = **1,18 µs** của bài 8:

```
1 trận : 28.800 tick × 1,18 µs = 33,98 ms CPU   (nhanh hơn thời gian thực 14.124 lần)
1 ngày : 180.000 × 33,98 ms    = 6.117 s        = 1,70 giờ CPU
số core: 6.117 / 86.400        = 0,0708 core
```

**Chạy lại 100% số trận của một game 10.000 CCU tốn 0,07 core.** Nhân 5 lần cho giải mã input, kiểm bất biến và ghi kết quả *(bậc độ lớn, không phải hằng số)* thì vẫn là **0,354 core**. Chạy 1% thì con số nhỏ tới mức không đáng viết ra. **CPU không phải ràng buộc**, và bất kỳ ai nói "replay toàn bộ thì đắt quá" đang nói về một hoá đơn khác.

Hoá đơn thật là lưu trữ:

| Định dạng | 1 trận | Mỗi ngày | Giữ 30 ngày | ~Chi phí S3 Standard/tháng |
|---|---|---|---|---|
| Input thô | 2,30 MB | **414,7 GB** | 12,44 TB | ~286 USD |
| Mã hoá theo thay đổi | 230 KB | **41,4 GB** | 1,24 TB | ~29 USD |

*(0,023 USD/GB-tháng, giá niêm yết us-east-1 tại thời điểm viết; chưa tính request và lifecycle.)*

Ở quy mô này thì **giữ hết cũng được** — 286 USD/tháng rẻ hơn một kỹ sư nửa ngày. Bài 9 nói nút thắt là lưu trữ vì nó tính ở 1 triệu trận/ngày; ở 180.000 trận/ngày nút thắt biến mất. **Ngưỡng "replay 100%" nằm ở đâu là một phép chia, không phải một nguyên tắc.**

Vậy tại sao replay không kết thúc bài toán? Vì nó chỉ trả lời đúng **một** câu hỏi: *chạy lại chuỗi input này trên binary sạch có ra đúng kết quả đã báo cáo không?* Nó bắt tuyệt đối: state client báo lên khác state suy ra từ input (nhóm 1 của bài 34); node bị can thiệp hoặc binary lệch phiên bản; replay attack và input không khớp tick.

Nó **không bắt được aimbot**, lý do gói trong một câu: **input của aimbot hợp lệ, nên chạy lại cho ra đúng kết quả đó.** Replay verification kiểm tra tính toàn vẹn của mô phỏng, không kiểm tra ý định của con người. Nhóm 2 vẫn thuộc về thống kê ở 3.3, và thống kê thì bị Bayes ở 3.1 chặn.

### 3.5 Anti-cheat phía client: mua thời gian, không mua sự thật

Đường còn lại là nhìn vào máy người chơi: quét tiến trình, kiểm chữ ký bộ nhớ, phát hiện debugger, dựng driver kernel để thấy trước cả cheat chạy ở ring 0.

Có một sự thật không thương lượng được: **phần mềm đó chạy trên máy của kẻ tấn công** — toàn quyền phần cứng, thời gian không giới hạn, thử lại vô hạn lần mà bạn không biết. Về nguyên tắc nó **luôn** bị đánh bại, và cấp cuối là cheat chạy trên một máy thứ hai đọc tín hiệu HDMI, điều khiển bằng chuột giả lập USB: **không một byte nào chạy trên máy bị giám sát**.

Giá trị thật không phải "chặn" mà là **tăng chi phí tấn công**: từ một script Lua tải free trên forum lên thành driver ký số phải vá lại sau mỗi bản cập nhật. Nhóm cheat công khai teo lại, giá cheat riêng tăng. Kết quả có thật và đáng tiền — nhưng nó là **kinh tế học, không phải bảo mật**, và cái giá rất cụ thể:

| Cái giá | Nội dung |
|---|---|
| Kernel driver | Một lỗi trong driver của bạn là một lỗ hổng leo thang đặc quyền trên máy **mọi** người chơi. Đã có tiền lệ cheat lợi dụng chính driver anti-cheat. |
| Quyền riêng tư | Quét tiến trình toàn hệ thống là thu thập dữ liệu ngoài phạm vi game. Có nơi vướng quy định pháp lý, và luôn vướng dư luận. |
| Tương thích | Kernel driver gắn với hệ điều hành và phiên bản: Linux/Proton, máy ảo, Windows Insider, phần mềm bảo mật doanh nghiệp. Mỗi cái là một dòng "không chạy được". |
| Phản ứng người dùng | Một nhóm người chơi sẽ không cài, và họ thường là nhóm nói to nhất. |
| Vận hành | Bạn phải phát hành bản vá theo nhịp của đối thủ, mãi mãi. Không có trạng thái "xong". |

Nói thẳng với đội sản phẩm: anti-cheat client **không cho bạn thêm sự thật nào** để quyết định ban. Nó cho bạn thêm tín hiệu (một tiến trình đáng ngờ) — mà tín hiệu thì lại quay về Bayes ở 3.1. Nó mua thời gian. Ba mục trước quyết định bạn dùng thời gian đó vào việc gì.

---

## ⏸ Dừng lại — đoán trước #3

Bạn đã xem lại thủ công và **chắc chắn** 1.642 tài khoản này gian lận. Bạn có thể ban ngay, hoặc gom lại ban một lượt sau 14 ngày.

**Vì sao ban theo đợt lại tốt hơn, dù nó để cheater chơi tiếp 14 ngày?**

```
(a) Gom lại thì rẻ hơn — một job thay vì nghìn lần gọi API
(b) Ban một lượt tạo tin tức, có tác dụng răn đe
(c) Nó phá vòng lặp thử–sai của người viết cheat: họ không còn biết
    hành vi nào đã làm lộ mình
(d) Để có thời gian nhận kháng cáo trước khi ban
```

---

### 3.6 Thang bậc: nâng prior trước khi phán

Bayes nói PPV phụ thuộc `p`. Vậy có đúng một đường thoát: **đừng chạy bộ lọc tinh trên dân số chung — chạy nó trên một dân số đã được lọc thô, nơi `p` đã cao.**

<svg viewBox="0 0 700 240" role="img" aria-labelledby="gs35-b-t gs35-b-d" style="width:100%;height:auto">
<title id="gs35-b-t">Thang bậc bốn nấc và tỉ lệ gian lận ở mỗi nấc</title>
<desc id="gs35-b-d">Bốn nấc xử lý: đánh dấu 3.492 người với PPV 48,97 phần trăm, shadow pool nâng prior, bộ phát hiện thứ hai còn 1.642 người với PPV 98,91 phần trăm, xem lại thủ công, rồi ban theo đợt 14 ngày.</desc>
<rect x="8" y="40" width="150" height="60" rx="8" fill="#f59e0b" fill-opacity="0.3"/>
<text x="83" y="62" text-anchor="middle" font-size="12" fill="currentColor">1. Đánh dấu</text>
<text x="83" y="80" text-anchor="middle" font-size="11" fill="currentColor">3.492/ngày</text>
<text x="83" y="95" text-anchor="middle" font-size="11" fill="currentColor">PPV 48,97%</text>
<rect x="183" y="40" width="150" height="60" rx="8" fill="#8b5cf6" fill-opacity="0.3"/>
<text x="258" y="62" text-anchor="middle" font-size="12" fill="currentColor">2. Shadow pool</text>
<text x="258" y="80" text-anchor="middle" font-size="11" fill="currentColor">ghép trận riêng</text>
<text x="258" y="95" text-anchor="middle" font-size="11" fill="currentColor">thu thêm dữ liệu</text>
<rect x="358" y="40" width="150" height="60" rx="8" fill="#3b82f6" fill-opacity="0.3"/>
<text x="433" y="62" text-anchor="middle" font-size="12" fill="currentColor">3. Xem lại tay</text>
<text x="433" y="80" text-anchor="middle" font-size="11" fill="currentColor">1.642/ngày</text>
<text x="433" y="95" text-anchor="middle" font-size="11" fill="currentColor">PPV 98,91%</text>
<rect x="533" y="40" width="159" height="60" rx="8" fill="#ef4444" fill-opacity="0.3"/>
<text x="612" y="62" text-anchor="middle" font-size="12" fill="currentColor">4. Ban theo đợt</text>
<text x="612" y="80" text-anchor="middle" font-size="11" fill="currentColor">mỗi 14 ngày</text>
<text x="612" y="95" text-anchor="middle" font-size="11" fill="currentColor">gom 22.988</text>
<line x1="158" y1="70" x2="183" y2="70" stroke="currentColor" stroke-opacity="0.6" stroke-width="2"/>
<line x1="333" y1="70" x2="358" y2="70" stroke="currentColor" stroke-opacity="0.6" stroke-width="2"/>
<line x1="508" y1="70" x2="533" y2="70" stroke="currentColor" stroke-opacity="0.6" stroke-width="2"/>
<text x="350" y="140" text-anchor="middle" font-size="11" fill="currentColor">prior đi vào nấc 3 là 48,97% chứ không phải 1% — cùng bộ phát hiện, PPV nhảy từ 48,97% lên 98,91%</text>
<rect x="8" y="160" width="684" height="48" rx="8" fill="#64748b" fill-opacity="0.18"/>
<text x="350" y="180" text-anchor="middle" font-size="11" fill="currentColor">Không nấc nào tự nó đủ chính xác. Cái làm ra độ chính xác là THỨ TỰ: mỗi nấc nâng prior cho nấc sau.</text>
<text x="350" y="198" text-anchor="middle" font-size="11" fill="currentColor">Trễ từ đánh dấu tới ban: tới 14 ngày — và đó là lựa chọn, không phải chậm trễ.</text>
</svg>

**Nấc 1 — đánh dấu.** Bộ phát hiện thô 95/99 chạy trên toàn dân số, ra **3.492 người/ngày**, PPV **48,97%**. Không ai bị làm gì cả. Đây chỉ là hàng đợi.

**Nấc 2 — shadow pool.** Người bị đánh dấu được ưu tiên ghép trận với nhau. Ba tác dụng, và cái thứ ba mới là chính: người sạch bớt gặp cheater (hiệu quả tức thì mà không cần chắc chắn về ai cả); cheater gặp cheater nên trải nghiệm tự nó xấu đi; và **bạn có thêm thời gian, thêm mẫu** — đúng cột `N` = 300 của bảng 3.3.

Mấu chốt: nó **không phải hình phạt**, nên bắt oan ở đây chi phí thấp. Một người chơi giỏi vào pool vài trận chỉ thấy đối thủ khó hơn bình thường, hết.

**Nấc 3 — xem lại, với prior đã đổi.** Bây giờ cho một bộ phát hiện thứ hai, độc lập với bộ thứ nhất, cũng chỉ 95/99, chạy **bên trong pool** nơi `p` = 48,97%:

```
PPV = (0,95 × 0,4897) / (0,95 × 0,4897 + 0,01 × 0,5103) = 98,91%
```

Cùng một chất lượng bộ phát hiện, PPV nhảy từ **48,97%** lên **98,91%** chỉ vì prior đổi. Số ca còn lại: `0,95 × 1.710` = 1.624 đúng, `0,01 × 1.782` = 17,8 oan, tổng **1.642/ngày**.

Cảnh báo: phép nhân này **chỉ đúng nếu hai bộ phát hiện độc lập**. Hai bộ cùng đọc thời gian phản ứng thì bộ thứ hai gần như không thêm thông tin gì — nó sẽ đánh dấu lại đúng những pro mà bộ thứ nhất đã đánh dấu. Bộ thứ hai phải nhìn thứ khác: tín hiệu khác, hoặc replay verification ở 3.4, hoặc con người.

Rồi vẫn phải có người xem. Ở 6 phút một ca: 3.492 ca = **349,2 giờ/ngày** = **43,6 người làm 8 tiếng**; sau khi lọc còn 1.642 ca = **164,2 giờ** = **20,5 người**, giảm **2,13 lần**. Nhưng thứ đổi nhiều hơn là chất: người xem ở nấc 3 xác nhận một tập **98,91%** đúng thay vì bới một tập 48,97% đúng — và việc bới một tập nửa đúng nửa sai làm kiệt sức người xem, biến **chính họ** thành nguồn false positive tiếp theo.

**Nấc 4 — ban theo đợt.** Đáp án hộp #3 là **(c)**, và nó tính được.

Ban tức thì biến hệ thống của bạn thành một **oracle**: người viết cheat bật một tính năng, chơi một trận 8 phút, bị ban → tính năng đó lộ; tắt đi, thử cái khác. Chu kỳ thử–sai bằng độ dài một trận, tối đa `1.440 / 8` = **180 chu kỳ mỗi ngày**. Bạn đang chạy CI miễn phí cho đối thủ.

Đợt 14 ngày kéo độ trễ phản hồi lên `14 × 1.440` = **20.160 phút** — chậm hơn **2.520 lần** so với một trận, và chu kỳ thử của đối thủ rơi xuống `365 / 14` = **26,1 lần mỗi năm**. Tệ hơn cho họ: mọi tài khoản dùng để thử trong cửa sổ bị ban **cùng lúc**, nên họ mất `n` tài khoản để đổi lấy **một** bit ("có cái gì đó trong 14 ngày qua đã lộ") thay vì một tài khoản cho một bit rõ ràng.

Tác dụng phụ đắt giá, phải nói ra: **cheater vẫn chơi trong 14 ngày đó** và người sạch vẫn gặp họ. Nấc 2 tồn tại chính để bù chỗ này — shadow pool phòng thủ ngay, còn ban thì đợi. Bỏ nấc 2 thì ban theo đợt chỉ là 14 ngày không làm gì, và lúc đó (b) còn lại đúng phần quan hệ công chúng.

---

## 4. Đo cái gì

Bộ metric dưới xếp theo thứ tự nó phát hiện ra sự cố:

| Chỉ số | Ý nghĩa | Nó cảnh báo cái gì |
|---|---|---|
| Tỉ lệ đánh dấu (% dân số/ngày) | 3.492 / 180.000 = **1,94%** | Nhảy vọt = cheat mới lan, hoặc bạn vừa đổi ngưỡng và tự bắn vào chân |
| Tỉ lệ qua nấc 3 (1.642 / 3.492) | **47,02%** | Tụt = bộ phát hiện 1 đang ồn; tăng vọt = bộ 2 mất tính độc lập |
| Tỉ lệ người xem xác nhận | Nên xấp xỉ PPV nấc 3 (**98,91%**) | Lệch nhiều = mô hình sai, hoặc người xem đang đóng dấu cho có |
| **Tỉ lệ kháng cáo thắng** | Ước lượng false positive **thật** | Chỉ số duy nhất đến từ ngoài hệ thống |
| Trễ từ đánh dấu tới ban | Mục tiêu ≤ 14 ngày | Trôi lên = hàng đợi xem lại đang tắc |
| Tỉ lệ tái phạm sau ban | Cùng người quay lại tài khoản mới | Cao = ban không tăng chi phí đủ (3.5) |

Vì sao **kháng cáo thắng** là chỉ số duy nhất đo được false positive thật: bốn chỉ số trên nó đều do chính hệ thống sinh ra và tự khẳng định. Nếu mô hình sai, "tỉ lệ người xem xác nhận" cao chỉ chứng minh người xem đồng ý với mô hình sai. Kháng cáo là tín hiệu duy nhất đến từ **ngoài** vòng lặp — và có giá: bạn phải mở đường kháng cáo và phải trả lời thật.

Đọc nó cũng cần cẩn thận. Ban 1.642/ngày, 8% kháng cáo, 60% thắng → `1.642 × 0,08 × 0,60` = **78,8 người/ngày** được gỡ = **4,80%** số ban. Nhưng PPV nấc 3 dự đoán chỉ `100% − 98,91%` = **1,09%**, tức 17,8 người. Lệch như vậy có ba khả năng và bạn phải phân biệt được: mô hình lạc quan quá, người xem ở nấc 3 sai, hoặc quy trình kháng cáo đang gỡ cả người có tội. **Chỉ số này chặn dưới, không chặn trên** — người bị oan mà không kháng cáo thì không xuất hiện ở đâu cả.

---

## 5. Tính tay

1. Game của bạn thật ra sạch hơn ước lượng: `p` = 0,3%, không phải 1%. Giữ bộ phát hiện 95/99 và 180.000 người/ngày. Tính số người bị đánh dấu, PPV, và số người oan mỗi ngày. So với dòng `p` = 1% ở bảng 3.1, số người oan đổi bao nhiêu phần trăm?

2. Đội đề xuất: bỏ nấc 3, thay bằng chuỗi **ba** bộ phát hiện độc lập, mỗi bộ 95/99, ai qua cả ba thì ban tự động. Bắt đầu từ `p` = 1%, tính PPV sau bộ thứ hai và sau bộ thứ ba. Nó có đạt ngưỡng 99,9903% của mục 3.2 không — và tính luôn độ nhạy tổng của chuỗi (`0,95³`) để nói xem bạn đã đánh đổi cái gì.

3. Bạn muốn replay 100% số trận **và** giữ 90 ngày để phục vụ kháng cáo. Với 180.000 trận/ngày, tính dung lượng cần cho định dạng thô và định dạng mã hoá theo thay đổi, rồi tính số core CPU nếu mỗi trận được chạy lại **hai** lần (một lần lúc kết thúc, một lần khi có kháng cáo, giả sử 8% số trận bị kháng cáo).

---

## 6. Chuyển giao

Bạn làm live-ops cho một game đấu trường 4v4, đã chạy 2 năm, ~40.000 người chơi hoạt động/ngày.

1. Bộ phát hiện hiện tại có PPV 48,97% ở `p` = 1%. Marketing muốn công bố "chúng tôi ban 3.000 tài khoản tháng này". Con số nào bạn phải kèm theo để câu đó không phải là nói dối?
2. Giải đấu có tiền thưởng dùng chung bộ phát hiện với chế độ thường. Nấc nào của thang bậc phải đổi, và vì sao ngưỡng ở giải đấu phải **khác hướng** với trực giác thông thường?
3. Một tuyển thủ ở nấc 3 bị đánh dấu, xem lại thủ công thấy đáng ngờ nhưng không kết luận được. Replay verification ở 3.4 giúp gì được cho ca này, và không giúp gì?
4. Đội đề xuất hiển thị cho người chơi biết họ đang trong shadow pool để "minh bạch". Điều đó phá cái gì?
5. Một cheat mới lan trong 48 giờ và tỉ lệ đánh dấu nhảy từ 1,94% lên 9%. Bảng 3.1 nói PPV của bạn vừa đổi theo hướng nào, và chính sách ban theo đợt 14 ngày còn giữ được không?
6. Một người chơi sạch bị bạn bè báo cáo hàng loạt vì chơi giỏi. Hệ thống báo cáo của người chơi là một "bộ phát hiện" nữa — ước lượng độ nhạy và độ đặc hiệu của nó, rồi nói xem nó nên nằm ở nấc nào và tuyệt đối **không** được nằm ở nấc nào.
7. **Câu khó nhất.** Bạn nâng độ đặc hiệu từ 99% lên 99,9%, và số người oan mỗi ngày giảm từ 1.782 xuống 178,2 — giảm 90,0%. Nhưng cùng thay đổi đó kéo độ nhạy từ 95% xuống 60%, nên số cheater lọt lưới tăng từ 90 lên 720 mỗi ngày. Với 180.000 người chơi/ngày và trận 10 người, hãy tính **số trận mỗi ngày có ít nhất một cheater lọt lưới** ở cả hai cấu hình, rồi trả lời câu thật sự khó: một người chơi sạch bị ban oan và một người chơi sạch gặp cheater — hai thiệt hại đó có quy về cùng đơn vị được không, và nếu **không**, thì bạn dựa vào cái gì để chọn ngưỡng?

---

## 7. Tóm tắt

- Với `p` = 1% và bộ phát hiện **99% / 99%**, PPV là **đúng 50,00%**: 1.782 bắt đúng, 1.782 bắt oan mỗi ngày. Bảy ngày auto-ban = **12.474 người vô tội**.
- Cùng bộ 95/99, PPV chạy từ **8,68%** (`p` = 0,1%) qua **48,97%** (1%) tới **83,33%** (5%). **Game càng sạch, ban tự động càng gây hại.** Số người oan (1.710–1.798 ở cả ba dòng) do **độ đặc hiệu** quyết định, gần như không phụ thuộc số cheater.
- Ban tự động ở PPV 99% đòi độ đặc hiệu **99,9903%** — 1 nhầm trên **10.317** người sạch, giảm tỉ lệ nhầm **103,2 lần**. Không tín hiệu hành vi nào đạt được. **Đầu ra của bộ phát hiện là ưu tiên trong hàng đợi, không phải bản án.**
- Đuôi phải là dấu vân tay của con người: p99/p50 của người thường **2,26**, của bot **1,44**. Nhưng pro nằm ở giữa — ở `N` = 30 giao tranh, nhầm **18,29%** số pro so với **1,23%** người thường. Đó là **bộ phát hiện kỹ năng cao** đội lốt.
- Đòn bẩy rẻ nhất là **chờ thêm mẫu**: `N` = 30 → 300 cắt tỉ lệ nhầm pro **1.829 lần**, không đổi thuật toán. Giá: 12 trận = 96 phút.
- Ngưỡng tốc độ xoay phải nới tới **80 °/mẫu** (mất 3 gói ở 60 Hz gộp một cú flick thật thành mẫu đó), trong khi bot snap ở 180 °/tick. Chồng lấn do **hệ thống truyền** tạo ra, không do người chơi.
- Replay 100% số trận ở 180.000 trận/ngày tốn **0,0708 core** (×5 overhead vẫn 0,354) — **CPU không phải ràng buộc**. Lưu trữ **414,7 GB/ngày** thô hoặc **41,4 GB** mã hoá theo thay đổi, ~286 hoặc ~29 USD/tháng khi giữ 30 ngày.
- Replay bắt **tuyệt đối** nhóm 1 và mọi lệch phiên bản, nhưng **không bắt được aimbot**: input hợp lệ nên chạy lại ra đúng kết quả đó.
- Anti-cheat client chạy trên máy kẻ tấn công nên **về nguyên tắc luôn bị đánh bại**. Giá trị thật là **tăng chi phí tấn công**; giá phải trả là kernel driver, quyền riêng tư, tương thích, và một vòng vá không có điểm kết thúc.
- Đường thoát duy nhất khỏi Bayes là **nâng prior trước khi phán**: bộ phát hiện thứ hai cũng chỉ 95/99, chạy trong pool `p` = 48,97%, cho PPV **98,91%** — với điều kiện nó **độc lập** với bộ thứ nhất. Khối lượng xem lại giảm từ **43,6 xuống 20,5 người** (2,13 lần), và quan trọng hơn là xác nhận một tập 98,91% đúng thay vì bới một tập nửa đúng.
- **Ban tức thì là một oracle miễn phí cho người viết cheat**: chu kỳ thử–sai bằng một trận, tối đa 180 lần/ngày. Đợt 14 ngày kéo lên 20.160 phút — chậm **2.520 lần**, còn **26,1** chu kỳ/năm, và mọi tài khoản thử trong cửa sổ chết cùng lúc để đổi lấy một bit.
- **Tỉ lệ kháng cáo thắng là chỉ số duy nhất đo false positive thật**, vì mọi chỉ số khác do chính hệ thống tự khẳng định. Nó **chặn dưới**: người oan không kháng cáo thì không xuất hiện ở đâu cả.

→ **Chương 9 — Hiệu năng & vận hành.** Tám chương vừa rồi dựng một hệ thống đúng. Bài 36 hỏi câu cuối cùng của nghề: làm sao biết nó đang chạy tốt, và đo cái gì thì biết được.
