# Bài 24 — Serialization & quantization

## 1. Mục tiêu

Sau bài này bạn có thể:

- Đo **byte thật** của cùng một entity state qua bốn cách mã hoá, thay vì tin vào cảm giác "binary thì nhỏ hơn".
- Tự tính **độ phân giải** của một lưới quantization từ (dải giá trị, số bit), và nói được nó **đủ hay không đủ** bằng cách so với quãng đường một tick.
- Chọn số bit cho từng field **theo yêu cầu hiển thị**, không theo kiểu dữ liệu có sẵn của ngôn ngữ.
- Nói ra được lượng byte mà **căn byte** làm lãng phí, và khi nào việc gói sát bit không đáng công.
- Chỉ ra vì sao **quantize state** làm hỏng simulation trong khi **quantize lúc gửi** thì không, kèm con số.
- Chọn một trong ba chiến lược **versioning schema** và nói ra cái giá của nó.
- Trả lời dứt khoát: giả định **10 byte/entity** dùng suốt course đúng ở đâu, sai ở đâu.

---

## 2. Triệu chứng

Bài 23 vừa chốt: bạn chọn full snapshot cho phần state liên tục, delta cho phần ít đổi, event reliable cho phần không được mất. Bây giờ tới lúc **biến state thành byte** và đẩy xuống dây.

Bạn có một struct entity rất bình thường — id, vị trí `x y z`, góc quay, vận tốc `vx vy`, HP, trạng thái — và `json.Marshal` nó, vì đó là thứ bạn đã làm mười năm nay:

```
{"id":40312,"x":1523.75,"y":12.5,"z":3067.25,"yaw":217.5,"vx":3.25,"vy":-1.5,"hp":87,"state":3}
```

**95 byte.** Đó là với những giá trị đẹp. Lấy 50 entity có giá trị float32 lem nhem đúng như sau vài nghìn tick simulation, `json.Marshal` cả mảng rồi chia ra: **112,7 byte/entity**.

Cùng bộ field đó, gói sát bit theo yêu cầu hiển thị thật: **13,0 byte/entity**.

Quy ra tiền. Mỗi người chơi thấy 50 entity, snapshot 20 Hz, **2.000 CCU**, egress $0,09/GB, tháng 30 ngày:

| Mã hoá | B/entity | Băng thông ra | GB/tháng | Tiền/tháng |
|---|---|---|---|---|
| JSON | 112,7 | 1,80 Gbps | 584.237 | **$52.581** |
| Bit-packed | 13,0 | 0,21 Gbps | 67.392 | **$6.065** |

**$46.516 mỗi tháng — $558.000 một năm** — là khoản chênh giữa hai cách viết cùng một struct ra dây. Không đổi gameplay, không đổi tick rate, không đổi số entity. Chỉ đổi cách xếp bit.

*(Giá egress là bậc độ lớn — thay đổi theo cloud, theo vùng và theo bậc chiết khấu. Cái đáng nhớ là tỉ số 8,7 lần, không phải chữ số đô-la.)*

Và đây mới là bài trả nợ: suốt chương 3 tới chương 6, mọi bảng băng thông đều dùng **"~10 byte/entity sau nén"** và ghi rõ là ước lượng. Bài này đo con số đó ra.

---

## ⏸ Dừng lại — đoán trước #1

Bạn nói: *"JSON to là vì nó là text. Bật gzip cho cả snapshot là xong, khỏi phải viết encoder tay."*

Đo trên chính mảng 50 entity ở trên. **gzip mức nén cao nhất** cho JSON ra bao nhiêu byte/entity, so với 13,0 của bit-packed?

```
(a) ~13 B — gzip tìm ra đúng lượng thông tin thật, hoà
(b) ~20 B — thua chút, chấp nhận được
(c) ~39 B — thua 3 lần
(d) ~70 B — gzip gần như không giúp gì
```

---

## 3. Lý thuyết

### 3.1 Bốn cách encode, đo bằng số

Đáp án là **(c)**. Nhưng trước khi tới đó, đây là toàn bộ bảng đo — chạy thật bằng Go trên cùng một entity:

| Cách mã hoá | Byte/entity | % so với JSON |
|---|---|---|
| JSON (`encoding/json`) | 95 | 100 % |
| Binary thô (`encoding/binary`, float32 cho mọi field) | 36 | 37,9 % |
| Quantized "sách giáo khoa" (vị trí int16, góc 1 B, vận tốc int8) | 13 | 13,7 % |
| Quantized đúng yêu cầu, **căn byte** | 15 | 15,8 % |
| Quantized đúng yêu cầu, **gói sát bit** (97 bit) | 13 | 13,7 % |

Ba bậc nhảy, ba nguyên nhân khác nhau:

- **95 → 36 B — bỏ phần tự mô tả.** `"x":1523.75` là 12 byte để chở giá trị mà float32 chở trong 4. Một protocol cố định giữa client và server của chính bạn không cần tên field.
- **36 → 15 B — bỏ độ chính xác không ai nhìn thấy.** Phần lớn nhất của bài.
- **15 → 13 B — bỏ khoảng trống do căn byte.** Nhỏ nhất, nhưng miễn phí.

Chú ý dòng thứ ba và dòng cuối: cùng 13 byte, nhưng độ phân giải vị trí là **62,5 mm** so với **15,6 mm** — tốt hơn 4 lần với cùng số byte. Mục 3.5 giải thích vì sao.

### 3.2 "Thì bật gzip đi" — cho bản sai chạy trước

Phản xạ đúng của một dev backend, và nó đáng được chạy thử.

```
50 entity:  JSON 5.633 B (112,7 B/ent)  |  JSON + gzip -9  1.949 B (39,0 B/ent)  |  bit-packed 650 B (13,0 B/ent)
```

gzip cắt được **65,4 %** — nhiều thật. Nhưng nó vẫn **gấp 3,0 lần** bit-packed, vì hai thứ nó không làm được:

1. gzip nén **sự lặp lại**. Nó xoá tên field lặp 50 lần rất giỏi, nhưng **không biết** rằng `1523.7513` chỉ cần 18 bit — với nó đó là 9 ký tự entropy cao.
2. gzip là **CPU trên đường tick**: 100 player × 20 Hz = 2.000 lần nén mỗi giây, để làm một việc mà encoder tay làm tốt hơn 3 lần và gần như miễn phí.

> **Nén tổng quát không thay được hiểu biết về miền.** gzip không biết bản đồ của bạn rộng 4.096 m; bạn biết. Cái biết đó đáng 26 byte/entity.

Thứ tự đúng: **quantize trước, nén sau (nếu còn muốn)**. Nén một luồng đã gói sát bit thì gần như không còn gì để nén — đó là dấu hiệu bạn đã làm đúng.

### 3.3 Quantization là gì, và tính độ phân giải

Quantization là ánh xạ một dải liên tục vào một tập số nguyên hữu hạn. Hai dòng code:

```go
// encode: [0, rng] -> [0, 2^bits - 1]
q := uint32(math.Round(v / rng * float64(uint64(1)<<bits - 1)))
// decode: ngược lại
v := float64(q) / float64(uint64(1)<<bits-1) * rng
```

Toàn bộ chất lượng nằm ở một phép chia:

> **độ phân giải = dải / 2^bits**, **sai số tối đa = độ phân giải / 2** (làm tròn về mốc gần nhất).

Bản đồ 4.096 m với `int16` — 65.536 mức:

```
4.096 m / 65.536 = 0,0625 m = 62,5 mm     sai số tối đa 31,25 mm
```

62,5 mm nghe rất nhỏ: trên nhân vật cao 1,8 m thì đó là 3,5 % chiều cao, mắt không thấy nổi. **Nhưng câu hỏi đúng không phải "nhỏ so với vật thể", mà là "nhỏ so với chuyển động".**

---

## ⏸ Dừng lại — đoán trước #2

Bài 17 đã tính: nhân vật chạy **5 m/s** ở 60 Hz đi được `5 × 0,01667 = 8,33 cm` mỗi tick.

Lưới 62,5 mm, bước đi 83,3 mm. Nhìn hai số đó, chuyện gì hỏng trước?

```
(a) Không hỏng gì — 62,5 < 83,3, mỗi tick vẫn nhảy được ít nhất một ô
(b) Nhân vật chạy nhanh sẽ giật, vì sai số 3,1 cm cộng dồn theo tốc độ
(c) Nhân vật chạy CHẬM sẽ giật, còn chạy nhanh thì không
(d) Chỉ hỏng khi hai entity đứng sát nhau dưới 6,25 cm
```

---

### 3.4 Đủ hay không đủ — so với chuyển động, không so với vật thể

Đáp án là **(c)**, và nó ngược trực giác. Ở 5 m/s, bước 83,3 mm > ô 62,5 mm: mỗi tick vị trí nhảy sang ô mới, chuyển động liên tục. Sai số 31,25 mm là **nhiễu tĩnh** — nó có, nhưng bị chôn dưới chuyển động.

Ở tốc độ thấp thì ngược lại. Đi bộ 1 m/s: bước một tick là 16,7 mm, **nhỏ hơn ô lưới**. Vị trí quantized đứng yên ba, bốn tick rồi nhảy một phát 62,5 mm. Interpolation (bài 20) nhận chuỗi *đứng — đứng — đứng — giật* và không làm mượt được, vì nó đang nội suy đúng cái nó nhận.

> **Tốc độ ngưỡng = độ phân giải / khoảng thời gian giữa hai mẫu.** Chậm hơn ngưỡng thì chuyển động thành bậc thang.

| Dải × bit | Độ phân giải | Sai số tối đa | Ngưỡng @ tick 16,67 ms | Ngưỡng @ snapshot 50 ms |
|---|---|---|---|---|
| 4.096 m × 16 bit | 62,500 mm | 31,25 mm | **3,750 m/s** | 1,250 m/s |
| 4.096 m × 18 bit | 15,625 mm | 7,81 mm | 0,938 m/s | 0,312 m/s |
| 4.096 m × 20 bit | 3,906 mm | 1,95 mm | 0,234 m/s | 0,078 m/s |
| 1.024 m × 16 bit | 15,625 mm | 7,81 mm | 0,938 m/s | 0,312 m/s |

Dòng đầu là kết luận: **`int16` cho bản đồ 4.096 m là không đủ.** Ngưỡng 3,75 m/s nằm ngay giữa dải tốc độ gameplay — đi bộ, đi lom khom, bị làm chậm, đẩy lùi, trôi trên băng đều dưới nó. Tính theo nhịp snapshot 20 Hz thì dịu hơn (1,25 m/s) nhưng vẫn ăn vào tốc độ đi bộ.

Hai cách thoát tương đương về số học — dòng 2 và dòng 4 cho cùng 15,625 mm: **tăng bit** (18 bit cho x/z, thêm 4 bit/entity, rẻ), hoặc **thu dải** — giữ 16 bit nhưng quantize tương đối với một gốc gần thay vì gốc bản đồ. Bài này chọn cách một để bảng bit dưới đây không phụ thuộc chương sau.

### 3.5 Chọn số bit theo yêu cầu, không theo kiểu dữ liệu

Ở BE App bạn chọn `int64` vì nó "an toàn" và không ai đo. Ở đây mỗi bit thừa nhân với **số entity × số player × snapshot rate × 30 ngày**. Quy trình: với từng field, hỏi **dải thật là bao nhiêu** và **người chơi phân biệt được tới mức nào**. Số bit là hệ quả, không phải lựa chọn.

| Field | Dải thật | Độ phân giải cần | Bit | Vì sao |
|---|---|---|---|---|
| `id` | ≤ 4.096 entity/trận | 1 | **12** | Nhiều hơn số entity một trận từng có |
| `x`, `z` | 0…4.096 m | ~1,5 cm | **18** ×2 | Từ bảng 3.4: ngưỡng 0,94 m/s, dưới tốc độ đi bộ |
| `y` (cao độ) | 0…512 m | ~1,5 cm | **15** | Trục đứng của bản đồ ngắn hơn 8 lần trục ngang |
| `yaw` | 0…360° | 1,4° | **8** | Xem dưới — có bẫy |
| `vx`, `vy` | −20…20 m/s | 0,16 m/s | **8** ×2 | Sai số 0,078 m/s; extrapolate 100 ms lệch 7,8 mm |
| `hp` | 0…100 | 1 | **7** | 2⁷ = 128 > 100. Bit thứ 8 để dành làm cờ |
| `state` | 8 loại | 1 | **3** | idle/walk/run/jump/crouch/attack/hit/dead |
| | | | **97 bit** | = 12,125 B |

Hai dòng đáng dừng lại:

**`hp` 7 bit.** Cái đáng nói không phải 1 bit tiết kiệm được, mà là bit thứ 8 **không mất đi, nó vào tay bạn**: một cờ `isInvulnerable` nhét vào đó tốn đúng 0 byte. Bit thừa của field này là bit rảnh của field khác — chỉ nhìn thấy khi bạn tính bằng bit.

**`yaw` 8 bit — bẫy.** `360 / 256 = 1,40625°`, sai số tối đa `0,703°`. Câu hỏi "mắt có nhận ra 1,4° không" có **hai đáp án khác nhau tuỳ yaw dùng để làm gì**:

| Yaw dùng để | Sai số quy ra | Kết luận |
|---|---|---|
| Xoay mô hình nhân vật trên màn hình | 0,7° trên một hình cao vài trăm pixel | Không ai thấy. 8 bit thoải mái |
| Hướng ngắm bắn, server raycast theo nó | ở 10 m lệch **12,3 cm** · ở 50 m lệch **61,4 cm** · ở 100 m lệch **1,23 m** | 8 bit là **sai kết quả trận đấu** |

Ở 100 m, 8 bit yaw làm viên đạn trượt qua cả thân người. Nếu server raycast bằng chính con số đã quantize (bài 21 làm đúng việc đó), bạn vừa đưa lỗi vào phần công bằng của game. Yaw 16 bit hạ sai số ở 50 m xuống **2,4 mm**, tốn thêm đúng 1 byte.

> **Cùng một field, cùng một con số, hai yêu cầu khác nhau tới 500 lần** — tuỳ nó được *nhìn* hay được *tính*. Hỏi "field này đi vào mắt hay đi vào phép toán" trước khi chọn bit.

Bảng 97 bit chọn 8 bit vì đây là entity **của người khác**, dùng để hiển thị; hướng ngắm của **chính người chơi** đi theo đường input (bài 17) và phải giữ 16 bit.

### 3.6 Bit packing — vì sao căn byte lãng phí

97 bit không chia hết cho 8. Viết mỗi field vào một số nguyên byte — cách tự nhiên nhất, và cũng là cách `encoding/binary` ép bạn làm — thì mỗi field bị làm tròn lên:

<svg viewBox="0 0 720 215" role="img" aria-labelledby="gs24-a-t gs24-a-d" style="width:100%;height:auto">
<title id="gs24-a-t">Căn byte so với gói sát bit trên cùng một tập field</title>
<desc id="gs24-a-d">Hàng trên là bố cục căn byte tốn 120 bit, phần tô đỏ nhạt là số bit bị lãng phí do làm tròn lên bội số của 8. Hàng dưới là bố cục gói sát bit tốn 97 bit cộng 7 bit đệm cuối, tổng 104 bit tức 13 byte.</desc>
<text x="15" y="30" font-size="12" font-weight="bold" fill="currentColor">Căn byte — 15 B = 120 bit (đỏ nhạt = bit lãng phí)</text>
<text x="15" y="71" font-size="11" fill="currentColor">15 B</text>
<rect x="70" y="52" width="82" height="30" rx="3" fill="#ef4444" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.35"/>
<rect x="70" y="52" width="61" height="30" rx="3" fill="#3b82f6" fill-opacity="0.35"/>
<text x="111" y="71" text-anchor="middle" font-size="10" fill="currentColor">id</text>
<text x="111" y="96" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">16</text>
<rect x="152" y="52" width="122" height="30" rx="3" fill="#ef4444" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.35"/>
<rect x="152" y="52" width="92" height="30" rx="3" fill="#3b82f6" fill-opacity="0.35"/>
<text x="213" y="71" text-anchor="middle" font-size="10" fill="currentColor">x</text>
<text x="213" y="96" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">24</text>
<rect x="274" y="52" width="122" height="30" rx="3" fill="#ef4444" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.35"/>
<rect x="274" y="52" width="92" height="30" rx="3" fill="#3b82f6" fill-opacity="0.35"/>
<text x="335" y="71" text-anchor="middle" font-size="10" fill="currentColor">z</text>
<text x="335" y="96" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">24</text>
<rect x="396" y="52" width="82" height="30" rx="3" fill="#ef4444" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.35"/>
<rect x="396" y="52" width="76" height="30" rx="3" fill="#3b82f6" fill-opacity="0.35"/>
<text x="437" y="71" text-anchor="middle" font-size="10" fill="currentColor">y</text>
<text x="437" y="96" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">16</text>
<rect x="478" y="52" width="41" height="30" rx="3" fill="#3b82f6" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.35"/>
<text x="498" y="71" text-anchor="middle" font-size="10" fill="currentColor">yaw</text>
<text x="498" y="96" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">8</text>
<rect x="519" y="52" width="41" height="30" rx="3" fill="#3b82f6" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.35"/>
<text x="539" y="71" text-anchor="middle" font-size="10" fill="currentColor">vx</text>
<text x="539" y="96" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">8</text>
<rect x="560" y="52" width="41" height="30" rx="3" fill="#3b82f6" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.35"/>
<text x="580" y="71" text-anchor="middle" font-size="10" fill="currentColor">vy</text>
<text x="580" y="96" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">8</text>
<rect x="600" y="52" width="41" height="30" rx="3" fill="#ef4444" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.35"/>
<rect x="600" y="52" width="36" height="30" rx="3" fill="#3b82f6" fill-opacity="0.35"/>
<text x="621" y="71" text-anchor="middle" font-size="10" fill="currentColor">hp</text>
<text x="621" y="96" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">8</text>
<rect x="641" y="52" width="41" height="30" rx="3" fill="#ef4444" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.35"/>
<rect x="641" y="52" width="15" height="30" rx="3" fill="#3b82f6" fill-opacity="0.35"/>
<text x="662" y="71" text-anchor="middle" font-size="10" fill="currentColor">st</text>
<text x="662" y="96" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">8</text>
<text x="15" y="130" font-size="12" font-weight="bold" fill="currentColor">Gói sát bit — 97 bit + 7 bit đệm = 104 bit = 13 B</text>
<text x="15" y="159" font-size="11" fill="currentColor">13 B</text>
<rect x="70" y="140" width="61" height="30" rx="3" fill="#84cc16" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.35"/>
<text x="101" y="159" text-anchor="middle" font-size="10" fill="currentColor">id</text>
<text x="101" y="184" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">12</text>
<rect x="131" y="140" width="92" height="30" rx="3" fill="#84cc16" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.35"/>
<text x="177" y="159" text-anchor="middle" font-size="10" fill="currentColor">x</text>
<text x="177" y="184" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">18</text>
<rect x="223" y="140" width="92" height="30" rx="3" fill="#84cc16" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.35"/>
<text x="269" y="159" text-anchor="middle" font-size="10" fill="currentColor">z</text>
<text x="269" y="184" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">18</text>
<rect x="315" y="140" width="76" height="30" rx="3" fill="#84cc16" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.35"/>
<text x="353" y="159" text-anchor="middle" font-size="10" fill="currentColor">y</text>
<text x="353" y="184" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">15</text>
<rect x="391" y="140" width="41" height="30" rx="3" fill="#84cc16" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.35"/>
<text x="412" y="159" text-anchor="middle" font-size="10" fill="currentColor">yaw</text>
<text x="412" y="184" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">8</text>
<rect x="432" y="140" width="41" height="30" rx="3" fill="#84cc16" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.35"/>
<text x="452" y="159" text-anchor="middle" font-size="10" fill="currentColor">vx</text>
<text x="452" y="184" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">8</text>
<rect x="473" y="140" width="41" height="30" rx="3" fill="#84cc16" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.35"/>
<text x="493" y="159" text-anchor="middle" font-size="10" fill="currentColor">vy</text>
<text x="493" y="184" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">8</text>
<rect x="514" y="140" width="36" height="30" rx="3" fill="#84cc16" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.35"/>
<text x="532" y="159" text-anchor="middle" font-size="10" fill="currentColor">hp</text>
<text x="532" y="184" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">7</text>
<rect x="549" y="140" width="15" height="30" rx="3" fill="#84cc16" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.35"/>
<text x="557" y="159" text-anchor="middle" font-size="10" fill="currentColor">st</text>
<text x="557" y="184" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">3</text>
<rect x="565" y="140" width="36" height="30" rx="3" fill="#64748b" fill-opacity="0.25" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 2"/>
<text x="583" y="159" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">đệm</text>
<text x="612" y="205" font-size="10" font-style="italic" fill="currentColor" opacity="0.75">tiết kiệm 2 B/entity = 13,3 %</text>
</svg>

`120 → 97 bit` là bỏ được **19,2 % số bit**. Nhưng cả gói vẫn phải kết thúc ở biên byte, nên 97 bit thành 104 bit = **13 B**, và mức tiết kiệm thực tế là **2 B trên 15 B = 13,3 %**.

Bit writer chỉ là một accumulator 64 bit và một con trỏ bit:

```go
type bw struct{ buf []byte; acc uint64; nbit uint }

func (w *bw) put(v uint32, n uint) {
	w.acc |= uint64(v) << w.nbit
	w.nbit += n
	for w.nbit >= 8 {
		w.buf = append(w.buf, byte(w.acc)); w.acc >>= 8; w.nbit -= 8
	}
}
```

Bên đọc là hàm đối xứng. Chi phí thật không phải CPU (dịch bit rẻ hơn `json.Marshal` nhiều bậc) mà là **debug**: `hexdump` hết đọc được bằng mắt, một field lệch một bit làm hỏng mọi field sau nó, nên phải có test `decode(encode(x)) == x` cho từng field ngay từ ngày đầu.

**Khi nào không đáng:** tập field ra 62 bit thì căn byte đã là 64 bit — gói sát bit tiết kiệm 0 byte và chỉ thêm một lớp bug. Tính tổng bit trước, rồi mới quyết.

---

## ⏸ Dừng lại — đoán trước #3

Bạn thấy quantization ngon quá, nên bạn làm thẳng tay: **lưu luôn state ở dạng quantized**. Vị trí trong RAM là số ô lưới 62,5 mm, không phải float. Đỡ được cả RAM lẫn một lần chuyển đổi mỗi khi gửi.

Chạy simulation 60 tick (1 giây) với ba nhân vật tốc độ 1, 3, 5 m/s. Đúng ra họ đi được 1, 3, 5 m. Thực tế đo được gì?

```
(a) 0,98 / 2,97 / 4,96 m — lệch vài cm, chấp nhận được
(b) 1,00 / 3,00 / 5,00 m — làm tròn về mốc gần nhất nên sai số triệt tiêu
(c) 0,94 / 2,94 / 4,94 m — mỗi người mất đúng nửa ô
(d) 0,00 / 3,75 / 3,75 m
```

---

### 3.7 Sai số lượng tử hoá là vĩnh viễn — và cộng dồn nếu bạn quantize state

Đáp án là **(d)**. Output thật:

```
lưới 62,5 mm, 60 tick @ 60 Hz
v=1 m/s: float 1,0000 m | state-quantized 0,0000 m  ->  0,00 m/s   (-100,0 %)
v=3 m/s: float 3,0000 m | state-quantized 3,7500 m  ->  3,75 m/s   (+25,0 %)
v=5 m/s: float 5,0000 m | state-quantized 3,7500 m  ->  3,75 m/s   (-25,0 %)
```

Ba tốc độ khác nhau, **hai kết quả**: một người đứng im vĩnh viễn, hai người còn lại chạy bằng nhau ở đúng 3,75 m/s. Số học đằng sau đơn giản tới mức khó chịu — mỗi tick bạn cộng `v·dt` vào **giá trị đã làm tròn** rồi làm tròn tiếp:

```
v=1: 16,7 mm / 62,5 = 0,267 ô  -> round -> 0 ô   -> không bao giờ nhúc nhích
v=3: 50,0 mm / 62,5 = 0,800 ô  -> round -> 1 ô   -> chạy NHANH hơn thật
v=5: 83,3 mm / 62,5 = 1,333 ô  -> round -> 1 ô   -> chạy CHẬM hơn thật
```

Mọi tốc độ bị hút về **1 ô/tick = 62,5 mm × 60 = 3,75 m/s** — chính là "tốc độ ngưỡng" ở bảng 3.4, giờ hiện ra với vai trò thứ hai: không chỉ là ngưỡng nhìn thấy bậc thang, mà là **tốc độ duy nhất simulation này còn biết chạy**.

<svg viewBox="0 0 700 250" role="img" aria-labelledby="gs24-b-t gs24-b-d" style="width:100%;height:auto">
<title id="gs24-b-t">Quãng đường sau 60 tick khi state được lưu ở dạng quantized</title>
<desc id="gs24-b-d">Ba đường nét liền là quãng đường đúng của nhân vật 1, 3 và 5 mét trên giây sau một giây. Hai đường nét đứt là kết quả khi state lưu dạng quantized: nhân vật 1 mét trên giây nằm im ở 0 mét, còn cả hai nhân vật 3 và 5 mét trên giây đều dừng ở 3,75 mét.</desc>
<line x1="70" y1="40" x2="70" y2="210" stroke="currentColor" stroke-opacity="0.4" stroke-width="1"/>
<line x1="70" y1="210" x2="650" y2="210" stroke="currentColor" stroke-opacity="0.4" stroke-width="1"/>
<text x="62" y="44" text-anchor="end" font-size="10" fill="currentColor">5 m</text>
<text x="62" y="112" text-anchor="end" font-size="10" fill="currentColor">3 m</text>
<text x="62" y="180" text-anchor="end" font-size="10" fill="currentColor">1 m</text>
<text x="62" y="214" text-anchor="end" font-size="10" fill="currentColor">0</text>
<text x="70" y="230" font-size="10" fill="currentColor">tick 0</text>
<text x="640" y="230" text-anchor="end" font-size="10" fill="currentColor">tick 60 (1 giây)</text>
<line x1="70" y1="210" x2="640" y2="40" stroke="#84cc16" stroke-width="2"/>
<text x="646" y="42" font-size="10" fill="currentColor">float 5 m/s</text>
<line x1="70" y1="210" x2="640" y2="112" stroke="#84cc16" stroke-width="2"/>
<text x="646" y="114" font-size="10" fill="currentColor">float 3 m/s</text>
<line x1="70" y1="210" x2="640" y2="180" stroke="#84cc16" stroke-width="2"/>
<text x="646" y="182" font-size="10" fill="currentColor">float 1 m/s</text>
<line x1="70" y1="210" x2="640" y2="83" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="6 4"/>
<text x="500" y="76" font-size="10" font-weight="bold" fill="currentColor">quantized state: 3 m/s VÀ 5 m/s — cùng 3,75 m</text>
<line x1="70" y1="210" x2="640" y2="210" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="6 4"/>
<text x="300" y="204" font-size="10" font-weight="bold" fill="currentColor">quantized state: 1 m/s — đứng im</text>
</svg>

Vì sao **quantize lúc gửi** thì không dính? Vì mỗi lần gửi, sai số tính lại từ giá trị float đúng, nên nó bị **chặn** ở 31,25 mm mãi mãi. Khi state *là* lưới, sai số tick này thành đầu vào tick sau — không còn là nhiễu, mà là **thiên lệch có hệ thống** cộng dồn tuyến tính theo thời gian.

> **Quantization là phép chiếu một chiều.** Chiếu để gửi thì bên nhận chịu sai số một lần. Chiếu rồi lấy kết quả chiếu làm state thì bạn đã **ghi đè sự thật**, và không có gì phục hồi lại được.

Nối với chương 3: bài 11 bỏ float để lấy determinism và dùng fixed-point Q16.16 — nghe qua cũng là "lưu state dạng số nguyên", nhưng khác hẳn ở một điểm: **Q16.16 có 65.536 mức trên mỗi mét**, độ phân giải 0,0153 mm, nhỏ hơn bước đi một tick **5.461 lần**. Nó là số nguyên **đủ mịn để làm state**; lưới 62,5 mm chỉ đủ mịn để **làm ảnh gửi đi**.

> Lưới của **transport** chọn theo *mắt người nhìn thấy gì*. Lưới của **state** chọn theo *simulation cần gì để không trôi*. Hai con số này cách nhau nhiều bậc độ lớn, và trộn chúng làm một là lỗi khó tìm nhất trong bài này — vì nó không crash, nó chỉ làm nhân vật chậm 25 %.

### 3.8 Endianness và alignment — hai cái bẫy khi tự viết encoder

Bỏ `encoding/json` là bỏ luôn hai thứ nó âm thầm lo hộ.

**Alignment.** Struct quantized ở mục 3.1 có 9 field, tổng nội dung 13 byte. Go xếp nó trong RAM:

```
unsafe.Sizeof(QuantEnt) = 14 B   |   binary.Size = 13 B   |   align = 2
```

Compiler chèn **1 byte đệm** để struct kết thúc ở biên 2 byte. Memcpy thẳng struct ra buffer — cám dỗ lớn vì nó là một lệnh — gửi 14 B thay vì 13, dư **7,7 %** (50 entity: 700 B thay vì 650 B). Tệ hơn nhiều: **byte đệm không được khởi tạo**. Nó chứa rác từ lần dùng trước của vùng nhớ, tức bạn phát nội dung RAM server ra Internet, và giá trị đổi giữa hai lần chạy — đủ để phá mọi test so byte-for-byte và mọi checksum snapshot.

Quy tắc: **không bao giờ coi bố cục struct trong RAM là định dạng dây.**

**Endianness.** Không có mặc định. Little-endian là x86 và ARM phổ thông; big-endian ("network byte order") là mặc định của giao thức Internet cổ điển và của `DataView` trong JavaScript nếu quên tham số `littleEndian`. Đọc nhầm chiều không ném lỗi nào — chỉ ra số rác:

```
uint16 0x0102  ->  LE: 02 01   BE: 01 02      đọc LE-bytes bằng BigEndian = 513 (đúng ra 258)
float32 1523.75 đọc nhầm chiều  ->  1,1088514e-38
```

Dấu hiệu nhận biết: **float đọc nhầm endian gần như luôn ra số cực nhỏ hoặc NaN**, vì mũ và mantissa bị hoán đổi. Thấy vị trí entity bằng `1e-38` thì đừng đi tìm bug ở physics — đây là chỗ client web dính nhiều nhất, vì server Go viết `binary.LittleEndian` còn `DataView` của JS mặc định big-endian. Chọn một chiều, ghi vào dòng đầu tài liệu giao thức, và có test đọc-ghi chạy trên cả hai phía.

### 3.9 Versioning schema — client cũ chưa update

Bạn vừa xoá mọi thứ tự mô tả khỏi gói tin. Lợi là 82 byte/entity; giá là **hai bên phải đồng ý tuyệt đối về bố cục bit**. Ngày bạn thêm một field, mọi client chưa update decode lệch từ field đó trở đi — không lỗi, chỉ số rác. Ở mobile thì không tránh được: store duyệt mất vài ngày, người chơi cập nhật rải rác cả tuần. Ba chiến lược, mỗi cái trả giá một chỗ:

| Chiến lược | Cách làm | Giá phải trả |
|---|---|---|
| **Version byte** | 1 byte đầu packet ghi số phiên bản; server giữ đủ N hàm decode/encode | 1 B/packet (không phải mỗi entity). Nhưng **mã nguồn phình theo số phiên bản còn sống** — mỗi bản cũ là một nhánh phải test |
| **Field tag** (kiểu protobuf) | Mỗi field mang tag của nó; bên đọc bỏ qua tag lạ | ~1 B **mỗi field mỗi entity** — với 9 field là +9 B, **gấp 1,7 lần** tổng 13 B. Xoá sạch thành quả của cả bài này |
| **Chỉ thêm, không xoá, không đổi thứ tự** | Field mới luôn nối vào cuối; bên đọc dừng khi hết byte | Miễn phí về byte. Giá là **kỷ luật vĩnh viễn**: schema chỉ lớn lên, field chết vẫn phải chiếm chỗ, và một lần lỡ chèn field vào giữa là hỏng |

Với snapshot real-time, lựa chọn thực tế gần như luôn là **version byte + chỉ thêm không xoá**, và tuyệt đối không phải field tag. Lý do là bất đối xứng tần suất: cái gì tính theo *mỗi entity* thì bị nhân lên khủng khiếp, cái gì tính theo *mỗi packet* thì gần như miễn phí — 1 byte version trên packet 684 byte chứa 50 entity là **0,15 %**.

Protobuf/JSON vẫn đúng chỗ ở **lobby, matchmaking, shop, kết quả trận, cấu hình** — những thứ đi vài lần một trận. Đừng bit-pack chúng để tiết kiệm vài KB mỗi trận rồi trả bằng thời gian debug.

---

## 4. Trả nợ con số 10 byte

Trả lời câu treo từ bài 3: **~10 byte/entity** đúng hay sai?

| Kịch bản | Bit | B/entity | So với 10 B |
|---|---|---|---|
| Full state 3D (bảng 3.5) | 97 | **13** | +30 % |
| Cộng chi phí header packet: 34 B (bài 15) chia cho 50 entity | 104 + 5,4 | **13,68** | **+36,8 %** |
| Game 2D — bỏ `y` (15 bit) | 82 | **11** | +10 % |
| 2D và bỏ luôn vận tốc, client tự extrapolate (bài 20) | 66 | **9** | −10 % |

Kết luận thẳng:

> **10 B/entity là sai với full snapshot 3D — con số thật là 13 B, dưới nó là 13,68 B khi tính cả header.** Nó đúng với game 2D, và nó rộng rãi khi delta compression bật lên.

Nhưng sai 37 % không làm hỏng kết luận nào đã dựng trên nó, và đó mới là chỗ đáng nhớ. Bảng ở bài 8 dùng 10 B để chỉ ra **nâng snapshot 20 → 60 Hz nhân ba hoá đơn băng thông**. Thay 10 bằng 13,68 thì cả ba dòng cùng nhân 1,368; tỉ số "gấp ba" không đổi một chút nào.

> Một ước lượng sai 37 % nhưng **đúng bậc độ lớn** vẫn ra quyết định đúng, miễn là quyết định đó dựa trên **tỉ số** chứ không dựa trên giá trị tuyệt đối. Chỗ nó sẽ giết bạn là khi bạn dùng nó để ký hợp đồng băng thông hoặc để đặt ngưỡng 1.200 byte.

Chỗ nó thật sự quan trọng là bài 15 — số entity nhét vừa packet 1.200 byte, trừ 34 B header còn 1.166 B:

| B/entity | Entity/packet | Với 50 entity trong tầm nhìn |
|---|---|---|
| 112,7 (JSON) | 10 | **5 packet** → cắt mảnh, loss nhân lên (bài 15 mục 3.2) |
| 36 (binary thô) | 32 | 2 packet |
| 13,68 (bit-packed + header) | **85** | **1 packet** — 684 B, còn dư 43 % |
| 10 (giả định cũ) | 116 | 1 packet |

Chênh giữa 10 và 13,68 chỉ đổi entity/packet từ 116 xuống 85 — cả hai đều thừa cho 50 entity. Chênh giữa 13,68 và 112,7 đổi từ 1 packet thành 5, đúng chỗ bài 15 chứng minh loss bị nhân lên. **Giả định 10 B đủ tốt để suy luận; JSON thì không đủ tốt để chạy.**

---

## 5. Tính tay

**Bài 1.** Bản đồ MMO 16.384 m × 16.384 m, cao độ 1.024 m, nhân vật đi bộ chậm nhất 0,8 m/s, snapshot 15 Hz.
- Với `int16` cho trục ngang thì độ phân giải là bao nhiêu mm, và tốc độ ngưỡng theo nhịp snapshot là bao nhiêu?
- Cần tối thiểu bao nhiêu bit cho trục ngang để 0,8 m/s không thành bậc thang?
- Nếu thay vì tăng bit, bạn quantize tương đối với ô lưới AOI 256 m, thì 16 bit cho độ phân giải bao nhiêu? Bạn phải trả thêm cái gì?

**Bài 2.** Tập field của bạn ra tổng 62 bit.
- Căn byte tốn bao nhiêu byte, gói sát bit tốn bao nhiêu byte? Tiết kiệm bao nhiêu phần trăm?
- Bây giờ product yêu cầu thêm một cờ `isShielded` (1 bit) và một `teamId` 4 đội. Tổng mới bao nhiêu bit, và bây giờ gói sát bit tiết kiệm bao nhiêu?
- Hai câu trên nói gì về việc "nên quyết bit packing lúc nào"?

**Bài 3.** Bạn dùng 8 bit cho yaw và server raycast bằng chính giá trị đã quantize. Sai số góc tối đa 0,703°.
- Ở khoảng cách 25 m, lệch ngang tối đa bao nhiêu cm? (Gợi ý: `25 × tan(0,703°)`.)
- Thân người rộng ~0,5 m. Ở khoảng cách nào thì lệch tối đa bằng nửa bề rộng thân người, tức bắt đầu có thể biến trúng thành trượt?
- Nâng lên 16 bit tốn thêm 1 byte/entity. Với 50 entity × 20 Hz × 2.000 CCU, một byte đó là bao nhiêu Mbps và bao nhiêu đô-la một tháng ở $0,09/GB?

---

## 6. Chuyển giao

**Bạn làm game đua xe 8 người.** Đường đua dài 6.000 m nhưng bề ngang chỉ 30 m — xe chạy trên một dải hẹp, không phải mặt phẳng vuông. Tốc độ 0 tới 90 m/s. Va chạm giữa hai xe quyết định thắng thua nên vị trí tương đối phải chính xác tới vài cm. Snapshot 30 Hz.

1. Quantize `x` và `z` theo hộp bao 6.000 × 6.000 m là lãng phí ở chỗ nào? Có cách biểu diễn nào tự nhiên hơn cho một đường đua?
2. Ở 90 m/s, một khoảng snapshot 33,3 ms xe đi được bao nhiêu mét? Điều đó nói gì về tốc độ ngưỡng — bạn cần lưới mịn hay thô?
3. Nhưng lúc xe đứng ở vạch xuất phát, tốc độ bằng 0. Cùng một lưới có phục vụ được cả hai đầu dải tốc độ không?
4. Vận tốc `−20…20 m/s` trong 8 bit của bài này rõ ràng không dùng được ở đây. Bạn cần bao nhiêu bit cho dải 0…90 m/s nếu sai số cho phép là 0,2 m/s?
5. Xe A và xe B chạm nhau. Server tính va chạm bằng vị trí float của nó; client A dựng lại cảnh bằng vị trí đã quantize. Hai bên có thể kết luận khác nhau không, và điều đó nối vào bài 19 chỗ nào?
6. Ba tuần sau launch, product muốn thêm "hiệu ứng khói theo độ mòn lốp" — một giá trị 0…100 mỗi xe. Bạn đang dùng version byte và mới có đúng một phiên bản đang chạy. Mô tả các bước từ lúc viết code tới lúc xoá được nhánh decode cũ.
7. **Câu khó nhất:** giả sử bạn tìm được cách biểu diễn khiến mỗi xe chỉ còn 6 byte. Với 8 người chơi và 8 xe, snapshot 30 Hz, băng thông ra mỗi người là bao nhiêu KB/s — và con số đó nói gì về việc **toàn bộ bài này có đáng làm cho game đua 8 người hay không**? Nếu câu trả lời là không, thì điều kiện nào của một game làm nó trở nên đáng?

Câu 7 là câu duy nhất không hỏi về kỹ thuật. Nó hỏi khi nào **không** nên dùng thứ vừa học.

---

## 7. Tóm tắt

- Cùng một entity: **JSON 95 B · binary float32 36 B · quantized 13 B**. Trên mảng 50 entity giá trị thật, JSON **112,7 B/entity** vs bit-packed **13,0 B/entity** — chênh **8,7 lần** = **$46.516/tháng** ở 2.000 CCU. gzip cho JSON chỉ xuống **39,0 B/entity**, vẫn gấp 3,0 lần: nén tổng quát không thay được hiểu biết về miền.
- **Độ phân giải = dải / 2^bit**, sai số tối đa = một nửa nó. Bản đồ 4.096 m với `int16` cho **62,5 mm**.
- Đủ hay không đủ đo bằng **tốc độ ngưỡng = độ phân giải / khoảng thời gian giữa hai mẫu**. 62,5 mm ở 60 Hz cho **3,75 m/s** — nghĩa là **chuyển động chậm bị bậc thang, không phải chuyển động nhanh**. Cần 18 bit cho x/z, hoặc quantize tương đối với gốc gần.
- Chọn bit theo yêu cầu: `hp` 7 bit (bit thứ 8 thành cờ miễn phí), `state` 3 bit, `yaw` 8 bit **chỉ khi nó đi vào mắt** — đi vào raycast thì 0,703° là **61,4 cm ở 50 m**, phải 16 bit.
- Tổng 97 bit. **Căn byte 15 B, gói sát bit 13 B** — tiết kiệm 13,3 %. Không đáng làm nếu tổng bit đã gần bội số của 8.
- **Quantize state là bẫy chết người.** Lưu vị trí trên lưới 62,5 mm rồi simulate tiếp: 1 m/s → **đứng im**; 3 và 5 m/s → **cùng 3,75 m/s**. Sai số thành thiên lệch có hệ thống. Q16.16 của bài 11 mịn hơn 5.400 lần bước một tick nên nó làm state được; lưới transport thì không.
- Tự viết encoder là nhận lại hai việc: **struct trong RAM 14 B ≠ 13 B trên dây** (byte đệm chưa khởi tạo, rò RAM ra Internet) và **endianness không có mặc định** — float đọc nhầm chiều ra `1e-38`, không ra lỗi.
- Versioning: **version byte 1 B/packet = 0,15 %** là lựa chọn đúng cho snapshot; **field tag kiểu protobuf +1 B/field/entity = +69 %** thì không. Lobby/shop cứ dùng JSON.
- **Trả nợ:** full state 3D là **13 B**, tính cả header là **13,68 B/entity** — giả định 10 B của course **sai 36,8 %** nhưng đúng bậc độ lớn, nên mọi kết luận dựa trên **tỉ số** vẫn đứng vững.

→ **Bài 25 — Delta compression & baseline**: mỗi entity đã gọn hết mức. Bài sau hỏi câu tiếp: vì sao phải gửi entity không hề thay đổi?
