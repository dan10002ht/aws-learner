# Bài 19 — Foundry/Hardhat: viết, test, deploy

## 1. Mục tiêu
Sau bài này bạn có thể:
- Cài **Foundry** và hiểu vai trò 3 binary: `forge` (build/test), `cast` (CLI tương tác chain), `anvil` (local node).
- Nắm **cấu trúc project** Foundry (`src/`, `test/`, `script/`, `lib/`, `foundry.toml`) và cách quản lý dependency bằng git submodule.
- Viết **test bằng chính Solidity**: `setUp`, các `assertEq/assertTrue`, cheatcode `vm.prank`, `vm.expectRevert`, `vm.expectEmit`, `deal`.
- Viết **fuzz test** (property-based) và **fork test** (chạy trên bản sao mainnet).
- Dùng `cast` để đọc/ghi chain thật, và viết **deploy script** bằng Solidity (`forge script`).
- So sánh Foundry với **Hardhat** (JavaScript) — biết khi nào chọn cái nào.

---

## 2. Lý thuyết

### 2.1 Foundry là gì — và tại sao "test bằng Solidity"?

Trước Foundry, chuẩn ngành là **Hardhat/Truffle**: contract viết bằng Solidity, nhưng **test viết bằng JavaScript/TypeScript** (ethers.js + Mocha/Chai). Vấn đề: mỗi lần test bạn phải **vượt biên ngôn ngữ** — JS gọi RPC → EVM, chậm và phải mô phỏng lại kiểu dữ liệu Solidity (BigNumber, bytes...) trong JS.

**Foundry** lật ngược: test **cũng viết bằng Solidity**, chạy trực tiếp trên một EVM nhúng (viết bằng Rust — cực nhanh). Bạn ở cùng một ngôn ngữ với contract, gọi hàm trực tiếp, không tuần tự hóa qua JSON-RPC. Kết quả: test **nhanh gấp hàng chục lần**, và có **cheatcode** — những "phép thuật" thao túng EVM state (đổi `msg.sender`, tua thời gian, nạp balance) mà JS framework khó làm mượt.

<svg viewBox="0 0 720 250" role="img" aria-labelledby="tool-t tool-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="tool-t">Ba binary của Foundry</title>
<desc id="tool-d">forge để build và test, cast để tương tác chain, anvil là local node, cùng thao tác trên EVM</desc>
<rect x="40" y="40" width="160" height="70" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="70" text-anchor="middle" font-size="15" fill="currentColor">forge</text>
<text x="120" y="92" text-anchor="middle" font-size="11" fill="currentColor">build · test · deploy</text>
<rect x="280" y="40" width="160" height="70" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="70" text-anchor="middle" font-size="15" fill="currentColor">cast</text>
<text x="360" y="92" text-anchor="middle" font-size="11" fill="currentColor">call · send · decode</text>
<rect x="520" y="40" width="160" height="70" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="600" y="70" text-anchor="middle" font-size="15" fill="currentColor">anvil</text>
<text x="600" y="92" text-anchor="middle" font-size="11" fill="currentColor">local EVM node</text>
<rect x="220" y="170" width="280" height="55" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="197" text-anchor="middle" font-size="14" fill="currentColor">EVM (revm — Rust)</text>
<text x="360" y="215" text-anchor="middle" font-size="11" fill="currentColor">local · fork mainnet · chain thật</text>
<line x1="120" y1="110" x2="300" y2="168" stroke="currentColor" stroke-width="1.5" marker-end="url(#fa)"/>
<line x1="360" y1="110" x2="360" y2="168" stroke="currentColor" stroke-width="1.5" marker-end="url(#fa)"/>
<line x1="600" y1="110" x2="420" y2="168" stroke="currentColor" stroke-width="1.5" marker-end="url(#fa)"/>
<defs><marker id="fa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.2 Cài đặt

```bash
# foundryup — trình quản lý phiên bản Foundry
curl -L https://foundry.paradigm.xyz | bash
# mở shell mới rồi:
foundryup

# kiểm tra
forge --version   # forge 0.2.0 (...)
cast --version
anvil --version
```

`foundryup` tải sẵn cả 3 binary (`forge`, `cast`, `anvil`, và `chisel` — REPL Solidity). Chạy lại `foundryup` bất cứ lúc nào để cập nhật lên bản mới nhất.

### 2.3 Tạo & cấu trúc project

```bash
forge init my-project      # tạo scaffold
cd my-project
```

```
my-project/
├── foundry.toml       # cấu hình (compiler, remapping, rpc, optimizer)
├── src/               # contract nguồn (Counter.sol)
├── test/              # test *.t.sol
├── script/            # deploy script *.s.sol
├── lib/               # dependency (git submodule) — forge-std ở đây
└── out/               # ABI + bytecode sau khi build
```

`foundry.toml` tối thiểu:

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.24"
optimizer = true
optimizer_runs = 200

[rpc_endpoints]
mainnet = "${MAINNET_RPC_URL}"    # đọc từ biến môi trường / .env

[etherscan]
mainnet = { key = "${ETHERSCAN_API_KEY}" }
```

Dependency **không** dùng npm mà dùng **git submodule** qua `forge install`:

```bash
forge install OpenZeppelin/openzeppelin-contracts
# import trong Solidity nhờ remapping (forge tự sinh remappings.txt / dò lib/)
# import "openzeppelin-contracts/token/ERC20/ERC20.sol";
```

### 2.4 Contract mẫu để test

Đặt tại `src/Vault.sol` — một vault gửi/rút ETH đơn giản, có sự kiện và điều kiện revert để minh họa đủ loại test.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Vault {
    mapping(address => uint256) public balanceOf;
    address public immutable owner;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    error InsufficientBalance();
    error NotOwner();

    constructor() {
        owner = msg.sender;
    }

    function deposit() external payable {
        balanceOf[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        if (amount > balanceOf[msg.sender]) revert InsufficientBalance();
        balanceOf[msg.sender] -= amount;         // effects trước
        emit Withdrawn(msg.sender, amount);
        (bool ok, ) = msg.sender.call{value: amount}("");  // interactions sau
        require(ok, "transfer failed");
    }
}
```

---

## 3. Viết test bằng Solidity

### 3.1 Khung test & `setUp`

Mỗi file test kế thừa `Test` từ **forge-std**. Hàm `setUp()` chạy **lại trước mỗi** test function (mỗi test là một state độc lập — không rò rỉ giữa các test). Hàm test bắt đầu bằng tiền tố `test`.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {Vault} from "../src/Vault.sol";

contract VaultTest is Test {
    Vault vault;
    address alice = makeAddr("alice");   // sinh address xác định từ label
    address bob   = makeAddr("bob");

    function setUp() public {
        vault = new Vault();             // deploy mới trước MỖI test
        vm.deal(alice, 10 ether);        // nạp 10 ETH cho alice
        vm.deal(bob, 10 ether);
    }

    function test_DepositIncreasesBalance() public {
        vm.prank(alice);                 // dòng NGAY SAU chạy như alice
        vault.deposit{value: 1 ether}();
        assertEq(vault.balanceOf(alice), 1 ether);
    }
}
```

Chạy:

```bash
forge test              # chạy hết
forge test -vvv         # -v tăng độ chi tiết; -vvv in cả trace khi fail
forge test --match-test test_Deposit   # lọc theo tên
forge test --gas-report # bảng gas từng hàm
```

### 3.2 Các assertion thường dùng

| Assertion | Ý nghĩa |
|-----------|---------|
| `assertEq(a, b)` | a == b (có bản cho uint, int, address, bool, bytes, string) |
| `assertEq(a, b, "msg")` | kèm thông báo khi fail |
| `assertTrue(x)` / `assertFalse(x)` | điều kiện boolean |
| `assertGt/assertGe/assertLt/assertLe` | so sánh lớn/nhỏ hơn |
| `assertApproxEqAbs(a, b, delta)` | gần đúng theo sai số tuyệt đối |

### 3.3 Cheatcode `vm.prank` — giả mạo `msg.sender`

`vm.prank(x)` khiến **đúng lời gọi kế tiếp** có `msg.sender == x`. Muốn nhiều lời gọi liên tiếp thì dùng `vm.startPrank(x)` ... `vm.stopPrank()`.

```solidity
function test_WithdrawSendsEther() public {
    vm.startPrank(alice);
    vault.deposit{value: 3 ether}();
    vault.withdraw(1 ether);
    vm.stopPrank();

    assertEq(vault.balanceOf(alice), 2 ether);
    assertEq(alice.balance, 8 ether);   // 10 - 3 gửi + 1 rút
}
```

### 3.4 Cheatcode `vm.expectRevert` — kỳ vọng lỗi

Đặt **ngay trước** lời gọi mà bạn kỳ vọng revert. Có thể khớp custom error, string, hoặc bất kỳ revert nào.

```solidity
function test_WithdrawTooMuchReverts() public {
    vm.prank(alice);
    vault.deposit{value: 1 ether}();

    vm.prank(alice);
    vm.expectRevert(Vault.InsufficientBalance.selector);  // khớp custom error
    vault.withdraw(2 ether);
}

function test_RevertWithStringMessage() public {
    vm.expectRevert("transfer failed");     // khớp require(..., "string")
    // ... lời gọi gây revert bằng string
}
```

### 3.5 Cheatcode `vm.expectEmit` — kỳ vọng event

Khai báo 4 cờ `checkTopic1..3, checkData` rồi phát **event kỳ vọng**, sau đó gọi hàm thật.

```solidity
function test_DepositEmitsEvent() public {
    vm.expectEmit(true, false, false, true);   // check indexed[0] + data
    emit Vault.Deposited(alice, 1 ether);       // event kỳ vọng
    vm.prank(alice);
    vault.deposit{value: 1 ether}();            // hành động thật
}
```

Các cheatcode hữu ích khác: `vm.warp(ts)` đặt `block.timestamp`, `vm.roll(n)` đặt `block.number`, `vm.deal(addr, amt)` đặt balance, `vm.label(addr, "name")` gắn nhãn cho trace, `vm.mockCall(...)` giả kết quả lời gọi ngoài.

---

## 4. Fuzz test (property-based)

Nếu hàm test **có tham số**, Foundry tự động **fuzz**: chạy hàng trăm lần với input ngẫu nhiên, tìm phản ví dụ phá vỡ một **tính chất (property)** thay vì bạn tự bịa vài giá trị. Đây là điểm mạnh lớn của Foundry so với unit test tay.

```solidity
// tham số `amount` được fuzz với đủ loại giá trị ngẫu nhiên
function testFuzz_DepositThenWithdraw(uint256 amount) public {
    amount = bound(amount, 0, 10 ether);   // giới hạn miền hợp lệ
    vm.startPrank(alice);
    vault.deposit{value: amount}();
    vault.withdraw(amount);
    vm.stopPrank();
    // property: gửi rồi rút hết → balance nội bộ về 0
    assertEq(vault.balanceOf(alice), 0);
}
```

- `bound(x, lo, hi)` ép input vào miền hợp lệ (tốt hơn `vm.assume` vì không vứt bỏ input).
- `vm.assume(cond)` loại các input không thỏa (dùng ít, tránh vứt quá nhiều mẫu).
- Số lần chạy đặt trong `foundry.toml`: `[fuzz] runs = 256`. Khi fail, Foundry in **counterexample** cụ thể để tái hiện.

> Nâng cao: **invariant testing** (`invariant_*` + handler) cho phép Foundry bắn **chuỗi lời gọi ngẫu nhiên** vào contract và kiểm một bất biến toàn cục (ví dụ: tổng balance nội bộ luôn == số ETH contract giữ). Đây là công cụ mạnh nhất để tìm bug logic.

---

## 5. Fork test — chạy trên bản sao mainnet

Fork test cho phép test contract **chống lại state thật của mainnet** (giá Uniswap, USDC thật, Aave...) mà không tốn tiền, không cần deploy lại toàn bộ hệ sinh thái. Foundry tải state theo yêu cầu (lazy) từ một RPC archive node.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
}

contract ForkTest is Test {
    // USDC trên Ethereum mainnet
    IERC20 usdc = IERC20(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
    address whale = 0x55FE002aefF02F77364de339a1292923A15844B8; // ví nhiều USDC

    function setUp() public {
        // fork mainnet tại block cụ thể để test tất định (deterministic)
        vm.createSelectFork(vm.rpcUrl("mainnet"), 19_000_000);
    }

    function test_WhaleHasUsdc() public view {
        assertGt(usdc.balanceOf(whale), 1_000_000e6);  // > 1 triệu USDC
    }

    function test_ImpersonateWhaleTransfer() public {
        uint256 amount = 100e6;                 // 100 USDC (6 decimals)
        vm.prank(whale);                        // giả làm whale
        usdc.transfer(address(this), amount);
        assertEq(usdc.balanceOf(address(this)), amount);
    }
}
```

Chạy:

```bash
# cách 1: cấu hình rpc trong foundry.toml + gọi vm.createSelectFork như trên
forge test --match-contract ForkTest

# cách 2: fork toàn bộ suite từ CLI, không cần code
forge test --fork-url $MAINNET_RPC_URL --fork-block-number 19000000
```

Ghim `--fork-block-number` giúp test **tất định** và cache được (lần sau không tải lại state). Không ghim block → state đổi theo thời gian, test dễ "flaky".

---

## 6. `cast` — dao đa năng tương tác chain

`cast` là CLI để đọc/ghi/giải mã trên bất kỳ EVM chain nào (local anvil hay mainnet).

```bash
# đọc state (eth_call, không tốn gas)
cast call 0xA0b8...eB48 "balanceOf(address)(uint256)" 0x55FE...44B8 \
  --rpc-url $MAINNET_RPC_URL

# đọc biến/thông tin block
cast block-number --rpc-url $MAINNET_RPC_URL
cast balance vitalik.eth --rpc-url $MAINNET_RPC_URL --ether

# gửi transaction (ghi state — cần private key)
cast send 0xVault "deposit()" --value 1ether \
  --rpc-url http://localhost:8545 --private-key $PK

# tiện ích mã hóa/giải mã
cast --to-wei 1.5 ether          # 1500000000000000000
cast sig "transfer(address,uint256)"   # 0xa9059cbb (4-byte selector)
cast 4byte 0xa9059cbb            # tra ngược selector → tên hàm
cast keccak "hello"              # keccak256
cast wallet new                  # sinh keypair mới
```

Khởi động node local để thử nghiệm:

```bash
anvil   # bật node tại 127.0.0.1:8545, in sẵn 10 tài khoản + private key test
# anvil --fork-url $MAINNET_RPC_URL   # anvil cũng fork được mainnet
```

---

## 7. Deploy script bằng Solidity

Foundry deploy bằng **script viết bằng Solidity** (`script/*.s.sol`), kế thừa `Script`, dùng `vm.startBroadcast()` để đánh dấu các lời gọi cần **gửi thật** lên chain.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Vault} from "../src/Vault.sol";

contract DeployVault is Script {
    function run() external returns (Vault vault) {
        // lấy private key từ biến môi trường (đừng hardcode!)
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);          // từ đây tx được ký & broadcast
        vault = new Vault();
        vm.stopBroadcast();
        console.log("Vault deployed at:", address(vault));
    }
}
```

```bash
# chạy khô (simulate, không gửi tx)
forge script script/Deploy.s.sol:DeployVault --rpc-url $RPC_URL

# deploy thật + verify trên Etherscan
forge script script/Deploy.s.sol:DeployVault \
  --rpc-url $RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

`--broadcast` mới thực sự gửi tx; thiếu nó là chạy mô phỏng (an toàn để xem gas & lỗi trước). File kết quả (địa chỉ, tx hash) lưu trong `broadcast/`.

> Cách nhanh cho contract đơn giản: `forge create src/Vault.sol:Vault --rpc-url $RPC_URL --private-key $PK`. Script phù hợp khi deploy nhiều contract có liên kết/khởi tạo phức tạp.

---

## 8. So sánh Foundry vs Hardhat

| Tiêu chí | Foundry | Hardhat |
|----------|---------|---------|
| **Ngôn ngữ test** | Solidity | JavaScript / TypeScript |
| **Tốc độ test** | Rất nhanh (EVM Rust) | Chậm hơn (qua JS ↔ RPC) |
| **Fuzz / invariant** | Tích hợp sẵn, mạnh | Cần plugin, hạn chế |
| **Fork mainnet** | Native, nhanh, cache tốt | Có (hardhat-network) |
| **Cheatcode** | Phong phú (`vm.*`) | Qua `hardhat_*` RPC, ít mượt hơn |
| **Dependency** | git submodule | npm |
| **Hệ sinh thái JS/frontend** | Yếu (không JS) | Mạnh (ethers, typechain, deploy phức tạp) |
| **Scripting/off-chain** | Hạn chế trong Solidity | Linh hoạt (cả Node ecosystem) |

Tương đương phía Hardhat (một unit test):

```javascript
// test/Vault.js — Hardhat + ethers + Chai
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Vault", function () {
  it("deposit tăng balance", async function () {
    const [alice] = await ethers.getSigners();
    const Vault = await ethers.getContractFactory("Vault");
    const vault = await Vault.deploy();
    await vault.connect(alice).deposit({ value: ethers.parseEther("1") });
    expect(await vault.balanceOf(alice.address)).to.equal(
      ethers.parseEther("1")
    );
  });
});
```

**Chọn thế nào?**
- **Foundry**: test/fuzz/security-focused, tốc độ, contract-heavy — chuẩn de-facto của giới audit và protocol hiện nay.
- **Hardhat**: cần tích hợp sâu frontend/backend JS, deploy pipeline phức tạp, hoặc team đã quen TypeScript.
- Thực tế nhiều dự án **dùng cả hai**: Foundry cho test/fuzz, Hardhat cho tasks & tích hợp — nhờ chúng dùng chung `src/` và ABI trong `out/`.

---

## 9. Tóm tắt
- **Foundry** = `forge` (build/test) + `cast` (tương tác chain) + `anvil` (local node), chạy trên EVM Rust nên rất nhanh.
- Test viết **bằng Solidity**: `setUp()` chạy lại trước mỗi test, `assertEq/assertTrue`, và **cheatcode** `vm.prank`, `vm.expectRevert`, `vm.expectEmit`, `vm.deal`.
- **Fuzz test**: thêm tham số vào hàm test + `bound()` để kiểm **property** trên hàng trăm input ngẫu nhiên; nâng cao có **invariant testing**.
- **Fork test**: `vm.createSelectFork` hoặc `--fork-url` để chạy trên bản sao mainnet, ghim block cho tất định.
- **Deploy** bằng `forge script` với `vm.startBroadcast()`; `--broadcast` để gửi thật, `--verify` để verify Etherscan.
- **Foundry vs Hardhat**: Foundry thắng về tốc độ/fuzz/security; Hardhat thắng về hệ sinh thái JS — nhiều team dùng cả hai.

> **Bài tiếp theo:** đi sâu vào **bảo mật smart contract** — reentrancy, integer issues, access control, và cách dùng chính fuzz/invariant test của Foundry để săn lỗ hổng.
