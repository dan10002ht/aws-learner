# Bài 33 — Zero-knowledge proofs: SNARK vs STARK

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **bản chất zero-knowledge proof (ZKP)** qua ba tính chất **completeness, soundness, zero-knowledge** — không thuộc lòng định nghĩa mà hiểu vì sao chúng cần thiết.
- Kể lại **analogy hang Ali Baba** và ánh xạ từng bước sang giao thức mật mã thật.
- Phân biệt **interactive** vs **non-interactive** proof, và hiểu **Fiat–Shamir heuristic** biến cái này thành cái kia thế nào.
- So sánh **ZK-SNARK** vs **ZK-STARK** trên trusted setup, kích thước proof, thời gian verify, giả định mật mã và tính **hậu lượng tử (post-quantum)**.
- Nối ZKP với ứng dụng thật: **privacy** (Zcash, Tornado-style) và **scaling** (zkEVM / zk-rollup).

---

## 2. Lý thuyết

### 2.1 Vấn đề: chứng minh mà không tiết lộ

Trong đời thường, "chứng minh tôi biết X" thường đồng nghĩa với **đưa X ra**. Muốn chứng minh biết mật khẩu → gõ mật khẩu; muốn chứng minh đủ tiền → cho xem số dư. Nhưng làm lộ X là **đánh đổi**: server thấy mật khẩu, người bán thấy toàn bộ tài sản.

**Zero-knowledge proof** giải đúng bài này: cho phép **Prover** (người chứng minh) thuyết phục **Verifier** (người kiểm) rằng một mệnh đề đúng — *"tôi biết một bí mật thỏa điều kiện C"* — mà **không để lộ bất cứ thông tin nào** ngoài đúng một bit: mệnh đề đúng hay sai.

Một ZKP hợp lệ phải đạt **ba tính chất** đồng thời:

| Tính chất | Nghĩa | Bảo vệ ai? |
|-----------|-------|------------|
| **Completeness** | Nếu mệnh đề **đúng** và cả hai làm đúng giao thức, Verifier **luôn bị thuyết phục**. | Prover trung thực không bị từ chối oan. |
| **Soundness** | Nếu mệnh đề **sai**, Prover gian lận **gần như không thể** lừa Verifier chấp nhận (xác suất lừa được ~ tiến về 0). | Verifier không bị lừa. |
| **Zero-knowledge** | Verifier học được **đúng một bit** (true/false), **không gì khác** về bí mật. | Prover không bị lộ bí mật. |

Bit đáng giá nhất trong mật mã hiện đại: soundness cho niềm tin, zero-knowledge cho quyền riêng tư — và ZKP có **cả hai cùng lúc**.

### 2.2 Analogy — hang Ali Baba (Jean-Jacques Quisquater, 1990)

Hình dung một cái hang hình vòng, cửa vào chia làm hai nhánh **A** và **B**, nối nhau ở đáy bởi một **cửa ma thuật** chỉ mở nếu đọc đúng **thần chú**. Peggy (Prover) tuyên bố *"tôi biết thần chú"*, nhưng không muốn nói thần chú cho Victor (Verifier).

<svg viewBox="0 0 700 300" role="img" aria-labelledby="cave-t cave-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="cave-t">Giao thức hang Ali Baba</title>
<desc id="cave-d">Peggy đi vào một nhánh, Victor hô nhánh muốn thấy Peggy đi ra, cửa ma thuật ở đáy cho phép Peggy đổi nhánh nếu biết thần chú</desc>
<path d="M350 70 C 250 70 230 240 350 250 C 470 240 450 70 350 70" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="350" y1="70" x2="350" y2="250" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<rect x="335" y="235" width="30" height="12" rx="2" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="228" text-anchor="middle" font-size="11" fill="currentColor">cửa ma thuật</text>
<text x="300" y="150" text-anchor="middle" font-size="15" fill="currentColor">A</text>
<text x="400" y="150" text-anchor="middle" font-size="15" fill="currentColor">B</text>
<rect x="40" y="40" width="110" height="50" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="62" text-anchor="middle" font-size="12" fill="currentColor">Peggy (Prover)</text>
<text x="95" y="80" text-anchor="middle" font-size="11" fill="currentColor">vào 1 nhánh bí mật</text>
<rect x="550" y="40" width="110" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="605" y="62" text-anchor="middle" font-size="12" fill="currentColor">Victor (Verifier)</text>
<text x="605" y="80" text-anchor="middle" font-size="11" fill="currentColor">hô "ra nhánh A!"</text>
<text x="350" y="285" text-anchor="middle" font-size="11" fill="currentColor">Lặp 20 lần: Peggy luôn ra đúng nhánh Victor hô → xác suất ăn may 1/2^20 ≈ một phần triệu</text>
</svg>

Giao thức chạy theo **vòng lặp**:
1. **Commit:** Peggy đi vào hang, chọn ngẫu nhiên nhánh A **hoặc** B, khuất khỏi tầm mắt Victor.
2. **Challenge:** Victor đứng ở cửa, hô ngẫu nhiên tên nhánh muốn thấy Peggy đi ra: *"ra nhánh B!"*.
3. **Response:** Peggy đi ra đúng nhánh Victor yêu cầu.

Nếu Peggy **thật sự biết** thần chú: dù Victor hô nhánh nào, cô cũng ra đúng — mở cửa ma thuật để đổi nhánh khi cần. Nếu Peggy **không biết**: cô chỉ ra đúng khi *tình cờ* đã vào sẵn nhánh Victor hô — xác suất **1/2** mỗi vòng.

Đây chính là ánh xạ ba tính chất:
- **Completeness:** biết thần chú ⇒ luôn ra đúng ⇒ Victor luôn tin.
- **Soundness:** không biết ⇒ mỗi vòng lừa được với xác suất 1/2. Lặp **n** vòng, xác suất lừa trót lọt là **1/2ⁿ** — sau 20 vòng đã nhỏ hơn một phần triệu. Soundness không phải "tuyệt đối" mà là **soundness thống kê**: nhỏ tùy ý nếu lặp đủ nhiều.
- **Zero-knowledge:** Victor chỉ thấy Peggy ra đúng nhánh, **không bao giờ nghe thần chú**. Thậm chí đoạn video buổi kiểm chứng cũng vô giá trị với người thứ ba, vì Victor có thể **dàn dựng** một video y hệt bằng cách bảo trước Peggy sẽ hô nhánh nào — tính chất này gọi là **simulatability** (mô phỏng được), định nghĩa hình thức của zero-knowledge.

### 2.3 Interactive vs non-interactive & Fiat–Shamir

Giao thức hang là **interactive**: cần Victor **hô challenge ngẫu nhiên** ở mỗi vòng. Điều cốt tử là challenge phải **không đoán trước được** — nếu Peggy biết trước Victor sẽ hô gì, cô có thể vào sẵn nhánh đó mà chẳng cần thần chú. Interactive proof có hai bất tiện lớn:
- Prover và Verifier phải **online cùng lúc**, qua lại nhiều vòng.
- Proof **không tái sử dụng**: bằng chứng chỉ thuyết phục **đúng người** ra challenge; không public-verify được — vô dụng cho blockchain, nơi **hàng nghìn node** phải verify cùng một proof.

**Fiat–Shamir heuristic (1986)** biến interactive thành **non-interactive**: thay vì chờ Verifier hô challenge ngẫu nhiên, Prover **tự sinh challenge** bằng cách **băm (hash)** các commitment của chính mình:

```
challenge = Hash( public_statement || commitment )
```

Vì hàm hash (mô hình hóa như **random oracle**) cho ra giá trị *không đoán trước và không điều khiển được*, Prover **không thể chọn trước** challenge có lợi — đúng vai trò challenge ngẫu nhiên của Victor. Kết quả: Prover gói cả (commitment, challenge, response) thành **một chuỗi proof duy nhất**, ai cũng verify được offline, bất cứ lúc nào. Đây là bước làm ZKP **dùng được trên blockchain** — và chính là chữ **N (Non-interactive)** trong SNARK/STARK.

> Cảnh báo kỹ thuật: Fiat–Shamir chỉ an toàn nếu **hash toàn bộ** public statement + mọi commitment. Bỏ sót một phần đầu vào khỏi hash ("weak Fiat–Shamir") là lỗ hổng thật đã phá vỡ nhiều thư viện ZK sản xuất.

### 2.4 Từ "chứng minh biết thần chú" đến "chứng minh một phép tính"

Hang Ali Baba chỉ chứng minh *biết một bí mật*. ZKP hiện đại mạnh hơn nhiều: chứng minh *"tôi đã chạy đúng một chương trình và ra kết quả này"* mà không lộ input. Cơ chế: **mọi phép tính được biến thành một hệ ràng buộc đại số** (arithmetic circuit → R1CS, hoặc AIR), rồi Prover chứng minh mình biết một **nghiệm (witness)** thỏa toàn bộ ràng buộc. "Witness" chính là input bí mật + mọi giá trị trung gian. Đây là nền của cả SNARK lẫn STARK, và là thứ khiến **zkEVM** khả thi: coi *toàn bộ việc thực thi một block EVM* là một phép tính khổng lồ, rồi tạo một proof duy nhất chứng minh nó chạy đúng.

---

## 3. ZK-SNARK vs ZK-STARK

Cả hai đều là **non-interactive** và **zero-knowledge**. Khác biệt nằm ở **cách xây soundness** và **giả định mật mã** — kéo theo hàng loạt đánh đổi thực dụng.

- **SNARK** = *Succinct Non-interactive ARgument of Knowledge*. "Succinct" = proof **cực nhỏ** và verify **cực nhanh**, gần như không phụ thuộc kích thước phép tính.
- **STARK** = *Scalable Transparent ARgument of Knowledge*. "Transparent" = **không cần trusted setup**; "Scalable" = thời gian Prover tăng gần tuyến tính còn verify tăng theo log.

### 3.1 Trusted setup — điểm chia đôi thế giới

SNARK (dòng Groth16, PLONK) cần một **Common Reference String (CRS)** sinh ra trong một **trusted setup ceremony**. Quá trình này tạo ra tham số công khai từ một **bí mật ngẫu nhiên** (gọi là *toxic waste*). Nếu bí mật đó **bị lộ hoặc được giữ lại**, kẻ nắm nó có thể **giả mạo proof** cho mệnh đề sai — phá vỡ soundness mà **không ai phát hiện**. Vì thế các ceremony thật (như *Powers of Tau* của Zcash/Ethereum) dùng **multi-party computation**: hàng nghìn người góp phần ngẫu nhiên; **chỉ cần một người trung thực hủy phần của mình** là toxic waste an toàn.

STARK **không có bước này**: mọi tham số đều là hằng số công khai + đầu ra hàm hash. Đó là ý nghĩa của **"transparent"** — không có bí mật nào để lộ, không cần tin bất kỳ ceremony nào.

<svg viewBox="0 0 700 250" role="img" aria-labelledby="ts-t ts-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="ts-t">Trusted setup: SNARK cần, STARK không</title>
<desc id="ts-d">SNARK sinh proof từ CRS có toxic waste phải hủy; STARK sinh proof chỉ từ tham số công khai và hàm hash</desc>
<text x="175" y="24" text-anchor="middle" font-size="14" fill="currentColor">ZK-SNARK</text>
<rect x="90" y="45" width="170" height="45" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="175" y="66" text-anchor="middle" font-size="12" fill="currentColor">Trusted setup ceremony</text>
<text x="175" y="82" text-anchor="middle" font-size="11" fill="currentColor">sinh CRS + toxic waste ☢</text>
<rect x="90" y="120" width="170" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="175" y="145" text-anchor="middle" font-size="12" fill="currentColor">Prover → proof nhỏ</text>
<line x1="175" y1="90" x2="175" y2="118" stroke="currentColor" stroke-width="1.5" marker-end="url(#za)"/>
<text x="175" y="195" text-anchor="middle" font-size="11" fill="currentColor">Rủi ro: lộ toxic waste ⇒ giả mạo proof</text>
<line x1="350" y1="20" x2="350" y2="230" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<text x="525" y="24" text-anchor="middle" font-size="14" fill="currentColor">ZK-STARK</text>
<rect x="440" y="45" width="170" height="45" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="525" y="66" text-anchor="middle" font-size="12" fill="currentColor">Chỉ hằng số công khai</text>
<text x="525" y="82" text-anchor="middle" font-size="11" fill="currentColor">+ hàm hash (transparent)</text>
<rect x="440" y="120" width="170" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="525" y="145" text-anchor="middle" font-size="12" fill="currentColor">Prover → proof lớn</text>
<line x1="525" y1="90" x2="525" y2="118" stroke="currentColor" stroke-width="1.5" marker-end="url(#za)"/>
<text x="525" y="195" text-anchor="middle" font-size="11" fill="currentColor">Không có bí mật để lộ ⇒ không cần tin ai</text>
<defs><marker id="za" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 3.2 Giả định mật mã & hậu lượng tử

- **SNARK** dựa trên **elliptic-curve pairings** và độ khó của bài toán **discrete log**. Máy tính lượng tử đủ lớn (chạy thuật toán Shor) **phá được** discrete log ⇒ SNARK cổ điển **không hậu lượng tử**.
- **STARK** chỉ dựa trên **collision-resistance của hàm hash** (dạng Merkle/FRI). Hash không bị Shor phá; lượng tử chỉ giảm một nửa mức an toàn (Grover) — bù lại bằng tăng độ dài. Vì thế STARK được xem là **post-quantum secure**.

### 3.3 Bảng so sánh

| Tiêu chí | ZK-SNARK | ZK-STARK |
|----------|----------|----------|
| **Trusted setup** | **Cần** (CRS, có toxic waste); một số scheme setup dùng lại (PLONK) | **Không** — transparent |
| **Kích thước proof** | **Rất nhỏ** (~200 bytes – vài KB) | **Lớn** (~vài chục – hàng trăm KB) |
| **Thời gian verify** | Rất nhanh, gần **hằng số** | Nhanh, tăng theo **log** kích thước |
| **Thời gian Prover** | Nhanh–trung bình | Nhanh hơn khi mạch **rất lớn** (scalable) |
| **Giả định mật mã** | Pairings + discrete log | Chỉ hàm hash |
| **Hậu lượng tử** | **Không** (Shor phá được) | **Có** |
| **Độ trưởng thành / hệ sinh thái** | Chín, nhiều thư viện (Groth16, PLONK, Halo2) | Mới hơn, dẫn đầu bởi StarkWare (Cairo) |
| **On-chain cost** | Rẻ để verify (proof nhỏ ⇒ ít gas) | Đắt hơn (proof lớn ⇒ nhiều calldata/gas) |

> **Cách nhớ đánh đổi cốt lõi:** SNARK trả giá **niềm tin ban đầu** (trusted setup) để lấy **proof nhỏ, verify rẻ**. STARK bỏ trusted setup và có hậu lượng tử, nhưng trả giá bằng **proof lớn, verify đắt hơn**. Không có bên "thắng tuyệt đối" — chọn theo ràng buộc bài toán.

Lưu ý: ranh giới đang mờ dần. Các scheme mới (Halo2, dùng đường cong đệ quy) đạt SNARK **không trusted setup**; kỹ thuật **recursive proof / proof aggregation** nén nhiều proof (kể cả STARK lớn) thành một SNARK nhỏ để verify on-chain rẻ — kiến trúc lai phổ biến trong sản xuất.

---

## 4. Ứng dụng thực tế

### 4.1 Privacy — giao dịch ẩn danh

- **Zcash** dùng ZK-SNARK cho *shielded transaction*: chứng minh *"tôi sở hữu note đủ giá trị và tổng vào = tổng ra"* mà **giấu người gửi, người nhận và số tiền**. Sổ cái vẫn kiểm được tính hợp lệ (không double-spend) nhờ **nullifier** công khai, nhưng không lộ danh tính.
- **Mixer / private pool** (dạng Tornado): nạp tiền kèm một *commitment*; khi rút, chứng minh bằng ZKP rằng *"tôi biết secret ứng với một commitment đã nạp"* mà không chỉ ra **commitment nào** — cắt liên kết địa chỉ nạp ↔ rút.
- **Định danh & compliance:** chứng minh *"tôi trên 18 tuổi"* hoặc *"tôi không nằm trong danh sách cấm"* mà không lộ ngày sinh hay danh tính (proof-of-personhood, KYC bảo mật).

### 4.2 Scaling — zk-rollup & zkEVM

Đây là ứng dụng blockchain lớn nhất hiện nay. **Bài toán:** L1 (Ethereum) verify **mọi giao dịch** rất tốn. **Lời giải zk-rollup:**

<svg viewBox="0 0 700 260" role="img" aria-labelledby="rl-t rl-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="rl-t">zk-rollup: nén nhiều giao dịch thành một proof</title>
<desc id="rl-d">Hàng nghìn giao dịch chạy off-chain trên L2, tạo một validity proof, L1 chỉ verify proof đó</desc>
<rect x="40" y="40" width="200" height="180" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="140" y="64" text-anchor="middle" font-size="13" fill="currentColor">L2 (off-chain)</text>
<rect x="70" y="80" width="140" height="22" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="70" y="110" width="140" height="22" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="70" y="140" width="140" height="22" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="140" y="185" text-anchor="middle" font-size="11" fill="currentColor">hàng nghìn tx</text>
<text x="140" y="205" text-anchor="middle" font-size="11" fill="currentColor">chạy trên zkEVM</text>
<rect x="300" y="105" width="120" height="55" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="130" text-anchor="middle" font-size="12" fill="currentColor">validity</text>
<text x="360" y="148" text-anchor="middle" font-size="12" fill="currentColor">proof (ZK)</text>
<line x1="240" y1="130" x2="298" y2="130" stroke="currentColor" stroke-width="1.5" marker-end="url(#ra)"/>
<rect x="480" y="60" width="180" height="140" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="570" y="90" text-anchor="middle" font-size="13" fill="currentColor">L1 (Ethereum)</text>
<text x="570" y="120" text-anchor="middle" font-size="11" fill="currentColor">chỉ verify 1 proof</text>
<text x="570" y="140" text-anchor="middle" font-size="11" fill="currentColor">thay vì N giao dịch</text>
<text x="570" y="168" text-anchor="middle" font-size="11" fill="currentColor">⇒ rẻ hơn hàng trăm lần</text>
<line x1="420" y1="130" x2="478" y2="130" stroke="currentColor" stroke-width="1.5" marker-end="url(#ra)"/>
<defs><marker id="ra" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

1. Hàng nghìn giao dịch được thực thi **off-chain** trên L2 (**zkEVM** = một EVM mà mọi thực thi đều sinh được ZK proof).
2. L2 tạo **một validity proof** (SNARK/STARK) chứng minh *"tôi đã áp dụng đúng luật EVM cho cả batch này và state gốc chuyển thành state mới đúng như vậy"*.
3. L1 **chỉ verify một proof nhỏ** thay vì chạy lại hàng nghìn giao dịch. Verify proof rẻ hơn **hàng trăm lần** so với thực thi ⇒ throughput tăng vọt, phí giảm mạnh, mà **kế thừa nguyên vẹn an toàn của L1**.

Điểm mấu chốt phân biệt với **optimistic rollup**: zk-rollup có **tính đúng đắn bằng toán học ngay lập tức** (validity proof), không cần *challenge period* 7 ngày như optimistic. Đây là lý do ZKP được xem là "endgame" cho scaling Ethereum. Ví dụ thực tế: **zkSync, Scroll, Polygon zkEVM, Linea** (dòng SNARK-based zkEVM) và **StarkNet** (STARK-based, viết bằng ngôn ngữ Cairo).

---

## 5. Tóm tắt
- **ZKP** cho phép chứng minh một mệnh đề đúng **mà không lộ bí mật**, thỏa ba tính chất: **completeness** (đúng thì luôn được tin), **soundness** (sai thì gần như không lừa được), **zero-knowledge** (chỉ lộ đúng một bit true/false).
- **Hang Ali Baba** là mô hình trực giác: lặp challenge ngẫu nhiên đủ nhiều ⇒ soundness thống kê **1/2ⁿ**; Verifier không bao giờ nghe được "thần chú".
- **Fiat–Shamir** thay Verifier bằng **hàm hash** để tự sinh challenge ⇒ biến interactive thành **non-interactive**, tạo proof public-verify được — điều kiện để dùng trên blockchain.
- **SNARK**: proof **nhỏ**, verify **rẻ**, nhưng **cần trusted setup** và **không hậu lượng tử**. **STARK**: **không trusted setup** (transparent), **hậu lượng tử**, nhưng **proof lớn**, verify đắt hơn.
- Ứng dụng: **privacy** (Zcash, private pool, định danh chọn lọc) và **scaling** (**zk-rollup / zkEVM** — nén hàng nghìn giao dịch thành một validity proof mà L1 verify rẻ).

> **Bài tiếp theo:** đi từ "proof là gì" sang "xây proof thế nào" — **arithmetic circuit, R1CS và witness**: cách một chương trình bất kỳ được dịch thành hệ ràng buộc để ZKP chứng minh.
