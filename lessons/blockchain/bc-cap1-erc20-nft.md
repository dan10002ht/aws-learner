# Bài 18 — Capstone 1: Viết & deploy ERC-20 + ERC-721 có test

## 1. Mục tiêu
Sau bài này bạn có thể:
- Khởi tạo một **dự án Foundry** hoàn chỉnh: `forge init`, cài **OpenZeppelin**, cấu hình `foundry.toml` với remappings.
- Viết **MyToken** — một token **ERC-20** chuẩn, có `mint`/`burn`, kế thừa contract đã được audit của OpenZeppelin.
- Viết **MyNFT** — một bộ sưu tập **ERC-721** có `mint` tăng dần `tokenId` và `tokenURI` metadata.
- Viết **test** bằng `forge test`: kiểm tra `transfer`, `mint`, và **revert** (quyền, số dư, allowance) — đủ để tự tin ship.
- Viết **deploy script** (`forge script`) và deploy lên **Sepolia testnet**, rồi verify contract trên Etherscan.

> Đây là bài **thực chiến**. Toàn bộ code dưới đây copy vào đúng đường dẫn là chạy được. Bạn cần đã cài `foundry` (`curl -L https://foundry.paradigm.xyz | bash && foundryup`).

---

## 2. Bức tranh tổng thể

Trước khi gõ code, hình dung dòng chảy của một dự án smart contract từ số 0 tới khi lên mạng thật:

<svg viewBox="0 0 720 250" role="img" aria-labelledby="fl-t fl-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="fl-t">Vòng đời một dự án Foundry</title>
<desc id="fl-d">Năm bước tuần tự từ khởi tạo project, viết contract, viết test, chạy test cục bộ, tới deploy lên testnet Sepolia</desc>
<rect x="10" y="95" width="120" height="60" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="70" y="120" text-anchor="middle" font-size="13" fill="currentColor">forge init</text>
<text x="70" y="138" text-anchor="middle" font-size="11" fill="currentColor">+ OpenZeppelin</text>
<rect x="160" y="95" width="120" height="60" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="220" y="120" text-anchor="middle" font-size="13" fill="currentColor">Viết contract</text>
<text x="220" y="138" text-anchor="middle" font-size="11" fill="currentColor">ERC20 + ERC721</text>
<rect x="310" y="95" width="120" height="60" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="370" y="120" text-anchor="middle" font-size="13" fill="currentColor">Viết test</text>
<text x="370" y="138" text-anchor="middle" font-size="11" fill="currentColor">.t.sol</text>
<rect x="460" y="95" width="120" height="60" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="520" y="120" text-anchor="middle" font-size="13" fill="currentColor">forge test</text>
<text x="520" y="138" text-anchor="middle" font-size="11" fill="currentColor">local EVM</text>
<rect x="610" y="95" width="100" height="60" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="660" y="120" text-anchor="middle" font-size="13" fill="currentColor">forge script</text>
<text x="660" y="138" text-anchor="middle" font-size="11" fill="currentColor">→ Sepolia</text>
<line x1="130" y1="125" x2="158" y2="125" stroke="currentColor" stroke-width="1.5" marker-end="url(#a1)"/>
<line x1="280" y1="125" x2="308" y2="125" stroke="currentColor" stroke-width="1.5" marker-end="url(#a1)"/>
<line x1="430" y1="125" x2="458" y2="125" stroke="currentColor" stroke-width="1.5" marker-end="url(#a1)"/>
<line x1="580" y1="125" x2="608" y2="125" stroke="currentColor" stroke-width="1.5" marker-end="url(#a1)"/>
<text x="360" y="40" text-anchor="middle" font-size="12" fill="currentColor">Không bao giờ deploy code chưa qua test — testnet để bạn sai miễn phí, mainnet thì sai là mất tiền thật</text>
<defs><marker id="a1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

---

## 3. Bước 1 — Khởi tạo project & cài OpenZeppelin

Foundry gồm 4 tool: `forge` (build/test), `cast` (gọi contract từ CLI), `anvil` (node local), `chisel` (REPL). Ta khởi tạo và cài thư viện:

```bash
# tạo project mới
forge init myproject
cd myproject

# cài OpenZeppelin (dùng git submodule, không phải npm)
forge install OpenZeppelin/openzeppelin-contracts

# build thử để chắc chắn compiler chạy
forge build
```

`forge init` tạo sẵn cấu trúc: `src/` (contract), `test/` (test), `script/` (deploy), `lib/` (dependency). Sau khi `forge install`, ta khai báo **remapping** để `import "@openzeppelin/..."` trỏ đúng vào `lib/`:

```toml
# foundry.toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.24"
optimizer = true
optimizer_runs = 200
remappings = [
    "@openzeppelin/=lib/openzeppelin-contracts/"
]

# đọc biến môi trường cho RPC & Etherscan (dùng ở bước deploy)
[rpc_endpoints]
sepolia = "${SEPOLIA_RPC_URL}"

[etherscan]
sepolia = { key = "${ETHERSCAN_API_KEY}" }
```

> **Tại sao OpenZeppelin?** ERC-20/ERC-721 chỉ là **interface chuẩn** (EIP). Tự viết `transfer`, `approve`, `_mint`... rất dễ dính lỗi (thiếu event, sai kiểm tra allowance, reentrancy). OpenZeppelin là bản triển khai **đã được audit hàng nghìn lần** — dùng lại là chuẩn công nghiệp, không phải "lười".

---

## 4. Bước 2 — Viết MyToken (ERC-20)

ERC-20 là chuẩn cho **token thay thế được (fungible)**: mỗi đơn vị y hệt nhau như tiền. Bản chất chỉ là một `mapping(address => uint256) balances` cộng với vài hàm chuẩn: `transfer`, `approve`, `transferFrom`, và các event `Transfer`/`Approval`.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    // giới hạn tổng cung cứng để tránh in vô hạn
    uint256 public constant MAX_SUPPLY = 1_000_000 * 1e18;

    // ERC20 dùng decimals mặc định = 18 → 1 token = 1e18 đơn vị nhỏ nhất
    constructor(uint256 initialSupply)
        ERC20("MyToken", "MTK")
        Ownable(msg.sender)
    {
        require(initialSupply <= MAX_SUPPLY, "over max supply");
        // _mint là internal của ERC20: cộng balance + tăng totalSupply + emit Transfer
        _mint(msg.sender, initialSupply);
    }

    /// @notice chỉ owner được phát hành thêm, và không vượt trần
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "over max supply");
        _mint(to, amount);
    }

    /// @notice ai cũng tự đốt token của chính mình
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
```

Điểm cần nắm:
- **`decimals` = 18**: Solidity không có số thực. "1 token" thực chất là `1 * 10^18` đơn vị nhỏ nhất (giống 1 ETH = 10^18 wei). Vì vậy `initialSupply` truyền vào đã tính theo đơn vị nhỏ nhất.
- **`Ownable(msg.sender)`**: OpenZeppelin v5 yêu cầu truyền owner qua constructor. `onlyOwner` là modifier chặn mọi ai không phải owner.
- **`_mint` / `_burn`** là hàm `internal` — ta bọc lại thành hàm `external` có kiểm soát quyền. Đây là pattern chuẩn: **không expose thẳng** hàm nhạy cảm.
- Ta **không** tự viết `transfer`/`approve` — chúng đã có sẵn trong `ERC20` cha, chuẩn EIP, có emit event đầy đủ.

---

## 5. Bước 3 — Viết MyNFT (ERC-721)

ERC-721 là chuẩn cho **token độc nhất (non-fungible)**: mỗi `tokenId` là một vật phẩm riêng, có chủ riêng. Bản chất là `mapping(uint256 tokenId => address owner)`. Ta thêm cơ chế cấp `tokenId` tăng dần và lưu `tokenURI` (link tới metadata JSON).

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;      // bộ đếm id, bắt đầu từ 0
    uint256 public constant MINT_PRICE = 0.01 ether;

    event Minted(address indexed to, uint256 indexed tokenId, string uri);

    constructor()
        ERC721("MyNFT", "MNFT")
        Ownable(msg.sender)
    {}

    /// @notice ai cũng mint được nếu trả đủ phí; trả về tokenId vừa tạo
    function mint(string calldata uri) external payable returns (uint256) {
        require(msg.value >= MINT_PRICE, "insufficient payment");
        uint256 tokenId = _nextTokenId++;   // lấy id hiện tại rồi tăng
        _safeMint(msg.sender, tokenId);      // _safeMint kiểm tra người nhận biết nhận NFT
        _setTokenURI(tokenId, uri);          // gắn metadata cho token
        emit Minted(msg.sender, tokenId, uri);
        return tokenId;
    }

    /// @notice owner rút ETH thu được từ mint
    function withdraw() external onlyOwner {
        (bool ok, ) = payable(owner()).call{value: address(this).balance}("");
        require(ok, "withdraw failed");
    }

    /// @notice tổng số NFT đã mint
    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }
}
```

So sánh nhanh hai chuẩn để không lẫn:

| Tiêu chí | ERC-20 (MyToken) | ERC-721 (MyNFT) |
|----------|------------------|-----------------|
| **Tính chất** | Fungible — mọi đơn vị y hệt | Non-fungible — mỗi id độc nhất |
| **Đơn vị sở hữu** | `balanceOf(addr)` = số dư (số) | `ownerOf(tokenId)` = chủ của 1 id |
| **Hàm chuyển** | `transfer(to, amount)` | `safeTransferFrom(from, to, tokenId)` |
| **Metadata** | Chỉ `name/symbol/decimals` | `tokenURI(id)` → ảnh + thuộc tính |
| **Use case** | Tiền, điểm thưởng, governance | Art, vé, vật phẩm game, chứng chỉ |

- **`_safeMint`** khác `_mint`: nếu người nhận là **contract**, nó gọi `onERC721Received` để chắc contract đó biết cách giữ NFT — tránh NFT bị "kẹt" vĩnh viễn.
- **`_nextTokenId++`** (post-increment): trả về giá trị hiện tại rồi mới tăng → token đầu tiên có id `0`.
- **`payable` + `msg.value`**: hàm `mint` nhận ETH; contract giữ tiền cho tới khi owner `withdraw`.

---

## 6. Bước 4 — Viết test (forge test)

Test trong Foundry là **contract Solidity** kế thừa `forge-std/Test.sol`. Mỗi hàm tên bắt đầu bằng `test` là một test case; bắt đầu bằng `testFail` hoặc dùng `vm.expectRevert` để kiểm tra revert. `setUp()` chạy lại trước **mỗi** test (mỗi test một state sạch).

Các cheatcode `vm.*` hay dùng:
- `vm.prank(addr)`: giả danh `addr` cho **1 call** kế tiếp (đổi `msg.sender`).
- `vm.expectRevert(msg)`: khẳng định call kế tiếp phải revert đúng lý do đó.
- `vm.deal(addr, amount)`: nạp ETH ảo cho một địa chỉ.
- `makeAddr("name")`: tạo địa chỉ test có tên dễ đọc.

### 6.1 Test cho MyToken

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MyToken.sol";

contract MyTokenTest is Test {
    MyToken token;
    address owner = makeAddr("owner");
    address alice = makeAddr("alice");
    address bob   = makeAddr("bob");

    function setUp() public {
        // deploy dưới danh nghĩa owner → owner nhận initialSupply
        vm.prank(owner);
        token = new MyToken(1_000 * 1e18);
    }

    function test_InitialSupply() public view {
        assertEq(token.totalSupply(), 1_000 * 1e18);
        assertEq(token.balanceOf(owner), 1_000 * 1e18);
    }

    function test_Transfer() public {
        vm.prank(owner);
        token.transfer(alice, 100 * 1e18);
        assertEq(token.balanceOf(alice), 100 * 1e18);
        assertEq(token.balanceOf(owner), 900 * 1e18);
    }

    function test_OwnerCanMint() public {
        vm.prank(owner);
        token.mint(bob, 500 * 1e18);
        assertEq(token.balanceOf(bob), 500 * 1e18);
    }

    // --- các case REVERT ---

    function test_RevertWhen_NonOwnerMints() public {
        // alice không phải owner → onlyOwner revert
        vm.prank(alice);
        vm.expectRevert();
        token.mint(alice, 1e18);
    }

    function test_RevertWhen_TransferExceedsBalance() public {
        vm.prank(alice); // alice số dư 0
        vm.expectRevert(); // ERC20InsufficientBalance
        token.transfer(bob, 1e18);
    }

    function test_RevertWhen_MintOverMaxSupply() public {
        vm.prank(owner);
        vm.expectRevert("over max supply");
        token.mint(owner, 2_000_000 * 1e18); // vượt MAX_SUPPLY
    }

    function test_ApproveAndTransferFrom() public {
        vm.prank(owner);
        token.approve(alice, 200 * 1e18);        // owner cho alice quyền tiêu 200
        vm.prank(alice);
        token.transferFrom(owner, bob, 150 * 1e18); // alice chuyển hộ 150 sang bob
        assertEq(token.balanceOf(bob), 150 * 1e18);
        assertEq(token.allowance(owner, alice), 50 * 1e18); // còn 50
    }
}
```

### 6.2 Test cho MyNFT

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MyNFT.sol";

contract MyNFTTest is Test {
    MyNFT nft;
    address owner = makeAddr("owner");
    address alice = makeAddr("alice");
    string constant URI = "ipfs://QmExampleHash/1.json";

    function setUp() public {
        vm.prank(owner);
        nft = new MyNFT();
        vm.deal(alice, 1 ether); // cấp ETH ảo cho alice để trả phí mint
    }

    function test_Mint() public {
        vm.prank(alice);
        uint256 id = nft.mint{value: 0.01 ether}(URI);
        assertEq(id, 0);
        assertEq(nft.ownerOf(0), alice);
        assertEq(nft.tokenURI(0), URI);
        assertEq(nft.totalMinted(), 1);
    }

    function test_TokenIdIncrements() public {
        vm.startPrank(alice);
        nft.mint{value: 0.01 ether}(URI);
        nft.mint{value: 0.01 ether}(URI);
        vm.stopPrank();
        assertEq(nft.ownerOf(0), alice);
        assertEq(nft.ownerOf(1), alice);
        assertEq(nft.totalMinted(), 2);
    }

    function test_RevertWhen_UnderpaidMint() public {
        vm.prank(alice);
        vm.expectRevert("insufficient payment");
        nft.mint{value: 0.001 ether}(URI); // trả thiếu
    }

    function test_RevertWhen_QueryNonexistentToken() public {
        vm.expectRevert(); // ERC721NonexistentToken
        nft.ownerOf(999);
    }

    function test_OnlyOwnerWithdraws() public {
        vm.prank(alice);
        nft.mint{value: 0.01 ether}(URI); // contract giữ 0.01 ETH

        // alice không phải owner → revert
        vm.prank(alice);
        vm.expectRevert();
        nft.withdraw();

        // owner rút thành công
        uint256 before = owner.balance;
        vm.prank(owner);
        nft.withdraw();
        assertEq(owner.balance, before + 0.01 ether);
    }
}
```

Chạy toàn bộ:

```bash
forge test            # chạy tất cả test
forge test -vvv       # verbose: in trace khi fail (rất hữu ích khi debug)
forge test --match-test test_Transfer   # chạy 1 test theo tên
forge test --gas-report                 # kèm báo cáo gas mỗi hàm
forge coverage        # đo độ phủ test
```

Kết quả kỳ vọng:

```
Ran 7 tests for test/MyToken.t.sol:MyTokenTest
[PASS] test_ApproveAndTransferFrom() (gas: 78321)
[PASS] test_InitialSupply() (gas: 18234)
[PASS] test_OwnerCanMint() (gas: 71002)
[PASS] test_RevertWhen_MintOverMaxSupply() (gas: 22110)
...
Suite result: ok. 7 passed; 0 failed; 0 skipped
```

> **Nguyên tắc test tối thiểu:** với mỗi hàm public, viết ít nhất (1) **happy path** — dùng đúng thì đúng kết quả, và (2) **revert path** — dùng sai thì chặn được (sai quyền, thiếu tiền, thiếu số dư). Contract giữ tiền của người khác — thiếu test là thiếu trách nhiệm.

---

## 7. Bước 5 — Deploy lên Sepolia bằng forge script

Deploy script cũng là contract Solidity, kế thừa `forge-std/Script.sol`. Mọi lệnh nằm giữa `vm.startBroadcast()` và `vm.stopBroadcast()` sẽ được **gửi thật lên mạng** như transaction.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MyToken.sol";
import "../src/MyNFT.sol";

contract DeployScript is Script {
    function run() external {
        // lấy private key từ biến môi trường, KHÔNG bao giờ hardcode
        uint256 pk = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(pk);

        MyToken token = new MyToken(1_000_000 * 1e18);
        MyNFT nft = new MyNFT();

        vm.stopBroadcast();

        console.log("MyToken deployed at:", address(token));
        console.log("MyNFT   deployed at:", address(nft));
    }
}
```

Chuẩn bị biến môi trường (dùng file `.env`, **nhớ đưa vào `.gitignore`**):

```bash
# .env  — TUYỆT ĐỐI không commit file này
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<API_KEY>
PRIVATE_KEY=0xabc...   # ví testnet riêng, có sẵn Sepolia ETH từ faucet
ETHERSCAN_API_KEY=<key>
```

Nạp env và deploy:

```bash
source .env

forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  -vvvv
```

- `--broadcast`: thực sự gửi transaction (bỏ đi thì chỉ **mô phỏng** local — nên chạy thử không broadcast trước).
- `--verify`: sau khi deploy tự **verify source code** lên Etherscan để ai cũng đọc/tương tác được.
- `-vvvv`: in đầy đủ trace + địa chỉ contract sau khi lên mạng.

Sau khi có địa chỉ, thử tương tác nhanh bằng `cast` mà không cần viết UI:

```bash
# đọc totalSupply (call, không tốn gas)
cast call <TOKEN_ADDR> "totalSupply()(uint256)" --rpc-url $SEPOLIA_RPC_URL

# gửi 10 token cho một địa chỉ (transaction, tốn gas)
cast send <TOKEN_ADDR> "transfer(address,uint256)" <TO> 10000000000000000000 \
  --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY

# mint 1 NFT, trả 0.01 ETH
cast send <NFT_ADDR> "mint(string)" "ipfs://Qm.../1.json" \
  --value 0.01ether --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY
```

> **An toàn khóa:** ví dùng để deploy testnet phải là ví **riêng, chỉ chứa testnet ETH**, không dùng chung với ví có tiền thật. Private key rò rỉ = mất sạch. Với mainnet, dùng hardware wallet hoặc `cast wallet` (keystore mã hóa) thay vì biến môi trường.

---

## 8. Cấu trúc thư mục cuối cùng

```
myproject/
├── foundry.toml
├── .env                 # (gitignore) RPC, PRIVATE_KEY, ETHERSCAN_API_KEY
├── lib/
│   ├── forge-std/
│   └── openzeppelin-contracts/
├── src/
│   ├── MyToken.sol
│   └── MyNFT.sol
├── test/
│   ├── MyToken.t.sol
│   └── MyNFT.t.sol
└── script/
    └── Deploy.s.sol
```

---

## 9. Tóm tắt
- **Foundry** = quy trình chuẩn công nghiệp: `forge init` → viết `src/` → viết `test/` → `forge test` → `forge script` deploy. Nhanh vì test chạy trên EVM native (Solidity, không phải JS).
- **ERC-20** là fungible token — kế thừa `ERC20` của OpenZeppelin, chỉ bọc thêm `mint`/`burn` có kiểm soát quyền và trần cung.
- **ERC-721** là NFT độc nhất — kế thừa `ERC721URIStorage`, cấp `tokenId` tăng dần bằng `_nextTokenId++`, dùng `_safeMint` để không kẹt token.
- **Test** là contract Solidity: mỗi hàm public cần ít nhất 1 happy path + 1 revert path; dùng `vm.prank`, `vm.expectRevert`, `vm.deal` để dựng kịch bản.
- **Deploy** qua `forge script` với `vm.startBroadcast`; private key luôn lấy từ env, dùng ví testnet riêng, `--verify` để công khai source trên Etherscan.
- Không dùng lại code đã audit (OpenZeppelin) mà tự viết chuẩn từ đầu là tự chuốc rủi ro — kế thừa là chuyên nghiệp, không phải lười.

> **Bài tiếp theo:** xây một **DApp frontend** kết nối ví (MetaMask) gọi chính hai contract vừa deploy — biến smart contract thành sản phẩm người dùng bấm được.
