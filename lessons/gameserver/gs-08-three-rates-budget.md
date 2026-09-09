# Bài 8 — Ba loại nhịp & ngân sách độ trễ

## 1. Mục tiêu

Sau bài này bạn có thể:

- Chỉ ra **ba nhịp tiêu ba nguồn lực khác nhau**, và nguồn lực nào đắt nhất trên hoá đơn thật.
- Tính ra **cái giá bằng byte** của việc nâng snapshot rate, và vì sao snapshot gần như luôn thấp hơn sim tick.
- **Bóc tách 182 ms** từ lúc A bấm tới lúc B nhìn thấy, thành bảy chặng có tên và có số.
- **Xếp hạng bốn cách cắt độ trễ** theo mili giây mua được trên mỗi đồng bỏ ra — và giải thích vì sao thứ tự đó gần như đảo ngược mức độ nó được bàn tán.
- Dùng số bench thật để chứng minh **vật lý không phải nút thắt**, và chỉ đúng ba thứ ăn ngân sách một tick.
- Đọc metric tick bằng **p99**, và nói được vì sao trung bình sẽ báo cáo một hệ thống đang giật là khoẻ mạnh.

---

## 2. Triệu chứng

Cuộc tranh cãi này có thật, lặp lại trên mọi diễn đàn FPS suốt mười lăm năm, luôn y hệt nhau:

> **"Server 64 tick là ăn cắp tiền người chơi. Phải 128 tick mới công bằng."**
> **"128 tick chỉ là placebo, chả ai phân biệt được."**

Hai phe ném benchmark, video slow-motion và biểu đồ vào nhau. Nhà phát hành ra thông cáo. Có studio đổi hẳn hạ tầng vì áp lực này.

Bây giờ đặt con số lên bàn. Quãng đường từ lúc người A bấm chuột tới lúc người B thấy A nổ súng dài **182 ms** với thiết lập phổ thông. Nâng sim tick 60 → 128 Hz cắt được:

```
4,4 ms   =   2,4 %  ngân sách
```

Còn ở giữa quãng đường đó có đúng một chặng dài:

```
100 ms   =   55 %   ngân sách
```

Chặng 55% ấy không phải mạng, không phải CPU, không phải tick rate. Nó là **một tham số cấu hình một dòng ở client**, đổi được trong năm phút, và trong suốt mười lăm năm cãi nhau kia gần như không ai nhắc tới.

Bài này đi tìm chặng đó — và tìm lý do vì sao cả một ngành nhìn chằm chằm vào 2,4%.

---

## ⏸ Dừng lại — đoán trước #1

Chọn trước khi đọc tiếp.

**Một server chạy sim tick 60 Hz và gửi snapshot 20 Hz. Vì sao nó không gửi luôn ở 60 Hz cho khớp?**

```
(a) Client không vẽ kịp 60 gói mỗi giây
(b) Gửi 60 Hz làm CPU server tăng gấp ba
(c) Băng thông đắt hơn CPU, và tỉ lệ chênh lệch lớn hơn bạn nghĩ
(d) 20 Hz là chuẩn công nghiệp, không có lý do kỹ thuật
```

---

## 3. Lý thuyết

### 3.1 Ba nhịp, ba hoá đơn khác nhau

Bài 1 đã tách tên ba thứ hay bị gọi chung là "tick". Bài này không định nghĩa lại chúng, mà hỏi câu tiếp theo: **mỗi nhịp tiêu của bạn cái gì, và ai trả tiền.**

<svg viewBox="0 0 700 250" role="img" aria-labelledby="gs8-a-t gs8-a-d" style="width:100%;height:auto">
<title id="gs8-a-t">Ba nhịp độc lập và ba nguồn lực chúng tiêu</title>
<desc id="gs8-a-d">Sim tick tiêu CPU của server và tăng tuyến tính theo số tick. Snapshot rate tiêu băng thông và nhân với số người chơi. Render FPS tiêu GPU của client và server hoàn toàn không quan tâm.</desc>
<rect x="20" y="24" width="660" height="60" rx="8" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.28"/>
<text x="38" y="48" font-size="12" font-weight="bold" fill="currentColor">SIM TICK — 60 Hz</text>
<text x="38" y="68" font-size="10" fill="currentColor" opacity="0.8">tiêu CPU server · tăng tuyến tính theo Hz · KHÔNG nhân với số player</text>
<text x="500" y="60" font-size="11" font-weight="bold" fill="currentColor">rẻ đến bất ngờ</text>
<rect x="20" y="96" width="660" height="60" rx="8" fill="#f59e0b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.28"/>
<text x="38" y="120" font-size="12" font-weight="bold" fill="currentColor">SNAPSHOT RATE — 20 Hz</text>
<text x="38" y="140" font-size="10" fill="currentColor" opacity="0.8">tiêu băng thông · tăng theo Hz × số entity × SỐ PLAYER — ba thừa số</text>
<text x="500" y="132" font-size="11" font-weight="bold" fill="currentColor">đắt, có hoá đơn hàng tháng</text>
<rect x="20" y="168" width="660" height="60" rx="8" fill="#64748b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.28"/>
<text x="38" y="192" font-size="12" font-weight="bold" fill="currentColor">RENDER FPS — 144 Hz</text>
<text x="38" y="212" font-size="10" fill="currentColor" opacity="0.8">tiêu GPU của MÁY NGƯỜI CHƠI · server không biết và không cần biết</text>
<text x="500" y="204" font-size="11" font-weight="bold" fill="currentColor">không phải tiền của bạn</text>
</svg>

Ba dòng đó **độc lập nhau** — đây là điểm dễ sai nhất khi mới vào nghề. Server 60 Hz gửi 20 Hz cho client vẽ 144 FPS là cấu hình hoàn toàn bình thường: client dựng 144 khung hình từ 20 gói tin bằng cách **nội suy giữa hai gói gần nhất**. Nó không cần một gói mỗi khung hình, nó cần hai gói để kẹp thời điểm đang vẽ vào giữa.

Ba nhịp độc lập nghĩa là **ba núm vặn riêng, mỗi núm móc vào một cái ví khác nhau**. Phần còn lại của bài đi xem vặn mỗi núm một vòng thì mất bao nhiêu và được bao nhiêu.

### 3.2 Vì sao snapshot luôn thấp hơn sim — nhân ra là thấy

Đáp án hộp đoán trước là **(c)**, và đây là phép nhân.

Một trận MMO-lite, mỗi người chơi nhìn thấy 50 entity trong tầm, mỗi entity 10 byte sau nén *(giả định của bài 3, sẽ đo thật ở bài 24)*:

| Snapshot rate | Mỗi player | 100 player cùng node | Quy ra Mbps chiều ra |
|---|---|---|---|
| 20 Hz | 50 × 10 × 20 = **10 KB/s** | **1,0 MB/s** | 8 Mbps |
| 30 Hz | 15 KB/s | 1,5 MB/s | 12 Mbps |
| 60 Hz | 30 KB/s | **3,0 MB/s** | **24 Mbps** |

Nâng snapshot từ 20 lên 60 Hz để "khớp với sim tick" là **nhân ba hoá đơn băng thông**, vĩnh viễn, mỗi tháng. Đổi lại: thời gian chờ snapshot trung bình giảm từ 25 ms xuống 8,3 ms — **được 16,7 ms**.

Gấp ba tiền băng thông đổi lấy 16,7 ms. Gần như không game nào trả, và không phải vì keo kiệt — mục 3.4 chỉ ra có chỗ khác mua được nhiều hơn ba lần với giá bằng không.

Sự bất đối xứng ở bảng trên là lý do gốc của cả mục này:

> Sim tick tiêu CPU và **không nhân với số player** — một trận 100 người chạy một vòng lặp, y như trận 2 người.
> Snapshot tiêu băng thông và **nhân với số player** — vì mỗi người phải nhận một bản riêng.

Đó là toàn bộ lý do snapshot rate luôn nằm dưới sim tick. Không phải quy ước, mà là hai hàm chi phí khác bậc.

### 3.3 Ngân sách 182 ms — bóc từng chặng

Bây giờ là con số trung tâm của bài. Thiết lập: **RTT 40 ms, sim 60 Hz, snapshot 20 Hz** — cấu hình phổ thông của một game bắn súng chơi trong nước.

Câu hỏi: người A bấm chuột lúc t = 0. Người B nhìn thấy A nổ súng lúc nào?

| # | Chặng | Thời gian | Bản chất | Cắt được không |
|---|---|---|---|---|
| 1 | Gói tin A → server | **20 ms** | nửa RTT, giới hạn vật lý | tốn tiền hạ tầng |
| 2 | Chờ tick kế tiếp | **8,3 ms** | trung bình nửa chu kỳ 16,67 ms | tăng sim tick |
| 3 | Server xử lý input + sim | **< 1 ms** | xem bench mục 3.5 | gần như không có gì để cắt |
| 4 | Chờ snapshot kế tiếp | **25 ms** | trung bình nửa chu kỳ 50 ms | tăng snapshot rate |
| 5 | Gói tin server → B | **20 ms** | nửa RTT | tốn tiền hạ tầng |
| 6 | **Buffer nội suy ở client B** | **100 ms** | **cấu hình một dòng** | **miễn phí** |
| 7 | Chờ khung hình kế tiếp | **8 ms** | nửa chu kỳ ở 60 FPS | máy người chơi |
| | **Tổng** | **≈ 182 ms** | | |

<svg viewBox="0 0 700 148" role="img" aria-labelledby="gs8-b-t gs8-b-d" style="width:100%;height:auto">
<title id="gs8-b-t">Thanh ngân sách 182 mili giây chia theo bảy chặng</title>
<desc id="gs8-b-d">Thanh ngang tỉ lệ theo thời gian: mạng đi 20 mili giây, chờ tick 8,3, xử lý dưới 1, chờ snapshot 25, mạng về 20, buffer nội suy 100 chiếm hơn nửa thanh, chờ render 8.</desc>
<rect x="40" y="52" width="70.2" height="44" fill="#3b82f6" fill-opacity="0.30" stroke="currentColor" stroke-opacity="0.25"/>
<rect x="110.2" y="52" width="29.1" height="44" fill="#84cc16" fill-opacity="0.30" stroke="currentColor" stroke-opacity="0.25"/>
<rect x="139.3" y="52" width="3.5" height="44" fill="#ef4444" fill-opacity="0.45" stroke="currentColor" stroke-opacity="0.25"/>
<rect x="142.8" y="52" width="87.8" height="44" fill="#f59e0b" fill-opacity="0.30" stroke="currentColor" stroke-opacity="0.25"/>
<rect x="230.6" y="52" width="70.2" height="44" fill="#3b82f6" fill-opacity="0.30" stroke="currentColor" stroke-opacity="0.25"/>
<rect x="300.8" y="52" width="351" height="44" fill="#8b5cf6" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.35"/>
<rect x="651.8" y="52" width="28.1" height="44" fill="#64748b" fill-opacity="0.30" stroke="currentColor" stroke-opacity="0.25"/>
<text x="475" y="79" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">buffer nội suy 100 ms — 55 %</text>
<text x="40" y="42" font-size="10" fill="currentColor">t = 0 · A bấm</text>
<text x="680" y="42" text-anchor="end" font-size="10" fill="currentColor">t = 182 ms · B nhìn thấy</text>
<line x1="141" y1="52" x2="141" y2="30" stroke="currentColor" stroke-opacity="0.4"/>
<text x="141" y="22" text-anchor="middle" font-size="9" fill="currentColor">sim &lt; 1 ms</text>
<text x="75" y="112" text-anchor="middle" font-size="9" fill="currentColor">mạng đi 20</text>
<text x="125" y="136" text-anchor="middle" font-size="9" fill="currentColor">chờ tick 8,3</text>
<text x="186" y="112" text-anchor="middle" font-size="9" fill="currentColor">chờ snapshot 25</text>
<text x="266" y="136" text-anchor="middle" font-size="9" fill="currentColor">mạng về 20</text>
<text x="666" y="112" text-anchor="middle" font-size="9" fill="currentColor">render 8</text>
</svg>

Ba nhận xét, mỗi cái đều phản trực giác:

**Một.** Chặng 2 và 4 là **thời gian chờ trung bình**, không phải thời gian xử lý. Gói tin của A tới server ở một thời điểm ngẫu nhiên trong chu kỳ tick; trung bình nó nằm giữa, tức chờ nửa chu kỳ. Đây là lý do "tăng tick rate giảm độ trễ" đúng — nhưng chỉ đúng đến đúng nửa chu kỳ đó, không hơn.

**Hai.** Chặng 3 — thứ cả nghề gọi là "hiệu năng server" — chiếm **dưới 0,6% ngân sách** (số bench ở mục 3.5).

**Ba.** Chặng 6 gần bằng cả sáu chặng kia cộng lại. Nó là buffer nội suy: client cố tình vẽ thế giới **trễ 100 ms so với gói mới nhất nó nhận được**, để luôn có sẵn hai snapshot kẹp quanh thời điểm đang vẽ. Không có đệm đó thì một gói tới muộn là nhân vật đứng hình rồi nhảy cóc. Đổi độ trễ lấy sự mượt — một **lựa chọn**, không phải định luật. Bài 20 dựng lại đầy đủ cơ chế này.

Một chi tiết dễ bỏ qua: 182 ms là độ trễ **A bấm → B thấy**. Còn chính A thấy súng nổ trên màn hình mình sau bao lâu? Gần như **0 ms**, nếu có client prediction — nó chữa cho người bấm, không chữa cho người nhìn.

---

## ⏸ Dừng lại — đoán trước #2

Hộp quan trọng nhất của bài. **Đừng đọc tiếp trước khi xếp xong.** Bốn đề xuất cắt độ trễ, mỗi cái từ một người trong đội. Ngân sách hiện tại 182 ms.

```
A. Nâng sim tick     60 Hz  → 128 Hz
B. Nâng snapshot     20 Hz  → 30 Hz
C. Giảm buffer nội suy 100 ms → 50 ms
D. Giảm RTT          40 ms  → 20 ms  (thêm edge server gần người chơi)
```

Xếp bốn cái theo **thứ tự lợi nhất → tệ nhất**, và với mỗi cái ghi ra hai thứ: nó cắt được **bao nhiêu mili giây**, và nó **tốn cái gì** (tiền, CPU, băng thông, hay rủi ro). Cả bốn đều tính được từ bảng mục 3.3, không cần dữ liệu thêm.

---

### 3.4 Đáp án — và nó gần như đảo ngược mức độ được bàn tán

| Hạng | Cách | Cắt được | Cái giá thật |
|---|---|---|---|
| **1** | **C — buffer 100 → 50 ms** | **−50 ms** | **Không tốn gì.** Đổi lấy rủi ro: mất packet là thấy giật |
| 2 | D — RTT 40 → 20 ms | −20 ms | Tiền hạ tầng, mỗi tháng. Có **trần cứng** |
| 3 | B — snapshot 20 → 30 Hz | −8,3 ms | Băng thông **+50%**, mỗi tháng |
| **4** | **A — sim 60 → 128 Hz** | **−4,4 ms** | **CPU ×2** |

Cách tính, để tự đối chiếu:

```
C:  100 − 50                                 = 50 ms   (cắt thẳng)
D:  (40 − 20), chia hai chặng, mỗi chặng −10 = 20 ms
B:  1000/(2×20) − 1000/(2×30) = 25 − 16,67   = 8,3 ms
A:  1000/(2×60) − 1000/(2×128) = 8,33 − 3,91 = 4,4 ms
```

Đặt hạng 1 cạnh hạng 4:

> **C mua được nhiều gấp 11,4 lần A, với giá bằng không, trong khi A đòi gấp đôi CPU.**

Chỗ đau nằm ở đây: **thứ tự này gần như đảo ngược thứ tự được bàn tán.** Cãi nhau về tick rate có cả một nền văn hoá — video, biểu đồ, thông cáo báo chí. Cãi nhau về buffer nội suy thì gần như không tồn tại, dù nó là 55% ngân sách. Không phải vì ai ngu, mà vì **tick rate là con số dễ đo và dễ đem đi quảng cáo nhất trong bảy chặng**: một số nguyên, in được lên poster, so được giữa hai nhà phát hành. Buffer nội suy nằm trong file cấu hình client, không có gì để khoe, và giải thích nó mất nửa trang.

> **Tối ưu chỗ ăn nhiều nhất, không phải chỗ dễ đo nhất.**

Nói ngay giới hạn, vì không được nói quá:

- **C không miễn phí về chất lượng.** Buffer 100 ms là bảo hiểm chống mất packet và jitter; hạ xuống 50 ms là giảm bảo hiểm — trên mạng ổn định không ai nhận ra, trên 4G thì nhân vật bắt đầu nhảy. Nó tiêu **biên an toàn**, không tiêu tiền. Cách đặt đúng là *đo jitter thật của người chơi thật rồi chọn*, không phải chọn 100 vì tài liệu ghi 100.
- **D có trần cứng là tốc độ ánh sáng.** Sợi quang đi chậm hơn ánh sáng trong chân không và không đi đường thẳng, nên RTT xuyên khu vực nằm ở dải vài chục tới vài trăm ms và không tiền nào mua xuống 0. Bạn mua được vị trí gần hơn, không mua được vật lý.
- **A không vô dụng.** 4,4 ms là thật, và với fighting game ngân sách 50 ms thì đó là 8,8% — đáng cân nhắc. Chỉ là ở FPS ngân sách 182 ms nó là 2,4%, và là món đắt nhất trong bốn món.

Nhìn lại mục 2: hai phe đang cãi nhau về hạng 4.

### 3.5 Bằng chứng: vật lý gần như miễn phí

"A tốn CPU ×2" chỉ đáng sợ nếu CPU là thứ đang khan hiếm. Nó không khan hiếm. Bench thật của `sim.Step` — một bước mô phỏng đầy đủ, đo trên máy Apple M-series:

| Số entity | Một sim step | % ngân sách một tick 16,67 ms | allocs/op |
|---|---|---|---|
| 100 | **126 ns** | 0,0008 % | **0** |
| 1.000 | 1,18 µs | 0,007 % | **0** |
| 10.000 | 11,9 µs | 0,071 % | **0** |
| 100.000 | **119 µs** | **0,71 %** | **0** |

*(Số đo trên một máy cụ thể với một sim cụ thể — dùng làm bậc độ lớn, không phải hằng số phổ quát.)*

**Một trăm nghìn entity** — nhiều hơn bất kỳ trận đấu thực tế nào — tiêu hết **0,71%** ngân sách một tick. Nhân đôi lên 128 Hz thì thành 1,4%: vẫn còn 98,6% chưa dùng tới.

Cột cuối quan trọng ngang ba cột kia: **0 allocation mỗi op ở cả bốn mức**. Không cấp phát = không tạo rác = không gọi GC vào giữa một tick. Bài 37 nói tại sao dòng đó đáng giá.

Vậy 99% còn lại đi đâu? Một tick 16,67 ms ở 60 Hz, 1.000 entity, một trận cỡ nhỏ:

```
|<------------------ một tick = 16,67 ms ------------------->|
[i][s][ snapshot ][ send ][         ngủ / chờ deadline       ]

 [i] đọc input từ socket   ~0,1 ms    ^   đắt dần nhẹ: x số player
 [s] sim.Step (vật lý)      0,001 ms  --- PHẲNG: không nhân số player  (đã đo)
     dựng snapshot         ~1,2 ms    ^^^ ĐẮT DẦN: x số player x số entity
     gửi packet            ~0,8 ms    ^^^ ĐẮT DẦN: x số player (syscall sendto)
     ngủ / chờ deadline   ~14,5 ms    87 % — chỗ duy nhất còn dư địa
```

*(Chỉ dòng `sim.Step` là số đo thật — 1,18 µs cho 1.000 entity. Bốn dòng còn lại là ước
lượng bậc độ lớn cho một trận nhỏ; chúng phụ thuộc mạnh vào số player và định dạng gói tin.)*

Hai mũi tên `^^^` là toàn bộ nội dung của chương 6 và bài 37. Thứ ăn ngân sách một tick không phải vật lý mà là:

1. **Serialization** — dựng snapshot riêng cho từng người chơi, nhân **hai** thừa số: số player × số entity mỗi người thấy. Hàm chi phí xấu nhất trong cả vòng lặp.
2. **Syscall gửi packet** — mỗi người chơi một lần `sendto`. Trận 100 người ở 20 Hz là 2.000 syscall/giây chỉ cho một trận.
3. **GC** — rác sinh ra từ bước 1 phải được dọn, và bộ dọn có quyền dừng thế giới đúng giữa một tick.

> Vật lý gần như miễn phí. **Cái đắt là kể cho người khác nghe chuyện vừa xảy ra.**

Đó là lý do chương 6 và bài 37 đứng ở chỗ chúng đang đứng: đó là chỗ đau thật, còn tối ưu vòng lặp vật lý là tối ưu 0,7%.

### 3.6 Đo bằng p99, đừng đo bằng trung bình

Còn một cách sai nữa, nguy hiểm hơn cả tối ưu nhầm chỗ, vì nó khiến bạn không biết mình đang hỏng.

Dashboard báo: **thời gian xử lý một tick trung bình 5 ms**. Ngân sách 16,67 ms, dư 70%, xanh hết. Bây giờ nhìn p99: **20 ms**.

| Chỉ số | Giá trị | Nghĩa là |
|---|---|---|
| trung bình | 5 ms | 30% ngân sách — "khoẻ" |
| p99 | **20 ms** | **vượt hạn 16,67 ms** |
| tần suất vượt hạn | 1 trên 100 tick | ở 60 Hz = **36 lần mỗi phút** |

Người chơi thấy **36 lần khựng mỗi phút** — hơn một lần mỗi hai giây, không ai chịu nổi trong một trận đấu. Và giá trị trung bình sẽ báo cáo hệ thống này hoàn toàn khoẻ mạnh, tháng này qua tháng khác, cho tới khi có người quay video gửi lên diễn đàn.

Lý do nằm ở hình dạng phân phối: trung bình bị kéo xuống bởi hàng nghìn tick nhàn rỗi, còn thứ giết trải nghiệm là cái đuôi. Trong hệ real-time, **cái đuôi chính là sản phẩm** — vì "chậm bằng hỏng" (bài 1), và một tick trễ hạn là một lần hỏng, bất kể 99 tick kia đúng giờ.

> **Alert đặt ở p99, không đặt ở trung bình. Nếu chỉ được vẽ một đường, vẽ p99.**

Bài 7 đã dùng đúng nguyên tắc này khi so `spin=2ms` với `spin=0`: trung bình gần như nhau, khác biệt 63 lần chỉ hiện ra ở p99 (17 µs so với 1,08 ms). Chỉ nhìn trung bình thì tối ưu đó vô hình.

---

## 4. Quy trình chọn tick rate

Một quy trình làm theo được, thay cho chọn số theo cảm giác.

**1 — bắt đầu ở sim 60 / snapshot 20.** Không phải con số thiêng, mà là chỗ đường cong lợi ích đã gần phẳng; bài 5 cho thấy sai số tích phân ở 60 Hz đủ nhỏ cho mọi thứ trừ mô phỏng chính xác.

**2 — đo trước khi vặn.** Ba thứ, mỗi thứ ở p99: thời gian một tick, KB/s chiều ra mỗi player, jitter thật của người chơi thật.

**3 — cắt theo thứ tự mục 3.4, không theo thứ tự dễ nghĩ ra:** buffer nội suy → vị trí server → snapshot rate → sim tick.

**4 — chỉ tăng sim tick khi có bằng chứng p99.** Hợp lệ: p99 một tick còn dư nhiều, **và** có hiện tượng gameplay đo được mà 60 Hz không diễn tả nổi (đạn nhanh xuyên qua tường mỏng là ví dụ thật). Không hợp lệ: đối thủ quảng cáo 128.

**5 — nhớ dòng lãi nhất.** Client prediction đưa độ trễ **cảm nhận của chính người bấm** về gần **0 ms** — nhiều hơn cả bốn cách ở mục 3.4 cộng lại. Giá của nó không phải CPU hay băng thông mà là **độ phức tạp**: reconciliation, lưu lịch sử input, xử lý lúc server không đồng ý. Đó là lý do nó chiếm trọn chương 5.

Thêm prediction vào bảng mục 3.4 thì nó chiếm hạng nhất một cách áp đảo: **~180 ms cho người bấm**, trả bằng độ phức tạp thay vì trả bằng CPU hay băng thông. Bốn dòng còn lại giữ nguyên thứ tự C > D > B > A.

---

## 5. Tính tay

**Bài 1.** Một MOBA: 10 người chơi, mỗi người thấy 60 entity (tướng, lính, trụ, đạn), 12 B/entity.
- Ở snapshot 20 Hz, mỗi player bao nhiêu KB/s? Một trận bao nhiêu MB/s chiều ra?
- Một node chạy 40 trận cùng lúc thì cần uplink bao nhiêu Mbps? Có vừa một cổng 1 Gbps không?
- Nếu đội đề xuất lên 30 Hz để "mượt hơn": cắt được bao nhiêu ms, và số trận mỗi node phải giảm còn bao nhiêu để giữ nguyên uplink?

**Bài 2.** Vẫn ngân sách 182 ms ở mục 3.3, nhưng người chơi ở nước ngoài: **RTT 180 ms** thay vì 40.
- Tổng ngân sách mới là bao nhiêu?
- Buffer nội suy giờ chiếm bao nhiêu phần trăm? Nâng sim lên 128 Hz giờ đáng bao nhiêu phần trăm?
- Với người chơi này, thứ tự bốn cách ở mục 3.4 có đổi không? Cái nào leo hạng, và vì sao?

**Bài 3.** Dashboard báo tick p50 = 4 ms, p99 = 14 ms, p99,9 = 28 ms. Server 60 Hz, ngân sách 16,67 ms.
- Bao nhiêu tick mỗi phút vượt hạn theo mốc p99,9?
- p99 = 14 ms nghĩa là hệ thống này an toàn hay đang sát mép? Còn bao nhiêu phần trăm biên?
- Nếu bạn nâng lên 128 Hz thì ngân sách thành 7,81 ms. Với chính bộ số trên, chuyện gì xảy ra — và nó có nằm trong "cái giá CPU ×2" mà mục 3.4 nói tới không?

---

## 6. Chuyển giao

**Bạn làm một game đua xe 8 người, chơi toàn cầu, không chia khu vực.** Xe chạy 200 km/h, tức khoảng **5,6 cm mỗi mili giây**. Va chạm giữa hai xe là cơ chế gameplay chính — người chơi húc nhau để giành đường. Người chơi trải khắp thế giới, RTT trong một trận dao động từ 20 ms tới 250 ms.

1. Ở RTT 250 ms, buffer nội suy 100 ms và snapshot 20 Hz, một chiếc xe đối thủ hiển thị trên màn hình bạn lệch bao nhiêu **mét** so với vị trí thật của nó trên server?
2. Con số đó có làm cơ chế "húc nhau giành đường" chơi được không? Nếu không, chặng nào trong bảy chặng ở mục 3.3 phải bị tấn công trước?
3. Xe chạy theo quỹ đạo dễ đoán hơn người đi bộ nhiều. Điều đó cho bạn quyền làm gì mà một game FPS không được làm — và nó động vào chặng nào của ngân sách?
4. Đội đề xuất nâng sim tick lên 128 Hz "vì va chạm ở tốc độ cao cần chính xác". Bạn đã có bảng ở mục 3.4 nói rằng nó chỉ đáng 4,4 ms. Nhưng lập luận của họ **không nói về độ trễ**. Nó có đúng không, và bạn kiểm chứng bằng phép tính nào?
5. Với 8 người trải toàn cầu, bạn đặt server ở một chỗ (ai đó chịu 250 ms) hay dùng nhiều edge? Câu hỏi phụ khó hơn: nếu mỗi người nối tới edge gần mình, thì **simulation chạy ở đâu**, và điều đó có mâu thuẫn với "một trận một chủ sở hữu" của bài 1 không?
6. **Câu khó nhất:** đội quyết định cho **mỗi người chơi một buffer nội suy khác nhau**, tuỳ chất lượng mạng của họ — người mạng tốt 50 ms, người mạng tệ 150 ms. Nó cắt độ trễ cho phần lớn người chơi mà không hy sinh sự mượt của người mạng tệ. Nhưng bây giờ **hai người chơi đang nhìn hai thời điểm khác nhau của cùng một thế giới**. Cụ thể: cơ chế nào của game sẽ hỏng trước, hỏng theo kiểu gì, và có tồn tại một cách phân xử va chạm nào công bằng cho cả hai người không — hay công bằng là thứ **không thể có** khi hai người nhìn hai thời điểm khác nhau?

Câu 6 là câu hỏi mà chương 5 sẽ dành nhiều bài để trả lời, và câu trả lời của nó không phải "có" hay "không".

---

## 7. Tóm tắt

- Ba nhịp **độc lập**, tiêu **ba nguồn lực khác nhau**: sim tick tiêu CPU và không nhân với số player; snapshot rate tiêu băng thông và nhân với số player; render FPS tiêu GPU của client.
- Snapshot luôn thấp hơn sim vì hai hàm chi phí khác bậc. Nâng 20 → 60 Hz với 50 entity, 100 player là **1 MB/s → 3 MB/s (24 Mbps)** đổi lấy 16,7 ms. Gần như không game nào trả.
- Ngân sách từ lúc bấm tới lúc người khác thấy: **182 ms** = 20 mạng đi + 8,3 chờ tick + <1 xử lý + 25 chờ snapshot + 20 mạng về + **100 buffer nội suy** + 8 render.
- Xếp hạng bốn cách cắt: **buffer 100→50 = −50 ms, miễn phí** > RTT 40→20 = −20 ms, tốn tiền và có trần là tốc độ ánh sáng > snapshot 20→30 = −8,3 ms, +50% băng thông > **sim 60→128 = −4,4 ms, CPU ×2**.
- **4,4 ms trên 182 ms là 2,4%** — món đắt nhất mua được ít nhất và bị cãi nhau nhiều nhất; món rẻ nhất mua được **gấp 11,4 lần**. **Tối ưu chỗ ăn nhiều nhất, không phải chỗ dễ đo nhất** — tick rate hút hết sự chú ý vì nó là số nguyên in được lên poster.
- Vật lý gần như miễn phí: `sim.Step` với 100.000 entity tốn **119 µs = 0,71%** một tick, **0 allocs/op**. Thứ ăn ngân sách là **serialization, syscall gửi packet và GC** — chương 6 và bài 37.
- **Luôn nhìn p99.** Tick trung bình 5 ms với p99 20 ms là **36 lần khựng mỗi phút** ở 60 Hz, và trung bình sẽ báo cáo hệ thống đó hoàn toàn khoẻ mạnh.
- Quy trình: bắt đầu **sim 60 / snapshot 20**, đo, cắt theo thứ tự lợi ích, chỉ tăng sim tick khi có bằng chứng p99. Dòng lãi nhất cả bảng là **client prediction** — đưa độ trễ cảm nhận của chính người bấm về gần 0, trả bằng **độ phức tạp**, và đó là cả chương 5.

→ **Chương 3 — Determinism.** Hai chương vừa rồi dựng được một nhịp đập đều và đo được. Bài 9 hỏi câu đắt nhất: cùng một chuỗi input, chạy lại hai lần, có ra cùng một kết quả không — và vì sao bốn thứ quan trọng nhất của game networking đều sụp nếu câu trả lời là không.
