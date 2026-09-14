# Bài 15 — Giới hạn vật lý của gói tin: MTU, loss, jitter

## 1. Mục tiêu

Sau bài này bạn có thể:

- **Tự dẫn ra mốc ~1200 byte** bằng cách trừ dần từ 1500, thay vì chép một con số từ blog.
- Tính **xác suất một gói bị cắt mảnh tới nơi nguyên vẹn** là `(1−p)^N`, và chỉ ra vì sao "loss 5%" của hạ tầng có thể là loss 14,3% của bạn.
- Giải thích vì sao **snapshot phải tự giới hạn kích thước**, và chuyện gì xảy ra nếu để tầng IP lo hộ.
- Đọc **phân phối kích thước packet p50/p99/max** và nói ngay bug băng thông đang ở đâu, trước khi người chơi phàn nàn.
- **Phân biệt packet loss, jitter và bandwidth** qua triệu chứng, và không chữa nhầm bệnh.
- Nói rõ chỗ mô hình "mất độc lập" **sai so với mạng thật**, và sai theo hướng nào.

---

## 2. Triệu chứng

Hai cụm game node, cùng một binary, chỉ khác vùng. Monitoring mạng báo hai con số y hệt nhau: **packet loss 5,0%** ở cả hai.

Cụm A không có ticket nào. Cụm B thì người chơi mô tả bằng đúng một từ: *giật*; tỉ lệ rời trận giữa chừng cao hơn hẳn, và ngồi chơi thử thì đúng là không chơi nổi. Bạn soi mọi thứ quen thuộc: CPU tick p99 bằng nhau, RTT bằng nhau, GC bằng nhau, không một dòng log lỗi, cùng một hàm `buildSnapshot`.

Khác biệt duy nhất tìm được nằm ở một metric bạn mới thêm hôm qua — **kích thước gói snapshot**:

```
cụm A   p50  508 B   p99 1100 B   max 1180 B
cụm B   p50  508 B   p99 1468 B   max 3148 B
```

Cùng một hàm, nhưng cụm B có một con boss kéo 260 entity vào chung một khung nhìn. Và gói 3148 byte đó, trên đường đi, **không còn là một gói nữa**.

Với gói 3148 byte, xác suất tới nơi nguyên vẹn ở loss 5% là **85,74%** — tức mất thật **14,26%**, gấp **2,85 lần** con số monitoring báo. Quy ra thứ người chơi cảm thấy, ở snapshot 20 Hz với buffer nội suy 100 ms (bài 8):

| | cụm A (p = 5%) | cụm B (p = 14,26%) |
|---|---|---|
| Snapshot mất mỗi giây | 1,0 | 2,85 |
| **Mất hai gói liên tiếp** (= thủng buffer) | 0,05 lần/s | 0,407 lần/s |
| Quy ra mỗi phút | **3 lần** | **24,4 lần** |

Cùng một hạ tầng, cùng một con số trên dashboard, **8,14 lần số lần giật**. Toàn bộ khác biệt nằm ở kích thước gói.

---

## ⏸ Dừng lại — đoán trước #1

**Một gói UDP 3.148 byte gửi qua Ethernet MTU 1500. Điều gì xảy ra?** Chọn trước khi đọc tiếp.

```
(a) Lỗi ngay khi gọi sendto — kernel từ chối gói quá lớn
(b) Kernel cắt thành nhiều mảnh IP, bên kia ghép lại; ứng dụng không biết gì
(c) Gói bị cắt thành nhiều datagram UDP độc lập, app phải tự ghép
(d) Router trên đường tự nén gói xuống cho vừa
```

Câu phụ, quan trọng hơn câu chính: nếu đáp án là "bên kia ghép lại", thì **ghép lại được trong bao nhiêu phần trăm trường hợp**?

---

## 3. Lý thuyết

### 3.1 Trừ dần từ 1500 — con số 1200 ở đâu ra

Đáp án là **(b)**: kernel cắt thành nhiều *mảnh IP* (fragment), không phải nhiều datagram. Phía nhận ghép lại rồi mới đưa lên tầng ứng dụng — **hoặc không đưa gì cả**. Mục 3.2 là phần "hoặc không".

Ngưỡng cắt nằm ở đâu? Bắt đầu từ MTU Ethernet, **1500 byte**.

| Bước | Trừ | MTU/payload còn lại |
|---|---|---|
| Ethernet | — | **1500** |
| − header IPv4 (20) − header UDP (8) | 28 | **1472** byte payload |
| − header IPv6 (40) − UDP (8) | 48 | **1452** byte payload |
| PPPoE (cáp quang dân dụng nhiều nơi) − 8 | 8 | MTU 1492 → **1464** payload IPv4 |
| PPPoE + IPv6 | | **1444** |
| WireGuard (20 IP + 8 UDP + 32 wg = 60) | 60 | MTU 1440 → **1412** payload IPv4 |
| WireGuard **trên** PPPoE | 68 | **1404** |
| IPSec ESP (~73) trên PPPoE, IPv6 | 121 | **1371** |

Người chơi của bạn không ngồi trên Ethernet sạch: PPPoE, VPN công ty, app "tăng tốc game" thực chất là một tunnel, 4G có tunnel GTP. **Mỗi lớp đục thêm vài chục byte, và bạn không biết họ có mấy lớp.**

<svg viewBox="0 0 700 250" role="img" aria-labelledby="gs15-a-t gs15-a-d" style="width:100%;height:auto">
<title id="gs15-a-t">Payload còn lại sau khi trừ dần các lớp header</title>
<desc id="gs15-a-d">Sáu thanh ngang tỉ lệ theo byte: Ethernet 1500, IPv4 và UDP còn 1472, PPPoE còn 1464, WireGuard trên PPPoE còn 1404, IPSec ESP trên PPPoE và IPv6 còn 1371, và mốc an toàn 1200 nằm dưới tất cả.</desc>
<text x="12" y="22" font-size="12" font-weight="bold" fill="currentColor">Payload UDP còn lại — trừ dần từ MTU 1500</text>
<rect x="110" y="34" width="560" height="20" rx="3" fill="#64748b" fill-opacity="0.30"/>
<text x="104" y="49" text-anchor="end" font-size="10" fill="currentColor">Ethernet</text>
<text x="678" y="49" text-anchor="end" font-size="10" font-weight="bold" fill="currentColor">1500</text>
<rect x="110" y="64" width="549.6" height="20" rx="3" fill="#3b82f6" fill-opacity="0.30"/>
<text x="104" y="79" text-anchor="end" font-size="10" fill="currentColor">+ IPv4/UDP</text>
<text x="655" y="79" text-anchor="end" font-size="10" fill="currentColor">1472</text>
<rect x="110" y="94" width="546.6" height="20" rx="3" fill="#3b82f6" fill-opacity="0.30"/>
<text x="104" y="109" text-anchor="end" font-size="10" fill="currentColor">+ PPPoE</text>
<text x="652" y="109" text-anchor="end" font-size="10" fill="currentColor">1464</text>
<rect x="110" y="124" width="524.2" height="20" rx="3" fill="#f59e0b" fill-opacity="0.32"/>
<text x="104" y="139" text-anchor="end" font-size="10" fill="currentColor">+ WireGuard</text>
<text x="630" y="139" text-anchor="end" font-size="10" fill="currentColor">1404</text>
<rect x="110" y="154" width="511.8" height="20" rx="3" fill="#ef4444" fill-opacity="0.32"/>
<text x="104" y="169" text-anchor="end" font-size="10" fill="currentColor">+ IPSec/IPv6</text>
<text x="618" y="169" text-anchor="end" font-size="10" fill="currentColor">1371</text>
<rect x="110" y="184" width="448" height="20" rx="3" fill="#84cc16" fill-opacity="0.40"/>
<text x="104" y="199" text-anchor="end" font-size="10" font-weight="bold" fill="currentColor">chọn 1200</text>
<text x="554" y="199" text-anchor="end" font-size="10" font-weight="bold" fill="currentColor">1200</text>
<line x1="558" y1="30" x2="558" y2="212" stroke="currentColor" stroke-opacity="0.55" stroke-width="1.5" stroke-dasharray="4 3"/>
<text x="564" y="228" font-size="10" font-style="italic" fill="currentColor">biên an toàn — mọi lớp tunnel phổ thông đều nằm bên phải vạch này</text>
</svg>

Có một mốc cứng thật, không phải kinh nghiệm: **IPv6 bắt buộc mọi link chuyển được gói 1280 byte.** Trừ 40 IPv6 + 8 UDP còn **1232 byte** — sàn được chuẩn bảo đảm. Chọn **1200** là lấy 1232 rồi chừa 32 byte cho header của chính giao thức bạn (sequence, ack bitfield của bài 14, channel id, timestamp). Cũng đúng là con số QUIC chọn: đặc tả yêu cầu đường đi phải chuyển được datagram UDP **1200 byte** trước khi cho phép gửi lớn hơn.

> **1200 không phải con số thiêng. Nó là 1280 (sàn IPv6) − 48 (header) − 32 (chừa cho mình).** Biết cách dẫn ra thì bạn tự điều chỉnh được khi header của bạn to hơn.

Giới hạn của mốc này, nói rõ luôn: 1200 là *an toàn*, không phải *tối ưu*. Giữa hai datacenter bạn kiểm soát cả đường đi thì 1472 hoặc jumbo frame 9000 đều dùng được. Chỉ trên Internet mở tới máy người lạ mới phải xuống 1200.

### 3.2 Cắt mảnh là nhân xác suất mất gói

Trục chính của bài. Gói bị cắt thành **N mảnh**; bên nhận muốn ghép lại phải có **đủ cả N**. Thiếu một mảnh là vứt cả datagram — tầng ứng dụng không nhận được gì, kể cả dữ liệu của những mảnh đã tới.

Giả sử mỗi mảnh mất độc lập với xác suất `p`:

```
P(tới nơi nguyên vẹn) = (1 − p)^N
P(mất)                = 1 − (1 − p)^N
```

Mỗi ô dưới đây là **xác suất mất thật của một gói**, tính bằng `1 − (1−p)^N`:

| p ↓ \ N → | 1 | 2 | 3 | 5 | 10 |
|---|---|---|---|---|---|
| **1 %** | 1,00 % | 1,99 % | 2,97 % | 4,90 % | 9,56 % |
| **5 %** | 5,00 % | 9,75 % | **14,26 %** | 22,62 % | 40,13 % |
| **10 %** | 10,00 % | 19,00 % | 27,10 % | 40,95 % | 65,13 % |

Đọc bảng theo hàng, không theo ô. Ở p = 5%, đi từ N = 1 sang N = 3 thì tỉ lệ mất **nhân 2,85 lần**; sang N = 10 thì nhân **8,03 lần** — mất hai gói trên năm.

Ô 14,26% chính là cụm B ở mục 2: gói 3.148 byte chia cho payload 1472 ra `ceil(3148 / 1472) = 3` mảnh.

Hai điều dễ bỏ sót. **Một:** cái nhân lên không phải chi phí băng thông mà là **xác suất hỏng** — gói to gấp 3 thì tốn băng thông gấp 3, chuyện đó ai cũng đoán được; nó mất **gấp 2,85 lần** thì không ai đoán. **Hai:** monitoring hạ tầng đo loss trên dây, tức đếm mảnh, nên nó vẫn báo trung thực 5%. Con số 14,26% chỉ tồn tại ở tầng ứng dụng của bạn, và **chỉ khi bạn tự đo**.

Hai khoản phạt kèm theo, ít người biết. **Một:** thiếu mảnh thì phía nhận không vứt ngay mà giữ những mảnh đã tới trong hàng đợi ghép (reassembly queue) tới hết timeout — trên Linux tính bằng chục giây. Hàng đợi đó có trần; đầy thì nó bắt đầu vứt cả datagram **đáng lẽ ghép được**, tức hỏng lây sang gói khác. **Hai:** mảnh thứ hai trở đi **không mang header UDP**, nên không có port — NAT, load balancer, firewall theo luồng không biết đẩy đi đâu và chọn cách an toàn nhất là vứt. Với chúng, `p` của mảnh 2..N không phải 5% mà là 100%.

### 3.3 Hệ quả: snapshot phải tự giới hạn, không được nhờ IP lo

Ghép vào thứ bài 14 vừa dựng: bạn đã có sequence number và ack bitfield, biết gói nào mất. Cám dỗ tự nhiên là *"cứ gửi 3 KB, mất thì retransmit."*

Tính cái giá. Snapshot 20 Hz, RTT 40 ms. Gói mất thì sớm nhất bạn biết là sau **1 RTT = 40 ms**, gửi lại thêm nửa RTT = 20 ms, tổng **60 ms** — trong khi snapshot *kế tiếp* chỉ cách 50 ms và mang state **mới hơn**.

> Gửi lại snapshot cũ luôn tới sau snapshot mới. **Snapshot không đáng retransmit** — đó là lý do bài 14 tách "reliable-ordered" cho message rời rạc và "unreliable-sequenced" cho snapshot. Cắt mảnh thì ép bạn trả giá reliable mà không được gì.

Nên đường duy nhất còn lại là **không bao giờ để snapshot vượt ngưỡng**. Cụ thể:

```go
const maxPayload = 1200  // budget cứng, không phải gợi ý

buf := w.buf[:0]
buf = appendHeader(buf, tick, lastAckedSeq)
for _, e := range candidates {           // đã sắp theo độ ưu tiên
    if len(buf)+e.WireSize() > maxPayload {
        w.deferred = append(w.deferred, e) // để tick sau
        break
    }
    buf = e.AppendTo(buf)
}
```

Ba câu hỏi thiết kế mà đoạn trên vừa ép bạn trả lời, cả ba đều là bài riêng:

1. **`candidates` lấy từ đâu?** Chỉ những gì người chơi này nhìn thấy — **Area of Interest**, bài 26. Cắt được nhiều nhất, vì nó cắt theo *số entity* chứ không theo *số byte mỗi entity*.
2. **Sắp theo tiêu chí nào?** Người đang bắn nhau quan trọng hơn cái cây đằng xa — **priority accumulator**, bài 27.
3. **`e.WireSize()` sao cho nhỏ?** Quantize float32 xuống int16, góc 1 byte, bit packing — bài 24.

Thứ tự đó cũng là thứ tự nên làm: **AOI trước, priority sau, serialization cuối**. Cắt số entity từ 260 xuống 40 thắng mọi thủ thuật nén trên 260 entity.

Điều quan trọng nhất của mục này là chiều của mũi tên nhân quả:

> Không phải "tối ưu băng thông rồi tiện thể gói vừa MTU". Mà là **MTU là ràng buộc cứng, và nó chính là lý do AOI với priority tồn tại.** Gói không vừa thì mọi tính toán ngân sách ở bài 8 sai hết, vì bảng đó giả định gói tới nơi.

---

## ⏸ Dừng lại — đoán trước #2

Đội cho rằng 1200 là "phí" và nâng ngưỡng lên 1440. Metric kích thước snapshot sau đó:

```
p50  520 B      p99  1440 B      max  1460 B
```

Không gói nào chạm 1472; bắt gói trên máy bạn cũng không thấy phân mảnh.

**Nhưng có một nhóm người chơi báo giật hơn hẳn phần còn lại, và họ rải khắp nơi chứ không tụ một vùng. Vì sao?**

```
(a) Máy họ yếu, render không kịp
(b) Họ dùng Wi-Fi thay vì dây
(c) Đường đi của họ có MTU nhỏ hơn 1500, nên 1440 byte vẫn bị cắt
(d) Metric của bạn đo sai — nó đo payload, chưa cộng header
```

Có **hai** đáp án đúng, và chúng là một vấn đề nhìn từ hai phía.

---

### 3.4 Đo trước, đừng đoán — và đo cái gì

Hai đáp án đúng là **(c)** và **(d)**, và chúng là cùng một chuyện: **bạn đo một thứ, mạng thì cắt theo thứ khác.** (d): 1460 byte payload + 8 UDP + 20 IPv4 = **1488 byte trên dây** — vừa khít 1500, trên máy bạn không phân mảnh thật. (c): người chơi ngồi sau WireGuard trên PPPoE có trần payload **1404**; gói 1440 của bạn bị cắt thành **2 mảnh**, và theo bảng mục 3.2 thì loss của họ là **9,75%** thay vì 5%. Người sau IPSec/IPv6 trần **1371** cũng vậy. Họ rải khắp nơi vì thứ quyết định không phải vùng địa lý mà là **nhà mạng và VPN của từng người**.

Tức là **giữa 1200 và 1472 là một vùng xám**: không tái hiện được trên máy bạn, không tái hiện trong staging, bug report chỉ ghi "thỉnh thoảng giật". Vài chục byte mỗi gói là giá của sự tái hiện được.

Metric vì thế phải đo **byte trên dây**, và đo bằng phân vị:

```go
// mỗi lần gửi, sau khi đã dựng xong buffer
sizeHist.Observe(float64(len(buf) + udpIPOverhead))  // 28 với IPv4, 48 với IPv6
```

Đọc ba con số theo đúng vai trò của chúng:

| Chỉ số | Nói lên điều gì | Báo động khi |
|---|---|---|
| **p50** | chi phí băng thông thường ngày → ra hoá đơn | tăng dần theo tuần mà không ai đổi gì |
| **p99** | **kích thước lúc đông** — lúc gameplay quan trọng nhất | **> 1200 byte** |
| **max** | tệ nhất mà code của bạn có thể sinh ra | > 1200 **là bug, không phải cảnh báo** |

Vì sao p99 mới là chỉ số thật: p50 mô tả lúc đi bộ trong rừng vắng, **p99 mô tả lúc 20 người đánh nhau giữa bản đồ** — đúng lúc mất một gói là thấy ngay. Cụm A và B ở mục 2 có p50 **y hệt nhau: 508 byte**.

> **p99 vượt 1200 byte là bạn đã có bug băng thông rồi, chỉ là chưa biết.** Nó sẽ tự lộ ra vào đúng ngày đông người nhất.

Kèm hai metric nữa: **bytes/player/giây** (bài 27 quy ra hoá đơn) và **tỉ lệ gói vượt ngưỡng** — cái sau server đếm thẳng từ `len(buf) > mtu`.

### 3.5 Bảng ở trên là bản ĐƠN GIẢN HOÁ — mạng thật không mất độc lập

Bảng `(1−p)^N` ở mục 3.2 đứng trên một giả định: mỗi mảnh mất **độc lập**. Mạng thật không như thế. Mất gói đến **theo cụm**: hàng đợi router đầy thì nó vứt một chuỗi gói liên tiếp, sóng Wi-Fi nhiễu một nhịp thì cả loạt đi, chuyển cell 4G thì mất một mảng.

Trực giác đầu tiên là *"mất theo cụm thì tệ hơn, nên bảng trên còn lạc quan"*. Đem chạy thử xem.

Mô phỏng Gilbert–Elliott: hai trạng thái Tốt/Xấu, ở Xấu thì mất hết, độ dài cụm trung bình 8 gói, tham số chỉnh để **tỉ lệ mất tổng thể đúng 5%** (đo lại được 4,83–5,22% tuỳ lần chạy). 400.000 gói mỗi hàng:

| N mảnh | Nguyên vẹn — mô hình độc lập | Nguyên vẹn — mô phỏng cụm |
|---|---|---|
| 1 | 95,00 % | 95,17 % |
| 3 | 85,74 % | **93,72 %** |
| 5 | 77,38 % | 92,56 % |
| 10 | 59,87 % | **89,39 %** |

Trực giác sai, và sai theo hướng ngược hẳn. Lý do thì hiển nhiên khi đã thấy: các mảnh của **cùng một datagram được gửi liên tiếp cách nhau vài micro giây**. Mất theo cụm nghĩa là chúng có số phận giống nhau — hoặc cùng qua, hoặc cùng chết. Mà "cùng chết" thì chỉ hỏng đúng một gói, y như N = 1.

Đây là mệnh đề toán học, không phải quan sát may rủi: với cùng một `p` mỗi mảnh, **mọi tương quan dương đều làm `P(nguyên vẹn)` tăng**, và cực đoan — tương quan hoàn hảo — cho đúng `1 − p` bất kể N. Nghĩa là:

> Bảng `(1−p)^N` là **chặn trên của thiệt hại**, không phải ước lượng trung thực. Nó cho biết fragmentation **tệ nhất** có thể tệ tới đâu.

Vậy có nên nhẹ nhõm không? Không, và đây mới là phần đáng nhớ. Cùng bộ mô phỏng đó, nhìn sang **hình dạng** của mất mát thay vì tổng lượng — 2 triệu gói mỗi cột, cả hai đều ~5%:

| | Mất độc lập 5% | Mất theo cụm 5% |
|---|---|---|
| Số **đợt** mất | 94.746 | **12.551** |
| Độ dài đợt trung bình | 1,05 gói | **8,04 gói** |
| Đợt dài ≥ 3 gói liên tiếp | 0,22 % | **76,98 %** |
| Đợt dài nhất | 4 gói | **99 gói** |
| Quy ra ở snapshot 20 Hz: p99 của một lần đứt | **100 ms** | **1.750 ms** |

<svg viewBox="0 0 720 210" role="img" aria-labelledby="gs15-b-t gs15-b-d" style="width:100%;height:auto">
<title id="gs15-b-t">Cùng 5% mất gói, hai hình dạng khác nhau</title>
<desc id="gs15-b-d">Hai hàng bốn mươi ô đại diện bốn mươi gói liên tiếp. Hàng trên mất rải rác hai ô đơn lẻ, buffer nội suy che được. Hàng dưới mất tám ô liền nhau tạo một khoảng đứt bốn trăm mili giây mà không buffer nào che nổi.</desc>
<text x="12" y="20" font-size="12" font-weight="bold" fill="currentColor">40 snapshot liên tiếp ở 20 Hz — cả hai hàng đều mất trung bình 5%</text>
<text x="12" y="48" font-size="10" fill="currentColor">mất ĐỘC LẬP</text>
<text x="12" y="62" font-size="9" fill="currentColor" opacity="0.7">buffer 100 ms che được</text>
<text x="12" y="126" font-size="10" fill="currentColor">mất theo CỤM</text>
<text x="12" y="140" font-size="9" fill="currentColor" opacity="0.7">không buffer nào che nổi</text>
<g>
<rect x="140" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="154" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="168" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="182" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="196" y="36" width="12" height="26" rx="2" fill="#ef4444" fill-opacity="0.55"/>
<rect x="210" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="224" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="238" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="252" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="266" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="280" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="294" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="308" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="322" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="336" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="350" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="364" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="378" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="392" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="406" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="420" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="434" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="448" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="462" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="476" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="490" y="36" width="12" height="26" rx="2" fill="#ef4444" fill-opacity="0.55"/>
<rect x="504" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="518" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="532" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="546" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="560" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="574" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="588" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="602" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="616" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="630" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="644" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="658" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="672" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="686" y="36" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
</g>
<text x="202" y="80" text-anchor="middle" font-size="9" fill="currentColor">đứt 100 ms</text>
<text x="496" y="80" text-anchor="middle" font-size="9" fill="currentColor">đứt 100 ms</text>
<g>
<rect x="140" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="154" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="168" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="182" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="196" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="210" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="224" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="238" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="252" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="266" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="280" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="294" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="308" y="114" width="12" height="26" rx="2" fill="#ef4444" fill-opacity="0.55"/>
<rect x="322" y="114" width="12" height="26" rx="2" fill="#ef4444" fill-opacity="0.55"/>
<rect x="336" y="114" width="12" height="26" rx="2" fill="#ef4444" fill-opacity="0.55"/>
<rect x="350" y="114" width="12" height="26" rx="2" fill="#ef4444" fill-opacity="0.55"/>
<rect x="364" y="114" width="12" height="26" rx="2" fill="#ef4444" fill-opacity="0.55"/>
<rect x="378" y="114" width="12" height="26" rx="2" fill="#ef4444" fill-opacity="0.55"/>
<rect x="392" y="114" width="12" height="26" rx="2" fill="#ef4444" fill-opacity="0.55"/>
<rect x="406" y="114" width="12" height="26" rx="2" fill="#ef4444" fill-opacity="0.55"/>
<rect x="420" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="434" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="448" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="462" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="476" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="490" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="504" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="518" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="532" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="546" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="560" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="574" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="588" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="602" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="616" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="630" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="644" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="658" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="672" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
<rect x="686" y="114" width="12" height="26" rx="2" fill="#84cc16" fill-opacity="0.35"/>
</g>
<line x1="308" y1="150" x2="418" y2="150" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5"/>
<text x="363" y="166" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">đứt 400 ms liền một mạch</text>
<text x="140" y="192" font-size="10" font-style="italic" fill="currentColor">Cùng một con số 5% trên dashboard. Thứ người chơi cảm thấy khác hẳn nhau.</text>
</svg>

Bảy mươi bảy phần trăm số đợt mất là **ba gói trở lên**. Buffer nội suy 100 ms ở 20 Hz chỉ đệm được hai snapshot: che được một gói mất, không che được ba. Cái đuôi 99 gói liên tiếp là **gần 5 giây** không tin gì từ server.

> Cụm hoá **không làm tổng số gói mất tăng lên. Nó gom hết thiệt hại vào vài khoảnh khắc** — và trong hệ real-time, một lần đứt 400 ms tệ hơn nhiều so với tám lần đứt 50 ms rải rác, dù cùng tám gói.

Kết luận thực dụng của cả 3.2 lẫn 3.5 vẫn là một: **đừng cắt mảnh.** Không phải vì `(1−p)^N` mô tả đúng mạng thật, mà vì (a) đó là chặn trên và bạn không biết mạng của từng người chơi nằm ở đâu giữa hai thái cực, và (b) phạt reassembly queue cùng chuyện mảnh 2..N bị NAT vứt **không phụ thuộc tương quan gì cả**.

*(Tham số mô phỏng do tôi chọn: cụm dài 8 gói là giá trị hợp lý cho Wi-Fi/di động, không phải hằng số đo từ mạng thật. Cái đáng mang đi là hướng của hiệu ứng, không phải chữ số.)*

### 3.6 Path MTU Discovery — và vì sao đừng trông cậy vào nó

Phản đối hợp lý: *"sao phải đoán? Có PMTUD để dò MTU thật của đường đi mà."*

Cơ chế đúng là có. Bạn đặt cờ **Don't Fragment** trên gói IP; router nào không chuyển nổi sẽ **không cắt** mà trả về ICMP *"Fragmentation Needed"* kèm MTU nó chịu được; bạn hạ kích thước rồi gửi lại. Gọn gàng — trên giấy.

Trên Internet thật nó hỏng, vì cả cơ chế treo vào một sợi dây: **gói ICMP phải về được tới bạn.** Mà ICMP bị chặn khắp nơi, với lý do mà người chặn không sai: firewall doanh nghiệp "drop all ICMP"; anycast/ECMP đẩy gói ICMP quay về vào **node khác** trong cụm, node đó không biết luồng nào; NAT gia đình không map ICMP về đúng máy; chống DDoS lọc ICMP để chặn amplification.

Kết quả là **PMTU black hole**: gói to đi ra, bị vứt lặng lẽ, không ICMP nào về. `sendto` vẫn trả về thành công, ack không bao giờ tới. Triệu chứng là "gói nhỏ thì chạy, gói lớn mất 100%", và chỉ với một phần người chơi.

Bản vá là **PLPMTUD**: dò bằng gói thăm dò lớn dần ở tầng ứng dụng, không cần ICMP, cái nào được ack thì nâng ngưỡng — QUIC làm đúng thế. Nhưng nó tốn gói, tốn code, tốn state, và cần đường lùi khi mạng đổi giữa chừng: điện thoại nhảy Wi-Fi sang 4G là MTU đổi ngay.

> Với game server: **chọn 1200 và đi tiếp.** Đổi lại vài chục byte mỗi gói, bạn đổi được một lớp lỗi không tái hiện nổi lấy một hằng số. PLPMTUD chỉ đáng làm khi bạn đã đo và biết băng thông là nút thắt thật — tức là sau bài 27, không phải trước.

---

## 4. Ba thứ hay bị gộp làm một

Người chơi báo "lag", đội hỗ trợ ghi "lag", ticket lên tới bạn vẫn là "lag". Nhưng có **ba bệnh khác nhau** trốn sau từ đó, và chữa bệnh này bằng thuốc của bệnh kia thì không những vô ích mà còn làm nặng thêm.

| | **Packet loss** | **Jitter** | **Bandwidth** |
|---|---|---|---|
| **Bản chất** | gói **không tới** | gói tới nhưng **lệch nhịp** | **không đủ đường** cho lượng gửi |
| Triệu chứng người chơi | nhân vật **nhảy cóc**, biến mất rồi hiện lại chỗ khác | chuyển động **giật cục, lúc nhanh lúc chậm** dù không mất gì | lag **tăng dần rồi mới mất gói**; tệ dần khi đông người |
| Đo bằng | % seq thiếu trong ack bitfield (bài 14) | **độ lệch chuẩn của khoảng cách tới** giữa hai gói liên tiếp | bytes/player/s so với đường lên thật |
| Nguyên nhân hay gặp | Wi-Fi nhiễu, **fragmentation**, hàng đợi router đầy | lập lịch Wi-Fi, buffer router, tick server trễ (bài 7) | AOI quá rộng, snapshot rate quá cao, không nén |
| Chữa bằng | giảm N về 1, gửi redundant input, delta có baseline (bài 25) | **jitter buffer** ở client (bài 20) | **AOI (26) + priority (27) + quantize (24)** |
| Chữa NHẦM thì sao | tăng buffer → chỉ làm trễ thêm, gói vẫn không tới | retransmit → gói tới **còn muộn hơn** | tăng buffer → che được vài giây rồi vỡ to hơn |

Để ý điểm chung ở hai dòng cuối: **cách chữa sai phổ biến nhất của cả ba bệnh đều là "tăng buffer nội suy"**, vì nó làm triệu chứng dịu đi ngay trong mọi trường hợp. Nó đúng với đúng một bệnh; với hai bệnh kia nó chỉ đổi "giật" lấy "chậm" rồi giấu vấn đề cho tới lúc không giấu được nữa.

Tách bệnh bằng đúng thứ bài 14 đã dựng:

```
ack bitfield thiếu nhiều seq?           → loss
seq đủ, nhưng khoảng cách tới dao động? → jitter
cả hai chỉ xấu khi đông người?          → bandwidth (hai cái trên là TRIỆU CHỨNG)
```

Dòng thứ ba là bẫy lớn nhất: thiếu băng thông **biểu hiện ra thành loss và jitter**, và bạn đi chữa loss trong khi bệnh gốc là gửi quá nhiều.

### 4.1 Jitter buffer — vì sao client phải cố tình chậm đi

Còn một câu hỏi chưa trả lời: tại sao bảng trên lại chữa jitter bằng cách **làm trễ thêm**?

Server gửi snapshot đều tăm tắp mỗi 50 ms. Mạng không giao đều:

```
server gửi :   0    50   100   150   200   250
client nhận:  12    77   118   121   244   251   (ms)
khoảng cách:      65    41     3   123     7
```

Client phải vẽ 60 khung hình mỗi giây từ dòng dữ liệu đó. Vẽ ngay khi gói tới thì chuyển động mang đúng hình dạng nhấp nhô của cột cuối: khựng 123 ms rồi vọt 7 ms. **Lệch nhịp của mạng biến thẳng thành lệch nhịp của hình ảnh.**

Cách chữa là cố tình **vẽ chậm lại một khoảng cố định**: giữ gói trong hàng đợi rồi phát ra theo nhịp đều của đồng hồ client, không theo nhịp gói tới. Tới sớm thì chờ, tới muộn thì vẫn còn trong biên. Đúng là chặng **buffer nội suy 100 ms** chiếm 55% ngân sách ở bài 8 — giờ thì rõ nó mua cái gì:

> Jitter buffer **đổi độ trễ cố định lấy sự đều nhịp**. Độ trễ thì đều và người chơi quen được; giật thì không.

Không có số mặc định đúng: đệm phải phủ **jitter p99 của chính người chơi đó**, cộng chỗ cho một gói lẻ bị mất. Ngắn quá thì hết hàng, client chỉ còn cách ngoại suy (extrapolate), và đoán sai thì nhân vật bị kéo ngược — hiệu ứng "cao su". Dài quá thì tiêu ngân sách độ trễ vô ích. Bài 20 dựng đầy đủ cả hai.

Mối nối giữa hai nửa bài nằm ở đây: **đệm đặt theo jitter, nhưng nó lại là thứ duy nhất che được loss.** Cắt mảnh làm loss tăng 2,85 lần (3.2), cụm hoá gom mất mát thành đợt dài (3.5) — cả hai ăn vào đúng cái đệm đó. Giữ gói dưới 1200 byte là cách rẻ nhất để đệm 100 ms còn đủ dùng.

---

## 5. Tính tay

**Bài 1.** Bạn quyết định ngưỡng payload dựa trên người chơi ngồi sau **6in4 tunnel** (thêm 20 byte header IPv4 bọc ngoài) và dùng IPv6 bên trong.
- Payload UDP tối đa của họ là bao nhiêu? (Gợi ý: trừ 20, rồi 40, rồi 8 từ 1500.)
- Giao thức của bạn tiêu 34 byte header riêng (seq 2, ack 4, ack bitfield 4, tick 4, channel 1, còn lại là padding và CRC). Còn bao nhiêu byte cho dữ liệu entity?
- Mỗi entity 12 byte. Nhét vừa bao nhiêu entity một gói? So với mốc 1200 thì chênh bao nhiêu entity?

**Bài 2.** Snapshot của bạn hiện p99 = 2.900 byte, hạ tầng báo loss 3%.
- N bằng bao nhiêu (payload 1472/mảnh)? Xác suất gói tới nguyên vẹn là bao nhiêu?
- Loss thực tế ở tầng ứng dụng là bao nhiêu phần trăm, và gấp mấy lần con số 3% trên dashboard?
- Bạn bật AOI và p99 xuống còn 1.150 byte. Loss thực tế còn bao nhiêu? Bạn vừa "sửa" được bao nhiêu phần trăm loss **mà không động gì tới hạ tầng mạng**?

**Bài 3.** Vẫn snapshot 20 Hz, buffer nội suy 100 ms (= 2 snapshot). Coi mỗi snapshot mất độc lập với xác suất `q`.
- Viết công thức số lần **mất hai gói liên tiếp mỗi phút** theo `q`. (Kiểm lại bằng mục 2: `q` = 5% cho ra 3 lần/phút.)
- Với `q` = 14,26%, ra bao nhiêu lần/phút?
- Nếu chuẩn chất lượng của bạn là "không quá 1 lần giật mỗi phút", `q` tối đa là bao nhiêu? Ngưỡng đó tương ứng N bằng mấy khi hạ tầng loss 5%?

---

## 6. Chuyển giao

Không có đáp án trong bài.

**Bạn làm một MMO thế giới mở.** Thường ngày mỗi người thấy 30–50 entity, snapshot ~500 byte, mọi thứ êm. Nhưng game có sự kiện **world boss: 300 người tụ vào một chỗ**, và đó là lúc người chơi quan tâm nhất, quay video nhiều nhất, và cũng là lúc hệ thống tệ nhất.

1. Ở 300 người trong tầm nhìn, snapshot đầy đủ là bao nhiêu byte với 12 B/entity? Cần chia làm mấy gói 1200 byte? Ở loss 5% thì xác suất một người chơi nhận được **toàn bộ** ảnh chụp của tick đó là bao nhiêu?
2. Câu 1 vừa cho thấy chia nhỏ thủ công **không** làm xác suất nhận-đủ tốt hơn cắt mảnh IP. Vậy điều gì mới thực sự khác giữa "app tự chia N gói" và "IP tự cắt N mảnh"? Khác biệt đó đáng bao nhiêu?
3. Với 300 entity mà mỗi gói chỉ chứa được ~97, gửi đủ mỗi tick là nhân băng thông ra lên vài lần. Nếu bạn chỉ gửi 1 gói và **xoay vòng** nhóm entity qua từng tick, mỗi entity được cập nhật bao lâu một lần ở 20 Hz? Con số đó có chấp nhận được với một cái cây không? Với một người chơi đang chém bạn thì sao?
4. Trong lúc boss đánh, hàng đợi router của người chơi 4G đầy — mất gói chuyển sang **chế độ cụm**. Theo mục 3.5, cái gì tăng lên: số gói mất, hay độ dài một lần đứt? Buffer nội suy nên đổi thế nào, và cái giá phải trả là gì?
5. Một người chơi báo giật nhưng ack bitfield của họ gần như đủ hết seq. Bệnh gì, và bạn đo thêm cái gì để xác nhận trước khi đụng vào code?
6. **Câu khó nhất:** một đồng nghiệp đề xuất giữ nguyên snapshot đầy đủ, chia thành **4 gói dữ liệu**, rồi bù bằng **Forward Error Correction**: gửi thêm **1 gói parity**, mất bất kỳ 1 trong 5 gói thì dựng lại được. Băng thông chỉ tăng 25% mà không phải hy sinh entity nào. Hãy dùng cả mục 3.2 **và** mục 3.5 để đánh giá: với mất **độc lập** 5%, sơ đồ 4+1 cho xác suất khôi phục được bao nhiêu — và với mất **theo cụm** thì con số đó đi lên hay đi xuống? Câu trả lời sẽ nói cho bạn biết điều kiện nào khiến FEC là ý hay và điều kiện nào khiến nó chỉ là 25% băng thông vứt đi.

Câu 6 đáng giá nhất: nó bắt bạn nhận ra **FEC và cụm hoá kéo về hai hướng ngược nhau**, và bảng ở mục 3.5 — cái vừa nói tin tốt — lần này là tin xấu.

---

## 7. Tóm tắt

- **Mốc 1200 byte dẫn ra được, không phải chép:** sàn IPv6 bảo đảm 1280 − 40 (IPv6) − 8 (UDP) = **1232**, chừa ~32 byte cho header giao thức của bạn. Đó cũng là con số QUIC yêu cầu.
- Payload thật: **1472** (IPv4) / **1452** (IPv6) trên Ethernet sạch; **1464** sau PPPoE; **1404** sau WireGuard trên PPPoE; **1371** với IPSec/IPv6. Bạn không biết người chơi có mấy lớp tunnel.
- **Cắt mảnh nhân xác suất mất gói**: `P(nguyên vẹn) = (1−p)^N`. Ở p = 5%, N = 3 cho loss thật **14,26% — gấp 2,85 lần**; N = 10 cho **40,13%**, gấp 8,03 lần. Monitoring hạ tầng vẫn báo trung thực 5% vì nó đếm mảnh, không đếm datagram. Cộng phạt: hàng đợi reassembly bị chiếm chỗ, và mảnh 2..N không có port UDP nên NAT/firewall theo luồng hay vứt thẳng.
- **Snapshot không đáng retransmit**: phát hiện mất 40 ms, gửi lại 20 ms nữa, trong khi snapshot mới chỉ cách 50 ms. Nên snapshot **phải tự giới hạn kích thước** — đó chính là lý do AOI (26) và priority (27) tồn tại, theo thứ tự AOI → priority → quantize.
- **Đo p99, không đo trung bình.** Cụm A và B ở mục 2 có p50 bằng nhau đúng 508 byte; khác biệt chỉ hiện ở p99. **p99 > 1200 byte là đã có bug, chỉ là chưa biết**; max > 1200 là bug chắc chắn.
- Mô hình mất độc lập là **ĐƠN GIẢN HOÁ**. Mô phỏng cụm (độ dài trung bình 8 gói, cùng 5% tổng thể) cho N = 10 sống sót **89,39%** thay vì 59,87% — `(1−p)^N` là **chặn trên của thiệt hại**, vì các mảnh đi liền nhau nên có số phận giống nhau.
- Nhưng cụm hoá **gom thiệt hại lại**: 12.551 đợt dài trung bình 8,04 gói thay vì 94.746 đợt dài 1,05 gói; **76,98% số đợt dài từ 3 gói trở lên**; p99 một lần đứt là **1.750 ms** thay vì 100 ms. Cùng 5% trên dashboard, trải nghiệm khác hẳn.
- **PMTUD hay hỏng** vì phụ thuộc gói ICMP quay về — ICMP bị chặn ở firewall, lạc ở anycast, không map nổi qua NAT gia đình → PMTU black hole, `sendto` vẫn báo thành công. Chọn hằng số thay vì dò.
- **Ba bệnh, ba cách chữa:** loss = gói không tới, chữa bằng giảm N và redundancy; jitter = gói tới lệch nhịp, chữa bằng jitter buffer; bandwidth = không đủ đường, chữa bằng AOI/priority/quantize. **Tăng buffer nội suy làm dịu triệu chứng của cả ba nhưng chỉ chữa đúng một** — và thiếu băng thông thì biểu hiện ra thành hai bệnh kia.

→ **Bài 16 — NAT, vòng đời kết nối & phục hồi**: gói tin vừa đúng kích thước rồi. Nhưng nó còn phải tìm được đường về đúng máy người chơi — và với phần lớn người dùng Internet, máy đó không có địa chỉ để gọi tới.
