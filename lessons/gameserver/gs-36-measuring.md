# Bài 36 — Đo cái gì và đo thế nào

## 1. Mục tiêu

Sau bài này bạn có thể:

- Dựng hai hệ **cùng trung bình, cùng p50/p95/p99** mà một cái chơi được và một cái không, rồi chỉ ra đúng chỉ số tách được chúng.
- Nói được **percentile nào bắt được đuôi nào**, và vì sao p99 với đuôi 1% là con số không đáng tin.
- Phân biệt **p99 theo tick** và **p99 theo người chơi**, chứng minh bằng số rằng cùng một p99 gộp có thể là hai thế giới khác hẳn nhau.
- Liệt kê **bộ metric bắt buộc** theo ba nhóm, mỗi metric kèm chỗ đo, ngưỡng khởi điểm và thứ nó báo hiệu.
- Ghi metric trong hot loop với chi phí **1,5 ns** thay vì 72 ns, và biết chỗ nào chi phí đó bắt đầu ăn vào ngân sách tick.
- Chọn đúng loại pprof cho từng câu hỏi, và nói được profile nào **làm méo chính thứ nó đang đo** — kèm hệ số méo đã đo.

---

## 2. Triệu chứng

Dashboard của bạn xanh hết. Ba tuần liền.

```
tick time (mean)      4,0 ms  / ngân sách 16,67 ms   [24%]   OK
CPU (node)              31%                                   OK
bytes out / player     9,4 KB/s                                OK
error rate              0,00%                                  OK
```

Kênh hỗ trợ thì không xanh: "giật cục", "khựng một nhịp rồi bình thường", "hình như nó lag đúng lúc đông người". Không ai chụp được màn hình một con số nào, vì thứ họ gặp không phải một con số — nó là **một cái đuôi**.

Hai hệ thống, mô phỏng 5 phút ở 60 Hz — **18.000 tick** mỗi hệ, cùng ngân sách 16,67 ms:

| Hệ | mean | p50 | p95 | p99 | p99,9 | tick vượt hạn |
|---|---|---|---|---|---|---|
| **A** — thời gian tick bám sát 4 ms | **4,00** | 4,00 | 4,97 | 5,39 | 5,92 | **0** |
| **B** — 99,5% tick ở 3,7 ms, 0,5% ở ~64 ms | **4,01** | 3,70 | 4,54 | 5,01 | **68,59** | **94** |

*(Mô phỏng `python3`, seed 36. A = gauss(4,0; 0,6). B = 99,5% gauss(3,7; 0,5) + 0,5% gauss(63,7; 6,0) — hai tham số này chọn để mean của B khớp mean của A.)*

Đọc kỹ ba cột giữa. **p50, p95 và p99 của B đều THẤP HƠN A.** Xếp hạng hai server bằng bất kỳ chỉ số nào trong bốn cột đầu thì B thắng — trên mọi dashboard mặc định, B là server khoẻ hơn. Trong khi 94 tick vượt hạn trong 5 phút là **18,8 lần khựng mỗi phút**, một lần mỗi 3,2 giây, còn A khựng **0** lần.

Bài 8 đã ra quy tắc "luôn nhìn p99, đừng nhìn trung bình". Bảng trên nói quy tắc đó **chưa đủ**: ở đây p99 cũng nói dối, và nói dối theo hướng khiến hệ hỏng trông đẹp hơn hệ lành.

---

## ⏸ Dừng lại — đoán trước #1

**Chỉ số nào dưới đây tách được B khỏi A trong bảng trên?**

```
(a) p99 — chỉ cần đọc đúng cột là ra
(b) p99,9 — vì đuôi của B chỉ chiếm 0,5% số mẫu
(c) độ lệch chuẩn — B phân tán hơn hẳn
(d) số tick vượt ngân sách 16,67 ms — đếm, không phải percentile
```

Có nhiều hơn một đáp án đúng. Câu hỏi thật là: cái nào **luôn** đúng, kể cả khi đuôi mỏng hơn nữa.

---

## 3. Lý thuyết

### 3.1 Percentile là hàm của TỈ LỆ đuôi, không phải của độ đau

(b) và (d) đều tách được B khỏi A trong bảng đó. Nhưng chỉ (d) tách được **mọi** B.

Giữ nguyên hai chế độ (3,7 ms và 63,7 ms), chỉ đổi tỉ lệ `q` số tick rơi vào chế độ chậm:

| `q` (tỉ lệ đuôi) | mean | p95 | p99 | p99,9 | khựng/phút |
|---|---|---|---|---|---|
| **0,1%** | 3,76 | 4,52 | 4,87 | **5,60** | **3,2** |
| **0,5%** | 4,01 | 4,56 | 5,01 | **70,49** | 18,4 |
| 1,0% | 4,30 | 4,57 | **6,03** | 73,15 | 36,0 |
| 3,0% | 5,55 | 4,73 | **66,50** | 74,85 | 110,6 |
| 10,0% | 9,66 | **63,84** | 71,75 | 77,68 | 357,0 |

*(Cùng script, seed 36, 18.000 tick mỗi dòng.)*

Đọc theo đường chéo: **chỗ đỏ chạy từ phải sang trái khi đuôi dày lên.** Đuôi 10% thì p95 bắt được; đuôi 3% cần p99; đuôi 0,5% cần p99,9. Dòng đầu là dòng đáng sợ:

> Đuôi **0,1%** — 3,2 lần khựng mỗi phút, đủ để người chơi bỏ trận — **không có percentile nào trong bảng bắt được.** p99,9 báo 5,60 ms, xanh mướt.

Lý do đơn giản đến mức khó chịu: **percentile p là mẫu đứng ở đúng thứ hạng p.** Nó chỉ nhìn thấy đuôi khi đuôi dày hơn `100 − p` phần trăm. Muốn bắt đuôi 0,1% phải vẽ p99,95; đuôi đó mỏng đi mười lần nữa thì phải vẽ p99,995. Bạn đang chạy đua với một thứ có thể mỏng vô hạn.

Còn tệ hơn: ngay tại ranh giới, **percentile trở nên ngẫu nhiên**. Với đuôi đúng 1%, p99 là mẫu nằm chính xác ở mép giữa hai chế độ, nên nó rơi bên nào là may rủi. Cùng một hệ thống, 10 seed khác nhau:

```
p99 = 5,2 · 5,2 · 5,3 · 5,3 · 5,3 · 5,6 · 46,2 · 53,1 · 53,2 · 55,7  (ms)
```

Sáu lần báo ~5,3 ms (xanh), bốn lần ~52 ms (đỏ), **cùng một hệ, cùng tham số**. Alert đặt ở p99 với ngưỡng 16,67 ms sẽ tự bật tắt theo nhiễu lấy mẫu; bạn sẽ gọi nó là "flaky alert" và tắt đi.

<svg viewBox="0 0 700 330" role="img" aria-labelledby="gs36-a-t gs36-a-d" style="width:100%;height:auto">
<title id="gs36-a-t">Hai phân phối cùng trung bình, một cái vượt ngân sách</title>
<desc id="gs36-a-d">Hệ A là một cụm hẹp quanh 4 ms, nằm hoàn toàn bên trái vạch ngân sách 16,67 ms. Hệ B có cụm chính thấp hơn ở 3,7 ms cộng một đuôi mỏng quanh 64 ms nằm xa bên phải vạch ngân sách; trung bình của hai hệ bằng nhau.</desc>
<line x1="188" y1="18" x2="188" y2="312" stroke="#ef4444" stroke-width="2" stroke-dasharray="5 4"/>
<text x="194" y="30" font-size="11" font-weight="bold" fill="#ef4444">ngân sách 16,67 ms</text>
<line x1="55" y1="140" x2="670" y2="140" stroke="currentColor" stroke-opacity="0.4" stroke-width="1"/>
<text x="55" y="58" font-size="12" font-weight="bold" fill="currentColor">HỆ A — mean 4,00 ms · 0 tick vượt hạn</text>
<rect x="73" y="132" width="4" height="8" fill="#3b82f6" fill-opacity="0.75"/>
<rect x="77" y="112" width="4" height="28" fill="#3b82f6" fill-opacity="0.75"/>
<rect x="81" y="78" width="4" height="62" fill="#3b82f6" fill-opacity="0.75"/>
<rect x="85" y="70" width="4" height="70" fill="#3b82f6" fill-opacity="0.75"/>
<rect x="89" y="78" width="4" height="62" fill="#3b82f6" fill-opacity="0.75"/>
<rect x="93" y="112" width="4" height="28" fill="#3b82f6" fill-opacity="0.75"/>
<rect x="97" y="132" width="4" height="8" fill="#3b82f6" fill-opacity="0.75"/>
<text x="110" y="136" font-size="10" fill="currentColor" opacity="0.75">p99,9 = 5,92 ms — toàn bộ phân phối nằm bên trái vạch đỏ</text>
<line x1="55" y1="290" x2="670" y2="290" stroke="currentColor" stroke-opacity="0.4" stroke-width="1"/>
<text x="55" y="196" font-size="12" font-weight="bold" fill="currentColor">HỆ B — mean 4,01 ms · 94 tick vượt hạn / 18.000</text>
<rect x="76" y="280" width="4" height="10" fill="#84cc16" fill-opacity="0.75"/>
<rect x="80" y="245" width="4" height="45" fill="#84cc16" fill-opacity="0.75"/>
<rect x="84" y="212" width="4" height="78" fill="#84cc16" fill-opacity="0.75"/>
<rect x="88" y="245" width="4" height="45" fill="#84cc16" fill-opacity="0.75"/>
<rect x="92" y="280" width="4" height="10" fill="#84cc16" fill-opacity="0.75"/>
<text x="104" y="222" font-size="10" fill="currentColor" opacity="0.75">99,5% số tick ở đây — p50 3,70 · p95 4,54 · p99 5,01 (thấp hơn A ở cả ba)</text>
<rect x="471" y="278" width="8" height="12" fill="#ef4444" fill-opacity="0.8"/>
<rect x="519" y="272" width="8" height="18" fill="#ef4444" fill-opacity="0.8"/>
<rect x="567" y="270" width="8" height="20" fill="#ef4444" fill-opacity="0.8"/>
<rect x="615" y="276" width="8" height="14" fill="#ef4444" fill-opacity="0.8"/>
<text x="440" y="258" font-size="10" fill="#ef4444">0,5% số tick ở đây (vẽ phóng đại ~20 lần để nhìn thấy)</text>
<text x="470" y="308" font-size="10" fill="currentColor" opacity="0.8">p99,9 = 68,59 ms — 18,8 lần khựng mỗi phút</text>
<text x="55" y="322" font-size="10" fill="currentColor" opacity="0.6">trục ngang: thời gian một tick, 0 → 75 ms</text>
</svg>

Kết luận rút ra là một câu duy nhất, và nó là câu quan trọng nhất của bài:

> **Metric bắt buộc không phải một percentile, mà là một BỘ ĐẾM so với deadline: `ticks_over_budget`.** Percentile trả lời "tệ đến mức nào". Bộ đếm trả lời "có vi phạm không" — và trong hệ real-time, câu thứ hai mới là câu có hợp đồng.

Percentile vẫn cần, nhưng để chẩn đoán: khi bộ đếm đỏ, p99,9 và max cho biết đuôi cao bao nhiêu, tức thủ phạm cỡ nào.

### 3.2 "p99 của cái gì" — theo tick hay theo người chơi

Giả sử bạn đã sửa xong: đo bộ đếm, đo cả p99. Còn một cách nhầm nữa, phổ biến hơn hẳn cái ở 3.1, và nó không nằm ở phép thống kê mà ở **đơn vị mẫu**.

Bài 8 tính: 60 Hz × 60 s = **3.600 tick mỗi phút**, nên p99 theo tick vượt hạn là **36 tick tệ mỗi phút**. Con số đó đúng — nhưng nó là số tick tệ *của một vòng lặp*, không phải số người bị ảnh hưởng. Một tick chậm là chậm cho **toàn bộ người trong phòng cùng lúc**. Nên "1% tick tệ" nghĩa là **100% người chơi, mỗi người 1% thời gian**.

Ngược lại, metric gắn với từng kết nối — RTT, băng thông, packet loss — có đơn vị mẫu là *người chơi*. Ở đó "p99 tệ" nghĩa là **1% người chơi, mỗi người 100% thời gian**. Hai thảm hoạ khác nhau, hai cách xử lý khác nhau, cùng một cái tên "p99" trên dashboard.

Chỗ nhầm chết người là khi bạn gộp cả hai: đổ mọi mẫu của mọi người chơi vào một histogram rồi lấy p99. Tôi mô phỏng 100 người chơi × 3.600 mẫu (1 phút ở 60 Hz), mẫu tệ ~60 ms, mẫu tốt ~8 ms, ngân sách 16,67 ms:

| | pooled p50 | pooled p95 | **pooled p99** | số người có >0,5% mẫu tệ |
|---|---|---|---|---|
| **X** — mọi người đều có 2% mẫu tệ | 8,0 | 10,8 | **59,7** | **100 / 100** |
| **Y** — 2 người có 100% mẫu tệ, 98 người sạch | 8,0 | 10,8 | **60,1** | **2 / 100** |

*(`python3`, seed 7, 360.000 mẫu mỗi kịch bản.)*

Ba cột đầu **giống nhau tới từng chữ số hiển thị**. Cột cuối chênh nhau 50 lần.

<svg viewBox="0 0 700 300" role="img" aria-labelledby="gs36-b-t gs36-b-d" style="width:100%;height:auto">
<title id="gs36-b-t">Cùng một p99 gộp, hai phân bố nỗi đau khác hẳn nhau</title>
<desc id="gs36-b-d">Kịch bản X có cả một trăm người chơi cùng chịu hai phần trăm thời gian tệ, vẽ thành một dải thấp đều. Kịch bản Y có hai người chơi chịu một trăm phần trăm thời gian tệ và chín mươi tám người hoàn toàn sạch, vẽ thành hai cột cao và một đường phẳng. Percentile gộp của hai kịch bản gần như bằng nhau.</desc>
<text x="30" y="24" font-size="12" font-weight="bold" fill="currentColor">X — mọi người chơi đều tệ 2% thời gian</text>
<text x="430" y="24" font-size="11" fill="currentColor" opacity="0.8">pooled p99 = 59,7 ms</text>
<line x1="60" y1="130" x2="660" y2="130" stroke="currentColor" stroke-opacity="0.4"/>
<rect x="60" y="126" width="600" height="4" fill="#f59e0b" fill-opacity="0.85"/>
<text x="60" y="150" font-size="10" fill="currentColor" opacity="0.75">100 người chơi, mỗi người 2% tick tệ — không ai vui, không ai bỏ game ngay</text>
<text x="30" y="192" font-size="12" font-weight="bold" fill="currentColor">Y — hai người chơi tệ 100% thời gian</text>
<text x="430" y="192" font-size="11" fill="currentColor" opacity="0.8">pooled p99 = 60,1 ms</text>
<line x1="60" y1="280" x2="660" y2="280" stroke="currentColor" stroke-opacity="0.4"/>
<rect x="60" y="200" width="5" height="80" fill="#ef4444" fill-opacity="0.85"/>
<rect x="66" y="200" width="5" height="80" fill="#ef4444" fill-opacity="0.85"/>
<rect x="72" y="276" width="588" height="4" fill="#84cc16" fill-opacity="0.7"/>
<text x="90" y="216" font-size="10" fill="currentColor" opacity="0.75">2 người: không chơi nổi, sẽ rời game hôm nay</text>
<text x="90" y="268" font-size="10" fill="currentColor" opacity="0.75">98 người: hoàn hảo, 0% tick tệ</text>
<text x="30" y="296" font-size="10" fill="currentColor" opacity="0.6">trục dọc: tỉ lệ thời gian tệ của từng người chơi (0 → 100%)</text>
</svg>

Y là routing hỏng cho một khu vực, hai kết nối rơi vào node quá tải, hoặc hai người sau NAT tệ (bài 16). X là server chậm đều. Cách sửa khác hẳn nhau, và **pooled p99 không phân biệt được**.

Sửa metric thì rẻ: **tính chỉ số của từng người chơi trước, rồi mới tổng hợp** — mỗi người một tỉ lệ mẫu vượt ngân sách trong một phút, rồi đếm bao nhiêu người vượt mốc. Cột cuối của bảng chính là metric đó.

> Quy tắc: **percentile chỉ có nghĩa khi bạn nói được một mẫu là gì.** "p99 latency" mà không nói mẫu là một request, một tick, hay một người chơi thì chưa phải một metric.

---

## ⏸ Dừng lại — đoán trước #2

Bạn quyết định ghi thời gian xử lý của **từng entity** trong tick, để biết entity nào chậm. 10.000 entity, 60 Hz, ngân sách 16,67 ms một tick.

**Cách ghi rẻ nhất trong Go tốn bao nhiêu phần ngân sách tick?**

```
(a) Dưới 0,1% — ghi một con số là chuyện không đáng bàn
(b) Khoảng 1% — đáng chú ý nhưng chấp nhận được
(c) Khoảng 3% — bắt đầu phải cân nhắc
(d) Trên 25% — đo đắt hơn mô phỏng
```

---

### 3.3 Đo trong hot loop mà không phá hot loop

Đáp án phụ thuộc **cách bạn ghi**, và khoảng cách giữa cách tệ nhất và tốt nhất lớn hơn trực giác nhiều. Bench trên Apple M4, `go test -bench -benchtime=5000000x`:

| Cách ghi một mẫu | ns/op | B/op | Ghi chú |
|---|---|---|---|
| `append` vào slice không giới hạn | **4,173** | **40** | slice tự nở, bộ nhớ không có trần |
| mutex + `append` (slice đã cấp phát sẵn) | 2,123 | 0 | khoá **không tranh chấp** |
| `atomic.AddUint64` × 2 (đếm + tổng) | 1,810 | 0 | mất phân phối, chỉ còn trung bình |
| **histogram bucket cấp phát sẵn** | **1,531** | 0 | `hist[d / 250µs]++`, 64 bucket = 512 B |
| histogram bucket + atomic | 1,817 | 0 | phiên bản chia sẻ giữa goroutine |

Histogram cấp phát sẵn **rẻ hơn `append`** — 1,531 so với 4,173 ns — mà vẫn giữ hình dạng phân phối, thứ mục 3.1 vừa chứng minh là bắt buộc. Nó cũng là cách duy nhất có **bộ nhớ hằng số**: 64 bucket × 8 B = **512 B**, mãi mãi. `append` ở 60 Hz một giờ là 216.000 mẫu × 8 B = **1,728 MB** — vô hại; nhưng cho 1.000 entity mỗi tick là **1,728 GB mỗi giờ** rác ném vào GC, tức bài 37.

Hai dòng nữa, cùng bench:

```
time.Now() rồi time.Since()        44,54 ns     <-- chỉ để LẤY mẫu
lấy mẫu + ghi vào histogram        47,87 ns
```

**Việc ghi tốn 1,53 ns. Việc lấy đồng hồ tốn 44,54 ns — gấp 29,1 lần.** Toàn bộ cuộc thảo luận "histogram hay atomic hay slice" là cuộc thảo luận về 6% chi phí; 94% nằm ở hai lời gọi `time.Now()` mà không ai để ý.

Quy ra ngân sách tick 16,67 ms:

| Số lần đo mỗi tick | histogram (1,531 ns) | đo đủ, có `time.Now()` (47,87 ns) | mutex có tranh chấp (72,04 ns) |
|---|---|---|---|
| 1 (cả vòng lặp) | 0,0000092% | 0,00029% | 0,00043% |
| 1.000 (mỗi entity) | 0,0092% | 0,287% | 0,432% |
| **10.000** | **0,0918%** | **2,872%** | **4,322%** |
| 100.000 | 0,918% | **28,7%** | **43,2%** |

Đáp án hộp #2 là **(c)** — 2,872%. Và so với bench của bài 8: `sim.Step` cho 10.000 entity tốn **11,9 µs**, đo từng entity tốn **478,7 µs**. **Phép đo đắt gấp 40,2 lần thứ nó đang đo.** Ở 1.000 entity tỉ lệ y hệt: 47,87 so với 1,18 µs, gấp 40,6 lần.

> **Đo mỗi VÒNG LẶP, đừng đo mỗi PHẦN TỬ.** Một cặp `time.Now()` cho cả tick là 0,00029% ngân sách. Một cặp cho mỗi entity là hệ đo lường đắt hơn hệ được đo.

Muốn biết entity nào chậm thì không dùng metric — dùng profile (mục 3.4), vì profile lấy mẫu chứ không đếm hết.

Ba dòng nữa, đo với 8 goroutine cùng ghi vào một chỗ:

```
mutex + append   2,123 ns  ->  72,04 ns   (33,9 lần)
atomic counter   1,810 ns  ->  46,63 ns   (25,8 lần)
histogram atomic 1,817 ns  ->  49,15 ns   (27,1 lần)
```

Khoá không đắt; **khoá bị tranh chấp mới đắt** — và atomic cũng vậy, cùng một cache line bị 8 core giành nhau thì `atomic.Add` đắt gần bằng mutex. Cách thoát là mỗi goroutine giữ histogram riêng, chỉ cộng lại khi xuất metric mỗi giây một lần; chi tiết thuộc bài 38. Ở đây chỉ cần con số: **tranh chấp nhân chi phí ghi metric lên 26–34 lần**, và một tick loop đơn luồng không phải trả giá đó nếu bạn không tự chuốc lấy.

### 3.4 pprof: bốn profile, bốn câu hỏi khác nhau

Metric nói **có vấn đề**. Profile nói **ở dòng nào**. Dùng nhầm loại thì bạn nhìn chằm chằm vào biểu đồ không chứa câu trả lời.

| Profile | Trả lời câu hỏi | KHÔNG trả lời được |
|---|---|---|
| **CPU** | Thời gian CPU đi đâu khi tick chạy | Vì sao tick *chờ* — chờ không tiêu CPU nên không hiện |
| **Heap** | Ai cấp phát, bao nhiêu, cái gì còn sống | Vì sao GC pause dài — chỉ ra nguyên nhân gián tiếp |
| **Block** | Goroutine nằm chờ ở đâu: channel, `WaitGroup`, syscall | Chờ có phải vấn đề không — chờ đúng chỗ là bình thường |
| **Mutex** | Khoá nào bị tranh chấp, bao lâu | Tranh chấp có nằm trên đường tới hạn không |

Ánh xạ từ triệu chứng: `ticks_over_budget` đỏ mà CPU một core cao → **CPU profile**. Đỏ mà CPU thấp → **block profile**, vì tick đang chờ chứ không đang tính. GC pause p99 cao → **heap profile** `-alloc_space` (bài 37). Nhiều core mà thông lượng không tăng → **mutex profile**.

Bây giờ đến cảnh báo quen thuộc — "profile làm méo chính thứ đang đo" — và tôi đã cố đo nó thay vì nhắc lại. Workload tính toán thuần, 3.000 vòng, đo p99 có bật và không bật CPU profile, lặp 3 lần:

```
không profile   mean 0,4157 – 0,4631 ms   p99 0,4511 – 0,4988 ms
có CPU profile  mean 0,4184 – 0,4626 ms   p99 0,4508 – 0,4969 ms
```

**Không đo được méo nào.** Chênh lệch giữa hai lần chạy liên tiếp cùng cấu hình lớn hơn chênh lệch giữa hai cấu hình. `SetBlockProfileRate(1)` và `SetMutexProfileFraction(1)` trên vòng lock/unlock 8 goroutine cũng cho hệ số 0,92–1,05 — nằm trong nhiễu. Câu cảnh báo kia ở dạng chung chung **là sai** với CPU profile của Go: nó lấy mẫu 100 Hz và gần như miễn phí.

Chỗ méo có thật, đo được, và lớn:

```
cấp phát 64 B, MemProfileRate mặc định (512 KB)    12,47 ns
cấp phát 64 B, MemProfileRate = 1                 395,01 ns      x31,7
```

Đặt `runtime.MemProfileRate = 1` để "bắt hết allocation" làm mỗi lần cấp phát **chậm đi 31,7 lần**. Trên một tick loop đang cấp phát, đó không còn là quan sát nữa — bạn đã tạo ra một hệ thống khác và đang đo hệ thống đó. Mặc định lấy mẫu 512 KB thì gần như miễn phí, và với mục đích tìm chỗ cấp phát nhiều nhất thì lấy mẫu là đủ.

Còn một cách profile làm hỏng phép đo mà không tốn nano giây nào: **cửa sổ thời gian**. `go tool pprof` mặc định 30 giây; đuôi ở mục 3.1 dày 0,1%, mà 30 giây ở 60 Hz là 1.800 tick — kỳ vọng **1,8 tick tệ**. Profile có thể không chứa sự kiện bạn đang săn, và cái nó cho xem là chân dung rất sắc nét của **trạng thái bình thường**. Vì thế: bộ đếm trước, profile sau.

### 3.5 Metric phía client là metric duy nhất nói về trải nghiệm

Bài 7 đã ra mệnh đề: một metric không so với cái gì thì không phải metric. Có một dạng nặng hơn — metric **so với đúng thứ**, nhưng ở **sai phía**.

Ngân sách 182 ms của bài 8 có bảy chặng, và server chỉ nhìn thấy ba chặng giữa. Bốn chặng còn lại — hai lần truyền, buffer nội suy 100 ms, và render — nằm ở phía kia. Nên trường hợp thường gặp nhất trong nghề này không phải "server chậm": nó là **server khoẻ thật, và người chơi vẫn giật**. Bạn không bác bỏ được nó bằng dữ liệu server, vì dữ liệu server không chứa hiện tượng đó.

Bộ tối thiểu client phải gửi về, gộp và tính sẵn ở client, mỗi 10–30 giây một gói:

| Metric client | Vì sao server không thay được | Bài |
|---|---|---|
| **RTT p50 / p99 bằng ping tầng ứng dụng** | Server chỉ biết RTT của gói nó gửi, không biết phân phối theo thời gian ở client | 8 |
| **Snapshot nhận / kỳ vọng trong cửa sổ** | Mất gói chiều xuống là chiều server mù hoàn toàn | 14, 15 |
| **Độ dày buffer nội suy (p50, min, số lần cạn)** | Buffer cạn = giật, hiện tượng thuần client | 20 |
| **Số misprediction và biên độ sửa vị trí** | Server không biết client đã đoán gì | 18, 19 |
| **Frame time p99, số frame drop** | GPU của người chơi, server không có quyền nhìn | 8 |
| **Thời gian input → thấy phản hồi** | Con số duy nhất mô tả cảm giác chơi | 17, 18 |

Dòng cuối đáng đầu tư nhất và ít ai làm: đo từ lúc bấm phím tới khung hình đầu tiên phản ánh hành động đó. Nó bao trọn bảy chặng, nên khi nó xấu bạn mới có quyền hỏi chặng nào. Bài 39 dựng bot client, và bot chạy đúng bộ metric này là cách duy nhất có số liệu client trước khi có người chơi thật.

Cảnh báo: dữ liệu client đến từ máy bạn không kiểm soát nên **có thể bị làm giả** (bài 34). Dùng để chẩn đoán và xếp hạng, đừng dùng để trừng phạt hay cấp tài nguyên.

### 3.6 Cái bẫy cuối: metric luôn xanh

Bốn dòng dashboard ở mục 2 có một điểm chung, bây giờ nhìn lại thì hiển nhiên: **không dòng nào so với deadline nào.** `tick time 4,0 ms / 24%` có vẻ là so với ngân sách — nhưng nó so **trung bình** với ngân sách, mà deadline áp lên từng tick một chứ không áp lên trung bình. `CPU 31%` là CPU của cả máy, và bài 1 đã cho thấy CPU máy 8% vẫn vỡ ở người thứ 6. `error rate 0,00%` đếm exception thoát ra, còn một tick trễ 68 ms không ném exception nào.

Bài 7 nói: bắt metric chỉ ra mốc so sánh của nó. Áp vào đây thì mọi metric nhịp đều viết được ở dạng **một cặp**:

```
số lần vi phạm / tổng số cơ hội vi phạm, trong một cửa sổ có tên
```

`ticks_over_budget / ticks_total mỗi phút`. `players_with_bad_rate_over_0.5% / players_total`. `snapshots_late / snapshots_sent`. Tử số là **vi phạm một hợp đồng**, mẫu số là **số lần hợp đồng đó được kiểm tra**, và cả ba đỏ được. Metric không viết được ở dạng đó thì hoặc là chẩn đoán (được, nhưng đừng gắn alert), hoặc là số trang trí.

Hệ quả ngược, đáng dán lên tường:

> Một hệ real-time chạy ba tuần không đỏ lần nào thì hoặc ngân sách của bạn đặt quá rộng, hoặc bạn chưa đo cái đúng. Xác suất của vế thứ hai cao hơn.

---

## ⏸ Dừng lại — đoán trước #3

Node báo `ticks_over_budget = 0` suốt 24 giờ, `lateness p99 = 1,04 ms`, `GC pause p99 = 0,3 ms`, `bytes/player p99 = 9,8 KB/s`. Người chơi vẫn báo giật.

**Metric nào sau đây, nếu thiếu, giải thích được toàn bộ tình huống trên?**

```
(a) dropped step của accumulator
(b) số goroutine
(c) RTT p99 theo từng người chơi (không gộp)
(d) độ dày buffer nội suy ở client
```

Ba trong bốn cái đều giải thích được. Cái thứ tư giải thích được **một cách khác**: nó khiến người chơi giật mà không cần bất kỳ metric server nào sai.

---

## 4. Bảng metric bắt buộc

Bật được ngay, không cần gì ngoài một histogram trong bộ nhớ và một endpoint xuất ra. Cột ngưỡng là **điểm khởi đầu để tinh chỉnh, không phải hằng số** — thay đổi theo thể loại game, phần cứng và tải.

**(a) Nhóm nhịp — đây là nhóm có hợp đồng, alert nằm ở đây**

| Metric | Đo ở đâu | Ngưỡng khởi điểm | Báo hiệu gì |
|---|---|---|---|
| `ticks_over_budget` / phút | quanh toàn thân tick, một cặp `time.Now()` | **> 0,1% số tick** (60 Hz: 3,6 tick/phút) | vượt ngân sách: CPU, GC, hoặc thuật toán O(n²) mới thêm |
| tick time p99,9 + max | cùng chỗ, histogram 64 bucket 0,25 ms | max > 2× ngân sách | độ cao của đuôi → cỡ của thủ phạm |
| lateness p99 (bài 7) | khi timer trả về, **trước** khi làm việc | p99 > 2 ms | scheduler/OS, hàng xóm ồn, hoặc thiếu busy-wait |
| tick thực / tick danh nghĩa | đếm tick chia thời gian tường mỗi phút | lệch > 0,5% | drift kiểu `naive` (bài 7) |
| `dropped_steps` (bài 6) | trong accumulator, chỗ cắt `MaxCatchUp` | **> 0 là báo động** | server vừa nhảy cóc thời gian; client thấy teleport |
| tồn dư accumulator cuối tick | cuối vòng lặp | tăng đơn điệu 3 tick liền | đang vào spiral of death |

**(b) Nhóm mạng — đơn vị mẫu là NGƯỜI CHƠI, không gộp**

| Metric | Đo ở đâu | Ngưỡng khởi điểm | Báo hiệu gì |
|---|---|---|---|
| bytes/player/s ra (p50, p99, max) | tầng gửi, **sau** serialize và delta | p99 > 2× ngân sách thiết kế (bài 8: 10 KB/s) | AoI hở (bài 26), delta không ăn (bài 25), entity phình |
| packet loss quan sát (khe seq) | tầng reliability (bài 14), theo kết nối | p95 > 2%, hoặc ai đó > 5% | mạng người chơi, hoặc node quá tải chiều ra |
| RTT p50 và p99 **theo từng người** | ping/pong tầng ứng dụng | p99 một người > 150 ms | định tuyến sai khu vực (bài 30) |
| jitter = p99 − p50 mỗi người | cùng chỗ | > 30 ms | buffer nội suy phải nới (bài 20) |
| input đến muộn / input nhận | tầng input buffer (bài 17) | > 2% | buffer client quá mỏng, hoặc đồng hồ lệch |
| số người có tỉ lệ mẫu tệ > 0,5% | tính per-player rồi đếm | > 1% số người online | phân biệt X khỏi Y ở mục 3.2 |

**(c) Nhóm tài nguyên — không cái nào có hợp đồng, tất cả là chẩn đoán**

| Metric | Đo ở đâu | Ngưỡng khởi điểm | Báo hiệu gì |
|---|---|---|---|
| CPU của **goroutine tick**, không phải của máy | `runtime/metrics`, hoặc suy từ tick time | > 70% một core | hết đầu; bài 1 cho thấy CPU máy vô dụng ở đây |
| RSS và heap còn sống | `runtime/metrics` mỗi 10 s | tăng đơn điệu qua nhiều trận | rò theo trận: room không được giải phóng (bài 28, 31) |
| GC pause p99 + tổng ms/s | `runtime/metrics` | pause > 1 ms; tổng > 1% thời gian | bài 37 — thủ phạm p99 số một ở Go |
| số lần GC mỗi phút | cùng chỗ | > 60 (một lần mỗi giây) | tốc độ cấp phát quá cao, dù pause còn ngắn |
| `runtime.NumGoroutine()` | mỗi 10 s | tăng đơn điệu, hoặc > 3× số kết nối | goroutine rò khi client rớt (bài 38) |

Ba nhóm không ngang hàng, và thứ tự đọc khi có sự cố là cố định: **(a) có vi phạm hay không → (c) vì sao → (b) ai đang chịu.** Nhóm (b) không bao giờ là chỗ bắt đầu: nó luôn có vài người xấu số, và bạn sẽ đuổi theo nhiễu.

---

## 5. Tính tay

**Bài 1.** Server 128 Hz. Histogram tick time báo p99,9 = 9,2 ms, max 31 ms, bộ đếm ghi 0,3% số tick vượt ngân sách.
- Ngân sách một tick là bao nhiêu ms? Bao nhiêu tick mỗi phút?
- 0,3% là bao nhiêu lần khựng mỗi phút? So với hệ B ở mục 2 (18,8 lần/phút ở 60 Hz), hệ nào tệ hơn?
- p99,9 = 9,2 ms nằm dưới ngân sách. Vì sao bộ đếm vẫn báo 0,3%, và điều đó nói gì về việc chỉ vẽ percentile?

**Bài 2.** Bạn đo mỗi entity một cặp `time.Now()` + ghi histogram (47,87 ns), 5.000 entity, 60 Hz.
- Hết bao nhiêu µs mỗi tick, bao nhiêu phần trăm ngân sách 16,67 ms?
- Bỏ đo per-entity, chỉ đo một lần cho cả vòng lặp: tiết kiệm bao nhiêu phần trăm ngân sách?
- Giữ per-entity nhưng bỏ `time.Now()` (dùng mốc chung, chỉ ghi bucket 1,531 ns): còn bao nhiêu phần trăm? Bước nào cắt được nhiều hơn?

**Bài 3.** Một node giữ 200 người chơi, pooled p99 của RTT là 45 ms, ngân sách thiết kế 80 ms.
- Dựng hai kịch bản cùng cho pooled p99 = 45 ms: một cái không ai khổ, một cái có người không chơi nổi.
- Với mỗi kịch bản, tính "số người có > 0,5% mẫu vượt 80 ms".
- Chỉ được thêm **một** metric. Chọn cái nào, và viết nó ở dạng cặp tử số / mẫu số của mục 3.6.

---

## 6. Chuyển giao

Bạn tiếp quản một game bắn súng 5v5 đang chạy: 12.000 người chơi đồng thời giờ cao điểm, 60 Hz, 240 node. Dashboard hiện có đúng bốn dòng ở mục 2.

1. Bạn được thêm **một** metric duy nhất trong tuần này. Chọn cái nào, và viết định nghĩa chính xác — kể cả cửa sổ thời gian và mẫu số.
2. Sau khi bật, `ticks_over_budget` báo 0,04% ở giờ thấp điểm và 0,9% ở giờ cao điểm. Trước khi mở profile nào, chênh lệch đó đã loại trừ được nhóm nguyên nhân nào?
3. Đội hạ tầng đề nghị bật `MemProfileRate = 1` trên cả 240 node trong 24 giờ "để bắt hết allocation". Với hệ số 31,7 ở mục 3.4, phản biện của bạn là gì và bạn đề xuất gì thay thế?
4. Một node báo pooled RTT p99 = 38 ms — tốt nhất cụm — nhưng có 4 khiếu nại từ node đó trong một giờ. Bạn tính metric nào để xác nhận hay bác bỏ, và nó thuộc nhóm (a), (b) hay (c)?
5. Bạn muốn alert khi "có ít nhất một người trong trận đang chịu > 1% tick tệ". Trận 10 người, tỉ lệ người chơi tệ là `p` và độc lập nhau, xác suất một trận bị alert là `1 − (1−p)¹⁰`. Tính cho `p` = 1% và `p` = 0,1%. Với 1.200 trận đang chạy, alert này dùng được không, và nếu không thì hỏng ở đâu?
6. Kết quả câu 5 khiến bạn nghi ngờ chính giả thiết "độc lập". Cái gì làm cho những người **trong cùng một trận** có tỉ lệ tick tệ tương quan với nhau, và điều đó làm con số ở câu 5 sai theo hướng nào?
7. **Câu khó nhất.** Metric ở mục 3.2 — "số người có tỉ lệ mẫu tệ vượt **0,5%**" — chứa một ngưỡng 0,5% tôi chọn ra và không chứng minh gì cả. Đặt ở 2% thì kịch bản X biến mất khỏi dashboard; đặt ở 0,1% thì mọi node đỏ suốt ngày. **Bạn lấy dữ liệu ở đâu để chọn con số đó cho đúng?** Chỉ ra vì sao không metric server nào trong ba bảng ở mục 4 chứa được thông tin cần thiết; thí nghiệm phải chạy là gì; đại lượng đo trong thí nghiệm đó là gì (nó không phải thời gian tick); và vì sao ngưỡng tìm được **khác nhau giữa game bắn súng và game xây dựng** dù cùng chạy 60 Hz.

---

## 7. Tóm tắt

- Hai hệ cùng mean **4,00 ms**: A không vượt hạn lần nào, B vượt **94/18.000 tick = 18,8 lần khựng mỗi phút** — mà **p50, p95 và p99 của B đều THẤP HƠN A**. Chỉ p99,9 (68,59 so với 5,92) và bộ đếm tách được chúng.
- **Percentile chỉ nhìn thấy đuôi dày hơn `100 − p` phần trăm.** Đuôi 3% cần p99; đuôi 0,5% cần p99,9; đuôi **0,1%** — vẫn 3,2 lần khựng/phút — không percentile nào bắt được. Và ngay tại ranh giới nó là số ngẫu nhiên: đuôi 1%, 10 seed, p99 chạy từ **5,2 đến 55,7 ms** trên cùng một hệ.
- **Metric có hợp đồng là bộ đếm, không phải percentile**: `ticks_over_budget / ticks_total` trong một cửa sổ có tên. Percentile để chẩn đoán, bộ đếm để cảnh báo.
- **p99 theo tick ≠ p99 theo người chơi.** 1% tick tệ = **100% người chơi, mỗi người 1% thời gian** (3.600 tick/phút → 36 tick tệ). 1% người chơi tệ = 1% người, 100% thời gian.
- Gộp mẫu mọi người chơi là mất thông tin: X (100/100 người tệ 2%) và Y (2/100 người tệ 100%) cho pooled p50/p95/p99 **8,0 / 10,8 / 59,7 so với 8,0 / 10,8 / 60,1** — số người khổ chênh **50 lần**. Tính per-player trước, tổng hợp sau.
- Histogram cấp phát sẵn: **1,531 ns**, 0 alloc, **512 B** cố định — rẻ hơn `append` (4,173 ns, 40 B/op) mà vẫn giữ phân phối. Tranh chấp nhân chi phí lên **26–34 lần** (mutex 2,123 → 72,04 ns).
- **`time.Now()` mới là chi phí thật: 44,54 ns, gấp 29,1 lần chi phí ghi.** Đo mỗi vòng lặp = 0,00029% ngân sách; đo mỗi entity ở 10.000 entity = **2,872%**, **đắt gấp 40,2 lần chính `sim.Step`** (478,7 µs so với 11,9 µs).
- CPU/block/mutex profile của Go **không đo được méo nào** — nhiễu giữa các lần chạy lớn hơn hiệu ứng. Chỗ méo thật là **`MemProfileRate = 1`: cấp phát chậm 31,7 lần** (12,47 → 395,01 ns). Cửa sổ 30 s chỉ chứa kỳ vọng **1,8 tick tệ** khi đuôi dày 0,1% — profile trước khi có bộ đếm là săn mù.
- Server nhìn thấy **3 trong 7 chặng** của ngân sách 182 ms, nên "server khoẻ, người chơi giật" không bác bỏ được bằng dữ liệu server. Client phải gửi về RTT phân phối, tỉ lệ snapshot nhận, độ dày buffer nội suy, misprediction, frame time, và **thời gian từ bấm phím tới thấy phản hồi**.
- Mọi metric nhịp phải viết được thành **vi phạm / số lần kiểm tra, trong một cửa sổ có tên**. Không viết được thì đừng gắn alert. Thứ tự đọc khi có sự cố: **(a) có vi phạm không → (c) vì sao → (b) ai đang chịu.**

→ **Bài 37 — Zero-allocation hot loop**: đo được rồi thì thấy thủ phạm. Và ở Go, thủ phạm số một của p99 không phải thuật toán của bạn — nó là bộ dọn rác.
