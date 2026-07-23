# Bài 3 — Mật mã khóa công khai & chữ ký số

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân biệt **mật mã đối xứng** vs **khóa công khai (asymmetric)** và hiểu vì sao blockchain cần cái sau.
- Giải thích cặp **private key / public key**, và **địa chỉ ví** được suy ra từ đâu.
- Hiểu **đường cong elliptic secp256k1** ở mức trực giác — vì sao "một chiều" và vì sao an toàn.
- Đọc hiểu quy trình **ký (sign)** và **kiểm (verify)** một giao dịch bằng **ECDSA**.
- Trả lời dứt điểm: **vì sao verify chữ ký không bao giờ làm lộ private key**.
- So sánh **ECDSA vs EdDSA** và **ECC vs RSA** — biết mỗi thứ dùng ở đâu.

---

## 2. Lý thuyết

### 2.1 Analogy — cái hộp thư có hai chìa

Mật mã **đối xứng** (AES) như một **ổ khóa một chìa**: cùng một chìa khóa vừa khóa vừa mở. Vấn đề: muốn ai đó gửi thư cho bạn, bạn phải đưa họ chìa — mà đưa chìa qua mạng thì ai chặn được cũng có chìa. Với một mạng mở như Bitcoin (hàng triệu người lạ, không tin nhau), phát chìa chung là bất khả.

Mật mã **khóa công khai** giải bằng **hai chìa khác nhau nhưng liên kết toán học**:
- **Public key** — như **địa chỉ hộp thư** dán ngoài đường: ai cũng thấy được, dùng để **nhận** và để **kiểm chứng** bạn là chủ.
- **Private key** — **chìa mở hộp** giữ kín tuyệt đối: chỉ chủ mới có, dùng để **ký** (chứng minh quyền sở hữu).

Điều kỳ diệu: từ private key **suy ra được** public key **rất dễ**, nhưng từ public key **quay ngược** về private key thì **bất khả về mặt tính toán**. Đó là một **hàm một chiều có cửa sập** (trapdoor one-way function). Toàn bộ quyền sở hữu trên blockchain đứng trên tính chất này.

> Trên blockchain **không có "mật khẩu tài khoản" nào lưu ở đâu cả**. "Sở hữu coin" = **biết private key** có thể tạo ra chữ ký hợp lệ. Mất private key = mất coin vĩnh viễn; lộ private key = mất coin ngay lập tức. Không có nút "quên mật khẩu".

### 2.2 Một chiều: private → public → address

Trong Bitcoin/Ethereum, chuỗi suy dẫn chỉ đi **một hướng**, không đảo ngược được:

<svg viewBox="0 0 720 150" role="img" aria-labelledby="kd-t kd-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="kd-t">Suy dẫn từ private key tới address</title>
<desc id="kd-d">Private key qua phép nhân đường cong elliptic ra public key, rồi qua hash ra address, mỗi mũi tên chỉ đi một chiều</desc>
<rect x="20" y="45" width="150" height="60" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="70" text-anchor="middle" font-size="13" fill="currentColor">Private key</text>
<text x="95" y="90" text-anchor="middle" font-size="11" fill="currentColor">256-bit bí mật</text>
<rect x="280" y="45" width="150" height="60" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="355" y="70" text-anchor="middle" font-size="13" fill="currentColor">Public key</text>
<text x="355" y="90" text-anchor="middle" font-size="11" fill="currentColor">điểm trên đường cong</text>
<rect x="545" y="45" width="150" height="60" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="620" y="70" text-anchor="middle" font-size="13" fill="currentColor">Address</text>
<text x="620" y="90" text-anchor="middle" font-size="11" fill="currentColor">hash rút gọn</text>
<line x1="170" y1="75" x2="278" y2="75" stroke="currentColor" stroke-width="1.5" marker-end="url(#ka)"/>
<text x="224" y="40" text-anchor="middle" font-size="11" fill="currentColor">k·G (ECC)</text>
<text x="224" y="98" text-anchor="middle" font-size="10" fill="#f43f5e">không đảo ngược</text>
<line x1="430" y1="75" x2="543" y2="75" stroke="currentColor" stroke-width="1.5" marker-end="url(#ka)"/>
<text x="487" y="40" text-anchor="middle" font-size="11" fill="currentColor">hash</text>
<text x="487" y="98" text-anchor="middle" font-size="10" fill="#f43f5e">không đảo ngược</text>
<text x="360" y="135" text-anchor="middle" font-size="11" fill="currentColor">Public key/address công khai được — không ai suy ngược ra private key</text>
<defs><marker id="ka" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

- **Private key** thực chất chỉ là **một số nguyên 256-bit ngẫu nhiên** `k` (khoảng từ 1 tới ~1.16×10⁷⁷ — nhiều hơn số nguyên tử ước lượng trong vũ trụ quan sát được). Đoán trúng bằng brute-force là bất khả.
- **Public key** = `K = k · G`, với `G` là **điểm sinh (generator)** cố định của đường cong. Đây là **phép nhân điểm trên đường cong elliptic** — dễ tính xuôi, cực khó tính ngược.
- **Address** = băm public key lại cho gọn (Ethereum: `keccak256(K)` lấy 20 byte cuối; Bitcoin: `RIPEMD160(SHA256(K))`).

### 2.3 secp256k1 — đường cong elliptic của Bitcoin & Ethereum

Đường cong Bitcoin/Ethereum dùng có phương trình `y² = x³ + 7` (tham số chuẩn tên **secp256k1**), xét trên một trường hữu hạn khổng lồ (modulo một số nguyên tố `p` cỡ 256-bit). Đừng sợ công thức — ý tưởng chỉ có 3 điều:

1. **Cộng điểm**: trên đường cong định nghĩa được phép "cộng" hai điểm `P + Q` ra một điểm thứ ba, theo quy tắc hình học (kẻ đường thẳng, lấy giao, lật). Đây **không phải** cộng tọa độ thông thường.
2. **Nhân vô hướng**: `k · G` nghĩa là cộng `G` với chính nó `k` lần. Nhờ thuật toán "double-and-add", tính `k·G` chỉ mất ~256 bước dù `k` khổng lồ — **rất nhanh**.
3. **Bài toán logarit rời rạc (ECDLP)**: biết `G` và `K = k·G`, tìm lại `k` **không có** thuật toán nhanh nào — phải thử gần như toàn bộ không gian. Đây chính là "cửa sập": xuôi dễ, ngược bất khả.

> Vì sao chọn ECC thay vì RSA? Cùng mức an toàn, ECC dùng **khóa ngắn hơn nhiều**: một khóa **256-bit ECC** an toàn tương đương một khóa **~3072-bit RSA**. Khóa ngắn ⇒ chữ ký nhỏ, tính nhanh, tiết kiệm dung lượng on-chain — cực kỳ quan trọng khi mỗi byte đều tốn phí.

### 2.4 Ký & verify — trái tim của một giao dịch

Khi Alice gửi coin, ví của cô **không** gửi private key đi đâu cả. Nó làm hai việc: **băm** nội dung giao dịch thành một message hash `z`, rồi **ký** `z` bằng private key để tạo ra **chữ ký số**. Mạng dùng **public key** của Alice để **verify** chữ ký đó khớp với `z`.

<svg viewBox="0 0 720 340" role="img" aria-labelledby="sig-t sig-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="sig-t">Luồng ký và verify giao dịch</title>
<desc id="sig-d">Bên ký dùng private key tạo chữ ký từ hash giao dịch, gửi kèm transaction, bên verify dùng public key kiểm chữ ký mà không cần private key</desc>
<text x="180" y="24" text-anchor="middle" font-size="14" fill="currentColor">Alice (ký — có private key)</text>
<text x="545" y="24" text-anchor="middle" font-size="14" fill="currentColor">Mạng (verify — chỉ có public key)</text>
<line x1="360" y1="35" x2="360" y2="320" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<rect x="60" y="50" width="240" height="46" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="180" y="78" text-anchor="middle" font-size="12" fill="currentColor">1. Tx: "gửi 1 coin cho Bob"</text>
<rect x="60" y="112" width="240" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="180" y="132" text-anchor="middle" font-size="12" fill="currentColor">2. z = hash(Tx)</text>
<text x="180" y="150" text-anchor="middle" font-size="11" fill="currentColor">rút gọn Tx thành 256-bit</text>
<rect x="60" y="174" width="240" height="56" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="180" y="197" text-anchor="middle" font-size="12" fill="currentColor">3. sig = Sign(z, privKey)</text>
<text x="180" y="216" text-anchor="middle" font-size="11" fill="currentColor">tạo cặp (r, s)</text>
<line x1="180" y1="96" x2="180" y2="110" stroke="currentColor" stroke-width="1.2" marker-end="url(#sa)"/>
<line x1="180" y1="158" x2="180" y2="172" stroke="currentColor" stroke-width="1.2" marker-end="url(#sa)"/>
<rect x="60" y="250" width="240" height="56" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="180" y="273" text-anchor="middle" font-size="12" fill="currentColor">4. Broadcast: Tx + sig + pubKey</text>
<text x="180" y="292" text-anchor="middle" font-size="11" fill="#f43f5e">private key KHÔNG bao giờ rời máy</text>
<line x1="180" y1="230" x2="180" y2="248" stroke="currentColor" stroke-width="1.2" marker-end="url(#sa)"/>
<line x1="300" y1="278" x2="430" y2="200" stroke="currentColor" stroke-width="1.5" marker-end="url(#sa)"/>
<rect x="420" y="150" width="250" height="56" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="545" y="173" text-anchor="middle" font-size="12" fill="currentColor">5. Verify(z, sig, pubKey)</text>
<text x="545" y="192" text-anchor="middle" font-size="11" fill="currentColor">tính lại z từ Tx, so khớp</text>
<rect x="420" y="230" width="250" height="50" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="545" y="260" text-anchor="middle" font-size="12" fill="currentColor">6. Hợp lệ ⇒ nhận vào mempool</text>
<line x1="545" y1="206" x2="545" y2="228" stroke="currentColor" stroke-width="1.2" marker-end="url(#sa)"/>
<defs><marker id="sa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Chữ ký chứng minh **đồng thời hai điều** chỉ trong một cặp số nhỏ:
- **Authentication** — người ký thực sự nắm private key ứng với public key này (⇒ đúng chủ sở hữu).
- **Integrity** — nếu ai đó sửa dù chỉ 1 bit trong Tx (đổi "Bob" thành "Eve", đổi số tiền), `z` đổi hoàn toàn, chữ ký cũ **verify thất bại**. Không sửa lén được.

### 2.5 Vì sao verify KHÔNG bao giờ làm lộ private key?

Đây là câu hỏi trọng tâm hay bị hiểu sai. Trực giác: "muốn kiểm chữ ký chẳng phải cần chìa gốc sao?" — **Không.** Toán học được thiết kế **bất đối xứng có chủ đích**:

- **Sign** cần private key: chữ ký ECDSA là cặp `(r, s)` với `s = k⁻¹·(z + r·d) mod n`, trong đó `d` là **private key** (chính là số bí mật ta gọi `k` ở mục 2.2 — ký hiệu chuẩn của ECDSA đổi sang `d` cho khỏi lẫn), còn `k` ở đây là một **nonce** ngẫu nhiên bí mật **sinh mới mỗi lần ký** (và `r` suy từ `k·G`). Chỉ chủ private key mới tính được.
- **Verify** chỉ cần public key `K`: mạng làm vài phép nhân điểm trên đường cong với `(r, s)`, `z` và `K`, rồi kiểm một đẳng thức hình học có đúng không. **Không có phép nào trong verify chạm tới private key.**

Nói cách khác: chữ ký là **bằng chứng zero-knowledge kiểu nhẹ** — nó thuyết phục cả thế giới rằng "tôi biết private key" **mà không tiết lộ private key**. Bạn có thể phát cùng một public key cho hàng tỷ người, ký hàng triệu giao dịch, và không giao dịch nào rò rỉ một bit nào của `k`.

> ⚠️ **Cạm bẫy chí mạng — nonce phải thật sự ngẫu nhiên & không tái dùng.** Nếu ví dùng **lại cùng một nonce `k`** cho hai chữ ký khác nhau, kẻ tấn công **giải hệ hai phương trình** và **lấy được private key** ngay lập tức. Đây chính là lỗi từng làm crack ký PlayStation 3 (Sony dùng nonce cố định). Ví hiện đại dùng **RFC 6979** (nonce tất định, sinh từ chính message + private key) để triệt tiêu rủi ro này. Đây là lý do lớn khiến EdDSA được ưa chuộng — xem 2.7.

### 2.6 Ví dụ code — ký & verify bằng thư viện chuẩn

Ta minh họa toàn bộ vòng đời bằng `ethers.js` (chuẩn dev Ethereum). Cài `npm i ethers` rồi chạy `node sign.mjs`:

```javascript
// sign.mjs — tạo khóa, ký message, verify, và chứng minh không lộ private key
import { Wallet, verifyMessage } from "ethers";

// 1) Sinh ví ngẫu nhiên: private key 256-bit -> public key -> address
const wallet = Wallet.createRandom();
console.log("private key:", wallet.privateKey); // GIỮ KÍN tuyệt đối
console.log("public key :", wallet.signingKey.publicKey);
console.log("address    :", wallet.address);    // suy ra từ public key

// 2) Ký một "giao dịch" (ở đây là message tuỳ ý cho gọn)
const message = "Alice gui 1 coin cho Bob";
const signature = await wallet.signMessage(message); // dùng ECDSA/secp256k1
console.log("signature  :", signature); // 65 byte: r (32) + s (32) + v (1)

// 3) Bất kỳ ai cũng verify được — CHỈ cần chữ ký + message, KHÔNG cần private key
const recovered = verifyMessage(message, signature);
console.log("recovered address:", recovered);
console.log("hợp lệ & đúng chủ:", recovered === wallet.address); // true

// 4) Sửa 1 ký tự trong message -> verify ra address KHÁC -> phát hiện giả mạo
const tampered = verifyMessage("Alice gui 100 coin cho Bob", signature);
console.log("sau khi sửa nội dung, cùng chủ?", tampered === wallet.address); // false
```

Điểm mấu chốt trong code: hàm `verifyMessage` **chỉ nhận `message` và `signature`**, không bao giờ nhận private key — vậy mà vẫn khôi phục đúng address người ký. Đúng bản chất bất đối xứng ở 2.5. Trong Solidity, chính cơ chế này lộ ra qua opcode `ecrecover`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Kiểm chữ ký on-chain: khôi phục địa chỉ người ký từ (hash, v, r, s)
contract VerifySig {
    // ecrecover là precompile: trả về address người đã ký `hash`
    // KHÔNG cần private key — chỉ cần chữ ký. Bằng chứng bất đối xứng.
    function recoverSigner(bytes32 hash, uint8 v, bytes32 r, bytes32 s)
        public
        pure
        returns (address)
    {
        // Chuẩn EIP-191: gắn tiền tố để tránh ký nhầm giao dịch thật
        bytes32 ethHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );
        address signer = ecrecover(ethHash, v, r, s);
        require(signer != address(0), "chu ky khong hop le");
        return signer;
    }
}
```

`ecrecover` là nền tảng của meta-transaction, ví đa chữ ký (multisig), và permit token (EIP-2612) — tất cả đều dựa trên "verify không cần private key".

### 2.7 ECDSA vs EdDSA

Hai họ chữ ký đường cong elliptic thống trị blockchain hôm nay:

| Tiêu chí | **ECDSA** (secp256k1) | **EdDSA** (Ed25519) |
|----------|----------------------|---------------------|
| Đường cong | secp256k1 (`y²=x³+7`) | Curve25519 (Edwards) |
| Dùng ở | Bitcoin, Ethereum | Solana, Cardano, Monero, SSH, TLS |
| Nonce | Cần nonce ngẫu nhiên — **rủi ro nếu sai** | **Tất định** (sinh từ key+message) — không có lớp lỗi nonce |
| Tốc độ verify | Chậm hơn | Nhanh hơn, dễ batch-verify |
| Kháng side-channel | Khó làm đúng | Thiết kế sẵn để chống |
| Chuẩn hóa | Cũ, phổ biến rộng | Mới hơn, sạch hơn |

Trực giác: **EdDSA là bản thiết kế lại "sạch" của ý tưởng ECDSA** — loại bỏ hầu hết cạm bẫy triển khai (đặc biệt là nonce ở 2.5), nhanh và an toàn hơn theo mặc định. Bitcoin/Ethereum vẫn ở ECDSA chủ yếu vì lý do lịch sử và tương thích ngược; chuỗi mới thường chọn Ed25519.

### 2.8 ECC vs RSA — vì sao blockchain gần như luôn chọn ECC

| Tiêu chí | **RSA** | **ECC (secp256k1/Ed25519)** |
|----------|---------|------------------------------|
| Bài toán khó nền tảng | Phân tích thừa số nguyên tố | Logarit rời rạc trên đường cong (ECDLP) |
| Kích thước khóa cho ~128-bit an toàn | ~3072-bit | 256-bit |
| Kích thước chữ ký | Lớn (~384 byte) | Nhỏ (~64–65 byte) |
| Tốc độ sinh khóa / ký | Chậm | Nhanh |
| Chi phí on-chain | Cao (tốn byte, tốn gas) | Thấp |
| Ứng dụng điển hình | TLS/HTTPS cũ, chữ ký tài liệu | Blockchain, ví tiền số, SSH hiện đại |

Blockchain đo mọi thứ bằng **byte on-chain** và **gas**. Khóa & chữ ký ECC nhỏ hơn RSA cả chục lần ở cùng mức an toàn ⇒ ECC gần như là lựa chọn hiển nhiên. RSA vẫn phổ biến ngoài blockchain vì ra đời sớm và hạ tầng cũ đã gắn chặt với nó.

> **Lưu ý tương lai:** cả RSA lẫn ECC đều **dễ vỡ trước máy tính lượng tử** (thuật toán Shor phá cả phân tích thừa số lẫn ECDLP). Đó là lý do có nghiên cứu **post-quantum cryptography** — nhưng với phần cứng hiện tại, ECC vẫn an toàn thực tế.

---

## 3. Tình huống thực tế: chuyện gì xảy ra khi bạn bấm "Send" trong MetaMask

1. Bạn nhập "gửi 0.5 ETH cho 0xBob...", MetaMask dựng một **transaction object** (nonce tài khoản, gas, to, value, data).
2. Ví **serialize + băm** transaction thành `z` (một hash 256-bit).
3. Ví ký `z` bằng **private key nằm trong máy bạn** → tạo `(r, s, v)`. **Private key không rời thiết bị.**
4. Ví broadcast `transaction + chữ ký` ra mạng P2P.
5. Mỗi node **tự verify**: từ chữ ký + `z` khôi phục ra address; nếu khớp `from` và số dư đủ ⇒ giao dịch hợp lệ.
6. Không node nào — kể cả node đầu tiên nhận — **cần hay có** private key của bạn. Họ chỉ cần public key/address, thứ vốn công khai.

Đó là vì sao bạn có thể dùng cùng một ví trên chuỗi công khai mà cả thế giới nhìn thấy mọi giao dịch, nhưng **không ai giả mạo được** chữ ký của bạn.

---

## 4. Tóm tắt
- Blockchain đứng trên **mật mã khóa công khai**: private key giữ kín để **ký**, public key/address công khai để **nhận & verify**.
- Suy dẫn **private → public → address** là **một chiều** nhờ **phép nhân điểm trên đường cong elliptic secp256k1** và **hash** — không đảo ngược được (bài toán ECDLP).
- **Ký** cần private key; **verify** chỉ cần public key — nên kiểm chữ ký **không bao giờ làm lộ** private key. Chữ ký chứng minh đồng thời **đúng chủ** (authentication) và **không bị sửa** (integrity).
- **Cạm bẫy nonce**: tái dùng nonce trong ECDSA làm lộ private key — RFC 6979 và EdDSA sinh ra để chặn lỗi này.
- **ECDSA** (Bitcoin/Ethereum) vs **EdDSA** (Solana/Cardano): EdDSA là bản thiết kế sạch hơn, tất định, nhanh hơn.
- **ECC vs RSA**: cùng mức an toàn, ECC khóa & chữ ký nhỏ hơn cả chục lần ⇒ hợp với blockchain vốn tính từng byte, từng đơn vị gas.

> **Bài tiếp theo (Bài 4):** ghép mật mã và hash lại — **cấu trúc chuỗi block nối bằng hash**, thứ biến những giao dịch đã ký thành một sổ cái bất biến.
