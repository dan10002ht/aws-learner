# Bài 42 — NFT: chuẩn, metadata & lưu trữ phi tập trung

## 1. Mục tiêu
Sau bài này bạn có thể:
- Hiểu **NFT thực chất lưu gì on-chain** — và tại sao "bức ảnh" gần như **không nằm trên blockchain**.
- Đọc & viết đúng **`tokenURI`** và **metadata JSON schema** (`name` / `description` / `image` / `attributes`).
- Phân biệt **on-chain vs off-chain metadata**, hiểu tận gốc **rủi ro link chết** (dead link, rug của metadata).
- Nắm **IPFS** (content addressing, CID, pinning) và **Arweave** (permanent storage) — chọn đúng nơi lưu.
- Cài **royalty on-chain chuẩn EIP-2981** và biết vì sao royalty **không thực sự bắt buộc** ở tầng chuyển nhượng.
- Nhìn NFT **ngoài PFP**: vé sự kiện, membership, RWA (real-world assets), gaming item.

---

## 2. Lý thuyết

### 2.1 NFT lưu gì on-chain? (điểm gây sốc nhất)

Rất nhiều người tưởng "mua NFT là bức ảnh nằm trên blockchain". **Sai.** Một NFT (ERC-721) on-chain chỉ là **vài dòng dữ liệu tối giản**:

- Một `tokenId` (số nguyên duy nhất trong contract).
- Chủ sở hữu: `mapping(uint256 => address) ownerOf`.
- Một **con trỏ** tới nơi chứa mô tả: `tokenURI(tokenId)` → trả về một URL/URI.

Bức ảnh, tên, thuộc tính... **không** nằm trong contract. Chúng nằm ở đầu bên kia của cái URL đó — thường là một file JSON, và JSON đó lại trỏ tiếp tới file ảnh. Blockchain chỉ giữ **quyền sở hữu một cái ID + một đường link**.

> Analogy: NFT giống **tấm vé gửi xe**. Tấm vé (token on-chain) chứng minh bạn có quyền lấy chiếc xe, nhưng **chiếc xe (ảnh, metadata) để ở bãi khác**. Nếu bãi xe (server host metadata) đóng cửa, tấm vé vẫn còn nhưng **xe biến mất**. Đây chính là gốc rễ của "link chết".

<svg viewBox="0 0 720 250" role="img" aria-labelledby="ch-t ch-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="ch-t">Chuỗi tham chiếu của một NFT</title>
<desc id="ch-d">Contract on-chain trỏ tới tokenURI, tokenURI trỏ tới file JSON metadata, JSON trỏ tiếp tới file ảnh off-chain</desc>
<rect x="20" y="90" width="150" height="70" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="118" text-anchor="middle" font-size="13" fill="currentColor">Contract (on-chain)</text>
<text x="95" y="138" text-anchor="middle" font-size="11" fill="currentColor">tokenId + owner</text>
<rect x="220" y="90" width="150" height="70" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="295" y="118" text-anchor="middle" font-size="13" fill="currentColor">tokenURI()</text>
<text x="295" y="138" text-anchor="middle" font-size="11" fill="currentColor">trả về 1 URI</text>
<rect x="420" y="90" width="150" height="70" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="495" y="114" text-anchor="middle" font-size="13" fill="currentColor">metadata.json</text>
<text x="495" y="133" text-anchor="middle" font-size="11" fill="currentColor">name/image/attrs</text>
<text x="495" y="150" text-anchor="middle" font-size="11" fill="currentColor">(off-chain)</text>
<rect x="600" y="90" width="100" height="70" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="650" y="122" text-anchor="middle" font-size="12" fill="currentColor">image file</text>
<text x="650" y="140" text-anchor="middle" font-size="11" fill="currentColor">(off-chain)</text>
<line x1="170" y1="125" x2="218" y2="125" stroke="currentColor" stroke-width="1.5" marker-end="url(#a1)"/>
<line x1="370" y1="125" x2="418" y2="125" stroke="currentColor" stroke-width="1.5" marker-end="url(#a1)"/>
<line x1="570" y1="125" x2="598" y2="125" stroke="currentColor" stroke-width="1.5" marker-end="url(#a1)"/>
<text x="360" y="210" text-anchor="middle" font-size="11" fill="currentColor">Chỉ ô xanh nằm thật sự trên blockchain — mọi ô sau đều có thể "chết" nếu host biến mất</text>
<defs><marker id="a1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.2 `tokenURI` — con trỏ trung tâm

ERC-721 (phần mở rộng Metadata) quy định đúng **một hàm** cho việc mô tả:

```solidity
function tokenURI(uint256 tokenId) external view returns (string memory);
```

Nó trả về một **URI** trỏ tới file JSON metadata. URI có thể ở nhiều dạng scheme:

| Scheme | Ví dụ | Bản chất |
|--------|-------|----------|
| `https://` | `https://api.myproj.com/meta/42` | Server truyền thống — **tập trung**, dễ chết |
| `ipfs://` | `ipfs://bafybe.../42.json` | Content-addressed, phi tập trung (cần pin) |
| `ar://` | `ar://<txid>` | Arweave — trả một lần, lưu vĩnh viễn |
| `data:` | `data:application/json;base64,...` | **On-chain 100%** — JSON nhúng thẳng vào contract |

Trong thực tế, OpenZeppelin ghép `_baseURI()` + `tokenId`:

```solidity
// ERC721.sol (rút gọn)
function tokenURI(uint256 tokenId) public view virtual returns (string memory) {
    _requireOwned(tokenId);
    string memory base = _baseURI();
    return bytes(base).length > 0
        ? string.concat(base, tokenId.toString())   // vd: ipfs://CID/42
        : "";
}
```

Nếu `_baseURI()` trả `ipfs://bafy.../`, thì `tokenURI(42)` = `ipfs://bafy.../42`. Marketplace (OpenSea, Blur...) đọc chuỗi này, tải JSON, và render UI.

### 2.3 Metadata JSON schema

Metadata là một **file JSON theo chuẩn OpenSea/ERC-721** — đây là schema mà toàn ngành ngầm tuân theo:

```json
{
  "name": "Voidling #42",
  "description": "A generative creature from the Void collection.",
  "image": "ipfs://bafybeigdyr.../42.png",
  "external_url": "https://voidlings.xyz/42",
  "animation_url": "ipfs://bafy.../42.mp4",
  "attributes": [
    { "trait_type": "Background", "value": "Nebula" },
    { "trait_type": "Eyes", "value": "Laser" },
    { "trait_type": "Level", "value": 7, "display_type": "number" },
    { "trait_type": "Birthday", "value": 1546360800, "display_type": "date" }
  ]
}
```

Các field cốt lõi:
- **`name`, `description`**: tên & mô tả hiển thị.
- **`image`**: URI ảnh — **cực kỳ nên** dùng `ipfs://`/`ar://`, đừng dùng URL server riêng.
- **`attributes`**: mảng `trait_type` / `value` → tạo nên bộ lọc và **rarity** trên marketplace. `display_type` (`number`, `boost_percentage`, `date`...) quyết định cách hiển thị.
- **`animation_url`**: video/audio/HTML tương tác (thay cho ảnh tĩnh).

Điểm dân dev hay quên: **`image` phải là URI của file ảnh, không phải trang web**. Và toàn bộ URI trong JSON nên **immutable** (IPFS/Arweave) — nếu không, chủ dự án có thể **đổi ảnh sau khi bán** (một dạng rug).

### 2.4 On-chain vs off-chain metadata — và rủi ro link chết

Đây là quyết định kiến trúc quan trọng nhất khi làm NFT.

<svg viewBox="0 0 720 300" role="img" aria-labelledby="ba-t ba-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="ba-t">Off-chain server dễ chết vs storage phi tập trung bền vững</title>
<desc id="ba-d">So sánh metadata trên server tập trung có thể tắt so với metadata trên IPFS hoặc Arweave hoặc nhúng on-chain</desc>
<text x="180" y="28" text-anchor="middle" font-size="14" fill="currentColor">Rủi ro: server tập trung</text>
<rect x="60" y="55" width="120" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="85" text-anchor="middle" font-size="12" fill="currentColor">NFT contract</text>
<rect x="60" y="150" width="240" height="55" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="180" y="174" text-anchor="middle" font-size="12" fill="currentColor">https://api.project.com/meta/42</text>
<text x="180" y="193" text-anchor="middle" font-size="11" fill="#f43f5e">domain hết hạn / server tắt → 404</text>
<line x1="120" y1="105" x2="150" y2="148" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<text x="240" y="130" text-anchor="middle" font-size="11" fill="#f43f5e">✗ link chết = NFT thành ô trống</text>
<line x1="370" y1="30" x2="370" y2="280" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<text x="540" y="28" text-anchor="middle" font-size="14" fill="currentColor">Bền: content-addressed</text>
<rect x="440" y="55" width="120" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="500" y="85" text-anchor="middle" font-size="12" fill="currentColor">NFT contract</text>
<rect x="420" y="150" width="240" height="55" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="540" y="174" text-anchor="middle" font-size="12" fill="currentColor">ipfs://bafybe…  /  ar://txid</text>
<text x="540" y="193" text-anchor="middle" font-size="11" fill="#10b981">CID = hash nội dung → không giả được</text>
<line x1="500" y1="105" x2="530" y2="148" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<text x="540" y="235" text-anchor="middle" font-size="11" fill="currentColor">Ai giữ file cũng cho ra đúng CID; đổi 1 byte → CID khác</text>
<defs><marker id="a2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

| Cách lưu | Ưu điểm | Rủi ro / nhược |
|----------|---------|----------------|
| **Off-chain HTTP** (`https://`) | Rẻ, linh hoạt, đổi được (dynamic NFT) | **Dễ chết nhất**: hết hạn domain, sập server → NFT trắng. Chủ có thể **đổi ảnh lén** |
| **Off-chain IPFS** (`ipfs://CID`) | Content-addressed, immutable, phi tập trung | Phải **pin** (giữ bản) liên tục, nếu không node quên → **không ai host** |
| **Off-chain Arweave** (`ar://`) | Trả một lần, lưu **vĩnh viễn** (~200 năm) | Chi phí trả trước, nội dung không sửa được |
| **On-chain** (`data:` / SVG sinh trong contract) | **Bất tử** cùng blockchain, không phụ thuộc ai | Đắt gas, giới hạn kích thước, khó cho ảnh phức tạp |

**Rủi ro link chết (dead link)** là vấn đề #1 của NFT đời thực:
- Nhiều bộ sưu tập giai đoạn 2021 dùng `https://` server riêng. Khi startup phá sản / quên gia hạn domain → hàng nghìn NFT triệu đô hiển thị **ảnh vỡ**.
- Ngay cả IPFS: nếu chỉ có **một** node pin và node đó tắt, file cũng biến mất. IPFS **không tự nhân bản vĩnh viễn** — cần dịch vụ pinning (Pinata, web3.storage, Filecoin) hoặc tự chạy node.
- Bài học: **link phải immutable (content-addressed) + được pin bền vững** hoặc trả tiền một lần cho Arweave.

### 2.5 IPFS — content addressing, CID & pinning

**IPFS (InterPlanetary File System)** không định danh file bằng *vị trí* (URL "ở đâu") mà bằng **nội dung** (hash "là gì"). Đây gọi là **content addressing**.

- Bạn đưa file vào IPFS → nó băm nội dung → cho ra một **CID (Content Identifier)**.
- CID chính là **hash mật mã của nội dung**. Bất kỳ ai có cùng file đều tính ra **cùng CID**. Đổi 1 byte → CID hoàn toàn khác.
- Vì thế `ipfs://bafy...` **tự xác thực**: khi tải về, client băm lại và so với CID — không thể tráo nội dung mà giữ nguyên link.

CID hiện đại (v1) trông như: `bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi` — mã hoá base32, chứa cả thông tin về thuật toán hash và codec. (CID v0 cũ bắt đầu bằng `Qm...`.)

> Analogy: URL truyền thống giống địa chỉ nhà ("số 5 phố X") — nhà đổi chủ, phá đi thì địa chỉ vô nghĩa. CID giống **mã vân tay của chính món đồ** — dù món đồ nằm ở đâu, ai giữ, chỉ cần đúng vân tay là đúng đồ.

**Pinning** — mấu chốt sống còn: IPFS chỉ là giao thức tìm-và-lấy nội dung *nếu có ai đó đang giữ nó*. Node IPFS mặc định có thể **garbage-collect** (dọn rác) file không dùng. **Pin** nghĩa là "khoá file này lại, đừng dọn". Nếu không node nào pin → CID vẫn hợp lệ nhưng **không ai có nội dung** → link chết kiểu khác. Giải pháp: dùng **pinning service** (Pinata, web3.storage, Filecoin để trả tiền cho lưu trữ dài hạn có cam kết).

### 2.6 Arweave — permanent storage

**Arweave** giải bài "pin mãi mãi" theo hướng khác: **trả tiền một lần, lưu vĩnh viễn**.

- Cơ chế **endowment**: bạn trả phí upfront; mô hình kinh tế giả định chi phí lưu trữ giảm theo thời gian, phần trả trước đủ nuôi việc host trong ~200 năm.
- Dữ liệu **không thể sửa/xoá** sau khi ghi — hợp cho metadata NFT cần bất biến tuyệt đối.
- Truy cập qua gateway (vd `arweave.net/<txid>`) hoặc scheme `ar://`.

| | IPFS | Arweave |
|--|------|---------|
| Mô hình | Giữ nội dung *nếu có ai pin* | Trả 1 lần → lưu vĩnh viễn |
| Bất biến | Có (content-addressed) | Có |
| Rủi ro chính | Không pin → mất | Gần như không, nhưng trả trước |
| Hợp cho | Nội dung có người/dịch vụ cam kết pin | "Set-and-forget" metadata bất tử |

Chiến lược thực chiến hay dùng: **ảnh + JSON lên IPFS với CID cố định, pin qua service uy tín**; hoặc **Arweave** nếu muốn khỏi lo pinning mãi mãi. Tránh tuyệt đối `https://` server riêng cho metadata **bất biến**.

### 2.7 Royalty on-chain — EIP-2981

Nghệ sĩ muốn nhận **% mỗi lần NFT được bán lại** (secondary sale). Trước 2021, mỗi marketplace tự lưu royalty theo cách riêng → không chuẩn, không xài chéo được. **EIP-2981** chuẩn hoá **cách hỏi royalty**, không phải cách trả:

```solidity
interface IERC2981 is IERC165 {
    // salePrice: giá bán; trả về (người nhận royalty, số tiền royalty)
    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external view returns (address receiver, uint256 royaltyAmount);
}
```

Cài đặt tối giản với OpenZeppelin:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VoidCollection is ERC721, ERC2981, Ownable {
    string private _base;

    constructor(address artist) ERC721("Voidling", "VOID") Ownable(msg.sender) {
        // royalty mặc định 5% (500 / 10000 basis points) trả cho artist
        _setDefaultRoyalty(artist, 500);
    }

    function _baseURI() internal view override returns (string memory) {
        return _base;                 // vd "ipfs://bafy.../"
    }

    function setBaseURI(string calldata uri) external onlyOwner {
        _base = uri;
    }

    function mint(address to, uint256 id) external onlyOwner {
        _safeMint(to, id);
    }

    // BẮT BUỘC: gộp interface của ERC721 + ERC2981 cho supportsInterface
    function supportsInterface(bytes4 iid)
        public view override(ERC721, ERC2981) returns (bool)
    {
        return super.supportsInterface(iid);
    }
}
```

Cách marketplace dùng: khi khớp lệnh bán giá `salePrice`, nó gọi `royaltyInfo(id, salePrice)` để biết trả bao nhiêu cho ai, rồi tách tiền.

⚠️ **Sự thật quan trọng — royalty KHÔNG bắt buộc ở tầng blockchain.** EIP-2981 chỉ **cung cấp thông tin**; nó **không ép** ai phải trả. Hàm `transferFrom` của ERC-721 vẫn chuyển NFT mà chẳng đoái hoài royalty. Việc trả royalty phụ thuộc **thiện chí của marketplace**. Giai đoạn 2022–2023, nhiều sàn (Blur, các sàn "zero-fee") **bỏ qua royalty** để cạnh tranh, khiến thu nhập nghệ sĩ sụp. Một số dự án phản ứng bằng **transfer hook / allowlist** (chặn chuyển NFT tới sàn không trả royalty), nhưng đây là đánh đổi với tính "tự do chuyển nhượng" của NFT. Hãy hiểu rõ: **EIP-2981 = tiêu chuẩn khai báo, không phải cơ chế cưỡng chế.**

### 2.8 NFT ngoài PFP — nơi giá trị thật nằm

PFP (profile picture, kiểu Bored Ape) chỉ là **một** ứng dụng. Bản chất NFT = **chứng chỉ sở hữu duy nhất, có thể lập trình, xác minh công khai** — dùng được cho nhiều thứ hữu ích hơn ảnh:

| Ứng dụng | NFT đại diện cho | Vì sao hợp |
|----------|------------------|------------|
| **Vé sự kiện (ticketing)** | Một chỗ ngồi/lượt vào duy nhất | Chống vé giả (verify on-chain), chống chợ đen (giới hạn resale/royalty), lưu niệm sau sự kiện |
| **Membership / access** | Thẻ thành viên, quyền vào cộng đồng/token-gated content | Bật/tắt quyền bằng ví; membership **chuyển nhượng được** như tài sản |
| **RWA (real-world assets)** | Sở hữu bất động sản, hàng hiệu, chứng chỉ, carbon credit | Bằng chứng sở hữu bất biến; nhưng cần **cầu nối pháp lý** off-chain (NFT chỉ trỏ, luật đời thực mới thực thi) |
| **Gaming items** | Vật phẩm, skin, nhân vật, đất trong game | Người chơi **thực sự sở hữu** item, giao dịch chéo game/marketplace; ERC-1155 hợp cho item số lượng lớn |
| **Identity / credential** | Bằng cấp, chứng chỉ, POAP (proof of attendance) | Soulbound (không chuyển) để chứng minh danh tính/thành tựu |

Lưu ý thực chiến cho từng nhóm:
- **Vé & gaming**: thường cần **metadata động** (vé đổi trạng thái "đã dùng", item lên cấp). Ở đây off-chain mutable metadata lại **hợp lý**, đánh đổi với bất biến — chọn theo mục đích.
- **RWA**: NFT **không tự** làm bạn sở hữu ngôi nhà. Nó cần khung pháp lý & tổ chức trung gian giữ tài sản thật; NFT chỉ là **lớp sổ sách minh bạch**. Đừng bán ảo tưởng "trustless" cho RWA.
- **Membership**: cân nhắc **soulbound** (không cho bán) nếu quyền không nên giao dịch được.

---

## 3. Ví dụ end-to-end: mint một NFT đúng chuẩn

1. Chuẩn bị **ảnh** `42.png` → upload lên IPFS, pin qua Pinata → được CID ảnh: `bafyb..img`.
2. Viết **metadata JSON** trỏ tới `ipfs://bafyb..img/42.png`, có `name` / `attributes`.
3. Upload thư mục JSON lên IPFS → được **CID gốc bộ sưu tập**: `bafyb..meta`.
4. Deploy contract, gọi `setBaseURI("ipfs://bafyb..meta/")`.
5. `mint(to, 42)` → `tokenURI(42)` trả `ipfs://bafyb..meta/42` → marketplace tải JSON → render ảnh + traits.
6. Khi ai đó bán lại giá `1 ETH`, sàn gọi `royaltyInfo(42, 1e18)` → biết trả 5% (0.05 ETH) cho artist (nếu sàn tôn trọng).

Điểm kiểm bắt buộc trước khi ship:
- `tokenURI` trả đúng URI, JSON tải được, `image` mở được.
- CID **immutable** & đã **pin bền** (hoặc Arweave).
- `supportsInterface` khai báo cả ERC-721 Metadata (`0x5b5e139f`) và ERC-2981 (`0x2a55205a`).

---

## 4. Tóm tắt
- NFT on-chain chỉ giữ **tokenId + owner + một con trỏ `tokenURI`**; ảnh & metadata gần như luôn **off-chain**.
- `tokenURI` → **JSON schema** (`name`/`description`/`image`/`attributes`); `image` nên là URI **immutable**.
- **Rủi ro link chết** là vấn đề số một: server `https://` riêng dễ sập/hết hạn → NFT trắng.
- **IPFS** dùng **content addressing** (CID = hash nội dung, tự xác thực) nhưng phải **pin** mới sống; **Arweave** trả một lần → lưu vĩnh viễn.
- **EIP-2981** chuẩn hoá **khai báo** royalty, nhưng **không cưỡng chế** — trả hay không tuỳ marketplace.
- NFT vượt xa PFP: **vé, membership, RWA, gaming, identity** — mỗi loại có yêu cầu metadata (bất biến vs động) và ràng buộc pháp lý riêng.

> **Bài tiếp theo:** đi vào **marketplace & cơ chế giao dịch NFT** — cách khớp lệnh, listing, và các mô hình phí/royalty enforcement trên thực tế.
