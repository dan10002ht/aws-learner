# Bài 17 — Chuẩn token: ERC-20/721/1155/4626

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **vì sao cần "chuẩn" token** (ERC standard) — và điều gì thực sự được "chuẩn hoá".
- Đọc & dùng thành thạo **ERC-20** (fungible): `balanceOf`, `transfer`, `approve`, `transferFrom`, `allowance`.
- Hiểu **ERC-721** (NFT — mỗi token độc nhất): `ownerOf`, `tokenURI`.
- Phân biệt **ERC-1155** (multi-token / semi-fungible) và khi nào nó thắng 20/721.
- Nắm **ERC-4626** (tokenized vault) — chuẩn "share" cho yield/DeFi.
- Hiểu tận gốc pattern **approve + transferFrom**, và các **rủi ro** (unlimited approve, front-running, phishing).

---

## 2. Lý thuyết

### 2.1 "Chuẩn token" thực chất là gì?

Một **token không phải là một loại đồng coin riêng** — nó chỉ là **một smart contract** giữ một cái bảng "địa chỉ → số dư" và cho phép chuyển số dư đó. Vấn đề: nếu mỗi contract tự đặt tên hàm theo ý mình (`send`, `pay`, `chuyen`...), thì ví (wallet), sàn (exchange), contract khác **không thể** biết cách nói chuyện với nó.

**ERC (Ethereum Request for Comments)** giải bài này bằng cách quy ước **một interface chung**: cùng tên hàm, cùng tham số, cùng event. Miễn contract của bạn **cài đúng các hàm đó**, thì mọi ví/sàn/DeFi trên đời đều tương tác được — không cần biết bên trong bạn viết gì.

> Analogy: chuẩn token giống **ổ cắm điện tiêu chuẩn**. Nhà máy điện (contract) có thể phát điện kiểu gì tuỳ ý, nhưng nếu cái **ổ cắm** (interface) đúng chuẩn, mọi thiết bị (ví, sàn) cứ cắm vào là chạy. ERC chuẩn hoá **cái ổ cắm**, không chuẩn hoá bên trong.

Điểm mấu chốt: **chuẩn = interface + hành vi bắt buộc**, không phải một thư viện. `interface IERC20` chỉ là chữ ký; bạn vẫn phải tự (hoặc dùng OpenZeppelin) viết phần thân.

### 2.2 ERC-20 — token fungible (đồng nhất, chia được)

**Fungible** = mọi đơn vị **như nhau và thay thế được**: 1 USDC của tôi = 1 USDC của bạn, y hệt tờ tiền. Đây là chuẩn của stablecoin (USDC, DAI), governance token (UNI), wrapped token (WETH)...

Trái tim ERC-20 chỉ là **một mapping số dư** và **một mapping allowance**:

```solidity
mapping(address => uint256) balanceOf;                       // ai giữ bao nhiêu
mapping(address => mapping(address => uint256)) allowance;   // chủ => spender => hạn mức
```

Sáu hàm + hai event cốt lõi:

| Thành phần | Ý nghĩa |
|-----------|---------|
| `totalSupply()` | Tổng cung đang tồn tại |
| `balanceOf(a)` | Số dư của địa chỉ `a` |
| `transfer(to, amt)` | **Tôi** gửi `amt` token của chính tôi cho `to` |
| `approve(spender, amt)` | Cho phép `spender` được rút tối đa `amt` từ **ví tôi** |
| `allowance(owner, spender)` | Hạn mức `spender` còn được rút từ `owner` |
| `transferFrom(from, to, amt)` | `spender` rút `amt` **từ ví `from`** sang `to` (trong hạn mức) |
| event `Transfer`, `Approval` | Log để ví/indexer bám theo |

Chú ý **`decimals`**: ERC-20 lưu số nguyên, không có số thập phân. `decimals = 18` nghĩa là "1 token" hiển thị = `1 * 10^18` đơn vị nhỏ nhất (giống wei của ETH). USDC dùng `decimals = 6`. Đây là nguồn bug kinh điển: quên nhân/chia đúng luỹ thừa.

### 2.3 Pattern approve + transferFrom (rất quan trọng)

`transfer` chỉ dùng khi **chính chủ** chuyển. Nhưng DeFi cần **contract khác tiêu token hộ bạn** (Uniswap swap, Aave gửi tiền vào pool). Contract không thể tự lấy token trong ví bạn — bạn phải **uỷ quyền** trước. Đó là quy trình **hai bước**:

<svg viewBox="0 0 720 320" role="img" aria-labelledby="af-t af-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="af-t">Luồng approve + transferFrom</title>
<desc id="af-d">Người dùng gọi approve để cấp hạn mức cho contract, sau đó contract gọi transferFrom để rút token</desc>
<rect x="40" y="40" width="120" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="100" y="70" text-anchor="middle" font-size="13" fill="currentColor">User (owner)</text>
<rect x="300" y="40" width="140" height="50" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="370" y="65" text-anchor="middle" font-size="13" fill="currentColor">Token ERC-20</text>
<text x="370" y="82" text-anchor="middle" font-size="11" fill="currentColor">(giữ balances)</text>
<rect x="560" y="40" width="130" height="50" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="625" y="70" text-anchor="middle" font-size="13" fill="currentColor">DeFi contract</text>
<line x1="160" y1="120" x2="300" y2="120" stroke="currentColor" stroke-width="1.5" marker-end="url(#a17)"/>
<text x="230" y="112" text-anchor="middle" font-size="12" fill="#3b82f6">1. approve(DeFi, 100)</text>
<text x="230" y="138" text-anchor="middle" font-size="11" fill="currentColor">allowance[user][DeFi]=100</text>
<line x1="160" y1="180" x2="560" y2="180" stroke="currentColor" stroke-width="1.5" marker-end="url(#a17)"/>
<text x="360" y="172" text-anchor="middle" font-size="12" fill="#10b981">2. gọi DeFi.deposit(100)</text>
<line x1="560" y1="230" x2="445" y2="230" stroke="currentColor" stroke-width="1.5" marker-end="url(#a17)"/>
<text x="500" y="222" text-anchor="middle" font-size="12" fill="#10b981">3. transferFrom(user, DeFi, 100)</text>
<text x="370" y="270" text-anchor="middle" font-size="11" fill="currentColor">Token kiểm tra allowance ≥ 100 → trừ balance user, cộng cho DeFi, giảm allowance</text>
<text x="370" y="292" text-anchor="middle" font-size="11" fill="#f43f5e">Nếu allowance chưa cấp → transferFrom revert</text>
<defs><marker id="a17" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Bản chất: `approve` **không chuyển token**, chỉ ghi vào sổ `allowance` một hạn mức. Sau đó contract mới dùng `transferFrom` để **thực sự kéo** token — và mỗi lần kéo, `allowance` bị trừ đi tương ứng.

### 2.4 Rủi ro của approve — phải nắm rõ

| Rủi ro | Bản chất | Cách giảm thiểu |
|--------|----------|-----------------|
| **Unlimited approve** | Ví/DApp thường xin `approve(spender, type(uint256).max)` cho tiện. Nếu spender bị hack, nó rút **sạch** ví bạn. | Approve **đúng số cần**; định kỳ revoke (approve về 0); dùng revoke.cash. |
| **Approve race (ERC-20 gốc)** | Đổi allowance từ N→M trực tiếp: spender có thể front-run tiêu N rồi tiêu tiếp M. | Set về 0 trước rồi mới set M; hoặc dùng `increaseAllowance`/`decreaseAllowance` (OpenZeppelin). |
| **Phishing "approve"** | Web lừa bạn ký approve cho contract kẻ gian thay vì "connect wallet vô hại". | Đọc kỹ hàm đang ký; ký approve = trao quyền tiêu tiền. |
| **Permit (EIP-2612)** | Approve bằng **chữ ký off-chain**, gộp vào 1 tx — tiện nhưng chữ ký phishing cũng nguy hiểm y hệt. | Kiểm tra domain & spender trước khi ký. |

> Ghi nhớ: **`approve` là hành động trao quyền tiêu tiền, không phải "cho phép kết nối"**. Đa số vụ mất token trong ví (không phải hack contract) đến từ chữ ký approve nhầm chỗ.

### 2.5 ERC-721 — NFT, mỗi token độc nhất

**Non-fungible** = mỗi token **khác nhau, không thay thế được** — như số khung xe, vé có ghế cố định, tác phẩm nghệ thuật. Thay vì "số dư", ERC-721 lưu **chủ sở hữu của từng `tokenId`**:

```solidity
mapping(uint256 => address) private _owners;      // tokenId => chủ
mapping(address => uint256) private _balances;    // đếm số NFT mỗi ví giữ
```

Hai hàm đặc trưng:
- **`ownerOf(tokenId)`** → trả về địa chỉ đang sở hữu token đó (721 không hỏi "bao nhiêu" mà hỏi "của ai").
- **`tokenURI(tokenId)`** → trả về **URL trỏ tới metadata** (JSON: name, image, attributes). Ảnh NFT thường **không nằm on-chain** — chỉ URL/IPFS hash nằm on-chain, ảnh thật ở IPFS/HTTP.

ERC-721 cũng có approve nhưng ở mức token: `approve(to, tokenId)` (uỷ quyền 1 NFT) và `setApprovalForAll(operator, true)` (uỷ quyền **toàn bộ** bộ sưu tập — đây là cái marketplace như OpenSea xin, và cũng là bề mặt phishing lớn).

### 2.6 ERC-1155 — multi-token / semi-fungible

Một contract ERC-721 = một bộ sưu tập. Nhưng game cần **hàng nghìn loại vật phẩm** (1000 thanh kiếm giống nhau + 1 kiếm huyền thoại độc nhất). Deploy nghìn contract 721 thì tốn kém. **ERC-1155** cho phép **một contract quản lý nhiều `id`**, mỗi `id` có **nhiều bản** (`amount`):

```solidity
mapping(uint256 => mapping(address => uint256)) balances;  // id => (owner => số lượng)
```

- `id` "vàng" có amount 500 → **fungible** (như ERC-20 trong cùng contract).
- `id` "kiếm huyền thoại" có amount 1 → **non-fungible** (như ERC-721).
- → gọi là **semi-fungible**: cùng một chuẩn phục vụ cả hai.

Ưu thế lớn: **batch operations** — `safeBatchTransferFrom` chuyển nhiều loại vật phẩm trong **một tx** (rẻ gas hơn nhiều so với nhiều tx 721 riêng lẻ). Rất hợp game, vé sự kiện, tài sản trong metaverse.

### 2.7 So sánh nhanh 20 / 721 / 1155

| Tiêu chí | ERC-20 | ERC-721 | ERC-1155 |
|----------|--------|---------|----------|
| Tính chất | Fungible | Non-fungible | Semi-fungible |
| Đơn vị lưu trữ | `balanceOf(owner)` | `ownerOf(tokenId)` | `balanceOf(owner, id)` |
| Số loại/contract | 1 loại | 1 bộ, nhiều id độc nhất | Nhiều id, mỗi id nhiều bản |
| Batch transfer | Không | Không | **Có** (batch) |
| Use case điển hình | Tiền tệ, stablecoin, governance | Nghệ thuật, sưu tầm, ID | Game item, vé, tài sản hỗn hợp |

### 2.8 ERC-4626 — tokenized vault (chuẩn của DeFi yield)

Bài toán: bạn gửi USDC vào một vault sinh lời (Aave, Yearn). Vault trả bạn một **"share" (chứng chỉ phần vốn)** đại diện quyền rút vốn + lãi. Trước 4626, mỗi vault tự đặt tên hàm (`deposit`/`mint`/`enter`...), aggregator phải viết adapter riêng cho từng vault → dễ lỗi.

**ERC-4626** chuẩn hoá vault đó: nó **chính là một ERC-20** (share token) **cộng thêm** interface vault:

| Hàm 4626 | Ý nghĩa |
|----------|---------|
| `asset()` | Token nền vault nhận (vd USDC) |
| `deposit(assets, receiver)` | Gửi asset vào, nhận **shares** |
| `mint(shares, receiver)` | Nhận đúng số shares mong muốn, trả tương ứng asset |
| `withdraw(assets, receiver, owner)` | Rút ra đúng số asset, đốt shares |
| `redeem(shares, receiver, owner)` | Đốt shares, nhận asset tương ứng |
| `convertToShares` / `convertToAssets` | Tỷ giá quy đổi asset ↔ share |

Cơ chế sinh lời: **tỷ giá share/asset tăng dần**. Bạn gửi 100 USDC nhận 100 shares; vault kiếm lãi, tổng asset thành 110; giờ 100 shares của bạn `redeem` được 110 USDC. Vì 4626 **kế thừa ERC-20**, share token có thể được chuyển, dùng làm collateral, ghép vào DeFi khác — tính **composability** (lego tài chính) là điểm mạnh.

> Cảnh báo bảo mật kinh điển của 4626: **inflation / donation attack** — kẻ tấn công là người deposit đầu tiên với 1 wei rồi "donate" token trực tiếp để bóp méo tỷ giá, làm nạn nhân deposit sau nhận 0 share (bị làm tròn xuống). Vault chuẩn phải chống bằng "virtual shares/assets offset" (OpenZeppelin 4626 đã tích hợp).

---

## 3. Code ví dụ — ERC-20 tối giản (chạy được)

Đây là ERC-20 **tự viết từ số 0** để bạn thấy rõ cơ chế (production nên dùng OpenZeppelin):

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MiniToken {
    string public name = "Mini Token";
    string public symbol = "MINI";
    uint8  public decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // Mint toàn bộ cung ban đầu cho người deploy
    constructor(uint256 initialSupply) {
        totalSupply = initialSupply * 10 ** decimals;
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply); // mint = chuyển từ address(0)
    }

    // Chính chủ chuyển token của mình
    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    // Uỷ quyền: cho spender được rút tối đa `amount` từ ví tôi
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    // Spender rút token từ ví `from` (trong hạn mức đã approve)
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "allowance exceeded");
        if (allowed != type(uint256).max) {          // unlimited approve thì không trừ
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    // Logic chuyển chung — 0.8.x tự revert khi underflow nên không cần SafeMath
    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "transfer to zero");
        require(balanceOf[from] >= amount, "insufficient balance");
        balanceOf[from] -= amount;
        balanceOf[to]   += amount;
        emit Transfer(from, to, amount);
    }
}
```

Điểm cần hiểu:
- **`msg.sender`** là người gọi hàm. Trong `transfer` nó là người chuyển; trong `transferFrom` nó là **spender** đang tiêu hộ.
- **Event bắt buộc**: ví như MetaMask, indexer như Etherscan chỉ "thấy" token của bạn nhờ đọc event `Transfer`. Quên `emit` = số dư không hiện dù logic đúng.
- **Mint = `Transfer` từ `address(0)`**; **burn = `Transfer` tới `address(0)`** — đây là quy ước cả hệ sinh thái bám theo.
- Solidity **0.8+** tự động revert khi tràn số (overflow/underflow), nên `require(balanceOf[from] >= amount)` là để có **thông báo lỗi rõ ràng**, không phải để chống tràn.

### 3.1 Production: dùng OpenZeppelin

Đừng tự viết token cho sản phẩm thật — dùng thư viện đã được audit:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    constructor() ERC20("My Token", "MYT") Ownable(msg.sender) {
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    // Chỉ owner được phát hành thêm
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
```

OpenZeppelin đã cài chuẩn xác `transferFrom`, `increaseAllowance/decreaseAllowance`, event, và các extension (`ERC20Burnable`, `ERC20Permit`, `ERC20Pausable`). Với NFT/vault, tương tự có `ERC721`, `ERC1155`, `ERC4626` — kế thừa và override phần cần thiết.

---

## 4. Tình huống thực tế
- **Swap trên Uniswap**: ví bạn ký `approve(router, X)` cho token vào, rồi router `transferFrom` kéo token — đúng pattern 2.3. Lần đầu swap một token luôn tốn **2 tx** (approve + swap) vì lý do này.
- **Mua NFT trên OpenSea**: bạn `setApprovalForAll(seaport, true)` một lần cho cả bộ sưu tập; sau đó mọi lần bán chỉ cần ký off-chain. Rủi ro: nếu ký nhầm operator độc hại, toàn bộ NFT có thể bị kéo đi.
- **Gửi USDC vào Aave**: token aUSDC bạn nhận về chính là một dạng share (tư duy 4626) — số dư aUSDC tự tăng theo lãi.

---

## 5. Tóm tắt
- **Chuẩn token = interface chung** (tên hàm/event) để ví, sàn, DeFi tương tác được với bất kỳ token nào.
- **ERC-20** (fungible): sổ `balanceOf` + `allowance`; sáu hàm cốt lõi, chú ý `decimals`.
- **Pattern approve + transferFrom** là nền tảng DeFi — `approve` cấp hạn mức, contract dùng `transferFrom` để kéo token. **Approve = trao quyền tiêu tiền**, cẩn thận unlimited approve & phishing.
- **ERC-721** (NFT): `ownerOf` + `tokenURI`, mỗi `tokenId` độc nhất, metadata/ảnh thường ở IPFS.
- **ERC-1155** (semi-fungible): một contract nhiều `id`, mỗi `id` nhiều bản, hỗ trợ **batch** — hợp game/vé.
- **ERC-4626** (vault): kế thừa ERC-20, chuẩn hoá deposit/withdraw/redeem cho yield; coi chừng inflation attack.
- **Production dùng OpenZeppelin** — đừng tự viết token đã có thư viện audit.

> **Bài tiếp theo (Bài 18):** đi sâu vào **DeFi primitives** — AMM, lending, oracle — nơi các chuẩn token này ghép lại thành "lego tài chính".
