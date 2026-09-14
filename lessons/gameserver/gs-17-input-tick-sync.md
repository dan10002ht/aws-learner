# Bài 17 — Input pipeline & đồng bộ tick client–server

## 1. Mục tiêu

Sau bài này bạn có thể:

- Giải thích vì sao **không có đồng hồ tick chung thì server không biết xếp một input vào đâu**, và vì sao mọi kỹ thuật của chương 5 đứng trên bước này.
- Thiết kế **gói input**, và nói được vì sao cần **cả `seq` lẫn `tick`**.
- Tính **offset đồng hồ và RTT** từ ba mốc thời gian, và chỉ ra sai số khi đường đi và đường về **không đối xứng**.
- Tính **client phải chạy trước server bao nhiêu tick** cho một RTT và một mức jitter cho trước, thay vì chép hằng số.
- Chọn **độ sâu input buffer** bằng bảng đánh đổi có số, và xử lý **buffer đói** đúng cách cho tín hiệu **mức** so với tín hiệu **cạnh**.
- Sửa lệch đồng hồ bằng **co giãn tốc độ tick** — tính được mất bao lâu để bù, và khi nào buộc phải nhảy cóc.
- Dựng **metric quan trọng nhất của chương 5**, đọc p50 cùng p99 của nó để chỉnh buffer theo từng người chơi.

---

## 2. Triệu chứng

Một đội làm game bắn súng góc nhìn thứ ba. Họ đọc bài của Gabriel Gambetta về client-side prediction và làm **đúng từng bước**: client apply input ngay khi bấm, giữ buffer input chưa được xác nhận, nhận state từ server rồi replay lại. Code khớp tài liệu tới từng dòng.

Chạy thử trong văn phòng: mượt tuyệt đối. Mở beta: **một nhóm người chơi báo nhân vật rung liên tục, nhóm còn lại không thấy gì.** Không ai reproduce được ở công ty.

Đội đối chiếu log theo loại mạng. Chỉ số duy nhất phân đôi được hai nhóm là **tỉ lệ gói input tới muộn hơn tick mà nó cần được dùng**: nhóm cáp quang **2 %**, nhóm 4G **20 %**.

Khi input của một tick tới muộn, server phải làm gì đó — nó lặp lại input cũ. Client thì đã prediction bằng input **thật**. Hai bên lệch nhau. Với nhân vật chạy **5 m/s** ở 60 Hz, mỗi tick lệch là `5 m/s × 16,67 ms = 8,33 cm`.

Một tick lệch thì không ai thấy. Ba tick liên tiếp thì **25,0 cm** — reconciliation giật nhân vật về, và mắt người thấy rõ. Tần suất ba tick liên tiếp, coi các gói độc lập nhau:

| Nhóm | p (một gói muộn) | 3 tick liên tiếp | Tần suất |
|---|---|---|---|
| Cáp quang | 0,02 | 0,02³ = 0,0008 % | **1 lần mỗi 34,7 phút** |
| 4G | 0,20 | 0,20³ = 0,8 % | **28,8 lần mỗi phút** |

*(Cột thứ ba giả định các gói muộn **độc lập** với nhau. Thực tế jitter có tương quan — một
đợt tắc nghẽn làm nhiều gói liên tiếp cùng muộn — nên xác suất ba tick liên tiếp đói thật sự
**cao hơn** `p³`. Con số trong bảng là cận dưới, và khoảng cách 1.000 lần giữa hai dòng thì
không đổi.)*

Cùng một binary, cùng một thuật toán prediction "đúng sách", chênh nhau **1.000 lần** về tần suất giật.

Prediction không hỏng. Cái hỏng nằm **trước** prediction: đội đó chưa dựng bước đồng bộ tick, nên input tới server ở thời điểm ngẫu nhiên và không có gì hấp thụ sai lệch. Bài này dựng đúng cái nền bị thiếu.

---

## ⏸ Dừng lại — đoán trước #1

Client và server đều chạy 60 Hz. Client gửi lên `{"keys": ["W"]}` mỗi tick. Server nhận và áp dụng ngay khi nhận được.

**Vì sao thiết kế đó không đủ, kể cả khi mạng hoàn hảo không mất gói?**

```
(a) Vì UDP không đảm bảo thứ tự — cần sequence number
(b) Vì server không biết input này thuộc về BƯỚC MÔ PHỎNG nào, nên
    client và server áp cùng một input ở hai thời điểm khác nhau
(c) Vì gửi 60 gói/giây quá tốn băng thông
(d) Vì server cần biết dt của client để tính đúng quãng đường
```

Ba trong bốn phương án mô tả một vấn đề có thật. Chỉ một cái là **vấn đề chặn** — không giải nó thì ba bài sau không chạy được.

---

## 3. Lý thuyết

### 3.1 Đáp án: input không có địa chỉ thì không giao được

Đáp án là **(b)**. Bài 5 dựng xong fixed timestep: simulation là chuỗi bước rời rạc, đánh số, mỗi bước đúng `dt`. Bài 9 thêm điều kiện: cùng state + cùng input + cùng thứ tự = cùng kết quả, bit-for-bit.

Ghép lại thì "cùng input" **không có nghĩa là cùng nội dung** — nó có nghĩa là *cùng nội dung tại cùng số thứ tự bước*. Input `W` áp ở bước 1006 và `W` áp ở bước 1009 là hai input khác nhau, cho ra hai thế giới khác nhau. Nên câu hỏi thật không phải "server có nhận được input không", mà:

> **Input này thuộc về bước mô phỏng số mấy?**

Server không tự trả lời được. Thời điểm gói tin *tới* server là ngẫu nhiên — nó phụ thuộc đường mạng, không phụ thuộc ý định người chơi. Chỉ **client** biết người chơi bấm phím ở khung hình nào của nó, nên client phải **ghi số bước vào gói tin**. Và để ghi được số bước có nghĩa, hai bên phải đồng ý "bây giờ là bước số mấy". Đó là toàn bộ nội dung bài này. Ba bài sau đứng trên nó:

```
bài 17  input có địa chỉ tick, tới đúng chỗ, đúng lúc
   -> bài 18  client apply input ngay tại tick T             (prediction)
   -> bài 19  server báo "đã xử lý tới seq K" -> replay từ đó (reconciliation)
   -> bài 22  tua ngược về tick T, thay input, chạy lại       (rollback)
```

Cả ba đều là câu "chạy lại simulation từ tick T". Không có T thì không bài nào trong ba tồn tại.

### 3.2 Gói input, và vì sao cần cả `seq` lẫn `tick`

```go
type InputPacket struct {
    Seq     uint16   // tăng đơn điệu theo kết nối, không bao giờ lặp
    Tick    uint32   // tick ĐÍCH: input này dành cho bước mô phỏng nào
    DtMs    uint8    // độ dài bước client đã dùng (thường hằng, xem dưới)
    Buttons uint8    // bitfield: W A S D jump fire reload
    Yaw     int16    // hướng nhìn, đã lượng tử hoá
    Pitch   int16
}                    // 12 byte
```

**Đã có `tick` rồi thì `seq` để làm gì?** Hai trường trả lời hai câu khác nhau:

| | `seq` | `tick` |
|---|---|---|
| Trả lời | "gói **thứ mấy** tôi gửi" | "dành cho **bước nào**" |
| Tính chất | đơn điệu tuyệt đối, duy nhất | **có thể lặp, nhảy, lùi** |
| Ai dùng | reliability layer (bài 14), reconciliation (bài 19) | vòng lặp simulation |

Dòng giữa là chỗ quan trọng. `tick` **không** đơn điệu, vì nó suy ra từ ước lượng đồng hồ, mà ước lượng thì được sửa liên tục (mục 3.7). Sau một lần sửa, hai gói liên tiếp có thể mang cùng số tick, hoặc gói sau mang tick nhỏ hơn gói trước. Nếu chỉ có `tick`: không phân biệt được **gói lặp** (bạn gửi dự phòng) với **hai input thật cùng tick**; không sắp xếp được thứ tự hai gói cùng tick tới lộn; và không có thứ để server ack — bài 19 cần server nói "đã xử lý tới **seq** K", nói "tới tick K" là vô nghĩa vì client có thể đã sửa cách đánh số tick từ lúc đó.

Nếu chỉ có `seq`: server biết thứ tự nhưng không biết **khi nào** áp — quay lại vấn đề mục 3.1.

**`DtMs`** gần như luôn bằng `dt` của server ở kiến trúc bài 5, và bỏ được. Giữ nó khi client render ở FPS khác tick rate và gửi input tích luỹ. Quan trọng: **server luôn phải kẹp giá trị này** — nó là tham số client gửi lên, tức một lời khai (bài 1), và sửa `DtMs` thành 200 là speed hack một dòng.

**Băng thông chiều lên.** 12 byte × 60 Hz = **720 B/s**. Input mất gói là mất hẳn, nên thông lệ là gửi kèm 2 input gần nhất trong mỗi gói: **2,16 KB/s**, tức **21,6 %** của 10 KB/s chiều xuống mà bài 1 đã tính. Rẻ, và nó xoá luôn nhu cầu retransmit cho input.

### 3.3 Ước lượng offset và RTT — NTP rút gọn

Client cần trả lời: *đồng hồ server đang chỉ mấy giờ?* Ba mốc, một vòng gửi–nhận:

```
t0  client ghi đồng hồ CỦA NÓ rồi gửi ping
t1  server nhận, ghi đồng hồ CỦA SERVER, gửi trả cả t0 lẫn t1
t2  client nhận, ghi đồng hồ CỦA NÓ
```

Hai công thức — `RTT = t2 − t0` và `offset = t1 − (t0 + t2) / 2`, trong đó `offset` là lượng phải cộng vào đồng hồ client để ra đồng hồ server. Số cụ thể:

```
t0 = 12.340,0 ms   (đồng hồ client)
t1 = 486.310,0 ms  (đồng hồ server — gốc thời gian hoàn toàn khác)
t2 = 12.442,0 ms   (đồng hồ client)

RTT    = 12.442,0 − 12.340,0                   = 102,0 ms
offset = 486.310,0 − (12.340,0 + 12.442,0)/2
       = 486.310,0 − 12.391,0                  = 473.919,0 ms
```

Từ đó, tick hiện tại của server = `floor((đồng_hồ_client + offset) / dt)`.

**Giả định ngầm:** công thức lấy `(t0+t2)/2` làm thời điểm gói tới server, và điều đó chỉ đúng nếu **đường đi và đường về bằng nhau**. Kiểm bằng số:

| Đi / về (ms) | Server thật sự nhận lúc (đồng hồ client) | offset thật | Ước lượng sai |
|---|---|---|---|
| 51 / 51 | 12.391,0 | 473.919,0 | **0** |
| 78 / 24 | 12.418,0 | 473.892,0 | **+27,0 ms** |
| 24 / 78 | 12.364,0 | 473.946,0 | **−27,0 ms** |

Sai số không ngẫu nhiên, nó có công thức đóng: **sai số offset = (thời gian đi − thời gian về) / 2**. Với 78/24 thì (78−24)/2 = 27,0 ms — khớp bảng. Và điều tệ nhất: **gửi thêm bao nhiêu ping cũng không giảm được sai số này.** Trung bình 100 mẫu chỉ khử nhiễu, không khử được thiên lệch, vì thiên lệch có mặt trong *mọi* mẫu. Đây là giới hạn cứng của phương pháp — NTP thật cũng chịu đúng giới hạn đó.

Hai hướng lệch cho hai hậu quả trái ngược. **Chiều lên chậm hơn** (`+27 ms`, ca phổ biến vì bufferbloat thường nằm ở uplink nhà dân): client dán tick đích **quá xa về tương lai**, input tới **sớm** và nằm chờ thêm 27 ms. Không lỗi, không log — bạn vừa mất 27 ms ngân sách mà không ai biết. **Chiều xuống chậm hơn** (`−27 ms`): tick đích **quá gần**, input tới **muộn**. Đây là nhóm 4G ở mục 2.

Cái duy nhất làm được là **giảm nhiễu và loại mẫu xấu**: giữ 20 mẫu gần nhất, bỏ mẫu có RTT trên percentile 25, lấy trung vị offset của phần còn lại. Lọc theo RTT thấp có lý do — gói đi qua hàng đợi rỗng thì cả hai chiều đều gần mức nền, tức gần đối xứng nhất. *(Kinh nghiệm vận hành, không phải định lý — mạng có định tuyến bất đối xứng cố định thì lọc kiểu gì cũng không cứu.)*

---

## ⏸ Dừng lại — đoán trước #2

Client đã biết server đang ở tick 1000. Người chơi bấm `W` **ngay bây giờ**.

**Client dán tick đích nào vào gói?**

```
(a) 1000 — đúng cái server đang chạy
(b) 1001 — tick kế tiếp
(c) 1000 + (số tick tương ứng RTT/2) — vừa đủ để gói bay tới nơi
(d) 1000 + (số tick tương ứng RTT/2) + một khoản dôi ra
```

Nếu bạn chọn (c), mục sau sẽ tính xem nó hỏng ở tỉ lệ bao nhiêu phần trăm số gói.

---

### 3.4 Client phải chạy TRƯỚC server

Đáp án là **(d)**. (a) và (b) chắc chắn hỏng: gói cần **RTT/2** để bay tới, nên khi nó tới nơi thì server đã chạy qua tick 1000 — với RTT 100 ms, server đã ở tick 1003.

(c) là chỗ đáng nghĩ. Nó đúng **trung bình**, và đó chính là vấn đề: đúng trung bình nghĩa là **khoảng một nửa số gói tới muộn**. Độ trễ mạng là một phân phối có đuôi dài về bên phải (bài 15); nhắm vào tâm phân phối thì một nửa số mẫu rơi vào bên sai.

Nên client phải chạy trước server một khoảng:

> **lead = RTT/2 + biên an toàn**

Client không mô phỏng tick 1000 nữa — nó đang ở tick 1006, và mọi input nó gửi đều dán nhãn 1006. Gói bay 50 ms, nằm chờ một chút, và server dùng nó khi tới tick 1006.

<svg viewBox="0 0 720 250" role="img" aria-labelledby="gs17-a-t gs17-a-d" style="width:100%;height:auto">
<title id="gs17-a-t">Client chạy trước server sáu tick để input tới vừa kịp</title>
<desc id="gs17-a-d">Trục thời gian thực nằm ngang. Hàng trên là tick của client, đang ở 1006 trong khi hàng dưới server mới ở tick 1000. Gói input của tick 1006 bay 50 mili giây tới server, nằm chờ trong buffer 50 mili giây nữa, rồi được server tiêu thụ đúng lúc server chạy tick 1006.</desc>
<text x="14" y="20" font-size="12" font-weight="bold" fill="currentColor">CLIENT — đang mô phỏng tick 1006</text>
<line x1="60" y1="52" x2="690" y2="52" stroke="currentColor" stroke-opacity="0.35" stroke-width="1"/>
<circle cx="60" cy="52" r="5" fill="#3b82f6"/><text x="60" y="42" text-anchor="middle" font-size="10" fill="currentColor">1006</text>
<circle cx="129" cy="52" r="4" fill="#3b82f6" fill-opacity="0.5"/><text x="129" y="42" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.6">1007</text>
<circle cx="198" cy="52" r="4" fill="#3b82f6" fill-opacity="0.5"/><text x="198" y="42" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.6">1008</text>
<circle cx="267" cy="52" r="4" fill="#3b82f6" fill-opacity="0.5"/><text x="267" y="42" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.6">1009</text>
<circle cx="336" cy="52" r="4" fill="#3b82f6" fill-opacity="0.5"/>
<circle cx="405" cy="52" r="4" fill="#3b82f6" fill-opacity="0.5"/>
<circle cx="474" cy="52" r="4" fill="#3b82f6" fill-opacity="0.5"/>
<circle cx="543" cy="52" r="4" fill="#3b82f6" fill-opacity="0.5"/>
<line x1="60" y1="60" x2="262" y2="118" stroke="#f59e0b" stroke-width="2"/>
<polygon points="267,120 253,114 256,124" fill="#f59e0b"/>
<text x="120" y="100" font-size="10" fill="currentColor">gói bay RTT/2 = 50 ms</text>
<rect x="267" y="122" width="207" height="30" rx="6" fill="#84cc16" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.3"/>
<text x="370" y="141" text-anchor="middle" font-size="11" fill="currentColor">nằm chờ trong buffer 50 ms = 3 tick</text>
<line x1="474" y1="152" x2="474" y2="180" stroke="#84cc16" stroke-width="2"/>
<polygon points="474,188 468,174 480,174" fill="#84cc16"/>
<line x1="60" y1="205" x2="690" y2="205" stroke="currentColor" stroke-opacity="0.35" stroke-width="1"/>
<circle cx="60" cy="205" r="5" fill="#8b5cf6"/><text x="60" y="226" text-anchor="middle" font-size="10" fill="currentColor">1000</text>
<circle cx="129" cy="205" r="4" fill="#8b5cf6" fill-opacity="0.5"/><text x="129" y="226" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.6">1001</text>
<circle cx="198" cy="205" r="4" fill="#8b5cf6" fill-opacity="0.5"/><text x="198" y="226" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.6">1002</text>
<circle cx="267" cy="205" r="4" fill="#8b5cf6" fill-opacity="0.5"/><text x="267" y="226" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.6">1003</text>
<circle cx="336" cy="205" r="4" fill="#8b5cf6" fill-opacity="0.5"/><text x="336" y="226" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.6">1004</text>
<circle cx="405" cy="205" r="4" fill="#8b5cf6" fill-opacity="0.5"/><text x="405" y="226" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.6">1005</text>
<circle cx="474" cy="205" r="6" fill="#84cc16"/><text x="474" y="226" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">1006</text>
<circle cx="543" cy="205" r="4" fill="#8b5cf6" fill-opacity="0.5"/><text x="543" y="226" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.6">1007</text>
<text x="14" y="248" font-size="12" font-weight="bold" fill="currentColor">SERVER — đang mô phỏng tick 1000</text>
<text x="560" y="141" font-size="10" font-style="italic" fill="currentColor">lead = 100 ms = 6 tick</text>
</svg>

Biên an toàn không phải số cảm tính. Đặt nó bằng **một số nguyên tick** — đơn vị nhỏ nhất server hấp thụ được là một tick — và gọi số đó là **độ sâu buffer `d`**:

> **lead = RTT/2 + d × dt**

Muốn hấp thụ jitter **±20 ms** thì biên phải ≥ 20 ms, tức `d ≥ 2` (33,3 ms) — `d = 1` chỉ cho 16,67 ms, chưa đủ. Bảng cho `dt = 16,67 ms` (60 Hz):

| RTT | RTT/2 | d = 2 → lead | d = 3 → lead |
|---|---|---|---|
| 40 ms | 20 ms | 53,3 ms = **3,20 tick** | 70,0 ms = **4,20 tick** |
| 100 ms | 50 ms | 83,3 ms = **5,00 tick** | 100,0 ms = **6,00 tick** |
| 200 ms | 100 ms | 133,3 ms = **8,00 tick** | 150,0 ms = **9,00 tick** |

Đọc ra từ bảng: **lead thay đổi theo từng người chơi** — RTT 40 chạy trước 3,2 tick, RTT 200 chạy trước 9 tick. Không phải hằng số cấu hình, mà là **trạng thái của từng kết nối**, và phải chạy theo khi RTT đổi. Số tick lẻ (3,20) là bình thường: client chỉ cần **lệch pha** đúng khoảng đó, mục 3.7 nói cách giữ pha.

### 3.5 Input buffer ở server: chọn `d` bằng số, không bằng cảm giác

`d` là thứ duy nhất bạn được chọn trong công thức trên — RTT thì mạng quyết. Nó có một đánh đổi thẳng, không chỗ nào lách:

> **`d` lớn: chịu jitter tốt, nhưng cộng thẳng `d × dt` vào độ trễ.**
> **`d` nhỏ: độ trễ thấp, nhưng buffer đói thường xuyên.**

Để ra số cần mô hình jitter *(mô phỏng, không phải số đo — dùng để thấy hình dạng đánh đổi)*: 80 % gói đi gần mức nền, 20 % gặp hàng đợi và cộng thêm một lượng phân phối mũ trung bình 9 ms. p99 phần cộng thêm = **27,0 ms**, p99,9 = **47,7 ms**.

Tỉ lệ đói = xác suất phần cộng thêm vượt quá biên `d × 16,67 ms`:

| `d` | Biên hấp thụ | Tỉ lệ tick đói | Tần suất đói ở 60 Hz | Cộng vào ngân sách 182 ms |
|---|---|---|---|---|
| 1 | 16,67 ms | **3,139 %** | 1 lần mỗi 0,53 s | 198,7 ms (+9,2 %) |
| 2 | 33,33 ms | **0,493 %** | 1 lần mỗi 3,38 s | 215,3 ms (+18,3 %) |
| 3 | 50,00 ms | **0,077 %** | 1 lần mỗi 21,6 s | 232,0 ms (+27,5 %) |
| 4 | 66,67 ms | **0,012 %** | 1 lần mỗi 137,4 s | 248,7 ms (+36,6 %) |

**Chiều lợi:** mỗi tick thêm chia tỉ lệ đói cho **6,37 lần** (đúng bằng `e^(16,67/9)` trong mô hình này) — hiếm khi bạn đổi tuyến tính lấy được hàm mũ. **Chiều hại:** nó cộng **thẳng 16,67 ms** vào ngân sách. So với bài 8: hạ buffer nội suy 100 → 50 ms cắt 50 ms *miễn phí*; ở đây bạn **đi ngược lại**, mua độ mượt bằng đúng thứ tiền tệ đó.

Đó là lý do `d = 2`–`3` là dải thường gặp: `d = 1` đói 1 lần mỗi nửa giây (không dùng được), `d = 4` cộng hơn một phần ba ngân sách để đói ít đi 6 lần so với `d = 3` — mà `d = 3` đã là 21,6 giây một lần.

Điểm hay bị bỏ: **`d` không cần cố định** — nó là tham số theo từng kết nối. Mạng ổn định để `d = 2` và được thưởng 16,67 ms; 4G để `d = 4` và trả 16,67 ms để không giật. Server chỉnh `d` bằng chính metric ở mục 3.8.

---

## ⏸ Dừng lại — đoán trước #3

Server tới tick 1006. Buffer rỗng — input của tick 1006 chưa tới. Server **không được dừng lại chờ**, vì dừng là cả trận đứng hình (bài 6).

**Nó phải bịa ra một input. Bịa cái gì?**

```
(a) Lặp lại input của tick 1005
(b) Coi như người chơi không bấm gì
(c) Ngoại suy: người chơi đang tăng tốc thì cho tăng tiếp
(d) Không có đáp án đúng cho MỌI trường — phụ thuộc trường đó là loại gì
```

---

### 3.6 Buffer đói: mức và cạnh phải xử lý ngược nhau

Đáp án là **(d)**. Chia các trường của gói input làm hai loại:

| Loại | Ví dụ | Ý nghĩa | Khi thiếu |
|---|---|---|---|
| **Mức** (level) | đang giữ `W`, `yaw`, `pitch` | mô tả một **trạng thái đang kéo dài** | **lặp lại giá trị cũ** |
| **Cạnh** (edge) | vừa bấm nhảy, vừa bấm bắn, vừa bấm reload | mô tả một **sự kiện xảy ra một lần** | **coi như không có** |

Lý do là bất đối xứng, không phải quy ước. Lặp một tín hiệu **mức** thì sai ít: người chơi giữ `W` 300 ms liên tục, đoán rằng tick này họ vẫn giữ `W` là đoán đúng phần lớn thời gian, và sai lầm tệ nhất là **đi lố 8,33 cm** rồi bị reconciliation kéo về. Lặp một tín hiệu **cạnh** thì sai thảm hoạ: lặp "vừa bấm bắn" = **bắn thêm một phát người chơi không bắn** — đạn bị trừ, sát thương bị gây, và là sự kiện không hoàn tác được bằng reconciliation vì nó đã ảnh hưởng người khác. Lặp "vừa bấm nhảy" = nhảy hai lần.

Nên câu trả lời không phải "lặp" hay "không bấm gì", mà là **tách bitfield làm hai nhóm và xử lý ngược nhau**:

```go
func (b *InputBuffer) At(tick uint32) Input {
    if in, ok := b.m[tick]; ok { return in }
    b.starved++                     // metric mục 3.8
    last := b.lastApplied
    return Input{
        Buttons: last.Buttons & LevelMask,  // giữ mức: W A S D
        Yaw: last.Yaw, Pitch: last.Pitch,   // giữ hướng nhìn
        // mọi bit cạnh (jump/fire/reload) bị bỏ — mặc định zero
    }
}
```

Phương án (c) — ngoại suy vận tốc — là cái bẫy nghe hay nhất và hỏng lặng lẽ nhất: đúng khi người chơi chạy thẳng, **sai nhiều hơn cả (b)** khi họ đổi hướng vì nó bồi thêm sai số theo hướng cũ. Ngoại suy có chỗ của nó, nhưng ở **client** khi vẽ đối thủ (bài 20), không ở server khi quyết định sự thật.

Một ca bảng trên không phủ: **input tới muộn nhưng vẫn tới** — tick 1006 tới khi server đã ở 1008. **Vứt** thì đơn giản, nhất quán với "không quay ngược"; **nhét vào tick hiện tại** thì người chơi không mất thao tác, nhưng nếu đó là bit cạnh, phát bắn xảy ra muộn 2 tick và ngắm vào chỗ khác. Không có phương án thứ ba, và tick rate cao hơn không tạo ra phương án thứ ba — nó chỉ làm mỗi tick nhỏ đi.

### 3.7 Sửa lệch: co giãn, không nhảy cóc

Ước lượng offset ở mục 3.3 **sẽ đổi** — RTT dao động, đồng hồ hai máy trôi khác nhau, người chơi chuyển Wi-Fi sang 4G (bài 16). Giả sử client phát hiện nó chạy trước **thừa 50 ms**.

Cám dỗ đầu tiên: nhảy lùi 50 ms. 50 ms ở 60 Hz là **3,0 tick** — client mô phỏng lại 3 tick hoặc bỏ qua 3 tick, và người chơi thấy nhân vật của chính mình **dịch một phát 25 cm**. Đúng con số ở mục 2, đúng thứ bạn đang cố diệt. Sửa lỗi bằng cách tạo ra chính lỗi đó.

Cách đúng: **đổi tốc độ đồng hồ, không đổi giá trị đồng hồ.** Client chạy tick nhanh hơn hoặc chậm hơn một vài phần trăm cho tới khi khớp.

```
lệch 50 ms, co giãn 2 %  →  50 / 0,02 = 2.500 ms = 2,5 giây = 150 tick
lệch 50 ms, co giãn 1 %  →  50 / 0,01 = 5.000 ms = 5,0 giây = 300 tick
```

Ở mức 2 %, mỗi tick dài 16,67 × 1,02 = 17,00 ms — lệch **0,333 ms mỗi tick**, nhỏ hơn khoảng cách hai khung hình (16,67 ms ở 60 FPS) tới 50 lần. Người chơi không có cách nào cảm nhận. Bạn vừa giấu một cú giật 25 cm vào 150 tick.

Giới hạn của kỹ thuật, phải nói ra vì nó có thật: lệch **300 ms** thì co giãn 2 % mất **15,0 giây**, và 15 giây chạy sai nhịp là 15 giây chất lượng kém. Nên chính sách thực dụng là hai ngưỡng:

```
|lệch| <  100 ms   →  co giãn 1–2 %, người chơi không thấy gì
|lệch| >= 100 ms   →  nhảy cóc một lần, và BÁO cho lớp trên biết
                      (client xoá buffer prediction, xin full snapshot)
```

Ngưỡng thứ hai không phải thất bại — đó là chỗ bạn thừa nhận "cái vừa xảy ra là đứt mạng hoặc chuyển sóng, không phải trôi đồng hồ", và xử lý như sự kiện reconnect (bài 16).

Hướng co giãn: client **chạy chậm lại** thì tụt gần server hơn (giảm lead), **chạy nhanh lên** thì xa hơn (tăng lead). Server mới là bên có dữ liệu để biết chỉnh hướng nào — nó thấy input tới sớm hay muộn. Nên thực tế server gửi kèm snapshot một trường nhỏ: *"input của bạn đang tới sớm 3,2 tick, mục tiêu 3,0"*, và client co giãn theo. Client không tự đoán bằng ping.

### 3.8 Đo cái gì: phân phối "sớm/muộn bao nhiêu tick"

Trường vừa nói ở trên là metric quan trọng nhất của hệ thống này. Với mỗi input, khi server tiêu thụ, ghi lại:

```
lead_ticks = (tick nó nằm sẵn trong buffer) − (tick server đang chạy)
```

Dương = tới sớm, nằm chờ. Âm hoặc không có = đói. Vẽ histogram. Với `d = 3` và mô hình jitter mục 3.5, mô phỏng 2.000.000 gói cho ra:

<svg viewBox="0 0 700 250" role="img" aria-labelledby="gs17-b-t gs17-b-d" style="width:100%;height:auto">
<title id="gs17-b-t">Phân phối độ sớm của input khi tới buffer, thang log</title>
<desc id="gs17-b-d">Cột cao nhất ở mức sớm ba tick chiếm 96,8 phần trăm. Các cột sớm hai tick và một tick nhỏ dần. Ba cột bên phải nằm trong vùng đói, tổng cộng chưa tới một phần nghìn.</desc>
<line x1="60" y1="210" x2="660" y2="210" stroke="currentColor" stroke-opacity="0.4" stroke-width="1"/>
<rect x="352" y="34" width="258" height="176" fill="#ef4444" fill-opacity="0.08"/>
<text x="481" y="28" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">vùng ĐÓI — tổng 0,077 %</text>
<rect x="72" y="60" width="70" height="150" rx="3" fill="#84cc16" fill-opacity="0.45"/>
<text x="107" y="52" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">96,85 %</text>
<rect x="162" y="107" width="70" height="103" rx="3" fill="#84cc16" fill-opacity="0.45"/>
<text x="197" y="99" text-anchor="middle" font-size="11" fill="currentColor">2,66 %</text>
<rect x="252" y="131" width="70" height="79" rx="3" fill="#f59e0b" fill-opacity="0.45"/>
<text x="287" y="123" text-anchor="middle" font-size="11" fill="currentColor">0,413 %</text>
<rect x="372" y="155" width="70" height="55" rx="3" fill="#ef4444" fill-opacity="0.5"/>
<text x="407" y="147" text-anchor="middle" font-size="11" fill="currentColor">0,068 %</text>
<rect x="462" y="180" width="70" height="30" rx="3" fill="#ef4444" fill-opacity="0.5"/>
<text x="497" y="172" text-anchor="middle" font-size="11" fill="currentColor">0,010 %</text>
<rect x="552" y="204" width="70" height="6" rx="2" fill="#ef4444" fill-opacity="0.5"/>
<text x="587" y="196" text-anchor="middle" font-size="11" fill="currentColor">0,002 %</text>
<text x="107" y="226" text-anchor="middle" font-size="11" fill="currentColor">sớm 3</text>
<text x="197" y="226" text-anchor="middle" font-size="11" fill="currentColor">sớm 2</text>
<text x="287" y="226" text-anchor="middle" font-size="11" fill="currentColor">sớm 1</text>
<text x="407" y="226" text-anchor="middle" font-size="11" fill="currentColor">muộn 0–1</text>
<text x="497" y="226" text-anchor="middle" font-size="11" fill="currentColor">muộn 1–2</text>
<text x="587" y="226" text-anchor="middle" font-size="11" fill="currentColor">muộn 2–3</text>
<text x="360" y="245" text-anchor="middle" font-size="10" font-style="italic" fill="currentColor">độ sớm của input khi server tiêu thụ, đơn vị tick — chiều cao cột theo thang log</text>
</svg>

Ba chỉ số đọc ra từ đó, mỗi cái nói một chuyện khác:

| Chỉ số | Ở đây | Nó nói gì | Sai thì làm gì |
|---|---|---|---|
| **p50 độ sớm** | **3,00 tick** | lead có đúng bằng `d` không | p50 = 5 mà `d` = 3 → thừa 2 tick = **lãng phí 33,3 ms**, giảm lead |
| **p99 độ sớm** | **1,38 tick** | đuôi jitter còn cách vực bao xa | p99 chạm 0 → sắp đói, tăng `d` |
| **% muộn** | **0,077 %** | tỉ lệ tick phải bịa input | vượt ngưỡng bạn đặt → tăng `d` |

**p50 và p99 phải đọc cùng nhau.** p50 một mình không phát hiện được gì: hai kết nối cùng p50 = 3,00 nhưng một cái p99 = 2,8 (mạng phẳng, hạ `d` xuống 1 được) và cái kia p99 = 0,1 (đuôi dài, phải tăng `d` lên 5). Trung bình càng vô dụng — đúng lý do bài 8 đã nói: cái làm hỏng trải nghiệm nằm ở đuôi, và trung bình được thiết kế để giấu đuôi.

Chỉ số này rẻ — một số nguyên mỗi input — và là thứ **duy nhất** cho bạn chỉnh `d` theo từng người chơi có căn cứ. Nếu chỉ dựng được một metric của cả chương 5, dựng nó.

---

## 4. Thứ tự dựng — và chuyện gì hỏng nếu bỏ bước

Năm mảnh phải vào theo thứ tự, mỗi mảnh cần mảnh trước:

| # | Mảnh | Bỏ nó thì triệu chứng là |
|---|---|---|
| 1 | Ước lượng offset + RTT | client không biết dán tick nào, mọi thứ sau vô nghĩa |
| 2 | `seq` + `tick` trong gói input | server áp input sai bước → prediction lệch mọi tick |
| 3 | Lead = RTT/2 + `d`×dt | ~50 % input tới muộn (mục 3.4) |
| 4 | Buffer + chính sách đói mức/cạnh | đói thì bắn trùng đạn hoặc đứng hình |
| 5 | Co giãn tick + metric độ sớm | chạy đúng lúc dựng rồi trôi dần, không ai biết |

Hàng cuối hay bị bỏ nhất và khó phát hiện nhất: bốn mảnh đầu **có thể chạy đúng trong buổi test** rồi hỏng dần trên production khi RTT người chơi thật đổi liên tục. Không có mảnh 5, bạn không có cách nào biết.

---

## 5. Tính tay

**Bài 1.** Server 128 Hz (`dt` = 7,81 ms), người chơi RTT 60 ms, bạn muốn biên hấp thụ **ít nhất 30 ms**.
- `d` nhỏ nhất thoả mãn là bao nhiêu? Biên thật khi đó?
- Lead bằng bao nhiêu ms và bao nhiêu tick?
- Cùng người chơi đó, cùng yêu cầu 30 ms, nhưng server 60 Hz: `d` và lead là bao nhiêu? **Lead tính bằng ms có đổi không?** Giải thích kết quả.

**Bài 2.** Bạn đo được `p50 độ sớm = 4,80 tick`, `p99 độ sớm = 3,90 tick`, `% muộn = 0,000 %`, ở `d` = 3, 60 Hz.
- Hệ thống có đói không? Có lãng phí không? Lãng phí bao nhiêu ms?
- Con số nào trong ba con số trên nói lên rằng lãng phí đó là **an toàn để cắt**?
- Cắt lead đi 1,5 tick thì ba con số mới là bao nhiêu, và ngân sách 182 ms còn lại bao nhiêu?

**Bài 3.** Client phát hiện lệch 80 ms.
- Co giãn 1,5 % mất bao lâu? Bao nhiêu tick ở 60 Hz?
- Trong khoảng đó, mỗi tick dài bao nhiêu ms?
- Nếu trong lúc đang bù thì ước lượng offset lại đổi thêm 30 ms **cùng chiều**, tổng thời gian bù là bao nhiêu? Có phải cứ cộng hai lần lại không?

---

## 6. Chuyển giao

Không có đáp án trong bài.

**Game đua xe 8 người**, vòng đua 90 giây, xe chạy 60 m/s. Người chơi ở ba châu lục, RTT từ 25 ms tới 280 ms. Va chạm giữa hai xe là cơ chế chính.

1. Ở 60 m/s, một tick 60 Hz đi được bao nhiêu mét? So với con số 8,33 cm ở mục 2, một tick đói ở game này đắt hơn bao nhiêu lần?
2. Người RTT 280 ms phải chạy trước bao nhiêu tick với `d` = 3? Anh ta đang mô phỏng thế giới ở thời điểm nào so với người RTT 25 ms — sớm hay muộn hơn, bao nhiêu ms?
3. Hai người ở câu 2 va chạm với nhau. Cả hai đều gửi input dán nhãn tick 5000. Server chạy tick 5000 với cả hai input. Vậy thì **có công bằng không**, và nếu có thì thứ gì đang bị hy sinh để đổi lấy sự công bằng đó?
4. Người RTT 280 ms mất một input ở đúng tick va chạm. Server lặp lại tín hiệu mức (giữ ga, giữ lái). Ở 60 m/s, kết quả va chạm sai lệch thế nào so với thực tế người chơi định làm?
5. Đội đề xuất: cho người RTT cao dùng `d` = 6 để hết đói. Tính cái giá bằng ms và bằng mét, rồi nói vì sao đề xuất đó **làm game tệ đi** dù metric `% muộn` sẽ đẹp hơn.
6. **Câu khó nhất:** một người chơi phát hiện rằng nếu anh ta **cố tình báo RTT cao hơn thật** — trả lời ping chậm lại 100 ms một cách có chủ đích — thì client của anh ta được phép chạy trước server nhiều hơn, tức anh ta **thấy thế giới ở tương lai xa hơn** so với đối thủ, trong khi input của anh ta vẫn tới đúng giờ. Đây có phải một lợi thế thật không? Nếu có, nó đến từ đâu — từ việc chạy trước, hay từ một thứ khác mà việc chạy trước chỉ vô tình mở ra? Và **server có cách nào phân biệt kẻ này với một người thật sự ngồi ở châu lục khác không**, hay chỉ có cách hạn chế thiệt hại?

Câu 6 là chỗ đồng bộ tick chạm vào chống gian lận, và sẽ quay lại ở chương 8. Cái phải nghĩ bây giờ: mọi tham số bạn để **client tự khai** đều là một mặt phẳng tấn công, kể cả tham số nghe vô hại như "mạng tôi chậm".

---

## 7. Tóm tắt

- Input không có số tick đích là **input không có địa chỉ**: server không biết áp nó vào bước nào. Đây là bước chặn — bài 18, 19 và 22 đều là câu "chạy lại từ tick T", không tồn tại nếu thiếu T.
- Gói input cần **cả `seq` lẫn `tick`**: `seq` đơn điệu tuyệt đối, dùng chống lặp và để server ack (bài 19); `tick` **có thể lặp, nhảy, lùi** vì nó suy ra từ ước lượng đồng hồ đang sửa liên tục. 12 byte × 60 Hz + 2 bản dự phòng = **2,16 KB/s**, bằng 21,6 % chiều xuống.
- `RTT = t2 − t0`, `offset = t1 − (t0+t2)/2`. Công thức giả định đường đi và về đối xứng. Khi không: **sai số = (đi − về)/2** — với 78/24 ms là **27,0 ms**, và **gửi thêm bao nhiêu ping cũng không khử được**, vì thiên lệch có trong mọi mẫu.
- Client phải chạy trước: **lead = RTT/2 + d × dt**. Nhắm đúng RTT/2 là để **một nửa số gói tới muộn**. Ở 60 Hz với `d` = 3: RTT 40 → 4,20 tick; RTT 100 → 6,00; RTT 200 → 9,00. Lead là **trạng thái của từng kết nối**, không phải hằng số cấu hình.
- Chọn `d` là đánh đổi có số: mỗi tick thêm chia tỉ lệ đói cho **6,37 lần** nhưng cộng **thẳng 16,67 ms** vào ngân sách 182 ms. `d` = 1 đói 1 lần mỗi 0,53 s; `d` = 3 đói 1 lần mỗi 21,6 s, ngân sách thành **232,0 ms (+27,5 %)**.
- Buffer đói xử lý **ngược nhau theo loại tín hiệu**: **mức** (giữ phím, hướng nhìn) thì **lặp**, **cạnh** (bắn, nhảy, reload) thì **bỏ** — lặp một tín hiệu cạnh là bắn thêm một phát người chơi không bắn, và reconciliation không hoàn tác được vì nó đã chạm tới người khác. Ngoại suy vận tốc thuộc về client khi vẽ đối thủ (bài 20), không thuộc về server.
- Sửa lệch bằng **co giãn tốc độ tick**: lệch 50 ms, co giãn 2 % → **2,5 giây = 150 tick**, mỗi tick lệch 0,333 ms, không ai cảm nhận được. Nhảy cóc 50 ms = **3 tick = 25 cm**, đúng thứ bạn đang diệt. Trên ~100 ms thì co giãn quá lâu (300 ms mất 15 s): nhảy một lần, coi là sự kiện reconnect.
- Metric quan trọng nhất của chương này: **phân phối độ sớm của input khi server tiêu thụ**. `p50` phải bằng `d` (cao hơn = lãng phí ms); `p99` cho biết đuôi còn cách vực bao xa; `% muộn` là tỉ lệ tick phải bịa. Đọc **p50 cùng p99** — hai kết nối cùng p50 có thể cần `d` chênh nhau 5 lần.

→ **Bài 18 — Client-side prediction**: có đồng hồ chung và input tới đúng chỗ rồi. Giờ tới phát minh tháng 12 năm 1996 — vẽ trước cái chưa xảy ra.
