# Bài 11 — Mô hình UTXO, cấu trúc giao dịch, phí

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **UTXO (Unspent Transaction Output)** là gì và tại sao Bitcoin **không có "số dư tài khoản"** thật sự.
- Đọc được **cấu trúc một giao dịch**: input tham chiếu output trước (outpoint), output với `scriptPubKey` khóa coin.
- Hiểu **change output** — vì sao mỗi lần tiêu bạn phải "trả lại tiền thừa cho chính mình".
- Tính **phí giao dịch** đúng: `fee = Σ input − Σ output`, và vì sao phí đo bằng **sat/vByte** chứ không phải theo số tiền gửi.
- Nắm **coin selection** — bài toán chọn UTXO nào để chi, và các đánh đổi của nó.
- So sánh **UTXO model vs account model** (Bitcoin vs Ethereum) về privacy, parallelism, statelessness, độ phức tạp.

---

## 2. Lý thuyết

### 2.1 Analogy — ví tiền mặt đầy tờ giấy bạc, không phải sổ số dư

Hãy phân biệt hai cách "giữ tiền":

| Cách giữ tiền | Mô hình | Bản chất |
|---------------|---------|----------|
| **Tài khoản ngân hàng**: bạn có một con số "số dư", chi tiêu là cộng/trừ con số đó | **Account model** (Ethereum) | State là một bảng `address → balance` |
| **Ví tiền mặt**: bạn có nhiều **tờ tiền mệnh giá cố định** (500k, 200k, 50k...). Trả 550k thì đưa 1 tờ 500k + 1 tờ 50k, không "cắt" tờ tiền được | **UTXO model** (Bitcoin) | State là **tập các tờ tiền chưa tiêu** |

Điểm mấu chốt của UTXO: **coin của bạn không nằm ở một chỗ dưới dạng số dư**. "Số dư" chỉ là con số **ví tính giúp bạn** bằng cách cộng tất cả các "tờ tiền" (UTXO) mà bạn có khóa để mở. Trên chain **không hề tồn tại biến balance nào** cho địa chỉ của bạn — chỉ có một tập UTXO nằm rải rác, mỗi cái mang một số tiền và một điều kiện khóa.

Và giống tiền mặt: **bạn không xé đôi được một tờ tiền**. Muốn tiêu một phần giá trị của một UTXO, bạn phải **tiêu trọn nó** rồi tự tạo một UTXO mới trả lại phần thừa cho chính mình — đó là **change output**.

### 2.2 UTXO là gì — định nghĩa chính xác

Một **UTXO** là một **transaction output chưa được dùng làm input cho bất kỳ giao dịch nào sau đó**. Nó gồm hai phần:
- **value**: số tiền, tính bằng **satoshi** (1 BTC = 100.000.000 sat).
- **scriptPubKey** (locking script): điều kiện để "mở khóa" chi tiêu — thường là "chứng minh bạn sở hữu private key ứng với địa chỉ này".

Toàn bộ tiền trên mạng Bitcoin, tại bất kỳ thời điểm nào, chính là **tập tất cả UTXO đang tồn tại** — gọi là **UTXO set**. Full node giữ UTXO set trong bộ nhớ/chainstate để kiểm tra tức thì: input mà một giao dịch tham chiếu có **thực sự tồn tại & chưa bị tiêu** không.

**Vòng đời một UTXO chỉ có 2 trạng thái**, và chuyển trạng thái là **một chiều**:

<svg viewBox="0 0 640 170" role="img" aria-labelledby="lc-t lc-d" style="width:100%;max-width:560px;height:auto;display:block;margin:1.25rem auto">
<title id="lc-t">Vòng đời của một UTXO</title>
<desc id="lc-d">Một output được tạo ra ở trạng thái unspent, khi bị dùng làm input nó chuyển sang spent và bị xóa khỏi UTXO set, không quay lại được</desc>
<rect x="60" y="60" width="150" height="60" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="135" y="86" text-anchor="middle" font-size="14" fill="currentColor">UNSPENT</text>
<text x="135" y="106" text-anchor="middle" font-size="11" fill="currentColor">nằm trong UTXO set</text>
<rect x="430" y="60" width="150" height="60" rx="10" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="505" y="86" text-anchor="middle" font-size="14" fill="currentColor">SPENT</text>
<text x="505" y="106" text-anchor="middle" font-size="11" fill="currentColor">bị xóa khỏi set</text>
<line x1="210" y1="90" x2="428" y2="90" stroke="currentColor" stroke-width="1.5" marker-end="url(#lah)"/>
<text x="319" y="80" text-anchor="middle" font-size="12" fill="currentColor">dùng làm input</text>
<text x="319" y="140" text-anchor="middle" font-size="11" fill="currentColor">một chiều — không tái sử dụng được (chống double-spend)</text>
<defs><marker id="lah" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Cơ chế **chống double-spending** của Bitcoin nằm chính ở đây: một UTXO chỉ **tiêu được đúng một lần**. Khi nó thành input của một giao dịch hợp lệ được xác nhận, node **xóa nó khỏi UTXO set**. Mọi giao dịch sau đó tham chiếu lại nó sẽ bị từ chối vì "input không tồn tại trong set".

### 2.3 Cấu trúc một giao dịch — input tham chiếu output trước

Một giao dịch Bitcoin về cơ bản là một **danh sách input** và một **danh sách output**:

- **Input** không mang số tiền. Nó là một **con trỏ (outpoint)** trỏ tới một UTXO cụ thể của giao dịch trước, gồm:
  - `txid`: hash của giao dịch chứa output đó.
  - `vout`: chỉ số output trong giao dịch đó (0, 1, 2...).
  - `scriptSig` / `witness`: bằng chứng mở khóa (chữ ký + public key) thỏa `scriptPubKey` của UTXO được trỏ tới.
- **Output** mang **value** + **scriptPubKey** (khóa coin cho người nhận / chính mình).

<svg viewBox="0 0 700 360" role="img" aria-labelledby="tx-t tx-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="tx-t">Input tham chiếu output của giao dịch trước và tạo output mới</title>
<desc id="tx-d">Giao dịch trước có hai output; giao dịch mới dùng chúng làm input rồi tạo một output trả cho Bob và một change output trả lại cho Alice</desc>
<text x="130" y="24" text-anchor="middle" font-size="13" fill="currentColor">TX trước (đã xác nhận)</text>
<rect x="40" y="40" width="180" height="70" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="130" y="65" text-anchor="middle" font-size="12" fill="currentColor">output #0 → Alice</text>
<text x="130" y="85" text-anchor="middle" font-size="12" fill="currentColor">0.6 BTC (UTXO)</text>
<rect x="40" y="130" width="180" height="70" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="130" y="155" text-anchor="middle" font-size="12" fill="currentColor">output #1 → Alice</text>
<text x="130" y="175" text-anchor="middle" font-size="12" fill="currentColor">0.5 BTC (UTXO)</text>
<text x="470" y="24" text-anchor="middle" font-size="13" fill="currentColor">TX mới của Alice</text>
<rect x="320" y="40" width="140" height="70" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="390" y="70" text-anchor="middle" font-size="12" fill="currentColor">input 0</text>
<text x="390" y="90" text-anchor="middle" font-size="11" fill="currentColor">→ txid:#0</text>
<rect x="320" y="130" width="140" height="70" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="390" y="160" text-anchor="middle" font-size="12" fill="currentColor">input 1</text>
<text x="390" y="180" text-anchor="middle" font-size="11" fill="currentColor">→ txid:#1</text>
<rect x="520" y="40" width="150" height="70" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="595" y="65" text-anchor="middle" font-size="12" fill="currentColor">output → Bob</text>
<text x="595" y="85" text-anchor="middle" font-size="12" fill="currentColor">1.0 BTC</text>
<rect x="520" y="130" width="150" height="70" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="595" y="152" text-anchor="middle" font-size="12" fill="currentColor">change → Alice</text>
<text x="595" y="170" text-anchor="middle" font-size="12" fill="currentColor">0.0999 BTC</text>
<text x="595" y="188" text-anchor="middle" font-size="10" fill="currentColor">(UTXO mới)</text>
<line x1="220" y1="75" x2="318" y2="75" stroke="currentColor" stroke-width="1.5" marker-end="url(#tah)"/>
<line x1="220" y1="165" x2="318" y2="165" stroke="currentColor" stroke-width="1.5" marker-end="url(#tah)"/>
<line x1="460" y1="75" x2="518" y2="75" stroke="currentColor" stroke-width="1.5" marker-end="url(#tah)"/>
<line x1="460" y1="150" x2="518" y2="150" stroke="currentColor" stroke-width="1.5" marker-end="url(#tah)"/>
<text x="350" y="300" text-anchor="middle" font-size="12" fill="currentColor">Σ input = 0.6 + 0.5 = 1.1 BTC &#160;&#160; Σ output = 1.0 + 0.0999 = 1.0999 BTC</text>
<text x="350" y="325" text-anchor="middle" font-size="12" fill="#f59e0b">fee = 1.1 − 1.0999 = 0.0001 BTC (phần chênh, không ghi rõ trong tx)</text>
<defs><marker id="tah" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Ba quy tắc bất biến của một giao dịch UTXO hợp lệ:
1. **Mọi input phải trỏ tới một UTXO đang tồn tại & chưa bị tiêu** (có trong UTXO set).
2. **Bằng chứng mở khóa (scriptSig/witness) phải thỏa scriptPubKey** của UTXO đó — nếu không, bất kỳ ai cũng tiêu được tiền người khác.
3. **Σ input ≥ Σ output** (trừ coinbase transaction). Phần dôi ra chính là **phí**.

### 2.4 Input tiêu **trọn** UTXO → sinh ra change output

Đây là chỗ người mới hay hiểu sai. Khi bạn dùng một UTXO làm input, bạn **tiêu toàn bộ value của nó** — không có chuyện "tiêu 0.3 trong tờ 0.6". Nếu bạn chỉ cần gửi 1.0 BTC nhưng phải gom hai UTXO tổng 1.1 BTC, thì 0.1 BTC còn lại **không tự động quay về túi bạn**. Bạn phải **tự tạo một output trả cho chính mình** — đó là change output (thường vào một địa chỉ change mới của ví bạn).

> ⚠️ Cạm bẫy chết người: nếu bạn **quên** tạo change output, toàn bộ phần chênh sẽ bị coi là **phí** và mất cho miner. Đã có người mất hàng chục BTC vì tự tay dựng giao dịch thiếu change. Ví (wallet) làm việc này tự động, nhưng khi code tay bạn phải nhớ.

### 2.5 Phí = Σ input − Σ output

Phí **không phải một trường riêng** trong giao dịch Bitcoin. Nó là **phần dôi ra**:

```
fee = (tổng value các input)  −  (tổng value các output)
```

Miner khi gom giao dịch vào block sẽ "nhặt" phần chênh này thông qua **coinbase transaction** của block. Vì phí là phần chênh, nó **hoàn toàn do người gửi kiểm soát**: muốn trả phí cao, để chênh nhiều (giảm value của change output); muốn phí thấp, để chênh ít.

**Phí không tỉ lệ với số tiền gửi** — gửi 0.001 BTC hay 1000 BTC có thể trả phí bằng nhau. Phí tỉ lệ với **kích thước giao dịch**, vì block có giới hạn dung lượng và miner ưu tiên giao dịch trả nhiều phí **trên mỗi byte**. Đơn vị chuẩn là **sat/vByte** (satoshi trên mỗi virtual byte):

```
phí phải trả ≈ (số vByte của tx) × (sat/vByte theo mức tắc nghẽn mempool)
```

- Giao dịch **nhiều input** → to hơn (mỗi input ~68–148 vByte tùy loại) → tốn phí hơn. Đây là lý do "gom nhiều UTXO nhỏ" (nhất là lúc phí cao) rất đắt — ví gọi vui là **"dust"** với các UTXO quá nhỏ, tiêu chúng còn tốn phí hơn giá trị chúng mang.
- **SegWit / Taproot** giảm phí vì tách phần witness (chữ ký) ra khỏi phần tính "weight", nên cùng nội dung nhưng ít vByte hơn.

### 2.6 Coin selection — chọn UTXO nào để chi

Vì "số dư" là một đống UTXO rời rạc, mỗi lần chi ví phải giải một bài toán: **chọn tập con UTXO nào** sao cho tổng đủ trả `amount + fee`. Đây là **coin selection**, và nó là một biến thể của bài toán **subset-sum / knapsack** — cân bằng nhiều mục tiêu mâu thuẫn:

| Mục tiêu | Vì sao khó |
|----------|-----------|
| **Ít input nhất** | Giao dịch nhỏ → phí thấp. Nhưng chọn UTXO to có thể lộ nhiều thông tin & sinh change lớn. |
| **Tránh sinh change** (hoặc change tối thiểu) | Change là một UTXO nữa phải tiêu sau này → phí tương lai. Bitcoin Core dùng thuật toán **Branch and Bound (BnB)** để tìm tập UTXO khớp gần chính xác amount+fee, né change. |
| **Dọn UTXO nhỏ ("consolidation")** | Nên gom lúc phí thấp để sau này không kẹt "dust", nhưng gom lúc phí cao thì lỗ. |
| **Bảo vệ privacy** | Gộp nhiều UTXO của các địa chỉ khác nhau vào một input set sẽ **liên kết** chúng — lộ rằng chúng cùng một chủ (xem 3.3). |

Không có lời giải "tối ưu tuyệt đối" — mỗi ví chọn heuristic riêng. Đây là một khác biệt lớn với account model: ở Ethereum bạn **không cần** coin selection, chỉ cần `balance ≥ amount + gas`.

### 2.7 Một giao dịch thô, đọc bằng Bitcoin Core RPC

Với account model quen thuộc thì output JSON dưới đây rất "lạ" — hãy đọc kỹ: input **không có value**, chỉ trỏ; value nằm ở output.

```bash
# Lấy raw hex của một giao dịch rồi giải mã ra JSON
bitcoin-cli getrawtransaction <txid> true
```

```jsonc
{
  "txid": "a1b2...",
  "vin": [
    {
      "txid": "prev9f...",   // input = con trỏ tới output của TX trước
      "vout": 0,             // dùng output #0 của TX đó
      "txinwitness": [ "3045...01", "02a7..." ] // chữ ký + pubkey (bằng chứng mở khóa)
      // KHÔNG có trường "value" ở đây!
    }
  ],
  "vout": [
    {
      "value": 1.00000000,   // trả cho Bob
      "n": 0,
      "scriptPubKey": { "address": "bc1qbob...", "type": "witness_v0_keyhash" }
    },
    {
      "value": 0.09990000,   // change → về địa chỉ mới của Alice
      "n": 1,
      "scriptPubKey": { "address": "bc1qalice_change...", "type": "witness_v0_keyhash" }
    }
  ]
}
```

Để tính phí bạn phải **tự tra value của từng input** (vì input không mang value), cộng lại rồi trừ tổng `vout`:

```
fee = Σ value(vin[i] → UTXO nó trỏ tới)  −  Σ value(vout[j])
```

Chính vì vậy để verify một giao dịch, node **bắt buộc** phải có UTXO set — nó tra value & scriptPubKey của mỗi input từ đó.

---

## 3. UTXO model vs Account model

### 3.1 Bảng so sánh cốt lõi

| Tiêu chí | UTXO (Bitcoin) | Account (Ethereum) |
|----------|----------------|--------------------|
| **State** | Tập UTXO rời rạc | Bảng `address → {balance, nonce, storage}` |
| **Số dư** | Ví tự tính = Σ UTXO mở được | Đọc thẳng biến balance |
| **Chi một phần** | Không — tiêu trọn UTXO + change | Có — trừ đúng số cần |
| **Chống double-spend** | Xóa UTXO khỏi set (tiêu 1 lần) | **nonce** tăng dần mỗi tx |
| **Coin selection** | Cần (bài toán subset-sum) | Không cần |
| **Xử lý song song** | Dễ (tx độc lập nếu không đụng chung UTXO) | Khó hơn (nhiều tx sửa chung 1 account) |
| **Statelessness / verify** | Tx tự chứa đủ ngữ cảnh qua input | Cần đọc state hiện tại của account |
| **Smart contract** | Hạn chế (script không Turing-complete) | Mạnh (EVM, state bền vững) |
| **Privacy mặc định** | Tốt hơn (địa chỉ mới mỗi lần, không "tài khoản") | Kém (mọi tx dồn về 1 address) |
| **Replay/ordering** | Không phụ thuộc thứ tự nội bộ account | Phải theo đúng thứ tự nonce |

### 3.2 Parallelism — vì sao UTXO dễ song song hơn

Trong UTXO, hai giao dịch **hoàn toàn độc lập** nếu chúng **không tiêu chung một UTXO**. Node có thể verify chúng **song song** vì mỗi giao dịch chỉ đọc/xóa các UTXO riêng của nó — không có "biến toàn cục chung" bị tranh chấp.

Trong account model, nếu hai giao dịch cùng đụng vào **một account** (ví dụ cùng gọi một smart contract phổ biến, hay cùng rút từ một địa chỉ), chúng **xung đột state** và phải xử lý tuần tự theo nonce. Đây là lý do nhiều chain account-based phải thêm cơ chế "access list" / parallel-EVM để lấy lại tính song song mà UTXO có sẵn.

Đổi lại, **account model đơn giản hơn cho lập trình**: state bền vững, dễ mô hình hóa contract có "bộ nhớ". UTXO tự nhiên hợp với "tiền thuần túy", còn logic phức tạp (DeFi, NFT có trạng thái) thì account model diễn đạt gọn hơn nhiều.

### 3.3 Privacy — con dao hai lưỡi

<svg viewBox="0 0 700 250" role="img" aria-labelledby="pv-t pv-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="pv-t">Common-input-ownership làm lộ liên kết giữa các UTXO</title>
<desc id="pv-d">Khi một giao dịch gộp nhiều input từ các địa chỉ khác nhau, người quan sát suy ra chúng cùng một chủ sở hữu</desc>
<rect x="40" y="30" width="150" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="58" text-anchor="middle" font-size="12" fill="currentColor">UTXO addr A</text>
<rect x="40" y="100" width="150" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="128" text-anchor="middle" font-size="12" fill="currentColor">UTXO addr B</text>
<rect x="40" y="170" width="150" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="198" text-anchor="middle" font-size="12" fill="currentColor">UTXO addr C</text>
<rect x="300" y="90" width="120" height="70" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="120" text-anchor="middle" font-size="12" fill="currentColor">1 giao dịch</text>
<text x="360" y="140" text-anchor="middle" font-size="11" fill="currentColor">gộp 3 input</text>
<line x1="190" y1="52" x2="298" y2="110" stroke="currentColor" stroke-width="1.3" marker-end="url(#pah)"/>
<line x1="190" y1="122" x2="298" y2="125" stroke="currentColor" stroke-width="1.3" marker-end="url(#pah)"/>
<line x1="190" y1="192" x2="298" y2="140" stroke="currentColor" stroke-width="1.3" marker-end="url(#pah)"/>
<rect x="500" y="90" width="170" height="70" rx="10" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="585" y="118" text-anchor="middle" font-size="12" fill="currentColor">Người quan sát suy ra:</text>
<text x="585" y="138" text-anchor="middle" font-size="12" fill="currentColor">A, B, C cùng 1 chủ</text>
<line x1="420" y1="125" x2="498" y2="125" stroke="currentColor" stroke-width="1.5" marker-end="url(#pah)"/>
<text x="350" y="238" text-anchor="middle" font-size="11" fill="currentColor">UTXO cho địa chỉ dùng-một-lần (privacy tốt) nhưng gộp input lại phá vỡ tính riêng tư đó</text>
<defs><marker id="pah" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

- **Lợi thế privacy của UTXO**: không có "tài khoản" cố định. Best practice là **mỗi lần nhận tiền dùng một địa chỉ mới**, kể cả change cũng vào địa chỉ mới → khó ghép các khoản của cùng một người.
- **Nhưng** kỹ thuật **common-input-ownership heuristic**: khi một giao dịch gộp nhiều UTXO làm input, người phân tích chain suy luận (thường đúng) rằng **tất cả các input đó cùng một chủ** — vì phải có đủ private key để ký cho tất cả. Coin selection vì thế **là quyết định privacy**, không chỉ là tối ưu phí.
- Account model thì ngược lại: mọi hoạt động dồn về **một địa chỉ** → toàn bộ lịch sử của bạn công khai và liên kết sẵn. Đây là lý do các giải pháp privacy trên Ethereum (mixer, ZK) phải làm việc nặng hơn.

---

## 4. Tình huống thực tế

**Alice có 3 UTXO**: 0.6, 0.5, 0.05 BTC. Cô muốn gửi Bob **1.0 BTC**, mempool đang ~20 sat/vByte.

1. **Coin selection**: ví ưu tiên né change nếu có thể. Không tập con nào khớp gần đúng 1.0 + phí, nên ví chọn `0.6 + 0.5 = 1.1` (bỏ qua 0.05 để giữ tx nhỏ).
2. Giao dịch có **2 input, 2 output** → cỡ ~208 vByte (P2WPKH). Phí ≈ `208 × 20 = 4160 sat = 0.0000416 BTC`.
3. **Output**: `1.0 → Bob`; **change** `= 1.1 − 1.0 − 0.0000416 = 0.0999584 → địa chỉ change mới của Alice`.
4. Sau khi block xác nhận: hai UTXO 0.6 & 0.5 **biến mất khỏi UTXO set**; xuất hiện **hai UTXO mới** (1.0 của Bob, 0.0999584 của Alice). UTXO 0.05 của Alice **vẫn nguyên**.
5. "Số dư" mới của Alice = `0.05 + 0.0999584 = 0.1499584` — không có biến nào lưu con số này; ví cộng lại từ hai UTXO cô đang giữ.

Ở Ethereum, cùng nghiệp vụ chỉ là: `balance[Alice] -= (1.0 + gas)`, `balance[Bob] += 1.0`, `nonce[Alice] += 1`. Ngắn hơn, nhưng đánh mất tính rời rạc và ưu thế privacy/parallelism của UTXO.

---

## 5. Tóm tắt
- **UTXO** = một output chưa tiêu, mang `value + scriptPubKey`; toàn bộ tiền trên chain = **UTXO set**. **Không có biến "số dư"** — ví tự cộng.
- **Input không mang tiền**, nó là **con trỏ (txid, vout)** tới một UTXO trước + bằng chứng mở khóa. Value chỉ nằm ở **output**.
- Tiêu một UTXO là **tiêu trọn** → phải tạo **change output** trả lại phần thừa cho chính mình, nếu không phần thừa mất thành phí.
- **fee = Σ input − Σ output**, không phải trường riêng; đo bằng **sat/vByte** theo kích thước tx, **không** theo số tiền gửi.
- **Coin selection** là bài toán subset-sum: cân bằng phí, tránh change, dọn dust, và **privacy** (gộp input lộ chủ sở hữu chung).
- So account model: UTXO **song song hóa dễ hơn, privacy mặc định tốt hơn**, nhưng **phức tạp hơn** và **yếu về smart contract có state**; account model đơn giản, mạnh cho contract, nhưng cần nonce & khó song song.

> **Bài tiếp theo (Bài 12):** rời khỏi Bitcoin script để bước vào **account model & EVM** — nơi state bền vững và smart contract Turing-complete thay đổi hoàn toàn cách ta lập trình trên chain.
