# Bài 30 — Blockchain trilemma & tổng quan mở rộng

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phát biểu chính xác **blockchain trilemma** — bộ ba **decentralization / security / scalability** — và vì sao khó có cả ba.
- Giải thích **bản chất kỹ thuật** khiến tăng throughput lại bào mòn decentralization (chứ không phải "định luật vật lý bí ẩn").
- Phân biệt hai họ mở rộng: **on-chain scaling** (block size, sharding) vs **off-chain / L2** (rollup, channel).
- Chứng minh bằng con số vì sao **tăng block size** hy sinh phi tập trung.
- Vẽ được **bản đồ các hướng scaling** để định vị mọi giải pháp bạn gặp về sau.

---

## 2. Lý thuyết

### 2.1 Analogy — quán ăn của cả khu phố

Tưởng tượng một quán ăn phục vụ cả khu phố, muốn cùng lúc ba thứ:

| Mong muốn | Tương đương blockchain | Cái giá |
|-----------|------------------------|---------|
| **Ai cũng vào bếp kiểm tra được món ăn** | Decentralization (ai cũng chạy được node) | Bếp phải nhỏ, nguyên liệu đơn giản để người thường theo dõi nổi |
| **Không ai đầu độc được món ăn** | Security (chống tấn công/gian lận) | Cần nhiều người giám sát độc lập |
| **Phục vụ thật nhanh, thật nhiều khách** | Scalability (nhiều TPS) | Phải có bếp công nghiệp, thiết bị đắt → ít người theo dõi nổi |

Muốn phục vụ **cực nhanh cho cực đông**, bạn buộc phải dùng **bếp công nghiệp khổng lồ** — và khi đó chỉ vài tập đoàn đủ tiền vận hành, **số người kiểm tra được bếp giảm mạnh**. Đó chính là trilemma: tối ưu mạnh một đỉnh thường **kéo tụt** đỉnh khác.

### 2.2 Định nghĩa ba đỉnh cho chuẩn

Thuật ngữ "blockchain trilemma" được Vitalik Buterin phổ biến. Ba đỉnh:

- **Decentralization** — số lượng và sự phân tán của các bên **độc lập** có thể **tự mình xác minh** trạng thái chuỗi (chạy full node) và tham gia đồng thuận. Thước đo thực dụng: **chi phí để chạy một full node** (CPU, RAM, băng thông, dung lượng đĩa). Node càng rẻ → càng nhiều người chạy → càng phi tập trung.
- **Security** — chi phí để **tấn công** mạng (ví dụ chiếm ≥51% hashpower/stake, hoặc làm chuỗi rẽ nhánh, đảo ngược giao dịch). Đo bằng **budget tối thiểu kẻ tấn công phải bỏ ra**.
- **Scalability** — throughput mạng xử lý được, thường đo bằng **TPS** (transactions per second) hoặc **gas/giây**, ở mức tài nguyên node **vẫn chấp nhận được**.

Điểm mấu chốt — và hay bị nói ẩu — là: trilemma **không phải một định lý toán học** cấm tuyệt đối cả ba. Nó là một **quan sát kỹ thuật** rằng với các thiết kế L1 "một lớp, đồng nhất, mọi node xác minh mọi thứ", cải thiện một đỉnh **có xu hướng** làm hại đỉnh khác. Cả bài này (và cả ngành) là câu chuyện đi tìm cách **né** ràng buộc đó.

<svg viewBox="0 0 620 360" role="img" aria-labelledby="tri-t tri-d" style="width:100%;max-width:560px;height:auto;display:block;margin:1.25rem auto">
<title id="tri-t">Blockchain trilemma</title>
<desc id="tri-d">Tam giác ba đỉnh decentralization, security, scalability; thường chỉ đạt tốt hai đỉnh cùng lúc</desc>
<polygon points="310,40 560,320 60,320" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-width="1.5"/>
<circle cx="310" cy="40" r="6" fill="currentColor"/>
<circle cx="560" cy="320" r="6" fill="currentColor"/>
<circle cx="60" cy="320" r="6" fill="currentColor"/>
<text x="310" y="26" text-anchor="middle" font-size="15" fill="currentColor">Decentralization</text>
<text x="560" y="342" text-anchor="middle" font-size="15" fill="currentColor">Scalability</text>
<text x="60" y="342" text-anchor="middle" font-size="15" fill="currentColor">Security</text>
<text x="185" y="185" text-anchor="middle" font-size="12" fill="#f59e0b">L1 truyền thống</text>
<text x="185" y="203" text-anchor="middle" font-size="12" fill="#f59e0b">(Bitcoin, Ethereum)</text>
<text x="435" y="185" text-anchor="middle" font-size="12" fill="#8b5cf6">Chuỗi high-TPS</text>
<text x="435" y="203" text-anchor="middle" font-size="12" fill="#8b5cf6">(ít validator)</text>
<text x="310" y="300" text-anchor="middle" font-size="12" fill="#14b8a6">Sidechain/DB</text>
<text x="310" y="180" text-anchor="middle" font-size="13" fill="currentColor">Chọn 2?</text>
</svg>

### 2.3 Vì sao khó có cả ba — cơ chế thật sự

Gốc rễ nằm ở một tính chất của L1 cổ điển: **mọi full node phải xử lý lại (re-execute) và lưu MỌI giao dịch** để tự xác minh trạng thái. Từ đó:

- **Muốn nhiều TPS** → mỗi giây có nhiều giao dịch hơn → mỗi node phải **tính nhiều hơn, tải nhiều hơn, lưu nhiều hơn**.
- Yêu cầu phần cứng của node tăng → **chi phí chạy node tăng** → người thường bỏ cuộc, chỉ còn data-center của số ít tổ chức → **decentralization giảm**.
- Ít node độc lập hơn → dễ **thông đồng / bị ép kiểm duyệt** hơn → gián tiếp bào mòn **security** (đặc biệt là security xã hội: khả năng cộng đồng phát hiện và từ chối một chuỗi gian lận).

Nói ngắn: **decentralization được "trả bằng" trần tài nguyên của node yếu nhất mà ta muốn giữ trong mạng.** Đây là lý do các L1 nghiêm túc cố tình giữ node đủ nhẹ để chạy trên một máy tính phổ thông.

### 2.4 Ba trục đo cụ thể để khỏi cãi cảm tính

| Đỉnh | Thước đo thực dụng | Cải thiện đỉnh này bằng cách... | ...thường làm hại |
|------|--------------------|--------------------------------|-------------------|
| Decentralization | Chi phí/năm chạy full node; số node độc lập; phân bố địa lý & client | Giữ block nhỏ, yêu cầu HW thấp | Scalability |
| Security | Budget tấn công 51%; giá trị bảo vệ được | Nhiều thợ đào/validator, giá trị stake cao | (đắt để bootstrap) |
| Scalability | TPS, gas/s, độ trễ tới finality | Block to hơn, block nhanh hơn, HW mạnh hơn | Decentralization |

---

## 3. Vì sao tăng block size hy sinh decentralization — làm bằng số

Đây là ví dụ kinh điển, và tranh cãi "big blocks" từng **chia đôi cộng đồng Bitcoin** (dẫn tới fork Bitcoin Cash 2017). Hãy tính, đừng cãi cảm tính.

Giả sử một chuỗi kiểu Bitcoin: mỗi giao dịch ~ **250 bytes**, block time ~ **10 phút** (600 giây).

```text
Với block 1 MB (~ 1,000,000 bytes):
  tx mỗi block  = 1,000,000 / 250          = 4,000 tx
  TPS           = 4,000 / 600              ≈ 6.7 TPS
  chain lớn thêm= 1 MB mỗi 10 phút
                = 6 MB/giờ = 144 MB/ngày   ≈ 52 GB/năm

Muốn 10x TPS → block 10 MB:
  TPS           ≈ 67 TPS
  chain lớn thêm= 10 MB / 10 phút
                = 1.44 GB/ngày             ≈ 525 GB/năm

Muốn 100x TPS → block 100 MB:
  TPS           ≈ 670 TPS
  chain lớn thêm≈ 14.4 GB/ngày             ≈ 5.2 TB/năm
```

Ba hệ quả **giết** decentralization khi block phình to:

1. **Dung lượng đĩa**: 5.2 TB/năm nghĩa là chỉ sau vài năm, ổ cứng của người thường không chứa nổi cả chuỗi → họ **ngừng chạy full node**.
2. **Băng thông lan truyền (propagation)**: block 100 MB phải **phát tán khắp mạng trong vài giây** trước block kế. Node ở đường truyền yếu **nhận block trễ** → dễ bị bỏ lại (orphan/stale), **bất lợi có hệ thống** cho thợ đào nhỏ và node ở khu vực mạng kém → tập trung vào vài pool lớn có kết nối tốt.
3. **Chi phí xác minh (CPU/RAM)**: mỗi block to là một đợt re-execute nặng hơn; node yếu tụt lại.

Kết quả: block to → chỉ **data-center** trụ được → **số node độc lập giảm** → **phi tập trung sụp**. Đổi lại ta chỉ mua được TPS **tuyến tính** (10x block ~ 10x TPS) — một món hời **rất tệ** so với cái giá phải trả. Đó là lý do phe "small block" của Bitcoin thắng thế: giữ block ~1–4 MB để **ai cũng chạy được node**, còn mở rộng thì đẩy lên **lớp trên (L2)**.

> **Bài học cốt lõi:** on-chain scaling bằng "block to hơn" cho **lợi ích tuyến tính** nhưng **cái giá decentralization phi tuyến** (qua propagation & storage tích lũy). Đây là lý do nó không phải con đường chính.

---

## 4. Bản đồ các hướng scaling

Chia hai họ lớn theo câu hỏi: **"khối lượng tính toán/lưu trữ được xử lý Ở ĐÂU?"**

<svg viewBox="0 0 720 420" role="img" aria-labelledby="map-t map-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="map-t">Bản đồ các hướng mở rộng blockchain</title>
<desc id="map-d">Cây phân nhánh: scaling chia thành on-chain (block size, block time, sharding) và off-chain layer 2 (channel, sidechain, rollup optimistic và zk)</desc>
<rect x="285" y="20" width="150" height="42" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="46" text-anchor="middle" font-size="14" fill="currentColor">Scaling</text>
<rect x="120" y="110" width="170" height="42" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="205" y="130" text-anchor="middle" font-size="13" fill="currentColor">On-chain (L1)</text>
<text x="205" y="146" text-anchor="middle" font-size="11" fill="currentColor">sửa chính chuỗi</text>
<rect x="430" y="110" width="170" height="42" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="515" y="130" text-anchor="middle" font-size="13" fill="currentColor">Off-chain (L2)</text>
<text x="515" y="146" text-anchor="middle" font-size="11" fill="currentColor">tính ngoài, neo vào L1</text>
<line x1="330" y1="62" x2="205" y2="110" stroke="currentColor" stroke-width="1.2"/>
<line x1="390" y1="62" x2="515" y2="110" stroke="currentColor" stroke-width="1.2"/>
<rect x="30" y="210" width="150" height="40" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="234" text-anchor="middle" font-size="12" fill="currentColor">Block to / nhanh hơn</text>
<rect x="200" y="210" width="150" height="40" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="275" y="234" text-anchor="middle" font-size="12" fill="currentColor">Sharding</text>
<line x1="180" y1="152" x2="105" y2="210" stroke="currentColor" stroke-width="1.2"/>
<line x1="230" y1="152" x2="275" y2="210" stroke="currentColor" stroke-width="1.2"/>
<rect x="390" y="210" width="120" height="40" rx="7" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="450" y="234" text-anchor="middle" font-size="12" fill="currentColor">State channel</text>
<rect x="525" y="210" width="120" height="40" rx="7" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="585" y="234" text-anchor="middle" font-size="12" fill="currentColor">Sidechain</text>
<rect x="455" y="290" width="180" height="40" rx="7" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="545" y="314" text-anchor="middle" font-size="12" fill="currentColor">Rollup (Optimistic / ZK)</text>
<line x1="480" y1="152" x2="450" y2="210" stroke="currentColor" stroke-width="1.2"/>
<line x1="530" y1="152" x2="585" y2="210" stroke="currentColor" stroke-width="1.2"/>
<line x1="540" y1="152" x2="545" y2="290" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 4"/>
<text x="545" y="356" text-anchor="middle" font-size="11" fill="currentColor">Hướng chủ đạo hiện nay — tính ngoài, chứng minh về L1</text>
</svg>

### 4.1 On-chain scaling — nới chính L1

| Hướng | Ý tưởng | Được gì | Mất gì / rủi ro |
|-------|---------|---------|-----------------|
| **Block to hơn** | Nhét nhiều tx/block | TPS tăng tuyến tính | Storage + propagation → **giết decentralization** (mục 3) |
| **Block nhanh hơn** | Giảm block time | TPS & độ trễ tốt hơn | Nhiều **orphan/fork**, thợ kết nối tốt chiếm ưu thế → tập trung |
| **Sharding** | Chia chuỗi thành nhiều **shard** song song; mỗi node chỉ giữ/xử lý **một phần** dữ liệu | Throughput tăng ~ số shard **mà không** bắt mỗi node ôm cả mạng | Rất phức tạp: **cross-shard tx**, đảm bảo mỗi shard đủ an toàn (chống "single-shard takeover"), **data availability** |

**Sharding** là câu trả lời on-chain "thông minh" nhất cho trilemma: thay vì bắt mọi node làm mọi việc (nút thắt của mục 2.3), ta để **mỗi node chỉ xác minh một mảnh**, cả mạng gộp lại xử lý được nhiều hơn — về lý thuyết tăng scalability mà **không** đội chi phí node lên tương ứng. Cái khó là an ninh: nếu chia validator ra nhiều shard, mỗi shard **ít người canh hơn** → rẻ hơn để tấn công một shard. Giải pháp hiện đại dùng **random sampling** (xáo trộn validator ngẫu nhiên vào shard để không ai chọn được shard yếu) và tách bạch **data availability** khỏi execution.

### 4.2 Off-chain / Layer 2 — đẩy việc ra ngoài, neo vào L1

Triết lý L2: **giữ L1 nhỏ, an toàn, phi tập trung; làm phần lớn tính toán ở ngoài; chỉ dùng L1 làm "toà án" và nơi chốt dữ liệu.**

| Hướng | Cách hoạt động | An ninh kế thừa từ L1? |
|-------|----------------|------------------------|
| **State / payment channel** (Lightning) | Hai bên mở kênh, giao dịch **off-chain** vô số lần, chỉ **on-chain khi mở & đóng** | Có, qua cơ chế phạt on-chain; hợp cho thanh toán 2 bên, khó cho ứng dụng tổng quát |
| **Sidechain** | Chuỗi riêng, **đồng thuận riêng**, cầu (bridge) nối với L1 | **Không** — an ninh của chính sidechain, yếu hơn |
| **Rollup — Optimistic** | Gom hàng nghìn tx, **thực thi off-chain**, đăng **dữ liệu tx nén + state root** lên L1; **mặc định tin**, ai gian lận thì bị **fraud proof** trong cửa sổ tranh chấp | **Có** — L1 lưu data & xử fraud proof |
| **Rollup — ZK (validity)** | Như trên nhưng đính kèm **zero-knowledge proof** chứng minh **toán học** rằng batch đúng | **Có** — mạnh nhất; không cần chờ cửa sổ tranh chấp |

Chìa khoá khiến **rollup** thắng thế: nó **không hy sinh decentralization của L1**. Full node L1 vẫn nhẹ như cũ (chỉ phải lưu dữ liệu tx đã nén + kiểm một proof/state root), trong khi **execution** được đẩy ra L2. Nói cách khác, rollup **né** trilemma thay vì chống lại nó: L1 lo **security + decentralization + data availability**, L2 lo **scalability**. Đây là lý do lộ trình Ethereum hiện đại là **"rollup-centric"**, và sharding của Ethereum chuyển hướng thành **data sharding / danksharding** — tức shard **chỉ để chứa data cho rollup**, không phải shard execution.

### 4.3 Tại sao "data availability" là mắt xích ẩn

Điểm tinh tế: một rollup chỉ an toàn nếu **dữ liệu giao dịch của nó thực sự công khai** để bất kỳ ai cũng dựng lại được state và thách thức gian lận. Nếu operator **giấu data**, không ai chứng minh được sai phạm. Vì thế trận chiến scaling đời mới không còn là "TPS", mà là **chi phí đăng data lên L1** — và đó là điều các nâng cấp kiểu **blob (EIP-4844) / danksharding** nhắm tới: làm **data availability** rẻ đi hàng chục lần cho L2.

---

## 5. Tình huống thực tế — chọn hướng nào?

- **Thanh toán nhỏ, tức thì, giữa hai bên quen** (ví, tip, streaming) → **payment channel** (Lightning): rẻ gần như miễn phí, tức thì, nhưng cần thanh khoản khoá trong kênh.
- **Ứng dụng tổng quát cần EVM, phí thấp, vẫn muốn an ninh Ethereum** → **rollup** (Arbitrum/Optimism kiểu optimistic, zkSync/StarkNet kiểu ZK).
- **Cần TPS khủng và chấp nhận validator ít hơn** → chuỗI high-throughput ưu tiên scalability (đánh đổi decentralization — hãy tự hỏi mình đang mua gì và trả bằng gì).
- **Doanh nghiệp, các bên tin nhau một phần** → sidechain/permissioned: nhanh, rẻ, nhưng đừng ảo tưởng nó có an ninh của L1 public.

**Bộ câu hỏi định vị bất kỳ giải pháp nào bạn gặp:**
1. Việc tính toán xảy ra **ở đâu** (on-chain hay off-chain)?
2. Nó **kế thừa an ninh L1** hay tự lo? Bằng cơ chế gì (fraud proof / validity proof / đồng thuận riêng)?
3. **Dữ liệu** có sẵn công khai để ai cũng kiểm được không (data availability)?
4. Nó **hy sinh đỉnh nào** của trilemma để lấy đỉnh nào?

---

## 6. Tóm tắt
- **Trilemma** = decentralization / security / scalability; với L1 cổ điển "mọi node xác minh mọi thứ", đẩy mạnh một đỉnh thường **kéo tụt** đỉnh khác — đây là **quan sát kỹ thuật**, không phải định lý cấm tuyệt đối.
- Cơ chế gốc: **decentralization được trả bằng trần tài nguyên của node**; nhiều TPS → node nặng hơn → ít người chạy node → kém phi tập trung.
- **Tăng block size** cho lợi ích **tuyến tính** nhưng cái giá **phi tuyến** qua storage tích luỹ + propagation → **giết decentralization** (bài học Bitcoin small-block).
- Hai họ mở rộng: **on-chain** (block size, block time, **sharding**) vs **off-chain/L2** (channel, sidechain, **rollup optimistic & ZK**).
- **Sharding** né trilemma bằng "mỗi node xác minh một mảnh"; **rollup** né bằng "đẩy execution ra L2, giữ L1 lo security + data availability". **Data availability** là mắt xích ẩn quyết định an toàn của L2.

> **Bài tiếp theo:** đi sâu vào **Layer 2 & rollup** — cơ chế fraud proof, validity proof (ZK), và cách một giao dịch thật sự "chốt" từ L2 về L1.
