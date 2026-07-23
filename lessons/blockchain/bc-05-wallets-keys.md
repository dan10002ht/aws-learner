# Bài 5 — Ví, khóa, địa chỉ & seed phrase

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích chuỗi biến đổi **private key → public key → address** và vì sao mỗi bước là **một chiều** (không thể đảo ngược).
- Hiểu **HD wallet** (BIP-32): từ một hạt giống duy nhất sinh ra vô hạn khóa theo **derivation path**.
- Đọc hiểu **seed phrase** (BIP-39) và **path chuẩn** BIP-44 (`m/44'/60'/0'/0/0`) — biết mỗi con số nghĩa là gì.
- Phân biệt **custodial vs non-custodial**, **hot vs cold wallet** — và chọn đúng theo mức rủi ro.
- Nắm nguyên tắc **an toàn khóa** và cơ chế **hardware wallet** ký giao dịch mà không lộ khóa.

---

## 2. Lý thuyết

### 2.1 Định nghĩa lại "ví" — ví KHÔNG chứa coin

Sai lầm phổ biến nhất: nghĩ ví (wallet) là cái "túi đựng tiền". **Không có coin nào nằm trong ví cả.** Coin/token chỉ là các con số ghi trên **sổ cái blockchain**. Cái ví của bạn thực chất chỉ giữ **chìa khóa mật mã** để chứng minh bạn có quyền chi tiêu những con số đó.

> **Ví = trình quản lý khóa (key manager).** Nó tạo, lưu, và dùng **private key** để **ký** giao dịch. Mất ví (mà còn seed phrase) → khôi phục được. Mất **seed phrase** → mất vĩnh viễn.

Analogy: private key giống **chữ ký + con dấu riêng** của bạn. Sổ cái (blockchain) là văn phòng công chứng công khai ai cũng đọc được. Ví là **cây bút** giữ con dấu đó. Ai cầm được con dấu thì ký được lệnh chuyển tiền — nên bảo vệ con dấu là bảo vệ tất cả.

### 2.2 Từ private key sang public key sang address

Đây là một **đường một chiều gồm ba bậc**, mỗi bậc dựa trên một phép toán không thể (thực tế) đảo ngược:

<svg viewBox="0 0 720 210" role="img" aria-labelledby="kp-t kp-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="kp-t">Chuỗi private key đến public key đến address</title>
<desc id="kp-d">Ba bước một chiều: private key qua đường cong elliptic thành public key, rồi qua hàm băm thành address</desc>
<rect x="10" y="70" width="150" height="70" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="85" y="100" text-anchor="middle" font-size="13" fill="currentColor">Private key</text>
<text x="85" y="120" text-anchor="middle" font-size="11" fill="currentColor">256-bit bí mật</text>
<rect x="285" y="70" width="150" height="70" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="100" text-anchor="middle" font-size="13" fill="currentColor">Public key</text>
<text x="360" y="120" text-anchor="middle" font-size="11" fill="currentColor">điểm trên đường cong</text>
<rect x="560" y="70" width="150" height="70" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="635" y="100" text-anchor="middle" font-size="13" fill="currentColor">Address</text>
<text x="635" y="120" text-anchor="middle" font-size="11" fill="currentColor">hash rút gọn</text>
<line x1="160" y1="105" x2="283" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#ka)"/>
<line x1="435" y1="105" x2="558" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#ka)"/>
<text x="221" y="60" text-anchor="middle" font-size="11" fill="#8b5cf6">ECC (secp256k1)</text>
<text x="221" y="95" text-anchor="middle" font-size="11" fill="currentColor">một chiều</text>
<text x="496" y="60" text-anchor="middle" font-size="11" fill="#8b5cf6">Keccak/SHA + RIPEMD</text>
<text x="496" y="95" text-anchor="middle" font-size="11" fill="currentColor">một chiều</text>
<text x="360" y="185" text-anchor="middle" font-size="11" fill="currentColor">Đi xuôi: dễ &amp; nhanh. Đi ngược (address → key): bất khả về mặt tính toán.</text>
<defs><marker id="ka" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Bậc 1 — Private key → Public key (mật mã đường cong elliptic).**
Private key chỉ là **một số nguyên 256-bit** chọn ngẫu nhiên (khoảng `2^256` khả năng — nhiều hơn số nguyên tử trong vũ trụ quan sát được, nên đoán mò là vô vọng). Public key = private key nhân với **điểm sinh G** trên đường cong `secp256k1`: `PubKey = privKey · G`. Phép nhân điểm elliptic dễ tính xuôi nhưng **không có cách khả thi để chia ngược** (bài toán logarit rời rạc) — đây là lý do public key công khai được mà không lộ private key.

**Bậc 2 — Public key → Address (hashing).**
Address ngắn hơn public key và có thêm lớp bảo vệ nhờ **hàm băm một chiều**:
- **Ethereum**: lấy public key (bỏ byte tiền tố), băm `Keccak-256`, giữ **20 byte cuối** → thêm tiền tố `0x`. Ví dụ `0x71C7656EC7ab88b098defB751B7401B5f6d8976F`.
- **Bitcoin (P2PKH)**: `SHA-256` rồi `RIPEMD-160` public key (gọi là HASH160), thêm version byte + **checksum** (Base58Check) → `1A1zP1eP...`.

Vì sao băm public key thay vì dùng thẳng? (a) address gọn hơn, (b) thêm một lớp một chiều — kể cả nếu ngày nào đó ECC bị đe dọa (máy tính lượng tử), address chưa từng chi tiêu vẫn còn được che sau lớp hash.

### 2.3 Ký giao dịch — dùng khóa mà không lộ khóa

Khi bạn "chuyển tiền", ví **không gửi private key đi đâu cả**. Nó dùng private key để tạo một **chữ ký số (ECDSA)** trên nội dung giao dịch. Bất kỳ node nào cũng có thể lấy **public key/address** để **kiểm tra** chữ ký hợp lệ — chứng minh "người này biết private key" mà **không cần biết** private key. Đây chính là nền tảng của quyền sở hữu trong blockchain (đã học ở Bài 3 về chữ ký số).

---

## 3. HD Wallet — một hạt giống, vô hạn khóa

### 3.1 Vấn đề của ví "một khóa"

Ví thời sơ khai tạo private key rời rạc, ngẫu nhiên. Muốn 100 địa chỉ → phải sao lưu 100 khóa. Rối và dễ mất. **HD wallet (Hierarchical Deterministic)** giải bài này: từ **một hạt giống (seed) duy nhất** sinh ra một **cây khóa** theo quy tắc xác định — sao lưu **một lần** là đủ khôi phục **toàn bộ** cây.

### 3.2 Ba chuẩn ghép lại: BIP-39, BIP-32, BIP-44

<svg viewBox="0 0 720 260" role="img" aria-labelledby="hd-t hd-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="hd-t">Luồng từ seed phrase đến các address theo BIP-39/32/44</title>
<desc id="hd-d">Mnemonic sinh ra seed, seed sinh master key, derivation path sinh ra các address con</desc>
<rect x="20" y="20" width="200" height="60" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="45" text-anchor="middle" font-size="13" fill="currentColor">12/24 từ (BIP-39)</text>
<text x="120" y="65" text-anchor="middle" font-size="11" fill="currentColor">mnemonic seed phrase</text>
<rect x="20" y="110" width="200" height="55" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="135" text-anchor="middle" font-size="12" fill="currentColor">Seed 512-bit</text>
<text x="120" y="153" text-anchor="middle" font-size="11" fill="currentColor">PBKDF2(mnemonic+passphrase)</text>
<rect x="20" y="195" width="200" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="225" text-anchor="middle" font-size="12" fill="currentColor">Master key (BIP-32)</text>
<line x1="120" y1="80" x2="120" y2="108" stroke="currentColor" stroke-width="1.5" marker-end="url(#ha)"/>
<line x1="120" y1="165" x2="120" y2="193" stroke="currentColor" stroke-width="1.5" marker-end="url(#ha)"/>
<line x1="220" y1="220" x2="300" y2="220" stroke="currentColor" stroke-width="1.5" marker-end="url(#ha)"/>
<rect x="300" y="30" width="400" height="215" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="500" y="52" text-anchor="middle" font-size="12" fill="currentColor">Derivation path (BIP-44)</text>
<text x="500" y="78" text-anchor="middle" font-size="12" fill="currentColor">m / 44' / 60' / 0' / 0 / 0</text>
<text x="500" y="102" text-anchor="middle" font-size="10" fill="currentColor">purpose · coin · account · change · index</text>
<rect x="330" y="120" width="100" height="42" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="380" y="146" text-anchor="middle" font-size="11" fill="currentColor">address #0</text>
<rect x="450" y="120" width="100" height="42" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="500" y="146" text-anchor="middle" font-size="11" fill="currentColor">address #1</text>
<rect x="570" y="120" width="100" height="42" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="620" y="146" text-anchor="middle" font-size="11" fill="currentColor">address #2</text>
<text x="500" y="200" text-anchor="middle" font-size="11" fill="currentColor">Cùng seed → luôn cho cùng bộ address</text>
<text x="500" y="222" text-anchor="middle" font-size="11" fill="currentColor">→ sao lưu 1 lần, khôi phục tất cả</text>
<defs><marker id="ha" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**BIP-39 — Mnemonic seed phrase (thứ con người đọc được).**
Máy tạo **entropy** ngẫu nhiên (128–256 bit), thêm **checksum**, rồi cắt thành các nhóm 11 bit, mỗi nhóm ánh xạ vào **một từ** trong **danh sách 2048 từ** cố định. Kết quả là **12 từ** (128-bit) hoặc **24 từ** (256-bit) như:

```
army van defense carry jealous true garbage claim echo media make crunch
```

- Từ được chọn từ wordlist chuẩn hóa để dễ đọc, khó nhầm; 4 ký tự đầu là đủ phân biệt.
- Từ cuối chứa **checksum** — chép sai một từ thường bị ví báo "invalid mnemonic" ngay.
- Seed phrase = **bản sao lưu toàn bộ tài sản**. Ai đọc được 12 từ này thì lấy sạch ví của bạn.

**Từ mnemonic ra seed nhị phân:** đưa mnemonic (và một **passphrase** tùy chọn, còn gọi là "từ thứ 25") qua hàm **PBKDF2** (2048 vòng HMAC-SHA512) → **seed 512-bit**. Passphrase tạo ra một cây khóa **hoàn toàn khác** — có 12 từ mà không có passphrase vẫn không mở được ví (một dạng "ẩn ví").

**BIP-32 — Cây khóa xác định.**
Từ seed 512-bit, HMAC-SHA512 sinh ra **master private key** + **chain code**. Từ node cha, hàm **CKD (Child Key Derivation)** đẻ ra vô hạn node con, con lại đẻ cháu — thành một **cây**. "Deterministic" nghĩa là cùng seed **luôn** cho cùng cây; "Hierarchical" là cấu trúc cây nhiều tầng.
- **Hardened derivation** (ký hiệu dấu phẩy `'` hoặc `h`): dùng private key của cha để derive → an toàn hơn, không thể tính ngược từ khóa con lộ ra khóa cha.
- **Non-hardened**: cho phép sinh **public key con** từ public key cha mà không cần private key (tiện cho watch-only wallet nhận tiền), nhưng đánh đổi bảo mật nếu lộ chain code + một child private key.

**BIP-44 — Quy ước đặt tên đường dẫn (path).**
Chuẩn hóa 5 tầng để mọi ví hiểu nhau:

```
m / purpose' / coin_type' / account' / change / address_index
m /   44'    /    60'     /    0'    /   0    /      0
```

| Tầng | Giá trị ví dụ | Ý nghĩa |
|------|---------------|---------|
| `purpose'` | `44'` | Theo chuẩn BIP-44 (còn 49' cho SegWit, 84' cho native SegWit BIP-84) |
| `coin_type'` | `60'` = Ethereum, `0'` = Bitcoin | Loại coin (đăng ký trong SLIP-0044) |
| `account'` | `0'` | Tài khoản logic — tách "ví tiết kiệm" và "ví tiêu vặt" |
| `change` | `0` nhận / `1` tiền thối | Với Bitcoin: chuỗi external vs internal (change) |
| `address_index` | `0, 1, 2, ...` | Địa chỉ thứ mấy — tăng dần mỗi lần cần address mới |

Đây là lý do vì sao bạn **nhập 12 từ vào MetaMask hay Ledger đều ra cùng địa chỉ**: tất cả cùng đi theo path chuẩn `m/44'/60'/0'/0/0`.

### 3.3 Ví dụ code — tự derive khóa từ mnemonic (Node.js, ethers v6)

```javascript
// npm i ethers
import { Mnemonic, HDNodeWallet } from "ethers";

// 1) Tạo (hoặc nhập) mnemonic 12 từ theo BIP-39
const phrase = "test test test test test test test test test test test junk";
const mnemonic = Mnemonic.fromPhrase(phrase);

// 2) Từ seed dựng master node (BIP-32) rồi derive theo path BIP-44
const account0 = HDNodeWallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0/0");
const account1 = HDNodeWallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0/1");

console.log(account0.address);    // 0x... địa chỉ index 0
console.log(account0.privateKey); // private key tương ứng (GIỮ BÍ MẬT)
console.log(account1.address);    // 0x... địa chỉ index 1 — khác account0

// 3) Ký một message: chứng minh sở hữu mà không lộ private key
const sig = await account0.signMessage("hello blockchain");
console.log(sig); // chữ ký ECDSA, verify được bằng address
```

Chạy đoạn này trên bất kỳ máy nào với **cùng mnemonic** đều cho **y hệt** các address — đó chính là tính "deterministic". Lưu ý: mnemonic `test...junk` ở trên là seed mặc định công khai của Hardhat/Anvil — **chỉ dùng để test local**, tuyệt đối không gửi tiền thật vào.

---

## 4. Phân loại ví theo quyền kiểm soát khóa

### 4.1 Custodial vs Non-custodial — "Not your keys, not your coins"

| | **Custodial** | **Non-custodial** |
|---|---------------|-------------------|
| **Ai giữ private key** | Bên thứ ba (sàn, ví lưu ký) | **Chính bạn** |
| **Ví dụ** | Tài khoản trên Binance, Coinbase | MetaMask, Ledger, Rabby |
| **Đăng nhập** | Email + mật khẩu, khôi phục được | Seed phrase, mất là mất luôn |
| **Rủi ro** | Sàn phá sản/hack/đóng băng (FTX, Mt.Gox) | Tự bảo quản seed, sai lầm là của bạn |
| **Ưu điểm** | Tiện, hỗ trợ khôi phục, hợp cho người mới | Chủ quyền tuyệt đối, không ai đóng băng được |

Câu châm ngôn kinh điển: **"Not your keys, not your coins."** Nếu bạn không giữ private key, về mặt kỹ thuật bạn chỉ đang có một **lời hứa (IOU)** từ sàn rằng họ nợ bạn số coin đó — như tiền gửi ngân hàng. Sàn sập thì lời hứa cũng sập (bài học FTX 2022).

### 4.2 Hot vs Cold — khóa có nối mạng hay không

<svg viewBox="0 0 720 250" role="img" aria-labelledby="hc-t hc-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="hc-t">Hot wallet so với cold wallet</title>
<desc id="hc-d">Hot wallet giữ khóa online tiện nhưng rủi ro; cold wallet giữ khóa offline an toàn nhưng bất tiện</desc>
<rect x="30" y="40" width="300" height="170" rx="10" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="180" y="68" text-anchor="middle" font-size="14" fill="currentColor">Hot wallet (online)</text>
<text x="180" y="98" text-anchor="middle" font-size="12" fill="currentColor">Khóa nằm trên thiết bị nối mạng</text>
<text x="180" y="122" text-anchor="middle" font-size="12" fill="currentColor">MetaMask, ví trên điện thoại</text>
<text x="180" y="152" text-anchor="middle" font-size="11" fill="currentColor">✓ Tiện, giao dịch nhanh</text>
<text x="180" y="174" text-anchor="middle" font-size="11" fill="currentColor">✗ Bề mặt tấn công lớn (malware, phishing)</text>
<text x="180" y="196" text-anchor="middle" font-size="11" fill="currentColor">→ giữ số nhỏ, chi tiêu hằng ngày</text>
<rect x="390" y="40" width="300" height="170" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="540" y="68" text-anchor="middle" font-size="14" fill="currentColor">Cold wallet (offline)</text>
<text x="540" y="98" text-anchor="middle" font-size="12" fill="currentColor">Khóa không bao giờ chạm internet</text>
<text x="540" y="122" text-anchor="middle" font-size="12" fill="currentColor">Ledger, Trezor, paper/air-gapped</text>
<text x="540" y="152" text-anchor="middle" font-size="11" fill="currentColor">✓ Chống hack từ xa</text>
<text x="540" y="174" text-anchor="middle" font-size="11" fill="currentColor">✗ Bất tiện hơn khi giao dịch</text>
<text x="540" y="196" text-anchor="middle" font-size="11" fill="currentColor">→ giữ phần lớn tài sản, dài hạn</text>
<text x="360" y="235" text-anchor="middle" font-size="11" fill="currentColor">Chiến lược thực chiến: kết hợp cả hai — ví hot để tiêu, ví cold làm "két sắt"</text>
</svg>

- **Hot wallet**: private key nằm trên thiết bị **có kết nối internet** (app điện thoại, extension trình duyệt). Tiện, hợp cho DeFi/giao dịch thường xuyên nhưng phơi nhiễm malware, phishing.
- **Cold wallet**: private key được giữ **offline hoàn toàn** — hardware wallet, máy air-gapped, hoặc paper wallet. An toàn cao nhất trước tấn công từ xa, dùng để trữ dài hạn.

**Custodial/non-custodial** trả lời câu hỏi *ai* giữ khóa; **hot/cold** trả lời câu hỏi khóa *có online hay không*. Đây là hai trục độc lập.

---

## 5. Hardware wallet & an toàn khóa

### 5.1 Hardware wallet ký giao dịch thế nào

Điểm cốt lõi: **private key sinh ra và sống trọn đời bên trong con chip an toàn (Secure Element)**, **không bao giờ rời khỏi thiết bị**. Luồng ký:

1. Máy tính/điện thoại dựng giao dịch chưa ký, gửi qua USB/Bluetooth cho hardware wallet.
2. Thiết bị **hiển thị chi tiết** (địa chỉ nhận, số tiền) lên màn hình riêng của nó để bạn xác nhận vật lý bằng nút bấm.
3. Chip ký **bên trong**, chỉ trả về **chữ ký** — private key vẫn nằm im trong chip.
4. Máy tính phát chữ ký + giao dịch lên mạng.

Kể cả khi máy tính của bạn **đã dính malware**, kẻ tấn công không lấy được private key và không thể ký thay bạn (vì phải bấm nút xác nhận trên thiết bị). Đó là lý do hardware wallet là tiêu chuẩn vàng để tự lưu ký.

> **Bẫy thực tế:** phải **đọc kỹ màn hình thiết bị** trước khi bấm xác nhận. Malware kiểu "address poisoning"/clipboard-swap có thể tráo địa chỉ nhận — màn hình hardware wallet là chốt kiểm tra cuối cùng và đáng tin cậy nhất.

### 5.2 Nguyên tắc an toàn khóa (checklist thực chiến)

- **Seed phrase là tất cả.** Ghi ra **giấy hoặc thép** (chống cháy/nước), cất **offline**, tốt nhất nhiều bản ở nhiều nơi. **Không** chụp ảnh, **không** lưu vào Google Drive/iCloud/ghi chú/email — đó là cách mất tiền phổ biến nhất.
- **Không bao giờ gõ seed phrase lên website.** Ví thật **không đời nào** hỏi 12 từ để "xác minh". 100% các trang hỏi seed phrase là **lừa đảo (phishing)**.
- **Không ai cần seed phrase của bạn** — không support, không admin, không "nhân viên sàn". Ai hỏi = lừa đảo.
- **Dùng passphrase (từ thứ 25)** cho khoản lớn: kể cả seed 24 từ bị lộ, không có passphrase vẫn không mở được ví.
- **Phân tầng theo giá trị:** ví hot giữ số nhỏ để tiêu; ví cold (hardware) giữ phần lớn tài sản.
- **Cảnh giác chữ ký & approve.** Trong DeFi, ký một message `approve` có thể trao quyền rút token cho smart contract độc hại — đọc kỹ trước khi ký, thu hồi (revoke) các approval cũ.
- **Multisig cho số tiền rất lớn** (ví dụ Gnosis Safe 2/3): cần nhiều khóa mới chi được, một khóa lộ vẫn an toàn.
- **Mua hardware wallet trực tiếp từ hãng**, không mua đồ cũ/lạ — tránh thiết bị bị cài sẵn seed.

---

## 6. Tóm tắt
- **Ví không chứa coin** — nó quản lý **private key** để ký giao dịch; coin nằm trên sổ cái.
- **Private key → public key** (nhân điểm trên `secp256k1`, một chiều) **→ address** (băm Keccak/SHA+RIPEMD, một chiều nữa).
- **HD wallet**: BIP-39 tạo **mnemonic** người-đọc-được → seed 512-bit; BIP-32 dựng **cây khóa** xác định; BIP-44 chuẩn hóa **derivation path** `m/44'/coin'/account'/change/index`.
- **Custodial vs non-custodial** = *ai* giữ khóa; **hot vs cold** = khóa có *online* hay không — hai trục độc lập. "Not your keys, not your coins."
- **Hardware wallet** giữ khóa trong Secure Element, chỉ trả chữ ký ra ngoài — chống hack cả khi máy tính nhiễm mã độc.
- **Seed phrase = toàn bộ tài sản**: cất offline, không bao giờ gõ lên web, không ai được hỏi.

> **Bài tiếp theo (Bài 6):** cách một **transaction** được cấu tạo, ký và phát tán — nonce, gas, và vòng đời từ mempool đến khi được confirm.
