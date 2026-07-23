# Bài 4 — Cấu trúc block & chain, tính bất biến

## 1. Mục tiêu
Sau bài này bạn có thể:
- Mô tả chính xác **các trường trong block header**: prev hash, Merkle root, timestamp, nonce, difficulty (bits), version.
- Giải thích **chain được liên kết bằng hash như thế nào** — mỗi block "chỉ tay" về block trước bằng chính hash của nó.
- Chứng minh **vì sao sửa 1 block phá vỡ toàn bộ chuỗi sau nó** (hiệu ứng domino của hash).
- Hiểu **genesis block** — block đầu tiên không có "cha", được hard-code trong client.
- Phân biệt rõ **bất biến (immutability)** là *bất biến kinh tế/xác suất*, không phải "không thể sửa về mặt vật lý".

---

## 2. Lý thuyết

### 2.1 Analogy — chồng niêm phong sáp

Tưởng tượng bạn viết nhật ký, mỗi trang xong thì **niêm phong bằng sáp**, và **dấu niêm phong của trang mới được nặn từ chính dấu niêm phong của trang trước**. Nếu ai đó lén sửa một chữ ở trang 5, dấu sáp trang 5 đổi → dấu trang 6 (vốn nặn từ dấu trang 5) không còn khớp → trang 7 sai theo... đổ domino tới trang cuối. Người kiểm tra chỉ cần nhìn **một dấu duy nhất ở trang cuối** là biết cả cuốn có bị đụng vào hay không.

Blockchain làm đúng vậy, nhưng "dấu sáp" là **hàm băm mật mã** (Bài 2): đổi 1 bit đầu vào → hash đổi hoàn toàn, và **không thể đi ngược** từ hash ra dữ liệu. Đó là nền tảng của **tính bất biến**.

### 2.2 Một block gồm hai phần

Một block **không phải** chỉ là "một cục giao dịch". Nó tách rõ hai phần:

| Phần | Chứa gì | Vai trò |
|------|---------|---------|
| **Block header** (~80 bytes ở Bitcoin) | 6 trường metadata (xem 2.3) | Phần được **băm** để ra block hash; phần miner "quay" khi đào |
| **Block body** | Danh sách đầy đủ các transaction | Dữ liệu thật; được nén xuống **1 giá trị Merkle root** trong header |

Điểm mấu chốt: **hash của block = hash của riêng header**, KHÔNG băm lại toàn bộ giao dịch. Toàn bộ hàng nghìn giao dịch được "đại diện" bởi **Merkle root** — chỉ 32 bytes — nằm trong header. Nhờ vậy băm 1 block rất rẻ dù block chứa vài nghìn tx.

### 2.3 Giải phẫu block header (Bitcoin)

<svg viewBox="0 0 640 360" role="img" aria-labelledby="hd-t hd-d" style="width:100%;max-width:560px;height:auto;display:block;margin:1.25rem auto">
<title id="hd-t">Cấu trúc block header Bitcoin</title>
<desc id="hd-d">Sáu trường trong header gồm version, previous hash, Merkle root, timestamp, difficulty bits và nonce, tất cả được băm hai lần để ra block hash</desc>
<rect x="60" y="20" width="360" height="300" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="240" y="44" text-anchor="middle" font-size="15" fill="currentColor">Block Header (~80 bytes)</text>
<rect x="80" y="58" width="320" height="36" rx="6" fill="none" stroke="currentColor"/>
<text x="92" y="81" font-size="12" fill="currentColor">version — luật/định dạng block (4B)</text>
<rect x="80" y="100" width="320" height="36" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="92" y="123" font-size="12" fill="currentColor">prev block hash — trỏ về block trước (32B)</text>
<rect x="80" y="142" width="320" height="36" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="92" y="165" font-size="12" fill="currentColor">Merkle root — tóm tắt mọi tx (32B)</text>
<rect x="80" y="184" width="320" height="36" rx="6" fill="none" stroke="currentColor"/>
<text x="92" y="207" font-size="12" fill="currentColor">timestamp — thời điểm đào (4B)</text>
<rect x="80" y="226" width="320" height="36" rx="6" fill="none" stroke="currentColor"/>
<text x="92" y="249" font-size="12" fill="currentColor">bits — difficulty target nén (4B)</text>
<rect x="80" y="268" width="320" height="36" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="92" y="291" font-size="12" fill="currentColor">nonce — số miner quay để dò (4B)</text>
<line x1="420" y1="170" x2="470" y2="170" stroke="currentColor" stroke-width="1.5" marker-end="url(#ha)"/>
<rect x="470" y="140" width="150" height="60" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="545" y="166" text-anchor="middle" font-size="12" fill="currentColor">SHA-256d</text>
<text x="545" y="184" text-anchor="middle" font-size="12" fill="currentColor">= Block Hash</text>
<defs><marker id="ha" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Từng trường, giải thích bản chất:

- **version**: cho node biết block tuân theo bộ luật nào (dùng để bật soft-fork). Nhỏ nhưng vẫn nằm trong phần được băm.
- **prev block hash** (previous block hash): hash của header block **liền trước**. Đây chính là **sợi xích** nối chain — trường quan trọng nhất của bài này. Chính vì prev hash nằm *bên trong* header và header được băm, nên hash của block N **phụ thuộc** vào hash block N-1.
- **Merkle root**: gốc của **cây Merkle** (Bài 2) dựng từ tất cả tx trong body. Đổi *bất kỳ* tx nào → Merkle root đổi → header đổi → block hash đổi. Nó là "vân tay" của toàn bộ tập giao dịch.
- **timestamp**: thời điểm miner tạo block (Unix time). Không cần chính xác tuyệt đối; mạng chỉ yêu cầu nó lớn hơn trung vị 11 block trước và không vượt quá 2 giờ so với giờ mạng.
- **bits (difficulty target)**: mã hóa **ngưỡng độ khó** — block hash phải **nhỏ hơn hoặc bằng** target này thì mới hợp lệ. Target càng nhỏ → càng khó tìm → càng nhiều hash phải thử. Đây là "khóa" của Proof-of-Work (Chương 2).
- **nonce**: con số 32-bit miner **thay đổi liên tục** để mỗi lần băm ra một hash khác, dò cho tới khi hash ≤ target. Vì nonce chỉ 32-bit (~4 tỉ giá trị) thường không đủ, miner còn quay thêm timestamp và **extra-nonce** trong coinbase tx.

> **Ghi nhớ:** miner **không** đổi được prev hash hay các tx (sẽ hỏng chain / hỏng Merkle root). Thứ họ được phép "quay" là **nonce** (+timestamp, +extra-nonce). Đào coin = brute-force nonce cho tới khi header hash rơi dưới target.

### 2.4 Chain: hash nối hash

Mỗi block lưu **prev hash** = block hash của block trước. Vì block hash được tính TỪ header, và header CHỨA prev hash, ta có một chuỗi phụ thuộc bắc cầu:

`hash(block N)` phụ thuộc `prev_hash` (= `hash(block N-1)`) phụ thuộc `hash(block N-2)` ... tới tận **genesis**.

<svg viewBox="0 0 700 210" role="img" aria-labelledby="ch-t ch-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="ch-t">Chuỗi block liên kết bằng prev hash</title>
<desc id="ch-d">Ba block nối tiếp, mỗi block chứa hash của chính nó và prev hash trỏ về hash của block liền trước</desc>
<rect x="20" y="60" width="180" height="110" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="110" y="84" text-anchor="middle" font-size="13" fill="currentColor">Block 51 (Genesis-side)</text>
<text x="110" y="112" text-anchor="middle" font-size="11" fill="currentColor">prev: 0000ab..</text>
<text x="110" y="132" text-anchor="middle" font-size="11" fill="currentColor">merkle: 9f3c..</text>
<text x="110" y="152" text-anchor="middle" font-size="11" fill="#10b981">hash: 00c1d7..</text>
<rect x="260" y="60" width="180" height="110" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="84" text-anchor="middle" font-size="13" fill="currentColor">Block 52</text>
<text x="350" y="112" text-anchor="middle" font-size="11" fill="#f59e0b">prev: 00c1d7..</text>
<text x="350" y="132" text-anchor="middle" font-size="11" fill="currentColor">merkle: 2a8e..</text>
<text x="350" y="152" text-anchor="middle" font-size="11" fill="#3b82f6">hash: 00f4b2..</text>
<rect x="500" y="60" width="180" height="110" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="590" y="84" text-anchor="middle" font-size="13" fill="currentColor">Block 53</text>
<text x="590" y="112" text-anchor="middle" font-size="11" fill="#f59e0b">prev: 00f4b2..</text>
<text x="590" y="132" text-anchor="middle" font-size="11" fill="currentColor">merkle: 71dd..</text>
<text x="590" y="152" text-anchor="middle" font-size="11" fill="#8b5cf6">hash: 00b9e0..</text>
<line x1="350" y1="105" x2="205" y2="147" stroke="currentColor" stroke-width="1.5" marker-end="url(#ca)"/>
<line x1="590" y1="105" x2="445" y2="147" stroke="currentColor" stroke-width="1.5" marker-end="url(#ca)"/>
<text x="350" y="196" text-anchor="middle" font-size="11" fill="currentColor">prev hash của mỗi block = hash của block liền trước → xích mật mã</text>
<defs><marker id="ca" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Chú ý mũi tên **trỏ ngược**: block mới trỏ về block cũ, không phải ngược lại. Blockchain là **danh sách liên kết một chiều bằng hash** — bạn luôn biết "cha" của một block, nhưng một block không cần biết "con" của nó.

### 2.5 Vì sao sửa 1 block phá vỡ toàn bộ chuỗi sau

Đây là trái tim của tính bất biến. Giả sử kẻ tấn công muốn sửa **1 giao dịch** trong Block 52 (ví dụ đổi người nhận). Chuỗi domino:

1. Đổi tx → **Merkle root** của Block 52 đổi (vân tay tx thay đổi).
2. Merkle root nằm trong header → **hash của Block 52** đổi từ `00f4b2..` thành `X`.
3. Nhưng Block 53 lưu `prev = 00f4b2..`. Giờ `00f4b2..` không còn tồn tại → **Block 53 trỏ vào hư không** → chain đứt.
4. Muốn "vá", kẻ tấn công phải sửa `prev` của Block 53 thành `X`. Nhưng làm vậy → **hash Block 53 đổi** → tới lượt Block 54 đứt...
5. Domino chạy tới **block mới nhất**. Kẻ tấn công phải **đào lại (re-mine) mọi block từ 52 tới đỉnh** — mỗi block đều phải tìm lại nonce thỏa mãn difficulty.

<svg viewBox="0 0 700 200" role="img" aria-labelledby="tm-t tm-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="tm-t">Hiệu ứng domino khi sửa một block</title>
<desc id="tm-d">Sửa Block 52 làm hash đổi khiến Block 53 và 54 mất liên kết và phải đào lại</desc>
<rect x="20" y="70" width="160" height="90" rx="10" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="100" y="98" text-anchor="middle" font-size="13" fill="currentColor">Block 52 (bị sửa)</text>
<text x="100" y="122" text-anchor="middle" font-size="11" fill="#f43f5e">merkle đổi → hash đổi</text>
<text x="100" y="142" text-anchor="middle" font-size="11" fill="currentColor">hash: X ≠ 00f4b2</text>
<rect x="270" y="70" width="160" height="90" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="98" text-anchor="middle" font-size="13" fill="currentColor">Block 53</text>
<text x="350" y="122" text-anchor="middle" font-size="11" fill="#f43f5e">prev=00f4b2 ✗</text>
<text x="350" y="142" text-anchor="middle" font-size="11" fill="currentColor">liên kết đứt</text>
<rect x="520" y="70" width="160" height="90" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="600" y="98" text-anchor="middle" font-size="13" fill="currentColor">Block 54</text>
<text x="600" y="122" text-anchor="middle" font-size="11" fill="#f43f5e">đứt theo</text>
<text x="600" y="142" text-anchor="middle" font-size="11" fill="currentColor">phải đào lại</text>
<line x1="270" y1="115" x2="185" y2="115" stroke="#f43f5e" stroke-width="1.5" stroke-dasharray="4 4" marker-end="url(#da)"/>
<line x1="520" y1="115" x2="435" y2="115" stroke="#f43f5e" stroke-width="1.5" stroke-dasharray="4 4" marker-end="url(#da)"/>
<text x="350" y="186" text-anchor="middle" font-size="11" fill="currentColor">Sửa 1 block ⇒ đào lại mọi block phía sau, nhanh hơn cả mạng còn lại — bất khả về kinh tế</text>
<defs><marker id="da" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#f43f5e"/></marker></defs>
</svg>

Và đây là chỗ **đồng thuận** khóa lại: trong khi kẻ tấn công è cổ đào lại một chuỗi cũ, **mạng lương thiện** vẫn đang kéo dài chuỗi thật với **toàn bộ sức mạnh băm (hashpower)** của nó. Node luôn theo **chuỗi có tổng công việc lớn nhất** (heaviest chain). Để chuỗi giả vượt chuỗi thật, kẻ tấn công cần **> 50% hashpower toàn mạng** — tấn công 51%. Càng nhiều block xác nhận chồng lên trên giao dịch của bạn, "độ sâu" càng lớn, chi phí lật ngược càng tăng theo cấp số.

> **Bất biến ≠ "không thể sửa".** Về vật lý bạn *có thể* sửa file block trên đĩa. Nhưng để mạng **chấp nhận** bản sửa, bạn phải làm lại toàn bộ PoW nhanh hơn phần còn lại của thế giới. Bất biến ở đây là **bất biến xác suất/kinh tế**: không phải cấm, mà là **quá đắt để đáng làm**.

### 2.6 Genesis block

**Genesis block** (block #0) là block **đầu tiên**, không có cha. Nó là ngoại lệ duy nhất:

- **prev hash = toàn số 0** (`0000...0000`) — vì không có block nào trước nó.
- Nó **không được đào theo cách thông thường** mà được **hard-code cứng** trong mã nguồn của client (bitcoind, geth...). Mọi node khi khởi động đều bắt đầu từ đúng genesis này — đó là **điểm neo tin cậy chung** (trust anchor) của cả mạng.
- Genesis Bitcoin (03/01/2009) nhúng câu nổi tiếng trong coinbase: *"The Times 03/Jan/2009 Chancellor on brink of second bailout for banks"* — vừa là dấu thời gian, vừa là tuyên ngôn chính trị.

Vì genesis được hard-code giống hệt nhau ở mọi node, và mọi block sau đều bắc cầu về nó bằng prev hash, nên **hai node bất kỳ đồng ý về genesis + cùng quy tắc validate ⇒ sẽ hội tụ về cùng một chain**. Genesis là gốc của cây tin cậy.

---

## 3. Minh họa bằng code

Đoạn Python dưới dây dựng một chain tí hon để **thấy tận mắt** hiệu ứng domino. Chạy được ngay, chỉ dùng thư viện chuẩn.

```python
import hashlib, time, json

def sha256d(data: bytes) -> str:
    # Bitcoin dùng SHA-256 hai lần (double SHA-256)
    return hashlib.sha256(hashlib.sha256(data).digest()).hexdigest()

class Block:
    def __init__(self, index, prev_hash, txs, nonce=0):
        self.index = index
        self.prev_hash = prev_hash          # trỏ về block trước
        self.merkle_root = self._merkle(txs)  # tóm tắt mọi tx
        self.timestamp = int(time.time())
        self.nonce = nonce

    def _merkle(self, txs):
        # Merkle root rút gọn: băm nối các tx (bài 2 giải thích cây đầy đủ)
        return hashlib.sha256(json.dumps(txs, sort_keys=True).encode()).hexdigest()

    def header_bytes(self):
        # CHỈ băm header, không băm lại toàn bộ tx
        h = f"{self.index}|{self.prev_hash}|{self.merkle_root}|{self.timestamp}|{self.nonce}"
        return h.encode()

    def hash(self):
        return sha256d(self.header_bytes())

def mine(block, difficulty=4):
    # Proof-of-Work: quay nonce tới khi hash bắt đầu bằng `difficulty` số 0
    target = "0" * difficulty
    while not block.hash().startswith(target):
        block.nonce += 1
    return block

# --- Dựng chain: genesis + 2 block ---
genesis = mine(Block(0, "0" * 64, ["genesis"]))     # prev = toàn số 0
b1 = mine(Block(1, genesis.hash(), ["alice->bob:5"]))
b2 = mine(Block(2, b1.hash(),      ["bob->carol:3"]))
chain = [genesis, b1, b2]

def is_valid(chain):
    for i in range(1, len(chain)):
        if chain[i].prev_hash != chain[i-1].hash():   # liên kết còn khớp?
            return False, i
    return True, None

print("Chain hợp lệ?", is_valid(chain))               # (True, None)

# --- Kẻ tấn công sửa tx trong block 1 ---
b1.merkle_root = b1._merkle(["alice->attacker:5000"])  # đổi người nhận
print("Sau khi sửa block 1:", is_valid(chain))         # (False, 2) -> b2.prev không còn khớp b1.hash()
```

Kết quả: ngay khi Merkle root của `b1` đổi, `b1.hash()` đổi theo, nên `b2.prev_hash` không còn khớp → `is_valid` trả `(False, 2)`. Muốn hợp lệ lại, kẻ tấn công phải **mine lại b1 rồi mine lại b2** (và mọi block sau) — đúng bản chất domino ở 2.5.

> Lưu ý: đây là mô hình *dạy học*. Merkle thật là một **cây nhị phân** (Bài 2) cho phép chứng minh 1 tx thuộc block mà không cần tải cả block (SPV proof); ở đây ta rút gọn cho dễ đọc.

---

## 4. Bảng tổng hợp các trường header

| Trường | Kích thước (BTC) | Ai đặt / thay đổi | Vai trò với bất biến |
|--------|------------------|-------------------|----------------------|
| version | 4B | Giao thức | Đánh dấu bộ luật |
| **prev hash** | 32B | Cố định theo block trước | **Sợi xích** nối chain |
| **Merkle root** | 32B | Suy ra từ tx | Vân tay của mọi giao dịch |
| timestamp | 4B | Miner (trong biên cho phép) | Thứ tự thời gian, chống backdate |
| bits (difficulty) | 4B | Giao thức (điều chỉnh mỗi 2016 block) | Đặt "giá" của PoW |
| **nonce** | 4B | Miner brute-force | Bằng chứng công sức bỏ ra |

---

## 5. Tóm tắt
- Block = **header (metadata, được băm)** + **body (danh sách tx)**; block hash = hash của **riêng header**.
- Header có 6 trường; hai trường cốt lõi cho bài này là **prev hash** (nối chain) và **Merkle root** (đại diện tx). **nonce + bits** là bộ đôi của Proof-of-Work.
- Chain là **danh sách liên kết một chiều bằng hash**: mỗi block trỏ ngược về cha qua prev hash, bắc cầu tới genesis.
- Sửa 1 block đổi hash của nó → phá liên kết của **mọi block phía sau** → phải đào lại toàn bộ, trong khi mạng lương thiện vẫn kéo dài chuỗi thật. Đó là **bất biến xác suất/kinh tế**, không phải cấm vật lý.
- **Genesis block** (#0) có prev hash toàn số 0, được **hard-code** trong client — điểm neo tin cậy chung của cả mạng.

> **Bài tiếp theo (Bài 5):** từ cấu trúc tĩnh này bước sang **cơ chế đồng thuận** — làm sao cả mạng *đồng ý* block nào được nối tiếp, qua Proof-of-Work và difficulty adjustment.
