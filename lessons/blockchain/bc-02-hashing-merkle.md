# Bài 2 — Hàm băm (SHA-256) & cây Merkle

## 1. Mục tiêu
Sau bài này bạn có thể:
- Định nghĩa **hàm băm mật mã** và nêu đúng 5 tính chất: **deterministic, one-way (pre-image resistant), avalanche, collision-resistant, second pre-image resistant**.
- Giải thích **vì sao SHA-256 khiến "sửa quá khứ là bất khả"** trong blockchain.
- Phân biệt hash **mật mã** với hash thường (CRC32, hashmap) và biết dùng cái nào.
- Dựng **cây Merkle**, tính **Merkle root**, và hiểu vì sao đổi 1 bit lá làm đổi cả root.
- Đọc và kiểm tra một **Merkle proof** — nền tảng của **light client / SPV**.
- Viết code băm SHA-256 và verify Merkle proof (chạy được).

---

## 2. Lý thuyết

### 2.1 Analogy — chiếc máy xay sinh tố một chiều

Hàm băm giống một **máy xay sinh tố**: bỏ táo vào ra sinh tố táo, y hệt mỗi lần (deterministic). Nhưng cầm ly sinh tố thì **không cách nào ghép lại quả táo** (one-way). Thêm **một hạt muối** cũng ra ly sinh tố khác hẳn về mọi mặt (avalanche). Và gần như **không thể tìm hai công thức khác nhau ra đúng cùng một ly** (collision-resistant).

Về bản chất: **hàm băm mật mã** `H` biến dữ liệu độ dài bất kỳ thành một chuỗi **độ dài cố định** (digest). Với SHA-256, output luôn là **256 bit = 32 byte = 64 ký tự hex**, dù input là 1 byte hay 1 GB.

```
H("hello")  = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
H("hellp")  = 7f8e...hoàn toàn khác...  (đổi 1 chữ → digest lệch ~50% số bit)
H("hello")  = 2cf24dba...  (lặp lại → LUÔN giống lần trước)
```

### 2.2 Năm tính chất — và vì sao mỗi cái quan trọng

| Tính chất | Nghĩa | Vì sao blockchain cần |
|-----------|-------|-----------------------|
| **Deterministic** | Cùng input → luôn cùng output | Mọi node tính lại hash phải khớp nhau, nếu không cả mạng không đồng thuận được |
| **One-way (pre-image resistance)** | Cho `h`, không thể tìm ra `x` sao cho `H(x)=h` (ngoài dò vét cạn 2²⁵⁶) | Bảo vệ commit/địa chỉ; không lộ dữ liệu gốc từ hash |
| **Second pre-image resistance** | Cho `x₁`, không tìm được `x₂≠x₁` với `H(x₂)=H(x₁)` | Không ai thay được một giao dịch cụ thể bằng bản giả cùng hash |
| **Collision resistance** | Không tìm được **bất kỳ** cặp `x₁≠x₂` mà `H(x₁)=H(x₂)` | Nền tảng của Merkle tree & tính bất biến; SHA-256 cho ~2¹²⁸ độ khó (nghịch lý sinh nhật) |
| **Avalanche** | Đổi 1 bit input → mỗi bit output đổi với xác suất ~50% | Không thể "chỉnh nhẹ" dữ liệu mà giữ hash gần giống; sửa 1 xu là đổi toàn bộ digest |

**Fixed-size + avalanche = digest như dấu vân tay.** Không suy ngược ra bản gốc, nhưng ai có bản gốc đều kiểm chứng được. Đó chính là thứ ta cần để "niêm phong" dữ liệu.

> ⚠️ **Phân biệt hash mật mã vs hash thường.** CRC32 hay hàm hash của HashMap cũng cho output cố định và deterministic, nhưng **KHÔNG** one-way và **KHÔNG** collision-resistant — cố tình tạo va chạm rất dễ. Chúng chỉ để phát hiện lỗi ngẫu nhiên / phân bố khóa, **tuyệt đối không** dùng cho bảo mật. Cũng đừng dùng **MD5, SHA-1** (đã bị phá collision — Google SHAttered 2017). Blockchain dùng SHA-256 (Bitcoin), Keccak-256 (Ethereum), BLAKE2/3...

### 2.3 SHA-256 hoạt động thế nào (đủ để hiểu, không cần thuộc)

SHA-256 thuộc họ SHA-2, thiết kế theo cấu trúc **Merkle–Damgård**:

<svg viewBox="0 0 720 220" role="img" aria-labelledby="sha-t sha-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="sha-t">Cấu trúc nén Merkle–Damgård của SHA-256</title>
<desc id="sha-d">Input được đệm rồi chia thành các block 512 bit, lần lượt nén cùng trạng thái 256 bit để ra digest cuối</desc>
<rect x="20" y="90" width="90" height="44" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="65" y="108" text-anchor="middle" font-size="11" fill="currentColor">Message</text>
<text x="65" y="124" text-anchor="middle" font-size="11" fill="currentColor">+ padding</text>
<text x="200" y="70" text-anchor="middle" font-size="11" fill="currentColor">block 512b</text>
<text x="360" y="70" text-anchor="middle" font-size="11" fill="currentColor">block 512b</text>
<text x="520" y="70" text-anchor="middle" font-size="11" fill="currentColor">block 512b</text>
<rect x="160" y="90" width="80" height="44" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="200" y="116" text-anchor="middle" font-size="12" fill="currentColor">f</text>
<rect x="320" y="90" width="80" height="44" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="116" text-anchor="middle" font-size="12" fill="currentColor">f</text>
<rect x="480" y="90" width="80" height="44" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="520" y="116" text-anchor="middle" font-size="12" fill="currentColor">f</text>
<rect x="620" y="90" width="80" height="44" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="660" y="110" text-anchor="middle" font-size="11" fill="currentColor">digest</text>
<text x="660" y="126" text-anchor="middle" font-size="11" fill="currentColor">256 bit</text>
<line x1="110" y1="112" x2="158" y2="112" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<line x1="240" y1="112" x2="318" y2="112" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<line x1="400" y1="112" x2="478" y2="112" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<line x1="560" y1="112" x2="618" y2="112" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<text x="279" y="106" text-anchor="middle" font-size="10" fill="currentColor">state</text>
<text x="439" y="106" text-anchor="middle" font-size="10" fill="currentColor">state</text>
<text x="360" y="170" text-anchor="middle" font-size="11" fill="currentColor">Mỗi hàm nén f: 64 vòng trộn bit (AND, XOR, dịch/quay, cộng mod 2³²)</text>
<text x="360" y="192" text-anchor="middle" font-size="11" fill="currentColor">Trạng thái ban đầu = 8 hằng số từ căn bậc hai của 8 số nguyên tố đầu</text>
<defs><marker id="a2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Các bước: (1) **padding** cho độ dài chia hết 512 bit và nhét độ dài gốc vào cuối; (2) khởi tạo **trạng thái 256 bit** bằng 8 hằng số; (3) với mỗi block 512 bit, chạy **hàm nén f** gồm 64 vòng trộn bit (phép quay, dịch, XOR, AND, cộng modulo); (4) trạng thái cuối chính là digest. Chính vòng lặp trộn bit dày đặc này tạo ra **avalanche** — không có cấu trúc tuyến tính nào để "đi ngược".

> Bitcoin thực ra dùng **double SHA-256** — `SHA256(SHA256(x))` — để phòng một số tấn công mở rộng độ dài (length-extension) vốn có ở cấu trúc Merkle–Damgård.

### 2.4 Vì sao hash làm dữ liệu bất biến

Mỗi block chứa hash của block trước → tạo thành **chuỗi liên kết mật mã**. Muốn sửa 1 giao dịch ở block cũ:
1. Hash của block đó đổi (avalanche) →
2. Block sau đang trỏ tới hash cũ nên **đứt liên kết** →
3. Phải tính lại hash cho **toàn bộ** block phía sau →
4. Trong PoW còn phải làm lại toàn bộ công proof-of-work đó **nhanh hơn cả mạng** đang đào tiếp — bất khả về kinh tế (Bài 4 & Chương 2).

Hash không "khóa" dữ liệu, nó khiến mọi thay đổi **lộ ra ngay lập tức** khi bất kỳ ai tính lại và so sánh.

### 2.5 Cây Merkle — nén hàng nghìn giao dịch thành 1 hash

Một block có thể chứa hàng nghìn giao dịch. Nếu chỉ băm nối tất cả lại, muốn chứng minh "giao dịch T nằm trong block" bạn phải tải **toàn bộ** giao dịch. **Cây Merkle** (Merkle tree / hash tree) giải quyết bằng cách băm **theo cặp, từ dưới lên**:

- **Lá (leaf):** hash của từng giao dịch — `H(Tx)`.
- **Nút trong:** hash của **nối hai hash con** — `H(left ‖ right)`.
- Lặp lên đến khi còn **một hash duy nhất: Merkle root**.

<svg viewBox="0 0 720 300" role="img" aria-labelledby="mk-t mk-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="mk-t">Cây Merkle với 4 giao dịch</title>
<desc id="mk-d">Bốn giao dịch băm thành bốn lá, ghép cặp lên hai nút trung gian rồi lên một Merkle root duy nhất</desc>
<rect x="290" y="20" width="140" height="42" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="40" text-anchor="middle" font-size="12" fill="currentColor">Merkle Root</text>
<text x="360" y="56" text-anchor="middle" font-size="11" fill="currentColor">H(H01 ‖ H23)</text>
<rect x="140" y="120" width="120" height="42" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="200" y="140" text-anchor="middle" font-size="12" fill="currentColor">H01</text>
<text x="200" y="156" text-anchor="middle" font-size="10" fill="currentColor">H(H0 ‖ H1)</text>
<rect x="460" y="120" width="120" height="42" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="520" y="140" text-anchor="middle" font-size="12" fill="currentColor">H23</text>
<text x="520" y="156" text-anchor="middle" font-size="10" fill="currentColor">H(H2 ‖ H3)</text>
<rect x="70" y="220" width="90" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="238" text-anchor="middle" font-size="11" fill="currentColor">H0=H(Tx0)</text>
<text x="115" y="253" text-anchor="middle" font-size="10" fill="currentColor">Tx0</text>
<rect x="180" y="220" width="90" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="225" y="238" text-anchor="middle" font-size="11" fill="currentColor">H1=H(Tx1)</text>
<text x="225" y="253" text-anchor="middle" font-size="10" fill="currentColor">Tx1</text>
<rect x="450" y="220" width="90" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="495" y="238" text-anchor="middle" font-size="11" fill="currentColor">H2=H(Tx2)</text>
<text x="495" y="253" text-anchor="middle" font-size="10" fill="currentColor">Tx2</text>
<rect x="560" y="220" width="90" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="605" y="238" text-anchor="middle" font-size="11" fill="currentColor">H3=H(Tx3)</text>
<text x="605" y="253" text-anchor="middle" font-size="10" fill="currentColor">Tx3</text>
<line x1="290" y1="50" x2="200" y2="120" stroke="currentColor" stroke-width="1.5"/>
<line x1="430" y1="50" x2="520" y2="120" stroke="currentColor" stroke-width="1.5"/>
<line x1="180" y1="162" x2="115" y2="220" stroke="currentColor" stroke-width="1.5"/>
<line x1="220" y1="162" x2="225" y2="220" stroke="currentColor" stroke-width="1.5"/>
<line x1="500" y1="162" x2="495" y2="220" stroke="currentColor" stroke-width="1.5"/>
<line x1="540" y1="162" x2="605" y2="220" stroke="currentColor" stroke-width="1.5"/>
<text x="360" y="290" text-anchor="middle" font-size="11" fill="currentColor">Đổi 1 bit ở Tx2 → H2 đổi → H23 đổi → Merkle Root đổi. Root là "vân tay" của cả block.</text>
</svg>

Merkle root nằm trong **block header**. Vì tính từ dưới lên, **bất kỳ** thay đổi ở **bất kỳ** giao dịch nào cũng làm root đổi → header đổi → hash block đổi. Root = cam kết (commitment) gọn cho toàn bộ tập giao dịch.

> Chi tiết cài đặt: nếu số nút ở một tầng **lẻ**, thường **nhân đôi nút cuối** để ghép cặp (Bitcoin làm vậy). Cách xử lý này cũng là nguồn của một lỗi lịch sử (CVE-2012-2459) — cho thấy chi tiết nhỏ trong cây Merkle rất nhạy về bảo mật.

### 2.6 Merkle proof & light client (SPV)

Sức mạnh thật sự của cây Merkle: chứng minh "Tx nằm trong block" mà **không cần tải cả block**. Một **Merkle proof** (authentication path) chỉ gồm các **hash anh em (sibling)** dọc đường từ lá lên root.

Ví dụ chứng minh **Tx2** thuộc block, người xác minh **đã biết Merkle root** (từ header). Proof cần đưa ra: `H3` và `H01`. Người xác minh tự tính:

```
b1 = H( H2 ‖ H3 )      // H2 = H(Tx2) tự băm được, H3 lấy từ proof
b2 = H( H01 ‖ b1 )     // H01 lấy từ proof
so sánh b2 == Merkle root đã biết ?  → nếu khớp, Tx2 chắc chắn thuộc block
```

Với block có **N** giao dịch, proof chỉ cần **log₂(N)** hash. Block 1000 giao dịch → chỉ ~10 hash (~320 byte) thay vì tải cả nghìn giao dịch. Đây chính là **SPV — Simplified Payment Verification** mô tả trong whitepaper Bitcoin: ví trên điện thoại (**light client**) chỉ tải **block header** (80 byte/block) chứ không tải toàn bộ blockchain nhiều trăm GB, rồi xin **full node** một Merkle proof để xác minh giao dịch của mình đã được đưa vào block.

<svg viewBox="0 0 700 250" role="img" aria-labelledby="spv-t spv-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="spv-t">Light client xác minh giao dịch bằng Merkle proof</title>
<desc id="spv-d">Light client giữ block header, xin full node một Merkle proof, tự tính lại root và so với root trong header</desc>
<rect x="30" y="90" width="150" height="70" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="116" text-anchor="middle" font-size="12" fill="currentColor">Light client (SPV)</text>
<text x="105" y="134" text-anchor="middle" font-size="10" fill="currentColor">chỉ có header</text>
<text x="105" y="149" text-anchor="middle" font-size="10" fill="currentColor">→ biết Merkle root</text>
<rect x="520" y="90" width="150" height="70" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="595" y="116" text-anchor="middle" font-size="12" fill="currentColor">Full node</text>
<text x="595" y="134" text-anchor="middle" font-size="10" fill="currentColor">có toàn bộ block</text>
<text x="595" y="149" text-anchor="middle" font-size="10" fill="currentColor">+ dựng được cây</text>
<line x1="180" y1="110" x2="518" y2="110" stroke="currentColor" stroke-width="1.5" marker-end="url(#a3)"/>
<text x="349" y="102" text-anchor="middle" font-size="11" fill="currentColor">"Tx2 có trong block không?"</text>
<line x1="518" y1="145" x2="182" y2="145" stroke="currentColor" stroke-width="1.5" marker-end="url(#a3)"/>
<text x="349" y="163" text-anchor="middle" font-size="11" fill="currentColor">proof = [ H3, H01 ]  (~log₂N hash)</text>
<text x="349" y="205" text-anchor="middle" font-size="11" fill="currentColor">Client tự tính H(H01 ‖ H(H2 ‖ H3)) rồi so với Merkle root trong header</text>
<text x="349" y="226" text-anchor="middle" font-size="11" fill="currentColor">Khớp → tin; full node KHÔNG thể giả proof vì collision-resistant</text>
<defs><marker id="a3" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Điểm cốt lõi về **niềm tin**: full node **không cần đáng tin**. Nó không thể bịa một proof giả cho giao dịch không tồn tại, vì làm vậy đòi hỏi tìm **collision** của SHA-256 — bất khả. Điều tệ nhất một full node độc hại làm được là **từ chối trả proof** (client hỏi node khác). Đây là lý do SPV cho phép hàng triệu ví di động hoạt động an toàn mà không cần lưu cả blockchain.

> Ethereum đẩy ý tưởng này xa hơn với **Merkle Patricia Trie** — cây Merkle có khóa, cam kết cho toàn bộ **trạng thái** (số dư, storage) chứ không chỉ danh sách giao dịch (Bài về Ethereum).

---

## 3. Code — băm SHA-256 & verify Merkle proof

Ví dụ bằng Python (thư viện chuẩn `hashlib`, không cần cài thêm). Dùng double-SHA-256 kiểu Bitcoin cho sát thực tế.

```python
import hashlib

def sha256d(b: bytes) -> bytes:
    """Double SHA-256 như Bitcoin: chống length-extension."""
    return hashlib.sha256(hashlib.sha256(b).digest()).digest()

def hexs(b: bytes) -> str:
    return b.hex()

# 1) Avalanche: đổi 1 ký tự → digest khác hẳn
print(hashlib.sha256(b"hello").hexdigest())
print(hashlib.sha256(b"hellp").hexdigest())  # lệch ~50% số bit

# 2) Dựng Merkle root từ danh sách giao dịch (bytes)
def merkle_root(txs: list[bytes]) -> bytes:
    if not txs:
        return b"\x00" * 32
    level = [sha256d(t) for t in txs]          # lá
    while len(level) > 1:
        if len(level) % 2 == 1:                # lẻ → nhân đôi nút cuối (kiểu Bitcoin)
            level.append(level[-1])
        level = [sha256d(level[i] + level[i+1])
                 for i in range(0, len(level), 2)]
    return level[0]

# 3) Sinh Merkle proof cho giao dịch ở vị trí index
def merkle_proof(txs: list[bytes], index: int) -> list[tuple[bytes, str]]:
    level = [sha256d(t) for t in txs]
    proof = []
    while len(level) > 1:
        if len(level) % 2 == 1:
            level.append(level[-1])
        sib = index ^ 1                         # anh em: đảo bit thấp nhất
        side = "right" if index % 2 == 0 else "left"
        proof.append((level[sib], side))
        index //= 2
        level = [sha256d(level[i] + level[i+1])
                 for i in range(0, len(level), 2)]
    return proof

# 4) Verify: chỉ cần leaf hash + proof + root (KHÔNG cần cả block)
def verify(leaf_tx: bytes, proof: list[tuple[bytes, str]], root: bytes) -> bool:
    h = sha256d(leaf_tx)
    for sibling, side in proof:
        h = sha256d(h + sibling) if side == "right" else sha256d(sibling + h)
    return h == root

# --- Demo ---
txs = [b"Alice->Bob:1", b"Bob->Carol:2", b"Carol->Dan:3", b"Dan->Eve:4"]
root = merkle_root(txs)
proof = merkle_proof(txs, index=2)              # chứng minh Tx2 = "Carol->Dan:3"

print("root :", hexs(root))
print("proof:", [(hexs(h)[:12] + "...", s) for h, s in proof])
print("valid:", verify(txs[2], proof, root))    # True
print("tamper:", verify(b"Carol->Dan:999", proof, root))  # False — sửa là lộ
```

**Giải thích:**
- `sha256d` — double SHA-256; `.digest()` trả **bytes thô** (nối bytes rồi băm tiếp, không băm chuỗi hex).
- `merkle_root` băm **từng cặp từ dưới lên**; tầng lẻ nhân đôi nút cuối.
- `merkle_proof` với vị trí `index`, anh em là `index ^ 1`; `side` cho biết ghép trái/phải để **thứ tự nối đúng** (nối sai thứ tự ra hash khác).
- `verify` chỉ dùng **leaf + proof + root** — đúng mô hình SPV: dữ liệu nhỏ, không cần cả block. Sửa 1 ký tự trong giao dịch làm leaf hash đổi → root tính lại **không khớp** → trả `False`.

Chạy: `python3 merkle.py`. Độ dài proof là `log₂(N)` — với 4 giao dịch proof có 2 phần tử.

---

## 4. Tóm tắt
- **Hàm băm mật mã** biến dữ liệu bất kỳ thành digest **cố định** (SHA-256 = 256 bit) với 5 tính chất: deterministic, one-way, second pre-image & collision resistant, avalanche.
- Đừng nhầm với hash thường (CRC/hashmap) hay hash đã vỡ (MD5/SHA-1) — chúng **không** an toàn mật mã.
- Hash làm dữ liệu **bất biến** không bằng cách khóa, mà bằng cách khiến **mọi thay đổi lộ ra ngay** khi tính lại và so sánh; chuỗi block trỏ nhau bằng hash nhân hiệu ứng đó lên toàn chain.
- **Cây Merkle** nén hàng nghìn giao dịch thành **một Merkle root** trong header — vân tay của cả block.
- **Merkle proof** chỉ cần `log₂(N)` hash để chứng minh một giao dịch thuộc block, cho phép **light client / SPV** xác minh mà không tải cả blockchain và **không phải tin** full node.

> **Bài tiếp theo (Bài 3):** trụ cột mật mã thứ hai — **mật mã khóa công khai & chữ ký số (ECDSA)**: cách ký giao dịch bằng private key và ai cũng verify được bằng public key.
