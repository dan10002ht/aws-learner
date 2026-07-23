# Bài 35 — Mật mã nâng cao: KZG, MPC, threshold, BLS

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **polynomial commitment KZG**: cam kết một đa thức chỉ bằng **một điểm nhóm**, chứng minh giá trị chỉ bằng **một điểm** — và vì sao nó là xương sống của **PLONK** và **danksharding (EIP-4844 blobs)**.
- Hiểu bản chất **multi-party computation (MPC)** và cách **MPC wallet** ký giao dịch mà **private key không bao giờ tồn tại trọn vẹn** ở một chỗ.
- Phân biệt **threshold signature (t-of-n)** với **multisig on-chain** — đánh đổi về chi phí, riêng tư, chain-agnostic.
- Nắm **BLS signature & aggregation**: gộp hàng nghìn chữ ký thành **một**, nền tảng của **Ethereum consensus**.
- Biết các cạm bẫy: **trusted setup**, **rogue key attack**, **proof of possession**.

---

## 2. Nền tảng chung: pairing & pairing-friendly curve

Ba trong bốn công cụ của bài này (KZG, threshold BLS, BLS) đều dựa trên **bilinear pairing**. Đây là mảnh ghép mật mã cần nắm trước.

Một **pairing** là hàm `e: G1 × G2 → GT` trên các nhóm elliptic curve, thỏa **tính song tuyến (bilinear)**:

```
e(a·P, b·Q) = e(P, Q)^(a·b)
```

Nghĩa là: có thể **đẩy số nhân từ trong điểm ra thành số mũ** ở nhóm đích. Đây là "phép thuật" cho phép kiểm tra một quan hệ nhân (`a·b`) mà **không cần biết `a`, `b`** — chỉ cần biết `a·P` và `b·Q`. Đường cong dùng phổ biến là **BLS12-381** (Ethereum) và **BN254/alt_bn128** (precompile EVM cũ).

> Analogy: pairing giống một **cái cân hai đĩa mật mã**. Bạn không đọc được khối lượng thật trên từng đĩa (giá trị bí mật bị "khóa" trong điểm nhóm), nhưng cân cho biết **hai vế có bằng nhau hay không**. Toàn bộ KZG và BLS chỉ là những cách đặt đồ khéo léo lên hai đĩa cân này.

---

## 3. KZG — Polynomial commitment

### 3.1 Ý tưởng: "niêm phong" cả một đa thức bằng một điểm

Ta muốn **cam kết (commit)** vào một đa thức `p(x)` bậc `n` sao cho:
- Người khác **không biết** `p(x)` là gì (hiding, ở mức cơ bản là binding).
- Sau này ta **không thể đổi** đa thức đã cam kết (binding).
- Ta có thể chứng minh "`p(z) = y`" tại một điểm `z` bất kỳ mà **bằng chứng có kích thước cố định** — không phụ thuộc bậc `n`.

Cách ngây thơ: gửi luôn `n+1` hệ số → tốn `O(n)`. KZG làm được tất cả với **một điểm nhóm để commit** và **một điểm nhóm để chứng minh** — tức `O(1)`, hằng số 48 byte trên BLS12-381. Đó là lý do nó thắng thế.

### 3.2 Trusted setup — "powers of tau"

KZG cần một **structured reference string (SRS)** tạo từ một số bí mật `τ` (tau):

```
SRS = ( [1]₁, [τ]₁, [τ²]₁, …, [τⁿ]₁ ,   [1]₂, [τ]₂ )
```

trong đó `[a]₁ = a·G1` và `[a]₂ = a·G2`. **Điều kiện sống còn:** `τ` phải bị **xóa vĩnh viễn** ngay sau khi tạo — ai biết `τ` có thể **giả mạo mọi bằng chứng**. Đây là "toxic waste".

Để không phải tin một người, ta dùng **MPC ceremony**: nhiều người lần lượt nhân thêm phần ngẫu nhiên của mình vào SRS. Chỉ cần **một người trung thực xóa phần của mình** là `τ` an toàn (1-of-n trust). Ethereum đã chạy **KZG Ceremony** cho EIP-4844 với hơn **140.000 người** tham gia — có lẽ là ceremony lớn nhất lịch sử.

### 3.3 Commit — Prove — Verify

<svg viewBox="0 0 720 300" role="img" aria-labelledby="kzg-t kzg-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="kzg-t">Luồng commit — prove — verify của KZG</title>
<desc id="kzg-d">Prover cam kết đa thức thành một điểm C, tạo bằng chứng pi cho p(z)=y, verifier kiểm tra bằng một phép pairing</desc>
<rect x="30" y="40" width="200" height="220" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="130" y="66" text-anchor="middle" font-size="14" fill="currentColor">Prover</text>
<text x="130" y="100" text-anchor="middle" font-size="12" fill="currentColor">có đa thức p(x)</text>
<text x="130" y="135" text-anchor="middle" font-size="12" fill="currentColor">Commit:</text>
<text x="130" y="156" text-anchor="middle" font-size="13" fill="#3b82f6">C = [p(τ)]₁</text>
<text x="130" y="192" text-anchor="middle" font-size="12" fill="currentColor">Chứng minh p(z)=y:</text>
<text x="130" y="213" text-anchor="middle" font-size="12" fill="currentColor">q(x)=(p(x)−y)/(x−z)</text>
<text x="130" y="234" text-anchor="middle" font-size="13" fill="#8b5cf6">π = [q(τ)]₁</text>
<line x1="230" y1="150" x2="470" y2="150" stroke="currentColor" stroke-width="1.5" marker-end="url(#kah)"/>
<text x="350" y="130" text-anchor="middle" font-size="12" fill="currentColor">gửi (C, z, y, π)</text>
<text x="350" y="170" text-anchor="middle" font-size="11" fill="currentColor">mỗi cái ~48 byte</text>
<rect x="490" y="40" width="200" height="220" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="590" y="66" text-anchor="middle" font-size="14" fill="currentColor">Verifier</text>
<text x="590" y="100" text-anchor="middle" font-size="12" fill="currentColor">chỉ giữ SRS + (C,z,y,π)</text>
<text x="590" y="140" text-anchor="middle" font-size="12" fill="currentColor">Kiểm tra 1 pairing:</text>
<text x="590" y="172" text-anchor="middle" font-size="12" fill="#10b981">e(C−[y]₁, [1]₂)</text>
<text x="590" y="194" text-anchor="middle" font-size="12" fill="#10b981">= e(π, [τ−z]₂)</text>
<text x="590" y="232" text-anchor="middle" font-size="12" fill="currentColor">true → chấp nhận</text>
<defs><marker id="kah" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Trực giác của phương trình verify: `p(z)=y` **khi và chỉ khi** `(x−z)` chia hết `p(x)−y`, tức tồn tại thương `q(x)` với `p(x)−y = q(x)·(x−z)`. Pairing "kiểm tra phép nhân này tại điểm bí mật `τ`":

```
e(C − [y]₁, [1]₂)  =  e(π, [τ − z]₂)
⇔ e([p(τ)−y]₁, [1]₂) = e([q(τ)]₁, [τ−z]₂)
⇔ p(τ)−y = q(τ)·(τ−z)        (đúng vì đa thức chia hết)
```

Verifier **không biết `τ`**, chỉ dùng `[τ−z]₂` lấy từ SRS. Đây chính là "cái cân hai đĩa": nếu prover gian lận (dùng `p'` khác), quan hệ chia hết vỡ và hai đĩa lệch nhau.

### 3.4 Ứng dụng blockchain

| Nơi dùng | Vai trò của KZG |
|----------|-----------------|
| **PLONK / Halo2-KZG** | Commit vào các đa thức "wire/constraint" của mạch ZK; proof ngắn, verify hằng số. Nền của nhiều zkEVM. |
| **EIP-4844 (proto-danksharding)** | Mỗi **blob** (~128 KB) được commit bằng **một** KZG commitment 48 byte lưu on-chain; dữ liệu thật nằm off-chain. |
| **Danksharding / DAS** | **Data availability sampling**: node chỉ tải vài điểm ngẫu nhiên + KZG proof để tin rằng cả blob đã được phát tán — không cần tải hết. |
| **Verkle tree** | Thay Merkle bằng cây dùng vector/polynomial commitment → witness nhỏ hơn nhiều, phục vụ stateless client. |

Điểm mạnh so với Merkle proof: bằng chứng KZG **cố định 48 byte** dù dữ liệu lớn cỡ nào (Merkle proof tăng `O(log n)`), và **gộp được nhiều lần mở** (multi-open) thành một proof.

---

## 4. MPC — Multi-Party Computation

### 4.1 Ý tưởng: tính toán trên dữ liệu bí mật của nhiều bên

**MPC** cho phép `n` bên cùng tính một hàm `f(x₁,…,xₙ)` trong đó **mỗi bên chỉ biết đầu vào `xᵢ` của mình**, kết quả đúng được tiết lộ nhưng **không ai học thêm** gì về đầu vào của người khác (ngoài điều suy ra được từ kết quả).

> Ví dụ kinh điển ("bài toán triệu phú"): hai người muốn biết **ai giàu hơn** mà **không tiết lộ số tài sản**. MPC cho ra đúng bit "A > B?" mà không lộ con số.

Viên gạch nền là **Shamir Secret Sharing**: chia bí mật `s` thành `n` mảnh sao cho **bất kỳ `t` mảnh** dựng lại được `s`, còn `< t` mảnh thì **không biết gì**. Dùng một đa thức bậc `t−1` với hằng số là `s`:

```python
# Shamir (t, n): chia bí mật s thành n mảnh, cần >= t mảnh để khôi phục
import random
P = 2**521 - 1                      # số nguyên tố lớn, làm việc trong trường F_P

def split(secret, t, n):
    # đa thức a0 + a1*x + ... + a_{t-1} x^{t-1}, với a0 = secret
    coeffs = [secret] + [random.randrange(P) for _ in range(t - 1)]
    def poly(x):
        y = 0
        for c in reversed(coeffs):  # Horner
            y = (y * x + c) % P
        return y
    return [(i, poly(i)) for i in range(1, n + 1)]   # mảnh cho x = 1..n

def recover(shares):
    # nội suy Lagrange tại x = 0 để lấy lại secret (= a0)
    secret = 0
    for i, (xi, yi) in enumerate(shares):
        num = den = 1
        for j, (xj, _) in enumerate(shares):
            if i != j:
                num = (num * (-xj)) % P
                den = (den * (xi - xj)) % P
        secret = (secret + yi * num * pow(den, -1, P)) % P
    return secret
```

Điểm cốt lõi: đa thức bậc `t−1` cần **đúng `t` điểm** để xác định duy nhất; `t−1` điểm để lại **vô số** đa thức khả dĩ ⇒ an toàn thông tin tuyệt đối dưới ngưỡng.

### 4.2 MPC wallet — private key không bao giờ "tồn tại"

Ví MPC áp dụng MPC vào **việc ký giao dịch** thay vì lưu cả private key ở một nơi:

- **Distributed Key Generation (DKG):** `n` bên cùng sinh khóa; mỗi bên giữ một **key share `dᵢ`**. Private key `d` **chưa từng** được lắp ráp ở bất kỳ máy nào — kể cả lúc tạo.
- **Threshold signing:** khi cần ký, `t` bên chạy một giao thức MPC để tạo ra **một chữ ký ECDSA/EdDSA hợp lệ bình thường**, mà không bên nào lộ share của mình. On-chain nhìn thấy **một chữ ký y hệt ví thường**.
- **Key refresh / proactive security:** định kỳ "làm mới" các share (đổi biểu diễn của cùng một `d`) → kẻ tấn công phải chiếm `t` bên **trong cùng một chu kỳ**, tấn công cũ trở nên vô dụng.

Đây là công nghệ đằng sau các custodian như **Fireblocks**, **Coinbase**, ví **ZenGo** (2-of-2 giữa điện thoại và server).

### 4.3 MPC wallet vs Multisig on-chain

| Tiêu chí | Multisig (vd Gnosis Safe) | MPC wallet (TSS) |
|----------|---------------------------|------------------|
| **Bản chất** | Smart contract, nhiều chữ ký on-chain | Mật mã off-chain → **một** chữ ký |
| **On-chain thấy gì** | Contract + `k` chữ ký (lộ ngưỡng, người ký) | Một chữ ký EOA thường — **riêng tư** |
| **Phí gas** | Cao hơn (verify nhiều sig) | Như giao dịch thường |
| **Chain-agnostic** | Cần deploy contract từng chain | Một cơ chế cho mọi chain dùng ECDSA/EdDSA |
| **Thay đổi policy** | Minh bạch, on-chain, có thể audit | Off-chain, khó audit hơn |
| **Rủi ro** | Bug smart contract | Bug protocol MPC, phức tạp triển khai |

> Quy tắc chọn: cần **minh bạch, quản trị on-chain, tương thích DeFi/smart contract** → multisig. Cần **riêng tư, chi phí thấp, đồng nhất đa chain, hạ tầng custodian** → MPC.

---

## 5. Threshold signature (t-of-n)

**Threshold signature scheme (TSS)** là trường hợp riêng của MPC dành cho chữ ký: `n` bên giữ share; **bất kỳ `t` bên** hợp tác tạo ra **một chữ ký** verify được bằng **một public key duy nhất** — không bên nào từng cầm full private key, và bên ngoài **không phân biệt** được nó với chữ ký của một khóa đơn.

<svg viewBox="0 0 700 280" role="img" aria-labelledby="tss-t tss-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="tss-t">Threshold signature t-of-n</title>
<desc id="tss-d">Ba trong năm bên giữ key share hợp tác tạo một chữ ký duy nhất verify bằng một public key chung</desc>
<circle cx="90" cy="70" r="26" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="66" text-anchor="middle" font-size="11" fill="currentColor">share d₁</text>
<text x="90" y="82" text-anchor="middle" font-size="11" fill="currentColor">✓</text>
<circle cx="90" cy="150" r="26" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="146" text-anchor="middle" font-size="11" fill="currentColor">share d₂</text>
<text x="90" y="162" text-anchor="middle" font-size="11" fill="currentColor">✓</text>
<circle cx="90" cy="230" r="26" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="226" text-anchor="middle" font-size="11" fill="currentColor">share d₃</text>
<text x="90" y="242" text-anchor="middle" font-size="11" fill="currentColor">✓</text>
<circle cx="90" cy="110" r="18" fill="none" stroke="currentColor" stroke-dasharray="3 3"/>
<circle cx="90" cy="190" r="18" fill="none" stroke="currentColor" stroke-dasharray="3 3"/>
<text x="150" y="115" font-size="11" fill="currentColor">d₄, d₅ offline</text>
<rect x="300" y="115" width="130" height="70" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="365" y="145" text-anchor="middle" font-size="12" fill="currentColor">TSS protocol</text>
<text x="365" y="165" text-anchor="middle" font-size="11" fill="currentColor">(3-of-5)</text>
<line x1="116" y1="78" x2="300" y2="140" stroke="currentColor" stroke-width="1"/>
<line x1="116" y1="150" x2="300" y2="150" stroke="currentColor" stroke-width="1"/>
<line x1="116" y1="222" x2="300" y2="160" stroke="currentColor" stroke-width="1"/>
<line x1="430" y1="150" x2="520" y2="150" stroke="currentColor" stroke-width="1.5" marker-end="url(#tah)"/>
<rect x="520" y="110" width="150" height="80" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="595" y="140" text-anchor="middle" font-size="12" fill="currentColor">1 chữ ký σ</text>
<text x="595" y="162" text-anchor="middle" font-size="11" fill="currentColor">verify bằng</text>
<text x="595" y="178" text-anchor="middle" font-size="11" fill="currentColor">1 public key PK</text>
<defs><marker id="tah" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Hai họ threshold quan trọng:
- **Threshold ECDSA** (GG18/GG20, CMP…): khó vì ECDSA có phép **nghịch đảo `k⁻¹`** khó phân tán; cần nhiều vòng và MPC nặng. Nhưng **tương thích** ví/chain hiện có (Bitcoin, Ethereum EOA) nên là lựa chọn của custodian.
- **Threshold BLS:** **dễ tuyệt vời** vì BLS **tuyến tính**. Chữ ký `σᵢ` của mỗi bên là một Shamir share của `σ`, ghép lại bằng **nội suy Lagrange ngay trên điểm nhóm** — non-interactive, một vòng. Đây là lý do nhiều hệ dùng threshold BLS cho **randomness beacon** (drand), **DKG**, cầu nối.

Khác biệt với multisig: multisig ghép **`t` chữ ký rời** và verify từng cái on-chain; threshold ghép chúng thành **một** chữ ký **trước khi** lên chain → gọn, rẻ, kín.

---

## 6. BLS signature & aggregation

### 6.1 Sơ đồ chữ ký

BLS (Boneh–Lynn–Shacham) trên đường cong pairing, với `H` là hàm **hash-to-curve** (băm message thành một điểm trên G1):

```
Khóa:     sk = x (scalar ngẫu nhiên),   PK = x·g2        (điểm trên G2)
Ký:       σ = x · H(m)                                    (điểm trên G1)
Verify:   e(σ, g2) = e(H(m), PK)
```

Kiểm chứng tính đúng bằng song tuyến:

```
e(σ, g2) = e(x·H(m), g2) = e(H(m), g2)^x = e(H(m), x·g2) = e(H(m), PK)  ✓
```

Chữ ký BLS chỉ **48 byte** (một điểm G1 nén), **tất định** (deterministic, không cần nonce ngẫu nhiên như ECDSA → tránh cả lớp lỗi lộ khóa do nonce yếu).

### 6.2 Aggregation — gộp N chữ ký thành 1

Đây là siêu năng lực của BLS: **cộng các chữ ký lại** là ra chữ ký gộp.

<svg viewBox="0 0 700 260" role="img" aria-labelledby="bls-t bls-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="bls-t">BLS signature aggregation</title>
<desc id="bls-d">Nhiều validator ký cùng một message, các chữ ký được cộng thành một chữ ký gộp duy nhất verify bằng một pairing</desc>
<rect x="30" y="30" width="150" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="55" text-anchor="middle" font-size="12" fill="currentColor">σ₁ = x₁·H(m)</text>
<rect x="30" y="90" width="150" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="115" text-anchor="middle" font-size="12" fill="currentColor">σ₂ = x₂·H(m)</text>
<rect x="30" y="150" width="150" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="175" text-anchor="middle" font-size="12" fill="currentColor">σ₃ = x₃·H(m)</text>
<text x="105" y="222" text-anchor="middle" font-size="12" fill="currentColor">… hàng nghìn validator</text>
<line x1="180" y1="50" x2="300" y2="105" stroke="currentColor" stroke-width="1"/>
<line x1="180" y1="110" x2="300" y2="115" stroke="currentColor" stroke-width="1"/>
<line x1="180" y1="170" x2="300" y2="125" stroke="currentColor" stroke-width="1"/>
<rect x="300" y="90" width="140" height="60" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="370" y="115" text-anchor="middle" font-size="12" fill="currentColor">σ_agg = Σ σᵢ</text>
<text x="370" y="135" text-anchor="middle" font-size="11" fill="currentColor">vẫn chỉ 48 byte</text>
<line x1="440" y1="120" x2="500" y2="120" stroke="currentColor" stroke-width="1.5" marker-end="url(#bah)"/>
<rect x="500" y="80" width="180" height="80" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="590" y="108" text-anchor="middle" font-size="11" fill="currentColor">Verify 1 lần:</text>
<text x="590" y="130" text-anchor="middle" font-size="11" fill="#10b981">e(σ_agg, g2) =</text>
<text x="590" y="148" text-anchor="middle" font-size="11" fill="#10b981">e(H(m), Σ PKᵢ)</text>
<defs><marker id="bah" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Cùng một message `m`** (trường hợp Ethereum consensus): gộp cả chữ ký lẫn public key.

```
σ_agg = Σ σᵢ        PK_agg = Σ PKᵢ
Verify:  e(σ_agg, g2) = e(H(m), PK_agg)      # chỉ 2 pairing, bất kể có bao nhiêu người ký
```

**Message khác nhau `mᵢ`:** vẫn gộp được chữ ký, nhưng verify cần một pairing cho mỗi message riêng:

```
e(σ_agg, g2) = Π e(H(mᵢ), PKᵢ)
```

Ví dụ dùng `py_ecc` (thư viện tham chiếu của Ethereum):

```python
from py_ecc.bls import G2ProofOfPossession as bls

sks = [111, 222, 333]                      # ba secret key (demo)
pks = [bls.SkToPk(sk) for sk in sks]
msg = b"attestation for slot 12345"

sigs = [bls.Sign(sk, msg) for sk in sks]   # mỗi validator ký cùng message
agg_sig = bls.Aggregate(sigs)              # gộp thành 1 chữ ký 96 byte (G2 variant)

# Verify tập thể chỉ với danh sách PK + 1 chữ ký gộp:
assert bls.FastAggregateVerify(pks, msg, agg_sig)
```

### 6.3 Cạm bẫy: Rogue Key Attack & Proof of Possession

Nếu cho phép cộng PK tùy ý, kẻ tấn công công bố `PK_evil = PK_target' − PK_honest` (một khóa "giả" tính từ khóa người khác) rồi giả mạo chữ ký gộp cho cả nhóm. Hai lớp phòng thủ:
- **Proof of Possession (PoP):** mỗi validator phải **chứng minh biết sk** ứng với PK khi đăng ký (ký chính PK của mình). Ethereum dùng scheme `G2ProofOfPossession` — chính vì thế bằng chứng nạp validator gồm cả PoP.
- **Message augmentation / trộn hệ số:** cách khác là buộc mỗi bên ký `PKᵢ‖m` hoặc nhân chữ ký với hệ số ngẫu nhiên khác nhau.

### 6.4 BLS trong Ethereum consensus

| Vấn đề | BLS giải quyết |
|--------|----------------|
| **Hàng trăm nghìn validator** ký attestation mỗi epoch | Gộp chữ ký cùng slot/committee thành **một** → block gọn, verify nhanh |
| **Băng thông** | 96 byte/attestation gộp thay vì mỗi validator một chữ ký ~ vài chục nghìn byte |
| **Sync committee (light client)** | 512 validator ký, gộp 1 chữ ký để light client verify trạng thái chỉ với `e()` |
| **Không cần nonce** | Deterministic → tránh lỗi lộ khóa kiểu nonce trùng của ECDSA |

So sánh nhanh với **Schnorr aggregation (MuSt2, dùng cho Bitcoin Taproot)**: Schnorr cũng gộp được nhưng cần **nhiều vòng tương tác** để sinh nonce chung; BLS **non-interactive** — ai ký lúc nào cũng được, cộng lại là xong. Đổi lại BLS cần **pairing** (nặng hơn để verify) và một đường cong đặc biệt.

---

## 7. Bảng tổng kết — chọn công cụ nào?

| Công cụ | Bài toán giải | Ứng dụng blockchain điển hình |
|---------|---------------|-------------------------------|
| **KZG commitment** | Cam kết dữ liệu/đa thức + chứng minh giá trị, proof hằng số | PLONK, EIP-4844 blob, danksharding DAS, Verkle tree |
| **MPC** | Nhiều bên tính chung trên dữ liệu bí mật | MPC wallet, DKG, đấu giá kín, tính toán riêng tư |
| **Threshold sig (t-of-n)** | `t` bên tạo **1** chữ ký, không ai cầm full key | Custodian, randomness beacon, cầu nối, DKG |
| **BLS + aggregation** | Gộp N chữ ký thành 1, verify tập thể | Ethereum consensus, sync committee, threshold BLS |

---

## 8. Tóm tắt
- **Pairing song tuyến** là nền chung: cho phép kiểm tra quan hệ nhân trên các giá trị bị "khóa" trong điểm nhóm.
- **KZG** cam kết cả đa thức bằng **một điểm**, chứng minh giá trị bằng **một điểm** — proof hằng số 48 byte; cần **trusted setup** (đã được rửa an toàn bằng MPC ceremony 140k người). Là xương sống của PLONK và danksharding.
- **MPC** để nhiều bên tính chung mà giữ kín đầu vào; **Shamir secret sharing** (`t-of-n`) là viên gạch nền. **MPC wallet** ký mà private key **không bao giờ được lắp ráp**.
- **Threshold signature** biến `t-of-n` thành **một** chữ ký/một public key; threshold BLS đặc biệt dễ nhờ tính tuyến tính.
- **BLS** cho chữ ký 48 byte, deterministic, và **aggregation non-interactive** — nền của Ethereum consensus. Nhớ **Proof of Possession** để chặn **rogue key attack**.

> **Bài tiếp theo:** đi sâu vào **zero-knowledge proofs & zkEVM** — nơi KZG, pairing và các cam kết đa thức hợp lại thành hệ chứng minh hoàn chỉnh cho rollup.
