# Bài 14 — Tự viết reliability layer trên UDP

## 1. Mục tiêu

Sau bài này bạn có thể:

- Chỉ ra bằng số vì sao **ack từng gói làm tỉ lệ gửi lại phồng lên gần gấp đôi tỉ lệ mất gói thật**, và vì sao ack bitfield đưa nó về đúng 1,00 lần.
- Cài **header 8 byte** `seq / ack / ack_bits` và giải mã một ack packet thành trạng thái của 33 packet.
- Viết `seqGreaterThan` cho `uint16` chạy đúng ở chỗ wrap `65535 → 0`, và chứng minh so sánh ngây thơ sai ở đâu.
- **Ánh xạ từng loại message sang đúng một trong ba mức đảm bảo** — unreliable-unsequenced, unreliable-sequenced, reliable-ordered — và giải thích vì sao gán nhầm mức nào cũng tốn.
- Ước lượng RTT/RTO kiểu Jacobson–Karels, đọc được **biên RTO − SRTT** và nói nó đang bảo hiểm cho cái gì.
- Nói rõ **khi nào không nên tự viết tầng này** và lấy QUIC/KCP/ENet/Steam Networking thay thế.

---

## 2. Triệu chứng

Bạn đã chọn UDP ở bài 12 và chọn xong đường truyền ở bài 13. Bây giờ bạn viết tầng đảm bảo của riêng mình: mỗi packet một sequence number, bên nhận trả về một ack cho **đúng packet đó**, sender không thấy ack trong RTO thì gửi lại. Đơn giản, đúng sách.

Bạn chạy trên một đường mạng **mất 5%**. Đo lại chính đường đó bằng bộ đếm của mình:

```
packet mất thật     :  5.088 / 100.000   =  5,09 %
packet bị GỬI LẠI   :  9.574 / 100.000   =  9,57 %   ← 1,88 lần
```

Không có bug. Bộ đếm không sai. **4.486 packet đã tới nơi, được xử lý đầy đủ, và vẫn bị gửi lại** — chỉ vì cái ack báo tin "tôi nhận rồi" là một packet UDP, và packet UDP thì cũng mất 5%.

Trên mạng tệ hơn thì khoảng cách còn xấu hơn theo hướng ngược với trực giác: loss 20% cho ra **33,39% packet bị gửi lại**. Người chơi không cảm nhận "20% loss"; họ cảm nhận một phần ba số lệnh bị làm lại.

*(Tất cả số trong bài này chạy từ một chương trình Go mô phỏng 100.000 packet mỗi mức loss. Cách mô phỏng mô tả ở mục 3.4.)*

Bài này dựng lại tầng đó cho đúng. Nhưng câu đầu tiên không phải "dựng thế nào" — mà là **dựng bao nhiêu**.

---

## ⏸ Dừng lại — đoán trước #1

Chọn trước khi đọc tiếp.

**Vì sao ack từng gói lại đẩy tỉ lệ gửi lại lên gần gấp đôi loss thật, trong khi nó là cách làm hiển nhiên nhất?**

```
(a) Vì gửi lại cũng bị mất, nên phải gửi lại nhiều lần — hiệu ứng cộng dồn
(b) Vì thông tin "packet 100 đã tới" chỉ nằm trong ĐÚNG MỘT packet; mất packet đó là mất luôn thông tin
(c) Vì RTO đặt quá ngắn, gửi lại trước khi ack kịp về
(d) Vì UDP không đảm bảo thứ tự, ack tới muộn bị bỏ qua
```

---

## 3. Lý thuyết

### 3.1 Cái bẫy lớn nhất: bạn vừa viết lại TCP

Trước khi viết dòng code nào, đây là cảnh báo quan trọng nhất của cả bài.

UDP không hứa gì cả: không đảm bảo tới nơi, không đảm bảo thứ tự, không chống trùng lặp, không kiểm soát tắc nghẽn. Phản xạ tự nhiên của một dev backend là dựng lại đủ bốn thứ đó cho **mọi** packet. Nếu bạn làm thế, kết quả là:

> Bạn vừa viết lại TCP — chậm hơn, ít người test hơn, và nhiều bug hơn bản gốc đã chạy 45 năm trên mọi hệ điều hành.

Và tệ hơn: bạn tự tay dựng lại **chính cái head-of-line blocking mà bài 12 đã chứng minh là lý do bỏ TCP**. Một reliable-ordered stream nghĩa là packet 101 phải nằm chờ trong buffer cho tới khi packet 100 được gửi lại và tới nơi. Bạn bỏ TCP để tránh cái hàng chờ đó, rồi dựng lại nó bằng tay ở tầng ứng dụng.

Giá trị của việc tự viết **không** nằm ở chỗ làm tốt hơn TCP. Nó nằm ở chỗ:

> **TCP áp một mức đảm bảo duy nhất lên mọi byte. Tầng của bạn được phép chọn mức đảm bảo riêng cho từng loại message.**

Đó là toàn bộ lý do. Nếu bạn không tận dụng quyền chọn đó, đừng tự viết.

### 3.2 Ba mức đảm bảo — và bảng ánh xạ

Ba mức, xếp theo giá phải trả tăng dần:

| Mức | Bên nhận làm gì với gói tới | Cần buffer | Cần gửi lại | Rủi ro |
|---|---|---|---|---|
| **unreliable-unsequenced** | xử lý mọi gói tới, kể cả gói cũ tới muộn | không | không | dữ liệu cũ ghi đè dữ liệu mới |
| **unreliable-sequenced** | chỉ nhận gói **mới hơn** gói mới nhất đã nhận; gói cũ **vứt thẳng** | không | không | mất gói = nhảy một nhịp, tự khỏi ở gói sau |
| **reliable-ordered** | giao theo đúng thứ tự; thiếu gói thì **chờ** | có, không chặn trên | có | head-of-line blocking, độ trễ không chặn trên |

Bảng ánh xạ — đây là thứ bạn dán lên tường:

| Loại message | Mức | Vì sao |
|---|---|---|
| Snapshot vị trí entity | **unreliable-sequenced** | Gói sau chứa toàn bộ thông tin gói trước. Gửi lại gói cũ là vô nghĩa. |
| Input người chơi (client → server) | **unreliable-sequenced**, gói mang **nhiều input gần nhất** | Rẻ hơn gửi lại: mỗi packet chứa luôn 3 input cuối, mất 1 gói vẫn không mất input nào. |
| Hiệu ứng hình ảnh, âm thanh phát ra | unreliable-unsequenced | Mất thì thôi. Thứ tự không quan trọng. |
| Tin nhắn chat | **reliable-ordered** | Mất một câu là hỏng đoạn hội thoại; sai thứ tự cũng hỏng. |
| "Player X đã chết", "cửa đã mở" | **reliable-ordered** | Sự kiện đổi trạng thái, không lặp lại ở gói sau. Mất là hai bên lệch thế giới vĩnh viễn. |
| Kết quả trận, phần thưởng | **reliable-ordered** | Không có gói sau để sửa. |
| Ping/keepalive | unreliable-unsequenced | Chính nó là phép đo, gửi lại làm sai phép đo. |

Quy tắc quyết định gọn lại thành một câu, và nó là cách phát biểu khác của **bảng "hạn sử dụng" ở bài 12**:

> **Nếu gói tiếp theo chứa đủ thông tin để thay thế gói này, thì đừng đảm bảo gói này.**
> Snapshot có gói thay thế 50 ms sau. "Player X đã chết" thì không bao giờ có.

Cột "gói cũ tới muộn" không phải chuyện lý thuyết. Mô phỏng gửi đều 60 packet/giây, không mất gói, chỉ jitter độ trễ:

| Jitter | Packet tới **sai thứ tự** |
|---|---|
| ±5 ms | 0,000 % |
| ±20 ms | 1,402 % |
| ±50 ms | **24,681 %** |

*(Mô phỏng dùng jitter phân phối đều và độc lập từng packet. Mạng thật có jitter **tương quan**
— gói đi liền nhau thường cùng nhanh hoặc cùng chậm — nên tỉ lệ đảo thứ tự thực tế thường
thấp hơn con số này. Dùng nó làm cận trên, không phải số đo mạng thật.)*

Trên mạng jitter ±50 ms, **một phần tư số packet tới sau một packet mới hơn nó**. Nếu snapshot của bạn là unreliable-**unsequenced**, một phần tư số gói đó kéo nhân vật giật ngược về vị trí cũ. Bộ lọc sequenced chỉ là một phép so sánh — và nó dập tắt toàn bộ hiện tượng đó.

### 3.3 Header: ba trường, tám byte

```go
type Header struct {
    Seq     uint16 // sequence của packet NÀY
    Ack     uint16 // sequence cao nhất tôi đã nhận từ bạn
    AckBits uint32 // bit i = 1 nghĩa là tôi cũng đã nhận (Ack - 1 - i)
}
// 2 + 2 + 4 = 8 byte, đứng trước payload của mọi packet.
```

Hai chi tiết dễ bỏ qua. Một: `Seq` và `Ack` đếm **hai dòng khác nhau** — `Seq` là dòng tôi gửi, `Ack` là dòng bạn gửi, mỗi đầu giữ `localSeq` và `remoteSeq` riêng. Hai: 8 byte là phụ phí **cố định trên mọi packet** — ở 60 packet/giây, hai chiều, 100 người chơi là `8 × 60 × 2 × 100 = 96 KB/s` riêng cho header, tức **9,6%** của 1 MB/s payload trong bài 8.

### 3.4 Ack bitfield: một ack, 33 packet

Đáp án hộp #1 là **(b)**.

Với ack từng gói, thông tin "packet 100 đã tới" tồn tại **đúng một bản**. Bản đó là một packet UDP và nó cũng mất với đúng xác suất ấy. Xác suất sender biết được:

```
(1 − 0,05) × (1 − 0,05) = 0,9025   →  9,75 % số packet bị coi là mất
```

so với 5% mất thật. Đo trên mô phỏng: **9,57%** — khớp lý thuyết trong sai số thống kê.

Ý tưởng của Glenn Fiedler: **đừng gửi một thông tin một lần**. Mỗi packet đi ra mang theo `Ack` (gói mới nhất đã nhận) cộng 32 bit lịch sử phía sau nó. Một packet ack vì thế báo cáo trạng thái của **33 packet gần nhất**, và 32 packet gửi sau nó **lặp lại** thông tin ấy.

<svg viewBox="0 0 700 210" role="img" aria-labelledby="gs14-a-t gs14-a-d" style="width:100%;height:auto">
<title id="gs14-a-t">Một packet ack mang trạng thái của 33 packet</title>
<desc id="gs14-a-d">Trường Ack trỏ tới sequence 100 là gói mới nhất đã nhận; 32 bit của ack_bits phủ các sequence từ 99 lùi về 68, mỗi bit là một packet đã nhận hay chưa. Ba packet ack liên tiếp có vùng phủ chồng lên nhau nên mất một packet ack không làm mất thông tin.</desc>
<text x="20" y="24" font-size="11" font-weight="bold" fill="currentColor">packet ack có Ack=100, AckBits 32 bit</text>
<rect x="600" y="36" width="60" height="28" rx="5" fill="#84cc16" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.4"/>
<text x="630" y="55" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">Ack=100</text>
<rect x="120" y="36" width="474" height="28" rx="5" fill="#3b82f6" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.3"/>
<text x="357" y="55" text-anchor="middle" font-size="11" fill="currentColor">AckBits — 32 bit, phủ seq 99 lùi về 68</text>
<text x="120" y="80" font-size="10" fill="currentColor" opacity="0.8">seq 68</text>
<text x="594" y="80" text-anchor="end" font-size="10" fill="currentColor" opacity="0.8">seq 99</text>
<text x="20" y="118" font-size="11" font-weight="bold" fill="currentColor">ba packet ack liên tiếp — vùng phủ chồng nhau</text>
<rect x="120" y="130" width="474" height="14" rx="3" fill="#3b82f6" fill-opacity="0.25"/>
<text x="606" y="141" font-size="10" fill="currentColor">Ack=100</text>
<rect x="135" y="150" width="474" height="14" rx="3" fill="#3b82f6" fill-opacity="0.25"/>
<text x="621" y="161" font-size="10" fill="currentColor">Ack=101</text>
<rect x="150" y="170" width="474" height="14" rx="3" fill="#3b82f6" fill-opacity="0.25"/>
<text x="636" y="181" font-size="10" fill="currentColor">Ack=102</text>
<text x="20" y="161" font-size="10" fill="currentColor" opacity="0.85">seq 99 nằm</text>
<text x="20" y="175" font-size="10" fill="currentColor" opacity="0.85">trong cả ba</text>
</svg>

Giải mã ở phía sender — toàn bộ logic là mười dòng:

```go
func (c *Conn) onAckPacket(h Header) {
    c.markAcked(h.Ack)
    for i := 0; i < 32; i++ {
        if h.AckBits&(1<<i) != 0 {
            c.markAcked(h.Ack - uint16(i) - 1) // uint16 tự wrap, đúng ý muốn
        }
    }
}
```

Mô phỏng: hai đầu, mỗi đầu gửi một packet mỗi tick, mỗi packet mang header trên; **cả packet dữ liệu lẫn packet ack đều chịu cùng tỉ lệ mất**. 100.000 packet mỗi mức. "Mất oan" = packet đã tới nơi nhưng sender không bao giờ biết.

| Loss thật | Cách ack | Mất oan | Sender **tưởng** mất | Tưởng / thật |
|---|---|---|---|---|
| 5,09 % | từng gói | 4.486 | 9.574 = **9,57 %** | **1,88×** |
| 5,09 % | **bitfield 33** | **0** | 5.088 = 5,09 % | **1,00×** |
| 10,04 % | từng gói | 8.093 | 18.137 = 18,14 % | 1,81× |
| 10,04 % | **bitfield 33** | **0** | 10.044 = 10,04 % | **1,00×** |
| 20,10 % | từng gói | 13.282 | 33.386 = **33,39 %** | 1,66× |
| 20,10 % | **bitfield 33** | **0** | 20.104 = 20,10 % | **1,00×** |

Cột "mất oan" của bitfield là **0 trên cả ba mức, không phải "gần 0"**. Với 100.000 packet ở loss 20% mà không có lấy một packet nào bị nhầm. Mục sau giải thích vì sao con số đó là 0 chứ không phải là "ít".

---

## ⏸ Dừng lại — đoán trước #2

**Với ack bitfield 33, cần mất bao nhiêu packet ack LIÊN TIẾP thì thông tin "packet 100 đã tới" mới thật sự biến mất khỏi sender?**

```
(a) 1  — vẫn là một packet, chỉ là mang nhiều thông tin hơn
(b) 5  — sau 5 lần thì các bit đã trôi ra ngoài cửa sổ
(c) 32 — đúng bằng số bit
(d) 33 — ack chính nó cộng 32 bit lịch sử
```

Câu hỏi phụ, khó hơn: ở loss 20%, xác suất chuyện đó xảy ra là bao nhiêu?

---

### 3.5 Đáp án: 33, và vì sao "0" là con số đúng

**(d) — 33.** Packet ack thứ *k* sau đó mang `Ack = 100 + k` và phủ lùi tới `100 + k − 32`, nên nó còn phủ seq 100 chừng nào `k ≤ 32`. Packet thứ 33 là packet đầu tiên **không** còn phủ — mô phỏng chạy vét cạn xác nhận đúng mốc này (`ackHistory=1` thì mốc đó là 1).

Xác suất 33 lần liên tiếp, với ack gửi 30 lần/giây:

| Loss | Xác suất mất cả 33 | Nghĩa là |
|---|---|---|
| 5 % | 1,2 × 10⁻⁴³ | không xảy ra |
| 20 % | 8,6 × 10⁻²⁴ | không xảy ra |
| **50 %** | 1,2 × 10⁻¹⁰ | một lần trong ~8,6 tỉ dịp |

Đó là lý do cột "mất oan" bằng đúng 0: ở quy mô 100.000 packet, sự kiện cần xác suất 10⁻²⁴ đơn giản là không xuất hiện. **33 packet ở 30 Hz là 1,1 giây liên tục không một gói nào lọt qua** — và một đường mạng như thế không phải là "loss cao", nó là **mất kết nối**, và mục 3.9 xử lý nó bằng cơ chế khác.

Nói luôn giới hạn: bitfield **không làm giảm tỉ lệ mất gói**. Loss vẫn là 5%, 10%, 20% — cột "tưởng mất" bằng đúng cột "mất thật", không nhỏ hơn. Cái nó xoá là **phần phồng lên do mất ack**. Và vì 33 bản sao đã quá đủ cho nhiễu độc lập, cửa sổ 64 hay 128 bit gần như không mua thêm gì.

### 3.6 Sequence wraparound: chỗ code chạy đúng 18 phút rồi hỏng

`Seq` là `uint16`. Ở 60 packet/giây, nó chạy hết một vòng 65.536 giá trị sau:

```
65.536 / 60 = 1.092,3 giây = 18 phút 12 giây
```

Đúng phút thứ 18, `Seq` nhảy từ 65535 về 0. Mọi chỗ trong code viết `if seq > lastSeq` từ giây đó trở đi đều **từ chối mọi packet mới** — vì 0 không lớn hơn 65535. Trận đấu đứng hình, log sạch sẽ, không một dòng lỗi.

Cách sửa: sequence không phải số, nó là **điểm trên một vòng tròn 65.536 vị trí**. "Mới hơn" nghĩa là "cách đi tới theo chiều kim đồng hồ ngắn hơn nửa vòng".

```go
func seqGreaterThan(a, b uint16) bool {
    return ((a > b) && (a-b <= 32768)) ||
           ((a < b) && (b-a > 32768))
}
```

Kiểm bằng test, cột `naive` là `a > b`:

| a | b | `a > b` | `seqGreaterThan` | đúng là |
|---|---|---|---|---|
| 100 | 99 | true | true | true |
| **0** | **65535** | **false** | **true** | true — 0 tới sau |
| 1 | 65534 | false | true | true |
| **65535** | **0** | **true** | **false** | false — 65535 tới trước |
| 32768 | 0 | true | true | true — đúng nửa vòng |
| 40000 | 100 | true | false | false |

Và quét vét cạn: với mọi `a` trong 65.536 giá trị và mọi khoảng cách `d` từ 1 đến 100, lấy `x = a + d` (có wrap) rồi hỏi "x có mới hơn a không" — câu trả lời đúng luôn là *có*:

```
6.553.600 cặp:  seqGreaterThan sai 0 cặp  |  naive a > b sai 5.050 cặp
```

5.050 chính là `100 × 101 / 2` — đúng bằng số cặp rơi qua điểm wrap. **Không phải bug hiếm; nó là bug chắc chắn xảy ra, mỗi 18 phút một lần**, ở mọi kết nối, cùng lúc.

Hai điểm phải nhớ khi dùng:

- **Phép trừ `uint16` tự wrap đúng**, nên `h.Ack - uint16(i) - 1` ở mục 3.4 không cần sửa gì. Chỉ có **so sánh** là sai, không phải phép trừ.
- `32768` là nửa vòng. Nó ngầm giả định hai đầu không bao giờ lệch nhau quá 32.768 packet — ở 60 Hz là **9 phút 6 giây**. Một kết nối im lặng lâu hơn thế phải bị coi là chết (mục 3.9), chứ không phải chờ nó tự đúng lại.

### 3.7 RTO: gửi lại khi nào

Có ack rồi thì biết packet nào chưa tới. Câu còn lại: **chờ bao lâu mới kết luận là mất?** Chờ ngắn thì gửi lại thừa; chờ dài thì dữ liệu tới muộn.

Dùng đúng công thức Jacobson–Karels của TCP, vì bài toán y hệt: ước lượng trung bình **và độ dao động** của RTT.

```go
// mẫu đầu tiên
srtt, rttvar = r, r/2
// các mẫu sau — alpha = 1/8, beta = 1/4
rttvar = 0.75*rttvar + 0.25*math.Abs(srtt-r)
srtt   = 0.875*srtt + 0.125*r
rto    = math.Max(srtt+4*rttvar, 20) // sàn 20 ms, KHÔNG phải 1 s như TCP
```

Chạy 60 mẫu quanh 40 ms, jitter ±6 ms — RTO khởi động ở 135,08 (mẫu 1), xuống 81,51 (mẫu 5), 57,39 (mẫu 20) rồi hội tụ:

| Đường | SRTT | RTTVAR | **RTO** | Biên = RTO − SRTT |
|---|---|---|---|---|
| RTT 40, jitter ±6 ms | 40,18 | 3,21 | **53,01** | 12,83 ms |
| RTT 40, jitter ±30 ms | 41,00 | 20,45 | **122,80** | **81,79 ms** |

Biên đó là `4 × RTTVAR`, và nó **không bảo hiểm cho độ trễ, nó bảo hiểm cho độ dao động của độ trễ**. Cùng một RTT trung bình, RTO chênh nhau **2,3 lần**. Đây là lý do không được hardcode `RTO = 2 × RTT`: con số đó đúng cho đường đầu và sai thảm hại cho đường sau.

Một spike đơn lẻ 200 ms xen vào chuỗi ổn định:

```
ngay sau spike : SRTT 60,16  RTTVAR 42,36  RTO 229,60   (từ 53 → 230, gấp 4,3 lần)
cần 24 mẫu RTT bình thường để RTO về lại ~52 ms — ở 30 ack/s là 800 ms
```

**Một spike làm hệ thống dè dặt trong 0,8 giây.** Đó là thiết kế cố ý, không phải lỗi: sau một spike, khả năng có spike nữa đang cao. Nhưng nó cũng nói cho bạn biết tầng này không dành cho dữ liệu có hạn sử dụng ngắn hơn 800 ms — dẫn thẳng sang mục sau.

### 3.8 Gửi lại cái gì — và khi nào tuyệt đối không

Ghép hai số vừa có, cho một snapshot vị trí ở 20 Hz, RTT 40 ms:

```
t = 0        gửi snapshot S
t = 53 ms    RTO hết hạn, kết luận S đã mất, gửi lại S
t = 73 ms    S tới nơi (thêm nửa RTT = 20 ms)
```

Trong 73 ms đó, ở 20 Hz đã có **73 / 50 = 1,46 snapshot mới hơn** được sinh ra, và ít nhất một cái đã tới nơi. Client nhận được S lúc này thì làm gì với nó? **Vứt** — bộ lọc sequenced ở mục 3.2 vứt nó, đúng như thiết kế. Bạn vừa trả tiền băng thông cho một packet mà chính hệ thống của bạn được lập trình để ném đi.

> **Với dữ liệu có hạn sử dụng ngắn hơn RTO, gửi lại là trả tiền hai lần cho một thứ chắc chắn bị vứt. Gửi dữ liệu MỚI luôn tốt hơn.**

Ba chiến thuật, xếp theo mức độ nên dùng:

| Chiến thuật | Dùng cho | Cơ chế |
|---|---|---|
| **Không gửi lại gì** | snapshot, hiệu ứng | Gói kế tiếp tự sửa. Ack chỉ dùng để đo RTT và để bài 25 biết baseline nào client đã có. |
| **Gửi kèm (redundancy)** | input người chơi | Mỗi packet mang luôn N mẫu gần nhất. Không chờ ack, không chờ RTO — thông tin bù đến **trước** khi phát hiện mất. Giá: payload ×N. |
| **Gửi lại thật (retransmit)** | chat, sự kiện đổi trạng thái, kết quả | Giữ packet trong buffer tới khi được ack; hết RTO thì gửi lại, và mỗi lần gửi lại thì **nhân đôi RTO** để không làm ngập đường đang tắc. |

Chiến thuật thứ hai rẻ hơn trực giác. Một input 6 byte, gói mang 3 mẫu cuối = 18 byte: chi phí thừa 12 byte × 60 Hz = **720 B/s mỗi người chơi**, bằng **7,2%** của 10 KB/s mỗi player trong ngân sách bài 8. Đổi lại: **mất 2 packet liên tiếp vẫn không mất input nào**, không chờ RTO một mili giây nào. Ở loss 20%, mất 3 packet liên tiếp chỉ còn xác suất **0,8%**, so với 20% mất input nếu không gửi kèm.

Thêm một quy tắc, sai là hỏng nặng: **gửi lại thì cấp `Seq` mới, không dùng lại cũ.** Mỗi packet đi ra dây là một sự kiện gửi riêng, cần `Seq` riêng để ack và đo RTT cho đúng; message ID cũ thì đánh dấu trong payload — tách **định danh packet** khỏi **định danh message**. Đây cũng là lý do Karn's algorithm tồn tại: **không lấy mẫu RTT từ packet đã gửi lại**, vì không biết ack đang trả lời bản nào.

### 3.9 Keepalive và phát hiện mất kết nối

Tầng ack ở trên chỉ chạy được khi **có packet đi qua**. Một trận đấu có lúc cả hai bên đứng im, nhưng kết nối vẫn phải được chứng minh là sống — nếu không, NAT ở giữa (bài 16) sẽ đóng ánh xạ cổng và không ai báo cho bạn.

Ba tham số, và cả ba đều suy ra được từ số đã có:

| Tham số | Giá trị | Suy ra từ |
|---|---|---|
| Chu kỳ keepalive khi im lặng | 100–200 ms | Đủ dày để bitfield 33 luôn có dữ liệu và để NAT không đóng ánh xạ |
| Ngưỡng "kết nối đang xấu" | không nhận gì trong **1 s** | 33 packet ở 30 Hz = 1,1 s — quá mốc này thì bitfield đã hết tác dụng |
| Ngưỡng ngắt kết nối | không nhận gì trong **5 s** | Lâu hơn mọi spike mạng thực tế; ngắn hơn nhiều so với 9 phút 6 giây của giới hạn nửa vòng `uint16` |

Điểm dễ sai: **đừng dùng "gửi thất bại" làm tín hiệu ngắt kết nối.** `sendto` trên UDP gần như luôn thành công kể cả khi đầu kia đã tắt máy — nó chỉ đẩy byte xuống card mạng. Tín hiệu duy nhất đáng tin là **thời gian kể từ packet cuối cùng NHẬN được**: một biến `lastRecvTime`, so với đồng hồ monotonic của bài 7.

---

## 4. Khi nào KHÔNG nên tự viết

Nói thẳng: **với đa số dự án, câu trả lời là đừng viết.** Mọi thứ ở mục 3 đã có sẵn trong thư viện, đã chạy trên hàng triệu máy, và đã bị bắn phá bởi những lớp mạng tệ hơn bất cứ thứ gì bạn mô phỏng được.

| Lựa chọn | Cho bạn | Cái giá |
|---|---|---|
| **QUIC** (bài 13) | Nhiều stream độc lập + datagram không đảm bảo, mã hoá bắt buộc, chạy được trên trình duyệt qua WebTransport | Bắt buộc TLS và chứng chỉ; nặng hơn ở kết nối đầu |
| **KCP** | ARQ điều chỉnh được, đổi 10–20% băng thông lấy độ trễ thấp hơn TCP rõ rệt | Chỉ lo phần reliable-ordered; mã hoá, kết nối, keepalive bạn tự lo |
| **ENet** | Đúng ba mức đảm bảo ở mục 3.2, dạng "channel", API gọn | Thư viện C, cũ, không mã hoá sẵn |
| **Steam Networking Sockets** | Cả tầng đảm bảo + NAT traversal + relay qua mạng Valve + mã hoá | Ràng vào hệ sinh thái Steam |
| **Tự viết** | Kiểm soát chính xác từng byte header, từng quyết định gửi lại | Bạn phải tự đúng ở cả wraparound, RTO, tắc nghẽn, MTU, bảo mật |

Ba trường hợp tự viết là hợp lý: **để học** (200 dòng Go dạy nhiều hơn 20 trang RFC — lý do bài này tồn tại); **cần kiểm soát thứ không thư viện nào cho** (nhét header vào 4 byte thay vì 8 vì ngân sách gói đã sát MTU — bài 15; hoặc ghép ack với delta compression để một ack vừa xác nhận packet vừa dịch baseline — bài 25); **nền tảng đích không có thư viện nào chạy được** (console đời cũ, thiết bị nhúng).

Và một cái bẫy nghe rất hợp lý nhưng sai: *"tự viết thì nhẹ hơn vì mình chỉ làm phần mình cần."* Đúng ở tuần đầu. Đến tháng thứ ba bạn đã phải thêm keepalive, wraparound, RTO thích ứng, chống trùng lặp, chống replay, giới hạn kích thước gói và một thứ tránh làm ngập đường đang tắc — đó là **danh sách tính năng của QUIC**, và bạn đang cài nó lần đầu trong đời.

---

## 5. Tính tay

**Bài 1.** Bạn gửi 30 packet/giây mỗi chiều, ack bitfield 33, đường mạng mất 10%.
- Một packet cụ thể được bao nhiêu packet ack khác nhau nhắc tới? Xác suất **tất cả** đều mất là bao nhiêu?
- Cửa sổ 33 packet đó trải dài bao nhiêu mili giây? Nếu bạn hạ xuống 10 packet/giây thì thành bao nhiêu, và điều đó làm hỏng giả định nào ở mục 3.9?
- Nếu đổi `AckBits` từ 32 sang 64 bit: tốn thêm bao nhiêu byte mỗi packet, và xác suất mất oan giảm từ 10⁻³³ xuống bao nhiêu? Bạn có mua được gì không?

**Bài 2.** Đường mạng RTT 60 ms, jitter ±24 ms. Dùng công thức mục 3.7, giả sử SRTT đã hội tụ về 60 và RTTVAR về 12.
- RTO bằng bao nhiêu? Biên trên SRTT là bao nhiêu ms và bao nhiêu phần trăm?
- Một snapshot gửi ở 20 Hz bị mất: tính mốc thời gian mà bản gửi lại tới nơi. Lúc đó đã có bao nhiêu snapshot mới hơn được sinh ra?
- Một tin nhắn chat bị mất và bản gửi lại cũng mất. Với quy tắc nhân đôi RTO, tin đó tới nơi sớm nhất vào lúc nào?

**Bài 3.** Game của bạn dùng `Seq` kiểu `uint16` và gửi **120 packet/giây** mỗi chiều.
- Bao lâu thì `Seq` wrap một vòng?
- Giới hạn "không lệch quá nửa vòng" của `seqGreaterThan` tương đương bao nhiêu giây im lặng? So sánh với ngưỡng ngắt kết nối 5 s ở mục 3.9 — còn an toàn không?
- Nếu đổi sang `uint32` thì hai con số trên thành bao nhiêu, và bạn trả thêm bao nhiêu byte mỗi giây cho 100 người chơi, hai chiều?

---

## 6. Chuyển giao

**Bạn làm một game co-op sinh tồn 4 người, chơi trên mạng nhà dân, có người dùng 4G.** Server gửi snapshot 20 Hz. Trong game có: vị trí quái vật (liên tục), "người chơi B vừa mở rương số 47" (sự kiện), số máu (liên tục nhưng quan trọng), và một cơ chế **build công trình** — người chơi đặt tường, tường tồn tại vĩnh viễn và mọi người phải thấy giống nhau.

1. Xếp bốn loại dữ liệu trên vào ba mức ở mục 3.2. Cái nào bạn phải suy nghĩ lâu nhất, và vì sao nó không rơi gọn vào một ô?
2. Số máu là một số thay đổi liên tục — nghe như snapshot, tức unreliable-sequenced. Nhưng máu về 0 là chết, và chết là sự kiện. Bạn tách nó làm hai kênh, hay tìm một cách khiến câu hỏi này biến mất?
3. Người chơi 4G có RTT dao động 60–400 ms. Với công thức mục 3.7, RTO của kết nối đó nằm quanh đâu? Nó còn dùng được để phát hiện mất gói không, hay bạn phải đổi cách phát hiện?
4. Cơ chế "gửi kèm N mẫu gần nhất" ở mục 3.8 áp được cho input. Có áp được cho **sự kiện mở rương** không? Nếu có thì N bằng bao nhiêu, và nếu không thì đặc tính nào của sự kiện làm nó không áp được?
5. Người chơi đặt 200 bức tường trong 10 giây. Tất cả đều reliable-ordered. Một packet ở giữa bị mất trên đường mạng 4G. Mô tả chính xác chuyện gì xảy ra với 199 bức còn lại trong thời gian chờ, và con số nào ở mục 3.7 quyết định thời gian đó.
6. **Câu khó nhất:** bạn quyết định cho mỗi loại message một kênh riêng, mỗi kênh có sequence và cửa sổ ack độc lập, để một message reliable bị kẹt không chặn kênh khác — đúng tinh thần multi-stream của QUIC. Nhưng bây giờ hai message ở hai kênh khác nhau **không còn thứ tự xác định giữa chúng**: "tường được đặt tại ô X" đi kênh reliable, còn "quái vật đang đứng ở ô X" đi kênh snapshot, và client có thể xử lý cái sau trước cái trước. Câu hỏi: **tồn tại một thứ tự đúng giữa hai kênh không, hay khái niệm "đúng thứ tự" chỉ có nghĩa bên trong một kênh?** Nếu bạn định gắn tick number vào mọi message để sắp lại, hãy trả lời tiếp: client làm gì trong khoảng thời gian nó **đã có** message của tick 1.000 ở kênh này nhưng message của tick 990 ở kênh kia còn chưa tới — và cách xử lý đó có khác gì head-of-line blocking mà mục 3.1 nói bạn đang trốn không?

---

## 7. Tóm tắt

- **UDP không hứa gì, và đó là tính năng.** Giá trị của tầng tự viết không phải "làm tốt hơn TCP" mà là **chọn mức đảm bảo riêng cho từng loại message**. Không tận dụng quyền đó thì đừng tự viết — bạn chỉ đang cài lại TCP, kèm cả head-of-line blocking mà bài 12 đã bảo bạn bỏ.
- **Ba mức**: unreliable-unsequenced (hiệu ứng, ping) · unreliable-sequenced (snapshot, input) · reliable-ordered (chat, sự kiện đổi trạng thái, kết quả trận). Quy tắc chọn: **gói sau thay thế được gói này thì đừng đảm bảo gói này**.
- Bộ lọc sequenced không phải chi tiết nhỏ: ở jitter ±50 ms với 60 packet/giây, **24,681% packet tới sau một packet mới hơn nó**. Một phép so sánh dập tắt toàn bộ hiện tượng giật ngược đó.
- **Header 8 byte**: `Seq` uint16 + `Ack` uint16 + `AckBits` uint32. Phụ phí 9,6% trên ngân sách 10 KB/s mỗi player của bài 8.
- **Ack từng gói làm phồng tỉ lệ gửi lại**: loss 5,09% → tưởng mất 9,57% (**1,88×**); loss 20,10% → 33,39% (1,66×). **Ack bitfield 33 đưa về đúng 1,00× ở cả ba mức, mất oan = 0/100.000** — vì mất thông tin cần **33 ack liên tiếp bị mất**, xác suất 8,6 × 10⁻²⁴ ở loss 20%. Cửa sổ 64 bit gần như không mua thêm gì.
- `uint16` wrap sau **18 phút 12 giây** ở 60 Hz. `a > b` sai **5.050 / 6.553.600 cặp**, `seqGreaterThan` sai 0. Phép **trừ** uint16 vẫn đúng, chỉ **so sánh** là sai. Nửa vòng = **9 phút 6 giây** im lặng là trần cứng của thuật toán.
- **RTO Jacobson–Karels** hội tụ **53,01 ms** cho RTT 40 ms jitter ±6, nhưng **122,80 ms** cho cùng RTT với jitter ±30 — chênh 2,3 lần: biên `4 × RTTVAR` bảo hiểm cho **dao động**, không phải cho độ trễ. Một spike 200 ms đẩy RTO lên 229,60 và cần **800 ms** để về lại.
- **Dữ liệu hết hạn thì đừng gửi lại**: bản gửi lại của một snapshot tới nơi ở t = 73 ms, khi đã có **1,46 snapshot mới hơn** — chính bộ lọc sequenced của bạn sẽ vứt nó. Với input, **gửi kèm 3 mẫu tốn 720 B/s (7,2%)** và bù trước khi phát hiện mất. Gửi lại thì cấp `Seq` mới và **không lấy mẫu RTT từ packet đã gửi lại** (Karn).
- Tín hiệu ngắt kết nối duy nhất đáng tin là **thời gian kể từ packet cuối NHẬN được** — `sendto` thành công không chứng minh gì cả. Keepalive 100–200 ms, cảnh báo ở 1 s, ngắt ở 5 s.
- **Mặc định là đừng tự viết.** QUIC, KCP, ENet, Steam Networking đã có sẵn. Tự viết khi cần kiểm soát chính xác từng byte, khi nền tảng không có lựa chọn, hoặc để học. Lý do "tự viết cho nhẹ" đúng ở tuần đầu và sai ở tháng thứ ba.

→ **Bài 15 — Giới hạn vật lý của gói tin**: có giao thức rồi, có đảm bảo rồi. Nhưng gói tin vẫn phải chui qua một hạ tầng có kích thước tối đa, và vượt nó thì mọi tính toán ở trên sai hết.
