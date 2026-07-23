# Bài 31 — Rollup: Optimistic vs ZK

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **rollup trong 1 câu**: *execute off-chain, post data on-chain* — và vì sao đó là chìa khoá scale Ethereum.
- Phân biệt vai trò **data availability (DA)** và **state root** — thứ khiến rollup "kế thừa" bảo mật của L1.
- Nắm cơ chế **Optimistic rollup** (fraud proof, challenge period 7 ngày — Arbitrum, Optimism) so với **ZK rollup** (validity proof, finality nhanh — zkSync, StarkNet).
- Hiểu **sequencer**, rủi ro kiểm duyệt và **forced inclusion / escape hatch** — vì sao sequencer tập trung vẫn *không thể ăn trộm tiền*.
- Chọn đúng loại rollup theo trade-off: finality, chi phí, tương thích EVM, giả định bảo mật.

---

## 2. Lý thuyết

### 2.1 Analogy — thư ký ghi biên bản, toà công chứng dấu

Tưởng tượng một hội nghị có **hàng nghìn quyết định mỗi phút**. Nếu bắt **toà công chứng** (Ethereum L1) ký từng quyết định thì tắc nghẽn và cực đắt. Giải pháp:

- Một **thư ký** (rollup) ngồi xử lý tất cả quyết định ở phòng riêng — nhanh, rẻ.
- Định kỳ, thư ký nộp cho toà **hai thứ**: (1) **bản sao đầy đủ danh sách quyết định** (data) để ai cũng kiểm lại được, và (2) **con dấu tóm tắt trạng thái mới** (state root).
- Toà **không xử lại từng việc**, chỉ lưu giữ dữ liệu và con dấu. Việc "chứng minh thư ký làm đúng" mới là điểm khác biệt lớn giữa hai trường phái rollup.

Điểm cốt lõi: **execution** (tính toán) tách khỏi **consensus + data availability**. L1 vẫn là nơi *neo* sự thật; L2 chỉ mượn CPU rẻ hơn nhưng vẫn phải nộp đủ dữ liệu về L1.

### 2.2 Rollup làm gì — execute off-chain, post data on-chain

<svg viewBox="0 0 720 340" role="img" aria-labelledby="ru-t ru-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="ru-t">Kiến trúc rollup</title>
<desc id="ru-d">Giao dịch được thực thi off-chain trên L2, sau đó batch dữ liệu và state root được đăng lên L1 Ethereum</desc>
<rect x="30" y="30" width="660" height="130" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="52" text-anchor="middle" font-size="14" fill="currentColor">Layer 2 (rollup) — thực thi OFF-CHAIN, nhanh &amp; rẻ</text>
<rect x="60" y="70" width="110" height="70" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="100" text-anchor="middle" font-size="12" fill="currentColor">User txs</text>
<text x="115" y="120" text-anchor="middle" font-size="11" fill="currentColor">(hàng nghìn)</text>
<rect x="230" y="70" width="130" height="70" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="295" y="100" text-anchor="middle" font-size="12" fill="currentColor">Sequencer</text>
<text x="295" y="120" text-anchor="middle" font-size="11" fill="currentColor">order + execute</text>
<rect x="420" y="70" width="130" height="70" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="485" y="96" text-anchor="middle" font-size="12" fill="currentColor">Batch</text>
<text x="485" y="114" text-anchor="middle" font-size="11" fill="currentColor">compressed data</text>
<text x="485" y="130" text-anchor="middle" font-size="11" fill="currentColor">+ new state root</text>
<line x1="170" y1="105" x2="228" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#ra)"/>
<line x1="360" y1="105" x2="418" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#ra)"/>
<line x1="485" y1="140" x2="485" y2="205" stroke="currentColor" stroke-width="1.5" marker-end="url(#ra)"/>
<text x="560" y="180" text-anchor="middle" font-size="11" fill="currentColor">post lên L1</text>
<rect x="30" y="205" width="660" height="110" rx="10" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="227" text-anchor="middle" font-size="14" fill="currentColor">Layer 1 (Ethereum) — DATA AVAILABILITY + settlement</text>
<rect x="230" y="245" width="200" height="55" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="330" y="270" text-anchor="middle" font-size="12" fill="currentColor">Rollup contract</text>
<text x="330" y="288" text-anchor="middle" font-size="11" fill="currentColor">lưu data + state root</text>
<rect x="460" y="245" width="200" height="55" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="560" y="270" text-anchor="middle" font-size="12" fill="currentColor">Proof / challenge</text>
<text x="560" y="288" text-anchor="middle" font-size="11" fill="currentColor">bảo đảm tính đúng</text>
<defs><marker id="ra" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Ba việc một rollup luôn làm:

1. **Execute off-chain**: sequencer nhận tx của user, sắp thứ tự, chạy EVM (hoặc VM riêng), tính ra state mới. L1 hoàn toàn không chạy các tx này.
2. **Post data on-chain**: nén batch tx rồi đăng lên L1 dưới dạng **calldata** hoặc **blob** (sau EIP-4844). Đây là **data availability** — bất kỳ ai cũng tải được dữ liệu để **tự dựng lại** state của L2. Không có bước này thì không phải rollup thật (chỉ là validium/sidechain).
3. **Commit state root**: đăng lên L1 hash gốc của cây state mới. State root là "con dấu" mà bridge dùng để xác minh withdrawal.

> **Vì sao rollup an toàn?** Vì (a) mọi dữ liệu tx nằm trên L1 → không ai giấu được, và (b) có cơ chế bảo đảm state root là **đúng**. Chính cơ chế (b) chia rollup thành hai trường phái.

### 2.3 Optimistic rollup — "tin trước, phạt sau" (fraud proof)

Triết lý: **giả định mọi batch là hợp lệ** (optimistic). Sequencer chỉ cần đăng batch + state root, **không kèm bằng chứng**. Đổi lại, mở một **challenge period** (thường **7 ngày**): trong khoảng này, bất kỳ **verifier** trung thực nào phát hiện state transition sai đều có thể nộp **fraud proof** (fault proof) lên L1.

- Nếu có fraud proof hợp lệ → L1 tính lại đoạn tranh chấp, **rollback** state root gian lận, phạt (slash) bond của sequencer/proposer, thưởng người tố giác.
- Nếu hết 7 ngày không ai phản đối → state root coi như **final** trên L1.

Cách fraud proof hoạt động khác nhau:
- **Arbitrum (Nitro)**: **interactive fraud proof** nhiều vòng — người tố giác và proposer chơi trò *bisection*, chia đôi đoạn tính toán tranh chấp cho tới khi còn **một bước máy ảo duy nhất**, rồi L1 chỉ cần chạy đúng 1 opcode để phân xử → rẻ gas.
- **Optimism (Fault Proofs / Cannon)**: cũng đưa tranh chấp về một bước thực thi trên MIPS VM để L1 trọng tài.

Hệ quả: **withdrawal về L1 phải chờ hết challenge period (~7 ngày)**, vì trước đó state root có thể bị lật. (Bridge của bên thứ ba dùng liquidity provider để cho rút "tức thì" — thực chất là cho vay, có phí.)

**Giả định bảo mật**: cần **ít nhất 1 verifier trung thực** (1-of-N) sẵn sàng nộp fraud proof. Nếu tất cả verifier bị mua chuộc/offline suốt 7 ngày, gian lận lọt.

### 2.4 ZK rollup — "chứng minh ngay" (validity proof)

Triết lý ngược lại: **không tin gì cả, bắt chứng minh bằng toán**. Mỗi batch đi kèm một **validity proof** — zk-SNARK hoặc zk-STARK — chứng minh bằng mật mã rằng "áp dụng đúng các tx này lên old state root cho ra new state root này". L1 chạy một **verifier contract** kiểm proof: proof đúng → state root được chấp nhận **ngay**, sai → bị từ chối, không có đường lách.

- **Không cần challenge period** → **finality nhanh**: ngay khi proof được verify on-chain, withdrawal hợp lệ, không phải chờ 7 ngày.
- **Giả định bảo mật** dựa trên **soundness của hệ mật mã** (giả định toán học), không cần verifier trung thực đứng canh.
- Ví dụ: **zkSync Era**, **StarkNet** (STARK, VM Cairo), Polygon zkEVM, Scroll, Linea.

Cái giá phải trả:
- **Proving đắt & chậm về CPU**: sinh proof cho cả một batch EVM là cực nặng (dù verify trên L1 lại rẻ). Cần prover chuyên dụng, đôi khi phần cứng riêng.
- **Tương thích EVM khó**: EVM không thân thiện với ZK-circuit. Có "type 1→4 zkEVM" (Vitalik phân loại): càng giống EVM (type 1) càng chậm prove; càng tối ưu cho ZK (type 4) càng khó port dApp.

<svg viewBox="0 0 720 300" role="img" aria-labelledby="ov-t ov-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="ov-t">Optimistic vs ZK rollup</title>
<desc id="ov-d">Optimistic dựa vào fraud proof với cửa sổ thách thức 7 ngày, ZK dựa vào validity proof cho phép chấp nhận ngay</desc>
<rect x="20" y="30" width="330" height="240" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="185" y="55" text-anchor="middle" font-size="14" fill="currentColor">Optimistic rollup</text>
<rect x="50" y="75" width="270" height="42" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="185" y="101" text-anchor="middle" font-size="12" fill="currentColor">Đăng batch + state root (KHÔNG proof)</text>
<rect x="50" y="130" width="270" height="42" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="185" y="150" text-anchor="middle" font-size="12" fill="currentColor">Challenge period ~7 ngày</text>
<text x="185" y="166" text-anchor="middle" font-size="11" fill="currentColor">ai đó có thể nộp fraud proof</text>
<rect x="50" y="185" width="270" height="42" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="185" y="211" text-anchor="middle" font-size="12" fill="currentColor">Hết 7 ngày → final, withdrawal OK</text>
<text x="185" y="252" text-anchor="middle" font-size="11" fill="currentColor">Giả định: ≥1 verifier trung thực (1-of-N)</text>
<rect x="370" y="30" width="330" height="240" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="535" y="55" text-anchor="middle" font-size="14" fill="currentColor">ZK rollup</text>
<rect x="400" y="75" width="270" height="42" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="535" y="101" text-anchor="middle" font-size="12" fill="currentColor">Đăng batch + state root + validity proof</text>
<rect x="400" y="130" width="270" height="42" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="535" y="150" text-anchor="middle" font-size="12" fill="currentColor">L1 verifier kiểm proof (rẻ, tức thì)</text>
<text x="535" y="166" text-anchor="middle" font-size="11" fill="currentColor">proof sai → bị từ chối ngay</text>
<rect x="400" y="185" width="270" height="42" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="535" y="211" text-anchor="middle" font-size="12" fill="currentColor">Verify xong → final, withdrawal OK</text>
<text x="535" y="252" text-anchor="middle" font-size="11" fill="currentColor">Giả định: soundness mật mã, không cần canh</text>
</svg>

### 2.5 Sequencer — kẻ xếp thứ tự, và ranh giới quyền lực của nó

**Sequencer** là thành phần nhận tx của user, **quyết định thứ tự** và tạo block L2 (thường near-instant, cho "soft confirmation" trước khi batch lên L1). Hiện tại hầu hết rollup có **một sequencer tập trung** do team vận hành. Rủi ro của nó:

| Sequencer CÓ THỂ làm | Sequencer KHÔNG THỂ làm |
|----------------------|-------------------------|
| Kiểm duyệt (censor) — không nhận tx của bạn | **Ăn trộm/đúc tiền** — state phải hợp lệ (fraud/validity proof chặn) |
| Sắp thứ tự để hưởng **MEV**, reorder | Tạo state sai mà lọt qua L1 |
| Ngừng hoạt động (liveness fail) → L2 "đứng hình" | Chặn vĩnh viễn user rút tiền (nhờ forced inclusion) |

Điểm mấu chốt để hiểu bảo mật rollup: **sequencer tập trung là vấn đề về *liveness* và *censorship*, KHÔNG phải về *safety*.** Kể cả sequencer độc ác, nó vẫn không thể lấy tiền của bạn, vì mọi state transition đều bị L1 kiểm (bằng fraud proof hoặc validity proof). Đây là khác biệt lớn giữa **rollup** và **sidechain** (sidechain có validator riêng, sai là mất tiền thật).

### 2.6 Forced inclusion & escape hatch — cửa thoát hiểm

Nếu sequencer kiểm duyệt hoặc chết, làm sao user vẫn rút được tiền? Câu trả lời: **forced inclusion** thông qua một hàng đợi trên **L1**.

- User gửi tx **trực tiếp lên contract inbox ở L1** (không qua sequencer).
- Sequencer buộc phải đưa tx đó vào batch trong một thời hạn (ví dụ 24h). Quá hạn, **bất kỳ ai** cũng có quyền "force" bao gồm nó, hoặc rollup vào chế độ cho phép user tự advance state.
- Cơ chế này biến **quyền rút tiền** thành thứ được L1 bảo chứng, không phụ thuộc thiện chí sequencer → **censorship resistance**.

Đây là lý do "sequencer tập trung nhưng vẫn phi tập trung ở tầng bảo mật": bạn luôn có **escape hatch** về L1. Lộ trình dài hạn là **decentralized/shared sequencer** (nhiều bên luân phiên) để giảm cả rủi ro liveness lẫn MEV.

### 2.7 Data availability & EIP-4844 (blobs)

Chi phí lớn nhất của rollup là **đăng data lên L1**. Trước đây dùng calldata rất đắt. **EIP-4844 (proto-danksharding, 3/2024)** thêm **blob** — vùng dữ liệu tạm, rẻ hơn nhiều, chỉ tồn tại ~18 ngày (đủ để ai cần thì dựng lại state). Nhờ blobs, phí giao dịch trên các rollup giảm mạnh. Đây là trụ cột của **rollup-centric roadmap** của Ethereum: L1 lo bảo mật + DA, còn execution đẩy hết lên L2.

> Nếu dữ liệu **không** đăng lên L1 mà giữ off-chain (chỉ đăng proof) → đó là **validium** (ZK) hoặc **optimium**, rẻ hơn nhưng đánh đổi bằng giả định DA off-chain: dữ liệu bị giấu thì user có thể kẹt tiền.

---

## 3. Minh hoạ code — bộ khung rollup contract (rút gọn)

Đoạn Solidity dưới đây **minh hoạ ý tưởng** (không phải production) một rollup inbox trên L1: nhận batch từ sequencer, giữ hàng đợi **forced inclusion**, và điểm khác nhau giữa hàm xác nhận state của Optimistic vs ZK.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Minh hoạ tối giản một rollup contract trên L1 (không dùng cho production).
contract RollupInbox {
    address public sequencer;
    bytes32 public stateRoot;              // "con dấu" state hiện tại của L2

    // Hàng đợi forced-inclusion: tx user gửi thẳng lên L1
    struct ForcedTx { bytes data; uint256 deadline; bool consumed; }
    ForcedTx[] public forcedQueue;

    event BatchPosted(bytes32 newRoot, bytes32 dataHash);
    event ForcedTxQueued(uint256 index, uint256 deadline);

    constructor(address _sequencer, bytes32 _genesis) {
        sequencer = _sequencer;
        stateRoot = _genesis;
    }

    // (1) Sequencer đăng data + state root mới. `batchData` chính là DATA AVAILABILITY:
    //     dữ liệu tx nén, ai cũng đọc được để tự dựng lại state L2.
    function postBatch(bytes calldata batchData, bytes32 newRoot) external {
        require(msg.sender == sequencer, "only sequencer");
        emit BatchPosted(newRoot, keccak256(batchData));
        // Optimistic: nhận newRoot NGAY, mở challenge window (xem finalize()).
        // ZK:        thay bằng verifyProof(...) trước khi gán stateRoot (xem dưới).
        stateRoot = newRoot;
    }

    // (2) Forced inclusion: user không cần sequencer, gửi thẳng tx lên L1.
    function forceInclude(bytes calldata txData) external {
        uint256 deadline = block.timestamp + 24 hours;
        forcedQueue.push(ForcedTx(txData, deadline, false));
        emit ForcedTxQueued(forcedQueue.length - 1, deadline);
        // Nếu sequencer bỏ qua quá deadline → mở chế độ cho phép advance state,
        // bảo đảm user luôn rút được tiền (censorship resistance).
    }
}
```

Điểm khác biệt giữa hai trường phái nằm ở cách **finalize** state root:

```solidity
// --- Optimistic: tin trước, mở cửa sổ thách thức ~7 ngày ---
uint256 public constant CHALLENGE_PERIOD = 7 days;
mapping(bytes32 => uint256) public postedAt;   // root => thời điểm đăng

function finalizeOptimistic(bytes32 root) external view returns (bool) {
    // Chỉ final khi hết 7 ngày mà KHÔNG có fraud proof lật nó.
    return block.timestamp >= postedAt[root] + CHALLENGE_PERIOD;
}

// challengeFraudProof(...) — nơi verifier nộp bằng chứng state sai:
//   Arbitrum: interactive bisection → L1 chạy đúng 1 bước VM để phân xử.
//   Nếu gian lận: rollback root + slash bond của proposer.

// --- ZK: chứng minh ngay, final tức thì ---
IVerifier public verifier;   // verifier contract (SNARK/STARK) trên L1

function postBatchZk(bytes calldata batchData, bytes32 newRoot, bytes calldata proof) external {
    require(msg.sender == sequencer, "only sequencer");
    // proof chứng minh: apply(batchData) lên (stateRoot) => (newRoot) là ĐÚNG.
    require(verifier.verify(stateRoot, newRoot, keccak256(batchData), proof), "bad proof");
    stateRoot = newRoot;     // đúng proof => final NGAY, không cần chờ 7 ngày
}
```

Đọc kỹ sự đối lập: **Optimistic** gán `stateRoot` ngay rồi *chờ 7 ngày để chắc chắn*; **ZK** *chứng minh trước rồi mới gán* nên final tức thì. Cả hai đều đăng `batchData` lên L1 → cùng đảm bảo data availability.

---

## 4. So sánh trade-off Optimistic vs ZK

| Tiêu chí | Optimistic rollup | ZK rollup |
|----------|-------------------|-----------|
| **Cơ chế đúng đắn** | Fraud proof (phản chứng khi có gian lận) | Validity proof (chứng minh đúng mỗi batch) |
| **Withdrawal về L1** | Chậm — chờ challenge period ~7 ngày | Nhanh — ngay khi proof được verify |
| **Chi phí tính toán** | Rẻ khi "êm"; đắt gas chỉ khi có tranh chấp | Prover nặng CPU; verify on-chain lại rẻ |
| **Tương thích EVM** | Cao (chạy EVM gần như nguyên bản) | Khó hơn (zkEVM type 1→4); Cairo/VM riêng |
| **Giả định bảo mật** | Cần ≥1 verifier trung thực (1-of-N), online trong 7 ngày | Soundness mật mã (không cần ai canh) |
| **Độ trưởng thành** | Sớm hơn, hệ dApp lớn | Đang chín nhanh, prover/toolchain phức tạp |
| **Ví dụ** | Arbitrum, Optimism, Base | zkSync Era, StarkNet, Polygon zkEVM, Scroll |

> **Quy tắc chọn:** cần **tương thích EVM tối đa & hệ sinh thái sẵn** và chấp nhận rút chậm → **Optimistic**. Cần **finality nhanh, không tin verifier, bảo mật mật mã** (thanh toán, sàn, cầu nối) → **ZK**. Về dài hạn, ZK được xem là đích đến khi prover đủ rẻ; Optimistic thắng ở *time-to-market* và tương thích.

---

## 5. Tình huống thực tế
- **Rút tiền từ Arbitrum về Ethereum**: bridge chính thức bắt chờ ~7 ngày (challenge period). Muốn rút ngay → dùng bridge bên thứ ba (Hop, Across) — họ ứng thanh khoản cho bạn và tự chờ 7 ngày, thu phí.
- **Sequencer Arbitrum từng downtime vài giờ (2023)**: user không giao dịch được, nhưng **không mất tiền** — vì safety do L1 bảo đảm, và forced inclusion vẫn là đường thoát.
- **StarkNet dùng STARK**: không cần "trusted setup" (khác nhiều SNARK), chống lượng tử tốt hơn, đổi lại proof size lớn hơn.

---

## 6. Tóm tắt
- **Rollup = execute off-chain, post data on-chain**: L2 chạy tx, L1 giữ **data (DA)** + **state root** để neo bảo mật.
- **Optimistic** (Arbitrum, Optimism): tin trước, **fraud proof** trong **challenge period ~7 ngày**; tương thích EVM cao, rút chậm, cần 1-of-N verifier trung thực.
- **ZK** (zkSync, StarkNet): **validity proof** mỗi batch → L1 verify → **finality nhanh**, bảo mật mật mã; đổi lại prover nặng và EVM khó hơn.
- **Sequencer** tập trung là rủi ro **liveness/censorship**, KHÔNG phải safety — không thể ăn trộm tiền.
- **Forced inclusion / escape hatch** trên L1 bảo đảm user luôn rút được → censorship resistance.
- **EIP-4844 blobs** hạ chi phí DA, là nền cho **rollup-centric roadmap** của Ethereum.

> **Bài tiếp theo:** đi sâu vào **bridge & interoperability** — cách tài sản và message di chuyển an toàn giữa L1 ↔ L2 và giữa các chain, cùng những vụ hack cầu nối đắt giá nhất.
