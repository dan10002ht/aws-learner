# Bài 1 — Vì sao game server không thể là một BE App

## 1. Mục tiêu

Sau bài này bạn có thể:

- Chỉ ra **bằng phép tính** vì sao một thiết kế backend đúng chuẩn lại vỡ ở game, và vỡ ở đúng con số nào.
- Giải thích vì sao **CPU 8% mà hệ thống vẫn hỏng** là chuyện bình thường ở game server.
- Suy ra chuỗi bắt buộc **RAM-first → stateful → một trận một chủ sở hữu**, và biết mỗi mắt xích ép ra mắt xích sau như thế nào.
- Phân biệt **ý định (intent)** và **kết quả (result)** trong gói tin client gửi lên, kể cả ở trường hợp bẫy.
- Xếp state của một game vào **ba tầng** và nói được cái nào mất thì chịu được.
- Nói rõ phần nào của một hệ thống game **vẫn là BE App thuần tuý** mà bạn đã biết làm.

---

## 2. Triệu chứng

Bạn dựng một game multiplayer nhỏ. Bạn là dev backend có nghề, nên bạn làm theo cách đã thắng hàng trăm lần: state để ở Redis, node nào xử lý cũng được, scale ngang thoải mái.

```
Client gửi "tôi đi sang phải"
   → node bất kỳ nhận
   → đọc vị trí của tất cả player trong phòng từ Redis
   → tính vị trí mới
   → ghi lại Redis
   → gửi state mới về cho mọi người
60 lần mỗi giây.
```

Chạy với 2 người: mượt. 4 người: mượt. **Người thứ 6 vào phòng thì mọi thứ sụp.** Độ trễ nhảy lên hàng giây, nhân vật giật như ảnh chụp.

Bạn mở monitoring. **CPU 8%. RAM 200 MB. Redis rảnh rỗi. Không một dòng error.**

Cùng con máy đó đang phục vụ REST API 40.000 request/giây không hề hấn gì.

---

## ⏸ Dừng lại — đoán trước #1

Chọn một đáp án trước khi đọc tiếp. Nói thành lời cũng được, nhưng phải chọn — bạn sẽ nhớ mục sau lâu hơn nhiều nếu lát nữa phát hiện mình chọn sai.

**Vì sao nó chết ở đúng 6 người, trong khi CPU chỉ 8%?**

```
(a) Redis bị nghẽn — cần cluster
(b) Chưa tối ưu code — cần profile rồi tối ưu hot path
(c) 8% CPU đã là mức trần thật, monitoring đo sai
(d) Không có gì "chết" cả — hệ thống vẫn làm đúng việc, chỉ là không kịp giờ
```

---

## 3. Lý thuyết

### 3.1 Số học, không phải hiệu năng

Đáp án là **(d)**, và đây là phép tính chứng minh.

Ở 60 Hz, mỗi vòng lặp có đúng **16,67 ms**. Thiết kế trên, mỗi vòng, với mỗi player, đọc state của tất cả player khác — tức **N² lần đọc Redis**. Mỗi lần đọc cùng datacenter tốn khoảng **0,5 ms**:

| Số player | Số lệnh Redis | Thời gian | % ngân sách một tick | |
|---|---|---|---|---|
| 2 | 4 | 2,0 ms | 12 % | vừa |
| 4 | 16 | 8,0 ms | 48 % | vừa |
| 5 | 25 | 12,5 ms | 75 % | vừa |
| **6** | **36** | **18,0 ms** | **108 %** | **vỡ** |
| 8 | 64 | 32,0 ms | 192 % | vỡ |
| 12 | 144 | 72,0 ms | 432 % | vỡ |
| 20 | 400 | 200,0 ms | 1.200 % | vỡ |

Ngưỡng gãy nằm ở `N² × 0,5 ≤ 16,67`, tức **N ≤ 5,77**. Nó chết ở người thứ 6 vì toán học bảo nó phải chết ở người thứ 6. Không có gì để profile, không có hot path nào để tối ưu.

CPU 8% vì tiến trình **không tính toán gì cả** — nó ngồi chờ mạng. Đây là điểm đầu tiên phải đổi trong đầu:

> Ở BE App, hết CPU nghĩa là quá tải. Ở game server, **CPU thấp mà vẫn vỡ là chuyện bình thường** — vì thứ bạn tiêu không phải chu kỳ CPU, mà là **thời gian**, và thời gian thì tiêu kể cả khi bạn không làm gì.

Và điều quan trọng hơn con số: **hệ thống không hề lỗi.** Nó vẫn trả về kết quả đúng. Chỉ là đúng lúc 72 ms sau, trong khi hạn là 16,67 ms.

> **Trong hệ real-time, chậm bằng hỏng.** Một kết quả đúng trả về muộn là một kết quả sai. Câu này sẽ quay lại ở mọi chương còn lại của course.

### 3.2 Sửa cái sai — và phát hiện ra mình thật sự muốn gì

Bạn sẽ phản đối ngay, và phản đối đúng: *đọc N² lần là ngu, dùng `MGET` một phát lấy hết.*

Chuẩn. Xuống còn 1 round-trip đọc + 1 round-trip ghi mỗi tick = **1,0 ms = 6 % ngân sách**. Vấn đề biến mất. Bây giờ 100 người chơi cũng chạy được.

Nhưng hãy nhìn kỹ cái bạn vừa làm:

```
mỗi tick:  MGET toàn bộ world  →  giờ toàn bộ world đang nằm trong RAM tiến trình
           tính toán trên RAM
           MSET toàn bộ world  →  đẩy ngược ra
```

Bạn vừa **tải cả thế giới vào RAM, xử lý trong RAM, rồi ghi ra** — 60 lần mỗi giây. Nghĩa là bạn *đã* dùng RAM làm nơi tính toán rồi. Redis không còn đóng vai database nữa; nó chỉ là chỗ cất đồ giữa hai tick, và bạn trả 1,0 ms tiền thuê mỗi lần.

Câu hỏi tự nhiên: **vậy giữ luôn trong RAM giữa các tick có được không?**

Được, và nó tiết kiệm không chỉ 1 ms. Đặt các bậc độ lớn cạnh nhau:

| Đọc từ đâu | Độ trễ | Chậm hơn RAM |
|---|---|---|
| RAM, trúng cache CPU | ~1 ns | — |
| RAM, trượt cache | ~100 ns | 100 × |
| SSD NVMe | ~100 µs | 100.000 × |
| Redis cùng datacenter | ~500 µs | **500.000 ×** |
| Postgres cùng datacenter | ~2 ms | 2.000.000 × |

*(Bậc độ lớn, không phải hằng số — thay đổi theo phần cứng, mạng và tải. Cái đáng nhớ là khoảng cách giữa các dòng, không phải chữ số.)*

Không có kỹ thuật tối ưu nào bắc qua được khoảng cách 500.000 lần. Đây là lý do câu **"database không được nằm trên critical path của tick"** là bắt buộc, không phải khuyến nghị.

### 3.3 Nhưng nếu giữ trong RAM thì… RAM của node nào?

Đây là chỗ tư duy BE App gãy hẳn.

Giữ world trong RAM thì hai node không thể cùng xử lý một trận. Nếu cùng xử lý, cả hai cùng đọc–sửa–ghi trên cùng dữ liệu, và bạn mất update (lost update) — kinh điển.

"Thì dùng distributed lock." Được, tính thử: giữ lock 60 lần mỗi giây, mỗi lần tối thiểu 2 round-trip (xin + trả) = **1 ms, tức 6 % ngân sách chỉ để xin phép** — chưa làm gì cả. Tệ hơn: nếu node B phải chờ node A nhả lock thì B đứng im hết một tick. Bạn vừa dựng một hệ thống mà **hai node xếp hàng để cùng làm một việc mà một node làm được**.

Kết luận không tránh được: **một trận đấu chỉ có đúng một chủ sở hữu.** Một tiến trình, giữ toàn bộ state trong RAM của nó, không chia sẻ với ai.

Đó chính là định nghĩa của **stateful**. Và giờ toàn bộ hạ tầng bạn quen đều gãy theo:

| | BE App | BE Game |
|---|---|---|
| Định tuyến | LB round-robin, node nào cũng đúng | Phải tới **đúng** node đang giữ trận đó → route theo `match_id` |
| Deploy | Rolling: kill pod, LB tự lo | Kill pod = **xoá một trận đang diễn ra** → phải drain: cấm nhận trận mới, chờ trận cũ xong |
| Autoscale | Theo CPU | CPU gần như phẳng dù 1 hay 100 player → scale theo **số trận** |
| Quá tải | Traffic tăng → thêm instance | Một trận 100 người quá tải? → thêm instance **không cứu được gì** |

Dòng cuối là chỗ đau nhất và đáng nghĩ lâu nhất. 100 người trong một trận phải nhìn thấy nhau, tức phải nằm trong cùng một simulation, tức cùng một tiến trình. Muốn scale, bạn phải **cắt thế giới ra** — chia zone, chia phòng, chia shard. Và cắt thế giới là một quyết định **thiết kế game**, không phải quyết định hạ tầng: bạn phải chọn chỗ nào trong thế giới người chơi ít đi qua nhất để đặt đường cắt. Bài 32 sẽ quay lại đúng chuyện này.

Đây là lần đầu bạn gặp một tính chất đặc trưng của ngành: **ranh giới giữa gameplay và kiến trúc bị xoá.** Ở BE App, hai thứ đó tách nhau.

### 3.4 Điều gì thực sự đổi — một câu

Ba mục vừa rồi đều suy ra từ đúng một thay đổi. Nếu chỉ nhớ một câu trong bài này:

> **Thế giới tiếp tục vận động kể cả khi không ai gửi gì tới.**

<svg viewBox="0 0 720 250" role="img" aria-labelledby="gs1-a-t gs1-a-d" style="width:100%;height:auto">
<title id="gs1-a-t">Công việc do request khởi tạo so với công việc do thời gian khởi tạo</title>
<desc id="gs1-a-d">Bên trái, BE App rảnh cho tới khi có request rồi trả response và rảnh trở lại. Bên phải, game server chạy tick đều đặn 16,67 mili giây một lần kể cả khi không có ai gửi gì.</desc>
<text x="15" y="22" font-size="13" font-weight="bold" fill="currentColor">BE APP — công việc do REQUEST khởi tạo</text>
<rect x="15" y="34" width="320" height="200" rx="8" fill="#64748b" fill-opacity="0.10" stroke="currentColor" stroke-opacity="0.25"/>
<text x="30" y="58" font-size="11" fill="currentColor" opacity="0.65">rảnh, chờ …</text>
<rect x="30" y="70" width="290" height="26" rx="5" fill="#3b82f6" fill-opacity="0.28"/>
<text x="40" y="87" font-size="11" fill="currentColor">request → auth → logic → DB → response</text>
<text x="30" y="118" font-size="11" fill="currentColor" opacity="0.65">rảnh, chờ …</text>
<rect x="30" y="130" width="290" height="26" rx="5" fill="#3b82f6" fill-opacity="0.28"/>
<text x="40" y="147" font-size="11" fill="currentColor">request → auth → logic → DB → response</text>
<text x="30" y="178" font-size="11" fill="currentColor" opacity="0.65">rảnh, chờ …</text>
<text x="30" y="212" font-size="11" font-style="italic" fill="currentColor">Không request = không tốn gì</text>
<text x="385" y="22" font-size="13" font-weight="bold" fill="currentColor">BE GAME — công việc do THỜI GIAN khởi tạo</text>
<rect x="385" y="34" width="320" height="200" rx="8" fill="#84cc16" fill-opacity="0.10" stroke="currentColor" stroke-opacity="0.25"/>
<line x1="405" y1="50" x2="405" y2="205" stroke="currentColor" stroke-opacity="0.35" stroke-width="1"/>
<circle cx="405" cy="58" r="4" fill="#84cc16"/><text x="418" y="62" font-size="10" fill="currentColor">t=0,000 tick 1</text>
<circle cx="405" cy="82" r="4" fill="#84cc16"/><text x="418" y="86" font-size="10" fill="currentColor">t=0,017 tick 2</text>
<circle cx="405" cy="106" r="4" fill="#84cc16"/><text x="418" y="110" font-size="10" fill="currentColor">t=0,033 tick 3 — không ai gửi gì</text>
<circle cx="405" cy="130" r="4" fill="#84cc16"/><text x="418" y="134" font-size="10" fill="currentColor">t=0,050 tick 4 — đạn vẫn bay</text>
<circle cx="405" cy="154" r="4" fill="#84cc16"/><text x="418" y="158" font-size="10" fill="currentColor">t=0,067 tick 5 — độc vẫn trừ máu</text>
<circle cx="405" cy="178" r="4" fill="#84cc16"/><text x="418" y="182" font-size="10" fill="currentColor">t=0,083 tick 6 — hồi chiêu vẫn chạy</text>
<text x="418" y="200" font-size="10" fill="currentColor" opacity="0.65">… mãi mãi</text>
<text x="400" y="222" font-size="11" font-style="italic" fill="currentColor">Không request = tốn y hệt</text>
</svg>

Từ câu đó suy ra: có việc phải làm liên tục → phải giữ state để làm → state phải ở RAM vì DB quá chậm → RAM thuộc về một tiến trình → stateful → hạ tầng đổi.

**Không có bước nào là lựa chọn kiến trúc. Tất cả đều là hệ quả bắt buộc.**

---

## ⏸ Dừng lại — đoán trước #2

Server là trọng tài duy nhất. Vậy client gửi cái gì lên thì hợp lý?

Xếp 5 gói tin sau thành hai nhóm — **chấp nhận được** và **không bao giờ**:

```
1. {"type": "move",   "position": {"x": 145, "y": 82}}
2. {"type": "move",   "keys": ["W", "D"]}
3. {"type": "attack", "targetId": 42, "damage": 150}
4. {"type": "attack", "aim": {"x": 0.7, "y": 0.7}}
5. {"type": "pickup", "itemId": 7}
```

Gói số 5 là gói đáng nghĩ nhất. Nghĩ xong hãy đọc tiếp.

---

### 3.5 Client luôn nói dối

Ở BE App bạn không tin *dữ liệu* client gửi, nhưng bạn tin *sự kiện* nó báo: nó nói "tôi bấm mua hàng" thì đúng là nó bấm mua hàng. Ở BE Game, client là một binary chạy trên máy người lạ, đã bị dịch ngược và sửa từ lâu.

Phân loại theo một tiêu chí duy nhất: **đây là ý định, hay là kết quả?**

| Gói | Loại | Vì sao |
|---|---|---|
| 1. `position (145, 82)` | ✗ **kết quả** | Client tự quyết vị trí = teleport, speed hack |
| 2. `đang giữ W và D` | ✓ **ý định** | Server tự tính đi được tới đâu |
| 3. `trúng id 42, 150 dmg` | ✗ **kết quả** | Client tự quyết sát thương = aimbot, one-hit kill |
| 4. `bấm bắn, hướng này` | ✓ **ý định** | Server tự raycast xem trúng ai |
| 5. `nhặt item id 7` | **bẫy** | xem dưới |

Gói 5 trông như ý định, nhưng nó nhắc tới `itemId: 7` — một thứ thuộc về thế giới. Client đang khẳng định *item đó tồn tại, ở gần tôi, và chưa ai nhặt*. Ba khẳng định, cả ba đều phải do server kiểm chứng lại: item còn đó không, khoảng cách có hợp lệ không, có ai nhặt trước không.

Quy tắc tổng quát rút ra:

> **Mọi tham số trỏ tới thế giới đều là một khẳng định cần kiểm chứng.** Ý định thuần tuý chỉ chứa thứ thuộc về bản thân người chơi — phím đang bấm, hướng đang nhìn.

Bài 33 sẽ mổ xẻ đầy đủ nguyên tắc này, và bài 34 liệt kê cái gì server chặn được tuyệt đối, cái gì chỉ giảm được.

**Cái giá thật của authoritative.** Nếu server quyết mọi thứ, server phải mô phỏng lại toàn bộ luật chơi: di chuyển, va chạm, sát thương, hồi chiêu. Nhưng client cũng cần luật đó để prediction (bài 18). Nghĩa là:

> Bạn viết luật chơi **hai lần**, ở hai nơi, và chúng phải khớp tới từng phép nhân. Lệch một chút thôi là nhân vật rung giật liên tục.

Không có cách né. Chỉ có cách giảm đau, và nên quyết ngay từ đầu vì sửa sau rất đắt: dùng chung một ngôn ngữ và chia sẻ package luật chơi; hoặc compile logic simulation sang WASM để hai phía nạp cùng một binary; hoặc chấp nhận viết hai lần nhưng tách logic thành module thuần tuý và có bộ test chạy cùng một kịch bản trên cả hai bản, so từng bước.

### 3.6 Vậy Database đi đâu

Nó không biến mất, nó đổi vai. Phân loại thực dụng theo câu hỏi **mất thì sao**:

| Tầng state | Ví dụ | Ở đâu | Nhịp ghi | Mất thì sao |
|---|---|---|---|---|
| **Simulation** | vị trí, vận tốc, HP, cooldown, đạn đang bay | RAM game node | không ghi | mất trận đó — chịu được |
| **Session** | ai đang ở node nào, hàng đợi ghép trận | Redis | vài giây | player vào lại |
| **Persistent** | tài khoản, inventory, vàng, rank, lịch sử | Postgres/Firestore | ngay khi đổi | **không được phép mất** |

Quy tắc một dòng:

> **Cái gì mất đi mà người chơi sẽ mở ticket khiếu nại thì phải xuống DB ngay tại thời điểm nó đổi.** Còn lại giữ trong RAM.

Hai lỗi kinh điển của người từ BE App sang, và cả hai đều là **nhầm hàng giữa các dòng trên**: ghi vị trí xuống DB mỗi tick (chết vì I/O, đúng như mục 3.1), hoặc giữ số vàng chỉ trong RAM (mất tiền của người chơi khi node crash).

Ở giữa hai thái cực có một vùng xám thật sự khó: **item vừa rơi ra trong trận, chưa ai nhặt**. Nó là simulation state hay persistent state? Không có đáp án đúng — mỗi game chọn khác nhau, và đó là một quyết định sản phẩm chứ không phải kỹ thuật.

### 3.7 Tin tốt: một nửa hệ thống vẫn là thứ bạn đã biết

<svg viewBox="0 0 700 220" role="img" aria-labelledby="gs1-b-t gs1-b-d" style="width:100%;height:auto">
<title id="gs1-b-t">Hai nửa của một hệ thống game online</title>
<desc id="gs1-b-d">Nửa trên là các dịch vụ stateless quen thuộc như login, shop, leaderboard chạy trên REST. Nửa dưới là phần stateful gồm ghép trận, game node và simulation chạy trên WebSocket hoặc UDP.</desc>
<rect x="30" y="24" width="420" height="76" rx="10" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="46" y="48" font-size="12" font-weight="bold" fill="currentColor">Login · Shop · Inventory · Leaderboard</text>
<text x="46" y="68" font-size="12" font-weight="bold" fill="currentColor">Battle pass · Bạn bè · Guild · Thư</text>
<text x="46" y="88" font-size="10" fill="currentColor" opacity="0.7">REST / GraphQL — stateless, scale ngang tự do</text>
<text x="470" y="52" font-size="11" font-weight="bold" fill="currentColor">BE App thuần tuý</text>
<text x="470" y="70" font-size="10" fill="currentColor" opacity="0.7">bạn đã làm nhiều năm</text>
<rect x="30" y="120" width="420" height="76" rx="10" fill="#84cc16" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="46" y="144" font-size="12" font-weight="bold" fill="currentColor">Ghép trận → Game node → Simulation</text>
<text x="46" y="164" font-size="12" font-weight="bold" fill="currentColor">tick · replication · prediction</text>
<text x="46" y="184" font-size="10" fill="currentColor" opacity="0.7">WebSocket / UDP — stateful, route theo match_id</text>
<text x="470" y="148" font-size="11" font-weight="bold" fill="currentColor">Thế giới mới</text>
<text x="470" y="166" font-size="10" fill="currentColor" opacity="0.7">phải học — chương 2 tới 9</text>
<line x1="240" y1="100" x2="240" y2="120" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" stroke-dasharray="4 3"/>
<text x="250" y="115" font-size="10" font-style="italic" fill="currentColor" opacity="0.8">ranh giới — chỗ khó nhất</text>
</svg>

Theo tỉ lệ dòng code của một game online thương mại, phần simulation real-time thường là **thiểu số**. Kinh nghiệm backend của bạn phủ nguyên nửa trên, và nửa trên mới là chỗ chứa doanh thu.

Thứ phải học thêm là nửa dưới, **cộng với ranh giới giữa hai nửa**: ai gọi ai, state đi qua ranh giới thế nào, và làm sao nửa dưới sập mà nửa trên vẫn sống. Bài 2 vẽ đầy đủ bản đồ đó.

---

## 4. "Tick" — ba nghĩa khác nhau, phân biệt ngay

Từ này bị dùng lẫn cho ba thứ. Chương 2 sẽ rối nếu không tách bây giờ:

- **Simulation tick rate** — bao nhiêu bước mô phỏng mỗi giây. Tốn **CPU**.
- **Snapshot rate** — bao nhiêu lần mỗi giây server gửi state đi. Tốn **bandwidth**.
- **Client render FPS** — thuộc về client, server không quan tâm.

Ở game thật ba con số này thường khác nhau. Riêng sim tick:

| Game | Sim tick |
|---|---|
| Minecraft (Java) | 20 |
| League of Legends | 30 |
| Fortnite | 30 (60 ở chế độ thi đấu) |
| Overwatch | ~63 |
| CS:GO / CS2 | 64 (server chính thức) |
| Valorant | 128 |
| Rocket League | 120 |

*(Thay đổi theo bản vá và theo loại server — dùng làm thang tham chiếu, đừng trích như hằng số.)*

Điều đáng nhớ không phải từng con số, mà là **dải của chúng: 20 tới 128, chênh hơn 6 lần.** Không tồn tại "tick rate đúng". Bài 8 sẽ tính cái giá của mỗi lựa chọn ra bằng CPU, byte và mili giây.

---

## 5. Tính tay

Không cần code, cần giấy. Làm xong hãy đối chiếu cảm giác của bạn trước và sau khi tính.

**Bài 1.** Vẫn thiết kế Redis ở mục 3.1, nhưng đã sửa thành `MGET` một lần mỗi tick (0,5 ms) và `MSET` một lần (0,5 ms). Server 60 Hz.
- Riêng tiền Redis chiếm bao nhiêu phần trăm ngân sách một tick?
- Nếu một node chạy đồng thời 20 trận, mỗi giây node đó thực hiện bao nhiêu lệnh Redis?
- Con số thứ hai có làm bạn đổi ý về việc "Redis rảnh rỗi" không?

**Bài 2.** Thiết kế ngây thơ nhất của Phase 1: mỗi tick, server gửi **toàn bộ world** cho **từng player**. Giả sử mỗi player được mô tả bằng ~120 byte JSON.
- Trận 10 người ở 20 Hz tốn bao nhiêu Mbps chiều ra? Trận 50 người? Trận 100 người?
- Ở mốc nào thì một uplink 1 Gbps chỉ còn chứa được đúng **một** trận?
- Con số đó nói gì về thứ tự học: vì sao chương 6 (băng thông) phải đến sau chương 5 (netcode)?

**Bài 3.** Bạn đo được sim step tốn 1,2 µs cho 1.000 entity (số thật, sẽ đo lại ở bài 36).
- Ở 60 Hz, dựng snapshot + gửi packet tốn bao nhiêu thì tổng vừa hết 50 % ngân sách?
- Con số đó nói gì về chỗ bạn nên bỏ công tối ưu — physics hay serialization?

---

## 6. Chuyển giao

Không có đáp án trong bài. Đây mới là chỗ đo xem bạn đã hiểu hay chỉ vừa đọc xong.

**Bạn được giao làm cờ vua online.** Không vật lý, không di chuyển liên tục, mỗi nước đi cách nhau vài giây. Nhưng mỗi bên có đồng hồ đếm ngược, và hết giờ là thua.

1. Có cần giữ state trong RAM không, hay Redis là đủ? Phép tính nào chứng minh?
2. Có cần vòng lặp tick không? Nếu có thì bao nhiêu Hz, và nó làm gì giữa hai nước đi?
3. Đồng hồ đếm ngược chạy ở đâu — client, server, hay cả hai? Ai là sự thật?
4. Client báo "tôi còn 4,2 giây" — có tin được không? Còn client báo "tôi đi Nc3"?
5. Node đang giữ ván cờ chết đột ngột. Người chơi mất gì, và bạn thiết kế thế nào để họ mất ít nhất?
6. **Câu khó nhất:** cờ vua chấp nhận được độ trễ 500 ms mà không ai phàn nàn. Vậy trong bảy thứ bài này nói tới — RAM-first, stateful, một-chủ-sở-hữu, authoritative, intent-not-result, tick loop, ba tầng state — cái nào **vẫn cần**, cái nào **bỏ được**?

Câu 6 đáng giá nhất. Nếu trả lời được nó, bạn không còn học thuộc mô hình game server nữa — bạn đang biết mỗi mảnh của nó tồn tại vì lý do gì.

---

## 7. Tóm tắt

- Thiết kế backend đúng chuẩn vỡ ở game vì **số học**, không phải vì thiếu tối ưu: `N² × 0,5 ms ≤ 16,67 ms` cho ra ngưỡng N = 5,77.
- **CPU thấp mà vẫn vỡ** là bình thường: thứ bị tiêu là thời gian, và thời gian tiêu cả khi không làm gì.
- **Chậm bằng hỏng.** Kết quả đúng trả về muộn là kết quả sai.
- Chuỗi hệ quả bắt buộc: thế giới tự vận động → phải giữ state → RAM (DB chậm hơn 500.000 lần) → RAM của một tiến trình → **stateful** → route theo `match_id`, drain thay rolling deploy, scale theo số trận.
- Client gửi **ý định**, không gửi **kết quả**. Mọi tham số trỏ tới thế giới là một khẳng định cần kiểm chứng.
- Cái giá của authoritative: **luật chơi phải viết hai lần** và phải khớp tuyệt đối.
- State chia **ba tầng** — simulation (RAM, mất được), session (Redis), persistent (DB, không được mất).
- **Một nửa hệ thống vẫn là BE App** mà bạn đã biết làm; phần khó nằm ở nửa còn lại và ở ranh giới giữa hai nửa.

→ **Bài 2 — Bản đồ một hệ thống game online**: vẽ đầy đủ hai nửa đó, ai gọi ai, và làm sao nửa dưới sập mà nửa trên vẫn sống.
