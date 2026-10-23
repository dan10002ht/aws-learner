# Bài 45 — MEV chuyên sâu: Flashbots & PBS

## 1. Mục tiêu
Sau bài này bạn có thể:
- Định nghĩa **MEV (Maximal Extractable Value)** chính xác — vì sao đổi tên từ "Miner" thành "Maximal".
- Nhận diện các dạng MEV kinh điển: **arbitrage, sandwich attack, liquidation, JIT liquidity**.
- Giải thích **public mempool**, **searcher bot**, và vì sao đấu giá on-chain sinh ra **gas war (PGA)**.
- Hiểu **Flashbots & MEV-Boost**: private orderflow, **bundle**, **sealed-bid auction** hoạt động ra sao.
- Phân tích **Proposer-Builder Separation (PBS)** hiện tại và **enshrined PBS (ePBS)** tương lai.
- Đánh giá **tác hại** của MEV và các hướng giảm thiểu: **encrypted mempool, fair ordering, batch auction**.

---

## 2. Lý thuyết

### 2.1 Analogy — người xếp thứ tự hàng ở quầy thanh toán

Tưởng tượng một siêu thị nơi **người sắp xếp thứ tự khách vào quầy** có quyền tự chọn ai trả tiền trước. Nếu anh ta biết "khách A sắp mua hết lô hàng khuyến mãi làm giá tăng", anh ta có thể **chen một khách của mình vào trước A** để vơ hàng giá rẻ, rồi bán lại cho A giá cao — chỉ nhờ **quyền quyết định thứ tự**.

Trong blockchain, **người sản xuất block** (miner ở PoW, validator/proposer ở PoS) chính là "người xếp thứ tự" đó. Họ được tự do **chọn, loại bỏ, và sắp xếp lại** các giao dịch trong block. Giá trị mà họ (hoặc người trả tiền cho họ) có thể **rút ra** chỉ nhờ quyền ưu tiên/sắp xếp/kiểm duyệt giao dịch — đó chính là **MEV**.

> **MEV = Maximal Extractable Value**: tổng giá trị tối đa có thể trích xuất từ việc **thêm, bỏ, và sắp xếp lại** thứ tự giao dịch trong một block, **vượt trên** phần thưởng block + phí gas thông thường.

Ban đầu gọi là **Miner** Extractable Value (thời PoW Ethereum). Sau The Merge, người tạo block là validator/builder, nên đổi thành **Maximal** — nhấn mạnh đây là thuộc tính cấu trúc của blockchain có thứ tự, không phải của riêng miner.

### 2.2 Vì sao MEV tồn tại — bản chất

MEV không phải "lỗi" mà là **hệ quả tất yếu** của ba điều ktồn tại cùng lúc:
1. **Trạng thái chung có thể sinh lời theo thứ tự** — DeFi (AMM, lending, oracle) khiến giá/khả năng thanh lý phụ thuộc thứ tự thực thi.
2. **Mempool công khai** — giao dịch chờ xử lý ai cũng đọc được trước khi lên block.
3. **Quyền sắp xếp thuộc về một bên** — người tạo block toàn quyền ordering.

Bỏ bất kỳ điều kiện nào cũng thay đổi bức tranh MEV — đây chính là nền tảng cho mọi hướng giảm thiểu ở mục 6.

### 2.3 Bốn dạng MEV kinh điển

| Dạng | Cơ chế | "Nạn nhân" | Tính chất |
|------|--------|-----------|-----------|
| **Arbitrage** | Mua rẻ ở DEX A, bán đắt ở DEX B trong cùng 1 tx | Không ai (chỉ san chênh giá) | Phần lớn **lành tính**, giúp giá hội tụ |
| **Liquidation** | Gọi `liquidate()` vị thế vay dưới ngưỡng, ăn phần thưởng | Người vay bị thanh lý (dù sao cũng bị) | Cần thiết cho sức khỏe lending, nhưng cạnh tranh khốc liệt |
| **Sandwich** | Front-run + back-run quanh 1 swap lớn của nạn nhân | Người swap (bị **slippage** xấu đi) | **Có hại** — rút giá trị trực tiếp từ user |
| **JIT liquidity** | Nạp thanh khoản đúng block có swap lớn, ăn phí, rút ngay | LP dài hạn (bị chia phí) | Xám — cải thiện giá cho trader nhưng hại LP thụ động |

**Sandwich attack** — cơ chế chi tiết: nạn nhân gửi lệnh `swapExactTokensForTokens` mua token X với `amountOutMin` (dung sai slippage) lỏng lẻo. Searcher thấy trong mempool và:

<step-flow>
<svg viewBox="0 0 760 470" role="img" aria-labelledby="bc42a-t bc42a-d" style="width:100%;height:auto">
<title id="bc42a-t">Sandwich attack trong một block: pool đổi qua từng giao dịch</title>
<desc id="bc42a-d">Pool AMM x nhân y bằng k, ban đầu 100 ETH và 100 X, giá 1 ETH mỗi X. Searcher front-run mua X bằng 10 ETH đẩy giá lên 1.21, nạn nhân swap 10 ETH chỉ nhận 7.576 X thay vì 9.091 X, searcher back-run bán 9.091 X nhận 11.803 ETH, lời 1.803 ETH. Đặt amountOutMin 9.045 X thì giao dịch nạn nhân revert.</desc>
<defs><marker id="bc42a-arr" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker></defs>
<text x="380" y="22" text-anchor="middle" font-size="14" fill="currentColor">Cùng 1 block — searcher kiểm soát thứ tự 1→2→3</text>
<text x="12" y="140" font-size="12" fill="currentColor" opacity="0.75">POOL (x · y = k = 10 000)</text>
<g data-step="1">
<rect x="12" y="36" width="165" height="80" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="94.5" y="58" text-anchor="middle" font-size="14" fill="currentColor">0. Mempool</text>
<text x="94.5" y="80" text-anchor="middle" font-size="13" fill="currentColor">nạn nhân: 10 ETH → X</text>
<text x="94.5" y="100" text-anchor="middle" font-size="13" fill="currentColor">amountOutMin lỏng</text>
<rect x="12" y="148" width="165" height="96" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.6"/>
<text x="94.5" y="172" text-anchor="middle" font-size="13" fill="currentColor">100 ETH</text>
<text x="94.5" y="194" text-anchor="middle" font-size="13" fill="currentColor">100 X</text>
<text x="94.5" y="226" text-anchor="middle" font-size="15" fill="currentColor">giá 1.00 ETH/X</text>
<text x="94.5" y="272" text-anchor="middle" font-size="13" fill="currentColor">nếu không bị kẹp:</text>
<text x="94.5" y="292" text-anchor="middle" font-size="13" fill="currentColor">nhận 9.091 X</text>
</g>
<g data-step="2">
<line x1="178" y1="76" x2="201" y2="76" stroke="currentColor" stroke-width="1.5" marker-end="url(#bc42a-arr)"/>
<rect x="202" y="36" width="165" height="80" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="284.5" y="58" text-anchor="middle" font-size="14" fill="currentColor">1. Front-run</text>
<text x="284.5" y="80" text-anchor="middle" font-size="13" fill="currentColor">searcher MUA X</text>
<text x="284.5" y="100" text-anchor="middle" font-size="13" fill="currentColor">bằng 10 ETH → đẩy giá</text>
<rect x="202" y="148" width="165" height="96" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.6"/>
<text x="284.5" y="172" text-anchor="middle" font-size="13" fill="currentColor">110 ETH</text>
<text x="284.5" y="194" text-anchor="middle" font-size="13" fill="currentColor">90.909 X</text>
<text x="284.5" y="226" text-anchor="middle" font-size="15" fill="currentColor" font-weight="700">giá 1.21 ETH/X</text>
<text x="284.5" y="272" text-anchor="middle" font-size="13" fill="currentColor">searcher nhận 9.091 X</text>
</g>
<g data-step="3">
<line x1="368" y1="76" x2="391" y2="76" stroke="currentColor" stroke-width="1.5" marker-end="url(#bc42a-arr)"/>
<rect x="392" y="36" width="165" height="80" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="474.5" y="58" text-anchor="middle" font-size="14" fill="currentColor">2. Nạn nhân swap</text>
<text x="474.5" y="80" text-anchor="middle" font-size="13" fill="currentColor">10 ETH → X ở giá</text>
<text x="474.5" y="100" text-anchor="middle" font-size="13" fill="currentColor">đã bị đẩy cao</text>
<rect x="392" y="148" width="165" height="96" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.6"/>
<text x="474.5" y="172" text-anchor="middle" font-size="13" fill="currentColor">120 ETH</text>
<text x="474.5" y="194" text-anchor="middle" font-size="13" fill="currentColor">83.333 X</text>
<text x="474.5" y="226" text-anchor="middle" font-size="15" fill="currentColor" font-weight="700">giá 1.44 ETH/X</text>
<text x="474.5" y="272" text-anchor="middle" font-size="13" fill="currentColor">nhận 7.576 X</text>
<text x="474.5" y="292" text-anchor="middle" font-size="13" fill="currentColor">hụt 1.515 X (−16.7%)</text>
</g>
<g data-step="4">
<line x1="558" y1="76" x2="581" y2="76" stroke="currentColor" stroke-width="1.5" marker-end="url(#bc42a-arr)"/>
<rect x="582" y="36" width="165" height="80" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="664.5" y="58" text-anchor="middle" font-size="14" fill="currentColor">3. Back-run</text>
<text x="664.5" y="80" text-anchor="middle" font-size="13" fill="currentColor">searcher BÁN 9.091 X</text>
<text x="664.5" y="100" text-anchor="middle" font-size="13" fill="currentColor">→ chốt lời</text>
<rect x="582" y="148" width="165" height="96" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.6"/>
<text x="664.5" y="172" text-anchor="middle" font-size="13" fill="currentColor">108.197 ETH</text>
<text x="664.5" y="194" text-anchor="middle" font-size="13" fill="currentColor">92.424 X</text>
<text x="664.5" y="226" text-anchor="middle" font-size="15" fill="currentColor">giá 1.17 ETH/X</text>
<text x="664.5" y="272" text-anchor="middle" font-size="13" fill="currentColor">nhận 11.803 ETH</text>
<text x="664.5" y="292" text-anchor="middle" font-size="13" fill="currentColor">lời 1.803 ETH</text>
</g>
<g data-step="5">
<rect x="12" y="324" width="736" height="70" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="380" y="352" text-anchor="middle" font-size="14" fill="currentColor">Lá chắn: amountOutMin = 9.091 × 99.5% = 9.045 X (trượt tối đa 0.5%)</text>
<text x="380" y="376" text-anchor="middle" font-size="14" fill="currentColor">Bước 2 chỉ ra 7.576 X &lt; 9.045 X → giao dịch nạn nhân REVERT, không bị ăn</text>
</g>
<text x="380" y="422" text-anchor="middle" font-size="13" fill="currentColor">Lợi nhuận searcher = slippage bị ép thêm của nạn nhân (giá trị bị rút ra)</text>
<text x="380" y="446" text-anchor="middle" font-size="12" fill="currentColor" opacity="0.75">Số minh hoạ: bỏ qua phí swap 0.3%, gas và tip cho builder</text>
</svg>
<step-note data-step="1">Swap của nạn nhân nằm công khai trong mempool. Với pool <code>100 ETH / 100 X</code>, 10 ETH lẽ ra đổi được <code>100 − 10 000/110 = 9.091 X</code>; <code>amountOutMin</code> lỏng nghĩa là nhận ít hơn nhiều vẫn chấp nhận.</step-note>
<step-note data-step="2">Searcher chen lên trước, mua X bằng 10 ETH: pool còn <code>10 000/110 = 90.909 X</code>. X trong pool ít đi nên giá X tăng 21% trước khi nạn nhân kịp chạy.</step-note>
<step-note data-step="3">Cùng 10 ETH nhưng pool đã lệch: nạn nhân nhận <code>90.909 − 10 000/120 = 7.576 X</code>. Phần hụt 1.515 X là slippage bị ép thêm, và giá bị đẩy tiếp lên 1.44.</step-note>
<step-note data-step="4">Searcher bán đúng số X vừa mua vào pool đã bị nạn nhân đẩy giá: <code>120 − 10 000/92.424 = 11.803 ETH</code>. Bỏ 10 ETH, thu 11.803 ETH, chênh 1.803 ETH chính là giá trị rút từ nạn nhân.</step-note>
<step-note data-step="5">Đặt <code>amountOutMin</code> sát kỳ vọng thì front-run đẩy giá vượt ngưỡng sẽ làm swap nạn nhân revert, searcher không có gì để chốt lời.</step-note>
</step-flow>

Đặt `amountOutMin` sát (slippage thấp, ví dụ 0.5%) là lá chắn cơ bản: nếu searcher đẩy giá vượt ngưỡng, giao dịch nạn nhân **revert** thay vì bị ăn.

### 2.4 Public mempool, searcher & gas war

**Mempool** là "phòng chờ" các giao dịch đã ký nhưng chưa lên block. Trên Ethereum L1 mặc định, mempool **công khai** — mọi node đều thấy. **Searcher** là bot chạy thuật toán quét mempool + trạng thái on-chain, phát hiện cơ hội MEV rồi tự tạo giao dịch để chiếm.

Vấn đề: nhiều searcher cùng thấy một cơ hội (ví dụ một khoản liquidation béo bở). Để giao dịch của mình **được xếp trước**, thời PoW cách duy nhất là **trả gas price cao hơn** đối thủ. Kết quả là **Priority Gas Auction (PGA)** — các bot liên tục nâng giá gas theo thời gian thực để giành slot:

- **Hại 1**: người thắng đấu giá đẩy **phí gas cho cả mạng** tăng vọt (ai cũng phải trả đắt hơn).
- **Hại 2**: các bot thua vẫn tốn gas cho giao dịch thất bại → **spam** blockchain.
- **Hại 3**: giao dịch trong mempool bị lộ nên dễ bị **front-run/censor**.

PGA là động lực trực tiếp khai sinh **Flashbots**.

### 2.5 Flashbots & MEV-Boost — private orderflow + bundle + auction

**Flashbots** đề xuất: thay vì đấu giá công khai bằng gas (ồn ào, đắt, spam), hãy chuyển sang **private orderflow** + **sealed-bid auction** ngoài mempool công khai. Ba khái niệm cốt lõi:

- **Bundle**: một **tập hợp giao dịch có thứ tự cố định**, thực thi **nguyên tử** — hoặc cả bundle vào block đúng thứ tự đó, hoặc không giao dịch nào vào. Searcher gói (front-run, victim tx, back-run) thành một bundle và đảm bảo không bị chen ngang.
- **Private orderflow**: bundle gửi thẳng tới builder qua kênh riêng, **không qua mempool công khai** → không lộ, không bị front-run lại, giao dịch thất bại **không tốn gas** (không lên chain).
- **Sealed-bid auction**: searcher trả tiền cho quyền được đưa bundle vào bằng cách trả trực tiếp cho block producer (qua `block.coinbase.transfer` hoặc priority fee). Ai trả cao nhất thắng — nhưng **đấu giá kín**, không phải chiến tranh gas công khai.

Sau The Merge, kiến trúc này chuẩn hóa thành **MEV-Boost** — phần mềm sidecar cho validator:

<svg viewBox="0 0 720 340" role="img" aria-labelledby="mb-t mb-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="mb-t">Luồng MEV-Boost: searcher → builder → relay → proposer</title>
<desc id="mb-d">Sơ đồ chuỗi vai trò từ searcher gửi bundle tới builder ghép block, relay đấu giá, proposer ký header</desc>
<rect x="20" y="30" width="150" height="60" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="55" text-anchor="middle" font-size="13" fill="currentColor">Searchers</text>
<text x="95" y="74" text-anchor="middle" font-size="11" fill="currentColor">gửi bundle</text>
<rect x="20" y="140" width="150" height="60" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="165" text-anchor="middle" font-size="13" fill="currentColor">Users</text>
<text x="95" y="184" text-anchor="middle" font-size="11" fill="currentColor">tx (public/private)</text>
<rect x="270" y="80" width="160" height="80" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="112" text-anchor="middle" font-size="13" fill="currentColor">Builder</text>
<text x="350" y="132" text-anchor="middle" font-size="11" fill="currentColor">ghép block tối ưu</text>
<text x="350" y="149" text-anchor="middle" font-size="11" fill="currentColor">giá trị cao nhất</text>
<rect x="500" y="80" width="150" height="80" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="575" y="112" text-anchor="middle" font-size="13" fill="currentColor">Relay</text>
<text x="575" y="132" text-anchor="middle" font-size="11" fill="currentColor">giữ block, đấu giá</text>
<text x="575" y="149" text-anchor="middle" font-size="11" fill="currentColor">chống lộ nội dung</text>
<rect x="500" y="240" width="150" height="70" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="575" y="270" text-anchor="middle" font-size="13" fill="currentColor">Proposer</text>
<text x="575" y="289" text-anchor="middle" font-size="11" fill="currentColor">validator ký header</text>
<line x1="170" y1="60" x2="268" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#mah)"/>
<line x1="170" y1="170" x2="268" y2="135" stroke="currentColor" stroke-width="1.5" marker-end="url(#mah)"/>
<line x1="430" y1="120" x2="498" y2="120" stroke="currentColor" stroke-width="1.5" marker-end="url(#mah)"/>
<line x1="575" y1="160" x2="575" y2="238" stroke="currentColor" stroke-width="1.5" marker-end="url(#mah)"/>
<text x="470" y="205" text-anchor="middle" font-size="10.5" fill="currentColor">chỉ gửi HEADER + bid</text>
<line x1="500" y1="285" x2="360" y2="285" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 4" marker-end="url(#mah)"/>
<text x="430" y="278" text-anchor="middle" font-size="10.5" fill="currentColor">ký xong → relay mới lộ full block</text>
<line x1="350" y1="240" x2="350" y2="165" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<defs><marker id="mah" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Điểm mấu chốt bảo mật: proposer chỉ nhận **header + số tiền bid**, **ký cam kết** header đó *trước khi* thấy nội dung. Relay chỉ tiết lộ full block **sau khi** proposer đã ký — nhờ đó proposer **không thể ăn cắp** MEV bên trong block (không thể unbundle rồi tự làm lại). Đây là lý do relay tồn tại như một bên trung gian tin cậy tạm thời.

### 2.6 Proposer-Builder Separation (PBS)

**PBS** là ý tưởng **tách vai trò**:
- **Proposer** (validator): chỉ có quyền/nghĩa vụ **chọn block nào lên chain** và ký nó.
- **Builder**: chuyên môn hóa việc **ghép nội dung block** tối ưu MEV, cạnh tranh với nhau qua đấu giá.

**Vì sao cần tách?** Nếu mọi validator phải tự tối ưu MEV, chỉ những validator giàu tài nguyên/thuật toán tinh vi mới cạnh tranh nổi → **tập trung hóa** quyền staking. PBS cho phép validator nhỏ (chạy ở nhà) vẫn nhận gần trọn giá trị MEV bằng cách **mua** block tốt nhất từ thị trường builder, mà không cần tự viết bot. Mục tiêu là **dân chủ hóa MEV**, giữ tập validator phân tán.

MEV-Boost là bản triển khai PBS **off-protocol** (ngoài giao thức): dựa vào **relay** — một bên tin cậy ngoài giao thức. Rủi ro: relay có thể censor, có thể sập, có thể thông đồng.

### 2.7 Enshrined PBS (ePBS)

**ePBS** đưa PBS **vào trong giao thức** (in-protocol), loại bỏ nhu cầu tin relay bên ngoài. Ý tưởng cốt lõi:

| | MEV-Boost (PBS hiện tại) | ePBS (tương lai) |
|--|--------------------------|------------------|
| Cam kết builder | Relay giữ, tin cậy ngoài giao thức | Giao thức bảo đảm bằng đồng thuận |
| Chống unbundle của proposer | Nhờ relay che nội dung | Nhờ luật consensus (commit-reveal) |
| Điểm lỗi | Relay sập/censor | Không có relay trung gian |
| Trạng thái | Đang chạy production | Đang nghiên cứu/thiết kế (roadmap) |

ePBS thường gắn với các thiết kế như **two-slot PBS** hoặc **PTC (Payload-Timeliness Committee)**: builder cam kết block on-chain, proposer ký header, và giao thức tự đảm bảo builder phải công bố payload đúng hạn nếu không bị phạt — thay thế vai trò relay bằng **luật chơi được enforce bởi validator set**. Đây là hướng để MEV supply chain **không cần trust bên trung gian**.

---

## 3. Ví dụ code — một bundle sandwich (minh họa để HIỂU cách phòng thủ)

> **Cảnh báo đạo đức**: sandwich attack **rút giá trị của user**. Đoạn code dưới đây minh họa cấu trúc bundle để bạn **hiểu và phòng thủ**, KHÔNG khuyến khích triển khai tấn công.

Searcher không gửi tx qua mempool mà gửi **bundle** qua Flashbots RPC. Ví dụ với `ethers.js` + `@flashbots/ethers-provider-bundle`:

```javascript
const { FlashbotsBundleProvider } = require("@flashbots/ethers-provider-bundle");
const { ethers } = require("ethers");

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
// authSigner: danh tính searcher để relay tính reputation (KHÔNG phải ví tiền)
const authSigner = new ethers.Wallet(process.env.AUTH_KEY, provider);

const flashbots = await FlashbotsBundleProvider.create(
  provider, authSigner, "https://relay.flashbots.net"
);

// victimTx: giao dịch nạn nhân đã ký, searcher bắt được từ mempool (đã raw-signed)
// frontRun / backRun: giao dịch searcher tự ký
const bundle = [
  { signedTransaction: frontRunTxRaw }, // 1. mua trước → đẩy giá
  { signedTransaction: victimTxRaw },   // 2. swap của nạn nhân
  { signedTransaction: backRunTxRaw },  // 3. bán ra → chốt lời
];

const blockNumber = await provider.getBlockNumber();
// Gửi bundle nhắm block kế tiếp — nguyên tử: cả 3 vào đúng thứ tự hoặc không tx nào vào
const submission = await flashbots.sendBundle(bundle, blockNumber + 1);
const resolution = await submission.wait();
// resolution: BundleIncluded | BlockPassedWithoutInclusion | AccountNonceTooHigh
console.log("Kết quả bundle:", resolution);
```

Điểm kỹ thuật quan trọng:
- **Tính nguyên tử** (`atomicity`): nếu chỉ front-run vào mà back-run trượt, searcher sẽ ôm rủi ro giá — nên bundle *phải* all-or-nothing.
- **Không lộ mempool**: bundle không phát tán công khai → không ai front-run lại searcher.
- **Trả cho builder**: back-run thường kết thúc bằng `block.coinbase.transfer(builderTip)` hoặc priority fee cao — chính là **giá thầu** trong sealed-bid auction.

**Phòng thủ ở phía user/dApp** (điều nên nhớ nhất trong bài):

```solidity
// Uniswap V2 Router — tham số phòng sandwich
function swapExactTokensForTokens(
    uint amountIn,
    uint amountOutMin,   // <-- LÁ CHẮN: đặt sát giá kỳ vọng (slippage thấp)
    address[] calldata path,
    address to,
    uint deadline        // <-- chống tx bị treo rồi thực thi ở giá xấu về sau
) external returns (uint[] memory amounts);
```

Nếu `amountOutMin` đặt sát (ví dụ chấp nhận trượt tối đa 0.3–0.5%), front-run đẩy giá vượt ngưỡng sẽ khiến giao dịch nạn nhân **revert** → searcher không kiếm được gì, tấn công vô hiệu. Ngoài ra user có thể gửi tx qua **private RPC** (Flashbots Protect, MEV Blocker) để **không vào mempool công khai**.

---

## 4. Tác hại của MEV

| Tác hại | Ảnh hưởng |
|---------|-----------|
| **Rút giá trị của user** | Sandwich/JIT làm user nhận giá xấu hơn — "thuế ẩn" trên mọi swap |
| **Đẩy phí & spam** (thời PGA) | Gas war làm tăng phí cho toàn mạng, tx thất bại lấp block |
| **Tập trung hóa** | Nếu MEV quá lớn, validator/builder mạnh thắng tất → giảm phân tán, đe dọa consensus (time-bandit / reorg attack) |
| **Rủi ro kiểm duyệt** | Builder/relay có thể **lọc** giao dịch (ví dụ tuân thủ danh sách trừng phạt) → giảm tính chống kiểm duyệt |
| **Trust relay** | MEV-Boost phụ thuộc relay off-protocol — điểm lỗi & điểm thao túng |

MEV nghiêm trọng nhất khi phần thưởng MEV **vượt** phần thưởng block đều đặn: khi đó có động cơ **reorg** (đào lại block cũ để cướp MEV) — đe dọa trực tiếp tính an toàn/finality của chain.

---

## 5. Hướng giảm thiểu

1. **Encrypted mempool (threshold/time-lock encryption)**: giao dịch được **mã hóa** khi vào mempool, chỉ **giải mã sau khi thứ tự đã chốt**. Builder phải sắp xếp **mù** — không đọc được nội dung nên không thể sandwich/front-run. (Ví dụ hướng nghiên cứu: Shutter Network, threshold decryption.)
2. **Fair ordering / first-come-first-served**: giao thức consensus ép thứ tự theo thời gian nhận (ví dụ Aequitas, Themis), giảm quyền tùy ý sắp xếp.
3. **Batch auction / uniform clearing price**: gom lệnh trong một khoảng thời gian, khớp **cùng một mức giá** (CoWSwap) → không còn ý nghĩa để front-run trong batch.
4. **Private orderflow / RPC bảo vệ**: Flashbots Protect, MEV Blocker — user gửi tx riêng, không lộ mempool; một phần MEV được **hoàn lại** cho user (MEV rebate/refund).
5. **PBS → ePBS**: dân chủ hóa MEV và loại bỏ trust relay, giữ validator phân tán.
6. **Thiết kế giao thức DeFi**: dùng oracle TWAP, hạn chế slippage, dùng RFQ/intent-based (giải quyết ngoài chain, chỉ settle on-chain).

Không giải pháp nào **xóa** MEV (nó là thuộc tính cấu trúc); mục tiêu là **phân phối lại công bằng hơn** và **giảm phần có hại** (sandwich) trong khi giữ phần lành tính (arbitrage giúp giá hội tụ).

---

## 6. Tóm tắt
- **MEV** = giá trị tối đa rút được nhờ quyền **thêm/bỏ/sắp xếp** giao dịch — thuộc tính cấu trúc của blockchain có thứ tự, không phải bug.
- Bốn dạng chính: **arbitrage** (lành tính), **liquidation** (cần thiết), **sandwich** (có hại), **JIT** (xám).
- **Public mempool + quyền ordering** sinh ra searcher và **gas war (PGA)** — đắt, ồn, spam.
- **Flashbots/MEV-Boost** thay PGA bằng **private orderflow + bundle nguyên tử + sealed-bid auction**; **relay** che nội dung để proposer không ăn cắp MEV.
- **PBS** tách proposer (chọn & ký) khỏi builder (ghép block) để **dân chủ hóa MEV** và giữ validator phân tán; **ePBS** đưa việc này vào giao thức, bỏ trust relay.
- Phòng thủ user: **slippage thấp + deadline + private RPC**; hướng hệ thống: **encrypted mempool, fair ordering, batch auction**.

> **Bài tiếp theo (Bài 46):** đi vào **Rollup & Data Availability** — cách L2 kế thừa bảo mật L1 và MEV dịch chuyển lên tầng sequencer ra sao.
