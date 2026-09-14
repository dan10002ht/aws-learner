# Bài 40 — Deploy & vận hành hệ stateful

## 1. Mục tiêu

Sau bài này bạn có thể:

- Chỉ ra **bằng phép tính** vì sao rolling update, blue-green và canary đều gãy với game node, và gãy ở giả định nào của từng cái.
- Tính **thời gian deploy toàn fleet** và **công suất dư đỉnh** theo kích thước lô, và chứng minh tổng node-giờ lãng phí **không đổi** theo lô.
- Mô tả **mô hình allocation** (đăng ký sức chứa → allocator cấp phát → trạng thái `Allocated` bất khả xâm phạm) và nói được nó thay thế cái gì trong k8s.
- Bác bỏ **HPA theo CPU** bằng số đo, và thay bằng tín hiệu đúng: **số trận đang chạy** và **số slot còn trống**.
- Tính **số slot đệm** cần giữ từ thời gian khởi động node `T` và tốc độ trận mới `λ`, và đọc được bảng tỉ lệ trận bị từ chối.
- Ra quyết định **scale-down** có/không bằng điểm hoà vốn tính được, và viết được bảng **$/CCU/tháng** tách compute vs egress.

---

## 2. Triệu chứng

Thứ Sáu 21 giờ, giờ đỉnh. Fleet **200 game node**, mỗi node **20 trận**, mỗi trận **10 người** — **4.000 trận, 40.000 CCU**. Trận dài **480 ± 90 giây** (bài 31).

Security báo một lỗ hổng trong parser gói tin. Fix đã merge, image đã build. Bạn cần nó chạy trên toàn bộ 200 node.

Cấu hình drain của bạn đã đúng theo bài 31: hạn drain `D = 720 s`, năm bước còn lại 3,42 s, tức **723,42 giây mỗi lượt**. Deploy song song **20 node một lượt** (công suất dư 10 %, đúng bảng bài 29). Bạn nhân ra:

```
ceil(200 / 20) = 10 lượt  ×  723,42 s  =  7.234 s  =  120,6 phút  =  2 giờ 1 phút
```

**Hai giờ.** Trong hai giờ đó, trung bình một nửa fleet vẫn chạy bản có lỗ hổng: `40.000 CCU × 2,01 h × 0,5 =` **40.190 CCU-giờ** phơi ra ngoài.

Bạn thử cách nhanh: bỏ drain, để Kubernetes làm việc của nó. Rolling update với `terminationGracePeriodSeconds: 30` xong sau **5,6 phút** — nhanh hơn **21,5 lần**. Cái giá, lấy thẳng từ bảng bài 31:

```
D = 30 s  →  giết 93,49 % số trận  →  3.740 trận chết  →  37.396 người bị đá giữa trận
```

Hai lựa chọn trên bàn, không có cái thứ ba hiển nhiên:

| | Thời gian | Trận bị giết | Người mất trận |
|---|---|---|---|
| Drain đầy đủ (D = 720 s) | **120,6 phút** | 1,1 | 11 |
| Rolling update mặc định (D = 30 s) | **5,6 phút** | 3.740 | 37.396 |

Deploy 200 pod mà mất hai tiếng nghe vô lý với người quen BE App. Bảng này **đúng**, và phần còn lại của bài giải thích vì sao nó buộc phải đúng — rồi chỉ ra ba chỗ thật sự mua được thời gian.

---

## ⏸ Dừng lại — đoán trước #1

Bạn quyết định deploy nhanh hơn bằng cách **tăng kích thước lô**: thay vì 20 node một lượt, làm 50 node một lượt. Thời gian rơi từ 120,6 xuống 48,2 phút.

**Tổng số node-giờ bạn phải trả thêm cho công suất dư thay đổi thế nào?**

```
(a) Giam 2,5 lan — deploy ngan hon thi tra it hon
(b) Tang 2,5 lan — phai giu 50 node du thay vi 20
(c) Khong doi
(d) Tang nhung it hon 2,5 lan, vi node du duoc dung lai giua cac luot
```

---

## 3. Lý thuyết

### 3.1 Ba chiến lược quen thuộc gãy ở đâu

Không phải "chúng không hợp lắm". Mỗi cái đứng trên đúng một giả định, và game node phá đúng giả định đó.

**Rolling update giả định pod thay thế được.** Kill pod không phải "chuyển tải sang pod khác" — nó là **xoá vĩnh viễn 20 trận**. Và nó tệ hơn việc tắt hết ở một điểm: nó **thành công**. Deployment xanh, health check xanh, không một dòng lỗi — đúng triệu chứng mở bài 29. Thứ duy nhất báo hỏng là biểu đồ CCU.

**Blue-green giả định chuyển traffic là tức thì.** "Traffic" ở đây không phải request mà là **4.000 phiên đang chạy, mỗi phiên sống 480 giây**, state nằm trong RAM của blue nên không chuyển đi đâu được. Bạn chỉ có thể **ngừng cho trận mới vào blue** rồi chờ — tức blue-green cho game node **chính là drain**, chỉ khác ở chỗ nó bắt dựng đủ 200 node green cùng lúc.

**Canary giả định request độc lập.** "5 % traffic sang bản mới" ngầm định mẫu tiếp theo có thể rơi vào bản khác. Ở đây đơn vị nhỏ nhất là **một trận 480 giây với 10 người dính vào nó**: bản mới hỏng thì họ mất trọn trận, không phải mất một request rồi retry. Và không thể chạy hai bản trong cùng một trận để so — simulation là một tiến trình, một binary (bài 28).

Ba cái gãy ở ba chỗ nhưng cùng một gốc: **đơn vị công việc của bạn sống 480 giây và không di chuyển được.** Mọi thứ còn lại trong bài suy ra từ câu đó.

### 3.2 Drain theo lô — và cái không đổi khi bạn đổi lô

Đáp án ⏸ #1 là **(c)**, và đây là chỗ đáng nhớ nhất của mục này.

Gọi `N` = số node, `B` = số node drain song song, `R` = thời gian một lượt (`D` + 3,42 s). Node đang drain vẫn giữ trận cũ nhưng **không nhận trận mới** (bài 29), nên mỗi node bị cordon là 20 slot biến khỏi nguồn cung — phải bù đúng `B` node dư trong suốt lượt đó.

```
Thời gian deploy   = ceil(N/B) × R
Công suất dư đỉnh  = B node
Tổng node-giờ dư   = B × ceil(N/B) × R  =  N × R     ← không có B trong công thức
```

| B | Lượt | Wall-clock | Dư đỉnh | Tổng node-giờ dư |
|---|---|---|---|---|
| 10 | 20 | 241,1 phút | 10 (+5 %) | **40,19** |
| **20** | **10** | **120,6 phút** | **20 (+10 %)** | **40,19** |
| 50 | 4 | 48,2 phút | 50 (+25 %) | **40,19** |
| 200 | 1 | **12,1 phút** (sàn) | 200 (+100 %) | **40,19** |

Tổng lãng phí là hằng số **40,19 node-giờ** ở mọi lô. Bạn không mua thời gian bằng tiền vận hành — bạn mua nó bằng **công suất phải sẵn có tại một thời điểm**. Hai loại chi phí khác nhau: cái đầu là hoá đơn cuối tháng, cái sau là hạn mức quota. Với fleet 200 node, "dư 100 %" còn nói được; với 5.000 node thì không.

Sàn tuyệt đối là `R = 723,42 s ≈ 12,1 phút`, đạt khi `B = N`, và nó bằng đúng đuôi trên của độ dài một trận. Sàn đó **không phụ thuộc quy mô fleet** — deploy 20 node và 20.000 node có cùng một sàn, nếu bạn đủ tiền mua dư 100 %.

Một chỗ mua được thời gian thật mà không tốn thêm gì: **đừng chờ trọn lượt.** Bảng trên bảo thủ — lượt sau chỉ bắt đầu khi lượt trước hết hạn `D`. Nhưng phần lớn node cạn sớm hơn: mô phỏng cho **p50 = 515,7 s** trong khi hạn là 720 s. Giữ **cửa sổ trượt** (luôn đúng `B` node đang drain, node nào cạn thì thay ngay) cho:

```
(200/20) × (515,7 + 3,42) = 5.191 s = 86,5 phút     vs. 120,6 phút theo lô cứng
```

**Nhanh hơn 1,39 lần, không tốn thêm một node dư nào.** Đây là khoản giảm duy nhất trong bài không phải trả bằng tiền hoặc bằng trận chết.

<svg viewBox="0 0 720 250" role="img" aria-labelledby="gs40-a-t gs40-a-d" style="width:100%;height:auto">
<title id="gs40-a-t">Đánh đổi giữa thời gian deploy toàn fleet và số trận bị giết theo hạn drain</title>
<desc id="gs40-a-d">Khi hạn drain tăng từ 30 lên 720 giây, tỉ lệ trận bị giết rơi từ 93 phần trăm xuống gần 0 trong khi thời gian deploy toàn fleet tăng từ 5,6 phút lên 120,6 phút. Hai đường cắt nhau quanh hạn drain 260 giây.</desc>
<line x1="60" y1="200" x2="680" y2="200" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<line x1="60" y1="200" x2="60" y2="36" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<text x="370" y="228" text-anchor="middle" font-size="10" fill="currentColor">hạn drain D (giây)</text>
<text x="60" y="216" text-anchor="middle" font-size="9" fill="currentColor">0</text>
<text x="160" y="216" text-anchor="middle" font-size="9" fill="currentColor">120</text>
<text x="310" y="216" text-anchor="middle" font-size="9" fill="currentColor">300</text>
<text x="460" y="216" text-anchor="middle" font-size="9" fill="currentColor">480</text>
<text x="660" y="216" text-anchor="middle" font-size="9" fill="currentColor">720</text>
<text x="52" y="44" text-anchor="end" font-size="9" fill="currentColor">100</text>
<text x="52" y="124" text-anchor="end" font-size="9" fill="currentColor">50</text>
<text x="52" y="204" text-anchor="end" font-size="9" fill="currentColor">0</text>
<polyline points="85,50 160,82 310,143 460,190 560,199 660,200" fill="none" stroke="#ef4444" stroke-width="2.5"/>
<polyline points="85,193 160,174 310,135 460,97 560,71 660,46" fill="none" stroke="#3b82f6" stroke-width="2.5"/>
<circle cx="85" cy="50" r="3.5" fill="#ef4444"/>
<circle cx="660" cy="200" r="3.5" fill="#ef4444"/>
<circle cx="85" cy="193" r="3.5" fill="#3b82f6"/>
<circle cx="660" cy="46" r="3.5" fill="#3b82f6"/>
<text x="96" y="46" font-size="10" font-weight="bold" fill="currentColor">93,49 % trận chết</text>
<text x="96" y="60" font-size="9" fill="currentColor" opacity="0.8">mặc định k8s · deploy 5,6 phút</text>
<text x="652" y="42" text-anchor="end" font-size="10" font-weight="bold" fill="currentColor">deploy 120,6 phút</text>
<text x="652" y="56" text-anchor="end" font-size="9" fill="currentColor" opacity="0.8">0,027 % trận chết</text>
<text x="180" y="120" font-size="10" font-weight="bold" fill="#ef4444">% trận bị giết</text>
<text x="380" y="112" font-size="10" font-weight="bold" fill="#3b82f6">thời gian deploy (thang 0–125 phút)</text>
<line x1="270" y1="36" x2="270" y2="208" stroke="currentColor" stroke-opacity="0.35" stroke-width="1.5" stroke-dasharray="4 3"/>
<text x="276" y="180" font-size="9" font-style="italic" fill="currentColor" opacity="0.9">không có điểm tối ưu — chỉ có chỗ bạn chọn đau ở đâu</text>
</svg>

### 3.3 Mô hình allocation: node tự đăng ký, và trạng thái không ai được giết

Rolling update sai vì scheduler không biết pod nào đang bận. Sửa gốc là **cho nó biết**. Mô hình chung, độc lập công cụ, bốn phần:

1. **Node tự đăng ký sức chứa.** Ghi `{node_id, addr, slots_free, accepting}` vào một chỗ chung (Redis, etcd, CRD) và heartbeat mỗi vài giây — đúng cấu trúc bài 29 đã dựng để routing.
2. **Allocator cấp phát, không phải LB cân bằng.** Matchmaker (bài 30) xin một slot; allocator chọn node còn chỗ, trừ slot, trả địa chỉ. Cấp phát tài nguyên một chiều có trạng thái, không phải round-robin.
3. **Node vào trạng thái `Allocated`.** Mắt xích quan trọng nhất: một cờ mà **mọi cơ chế thu hồi phải tôn trọng** — autoscaler, cluster-autoscaler ("underutilized"), node drain của k8s đều không được đụng.
4. **Node tự tuyên bố xong.** Trận cuối kết thúc → `Shutdown` → hạ tầng được phép xoá. Vòng đời do **node** đóng, không do controller đoán.

Điểm đảo ngược so với k8s thuần: ở Deployment, controller quyết định pod nào sống; ở đây **pod quyết định**, controller chỉ được hỏi. Không có bước 3 thì mọi thứ khác vô nghĩa — bạn viết drain rất đẹp rồi cluster-autoscaler thu hồi máy vì thấy CPU 0,87 %.

> **Agones** là hiện thân phổ biến của mô hình này trên Kubernetes: CRD `GameServer` với đúng chuỗi trạng thái `Ready → Allocated → Shutdown`, `Fleet` thay cho Deployment, `GameServerAllocation` cho bước 2, và annotation chặn cluster-autoscaler ở bước 3. *(Tên và chuỗi trạng thái là kiến thức nền, **không verify được trong session này** — trước khi dựa vào chi tiết API hãy đọc tài liệu bản bạn dùng. Cái phải nhớ là **bốn bước ở trên**; công cụ chỉ là một cách hiện thực chúng, và tự viết bằng Redis + một controller nhỏ cũng đủ cho fleet vài trăm node.)*

<svg viewBox="0 0 720 240" role="img" aria-labelledby="gs40-b-t gs40-b-d" style="width:100%;height:auto">
<title id="gs40-b-t">Vòng đời một game node trong mô hình allocation</title>
<desc id="gs40-b-d">Node khởi động rồi tự đăng ký vào bể sẵn sàng, allocator lấy một slot đưa node sang trạng thái đã cấp phát được bảo vệ khỏi thu hồi, khi trận cuối kết thúc node tự tuyên bố tắt. Bể sẵn sàng phải giữ đủ slot đệm để bù thời gian khởi động node.</desc>
<rect x="16" y="86" width="104" height="54" rx="8" fill="#64748b" fill-opacity="0.28"/>
<text x="68" y="108" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">BOOTING</text>
<text x="68" y="125" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.85">T = 90 s</text>
<rect x="152" y="60" width="168" height="106" rx="10" fill="#84cc16" fill-opacity="0.22"/>
<text x="236" y="82" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">BỂ READY — slot đệm</text>
<text x="236" y="102" text-anchor="middle" font-size="10" fill="currentColor">tự đăng ký sức chứa</text>
<text x="236" y="120" text-anchor="middle" font-size="10" fill="currentColor">heartbeat mỗi 3 s</text>
<text x="236" y="142" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">phải giữ ≥ 200 slot</text>
<text x="236" y="157" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.85">= 10 node ở λ = 8,33 trận/s</text>
<rect x="352" y="60" width="176" height="106" rx="10" fill="#3b82f6" fill-opacity="0.25"/>
<text x="440" y="82" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">ALLOCATED</text>
<text x="440" y="102" text-anchor="middle" font-size="10" fill="currentColor">đang giữ 1–20 trận</text>
<text x="440" y="122" text-anchor="middle" font-size="10" font-weight="bold" fill="#ef4444">KHÔNG ai được giết</text>
<text x="440" y="140" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.85">autoscaler · evict · scale-down</text>
<text x="440" y="156" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.85">đều phải bỏ qua trạng thái này</text>
<rect x="560" y="86" width="144" height="54" rx="8" fill="#8b5cf6" fill-opacity="0.28"/>
<text x="632" y="106" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">SHUTDOWN</text>
<text x="632" y="124" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.85">node tự tuyên bố, rồi mới xoá</text>
<line x1="120" y1="113" x2="150" y2="113" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5"/>
<line x1="320" y1="100" x2="350" y2="100" stroke="currentColor" stroke-opacity="0.6" stroke-width="2"/>
<text x="335" y="92" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.9">allocator</text>
<line x1="350" y1="136" x2="322" y2="136" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5"/>
<text x="336" y="152" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.9">trận xong</text>
<line x1="528" y1="113" x2="558" y2="113" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5"/>
<rect x="352" y="182" width="176" height="34" rx="6" fill="#f59e0b" fill-opacity="0.28"/>
<text x="440" y="196" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">CORDON (drain / scale-down)</text>
<text x="440" y="210" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.85">ngừng nhận mới, giữ nguyên trận cũ</text>
<line x1="440" y1="166" x2="440" y2="180" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5"/>
<text x="16" y="30" font-size="11" font-weight="bold" fill="currentColor">Node đóng vòng đời của chính nó. Controller chỉ được phép hỏi, không được phép quyết.</text>
<text x="16" y="46" font-size="9" fill="currentColor" opacity="0.8">Đảo ngược so với Deployment — và là lý do rolling update không áp lên đây được.</text>
</svg>

### 3.4 HPA theo CPU sai, và sai bằng hai bậc độ lớn

Bài 1 nói một câu ngắn: *"CPU gần như phẳng dù 1 hay 100 player"*. Giờ đo nó.

Bench `sim.Step` (bài 8) tuyến tính chặt qua bốn bậc: 126 ns/100 entity, 1,18 µs/1.000, 11,9 µs/10.000, 119 µs/100.000 — tức **1,19 ns mỗi entity mỗi step**, 0 allocs. Một node đầy = 20 trận × 500 entity = 10.000 entity:

| Node đang giữ | Entity | Thời gian sim/tick | % ngân sách 16,67 ms |
|---|---|---|---|
| 1 trận | 500 | 0,59 µs | 0,0036 % |
| 10 trận | 5.000 | 5,95 µs | 0,0357 % |
| **20 trận (đầy)** | **10.000** | **11,90 µs** | **0,0714 %** |

**Toàn bộ dải động của CPU simulation, từ node rỗng tới node đầy, là 0,068 điểm phần trăm.** Không ngưỡng HPA nào phân giải được khoảng đó.

Phần I/O lớn hơn nhưng vẫn không cứu được: node đầy gửi `200 người × 20 Hz = 4.000 gói/s`; ở ~2 µs mỗi syscall đó là **0,80 % một core** *(ước lượng bậc độ lớn, không phải số đo — phụ thuộc kernel, batching, GSO)*. Cộng lại node đầy ≈ **0,87 %**.

> HPA đặt mục tiêu 70 % CPU sẽ scale-up khi node chạm **80 lần** mức tải mà slot của nó cho phép. Nó **không bao giờ** kích hoạt. Node hết chỗ ở 0,87 % CPU và HPA vẫn báo "còn thừa 99 %".

Tệ hơn là chiều ngược lại: khi CPU *có* nhích lên, nguyên nhân thường là GC pause hoặc một trận nhiều entity bất thường, không phải số người chơi. HPA sẽ scale theo nhiễu.

**Tín hiệu đúng có sẵn ngay trong mục 3.3:** allocator buộc phải biết `số trận đang chạy` và `số slot còn trống` để cấp phát. Autoscaler chỉ cần đọc hai số đó — không cần metric server, không cần suy diễn từ CPU.

### 3.5 Scale theo slot: giữ bao nhiêu là đủ

Luật cơ bản: **node phải sẵn sàng trước khi trận cần nó**, mà node cần `T` giây để khởi động (pull image, warm-up, đăng ký), và trong `T` giây đó allocator không có thêm chỗ nào. Vậy bể `Ready` phải luôn giữ sẵn `S` slot đệm.

Hai nguồn tiêu thụ `S`, và trực giác hay chọn nhầm cái to hơn:

```
S  ≈  g · (T + P)                +   z · √(λ · L)
      ────────────────────           ─────────────
      tăng trưởng có hướng           dao động ngẫu nhiên
      (giờ vàng, sự kiện)            (đến/đi Poisson)
```

`g` = tốc độ tăng ròng số trận (trận/s), `P` = chu kỳ autoscaler, `λ` = tốc độ trận mới, `L` = độ dài trận. Số trận đang chạy ở trạng thái dừng phân phối Poisson quanh `λ·L`, nên độ lệch chuẩn là `√(λ·L)`.

Fleet của bài: `λ = 4.000/480 = 8,33 trận/s`, `λ·L = 4.000`, `√4.000 = 63,25`. Giờ vàng dốc nhất (20.000 → 40.000 CCU trong 2 giờ) cho `g = 0,278 trận/s`; với `T = 90 s`, `P = 30 s`:

```
thành phần tăng trưởng:  0,278 × 120  =   33 slot
thành phần dao động:     3,2 × 63,25  =  202 slot     ← lớn hơn 6 lần
```

**Ở fleet lớn, cái ăn hết đệm không phải giờ vàng — là nhiễu.** Đây là chỗ trực giác hay sai: người ta chuẩn bị cho đợt tăng tải và bị giết bởi độ lệch chuẩn.

Công thức là cận trên — nó bỏ qua việc trận cũng **kết thúc** trong lúc node đang boot. Mô phỏng 6 giờ, 5 hạt giống, ~685.000 lượt tạo trận, có đoạn giờ vàng, autoscaler chu kỳ 30 s:

| Slot đệm S | = node | T = 45 s | T = 90 s | T = 180 s | Người bị chặn/ngày (T = 90 s) |
|---|---|---|---|---|---|
| 0 | 0 | 34,66 % | 34,66 % | 34,66 % | — |
| 40 | 2 | 0,4450 % | 1,2540 % | 5,4226 % | 90.288 |
| 80 | 4 | 0,0314 % | 0,1822 % | 0,6021 % | 13.118 |
| 120 | 6 | 0,0004 % | 0,0260 % | 0,1527 % | 1.872 |
| 160 | 8 | **0** | 0,0006 % | 0,0318 % | 43 |
| **200** | **10** | 0 | **0** | 0,0004 % | **0** |
| 260 | 13 | 0 | 0 | **0** | 0 |

*(Ba cột giữa là tỉ lệ trận bị từ chối vì hết slot; "0" = không lượt nào trong 685.000 lượt của 5 lần chạy, không phải chứng minh bằng 0. Cột cuối quy tỉ lệ `T = 90 s` ra người thật ở **720.000 trận/ngày**, 10 người một trận.)*

Cắt đệm từ 10 node xuống 6 tiết kiệm **4 node trong 200 = 2 %** hoá đơn compute, đổi lấy **1.872 người/ngày nhận màn hình "server full"**.

Hai hệ quả:

- **Giảm `T` rẻ hơn tăng `S`.** Từ `T = 180` xuống `T = 45` cắt đệm 13 node → 8 node, tiết kiệm 5 node vĩnh viễn chỉ bằng pre-pull image và cắt warm-up.
- **Đệm tăng theo `√`, không tuyến tính.** Fleet gấp 100 lần chỉ cần đệm gấp 10. Ở 1.000 CCU đệm là 40 % fleet; ở 100.000 CCU là 3,2 %. **Game nhỏ trả đắt hơn hẳn cho cùng mức an toàn.**

---

## ⏸ Dừng lại — đoán trước #2

Nửa đêm, CCU rơi từ 40.000 xuống 10.000. Bạn cần rút 150 node. Node không rời đi ngay được: phải cordon rồi chờ trận cạn.

**Trong lúc chờ cạn, bạn trả tiền cho node mà không dùng hết. Tổng lãng phí là bao nhiêu, và có đáng rút không?**

```
(a) ~150 node-gio (moi node lang phi tron thoi gian drain) — vua du hoa von
(b) ~12 node-gio — nho khong dang ke so voi cai tiet kiem duoc
(c) ~60 node-gio — dang ke, nen rut it hon
(d) Khong the tinh duoc vi khong biet truoc tran nao dai
```

---

### 3.6 Scale-down: chỗ khó thật sự

Đáp án là **(b)**, và con số nhỏ hơn trực giác vì lý do đáng nghĩ.

Quy trình đúng là ba bước, không bước nào giống scale-in của một ASG:

```
1. CORDON   accepting = false. Allocator bỏ qua. Người chơi không thấy gì.
2. CHỜ CẠN  node vẫn chạy trận cũ ở đủ 60 Hz. KHÔNG degrade, KHÔNG evict.
3. XOÁ      trận cuối xong → node tự vào Shutdown → hạ tầng thu hồi.
```

Chi phí: mô phỏng 200.000 lượt, trận `N(480, 90)`, thời điểm bắt đầu rải đều. "Lãng phí" = tích phân **phần slot trống** trên node trong thời gian chờ, quy ra node-giờ:

| Số trận lúc cordon | Drain p50 | Drain p99 | Lãng phí trung bình |
|---|---|---|---|
| **20 (đầy)** | **515,7 s** | **682,1 s** | **0,0773 node-giờ** |
| 15 | 499,0 s | 674,6 s | 0,0892 |
| 10 | 474,0 s | 663,0 s | 0,0985 |
| 5 | 421,8 s | 638,5 s | 0,0998 |
| 2 | 329,5 s | 605,8 s | 0,0836 |

*(Hai cột drain của dòng đầu tái lập độc lập bảng bài 31 — 516 s và 683,4 s. Hai mô phỏng khác nhau ra cùng số là một kiểm tra chéo, không phải trùng hợp.)*

Bảng lật hai trực giác cùng lúc:

**Chọn node vắng nhất để rút gần như không rút ngắn được gì.** Từ 20 trận xuống 5, drain p99 chỉ giảm 682,1 → 638,5 s (**6,4 %**) — vì drain là bài toán **max**, và cực đại của 5 mẫu không nhỏ hơn cực đại của 20 mẫu bao nhiêu.

**Node vắng lãng phí *nhiều* hơn node đầy** (0,0985 vs 0,0773 node-giờ): node 10 trận đã có sẵn 10 slot trống từ giây đầu mà bạn vẫn trả tiền cho cả 20. "Rút node vắng trước" tối ưu sai chỉ số ở cả hai đầu.

Bây giờ trả lời ⏸ #2. Rút 150 node:

```
lãng phí  = 150 × 0,0773        =  11,6 node-giờ
tiết kiệm = 150 × 4 giờ trũng   = 600,0 node-giờ
tỉ lệ     = 600 / 11,6          =  51,7 lần
```

**Điểm hoà vốn:** node phải ở ngoài lâu hơn `0,0773 giờ = 4,6 phút` là đã lãi. Với vùng trũng 2 giờ tỉ lệ đã là 25,9 lần. Kết luận: **scale-down mạnh tay về node-giờ là đúng.**

Nhưng chi phí thật của scale-down sai **không nằm ở node-giờ** — nó nằm ở bảng 3.5. Rút thừa 4 node (đệm 200 → 120 slot) tiết kiệm `4 × 0,25 = 1 USD/giờ` và trả bằng **1.872 người/ngày** không vào được trận. Đó là tỉ giá tệ nhất trong bài.

> **Scale-down ràng buộc bởi đệm, không bởi tải.** Điều kiện rút một node là `slot_trống − 20 ≥ S` — không phải "CPU thấp", cũng không phải "node vắng".

Ràng buộc thứ hai, chống rung: đã cordon thì **không huỷ cordon để dùng lại** — node đã báo `accepting=false` và có thể còn quyết định cấp phát cũ đang bay (bước 2 bài 31). Đặt độ trễ tối thiểu giữa hai lần scale-down theo chu kỳ giờ vàng, không theo phút.

### 3.7 Hoá đơn: $/CCU/tháng, và cái nào lớn hơn

Ba mức CCU. Số node = `CCU / 10 người / 20 slot`, cộng 10 % dư deploy (mục 3.2) và đệm `3,2·√(số trận)` slot (mục 3.5). Đơn giá **0,25 USD/node/giờ** và **0,09 USD/GB egress** đều là **giả định**; egress mỗi người lấy cận trên 24,56 KB/s của bài 27.

| CCU | Node (nền + deploy + đệm) | Compute/tháng | Egress/tháng | **$/CCU/tháng** | Egress ÷ compute |
|---|---|---|---|---|---|
| 1.000 | 8 (5 + 1 + 2) | 1.440 USD → 1,440/CCU | 63.660 GB → 5.729 USD → 5,729/CCU | **7,169** | **3,98 ×** |
| 10.000 | 61 (50 + 5 + 6) | 10.980 USD → 1,098/CCU | 636.595 GB → 57.294 USD → 5,729/CCU | **6,827** | **5,22 ×** |
| 100.000 | 566 (500 + 50 + 16) | 101.880 USD → 1,019/CCU | 6.365.952 GB → 572.936 USD → 5,729/CCU | **6,748** | **5,62 ×** |

*(Cột egress khớp đúng bảng bài 27 — cùng giả định, tính lại độc lập. Dải đơn giá thực tế 0,02–0,12 USD/GB, và có nhà cung cấp miễn phí egress; con số đáng nhớ là **tỉ lệ**, không phải USD.)*

**Egress lớn hơn compute 4–5,6 lần, và khoảng cách nới ra khi lớn lên.** Buổi họp tối ưu chi phí nào bắt đầu bằng "chọn instance rẻ hơn" là đang tối ưu con số nhỏ; một giờ cho chương 6 (AOI, delta, quantization) đáng hơn một tuần chọn máy.

**Compute có economy of scale, egress thì không.** `$/CCU` compute giảm 1,440 → 1,019 (**−29,2 %**) nhờ đệm theo `√` và làm tròn node nhẹ đi; egress đứng yên ở 5,729 cả ba mức — người thứ 100.001 tốn đúng bằng người đầu tiên (bài 27).

**Thuế vận hành đo được:** dư deploy + đệm là 30 node trong 230 = **13,0 %** hoá đơn compute không phục vụ ai; ở 1.000 CCU là `3/8 =` **37,5 %**. Đó là câu trả lời cho "sao game nhỏ mà tốn thế".

### 3.8 Canary, rollback, và thứ thay thế cả hai

**Canary cho game node** không phải "5 % traffic" (mục 3.1) mà là **`k` node chạy bản mới, nhận trận mới bình thường, so metric theo trận** — bài toán cỡ mẫu, không phải cảm giác. Metric: tỉ lệ trận có tick trễ, nền **1 %**; kiểm định hai tỉ lệ, α = 0,05 hai phía, power 0,80:

| Muốn phát hiện | Trận cần cho nhánh mới | 2 node canary (300 trận/h) | 20 node canary |
|---|---|---|---|
| 1 % → 3 % | 767 | **2,6 giờ** | 0,3 giờ |
| 1 % → 2 % | 2.316 | 7,7 giờ | 0,8 giờ |
| 1 % → 1,5 % | 7.741 | 25,8 giờ | 2,6 giờ |
| 1 % → 1,1 % | 162.910 | 543 giờ | 54,3 giờ |

Dòng cuối là cái phải nhớ: **canary không phát hiện được hồi quy nhỏ.** Bắt mức 1 % → 1,1 % cần 54 giờ trên 10 % fleet — lâu hơn khoảng cách giữa hai lần deploy. Với hồi quy nhỏ, thứ cứu bạn là metric sau khi ra 100 % cộng khả năng quay lại, không phải canary.

Canary còn có chi phí riêng ở hệ stateful: **hai binary cùng sống trong 2,6 giờ**, tức hai định dạng snapshot và hai schema gói tin phải cùng tương thích với client (bài 24).

**Rollback là chỗ đau nhất.** Bản mới chạy 30 phút, đang giữ hàng nghìn trận. Rollback **không phải** đổi image tag rồi xong — nó là **một lần drain nữa, đầy đủ**:

```
deploy tiến  120,6 phút  +  rollback lùi  120,6 phút  =  241,2 phút = 4,02 giờ
```

**Bốn giờ từ lúc bấm deploy tới lúc chắc chắn không còn ai chạy bản hỏng.** Đó là MTTR sàn của hệ stateful, và CI nhanh hơn không giảm được nó. Hệ quả: **quyết định rollback phải ra trong 10 phút đầu**, khi mới có 1–2 lô chạy bản mới — chờ thêm không cho thêm thông tin (bảng cỡ mẫu trên) mà chỉ nhân đôi số trận phải drain.

**Feature flag là lối thoát khỏi cả hai.** Node đọc lại cấu hình mỗi vài giây:

```go
// Đọc lại cấu hình ngoài vòng tick; tick chỉ đọc con trỏ atomic.
if cfg.Load().NewHitReg {
    hits = hitregV2(w, shot)
} else {
    hits = hitregV1(w, shot)
}
```

Ba tính chất khiến nó thắng deploy, cả ba là hệ quả trực tiếp của mục 3.1:

| | Deploy binary mới | Feature flag |
|---|---|---|
| Tới 100 % fleet | 120,6 phút | vài giây |
| Rollback | 120,6 phút | vài giây |
| Trận đang chạy | phải chờ cạn | đổi ngay, **kể cả giữa trận** |

Đổi giữa trận là dao hai lưỡi: hợp lệ với tham số cân bằng (sát thương, tốc độ hồi máu, bán kính AOI), **không** hợp lệ với thứ động tới determinism (bài 9–11) — đổi luật vật lý giữa trận thì client và server rẽ nhánh ngay tick sau. Ranh giới: **flag được đổi thứ mà mọi bên tính lại từ state hiện tại; không được đổi thứ nằm trong chuỗi replay.**

Cái giá đã biết trước: mỗi flag là một nhánh phải test, và flag không xoá sẽ tích lại. So với 4,02 giờ MTTR thì đó là món hời — **ở hệ stateful, feature flag là hạ tầng bắt buộc, không phải best practice.**

---

## 4. Checklist production

Mỗi dòng có một điều kiện kiểm được. Đọc lại trước mỗi lần deploy.

**Vòng đời node**
- [ ] `terminationGracePeriodSeconds` > drain p99 + 3,42 s. Với `L = 480 ± 90 s`: **≥ 725**. Mặc định 30 giết 93,49 %.
- [ ] `Allocated` được **autoscaler, cluster-autoscaler và node drain** cùng tôn trọng — kiểm bằng cách drain thử một node xem có evict nhầm không.
- [ ] `preStop` chỉ đặt cờ cordon; **không** đóng listener — client đang chơi cần reconnect (bài 16, 31).

**Deploy**
- [ ] Lô `B` chọn theo công suất dư **có thật**. Tổng node-giờ dư = `N × R` bất kể `B`.
- [ ] Cửa sổ trượt thay lô cứng: nhanh hơn 1,39 lần, không tốn thêm node.
- [ ] Deploy có nút dừng giữa chừng; ước lượng trước thời gian, số trận sẽ chết, CCU-giờ chạy bản cũ.

**Autoscale**
- [ ] Tín hiệu là **số trận đang chạy** và **số slot trống**. Không HPA theo CPU (dải động 0,068 điểm %).
- [ ] Đệm `S ≥ g·(T+P) + 3,2·√(λ·L)`, hiệu chỉnh bằng mô phỏng của chính bạn.
- [ ] `T` được đo, không đoán — pre-pull image, cắt warm-up. Giảm `T` rẻ hơn tăng `S`.
- [ ] Scale-down điều kiện `slot_trống − 20 ≥ S`; có độ trễ chống rung; **không huỷ cordon**.

**Đo**
- [ ] Trận bị từ chối vì hết slot — mục tiêu **0**, báo động ngay lần đầu chứ không theo tỉ lệ.
- [ ] Drain p50/p99 theo node so với `D`; `p99 > 0,9 × D` là dấu hiệu `D` sắp thiếu.
- [ ] Số trận bị giết mỗi deploy, tách nguyên nhân (hết hạn drain / crash / evict nhầm); slot đệm thực tế vẽ chồng lên `S`; `$/CCU/tháng` tách compute và egress.

**Rollback & flag**
- [ ] Quyết định rollback ra trong **10 phút đầu**; ai quyết, theo metric nào — viết sẵn.
- [ ] Bản n−1 còn image và còn tương thích schema gói tin hiện tại (bài 24); đã thử rollback thật một lần có bấm giờ.
- [ ] Thay đổi cân bằng đi qua flag, không qua deploy; flag đọc ngoài vòng tick, tick chỉ đọc con trỏ atomic.
- [ ] Flag động tới chuỗi replay bị chặn ở mức code review; mỗi flag có hạn xoá.

---

## 5. Tính tay

**Bài 1.** Fleet 500 node, 12 trận/node, trận 300 ± 60 s, `D = 480 s`, `R = D + 3,4 s`.
- Deploy toàn fleet với `B = 25` mất bao lâu? Với `B = 100`? Tổng node-giờ dư của hai phương án có bằng nhau không, vì sao?
- Chuyển sang cửa sổ trượt với p50 drain 330 s, `B = 25` còn bao lâu?

**Bài 2.** Cùng fleet: `λ` bao nhiêu trận/s, `√(λ·L)` bằng bao nhiêu? Với `T = 120 s`, `P = 30 s`, giờ vàng tăng 3.000 trận trong 90 phút:
- Hai thành phần của `S` là bao nhiêu slot, cái nào lớn hơn mấy lần? `S` quy ra bao nhiêu node, bằng bao nhiêu phần trăm fleet?
- So với 10/200 = 5 % của bài: fleet nào trả thuế đệm nặng hơn, và điều đó có mâu thuẫn với luật `√` không?

**Bài 3.** Vẫn fleet đó, 60.000 CCU, 0,25 USD/node/giờ, egress 18 KB/s mỗi người, 0,09 USD/GB, tháng 2.592.000 s.
- `$/CCU/tháng` compute và egress, tính riêng. Egress gấp compute mấy lần, và vì sao lệch so với 5,22 lần của bài?
- Cắt egress còn 12 KB/s bằng một tuần làm AOI tiết kiệm bao nhiêu USD/tháng? Mỗi KB/s cắt được đáng bao nhiêu tiền một tháng?

---

## 6. Chuyển giao

1. Game có chế độ **ranked 25 phút** và **casual 6 phút** chạy chung fleet. `D` đặt theo cái nào? Tách hai fleet thì được gì ngoài `D` ngắn hơn cho casual?
2. **Spot instance rẻ hơn 70 %** nhưng thu hồi sau thông báo 2 phút. Với `L = 480 s`, tỉ lệ trận bị giết mỗi lần thu hồi là bao nhiêu? Có phần nào của fleet đặt lên spot được không?
3. Bản mới **giảm** số entity mỗi trận nên node chứa được nhiều trận hơn. Điều đó đổi `S` theo hướng nào, và bạn có được giảm số node ngay trong lúc deploy không?
4. Bạn muốn deploy **không có thời điểm nào chạy hai binary**. Chứng minh bằng số rằng điều đó buộc CCU phải về 0, hoặc chỉ ra chỗ lập luận sai.
5. Allocator chết 40 giây rồi sống lại; autoscaler mất nguồn `số trận đang chạy`. Trong 40 giây đó nó nên giữ nguyên, scale-up phòng hờ, hay dừng hẳn? Mỗi lựa chọn hỏng kiểu gì?
6. Bài 31 cho ngưỡng **`L ≥ 4D` thì phục hồi trận là đường duy nhất** — với `D = 720 s` là `L ≥ 2.880 s = 48 phút`. Nhưng `D` do **bạn** chọn, chọn lớn hơn thì ngưỡng lùi ra. Vậy `L ≥ 4D` nói về game của bạn hay chỉ nói về cấu hình của bạn? Viết lại bất đẳng thức đó bằng những đại lượng bạn **không** chọn được.
7. **Câu khó nhất:** mục 3.2 chứng minh tổng node-giờ dư là `N × R` bất kể lô — nhưng phép chứng minh giả định **mọi node đều phải drain**. Giả sử allocator được phép **chọn** node nhận trận mới trong giờ trước khi deploy, và nó dồn trận vào một nửa fleet để nửa kia tự rỗng. Chiến lược đó cắt được bao nhiêu node-giờ dư và bao nhiêu wall-clock? Rồi tính cái nó phá: dồn trận làm giảm slot trống, tức ăn vào `S` của mục 3.5. Ở fleet 200 node với `S = 200` slot, dồn được tối đa bao nhiêu phần trăm fleet trước khi tỉ lệ trận bị từ chối vượt 0? Và nếu đáp số nhỏ hơn bạn tưởng — **có tồn tại một lần deploy nào của hệ stateful mà không mua bằng công suất dư không?**

---

## 7. Tóm tắt

- Ba chiến lược quen thuộc gãy ở ba giả định: rolling — **pod thay thế được**; blue-green — **traffic chuyển tức thì**; canary — **request độc lập**. Đơn vị công việc ở đây sống **480 s và không di chuyển được**.
- Deploy 200 node, `R = 723,42 s`: `B = 20` → **120,6 phút**; `B = 200` → **12,1 phút** (sàn tuyệt đối, bằng đúng `R`). Tổng node-giờ dư là **40,19 ở mọi `B`** — bạn mua thời gian bằng **công suất đỉnh**, không bằng tiền vận hành.
- Cửa sổ trượt thay lô cứng: **86,5 phút thay vì 120,6 — nhanh 1,39 lần, không tốn thêm node.**
- Mô hình allocation bốn bước: node **tự đăng ký** → allocator **cấp phát** → `Allocated` **không ai được giết** → node **tự tuyên bố xong**. Agones là một hiện thân trên k8s; bốn bước mới là thứ phải nhớ.
- Đệm tăng theo **`√`**: 40 % fleet ở 1.000 CCU, 3,2 % ở 100.000 CCU. Giảm `T` rẻ hơn tăng `S`.
- Dải động CPU simulation từ node rỗng tới node đầy là **0,068 điểm phần trăm** (0,0036 % → 0,0714 %); node đầy ≈ **0,87 %** kể cả I/O. HPA mục tiêu 70 % cần **80 lần** mức đó — không bao giờ kích hoạt.
- Đệm `S ≈ g·(T+P) + 3,2·√(λ·L)`. Ở `λ·L = 4.000`, thành phần dao động **202 slot** lớn hơn thành phần giờ vàng **33 slot** tới **6,1 lần** — nhiễu giết bạn, không phải đợt tăng tải.
- Mô phỏng 685.000 lượt: `T = 90 s` cần **200 slot = 10 node** để không từ chối trận nào. Cắt xuống 6 node tiết kiệm **2 %** compute, chặn **1.872 người/ngày**.
- Scale-down: chọn node vắng nhất chỉ rút ngắn drain p99 **6,4 %** mà lãng phí **nhiều hơn** (0,0985 vs 0,0773 node-giờ). Rút 150 node tốn **11,6 node-giờ**, tiết kiệm **600** — hoà vốn sau **4,6 phút**. Ràng buộc thật là **đệm**, không phải tải.
- `$/CCU/tháng` **6,75–7,17**; egress lớn hơn compute **3,98–5,62 lần** và khoảng cách nới ra theo quy mô. Compute giảm **29,2 %** mỗi CCU từ 1.000 lên 100.000 CCU; egress **đứng yên**. Thuế deploy + đệm: **13,0 %** ở 40.000 CCU, **37,5 %** ở 1.000 CCU.
- Canary bắt 1 % → 3 % trong **2,6 giờ** trên 2 node, nhưng 1 % → 1,1 % cần **543 giờ** — hồi quy nhỏ không bắt bằng canary.
- MTTR sàn của deploy sai = **4,02 giờ** (drain tiến + drain lùi). Quyết định rollback phải ra trong **10 phút đầu**. Feature flag làm cả hai chiều trong vài giây — ở hệ stateful nó là hạ tầng bắt buộc, không phải best practice.

→ **Chương 10 — Capstone.** Chín chương lý thuyết đã xong. Hai bài cuối dựng agar-lite thật: bài 41 làm nó chạy được, bài 42 làm nó chơi được — và đo lại mọi con số bạn đã dự đoán suốt course.
