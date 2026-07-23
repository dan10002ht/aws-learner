# Bài 16 — Vòng đời contract, ABI, event, deploy

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **vòng đời một smart contract**: từ source Solidity → bytecode → **deploy** → sống trên chain → tương tác.
- Phân biệt rạch ròi **`call` (read-only, off-chain)** và **`transaction` (state-changing, tốn gas)** — sai chỗ này là bug kinh điển.
- Hiểu **ABI** và **function selector** — cách EVM biết bạn đang gọi hàm nào từ 4 byte đầu của calldata.
- Dùng **event / log / indexed topic** đúng cách để off-chain (indexer, frontend) đọc được dữ liệu.
- Xử lý lỗi bằng **`require` / `revert` / custom error** và hiểu chi phí gas của từng cách.
- Biết khi nào contract cần **`receive` / `fallback`** và cạm bẫy đi kèm.

---

## 2. Lý thuyết

### 2.1 Analogy — cài một cái máy bán hàng tự động vào quảng trường

Smart contract giống một **máy bán hàng tự động (vending machine)** đặt cố định giữa quảng trường công cộng:

| Bước với vending machine | Tương đương smart contract |
|--------------------------|----------------------------|
| **Chế tạo** máy trong xưởng | Compile Solidity → **bytecode** |
| **Đặt máy** xuống quảng trường, khoan bắt vít cố định | **Deploy**: bytecode được ghi vào state tại một **address** |
| Máy nhận **xu** và **nút bấm** theo quy ước | ABI + calldata: bạn phải bấm đúng "nút" (function selector) |
| **Nhìn** giá niêm yết qua kính (không cần bỏ xu) | **`call`**: đọc state, miễn phí, off-chain |
| **Bỏ xu bấm nút** để lấy hàng, máy đổi tồn kho | **`transaction`**: đổi state, tốn gas, phải mine |
| Máy **in hoá đơn** dán ra ngoài để ai đi qua cũng thấy | **event / log**: ghi ra ngoài state, cho off-chain index |

Điểm cốt lõi: một khi đã "khoan bắt vít", **code contract là bất biến** (trừ khi bạn thiết kế proxy — bài sau). Bạn không sửa được máy đã đặt; chỉ tương tác qua đúng các "nút" mà ABI mô tả.

### 2.2 Vòng đời contract — bức tranh tổng

<svg viewBox="0 0 720 250" role="img" aria-labelledby="lc-t lc-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="lc-t">Vòng đời smart contract</title>
<desc id="lc-d">Từ source code qua compile ra bytecode và ABI, deploy tạo địa chỉ, rồi tương tác bằng call hoặc transaction phát ra event</desc>
<rect x="20" y="100" width="110" height="55" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="75" y="124" text-anchor="middle" font-size="13" fill="currentColor">.sol source</text>
<text x="75" y="142" text-anchor="middle" font-size="11" fill="currentColor">Solidity</text>
<rect x="185" y="70" width="110" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="240" y="92" text-anchor="middle" font-size="12" fill="currentColor">bytecode</text>
<text x="240" y="109" text-anchor="middle" font-size="11" fill="currentColor">(EVM ops)</text>
<rect x="185" y="140" width="110" height="50" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="240" y="162" text-anchor="middle" font-size="12" fill="currentColor">ABI (JSON)</text>
<text x="240" y="179" text-anchor="middle" font-size="11" fill="currentColor">off-chain</text>
<rect x="350" y="100" width="120" height="55" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="410" y="124" text-anchor="middle" font-size="12" fill="currentColor">Deploy tx</text>
<text x="410" y="142" text-anchor="middle" font-size="11" fill="currentColor">→ address 0x..</text>
<rect x="525" y="40" width="170" height="50" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="610" y="62" text-anchor="middle" font-size="12" fill="currentColor">call (view)</text>
<text x="610" y="79" text-anchor="middle" font-size="11" fill="currentColor">đọc, miễn phí</text>
<rect x="525" y="105" width="170" height="50" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="610" y="127" text-anchor="middle" font-size="12" fill="currentColor">transaction</text>
<text x="610" y="144" text-anchor="middle" font-size="11" fill="currentColor">đổi state, tốn gas</text>
<rect x="525" y="170" width="170" height="50" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="610" y="192" text-anchor="middle" font-size="12" fill="currentColor">emit event → log</text>
<text x="610" y="209" text-anchor="middle" font-size="11" fill="currentColor">cho indexer</text>
<line x1="130" y1="118" x2="183" y2="98" stroke="currentColor" stroke-width="1.4" marker-end="url(#a16)"/>
<line x1="130" y1="132" x2="183" y2="160" stroke="currentColor" stroke-width="1.4" marker-end="url(#a16)"/>
<line x1="295" y1="95" x2="348" y2="120" stroke="currentColor" stroke-width="1.4" marker-end="url(#a16)"/>
<line x1="470" y1="120" x2="523" y2="70" stroke="currentColor" stroke-width="1.4" marker-end="url(#a16)"/>
<line x1="470" y1="128" x2="523" y2="128" stroke="currentColor" stroke-width="1.4" marker-end="url(#a16)"/>
<line x1="470" y1="136" x2="523" y2="190" stroke="currentColor" stroke-width="1.4" marker-end="url(#a16)"/>
<defs><marker id="a16" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.3 Deploy — bytecode + constructor

Khi bạn `solc` (hoặc Foundry/Hardhat) biên dịch, ra hai loại bytecode:
- **Creation bytecode** (init code): chạy **một lần duy nhất** lúc deploy. Nó chứa logic constructor + trả về runtime bytecode.
- **Runtime bytecode** (deployed code): phần **thực sự nằm lại** tại address, chạy mỗi lần có ai gọi contract.

Một **deploy transaction** là một tx có trường `to` **để trống** (nil). EVM hiểu đây là "tạo contract":
1. Lấy `data` = creation bytecode **nối** với các **tham số constructor đã ABI-encode**.
2. Chạy creation bytecode: constructor thực thi (set owner, mint token khởi tạo...), **tiêu gas**.
3. Giá trị `return` của init code chính là **runtime bytecode**, được EVM lưu vào state tại address mới.
4. Address contract được tính **tất định**: với deploy thường là `keccak256(rlp(sender, nonce))[12:]`; với `CREATE2` là hàm của `(deployer, salt, keccak256(initcode))` → cho phép **biết trước address** trước khi deploy.

> Constructor **không** có mặt trong runtime bytecode. Vì thế bạn **không thể gọi lại constructor** sau khi deploy — nó không tồn tại ở địa chỉ contract. Đây là lý do biến immutable set trong constructor rồi thì "đóng băng".

### 2.4 ABI & function selector — EVM tìm hàm bằng cách nào?

EVM **không biết tên hàm**. Nó chỉ thấy một mảng byte gọi là **calldata**. ABI (Application Binary Interface) là **quy ước encode/decode** để off-chain và contract nói chung một ngôn ngữ.

Khi bạn gọi `transfer(address to, uint256 amount)`:
1. Lấy **chữ ký chuẩn hoá** (canonical signature): `"transfer(address,uint256)"` — **không có tên biến, không khoảng trắng**.
2. `selector = keccak256("transfer(address,uint256)")[:4]` → 4 byte đầu, ví dụ `0xa9059cbb`.
3. Các tham số được **ABI-encode** thành các word 32-byte, nối sau selector.
4. Runtime bytecode mở đầu bằng một **dispatcher**: so 4 byte đầu calldata với từng selector để nhảy đúng hàm.

```
calldata =  0xa9059cbb                                    ← selector (4 byte)
            0000...000 <address 32 byte, pad trái>        ← tham số to
            0000...02a <uint256 32 byte>                  ← tham số amount = 42
```

Hệ quả thực chiến:
- Hai hàm khác nhau **có thể trùng selector** (collision) — hiếm nhưng là vector tấn công với proxy.
- Gọi một selector **không tồn tại** → rơi vào `fallback` (xem 2.8), hoặc revert nếu không có fallback.

### 2.5 `call` vs `transaction` — khác biệt sống còn

Đây là chỗ người mới nhầm nhiều nhất. Cùng một hàm Solidity, nhưng **cách bạn triệu gọi** quyết định nó là read hay write.

| Tiêu chí | `call` (eth_call) | `transaction` (eth_sendRawTransaction) |
|----------|-------------------|----------------------------------------|
| **Mục đích** | Đọc state / mô phỏng | Thay đổi state |
| **Tốn gas?** | Không (chạy trên node local) | Có, trừ vào ví người gửi |
| **Cần ký?** | Không | Có (private key) |
| **Vào block?** | Không, không được mine | Có, chờ xác nhận |
| **Trả về giá trị?** | Có, trả trực tiếp | **Không** trả cho off-chain — chỉ có **receipt** (status + logs) |
| **Dùng cho** | hàm `view` / `pure`, hoặc "dry-run" tx | hàm đổi storage, chuyển tiền |

Điểm dễ sai nhất: một hàm **state-changing gọi qua `call`** sẽ **chạy được và trả giá trị** trên node local, nhưng **KHÔNG lưu gì lên chain**. Người mới hay "gọi hàm mint xong không thấy token đâu" vì thư viện đã gọi `eth_call` thay vì gửi tx.

Ngược lại, một hàm `view` **có thể** được đưa vào một tx (tốn gas vô ích) nhưng vì nó không đổi state nên vô nghĩa. Ngoài ra, **giá trị return của một transaction không đến được off-chain** — muốn frontend biết kết quả một tx đổi state, bạn **phải emit event** (xem 2.6), không thể "đọc return".

`view` (đọc state, không ghi) và `pure` (không đọc cả state) là **hint ở tầng Solidity/ABI** giúp thư viện tự chọn `eth_call`. Nhưng ở tầng EVM không có "view opcode" cưỡng chế — sự an toàn đến từ việc `STATICCALL` cấm mọi opcode ghi state.

### 2.6 Event, log & indexed topic

State của contract **đắt để đọc từ off-chain** và không được lưu theo kiểu dễ query. **Event** là cơ chế để contract **phát ra dữ liệu ra "ngoài state"** (transaction receipt / logs), rẻ hơn storage và được thiết kế để **indexer** (The Graph, ethers listeners, explorers) bắt được.

Một log gồm:
- **topics[0]** = `keccak256("Transfer(address,address,uint256)")` — chữ ký event (trừ anonymous event).
- **topics[1..3]** = tối đa **3 tham số `indexed`**, mỗi cái một topic 32-byte → có thể **filter nhanh** (`getLogs` theo topic).
- **data** = các tham số **không indexed**, ABI-encoded gộp lại → rẻ hơn nhưng **không filter được**.

```solidity
event Transfer(address indexed from, address indexed to, uint256 value);
//              ^^ topic1          ^^ topic2            ^^ data (không index)
```

Quy tắc chọn `indexed`:
- Đánh `indexed` cho thứ bạn **cần lọc theo**: địa chỉ người gửi/nhận, tokenId... (tối đa 3).
- **Không** đánh `indexed` cho dữ liệu lớn/dạng chuỗi bạn chỉ cần đọc chứ không lọc — vì tham số động (`string`, `bytes`, array) khi `indexed` chỉ lưu **keccak hash** của nó vào topic, **mất giá trị gốc**.
- Event **không đọc được từ bên trong contract** — nó chỉ dành cho off-chain. Đừng dùng event làm nơi lưu trạng thái on-chain.

Chi phí: `LOG` opcode ~375 gas + 375/topic + 8 gas/byte data — rẻ hơn nhiều so với `SSTORE` (20.000 gas cho slot mới). Vì thế "lưu lịch sử" nên dùng event, không dùng array trong storage.

### 2.7 Xử lý lỗi: `require`, `revert`, custom error

Khi điều kiện không thoả, contract nên **revert** — **hoàn nguyên toàn bộ** thay đổi state trong tx đó (nguyên tử: all-or-nothing), **hoàn lại gas chưa dùng**, nhưng **gas đã tiêu tới điểm revert thì mất**.

Ba cách, chi phí bytecode & gas khác nhau:

```solidity
// 1) require với chuỗi lý do — dễ đọc nhưng chuỗi tốn bytecode & gas
require(msg.sender == owner, "Not owner");

// 2) revert với custom error (Solidity >=0.8.4) — RẺ NHẤT, khuyến nghị
error NotOwner(address caller);
if (msg.sender != owner) revert NotOwner(msg.sender);

// 3) assert — chỉ dùng cho invariant "không bao giờ được sai"
assert(totalSupply >= balance); // Panic(uint256), báo hiệu bug logic
```

- **Custom error** encode thành 4-byte selector (như function selector) + tham số → **tốn ít bytecode & gas hơn** chuỗi require. Đây là chuẩn hiện đại.
- `require`/`revert` phát ra `Error(string)`; `assert` và lỗi runtime (chia 0, overflow ở 0.8+, out-of-bounds) phát ra `Panic(uint256)`.
- Từ Solidity 0.8.0, **overflow/underflow tự revert** — không cần SafeMath nữa (trừ khi cố ý dùng `unchecked{}` để tiết kiệm gas khi chắc chắn không tràn).

### 2.8 `receive` và `fallback`

Contract muốn **nhận ETH trơn** (tx chỉ có value, không có calldata) hoặc **bắt lời gọi tới hàm không tồn tại** cần hai hàm đặc biệt:

<svg viewBox="0 0 700 240" role="img" aria-labelledby="rf-t rf-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="rf-t">Cây quyết định receive và fallback</title>
<desc id="rf-d">EVM quyết định gọi receive hay fallback dựa trên calldata rỗng hay không và value gửi kèm</desc>
<rect x="270" y="15" width="160" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="34" text-anchor="middle" font-size="12" fill="currentColor">Tx tới contract</text>
<text x="350" y="51" text-anchor="middle" font-size="11" fill="currentColor">calldata rỗng?</text>
<rect x="70" y="105" width="180" height="45" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="160" y="124" text-anchor="middle" font-size="12" fill="currentColor">rỗng + có receive()</text>
<text x="160" y="141" text-anchor="middle" font-size="11" fill="currentColor">→ receive()</text>
<rect x="290" y="105" width="180" height="45" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="380" y="124" text-anchor="middle" font-size="12" fill="currentColor">rỗng, không receive</text>
<text x="380" y="141" text-anchor="middle" font-size="11" fill="currentColor">→ fallback()</text>
<rect x="510" y="105" width="180" height="45" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="600" y="124" text-anchor="middle" font-size="12" fill="currentColor">selector không khớp</text>
<text x="600" y="141" text-anchor="middle" font-size="11" fill="currentColor">→ fallback()</text>
<rect x="250" y="185" width="200" height="42" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="205" text-anchor="middle" font-size="11" fill="currentColor">không có hàm nào phù hợp</text>
<text x="350" y="221" text-anchor="middle" font-size="11" fill="currentColor">→ revert</text>
<line x1="330" y1="60" x2="180" y2="103" stroke="currentColor" stroke-width="1.3" marker-end="url(#a16b)"/>
<line x1="350" y1="60" x2="380" y2="103" stroke="currentColor" stroke-width="1.3" marker-end="url(#a16b)"/>
<line x1="400" y1="60" x2="590" y2="103" stroke="currentColor" stroke-width="1.3" marker-end="url(#a16b)"/>
<line x1="380" y1="150" x2="355" y2="183" stroke="currentColor" stroke-width="1.3" stroke-dasharray="3 3" marker-end="url(#a16b)"/>
<defs><marker id="a16b" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

- `receive() external payable`: gọi khi **calldata rỗng** và có `receive`. Bắt buộc `payable`.
- `fallback() external [payable]`: gọi khi (a) calldata rỗng nhưng **không có** `receive`, hoặc (b) selector **không khớp** hàm nào. Dùng cho proxy (delegatecall tới implementation).
- Cạm bẫy: `receive`/`fallback` khi được gọi qua `.transfer()`/`.send()` chỉ có **2300 gas** — không đủ để `SSTORE`. Đừng đặt logic nặng ở đây, dễ làm gãy người gửi tiền.

---

## 3. Code end-to-end: contract có đủ mọi thứ

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Vault {
    // --- state ---
    address public immutable owner;   // set 1 lần trong constructor, đóng băng
    mapping(address => uint256) public balances;
    uint256 public totalDeposited;

    // --- events: cho off-chain index ---
    event Deposited(address indexed user, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed user, uint256 amount);

    // --- custom errors: rẻ hơn require-string ---
    error NotOwner(address caller);
    error InsufficientBalance(uint256 requested, uint256 available);
    error ZeroAmount();

    // --- constructor: chạy 1 lần lúc deploy, KHÔNG nằm trong runtime bytecode ---
    constructor(address _owner) {
        owner = _owner;               // nhận tham số đã ABI-encode nối sau bytecode
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner(msg.sender);
        _;
    }

    // --- transaction (state-changing, payable) ---
    function deposit() external payable {
        if (msg.value == 0) revert ZeroAmount();
        balances[msg.sender] += msg.value;   // SSTORE, tốn gas
        totalDeposited += msg.value;
        emit Deposited(msg.sender, msg.value, balances[msg.sender]); // LOG cho indexer
    }

    function withdraw(uint256 amount) external {
        uint256 bal = balances[msg.sender];
        if (amount > bal) revert InsufficientBalance(amount, bal);
        balances[msg.sender] = bal - amount;      // đổi state TRƯỚC khi gửi (chống reentrancy)
        totalDeposited -= amount;
        emit Withdrawn(msg.sender, amount);
        (bool ok, ) = msg.sender.call{value: amount}(""); // gửi ETH
        require(ok, "transfer failed");
    }

    // --- view: đọc state, off-chain gọi bằng eth_call, MIỄN PHÍ ---
    function balanceOf(address user) external view returns (uint256) {
        return balances[user];
    }

    // --- pure: không đọc cả state ---
    function feeFor(uint256 amount) external pure returns (uint256) {
        return amount / 100; // 1%
    }

    // --- receive: nhận ETH trơn (calldata rỗng) ---
    receive() external payable {
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value, balances[msg.sender]);
    }
}
```

Giải thích các quyết định:
- `owner` là **immutable**, set trong constructor — đọc rẻ (nhúng thẳng vào bytecode), không dùng slot storage.
- `deposit`/`withdraw` là **transaction**: đổi storage + emit event, off-chain **phải gửi tx**, không thể `call`.
- `balanceOf`/`feeFor` là **view/pure**: off-chain gọi `eth_call`, không tốn gas, có return trực tiếp.
- Cả `deposit` và `receive` đều **emit event** để frontend/indexer biết số dư mới — vì return của tx không tới được off-chain.
- Custom error `InsufficientBalance(requested, available)` mang **dữ liệu** giúp debug, mà vẫn rẻ hơn chuỗi.

### 3.1 Deploy & tương tác bằng Foundry

```bash
# Compile (ra bytecode + ABI trong out/Vault.sol/Vault.json)
forge build

# Deploy: constructor arg _owner được ABI-encode nối vào creation bytecode
forge create src/Vault.sol:Vault \
  --rpc-url $RPC --private-key $PK \
  --constructor-args 0xYourOwnerAddress

# transaction (state-changing) — cast send: KÝ và gửi lên chain, tốn gas
cast send $VAULT "deposit()" --value 1ether --rpc-url $RPC --private-key $PK

# call (read-only) — cast call: chạy eth_call, KHÔNG tốn gas, trả giá trị
cast call $VAULT "balanceOf(address)(uint256)" 0xUser --rpc-url $RPC

# Xem function selector khớp với chữ ký chuẩn hoá
cast sig "transfer(address,uint256)"   # -> 0xa9059cbb

# Đọc event/log đã phát ra (topic0 = keccak của chữ ký event)
cast logs --address $VAULT \
  "Deposited(address,uint256,uint256)" --rpc-url $RPC
```

Nhận ra khác biệt cốt lõi ngay ở CLI: **`cast send`** (transaction, cần `--private-key`, đổi state) vs **`cast call`** (read-only, không cần ký). Chọn nhầm là lỗi "gọi hàm mà state không đổi" hoặc ngược lại.

---

## 4. Bảng tổng: chọn đúng công cụ

| Bạn cần | Dùng | Off-chain gọi bằng |
|---------|------|--------------------|
| Đọc một biến / tính toán | `view` / `pure` | `eth_call` (miễn phí) |
| Đổi storage / chuyển tiền | hàm thường (payable nếu nhận ETH) | tx đã ký (tốn gas) |
| Cho frontend/indexer biết "vừa xảy ra gì" | `event` + `emit` | đọc `getLogs` theo topic |
| Chặn điều kiện sai, hoàn nguyên | `revert CustomError()` | bắt lỗi từ receipt/revert reason |
| Nhận ETH không kèm data | `receive() payable` | tx chỉ có `value` |
| Bắt lời gọi lạ / proxy | `fallback()` | selector không khớp |

---

## 5. Tóm tắt
- **Deploy** = tx không có `to`: creation bytecode chạy constructor rồi trả về **runtime bytecode** lưu tại address. Constructor **không** tồn tại sau deploy.
- **ABI + function selector** (`keccak(sig)[:4]`) là cách EVM định tuyến calldata tới đúng hàm — EVM không biết tên hàm.
- **`call` đọc, miễn phí, off-chain**; **`transaction` ghi, tốn gas, phải mine** — và **return của tx không tới off-chain**, nên cần event.
- **Event/log** với tối đa 3 **indexed topic** là kênh chuẩn cho indexer; rẻ hơn storage nhưng **không đọc được on-chain**.
- **Custom error** rẻ hơn `require`-string; revert **hoàn nguyên nguyên tử** mọi thay đổi trong tx.
- **`receive`/`fallback`** xử lý ETH trơn và lời gọi không khớp — cẩn thận giới hạn 2300 gas.

> **Bài tiếp theo (Bài 17):** đi sâu vào **gas, storage layout & tối ưu chi phí** — vì sao `SSTORE` đắt, packing biến, và cách viết contract "rẻ để chạy".
