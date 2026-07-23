# Bài 32 — Data availability, danksharding & modular blockchain

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **bài toán data availability (DA)** — vì sao rollup **bắt buộc** cần dữ liệu được công bố, chứ không chỉ cần một proof "đúng".
- Phân biệt **data availability** vs **data storage** vs **execution** — ba thứ hay bị nhầm.
- Nói rõ **data availability sampling (DAS)** hoạt động thế nào để light node xác minh "dữ liệu có thật" mà không tải cả block, và vai trò của **erasure coding + KZG commitment**.
- Đọc hiểu **EIP-4844 (proto-danksharding)** — blob là gì, `blobhash`, blob gas riêng, và lộ trình tới **danksharding**.
- Vẽ được **kiến trúc modular blockchain** — tách 4 tầng execution / settlement / consensus / data availability — và biết **Celestia** đứng ở đâu.

---

## 2. Lý thuyết

### 2.1 Analogy — nhà thầu nộp bản vẽ, không chỉ nộp lời hứa

Tưởng tượng một tòa nhà thuê nhà thầu (rollup) làm phần thi công, còn chủ đầu tư (Layer-1) chỉ nghiệm thu. Nhà thầu nói: *"Tôi có bằng chứng toán học rằng tôi đã tính đúng toàn bộ kết cấu"* — và bằng chứng đó **đúng thật**. Nhưng nếu nhà thầu **giấu luôn bản vẽ chi tiết**, thì khi có sự cố, không ai — kể cả người mua căn hộ — có thể **tự dựng lại hiện trạng** để rút tiền/rời đi.

Đó chính xác là bài toán DA: một proof chứng minh **"phép tính đúng"**, nhưng **không** chứng minh **"dữ liệu đầu vào đã được công bố cho mọi người"**. Nếu dữ liệu bị giấu, người dùng không thể tự tính lại số dư của mình để thoát khỏi rollup. **Proof đúng nhưng data bị giấu = tiền vẫn kẹt.**

### 2.2 Vì sao rollup cần data availability

Nhắc lại (từ bài về Layer-2): rollup **chạy giao dịch off-chain**, rồi đăng lên L1:
- **State root mới** (kết quả sau khi thực thi),
- **Dữ liệu giao dịch** (calldata/blob) đủ để bất kỳ ai **tái dựng lại state**.

Với **ZK-rollup**, có validity proof đảm bảo state root mới là đúng. Với **optimistic rollup**, có cửa sổ challenge để ai đó nộp fraud proof. Cả hai đều **giả định một điều kiện sống còn**: dữ liệu giao dịch **đã thực sự available** (công bố ra để tải được).

<svg viewBox="0 0 720 250" role="img" aria-labelledby="da-t da-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="da-t">Vì sao rollup cần data availability</title>
<desc id="da-d">So sánh hai kịch bản: data được công bố thì người dùng tự thoát được, data bị giấu thì tiền kẹt</desc>
<text x="180" y="24" text-anchor="middle" font-size="14" fill="currentColor">Data ĐƯỢC công bố</text>
<rect x="70" y="45" width="220" height="45" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="180" y="72" text-anchor="middle" font-size="12" fill="currentColor">L1 giữ tx data + state root</text>
<rect x="70" y="110" width="220" height="45" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="180" y="131" text-anchor="middle" font-size="12" fill="currentColor">User tái dựng số dư</text>
<text x="180" y="147" text-anchor="middle" font-size="11" fill="currentColor">→ tự rút / force-exit được</text>
<line x1="180" y1="90" x2="180" y2="110" stroke="currentColor" stroke-width="1.5" marker-end="url(#da-ah)"/>
<text x="540" y="24" text-anchor="middle" font-size="14" fill="currentColor">Data BỊ giấu</text>
<rect x="430" y="45" width="220" height="45" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="540" y="66" text-anchor="middle" font-size="12" fill="currentColor">L1 chỉ có state root</text>
<text x="540" y="82" text-anchor="middle" font-size="11" fill="currentColor">(proof đúng, nhưng data ẩn)</text>
<rect x="430" y="110" width="220" height="45" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="540" y="131" text-anchor="middle" font-size="12" fill="currentColor">User KHÔNG biết số dư mới</text>
<text x="540" y="147" text-anchor="middle" font-size="11" fill="currentColor">→ tiền kẹt, không thoát được</text>
<line x1="540" y1="90" x2="540" y2="110" stroke="currentColor" stroke-width="1.5" marker-end="url(#da-ah)"/>
<text x="360" y="200" text-anchor="middle" font-size="12" fill="currentColor">Validity/fraud proof đảm bảo "tính đúng"; DA đảm bảo "dữ liệu tồn tại để dùng lại"</text>
<text x="360" y="222" text-anchor="middle" font-size="11" fill="currentColor">Đây là hai thuộc tính KHÁC nhau — cần cả hai</text>
<defs><marker id="da-ah" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Data withholding attack**: một sequencer độc hại có thể đăng state root + proof hợp lệ nhưng **không công bố dữ liệu**. Trong optimistic rollup, không ai tính được fraud proof (vì thiếu input) → hệ thống đóng băng. Trong ZK-rollup, proof vẫn đúng nhưng người dùng **mất khả năng tự dựng state để rút** nếu sequencer nghỉ. Vì vậy DA là **điều kiện cần** cho tính an toàn của mọi rollup.

### 2.3 Ba khái niệm dễ nhầm

| Khái niệm | Câu hỏi trả lời | Ai lo |
|-----------|-----------------|-------|
| **Execution** | Giao dịch chạy có đúng không? | Rollup / EVM |
| **Data availability** | Dữ liệu **đã được công bố** để ai cũng tải được **tại thời điểm đó** chưa? | DA layer |
| **Data storage** | Dữ liệu có được **giữ mãi mãi** không? | Không phải việc của DA — archive node, indexer |

Điểm mấu chốt: DA **không** phải là "lưu trữ vĩnh viễn". DA chỉ cần đảm bảo: **tại thời điểm block công bố, toàn bộ dữ liệu đã thực sự phát ra mạng** để bất kỳ ai muốn đều tải được và lưu lại. Sau đó dữ liệu có thể bị prune — vì ai cần đã kịp lấy. Đây là lý do EIP-4844 blob chỉ giữ ~18 ngày (xem 2.6).

### 2.4 Bài toán "chứng minh dữ liệu tồn tại" khó ở đâu

Một light node muốn chắc chắn "cả block data đã available" mà **không tải cả block** (vì như thế thì hết nhẹ). Có một tấn công tinh vi: publisher công bố **99%** dữ liệu, giấu đi **1%** quan trọng. Nếu light node chỉ tải vài mẫu ngẫu nhiên, xác suất rơi trúng đúng 1% bị giấu là rất thấp → nó tưởng OK. Làm sao phát hiện việc giấu **một phần nhỏ**?

Lời giải gồm **hai mảnh ghép**:

1. **Erasure coding (Reed-Solomon)** — "phóng đại" phần bị giấu.
2. **Data availability sampling (DAS)** — lấy mẫu ngẫu nhiên nhiều lần để đạt xác suất tin cậy cao.

### 2.5 Erasure coding + DAS — trái tim của DA hiện đại

**Erasure coding**: lấy `k` mảnh dữ liệu gốc, mã hóa thành `2k` mảnh (tỉ lệ 2×), với tính chất: **chỉ cần bất kỳ `k` trong `2k` mảnh là khôi phục lại được toàn bộ**. Hệ quả then chốt cho DA:

> Nếu publisher muốn **giấu dù chỉ một byte** dữ liệu gốc, họ buộc phải giấu **hơn 50%** số mảnh đã mã hóa (nếu giấu ≤ 50%, ai đó ghép `k` mảnh còn lại là dựng lại được thứ họ định giấu).

Việc giấu "1% dữ liệu" giờ biến thành phải giấu ">50% số mảnh". Và giấu >50% thì **rất dễ bị bắt** bằng lấy mẫu ngẫu nhiên.

**Data availability sampling (DAS)**: mỗi light node yêu cầu ngẫu nhiên vài mảnh nhỏ. Nếu >50% mảnh bị giấu, thì mỗi lần lấy 1 mẫu ngẫu nhiên có xác suất **≥ 50%** trúng mảnh bị giấu (fail). Sau `s` lần lấy mẫu độc lập, xác suất light node **bị lừa** (không phát hiện) ≤ `0.5^s`. Với `s = 30` mẫu → xác suất bị lừa ≤ `2^-30` ≈ một phần tỷ. Nhiều light node cùng sample → xác suất giấu thành công của kẻ tấn công gần như bằng 0.

<svg viewBox="0 0 720 290" role="img" aria-labelledby="das-t das-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="das-t">Data availability sampling với erasure coding</title>
<desc id="das-d">Dữ liệu gốc được mã hóa Reed-Solomon thành gấp đôi, light node lấy mẫu ngẫu nhiên nhiều lần</desc>
<text x="360" y="24" text-anchor="middle" font-size="14" fill="currentColor">Erasure coding: k mảnh gốc → 2k mảnh mã hóa</text>
<text x="130" y="52" text-anchor="middle" font-size="12" fill="currentColor">Gốc (k)</text>
<rect x="60" y="60" width="30" height="30" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="92" y="60" width="30" height="30" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="124" y="60" width="30" height="30" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="156" y="60" width="30" height="30" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="470" y="52" text-anchor="middle" font-size="12" fill="currentColor">Mã hóa (2k) — thêm mảnh dư (parity)</text>
<rect x="300" y="60" width="30" height="30" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="332" y="60" width="30" height="30" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="364" y="60" width="30" height="30" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="396" y="60" width="30" height="30" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="428" y="60" width="30" height="30" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="460" y="60" width="30" height="30" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="492" y="60" width="30" height="30" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="524" y="60" width="30" height="30" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<line x1="200" y1="75" x2="296" y2="75" stroke="currentColor" stroke-width="1.5" marker-end="url(#das-ah)"/>
<text x="360" y="130" text-anchor="middle" font-size="11" fill="currentColor">Muốn giấu 1 mảnh gốc → buộc phải giấu &gt; 50% số mảnh mã hóa</text>
<rect x="150" y="160" width="120" height="45" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="210" y="182" text-anchor="middle" font-size="12" fill="currentColor">Light node</text>
<text x="210" y="198" text-anchor="middle" font-size="11" fill="currentColor">lấy 30 mẫu ngẫu nhiên</text>
<rect x="450" y="160" width="140" height="45" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="520" y="182" text-anchor="middle" font-size="12" fill="currentColor">Đủ mẫu trả về</text>
<text x="520" y="198" text-anchor="middle" font-size="11" fill="currentColor">→ tin data available</text>
<line x1="270" y1="182" x2="446" y2="182" stroke="currentColor" stroke-width="1.5" marker-end="url(#das-ah)"/>
<text x="360" y="245" text-anchor="middle" font-size="12" fill="currentColor">Nếu &gt;50% bị giấu: mỗi mẫu trượt xác suất ≥ 50% → sau 30 mẫu, P(bị lừa) ≤ 2⁻³⁰</text>
<text x="360" y="267" text-anchor="middle" font-size="11" fill="currentColor">Nhiều light node cùng sample → mạng tự khôi phục &amp; phát hiện giấu data</text>
<defs><marker id="das-ah" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Còn một rủi ro nữa: publisher **mã hóa sai** (fake erasure coding) để mẫu trông hợp lệ nhưng không dựng lại được. Hai cách chống:
- **Fraud proof cho erasure coding** (cách của Celestia thời đầu): ai phát hiện mã hóa sai thì nộp bằng chứng.
- **KZG polynomial commitment** (cách của Ethereum danksharding): cam kết dữ liệu bằng đa thức, mỗi mẫu kèm **KZG proof** chứng minh mảnh đó **đúng nằm trên đa thức đã cam kết** — không cần fraud proof, xác minh trực tiếp bằng pairing. Đây là lý do EIP-4844 dùng KZG.

### 2.6 EIP-4844 — proto-danksharding & blob

Trước 4844, rollup đăng data vào **calldata** — vừa đắt (calldata cạnh tranh gas với mọi giao dịch khác), vừa **được lưu vĩnh viễn** một cách lãng phí (DA không cần lưu mãi). **EIP-4844 (Dencun, 3/2024)** giới thiệu **blob-carrying transaction**:

- **Blob** = một khối dữ liệu **~128 KB** (4096 field element × 32 byte), gắn kèm giao dịch nhưng **KHÔNG** vào EVM state, EVM **không đọc được nội dung blob**.
- EVM chỉ thấy **versioned hash** của blob qua opcode `BLOBHASH` (0x49) — một commitment 32-byte.
- Blob dùng **thị trường phí riêng** (`blob gas`), tách khỏi gas thường → data không tranh chấp với execution, phí rollup giảm mạnh (thường 10–100×).
- Blob **chỉ được giữ ~18 ngày** (4096 epoch) rồi node xóa. Đúng tinh thần DA: đủ lâu để mọi bên tải về, không lưu vĩnh viễn.
- Mỗi block target **3 blob**, tối đa **6 blob** (giới hạn thời 4844; các bản nâng cấp sau tăng dần).

"Proto-danksharding" = **bước đệm**: đã có blob + KZG commitment + blob gas market, **nhưng chưa có DAS**. Node vẫn tải **toàn bộ** blob. Đây là móng cho **danksharding** đầy đủ.

Ví dụ đọc blob hash trong Solidity (contract của rollup verify commitment):

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24; // cần >=0.8.24 để có BLOBHASH & blob base fee

contract BlobConsumer {
    // Lưu lại versioned hash của blob mà sequencer đính kèm giao dịch này
    bytes32 public lastBlobHash;

    /// @notice Đọc versioned hash của blob thứ `index` gắn với tx hiện tại.
    /// blobhash(i) trả về 0x00..00 nếu index vượt số blob của tx.
    function recordBlob(uint256 index) external {
        bytes32 h = blobhash(index); // opcode BLOBHASH (0x49)
        require(h != bytes32(0), "no blob at index");
        // Byte đầu là version (0x01 = KZG). Rollup sẽ dùng hash này
        // để đối chiếu với KZG proof được verify bởi precompile 0x0A.
        require(h[0] == 0x01, "unexpected blob version");
        lastBlobHash = h;
    }

    /// @notice Phí blob hiện tại (wei / blob gas), tách khỏi base fee thường.
    function currentBlobBaseFee() external view returns (uint256) {
        return block.blobbasefee; // opcode BLOBBASEFEE (0x4a)
    }
}
```

> **Cạm bẫy thực chiến:** `blobhash(index)` **không** cho bạn nội dung blob — chỉ cho commitment. Muốn chứng minh "blob chứa đúng dữ liệu D" thì rollup gọi **point-evaluation precompile** (`0x0A`) để verify một KZG proof: "tại điểm x, đa thức của blob nhận giá trị y". Đó là cách ZK-rollup ràng buộc blob data với state transition mà không cần EVM đọc 128 KB.

### 2.7 Danksharding — đích đến

**Danksharding** (đặt theo tên Dankrad Feist) mở rộng blob từ 6 lên hàng chục–hàng trăm blob/block (mục tiêu ~**16–64 MB DA/block**), nhưng **không** node nào phải tải hết. Cơ chế:
- Blob của cả block được xếp thành **ma trận 2D**, erasure-code theo cả hàng và cột.
- **KZG commitment** cho từng phần → mỗi mẫu tự verify được.
- **DAS**: mỗi node (kể cả light node) chỉ lấy vài mẫu ngẫu nhiên → cả mạng cộng lại đảm bảo toàn bộ data available mà **mỗi node chỉ tải một phần nhỏ**.
- **PBS (proposer-builder separation)** giúp một "builder" mạnh dựng block lớn, còn "proposer" thường vẫn nhẹ.

Kết quả: DA throughput tăng bậc thang trong khi yêu cầu phần cứng của node **không** tăng theo — mấu chốt để rollup rẻ ở quy mô lớn. Proto-danksharding (4844) đã lắp sẵn blob + KZG; danksharding chỉ còn thêm **DAS + mở rộng số blob**.

### 2.8 Modular blockchain — tách tầng

Blockchain "monolithic" (như Ethereum L1 thuần, Bitcoin, Solana) tự làm **cả 4 việc** trong cùng một lớp. **Modular** tách chúng ra để mỗi tầng tối ưu & mở rộng độc lập:

| Tầng | Trả lời câu hỏi | Ví dụ chuyên trách |
|------|-----------------|--------------------|
| **Execution** | Chạy giao dịch, cập nhật state | Arbitrum, Optimism, zkSync, Starknet |
| **Settlement** | Trọng tài tranh chấp, chốt finality, cầu nối | Ethereum L1, một số dùng L1 làm settlement |
| **Consensus** | Sắp thứ tự giao dịch (ordering) | Tendermint, Ethereum PoS |
| **Data availability** | Đảm bảo data được công bố | **Celestia**, EigenDA, Avail, Ethereum blob |

Consensus + DA thường gộp (đều là "cả mạng đồng thuận về data & thứ tự"). Settlement có thể trùng execution hoặc tách. "Modular thesis": rollup thuê ngoài DA + consensus + settlement, chỉ **tập trung vào execution** — nơi tạo giá trị và cạnh tranh.

<svg viewBox="0 0 720 320" role="img" aria-labelledby="mod-t mod-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="mod-t">Monolithic vs modular blockchain</title>
<desc id="mod-d">Bên trái một khối làm tất cả, bên phải bốn tầng execution settlement consensus data availability tách riêng</desc>
<text x="150" y="24" text-anchor="middle" font-size="14" fill="currentColor">Monolithic</text>
<rect x="55" y="45" width="190" height="230" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="150" y="120" text-anchor="middle" font-size="12" fill="currentColor">Execution</text>
<text x="150" y="150" text-anchor="middle" font-size="12" fill="currentColor">Settlement</text>
<text x="150" y="180" text-anchor="middle" font-size="12" fill="currentColor">Consensus</text>
<text x="150" y="210" text-anchor="middle" font-size="12" fill="currentColor">Data availability</text>
<text x="150" y="255" text-anchor="middle" font-size="11" fill="currentColor">1 lớp làm tất cả</text>
<text x="520" y="24" text-anchor="middle" font-size="14" fill="currentColor">Modular</text>
<rect x="390" y="45" width="260" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="520" y="66" text-anchor="middle" font-size="12" fill="currentColor">Execution — Rollup (Arbitrum, zkSync)</text>
<text x="520" y="82" text-anchor="middle" font-size="11" fill="currentColor">chạy tx, tạo proof</text>
<rect x="390" y="100" width="260" height="45" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="520" y="121" text-anchor="middle" font-size="12" fill="currentColor">Settlement — Ethereum L1</text>
<text x="520" y="137" text-anchor="middle" font-size="11" fill="currentColor">verify proof, xử tranh chấp, bridge</text>
<rect x="390" y="155" width="260" height="45" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="520" y="176" text-anchor="middle" font-size="12" fill="currentColor">Consensus — sắp thứ tự</text>
<text x="520" y="192" text-anchor="middle" font-size="11" fill="currentColor">Tendermint / Ethereum PoS</text>
<rect x="390" y="210" width="260" height="45" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="520" y="231" text-anchor="middle" font-size="12" fill="currentColor">Data availability — Celestia / blob</text>
<text x="520" y="247" text-anchor="middle" font-size="11" fill="currentColor">công bố data + DAS</text>
<text x="520" y="290" text-anchor="middle" font-size="11" fill="currentColor">Mỗi tầng mở rộng &amp; tối ưu độc lập, rollup chỉ lo Execution</text>
</svg>

### 2.9 Celestia — DA layer chuyên dụng đầu tiên

**Celestia** là blockchain **chỉ làm consensus + DA**, cố tình **không có smart contract execution**. Nó không quan tâm giao dịch bên trong blob nói gì — chỉ đảm bảo **thứ tự** và **tính available** của data. Đặc điểm kỹ thuật:

- **Namespaced Merkle Tree (NMT)**: mỗi rollup có một **namespace** riêng; một rollup chỉ cần tải phần data thuộc namespace của nó, và chứng minh được "đã lấy đủ, không sót" — không phải tải cả block của mọi rollup.
- **DAS bằng erasure coding 2D + fraud proof** cho mã hóa sai (khác Ethereum dùng KZG). Light node của Celestia làm DAS thật sự → an ninh không cần tin full node.
- **Consensus**: Tendermint/CometBFT (PoS, finality tức thì).
- Rollup xây trên Celestia gọi là **"sovereign rollup"** (tự quyết fork/nâng cấp, dùng Celestia chỉ cho ordering + DA) hoặc dùng Celestia làm DA còn **settle** trên Ethereum (**Celestium / off-chain DA** kiểu validium).

**So sánh nhanh các lựa chọn DA:**

| DA option | Cơ chế xác minh | Ưu | Nhược |
|-----------|-----------------|-----|-------|
| **Ethereum blob (4844)** | KZG, chưa DAS (node tải hết) | An ninh Ethereum, cùng hệ | Đắt hơn, throughput giới hạn (chờ danksharding) |
| **Celestia** | Erasure 2D + fraud proof, có DAS | DA rẻ, throughput cao, light node thật | Tin thêm một tập validator ngoài Ethereum |
| **EigenDA / Avail** | Restaking / KZG, DAC | Rẻ, throughput lớn | Mô hình tin cậy khác, mới |
| **Validium (off-chain, DAC)** | Uỷ ban lưu data (DAC) | Rẻ nhất | Nếu DAC giấu data → tiền có thể kẹt |

> **Phổ an ninh:** đăng data on-chain (rollup thuần) an toàn nhất nhưng đắt nhất; **validium** (data off-chain do DAC giữ) rẻ nhất nhưng đánh đổi giả định tin cậy. Celestia/EigenDA nằm giữa: DA phi tập trung nhưng tách khỏi settlement layer. Chọn DA là **chọn điểm trên phổ an ninh–chi phí**, không có lựa chọn "đúng tuyệt đối".

---

## 3. Ví dụ end-to-end: một batch rollup dùng Ethereum blob

1. **Sequencer** của rollup gom hàng nghìn giao dịch L2, thực thi off-chain, tính **state root mới**.
2. Nén dữ liệu giao dịch, đóng gói vào **blob (~128 KB)**, tạo **KZG commitment** → **versioned hash**.
3. Gửi **blob transaction** (type 0x03) lên Ethereum L1: kèm blob + state root; L1 trả **blobhash** cho contract.
4. **Contract rollup trên L1** lưu blobhash, và (với ZK-rollup) verify **validity proof** + **point-evaluation precompile** để ràng buộc blob data ↔ state transition.
5. Consensus của Ethereum đảm bảo blob **được công bố cho toàn mạng** (DA). Sau ~18 ngày blob bị prune — nhưng ai cần đã tải xong.
6. Bất kỳ ai cũng có thể **tái dựng state L2** từ blob data → tự **force-exit** kể cả khi sequencer biến mất.

---

## 4. Tóm tắt
- **Data availability** trả lời *"dữ liệu đã được công bố để ai cũng tải được chưa?"* — **khác** với *"phép tính có đúng không?"* (proof) và *"có lưu vĩnh viễn không?"* (storage).
- Rollup **bắt buộc** cần DA: proof đúng nhưng data bị giấu = user không dựng lại được state → **tiền kẹt** (data withholding attack).
- **Erasure coding** biến "giấu một chút data" thành "phải giấu >50% mảnh"; **DAS** lấy mẫu ngẫu nhiên để light node đạt độ tin cậy ~1 − 2⁻³⁰ mà **không tải cả block**. **KZG** (Ethereum) hoặc **fraud proof** (Celestia) chống mã hóa sai.
- **EIP-4844 (proto-danksharding)**: blob ~128 KB, `blobhash`/`BLOBBASEFEE`, blob gas market riêng, prune sau ~18 ngày — đã có KZG **nhưng chưa DAS**. **Danksharding** thêm DAS + mở rộng blob lên chục MB/block.
- **Modular blockchain** tách 4 tầng — **execution / settlement / consensus / DA** — để mở rộng độc lập; **Celestia** là DA layer chuyên dụng (NMT namespace, DAS, fraud proof), rollup dùng nó để có DA rẻ.
- Chọn DA = chọn điểm trên **phổ an ninh–chi phí**: on-chain blob > Celestia/EigenDA > validium (DAC).

> **Bài tiếp theo:** đi sâu vào **cross-chain & interoperability** — bridge, light-client bridge, và vì sao bridge là điểm bị hack nhiều nhất trong crypto.
