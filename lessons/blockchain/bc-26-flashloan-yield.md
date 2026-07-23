# Bài 28 — Flash loan, yield farming, derivatives & rủi ro DeFi

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **flash loan** dựa trên **atomicity** của transaction — vay & trả trong **cùng một tx**, không cần thế chấp.
- Phân biệt ứng dụng **hợp pháp** (arbitrage, collateral swap, self-liquidation, refinance) với **tấn công** (oracle manipulation).
- Đọc hiểu & viết một **flash loan contract** (Aave V3) đúng cú pháp, giải thích từng bước.
- Nắm **yield farming / liquidity mining**, phân biệt **APR vs APY** và biết vì sao APY cao thường là **cảnh báo đỏ**.
- Hiểu **perpetuals / derivatives** on-chain: **funding rate** giữ giá perp bám giá spot.
- Nhận diện **rủi ro hệ thống DeFi**: composability risk, depeg, rug pull, và cách tự bảo vệ.

---

## 2. Flash loan — vay không thế chấp nhờ atomicity

### 2.1 Analogy — mượn tiền "trong tích tắc" có người bảo chứng tuyệt đối

Tưởng tượng bạn xin ngân hàng mượn 10 triệu USD **không thế chấp**, với điều kiện: bạn phải trả lại **trước khi rời khỏi quầy** — và nếu chưa trả đủ thì **toàn bộ mọi việc bạn vừa làm bị xoá sạch như chưa từng xảy ra**. Ngân hàng chẳng mất gì để cho vay, vì rủi ro vỡ nợ bằng **0**.

Trong blockchain, "quầy" đó là **một transaction**. EVM có tính chất **atomicity**: một tx hoặc **thành công toàn bộ**, hoặc **revert toàn bộ** (mọi thay đổi state bị rollback). Flash loan khai thác chính điều này:

1. Protocol chuyển tiền cho bạn (trong tx).
2. Contract của bạn làm gì đó với tiền (arbitrage, swap, refinance…).
3. Trước khi tx kết thúc, bạn phải hoàn trả **gốc + phí**.
4. Nếu bước 3 thất bại → `revert` → **coi như protocol chưa từng cho vay**.

Vì mọi thứ nằm gọn trong một tx, người cho vay **không bao giờ mất tiền** — đó là lý do flash loan **không cần thế chấp** và mở ra cho **bất kỳ ai**, không cần credit score.

<svg viewBox="0 0 720 300" role="img" aria-labelledby="fl-t fl-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="fl-t">Vòng đời một flash loan trong một transaction</title>
<desc id="fl-d">Protocol cho vay, contract người dùng thực thi logic rồi hoàn trả gốc và phí; nếu không trả đủ toàn bộ transaction bị revert</desc>
<rect x="20" y="30" width="150" height="60" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="56" text-anchor="middle" font-size="13" fill="currentColor">Lending Pool</text>
<text x="95" y="74" text-anchor="middle" font-size="11" fill="currentColor">(Aave / dYdX)</text>
<rect x="285" y="30" width="150" height="60" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="56" text-anchor="middle" font-size="13" fill="currentColor">Your Contract</text>
<text x="360" y="74" text-anchor="middle" font-size="11" fill="currentColor">executeOperation()</text>
<rect x="550" y="30" width="150" height="60" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="625" y="56" text-anchor="middle" font-size="13" fill="currentColor">DEX / Protocol</text>
<text x="625" y="74" text-anchor="middle" font-size="11" fill="currentColor">arbitrage, swap...</text>
<line x1="170" y1="50" x2="283" y2="50" stroke="currentColor" stroke-width="1.5" marker-end="url(#fah)"/>
<text x="226" y="42" text-anchor="middle" font-size="11" fill="currentColor">1. cho vay X</text>
<line x1="435" y1="50" x2="548" y2="50" stroke="currentColor" stroke-width="1.5" marker-end="url(#fah)"/>
<text x="491" y="42" text-anchor="middle" font-size="11" fill="currentColor">2. dùng X</text>
<line x1="548" y1="78" x2="437" y2="78" stroke="currentColor" stroke-width="1.5" marker-end="url(#fah)"/>
<text x="491" y="97" text-anchor="middle" font-size="11" fill="#10b981">lợi nhuận</text>
<line x1="283" y1="105" x2="170" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#fah)"/>
<text x="226" y="122" text-anchor="middle" font-size="11" fill="currentColor">3. trả X + phí</text>
<rect x="60" y="170" width="600" height="100" rx="10" fill="#f59e0b" fill-opacity="0.10" stroke="currentColor" stroke-dasharray="5 4"/>
<text x="360" y="198" text-anchor="middle" font-size="13" fill="currentColor">TẤT CẢ nằm trong 1 transaction (atomic)</text>
<text x="360" y="226" text-anchor="middle" font-size="12" fill="#10b981">Trả đủ gốc + phí  →  tx COMMIT, protocol thu phí, bạn giữ lợi nhuận</text>
<text x="360" y="250" text-anchor="middle" font-size="12" fill="#f43f5e">Không trả đủ  →  REVERT toàn bộ, như chưa từng vay (protocol an toàn)</text>
<defs><marker id="fah" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.2 Ứng dụng hợp pháp

| Use case | Ý tưởng |
|----------|---------|
| **Arbitrage** | ETH rẻ trên Uniswap, đắt trên Sushiswap → vay lớn, mua chỗ rẻ, bán chỗ đắt, ăn chênh lệch — **không cần vốn** ban đầu. |
| **Collateral swap** | Đổi tài sản thế chấp (WBTC → ETH) trong một khoản vay mà không phải đóng vị thế thủ công. |
| **Self-liquidation** | Vị thế sắp bị thanh lý → tự dùng flash loan trả nợ, rút collateral, tránh phí phạt của liquidator. |
| **Refinance** | Chuyển khoản vay từ protocol lãi cao (Aave) sang lãi thấp (Compound) trong 1 tx. |

Điểm chung: flash loan **dân chủ hoá vốn** — bạn tạm thời có "sức mua" của cá voi mà chỉ trả một khoản **phí nhỏ** (Aave V3 mặc định `0.05%`).

### 2.3 Mặt tối — oracle manipulation

Flash loan không **tự** là lỗ hổng. Nó **khuếch đại** một lỗ hổng có sẵn: contract nạn nhân tin vào **giá lấy tức thời từ một pool AMM** (spot price) làm oracle.

Kịch bản kinh điển:
1. Attacker vay flash loan **50 triệu USD**.
2. Dồn hết vào một pool thanh khoản mỏng → **đẩy giá token X lên gấp 10** (giá spot bị bóp méo).
3. Contract nạn nhân dùng **giá spot méo mó** đó để định giá collateral → cho attacker vay/mint quá nhiều.
4. Attacker rút giá trị thật, hoàn trả flash loan, **bỏ túi phần chênh**.

Nguyên nhân gốc **không phải** flash loan mà là **oracle tồi**. Cách chống:
- Dùng **oracle chống thao túng**: Chainlink (giá tổng hợp nhiều nguồn), hoặc **TWAP** (Time-Weighted Average Price) của Uniswap V3 — giá trung bình theo thời gian, không thể bóp trong 1 block.
- **Không bao giờ** dùng `getReserves()` / spot price của một pool làm nguồn định giá.

---

## 3. Code minh hoạ — flash loan Aave V3

Dưới đây là contract Foundry/Solidity thực hiện flash loan từ Aave V3. Đây là **khung chuẩn**: bạn chỉ cần điền logic sinh lời vào `executeOperation`.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPoolAddressesProvider} from
    "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Vay flash loan 1 tài sản từ Aave V3 rồi thực thi logic tuỳ ý.
contract FlashArb {
    IPool public immutable POOL;
    address public immutable owner;

    constructor(address addressesProvider) {
        // Provider trỏ tới Pool hiện hành của Aave trên mạng đang chạy
        POOL = IPool(IPoolAddressesProvider(addressesProvider).getPool());
        owner = msg.sender;
    }

    /// @notice Bắt đầu flash loan. Aave sẽ callback lại executeOperation().
    function run(address asset, uint256 amount, bytes calldata params) external {
        require(msg.sender == owner, "not owner");
        // referralCode = 0; onBehalfOf = this contract
        POOL.flashLoanSimple(address(this), asset, amount, params, 0);
    }

    /// @notice Aave gọi lại đây SAU khi đã chuyển `amount` cho contract này.
    ///         Kết thúc hàm, Aave tự pull về (amount + premium) bằng transferFrom.
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,      // phí = amount * 0.05% (mặc định V3)
        address initiator,
        bytes calldata params
    ) external returns (bool) {
        require(msg.sender == address(POOL), "caller not pool");
        require(initiator == address(this), "bad initiator");

        // ------------------------------------------------------------------
        //  TẠI ĐÂY: dùng `amount` để sinh lời.
        //  Ví dụ arbitrage: mua rẻ ở DEX A, bán đắt ở DEX B.
        //  _doArbitrage(asset, amount, params);
        // ------------------------------------------------------------------

        // Sau khi xong, phải bảo đảm contract có đủ (amount + premium)
        // để Aave pull về, nếu không -> toàn bộ tx revert (an toàn cho pool).
        uint256 amountOwed = amount + premium;
        IERC20(asset).approve(address(POOL), amountOwed);

        return true; // báo Aave: đã sẵn sàng cho pool thu nợ
    }

    /// @notice Rút lợi nhuận còn lại về cho owner.
    function sweep(address token) external {
        require(msg.sender == owner, "not owner");
        IERC20(token).transfer(owner, IERC20(token).balanceOf(address(this)));
    }
}
```

**Đọc kỹ những điểm sống-còn:**
- `POOL.flashLoanSimple(...)` khởi động vay. Aave chuyển token cho contract **rồi gọi callback** `executeOperation` — đây là **inversion of control**, protocol gọi ngược code của bạn.
- Hai `require` đầu `executeOperation` là **bắt buộc về bảo mật**: chỉ chấp nhận caller là `POOL` và `initiator` là chính contract. Thiếu chúng, kẻ khác có thể gọi thẳng hàm này để lừa logic của bạn.
- `approve(POOL, amount + premium)` cho phép Aave **pull** khoản nợ về. Nếu balance không đủ → `transferFrom` fail → **revert cả tx**. Đây chính là cơ chế bảo vệ pool đã nói ở 2.1.
- `premium` là phí. Muốn có lãi, logic của bạn phải sinh ra **nhiều hơn** `premium`, nếu không tx revert (bạn chỉ mất gas).

Chạy thử bằng Foundry trên **mainnet fork** (điều kiện tiên quyết để test DeFi thật):

```bash
forge test --fork-url $MAINNET_RPC_URL -vvv
```

> Test trên fork cho bạn dữ liệu thanh khoản & giá **thật** của mainnet mà không tốn tiền thật — chuẩn mực khi phát triển chiến lược flash loan.

---

## 4. Yield farming, liquidity mining & APR vs APY

### 4.1 Nguồn gốc lợi suất

**Yield farming** là chiến lược **tối ưu hoá lợi suất**: bạn di chuyển vốn qua các protocol để "gặt" (farm) phần thưởng. **Liquidity mining** là một dạng cụ thể: protocol phát **token quản trị** (governance token) cho ai cung cấp thanh khoản — nhằm **bootstrap** thanh khoản buổi đầu.

Lợi suất DeFi đến từ đâu (phải luôn tự hỏi câu này):
- **Phí giao dịch** thật (LP trên Uniswap ăn 0.3% mỗi swap) — bền vững.
- **Lãi vay** người khác trả (cho vay trên Aave) — bền vững.
- **Token incentive** protocol in ra — **thường không bền**, giá token có thể sụp.

### 4.2 APR vs APY — khác biệt là compounding

| | APR (Annual Percentage Rate) | APY (Annual Percentage Yield) |
|--|------------------------------|-------------------------------|
| **Định nghĩa** | Lãi suất **đơn**, chưa gộp lãi | Lãi **kép**, đã gộp lãi tái đầu tư |
| **Công thức** | lãi năm / vốn | `(1 + APR/n)^n − 1`, n = số kỳ gộp |
| **Ai hay quảng cáo** | Cho vay/đi vay thẳng | Farm quảng cáo (số to hơn, hấp dẫn hơn) |

Ví dụ: APR `100%`, gộp lãi **hằng ngày** (`n = 365`):

```
APY = (1 + 1.00/365)^365 − 1 ≈ 1.7148 = 171.5%
```

Cùng một dòng tiền nhưng APY nghe gấp rưỡi APR — vì vậy các farm luôn khoe **APY**. Khi so sánh hai cơ hội, hãy **quy về cùng một thước** (cùng APR, hoặc cùng APY, cùng tần suất gộp) rồi mới kết luận.

### 4.3 Impermanent loss — chi phí ẩn của LP

Khi cung cấp thanh khoản cho AMM, nếu giá hai token **phân kỳ**, giá trị pool của bạn **thấp hơn** so với chỉ ôm (HODL) hai token đó — đó là **impermanent loss** (IL). Lợi suất farm phải **bù được IL + phí gas** thì mới thực sự có lãi. Nhiều người thấy APY 200% nhưng cuối cùng **lỗ** vì bỏ quên IL và vì token thưởng mất giá.

### 4.4 APY cao = cờ đỏ

APY `1000%+` gần như luôn nghĩa là: (a) phần thưởng trả bằng token lạm phát nặng sẽ **bị bán tháo**, và/hoặc (b) protocol chưa được kiểm toán, rủi ro **rug pull**. Nguyên tắc: **lợi suất cao bất thường = rủi ro cao bất thường**, không có bữa trưa miễn phí.

---

## 5. Perpetuals & derivatives — funding rate

**Perpetual futures (perps)** là hợp đồng phái sinh cho phép đặt cược **long/short** trên giá tài sản với **đòn bẩy** (leverage), mà **không có ngày đáo hạn** (khác futures truyền thống). Đây là sản phẩm giao dịch lớn nhất trong crypto (dYdX, GMX, Hyperliquid).

Vấn đề: nếu không đáo hạn, làm sao giá perp **bám** giá spot? Câu trả lời là **funding rate** — một khoản thanh toán định kỳ (thường mỗi 1–8 giờ) giữa long và short:

<svg viewBox="0 0 700 260" role="img" aria-labelledby="fr-t fr-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="fr-t">Funding rate kéo giá perpetual về giá spot</title>
<desc id="fr-d">Khi giá perp cao hơn spot, funding dương và long trả cho short; khi thấp hơn, funding âm và short trả cho long</desc>
<rect x="30" y="40" width="300" height="180" rx="10" fill="#10b981" fill-opacity="0.10" stroke="currentColor"/>
<text x="180" y="66" text-anchor="middle" font-size="13" fill="currentColor">Perp &gt; Spot (funding DƯƠNG)</text>
<text x="180" y="92" text-anchor="middle" font-size="12" fill="currentColor">Nhiều người LONG quá</text>
<line x1="90" y1="120" x2="270" y2="120" stroke="currentColor" stroke-width="1.5" marker-end="url(#frah)"/>
<text x="180" y="112" text-anchor="middle" font-size="11" fill="#f43f5e">LONG trả phí cho SHORT</text>
<text x="180" y="150" text-anchor="middle" font-size="11" fill="currentColor">→ long tốn tiền, bớt long</text>
<text x="180" y="172" text-anchor="middle" font-size="11" fill="currentColor">→ áp lực bán</text>
<text x="180" y="200" text-anchor="middle" font-size="11" fill="#10b981">giá perp kéo XUỐNG về spot</text>
<rect x="370" y="40" width="300" height="180" rx="10" fill="#f43f5e" fill-opacity="0.10" stroke="currentColor"/>
<text x="520" y="66" text-anchor="middle" font-size="13" fill="currentColor">Perp &lt; Spot (funding ÂM)</text>
<text x="520" y="92" text-anchor="middle" font-size="12" fill="currentColor">Nhiều người SHORT quá</text>
<line x1="610" y1="120" x2="430" y2="120" stroke="currentColor" stroke-width="1.5" marker-end="url(#frah)"/>
<text x="520" y="112" text-anchor="middle" font-size="11" fill="#f43f5e">SHORT trả phí cho LONG</text>
<text x="520" y="150" text-anchor="middle" font-size="11" fill="currentColor">→ short tốn tiền, bớt short</text>
<text x="520" y="172" text-anchor="middle" font-size="11" fill="currentColor">→ áp lực mua</text>
<text x="520" y="200" text-anchor="middle" font-size="11" fill="#10b981">giá perp kéo LÊN về spot</text>
<text x="350" y="245" text-anchor="middle" font-size="11" fill="currentColor">Funding rate = cơ chế tự cân bằng, không cần đáo hạn</text>
<defs><marker id="frah" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Đọc funding rate như một **chỉ báo tâm lý**: funding dương cao kéo dài = thị trường **quá lạc quan** (đông long), thường trước một đợt **long squeeze**. Ngoài phí funding, trader còn chịu rủi ro **thanh lý (liquidation)** khi giá đi ngược đòn bẩy quá ngưỡng maintenance margin — đòn bẩy càng cao, ngưỡng thanh lý càng gần.

Các mô hình derivatives on-chain phổ biến:
- **Orderbook** (dYdX): khớp lệnh mua/bán như sàn truyền thống.
- **Oracle-based / vAMM** (GMX, Perpetual Protocol): giá lấy từ oracle, LP pool làm đối tác — LP gánh rủi ro thắng/thua của trader.

---

## 6. Rủi ro hệ thống DeFi

DeFi là các **"money lego"** ghép vào nhau. Sức mạnh (composability) cũng chính là điểm yếu.

| Rủi ro | Bản chất | Ví dụ / phòng tránh |
|--------|----------|---------------------|
| **Composability risk** | Protocol A gọi B gọi C; B lỗi thì A sập theo dù A hoàn hảo | Một exploit ở oracle làm lan cả chuỗi protocol dùng nó |
| **Oracle manipulation** | Định giá bằng nguồn dễ thao túng | Dùng Chainlink / TWAP thay spot |
| **Depeg** | Stablecoin/LST mất neo về giá tham chiếu | UST → 0 (2022); dùng stablecoin có tài sản bảo chứng minh bạch |
| **Rug pull** | Dev có quyền rút thanh khoản / mint vô hạn rồi bỏ trốn | Kiểm tra timelock, quyền mint, LP có bị khoá không |
| **Smart contract bug** | Lỗi code bị exploit (reentrancy, math…) | Ưu tiên protocol đã **audit** + có **bug bounty** + tồn tại lâu |
| **Governance attack** | Chiếm đủ token quản trị để bỏ phiếu rút quỹ | Vay flash loan để chiếm phiếu tức thời (đã có case thật) |

**Depeg** đáng sợ vì **composability**: khi UST depeg, mọi pool, mọi khoản vay thế chấp bằng UST đổ vỡ dây chuyền trong vài giờ. **Rug pull** thì là rủi ro **con người**: hãy luôn kiểm tra ai có `onlyOwner` với quyền `mint()` hay rút liquidity, và liệu có **timelock / multisig** hay không.

Checklist tối thiểu trước khi bỏ tiền vào một protocol:
1. Đã **audit** chưa, bởi ai, báo cáo có công khai không?
2. **TVL** & thời gian tồn tại — protocol sống lâu là bằng chứng Lindy.
3. **Quyền admin**: có timelock/multisig? Ai mint/pause/rút được?
4. **Oracle** dùng gì — Chainlink/TWAP hay spot?
5. Lợi suất đến từ **phí thật** hay chỉ token in ra?

---

## 7. Tóm tắt
- **Flash loan** = vay không thế chấp nhờ **atomicity** của tx: trả đủ gốc + phí trong cùng tx, nếu không toàn bộ **revert** → pool không bao giờ mất tiền.
- Ứng dụng hợp pháp: **arbitrage, collateral swap, self-liquidation, refinance**. Mặt tối: **oracle manipulation** — gốc rễ là oracle tồi, chống bằng Chainlink/TWAP.
- Contract Aave V3 xoay quanh callback **`executeOperation`** với hai `require` bảo mật và `approve(amount + premium)` để pool thu nợ.
- **APY ≠ APR** (khác nhau ở compounding); farm khoe APY; APY cao bất thường = **cờ đỏ**; nhớ trừ **impermanent loss**.
- **Perps** không đáo hạn, dùng **funding rate** để bám giá spot; funding cũng là chỉ báo tâm lý; đòn bẩy đi kèm rủi ro **thanh lý**.
- Rủi ro DeFi mang tính **hệ thống**: composability, depeg, rug pull, oracle, governance attack — luôn chạy checklist trước khi vào tiền.

> **Bài tiếp theo:** Layer 2 & scaling — rollups (Optimistic vs ZK), data availability và cách DeFi mở rộng ra khỏi giới hạn của Layer 1.
