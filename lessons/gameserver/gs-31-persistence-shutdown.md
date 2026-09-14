# Bài 31 — Persistence, meta services & graceful shutdown

## 1. Mục tiêu

Sau bài này bạn có thể:

- Gán **nhịp ghi cụ thể** cho từng tầng trong ba tầng state, và nói được mất tầng đó thì mất bao nhiêu.
- Tính **tải ghi DB** của một game ở 1.000 / 10.000 / 100.000 / 1.000.000 CCU, và chỉ ra nhịp nào chiếm phần lớn tải — không phải nhịp bạn tưởng.
- Chỉ ra vì sao outbox **at-least-once** bắt buộc phải có idempotency key, và tính ra mỗi ngày có bao nhiêu bản ghi trùng cần chịu.
- Viết **ngân sách sáu bước** cho graceful shutdown, tính tổng thời gian drain tệ nhất, và chứng minh `terminationGracePeriodSeconds: 30` sai bao nhiêu lần.
- Quyết định **có nên phục hồi trận đang dở hay không** bằng phép tính chi phí/lợi ích, và nói ra ngưỡng độ dài trận mà kết luận đảo chiều.
- Phân biệt cái **shutdown có kế hoạch cứu được** với cái **chỉ crash mới lộ ra**, và biết cái thứ hai không có cách sửa bằng tiền.

---

## 2. Triệu chứng

Bạn đã học được bài học của bài 2: không deploy giờ đỉnh. Nên bạn đặt lịch deploy **2 giờ sáng**, lúc CCU thấp nhất trong ngày.

Game của bạn: đỉnh **10.000 CCU**, trận **10 người**, dài **8 phút** (480 giây). Lúc 2 giờ sáng còn **15 % đỉnh = 1.500 CCU**, tức **150 trận đang chạy**, trải trên **8 game node** (20 trận/node).

Bạn bấm deploy. Pod cũ nhận `SIGTERM`. Ba mươi giây sau, Kubernetes gửi `SIGKILL`.

```
02:00:00  rollout bat dau, 8 pod nhan SIGTERM
02:00:30  8 pod bi SIGKILL
02:00:31  140 tran bien mat giua chung
          1.400 nguoi choi thay man hinh "mat ket noi"
02:00:45  rollout xong. Tat ca health check xanh. Khong mot dong error.
```

Chỉ **10 trận trong 150** kịp kết thúc trong 30 giây đó — đúng bằng tỉ lệ những trận vốn đã sắp xong.

Hôm sau, hoá đơn thật đến: **28 ticket hỗ trợ** (tỉ lệ khiếu nại ~2 % số người mất trận), mỗi ticket ~12 phút xử lý — **5,6 giờ người của đội CS**, cộng số trận rank phải hoàn tay. *(2 % là ước lượng vận hành, không phải hằng số — game có tiền cược thì cao hơn nhiều.)*

Phần khó chịu: deploy **giờ đỉnh** thì con số là 1.000 trận, giết 935, tức **9.350 người**. Dời sang 2 giờ sáng chỉ chia thiệt hại cho **6,67 lần** — nó không sửa gì, nó chỉ làm vấn đề nhỏ đủ để bạn không nhìn thấy.

---

## ⏸ Dừng lại — đoán trước #1

Bạn quyết định chỉnh `terminationGracePeriodSeconds`. Trận dài 480 giây, nên bạn đặt **480 giây** — bằng đúng một trận. Nghe rất hợp lý: trận nào cũng phải xong trong vòng một độ dài trận.

**Với 150 trận đang chạy, đặt D = 480 s thì còn bao nhiêu phần trăm trận bị giết?**

```
(a) 0 % — mọi trận đều xong trước 480 s tính từ lúc SIGTERM
(b) khoảng 6 % — vẫn còn một nhúm
(c) khoảng 35 %
(d) vẫn 93 % — chỉnh số không giải quyết được gì
```

Đáp án ở mục 3.5. Nếu bạn chọn (a), bạn đang bỏ quên đúng một biến.

---

## 3. Lý thuyết

### 3.1 Ba tầng state, lần này kèm nhịp ghi

Bài 1 đưa ra bảng ba tầng và quy tắc phân loại: *cái gì mất mà người chơi mở ticket khiếu nại thì phải xuống DB ngay tại thời điểm nó đổi.* Bảng đó trả lời câu **cái gì ở đâu**. Bài này trả lời câu tiếp theo: **ghi lúc nào, bằng cơ chế gì, và mất thì mất bao nhiêu.**

| | Simulation | Session | Persistent |
|---|---|---|---|
| Ví dụ | vị trí, vận tốc, HP, cooldown, đạn đang bay | ai đang ở node nào, hàng đợi ghép trận, sức chứa node | tài khoản, inventory, vàng, MMR, lịch sử trận |
| Nơi ở | RAM tiến trình game node | Redis | Postgres / Firestore |
| **Nhịp ghi** | **không ghi** (hoặc snapshot chu kỳ khi có phục hồi) | **heartbeat vài giây**, TTL ngắn | **ba nhịp** — xem 3.2 |
| Cơ chế | không có | `SETEX` + TTL 15 s, ghi đè, không cần bền | INSERT/UPDATE qua **hàng đợi bền**, không gọi đồng bộ |
| Ai đọc | chỉ tiến trình sở hữu | allocator, gateway, matchmaker | meta plane |
| Mất thì mất gì | trận đó, tính bằng phút — chịu được | định tuyến sai vài giây, người chơi vào lại — chịu được nếu TTL ngắn | **tiền của người chơi — không bao giờ** |

Hai dòng đáng dừng lại:

**Session state phải có TTL, và TTL là thứ làm cho nó "chịu mất được".** Node báo cáo sức chứa lên Redis mỗi 5 giây với TTL 15 giây (bài 2, mục ①). Node chết → sau tối đa 15 giây bản ghi tự bay, allocator ngừng cấp trận vào đó, không cần ai đi dọn. **Ghi session state không TTL là biến nó thành persistent state mà không có ai chịu trách nhiệm dọn** — lỗi kinh điển nhất của tầng giữa.

**Vùng xám bài 1 để ngỏ — item vừa rơi, chưa ai nhặt — bây giờ có cách quyết.** Hỏi: nếu mất nó, người chơi có **bằng chứng** rằng nó từng tồn tại không? Item rơi từ quái, chưa ai thấy → không ai chứng minh được → simulation. Item người chơi vừa vứt ra từ inventory → họ biết chắc nó tồn tại → persistent ngay tại thời điểm vứt.

### 3.2 Ba nhịp ghi persistent — và nhịp nào thật sự tốn

Bài 1 chốt "DB không được nằm trên critical path của tick" bằng khoảng cách 500.000 lần giữa RAM và Redis. Câu chưa trả lời: **vậy ghi khi nào?** Có đúng ba nhịp, không cạnh tranh nhau — một game thật dùng cả ba.

**Nhịp 1 — theo chu kỳ.** Ghi hồ sơ người chơi xuống DB mỗi *T* giây bất kể có đổi hay không. Dùng cho thứ đổi liên tục nhưng không giật cục: giờ chơi tích luỹ, tiến độ nhiệm vụ, vị trí trong thế giới mở. Cơ chế: một goroutine riêng, **không** nằm trong vòng tick, quét dirty set và ghi theo lô.

**Nhịp 2 — theo sự kiện.** Ghi ngay khi một giá trị quan trọng đổi: mua bằng tiền thật, nhận item hiếm, lên cấp, đổi MMR. Cơ chế: đẩy vào cùng hàng đợi bền với nhịp 3, không gọi DB trực tiếp.

**Nhịp 3 — khi kết thúc trận.** Ai thắng, điểm bao nhiêu, MMR mới, phần thưởng: 1 dòng `matches` + N dòng `match_players`.

Bây giờ tính tải. Giả định: trận 10 người / 480 giây; nhịp chu kỳ *T* = 60 s; nhịp sự kiện trung bình 1 lần / 180 giây / người.

| CCU | Trận đồng thời | Trận kết thúc/s | Nhịp 3 (kết quả) | Nhịp 1 (chu kỳ 60 s) | Nhịp 2 (sự kiện) | **Tổng write/s** |
|---|---|---|---|---|---|---|
| 1.000 | 100 | 0,208 | 2,3 | 16,7 | 5,6 | **24,5** |
| 10.000 | 1.000 | 2,083 | 22,9 | 166,7 | 55,6 | **245,1** |
| 100.000 | 10.000 | 20,83 | 229,2 | 1.666,7 | 555,6 | **2.451** |
| 1.000.000 | 100.000 | 208,3 | 2.291,7 | 16.666,7 | 5.555,6 | **24.514** |

Tỉ lệ giữ nguyên ở mọi mức vì cả ba nhịp đều tuyến tính theo CCU: **nhịp 1 chiếm 68,0 %, nhịp 2 chiếm 22,7 %, nhịp 3 chỉ 9,3 %.**

Kết quả trái trực giác nhất mục này. Ai cũng lo bản ghi kết quả trận — nó *thấy được*, nó có trong sơ đồ. Nhưng nó là **nhịp rẻ nhất trong ba nhịp**: một trận 480 giây chỉ sinh một lần ghi cho 10 người, còn nhịp chu kỳ đánh 10 người đó **8 lần** trong cùng khoảng (480 / 60 = 8).

> Muốn giảm tải DB, đừng tối ưu chỗ bạn nhìn thấy. **Nới `T` của nhịp chu kỳ từ 60 s lên 300 s cắt 54,4 % tổng tải ghi** — nhiều hơn mọi thứ bạn làm được với bản ghi kết quả.

Cái giá của việc nới `T`: crash làm mất tối đa `T` giây tiến độ của mọi người đang online — một đánh đổi có số ở cả hai vế.

### 3.3 Outbox: at-least-once nghĩa là bạn sẽ xử lý hai lần

Bài 2 chốt cơ chế ở bước 9: node ghi kết quả vào hàng đợi bền rồi **giải phóng room ngay**, không chờ meta plane. Giờ tới chỗ mà cơ chế đó đẩy vấn đề sang.

Hàng đợi bền — Redis Stream, Kafka, SQS, hay một bảng outbox trong Postgres — đều cho **at-least-once**, không cái nào cho exactly-once. Lý do luôn giống nhau: giữa lúc worker xử lý xong và lúc nó ack có một khe; worker chết trong khe đó → bản ghi được giao lại → xử lý lần hai.

<svg viewBox="0 0 720 250" role="img" aria-labelledby="gs31-a-t gs31-a-d" style="width:100%;height:auto">
<title id="gs31-a-t">Khe giữa xử lý và ack sinh ra bản ghi trùng</title>
<desc id="gs31-a-d">Worker đọc bản ghi kết quả, cộng vàng vào database, rồi ack hàng đợi. Nếu worker chết sau khi cộng vàng nhưng trước khi ack, hàng đợi giao lại bản ghi và người chơi được cộng vàng lần thứ hai.</desc>
<text x="14" y="20" font-size="12" font-weight="bold" fill="currentColor">Đường đi bình thường</text>
<rect x="14" y="30" width="120" height="40" rx="6" fill="#3b82f6" fill-opacity="0.25"/>
<text x="74" y="55" text-anchor="middle" font-size="10" fill="currentColor">1. đọc bản ghi</text>
<rect x="164" y="30" width="150" height="40" rx="6" fill="#3b82f6" fill-opacity="0.25"/>
<text x="239" y="49" text-anchor="middle" font-size="10" fill="currentColor">2. UPDATE gold += 500</text>
<text x="239" y="63" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">commit xong</text>
<rect x="344" y="30" width="110" height="40" rx="6" fill="#84cc16" fill-opacity="0.3"/>
<text x="399" y="55" text-anchor="middle" font-size="10" fill="currentColor">3. ack hàng đợi</text>
<line x1="134" y1="50" x2="162" y2="50" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5"/>
<line x1="314" y1="50" x2="342" y2="50" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5"/>
<rect x="314" y="22" width="30" height="56" rx="4" fill="#ef4444" fill-opacity="0.28"/>
<text x="470" y="46" font-size="10" fill="currentColor">KHE — worker chết ở đây</text>
<text x="470" y="62" font-size="10" fill="currentColor" opacity="0.75">DB đã đổi, hàng đợi chưa biết</text>
<text x="14" y="112" font-size="12" font-weight="bold" fill="currentColor">Sau khi worker sống lại</text>
<rect x="14" y="122" width="120" height="40" rx="6" fill="#f59e0b" fill-opacity="0.3"/>
<text x="74" y="147" text-anchor="middle" font-size="10" fill="currentColor">1'. đọc LẠI</text>
<rect x="164" y="122" width="150" height="40" rx="6" fill="#ef4444" fill-opacity="0.3"/>
<text x="239" y="141" text-anchor="middle" font-size="10" fill="currentColor">2'. gold += 500 lần hai</text>
<text x="239" y="155" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.75">người chơi được 1.000</text>
<line x1="134" y1="142" x2="162" y2="142" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5"/>
<text x="14" y="196" font-size="12" font-weight="bold" fill="currentColor">Sửa: idempotency key</text>
<rect x="14" y="206" width="440" height="34" rx="6" fill="#84cc16" fill-opacity="0.22"/>
<text x="28" y="227" font-size="10" fill="currentColor">INSERT INTO applied(key) VALUES (match_id + ':' + player_id) — trùng thì bỏ qua cả giao dịch</text>
<text x="470" y="112" font-size="10" fill="currentColor" opacity="0.75">Không có exactly-once.</text>
<text x="470" y="128" font-size="10" fill="currentColor" opacity="0.75">Chỉ có at-least-once</text>
<text x="470" y="144" font-size="10" fill="currentColor" opacity="0.75">cộng với bên nhận</text>
<text x="470" y="160" font-size="10" fill="currentColor" opacity="0.75">tự chống trùng.</text>
</svg>

Định lượng ở **10.000 CCU**:

- Trận kết thúc mỗi ngày: `10.000 / 10 / 480 × 86.400` = **180.000 trận**
- Bản ghi kết quả mỗi ngày: `180.000 × 11` = **1.980.000** (1 dòng match + 10 dòng player)
- Trung bình: **22,92 bản ghi/giây** — nhỏ đến mức không cần lo về throughput

Nhưng tỉ lệ trùng thì không nhỏ:

| Nguồn trùng | Ước lượng | Bản ghi trùng/ngày |
|---|---|---|
| Ack mất / timeout mạng, giả định 0,1 % | 0,1 % × 1.980.000 | **1.980** |
| Worker restart 4 lần/ngày, mỗi lần đang giữ prefetch 100 | 4 × 100 | **400** |
| Deploy meta plane 2 lần/ngày, cùng cơ chế | 2 × 100 | 200 |

*(Ba tỉ lệ trên là ước lượng vận hành, không phải hằng số — chúng phụ thuộc cấu hình prefetch và tần suất deploy của bạn.)*

Cộng lại khoảng **2.580 bản ghi trùng mỗi ngày, tức 0,13 % tổng số**. Nếu bản ghi đó là "cộng 500 vàng", bạn phát không **1,29 triệu vàng mỗi ngày** cho những người tình cờ đứng đúng khe.

> **Idempotency key không phải best practice, nó là điều kiện đúng đắn của outbox.** Chọn at-least-once là chọn "sẽ có trùng"; bên nhận bắt buộc phải chống trùng, nếu không thì hệ thống *sai*, không phải *chưa tối ưu*.

Khoá phải là thứ **node sinh ra biết trước và không đổi khi giao lại**: `match_id:player_id` có sẵn, duy nhất, ổn định. Không dùng UUID sinh lúc worker xử lý — mỗi lần giao lại là một UUID khác, vô dụng. Thi hành bằng bảng `applied_effects(key PRIMARY KEY, applied_at)`, `INSERT` trong **cùng transaction** với tác dụng thật; đụng unique constraint → rollback và ack luôn.

Chi tiết dễ bỏ: **hai lần giao có thể chạy song song**, không phải nối tiếp — worker A treo (chưa chết), hàng đợi hết visibility timeout và giao cho worker B. PRIMARY KEY xử lý được vì DB serialize giúp bạn; một câu `SELECT ... IF NOT EXISTS THEN UPDATE` ở tầng ứng dụng thì không.

---

## ⏸ Dừng lại — đoán trước #2

Bạn viết graceful shutdown và tính thời gian. Bước "chờ trận hiện tại xong" rõ ràng là bước dài nhất. Node giữ **20 trận**, mỗi trận **480 giây**, các trận bắt đầu rải rác chứ không cùng lúc.

**Thời gian chờ trung bình (p50) để cả 20 trận cùng xong là bao nhiêu?**

```
(a) ~24 s   — trung bình mỗi trận còn 240 s, chia cho 20 trận chạy song song
(b) ~240 s  — trung bình một trận còn nửa độ dài
(c) ~460 s  — gần đúng bằng một độ dài trận
(d) ~516 s  — dài hơn cả một độ dài trận
```

---

### 3.4 Sáu bước, và bước nào thật sự tốn thời gian

Đáp án là **(d)**, và lý do là điểm mấu chốt của cả bài: bạn không chờ *một* trận, bạn chờ **trận lâu nhất trong 20 trận**. Kỳ vọng cực đại của 20 mẫu phân bố đều trên `[0, 480]` là `480 × 20/21 = 457,1 s` — đã gần bằng cả một độ dài trận. Cộng thêm độ dài trận **không cố định**, p50 đo bằng mô phỏng còn cao hơn.

*(Mô phỏng 60.000 lượt, 20 trận/node, độ dài trận phân phối chuẩn 480 ± 90 s, thời điểm bắt đầu rải đều.)*

| Độ lệch chuẩn độ dài trận | p50 | p90 | p99 | max quan sát |
|---|---|---|---|---|
| 0 s (mọi trận đúng 480 s) | 463,7 s | 477,5 s | **479,8 s** | 480,0 s |
| 45 s | 479,6 s | 530,3 s | **573,4 s** | 665,8 s |
| **90 s** | **516,0 s** | **603,6 s** | **683,4 s** | 857,2 s |
| 180 s | 603,5 s | 758,6 s | **909,8 s** | 1.224,2 s |

Đọc cột p99: chỉ cần độ dài trận lệch chuẩn 90 giây — hoàn toàn bình thường với một game có hiệp phụ hoặc có đầu hàng sớm — thì **p99 của thời gian drain là 683 giây, vượt độ dài trận trung bình 42,4 %**. Cột này là toàn bộ nội dung của hộp ⏸ #1, và mục 3.5 sẽ chốt.

Bây giờ ngân sách đầy đủ. Sáu bước, và năm trong sáu bước gần như miễn phí:

<svg viewBox="0 0 720 270" role="img" aria-labelledby="gs31-b-t gs31-b-d" style="width:100%;height:auto">
<title id="gs31-b-t">Ngân sách sáu bước của graceful shutdown so với mốc 30 giây của Kubernetes</title>
<desc id="gs31-b-d">Năm bước quanh việc chờ trận chỉ tốn khoảng ba giây rưỡi cộng lại, còn bước chờ trận hiện tại kết thúc chiếm 683 giây ở phân vị 99. Mốc mặc định 30 giây của Kubernetes nằm ngay đầu bước chờ.</desc>
<line x1="40" y1="200" x2="700" y2="200" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<text x="40" y="222" font-size="9" fill="currentColor">0 s</text>
<text x="120" y="222" font-size="9" fill="currentColor">3 s</text>
<text x="670" y="222" font-size="9" fill="currentColor">687 s</text>
<rect x="40" y="182" width="4" height="18" rx="1" fill="#3b82f6"/>
<text x="34" y="176" font-size="9" fill="currentColor">1</text>
<rect x="46" y="182" width="76" height="18" rx="3" fill="#8b5cf6" fill-opacity="0.45"/>
<text x="84" y="176" text-anchor="middle" font-size="9" fill="currentColor">2 · 3,0 s</text>
<rect x="124" y="176" width="546" height="24" rx="4" fill="#f59e0b" fill-opacity="0.35"/>
<text x="397" y="192" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">3 · chờ 20 trận xong — p99 683,4 s</text>
<rect x="672" y="182" width="10" height="18" rx="2" fill="#84cc16" fill-opacity="0.6"/>
<text x="688" y="176" font-size="9" fill="currentColor">4·5·6</text>
<text x="688" y="194" font-size="9" fill="currentColor">0,42 s</text>
<line x1="164" y1="150" x2="164" y2="212" stroke="#ef4444" stroke-width="2.5"/>
<text x="172" y="146" font-size="11" font-weight="bold" fill="currentColor">k8s mặc định 30 s — SIGKILL ở đây</text>
<text x="172" y="162" font-size="10" fill="currentColor" opacity="0.8">giết 93,5 % số trận · thiếu 22,9 lần</text>
<text x="40" y="30" font-size="12" font-weight="bold" fill="currentColor">1. SIGTERM → cờ draining</text>
<text x="40" y="46" font-size="10" fill="currentColor" opacity="0.75">0,001 s — chỉ đặt một biến, KHÔNG đóng listener</text>
<text x="40" y="66" font-size="12" font-weight="bold" fill="currentColor">2. Báo allocator ngừng nhận trận mới</text>
<text x="40" y="82" font-size="10" fill="currentColor" opacity="0.75">3,0 s — xoá key Redis rồi CHỜ hết cửa sổ cấp phát đang bay</text>
<text x="40" y="102" font-size="12" font-weight="bold" fill="currentColor">4·5·6. Snapshot 20 trận · flush outbox · thoát</text>
<text x="40" y="118" font-size="10" fill="currentColor" opacity="0.75">0,02 + 0,30 + 0,10 = 0,42 s — nhỏ hơn bước 3 khoảng 1.600 lần</text>
<text x="40" y="252" font-size="11" font-style="italic" fill="currentColor">Tổng tệ nhất 686,8 s = 11,45 phút. Không có bước nào tối ưu được, trừ bước 3 — và bước 3 là luật chơi, không phải code.</text>
</svg>

| Bước | Việc | Thời gian | Vì sao đúng con số đó |
|---|---|---|---|
| 1 | Nhận `SIGTERM`, đặt cờ `draining` | 0,001 s | Chỉ set một biến. **Không** đóng listener — client đang chơi cần reconnect được |
| 2 | Báo allocator ngừng nhận trận mới | **3,0 s** | Xoá key sức chứa khỏi Redis xong (~0,5 ms) vẫn phải chờ hết cửa sổ những lần cấp phát *đã bay* — bằng chu kỳ heartbeat |
| 3 | Chờ trận hiện tại xong, hoặc tới hạn D | **683,4 s (p99)** | Cực đại của 20 trận, bảng trên |
| 4 | Snapshot trận chưa xong | 0,02 s | 20 trận × 18,1 KB = 362,5 KB, serialize 0,74 ms + một pipeline Redis |
| 5 | Flush outbox | 0,30 s | ~220 bản ghi còn trong bộ đệm, một lần ghi theo lô |
| 6 | Đóng kết nối, thoát | 0,10 s | |
| | **Tổng tệ nhất** | **686,8 s = 11,45 phút** | |

Bước 2 là bước duy nhất có bẫy tinh vi. Xoá key Redis không đủ: allocator có thể vừa **đọc** key một mili giây trước đó và đang trên đường gửi trận mới tới. Đóng listener ngay thì trận đó chết lúc mới sinh. Phải chờ hết một chu kỳ heartbeat để mọi quyết định cấp phát dựa trên dữ liệu cũ trôi hết — và trong khoảng đó **vẫn nhận trận mới**, chấp nhận chúng sẽ phải drain cùng.

Bước 4 và 5 cộng lại **0,32 giây**, nhỏ hơn bước 3 hơn 2.000 lần: mọi công sức tối ưu I/O ở shutdown là công sức lãng phí. **Toàn bộ chi phí drain nằm ở một chỗ duy nhất — độ dài trận — và độ dài trận là quyết định thiết kế game.** Lại một lần nữa ranh giới gameplay/kiến trúc bị xoá, đúng như bài 1 nói.

### 3.5 `terminationGracePeriodSeconds` — vì sao 30 sai và 480 cũng sai

Kubernetes mặc định gửi `SIGKILL` sau **30 giây**. Với ngân sách 686,8 giây, mặc định thiếu **22,9 lần**. Đó là toàn bộ nguyên nhân của triệu chứng ở mục 2 — không có bug nào, chỉ có một con số mặc định được thiết kế cho stateless service bị áp lên một hệ stateful.

Đáp án hộp ⏸ #1 là **(b)**. Bảng dưới đo bằng mô phỏng, độ dài trận 480 ± 90 s:

| Hạn drain D | % trận bị giết | Trận bị giết / 150 | Người chơi mất trận |
|---|---|---|---|
| **30 s (mặc định k8s)** | **93,49 %** | 140 | 1.400 |
| 60 s | 87,06 % | 131 | 1.306 |
| 120 s | 74,02 % | 111 | 1.110 |
| 300 s | 35,33 % | 53 | 530 |
| **480 s (= một độ dài trận)** | **6,09 %** | **9** | **91** |
| 600 s | 0,57 % | 0,9 | 9 |
| 720 s | 0,027 % | 0,04 | 0,4 |

Đặt D bằng đúng độ dài trận trung bình vẫn giết **6,09 %** — vì một nửa số trận dài hơn trung bình, và bạn cần trận **dài nhất** xong. Muốn dưới 0,1 % phải đặt **D = 720 s = 12 phút**, tức **1,5 lần độ dài trận trung bình**.

Quy tắc rút ra không phụ thuộc con số cụ thể của game bạn:

> **D không đặt theo độ dài trận trung bình. D đặt theo đuôi trên của phân phối độ dài trận, cộng ngân sách năm bước còn lại.** Với phân phối 480 ± 90 s, đó là 720 + 3,42 ≈ **725 giây**.

Cái giá của D lớn: pod cũ sống lâu hơn. 8 node drain **song song** → deploy 12 phút, và phải có chỗ chạy 16 pod cùng lúc trong 12 phút đó. Drain **tuần tự** một node một lượt → `8 × 725` = 96,7 phút, và với 50 node ở giờ đỉnh là `50 × 725` = **604 phút, hơn 10 tiếng**. Tuần tự không dùng được ở quy mô; phải song song và trả tiền cho công suất gấp đôi.

Chi tiết cấu hình (`preStop` hook, readiness probe, Agones `Allocated`/`Shutdown`) thuộc bài 40. Ở đây chỉ cần một kết luận: **con số 30 phải bị chỉnh, và chỉnh thành bao nhiêu là kết quả của bảng trên, không phải của cảm giác.**

### 3.6 Có đáng phục hồi trận đang dở không?

Bước 4 nói "snapshot trận chưa xong". Câu phải trả lời trước khi viết dòng code nào: **snapshot rồi làm gì với nó?** Chi phí, đo được:

| Khoản | Số | Cách ra |
|---|---|---|
| Kích thước snapshot một trận | **18,1 KB** | 500 entity × 32 B + 10 player × 256 B = 18.560 B |
| Ghi 20 trận lúc shutdown | **~4,2 ms** | serialize 0,74 ms + một pipeline Redis 362,5 KB |
| Snapshot **định kỳ** mỗi 10 s (để chống crash) | 2,0 ghi/s/node, 36,2 KB/s | 20 trận / 10 s |
| CPU của snapshot định kỳ | **0,0074 % một core** | 37,1 µs/trận × 2 trận/s |

Chi phí máy gần bằng không, kể cả bản định kỳ. **Chi phí thật nằm ở chỗ khác:** state phải serialize được đầy đủ và phục hồi lại *chính xác* — mọi thứ trong RAM phải là dữ liệu thuần, không con trỏ tuỳ tiện, không closure giữ trạng thái, không timer chỉ tồn tại trong runtime. Simulation đã tất định theo chương 3 thì gần như có sẵn tính chất này; chưa thì đây là một đợt refactor thật.

Lợi ích, phụ thuộc **độ dài trận** so với hạn drain D. Với D = 300 s (giả sử bạn chỉ chịu được deploy 5 phút):

| Thể loại | Độ dài trận | % trận bị giết mỗi lần deploy | Phục hồi có đáng? |
|---|---|---|---|
| Deathmatch ngắn | 90 s | 0 % | **Không** — drain thừa sức |
| Đua xe | 180 s | 0 % | **Không** |
| MOBA-lite | 480 s | 35,3 % | Cân nhắc |
| MOBA đầy đủ | 2.400 s | 87,5 % | **Có** |
| MMO (không có "kết thúc") | ∞ | 100 % | **Bắt buộc** |

Ngưỡng đọc thẳng ra từ công thức `tỉ lệ giết ≈ 1 − D/L`:

> **L ≤ D: kéo dài D là đủ, đừng viết phục hồi.** **L ≈ 2D: giết 50 %** — bắt đầu phải cân. **L ≥ 4D: giết ≥ 75 %**, phục hồi là con đường duy nhất, vì kéo D lên `4×` biến mỗi lần deploy thành một sự kiện vận hành.

Kết luận thứ hai mạnh hơn: **game không có khái niệm "trận kết thúc" thì drain không tồn tại như một phương án.** MMO không thể chờ; đường duy nhất là snapshot + phục hồi + reconnect. Đó là lý do MMO là loại game duy nhất trong bảng bắt buộc phải làm hạ tầng đắt hơn hẳn.

### 3.7 Crash đột ngột không phải shutdown chậm hơn

`SIGKILL`, OOM killer, máy mất điện, kernel panic. Cả bốn chung một tính chất: **bạn không được chạy dòng code nào.** Đây không phải "graceful shutdown với D = 0" — nó là một lớp sự cố khác, và cái cứu được cũng khác.

| Thứ | Shutdown có kế hoạch | Crash đột ngột |
|---|---|---|
| Trận đang chạy | drain hoặc snapshot ở bước 4 → cứu được | mất, trừ khi có snapshot **định kỳ** (mất ≤ 10 s = **2,08 %** một trận 480 s) |
| Bản ghi kết quả trong bộ đệm outbox | flush ở bước 5 → cứu được | mất nếu outbox chỉ nằm trong RAM |
| Session state trên Redis | xoá chủ động ở bước 2 | TTL 15 s tự dọn — **không cần làm gì** |
| Worker chết giữa chừng | không xảy ra | xảy ra → khoá idempotency ở 3.3 xử lý |

**Outbox trong RAM là outbox giả.** Nếu bước 5 chỉ là "flush bộ đệm RAM ra Redis" thì mất điện làm mất luôn. Muốn chịu được mất điện, node phải ghi bản ghi kết quả xuống **đĩa cục bộ có fsync** ngay khi trận xong, rồi mới đẩy lên hàng đợi. Định lượng: một node kết thúc `20/480` = **0,0417 trận/giây**; fsync mỗi 1 giây → kỳ vọng **1 bản ghi kết quả mất trên 24 lần mất điện đột ngột**. Fsync mỗi 10 giây thì thành 1 trên 2,4 lần — chênh 10 lần cho một dòng cấu hình.

**OOM là loại crash tự gây ra và tự sửa được.** Khác `SIGKILL` từ ngoài, OOM đến từ chính bạn: 20 trận × entity mỗi trận, cộng lịch sử vị trí cho lag compensation (bài 21), cộng baseline cho delta (bài 25). Đặt trần số trận trên node thấp hơn trần bộ nhớ thật là cách rẻ nhất để đổi một lớp sự cố không cứu được thành một lớp cứu được — `GOMEMLIMIT` và chi tiết ở bài 37.

Bất kể cứu được bao nhiêu ở phía server, **mọi con đường đều kết thúc ở client phải reconnect được** (bài 16). Nếu reconnect chưa chạy thì snapshot ở bước 4 là một file không ai đọc.

### 3.8 Đo cái gì

Bốn chỉ số, mỗi cái gắn với đúng một quyết định ở trên. Ba trong bốn chỉ có nghĩa khi nhìn p99 — nhìn trung bình là không nhìn gì cả.

| Chỉ số | Ngưỡng cảnh báo | Quyết định nó điều khiển |
|---|---|---|
| **Thời gian drain**, p50 và **p99** theo node | p99 > 0,9 × D | Chỉnh `terminationGracePeriodSeconds`. p99 chạm D nghĩa là bảng 3.5 đang nói dối bạn |
| **Số trận bị giết mỗi deploy**, tuyệt đối và % | > 1 % | Chỉ số thật của cả bài. Không về gần 0 thì mọi thứ trên là lý thuyết |
| **Độ trễ outbox** p99, node ghi → worker commit | > 30 s | Meta plane chậm. **Không** làm chết trận (điểm của bài 2), nhưng người chơi thấy điểm chưa lên |
| **Tỉ lệ ghi DB thất bại**, tách theo ba nhịp | > 0,1 % ở nhịp 2 | Nhịp 2 là nhịp chứa tiền: nhịp 1 hỏng mất tiến độ, nhịp 2 hỏng mất tiền |

Thêm một chỉ số phái sinh: **tỉ lệ bản ghi bị idempotency key chặn**. Ở 10.000 CCU mức bình thường quanh **0,13 %** (mục 3.3). Nó nhảy lên 5 % nghĩa là worker đang chết liên tục ở đúng cái khe trong sơ đồ — và không chỉ số nào khác báo cho bạn, vì mọi thứ vẫn *đúng*.

---

## 4. Bảng quyết định — mỗi tầng, mỗi loại sự cố

Ba tầng của mục 3.1 nhân với hai lớp sự cố của mục 3.7. Đây là bảng để dán lên tường:

| | Deploy (có kế hoạch) | Crash (SIGKILL/OOM/mất điện) | Chi phí để cứu |
|---|---|---|---|
| **Simulation** | drain tới D → cứu 99,97 % nếu D = 720 s | mất, trừ khi snapshot định kỳ | snapshot 10 s: 0,0074 % core, mất ≤ 2,08 % trận |
| **Session** | xoá key chủ động | TTL 15 s tự dọn | **0** — chỉ cần đặt TTL |
| **Persistent** | flush outbox ở bước 5 | cần fsync đĩa cục bộ trước khi đẩy hàng đợi | fsync 1 s: mất 1 bản ghi / 24 lần mất điện |

Cột phải là chỗ đáng nhìn lâu nhất. Cứu session state tốn **đúng 0 đồng** — một tham số TTL. Cứu simulation state tốn gần 0 tiền máy nhưng tốn một ràng buộc kiến trúc thật. Cứu persistent state tốn một dòng fsync và một bảng idempotency. Không khoản nào đắt. Cái đắt duy nhất là **phát hiện ra mình cần chúng sau khi đã mất 1.400 trận.**

---

## 5. Tính tay

**Bài 1.** Game của bạn: 40.000 CCU, trận 4 người, dài 6 phút. Nhịp chu kỳ đang đặt *T* = 30 s, nhịp sự kiện 1 lần / 120 s / người, một trận sinh 1 + 4 = 5 dòng.
- Tổng write/giây của cả ba nhịp là bao nhiêu? Mỗi nhịp chiếm bao nhiêu phần trăm?
- Nới *T* từ 30 s lên 120 s cắt được bao nhiêu phần trăm **tổng** tải ghi?
- Cái giá của việc nới đó, tính bằng "giây tiến độ mất khi crash", là bao nhiêu?

**Bài 2.** Vẫn game trên. Một node giữ 40 trận. Bạn đặt D = 400 s.
- Dùng công thức `1 − D/L` với L = 360 s: bao nhiêu phần trăm trận bị giết?
- Kết quả đó có tin được không, biết rằng bảng 3.5 cho thấy công thức này sai lệch thế nào khi D gần L? Sai về phía nào — lạc quan hay bi quan?
- Muốn xuống dưới 0,1 %, theo tỉ lệ 1,5× của mục 3.5 thì D phải là bao nhiêu?

**Bài 3.** Outbox của bạn giao lại 0,05 % bản ghi. Game 40.000 CCU, trận 4 người 6 phút, 5 dòng/trận.
- Mỗi ngày bao nhiêu bản ghi, và bao nhiêu bản trùng?
- Nếu mỗi bản ghi cộng 200 vàng và bạn **quên** idempotency key, mỗi ngày phát không bao nhiêu vàng?
- Đặt cạnh doanh thu: nếu 1.000 vàng bán 1 đô, con số đó là bao nhiêu đô mỗi tháng?

---

## 6. Chuyển giao

Không có đáp án trong bài.

**Bạn được giao một game sinh tồn kiểu battle royale**: 100 người vào một map, trận kéo dài **18–25 phút** nhưng số người sống giảm dần — sau 10 phút thường chỉ còn ~20 người, sau 20 phút còn ~3. Người chết ra khỏi trận ngay và về sảnh. Có inventory mang theo giữa các trận, có tiền thật trong shop.

1. Ba nhịp ghi ở mục 3.2 áp vào game này thế nào? Nhịp nào biến mất, nhịp nào phải thêm?
2. Số người trong một trận **giảm theo thời gian**. Điều đó làm bảng 3.5 (% trận bị giết) nói dối theo hướng nào — bạn đang đánh giá thiệt hại cao hơn hay thấp hơn thực tế?
3. Snapshot một trận battle royale to hơn 18,1 KB bao nhiêu lần, và nó có còn "gần bằng không" nữa không? Ước lượng bằng số entity, đừng đoán.
4. Node giữ được bao nhiêu trận nếu một trận 100 người? Con số đó đổi bảng "trận bị giết mỗi node" thế nào — theo hướng tốt hay xấu?
5. Người chơi **nhặt được item hiếm ở phút thứ 3** rồi chết ở phút thứ 5. Item đó ghi xuống DB lúc nào — lúc nhặt, lúc chết, hay lúc trận kết thúc? Ba lựa chọn cho ba loại lỗi khác nhau; kể ra loại lỗi của từng lựa chọn.
6. **Câu khó nhất:** trận dài 18–25 phút nhưng số người giảm dần, nên "thiệt hại của việc giết một trận" **không phải hằng số theo thời gian** — nó đạt cực đại ở đâu đó rồi giảm. Hãy đặt ra một hàm thiệt hại theo phút và tìm thời điểm cực đại. Rồi trả lời câu thật sự: nếu drain có thể **chọn thứ tự** giết trận, nó nên giết trận **mới bắt đầu** hay trận **sắp xong** trước, và điều đó có mâu thuẫn với cách drain hoạt động (chờ trận xong) không?

---

## 7. Tóm tắt

- Ba tầng khác nhau ở **nhịp ghi**: simulation không ghi, session heartbeat vài giây **có TTL**, persistent qua hàng đợi bền. Session không TTL là persistent state không có người dọn.
- Ba nhịp ghi persistent — chu kỳ / sự kiện / kết thúc trận — chia tải **68,0 % / 22,7 % / 9,3 %** ở mọi mức CCU. Bản ghi kết quả trận là nhịp **rẻ nhất**, trái trực giác. Nới chu kỳ 60 s → 300 s cắt **54,4 %** tổng tải ghi.
- Outbox cho **at-least-once**, không cho exactly-once. Ở 10.000 CCU: **1.980.000 bản ghi/ngày**, ~**2.580 bản trùng/ngày (0,13 %)**. Idempotency key `match_id:player_id` là điều kiện đúng đắn, không phải best practice.
- Drain là **cực đại của N trận**, không phải trung bình một trận: 20 trận × 480 ± 90 s cho p50 **516 s**, p99 **683,4 s** — vượt độ dài trận trung bình **42,4 %**.
- Ngân sách sáu bước tổng **686,8 s = 11,45 phút**; năm bước ngoài bước chờ chỉ **3,42 s**. `terminationGracePeriodSeconds: 30` thiếu **22,9 lần**, giết **93,5 %** số trận.
- Đặt D bằng đúng độ dài trận trung bình vẫn giết **6,09 %**. Dưới 0,1 % cần **D ≈ 1,5 × L = 720 s**, và phải drain **song song** — tuần tự 50 node là 604 phút.
- Phục hồi trận đang dở đáng làm khi **L ≥ 2D**; ở **L ≥ 4D** (giết ≥ 75 %) là đường duy nhất; MMO không có "trận kết thúc" nên bắt buộc.
- Crash cứu được đúng những gì đã ghi trước đó. Snapshot chu kỳ 10 s tốn **0,0074 % một core**, giới hạn thiệt hại ở **2,08 %** một trận.
- Đo: drain p50/p99, số trận bị giết mỗi deploy, độ trễ outbox p99, tỉ lệ ghi DB thất bại tách theo nhịp, tỉ lệ bản ghi bị idempotency key chặn.

→ **Bài 32 — Sharding world & cross-node handoff**: một node giữ được nhiều trận nhỏ. Bài cuối chương hỏi trường hợp ngược lại — một thế giới lớn hơn cái mà một node giữ nổi.
