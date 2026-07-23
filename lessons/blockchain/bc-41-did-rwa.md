# Bài 44 — Identity (DID), RWA & CBDC

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **Decentralized Identity (DID)**, **Verifiable Credential (VC)** và **Soulbound Token (SBT)** — danh tính không do một cơ quan trung tâm nắm giữ.
- Hiểu **zk-identity**: chứng minh một thuộc tính (đủ 18 tuổi, là công dân...) **mà không lộ dữ liệu gốc**.
- Nắm quy trình **tokenization tài sản thực (RWA)** — trái phiếu, bất động sản, tín dụng — và ba nút thắt: **pháp lý, oracle, custody**.
- Phân biệt **stablecoin định chế** và **CBDC** với crypto phi tập trung — vì sao chúng gần như *ngược* triết lý gốc của blockchain.
- Biết khi nào on-chain thật sự tạo giá trị, khi nào chỉ là "database có token".

---

## 2. Decentralized Identity (DID)

### 2.1 Analogy — chiếc ví đựng bằng cấp của chính bạn

Ngày nay danh tính số của bạn nằm rải rác trong server của Google, Facebook, ngân hàng, chính phủ. Mỗi lần đăng nhập bằng "Login with Google", bạn **mượn** danh tính từ họ — và họ thấy bạn đi đâu, làm gì. Đây là mô hình **federated identity**: tiện, nhưng bạn không sở hữu danh tính của mình.

DID lật ngược mô hình: danh tính giống một **chiếc ví vật lý** đựng bằng lái, thẻ sinh viên, chứng chỉ tiêm chủng. Bạn **tự giữ**, tự quyết định chìa ra cái nào cho ai. Cơ quan cấp (issuer) ký lên tấm bằng, người xác minh (verifier) kiểm chữ ký — **không cần gọi về server của issuer**.

### 2.2 Ba vai trong tam giác tin cậy (trust triangle)

<svg viewBox="0 0 700 300" role="img" aria-labelledby="dt-t dt-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="dt-t">Tam giác tin cậy của Verifiable Credential</title>
<desc id="dt-d">Issuer cấp credential cho Holder, Holder xuất trình cho Verifier, cả ba tra cứu DID trên sổ cái phân tán</desc>
<rect x="40" y="40" width="150" height="60" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="66" text-anchor="middle" font-size="14" fill="currentColor">Issuer</text>
<text x="115" y="86" text-anchor="middle" font-size="11" fill="currentColor">ĐH, chính phủ</text>
<rect x="510" y="40" width="150" height="60" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="585" y="66" text-anchor="middle" font-size="14" fill="currentColor">Verifier</text>
<text x="585" y="86" text-anchor="middle" font-size="11" fill="currentColor">nhà tuyển dụng</text>
<rect x="275" y="200" width="150" height="60" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="226" text-anchor="middle" font-size="14" fill="currentColor">Holder</text>
<text x="350" y="246" text-anchor="middle" font-size="11" fill="currentColor">bạn + ví DID</text>
<line x1="190" y1="90" x2="285" y2="205" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<text x="200" y="160" text-anchor="middle" font-size="11" fill="currentColor">cấp VC (ký)</text>
<line x1="415" y1="205" x2="510" y2="90" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<text x="500" y="160" text-anchor="middle" font-size="11" fill="currentColor">xuất trình VP</text>
<line x1="190" y1="70" x2="510" y2="70" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<text x="350" y="60" text-anchor="middle" font-size="11" fill="currentColor">không cần liên hệ trực tiếp</text>
<rect x="230" y="120" width="240" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="145" text-anchor="middle" font-size="12" fill="currentColor">Sổ cái DID (public key của issuer)</text>
<defs><marker id="a2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

- **Issuer** (bên cấp): trường đại học, chính phủ, ngân hàng. Ký credential bằng private key của mình.
- **Holder** (chủ sở hữu): bạn. Giữ credential trong **ví DID** trên điện thoại, không phải trên server ai cả.
- **Verifier** (bên xác minh): nhà tuyển dụng, sàn giao dịch. Chỉ cần **public key của issuer** (lấy từ DID document) để kiểm chữ ký — offline, không cần hỏi issuer.

Blockchain ở đây **không lưu dữ liệu cá nhân**. Nó chỉ lưu **DID document** chứa public key và endpoint — như một danh bạ khóa công khai chống giả mạo.

### 2.3 DID và VC trông như thế nào

Một **DID** là một URI phân giải được, ví dụ `did:ethr:0x3b0BC51...`. Nó trỏ tới một **DID Document** (JSON) chứa public key và cơ chế xác thực. Một **Verifiable Credential** là JSON được issuer ký:

```json
{
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "type": ["VerifiableCredential", "UniversityDegree"],
  "issuer": "did:ethr:0xUniversityABC",
  "issuanceDate": "2026-06-15T00:00:00Z",
  "credentialSubject": {
    "id": "did:ethr:0xAlice",
    "degree": { "type": "BachelorDegree", "name": "Computer Science" }
  },
  "proof": {
    "type": "EcdsaSecp256k1Signature2019",
    "created": "2026-06-15T00:00:00Z",
    "verificationMethod": "did:ethr:0xUniversityABC#keys-1",
    "jws": "eyJhbGci...<chữ ký của issuer>"
  }
}
```

Khi đi phỏng vấn, Alice không đưa cả VC mà tạo một **Verifiable Presentation (VP)** — gói VC lại và **ký thêm bằng khóa của chính Alice** để chứng minh "tôi đúng là chủ của credential này". Verifier kiểm **hai chữ ký**: của issuer (bằng thật) và của holder (đúng người).

### 2.4 Soulbound Token (SBT) — danh tính không chuyển nhượng

Ý tưởng của Vitalik Buterin (2022): một số thứ **không nên mua bán được** — bằng cấp, lịch sử tín dụng, tư cách thành viên, danh tiếng. **SBT** là token **non-transferable**: mint vào ví bạn thì gắn với ví đó vĩnh viễn (hoặc chỉ revoke được bởi issuer). Đây là NFT bị gỡ hàm `transfer`.

```solidity
// SBT tối giản: ERC-721 nhưng chặn mọi chuyển nhượng
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SoulboundCredential is ERC721, Ownable {
    uint256 private _nextId;

    constructor() ERC721("SoulboundCredential", "SBC") Ownable(msg.sender) {}

    // Chỉ issuer (owner) được mint; không có hàm transfer public nào dùng được
    function issue(address to) external onlyOwner returns (uint256 id) {
        id = ++_nextId;
        _safeMint(to, id);
    }

    // Issuer có quyền thu hồi (vd: bằng bị hủy, thành viên rời tổ chức)
    function revoke(uint256 id) external onlyOwner {
        _burn(id);
    }

    // Chặn transfer: OZ v5 gọi _update cho cả mint/burn/transfer.
    // from == 0 là mint, to == 0 là burn — chỉ cho hai trường hợp đó.
    function _update(address to, uint256 id, address auth)
        internal override returns (address)
    {
        address from = _ownerOf(id);
        require(from == address(0) || to == address(0), "Soulbound: non-transferable");
        return super._update(to, id, auth);
    }
}
```

Điểm mấu chốt: override `_update` để **chỉ cho phép mint (from = 0) và burn (to = 0)**, chặn mọi transfer giữa hai địa chỉ thật. So với VC off-chain, SBT **on-chain và công khai** — hợp danh tiếng cần được thấy (vote quyền, whitelist), nhưng **lộ dữ liệu** nếu gắn thông tin nhạy cảm. Nguyên tắc: SBT nên trỏ tới bằng chứng, không chứa dữ liệu gốc.

### 2.5 zk-identity — chứng minh mà không tiết lộ

Vấn đề của VC/SBT thô: để chứng minh "đủ 18 tuổi" bạn thường phải chìa cả ngày sinh, thậm chí cả CMND. **Zero-knowledge proof** (Bài về zk-SNARK) cho phép chứng minh **một mệnh đề đúng** mà không lộ dữ liệu tạo ra nó.

| Câu hỏi của verifier | Cách truyền thống | Cách zk-identity |
|----------------------|-------------------|------------------|
| Bạn đủ 18 tuổi? | Đưa ngày sinh / CMND | Proof: `birthYear <= 2008`, không lộ năm sinh |
| Thu nhập > 20k để vay? | Đưa sao kê lương | Proof: `income > 20000`, không lộ con số |
| Bạn là công dân EU? | Đưa hộ chiếu | Proof: hộ chiếu nằm trong Merkle set hợp lệ |

Cơ chế: issuer cấp credential + commitment on-chain (thường là **Merkle root** của tập identity). Holder tạo **zk-proof** rằng "tôi biết một credential nằm trong set này và thỏa điều kiện X" — nộp proof cho verifier hoặc cho smart contract. Ứng dụng thực tế: **Sismo**, **Polygon ID**, **World ID** (proof-of-personhood chống bot), **zkPassport**. Đây là hướng khiến DID thật sự bảo vệ quyền riêng tư thay vì chỉ "đổi chỗ lưu dữ liệu".

---

## 3. RWA — Tokenization tài sản thực

### 3.1 Bản chất: token chỉ là "biên nhận", giá trị nằm ngoài chuỗi

**Real-World Asset tokenization** là phát hành token đại diện quyền sở hữu (hoặc quyền hưởng dòng tiền) trên một tài sản ngoài đời: trái phiếu kho bạc, căn hộ, khoản vay, vàng, tín chỉ carbon. Token hóa hứa hẹn: **thanh khoản** (bán 1/1000 căn nhà), **giao dịch 24/7**, **settlement tức thì**, **minh bạch sổ sách**.

Nhưng phải khắc cốt: **token không phải là tài sản**. Token BTC *là* tài sản (native). Token bất động sản chỉ là **biên nhận số** — giá trị thật nằm ở tòa nhà và ở **tờ giấy pháp lý** buộc thế giới thực công nhận biên nhận đó. Nếu luật không công nhận, on-chain bạn "sở hữu" token mà off-chain chẳng ai trả nhà cho bạn.

### 3.2 Ba nút thắt sống còn

<svg viewBox="0 0 700 260" role="img" aria-labelledby="rwa-t rwa-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="rwa-t">Cây cầu giữa tài sản thực và token on-chain</title>
<desc id="rwa-d">Tài sản thực nối tới token on-chain qua ba trụ cầu: pháp lý, custody và oracle</desc>
<rect x="30" y="100" width="130" height="70" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="130" text-anchor="middle" font-size="13" fill="currentColor">Tài sản thực</text>
<text x="95" y="150" text-anchor="middle" font-size="11" fill="currentColor">nhà, trái phiếu</text>
<rect x="540" y="100" width="130" height="70" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="605" y="130" text-anchor="middle" font-size="13" fill="currentColor">Token on-chain</text>
<text x="605" y="150" text-anchor="middle" font-size="11" fill="currentColor">ERC-20 / 3643</text>
<line x1="160" y1="135" x2="540" y2="135" stroke="currentColor" stroke-width="1" stroke-dasharray="5 5"/>
<rect x="205" y="40" width="120" height="55" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="265" y="65" text-anchor="middle" font-size="12" fill="currentColor">Pháp lý</text>
<text x="265" y="82" text-anchor="middle" font-size="10" fill="currentColor">SPV, hợp đồng</text>
<line x1="265" y1="95" x2="265" y2="135" stroke="currentColor" stroke-width="1.5"/>
<rect x="290" y="175" width="120" height="55" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="200" text-anchor="middle" font-size="12" fill="currentColor">Custody</text>
<text x="350" y="217" text-anchor="middle" font-size="10" fill="currentColor">ai giữ tài sản</text>
<line x1="350" y1="175" x2="350" y2="135" stroke="currentColor" stroke-width="1.5"/>
<rect x="375" y="40" width="120" height="55" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="435" y="65" text-anchor="middle" font-size="12" fill="currentColor">Oracle</text>
<text x="435" y="82" text-anchor="middle" font-size="10" fill="currentColor">giá &amp; proof-of-reserve</text>
<line x1="435" y1="95" x2="435" y2="135" stroke="currentColor" stroke-width="1.5"/>
</svg>

**1. Pháp lý — mối nối yếu nhất.** Ai buộc thế giới thực công nhận token = quyền sở hữu? Mô hình phổ biến: lập một **SPV** (Special Purpose Vehicle — pháp nhân riêng) *nắm tài sản thật*, rồi token đại diện cổ phần/quyền hưởng của SPV. Rủi ro: bất đồng giữa "sổ on-chain" và "sổ đăng ký đất/chứng khoán off-chain" — khi ra tòa, tòa xử theo **giấy tờ pháp lý**, không theo blockchain. Chưa kể **chứng khoán hóa** kích hoạt luật securities (KYC/AML, giới hạn nhà đầu tư) — vì vậy RWA hay dùng chuẩn **ERC-3643 (T-REX)** hoặc **ERC-1400** có sổ đăng ký danh tính và whitelist ngay trong token.

**2. Custody — ai thật sự giữ tài sản.** Token vàng cần có kho vàng thật và bên giữ hộ đáng tin. Điều này **tái tạo lại bên trung gian** mà crypto vốn muốn loại bỏ — bạn lại phải tin custodian không biển thủ, không phá sản.

**3. Oracle — cầu dữ liệu.** Smart contract không tự biết giá căn nhà hay trái phiếu còn tồn tại hay không. Cần **oracle** (Bài về oracle) đưa giá và đặc biệt là **proof-of-reserve** (bằng chứng dự trữ) chứng minh tài sản thật vẫn còn. Oracle sai/bị thao túng ⇒ token định giá sai, thanh lý oan. Đây là attack surface lớn nhất về mặt kỹ thuật.

### 3.3 Ba lớp tài sản RWA phổ biến

| Tài sản | Vì sao token hóa | Thách thức riêng |
|---------|------------------|------------------|
| **Trái phiếu / T-bills** | Lãi suất on-chain cho DeFi; settlement tức thì; đang là RWA lớn nhất (vd BlackRock BUIDL, Ondo) | Phải KYC nhà đầu tư; oracle lãi/NAV; chỉ nhà đầu tư đủ điều kiện |
| **Bất động sản** | Chia nhỏ, thanh khoản, sở hữu phân mảnh | Đăng ký đất theo pháp lý địa phương; định giá thưa; thanh khoản thật vẫn kém |
| **Tín dụng / khoản vay (private credit)** | Vốn on-chain cho vay off-chain (Centrifuge, Maple, Goldfinch) | Rủi ro vỡ nợ off-chain; định giá và thu hồi nợ phụ thuộc bên thật; oracle NAV |

> **Quy tắc thực chiến:** RWA on-chain **không** loại bỏ được rủi ro pháp lý/đối tác của tài sản gốc — nó chỉ chuyển *cách ghi sổ và cách giao dịch* lên chuỗi. Nếu mắt xích pháp lý/custody/oracle yếu, token hóa chỉ tạo cảm giác an toàn giả.

---

## 4. Stablecoin định chế & CBDC

### 4.1 Phổ mức độ tập trung

<svg viewBox="0 0 700 210" role="img" aria-labelledby="sc-t sc-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="sc-t">Phổ tiền số theo mức độ tập trung</title>
<desc id="sc-d">Từ trái sang phải tăng dần mức tập trung: crypto phi tập trung, stablecoin thuật toán, stablecoin định chế, CBDC</desc>
<line x1="40" y1="150" x2="660" y2="150" stroke="currentColor" stroke-width="1.5" marker-end="url(#a3)"/>
<text x="350" y="185" text-anchor="middle" font-size="12" fill="currentColor">Phi tập trung  →  Tập trung / có kiểm soát</text>
<rect x="35" y="60" width="130" height="60" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="100" y="85" text-anchor="middle" font-size="12" fill="currentColor">BTC / ETH</text>
<text x="100" y="103" text-anchor="middle" font-size="10" fill="currentColor">không ai kiểm soát</text>
<rect x="195" y="60" width="130" height="60" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="260" y="85" text-anchor="middle" font-size="12" fill="currentColor">DAI (crypto-backed)</text>
<text x="260" y="103" text-anchor="middle" font-size="10" fill="currentColor">bán phi tập trung</text>
<rect x="355" y="60" width="140" height="60" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="425" y="85" text-anchor="middle" font-size="12" fill="currentColor">USDC / USDT</text>
<text x="425" y="103" text-anchor="middle" font-size="10" fill="currentColor">công ty phát hành</text>
<rect x="525" y="60" width="140" height="60" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="595" y="85" text-anchor="middle" font-size="12" fill="currentColor">CBDC</text>
<text x="595" y="103" text-anchor="middle" font-size="10" fill="currentColor">ngân hàng TW</text>
<defs><marker id="a3" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 4.2 Stablecoin định chế — đồng đô-la được token hóa

**Stablecoin** neo giá vào tiền pháp định (thường 1 USD). Ba kiểu:
- **Fiat-collateralized** (USDC, USDT, PYUSD): mỗi token backed bằng 1 USD thật (tiền mặt + T-bills) do công ty phát hành giữ. Đây thực chất là một **RWA đặc biệt**: token hóa tiền gửi/trái phiếu ngắn hạn. Bản chất **tập trung** — issuer có thể **freeze/blacklist** ví (USDC có hàm `blacklist`), và bạn phải tin họ giữ đủ dự trữ (**proof-of-reserve** + kiểm toán).
- **Crypto-collateralized** (DAI): thế chấp *dư* bằng crypto on-chain, minh bạch, ít cần tin công ty — nhưng vốn kém hiệu quả (over-collateralized).
- **Algorithmic**: dùng thuật toán giữ giá, **không tài sản thật** đủ mạnh. Lịch sử đầy tai họa — **UST/Luna sụp 2022** là ví dụ điển hình về death spiral. Cẩn trọng tối đa.

"**Định chế**" (institutional) nghĩa là do các định chế tài chính lớn phát hành/dùng cho settlement (vd JPM Coin của JPMorgan) — nhanh, tuân thủ, nhưng là **hệ thống có phép**, gần với ngân hàng số hơn là crypto tự do.

### 4.3 CBDC — tiền pháp định số của ngân hàng trung ương

**Central Bank Digital Currency** là **nợ của ngân hàng trung ương** ở dạng số — không phải crypto. Nó là **legal tender** (tiền hợp pháp), khác hoàn toàn stablecoin (nợ của công ty tư nhân) và BTC (không nợ của ai). Ví dụ: e-CNY (Trung Quốc), Digital Euro (đang thử), eNaira, Sand Dollar.

Điểm cực kỳ quan trọng — **CBDC thường KHÔNG dùng blockchain phi tập trung**, và nếu có dùng DLT thì là **permissioned** do ngân hàng trung ương kiểm soát. Vì mục tiêu của CBDC *ngược* với crypto:

| Tiêu chí | Crypto phi tập trung (BTC/ETH) | CBDC |
|----------|-------------------------------|------|
| **Ai phát hành** | Không ai / giao thức | Ngân hàng trung ương |
| **Kiểm soát** | Phi tập trung, không thể chặn | Tập trung hoàn toàn |
| **Danh tính** | Pseudonymous | Định danh, có thể theo dõi |
| **Chính sách tiền tệ** | Cố định / thuật toán (BTC 21tr) | Nhà nước điều tiết, có thể lãi âm |
| **Kiểm duyệt giao dịch** | Chống kiểm duyệt | Có thể freeze/giới hạn/hết hạn tiền |
| **Bất biến** | Không thể đảo giao dịch | Có thể can thiệp |

CBDC giải bài "**tiền mặt số**" cho nhà nước: rẻ, nhanh, bao trùm tài chính, chống trốn thuế. Nhưng đánh đổi là **quyền riêng tư** và khả năng nhà nước **lập trình tiền** (giới hạn nơi tiêu, tiền hết hạn, phong tỏa). Đây là lý do CBDC gây tranh cãi — nó dùng *công nghệ sổ cái số* nhưng bỏ đi *tinh thần phi tập trung*.

> **Chốt tư duy:** đừng gọi CBDC hay stablecoin là "crypto". Chúng mượn công nghệ token/ledger nhưng nằm ở đầu **tập trung** của phổ. Giá trị của blockchain phi tập trung nằm ở *không cần tin ai*; giá trị của CBDC/stablecoin nằm ở *tin một bên đáng tin nhưng thanh toán nhanh & lập trình được*. Hai triết lý khác nhau — chọn đúng theo bài toán.

---

## 5. Sợi chỉ chung: on-chain claim vs off-chain truth

Cả ba chủ đề — DID, RWA, CBDC — đều xoay quanh **một câu hỏi**: on-chain ghi *một khẳng định*, nhưng *sự thật* nằm ở thế giới thực.
- **DID**: token/VC nói "Alice tốt nghiệp" — sự thật là trường có cấp bằng thật không. Giải bằng **chữ ký issuer + zk**.
- **RWA**: token nói "bạn sở hữu căn nhà" — sự thật là luật có công nhận không. Giải bằng **pháp lý (SPV) + oracle proof-of-reserve**.
- **CBDC/stablecoin**: token nói "1 USD" — sự thật là có 1 USD dự trữ không. Giải bằng **kiểm toán + proof-of-reserve**, hoặc bằng **quyền lực nhà nước** (CBDC).

Blockchain giỏi giữ *tính bất biến và đồng thuận về khẳng định*. Nó **không** tự bảo chứng khẳng định đó khớp thực tại — đó là việc của **oracle, pháp lý và danh tính**. Hiểu ranh giới này là ranh giới giữa người làm được việc và người bị marketing dẫn dắt.

---

## 6. Tóm tắt
- **DID/VC** trả danh tính về tay người dùng qua **tam giác issuer–holder–verifier**; blockchain chỉ lưu public key, không lưu dữ liệu cá nhân.
- **SBT** là token **non-transferable** cho danh tiếng/bằng cấp — override `_update` chỉ cho mint/burn; **zk-identity** cho chứng minh thuộc tính mà không lộ dữ liệu gốc.
- **RWA** token hóa tài sản thực nhưng token chỉ là *biên nhận* — ba nút thắt **pháp lý (SPV, ERC-3643), custody, oracle (proof-of-reserve)** quyết định thành bại.
- **Stablecoin định chế** là RWA của tiền pháp định, **tập trung** và có thể freeze; **CBDC** là tiền của ngân hàng trung ương — dùng công nghệ ledger nhưng **ngược** triết lý phi tập trung.
- Sợi chỉ chung: on-chain giữ *khẳng định*, thế giới thực giữ *sự thật* — cầu nối là **oracle, pháp lý, danh tính**, không phải bản thân blockchain.

> **Bài tiếp theo:** đi vào **tuân thủ & pháp lý cho Web3** — KYC/AML on-chain, travel rule, và cách thiết kế sản phẩm crypto sống được với quy định.
