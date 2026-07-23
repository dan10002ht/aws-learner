# Bài 53 — Capstone 5: Tự xây blockchain mini từ đầu

## 1. Mục tiêu
Đây là **dự án tổng kết** ghép mọi kiến thức từ Chương 1 đến giờ thành **một blockchain chạy được** — viết bằng Python, không framework, không thư viện blockchain. Sau bài này bạn sẽ tự tay code:
- **Block & hash link** — mỗi block trỏ về block trước bằng `prev_hash`, tạo chuỗi bất biến (Bài 4).
- **PoW mining** — vòng lặp `nonce` cho đến khi hash thỏa `difficulty` (Bài 7).
- **Transaction & mempool** — hàng đợi giao dịch chưa xác nhận (Bài 10, 11).
- **Ví & chữ ký ECDSA** — địa chỉ từ public key, ký/xác minh giao dịch (Bài 3, 5).
- **Validate chain** — kiểm tra tính toàn vẹn end-to-end.
- **P2P đơn giản** — node trao đổi block qua HTTP, đồng bộ bằng luật "longest valid chain wins" (Bài 6, 10).

> Mục tiêu không phải làm ra một chain sản xuất — mà là **hiểu bằng tay** vì sao blockchain bất biến, vì sao PoW tốn công, và vì sao chữ ký khiến không ai tiêu tiền của người khác.

---

## 2. Kiến trúc tổng thể

Sáu mảnh ghép và cách chúng nối vào nhau:

<svg viewBox="0 0 720 320" role="img" aria-labelledby="ar-t ar-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="ar-t">Kiến trúc blockchain mini</title>
<desc id="ar-d">Ví ký giao dịch, đưa vào mempool, miner đóng block bằng PoW, block nối vào chain, node P2P đồng bộ</desc>
<rect x="20" y="30" width="120" height="60" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="56" text-anchor="middle" font-size="13" fill="currentColor">Wallet</text>
<text x="80" y="74" text-anchor="middle" font-size="11" fill="currentColor">ký ECDSA</text>
<rect x="20" y="140" width="120" height="60" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="166" text-anchor="middle" font-size="13" fill="currentColor">Mempool</text>
<text x="80" y="184" text-anchor="middle" font-size="11" fill="currentColor">tx chờ xử lý</text>
<rect x="290" y="140" width="120" height="60" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="166" text-anchor="middle" font-size="13" fill="currentColor">Miner (PoW)</text>
<text x="350" y="184" text-anchor="middle" font-size="11" fill="currentColor">tìm nonce</text>
<rect x="560" y="120" width="140" height="100" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="630" y="150" text-anchor="middle" font-size="13" fill="currentColor">Chain</text>
<text x="630" y="170" text-anchor="middle" font-size="11" fill="currentColor">block ← block ← block</text>
<text x="630" y="190" text-anchor="middle" font-size="11" fill="currentColor">nối bằng prev_hash</text>
<rect x="290" y="250" width="410" height="50" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="495" y="280" text-anchor="middle" font-size="12" fill="currentColor">P2P nodes — broadcast block, longest valid chain wins</text>
<line x1="80" y1="90" x2="80" y2="138" stroke="currentColor" stroke-width="1.5" marker-end="url(#a5)"/>
<line x1="140" y1="170" x2="288" y2="170" stroke="currentColor" stroke-width="1.5" marker-end="url(#a5)"/>
<line x1="410" y1="170" x2="558" y2="170" stroke="currentColor" stroke-width="1.5" marker-end="url(#a5)"/>
<line x1="630" y1="220" x2="630" y2="248" stroke="currentColor" stroke-width="1.5" marker-end="url(#a5)"/>
<line x1="350" y1="250" x2="350" y2="202" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<defs><marker id="a5" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Luồng một giao dịch:** Alice dùng ví ký tx → tx vào mempool → miner gom mempool + phần thưởng coinbase vào một block → miner giải PoW → block nối vào chain → broadcast cho các node → node nào có chain hợp lệ dài hơn thì thay thế chain của mình.

**Chuẩn bị môi trường** (một thư viện ECDSA nhẹ, phần còn lại dùng chuẩn):

```bash
pip install ecdsa       # đường cong SECP256k1 giống Bitcoin/Ethereum
```

---

## 3. Ví & chữ ký ECDSA

Ví **không** lưu tiền — nó lưu **private key**. Số dư nằm trong chain; ai giữ private key thì ký được lệnh chi tiêu. Ta dùng đường cong **SECP256k1** (đúng đường cong Bitcoin/Ethereum), địa chỉ là 40 hex ký tự cuối của SHA-256(public key) cho ngắn gọn.

```python
# wallet.py
import hashlib
from ecdsa import SigningKey, VerifyingKey, SECP256k1, BadSignatureError

class Wallet:
    def __init__(self, signing_key: SigningKey = None):
        # private key ngẫu nhiên 256-bit; public key suy ra được từ private key
        self.sk = signing_key or SigningKey.generate(curve=SECP256k1)
        self.vk = self.sk.get_verifying_key()

    @property
    def public_key(self) -> str:
        return self.vk.to_string().hex()            # 128 hex = 64 byte (x||y)

    @property
    def address(self) -> str:
        # địa chỉ = 20 byte cuối của SHA-256(public key) — gọn, không lộ pubkey đầy đủ
        h = hashlib.sha256(self.vk.to_string()).hexdigest()
        return "0x" + h[-40:]

    def sign(self, message: str) -> str:
        return self.sk.sign(message.encode()).hex()

    @staticmethod
    def verify(public_key: str, message: str, signature: str) -> bool:
        try:
            vk = VerifyingKey.from_string(bytes.fromhex(public_key), curve=SECP256k1)
            return vk.verify(bytes.fromhex(signature), message.encode())
        except (BadSignatureError, ValueError):
            return False
```

Điểm mấu chốt: **`verify` là hàm tĩnh** — bất kỳ node nào cũng xác minh được chữ ký chỉ bằng public key, **không cần** private key. Đây chính là cơ chế "ai cũng kiểm tra được, chỉ chủ mới ký được".

---

## 4. Transaction

Một giao dịch gồm `sender / recipient / amount` cộng `timestamp` (chống replay) và `signature`. Ta ký **hash của nội dung** chứ không ký cả object — chuẩn hóa nội dung thành JSON sắp xếp key để mọi node băm ra cùng một chuỗi.

```python
# transaction.py
import json, time, hashlib
from wallet import Wallet

class Transaction:
    def __init__(self, sender, recipient, amount, public_key="", timestamp=None):
        self.sender = sender            # address người gửi ("SYSTEM" nếu là coinbase)
        self.recipient = recipient      # address người nhận
        self.amount = amount
        self.public_key = public_key    # pubkey của sender để node xác minh chữ ký
        self.timestamp = timestamp or time.time()
        self.signature = ""

    def _payload(self) -> str:
        # nội dung được ký/băm — KHÔNG bao gồm signature
        return json.dumps({
            "sender": self.sender, "recipient": self.recipient,
            "amount": self.amount, "public_key": self.public_key,
            "timestamp": self.timestamp,
        }, sort_keys=True)

    def hash(self) -> str:
        return hashlib.sha256(self._payload().encode()).hexdigest()

    def sign(self, wallet: Wallet):
        # sender phải khớp địa chỉ suy ra từ ví đang ký
        assert wallet.address == self.sender, "không thể ký hộ ví khác"
        self.public_key = wallet.public_key
        self.signature = wallet.sign(self.hash())

    def is_valid(self) -> bool:
        if self.sender == "SYSTEM":         # coinbase (thưởng mining) không cần chữ ký
            return True
        if not self.signature or not self.public_key:
            return False
        # 1) chữ ký khớp public key + nội dung?  2) address có đúng do public key đó sinh ra?
        pub_ok = Wallet.verify(self.public_key, self.hash(), self.signature)
        derived = "0x" + hashlib.sha256(bytes.fromhex(self.public_key)).hexdigest()[-40:]
        return pub_ok and derived == self.sender

    def to_dict(self):
        return {**self.__dict__}

    @classmethod
    def from_dict(cls, d):
        tx = cls(d["sender"], d["recipient"], d["amount"], d["public_key"], d["timestamp"])
        tx.signature = d["signature"]
        return tx
```

`is_valid` chặn **hai kiểu gian lận**: (1) sửa `amount` sau khi ký → hash đổi → chữ ký hỏng; (2) khai `sender` là địa chỉ người khác nhưng ký bằng ví của mình → `derived != sender`. Đây là lý do bạn **không tiêu được tiền của người khác**.

---

## 5. Block & hash link

Mỗi block đóng gói: `index`, `timestamp`, danh sách `transactions`, `prev_hash` (hash block trước), và `nonce` (dùng cho PoW). Hash của block **bao trùm cả `prev_hash`** — nên sửa một block cũ sẽ làm hash nó đổi, kéo theo `prev_hash` của mọi block sau đều sai. Đó là **tính bất biến**.

<svg viewBox="0 0 720 200" role="img" aria-labelledby="bl-t bl-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="bl-t">Hash link giữa các block</title>
<desc id="bl-d">Ba block nối nhau, prev_hash của mỗi block bằng hash của block liền trước</desc>
<rect x="20" y="50" width="180" height="100" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="110" y="74" text-anchor="middle" font-size="13" fill="currentColor">Block 0 (genesis)</text>
<text x="110" y="98" text-anchor="middle" font-size="11" fill="currentColor">prev_hash: 000…0</text>
<text x="110" y="118" text-anchor="middle" font-size="11" fill="currentColor">txs, nonce</text>
<text x="110" y="138" text-anchor="middle" font-size="11" fill="#10b981">hash: 00a3f…</text>
<rect x="270" y="50" width="180" height="100" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="74" text-anchor="middle" font-size="13" fill="currentColor">Block 1</text>
<text x="360" y="98" text-anchor="middle" font-size="11" fill="#f59e0b">prev_hash: 00a3f…</text>
<text x="360" y="118" text-anchor="middle" font-size="11" fill="currentColor">txs, nonce</text>
<text x="360" y="138" text-anchor="middle" font-size="11" fill="#10b981">hash: 007c1…</text>
<rect x="520" y="50" width="180" height="100" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="610" y="74" text-anchor="middle" font-size="13" fill="currentColor">Block 2</text>
<text x="610" y="98" text-anchor="middle" font-size="11" fill="#f59e0b">prev_hash: 007c1…</text>
<text x="610" y="118" text-anchor="middle" font-size="11" fill="currentColor">txs, nonce</text>
<text x="610" y="138" text-anchor="middle" font-size="11" fill="#10b981">hash: 00e9b…</text>
<line x1="200" y1="100" x2="268" y2="100" stroke="currentColor" stroke-width="1.5" marker-end="url(#a6)"/>
<line x1="450" y1="100" x2="518" y2="100" stroke="currentColor" stroke-width="1.5" marker-end="url(#a6)"/>
<text x="360" y="180" text-anchor="middle" font-size="11" fill="currentColor">Sửa Block 0 → hash Block 0 đổi → prev_hash Block 1 sai → cả chuỗi gãy</text>
<defs><marker id="a6" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

```python
# block.py
import json, time, hashlib
from transaction import Transaction

class Block:
    def __init__(self, index, transactions, prev_hash, timestamp=None, nonce=0):
        self.index = index
        self.transactions = transactions       # list[Transaction]
        self.prev_hash = prev_hash
        self.timestamp = timestamp or time.time()
        self.nonce = nonce

    def compute_hash(self) -> str:
        block_content = json.dumps({
            "index": self.index,
            "transactions": [tx.hash() for tx in self.transactions],  # gộp tx bằng hash
            "prev_hash": self.prev_hash,
            "timestamp": self.timestamp,
            "nonce": self.nonce,
        }, sort_keys=True)
        return hashlib.sha256(block_content.encode()).hexdigest()

    def to_dict(self):
        return {
            "index": self.index,
            "transactions": [tx.to_dict() for tx in self.transactions],
            "prev_hash": self.prev_hash,
            "timestamp": self.timestamp,
            "nonce": self.nonce,
            "hash": self.compute_hash(),
        }

    @classmethod
    def from_dict(cls, d):
        txs = [Transaction.from_dict(t) for t in d["transactions"]]
        return cls(d["index"], txs, d["prev_hash"], d["timestamp"], d["nonce"])
```

> **Chú ý kỹ thuật:** ở đây ta gộp transaction bằng cách băm nối `tx.hash()`. Blockchain thật dùng **Merkle root** (Bài 2) để chứng minh một tx thuộc block mà không cần tải cả block — nâng cấp này để dành cho bạn làm bài tập.

---

## 6. Blockchain: mining PoW, mempool, validate

Đây là trái tim của hệ thống. `difficulty` = số chữ `0` mở đầu mà hash phải có. Mining là **brute-force `nonce`** cho tới khi trúng — không có đường tắt, đó là "proof of work".

```python
# blockchain.py
from block import Block
from transaction import Transaction

class Blockchain:
    def __init__(self, difficulty=4, reward=50):
        self.difficulty = difficulty        # số '0' đầu hash → càng lớn càng khó
        self.reward = reward                # thưởng coinbase cho miner
        self.mempool = []                   # tx chưa được đóng block
        self.chain = [self._genesis()]

    def _genesis(self) -> Block:
        return Block(0, [], "0" * 64, timestamp=0, nonce=0)

    @property
    def last_block(self) -> Block:
        return self.chain[-1]

    def _valid_hash(self, h: str) -> bool:
        return h.startswith("0" * self.difficulty)

    def add_transaction(self, tx: Transaction) -> bool:
        # từ chối tx giả mạo NGAY tại cổng mempool
        if not tx.is_valid():
            return False
        # không cho chi vượt số dư (trừ coinbase)
        if tx.sender != "SYSTEM" and self.balance_of(tx.sender) < tx.amount:
            return False
        self.mempool.append(tx)
        return True

    def mine(self, miner_address: str) -> Block:
        # coinbase: block tự "in" reward cho miner — đây là nguồn phát hành coin mới
        coinbase = Transaction("SYSTEM", miner_address, self.reward)
        txs = [coinbase] + self.mempool
        block = Block(len(self.chain), txs, self.last_block.compute_hash())
        # Proof of Work: quay nonce đến khi hash đủ số '0' đầu
        while not self._valid_hash(block.compute_hash()):
            block.nonce += 1
        self.chain.append(block)
        self.mempool = []                   # dọn mempool đã đóng
        return block

    def balance_of(self, address: str) -> float:
        bal = 0.0
        for block in self.chain:
            for tx in block.transactions:
                if tx.recipient == address:
                    bal += tx.amount
                if tx.sender == address:
                    bal -= tx.amount
        return bal

    def is_valid_chain(self, chain=None) -> bool:
        chain = chain or self.chain
        for i in range(1, len(chain)):
            cur, prev = chain[i], chain[i - 1]
            # 1) liên kết hash không được đứt
            if cur.prev_hash != prev.compute_hash():
                return False
            # 2) PoW phải thật (hash đủ khó)
            if not self._valid_hash(cur.compute_hash()):
                return False
            # 3) mọi tx trong block đều hợp lệ về chữ ký
            for tx in cur.transactions:
                if not tx.is_valid():
                    return False
        return True
```

Ba lớp phòng thủ trong `is_valid_chain` chính là tinh thần blockchain: **link không gãy** (bất biến), **PoW thật** (tốn công mới ghi được), **chữ ký đúng** (không ai ký hộ). Một kẻ tấn công muốn sửa block cũ phải **đào lại PoW cho block đó và mọi block sau** nhanh hơn cả mạng — bất khả về mặt kinh tế.

**Thử nghiệm nhanh — chứng minh bất biến bằng tay:**

```python
# demo_tamper.py
from wallet import Wallet
from transaction import Transaction
from blockchain import Blockchain

chain = Blockchain(difficulty=4)
alice, bob = Wallet(), Wallet()

chain.mine(alice.address)                    # Alice đào block 1 → +50 coin

tx = Transaction(alice.address, bob.address, 30)
tx.sign(alice)
print("nạp tx:", chain.add_transaction(tx))  # True
chain.mine(alice.address)                     # đóng block 2

print("Alice:", chain.balance_of(alice.address))   # 50 + 50(reward) - 30 = 70
print("Bob  :", chain.balance_of(bob.address))     # 30
print("chain hợp lệ?", chain.is_valid_chain())     # True

# kẻ gian sửa số tiền trong block đã đóng
chain.chain[2].transactions[1].amount = 9999
print("sau khi sửa lén:", chain.is_valid_chain())  # False — tx.is_valid() gãy + hash lệch
```

---

## 7. P2P đơn giản: mỗi node là một HTTP server

Mạng thật dùng gossip qua TCP; ở đây ta làm **HTTP thuần** cho dễ đọc: mỗi node phơi vài endpoint, và đồng bộ bằng luật kinh điển **"chain hợp lệ dài nhất thắng"** (longest valid chain) — chính là cách Nakamoto consensus giải quyết fork (Bài 10).

```python
# node.py
from flask import Flask, request, jsonify
import requests
from block import Block
from transaction import Transaction
from blockchain import Blockchain

app = Flask(__name__)
chain = Blockchain(difficulty=4)
peers = set()                                   # {"http://127.0.0.1:5001", ...}

@app.post("/tx")
def new_tx():
    tx = Transaction.from_dict(request.get_json())
    ok = chain.add_transaction(tx)
    return jsonify({"accepted": ok}), (201 if ok else 400)

@app.post("/mine")
def mine():
    miner = request.get_json()["miner"]
    block = chain.mine(miner)
    broadcast_chain()                           # báo cho peer biết mình vừa dài ra
    return jsonify(block.to_dict()), 201

@app.get("/chain")
def get_chain():
    return jsonify({"length": len(chain.chain),
                    "chain": [b.to_dict() for b in chain.chain]})

@app.post("/peers")
def add_peer():
    peers.add(request.get_json()["peer"])
    return jsonify(list(peers)), 201

def broadcast_chain():
    for p in peers:
        try:
            requests.post(f"{p}/consensus", timeout=2)
        except requests.RequestException:
            pass                                # peer offline thì bỏ qua

@app.post("/consensus")
def consensus():
    # kéo chain của mọi peer, thay thế nếu có chain hợp lệ DÀI HƠN
    replaced = resolve_conflicts()
    return jsonify({"replaced": replaced, "length": len(chain.chain)})

def resolve_conflicts() -> bool:
    global chain
    longest = chain.chain
    for p in peers:
        try:
            data = requests.get(f"{p}/chain", timeout=2).json()
        except requests.RequestException:
            continue
        remote = [Block.from_dict(b) for b in data["chain"]]
        # chỉ chấp nhận khi dài hơn VÀ hợp lệ — không tin mù peer
        if len(remote) > len(longest) and chain.is_valid_chain(remote):
            longest = remote
    if longest is not chain.chain:
        chain.chain = longest
        return True
    return False

if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5000
    app.run(port=port)
```

**Chạy hai node và cho chúng đồng bộ:**

```bash
python node.py 5000            # terminal 1
python node.py 5001            # terminal 2

# nối node 5001 làm peer của node 5000
curl -X POST localhost:5000/peers -H "Content-Type: application/json" \
     -d '{"peer":"http://127.0.0.1:5001"}'

# node 5000 đào 3 block rồi broadcast
curl -X POST localhost:5000/mine -H "Content-Type: application/json" -d '{"miner":"0xminer"}'

# ép node 5001 chạy consensus → kéo chain dài hơn từ 5000
curl -X POST localhost:5001/consensus
curl localhost:5001/chain      # length giờ khớp node 5000
```

Điểm cốt lõi: node **không bao giờ tin peer một cách mù quáng** — luôn chạy `is_valid_chain(remote)` trước khi thay. Đây là vì sao một node độc hại **không thể** bơm chain rác cho cả mạng: chain rác không qua nổi validate.

---

## 8. Những chỗ mini khác blockchain thật (đọc để không ngộ nhận)

| Khía cạnh | Bản mini này | Blockchain sản xuất |
|-----------|--------------|---------------------|
| Gộp tx trong block | Băm nối `tx.hash()` | **Merkle tree** — cho SPV proof (Bài 2) |
| Kế toán số dư | Quét toàn chain mỗi lần | **UTXO set** / state trie có index (Bài 11, 14) |
| Điều chỉnh độ khó | `difficulty` cố định | Retarget theo block time (Bitcoin: mỗi 2016 block) |
| Chống double-spend trong mempool | Chỉ check balance khi nạp | Reserve/nonce theo account, thay thế phí (Bài 14) |
| Phí giao dịch | Không có | Fee market + ưu tiên miner (Bài 20, 42) |
| P2P | HTTP pull thủ công | Gossip TCP, header-first sync, ban peer xấu |
| Finality | "Dài nhất thắng", có thể reorg | Confirmations / finality gadget (Bài 8, 10) |

Đừng dùng code này để giữ tiền thật — nhưng **mọi ý tưởng cốt lõi đều đúng bản chất**: nó thực sự bất biến trong phạm vi PoW, thực sự chống giả mạo chữ ký, thực sự đồng thuận theo longest-valid-chain.

---

## 9. Bài tập mở rộng (tự làm để lên "expert")
1. **Merkle root**: thay `[tx.hash() for tx in txs]` bằng một Merkle root thật; viết hàm sinh & xác minh Merkle proof.
2. **Phí giao dịch**: thêm trường `fee`, cho miner nhận `reward + Σfee`, sắp mempool theo fee giảm dần.
3. **Difficulty retarget**: điều chỉnh `difficulty` để giữ block time ~ mục tiêu (ví dụ 10 giây).
4. **Persistence**: serialize chain ra file JSON và nạp lại khi khởi động node.
5. **Chống double-spend chặt hơn**: thêm `nonce` theo account để chặn replay và ordering tx.
6. **Chuyển sang PoS**: thay vòng lặp nonce bằng chọn validator theo stake (Bài 8) — cùng khung Block/Chain, khác luật chọn người đóng block.

---

## 10. Tóm tắt
- Một blockchain tối giản chỉ cần **6 mảnh**: wallet (ECDSA), transaction (ký + verify), block (hash link), mempool, PoW mining, và P2P đồng bộ theo longest-valid-chain.
- **Bất biến** đến từ hash link + PoW: sửa block cũ buộc đào lại toàn bộ block sau, nhanh hơn cả mạng — bất khả về kinh tế.
- **Không tiêu được tiền người khác** đến từ chữ ký: `is_valid` kiểm tra chữ ký khớp public key **và** address suy ra đúng từ public key đó.
- **Đồng thuận** không cần trung gian: node validate chain của peer rồi mới nhận chain hợp lệ dài hơn — không ai bơm được chain rác.
- Bản mini bỏ qua Merkle/UTXO/fee market/finality gadget, nhưng giữ **đúng bản chất** — đó là bàn đạp để đọc code Bitcoin Core / go-ethereum mà không còn thấy như hộp đen.

> **Chúc mừng** — bạn vừa ghép toàn bộ Chương 1 đến giờ thành một hệ thống chạy được. Từ đây, mọi khái niệm nâng cao (rollup, ZK, restaking) đều là biến thể trên chính khung Block–Chain–Consensus này.
