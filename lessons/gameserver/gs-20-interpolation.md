# Bài 20 — Entity interpolation & extrapolation

## 1. Mục tiêu

Sau bài này bạn có thể:

- Giải thích vì sao **prediction không áp dụng được cho người khác**, và chỉ ra chính xác thứ bạn thiếu.
- Tính **bước nhảy bằng centimet** mà một entity 20 Hz tạo ra trên màn hình 60 fps nếu không nội suy.
- Đặt độ sâu đệm bằng công thức **`d ≥ (m+1)·T + J`** thay vì chép 100 ms từ tài liệu.
- **Định giá lại "cắt buffer 100 → 50 ms miễn phí" của bài 8** bằng số khoảng đói mỗi phút — kể cả khi mất gói theo cụm.
- Quyết định khi nào ngoại suy, được bao lâu, và tính **sai số mét** của một lần đoán trượt.
- Nội suy góc quay mà không quay ngược cả vòng, và nhận ra thuộc tính nào **không nội suy được**.

---

## 2. Triệu chứng

Hai ticket, cùng một game, cùng một build:

> **#4471** — "Đối thủ dịch chuyển giật cục. Nó không chạy, nó **nhấp nháy từng đoạn**. Bắn theo kiểu này thì đoán chứ không ngắm."
>
> **#4488** — "Đối thủ **trượt như trên băng**. Nó chạy quá đích rồi bị giật ngược lại."

Đọc lướt thì đây là hai bug, gắn hai nhãn, giao hai người. Không phải: đây là **một núm vặn, vặn về hai đầu** — #4471 là đệm quá nông, #4488 là đệm cạn rồi client phải tự đoán. Cùng một build ra được cả hai vì hai người chơi ở hai mạng khác nhau.

Núm ấy là **100 ms** — chặng dài nhất trong ngân sách 182 ms của bài 8, chiếm **55%**, và được bài 8 xếp hạng nhất trong bốn cách cắt độ trễ: 100 → 50 ms được **−50 ms, không tốn gì**. Bài này trả hoá đơn cho chữ "không tốn gì" đó: nó có giá, đo được, và ở mạng 1% mất gói giá của nó là **gấp 100 lần số lần giật**.

---

## ⏸ Dừng lại — đoán trước #1

Bài 18 và 19 vừa dựng xong client prediction: apply input ngay, không chờ server, reconcile khi server trả lời — độ trễ cảm nhận của **chính người bấm** về gần 0 ms.

**Vì sao không dùng đúng kỹ thuật đó cho 49 người chơi còn lại trên màn hình?**

```
(a) Được, chỉ là tốn CPU gấp 50 lần nên không ai làm
(b) Không được, vì prediction cần input mà bạn không có input của họ
(c) Không được, vì reconciliation chỉ chạy cho entity server gán cho bạn
(d) Được — đó chính là cách các game AAA làm, gọi là "remote prediction"
```

---

## 3. Lý thuyết

### 3.1 Bạn thiếu đúng một thứ, và nó không thể có

Đáp án là **(b)**, và lý do quyết định toàn bộ phần còn lại của bài.

Prediction ở bài 18 chạy được nhờ một tài sản mà client có **trước cả server**: input của chính bạn. Bạn bấm W lúc t; ở đúng khoảnh khắc đó client đã cầm dữ kiện mà server phải chờ 20 ms nữa mới nhận. Prediction không phải phép bói — nó là **chạy trước bằng dữ liệu thật**. Với người khác, tài sản đó không tồn tại và không cách nào có được:

| | Của bạn (bài 18) | Của người khác (bài này) |
|---|---|---|
| Input | có **ngay**, trước server 20 ms | **không bao giờ có** |
| Dữ liệu | liên tục, mọi frame | **rời rạc, 20 Hz** — mỗi 50 ms một mẫu |
| Sai thì chữa | reconciliation (bài 19) | không có gì để reconcile — bạn không mô phỏng họ |
| Bài toán thật | *"tôi biết sẽ xảy ra gì, vẽ trước đi"* | *"20 mẫu mỗi giây, vẽ 60 khung hình"* |

Cột phải không phải phiên bản khó hơn của cột trái. Nó là **bài toán khác hẳn**: nội suy một tín hiệu lấy mẫu thưa, không phải mô phỏng chạy trước.

Có nhánh cho client tự mô phỏng người khác từ input — nhưng nó đòi determinism tuyệt đối trên máy người lạ, tức toàn bộ chương 3, và đó là **lockstep/rollback** của bài 22.

### 3.2 20 mẫu vào, 60 khung hình ra — bước nhảy 25 cm

```
snapshot 20 Hz   → một mẫu vị trí mới mỗi   1000/20 = 50 ms
render   60 fps  → một khung hình mỗi      1000/60 = 16,67 ms
                   50 / 16,67 = 3,0 khung hình cho MỖI mẫu
```

Vẽ thẳng vị trí mới nhất thì ba khung hình liên tiếp trùng nhau, rồi khung thứ tư nhảy một phát. Ở **5 m/s**:

```
5 m/s × 0,050 s = 0,25 m = 25 cm mỗi bước nhảy
```

25 cm là khoảng **nửa chiều rộng thân người**: nhân vật không di chuyển, nó **dịch chuyển tức thời nửa thân mình, 20 lần mỗi giây**. Đó là ticket #4471 — và không phải lỗi mạng, vì kể cả 0% mất gói và jitter bằng 0 thì hiện tượng vẫn y nguyên. Nó là hệ quả thuần tuý của **tần số lấy mẫu thấp hơn tần số hiển thị**. Lên 60 Hz thì bước nhảy còn 8,3 cm — vẫn thấy, và bài 8 đã tính hoá đơn: gấp ba băng thông.

### 3.3 Chữa bằng cách cố tình đi chậm lại

Cách chữa nằm ở **đồng hồ render của client**. Client không vẽ "trạng thái mới nhất"; nó giữ hàng đợi snapshot và vẽ thế giới tại **`t_render = t_now − d`**. Vì lùi lại, tại `t_render` nó gần như luôn có **hai** snapshot kẹp hai bên, và vị trí vẽ ra là lerp giữa chúng:

```go
a, b := buf.Bracket(tRender)          // a.T <= tRender <= b.T
if b == nil {                          // hết dữ liệu -> mục 3.8
    return extrapolate(a, tRender-a.T)
}
alpha := float32(tRender-a.T) / float32(b.T-a.T)   // 0..1
pos := a.Pos.Add(b.Pos.Sub(a.Pos).Scale(alpha))
```

<svg viewBox="0 0 720 250" role="img" aria-labelledby="gs20-a-t gs20-a-d" style="width:100%;height:auto">
<title id="gs20-a-t">Đầu render lùi 100 ms so với snapshot mới nhất</title>
<desc id="gs20-a-d">Trục thời gian với snapshot đến mỗi 50 mili giây. Đầu render đặt tại thời điểm hiện tại trừ 100 mili giây, luôn nằm giữa hai snapshot đã nhận, nên mọi khung hình đều nội suy được. Vùng 100 mili giây bên phải đầu render là dữ liệu đã có nhưng cố tình chưa dùng.</desc>
<line x1="40" y1="150" x2="690" y2="150" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5"/>
<rect x="450" y="60" width="200" height="90" fill="#8b5cf6" fill-opacity="0.16"/>
<text x="550" y="50" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">d = 100 ms — đã nhận nhưng cố tình CHƯA vẽ</text>
<line x1="450" y1="60" x2="450" y2="150" stroke="#8b5cf6" stroke-width="2"/>
<line x1="650" y1="60" x2="650" y2="150" stroke="currentColor" stroke-opacity="0.5" stroke-dasharray="4 3"/>
<circle cx="50" cy="150" r="6" fill="#84cc16" fill-opacity="0.75"/>
<circle cx="150" cy="150" r="6" fill="#84cc16" fill-opacity="0.75"/>
<circle cx="250" cy="150" r="6" fill="#84cc16" fill-opacity="0.75"/>
<circle cx="350" cy="150" r="6" fill="#84cc16" fill-opacity="0.75"/>
<circle cx="450" cy="150" r="6" fill="#84cc16" fill-opacity="0.75"/>
<circle cx="550" cy="150" r="6" fill="#84cc16" fill-opacity="0.75"/>
<circle cx="650" cy="150" r="6" fill="#84cc16" fill-opacity="0.75"/>
<text x="50" y="176" text-anchor="middle" font-size="9" fill="currentColor">S0</text>
<text x="150" y="176" text-anchor="middle" font-size="9" fill="currentColor">S1</text>
<text x="250" y="176" text-anchor="middle" font-size="9" fill="currentColor">S2</text>
<text x="350" y="176" text-anchor="middle" font-size="9" fill="currentColor">S3</text>
<text x="450" y="176" text-anchor="middle" font-size="9" fill="currentColor">S4</text>
<text x="550" y="176" text-anchor="middle" font-size="9" fill="currentColor">S5</text>
<text x="650" y="176" text-anchor="middle" font-size="9" fill="currentColor">S6</text>
<text x="350" y="196" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.75">snapshot cách nhau T = 50 ms</text>
<text x="650" y="196" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.75">t_now</text>
<polygon points="480,150 472,136 488,136" fill="#f59e0b" fill-opacity="0.9"/>
<line x1="480" y1="136" x2="480" y2="104" stroke="#f59e0b" stroke-width="2"/>
<text x="480" y="96" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">đầu render</text>
<text x="480" y="82" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.8">t_now − 100</text>
<text x="500" y="128" font-size="9" fill="currentColor" opacity="0.85">lerp giữa S4 và S5, alpha = 0,3</text>
<text x="40" y="228" font-size="10" fill="currentColor">Mỗi khung hình 16,67 ms: đầu render bò đều sang phải, luôn có hai snapshot kẹp hai bên.</text>
<text x="40" y="242" font-size="10" fill="currentColor" opacity="0.8">Mất S5 thì đầu render vẫn còn 50 ms nữa mới chạm S6 — đó là toàn bộ giá trị của cái đệm.</text>
</svg>

Được: chuyển động **hoàn toàn mượt** ở mọi FPS, kể cả khi snapshot đến lệch nhịp — nhịp vẽ do đồng hồ client, không do nhịp gói tới. Đây đúng là jitter buffer bài 15 mô tả. Mất: bạn **luôn nhìn thấy người khác ở quá khứ**, đúng `d` mili giây. Mục 4.3 tính nó ra mét.

### 3.4 Đệm sâu bao nhiêu — công thức, không phải số chép lại

Suy từ trường hợp xấu nhất. Ngay **trước** khi snapshot kế tiếp tới là lúc dữ liệu cũ nhất; nếu lúc đó đầu render đã vượt qua snapshot mới nhất trong tay thì hết cái để kẹp — ràng buộc đó cho `d ≥ T` ngay cả khi mạng hoàn hảo. Thêm `m` gói liên tiếp mất thì mốc dùng được lùi thêm `m·T`; thêm jitter `J` (bài 15) thì gói muộn thêm `J`:

> **`d ≥ (m + 1)·T + J`**
> `T` = chu kỳ snapshot · `m` = số gói liên tiếp muốn chịu được · `J` = jitter p99

Thay `T` = 50 ms và đọc ngược lại con số 100 ms huyền thoại:

| `d` | Tính theo T | Chịu được `m` gói liên tiếp | Biên jitter `J` còn lại | Cộng vào ngân sách 182 ms |
|---|---|---|---|---|
| **50 ms** | 1 T | **0** | 0 ms | 132 ms tổng (−50) |
| **75 ms** | 1,5 T | **0** | 25 ms | 157 ms (−25) |
| **100 ms** | 2 T | **1** | **0 ms** | 182 ms — mặc định |
| **150 ms** | 3 T | **2** | 0 ms | 232 ms (+50) |

Hai điều lộ ra, cả hai đều không hiển nhiên.

**Một.** 100 ms không phải con số tròn cho đẹp: nó là **đúng 2 chu kỳ snapshot ở 20 Hz**, mức tối thiểu để chịu một gói rơi. Sang 30 Hz thì con số đúng là 66,67 ms. Đệm đo bằng **khoảng snapshot**, không đo bằng mili giây — chép 100 ms sang một game 30 Hz là trả dư 33 ms cho không.

**Hai.** Cùng 100 ms ấy bạn chỉ mua được **một trong hai**: một gói rơi (m = 1, J = 0) **hoặc** 50 ms jitter (m = 0, J = 50). Không mua được cả hai. Người chơi Wi-Fi jitter p99 30 ms mà muốn chịu 1 gói rơi thì con số đúng là `2 × 50 + 30 = 130 ms` — cao hơn mặc định, không phải thấp hơn.

Dòng 1,5 T dễ chọn nhầm nhất: trông như thoả hiệp giữa 50 và 100, nhưng **không mua thêm khả năng chịu mất gói nào** — vẫn `m = 0`, 25 ms thêm vào đi hết vào biên jitter. Nó cùng hạng bảo hiểm với 50.

---

## ⏸ Dừng lại — đoán trước #2

Hộp quan trọng nhất của bài. Bài 8 nói: cắt đệm **100 → 50 ms** được **−50 ms, không tốn gì**.

Bây giờ bạn đã biết 100 ms = 2 T chịu được 1 gói rơi, còn 50 ms = 1 T chịu được 0 gói.

**Trên mạng mất gói 1% (mạng có dây tử tế, mất độc lập), snapshot 20 Hz, cắt đệm 100 → 50 ms làm số lần giật mỗi phút thay đổi thế nào?**

```
(a) Không đổi — 1% quá nhỏ để thấy khác biệt
(b) Tăng khoảng gấp đôi
(c) Tăng khoảng 10 lần
(d) Tăng khoảng 100 lần
```

Câu hỏi phụ, khó hơn và sẽ trả lời ở mục 3.6: **nếu mất gói theo CỤM** như bài 15 đã đo, thì đi ngược lại — nâng đệm từ 100 lên 150 ms mua được bao nhiêu?

---

### 3.5 Hoá đơn của việc cắt: bảng xác suất

Một **khoảng bị đói** là chu kỳ snapshot mà đầu render không tìm được snapshot nào phía sau để kẹp — client buộc phải ngoại suy hoặc đứng hình. Với đệm chịu `m` gói, nó xảy ra khi **`m + 1` gói gần nhất đều mất**. Giả định: **mất độc lập**, xác suất `p` mỗi gói; ở 20 Hz có **1.200 khoảng snapshot mỗi phút**.

```
P(đói) = p^(m+1)          số khoảng đói mỗi phút = 1200 × p^(m+1)
```

| Đệm | m | p = 1% | p = 5% | p = 10% |
|---|---|---|---|---|
| **50 ms** (1 T) | 0 | **12 /phút** | **60 /phút** | **120 /phút** |
| **75 ms** (1,5 T) | 0 | **12 /phút** | 60 /phút | 120 /phút |
| **100 ms** (2 T) | 1 | **0,12 /phút** (7,2 /giờ) | 3 /phút | 12 /phút |
| **150 ms** (3 T) | 2 | 0,0012 /phút (**1 lần mỗi 13,9 giờ**) | 0,15 /phút | 1,2 /phút |

Đáp án hộp #2 là **(d)**: `12 / 0,12 = 100` lần. Mỗi bậc đệm chia số lần giật cho `1/p` — ở 1% là chia 100, ở 10% là chia 10. Trả lời thẳng câu hỏi bài 8 để mở:

> **Cắt 100 → 50 ms không miễn phí. Nó đổi 50 ms độ trễ lấy việc đi từ "7,2 lần giật mỗi giờ" sang "12 lần giật mỗi phút" ở mạng 1%.** Đó là giá, và nó không nằm trên hoá đơn nào nên dễ tưởng là không có.

Công bằng với bài 8: theo tiêu chí *ms mua được trên mỗi đồng bỏ ra* thì C vẫn hạng nhất, và bài 8 đã ghi *"đổi lấy rủi ro: mất packet là thấy giật"*. Bài này chỉ **đổi chữ "rủi ro" thành con số** — và con số ấy đổi câu trả lời theo từng người: người 4G loss 5% đang giật 3 lần/phút ở 100 ms, cắt xuống 50 là 60 lần — người này cần **nhiều hơn** 100 ms chứ không ít hơn. Tức là **hầu như không ai nên cắt xuống 50 ms** theo cách bài 8 phác ra. Mục 4.2 sẽ chỉ ra cách cắt khác: 41,67 ms mà giữ nguyên bảo hiểm 1 gói.

### 3.6 Bảng trên giả định mất độc lập — bài 15 đã chứng minh là không

Bài 15 đo bằng mô phỏng Gilbert–Elliott: mất gói thật đi **theo cụm**, cụm trung bình khoảng 8 gói, ở mức 5% thì **76,98% số đợt dài từ 3 gói liên tiếp trở lên**, đợt dài nhất 99 gói. Điều đó phá cột trụ của bảng 3.5: với `L = 8`, xác suất mất tiếp khi đang mất là `c = 1 − 1/8 = 0,875`, nên

```
P(đói) = p × c^m        thay vì        p^(m+1)
```

| Đệm | m | p = 1% độc lập | p = 1% **theo cụm** | Đệm sâu hơn mua được |
|---|---|---|---|---|
| 50 ms | 0 | 12 /phút | 12 /phút | — |
| 100 ms | 1 | **0,12 /phút** | **10,5 /phút** | giảm 12,5% |
| 150 ms | 2 | 0,0012 /phút | **9,19 /phút** | giảm thêm 12,5% |

Ở 1% loss theo cụm, đệm 100 ms giật **10,5 lần mỗi phút** thay vì 0,12 — **gấp 87,5 lần** dự đoán của mô hình độc lập. Nâng lên 150 ms, tức trả thêm 50 ms độ trễ cho mọi người chơi mãi mãi, chỉ kéo 10,5 xuống 9,19.

> **Với mất gói theo cụm, đệm sâu hơn gần như không mua được gì.** Mất một gói và mất tám gói liên tiếp là cùng một sự kiện với xác suất gần bằng nhau; đệm chỉ che được cái thứ nhất.

Bài 15 còn có con số đóng lại tranh luận: ở loss 5% theo cụm, **p99 của một lần đứt là 1.750 ms**. Không đệm nào che 1,75 giây — 150 ms không, 500 ms cũng không, và đệm 2 giây thì trò chơi hết chơi được.

Ba hệ quả, ngược với "cứ tăng đệm cho chắc":

1. **Đệm là bảo hiểm cho jitter và mất gói LẺ TẺ.** Đợt mất dài là bệnh khác, thuốc khác — giữ gói dưới MTU (bài 15), redundancy, delta có baseline (bài 25).
2. **Đừng đặt đệm theo tỉ lệ loss trung bình.** Hai mạng cùng 5%, một độc lập một cụm, cần hai cấu hình khác hẳn. Đo **độ dài đợt mất**, không chỉ đo tỉ lệ.
3. **Vượt quá 2 T thì lợi ích gần như tắt** — lý do kỹ thuật để nói không với "tăng đệm cho êm": nó tiêu ngân sách độ trễ để mua 12,5%.

*(Số cụm ở đây suy từ mô hình Gilbert–Elliott độ dài cụm trung bình 8 gói của bài 15 — bậc độ lớn, không phải hằng số. Độ dài cụm thật khác nhau theo Wi-Fi, 4G, có dây; phải tự đo.)*

### 3.7 Nội suy cái gì — ba loại thuộc tính

Snapshot chở nhiều hơn vị trí, và không phải thứ gì cũng lerp được.

**Vị trí, vận tốc, máu, kích thước — lerp tuyến tính là đúng.** Đại lượng liên tục trong không gian phẳng; ở 50 ms phần lớn chuyển động người không kịp đổi hướng nhiều.

**Góc quay — lerp tuyến tính là BẪY.** Góc sống trên vòng tròn, không sống trên đường thẳng. Entity quay từ **359°** sang **1°**, tức nhích **2°** qua vạch 0:

```
lerp thẳng:  359 → 269 → 180 → 90 → 1     quay 358° NGƯỢC chiều
đúng:        359 → 0 → 1                  quay 2° đúng chiều
                                          sai gấp 179 lần
```

Ở giữa quãng, nhân vật **quay lưng hoàn toàn** (alpha = 0,5 cho ra đúng 180°) rồi quay ngoắt lại. Người chơi gọi đó là "đối thủ giật đầu 360 độ" và đổ cho hack; thủ phạm là phép lerp thiếu ba dòng:

```go
func lerpAngle(a, b, alpha float32) float32 {
    d := math32.Mod(b-a+540, 360) - 180   // đưa hiệu về (-180, 180]
    return a + d*alpha
}
```

Bẫy chỉ nổ ở đúng một chỗ trên vòng tròn nên test tay gần như không chạm — lên production rồi mới lộ. Quaternion 3D cùng bệnh: phải kiểm dấu tích vô hướng và lật một quaternion trước khi slerp.

**Trạng thái rời rạc — KHÔNG nội suy được.** `isFiring`, `weaponID`, `isDead`. "Đang bắn 40%" không có nghĩa gì; lerp một enum ra số thực rồi làm tròn thì entity nhấp nháy giữa hai vũ khí. Ba cách xử lý:

| Loại | Cách đúng | Vì sao |
|---|---|---|
| Cờ (`isFiring`, `isDead`) | lấy từ snapshot **trước** đầu render, giữ tới snapshot sau | thà trễ tối đa 50 ms còn hơn nhấp nháy |
| Sự kiện tức thời (nổ súng, trúng đạn) | **không** đi qua snapshot — kênh event tin cậy | mất một snapshot là mất luôn sự kiện |
| Enum/ID (vũ khí, skin) | đổi ngay khi thấy giá trị mới | không có trạng thái trung gian |

Dòng giữa là lý do bài 23 tách **event-based replication** khỏi snapshot: hai loại dữ liệu này chịu mất gói theo hai kiểu khác hẳn.

---

## ⏸ Dừng lại — đoán trước #3

Đợt mất gói của mục 3.6 vừa nuốt ba snapshot liên tiếp; đầu render đã vượt qua snapshot cuối cùng trong tay. Phương án hiển nhiên: **ngoại suy** (dead reckoning) — chạy tiếp theo vận tốc cuối.

**Một entity chạy 5 m/s. Ngay lúc dữ liệu đứt, nó bẻ lái 90 độ. Client ngoại suy 100 ms. Khi gói thật tới, vị trí client đang vẽ sai bao nhiêu mét?**

```
(a) 0,25 m — đúng một bước snapshot
(b) 0,50 m — quãng đường đi trong 100 ms
(c) 0,71 m
(d) 1,00 m
```

---

### 3.8 Ngoại suy, và vì sao nó tạo hiệu ứng cao su

Đáp án **(c) 0,71 m**. Hai vị trí — thật và đoán — là hai đầu của hai vector cùng dài `5 × 0,1 = 0,5 m` lệch nhau 90°, nên khoảng cách là cạnh huyền:

```
sai số = v·Δt · 2·sin(θ/2) = 0,5 × 2·sin45° = 0,5 × 1,4142 = 0,7071 m
```

Bảng đầy đủ từ công thức đó, `v` = 5 m/s:

| Ngoại suy | Bẻ 45° | Bẻ 90° | Quay đầu 180° |
|---|---|---|---|
| 50 ms (1 gói mất) | 0,19 m | **0,35 m** | 0,50 m |
| 100 ms (2 gói) | 0,38 m | **0,71 m** | 1,00 m |
| 200 ms (4 gói) | 0,77 m | **1,41 m** | **2,00 m** |

Thang tham chiếu: thân người rộng khoảng **0,5 m**. Ngoại suy **100 ms qua một cú bẻ 90° đặt nhân vật lệch hơn một thân mình** — đủ để bạn bắn vào không khí mà tin chắc đã ngắm trúng. Phần "cao su" là chuyện tiếp theo: gói thật tới, client đang vẽ cách đó 0,71 m, và nó có hai lựa chọn, cả hai đều tệ:

<svg viewBox="0 0 720 250" role="img" aria-labelledby="gs20-b-t gs20-b-d" style="width:100%;height:auto">
<title id="gs20-b-t">Ngoại suy trượt hướng và cú kéo giật về</title>
<desc id="gs20-b-d">Entity chạy sang phải năm mét mỗi giây rồi bẻ trái chín mươi độ. Client ngoại suy tiếp theo hướng cũ nên vẽ entity ở phía phải, cách vị trí thật không phẩy bảy mốt mét. Khi snapshot thật tới, entity bị kéo ngang về đúng chỗ, tạo hiệu ứng cao su.</desc>
<line x1="60" y1="180" x2="300" y2="180" stroke="currentColor" stroke-opacity="0.55" stroke-width="2"/>
<polygon points="300,180 290,175 290,185" fill="currentColor" fill-opacity="0.55"/>
<text x="150" y="200" font-size="10" fill="currentColor">đường đã biết · 5 m/s</text>
<circle cx="300" cy="180" r="6" fill="#84cc16" fill-opacity="0.8"/>
<text x="300" y="216" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">S_cuối</text>
<text x="300" y="230" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.75">dữ liệu đứt ở đây</text>
<line x1="300" y1="180" x2="480" y2="180" stroke="#ef4444" stroke-width="2" stroke-dasharray="6 4"/>
<polygon points="480,180 468,174 468,186" fill="#ef4444"/>
<circle cx="480" cy="180" r="7" fill="#ef4444" fill-opacity="0.35" stroke="#ef4444"/>
<text x="490" y="176" font-size="10" font-weight="bold" fill="currentColor">client VẼ ở đây</text>
<text x="490" y="190" font-size="9" fill="currentColor" opacity="0.8">ngoại suy 100 ms theo hướng cũ</text>
<line x1="300" y1="180" x2="300" y2="60" stroke="#3b82f6" stroke-width="2"/>
<polygon points="300,60 294,72 306,72" fill="#3b82f6"/>
<circle cx="300" cy="60" r="7" fill="#3b82f6" fill-opacity="0.35" stroke="#3b82f6"/>
<text x="240" y="56" text-anchor="end" font-size="10" font-weight="bold" fill="currentColor">vị trí THẬT</text>
<text x="240" y="70" text-anchor="end" font-size="9" fill="currentColor" opacity="0.8">nó đã bẻ trái 90°</text>
<text x="200" y="120" text-anchor="end" font-size="9" fill="currentColor" opacity="0.75">0,5 m</text>
<line x1="480" y1="180" x2="300" y2="60" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="3 3"/>
<text x="420" y="112" font-size="11" font-weight="bold" fill="currentColor">sai 0,71 m</text>
<text x="420" y="128" font-size="9" fill="currentColor" opacity="0.8">gói thật tới → kéo giật về đây</text>
<text x="60" y="40" font-size="11" font-weight="bold" fill="currentColor">Ngoại suy đoán HƯỚNG, và hướng là thứ đổi được tức thời.</text>
</svg>

- **Nhảy thẳng về vị trí đúng** — bước nhảy 0,71 m trong một khung hình. Chính là triệu chứng #4471, nhưng to gấp gần ba lần bước nhảy 25 cm ở mục 3.2.
- **Trượt dần về vị trí đúng** trong vài khung hình — mượt hơn, nhưng trong lúc trượt entity đi **ngược hoặc chéo** so với hướng nó đang quay mặt. Đây đúng là "trượt như trên băng" của ticket #4488.

Không có lựa chọn thứ ba, và ngoại suy chính xác hơn cũng không tạo ra lựa chọn thứ ba. Lý do nằm ở gốc:

> Ngoại suy giả định **gia tốc bằng 0**. Nhưng thứ duy nhất khiến người chơi thú vị chính là họ **đổi hướng bất ngờ**. Ngoại suy sai chính xác ở những khoảnh khắc quan trọng nhất, và đúng ở những khoảnh khắc chả ai để ý.

Kéo theo một kết luận trái trực giác: khi khoảng đứt dài, **đứng im tốt hơn đoán tiếp**. Đứng im ở vị trí cuối thì lệch tối đa `v·Δt` = 1,0 m sau 200 ms; ngoại suy qua một cú quay đầu 180° lệch **2,0 m** — gấp đôi — và tặng thêm cú giật ngược. Sai một hướng rẻ hơn sai hai hướng.

---

## 4. Chọn chế độ, và định giá lại bài 8

### 4.1 Khi nào nội suy, khi nào ngoại suy

**Nội suy là mặc định; ngoại suy là bản vá khẩn cấp có hạn dùng tính bằng chục mili giây.** Theo độ dài khoảng đứt, ở `v` = 5 m/s:

| Đứt | Sai số ngoại suy (bẻ 90°) | Nên làm |
|---|---|---|
| ≤ 50 ms (1 gói) | 0,35 m | **Ngoại suy.** Cú kéo về không lớn hơn bước nhảy 25 cm bao nhiêu |
| 50–150 ms | 0,35 – 1,06 m | Ngoại suy **giảm dần vận tốc về 0**, chặn cứng ở 150 ms |
| > 150 ms | > 1,06 m | **Đóng băng** entity, làm mờ / báo mất kết nối. Đừng đoán |
| > 1 s | — | Xoá khỏi màn hình. Đoán tiếp là **nói dối người chơi** |

Theo thể loại — vì cùng 0,71 m có ý nghĩa khác hẳn ở mỗi loại game:

| Thể loại | Chế độ | Vì sao |
|---|---|---|
| **FPS / battle royale** | nội suy, ngoại suy ≤ 50 ms | Đầu người rộng vài chục cm; sai 0,71 m là trượt chắc |
| **Đua xe** | **ngoại suy mạnh, tới 200 ms** | Quán tính cao, xe **không đổi hướng tức thời** — gia tốc ~0 gần đúng |
| **MMO / RPG** | nội suy, đệm dày (150 ms+) | Không cần chính xác dưới mét; đổi độ trễ lấy mượt là lãi |
| **MOBA / RTS** | nội suy thuần, **không ngoại suy** | Chuyển động do lệnh chỉ điểm, đổi hướng tuỳ ý — đoán là sai |
| **Fighting game** | **cả hai đều không dùng** | Không chịu nổi độ trễ nào; đi nhánh rollback bài 22 |

Dòng "đua xe" cho tiêu chí tổng quát: **ngoại suy tốt tỉ lệ thuận với quán tính.** Tên lửa bay thẳng thì ngoại suy gần như hoàn hảo; người đi bộ đổi hướng trong một frame thì đó chỉ là đoán mò có công thức.

### 4.2 Đệm đo bằng khoảng snapshot — điều đó đổi xếp hạng của bài 8

Bài 8 vặn từng núm một, giữ nguyên các núm khác. Cách phân tích đúng, nhưng bỏ lỡ một chuyện: **hai núm "snapshot rate" và "buffer nội suy" khoá vào nhau**, vì `d = 2T` và `T = 1000/f`. Nâng snapshot rate cắt độ trễ **hai lần** — ở chặng chờ snapshot (`T/2`) và ở đệm (`2T`).

| Snapshot rate | `T` | Chờ snapshot `T/2` | Đệm `2T` | **Tổng hai chặng** | So với 20 Hz | Băng thông |
|---|---|---|---|---|---|---|
| **20 Hz** | 50 ms | 25 ms | 100 ms | **125 ms** | — | ×1 |
| **30 Hz** | 33,33 ms | 16,67 ms | 66,67 ms | **83,33 ms** | **−41,67 ms** | **+50%** |
| **60 Hz** | 16,67 ms | 8,33 ms | 33,33 ms | **41,67 ms** | **−83,33 ms** | **×3** |

Bài 8 định giá "snapshot 20 → 30 Hz" là **−8,3 ms**. Tính cả tác động lên đệm thì nó là **−41,67 ms**, gấp **5 lần** — và nó cắt được ngần ấy mà **giữ nguyên bảo hiểm 1 gói rơi**, thứ mà cắt đệm trực tiếp đánh mất. Xếp theo tiêu chí "mua bao nhiêu ms mà **không** mất bảo hiểm", thứ tự bốn cách của bài 8 đổi: snapshot 20 → 30 Hz **kèm hạ đệm về 2 T** lên hạng nhất với −41,67 ms (giá: băng thông +50%), trên cả RTT 40 → 20 ms (−20 ms, tiền hạ tầng). Đệm 100 → 50 ms vẫn cắt được nhiều nhất về mặt số học (−50 ms) nhưng là cách duy nhất **trả bằng bảo hiểm**; sim 60 → 128 Hz vẫn đứng cuối với −4,4 ms và CPU ×2.

Bài 8 không sai — nó trả lời đúng câu "vặn một núm thì được gì". Bài này trả lời câu tiếp theo: **hai núm ấy không độc lập, và cách rẻ nhất để rút ngắn đệm không phải là rút ngắn đệm.** Chốt bằng **đo trước**: `T` do bạn chọn, `m` do **hình dạng** mất gói quyết định, `J` do jitter p99. Ba số đó cho ra `d`, và `d` khác nhau theo từng người chơi — lý do các engine hiện đại để `d` **thích ứng động** thay vì là hằng số trong config.

### 4.3 Cái không tránh được: bạn luôn nhìn quá khứ

Cộng toàn bộ độ lệch giữa **cái bạn thấy** và **cái server biết**, với cấu hình chuẩn của bài 8 (RTT 40 ms, snapshot 20 Hz, đệm 100 ms):

```
gói từ server tới bạn        RTT/2  =  20 ms
đệm nội suy                     d   = 100 ms
                                     --------
độ lệch tối thiểu                    = 120 ms      ->  ở 5 m/s là 0,60 m
cộng chờ snapshot trung bình  T/2  =  25 ms
                                     --------
độ lệch trung bình thực tế           = 145 ms      ->  0,725 m
```

**Bạn không bao giờ nhìn thấy hiện tại.** Hơn nửa mét sai lệch, thường trực, với mọi đối thủ, kể cả khi mạng hoàn hảo và không mất gói nào. Không cấu hình nào đưa nó về 0 — mục 3.4 đã chứng minh `d ≥ T` là ràng buộc cứng.

Khi bạn nhả chuột vào đúng giữa đầu đối thủ, cái đầu ấy trên server đã rời chỗ đó **145 ms trước** và đi tiếp 0,725 m. Nếu server phân xử bằng vị trí hiện tại của nó thì bạn trượt, dù đã ngắm hoàn hảo vào đúng thứ màn hình cho bạn thấy. Server buộc phải chọn: chấp nhận bạn trượt, hoặc **tua thế giới ngược lại 145 ms**. Không có phương án thứ ba.

---

## 5. Tính tay

**Bài 1.** Một MMO hạ snapshot xuống **10 Hz** để tiết kiệm băng thông, giữ nguyên đệm 100 ms. `T` bằng bao nhiêu, đệm 100 ms giờ là mấy `T`, và chịu được `m` bằng mấy? Nhân vật chạy 4 m/s, bỏ nội suy thì bước nhảy bao nhiêu cm? Muốn giữ bảo hiểm `m = 1` như hồi 20 Hz thì đệm phải bao nhiêu, và ngân sách 182 ms thành bao nhiêu?

**Bài 2.** Nhóm người chơi Wi-Fi đo được: loss 3%, jitter p99 = 40 ms, snapshot 20 Hz.
- Theo `d ≥ (m+1)·T + J`, đệm cần bao nhiêu để chịu 1 gói rơi?
- Với đệm đó, mất **độc lập** thì bao nhiêu khoảng đói mỗi phút? Mất **theo cụm** (`c` = 0,875) thì bao nhiêu?
- Đội đề xuất nâng lên 190 ms cho "chắc ăn". Nó đưa `m` lên mấy, số lần giật theo cụm giảm bao nhiêu phần trăm, và có đáng 50 ms không?

**Bài 3.** Tên lửa bay thẳng 30 m/s không đổi hướng; người chơi chạy 5 m/s, đổi hướng bất kỳ lúc nào. Ngoại suy 200 ms cho tên lửa sai bao nhiêu mét nếu nó thật sự bay thẳng? Cho người chơi lúc bẻ 90° thì bao nhiêu *(bảng 3.8)*? Tên lửa nhanh gấp 6 lần mà ngoại suy lại an toàn hơn — đại lượng nào quyết định, và viết nó thành biểu thức chứa `v` và `Δt`.

---

## 6. Chuyển giao

**Game bóng đá 11 đấu 11 trực tuyến.** Cầu thủ chạy tối đa 8 m/s, đổi hướng liên tục. Bóng bay tới 30 m/s theo quỹ đạo parabol gần như thuần vật lý. Snapshot 20 Hz, RTT trung bình 60 ms.

1. Ở 8 m/s, bước nhảy mỗi snapshot bao nhiêu cm nếu không nội suy, và chênh bao nhiêu phần trăm so với 25 cm ở mục 3.2? Bóng và cầu thủ nên dùng **hai chế độ khác nhau** — cái nào ngoại suy được xa hơn, và tiêu chí nào ở mục 4.1 cho bạn câu trả lời?
2. Cầu thủ có `bodyAngle` và `hasBall`. Cái nào lerp được, cái nào không, và cái lerp được có bẫy gì?
3. Một pha sút: người sút thấy bóng trễ 130 ms so với server, bóng bay 30 m/s. Sai lệch bao nhiêu mét, có lớn hơn bán kính chạm chân (khoảng 0,3 m) không? Kết luận gì về việc ai được quyền phân xử "chân chạm bóng"?
4. Đội đề xuất **ngoại suy bóng 300 ms** vì quỹ đạo parabol tính được chính xác — đúng cho pha bay tự do. Liệt kê ba khoảnh khắc trong trận mà giả định đó vỡ, và hậu quả nhìn thấy trên màn hình. Thêm: nếu đệm của bạn 80 ms còn đối thủ 160 ms (đệm thích ứng, mục 4.2), hai người thấy quả bóng cách nhau bao nhiêu mét?
5. **Câu khó nhất:** vì tất cả đều nhìn quá khứ, bạn nghĩ tới việc **ngoại suy quả bóng về đúng "hiện tại" của server** — cộng lại đủ `RTT/2 + T/2 + d` để bù toàn bộ độ lệch, biến 145 ms trễ thành 0. Bóng có quỹ đạo tính được, nên về nguyên tắc làm được. Câu hỏi: **nếu ai cũng làm thế, và nó chạy đúng, thì lag compensation ở bài 21 còn cần để làm gì — hay nó vẫn cần, và cần cho cái gì mà thủ thuật này không chạm tới?** Trả lời được câu này là bạn đã đoán trước được nội dung bài 21.

---

## 7. Tóm tắt

- **Prediction không dùng được cho người khác** vì nó chạy bằng input, mà server không gửi input người khác. Bài toán của bạn là **nội suy một tín hiệu lấy mẫu 20 Hz ra 60 khung hình**.
- Snapshot 20 Hz cho **3,0 khung hình mỗi mẫu** ở 60 fps: không nội suy thì ở 5 m/s nhân vật dịch chuyển **25 cm — nửa thân người — 20 lần mỗi giây**, kể cả trên mạng hoàn hảo. Chữa bằng cách vẽ tại `t_now − d` và lerp giữa hai snapshot kẹp quanh.
- Độ sâu đệm là **`d ≥ (m+1)·T + J`**, không phải hằng số 100 ms. 100 ms chính là **2 T ở 20 Hz** — vừa đủ chịu 1 gói rơi và **không còn mili giây nào cho jitter**. Đệm đo bằng **khoảng snapshot**; chép sang game 30 Hz là trả dư 33 ms.
- Bài 8 nói cắt 100 → 50 ms "không tốn gì". Giá thật, mất độc lập 1% loss: **từ 0,12 lên 12 khoảng đói mỗi phút — gấp 100 lần**. Mỗi bậc đệm chia số lần giật cho `1/p`.
- Nhưng loss thật **đi theo cụm** (bài 15). Với cụm trung bình 8 gói, `P(đói) = p·c^m` thay vì `p^(m+1)`: ở 1% loss, đệm 100 ms giật **10,5 lần/phút chứ không phải 0,12 — gấp 87,5 lần**, và nâng lên 150 ms chỉ còn 9,19. **Đệm sâu hơn gần như không mua được gì trước mất gói theo cụm.**
- **Vị trí lerp được. Góc thì không lerp thẳng** — 359° → 1° đi ngược 358° thay vì 2°, **sai gấp 179 lần**. **Trạng thái rời rạc không nội suy được**; sự kiện tức thời đi kênh event riêng (bài 23).
- Ngoại suy giả định **gia tốc bằng 0** nên sai đúng lúc quan trọng nhất: 5 m/s bẻ 90° trong 100 ms lệch **0,71 m — hơn một thân người**; quay đầu 180° trong 200 ms lệch **2,0 m**, gấp đôi đứng im. **Đứt dài thì đứng im tốt hơn đoán.** Ngoại suy tốt tỉ lệ thuận với **quán tính**: xe đua, tên lửa chịu được 200 ms; người đi bộ và MOBA không quá 50 ms.
- Hai núm snapshot rate và đệm **khoá vào nhau**: 20 → 30 Hz cắt **41,67 ms** chứ không phải 8,3 ms như bài 8 tính rời, **mà vẫn giữ bảo hiểm 1 gói rơi** — thứ cắt đệm trực tiếp đánh mất.
- Độ lệch giữa cái bạn thấy và cái server biết: **RTT/2 + d = 120 ms tối thiểu, 145 ms tính cả chờ snapshot — 0,725 m ở 5 m/s**, thường trực, không cấu hình nào đưa về 0.

→ **Bài 21 — Lag compensation**: bạn vừa cố ý làm cho mình nhìn thấy quá khứ. Bài sau tính hoá đơn của quyết định đó — và giải thích vì sao bạn chết sau khi đã nấp sau tường.
