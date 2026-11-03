# Bài 26 — AMM & liquidity pool (x·y=k), impermanent loss

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **AMM** (Automated Market Maker) khác gì **order book** truyền thống.
- Hiểu **constant product** `x·y=k` — bản chất đường cong định giá của Uniswap V2.
- Tính chính xác **giá spot, output của swap, price impact & slippage** từ reserve.
- Hiểu vai trò của **liquidity pool, LP token & swap fee** — LP kiếm tiền từ đâu.
- Tính **impermanent loss (IL)** bằng công thức đóng, biết khi nào LP thực sự lỗ.
- Phân biệt **Uniswap V2 vs V3** — concentrated liquidity, tick, capital efficiency.

---

## 2. Lý thuyết

### 2.1 Analogy — quầy đổi tiền không cần người ra giá

Sàn truyền thống (CEX, NYSE) dùng **order book**: người mua đặt lệnh chờ, người bán đặt lệnh chờ, khớp nhau khi giá gặp. Cần **market maker** liên tục treo giá hai chiều — tốn người, tốn hạ tầng, và trên blockchain thì **quá đắt** (mỗi lệnh đặt/hủy là một transaction tốn gas).

AMM thay con người ra giá bằng **một công thức toán**. Hãy tưởng tượng một **cái cân nước hai ngăn**: ngăn trái đựng token X, ngăn phải đựng token Y, và có một luật vật lý bất biến — **tích thể tích hai ngăn luôn bằng hằng số k**. Bạn muốn lấy Y ra? Phải đổ X vào. Càng lấy nhiều Y, mực Y càng cạn → mỗi đơn vị Y tiếp theo càng đắt X. **Giá tự sinh ra từ tỉ lệ hai ngăn**, không cần ai đứng ra báo giá.

Đó chính là **constant product market maker**: pool giữ reserve `x` (token X) và `y` (token Y), và luôn giữ:

```
x · y = k   (k là hằng số, chỉ đổi khi có người thêm/rút thanh khoản)
```

### 2.2 Đường cong x·y=k và giá spot

<auto-anim data-dur="9">
<svg viewBox="0 0 520 470" role="img" aria-labelledby="bc24-med-t bc24-med-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="bc24-med-t">Swap di chuyển trên đường cong AMM</title>
<desc id="bc24-med-d">Bán ETH làm reserve X tăng, reserve Y giảm và tiếp tuyến phẳng dần. Ba trạng thái minh họa cùng một swap không phí.</desc>
<defs><marker id="bc24-med-a" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L7 4 L0 8 Z" fill="currentColor"/></marker></defs>
<text x="260" y="24" text-anchor="middle" font-size="14" fill="currentColor">Swap 10 ETH → USDC (không phí)</text>
<line x1="55" y1="340" x2="490" y2="340" stroke="currentColor" stroke-width="2"  marker-end="url(#bc24-med-a)"/>
<line x1="55" y1="340" x2="55" y2="45" stroke="currentColor" stroke-width="2"  marker-end="url(#bc24-med-a)"/>
<text x="490" y="363" text-anchor="end" font-size="13" fill="currentColor">Reserve X (ETH)</text>
<text x="61" y="48" text-anchor="start" font-size="13" fill="currentColor">Y (USDC)</text>
<path d="M70.00,72.14 L75.00,75.45 L80.00,78.68 L85.00,81.82 L90.00,84.90 L95.00,87.90 L100.00,90.83 L105.00,93.69 L110.00,96.49 L115.00,99.23 L120.00,101.90 L125.00,104.52 L130.00,107.08 L135.00,109.59 L140.00,112.04 L145.00,114.44 L150.00,116.79 L155.00,119.09 L160.00,121.34 L165.00,123.55 L170.00,125.71 L175.00,127.84 L180.00,129.92 L185.00,131.96 L190.00,133.96 L195.00,135.92 L200.00,137.84 L205.00,139.73 L210.00,141.59 L215.00,143.41 L220.00,145.19 L225.00,146.95 L230.00,148.67 L235.00,150.37 L240.00,152.03 L245.00,153.66 L250.00,155.27 L255.00,156.85 L260.00,158.40 L265.00,159.93 L270.00,161.43 L275.00,162.90 L280.00,164.36 L285.00,165.78 L290.00,167.19 L295.00,168.57 L300.00,169.93 L305.00,171.27 L310.00,172.59 L315.00,173.89 L320.00,175.16 L325.00,176.42 L330.00,177.66 L335.00,178.88 L340.00,180.09 L345.00,181.27 L350.00,182.44 L355.00,183.59 L360.00,184.72 L365.00,185.84 L370.00,186.94 L375.00,188.02 L380.00,189.09 L385.00,190.15 L390.00,191.19 L395.00,192.22 L400.00,193.23 L405.00,194.23 L410.00,195.21 L415.00,196.18 L420.00,197.14 L425.00,198.09 L430.00,199.02 L435.00,199.94 L440.00,200.85 L445.00,201.75 L450.00,202.64 L455.00,203.51 L460.00,204.38 L465.00,205.23 L470.00,206.07" fill="none" stroke="#3b82f6" stroke-width="3"/>
<text x="385" y="179" text-anchor="middle" font-size="13" fill="currentColor">x·y = 30,000,000</text>
<circle cx="170" cy="125.71428571428572" r="7" fill="#10b981"><animate attributeName="cx" dur="9s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;0.33;0.66;1" values="170;195;220;170"/><animate attributeName="cy" dur="9s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;0.33;0.66;1" values="125.71;135.92;145.19;125.71"/></circle>
<g opacity="1"><animate attributeName="opacity" dur="9s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;0.33;0.66;1" values="1;0;0;1"/>
<line x1="115" y1="102.14285714285715" x2="225" y2="149.28571428571428" stroke="#10b981" stroke-width="2" stroke-dasharray="4 3"/>
<text x="280" y="65" text-anchor="middle" font-size="13" fill="currentColor">x = 100 ETH; y = 300,000.0 USDC</text>
<text x="280" y="87" text-anchor="middle" font-size="13" fill="currentColor">Giá spot |dy/dx| = 3,000 USDC/ETH</text>
</g>
<g opacity="0"><animate attributeName="opacity" dur="9s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;0.33;0.66;1" values="0;1;0;0"/>
<line x1="140" y1="114.53838678328474" x2="250" y2="157.2983479105928" stroke="#10b981" stroke-width="2" stroke-dasharray="4 3"/>
<text x="280" y="65" text-anchor="middle" font-size="13" fill="currentColor">x = 105 ETH; y = 285,714.3 USDC</text>
<text x="280" y="87" text-anchor="middle" font-size="13" fill="currentColor">Giá spot |dy/dx| = 2,721 USDC/ETH</text>
</g>
<g opacity="0"><animate attributeName="opacity" dur="9s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;0.33;0.66;1" values="0;0;1;0"/>
<line x1="165" y1="125.71428571428574" x2="275" y2="164.6753246753247" stroke="#10b981" stroke-width="2" stroke-dasharray="4 3"/>
<text x="280" y="65" text-anchor="middle" font-size="13" fill="currentColor">x = 110 ETH; y = 272,727.3 USDC</text>
<text x="280" y="87" text-anchor="middle" font-size="13" fill="currentColor">Giá spot |dy/dx| = 2,479 USDC/ETH</text>
</g>
<text x="285" y="253" text-anchor="middle" font-size="13" fill="currentColor">Tiếp tuyến phẳng dần → giá spot giảm</text>
<text x="260" y="284" text-anchor="middle" font-size="13" fill="currentColor">Cuối swap: 27,272.7 USDC; TB 2,727/ETH</text>
<text x="260" y="306" text-anchor="middle" font-size="13" fill="currentColor">Price impact ≈ 9.1% so với spot đầu 3,000</text>
<text x="260" y="395" text-anchor="middle" font-size="13" fill="currentColor">Reserve không chạm 0; mua cạn dần càng đắt.</text>
<line x1="80" y1="427" x2="470" y2="427" stroke="currentColor" stroke-width="2"  marker-end="url(#bc24-med-a)"/>
<text x="80" y="451" text-anchor="start" font-size="13" fill="currentColor">0 ETH vào</text>
<text x="470" y="451" text-anchor="end" font-size="13" fill="currentColor">10 ETH vào · 9s / vòng</text>
<circle cx="80" cy="427" r="5" fill="currentColor"><animate attributeName="cx" dur="9s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;0.33;0.66;1" values="80;275;470;80"/></circle>
</svg>
</auto-anim>

**Giá spot** (giá tức thời của X tính theo Y) không phải `y/x` chung chung — nó là **độ dốc tiếp tuyến** của đường cong tại điểm hiện tại. Với `x·y=k`, đạo hàm cho:

```
P_spot(X tính theo Y) = y / x
```

Ví dụ pool có `x = 100 ETH`, `y = 300,000 USDC` → `k = 30,000,000`. Giá spot 1 ETH = `300000/100 = 3000 USDC`. Nhưng đây chỉ là giá cho **một lượng vô cùng nhỏ**. Mua thật sự thì bạn trượt dọc đường cong → **giá trung bình luôn xấu hơn giá spot**. Đó là **price impact**.

### 2.3 Công thức swap — tính output chính xác

Bỏ fee trước cho dễ. Trader đưa vào `Δx` token X, muốn nhận `Δy` token Y. Luật bất biến buộc:

```
(x + Δx) · (y − Δy) = k = x · y
```

Giải ra `Δy`:

```
Δy = y − k/(x + Δx) = (y · Δx) / (x + Δx)
```

**Ví dụ số:** pool `100 ETH / 300,000 USDC`. Alice bán `10 ETH`:

```
Δy = 300000 · 10 / (100 + 10) = 3,000,000 / 110 = 27,272.7 USDC
```

Giá trung bình Alice nhận = `27272.7 / 10 = 2727 USDC/ETH`, trong khi spot là 3000. **Price impact ≈ 9.1%** — vì cô ấy vừa đẩy 10% reserve ETH vào một pool nhỏ. Reserve mới: `110 ETH / 272,727 USDC`, giá spot mới = `2479 USDC/ETH`. Pool nhỏ → trượt giá lớn; pool càng sâu (k lớn) → trượt càng ít.

> **Slippage vs price impact:** *price impact* là mức giá xấu đi do chính lệnh của bạn làm dịch reserve. *Slippage* là chênh lệch giữa giá bạn *kỳ vọng khi bấm* và giá *thực thi* — gồm price impact **cộng** biến động do lệnh người khác chen vào trước bạn (front-running/MEV). Vì thế UI cho đặt `slippage tolerance` (vd 0.5%): nếu output thực tế thấp hơn ngưỡng, transaction **revert** để bảo vệ bạn.

### 2.4 Swap fee — nguồn thu của LP

Uniswap V2 thu **0.3%** trên token đầu vào *trước khi* áp công thức. Gọi fee rate `f = 0.003`:

```
Δy = (y · Δx · (1 − f)) / (x + Δx · (1 − f))
```

Phần fee **không rời pool** — nó ở lại làm tăng reserve, nên `k` **nhích lên sau mỗi swap**. Đây là cơ chế trả thưởng cho LP: họ không nhận fee riêng lẻ, mà giá trị pool phình dần và mỗi LP token đại diện cho phần lớn hơn.

### 2.5 Liquidity pool & LP token

Ai bỏ vốn vào pool gọi là **Liquidity Provider (LP)**. Họ phải nạp **cả hai token theo đúng tỉ lệ giá hiện tại** (nạp lệch tỉ lệ = tự tạo cơ hội arbitrage cho người khác). Đổi lại, pool **mint LP token** — biên nhận đại diện cho **phần trăm sở hữu** pool:

```
Lần đầu tạo pool:   LP_minted = sqrt(x · y)          (trừ MINIMUM_LIQUIDITY khoá vĩnh viễn)
Nạp thêm sau đó:    LP_minted = totalLP · min(Δx/x, Δy/y)
```

Khi rút, LP đốt (burn) LP token và nhận lại **tỉ lệ phần trăm** của *reserve hiện tại* — gồm cả phí đã tích luỹ. Vì reserve đã đổi thành phần (do swap), lượng token X và Y nhận về **không giống lúc nạp** — đây là gốc rễ của impermanent loss.

### 2.6 Impermanent loss — mất mát so với "cứ giữ nguyên"

**IL là chênh lệch giữa giá trị nếu bạn LP** và giá trị nếu bạn **chỉ ôm (HODL) hai token** đó. Nó xuất hiện vì AMM **luôn bán token đang lên giá và mua token đang xuống giá** — pool tự động rebalance theo hướng ngược với người HODL.

Đặt `p` = tỉ lệ thay đổi giá (price ratio mới / cũ). Với constant product 50/50, công thức đóng của IL:

```
IL(p) = 2·sqrt(p) / (1 + p) − 1
```

Kết quả luôn ≤ 0 (một tổn thất). Bảng cảm nhận độ lớn:

| Giá X đổi | p | IL |
|-----------|-----|------|
| +0% | 1.00 | 0.00% |
| +25% | 1.25 | −0.62% |
| +50% | 1.50 | −2.02% |
| ×2 (+100%) | 2.00 | −5.72% |
| ×4 | 4.00 | −20.0% |
| ×5 | 5.00 | −25.5% |

**Kiểm chứng bằng số (×2):** LP nạp `1 ETH + 3000 USDC` khi ETH = 3000, `k = 3000`. ETH tăng lên 6000. Arbitrage kéo pool đến reserve mới sao cho giá spot = 6000:

```
y/x = 6000  và  x·y = 3000  →  x = sqrt(3000/6000) = 0.707 ETH,  y = 4243 USDC
Giá trị LP  = 0.707·6000 + 4243 = 8485 USDC
Giá trị HODL = 1·6000 + 3000     = 9000 USDC
IL = 8485/9000 − 1 = −5.72%   ✓  khớp công thức
```

**"Impermanent"** vì nếu giá **quay về mức cũ**, khoản lỗ biến mất. Nó chỉ thành **permanent loss** khi LP rút ra lúc giá đang lệch. Điểm mấu chốt: **fee thu được phải lớn hơn IL** thì làm LP mới có lãi. Pool biến động thấp (stablecoin: USDC/USDT) → IL gần như 0 → LP an toàn. Pool cặp biến động mạnh → IL lớn, cần volume/fee cao mới bù nổi.

<svg viewBox="0 0 640 320" role="img" aria-labelledby="il-t il-d" style="width:100%;max-width:560px;height:auto;display:block;margin:1.25rem auto">
<title id="il-t">Impermanent loss theo mức thay đổi giá</title>
<desc id="il-d">Đường cong IL âm dần khi giá lệch khỏi điểm nạp ban đầu ở giữa</desc>
<line x1="60" y1="60" x2="600" y2="60" stroke="currentColor" stroke-width="1"/>
<line x1="330" y1="40" x2="330" y2="290" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<text x="330" y="30" text-anchor="middle" font-size="11" fill="currentColor">giá không đổi (IL=0)</text>
<path d="M70,250 Q200,120 330,60 Q460,120 590,250" fill="none" stroke="#f43f5e" stroke-width="2.5"/>
<rect x="70" y="60" width="520" height="200" fill="#f43f5e" fill-opacity="0.06"/>
<text x="90" y="245" font-size="11" fill="currentColor">giá giảm mạnh</text>
<text x="510" y="245" text-anchor="end" font-size="11" fill="currentColor">giá tăng mạnh</text>
<text x="335" y="80" font-size="11" fill="#f43f5e">IL luôn ≤ 0 — càng lệch càng lỗ so với HODL</text>
<circle cx="200" cy="130" r="4" fill="#f43f5e"/>
<circle cx="460" cy="130" r="4" fill="#f43f5e"/>
<text x="335" y="308" text-anchor="middle" font-size="11" fill="currentColor">Đối xứng: lệch lên hay xuống cùng độ lớn đều lỗ như nhau</text>
</svg>

### 2.7 Uniswap V2 vs V3 — concentrated liquidity

Vấn đề của V2: thanh khoản trải **từ giá 0 đến vô cực**. Với cặp stablecoin dao động 0.99–1.01, gần như toàn bộ vốn nằm ở vùng giá **chẳng bao giờ chạm tới** — vốn "chết". Đó là **capital inefficiency**.

Uniswap V3 cho LP **chọn một khoảng giá** `[P_a, P_b]` để tập trung vốn (**concentrated liquidity**). Trong khoảng đó, LP đóng vai như một pool V2 lớn hơn nhiều lần → cùng số vốn tạo depth sâu hơn, kiếm nhiều fee hơn. Khoảng giá được rời rạc hoá thành **tick** (mỗi tick = một mốc giá, cách nhau `1.0001×`, tức 1 bps). Vị thế LP là một **NFT (non-fungible token)** vì mỗi range khác nhau.

| Tiêu chí | Uniswap V2 | Uniswap V3 |
|----------|-----------|------------|
| Thanh khoản | Trải [0, ∞) | Tập trung trong `[P_a, P_b]` |
| Capital efficiency | Thấp | Cao (tới hàng trăm lần với range hẹp) |
| LP token | ERC-20, fungible | NFT (mỗi range riêng) |
| Fee tier | Cố định 0.3% | Nhiều mức: 0.01/0.05/0.3/1% |
| Bất biến | `x·y=k` | `(x+L/√P_b)(y+L·√P_a)=L²` (dịch trục) |
| Rủi ro | IL tiêu chuẩn | IL **khuếch đại** + phải quản range |

Đánh đổi của V3: nếu giá **ra khỏi range** bạn chọn, vị thế thành **100% một token** và **ngừng kiếm fee** — IL bị khuếch đại và cần theo dõi/di chuyển range chủ động (giống market maker thật). V3 mạnh cho người chuyên nghiệp; V2 đơn giản, "nạp rồi quên".

---

## 3. Code minh hoạ — swap math (Solidity + JS)

Hàm cốt lõi của Uniswap V2 router, đã gồm fee 0.3%. Đây đúng là logic trong `UniswapV2Library.getAmountOut`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library AmmMath {
    /// @notice Tính lượng token ra khi swap, đã trừ fee 0.3%
    /// @param amountIn   lượng token đưa vào
    /// @param reserveIn  reserve của token đầu vào (x)
    /// @param reserveOut reserve của token đầu ra (y)
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountOut) {
        require(amountIn > 0, "INSUFFICIENT_INPUT");
        require(reserveIn > 0 && reserveOut > 0, "NO_LIQUIDITY");

        // fee 0.3%: nhân input với 997/1000 trước khi áp x*y=k
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator   = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        // Δy = (y · Δx·0.997) / (x + Δx·0.997)
        amountOut = numerator / denominator;
    }

    /// @notice Giá spot của token X tính theo Y (scale 1e18 để giữ phần thập phân)
    function spotPrice(uint256 reserveX, uint256 reserveY)
        internal pure returns (uint256)
    {
        return (reserveY * 1e18) / reserveX; // = y/x
    }
}
```

Điểm kỹ thuật đáng lưu ý: Uniswap V2 **không dùng số thực**. Nó nhân cả tử và mẫu để phép chia integer chỉ làm **một lần cuối**, tránh mất chính xác. Bất biến được kiểm ở contract chính bằng `require(balance0 * balance1 >= k)` sau mỗi swap — luật `x·y=k` được **enforce on-chain**, không phải chỉ tính trong router.

Bản JS để chạy nhanh và tính luôn price impact + IL:

```javascript
const FEE = 0.003;

// Δy = y·Δx·(1-f) / (x + Δx·(1-f))
function getAmountOut(amountIn, reserveIn, reserveOut) {
  const inWithFee = amountIn * (1 - FEE);
  return (reserveOut * inWithFee) / (reserveIn + inWithFee);
}

function priceImpact(amountIn, reserveIn, reserveOut) {
  const spot = reserveOut / reserveIn;                 // giá trước swap
  const out  = getAmountOut(amountIn, reserveIn, reserveOut);
  const exec = out / amountIn;                          // giá thực thi trung bình
  return 1 - exec / spot;                               // % xấu đi
}

// IL 50/50 constant product theo tỉ lệ giá p (giá mới / giá cũ)
function impermanentLoss(p) {
  return (2 * Math.sqrt(p)) / (1 + p) - 1;              // luôn ≤ 0
}

// Demo với pool 100 ETH / 300_000 USDC
const [x, y] = [100, 300_000];
console.log(getAmountOut(10, x, y).toFixed(2));         // ~27198.33 USDC (đã trừ fee)
console.log((priceImpact(10, x, y) * 100).toFixed(2));  // ~9.34 %
console.log((impermanentLoss(2) * 100).toFixed(2));     // -5.72 %  (giá ETH x2)
console.log((impermanentLoss(4) * 100).toFixed(2));     // -20.00 % (giá ETH x4)
```

Chạy `node amm.js` sẽ ra đúng các con số trong bài — hãy tự đổi reserve để cảm nhận: **pool càng sâu, price impact càng nhỏ với cùng lượng swap**.

---

## 4. Tình huống thực tế
- **Chọn pool để làm LP:** cặp stablecoin (USDC/USDT) → IL ~0, fee thấp nhưng volume lớn → an toàn cho vốn nhàn rỗi. Cặp ETH/altcoin biến động → chỉ vào khi tin phí bù được IL.
- **Người swap lượng lớn:** đừng đánh một cú vào pool nông — chia nhỏ lệnh hoặc dùng aggregator (1inch) để định tuyến qua nhiều pool, giảm price impact tổng.
- **Đặt slippage tolerance:** để mặc định 0.5% cho pool sâu; token thanh khoản mỏng phải nới, nhưng nới rộng = mồi ngon cho **sandwich attack** (MEV bot mua trước–bán sau quanh lệnh của bạn).
- **LP trên V3:** đặt range quá hẹp = fee cao nhưng dễ bị "out of range" thành cầm một token; range rộng = an toàn nhưng gần như quay về hiệu quả V2.

---

## 5. Tóm tắt
- **AMM** thay order book bằng công thức; **constant product** `x·y=k` là mô hình nền của Uniswap V2.
- **Giá spot = y/x** nhưng swap thật luôn **trượt dọc đường cong** → có **price impact**; pool càng sâu (k lớn) trượt càng ít.
- **LP** nạp cặp token, nhận **LP token** đại diện % sở hữu; thu nhập đến từ **swap fee** (V2: 0.3%) tích vào reserve.
- **Impermanent loss** `= 2√p/(1+p) − 1` — lỗ so với HODL vì pool tự bán token đang lên; chỉ thành lỗ thật khi rút lúc giá lệch. Làm LP có lãi **⇔ fee > IL**.
- **Uniswap V3** thêm **concentrated liquidity + tick**: hiệu quả vốn cao hơn nhiều lần nhưng IL khuếch đại và phải quản range chủ động.

> **Bài tiếp theo:** đi vào **lending & borrowing** (Aave/Compound) — lãi suất theo utilization, collateral, và cơ chế **liquidation** giữ hệ thống không vỡ nợ.
