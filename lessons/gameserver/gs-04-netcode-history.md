# Bài 4 — Lịch sử netcode: 1993 tới nay

## 1. Mục tiêu

Sau bài này bạn có thể:

- Kể lại **năm cột mốc** đã sinh ra toàn bộ netcode hiện đại, theo đúng thứ tự chúng buộc phải xảy ra.
- Giải thích vì sao mỗi cột mốc là **hoá đơn** của cột mốc trước — không phát minh nào là ý tưởng đẹp từ trên trời rơi xuống.
- Trả lời được câu hỏi mọi người chơi FPS đều từng hỏi: **vì sao tôi chết sau khi đã nấp sau tường** — và vì sao đó không phải bug.
- Chỉ ra **hai nhánh netcode còn sống tới hôm nay** và điều kiện để mỗi nhánh dùng được.
- Đặt mỗi chương còn lại của course vào đúng cột mốc lịch sử mà nó thuộc về.

---

## 2. Triệu chứng

Bạn chơi một game bắn súng. Bạn thấy đối thủ chạy về phía mình, bạn lùi lại, nấp hẳn sau bức tường. **Trên màn hình bạn, bạn đã an toàn ít nhất nửa giây.**

Rồi bạn chết.

Bạn xem lại killcam. Trong khung hình của **kẻ bắn**, bạn vẫn đang đứng giữa đường, chưa hề nấp. Hắn ngắm vào bạn, bắn, trúng.

Hai đoạn video, cùng một thời điểm, hai sự thật khác nhau. Không ai gian lận. Không có bug.

Đây là một trong những hành vi bị phàn nàn nhiều nhất trong lịch sử game online. Nó tồn tại ở gần như mọi game bắn súng hiện đại, và điều đáng nói là:

> Nó **không phải lỗi**. Nó là một quyết định thiết kế có chủ đích, được trình bày công khai tại GDC năm 2001, và mọi studio sau đó đều chọn lại đúng quyết định ấy.

Bài này giải thích vì sao — bằng cách đi lại con đường mà ngành đã đi, theo đúng thứ tự.

---

## 3. Lý thuyết

### 3.1 Bản đồ năm cột mốc

<svg viewBox="0 0 720 260" role="img" aria-labelledby="gs4-a-t gs4-a-d" style="width:100%;height:auto">
<title id="gs4-a-t">Năm cột mốc netcode từ 1993 tới nay</title>
<desc id="gs4-a-d">Trục thời gian từ 1993 tới nay với năm cột mốc: Doom lockstep năm 1993, Quake client-server năm 1996, QuakeWorld prediction cuối 1996, Age of Empires lockstep cho RTS năm 1997, Valve lag compensation năm 2001, và GGPO rollback từ 2006. Hai nhánh còn sống là lockstep và authoritative client-server.</desc>
<line x1="40" y1="150" x2="690" y2="150" stroke="currentColor" stroke-opacity="0.45" stroke-width="2"/>
<circle cx="80" cy="150" r="7" fill="#ef4444"/>
<text x="80" y="132" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">1993</text>
<text x="80" y="176" text-anchor="middle" font-size="10" fill="currentColor">Doom</text>
<text x="80" y="190" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.75">lockstep P2P</text>
<text x="80" y="204" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.6">chỉ LAN</text>
<circle cx="215" cy="150" r="7" fill="#3b82f6"/>
<text x="215" y="132" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">6/1996</text>
<text x="215" y="176" text-anchor="middle" font-size="10" fill="currentColor">Quake</text>
<text x="215" y="190" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.75">client-server</text>
<text x="215" y="204" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.6">có trọng tài, nhưng trễ</text>
<circle cx="350" cy="150" r="7" fill="#3b82f6"/>
<text x="350" y="132" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">12/1996</text>
<text x="350" y="176" text-anchor="middle" font-size="10" fill="currentColor">QuakeWorld</text>
<text x="350" y="190" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.75">prediction</text>
<text x="350" y="204" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.6">→ chương 5</text>
<circle cx="470" cy="150" r="7" fill="#84cc16"/>
<text x="470" y="132" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">1997</text>
<text x="470" y="176" text-anchor="middle" font-size="10" fill="currentColor">Age of Empires</text>
<text x="470" y="190" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.75">lockstep sống lại</text>
<text x="470" y="204" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.6">cho RTS</text>
<circle cx="580" cy="150" r="7" fill="#f59e0b"/>
<text x="580" y="132" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">2001</text>
<text x="580" y="176" text-anchor="middle" font-size="10" fill="currentColor">Valve</text>
<text x="580" y="190" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.75">lag compensation</text>
<text x="580" y="204" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.6">→ bài 21</text>
<circle cx="670" cy="150" r="7" fill="#8b5cf6"/>
<text x="670" y="132" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">2006+</text>
<text x="668" y="176" text-anchor="middle" font-size="10" fill="currentColor">GGPO</text>
<text x="668" y="190" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.75">rollback</text>
<text x="668" y="204" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.6">→ bài 22</text>
<path d="M80 140 Q 275 70 470 140" fill="none" stroke="#84cc16" stroke-width="2" stroke-opacity="0.7" stroke-dasharray="5 4"/>
<text x="275" y="66" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">nhánh LOCKSTEP — sống lại ở RTS và fighting game</text>
<path d="M215 162 Q 400 236 580 162" fill="none" stroke="#3b82f6" stroke-width="2" stroke-opacity="0.7" stroke-dasharray="5 4"/>
<text x="400" y="250" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">nhánh AUTHORITATIVE CLIENT-SERVER — gần như mọi thứ còn lại</text>
</svg>

Điểm quan trọng của bản đồ này: **mỗi cột mốc sinh ra vì cột mốc trước để lại một hoá đơn chưa trả.** Đọc theo dây nhân quả, không đọc như danh sách.

### 3.2 — 1993, Doom: làm đúng vì không có lựa chọn

Doom nối bốn máy qua LAN theo mô hình **peer-to-peer lockstep**. Cả bốn máy chạy cùng một simulation; chúng chỉ trao đổi **input**, không trao đổi state. Game logic khoá cứng ở **35 tic/giây**.

Băng thông của thiết kế đó nhỏ đến mức khó tin. Với 4 người và ~2 byte input mỗi tic:

```
4 người × 35 tic/s × 2 byte = 280 byte/s = 2,24 kbps
```

**Vừa đủ chui qua một modem 2400 baud.** Đây là lý do lockstep không bao giờ chết hẳn: về băng thông, nó là thứ rẻ nhất từng được phát minh.

Nó có hai tính chất tuyệt vời:
- Cực rẻ, và **chi phí không phụ thuộc số entity** — như đã tính ở bài 3.
- Mọi máy luôn khớp nhau tuyệt đối, vì chúng chạy cùng một phép tính.

Và hai vấn đề, cả hai đều chí tử:
- **Mọi máy phải chờ máy chậm nhất ở mỗi frame.**
- **Không có ai là trọng tài.** Mỗi máy tự tin kết quả của mình, nên sửa client là gian lận được ngay.

---

## ⏸ Dừng lại — đoán trước #1

Doom chạy tốt trên LAN, không chơi được qua Internet năm 1993.

**Cái gì chặn nó — băng thông hay độ trễ?** Và con số nào chứng minh?

```
(a) Băng thông — modem thời đó quá chậm
(b) Độ trễ — mỗi frame phải chờ người tệ nhất
(c) Cả hai ngang nhau
```

Gợi ý: bạn vừa đọc con số băng thông ở trên. Bảng RTT ở bài 3 mục 3.3 cho nốt nửa còn lại.

---

### 3.3 — 6/1996, Quake: mua công bằng bằng độ trễ

Đáp án là **(b)**. Băng thông 2,24 kbps thì modem 28.8 kbps năm 1996 thừa sức. Thứ giết lockstep qua Internet là **độ trễ**: RTT 150 ms kéo trần xuống ~13 frame/giây, và toàn bộ trận chạy chậm bằng người có đường mạng tệ nhất.

Quake đổi mô hình: **client-server**. Server là trọng tài duy nhất, client chỉ gửi input và vẽ lại cái server bảo.

Được hai thứ ngay lập tức:
- **Gian lận khó hẳn** — client không còn quyền quyết định gì.
- **Không ai phải chờ ai** — người mạng tệ chỉ tự mình chịu, không kéo cả trận xuống.

Nhưng hoá đơn tới ngay. Client bấm phím rồi phải chờ trọn một vòng round-trip mới thấy nhân vật nhúc nhích:

| RTT | Chờ tick | Chờ render | Từ lúc bấm tới lúc thấy |
|---|---|---|---|
| 40 ms | 8,3 ms | 8 ms | **56 ms** |
| 80 ms | 8,3 ms | 8 ms | **96 ms** |
| 150 ms | 8,3 ms | 8 ms | **166 ms** |
| 250 ms | 8,3 ms | 8 ms | **266 ms** |

Đối chiếu với ngưỡng FPS ở bài 3 — khoảng 80 ms — thì chỉ dòng đầu là chấp nhận được. Người chơi qua modem đường dài thấy nhân vật của mình **trôi theo sau tay mình**.

### 3.4 — 12/1996, QuakeWorld: prediction

Sáu tháng sau, id Software ra **QuakeWorld**, và John Carmack thêm **client-side prediction**: client tự đoán trước kết quả input của mình và vẽ ngay lập tức; server vẫn là trọng tài; khi state thật về, client sửa lại nếu lệch.

Đây là phát minh làm cho game hành động qua Internet trở nên **chơi được**. Nó phá vỡ một giả định tưởng như bất di bất dịch: rằng bạn phải chọn *một trong hai* — hoặc phản hồi tức thì (P2P), hoặc có trọng tài (client-server).

Cái giá — và bài 18 sẽ nói kỹ — là **luật chơi phải tồn tại ở cả hai phía và phải khớp tuyệt đối**. Bạn viết simulation hai lần. Đó là hoá đơn mà mọi game hiện đại vẫn đang trả hàng ngày.

> **Toàn bộ chương 5 của course này là hoá đơn của tháng 12 năm 1996.**

### 3.5 — 1997, Age of Empires: lockstep sống lại

Trong khi FPS bỏ lockstep, RTS nhặt nó lên. Ensemble Studios làm Age of Empires chạy **1.500 quân qua modem 28.8 kbps** — bài trình bày của họ tại GDC 2001 có tên đúng như vậy: *"1500 Archers on a 28.8"* (Mark Terrano & Paul Bettner).

Cách làm chính là cách của Doom, với hai điều chỉnh cho hợp Internet:

- **Turn delay**: mệnh lệnh bấm ở frame N được thực thi ở frame N+2, đủ thời gian gói tin đi vòng. Người chơi RTS không nhận ra 250 ms trễ khi ra lệnh "đưa quân tới đây" — trục ngang ở bài 3 rộng rãi hơn FPS rất nhiều.
- **Chỉ đồng bộ mệnh lệnh của người chơi**, không đồng bộ đường đi của quân. Đường đi do simulation tất định tự tính ra giống hệt nhau trên mọi máy.

Hoá đơn của lựa chọn này là **determinism tuyệt đối**, và nó khắc nghiệt: một phép nhân float lệch chữ số cuối trên máy A là hai người chơi hai trận khác nhau mười phút sau. Đây chính là lý do chương 3 của course tồn tại.

---

## ⏸ Dừng lại — đoán trước #2

Đến năm 2001, FPS đã có: server trọng tài (1996) + client prediction (12/1996). Người chơi thấy nhân vật **của mình** phản hồi tức thì.

Nhưng vẫn còn một vấn đề chưa giải, và nó chỉ xuất hiện khi bạn **bắn vào người khác**.

**Vấn đề đó là gì?** Nghĩ theo hướng: prediction sửa được độ trễ của *chính mình*, nhưng người khác thì sao?

```
(a) Người khác cũng cần prediction, chưa ai làm
(b) Vị trí người khác mà bạn nhìn thấy luôn là vị trí trong QUÁ KHỨ,
    nên bạn luôn ngắm vào chỗ họ đã rời đi
(c) Server tính trúng không chính xác, cần tick rate cao hơn
```

---

### 3.6 — 2001, Valve: lag compensation, và hoá đơn tên là "chết sau khi đã nấp"

Đáp án là **(b)**, và đây là chỗ triệu chứng ở mục 2 được giải thích.

Tại GDC 2001, Yahn Bernier của Valve trình bày *Latency Compensating Methods in Client/Server In-game Protocol Design and Optimization*. Vấn đề được phát biểu chính xác như thế này:

Vị trí đối thủ mà bạn nhìn thấy trên màn hình đã cũ. Nó cũ đúng bằng: thời gian gói tin đi từ server tới bạn, **cộng** khoảng đệm nội suy mà client cố ý giữ để hình ảnh mượt (bài 20).

```
bạn thấy đối thủ ở vị trí của       RTT/2  +  buffer nội suy (~100 ms)  trước
```

Nghĩa là nếu bạn ngắm chính xác vào giữa người đối thủ trên màn hình và bắn, thì **theo đồng hồ của server, bạn đang bắn vào chỗ đối thủ đã rời khỏi từ lâu**.

Có hai lựa chọn, và cả hai đều khó chịu:

**Lựa chọn A — server không bù gì cả.** Ngắm chuẩn nhưng trượt. Người có ping cao gần như không bắn trúng ai. Công bằng về mặt kỹ thuật, không chơi được về mặt trải nghiệm.

**Lựa chọn B — lag compensation.** Server lưu lịch sử vị trí mọi người trong khoảng một giây. Khi xử lý phát bắn của người có RTT 200 ms, nó **tua ngược cả thế giới** về đúng thời điểm người đó đã nhìn thấy, rồi mới raycast.

Ngành chọn B. Và đây là số tiền phải trả, tính ra được:

| RTT người bắn | Server tua ngược | Nạn nhân chạy 5 m/s đã đi được |
|---|---|---|
| 40 ms | 120 ms | 60 cm |
| 100 ms | 150 ms | 75 cm |
| 200 ms | 200 ms | **100 cm** |

*(Tua ngược = RTT/2 + buffer nội suy 100 ms. Buffer thay đổi theo game.)*

Một mét. Chiều rộng một khung cửa. **Đó chính xác là khoảng cách bạn đã kịp lùi vào sau bức tường trước khi chết.**

Nên phát biểu đầy đủ của quyết định năm 2001 là:

> Trong một hệ có độ trễ, **không tồn tại một "hiện tại" chung** cho mọi người chơi. Bạn buộc phải chọn: hoặc người bắn ngắm chuẩn mà trượt, hoặc nạn nhân chết sau khi đã nấp. Không có phương án thứ ba, và tick rate cao hơn không tạo ra phương án thứ ba.

Ngành chọn ưu tiên người bắn, vì "ngắm chuẩn mà trượt" phá vỡ trải nghiệm nặng hơn "chết oan thỉnh thoảng". Đó là một quyết định về *cảm giác*, không phải về kỹ thuật — và nó là ví dụ đẹp nhất của câu ở bài 1: **ranh giới giữa gameplay và kiến trúc bị xoá.**

Bài 21 sẽ dựng lại đầy đủ cơ chế này.

### 3.7 — 2006 trở đi, GGPO: rollback

Nhánh lockstep có một hoá đơn chưa trả từ 1993: **phải chờ input của mọi người trước khi bước tiếp.** Fighting game không trả nổi hoá đơn đó — ngân sách của nó chỉ khoảng 50 ms.

**Rollback** trả hoá đơn bằng cách từ chối chờ. Tony Cannon xây GGPO (khoảng 2006, mã nguồn được mở năm 2019) trên một ý tưởng đơn giản: **đoán rằng đối thủ giữ nguyên input của frame trước, và chạy tiếp ngay.** Khi input thật tới và khác dự đoán, tua ngược vài frame, sửa, chạy lại tới hiện tại — trong đúng một frame.

Ngân sách của việc chạy lại rất chặt:

| RTT | Số frame phải đoán trước | Khi đoán sai, mỗi frame chạy lại có |
|---|---|---|
| 30 ms | 1 | 16,67 ms |
| 60 ms | 2 | 8,34 ms |
| 100 ms | 3 | **5,56 ms** |

Nghĩa là ở RTT 100 ms, toàn bộ một bước simulation phải chạy xong trong 5,56 ms — và phải chạy được **ba lần** trong một frame. Điều này chỉ khả thi khi simulation cực nhẹ, đúng như bài 3 đã phân tích: 2 nhân vật, không đạn bay, không 20 người khác.

Rollback đã thành tiêu chuẩn de facto của thể loại: Street Fighter III: 3rd Strike Online Edition (2011) dùng GGPO, Skullgirls (2012) đưa nó thành điểm bán hàng, và tới thế hệ Street Fighter 6 thì rollback là mặc định. *(Danh sách game là để thấy xu hướng — chi tiết từng bản triển khai khác nhau.)*

---

## 4. Hai nhánh còn sống — và chương nào của course thuộc về đâu

| Cột mốc | Phát minh | Hoá đơn để lại | Học ở đâu |
|---|---|---|---|
| 1993 Doom | lockstep P2P | chờ người tệ nhất; không có trọng tài | bài 22 |
| 6/1996 Quake | authoritative client-server | độ trễ round-trip | bài 33 |
| 12/1996 QuakeWorld | client prediction | **luật chơi phải viết hai lần** | bài 18, 19 |
| 1997 Age of Empires | lockstep + turn delay cho RTS | **determinism tuyệt đối** | chương 3, bài 22 |
| 2001 Valve | lag compensation | **"chết sau khi đã nấp"** | bài 21 |
| 2006+ GGPO | rollback | ngân sách chạy lại cực chặt | bài 22 |

Hai nhánh còn sống tới hôm nay:

- **Lockstep / deterministic** — RTS, fighting game. Điều kiện bắt buộc: simulation tất định tuyệt đối trên mọi máy.
- **Authoritative client-server + prediction** — gần như mọi thứ còn lại: FPS, MOBA, MMO, battle royale, .io.

Course này đi nhánh thứ hai làm chính (chương 5, 6, 7), và dành bài 22 cho nhánh thứ nhất — vì bạn cần biết khi nào nên rẽ sang nó.

---

## 5. Tính tay

**Bài 1.** Doom 1993: 4 người, 35 tic/s, 2 byte input mỗi người mỗi tic.
- Băng thông là bao nhiêu kbps? Modem 2400 baud có đủ không?
- Bây giờ giả sử Doom gửi **state** thay vì input: 30 entity × 8 byte × 35 Hz. Bao nhiêu kbps?
- Tỉ lệ giữa hai con số. Đó có phải lý do lockstep được chọn năm 1993 không — hay lý do là cái khác?

**Bài 2.** Bạn làm FPS, ngân sách người chơi chịu được là 80 ms.
- Không prediction, RTT bao nhiêu thì vừa chạm ngưỡng 80 ms (nhớ cộng chờ tick 8,3 ms và render 8 ms)?
- Bao nhiêu phần trăm người chơi trên thế giới có RTT thấp hơn con số đó tới server của bạn? (Không cần số chính xác — cần bạn nhận ra câu trả lời phụ thuộc vào việc server đặt ở đâu.)
- Con số đó giải thích vì sao QuakeWorld phải ra đời sau Quake đúng 6 tháng như thế nào?

**Bài 3.** Lag compensation, nạn nhân chạy 5 m/s, buffer nội suy 100 ms.
- Người bắn RTT 60 ms: server tua ngược bao nhiêu, nạn nhân đã đi được bao xa?
- Nếu bạn giảm buffer nội suy từ 100 ms xuống 50 ms, con số trên đổi thế nào? Bạn đánh đổi cái gì (xem lại bài 3 và chờ tới bài 20)?
- Nếu bạn **giới hạn** lag compensation ở tối đa 200 ms — tức người có RTT 400 ms không được bù đủ — ai được lợi và ai chịu thiệt?

---

## 6. Chuyển giao

**Năm 2029, một công nghệ mới xuất hiện:** mọi người chơi đều có kết nối RTT ổn định **5 ms** tới bất kỳ đâu trên thế giới, jitter gần bằng 0, không mất gói. Băng thông coi như vô hạn.

1. Trong sáu phát minh ở bảng mục 4, cái nào **trở nên không cần thiết**? Cái nào **vẫn cần**?
2. Client prediction có còn cần không? Tính ra: RTT 5 ms + chờ tick 8,3 ms + render 8 ms bằng bao nhiêu, và so với ngưỡng 80 ms của FPS.
3. Lag compensation có còn cần không? Chú ý: nó bù cho **RTT/2 cộng buffer nội suy**, và buffer nội suy tồn tại vì một lý do khác RTT. Lý do đó có biến mất trong kịch bản này không?
4. Lockstep có quay lại thành lựa chọn tốt cho FPS không? Tính trần frame rate ở RTT 5 ms rồi trả lời.
5. Còn determinism thì sao — nó có trở nên dễ hơn không? Vì sao?
6. **Câu khó nhất:** trong sáu phát minh đó, có **ít nhất một** cái tồn tại vì lý do hoàn toàn **không liên quan tới độ trễ mạng**. Chỉ ra nó, nói lý do thật của nó là gì, và giải thích vì sao mạng hoàn hảo cũng không xoá được nó.

Câu 6 là câu phân biệt người học thuộc lịch sử với người hiểu vì sao nó xảy ra. Nếu trả lời được, bạn sẽ không bao giờ nhầm lẫn giữa "vấn đề của mạng" và "vấn đề của mô hình tin cậy".

---

## 7. Tóm tắt

- Netcode hiện đại là kết quả của **năm cột mốc**, mỗi cái sinh ra để trả hoá đơn của cái trước.
- **1993 Doom** — lockstep P2P, chỉ tốn **2,24 kbps** cho 4 người. Chết vì độ trễ (chờ người tệ nhất), không phải vì băng thông.
- **6/1996 Quake** — client-server: có trọng tài, không ai chờ ai, nhưng bấm phím tới lúc thấy mất tới **166 ms** ở RTT 150 ms.
- **12/1996 QuakeWorld** — client prediction phá vỡ thế lưỡng nan "hoặc tức thì, hoặc có trọng tài". Hoá đơn: **luật chơi phải viết hai lần**.
- **1997 Age of Empires** — lockstep sống lại cho RTS nhờ turn delay; 1.500 quân qua modem 28.8 kbps. Hoá đơn: **determinism tuyệt đối**.
- **2001 Valve** — lag compensation. Hoá đơn có tên: **"chết sau khi đã nấp"**, đo được là ~1 mét ở RTT 200 ms. Không có phương án thứ ba, và tick rate cao hơn không tạo ra phương án thứ ba.
- **2006+ GGPO** — rollback trả nốt hoá đơn chờ-đợi của lockstep, với ngân sách chạy lại chỉ **5,56 ms/frame** ở RTT 100 ms.
- Hai nhánh còn sống: **lockstep/deterministic** (RTS, fighting) và **authoritative client-server + prediction** (mọi thứ còn lại). Course đi nhánh hai làm chính.

→ **Chương 2 — Thời gian & vòng lặp.** Mọi thứ ở trên giả định server có một nhịp đập đều đặn và đáng tin. Bài 5 sẽ cho thấy nhịp đó khó giữ hơn vẻ ngoài rất nhiều, và cái giá của việc giữ sai nó được đo bằng centimet.
