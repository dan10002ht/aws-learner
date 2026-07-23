# Bài 27 — Lending/borrowing & stablecoin

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **over-collateralized lending** (Aave/Compound) và tại sao DeFi **không** cho vay tín chấp như ngân hàng.
- Tính **collateral factor**, **borrow capacity** và **health factor** — con số quyết định bạn có bị thanh lý hay không.
- Đọc **interest rate model** theo **utilization** (kinked curve): vì sao lãi suất nhảy vọt khi pool cạn thanh khoản.
- Mô tả cơ chế **liquidation** & **liquidation bonus**, ai là người thanh lý và vì sao họ có động lực.
- Phân loại stablecoin: **fiat-backed** (USDC), **crypto-backed/CDP** (DAI), **algorithmic** — và mổ xẻ **vì sao UST sụp đổ**.

---

## 2. Lý thuyết

### 2.1 Analogy — tiệm cầm đồ tự động, không cần nhân viên

Ngân hàng cho vay dựa trên **niềm tin về danh tính**: họ biết bạn là ai, chấm điểm tín dụng, đòi nợ qua toà nếu bạn quỵt. On-chain thì **không có danh tính, không có toà án** — một địa chỉ ví có thể vay xong biến mất. Vậy làm sao cho vay an toàn?

Câu trả lời của DeFi là mô hình **tiệm cầm đồ**: muốn vay, bạn phải **thế chấp một tài sản có giá trị LỚN HƠN khoản vay** và khoá nó trong smart contract. Nếu bạn không trả, contract **tịch thu và bán** tài sản thế chấp để thu hồi. Không cần biết bạn là ai — chỉ cần tài sản đủ giá trị. Đó là **over-collateralization** (thế chấp vượt mức).

> Vì sao "vượt mức"? Vì giá crypto biến động mạnh. Thế chấp 100$ ETH mà cho vay 100$ thì chỉ cần ETH rớt 1% là khoản vay đã **dưới nước** (under-collateralized) — không ai muốn thanh lý một tài sản đang lỗ. Buộc phải có **đệm an toàn**.

### 2.2 Vì sao không cho vay tín chấp?

Vay tín chấp (undercollateralized) đòi hỏi **danh tính + hậu quả pháp lý** khi quỵt nợ. Blockchain cố tình **pseudonymous** và **không thể đảo ngược** — không có cơ chế cưỡng chế người vặc nợ. Nên DeFi thuần tuý gần như luôn **over-collateralized**. (Có ngoại lệ như flash loan — vay & trả trong **cùng 1 transaction**, bài riêng — hoặc under-collateralized qua credit delegation / danh tính off-chain, nhưng đó là ngoại lệ.)

### 2.3 Pool-based lending: Aave & Compound hoạt động thế nào

Không phải người-cho-vay khớp trực tiếp với người-đi-vay. Thay vào đó có một **liquidity pool chung** cho mỗi tài sản:

<svg viewBox="0 0 700 300" role="img" aria-labelledby="pool-t pool-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="pool-t">Mô hình pool-based lending</title>
<desc id="pool-d">Người gửi nạp tài sản vào pool nhận về token lãi, người vay thế chấp để rút thanh khoản từ pool và trả lãi</desc>
<rect x="270" y="110" width="160" height="80" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="145" text-anchor="middle" font-size="14" fill="currentColor">Liquidity Pool</text>
<text x="350" y="165" text-anchor="middle" font-size="12" fill="currentColor">(USDC dự trữ)</text>
<rect x="30" y="60" width="150" height="55" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="85" text-anchor="middle" font-size="13" fill="currentColor">Supplier</text>
<text x="105" y="103" text-anchor="middle" font-size="11" fill="currentColor">gửi USDC</text>
<rect x="30" y="185" width="150" height="55" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="210" text-anchor="middle" font-size="13" fill="currentColor">Borrower</text>
<text x="105" y="228" text-anchor="middle" font-size="11" fill="currentColor">thế chấp ETH</text>
<rect x="520" y="60" width="150" height="55" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="595" y="82" text-anchor="middle" font-size="12" fill="currentColor">nhận aToken/cToken</text>
<text x="595" y="100" text-anchor="middle" font-size="11" fill="currentColor">(tự sinh lãi)</text>
<rect x="520" y="185" width="150" height="55" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="595" y="210" text-anchor="middle" font-size="12" fill="currentColor">rút USDC vay</text>
<text x="595" y="228" text-anchor="middle" font-size="11" fill="currentColor">+ trả lãi theo giờ</text>
<line x1="180" y1="90" x2="268" y2="130" stroke="currentColor" stroke-width="1.5" marker-end="url(#pa)"/>
<line x1="180" y1="212" x2="268" y2="170" stroke="currentColor" stroke-width="1.5" marker-end="url(#pa)"/>
<line x1="430" y1="130" x2="518" y2="90" stroke="currentColor" stroke-width="1.5" marker-end="url(#pa)"/>
<line x1="430" y1="170" x2="518" y2="210" stroke="currentColor" stroke-width="1.5" marker-end="url(#pa)"/>
<text x="350" y="270" text-anchor="middle" font-size="11" fill="currentColor">Lãi người vay trả → chảy về pool → làm tăng giá trị aToken/cToken người gửi nắm giữ</text>
<defs><marker id="pa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

- **Supplier** nạp USDC vào pool, nhận lại **aToken** (Aave) hoặc **cToken** (Compound) đại diện phần sở hữu + lãi tích luỹ. aToken có tỷ lệ 1:1 và số dư **tự tăng**; cToken giữ nguyên số lượng nhưng **tỷ giá quy đổi** (exchange rate) tăng dần.
- **Borrower** khoá tài sản thế chấp (ví dụ ETH), rồi vay ra USDC. Họ trả lãi theo từng block; lãi này chảy về pool nuôi lợi suất cho supplier.
- Lãi vay **luôn > lãi gửi** — chênh lệch là **reserve factor** (một phần dành cho protocol treasury / bảo hiểm).

### 2.4 Collateral factor & borrow capacity

Mỗi tài sản thế chấp có một **collateral factor** (Compound) hay **LTV — Loan-To-Value** (Aave): tỷ lệ % giá trị mà bạn được phép vay dựa trên nó.

$$\text{Borrow Capacity} = \sum_i (\text{giá trị thế chấp}_i \times \text{collateral factor}_i)$$

Ví dụ ETH có collateral factor 0.80 (80%). Bạn khoá 10.000$ ETH → được vay tối đa 8.000$ giá trị tài sản khác. 2.000$ còn lại là **đệm** hấp thụ biến động giá và tạo margin cho người thanh lý.

Tài sản càng biến động / kém thanh khoản → collateral factor càng **thấp** (đệm dày hơn). Stablecoin thường được factor cao (0.85–0.90) vì giá ổn định.

### 2.5 Health factor — con số sinh tử

**Health factor (HF)** đo mức độ an toàn của vị thế vay:

$$\text{HF} = \frac{\sum_i (\text{giá trị thế chấp}_i \times \text{liquidation threshold}_i)}{\text{tổng nợ (gồm lãi)}}$$

- **HF > 1**: an toàn. Càng cao càng xa nguy cơ.
- **HF = 1**: ngay ngưỡng — chỉ cần giá nhích xấu là bị thanh lý.
- **HF < 1**: vị thế **under-collateralized** → **có thể bị thanh lý** ngay.

> Lưu ý Aave tách **LTV** (giới hạn lúc vay) và **liquidation threshold** (ngưỡng bị thanh lý, luôn ≥ LTV). Khoảng giữa hai mức này là **vùng cảnh báo**: bạn không vay thêm được nhưng chưa bị thanh lý.

**Ví dụ số:** thế chấp 10.000$ ETH, liquidation threshold 0.825, đang nợ 6.000$ USDC.
HF = (10.000 × 0.825) / 6.000 = 8.250 / 6.000 = **1.375** → an toàn.
Nếu ETH rớt 30% → thế chấp còn 7.000$. HF = (7.000 × 0.825) / 6.000 = **0.9625 < 1** → bị thanh lý.

### 2.6 Lãi suất theo utilization — kinked interest rate model

Lãi suất **không cố định** mà là hàm của **utilization rate** U — tỷ lệ pool đang được vay:

$$U = \frac{\text{tổng vay}}{\text{tổng cung}} = \frac{\text{Borrows}}{\text{Cash} + \text{Borrows}}$$

Mô hình **kinked** (gấp khúc) có một điểm gãy **optimal utilization** $U^*$ (thường ~80–90%):
- Khi $U < U^*$: lãi tăng **thoải mai** theo độ dốc thấp — khuyến khích vay.
- Khi $U > U^*$: lãi tăng **dốc đứng** — trừng phạt việc vay quá nhiều, kéo người vay trả nợ & hút thêm supplier, để pool **luôn còn thanh khoản** cho người gửi rút.

<svg viewBox="0 0 700 320" role="img" aria-labelledby="kink-t kink-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="kink-t">Đường lãi suất gấp khúc theo utilization</title>
<desc id="kink-d">Trục ngang là utilization, trục dọc là lãi suất, đường lãi thoải trước điểm optimal và dốc đứng sau đó</desc>
<line x1="70" y1="270" x2="640" y2="270" stroke="currentColor" stroke-width="1.5" marker-end="url(#ka)"/>
<line x1="70" y1="270" x2="70" y2="40" stroke="currentColor" stroke-width="1.5" marker-end="url(#ka)"/>
<text x="360" y="305" text-anchor="middle" font-size="12" fill="currentColor">Utilization U (%)</text>
<text x="24" y="150" text-anchor="middle" font-size="12" fill="currentColor" transform="rotate(-90 24 150)">Lãi suất</text>
<rect x="70" y="40" width="470" height="230" fill="#3b82f6" fill-opacity="0.06" stroke="none"/>
<rect x="540" y="40" width="100" height="230" fill="#f43f5e" fill-opacity="0.10" stroke="none"/>
<line x1="70" y1="250" x2="540" y2="180" stroke="#3b82f6" stroke-width="2.5"/>
<line x1="540" y1="180" x2="620" y2="55" stroke="#f43f5e" stroke-width="2.5"/>
<line x1="540" y1="270" x2="540" y2="180" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<circle cx="540" cy="180" r="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="540" y="288" text-anchor="middle" font-size="11" fill="currentColor">U* (optimal ~80%)</text>
<text x="70" y="262" text-anchor="start" font-size="11" fill="currentColor">base rate</text>
<text x="300" y="200" text-anchor="middle" font-size="12" fill="currentColor">dốc thoải: khuyến khích vay</text>
<text x="600" y="100" text-anchor="middle" font-size="11" fill="currentColor">dốc đứng:</text>
<text x="600" y="116" text-anchor="middle" font-size="11" fill="currentColor">phạt cạn pool</text>
<defs><marker id="ka" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Công thức borrow rate điển hình:

$$R_{borrow} = \begin{cases} R_{base} + \dfrac{U}{U^*}\,R_{slope1} & U \le U^* \\[6pt] R_{base} + R_{slope1} + \dfrac{U - U^*}{1 - U^*}\,R_{slope2} & U > U^* \end{cases}$$

Với $R_{slope2}$ rất lớn (ví dụ 60–100%/năm). Lãi gửi bằng $R_{borrow} \times U \times (1 - \text{reserve factor})$ — supplier chỉ hưởng lãi trên **phần thực sự được vay**, nên U thấp thì lợi suất gửi cũng thấp.

### 2.7 Liquidation & liquidation bonus

Khi HF < 1, vị thế **mở cửa cho bất kỳ ai** (thường là **bot arbitrage**) đứng ra **thanh lý**:

<svg viewBox="0 0 700 250" role="img" aria-labelledby="liq-t liq-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="liq-t">Luồng thanh lý một vị thế under-collateralized</title>
<desc id="liq-d">Liquidator trả một phần nợ thay borrower và nhận lại tài sản thế chấp kèm phần thưởng chiết khấu</desc>
<rect x="30" y="95" width="140" height="60" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="100" y="122" text-anchor="middle" font-size="13" fill="currentColor">Vị thế HF &lt; 1</text>
<text x="100" y="140" text-anchor="middle" font-size="11" fill="currentColor">nợ 6.000$</text>
<rect x="280" y="95" width="150" height="60" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="355" y="122" text-anchor="middle" font-size="13" fill="currentColor">Liquidator (bot)</text>
<text x="355" y="140" text-anchor="middle" font-size="11" fill="currentColor">trả 3.000$ nợ</text>
<rect x="540" y="95" width="140" height="60" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="610" y="118" text-anchor="middle" font-size="12" fill="currentColor">nhận collateral</text>
<text x="610" y="135" text-anchor="middle" font-size="11" fill="currentColor">3.000$ + bonus 5%</text>
<text x="610" y="150" text-anchor="middle" font-size="11" fill="currentColor">= 3.150$ ETH</text>
<line x1="170" y1="125" x2="278" y2="125" stroke="currentColor" stroke-width="1.5" marker-end="url(#la)"/>
<line x1="430" y1="125" x2="538" y2="125" stroke="currentColor" stroke-width="1.5" marker-end="url(#la)"/>
<text x="355" y="200" text-anchor="middle" font-size="11" fill="currentColor">Lời của liquidator = liquidation bonus. Nợ borrower giảm, HF được kéo trở lại &gt; 1.</text>
<defs><marker id="la" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

- Liquidator **trả thay** một phần nợ (thường tối đa **close factor** ~50% khoản nợ mỗi lần).
- Đổi lại, họ nhận tài sản thế chấp tương ứng **cộng thêm liquidation bonus** (5–15%, tuỳ tài sản) — mua collateral **giá chiết khấu**.
- Bonus này chính là **động lực kinh tế** để bot lao vào thanh lý ngay khi HF < 1, giữ protocol **luôn đủ tài sản đảm bảo**. Không có bonus thì chẳng ai chịu rủi ro thay protocol.
- Rủi ro hệ thống: nếu giá rớt **quá nhanh** (như "Black Thursday" 3/2020 của MakerDAO) hoặc gas quá cao khiến bot không kịp thanh lý, collateral có thể tụt dưới nợ → phát sinh **bad debt** mà protocol phải gánh (qua safety module / bảo hiểm).

Minh hoạ logic thanh lý (giản lược, kiểu Aave):

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPriceOracle { function getPrice(address asset) external view returns (uint256); }

contract LiquidationLogic {
    uint256 constant BONUS_BPS = 500;       // 5% bonus
    uint256 constant CLOSE_FACTOR_BPS = 5000; // tối đa trả 50% nợ mỗi lần
    IPriceOracle oracle;

    // Trả `repayAmount` nợ `debtAsset` cho `user`, nhận `collateralAsset` + bonus
    function liquidate(
        address user,
        address collateralAsset,
        address debtAsset,
        uint256 repayAmount
    ) external {
        uint256 hf = healthFactor(user);
        require(hf < 1e18, "HF >= 1: khong the thanh ly"); // 1.0 scaled 1e18

        uint256 totalDebt = debtOf(user, debtAsset);
        uint256 maxRepay = (totalDebt * CLOSE_FACTOR_BPS) / 10_000;
        require(repayAmount <= maxRepay, "vuot close factor");

        // Quy đổi số nợ đã trả -> lượng collateral tương ứng theo giá oracle
        uint256 debtPrice = oracle.getPrice(debtAsset);
        uint256 collPrice = oracle.getPrice(collateralAsset);
        uint256 baseColl = (repayAmount * debtPrice) / collPrice;

        // Cộng bonus: liquidator nhận nhiều collateral hơn giá trị nợ đã trả
        uint256 collateralToSeize = baseColl + (baseColl * BONUS_BPS) / 10_000;

        _pullDebtRepayment(msg.sender, debtAsset, repayAmount); // bot trả nợ
        _reduceDebt(user, debtAsset, repayAmount);
        _seizeCollateral(user, collateralAsset, msg.sender, collateralToSeize);
    }

    function healthFactor(address user) public view returns (uint256) { /* ... */ }
    function debtOf(address, address) internal view returns (uint256) { /* ... */ }
    function _pullDebtRepayment(address, address, uint256) internal {}
    function _reduceDebt(address, address, uint256) internal {}
    function _seizeCollateral(address, address, address, uint256) internal {}
}
```

Điểm cốt lõi: `require(hf < 1e18)` chặn thanh lý khi vị thế còn khoẻ; `BONUS_BPS` là chiết khấu thưởng cho bot; `CLOSE_FACTOR` giới hạn mỗi lần chỉ dọn một phần để không "làm quá tay" khiến borrower mất trắng.

---

## 3. Stablecoin — đồng tiền neo giá

Lending cần một đơn vị **giá ổn định** để tính nợ/lãi — đó là lý do **stablecoin** là xương sống của DeFi. Có 3 mô hình chính, đánh đổi giữa **phi tập trung** và **độ ổn định**:

| Loại | Ví dụ | Backing | Cơ chế neo | Rủi ro chính |
|------|-------|---------|-----------|--------------|
| **Fiat-backed** | USDC, USDT | USD + trái phiếu trong ngân hàng | 1 token = 1$ dự trữ, redeem qua issuer | Tập trung; kiểm duyệt/đóng băng; rủi ro ngân hàng giữ tiền |
| **Crypto-backed (CDP)** | DAI, LUSD | Crypto thế chấp vượt mức on-chain | Over-collateral + thanh lý, giữ peg | Biến động collateral; phụ thuộc oracle |
| **Algorithmic** | UST (sụp), FRAX (lai) | Không / một phần | Thuật toán mint-burn điều tiết cung | Death spiral khi mất niềm tin |

### 3.1 Fiat-backed — USDC

Cơ chế đơn giản nhất: mỗi USDC được **Circle** phát hành đối ứng với **1 USD** (tiền mặt + trái phiếu chính phủ ngắn hạn) giữ ở ngân hàng, có kiểm toán (attestation) định kỳ. Muốn đổi ngược ra USD, bạn redeem qua issuer.

- **Ưu**: peg cực chắc, đơn giản, thanh khoản khổng lồ.
- **Nhược**: **tập trung hoàn toàn** — issuer có thể **freeze/blacklist** địa chỉ (đã xảy ra theo lệnh chính phủ). Bạn phải **tin** Circle giữ đủ dự trữ và ngân hàng không sập. Tháng 3/2023, USDC **depeg xuống ~0.88$** vài ngày vì 3,3 tỷ$ dự trữ kẹt ở Silicon Valley Bank đang phá sản — cho thấy fiat-backed vẫn dính **rủi ro hệ thống ngân hàng truyền thống**.

### 3.2 Crypto-backed / CDP — DAI của MakerDAO

DAI được sinh ra **on-chain, không cần ngân hàng**, qua **CDP (Collateralized Debt Position)** / Vault:

1. Bạn khoá crypto (ETH, wBTC...) vào một **Vault**.
2. Vault cho phép **mint DAI** tối đa tới một tỷ lệ thế chấp (ví dụ collateral ratio tối thiểu **150%** → khoá 150$ ETH mint tối đa 100 DAI).
3. Trả lại DAI + **stability fee** (lãi) để mở khoá collateral.
4. Nếu tỷ lệ thế chấp tụt dưới ngưỡng → Vault bị **thanh lý** (đấu giá collateral), giống hệt cơ chế lending ở phần 2.

Peg giữ ở ~1$ nhờ **arbitrage + tham số điều tiết** (stability fee, DSR — Dai Savings Rate). DAI > 1$ → mint thêm rẻ để bán; DAI < 1$ → mua rẻ trả nợ để mở collateral.

- **Ưu**: phi tập trung hơn, minh bạch on-chain, không xin phép ai.
- **Nhược**: **vốn kém hiệu quả** (phải khoá 150%+), phụ thuộc **oracle giá** và sức khoẻ collateral. (Ngày nay DAI đã pha nhiều USDC làm dự trữ → bớt "thuần crypto", đánh đổi lấy ổn định.)

> Bản chất: **CDP chính là một khoản lending tự-vay-tự-mint** — bạn vay chính stablecoin của giao thức bằng cách thế chấp vượt mức. Hiểu phần 2 là hiểu luôn cơ chế đúc DAI.

### 3.3 Algorithmic & bài học UST

Stablecoin **thuật toán** cố neo giá **mà không cần (hoặc gần như không cần) tài sản dự trữ**, thay bằng **cơ chế cung-cầu tự động**. Terra/UST là ví dụ khét tiếng nhất — và là ví dụ về **death spiral**.

Cơ chế UST–LUNA: luôn cho phép **swap 1 UST ↔ 1$ giá trị LUNA** (mint/burn):
- UST > 1$: burn 1$ LUNA để mint 1 UST bán ra → đẩy giá về 1$.
- UST < 1$: mua UST rẻ, burn lấy 1$ LUNA → co cung UST, đẩy giá lên.

Cái neo này **chỉ đúng nếu LUNA còn giá trị**. Vấn đề: **backing chính là token của chính hệ thống** — một dạng phản xạ (reflexive) nguy hiểm. Lợi suất **~20%/năm** từ Anchor Protocol hút hàng chục tỷ$ vào UST một cách **không bền vững**.

<svg viewBox="0 0 700 300" role="img" aria-labelledby="spiral-t spiral-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="spiral-t">Death spiral của UST và LUNA</title>
<desc id="spiral-d">Vòng lặp tự khuếch đại khi UST mất peg buộc mint thêm LUNA làm LUNA sập giá và càng phá vỡ peg</desc>
<rect x="270" y="20" width="160" height="50" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="42" text-anchor="middle" font-size="12" fill="currentColor">UST rớt dưới 1$</text>
<text x="350" y="60" text-anchor="middle" font-size="11" fill="currentColor">(niềm tin lung lay)</text>
<rect x="500" y="120" width="170" height="55" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="585" y="143" text-anchor="middle" font-size="12" fill="currentColor">burn UST → mint LUNA</text>
<text x="585" y="161" text-anchor="middle" font-size="11" fill="currentColor">cung LUNA phình to</text>
<rect x="270" y="225" width="160" height="55" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="248" text-anchor="middle" font-size="12" fill="currentColor">giá LUNA sụp</text>
<text x="350" y="266" text-anchor="middle" font-size="11" fill="currentColor">backing bốc hơi</text>
<rect x="30" y="120" width="170" height="55" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="143" text-anchor="middle" font-size="12" fill="currentColor">hoảng loạn rút UST</text>
<text x="115" y="161" text-anchor="middle" font-size="11" fill="currentColor">bán tháo hàng loạt</text>
<line x1="430" y1="55" x2="520" y2="120" stroke="currentColor" stroke-width="1.5" marker-end="url(#sa)"/>
<line x1="560" y1="175" x2="410" y2="228" stroke="currentColor" stroke-width="1.5" marker-end="url(#sa)"/>
<line x1="285" y1="252" x2="150" y2="177" stroke="currentColor" stroke-width="1.5" marker-end="url(#sa)"/>
<line x1="130" y1="120" x2="290" y2="65" stroke="currentColor" stroke-width="1.5" marker-end="url(#sa)"/>
<text x="350" y="150" text-anchor="middle" font-size="12" fill="#f43f5e">VÒNG XOÁY TỬ THẦN</text>
<text x="350" y="168" text-anchor="middle" font-size="11" fill="currentColor">càng cứu peg càng in LUNA</text>
<defs><marker id="sa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Death spiral (5/2022):** một cú rút lớn khỏi Anchor + bán UST đẩy giá xuống dưới 1$. Người dùng đổ xô **burn UST → mint LUNA** để cứu 1$, nhưng điều đó **in ra hàng nghìn tỷ LUNA**, khiến giá LUNA **sụp từ 80$ về gần 0** trong vài ngày. LUNA càng rẻ, backing của UST càng bốc hơi, càng nhiều người tháo chạy → **vòng lặp tự khuếch đại** không có đáy. ~40 tỷ$ vốn hoá bốc hơi.

**Bài học cốt lõi:**
- Stablecoin **không có tài sản đảm bảo thực** dựa vào **token nội bộ phản xạ** → cực kỳ mong manh khi niềm tin mất.
- Lợi suất cao **phi thực tế** (20%) là dấu hiệu mô hình **trợ giá bằng vốn mới**, không bền vững — kiểu Ponzi.
- Peg giữ được **lúc bình yên** không chứng minh được gì; chỉ **stress lúc bán tháo** mới lộ tẩy.
- Sau UST, xu hướng nghiêng về **fiat-backed** và **crypto-backed over-collateralized**; algorithmic thuần tuý gần như bị khai tử. FRAX là mô hình **lai** (một phần dự trữ + một phần thuật toán) tồn tại nhưng ngày càng tăng tỷ lệ dự trữ.

---

## 4. So sánh Aave vs Compound (thực hành nhanh)

| Tiêu chí | Compound | Aave |
|----------|----------|------|
| Token đại diện gửi | **cToken** (exchange rate tăng) | **aToken** (số dư rebase tăng) |
| Chỉ số an toàn | account liquidity | **health factor** |
| Lãi suất | kinked theo utilization | kinked (stable & variable rate) |
| Tính năng đặc trưng | governance COMP | **flash loan**, isolation mode, e-mode |
| Ngưỡng thanh lý | collateral factor | LTV tách khỏi liquidation threshold |

Trong thực chiến: luôn theo dõi **health factor**, giữ đệm rộng (HF ≥ 1.5–2), cảnh giác **oracle risk** và **cascading liquidation** khi thị trường sập đồng loạt.

---

## 5. Tóm tắt
- DeFi lending là **over-collateralized** vì không có danh tính/toà án để đòi nợ tín chấp — mô hình "tiệm cầm đồ" on-chain.
- **Collateral factor/LTV** quyết định vay tối đa; **health factor** quyết định khi nào bị thanh lý (HF < 1 → mở cửa thanh lý).
- Lãi suất chạy theo **utilization** với đường **kinked**: dốc đứng sau điểm optimal để pool luôn còn thanh khoản.
- **Liquidation bonus** là động lực kinh tế để bot dọn nợ xấu, giữ protocol đủ tài sản đảm bảo; giá sập quá nhanh sinh **bad debt**.
- Stablecoin có 3 mô hình: **fiat-backed** (USDC — chắc nhưng tập trung), **crypto-backed/CDP** (DAI — phi tập trung, vốn kém hiệu quả), **algorithmic** (UST — sụp vì backing phản xạ + death spiral).
- Bài học UST: backing bằng token nội bộ + lợi suất phi thực tế = mong manh; peg chỉ được kiểm chứng khi bị bán tháo.

> **Bài tiếp theo:** đi sâu vào **oracle & giá on-chain** — mắt xích mà mọi cơ chế lending/liquidation/CDP đều phụ thuộc, và là bề mặt tấn công (oracle manipulation) đắt giá bậc nhất DeFi.
