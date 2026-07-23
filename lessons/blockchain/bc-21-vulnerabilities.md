# Bài 22 — Lỗ hổng smart contract kinh điển

## 1. Mục tiêu
Sau bài này bạn có thể:
- Nhận diện **8 họ lỗ hổng kinh điển** trên EVM: reentrancy, integer overflow/underflow, front-running/MEV, delegatecall injection, `tx.origin` phishing, unchecked external call, thiếu access control, price oracle manipulation.
- Đọc **code lỗ hổng** và chỉ ra **chính xác dòng nào bị khai thác** và tại sao.
- Viết **bản vá** đúng chuẩn: checks-effects-interactions, `ReentrancyGuard`, `SafeERC20`, `msg.sender`, TWAP/Chainlink...
- Hiểu **mô hình mối đe doạ EVM**: mọi lời gọi ra ngoài (external call) đều có thể **trao quyền điều khiển** cho attacker giữa chừng.

---

## 2. Lý thuyết nền: vì sao EVM dễ dính bẫy

### 2.1 Analogy — nhân viên thu ngân ngây thơ

Hãy tưởng tượng một thu ngân làm theo đúng thứ tự sai: **đưa tiền trước, ghi sổ trừ số dư sau**. Một khách khôn lỏi cầm tiền xong lại chìa phiếu rút lần nữa **trước khi thu ngân kịp ghi sổ**. Vì sổ vẫn báo "còn tiền", thu ngân lại đưa tiếp. Đó chính là **reentrancy** — và bản chất mọi lỗ hổng EVM đều xoay quanh một sự thật:

> Trong EVM, khi contract A **gọi ra ngoài** contract B (dù chỉ để chuyển ETH), **B giành quyền thực thi** và có thể gọi ngược lại A **ngay giữa lúc A chưa cập nhật xong state**. Code của bạn không "chạy một mạch" như bạn tưởng.

### 2.2 Ba đặc tính EVM khiến bug thành tiền mất

| Đặc tính EVM | Hệ quả bảo mật |
|--------------|----------------|
| **Mọi thứ public & bất biến** | Deploy sai = vá không được; ai cũng đọc được logic để tìm sơ hở. |
| **External call = trao quyền điều khiển** | Callee có thể re-enter, revert, tiêu hết gas — reentrancy, DoS. |
| **Mempool công khai, có thứ tự** | Ai trả gas cao hơn được xử lý trước → front-running, sandwich, MEV. |
| **Số học wrap-around (trước 0.8)** | `x - 1` khi `x = 0` cho ra số cực lớn → overflow/underflow. |

---

## 3. Reentrancy — lỗ hổng đắt giá nhất lịch sử (The DAO, 2016)

### 3.1 Cơ chế tấn công

<svg viewBox="0 0 720 320" role="img" aria-labelledby="re-t re-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="re-t">Vòng lặp reentrancy</title>
<desc id="re-d">Contract nạn nhân gửi ETH cho attacker, hàm fallback của attacker gọi ngược withdraw trước khi số dư được cập nhật</desc>
<rect x="60" y="40" width="180" height="240" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="150" y="66" text-anchor="middle" font-size="14" fill="currentColor">Vault (nạn nhân)</text>
<rect x="480" y="40" width="180" height="240" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="570" y="66" text-anchor="middle" font-size="14" fill="currentColor">Attacker</text>
<line x1="240" y1="110" x2="478" y2="110" stroke="currentColor" stroke-width="1.5" marker-end="url(#rah)"/>
<text x="360" y="102" text-anchor="middle" font-size="11" fill="currentColor">1. call{value} gửi ETH</text>
<line x1="480" y1="160" x2="242" y2="160" stroke="#f43f5e" stroke-width="1.5" marker-end="url(#rah2)"/>
<text x="360" y="152" text-anchor="middle" font-size="11" fill="#f43f5e">2. fallback() gọi lại withdraw()</text>
<line x1="240" y1="210" x2="478" y2="210" stroke="currentColor" stroke-width="1.5" marker-end="url(#rah)"/>
<text x="360" y="202" text-anchor="middle" font-size="11" fill="currentColor">3. lại gửi ETH (số dư CHƯA trừ)</text>
<text x="360" y="248" text-anchor="middle" font-size="11" fill="#f43f5e">lặp 2↔3 tới khi Vault cạn tiền</text>
<text x="150" y="255" text-anchor="middle" font-size="10" fill="currentColor">balances[x] trừ sau → sai</text>
<defs>
<marker id="rah" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker>
<marker id="rah2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#f43f5e"/></marker>
</defs>
</svg>

### 3.2 Code lỗ hổng

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VaultVulnerable {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "no balance");

        // ❌ INTERACTION trước, EFFECT sau
        (bool ok, ) = msg.sender.call{value: amount}("");   // trao quyền cho attacker
        require(ok, "transfer failed");

        balances[msg.sender] = 0;   // cập nhật QUÁ MUỘN
    }
}
```

Contract khai thác:

```solidity
contract Attacker {
    VaultVulnerable public vault;
    constructor(address _v) { vault = VaultVulnerable(_v); }

    function attack() external payable {
        vault.deposit{value: 1 ether}();
        vault.withdraw();              // khởi động vòng lặp
    }

    // fallback được gọi mỗi lần Vault gửi ETH về
    receive() external payable {
        if (address(vault).balance >= 1 ether) {
            vault.withdraw();          // re-enter khi balances[] chưa bị zero-out
        }
    }
}
```

### 3.3 Bản vá — Checks-Effects-Interactions + guard

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract VaultSafe is ReentrancyGuard {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external nonReentrant {          // lớp phòng thủ 2
        uint256 amount = balances[msg.sender];           // 1. CHECKS
        require(amount > 0, "no balance");

        balances[msg.sender] = 0;                        // 2. EFFECTS (cập nhật TRƯỚC)

        (bool ok, ) = msg.sender.call{value: amount}(""); // 3. INTERACTIONS (gọi ngoài SAU CÙNG)
        require(ok, "transfer failed");
    }
}
```

Hai lớp phòng thủ độc lập:
1. **Checks-Effects-Interactions (CEI)**: luôn cập nhật state **trước** khi gọi ra ngoài. Khi attacker re-enter, `balances[msg.sender]` đã = 0 → `require` chặn.
2. **`nonReentrant`**: khoá mutex, mọi lời gọi lồng nhau vào hàm cùng contract đều revert. Dùng CEI làm gốc, guard làm lưới an toàn.

> ⚠️ Có **cross-function** và **read-only reentrancy**: attacker re-enter vào một hàm *khác* (hoặc đọc getter) khi state đang dở dang. Vì thế CEI phải áp dụng nhất quán toàn contract, không chỉ trong đúng hàm bị gọi.

---

## 4. Integer overflow / underflow (pre-0.8)

Trước Solidity 0.8, số học **wrap quanh vòng** không báo lỗi: `uint8` đạt 255 + 1 → 0; `0 - 1` → 255.

```solidity
// ❌ Solidity < 0.8.0 — không có kiểm tra tràn
pragma solidity ^0.7.6;
contract TokenBad {
    mapping(address => uint256) public balanceOf;

    function transfer(address to, uint256 v) external {
        require(balanceOf[msg.sender] - v >= 0);   // VÔ NGHĨA: uint luôn >= 0
        balanceOf[msg.sender] -= v;                 // underflow → số dư khổng lồ
        balanceOf[to] += v;
    }
}
```

Khi `v > balanceOf[msg.sender]`, phép trừ underflow ra ~2^256, attacker tự "in" token vô hạn (họ batchOverflow/BEC 2018 khiến nhiều token về 0 giá trị).

**Bản vá:**

```solidity
// ✅ Cách 1: Solidity >= 0.8.0 — tràn tự revert
pragma solidity ^0.8.20;
contract TokenGood {
    mapping(address => uint256) public balanceOf;
    function transfer(address to, uint256 v) external {
        balanceOf[msg.sender] -= v;   // underflow tự động revert
        balanceOf[to] += v;
    }
}

// ✅ Cách 2: pre-0.8 phải dùng SafeMath
using SafeMath for uint256;
balanceOf[msg.sender] = balanceOf[msg.sender].sub(v);  // .sub revert nếu âm
```

> Từ 0.8, chỉ nên bọc `unchecked { }` khi bạn **chắc chắn** không tràn (ví dụ tăng biến đếm vòng lặp) để tiết kiệm gas — đừng lạm dụng.

---

## 5. Front-running & MEV

Mempool công khai: giao dịch của bạn **nằm chờ ai cũng thấy** trước khi lên block. Miner/validator (hoặc bot MEV) có thể **chèn giao dịch của họ trước/sau** bạn.

- **Front-run**: thấy bạn sắp mua token → bot mua trước, đẩy giá lên, bán lại cho bạn.
- **Sandwich**: bot đặt 1 lệnh trước + 1 lệnh sau giao dịch nạn nhân, ăn chênh lệch slippage.
- **Điển hình lỗ**: pattern `approve` + `transferFrom`, hoặc trò chơi "đoán đáp án nhận thưởng" mà đáp án gửi dạng plaintext.

```solidity
// ❌ Lời giải gửi công khai — bot đọc mempool, front-run để nẫng thưởng
function submitAnswer(string calldata answer) external {
    require(keccak256(bytes(answer)) == answerHash);
    payable(msg.sender).transfer(reward);
}
```

**Phòng chống:**
- **Commit-reveal**: giai đoạn 1 gửi `hash(answer, nonce)`; giai đoạn 2 mới reveal → mempool không lộ nội dung.
- **Slippage protection**: mọi swap phải có `amountOutMin` / `deadline` (Uniswap bắt buộc) để sandwich không có lời.
- **Private orderflow / batch auction**: Flashbots Protect, CoW Swap — không đưa tx vào mempool công khai.

```solidity
// ✅ Commit-reveal
mapping(address => bytes32) public commit;
function commitAnswer(bytes32 h) external { commit[msg.sender] = h; }   // giai đoạn commit
function reveal(string calldata answer, uint256 nonce) external {
    require(commit[msg.sender] == keccak256(abi.encodePacked(answer, nonce)));
    require(keccak256(bytes(answer)) == answerHash);
    payable(msg.sender).transfer(reward);
}
```

---

## 6. Delegatecall injection

`delegatecall` chạy code của contract khác **trong ngữ cảnh storage của contract gọi** — dùng cho proxy/upgradeable. Nếu để attacker **tự chọn target hoặc calldata**, họ ghi đè storage của bạn (kể cả slot `owner`).

```solidity
// ❌ Ai cũng có thể trỏ delegatecall vào contract độc hại
contract ProxyBad {
    address public owner;                     // slot 0
    function forward(address target, bytes calldata data) external {
        (bool ok, ) = target.delegatecall(data);   // chạy code lạ trên storage của mình
        require(ok);
    }
}
// Attacker deploy 1 lib có setOwner() ghi slot 0 → chiếm quyền owner.
```

Nạn nhân kinh điển: **Parity multisig 2017** — một `delegatecall` tới library cho phép bất kỳ ai gọi `initWallet` và trở thành owner, rồi `selfdestruct` khoá vĩnh viễn ~513k ETH.

**Phòng chống:**
- **Không bao giờ** để người dùng truyền `target` của `delegatecall`. Địa chỉ implementation phải là **immutable / do admin quản lý**, đổi qua cơ chế upgrade có kiểm soát.
- Dùng chuẩn **proxy đã kiểm toán** (OpenZeppelin `TransparentUpgradeableProxy` / UUPS) thay vì tự viết.
- Canh **storage layout** giữa proxy và implementation phải khớp; UUPS đặt logic upgrade trong implementation với `onlyOwner`.

```solidity
// ✅ Implementation cố định, chỉ admin đổi qua quy trình upgrade chuẩn
contract ProxyOK {
    address public immutable implementation;   // đặt lúc deploy, không ai đổi tuỳ ý
    constructor(address impl) { implementation = impl; }
    fallback() external payable {
        address impl = implementation;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let ok := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch ok case 0 { revert(0, returndatasize()) } default { return(0, returndatasize()) }
        }
    }
}
```

---

## 7. tx.origin phishing

`tx.origin` là **EOA khởi phát** cả chuỗi lời gọi; `msg.sender` là **người gọi trực tiếp**. Dùng `tx.origin` để phân quyền cho phép một contract trung gian **mạo danh** nạn nhân.

```solidity
// ❌ Kiểm tra bằng tx.origin
contract WalletBad {
    address public owner;
    function transfer(address to, uint256 amt) external {
        require(tx.origin == owner, "not owner");   // sai lầm chí mạng
        payable(to).transfer(amt);
    }
}
```

Kịch bản: owner bị lừa gọi một contract lạ `Evil.claimAirdrop()`. Bên trong, `Evil` gọi `WalletBad.transfer(attacker, allFunds)`. Lúc này `msg.sender == Evil` nhưng `tx.origin == owner` → check qua, tiền bay.

**Bản vá:** luôn dùng `msg.sender` cho authorization.

```solidity
// ✅
require(msg.sender == owner, "not owner");
```

> `tx.origin` gần như **không bao giờ** nên dùng để phân quyền. (Có bàn EIP về việc AA làm nó phức tạp hơn — càng lý do tránh.)

---

## 8. Unchecked external call — "im lặng thất bại"

Ba cách gửi ETH / gọi ngoài: `transfer` (revert, cap 2300 gas), `send` (trả `bool`, cap 2300 gas), `call` (trả `bool`, forward hết gas). Với `send`/`call`/ low-level, **nếu không kiểm tra giá trị trả về**, thất bại bị nuốt im lặng → state đi sai.

```solidity
// ❌ Bỏ qua bool trả về — nếu gửi thất bại, code vẫn coi như thành công
function payout(address to, uint256 amt) external {
    balances[to] -= amt;
    to.call{value: amt}("");    // không check → mất tiền trên sổ nhưng chưa gửi được
}
```

Với ERC-20 còn tệ hơn: nhiều token (USDT) **không return bool**, hoặc return `false` thay vì revert.

**Bản vá:**

```solidity
// ✅ ETH: bắt buộc check bool
(bool ok, ) = to.call{value: amt}("");
require(ok, "eth transfer failed");

// ✅ ERC-20: dùng SafeERC20 để chuẩn hoá token "lệch chuẩn"
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
using SafeERC20 for IERC20;
IERC20(token).safeTransfer(to, amt);   // tự revert khi thất bại
```

> Cân nhắc **pull over push**: thay vì contract chủ động đẩy tiền (dễ bị chặn/DoS bởi 1 người nhận revert), cho mỗi người **tự rút** phần của mình.

---

## 9. Thiếu access control

Hàm đổi trạng thái nhạy cảm mà **quên modifier phân quyền** → ai cũng gọi được. Đây là lớp lỗi phổ biến & tốn tiền nhất theo thống kê audit (ví dụ hàm `initialize` của proxy bị người lạ gọi trước).

```solidity
// ❌ mint và đổi owner không giới hạn ai gọi
contract TokenNoAC {
    address public owner;
    function setOwner(address o) external { owner = o; }      // ai cũng chiếm được
    function mint(address to, uint256 v) external {           // ai cũng in tiền
        balanceOf[to] += v;
    }
    mapping(address => uint256) public balanceOf;
}
```

**Bản vá:** dùng modifier / `Ownable` / `AccessControl` (RBAC) và bảo vệ cả `initialize`.

```solidity
// ✅
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
contract TokenAC is Ownable {
    mapping(address => uint256) public balanceOf;
    constructor() Ownable(msg.sender) {}
    function mint(address to, uint256 v) external onlyOwner {   // chỉ owner
        balanceOf[to] += v;
    }
}
```

Với contract upgradeable, `initialize` phải có `initializer` modifier (OZ) để **không ai gọi lại được** và không bị front-run lúc deploy.

---

## 10. Price oracle manipulation

Nếu contract lấy giá từ **spot price của một AMM pool** (ví dụ `getReserves` của Uniswap V2), attacker dùng **flash loan** vay lượng khổng lồ, **bóp méo giá tức thời** trong cùng 1 transaction, rồi khai thác contract định giá sai (vay/thanh lý/mint).

```solidity
// ❌ Định giá bằng spot reserve — bóp được bằng 1 flash-loan swap
function collateralValue(uint256 amount) public view returns (uint256) {
    (uint112 r0, uint112 r1, ) = pair.getReserves();
    return amount * r1 / r0;   // giá tức thời, thao túng trong 1 block
}
```

Hàng loạt vụ (bZx, Harvest, Cheese Bank...) mất chục triệu USD theo mẫu này.

**Phòng chống:**
- **Chainlink Price Feeds** (nguồn phi tập trung, tổng hợp nhiều sàn) — kèm check `updatedAt` chống stale và `answeredInRound`.
- **TWAP** (time-weighted average price, Uniswap V3 oracle) — flash loan chỉ méo 1 block nên trung bình theo thời gian khó bóp.
- Không bao giờ tin **spot price một nguồn** cho quyết định tài chính.

```solidity
// ✅ Chainlink có kiểm tra độ tươi
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
AggregatorV3Interface internal feed;

function getPrice() public view returns (uint256) {
    (uint80 roundId, int256 price, , uint256 updatedAt, uint80 answeredInRound) = feed.latestRoundData();
    require(price > 0, "bad price");
    require(updatedAt != 0 && block.timestamp - updatedAt < 1 hours, "stale price");
    require(answeredInRound >= roundId, "stale round");
    return uint256(price);
}
```

---

## 11. Bảng tra nhanh — lỗ hổng ↔ bản vá

| Lỗ hổng | Dấu hiệu code | Bản vá cốt lõi |
|---------|---------------|----------------|
| Reentrancy | external call trước khi update state | CEI + `nonReentrant` |
| Overflow/underflow | Solidity < 0.8, số học trần | 0.8+ auto-revert / SafeMath |
| Front-running/MEV | mempool lộ ý định, không slippage | commit-reveal, `amountOutMin`, private RPC |
| Delegatecall injection | user điều khiển target/data | implementation immutable, proxy chuẩn OZ |
| tx.origin phishing | `require(tx.origin == owner)` | dùng `msg.sender` |
| Unchecked call | bỏ qua bool của `call`/`send` | check `require(ok)`, SafeERC20, pull-payment |
| Thiếu access control | hàm nhạy cảm không modifier | `Ownable`/`AccessControl`, bảo vệ `initialize` |
| Oracle manipulation | spot price 1 pool | Chainlink + staleness / TWAP |

---

## 12. Tóm tắt
- Gốc rễ chung: trong EVM **external call trao quyền điều khiển**, **mempool công khai**, **state bất biến** — sai một dòng là mất tiền vĩnh viễn.
- **Reentrancy** vá bằng **Checks-Effects-Interactions** làm gốc, `nonReentrant` làm lưới.
- Từ **Solidity 0.8** overflow tự revert; pre-0.8 bắt buộc **SafeMath**.
- Chống **MEV** bằng commit-reveal, slippage guard, private orderflow.
- `delegatecall` và `initialize` là cửa chiếm quyền — **không để user điều khiển**, dùng proxy đã kiểm toán.
- Luôn dùng **`msg.sender`** (không `tx.origin`) để phân quyền, và **check giá trị trả về** mọi external call (SafeERC20, pull-payment).
- Định giá phải qua **Chainlink/TWAP**, không bao giờ tin spot price một pool.

> **Bài tiếp theo (Bài 23):** quy trình **audit & phòng thủ chủ động** — static analysis (Slither), fuzzing/invariant testing (Foundry, Echidna), formal verification và bug bounty.
