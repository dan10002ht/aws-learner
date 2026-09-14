# Bài 23 — Ba mô hình replication: snapshot, delta, event

## 1. Mục tiêu

Sau bài này bạn có thể:

- Phân loại một mô hình replication bằng **một câu hỏi duy nhất**: mất một gói thì ai tự chữa, ai chờ mốc, ai hỏng vĩnh viễn.
- Tính **bytes/s cho cả ba mô hình** trên cùng một trận, và nói ra giả định nào sinh ra từng con số.
- Tính **điểm hoà vốn** giữa event-based và full snapshot, và chỉ ra vì sao một trận bình thường không bao giờ chạm nó còn một vụ nổ thì vượt gấp gần chín lần.
- Chọn mô hình **cho từng loại state** thay vì cho cả game, và biện minh mỗi lựa chọn bằng tính chất phục hồi chứ không bằng số byte.
- Tính cái giá của **snapshot định kỳ làm keyframe** cho delta, theo cả hai chiều: KB/s thêm vào và mili giây lệch phải chịu.
- Ánh xạ mỗi mô hình sang đúng một mức đảm bảo của bài 14, và nói được mức đó kéo theo chi phí gì.

---

## 2. Triệu chứng

Một game bắn súng 100 người đang chạy **full snapshot**: mỗi player nhìn thấy ~50 entity, mỗi entity một bản ghi 10 byte, gửi 20 lần mỗi giây. Đúng con số của bài 8: **10 KB/s** mỗi player xuống, **1,0 MB/s** egress cho cả trận.

Team đổi sang **event-based**: thay vì mô tả thế giới đang thế nào, chỉ gửi *chuyện gì vừa xảy ra*. Đo lại ở trận thường:

| | Trung bình mỗi player | Egress 100 người |
|---|---|---|
| Full snapshot | 10,0 KB/s | 1,00 MB/s |
| Event-based | **1,2 KB/s** | **0,12 MB/s** |

Giảm **88,0 %**. Hoá đơn băng thông tháng đó xuống còn hơn một phần tám. Không ai phản đối.

Rồi có người ném một quả bom vào giữa đám đông. Trong **đúng một tick 50 ms**, các sự kiện sau phát sinh trong tầm nhìn của một player:

```
 50 entity chết                     ->  50 event
 50 entity đó rơi đồ, 4 món mỗi cái -> 200 event
120 mảnh địa hình bị phá            -> 120 event
                                       ---------
                                       370 event x 12 B = 4.440 B
```

Tick đó, full snapshot vẫn tốn đúng **500 B** — y hệt mọi tick khác, vì snapshot không quan tâm có bao nhiêu thứ vừa đổi. Event-based tốn **4.440 B**: gấp **8,88 lần**.

Quy ra tốc độ tức thời trong 50 ms đó: **88,8 KB/s** mỗi player thay vì 10,0 KB/s, và **8,88 MB/s** egress thay vì 1,00 MB/s. Trên một hệ thống đã được cấp phát theo mức 1,0 MB/s.

Và 4.440 B không đi trong một gói: chia theo mốc MTU an toàn 1200 B của bài 15 là **4 packet**, cả bốn đều **reliable-ordered** (bài 14 xếp "player đã chết" vào mức này). Ở 3 % mất gói, xác suất ít nhất một trong bốn gói rơi là **11,47 %** — và vì là ordered, cả 370 event nằm chờ một gói duy nhất, đúng head-of-line blocking của bài 12, cộng thêm một RTT.

Team đã tối ưu cho trường hợp trung bình một mô hình mà **chi phí của nó không có trần**.

---

## ⏸ Dừng lại — đoán trước #1

Ba mô hình: full snapshot, delta, event. Một gói bị mất trên đường. **Client sai trong bao lâu?**

```
(a) Cả ba đều tự khỏi ở gói sau — đó là lý do game dùng UDP
(b) Snapshot tự khỏi sau 1 tick; delta sai tới khi có mốc mới; event sai vĩnh viễn
(c) Snapshot và delta tự khỏi sau 1 tick; chỉ event là sai vĩnh viễn
(d) Tuỳ mức đảm bảo ở bài 14, không tuỳ mô hình
```

Đáp án là (b), và nó là trục chính của cả bài. (c) là câu trả lời sai phổ biến nhất — nó nhầm delta với snapshot vì cả hai đều mô tả *state*. (d) đảo ngược nhân quả: mô hình **quyết định** mức đảm bảo, không phải ngược lại.

---

## 3. Lý thuyết

### 3.1 Một câu hỏi phân loại được cả ba

Bài 12 phân loại message bằng **hạn sử dụng**: gói sau có thay thế được gói này không. Bài này hỏi cùng câu đó nhưng ở tầng trên — không hỏi về một message, mà về **cách bạn mã hoá thế giới thành message**:

> Nếu một gói mất, **thông tin trong nó còn xuất hiện lại ở đâu nữa không?**

Ba câu trả lời, ba mô hình:

| Mô hình | Gói mang gì | Thông tin lặp lại ở đâu | Mất một gói → sai bao lâu |
|---|---|---|---|
| **Full snapshot** | toàn bộ state nhìn thấy được | **trong mọi gói sau** | 1 tick = **50 ms** |
| **Delta** | phần đổi so với một mốc | trong mốc kế tiếp | tới **mốc mới** |
| **Event** | chuyện vừa xảy ra | **không ở đâu cả** | **vĩnh viễn** |

<svg viewBox="0 0 700 260" role="img" aria-labelledby="gs23-a-t gs23-a-d" style="width:100%;height:auto">
<title id="gs23-a-t">Ba mô hình phục hồi khác nhau khi mất tick số 3</title>
<desc id="gs23-a-d">Ba dòng thời gian song song, mỗi dòng sáu tick. Tick ba bị mất ở cả ba. Dòng snapshot trở lại đúng ngay tick bốn. Dòng delta sai từ tick bốn tới khi gặp mốc keyframe ở tick sáu. Dòng event sai từ tick bốn trở đi và không bao giờ tự khỏi.</desc>
<text x="12" y="24" font-size="11" font-weight="bold" fill="currentColor">mất tick 3 — client sai trong bao lâu</text>
<text x="12" y="62" font-size="11" font-weight="bold" fill="currentColor">SNAPSHOT</text>
<text x="12" y="132" font-size="11" font-weight="bold" fill="currentColor">DELTA</text>
<text x="12" y="202" font-size="11" font-weight="bold" fill="currentColor">EVENT</text>
<rect x="120" y="44" width="86" height="26" rx="5" fill="#84cc16" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.3"/>
<text x="163" y="61" text-anchor="middle" font-size="10" fill="currentColor">tick 2 ok</text>
<rect x="212" y="44" width="86" height="26" rx="5" fill="#ef4444" fill-opacity="0.28" stroke="currentColor" stroke-opacity="0.3"/>
<text x="255" y="61" text-anchor="middle" font-size="10" fill="currentColor">tick 3 MẤT</text>
<rect x="304" y="44" width="366" height="26" rx="5" fill="#84cc16" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.3"/>
<text x="487" y="61" text-anchor="middle" font-size="10" fill="currentColor">tick 4 đã đúng lại — mỗi gói chứa toàn bộ state</text>
<rect x="120" y="114" width="86" height="26" rx="5" fill="#84cc16" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.3"/>
<text x="163" y="131" text-anchor="middle" font-size="10" fill="currentColor">tick 2 ok</text>
<rect x="212" y="114" width="86" height="26" rx="5" fill="#ef4444" fill-opacity="0.28" stroke="currentColor" stroke-opacity="0.3"/>
<text x="255" y="131" text-anchor="middle" font-size="10" fill="currentColor">tick 3 MẤT</text>
<rect x="304" y="114" width="182" height="26" rx="5" fill="#f59e0b" fill-opacity="0.28" stroke="currentColor" stroke-opacity="0.3"/>
<text x="395" y="131" text-anchor="middle" font-size="10" fill="currentColor">tick 4–5 LỆCH</text>
<rect x="492" y="114" width="178" height="26" rx="5" fill="#84cc16" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.3"/>
<text x="581" y="131" text-anchor="middle" font-size="10" fill="currentColor">mốc mới → đúng lại</text>
<rect x="120" y="184" width="86" height="26" rx="5" fill="#84cc16" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.3"/>
<text x="163" y="201" text-anchor="middle" font-size="10" fill="currentColor">tick 2 ok</text>
<rect x="212" y="184" width="86" height="26" rx="5" fill="#ef4444" fill-opacity="0.28" stroke="currentColor" stroke-opacity="0.3"/>
<text x="255" y="201" text-anchor="middle" font-size="10" fill="currentColor">tick 3 MẤT</text>
<rect x="304" y="184" width="366" height="26" rx="5" fill="#ef4444" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
<text x="487" y="201" text-anchor="middle" font-size="10" fill="currentColor">sai tới hết trận — không gói nào nhắc lại sự kiện đó</text>
<text x="12" y="240" font-size="10" fill="currentColor">Cột phục hồi này quyết định mức đảm bảo, không phải kích thước gói.</text>
</svg>

Ba dòng đó không phải ba lựa chọn kỹ thuật ngang hàng. Chúng là **ba tính chất phục hồi khác nhau**, và tính chất phục hồi là thứ bạn không mua lại được bằng băng thông. Phần còn lại của bài đi theo đúng thứ tự đó: mô hình tự chữa trước, mô hình nợ mốc sau, mô hình không có đường về cuối cùng.

### 3.2 Full snapshot: đắt, phẳng, tự chữa

Mỗi tick, server gửi toàn bộ state mà player được thấy. Giả định dùng suốt bài, một bản ghi entity **10 byte**:

```
id      2 B   (uint16)
vị trí  6 B   (3 x int16 lượng tử hoá — bài 24 nói vì sao 6 chứ không phải 12)
hp      1 B
cờ+anim 1 B   (sống/chết, tư thế, animation state)
```

Ba tính chất, và cả ba đều là hệ quả của "gói sau chứa đủ thông tin của gói trước":

**Tự chữa.** Mất tick 3 thì tick 4 sửa xong. Bài 12 đã tính tiếp phần sau: buffer nội suy 100 ms bằng đúng hai chu kỳ snapshot, nên một gói lẻ rơi là **hoàn toàn vô hình** với người chơi. Ở 3 % mất gói và 20 Hz, đó là **0,6 gói mất mỗi giây** không để lại dấu vết nào.

**Chi phí phẳng và có trần.** 500 B mỗi tick, dù thế giới đứng yên hay nổ tung. Cái này nghe như nhược điểm — nó vừa là nhược điểm vừa là thứ duy nhất trong ba mô hình mà bạn **capacity-plan** được. Bài 15 bắt snapshot phải tự giới hạn kích thước; snapshot là mô hình duy nhất tự nhiên thoả điều đó.

**Không cần state ở server về từng client.** Server không nhớ client nào đã nhận gì. Client mới vào trận, client vừa reconnect (bài 16), client khán giả — tất cả chỉ cần bắt được **một gói bất kỳ** là đồng bộ xong.

Cái giá: 50 × 10 × 20 = **10.000 B/s = 10,0 KB/s** mỗi player, **1,00 MB/s** cho 100 người. Và phần lớn số đó là byte gửi lại y nguyên thứ vừa gửi tick trước.

### 3.3 Delta: rẻ 7,14 lần, và nợ một cái mốc

Trong một tick 50 ms, phần lớn entity không đổi gì. Giả định của bài: **20 % entity đổi mỗi tick** — 10 trong 50. Chỉ gửi 10 cái đó, và trong mỗi cái chỉ gửi field đã đổi:

```
id        2 B
field mask 1 B   (bit nào bật thì field đó có mặt)
field đổi  4 B   (trung bình — thường là 2 trục vị trí)
          ----
           7 B / entity đổi
```

10 × 7 × 20 = **1.400 B/s = 1,4 KB/s**, rẻ hơn snapshot **7,14 lần**. *(10.000 / 1.400 = 7,142…)*

Nhưng "đổi so với **cái gì**" là câu hỏi chưa trả lời, và cả bài 25 dùng để trả lời nó. Ở đây chỉ cần một hệ quả: delta **không tự chứa**. Client dựng được state mới chỉ khi nó đang giữ đúng cái mốc mà server đã dùng để tính hiệu. Mất một gói delta là mất một mắt xích, và các gói sau — tính từ một mốc client không có — không sửa được gì.

Cái sai đó **không ồn**. Entity biến mất thì thấy ngay; entity có HP sai 30 điểm hoặc đứng lệch 2 mét thì không ai thấy, cho tới lúc nó quyết định ai chết. Đây là kiểu lỗi tệ nhất trong ba mô hình: rẻ, im lặng, và tích luỹ.

### 3.4 Event: rẻ nhất, và không có đường về

Snapshot và delta đều mô tả **thế giới đang thế nào**. Event mô tả **chuyện gì đã xảy ra**: `PlayerDied(id=7, killer=12)`, `ItemPicked(item=42, by=3)`, `WallDestroyed(chunk=118)`. Client giữ state của riêng nó và tự sửa state đó theo từng event nhận được.

Giả định kích thước một event, **12 byte**:

```
type      1 B
subject   2 B
payload   5 B   (killer id, item id, toạ độ mảnh địa hình…)
overhead  4 B   (seq + ack của lớp reliable ở bài 14, phân bổ đều)
```

Với 50 entity nhìn thấy, mỗi entity phát **2 event mỗi giây**: 100 event/s × 12 B = **1.200 B/s = 1,2 KB/s** — rẻ hơn snapshot **8,33 lần**, và rẻ hơn cả delta. Trải ra 20 tick thì trung bình chỉ **5 event = 60 B** mỗi tick, bằng **12 %** một tick snapshot.

Vì sao rẻ đến vậy? Vì event **không trả tiền cho thời gian trôi qua**. Snapshot trả 500 B mỗi tick kể cả khi không có gì xảy ra; event trả 0. Với state thay đổi hiếm — inventory, điểm số, cửa mở/đóng, địa hình — tỉ lệ tiết kiệm gần như không có trần trên.

Cái giá nằm ở cột cuối của bảng 3.1. Một event mất là **mất hẳn**: không có gói nào sau nó nhắc lại rằng player 7 đã chết. Client vẽ một xác chết vẫn đang chạy, và tự tin làm thế tới hết trận. Nên event **bắt buộc reliable**, và bài 14 chỉ ra reliable ở đây phải là **reliable-ordered**: `ItemDropped(42)` tới trước `ItemPicked(42)` thì thứ tự ngược lại cho ra một client giữ item ma.

Chuỗi hệ quả khép lại ở đây, và nó là toàn bộ nội dung mục 2:

```
event mất vĩnh viễn -> phải reliable-ordered -> phải ack + gửi lại + giữ thứ tự
                    -> head-of-line blocking (bài 12)
                    -> độ trễ của event KHÔNG có chặn trên
```

Bài 12 đã phát biểu quy tắc theo hướng ngược: *nếu gói tiếp theo chứa đủ thông tin để thay thế gói này, đừng đảm bảo gói này*. Event-based là quyết định **cố ý làm cho không gói nào thay thế được gói nào** — nên nó tự chọn luôn cái đắt nhất trong ba mức đảm bảo, cho **toàn bộ** traffic của nó.

---

## ⏸ Dừng lại — đoán trước #2

Mục 2 cho thấy event thua snapshot khi có 370 event trong một tick. Ngược lại, ở trận thường event rẻ hơn 8,33 lần. Vậy **ngưỡng ở đâu?** Giả sử mỗi entity đổi trạng thái sinh đúng 1 event.

```
(a) ~20 % entity đổi mỗi tick — chính con số delta đang giả định
(b) ~50 % — quá nửa thì gửi cả thế giới rẻ hơn gửi từng thay đổi
(c) ~83 % — và một trận bình thường không bao giờ tới gần
(d) Không bao giờ hoà vốn nếu mỗi entity chỉ sinh 1 event
```

Đáp án ở mục 3.6 — và cả (c) lẫn (d) đều đúng một nửa, tuỳ vào một con số bạn tự chọn khi thiết kế.

---

### 3.5 Ba mô hình, cùng một trận, tính ra byte

Giả định gộp lại một chỗ để kiểm tra được: **100 người · mỗi người thấy 50 entity · 20 Hz · bản ghi đầy đủ 10 B · delta 7 B cho 20 % entity đổi mỗi tick · event 12 B, 2 event/s mỗi entity**. Chỉ tính payload — header UDP/IP và header giao thức của bạn nằm ngoài, bài 15 và 24 lo phần đó.

| Mô hình | Mỗi tick / player | Mỗi giây / player | Egress 100 người | So với snapshot |
|---|---|---|---|---|
| **Full snapshot** | 500 B | **10,0 KB/s** | **1,00 MB/s** | 1,00× |
| **Delta** (20 % đổi) | 70 B | **1,4 KB/s** | **0,14 MB/s** | rẻ hơn **7,14×** |
| **Event** (2 ev/s/entity) | 60 B *(trung bình)* | **1,2 KB/s** | **0,12 MB/s** | rẻ hơn **8,33×** |

*(Bậc độ lớn, không phải hằng số — thay đổi theo phần cứng, mạng và tải. Ba con số này chỉ so được với nhau vì dùng chung một trận và một bộ giả định; đổi bất kỳ giả định nào thì thứ hạng có thể đảo.)*

Bảng này có một cái bẫy, và nó là lý do mục 2 tồn tại. Cột "mỗi tick" của snapshot là **500 B, luôn luôn**. Cột của event là **trung bình 60 B**, và trung bình không nói gì về tick tệ nhất. Cột của delta là 70 B với đúng một điều kiện: 20 % thật sự là 20 %.

Bài 8 đã dạy đúng bài học này ở trục thời gian — p99 mới là thứ giết bạn, không phải trung bình. Ở đây nó xuất hiện lại ở trục băng thông.

### 3.6 Điểm hoà vốn: event đắt hơn snapshot từ đâu

Gọi `p` là tỉ lệ entity đổi trạng thái trong một tick, mỗi thay đổi sinh 1 event. Một tick:

```
snapshot = N x R            = 50 x 10 = 500 B   (không phụ thuộc p)
event    = p x N x E        = p x 50 x 12
hoà vốn khi p x N x E = N x R  ->  p = R / E = 10 / 12 = 83,33 %
```

Điểm hoà vốn **không phụ thuộc N**: nó chỉ là tỉ số giữa kích thước một bản ghi đầy đủ và kích thước một event. Event 12 B so với bản ghi 10 B → 83,33 %. Nếu bạn ép event xuống 8 B (bỏ overhead reliable — điều bạn không được phép làm) thì `p = 10/8 = 125 %`, tức không bao giờ hoà vốn. Đó là chỗ (c) và (d) ở hộp trên gặp nhau: **ngưỡng là một đại lượng bạn tự đặt ra khi chọn kích thước event.**

| p (entity đổi / tick) | Delta 7 B | Event 12 B | So với snapshot 500 B |
|---|---|---|---|
| 5 % | 17,5 B | 30 B | delta 3,50 % · event 6,00 % |
| 20 % | 70 B | 120 B | delta 14,00 % · event 24,00 % |
| 40 % | 140 B | 240 B | delta 28,00 % · event 48,00 % |
| 80 % | 280 B | 480 B | delta 56,00 % · event 96,00 % |
| **83,33 %** | 291,7 B | **500 B** | **event hoà vốn** |
| 100 % | 350 B | 600 B | delta 70,00 % · event **120,00 %** |

<svg viewBox="0 0 700 250" role="img" aria-labelledby="gs23-b-t gs23-b-d" style="width:100%;height:auto">
<title id="gs23-b-t">Chi phí một tick theo tỉ lệ entity đổi</title>
<desc id="gs23-b-d">Biểu đồ đường. Trục ngang là tỉ lệ entity đổi từ không tới một trăm phần trăm, trục dọc là byte mỗi tick từ không tới sáu trăm. Đường snapshot nằm ngang ở năm trăm byte. Đường delta và đường event đều đi lên từ gốc, đường event dốc hơn và cắt đường snapshot ở tám mươi ba phẩy ba phần trăm.</desc>
<line x1="70" y1="210" x2="662" y2="210" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5"/>
<line x1="70" y1="30" x2="70" y2="210" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5"/>
<text x="64" y="214" text-anchor="end" font-size="10" fill="currentColor">0</text>
<text x="64" y="72" text-anchor="end" font-size="10" fill="currentColor">500 B</text>
<text x="64" y="44" text-anchor="end" font-size="10" fill="currentColor">600 B</text>
<text x="70" y="230" font-size="10" fill="currentColor">0 %</text>
<text x="360" y="230" text-anchor="middle" font-size="10" fill="currentColor">tỉ lệ entity đổi mỗi tick</text>
<text x="650" y="230" text-anchor="end" font-size="10" fill="currentColor">100 %</text>
<line x1="70" y1="68" x2="650" y2="68" stroke="#3b82f6" stroke-width="2.5"/>
<text x="120" y="60" font-size="11" font-weight="bold" fill="currentColor">SNAPSHOT — phẳng 500 B</text>
<line x1="70" y1="210" x2="650" y2="111" stroke="#84cc16" stroke-width="2.5"/>
<text x="500" y="132" font-size="11" font-weight="bold" fill="currentColor">DELTA 7 B</text>
<line x1="70" y1="210" x2="650" y2="40" stroke="#ef4444" stroke-width="2.5"/>
<text x="420" y="112" font-size="11" font-weight="bold" fill="currentColor">EVENT 12 B</text>
<circle cx="553" cy="68" r="5" fill="#f59e0b"/>
<line x1="553" y1="68" x2="553" y2="210" stroke="currentColor" stroke-opacity="0.35" stroke-width="1" stroke-dasharray="4 3"/>
<text x="553" y="196" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">83,33 %</text>
<text x="80" y="24" font-size="10" fill="currentColor">byte / tick / player · N = 50 entity</text>
</svg>

83,33 % nghe như một ngưỡng an toàn: không trận nào có 42 trong 50 entity đổi *trạng thái rời rạc* cùng một tick. Trục hoành của biểu đồ dừng ở 100 % vì mỗi entity chỉ có một trạng thái.

**Nhưng trục hoành đó là giả định, không phải luật.** Trong vụ nổ ở mục 2, 50 entity sinh 370 event: **7,4 event mỗi entity**, tức `p` hiệu dụng **740 %** — vượt ngưỡng 83,33 % **8,88 lần**, đúng bằng tỉ số 4.440/500 đã tính. Một cái chết không phải một event, nó là một *chuỗi*: chết, rơi 4 món đồ, phá địa hình xung quanh, cộng điểm cho người bắn.

> Snapshot có chi phí tỉ lệ với **kích thước thế giới**. Event có chi phí tỉ lệ với **tốc độ thế giới thay đổi**. Kích thước thế giới có trần và bạn biết trần đó từ lúc thiết kế. Tốc độ thay đổi thì không — nó do người chơi quyết định, và người chơi sẽ tìm ra cách làm nó lớn nhất có thể.

Đây cũng là lý do cái bẫy này không sửa được bằng "nén tốt hơn": nén thu nhỏ mỗi event, không thu nhỏ **số** event. Còn cắt bớt event thì bạn vừa làm hỏng đúng thứ mà event tồn tại để bảo đảm.

### 3.7 Snapshot định kỳ làm mốc cho delta

Delta ở 3.3 để lại một món nợ: mất một gói thì client lệch tới bao giờ? Cách rẻ nhất để trả nợ đó là **cứ K tick lại gửi một full snapshot** — hệt I-frame và P-frame của video codec. Snapshot là mốc tự chứa; các delta ở giữa treo vào nó.

Chi phí: `1.400 B/s` của delta cộng thêm `500 B × 20 / K` mỗi giây.

| K (tick giữa hai mốc) | Chu kỳ mốc | Tổng | So với snapshot 10 KB/s | Lệch tối đa sau mất gói |
|---|---|---|---|---|
| 10 | 0,5 s | **2,40 KB/s** | rẻ hơn **4,17×** | 500 ms |
| 20 | 1,0 s | **1,90 KB/s** | rẻ hơn **5,26×** | 1.000 ms |
| 40 | 2,0 s | **1,65 KB/s** | rẻ hơn **6,06×** | 2.000 ms |

Cột cuối là cái giá thật, và nó tệ hơn vẻ ngoài. Ở 3 % mất gói, 20 Hz cho **0,6 gói mất mỗi giây**; mỗi lần mất, thời gian lệch trung bình là nửa chu kỳ mốc. Với K = 20: `0,6 × 0,5 s` = **30 % thời gian trận đấu, client đang hiển thị sai một thứ gì đó**. Hạ xuống K = 10 thì còn 15 % — trả bằng 0,5 KB/s.

Không con số nào trong cột đó chấp nhận được, và đó chính là lý do bài 25 tồn tại: thay vì gửi mốc theo lịch cố định, server tính delta **so với snapshot gần nhất mà client đã ack**. Mốc không còn là một lịch; nó là một thoả thuận hai chiều. Bảng trên là **cận trên của cái giá** khi bạn từ chối làm việc đó.

### 3.8 Mỗi mô hình gọi đúng một mức đảm bảo của bài 14

Ba mức của bài 14 không phải ba lựa chọn tự do — mô hình replication chọn sẵn cho bạn:

| Mô hình | Mức đảm bảo | Vì sao đúng một mức đó |
|---|---|---|
| **Full snapshot** | **unreliable-sequenced** | Gói sau thay thế trọn gói trước, nên gửi lại là vô nghĩa. Vẫn cần bộ lọc *sequenced*: gói cũ tới muộn mà được xử lý thì kéo entity giật ngược — bài 14 đo được **24,681 %** packet đảo thứ tự ở jitter ±50 ms. |
| **Delta** | **unreliable**, nhưng phải biết baseline | Không cần *giao* gói cũ, nhưng server phải **biết** client đang giữ mốc nào. Đó là ack dùng để *chọn baseline*, không phải ack để *gửi lại* — hai thứ khác nhau, bài 25. |
| **Event** | **reliable-ordered** | Không có gói thay thế, và thứ tự mang ngữ nghĩa. Đây là mức đắt nhất, và nó kéo theo head-of-line blocking. |

Chú ý delta rơi vào một ô mà bài 14 **không có tên gọi**: nó dùng kênh unreliable nhưng vẫn cần một luồng thông tin ngược về. Ack ở đây không dùng để gửi lại cái đã mất — server sẽ không bao giờ gửi lại gói delta cũ — mà để trả lời câu "tôi được phép tính hiệu so với cái gì". Đó là toàn bộ nội dung bài 25.

---

## 4. Kết luận không ai nói ở slide đầu: game thật dùng cả ba

Ba mục 3.2–3.4 đọc như ba phương án cạnh tranh. Chúng không cạnh tranh. Chúng phục vụ **ba loại state khác nhau tồn tại cùng lúc trong cùng một trận**, và một game shipping dùng cả ba trong cùng một packet.

Chọn theo **tính chất phục hồi của loại state**, không theo số byte:

| Loại state | Mô hình | Vì sao — theo cột phục hồi, không theo giá |
|---|---|---|
| **Vị trí / vận tốc entity** | snapshot hoặc delta | Đổi mỗi tick, giá trị mới **thay thế hoàn toàn** giá trị cũ. Mất một gói: buffer nội suy 100 ms của bài 8 nuốt trọn. Delta khi entity nhiều, snapshot khi bạn muốn chi phí có trần. |
| **HP** | delta | Cũng là giá trị thay thế được, nhưng **đổi hiếm hơn vị trí nhiều** — gửi lại 100/100 mỗi tick là lãng phí thuần. Field mask bật đúng lúc nó đổi. |
| **Animation state** | delta | Enum vài giá trị, đổi vài lần mỗi giây. Đúng ô của delta: thay thế được nên không cần reliable, hiếm nên không cần gửi mỗi tick. |
| **"Player 7 đã chết"** | **event** | Không có "trạng thái chết hiện tại" nào cần đồng bộ liên tục — chỉ có **khoảnh khắc chuyển**, và nó kéo theo hoạt ảnh, âm thanh, điểm số. Không gói nào sau đó nhắc lại. |
| **Địa hình bị phá** | **event** | Số mảnh địa hình lớn hơn số entity nhiều bậc, nhưng **gần như không bao giờ đổi**. Snapshot cả bản đồ mỗi tick là vô lý; delta cần một baseline khổng lồ. Event trả đúng tiền cho đúng số lần phá. |
| **Inventory** | **event** | Thay đổi vài lần mỗi phút và **mỗi thay đổi có ngữ nghĩa giao dịch** ("nhặt", "dùng", "mất"). Đây cũng là loại state duy nhất trong bảng mà sai một lần là sai về **tài sản của người chơi**, không phải về hình ảnh. |

Đọc cột giữa từ trên xuống: hai dòng đầu là state **liên tục**, hai dòng cuối là state **rời rạc**, và ranh giới nằm đúng chỗ thang hạn sử dụng của bài 12 đặt nó. Bài này chỉ thêm một tầng: bên trái ranh giới còn chia tiếp thành snapshot và delta, tuỳ bạn muốn chi phí phẳng hay chi phí rẻ.

Và bảng này cũng vô hiệu hoá cái bẫy ở mục 2. Team đó không sai vì chọn event; họ sai vì chọn event **cho tất cả**. Với phân bổ đúng, vụ nổ chỉ sinh event cho phần rời rạc — 50 cái chết, 200 món đồ rơi, 120 mảnh địa hình vẫn là 370 event, nhưng vị trí và HP của 50 entity vẫn đi qua kênh delta phẳng và không ai phải chờ chúng.

---

## 5. Tính tay

**Bài 1 — đổi thể loại, đổi thứ hạng.** Một game MMO PvE: mỗi player thấy **200 entity**, snapshot **15 Hz**, bản ghi vẫn 10 B. Phần lớn entity là NPC đứng yên: chỉ **4 % entity đổi mỗi tick**. Delta vẫn 7 B/entity đổi.
- Full snapshot và delta, mỗi cái bao nhiêu KB/s mỗi player?
- Delta rẻ hơn bao nhiêu lần? So với 7,14× của trận bắn súng ở mục 3.5 — điều gì trong đề bài làm tỉ số đổi?
- Với 500 player trên một node, egress mỗi mô hình là bao nhiêu MB/s?

**Bài 2 — đặt lại điểm hoà vốn.** Bạn nén được event xuống **9 B** (bài 24 sẽ chỉ cách), còn bản ghi đầy đủ vẫn 10 B.
- Điểm hoà vốn `p` mới là bao nhiêu phần trăm?
- Nếu đồng thời bản ghi đầy đủ cũng nén được xuống 6 B thì `p` là bao nhiêu, và kết luận là gì?
- Trong vụ nổ ở mục 2 với `p` hiệu dụng 740 %, event 9 B tốn bao nhiêu byte, gấp mấy lần tick snapshot 500 B? Nén đã cứu được tình huống đó chưa?

**Bài 3 — chọn K cho một game bắn súng khác.** Vẫn 50 entity, 20 Hz, delta 1.400 B/s, mốc 500 B. Mạng của bạn mất **1,5 %** gói.
- Muốn client sai **dưới 10 %** thời gian, `K` lớn nhất là bao nhiêu tick? (Gợi ý: `tỉ lệ lệch = gói mất/giây × K/(2 × 20)`.)
- Với `K` đó, tổng băng thông là bao nhiêu KB/s, và rẻ hơn full snapshot mấy lần?
- So với K = 20 ở mục 3.7 tại 3 % mất gói: bạn vừa được ưu đãi ở đâu, và ưu đãi đó có mua được bằng tiền không?

---

## 6. Chuyển giao

Không có đáp án trong bài.

**Bạn làm một game sinh tồn 60 người trên bản đồ mở.** Có ba thứ chương trước chưa gặp: (1) người chơi **xây và phá công trình** — một căn nhà là ~300 khối, phá bằng nổ thì rụng cả cụm; (2) có **chợ trao đổi đồ giữa người chơi** chạy song song với trận; (3) trận kéo dài **6 giờ** và người chơi ra vào liên tục, mỗi lần vào phải đồng bộ lại toàn bộ bản đồ đã bị sửa từ đầu trận.

1. Xếp mỗi trong ba thứ trên vào một dòng của bảng mục 4. Cái nào **không** xếp được vào bất kỳ dòng nào, và thiếu tính chất gì?
2. Khối công trình là state rời rạc nên bảng mục 4 nói "event". Nhưng người mới vào giờ thứ tư không nhận được 200.000 event từ đầu trận. Bạn phải bổ sung cái gì vào mô hình event, và cái đó **giống mục 3.7 ở chỗ nào**?
3. Một quả nổ phá 300 khối trong một tick. Với event 12 B, tick đó tốn bao nhiêu byte, chia được mấy packet theo mốc 1200 B của bài 15? Nếu bạn quyết định **trải** 300 event đó ra 10 tick để không vỡ ngân sách, bạn vừa vi phạm tính chất nào của event, và người chơi thấy hiện tượng gì?
4. Chợ trao đổi đồ: chọn mô hình cho nó, rồi trả lời một câu bảng mục 4 không hỏi — **mất một event chợ** khác gì mất một event "player 7 đã chết", khi cả hai đều reliable-ordered?
5. Trận 6 giờ nghĩa là bộ đếm sequence của bạn quay vòng. Với `uint16` ở 20 Hz thì bao lâu quay một vòng? Mô hình nào trong ba mô hình **không quan tâm** chuyện quay vòng đó, và vì sao?
6. **Câu khó nhất:** hai người chơi đứng cạnh nhau, cùng phá một bức tường trong cùng một tick, và cùng nhặt món đồ rơi ra từ đó. Server gửi cho A chuỗi event `WallDestroyed, ItemDropped, ItemPicked(by=B)`; gói giữa tới muộn hơn gói cuối. Reliable-**ordered** đảm bảo A xử lý đúng thứ tự — nhưng A đã **dự đoán** kết quả từ trước theo bài 18, và dự đoán của A là chính A nhặt được. Chỉ ra vì sao reconciliation ở bài 19 **không sửa** được lỗi này, mô hình replication nào trong ba cái sửa được, và cái giá bạn phải trả để có nó — bằng đơn vị của bài 25 chứ không phải bằng KB/s.

Câu 6 là chỗ chương 5 và chương 6 va vào nhau: prediction cần một thứ để đối chiếu, và event không cung cấp thứ đó.

---

## 7. Tóm tắt

- **Một câu hỏi phân loại cả ba mô hình**: mất một gói thì thông tin trong nó còn xuất hiện lại ở đâu không. Snapshot: **mọi gói sau** → sai 50 ms. Delta: **mốc kế tiếp** → sai tới đó. Event: **không ở đâu** → sai vĩnh viễn.
- Cùng một trận **100 người / 50 entity / 20 Hz / bản ghi 10 B**: snapshot **10,0 KB/s** (1,00 MB/s egress) · delta 20 % đổi, 7 B **1,4 KB/s** (rẻ hơn **7,14×**) · event 12 B, 2 ev/s/entity **1,2 KB/s** (rẻ hơn **8,33×**).
- **Điểm hoà vốn của event = kích thước bản ghi / kích thước event**, không phụ thuộc số entity: 10/12 = **83,33 %** entity đổi mỗi tick. Trận thường không tới gần; vụ nổ sinh **7,4 event mỗi entity** → `p` hiệu dụng **740 %**, đắt hơn snapshot **8,88×** — 4.440 B so với 500 B trong một tick, tràn thành **4 packet** reliable-ordered với **11,47 %** xác suất ít nhất một gói rơi ở 3 % loss.
- **Snapshot có chi phí tỉ lệ với kích thước thế giới; event tỉ lệ với tốc độ thế giới thay đổi.** Cái thứ nhất có trần và bạn biết nó từ lúc thiết kế; cái thứ hai do người chơi quyết định. Nén thu nhỏ mỗi event, không thu nhỏ số event.
- **Keyframe cứu delta nhưng đắt theo thời gian, không theo byte**: K = 20 tick (1 s) chỉ tốn thêm 0,5 KB/s (tổng 1,90 KB/s, rẻ hơn **5,26×**) nhưng ở 3 % loss cho **0,6 gói mất/giây** → client sai **30 % thời gian trận**. K = 10 hạ xuống 15 %. Không mức nào chấp nhận được — đó là lý do bài 25 tồn tại.
- **Mô hình chọn sẵn mức đảm bảo**: snapshot → unreliable-sequenced · event → reliable-ordered (đắt nhất, kéo theo head-of-line) · delta → unreliable nhưng cần ack để **chọn baseline**, một ô mà bài 14 chưa đặt tên.
- **Không chọn một mô hình cho cả game — chọn một mô hình cho mỗi loại state.** Vị trí → snapshot/delta · HP và animation → delta · chết, địa hình, inventory → event. Ranh giới nằm đúng chỗ thang hạn sử dụng của bài 12; bài này chỉ chia tiếp nửa bên trái thành "chi phí phẳng" và "chi phí rẻ".

→ **Bài 24 — Serialization & quantization**: chọn được gửi CÁI GÌ rồi. Bài sau hỏi gửi NHƯ THẾ NÀO — và vì sao cùng một vị trí có thể tốn 24 byte hoặc 4 byte.
