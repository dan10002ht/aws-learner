# Bài 34 — ZK hands-on: viết circuit & verify on-chain

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **arithmetic circuit** và **R1CS** — cách một "bài toán cần chứng minh" được biến thành các ràng buộc nhân/cộng.
- Viết một **circuit Circom** chứng minh *"tôi biết preimage của một hash"* mà **không lộ** preimage.
- Chạy trọn pipeline **snarkjs**: compile → trusted setup (Powers of Tau) → sinh witness → sinh proof → verify off-chain.
- Sinh **Verifier contract Solidity** từ zkey và **verify proof on-chain**.
- Hiểu vì sao **public signal** là thứ contract nhìn thấy, còn **private signal** thì không.

> Bài này giả định bạn đã nắm khái niệm SNARK/STARK, trusted setup, completeness/soundness/zero-knowledge ở **Bài 33 (bc-30-zk-proofs)**. Ở đây ta **làm thật, chạy được**.

---

## 2. Từ "câu cần chứng minh" đến circuit

### 2.1 Analogy — chứng minh biết mật khẩu mà không đọc to nó

Bạn muốn chứng minh với người gác cổng rằng bạn **biết mật khẩu** của một cánh cửa, nhưng **không nói mật khẩu ra**. Cách ngây thơ: đọc mật khẩu → lộ. Cách ZK: cửa chỉ mở khi băm mật khẩu ra đúng một giá trị công khai `H`. Bạn chứng minh *"tồn tại `x` sao cho `hash(x) == H`, và tôi biết `x` đó"* — người gác thấy proof đúng nhưng **không học được** `x`.

Trong ZK, "cánh cửa + phép băm" phải được viết thành **một hệ phương trình đại số** trên một trường số hữu hạn (finite field). Đó chính là **arithmetic circuit**.

### 2.2 Arithmetic circuit & R1CS

Prover không chứng minh trực tiếp trên code Solidity/Python — chứng minh trên một **mạch số học** gồm các cổng **cộng** và **nhân** trên trường `F_p` (p là số nguyên tố ~254 bit của đường cong BN254). Mọi phép tính (kể cả so sánh, băm) đều phải quy về cộng/nhân trên `F_p`.

Mạch đó được "làm phẳng" thành **R1CS (Rank-1 Constraint System)**: một danh sách ràng buộc, mỗi ràng buộc có đúng **một phép nhân**:

```
(A · s) * (B · s) = (C · s)
```

`s` là **witness vector** (chứa 1, các public input, private input và mọi giá trị trung gian). `A`, `B`, `C` là các vector hệ số. Ví dụ muốn ràng buộc `y = x * x`:

- Đặt `s = [1, x, y]`
- `A·s = x`, `B·s = x`, `C·s = y` → ràng buộc `x * x = y`. 

Một phép cộng như `z = x + y` **không cần** cổng nhân riêng — nó gộp vào vector hệ số của ràng buộc khác (nhân với hằng 1). Vì thế **số ràng buộc ≈ số phép nhân**, và đây là thước đo chi phí chính của một circuit ZK: *ít phép nhân = proof nhanh, setup nhỏ*.

<svg viewBox="0 0 720 250" role="img" aria-labelledby="r1cs-t r1cs-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="r1cs-t">Từ circuit đến R1CS</title>
<desc id="r1cs-d">Mạch số học với hai cổng nhân được làm phẳng thành các ràng buộc rank-1</desc>
<rect x="30" y="40" width="120" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="67" text-anchor="middle" font-size="13" fill="currentColor">private: x</text>
<rect x="30" y="150" width="120" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="177" text-anchor="middle" font-size="13" fill="currentColor">public: H</text>
<circle cx="260" cy="85" r="26" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="260" y="90" text-anchor="middle" font-size="18" fill="currentColor">×</text>
<circle cx="380" cy="115" r="26" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="380" y="120" text-anchor="middle" font-size="18" fill="currentColor">×</text>
<line x1="150" y1="62" x2="236" y2="80" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<line x1="150" y1="72" x2="236" y2="90" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<line x1="286" y1="90" x2="356" y2="108" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<text x="255" y="150" text-anchor="middle" font-size="11" fill="currentColor">hasher(x)</text>
<rect x="470" y="90" width="220" height="80" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="580" y="118" text-anchor="middle" font-size="12" fill="currentColor">R1CS:  (A·s)*(B·s) = (C·s)</text>
<text x="580" y="140" text-anchor="middle" font-size="11" fill="currentColor">c1:  x * x   = t1</text>
<text x="580" y="158" text-anchor="middle" font-size="11" fill="currentColor">c2:  hash(x) = H  (public)</text>
<line x1="406" y1="115" x2="466" y2="120" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<defs><marker id="a2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

> **Vì sao dùng Poseidon chứ không phải SHA-256?** SHA-256 dùng phép AND/XOR/shift bit — trên `F_p` phải mô phỏng từng bit, tốn **~27.000 ràng buộc** cho một block. **Poseidon** là hàm băm *ZK-friendly*, thiết kế thuần cộng/nhân trên `F_p`, chỉ ~**200–300 ràng buộc**. Trong ZK ta gần như luôn dùng Poseidon/MiMC thay SHA/Keccak khi có thể.

---

## 3. Toàn cảnh pipeline

<svg viewBox="0 0 720 300" role="img" aria-labelledby="pipe-t pipe-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="pipe-t">Pipeline Circom + snarkjs Groth16</title>
<desc id="pipe-d">Từ file circom qua compile, trusted setup, sinh witness và proof, tới verifier off-chain và on-chain</desc>
<rect x="20" y="30" width="130" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="85" y="52" text-anchor="middle" font-size="12" fill="currentColor">preimage.circom</text>
<text x="85" y="68" text-anchor="middle" font-size="10" fill="currentColor">(bạn viết)</text>
<rect x="20" y="120" width="130" height="46" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="85" y="142" text-anchor="middle" font-size="11" fill="currentColor">.r1cs + .wasm</text>
<text x="85" y="158" text-anchor="middle" font-size="10" fill="currentColor">circom compile</text>
<rect x="20" y="210" width="130" height="46" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="85" y="232" text-anchor="middle" font-size="11" fill="currentColor">*.ptau → *.zkey</text>
<text x="85" y="248" text-anchor="middle" font-size="10" fill="currentColor">trusted setup</text>
<rect x="290" y="120" width="130" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="355" y="142" text-anchor="middle" font-size="11" fill="currentColor">witness.wtns</text>
<text x="355" y="158" text-anchor="middle" font-size="10" fill="currentColor">input.json</text>
<rect x="290" y="210" width="130" height="46" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="355" y="232" text-anchor="middle" font-size="11" fill="currentColor">proof.json</text>
<text x="355" y="248" text-anchor="middle" font-size="10" fill="currentColor">groth16 prove</text>
<rect x="560" y="120" width="140" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="630" y="142" text-anchor="middle" font-size="11" fill="currentColor">verify off-chain</text>
<text x="630" y="158" text-anchor="middle" font-size="10" fill="currentColor">snarkjs verify</text>
<rect x="560" y="210" width="140" height="46" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="630" y="232" text-anchor="middle" font-size="11" fill="currentColor">Verifier.sol</text>
<text x="630" y="248" text-anchor="middle" font-size="10" fill="currentColor">verify on-chain</text>
<line x1="85" y1="76" x2="85" y2="118" stroke="currentColor" stroke-width="1.5" marker-end="url(#a3)"/>
<line x1="85" y1="166" x2="85" y2="208" stroke="currentColor" stroke-width="1.5" marker-end="url(#a3)"/>
<line x1="150" y1="143" x2="288" y2="143" stroke="currentColor" stroke-width="1.5" marker-end="url(#a3)"/>
<line x1="150" y1="233" x2="288" y2="233" stroke="currentColor" stroke-width="1.5" marker-end="url(#a3)"/>
<line x1="355" y1="166" x2="355" y2="208" stroke="currentColor" stroke-width="1.5" marker-end="url(#a3)"/>
<line x1="420" y1="233" x2="558" y2="233" stroke="currentColor" stroke-width="1.5" marker-end="url(#a3)"/>
<line x1="420" y1="225" x2="558" y2="150" stroke="currentColor" stroke-width="1.5" marker-end="url(#a3)"/>
<defs><marker id="a3" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Ta dùng **Groth16** (SNARK, proof cực nhỏ ~200 byte, verify on-chain rẻ nhất) — đổi lại cần **trusted setup theo từng circuit**.

---

## 4. Setup dự án

```bash
mkdir zk-preimage && cd zk-preimage
npm init -y
# circom compiler (cài binary hoặc qua cargo); snarkjs + thư viện chuẩn
npm i -g snarkjs
npm i circomlib circomlibjs
circom --version   # cần >= 2.1.x
```

`circomlib` chứa sẵn template **Poseidon**. Ta include từ `node_modules/circomlib`.

---

## 5. Viết circuit chứng minh biết preimage

Tạo file `preimage.circom`:

```circom
pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";

// Chứng minh: "Tôi biết `preimage` sao cho Poseidon(preimage) == hash"
// mà KHÔNG lộ preimage.
template PreimageKnowledge() {
    signal input preimage;   // PRIVATE — bí mật, không bao giờ ra khỏi máy prover
    signal input hash;       // PUBLIC  — giá trị hash công khai, contract sẽ thấy

    // Poseidon với 1 phần tử đầu vào
    component hasher = Poseidon(1);
    hasher.inputs[0] <== preimage;

    // Ràng buộc: hash tính được PHẢI bằng hash công khai.
    // `===` sinh một ràng buộc R1CS; nếu prover nhập sai preimage,
    // ràng buộc không thoả và KHÔNG thể sinh proof hợp lệ.
    hash === hasher.out;
}

// `public [hash]` khai báo `hash` là public input.
// Mặc định các signal input khác (preimage) là PRIVATE.
component main { public [hash] } = PreimageKnowledge();
```

Vài điểm cốt lõi:
- `<==` vừa **gán** vừa **thêm ràng buộc** (đảm bảo `hasher.inputs[0]` đúng bằng `preimage`).
- `===` chỉ **thêm ràng buộc bằng nhau**, không gán.
- Cái gì là **public** thì verifier phải biết trước; cái gì **private** thì proof che kín. Ở đây `hash` public, `preimage` private — đúng yêu cầu.

Compile:

```bash
circom preimage.circom --r1cs --wasm --sym -l ./node_modules
# Sinh ra:
#   preimage.r1cs                 (hệ ràng buộc)
#   preimage_js/preimage.wasm     (để tính witness)
#   preimage.sym                  (map tên signal, để debug)

snarkjs r1cs info preimage.r1cs
# In số constraints / public / private inputs — kiểm tra circuit "nhỏ" như mong đợi
```

---

## 6. Tính `hash` công khai (off-chain)

Prover cần biết trước giá trị `hash = Poseidon(preimage)` để đưa vào public input. Dùng `circomlibjs` để tính đúng cùng thuật toán:

```js
// hash.mjs — chạy: node hash.mjs
import { buildPoseidon } from "circomlibjs";
import { writeFileSync } from "fs";

const preimage = 12345n;                 // bí mật của bạn
const poseidon = await buildPoseidon();
const h = poseidon([preimage]);
const hash = poseidon.F.toString(h);     // -> chuỗi số thập phân trên F_p

console.log("hash =", hash);
writeFileSync(
  "input.json",
  JSON.stringify({ preimage: preimage.toString(), hash }, null, 2)
);
```

File `input.json` sinh ra (ví dụ):

```json
{
  "preimage": "12345",
  "hash": "7745347407057689526183055865423022106242580041776795193749450300463033476985"
}
```

---

## 7. Trusted setup (Powers of Tau + Groth16)

Groth16 cần một tham số tin cậy. Gồm **Phase 1** (universal, độc lập circuit) và **Phase 2** (theo đúng circuit này).

```bash
# --- Phase 1: Powers of Tau (universal) ---
# 2^12 = 4096 constraints là đủ cho circuit nhỏ này; circuit lớn tăng số mũ.
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau \
  --name="dong gop 1" -v -e="entropy ngau nhien tuy y"
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v

# --- Phase 2: theo circuit ---
snarkjs groth16 setup preimage.r1cs pot12_final.ptau preimage_0000.zkey
snarkjs zkey contribute preimage_0000.zkey preimage_final.zkey \
  --name="dong gop zkey" -v -e="them entropy nua"

# Xuất verification key (để verify off-chain)
snarkjs zkey export verificationkey preimage_final.zkey verification_key.json
```

> **Cảnh báo bảo mật thật sự:** entropy trong `contribute` là **toxic waste**. Nếu ai đó biết toàn bộ entropy của mọi contributor, họ có thể **giả mạo proof**. Với production, dùng **ceremony nhiều bên** (mỗi bên góp entropy rồi *xoá*) — chỉ cần **một** bên trung thực là an toàn. Đừng commit các file `.ptau/.zkey` trung gian kèm entropy vào repo.

---

## 8. Sinh witness & proof

```bash
# 1) Tính witness từ input.json bằng wasm
node preimage_js/generate_witness.js \
  preimage_js/preimage.wasm input.json witness.wtns

# 2) Sinh proof Groth16
snarkjs groth16 prove preimage_final.zkey witness.wtns proof.json public.json

# 3) Verify off-chain (nhanh, kiểm tra trước khi lên chain)
snarkjs groth16 verify verification_key.json public.json proof.json
# -> [INFO]  snarkJS: OK!
```

- `proof.json`: proof ~200 byte (các điểm `pi_a`, `pi_b`, `pi_c` trên đường cong).
- `public.json`: **mảng public signal** — ở đây chỉ có `hash`. Đây là thứ **duy nhất** verifier biết; `preimage` không xuất hiện ở đâu cả.

Thử nghịch để thấy **soundness**: sửa `preimage` trong `input.json` thành số khác (không khớp `hash`) rồi chạy lại từ bước witness — `generate_witness` sẽ **báo lỗi Assert Failed** vì ràng buộc `hash === hasher.out` không thoả. Không có cách sinh proof hợp lệ nếu bạn không thực sự biết preimage.

---

## 9. Sinh Verifier contract & verify on-chain

```bash
snarkjs zkey export solidityverifier preimage_final.zkey Verifier.sol
```

Lệnh trên sinh `Verifier.sol` chứa contract `Groth16Verifier` với hàm:

```solidity
function verifyProof(
    uint[2] calldata _pA,
    uint[2][2] calldata _pB,
    uint[2] calldata _pC,
    uint[1] calldata _pubSignals   // độ dài = số public signal (ở đây 1 = hash)
) public view returns (bool)
```

Nó thực hiện một **pairing check** trên đường cong BN254 bằng precompile `0x08` của EVM — verify tốn ~**200k–250k gas**, không phụ thuộc kích thước circuit (đặc trưng đẹp của Groth16).

### 9.1 Lấy calldata đúng định dạng

```bash
snarkjs generatecall
# In ra sẵn: _pA, _pB, _pC, _pubSignals để dán vào verifyProof
```

### 9.2 Contract ứng dụng — "gate" mở khi proof hợp lệ

Đừng chỉ verify suông; hãy dùng proof để **mở khoá một hành động**. Ví dụ: chỉ ai chứng minh biết preimage của `expectedHash` mới được `claim()`.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVerifier {
    function verifyProof(
        uint[2] calldata pA,
        uint[2][2] calldata pB,
        uint[2] calldata pC,
        uint[1] calldata pubSignals
    ) external view returns (bool);
}

contract SecretGate {
    IVerifier public immutable verifier;
    uint256 public immutable expectedHash;   // hash công khai, set khi deploy
    mapping(bytes32 => bool) public used;     // chống replay proof

    event Claimed(address indexed who);

    constructor(address _verifier, uint256 _expectedHash) {
        verifier = IVerifier(_verifier);
        expectedHash = _expectedHash;
    }

    function claim(
        uint[2] calldata pA,
        uint[2][2] calldata pB,
        uint[2] calldata pC,
        uint[1] calldata pubSignals
    ) external {
        // 1) public signal do prover khai PHẢI khớp hash on-chain
        require(pubSignals[0] == expectedHash, "wrong public hash");

        // 2) proof phải hợp lệ về mặt mật mã
        require(verifier.verifyProof(pA, pB, pC, pubSignals), "invalid proof");

        // 3) chống replay: cùng một proof không dùng lại được
        bytes32 id = keccak256(abi.encode(pA, pB, pC));
        require(!used[id], "proof used");
        used[id] = true;

        emit Claimed(msg.sender);
        // ... trao thưởng / mint / mở quyền ở đây
    }
}
```

Hai kiểm tra **bắt buộc** mà người mới hay quên:
1. **`pubSignals` phải bị ràng buộc bởi contract** (`== expectedHash`). Nếu bỏ, prover tự chọn `hash` bất kỳ rồi chứng minh biết preimage của *hash do họ tự bịa* — proof vẫn "hợp lệ" nhưng vô nghĩa với bài toán của bạn.
2. **Chống replay**. Proof là dữ liệu công khai trên mempool; ai copy được cũng gọi lại `claim`. Đánh dấu `used`, hoặc nhúng `msg.sender`/nonce làm public signal trong circuit (an toàn hơn — gắn proof với đúng người gọi).

### 9.3 Test bằng Foundry

```solidity
// test/SecretGate.t.sol
// forge test -vvv
import "forge-std/Test.sol";
import "../src/Verifier.sol";      // Groth16Verifier do snarkjs sinh
import "../src/SecretGate.sol";

contract SecretGateTest is Test {
    Groth16Verifier verifier;
    SecretGate gate;

    // Dán từ `snarkjs generatecall`
    uint256 constant EXPECTED_HASH =
        7745347407057689526183055865423022106242580041776795193749450300463033476985;
    uint[2] pA = [/* ... */];
    uint[2][2] pB = [[/* */],[/* */]];
    uint[2] pC = [/* ... */];

    function setUp() public {
        verifier = new Groth16Verifier();
        gate = new SecretGate(address(verifier), EXPECTED_HASH);
    }

    function test_ClaimWithValidProof() public {
        uint[1] memory pub = [EXPECTED_HASH];
        gate.claim(pA, pB, pC, pub);          // pass
    }

    function test_RevertOnReplay() public {
        uint[1] memory pub = [EXPECTED_HASH];
        gate.claim(pA, pB, pC, pub);
        vm.expectRevert("proof used");
        gate.claim(pA, pB, pC, pub);          // proof đã dùng
    }
}
```

---

## 10. Circom vs Noir (một lựa chọn khác)

Cùng bài toán có thể viết bằng **Noir** (Aztec) — cú pháp giống Rust, không cần trusted setup theo circuit (backend Barretenberg dùng PLONK/UltraHonk universal setup):

```rust
// src/main.nr  — nargo prove / nargo verify
fn main(preimage: Field, hash: pub Field) {
    let computed = std::hash::poseidon::bn254::hash_1([preimage]);
    assert(computed == hash);
}
```

| Tiêu chí | Circom + snarkjs (Groth16) | Noir + bb (PLONK/Honk) |
|----------|----------------------------|------------------------|
| **Cú pháp** | DSL riêng, tư duy "signal & constraint" | Giống Rust, thân thiện dev |
| **Trusted setup** | Per-circuit (phải chạy phase 2 lại mỗi khi đổi circuit) | Universal (1 lần cho mọi circuit) |
| **Proof size / gas verify** | Nhỏ nhất (~200B, ~200k gas) | Lớn hơn đôi chút |
| **Hệ sinh thái on-chain** | Rất phổ biến (Tornado, Semaphore, zkSync) | Đang lớn nhanh |

Nguyên tắc: **Groth16 khi verify on-chain nhiều lần cùng một circuit cố định** (proof/gas nhỏ nhất bù cho setup); **Noir/PLONK khi circuit hay đổi** hoặc muốn tránh ceremony per-circuit.

---

## 11. Bẫy thường gặp

- **Non-deterministic input**: mọi giá trị đưa vào circuit phải là phần tử `F_p` hợp lệ (số nguyên < p). Nhập số âm/định dạng sai → witness lỗi.
- **Quên ràng buộc public signal on-chain**: proof hợp lệ ≠ đúng bài toán của bạn (mục 9.2).
- **Under-constrained circuit**: dùng `<--` (gán không ràng buộc) mà quên thêm `===` → prover có thể nhét giá trị gian lận. Luôn ưu tiên `<==`.
- **Dùng SHA/Keccak trong circuit**: bùng nổ số constraint. Dùng Poseidon/MiMC trừ khi **bắt buộc** phải khớp một hash đã tồn tại on-chain.
- **Trusted setup ẩu**: entropy lộ = giả mạo được proof. Production luôn dùng ceremony nhiều bên đã kiểm toán.

---

## 12. Tóm tắt
- Mọi ZK circuit đều quy về **R1CS**: các ràng buộc `(A·s)*(B·s)=(C·s)`, chi phí ≈ **số phép nhân** → dùng hàm băm **ZK-friendly (Poseidon)**.
- Circom biến câu *"tôi biết preimage sao cho Poseidon(x)=hash"* thành circuit; `public [hash]` lộ hash, giữ **preimage private**.
- Pipeline snarkjs: **compile → Powers of Tau → groth16 setup → witness → prove → verify**; `snarkjs generatecall` cho calldata on-chain.
- `snarkjs zkey export solidityverifier` sinh **Groth16Verifier**; verify on-chain ~200k gas nhờ pairing precompile, **độc lập kích thước circuit**.
- Contract ứng dụng phải **ràng buộc public signal** và **chống replay** — verify hợp lệ chỉ là điều kiện cần.
- **Trusted setup** là điểm tin cậy nhạy cảm nhất của Groth16; Noir/PLONK đổi setup universal lấy proof/gas lớn hơn.

> **Bài tiếp theo (Bài 35 — bc-32-advanced-crypto):** mật mã nâng cao làm nền cho ZK hiện đại — **polynomial commitment (KZG)**, MPC, threshold signature và **BLS aggregation**.
