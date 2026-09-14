# Case study: Stock Exchange — sàn khớp lệnh độ trễ cực thấp

> Đây là bài cuối của course, và là bài duy nhất mà **p99 được tính bằng micro-giây**. Mọi phản xạ bạn đã luyện suốt 29 bài trước — "thêm một tầng cache", "đẩy vào queue cho decoupled", "scale ngang thêm node", "eventual consistency là đủ" — ở đây **đều sai**. Không phải sai một chút, mà sai về bản chất. Một sàn giao dịch chứng khoán là hệ thống hiếm hoi mà *thêm một thành phần* gần như luôn làm hệ xấu đi, và lời giải tối ưu lại là thứ nghe như đi lùi 30 năm: **một tiến trình, một luồng, một core được ghim chặt, toàn bộ trạng thái nằm trong RAM**.

Hãy bắt đầu bằng câu hỏi làm rõ bài toán khó ở đâu.

Bài toán *nghiệp vụ* của một sàn khớp lệnh nhỏ đến mức đáng ngờ: có một danh sách lệnh mua và một danh sách lệnh bán; ai trả giá cao nhất gặp ai đòi giá thấp nhất thì khớp. Một sinh viên năm hai viết được cái đó trong 200 dòng. Cái khó **không nằm ở logic**. Cái khó nằm ở bốn ràng buộc kẹp quanh logic đó:

1. **Độ trễ tính bằng micro-giây, và phải ổn định ở đuôi phân phối.** Không phải "trung bình 50 µs" mà "p99.9 dưới 100 µs, mỗi ngày, mọi ngày". Một cú dừng gom rác 20 ms là một sự cố được báo cáo lên ban lãnh đạo.
2. **Công bằng (fairness) là yêu cầu pháp lý, không phải tính năng.** Nếu hai người đặt lệnh giống hệt nhau, người đến trước phải được khớp trước — và bạn phải **chứng minh được** điều đó trước cơ quan quản lý, nhiều tháng sau, từ log.
3. **Tính xác định (determinism).** Cùng một chuỗi lệnh đầu vào phải cho ra cùng một chuỗi khớp lệnh đầu ra, trên mọi máy, mọi lần chạy, mãi mãi. Đây không phải sự cầu toàn: nó là cơ chế duy nhất cho phép bạn có bản sao dự phòng và cho phép bạn phát lại (replay) lịch sử để điều tra.
4. **Mất dữ liệu là không thể chấp nhận.** Một lệnh đã được xác nhận mà biến mất là tiền thật của người thật biến mất.

Bốn ràng buộc này va nhau. "Không mất dữ liệu" đòi ghi đĩa; "micro-giây" cấm ghi đĩa đồng bộ. "Công bằng" đòi một thứ tự toàn cục; "thứ tự toàn cục" là kẻ thù tự nhiên của xử lý song song. Cả bài này là câu chuyện về cách ngành tài chính hoà giải bốn thứ đó — và lời hoà giải ấy đẹp một cách bất ngờ.

---

## 1. Từ vựng — 15 phút không thể bỏ qua

Khác với 29 bài trước, ở bài này bạn **không thể suy luận nếu không có từ vựng**. Người phỏng vấn (thường là người từng làm fintech) sẽ nhận ra ngay trong hai phút đầu bạn có hiểu thị trường hay không. Đây là bộ tối thiểu.

### 1.1 Ai là ai trong chuỗi

| Vai | Là gì | Vì sao bạn cần biết |
|---|---|---|
| **Nhà đầu tư (client)** | Người cuối cùng muốn mua/bán cổ phiếu | Không bao giờ nối trực tiếp vào sàn |
| **Broker** (công ty chứng khoán) | Trung gian giữa nhà đầu tư và sàn: Robinhood, Fidelity, VNDirect, SSI | Giữ tài khoản tiền, làm KYC, gom lệnh. Sàn chỉ biết broker, **không biết** nhà đầu tư cá nhân |
| **Sàn (exchange)** | NYSE, NASDAQ, HOSE | Chỉ làm một việc: **khớp lệnh công bằng và công bố giá** |
| **Nhà tạo lập thị trường (market maker)** | Đặt đồng thời lệnh mua và bán để luôn có người đối ứng | Là nguồn của phần lớn lệnh; cực nhạy với độ trễ. Họ là lý do sàn phải nhanh |
| **Khách tổ chức (institutional)** | Quỹ, HFT (high-frequency trading) | Dùng phần mềm riêng, thuê chỗ đặt máy ngay trong datacenter của sàn (colocation) |
| **Clearing house / depository** | Thực hiện chuyển tiền và chuyển quyền sở hữu sau khi khớp | **Không nằm trong bài này.** Khớp lệnh (matching) và thanh toán bù trừ (settlement, T+1/T+2) là hai hệ thống khác nhau |

> 💡 **Điểm hay để nói trong phỏng vấn ngay từ phút thứ ba**: *"Tôi sẽ tách rõ **khớp lệnh** khỏi **thanh toán bù trừ**. Khớp lệnh là micro-giây và in-memory; thanh toán là T+1, chạy theo lô, cần ACID nghiêm ngặt và có thể dùng cơ sở dữ liệu quan hệ bình thường. Gộp hai thứ này vào một hệ thống là lỗi thiết kế phổ biến nhất của bài này."* Câu này lập tức thu hẹp phạm vi và cho thấy bạn biết thị trường vận hành ra sao.

### 1.2 Lệnh và các loại lệnh

Một **lệnh (order)** là một chỉ thị: *mua/bán, mã nào, bao nhiêu, giá nào*.

| Loại lệnh | Ngữ nghĩa | Đặc điểm hệ thống |
|---|---|---|
| **Lệnh giới hạn (limit order)** | "Mua tối đa 100 AAPL ở giá **không quá** 100.05" | Có thể **không khớp ngay** → phải nằm lại trong sổ lệnh. Đây là loại tạo nên order book |
| **Lệnh thị trường (market order)** | "Mua 100 AAPL ở giá nào cũng được" | **Luôn khớp ngay** (nếu có đối ứng), **không bao giờ** nằm lại trong sổ. Ăn dần các mức giá cho tới đủ khối lượng |
| **IOC** (immediate-or-cancel) | Khớp được bao nhiêu thì khớp, phần còn lại huỷ | Không để lại dấu vết trong sổ |
| **FOK** (fill-or-kill) | Khớp trọn vẹn hoặc huỷ toàn bộ | Cần kiểm tra khối lượng khả dụng trước khi thực hiện |
| **Stop / conditional** | Kích hoạt khi giá chạm ngưỡng | **Không nằm trong matching engine** — thường do broker hoặc một tầng riêng giữ, khi kích hoạt mới bắn lệnh thật vào sàn |

Hai loại đầu là đủ cho bài này. Một chi tiết quan trọng về mặt kiến trúc: **lệnh thị trường không thêm trạng thái vào sổ lệnh**, nó chỉ tiêu thụ trạng thái. Điều đó khiến nó rẻ về bộ nhớ nhưng nguy hiểm về giá — một lệnh thị trường khối lượng lớn có thể "ăn" hết nhiều mức giá và làm giá nhảy vọt. Đây là lý do có **circuit breaker** (§15).

### 1.3 Giá: bid, ask, spread

- **Bid** — giá **cao nhất** mà một người mua sẵn sàng trả.
- **Ask** (hay offer) — giá **thấp nhất** mà một người bán sẵn sàng nhận.
- **Spread** = ask − bid. Luôn ≥ 0 trong một sổ lệnh hợp lệ. Nếu spread < 0 thì đã có thứ để khớp và engine sai ở đâu đó.
- **Mid price** = (bid + ask) / 2 — giá "tham chiếu" hay dùng để tính chỉ số.
- **Độ sâu (depth)** — khối lượng chờ ở mỗi mức giá.

> ⚠️ **Bẫy tư duy phổ biến**: nhiều người nghĩ "giá cổ phiếu" là một con số do sàn quyết định. Không. **Sàn không có giá.** Sàn chỉ có một sổ lệnh, và cái mà thế giới gọi là "giá" thực ra là **giá của giao dịch khớp gần nhất (last traded price)**. Giá là *hệ quả* của việc khớp, không phải *đầu vào*. Hiểu sai điểm này thì toàn bộ thiết kế của bạn sẽ đặt sai chỗ trách nhiệm.

### 1.4 Sổ lệnh (order book), khớp lệnh, và fill

- **Order book** — với mỗi mã, hai danh sách: bên mua (bids, sắp xếp giá giảm dần) và bên bán (asks, sắp xếp giá tăng dần).
- **Matching** — hành động ghép một lệnh mới đến với các lệnh đối ứng đang chờ.
- **Execution / fill** — kết quả của một lần khớp. Một lần khớp sinh ra **hai fill**: một cho bên mua, một cho bên bán, cùng giá, cùng khối lượng, cùng số thứ tự sự kiện. Chúng phải được sinh ra và công bố như một cặp không thể tách rời.
- **Partial fill** — lệnh 1000 cổ chỉ khớp được 300 thì có một fill 300, và lệnh còn `remainingQuantity = 700` nằm lại trong sổ.

### 1.5 Market data feed và ba tầng dữ liệu

**Market data feed** là dòng dữ liệu sàn phát ra cho cả thế giới: mỗi lần sổ lệnh thay đổi, mỗi lần có giao dịch khớp. Đây là sản phẩm thương mại quan trọng của sàn, và cũng là bài toán fan-out khó nhất trong hệ (§13).

| Tầng | Nội dung | Ai mua |
|---|---|---|
| **L1** | Chỉ giá bid/ask tốt nhất + khối lượng ở đó, và giá khớp gần nhất | App chứng khoán cho nhà đầu tư cá nhân |
| **L2** | Nhiều mức giá (thường 5–10 mức mỗi bên) kèm tổng khối lượng | Trader chuyên nghiệp |
| **L3** | Từng lệnh riêng lẻ trong hàng đợi ở mỗi mức giá | HFT, market maker — họ cần biết mình đứng thứ mấy trong hàng |

**Nến (candlestick)** — tổng hợp theo cửa sổ thời gian: open, high, low, close, volume. Đây là dữ liệu *phái sinh*, được tính từ dòng fill, và **không nằm trên đường nóng**.

**FIX (Financial Information eXchange)** — giao thức chuẩn ngành để broker gửi lệnh. Định dạng key=value phân tách bằng `|`, dạng văn bản và khá "béo". Các sàn tốc độ cao dùng **biến thể nhị phân** (SBE — Simple Binary Encoding, hoặc giao thức riêng) cho đường nóng và giữ FIX cho các kênh ít nhạy cảm về thời gian.

```
Một message FIX (rút gọn):
8=FIX.4.2 | 35=D | 49=BROKER1 | 56=EXCHANGE | 55=AAPL | 54=1 | 38=100 | 40=2 | 44=100.05 | ...
            ^ type=D (new order)        symbol ^     side=1(buy) ^  qty ^  type=2(limit) ^ price
```

> 💡 Đọc được nó không quan trọng. Quan trọng là hiểu vì sao sàn tốc độ cao **bỏ FIX text trên critical path**: phân tích cú pháp một chuỗi văn bản có độ dài thay đổi mất hàng micro-giây và sinh ra cấp phát bộ nhớ. Một message nhị phân có bố cục cố định được đọc bằng vài phép truy cập offset — **không cấp phát, không nhánh rẽ, vài chục nano-giây**. Đây đã là ví dụ đầu tiên cho tinh thần chủ đạo của bài.

---

## 2. Làm rõ yêu cầu

### 2.1 Functional

- Broker **đặt lệnh** (limit và market) và **huỷ lệnh**.
- Hệ **khớp lệnh** theo quy tắc công bằng, sinh fill cho cả hai bên và trả về broker theo thời gian thực.
- Broker và khách hàng **xem được sổ lệnh** theo thời gian thực (L1/L2, và L3 cho khách trả tiền).
- **Kiểm tra rủi ro (risk check)** trước khi lệnh vào engine: hạn mức khối lượng, hạn mức giá trị, và **kiểm tra số dư ví** — tiền cho lệnh đang chờ phải bị **giữ lại (withhold)** cho tới khi lệnh kết thúc.
- **Dữ liệu thị trường**: phát L1/L2/L3 và dựng nến.
- **Báo cáo & tuân thủ**: lưu toàn bộ lệnh, fill, huỷ để phục vụ thuế, đối soát, giám sát thao túng thị trường.
- Chỉ cổ phiếu (không phái sinh), chỉ giờ giao dịch bình thường 09:30–16:00.

### 2.2 Non-functional — nơi bài này khác mọi bài khác

| Yêu cầu | Mức | Vì sao mức đó |
|---|---|---|
| **Độ trễ khớp lệnh** | p99 **< 100 µs** từ lúc gói tin chạm card mạng tới lúc fill rời card mạng ("wire-to-wire"); nhân matching engine đơn thuần **< 10 µs** | Market maker định giá lại theo mỗi tick; chậm hơn đối thủ 50 µs là mất tiền thật |
| **Tính ổn định của độ trễ** | p99.9 không được vượt quá ~3× p99 | Một cú giật 20 ms nguy hiểm hơn việc trung bình cao thêm 30 µs. Xem §12 |
| **Tính xác định** | Tuyệt đối | Điều kiện cần cho HA và cho replay |
| **Công bằng** | Price-time priority, chứng minh được | Yêu cầu pháp lý |
| **Khả dụng** | ≥ 99.99% trong giờ giao dịch (≈ 2,3 s/ngày), failover **< vài chục ms** | Sàn dừng 5 phút là tin trên báo |
| **Bền vững dữ liệu** | Không mất lệnh đã ACK. RPO = 0 | Tiền thật |
| **Bảo mật** | KYC ở broker, chống DDoS cho các endpoint công khai, phân tách mạng công/tư | |
| **Thông lượng** | Xem §3 | |

### 2.3 Giả định chốt

Bốn giả định này quyết định toàn bộ kiến trúc, nên phải nói ra thành lời:

1. **~100 mã cổ phiếu, ~1 tỉ lệnh/ngày.** Đây là sàn **nhỏ–vừa**. Con số này cực kỳ quan trọng: nó cho phép toàn bộ sổ lệnh nằm gọn trong RAM của **một** máy (§3.3).
2. **Sổ lệnh của các mã độc lập nhau.** Không có lệnh nào liên quan hai mã cùng lúc. Đây là điều kiện cho phép sharding theo mã (§16) khi cần lớn hơn.
3. **Broker là "khách hàng" của sàn.** Sàn không quản lý người dùng cuối; KYC, chống rửa tiền nằm ở broker.
4. **Khớp lệnh và thanh toán bù trừ tách rời.** Sàn chỉ sinh fill; việc chuyển tiền/chuyển cổ phiếu là hệ khác, chạy T+1.

---

## 3. Back-of-envelope estimation

Ở bài này ước lượng có một vai trò khác thường: nó không dùng để quyết định "cần bao nhiêu máy", mà để chứng minh rằng **một máy là đủ** — và vì thế cho phép ta chọn kiến trúc single-process vốn nghe như điên rồ.

### 3.1 QPS — và vì sao con số trung bình là vô nghĩa

```
Giả định:
  Số lệnh / ngày            = 1.000.000.000  (1 tỉ)
  Giờ giao dịch             = 09:30 → 16:00 = 6,5 giờ = 23.400 s

QPS trung bình = 1e9 / 23.400 ≈ 42.700 lệnh/s   (~43K)

Nhưng phân bố trong ngày CỰC KỲ lệch:
  - Phiên mở cửa (09:30–09:35): dồn toàn bộ lệnh đặt qua đêm
  - Phiên đóng cửa (15:50–16:00): các quỹ chỉ số phải khớp giá đóng cửa
  - Tin tức bất ngờ: Fed công bố lãi suất, báo cáo lợi nhuận

Hệ số đỉnh thực tế: 5×  → Peak ≈ 215.000 lệnh/s
Đỉnh của đỉnh (micro-burst trong 1 ms lúc 09:30:00.000): có thể chạm 1–2 triệu lệnh/s
```

> ⚠️ **Bẫy lớn nhất của phần ước lượng trong bài này**: nếu bạn chỉ báo cáo QPS trung bình 43K rồi thiết kế cho nó, bạn sẽ **thiết kế một hệ thống sập vào đúng 09:30:00 mỗi ngày**. Lưu lượng của sàn không phải một dòng chảy đều, nó là **các đợt bùng nổ cực ngắn (micro-burst)** xen giữa những khoảng im ắng. Con số cần thiết kế không phải "lệnh/giây" mà là **"số lệnh dồn trong 1 ms tệ nhất"** và **kích thước bộ đệm cần để không mất gói**.

Ba hệ quả trực tiếp:

- Card mạng và bộ đệm nhận phải chịu được burst mà không drop gói. Với UDP thì drop là mất lệnh.
- Bộ đệm giữa các tầng (ring buffer) phải đủ lớn để hấp thụ burst, và ta phải biết chuyện gì xảy ra khi nó đầy (§11.3).
- **Autoscaling là vô dụng.** Một đợt burst kéo dài 200 ms; một EC2 instance khởi động mất 40 giây. Ở bài này bạn phải **cấp phát dư sẵn (over-provision)**, không phải co giãn.

### 3.2 Băng thông đường vào

```
Một lệnh nhị phân (SBE) ≈ 60–100 bytes:
  order_id(8) + client_id(4) + symbol_id(4) + side(1) + type(1)
  + price(8) + quantity(8) + timestamp(8) + seq(8) + padding ≈ 64 B
Cộng header Ethernet+IP+UDP ≈ 46 B → ~110 B trên dây

Trung bình: 43K × 110 B ≈ 4,7 MB/s ≈ 38 Mbps       → nhỏ xíu
Đỉnh:      215K × 110 B ≈ 23,6 MB/s ≈ 190 Mbps     → vẫn nhỏ
Micro-burst 1M/s:       ≈ 110 MB/s ≈ 880 Mbps      → sát trần 1 Gbps
```

Kết luận quan trọng: **băng thông không phải nút thắt; số gói tin mới là nút thắt.** 215.000 gói nhỏ mỗi giây nghĩa là 215.000 lần ngắt (interrupt) và 215.000 lần chuyển ngữ cảnh kernel↔user mỗi giây nếu dùng socket thông thường. Đây chính là lý do tồn tại của **kernel bypass** (§11.6) — không phải để tăng băng thông mà để **xoá bỏ chi phí trên mỗi gói**.

### 3.3 Bộ nhớ cho sổ lệnh — con số cứu cả kiến trúc

Đây là phép tính quan trọng nhất của bài.

```
Lệnh còn sống (open orders) trong sổ tại một thời điểm:
  Thực tế: phần lớn lệnh HFT được huỷ trong vài ms — tỉ lệ huỷ > 95%.
  Nên số lệnh TỒN TẠI đồng thời nhỏ hơn rất nhiều số lệnh GỬI ĐẾN.

  Ước lượng: mỗi mã ~50.000 lệnh đang chờ (rất rộng rãi cho sàn nhỏ–vừa)
  100 mã × 50.000 = 5.000.000 lệnh sống

  Mỗi Order trong RAM (bố cục chặt, không con trỏ thừa):
    order_id 8 + client_id 4 + price 8 + qty 8 + filled 8
    + prev 8 + next 8 + flags 4 + ts 8 ≈ 64 B  (vừa đúng 1 cache line!)

  5.000.000 × 64 B = 320 MB

  Cộng orderMap (hash order_id → Order*): 5M × ~24 B ≈ 120 MB
  Cộng mảng price level: 100 mã × ~20.000 mức × 32 B ≈ 64 MB

  TỔNG ≈ 500 MB
```

**Năm trăm megabyte.** Đây là con số làm thay đổi mọi thứ. Toàn bộ trạng thái sống của một sàn chứng khoán 100 mã vừa trong bộ nhớ đệm của một CPU máy chủ đời mới, chứ đừng nói RAM. Và vì nó vừa trong RAM của **một** máy, ta **không cần** phân tán, **không cần** đồng thuận phân tán trên đường nóng, **không cần** khoá phân tán, **không cần** giao dịch hai pha.

> 💡 **Nguyên tắc cần rút ra và mang theo suốt đời**: trước khi bạn thiết kế một hệ phân tán, hãy tính xem dữ liệu nóng có vừa trong một máy không. Phân tán là **cái giá phải trả khi không còn lựa chọn**, không phải phần thưởng. Suốt 29 bài trước ta phân tán vì buộc phải thế (petabyte, hàng tỉ user). Ở đây dữ liệu nóng là 500 MB, nên phân tán chỉ mua về độ trễ mạng và sự bất định — hai thứ đúng bằng những thứ bài này cấm.

### 3.4 Nhật ký sự kiện (event log) và lưu trữ

```
Ghi nhật ký mọi sự kiện vào (lệnh, huỷ) và ra (fill):
  1e9 lệnh vào × 64 B                      =  64 GB/ngày
  Fill: tỉ lệ khớp ~5% → 50M khớp × 2 fill × 48 B ≈ 4,8 GB/ngày
  Huỷ, sửa, reject, heartbeat              ≈ 20 GB/ngày
  TỔNG                                     ≈ 90 GB/ngày thô

  Nén (dữ liệu rất lặp lại, tỉ lệ 5:1)     ≈ 18 GB/ngày
  Giữ 7 năm theo quy định: 18 GB × 252 phiên × 7 ≈ 32 TB
```

32 TB nén trên S3 Glacier là chuyện vặt về chi phí. Điểm đáng chú ý là **tốc độ ghi trên đường nóng**: 90 GB / 23.400 s ≈ **3,8 MB/s trung bình**, đỉnh ~20 MB/s. Một ổ NVMe ghi tuần tự thừa sức. Nhưng — và đây là mấu chốt — **độ trễ ghi**, chứ không phải thông lượng, mới là thứ giết bạn: một lần `fsync()` mất 50–500 µs, tức là gấp 10–50 lần toàn bộ ngân sách của matching engine. Đây là lý do đường nóng **không bao giờ chờ đĩa** (§9).

### 3.5 Băng thông dữ liệu thị trường đi ra — nút thắt thật sự

```
Mỗi thay đổi sổ lệnh sinh ra một message L3 (~40 B).
Số thay đổi/ngày ≈ số lệnh + số huỷ + số fill ≈ 2e9 sự kiện

Feed L3 (đầy đủ):   215K sự kiện/s × 40 B ≈ 8,6 MB/s ≈ 70 Mbps
Feed L2 (10 mức):   cập nhật gộp, ~50K msg/s × 60 B ≈ 3 MB/s
Feed L1:            ~10K msg/s × 32 B ≈ 0,3 MB/s

Số người nhận (subscriber): ~500 broker + market maker

NẾU DÙNG UNICAST TCP: 8,6 MB/s × 500 = 4,3 GB/s ≈ 34 Gbps
NẾU DÙNG MULTICAST:   8,6 MB/s, BẤT KỂ có bao nhiêu người nhận
```

Hai con số **34 Gbps** và **8,6 MB/s** chính là toàn bộ lý lẽ cho multicast (§13). Và còn một lý do nặng hơn cả băng thông: với TCP unicast, người nhận thứ nhất nhận được dữ liệu **trước** người nhận thứ 500 vài trăm micro-giây. Trong giao dịch tần suất cao, vài trăm micro-giây là **tiền**. Việc phát tuần tự tạo ra một lợi thế không công bằng do chính kiến trúc của bạn sinh ra — điều mà cơ quan quản lý sẽ hỏi tới.

### 3.6 Bảng tổng kết và điều nó dẫn tới

| Đại lượng | Con số | Quyết định thiết kế nó dẫn tới |
|---|---|---|
| Lệnh/ngày | 1 tỉ | Vừa sức một engine |
| QPS trung bình / đỉnh | 43K / 215K | Không cần scale ngang engine |
| Micro-burst | tới ~1M/s trong vài ms | Cấp dư + ring buffer lớn, **không** autoscale |
| **RAM cho sổ lệnh** | **~500 MB** | **Một tiến trình, toàn bộ trong RAM** |
| Ngân sách độ trễ nhân engine | < 10 µs | Không đĩa, không khoá, không cấp phát, không GC |
| Ngân sách wire-to-wire | < 100 µs p99 | Kernel bypass, ghim CPU, busy-wait |
| Nhật ký sự kiện | 90 GB/ngày thô | Ghi tuần tự bất đồng bộ, không `fsync` trên đường nóng |
| Fan-out market data | 8,6 MB/s × 500 người nhận | **Multicast UDP**, không phải TCP |

> 💡 Một dòng tóm tắt cả phần ước lượng: **hệ này không lớn, nó nhanh.** Mọi bài trước ta chống lại *khối lượng*; bài này ta chống lại *thời gian*. Đó là hai môn thể thao khác nhau, dùng hai bộ công cụ gần như không giao nhau.

---

## 4. API design

Sàn có hai nhóm giao diện với đặc tính hoàn toàn trái ngược, và việc **nói rõ sự trái ngược đó** là một điểm cộng lớn.

### 4.1 Đường nóng — giao thức nhị phân, không phải REST

```
Kênh: TCP giữ kết nối lâu dài, hoặc UDP + lớp tin cậy riêng.
      Không HTTP. Không JSON. Không TLS trên đường nóng
      (dùng mạng riêng/cross-connect vật lý thay cho mã hoá tốn CPU).

NewOrder (64 B, bố cục cố định, little-endian, căn theo 8 byte)
  offset  0: msg_type      u8   = 1
  offset  1: side          u8   = 0 buy / 1 sell
  offset  2: order_type    u8   = 0 limit / 1 market
  offset  3: tif           u8   = 0 DAY / 1 IOC / 2 FOK
  offset  4: symbol_id     u32  (đã ánh xạ sẵn, KHÔNG gửi chuỗi "AAPL")
  offset  8: client_ord_id u64  (do broker sinh — dùng cho idempotency)
  offset 16: price         i64  (nhân 10^4: 100.0500 → 1000500)
  offset 24: quantity      i64
  offset 32: client_id     u32
  offset 36: ...
  offset 40: send_ts_ns    u64  (đồng hồ của broker — dùng để đo one-way)

CancelOrder (32 B)
  msg_type = 2, exchange_ord_id u64, client_ord_id u64, symbol_id u32

→ ExecutionReport (48 B) — sàn trả về
  msg_type = 3, exchange_ord_id, client_ord_id, seq_id u64,
  status u8 (NEW/PARTIAL/FILLED/CANCELED/REJECTED),
  last_price i64, last_qty i64, leaves_qty i64, exch_ts_ns u64
```

Bốn quyết định đáng giải thích, và người phỏng vấn sẽ hỏi từng cái:

1. **Giá là số nguyên, không phải số thực.** `100.05` được truyền là `1000500` với hệ số 10⁴. Số dấu phẩy động nhị phân **không biểu diễn chính xác** được 0.05, và hai máy khác nhau có thể làm tròn khác nhau — phá vỡ tính xác định và gây lệch tiền. Đây là quy tắc bất di bất dịch của mọi hệ thống tài chính.
2. **`symbol_id` là số, không phải chuỗi.** So sánh chuỗi có nhánh rẽ và truy cập bộ nhớ rời rạc; một `u32` là chỉ số trực tiếp vào mảng. Bảng ánh xạ tên→id được nạp lúc khởi động.
3. **Bố cục cố định, căn lề (aligned).** Đọc trường là một phép `load` duy nhất, không cần phân tích cú pháp, không cấp phát. So với FIX text: nhanh hơn khoảng **50–100 lần**.
4. **`client_ord_id` do broker sinh** — đây là khoá **idempotency**. Nếu broker gửi lại vì không nhận được phản hồi, sàn nhận ra trùng và trả lại kết quả cũ thay vì tạo lệnh thứ hai. Đúng nguyên tắc đã học ở bài Message Queue: *trong mạng không tin cậy, "gửi đúng một lần" là ảo tưởng; thứ có thật là "xử lý đúng một lần nhờ khoá idempotency"*.

### 4.2 Đường lạnh — REST bình thường

Đây là nơi HTTP/JSON hoàn toàn ổn, vì không ai đo micro-giây.

```
GET  /v1/orders/{orderId}                      # tra cứu trạng thái lệnh
GET  /v1/executions?symbol=AAPL&from=&to=      # lịch sử khớp
GET  /v1/marketdata/orderbook/L2?symbol=AAPL&depth=10
       → { bids:[[price,size],...], asks:[[price,size],...], seq: 8813422 }
GET  /v1/marketdata/candles?symbol=AAPL&resolution=60&from=&to=
       → { candles: [{o,h,l,c,v,ts}, ...] }
GET  /v1/reference/symbols                     # danh mục mã, tick size, lot size
GET  /v1/reports/daily?date=2026-03-14         # đối soát cuối ngày
```

> ⚠️ Đừng để REST dính vào đường nóng dù chỉ một chút. Mọi endpoint ở trên đọc từ **bản sao** của trạng thái (do market data publisher hoặc reporter dựng lại), **không bao giờ** hỏi trực tiếp matching engine. Nếu một truy vấn REST có thể làm engine dừng lại dù chỉ một micro-giây, bạn đã để tầng lạnh làm ô nhiễm tầng nóng — đây là lỗi thiết kế nghiêm trọng nhất mà một ứng viên có thể mắc ở bài này.

---

## 5. High-level design

### 5.1 Bức tranh tổng thể

```
   ┌──────────┐        ┌──────────┐
   │  Nhà đầu │        │ Khách tổ │
   │ tư cá nhân│       │  chức/HFT│
   └────┬─────┘        └────┬─────┘
        │ app/web            │ máy đặt COLOCATION trong DC của sàn
        ▼                    │
   ┌──────────┐              │
   │  BROKER  │              │
   │ (KYC,ví, │              │
   │ gom lệnh)│              │
   └────┬─────┘              │
        │  FIX / nhị phân    │ nhị phân, cross-connect 10–40 Gbps
        └──────────┬─────────┘
                   ▼
╔═══════════════════════════════════════════════════════════════════════╗
║                        SÀN GIAO DỊCH (EXCHANGE)                       ║
║                                                                       ║
║  ┌─────────────────┐   ① lệnh                                         ║
║  │ CLIENT GATEWAY  │───────────┐    (nhiều gateway, STATELESS,        ║
║  │ xác thực, giới  │◀────────┐ │     scale ngang thoải mái)           ║
║  │ hạn nhịp, giải  │  ⑦ fill │ │                                      ║
║  │ mã, chuẩn hoá   │         │ │                                      ║
║  └─────────────────┘         │ ▼                                      ║
║                        ┌───────────────────┐                          ║
║                        │   ORDER MANAGER   │  ② risk check            ║
║                        │ trạng thái lệnh,  │─────▶┌──────────────┐    ║
║                        │ giữ tiền trong ví │◀─────│ RISK MANAGER │    ║
║                        └─────────┬─────────┘      │ hạn mức, ví  │    ║
║                                  │ ③              └──────────────┘    ║
║                                  ▼                                    ║
║              ╔═══════════════════════════════════════╗                ║
║              ║           SEQUENCER                   ║                ║
║              ║  người viết DUY NHẤT, gán seq_id      ║                ║
║              ║  tăng đơn điệu cho MỌI sự kiện        ║                ║
║              ╚════════════════╤══════════════════════╝                ║
║                               │ ④ dòng sự kiện đã đánh số             ║
║                     ┌─────────┴──────────────────────────┐            ║
║                     ▼                                    │            ║
║        ┌─────────────────────────┐                       │            ║
║        │    MATCHING ENGINE      │                       │            ║
║        │  ĐƠN LUỒNG, ghim 1 core │   ⑤ fill              │            ║
║        │  sổ lệnh 100 mã in-RAM  │──────────┐            │            ║
║        │  price-time priority    │          │            │            ║
║        └─────────────────────────┘          ▼            ▼            ║
║                                    ┌────────────────┐  ┌───────────┐  ║
║                                    │ MARKET DATA    │  │ REPORTER  │  ║
║                                    │ PUBLISHER      │  │ ghi DB,   │  ║
║                                    │ dựng L1/L2/L3, │  │ tuân thủ, │  ║
║                                    │ nến            │  │ đối soát  │  ║
║                                    └───────┬────────┘  └─────┬─────┘  ║
║                                            │ ⑥ MULTICAST UDP │        ║
╚════════════════════════════════════════════╪═════════════════╪════════╝
                                             ▼                 ▼
                                   ┌──────────────────┐  ┌────────────┐
                                   │ 500 người nhận   │  │ Kho lịch sử│
                                   │ (broker, MM,     │  │ + giám sát │
                                   │  nhà cung cấp DL)│  │  (T+1)     │
                                   └──────────────────┘  └────────────┘
```

### 5.2 Ba luồng, ba ngân sách độ trễ hoàn toàn khác nhau

| Luồng | Đường đi | Ngân sách | Ưu tiên |
|---|---|---|---|
| **Giao dịch (trading)** | ① → ② → ③ → ④ → ⑤ → ⑦ | **< 100 µs** | Tốc độ, tính xác định |
| **Dữ liệu thị trường** | ⑤ → ⑥ | < 1 ms, và **đồng đều giữa mọi người nhận** | Công bằng |
| **Báo cáo** | ⑤ → reporter → DB | Vài giây tới T+1 | Chính xác, đầy đủ, bất biến |

> 💡 **Câu chốt đáng học thuộc**: *"Ba luồng này không chỉ khác nhau về tốc độ, chúng khác nhau về **thứ được tối ưu**. Luồng giao dịch tối ưu độ trễ và chấp nhận mất tính năng. Luồng dữ liệu tối ưu **sự đồng đều** — thà chậm cho tất cả còn hơn nhanh cho một người. Luồng báo cáo tối ưu tính đầy đủ và chấp nhận chậm. Nếu tôi để chúng dùng chung một đường ống, tôi đã ép cả ba nhận đặc tính tệ nhất của nhau."*

### 5.3 Vai trò từng thành phần — và vì sao nó tồn tại

**Client gateway** — cửa vào duy nhất. Xác thực broker, giới hạn nhịp (một broker lỗi không được làm ngập sàn), giải mã gói tin thành cấu trúc nội bộ, kiểm tra cú pháp cơ bản (giá > 0, khối lượng là bội của lô, mã tồn tại, giá nằm trong dải cho phép). Nó **stateless** nên nhân bản thoải mái, và đó chính là lý do tồn tại: gánh hết phần việc "bẩn" và biến đổi để những tầng sau chỉ thấy dữ liệu sạch, có định dạng cố định.

**Order manager** — giữ vòng đời lệnh (`NEW → PARTIALLY_FILLED → FILLED / CANCELED / REJECTED`), gọi risk manager, giữ tiền trong ví, và ánh xạ giữa `client_ord_id` của broker và `exchange_ord_id` nội bộ. Đây là nơi trạng thái *nghiệp vụ* sống — trái với matching engine chỉ giữ trạng thái *sổ lệnh*. Tách hai loại trạng thái này rất quan trọng: matching engine phải mỏng đến mức tối đa, nên mọi thứ không cần cho việc ghép giá đều bị đẩy ra ngoài.

**Risk manager** — giữ bảng hạn mức (khối lượng tối đa/ngày mỗi khách mỗi mã, giá trị tối đa, số lệnh/giây tối đa) và trạng thái tích luỹ trong ngày. Xem §14.

**Sequencer** — trái tim kín đáo của cả hệ. Xem §8.

**Matching engine** — nhân khớp lệnh. Xem §6, §7.

**Market data publisher** — nhận dòng fill và thay đổi sổ lệnh, dựng lại sổ lệnh riêng của nó, phát ra multicast, dựng nến. Xem §13.

**Reporter** — tiêu thụ cùng dòng sự kiện, ghi vào kho bền vững cho tuân thủ, thuế, đối soát, giám sát thao túng. Xem §17.

### 5.4 Điểm bất ngờ: tất cả chạy trên MỘT máy

Sơ đồ trên trông như bảy dịch vụ — và trực giác từ 29 bài trước sẽ bảo bạn triển khai chúng thành bảy container, nối bằng gRPC hoặc Kafka. **Ở sàn tốc độ cao thì không.** Chúng là bảy **tiến trình (hoặc thread) trên cùng một máy vật lý**, giao tiếp qua vùng nhớ dùng chung.

Vì sao? Hãy tính ngân sách:

| Cách nối | Độ trễ một chặng | Bảy chặng |
|---|---|---|
| gRPC qua mạng trong cùng DC | 200–500 µs | 1,4–3,5 ms |
| gRPC qua loopback trong máy | 50–100 µs | 350–700 µs |
| Kafka (dù cùng DC) | 2–10 ms | ≫ ngân sách |
| Unix domain socket | 10–20 µs | 70–140 µs |
| **Vùng nhớ chung (mmap / shared memory)** | **0,05–0,5 µs** | **~1–3 µs** |

Ngân sách wire-to-wire là 100 µs. Chỉ riêng việc nối các thành phần bằng gRPC đã tiêu **gấp mười lần** ngân sách trước khi làm bất kỳ việc hữu ích nào. Vậy nên lời giải là: một file được ánh xạ bộ nhớ (`mmap`) đặt trong `/dev/shm` — tức là **hoàn toàn trong RAM, không chạm đĩa** — đóng vai trò "bus sự kiện". Mỗi thành phần là một tiến trình đọc/ghi vào vùng đó.

```
   /dev/shm/exchange_bus   (ring buffer, cấp phát sẵn, ví dụ 8 GB)
   ┌───────────────────────────────────────────────────────────┐
   │ seq 1001 │ seq 1002 │ seq 1003 │ seq 1004 │ ... │ (trống) │
   └───────────────────────────────────────────────────────────┘
        ▲           ▲          ▲          ▲
        │           │          │          └── ✍ SEQUENCER ghi (người viết DUY NHẤT)
        │           │          └── 👁 matching engine đọc tới đây
        │           └── 👁 market data publisher đọc tới đây
        └── 👁 reporter đọc tới đây (chậm nhất, không sao)

   Mỗi người đọc có con trỏ RIÊNG, đọc độc lập, KHÔNG khoá,
   KHÔNG ảnh hưởng lẫn nhau. Người đọc chậm không làm chậm người đọc nhanh.
```

> 💡 **Nguyên tắc gây sốc nhất của bài**: ở 29 bài trước, "tách thành nhiều dịch vụ nối bằng queue" là câu trả lời đúng gần như mọi lúc. Ở đây nó là câu trả lời **sai**, vì mỗi ranh giới tiến trình/mạng bạn thêm vào là một khoản thuế micro-giây mà bài toán không đủ ngân sách để trả. Kiến trúc vẫn được **chia theo trách nhiệm** — nhưng **không bị chia theo không gian**. *Tách logic, không tách vật lý.* Đây chính là điều làm bài này trở thành bài kết thúc course: nó buộc bạn nhận ra rằng mọi "best practice" đều là hệ quả của một tập ràng buộc, và khi ràng buộc đổi thì kết luận lật ngược.

---

## 6. Matching engine và order book — phần lõi

### 6.1 Order book cần làm được những gì

Trước khi chọn cấu trúc dữ liệu, hãy liệt kê chính xác các thao tác và **tần suất** của chúng. Đây là bước mà hầu hết ứng viên bỏ qua, rồi chọn sai.

| Thao tác | Tần suất | Yêu cầu |
|---|---|---|
| Thêm lệnh vào một mức giá | Rất cao (~215K/s) | O(1) |
| **Huỷ một lệnh theo id** | **Cao nhất — >95% lệnh bị huỷ** | O(1) |
| Lấy giá bid/ask tốt nhất | Mỗi lệnh đến | O(1) |
| Khớp: lấy lệnh đầu hàng ở mức giá tốt nhất | Mỗi lần khớp | O(1) |
| Chuyển sang mức giá kế tiếp khi mức hiện tại cạn | Khi có lệnh lớn quét sổ | O(1) amortized |
| Lấy tổng khối lượng ở một mức giá | Mỗi lần phát L2 | O(1) |
| Duyệt N mức giá tốt nhất | Mỗi lần phát L2 | O(N) |

Điểm quan trọng nhất trong bảng: **huỷ lệnh là thao tác phổ biến nhất**, không phải khớp lệnh. Trong thị trường hiện đại, market maker liên tục đặt và rút báo giá; tỉ lệ huỷ trên 95% là bình thường. Nếu bạn chọn cấu trúc dữ liệu tối ưu cho khớp mà huỷ lại tốn O(log n) hay O(n), bạn đã tối ưu cho 5% và trừng phạt 95%.

### 6.2 Vì sao KHÔNG dùng heap, KHÔNG dùng cây cân bằng

Đây là câu hỏi kinh điển của bài, và trả lời tốt là điểm phân loại.

| Cấu trúc | Thêm | Lấy tốt nhất | **Huỷ theo id** | Vấn đề chí mạng |
|---|---|---|---|---|
| **Min/max heap** | O(log n) | O(1) xem, O(log n) lấy | **O(n)** — phải tìm tuyến tính | Huỷ giữa heap là thảm hoạ. Và heap **không giữ được thứ tự thời gian** trong cùng một giá — phá vỡ công bằng |
| **Cây đỏ-đen / AVL / B-tree** (`std::map`) | O(log n) | O(log n) | O(log n) nếu có con trỏ | log n ≈ 15–17 phép so sánh, **mỗi phép là một lần nhảy con trỏ tới vùng nhớ ngẫu nhiên → cache miss ~80–100 ns**. 17 × 80 ns ≈ **1,4 µs chỉ để tìm một mức giá** |
| **Skip list** | O(log n) kỳ vọng | O(log n) | O(log n) | Cùng vấn đề cache, cộng thêm bất định về thời gian (ngẫu nhiên) — phá vỡ tính xác định độ trễ |
| **Hash map giá → mức giá** | O(1) | **O(n)** — phải quét tìm giá tốt nhất | O(1) | Không duyệt được theo thứ tự giá |
| **✅ Mảng chỉ số theo giá + danh sách liên kết đôi** | **O(1)** | **O(1)** | **O(1)** | Tốn RAM cho dải giá; cần xử lý giá ngoài dải |

Hai lý do bác bỏ cây/heap, và lý do thứ hai mới là lý do thật:

**Lý do 1 — độ phức tạp tiệm cận sai chỗ.** Thao tác nóng nhất (huỷ) tệ nhất ở heap.

**Lý do 2 — mechanical sympathy: O(log n) với cache miss chậm hơn O(n) tuần tự.** Một lần đọc RAM khi trượt cache tốn ~80–100 ns; một lần đọc trúng L1 tốn ~1 ns. Cây đỏ-đen phân bổ node rải rác khắp heap, nên mỗi bước xuống cây gần như chắc chắn trượt cache. Trong khi đó, một mảng liên tục được **bộ tiền nạp phần cứng (hardware prefetcher)** đoán trước và kéo vào cache — duyệt 64 phần tử liên tiếp trong mảng có thể **rẻ hơn** 4 bước xuống cây.

> ⚠️ Đây là chỗ mà kiến thức thuật toán "sách giáo khoa" phản bội bạn. Ký hiệu O lớn giả định mọi phép truy cập bộ nhớ có chi phí như nhau. Trên CPU thật, tỉ lệ chi phí giữa "trúng L1" và "trượt xuống RAM" là khoảng **1:100**. Ở quy mô micro-giây, **hằng số quan trọng hơn bậc tiệm cận**. Nếu bạn nêu được đúng ý này trong phỏng vấn, bạn đã tách khỏi 90% ứng viên.

### 6.3 Cấu trúc dữ liệu được chọn

```
  ORDER BOOK của một mã (ví dụ AAPL)
  ══════════════════════════════════

  A. MẢNG MỨC GIÁ (price level array) — chỉ số hoá trực tiếp theo giá
     idx = (price_ticks - min_price_ticks)
     Ví dụ AAPL dải hợp lệ 50.0000–200.0000, tick 0.0001
     → 1.500.000 ô... quá nhiều. Thu hẹp: chỉ giữ dải ±20% quanh giá
       tham chiếu → ~30.000 ô mỗi bên. 30.000 × 32 B = 960 KB/mã. OK.

     PriceLevel[]  (mảng LIÊN TỤC trong bộ nhớ — prefetcher yêu thích)
     ┌────────────┬────────────┬────────────┬────────────┐
     │ idx 10003  │ idx 10004  │ idx 10005  │ idx 10006  │
     │ 100.03     │ 100.04     │ 100.05     │ 100.06     │
     │ total: 200 │ total: 0   │ total: 300 │ total: 800 │
     │ head,tail  │ head=null  │ head,tail  │ head,tail  │
     └─────┬──────┴────────────┴─────┬──────┴─────┬──────┘
           │                         │            │
  B. DANH SÁCH LIÊN KẾT ĐÔI các lệnh trong CÙNG một mức giá,
     xếp theo THỨ TỰ THỜI GIAN ĐẾN (FIFO):
           │                         │            │
           ▼                         ▼            ▼
     ┌──────────┐              ┌──────────┐  ┌──────────┐
     │ord#A 150 │              │ord#D 100 │  │ord#F 500 │ ← đến trước
     │ t=09:31  │              │ t=09:30  │  │ t=09:29  │
     └────┬─────┘              └────┬─────┘  └────┬─────┘
          │ next / prev             │             │
     ┌────▼─────┐              ┌────▼─────┐  ┌────▼─────┐
     │ord#B  50 │              │ord#E 200 │  │ord#G 300 │ ← đến sau
     │ t=09:33  │              │ t=09:32  │  │ t=09:35  │
     └──────────┘              └──────────┘  └──────────┘

  C. CON TRỎ NHANH
     bestBid = &PriceLevel[10003]     ← cập nhật khi mức cạn/mới sinh
     bestAsk = &PriceLevel[10005]

  D. BẢNG TRA LỆNH  orderMap: order_id (u64) → Order*
     Đây là thứ biến HUỶ LỆNH thành O(1).
```

Pseudo-code cho cấu trúc:

```java
// Mỗi Order vừa đúng một cache line (64 B) — cố ý
final class Order {
    long  orderId;      //  8
    int   clientId;     //  4
    int   symbolId;     //  4
    long  price;        //  8  (số nguyên, đã nhân 10^4)
    long  quantity;     //  8
    long  filledQty;    //  8
    long  seqId;        //  8  ← thời điểm logic, dùng cho time priority
    Order prev, next;   // 8+8 (trong C++ là con trỏ vào mảng đối tượng cấp sẵn)
}                       // = 64 B

final class PriceLevel {
    long  price;
    long  totalVolume;  // duy trì tăng dần → L2 lấy được O(1)
    int   orderCount;
    Order head, tail;   // FIFO: khớp ở head, thêm ở tail
}

final class Book {
    PriceLevel[] levels;   // mảng liên tục, chỉ số hoá theo giá
    int bestIdx;           // chỉ số của mức giá tốt nhất còn hàng
}

final class OrderBook {
    int symbolId;
    Book bids;             // bestIdx giảm dần khi cạn
    Book asks;             // bestIdx tăng dần khi cạn
    LongToObjectMap<Order> orderMap;   // hash mở, cấp sẵn, không rehash
}
```

Ba chi tiết nhỏ nhưng là dấu hiệu của người đã làm thật:

- **`Order` vừa 64 byte = đúng một cache line.** Đọc một lệnh = đúng một lần nạp cache. Không lệnh nào bị "chia đôi" giữa hai cache line (điều gây ra hai lần nạp).
- **`totalVolume` được duy trì tăng dần** mỗi lần thêm/bớt, thay vì cộng lại khi cần. Biến truy vấn L2 từ O(số lệnh) thành O(1).
- **`orderMap` cấp phát sẵn, không bao giờ rehash.** Một lần rehash giữa phiên giao dịch là một cú giật hàng chục ms — tức là một sự cố.

### 6.4 Thuật toán khớp: price-time priority (FIFO) — ví dụ có số

Quy tắc chỉ gồm hai dòng, nhưng phải phát biểu chính xác:

1. **Ưu tiên giá (price priority)**: lệnh mua giá cao hơn được phục vụ trước; lệnh bán giá thấp hơn được phục vụ trước.
2. **Ưu tiên thời gian (time priority)**: trong **cùng một mức giá**, lệnh đến trước được khớp trước — FIFO thuần.

Xuất phát từ sổ lệnh AAPL sau (mỗi mức giá liệt kê từng lệnh theo thứ tự đến):

```
            BIDS (bên mua)                │            ASKS (bên bán)
  Giá     KL    Các lệnh (theo t đến)     │  Giá     KL    Các lệnh (theo t đến)
 ─────────────────────────────────────────┼──────────────────────────────────────
 100.03   200   #B1 120 (t1) #B2 80 (t4)  │ 100.05   300   #S1 300 (t2)
 100.02   500   #B3 500 (t3)              │ 100.06   800   #S2 500 (t5) #S3 300 (t7)
 100.01   900   #B4 400(t6) #B5 500(t8)   │ 100.07   400   #S4 400 (t9)

  best bid = 100.03      best ask = 100.05      spread = 0.02
```

**Sự kiện 1 — đến một lệnh MUA GIỚI HẠN: BUY 600 @ 100.06.**

Engine so `100.06` với `bestAsk = 100.05`. Vì `100.06 ≥ 100.05`, lệnh này **khớp được ngay**. Bắt đầu quét bên ask từ mức giá tốt nhất đi lên:

```
 Bước 1: mức 100.05, head = #S1 (300 cổ)
         khớp min(600, 300) = 300 cổ @ GIÁ 100.05
         → sinh 2 fill: mua #newOrder 300@100.05, bán #S1 300@100.05
         → #S1 hết hàng, gỡ khỏi list, mức 100.05 rỗng → bestAsk nhảy lên 100.06
         → còn phải mua 300

 Bước 2: mức 100.06, head = #S2 (500 cổ, đến lúc t5)  ← TIME PRIORITY ở đây
         khớp min(300, 500) = 300 cổ @ GIÁ 100.06
         → 2 fill nữa
         → #S2 còn lại 200, VẪN Ở ĐẦU HÀNG (giữ nguyên vị trí thời gian)
         → #S3 KHÔNG được khớp chút nào, dù nó cùng giá — vì đến sau

 Lệnh mới đã khớp đủ 600 → không còn gì để đưa vào sổ.
```

Ba điểm phải nói rõ khi trình bày, vì mỗi điểm là một câu hỏi phụ điển hình:

- **Giá khớp là giá của lệnh nằm sẵn trong sổ (resting order), không phải giá của lệnh mới đến.** Người mua đặt 100.06 nhưng được khớp 300 cổ ở 100.05 — tức là **được giá tốt hơn mình yêu cầu (price improvement)**. Quy tắc: lệnh đến sau là bên "chủ động" (aggressor/taker) và phải chấp nhận giá của bên "thụ động" (passive/maker). Điều này bảo vệ người đã chờ trong hàng và khuyến khích cung cấp thanh khoản.
- **Khớp một phần không làm mất chỗ trong hàng.** `#S2` khớp 300/500 nhưng phần còn lại 200 vẫn ở đầu hàng. Nếu bạn gỡ nó ra rồi chèn lại, bạn đã cướp mất ưu tiên thời gian của nó — một lỗi nghiêm trọng về công bằng.
- **Một sự kiện khớp sinh ra ĐÚNG hai fill**, cùng `seq_id`, cùng giá, cùng khối lượng. Chúng phải được phát ra như một cặp nguyên tử.

Sổ lệnh sau sự kiện 1:

```
            BIDS                          │            ASKS
 100.03   200   #B1 120 #B2 80            │ 100.06   500   #S2 200 (t5) #S3 300 (t7)
 100.02   500   #B3 500                   │ 100.07   400   #S4 400 (t9)
 100.01   900   #B4 400 #B5 500           │
  best bid = 100.03   best ask = 100.06   spread NỚI RỘNG từ 0.02 → 0.03
```

Chi tiết cuối cùng này rất đáng nêu ra: **lệnh lớn ăn hết thanh khoản làm spread nới rộng và đẩy giá lên**. Đó chính là *market impact* — lý do các quỹ lớn phải chẻ nhỏ lệnh, và lý do có lệnh iceberg.

**Sự kiện 2 — đến một lệnh THỊ TRƯỜNG: SELL 1000 (market).**

Lệnh thị trường không có giá, nên nó quét bên bids từ tốt nhất xuống, ăn bao nhiêu cũng được:

```
 100.03: #B1 120 → khớp 120 @ 100.03
         #B2  80 → khớp  80 @ 100.03       (cộng dồn 200)
 100.02: #B3 500 → khớp 500 @ 100.02       (cộng dồn 700)
 100.01: #B4 400 → khớp 300 @ 100.01       (cộng dồn 1000) — #B4 còn 100
 → HẾT 1000. Giá khớp trung bình = (200×100.03 + 500×100.02 + 300×100.01)/1000
                                  = 100.019  → TRƯỢT GIÁ (slippage) so với 100.03
 → best bid tụt từ 100.03 xuống 100.01. Ba mức giá bị xoá sổ trong một sự kiện.
```

> ⚠️ **Vì sao lệnh thị trường nguy hiểm về mặt hệ thống**: nếu sổ lệnh mỏng, một lệnh thị trường đủ lớn có thể quét sạch hàng chục mức giá và khiến giá nhảy vài phần trăm trong vài micro-giây. Đây chính là cơ chế đã gây ra "Flash Crash" ngày 6/5/2010. Phòng thủ có hai lớp: **giới hạn dải giá cho lệnh thị trường** (biến nó ngầm thành lệnh giới hạn với giá trần/sàn rộng) và **circuit breaker** (§15).

### 6.5 Độ phức tạp và ngân sách thời gian thực tế

| Thao tác | Độ phức tạp | Thời gian thực đo được |
|---|---|---|
| Thêm lệnh giới hạn không khớp | O(1) | ~150–400 ns |
| Huỷ lệnh theo id | O(1) | ~100–250 ns |
| Khớp với 1 lệnh đối ứng | O(1) | ~200–500 ns |
| Khớp quét k mức giá | O(k) | k × ~300 ns |
| Đọc best bid/ask | O(1) | ~5 ns (trúng L1) |
| Dựng ảnh chụp L2 depth 10 | O(10) | ~200 ns |

Tổng ngân sách nhân engine: **dưới 1 µs cho một lệnh điển hình**. Phần còn lại của 100 µs wire-to-wire bị tiêu ở: card mạng và ngăn xếp mạng (~10–30 µs nếu kernel bypass, ~50–80 µs nếu không), giải mã và kiểm tra rủi ro (~5–15 µs), sequencer (~1–3 µs), và mã hoá phản hồi + gửi đi (~10–30 µs).

> 💡 Nhận xét quan trọng: **matching engine không phải phần chậm nhất.** Người mới thường dồn hết công tối ưu vào thuật toán khớp, trong khi 90% ngân sách bị tiêu ở mạng và tuần tự hoá. Biết đâu là chỗ tốn thời gian thật — và nói ra điều đó — quan trọng hơn việc tối ưu đúng.

---

## 7. Vì sao matching engine là ĐƠN LUỒNG — và đó là lựa chọn, không phải hạn chế

Đây là chi tiết gây ngạc nhiên nhất của bài, và cũng là chi tiết bị hiểu sai nhiều nhất. Phản xạ tự nhiên là: "215.000 lệnh/giây thì phải chạy song song chứ?" Câu trả lời là **không**, và có bốn lý do độc lập, mỗi lý do đủ để tự nó quyết định.

**Lý do 1 — thứ tự toàn cục là yêu cầu nghiệp vụ, không phải chi tiết kỹ thuật.** Price-time priority *định nghĩa* sự công bằng bằng một thứ tự toàn phần trên các lệnh. Xử lý song song nghĩa là có nhiều thứ tự có thể xảy ra. Để khôi phục thứ tự duy nhất ấy, bạn phải... tuần tự hoá lại — tức là trả lại toàn bộ lợi ích song song, cộng thêm chi phí đồng bộ. **Bạn không thể song song hoá một thứ mà bản chất của nó là thứ tự.**

**Lý do 2 — khoá đắt hơn công việc.** Một lần tranh chấp khoá (lock contention) không giành được tốn từ vài trăm ns tới vài µs (nếu phải vào kernel để ngủ). Công việc thật của một lệnh chỉ khoảng 300 ns. **Chi phí đồng bộ lớn hơn chính công việc được đồng bộ.** Trong trường hợp này, chạy song song không chỉ vô ích — nó **chậm hơn**.

**Lý do 3 — tính xác định.** Với một luồng, cùng chuỗi đầu vào luôn cho cùng chuỗi đầu ra. Với nhiều luồng, thứ tự phụ thuộc vào bộ lập lịch của hệ điều hành, tải máy, nhiệt độ CPU. Mất tính xác định là mất: khả năng có bản sao nóng chạy song song và cho kết quả giống hệt (§10); khả năng phát lại lịch sử để tái hiện lỗi (§9); khả năng chứng minh với cơ quan quản lý rằng sàn đã xử lý công bằng. **Tính xác định là tài sản đắt giá nhất của hệ này, và đa luồng bán nó đi để mua một thứ ta không cần.**

**Lý do 4 — số học đơn giản nói rằng một luồng là quá đủ.** 215.000 lệnh/s × 300 ns = **0,065 giây công việc mỗi giây**, tức khoảng **6,5% của một core**. Ngay cả ở micro-burst 1 triệu lệnh/s, một core vẫn xử lý kịp trong 0,3 giây/giây. Vấn đề không bao giờ là thiếu CPU.

Vậy làm gì với 63 core còn lại của máy? Chúng chạy những thứ *khác*: gateway, giải mã, sequencer, market data publisher, reporter, giám sát. **Song song hoá tồn tại — nhưng theo trục "khác việc" (pipeline), không theo trục "cùng việc" (data parallel).**

### 7.1 Ghim CPU (pinning) và vì sao phải đuổi hết mọi thứ khác ra

Chỉ đơn luồng thôi chưa đủ. Luồng đó phải được **ghim vào một core vật lý cụ thể** và core đó phải được **cách ly khỏi hệ điều hành**:

```bash
# 1. Cách ly core khỏi bộ lập lịch Linux (tham số khởi động kernel)
isolcpus=2-15 nohz_full=2-15 rcu_nocbs=2-15 intel_idle.max_cstate=0 idle=poll

# 2. Đẩy mọi ngắt phần cứng sang các core KHÔNG cách ly
echo 3 > /proc/irq/<irq>/smp_affinity

# 3. Ghim tiến trình và đặt độ ưu tiên thời gian thực
taskset -c 4 chrt -f 90 ./matching_engine

# 4. Tắt tiết kiệm điện & turbo boost (turbo gây tần số KHÔNG ổn định)
cpupower frequency-set -g performance
# 5. Dùng huge page 1 GB để giảm số lần trượt TLB
```

Từng dòng mua một thứ cụ thể:

| Kỹ thuật | Ngăn chặn điều gì | Lợi ích ở đuôi |
|---|---|---|
| `isolcpus` | Bộ lập lịch đặt tiến trình khác lên core này | Xoá các cú giật 1–10 ms |
| `nohz_full` | Ngắt định thời (timer tick) 100–1000 Hz | Xoá giật vài µs đều đặn |
| Chuyển hướng IRQ | Ngắt card mạng/đĩa làm gián đoạn engine | Xoá giật 5–50 µs bất chợt |
| `chrt -f` (SCHED_FIFO) | Bị tước quyền chạy | Đảm bảo chạy tới khi tự nhường |
| Tắt C-state | CPU ngủ rồi phải đánh thức (tốn tới 100 µs) | Xoá giật lớn khi tải thấp |
| **Tắt turbo** | Tần số dao động theo nhiệt | Đổi **tốc độ trung bình** lấy **tính ổn định** |
| Huge page | Trượt TLB khi vùng nhớ lớn | Giảm vài trăm ns/lần truy cập rải rác |

> 💡 **Nguyên tắc gói gọn cả §7**: bạn không tối ưu độ trễ bằng cách làm code chạy nhanh hơn — code đã đủ nhanh từ lâu. Bạn tối ưu bằng cách **loại bỏ mọi thứ có thể làm gián đoạn nó**. Kẻ thù không phải là công việc, mà là **sự ngắt quãng**: bộ lập lịch, ngắt, gom rác, trượt trang, chuyển ngữ cảnh, di chuyển giữa các core. Đây là sự đảo ngược tư duy quan trọng nhất mà bài này dạy.

### 7.2 Toàn bộ trạng thái trong RAM — và vì sao điều đó an toàn

"Không ghi database" nghe như liều lĩnh. Nó không liều, vì độ bền được mua ở **một chỗ khác**: nhật ký sự kiện của sequencer (§8, §9). Matching engine chỉ là một **hàm thuần khiết**:

```
  trạng_thái_mới, các_fill  =  f( trạng_thái_cũ, sự_kiện )
```

Nếu mọi `sự_kiện` được lưu bền theo đúng thứ tự, thì `trạng_thái` **không cần lưu** — nó luôn dựng lại được bằng cách phát lại. Đây chính là event sourcing, và ở đây nó không phải một mẫu thiết kế thời thượng mà là **điều kiện tiên quyết** để engine được phép sống hoàn toàn trong RAM.

---

## 8. Sequencer — điểm nối của tất cả

Sequencer là thành phần dễ bị đánh giá thấp nhất trong sơ đồ: nó chỉ gán một số tăng dần. Nhưng con số đó là thứ nối mọi tính chất của hệ lại với nhau.

```
   gateway 1 ──┐
   gateway 2 ──┤                 ┌────────────────────────┐
   gateway 3 ──┼──▶ hàng đợi ──▶ │      SEQUENCER         │
   order mgr ──┤    đến (SPSC     │ NGƯỜI VIẾT DUY NHẤT   │
   cancel   ──┘    mỗi nguồn)     │ seq = ++counter        │
                                  │ ghi vào ring buffer    │
                                  │ trong /dev/shm         │
                                  └───────────┬────────────┘
                                              │ dòng đã đánh số, BẤT BIẾN
             ┌────────────────┬───────────────┼────────────────┐
             ▼                ▼               ▼                ▼
      matching engine   market data      reporter        replica (hot)
        (seq 1..N)       publisher      (chậm hơn)      (áp dụng cùng seq)
```

Một `seq_id` duy nhất, tăng đơn điệu, gán cho **mọi** sự kiện — cả đầu vào (lệnh mới, huỷ) lẫn đầu ra (fill). Từ một việc nhỏ đó ta thu được **năm** thứ:

| Thu được | Cơ chế |
|---|---|
| **Công bằng** | `seq_id` *chính là* thời điểm logic cho ưu tiên thời gian. Không dùng đồng hồ treo tường — đồng hồ giữa các máy lệch nhau hàng chục µs, và có thể chạy lùi khi NTP hiệu chỉnh |
| **Tính xác định** | Mọi bản sao áp dụng cùng chuỗi seq → ra cùng trạng thái. Không cần đồng thuận giữa chúng |
| **Phát lại & phục hồi** | Nhật ký seq là nguồn sự thật duy nhất. Khởi động lại = phát lại từ ảnh chụp gần nhất |
| **Đúng-một-lần** | Người tiêu thụ nhớ "đã xử lý tới seq X"; thấy seq ≤ X thì bỏ qua. Chống trùng khi gửi lại |
| **Phát hiện mất gói** | Người nhận thấy nhảy từ 1002 sang 1004 thì biết mất 1003 và đi xin lại (§13) |

**Vì sao không dùng Kafka làm sequencer?** Về khái niệm Kafka chính là thứ này: một log có thứ tự, bền vững, nhiều người đọc. Nhưng:

| | Kafka | Sequencer tự viết |
|---|---|---|
| Độ trễ ghi→đọc | 2–10 ms (tốt nhất ~1 ms) | **0,2–1 µs** |
| Độ bền | Ghi đĩa + nhân bản | Ghi vào `/dev/shm` + nhân bản qua UDP tin cậy |
| Thứ tự toàn cục | Chỉ trong một partition | Toàn cục theo thiết kế |
| Vận hành | Được quản lý, đã kiểm nghiệm | Tự viết, tự chịu |

Chênh lệch **1000×** về độ trễ là lý do duy nhất cần nêu. Kafka giải đúng bài toán nhưng ở sai thang thời gian. Trong phỏng vấn, hãy nói thẳng: *"Về mặt khái niệm sequencer của tôi chính là một Kafka partition đơn. Tôi tự hiện thực nó vì tôi cần độ trễ micro-giây chứ không phải mili-giây — nhưng tôi vẫn dùng Kafka ở **hạ nguồn**, cho reporter và các hệ phân tích, nơi vài ms là hoàn toàn chấp nhận được."* Câu này cho thấy bạn không bài xích công cụ, bạn chỉ đặt nó đúng chỗ.

> ⚠️ Sequencer là **điểm đơn lỗi (SPOF) theo thiết kế** — nó bắt buộc phải là người viết duy nhất, nếu không thì không còn thứ tự toàn cục. Đừng cố "làm cho nó HA bằng cách chạy hai cái". Cách đúng là: một cái hoạt động, một cái chờ nóng, và **failover bằng bầu cử leader** (§10). Chấp nhận SPOF rồi bảo vệ nó kỹ càng là lựa chọn đúng ở đây.

---

## 9. Event sourcing và phát lại xác định (deterministic replay)

### 9.1 Ý tưởng

Thay vì lưu **trạng thái hiện tại** ("lệnh #123 còn 200 cổ chưa khớp"), ta lưu **chuỗi biến đổi trạng thái bất biến** ("seq 1001: nhận lệnh #123 mua 500", "seq 1004: #123 khớp 300"). Trạng thái là *kết quả gấp lại (fold)* của chuỗi sự kiện.

```
   TRUYỀN THỐNG                    │  EVENT SOURCING
   ─────────────────────────────── │ ────────────────────────────────────
   orders                          │  events (CHỈ THÊM, không bao giờ sửa)
   ┌────┬──────┬─────┬──────────┐  │  ┌──────┬─────────────┬──────────────┐
   │ id │ qty  │ fill│ status   │  │  │ seq  │ type        │ payload      │
   ├────┼──────┼─────┼──────────┤  │  ├──────┼─────────────┼──────────────┤
   │123 │ 500  │ 300 │ PARTIAL  │  │  │ 1001 │ OrderPlaced │ #123 buy 500 │
   └────┴──────┴─────┴──────────┘  │  │ 1004 │ OrderFilled │ #123 qty 300 │
   ↑ UPDATE tại chỗ → MẤT lịch sử  │  │ 1009 │ OrderFilled │ #123 qty 100 │
                                   │  └──────┴─────────────┴──────────────┘
                                   │  trạng thái = fold(events)  → PARTIAL 400
```

### 9.2 Vì sao bài này gần như *bắt buộc* dùng event sourcing

Ở các bài trước, event sourcing là một lựa chọn kiến trúc. Ở đây nó là hệ quả tất yếu của bốn ràng buộc đã nêu ở mở bài:

- **Cho phép engine sống trong RAM.** Trạng thái không cần bền vì nhật ký đã bền.
- **Là bản ghi kiểm toán bất biến.** Cơ quan quản lý hỏi "lệnh này được xử lý thế nào lúc 10:31:47.002913?" — bạn phát lại và cho họ xem chính xác, chứ không suy đoán từ trạng thái cuối.
- **Là cơ chế nhân bản.** Bản sao nóng không cần đồng bộ trạng thái; nó chỉ cần cùng nhật ký (§10).
- **Là công cụ kiểm thử mạnh nhất mà bạn có.** Lấy nhật ký của một ngày giao dịch thật, phát lại qua phiên bản engine mới, so từng fill với ngày hôm đó. Nếu khác một byte, bạn đã đổi hành vi. Không một bộ unit test nào cho được mức bảo đảm ấy.

### 9.3 Điều kiện để phát lại thật sự xác định

Phát lại chỉ có giá trị nếu nó cho **kết quả y hệt**. Điều đó đòi kỷ luật trong code:

| Cấm | Vì sao | Thay bằng |
|---|---|---|
| `System.currentTimeMillis()` trong logic khớp | Mỗi lần chạy cho số khác | Lấy timestamp **từ sự kiện**, do sequencer đóng dấu |
| Số ngẫu nhiên | Hiển nhiên | Seed từ sự kiện, hoặc bỏ hẳn |
| Duyệt `HashMap` theo thứ tự lặp | Thứ tự phụ thuộc hash/nền tảng | Cấu trúc có thứ tự xác định |
| Số dấu phẩy động cho giá/tiền | Làm tròn khác nhau giữa nền tảng | **Số nguyên tỉ lệ** (đã chốt ở §4.1) |
| Đa luồng trong logic khớp | Thứ tự do OS quyết | Đơn luồng (§7) |
| Gọi ra ngoài (HTTP, DB) từ engine | Không phát lại được | Đưa kết quả **vào** làm một sự kiện |

> 💡 **Nguyên tắc**: *matching engine phải là một hàm thuần khiết của dòng sự kiện.* Mọi thứ không xác định — thời gian, ngẫu nhiên, mạng, cấu hình — phải được **thực thể hoá thành sự kiện** trước khi chạm tới engine. Ngay cả việc "thị trường mở cửa" cũng là một sự kiện có `seq_id`, không phải một phép so sánh với đồng hồ.

### 9.4 Ảnh chụp (snapshot) — vì replay từ đầu là không đủ nhanh

Phát lại 1 tỉ sự kiện mất hàng giờ, trong khi RTO là vài chục mili-giây. Nên: **ảnh chụp định kỳ + phát lại phần đuôi**.

```
  09:30:00  ─── bắt đầu phiên, sổ lệnh rỗng
  09:30:00  snapshot#0  (trạng thái rỗng, seq=0)
     │  ... 40 triệu sự kiện ...
  10:00:00  snapshot#1  (seq=40.000.000)   ← ghi bởi một TIẾN TRÌNH KHÁC
     │  ... sự kiện tiếp ...                  đọc nhật ký, KHÔNG đụng engine
  10:07:13  💥 SỰ CỐ tại seq=49.812.004

  PHỤC HỒI: nạp snapshot#1 (~500 MB, đọc tuần tự NVMe ≈ 0,2 s)
            + phát lại 9.812.004 sự kiện × ~300 ns ≈ 2,9 s
            → tổng ~3 s để dựng lại trạng thái từ số không
```

Ba giây vẫn quá chậm để chấp nhận downtime, nên phục hồi từ snapshot **không phải** cơ chế HA chính — nó là mạng lưới an toàn cuối cùng. Cơ chế chính là bản sao nóng đã sẵn trạng thái (§10). Hai chi tiết quan trọng:

- **Snapshot do tiến trình khác chụp**, bằng cách tự nó phát lại nhật ký một cách độc lập. Engine trên đường nóng **không bao giờ được dừng lại để chụp ảnh** — nếu bạn bắt nó tuần tự hoá 500 MB, bạn đã tạo một cú giật hàng trăm mili-giây định kỳ.
- **Snapshot phải ghi kèm `seq_id`** của sự kiện cuối cùng đã áp dụng. Không có con số đó thì không biết phát lại từ đâu, và ảnh chụp trở nên vô dụng.

---

## 10. High availability cho một engine đơn luồng

Nghịch lý cần giải: ta vừa dồn mọi thứ vào **một luồng trên một máy**, mà lại yêu cầu 99,99% và không được mất dữ liệu. Lời giải không phải chia nhỏ ra — mà là **nhân bản máy trạng thái (state machine replication)**.

### 10.1 Nguyên lý

Vì engine là hàm thuần khiết của dòng sự kiện (§9.3), hai máy nhận **cùng dòng sự kiện theo cùng thứ tự** sẽ có **trạng thái giống hệt nhau tại mọi thời điểm** — mà không cần trao đổi trạng thái với nhau, không cần đồng thuận, không cần khoá phân tán.

```
                   SEQUENCER (leader) ── dòng sự kiện đã đánh số ──┐
                          │                                        │
        ┌─────────────────┼────────────────────┐                   │
        ▼                 ▼                    ▼                   │
   ┌──────────┐     ┌──────────┐        ┌──────────┐               │
   │ ENGINE A │     │ ENGINE B │        │ ENGINE C │               │
   │ PRIMARY  │     │  HOT     │        │  WARM    │               │
   │          │     │ (máy #2) │        │ (DC khác)│               │
   │ áp dụng  │     │ áp dụng  │        │ áp dụng  │               │
   │ + PHÁT   │     │ KHÔNG    │        │ KHÔNG    │               │
   │   fill   │     │  phát    │        │  phát    │               │
   └──────────┘     └──────────┘        └──────────┘               │
        ▲                 ▲                   ▲                    │
        └──── UDP multicast tin cậy ──────────┴────────────────────┘

   TẤT CẢ đều XỬ LÝ. Chỉ leader được PHÁT RA NGOÀI.
   Chuyển đổi dự phòng = đổi xem AI ĐƯỢC PHÁT. Không cần chép trạng thái.
```

Ý tưởng cốt lõi, và là câu đáng nói nhất của cả mục: **failover không phải là hành động khôi phục, nó chỉ là hành động cấp quyền phát ngôn.** Bản sao đã có sẵn trạng thái đúng từ trước — nó chỉ đang bị bịt miệng. Nhờ vậy thời gian chuyển đổi không phụ thuộc kích thước trạng thái, và có thể nằm trong **vài mili-giây**.

### 10.2 Hot-hot và hot-warm

| | **Hot-hot** | **Hot-warm** |
|---|---|---|
| Bản sao làm gì | Xử lý mọi sự kiện theo thời gian thực, giữ trạng thái đầy đủ, chỉ không phát ra ngoài | Xử lý chậm hơn, hoặc chỉ nhận nhật ký và áp dụng định kỳ / theo snapshot |
| Thời gian failover | **Vài ms** | Vài trăm ms tới vài giây |
| Chi phí | Gấp đôi phần cứng đường nóng | Rẻ hơn |
| Rủi ro | **Lỗi tất định lan sang cả hai** — cùng input, cùng bug, cùng sập | Có chút thời gian để con người can thiệp |
| Dùng ở đâu | Trong cùng DC, cho matching engine và sequencer | DC/AZ khác, cho thảm hoạ |

Thực tế các sàn dùng **cả hai**: hot-hot trong cùng datacenter (cùng phòng, cùng switch) để chịu lỗi phần cứng đơn lẻ, và hot-warm ở một datacenter khác thành phố cho thảm hoạ vùng. Warm ở xa vì một lý do vật lý không thể lách: 100 km sợi quang là ~0,5 ms một chiều — quá đắt cho nhân bản đồng bộ trên đường nóng.

> ⚠️ **Bẫy lớn nhất của hot-hot**: nó bảo vệ bạn khỏi *hỏng phần cứng*, nhưng **không** bảo vệ khỏi *lỗi phần mềm*. Chính tính xác định mà bạn dày công xây dựng đảm bảo rằng một lệnh gây tràn số sẽ làm sập **cả ba** bản sao ở đúng cùng một `seq_id`. Vì thế cần thêm hai lớp khác nhau về bản chất: (1) **kiểm tra đầu vào cực kỳ nghiêm ngặt ở gateway** — chặn dữ liệu độc trước khi nó chạm vào bất kỳ bản sao nào; (2) **một bản sao chạy phiên bản phần mềm cũ hơn một nhịp** (kiểu "canary ngược"), để lỗi mới không thể xoá sổ toàn bộ đội hình.

### 10.3 Phát hiện lỗi và bầu chọn leader

```
  Nhịp tim (heartbeat) mỗi 1 ms qua mạng riêng biệt (KHÔNG dùng chung
  đường với dữ liệu — nếu không, nghẽn dữ liệu sẽ bị hiểu nhầm là chết)

  Mất 3 nhịp liên tiếp (3 ms) → nghi ngờ leader chết
  → bầu leader mới bằng Raft trong nhóm bản sao
  → leader mới kiểm tra: "tôi đã áp dụng tới seq nào?"
  → bản sao nào có seq CAO NHẤT thắng (không được mất sự kiện đã nhận)
  → leader mới bắt đầu phát fill từ seq kế tiếp
  → Tổng thời gian: 5–20 ms
```

Hai vấn đề bắt buộc phải nêu ra, vì chúng là chỗ mọi thiết kế HA gãy:

- **Split-brain.** Nếu A bị cô lập mạng nhưng vẫn sống, và B tự lên làm leader, sẽ có **hai** engine cùng phát fill — thảm hoạ tài chính thật sự (một lệnh khớp hai lần). Phòng thủ: đa số phiếu (quorum) theo Raft — leader phải được quá bán bản sao đồng ý, nên trong một cụm 3 máy không thể có hai leader cùng lúc. Cộng thêm **cơ chế vây hãm (fencing)**: mỗi nhiệm kỳ leader có một số hiệu tăng dần, và người nhận hạ nguồn từ chối mọi gói mang số hiệu nhiệm kỳ cũ.
- **Trùng lặp khi chuyển đổi.** Leader cũ có thể đã phát fill seq 5000 trước khi chết, leader mới không biết và phát lại. Phòng thủ: người nhận hạ nguồn khử trùng lặp theo `seq_id` — đây chính là lý do §8 nói `seq_id` cho ta "đúng-một-lần".

> 💡 **Nguyên tắc**: trong một hệ tuần tự hoá hoàn hảo, HA rẻ một cách bất ngờ, vì trạng thái là **hệ quả suy ra được** chứ không phải thứ phải chuyển giao. So sánh với bài KV Store: ở đó ta phải vất vả với vector clock, đọc/ghi quorum, anti-entropy — vì các bản ghi độc lập và không có thứ tự toàn cục. Thứ tự toàn cục **đắt ở đường nóng, nhưng làm cho mọi thứ khác rẻ đi**. Đó là một đánh đổi lớn, và bài này chọn trả trước.

---

## 11. Tối ưu độ trễ ở mức thấp — phần đặc sắc của bài

Đây là phần khiến bài này không giống bất kỳ bài nào khác. Ở 29 bài trước, "tối ưu" nghĩa là thêm cache, thêm index, đổi thuật toán. Ở đây, tối ưu nghĩa là **hiểu CPU và card mạng thật sự làm gì** rồi viết code thuận theo phần cứng. Ngành gọi tinh thần này là **mechanical sympathy** — mượn từ tay đua Jackie Stewart: *"bạn không cần là kỹ sư mới lái nhanh, nhưng bạn phải có sự đồng cảm cơ khí với cỗ máy."*

### 11.1 Bảng thang thời gian — hãy thuộc lòng

Mọi quyết định trong mục này đều suy ra từ bảng này:

| Thao tác | Thời gian | So sánh tương đối |
|---|---|---|
| 1 chu kỳ CPU (3 GHz) | 0,3 ns | 1 |
| Trúng cache L1 | ~1 ns | 3 |
| Trúng cache L2 | ~4 ns | 13 |
| Trúng cache L3 (chung giữa các core) | ~15–40 ns | 100 |
| **Trượt cache → RAM cùng NUMA node** | **~80 ns** | **270** |
| **RAM khác NUMA node** | **~130 ns** | **430** |
| Dự đoán nhánh sai | ~15–20 ns | 60 |
| Chuyển ngữ cảnh (context switch) | 1–5 µs | **~10.000** |
| Syscall (`read`/`write` socket) | 0,5–2 µs | ~3.000 |
| Gửi/nhận gói TCP qua kernel, trong DC | 20–50 µs | ~100.000 |
| **Cùng vậy nhưng kernel bypass** | **3–10 µs** | ~20.000 |
| `fsync()` xuống NVMe | 50–500 µs | ~1.000.000 |
| Một cú GC "stop-the-world" của JVM | 1–100 **ms** | ~300.000.000 |
| Ánh sáng đi 100 m trong sợi quang | ~0,5 µs | 1.600 |

Ba điều rút ra ngay: **syscall đắt gấp 10.000 lần một phép tính**; **GC đắt gấp 300 triệu lần**; và **khoảng cách vật lý là có thật** — 100 mét cáp là nửa micro-giây bạn không bao giờ lấy lại được.

### 11.2 Cache line và chia sẻ giả (false sharing)

CPU không đọc từng byte — nó đọc từng **cache line 64 byte**. Điều này sinh ra một loại lỗi hiệu năng vô hình trong code:

```
  ❌ FALSE SHARING — hai biến KHÔNG liên quan nằm chung một cache line

  class RingBuffer {
      volatile long writeCursor;   // offset 0   ┐
      volatile long readCursor;    // offset 8   ┘ CÙNG cache line 64 B!
  }

  Core 1 ghi writeCursor  → cache line bị đánh dấu "dirty",
                             BẮT BUỘC vô hiệu hoá bản sao ở Core 2
  Core 2 đọc readCursor   → dù nó KHÔNG hề đụng writeCursor,
                             vẫn phải nạp lại cache line từ L3/RAM (~40–80 ns)

  Hai core "đánh nhau" qua giao thức nhất quán cache dù chẳng chia sẻ dữ liệu gì.
  Hậu quả thực đo: chậm đi 5–10 LẦN.

  ✅ CHÈN ĐỆM (padding) — đẩy mỗi biến sang cache line riêng

  class RingBuffer {
      long p1,p2,p3,p4,p5,p6,p7;     // 56 B đệm
      volatile long writeCursor;      // cache line riêng
      long p8,p9,p10,p11,p12,p13,p14;
      volatile long readCursor;       // cache line riêng
  }
  // Java hiện đại: @Contended.  C++: alignas(64).  Rust: #[repr(align(64))]
```

> 💡 Đây là ví dụ hoàn hảo của mechanical sympathy: code **đúng về mặt logic** trong cả hai phiên bản, nhưng phiên bản sau nhanh gấp nhiều lần vì nó tôn trọng một chi tiết phần cứng mà ngôn ngữ lập trình cố tình giấu đi khỏi bạn.

### 11.3 Ring buffer và LMAX Disruptor

Hàng đợi thông thường (`ArrayBlockingQueue`, `std::queue` + mutex) sai với bài này vì ba lý do: nó **cấp phát** cho mỗi phần tử (sinh rác), nó **khoá** (tranh chấp + có thể vào kernel), và các con trỏ đầu/cuối **false-share** với nhau.

**LMAX Disruptor** — do sàn giao dịch LMAX công bố năm 2011, nay là mẫu chuẩn của ngành — thay bằng:

```
   Mảng CẤP PHÁT SẴN các ô, kích thước là luỹ thừa của 2 (ví dụ 2^20 ô)

   ┌────┬────┬────┬────┬────┬────┬────┬────┐
   │ 0  │ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │ ... vòng lại 0
   └────┴────┴────┴────┴────┴────┴────┴────┘
                  ▲         ▲              ▲
          consumer B    consumer A    producer (DUY NHẤT)
          (reporter)  (matching eng)   (sequencer)

   - Ô được CẤP SẴN và TÁI SỬ DỤNG → không cấp phát, không sinh rác
   - Producer GHI ĐÈ nội dung ô rồi mới publish con trỏ (store-release)
   - index = seq & (size-1)  → phép AND thay cho phép chia (rẻ hơn ~20×)
   - Mỗi consumer có con trỏ RIÊNG, ĐỆM riêng → không false sharing
   - Consumer chậm KHÔNG chặn consumer nhanh
   - Producer chỉ dừng khi vòng đầy (đuổi kịp consumer chậm nhất) → BACKPRESSURE tự nhiên
   - Không mutex: chỉ cần rào cản bộ nhớ (memory barrier), thậm chí không cần CAS
     vì chỉ có MỘT người viết
```

**Nguyên tắc một-người-viết (single writer principle)** là cái đẹp nhất ở đây: nếu chỉ có một luồng ghi vào một vùng nhớ, bạn **không cần cơ chế loại trừ lẫn nhau nào cả** — chỉ cần đảm bảo thứ tự hiển thị bằng rào cản bộ nhớ. Không CAS (compare-and-swap, ~20–50 ns khi có tranh chấp), không mutex, không tranh chấp. Đây là lý do sâu xa vì sao sequencer phải là người viết duy nhất (§8): không chỉ vì thứ tự nghiệp vụ, mà vì nó **xoá bỏ toàn bộ chi phí đồng bộ**.

Số đo công bố của LMAX: hơn **6 triệu message/giây** qua một Disruptor với độ trễ trung bình **dưới 100 ns** mỗi chặng — nhanh hơn `ArrayBlockingQueue` khoảng hai bậc độ lớn.

**Phải quyết định gì khi vòng đầy?** Đây là câu hỏi thiết kế, không phải chi tiết kỹ thuật:

| Chiến lược | Hệ quả | Dùng khi |
|---|---|---|
| Chặn producer | Áp lực ngược lan ngược lên gateway → gateway từ chối lệnh mới | ✅ Đúng cho đường nóng: thà từ chối rõ ràng còn hơn mất lệnh im lặng |
| Ghi đè dữ liệu cũ | Mất sự kiện | ❌ Không bao giờ cho lệnh. ✅ Chấp nhận được cho feed thống kê |
| Tràn sang đĩa | Cú giật mili-giây | ❌ Trên đường nóng |

### 11.4 Vòng lặp bận (busy-wait) thay vì chặn

```
  ❌ CHẶN (blocking): thread gọi queue.take() → không có dữ liệu → ngủ
     Khi dữ liệu đến: kernel đánh thức → lập lịch lại → nạp lại cache
     → 1–5 µs chỉ để TỈNH DẬY, cộng với cache đã nguội (thêm vài µs)

  ✅ QUAY BẬN (busy-spin): thread quay vòng đọc con trỏ, không bao giờ ngủ
     while (cursor == lastSeen) { Thread.onSpinWait(); }   // PAUSE instruction
     → phản ứng trong ~50–100 ns, cache luôn nóng, không chạm kernel
     → CÁI GIÁ: đốt 100% một core kể cả khi không có việc gì
```

Đây là một đánh đổi thẳng thừng và rất "phi-cloud": **bạn đốt điện để mua độ trễ**. Với một sàn giao dịch, một core chạy 100% suốt 6,5 giờ tốn vài xu tiền điện, trong khi mỗi micro-giây tiết kiệm được đáng giá hàng triệu đô doanh thu colocation. Phép tính không hề gần.

Thực tế người ta dùng **chiến lược lai**: quay bận trong giờ giao dịch, chuyển sang chặn ngoài giờ; hoặc quay N vòng rồi mới `yield()` rồi mới ngủ. Nhưng trên đường nóng trong giờ cao điểm thì luôn là quay bận thuần.

### 11.5 Không cấp phát, không gom rác

GC là kẻ thù số một của độ trễ ổn định trong thế giới JVM. Một cú "stop-the-world" chỉ 10 ms đã gấp **100 lần** toàn bộ ngân sách wire-to-wire. Có hai đường:

**Đường A — C++/Rust.** Không GC theo thiết kế. Vẫn phải kỷ luật: cấp phát sẵn tất cả lúc khởi động, dùng object pool, `alignas(64)`, tránh `std::shared_ptr` trên đường nóng (đếm tham chiếu nguyên tử là một phép khoá bus), tránh `new`/`malloc` (có thể chạm kernel qua `brk`/`mmap`).

**Đường B — Java "không cấp phát" (zero-allocation Java).** Nhiều sàn thật sự chạy Java, và họ viết Java **không giống Java**:

```java
// ❌ Java thông thường — mỗi dòng là một lần cấp phát
String symbol = msg.getSymbol();                 // cấp phát String
List<Fill> fills = new ArrayList<>();            // cấp phát
fills.add(new Fill(orderId, price, qty));        // cấp phát
BigDecimal p = new BigDecimal(price);            // cấp phát (và chậm)

// ✅ Zero-allocation — không sinh một byte rác nào
int symbolId = msg.symbolId();                   // đọc trường primitive
fillBuffer.write(orderId, priceTicks, qty);      // ghi vào buffer cấp sẵn
long priceTicks = msg.priceTicks();              // long, không BigDecimal
// + đối tượng "flyweight" trỏ vào ByteBuffer ngoài heap, tái sử dụng
// + mảng primitive thay vì collection có kiểu tổng quát (tránh boxing)
// + KHÔNG lambda/stream trên đường nóng (capture sinh đối tượng)
// + KHÔNG logging chuỗi: ghi nhật ký nhị phân, giải mã ở tiến trình khác
```

Mục tiêu là **không có lần gom rác nào trong suốt phiên giao dịch**: đặt heap rất lớn (ví dụ 32 GB), sinh rác gần bằng 0, và đơn giản là không bao giờ chạm ngưỡng kích hoạt GC. Ngoài giờ giao dịch thì gom thoải mái. Các thư viện tiêu biểu: Agrona, Aeron, Chronicle. Nếu vẫn cần GC, dùng bộ gom độ trễ thấp (ZGC/Shenandoah, dừng dưới 1 ms) — nhưng ưu tiên vẫn là **đừng sinh rác ngay từ đầu**.

> ⚠️ Java "không cấp phát" mua lại được độ trễ nhưng bán đi **tính dễ đọc và tốc độ phát triển**. Đây là đánh đổi phải nói rõ trong phỏng vấn, chứ không phải khoe kỹ thuật: *"Tôi sẽ viết theo kiểu này chỉ cho matching engine, sequencer và gateway — khoảng 5% lượng code. 95% còn lại (reporter, risk, market data lạnh, công cụ vận hành) viết Java bình thường, vì ở đó tốc độ phát triển đáng giá hơn micro-giây."*

### 11.6 Kernel bypass

Đường đi của một gói tin qua ngăn xếp mạng Linux bình thường:

```
  card mạng → DMA vào bộ đệm kernel → ngắt → softirq → ngăn xếp TCP/IP
  → sao chép sang bộ đệm socket → đánh thức tiến trình → syscall read()
  → SAO CHÉP lần nữa sang bộ nhớ người dùng → ứng dụng
                                          ≈ 20–50 µs, và JITTER cao
```

**Kernel bypass** xoá bỏ toàn bộ đoạn giữa: card mạng DMA **thẳng** vào bộ nhớ người dùng, ứng dụng đọc bằng cách quay vòng (poll), không ngắt, không syscall, không sao chép.

| Công nghệ | Bản chất | Độ trễ điển hình |
|---|---|---|
| Socket kernel thường | Mặc định | 20–50 µs, jitter lớn |
| `AF_XDP` / eBPF | Bypass một phần, có sẵn trong kernel mới | 10–20 µs |
| **DPDK** (Intel) | Driver ở tầng người dùng, poll-mode, huge page | **3–10 µs** |
| **Solarflare OpenOnload** | Chặn API socket ở tầng người dùng — **không cần sửa code** | 2–5 µs |
| **TCPDirect / ef_vi** | API thô của Solarflare, bỏ hẳn ngăn xếp TCP | **1–2 µs** |
| **FPGA** (khớp lệnh trên phần cứng) | Logic chạy thẳng trên chip mạng | **< 1 µs**, jitter cực nhỏ |

Cái giá thì thật: phần cứng chuyên dụng (card Solarflare/Exablaze, không có trên cloud công cộng), một core bị đốt hoàn toàn cho việc poll, mất các công cụ mạng quen thuộc (`tcpdump` không thấy gì), và code trói chặt vào nhà cung cấp. Onload hấp dẫn vì nó chặn ở tầng API socket nên ứng dụng không phải viết lại.

### 11.7 NUMA — bộ nhớ cũng có khoảng cách

Máy chủ nhiều socket có kiến trúc **NUMA** (non-uniform memory access): mỗi socket CPU có RAM "của mình"; truy cập RAM của socket kia phải đi qua liên kết liên socket, **đắt hơn ~50–60%** (130 ns so với 80 ns).

```
  ┌──────── NUMA node 0 ────────┐   ┌──────── NUMA node 1 ────────┐
  │  CPU socket 0  ── RAM 0     │   │  CPU socket 1  ── RAM 1     │
  │  core 0..15                 │◀─▶│  core 16..31                │
  │  ▲ card mạng cắm vào PCIe   │   │  (truy cập chéo: +50 ns)    │
  │    của socket này            │   │                             │
  └─────────────────────────────┘   └─────────────────────────────┘

  ✅ ĐÚNG: ghim engine vào core của node 0, cấp phát bộ nhớ trên node 0,
          dùng card mạng cắm vào PCIe của node 0.  → mọi thứ "cục bộ"
  ❌ SAI: để OS tự đặt → luồng ở node 1, dữ liệu ở node 0, card ở node 0
          → mỗi gói tin đi qua liên kết liên socket hai lần
```

Công cụ: `numactl --cpunodebind=0 --membind=0 ./engine`, và kiểm tra card mạng ở node nào bằng `cat /sys/class/net/eth0/device/numa_node`.

### 11.8 Colocation và sự công bằng bằng... cáp dài bằng nhau

Đây là chi tiết yêu thích của nhiều người khi học bài này, vì nó cho thấy độ trễ cuối cùng là **vật lý**, không phải phần mềm.

Sàn cho broker thuê chỗ đặt máy **ngay trong datacenter của mình** (colocation) — đó là dịch vụ VIP đắt tiền và là nguồn doanh thu lớn. Nhưng nếu tủ rack của broker A cách matching engine 10 m còn tủ của B cách 100 m, thì A có lợi thế ~0,45 µs — nhỏ xíu, nhưng đủ để một chiến lược HFT thắng đều đặn. Đó là **lợi thế không công bằng do chính kiến trúc datacenter của bạn tạo ra**, và cơ quan quản lý xem đó là vấn đề nghiêm trọng.

Giải pháp của các sàn thật (NASDAQ, NYSE, ICE, và nổi tiếng nhất là IEX):

- **Cáp dài BẰNG NHAU cho mọi khách colocation.** Nếu tủ gần chỉ cần 10 m, họ vẫn dùng đúng sợi cáp dài như tủ xa — phần thừa được cuộn lại trong khay. Đây là chuyện có thật, không phải giai thoại.
- **Cùng model switch, cùng số chặng (hop), cùng cấu hình cổng** cho mọi khách.
- **IEX còn đi xa hơn**: đặt một cuộn cáp quang 38 dặm (**"speed bump"**) trên đường vào, tạo độ trễ 350 µs cho **mọi người**, để triệt tiêu lợi thế của HFT nhanh nhất. Đây là một quyết định thiết kế mang tính triết lý: **cố tình làm chậm hệ thống để mua sự công bằng.**

> 💡 **Nguyên tắc kết thúc §11**: ở tầng micro-giây, "công bằng" ngừng là một thuộc tính phần mềm và trở thành một thuộc tính **vật lý**. Bạn không thể viết code để bù cho 90 mét cáp. Đây là điểm cuối cùng của chuỗi suy luận trong bài, và cũng là chỗ mà System Design chạm vào giới hạn của vũ trụ vật chất: tốc độ ánh sáng là ràng buộc kiến trúc thật sự.

---

## 12. Đo đạc: p99/p99.9, histogram, và coordinated omission

Bạn không thể tối ưu thứ mình đo sai. Ở bài này, đo sai là chuyện mặc định — hầu hết công cụ phổ biến đều đo sai độ trễ.

### 12.1 Trung bình là con số vô dụng nhất

```
  10.000 lệnh: 9.990 lệnh mất 20 µs, 10 lệnh mất 50 ms (một cú GC)
  Trung bình = (9.990×20µs + 10×50.000µs)/10.000 ≈ 70 µs   ← "ổn mà!"
  p99        = 20 µs        ← vẫn "ổn"
  p99.9      = 50 ms        ← ĐÂY mới là sự thật
```

Với sàn giao dịch, 10 lệnh bị trễ 50 ms là 10 giao dịch sai giá, có thể hàng trăm nghìn đô. Và vì market maker gửi hàng triệu lệnh mỗi ngày, họ **chắc chắn** sẽ gặp phần đuôi — với 1 triệu lệnh, p99.9 nghĩa là 1.000 lần mỗi ngày. **Phân vị đuôi không phải trường hợp hiếm, nó là trải nghiệm hàng ngày của khách hàng lớn nhất của bạn.** Vì vậy SLO phải viết theo p99, p99.9, p99.99 và **max**, không bao giờ theo trung bình.

### 12.2 Histogram, không phải trung bình trượt

Đo bằng **HdrHistogram** (hoặc tương đương): cấu trúc lưu phân bố đầy đủ với độ chính xác cấu hình được, ghi nhận trong **vài chục nano-giây**, không cấp phát, và — điểm quan trọng nhất — **các histogram cộng lại được**, nên gộp dữ liệu nhiều máy/nhiều khoảng thời gian vẫn cho phân vị đúng.

> ⚠️ **Phân vị không cộng trung bình được.** Trung bình của p99 mỗi phút **không phải** p99 của cả giờ. Rất nhiều hệ thống giám sát (kể cả các dashboard cloud mặc định) mắc đúng lỗi này và báo cáo những con số vô nghĩa. Phải gộp **histogram**, rồi mới tính phân vị.

Ngoài ra: dùng **đồng hồ đơn điệu độ phân giải cao** (`rdtsc`/`clock_gettime(CLOCK_MONOTONIC)`), đóng dấu thời gian **trên card mạng** (hardware timestamping) để đo wire-to-wire thật, và **đo từng chặng** (gateway → sequencer → engine → publish) để biết micro-giây bị mất ở đâu.

### 12.3 Coordinated omission — cái bẫy tinh vi nhất

Đây là hiện tượng do Gil Tene đặt tên, và là lý do phần lớn số liệu độ trễ được công bố trên thế giới đều **quá lạc quan**.

```
  Công cụ đo định gửi 1 request mỗi 1 ms (1.000 req/s).
  Tại t=0 ms nó gửi request A. Hệ thống bị treo 100 ms.
  A trả lời lúc t=100 ms → ghi nhận: 100 ms. Chỉ MỘT mẫu xấu.

  ❌ Nhưng trong lúc đó, 99 request lẽ ra phải được gửi ở
     t=1,2,...,99 ms đã KHÔNG BAO GIỜ ĐƯỢC GỬI — vì công cụ đo
     đang ngồi chờ A. Chúng biến mất khỏi thống kê.

  Sự thật: request lẽ ra gửi lúc t=1 ms phải chờ 99 ms;
           t=2 ms phải chờ 98 ms; ... Một trăm mẫu xấu, không phải một.

  Với 10.000 mẫu: đo sai cho p99 ≈ vài chục µs.
                  Đo đúng  cho p99 ≈ 90 ms.  Sai khác 1000×.
```

Vì sao gọi là "bỏ sót có phối hợp"? Vì công cụ đo đã **vô tình phối hợp** với hệ thống được đo: hệ chậm lại thì công cụ cũng tự chậm lại, nên nó **không bao giờ quan sát được** chính giai đoạn tệ nhất. Sai số luôn nghiêng về phía tô hồng.

**Ba cách chữa:**

1. **Đo theo lịch cố định, không theo phản hồi.** Request phải được gửi đúng t = 0, 1, 2, 3 ms... bất kể request trước đã trả lời chưa. Độ trễ được tính từ **thời điểm lẽ ra phải gửi**, không phải thời điểm thật sự gửi. Đây là chế độ mà `wrk2` và HdrHistogram (`recordValueWithExpectedInterval`) hiện thực.
2. **Đo một chiều, không đo khứ hồi.** Đóng dấu thời gian lúc gói tin chạm card mạng vào và lúc rời card mạng ra; đo bằng một máy quan sát thụ động (tap/mirror port) hoàn toàn tách rời khỏi hệ thống. Máy quan sát không thể "phối hợp" vì nó không gửi gì cả.
3. **Ưu tiên đo lưu lượng thật (production traffic) hơn benchmark tổng hợp.** Lưu lượng thật không bao giờ tự lùi lịch khi bạn chậm — thị trường không chờ bạn.

> 💡 **Nguyên tắc**: mỗi khi ai đó khoe "p99 của chúng tôi là 2 ms", câu hỏi đầu tiên phải là ***"đo bằng công cụ closed-loop hay open-loop?"*** Nếu closed-loop (gửi xong chờ trả lời rồi mới gửi tiếp) thì con số đó gần như chắc chắn sai về phía tốt. Nêu được coordinated omission trong phỏng vấn là một trong những tín hiệu mạnh nhất rằng bạn đã thật sự vận hành hệ thống độ trễ thấp.

---

## 13. Market data feed — multicast UDP và bài toán công bằng khi fan-out

### 13.1 Vì sao không dùng TCP

Ở §3.5 ta đã có hai con số: 8,6 MB/s nhân với 500 người nhận là 34 Gbps. Nhưng lý do từ chối TCP nặng hơn băng thông:

| Vấn đề của TCP unicast | Hệ quả |
|---|---|
| Phải gửi **500 bản sao** | 34 Gbps, và CPU tuần tự hoá 500 lần |
| Gửi tuần tự → người thứ 1 nhận trước người thứ 500 | **Lợi thế không công bằng vài trăm µs** — vấn đề pháp lý |
| Truyền lại chặn theo thứ tự (head-of-line blocking) | Một người nhận mạng kém làm chậm chính họ, và ta phải đệm cho họ |
| 500 kết nối có trạng thái | Bộ đệm gửi phình theo người nhận chậm nhất |
| Kiểm soát tắc nghẽn | TCP tự giảm tốc độ — với feed thời gian thực thì đó là điều **không mong muốn** |

Điểm thứ hai là điểm chí mạng: **thứ tự gửi trở thành một quyết định phân phối tài sản**. Bạn không thể dùng một cơ chế mà ai đứng đầu vòng lặp `for` thì giàu hơn.

### 13.2 Multicast: một bản tin, tất cả cùng nhận

```
  UNICAST                              MULTICAST
  publisher ──▶ subscriber 1 (t+0µs)   publisher ──▶ switch ──┬──▶ sub 1 ┐
            ──▶ subscriber 2 (t+8µs)                          ├──▶ sub 2 │ CÙNG
            ──▶ ...                                           ├──▶ ...   │ LÚC
            ──▶ subscriber 500 (t+4ms)                        └──▶ sub500┘
  500 bản sao rời publisher            1 bản sao rời publisher.
  Thứ tự = lợi thế.                    SWITCH nhân bản ở tầng phần cứng.
```

Publisher gửi **một** gói tới một địa chỉ nhóm (ví dụ `239.1.1.10:31001`); switch/router (qua IGMP) nhân bản gói tới mọi cổng có người đăng ký. Kết quả: băng thông không đổi theo số người nhận, và **chênh lệch thời điểm đến chỉ còn ở mức nano-giây do chênh lệch cáp** — đúng thứ ta muốn.

Tổ chức kênh theo nhiều nhóm để khách chỉ nhận thứ họ mua và trả tiền:

```
  239.1.1.10  → L1 tất cả các mã            (rẻ, nhẹ)
  239.1.2.x   → L2 theo nhóm mã (A–F, G–M...)
  239.1.3.x   → L3 đầy đủ, tách theo mã     (đắt, nặng)
  239.1.9.1   → kênh ảnh chụp (snapshot), phát lặp
  239.1.9.2   → kênh feed B, bản sao độc lập của A
```

### 13.3 UDP không tin cậy — bốn lớp phòng thủ

UDP có thể mất gói, đảo thứ tự, trùng lặp. Vì mọi gói đều mang `seq_id` liên tục, **người nhận luôn phát hiện được lỗ hổng**. Bốn lớp, dùng chồng lên nhau:

1. **Feed A/B song song (arbitration).** Phát **hai** bản sao giống hệt nhau qua **hai đường mạng vật lý hoàn toàn tách biệt** (switch khác, cáp khác). Người nhận lấy gói nào đến trước, bỏ bản trùng theo `seq_id`. Vì mất gói thường là sự kiện cục bộ, xác suất mất **cùng một gói trên cả hai đường** là rất nhỏ. Đây là lớp phòng thủ hiệu quả nhất và là chuẩn của ngành (NASDAQ ITCH, CME MDP đều dùng).
2. **Kênh ảnh chụp phát lặp (snapshot / recovery feed).** Một kênh riêng phát lại toàn bộ trạng thái sổ lệnh mỗi 1–5 giây, kèm `seq_id` tương ứng. Người nhận mới vào (hoặc mất đồng bộ nghiêm trọng) chờ ảnh chụp kế tiếp rồi áp dụng các gói tăng dần có seq lớn hơn. Đây cũng là mô hình **snapshot + incremental** kinh điển.
3. **Kênh xin phát lại (gap-fill / retransmission) qua TCP.** Người nhận thiếu seq 5003–5005 thì mở một kết nối TCP riêng xin đúng ba gói đó. Cố ý dùng TCP ở đây vì đây là đường **hiếm khi dùng** và cần tin cậy hơn là nhanh. Phải giới hạn nhịp: nếu 500 người cùng xin sau một sự cố mạng, chính việc phát lại sẽ đánh sập bạn (**bão phát lại**).
4. **PGM / reliable multicast** ở tầng thư viện (Aeron, Tibco Rendezvous, 29West) — gói sẵn NAK, cửa sổ truyền lại và kiểm soát nhịp.

```
  Người nhận thấy: ... 5001, 5002, 5006 ...
  → phát hiện thiếu 5003–5005
  → Lớp 1: kiểm tra feed B — có đủ? → dùng luôn, xong trong vài µs
  → Lớp 3: không có → gửi yêu cầu TCP xin 5003–5005 (vài ms)
  → Lớp 2: lỗ hổng quá lớn (> 1000 gói) → bỏ trạng thái hiện tại,
           chờ ảnh chụp kế tiếp và dựng lại từ đầu (vài giây)
```

> 💡 **Nguyên tắc đáng nhớ**: đây là một trong số ít bài toán mà **UDP + tự làm tin cậy** đánh bại TCP một cách dứt khoát — không phải vì TCP chậm, mà vì **ngữ nghĩa của TCP sai**: TCP tối ưu "không mất gói cho từng kết nối", còn ta cần "đến cùng lúc cho mọi người, và ai lỡ thì tự đi xin lại". Khi yêu cầu là *công bằng trong fan-out*, mô hình một-tới-nhiều ở tầng mạng là câu trả lời, không phải nhiều kết nối một-tới-một.

### 13.4 Market data publisher và nến

Publisher **dựng lại sổ lệnh của riêng nó** từ dòng sự kiện (dùng đúng cấu trúc dữ liệu ở §6.3, đây là lý do cấu trúc đó được tái sử dụng), rồi:

- Phát L3 (mọi thay đổi), L2 (gộp theo mức giá, có thể **tiết lưu** — ví dụ 10 ms một lần cho khách gói rẻ), L1 (chỉ khi giá tốt nhất đổi).
- Dựng **nến** theo nhiều độ phân giải (1s, 1m, 5m, 1h, 1d) bằng ring buffer cấp sẵn; giữ N nến gần nhất trong RAM, phần cũ đẩy xuống kho lịch sử. Nến là dữ liệu phái sinh nên **luôn dựng lại được** — mất cũng không sao, đó là lý do nó được phép nằm ngoài đường nóng.
- Lưu vào một cơ sở dữ liệu **cột trong bộ nhớ** (kdb+ là chuẩn ngành, hoặc ClickHouse/DuckDB) cho phân tích thời gian thực; cuối phiên đẩy sang kho lịch sử.

**Tiết lưu (throttling) là một quyết định công bằng, không phải kỹ thuật:** nếu khách trả nhiều tiền nhận L3 tức thì còn khách rẻ nhận L2 mỗi 10 ms, thì bạn đang bán lợi thế tốc độ. Điều đó **hợp pháp và phổ biến**, nhưng phải công bố rõ ràng và áp dụng nhất quán trong từng hạng — cơ quan quản lý quan tâm đến sự minh bạch và nhất quán, không phải sự bằng nhau tuyệt đối.

---

## 14. Kiểm tra rủi ro trước khi vào engine

Mọi lệnh phải qua risk check **trước** matching engine, và toàn bộ phần này có ngân sách chỉ **vài micro-giây**.

| Loại kiểm tra | Ví dụ | Nơi lưu trạng thái |
|---|---|---|
| **Hạn mức khối lượng** | Khách X không quá 1 triệu cổ AAPL/ngày | Bộ đếm trong RAM, mảng chỉ số theo `(client_id, symbol_id)` |
| **Hạn mức giá trị** | Không quá 50 triệu USD tổng vị thế | Bộ đếm trong RAM |
| **Kiểm tra ví (fund check)** | Đủ tiền mua? Đủ cổ để bán? | Số dư trong RAM + **giữ tiền** |
| **Hạn mức nhịp lệnh** | Không quá 10.000 lệnh/s mỗi khách | Token bucket (đúng như bài Rate Limiter) |
| **Dải giá hợp lệ (fat finger)** | Từ chối lệnh lệch > 20% giá tham chiếu | So sánh với giá tham chiếu trong RAM |
| **Tự khớp (self-trade prevention)** | Cấm khách khớp với chính mình (tạo khối lượng giả) | Kiểm tra `client_id` lúc khớp |

**Giữ tiền (withholding) — chỗ dễ sai nhất.** Khi khách đặt mua 100 cổ @ 100.05, số tiền 10.005 USD phải bị **giữ ngay lập tức**, không phải trừ khi khớp:

```
  available = 50.000     held = 0
  ── đặt lệnh mua 100 @ 100.05 ────────────────────────────────
  available = 39.995     held = 10.005     (GIỮ NGAY, trước khi vào engine)
  ── khớp 60 cổ @ 100.05 ──────────────────────────────────────
  available = 39.995     held =  4.002     settled = -6.003
  ── huỷ phần còn lại ─────────────────────────────────────────
  available = 43.997     held =      0     (trả lại phần chưa dùng)
```

Nếu không giữ ngay, khách có thể đặt 10 lệnh mua mà chỉ đủ tiền cho 1 — và nếu cả 10 cùng khớp, sàn phải gánh phần thiếu. Đây là **nợ thấu chi (overdraft)**, chính là rủi ro mà khâu này sinh ra để chặn.

> ⚠️ Bộ đếm rủi ro phải nằm **trong RAM trên cùng máy**, không phải trong Redis/DB. Một chuyến đi Redis mất 200–500 µs — **gấp năm lần toàn bộ ngân sách wire-to-wire**. Cập nhật bền vững cho các bộ đếm này đi theo cùng cơ chế event sourcing như mọi thứ khác: ghi vào nhật ký sự kiện, dựng lại khi khởi động. Đây là ứng dụng trực tiếp của nguyên tắc ở §7.2.

---

## 15. Circuit breaker của thị trường

Khác hẳn circuit breaker phần mềm (bài Rate Limiter / Tradeoff): ở đây nó là cơ chế **do luật định** để tạm dừng giao dịch khi giá biến động quá mạnh, nhằm cho con người thời gian suy nghĩ và ngăn vòng xoáy sụp đổ do máy móc.

| Cấp | Kích hoạt (chỉ số thị trường so với giá đóng cửa hôm trước) | Hành động |
|---|---|---|
| **Cấp 1** | Giảm 7% | Dừng toàn thị trường **15 phút** (không áp dụng sau 15:25) |
| **Cấp 2** | Giảm 13% | Dừng toàn thị trường **15 phút** |
| **Cấp 3** | Giảm 20% | **Đóng cửa cả ngày** |
| **LULD** (từng mã) | Giá ra ngoài dải ±5–10% trong 5 phút | Tạm dừng mã đó 5 phút, hoặc chuyển sang trạng thái "limit state" |

Về mặt hệ thống, điều này sinh ra ba yêu cầu cụ thể:

1. **Trạng thái phiên (session state) phải là một phần của máy trạng thái**: `PRE_OPEN → OPEN → HALTED → REOPENING → CLOSED`. Chuyển trạng thái là một **sự kiện có `seq_id`**, đi qua sequencer như mọi sự kiện khác — nếu không, phát lại sẽ không tái hiện được đúng lịch sử (đúng nguyên tắc §9.3).
2. **Khi HALTED**: từ chối lệnh mới, **vẫn cho huỷ** (rất quan trọng — người ta phải được thoát), không khớp gì cả, vẫn phát market data trạng thái dừng.
3. **Mở lại là phiên đấu giá (auction), không phải khớp liên tục.** Trong lúc dừng, lệnh được thu thập vào sổ nhưng không khớp; khi mở lại, engine tính **một mức giá duy nhất tối đa hoá khối lượng khớp** rồi khớp tất cả ở giá đó. Đây là thuật toán **khác** với price-time priority liên tục, và là một mục thiết kế riêng — nếu người phỏng vấn hỏi sâu, đây là chỗ ghi điểm: *"khớp liên tục và khớp định kỳ theo phiên là hai thuật toán khác nhau; engine của tôi cần cả hai, chọn theo trạng thái phiên."*

---

## 16. Sổ lệnh nhiều mã và sharding theo symbol

Ta đã chốt "một engine cho cả 100 mã". Khi cần 10.000 mã hoặc 10× lưu lượng thì sao?

**Tin tốt: sổ lệnh của các mã hoàn toàn độc lập.** Không có giao dịch nào chạm hai mã cùng lúc (điều này khác hẳn bài KV Store hay bài Digital Wallet, nơi một giao dịch có thể chạm nhiều khoá). Nên **phân mảnh theo mã là sharding hoàn hảo — không cần giao dịch phân tán.**

```
   ┌─────────────────────────────────────────────────────────┐
   │                SEQUENCER (vẫn DUY NHẤT)                 │
   │  gán seq TOÀN CỤC → định tuyến theo symbol_id % N       │
   └───────┬────────────────┬────────────────┬───────────────┘
           ▼                ▼                ▼
    ┌────────────┐   ┌────────────┐   ┌────────────┐
    │ ENGINE #0  │   │ ENGINE #1  │   │ ENGINE #2  │
    │ AAPL, GOOG │   │ MSFT, AMZN │   │ TSLA, NVDA │
    │ 1 core ghim│   │ 1 core ghim│   │ 1 core ghim│
    └────────────┘   └────────────┘   └────────────┘
      Mỗi engine VẪN đơn luồng. Song song theo MÃ, không theo LỆNH.
```

| Câu hỏi | Trả lời |
|---|---|
| Sequencer vẫn toàn cục? | **Nên, chừng nào còn kịp.** Một sequencer xử lý được vài triệu sự kiện/s. Nếu vượt, tách sequencer theo nhóm mã — nhưng khi đó mất thứ tự toàn cục **giữa các nhóm** (chấp nhận được, vì các mã độc lập) |
| Chia mã thế nào? | **Không dùng hash đều.** AAPL có thể có lưu lượng gấp 1.000 lần một mã nhỏ. Phải **cân bằng theo lưu lượng lịch sử**, và gán lại giữa các phiên (không bao giờ trong phiên) |
| Mã nóng quá một core? | Không chia nhỏ được một mã — thứ tự là toàn phần trong mã. Phải cho nó **một máy riêng, phần cứng tốt nhất**. Đây là giới hạn cứng, và là lý do các sàn lớn chạy engine trên CPU tần số cao nhất thị trường thay vì CPU nhiều core |
| Khách hỏi nhiều mã? | Gateway fan-out tới nhiều engine rồi gộp kết quả. Không cần giao dịch phân tán vì mỗi lệnh chỉ chạm một mã |

> 💡 **Nguyên tắc**: hãy tìm **trục phân mảnh tự nhiên** trước khi nghĩ tới phân mảnh nhân tạo. Ở đây nghiệp vụ đã tặng bạn một trục hoàn hảo (mã cổ phiếu độc lập) — bạn chỉ cần nhận ra và không phá vỡ nó. Nhiều bài toán khó về sharding thật ra chỉ khó vì người thiết kế đã vô tình tạo ra ràng buộc chéo giữa các mảnh.

---

## 17. Tuân thủ và lưu vết kiểm toán

Đây là phần không hấp dẫn về kỹ thuật nhưng **không tuỳ chọn về pháp lý**, và bỏ qua nó trong phỏng vấn là một thiếu sót dễ thấy.

| Yêu cầu | Cách hiện thực |
|---|---|
| **Lưu mọi sự kiện 5–7 năm** | Nhật ký sequencer → nén → S3 Glacier, bất biến (WORM / Object Lock) |
| **Đóng dấu thời gian chính xác** | MiFID II yêu cầu sai số ≤ 100 µs với HFT → **PTP (IEEE 1588)** chứ không phải NTP; đóng dấu ở tầng phần cứng card mạng; nguồn GPS trong DC |
| **Tái hiện được (reconstruction)** | Phát lại xác định (§9) — cho cơ quan quản lý thấy chính xác chuyện gì đã xảy ra |
| **Giám sát thao túng thị trường** | Phân tích ngoại tuyến (T+1) tìm mẫu: **spoofing** (đặt lệnh lớn rồi huỷ để lừa giá), **layering**, **wash trading** (tự khớp), front-running |
| **Đối soát cuối ngày** | Tổng khớp mua = tổng khớp bán, từng mã, từng khách; đối chiếu với clearing house |
| **Bất biến & chống chối bỏ** | Nhật ký chỉ-thêm, băm theo chuỗi (mỗi bản ghi chứa hash của bản ghi trước), ký số theo lô |
| **Truy vấn được** | Parquet trên S3 + Athena/Glue; hoặc kdb+ cho phân tích chuỗi thời gian |

Điểm đẹp của kiến trúc này: **event sourcing đã cho bạn gần như toàn bộ mục trên miễn phí.** Nhật ký bất biến, có thứ tự, phát lại được *chính là* bản ghi kiểm toán mà cơ quan quản lý yêu cầu. Một quyết định kỹ thuật được chọn vì độ trễ và HA hoá ra lại giải luôn bài toán tuân thủ — đây là loại lập luận rất đáng nêu ra trong phỏng vấn, vì nó cho thấy bạn nhìn được hệ quả liên ngành của một lựa chọn kiến trúc.

---

## 18. Nút thắt và chế độ hỏng

### 18.1 Cái gì nghẽn trước?

Xếp theo thứ tự thực tế bạn sẽ gặp:

| # | Nút thắt | Triệu chứng | Cách chữa |
|---|---|---|---|
| 1 | **Đuôi độ trễ, không phải thông lượng** | p99 ổn, p99.9 nhảy lên vài ms | Săn nguồn gây gián đoạn: GC, ngắt, di chuyển core, C-state, trượt trang |
| 2 | **Tuần tự hoá & ngăn xếp mạng** | 80% ngân sách tiêu ở gateway | Giao thức nhị phân, kernel bypass |
| 3 | **Fan-out market data** | Publisher không theo kịp, hàng đợi phình | Multicast, tiết lưu L2, tách kênh theo hạng khách |
| 4 | **Micro-burst lúc mở/đóng cửa** | Mất gói ở card mạng, ring buffer đầy | Cấp dư, buffer lớn, backpressure rõ ràng |
| 5 | Một mã quá nóng | Một engine chạm trần một core | Máy riêng cho mã đó; không chia nhỏ được |
| 6 | Reporter/DB hạ nguồn | Tụt hậu hàng phút | Không sao — nó nằm ngoài đường nóng theo thiết kế |

Nhận xét quan trọng: **matching engine gần như không bao giờ là nút thắt** (§6.5 — 6,5% một core). Nút thắt thật luôn nằm ở **biên** (mạng, mã hoá) và ở **đuôi** (sự gián đoạn). Nói được điều này cho thấy bạn hiểu hệ thống chứ không chỉ hiểu thuật toán.

### 18.2 Thành phần chết thì sao?

| Chết cái gì | Hậu quả | Xử lý |
|---|---|---|
| Một client gateway | Broker nối vào nó mất kết nối | Stateless → nối lại sang gateway khác; broker luôn cấu hình nhiều endpoint |
| Matching engine (primary) | Không khớp được lệnh | Bản sao nóng lên làm leader trong 5–20 ms (§10) |
| **Sequencer** | **Toàn hệ dừng** | SPOF theo thiết kế → hot standby + Raft + fencing. Đây là thành phần được bảo vệ kỹ nhất |
| Market data publisher | Không có giá cho thị trường | Chạy 2 publisher độc lập (feed A/B) từ cùng nhật ký; chúng vốn đã độc lập với nhau |
| Reporter | Báo cáo tụt hậu | Không ảnh hưởng giao dịch; bắt kịp bằng cách đọc lại nhật ký |
| Mạng multicast | Người nhận mất dữ liệu | Feed A/B trên hai đường vật lý + kênh ảnh chụp |
| **Cả datacenter** | Ngừng giao dịch | Hot-warm ở DC khác; RTO vài phút. **Chấp nhận được** — mọi sàn đều có kịch bản dừng phiên, và dừng đúng cách tốt hơn khớp sai |

### 18.3 Ba chế độ hỏng nguy hiểm nhất — và tại sao chúng đáng sợ hơn "máy chết"

1. **Lỗi tất định lan sang mọi bản sao.** Chính tính xác định đảm bảo mọi bản sao sập tại cùng `seq_id`. Đây là **cái giá của thứ ta đã trả rất nhiều tiền để có**. Phòng thủ: kiểm tra đầu vào nghiêm ngặt ở gateway (chặn trước khi vào máy trạng thái), fuzz test trên bộ giải mã, và một bản sao chạy phiên bản lệch nhịp.
2. **Split-brain phát fill trùng.** Một lệnh khớp hai lần là mất tiền thật và là sự cố phải báo cáo. Phòng thủ: quorum, số hiệu nhiệm kỳ (fencing), khử trùng lặp theo `seq_id` ở hạ nguồn.
3. **Sổ lệnh chéo (crossed book).** Nếu vì lỗi mà `bestBid ≥ bestAsk` mà không khớp, thị trường rơi vào trạng thái vô lý và mọi thuật toán của khách sẽ hành xử điên rồ. Phòng thủ: **bất biến (invariant) được kiểm tra sau mỗi sự kiện** — `bestBid < bestAsk` luôn phải đúng; nếu sai thì **dừng mã đó ngay lập tức** thay vì tiếp tục. 

> 💡 **Nguyên tắc vận hành cho cả bài**: với hệ thống tài chính, **dừng lại là một kết quả chấp nhận được; sai là thì không.** Trong 29 bài trước, "suy giảm nhẹ nhàng" (degrade gracefully) gần như luôn tốt hơn dừng — feed thiếu vài bài viết, thông báo đến muộn, kết quả tìm kiếm cũ một chút. Ở đây thì ngược lại: khớp sai một lệnh gây tổn hại lớn hơn và **không thể hoàn tác**, vì hệ quả của nó lan ra ngoài hệ thống của bạn ngay lập tức. Đây là một trong những đảo ngược đáng suy ngẫm nhất của cả course.

---

## Liên hệ sang AWS

### Trước hết: nói thẳng cái gì cloud KHÔNG làm được

Đây là bài duy nhất trong course mà câu trả lời trung thực bắt đầu bằng một lời từ chối. Nếu bạn mở mục AWS bằng cách liệt kê dịch vụ, bạn đã sai. Hãy mở bằng câu này:

> *"Nhân khớp lệnh của một sàn tốc độ cao **không chạy trên public cloud**, và đó không phải vì AWS yếu — mà vì mô hình kinh doanh của cloud là **chia sẻ tài nguyên**, còn bài toán này đòi **độc quyền tài nguyên**. Cái tôi cần là không ai khác chạm vào core, cache, và card mạng của tôi. Đó đúng là thứ cloud tồn tại để không cho phép."*

Bốn rào cản cụ thể, mỗi cái là một lý do đủ:

| Điều bài toán cần | Vì sao public cloud không cho | Hệ quả bằng số |
|---|---|---|
| **Jitter cực thấp** | Máy ảo dùng chung hạ tầng vật lý với hàng xóm ("noisy neighbour"); hypervisor có thể "đánh cắp" thời gian CPU (steal time); tần số CPU thay đổi | p99.9 trên EC2 thường **cao hơn 5–20×** so với bare-metal đã chỉnh; và quan trọng hơn, **không dự đoán được** |
| **Kernel bypass với phần cứng chuyên dụng** | Không có card Solarflare/Exablaze; không cắm được card riêng; ENA nhanh nhưng không phải ef_vi | Mất ~10–20 µs mỗi chặng, và mất khả năng đóng dấu thời gian phần cứng cho MiFID II |
| **Colocation với cáp dài bằng nhau** | Bạn không biết máy mình nằm ở rack nào, cũng không kiểm soát được topo mạng; AWS có thể di chuyển instance | **Không thể chứng minh công bằng** — đây là rào cản **pháp lý**, không phải kỹ thuật, và là rào cản khó vượt nhất |
| **Multicast thật giữa khách hàng** | VPC không hỗ trợ multicast nguyên bản; Transit Gateway multicast có hỗ trợ nhưng bị giới hạn và không đảm bảo thời điểm đến đồng đều | Mất chính tính chất mà §13 cần |

Ngoài ra: cấu hình kernel bạn cần (`isolcpus`, `nohz_full`, tắt C-state, huge page 1 GB, PTP phần cứng) chỉ thực hiện được đầy đủ trên máy bạn sở hữu.

**Vậy các sàn thật làm gì?** Nhân giao dịch (gateway → sequencer → engine → publisher) chạy **bare-metal trong datacenter riêng**, và **mọi thứ khác** chạy trên cloud. Đó chính là thiết kế đúng, và nói được ranh giới đó là điểm cộng lớn.

### Ranh giới: cái gì ở đâu

```
   ┌──────── DATACENTER RIÊNG (bare-metal, colocation) ────────┐
   │  gateway → order mgr → risk → SEQUENCER → ENGINE          │
   │  → market data publisher → multicast tới khách colo       │
   │  Yêu cầu: micro-giây, xác định, công bằng vật lý          │
   └──────────────────────┬───────────────────────────────────┘
                          │ nhật ký sự kiện (bất đồng bộ, vài giây trễ — KHÔNG SAO)
                          ▼
   ┌──────────────────────── AWS ──────────────────────────────┐
   │  lưu trữ lịch sử · backtest · báo cáo · giám sát          │
   │  phân tích · API công khai · web/app cho nhà đầu tư       │
   │  Yêu cầu: rẻ, co giãn, dễ truy vấn — ĐÚNG SỞ TRƯỜNG CLOUD │
   └───────────────────────────────────────────────────────────┘
```

### Bảng ánh xạ

| Thành phần thiết kế | Dịch vụ AWS | Vì sao hợp (và bẫy) |
|---|---|---|
| **Matching engine, sequencer** | ❌ **Không có** — bare-metal tự vận hành | Xem bốn rào cản ở trên. Đừng cố ép |
| Nếu **buộc** phải chạy trên AWS (sàn crypto, sàn mới nổi, môi trường thử nghiệm) | **EC2 metal** (`c7i.metal`, `m7i.metal`) + **cluster placement group** + **ENA Express** (SRD) + **SR-IOV** | Metal cho bạn quyền chỉnh kernel và không có hypervisor "ăn cắp" CPU. Cluster placement group đặt instance cùng rack → ~50–100 µs p99 giữa hai instance. ENA Express dùng giao thức SRD của AWS, giảm **đuôi** độ trễ đáng kể. ⚠️ Vẫn **không phải** micro-giây, và vẫn không có cáp dài bằng nhau |
| Nền tảng ảo hoá độ trễ thấp | **AWS Nitro** | Nitro đẩy ảo hoá I/O xuống card chuyên dụng, nên overhead gần bằng 0 và jitter tốt hơn hypervisor truyền thống rất nhiều. Đây là lý do EC2 hiện đại *khả dĩ* cho tài chính độ trễ thấp — dù vẫn chưa đủ cho nhân khớp lệnh |
| Tăng tốc bằng phần cứng | **FPGA F1/F2** | Phù hợp thật sự: giải mã FIX/SBE, tiền-kiểm-tra rủi ro, lọc market data trên FPGA — đúng những tác vụ các sàn chạy FPGA. Độ trễ dưới 1 µs và **jitter cực nhỏ**. ⚠️ Chu kỳ phát triển tính bằng tháng |
| Đưa cloud tới gần sàn | **Local Zones**, **Outposts**, **Direct Connect** | Outposts đặt phần cứng AWS **ngay trong DC của bạn** — cho phép dịch vụ hạ nguồn chạy cạnh engine mà vẫn dùng API AWS. Local Zones đặt compute ở trung tâm tài chính (New York, London...) → vài ms tới sàn. Direct Connect cho đường riêng ổn định thay vì Internet |
| Bộ đếm rủi ro / trạng thái cần bền + nhanh | **MemoryDB for Redis** | Tốc độ Redis + nhật ký giao dịch đa AZ (bền vững thật, khác ElastiCache). ⚠️ Vẫn là **vài trăm µs qua mạng** → chỉ dùng cho tầng ngoài đường nóng (broker, tiền-kiểm-tra), **không** cho risk check trong sàn — cái đó phải ở RAM cục bộ (§14) |
| Nhật ký sự kiện đi xuống hạ nguồn | **MSK (Kafka)** hoặc **Kinesis Data Streams** | Đây là chỗ Kafka **đúng**: sau khi rời sequencer, độ trễ mili-giây hoàn toàn ổn. MSK nếu muốn Kafka thật (giữ thứ tự trong partition, tái xử lý theo offset). Kinesis on-demand nếu muốn khỏi quản lý — 90 GB/ngày ≈ 3,8 MB/s trung bình, đỉnh ~20 MB/s → vài chục shard |
| Fan-out market data ra **Internet công cộng** | **Kinesis → Lambda → API Gateway WebSocket**, hoặc **IoT Core (MQTT)** | Cho app nhà đầu tư cá nhân (L1, chậm vài trăm ms) thì hoàn toàn hợp lý và rẻ. ⚠️ **Không** dùng cho khách chuyên nghiệp — họ cần multicast tại DC |
| Multicast trong VPC | **Transit Gateway multicast** | Có hỗ trợ, dùng được cho môi trường kiểm thử/DR. ⚠️ Giới hạn về số nhóm/số thành viên và **không bảo đảm đồng thời** → không đáp ứng yêu cầu công bằng |
| Kho lịch sử (32 TB, 7 năm) | **S3** + **Intelligent-Tiering** → **Glacier Deep Archive**, định dạng **Parquet**, phân vùng theo `date/symbol` | Rẻ đến mức không cần bàn. **S3 Object Lock (WORM)** đáp ứng yêu cầu bất biến của tuân thủ (SEC Rule 17a-4) — đây là lý do rất cụ thể để chọn S3 chứ không phải chỉ vì rẻ |
| Truy vấn lịch sử | **Athena** (+ **Glue** catalog), hoặc **Redshift Spectrum** | Athena là lựa chọn mặc định: trả tiền theo byte quét, không cần cụm thường trực. Phân vùng đúng là tất cả — quét cả 32 TB cho một truy vấn một ngày là lỗi chi phí kinh điển |
| **Backtest & mô phỏng** | **AWS Batch** (Spot) hoặc **EMR** | ✅ **Đây là chỗ cloud toả sáng nhất trong bài.** Backtest là bài toán song song hoàn hảo, chạy theo lô, chịu được gián đoạn → **Spot giảm 70–90% chi phí**. Phát lại một năm dữ liệu qua 500 bộ tham số là 500 job độc lập — bung 5.000 vCPU trong 2 giờ rồi trả lại |
| **Phát lại xác định để kiểm thử phiên bản mới** | **Batch** + **S3** + **FSx for Lustre** | Lấy nhật ký một ngày thật, chạy qua engine mới, so từng fill (§9.2). FSx for Lustre gắn S3 làm kho đệm tốc độ cao cho các job đọc cùng dữ liệu |
| Chuỗi thời gian giá / nến | **Timestream** (hoặc **InfluxDB trên EC2**, hoặc kdb+) | Timestream tự chia tầng nóng/lạnh, có hàm nội suy và cửa sổ sẵn — hợp cho dashboard và API nến. ⚠️ Không thay được kdb+ cho phân tích tick-level của quant |
| **Giám sát thao túng thị trường** | **EMR/Glue** (Spark) theo lô T+1 + **SageMaker** cho mô hình phát hiện bất thường | Bài toán ngoại tuyến, dữ liệu lớn, chạy đêm — đúng hình dạng cloud. Phát hiện spoofing/layering là bài toán chuỗi sự kiện, hợp với Spark |
| Báo cáo, đối soát, thuế | **Aurora PostgreSQL** hoặc **Redshift** | Cần ACID và SQL phức tạp, không cần tốc độ. Đây là phần "nhàm chán" mà RDBMS truyền thống giải tốt nhất |
| API công khai & web cho nhà đầu tư | **CloudFront + ALB + ECS/Fargate**, **Cognito**, **WAF + Shield Advanced** | ✅ Tách hẳn khỏi mạng giao dịch. DDoS nhắm vào web **không được** chạm tới sàn — đây là yêu cầu cách ly vùng lỗi, không chỉ là bảo mật |
| Đồng bộ thời gian | **Amazon Time Sync Service** (có hỗ trợ **PTP** trên instance đời mới) | Đủ cho hệ hạ nguồn. ⚠️ Với MiFID II sai số ≤ 100 µs ở nhân giao dịch, vẫn nên có **nguồn GPS + PTP grandmaster riêng** |
| Quan sát hệ thống | **CloudWatch** cho hạ nguồn; **công cụ riêng** cho đường nóng | ⚠️ **Không** dùng agent CloudWatch trên máy engine — agent giám sát là một nguồn gây jitter. Đường nóng phải ghi histogram nhị phân vào shared memory, một tiến trình khác đọc và đẩy ra ngoài |

**Ba câu chốt đáng nhớ:**

1. *"Tôi sẽ không chạy matching engine trên EC2, và lý do mạnh nhất không phải kỹ thuật mà là **pháp lý**: tôi không thể chứng minh với cơ quan quản lý rằng mọi khách hàng có độ trễ mạng bằng nhau, khi tôi còn không biết máy mình nằm ở rack nào."*
2. *"Ranh giới rất sạch: **trước sequencer là bare-metal, sau sequencer là cloud.** Nhật ký sự kiện chính là đường nối, và vì nó bất đồng bộ nên độ trễ mili-giây của cloud không bao giờ chạm tới đường nóng."*
3. *"Chỗ cloud thắng tuyệt đối là **backtest**: 500 bộ tham số × một năm dữ liệu là 500 job độc lập, chịu được ngắt quãng. Trên Spot tôi bung 5.000 vCPU trong hai giờ rồi trả lại — không datacenter riêng nào mua nổi khả năng đó."*

---

## Cách trình bày khi phỏng vấn / review

1. **Mở bằng cách tuyên bố thang thời gian, vì nó lật ngược mọi thứ.** *"Trước khi vẽ, tôi muốn chốt một điều: ngân sách ở đây là **micro-giây**, không phải mili-giây. Điều đó có nghĩa mọi phản xạ thông thường — thêm cache, đẩy vào queue, tách microservice, scale ngang — đều trở thành **chi phí thuần**. Tôi sẽ thiết kế theo hướng **bớt tầng đi**, không phải thêm tầng."* Câu này định khung cả buổi và ngay lập tức tách bạn khỏi ứng viên sắp vẽ Kafka.

2. **Chứng minh phạm vi bằng ba phép tính, rồi rút ra kết luận lớn.** 1 tỉ lệnh/ngày → 43K QPS trung bình, 215K đỉnh; 5 triệu lệnh sống × 64 B → **500 MB**; một lệnh ~300 ns → **6,5% một core**. *"Ba con số này nói cùng một điều: đây **không phải bài toán quy mô, mà là bài toán độ trễ**. Dữ liệu nóng vừa trong RAM một máy, nên tôi sẽ không phân tán."*

3. **Tách ba luồng ngay từ sơ đồ đầu tiên** — giao dịch (µs), market data (ms, phải công bằng), báo cáo (T+1, phải đầy đủ). *"Chúng khác nhau không chỉ về tốc độ mà về **thứ được tối ưu**. Gộp chung một đường ống là ép cả ba nhận đặc tính tệ nhất của nhau."*

4. **Dành nhiều thời gian nhất cho order book, và trả lời câu 'sao không dùng heap' bằng hai tầng lý lẽ.** Tầng một: **huỷ là thao tác phổ biến nhất (>95%)** và heap huỷ mất O(n). Tầng hai — tầng ghi điểm: *"Kể cả cây đỏ-đen O(log n) cũng thua, vì 17 bước xuống cây là 17 lần **trượt cache** ≈ 1,4 µs, trong khi mảng liên tục được prefetcher kéo sẵn. Ở thang micro-giây, **hằng số quan trọng hơn bậc tiệm cận**."*

5. **Giải thích price-time priority bằng một ví dụ có số, đừng phát biểu trừu tượng.** Vẽ sổ lệnh thật, cho một lệnh mua quét qua hai mức giá, chỉ ra **ba** điểm: giá khớp là giá của lệnh nằm sẵn (price improvement); khớp một phần **không mất chỗ trong hàng**; một khớp sinh **đúng hai fill**. Người phỏng vấn fintech sẽ nhận ra ngay bạn có hiểu thị trường hay không.

6. **Trình bày "đơn luồng" như một lựa chọn tự tin, không phải một lời thú nhận.** Bốn lý do, theo thứ tự này: (1) price-time priority **định nghĩa** một thứ tự toàn phần — không song song hoá được thứ vốn là thứ tự; (2) khoá đắt hơn chính công việc (µs so với 300 ns); (3) mất tính xác định là mất HA và mất replay; (4) một core dùng 6,5%. Rồi chốt: *"Song song vẫn có — nhưng theo trục **khác việc** (pipeline), không theo trục **cùng việc**."*

7. **Đưa sequencer vào trung tâm câu chuyện, vì nó là nơi mọi thứ hội tụ.** *"Một số tăng dần, một người viết — và nó mua cho tôi **năm** thứ cùng lúc: công bằng, tính xác định, phát lại, đúng-một-lần, phát hiện mất gói."* Chủ động so với Kafka rồi từ chối đúng cách: *"Về khái niệm đây chính là một Kafka partition. Tôi tự viết vì cần µs chứ không phải ms — nhưng hạ nguồn tôi **vẫn dùng Kafka**."* Từ chối công cụ có lý do luôn mạnh hơn né tránh nó.

8. **Nối event sourcing với HA để cho thấy chúng là một ý tưởng, không phải hai.** *"Vì engine là **hàm thuần khiết** của dòng sự kiện, hai máy nhận cùng dòng sẽ có trạng thái giống hệt nhau mà không cần trao đổi gì. Nên **failover không phải hành động khôi phục — nó chỉ là hành động cấp quyền phát ngôn.** Bản sao đã đúng từ trước, nó chỉ đang bị bịt miệng."* Đây là câu đắt giá nhất của cả bài.

9. **Tự nêu mặt trái của tính xác định trước khi bị hỏi.** *"Chính tính xác định tôi vừa khoe đảm bảo rằng một lệnh gây tràn số sẽ làm sập **cả ba** bản sao ở đúng cùng seq_id. Nên tôi cần hai lớp khác bản chất: kiểm tra đầu vào rất nghiêm ở gateway, và một bản sao chạy phiên bản lệch nhịp."* Tự phản biện thiết kế của mình là tín hiệu cấp Staff.

10. **Khi vào phần tối ưu độ trễ, chọn ba kỹ thuật và giải thích sâu, đừng liệt kê mười.** Gợi ý bộ ba mạnh nhất: **false sharing** (hai biến chung cache line làm hai core đánh nhau, chậm 5–10×), **ring buffer/Disruptor với nguyên tắc một-người-viết** (một người viết thì **không cần cơ chế loại trừ nào cả**), và **busy-wait** (*"tôi đốt 100% một core để đổi lấy phản ứng 100 ns thay vì 5 µs — với sàn giao dịch, phép tính này không hề gần"*). Liệt kê dàn trải nghe như đọc thuộc; ba ví dụ sâu nghe như đã làm.

11. **Nêu coordinated omission — đây là tín hiệu mạnh nhất trong toàn bài.** *"Nếu công cụ đo chờ phản hồi rồi mới gửi tiếp, thì đúng lúc hệ chậm nhất nó cũng ngừng đo. Một cú treo 100 ms lẽ ra phải tạo 100 mẫu xấu lại chỉ tạo một. p99 báo cáo có thể sai **1000 lần** so với sự thật."* Rồi nói cách chữa: đo open-loop theo lịch cố định, hoặc đo một chiều bằng máy quan sát thụ động.

12. **Giải thích multicast bằng công bằng trước, băng thông sau.** *"TCP unicast tới 500 người là 34 Gbps — nhưng đó chưa phải lý do chính. Lý do chính là **người thứ nhất nhận trước người thứ 500 vài trăm micro-giây**, và tôi vừa tự tay tạo ra một lợi thế không công bằng mà cơ quan quản lý sẽ hỏi tới."* Rồi trình bày bốn lớp phục hồi: feed A/B song song, snapshot phát lặp, gap-fill qua TCP, giới hạn nhịp chống bão phát lại.

13. **Kết thúc phần vật lý bằng chi tiết cáp dài bằng nhau — nó luôn gây ấn tượng.** *"Ở thang micro-giây, công bằng thôi là thuộc tính phần mềm và trở thành thuộc tính **vật lý**. Các sàn cuộn cáp thừa lại để mọi khách colocation có đúng cùng độ dài cáp. Và IEX còn đặt một cuộn 38 dặm trên đường vào để **cố tình làm chậm mọi người** — mua sự công bằng bằng độ trễ."*

14. **Chủ động vẽ ranh giới cloud, đừng chờ bị hỏi.** *"Nhân giao dịch không chạy trên public cloud — không phải vì AWS yếu mà vì cloud bán **tài nguyên chia sẻ** còn tôi cần **tài nguyên độc quyền**. Ranh giới của tôi rất sạch: trước sequencer là bare-metal, sau sequencer là cloud. Và chỗ cloud thắng tuyệt đối là backtest trên Spot."*

15. **Đóng lại bằng câu hỏi 'khi nào thì thiết kế này SAI'.** *"Nếu đây là sàn crypto với p99 mục tiêu 10 ms, tôi sẽ thiết kế **khác hoàn toàn**: chạy trên cloud, dùng Kafka làm sequencer, engine viết bằng Go, scale theo cặp giao dịch. Toàn bộ sự khắc nghiệt ở trên chỉ đáng giá khi khách hàng của bạn thật sự đo bằng micro-giây và sẵn sàng trả tiền cho nó."* Biết khi nào **không** cần một thiết kế là dấu hiệu trưởng thành rõ nhất mà bạn có thể thể hiện.

---

## Tổng kết cả course — 10 nguyên tắc lặp lại xuyên suốt 30 bài

Ba mươi bài, hai mươi mấy hệ thống, hàng trăm đánh đổi. Nếu phải rút ra những gì còn lại sau khi quên hết chi tiết, thì đây là mười điều — và điều thú vị là bài cuối cùng này vừa **xác nhận** chín điều, vừa **lật ngược** một điều, cho thấy chúng là nguyên tắc chứ không phải công thức.

**1. Mọi thứ đều là đánh đổi — không có "đúng", chỉ có "đúng với ràng buộc nào".** Bài này là bằng chứng mạnh nhất: "tách microservice nối bằng queue" đúng ở 29 bài và **sai hoàn toàn** ở bài 30, vì ràng buộc đổi từ *khối lượng* sang *thời gian*. Khi ai đó nói "best practice", câu hỏi đúng luôn là *"best cho ràng buộc nào?"*

**2. Ra số trước khi vẽ hộp.** Ở bài URL Shortener, con số 100K rps quyết định phải có CDN. Ở bài này, con số **500 MB** cho phép bỏ toàn bộ hệ phân tán. Ước lượng không phải nghi thức mở đầu — nó là thứ **quyết định kiến trúc**, và một con số tính đúng ở phút thứ mười tiết kiệm cho bạn nửa buổi đi sai hướng.

**3. Đọc và ghi là hai hệ thống khác nhau, hãy tách chúng ra.** URL Shortener tách redirect khỏi create; YouTube tách upload khỏi xem; Ad Click tách nhận click khỏi truy vấn tổng hợp. Ở đây sự tách đạt tới cực đoan: **ba luồng, ba ngân sách, ba thứ được tối ưu khác hẳn nhau**. Khi hai đường có yêu cầu khác nhau, ép chúng dùng chung hạ tầng là ép cả hai nhận đặc tính tệ nhất của nhau.

**4. State ở đâu quyết định mọi thứ.** Bài Consistent Hashing, KV Store, Message Queue, Nearby Friends — tất cả cuối cùng đều quy về "trạng thái nằm ở đâu và ai được ghi nó". Ở bài này, quyết định "toàn bộ state trong RAM một tiến trình, một người viết" sinh ra **mọi** thứ còn lại: đơn luồng, event sourcing, sequencer, cách làm HA, thậm chí cả cách làm tuân thủ. Chọn chỗ đặt trạng thái là quyết định kiến trúc thật sự; phần còn lại thường chỉ là hệ quả.

**5. Queue mua được decoupling, nhưng bán đi tính tức thời.** Bài Message Queue, Notification, Data Pipeline đều dùng queue để chịu tải đỉnh và cô lập lỗi — đúng đắn. Bài này cho thấy mặt sau của hoá đơn: mỗi hàng đợi là một khoản thuế độ trễ, và khi ngân sách là 100 µs thì bảy chặng gRPC đã tiêu **gấp mười lần** ngân sách trước khi làm việc gì có ích. Queue không miễn phí; nó chỉ rẻ khi bạn không phải trả bằng thời gian.

**6. Idempotency là điều kiện sống sót trong mạng không tin cậy.** Từ bài Unique ID tới Message Queue tới Email Service: "gửi đúng một lần" là ảo tưởng; thứ có thật là **"xử lý đúng một lần nhờ khoá idempotency"**. Ở đây khoá đó xuất hiện hai lần — `client_ord_id` do broker sinh, và `seq_id` do sequencer gán — và chính `seq_id` là thứ cứu bạn khỏi fill trùng khi failover. Mỗi lần bạn gửi lại một thứ gì đó, hãy hỏi: *cái gì làm cho lần thứ hai vô hại?*

**7. Cache nhanh nhưng nói dối.** Bài News Feed, Autocomplete, Proximity Service đều đánh đổi độ tươi lấy tốc độ, và đều chấp nhận được vì dữ liệu cũ vài giây không hại ai. Ở đây thì **không có cache nào cả** trên đường nóng — vì sổ lệnh cũ 1 ms là sổ lệnh **sai**, và một quyết định giao dịch dựa trên dữ liệu sai gây thiệt hại không hoàn tác được. Cache là công cụ tuyệt vời cho dữ liệu chịu được sự cũ kỹ; nó vô dụng cho dữ liệu mà *sự tươi chính là giá trị*.

**8. Càng chính xác càng đắt — hãy chọn đúng chỗ cần chính xác tuyệt đối.** Bài Ad Click dùng HyperLogLog và lấy mẫu, vì đếm sai 0,5% không ai chết. Bài Metrics chấp nhận mất điểm dữ liệu. Bài này thì **RPO = 0 và không được sai một xu** — nhưng hãy để ý: sự nghiêm khắc ấy chỉ áp dụng cho **lệnh và fill**, còn nến, thống kê, dashboard vẫn được phép gần đúng. Kỹ năng thật không phải "làm mọi thứ chính xác", mà là **vẽ đúng đường biên** giữa vùng cần chính xác tuyệt đối và vùng được phép xấp xỉ.

**9. Đuôi phân phối mới là trải nghiệm thật của người dùng, không phải trung bình.** Xuất hiện từ bài Rate Limiter, rõ hơn ở Metrics & Alerting, và trở thành chủ đề trung tâm ở đây. Với 1 triệu request/ngày, p99.9 xảy ra **1.000 lần mỗi ngày** — nó không phải trường hợp hiếm, nó là trải nghiệm thường xuyên của khách hàng lớn nhất của bạn. Và như coordinated omission cho thấy, **cách bạn đo quyết định điều bạn thấy**: đo sai thì mọi nỗ lực tối ưu sẽ nhắm vào chỗ không tồn tại.

**10. Hiểu tầng dưới bạn đang đứng trên — mọi trừu tượng đều rò rỉ.** Xuyên suốt course, mỗi lần đào sâu ta lại chạm vào một tầng thấp hơn: TCP sau HTTP, đĩa sau database, mạng sau microservice. Bài này đi tới tận đáy: cache line, NUMA, ngắt, tốc độ ánh sáng trong sợi quang. Bạn không cần viết code như vậy mỗi ngày — nhưng bạn cần biết rằng bên dưới mọi lời hứa của framework vẫn là phần cứng thật, với chi phí thật. **Người thiết kế hệ thống giỏi không phải người thuộc nhiều dịch vụ nhất, mà là người biết mỗi lớp trừu tượng đang giấu đi cái giá nào.**

> 💡 **Và điều cuối cùng, gói cả ba mươi bài trong một câu**: System Design không phải môn học về câu trả lời đúng, mà là môn học về **việc làm cho ràng buộc hiện ra thành lời**. Mọi kiến trúc trong course này — từ URL Shortener tới sàn giao dịch — đều là hệ quả logic của một tập ràng buộc được phát biểu rõ ràng. Khi bạn nghe ai đó tranh cãi "SQL hay NoSQL", "microservice hay monolith", "cloud hay on-prem" mà chưa ai nói ra con số nào, thì họ chưa bắt đầu thiết kế — họ mới đang bày tỏ sở thích. Việc đầu tiên của bạn, ở mọi buổi phỏng vấn và mọi buổi họp thiết kế thật, luôn là cùng một việc: **hỏi cho ra ràng buộc, ước lượng ra con số, rồi để kiến trúc tự lộ diện.**
