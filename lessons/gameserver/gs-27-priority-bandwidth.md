# Bài 27 — Priority & ngân sách băng thông

## 1. Mục tiêu

Sau bài này bạn có thể:

- **Tự tính trần cứng của một gói**: từ 1.200 byte (bài 15) và kích thước một entity, ra con số "gói này chứa được bao nhiêu entity".
- Viết được **priority accumulator**: cộng điểm mỗi tick, lấy top-K vừa gói, **reset điểm của entity đã gửi** — và giải thích vì sao bỏ bước reset là tạo ra starvation.
- **Dẫn ra tần suất cập nhật theo hạng ưu tiên** từ trọng số và sức chứa gói, thay vì đoán.
- Chọn được **trọng số ưu tiên** và bảo vệ từng con số bằng lý do gameplay.
- Đặt **ngân sách theo từng client**, và chỉ ra ở mức băng thông nào thì MTU chặn trước, ở mức nào thì đường truyền của client chặn trước.
- **Quy chương 6 ra hoá đơn egress theo CCU**, và nói được kỹ thuật nào là hệ số cố định, cái nào là trần, cái nào lớn dần theo mật độ.

---

## 2. Triệu chứng

Bài 26 đã cắt xong: người chơi này chỉ còn **200 entity trong tầm nhìn** thay vì 500 của cả bản đồ, và bài 24 đã ép mỗi entity xuống **10 byte**. Đóng gói thử một snapshot, header 16 byte:

```
16 + 200 × 10 = 2.016 byte
```

MTU an toàn là **1.200 byte** (bài 15). `ceil(2016 / 1200) = 2` — mỗi snapshot đi thành **2 mảnh IP**. Mất mảnh nào cũng vứt cả datagram, nên ở đường truyền loss 5%, xác suất mất thật của một snapshot là `1 − 0,95² = ` **9,75%**. Và 200 entity trong tầm là **lúc đông người giữa bản đồ** — đúng lúc gameplay quan trọng nhất.

Cách sửa đầu tiên ai cũng nghĩ ra, và nó *chạy được*:

```go
sort.Slice(visible, func(i, j int) bool {
    return dist[visible[i]] < dist[visible[j]]   // gần trước
})
send(visible[:100])                              // cắt còn 100, vừa gói
```

Gói xuống 1.016 byte, hết phân mảnh, loss về đúng 5%. Metric kích thước snapshot xanh hết. Deploy.

Ba ngày sau, bug report: *"kẻ địch ở xa đứng im như tượng, tới lúc chạy lại gần thì nó dịch chuyển tức thời"*.

---

## ⏸ Dừng lại — đoán trước #1

Đoạn code trên chạy mỗi tick, sắp theo khoảng cách, lấy 100 gần nhất. Với người chơi đứng giữa 200 entity, **entity xếp hạng 150 theo khoảng cách được cập nhật bao lâu một lần?**

```
(a) Cứ 2 tick một lần — 100 slot chia đều cho 200 entity
(b) Khoảng 1 giây một lần, vì entity ở xa chuyển động chậm trong tầm nhìn
(c) Không bao giờ, chừng nào nó còn xếp hạng 150
(d) Tuỳ tick — thứ tự sắp xếp thay đổi nên rốt cuộc ai cũng tới lượt
```

---

## 3. Lý thuyết

### 3.1 Trần cứng: một gói chứa được bao nhiêu entity

Đáp án là **(c)**, lý do đơn giản đến mức khó chịu: **`sort` là hàm thuần tuý của khoảng cách, mà khoảng cách gần như không đổi giữa hai tick.** Entity hạng 150 tick này thì tick sau vẫn hạng 150. Nó không "tới lượt" — nó không có lượt. Nó được cập nhật đúng một lần, ở tick lọt vào tầm nhìn, rồi đứng im cho tới khi người chơi chạy đủ gần để đẩy nó lên hạng 100. Đó chính là cái "dịch chuyển tức thời" trong bug report.

Trước khi sửa, chốt con số trần. Ngân sách một gói:

```
1.200 B  MTU an toàn (bài 15)
−   16 B  header snapshot: tick 4, seq 2, lastAckedSeq 4, flags 2, count 2, pad 2
= 1.184 B  cho entity
1.184 / 10 = 118,4  →  118 entity nếu dồn hết gói cho state
```

118 là trần tuyệt đối. Thực tế không dùng hết, vì cùng gói đó còn phải chở message rời rạc của bài 14 — nhặt item, chết, bắt đầu hồi chiêu — loại reliable không được trễ. Chừa **184 byte** cho chúng:

```
1.184 − 184 = 1.000 B  →  100 entity mỗi tick
```

Cả bài này dùng **K = 100**.

<svg viewBox="0 0 700 200" role="img" aria-labelledby="gs27-b-t gs27-b-d" style="width:100%;height:auto">
<title id="gs27-b-t">Nhu cầu 2.016 byte so với ngân sách gói 1.200 byte</title>
<desc id="gs27-b-d">Thanh trên biểu diễn nhu cầu 200 entity là 2.016 byte, vượt vạch MTU 1.200 byte nên bị cắt thành hai mảnh IP; thanh dưới là gói thật gồm header 16 byte, 100 entity chiếm 1.000 byte và 184 byte chừa cho message reliable.</desc>
<text x="12" y="24" font-size="12" font-weight="bold" fill="currentColor">Ngân sách một gói — thang 1 byte = 0,28 px</text>
<line x1="456" y1="36" x2="456" y2="176" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4 3"/>
<text x="460" y="46" font-size="10" fill="currentColor">MTU an toàn 1.200 B</text>
<text x="12" y="76" font-size="10" fill="currentColor">Nhu cầu</text>
<rect x="120" y="60" width="336" height="26" rx="4" fill="#3b82f6" fill-opacity="0.25"/>
<rect x="456" y="60" width="228" height="26" rx="4" fill="#ef4444" fill-opacity="0.3"/>
<text x="288" y="78" text-anchor="middle" font-size="10" fill="currentColor">mảnh 1</text>
<text x="570" y="78" text-anchor="middle" font-size="10" fill="currentColor">mảnh 2 — loss 5% thành 9,75%</text>
<text x="120" y="104" font-size="10" fill="currentColor">200 entity × 10 B + 16 B header = 2.016 B</text>
<text x="12" y="146" font-size="10" fill="currentColor">Gói thật</text>
<rect x="120" y="130" width="5" height="26" rx="1" fill="#64748b" fill-opacity="0.5"/>
<rect x="125" y="130" width="280" height="26" rx="4" fill="#84cc16" fill-opacity="0.3"/>
<rect x="405" y="130" width="51" height="26" rx="4" fill="#f59e0b" fill-opacity="0.3"/>
<text x="265" y="148" text-anchor="middle" font-size="10" fill="currentColor">100 entity = 1.000 B</text>
<text x="120" y="174" font-size="10" fill="currentColor">16 B header</text>
<text x="430" y="174" text-anchor="middle" font-size="10" fill="currentColor">184 B</text>
<text x="430" y="122" text-anchor="middle" font-size="9" fill="currentColor">chừa cho message reliable</text>
</svg>

Trần này **không co giãn theo tải**. Bài 26 cắt 500 xuống 200 nhờ giới hạn hình học của tầm nhìn; nhưng 200 người thật sự đứng quanh bạn trong một trận battle royale thu vòng thì AOI không cắt thêm được nữa — họ *đúng là* đang ở trong tầm nhìn. Lúc đó chỉ còn một câu hỏi: **trong 200 người đó, 100 ai được gửi tick này.**

### 3.2 Không phải entity nào cũng đáng gửi mỗi tick

Câu hỏi trên chỉ trả lời được nếu chấp nhận một điều mà phản xạ backend chống lại: **cập nhật không đầy đủ không phải là bug.** Ba lý do một entity không đáng gửi tick này:

| Tình trạng | Vì sao hoãn được |
|---|---|
| **Ở xa** | 1 pixel trên màn hình tương ứng nhiều mét thế giới; sai vị trí 2 m ở khoảng cách 80 m không nhìn ra |
| **Đứng yên** | Client nội suy (bài 20) từ hai điểm giống nhau ra đúng vị trí cũ — dự đoán *đúng* |
| **Không tương tác được** | Cái cây, thùng hàng, xác chết: không bắn được, không đụng được |

Điểm chung: **client đã có một dự đoán, và dự đoán đó đủ tốt.** Gửi state là để *sửa* dự đoán của client (bài 19). Dự đoán chưa sai thì gửi là trả tiền cho một byte không thay đổi gì trên màn hình.

Nhưng "đủ tốt" hết hạn. Entity đứng yên rồi cũng chạy; entity ở xa rồi cũng lại gần. Cơ chế cần **đúng hai tính chất**, và tính chất thứ hai là chỗ cách sửa ngây thơ ở mục 2 chết:

1. Ai quan trọng hơn thì được gửi thường xuyên hơn.
2. **Không ai bị bỏ mãi mãi.** Sai số của entity kém quan trọng nhất phải có **trần**, dù trần đó lớn.

---

## ⏸ Dừng lại — đoán trước #2

Ta thay `sort theo khoảng cách` bằng: mỗi entity có một biến `score`, mỗi tick `score += weight` (weight lớn nếu gần/quan trọng), rồi lấy 100 entity `score` cao nhất mà gửi.

**Chỉ với chừng đó — chưa có bước nào khác — entity ở xa (weight nhỏ nhất) được gửi bao lâu một lần?**

```
(a) Thưa hơn entity gần, tỉ lệ nghịch với weight — đúng như mong muốn
(b) Không bao giờ, y hệt cách sắp theo khoảng cách
(c) Rất thưa lúc đầu, rồi dần dần đều lại khi score cộng dồn đủ lâu
(d) Đều đặn 2 tick một lần, vì 100 slot chia cho 200 entity
```

---

### 3.3 Priority accumulator — và bước mà ai cũng quên

Đáp án là **(b)**, cùng bệnh với mục 2 chỉ khác lớp sơn. Sau `t` tick, `score_i = w_i × t`. Xếp hạng theo `w_i × t` là xếp hạng theo `w_i` — hằng số `t` chung không đổi được thứ tự của bất cứ cặp nào. Bảng xếp hạng **đóng băng ở tick đầu tiên** và không bao giờ đổi nữa.

Thứ biến cơ chế này thành đúng là một dòng: **gửi xong thì reset điểm về 0.**

```go
for _, e := range visible {
    e.score += e.priorityWeight(viewer)   // cộng dồn, không ghi đè
}
sort.Slice(visible, byScoreDesc)

n := 0
for _, e := range visible {
    if len(buf)+e.WireSize() > entityBudget { break }   // entityBudget = 1.000
    buf = e.AppendTo(buf)
    e.score = 0                                          // <-- CẢ CƠ CHẾ NẰM Ở ĐÂY
    n++
}
```

Reset đổi bản chất bài toán. Trước reset, `score` đo *độ quan trọng*. Sau reset, `score` đo **độ quan trọng × thời gian kể từ lần gửi cuối** — món nợ server đang thiếu client về entity này. Entity xa cộng chậm nhưng **cộng mãi**, còn mọi entity quan trọng vừa gửi đều bị đưa về 0 để nhường chỗ.

> Cộng dồn cho **công bằng có trọng số**; reset cho **công bằng**. Thiếu vế nào cũng hỏng: không cộng dồn thì entity xa chết đói, không reset thì entity gần chiếm sóng vĩnh viễn.

<svg viewBox="0 0 700 250" role="img" aria-labelledby="gs27-a-t gs27-a-d" style="width:100%;height:auto">
<title id="gs27-a-t">Điểm ưu tiên cộng dồn và reset qua 8 tick</title>
<desc id="gs27-a-d">Ba hàng entity với trọng số 10, 2 và 1: hàng trọng số 10 vượt ngưỡng và được gửi mỗi tick, hàng trọng số 2 cứ hai tick một lần, hàng trọng số 1 phải tích luỹ năm tick mới lọt top và được gửi; ô được gửi tô đậm và điểm về 0 ngay sau đó.</desc>
<text x="12" y="20" font-size="12" font-weight="bold" fill="currentColor">score += weight mỗi tick · ô tô đậm = lọt top-100, gửi, rồi reset về 0</text>
<text x="130" y="44" text-anchor="middle" font-size="10" fill="currentColor">t1</text>
<text x="192" y="44" text-anchor="middle" font-size="10" fill="currentColor">t2</text>
<text x="254" y="44" text-anchor="middle" font-size="10" fill="currentColor">t3</text>
<text x="316" y="44" text-anchor="middle" font-size="10" fill="currentColor">t4</text>
<text x="378" y="44" text-anchor="middle" font-size="10" fill="currentColor">t5</text>
<text x="440" y="44" text-anchor="middle" font-size="10" fill="currentColor">t6</text>
<text x="502" y="44" text-anchor="middle" font-size="10" fill="currentColor">t7</text>
<text x="564" y="44" text-anchor="middle" font-size="10" fill="currentColor">t8</text>
<text x="12" y="76" font-size="10" fill="currentColor">đang bắn mình</text>
<text x="12" y="90" font-size="10" fill="currentColor">w = 10</text>
<rect x="104" y="56" width="52" height="30" rx="4" fill="#ef4444" fill-opacity="0.35"/>
<rect x="166" y="56" width="52" height="30" rx="4" fill="#ef4444" fill-opacity="0.35"/>
<rect x="228" y="56" width="52" height="30" rx="4" fill="#ef4444" fill-opacity="0.35"/>
<rect x="290" y="56" width="52" height="30" rx="4" fill="#ef4444" fill-opacity="0.35"/>
<rect x="352" y="56" width="52" height="30" rx="4" fill="#ef4444" fill-opacity="0.35"/>
<rect x="414" y="56" width="52" height="30" rx="4" fill="#ef4444" fill-opacity="0.35"/>
<rect x="476" y="56" width="52" height="30" rx="4" fill="#ef4444" fill-opacity="0.35"/>
<rect x="538" y="56" width="52" height="30" rx="4" fill="#ef4444" fill-opacity="0.35"/>
<text x="130" y="76" text-anchor="middle" font-size="11" fill="currentColor">10</text>
<text x="192" y="76" text-anchor="middle" font-size="11" fill="currentColor">10</text>
<text x="254" y="76" text-anchor="middle" font-size="11" fill="currentColor">10</text>
<text x="316" y="76" text-anchor="middle" font-size="11" fill="currentColor">10</text>
<text x="378" y="76" text-anchor="middle" font-size="11" fill="currentColor">10</text>
<text x="440" y="76" text-anchor="middle" font-size="11" fill="currentColor">10</text>
<text x="502" y="76" text-anchor="middle" font-size="11" fill="currentColor">10</text>
<text x="564" y="76" text-anchor="middle" font-size="11" fill="currentColor">10</text>
<text x="600" y="76" font-size="10" fill="currentColor">mỗi tick</text>
<text x="12" y="136" font-size="10" fill="currentColor">tầm trung</text>
<text x="12" y="150" font-size="10" fill="currentColor">w = 2</text>
<rect x="104" y="116" width="52" height="30" rx="4" fill="#3b82f6" fill-opacity="0.12"/>
<rect x="166" y="116" width="52" height="30" rx="4" fill="#3b82f6" fill-opacity="0.4"/>
<rect x="228" y="116" width="52" height="30" rx="4" fill="#3b82f6" fill-opacity="0.12"/>
<rect x="290" y="116" width="52" height="30" rx="4" fill="#3b82f6" fill-opacity="0.4"/>
<rect x="352" y="116" width="52" height="30" rx="4" fill="#3b82f6" fill-opacity="0.12"/>
<rect x="414" y="116" width="52" height="30" rx="4" fill="#3b82f6" fill-opacity="0.4"/>
<rect x="476" y="116" width="52" height="30" rx="4" fill="#3b82f6" fill-opacity="0.12"/>
<rect x="538" y="116" width="52" height="30" rx="4" fill="#3b82f6" fill-opacity="0.4"/>
<text x="130" y="136" text-anchor="middle" font-size="11" fill="currentColor">2</text>
<text x="192" y="136" text-anchor="middle" font-size="11" fill="currentColor">4</text>
<text x="254" y="136" text-anchor="middle" font-size="11" fill="currentColor">2</text>
<text x="316" y="136" text-anchor="middle" font-size="11" fill="currentColor">4</text>
<text x="378" y="136" text-anchor="middle" font-size="11" fill="currentColor">2</text>
<text x="440" y="136" text-anchor="middle" font-size="11" fill="currentColor">4</text>
<text x="502" y="136" text-anchor="middle" font-size="11" fill="currentColor">2</text>
<text x="564" y="136" text-anchor="middle" font-size="11" fill="currentColor">4</text>
<text x="600" y="136" font-size="10" fill="currentColor">2 tick</text>
<text x="12" y="196" font-size="10" fill="currentColor">ở xa</text>
<text x="12" y="210" font-size="10" fill="currentColor">w = 1</text>
<rect x="104" y="176" width="52" height="30" rx="4" fill="#84cc16" fill-opacity="0.12"/>
<rect x="166" y="176" width="52" height="30" rx="4" fill="#84cc16" fill-opacity="0.12"/>
<rect x="228" y="176" width="52" height="30" rx="4" fill="#84cc16" fill-opacity="0.12"/>
<rect x="290" y="176" width="52" height="30" rx="4" fill="#84cc16" fill-opacity="0.12"/>
<rect x="352" y="176" width="52" height="30" rx="4" fill="#84cc16" fill-opacity="0.45"/>
<rect x="414" y="176" width="52" height="30" rx="4" fill="#84cc16" fill-opacity="0.12"/>
<rect x="476" y="176" width="52" height="30" rx="4" fill="#84cc16" fill-opacity="0.12"/>
<rect x="538" y="176" width="52" height="30" rx="4" fill="#84cc16" fill-opacity="0.12"/>
<text x="130" y="196" text-anchor="middle" font-size="11" fill="currentColor">1</text>
<text x="192" y="196" text-anchor="middle" font-size="11" fill="currentColor">2</text>
<text x="254" y="196" text-anchor="middle" font-size="11" fill="currentColor">3</text>
<text x="316" y="196" text-anchor="middle" font-size="11" fill="currentColor">4</text>
<text x="378" y="196" text-anchor="middle" font-size="11" fill="currentColor">5</text>
<text x="440" y="196" text-anchor="middle" font-size="11" fill="currentColor">1</text>
<text x="502" y="196" text-anchor="middle" font-size="11" fill="currentColor">2</text>
<text x="564" y="196" text-anchor="middle" font-size="11" fill="currentColor">3</text>
<text x="600" y="196" font-size="10" fill="currentColor">4–5 tick</text>
<text x="12" y="236" font-size="10" fill="currentColor">Ngưỡng lọt top-100 dao động quanh 4 — nó là điểm của entity hạng 100, không phải hằng số bạn đặt.</text>
</svg>

### 3.4 Tần suất cập nhật theo hạng — đo bằng mô phỏng

Cơ chế đúng rồi thì còn đúng một câu hỏi người chơi thật sự cảm thấy: **entity xa bị cũ bao lâu?** Mô phỏng: **200 entity trong tầm, K = 100 slot mỗi tick, 20 Hz (50 ms/tick), 20.000 tick.** Bốn nhóm trọng số:

| Nhóm | Số entity | Trọng số `w` | Tổng `w` |
|---|---|---|---|
| Đang bắn mình / trong tầm ngắm | 10 | 10 | 100 |
| Gần (< 20 m) | 40 | 4 | 160 |
| Tầm trung (20–60 m) | 60 | 2 | 120 |
| Ở xa (> 60 m) | 90 | 1 | 90 |
| | **200** | | **470** |

Kết quả — khoảng cách giữa hai lần gửi của cùng một entity, bỏ 10.000 tick đầu cho hệ ổn định:

| Nhóm | Gap trung bình | Ở 20 Hz | Gap p99 | Không bao giờ được gửi |
|---|---|---|---|---|
| w = 10 | 1,000 tick | **50 ms** | 1 tick | 0 |
| w = 4 | 1,000 tick | **50 ms** | 1 tick | 0 |
| w = 2 | 2,000 tick | **100 ms** | 2 tick | 0 |
| w = 1 | 4,500 tick | **225 ms** | 5 tick — 250 ms | 0 |

Cột cuối là kết quả quan trọng nhất: **0 ở cả bốn hàng.** Không entity nào chết đói, kể cả nhóm trọng số thấp nhất.

Kiểm tra lại bằng bảo toàn slot — mỗi tick phải gửi đúng 100:

```
10/1,0  +  40/1,0  +  60/2,0  +  90/4,5
  10    +    40    +    30    +    20     = 100  ✓
```

Đó là công thức tổng quát, dự đoán được trước khi chạy: **Σ (số entity nhóm i / gap nhóm i) = K.** Nhóm nào có `w` lớn hơn ngưỡng thì bị chặn ở gap = 1 tick (không gửi hai lần trong một tick), phần slot còn lại chia cho các nhóm dưới theo tỉ lệ `w`. Nhóm w = 4 và w = 10 đều bão hoà ở 50 ms — giữa hai nhóm đó, trọng số 10 so với 4 **không mua thêm được gì**. Đó là giới hạn của cơ chế: trọng số cao chỉ có nghĩa khi có cạnh tranh thật.

Bây giờ chạy lại đúng mô phỏng đó nhưng **bỏ dòng `e.score = 0`**:

| Nhóm | Số entity từng được gửi ít nhất một lần |
|---|---|
| w = 10 | 10 / 10 |
| w = 4 | 40 / 40 |
| w = 2 | **50 / 60** |
| w = 1 | **0 / 90** |

**100 trên 200 entity không bao giờ được gửi, qua 20.000 tick — 16 phút 40 giây.** Bằng đúng số entity bị bỏ của cách sắp theo khoảng cách ở mục 2: hai bug khác nhau về code, giống hệt nhau về hậu quả.

Nhóm w = 2 lọt 50/60 là chi tiết đáng để ý: khi hết slot ở giữa một nhóm cùng trọng số, cái quyết định 10 entity nào bị bỏ là **thứ tự trong slice**, tức thứ tự tạo entity. Bug phụ thuộc thứ tự khởi tạo, tái hiện 100% mà trông y như ngẫu nhiên — bài 10 đã cảnh báo đúng loại này.

### 3.5 Trọng số thực dụng

Trọng số không phải là một hằng số đẹp, nó là **tổng của mấy khoản mà mỗi khoản trả lời một câu hỏi gameplay**. Một công thức chạy được:

```go
func (e *Entity) priorityWeight(v *Viewer) float32 {
    w := 1.0                                   // sàn: mọi thứ nhìn thấy đều có nợ
    w += 8.0 / (1.0 + dist(e, v)/10.0)         // khoảng cách, giảm dần trơn
    if v.aimCone.Contains(e)      { w += 4.0 } // trong tầm ngắm
    if e.IsTargeting(v)           { w += 8.0 } // đang bắn mình
    w += min(speed(e)/4.0, 3.0)                // tốc độ đổi state
    if e.Team == v.Team           { w += 2.0 } // đồng đội — HUD phụ thuộc
    return w
}
```

| Yếu tố | Đóng góp | Vì sao trọng số đó |
|---|---|---|
| Sàn | +1 | Mọi entity nhìn thấy đều tích nợ → không starvation. **Bỏ khoản này là bỏ cả cơ chế.** |
| Khoảng cách | +8 ở 0 m, +2,67 ở 20 m, +1,14 ở 60 m | Sai số quy ra pixel tỉ lệ nghịch với khoảng cách; giảm trơn để không nhấp nháy ở đúng mốc 20 m |
| Trong tầm ngắm | +4 | Người chơi đang *nhìn* nó — sai lệch bị phát hiện ngay |
| Đang bắn mình | +8 | Cao nhất: nó quyết định sống chết, và lag compensation (bài 21) chỉ công bằng nếu state tươi |
| Tốc độ đổi | +0 tới +3 | Entity đứng yên thì nội suy (bài 20) đoán đúng; đang chạy thì dự đoán sai nhanh |
| Đồng đội | +2 | Mũi tên đồng đội trên HUD giật thì người chơi báo bug, dù không ảnh hưởng thắng thua |

Ba điều làm sai nhiều nhất:

**Thiếu sàn.** Bỏ `w := 1.0` thì entity rất xa, đứng yên, không nhắm tới có `w ≈ 0,14`; chưa bằng 0 nhưng gap phình theo `1/w` và lên tới hàng chục giây. Sàn là thứ biến trần sai số từ *tồn tại về mặt toán* thành *chấp nhận được về mặt cảm giác*.

**Bậc thang thay vì hàm trơn.** `if dist < 20 { w = 4 } else { w = 2 }` khiến entity đi qua mốc 20 m nhảy tần suất 50 ms ↔ 100 ms — người chơi thấy nó "giật một nhịp" ở một vòng tròn vô hình quanh mình.

**Nhân thay vì cộng.** `score *= w` làm điểm tăng theo cấp số nhân và float32 tràn sau vài nghìn tick. Cộng dồn tuyến tính là *cố ý*.

Một khoản không nằm trong hàm trên vì nó thuộc loại khác: **entity vừa vào tầm nhìn** (bài 26) phải gửi full state **ngay tick đó** — client chưa có gì để nội suy. Nó không xếp hàng theo priority, nó chen ngang, và ngân sách 1.000 byte phải chịu được vài lần chen ngang mỗi tick.

---

## ⏸ Dừng lại — đoán trước #3

Bạn chốt K = 100 entity/tick ở 20 Hz. Một người chơi trên 4G đo được **256 kbps** chiều xuống, một người khác cáp quang **10 Mbps**.

**Client 10 Mbps nên nhận bao nhiêu entity mỗi tick?**

```
(a) Vẫn 100 — MTU 1.200 byte không phụ thuộc đường truyền của ai
(b) Khoảng 5.000 — 10 Mbps ở 20 Hz cho 62.500 byte mỗi tick
(c) 200 — tức toàn bộ tầm nhìn, hết chuyện phải ưu tiên
(d) Không xác định được nếu chưa biết server có bao nhiêu băng thông ra
```

---

### 3.6 Ngân sách theo client, không phải theo server

Cả ba con số đều tính được. Ở 20 Hz, mỗi tick cách nhau 50 ms:

| Băng thông xuống của client | Byte/giây | **Byte mỗi tick** | Số gói 1.228 B vừa trong đó |
|---|---|---|---|
| 256 kbps | 32.000 | 1.600 | 1,30 |
| 1 Mbps | 125.000 | 6.250 | 5,09 |
| 10 Mbps | 1.250.000 | 62.500 | 50,90 |

*(1.228 B = 1.200 payload + 28 header IPv4/UDP — byte trên dây, đúng cái nhà mạng đếm.)*

Đối chiếu với chiều ngược lại: **một luồng gói đầy ở 20 Hz tốn `1.228 × 20 = 24.560 B/s = 196,48 kbps`.**

Con số 196,48 kbps là ranh giới, và nó lật ngược đáp án trực giác. **(b) sai, (a) gần đúng nhưng vì lý do khác với lý do bạn nghĩ.**

- **Trên 196,48 kbps, MTU chặn trước, không phải băng thông.** Client 1 Mbps chở lọt 5 gói mỗi tick, 10 Mbps chở lọt 50. Nhưng bạn *không* gửi 50 gói: đó là 12,5 MB/s một người, và cái chặn không còn là mạng của họ mà là hoá đơn của bạn (mục 3.7) và CPU serialize của server. Trần thật ở đây là **quyết định sản phẩm**, thường 1 gói/tick, tối đa 2 khi có burst entity mới vào tầm.
- **Dưới 196,48 kbps, client chặn trước** — và lúc đó K phải giảm theo từng người:

```
128 kbps → 800 B/tick − 28 (IP/UDP) − 16 (header) = 756 B → 75 entity
192 kbps → 1.200 B/tick − 28 − 16 = 1.156 B        → 115 entity
256 kbps → 1.600 B/tick, MTU chặn trước            → 100 entity (đủ)
```

Vậy client 256 kbps ở đề bài **không cần cắt gì** — nó dư sức nhận một gói đầy mỗi tick. Người phải cắt là client 128 kbps, và họ tồn tại thật: 3G vùng phủ kém, Wi-Fi quán cà phê, hotspot chia cho bốn người.

**Đo `K` của từng client thế nào.** Đừng hỏi client — nó tự khai băng thông thì nó cũng khai được aimbot (bài 33). Suy từ thứ server tự quan sát được: **tỉ lệ ack** (bài 14) tụt liên tục nghĩa là đang mất gói vì nghẽn; **RTT tăng dần** là bufferbloat, hàng đợi phình vì bạn gửi quá tay; và **tick client báo thiếu** trong gói input chiều lên là tín hiệu thật nhất, vì nói dối khoản này chỉ hại chính nó.

Vòng điều chỉnh giống TCP congestion control nhưng chậm hơn nhiều — game không cần dò tới ngưỡng nghẽn, chỉ cần lùi khi thấy đau:

```
ack rate < 95% trong 2 giây liên tiếp  →  K = max(K × 0,8, K_min)
ack rate > 99% trong 10 giây liên tiếp →  K = min(K + 5, K_max)
```

Lùi nhanh, lên chậm — cùng triết lý AIMD, cùng lý do: gửi quá nhiều thì người chơi mất gói, gửi quá ít thì họ chỉ thấy entity xa hơi cũ.

> `K` là **thuộc tính của một kết nối**, không phải hằng số của server. Cùng một trận, cùng một tick, hai người nhận hai gói khác nhau cả nội dung lẫn kích thước — hệ quả trực tiếp của việc mỗi client đã có tầm nhìn riêng từ bài 26.

Một giới hạn phải nói ra: cơ chế này **đổi chất lượng chứ không đổi độ trễ**. Client 128 kbps nhận 75 entity/tick thấy entity xa cũ hơn, nhưng người đang bắn anh ta vẫn tươi 50 ms. Nếu RTT của anh ta là 300 ms thì priority không sửa được một mili giây nào — đó là bài 21, và không kỹ thuật nào ở chương 6 chạm tới được.

### 3.7 Quy ra tiền

Bài 16 đã làm đúng việc này với slot: mọi quyết định kỹ thuật ở trên đều có một con số USD ở cuối. Hai kịch bản, cùng một trận 500 entity, snapshot 20 Hz:

**Không tối ưu gì** — full snapshot, float32 chưa quantize (40 B/entity), không AOI, không priority:

```
payload/tick = 16 + 500 × 40 = 20.016 B
ceil(20.016 / 1.200) = 17 mảnh  →  +17 × 28 B header = 476 B
(20.016 + 476) × 20 = 409.840 B/s = 409,84 KB/s mỗi người chơi
```

**Có chương 6** — trần cứng một gói đầy:

```
(1.200 + 28) × 20 = 24.560 B/s = 24,56 KB/s mỗi người chơi
```

Tỉ lệ: `409.840 / 24.560 = ` **16,69 lần**. Lưu ý 24,56 KB/s là **cận trên** — gói đầy mọi tick chỉ xảy ra lúc đông; p50 thực tế thấp hơn (payload 600 B cho ra 12,56 KB/s), nên hoá đơn thật nằm giữa hai con số và phải đo bằng metric `bytes/player/s` mà bài 15 bắt dựng.

Một tháng = `30 × 24 × 3.600 = 2.592.000` giây; giả định **0,09 USD/GB** và CCU giữ nguyên 24/7:

| CCU | Có chương 6 | Không có chương 6 | Chênh lệch |
|---|---|---|---|
| 1.000 | 63.660 GB — **5.729 USD** | 1.062.305 GB — 95.607 USD | 89.878 USD |
| 10.000 | 636.595 GB — **57.294 USD** | 10.623.053 GB — 956.075 USD | 898.781 USD |
| 100.000 | 6.365.952 GB — **572.936 USD** | 106.230.528 GB — 9.560.748 USD | **8.987.812 USD** |

*(Đơn giá 0,09 USD/GB là **giả định**, không phải số đo. Nó thay đổi theo nhà cung cấp, theo vùng, theo cam kết sản lượng và theo năm — khoảng 0,02 tới 0,12 USD/GB là dải thường gặp, và có nhà cung cấp miễn phí egress hoàn toàn. Ở 10.000 CCU có tối ưu, dải đó cho ra từ 12.732 tới 76.391 USD/tháng. Con số đáng nhớ không phải USD mà là **tỉ lệ 16,69 lần** — nó không phụ thuộc đơn giá.)*

Ba điều bảng này nói mà bảng CPU không nói:

**Egress tuyến tính theo CCU, và đó là loại chi phí tệ nhất.** CPU thì bạn nhồi thêm trận vào một máy (bài 28). Băng thông không có chỗ để nhồi: người thứ 100.001 tốn đúng bằng người đầu tiên. **Không có economy of scale trên egress**, chỉ có chiết khấu sản lượng do đàm phán.

**Một byte thêm vào mỗi entity là 46.656 USD/tháng ở 100.000 CCU.** 1 B × 100 entity/tick × 20 Hz = 2.000 B/s mỗi người; `2.000 × 100.000 × 2.592.000 / 1e9 = 518.400 GB`, nhân 0,09 ra con số trên. Đó là lý do bài 24 cãi nhau góc quay 1 byte hay 2 byte — không phải chuyện kỹ thuật vặt.

**Chi phí này rơi vào lúc tệ nhất.** CCU đỉnh trùng giờ vàng, trùng sự kiện ra mắt. Ngân sách phải tính theo p99 của CCU chứ không theo trung bình — cùng lý do bài 15 bắt đọc p99 của kích thước gói.

---

## 4. Tổng kết chương 6 bằng số

Bốn kỹ thuật, cùng một người chơi, cùng một trận 500 entity thế giới / 200 entity trong tầm nhìn. Chỉ tính payload để so cho sạch:

| Bước | Kỹ thuật | Payload/giây | Hệ số | Cộng dồn |
|---|---|---|---|---|
| Gốc | full snapshot float32 (**36 B**, đo ở bài 24) | 360.000 B/s | — | ×1 |
| Bài 24 | quantization 36 → **13 B**/entity | 130.000 B/s | **×2,77** | ×2,77 |
| Bài 26 | AOI 500 → 200 entity | 52.000 B/s | **×2,50** | ×6,92 |
| Bài 27 | priority 200 → 100 entity/tick | 26.000 B/s | **×2** | **×13,85** |

> **Vì sao bảng này ra ×13,85 còn bảng cuối bài 26 ra ×540,7?** Hai bảng đo từ hai
> mốc gốc khác nhau và hai mật độ khác nhau. Bài 26 xuất phát từ **JSON 112,7 B** trên
> bản đồ thưa (500 người, chỉ 20 trong tầm) nên AOI một mình đã ×24,95. Bảng này xuất
> phát từ **binary float32 36 B** trên bản đồ đông (200/500 trong tầm) nên AOI chỉ ×2,5.
> Cả hai đều dùng số đo thật của bài 24; cái đổi là kịch bản. Bài học nằm ở chỗ đó:
> **hệ số của AOI là hàm của mật độ, không phải hằng số đem đi trích dẫn được.**

Bài 25 (delta) không có hàng riêng, và đó là chủ ý — nó thuộc loại khác hẳn ba cái kia:

| Kỹ thuật | Bản chất hệ số | Phụ thuộc gì |
|---|---|---|
| **Quantization** (24) | **Hằng số.** ×2,77 là ×2,77, ở 5 entity hay 5.000 entity | Không phụ thuộc gì. Làm một lần, ăn mãi |
| **Delta** (25) | **Biến thiên theo tải.** Rừng vắng thì ×5 trở lên, hỗn chiến 200 người cùng chạy thì ×1 | Tỉ lệ entity đổi state. Cứu p50, **không cứu p99** |
| **AOI** (26) | **Lớn dần theo mật độ.** ×2,5 ở 500 entity; bản đồ 5.000 entity thì ×25 | Số entity thế giới chia số entity trong tầm |
| **Priority** (27) | **Không phải hệ số — là TRẦN.** Cắt đúng tới ngưỡng MTU, không hơn không kém | Không phụ thuộc gì. Đó chính là giá trị của nó |

Từ bảng này ra được thứ tự thi công, và nó là chuỗi nhân quả chứ không phải bảng xếp hạng:

1. **AOI trước.** Đòn bẩy lớn nhất, và lớn dần đúng lúc bạn cần nhất. Nó cũng cắt luôn khối lượng công việc của ba bước sau: quantize 200 entity rẻ hơn quantize 500.
2. **Quantization sau.** Rẻ để làm, hệ số chắc chắn, và nó chốt `WireSize()` — con số hai bước còn lại cần để tính ngân sách.
3. **Delta.** Hạ hoá đơn thường ngày thật, nhưng đừng dựa vào nó để khỏi phân mảnh: hôm nào cả 200 người cùng chạy thì hệ số của nó về 1 đúng lúc bạn cần nó nhất.
4. **Priority cuối cùng — và bắt buộc.** Kỹ thuật duy nhất cho bạn một **bảo đảm** thay vì một kỳ vọng: gói *không bao giờ* vượt 1.200 byte, bất kể bao nhiêu người trong tầm nhìn.

> Ba cái đầu làm gói **thường xuyên nhỏ**. Chỉ priority làm gói **không bao giờ to**. Bài 15 nói `max > 1.200 byte là bug, không phải cảnh báo` — priority biến câu đó thành đúng theo cấu trúc, không phải nhờ may mắn.

Bài 15 xếp AOI → priority → serialization theo đòn bẩy; thứ tự ở đây khác một bậc vì xét theo *thi công*: vòng đóng gói của priority cần `WireSize()` đã chốt mới biết còn bao nhiêu byte trống. Hai thứ tự gặp nhau ở một điểm — **AOI luôn đi đầu, và bốn thứ đều phải có**.

---

## 5. Tính tay

**Bài 1.** Thêm 2 byte trạng thái (buff, tư thế) vào entity → **12 B/entity**. Header 16 B, chừa 184 B cho message reliable như trong bài.
- Một gói chứa được bao nhiêu entity? Giảm bao nhiêu phần trăm so với 100?
- Vẫn 200 entity trong tầm và bảng trọng số mục 3.4: nhóm `w = 1` có gap trung bình bao nhiêu tick? *(Dùng `Σ nᵢ/gapᵢ = K`; nhóm `w = 10` và `w = 4` vẫn bão hoà ở gap = 1.)*
- Ở 20 Hz gap đó là bao nhiêu ms? So với 225 ms trong bài, người chơi có nhận ra không — dựa vào con số nào của bài 20 để trả lời?

**Bài 2.** Battle royale vòng cuối: **60 người đều nằm trong tầm nhìn của nhau**, không có entity tĩnh. Trọng số: 10 người đang bắn nhau `w = 18`, 50 người còn lại `w = 3`.
- Với K = 100, chuyện gì xảy ra? Gap của nhóm `w = 3` là bao nhiêu tick, bao nhiêu ms?
- Có nên vẫn chạy priority accumulator không? Trả lời bằng cách chỉ ra bước nào trong vòng đóng gói trở thành no-op.

**Bài 3.** Game của bạn 40.000 CCU, đo được **18,4 KB/s** mỗi người chơi (p50 thật, không phải cận trên).
- Egress một tháng là bao nhiêu GB? Ở 0,09 USD/GB là bao nhiêu USD?
- Đội đề xuất hạ snapshot 20 Hz xuống 15 Hz để tiết kiệm. Tiết kiệm bao nhiêu USD/tháng, và **thêm bao nhiêu ms** vào ngân sách 182 ms của bài 8? *(Gợi ý: khoản "chờ snapshot" trong bài 8 là nửa chu kỳ.)*
- Chia hai con số cho nhau để ra "USD tiết kiệm mỗi ms độ trễ thêm vào". So với phương án của bài 8 là hạ buffer nội suy 100 → 50 ms: phương án nào tốt hơn, và vì sao câu trả lời không phụ thuộc đơn giá egress?

---

## 6. Chuyển giao

Không có đáp án trong bài.

**Bạn làm một MMO thế giới mở**, không có "trận". Chợ trung tâm thường xuyên có **400 người** đứng trong tầm nhìn của nhau: phần lớn đứng yên buôn bán, và mỗi người mặc trang phục riêng nên state của họ **không phải 10 byte mà là 60 byte** (id trang bị, màu nhuộm, pet, danh hiệu).

1. Một gói chứa được bao nhiêu người? Tỉ lệ so với 400 là bao nhiêu, và gap trung bình nếu chia đều là bao nhiêu ms ở 20 Hz?
2. Phần lớn 60 byte kia **không đổi trong hàng giờ**. Cái đó gợi ý tách state thành mấy loại, và loại nào không nên nằm trong dòng snapshot theo tick chút nào? Chi phí của việc tách là gì khi có người vừa đổi trang phục?
3. Bảng trọng số mục 3.5 có khoản "đang bắn mình +8". Ở chợ không ai bắn ai. Khoản nào thay thế nó, và bạn lấy tín hiệu đó từ đâu trong code hiện có?
4. Người chơi mở cửa sổ giao dịch với một người khác. Trọng số của **đúng một entity đó** phải đổi thế nào, và tại sao đây là ví dụ cho thấy trọng số không thể chỉ là hàm của hình học?
5. Chợ đông tới mức ngay cả `w = 1` cũng cho gap 8 giây. Có hai hướng: giảm tick rate riêng cho vùng chợ, hoặc thu nhỏ bán kính AOI trong vùng chợ. Mỗi hướng hỏng theo kiểu gì từ góc nhìn người chơi?
6. **Câu khó nhất:** priority accumulator chạy **cho từng người xem** — 400 người trong chợ là 400 hàng ưu tiên, mỗi hàng 400 entity, tức **160.000 điểm phải cộng và sắp lại mỗi tick**. Bài 8 đo `sim.Step` với 100.000 entity tốn 119 µs (0,71% một tick 60 Hz), nhưng đây là sắp xếp chứ không phải cộng, độ phức tạp khác hẳn. Ước lượng chi phí một tick của phần priority, chỉ ra nó vượt hay không vượt ngân sách, và nếu vượt thì **thay đổi nào hạ được độ phức tạp mà vẫn giữ tính chất "không ai chết đói"** — nói rõ tính chất nào bạn phải hy sinh để đổi lấy nó.

Câu 6 là chỗ chương 6 đụng chương 9: kỹ thuật tiết kiệm băng thông nào cũng tiêu CPU, và ở một mật độ nào đó thì CPU vỡ trước.

---

## 7. Tóm tắt

- **Trần một gói tính được, không phải đoán:** `1.200 − 16 header = 1.184 B → 118 entity` ở 10 B/entity; chừa 184 B cho message reliable của bài 14 còn **100 entity mỗi tick**. Tầm nhìn 200 entity cho gói 2.016 B → 2 mảnh → loss 5% thành **9,75%** (bài 15).
- **Cắt entity xa là bug, không phải tối ưu.** `sort` theo khoảng cách rồi lấy top-100 khiến **100/200 entity không bao giờ được cập nhật**, vì thứ hạng không đổi giữa các tick. Cộng điểm mà không reset cũng cho ra **đúng 100/200 entity chết đói** sau 20.000 tick — cùng hậu quả, khác lớp sơn.
- **Cả cơ chế nằm ở hai dòng:** `score += weight` mỗi tick, `score = 0` sau khi gửi. Cộng dồn cho công bằng **có trọng số**; reset cho **công bằng**.
- **Tần suất theo hạng dẫn ra từ `Σ nᵢ/gapᵢ = K`.** Với 200 entity, K = 100, trọng số 10/4/2/1: gap **50 / 50 / 100 / 225 ms** ở 20 Hz, p99 nhóm xa nhất 250 ms, và **0 entity chết đói ở cả bốn nhóm**.
- **Trọng số phải có sàn `+1`**, dùng hàm trơn thay bậc thang, và cộng mỗi tick chứ không nhân vào điểm đã tích (nhân là tràn float32 sau vài nghìn tick).
- **Ranh giới là 196,48 kbps** — chi phí một luồng gói đầy ở 20 Hz (`1.228 × 20 = 24.560 B/s`). Trên ngưỡng đó MTU chặn trước nên client 1 Mbps và 10 Mbps nhận **cùng một K**; dưới ngưỡng đó client chặn trước: 128 kbps chỉ chở được **75 entity/tick**. `K` là thuộc tính của một kết nối, dò bằng ack rate và RTT chứ không hỏi client.
- **Hoá đơn egress:** 409,84 KB/s không tối ưu so với **24,56 KB/s** có chương 6 — **16,69 lần**. Ở 100.000 CCU, 0,09 USD/GB *(giả định, dải thường gặp 0,02–0,12)*: **572.936 USD/tháng** so với 9.560.748. Egress tuyến tính theo CCU, không có economy of scale; **1 byte/entity = 46.656 USD/tháng** ở quy mô đó.
- **Chương 6 ở kịch bản bản đồ đông: ×13,85 payload** — quantization ×2,77 (hằng số), AOI ×2,50 (lớn dần theo mật độ; ×24,95 ở kịch bản thưa của bài 26), priority ×2 (chỉ kích hoạt khi vượt trần gói).

→ **Chương 7 — Kiến trúc & scale.** Sáu chương vừa rồi lo một trận đấu chạy tốt. Bài 28 mở câu hỏi khác hẳn: một máy chạy được bao nhiêu trận, và khi không đủ thì cắt thế giới ở đâu.
