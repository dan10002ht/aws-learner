# Bài 32 — Sharding world & cross-node handoff

## 1. Mục tiêu

Sau bài này bạn có thể:

- Tính **bốn trần của một node** (NIC, CPU snapshot, CPU simulation, RAM) từ số đo thật, và nói được cái nào chạm trước — kèm khoảng cách giữa chúng.
- Chỉ ra vì sao tải một zone tăng theo **bình phương** số người trong zone, và chọn giữa **cắt theo trận / zone tĩnh / grid động** bằng ngưỡng số.
- Tính **chi phí vùng chồng lấn** bằng công thức `4R/L − 4R²/L²`, và suy ra kích thước zone nhỏ nhất còn có nghĩa.
- Viết đủ **6 bước giao thức handoff**, tính thời gian đóng băng và so nó với buffer nội suy để biết người chơi có thấy khựng không.
- Nói được vì sao **đặt đường cắt ở đâu là quyết định thiết kế game**, và chứng minh bằng một cặp số đo được: 0,0 so với 41,6 handoff/giây.
- Trả lời dứt khoát câu hỏi **"game của tôi có cần shard không"** — với phần lớn game, đáp án là không.

---

## 2. Triệu chứng

Bài 31 kết ở chỗ một node giữ được nhiều trận nhỏ. Đây là trường hợp ngược lại.

Một MMO nhẹ, **5.000 người chơi đồng thời**, thế giới liền mạch. Bạn đã cắt bản đồ thành **10 zone**, mỗi zone **1.000 × 1.000 m**, mỗi zone một node, NIC 1 Gbps. Entity đã qua bài 24 (**13,68 B/entity** tính cả header packet), snapshot 20 Hz, AOI bán kính **R = 100 m** (bài 26), và thống kê cho **4 entity động mỗi người chơi**.

Ngày thường mọi thứ nhàn:

```
500 người/zone → 2.000 entity → mật độ 0,002 ent/m²
k = 0,002 × π × 100²             = 62,83 entity trong tầm
mỗi player nhận 62,83 × 13,68 × 20 = 17.191 B/s = 17,19 KB/s
node gửi ra   500 × 17,19 KB/s     = 8,60 MB/s = 68,8 Mbps   → 6,9 % NIC
```

19 giờ tối thứ Bảy, bạn mở sự kiện boss thế giới ở zone 3. **60 % người chơi dồn về đó** — 3.000 người trong một ô 1 km², 2.000 người còn lại rải trên 9 zone kia.

Node 3 chết trong 40 giây. Người chơi rớt hàng loạt. Chín node còn lại chạy ở **1,4 % NIC**.

Bạn mở monitoring node 3: **CPU của vòng lặp simulation là 0,085 % một tick.** 12.000 entity × 1,18 ns (bench bài 8) = 14,16 µs, trên ngân sách 16.666,7 µs. Không có gì để profile. Card mạng thì đang bị đòi 2.475,5 Mbps trên một sợi 1 Gbps.

Đây là bài 1 quay lại đúng chỗ nó dừng: *"một trận 100 người quá tải thì thêm instance không cứu được gì"*. Bạn đã thêm instance — có tận 10 cái. Chín cái đang rảnh.

---

## ⏸ Dừng lại — đoán trước #1

Số **người** ở zone 3 gấp `3.000 / 500 = 6` lần trung bình.

**Vậy *tải* của node 3 gấp bao nhiêu lần một node bình thường?**

```
(a) 6 lần — tải tỉ lệ thuận với số người
(b) 13,5 lần — so với 9 node kia (222,2 người mỗi node)
(c) 36 lần
(d) 182 lần
```

Cả bốn con số đều xuất hiện trong bài. Chọn cái đúng với **tải**, rồi đọc tiếp.

---

## 3. Lý thuyết

### 3.1 Ba trần của một node — tự tính, đừng tra bảng

Đáp án hộp trên là **(c) 36 lần** so với mức trung bình 500 người, và **(d) 182 lần** so với một node đang rảnh. Lý do nằm ở một chỗ dễ trượt: khi người dồn vào một zone **diện tích cố định**, cả `P` lẫn `k` cùng tăng.

```
k        = (4P / A) × πR²          ← mật độ tăng theo P
chiều ra = P × k × B × f = (4πR²·B·f / A) × P²
```

`k` ở zone 3 là `(4×3.000/10⁶) × π × 100² = 377,0` entity — gấp 6 lần `k` bình thường. Nhân với 6 lần số người ra **36 lần tải**. So với 9 node kia (`k` = 27,93, 13,58 Mbps) thì `2.475,5 / 13,58 = 182,3` lần.

> Zone tĩnh biến một cú dồn người **tuyến tính** thành một cú dồn tải **bậc hai**. Đây là lý do "cân bằng tải theo số người" là chỉ số sai.

Giờ tính bốn trần cho **một node giữ một zone 1.000 × 1.000 m**, cùng tham số trên:

**Trần băng thông.** NIC 1 Gbps = 125 MB/s (bỏ qua overhead lớp dưới):

```
P_max = √( NIC × A / (4πR²·B·f) )
      = √( 125·10⁶ × 10⁶ / (4π·10⁴ × 13,68 × 20) )
      = √( 1,25·10¹⁴ / 34.381.590 ) = √3.635.678 = 1.907 người
```

**Trần CPU simulation.** Bench bài 8: 1,18 µs cho 1.000 entity, và 11,9 µs / 119 µs ở 10.000 / 100.000 — tức **1,18–1,19 ns mỗi entity, tuyến tính, 0 alloc**. Cho simulation 50 % ngân sách tick 60 Hz:

```
8,333 ms / 1,18 ns = 7.062.147 entity = 1.765.537 người
```

**Trần CPU dựng snapshot.** Đây mới là phần CPU thật sự đáng lo, vì nó là `O(P·k)` chứ không `O(N)`: mỗi tick snapshot, mỗi player, ghi `k` entity. Lấy **20 ns mỗi entity ghi** (tìm delta + bit-pack):

```
P × k × 20 ns × 20 Hz ≤ 0,5 core  →  P = 3.154 người
```

*(20 ns/entity là ước lượng, không phải số đo — thay đổi theo layout dữ liệu và cách cài delta. Bậc độ lớn thì chắc; chữ số thứ hai thì không.)*

**Trần RAM.** State sống ~256 B/entity, cộng lịch sử vị trí cho lag compensation (bài 21) 1 giây ở 60 Hz × 12 B = 720 B → **976 B/entity**. Node 32 GB:

```
32·10⁹ / 976 = 32.786.885 entity = 8.196.721 người
```

| Trần | Người/zone | So với trần thấp nhất |
|---|---|---|
| **Băng thông NIC 1 Gbps** | **1.907** | **1×** — chạm trước |
| CPU dựng snapshot (ước lượng) | 3.154 | 1,7× |
| CPU simulation (bench thật) | 1.765.537 | **926×** |
| RAM 32 GB | 8.196.721 | 4.299× |

Hai dòng cuối cách hai dòng đầu gần ba bậc độ lớn. Kết luận thực dụng:

> **Bạn không bao giờ shard vì hết CPU hay hết RAM. Bạn shard vì hết card mạng.** Và vì `k` ở mẫu số, trần đó phụ thuộc **mật độ**, không phụ thuộc tổng số người trong thế giới.

Hệ quả ngược lại hay bị bỏ qua: trước khi shard, kiểm tra xem **hạ `R`, hạ tần suất snapshot, hoặc siết priority (bài 27)** có kéo được về dưới trần không. Cả ba rẻ hơn sharding vài bậc.

---

### 3.2 Ba cách cắt thế giới

| Cách cắt | Điều kiện áp dụng | Cân bằng tải | Chi phí biên | Độ phức tạp |
|---|---|---|---|---|
| **Theo trận/phòng** (bài 28) | Game có ranh giới trận **tự nhiên** | Tự cân — mỗi trận có trần người cứng | **Bằng 0** — không có biên | Gần như không |
| **Zone tĩnh** | Thế giới liền mạch, mật độ tương đối đều | Kém — dồn cục là chết, 36× như mục 3.1 | `4R/L` entity phải nhân bản | Trung bình |
| **Grid động / rebalance** | Mật độ biến động mạnh, không đoán được | Tốt | Cao hơn: ranh giới **di chuyển** nên handoff tăng | Cao |

**Cắt theo trận** là cách duy nhất không có bài toán biên, vì hai trận không nhìn thấy nhau. Nếu game của bạn có trận, dừng ở đây — mục 4 nói rõ vì sao.

**Zone tĩnh** là thứ hầu hết MMO cổ điển làm: mỗi vùng bản đồ một process. Ưu điểm thật sự không phải hiệu năng mà là **tính dự đoán được** — ranh giới cố định nên biết chính xác entity nào giáp entity nào, cache được, test được, và một node chết chỉ mất đúng một vùng. Nhược điểm là mục 3.1 vừa tính.

**Grid động** vẽ lại ranh giới theo mật độ thực tế — zone đông chia nhỏ, zone vắng gộp lại. Nó cộng thêm ba thứ: ranh giới di chuyển làm entity **đổi chủ mà không hề di chuyển** (một cú chia đôi zone 3.000 người sinh hàng trăm handoff trong một tick); zone mới nhỏ hơn nên chi phí vùng chồng lấn tăng theo `1/L` (mục 3.3), ăn lại một phần tải vừa giảm; và phải có một bộ điều phối biết mật độ toàn cục — một thành phần stateful nữa. Kết quả: grid động **chỉ đáng khi mật độ thật sự không đoán trước được**. Nếu bạn biết boss spawn ở đâu, zone tĩnh cắt đúng chỗ rẻ hơn nhiều.

---

## ⏸ Dừng lại — đoán trước #2

Người chơi đứng cách ranh giới 30 m phải nhìn thấy địch cách 80 m — mà địch đó thuộc node bên kia. Cách giải chuẩn: node A giữ **bản sao chỉ-đọc** (ghost) của mọi entity nằm trong dải rộng `R` sát biên bên node B, và ngược lại.

Zone 1.000 × 1.000 m, `R` = 100 m, 2.000 entity phân bố đều.

**Bao nhiêu phần trăm entity của một zone phải được nhân bản sang hàng xóm?**

```
(a) ~4 %   — chỉ mấy người sát mép
(b) ~10 %
(c) ~20 %
(d) ~36 %
```

---

### 3.3 Bài toán biên: vùng chồng lấn và cái giá của nó

Đáp án là **(d) 36 %**, và cách ra nó là hình học thuần tuý. Phần "an toàn" của một zone vuông cạnh `L` là lõi cạnh `L − 2R`; mọi thứ ngoài lõi đều nằm trong tầm nhìn của ai đó bên kia biên.

```
% ghost = (L² − (L−2R)²) / L² = 4R/L − 4R²/L²

L = 1.000, R = 100 →  (10⁶ − 800²)/10⁶ = 360.000/10⁶ = 36,0 %
```

<svg viewBox="0 0 700 300" role="img" aria-labelledby="gs32-a-t gs32-a-d" style="width:100%;height:auto">
<title id="gs32-a-t">Vùng chồng lấn giữa hai zone và tỉ lệ entity phải nhân bản</title>
<desc id="gs32-a-d">Hai zone vuông cạnh 1.000 mét đặt cạnh nhau. Mỗi zone có một lõi an toàn cạnh 800 mét ở giữa và một dải biên rộng 100 mét bao quanh. Entity trong dải biên của zone B được node A giữ một bản sao chỉ đọc gọi là ghost, và ngược lại. Dải biên chiếm 36 phần trăm diện tích zone. Bên phải là bảng cho thấy tỉ lệ ghost tăng khi zone nhỏ đi: 19 phần trăm ở 2.000 mét, 36 phần trăm ở 1.000 mét, 64 phần trăm ở 500 mét, 96 phần trăm ở 250 mét.</desc>
<rect x="30" y="40" width="180" height="180" rx="4" fill="#3b82f6" fill-opacity="0.10" stroke="currentColor" stroke-opacity="0.35"/>
<rect x="48" y="58" width="144" height="144" rx="3" fill="#3b82f6" fill-opacity="0.22"/>
<text x="120" y="126" text-anchor="middle" font-size="11" fill="currentColor">lõi node A</text>
<text x="120" y="142" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.75">800 × 800 m</text>
<text x="120" y="32" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">Zone A — node A</text>
<rect x="214" y="40" width="180" height="180" rx="4" fill="#84cc16" fill-opacity="0.10" stroke="currentColor" stroke-opacity="0.35"/>
<rect x="232" y="58" width="144" height="144" rx="3" fill="#84cc16" fill-opacity="0.22"/>
<text x="304" y="126" text-anchor="middle" font-size="11" fill="currentColor">lõi node B</text>
<text x="304" y="142" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.75">800 × 800 m</text>
<text x="304" y="32" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">Zone B — node B</text>
<line x1="212" y1="40" x2="212" y2="220" stroke="#ef4444" stroke-width="2" stroke-opacity="0.85"/>
<circle cx="200" cy="100" r="5" fill="#3b82f6"/>
<circle cx="226" cy="100" r="5" fill="#84cc16"/>
<circle cx="226" cy="100" r="9" fill="none" stroke="#3b82f6" stroke-opacity="0.7" stroke-dasharray="3 2"/>
<circle cx="200" cy="170" r="5" fill="#3b82f6"/>
<circle cx="200" cy="170" r="9" fill="none" stroke="#84cc16" stroke-opacity="0.7" stroke-dasharray="3 2"/>
<circle cx="240" cy="170" r="5" fill="#84cc16"/>
<text x="212" y="240" text-anchor="middle" font-size="10" fill="currentColor">biên</text>
<text x="212" y="256" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.75">dải ±100 m = 36 % diện tích</text>
<circle cx="46" cy="252" r="5" fill="#64748b"/>
<text x="58" y="256" font-size="10" fill="currentColor">chủ sở hữu</text>
<circle cx="140" cy="252" r="5" fill="#64748b" fill-opacity="0.35"/>
<circle cx="140" cy="252" r="9" fill="none" stroke="currentColor" stroke-opacity="0.7" stroke-dasharray="3 2"/>
<text x="153" y="256" font-size="10" fill="currentColor">ghost chỉ-đọc</text>
<text x="430" y="32" font-size="11" font-weight="bold" fill="currentColor">% entity phải nhân bản</text>
<text x="430" y="52" font-size="10" fill="currentColor" opacity="0.75">công thức 4R/L − 4R²/L², R = 100 m</text>
<rect x="430" y="66" width="24" height="18" rx="3" fill="#84cc16" fill-opacity="0.45"/>
<text x="466" y="79" font-size="10" fill="currentColor">L = 4.000 m → 9,8 %</text>
<rect x="430" y="92" width="47" height="18" rx="3" fill="#84cc16" fill-opacity="0.45"/>
<text x="489" y="105" font-size="10" fill="currentColor">L = 2.000 m → 19,0 %</text>
<rect x="430" y="118" width="90" height="18" rx="3" fill="#f59e0b" fill-opacity="0.45"/>
<text x="532" y="131" font-size="10" fill="currentColor">L = 1.000 m → 36,0 %</text>
<rect x="430" y="144" width="160" height="18" rx="3" fill="#f59e0b" fill-opacity="0.5"/>
<text x="602" y="157" font-size="10" fill="currentColor">L = 500 → 64,0 %</text>
<rect x="430" y="170" width="210" height="18" rx="3" fill="#ef4444" fill-opacity="0.45"/>
<text x="648" y="183" font-size="10" fill="currentColor">L = 333 → 84 %</text>
<rect x="430" y="196" width="240" height="18" rx="3" fill="#ef4444" fill-opacity="0.55"/>
<text x="550" y="210" text-anchor="middle" font-size="10" fill="currentColor">L = 250 m → 96,0 %</text>
<line x1="430" y1="228" x2="670" y2="228" stroke="currentColor" stroke-opacity="0.35"/>
<text x="430" y="248" font-size="10" fill="currentColor">L = 2R = 200 m → 100 %: lõi biến mất,</text>
<text x="430" y="264" font-size="10" fill="currentColor">mọi entity là ghost của ai đó — vô nghĩa</text>
</svg>

Bảng bên phải sơ đồ là kết luận quan trọng nhất của mục này, đi ngược trực giác "chia nhỏ hơn thì mỗi node nhẹ hơn":

| Cạnh zone `L` | Lõi | % ghost |
|---|---|---|
| 4.000 m | 3.800 | 9,8 % |
| 2.000 m | 1.800 | 19,0 % |
| **1.000 m** | **800** | **36,0 %** |
| 600 m | 400 | 55,6 % |
| 500 m | 300 | 64,0 % |
| 333 m | 133 | 84,0 % |
| 250 m | 50 | 96,0 % |
| **200 m = 2R** | **0** | **100 %** |

> Chia đôi cạnh zone làm **gấp đôi** tỉ lệ ghost (`4R/L` tăng gấp đôi khi `L` giảm một nửa). Từ 1.000 m xuống 500 m: 36,0 % → 64,0 %, tức **1,78 lần**. Và ở `L = 2R` thì lõi bằng 0 — bạn đang trả tiền để mọi node giữ bản sao của mọi thứ.

Quy tắc rút ra: **`L ≥ 6R` mới còn kinh tế** (ở `L = 600 m` ghost đã là 55,6 %); dưới `L = 4R` thì sharding tự ăn hết lợi ích của chính nó.

Thêm một nấc: entity ở **góc** zone nằm trong tầm của **ba** hàng xóm. Tách ra: dải cạnh `4(L−2R)R = 320.000 m²` (32,0 %, 1 bản sao mỗi entity) và bốn góc `4R² = 40.000 m²` (4,0 %, 3 bản sao). Tổng **bản sao** trên mỗi entity của zone: `32,0 % × 1 + 4,0 % × 3 = 44,0 %`.

Giá bằng byte thì rẻ hơn bạn tưởng. 720 entity ghost, stream giữa hai node ở 60 Hz:

```
720 × 13,68 B × 60 Hz = 591,0 KB/s = 4,73 Mbps   → 6,87 % của 68,8 Mbps gửi ra client
```

Đường trong datacenter thường 10–25 Gbps, nên **4,73 Mbps không phải vấn đề**. Cái đắt của ghost không nằm ở băng thông mà ở ba chỗ khác:

- **Đúng đắn.** Ghost là dữ liệu **trễ một chuyến mạng**. Va chạm, raycast, AOE nổ ngang biên đọc trên state cũ 0,25–1 ms: vô hại với vật thể chậm, là 0,3 m sai vị trí với đạn 300 m/s.
- **Chỉ-đọc, tuyệt đối.** Một node ghi vào ghost là có hai nguồn sự thật cho một entity — đúng cái bài 1 nói không được phép.
- **Hành động xuyên biên thành bất đồng bộ.** A bắn trúng người thuộc B: A không được trừ máu, A gửi *ý định trúng* sang B để B phán quyết. Phải viết đường đi đó cho **từng loại** tương tác.

Điểm thứ ba tốn người-tháng thật sự, và không hiện ra trên bất kỳ biểu đồ hạ tầng nào.

---

### 3.4 Handoff: chuyển quyền sở hữu

Ghost giải bài toán *nhìn thấy*. Còn khi người chơi **thật sự đi qua** biên, quyền sở hữu phải đổi node. Giao thức tối thiểu — sáu bước, không bỏ bước nào:

```
1. A phát hiện vượt biên ở cuối tick  → đóng băng entity (ngừng apply input)
2. A serialize state đầy đủ           → gửi sang B
3. B nạp entity, chờ tới ranh tick    → apply, đặt trạng thái "sở hữu"
4. B → A: ack "tôi đã nhận"
5. A xoá entity khỏi world (giữ ghost) → báo gateway đổi tuyến
6. B bắt đầu nhận input từ tick kế
```

Chỗ dễ sai nhất: **phải đóng băng trước khi gửi, và chỉ được xoá sau khi có ack.** Bỏ bước 1 thì A vẫn mô phỏng bản của mình trong lúc B đã mô phỏng bản của nó — hai nguồn sự thật. Bỏ bước 4 thì gói tin bước 2 rớt là entity **bốc hơi** khỏi thế giới.

Thời gian đóng băng, với RTT nội bộ datacenter 0,5 ms (một chiều 0,25 ms) và tick 16,67 ms:

| Thành phần | Trung bình | Xấu nhất |
|---|---|---|
| A chờ hết tick đang chạy | 8,33 ms | 16,67 ms |
| A → B (một chiều) | 0,25 | 0,25 |
| B chờ tới ranh tick của nó | 8,33 | 16,67 |
| B → A ack | 0,25 | 0,25 |
| A → gateway đổi tuyến | 0,25 | 0,25 |
| **Tổng** | **17,42 ms** | **34,08 ms** |

Hai node **không đồng bộ tick với nhau**, nên hai lần "chờ ranh tick" là hai biến độc lập trong `[0; 16,67]` — đó là toàn bộ nguồn gốc của con số này. Truyền 2 KB state qua đường 10 Gbps mất 1,6 µs, bỏ qua được.

**Người chơi có thấy khựng không?** So với hai mốc của bài 8:

- Buffer nội suy client là **100 ms**. Handoff xấu nhất 34,08 ms chiếm **34,1 %** buffer đó — biên an toàn **2,93 lần**. Người *quan sát* không thấy gì: họ đang render quá khứ 100 ms và khoảng trống 34 ms được lấp bằng nội suy bình thường. Ngân sách 182 ms của bài 8 tăng **18,7 %**, đúng một lần, cho đúng một người.
- Chính người bị handoff: client vẫn prediction bình thường (bài 18), và ở input 60 Hz có **2 input** bị đóng băng trong trường hợp xấu nhất. Gateway **buffer** chúng rồi chuyển cho B thì reconciliation (bài 19) replay lại, không ai thấy gì. Gateway **vứt** chúng thì người chơi giật ngược đúng 2 tick — nhỏ nhưng thấy được, và lặp lại mỗi lần qua biên.

Đó là lý do bước 5 báo cho **gateway** chứ không bảo client tự kết nối tới B. Tính cái giá của phương án ngây thơ, RTT client 40 ms (bài 8): TCP 1 RTT + TLS 1.3 1 RTT + WebSocket upgrade 1 RTT = **120 ms**, cộng 34,08 ms handoff = **154,08 ms**.

<svg viewBox="0 0 700 210" role="img" aria-labelledby="gs32-b-t gs32-b-d" style="width:100%;height:auto">
<title id="gs32-b-t">Thời gian đóng băng khi handoff: qua gateway so với client tự kết nối lại</title>
<desc id="gs32-b-d">Hai thanh thời gian trên cùng một trục 0 đến 200 mili giây. Thanh trên là handoff qua gateway, tổng 34,08 mili giây, nằm gọn dưới vạch buffer nội suy 100 mili giây. Thanh dưới là phương án client tự kết nối lại tới node mới, tổng 154,08 mili giây gồm 120 mili giây bắt tay TCP, TLS và WebSocket, vượt xa vạch 100 mili giây nên người chơi thấy đứng hình.</desc>
<line x1="60" y1="170" x2="670" y2="170" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<text x="60" y="188" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.7">0</text>
<text x="212" y="188" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.7">50</text>
<text x="365" y="188" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.7">100</text>
<text x="517" y="188" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.7">150</text>
<text x="670" y="188" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.7">200 ms</text>
<line x1="365" y1="30" x2="365" y2="170" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="5 3"/>
<text x="372" y="26" font-size="10" fill="currentColor">buffer nội suy 100 ms — dưới vạch này người xem không thấy gì</text>
<text x="60" y="52" font-size="11" font-weight="bold" fill="currentColor">Qua gateway</text>
<rect x="60" y="60" width="51" height="22" rx="3" fill="#84cc16" fill-opacity="0.5"/>
<rect x="111" y="60" width="52" height="22" rx="3" fill="#84cc16" fill-opacity="0.3"/>
<text x="172" y="76" font-size="10" fill="currentColor">34,08 ms — hai lần chờ ranh tick + 3 chuyến nội bộ</text>
<text x="86" y="99" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.8">tick A</text>
<text x="137" y="99" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.8">tick B</text>
<text x="60" y="126" font-size="11" font-weight="bold" fill="currentColor">Client tự kết nối lại node B</text>
<rect x="60" y="134" width="51" height="22" rx="3" fill="#84cc16" fill-opacity="0.5"/>
<rect x="111" y="134" width="52" height="22" rx="3" fill="#84cc16" fill-opacity="0.3"/>
<rect x="163" y="134" width="122" height="22" rx="3" fill="#ef4444" fill-opacity="0.4"/>
<rect x="285" y="134" width="122" height="22" rx="3" fill="#ef4444" fill-opacity="0.4"/>
<rect x="407" y="134" width="122" height="22" rx="3" fill="#ef4444" fill-opacity="0.4"/>
<text x="224" y="149" text-anchor="middle" font-size="9" fill="currentColor">TCP 40</text>
<text x="346" y="149" text-anchor="middle" font-size="9" fill="currentColor">TLS 40</text>
<text x="468" y="149" text-anchor="middle" font-size="9" fill="currentColor">WS 40</text>
<text x="536" y="149" font-size="10" fill="currentColor">= 154,08 ms</text>
</svg>

**154,08 ms** là 4,52 lần phương án gateway và **1,54 lần buffer nội suy**. Vượt buffer nghĩa là client hết dữ liệu để nội suy: nhân vật đứng hình rồi nhảy cóc. Mỗi lần qua biên. Bài 29 đã dựng gateway cho việc khác; đây là lý do thứ hai để nó tồn tại.

---

### 3.5 Cái bẫy: đi qua đi lại ở biên

Bài 26 đã gặp đúng hình dạng này ở biên AOI: người lảng vảng trên ranh giới tạo một chuỗi vào–ra vô tận. Ở đây nặng hơn, vì mỗi lần vào–ra là một lần **đổi chủ sở hữu** chứ không chỉ một spawn.

Đo bằng mô phỏng, cùng mô hình chuyển động của bài 26 (random walk, nhiễu hướng Gauss 0,25 rad mỗi bước, 20 Hz, 120 giây), thế giới hình xuyến 3.000 × 3.000 m chia 3 × 3 zone cạnh 1.000 m:

| Kịch bản | Ngưỡng trễ | Handoff/giây | Trên mỗi người/phút |
|---|---|---|---|
| 1.000 người rải đều, v = 5 m/s | 0 m | 6,7 | 0,40 |
| " | 10 m | 2,5 | 0,15 |
| " | 25 m | 1,2 | 0,07 |
| **500 người tụ sát biên, v = 1 m/s** | **0 m** | **10,1** | **1,21** |
| " | 10 m | 0,8 | 0,10 |
| " | 25 m | 0,0 | 0,00 |

Đọc hai khối cạnh nhau. **500 người đứng tản mạn quanh một cái chợ nằm trên ranh giới tạo nhiều handoff hơn 1.000 người chạy khắp thế giới** — 10,1 so với 6,7 mỗi giây, trên đầu người là 1,21 so với 0,40, **gấp 3,0 lần**. Họ gần như không đi đâu cả; họ chỉ đứng đúng chỗ đường cắt đi qua.

Chữa giống bài 26: **ngưỡng trễ (hysteresis)** — chỉ đổi chủ khi đã vào sâu `d` mét trong zone mới. Ở `d = 10 m` (10 % bán kính AOI), handoff của đám đông sát biên rơi từ 10,1 xuống 0,8, **giảm 92,1 %**; ở `d = 25 m` về 0.

Ngưỡng trễ ở đây **rẻ hơn** ở bài 26. Bài 26 nới biên làm `k` giảm, tức người chơi thật sự thấy ít hơn — đổi gameplay. Ở đây entity trong dải trễ vẫn được cả hai node biết đến (một bên chủ, bên kia ghost), nên **không ai thấy khác gì**. Điều kiện duy nhất: `d < R`, để dải trễ nằm gọn trong vùng chồng lấn.

Chiều ngược lại, cùng đám đông sát biên bán kính 20 m, đổi mỗi tốc độ:

```
v = 0,5 m/s → 0,67 handoff/người/phút    v = 5 m/s  →  6,10
v = 1  m/s  → 1,21                        v = 10 m/s → 12,33
v = 2  m/s  → 2,56
```

Tỉ lệ gần như tuyến tính theo `v` (tăng 20 lần tốc độ cho 18,4 lần handoff) — đúng dạng thông lượng qua biên của bài 26. Nghĩa là **tốc độ không phải thủ phạm; vị trí đường cắt mới là**.

---

### 3.6 Vì sao đây là quyết định thiết kế game

Bài 1 nói *"cắt thế giới là một quyết định thiết kế game, không phải quyết định hạ tầng"*. Đây là con số chứng minh.

Cùng mô phỏng: **3.000 người tụ quanh một điểm sự kiện, bán kính 150 m**, v = 5 m/s, không ngưỡng trễ. Chỉ đổi **một** thứ — điểm sự kiện nằm ở đâu:

| Vị trí điểm sự kiện | Handoff/giây |
|---|---|
| Giữa zone (cách biên 500 m) | **0,0** |
| Cách biên 200 m — đám đông không chạm biên | **0,0** |
| Cách biên 100 m | 29,3 |
| **Đúng trên biên** | **41,6** |

Không phải "tốt hơn 20 %". Là **0 so với 41,6**. Cùng số người, cùng hành vi, cùng code. Khác nhau ở chỗ hoạ sĩ đặt cái boss.

Và nó không dừng ở handoff. Đám đông nằm trọn trong một zone thì node đó chịu toàn bộ 36× tải nhưng **không** phải đồng bộ với ai. Cưỡi lên biên thì hai node cùng gánh — nghe tốt hơn — nhưng phân nửa số người là ghost của nhau, mọi phát đạn ngang biên đi qua một chuyến mạng, và 41,6 handoff/giây chạy suốt sự kiện. **Chia đôi tải bằng cách đặt đường cắt vào giữa đám đông là cách đắt nhất để chia đôi tải.**

Vì thế đường cắt phải rơi vào chỗ người chơi **ít đi qua nhất** và **không dừng lại**. Cách game thật làm:

| Thủ pháp | Ranh giới kỹ thuật nằm ở đâu | Người chơi thấy gì |
|---|---|---|
| **Màn hình nạp / cửa hầm ngục** | Ngay tại cửa | "Đang vào hầm ngục" — handoff chạy trong lúc nạp, thời gian đóng băng biến mất |
| **Cầu, hẻm núi, cổng thành** | Giữa cầu | Hình học ép thông lượng qua biên xuống một dòng người hẹp |
| **Sông, dãy núi, bờ biển** | Dọc chướng ngại | Không ai *đứng* trên đó → không có kịch bản "chợ nằm trên biên" |
| **Cổng dịch chuyển** | Ở cổng | Handoff bị che sau hiệu ứng dịch chuyển, vốn cũng là ranh giới kể chuyện |
| **Đường hầm dài** | Giữa hầm | Tầm nhìn bị chặn → `R` hiệu dụng nhỏ → dải ghost hẹp theo |

Dòng cuối là thủ pháp tinh tế nhất và đáng nhớ nhất: **chỗ nào tầm nhìn bị chắn thì `R` hiệu dụng nhỏ, mà `% ghost = 4R/L`, nên cắt ở đó rẻ hơn cắt giữa đồng trống**. Cái hành lang hẹp trong game không chỉ để giấu màn hình nạp — nó làm cho đường cắt rẻ đi bằng hình học.

Chiều ngược lại là chỗ đội gameplay hay vô tình phá kiến trúc: đặt NPC bán hàng, bảng đấu giá hay điểm hồi sinh cạnh ranh giới zone chính là tạo ra kịch bản 10,1 handoff/giây ở mục 3.5. Không cấu hình nào sửa được. Phải dời cái NPC.

> Ở BE App, ranh giới shard là chuyện của DBA, không ai ngoài team hạ tầng cần biết. Ở game, ranh giới shard là **một địa điểm trong thế giới**, và ai đặt nó cũng đang viết code hạ tầng — kể cả khi họ đang cầm công cụ dựng cảnh.

---

## 4. Khi nào **không** shard

Ba mục vừa rồi đều là chi phí:

| Bạn nhận được | Bạn trả |
|---|---|
| Trần băng thông một zone, × số node | 36 % entity nhân bản (`L` = 1.000 m, `R` = 100 m) |
| Tải phân bố — **nếu** người chơi rải đều | Mọi tương tác ngang biên thành bất đồng bộ, viết riêng từng loại |
| Một node chết chỉ mất một vùng | 6 bước handoff, 34,08 ms đóng băng, cộng ngưỡng trễ |
| | Đường cắt thành ràng buộc thiết kế bản đồ **vĩnh viễn** |

Cắt theo trận (bài 28) trả **0** ở cả bốn dòng. Không biên, không ghost, không handoff, không ràng buộc bản đồ. Từ đó ra một quy tắc thẳng thắn:

> **Nếu game của bạn có ranh giới trận tự nhiên — MOBA, FPS theo trận, battle royale, đấu bài, co-op 4 người — thì đừng bao giờ shard theo không gian.** Cắt theo trận, mỗi node giữ nhiều trận, hết chuyện. Trần người trong một trận là con số **thiết kế game** (5v5, 100 người), không phải con số hạ tầng, và nó luôn nằm dưới trần 1.907 người của mục 3.1.

Ba câu hỏi, phải "có" cả ba mới shard:

1. Thế giới có **liền mạch** không — đi bộ từ đầu này tới đầu kia gặp được người ở đó, không qua màn hình nạp nào?
2. Mật độ một vùng có vượt trần **1.907 người/km²** (hoặc trần bạn tự tính lại theo `R`, `B`, `f` của mình) không?
3. Đã thử hạ `R`, hạ tần suất snapshot, siết priority (bài 27) chưa — và vẫn vượt?

Câu 3 loại phần lớn trường hợp. Hạ `R` từ 100 m xuống 70 m làm `k` giảm còn `(70/100)² = 0,49` — **gần một nửa băng thông**, ba dòng cấu hình, không node mới, không biên, không handoff. Sharding là thứ làm khi đã hết mọi cách khác, không phải thứ làm để "sẵn sàng scale".

---

## 5. Tính tay

**Bài 1.** Game của bạn: `R` = 150 m, entity 13,68 B, snapshot 30 Hz, 3 entity động mỗi người, zone vuông 2.000 × 2.000 m, NIC 1 Gbps.
a) `k` là bao nhiêu khi zone có 800 người?
b) Trần băng thông của một node là bao nhiêu người? Dùng `P_max = √(NIC·A / (4πR²·B·f))` nhưng nhớ thay hệ số 4 entity/người bằng 3.
c) Nếu bạn hạ snapshot xuống 20 Hz thì trần đó tăng bao nhiêu lần? Vì sao **không** phải 1,5 lần?

**Bài 2.** Cùng zone 2.000 m, `R` = 150 m.
a) Tỉ lệ ghost là bao nhiêu phần trăm?
b) Đội hạ tầng muốn chia mỗi zone thành 2 × 2 để "giảm tải bốn lần". Tỉ lệ ghost mới là bao nhiêu, và mỗi node thật sự nhẹ đi bao nhiêu lần chứ không phải 4?
c) Cạnh zone nhỏ nhất mà tỉ lệ ghost còn dưới 50 % là bao nhiêu?

**Bài 3.** Server chạy 30 Hz thay vì 60 Hz, RTT nội bộ 0,5 ms, buffer nội suy client 80 ms.
a) Thời gian handoff trung bình và xấu nhất là bao nhiêu?
b) Xấu nhất chiếm bao nhiêu phần trăm buffer nội suy? Còn an toàn không?
c) Ở tick rate nào thì handoff xấu nhất **bằng đúng** buffer 80 ms — và con số đó nói gì về việc hạ tick rate để tiết kiệm CPU?

---

## 6. Chuyển giao

1. Zone của bạn không vuông mà là một hành lang dài 4.000 × 200 m. Công thức `4R/L` còn dùng được không? Tính lại tỉ lệ ghost với `R` = 100 m, và giải thích vì sao hình dạng zone quan trọng chứ không chỉ diện tích.
2. Một người chơi bị mất kết nối **đúng giữa bước 2 và bước 4** của giao thức handoff. Node nào chịu trách nhiệm dọn dẹp, và bạn phát hiện tình huống này bằng cơ chế nào?
3. Đội gameplay thêm một chiêu dịch chuyển 300 m tức thời. Người chơi có thể nhảy **vượt qua cả một zone**, hạ cánh xuống zone không kề bên node hiện tại. Giao thức 6 bước ở 3.4 hỏng ở chỗ nào?
4. Node B chết trong lúc đang giữ 500 người ở zone của nó. Ba node kề bên đang giữ ghost của những người trong dải biên. Bạn dùng được đám ghost đó vào việc gì khi khôi phục — và **không** dùng được vào việc gì?
5. Bạn bật grid động: khi zone quá tải thì cắt đôi. Lúc cắt, một nửa số entity đổi chủ trong đúng một tick. Với 3.000 người ở zone 3 của mục 2, cú cắt đó tạo ra bao nhiêu handoff, và ước lượng nó chiếm bao nhiêu thời gian của tick đó?
6. Rollback netcode (bài 22) cần tua ngược thế giới rồi chạy lại. Entity vừa handoff sang node khác 200 ms trước, rồi phải rollback về 300 ms trước. Ai giữ state để tua ngược?
7. **Câu khó nhất.** Bạn có hai đường cắt khả dĩ. Đường A đi dọc một dãy núi: gần như không ai qua, nhưng nó chia thế giới thành 20 % và 80 % dân số. Đường B đi qua giữa quảng trường trung tâm: chia 50–50 hoàn hảo, nhưng đó là chỗ đông nhất và người ta *đứng* ở đó. Với số của bài này — tải theo `P²`, ghost theo `4R/L`, handoff đo được ở 3.5 và 3.6 — hãy tính xem cái nào rẻ hơn, rồi trả lời câu thật sự khó: **tồn tại con số nào của đường B đủ tốt để bù cho việc nó nằm giữa quảng trường không, hay lập luận này không phải chuyện so số?**

---

## 7. Tóm tắt

- Tải một zone diện tích cố định tăng theo **`P²`**, không theo `P`: 6 lần số người cho **36 lần tải** (2.475,5 Mbps so với 68,8 Mbps), và **182,3 lần** so với node đang rảnh.
- Bốn trần của một node giữ zone 1 km² (`R` = 100 m, 13,68 B, 20 Hz, 4 ent/người): **băng thông 1.907 người** · CPU snapshot ~3.154 · CPU simulation 1.765.537 (**926×**) · RAM 32 GB 8.196.721 (4.299×). **Bạn shard vì hết NIC, không bao giờ vì hết CPU.**
- Vùng chồng lấn: **`% ghost = 4R/L − 4R²/L²`**. Ở `L` = 1.000 m, `R` = 100 m là **36,0 %**; chia đôi cạnh zone lên **64,0 %**; ở `L = 2R` là 100 % và sharding vô nghĩa. **`L ≥ 6R`** mới còn kinh tế.
- Tính cả góc (3 hàng xóm), tổng bản sao là **44,0 %** số entity. Giá bằng byte thì rẻ — 4,73 Mbps, **6,87 %** lưu lượng gửi client; cái đắt là **mọi tương tác ngang biên trở thành bất đồng bộ**.
- Handoff 6 bước, tick 60 Hz, RTT nội bộ 0,5 ms: **17,42 ms trung bình, 34,08 ms xấu nhất** — chiếm **34,1 %** buffer nội suy 100 ms, biên an toàn 2,93 lần. Người chơi không thấy gì **nếu** gateway buffer 2 input bị đóng băng.
- Cho client tự kết nối lại node mới thay vì đổi tuyến ở gateway: **154,08 ms** (TCP + TLS + WS = 120 ms) = **1,54 lần** buffer nội suy → đứng hình thấy được, mỗi lần qua biên.
- **500 người đứng tản mạn trên biên tạo nhiều handoff hơn 1.000 người chạy khắp thế giới**: 10,1 so với 6,7 mỗi giây, gấp **3,0 lần** tính trên đầu người. Ngưỡng trễ `d` = 10 m cắt **92,1 %**; `d` = 25 m về 0. Khác bài 26, ngưỡng trễ ở đây **không đổi gameplay** vì entity trong dải vẫn là ghost của node kia.
- Cùng 3.000 người, cùng hành vi, chỉ đổi vị trí điểm sự kiện: **0,0 handoff/giây khi cách biên 200 m, 41,6 khi đúng trên biên.** Đó là toàn bộ lý do đường cắt là quyết định thiết kế game.
- Game thật giấu ranh giới ở màn hình nạp, cầu, sông, cổng dịch chuyển, đường hầm — đường hầm rẻ nhất vì tầm nhìn bị chắn làm `R` hiệu dụng nhỏ, mà `% ghost = 4R/L`.
- **Có ranh giới trận tự nhiên thì đừng shard theo không gian.** Hạ `R` từ 100 m xuống 70 m cắt gần nửa băng thông bằng ba dòng cấu hình.

→ **Chương 8 — Chống gian lận.** Bảy chương vừa rồi giả định người chơi gửi lên thứ họ thật sự làm. Bài 33 bỏ giả định đó — và nó là giả định sai ngay từ đầu.
