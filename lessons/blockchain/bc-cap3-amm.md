# Bài 29 — Capstone 3: Build AMM mini (Uniswap V2 clone)

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **AMM** (Automated Market Maker) và công thức **constant product** `x * y = k` — bản chất vì sao giá tự hình thành mà không cần order book.
- Viết **Pair contract** kiểu Uniswap V2 từ số 0: giữ `reserve`, **mint LP token**, **burn**, và **swap** với phí **0.3%**.
- Viết **Router** với `addLiquidity` / `removeLiquidity` / `swapExactTokensForTokens` (tính `quote` & `getAmountOut`).
- Viết **test đầy đủ** bằng `forge test`: kiểm tra invariant `k`, phí, LP share, và **impermanent loss** (IL) bằng số cụ thể.
- Hiểu các cạm bẫy: **MINIMUM_LIQUIDITY**, làm tròn, và vì sao Pair phải "ngu" còn Router mới "thông minh".

> Bài **thực chiến**. Toàn bộ code copy vào đúng path là chạy được. Cần đã cài Foundry (`curl -L https://foundry.paradigm.xyz | bash && foundryup`) và OpenZeppelin (Bài 18).

---

## 2. Lý thuyết — AMM và công thức x·y=k

### 2.1 Analogy — cái cân tự động

Sàn truyền thống (CEX) dùng **order book**: người mua đặt lệnh, người bán đặt lệnh, hệ thống khớp. Cần **thanh khoản chủ động** và một bên vận hành sổ lệnh. On-chain, khớp lệnh liên tục quá tốn gas.

AMM thay order book bằng một **cái cân**: pool giữ hai loại token, ví dụ `x` đồng TokenA và `y` đồng TokenB. Luật duy nhất: **tích số `x * y` phải không đổi** (thực ra là **không được giảm**). Muốn lấy TokenB ra, bạn phải bỏ TokenA vào — và vì `x * y = k` cố định, lấy càng nhiều thì giá càng đắt. Giá không do ai quyết định; nó là **đạo hàm của đường cong**.

<svg viewBox="0 0 700 320" role="img" aria-labelledby="cp-t cp-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="cp-t">Đường cong constant product x·y=k</title>
<desc id="cp-d">Một hyperbola: trục hoành là reserve tokenA, trục tung là reserve tokenB, mọi điểm trên đường cong đều có tích x nhân y bằng hằng số k; một cú swap trượt dọc đường cong</desc>
<line x1="60" y1="270" x2="660" y2="270" stroke="currentColor" stroke-width="1.5" marker-end="url(#aa)"/>
<line x1="60" y1="270" x2="60" y2="30" stroke="currentColor" stroke-width="1.5" marker-end="url(#aa)"/>
<text x="655" y="292" text-anchor="end" font-size="12" fill="currentColor">reserve TokenA (x)</text>
<text x="66" y="28" font-size="12" fill="currentColor">reserve TokenB (y)</text>
<path d="M 95 250 C 200 90, 260 80, 620 70 M 95 250 Q 160 250 620 70" fill="none" stroke="currentColor" stroke-width="0"/>
<path d="M 95 245 Q 150 100 300 92 T 620 72" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-width="2"/>
<circle cx="180" cy="140" r="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-width="2"/>
<text x="180" y="128" text-anchor="middle" font-size="12" fill="currentColor">trước swap</text>
<circle cx="300" cy="92" r="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor" stroke-width="2"/>
<text x="330" y="88" font-size="12" fill="currentColor">sau swap</text>
<line x1="180" y1="140" x2="300" y2="92" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3" marker-end="url(#aa)"/>
<text x="360" y="180" text-anchor="middle" font-size="13" fill="currentColor">Bỏ ΔA vào → lấy ΔB ra, luôn giữ x·y ≥ k</text>
<text x="360" y="200" text-anchor="middle" font-size="12" fill="currentColor">Càng lấy nhiều B, đường càng dốc → giá càng đắt (slippage)</text>
<defs><marker id="aa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.2 Toán của một cú swap

Không phí, muốn đưa `dx` TokenA vào và lấy `dy` TokenB ra, ta cần giữ tích không đổi:

```
x · y = (x + dx) · (y − dy)   ⇒   dy = y · dx / (x + dx)
```

Uniswap V2 tính **phí 0.3%** bằng cách chỉ cho **99.7%** input tham gia đổi:

```
dxWithFee = dx · 997 / 1000
dy = y · dxWithFee / (x + dxWithFee)
     = (dx · 997 · y) / (x · 1000 + dx · 997)
```

Phần **0.3% phí ở lại pool** → làm `k` **tăng dần** sau mỗi lần swap, và đây chính là **lợi nhuận của LP** (liquidity provider). Contract không "trả phí" đi đâu cả; nó chỉ giữ lại và LP thu về khi rút.

### 2.3 LP token — chứng chỉ sở hữu pool

Khi bạn nạp thanh khoản, pool **mint** cho bạn **LP token** đại diện cho **tỷ lệ sở hữu** pool. Rút ra thì **burn** LP token và nhận lại tỷ lệ tương ứng của cả hai reserve (đã gồm phí tích luỹ).

| Hành động | Người dùng đưa vào | Pool làm gì | Người dùng nhận |
|-----------|--------------------|-------------|-----------------|
| **addLiquidity** | TokenA + TokenB (đúng tỷ lệ) | `_mint` LP token | LP token |
| **swap** | 1 token | Giữ phí, cập nhật reserve | token còn lại |
| **removeLiquidity** | LP token | `_burn` LP token | TokenA + TokenB theo share |

Lần nạp **đầu tiên** đặt luôn giá khởi điểm, LP nhận `sqrt(x·y)` token. Uniswap khoá vĩnh viễn `MINIMUM_LIQUIDITY = 1000` để không ai đẩy `totalSupply` về 0 rồi thao túng tỷ giá 1 LP-wei.

---

## 3. Cấu trúc dự án

Tách **Pair** (lõi, "ngu" nhưng an toàn) khỏi **Router** (periphery, "thông minh"). Pair chỉ tin vào **số dư thực tế** của chính nó — mọi tính toán slippage, deadline, tỷ lệ tối ưu đều nằm ở Router.

<svg viewBox="0 0 720 260" role="img" aria-labelledby="ar-t ar-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="ar-t">Kiến trúc Pair và Router</title>
<desc id="ar-d">Người dùng gọi Router; Router chuyển token vào Pair rồi gọi mint, burn hoặc swap trên Pair; Pair giữ reserve và phát hành LP token</desc>
<rect x="20" y="100" width="120" height="60" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="128" text-anchor="middle" font-size="13" fill="currentColor">User</text>
<text x="80" y="146" text-anchor="middle" font-size="11" fill="currentColor">(ví)</text>
<rect x="230" y="90" width="150" height="80" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="305" y="118" text-anchor="middle" font-size="13" fill="currentColor">AmmRouter</text>
<text x="305" y="138" text-anchor="middle" font-size="11" fill="currentColor">quote / getAmountOut</text>
<text x="305" y="154" text-anchor="middle" font-size="11" fill="currentColor">slippage + deadline</text>
<rect x="480" y="80" width="200" height="110" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="580" y="106" text-anchor="middle" font-size="13" fill="currentColor">AmmPair (là ERC20 LP)</text>
<text x="580" y="128" text-anchor="middle" font-size="11" fill="currentColor">reserve0, reserve1</text>
<text x="580" y="146" text-anchor="middle" font-size="11" fill="currentColor">mint() burn() swap()</text>
<text x="580" y="164" text-anchor="middle" font-size="11" fill="currentColor">giữ invariant x·y≥k</text>
<line x1="140" y1="130" x2="228" y2="130" stroke="currentColor" stroke-width="1.5" marker-end="url(#ab)"/>
<line x1="380" y1="130" x2="478" y2="130" stroke="currentColor" stroke-width="1.5" marker-end="url(#ab)"/>
<text x="184" y="122" text-anchor="middle" font-size="11" fill="currentColor">gọi</text>
<text x="429" y="122" text-anchor="middle" font-size="11" fill="currentColor">transfer + gọi</text>
<text x="350" y="228" text-anchor="middle" font-size="12" fill="currentColor">Pair chỉ đọc balance thật của mình → không cần tin Router; Router sai chỉ hại chính user gọi nó</text>
<defs><marker id="ab" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

```
src/
├── AmmPair.sol      # lõi: LP token + mint/burn/swap
├── AmmRouter.sol    # periphery: addLiquidity/removeLiquidity/swap
└── MockERC20.sol    # token giả để test
test/
└── AmmPair.t.sol    # test đầy đủ: k, phí, LP share, IL
```

`foundry.toml` cần remapping OpenZeppelin (giống Bài 18):

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
remappings = ["@openzeppelin/=lib/openzeppelin-contracts/"]
```

---

## 4. `src/MockERC20.sol` — token để test

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

---

## 5. `src/AmmPair.sol` — lõi Uniswap V2

Pair vừa **là** LP token (kế thừa `ERC20`), vừa giữ reserve và ba hàm lõi. Chú ý pattern **"đọc balance, so với reserve cũ để suy ra input"** — đây là điểm tinh tế nhất của V2.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/// @notice AMM Pair tối giản kiểu Uniswap V2. Bản thân contract là LP token.
contract AmmPair is ERC20 {
    uint256 public constant MINIMUM_LIQUIDITY = 1_000;

    address public immutable token0;
    address public immutable token1;

    uint112 private reserve0;
    uint112 private reserve1;

    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(address indexed sender, uint256 amount0In, uint256 amount1In,
               uint256 amount0Out, uint256 amount1Out, address indexed to);
    event Sync(uint112 reserve0, uint112 reserve1);

    constructor(address _token0, address _token1) ERC20("Mini-AMM LP", "mLP") {
        require(_token0 != _token1, "IDENTICAL");
        // sắp xếp để token0 < token1 (đảm bảo pair là duy nhất theo cặp)
        (token0, token1) = _token0 < _token1 ? (_token0, _token1) : (_token1, _token0);
    }

    function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1) {
        return (reserve0, reserve1);
    }

    function _update(uint256 balance0, uint256 balance1) private {
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, "OVERFLOW");
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        emit Sync(reserve0, reserve1);
    }

    /// @notice Mint LP token. Người gọi PHẢI đã transfer token vào contract TRƯỚC.
    function mint(address to) external returns (uint256 liquidity) {
        (uint112 _reserve0, uint112 _reserve1) = getReserves();
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 amount0 = balance0 - _reserve0; // phần vừa được nạp thêm
        uint256 amount1 = balance1 - _reserve1;

        uint256 _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            liquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(0xdead), MINIMUM_LIQUIDITY); // khoá vĩnh viễn
        } else {
            // lấy tỷ lệ NHỎ HƠN để không thưởng cho người nạp lệch tỷ giá
            liquidity = Math.min(
                (amount0 * _totalSupply) / _reserve0,
                (amount1 * _totalSupply) / _reserve1
            );
        }
        require(liquidity > 0, "INSUFFICIENT_LIQUIDITY_MINTED");
        _mint(to, liquidity);
        _update(balance0, balance1);
        emit Mint(msg.sender, amount0, amount1);
    }

    /// @notice Burn LP token đang giữ trong contract, trả 2 token về `to`.
    function burn(address to) external returns (uint256 amount0, uint256 amount1) {
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 liquidity = balanceOf(address(this));

        uint256 _totalSupply = totalSupply();
        amount0 = (liquidity * balance0) / _totalSupply; // pro-rata theo share
        amount1 = (liquidity * balance1) / _totalSupply;
        require(amount0 > 0 && amount1 > 0, "INSUFFICIENT_LIQUIDITY_BURNED");

        _burn(address(this), liquidity);
        IERC20(token0).transfer(to, amount0);
        IERC20(token1).transfer(to, amount1);

        _update(
            IERC20(token0).balanceOf(address(this)),
            IERC20(token1).balanceOf(address(this))
        );
        emit Burn(msg.sender, amount0, amount1, to);
    }

    /// @notice Swap cấp thấp: gửi trước output cần lấy, kiểm invariant k sau cùng.
    function swap(uint256 amount0Out, uint256 amount1Out, address to) external {
        require(amount0Out > 0 || amount1Out > 0, "INSUFFICIENT_OUTPUT_AMOUNT");
        (uint112 _reserve0, uint112 _reserve1) = getReserves();
        require(amount0Out < _reserve0 && amount1Out < _reserve1, "INSUFFICIENT_LIQUIDITY");

        if (amount0Out > 0) IERC20(token0).transfer(to, amount0Out);
        if (amount1Out > 0) IERC20(token1).transfer(to, amount1Out);

        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        // input = balance mới − (reserve cũ − output đã gửi)
        uint256 amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint256 amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
        require(amount0In > 0 || amount1In > 0, "INSUFFICIENT_INPUT_AMOUNT");

        // trừ phí 0.3%: balanceAdjusted = balance·1000 − amountIn·3
        uint256 balance0Adjusted = balance0 * 1000 - amount0In * 3;
        uint256 balance1Adjusted = balance1 * 1000 - amount1In * 3;
        require(
            balance0Adjusted * balance1Adjusted >=
                uint256(_reserve0) * uint256(_reserve1) * (1000 ** 2),
            "K"
        );

        _update(balance0, balance1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }
}
```

**Vì sao swap lại "gửi trước rồi mới check"?** Pattern này (optimistic transfer) cho phép **flash swap** và khiến Pair không cần biết ai gọi. Điều kiện an toàn duy nhất: sau khi mọi thứ xong, `balance0Adjusted · balance1Adjusted ≥ reserve0 · reserve1 · 1000²`. Nếu người gọi không nạp đủ input, invariant `k` vỡ → revert, mọi transfer bị rollback. Contract **không tin ai**, chỉ tin số dư cuối cùng của chính nó.

---

## 6. `src/AmmRouter.sol` — periphery

Router lo phần "người dùng thân thiện": tính tỷ lệ nạp tối ưu, tính output sau phí, kiểm slippage. Ở đây Router gắn với **một** pair cho gọn (Uniswap thật dùng Factory tạo nhiều pair).

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./AmmPair.sol";

contract AmmRouter {
    AmmPair public immutable pair;
    address public immutable token0;
    address public immutable token1;

    constructor(AmmPair _pair) {
        pair = _pair;
        token0 = _pair.token0();
        token1 = _pair.token1();
    }

    /// @notice Tỷ giá thuần: bao nhiêu B tương ứng amountA theo reserve hiện tại.
    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB)
        public pure returns (uint256)
    {
        require(amountA > 0 && reserveA > 0 && reserveB > 0, "INSUFFICIENT");
        return (amountA * reserveB) / reserveA;
    }

    /// @notice Output sau phí 0.3% cho một amountIn (đây là công thức x·y=k có fee).
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        public pure returns (uint256)
    {
        require(amountIn > 0 && reserveIn > 0 && reserveOut > 0, "INSUFFICIENT");
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        return numerator / denominator;
    }

    function addLiquidity(
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min,
        address to
    ) external returns (uint256 amount0, uint256 amount1, uint256 liquidity) {
        (uint112 r0, uint112 r1) = pair.getReserves();
        if (r0 == 0 && r1 == 0) {
            (amount0, amount1) = (amount0Desired, amount1Desired); // pool trống → tự đặt giá
        } else {
            uint256 amount1Optimal = quote(amount0Desired, r0, r1);
            if (amount1Optimal <= amount1Desired) {
                require(amount1Optimal >= amount1Min, "INSUFFICIENT_1");
                (amount0, amount1) = (amount0Desired, amount1Optimal);
            } else {
                uint256 amount0Optimal = quote(amount1Desired, r1, r0);
                assert(amount0Optimal <= amount0Desired);
                require(amount0Optimal >= amount0Min, "INSUFFICIENT_0");
                (amount0, amount1) = (amount0Optimal, amount1Desired);
            }
        }
        IERC20(token0).transferFrom(msg.sender, address(pair), amount0);
        IERC20(token1).transferFrom(msg.sender, address(pair), amount1);
        liquidity = pair.mint(to);
    }

    function removeLiquidity(
        uint256 liquidity,
        uint256 amount0Min,
        uint256 amount1Min,
        address to
    ) external returns (uint256 amount0, uint256 amount1) {
        pair.transferFrom(msg.sender, address(pair), liquidity); // gửi LP vào pair
        (amount0, amount1) = pair.burn(to);
        require(amount0 >= amount0Min && amount1 >= amount1Min, "INSUFFICIENT_OUT");
    }

    /// @notice Swap `amountIn` token0→token1 (zeroForOne=true) hoặc ngược lại.
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        bool zeroForOne,
        address to
    ) external returns (uint256 amountOut) {
        (uint112 r0, uint112 r1) = pair.getReserves();
        (uint256 reserveIn, uint256 reserveOut) = zeroForOne ? (uint256(r0), uint256(r1))
                                                             : (uint256(r1), uint256(r0));
        amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        require(amountOut >= amountOutMin, "SLIPPAGE");

        address tokenIn = zeroForOne ? token0 : token1;
        IERC20(tokenIn).transferFrom(msg.sender, address(pair), amountIn);
        (uint256 a0Out, uint256 a1Out) = zeroForOne ? (uint256(0), amountOut)
                                                    : (amountOut, uint256(0));
        pair.swap(a0Out, a1Out, to);
    }
}
```

---

## 7. `test/AmmPair.t.sol` — test đầy đủ

Test là phần **quan trọng nhất** của capstone: nó chứng minh AMM đúng bằng số, không phải "chạy không revert là được".

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/AmmPair.sol";
import "../src/AmmRouter.sol";
import "../src/MockERC20.sol";

contract AmmPairTest is Test {
    MockERC20 tokenA;
    MockERC20 tokenB;
    AmmPair pair;
    AmmRouter router;

    address lp = address(0xA11CE);   // liquidity provider
    address trader = address(0xB0B);

    function setUp() public {
        tokenA = new MockERC20("Token A", "TKA");
        tokenB = new MockERC20("Token B", "TKB");
        pair = new AmmPair(address(tokenA), address(tokenB));
        router = new AmmRouter(pair);

        // token0/token1 được sort trong Pair — map lại cho tiện đọc test
        tokenA.mint(lp, 1_000_000 ether);
        tokenB.mint(lp, 1_000_000 ether);
        tokenA.mint(trader, 100_000 ether);
        tokenB.mint(trader, 100_000 ether);
    }

    // Helper: nạp thanh khoản qua Router (approve rồi addLiquidity theo thứ tự token0/token1)
    function _addLiquidity(address who, uint256 amt0, uint256 amt1) internal returns (uint256) {
        vm.startPrank(who);
        IERC20(pair.token0()).approve(address(router), amt0);
        IERC20(pair.token1()).approve(address(router), amt1);
        (, , uint256 liq) = router.addLiquidity(amt0, amt1, 0, 0, who);
        vm.stopPrank();
        return liq;
    }

    /* ---------- 1) MINT: lần nạp đầu = sqrt(x·y) − MINIMUM_LIQUIDITY ---------- */
    function test_FirstMint() public {
        uint256 liq = _addLiquidity(lp, 100 ether, 400 ether);
        // sqrt(100e18 · 400e18) = 200e18; trừ 1000 wei khoá vĩnh viễn
        assertEq(liq, 200 ether - 1000);
        assertEq(pair.totalSupply(), 200 ether);       // gồm cả 1000 khoá
        (uint112 r0, uint112 r1) = pair.getReserves();
        assertEq(uint256(r0) * uint256(r1), 100 ether * 400 ether); // k khởi tạo
    }

    /* ---------- 2) SWAP: đúng công thức có phí 0.3% ---------- */
    function test_SwapAppliesFee() public {
        _addLiquidity(lp, 1_000 ether, 1_000 ether); // pool 1:1

        uint256 amountIn = 100 ether;
        uint256 expectedOut = router.getAmountOut(amountIn, 1_000 ether, 1_000 ether);
        // = 100·997·1000 / (1000·1000 + 100·997) = 99700000/1099700 ≈ 90.66 token
        assertApproxEqAbs(expectedOut, 90.66 ether, 0.01 ether);

        vm.startPrank(trader);
        IERC20(pair.token0()).approve(address(router), amountIn);
        uint256 balBefore = IERC20(pair.token1()).balanceOf(trader);
        uint256 out = router.swapExactTokensForTokens(amountIn, 0, true, trader);
        vm.stopPrank();

        assertEq(out, expectedOut);
        assertEq(IERC20(pair.token1()).balanceOf(trader) - balBefore, expectedOut);
    }

    /* ---------- 3) INVARIANT: k KHÔNG BAO GIỜ giảm sau swap (phí làm k tăng) ---------- */
    function test_KNeverDecreases() public {
        _addLiquidity(lp, 5_000 ether, 5_000 ether);
        (uint112 r0, uint112 r1) = pair.getReserves();
        uint256 kBefore = uint256(r0) * uint256(r1);

        vm.startPrank(trader);
        IERC20(pair.token0()).approve(address(router), 500 ether);
        router.swapExactTokensForTokens(500 ether, 0, true, trader);
        vm.stopPrank();

        (r0, r1) = pair.getReserves();
        uint256 kAfter = uint256(r0) * uint256(r1);
        assertGt(kAfter, kBefore); // strictly tăng vì 0.3% phí ở lại pool
    }

    /* ---------- 4) SWAP gian lận (nạp thiếu input) phải REVERT vì vỡ k ---------- */
    function test_SwapUnderpaidReverts() public {
        _addLiquidity(lp, 1_000 ether, 1_000 ether);
        // Gọi thẳng Pair: chỉ nạp 1 token0 nhưng đòi lấy 10 token1 → underpay → vỡ k.
        vm.startPrank(trader);
        IERC20(pair.token0()).transfer(address(pair), 1 ether); // input QUÁ ít
        vm.expectRevert(bytes("K"));
        pair.swap(0, 10 ether, trader);
        vm.stopPrank();
    }

    /* ---------- 5) BURN: rút về đúng pro-rata + phần phí tích luỹ ---------- */
    function test_BurnReturnsProRata() public {
        uint256 liq = _addLiquidity(lp, 1_000 ether, 1_000 ether);

        // trader swap để bơm phí vào pool
        vm.startPrank(trader);
        IERC20(pair.token0()).approve(address(router), 200 ether);
        router.swapExactTokensForTokens(200 ether, 0, true, trader);
        vm.stopPrank();

        vm.startPrank(lp);
        pair.approve(address(router), liq);
        (uint256 out0, uint256 out1) = router.removeLiquidity(liq, 0, 0, lp);
        vm.stopPrank();

        // LP đưa vào 1000+1000, rút ra tổng value > 2000 vì thu phí 0.3%
        // (token0 nhiều hơn do trader bơm token0 vào; token1 ít hơn do bị mua bớt)
        assertGt(out0, 1_000 ether); // nhận nhiều token0 hơn ban đầu
        assertLt(out1, 1_000 ether); // nhận ít token1 hơn ban đầu
        assertGt(out0 + out1, 2_000 ether); // TỔNG value > vốn gốc: đó là phí LP
    }

    /* ---------- 6) IMPERMANENT LOSS: LP thua so với HODL khi giá lệch ---------- */
    function test_ImpermanentLoss() public {
        // pool 1:1, LP nạp 1000 A + 1000 B. Nếu chỉ HODL: giữ nguyên 1000 A + 1000 B.
        uint256 liq = _addLiquidity(lp, 1_000 ether, 1_000 ether);

        // Một loạt swap đẩy giá token1 lên (mua token1 bằng token0) tới ~4x.
        vm.startPrank(trader);
        IERC20(pair.token0()).approve(address(router), type(uint256).max);
        router.swapExactTokensForTokens(1_000 ether, 0, true, trader); // đẩy giá mạnh
        vm.stopPrank();

        // Giá mới của token1 (theo token0) = reserve0 / reserve1
        (uint112 r0, uint112 r1) = pair.getReserves();
        uint256 price = (uint256(r0) * 1e18) / uint256(r1); // token0 per token1, scaled 1e18

        // LP rút toàn bộ
        vm.startPrank(lp);
        pair.approve(address(router), liq);
        (uint256 out0, uint256 out1) = router.removeLiquidity(liq, 0, 0, lp);
        vm.stopPrank();

        // Định giá tất cả về token0 theo giá pool hiện tại:
        uint256 lpValue   = out0 + (out1 * price) / 1e18;                 // giá trị khi là LP
        uint256 hodlValue = 1_000 ether + (1_000 ether * price) / 1e18;   // nếu chỉ HODL

        // Impermanent loss: LP value < HODL value (dù đã cộng phí 0.3%).
        assertLt(lpValue, hodlValue);
        emit log_named_decimal_uint("LP value  (token0)", lpValue, 18);
        emit log_named_decimal_uint("HODL value(token0)", hodlValue, 18);
    }
}
```

Chạy:

```bash
forge test -vv
```

Bạn sẽ thấy 6 test PASS. Test IL in ra hai con số: **LP value < HODL value** — bằng chứng số học rằng **cung cấp thanh khoản không miễn phí**. Khi giá lệch, đường cong `x·y=k` tự động **bán token đang lên và mua token đang xuống**, khiến LP luôn giữ ít token tăng giá hơn so với chỉ HODL. Phí 0.3% là thứ bù đắp — LP chỉ có lãi thực khi **phí thu được > IL**.

---

## 8. Những cạm bẫy cần nhớ (expert)

| Cạm bẫy | Vì sao nguy hiểm | Cách xử lý |
|---------|-------------------|------------|
| **Không có `MINIMUM_LIQUIDITY`** | Kẻ tấn công đẩy `totalSupply` về 1 wei rồi "donate" để lạm phát giá 1 LP-share (inflation attack) | Khoá vĩnh viễn 1000 wei ở lần mint đầu |
| **Tin tham số truyền vào swap** | Pair mà tự tính input từ tham số → dễ bị lừa | Pair chỉ đọc **balance thật của mình**, suy ra input |
| **Không kiểm slippage / deadline** | Bị sandwich/MEV bòn rút | `amountOutMin` + `deadline` ở Router |
| **Fee-on-transfer / rebase token** | `balanceOf` lệch với amount transfer → vỡ kế toán | Whitelist token hoặc dùng biến thể hỗ trợ FOT |
| **Làm tròn có lợi cho user** | Chia nguyên trong Solidity luôn làm tròn xuống; phải đảm bảo luôn nghiêng về **pool** | Kiểm `k` sau cùng, không tin phép chia trung gian |

Uniswap V2 thật còn có: **price oracle TWAP** (cộng dồn `price0CumulativeLast`), **flash swap** (gọi callback giữa transfer và check `k`), và **protocol fee** 1/6 của phí. Bản mini này bỏ chúng để tập trung vào lõi.

---

## 9. Tóm tắt
- **AMM** thay order book bằng đường cong **`x·y=k`**: giá là đạo hàm của đường cong, tự sinh ra từ tỷ lệ reserve.
- **Phí 0.3%** được cài bằng cách chỉ cho `997/1000` input tham gia; phần dư ở lại pool làm **`k` tăng dần** = lợi nhuận LP.
- **Pair** giữ reserve và ba hàm lõi `mint/burn/swap`, "ngu" nhưng an toàn vì chỉ tin **balance thật của mình** và invariant `k`.
- **Router** lo `quote`, `getAmountOut`, slippage — tách biệt để Pair không cần tin ai.
- **Test đúng** phải chứng minh bằng số: invariant `k` không giảm, phí đúng, swap thiếu input revert, và **impermanent loss** khi giá lệch.
- IL là chi phí thật của LP; chỉ có lãi khi **phí thu > IL**.

> **Bài tiếp theo:** đưa AMM này lên testnet, thêm **TWAP oracle** và viết một **frontend** gọi Router bằng ethers/viem để hoàn thiện một DEX end-to-end.
