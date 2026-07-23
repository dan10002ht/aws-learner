# Bài 43 — Account abstraction (ERC-4337) & Web3 stack

## 1. Mục tiêu
Sau bài này bạn có thể:
- Chỉ ra **những hạn chế chết người của EOA** (Externally Owned Account) và vì sao "ví = private key" là mô hình lỗi thời.
- Giải thích **ERC-4337** ở mức kiến trúc: **UserOperation, Bundler, EntryPoint, Paymaster** và **mempool riêng** — không cần đổi giao thức L1.
- Hiểu **hai pha validation / execution** và luật **mempool** (storage rules) tồn tại để làm gì.
- Viết được smart account tối giản: **gasless (sponsor), social recovery, session key, batching**.
- Phân biệt **AA kiểu 4337** vs **native AA (zkSync)**.
- Vẽ được **Web3 stack** đầy đủ: RPC ↔ node provider ↔ indexer ↔ wallet SDK ↔ dApp.

---

## 2. Lý thuyết

### 2.1 Analogy — chìa khoá vật lý vs khoá điện tử khách sạn

Một **EOA** giống ổ khoá cơ: chỉ có **một chìa** (private key). Mất chìa là mất nhà, không đổi được, không giới hạn "chìa này chỉ mở cửa từ 9–17h", không thể "cho quản gia mở hộ mà không đưa chìa gốc". **Smart account** giống khoá điện tử khách sạn: logic mở khoá là **phần mềm** — bạn lập trình được: nhiều chìa, chìa hết hạn, chìa chỉ mở một phòng, khôi phục khi mất chìa bằng cách xác thực người thân. Account abstraction chính là **biến tài khoản thành một chương trình** thay vì chỉ là một cặp khoá.

### 2.2 EOA có gì sai?

Trong Ethereum "cổ điển" có 2 loại account: **EOA** (điều khiển bằng private key) và **contract account** (điều khiển bằng code). Vấn đề: **chỉ EOA mới khởi phát được transaction**. Contract muốn hành động thì phải có EOA "châm ngòi" và **trả gas bằng ETH**. Hệ quả:

| Hạn chế của EOA | Vì sao đau | Smart account giải thế nào |
|-----------------|-----------|----------------------------|
| **1 key = toàn quyền**, mất/lộ là mất sạch | Không có cấp quyền, không rate-limit | Multisig, spending limit, module phân quyền |
| **Bắt buộc giữ ETH để trả gas** | User mới không có ETH vẫn phải nạp trước | **Paymaster** trả hộ (gasless) hoặc trả bằng USDC |
| **Không khôi phục được** khi mất key | Seed phrase là điểm chết duy nhất | **Social recovery** (guardian) đổi key |
| **1 tx = 1 hành động** | Approve rồi swap = 2 tx, 2 lần ký | **Batching**: gộp nhiều call trong 1 UserOp |
| **Chữ ký cố định secp256k1** | Không dùng được passkey/Face ID | Account tự định nghĩa scheme (P-256, BLS...) |
| **Không có session** | Mỗi hành động phải ký tay | **Session key**: uỷ quyền tạm, phạm vi hẹp |

"Account abstraction" = **trừu tượng hoá điều kiện hợp lệ của một transaction**: thay vì L1 quy cứng "tx hợp lệ ⇔ chữ ký secp256k1 đúng + nonce đúng + đủ ETH", ta để **contract của account tự quyết** thế nào là hợp lệ.

### 2.3 ERC-4337 — AA không cần fork L1

Các đề xuất AA gốc (EIP-2938...) đòi **sửa giao thức đồng thuận** — quá khó triển khai. **ERC-4337** (2023) thông minh ở chỗ: làm AA **hoàn toàn ở lớp application**, dựng một **mempool song song** cho một loại "pseudo-transaction" gọi là **UserOperation**, và một contract **singleton EntryPoint** đóng vai trọng tài. Không cần đổi một dòng nào ở L1.

<svg viewBox="0 0 720 340" role="img" aria-labelledby="aa-t aa-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="aa-t">Luồng ERC-4337 từ UserOperation tới on-chain</title>
<desc id="aa-d">Ví ký UserOperation, gửi vào mempool riêng, Bundler gom lại và gọi EntryPoint, EntryPoint gọi validate rồi execute trên smart account, Paymaster trả gas</desc>
<rect x="20" y="30" width="110" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="75" y="52" text-anchor="middle" font-size="12" fill="currentColor">Ví / dApp</text>
<text x="75" y="70" text-anchor="middle" font-size="11" fill="currentColor">ký UserOp</text>
<rect x="20" y="140" width="110" height="50" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="75" y="162" text-anchor="middle" font-size="12" fill="currentColor">Mempool riêng</text>
<text x="75" y="180" text-anchor="middle" font-size="11" fill="currentColor">(alt-mempool)</text>
<rect x="200" y="140" width="110" height="50" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="255" y="162" text-anchor="middle" font-size="12" fill="currentColor">Bundler</text>
<text x="255" y="180" text-anchor="middle" font-size="11" fill="currentColor">gom &amp; gửi tx</text>
<rect x="380" y="130" width="130" height="70" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="445" y="158" text-anchor="middle" font-size="12" fill="currentColor">EntryPoint</text>
<text x="445" y="176" text-anchor="middle" font-size="11" fill="currentColor">(singleton)</text>
<text x="445" y="192" text-anchor="middle" font-size="11" fill="currentColor">trọng tài</text>
<rect x="580" y="40" width="120" height="60" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="640" y="66" text-anchor="middle" font-size="12" fill="currentColor">Smart account</text>
<text x="640" y="84" text-anchor="middle" font-size="11" fill="currentColor">validate + exec</text>
<rect x="580" y="230" width="120" height="60" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="640" y="256" text-anchor="middle" font-size="12" fill="currentColor">Paymaster</text>
<text x="640" y="274" text-anchor="middle" font-size="11" fill="currentColor">trả gas hộ</text>
<line x1="75" y1="80" x2="75" y2="138" stroke="currentColor" stroke-width="1.5" marker-end="url(#aah)"/>
<line x1="130" y1="165" x2="198" y2="165" stroke="currentColor" stroke-width="1.5" marker-end="url(#aah)"/>
<line x1="310" y1="165" x2="378" y2="165" stroke="currentColor" stroke-width="1.5" marker-end="url(#aah)"/>
<line x1="510" y1="150" x2="578" y2="85" stroke="currentColor" stroke-width="1.5" marker-end="url(#aah)"/>
<line x1="510" y1="180" x2="578" y2="255" stroke="currentColor" stroke-width="1.5" marker-end="url(#aah)"/>
<text x="540" y="112" text-anchor="middle" font-size="10" fill="currentColor">validateUserOp</text>
<text x="545" y="222" text-anchor="middle" font-size="10" fill="currentColor">validatePaymasterUserOp</text>
<text x="255" y="60" text-anchor="middle" font-size="11" fill="currentColor">handleOps() → 1 tx thật gửi lên L1</text>
<line x1="310" y1="55" x2="380" y2="120" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<defs><marker id="aah" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Các vai:**
- **UserOperation**: một struct mô tả "tôi muốn account X thực thi calldata này". Nó **không phải** transaction L1 — user chỉ **ký** nó.
- **Bundler**: một actor (giống miner của alt-mempool) lắng nghe UserOp trong mempool riêng, **gom nhiều UserOp** lại và đóng gói thành **một transaction L1 thật** gọi `EntryPoint.handleOps()`. Bundler ứng ETH trả gas cho tx đó, rồi được EntryPoint hoàn lại (từ account hoặc paymaster) + phí.
- **EntryPoint**: contract **singleton, đã audit kỹ**, là điểm tin cậy chung. Nó chạy vòng: với mỗi UserOp → gọi `validateUserOp` trên account (và `validatePaymasterUserOp` nếu có paymaster) → nếu ok thì gọi `execute`. Tách bạch **tiền gas** để bundler không bị account lừa (validation không được đụng state cấm).
- **Paymaster**: contract **tài trợ gas**. Nếu UserOp gắn paymaster hợp lệ, EntryPoint lấy gas từ **stake của paymaster** thay vì từ account ⇒ user **không cần ETH**.

### 2.4 UserOperation — trái tim của 4337

```solidity
struct UserOperation {
    address sender;               // smart account phát lệnh
    uint256 nonce;                // nonce quản lý bởi EntryPoint (2D: key + seq)
    bytes   initCode;             // nếu account chưa tồn tại: bytecode để deploy (counterfactual)
    bytes   callData;             // hành động account sẽ execute (thường execute(target,value,data))
    uint256 callGasLimit;         // gas cho pha execute
    uint256 verificationGasLimit; // gas cho pha validate
    uint256 preVerificationGas;   // bù chi phí bundler (calldata, overhead)
    uint256 maxFeePerGas;         // như EIP-1559
    uint256 maxPriorityFeePerGas;
    bytes   paymasterAndData;     // rỗng = account tự trả; ngược lại địa chỉ paymaster + data
    bytes   signature;            // account TỰ ĐỊNH NGHĨA cách verify (secp256k1, P-256, multisig...)
}
```

Điểm mấu chốt: **`signature` không bị L1 ép buộc**. Account contract muốn coi chữ ký hợp lệ thế nào cũng được — đó chính là "abstraction". `initCode` cho phép **địa chỉ tồn tại trước khi deploy** (counterfactual): bạn có thể nhận tiền vào một địa chỉ chưa deploy, và UserOp đầu tiên vừa deploy account vừa thực thi.

### 2.5 Hai pha & luật mempool

EntryPoint xử lý mỗi UserOp theo **2 pha tách biệt**:

<svg viewBox="0 0 700 200" role="img" aria-labelledby="ph-t ph-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="ph-t">Hai pha validation và execution trong EntryPoint</title>
<desc id="ph-d">Pha validation kiểm chữ ký và trả gas dưới luật storage nghiêm ngặt, sau đó pha execution chạy calldata thực tế</desc>
<rect x="30" y="60" width="280" height="80" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="170" y="90" text-anchor="middle" font-size="13" fill="currentColor">Pha 1: VALIDATION</text>
<text x="170" y="112" text-anchor="middle" font-size="11" fill="currentColor">validateUserOp: check sig + nonce</text>
<text x="170" y="128" text-anchor="middle" font-size="11" fill="currentColor">trả trước gas — LUẬT storage ngặt</text>
<rect x="390" y="60" width="280" height="80" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="530" y="90" text-anchor="middle" font-size="13" fill="currentColor">Pha 2: EXECUTION</text>
<text x="530" y="112" text-anchor="middle" font-size="11" fill="currentColor">chạy callData thật</text>
<text x="530" y="128" text-anchor="middle" font-size="11" fill="currentColor">tự do — revert chỉ tốn gas</text>
<line x1="310" y1="100" x2="388" y2="100" stroke="currentColor" stroke-width="1.5" marker-end="url(#phh)"/>
<text x="349" y="92" text-anchor="middle" font-size="11" fill="currentColor">ok?</text>
<text x="350" y="175" text-anchor="middle" font-size="11" fill="currentColor">Tách 2 pha để bundler biết chắc "sẽ được trả gas" TRƯỚC khi tốn công execute</text>
<defs><marker id="phh" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Vì sao validation bị **cấm đụng storage lung tung** (ERC-7562 storage rules)? Bundler bỏ công **simulate** UserOp off-chain để chắc chắn nó sẽ trả gas. Nếu validation được đọc state toàn cục (ví dụ giá oracle, balance account khác), một kẻ xấu có thể làm UserOp **pass lúc simulate nhưng fail lúc on-chain** ⇒ bundler mất gas (DoS). Nên trong `validateUserOp`, account chỉ được đụng **storage của chính nó**. Đó là lý do session key/logic phức tạp phải viết cẩn thận.

---

## 3. Tính năng smart account mở khoá được

### 3.1 Bộ khung account tối giản (validateUserOp)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IAccount, UserOperation} from "account-abstraction/interfaces/IAccount.sol";
import {IEntryPoint} from "account-abstraction/interfaces/IEntryPoint.sol";
import {ECDSA} from "openzeppelin/utils/cryptography/ECDSA.sol";

contract SimpleAccount is IAccount {
    using ECDSA for bytes32;

    address public owner;
    IEntryPoint public immutable entryPoint;

    constructor(IEntryPoint _ep, address _owner) { entryPoint = _ep; owner = _owner; }

    // EntryPoint gọi ở PHA VALIDATION. Trả 0 = hợp lệ, 1 = sai chữ ký.
    function validateUserOp(UserOperation calldata op, bytes32 userOpHash, uint256 missingFunds)
        external returns (uint256 validationData)
    {
        require(msg.sender == address(entryPoint), "not from EntryPoint");
        // account TỰ định nghĩa: ở đây là 1 owner ký secp256k1
        address signer = userOpHash.toEthSignedMessageHash().recover(op.signature);
        if (signer != owner) return 1; // SIG_VALIDATION_FAILED

        // nạp trước gas cho EntryPoint nếu account tự trả (không dùng paymaster)
        if (missingFunds > 0) {
            (bool ok, ) = payable(msg.sender).call{value: missingFunds}("");
            (ok); // bỏ qua kết quả — EntryPoint sẽ tự kiểm
        }
        return 0; // hợp lệ, không giới hạn thời gian
    }

    // PHA EXECUTION — chỉ EntryPoint (hoặc owner) gọi được
    function execute(address to, uint256 value, bytes calldata data) external {
        require(msg.sender == address(entryPoint) || msg.sender == owner, "no auth");
        (bool ok, bytes memory ret) = to.call{value: value}(data);
        require(ok, string(ret));
    }
}
```

`validationData` là số nén: 20 byte cuối là **aggregator** (0 nếu tự verify), rồi `validUntil`/`validAfter` — cho phép chữ ký **có hạn** ngay ở tầng protocol.

### 3.2 Batching — nhiều hành động, một chữ ký

```solidity
struct Call { address to; uint256 value; bytes data; }

function executeBatch(Call[] calldata calls) external {
    require(msg.sender == address(entryPoint) || msg.sender == owner, "no auth");
    for (uint256 i; i < calls.length; ++i) {
        (bool ok, bytes memory ret) = calls[i].to.call{value: calls[i].value}(calls[i].data);
        require(ok, string(ret));
    }
}
```

`approve(USDC)` + `swap(router)` gộp trong **một UserOp** ⇒ user ký **một lần**, atomic (một call fail thì cả UserOp revert). EOA không thể làm điều này.

### 3.3 Gasless — Paymaster tài trợ gas

```solidity
import {IPaymaster, UserOperation} from "account-abstraction/interfaces/IPaymaster.sol";

// Paymaster trả gas cho MỌI UserOp có chữ ký hợp lệ của backend (verifying paymaster)
contract SponsorPaymaster is IPaymaster {
    address public immutable verifyingSigner; // ví backend của dApp
    IEntryPoint public immutable entryPoint;

    function validatePaymasterUserOp(UserOperation calldata op, bytes32 hash, uint256 maxCost)
        external view returns (bytes memory context, uint256 validationData)
    {
        // backend ký (userOpHash) → chứng tỏ dApp CHẤP NHẬN trả cho op này
        bytes memory sig = op.paymasterAndData[20:]; // 20 byte đầu là address paymaster
        address s = ECDSA.recover(ECDSA.toEthSignedMessageHash(hash), sig);
        require(s == verifyingSigner, "paymaster: bad sig");
        return ("", 0); // đồng ý trả, không cần postOp phức tạp
    }

    function postOp(PostOpMode, bytes calldata, uint256) external {} // hạch toán sau execute
}
```

Paymaster phải **stake ETH vào EntryPoint** trước. Biến thể phổ biến: **ERC-20 paymaster** — user trả phí bằng **USDC**, paymaster ứng ETH; hoặc **verifying paymaster** — dApp tài trợ hoàn toàn để onboarding user mới không có ETH.

### 3.4 Session key — uỷ quyền tạm, phạm vi hẹp

```solidity
struct Session { address target; bytes4 selector; uint48 validUntil; uint256 spendCap; }
mapping(address => Session) public sessions; // sessionKey => quyền

function grantSession(address key, Session calldata s) external {
    require(msg.sender == owner, "only owner");
    sessions[key] = s; // owner ký 1 lần cấp quyền cho key phụ
}

// gọi trong validateUserOp khi chữ ký KHÔNG phải owner:
function _validateSession(UserOperation calldata op, bytes32 h) internal view returns (uint256) {
    address key = ECDSA.recover(ECDSA.toEthSignedMessageHash(h), op.signature);
    Session memory s = sessions[key];
    if (s.validUntil == 0) return 1;                    // không có session
    // giải mã callData: execute(target, value, data) — chặn target/selector ngoài phạm vi
    (address target,, bytes memory data) = abi.decode(op.callData[4:], (address, uint256, bytes));
    if (target != s.target || bytes4(data) != s.selector) return 1;
    // validUntil nén vào validationData ⇒ hết hạn tự vô hiệu ở tầng EntryPoint
    return uint256(s.validUntil) << 160;
}
```

Ứng dụng: **game/dApp** cấp session key sống 1 giờ, chỉ được gọi `move()` trên contract game — user thao tác liên tục **không phải ký từng bước**, mà nếu key lộ thì thiệt hại bị chặn (hết hạn + đúng target). Lưu ý storage rule: đọc `sessions[key]` là storage **của chính account** nên hợp lệ trong pha validation.

### 3.5 Social recovery — không còn seed phrase là điểm chết

```solidity
address[] public guardians;      // người thân / thiết bị dự phòng
uint256 public threshold;        // cần bao nhiêu guardian đồng ý
mapping(address => address) public approvals; // guardian => owner mới họ ủng hộ

function recover(address newOwner, address[] calldata gs) external {
    uint256 votes;
    for (uint256 i; i < gs.length; ++i) {
        require(_isGuardian(gs[i]) && msg.sender == address(entryPoint), "bad");
        if (approvals[gs[i]] == newOwner) votes++;
    }
    require(votes >= threshold, "not enough guardians");
    owner = newOwner; // đổi khoá mà KHÔNG cần key cũ
}
```

Mất private key không còn là "mất sạch": đủ **threshold guardian** ký đồng thuận là đổi được owner. Đây là điều **EOA vĩnh viễn không làm được**.

---

## 4. Native AA — khi account abstraction là first-class (zkSync Era)

ERC-4337 khéo léo nhưng "mọc thêm" trên L1 ⇒ có overhead (mempool riêng, EntryPoint là contract). Một số L2 như **zkSync Era**, **Starknet** làm **native AA**: **mọi account đều là smart account** ngay ở tầng giao thức, không cần EntryPoint hay bundler — validator của L2 tự gọi vòng `validateTransaction`/`executeTransaction`.

```solidity
// zkSync: mỗi account implement IAccount, được protocol gọi trực tiếp
contract ZkAccount is IAccount {
    function validateTransaction(bytes32, bytes32 txHash, Transaction calldata t)
        external payable returns (bytes4 magic)
    {
        require(msg.sender == BOOTLOADER_FORMAL_ADDRESS, "only bootloader");
        // tự verify chữ ký (secp256k1, hoặc passkey P-256...) như 4337
        magic = _isValidSig(txHash, t.signature)
            ? ACCOUNT_VALIDATION_SUCCESS_MAGIC : bytes4(0);
    }
    function executeTransaction(bytes32, bytes32, Transaction calldata t) external payable {
        require(msg.sender == BOOTLOADER_FORMAL_ADDRESS, "only bootloader");
        // thực thi t.data tới t.to
    }
    // paymaster là tham số cấp giao thức của transaction, không cần contract EntryPoint
}
```

| Tiêu chí | ERC-4337 (L1 & hầu hết L2) | Native AA (zkSync, Starknet) |
|----------|---------------------------|------------------------------|
| Cần đổi giao thức? | Không — chỉ contract + mempool riêng | Có — AA là first-class |
| Ai điều phối? | Bundler + EntryPoint singleton | Validator/bootloader của L2 |
| EOA còn không? | Còn (song song smart account) | Về bản chất mọi account đều "smart" |
| Overhead | Cao hơn (EntryPoint, alt-mempool) | Thấp, gọn |
| Tính di động | Chạy mọi chain EVM có EntryPoint | Khoá vào chain đó |

Xu hướng hội tụ: **EIP-7702** (Pectra, 2025) cho phép EOA **tạm "mặc áo" một smart-account implementation** trong phạm vi một transaction ⇒ EOA cũ cũng dùng được batching/sponsor mà không cần đổi địa chỉ.

---

## 5. Web3 stack — bức tranh toàn cảnh

Smart account chỉ là một mảnh. Một dApp thật cần **cả stack** dưới đây — biết mỗi tầng để chọn nhà cung cấp và debug đúng chỗ.

<svg viewBox="0 0 640 380" role="img" aria-labelledby="ws-t ws-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="ws-t">Web3 stack từ giao diện tới chain</title>
<desc id="ws-d">Sáu tầng xếp chồng: dApp frontend, wallet SDK, RPC endpoint, node provider, indexer, và blockchain L1 hoặc L2</desc>
<rect x="60" y="20" width="520" height="48" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="42" text-anchor="middle" font-size="13" fill="currentColor">dApp frontend (React + wagmi/viem, ethers)</text>
<text x="320" y="59" text-anchor="middle" font-size="11" fill="currentColor">UI, ký UserOp, hiển thị state</text>
<rect x="60" y="80" width="520" height="48" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="102" text-anchor="middle" font-size="13" fill="currentColor">Wallet SDK / AA SDK</text>
<text x="320" y="119" text-anchor="middle" font-size="11" fill="currentColor">MetaMask, WalletConnect, permissionless.js, ZeroDev, Privy</text>
<rect x="60" y="140" width="520" height="48" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="162" text-anchor="middle" font-size="13" fill="currentColor">RPC endpoint (JSON-RPC + bundler API)</text>
<text x="320" y="179" text-anchor="middle" font-size="11" fill="currentColor">eth_call, eth_sendRawTransaction, eth_sendUserOperation</text>
<rect x="60" y="200" width="250" height="48" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="185" y="222" text-anchor="middle" font-size="13" fill="currentColor">Node provider</text>
<text x="185" y="239" text-anchor="middle" font-size="11" fill="currentColor">Alchemy, Infura, QuickNode</text>
<rect x="330" y="200" width="250" height="48" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="455" y="222" text-anchor="middle" font-size="13" fill="currentColor">Indexer</text>
<text x="455" y="239" text-anchor="middle" font-size="11" fill="currentColor">The Graph, Ponder, Dune</text>
<rect x="60" y="260" width="520" height="52" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="284" text-anchor="middle" font-size="13" fill="currentColor">Blockchain L1 / L2 (EVM node, mempool, consensus)</text>
<text x="320" y="301" text-anchor="middle" font-size="11" fill="currentColor">Ethereum, Base, Arbitrum, zkSync...</text>
<line x1="320" y1="68" x2="320" y2="80" stroke="currentColor" stroke-width="1"/>
<line x1="320" y1="128" x2="320" y2="140" stroke="currentColor" stroke-width="1"/>
<line x1="320" y1="188" x2="185" y2="200" stroke="currentColor" stroke-width="1"/>
<line x1="320" y1="188" x2="455" y2="200" stroke="currentColor" stroke-width="1"/>
<line x1="185" y1="248" x2="320" y2="260" stroke="currentColor" stroke-width="1"/>
<line x1="455" y1="248" x2="320" y2="260" stroke="currentColor" stroke-width="1"/>
<text x="320" y="336" text-anchor="middle" font-size="11" fill="currentColor">Đọc: qua RPC/indexer — Ghi: ký ở SDK → RPC/bundler → mempool → block</text>
<text x="320" y="356" text-anchor="middle" font-size="11" fill="currentColor">AA thêm 1 nhánh: bundler RPC (eth_sendUserOperation) + Paymaster service</text>
</svg>

- **RPC**: giao thức **JSON-RPC** để dApp nói chuyện với chain (`eth_call` để đọc, `eth_sendRawTransaction` để ghi). AA thêm **bundler RPC**: `eth_sendUserOperation`, `eth_estimateUserOperationGas`, `eth_getUserOperationReceipt`.
- **Node provider**: chạy full node hộ bạn (Alchemy/Infura/QuickNode) — vì tự chạy node đồng bộ hàng TB rất tốn. Họ thường **kiêm luôn bundler + paymaster** như một dịch vụ.
- **Indexer**: node RPC trả **state hiện tại**, nhưng truy vấn kiểu "mọi Transfer của user này 6 tháng qua" thì phải **index event logs** — đó là việc của **The Graph/Ponder/Dune**.
- **Wallet SDK**: thư viện phía client — **viem/ethers** để encode call & ký; **permissionless.js/ZeroDev** để build UserOp, gắn paymaster, gửi tới bundler.

### 5.1 Gửi một UserOperation bằng SDK (TypeScript)

```ts
import { createSmartAccountClient } from "permissionless";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { http, encodeFunctionData, parseAbi } from "viem";
import { base } from "viem/chains";

// 1) smart account từ 1 owner EOA (hoặc passkey)
const account = await toSimpleSmartAccount({ client, owner, entryPoint });

// 2) client gắn bundler + paymaster (gasless)
const smart = createSmartAccountClient({
  account,
  chain: base,
  bundlerTransport: http("https://api.pimlico.io/v2/base/rpc?apikey=..."),
  paymaster: pimlicoPaymasterClient, // dApp tài trợ gas
});

// 3) BATCHING: approve + transfer trong 1 UserOp, user ký 1 lần
const hash = await smart.sendUserOperation({
  calls: [
    { to: usdc, data: encodeFunctionData({ abi, functionName: "approve", args: [spender, amt] }) },
    { to: spender, data: encodeFunctionData({ abi, functionName: "pull",   args: [amt] }) },
  ],
});
const receipt = await smart.waitForUserOperationReceipt({ hash });
```

SDK lo: dựng struct UserOperation, gọi `eth_estimateUserOperationGas`, xin chữ ký paymaster, ký `userOpHash` bằng owner, rồi `eth_sendUserOperation` tới bundler. Lập trình viên chỉ khai báo **calls** — phần còn lại là stack ở dưới.

---

## 6. Tóm tắt
- **EOA** = "1 key toàn quyền, phải giữ ETH, mất là mất sạch, 1 tx 1 hành động". **Account abstraction** biến account thành **chương trình tự định nghĩa điều kiện hợp lệ**.
- **ERC-4337** làm AA **không cần fork L1**: **UserOperation** (ký, không phải tx) → **mempool riêng** → **Bundler** gom → gọi **EntryPoint** (singleton) → account **validate rồi execute**, **Paymaster** trả gas hộ.
- **Hai pha validation/execution** + **storage rules** tồn tại để bundler chắc chắn được trả gas, chống DoS.
- Mở khoá: **gasless (sponsor/ERC-20 paymaster), batching, session key, social recovery, multisig, passkey** — thứ EOA không làm được.
- **Native AA** (zkSync/Starknet) đưa AA thành first-class; **EIP-7702** cho EOA cũ mượn logic smart account.
- **Web3 stack**: dApp → wallet/AA SDK → **RPC (+ bundler RPC)** → **node provider** & **indexer** → chain. Biết từng tầng để chọn nhà cung cấp và debug đúng chỗ.

> **Bài tiếp theo:** đi sâu vào **MEV, mempool & thiết kế giao dịch chống front-running** — vì UserOp cũng nằm trong một mempool có thể bị săn.
