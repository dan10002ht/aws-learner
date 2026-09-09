# Bài 3 — Thể loại game quyết định netcode

## 1. Mục tiêu

Sau bài này bạn có thể:

- Chỉ ra **hai trục** quyết định toàn bộ lựa chọn netcode, và đặt bất kỳ game nào lên hệ trục đó.
- Chứng minh bằng số vì sao **RTS gần như luôn dùng lockstep** còn **FPS gần như luôn dùng authoritative client-server** — và vì sao đổi chỗ hai cái là thảm hoạ.
- Tính được **cái giá của lockstep**: vì sao nó rẻ 500 lần về băng thông nhưng chỉ chạy được trên LAN vào năm 1993.
- Giải thích vì sao **fighting game chọn rollback** trong khi FPS chọn lag compensation, dù cả hai đều cần độ trễ thấp.
- Trả lời được câu "game của tôi nên dùng netcode nào" bằng **bốn câu hỏi có đáp án đo được**, không bằng cảm giác.

---

## 2. Triệu chứng

Một studio làm xong game bắn súng 5v5. Netcode chạy tốt: authoritative server 64 Hz, client prediction, lag compensation, người chơi ở 150 ms vẫn thấy mượt. Đội netcode được khen.

Studio làm game thứ hai: **RTS 4v4, mỗi bên khoảng 200 quân**. Cùng đội, cùng engine, cùng netcode — tái sử dụng, tiết kiệm thời gian.

Kết quả trên máy dev, mạng LAN: chạy được. Kết quả trên Internet:

```
băng thông chiều ra mỗi player   39,1 KB/s   → 312,5 KB/s cho một trận 8 người
người chơi 4G                    rớt liên tục
trận có 2.000 quân (late game)   391 KB/s mỗi player — không ai chơi nổi
```

Đội netcode profile, tối ưu serialization, thêm delta compression. Xuống được một nửa. Vẫn không đủ.

Rồi ai đó chỉ ra: **Age of Empires năm 1997 chạy 1.500 quân qua modem 28.8 kbps.** Nhanh hơn con số của họ khoảng 100 lần, trên phần cứng kém hơn 1.000 lần.

---

## ⏸ Dừng lại — đoán trước #1

**Age of Empires làm thế nào?**

```
(a) Nén dữ liệu tốt hơn nhiều
(b) Chỉ gửi quân trong tầm nhìn (AOI)
(c) Gửi delta thay vì full state
(d) Không gửi trạng thái quân. Gửi thứ khác hẳn.
```

Ba đáp án đầu đều là kỹ thuật thật và đều được dùng ở chương 6. Nhưng không cái nào giải thích được khoảng cách 100 lần. Đáp án là (d), và mục 3.2 tính ra con số.

---

## 3. Lý thuyết

### 3.1 Hai trục quyết định tất cả

Mọi lựa chọn netcode nằm trên hai trục, và chỉ hai:

<svg viewBox="0 0 700 340" role="img" aria-labelledby="gs3-a-t gs3-a-d" style="width:100%;height:auto">
<title id="gs3-a-t">Hai trục quyết định netcode: độ trễ chịu được và số entity phải đồng bộ</title>
<desc id="gs3-a-d">Trục ngang là độ trễ người chơi chịu được, từ 50 mili giây tới 2 giây. Trục dọc là số entity phải đồng bộ, từ vài chục tới hàng nghìn. Fighting game nằm góc trái dưới dùng rollback, FPS trái dưới dùng client-server, RTS phải trên dùng lockstep, MMO giữa phải dùng client-server kèm interest management.</desc>
<line x1="70" y1="290" x2="660" y2="290" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<line x1="70" y1="290" x2="70" y2="30" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<text x="365" y="322" text-anchor="middle" font-size="11" fill="currentColor">Độ trễ người chơi chịu được  →</text>
<text x="20" y="160" font-size="11" fill="currentColor" transform="rotate(-90 20 160)">Số entity phải đồng bộ  →</text>
<text x="100" y="306" font-size="9" fill="currentColor" opacity="0.7">50ms</text>
<text x="210" y="306" font-size="9" fill="currentColor" opacity="0.7">100ms</text>
<text x="340" y="306" font-size="9" fill="currentColor" opacity="0.7">250ms</text>
<text x="470" y="306" font-size="9" fill="currentColor" opacity="0.7">500ms</text>
<text x="600" y="306" font-size="9" fill="currentColor" opacity="0.7">2s</text>
<text x="34" y="264" font-size="9" fill="currentColor" opacity="0.7">~10</text>
<text x="34" y="190" font-size="9" fill="currentColor" opacity="0.7">~50</text>
<text x="30" y="116" font-size="9" fill="currentColor" opacity="0.7">~500</text>
<text x="26" y="52" font-size="9" fill="currentColor" opacity="0.7">~5000</text>
<ellipse cx="118" cy="258" rx="46" ry="26" fill="#ef4444" fill-opacity="0.25" stroke="currentColor" stroke-opacity="0.3"/>
<text x="118" y="256" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">Fighting</text>
<text x="118" y="270" text-anchor="middle" font-size="9" fill="currentColor">rollback</text>
<ellipse cx="215" cy="240" rx="52" ry="30" fill="#3b82f6" fill-opacity="0.25" stroke="currentColor" stroke-opacity="0.3"/>
<text x="215" y="238" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">FPS / BR</text>
<text x="215" y="252" text-anchor="middle" font-size="9" fill="currentColor">CS + lag comp</text>
<ellipse cx="300" cy="212" rx="46" ry="26" fill="#8b5cf6" fill-opacity="0.25" stroke="currentColor" stroke-opacity="0.3"/>
<text x="300" y="210" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">MOBA</text>
<text x="300" y="224" text-anchor="middle" font-size="9" fill="currentColor">CS + predict</text>
<ellipse cx="400" cy="92" rx="58" ry="34" fill="#84cc16" fill-opacity="0.28" stroke="currentColor" stroke-opacity="0.3"/>
<text x="400" y="88" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">RTS</text>
<text x="400" y="102" text-anchor="middle" font-size="9" fill="currentColor">lockstep</text>
<ellipse cx="520" cy="160" rx="60" ry="34" fill="#f59e0b" fill-opacity="0.25" stroke="currentColor" stroke-opacity="0.3"/>
<text x="520" y="156" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">MMO</text>
<text x="520" y="170" text-anchor="middle" font-size="9" fill="currentColor">CS + AOI</text>
<ellipse cx="614" cy="256" rx="44" ry="26" fill="#64748b" fill-opacity="0.25" stroke="currentColor" stroke-opacity="0.3"/>
<text x="614" y="254" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">Turn-based</text>
<text x="614" y="268" text-anchor="middle" font-size="9" fill="currentColor">request/response</text>
</svg>

- **Trục ngang — độ trễ chịu được.** Quyết định bạn có *bắt buộc* phải dự đoán ở client hay không. Dưới ~100 ms thì bắt buộc; trên ~500 ms thì prediction là phí công.
- **Trục dọc — số entity phải đồng bộ.** Quyết định bạn *có đủ băng thông* để gửi state hay không. Vượt vài trăm entity thì gửi state là bất khả thi, phải gửi thứ khác.

Hai trục này độc lập, nên có bốn góc, và **mỗi góc có một họ netcode riêng**. Không có netcode nào thắng cả bốn góc.

Ngưỡng độ trễ, ước lượng thực dụng của ngành — dùng làm thang tham chiếu, không phải hằng số:

| Thể loại | Người chơi bắt đầu nhận ra | Quy ra tick @60 Hz |
|---|---|---|
| Fighting game | ~50 ms | 3 tick |
| FPS | ~80 ms | 4,8 tick |
| MOBA | ~120 ms | 7,2 tick |
| RTS | ~250 ms | 15 tick |
| MMO PvE | ~500 ms | 30 tick |
| Turn-based | ~2.000 ms | 120 tick |

Chênh nhau **40 lần** giữa hai đầu. Đó là lý do câu "game server phải nhanh" không có nghĩa gì nếu không nói game gì.

### 3.2 Vì sao RTS không gửi state — tính ra bằng số

Đáp án của hộp đoán trước: **Age of Empires không gửi trạng thái quân. Nó gửi mệnh lệnh của người chơi.**

Đây là **lockstep**: mọi máy chạy cùng một simulation, chỉ trao đổi *input*. Đặt hai cách cạnh nhau, cùng một trận RTS 8 người, 200 quân:

| | Client-server (gửi state) | Lockstep (gửi input) |
|---|---|---|
| Gửi cái gì | vị trí/HP của 200 quân | mệnh lệnh của 8 người |
| Mỗi player nhận | 200 × 10 B × 20 Hz = **39,1 KB/s** | — |
| Tổng cả trận | 39,1 × 8 = **312,5 KB/s** | 8 × 8 B × 10 Hz = **0,62 KB/s** |
| Tỉ lệ | 1 | **rẻ hơn 500 lần** |
| Khi lên 2.000 quân | **391 KB/s mỗi player** | **0,62 KB/s — không đổi** |

Dòng cuối là dòng quan trọng nhất, và nó không phải chuyện tối ưu:

> Băng thông của lockstep **không phụ thuộc số entity.** Nó chỉ phụ thuộc số người chơi. Một trận 10 quân và một trận 10.000 quân tốn y hệt nhau.

Không có kỹ thuật nén nào cho bạn tính chất đó. Đó là lý do mọi RTS nghiêm túc đều dùng lockstep, và vì sao ba đáp án (a)(b)(c) ở hộp trên — dù đều là kỹ thuật thật — không thể bắc qua khoảng cách 100 lần mà studio ở mục 2 gặp phải.

**Cái giá:** lockstep chỉ chạy được nếu mọi máy tính ra **cùng một kết quả** từ cùng chuỗi input. Lệch một bit ở phút thứ nhất là hai người chơi hai trận khác nhau ở phút thứ mười. Đó là **determinism**, và nó khắt khe tới mức chương 3 phải dành trọn ba bài cho nó.

### 3.3 Cái giá thứ hai của lockstep: chờ người tệ nhất

Lockstep có một ràng buộc chết người: **không máy nào bước sang frame N+1 khi chưa có input của tất cả mọi người ở frame N.**

Tính ra thời gian:

| RTT của người tệ nhất trong trận | Mỗi frame phải chờ ít nhất | Trần frame rate |
|---|---|---|
| 20 ms (LAN) | 10 ms | 100 frame/s |
| 60 ms (cùng quốc gia) | 30 ms | 33 frame/s |
| 150 ms (xuyên lục địa) | 75 ms | **13 frame/s** |
| 300 ms (mạng tệ) | 150 ms | **6,7 frame/s** |

Đây là lý do Doom năm 1993 dùng lockstep và **chỉ chơi được trên LAN**. Không phải vì băng thông — băng thông thì lockstep dư sức. Vì **độ trễ**: toàn bộ trận đấu chạy chậm bằng người có đường mạng tệ nhất.

RTS sống được với ràng buộc này vì trục ngang của nó rộng: 250 ms là chấp nhận được, mệnh lệnh "đưa quân tới đây" trễ 250 ms không ai nhận ra. Kỹ thuật tiêu chuẩn là **turn delay** — mệnh lệnh bấm ở frame N được thực thi ở frame N+2, đủ thời gian cho gói tin đi vòng.

FPS thì không: 250 ms trên một game bắn súng là không chơi được. Đó là lý do FPS phải đi nhánh khác.

---

## ⏸ Dừng lại — đoán trước #2

Cả **fighting game** và **FPS** đều cần độ trễ rất thấp (50–80 ms). Nhưng chúng chọn hai netcode hoàn toàn khác nhau: fighting game dùng **rollback**, FPS dùng **authoritative server + lag compensation**.

**Cái gì trong bản chất hai thể loại này khiến chúng rẽ hai hướng?**

```
(a) Fighting game ít người chơi hơn nên rollback khả thi
(b) FPS có nhiều entity hơn nên không rollback nổi
(c) Fighting game 1v1 không có gì để gian lận nên không cần server trọng tài
(d) Cả ba yếu tố trên, nhưng có một yếu tố quyết định hơn hai cái kia
```

---

### 3.4 FPS: authoritative + prediction + lag compensation

FPS ở góc "độ trễ thấp, entity ít". Nó chọn bộ ba:

1. **Server là trọng tài duy nhất** — vì FPS là thể loại bị gian lận nhiều nhất, và mỗi trận có người lạ.
2. **Client prediction** — client tự đoán kết quả input của mình và vẽ ngay, không chờ server (bài 18).
3. **Lag compensation** — server tua ngược thế giới về thời điểm người bắn đã nhìn thấy rồi mới tính trúng (bài 21).

Băng thông rất dễ chịu vì số entity nhìn thấy nhỏ:

| Trường hợp | Entity thấy | Snapshot | Băng thông/player |
|---|---|---|---|
| FPS 1v1 | 2 | 64 Hz | 1,2 KB/s |
| FPS 5v5 | 10 | 64 Hz | 6,2 KB/s |
| Battle royale 100 người (AOI 20) | 20 | 30 Hz | 5,9 KB/s |

*(Giả định ~10 byte/entity sau nén — con số này sẽ được đo thật ở bài 24.)*

Chú ý dòng cuối: trận 100 người **không** tốn nhiều hơn trận 10 người, vì mỗi người chỉ thấy khoảng 20 entity. Đó là công của **Area of Interest** (bài 26), và nó là thứ làm battle royale khả thi.

### 3.5 Fighting game: rollback

Đáp án hộp đoán trước là **(d)**, và yếu tố quyết định là **(c) — không có ai để làm trọng tài, và cũng không cần**.

Fighting game 1v1 thi đấu thường chạy **peer-to-peer**: hai máy, không server ở giữa. Lý do:

- Thêm một server ở giữa là **cộng thêm một chặng mạng** — với ngân sách 50 ms thì đó là khoản không trả nổi.
- 1v1 nên gian lận khó che: đối thủ nhận ra ngay, và giải đấu chạy trên máy có kiểm soát.

Không có trọng tài thì cả hai máy phải tự chạy simulation, tức quay lại mô hình lockstep. Nhưng lockstep thuần thì phải chờ đối thủ mỗi frame — 50 ms ngân sách không cho phép chờ.

**Rollback** giải bài toán đó theo cách phản trực giác: đừng chờ. Đoán rằng đối thủ giữ nguyên input của frame trước, chạy tiếp. Khi input thật tới và khác dự đoán thì **tua ngược lại vài frame, sửa input, chạy lại tới hiện tại — tất cả trong một frame**.

Nó khả thi vì hai lý do rất đặc thù của thể loại này, và cả hai đều **không đúng với FPS**:

- Simulation cực nhẹ: 2 nhân vật, không có đạn bay, không có 20 người khác. Chạy lại 7 frame trong một frame là chuyện dễ.
- Input thay đổi ít: người chơi giữ nguyên hướng trong nhiều frame, nên dự đoán "giống frame trước" đúng phần lớn thời gian.

Bài 22 sẽ mổ xẻ rollback đầy đủ.

### 3.6 MMO: vấn đề không phải độ trễ, mà là số lượng

MMO ở góc ngược lại: độ trễ rộng rãi (500 ms cho PvE), nhưng **hàng nghìn entity trong một thế giới liền mạch**.

Ở đó, prediction và lag compensation gần như không quan trọng. Ba bài toán thật là:

- **Interest management** — mỗi người chỉ nhận entity trong tầm, và tầm đó thay đổi liên tục khi họ di chuyển (bài 26).
- **Sharding thế giới** — một tiến trình không giữ nổi cả thế giới, phải cắt (bài 32).
- **Cross-node handoff** — người chơi đi từ vùng này sang vùng khác, tức đổi tiến trình chủ sở hữu, mà không được đứng hình (bài 32).

Băng thông: 50 entity trong tầm × 10 B × 10 Hz = **4,9 KB/s mỗi player** — nhỏ hơn cả FPS 5v5. Điều đó nói lên bản chất: **MMO không khó vì mạng, MMO khó vì kiến trúc.**

### 3.7 Bảng tổng hợp

| Thể loại | Độ trễ chịu được | Entity | Mô hình | Kỹ thuật lõi | Nút thắt thật |
|---|---|---|---|---|---|
| Turn-based | ~2 s | ít | request/response | không cần gì | không có |
| Fighting | ~50 ms | ~2 | P2P deterministic | **rollback** | determinism tuyệt đối |
| FPS / BR | ~80 ms | 10–20 (sau AOI) | authoritative CS | prediction + **lag comp** | chống gian lận |
| MOBA | ~120 ms | 20–50 | authoritative CS | prediction + interp | cân bằng công thức |
| RTS | ~250 ms | 200–5.000 | **lockstep** | turn delay | determinism + chờ người tệ nhất |
| MMO | ~500 ms | hàng nghìn | authoritative CS | **AOI + sharding** | kiến trúc, không phải mạng |
| .io | ~120 ms | 50–200 | authoritative CS | prediction + AOI | băng thông |

---

## 4. Chọn netcode bằng bốn câu hỏi

Không cần trực giác. Bốn câu, mỗi câu có đáp án đo được:

**① Người chơi chịu được bao nhiêu mili giây trước khi thấy khó chịu?**
Dưới 100 ms → bắt buộc có prediction. Trên 500 ms → prediction là phí công, đừng làm.

**② Mỗi người chơi cần thấy bao nhiêu entity, ở tần suất nào?**
Nhân ra KB/s. Vượt ~50 KB/s mỗi player là bạn đang đi sai hướng — hoặc cần AOI, hoặc cần đổi sang gửi input.

**③ Simulation có thể chạy lại tất định không?**
Không → loại bỏ lockstep và rollback ngay, không cần bàn tiếp. Có → hai cửa đó mở ra.

**④ Có ai cần gian lận không, và họ được lợi gì?**
Có → bắt buộc authoritative server. Không (1v1 thi đấu, co-op với bạn bè) → P2P mở ra, và nó tiết kiệm một chặng mạng.

Bốn câu này áp dụng được cho game chưa tồn tại. Đó là điểm khác giữa hiểu và học thuộc.

---

## 5. Tính tay

**Bài 1.** Bạn làm RTS 4v4, 500 quân mỗi bên (2.000 quân tổng).
- Client-server, snapshot 20 Hz, 10 B/entity: bao nhiêu KB/s mỗi player?
- Lockstep, mỗi người 4 mệnh lệnh/giây, mỗi mệnh lệnh 8 byte: bao nhiêu KB/s?
- Tỉ lệ giữa hai con số? Nếu quân tăng gấp 10 thì tỉ lệ đó đổi thế nào?

**Bài 2.** Vẫn RTS đó, chơi qua Internet, người tệ nhất RTT 180 ms.
- Lockstep thuần chạy được tối đa bao nhiêu frame/giây?
- Với turn delay 2 frame ở 10 frame/giây, mệnh lệnh bấm lúc t=0 được thực thi lúc nào?
- Con số đó có nằm trong ngưỡng 250 ms của RTS không?

**Bài 3.** Battle royale 100 người trên bản đồ 4 km².
- Nếu **không** có AOI (mỗi người nhận cả 100 entity), 30 Hz, 10 B/entity: KB/s mỗi player? Tổng một trận?
- Với AOI bán kính 200 m, giả sử trung bình thấy 15 người: KB/s mỗi player?
- AOI tiết kiệm bao nhiêu lần? So với con số đó, delta compression tiết kiệm thêm chừng 2–3 lần thì đáng làm trước hay sau?

---

## 6. Chuyển giao

**Bạn được giao làm một game co-op sinh tồn 4 người**: thế giới mở sinh ngẫu nhiên, xây nhà phá địa hình, hàng trăm con quái đi lang thang, người chơi có thể cách nhau rất xa trên bản đồ. Chơi với bạn bè, không có xếp hạng, không có gì để gian lận ngoài việc tự phá vui của mình.

1. Đặt game này lên hệ trục ở mục 3.1. Nó rơi vào góc nào, và nó có nằm gọn trong một góc không?
2. Trả lời bốn câu hỏi ở mục 4 cho game này. Câu nào cho ra đáp án dứt khoát, câu nào không?
3. Địa hình bị phá huỷ là state rất lớn nhưng thay đổi rất ít. Gửi nó theo mô hình nào — snapshot, delta, hay event? Vì sao?
4. Bốn người chơi ở bốn góc bản đồ, không nhìn thấy nhau. AOI nói "không cần gửi gì cho nhau". Nhưng quái ở gần người A vẫn phải chạy AI. Ai chạy nó, và cái đó ảnh hưởng gì tới lựa chọn ở câu 2?
5. Không có gì để gian lận → P2P mở ra. Nhưng ai giữ world khi người chủ phòng thoát game? Câu này làm bạn đổi ý về câu 2 không?
6. **Câu khó nhất:** giả sử một năm sau studio muốn thêm chế độ PvP xếp hạng vào chính game này. Trong các quyết định netcode bạn vừa chọn, cái nào **vẫn dùng lại được**, cái nào **phải viết lại**, và cái nào bạn **có thể chọn khác đi ngay hôm nay** để một năm sau đỡ phải viết lại — mà không tốn thêm gì đáng kể bây giờ?

Câu 6 là dạng câu hỏi thật của nghề: không phải "cái nào đúng" mà là "cái nào đúng hôm nay và không khoá cửa ngày mai".

---

## 7. Tóm tắt

- Netcode được quyết định bởi đúng **hai trục**: độ trễ người chơi chịu được, và số entity phải đồng bộ. Bốn góc, bốn họ netcode, không cái nào thắng cả bốn.
- Ngưỡng độ trễ chênh nhau **40 lần** giữa fighting game (~50 ms) và turn-based (~2 s). "Game server phải nhanh" là câu vô nghĩa nếu không nói game gì.
- **Lockstep gửi input, không gửi state**: rẻ hơn 500 lần trong ví dụ RTS 8 người/200 quân, và **băng thông không phụ thuộc số entity** — tính chất mà không kỹ thuật nén nào cho được.
- Cái giá của lockstep là **determinism tuyệt đối** và **chờ người tệ nhất**: RTT 150 ms kéo trần xuống 13 frame/giây. Đó là lý do Doom chỉ chơi được trên LAN.
- **FPS** chọn authoritative + prediction + lag compensation vì cần chống gian lận và có ít entity. **Fighting game** chọn rollback vì P2P tiết kiệm một chặng mạng và simulation đủ nhẹ để chạy lại.
- **MMO không khó vì mạng** (4,9 KB/s/player) mà khó vì kiến trúc: interest management, sharding, handoff.
- Chọn netcode bằng **bốn câu hỏi đo được**: ngưỡng độ trễ, KB/s mỗi player, simulation có tất định không, có ai cần gian lận không.

→ **Bài 4 — Lịch sử netcode 1993 tới nay**: bốn cột mốc đã sinh ra đúng bốn họ netcode ở trên, theo đúng thứ tự chúng buộc phải xảy ra.
