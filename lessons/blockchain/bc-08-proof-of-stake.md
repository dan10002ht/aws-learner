# Bài 8 — Proof of Stake: validator, slashing, finality

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **Proof of Stake (PoS)** thay thế "đốt điện" của PoW bằng "đặt cọc vốn" như thế nào.
- Nói rõ vai trò **validator**, cơ chế **staking deposit** (32 ETH) và cách mạng **chọn proposer** cho mỗi slot.
- Phân biệt hai loại **slashing** (phạt gian lận) vs **inactivity leak** (phạt lười) — chúng răn đe kiểu tấn công nào.
- Hiểu **Ethereum Gasper** = **Casper FFG** (finality) + **LMD-GHOST** (fork choice), và **epoch/slot** vận hành ra sao.
- So sánh **PoW vs PoS** về **năng lượng**, **bảo mật kinh tế** và chi phí tấn công.

---

## 2. Lý thuyết

### 2.1 Analogy — đặt cọc thay vì đốt tiền điện

Ở Bài 7 (Proof of Work), muốn giành quyền ghi block bạn phải **đốt điện** giải hash — ai đốt nhiều nhất (hashrate cao) thắng. An ninh đến từ **chi phí vật lý bên ngoài** (điện + máy ASIC).

Proof of Stake đổi luật chơi: thay vì đốt điện, bạn **khóa vốn (stake)** làm tiền đặt cọc. Hãy hình dung một phiên đấu giá công chứng:

| PoW | PoS | Analogy đời thường |
|-----|-----|--------------------|
| Đốt điện để chứng minh "tôi nghiêm túc" | Đặt cọc tiền để chứng minh "tôi nghiêm túc" | Thi công thì mua máy móc vs đặt cọc bảo lãnh hợp đồng |
| Gian lận → mất tiền điện đã đốt (chi phí ngoài) | Gian lận → **bị tịch thu cọc** (chi phí trong hệ thống) | Nhà thầu làm ẩu → **mất tiền cọc**, không phải mất máy |
| An ninh = chi phí năng lượng | An ninh = **vốn bị khóa + nguy cơ bị slash** | Ai phá luật thì tự cắt túi mình |

Điểm cốt lõi của PoS: **kẻ gian lận bị trừng phạt bằng chính vốn của họ trong hệ thống** — gọi là **cryptoeconomic security** (bảo mật kinh tế mật mã). PoW nói "phá hoại thì tốn điện của mày"; PoS nói "phá hoại thì tao **đốt cọc** của mày ngay trên chain".

### 2.2 Validator & staking deposit

Trên Ethereum, để thành **validator** bạn nạp **đúng 32 ETH** vào hợp đồng **deposit contract** cùng hai loại khóa:
- **Signing key** (BLS): dùng ký các nhiệm vụ hằng ngày (đề xuất/chứng thực block) — nóng, luôn online.
- **Withdrawal credentials**: quyết định ETH rút về đâu — lạnh, cất kỹ.

Một validator = **32 ETH** stake. Muốn "trọng số" lớn hơn thì chạy nhiều validator. Stake này **bị khóa** và là **tài sản thế chấp**: hành xử đúng → nhận **reward**; hành xử sai → bị **cắt** (penalty/slashing).

<svg viewBox="0 0 700 250" role="img" aria-labelledby="vl-t vl-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="vl-t">Vòng đời một validator</title>
<desc id="vl-d">Từ nạp 32 ETH, kích hoạt, làm nhiệm vụ nhận thưởng hoặc bị slash, đến khi exit và rút tiền</desc>
<rect x="20" y="95" width="110" height="55" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="75" y="120" text-anchor="middle" font-size="12" fill="currentColor">Deposit</text>
<text x="75" y="138" text-anchor="middle" font-size="11" fill="currentColor">32 ETH</text>
<rect x="180" y="95" width="110" height="55" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="235" y="120" text-anchor="middle" font-size="12" fill="currentColor">Activation</text>
<text x="235" y="138" text-anchor="middle" font-size="11" fill="currentColor">(hàng chờ)</text>
<rect x="340" y="95" width="120" height="55" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="400" y="120" text-anchor="middle" font-size="12" fill="currentColor">Active</text>
<text x="400" y="138" text-anchor="middle" font-size="11" fill="currentColor">propose + attest</text>
<rect x="340" y="15" width="120" height="45" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="400" y="42" text-anchor="middle" font-size="12" fill="#f43f5e">Slashed</text>
<rect x="510" y="95" width="100" height="55" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="560" y="120" text-anchor="middle" font-size="12" fill="currentColor">Exit</text>
<text x="560" y="138" text-anchor="middle" font-size="11" fill="currentColor">+ withdraw</text>
<line x1="130" y1="122" x2="178" y2="122" stroke="currentColor" stroke-width="1.5" marker-end="url(#va)"/>
<line x1="290" y1="122" x2="338" y2="122" stroke="currentColor" stroke-width="1.5" marker-end="url(#va)"/>
<line x1="460" y1="122" x2="508" y2="122" stroke="currentColor" stroke-width="1.5" marker-end="url(#va)"/>
<line x1="400" y1="95" x2="400" y2="62" stroke="#f43f5e" stroke-width="1.5" marker-end="url(#va)"/>
<line x1="460" y1="38" x2="540" y2="90" stroke="#f43f5e" stroke-width="1.5" stroke-dasharray="4 4" marker-end="url(#va)"/>
<text x="400" y="85" text-anchor="middle" font-size="10" fill="#f43f5e">gian lận</text>
<text x="350" y="230" text-anchor="middle" font-size="11" fill="currentColor">Reward khi làm đúng; bị cắt stake khi làm sai; slash → buộc exit sớm</text>
<defs><marker id="va" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.3 Epoch, slot & chọn proposer

Thời gian trên Ethereum được chia thành ô cố định:
- **Slot** = **12 giây**. Mỗi slot có tối đa **một block** được đề xuất.
- **Epoch** = **32 slot** = **6,4 phút**. Đây là đơn vị mà finality và phần thưởng được tính toán.

Đầu mỗi epoch, giao thức dùng nguồn ngẫu nhiên **RANDAO** (mỗi proposer đóng góp một mẩu ngẫu nhiên trộn vào, khó thao túng) để **gán ngẫu nhiên**:
- Mỗi slot có **1 proposer** — validator được chọn để **đề xuất block** cho slot đó.
- Phần còn lại được chia thành **committee** để **attest** (chứng thực) — bỏ phiếu rằng block họ thấy là hợp lệ.

Vì chọn ngẫu nhiên và bí mật tới sát giờ, kẻ tấn công **không biết trước** ai sẽ là proposer để nhắm DoS. Xác suất được chọn tỉ lệ với **số validator** (số stake) bạn có — nhưng **không** phụ thuộc phần cứng, nên PoS **không có "arms race" phần cứng** như PoW.

<svg viewBox="0 0 700 210" role="img" aria-labelledby="ep-t ep-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="ep-t">Epoch và slot</title>
<desc id="ep-d">Một epoch gồm 32 slot mỗi slot 12 giây, mỗi slot có một proposer và một committee chứng thực</desc>
<text x="350" y="24" text-anchor="middle" font-size="14" fill="currentColor">1 Epoch = 32 slot = 6,4 phút</text>
<rect x="40" y="50" width="70" height="50" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="75" y="72" text-anchor="middle" font-size="11" fill="currentColor">Slot 0</text>
<text x="75" y="90" text-anchor="middle" font-size="10" fill="currentColor">12s</text>
<rect x="120" y="50" width="70" height="50" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="155" y="72" text-anchor="middle" font-size="11" fill="currentColor">Slot 1</text>
<text x="155" y="90" text-anchor="middle" font-size="10" fill="currentColor">12s</text>
<rect x="200" y="50" width="70" height="50" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="235" y="72" text-anchor="middle" font-size="11" fill="currentColor">Slot 2</text>
<text x="235" y="90" text-anchor="middle" font-size="10" fill="currentColor">12s</text>
<text x="320" y="80" text-anchor="middle" font-size="16" fill="currentColor">. . .</text>
<rect x="370" y="50" width="80" height="50" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="410" y="72" text-anchor="middle" font-size="11" fill="currentColor">Slot 31</text>
<text x="410" y="90" text-anchor="middle" font-size="10" fill="currentColor">12s</text>
<rect x="490" y="45" width="180" height="60" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="580" y="70" text-anchor="middle" font-size="11" fill="currentColor">RANDAO gán ngẫu nhiên</text>
<text x="580" y="88" text-anchor="middle" font-size="11" fill="currentColor">proposer + committee</text>
<rect x="120" y="130" width="200" height="55" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="220" y="153" text-anchor="middle" font-size="11" fill="currentColor">1 Proposer / slot</text>
<text x="220" y="171" text-anchor="middle" font-size="11" fill="currentColor">→ tạo block</text>
<rect x="360" y="130" width="220" height="55" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="470" y="153" text-anchor="middle" font-size="11" fill="currentColor">Committee còn lại attest</text>
<text x="470" y="171" text-anchor="middle" font-size="11" fill="currentColor">→ bỏ phiếu block hợp lệ</text>
<line x1="75" y1="100" x2="180" y2="128" stroke="currentColor" stroke-width="1" marker-end="url(#ea)"/>
<line x1="235" y1="100" x2="450" y2="128" stroke="currentColor" stroke-width="1" marker-end="url(#ea)"/>
<defs><marker id="ea" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.4 Attestation — lá phiếu là "tài sản có thể bị đốt"

Mỗi epoch, **mỗi validator phải attest đúng một lần**. Một attestation nói ba điều: (1) **head** của chain họ thấy (theo fork choice), (2) **source** checkpoint (checkpoint justified gần nhất), (3) **target** checkpoint (checkpoint đầu epoch hiện tại). Chính các lá phiếu source→target này là "nguyên liệu" để đạt finality ở mục 2.6.

Điểm mấu chốt khiến PoS an toàn: **mọi lá phiếu đều được ký và có thể bị trừng phạt**. Nếu bạn ký hai phiếu mâu thuẫn, chữ ký đó là **bằng chứng số** mà bất kỳ ai cũng nộp lên chain để **slash** bạn. Vote không còn là "miễn phí" như trong nhiều hệ BFT cổ điển.

### 2.5 Slashing — phạt gian lận

**Slashing** là hình phạt nặng dành cho hành vi **có thể dùng để tấn công consensus**, được kích hoạt bằng bằng chứng mật mã. Hai lỗi slashable trên Ethereum:

| Lỗi | Định nghĩa | Vì sao nguy hiểm |
|-----|-----------|------------------|
| **Double proposal** | Proposer ký **2 block khác nhau** cho **cùng một slot** | Tạo hai lịch sử song song → giúp double-spending / chia rẽ mạng |
| **Surround / double vote** | Attester ký hai phiếu mâu thuẫn: cùng target hoặc phiếu này "bao" phiếu kia | Bỏ phiếu cho hai fork cùng lúc → phá finality (vi phạm luật Casper) |

Khi bị slash, validator chịu **ba tầng** trừng phạt:
1. **Initial penalty**: cắt ngay một phần stake (tỉ lệ với stake bị slash).
2. **Forced exit**: bị buộc rời tập validator, không được attest nữa.
3. **Correlation penalty** (giữa chu kỳ exit ~36 ngày): nếu **nhiều validator bị slash cùng lúc** (dấu hiệu tấn công phối hợp), mức phạt **tăng vọt** — có thể mất **gần như toàn bộ 32 ETH**. Đây là đòn răn đe **tấn công quy mô lớn**: càng đông đồng phạm, mỗi người mất càng nhiều.

Phân biệt với **inactivity penalty / inactivity leak** — **không phải slashing**: chỉ là **rò rỉ nhẹ** khi validator **offline / không attest**. Nếu chain **không finalize** trong thời gian dài (một siêu phần validator ngoại tuyến), các validator không đóng góp sẽ bị **rò dần** stake cho tới khi nhóm còn lại đủ 2/3 để finalize trở lại. Lười thì mất chút; **gian lận** thì mới bị slash nặng.

> **Quy tắc vàng cho validator:** thà **offline** (mất rò rỉ nhỏ) còn hơn chạy **hai instance cùng key** (nguy cơ double-sign → slash). Đây là lý do KHÔNG bao giờ chạy backup "active-active" với cùng signing key.

### 2.6 Ethereum Gasper = Casper FFG + LMD-GHOST

Consensus PoS của Ethereum tên là **Gasper**, ghép **hai thuật toán khác nhiệm vụ**:

**LMD-GHOST — fork choice (chọn nhánh nào là "chain thật"):**
- LMD = *Latest Message Driven*: chỉ đếm **lá phiếu mới nhất** của mỗi validator.
- GHOST = *Greediest Heaviest Observed SubTree*: khi có nhiều fork, đi theo **nhánh có tổng trọng số attestation nặng nhất**, không chỉ nhánh dài nhất.
- Nhiệm vụ: cho biết **head hiện tại** để proposer build tiếp — cập nhật liên tục theo từng slot (**tính khả dụng/liveness**).

**Casper FFG — finality gadget (đóng dấu "không thể đảo ngược"):**
- Chạy **trên nền** LMD-GHOST, mỗi epoch xét các **checkpoint** (block ở ranh giới epoch).
- Nếu **≥ 2/3 tổng stake** bỏ phiếu source→target cho một checkpoint → checkpoint đó được **justified**.
- Khi một checkpoint đã justified và **checkpoint kế tiếp** cũng được justify → checkpoint trước trở thành **finalized**.
- **Finalized nghĩa là**: để đảo ngược, kẻ tấn công phải khiến **≥ 1/3 tổng stake bị slash** — con số hàng chục tỉ USD bị **đốt trên chain**. Đây là **economic finality**.

<svg viewBox="0 0 700 300" role="img" aria-labelledby="ga-t ga-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="ga-t">Gasper — hai lớp fork choice và finality</title>
<desc id="ga-d">LMD-GHOST chọn head liên tục ở lớp dưới, Casper FFG justify rồi finalize checkpoint ở lớp trên</desc>
<text x="350" y="24" text-anchor="middle" font-size="14" fill="currentColor">Casper FFG — Finality (2/3 stake)</text>
<rect x="60" y="40" width="120" height="50" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="62" text-anchor="middle" font-size="11" fill="currentColor">Checkpoint N-1</text>
<text x="120" y="80" text-anchor="middle" font-size="10" fill="currentColor">FINALIZED</text>
<rect x="290" y="40" width="120" height="50" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="62" text-anchor="middle" font-size="11" fill="currentColor">Checkpoint N</text>
<text x="350" y="80" text-anchor="middle" font-size="10" fill="currentColor">justified</text>
<rect x="520" y="40" width="120" height="50" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="580" y="62" text-anchor="middle" font-size="11" fill="currentColor">Checkpoint N+1</text>
<text x="580" y="80" text-anchor="middle" font-size="10" fill="currentColor">(đang vote)</text>
<line x1="180" y1="65" x2="288" y2="65" stroke="currentColor" stroke-width="1.5" marker-end="url(#gaa)"/>
<line x1="410" y1="65" x2="518" y2="65" stroke="currentColor" stroke-width="1.5" marker-end="url(#gaa)"/>
<text x="350" y="160" text-anchor="middle" font-size="14" fill="currentColor">LMD-GHOST — Fork choice (đếm phiếu mới nhất)</text>
<rect x="60" y="180" width="70" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="205" text-anchor="middle" font-size="11" fill="currentColor">block</text>
<rect x="160" y="180" width="70" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="195" y="205" text-anchor="middle" font-size="11" fill="currentColor">block</text>
<rect x="260" y="180" width="70" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="295" y="205" text-anchor="middle" font-size="11" fill="currentColor">block</text>
<rect x="360" y="150" width="70" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="395" y="175" text-anchor="middle" font-size="11" fill="currentColor">head</text>
<rect x="360" y="215" width="70" height="40" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="395" y="240" text-anchor="middle" font-size="10" fill="#f43f5e">fork nhẹ</text>
<line x1="130" y1="200" x2="158" y2="200" stroke="currentColor" stroke-width="1.5" marker-end="url(#gaa)"/>
<line x1="230" y1="200" x2="258" y2="200" stroke="currentColor" stroke-width="1.5" marker-end="url(#gaa)"/>
<line x1="330" y1="200" x2="358" y2="175" stroke="currentColor" stroke-width="2" marker-end="url(#gaa)"/>
<line x1="330" y1="200" x2="358" y2="230" stroke="#f43f5e" stroke-width="1" stroke-dasharray="4 4" marker-end="url(#gaa)"/>
<text x="500" y="205" text-anchor="middle" font-size="10" fill="currentColor">chọn nhánh nặng phiếu nhất</text>
<line x1="120" y1="180" x2="120" y2="92" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<line x1="350" y1="150" x2="350" y2="92" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<text x="350" y="285" text-anchor="middle" font-size="11" fill="currentColor">FFG đóng dấu bất biến cho checkpoint mà GHOST đã chọn</text>
<defs><marker id="gaa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Vì sao cần cả hai?** LMD-GHOST cho **liveness** (chain luôn tiến, luôn có head để build) nhưng bản thân nó **không bao giờ "chốt" bất biến**. Casper FFG cho **safety** (một khi finalized thì không đảo được trừ khi đốt ≥1/3 stake) nhưng **không tự chọn nhánh** theo thời gian thực. Ghép lại: GHOST **chọn**, FFG **đóng dấu**. Đây là khác biệt lớn nhất với PoW — nơi finality chỉ là **xác suất** ("chờ 6 block cho chắc"), còn PoS cho **finality kinh tế tường minh** sau ~2 epoch (~12–13 phút).

---

## 3. PoW vs PoS — năng lượng & bảo mật kinh tế

| Tiêu chí | Proof of Work | Proof of Stake |
|----------|---------------|----------------|
| **Nguồn an ninh** | Hashrate (điện + ASIC) | Stake bị khóa + slashing |
| **Chi phí tấn công** | Thuê/mua ≥ 51% hashrate | Mua & khóa ≥ 33% (đảo finality) / 51% (kiểm duyệt) stake |
| **Hậu quả với kẻ tấn công** | Vẫn giữ được phần cứng sau khi tấn công | **Stake bị slash/đốt** — mất vốn ngay trên chain |
| **Năng lượng** | Rất lớn (cỡ một quốc gia nhỏ) | Giảm **~99,9%** (chỉ chạy server thường) |
| **Finality** | Xác suất (probabilistic), chờ N block | Kinh tế + tường minh (~2 epoch) |
| **Rào cản tham gia** | Vốn phần cứng + điện rẻ | 32 ETH (hoặc staking pool / LST) |
| **Rủi ro tập trung** | Mining pool + vùng điện rẻ | Staking pool lớn (vd Lido) + sàn |

Ba ý cần nhớ:
- **Năng lượng**: khi Ethereum chuyển sang PoS ("The Merge", 2022), tiêu thụ điện giảm khoảng **99,9%** — vì không còn đua giải hash.
- **Bảo mật kinh tế**: PoW phạt kẻ tấn công **gián tiếp** (tốn điện), PoS phạt **trực tiếp** (đốt cọc). Tấn công PoS thành công một lần cũng có thể **tự huỷ vốn** của kẻ tấn công → răn đe mạnh hơn về mặt lý thuyết trò chơi.
- **Không có bữa trưa miễn phí**: PoS đổi lấy rủi ro **tập trung vốn** (người giàu stake nhiều, staking pool lớn) và độ phức tạp giao thức cao hơn. Mỗi mô hình có đánh đổi riêng.

---

## 4. Ví dụ thực tế: một validator đi qua một slot

1. RANDAO đã gán: validator **#12345** là proposer cho **slot S**, đồng thời nằm trong committee attest ở một slot khác của epoch.
2. Đến slot S, node của #12345 lấy **head** từ LMD-GHOST, gom giao dịch từ mempool, **build block** và ký bằng signing key.
3. Block phát ra mạng; các committee **attest** (source→target + head) trong vài giây đầu slot.
4. Cuối epoch, client cộng phiếu: nếu **≥2/3 stake** vote target → checkpoint **justified**; epoch sau justify tiếp → checkpoint này **finalized**.
5. #12345 nhận **reward** cho proposal + attestation đúng giờ, đúng head. Nếu lỡ ký **hai block cùng slot** (do chạy nhầm hai instance), ai đó nộp bằng chứng → #12345 **bị slash**, mất phần stake và bị **buộc exit**.

---

## 5. Tóm tắt
- **PoS** thay "đốt điện" (PoW) bằng "đặt cọc vốn": an ninh đến từ **stake bị khóa + nguy cơ slash**, không từ hashrate.
- **Validator** = **32 ETH** deposit; mạng dùng **RANDAO** chọn ngẫu nhiên **proposer** mỗi **slot (12s)**, phần còn lại **attest** trong **epoch (32 slot)**.
- **Slashing** phạt nặng hành vi tấn công consensus (**double proposal**, **surround vote**), có **correlation penalty** răn đe tấn công phối hợp; khác với **inactivity leak** chỉ rò rỉ nhẹ khi offline.
- **Gasper = Casper FFG (finality, 2/3 stake) + LMD-GHOST (fork choice)**: GHOST **chọn** head cho liveness, FFG **đóng dấu** bất biến cho safety — cho **economic finality** sau ~2 epoch.
- **PoW vs PoS**: PoS giảm **~99,9%** năng lượng, phạt kẻ tấn công **trực tiếp bằng đốt cọc**, đổi lại rủi ro **tập trung vốn** và độ phức tạp cao hơn.

> **Bài tiếp theo (Bài 9):** đi vào **các biến thể & tấn công đồng thuận** — long-range attack, nothing-at-stake, DPoS/BFT so với Nakamoto consensus, và cách các mạng phòng thủ.
