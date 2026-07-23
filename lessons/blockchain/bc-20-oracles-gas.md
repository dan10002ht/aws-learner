# Bài 21 — Oracle (Chainlink) & tối ưu gas

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **oracle problem** — vì sao smart contract **không tự lấy được dữ liệu ngoài chain** và tại sao đây là bài toán về **niềm tin**, không phải về API.
- Dùng **Chainlink Price Feed** để đọc giá tài sản on-chain đúng cách (decimals, staleness check).
- Dùng **Chainlink VRF** để lấy **số ngẫu nhiên không thể gian lận**, và **Automation (Keepers)** để chạy tác vụ định kỳ.
- Áp dụng các kỹ thuật **tối ưu gas** thật sự đo được: **storage slot packing**, `calldata` vs `memory`, `immutable`/`constant`, `unchecked`, và **event thay cho storage**.
- Ước lượng chi phí gas ở mức tư duy: mỗi kỹ thuật tiết kiệm ở **đâu** và **bao nhiêu**.

---

## 2. Oracle problem

### 2.1 Analogy — vị thẩm phán trong phòng kín

Hình dung EVM như một **phòng xử án kín, không cửa sổ**. Bên trong, mọi phán quyết phải **tái lập được**: đưa cùng một hồ sơ cho bất kỳ thẩm phán (node) nào, họ phải ra **cùng một kết quả** — đó là tính **deterministic** giúp cả mạng đồng thuận. Nếu contract được phép "ngó ra ngoài" gọi một API giá vàng, mỗi node gọi ở một thời điểm khác nhau sẽ nhận số khác nhau → **mất đồng thuận**. Vì vậy EVM **cấm** mọi truy cập I/O ra thế giới thực: không HTTP, không random, không đọc giờ hệ thống.

Hệ quả: blockchain **mù** với thế giới bên ngoài. Nhưng phần lớn ứng dụng thật (DeFi cho vay theo giá ETH, bảo hiểm chuyến bay, game rút thưởng) **cần** dữ liệu ngoài chain. **Oracle** là cây cầu: một cơ chế **đưa dữ liệu off-chain vào on-chain** dưới dạng transaction — để dữ liệu trở thành một phần trạng thái mà mọi node đọc lại đều giống nhau.

### 2.2 Bản chất: đây là bài toán niềm tin, không phải bài toán kỹ thuật

Viết một oracle "ngây thơ" rất dễ: dựng một server đọc giá Binance rồi gọi `setPrice()` lên contract. Nhưng khi đó **toàn bộ hệ thống phi tập trung của bạn phụ thuộc vào một server duy nhất** — nó nói dối, bị hack, hoặc chết là DeFi protocol của bạn bị thanh lý sai hàng loạt. Đây gọi là **oracle problem**: bạn xây một tòa lâu đài không thể sửa đổi (trustless) trên chain, rồi cắm vào nó **một điểm tin cậy tập trung** ở cửa dữ liệu. Kẻ tấn công không cần phá blockchain — chỉ cần phá cái oracle.

<svg viewBox="0 0 700 250" role="img" aria-labelledby="op-t op-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="op-t">Oracle problem</title>
<desc id="op-d">Smart contract deterministic không gọi được ra thế giới ngoài chain, cần oracle làm cầu nối đáng tin</desc>
<rect x="30" y="80" width="150" height="90" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="115" text-anchor="middle" font-size="14" fill="currentColor">Smart contract</text>
<text x="105" y="138" text-anchor="middle" font-size="11" fill="currentColor">deterministic,</text>
<text x="105" y="154" text-anchor="middle" font-size="11" fill="currentColor">không I/O ngoài</text>
<rect x="290" y="80" width="130" height="90" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="355" y="120" text-anchor="middle" font-size="14" fill="currentColor">Oracle</text>
<text x="355" y="142" text-anchor="middle" font-size="11" fill="currentColor">cầu nối</text>
<rect x="530" y="80" width="150" height="90" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="605" y="115" text-anchor="middle" font-size="13" fill="currentColor">Thế giới thực</text>
<text x="605" y="138" text-anchor="middle" font-size="11" fill="currentColor">giá, thời tiết,</text>
<text x="605" y="154" text-anchor="middle" font-size="11" fill="currentColor">random, API</text>
<line x1="290" y1="125" x2="182" y2="125" stroke="currentColor" stroke-width="1.5" marker-end="url(#oa)"/>
<line x1="530" y1="125" x2="422" y2="125" stroke="currentColor" stroke-width="1.5" marker-end="url(#oa)"/>
<text x="355" y="205" text-anchor="middle" font-size="12" fill="#f43f5e">Điểm yếu: oracle tập trung nói dối → cả protocol sập, dù chain vẫn an toàn</text>
<defs><marker id="oa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Chainlink** giải bằng cách phi tập trung hoá chính cái oracle: **nhiều node độc lập** cùng lấy giá từ **nhiều nguồn**, ký kết quả, và một hợp đồng **tổng hợp** (aggregator) lấy trung vị (median). Muốn thao túng giá, kẻ tấn công phải mua chuộc **đa số node** cùng lúc — đắt và khó như tấn công chính blockchain. Đó mới là "trust-minimized oracle".

---

## 3. Chainlink Price Feed

Price Feed là contract **đã deploy sẵn** trên mỗi mạng (mỗi cặp giá như ETH/USD có một địa chỉ). Bạn chỉ **đọc**, không trả phí gas cho việc cập nhật — mạng lưới Chainlink tự đẩy giá mới khi lệch quá ngưỡng (deviation) hoặc quá hạn (heartbeat).

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

contract PriceConsumer {
    AggregatorV3Interface internal immutable feed;

    // Ví dụ ETH/USD trên Sepolia: 0x694AA1769357215DE4FAC081bf1f309aDC325306
    constructor(address feedAddress) {
        feed = AggregatorV3Interface(feedAddress);
    }

    /// @notice Lấy giá ETH/USD, tự chuẩn hoá về 18 decimals
    function getPrice() public view returns (uint256) {
        (uint80 roundId, int256 answer,, uint256 updatedAt, uint80 answeredInRound)
            = feed.latestRoundData();

        // 1) Giá phải dương
        require(answer > 0, "bad price");
        // 2) Chống dữ liệu cũ (stale): quá 1 giờ không cập nhật là nghi ngờ
        require(block.timestamp - updatedAt <= 3600, "stale price");
        // 3) Chống round chưa hoàn tất
        require(answeredInRound >= roundId, "stale round");

        uint8 dec = feed.decimals();            // Price Feed thường trả 8 decimals
        return uint256(answer) * (10 ** (18 - dec));
    }
}
```

**Ba cạm bẫy phải nhớ** (đây là chỗ contract thật hay bị hack):
- **decimals**: hầu hết USD feed trả **8 decimals** (giá 2000 USD = `200000000000`), KHÔNG phải 18 như token ERC-20. Trộn lẫn là sai giá 10 mũ 10 lần.
- **staleness**: `answer` là `int256` và có thể **cũ** nếu node ngừng cập nhật. Luôn kiểm `updatedAt` so với một **heartbeat** hợp lý của feed đó.
- **không dùng giá spot của một DEX làm oracle**: giá trên một pool Uniswap có thể bị **flash-loan** đẩy lệch trong đúng một block. Đây là nguyên nhân của hàng loạt vụ hack DeFi. Dùng Price Feed phi tập trung hoặc **TWAP** (time-weighted average price).

---

## 4. Chainlink VRF — random không thể gian lận

`block.timestamp`, `blockhash`, `block.prevrandao` **đều không an toàn** làm nguồn random cho việc có tiền: **miner/validator** đóng block **nhìn thấy** các giá trị này và có thể **bỏ block** không có lợi cho họ (re-roll). Với một game rút thưởng, đó là cửa để nhà đào ăn gian.

**VRF (Verifiable Random Function)** trả về một số ngẫu nhiên **kèm bằng chứng mật mã** rằng số đó được sinh từ một seed + private key của Chainlink, **không ai đoán trước hay can thiệp được** — và contract **tự verify** bằng chứng on-chain trước khi nhận. Luồng là **bất đồng bộ 2 bước**: bạn *yêu cầu*, Chainlink *gọi lại* (callback) ở block sau.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {VRFConsumerBaseV2Plus} from
  "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from
  "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

contract Raffle is VRFConsumerBaseV2Plus {
    uint256 immutable subscriptionId;   // ví Chainlink đã nạp LINK
    bytes32 immutable keyHash;          // gas lane
    uint32  constant CALLBACK_GAS = 100_000;
    uint16  constant CONFIRMATIONS = 3;
    uint32  constant NUM_WORDS = 1;

    address[] public players;
    address public recentWinner;
    uint256 public pendingRequestId;

    constructor(address vrfCoordinator, uint256 subId, bytes32 kh)
        VRFConsumerBaseV2Plus(vrfCoordinator)
    {
        subscriptionId = subId;
        keyHash = kh;
    }

    function enter() external payable {
        require(msg.value >= 0.01 ether, "fee");
        players.push(msg.sender);
    }

    // Bước 1: yêu cầu số ngẫu nhiên
    function drawWinner() external onlyOwner returns (uint256 requestId) {
        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: subscriptionId,
                requestConfirmations: CONFIRMATIONS,
                callbackGasLimit: CALLBACK_GAS,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );
        pendingRequestId = requestId;
    }

    // Bước 2: Chainlink gọi lại với số ngẫu nhiên đã được verify
    function fulfillRandomWords(uint256, uint256[] calldata randomWords)
        internal override
    {
        uint256 idx = randomWords[0] % players.length;
        recentWinner = players[idx];
        delete players;                       // reset vòng mới
        (bool ok,) = recentWinner.call{value: address(this).balance}("");
        require(ok, "transfer failed");
    }
}
```

Điểm cốt lõi: **logic quyết định winner phải nằm trong `fulfillRandomWords`** — hàm chỉ có Chainlink Coordinator gọi được. Không bao giờ chọn winner ngay trong `drawWinner` dựa trên block data.

---

## 5. Chainlink Automation (Keepers)

Smart contract **không tự chạy**: không có "cron job" on-chain, mọi thứ khởi động bằng một transaction từ bên ngoài. Muốn "mỗi ngày phát lãi" hay "hết giờ thì đóng vòng raffle" bạn cần **ai đó bấm nút**. **Automation** là mạng lưới bot phi tập trung làm việc bấm nút đó, theo một hợp đồng 2 hàm bạn tự định nghĩa:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface AutomationCompatibleInterface {
    function checkUpkeep(bytes calldata checkData)
        external returns (bool upkeepNeeded, bytes memory performData);
    function performUpkeep(bytes calldata performData) external;
}

contract IntervalTask is AutomationCompatibleInterface {
    uint256 public immutable interval;      // vd 86400 = 1 ngày
    uint256 public lastRun;
    uint256 public counter;

    constructor(uint256 _interval) {
        interval = _interval;
        lastRun = block.timestamp;
    }

    // Chạy OFF-CHAIN (view) — Chainlink gọi liên tục, KHÔNG tốn gas của bạn
    function checkUpkeep(bytes calldata)
        external view override
        returns (bool upkeepNeeded, bytes memory)
    {
        upkeepNeeded = (block.timestamp - lastRun) >= interval;
        return (upkeepNeeded, "");
    }

    // Chỉ chạy ON-CHAIN khi checkUpkeep trả true
    function performUpkeep(bytes calldata) external override {
        // Kiểm lại điều kiện: performUpkeep là public, ai cũng gọi được!
        require((block.timestamp - lastRun) >= interval, "not yet");
        lastRun = block.timestamp;
        counter++;
    }
}
```

Nguyên tắc an toàn: **`checkUpkeep` chạy off-chain miễn phí** để lọc điều kiện, nhưng **`performUpkeep` là hàm public** — bất kỳ ai (không chỉ Chainlink) đều gọi được, nên **luôn kiểm tra lại điều kiện bên trong** `performUpkeep`, đừng tin mù dữ liệu từ `checkUpkeep`.

---

## 6. Tối ưu gas

Gas là đơn vị đo **công tính toán + lưu trữ** một transaction tiêu tốn (Bài về EVM). Đắt nhất luôn là **storage**: ghi một slot mới (`SSTORE` zero→non-zero) tốn **~20.000 gas**, sửa slot có sẵn ~5.000 gas, còn tính toán số học chỉ vài gas. Vậy nên chiến lược tối ưu gas số 1 là: **chạm vào storage càng ít càng tốt**.

### 6.1 Storage slot packing

Storage là mảng các **slot 32 byte (256 bit)**. Compiler đặt các biến state **liên tiếp**; nhiều biến nhỏ **cạnh nhau** có thể **gói chung một slot** — nếu bạn khai báo đúng thứ tự và đúng kiểu.

```solidity
// XẤU — 3 slot (mỗi biến chiếm trọn 1 slot vì bị đứt quãng)
contract Bad {
    uint128 a;   // slot 0 (dùng 16/32 byte, phí 16 byte)
    uint256 b;   // slot 1 (uint256 phải nằm riêng slot)
    uint128 c;   // slot 2
}

// TỐT — 2 slot (a và c gói chung slot 0)
contract Good {
    uint128 a;   // slot 0, byte 0..15
    uint128 c;   // slot 0, byte 16..31  ← gói chung với a
    uint256 b;   // slot 1
}
```

Mỗi slot ghi lần đầu tốn ~20.000 gas, nên gộp 3 slot xuống 2 tiết kiệm **~20.000 gas** khi khởi tạo. Áp dụng nhiều nhất trong `struct`:

```solidity
// Gói 1 slot: uint128 + uint64 + uint32 + bool = 16+8+4+1 = 29/32 byte
struct Position {
    uint128 amount;      // đủ cho token 18 decimals
    uint64  unlockTime;  // timestamp tới năm ~584 tỷ, thừa sức
    uint32  tier;
    bool    active;
}
```

**Lưu ý ngược đời**: dùng `uint8` trong một biến state **đơn lẻ** KHÔNG rẻ hơn `uint256` — EVM vẫn thao tác theo word 32 byte và phải thêm lệnh mask. Kiểu nhỏ chỉ có lợi **khi được gói chung slot**. Trong `memory`/tham số hàm thì luôn ưu tiên `uint256`.

### 6.2 calldata vs memory

Tham số kiểu tham chiếu (`bytes`, `string`, mảng) trong hàm `external` nên khai `calldata`: dữ liệu đọc **thẳng từ transaction input**, không copy sang bộ nhớ.

```solidity
// TỐT: đọc trực tiếp, không copy
function sum(uint256[] calldata xs) external pure returns (uint256 s) {
    for (uint256 i = 0; i < xs.length; i++) s += xs[i];
}

// XẤU: copy toàn bộ mảng vào memory rồi mới đọc — tốn gas theo độ dài
function sumSlow(uint256[] memory xs) external pure returns (uint256 s) {
    for (uint256 i = 0; i < xs.length; i++) s += xs[i];
}
```

Với mảng dài, `calldata` tiết kiệm đáng kể (mỗi phần tử copy vào memory tốn thêm gas). Chỉ dùng `memory` khi hàm **cần sửa** dữ liệu đó tại chỗ.

### 6.3 constant & immutable — đưa giá trị ra khỏi storage

Cả hai **không chiếm storage slot**: giá trị được **nhúng thẳng vào bytecode**, nên đọc chúng gần như miễn phí (vài gas) thay vì `SLOAD` ~2.100 gas.

| Từ khoá | Gán giá trị khi | Dùng cho |
|---------|-----------------|----------|
| `constant` | **Lúc compile** (hằng cứng) | Số/địa chỉ biết trước: phí, ngưỡng |
| `immutable` | **Trong constructor** (1 lần) | Giá trị theo lần deploy: owner, token, feed address |

```solidity
contract Config {
    uint256 public constant FEE_BPS = 30;        // 0.30% — biết từ lúc viết code
    address public immutable owner;              // biết khi deploy
    IERC20  public immutable token;

    constructor(address _token) {
        owner = msg.sender;      // gán 1 lần, sau đó chỉ đọc từ bytecode
        token = IERC20(_token);
    }
}
```

Một địa chỉ `owner` để `public` thường **thay `immutable`** vào là tiết kiệm ~2.100 gas mỗi lần đọc so với biến storage bình thường — với `onlyOwner` chạy ở mọi hàm admin thì cộng dồn rất nhiều.

### 6.4 unchecked — bỏ kiểm tra overflow khi đã chắc chắn an toàn

Từ Solidity 0.8, mọi phép toán số nguyên **tự kiểm overflow/underflow** và revert — an toàn nhưng tốn thêm gas mỗi phép tính. Khi bạn **chứng minh được** không thể tràn, gói vào `unchecked` để bỏ kiểm tra. Kinh điển là biến đếm vòng `for`:

```solidity
function total(uint256[] calldata xs) external pure returns (uint256 s) {
    uint256 len = xs.length;
    for (uint256 i = 0; i < len;) {
        s += xs[i];
        unchecked { ++i; }        // i không thể tràn vì i < len <= 2^256-1
    }
}
```

`unchecked { ++i; }` tiết kiệm ~30–40 gas mỗi vòng lặp. **Chỉ dùng khi thật sự chắc chắn** — dùng bừa ở phép cộng số dư người dùng là mở lại đúng lỗ hổng overflow mà 0.8 đã vá.

### 6.5 Event thay cho storage

Storage đắt vì **mọi node phải lưu vĩnh viễn**. Nếu một dữ liệu chỉ cần cho **frontend / lịch sử / audit** — không có contract nào cần **đọc lại on-chain** — hãy phát **event** thay vì ghi storage. Event ghi vào **logs** (rẻ hơn nhiều, ~375 gas + data) và index được off-chain, nhưng contract **không đọc lại được**.

```solidity
// XẤU: lưu cả lịch sử vào storage — cực đắt, không contract nào cần đọc lại
mapping(uint256 => string) public history;
uint256 public historyCount;
function record(string calldata note) external {
    history[historyCount++] = note;    // mỗi lần ghi 1 slot mới ~20.000 gas
}

// TỐT: phát event, frontend nghe log
event Recorded(address indexed who, uint256 indexed id, string note);
uint256 public nextId;
function recordCheap(string calldata note) external {
    emit Recorded(msg.sender, nextId, note);   // ~vài trăm–vài nghìn gas
    unchecked { ++nextId; }
}
```

**Ranh giới quyết định**: dữ liệu mà **contract cần đọc để ra quyết định** (số dư, quyền, trạng thái) → **phải** ở storage. Dữ liệu chỉ để **con người / UI xem lại** → dùng **event**. Nhầm chỗ này là nguồn lãng phí gas phổ biến nhất của người mới.

---

## 7. Bảng tổng hợp kỹ thuật gas

| Kỹ thuật | Tiết kiệm ở đâu | Mức độ | Rủi ro nếu lạm dụng |
|----------|-----------------|--------|---------------------|
| **Slot packing** | Ghi/đọc storage | ~20k gas/slot gộp | Sai thứ tự → không gói được |
| **calldata** | Copy tham số hàm `external` | Theo độ dài mảng | Không sửa được tại chỗ |
| **constant/immutable** | Bỏ `SLOAD` | ~2.1k gas/lần đọc | `immutable` chỉ gán 1 lần trong constructor |
| **unchecked** | Bỏ kiểm overflow | ~30–40 gas/phép | Mở lại lỗ hổng overflow nếu sai |
| **event thay storage** | Không ghi storage | ~20k → vài trăm gas | Contract không đọc lại được |

> **Đo trước khi tối ưu**: dùng `forge test --gas-report` hoặc `forge snapshot` (Foundry) để **đo gas thật**, đừng tối ưu theo cảm tính. Tối ưu vi mô mà làm code khó đọc/kém an toàn thường **lỗ**: một lỗ hổng còn đắt hơn mọi khoản gas tiết kiệm.

---

## 8. Tóm tắt
- **Oracle problem** là bài toán **niềm tin**: EVM deterministic nên mù với ngoài chain; đưa dữ liệu vào bằng một oracle tập trung sẽ tạo **điểm tin cậy duy nhất** phá vỡ tính trustless.
- **Chainlink** phi tập trung hoá oracle bằng **nhiều node + nhiều nguồn + tổng hợp median**; muốn thao túng phải mua chuộc đa số.
- **Price Feed**: đọc `latestRoundData`, luôn xử lý **decimals** (thường 8), kiểm **staleness**, không dùng giá spot DEX.
- **VRF**: random **verifiable**, luồng **2 bước** yêu cầu → callback; quyết định phải nằm trong `fulfillRandomWords`.
- **Automation**: `checkUpkeep` off-chain miễn phí lọc điều kiện, `performUpkeep` on-chain **phải kiểm lại** vì là hàm public.
- **Gas**: storage là thứ đắt nhất — **packing**, `calldata`, `constant`/`immutable`, `unchecked`, và **event thay storage** đều xoay quanh việc **chạm storage ít nhất có thể**. Luôn **đo bằng gas-report** trước khi tối ưu.

> **Bài tiếp theo:** ghép mọi mảnh lại — xây một **dApp hoàn chỉnh** (contract + frontend + oracle) và quy trình **test/deploy an toàn** bằng Foundry.
