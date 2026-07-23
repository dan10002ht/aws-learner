# Bài 46 — Restaking (EigenLayer) & intents

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **restaking**: tái sử dụng ETH đã stake để bảo đảm (secure) thêm dịch vụ khác, và vì sao nó ra đời.
- Mô tả kiến trúc **EigenLayer**: **restaker → operator → AVS** (Actively Validated Service), cơ chế **delegation** và **slashing**.
- Phân tích rủi ro **cascading / systemic slashing** và bài toán **pooled security** — vì sao "vốn dùng chung" là con dao hai lưỡi.
- Hiểu **intent-based architecture**: user nêu **kết quả mong muốn** thay vì đường đi cụ thể, **solver** cạnh tranh thực thi.
- Phân biệt **order flow auction (OFA)** với mô hình mempool truyền thống, và đọc được **xu hướng tương lai** của ngành.

---

## 2. Restaking — vốn bảo mật đi thuê lại

### 2.1 Analogy — một đội bảo vệ, canh nhiều cửa hàng

Hình dung một khu phố có **một đội bảo vệ giỏi** đã được thuê canh **ngân hàng lớn** (Ethereum). Họ đặt cọc một khoản tiền lớn để bảo chứng: làm bậy là **mất cọc** (bị slash). Đội này rảnh rỗi phần lớn thời gian, nên có ý tưởng: **dùng chính khoản cọc đó** để đồng thời nhận canh thêm **tiệm vàng, kho hàng, bãi xe** (các dịch vụ khác). Mỗi tiệm trả thêm phí. Rủi ro: nếu đội bảo vệ làm bậy ở **một** nơi, khoản cọc **duy nhất** đó có thể bị trừ — ảnh hưởng tới **mọi** nơi họ đang canh.

Đó chính là **restaking**: **tái sử dụng vốn bảo mật (staked ETH)** vốn chỉ bảo đảm Ethereum, để **bảo đảm thêm các dịch vụ khác** — đổi lấy phí, nhưng gánh thêm rủi ro slashing chồng lớp.

### 2.2 Vì sao restaking ra đời

Sau khi Ethereum chuyển sang **Proof-of-Stake** (The Merge, 2022), có ~hàng chục triệu ETH bị khóa làm **bảo chứng kinh tế** (economic security) cho L1. Vốn này **rất lớn nhưng chỉ làm một việc**: bảo vệ consensus của Ethereum.

Trong khi đó, nhiều dịch vụ hạ tầng **không thể** chạy như smart contract on-chain thuần: **data availability layer, oracle, bridge, sequencer của rollup, keeper/relayer, coprocessor ZK...** Mỗi dịch vụ như vậy trước đây phải **tự dựng một token + tự bootstrap một tập validator + tự gọi vốn stake** — vừa tốn kém, vừa yếu lúc mới ra (bảo mật thấp, dễ bị tấn công 34%/51%).

**EigenLayer** (do Sreeram Kannan đề xuất) đưa ra ý tưởng **pooled security / restaking**: cho các dịch vụ mới **thuê lại** phần bảo chứng ETH sẵn có, thay vì tự dựng từ đầu.

### 2.3 Ba lớp: restaker → operator → AVS

<svg viewBox="0 0 720 300" role="img" aria-labelledby="rs-t rs-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="rs-t">Kiến trúc restaking EigenLayer</title>
<desc id="rs-d">Restaker uỷ quyền staked ETH cho operator, operator opt-in vận hành nhiều AVS, mỗi AVS trả phí và có quyền slash</desc>
<rect x="20" y="110" width="130" height="80" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="85" y="140" text-anchor="middle" font-size="13" fill="currentColor">Restaker</text>
<text x="85" y="160" text-anchor="middle" font-size="11" fill="currentColor">stake / restake</text>
<text x="85" y="176" text-anchor="middle" font-size="11" fill="currentColor">ETH (hoặc LST)</text>
<rect x="270" y="110" width="130" height="80" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="335" y="140" text-anchor="middle" font-size="13" fill="currentColor">Operator</text>
<text x="335" y="160" text-anchor="middle" font-size="11" fill="currentColor">chạy node,</text>
<text x="335" y="176" text-anchor="middle" font-size="11" fill="currentColor">opt-in AVS</text>
<rect x="560" y="30" width="140" height="55" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="630" y="55" text-anchor="middle" font-size="12" fill="currentColor">AVS 1 · DA layer</text>
<text x="630" y="72" text-anchor="middle" font-size="11" fill="currentColor">trả phí + slash</text>
<rect x="560" y="122" width="140" height="55" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="630" y="147" text-anchor="middle" font-size="12" fill="currentColor">AVS 2 · Oracle</text>
<text x="630" y="164" text-anchor="middle" font-size="11" fill="currentColor">trả phí + slash</text>
<rect x="560" y="214" width="140" height="55" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="630" y="239" text-anchor="middle" font-size="12" fill="currentColor">AVS 3 · Bridge</text>
<text x="630" y="256" text-anchor="middle" font-size="11" fill="currentColor">trả phí + slash</text>
<line x1="150" y1="150" x2="268" y2="150" stroke="currentColor" stroke-width="1.5" marker-end="url(#ah2)"/>
<text x="209" y="142" text-anchor="middle" font-size="11" fill="currentColor">delegate</text>
<line x1="400" y1="140" x2="558" y2="60" stroke="currentColor" stroke-width="1.5" marker-end="url(#ah2)"/>
<line x1="400" y1="150" x2="558" y2="150" stroke="currentColor" stroke-width="1.5" marker-end="url(#ah2)"/>
<line x1="400" y1="160" x2="558" y2="240" stroke="currentColor" stroke-width="1.5" marker-end="url(#ah2)"/>
<text x="350" y="230" text-anchor="middle" font-size="11" fill="#f59e0b">1 khoản cọc bảo đảm cho NHIỀU AVS → rủi ro chồng lớp</text>
<defs><marker id="ah2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

- **Restaker**: người sở hữu ETH. Có hai đường: (a) **native restaking** — chạy validator Ethereum và trỏ **withdrawal credentials** vào EigenPod; (b) **LST restaking** — nạp **Liquid Staking Token** (stETH, rETH...) vào EigenLayer strategy. Restaker **không tự vận hành** mọi thứ, họ **delegate** cho operator.
- **Operator**: thực thể **chạy phần mềm** của từng AVS (node, ký message, phục vụ dữ liệu). Operator nhận **delegation** từ nhiều restaker, và chủ động **opt-in** (đăng ký) vào các AVS mà mình muốn phục vụ. Đây là điểm mấu chốt: **operator chọn** AVS, không phải bị ép.
- **AVS (Actively Validated Service)**: dịch vụ cần bảo chứng. AVS định nghĩa **luật slashing** (điều kiện phạt) và **cách trả thưởng**. Ví dụ EigenDA (data availability), oracle, fast-finality bridge, ZK coprocessor...

> **Delegation** tách vai trò **vốn** (restaker) khỏi vai trò **vận hành** (operator) — giống ủy quyền staking ở PoS thường, nhưng slashing giờ do **AVS** kích hoạt chứ không chỉ do consensus của Ethereum.

### 2.4 Slashing hoạt động thế nào

Mỗi AVS đăng ký một **slasher contract** với logic phạt riêng. Khi operator vi phạm luật của AVS (ví dụ ký chứng thực sai, không phục vụ dữ liệu, double-sign), AVS chứng minh vi phạm on-chain và **cắt một phần stake** đã delegate cho operator đó. Vì restaker delegate cho operator, phần bị cắt **rút từ vốn của chính họ**.

Điều quan trọng: **slashing là an toàn kinh tế "opt-in kép"** — restaker tin operator, operator tin luật của AVS. Cả EigenLayer (giai đoạn đầu) đặt **veto/kill-switch của governance** để chặn slashing lỗi do bug, vì một điều kiện slash viết sai có thể xóa sổ vốn thật.

---

## 3. Rủi ro: pooled security & cascading slashing

Restaking đánh đổi **hiệu quả vốn (capital efficiency)** lấy **rủi ro tương quan (correlated risk)**. Đây là phần "chuyên gia" phải nắm.

### 3.1 Vấn đề "một cọc, nhiều nghĩa vụ"

Nếu một operator dùng **cùng** một khối stake để bảo đảm AVS A, B, C, thì một sự cố ở A có thể **kéo theo** slash ảnh hưởng B, C — vì vốn là chung. Tệ hơn:

- **Overcommitment / rehypothecation**: tổng "giá trị bảo mật" hứa với A+B+C có thể **lớn hơn** vốn thực. Nếu nhiều AVS cùng cần đền bù một lúc, vốn **không đủ** — giống ngân hàng cho vay quá mức dự trữ.
- **Correlated failure**: nhiều AVS dùng chung một tập operator lớn. Một bug trong phần mềm operator, hoặc một điều kiện slash mơ hồ, có thể phạt **đồng loạt** phần lớn mạng.

### 3.2 Cascading / systemic slashing

<svg viewBox="0 0 700 250" role="img" aria-labelledby="cs-t cs-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="cs-t">Cascading slashing</title>
<desc id="cs-d">Một cú slash lớn khiến operator rút vốn, giảm bảo mật các AVS còn lại, kéo theo mất giá và slash tiếp</desc>
<rect x="20" y="100" width="130" height="55" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="85" y="123" text-anchor="middle" font-size="12" fill="currentColor">Slash lớn ở</text>
<text x="85" y="140" text-anchor="middle" font-size="12" fill="currentColor">AVS A (bug)</text>
<rect x="200" y="100" width="140" height="55" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="270" y="123" text-anchor="middle" font-size="12" fill="currentColor">Operators mất</text>
<text x="270" y="140" text-anchor="middle" font-size="12" fill="currentColor">vốn → tháo chạy</text>
<rect x="390" y="100" width="140" height="55" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="460" y="123" text-anchor="middle" font-size="12" fill="currentColor">AVS B,C mất</text>
<text x="460" y="140" text-anchor="middle" font-size="12" fill="currentColor">bảo chứng</text>
<rect x="560" y="100" width="130" height="55" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="625" y="123" text-anchor="middle" font-size="12" fill="currentColor">Dễ bị tấn</text>
<text x="625" y="140" text-anchor="middle" font-size="12" fill="currentColor">công → slash</text>
<line x1="150" y1="127" x2="198" y2="127" stroke="currentColor" stroke-width="1.5" marker-end="url(#ah3)"/>
<line x1="340" y1="127" x2="388" y2="127" stroke="currentColor" stroke-width="1.5" marker-end="url(#ah3)"/>
<line x1="530" y1="127" x2="558" y2="127" stroke="currentColor" stroke-width="1.5" marker-end="url(#ah3)"/>
<path d="M625,155 C625,210 85,210 85,157" fill="none" stroke="#f43f5e" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#ah3)"/>
<text x="355" y="205" text-anchor="middle" font-size="11" fill="#f43f5e">vòng lặp phản hồi (feedback loop) → systemic risk</text>
<defs><marker id="ah3" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Chuỗi domino điển hình: một điều kiện slash lỗi phạt nhầm hàng loạt operator → họ rút vốn khỏi mọi AVS → các AVS còn lại đột ngột **mất bảo chứng** → kẻ tấn công thấy chi phí tấn công (cost-of-corruption) rớt xuống → tấn công tiếp → slash tiếp. Vì ETH cũng là tài sản chung, việc bán tháo còn có thể tác động **giá** và lan sang cả bảo mật L1. Đây là lý do giới nghiên cứu (kể cả Vitalik) cảnh báo restaking **không được** kéo rủi ro tràn về **consensus của Ethereum** — nguyên tắc "**đừng overload social consensus của L1**".

### 3.3 Cơ chế giảm thiểu

| Rủi ro | Cách giảm thiểu |
|--------|-----------------|
| Điều kiện slash viết sai | **Audit + veto committee / kill-switch** giai đoạn đầu; slashing có thời gian trì hoãn (challenge window) |
| Overcommitment | **Attributable security** — mỗi AVS chỉ được đền từ phần stake **cam kết riêng** cho nó (unique/segregated stake) thay vì pool chung |
| Correlated operator | Khuyến khích **đa dạng hóa** operator & client software; giới hạn tỷ lệ stake một operator |
| Rủi ro tràn về L1 | Tách bạch bảo mật AVS khỏi consensus L1; **không** để slashing AVS đụng tới validator set của Ethereum |

---

## 4. Intents — nói kết quả, không nói đường đi

### 4.1 Từ "transaction" sang "intent"

Giao dịch (**transaction**) truyền thống là **mệnh lệnh mệnh đề chính xác**: "gọi hàm `swapExactTokensForTokens` trên router X, qua pool Y, với slippage Z, gas price G". User (hoặc ví) phải **tự tính toàn bộ đường đi** — chọn DEX, chọn route, đặt gas — rồi tự chịu MEV, trượt giá, giao dịch fail.

**Intent** đảo ngược: user chỉ **ký một tuyên bố về kết quả mong muốn** — "tôi có 1 ETH, muốn nhận **ít nhất** 3000 USDC, xong trong 2 phút" — **kèm ràng buộc** (constraints), và **để hệ thống tự lo cách làm**. User ký thứ mình **quan tâm** (điều kiện kết quả), không ký thứ mình **không quan tâm** (đường đi cụ thể).

> Nói ngắn: **transaction = HOW** (chỉ định cách thực thi). **Intent = WHAT** (chỉ định kết quả + ràng buộc, để mở phần cách làm).

### 4.2 Solver cạnh tranh thực thi

<svg viewBox="0 0 700 320" role="img" aria-labelledby="in-t in-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="in-t">Luồng intent với solver competition</title>
<desc id="in-d">User ký intent, nhiều solver cạnh tranh đưa ra cách thực thi tốt nhất, người thắng thực thi on-chain</desc>
<rect x="20" y="20" width="120" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="42" text-anchor="middle" font-size="12" fill="currentColor">User ký</text>
<text x="80" y="58" text-anchor="middle" font-size="11" fill="currentColor">intent</text>
<rect x="290" y="20" width="140" height="45" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="42" text-anchor="middle" font-size="12" fill="currentColor">Intent pool /</text>
<text x="360" y="58" text-anchor="middle" font-size="11" fill="currentColor">auction</text>
<rect x="560" y="12" width="130" height="40" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="625" y="37" text-anchor="middle" font-size="12" fill="currentColor">Solver A: 3010</text>
<rect x="560" y="62" width="130" height="40" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="625" y="87" text-anchor="middle" font-size="12" fill="currentColor">Solver B: 3025</text>
<rect x="560" y="112" width="130" height="40" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="625" y="137" text-anchor="middle" font-size="12" fill="currentColor">Solver C: 2998</text>
<line x1="140" y1="42" x2="288" y2="42" stroke="currentColor" stroke-width="1.5" marker-end="url(#ah4)"/>
<line x1="430" y1="42" x2="558" y2="32" stroke="currentColor" stroke-width="1.5" marker-end="url(#ah4)"/>
<line x1="430" y1="42" x2="558" y2="82" stroke="currentColor" stroke-width="1.5" marker-end="url(#ah4)"/>
<line x1="430" y1="42" x2="558" y2="132" stroke="currentColor" stroke-width="1.5" marker-end="url(#ah4)"/>
<rect x="480" y="200" width="200" height="55" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="580" y="223" text-anchor="middle" font-size="12" fill="currentColor">Solver B thắng (giá tốt</text>
<text x="580" y="240" text-anchor="middle" font-size="12" fill="currentColor">nhất) → thực thi on-chain</text>
<line x1="625" y1="102" x2="600" y2="198" stroke="#10b981" stroke-width="1.5" marker-end="url(#ah4)"/>
<rect x="20" y="200" width="200" height="55" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="223" text-anchor="middle" font-size="12" fill="currentColor">User nhận ≥ 3000 USDC</text>
<text x="120" y="240" text-anchor="middle" font-size="11" fill="currentColor">(được đảm bảo bởi constraint)</text>
<line x1="480" y1="230" x2="222" y2="230" stroke="currentColor" stroke-width="1.5" marker-end="url(#ah4)"/>
<text x="360" y="295" text-anchor="middle" font-size="11" fill="#f59e0b">Cạnh tranh giữa solver ép giá tốt về cho user; phần MEV bị "đấu giá" thay vì bị lấy lén</text>
<defs><marker id="ah4" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Solver** (còn gọi filler, market maker, executor) là các thực thể chuyên nghiệp cạnh tranh để **thực hiện intent**. Cho mỗi intent, nhiều solver **báo giá** cách thực thi tốt nhất của mình (qua nhiều DEX, gộp lệnh, dùng vốn riêng, thậm chí cross-chain). **Solver thắng** là bên đưa **kết quả tốt nhất cho user** (nhiều USDC nhất, nhanh nhất). Vì cạnh tranh, **surplus** (phần dôi ra, gồm cả MEV) bị **ép trả về cho user** thay vì bị bòn rút.

Điểm mấu chốt bảo mật: **constraint trong intent là bất khả xâm phạm**. Dù solver làm gì, nếu kết quả **không** đạt "≥ 3000 USDC" thì contract **revert** — solver không thể lừa. User chỉ trao **quyền tự do về cách làm**, không trao **quyền vi phạm kết quả**.

Ví dụ thực tế:
- **CoW Protocol** (CoW Swap): batch auction, solver cạnh tranh, có "Coincidence of Wants" (khớp trực tiếp hai user ngược chiều, không cần AMM).
- **UniswapX / 1inch Fusion**: swap kiểu Dutch auction off-chain, filler cạnh tranh, bảo vệ khỏi MEV.
- **Across / cross-chain intents**: user nêu "muốn X token ở chain B", relayer ứng vốn trước rồi settle sau.

### 4.3 Order flow auction (OFA)

Mempool công khai truyền thống để lộ giao dịch **trước khi** lên block → searcher/builder **sandwich, frontrun** → MEV bị lấy khỏi user. **Order flow auction** đảo mô hình: **đấu giá quyền được thực thi luồng lệnh của user**.

<svg viewBox="0 0 700 210" role="img" aria-labelledby="ofa-t ofa-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="ofa-t">Mempool công khai vs Order Flow Auction</title>
<desc id="ofa-d">So sánh: mempool để lộ lệnh cho MEV bòn rút, còn OFA đấu giá luồng lệnh trả lại giá trị cho user</desc>
<text x="175" y="24" text-anchor="middle" font-size="13" fill="currentColor">Mempool công khai</text>
<rect x="60" y="45" width="230" height="45" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="175" y="66" text-anchor="middle" font-size="11" fill="currentColor">Lệnh lộ ra → searcher</text>
<text x="175" y="82" text-anchor="middle" font-size="11" fill="currentColor">sandwich / frontrun</text>
<text x="175" y="120" text-anchor="middle" font-size="11" fill="#f43f5e">MEV rời khỏi user →</text>
<text x="175" y="136" text-anchor="middle" font-size="11" fill="#f43f5e">về builder/searcher</text>
<line x1="350" y1="30" x2="350" y2="185" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<text x="525" y="24" text-anchor="middle" font-size="13" fill="currentColor">Order Flow Auction</text>
<rect x="410" y="45" width="230" height="45" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="525" y="66" text-anchor="middle" font-size="11" fill="currentColor">Luồng lệnh được đấu giá</text>
<text x="525" y="82" text-anchor="middle" font-size="11" fill="currentColor">giữa các bên thực thi</text>
<text x="525" y="120" text-anchor="middle" font-size="11" fill="#10b981">Phần MEV được hoàn</text>
<text x="525" y="136" text-anchor="middle" font-size="11" fill="#10b981">(rebate) về cho user/ví</text>
<text x="350" y="175" text-anchor="middle" font-size="11" fill="currentColor">OFA nội hoá MEV: biến giá trị bị lấy lén thành khoản đấu giá minh bạch trả lại người dùng</text>
</svg>

Trong OFA, ví/ứng dụng gửi order flow tới một **auction** thay vì mempool công khai. Các bên (solver/builder) **trả giá** cho quyền được thực thi — và phần thắng thầu (chính là phần MEV) được **hoàn (rebate)** về cho user hoặc ví. Đây là bước tiến của tư duy **PBS** (Proposer-Builder Separation, MEV-Boost) từ Bài 45: thay vì để MEV bị bòn rút, ta **đấu giá nó một cách minh bạch** rồi trả lại giá trị cho nguồn tạo ra nó (user).

---

## 5. So sánh nhanh: transaction vs intent

| Tiêu chí | Transaction (truyền thống) | Intent |
|----------|----------------------------|--------|
| **User chỉ định** | Đường đi chính xác (route, DEX, gas) | Kết quả + ràng buộc (min output, deadline) |
| **Ai lo cách thực thi** | User / ví | Solver cạnh tranh |
| **MEV** | Dễ bị sandwich/frontrun | Được cạnh tranh/hoàn về user (OFA) |
| **Cross-chain** | User tự cầu nối từng bước | Solver ứng vốn, trừu tượng hoá |
| **Rủi ro** | Giao dịch fail, trượt giá | Solver trung tâm hoá, phụ thuộc off-chain infra |
| **UX** | Phức tạp, nhiều bước | Ký một lần, "được việc" |

Đánh đổi của intent: đơn giản & giá tốt hơn cho user, nhưng **rủi ro tập trung hoá** (solver mạnh thành oligopoly), phụ thuộc **hạ tầng off-chain** (relayer, auction), và cần **contract settlement** bảo đảm constraint đúng.

---

## 6. Xu hướng tương lai của ngành

- **Modular + shared security**: rollup, DA layer, bridge... **thuê bảo chứng** qua restaking (EigenLayer, Symbiotic, Babylon dùng BTC) thay vì mỗi dự án tự bootstrap. Bảo mật trở thành **hàng hoá có thể mua**.
- **Intent-centric everything**: ví và ứng dụng chuyển sang "ký kết quả", ẩn hoàn toàn chain/route khỏi user — hợp lưu với **account abstraction (ERC-4337)** và **chain abstraction** (user không cần biết mình đang ở chain nào).
- **MEV được nội hoá**: từ frontrun lén lút → **OFA + đấu giá minh bạch + rebate**; MEV-Boost/PBS tiến hoá lên **enshrined PBS** và **encrypted mempool** (threshold encryption) để chống frontrun tận gốc.
- **Solver/operator chuyên nghiệp hoá**: xuất hiện tầng lớp trung gian mạnh (solver, operator, builder) — hiệu quả cao nhưng đặt ra bài toán **tập trung hoá & kiểm duyệt** mới cần cân bằng.
- **Rủi ro hệ thống mới**: restaking + intent tạo các **liên kết chồng chéo** giữa các giao thức; ngành đang học cách đo và giới hạn **correlated/systemic risk** — đây là mặt trận nghiên cứu nóng nhất (crypto-economic security).

---

## 7. Tóm tắt
- **Restaking** = tái sử dụng staked ETH để bảo đảm thêm dịch vụ (AVS), tăng **hiệu quả vốn** nhưng thêm **rủi ro slashing chồng lớp**.
- Kiến trúc EigenLayer 3 lớp: **restaker** (vốn) → **operator** (vận hành, opt-in AVS) → **AVS** (dịch vụ, định luật slash & thưởng), gắn kết bằng **delegation**.
- Rủi ro lớn nhất là **cascading / systemic slashing** và **overcommitment**; giảm thiểu bằng attributable/segregated stake, veto committee, và nguyên tắc **không tràn rủi ro về consensus L1**.
- **Intent** đảo tư duy từ "chỉ định cách làm (HOW)" sang "nêu kết quả + ràng buộc (WHAT)"; **solver cạnh tranh** thực thi, constraint on-chain đảm bảo user không bị lừa.
- **Order flow auction** nội hoá MEV: đấu giá luồng lệnh minh bạch và **hoàn giá trị** về user thay vì để bị bòn rút ở mempool công khai.
- Tương lai: **shared security + intent-centric UX + MEV nội hoá** — mạnh về hiệu quả nhưng buộc ngành đối mặt bài toán **tập trung hoá & rủi ro hệ thống** mới.

> **Bài tiếp theo:** tổng kết lộ trình & định hướng trở thành chuyên gia — cách đọc paper, audit hợp đồng, và theo kịp một ngành thay đổi từng quý.
