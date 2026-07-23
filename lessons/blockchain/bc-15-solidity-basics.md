# Bài 15 — Solidity cơ bản: storage/memory/calldata

## 1. Mục tiêu
Sau bài này bạn có thể:
- Viết được một **contract Solidity** đúng cú pháp: `pragma`, `contract`, **state variable**, `function`, `constructor`.
- Chọn đúng **kiểu dữ liệu** value vs reference: `uint`, `address`, `bytes`, `mapping`, `struct`, `array`.
- Phân biệt **storage / memory / calldata** — cả về **ngữ nghĩa** (bản sao hay tham chiếu) lẫn **chi phí gas**.
- Dùng đúng **visibility** (`public` / `external` / `internal` / `private`) và hiểu vì sao `external` rẻ hơn `public`.
- Viết `modifier`, dùng `require` để kiểm tra điều kiện và revert an toàn.

---

## 2. Lý thuyết

### 2.1 Bộ khung một contract

Solidity là ngôn ngữ **statically-typed** biên dịch ra **EVM bytecode**. Một file `.sol` tối thiểu gồm 3 phần: giấy phép, `pragma` khai báo version compiler, và thân `contract`.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Counter {
    // state variable — lưu vĩnh viễn trong storage của contract
    uint256 public count;

    // constructor — chạy đúng 1 lần khi deploy
    constructor(uint256 initial) {
        count = initial;
    }

    // function làm thay đổi state → tốn gas, cần transaction
    function increment() public {
        count += 1;
    }
}
```

- `SPDX-License-Identifier`: dòng comment khai báo giấy phép; thiếu chỉ cảnh báo, không lỗi.
- `pragma solidity ^0.8.20;`: `^` nghĩa là "0.8.20 tới <0.9.0". Từ **0.8.0**, phép toán số nguyên **tự động revert khi overflow/underflow** — không còn cần `SafeMath`.
- `count` là **state variable**: sống trong **storage** của contract, tồn tại vĩnh viễn giữa các transaction. Compiler tự sinh **getter** vì nó `public`.

### 2.2 Kiểu dữ liệu: value type vs reference type

Đây là chia rẽ quan trọng nhất chi phối cả bài. **Value type** được **copy khi gán/truyền**; **reference type** thì cần khai báo **nơi lưu trữ** (data location).

| Nhóm | Kiểu | Ghi chú |
|------|------|---------|
| **Value** | `uint8..uint256`, `int`, `bool`, `address`, `bytes1..bytes32`, `enum` | `uint` = `uint256`. Copy khi gán. |
| **Reference** | `bytes`, `string`, `array`, `struct`, `mapping` | Phải kèm `storage`/`memory`/`calldata`. |

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Types {
    uint256 public total;               // 0..2^256-1
    int256  public delta;               // có dấu
    bool    public active;              // true/false
    address public owner;               // 20 byte, ví/contract
    address payable public treasury;    // address có thể .transfer/.send

    bytes32 public root;                // 32 byte cố định — rẻ, dùng cho hash
    bytes   public blob;                // byte động — dùng cho dữ liệu dài
    string  public name;                // UTF-8 động

    // mapping: bảng key→value, KHÔNG lặp được, không có length
    mapping(address => uint256) public balanceOf;

    // struct: gom nhiều field thành 1 kiểu
    struct User { string handle; uint256 joinedAt; bool banned; }
    mapping(address => User) public users;

    // array động và cố định
    uint256[]  public dynamicArr;
    uint256[3] public fixedArr;
}
```

Điểm hay nhầm:
- **`address` vs `address payable`**: chỉ `address payable` mới gọi được `.transfer()` / `.send()`. Ép kiểu: `payable(someAddress)`.
- **`bytes32` vs `bytes`**: `bytes32` là value type **giá đỡ cố định**, rẻ và dùng cho hash/khóa. `bytes`/`string` là động, tốn gas hơn nhiều.
- **`mapping`** không lưu key, không đếm được, không iterate được, và **chỉ tồn tại ở storage** — không thể tạo mapping trong `memory`.

### 2.3 Ba nơi lưu trữ dữ liệu: storage / memory / calldata

EVM có nhiều vùng nhớ với **chi phí và vòng đời khác nhau**. Khi khai báo một biến **reference type**, bạn PHẢI nói nó nằm ở đâu.

<svg viewBox="0 0 720 300" role="img" aria-labelledby="loc-t loc-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="loc-t">Storage vs Memory vs Calldata</title>
<desc id="loc-d">Ba vùng lưu trữ của EVM: storage vĩnh viễn và đắt, memory tạm thời rẻ hơn, calldata chỉ đọc rẻ nhất</desc>
<rect x="30" y="60" width="200" height="180" rx="10" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="130" y="88" text-anchor="middle" font-size="15" fill="currentColor">storage</text>
<text x="130" y="120" text-anchor="middle" font-size="11" fill="currentColor">Vĩnh viễn trên chain</text>
<text x="130" y="140" text-anchor="middle" font-size="11" fill="currentColor">Đọc/ghi = SLOAD/SSTORE</text>
<text x="130" y="160" text-anchor="middle" font-size="11" fill="currentColor">RẤT đắt gas</text>
<text x="130" y="188" text-anchor="middle" font-size="11" fill="currentColor">Ghi ô mới ~20000 gas</text>
<text x="130" y="214" text-anchor="middle" font-size="11" fill="currentColor">state variable ở đây</text>
<rect x="260" y="60" width="200" height="180" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="88" text-anchor="middle" font-size="15" fill="currentColor">memory</text>
<text x="360" y="120" text-anchor="middle" font-size="11" fill="currentColor">Tạm thời trong 1 call</text>
<text x="360" y="140" text-anchor="middle" font-size="11" fill="currentColor">Đọc/ghi = MLOAD/MSTORE</text>
<text x="360" y="160" text-anchor="middle" font-size="11" fill="currentColor">Rẻ, xoá sau call</text>
<text x="360" y="188" text-anchor="middle" font-size="11" fill="currentColor">Đọc/ghi được</text>
<text x="360" y="214" text-anchor="middle" font-size="11" fill="currentColor">biến làm việc tạm</text>
<rect x="490" y="60" width="200" height="180" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="590" y="88" text-anchor="middle" font-size="15" fill="currentColor">calldata</text>
<text x="590" y="120" text-anchor="middle" font-size="11" fill="currentColor">Vùng input của tx</text>
<text x="590" y="140" text-anchor="middle" font-size="11" fill="currentColor">CHỈ ĐỌC (read-only)</text>
<text x="590" y="160" text-anchor="middle" font-size="11" fill="currentColor">Rẻ nhất — không copy</text>
<text x="590" y="188" text-anchor="middle" font-size="11" fill="currentColor">Cho tham số external</text>
<text x="590" y="214" text-anchor="middle" font-size="11" fill="currentColor">bytes/array đầu vào</text>
<text x="360" y="272" text-anchor="middle" font-size="12" fill="currentColor">Quy tắc gas: tránh chạm storage; ưu tiên calldata cho input; dùng memory để tính toán tạm</text>
</svg>

- **storage**: bộ nhớ **key-value 32 byte** gắn với contract, **persist vĩnh viễn** trên blockchain. Mọi state variable nằm đây. Ghi (`SSTORE`) là thao tác **đắt nhất** trong EVM (tới ~20.000 gas cho một ô lần đầu).
- **memory**: vùng nhớ **tuyến tính tạm thời**, chỉ sống trong **một lần gọi hàm**, hết hàm là mất. Đọc/ghi rẻ hơn storage nhiều bậc. Dùng để dựng struct/array trung gian, ghép string...
- **calldata**: vùng chứa **dữ liệu đầu vào của transaction/call**, **bất biến, chỉ đọc**. Rẻ nhất vì compiler **không cần copy** ra memory. Chỉ dùng được cho **tham số hàm** (thường của hàm `external`).

Quy tắc mặc định: **tham số reference của hàm `external` → dùng `calldata`**; cần biến đổi cục bộ → `memory`; muốn sửa trực tiếp state → `storage`.

### 2.4 Bẫy kinh điển: storage pointer vs memory copy

Khi gán một reference type sang biến `storage`, bạn tạo **con trỏ** tới đúng dữ liệu gốc — sửa nó là **sửa state thật**. Còn gán sang `memory` là tạo một **bản sao** — sửa bản sao không đụng gì tới state.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PointerDemo {
    struct Point { uint256 x; uint256 y; }
    Point public p;               // trong storage

    function setViaStorage() external {
        Point storage ref = p;    // ref là CON TRỎ tới p
        ref.x = 42;               // ✅ ghi thẳng vào state → p.x == 42
    }

    function setViaMemory() external {
        Point memory tmp = p;     // tmp là BẢN SAO của p
        tmp.x = 99;               // ✏️ chỉ sửa bản sao → p KHÔNG đổi
    }
}
```

Sau khi gọi `setViaStorage`, `p.x = 42`. Nhưng gọi `setViaMemory` thì `p.x` vẫn nguyên — vì `tmp` chỉ là copy trong memory và bị vứt khi hàm kết thúc. Nhầm hai cái này là nguồn bug rất phổ biến của người mới.

### 2.5 Visibility: ai gọi được hàm/biến

| Visibility | Gọi từ bên ngoài | Gọi nội bộ | Contract con kế thừa | Ghi chú |
|------------|:----------------:|:----------:|:--------------------:|---------|
| `public` | ✅ | ✅ | ✅ | State var mặc định sinh getter |
| `external` | ✅ | ❌ (phải `this.f()`) | ❌ | **Rẻ gas hơn** cho input lớn |
| `internal` | ❌ | ✅ | ✅ | Mặc định cho state var |
| `private` | ❌ | ✅ | ❌ | Chỉ trong đúng contract này |

Vì sao `external` rẻ hơn `public` cho tham số lớn? Hàm `public` phải **copy tham số từ calldata sang memory** (để dùng được cả khi gọi nội bộ), còn `external` **đọc thẳng từ calldata**. Với một mảng lớn, khác biệt gas là đáng kể.

> ⚠️ **`private`/`internal` KHÔNG phải bí mật.** Chúng chỉ chặn truy cập ở **tầng ngôn ngữ**. Mọi dữ liệu storage đều **đọc được công khai** trên chain (qua `eth_getStorageAt`). Đừng bao giờ lưu bí mật thật (mật khẩu, khóa) on-chain.

### 2.6 Modifier, constructor, require

- **`constructor`**: chạy **đúng một lần** lúc deploy, để khởi tạo state (thường là gán `owner`). Không nằm trong bytecode runtime.
- **`require(cond, "msg")`**: nếu `cond` sai thì **revert** toàn bộ transaction, **hoàn lại gas chưa dùng** và trả về message lỗi. Đây là hàng phòng thủ chính để kiểm tra input & quyền.
- **`modifier`**: đoạn code tái sử dụng bọc quanh hàm; `_;` là chỗ thân hàm gốc được "nhét vào". Kinh điển nhất là kiểm tra quyền `onlyOwner`.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Ownable {
    address public owner;

    // event để log ra ngoài chain — rẻ hơn lưu storage
    event OwnerChanged(address indexed from, address indexed to);

    constructor() {
        owner = msg.sender;   // người deploy là chủ đầu tiên
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER"); // chặn nếu không phải chủ
        _;                    // <- thân hàm gốc chạy tại đây
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDR"); // chặn địa chỉ rỗng
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }
}
```

`msg.sender` là **address gọi hàm hiện tại**; `msg.value` là số wei gửi kèm; `require(newOwner != address(0), ...)` chặn lỗi vô tình chuyển quyền vào **địa chỉ 0** (mất chủ vĩnh viễn).

---

## 3. Ví dụ end-to-end: một ERC-20 tối giản (chạy được)

Gom tất cả khái niệm vào một hợp đồng token nhỏ. Chú ý cách dùng `mapping`, `calldata`, `require`, `modifier`.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MiniToken {
    string  public name = "MiniToken";
    string  public symbol = "MINI";
    uint8   public constant decimals = 18;
    uint256 public totalSupply;
    address public owner;

    mapping(address => uint256) public balanceOf;

    event Transfer(address indexed from, address indexed to, uint256 value);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor(uint256 initialSupply) {
        owner = msg.sender;
        totalSupply = initialSupply;
        balanceOf[msg.sender] = initialSupply; // cấp toàn bộ cho người deploy
    }

    // external + không tham số reference → gọn, rẻ
    function transfer(address to, uint256 amount) external returns (bool) {
        require(to != address(0), "ZERO_ADDR");
        require(balanceOf[msg.sender] >= amount, "INSUFFICIENT");
        balanceOf[msg.sender] -= amount;   // 0.8+ tự revert nếu underflow
        balanceOf[to]         += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    // ví dụ tham số reference dùng calldata: airdrop nhiều địa chỉ 1 lần
    function airdrop(address[] calldata to, uint256 amount) external onlyOwner {
        for (uint256 i = 0; i < to.length; i++) {
            balanceOf[owner]  -= amount;
            balanceOf[to[i]]  += amount;
            emit Transfer(owner, to[i], amount);
        }
    }
}
```

Vì sao `address[] calldata to`? Vì `airdrop` là `external` và ta **chỉ đọc** mảng địa chỉ — dùng `calldata` để **không copy sang memory**, tiết kiệm gas khi danh sách dài. Nếu đổi thành `memory`, compiler biên dịch được nhưng **tốn thêm gas** vì phải sao chép.

### 3.1 Thử ngay bằng Foundry (tùy chọn)

```bash
forge init mini && cd mini
# lưu MiniToken.sol vào src/, viết test rồi:
forge test -vv
```

```solidity
// test/MiniToken.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "forge-std/Test.sol";
import "../src/MiniToken.sol";

contract MiniTokenTest is Test {
    MiniToken t;
    function setUp() public { t = new MiniToken(1000e18); }

    function test_TransferMovesBalance() public {
        t.transfer(address(0xBEEF), 100e18);
        assertEq(t.balanceOf(address(0xBEEF)), 100e18);
        assertEq(t.balanceOf(address(this)), 900e18);
    }

    function test_RevertOnInsufficient() public {
        vm.expectRevert("INSUFFICIENT");
        t.transfer(address(0xBEEF), 2000e18); // vượt số dư → revert
    }
}
```

---

## 4. Bảng quyết định nhanh data location

| Tình huống | Chọn |
|------------|------|
| State variable của contract | **storage** (ngầm định) |
| Muốn sửa thẳng struct/array trong state | `... storage ref = ...` |
| Biến tạm để tính toán, ghép string | **memory** |
| Tham số reference của hàm `external`, chỉ đọc | **calldata** |
| Trả về mảng/struct dựng trong hàm | **memory** |
| Muốn lưu bí mật | ❌ Đừng — mọi thứ on-chain đều công khai |

---

## 5. Tóm tắt
- Bộ khung: `// SPDX` → `pragma` → `contract` chứa **state var + constructor + function**. Solidity **0.8+** tự chống overflow.
- **Value type** (`uint`, `address`, `bytes32`, `bool`) copy khi gán; **reference type** (`bytes`, `string`, `array`, `struct`, `mapping`) cần khai báo **data location**.
- **storage** = vĩnh viễn & đắt; **memory** = tạm thời & rẻ hơn; **calldata** = input chỉ-đọc & rẻ nhất. Gán sang `storage` là **con trỏ** (sửa state thật), gán sang `memory` là **bản sao**.
- **Visibility**: `public`/`external`/`internal`/`private`; `external` rẻ hơn cho input lớn; `private` **không** đồng nghĩa bí mật.
- **`modifier` + `require`** là bộ đôi kiểm soát quyền & input; `constructor` khởi tạo state một lần khi deploy; `msg.sender` cho biết ai đang gọi.

> **Bài tiếp theo (Bài 16):** đi sâu vào **gas, opcode & tối ưu chi phí** — vì sao mỗi lần chạm `storage` lại đắt đến vậy và cách viết contract tiết kiệm gas.
