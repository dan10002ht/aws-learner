# Bài 36 — Cross-chain bridge & bảo mật bridge

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **vì sao cần bridge** — bản chất "asset không đi qua chain, chỉ có message đi qua".
- Phân biệt ba cơ chế chuyển tài sản: **lock-mint**, **burn-mint**, **liquidity-pool** — và khi nào dùng cái nào.
- Đọc được **trust model** của một bridge: external validator / oracle / **light-client** / **optimistic**, và nói rõ ai là bên bạn đang phải tin.
- Giải thích **vì sao bridge là mục tiêu hack số 1** — mổ xẻ Ronin, Wormhole, Nomad ở mức root cause.
- Áp dụng **nguyên tắc thiết kế bridge an toàn** khi đánh giá hoặc xây một bridge.

---

## 2. Lý thuyết

### 2.1 Analogy — không có "đồng coin" nào bay qua chain

Ethereum và Solana là **hai vũ trụ tách biệt**: mỗi chain chỉ biết trạng thái của chính nó, không node nào của Ethereum "nhìn thấy" số dư trên Solana. Không có một đường ống vật lý nào để token trượt từ chain này sang chain kia.

Hãy tưởng tượng hai quốc gia dùng hai đồng tiền khác nhau, **không công nhận tiền của nhau**. Bạn không thể mang tờ tiền nước A tiêu ở nước B. Cách duy nhất: **gửi tiền A vào một két sắt (custodian) ở nước A**, rồi một bên nào đó **phát cho bạn một tờ IOU (giấy nợ) tương ứng ở nước B**. Tờ IOU đó tiêu được ở B *chỉ khi* mọi người tin rằng tiền thật vẫn nằm nguyên trong két ở A.

Đó chính xác là bridge. **Không có coin nào "qua chain".** Cái thực sự đi qua là **một message** ("Alice đã khoá 10 ETH bên Ethereum"), và bên chain đích có ai đó **tin message đó** rồi mint ra token đại diện. Vì vậy:

> Bảo mật của một bridge = bảo mật của **cơ chế xác thực message xuyên chain**. Toàn bộ tiền trong két phụ thuộc vào việc "ai được quyền nói rằng khoá đã xảy ra".

### 2.2 Ba cơ chế chuyển tài sản

<svg viewBox="0 0 720 300" role="img" aria-labelledby="lm-t lm-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="lm-t">Cơ chế lock-mint và burn-mint</title>
<desc id="lm-d">Chain nguồn khoá tài sản gốc, một bên chuyển tiếp message, chain đích mint token đại diện; chiều về thì burn token đại diện và mở khoá tài sản gốc</desc>
<text x="120" y="24" text-anchor="middle" font-size="14" fill="currentColor">Chain A (nguồn)</text>
<text x="600" y="24" text-anchor="middle" font-size="14" fill="currentColor">Chain B (đích)</text>
<rect x="40" y="50" width="160" height="70" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="80" text-anchor="middle" font-size="13" fill="currentColor">Lock 10 ETH</text>
<text x="120" y="100" text-anchor="middle" font-size="11" fill="currentColor">vào vault / két</text>
<rect x="520" y="50" width="160" height="70" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="600" y="80" text-anchor="middle" font-size="13" fill="currentColor">Mint 10 wETH</text>
<text x="600" y="100" text-anchor="middle" font-size="11" fill="currentColor">token đại diện</text>
<rect x="300" y="55" width="120" height="60" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="82" text-anchor="middle" font-size="12" fill="currentColor">Relayer /</text>
<text x="360" y="100" text-anchor="middle" font-size="12" fill="currentColor">Validator set</text>
<line x1="200" y1="85" x2="298" y2="85" stroke="currentColor" stroke-width="1.5" marker-end="url(#ba)"/>
<line x1="420" y1="85" x2="518" y2="85" stroke="currentColor" stroke-width="1.5" marker-end="url(#ba)"/>
<text x="360" y="45" text-anchor="middle" font-size="11" fill="#f59e0b">message "đã lock"</text>
<rect x="40" y="180" width="160" height="70" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="210" text-anchor="middle" font-size="13" fill="currentColor">Unlock 10 ETH</text>
<text x="120" y="230" text-anchor="middle" font-size="11" fill="currentColor">trả về Alice</text>
<rect x="520" y="180" width="160" height="70" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="600" y="210" text-anchor="middle" font-size="13" fill="currentColor">Burn 10 wETH</text>
<text x="600" y="230" text-anchor="middle" font-size="11" fill="currentColor">huỷ token đại diện</text>
<line x1="518" y1="215" x2="420" y2="215" stroke="currentColor" stroke-width="1.5" marker-end="url(#ba)"/>
<line x1="298" y1="215" x2="200" y2="215" stroke="currentColor" stroke-width="1.5" marker-end="url(#ba)"/>
<text x="360" y="205" text-anchor="middle" font-size="11" fill="#f43f5e">message "đã burn"</text>
<text x="360" y="240" text-anchor="middle" font-size="11" fill="currentColor">Chiều về (burn-mint)</text>
<defs><marker id="ba" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

| Cơ chế | Chain nguồn | Chain đích | Tổng cung bảo toàn nhờ | Điển hình |
|--------|-------------|------------|------------------------|-----------|
| **Lock-mint** | Khoá asset gốc vào vault | Mint token đại diện (wrapped) | Vault luôn giữ đủ collateral 1:1 | WBTC, đa số bridge L1↔L2 |
| **Burn-mint** | Burn token gốc (chain đích burn) | Unlock/mint đầu kia | Token chỉ tồn tại ở một chain tại một thời điểm | Chuyển chiều về, hoặc native-mint token (USDC CCTP) |
| **Liquidity-pool** | Bỏ asset vào pool bên A | LP bên B trả asset **thật, cùng loại** | Hai pool được tái cân bằng, có phí + slippage | Hop, Stargate, Synapse |

**Phân biệt cốt lõi:**
- **Lock-mint / burn-mint** tạo ra **token đại diện** (wrapped). Cùng một asset có thể có nhiều phiên bản wrapped (wETH của bridge X ≠ wETH của bridge Y) → phân mảnh thanh khoản. Token wrapped **chỉ có giá trị nếu vault còn nguyên collateral** — hack vault là in tiền vô hạn.
- **Liquidity-pool** trả cho bạn **asset native thật** ở chain đích (không phải IOU), UX tốt hơn, không phân mảnh. Đổi lại: cần LP nạp vốn hai đầu, có **slippage**, và pool cạn thì giao dịch lớn kẹt hoặc trượt giá nặng. Bản chất đây là một cặp giao dịch atomic-swap được điều phối, không tạo cung mới.

Nhiều bridge hiện đại (LayerZero, CCTP) tách hẳn **lớp truyền message** ra khỏi **lớp tài sản** — asset chỉ là một ứng dụng chạy trên lớp messaging tổng quát.

### 2.3 Trust model — bạn đang tin ai?

Câu hỏi duy nhất đáng hỏi về mọi bridge: **"Ai xác nhận rằng sự kiện bên chain nguồn đã thật sự xảy ra?"** Bốn kiểu trả lời, xếp từ *tin người* đến *tin toán học*:

<svg viewBox="0 0 720 250" role="img" aria-labelledby="tm-t tm-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="tm-t">Phổ trust model của bridge</title>
<desc id="tm-d">Từ trái sang phải mức độ tin cậy chuyển từ tin vào một nhóm bên ngoài sang tin vào bằng chứng mật mã trên chain</desc>
<line x1="40" y1="200" x2="680" y2="200" stroke="currentColor" stroke-width="1.5" marker-end="url(#ta)"/>
<text x="60" y="230" text-anchor="start" font-size="11" fill="currentColor">tin con người / đa số</text>
<text x="660" y="230" text-anchor="end" font-size="11" fill="currentColor">tin mật mã / chính chain</text>
<rect x="45" y="60" width="145" height="110" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="117" y="85" text-anchor="middle" font-size="13" fill="currentColor">External</text>
<text x="117" y="103" text-anchor="middle" font-size="13" fill="currentColor">validator</text>
<text x="117" y="128" text-anchor="middle" font-size="10" fill="currentColor">M-of-N ký message</text>
<text x="117" y="146" text-anchor="middle" font-size="10" fill="currentColor">Ronin, Wormhole</text>
<rect x="205" y="60" width="145" height="110" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="277" y="94" text-anchor="middle" font-size="13" fill="currentColor">Oracle +</text>
<text x="277" y="112" text-anchor="middle" font-size="13" fill="currentColor">Relayer</text>
<text x="277" y="137" text-anchor="middle" font-size="10" fill="currentColor">2 bên độc lập</text>
<text x="277" y="153" text-anchor="middle" font-size="10" fill="currentColor">LayerZero (cổ điển)</text>
<rect x="365" y="60" width="145" height="110" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="437" y="94" text-anchor="middle" font-size="13" fill="currentColor">Optimistic</text>
<text x="437" y="119" text-anchor="middle" font-size="10" fill="currentColor">mặc định tin,</text>
<text x="437" y="135" text-anchor="middle" font-size="10" fill="currentColor">có cửa sổ fraud proof</text>
<text x="437" y="153" text-anchor="middle" font-size="10" fill="currentColor">Nomad, Across</text>
<rect x="525" y="60" width="150" height="110" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="600" y="94" text-anchor="middle" font-size="13" fill="currentColor">Light-client</text>
<text x="600" y="119" text-anchor="middle" font-size="10" fill="currentColor">verify header +</text>
<text x="600" y="135" text-anchor="middle" font-size="10" fill="currentColor">Merkle proof on-chain</text>
<text x="600" y="153" text-anchor="middle" font-size="10" fill="currentColor">IBC, zkBridge</text>
<defs><marker id="ta" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

- **External validator (trusted federation)**: một tập N validator ngoài chain cùng ký message; đủ **M-of-N** chữ ký thì chain đích chấp nhận. Đơn giản, rẻ, nhanh — nhưng **an ninh = an ninh của M private key đó**. Chiếm được M key là in tiền. Đây là mô hình yếu nhất và bị hack nhiều nhất.
- **Oracle + Relayer (tách vai)**: một bên (oracle) gửi block header, một bên độc lập (relayer) gửi proof. Message chỉ hợp lệ khi **cả hai bên độc lập cùng đồng ý** → phải thông đồng cả hai mới hack được. Tốt hơn federation đơn, nhưng vẫn là **giả định tin cậy** chứ không phải bằng chứng.
- **Optimistic**: chain đích **mặc định tin** message là đúng, nhưng mở một **cửa sổ thời gian** (vài phút–vài giờ) để bất kỳ watcher nào nộp **fraud proof** chặn message gian lận. An ninh dựa trên "chỉ cần **một** người trung thực đang canh". Đổi lại: **độ trễ** (phải chờ hết cửa sổ) và cần watcher thực sự hoạt động.
- **Light-client / zk**: chain đích chạy một **light client** của chain nguồn — tự verify block header (theo đúng consensus rule) và **Merkle proof** của sự kiện, hoàn toàn on-chain. Đây là mô hình **trust-minimized** thật sự: an ninh xấp xỉ an ninh của chính chain nguồn, không thêm bên tin cậy mới. Đắt về gas & khó implement (đặc biệt verify PoW/PoS của chain lạ), nên thường cần **zk-proof** để nén chi phí (zkBridge). IBC của Cosmos là hiện thực light-client phổ biến nhất.

> **Quy tắc vàng:** đọc bridge nào cũng hỏi *"nếu tôi muốn rút tiền gian lận, tôi phải phá cái gì?"* — nếu câu trả lời là "chiếm M cái ví" thì đó là bridge **custodial trá hình**. Nếu là "phá consensus của chain nguồn" thì đó mới là trust-minimized.

### 2.4 Vì sao bridge là mục tiêu hack số 1

Bridge tập trung ba yếu tố khiến chúng thành "máy ATM cho hacker":

1. **Honeypot khổng lồ, tập trung.** Vault của bridge giữ collateral cho *toàn bộ* token wrapped đang lưu hành — hàng trăm triệu đến hàng tỷ USD trong **một** contract/multisig. Không cần đánh nhiều nạn nhân, đánh một điểm là trúng cả kho.
2. **Bề mặt tấn công gấp đôi + phần "keo dán" tự viết.** Bridge phải đúng ở **cả hai** chain **và** ở lớp off-chain (validator, relayer). Code verify message xuyên chain là loại code **mới, phức tạp, ít được đánh trận** — khác hẳn ERC-20 đã chuẩn hoá. Lỗi thường nằm ở chỗ "keo dán" tự viết.
3. **Một message giả = mint không cần collateral.** Nếu qua được bước xác thực, hacker mint token đại diện **không có tài sản thật chống lưng**, rồi swap/rút ngay. Không có "hoàn tác".

**Ba vụ kinh điển — mỗi vụ một bài học root-cause:**

| Vụ | Thiệt hại | Trust model | Root cause |
|-----|-----------|-------------|------------|
| **Ronin** (3/2022) | ~625 triệu USD | External validator 5-of-9 | Hacker chiếm **5 private key** (4 do chính team, 1 do gatekeeper node được cấp quyền tạm rồi quên thu hồi). Đủ ngưỡng ký → tự phê duyệt lệnh rút. |
| **Wormhole** (2/2022) | ~326 triệu USD | External validator (guardian) | Lỗi **không verify chữ ký đúng cách**: hàm `verify_signatures` trên Solana dùng được một sysvar giả, hacker **fake được "guardian đã ký"** → mint 120k wETH không cần collateral. |
| **Nomad** (8/2022) | ~190 triệu USD | Optimistic | Một lần nâng cấp set **trusted root = 0x00**, khiến **mọi message chưa từng được chứng minh đều "hợp lệ"**. Ai copy tx của hacker, đổi địa chỉ nhận, cũng rút được → "hack đám đông" đầu tiên trong lịch sử. |

Điểm chung nổi bật: **hai trong ba vụ là lỗi ở lớp xác thực message**, không phải lỗi trong logic token. Ronin là lỗi quản lý khoá (M-of-N quá tập trung). Wormhole là lỗi kiểm tra chữ ký. Nomad là lỗi khởi tạo/nâng cấp state. Tất cả đều **không phải lỗi lý thuyết mật mã** — chúng là lỗi kỹ thuật ở đúng chỗ "keo dán". Đó là lý do trust-minimized quan trọng: nó **thu hẹp bề mặt tin cậy** để những lỗi này không còn đủ sức phá kho.

### 2.5 Minh hoạ code: lỗ hổng lock-mint điển hình

Đoạn dưới là một bridge lock-mint tối giản (Solidity) minh hoạ **đúng lớp dễ sai** — hàm mint dựa trên chữ ký validator. Chú ý các comment `LỖI` là những cạm bẫy đã gây ra các vụ hack thật.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// Contract phía chain ĐÍCH: mint token đại diện khi có đủ chữ ký validator.
contract BridgeMintGuard {
    using ECDSA for bytes32;

    address[] public validators;      // tập validator ngoài chain
    uint256 public threshold;         // số chữ ký tối thiểu (M trong M-of-N)
    mapping(bytes32 => bool) public processed; // chống replay

    event Minted(address to, uint256 amount, bytes32 srcTxHash);

    constructor(address[] memory _validators, uint256 _threshold) {
        require(_threshold > 0 && _threshold <= _validators.length, "bad threshold");
        validators = _validators;
        threshold = _threshold;
    }

    /// signatures phải được sắp xếp theo địa chỉ tăng dần để phát hiện trùng.
    function mint(
        address to,
        uint256 amount,
        bytes32 srcTxHash,          // hash tx lock bên chain nguồn — định danh duy nhất
        uint256 srcChainId,         // BẮT BUỘC: chống replay xuyên chain
        bytes[] calldata signatures
    ) external {
        // 1) Chống replay: mỗi lệnh lock chỉ mint đúng một lần.
        require(!processed[srcTxHash], "already processed");

        // 2) Bind message với chain đích + contract này -> chống replay sang bridge khác.
        bytes32 digest = keccak256(
            abi.encode(to, amount, srcTxHash, srcChainId, block.chainid, address(this))
        ).toEthSignedMessageHash();

        // 3) Đếm chữ ký hợp lệ, KHÔNG cho một validator ký nhiều lần.
        uint256 valid = 0;
        address last = address(0);
        for (uint256 i = 0; i < signatures.length; i++) {
            address signer = digest.recover(signatures[i]); // LỖI nếu bỏ qua recover fail
            require(signer > last, "unsorted or duplicate"); // ép tăng dần -> loại trùng
            require(_isValidator(signer), "not a validator");
            last = signer;
            valid++;
        }
        require(valid >= threshold, "not enough signatures");

        // 4) Đánh dấu ĐÃ xử lý TRƯỚC khi phát token (checks-effects-interactions).
        processed[srcTxHash] = true;

        _mint(to, amount);
        emit Minted(to, amount, srcTxHash);
    }

    function _isValidator(address a) internal view returns (bool) {
        for (uint256 i = 0; i < validators.length; i++) if (validators[i] == a) return true;
        return false;
    }

    function _mint(address to, uint256 amount) internal { /* ... ERC20 mint ... */ }
}
```

Những chỗ dòng code này **cố tình phòng thủ** — và là đúng những chỗ các bridge thật đã ngã:

- **Không bind `srcChainId` + `block.chainid` + `address(this)`** → chữ ký hợp lệ ở bridge/chain này bị **replay** sang bridge/chain khác. (Cạm bẫy cross-chain replay.)
- **Không ép `signer > last`** → một validator ký lặp lại được đếm nhiều lần, phá vỡ ngưỡng M-of-N (Wormhole thuộc họ lỗi "chữ ký không được kiểm đủ chặt").
- **Đặt `processed[...] = true` sau khi mint** thay vì trước → mở đường reentrancy / double-mint.
- **`threshold` quá thấp hoặc validator quá tập trung** → dù code đúng, vẫn là Ronin. **Bảo mật của con người vẫn là mắt xích yếu nhất.**

> Code chỉ giải quyết được lớp "kiểm chữ ký". Nó **không** cứu được bạn nếu bản thân tập validator bị chiếm, hoặc nếu bạn set trusted root sai khi nâng cấp (Nomad). Đó là lý do trust model quan trọng hơn từng dòng code.

---

## 3. Nguyên tắc thiết kế bridge an toàn

1. **Tối thiểu hoá niềm tin (trust-minimize).** Ưu tiên light-client / zk-proof hơn federation M-of-N. Nếu buộc phải dùng validator ngoài chain, hãy coi nó là **custodial** và thiết kế như một sàn giữ tiền: HSM, key phân tán địa lý, tách quyền.
2. **Phân quyền & phân tán khoá thật sự.** M-of-N chỉ có ý nghĩa khi N node **độc lập** về vận hành, hạ tầng, tổ chức. Ronin sụp vì các key về bản chất do **một** bên kiểm soát. Thu hồi ngay mọi quyền tạm cấp.
3. **Rate-limit & circuit breaker.** Giới hạn tổng giá trị rút trên mỗi đơn vị thời gian; tự động **tạm dừng** khi phát hiện dòng tiền bất thường. Nhiều vụ mất **toàn bộ** vault trong một tx — rate-limit biến "mất tất cả" thành "mất một phần rồi bị chặn".
4. **Cửa sổ trễ + watcher cho lệnh lớn (optimistic-style).** Cho phép huỷ/đóng băng trong cửa sổ thách thức. Nhưng nhớ Nomad: **optimistic vô dụng nếu bước khởi tạo/nâng cấp làm mọi message auto-valid** → mọi thay đổi root/config phải qua timelock + review.
5. **Bind message chặt & chống replay.** Mọi message phải gắn `chainId nguồn`, `chainId đích`, địa chỉ contract, nonce/hash duy nhất. Kiểm tra chữ ký **đủ chặt**: loại trùng, bắt buộc `recover` thành công, đúng threshold.
6. **Nâng cấp có kỷ luật.** Timelock cho mọi thay đổi validator set / trusted root / logic; multi-sig cho admin; monitoring on-chain. Phần lớn thảm hoạ đến từ **thao tác vận hành**, không phải thuật toán.
7. **Kiểm toán độc lập nhiều vòng + bug bounty lớn.** Bridge là code mới, phức tạp; một lần audit không đủ. Bounty đủ cao để hacker mũ trắng có động lực báo trước hacker mũ đen.

> Nguyên tắc bao trùm: **giá trị được bảo vệ nên đắt hơn chi phí tấn công.** Một vault 1 tỷ USD được canh bởi 5 private key trên VPS là **mời gọi** tấn công. Hãy làm cho việc phá bridge tốn kém xấp xỉ việc phá chính chain.

---

## 4. Tóm tắt
- Bridge **không** chuyển coin qua chain — nó chuyển **message**, rồi mint token đại diện. Bảo mật bridge = bảo mật của **cơ chế xác thực message xuyên chain**.
- Ba cơ chế tài sản: **lock-mint** (khoá gốc, mint wrapped), **burn-mint** (huỷ đầu này, mở đầu kia), **liquidity-pool** (trả asset native thật, có slippage, không phân mảnh).
- Trust model xếp từ yếu đến mạnh: **external validator → oracle+relayer → optimistic → light-client/zk**. Luôn hỏi "*muốn rút gian lận thì phải phá cái gì?*".
- Bridge là **mục tiêu hack số 1** vì: honeypot tập trung khổng lồ, bề mặt tấn công gấp đôi + "keo dán" tự viết, một message giả = mint không cần collateral.
- Ba bài học root-cause: **Ronin** = khoá M-of-N quá tập trung; **Wormhole** = kiểm chữ ký lỏng; **Nomad** = nâng cấp set trusted root sai. Hai trong ba là lỗi ở **lớp xác thực message**.
- Thiết kế an toàn: trust-minimize, phân tán khoá thật, rate-limit/circuit breaker, bind message chống replay, nâng cấp có timelock, audit nhiều vòng + bounty lớn.

> **Bài tiếp theo:** đi sâu vào **messaging tổng quát xuyên chain** (LayerZero, CCIP, IBC) — nơi bridge tài sản chỉ là một ứng dụng chạy trên lớp truyền message.
