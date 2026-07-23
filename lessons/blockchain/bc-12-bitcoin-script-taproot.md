# Bài 12 — Bitcoin Script, SegWit, Taproot

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **Bitcoin Script** là gì, vì sao nó **stack-based** và **không Turing-complete** — và tại sao đó là lựa chọn có chủ đích chứ không phải thiếu sót.
- Đọc hiểu cặp **locking script (scriptPubKey)** và **unlocking script (scriptSig)**, hình dung máy ảo chạy chúng như một stack.
- Phân biệt **P2PKH**, **P2SH**, **multisig** — biết mỗi khuôn (template) khoá coin theo điều kiện gì.
- Hiểu **SegWit**: witness được tách khỏi phần dữ liệu ký, sửa **transaction malleability**, và giảm phí thế nào.
- Nắm **Taproot** = **Schnorr signature** + **MAST** + **Pay-to-Taproot (P2TR)**: nâng cấp cả **privacy** lẫn **hiệu quả**.

---

## 2. Lý thuyết

### 2.1 Analogy — ổ khoá có câu đố, không phải chương trình

Mỗi UTXO (đồng coin chưa tiêu) ở Bài 11 không đơn thuần "thuộc về một địa chỉ". Chính xác hơn: nó bị **khoá bởi một câu đố**. Ai đưa ra **lời giải hợp lệ** thì được tiêu.

- **Locking script (scriptPubKey)** = ổ khoá gắn trên coin: "muốn mở, phải chứng minh bạn nắm private key của địa chỉ này".
- **Unlocking script (scriptSig)** = chìa khoá người tiêu đưa ra: chữ ký + public key.

Bitcoin **cố tình** không cho ổ khoá này là một chương trình đầy đủ (vòng lặp, gọi hàm tuỳ ý). Nó chỉ là một **danh sách câu đố đơn giản, chạy một chiều, dừng chắc chắn**. Đây là khác biệt triết học lớn với Ethereum (Bài 13+): Bitcoin ưu tiên **an toàn & dự đoán được** hơn là **biểu đạt được mọi thứ**.

### 2.2 Máy ảo stack-based

Bitcoin Script chạy trên một **máy ngăn xếp (stack machine)**: một chồng đĩa, chỉ thao tác ở **đỉnh**. Mỗi phần tử script hoặc là **dữ liệu** (đẩy lên stack) hoặc là **opcode** (lệnh lấy phần tử ra khỏi stack, tính toán, đẩy kết quả lại).

Không có biến, không con trỏ, không vòng lặp (`OP_*` không có nhảy ngược). Script chạy **tuyến tính từ trái sang phải**, kết thúc **hợp lệ** khi và chỉ khi trên đỉnh stack còn lại một giá trị **TRUE** (khác 0).

Ví dụ một câu đố cộng số: `2 3 OP_ADD 5 OP_EQUAL`

<svg viewBox="0 0 720 250" role="img" aria-labelledby="st-t st-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="st-t">Thực thi script trên stack</title>
<desc id="st-d">Bốn bước thực thi 2 3 OP_ADD 5 OP_EQUAL, mỗi bước hiển thị trạng thái ngăn xếp</desc>
<text x="70" y="24" text-anchor="middle" font-size="12" fill="currentColor">push 2</text>
<rect x="30" y="150" width="80" height="34" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="70" y="172" text-anchor="middle" font-size="13" fill="currentColor">2</text>
<text x="210" y="24" text-anchor="middle" font-size="12" fill="currentColor">push 3</text>
<rect x="170" y="150" width="80" height="34" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="210" y="172" text-anchor="middle" font-size="13" fill="currentColor">2</text>
<rect x="170" y="112" width="80" height="34" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="210" y="134" text-anchor="middle" font-size="13" fill="currentColor">3</text>
<text x="360" y="24" text-anchor="middle" font-size="12" fill="currentColor">OP_ADD</text>
<rect x="320" y="150" width="80" height="34" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="172" text-anchor="middle" font-size="13" fill="currentColor">5</text>
<text x="510" y="24" text-anchor="middle" font-size="12" fill="currentColor">push 5</text>
<rect x="470" y="150" width="80" height="34" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="510" y="172" text-anchor="middle" font-size="13" fill="currentColor">5</text>
<rect x="470" y="112" width="80" height="34" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="510" y="134" text-anchor="middle" font-size="13" fill="currentColor">5</text>
<text x="650" y="24" text-anchor="middle" font-size="12" fill="currentColor">OP_EQUAL</text>
<rect x="610" y="150" width="80" height="34" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="650" y="172" text-anchor="middle" font-size="13" fill="currentColor">TRUE</text>
<text x="360" y="230" text-anchor="middle" font-size="11" fill="currentColor">Kết thúc: đỉnh stack là TRUE → script hợp lệ, coin được tiêu</text>
</svg>

### 2.3 Vì sao KHÔNG Turing-complete — và đó là điểm mạnh

Một ngôn ngữ **Turing-complete** có thể vòng lặp vô hạn. Nếu Bitcoin Script như vậy, một node **không thể biết trước** một script sẽ chạy bao lâu — mở đường cho tấn công DoS (gửi giao dịch chạy mãi không dừng). Ethereum giải bằng **gas** (đo & tính phí từng bước, hết gas thì dừng). Bitcoin chọn con đường khác: **loại bỏ hẳn khả năng lặp**.

Hệ quả:
- Mọi script **đảm bảo dừng (halting)** — validate xong trong thời gian hữu hạn, dự đoán được.
- Bề mặt tấn công nhỏ, dễ kiểm chứng an toàn.
- Đổi lại: biểu đạt hạn chế — không viết được logic phức tạp tuỳ ý như smart contract Ethereum.

> Không Turing-complete **không phải là bug**. Đó là đánh đổi thiết kế: Bitcoin là **tiền tệ tối giản, an toàn cực đại**, không phải nền tảng ứng dụng tổng quát.

### 2.4 Opcode — các viên gạch

Vài opcode cốt lõi hay gặp:

| Opcode | Tác dụng |
|--------|----------|
| `OP_DUP` | Nhân đôi phần tử đỉnh stack |
| `OP_HASH160` | Băm phần tử đỉnh: SHA-256 rồi RIPEMD-160 |
| `OP_EQUALVERIFY` | Lấy 2 phần tử, so bằng; nếu khác → fail ngay |
| `OP_CHECKSIG` | Kiểm chữ ký với public key trên stack (đúng → TRUE) |
| `OP_CHECKMULTISIG` | Kiểm m chữ ký trên n public key |
| `OP_CHECKLOCKTIMEVERIFY` | Khoá coin đến một block-height/thời điểm (timelock) |

---

## 3. Các khuôn khoá coin: P2PKH, P2SH, Multisig

### 3.1 Cách máy ảo ghép hai script

Khi tiêu một UTXO, node **ghép** unlocking script (do người tiêu cung cấp) đứng trước, rồi tới locking script (đã ghi trong UTXO), và chạy toàn bộ trên **cùng một stack**:

```
[ scriptSig của người tiêu ]  +  [ scriptPubKey đã khoá coin ]
```

Coin được tiêu ⇔ chạy xong stack còn lại TRUE.

### 3.2 P2PKH — Pay to Public Key Hash

Khuôn phổ biến nhất cho địa chỉ "legacy" (bắt đầu bằng `1...`). Coin khoá theo **hash của public key**.

```
scriptPubKey (locking):  OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG
scriptSig    (unlocking): <signature> <pubKey>
```

Chạy ghép, từng bước trên stack:

1. Đẩy `<signature>`, `<pubKey>` lên stack (từ scriptSig).
2. `OP_DUP` → nhân đôi `<pubKey>`.
3. `OP_HASH160` → băm bản sao thành `pubKeyHash'`.
4. Đẩy `<pubKeyHash>` (từ locking script) lên.
5. `OP_EQUALVERIFY` → so `pubKeyHash'` với `pubKeyHash`; khác thì fail. Đây là bước xác nhận **public key khớp địa chỉ**.
6. `OP_CHECKSIG` → kiểm `<signature>` có ký đúng bằng private key của `<pubKey>` không. Đúng → TRUE.

Điểm tinh tế: địa chỉ Bitcoin **không phải** public key mà là **hash** của nó — public key chỉ lộ ra **khi tiêu**. Đây là một lớp bảo vệ (kể cả nếu ECDSA bị phá trong tương lai, coin chưa tiêu vẫn ẩn sau hash).

### 3.3 P2SH — Pay to Script Hash

Vấn đề của khoá phức tạp (ví dụ multisig 2/3): người **gửi** tiền phải viết cả script dài vào locking script — bất tiện và tốn phí cho người gửi. **P2SH** (địa chỉ bắt đầu `3...`) đảo trách nhiệm: người gửi chỉ cần khoá theo **hash của một script** (gọi là **redeemScript**); người **nhận** khi tiêu mới phải xuất trình redeemScript đầy đủ + dữ liệu thoả nó.

```
scriptPubKey:  OP_HASH160 <scriptHash> OP_EQUAL
scriptSig:     <...các chữ ký...> <redeemScript đã serialize>
```

Xác thực 2 pha: (1) băm redeemScript, so với `<scriptHash>`; (2) nếu khớp, **giải mã redeemScript rồi chạy tiếp** với các chữ ký. Nhờ vậy độ phức tạp — và **phí** — dồn về phía người tiêu, còn địa chỉ gửi luôn ngắn gọn dù logic bên trong phức tạp cỡ nào.

### 3.4 Multisig — m trên n

Multisig khoá coin cần **m trong số n** chữ ký mới tiêu được (ví dụ 2/3 cho quỹ công ty: cần 2 trong 3 giám đốc ký).

```
redeemScript:  OP_2 <pubKey1> <pubKey2> <pubKey3> OP_3 OP_CHECKMULTISIG
```

Thường được gói trong P2SH để địa chỉ gọn. Ứng dụng: ví chung, escrow (bên mua + bên bán + trọng tài, 2/3), quản trị quỹ.

> Lưu ý lịch sử: `OP_CHECKMULTISIG` có một bug tiêu tốn thêm một phần tử stack thừa — nên redeemScript multisig cổ điển thường bắt đầu bằng một `OP_0` giả ở scriptSig. Taproot về sau xoá bỏ hẳn phiền toái này.

---

## 4. SegWit — Segregated Witness (2017)

### 4.1 Bài toán transaction malleability

Trước SegWit, **chữ ký (witness) nằm ngay trong scriptSig**, và **txid = hash của toàn bộ giao dịch, gồm cả chữ ký**. Vấn đề: một chữ ký ECDSA có thể được **biến đổi hợp lệ** (ví dụ đổi dấu thành phần `s`) mà **vẫn đúng** — làm **thay đổi txid** dù nội dung kinh tế không đổi.

Đây là **transaction malleability**: kẻ thứ ba (hoặc chính người gửi) có thể "nắn" chữ ký, tạo ra một txid khác cho cùng giao dịch trước khi nó vào block. Hệ quả nghiêm trọng: bất kỳ hệ thống nào **tham chiếu tới txid của giao dịch chưa xác nhận** (ví dụ các kênh Lightning Network) đều gãy — đó là lý do Lightning gần như không khả thi trước SegWit.

### 4.2 Lời giải: tách witness ra ngoài

SegWit **di dời phần witness (chữ ký + script mở khoá) ra một cấu trúc riêng**, không còn nằm trong phần dữ liệu dùng để tính txid.

<svg viewBox="0 0 720 260" role="img" aria-labelledby="sw-t sw-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="sw-t">Trước và sau SegWit</title>
<desc id="sw-d">Trước SegWit chữ ký nằm trong giao dịch nên txid đổi khi chữ ký bị nắn; sau SegWit chữ ký tách riêng nên txid ổn định</desc>
<text x="180" y="24" text-anchor="middle" font-size="13" fill="currentColor">Trước SegWit</text>
<rect x="60" y="45" width="240" height="150" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<rect x="80" y="65" width="200" height="34" rx="5" fill="none" stroke="currentColor"/>
<text x="180" y="87" text-anchor="middle" font-size="12" fill="currentColor">inputs + outputs</text>
<rect x="80" y="110" width="200" height="34" rx="5" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="180" y="132" text-anchor="middle" font-size="12" fill="currentColor">signature (nắn được)</text>
<text x="180" y="172" text-anchor="middle" font-size="11" fill="currentColor">txid = hash(cả khối) → đổi theo chữ ký</text>
<text x="540" y="24" text-anchor="middle" font-size="13" fill="currentColor">Sau SegWit</text>
<rect x="420" y="45" width="240" height="95" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="440" y="65" width="200" height="34" rx="5" fill="none" stroke="currentColor"/>
<text x="540" y="87" text-anchor="middle" font-size="12" fill="currentColor">inputs + outputs</text>
<text x="540" y="122" text-anchor="middle" font-size="11" fill="currentColor">txid = hash(khối này)</text>
<rect x="420" y="155" width="240" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="540" y="182" text-anchor="middle" font-size="12" fill="currentColor">witness (tách riêng)</text>
<text x="360" y="240" text-anchor="middle" font-size="11" fill="currentColor">Chữ ký ra khỏi phần tính txid ⇒ malleability biến mất ⇒ Lightning khả thi</text>
</svg>

### 4.3 Hai lợi ích lớn

1. **Xoá malleability**: txid chỉ còn phụ thuộc dữ liệu đầu vào/ra, không phụ thuộc chữ ký nữa. Nắn chữ ký không đổi được txid → mở khoá cho **Lightning Network** và các giao thức layer-2.
2. **Tăng dung lượng qua "block weight"**: SegWit thay giới hạn 1 MB cứng bằng khái niệm **weight** (tối đa 4 triệu weight units). Dữ liệu witness được **tính trọng số nhẹ hơn** (1 WU/byte thay vì 4 WU/byte). Kết quả: block chứa được nhiều giao dịch hơn (thực tế ~1.7–2 MB tương đương), và **phí cho input SegWit rẻ hơn** vì phần chữ ký được chiết khấu.

Về triển khai, SegWit là **soft fork** khéo léo: node cũ vẫn thấy giao dịch hợp lệ (dưới dạng "ai cũng tiêu được" nhưng thực chất được node mới thực thi luật witness). Địa chỉ SegWit "native" dùng **bech32**, bắt đầu bằng `bc1q...` (P2WPKH / P2WSH).

---

## 5. Taproot — Schnorr + MAST (2021)

Taproot (kích hoạt 11/2021) là nâng cấp lớn nhất kể từ SegWit, gộp ba mảnh: **Schnorr signature**, **MAST**, và định dạng đầu ra **Pay-to-Taproot (P2TR)**, địa chỉ `bc1p...`.

### 5.1 Schnorr signature — thay ECDSA

Bitcoin nguyên bản dùng **ECDSA**. Taproot thêm **Schnorr** (BIP-340) với hai ưu điểm quyết định:

- **Linearity (tính tuyến tính)**: tổng của các chữ ký Schnorr cũng là một chữ ký hợp lệ trên tổng các public key. Nhờ đó **key aggregation** (MuSig): nhiều bên có thể gộp public key và chữ ký của họ thành **một** public key và **một** chữ ký duy nhất.
- **Gọn & an toàn hơn**: chứng minh bảo mật sạch hơn, chữ ký kích thước cố định 64 byte.

Hệ quả cực mạnh cho privacy: một ví **multisig 2/2** hay **3/3**, sau khi gộp khoá bằng Schnorr, **trông y hệt** một ví single-sig thường trên chuỗi. Người ngoài không phân biệt được "một người" hay "một hội đồng" đang tiêu coin.

### 5.2 MAST — Merkelized Alternative Script Tree

Một hợp đồng thực tế thường có **nhiều nhánh điều kiện** (ví dụ: "cả 2 bên cùng ký" HOẶC "sau 30 ngày một bên tự rút"). Trước Taproot, **mọi nhánh phải lộ ra** on-chain khi tiêu — tốn dữ liệu và lộ toàn bộ logic.

**MAST** đặt mỗi nhánh làm **lá của một cây Merkle** (Bài 2). Khi tiêu, bạn **chỉ tiết lộ nhánh thực sự dùng** + một **Merkle proof** ngắn chứng minh nhánh đó thuộc cây — các nhánh còn lại **không bao giờ lộ**.

<svg viewBox="0 0 700 280" role="img" aria-labelledby="mast-t mast-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="mast-t">MAST — chỉ lộ nhánh được dùng</title>
<desc id="mast-d">Cây Merkle của các nhánh script; khi tiêu chỉ tiết lộ một lá cùng bằng chứng Merkle, các lá khác vẫn ẩn</desc>
<rect x="285" y="20" width="130" height="40" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="45" text-anchor="middle" font-size="12" fill="currentColor">Taproot root</text>
<rect x="160" y="110" width="120" height="38" rx="6" fill="none" stroke="currentColor" stroke-dasharray="4 4"/>
<text x="220" y="134" text-anchor="middle" font-size="11" fill="currentColor">hash nhánh A</text>
<rect x="420" y="110" width="120" height="38" rx="6" fill="none" stroke="currentColor"/>
<text x="480" y="134" text-anchor="middle" font-size="11" fill="currentColor">hash nhánh B</text>
<line x1="330" y1="60" x2="240" y2="110" stroke="currentColor" stroke-width="1"/>
<line x1="370" y1="60" x2="460" y2="110" stroke="currentColor" stroke-width="1"/>
<rect x="90" y="195" width="130" height="40" rx="6" fill="none" stroke="currentColor" stroke-dasharray="4 4"/>
<text x="155" y="220" text-anchor="middle" font-size="11" fill="currentColor">script A (ẩn)</text>
<rect x="250" y="195" width="130" height="40" rx="6" fill="none" stroke="currentColor" stroke-dasharray="4 4"/>
<text x="315" y="220" text-anchor="middle" font-size="11" fill="currentColor">script A' (ẩn)</text>
<rect x="415" y="195" width="130" height="40" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="480" y="215" text-anchor="middle" font-size="11" fill="currentColor">script B (được lộ)</text>
<text x="480" y="230" text-anchor="middle" font-size="10" fill="currentColor">+ Merkle proof</text>
<line x1="200" y1="148" x2="155" y2="195" stroke="currentColor" stroke-width="1"/>
<line x1="240" y1="148" x2="315" y2="195" stroke="currentColor" stroke-width="1"/>
<line x1="480" y1="148" x2="480" y2="195" stroke="currentColor" stroke-width="1"/>
<text x="350" y="268" text-anchor="middle" font-size="11" fill="currentColor">Chỉ nhánh thực dùng lộ ra; các nhánh khác chỉ còn là hash — riêng tư &amp; gọn</text>
</svg>

### 5.3 Pay-to-Taproot: key path & script path

P2TR gói ghém tất cả vào **một public key duy nhất** trên chuỗi, cho phép **hai cách tiêu**:

- **Key path**: nếu tất cả các bên đồng thuận, họ ký gộp bằng Schnorr (MuSig) và tiêu như một single-sig thường. **Không lộ** rằng đằng sau có cả một cây điều kiện. Đây là "đường hạnh phúc" — rẻ nhất và riêng tư nhất.
- **Script path**: nếu bất đồng, một bên có thể "rơi xuống" cây MAST, tiết lộ **đúng một nhánh** cần thiết + Merkle proof để thực thi.

Điểm thiên tài: **trường hợp hợp tác** (đa số thực tế) trông giống hệt giao dịch tầm thường nhất, không để lộ gì. Chỉ khi có tranh chấp mới lộ script — và cũng chỉ lộ tối thiểu.

### 5.4 Lợi ích tổng hợp

| Khía cạnh | Trước Taproot | Với Taproot |
|-----------|---------------|-------------|
| **Multisig trên chuỗi** | Lộ rõ m/n, nhiều pubkey + chữ ký | Gộp thành 1 pubkey + 1 chữ ký (key path) |
| **Nhánh điều kiện** | Lộ hết mọi nhánh | Chỉ lộ nhánh dùng (MAST) |
| **Privacy** | Phân biệt được single vs multisig | Đa số giao dịch trông giống nhau |
| **Kích thước / phí** | Lớn hơn theo độ phức tạp | Nhỏ & gần như phẳng |
| **Chữ ký** | ECDSA, không gộp được | Schnorr, gộp tuyến tính |

---

## 6. Ví dụ thực tế: ví escrow 2/3

Tình huống: Alice mua hàng của Bob qua một sàn, có trọng tài Trent. Coin khoá theo multisig **2/3**.

- **Thời trước**: dùng P2SH `OP_2 <Alice> <Bob> <Trent> OP_3 OP_CHECKMULTISIG`. Khi giao dịch trơn tru (Alice + Bob cùng ký), chuỗi vẫn lộ rõ đây là ví 2/3 với ba public key — ai cũng thấy có một escrow.
- **Với Taproot**: đặt "Alice + Bob + Trent (3/3)" hoặc các tổ hợp 2/3 vào **cây MAST**, và dùng **key path** cho trường hợp thuận lợi (Alice + Bob gộp khoá ký). Giao dịch hoàn tất **trông như single-sig** — không lộ có escrow, phí thấp nhất. Chỉ khi cần trọng tài Trent can thiệp, mới rơi xuống **script path** và lộ đúng nhánh cần.

Đây chính là tinh thần của Taproot: **hợp tác thì vô hình, tranh chấp mới lộ tối thiểu**.

---

## 7. Tóm tắt
- **Bitcoin Script** là ngôn ngữ **stack-based, không Turing-complete** — cố ý hạn chế để **đảm bảo dừng, an toàn, dự đoán được**; đánh đổi bằng khả năng biểu đạt.
- Coin bị khoá bởi **scriptPubKey** (locking) và mở bằng **scriptSig** (unlocking); node ghép hai script rồi chạy trên stack, còn TRUE ở đỉnh là hợp lệ.
- **P2PKH** khoá theo hash public key; **P2SH** dồn độ phức tạp & phí về người tiêu bằng cách khoá theo hash của redeemScript; **multisig** đòi m/n chữ ký.
- **SegWit** tách witness ra khỏi phần tính txid → xoá **malleability** (mở đường Lightning) và tăng dung lượng nhờ **block weight** giảm phí cho input SegWit.
- **Taproot** = **Schnorr** (gộp khoá/chữ ký, tuyến tính) + **MAST** (chỉ lộ nhánh dùng) + **P2TR** (key path riêng tư, script path khi cần) → nâng cả **privacy** lẫn **hiệu quả**.

> **Bài tiếp theo (Bài 13):** rời mô hình UTXO của Bitcoin để bước sang **Ethereum & mô hình account-based** — nơi Script tối giản nhường chỗ cho **EVM Turing-complete** và smart contract.
