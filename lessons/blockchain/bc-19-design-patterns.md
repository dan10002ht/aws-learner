# Bài 20 — Design patterns: access control & proxy nâng cấp

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân biệt **Ownable** (một chủ) và **AccessControl** (role-based) — chọn đúng mô hình phân quyền.
- Áp dụng **checks-effects-interactions** và **reentrancy guard** để chặn reentrancy — lỗi từng làm sập The DAO.
- Hiểu vì sao **pull-over-push payment** an toàn hơn khi trả tiền cho nhiều người.
- Giải thích cơ chế **proxy nâng cấp**: `delegatecall`, storage layout, **storage collision**.
- So sánh **Transparent proxy vs UUPS**, biết vì sao dùng **initializer thay cho constructor**.

---

## 2. Lý thuyết — Access control

### 2.1 Analogy — chìa khóa nhà vs thẻ nhân viên

Smart contract sống công khai trên mạng: **bất kỳ ai** cũng gọi được hàm `public`. Nếu không kiểm soát, ai cũng rút được quỹ hay đúc token. Phân quyền là **ổ khóa** đặt trước cửa hàm nhạy cảm.

| Mô hình | Analogy | Khi nào dùng |
|---------|---------|--------------|
| **Ownable** | Một chiếc chìa khóa nhà — chỉ chủ nhà mở được | Contract nhỏ, một admin duy nhất (pause, withdraw) |
| **AccessControl** | Thẻ nhân viên có phân cấp — kế toán, kho, bảo vệ mỗi người một quyền | Hệ thống lớn: `MINTER`, `PAUSER`, `UPGRADER` tách nhau |

Ownable đơn giản nhưng gom mọi quyền vào **một địa chỉ** — mất key là mất tất cả. AccessControl chia nhỏ quyền theo **role**, mỗi role có thể gán cho nhiều địa chỉ (ví dụ multisig), giảm rủi ro tập trung.

### 2.2 Ownable — quyền sở hữu đơn

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Vault is Ownable {
    // Truyền chủ sở hữu ban đầu vào constructor (OZ v5)
    constructor(address initialOwner) Ownable(initialOwner) {}

    // onlyOwner revert nếu msg.sender != owner()
    function withdraw(address payable to, uint256 amount) external onlyOwner {
        to.transfer(amount);
    }
}
```

`onlyOwner` là modifier kiểm tra `msg.sender == owner()`, nếu sai thì `revert`. **Lưu ý bảo mật**: `transferOwnership` một bước có thể chuyển nhầm sang địa chỉ chết → mất quyền vĩnh viễn. Dùng `Ownable2Step` (nhận quyền hai bước: `transferOwnership` rồi người nhận `acceptOwnership`) để an toàn hơn.

### 2.3 AccessControl — phân quyền theo role

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20, AccessControl {
    // Role là bytes32 — convention: hash tên role
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    constructor(address admin) ERC20("Demo", "DMO") {
        // DEFAULT_ADMIN_ROLE có quyền grant/revoke mọi role
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    // Chỉ địa chỉ có MINTER_ROLE mới đúc được token
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}
```

Điểm cốt lõi: role là hằng `bytes32` (hash tên cho tránh trùng). `DEFAULT_ADMIN_ROLE` (giá trị `0x00`) là **root** — cấp/thu hồi mọi role khác. Nguyên tắc **least privilege**: cho mỗi actor đúng role tối thiểu, và cân nhắc đặt admin là **multisig/timelock** thay vì EOA.

| | Ownable | AccessControl |
|--|---------|---------------|
| Số quyền | 1 (owner) | Nhiều role tùy ý |
| Nhiều người/quyền | Không | Có (grant nhiều địa chỉ) |
| Gas & phức tạp | Thấp | Cao hơn |
| Chống mất-key | Kém | Tốt hơn (phân tán) |

---

## 3. Lý thuyết — Bảo vệ khỏi reentrancy

### 3.1 Reentrancy là gì

Khi contract A gọi ra ngoài (`call`, gửi ETH) tới contract B, B có thể **gọi ngược lại** A **trước khi** A cập nhật state. Nếu A kiểm tra số dư rồi mới trừ, B lặp lại việc rút — hút cạn quỹ. Đây chính là lỗi khiến **The DAO** (2016) mất ~60 triệu USD, dẫn tới hard fork Ethereum.

### 3.2 Checks-Effects-Interactions

Nguyên tắc thứ tự trong mọi hàm đụng tiền/state:

<svg viewBox="0 0 700 210" role="img" aria-labelledby="cei-t cei-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="cei-t">Thứ tự Checks-Effects-Interactions</title>
<desc id="cei-d">Ba bước: kiểm tra điều kiện, cập nhật state nội bộ, rồi mới gọi ra ngoài</desc>
<rect x="30" y="70" width="180" height="70" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="100" text-anchor="middle" font-size="14" fill="currentColor">1. Checks</text>
<text x="120" y="122" text-anchor="middle" font-size="11" fill="currentColor">require / kiểm điều kiện</text>
<rect x="260" y="70" width="180" height="70" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="100" text-anchor="middle" font-size="14" fill="currentColor">2. Effects</text>
<text x="350" y="122" text-anchor="middle" font-size="11" fill="currentColor">cập nhật state nội bộ</text>
<rect x="490" y="70" width="180" height="70" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="580" y="100" text-anchor="middle" font-size="14" fill="currentColor">3. Interactions</text>
<text x="580" y="122" text-anchor="middle" font-size="11" fill="currentColor">gọi ra ngoài / gửi ETH</text>
<line x1="210" y1="105" x2="258" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#ar)"/>
<line x1="440" y1="105" x2="488" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#ar)"/>
<text x="350" y="180" text-anchor="middle" font-size="12" fill="currentColor">State đã đổi TRƯỚC khi gọi ra → gọi ngược lại cũng vô hại</text>
<defs><marker id="ar" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

```solidity
// ❌ SAI — interaction trước effect: bị reentrancy
function withdrawBad() external {
    uint256 bal = balances[msg.sender];
    require(bal > 0, "no funds");
    (bool ok, ) = msg.sender.call{value: bal}(""); // gọi ra ngoài trước
    require(ok);
    balances[msg.sender] = 0;                       // cập nhật SAU → attacker reentrancy
}

// ✅ ĐÚNG — checks → effects → interactions
function withdrawGood() external {
    uint256 bal = balances[msg.sender];   // checks
    require(bal > 0, "no funds");
    balances[msg.sender] = 0;             // effects: xóa state TRƯỚC
    (bool ok, ) = msg.sender.call{value: bal}(""); // interactions: gọi ra sau cùng
    require(ok, "transfer failed");
}
```

Ở bản đúng, khi attacker gọi ngược lại, `balances[msg.sender]` đã bằng 0 → `require` fail → không rút được lần hai.

### 3.3 Reentrancy guard — lớp phòng thủ thứ hai

```solidity
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Bank is ReentrancyGuard {
    mapping(address => uint256) public balances;

    // nonReentrant khóa lại: mọi lời gọi lồng nhau vào hàm này sẽ revert
    function withdraw() external nonReentrant {
        uint256 bal = balances[msg.sender];
        require(bal > 0);
        balances[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: bal}("");
        require(ok);
    }
}
```

`nonReentrant` đặt một flag "đang thực thi" khi vào hàm và reset khi ra; lời gọi lồng nhau thấy flag đã bật thì `revert`. Đây là **defense-in-depth** — vẫn nên tuân checks-effects-interactions trước, guard chỉ là lưới an toàn (và tốn thêm gas cho lần ghi slot trạng thái đầu tiên).

### 3.4 Pull-over-push payment

**Push**: contract chủ động `transfer` tiền cho từng người trong vòng lặp. Rủi ro: một người nhận là contract cố tình `revert` → **cả vòng lặp fail**, khóa tiền của mọi người (griefing); hoặc vòng lặp dài vượt gas limit.

**Pull**: contract chỉ ghi "bạn được rút X", mỗi người **tự gọi `withdraw`** để lấy phần mình.

```solidity
mapping(address => uint256) public pending;

// Push tiền vào sổ, KHÔNG gửi ngay
function allocate(address user, uint256 amount) internal {
    pending[user] += amount;
}

// Người dùng tự pull — lỗi của một người không ảnh hưởng người khác
function withdraw() external nonReentrant {
    uint256 amount = pending[msg.sender];
    require(amount > 0, "nothing to withdraw");
    pending[msg.sender] = 0;                        // effects trước
    (bool ok, ) = msg.sender.call{value: amount}("");
    require(ok, "transfer failed");
}
```

Pull cô lập rủi ro: mỗi giao dịch rút độc lập, không ai chặn được người khác, và giới hạn gas rơi về từng người nhận.

---

## 4. Lý thuyết — Proxy nâng cấp

### 4.1 Vì sao cần proxy

Code smart contract **bất biến** sau khi deploy — không sửa được. Nhưng phần mềm cần vá bug, thêm tính năng. Giải pháp: tách **địa chỉ + dữ liệu** (proxy) khỏi **logic** (implementation). Người dùng luôn tương tác với proxy; nâng cấp = trỏ proxy sang implementation mới, **địa chỉ và state giữ nguyên**.

### 4.2 delegatecall — trái tim của proxy

`delegatecall` cho phép proxy chạy code của implementation **nhưng trong context (storage, `msg.sender`, `msg.value`) của proxy**. Logic ở nơi khác, dữ liệu ở proxy.

<svg viewBox="0 0 700 230" role="img" aria-labelledby="px-t px-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="px-t">Proxy dùng delegatecall tới implementation</title>
<desc id="px-d">Người dùng gọi proxy, proxy delegatecall sang logic implementation nhưng đọc ghi storage của chính proxy</desc>
<rect x="30" y="90" width="110" height="55" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="85" y="122" text-anchor="middle" font-size="13" fill="currentColor">User</text>
<rect x="230" y="70" width="150" height="95" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="305" y="98" text-anchor="middle" font-size="14" fill="currentColor">Proxy</text>
<text x="305" y="120" text-anchor="middle" font-size="11" fill="currentColor">giữ STORAGE + address</text>
<text x="305" y="138" text-anchor="middle" font-size="11" fill="currentColor">(state ở đây)</text>
<rect x="500" y="70" width="170" height="95" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="585" y="98" text-anchor="middle" font-size="14" fill="currentColor">Implementation</text>
<text x="585" y="120" text-anchor="middle" font-size="11" fill="currentColor">giữ LOGIC (code)</text>
<text x="585" y="138" text-anchor="middle" font-size="11" fill="currentColor">nâng cấp = đổi cái này</text>
<line x1="140" y1="117" x2="228" y2="117" stroke="currentColor" stroke-width="1.5" marker-end="url(#pa)"/>
<text x="184" y="108" text-anchor="middle" font-size="10" fill="currentColor">call</text>
<line x1="380" y1="117" x2="498" y2="117" stroke="currentColor" stroke-width="1.5" marker-end="url(#pa)"/>
<text x="439" y="108" text-anchor="middle" font-size="10" fill="#f59e0b">delegatecall</text>
<line x1="498" y1="150" x2="382" y2="150" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" marker-end="url(#pa)"/>
<text x="440" y="168" text-anchor="middle" font-size="10" fill="currentColor">ghi vào storage proxy</text>
<text x="350" y="210" text-anchor="middle" font-size="12" fill="currentColor">Code chạy từ implementation, nhưng đọc/ghi state của proxy</text>
<defs><marker id="pa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 4.3 Storage layout & storage collision

Vì `delegatecall` ghi vào storage **của proxy**, implementation phải "biết" bố cục storage của proxy. EVM đánh số slot theo **thứ tự khai báo biến**: biến đầu ở slot 0, tiếp theo slot 1... Nếu proxy và implementation hiểu slot **khác nhau**, ta có **storage collision** — biến đè lên nhau, dữ liệu hỏng.

Ví dụ va chạm điển hình: cả proxy lẫn implementation cùng dùng slot 0. Proxy để `address implementation` ở slot 0, implementation lại để `address owner` ở slot 0 → ghi owner đè lên địa chỉ implementation, contract "biến mất".

**Giải pháp**: chuẩn **EIP-1967** đặt các biến hạ tầng của proxy (implementation address, admin) ở **slot ngẫu nhiên cố định** (hash của một chuỗi trừ 1), gần như không đụng slot 0,1,2... mà biến logic dùng.

```solidity
// EIP-1967: slot = keccak256("eip1967.proxy.implementation") - 1
bytes32 constant IMPL_SLOT =
    0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
```

Khi **thêm biến qua các phiên bản**, quy tắc vàng: **chỉ append biến mới xuống cuối**, không chèn/xóa/đổi thứ tự biến cũ — nếu không slot dịch chuyển và toàn bộ state cũ đọc sai. Dùng `__gap` (mảng dự trữ) trong contract base để chừa chỗ mở rộng an toàn.

### 4.4 Initializer thay constructor

`constructor` chỉ chạy khi deploy **implementation**, và code constructor **không** nằm trong runtime bytecode → khi proxy `delegatecall`, constructor **không bao giờ chạy trong context proxy**. Hậu quả: state khởi tạo (owner, tên token...) sẽ trống ở proxy.

Giải pháp: thay constructor bằng hàm `initialize()` gọi **một lần** qua proxy, bảo vệ bằng modifier `initializer`.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from
    "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from
    "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract MyLogicV1 is Initializable, OwnableUpgradeable {
    uint256 public value;

    // Chặn khởi tạo trên chính implementation (bảo mật)
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    // Thay cho constructor — chạy MỘT LẦN qua proxy
    function initialize(address owner_, uint256 v) public initializer {
        __Ownable_init(owner_);   // khởi tạo state của base contract
        value = v;
    }
}
```

`initializer` đảm bảo `initialize` chỉ chạy đúng một lần (nếu không attacker gọi lại để chiếm quyền). `_disableInitializers()` trong constructor khóa implementation trần lại, tránh ai đó initialize trực tiếp nó. Lưu ý dùng contract **`*Upgradeable`** (không có state trong constructor) từ `contracts-upgradeable`.

### 4.5 Transparent vs UUPS

Cả hai đều là proxy nâng cấp, khác nhau ở **nơi đặt logic `upgradeTo`**:

| Tiêu chí | Transparent (TransparentUpgradeableProxy) | UUPS (ERC-1822) |
|----------|-------------------------------------------|-----------------|
| Hàm nâng cấp nằm ở | **Proxy** (qua ProxyAdmin riêng) | **Implementation** (`_authorizeUpgrade`) |
| Chống clash selector | Proxy phân biệt admin vs user mỗi call | Không cần (logic tách bạch) |
| Gas mỗi lời gọi | Cao hơn (check admin mỗi call) | Thấp hơn |
| Rủi ro | Cần deploy thêm ProxyAdmin | Quên `_authorizeUpgrade` → **kẹt vĩnh viễn** không nâng cấp được |
| Khuyến nghị hiện tại | Cũ, vẫn dùng được | OZ khuyến nghị (rẻ gas hơn) |

```solidity
// UUPS: logic upgrade nằm trong implementation
import {UUPSUpgradeable} from
    "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract MyLogicV1 is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    function initialize(address owner_) public initializer {
        __Ownable_init(owner_);
        __UUPSUpgradeable_init();
    }
    // Bắt buộc override: chỉ owner mới được nâng cấp
    function _authorizeUpgrade(address newImpl) internal override onlyOwner {}
}
```

Cảnh báo UUPS: nếu implementation mới **thiếu** hàm upgrade (không kế thừa `UUPSUpgradeable` hoặc `_authorizeUpgrade` chặn hết), proxy mất khả năng nâng cấp **vĩnh viễn**. Transparent an toàn hơn ở điểm này vì logic upgrade nằm ở proxy, nhưng tốn gas hơn mỗi call.

---

## 5. Tóm tắt
- **Ownable** cho một admin; **AccessControl** cho phân quyền role-based — chọn theo quy mô, ưu tiên least privilege và multisig/timelock cho admin.
- **Checks-Effects-Interactions** + **ReentrancyGuard** chặn reentrancy (bài học The DAO); luôn cập nhật state TRƯỚC khi gọi ra ngoài.
- **Pull-over-push**: để người dùng tự rút, cô lập rủi ro một người nhận độc hại chặn cả hệ thống.
- **Proxy** tách logic khỏi state qua **delegatecall**; nâng cấp = đổi implementation, giữ nguyên địa chỉ + state.
- Cảnh giác **storage collision** — chỉ append biến, dùng EIP-1967 slot, `__gap`; thay constructor bằng **initializer** (chạy một lần qua proxy).
- **Transparent vs UUPS**: UUPS rẻ gas hơn (OZ khuyến nghị) nhưng phải giữ `_authorizeUpgrade` qua mọi phiên bản kẻo kẹt vĩnh viễn.

> **Bài tiếp theo:** kiểm thử & audit smart contract — Foundry fuzzing, invariant testing và các công cụ phân tích tĩnh (Slither) để bắt chính những lỗi bài này cảnh báo.
