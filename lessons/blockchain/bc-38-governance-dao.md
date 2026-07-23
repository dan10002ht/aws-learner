# Bài 41 — Governance, DAO & treasury

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân biệt **on-chain governance** (Governor + Timelock) và **off-chain governance** (Snapshot) — biết khi nào dùng cái nào.
- Giải thích **token voting**, **quorum**, **delegation** và các mô hình bỏ phiếu (token-weighted, quadratic, conviction).
- Đọc trọn **vòng đời một proposal** trong OpenZeppelin Governor: `Pending → Active → Succeeded → Queued → Executed`.
- Thiết kế cấu trúc **DAO + treasury**, dùng **multisig (Gnosis Safe)** và **Timelock** để giữ tiền an toàn.
- Nhận diện & phòng các **tấn công governance**: flash-loan voting, vote buying/bribery, low participation, proposal độc.

---

## 2. Lý thuyết

### 2.1 Analogy — hội đồng cổ đông của một công ty không giám đốc

Một công ty cổ phần ra quyết định bằng **đại hội cổ đông**: mỗi cổ phiếu là một phiếu bầu, cần **đủ số cổ đông tham gia** (quorum) thì cuộc họp mới hợp lệ, và nghị quyết được thông qua nếu đa số đồng ý. **DAO** (Decentralized Autonomous Organization) áp đúng mô hình đó lên blockchain, nhưng khác ở ba điểm cốt lõi:

1. **Không có giám đốc/HĐQT** cưỡng chế thi hành — nghị quyết được **smart contract tự động thực thi** (hoặc không thực thi gì cả).
2. **"Cổ phiếu" là governance token** — ai cầm token nấy có quyền biểu quyết, chuyển nhượng tự do trên thị trường.
3. **Quỹ công ty (treasury)** nằm trong một smart contract, chi tiêu **chỉ khi** proposal được thông qua và thực thi đúng quy trình.

> Điểm mấu chốt: governance token **không chỉ là quyền bầu**, nó điều khiển **túi tiền**. Nếu ai đó chiếm được đa số quyền bầu (dù chỉ trong 1 khối), họ có thể vote một proposal **rút sạch treasury**. Toàn bộ thiết kế governance là cuộc chiến làm cho việc đó **khó và chậm** đến mức không đáng.

### 2.2 On-chain vs off-chain governance

Có hai triết lý về "phiếu bầu được đếm ở đâu":

| Tiêu chí | **On-chain** (Governor) | **Off-chain** (Snapshot) |
|----------|-------------------------|--------------------------|
| Phiếu bầu | Là **transaction on-chain**, tốn gas | Là **chữ ký off-chain** (EIP-712), **miễn phí** |
| Đếm phiếu | Smart contract đếm & lưu trên chain | Máy chủ Snapshot đọc balance tại 1 block |
| Thực thi | **Tự động** qua Timelock (trustless) | **Thủ công** — cần multisig/nhóm thực thi |
| Chi phí cử tri | Cao (mỗi phiếu = phí gas) | Gần như 0 → participation cao hơn |
| Độ tin cậy | Không cần tin ai | Tin server Snapshot + nhóm thực thi |
| Dùng khi | Quyết định **chi treasury / đổi param** cần trustless | **Signal / thăm dò ý kiến**, đổi tham số off-chain |

Thực tế nhiều DAO lớn dùng **kết hợp**: Snapshot để **thăm dò** (temperature check, miễn phí, participation cao), rồi mới đưa lên **on-chain Governor** để thực thi ràng buộc khoản chi. Snapshot dùng **snapshot balance tại một block trong quá khứ** để chống mua token bỏ phiếu xong bán ngay — nhưng vì phiếu là chữ ký off-chain, nó **không tự thực thi** được.

### 2.3 Token voting, quorum & delegation

Ba khái niệm quyết định "một phiếu nặng bao nhiêu":

- **Voting power** (token-weighted): 1 token = 1 phiếu. Đơn giản nhưng **giàu = quyền lực** (plutocracy). Các biến thể: **quadratic voting** (chi phí phiếu tăng theo bình phương → giảm quyền cá voi), **conviction voting** (phiếu càng giữ lâu càng nặng).
- **Quorum**: **ngưỡng tối thiểu** tổng phiếu tham gia để proposal hợp lệ. Không đủ quorum → dù 100% "For" cũng **trượt**. Chống việc một nhóm nhỏ lén thông qua khi số đông ngủ quên.
- **Delegation** (uỷ quyền): người giữ token **không tự bỏ phiếu** mà **uỷ quyền voting power** cho một địa chỉ khác (delegate) đại diện. Đây là mắt xích **bắt buộc** trong OpenZeppelin Governor.

> ⚠️ Bẫy cực phổ biến: với `ERC20Votes`, **nếu bạn không delegate cho chính mình**, voting power của bạn = **0** — dù ví đầy token. Governor chỉ đếm **voting power đã được delegate**, không đếm balance thô. Rất nhiều người mới "vote không được" chỉ vì quên gọi `delegate(self)`.

Lý do kỹ thuật: đếm balance trực tiếp sẽ bị **double-vote qua chuyển token** (vote xong gửi token cho ví khác vote tiếp). `ERC20Votes` lưu **checkpoint** voting power theo từng block; Governor chốt quyền bầu tại **một block quá khứ** (snapshot), nên chuyển token sau đó **không** đổi được phiếu.

### 2.4 Vòng đời một proposal (OpenZeppelin Governor)

<svg viewBox="0 0 720 220" role="img" aria-labelledby="pl-t pl-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="pl-t">Vòng đời proposal on-chain</title>
<desc id="pl-d">Chuỗi trạng thái từ Pending qua Active tới Succeeded rồi Queued trong Timelock và cuối cùng Executed, nhánh phụ dẫn tới Defeated hoặc Canceled</desc>
<rect x="10" y="90" width="96" height="48" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="58" y="112" text-anchor="middle" font-size="12" fill="currentColor">Pending</text>
<text x="58" y="128" text-anchor="middle" font-size="10" fill="currentColor">(voting delay)</text>
<rect x="150" y="90" width="96" height="48" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="198" y="112" text-anchor="middle" font-size="12" fill="currentColor">Active</text>
<text x="198" y="128" text-anchor="middle" font-size="10" fill="currentColor">(voting period)</text>
<rect x="290" y="90" width="104" height="48" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="342" y="112" text-anchor="middle" font-size="12" fill="currentColor">Succeeded</text>
<text x="342" y="128" text-anchor="middle" font-size="10" fill="currentColor">quorum+For&gt;Against</text>
<rect x="438" y="90" width="96" height="48" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="486" y="112" text-anchor="middle" font-size="12" fill="currentColor">Queued</text>
<text x="486" y="128" text-anchor="middle" font-size="10" fill="currentColor">(timelock delay)</text>
<rect x="580" y="90" width="120" height="48" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="640" y="118" text-anchor="middle" font-size="12" fill="currentColor">Executed</text>
<rect x="290" y="165" width="104" height="40" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="342" y="190" text-anchor="middle" font-size="12" fill="currentColor">Defeated</text>
<rect x="10" y="20" width="236" height="40" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="128" y="45" text-anchor="middle" font-size="12" fill="currentColor">Canceled (proposer rút / guardian)</text>
<line x1="106" y1="114" x2="148" y2="114" stroke="currentColor" stroke-width="1.5" marker-end="url(#ga)"/>
<line x1="246" y1="114" x2="288" y2="114" stroke="currentColor" stroke-width="1.5" marker-end="url(#ga)"/>
<line x1="394" y1="114" x2="436" y2="114" stroke="currentColor" stroke-width="1.5" marker-end="url(#ga)"/>
<line x1="534" y1="114" x2="578" y2="114" stroke="currentColor" stroke-width="1.5" marker-end="url(#ga)"/>
<line x1="198" y1="138" x2="330" y2="163" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 4" marker-end="url(#ga)"/>
<line x1="128" y1="90" x2="128" y2="62" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 4" marker-end="url(#ga)"/>
<defs><marker id="ga" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

- **Pending**: sau khi `propose()`, phải chờ **voting delay** (vài block) trước khi mở bỏ phiếu — cho cộng đồng thời gian đọc & delegate.
- **Active**: mở bỏ phiếu trong **voting period**. Cử tri vote `Against(0) / For(1) / Abstain(2)`.
- **Succeeded / Defeated**: kết thúc period, đếm phiếu tại **snapshot block**. Cần **đủ quorum** VÀ `For > Against`.
- **Queued**: proposal thắng được đẩy vào **Timelock**, chờ **delay** (ví dụ 2 ngày). Đây là "phanh an toàn" — nếu proposal độc, cộng đồng có thời gian **rút tiền / phản ứng** trước khi nó thực thi.
- **Executed**: sau delay, bất kỳ ai gọi `execute()` để Timelock chạy các lệnh (chuyển tiền treasury, đổi param...).

### 2.5 Cấu trúc DAO & treasury: ai thực sự cầm tiền?

Một sai lầm chết người là để **Governor cầm tiền trực tiếp**. Kiến trúc chuẩn tách vai trò rất rõ:

<svg viewBox="0 0 700 250" role="img" aria-labelledby="dao-t dao-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="dao-t">Kiến trúc DAO tách quyền</title>
<desc id="dao-d">Token holders delegate cho Governor, Governor chỉ được đề xuất và xếp hàng lệnh vào Timelock, Timelock mới là chủ sở hữu treasury và thực thi sau độ trễ</desc>
<rect x="40" y="100" width="130" height="60" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="128" text-anchor="middle" font-size="13" fill="currentColor">Token holders</text>
<text x="105" y="146" text-anchor="middle" font-size="10" fill="currentColor">(ERC20Votes)</text>
<rect x="230" y="100" width="120" height="60" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="290" y="128" text-anchor="middle" font-size="13" fill="currentColor">Governor</text>
<text x="290" y="146" text-anchor="middle" font-size="10" fill="currentColor">đếm phiếu</text>
<rect x="410" y="100" width="120" height="60" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="470" y="128" text-anchor="middle" font-size="13" fill="currentColor">Timelock</text>
<text x="470" y="146" text-anchor="middle" font-size="10" fill="currentColor">delay + owner</text>
<rect x="580" y="100" width="100" height="60" rx="10" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="630" y="128" text-anchor="middle" font-size="13" fill="currentColor">Treasury</text>
<text x="630" y="146" text-anchor="middle" font-size="10" fill="currentColor">(quỹ)</text>
<line x1="170" y1="130" x2="228" y2="130" stroke="currentColor" stroke-width="1.5" marker-end="url(#da)"/>
<text x="199" y="120" text-anchor="middle" font-size="10" fill="currentColor">delegate</text>
<line x1="350" y1="130" x2="408" y2="130" stroke="currentColor" stroke-width="1.5" marker-end="url(#da)"/>
<text x="379" y="120" text-anchor="middle" font-size="10" fill="currentColor">queue</text>
<line x1="530" y1="130" x2="578" y2="130" stroke="currentColor" stroke-width="1.5" marker-end="url(#da)"/>
<text x="554" y="120" text-anchor="middle" font-size="10" fill="currentColor">execute</text>
<text x="350" y="210" text-anchor="middle" font-size="11" fill="currentColor">Governor CHỈ đề xuất &amp; xếp hàng — Timelock mới sở hữu treasury &amp; thực thi sau độ trễ</text>
<text x="350" y="230" text-anchor="middle" font-size="11" fill="currentColor">Không ai được chuyển tiền trực tiếp — mọi khoản chi phải qua trọn quy trình vote + delay</text>
</svg>

- **Token holders → Governor**: nguồn quyền lực, uỷ quyền voting power.
- **Governor**: **không giữ tiền**, chỉ có quyền `propose / queue`. Là "cơ quan lập pháp".
- **Timelock (`TimelockController`)**: **chủ sở hữu treasury**, là "cơ quan hành pháp có độ trễ". Chỉ Governor được `queue`, và chỉ chạy sau delay.
- **Treasury**: có thể là chính Timelock, hoặc một **Gnosis Safe multisig** mà Timelock điều khiển.

**Multisig (Gnosis Safe)** là ví m-of-n: ví dụ 3/5 chữ ký mới ký được giao dịch. Vai trò trong DAO:
- **Giai đoạn đầu / DAO nhỏ**: dùng multisig của core team giữ treasury (nhanh, linh hoạt, nhưng tập trung — phải tin nhóm ký).
- **DAO trưởng thành**: multisig làm **executor/guardian** dưới quyền Timelock, hoặc giữ quỹ hoạt động nhỏ (operating budget) còn quỹ lớn do Governor điều khiển.
- **Guardian/veto**: nhiều DAO gắn multisig như "phanh khẩn cấp" có quyền **cancel** proposal độc trong thời gian Timelock — đánh đổi phi tập trung lấy an toàn.

---

## 3. Code: bộ Governor + Timelock tối thiểu (OpenZeppelin v5)

### 3.1 Governance token — `ERC20Votes`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

contract GovToken is ERC20, ERC20Permit, ERC20Votes {
    constructor() ERC20("Gov Token", "GOV") ERC20Permit("Gov Token") {
        _mint(msg.sender, 1_000_000e18);
    }

    // ERC20Votes lưu checkpoint voting power theo block => bắt buộc override
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }

    function nonces(address owner)
        public view override(ERC20Permit, Nonces) returns (uint256)
    {
        return super.nonces(owner);
    }
}
```

`ERC20Votes` thêm cơ chế **checkpoint**: mỗi lần token chuyển tay, voting power của delegate được ghi mốc theo block. Nhờ đó Governor truy được "địa chỉ X có bao nhiêu phiếu **tại block Y trong quá khứ**" — nền tảng chống double-vote.

### 3.2 Governor

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Governor} from "@openzeppelin/contracts/governance/Governor.sol";
import {GovernorSettings} from "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import {GovernorCountingSimple} from "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import {GovernorVotes} from "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import {GovernorVotesQuorumFraction} from "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import {GovernorTimelockControl} from "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

contract MyGovernor is
    Governor, GovernorSettings, GovernorCountingSimple,
    GovernorVotes, GovernorVotesQuorumFraction, GovernorTimelockControl
{
    constructor(IVotes _token, TimelockController _timelock)
        Governor("MyGovernor")
        GovernorSettings(
            7200,      // votingDelay: ~1 ngày (block ~12s)
            50400,     // votingPeriod: ~1 tuần
            0          // proposalThreshold: token tối thiểu để propose
        )
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(4)   // quorum = 4% tổng cung
        GovernorTimelockControl(_timelock)
    {}

    // ---- các override bắt buộc do đa kế thừa ----
    function votingDelay() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.votingDelay();
    }
    function votingPeriod() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.votingPeriod();
    }
    function quorum(uint256 blockNumber)
        public view override(Governor, GovernorVotesQuorumFraction) returns (uint256)
    {
        return super.quorum(blockNumber);
    }
    function state(uint256 proposalId)
        public view override(Governor, GovernorTimelockControl) returns (ProposalState)
    {
        return super.state(proposalId);
    }
    function proposalNeedsQueuing(uint256 proposalId)
        public view override(Governor, GovernorTimelockControl) returns (bool)
    {
        return super.proposalNeedsQueuing(proposalId);
    }
    function proposalThreshold()
        public view override(Governor, GovernorSettings) returns (uint256)
    {
        return super.proposalThreshold();
    }
    function _queueOperations(uint256 id, address[] memory t, uint256[] memory v,
        bytes[] memory c, bytes32 d) internal
        override(Governor, GovernorTimelockControl) returns (uint48)
    { return super._queueOperations(id, t, v, c, d); }

    function _executeOperations(uint256 id, address[] memory t, uint256[] memory v,
        bytes[] memory c, bytes32 d) internal
        override(Governor, GovernorTimelockControl)
    { super._executeOperations(id, t, v, c, d); }

    function _cancel(address[] memory t, uint256[] memory v, bytes[] memory c, bytes32 d)
        internal override(Governor, GovernorTimelockControl) returns (uint256)
    { return super._cancel(t, v, c, d); }

    function _executor()
        internal view override(Governor, GovernorTimelockControl) returns (address)
    { return super._executor(); }
}
```

Ba tham số quan trọng nhất khi thiết kế:
- **`votingDelay`** — thời gian chuẩn bị trước khi mở phiếu (chống bất ngờ).
- **`votingPeriod`** — cửa sổ bỏ phiếu (dài để participation cao, nhưng phản ứng chậm).
- **`quorum` (4%)** — quá cao thì DAO tê liệt vì không đủ phiếu; quá thấp thì dễ bị nhóm nhỏ chiếm quyền.

### 3.3 Nối dây Timelock (script Foundry)

```solidity
// Trong deploy script:
address[] memory proposers = new address[](1);
address[] memory executors = new address[](1);
proposers[0] = address(governor);      // chỉ Governor được queue
executors[0] = address(0);             // address(0) = BẤT KỲ AI được execute
TimelockController timelock = new TimelockController(
    2 days,      // minDelay: phanh an toàn
    proposers, executors,
    msg.sender   // admin tạm để cấu hình, sẽ renounce sau
);

// Chuyển quyền sở hữu treasury cho Timelock (KHÔNG cho Governor):
treasury.transferOwnership(address(timelock));

// Sau khi cấu hình xong, admin renounce để không ai có backdoor:
timelock.renounceRole(timelock.DEFAULT_ADMIN_ROLE(), msg.sender);
```

Mấu chốt bảo mật: **proposer = Governor** (chỉ vote thắng mới queue được), **executor = ai cũng được** (execute chỉ chạy đúng lệnh đã queue nên vô hại), và **admin phải renounce** — nếu để lại admin thì đó là backdoor bỏ qua toàn bộ vote.

### 3.4 Vòng đời qua lệnh gọi

```solidity
// 1) Đề xuất: chuyển 100 token từ treasury cho grantee
address[] memory targets = new address[](1);
uint256[] memory values  = new uint256[](1);
bytes[]   memory calldatas = new bytes[](1);
targets[0]   = address(token);
calldatas[0] = abi.encodeCall(IERC20.transfer, (grantee, 100e18));
uint256 id = governor.propose(targets, values, calldatas, "Grant #1: fund dev");

// 2) Đợi votingDelay, rồi bỏ phiếu (1 = For)
governor.castVote(id, 1);

// 3) Sau votingPeriod, nếu Succeeded => queue vào Timelock
bytes32 descHash = keccak256(bytes("Grant #1: fund dev"));
governor.queue(targets, values, calldatas, descHash);

// 4) Đợi minDelay của Timelock, rồi execute
governor.execute(targets, values, calldatas, descHash);
```

`descHash` phải **khớp tuyệt đối** với description lúc `propose` — Governor dùng nó để tính `proposalId`; sai một ký tự là revert.

---

## 4. Các tấn công governance & phòng thủ

| Tấn công | Cơ chế | Phòng thủ |
|----------|--------|-----------|
| **Flash-loan voting** | Vay khối lượng token khổng lồ trong 1 tx, vote, trả lại ngay | Snapshot **block quá khứ** (`getPastVotes`) + `votingDelay > 0` khiến voting power phải có **trước** khi propose |
| **Vote buying / bribery** | Trả tiền để người khác vote/delegate theo ý mình (vd nền tảng như Paladin, hidden bribes) | Khó chặn hoàn toàn; giảm động lực bằng quorum cao, quyết định quan trọng cần thời gian dài, minh bạch on-chain |
| **Low participation** | Số đông không vote → một nhóm nhỏ đủ chiếm quorum, thông qua proposal có lợi cho họ | Delegation (uỷ quyền cho delegate tích cực), quorum hợp lý, thưởng tham gia, Snapshot miễn phí |
| **Malicious/obfuscated proposal** | Proposal ẩn lệnh rút treasury sau lớp encode khó đọc | Timelock delay để cộng đồng review, guardian có quyền cancel, tool giải mã calldata |
| **Governance takeover** | Mua/tích luỹ đủ token vượt quorum để tự thông qua | Timelock (rút tiền kịp), quorum + proposalThreshold, vesting token đội ngũ, phân phối rộng |

### 4.1 Vì sao Timelock là phòng thủ mạnh nhất

Ngay cả khi kẻ tấn công **thắng vote hợp lệ** (mua đủ token), Timelock delay (vài ngày) cho phần còn lại của cộng đồng **thời gian rút tài sản, fork, hoặc guardian cancel** trước khi lệnh độc thực thi. Nó biến "thắng vote" từ **thắng ngay lập tức** thành **thắng có báo trước** — thay đổi hoàn toàn kinh tế của tấn công.

### 4.2 Case thực tế: Beanstalk (2022)

Kẻ tấn công vay **flash loan ~1 tỷ USD**, dùng nó mua governance token đủ để **tự thông qua một emergency proposal** trong **cùng một transaction**, rút ~182 triệu USD khỏi protocol, rồi trả flash loan — tất cả trong **một khối**. Bài học: Beanstalk có cơ chế "emergency commit" **bỏ qua Timelock delay** và đếm phiếu **trong cùng tx**. Đúng hai lỗi mà mô hình chuẩn (snapshot block quá khứ + Timelock delay bắt buộc) đã chặn.

> Nguyên tắc vàng: **voting power phải được chốt ở một block TRƯỚC khi proposal tồn tại**, và **mọi lệnh phải qua delay**. Vi phạm một trong hai là mở cửa cho flash-loan governance.

---

## 5. Tóm tắt
- **DAO** = hội đồng cổ đông on-chain: governance token là phiếu bầu, và phiếu bầu điều khiển **treasury**.
- **On-chain (Governor+Timelock)** thực thi trustless nhưng tốn gas; **off-chain (Snapshot)** miễn phí, participation cao nhưng cần bên thực thi — nhiều DAO **kết hợp** cả hai.
- **Delegation là bắt buộc** với `ERC20Votes`: không delegate = 0 phiếu. Voting power chốt tại **snapshot block quá khứ** để chống double-vote & flash loan.
- **Quorum** chống nhóm nhỏ chiếm quyền; đặt quá cao thì DAO tê liệt, quá thấp thì dễ bị takeover.
- Kiến trúc chuẩn **tách quyền**: Governor đề xuất → Timelock (chủ treasury) thực thi sau delay; multisig (Gnosis Safe) làm guardian/quỹ hoạt động.
- **Timelock delay** là phòng thủ mạnh nhất — biến mọi tấn công governance từ "thắng ngay" thành "thắng có báo trước", cho cộng đồng thời gian phản ứng.

> **Bài tiếp theo:** đi vào **tokenomics & thiết kế incentive** — cách phân phối, vesting, và giá trị thực của một governance token vượt ngoài quyền bỏ phiếu.
