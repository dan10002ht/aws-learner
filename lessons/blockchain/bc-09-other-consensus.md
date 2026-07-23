# Bài 9 — Các cơ chế đồng thuận khác

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân biệt **hai trường phái đồng thuận**: **Nakamoto-style** (PoW/PoS, xác suất) vs **BFT-style** (bỏ phiếu, tất định).
- Giải thích cách chạy của **DPoS** (EOS), **PBFT**, **Tendermint/CometBFT** và **Avalanche** — không chỉ khẩu hiệu marketing.
- Hiểu **instant finality** là gì, khác **probabilistic finality** của Bitcoin ra sao, và vì sao nó vừa là lợi thế vừa là ràng buộc.
- Nắm **tam giác đánh đổi** throughput / finality / decentralization — mỗi cơ chế hy sinh cái gì để được cái gì.
- Chọn đúng họ đồng thuận cho một use case cụ thể (sàn hiệu năng cao, cross-chain hub, mạng public khổng lồ...).

---

## 2. Lý thuyết

### 2.1 Analogy — hai kiểu ra quyết định của một hội đồng

Tưởng tượng một hội đồng phải chốt "phiên bản sự thật" chung (thứ tự giao dịch):

| Cách chốt | Tương đương blockchain | Đặc điểm |
|-----------|------------------------|----------|
| **Ai đào được hầm nhanh nhất thì được ghi, cả làng theo nhánh dài nhất** | **Nakamoto-style** (PoW/PoS Ethereum) | Không cần biết trước ai tham gia. Kết quả **chỉ chắc dần theo thời gian** — càng nhiều block chồng lên càng khó đảo. |
| **Điểm danh đủ mặt, biểu quyết, đủ ⅔ giơ tay là CHỐT CỨNG ngay** | **BFT-style** (PBFT, Tendermint) | Phải **biết trước danh sách** người bỏ phiếu. Quyết định **tất định** — chốt là xong, không đảo được. |

Điểm mấu chốt: Nakamoto-style ưu tiên **mở & mở rộng số node vô hạn**, đổi lại finality mờ; BFT-style ưu tiên **finality dứt khoát & nhanh**, đổi lại phải giới hạn số validator biết trước.

### 2.2 Nakamoto-style vs BFT-style — bản chất khác biệt

<svg viewBox="0 0 720 300" role="img" aria-labelledby="nb-t nb-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="nb-t">Nakamoto-style so với BFT-style</title>
<desc id="nb-d">So sánh finality xác suất chồng block bên trái với finality tất định qua bỏ phiếu hai vòng bên phải</desc>
<text x="180" y="24" text-anchor="middle" font-size="14" fill="currentColor">Nakamoto-style</text>
<text x="180" y="42" text-anchor="middle" font-size="11" fill="currentColor">finality xác suất</text>
<rect x="60" y="70" width="70" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="140" y="70" width="70" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="220" y="70" width="70" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<line x1="130" y1="90" x2="140" y2="90" stroke="currentColor" stroke-width="1.5"/>
<line x1="210" y1="90" x2="220" y2="90" stroke="currentColor" stroke-width="1.5"/>
<text x="95" y="94" text-anchor="middle" font-size="11" fill="currentColor">block</text>
<text x="175" y="94" text-anchor="middle" font-size="11" fill="currentColor">+1</text>
<text x="255" y="94" text-anchor="middle" font-size="11" fill="currentColor">+2…</text>
<text x="180" y="145" text-anchor="middle" font-size="11" fill="currentColor">càng nhiều block chồng lên,</text>
<text x="180" y="162" text-anchor="middle" font-size="11" fill="currentColor">xác suất đảo → 0 (không bao giờ tuyệt đối)</text>
<line x1="360" y1="55" x2="360" y2="245" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<text x="545" y="24" text-anchor="middle" font-size="14" fill="currentColor">BFT-style</text>
<text x="545" y="42" text-anchor="middle" font-size="11" fill="currentColor">instant finality</text>
<rect x="420" y="70" width="250" height="40" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="545" y="94" text-anchor="middle" font-size="12" fill="currentColor">proposer đề xuất block</text>
<rect x="420" y="122" width="250" height="34" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="545" y="143" text-anchor="middle" font-size="11" fill="currentColor">pre-vote: ≥⅔ validator đồng ý?</text>
<rect x="420" y="166" width="250" height="34" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="545" y="187" text-anchor="middle" font-size="11" fill="currentColor">pre-commit: ≥⅔ cam kết?</text>
<line x1="545" y1="110" x2="545" y2="122" stroke="currentColor" stroke-width="1.5" marker-end="url(#nb-ah)"/>
<line x1="545" y1="156" x2="545" y2="166" stroke="currentColor" stroke-width="1.5" marker-end="url(#nb-ah)"/>
<text x="545" y="222" text-anchor="middle" font-size="11" fill="#10b981">→ commit: CHỐT CỨNG, không đảo</text>
<text x="360" y="278" text-anchor="middle" font-size="11" fill="currentColor">Mở, không giới hạn node — vs — Nhanh &amp; dứt khoát, cần biết trước validator set</text>
<defs><marker id="nb-ah" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Nakamoto-style** (Bài 7–8): thắng theo "nhánh nặng nhất" (longest/heaviest chain). Fork xảy ra bình thường và được giải sau. Không có khoảnh khắc nào coin "được chốt tuyệt đối" — chỉ **an toàn dần** theo số block xác nhận. Đổi lại: chịu được số node khổng lồ, ai vào cũng được (permissionless).

**BFT-style** (Byzantine Fault Tolerant): dựa trên nghiên cứu đồng thuận cổ điển (Lamport, 1982; Castro–Liskov PBFT, 1999). Validator **bỏ phiếu** theo vòng. Khi đủ **quorum ≥ ⅔**, block được **commit vĩnh viễn** — đó là **instant/deterministic finality**. Đổi lại: cần biết trước validator set, và bị chặn bởi định lý an toàn — chịu tối đa **f validator lỗi/gian trong tổng n = 3f + 1** (tức < ⅓).

> **Vì sao là ⅓?** Với n = 3f+1, để đạt quorum an toàn cần 2f+1 phiếu (⅔). Nếu ≤ f node gian, hai quorum bất kỳ vẫn giao nhau ở ít nhất một node **trung thực** → không thể commit hai block mâu thuẫn. Vượt ⅓ node gian thì tính an toàn (safety) sụp đổ.

### 2.3 DPoS — Delegated Proof of Stake (EOS, Tron, BitShares)

Ý tưởng: thay vì để **tất cả** người nắm stake cùng validate (chậm), người nắm token **bỏ phiếu bầu ra một nhóm nhỏ** (ví dụ EOS: **21 Block Producers**) thay mặt sản xuất block luân phiên.

- **Bầu cử liên tục**: quyền bỏ phiếu tỷ lệ với số token stake; ai được nhiều phiếu nhất lọt top N. Producer làm ăn kém/gian → bị **vote out**.
- **Sản xuất block luân phiên (round-robin)**: 21 producer thay nhau ra block đều đặn (EOS ~0.5s/block), cho **throughput rất cao** (hàng nghìn TPS).
- **Trade-off**: chỉ 21 node ghi block → **decentralization thấp hơn nhiều** so với Bitcoin/Ethereum. Dễ hình thành **liên minh (cartel)** giữa các producer, và cử tri thường thờ ơ (low voter turnout).

DPoS là ví dụ kinh điển của việc **hy sinh decentralization để mua throughput & độ trễ thấp**. Nó vẫn thuộc "họ chọn producer" chứ bản thân việc chốt block ở EOS về sau dùng thêm lớp BFT finality (aBFT — asynchronous BFT) để cho finality dứt khoát.

### 2.4 PBFT — Practical Byzantine Fault Tolerance (1999)

PBFT là "ông tổ" của các cơ chế BFT thực dụng. Một **primary (leader)** đề xuất thứ tự; các **replica** chạy 3 pha để đồng ý:

<svg viewBox="0 0 700 280" role="img" aria-labelledby="pb-t pb-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="pb-t">Ba pha của PBFT</title>
<desc id="pb-d">Client gửi request tới primary, qua ba pha pre-prepare, prepare, commit rồi trả reply</desc>
<text x="60" y="30" text-anchor="middle" font-size="12" fill="currentColor">Client</text>
<text x="60" y="70" text-anchor="middle" font-size="12" fill="currentColor">Primary</text>
<text x="60" y="120" text-anchor="middle" font-size="12" fill="currentColor">Rep 1</text>
<text x="60" y="170" text-anchor="middle" font-size="12" fill="currentColor">Rep 2</text>
<text x="60" y="220" text-anchor="middle" font-size="12" fill="currentColor">Rep 3</text>
<line x1="110" y1="30" x2="680" y2="30" stroke="currentColor" stroke-width="0.5"/>
<line x1="110" y1="70" x2="680" y2="70" stroke="currentColor" stroke-width="0.5"/>
<line x1="110" y1="120" x2="680" y2="120" stroke="currentColor" stroke-width="0.5"/>
<line x1="110" y1="170" x2="680" y2="170" stroke="currentColor" stroke-width="0.5"/>
<line x1="110" y1="220" x2="680" y2="220" stroke="currentColor" stroke-width="0.5"/>
<text x="180" y="250" text-anchor="middle" font-size="10" fill="currentColor">request</text>
<text x="300" y="250" text-anchor="middle" font-size="10" fill="currentColor">pre-prepare</text>
<text x="430" y="250" text-anchor="middle" font-size="10" fill="currentColor">prepare</text>
<text x="560" y="250" text-anchor="middle" font-size="10" fill="currentColor">commit</text>
<text x="650" y="250" text-anchor="middle" font-size="10" fill="currentColor">reply</text>
<line x1="130" y1="30" x2="180" y2="70" stroke="currentColor" stroke-width="1.2" marker-end="url(#pb-ah)"/>
<line x1="240" y1="70" x2="300" y2="120" stroke="#3b82f6" stroke-width="1.2" marker-end="url(#pb-ah)"/>
<line x1="240" y1="70" x2="300" y2="170" stroke="#3b82f6" stroke-width="1.2" marker-end="url(#pb-ah)"/>
<line x1="240" y1="70" x2="300" y2="220" stroke="#3b82f6" stroke-width="1.2" marker-end="url(#pb-ah)"/>
<line x1="360" y1="120" x2="420" y2="70" stroke="#f59e0b" stroke-width="1"/>
<line x1="360" y1="120" x2="420" y2="170" stroke="#f59e0b" stroke-width="1"/>
<line x1="360" y1="170" x2="420" y2="120" stroke="#f59e0b" stroke-width="1"/>
<line x1="490" y1="120" x2="550" y2="70" stroke="#10b981" stroke-width="1"/>
<line x1="490" y1="170" x2="550" y2="120" stroke="#10b981" stroke-width="1"/>
<line x1="620" y1="70" x2="660" y2="30" stroke="currentColor" stroke-width="1.2" marker-end="url(#pb-ah)"/>
<defs><marker id="pb-ah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

1. **Pre-prepare**: primary gán số thứ tự cho request, phát cho tất cả replica.
2. **Prepare**: mỗi replica phát "tôi thấy đề xuất này"; khi nhận đủ **2f prepare** khớp → coi là *prepared*.
3. **Commit**: replica phát commit; nhận đủ **2f+1 commit** → thực thi và trả **reply** cho client.

Nếu primary lỗi/gian, các replica chạy **view change** để đổi leader. Đặc điểm PBFT:
- **Finality tức thì** sau commit; không có fork.
- Nhưng **thông điệp O(n²)** (mỗi node nói với mọi node) → chỉ mở rộng tốt tới vài chục node. Không hợp mạng public hàng nghìn validator. Thường dùng trong **permissioned** (Hyperledger Fabric dùng biến thể BFT ordering).

### 2.5 Tendermint / CometBFT — BFT cho public chain (Cosmos)

Tendermint (nay là **CometBFT**) đưa PBFT ra thế giới **PoS public**: kết hợp **bỏ phiếu BFT** với **Proof of Stake có trọng số theo stake**. Đây là engine đồng thuận của toàn hệ **Cosmos** (thông qua Cosmos SDK/ABCI).

Vòng đồng thuận cho mỗi block (height):

```
propose → pre-vote → pre-commit → commit
```

- **Proposer** cho round được chọn theo vòng, trọng số theo stake.
- **Pre-vote / Pre-commit**: hai vòng bỏ phiếu; cần **> ⅔ voting power** (theo stake, không phải theo đầu node) để tiến. Đủ ⅔ pre-commit → block **commit ngay** = **instant finality** (thường 1–6 giây, tùy mạng).
- Nếu round timeout (proposer offline), tăng round, chọn proposer mới — **liveness** vẫn được đảm bảo khi có > ⅔ trung thực.

**Accountable safety qua slashing**: nếu một validator ký hai block mâu thuẫn ở cùng height (double-sign) → bằng chứng mật mã tố cáo, validator bị **slash** (mất stake) và bị loại. Đây là điểm mạnh so với PoW: gian lận **để lại bằng chứng** và **bị phạt tiền thật**.

**Đánh đổi của Tendermint:**
- Ưu: finality tức thì (rất hợp cho **cross-chain / IBC** — cần biết chắc block đã final trước khi chuyển tài sản sang chain khác), throughput tốt.
- Nhược: **giới hạn số validator** (Cosmos Hub ~150–180 active) vì chi phí O(n²) thông điệp; và **ưu tiên safety hơn liveness** — nếu > ⅓ voting power offline, mạng **dừng ra block (halt)** thay vì fork. Chain "đứng hình" chứ không bao giờ tạo hai lịch sử mâu thuẫn.

### 2.6 Avalanche — đồng thuận metastability qua lấy mẫu ngẫu nhiên

Avalanche là một họ **thứ ba**, không phải Nakamoto cũng không phải BFT cổ điển. Ý tưởng cốt lõi: **repeated random subsampling voting** (bỏ phiếu bằng cách hỏi lặp đi lặp lại một nhóm nhỏ ngẫu nhiên).

**Cơ chế (gossip + snowball):**
1. Một node muốn quyết định giữa hai lựa chọn (ví dụ giao dịch A hay xung đột B). Nó **lấy mẫu ngẫu nhiên k node** (ví dụ k=20) và hỏi "bạn nghiêng về cái nào?".
2. Nếu **≥ α phần** (ngưỡng, ví dụ 15/20) trả cùng một đáp án → node tăng "độ tin" cho đáp án đó.
3. **Lặp lại nhiều vòng**. Đủ β vòng liên tiếp cùng kết quả → node **quyết (accept)**.

Vì mỗi vòng chỉ hỏi vài chục node (không phải cả mạng), chi phí thấp và **mở rộng tới hàng nghìn node**. Hiệu ứng "**metastability**": khi một chút thiên lệch xuất hiện, lấy mẫu lặp lại **khuếch đại** nó cho tới khi **cả mạng tuyết-lở (avalanche)** về cùng một phía — như một hệ đang cân bằng mong manh bị đẩy dứt khoát sang một trạng thái ổn định.

<svg viewBox="0 0 700 260" role="img" aria-labelledby="av-t av-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="av-t">Avalanche — lấy mẫu ngẫu nhiên lặp lại</title>
<desc id="av-d">Một node hỏi k node ngẫu nhiên qua nhiều vòng cho tới khi đa số áp đảo dồn về một phía</desc>
<circle cx="120" cy="130" r="26" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="128" text-anchor="middle" font-size="11" fill="currentColor">node</text>
<text x="120" y="143" text-anchor="middle" font-size="11" fill="currentColor">u</text>
<circle cx="330" cy="40" r="15" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<circle cx="330" cy="90" r="15" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<circle cx="330" cy="140" r="15" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<circle cx="330" cy="190" r="15" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<circle cx="330" cy="235" r="15" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<line x1="146" y1="118" x2="315" y2="45" stroke="currentColor" stroke-width="1" marker-end="url(#av-ah)"/>
<line x1="146" y1="123" x2="315" y2="90" stroke="currentColor" stroke-width="1" marker-end="url(#av-ah)"/>
<line x1="148" y1="132" x2="315" y2="140" stroke="currentColor" stroke-width="1" marker-end="url(#av-ah)"/>
<line x1="146" y1="142" x2="315" y2="188" stroke="currentColor" stroke-width="1" marker-end="url(#av-ah)"/>
<line x1="144" y1="150" x2="315" y2="232" stroke="currentColor" stroke-width="1" marker-end="url(#av-ah)"/>
<text x="330" y="125" text-anchor="middle" font-size="0" fill="currentColor"></text>
<text x="235" y="20" text-anchor="middle" font-size="11" fill="currentColor">hỏi k node ngẫu nhiên</text>
<rect x="430" y="70" width="230" height="120" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="545" y="100" text-anchor="middle" font-size="12" fill="currentColor">4/5 trả lời "A"</text>
<text x="545" y="124" text-anchor="middle" font-size="12" fill="currentColor">→ tăng độ tin cho A</text>
<text x="545" y="152" text-anchor="middle" font-size="12" fill="currentColor">lặp β vòng cùng kết quả</text>
<text x="545" y="176" text-anchor="middle" font-size="12" fill="#10b981">→ ACCEPT A (final)</text>
<text x="350" y="256" text-anchor="middle" font-size="10" fill="currentColor">Chi phí mỗi vòng thấp (chỉ k node) → mở rộng tới hàng nghìn node, finality dưới 1–2 giây</text>
<defs><marker id="av-ah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Đặc điểm Avalanche:**
- **Finality xác suất nhưng cực nhanh & rất chắc** (< 1–2 giây), an toàn tới xác suất sai ~10⁻⁹ nhờ chọn tham số k, α, β phù hợp.
- **Mở rộng số node cao** (khác BFT cổ điển O(n²)) — vì mỗi node chỉ nói với k node/vòng.
- **Không có leader** cố định → không có điểm nghẽn/tấn công vào leader.
- Nhược: là mô hình mới hơn, giả định mạng đồng bộ tương đối; và trong trường hợp có nhiều giao dịch **xung đột** trực tiếp mới cần bỏ phiếu — giao dịch không xung đột được xử lý song song rất nhanh (DAG).

### 2.7 Instant finality vs Probabilistic finality — vì sao quan trọng

| | Probabilistic (Nakamoto) | Instant/Deterministic (BFT) |
|---|--------------------------|------------------------------|
| **Khi nào "chắc"** | Sau N block xác nhận (Bitcoin ~6, ~60 phút) | Ngay sau commit (giây) |
| **Có fork không** | Có, giải sau | Không (hoặc halt thay vì fork) |
| **Đảo ngược** | Có thể (chi phí ↑ theo độ sâu) | Không thể (nếu < ⅓ gian) |
| **Cross-chain** | Phải chờ lâu cho an toàn | Lý tưởng — biết chắc final ngay |
| **Giá phải trả** | Không giới hạn node, rất mở | Giới hạn validator set, có thể halt |

Với **sàn giao dịch, cầu nối cross-chain, thanh toán** — bạn cần biết **chính xác lúc nào** một giao dịch không thể đảo. Instant finality là câu trả lời. Với **mạng giá trị tối đa chống kiểm duyệt** (store of value), probabilistic finality của Bitcoin lại là lựa chọn triết học đúng: mở tuyệt đối, không ai bị chặn vào.

---

## 3. Bảng so sánh tổng hợp

| Cơ chế | Họ | Finality | Throughput | Số validator điển hình | Đánh đổi chính |
|--------|-----|----------|-----------|------------------------|----------------|
| **PoW** (Bitcoin) | Nakamoto | Xác suất (~60 phút) | Thấp (~7 TPS) | Không giới hạn miner | Tốn năng lượng, chậm — đổi lấy mở & bảo mật cực cao |
| **PoS** (Ethereum) | Nakamoto + BFT finality (Casper FFG) | Final sau ~2 epoch (~13 phút) | ~15–30 TPS (L1) | ~1 triệu validator | Cân bằng; phức tạp |
| **DPoS** (EOS) | Bầu chọn producer | Nhanh (thêm aBFT) | Rất cao (nghìn TPS) | ~21 producer | Decentralization thấp, nguy cơ cartel |
| **PBFT** | BFT cổ điển | Tức thì | Cao (mạng nhỏ) | Vài chục | O(n²), chỉ hợp permissioned |
| **Tendermint/CometBFT** | BFT + PoS | Tức thì (1–6s) | Cao | ~100–180 | Halt nếu > ⅓ offline; giới hạn validator |
| **Avalanche** | Metastability/sampling | Xác suất, < 1–2s | Rất cao | Hàng nghìn | Mô hình mới, giả định đồng bộ |

---

## 4. Tam giác đánh đổi: throughput / finality / decentralization

Không có bữa trưa miễn phí. Mỗi thiết kế đồng thuận đang **định vị trên một tam giác**:

- **Muốn throughput cực cao + finality nhanh** → giảm số node ra quyết định (DPoS 21 node, BFT vài chục). **Mất** decentralization.
- **Muốn decentralization tối đa + mở permissionless** → Nakamoto-style (Bitcoin, Ethereum). **Mất** tốc độ finality & throughput L1.
- **Muốn cả decentralization cao + finality nhanh** → Avalanche cố gắng làm điều này bằng sampling, đổi lại là mô hình bảo mật mới & giả định mạng chặt hơn.

> **Quy tắc chọn:**
> - Sàn/game/app cần TPS cao, chấp nhận ít node tin cậy → **DPoS** hoặc **BFT (Tendermint)**.
> - Hub kết nối nhiều chain, cần finality dứt khoát cho bridge → **Tendermint/CometBFT** (IBC).
> - Mạng permissioned nội bộ doanh nghiệp, ít node đã biết → **PBFT / BFT ordering**.
> - Store of value chống kiểm duyệt, ưu tiên mở & bảo mật hơn tốc độ → **PoW/PoS Nakamoto**.
> - Cần cả scale node lớn lẫn finality nhanh → **Avalanche**.

---

## 5. Ví dụ thực tế

**Tình huống — bridge tài sản Cosmos → Ethereum.** Vì Tendermint cho **instant finality**, bridge chỉ cần thấy block đã commit là **an toàn chuyển** — không phải chờ "đủ N xác nhận" như đọc từ Bitcoin (nơi một reorg sâu có thể đảo giao dịch). Ngược lại, cầu nối *từ* một chain PoW phải cấu hình số block chờ lớn để tránh rủi ro reorg — đó là lý do rút coin từ sàn thường lâu hơn với chain probabilistic-finality.

**Tình huống — EOS bị chỉ trích tập trung.** Với chỉ 21 Block Producers được bầu, nhiều lần cộng đồng phát hiện các producer có dấu hiệu **thông đồng bỏ phiếu chéo** cho nhau để giữ ghế. Đây chính là mặt trái của DPoS: throughput đẹp trên giấy nhưng **quyền lực dồn vào số ít**, gần với mô hình "câu lạc bộ" hơn là phi tập trung thực sự.

---

## 6. Tóm tắt
- Có **hai trường phái lớn**: **Nakamoto-style** (xác suất, mở, mở rộng node vô hạn) và **BFT-style** (bỏ phiếu, tất định, instant finality nhưng giới hạn validator, chịu < ⅓ gian).
- **DPoS** (EOS): bầu ra ~21 producer → throughput cao, nhưng **hy sinh decentralization**, nguy cơ cartel.
- **PBFT**: 3 pha (pre-prepare/prepare/commit), finality tức thì nhưng **O(n²)** → chỉ hợp mạng nhỏ/permissioned.
- **Tendermint/CometBFT**: BFT + PoS cho public chain (Cosmos), **instant finality** lý tưởng cho cross-chain, nhưng **halt nếu > ⅓ offline**.
- **Avalanche**: họ thứ ba — **lấy mẫu ngẫu nhiên lặp lại** tạo hiệu ứng metastability, finality nhanh & mở rộng node cao.
- Luôn có **tam giác đánh đổi throughput / finality / decentralization** — chọn cơ chế là chọn hy sinh cái gì.

> **Bài tiếp theo (Bài 10):** rời tầng đồng thuận để nhìn xuống **mạng P2P & lan truyền giao dịch** — cách các node tìm nhau, gossip block và giữ mempool đồng bộ.
