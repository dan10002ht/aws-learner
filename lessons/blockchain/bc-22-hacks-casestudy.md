# Bài 23 — Case study các vụ hack lớn

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân tích **nguyên nhân gốc (root cause)** của 5 vụ hack kinh điển — không chỉ "bị hack" mà *bug ở dòng code / thiết kế nào*.
- Phân biệt hai lớp lỗ hổng: **smart contract logic** (reentrancy, donation, access control) vs **bridge / infrastructure** (khóa validator, signature verification).
- Rút ra **pattern phòng thủ** lặp lại: checks-effects-interactions, verify chữ ký đầy đủ, phân tán khóa validator, dùng internal accounting thay vì `balanceOf`.
- Hiểu bối cảnh **The DAO → hard fork ETH/ETC** — vì sao một bug lại chia đôi cả một blockchain.
- Ước lượng được **mức thiệt hại** và ai trả giá, để đánh giá rủi ro khi thiết kế hệ thống.

---

## 2. Lý thuyết — bản đồ các lớp tấn công

### 2.1 Analogy — cướp ngân hàng theo 5 cách khác nhau

Một ngân hàng có thể bị cướp bằng nhiều "mặt phẳng tấn công" khác nhau, và mỗi vụ hack lớn tương ứng một mặt:

| Vụ hack | Analogy đời thường | Lớp lỗ hổng |
|---------|--------------------|-------------|
| **The DAO** | Máy ATM đưa tiền *trước* khi trừ số dư — bạn bấm rút liên tục trong một lần | Reentrancy (contract logic) |
| **Parity multisig** | Ai đó vô tình bấm nút "hủy két sắt của cả tòa nhà", khóa cứng vĩnh viễn | Access control + `selfdestruct` |
| **Ronin Bridge** | Két cần 9 chữ ký để mở, nhưng kẻ trộm nắm được 5 chiếc chìa | Khóa validator tập trung |
| **Wormhole** | Bảo vệ chỉ *giả vờ* kiểm tra thẻ ra vào, không quẹt thật | Signature verification thiếu |
| **Euler** | Quyên góp một đống tiền vào quỹ để *thổi phồng* giá trị tài sản thế chấp của mình | Donation / accounting manipulation |

Điểm chung: **không vụ nào là "phá mã hóa"**. SHA-256 và ECDSA vẫn nguyên vẹn. Tất cả đều là **lỗi logic / thiết kế / vận hành** — nơi con người và code sai, chứ không phải toán học sai. Đây là bài học lớn nhất của cả bài.

<svg viewBox="0 0 720 250" role="img" aria-labelledby="map-t map-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="map-t">Hai lớp tấn công lớn</title>
<desc id="map-d">Bên trái lỗ hổng ở smart contract logic, bên phải lỗ hổng ở bridge và hạ tầng vận hành</desc>
<rect x="20" y="40" width="320" height="180" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="180" y="66" text-anchor="middle" font-size="14" fill="currentColor">Smart contract logic</text>
<rect x="45" y="86" width="270" height="34" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="180" y="108" text-anchor="middle" font-size="12" fill="currentColor">The DAO — reentrancy</text>
<rect x="45" y="128" width="270" height="34" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="180" y="150" text-anchor="middle" font-size="12" fill="currentColor">Parity — access control + selfdestruct</text>
<rect x="45" y="170" width="270" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="180" y="192" text-anchor="middle" font-size="12" fill="currentColor">Euler — donation / accounting</text>
<rect x="380" y="40" width="320" height="180" rx="10" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="540" y="66" text-anchor="middle" font-size="14" fill="currentColor">Bridge / hạ tầng</text>
<rect x="405" y="100" width="270" height="34" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="540" y="122" text-anchor="middle" font-size="12" fill="currentColor">Ronin — khóa validator tập trung</text>
<rect x="405" y="150" width="270" height="34" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="540" y="172" text-anchor="middle" font-size="12" fill="currentColor">Wormhole — signature verification</text>
</svg>

---

## 3. The DAO (2016) — reentrancy & cú hard fork chia đôi Ethereum

### 3.1 Bối cảnh & thiệt hại
The DAO là một quỹ đầu tư phi tập trung (venture fund) chạy trên Ethereum, gọi vốn kỷ lục **~12.7 triệu ETH** (khoảng **150 triệu USD** thời điểm đó, ~14% toàn bộ ETH lưu hành). Tháng 6/2016, kẻ tấn công rút được **~3.6 triệu ETH** (~60 triệu USD).

### 3.2 Nguyên nhân gốc — reentrancy
Hàm rút tiền gửi ETH cho người dùng **trước khi** cập nhật số dư nội bộ. Vì gửi ETH cho một contract sẽ gọi hàm `fallback` của contract đó, kẻ tấn công đặt một cuộc gọi rút *lồng vào chính fallback* — vòng lặp rút nhiều lần trên **cùng một số dư chưa kịp bị trừ**.

```solidity
// ❌ Mô hình lỗi (đơn giản hóa từ The DAO)
mapping(address => uint) public balances;

function withdraw() public {
    uint amount = balances[msg.sender];
    // (1) Gửi tiền TRƯỚC — trao quyền điều khiển cho msg.sender
    (bool ok, ) = msg.sender.call{value: amount}("");
    require(ok);
    // (3) Trừ số dư SAU — quá muộn, đã bị gọi lại ở bước (2)
    balances[msg.sender] = 0;
}
```

```solidity
// Contract tấn công
contract Attacker {
    Victim victim;
    function attack() external payable {
        victim.deposit{value: 1 ether}();
        victim.withdraw();            // kích hoạt lần đầu
    }
    // (2) fallback bị gọi khi nhận ETH → gọi lại withdraw() trước khi balances bị reset
    receive() external payable {
        if (address(victim).balance >= 1 ether) {
            victim.withdraw();        // đệ quy: rút lại trên số dư cũ
        }
    }
}
```

### 3.3 Cách phòng thủ
**Checks-Effects-Interactions**: cập nhật state (effects) *trước*, gọi ra ngoài (interactions) *sau cùng*. Kết hợp `ReentrancyGuard`.

```solidity
// ✅ Đúng chuẩn
function withdraw() public nonReentrant {          // guard chống re-entry
    uint amount = balances[msg.sender];
    balances[msg.sender] = 0;                        // EFFECTS trước
    (bool ok, ) = msg.sender.call{value: amount}(""); // INTERACTIONS sau
    require(ok, "transfer failed");
}
```

### 3.4 Hệ quả — hard fork ETH/ETC
Cộng đồng chia rẽ: một phe muốn **can thiệp** để hoàn tiền cho nạn nhân, một phe giữ nguyên tắc **"code is law"** (mã đã chạy thì bất khả xâm phạm). Kết quả là **hard fork** ở block 1,920,000:
- **Ethereum (ETH)** — chain đã đảo ngược vụ hack, hoàn tiền.
- **Ethereum Classic (ETC)** — chain gốc giữ nguyên, tôn trọng bất biến.

> Bài học lớn nhất: **immutability là con dao hai lưỡi**. Không sửa được quá khứ là ưu điểm bảo mật, nhưng khi bug xảy ra, lựa chọn duy nhất có thể là chia đôi cả cộng đồng.

---

## 4. Parity multisig freeze (2017) — access control & selfdestruct

### 4.1 Bối cảnh & thiệt hại
Parity là ví multisig phổ biến. Có **hai sự cố**; ở đây tập trung vụ tháng 11/2017: **~513,000 ETH** (~150–300 triệu USD tùy thời điểm) bị **đóng băng vĩnh viễn** — không bị trộm, mà **khóa cứng, không ai lấy ra được nữa**.

### 4.2 Nguyên nhân gốc — library chung không có chủ + selfdestruct
Để tiết kiệm gas, mọi ví Parity không copy toàn bộ logic mà **delegatecall** tới một contract **library dùng chung**. Library này có một hàm khởi tạo `initWallet` **không được bảo vệ** — bất kỳ ai gọi cũng thành "chủ".

Một người dùng vô tình gọi `initWallet` lên chính contract library (biến mình thành owner), rồi gọi tiếp hàm chứa `selfdestruct`. `selfdestruct` **xóa library**. Vì tất cả ví con đều `delegatecall` tới library đã biến mất → **mọi ví mất phần logic**, ETH mắc kẹt bên trong không còn code để rút.

```solidity
// ❌ Bản chất lỗi: hàm init không kiểm tra đã khởi tạo chưa
contract WalletLibrary {
    address owner;
    function initWallet(address _owner) public {   // thiếu modifier bảo vệ!
        owner = _owner;                             // ai gọi cũng thành owner
    }
    function kill(address to) public {
        require(msg.sender == owner);
        selfdestruct(payable(to));                  // xóa library dùng chung
    }
}
```

### 4.3 Cách phòng thủ
- **Bảo vệ initializer**: dùng cờ `initialized` hoặc pattern `initializer` của OpenZeppelin; không để hàm khởi tạo gọi lại được.
- Tránh `selfdestruct` trong contract mà người khác phụ thuộc (EIP-6780 sau này gần như vô hiệu hóa `selfdestruct`).
- Với proxy/library: đảm bảo **implementation contract cũng được khởi tạo/khóa** (`_disableInitializers()`), không để nó "vô chủ".

```solidity
// ✅ OpenZeppelin pattern
contract Wallet is Initializable {
    address owner;
    function initialize(address _owner) public initializer {  // chỉ chạy 1 lần
        owner = _owner;
    }
    constructor() { _disableInitializers(); }  // khóa implementation gốc
}
```

> Bài học: **access control là bug phổ biến & tốn kém nhất**, không kém gì reentrancy. Một hàm thiếu một modifier có thể khóa vĩnh viễn hàng trăm triệu USD.

---

## 5. Ronin Bridge (2022) — khóa validator tập trung

### 5.1 Bối cảnh & thiệt hại
Ronin là sidechain của game Axie Infinity, dùng **bridge** để chuyển tài sản qua lại với Ethereum. Bridge được bảo vệ bởi **9 validator**, cần **≥5 chữ ký** để duyệt một lệnh rút. Tháng 3/2022 kẻ tấn công rút **173,600 ETH + 25.5 triệu USDC** (~**625 triệu USD**) — một trong những vụ lớn nhất lịch sử.

### 5.2 Nguyên nhân gốc — không đủ phân tán + social engineering
Ngưỡng 5/9 nghe an toàn, nhưng thực tế:
- Sky Mavis (công ty vận hành) **trực tiếp kiểm soát 4 validator**.
- Validator thứ 5 thuộc **Axie DAO**, nhưng trước đó đã cấp cho Sky Mavis quyền ký giúp (allowlist) khi tải cao — và **quyền này không bị thu hồi** sau đó.

Kẻ tấn công dùng **spear-phishing** (một offer việc làm giả qua PDF) để chiếm được các private key của Sky Mavis → nắm 4 key + lạm dụng quyền được ủy thác của validator thứ 5 → đủ 5/9 chữ ký, ký lệnh rút hợp lệ. Đáng chú ý: vụ trộm **6 ngày sau mới bị phát hiện**, khi một người dùng không rút được tiền.

### 5.3 Cách phòng thủ
- **Phân tán thật sự**: validator phải do **các tổ chức độc lập** vận hành, khóa lưu ở môi trường khác nhau (HSM, không cùng một máy chủ/công ty).
- **Thu hồi quyền tạm thời**: mọi allowlist/ủy thác khẩn cấp phải có **thời hạn (TTL)** và tự hết hạn.
- **Giám sát on-chain**: cảnh báo tự động khi có lệnh rút bất thường về kích thước — không để 6 ngày mới biết.
- Tăng ngưỡng & số validator (ví dụ 8/11) và **key rotation** định kỳ.

> Bài học: bridge là **honeypot lớn nhất DeFi** — nơi tập trung thanh khoản khổng lồ nhưng bảo mật thường chỉ bằng một multisig nhỏ. "Đủ chữ ký" trên giấy khác xa "đủ phân tán" trên thực tế.

---

## 6. Wormhole (2022) — signature verification thiếu

### 6.1 Bối cảnh & thiệt hại
Wormhole là bridge nối Solana và Ethereum. Tài sản chuyển qua được bảo chứng bởi **19 "guardian"** ký một message gọi là **VAA** (Verifiable Action Approval). Tháng 2/2022, kẻ tấn công đúc (mint) **120,000 wETH** (~**325 triệu USD**) trên Solana **mà không hề khóa ETH thật** bên Ethereum.

### 6.2 Nguyên nhân gốc — không thực sự xác minh chữ ký guardian
Contract Solana kiểm tra chữ ký bằng cách so với một **sysvar account** chứa kết quả verify của instruction `secp256k1`. Nhưng hàm `load_current_index` **dùng một API đã deprecated** và **không kiểm tra rằng instruction verify chữ ký thật sự được thực thi**. Kẻ tấn công truyền vào một **account giả** đóng vai "đã verify" → contract tin rằng 19 guardian đã ký, trong khi **không có chữ ký thật nào**.

Nói cách khác: cổng bảo mật *giả vờ* đã kiểm tra chữ ký, nhưng thực chất chấp nhận một tờ giấy "đã duyệt" do chính kẻ tấn công tự viết.

<svg viewBox="0 0 700 210" role="img" aria-labelledby="wh-t wh-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="wh-t">Wormhole — chữ ký giả được chấp nhận</title>
<desc id="wh-d">Kẻ tấn công truyền một account giả mạo kết quả verify, contract không kiểm tra nên mint token không có tài sản bảo chứng</desc>
<rect x="20" y="80" width="150" height="55" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="104" text-anchor="middle" font-size="12" fill="currentColor">Attacker</text>
<text x="95" y="122" text-anchor="middle" font-size="11" fill="currentColor">account giả "đã ký"</text>
<rect x="270" y="80" width="170" height="55" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="355" y="100" text-anchor="middle" font-size="12" fill="currentColor">Wormhole contract</text>
<text x="355" y="118" text-anchor="middle" font-size="11" fill="currentColor">không verify thật</text>
<rect x="540" y="80" width="140" height="55" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="610" y="104" text-anchor="middle" font-size="12" fill="currentColor">Mint 120k wETH</text>
<text x="610" y="122" text-anchor="middle" font-size="11" fill="currentColor">không tài sản</text>
<line x1="170" y1="107" x2="268" y2="107" stroke="currentColor" stroke-width="1.5" marker-end="url(#wa)"/>
<line x1="440" y1="107" x2="538" y2="107" stroke="currentColor" stroke-width="1.5" marker-end="url(#wa)"/>
<text x="355" y="165" text-anchor="middle" font-size="11" fill="#f43f5e">Bỏ bước kiểm tra instruction secp256k1 đã thực thi thật</text>
<defs><marker id="wa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 6.3 Cách phòng thủ
- **Verify chữ ký một cách hoàn chỉnh**: kiểm tra đúng program id, số lượng chữ ký hợp lệ, và rằng instruction verify **thực sự nằm trong transaction** — không tin một account do người gọi cung cấp.
- Không dùng **API deprecated** cho logic bảo mật; theo dõi và vá kịp thời (Wormhole thực ra đã có bản vá nhưng **chưa deploy** khi bị tấn công).
- **Audit tập trung vào signature path** — đây là điểm chết người của mọi bridge/oracle.

> Bài học: "đã kiểm tra chữ ký" phải là *đã kiểm tra đầy đủ và không thể giả mạo đầu vào*. Một bước verify thiếu sót còn nguy hiểm hơn không verify, vì nó tạo cảm giác an toàn giả.

---

## 7. Euler Finance (2023) — donation attack & thiếu health check

### 7.1 Bối cảnh & thiệt hại
Euler là giao thức lending. Tháng 3/2023 kẻ tấn công rút **~197 triệu USD** (đa số **sau đó được trả lại** sau đàm phán). Đây là ví dụ tinh vi kết hợp **flash loan + donation + self-liquidation**.

### 7.2 Nguyên nhân gốc — donateToReserves không kiểm tra sức khỏe vị thế
Euler có hàm `donateToReserves` cho phép người dùng "tặng" token cho quỹ dự trữ. Bug: hàm này **không kiểm tra vị thế người gọi có còn đủ tài sản thế chấp (health check)** sau khi tặng. Chuỗi tấn công (dùng flash loan để có vốn lớn):
1. Vay flash loan, **deposit** để mint eToken (tài sản) và **mượn** để mint dToken (nợ) — tự tạo một vị thế đòn bẩy lớn.
2. Gọi `donateToReserves` **tặng bớt eToken** đi → tài sản thế chấp tụt xuống, khiến vị thế của chính mình trở nên **mất khả năng thanh toán (insolvent)** — nhưng không bị chặn vì thiếu health check.
3. **Tự thanh lý (self-liquidate)** vị thế xấu của mình bằng một tài khoản thứ hai. Cơ chế thanh lý của Euler tặng **discount lớn** cho người thanh lý vị thế rủi ro cao → tài khoản thứ hai nhận tài sản thế chấp *giá hời*, nhiều hơn phần nợ.
4. Chênh lệch chính là lợi nhuận; trả flash loan, ôm phần dư.

Bản chất: kẻ tấn công **cố tình tự làm mình vỡ nợ** rồi thu lợi từ cơ chế thanh lý ưu đãi, vì một hàm cho phép thay đổi state tài chính mà **quên gọi kiểm tra bất biến "vị thế phải luôn khỏe mạnh"**.

### 7.3 Cách phòng thủ
- **Mọi hàm làm thay đổi tài sản/nợ phải gọi health check ở cuối** (`checkLiquidity` / `requireAccountStatus`) — không có ngoại lệ, kể cả hàm "donate" nghe có vẻ vô hại.
- Cẩn trọng với cơ chế **thanh lý có discount phi tuyến** — nó có thể bị biến thành công cụ trục lợi.
- **Invariant testing / fuzzing** (Foundry): định nghĩa bất biến "không tài khoản nào có thể tự đưa mình vào trạng thái sinh lợi bất thường" và fuzz mọi chuỗi hàm.

```solidity
// ✅ Nguyên tắc: kết thúc mọi mutation bằng health check
function donateToReserves(uint amount) external {
    _transferToReserves(msg.sender, amount);
    _checkAccountHealth(msg.sender);   // BẮT BUỘC — Euler đã thiếu đúng dòng này
}
```

> Bài học: bug nguy hiểm nhất trong DeFi thường không phải "một dòng sai", mà là **một dòng bị thiếu** — một invariant không được kiểm tra trên một code path ít ai ngờ.

---

## 8. Tổng hợp — pattern lặp lại

| Vụ | Năm | Thiệt hại | Root cause | Phòng thủ cốt lõi |
|----|-----|-----------|------------|-------------------|
| The DAO | 2016 | ~60M USD | Reentrancy | Checks-Effects-Interactions + guard |
| Parity freeze | 2017 | ~513k ETH khóa cứng | Initializer vô chủ + selfdestruct | Bảo vệ init, khóa implementation |
| Ronin | 2022 | ~625M USD | Validator tập trung + phishing | Phân tán khóa thật, TTL cho ủy thác, giám sát |
| Wormhole | 2022 | ~325M USD | Signature verification thiếu | Verify chữ ký đầy đủ, không tin input |
| Euler | 2023 | ~197M USD | Thiếu health check sau mutation | Invariant testing, health check mọi path |

Ba nguyên tắc xuyên suốt:
1. **State trước, external call sau** — và guard mọi hàm nhận giá trị.
2. **Không tin đầu vào**: chữ ký, account, quyền ủy thác đều phải verify đầy đủ, có thời hạn, không giả mạo được.
3. **Mọi thay đổi tài chính phải giữ invariant** — kiểm tra sức khỏe/quyền ở cuối mọi code path, kể cả path "vô hại".

---

## 9. Tóm tắt
- Không vụ hack lớn nào là "phá mã hóa" — tất cả là **lỗi logic, thiết kế hoặc vận hành**.
- **The DAO** dạy về reentrancy và cái giá của immutability (hard fork ETH/ETC).
- **Parity** dạy access control + hiểm họa `selfdestruct` trên contract dùng chung.
- **Ronin** dạy rằng "đủ chữ ký" ≠ "đủ phân tán"; con người (phishing) là mắt xích yếu nhất.
- **Wormhole** dạy phải verify chữ ký *hoàn chỉnh và không giả mạo được*.
- **Euler** dạy rằng một invariant bị thiếu trên một code path lạ có thể thổi bay hàng trăm triệu USD.
- Phòng thủ không phải một mẹo, mà là **kỷ luật**: CEI, verify đầy đủ, phân tán thật, invariant testing, giám sát on-chain.

> **Bài tiếp theo (Bài 24):** đi vào **quy trình audit & security tooling** — Slither, Foundry invariant/fuzz testing, formal verification và bug bounty — để biến những bài học đắt giá này thành checklist phòng thủ có thể thực thi.
