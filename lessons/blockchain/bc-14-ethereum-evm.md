# Bài 14 — Ethereum: Account model, EVM, gas & opcode

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân biệt **EOA** (Externally Owned Account) vs **contract account** — điểm mấu chốt khác Bitcoin.
- Giải thích **world state** là gì, được lưu trong **Merkle Patricia Trie** ra sao, và vì sao mỗi block chỉ cần 1 **state root**.
- Hiểu **EVM** như một **stack machine** 256-bit: opcode, stack, memory, storage khác nhau thế nào.
- Tính được **gas** của một transaction, và bóc tách phí theo **EIP-1559** (base fee + priority tip + max fee).
- Kể lại **vòng đời một transaction** từ lúc ký đến khi finalized.
- Trả lời câu hỏi bản chất: **vì sao gas tồn tại** — nó chống spam và giải bài **halting problem** thế nào.

---

## 2. Lý thuyết

### 2.1 Từ Bitcoin (UTXO) sang Ethereum (account)

Bitcoin ghi sổ theo mô hình **UTXO** — sổ cái là một tập các "tờ tiền chưa tiêu". Ethereum chọn mô hình **account-based**, giống **sổ tài khoản ngân hàng**: mỗi tài khoản có một **số dư** (balance), tiêu tiền là **trừ số dư người gửi, cộng số dư người nhận**. Mô hình này trực giác hơn cho lập trình và là nền tảng cho **smart contract có trạng thái lâu dài** (persistent state).

Ethereum có **hai loại account**, phân biệt tuyệt đối:

| Tiêu chí | EOA (Externally Owned Account) | Contract account |
|----------|-------------------------------|------------------|
| **Điều khiển bởi** | Một **private key** (con người / ví) | **Code** (bytecode chạy trên EVM) |
| **Có code không?** | Không (`codeHash` = hash rỗng) | Có (bytecode cố định) |
| **Có storage không?** | Không | Có (key-value 256-bit) |
| **Khởi tạo transaction?** | **Có** — chỉ EOA mới ký & gửi tx được | Không tự khởi tạo; chỉ **phản ứng** khi bị gọi |
| **Địa chỉ sinh ra từ** | public key (20 byte cuối của Keccak-256) | `keccak256(sender, nonce)` (hoặc CREATE2) |

> Chốt quan trọng: **mọi thứ trên Ethereum đều bắt đầu bằng một EOA ký transaction.** Contract không tự chạy — nó "ngủ" cho đến khi có ai đó (EOA, hoặc contract khác trong cùng một tx) gọi vào. Không có "cron job" trên chain.

Mỗi account gồm 4 trường trong state:

```text
account = {
  nonce:       số tx đã gửi (EOA) / số contract đã tạo (contract account)
  balance:     số dư tính bằng wei (1 ETH = 10^18 wei)
  storageRoot: root hash của trie chứa storage của contract
  codeHash:    hash của bytecode (EOA = hash của chuỗi rỗng)
}
```

**`nonce`** rất quan trọng: nó là bộ đếm tăng dần cho mỗi EOA, đảm bảo **thứ tự tx** và **chống replay** (không thể phát lại một tx cũ vì nonce đã dùng).

### 2.2 World state & Merkle Patricia Trie

"Trạng thái" của Ethereum tại một thời điểm = **ánh xạ từ mọi địa chỉ 20-byte → account** ở trên. Đây gọi là **world state**. Vấn đề: có hàng trăm triệu account — làm sao để (1) một node nhẹ chứng minh "account X có balance Y" mà không tải cả state, và (2) cả mạng đồng thuận state chỉ bằng **một hash duy nhất**?

Lời giải: **Merkle Patricia Trie (MPT)** — lai giữa **Merkle tree** (mỗi node được băm, gộp lên root) và **Patricia/radix trie** (cây tiền tố nén, tra cứu theo key). Mỗi block header chứa một **`stateRoot`** — root hash của MPT toàn bộ world state.

<svg viewBox="0 0 700 300" role="img" aria-labelledby="mpt-t mpt-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="mpt-t">Block header trỏ tới ba trie qua các root hash</title>
<desc id="mpt-d">Header chứa stateRoot, transactionsRoot, receiptsRoot; stateRoot là gốc của Merkle Patricia Trie ánh xạ địa chỉ sang account</desc>
<rect x="250" y="20" width="200" height="70" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="44" text-anchor="middle" font-size="13" fill="currentColor">Block header</text>
<text x="350" y="64" text-anchor="middle" font-size="11" fill="currentColor">stateRoot · txRoot · receiptsRoot</text>
<text x="350" y="80" text-anchor="middle" font-size="11" fill="currentColor">parentHash · number · gasUsed ...</text>
<line x1="300" y1="90" x2="150" y2="140" stroke="currentColor" stroke-width="1.5" marker-end="url(#mah)"/>
<line x1="350" y1="90" x2="350" y2="140" stroke="currentColor" stroke-width="1.5" marker-end="url(#mah)"/>
<line x1="400" y1="90" x2="550" y2="140" stroke="currentColor" stroke-width="1.5" marker-end="url(#mah)"/>
<rect x="90" y="140" width="120" height="40" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="150" y="165" text-anchor="middle" font-size="11" fill="currentColor">State trie</text>
<rect x="290" y="140" width="120" height="40" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="165" text-anchor="middle" font-size="11" fill="currentColor">Tx trie</text>
<rect x="490" y="140" width="120" height="40" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="550" y="165" text-anchor="middle" font-size="11" fill="currentColor">Receipts trie</text>
<line x1="150" y1="180" x2="90" y2="230" stroke="currentColor" stroke-width="1" marker-end="url(#mah)"/>
<line x1="150" y1="180" x2="210" y2="230" stroke="currentColor" stroke-width="1" marker-end="url(#mah)"/>
<rect x="40" y="230" width="110" height="46" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="250" text-anchor="middle" font-size="10" fill="currentColor">0xAB..→ account</text>
<text x="95" y="266" text-anchor="middle" font-size="10" fill="currentColor">nonce/balance...</text>
<rect x="160" y="230" width="110" height="46" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="215" y="250" text-anchor="middle" font-size="10" fill="currentColor">0xCD..→ account</text>
<text x="215" y="266" text-anchor="middle" font-size="10" fill="currentColor">+ storageRoot</text>
<text x="425" y="270" text-anchor="middle" font-size="11" fill="currentColor">Đổi 1 account → đổi các hash dọc đường lên → stateRoot mới</text>
<defs><marker id="mah" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Ba tính chất khiến MPT là "xương sống" của Ethereum:
- **Authenticated**: chỉ cần `stateRoot`, ta chứng minh được "account X có balance Y" bằng một **Merkle proof** ngắn (chuỗi hash từ leaf lên root). Đây là nền tảng của **light client**.
- **Deterministic**: cùng một tập account luôn cho cùng một `stateRoot` — mọi node độc lập tính ra cùng một root, đó là cách họ đồng thuận state.
- **Efficient update**: đổi một account chỉ cần băm lại các node **dọc theo đường** từ leaf đó lên root — O(log n), không phải băm lại toàn bộ.

Ngoài state trie, mỗi block còn có **transactions trie** và **receipts trie** (log/kết quả của mỗi tx). Cả ba root đều nằm trong block header.

### 2.3 EVM — cỗ máy stack 256-bit

**EVM (Ethereum Virtual Machine)** là một **máy ảo stack-based, tất định (deterministic)**: cùng input + cùng state → mọi node cho cùng output. Nó là "CPU thế giới" mà mọi contract chạy trên đó. Đặc điểm cốt lõi:

- **Word size = 256-bit (32 byte)** — chọn để khớp với output của Keccak-256 và số học đường cong elliptic. Đây là lý do `uint256` là kiểu "gốc" trong Solidity.
- **Stack machine**: không có thanh ghi tên. Opcode lấy toán hạng từ **đỉnh stack**, đẩy kết quả lại lên stack. Stack tối đa **1024 phần tử**.
- Ba vùng dữ liệu **khác nhau về vòng đời và chi phí**:

| Vùng | Vòng đời | Chi phí | Ví dụ opcode |
|------|----------|---------|--------------|
| **Stack** | Trong 1 lần thực thi | Rất rẻ (~3 gas) | `PUSH1`, `ADD`, `DUP1`, `SWAP1` |
| **Memory** | Trong 1 lần thực thi, xóa khi xong; mảng byte tuyến tính, có thể mở rộng | Rẻ, nhưng tăng bậc hai khi mở rộng | `MLOAD`, `MSTORE` |
| **Storage** | **Bền vững** — ghi vào world state, còn mãi | **Rất đắt** (`SSTORE` tới 20.000 gas cho slot mới) | `SLOAD`, `SSTORE` |

> Bài học tối ưu gas quan trọng nhất: **storage đắt hơn memory hàng nghìn lần**. Vì storage ghi vào MPT và mọi node phải lưu vĩnh viễn, nên EVM tính phí rất cao. "Đọc/ghi biến state" trong Solidity chính là `SLOAD`/`SSTORE`.

**Opcode** là các lệnh 1-byte của EVM (tổng ~140 lệnh). Ví dụ đọc một đoạn bytecode:

```text
Bytecode:  60 05 60 03 01
Giải mã & thực thi:
  60 05   PUSH1 0x05   → stack: [5]
  60 03   PUSH1 0x03   → stack: [5, 3]
  01      ADD          → pop 5,3; push 8 → stack: [8]
```

Đây chính là `5 + 3`. Solidity compiler biên dịch code của bạn thành chuỗi opcode như vậy; EVM là interpreter thực thi từng byte. Một số nhóm opcode đáng nhớ: số học (`ADD`, `MUL`, `DIV`), so sánh/logic (`LT`, `EQ`, `AND`), môi trường (`CALLER`, `CALLVALUE`, `ADDRESS`), storage (`SLOAD`, `SSTORE`), điều khiển luồng (`JUMP`, `JUMPI`), gọi contract (`CALL`, `DELEGATECALL`, `STATICCALL`), và kết thúc (`RETURN`, `REVERT`, `SELFDESTRUCT`).

### 2.4 Gas — đơn vị đo "công" của EVM

Mỗi opcode có một **giá gas cố định** phản ánh chi phí tài nguyên (CPU, băng thông, và đặc biệt là **dung lượng lưu trữ vĩnh viễn** mà cả mạng phải gánh). Vài ví dụ:

| Opcode / thao tác | Gas | Ý nghĩa |
|-------------------|-----|---------|
| `ADD`, `SUB` | 3 | số học đơn giản |
| `MUL` | 5 | nhân |
| `SLOAD` | 2.100 (cold) / 100 (warm) | đọc storage |
| `SSTORE` (slot 0 → khác 0) | 22.100 | tạo slot storage mới |
| `SSTORE` (đổi giá trị đã có) | 5.000 | cập nhật slot |
| `CREATE` | 32.000 | tạo contract mới |
| **base cost mỗi tx** | 21.000 | phí cố định để đưa tx vào chain |

**Gas** tách bạch với **giá tiền**: gas đo **lượng công** (bất biến theo giá ETH), còn **gas price** (tính bằng gwei = 10⁹ wei) là **giá mỗi đơn vị gas** người dùng trả. Phí = `gas dùng × gas price`.

Ba con số người dùng cần phân biệt:
- **`gasUsed`**: lượng gas thực tế tiêu thụ khi thực thi (do EVM cộng dồn).
- **`gasLimit`** (của tx): **trần** gas bạn cho phép tx tiêu. Nếu thực thi vượt trần → **out of gas**, tx **revert** (mọi thay đổi state bị hoàn tác) **nhưng gas vẫn mất** (đã tiêu tài nguyên của validator).
- **block `gasLimit`**: tổng gas tối đa mọi tx trong 1 block — giới hạn kích thước block (Ethereum ~30 triệu gas/block, target 15 triệu).

### 2.5 EIP-1559 — base fee + priority tip

Trước 2021, Ethereum dùng **đấu giá kiểu first-price**: ai trả gas price cao hơn thì tx được ưu tiên → phí biến động dữ dội, người dùng hay trả hớ. **EIP-1559** (tháng 8/2021, hard fork London) thiết kế lại phí thành hai phần:

- **Base fee**: mức phí **giao thức tự tính** cho mỗi đơn vị gas, dựa trên độ đầy của block trước. Block đầy hơn target (15M) → base fee **tăng** ~12,5% cho block sau; ít hơn target → **giảm**. Điều đặc biệt: **base fee bị đốt (burn)** — không vào túi validator, làm giảm cung ETH.
- **Priority fee (tip)**: khoản thưởng thêm người dùng trả **trực tiếp cho validator** để được ưu tiên đưa vào block.

Người dùng đặt hai tham số trong tx:
- **`maxFeePerGas`**: giá tối đa mỗi gas sẵn sàng trả (bao gồm cả base + tip).
- **`maxPriorityFeePerGas`**: tip tối đa cho validator.

Phí thực tế mỗi gas = `base fee + min(maxPriorityFeePerGas, maxFeePerGas − base fee)`, và người dùng **được hoàn** phần dư `maxFeePerGas − (base fee + tip)`.

<svg viewBox="0 0 640 260" role="img" aria-labelledby="fee-t fee-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="fee-t">Phân rã phí theo EIP-1559</title>
<desc id="fee-d">maxFeePerGas gồm base fee bị đốt cộng tip cho validator và phần dư được hoàn lại</desc>
<rect x="60" y="40" width="140" height="180" rx="8" fill="none" stroke="currentColor" stroke-dasharray="4 4"/>
<text x="130" y="30" text-anchor="middle" font-size="12" fill="currentColor">maxFeePerGas</text>
<rect x="70" y="150" width="120" height="60" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="130" y="176" text-anchor="middle" font-size="11" fill="currentColor">base fee</text>
<text x="130" y="194" text-anchor="middle" font-size="10" fill="currentColor">(bị ĐỐT)</text>
<rect x="70" y="95" width="120" height="50" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="130" y="116" text-anchor="middle" font-size="11" fill="currentColor">priority tip</text>
<text x="130" y="132" text-anchor="middle" font-size="10" fill="currentColor">(→ validator)</text>
<rect x="70" y="48" width="120" height="42" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="130" y="66" text-anchor="middle" font-size="11" fill="currentColor">phần dư</text>
<text x="130" y="82" text-anchor="middle" font-size="10" fill="currentColor">(hoàn lại)</text>
<line x1="230" y1="180" x2="330" y2="180" stroke="currentColor" stroke-width="1.5" marker-end="url(#fah)"/>
<line x1="230" y1="120" x2="330" y2="120" stroke="currentColor" stroke-width="1.5" marker-end="url(#fah)"/>
<text x="470" y="150" text-anchor="middle" font-size="11" fill="currentColor">Phí trả = base fee + tip</text>
<text x="470" y="172" text-anchor="middle" font-size="11" fill="currentColor">Validator nhận: chỉ tip</text>
<text x="470" y="194" text-anchor="middle" font-size="11" fill="currentColor">Mạng đốt: base fee</text>
<text x="470" y="100" text-anchor="middle" font-size="11" fill="currentColor">Base fee tự điều chỉnh</text>
<text x="470" y="122" text-anchor="middle" font-size="11" fill="currentColor">theo độ đầy block</text>
<defs><marker id="fah" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Ví dụ tính phí** một lần chuyển ETH đơn giản (21.000 gas):

```text
gasUsed             = 21000
base fee            = 20 gwei
maxPriorityFeePerGas= 2  gwei   (tip)
maxFeePerGas        = 30 gwei   (trần)

phí mỗi gas = base(20) + tip(2) = 22 gwei   (22 < 30, hợp lệ)
tổng phí    = 21000 × 22 gwei = 462_000 gwei = 0.000462 ETH
  → 21000 × 20 gwei = 0.00042 ETH bị ĐỐT
  → 21000 × 2  gwei = 0.000042 ETH cho validator
  → phần dư (30−22)×21000 được hoàn lại cho người gửi
```

### 2.6 Vòng đời một transaction

<svg viewBox="0 0 700 210" role="img" aria-labelledby="tx-t tx-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="tx-t">Vòng đời một transaction Ethereum</title>
<desc id="tx-d">Từ ký, phát tán vào mempool, được validator chọn, thực thi trên EVM, đóng block, đến finalized</desc>
<rect x="20" y="80" width="95" height="50" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="67" y="102" text-anchor="middle" font-size="11" fill="currentColor">1. Ký tx</text>
<text x="67" y="118" text-anchor="middle" font-size="10" fill="currentColor">(private key)</text>
<rect x="145" y="80" width="95" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="192" y="102" text-anchor="middle" font-size="11" fill="currentColor">2. Mempool</text>
<text x="192" y="118" text-anchor="middle" font-size="10" fill="currentColor">P2P broadcast</text>
<rect x="270" y="80" width="95" height="50" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="317" y="99" text-anchor="middle" font-size="11" fill="currentColor">3. Validator</text>
<text x="317" y="115" text-anchor="middle" font-size="10" fill="currentColor">chọn theo tip</text>
<rect x="395" y="80" width="95" height="50" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="442" y="99" text-anchor="middle" font-size="11" fill="currentColor">4. EVM chạy</text>
<text x="442" y="115" text-anchor="middle" font-size="10" fill="currentColor">đổi state</text>
<rect x="520" y="80" width="75" height="50" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="557" y="99" text-anchor="middle" font-size="11" fill="currentColor">5. Block</text>
<text x="557" y="115" text-anchor="middle" font-size="10" fill="currentColor">included</text>
<rect x="620" y="80" width="60" height="50" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="650" y="99" text-anchor="middle" font-size="11" fill="currentColor">6. Final</text>
<text x="650" y="115" text-anchor="middle" font-size="10" fill="currentColor">~2 epoch</text>
<line x1="115" y1="105" x2="143" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#tah)"/>
<line x1="240" y1="105" x2="268" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#tah)"/>
<line x1="365" y1="105" x2="393" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#tah)"/>
<line x1="490" y1="105" x2="518" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#tah)"/>
<line x1="595" y1="105" x2="618" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#tah)"/>
<text x="350" y="175" text-anchor="middle" font-size="11" fill="currentColor">Nếu out-of-gas hoặc revert ở bước 4: state hoàn tác về trước tx, nhưng gas đã tiêu KHÔNG được hoàn</text>
<defs><marker id="tah" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

1. **Ký**: ví dùng **private key** ký tx (gồm `to`, `value`, `data`, `nonce`, `gasLimit`, `maxFeePerGas`, `maxPriorityFeePerGas`, `chainId`).
2. **Mempool**: tx phát tán qua mạng P2P, nằm trong mempool chờ.
3. **Chọn**: validator được phân công tạo block **ưu tiên tx có tip cao**, sắp theo nonce của mỗi sender.
4. **Thực thi**: EVM chạy tx, cập nhật world state (`stateRoot` mới), cộng dồn `gasUsed`. Revert/out-of-gas → hoàn tác state, vẫn tính phí.
5. **Included**: tx nằm trong block đề xuất; block phát ra mạng, các validator khác **attest**.
6. **Finalized**: sau ~2 epoch (~12–13 phút với PoS Ethereum) block đạt **finality** — coi như không thể đảo ngược.

### 2.7 Vì sao gas tồn tại — spam & halting problem

Đây là câu hỏi bản chất. Có **hai lý do sâu**:

**(a) Chống spam & định giá tài nguyên.** EVM chạy trên **hàng chục nghìn node** — mỗi opcode bạn thực thi là công việc **cả mạng phải làm và lưu lại**. Nếu tính toán miễn phí, kẻ tấn công có thể phát tán vô số tx nặng làm nghẽn mạng. Gas biến **mỗi thao tác thành có giá**, buộc kẻ spam phải **trả tiền tỉ lệ thuận với tài nguyên tiêu tốn** → tấn công trở nên đắt đỏ đến mức phi lý.

**(b) Giải bài halting problem.** EVM là **Turing-complete** — nó có vòng lặp, rẽ nhánh. Về lý thuyết, không tồn tại thuật toán tổng quát để biết trước một chương trình **có dừng hay lặp vô hạn** không (halting problem, Turing 1936). Nếu một contract chứa `while(true){}`, validator sẽ kẹt mãi mãi và cả mạng đứng hình.

Ethereum **không cố giải** halting problem (bất khả) — nó **né** bằng gas: mỗi opcode trừ dần từ `gasLimit`, **hết gas thì EVM dừng cưỡng bức** và revert. Vòng lặp vô hạn chỉ chạy được đến khi cháy hết gas rồi chết. Nói cách khác:

> **Gas biến "chương trình có dừng không?" (bất khả quyết) thành "chương trình có dừng trong N đơn vị gas không?" (luôn quyết định được).** Đó là lý do triết học sâu nhất khiến gas không thể thiếu — không có nó, EVM Turing-complete là bất khả thi trên mạng phi tập trung.

Hệ quả thực tế: mọi tx **bắt buộc** khai `gasLimit`, và validator luôn có bảo đảm rằng thực thi sẽ **kết thúc trong hữu hạn bước**.

---

## 3. Tình huống thực tế: đọc một tx trên explorer

Khi bạn xem một tx trên Etherscan, các trường ánh xạ thẳng vào bài này:

```text
Status:            Success                (không revert, không out-of-gas)
From:              0xAbc... (EOA)          ← chỉ EOA khởi tạo được
To:                0xDef... (contract)     ← gọi vào contract account
Value:             0.5 ETH                 ← trường value, đơn vị wei
Transaction Fee:   0.00231 ETH             ← gasUsed × (base+tip)
Gas Used:          105,000                 ← EVM cộng dồn theo opcode
Gas Limit:         120,000                 ← trần bạn đặt; dư được không tính phí
Base Fee:          20 gwei (Burnt)         ← EIP-1559, bị đốt
Priority Fee:      1.5 gwei                ← tip cho validator
Nonce:             42                      ← tx thứ 43 của EOA này
```

Đọc được bảng này là bạn đã nắm trọn account model + gas + EIP-1559.

---

## 4. Tóm tắt
- Ethereum dùng **account model** (không phải UTXO): hai loại account — **EOA** điều khiển bằng **private key** và khởi tạo mọi tx; **contract account** điều khiển bằng **code**, chỉ chạy khi được gọi.
- Mỗi account có `nonce, balance, storageRoot, codeHash`. Toàn bộ ánh xạ địa chỉ→account là **world state**, cô đọng thành một **`stateRoot`** duy nhất qua **Merkle Patricia Trie** — cho phép Merkle proof, tính tất định, cập nhật O(log n).
- **EVM** là **stack machine 256-bit** thực thi **opcode**. Ba vùng dữ liệu: **stack** & **memory** (tạm, rẻ) vs **storage** (bền, rất đắt vì cả mạng lưu mãi).
- **Gas** đo **công**, tách khỏi **gas price** (giá tiền). **EIP-1559**: phí = **base fee (bị đốt)** + **priority tip (cho validator)**, người dùng đặt `maxFeePerGas`/`maxPriorityFeePerGas`.
- Out-of-gas / revert → **hoàn tác state nhưng vẫn mất gas**.
- Gas tồn tại vì hai lý do: **chống spam** (định giá tài nguyên chung) và **né halting problem** (biến "có dừng không" bất khả quyết thành "có dừng trong N gas không" luôn quyết định được) — điều kiện sống còn cho một EVM Turing-complete phi tập trung.

> **Bài tiếp theo (Bài 15):** viết smart contract đầu tiên bằng **Solidity** — biến các opcode và storage ở bài này thành code thực thi được.
