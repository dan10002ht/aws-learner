# Bài 7 — Proof of Work: mining, difficulty, nonce

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **Proof of Work (PoW)** là gì và tại sao nó biến "tin tưởng" thành **chi phí năng lượng có thể kiểm chứng**.
- Mô tả chính xác việc **mining**: tìm **nonce** sao cho `hash(block header) < target`.
- Hiểu quan hệ **difficulty ↔ target ↔ hashrate ↔ block time**, và cơ chế **difficulty adjustment** giữ block time ổn định.
- Phân tích **tấn công 51%**, ranh giới an toàn của Nakamoto consensus và quy tắc **longest (heaviest) chain**.
- Đánh giá **chi phí năng lượng** của PoW một cách trung thực — không tô hồng, không bôi đen.

---

## 2. Lý thuyết

### 2.1 Analogy — cuộc thi giải ô chữ để giành quyền ghi sổ

Nhớ lại bài 1: cả làng cùng giữ một cuốn sổ. Nhưng **ai được quyền viết trang tiếp theo**? Nếu ai cũng viết tự do, sẽ có nhiều phiên bản mâu thuẫn (chính là double-spending trở lại).

PoW giải bằng một **cuộc thi tốn sức**: muốn ghi block tiếp theo, bạn phải giải một câu đố mà **lời giải rất khó tìm nhưng cực dễ kiểm tra** — như câu đố Sudoku cực lớn: bịa ra thì mất hàng giờ, nhưng người khác chỉ liếc mắt là biết đúng/sai. Ai giải xong trước được quyền ghi block và nhận thưởng.

Điểm cốt lõi: **công sức là thật, tiêu tốn điện thật.** Không thể "giả vờ" đã làm việc. Vì vậy để viết lại lịch sử, kẻ tấn công phải **làm lại toàn bộ công sức** đã bỏ ra — đó là thứ khiến quá khứ trở nên bất biến.

> **Bản chất PoW**: đổi **năng lượng điện + phần cứng** lấy **quyền đề xuất block** và lấy **tính bất biến** của lịch sử. An ninh của chain = tổng công sức đã tích luỹ, đo bằng vật lý, không đo bằng lời hứa.

### 2.2 Câu đố mining thực chất là gì

Mỗi block có một **block header** (~80 byte ở Bitcoin) gồm các trường:

| Trường | Ý nghĩa |
|--------|---------|
| `version` | Phiên bản luật |
| `prevBlockHash` | Hash block trước → nối chain (bài 4) |
| `merkleRoot` | Gốc cây Merkle của mọi giao dịch trong block (bài 2) |
| `timestamp` | Thời điểm |
| `bits` | Dạng nén của **target** hiện tại |
| `nonce` | Con số 32-bit **được phép đổi tự do** |

Miner tính `H = SHA256(SHA256(header))` và cần:

```
H (đọc như số 256-bit)  <  target
```

Vì SHA-256 là hàm băm mật mã, **thay đổi 1 bit** ở input → output đảo lộn hoàn toàn (avalanche, bài 2). Không có cách nào "suy ngược" ra nonce; chỉ còn cách **thử vét cạn**: đổi nonce, băm, so sánh, lặp lại. Đây là bản chất "work" — hàng tỉ tỉ phép băm mỗi giây.

`target` càng nhỏ → cửa lọt càng hẹp → càng cần nhiều lần thử. `target` thường được diễn đạt qua **số bit 0 đứng đầu** của hash: "hash phải bắt đầu bằng N số 0".

<svg viewBox="0 0 700 300" role="img" aria-labelledby="mine-t mine-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="mine-t">Vòng lặp mining tìm nonce</title>
<desc id="mine-d">Miner đổi nonce, băm header hai lần bằng SHA-256, so sánh với target, lặp lại cho tới khi hash nhỏ hơn target</desc>
<rect x="30" y="120" width="130" height="60" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="146" text-anchor="middle" font-size="13" fill="currentColor">Header</text>
<text x="95" y="165" text-anchor="middle" font-size="12" fill="currentColor">+ nonce</text>
<rect x="240" y="120" width="150" height="60" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="315" y="146" text-anchor="middle" font-size="13" fill="currentColor">SHA256(SHA256(·))</text>
<text x="315" y="165" text-anchor="middle" font-size="11" fill="currentColor">= H (256-bit)</text>
<rect x="470" y="120" width="200" height="60" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="570" y="146" text-anchor="middle" font-size="13" fill="currentColor">H &lt; target ?</text>
<text x="570" y="165" text-anchor="middle" font-size="11" fill="currentColor">so sánh số học</text>
<line x1="160" y1="150" x2="238" y2="150" stroke="currentColor" stroke-width="1.5" marker-end="url(#am)"/>
<line x1="390" y1="150" x2="468" y2="150" stroke="currentColor" stroke-width="1.5" marker-end="url(#am)"/>
<path d="M570 180 L570 250 L95 250 L95 182" fill="none" stroke="#f43f5e" stroke-width="1.5" marker-end="url(#am)"/>
<text x="330" y="245" text-anchor="middle" font-size="12" fill="#f43f5e">Không → nonce += 1, thử lại (hàng tỉ lần/giây)</text>
<line x1="570" y1="120" x2="570" y2="70" stroke="#10b981" stroke-width="1.5" marker-end="url(#am)"/>
<text x="570" y="55" text-anchor="middle" font-size="12" fill="#10b981">Có → block hợp lệ, broadcast!</text>
<defs><marker id="am" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.3 Minh hoạ mining bằng code

Đoạn Python dưới đây là **PoW thu nhỏ** đúng tinh thần Bitcoin (băm đôi SHA-256), dùng "số 0 hex đứng đầu" làm difficulty cho dễ nhìn:

```python
import hashlib, time

def double_sha256(data: bytes) -> bytes:
    return hashlib.sha256(hashlib.sha256(data).digest()).digest()

def mine(header_wo_nonce: str, difficulty_bits: int):
    """Tìm nonce sao cho hash < target.
    target = 2^(256 - difficulty_bits): càng nhiều bit '0' đầu càng khó."""
    target = 1 << (256 - difficulty_bits)      # ngưỡng số học
    nonce = 0
    t0 = time.time()
    while True:
        data = f"{header_wo_nonce}{nonce}".encode()
        h = double_sha256(data)
        if int.from_bytes(h, "big") < target:   # so sánh H < target
            dt = time.time() - t0
            print(f"Tìm thấy nonce={nonce} sau {nonce+1} lần thử, {dt:.2f}s")
            print(f"hash = {h.hex()}")           # sẽ có nhiều '0' đứng đầu
            return nonce, h.hex()
        nonce += 1

# Tăng difficulty_bits thêm 1 → trung bình phải thử GẤP ĐÔI số lần
mine("block#7|prev=00ab..|merkle=9f..|ts=1690000000|", difficulty_bits=20)
```

Quan sát quan trọng: mỗi lần **tăng `difficulty_bits` lên 1**, không gian "hash hợp lệ" bị **giảm một nửa**, nên số lần thử trung bình **tăng gấp đôi**. Difficulty tăng **theo cấp số nhân**, còn kiểm tra một lời giải thì luôn chỉ tốn **1 phép băm** — đây là tính bất đối xứng làm nên PoW.

### 2.4 Từ target → difficulty → hashrate → block time

Bốn đại lượng này gắn chặt nhau. Nắm công thức là hiểu toàn bộ kinh tế học PoW:

| Đại lượng | Định nghĩa | Đơn vị |
|-----------|-----------|--------|
| **target** | Ngưỡng: hash phải `<` số này | số 256-bit |
| **difficulty** | `difficulty_1_target / target` — độ khó so với block đầu tiên | không đơn vị |
| **hashrate** | Tổng số phép băm cả mạng làm được mỗi giây | H/s (nay tới **EH/s** = 10¹⁸) |
| **block time** | Thời gian trung bình ra 1 block | giây |

Kỳ vọng số lần băm để tìm 1 block:

```
Số hash trung bình cần  ≈  2^256 / target  =  difficulty × 2^32   (Bitcoin)

Block time trung bình   ≈  (difficulty × 2^32) / hashrate
```

Trực giác: hashrate **gấp đôi** mà difficulty giữ nguyên → block ra **nhanh gấp đôi**. Bitcoin muốn giữ block time **~10 phút bất kể hashrate**, nên phải **điều chỉnh difficulty**.

### 2.5 Difficulty adjustment — cơ chế tự cân bằng

Bitcoin nhắm block time trung bình **600 giây (10 phút)**. Cứ **2016 block** (đúng ~2 tuần nếu mọi thứ chuẩn), mạng nhìn lại thời gian thực tế đã trôi qua và chỉnh difficulty:

```
actual_time  = timestamp(block 2016) - timestamp(block 1)   # thời gian THỰC tế
expected_time = 2016 × 600 = 1_209_600 giây                  # nếu đúng 10'/block

new_difficulty = old_difficulty × (expected_time / actual_time)
# clamp: mỗi kỳ chỉ được đổi trong khoảng [1/4, 4] lần
```

Đọc công thức: nếu 2016 block vừa qua **ra nhanh hơn** dự kiến (hashrate tăng) → `actual < expected` → tỉ số `> 1` → **difficulty tăng** → kéo block time về lại 10 phút. Ngược lại nếu miner rời mạng (hashrate giảm), block ra chậm → difficulty **giảm**. Đây là một **vòng phản hồi âm (negative feedback loop)** giữ nhịp mạng ổn định suốt 15+ năm.

Hệ quả thực tế: giá coin tăng → mining có lãi → nhiều máy đào bật lên → hashrate tăng → difficulty tăng → cần máy hiệu quả hơn để có lãi. Difficulty vì thế phản ánh **sức khoẻ kinh tế** của mạng.

<svg viewBox="0 0 700 250" role="img" aria-labelledby="da-t da-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="da-t">Vòng phản hồi difficulty adjustment</title>
<desc id="da-d">Hashrate tăng làm block nhanh hơn, mạng tăng difficulty để kéo block time trở về mục tiêu 10 phút</desc>
<rect x="270" y="20" width="160" height="50" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="42" text-anchor="middle" font-size="13" fill="currentColor">Hashrate tăng</text>
<text x="350" y="60" text-anchor="middle" font-size="11" fill="currentColor">(thêm máy đào)</text>
<rect x="500" y="100" width="170" height="50" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="585" y="122" text-anchor="middle" font-size="12" fill="currentColor">Block ra nhanh hơn</text>
<text x="585" y="140" text-anchor="middle" font-size="11" fill="currentColor">&lt; 10 phút</text>
<rect x="270" y="180" width="160" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="202" text-anchor="middle" font-size="12" fill="currentColor">Difficulty tăng</text>
<text x="350" y="220" text-anchor="middle" font-size="11" fill="currentColor">(mỗi 2016 block)</text>
<rect x="30" y="100" width="170" height="50" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="122" text-anchor="middle" font-size="12" fill="currentColor">Block time về lại</text>
<text x="115" y="140" text-anchor="middle" font-size="11" fill="currentColor">~10 phút (mục tiêu)</text>
<path d="M430 55 Q520 70 560 98" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#ad)"/>
<path d="M560 150 Q470 190 432 200" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#ad)"/>
<path d="M270 205 Q160 190 130 152" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#ad)"/>
<path d="M130 100 Q220 70 268 52" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#ad)"/>
<defs><marker id="ad" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

---

## 3. Nakamoto consensus & longest chain

PoW mới chỉ quyết định **ai đề xuất block**. Nhưng mạng P2P có độ trễ: đôi khi **hai miner tìm được block gần như cùng lúc** → chain **phân nhánh (fork)**. Cần một luật để cả mạng hội tụ về **một** lịch sử.

**Luật của Nakamoto**: mỗi node luôn coi **chain có tổng công sức tích luỹ lớn nhất** là chain thật, và đào tiếp trên đó. Thường gọi là "longest chain", nhưng chính xác hơn là **heaviest chain** — chain có **tổng difficulty** cao nhất, không phải nhiều block nhất.

Khi có hai nhánh cạnh tranh:
1. Miner tiếp tục đào trên nhánh họ thấy trước.
2. Nhánh nào **tìm được block kế tiếp trước** sẽ dài (nặng) hơn.
3. Cả mạng lập tức chuyển sang nhánh nặng hơn; nhánh thua bị bỏ (**orphan/stale block**), các giao dịch trong đó quay lại mempool.

Vì vậy giao dịch **không "final" tức thì** — càng nhiều block xác nhận chồng lên, xác suất bị đảo ngược càng nhỏ theo cấp số nhân. Quy ước phổ biến: **6 confirmations** (~60 phút) coi như an toàn cho khoản lớn.

> **Probabilistic finality**: PoW không cho "chốt tuyệt đối" như một số cơ chế PoS/BFT. Nó cho **xác suất đảo ngược tiến về 0** khi số confirmation tăng. Đây là đánh đổi thiết kế, không phải khiếm khuyết.

---

## 4. Tấn công 51%

Nếu một thực thể kiểm soát **> 50% hashrate**, họ có thể **đào một nhánh bí mật nhanh hơn** phần còn lại của mạng, rồi tung ra để **vượt mặt** chain công khai — khiến các block cũ bị đảo (**chain reorganization**).

Kẻ tấn công 51% **có thể**:
- **Double-spend**: gửi coin cho sàn, rút hàng/tiền pháp định, rồi công bố nhánh không chứa giao dịch đó → coin quay về ví mình.
- **Kiểm duyệt** (censor) giao dịch của người khác trong nhánh của họ.

Kẻ tấn công 51% **KHÔNG thể**:
- Đánh cắp coin từ ví người khác (không có private key — bài 3).
- In coin ngoài luật phát hành (node khác từ chối block sai luật).
- Đảo ngược giao dịch đã có **rất nhiều** confirmation (chi phí đào lại tăng theo cấp số nhân).

Điểm mấu chốt về kinh tế: với Bitcoin, sở hữu >50% hashrate đòi hỏi **hàng chục tỉ USD phần cứng + điện**, và **tấn công thành công sẽ phá giá chính đồng coin** mà kẻ tấn công vừa tốn tiền để tấn công. PoW biến an ninh thành bài toán **chi phí > lợi ích**: honest mining sinh lời hơn phá hoại. Tuy nhiên các chain **hashrate thấp** (altcoin nhỏ) đã **thực sự bị tấn công 51%** nhiều lần — an ninh tỉ lệ thuận với hashrate, không phải với ý tưởng.

<svg viewBox="0 0 700 250" role="img" aria-labelledby="a51-t a51-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="a51-t">Tấn công 51% với nhánh bí mật</title>
<desc id="a51-d">Chain trung thực phía trên, kẻ tấn công đào nhánh riêng phía dưới rồi tung ra để vượt và đảo lịch sử</desc>
<text x="60" y="55" text-anchor="middle" font-size="12" fill="#10b981">Honest chain</text>
<rect x="120" y="35" width="55" height="35" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="205" y="35" width="55" height="35" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="290" y="35" width="55" height="35" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="375" y="35" width="55" height="35" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<line x1="175" y1="52" x2="205" y2="52" stroke="currentColor" stroke-width="1.2"/>
<line x1="260" y1="52" x2="290" y2="52" stroke="currentColor" stroke-width="1.2"/>
<line x1="345" y1="52" x2="375" y2="52" stroke="currentColor" stroke-width="1.2"/>
<rect x="35" y="35" width="70" height="35" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="70" y="57" text-anchor="middle" font-size="11" fill="currentColor">chung</text>
<line x1="105" y1="52" x2="120" y2="52" stroke="currentColor" stroke-width="1.2"/>
<line x1="70" y1="70" x2="70" y2="150" stroke="currentColor" stroke-width="1.2"/>
<text x="60" y="200" text-anchor="middle" font-size="12" fill="#f43f5e">Nhánh bí mật (&gt;50% hashrate)</text>
<rect x="120" y="150" width="55" height="35" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<rect x="205" y="150" width="55" height="35" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<rect x="290" y="150" width="55" height="35" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<rect x="375" y="150" width="55" height="35" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<rect x="460" y="150" width="55" height="35" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<line x1="70" y1="150" x2="120" y2="167" stroke="currentColor" stroke-width="1.2"/>
<line x1="175" y1="167" x2="205" y2="167" stroke="currentColor" stroke-width="1.2"/>
<line x1="260" y1="167" x2="290" y2="167" stroke="currentColor" stroke-width="1.2"/>
<line x1="345" y1="167" x2="375" y2="167" stroke="currentColor" stroke-width="1.2"/>
<line x1="430" y1="167" x2="460" y2="167" stroke="currentColor" stroke-width="1.2"/>
<text x="590" y="120" text-anchor="middle" font-size="11" fill="currentColor">Nhánh đỏ dài hơn →</text>
<text x="590" y="138" text-anchor="middle" font-size="11" fill="currentColor">mạng chuyển sang nó,</text>
<text x="590" y="156" text-anchor="middle" font-size="11" fill="currentColor">block xanh bị đảo</text>
</svg>

---

## 5. Chi phí năng lượng — nhìn thẳng

PoW **cố ý tốn năng lượng**: chính "sự tốn kém không thể giả mạo" là thứ mua lấy an ninh. Nhưng cái giá là thật:

- Mạng Bitcoin tiêu thụ cỡ **~100–150 TWh/năm** — ngang một quốc gia cỡ trung. Đây là dữ kiện, không nên chối.
- Phần lớn điện năng dồn vào **ASIC** (mạch chuyên dụng chỉ để băm SHA-256), khiến CPU/GPU thường không còn cạnh tranh nổi.

Các lập luận **phản biện** thường gặp (cần biết cả hai phía):
- Một tỉ lệ đáng kể mining dùng **điện dư/tái tạo** (thuỷ điện mùa lũ, khí đồng hành bị đốt bỏ) vì miner tìm nơi điện **rẻ nhất**.
- Năng lượng "mua" một tài sản có tính chất độc nhất: **an ninh khách quan, phi tập trung, không cần tin ai**.

Phản ứng của thị trường: **Ethereum đã bỏ PoW sang PoS (The Merge, 2022)**, giảm ~99.9% điện năng — chủ đề của **bài sau**. Việc lựa chọn PoW hay PoS là đánh đổi giữa **an ninh dựa-trên-vật-lý** và **hiệu quả năng lượng + finality nhanh**.

| Tiêu chí | Proof of Work | Proof of Stake (đối chiếu) |
|----------|---------------|----------------------------|
| Nguồn an ninh | Năng lượng + phần cứng | Vốn coin bị khoá (stake) |
| Chi phí tấn công | Mua >50% hashrate | Mua/khoá >⅓–⅔ stake |
| Năng lượng | Rất cao | Thấp |
| Finality | Xác suất (cần confirmations) | Nhanh, gần tuyệt đối (nhiều thiết kế) |
| Trừng phạt kẻ xấu | Gián tiếp (phí điện lãng phí) | Trực tiếp (slashing) |
| Ví dụ | Bitcoin, Litecoin, Monero | Ethereum, Cardano, Solana |

---

## 6. Tóm tắt
- **PoW = đổi năng lượng lấy quyền ghi block + tính bất biến**. Công sức là thật, đo bằng vật lý, không thể giả.
- **Mining** = vét cạn nonce để `SHA256(SHA256(header)) < target`; **khó tìm, dễ kiểm tra** là bất đối xứng cốt lõi.
- **difficulty ↔ target ↔ hashrate ↔ block time** gắn chặt; `block time ≈ difficulty × 2³² / hashrate`.
- **Difficulty adjustment** (Bitcoin: mỗi 2016 block) là vòng phản hồi âm giữ block time ~10 phút bất kể hashrate.
- **Nakamoto consensus** chọn **heaviest chain**; giao dịch có **probabilistic finality** — càng nhiều confirmation càng an toàn.
- **Tấn công 51%** cho phép double-spend/censor nhưng không trộm coin/in coin; an ninh tỉ lệ với **hashrate**, nên chain nhỏ dễ tổn thương.
- PoW **tốn năng lượng có chủ đích**; đó vừa là nguồn an ninh vừa là lý do nhiều chain chuyển sang PoS.

> **Bài tiếp theo (Bài 8):** **Proof of Stake & Nakamoto vs BFT consensus** — thay "đốt điện" bằng "khoá vốn", slashing, và finality nhanh; vì sao Ethereum chọn con đường này.
