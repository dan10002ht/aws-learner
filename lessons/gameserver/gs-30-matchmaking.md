# Bài 30 — Matchmaking: queue, MMR, region

## 1. Mục tiêu

Sau bài này bạn có thể:

- Chứng minh bằng số vì sao matchmaking là **bài toán tối ưu đa mục tiêu**, không phải hàng đợi.
- Tính nhẩm **thời gian gom đủ người** từ tốc độ vào hàng đợi λ và độ rộng cửa sổ ±W, không cần mô phỏng.
- Viết ra công thức Elo, tính điểm được/mất với K cho trước, và nói được vì sao **một con số MMR là không đủ**.
- Chọn tham số **nới cửa sổ theo thời gian chờ** dựa trên p50/p99 chứ không dựa trên cảm giác.
- Quy đổi **độ trễ mạng ra MMR tương đương** bằng mô hình có giả định ghi rõ, và giải thích vì sao region là ràng buộc cứng hơn MMR.
- Chỉ ra vì sao **MMR của một nhóm không phải trung bình cộng**, và cái giá thật của party.

---

## 2. Triệu chứng

Cùng một game, cùng một service matchmaking, cùng lượng người vào hàng đợi. Hai đợt build cách nhau ba ngày. Diễn đàn nói hai chuyện trái ngược:

> **Build A:** *"Bấm tìm trận rồi đi pha cà phê. Quay lại vẫn đang tìm."*
> **Build B:** *"Trận nào cũng có một thằng bay lượn trên đầu cả đội. Hệ thống ghép trận hỏng rồi."*

Không ai đổi thuật toán, không ai đổi hạ tầng. Người ta đổi **đúng một dòng cấu hình**: tốc độ nới rộng cửa sổ MMR theo thời gian chờ. Số từ mô phỏng của tôi (5v5, MMR ~ N(1500, 300), λ=2 người/giây, cửa sổ bắt đầu ±50):

| | Nới **+5 MMR** mỗi 10 s | Nới **+400 MMR** mỗi 10 s |
|---|---|---|
| Chờ p50 | 17,9 s | 11,0 s |
| **Chờ p99** | **232,4 s** (3 phút 52 giây) | **43,8 s** |
| **Độ lệch MMR trong trận, trung bình** | **102 điểm** | **604 điểm** |
| Độ lệch MMR p99 | 240 điểm | 1.056 điểm |

Build A và Build B là **cùng một hệ thống**. Một tham số đổi làm p99 thời gian chờ giãn 5,31 lần và độ lệch trình độ giãn 5,92 lần, theo hai chiều ngược nhau. Không giá trị nào của tham số đó làm cả hai cột cùng đẹp. Bài này nói vì sao.

*(Mọi số trong bài đến từ mô phỏng tôi tự viết, tham số giả định ghi rõ ở từng chỗ — không phải số đo từ một game thương mại.)*

---

## ⏸ Dừng lại — đoán trước #1

Bạn phải sửa Build A (chờ p99 gần 4 phút), hạ tầng có sẵn, ngân sách bằng không.

**Cách nào thật sự giảm thời gian chờ mà KHÔNG làm trận lệch trình độ hơn?**

```
(a) Nới cửa sổ MMR nhanh hơn
(b) Chạy vòng lặp matchmaker dày hơn — 10 Hz thay vì 1 Hz
(c) Gộp nhiều region vào chung một hồ người chơi
(d) Không có cách nào. Ba đại lượng ràng buộc nhau, muốn được cái này phải mất cái kia
```

Đáp án ở 3.2. Có một phương án đúng, nhưng nó **không miễn phí** — cái giá nằm ở một trục thứ ba mà câu hỏi cố tình giấu.

---

## 3. Lý thuyết

### 3.1 Hàng đợi có một mục tiêu, matchmaking có ba

Bài 2 đặt matchmaker ở bước 3–4 của vòng đời một trận: bấm "Tìm trận" → vào hàng đợi (Redis) → đủ người thì ghép nhóm, sinh `match_id`, allocator cấp node. Bài 29 lo phần định tuyến sau khi đã có `match_id`. Bài này lấp cái hố ở giữa: **quyết định ai đi với ai**.

Cám dỗ đầu tiên của backend dev là thấy chữ "hàng đợi" rồi viết `LPUSH` / `BRPOP`. Nó chạy được, và sai về bản chất: hàng đợi tối ưu **đúng một đại lượng** — thời gian nằm trong hàng, nên FIFO là lời giải tối ưu của nó. Matchmaking phải tối ưu đồng thời ba thứ:

| Đại lượng | Ai than phiền khi nó xấu | Đo bằng |
|---|---|---|
| Thời gian chờ | người đang nhìn màn hình loading | p50/p99 giây |
| Chất lượng trận | người vừa thua 0–15 | độ lệch MMR trong trận |
| Độ trễ mạng | người bắn trúng mà đối thủ không chết | RTT tới node được cấp |

Ba đại lượng này **không cùng đơn vị**. Ghép hai người ngang trình độ nhưng cách nhau một đại dương là quyết định tồi; ghép hai người cùng thành phố nhưng lệch 800 MMR cũng tồi. Không hàm mục tiêu nào tự nhiên nói cái nào tồi hơn — **bạn phải chọn tỉ giá, và tỉ giá đó là quyết định thiết kế game**. Đó là bài toán tối ưu; FIFO chỉ là điểm cực trị của một trục.

### 3.2 Tam giác: chờ × chất lượng × hồ người chơi

Đáp án hộp #1 là **(c)** — gộp region làm giảm thời gian chờ mà không phải nới cửa sổ. Cái giá của nó nằm ở trục thứ ba: RTT. Mục 3.6 tính ra cái giá đó bằng số.

Ba đại lượng đó rút gọn thành một quan hệ số học:

<svg viewBox="0 0 700 300" role="img" aria-labelledby="gs30-a-t gs30-a-d" style="width:100%;height:auto">
<title id="gs30-a-t">Tam giác đánh đổi của matchmaking</title>
<desc id="gs30-a-d">Ba đỉnh: thời gian chờ ngắn, chất lượng trận cao, và hồ người chơi hẹp theo region. Mỗi cạnh nối hai đỉnh ghi cái giá phải trả khi siết đỉnh còn lại, và ba ví dụ FIFO thuần, ghép chặt theo MMR, gộp toàn cầu nằm ở ba góc.</desc>
<polygon points="350,36 646,262 54,262" fill="#3b82f6" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.35" stroke-width="1.5"/>
<circle cx="350" cy="36" r="7" fill="#84cc16" fill-opacity="0.7"/>
<text x="350" y="22" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">CHỜ NGẮN</text>
<circle cx="646" cy="262" r="7" fill="#f59e0b" fill-opacity="0.7"/>
<text x="646" y="284" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">TRẬN CÂN</text>
<circle cx="54" cy="262" r="7" fill="#8b5cf6" fill-opacity="0.7"/>
<text x="54" y="284" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">PING THẤP</text>
<text x="350" y="298" text-anchor="middle" font-size="10" font-style="italic" fill="currentColor" opacity="0.75">chọn hai — cạnh thứ ba luôn phải nới</text>
<rect x="238" y="86" width="224" height="34" rx="6" fill="#84cc16" fill-opacity="0.18"/>
<text x="350" y="100" text-anchor="middle" font-size="10" fill="currentColor">chờ ngắn + trận cân</text>
<text x="350" y="114" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">⇒ phải gộp region, RTT tăng</text>
<rect x="392" y="176" width="222" height="34" rx="6" fill="#f59e0b" fill-opacity="0.18"/>
<text x="503" y="190" text-anchor="middle" font-size="10" fill="currentColor">trận cân + ping thấp</text>
<text x="503" y="204" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">⇒ hồ hẹp, chờ p99 nổ</text>
<rect x="86" y="176" width="222" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.18"/>
<text x="197" y="190" text-anchor="middle" font-size="10" fill="currentColor">chờ ngắn + ping thấp</text>
<text x="197" y="204" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">⇒ nới cửa sổ, trận lệch</text>
<text x="350" y="240" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.85">λ · P(|MMR − seed| ≤ W) · t  ≥  N</text>
<text x="350" y="256" text-anchor="middle" font-size="9" font-style="italic" fill="currentColor" opacity="0.7">tốc độ vào × tỉ lệ hợp lệ × thời gian chờ = đủ người một trận</text>
</svg>

Bất đẳng thức ở đáy tam giác là toàn bộ bài toán: `λ` là người vào hàng đợi mỗi giây (**hồ**, chia nhỏ khi tách region), `P(...)` là tỉ lệ dân số lọt cửa sổ ±W (**chất lượng**), `t` là thời gian chờ, `N` là số người một trận cần. Ba biến, một ràng buộc: siết hai cái thì cái thứ ba bị ép theo. Đây là phép nhân, kiểm được ngay:

**Tính tay.** MMR ~ N(1500, 300). Người chơi ở đúng trung tâm, cửa sổ ±50:

```
mật độ tại 1500  = 1 / (300 · √(2π))  = 0,00133 / điểm MMR
tỉ lệ trong ±50  = 100 · 0,00133      = 0,133  (13,3 % dân số)
λ = 2 người/s    → 2 · 0,133 = 0,266 người hợp lệ / giây
gom đủ 10 người  → 10 / 0,266 = 37,6 giây
```

37,6 giây **cho một cửa sổ đứng yên ở ±50**. Đây là chặn trên thô — mô phỏng ở 3.5 cho p50 khoảng 18 giây với cửa sổ khoá ở ±50, đúng một nửa chặn trên, vì matchmaker không chỉ ghép quanh một hạt giống cố định. Bậc độ lớn thì phép tính tay đã cho đúng, trong 30 giây làm việc.

> Trước khi viết dòng code matchmaking nào, làm phép nhân này với λ giờ thấp điểm. Ra 6 phút thì không thuật toán nào cứu được: vấn đề là hồ người chơi, và lời giải nằm ở marketing hoặc ở việc gộp region, không nằm ở matchmaker.

### 3.3 MMR: một con số là không đủ

Trước khi nói cửa sổ, phải nói cái mà cửa sổ đo. Elo — công thức gốc từ cờ vua — vẫn là nền của gần như mọi hệ thống hiện đại:

```
E_A = 1 / (1 + 10^((R_B − R_A) / 400))      xác suất A thắng
R_A ← R_A + K · (S_A − E_A)                 S_A = 1 nếu thắng, 0 nếu thua
```

Hằng số 400 định nghĩa cả thang điểm: **chênh 400 điểm nghĩa là bên mạnh thắng 10 lần trên 11**. Mọi con số MMR chỉ có nghĩa qua lăng kính đó.

| Chênh lệch | Xác suất bên mạnh thắng | Với K=32, bên mạnh thắng được | thua mất |
|---|---|---|---|
| 0 | 50,0 % | +16,0 | −16,0 |
| 50 | 57,1 % | | |
| 100 | 64,0 % | +11,5 | −20,5 |
| 200 | 76,0 % | +7,7 | −24,3 |
| 400 | 90,9 % | +2,9 | −29,1 |

**Một, chênh 100 MMR không phải "bị nghiền"** — bên yếu vẫn thắng 36 % số trận. Nhờ đó cột lệch MMR ở mục 2 đọc được: 102 điểm là bình thường, 604 điểm là bên yếu thắng khoảng 3 %.

**Hai, K-factor là bộ điều tốc.** K lớn thì điểm đuổi kịp trình độ thật nhanh nhưng nhảy loạn; K nhỏ thì ổn định nhưng người mới mất hàng trăm trận mới về đúng chỗ. Cách vá phổ thông là K giảm dần theo số trận đã chơi — và chính cái vá đó tố cáo thứ Elo không có: **độ tin cậy của con số**. Elo cho bạn 1500 mà không nói 1500 đó dựa trên 3 trận hay 3.000 trận, dù hai người đó khác nhau hoàn toàn.

Glicko và TrueSkill giải đúng chỗ ấy: giữ **hai** số mỗi người — ước lượng trình độ và độ bất định của nó — rồi thu hẹp độ bất định theo số trận, nới ra khi người chơi nghỉ dài. Tôi dừng ở mức khái niệm vì công thức của chúng không kiểm chứng được trong bài này. Hệ quả thiết kế mới là thứ cần nhớ: **cửa sổ ghép trận không được là hằng số ±W** — nó phải rộng theo độ bất định của chính người đang chờ, nên người mới đáng lẽ có cửa sổ rộng ngay từ giây đầu.

---

## ⏸ Dừng lại — đoán trước #2

Cùng một luật nới cửa sổ (+50 mỗi 10 s), chạy ở năm mức λ từ giờ cao điểm tới 3 giờ sáng.

**λ giảm 100 lần — 20 xuống 0,2 người/giây. Thời gian chờ p50 tăng bao nhiêu lần?**

```
(a) Khoảng 100 lần — chờ tỉ lệ nghịch với λ
(b) Khoảng 25 lần
(c) Khoảng 10 lần
(d) Gần như không tăng — cửa sổ tự nới ra bù lại
```

Gợi ý: khi λ tụt thì cửa sổ **cũng** nới ra, vì ai cũng chờ lâu hơn — nên `P(...)` trong bất đẳng thức ở 3.2 không đứng yên.

### 3.4 Mô phỏng: cùng luật nới, năm mức tải

Đáp án là **(b)**. Chờ không tỉ lệ nghịch tuyến tính với λ, vì nới cửa sổ hấp thụ một phần cú sốc — nhưng nó hấp thụ bằng cách **chuyển thiệt hại sang cột chất lượng**.

Thiết lập *(mọi tham số là giả định của tôi)*: 5v5, tới theo Poisson, MMR ~ N(1500, 300), matchmaker 1 Hz, cửa sổ ±50 nới +50 mỗi 10 giây, hạt giống là người chờ lâu nhất, cửa sổ phải thoả **cả hai chiều**. Mỗi mức chạy 2 giờ mô phỏng, bỏ 20 phút đầu.

| λ (người/s) | Trận/giờ | Chờ p50 | **Chờ p99** | **Lệch MMR trung bình** | Lệch MMR p99 |
|---|---|---|---|---|---|
| 20 — cao điểm | 7.217 | 2,2 s | 26,8 s | 84 | 230 |
| 5 | 1.793 | 7,7 s | 56,8 s | 123 | 361 |
| 2 | 723 | 14,1 s | 100,0 s | 186 | 487 |
| 0,5 | 178 | 32,7 s | 196,9 s | 341 | 687 |
| 0,2 — 3 giờ sáng | 74 | 53,9 s | **351,5 s** | **534** | 985 |

λ giảm 100 lần: chờ p50 tăng **24,5 lần**, độ lệch MMR trung bình tăng **6,33 lần**. Cả hai cột cùng xấu đi. Đây là điểm quan trọng nhất của bảng:

> **Hồ người chơi cạn không phải là một đánh đổi — nó là mất trắng cả hai phía.** Đánh đổi chỉ tồn tại khi λ đủ lớn. Dưới một ngưỡng nào đó, bạn vừa chờ lâu vừa gặp trận lệch, và không tham số nào cứu được.

Hệ quả: mọi biểu đồ matchmaking phải vẽ **theo giờ trong ngày**. Một p99 gộp cả ngày là số vô nghĩa — 3 giờ sáng kéo nó lên trong khi 95 % người chơi không bao giờ gặp cảnh đó.

### 3.5 Nới cửa sổ: chọn tham số bằng bảng, không bằng cảm giác

Khoá λ = 2 người/giây, vặn đúng một núm — tốc độ nới:

<svg viewBox="0 0 700 240" role="img" aria-labelledby="gs30-b-t gs30-b-d" style="width:100%;height:auto">
<title id="gs30-b-t">Cửa sổ MMR nới dần theo thời gian chờ</title>
<desc id="gs30-b-d">Biểu đồ bậc thang: cửa sổ MMR quanh hạt giống 1500 bắt đầu ở cộng trừ 50 và mở rộng thêm 50 mỗi 10 giây, nên số người chơi lọt vào cửa sổ tăng dần cho tới khi đủ mười người.</desc>
<line x1="60" y1="200" x2="670" y2="200" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5"/>
<line x1="60" y1="24" x2="60" y2="200" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5"/>
<text x="365" y="224" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.8">thời gian chờ (giây)</text>
<text x="18" y="112" font-size="10" fill="currentColor" opacity="0.8">MMR</text>
<line x1="60" y1="112" x2="670" y2="112" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<text x="30" y="116" font-size="9" fill="currentColor" opacity="0.7">1500</text>
<rect x="60" y="104" width="100" height="16" fill="#3b82f6" fill-opacity="0.35"/>
<rect x="160" y="96" width="100" height="32" fill="#3b82f6" fill-opacity="0.32"/>
<rect x="260" y="88" width="100" height="48" fill="#3b82f6" fill-opacity="0.29"/>
<rect x="360" y="80" width="100" height="64" fill="#3b82f6" fill-opacity="0.26"/>
<rect x="460" y="72" width="100" height="80" fill="#3b82f6" fill-opacity="0.23"/>
<rect x="560" y="64" width="100" height="96" fill="#3b82f6" fill-opacity="0.20"/>
<text x="110" y="212" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.75">0</text>
<text x="210" y="212" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.75">10</text>
<text x="310" y="212" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.75">20</text>
<text x="410" y="212" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.75">30</text>
<text x="510" y="212" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.75">40</text>
<text x="610" y="212" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.75">50</text>
<text x="110" y="98" text-anchor="middle" font-size="9" fill="currentColor">±50</text>
<text x="210" y="90" text-anchor="middle" font-size="9" fill="currentColor">±100</text>
<text x="310" y="82" text-anchor="middle" font-size="9" fill="currentColor">±150</text>
<text x="410" y="74" text-anchor="middle" font-size="9" fill="currentColor">±200</text>
<text x="510" y="66" text-anchor="middle" font-size="9" fill="currentColor">±250</text>
<text x="610" y="58" text-anchor="middle" font-size="9" fill="currentColor">±300</text>
<text x="365" y="44" text-anchor="middle" font-size="10" font-style="italic" fill="currentColor" opacity="0.8">13,2 % dân số → 26,1 % → 38,3 % → 49,5 % → 59,5 % → 68,3 %</text>
</svg>

| Nới mỗi 10 s | Chờ p50 | Chờ p99 | Lệch MMR trung bình | Lệch MMR p99 |
|---|---|---|---|---|
| +5 | 17,9 s | 232,4 s | 102 | 240 |
| +25 | 15,7 s | 133,5 s | 145 | 404 |
| **+50** | **14,1 s** | **100,0 s** | **186** | **487** |
| +100 | 12,8 s | 74,6 s | 254 | 586 |
| +200 | 11,7 s | 56,5 s | 374 | 767 |
| +400 | 11,0 s | 43,8 s | 604 | 1.056 |

Đọc bảng theo **độ dốc**. Từ +5 lên +50: p99 giảm 132 giây, đổi lấy 84 điểm lệch — rất lời. Từ +50 lên +400: p99 giảm thêm 56 giây, đổi lấy **418 điểm lệch** — rất lỗ.

Còn cột p50 gần như đứng yên trên toàn bảng, 17,9 xuống 11,0 giây. Tham số này **chỉ tác động vào đuôi**. Đó là lý do vặn nó theo cảm giác luôn sai: người quyết định nhìn thời gian chờ của chính mình (gần như không đổi) rồi kết luận "nới thêm chả hại gì", trong khi thứ bị phá là chất lượng của **mọi** trận, kể cả trận ghép trong 5 giây.

Biến thể đáng thử: giữ tốc độ nới +50 nhưng **đặt trần cứng** — không bao giờ ghép hai người lệch quá X, thà để chờ tiếp:

| Trần cửa sổ | Chờ p50 | Chờ p99 | Lệch MMR trung bình |
|---|---|---|---|
| ±50 (không bao giờ nới) | 18,1 s | **465,9 s** (7,8 phút) | 84 |
| ±200 | 14,0 s | 127,1 s | 175 |
| ±400 | 13,9 s | 96,8 s | 186 |
| không trần | 14,1 s | 100,0 s | 186 |

Trần ±400 trùng khít với "không trần": **ở λ=2, cửa sổ hầu như không bao giờ cần vượt 400**. Cái trần đó miễn phí — nó chặn thảm hoạ ban đêm mà không đụng gì tới ban ngày. Loại tham số nên có mặc định, và mặc định tìm được bằng đúng một bảng như trên.

### 3.6 Ping là ràng buộc cứng hơn MMR

Bài 8 bóc ngân sách 182 ms từ lúc A bấm tới lúc B thấy, trong đó RTT 40 ms chiếm hai chặng 20 ms. Ghép một người RTT 240 ms vào trận đó đẩy tổng lên **382 ms**. Câu hỏi đắt tiền: **50 ms RTT thêm đáng bao nhiêu điểm MMR?** Trả lời được thì lựa chọn "chờ thêm 30 giây để có node gần" hay "vào ngay node xa" thành một phép so sánh, không còn là tranh cãi. Đây là một mô hình, không phải số đo. Giả định:

1. Một pha đấu tay đôi do **ai bắn trúng trước** quyết định.
2. Thời điểm mỗi người bắn trúng ~ N(µ, σ), **σ = 80 ms** — độ tản mạn của phản xạ người.
3. RTT thêm `d` ms cộng thẳng `d` vào thời điểm hiệu dụng của người bị trễ: nửa vì anh ta **thấy** muộn hơn, nửa vì phát bắn **tới server** muộn hơn.

Xác suất người bị trễ thắng khi đó là `Φ(−d / (σ√2))`. Đảo qua công thức Elo ra MMR tương đương:

| RTT thêm | Xác suất thắng | MMR tương đương |
|---|---|---|
| +10 ms | 46,5 % | −25 |
| +20 ms | 43,0 % | −49 |
| **+50 ms** | **32,9 %** | **−124** |
| +100 ms | 18,8 % | −254 |
| +200 ms | 3,9 % | −559 |

**50 ms RTT ≈ 124 MMR**, khoảng **2,5 MMR mỗi mili giây** trong vùng này. *(Mô hình. σ=80 ms là giả định — σ nhỏ hơn làm con số này lớn hơn nhiều. Bậc độ lớn "hàng trăm MMR cho hàng trăm mili giây" là thứ đáng tin, con số 124 thì không.)*

Nhưng con số chưa phải điểm chính. Khác biệt then chốt là dấu:

> Lệch MMR **ngẫu nhiên và đối xứng** — hôm nay bạn gặp người mạnh hơn, mai gặp người yếu hơn. Ping cao **một chiều và mọi trận** — nó không bao giờ đảo dấu cho bạn.

Đó là lý do region là ràng buộc cứng: người ping 200 ms không chỉ thua nhiều hơn, anh ta **không còn chơi cùng một trò chơi**. Bài 21 đã chỉ ra bù trễ làm được rất nhiều, nhưng nó bù cho người bắn và lấy đi tính nhất quán của người bị bắn.

Cái giá của việc tách region tính được ngay — cùng tổng 6 người/giây, chia cho số hồ khác nhau:

| Số region | λ mỗi hồ | Chờ p50 | Chờ p99 | Lệch MMR trung bình |
|---|---|---|---|---|
| 1 (gộp toàn cầu) | 6,0 | 6,6 s | 55,3 s | 115 |
| 2 | 3,0 | 11,0 s | 81,3 s | 157 |
| 3 | 2,0 | 14,1 s | 100,0 s | 186 |
| 6 | 1,0 | 21,4 s | 149,8 s | 251 |

Tách 1 → 6 region: chờ p50 tăng 3,2 lần, lệch MMR tăng 2,2 lần. **Cả hai cột cùng xấu**, vì tách region chính là làm cạn hồ — và 3.4 đã nói cạn hồ là mất trắng.

Lời giải thực dụng dùng đúng cơ chế nới cửa sổ nhưng trên trục RTT: khởi đầu chỉ nhận node dưới 30 ms, sau 45 giây nới lên 60 ms, sau 90 giây lên 100 ms rồi **dừng hẳn**. Trần trên trục ping phải thấp hơn nhiều trần trên trục MMR, đúng vì lý do một-chiều ở trên.

---

## ⏸ Dừng lại — đoán trước #3

Cho phép chơi theo nhóm: một nhóm 3 và một nhóm 2 ghép thành đội 5.

Đội A: một người 2500 và bốn người 1000. Đội B: năm người 1300. **Trung bình cộng bằng nhau, đều 1300.**

**Ai thắng, và hệ thống nên gán cho đội A con số MMR nào?**

```
(a) 50-50. Trung bình bằng nhau thì cân bằng.
(b) A thắng đậm. MMR đội nên là một hàm nghiêng mạnh về người mạnh nhất.
(c) B thắng đậm. Bốn người 1000 kéo cả đội xuống.
(d) Tuỳ thể loại game — và đó chính là lý do không có công thức chung
```

### 3.7 MMR của nhóm không phải trung bình cộng

Đáp án là **(d)**, nhưng (b) đúng cho phần lớn game hiện đại. Số cụ thể:

| Cách gộp | MMR đội A | MMR đội B | Chênh | A thắng |
|---|---|---|---|---|
| Trung bình cộng | 1.300 | 1.300 | 0 | 50,0 % |
| 0,5·trung bình + 0,5·max | 1.900 | 1.300 | +600 | 96,9 % |
| Log-sum-exp (cộng dồn theo thang Elo) | 2.221 | 1.300 | +921 | 99,5 % |

Ba cách gộp, **cùng một đội hình**, ba dự đoán từ 50 % tới 99,5 %. Đây là quyết định thiết kế lớn nhất của cả hệ thống, và nó không có đáp án phổ quát:

- Game có **cơ chế carry mạnh** (MOBA, battle royale theo đội): trung bình cộng sai nặng, phải nghiêng về **max**.
- Game **cần phối hợp toàn đội** (chiếm điểm, ai cũng phải đúng vị trí): mắt xích yếu nhất nặng hơn, phải nghiêng về **min**.

Thêm một khoản không nằm trong công thức nào ở trên: **nhóm nói chuyện được với nhau**. Năm người trên voice chat mạnh hơn năm người lạ cùng MMR, và khoản chênh đó không suy ra được từ MMR cá nhân — chỉ đo được bằng tỉ lệ thắng theo cỡ nhóm sau khi đã cho họ chơi. Cộng một khoản thưởng theo cỡ nhóm vào MMR đội, rồi **hiệu chỉnh bằng dữ liệu thắng thua thật**.

Còn bài toán xếp túi — ghép nhóm 3 với nhóm 2 cho đủ 5 — hoá ra **không phải vấn đề**. Mô phỏng với phân bố cỡ nhóm {1: 55 %, 2: 20 %, 3: 10 %, 4: 5 %, 5: 10 %}, λ=6 người/giây:

| Cỡ nhóm | Chờ p50 | Chờ p99 |
|---|---|---|
| 1 (đi một mình) | 8,0 s | 66,7 s |
| 2 | 8,2 s | 54,4 s |
| 3 | 7,7 s | 68,1 s |
| 4 | 7,7 s | 56,8 s |
| **5** | **5,0 s** | **41,8 s** |

Nhóm 4 — cái tôi tưởng bị phạt nặng nhất vì cần đúng một người lẻ — chờ **bằng** người đi một mình. Nhóm 5 còn chờ **nhanh hơn 37,5 %** vì nó lấp trọn một đội, không phải khớp với ai. Hạ λ xuống 1 người/giây, hình dạng bảng vẫn thế.

Kết luận trái trực giác: **cái giá của party nằm ở định giá, không nằm ở xếp túi.** Xếp túi tự giải xong khi hồ đủ sâu; định giá sai một nhóm 5 người thì mọi trận nó tham gia đều hỏng, và không thời gian chờ nào sửa được.

### 3.8 Backfill: ghép người vào một trận đã chạy

Với xác suất mỗi cá nhân rời trận là **3 %**, một trận 10 người có ít nhất một người rời với xác suất:

```
1 − 0,97^10  =  1 − 0,737424  =  26,3 %
```

Hơn một phần tư số trận. Nâng lên 5 % thành **40,1 %**; hạ xuống 1 % vẫn còn **9,6 %**. Trận thiếu người là trận hỏng cho cả chín người còn lại — backfill không phải tính năng phụ. Nhưng nó là bài toán khác hẳn matchmaking, khó hơn ở ba chỗ:

**Một, trận đã diễn ra.** Người vào phút thứ 7 của trận 10 phút nhận một tình thế anh ta không tạo ra — có thể đang thua 3–14 và không cách nào gỡ. Tính kết quả đó vào MMR của anh ta là trừng phạt anh ta vì đã giúp bạn. Xử lý thông thường: **không tính MMR cho người backfill**, hoặc chỉ tính phần thắng.

**Hai, hồ ứng viên hẹp hơn nhiều.** Ghép trận mới chọn 10 người trong cả hàng đợi và được phép chờ. Backfill cần **một** người, đúng region, đúng khoảng MMR, **ngay bây giờ** — chờ 40 giây thì trận có khi đã xong. Cửa sổ MMR của backfill vì thế phải rộng hơn ngay từ giây đầu.

**Ba, nó phá một giả định của game plane.** Bài 2 nói node nhận người qua vé ký sẵn ở bước 6–7, lúc room chưa chạy. Backfill buộc node mở slot **giữa lúc đang tick**, dựng lại toàn bộ state cho một client bắt đầu từ số không trong khi 9 người kia vẫn chạy 60 Hz. Đó là lý do **full snapshot** ở bài 23 và 25 phải tồn tại bên cạnh delta: người mới cần baseline trước khi delta có nghĩa.

Có thể loại đừng cố backfill: đấu xếp hạng tính điểm, giải đấu, và mọi trận ngắn hơn ~5 phút — thời gian tìm người chiếm phần đáng kể của trận.

### 3.9 Ba kiểu lạm dụng gắn thẳng vào matchmaking

Bài 34 phân loại đầy đủ cheat. Ở đây chỉ ba thứ tấn công vào **chính con số MMR**:

| Kiểu | Cách làm | Vì sao matchmaking không tự chặn được |
|---|---|---|
| **Smurf** | Người giỏi tạo tài khoản mới, MMR khởi điểm 1500 | Con số không sai, nó chỉ chưa hội tụ. Đây là chỗ độ bất định ở 3.3 đáng giá: K lớn + cửa sổ rộng cho tài khoản mới rút ngắn giai đoạn phá hoại. |
| **Dodge** | Thấy đội hình xấu thì thoát trước khi trận bắt đầu | Người dodge được ghép lại ngay, 9 người kia quay lại hàng đợi. Chi phí đổ lên người khác — phạt bằng thời gian chờ tăng dần, không phạt bằng MMR. |
| **Win-trading** | Hai nhóm hẹn nhau vào hàng đợi cùng lúc, thay nhau thua | Cần λ **thấp** mới hẹn được — nên nó là kiểu tấn công của giờ đêm và bậc cao nhất, đúng hai chỗ hồ cạn nhất. |

Cả ba đều nặng hơn khi λ nhỏ. Hồ cạn không chỉ làm chờ lâu và trận lệch — nó còn khiến kẻ tấn công kiểm soát được một phần lớn hàng đợi.

---

## 4. Đo cái gì

Bài 8 nói đọc trung bình sẽ báo cáo một hệ thống đang giật là khoẻ mạnh. Ở đây còn đúng hơn: bảng 3.5 cho thấy tham số quan trọng nhất **chỉ tác động vào đuôi** — p50 đi từ 17,9 xuống 11,0 giây trong khi p99 đi từ 232 xuống 44.

| Metric | Vì sao | Cảnh báo khi |
|---|---|---|
| Chờ **p50 và p99**, tách theo **giờ + region + bậc** | Gộp lại là vô nghĩa: 3 giờ sáng và bậc cao nhất kéo p99 lên, che mất vấn đề thật | p99 vượt 3× p50 kéo dài |
| **Phân phối** lệch MMR trong trận | 604 trung bình và 1.056 ở p99 là hai câu chuyện khác nhau | tỉ lệ trận lệch > 400 tăng |
| Cửa sổ MMR **tại lúc ghép** | Đo trực tiếp hệ thống đang phải nới bao xa mới làm việc được | phân vị 90 chạm trần cứng |
| Tỉ lệ trận **có người rời trong 2 phút đầu** | Rời sớm thường là dodge trá hình, khác hẳn rớt mạng | vượt mức nền theo bậc |
| Tỉ lệ **backfill thành công** + độ trễ | Backfill hỏng thầm lặng — trận vẫn chạy, chỉ thiếu người | tỉ lệ tụt hoặc p50 vượt 30 s |
| **Tỉ lệ thắng theo cỡ nhóm** | Cách duy nhất hiệu chỉnh khoản thưởng nhóm ở 3.7 | lệch khỏi 50 % quá 3 điểm phần trăm |

Metric dễ quên nhất: **tỉ lệ huỷ hàng đợi trước khi được ghép**. Nếu 30 % người bấm huỷ ở giây thứ 40 thì p99 = 100 giây là số của một mẫu đã bị lọc còn người kiên nhẫn nhất — bạn đang đo sai tập.

---

## 5. Tính tay

**Bài 1.** Game của bạn có λ = 1,2 người/giây vào hàng đợi lúc 22 giờ, MMR ~ N(1500, 300), trận 6v6 (12 người), cửa sổ khoá cứng ±75 quanh một người ở đúng 1500. Ước lượng thời gian gom đủ người bằng phép nhân ở 3.2.

<details><summary>Đáp án</summary>

Cửa sổ ±75 rộng 150 điểm → 150 × 0,00133 = **0,1995** (≈20 % dân số).
1,2 × 0,1995 = 0,239 người hợp lệ/giây → 12 / 0,239 = **50,1 giây** (chặn trên thô; thực tế khoảng một nửa, ~25 giây).

</details>

**Bài 2.** Đội bạn ping 25 ms tới node, đội đối thủ ping 75 ms. Dùng mô hình ở 3.6, chênh lệch này tương đương bao nhiêu MMR, và nó lớn hơn hay nhỏ hơn khoản lệch MMR trung bình mà cấu hình "+50 mỗi 10 giây" tạo ra ở λ=2?

<details><summary>Đáp án</summary>

Chênh 50 ms → **124 MMR** nghiêng về phía bạn. Cấu hình +50/10 s ở λ=2 cho lệch MMR trung bình **186 điểm**. 124 < 186, nên chênh ping này **nhỏ hơn** nhiễu mà chính matchmaker đang tạo ra: chưa đáng từ chối ghép trận. Nhưng 100 ms (254 MMR) thì vượt hẳn và đáng chặn.

</details>

**Bài 3.** Bạn muốn tỉ lệ "trận có người rời" xuống dưới 15 % cho trận 10 người. Xác suất rời của mỗi cá nhân phải xuống bao nhiêu?

<details><summary>Đáp án</summary>

`(1−p)^10 > 0,85` → `1−p > 0,85^(1/10) = 0,98388` → **p < 1,61 %**.
Giảm gần một nửa tỉ lệ rời cá nhân (3 % → 1,61 %) chỉ để cắt trận hỏng từ 26,3 % xuống 15 %. Đó là lý do backfill tồn tại: sửa hậu quả rẻ hơn phòng ngừa.

</details>

---

## 6. Chuyển giao

1. Bậc xếp hạng cao nhất chiếm 0,5 % người chơi. Bậc đó cần luật nới cửa sổ khác thế nào, và vì sao bảng 3.5 không dùng trực tiếp được cho nó?

2. Một người bậc cao nhất, 3 giờ sáng, hàng đợi có đúng 4 người. Ba lựa chọn: bắt chờ, ghép với người kém 900 MMR, hoặc ghép với người cùng trình ở region cách 180 ms. Xếp hạng ba lựa chọn và nêu số bạn dùng để xếp.

3. Chế độ chơi mới chia đôi λ của hàng đợi hiện tại. Dùng bảng 3.4 ước lượng chế độ cũ xấu đi bao nhiêu, và nêu ngưỡng λ mà dưới đó bạn nên từ chối ra chế độ mới.

4. Backfill rút người từ chính hàng đợi ghép trận mới, làm λ hiệu dụng giảm. Với 26,3 % trận cần backfill, tính xem nó ăn bao nhiêu phần trăm luồng vào — rồi chỉ ra vòng lặp phản hồi khi tỉ lệ rời trận tăng đột biến.

5. p99 chờ đang là 100 giây. Bạn làm nút "Huỷ tìm trận" nổi bật hơn, p99 tụt còn 62 giây mà matchmaker không đổi một dòng. Giải thích, rồi nói metric nào phải thêm.

6. **Câu khó nhất.** MMR hội tụ về trình độ thật nghĩa là rốt cuộc ai cũng thắng khoảng 50 % số trận. Nhưng người chơi ở lại vì cảm giác **tiến bộ**, mà tiến bộ cần tỉ lệ thắng trên 50 %. Vậy một hệ thống matchmaking hoàn hảo về cân bằng là một hệ thống làm người chơi bỏ game. Giải mâu thuẫn này thế nào **mà không nói dối người chơi** — và cách bạn chọn đụng vào những cột nào trong bảng ở mục 4?

---

## 7. Tóm tắt

- Matchmaking bị ràng buộc bởi một phép nhân: `λ · P(|ΔMMR| ≤ W) · t ≥ N`. Ba biến, một ràng buộc — siết hai thì cái thứ ba bị ép. Hàng đợi chỉ có một biến, nên nó không phải hàng đợi.
- Tính tay trước khi code: λ=2/s, MMR ~ N(1500,300), cửa sổ ±50 → 13,3 % dân số → 0,266 người hợp lệ/giây → **37,6 giây** gom đủ 10 người.
- Vặn tốc độ nới cửa sổ từ +5 lên +400 mỗi 10 giây (λ=2): chờ p99 **232,4 → 43,8 s**, lệch MMR **102 → 604**. Cùng một hệ thống, một tham số, hai chiều ngược nhau.
- Tham số đó **chỉ tác động vào đuôi**: p50 chỉ đi từ 17,9 xuống 11,0 giây trên toàn dải. Ai đánh giá nó bằng thời gian chờ của chính mình sẽ luôn nới quá tay.
- λ giảm 100 lần (20 → 0,2 người/s): chờ p50 tăng **24,5 lần**, lệch MMR tăng **6,33 lần**. Hồ cạn không phải đánh đổi mà là mất trắng cả hai phía — và mở cửa cho win-trading. Tách 1 → 6 region ở tổng λ=6/s cho đúng hiệu ứng đó: p50 tăng 3,2 lần, lệch 2,2 lần.
- Trần cứng ±400 cho kết quả trùng "không trần" ở λ=2: miễn phí ban ngày, chặn thảm hoạ ban đêm.
- Elo: chênh 400 điểm nghĩa là thắng 90,9 %; chênh 100 điểm chỉ 64,0 %, không phải "bị nghiền". Một con số là không đủ — thứ thiếu là **độ bất định**, và thiếu nó thì cửa sổ của người mới bị đặt sai ngay từ trận đầu.
- Mô hình quy đổi (σ=80 ms, ăn thua ở phát bắn đầu): **+50 ms RTT ≈ −124 MMR**, khoảng 2,5 MMR mỗi mili giây. Bậc độ lớn đáng tin, con số cụ thể thì không. Lệch MMR đối xứng, ping cao một chiều — nên trần trục ping phải thấp hơn nhiều trần trục MMR.
- MMR nhóm: cùng đội hình {2500, 1000×4} cho 1.300 theo trung bình cộng và 2.221 theo log-sum-exp — thắng 50,0 % so với 99,5 %. Còn xếp túi party thì **không phải vấn đề**: nhóm 4 chờ bằng người đi một mình, nhóm 5 nhanh hơn 37,5 %.
- Tỉ lệ rời cá nhân 3 % → **26,3 %** số trận 10 người có người rời; muốn xuống dưới 15 % phải ép cá nhân xuống dưới 1,61 %. Backfill rẻ hơn phòng ngừa — nhưng nó cần full snapshot giữa lúc node đang tick.
- Đo p50 **và** p99, tách theo giờ, region, bậc. Thiếu tỉ lệ huỷ hàng đợi thì bạn đang đo một mẫu chỉ còn người kiên nhẫn nhất.

→ **Bài 31 — Persistence, meta services & graceful shutdown**: trận đã ghép, đã chơi, đã xong. Bài sau hỏi cái gì còn lại sau khi trận kết thúc — và cái gì mất khi node chết giữa chừng.
