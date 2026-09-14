# Bài 39 — Load test bằng bot client headless

## 1. Mục tiêu

Sau bài này bạn có thể:

- Nói rõ **vì sao mọi trần ở bài 28 và 32 là cận trên của một tài nguyên**, không phải trần của node — và bot biến chúng thành số đo bằng cách nào.
- Chỉ ra bằng số **bot đứng im làm phép đo sai bao nhiêu lần**, và vì sao delta (bài 25) cộng AOI (bài 26) khiến nó sai theo chiều đẹp nhất.
- Tính **giá CPU của một bot** và mốc mà bot chạy cùng máy bắt đầu làm hỏng chính thứ nó đang đo.
- Liệt kê **bốn số bot phải tự đo phía nó**, và giải thích trường hợp server xanh mà client giật.
- Chạy **quy trình ramp** dừng ở ngưỡng gãy đầu tiên, và đọc bảng triệu chứng → thủ phạm.
- Mang về đúng **hai con số nuôi bảng chi phí CCU** (bài 27) và quyết định số node (bài 29).

---

## 2. Triệu chứng

Load test chạy suốt đêm, biểu đồ đẹp: node chịu **500 người**, tick p99 dưới 2 ms, không một lần drop. Bạn ký vào con số 500 và mua node theo nó.

Bản phát hành thật. **Node bắt đầu trượt tick ở 180 người.** Không ai đổi code. Chênh **2,78 lần**.

Ba lý do, mỗi lý do một con số đo được:

```
(1) Bot dung im.  Delta muc field: goi snapshot 44 B thay vi 423,99 B  -> 9,64 lan
(2) Bot cung may. 4.000 bot an 1,806 core, gap 2,54 lan chinh tien trinh
                  dang do (0,711 core) -- va 0 byte nao cham NIC 1 Gbps
(3) Bot qua deu.  10.000 ket noi/giay trong 0,4 s roi 0 mai mai,
                  production o cung CCU la 8,33 nguoi/giay lien tuc  -> 1.200 lan
```

Ba sai số này **không cộng lại được**. (1) kéo con số lên, (3) kéo cả hai chiều tuỳ giai đoạn, (2) kéo lên ở phần mạng và kéo xuống ở phần CPU. Không có hệ số hiệu chỉnh nào cứu được một phép đo có ba nguồn sai lệch ngược dấu. Cách duy nhất là bỏ chúng đi, từng cái một.

*(Mọi số đo trong bài chạy trên máy dantt — Apple M-series 10 core, Go 1.26.5, bot và server là hai tiến trình UDP riêng. Bậc độ lớn thì chắc; chữ số thứ hai thay đổi theo máy.)*

---

## ⏸ Dừng lại — đoán trước #1

Chọn một đáp án trước khi đọc tiếp.

**Trong ba lý do trên, cái nào MỘT MÌNH đủ làm trần băng thông đo được sai một bậc độ lớn?**

```
(a) Bot chạy cùng máy — loopback nhanh hơn NIC nhiều lần
(b) Bot đứng im — delta không có gì để gửi
(c) Bot khởi động đồng loạt — đỉnh kết nối làm nghẽn accept queue
(d) Không cái nào; cả ba phải cộng lại mới ra một bậc
```

---

## 3. Lý thuyết

### 3.1 Trần trong bảng là cận trên của MỘT tài nguyên

Bài 28 cho ba trần cho một node chạy room: CPU 275.573 room, băng thông 3.792 room, goroutine 952 room ở `P = 10`; trần thật là đường thấp nhất, và giao điểm băng thông × goroutine nằm ở **P ≈ 45**. Bài 32 cho bốn trần cho một node giữ zone: NIC 1.907 người, CPU dựng snapshot 3.154, CPU simulation 1.765.537, RAM 8.196.721 — **CPU simulation cách trần thấp nhất 926 lần**.

Cả bảy con số đó đúng, và cả bảy tính theo cùng một cách: **lấy một tài nguyên, giả định phần còn lại bằng không.** Trần CPU simulation 1.765.537 người là câu "nếu node này chỉ chạy `sim.Step` và không làm gì khác".

Những thứ không có trong bất kỳ ô nào của hai bảng ấy:

| Không có trong bảng | Vì sao bảng không đo được |
|---|---|
| syscall mỗi gói (`sendto`/`writev`) | Bench đo hàm encode, không đo lúc gói rời tiến trình |
| khung WebSocket/TLS (bài 13) | Nằm ở tầng dưới hàm được bench |
| allocator và GC (bài 37) | Bench `sim.Step` là 0 alloc; đường mạng thì không |
| scheduler dưới tải **hỗn hợp** | Bài 28 đo goroutine toàn ngủ, không đo goroutine vừa ngủ vừa syscall |
| socket buffer kernel, backpressure (bài 38) | Không phải chu kỳ CPU, cũng không phải byte — là hàng đợi |
| file descriptor, `ulimit` | Một dòng config, chạm trước cả ba trần kia |

Nên phát biểu đúng là: **trần thật = min(bảng) chia cho một hệ số bạn không biết.** Bài này là cách đo hệ số đó.

> Bảng của bài 28 và 32 dùng để biết **đi tìm cái gì**. Bot dùng để biết **số**. Bỏ bảng thì bạn đo mù; bỏ bot thì bạn mua node theo một phép nhân.

### 3.2 Bot phải dùng lại client code thật

Điều kiện đầu tiên, và nó không thương lượng được: **bot nói đúng protocol mà client thật nói, chạy đúng logic mà client thật chạy.** Cụ thể là dùng chung, không phải viết lại cho giống:

- cùng codec bit-packed của bài 24;
- cùng reliability layer của bài 14 — sequence, ack bitfield, phân loại reliable/unreliable;
- cùng prediction và reconciliation của bài 18–19, kể cả ngưỡng bỏ qua 5 mm;
- cùng vòng đời kết nối của bài 16 — handshake, keepalive, reconnect.

Cách tổ chức để việc này rẻ: tách gói `client/core` (state, codec, prediction, mạng) khỏi `client/render`. Bot là một `main()` khác gọi thẳng `core`, vòng lặp chạy theo đồng hồ chứ không theo frame vẽ.

```go
// bot/main.go — khac client that dung mot dieu: khong co render
c := core.New(cfg)                      // CUNG package voi client that
c.Connect(addr)
for range time.Tick(16667 * time.Microsecond) {
    c.Update(brain.NextInput(c.State())) // brain thay cho ban phim
}
```

Phản ví dụ hay gặp nhất là bot script gửi JSON trong khi client thật gửi bit-packed. Bài 24 đo trên cùng 50 entity: **112,7 B/entity với JSON, 13,68 B với bit-packed — 8,24 lần** sai *theo chiều bi quan*, nên bạn mua thừa node và không bao giờ biết. Tệ hơn: bot đó không chạy reconciliation, nên hành vi phía client — thứ quyết định server phải xử lý bao nhiêu input lệch — vắng khỏi phép đo.

> Bot nói protocol khác client thật thì bạn đang load test một hệ thống không tồn tại. Con số bạn thu được là số của hệ thống đó, không phải của hệ thống bạn sắp phát hành.

---

## ⏸ Dừng lại — đoán trước #2

**Một trận 50 entity trong tầm nhìn, snapshot 20 Hz, delta mức field (bài 25). Bot đứng im tại điểm spawn. Gói snapshot gửi cho một bot nặng bao nhiêu?**

```
(a) Khoảng 380 B — vẫn phải gửi vị trí của 50 entity
(b) Khoảng 190 B — chỉ nửa số entity đổi
(c) Chỉ header — mask của mọi entity đều bằng 0, không entity nào vào gói
(d) 0 byte — server không gửi gì cả
```

---

### 3.3 Bẫy lớn nhất: bot đứng im

Đáp án hộp #1 là **(b)**; đáp án hộp #2 là **(c)**. Hai đáp án là cùng một hiện tượng.

Delta mức field của bài 25 gửi một mục cho mỗi entity **có ít nhất một field đổi**: id 2 B, mask 1 B, rồi các field bật bit. Entity không đổi gì thì mask bằng 0 và nó **biến mất khỏi gói**. Bot đứng im, xung quanh cũng toàn bot đứng im, thì cả 50 entity đều có mask 0.

Đo thật, `k = 50` entity trong tầm, header 44 B (28 B IPv4/UDP của bài 15 + 16 B header ứng dụng của bài 27):

| Hành vi bot | Payload/snapshot | Gói | Egress mỗi player | Trần NIC 1 Gbps |
|---|---|---|---|---|
| Đứng im | **0,00 B** | 44 B | **880 B/s** | 142.045 người |
| Di chuyển (x, y luôn đổi; yaw 30 %, vx/vy 15 %) | **379,99 B** = 7,60 B/entity | 423,99 B | **8.479,8 B/s** | **14.741 người** |
| | | **9,64×** | **9,64×** | **9,64×** |

7,60 B/entity đổi khớp với 7,37 B mà bài 25 đo trên phân bố field khác — cùng bậc, chênh 3,1 %.

Ba hệ quả, không cái nào hiển nhiên:

**Một — điểm hoà vốn của bài 25 không cứu bạn.** Bài 25 chốt delta mức field hoà vốn ở **135,7 % entity đổi**, tức nó không bao giờ thua full snapshot. Đúng, và vô dụng ở đây: bot đứng im ngồi ở **0 %** entity đổi, người thật ngồi ở gần 100 %. Cả hai đều nằm trong vùng delta thắng — nhưng thắng **9,64 lần khác nhau**.

**Hai — AOI cũng rẻ đi giả tạo.** Bài 26 đổi `O(N²)` thành `O(N·k)`, và cái giá là entity **vào/ra** tầm nhìn: entity mới vào tầm chưa có baseline nên phải gửi **full state**. Bot đứng im thì tập entity trong tầm là hằng số suốt bài test — **không một sự kiện enter nào**, không một keyframe nào, mọi cache trúng 100 %.

**Ba — CPU dựng snapshot cũng rẻ đi.** Cùng chương trình, cùng `k = 50`: đứng im **186–191 ns** một lần dựng, di chuyển **1.580–1.859 ns**. *(Nhánh di chuyển bao gồm cả vòng cập nhật world nên con số này là cận trên; điều chắc chắn là gần một bậc độ lớn, không phải hệ số 1,2.)*

Quy ra tiền theo bài 27, ở 40.000 CCU, 0,09 USD/GB:

```
bot dung im  :  91.238 GB/thang ->   8.211 USD
nguoi that   : 879.186 GB/thang ->  79.127 USD
chenh lech   :                      70.915 USD/thang
```

Bạn không sai 9,64 lần về một con số kỹ thuật. Bạn sai 70.915 USD mỗi tháng về một dòng ngân sách.

**Hành vi tối thiểu chấp nhận được** cho bot: đi theo random-walk ở đúng tốc độ nhân vật thật, xoay hướng nhìn, bắn/dùng skill theo tần suất lấy từ telemetry, và **vào/ra vùng đông người** để sinh sự kiện AOI. Tốt hơn nữa: replay input log của người thật đã ghi lại — đầu vào đúng phân bố, không phải đúng trung bình.

### 3.4 Bot phải chạy ở máy khác

Bot không miễn phí. Đo giá một bot: mỗi bot một socket UDP, gửi input 60 Hz, nhận và giải mã snapshot 412 B ở 20 Hz, chạy prediction step.

| Số bot | CPU tiến trình bot | µs/bot/giây | Nhịp input thật |
|---|---|---|---|
| 100 | 0,077 core | 765,3 | 60,0 Hz |
| 500 | 0,370 core | 740,1 | 59,9 Hz |
| 1.000 | 0,701 core | 700,9 | 59,8 Hz |
| 2.000 | 1,139 core | 569,7 | 59,6 Hz |
| 4.000 | **1,806 core** | 451,6 | 59,6 Hz |

Quy tắc rút ra: **~0,7 ms CPU mỗi bot mỗi giây, tức 1 core cho mỗi ~1.400 bot** ở mức tải nhẹ, và rẻ dần khi số bot tăng vì chi phí đánh thức được khấu hao.

Giờ đặt bot cạnh server trên cùng máy 10 core và đo **lateness của vòng tick 60 Hz phía server** — chính đại lượng của bài 7:

| Cấu hình | CPU server | tick p50 | tick p99 | p99 / ngân sách 16,67 ms |
|---|---|---|---|---|
| 0 bot (đối chứng) | 0,004 core | 0,84–1,02 ms | 1,96–3,59 ms | 12–22 % |
| 2.000 bot cùng máy | 0,457 core | 0,02–0,16 ms | 1,04 ms ×3, **8,53 ms** ×1 | 6 % … **51 %** |
| 4.000 bot cùng máy | 0,711–0,731 core | 0,15–0,34 ms | **11,10 / 11,85 / 13,17 ms** | **66,6 – 79,0 %** |

Bảng này nói ba chuyện khác nhau.

**Server chỉ dùng 0,73 core trên 10 mà tick p99 đã ăn 79 % ngân sách.** Tiến trình bot ăn **1,806 core — gấp 2,54 lần chính thứ đang được đo**; tổng hai bên là **25,4 % máy**. Nếu bạn autoscale hay kết luận theo CPU của server, bạn thấy một node rảnh rỗi đang trượt tick.

**p50 lại ĐẸP hơn khi có bot.** 0,84 ms xuống 0,27 ms. Máy bận giữ timer sắc hơn máy rảnh — đúng hiện tượng bài 7 và bài 28 đã gặp. Ở mốc 4.000 bot, `13,17 / 0,266 = ` **49,5 lần** chênh giữa p99 và p50. Nhìn trung bình thì phép đo này hoàn hảo.

**Ở 2.000 bot, ba lần chạy cho 1,04 ms và một lần cho 8,53 ms.** Đó không phải nhiễu cần làm mượt — đó là ranh giới. Mốc nào cho kết quả không lặp lại được thì ghi cả hai, đừng lấy trung bình.

Và một thứ loopback lấy mất không báo: **gói đi 127.0.0.1 không chạm NIC.** Toàn bộ trần băng thông của bài 28 và 32 — 3.792 room, 1.907 người — vắng khỏi phép đo; bạn chạy 10.000 bot loopback mà không bao giờ biết card mạng ở đâu.

Ba điều kiện của một bot host dùng được:

1. **Máy riêng, đi qua NIC thật** — cùng vùng, cùng loại mạng với người chơi thì càng tốt.
2. **Cấp ≥ 1 core cho mỗi 1.000 bot**, và nếu cần nhiều hơn thì thêm bot host, đừng thêm bot vào tiến trình.
3. **Bot host tự chứng minh nó giữ được nhịp.** In ra tỉ lệ `input gửi thật / mong đợi` mỗi mốc; ở bảng trên là 99,3–100,0 %. Xuống dưới 99 % thì con số bạn ghi là trần của **bot host**, không phải của server — và nó luôn trông giống hệt trần của server.

### 3.5 Bốn số bot phải tự đo

Server báo khoẻ trong khi người chơi báo giật là ca thường gặp nhất, và bảng 3.4 vừa cho thấy vì sao. Metric server-side (bài 36) trả lời "server có kịp không"; nó không trả lời "người chơi có nhận đúng nhịp không". Bot phải tự đo phía nó:

| Số | Cách lấy | Mốc đạt | Nó bắt được cái gì mà server không thấy |
|---|---|---|---|
| **RTT p50/p99** | timestamp trong input, đối chiếu `lastProcessedSeq` về | p99 < 2× p50 | Hàng đợi phình ở gateway hoặc socket buffer (bài 38) |
| **Tần suất nhận snapshot** | đếm gói/giây, so với 20 Hz danh định | ≥ 19,5 Hz | Server bỏ nhịp gửi mà tick vẫn đúng giờ |
| **Reconcile vượt ngưỡng/giây** | đếm lần sai lệch vượt 5 mm (bài 19) | ổn định theo tải | Input bị xử lý muộn: state đúng, thời điểm sai |
| **Loss quan sát được** | lỗ hổng trong sequence (bài 14) | khớp loss cấu hình | Gói bị kernel/NIC đánh rơi, không có trong log nào |

Số thứ ba đáng dừng lại. Ngưỡng **X = 5 mm** của bài 19 phân tách rất sạch nhiễu lượng tử hoá khỏi sai lệch thật, và chính vì thế **số lần vượt ngưỡng là một cảm biến**: server xử lý input muộn thì prediction của client chạy trên một thế giới lệch pha, và con số này tăng **trước khi** tick p99 phía server kịp xấu đi. Ở RTT 200 ms mỗi lần reconcile là 12 bước replay, `12 × 1,18 µs = ` **14,16 µs** — rẻ đến mức client không hề chậm, nên triệu chứng không bao giờ lộ ra ở hiệu năng client.

> Một mốc tải chỉ được ghi là **ĐẠT** khi cả bốn số phía bot lẫn tick p99 phía server đều đạt. Server một mình không có quyền tuyên bố mốc đó.

### 3.6 Quy trình ramp và bảng triệu chứng → thủ phạm

Tăng tải theo bậc thang, không theo dốc: dốc liên tục cho bạn một đường cong đẹp mà không nói bậc nào còn ổn định.

```
bac : 50 -> 100 -> 200 -> 400 -> 800 -> ...  (gap doi)
giu : >= 3 phut moi bac  -- du cho >= 2 chu ky GC va vai vong doi baseline (bai 25)
ghi : tick p50/p99, egress B/s, so fd, RSS, so goroutine, va bon so phia bot
dung: o bac dau tien co MOT nguong gay -- va ghi lai CAI GI gay truoc
```

Hai chỗ dễ sai. **Giữ bậc quá ngắn**: ở 30 giây thì GC chưa chạy đủ vòng, baseline delta chưa quay vòng hết, socket buffer chưa kịp đầy — bạn có con số của một hệ thống vừa khởi động. Và **dừng ở ngưỡng gãy đầu tiên, đừng ép qua**: cái bạn cần không phải "node chết ở đâu" mà "cái gì hết trước", vì đó là thứ bạn sẽ đi mua hoặc đi sửa. Bài 28 nói ý này ở dạng lý thuyết — trần thật là đường thấp nhất; ramp là cách tìm ra đường nào thấp nhất trên máy thật.

| Triệu chứng ở bậc gãy | Thủ phạm | Kiểm bằng | Đối chiếu |
|---|---|---|---|
| tick p99 vọt, p50 vẫn đẹp, CPU server thấp | scheduler / quá nhiều goroutine | đếm goroutine; bảng lateness bài 28 | bài 28, bài 38 |
| tick p99 vọt, CPU server sát trần một core | simulation hoặc dựng snapshot | pprof CPU | bài 36, bài 37 |
| tick p99 răng cưa đều đặn, RSS tăng rồi tụt | GC | `GODEBUG=gctrace=1` | bài 37 |
| egress phẳng ở một mức trần, bot báo loss tăng | NIC hoặc shaper | `ifstat` trên NIC, không phải trong app | bài 27, bài 32 |
| kết nối mới bị từ chối, kết nối cũ vẫn ổn | file descriptor | `ulimit -n`, `/proc/<pid>/fd` | bài 28 |
| RSS tăng đơn điệu không tụt | rò goroutine hoặc buffer giữ lâu | heap profile | bài 37, bài 38 |
| server mọi số đều đẹp, bot báo snapshot < 19,5 Hz | backpressure / outbox drop | đếm drop ở outbox | bài 38 |

Bốn dòng đầu trông giống nhau trên dashboard — đều là "tick p99 xấu". Bốn cột phải là thứ tách chúng ra.

### 3.7 Mạng xấu, và cái bẫy bot quá đều

Bot trên LAN datacenter thấy RTT 0,3 ms và loss 0 %. Người chơi thì không. Phase 1 của roadmap thêm độ trễ giả lập để *cảm* thấy 182 ms; ở đây phải thêm nó **ở quy mô**, trong chính bot, để nó ảnh hưởng tới tải server chứ không chỉ tới cảm giác. Ba cấu hình tối thiểu, áp cho từng bot chứ không cho cả đàn:

| Cấu hình | Bước replay mỗi reconcile | Chi phí replay | Cái nó ép server phải làm |
|---|---|---|---|
| RTT 40 ms, loss 0 | 3 | 3,54 µs | đường cơ sở |
| RTT 100 ms, loss 0 | 6 | 7,08 µs | input buffer sâu hơn, cửa sổ lag comp rộng hơn (bài 21) |
| RTT 200 ms, loss 5 % | 12 | 14,16 µs | ack mất → baseline cũ đi → delta to ra (bài 25) |

Loss 5 % mỗi chiều nghĩa là một vòng đi-về thành công với xác suất `0,95² = ` **90,25 %**, tức **9,75 %** hỏng. Ở 60 Hz input, **3 input mất mỗi giây**; ở 20 Hz snapshot, **1 snapshot mất mỗi giây** — khoảng cách giữa hai snapshot nhận được nhảy từ 50 ms lên **100 ms**, gấp đôi, và đó là con số buffer nội suy của bài 20 phải nuốt.

**Rải bot, đừng thả một lượt.** Đây là cái bẫy còn lại, và nó làm hỏng phép đo theo hai chiều cùng lúc.

Chiều thứ nhất — **thundering herd giả**. 4.000 bot connect trong 0,4 giây là **10.000 kết nối/giây**. Production ở 4.000 CCU với phiên trung bình 8 phút có tỉ lệ vào là `4.000 / 480 = ` **8,33 người/giây** — chênh **1.200 lần**. Bạn sẽ thấy accept queue tràn và kết luận "node chỉ chịu được 4.000", trong khi cái gãy là một sự kiện không tồn tại. Cách rải: khởi động theo Poisson với `λ = CCU / độ_dài_phiên`, và cho bot **tự rời và vào lại** theo đúng phân bố đó — churn là tải thật, và nó sinh keyframe mà mục 3.3 vừa nói bot đứng im không bao giờ sinh.

Chiều thứ hai tinh vi hơn — **đồng pha**. Bot khởi động cùng lúc thì `time.Tick` của chúng lệch nhau vài trăm micro giây. 4.000 bot × 60 Hz là **240 gói/ms** nếu rải đều, nhưng nếu đồng pha thì **4.000 gói dồn vào 1 ms** rồi 15,67 ms im lặng: đỉnh gấp **16,67 lần** trung bình, đúng bằng chu kỳ tick `1000 / 60 = 16,67 ms`. Server bị đo bằng một hình dạng lưu lượng không có thật.

<svg viewBox="0 0 700 240" role="img" aria-labelledby="gs39-a-t gs39-a-d" style="width:100%;height:auto">
<title id="gs39-a-t">Bot đồng pha so với bot rải pha trong một chu kỳ tick</title>
<desc id="gs39-a-d">Trên một chu kỳ 16,67 mili giây, bốn nghìn bot đồng pha dồn bốn nghìn gói vào đúng một mili giây rồi im lặng phần còn lại, trong khi bốn nghìn bot rải pha ngẫu nhiên cho một mặt phẳng hai trăm bốn mươi gói mỗi mili giây suốt chu kỳ. Đỉnh chênh nhau mười sáu phẩy sáu bảy lần.</desc>
<text x="16" y="18" font-size="11" font-weight="bold" fill="currentColor">4.000 bot đồng pha — đỉnh 4.000 gói/ms</text>
<line x1="60" y1="100" x2="660" y2="100" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5"/>
<line x1="60" y1="30" x2="60" y2="100" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5"/>
<rect x="61" y="32" width="34" height="68" fill="#ef4444" fill-opacity="0.55"/>
<text x="112" y="52" font-size="10" fill="currentColor">4.000 gói trong 1 ms</text>
<text x="112" y="68" font-size="10" fill="currentColor" opacity="0.75">rồi 15,67 ms không có gì</text>
<text x="52" y="34" text-anchor="end" font-size="9" fill="currentColor" opacity="0.7">4.000</text>
<text x="52" y="104" text-anchor="end" font-size="9" fill="currentColor" opacity="0.7">0</text>
<text x="16" y="150" font-size="11" font-weight="bold" fill="currentColor">4.000 bot rải pha — phẳng 240 gói/ms</text>
<line x1="60" y1="215" x2="660" y2="215" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5"/>
<line x1="60" y1="160" x2="60" y2="215" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5"/>
<rect x="61" y="211" width="599" height="4" fill="#84cc16" fill-opacity="0.75"/>
<text x="52" y="164" text-anchor="end" font-size="9" fill="currentColor" opacity="0.7">4.000</text>
<text x="52" y="219" text-anchor="end" font-size="9" fill="currentColor" opacity="0.7">0</text>
<text x="120" y="205" font-size="10" fill="currentColor">240 gói/ms, đều suốt chu kỳ — cùng tổng 240.000 gói/giây</text>
<line x1="660" y1="24" x2="660" y2="221" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="4 3"/>
<text x="656" y="234" text-anchor="end" font-size="9" fill="currentColor" opacity="0.8">16,67 ms — một chu kỳ tick 60 Hz</text>
<text x="64" y="234" font-size="9" fill="currentColor" opacity="0.8">0 ms</text>
<text x="330" y="130" text-anchor="middle" font-size="10" font-style="italic" fill="currentColor">cùng một tải trung bình, đỉnh chênh 16,67 lần</text>
</svg>

Chữa bằng một dòng: cho mỗi bot ngủ một khoảng ngẫu nhiên trong `[0; 16,67 ms)` trước khi vào vòng lặp.

```go
time.Sleep(time.Duration(rand.Int63n(int64(16667 * time.Microsecond))))
for range time.Tick(16667 * time.Microsecond) { ... }
```

---

## 4. Hai con số phải mang về

Thứ đi ra khỏi bài test không phải một biểu đồ, mà đúng **hai con số**: **người/node** và **trận/node** — mọi quyết định hạ tầng của chương 7 và bài 40 đứng trên chúng. Giả sử phép đo sạch cho **180 người/node**, trận 10 người → **18 trận/node**, đặt cạnh 40.000 CCU của bài 29:

| Nguồn con số | Người/node | Node cho 40.000 CCU | Sai lệch |
|---|---|---|---|
| Bảng bài 28/32 (lý thuyết) | 1.907 | 21 | cận trên, không mua theo |
| Bot đứng im, cùng máy | 500 | 80 | **thiếu 143 node = 64,1 %** |
| Bot động, máy riêng, có mạng xấu | **180** | **223** | con số để ký |

Con số 80 không làm node chậm 64,1 %. Nó làm **hệ thống sập ở đợt tải đầu tiên**, vì mỗi node nhận 500 người trong khi nó trượt tick từ 180 — và bài 29 đã tính: một node game chết là **20 trận chết cùng lúc**, không phải một retry. Hai con số này chảy tiếp vào ba chỗ:

- **Bài 27 — hoá đơn egress.** `8.479,8 B/s × 40.000 CCU × 2.592.000 s = ` 879.186 GB/tháng → **79.127 USD** ở 0,09 USD/GB. Đây là con số dùng để trả lời "có nên siết priority thêm không".
- **Bài 29 — số node và drain.** 223 node, mỗi node 18 trận; drain song song `B` node là `18B` slot biến khỏi nguồn cung, phải bù đúng bằng đó.
- **Bài 29 — file descriptor ở gateway.** 223 × 180 = **40.140** kết nối đồng thời. Một game node chỉ giữ 180 fd nên `ulimit -n` mặc định 1.024 của container vẫn đủ; gateway gom cả 40.140 thì thiếu **39,2 lần** và nó gãy trước mọi thứ khác.

> Đo lại hai con số này sau **mỗi** thay đổi ở chương 6. Một byte thêm vào mỗi entity là 46.656 USD/tháng ở 100.000 CCU theo bài 27 — và nó cũng là vài chục người/node, tức vài chục node.

---

## 5. Tính tay

**Bài 1.** Trận 60 người, `k = 40` entity trong tầm, snapshot 20 Hz, header 44 B, delta mức field 7,60 B/entity đổi.
- Bot đứng im và bot di chuyển cho egress mỗi player bao nhiêu B/s? Tỉ lệ là bao nhiêu, và vì sao nó **không** bằng 9,64 như bảng ở 3.3?
- NIC 1 Gbps, trần theo từng trường hợp là bao nhiêu người? Chênh bao nhiêu lần?
- Nếu chỉ 50 % entity trong tầm đang di chuyển, egress là bao nhiêu, nằm ở đâu giữa hai mốc trên?

**Bài 2.** Bot host 8 core, giá bot 0,7 ms CPU/bot/giây.
- Bao nhiêu bot thì bot host dùng hết 8 core? Bạn nên dừng ở bao nhiêu để chừa 30 % lề?
- Bạn cần mô phỏng 12.000 người: bao nhiêu bot host? Nếu mỗi bot host cũng chạy 4 số đo phía client, phần đó cộng thêm 15 % CPU thì đáp án đổi thế nào?
- Bot host báo nhịp input thật 57,4 Hz thay vì 60. Bạn ghi mốc này là ĐẠT hay HỎNG, và con số bạn vừa đo là trần của cái gì?

**Bài 3.** Ramp cho kết quả: 180 người/node, tick p99 15,9 ms ở bậc đó, egress node 1,53 MB/s, RSS 4,1 GB, fd 1.840.
- Trong bốn số đó, cái nào đang chạm trần trước? Trần NIC 1 Gbps còn cách bao nhiêu lần?
- Đội đề xuất hạ snapshot 20 Hz xuống 15 Hz. Egress còn bao nhiêu? Điều đó có nâng được 180 lên không, và vì sao?
- 40.000 CCU cần bao nhiêu node? Nếu drain 20 node song song thì mất bao nhiêu phần trăm sức chứa?

---

## 6. Chuyển giao

Bạn tiếp quản một hệ đã có sẵn bộ load test: bot dùng chung `client/core`, chạy trên 6 máy riêng, random-walk, delay 120 ms, loss 3 %, rải pha đàng hoàng. Báo cáo cuối: **420 người/node, tick p99 12,4 ms**.

- Bot random-walk trong một bản đồ rộng nên mật độ đều. Người thật thì tụ lại quanh mục tiêu. Theo bài 32, `k` tỉ lệ với mật độ và tải tỉ lệ với `P·k` — một cú dồn người gấp 6 lần cho tải gấp bao nhiêu lần, và con số 420 còn nghĩa gì?
- Bot không bao giờ mở túi đồ, không mở bảng xếp hạng, không chat. Ba thao tác đó đi qua meta plane (bài 31), không qua tick loop. Chúng có thuộc load test này không, hay thuộc một bài test khác?
- Bot reconnect sau mỗi 15 phút theo lịch. Người thật reconnect vì mất sóng, tức **cụm**: một sự cố ISP đẩy hàng nghìn reconnect vào cùng 10 giây. Bài 16 giữ slot cho họ. Bạn thêm gì vào bot để đo được kịch bản đó?
- Ở bậc 420, tick p99 là 12,4 ms — còn 4,27 ms lề. Bạn có được phép nội suy tuyến tính để nói node chịu được 560 người không?
- Bot chạy phiên bản client hôm nay. Người chơi thật chạy bốn phiên bản khác nhau vì có người chưa cập nhật, và bài 24 nói schema có versioning. Phép đo của bạn thiếu gì?
- Cả bộ test chạy trong một vùng, độ trễ giữa bot host và server là 0,8 ms trước khi cộng delay giả lập. Delay giả lập cộng vào **sau khi** gói đã ra khỏi kernel bot. Cái gì trong ngân sách 182 ms của bài 8 vẫn không được đo, kể cả với 6 máy riêng?
- Câu cuối: 420 là số **đúng** — trên bot của bạn. Người thật khác bot ở một điểm không kỹ thuật nào trong bài này bù được: họ **phản ứng với nhau**. Một người bắn thì mười người quanh đó đổi hướng trong 200 ms; trận nghiêng thì cả đội dồn về một điểm. Bot random-walk là các biến **độc lập**, người thật là các biến **tương quan**, và mọi trần đều tính trên tổng của biến độc lập. Với hệ số tương quan `ρ`, phương sai tải tức thời là `N·σ²·(1 + (N−1)ρ)` chứ không phải `N·σ²` — tự tính với `N = 420`, `ρ = 0,05` xem độ lệch chuẩn của tải đỉnh phình bao nhiêu lần, rồi trả lời: mốc vận hành nên đặt ở bao nhiêu phần trăm của 420?

---

## 7. Tóm tắt

- **Trần ở bài 28 và 32 là cận trên của một tài nguyên**, tính với giả định phần còn lại bằng không. Trần thật = min(bảng) chia cho một hệ số chỉ đo được. Bảng nói đi tìm cái gì; bot nói con số.
- **Bot phải dùng lại `client/core` thật.** Bot JSON trong khi client bit-packed đo sai **8,24 lần** (112,7 vs 13,68 B/entity) và bỏ hẳn reconciliation khỏi phép đo.
- **Bot đứng im làm gói snapshot còn 44 B thay vì 423,99 B — 9,64 lần**, vì mask 0 khiến entity biến mất khỏi gói. Trần NIC "đo" được 142.045 người thay vì 14.741; hoá đơn 8.211 thay vì **79.127 USD/tháng** ở 40.000 CCU. Nó cũng xoá sạch sự kiện AOI: không entity nào vào tầm, không keyframe nào, cache trúng 100 %.
- **Điểm hoà vốn 135,7 % của bài 25 không cứu bạn**: bot đứng im ở 0 % entity đổi, người thật ở gần 100 % — cùng vùng delta thắng, khác nhau gần một bậc độ lớn.
- **Giá một bot là ~0,7 ms CPU/giây, 1 core cho mỗi ~1.400 bot.** 4.000 bot cùng máy ăn **1,806 core**, gấp **2,54 lần** server (0,711 core), đẩy tick p99 server lên **11,10–13,17 ms** = 66,6–79,0 % ngân sách — trong khi CPU server vẫn là 7 % của máy 10 core. Và loopback không chạm NIC, nên trần băng thông vắng mặt hoàn toàn.
- **p50 đẹp LÊN khi có bot** (0,84 → 0,27 ms) trong khi p99 vọt: chênh **49,5 lần**. Máy bận giữ timer sắc; trung bình là chỉ số nói dối, đúng như bài 7.
- **Bot tự đo bốn số**: RTT p50/p99, tần suất nhận snapshot (≥ 19,5 Hz), số reconcile vượt ngưỡng 5 mm, loss quan sát được. Một mốc chỉ ĐẠT khi cả hai phía cùng đạt. Và bot host phải tự chứng minh nhịp: `input thật / mong đợi` ≥ 99 %, dưới mức đó bạn đang đo trần của bot host.
- **Ramp theo bậc gấp đôi, giữ ≥ 3 phút mỗi bậc, dừng ở ngưỡng gãy đầu tiên** và ghi lại cái gì gãy — bốn nguyên nhân khác nhau đều hiện ra dưới dạng "tick p99 xấu".
- **Mạng xấu nằm trong bot**: loss 5 % mỗi chiều cho round-trip thành công **90,25 %**, mất 3 input và 1 snapshot mỗi giây, khoảng cách snapshot nhảy 50 → 100 ms.
- **Rải bot theo Poisson `λ = CCU / độ_dài_phiên`.** Thả một lượt cho **10.000 kết nối/giây** so với **8,33/giây** thật — 1.200 lần; đồng pha cho đỉnh gấp **16,67 lần** trung bình ở cùng tổng tải.
- **Hai con số mang về là người/node và trận/node.** 180 và 18 cho **223 node** ở 40.000 CCU; con số 500 sai lệch cho 80 node — **thiếu 64,1 %**, và mỗi node chết là 20 trận chết.

→ **Bài 40 — Deploy & vận hành hệ stateful**: biết node chịu được bao nhiêu rồi. Bài cuối chương hỏi chuyện khó nhất của hệ stateful: làm sao thay phần mềm đang chạy mà không giết thứ nó đang giữ.
