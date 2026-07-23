# Bài 24 — Quy trình audit: Slither, Echidna, formal verification

## 1. Mục tiêu
Sau bài này bạn có thể:
- Mô tả **quy trình audit chuyên nghiệp** end-to-end: scoping → manual review → tooling → report → fix review.
- Chạy **Slither** (static analysis) để bắt lỗi kiểu reentrancy, uninitialized storage, arbitrary send.
- Viết **fuzzing / invariant test** với **Echidna** và **Foundry** — để máy tự tìm input phá vỡ bất biến.
- Hiểu **symbolic execution** (Mythril/Manticore) và **formal verification** (Certora) khác gì fuzzing.
- Phân loại **severity** (critical / high / medium / low / informational) theo **impact × likelihood**.

---

## 2. Lý thuyết

### 2.1 Analogy — kiểm định một chiếc cầu trước khi thông xe

Audit smart contract giống nghiệm thu một cây cầu. Bạn **không** đợi cầu sập rồi mới học. Bạn dùng nhiều lớp phòng thủ độc lập:

| Lớp kiểm định cầu | Tương đương audit contract | Tìm được gì |
|---|---|---|
| Kỹ sư đọc bản vẽ, đi bộ khảo sát | **Manual review** — đọc từng dòng logic | Lỗi logic nghiệp vụ, sai access control |
| Máy quét vết nứt bê tông tự động | **Static analysis** (Slither) | Pattern lỗi đã biết, code smell |
| Xe tải chở quá tải chạy thử ngẫu nhiên | **Fuzzing** (Echidna/Foundry) | Input bất ngờ phá vỡ bất biến |
| Chứng minh toán học tải trọng chịu được | **Formal verification** (Certora) | Bằng chứng đúng với **mọi** input |

Điểm cốt lõi: **không công cụ nào thay được công cụ khác**. Slither nhanh nhưng nông (chỉ pattern đã biết). Fuzzing sâu hơn nhưng chỉ *chưa tìm thấy* phản ví dụ — không chứng minh vắng mặt bug. Formal verification chứng minh được nhưng đắt và chỉ đúng với đúng thứ bạn *viết ra spec*. Audit tốt là **xếp chồng** các lớp này.

### 2.2 Quy trình audit chuyên nghiệp

<svg viewBox="0 0 720 150" role="img" aria-labelledby="pipe-t pipe-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="pipe-t">Quy trình audit 5 giai đoạn</title>
<desc id="pipe-d">Scoping, manual review kết hợp tooling, phân loại severity, viết report, và review bản fix</desc>
<rect x="10" y="50" width="120" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="70" y="72" text-anchor="middle" font-size="12" fill="currentColor">1. Scoping</text>
<text x="70" y="88" text-anchor="middle" font-size="10" fill="currentColor">commit, threat model</text>
<rect x="150" y="50" width="130" height="50" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="215" y="72" text-anchor="middle" font-size="12" fill="currentColor">2. Review + Tooling</text>
<text x="215" y="88" text-anchor="middle" font-size="10" fill="currentColor">manual + Slither + fuzz</text>
<rect x="300" y="50" width="120" height="50" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="72" text-anchor="middle" font-size="12" fill="currentColor">3. Triage</text>
<text x="360" y="88" text-anchor="middle" font-size="10" fill="currentColor">phân loại severity</text>
<rect x="440" y="50" width="120" height="50" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="500" y="72" text-anchor="middle" font-size="12" fill="currentColor">4. Report</text>
<text x="500" y="88" text-anchor="middle" font-size="10" fill="currentColor">finding + PoC + fix</text>
<rect x="580" y="50" width="120" height="50" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="640" y="72" text-anchor="middle" font-size="12" fill="currentColor">5. Fix review</text>
<text x="640" y="88" text-anchor="middle" font-size="10" fill="currentColor">verify bản vá</text>
<line x1="130" y1="75" x2="148" y2="75" stroke="currentColor" stroke-width="1.5" marker-end="url(#pa)"/>
<line x1="280" y1="75" x2="298" y2="75" stroke="currentColor" stroke-width="1.5" marker-end="url(#pa)"/>
<line x1="420" y1="75" x2="438" y2="75" stroke="currentColor" stroke-width="1.5" marker-end="url(#pa)"/>
<line x1="560" y1="75" x2="578" y2="75" stroke="currentColor" stroke-width="1.5" marker-end="url(#pa)"/>
<defs><marker id="pa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

1. **Scoping** — chốt **commit hash** cụ thể (audit trên code đóng băng, không phải "moving target"), liệt kê file trong scope, xác định **trust assumptions** (admin làm được gì?), **threat model** (kẻ tấn công là ai, kiểm soát được gì), và các **invariant** hệ thống phải luôn đúng.
2. **Manual review + tooling** — đọc code theo dòng vốn (data flow) và theo access control; song song chạy tool (Slither, fuzz) để lọc pattern lỗi và mở rộng độ phủ. Tool tìm *nơi để nhìn*, con người quyết định *có phải bug thật không*.
3. **Triage / severity** — mỗi phát hiện gán severity theo impact × likelihood; loại false positive.
4. **Report** — mỗi finding gồm: mô tả, **mức độ nghiêm trọng**, đoạn code, **PoC** (proof of concept — test tái hiện), tác động, và **khuyến nghị fix**.
5. **Fix review** — sau khi team vá, audit lại chính bản vá (fix thường sinh bug mới).

### 2.3 Static analysis với Slither

**Slither** (Trail of Bits) phân tích **AST + control-flow graph** của Solidity mà **không chạy** contract. Nó cực nhanh (giây), phủ ~90 detector sẵn có. Dùng để **quét lượt đầu** và **CI gate**.

```bash
# Cài (cần python + solc)
pip install slither-analyzer

# Chạy trên project Foundry/Hardhat (tự dò compile)
slither .

# Chỉ bật những detector nghiêm trọng, xuất JSON cho CI
slither . --detect reentrancy-eth,arbitrary-send-eth,unprotected-upgrade \
          --json slither-report.json

# In cây thừa kế / hàm có thể gọi công khai (hỗ trợ manual review)
slither . --print human-summary
```

Ví dụ đoạn code Slither bắt được ngay:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Vault {
    mapping(address => uint256) public balance;

    function withdraw() external {
        uint256 amount = balance[msg.sender];
        // ❌ Gửi ETH TRƯỚC khi cập nhật state → reentrancy
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
        balance[msg.sender] = 0; // cập nhật SAU → quá muộn
    }
}
```

Slither báo: `Reentrancy in Vault.withdraw()` vì **external call** (`msg.sender.call`) xảy ra **trước** khi ghi `balance[...] = 0`. Fix: theo **checks-effects-interactions** — cập nhật state trước, rồi mới gọi ngoài (hoặc thêm `ReentrancyGuard`). Lưu ý Slither hay có **false positive**: nó cảnh báo pattern, con người phải xác nhận có exploit thật không.

### 2.4 Fuzzing & invariant testing — để máy tự tìm phản ví dụ

Unit test kiểm **input bạn nghĩ ra**. Bug thường nằm ở **input bạn không nghĩ tới**. **Fuzzing** ném hàng nghìn input ngẫu nhiên; **invariant testing** đi xa hơn: gọi **chuỗi hàm ngẫu nhiên** rồi kiểm sau MỖI lần rằng một **bất biến** (invariant) vẫn đúng.

<svg viewBox="0 0 680 200" role="img" aria-labelledby="fz-t fz-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="fz-t">Invariant fuzzing</title>
<desc id="fz-d">Bộ fuzzer sinh chuỗi lời gọi hàm ngẫu nhiên và kiểm tra bất biến sau mỗi bước, nếu vi phạm thì thu nhỏ về phản ví dụ tối thiểu</desc>
<rect x="20" y="80" width="110" height="45" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="75" y="100" text-anchor="middle" font-size="12" fill="currentColor">Fuzzer</text>
<text x="75" y="116" text-anchor="middle" font-size="10" fill="currentColor">sinh call ngẫu nhiên</text>
<rect x="180" y="30" width="120" height="35" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="240" y="52" text-anchor="middle" font-size="11" fill="currentColor">deposit(x)</text>
<rect x="180" y="82" width="120" height="35" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="240" y="104" text-anchor="middle" font-size="11" fill="currentColor">withdraw(y)</text>
<rect x="180" y="134" width="120" height="35" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="240" y="156" text-anchor="middle" font-size="11" fill="currentColor">transfer(a,b)</text>
<rect x="350" y="82" width="140" height="45" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="420" y="102" text-anchor="middle" font-size="11" fill="currentColor">check invariant</text>
<text x="420" y="118" text-anchor="middle" font-size="10" fill="currentColor">sum(bal)==totalSupply</text>
<rect x="540" y="82" width="120" height="45" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="600" y="102" text-anchor="middle" font-size="11" fill="currentColor">vi phạm →</text>
<text x="600" y="118" text-anchor="middle" font-size="10" fill="currentColor">shrink phản ví dụ</text>
<line x1="130" y1="95" x2="178" y2="55" stroke="currentColor" stroke-width="1"/>
<line x1="130" y1="100" x2="178" y2="99" stroke="currentColor" stroke-width="1"/>
<line x1="130" y1="105" x2="178" y2="150" stroke="currentColor" stroke-width="1"/>
<line x1="300" y1="99" x2="348" y2="103" stroke="currentColor" stroke-width="1.5" marker-end="url(#fa)"/>
<line x1="490" y1="104" x2="538" y2="104" stroke="currentColor" stroke-width="1.5" marker-end="url(#fa)"/>
<defs><marker id="fa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Foundry invariant test** — công cụ fuzz tích hợp sẵn, viết bằng Solidity. Đây là ví dụ đầy đủ cho một token vault, kiểm bất biến "**tổng số dư từng user luôn bằng tổng tài sản contract nắm giữ**":

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

// --- Contract cần audit ---
contract Bank {
    mapping(address => uint256) public balanceOf;
    uint256 public totalDeposits;

    function deposit() external payable {
        balanceOf[msg.sender] += msg.value;
        totalDeposits += msg.value;
    }

    function withdraw(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "insufficient");
        balanceOf[msg.sender] -= amount;
        totalDeposits -= amount;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
    }
}

// --- Handler: giới hạn không gian input cho fuzzer ---
contract BankHandler is Test {
    Bank public bank;
    address[] public actors;
    uint256 public ghostDeposited; // tổng đã nạp (theo dõi độc lập)

    constructor(Bank _bank) {
        bank = _bank;
        // tránh address 0x1..0x9 (precompile) khi gửi ETH
        for (uint256 i; i < 3; i++) actors.push(address(uint160(0x1000 + i)));
    }

    function deposit(uint256 actorSeed, uint256 amount) external {
        address actor = actors[actorSeed % actors.length];
        amount = bound(amount, 0, 100 ether); // bound: ép input vào khoảng hợp lý
        vm.deal(actor, amount);
        vm.prank(actor);
        bank.deposit{value: amount}();
        ghostDeposited += amount;
    }

    function withdraw(uint256 actorSeed, uint256 amount) external {
        address actor = actors[actorSeed % actors.length];
        amount = bound(amount, 0, bank.balanceOf(actor));
        vm.prank(actor);
        bank.withdraw(amount);
        ghostDeposited -= amount;
    }
}

// --- Invariant test ---
contract BankInvariantTest is Test {
    Bank public bank;
    BankHandler public handler;

    function setUp() public {
        bank = new Bank();
        handler = new BankHandler(bank);
        // Chỉ cho fuzzer gọi qua handler (không đụng trực tiếp Bank)
        targetContract(address(handler));
    }

    // Bất biến 1: kế toán nội bộ khớp ETH thực contract giữ
    function invariant_solvency() public view {
        assertEq(address(bank).balance, bank.totalDeposits());
    }

    // Bất biến 2: sổ sách của contract khớp ghost variable của test
    function invariant_accounting() public view {
        assertEq(bank.totalDeposits(), handler.ghostDeposited());
    }
}
```

Chạy: `forge test --match-contract BankInvariantTest -vvv`. Cấu hình trong `foundry.toml`:

```toml
[invariant]
runs = 256        # số chuỗi ngẫu nhiên
depth = 128       # số lời gọi hàm mỗi chuỗi
fail_on_revert = false
```

Nếu fuzzer tìm được chuỗi phá bất biến, Foundry in ra **call sequence tối thiểu** đã shrink — chính là PoC bạn dán vào report. **Handler pattern** rất quan trọng: fuzz thẳng vào contract sẽ sinh phần lớn call bị revert (input vô nghĩa); handler dùng `bound()` và `vm.prank()` để lái fuzzer vào vùng trạng thái *có ý nghĩa*.

**Echidna** (Trail of Bits) là fuzzer chuyên dụng, mạnh hơn về coverage-guided và corpus. Bất biến viết như hàm boolean `echidna_*`:

```solidity
// echidna: property test — hàm phải LUÔN trả true
contract TestBank is Bank {
    function echidna_solvency() public view returns (bool) {
        return address(this).balance == totalDeposits;
    }
}
```

Chạy: `echidna src/TestBank.sol --contract TestBank --test-mode property`. Echidna dùng **coverage feedback** để "học" input nào khám phá nhánh mới — hiệu quả hơn fuzz thuần ngẫu nhiên với logic phức tạp.

### 2.5 Symbolic execution & formal verification

| Kỹ thuật | Cách hoạt động | Đảm bảo | Chi phí |
|---|---|---|---|
| **Fuzzing** (Echidna, Foundry) | Chạy contract với input ngẫu nhiên hướng coverage | Tìm được bug thì chắc; **không** chứng minh vắng bug | Thấp–trung |
| **Symbolic execution** (Mythril, Manticore) | Coi input là **biến symbolic**, dùng SMT solver dò từng path | Phủ path theo lý thuyết; **path explosion** với loop/state lớn | Trung |
| **Formal verification** (Certora, Halmos, K) | Chứng minh **spec** đúng với **mọi** input bằng SMT/theorem prover | Bằng chứng toán học (trong phạm vi spec) | Cao |

**Symbolic execution** thay vì thử số cụ thể thì giữ input dưới dạng công thức, đến mỗi nhánh `if` nó nhờ **SMT solver** hỏi "có giá trị nào khiến nhánh này dẫn tới `assert` sai / selfdestruct / arbitrary send không?". Mạnh nhưng gặp **path explosion**: số path bùng nổ theo số nhánh và vòng lặp.

**Formal verification** ở tầng cao nhất: bạn viết **spec** (đặc tả) — các thuộc tính phải đúng — rồi prover chứng minh code thỏa spec với **mọi** input, hoặc đưa ra **phản ví dụ**. Ví dụ **Certora CVL** (Certora Verification Language):

```cvl
// Rule: sau khi transfer, tổng cung không đổi (bảo toàn giá trị)
rule transferPreservesTotalSupply(address to, uint256 amount) {
    uint256 supplyBefore = totalSupply();
    env e;
    transfer(e, to, amount);
    uint256 supplyAfter = totalSupply();
    assert supplyAfter == supplyBefore,
        "transfer khong duoc thay doi tong cung";
}

// Invariant: tong cac balance luon bang totalSupply
invariant sumOfBalancesEqualsTotalSupply()
    sumOfBalances() == totalSupply();
```

Giới hạn cốt lõi của formal verification: **nó chỉ đúng với những gì bạn viết vào spec**. Prover xác nhận "code khớp spec" — nếu spec thiếu một thuộc tính (ví dụ quên đặc tả access control), bug vẫn lọt. Vì thế formal verification **bổ sung** chứ không thay manual review.

### 2.6 Phân loại severity

Severity = **impact** (thiệt hại nếu bị khai thác) × **likelihood** (khả năng xảy ra / độ khó exploit). Chuẩn phổ biến (Immunefi / OpenZeppelin):

| Severity | Ý nghĩa | Ví dụ |
|---|---|---|
| **Critical** | Mất/khóa vĩnh viễn tài sản người dùng, hoặc chiếm quyền toàn hệ thống | Reentrancy rút sạch vault; hàm mint không kiểm quyền |
| **High** | Mất tài sản trong điều kiện cụ thể, hoặc phá vỡ chức năng cốt lõi | Rounding cho phép rút dư trong một số path; oracle bị thao túng có điều kiện |
| **Medium** | Tác động giới hạn, cần điều kiện khó, hoặc chỉ ảnh hưởng một phần | DoS tạm thời; thiếu event gây khó off-chain accounting |
| **Low** | Rủi ro nhỏ, khó xảy ra, thiệt hại thấp | Thiếu zero-address check ở hàm ít dùng |
| **Informational** | Không phải lỗ hổng — code quality, gas, best practice | Đặt tên khó hiểu, thiếu NatSpec, tối ưu gas |

Nguyên tắc triage: **impact quyết định trần severity**, likelihood chỉ hạ xuống. Một bug "mất toàn bộ quỹ" nhưng cần admin key bị lộ vẫn có thể là High/Medium tùy trust model — luôn gắn severity với **threat model đã chốt ở scoping**.

---

## 3. Tình huống thực tế

Bạn audit một lending protocol. Trình tự thực dụng:
1. **Scoping**: chốt commit `a1b2c3`, invariant chính = "totalDebt ≤ totalCollateral × LTV" và "protocol luôn solvent".
2. **Slither** quét 2 phút → cờ 1 reentrancy nghi ngờ ở `liquidate()` và vài informational. Xác nhận reentrancy là **thật** (external call trước khi cập nhật `debt`).
3. **Foundry invariant test** với handler mô phỏng deposit/borrow/repay/liquidate ngẫu nhiên → sau 256×128 call, fuzzer phá `invariant_solvency`: một chuỗi liquidation làm rounding dồn lại khiến protocol thiếu 3 wei mỗi lần, tích lũy thành thiếu hụt lớn.
4. **Triage**: reentrancy = **Critical** (rút sạch), rounding = **High** (mất tài sản có điều kiện).
5. **Report** kèm PoC (call sequence shrink từ Foundry), khuyến nghị: checks-effects-interactions + làm tròn *có lợi cho protocol*.
6. **Fix review**: team vá, chạy lại toàn bộ test + Slither trong CI trước khi coi là đóng.

---

## 4. Tóm tắt
- Audit là **quy trình nhiều lớp**: scoping → manual review + tooling → triage severity → report (có PoC) → fix review. Không lớp nào thay được lớp khác.
- **Slither** = static analysis nhanh, bắt pattern lỗi đã biết (reentrancy, arbitrary send) — tốt cho lượt đầu và CI, nhưng có false positive.
- **Fuzzing / invariant testing** (Echidna, Foundry) để **máy tự tìm phản ví dụ**: định nghĩa **invariant**, dùng **handler** lái fuzzer vào trạng thái có nghĩa, nhận **call sequence tối thiểu** làm PoC.
- **Symbolic execution** dò path bằng SMT solver (path explosion); **formal verification** (Certora) chứng minh spec đúng với **mọi** input — mạnh nhất nhưng chỉ đúng trong phạm vi spec.
- **Severity** = impact × likelihood: critical / high / medium / low / informational — luôn gắn với threat model đã chốt.

> **Bài tiếp theo:** đi vào **các lỗ hổng smart contract kinh điển** — reentrancy, integer overflow, access control, oracle manipulation — và cách phòng thủ từng loại.
