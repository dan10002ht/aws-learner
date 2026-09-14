# Bài 12 — TCP hay UDP: tính bằng số

## 1. Mục tiêu

Sau bài này bạn có thể:

- **Tính ra mili giây** thời gian một luồng snapshot bị TCP giữ lại khi mất đúng một gói, cho RTT bất kỳ — không tra bảng, tự dựng công thức.
- Giải thích vì sao **2 % packet loss** biến thành **12 % thời gian đứng hình**, và vì sao log server vẫn sạch tuyệt đối trong suốt lúc đó.
- Chỉ ra chính xác **bao nhiêu phần trăm dữ liệu được retransmit là dữ liệu vô giá trị** ở thời điểm nó tới nơi.
- Xếp mọi loại message của một game vào **thang hạn sử dụng**, và suy ra kênh gửi từ hạn đó chứ không từ sở thích.
- Gọi tên **ba thứ TCP làm thêm sau lưng bạn** — Nagle, delayed ACK, congestion control — và nói cái nào tắt được, cái nào không.
- Nói rõ **khi nào TCP vẫn là lựa chọn đúng**, kể cả cho game real-time, và bảo vệ lựa chọn đó bằng lý do vận hành chứ không phải lý do kỹ thuật.

---

## 2. Triệu chứng

Ba chương vừa rồi dựng được một simulation chạy đúng nhịp, chạy lại ra kết quả y hệt. Bạn đẩy nó lên production qua TCP — cái bạn đã dùng mười năm và chưa bao giờ phản bội bạn.

Ticket đầu tiên về:

> *"Game đứng hình khoảng một giây rồi nhân vật đối phương nhảy phụt sang chỗ khác. Một phút bị vài lần."*

Bạn mở dashboard. Mọi thứ xanh:

```
tick p50 3,1 ms · p99 4,8 ms      (ngân sách 16,67 ms — dư 71 %)
error rate 0,00 %                  không một dòng exception
ping trung bình tới người chơi đó  100 ms
packet loss trên đường đó          2,0 %
CPU 11 % · RAM 340 MB · GC pause p99 0,4 ms
```

Không có gì hỏng. Server chạy đủ 20 snapshot mỗi giây, đều tăm tắp, `sendto` trả về thành công 100 % số lần. Gói tin **không mất ở phía bạn** — chúng mất trên đường, đúng 2 %, và TCP đã tự động gửi lại hết, đúng như hợp đồng.

Vậy mà người chơi đứng hình một giây.

2 % nghe như "thỉnh thoảng thiếu một chút thông tin". Bài này đi tìm đường từ **2 %** tới **một giây**, và đường đó không đi qua bất kỳ dòng log nào của bạn.

---

## ⏸ Dừng lại — đoán trước #1

Chọn một đáp án trước khi đọc tiếp.

**Server gửi snapshot đều 20 Hz. Một snapshot mất trên đường. Trong lúc chờ bản gửi lại, những snapshot MỚI HƠN đã tới máy client rồi thì sao?**

```
(a) Client nhận được ngay — chúng là gói độc lập
(b) Chúng bị vứt đi, client chờ đúng bản gửi lại rồi mới nhận tiếp
(c) Chúng nằm trong bộ nhớ kernel của client, đã tới nơi, nhưng ứng dụng
    KHÔNG được phép đọc cho tới khi bản gửi lại tới
(d) Server không gửi tiếp cho tới khi gói cũ được xác nhận
```

---

## 3. Lý thuyết

### 3.1 TCP hứa hai điều, và điều thứ hai mới là điều giết bạn

Đáp án là **(c)**.

TCP bán cho bạn hai lời hứa, và ở BE App bạn mua cả gói mà không bao giờ phải tách ra:

| Lời hứa | Nội dung | Ở game |
|---|---|---|
| **Reliable** | Mọi byte đã gửi sẽ tới, gửi lại cho tới khi tới | thỉnh thoảng cần |
| **In-order** | Ứng dụng đọc byte **đúng thứ tự đã gửi**, không bao giờ khác | **đây là chỗ chết** |

Lời hứa thứ hai là một ràng buộc rất mạnh: để giữ nó, kernel ở phía nhận **không được phép** giao byte thứ 1.001 cho ứng dụng khi byte thứ 1.000 chưa tới. Nó phải giữ lại. Dữ liệu đã nằm trong RAM máy client, đã đi hết quãng đường, chỉ còn cách `read()` một lần gọi hàm — và kernel ngồi im trên nó.

Đó là **head-of-line blocking**: một gói mất ở đầu hàng làm nghẽn mọi gói đứng sau nó.

Ở BE App bạn không thấy hiện tượng này vì một request chỉ có một response — không có "gói sau" nào để bị chặn. Ở game, luồng snapshot là **vô tận**, nên luôn có gói sau.

### 3.2 Tính head-of-line ra mili giây

Đừng tin cảm giác, dựng công thức. Mô hình — nói rõ giả định trước:

```
snapshot 20 Hz          -> chu kỳ I = 50 ms
một chiều               -> R/2  (R = RTT)
fast retransmit          -> sender gửi lại sau 3 dup ACK (RFC 5681)
receiver ACK ngay         khi nhận gói out-of-order (RFC 5681 bắt buộc, delayed ACK không áp)
```

*(Đây là mô phỏng theo đặc tả giao thức, không phải đo mạng thật. Số ra từ một script tính tay; mạng thật có SACK, có burst loss, có middlebox — kết quả lệch theo cả hai hướng.)*

Đặt `t = 0` là lúc server gửi snapshot `n` và nó mất. Server vẫn gửi tiếp `n+1` ở `t=50`, `n+2` ở `t=100`, `n+3` ở `t=150`. Dup ACK thứ ba sinh ra bởi `n+3`, về tới server lúc `t = 150 + R`. Server gửi lại `n` ngay, bản đó tới client lúc:

```
t_r = 150 + 1,5·R
```

Snapshot `n+k` tới card mạng client lúc `50k + R/2`. Nó **bị giam** nếu `50k + R/2 < t_r`, tức:

```
k < 3 + R/50            <- số snapshot bị giam
giam bao lâu: 150 + R − 50k
```

Thay số:

| RTT | Bản gửi lại tới lúc | Snapshot bị giam | Mỗi cái giam (ms) | Tổng ms bị giam | Đứng hình |
|---|---|---|---|---|---|
| **40 ms** | 210 ms | **3** | 140 · 90 · 40 | **270 ms** | **240 ms** |
| **100 ms** | 300 ms | **4** | 200 · 150 · 100 · 50 | **500 ms** | **300 ms** |
| **200 ms** | 450 ms | **6** | 300 · 250 · 200 · 150 · 100 · 50 | **1.050 ms** | **400 ms** |

Cột "đứng hình" là thứ người chơi cảm nhận: khoảng cách giữa lần cuối ứng dụng đọc được dữ liệu mới (`n−1`) và lúc cả cụm được nhả ra. Nó bằng `200 + R` — kiểm lại ở RTT 100: `200 + 100 = 300` ✓.

<svg viewBox="0 0 700 296" role="img" aria-labelledby="gs12-a-t gs12-a-d" style="width:100%;height:auto">
<title id="gs12-a-t">Head-of-line blocking khi mất một snapshot, RTT 100 ms</title>
<desc id="gs12-a-d">Ba dòng thời gian song song. Dòng trên là các snapshot tới card mạng của client. Dòng giữa là TCP: ứng dụng không đọc được gì trong 300 mili giây rồi nhận năm snapshot cùng lúc. Dòng dưới là UDP: mỗi snapshot tới là đọc được ngay, chỉ thiếu đúng một cái.</desc>
<text x="18" y="20" font-size="12" font-weight="bold" fill="currentColor">RTT 100 ms · snapshot 20 Hz · mất đúng snapshot n</text>
<line x1="60" y1="268" x2="690" y2="268" stroke="currentColor" stroke-opacity="0.45" stroke-width="1"/>
<text x="60" y="286" text-anchor="middle" font-size="9" fill="currentColor">0</text>
<text x="150" y="286" text-anchor="middle" font-size="9" fill="currentColor">50</text>
<text x="240" y="286" text-anchor="middle" font-size="9" fill="currentColor">100</text>
<text x="330" y="286" text-anchor="middle" font-size="9" fill="currentColor">150</text>
<text x="420" y="286" text-anchor="middle" font-size="9" fill="currentColor">200</text>
<text x="510" y="286" text-anchor="middle" font-size="9" fill="currentColor">250</text>
<text x="600" y="286" text-anchor="middle" font-size="9" fill="currentColor">300 ms</text>
<text x="18" y="44" font-size="10" font-weight="bold" fill="currentColor">tới card mạng client</text>
<rect x="140" y="52" width="20" height="20" rx="3" fill="#ef4444" fill-opacity="0.35"/>
<text x="150" y="66" text-anchor="middle" font-size="9" fill="currentColor">n</text>
<text x="150" y="86" text-anchor="middle" font-size="9" fill="currentColor">MẤT</text>
<rect x="230" y="52" width="20" height="20" rx="3" fill="#3b82f6" fill-opacity="0.35"/>
<text x="240" y="66" text-anchor="middle" font-size="9" fill="currentColor">n+1</text>
<rect x="320" y="52" width="20" height="20" rx="3" fill="#3b82f6" fill-opacity="0.35"/>
<text x="330" y="66" text-anchor="middle" font-size="9" fill="currentColor">n+2</text>
<rect x="410" y="52" width="20" height="20" rx="3" fill="#3b82f6" fill-opacity="0.35"/>
<text x="420" y="66" text-anchor="middle" font-size="9" fill="currentColor">n+3</text>
<rect x="500" y="52" width="20" height="20" rx="3" fill="#3b82f6" fill-opacity="0.35"/>
<text x="510" y="66" text-anchor="middle" font-size="9" fill="currentColor">n+4</text>
<rect x="590" y="52" width="20" height="20" rx="3" fill="#84cc16" fill-opacity="0.45"/>
<text x="600" y="66" text-anchor="middle" font-size="9" fill="currentColor">n'</text>
<text x="600" y="86" text-anchor="middle" font-size="9" fill="currentColor">gửi lại</text>
<text x="18" y="116" font-size="10" font-weight="bold" fill="currentColor">TCP — ứng dụng đọc được</text>
<rect x="60" y="126" width="540" height="34" rx="5" fill="#ef4444" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="330" y="148" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">đứng hình 300 ms — kernel giữ 4 snapshot đã tới nơi</text>
<rect x="600" y="126" width="86" height="34" rx="5" fill="#84cc16" fill-opacity="0.30" stroke="currentColor" stroke-opacity="0.3"/>
<text x="643" y="141" text-anchor="middle" font-size="9" fill="currentColor">n, n+1 … n+4</text>
<text x="643" y="154" text-anchor="middle" font-size="9" fill="currentColor">5 cái một lúc</text>
<text x="18" y="186" font-size="10" font-weight="bold" fill="currentColor">UDP — ứng dụng đọc được</text>
<rect x="140" y="196" width="20" height="22" rx="3" fill="#64748b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="3 2"/>
<text x="150" y="211" text-anchor="middle" font-size="9" fill="currentColor">—</text>
<rect x="230" y="196" width="20" height="22" rx="3" fill="#84cc16" fill-opacity="0.40"/>
<text x="240" y="211" text-anchor="middle" font-size="9" fill="currentColor">n+1</text>
<rect x="320" y="196" width="20" height="22" rx="3" fill="#84cc16" fill-opacity="0.40"/>
<text x="330" y="211" text-anchor="middle" font-size="9" fill="currentColor">n+2</text>
<rect x="410" y="196" width="20" height="22" rx="3" fill="#84cc16" fill-opacity="0.40"/>
<text x="420" y="211" text-anchor="middle" font-size="9" fill="currentColor">n+3</text>
<rect x="500" y="196" width="20" height="22" rx="3" fill="#84cc16" fill-opacity="0.40"/>
<text x="510" y="211" text-anchor="middle" font-size="9" fill="currentColor">n+4</text>
<text x="150" y="236" text-anchor="middle" font-size="9" fill="currentColor">thiếu 1</text>
<text x="240" y="240" font-size="10" font-style="italic" fill="currentColor">buffer nội suy 100 ms (bài 8) che kín lỗ hổng 50 ms này</text>
</svg>

> **Cái giá của in-order tăng theo RTT, trong khi lượng thông tin nhận được thì không.** RTT gấp 5 lần (40 → 200) thì tổng thời gian bị giam gấp **3,9 lần** (270 → 1.050 ms), còn nội dung vẫn đúng bấy nhiêu snapshot.

### 3.3 Từ 2 % tới một giây

Bây giờ nhân tần suất vào. 20 snapshot mỗi giây, mất 2 % tức **0,4 gói mất mỗi giây = 24 lần mỗi phút**.

| RTT | Đứng hình mỗi lần | 24 lần/phút | % thời gian chơi bị đông cứng |
|---|---|---|---|
| 40 ms | 240 ms | 5,76 s | **9,6 %** |
| 100 ms | 300 ms | 7,20 s | **12,0 %** |
| 200 ms | 400 ms | 9,60 s | **16,0 %** |

Đây là chỗ trực giác "2 % thì chỉ mất 2 %" gãy: **2 % gói mất đổi thành 12 % thời gian mất.** Hệ số khuếch đại là 6 lần, và nó đến hoàn toàn từ lời hứa in-order, không phải từ mạng.

Nhưng bảng này mới cho 300 ms. Ticket nói **một giây**. Phần còn lại đến từ chỗ fast retransmit không cứu được: **bản gửi lại cũng mất.**

Khi đó không còn dup ACK nào để kích hoạt fast retransmit nữa — server phải chờ hết **RTO** (retransmission timeout). RFC 6298: `RTO = SRTT + 4·RTTVAR`, và Linux áp sàn `TCP_RTO_MIN = 200 ms`. Với người chơi 4G, `SRTT = 200 ms`, jitter `RTTVAR ≈ 50 ms`:

```
RTO = 200 + 4×50 = 400 ms
```

Chuỗi sự kiện, RTT 200 ms:

| Lần gửi | Lúc | Kết quả | Ứng dụng client đứng hình tới đây |
|---|---|---|---|
| gốc | t = 0 | mất | |
| fast retransmit | t = 350 | **mất tiếp** | |
| RTO retransmit | t = 750 | tới nơi lúc 850 | **800 ms** |
| nếu cái này cũng mất | RTO ×2 = 800 → t = 1.550 | tới nơi 1.650 | **1.600 ms** |

Một lần mất kép ở RTT 200 cho **800 ms đông cứng**, rồi nhả ra **15 snapshot cùng lúc — 750 ms thời gian thế giới trong một khung hình**. Nhân vật chạy 5 m/s sẽ **teleport 3,75 m**. Đúng hai triệu chứng trong ticket, và không có gì để ghi vào log server.

Tần suất, với giả định mất gói độc lập:

```
mất 1 lần   2 %      -> 24 lần/phút    đứng hình 0,3–0,4 s
mất 2 lần   0,04 %   -> 0,48 lần/phút  đứng hình 0,8 s
mất 3 lần   0,0008 % -> 0,01 lần/phút  đứng hình 1,6 s
```

Giả định độc lập là giả định **lạc quan nhất có thể**: mất gói thật hay đi thành chùm — sóng 4G yếu một nhịp, buffer router đầy một nhịp, thì mấy gói liên tiếp cùng chết. Với loss theo chùm, tỉ lệ mất kép cao hơn 0,04 % nhiều lần, và "một phút bị vài lần" khớp.

---

## ⏸ Dừng lại — đoán trước #2

Hộp quan trọng nhất của bài. Phản đối tự nhiên nhất, và nó nghe rất hợp lý:

> *"Thì retransmit là đúng chứ sao. Dữ liệu tới muộn còn hơn không có. Ít nhất client biết đầy đủ chuyện đã xảy ra."*

**Ở RTT 200, sau 800 ms đông cứng, client nhận 15 snapshot cùng một lúc. Trong 15 snapshot đó, bao nhiêu cái thực sự có ích cho việc vẽ khung hình kế tiếp?**

```
(a) Cả 15 — client cần đủ lịch sử để nội suy mượt
(b) Khoảng một nửa
(c) Đúng 1 cái
```

Chọn xong hãy đọc tiếp.

---

### 3.4 Dữ liệu game có hạn sử dụng

Đáp án là **(c)**, và đây là thứ tách game ra khỏi mọi hệ thống bạn từng viết.

Client đang phải vẽ **thời điểm hiện tại**. Snapshot `n` mô tả thế giới ở một thời điểm **750 ms trước**. Snapshot `n+14` mô tả thế giới ở thời điểm gần nhất. Vẽ theo cái nào?

Theo cái mới nhất. Mười bốn cái kia bị đọc ra rồi vứt đi trong cùng một vòng lặp.

```
15 snapshot tới nơi  ->  1 cái dùng được  ->  14/15 = 93,3 % vô giá trị
```

Con số đó là toàn bộ lập luận của bài. Ở mức một lần mất đơn lẻ nó cũng đã tệ:

| RTT | Nhả ra cùng lúc | Dùng được | Vô giá trị |
|---|---|---|---|
| 40 ms | 4 snapshot | 1 | **75,0 %** |
| 100 ms | 5 snapshot | 1 | **80,0 %** |
| 200 ms | 7 snapshot | 1 | **85,7 %** |

TCP đã bỏ ra 300 ms và một lượt gửi lại 500 byte *(snapshot 50 entity × 10 B, bài 8)* để giao cho bạn một thứ mà bạn vứt ngay khi nhận. Và trong lúc nó cố giao thứ đó, nó **chặn thứ bạn thật sự cần**.

> **Một gói snapshot có hạn sử dụng đúng 50 ms.** Hết 50 ms, đã có bản mới hơn mô tả cùng thứ đó chính xác hơn. Gói cũ tới muộn không phải là "thông tin trễ" — nó là **rác đã được thay thế**.

Ở BE App, dữ liệu không hết hạn: một response 200 tới muộn 300 ms vẫn là response đúng. Ở game, thông tin về **trạng thái liên tục** bị ghi đè 20 lần mỗi giây, nên:

> **Thà mất một gói còn hơn chờ nó.** Mất một gói: client thiếu 50 ms dữ liệu, và buffer nội suy 100 ms (bài 8) nuốt trọn lỗ hổng đó — người chơi không thấy gì cả. Chờ một gói: người chơi đứng hình 300 ms rồi teleport.

Chú ý cặp số: buffer nội suy 100 ms **đúng bằng hai chu kỳ snapshot**. Nghĩa là UDP mất một gói lẻ là hoàn toàn vô hình, mất hai gói liên tiếp là vừa chạm mép. Con số 100 ms mà bài 8 xếp hạng nhất trong bốn cách cắt độ trễ, ở đây lộ ra vai trò thứ hai của nó: **bảo hiểm mất gói**. Hạ nó xuống 50 ms là cắt 50 ms độ trễ **và** vứt luôn bảo hiểm — đó là cái giá mà bài 8 gọi là "tiêu biên an toàn".

### 3.5 Nhưng không phải mọi message đều hết hạn

Nếu mọi thứ đều mất được thì bài kết thúc ở đây với câu trả lời "UDP, xong". Nó không kết thúc, vì trong cùng một game có những message **không bao giờ hết hạn**. "Player 7 đã chết" là một sự kiện — không có bản mới hơn nào mô tả lại nó. Gói đó mất mà không ai gửi lại thì client vẽ một xác chết vẫn đang chạy cho tới hết trận.

Tiêu chí phân loại chỉ có một câu hỏi: **nếu message này mất, có bản sau tự sửa được không?**

<svg viewBox="0 0 700 214" role="img" aria-labelledby="gs12-b-t gs12-b-d" style="width:100%;height:auto">
<title id="gs12-b-t">Thang hạn sử dụng của message trong game</title>
<desc id="gs12-b-d">Một trục ngang từ hạn năm mươi mili giây tới vô hạn. Bên trái là trạng thái liên tục như vị trí và vận tốc, gửi unreliable. Ở giữa là hiệu ứng ngắn hạn. Bên phải là sự kiện rời rạc như chết, nhặt đồ, chat, gửi reliable.</desc>
<line x1="40" y1="128" x2="670" y2="128" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5"/>
<text x="40" y="150" font-size="10" fill="currentColor">hạn 50 ms</text>
<text x="355" y="150" text-anchor="middle" font-size="10" fill="currentColor">hạn vài trăm ms</text>
<text x="670" y="150" text-anchor="end" font-size="10" fill="currentColor">không bao giờ hết hạn</text>
<rect x="40" y="46" width="230" height="66" rx="8" fill="#84cc16" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.28"/>
<text x="56" y="68" font-size="11" font-weight="bold" fill="currentColor">TRẠNG THÁI LIÊN TỤC</text>
<text x="56" y="86" font-size="10" fill="currentColor">vị trí · vận tốc · góc nhìn · HP</text>
<text x="56" y="103" font-size="10" fill="currentColor">bản sau tự sửa cho bản trước</text>
<rect x="288" y="46" width="134" height="66" rx="8" fill="#f59e0b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.28"/>
<text x="304" y="68" font-size="11" font-weight="bold" fill="currentColor">HIỆU ỨNG</text>
<text x="304" y="86" font-size="10" fill="currentColor">tiếng súng · khói</text>
<text x="304" y="103" font-size="10" fill="currentColor">muộn = sai, bỏ</text>
<rect x="440" y="46" width="230" height="66" rx="8" fill="#ef4444" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.28"/>
<text x="456" y="68" font-size="11" font-weight="bold" fill="currentColor">SỰ KIỆN RỜI RẠC</text>
<text x="456" y="86" font-size="10" fill="currentColor">chết · nhặt đồ · chat · kết trận</text>
<text x="456" y="103" font-size="10" fill="currentColor">không có bản sau để sửa</text>
<text x="155" y="180" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">unreliable — mất thì thôi</text>
<text x="155" y="198" text-anchor="middle" font-size="10" fill="currentColor">gửi dày, không ack, không giữ thứ tự</text>
<text x="555" y="180" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">reliable — phải tới</text>
<text x="555" y="198" text-anchor="middle" font-size="10" fill="currentColor">ack + gửi lại, thứ tự chỉ trong nhóm của nó</text>
<line x1="355" y1="118" x2="355" y2="168" stroke="currentColor" stroke-opacity="0.35" stroke-width="1" stroke-dasharray="4 3"/>
</svg>

Bảng đầy đủ cho một game bắn súng:

| Message | Hạn sử dụng | Mất được? | Kênh |
|---|---|---|---|
| Snapshot vị trí / vận tốc entity | **50 ms** (1 snapshot) | có | unreliable |
| Góc nhìn, animation state | 50 ms | có | unreliable |
| Input của client gửi lên | 1 tick, nhưng **gửi kèm 2–3 input cũ** | có, vì đã gửi dư | unreliable + gửi trùng |
| Hiệu ứng tiếng súng, khói | ~200 ms — muộn hơn thì sai chỗ | có | unreliable |
| **"Player 7 đã chết"** | **∞** | **không** | reliable |
| **"Nhặt item 42 thành công"** | **∞** | **không** | reliable |
| Chat, ping bản đồ | ∞ | không | reliable |
| Kết trận, điểm số, phần thưởng | ∞ | không | reliable — và xuống DB (bài 1) |

Hai hàng in đậm là lý do bạn **không thể chỉ dùng UDP trần**. Bạn cần một kênh reliable cho chúng. Nhưng — và đây là điểm then chốt — bạn cần reliable **chỉ cho chúng**, và quan trọng hơn: bạn cần thứ tự **chỉ trong nhóm của chúng**. Việc "player 7 đã chết" phải tới không có lý do gì để chặn snapshot vị trí của 49 entity còn lại.

TCP không cho bạn tách như vậy. Nó chỉ có **một hàng đợi duy nhất cho toàn bộ kết nối**, nên một sự kiện chat 30 byte bị mất cũng đủ giam toàn bộ luồng snapshot. Đó là lý do bài 14 dạy cách tự dựng nhiều "kênh" độc lập trên UDP, và bài 13 chỉ ra QUIC cho bạn nhiều stream sẵn — cả hai đều là câu trả lời cho đúng một dòng: *reliable per-channel, không phải reliable per-connection*.

### 3.6 Ba thứ TCP còn làm sau lưng bạn

Head-of-line là cái lớn nhất, nhưng không phải cái duy nhất. Ba thứ nữa, xếp theo mức độ sửa được:

**Nagle — sửa được, và phải sửa.** TCP gom các gói nhỏ lại: nếu có dữ liệu chưa được ACK, gói nhỏ tiếp theo bị giữ trong buffer chờ ghép cho đủ MSS. Game gửi toàn gói nhỏ (một input vài chục byte) nên dính đủ. Cộng với **delayed ACK** ở phía nhận — Linux chờ tới 40 ms trước khi gửi ACK rỗng — hai thứ chờ nhau và sinh ra độ trễ tới **40 ms** cho một gói lẽ ra đi ngay.

40 ms trên ngân sách 182 ms của bài 8 là **22,0 %**, thêm vào mà không đổi lấy gì cả.

```go
// Go: net package đã bật TCP_NODELAY sẵn cho mọi TCPConn.
// Kiểm lại vẫn rẻ hơn là đoán:
tcp := conn.(*net.TCPConn)
_ = tcp.SetNoDelay(true)   // true = TẮT Nagle
```

Nhớ rằng đây là mặc định **của Go**, không phải của mọi nơi. Java `Socket` mặc định `tcpNoDelay = false`. Node.js cần `socket.setNoDelay(true)`. C thuần cần `setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, ...)`. Delayed ACK thì **không có công tắc chuẩn ở tầng ứng dụng** — tắt Nagle là cách duy nhất để phá cặp đôi này.

**Congestion control — không sửa được.** Mất gói, TCP hiểu là mạng tắc và thu nhỏ cửa sổ: Reno chia đôi, CUBIC nhân khoảng 0,7. Nghĩa là **đúng lúc bạn vừa mất dữ liệu và đang cần gửi lại nhanh nhất, TCP tự nguyện gửi chậm lại.**

Nói ngay giới hạn để không thổi phồng: một luồng snapshot 10 KB/s (bài 8) hiếm khi chạm trần cửa sổ, nên phần lớn thời gian điều này **không gây hại gì**. Nó cắn đúng vào những khoảnh khắc lưu lượng vọt lên — hồi sinh cả đội, mở cửa sang khu vực đông entity, 30 người cùng vào tầm nhìn. Và đó chính xác là những khoảnh khắc quan trọng nhất của trận đấu.

**Bandwidth phí cho retransmit — không sửa được.** Mỗi lần gửi lại là 500 byte chở dữ liệu đã hết hạn: 12 KB/phút mỗi người chơi ở 24 lần/phút. Nhỏ về tiền, nhưng nó chiếm chỗ trên đúng đường truyền đang tắc.

---

## ⏸ Dừng lại — đoán trước #3

Ba mục vừa rồi đóng đinh khá chắc rằng TCP không hợp với game real-time. Trước khi đọc mục cuối:

**Trong bốn game sau, cái nào bạn KHÔNG nên tốn công viết UDP?**

```
(a) Cờ vua online, đồng hồ đếm ngược
(b) MMO PvE, người chơi đánh quái, tick 10 Hz
(c) FPS 5v5 thi đấu
(d) Game .io chạy trong trình duyệt, 50 người một phòng
```

Có nhiều hơn một đáp án. Lý do quan trọng hơn đáp án.

---

## 4. Khi nào TCP vẫn là lựa chọn đúng

**(a), (b) và (d)** — và với (d), lý do không phải kỹ thuật.

Mục 3 đo cái giá của TCP. Cái giá đó chỉ đáng trả sự phức tạp của UDP khi **hạn sử dụng của dữ liệu ngắn hơn thời gian phục hồi**. Quay lại công thức: đứng hình `200 + R` ms. Nếu game của bạn không quan tâm 300 ms thì không có vấn đề gì để giải.

| Loại | Vì sao TCP đúng |
|---|---|
| **Turn-based** (cờ, bài, chiến thuật lượt) | Một nước đi **không bao giờ hết hạn**. Toàn bộ traffic nằm ở cột phải của thang hạn sử dụng. Không có head-of-line nào để bị chặn vì không có gói sau. |
| **MMO PvE, tick 10 Hz** | Chu kỳ 100 ms, buffer nội suy thường đặt 200–300 ms. Đứng hình 300 ms nằm trong đệm hoặc ló ra rất ít. Đổi lại TCP cho bạn reliable miễn phí cho hàng trăm loại sự kiện quest/inventory/loot — vốn chiếm phần lớn traffic của thể loại này. |
| **Chat, ping bản đồ, voice signalling** | Hạn ∞. |
| **Toàn bộ meta plane** (login, shop, matchmaking, leaderboard) | Là BE App thuần tuý — nửa trên của bản đồ bài 2. HTTP/TCP, không bàn. |
| **Game .io chạy trong trình duyệt** | Xem dưới. |

**Trường hợp (d) đáng nói riêng**, vì đó là chỗ người mới hay chê nhầm. Một game .io 50 người chạy WebSocket — tức TCP — và chạy hoàn toàn ổn: trình duyệt **không cho mở UDP socket** nên không có lựa chọn nào để so sánh (bài 13 nói về các lối thoát hiện đại); thể loại này không có hitscan, va chạm là tiếp xúc thân thể, sai 100 ms không đổi kết quả; và buffer nội suy đặt rộng được.

Rộng hơn (d), nhiều studio chọn TCP/WebSocket kể cả khi UDP khả thi. Lý do không phải kỹ thuật, và hoàn toàn hợp lý:

| Lý do vận hành | Nội dung |
|---|---|
| **Firewall và proxy doanh nghiệp** | Cổng 443 TCP đi được từ mọi mạng trên đời. UDP bị chặn ở tỉ lệ mạng công ty, trường học, khách sạn đủ lớn để tạo ra một dòng ticket ổn định. Nhiều game dùng UDP vẫn phải giữ **đường lùi TCP** cho nhóm người chơi này. |
| **Hạ tầng có sẵn** | Load balancer, TLS termination, observability, CDN — tất cả đều mặc định nói TCP. |
| **Chi phí kỹ sư** | UDP nghĩa là bạn tự viết reliability, ack, ước lượng RTT, chống DoS, quản lý connection. Đó là bài 14 và bài 16 — vài tuần người, và là code **bạn phải nuôi mãi mãi**. |

> Chọn TCP vì game của bạn chịu được `200 + R` ms là **kỹ thuật đúng**. Chọn TCP vì đội bạn có ba người và không có ai nuôi nổi một reliability layer tự viết là **kỹ thuật đúng**. Chỉ có một lựa chọn sai: chọn mà không biết mình đang trả bao nhiêu mili giây.

### Bảng quyết định

Đọc từ trên xuống, dừng ở dòng đầu tiên khớp:

| Tiêu chí | Chọn |
|---|---|
| Chạy trong trình duyệt, không kiểm soát được client | **WebSocket/TCP** (hoặc WebTransport — bài 13) |
| Mọi message đều hạn ∞ (turn-based, meta, chat) | **TCP** |
| Ngân sách độ trễ ≥ 500 ms hoặc tick ≤ 10 Hz | **TCP** — cái giá `200 + R` nằm trong đệm |
| Đội không có người nuôi được reliability layer | **TCP** — và ghi vào tài liệu là quyết định có ý thức |
| Có trạng thái liên tục ở ≥ 20 Hz **và** ngân sách < 250 ms | **UDP** |
| Cần thứ tự độc lập theo từng loại message | **UDP tự làm (bài 14)** hoặc **QUIC (bài 13)** |
| Người chơi trên mạng di động / xuyên khu vực, RTT > 150 ms | **UDP** — cái giá `200 + R` phình theo RTT |
| Thi đấu, hitscan, lag compensation (bài 21) | **UDP** |

Hai dòng cuối cộng lại là lý do mọi FPS thi đấu đều chạy UDP, và lý do đó tính ra được chứ không phải truyền thống.

---

## 5. Tính tay

**Bài 1.** Một MOBA chạy TCP: snapshot **30 Hz**, người chơi có RTT **120 ms**, loss **1 %**.
- Chu kỳ snapshot là bao nhiêu ms? Dựng lại công thức mục 3.2 cho chu kỳ này — `t_r` và số snapshot bị giam đổi thành gì?
- Mỗi lần mất một gói, người chơi đứng hình bao lâu, và bao nhiêu phần trăm thời gian chơi bị đông cứng?
- So với cùng game chạy snapshot 20 Hz: tăng snapshot rate làm hiện tượng này **nặng hơn hay nhẹ hơn**? Giải thích bằng công thức, đừng đoán.

**Bài 2.** Vẫn game ở mục 2 (20 Hz, RTT 100, loss 2 %), nhưng đội quyết định giữ TCP và **tăng buffer nội suy** để che các lần đứng hình.
- Buffer phải đặt bao nhiêu ms để che kín một lần mất đơn lẻ?
- Lắp con số đó vào ngân sách 182 ms của bài 8 — tổng độ trễ A bấm → B thấy thành bao nhiêu?
- Để che cả trường hợp mất kép (800 ms ở RTT 200) thì cần bao nhiêu, và ngân sách thành bao nhiêu? Con số đó còn chơi được không?

**Bài 3.** Một trận 100 người chơi, snapshot 500 byte, 20 Hz, loss 2 %, RTT 100 ms.
- Mỗi phút toàn trận có bao nhiêu lượt retransmit, và tổng bao nhiêu KB gửi lại?
- Trong số KB đó, bao nhiêu phần trăm là dữ liệu đã hết hạn lúc tới nơi? (Dùng bảng mục 3.4.)
- Băng thông chiều ra của trận là 1,0 MB/s (bài 8). Retransmit chiếm bao nhiêu phần trăm của nó — và vì sao con số nhỏ đó vẫn không phải là lý do để yên tâm?

---

## 6. Chuyển giao

Không có đáp án trong bài.

**Bạn làm một MMO sinh tồn.** Thế giới mở, 200 người chơi một server, tick **15 Hz**, snapshot **10 Hz**. Có PvE (đánh quái, làm nhiệm vụ, chế đồ) và có PvP (đánh nhau bằng cung, có hitscan). Người chơi trải khắp Đông Nam Á, RTT từ 30 tới 250 ms, một phần lớn chơi trên mạng di động. Đội có 4 backend, không ai từng viết netcode.

1. Với snapshot 10 Hz, chu kỳ là 100 ms. Dựng lại công thức mục 3.2 — ở RTT 250, một lần mất gói đơn lẻ giam bao nhiêu snapshot và đứng hình bao lâu? Con số đó có làm phần PvE chơi được không?
2. Cùng con số đó áp cho một pha PvP bắn cung. Nó có chơi được không? Nếu câu 1 và câu 2 trả lời khác nhau, thì **cùng một game có hai câu trả lời** — bạn xử lý thế nào?
3. Liệt kê traffic của game này và xếp vào thang hạn sử dụng ở mục 3.5. Tỉ lệ ước chừng giữa hai cột là bao nhiêu? Tỉ lệ đó đẩy quyết định về phía nào?
4. Đội đề xuất: **TCP cho mọi thứ, nhưng snapshot vị trí thì gửi kèm cả vị trí của 3 tick trước trong mỗi gói** để mất một gói vẫn có dữ liệu bù. Cách này hỏng ở đâu? (Gợi ý: nó sửa được vấn đề "thiếu dữ liệu", nhưng bài này nói vấn đề chính không phải thiếu dữ liệu.)
5. Bạn chọn UDP. Producer hỏi: "mất bao lâu và rủi ro gì?" Trả lời bằng danh sách cụ thể những thứ bạn phải tự viết, và cái nào trong đó bạn **không thể** kiểm thử được trên mạng LAN của văn phòng.
6. **Câu khó nhất:** giả sử bạn chạy UDP và mọi thứ tốt. Sáu tháng sau, số liệu cho thấy **7 % người chơi không kết nối được** — mạng của họ chặn UDP. Bạn dựng đường lùi TCP cho nhóm này. Bây giờ trên cùng một server, cùng một trận PvP, có người chơi qua UDP (ngân sách ~180 ms) và người chơi qua TCP (ngân sách ~180 ms cộng thêm `200+R` mỗi lần mất gói, tức trung bình cao hơn và **phương sai cao hơn nhiều**). Lag compensation (bài 21) tua ngược thế giới về thời điểm người bắn đã thấy. Câu hỏi: **khi một người TCP bắn trúng một người UDP trong khoảnh khắc người TCP vừa thoát khỏi 300 ms đứng hình, server nên xử theo thời điểm nào — và có tồn tại lựa chọn nào không biến 7 % kia thành công dân hạng hai hoặc thành kẻ có lợi thế bất thường?** Nghĩ kỹ trước khi kết luận rằng chỉ cần "giới hạn mức tua ngược".

---

## 7. Tóm tắt

- TCP hứa **reliable** và **in-order**. Game thỉnh thoảng cần cái đầu, gần như không bao giờ cần cái thứ hai — nhưng TCP bán kèm, không tách được.
- **Head-of-line blocking tính được**: mất snapshot `n` trong luồng 20 Hz thì bản gửi lại tới lúc `t_r = 150 + 1,5·R`, số snapshot bị giam là `k < 3 + R/50`, và người chơi đứng hình **`200 + R` ms**. RTT 40/100/200 → **240 / 300 / 400 ms**, tổng thời gian bị giam **270 / 500 / 1.050 ms**.
- **2 % packet loss → 12 % thời gian đông cứng** ở RTT 100: 0,4 gói mất mỗi giây × 300 ms = 7,2 s mỗi phút. Hệ số khuếch đại 6 lần, đến hoàn toàn từ lời hứa in-order.
- **Một giây** trong ticket là trường hợp **bản gửi lại cũng mất**: không còn dup ACK, phải chờ `RTO = SRTT + 4·RTTVAR` (sàn Linux 200 ms) = 400 ms ở RTT 200 → đứng hình **800 ms**, nhả **15 snapshot một lúc = 750 ms thời gian thế giới** → teleport **3,75 m** ở tốc độ 5 m/s. Mất ba lần liên tiếp: RTO ×2 → **1,6 s**.
- **Dữ liệu game có hạn sử dụng.** Snapshot hết hạn sau **50 ms**. Trong cụm được nhả ra, chỉ **1 cái** dùng được: **75,0 % / 80,0 % / 85,7 %** vô giá trị ở RTT 40/100/200, và **93,3 %** ở lần mất kép. TCP dừng thế giới 300 ms để giao một thứ bị vứt ngay khi nhận.
- **Thà mất còn hơn chờ**: mất một gói UDP tạo lỗ hổng 50 ms, mà **buffer nội suy 100 ms của bài 8 đúng bằng hai chu kỳ snapshot** nên nuốt trọn — người chơi không thấy gì.
- Nhưng **sự kiện rời rạc không hết hạn** (chết, nhặt đồ, chat, kết trận) và **phải** tới. Thứ game cần là **reliable theo từng kênh**, còn TCP chỉ có **một hàng đợi cho cả kết nối** — một gói chat mất giam luôn toàn bộ snapshot.
- TCP còn ba khoản nữa: **Nagle + delayed ACK cộng tới 40 ms = 22,0 % ngân sách 182 ms** (tắt bằng `TCP_NODELAY`; Go bật sẵn, Java/Node thì không); **congestion control thu cửa sổ đúng lúc cần băng thông nhất** (chỉ cắn ở các đợt lưu lượng vọt, không cắn ở luồng 10 KB/s đều); và **500 byte phí mỗi lần retransmit**.
- **TCP vẫn đúng** cho turn-based, meta plane, chat, MMO PvE tick thấp, và game .io trong trình duyệt. Cái giá `200 + R` chỉ thành vấn đề khi **hạn sử dụng của dữ liệu ngắn hơn thời gian phục hồi**.
- Nhiều studio chọn TCP/WebSocket vì **firewall cổng 443, hạ tầng có sẵn, và không có người nuôi reliability layer**. Đó là kỹ thuật đúng. Lựa chọn sai duy nhất là chọn mà không biết mình đang trả bao nhiêu mili giây.

→ **Bài 13 — WebSocket, QUIC & WebTransport**: biết vì sao UDP thắng về lý thuyết rồi. Giờ tới thực tế: game chạy trong trình duyệt thì bạn không được chọn UDP, và ba giao thức hiện đại giải bài toán đó theo ba cách khác nhau.
