# Bài 40 — Thiết kế token & cơ chế khuyến khích

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân loại **token** theo chức năng: **utility / governance / security** — và hiểu vì sao ranh giới pháp lý (Howey test) quan trọng.
- Thiết kế **supply**: fixed vs inflationary, **emission schedule**, và các **sink/burn** để cân bằng cung–cầu.
- Đọc & thiết kế lịch **vesting / cliff / unlock** cho team, investor, community — và nhìn ra rủi ro **unlock cliff**.
- Giải thích **ve-token model (vote-escrow)**: khoá token đổi lấy quyền biểu quyết + phần thưởng, và vì sao nó chống **farm-and-dump**.
- Phân tích **incentive alignment** giữa các bên, và nhận diện phản mẫu: **ponzi, hyperinflation, farm-and-dump**.

---

## 2. Lý thuyết

### 2.1 Analogy — token là "cổ phần + vé sự dụng + lá phiếu" gộp làm một

Trong công ty truyền thống, ba thứ tách bạch: **cổ phiếu** (sở hữu & chia lời), **thẻ hội viên** (quyền dùng dịch vụ), **lá phiếu đại hội cổ đông** (quyền biểu quyết). Token cho phép **trộn** cả ba vào một tài sản có thể chuyển nhượng tức thời trên chain. Sức mạnh nằm ở đó — nhưng cũng là cái bẫy: nếu bạn thiết kế token vừa hứa "lợi nhuận" vừa gọi nó là "tiện ích", bạn dễ vô tình phát hành một **chứng khoán không đăng ký**.

**Tokenomics** = kinh tế học của token: ai được bao nhiêu, khi nào, đổi lại điều gì, và **dòng tiền/giá trị chảy vào–ra** hệ thống ra sao. Một dự án có công nghệ tốt vẫn chết nếu tokenomics tạo ra động lực sai (mọi người đều muốn bán).

### 2.2 Phân loại token theo chức năng

| Loại | Trao quyền gì | Nguồn giá trị | Ví dụ | Rủi ro pháp lý |
|------|---------------|---------------|-------|----------------|
| **Utility** | Trả phí dùng dịch vụ (gas, phí giao dịch, quota) | Nhu cầu **dùng thật** mạng lưới | ETH (gas), FIL (lưu trữ) | Thấp–trung nếu thật sự có tiện ích |
| **Governance** | Biểu quyết tham số giao thức, kho quỹ | Quyền kiểm soát dòng tiền protocol | UNI, COMP, MKR | Trung — dễ bị coi là "lợi nhuận từ nỗ lực người khác" |
| **Security** | Đại diện cổ phần/nợ, chia lời | Dòng tiền tương lai của phát hành | Token cổ phần token hoá | Cao — phải tuân luật chứng khoán |

**Howey test** (Mỹ) coi một thứ là chứng khoán nếu: (1) đầu tư tiền, (2) vào một **doanh nghiệp chung**, (3) kỳ vọng **lợi nhuận**, (4) chủ yếu từ **nỗ lực của người khác**. Nhiều "utility token" thất bại ở (3)+(4) vì đội ngũ marketing bằng lời hứa giá tăng. Nguyên tắc thiết kế: **token phải có công dụng bắt buộc trong sản phẩm** (không mua token thì không dùng được / trả phí bằng token), chứ không chỉ là "chip đặt cược vào giá".

Thực tế nhiều token là **lai (hybrid)**: vừa dùng trả phí, vừa staking để bảo mật, vừa biểu quyết. Điều quan trọng là mỗi vai trò tạo **cầu (demand sink)** thực sự, không chỉ là câu chuyện.

### 2.3 Supply & emission — cung tiền và tốc độ in

Hai câu hỏi gốc: **tổng cung là bao nhiêu** và **phát hành ra thị trường nhanh hay chậm**.

- **Fixed supply (giảm phát)**: trần cứng, ví dụ Bitcoin 21 triệu, phát hành theo **halving** mỗi ~4 năm. Ưu: khan hiếm, dễ kể chuyện "store of value". Nhược: không có ngân sách bảo mật dài hạn (miner reward → 0, phải sống bằng phí).
- **Inflationary (lạm phát có kiểm soát)**: in thêm đều đặn để **trả thưởng staking/bảo mật**, ví dụ ~4–8%/năm. Ưu: có ngân sách trả cho validator mãi mãi. Nhược: pha loãng người giữ nếu không có sink cân lại.
- **Disinflationary**: lạm phát nhưng giảm dần theo thời gian.

**Emission schedule** = đường cong "bao nhiêu token mới ra mỗi ngày/epoch". Nếu emission lớn hơn nhiều so với cầu → giá xói mòn (đây là gốc của **hyperinflation** ở nhiều dự án DeFi 2020–2021).

**Sink / burn** = cơ chế **rút token khỏi lưu thông**, cân lại lạm phát:
- **Burn phí giao dịch**: Ethereum **EIP-1559** đốt phần `base fee` — khi mạng bận, ETH trở nên **giảm phát ròng**.
- **Buyback-and-burn**: protocol dùng doanh thu mua lại token rồi đốt.
- **Lock/stake sink**: khoá token (ve-model) rút tạm khỏi cung lưu hành.
- **Consumable utility**: đốt token để mint NFT, nâng cấp, trả phí.

> **Chỉ số cần nhìn:** không phải *total supply* mà là **circulating supply** (đang lưu hành), **net emission = phát hành − burn**, và **FDV (fully diluted valuation)** = giá × tổng cung sẽ có. FDV cao gấp nhiều lần market cap là cờ đỏ: một núi token chưa unlock đang chờ đổ ra.

### 2.4 Phân bổ (allocation) & vesting

Khi phát hành, tổng cung được chia cho các nhóm. Một phân bổ **lành mạnh** ưu tiên cộng đồng/hệ sinh thái và **không** để insider (team + investor) chiếm đa số có thể bán sớm.

<svg viewBox="0 0 700 300" role="img" aria-labelledby="al-t al-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="al-t">Phân bổ token &amp; lịch mở khoá</title>
<desc id="al-d">Một biểu đồ cột thể hiện các nhóm nhận token và một trục thời gian với cliff và vesting tuyến tính</desc>
<text x="120" y="24" text-anchor="middle" font-size="14" fill="currentColor">Phân bổ điển hình</text>
<rect x="40" y="40" width="30" height="150" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="55" y="205" text-anchor="middle" font-size="10" fill="currentColor">Community</text>
<text x="55" y="220" text-anchor="middle" font-size="10" fill="currentColor">40%</text>
<rect x="90" y="90" width="30" height="100" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="205" text-anchor="middle" font-size="10" fill="currentColor">Team</text>
<text x="105" y="220" text-anchor="middle" font-size="10" fill="currentColor">18%</text>
<rect x="140" y="100" width="30" height="90" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="155" y="205" text-anchor="middle" font-size="10" fill="currentColor">Investor</text>
<text x="155" y="220" text-anchor="middle" font-size="10" fill="currentColor">17%</text>
<rect x="190" y="110" width="30" height="80" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="205" y="205" text-anchor="middle" font-size="10" fill="currentColor">Treasury</text>
<text x="205" y="220" text-anchor="middle" font-size="10" fill="currentColor">15%</text>
<rect x="240" y="140" width="30" height="50" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="255" y="205" text-anchor="middle" font-size="10" fill="currentColor">Liquidity</text>
<text x="255" y="220" text-anchor="middle" font-size="10" fill="currentColor">10%</text>
<text x="500" y="24" text-anchor="middle" font-size="14" fill="currentColor">Lịch mở khoá 1 nhóm</text>
<line x1="330" y1="180" x2="670" y2="180" stroke="currentColor" stroke-width="1.5" marker-end="url(#ar)"/>
<line x1="330" y1="180" x2="330" y2="50" stroke="currentColor" stroke-width="1.5"/>
<line x1="330" y1="180" x2="410" y2="180" stroke="#f43f5e" stroke-width="3"/>
<text x="370" y="198" text-anchor="middle" font-size="10" fill="#f43f5e">cliff 12 tháng</text>
<line x1="410" y1="180" x2="410" y2="80" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<line x1="410" y1="180" x2="640" y2="70" stroke="#3b82f6" stroke-width="2.5"/>
<text x="540" y="120" text-anchor="middle" font-size="10" fill="currentColor">vesting tuyến tính 36 tháng</text>
<circle cx="410" cy="80" r="3" fill="currentColor"/>
<text x="410" y="64" text-anchor="middle" font-size="9" fill="currentColor">unlock đầu</text>
<text x="655" y="196" text-anchor="middle" font-size="10" fill="currentColor">t</text>
<text x="322" y="56" text-anchor="end" font-size="10" fill="currentColor">%unlock</text>
<defs><marker id="ar" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

- **Cliff**: khoảng thời gian đầu **không mở khoá gì cả**. Ví dụ team cliff 12 tháng: nếu rời dự án trước 1 năm → mất sạch. Chống "nhận token xong bỏ chạy".
- **Vesting**: sau cliff, token mở khoá **dần** (thường tuyến tính theo block/tháng) trong 24–48 tháng. Gắn lợi ích dài hạn.
- **Unlock cliff (rủi ro)**: nếu nhiều nhóm cùng hết cliff **một ngày**, một lượng lớn token đổ ra cùng lúc → áp lực bán. Nhà thiết kế tốt **so le (stagger)** các mốc unlock và công bố lịch minh bạch để thị trường hấp thụ dần.

**Nguyên tắc:** insider (team + investor) nên **vest lâu hơn và cliff dài hơn** cộng đồng — vì họ nhận token giá rẻ/miễn phí, cần chứng minh cam kết. Investor mua giá 0.01$ mà unlock sớm khi giá 1$ sẽ bán bằng mọi giá (lãi 100 lần vẫn lời) → nghiền nát người mua bán lẻ.

### 2.5 ve-token model (vote-escrow)

Vấn đề của "trả thưởng token cho người cung cấp thanh khoản/stake": người ta stake, nhận thưởng, **bán ngay** (farm-and-dump). Không có cam kết dài hạn → emission chảy thẳng ra chợ.

**Vote-escrow (ve)**, do Curve (veCRV) phổ biến hoá, giải bằng cách: **khoá token càng lâu → càng nhiều quyền lợi**.

<svg viewBox="0 0 700 250" role="img" aria-labelledby="ve-t ve-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="ve-t">Cơ chế vote-escrow</title>
<desc id="ve-d">Người dùng khoá token trong một khoảng thời gian và nhận lại veToken tỉ lệ với thời gian khoá, kèm quyền biểu quyết và tăng thưởng</desc>
<rect x="30" y="95" width="110" height="60" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="85" y="120" text-anchor="middle" font-size="12" fill="currentColor">100 TOKEN</text>
<text x="85" y="138" text-anchor="middle" font-size="11" fill="currentColor">của bạn</text>
<rect x="270" y="40" width="150" height="60" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="345" y="64" text-anchor="middle" font-size="12" fill="currentColor">khoá 1 năm</text>
<text x="345" y="82" text-anchor="middle" font-size="12" fill="currentColor">→ 25 veTOKEN</text>
<rect x="270" y="150" width="150" height="60" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="345" y="174" text-anchor="middle" font-size="12" fill="currentColor">khoá 4 năm</text>
<text x="345" y="192" text-anchor="middle" font-size="12" fill="currentColor">→ 100 veTOKEN</text>
<line x1="140" y1="115" x2="268" y2="75" stroke="currentColor" stroke-width="1.5" marker-end="url(#av)"/>
<line x1="140" y1="135" x2="268" y2="178" stroke="currentColor" stroke-width="1.5" marker-end="url(#av)"/>
<rect x="520" y="30" width="150" height="185" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="595" y="58" text-anchor="middle" font-size="12" fill="currentColor">veTOKEN cho:</text>
<text x="595" y="88" text-anchor="middle" font-size="11" fill="currentColor">• quyền biểu quyết</text>
<text x="595" y="112" text-anchor="middle" font-size="11" fill="currentColor">• boost thưởng ×2.5</text>
<text x="595" y="136" text-anchor="middle" font-size="11" fill="currentColor">• chia phí giao thức</text>
<text x="595" y="160" text-anchor="middle" font-size="11" fill="currentColor">• không chuyển nhượng</text>
<text x="595" y="192" text-anchor="middle" font-size="11" fill="#f43f5e">phải khoá — không bán được</text>
<line x1="420" y1="70" x2="518" y2="110" stroke="currentColor" stroke-width="1.5" marker-end="url(#av)"/>
<line x1="420" y1="180" x2="518" y2="135" stroke="currentColor" stroke-width="1.5" marker-end="url(#av)"/>
<defs><marker id="av" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Cơ chế cốt lõi: **veTOKEN = TOKEN × (thời gian khoá / thời gian khoá tối đa)**. Khoá 4 năm được full quyền, khoá 1 tuần gần như không có gì. veTOKEN thường **không chuyển nhượng** và **giảm dần (decay)** khi tới hạn — muốn giữ quyền lực phải khoá lại. Kết quả về mặt incentive:
- Người khoá lâu = người tin dài hạn → họ nắm quyền biểu quyết, giảm cung lưu hành.
- **Boost**: veTOKEN nhân thưởng cho LP của chính họ → khuyến khích khoá thay vì dump.
- **Bribe / gauge**: các protocol "hối lộ" người giữ ve để bỏ phiếu hướng emission về pool của họ (Curve wars) — một thị trường phái sinh của quyền biểu quyết.

ve-model không hoàn hảo (dễ tập trung quyền lực vào cá voi khoá sớm), nhưng nó **căn chỉnh** thời gian: ai muốn ăn thưởng phải chịu rủi ro dài hạn cùng dự án.

### 2.6 Incentive alignment — trò chơi giữa các bên

Tokenomics là **thiết kế cơ chế (mechanism design)**: giả định mọi bên đều **duy lý và tư lợi**, rồi sắp đặt luật sao cho hành vi tư lợi lại có lợi cho hệ thống.

| Bên | Muốn gì | Rủi ro nếu lệch | Công cụ căn chỉnh |
|-----|---------|-----------------|-------------------|
| **Team** | Vốn, xây lâu dài | Nhận token rồi bỏ chạy | Cliff dài + vesting nhiều năm |
| **Investor** | ROI cao, thoát sớm | Dump lên bán lẻ | Vesting, unlock so le, giá vào hợp lý |
| **User** | Phí rẻ, dịch vụ tốt | Chỉ đến vì airdrop | Token có utility bắt buộc |
| **LP / staker** | Yield cao | Farm-and-dump | ve-lock, vesting reward, đốt phần rút sớm |
| **Validator** | Phần thưởng khối | Tấn công/lười | Staking + slashing |

**Câu hỏi kiểm tra:** *"Nếu ai cũng tối đa hoá lợi ích cá nhân, hệ thống có bền không?"* Nếu con đường tối ưu của một cá nhân là **bán ngay và rời đi**, tokenomics đã hỏng.

---

## 3. Ví dụ code — hợp đồng vesting có cliff

Đây là bộ khung vesting tuyến tính có cliff (Solidity), rút gọn theo mẫu OpenZeppelin `VestingWallet`. Người thụ hưởng chỉ rút được phần đã "chín" theo thời gian.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Vesting tuyến tính có cliff cho MỘT beneficiary và MỘT token.
contract TokenVesting {
    using SafeERC20 for IERC20;

    address public immutable beneficiary;
    uint64  public immutable start;      // timestamp bắt đầu vesting
    uint64  public immutable cliff;      // timestamp hết cliff (>= start)
    uint64  public immutable duration;   // tổng thời lượng vesting (giây)
    IERC20  public immutable token;

    uint256 public released;             // đã rút bao nhiêu

    constructor(address _beneficiary, address _token, uint64 _start, uint64 _cliffDuration, uint64 _duration) {
        require(_beneficiary != address(0), "zero beneficiary");
        require(_duration > 0 && _cliffDuration <= _duration, "bad schedule");
        beneficiary = _beneficiary;
        token = IERC20(_token);
        start = _start;
        cliff = _start + _cliffDuration;
        duration = _duration;
    }

    /// @dev Tổng token đã "chín" tính đến timestamp ts (gồm cả đã rút).
    function vestedAmount(uint64 ts) public view returns (uint256) {
        uint256 total = token.balanceOf(address(this)) + released; // tổng token cấp phát
        if (ts < cliff) return 0;                 // còn trong cliff → chưa chín gì
        if (ts >= start + duration) return total; // đã hết hạn → chín toàn bộ
        return (total * (ts - start)) / duration; // tuyến tính theo thời gian trôi qua
    }

    /// @notice Rút phần đã chín nhưng chưa rút.
    function release() external {
        uint256 releasable = vestedAmount(uint64(block.timestamp)) - released;
        require(releasable > 0, "nothing to release");
        released += releasable;
        token.safeTransfer(beneficiary, releasable);
    }
}
```

Điểm cần chú ý về mặt tokenomics, không chỉ code:
- `vestedAmount` **tính theo `start`** chứ không theo `cliff`: khi vừa qua cliff, một cục lớn "chín ngược lại" ngay (linear-from-start). Nếu muốn phẳng hơn, tính tuyến tính **từ `cliff`** để tránh cú unlock nhảy bậc.
- Dùng `balanceOf + released` để suy ra tổng cấp phát → chống lỗi nếu ai đó nạp thêm token, nhưng cũng nghĩa là **không nên** gửi token lạ vào contract này.
- Bản production cần thêm **revoke** (nếu team nghỉ việc) và **bảo vệ reentrancy** ở các token phi chuẩn.

---

## 4. Phản mẫu — những thiết kế giết dự án

<svg viewBox="0 0 700 240" role="img" aria-labelledby="an-t an-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="an-t">Bền vững vs Ponzi</title>
<desc id="an-d">So sánh dòng giá trị của mô hình bền vững lấy từ doanh thu thật và mô hình ponzi lấy từ tiền người vào sau</desc>
<text x="175" y="24" text-anchor="middle" font-size="14" fill="#10b981">Bền vững</text>
<rect x="70" y="45" width="210" height="45" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="175" y="72" text-anchor="middle" font-size="12" fill="currentColor">Doanh thu thật (phí dịch vụ)</text>
<line x1="175" y1="90" x2="175" y2="120" stroke="currentColor" stroke-width="1.5" marker-end="url(#aa)"/>
<rect x="70" y="122" width="210" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="175" y="149" text-anchor="middle" font-size="12" fill="currentColor">Buyback / chia cho staker</text>
<text x="175" y="200" text-anchor="middle" font-size="11" fill="currentColor">Thưởng đến từ giá trị tạo ra → tồn tại lâu</text>
<line x1="350" y1="30" x2="350" y2="215" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<text x="525" y="24" text-anchor="middle" font-size="14" fill="#f43f5e">Ponzi</text>
<rect x="420" y="45" width="210" height="45" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="525" y="72" text-anchor="middle" font-size="12" fill="currentColor">Tiền người mới nạp vào</text>
<line x1="525" y1="90" x2="525" y2="120" stroke="currentColor" stroke-width="1.5" marker-end="url(#aa)"/>
<rect x="420" y="122" width="210" height="45" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="525" y="149" text-anchor="middle" font-size="12" fill="currentColor">Trả lãi cho người vào trước</text>
<text x="525" y="200" text-anchor="middle" font-size="11" fill="#f43f5e">Hết người mới → sụp đổ</text>
<defs><marker id="aa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

- **Ponzi / (3,3) rỗng**: phần thưởng cho người giữ đến từ **tiền người vào sau**, không phải doanh thu thật. APY 1000% "rebase" là cờ đỏ. Kiểm tra: *nguồn của yield là gì?* Nếu câu trả lời là "in thêm token" hoặc "tiền người mới" → ponzi. Bền vững = yield đến từ **phí/doanh thu thực**.
- **Hyperinflation**: emission (in token trả thưởng) **vượt xa** mọi sink. Cung lưu hành phình nhanh hơn cầu → giá rơi tự do dù TVL trông lớn. Nhiều "DeFi 2.0" chết vì đây. Thuốc: giới hạn emission, thêm burn/lock sink, và đảm bảo **net emission** giảm theo thời gian.
- **Farm-and-dump (mercenary capital)**: phát token thưởng cho LP không ràng buộc → "vốn lính đánh thuê" nhảy vào farm, bán token, rút thanh khoản, đi pool khác. Thanh khoản bốc hơi khi thưởng ngừng. Thuốc: **vesting phần thưởng**, **ve-lock**, phạt rút sớm, hoặc chuyển sang **POL (protocol-owned liquidity)**.
- **Low float / high FDV**: chỉ 5% cung lưu hành lúc list, 95% chờ unlock cho insider. Giá bị đẩy cao trên float mỏng rồi các đợt unlock nghiền nát. Luôn xem **lịch unlock** và **FDV/MC**.

> **Bài kiểm tra một câu cho mọi tokenomics:** *"Giá trị chảy vào từ đâu, và vì sao người ta phải KHÔNG bán?"* Nếu không trả lời được cả hai vế, thiết kế chưa xong.

---

## 5. Tóm tắt
- Token có ba vai trò gốc — **utility / governance / security**; thiết kế phải tạo **cầu thật**, tránh vô tình thành chứng khoán (Howey test).
- **Supply & emission** quyết định lạm phát; cân lại bằng **sink/burn** (EIP-1559, buyback-burn, lock). Nhìn **circulating supply, net emission, FDV** — không nhìn total supply.
- **Vesting + cliff** căn chỉnh cam kết dài hạn; insider phải khoá lâu hơn cộng đồng; **so le unlock** để thị trường hấp thụ.
- **ve-token (vote-escrow)** đổi thời gian khoá lấy quyền biểu quyết + boost thưởng → chống farm-and-dump, giảm cung lưu hành.
- **Incentive alignment** là mechanism design: nếu hành vi tối ưu của cá nhân là "bán và rời đi" thì tokenomics đã hỏng.
- Ba phản mẫu chết người: **ponzi** (yield từ tiền người mới), **hyperinflation** (emission > sink), **farm-and-dump** (thưởng không ràng buộc).

> **Bài tiếp theo:** đi vào **governance on-chain** — cách biến token biểu quyết thành DAO vận hành thực sự: proposal, quorum, timelock và các tấn công quản trị.
