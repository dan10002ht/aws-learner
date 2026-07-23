# Bài 51 — Chạy node & validator, RPC infra, monitoring

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân biệt **full / archive / light node** — cái nào lưu gì, nặng bao nhiêu, dùng khi nào.
- Hiểu kiến trúc **post-Merge**: mọi node Ethereum là **cặp đôi** execution client + consensus client, ghép nhau qua **Engine API + JWT secret**.
- Chạy được một **node đầy đủ** (Geth/Nethermind + Lighthouse/Prysm) bằng config thật.
- Nắm quy trình **chạy validator**: 32 ETH, deposit, phân biệt **validator key vs withdrawal key**, và vì sao **slashing protection DB** là thứ có thể phá hủy bạn.
- Quyết định **self-host RPC vs Infura/Alchemy**, và dựng **monitoring** bằng Prometheus + Grafana.

---

## 2. Lý thuyết

### 2.1 Analogy — quán ăn có hai người, một cuốn công thức

Hình dung một quán bếp. **Một người (execution client)** chuyên nấu: nhận order (transaction), thực thi công thức (EVM), tính ra món ăn cuối (state mới). **Người kia (consensus client)** không nấu, mà lo **thứ tự và tính hợp lệ**: order nào vào trước, ai được ra món, và cả bếp có đồng ý đây là bữa ăn chính thức không. Hai người **phải nói chuyện với nhau** qua một cửa sổ nhỏ, và để không ai giả mạo, họ dùng **một mật khẩu chung (JWT secret)** dán ở cửa sổ đó.

Trước The Merge (9/2022), một mình execution client làm cả hai việc (PoW). Sau Merge, đồng thuận chuyển sang **Proof-of-Stake** nằm ở một client riêng — nên **một node = hai process**. Đây là điểm gây bối rối nhất cho người mới: bạn không cài "một phần mềm Ethereum", bạn cài **một cặp**.

### 2.2 Ba loại node — lưu gì, nặng bao nhiêu

State của Ethereum có hai phần: **state hiện tại** (số dư, storage của mọi contract ngay bây giờ) và **lịch sử** (state ở từng block trong quá khứ). Khác biệt giữa các loại node nằm ở **giữ bao nhiêu lịch sử**.

| Loại node | Giữ gì | Trả lời được gì | Dung lượng (mainnet, 2026) | Dùng khi |
|-----------|--------|-----------------|----------------------------|----------|
| **Full node** | Toàn bộ block + state **hiện tại**; tự verify mọi block | State hiện tại, `eth_call` mới nhất, gần đây | ~1.2–2 TB SSD | Chạy validator, RPC cho dApp thông thường |
| **Archive node** | Full node + **state của MỌI block quá khứ** | Số dư của địa chỉ tại block cũ, `eth_call` tại block cũ, trace | ~12–20+ TB SSD | Indexer, analytics, `debug_traceTransaction`, trace lịch sử |
| **Light node** | Chỉ **block header**, xin data khi cần từ full node | Rất ít; tin vào bằng chứng từ full node | vài GB | Thiết bị yếu; ít dùng, hệ light-client còn non |

Điểm hay bị hiểu nhầm: **full node vẫn verify toàn bộ lịch sử** khi sync (nó đã chạy qua mọi block để tới state hiện tại) — nó chỉ **không lưu snapshot state cũ**. Archive node không "an toàn hơn" full node; nó chỉ **truy hồi được quá khứ**. Đừng chạy archive node nếu bạn không thực sự cần trace lịch sử — nó đắt gấp 10 lần về ổ cứng.

<svg viewBox="0 0 700 250" role="img" aria-labelledby="nd-t nd-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="nd-t">Full vs archive vs light node</title>
<desc id="nd-d">Ba khối biểu diễn dữ liệu mỗi loại node giữ: light chỉ header, full giữ state hiện tại, archive giữ toàn bộ state quá khứ</desc>
<rect x="30" y="60" width="180" height="150" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="48" text-anchor="middle" font-size="13" fill="currentColor">Light</text>
<rect x="55" y="80" width="130" height="26" rx="4" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="98" text-anchor="middle" font-size="11" fill="currentColor">block headers</text>
<text x="120" y="150" text-anchor="middle" font-size="11" fill="currentColor">vài GB</text>
<text x="120" y="170" text-anchor="middle" font-size="10" fill="currentColor">xin data từ full node</text>
<rect x="250" y="60" width="180" height="150" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="340" y="48" text-anchor="middle" font-size="13" fill="currentColor">Full</text>
<rect x="275" y="80" width="130" height="26" rx="4" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="340" y="98" text-anchor="middle" font-size="11" fill="currentColor">headers + blocks</text>
<rect x="275" y="112" width="130" height="30" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="340" y="132" text-anchor="middle" font-size="11" fill="currentColor">state HIỆN TẠI</text>
<text x="340" y="170" text-anchor="middle" font-size="11" fill="currentColor">~1.5 TB</text>
<text x="340" y="190" text-anchor="middle" font-size="10" fill="currentColor">verify mọi block</text>
<rect x="470" y="60" width="200" height="150" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="570" y="48" text-anchor="middle" font-size="13" fill="currentColor">Archive</text>
<rect x="495" y="80" width="150" height="20" rx="4" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="570" y="95" text-anchor="middle" font-size="10" fill="currentColor">headers + blocks</text>
<rect x="495" y="104" width="150" height="20" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="570" y="119" text-anchor="middle" font-size="10" fill="currentColor">state hiện tại</text>
<rect x="495" y="128" width="150" height="46" rx="4" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="570" y="147" text-anchor="middle" font-size="10" fill="currentColor">state MỌI block</text>
<text x="570" y="164" text-anchor="middle" font-size="10" fill="currentColor">quá khứ</text>
<text x="570" y="194" text-anchor="middle" font-size="11" fill="currentColor">12–20+ TB</text>
</svg>

### 2.3 Kiến trúc post-Merge: hai client + JWT

Sau Merge, một node đầy đủ gồm:

- **Execution client (EL)** — Geth, Nethermind, Erigon, Besu, Reth. Giữ EVM, mempool, state, phục vụ **JSON-RPC** (`eth_call`, `eth_sendRawTransaction`...). Cổng RPC quen thuộc: **8545** (HTTP), **8546** (WS).
- **Consensus client (CL)** — Lighthouse, Prysm, Teku, Nimbus, Lodestar. Chạy giao thức PoS (beacon chain): theo dõi validator, fork-choice, finality. Còn gọi là **beacon node**.

Hai bên nối nhau qua **Engine API** trên cổng **8551**, được bảo vệ bằng **JWT secret** — một file 32-byte hex. CL dùng JWT để chứng minh nó là "hàng xóm hợp lệ" mỗi khi bảo EL "hãy thực thi block này" hoặc "state root có khớp không". Nếu JWT không khớp, hai bên **không nói chuyện được** và node đứng im — đây là lỗi #1 của người mới.

<svg viewBox="0 0 700 300" role="img" aria-labelledby="me-t me-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="me-t">Kiến trúc node post-Merge</title>
<desc id="me-d">Execution client và consensus client nối nhau qua Engine API cổng 8551 bảo vệ bằng JWT, validator client gắn vào consensus client, dApp gọi RPC vào execution client</desc>
<rect x="60" y="90" width="200" height="120" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="160" y="118" text-anchor="middle" font-size="14" fill="currentColor">Execution client</text>
<text x="160" y="138" text-anchor="middle" font-size="11" fill="currentColor">Geth / Nethermind</text>
<text x="160" y="160" text-anchor="middle" font-size="10" fill="currentColor">EVM · mempool · state</text>
<text x="160" y="184" text-anchor="middle" font-size="10" fill="currentColor">JSON-RPC :8545</text>
<rect x="440" y="90" width="200" height="120" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="540" y="118" text-anchor="middle" font-size="14" fill="currentColor">Consensus client</text>
<text x="540" y="138" text-anchor="middle" font-size="11" fill="currentColor">Lighthouse / Prysm</text>
<text x="540" y="160" text-anchor="middle" font-size="10" fill="currentColor">PoS · fork-choice</text>
<text x="540" y="184" text-anchor="middle" font-size="10" fill="currentColor">beacon :5052</text>
<line x1="260" y1="150" x2="440" y2="150" stroke="currentColor" stroke-width="1.5" marker-end="url(#av)" marker-start="url(#av)"/>
<rect x="300" y="120" width="100" height="34" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="136" text-anchor="middle" font-size="11" fill="currentColor">Engine API</text>
<text x="350" y="149" text-anchor="middle" font-size="10" fill="currentColor">:8551 + JWT</text>
<rect x="470" y="245" width="140" height="44" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="540" y="266" text-anchor="middle" font-size="12" fill="currentColor">Validator client</text>
<text x="540" y="281" text-anchor="middle" font-size="10" fill="currentColor">ký attestation/block</text>
<line x1="540" y1="210" x2="540" y2="243" stroke="currentColor" stroke-width="1.5" marker-end="url(#av)" marker-start="url(#av)"/>
<rect x="90" y="245" width="140" height="44" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="160" y="266" text-anchor="middle" font-size="12" fill="currentColor">dApp / wallet</text>
<text x="160" y="281" text-anchor="middle" font-size="10" fill="currentColor">gọi eth_* RPC</text>
<line x1="160" y1="245" x2="160" y2="212" stroke="currentColor" stroke-width="1.5" marker-end="url(#av)"/>
<defs><marker id="av" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Nếu bạn **chỉ cần RPC để phục vụ dApp** (không validate), bạn vẫn phải chạy **cả EL lẫn CL**: EL không tự sync post-Merge được, nó cần CL cho nó biết đầu chain (head) và finality. Không có "chỉ chạy Geth" nữa.

### 2.4 Chạy validator: 32 ETH và hai chiếc chìa khóa

Muốn validate Ethereum bạn **stake 32 ETH** cho mỗi validator. Có ba mảnh phần mềm khi validate: EL + beacon node (CL) + **validator client** (thường là process con của CL). Validator client giữ **khóa ký** và ký:
- **attestation** (bỏ phiếu cho block — làm mỗi epoch), và
- thỉnh thoảng **đề xuất block** khi được chọn.

Điểm sống còn nhất là **phân biệt hai loại khóa**:

| Khóa | Ký gì | Nằm ở đâu | Mất/lộ thì sao |
|------|-------|-----------|----------------|
| **Validator (signing) key** | attestation, block đề xuất — hoạt động **liên tục online** | Trên máy validator (nóng) | Kẻ xấu có thể ký sai gây **slashing**, nhưng **không rút được ETH của bạn** |
| **Withdrawal key** | Rút tiền, đổi withdrawal credentials | **Offline, cất kỹ** (mnemonic) | Mất là **mất quyền rút 32 ETH + reward** vĩnh viễn |

Thiết kế này rất thông minh: khóa ký phải online 24/7 (rủi ro cao) nhưng **không kiểm soát được tiền** — nó chỉ ký được những thứ khiến bạn bị phạt, không rút được vốn. Khóa rút thì để offline, hầu như không dùng. Đây là lý do bạn **tuyệt đối không được** để mnemonic gốc trên máy validator.

**Deposit** thực hiện qua contract deposit chính thức: bạn gửi 32 ETH kèm **deposit data** (public key của validator, withdrawal credentials, và một chữ ký chứng minh bạn sở hữu khóa ký). Sau đó validator vào **hàng đợi activation** (có thể chờ hàng giờ tới ngày tùy queue), rồi bắt đầu attest.

### 2.5 Slashing — và slashing protection DB

**Slashing** là hình phạt cắt stake khi validator làm việc "không thể là trung thực": ký **hai block khác nhau ở cùng slot**, hoặc ký **hai attestation mâu thuẫn** (surround/double vote). Mạng coi đây là tấn công và phạt nặng: cắt một phần ETH + **ép thoát** (forced exit).

Nguy hiểm là: **bạn có thể tự slash mình mà không hề có ý tấn công** — chỉ bằng cách **chạy cùng một khóa validator ở hai nơi cùng lúc** (ví dụ: bạn dựng máy mới để "phòng hờ" nhưng quên tắt máy cũ; hoặc restore backup rồi cả hai cùng chạy). Cả hai máy cùng ký hai attestation cho cùng slot → mạng slash bạn.

Chống lại điều đó là **slashing protection database**: một file (mỗi validator client giữ một cái) ghi lại **slot cao nhất, epoch cao nhất đã từng ký**. Trước khi ký bất cứ gì, validator client kiểm tra DB này — nếu định ký thứ gì "lùi về quá khứ" hoặc trùng, nó **từ chối ký**. Quy tắc vàng:

> **KHÔNG BAO GIỜ chạy cùng một khóa validator ở hai process/máy cùng lúc. KHÔNG BAO GIỜ copy slashing protection DB rồi chạy song song.** Khi di chuyển validator sang máy mới: tắt máy cũ → **export** slashing protection DB (chuẩn EIP-3076 JSON) → **import** vào máy mới → chờ vài epoch → mới bật. Thà validator offline (phạt nhỏ, tuyến tính) còn hơn bị slash (phạt lớn + forced exit).

Offline (không attest) chỉ bị phạt nhẹ, đúng bằng số reward lẽ ra kiếm được — mất mạng vài giờ không đáng sợ. **Slashing mới đáng sợ.**

---

## 3. THỰC HÀNH — dựng một node đầy đủ

Ví dụ dưới dùng **Geth (EL) + Lighthouse (CL)** trên Linux, mạng **mainnet**. Ý tưởng giống hệt với Nethermind/Prysm, chỉ đổi tên cờ.

### 3.1 Tạo JWT secret (bước bắt buộc đầu tiên)

```bash
# tạo 32-byte hex, hai client sẽ CÙNG đọc file này
openssl rand -hex 32 | tr -d "\n" > /var/lib/ethereum/jwt.hex
chmod 600 /var/lib/ethereum/jwt.hex
```

Cả EL và CL đều được trỏ tới **đúng một file** `jwt.hex` này. Đây là "mật khẩu chung ở cửa sổ bếp".

### 3.2 Execution client — Geth

```bash
geth \
  --mainnet \
  --datadir /data/geth \
  --http --http.addr 127.0.0.1 --http.port 8545 \
  --http.api eth,net,web3 \
  --ws --ws.addr 127.0.0.1 --ws.port 8546 \
  --authrpc.addr 127.0.0.1 \
  --authrpc.port 8551 \
  --authrpc.jwtsecret /var/lib/ethereum/jwt.hex \
  --syncmode snap \
  --metrics --metrics.addr 127.0.0.1 --metrics.port 6060
```

Giải thích các cờ then chốt:
- `--authrpc.*` + `--authrpc.jwtsecret`: **Engine API** cho CL nói chuyện. **Bắt buộc.**
- `--http.addr 127.0.0.1`: RPC chỉ nghe **localhost**. Đừng bao giờ mở `0.0.0.0` ra internet mà không có auth/reverse-proxy — bot sẽ quét và lạm dụng node của bạn.
- `--syncmode snap`: snap sync (tải snapshot state, nhanh) → thành **full node**. Muốn **archive** thì thêm `--gcmode archive --syncmode full` (rất chậm, cần chục TB).
- `--metrics`: expose số liệu cho Prometheus scrape (mục 5).

### 3.3 Consensus client — Lighthouse (beacon node)

```bash
lighthouse bn \
  --network mainnet \
  --datadir /data/lighthouse \
  --execution-endpoint http://127.0.0.1:8551 \
  --execution-jwt /var/lib/ethereum/jwt.hex \
  --checkpoint-sync-url https://mainnet.checkpoint.sigp.io \
  --http --http-address 127.0.0.1 --http-port 5052 \
  --metrics --metrics-address 127.0.0.1 --metrics-port 5054
```

- `--execution-endpoint http://127.0.0.1:8551` + `--execution-jwt`: **trỏ về đúng Engine API và JWT của Geth**. Nếu port hoặc file JWT sai → node không sync.
- `--checkpoint-sync-url`: **checkpoint sync** — thay vì sync beacon chain từ genesis (nhiều ngày), tải một checkpoint đã finalize từ nguồn tin cậy → CL sync trong **vài phút**. Gần như luôn nên dùng.
- `--http` (:5052): API beacon để validator client và tool đọc.

Sau khi cả hai chạy, EL sẽ "đứng chờ" cho tới khi CL báo head — bạn thấy Geth log `Beacon client online` và bắt đầu snap sync. Chạy cả hai bằng **systemd unit** riêng (auto-restart) là chuẩn production.

### 3.4 Kiểm tra node đã sync chưa

```bash
# EL: false nghĩa là đã sync xong; object nghĩa là còn đang sync
curl -s -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_syncing","params":[]}'

# CL: is_syncing phải là false
curl -s http://127.0.0.1:5052/eth/v1/node/syncing | jq
```

`eth_syncing` trả `false` **và** beacon `is_syncing: false` → node sẵn sàng phục vụ RPC / validate.

### 3.5 Chạy validator (thêm vào node ở trên)

**Bước 1 — sinh khóa** bằng staking-deposit-cli (chạy **offline**, máy air-gapped càng tốt):

```bash
./deposit new-mnemonic --num_validators 1 --chain mainnet
# → in ra MNEMONIC (24 từ) = WITHDRAWAL KEY. Ghi ra giấy, cất offline, KHÔNG chụp ảnh.
# → sinh 2 file trong validator_keys/:
#     keystore-m_...json   (validator SIGNING key, mã hoá bằng password)
#     deposit_data-*.json  (public key + withdrawal creds + chữ ký, để nạp deposit)
```

**Bước 2 — deposit 32 ETH**: lên [launchpad chính thức](https://launchpad.ethereum.org), upload `deposit_data-*.json`, ký giao dịch gửi **32 ETH** vào deposit contract. Validator vào hàng đợi activation.

**Bước 3 — import khóa vào validator client** và chạy:

```bash
# import keystore vào Lighthouse — tạo slashing protection DB tại đây
lighthouse account validator import \
  --network mainnet \
  --datadir /data/lighthouse \
  --directory ./validator_keys

# chạy validator client, trỏ về beacon node ở :5052
lighthouse vc \
  --network mainnet \
  --datadir /data/lighthouse \
  --beacon-nodes http://127.0.0.1:5052 \
  --suggested-fee-recipient 0xYourColdWalletAddress \
  --metrics --metrics-address 127.0.0.1 --metrics-port 5064
```

- `--suggested-fee-recipient`: địa chỉ **nhận priority fee + MEV tip** khi validator của bạn đề xuất block. Đặt là ví bạn kiểm soát (không phải khóa validator).
- Import keystore chính là lúc **slashing protection DB** được khởi tạo. Từ đây trở đi: **một khóa, một chỗ chạy** — không bao giờ nhân đôi.

**Di chuyển validator sang máy khác** (đúng quy trình chống slash):

```bash
# MÁY CŨ: tắt validator client TRƯỚC, rồi export
lighthouse account validator slashing-protection export slashing.json \
  --network mainnet --datadir /data/lighthouse
# MÁY MỚI: import DB này TRƯỚC khi bật vc
lighthouse account validator slashing-protection import slashing.json \
  --network mainnet --datadir /data/lighthouse
```

---

## 4. RPC provider: self-host vs Infura/Alchemy

dApp cần một **RPC endpoint** để đọc/ghi chain. Có hai đường:

| Tiêu chí | Self-host node | Infura / Alchemy / QuickNode |
|----------|----------------|------------------------------|
| **Chi phí ban đầu** | Server ~1.5 TB SSD + băng thông; công vận hành | 0đ để bắt đầu (free tier) |
| **Chi phí theo tải** | Cố định, không đội theo request | Trả theo request/compute-unit — cao khi scale |
| **Độ trễ / vị trí** | Bạn tự chọn (đặt gần app) | Phụ thuộc region provider |
| **Tin cậy / kiểm duyệt** | Tự chủ, không ai chặn | Provider có thể rate-limit / geoblock / lọc method |
| **Method nâng cao** | Tùy client (Erigon/Reth cho trace tốt) | `trace_*`, `debug_*`, archive thường phải trả tiền |
| **Uptime** | Bạn tự lo (99.9% khó) | SLA sẵn, đa vùng |
| **Riêng tư** | RPC không rời hạ tầng bạn | Provider thấy IP + query của user |

**Quy tắc thực dụng:**
- Prototype / MVP / tải nhỏ → **dùng Alchemy/Infura**, đừng phí thời gian vận hành node.
- Tải lớn, cần archive/trace nhiều, quan tâm chi phí biến thiên & kiểm duyệt → **self-host** (thường là **Erigon** hoặc **Reth** cho archive gọn hơn Geth nhiều).
- Production nghiêm túc → **lai**: self-host làm chính, provider làm **fallback** khi node bảo trì. Không bao giờ để dApp phụ thuộc **một** endpoint duy nhất.

Chuyển đổi chỉ là đổi URL — hãy để RPC URL trong biến môi trường:

```typescript
// đọc từ env, dễ đổi giữa self-host và provider, có fallback
import { JsonRpcProvider, FallbackProvider } from "ethers";

const primary  = new JsonRpcProvider(process.env.RPC_SELF_HOST!);   // http://your-node:8545
const backup   = new JsonRpcProvider(process.env.RPC_ALCHEMY!);      // https://eth-mainnet.g.alchemy.com/v2/KEY
// FallbackProvider tự chuyển sang backup khi primary lỗi/chậm
export const provider = new FallbackProvider([
  { provider: primary, priority: 1, weight: 1, stallTimeout: 2000 },
  { provider: backup,  priority: 2, weight: 1 },
]);
```

> Bảo mật: **API key của provider không nhúng vào frontend** (ai xem source cũng thấy). Cho request đi qua backend của bạn, hoặc dùng **allowlist domain/method** mà provider cung cấp để giới hạn key.

---

## 5. Monitoring: Prometheus + Grafana

Node là hạ tầng chạy 24/7 — **không quan sát được nghĩa là sẽ hỏng lúc bạn không biết**. Với validator, một node kẹt/hết disk = mất reward (và tệ hơn là rủi ro slash khi bạn cuống cuồng dựng máy thứ hai). Bộ chuẩn: **Prometheus** thu số liệu (scrape endpoint `--metrics` ở trên) + **Grafana** vẽ dashboard + **Alertmanager** báo động.

### 5.1 Prometheus scrape config

```yaml
# prometheus.yml — Prometheus kéo (pull) metrics từ từng client mỗi 15s
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: geth              # execution client :6060
    static_configs:
      - targets: ["127.0.0.1:6060"]
  - job_name: lighthouse_bn     # beacon node :5054
    static_configs:
      - targets: ["127.0.0.1:5054"]
  - job_name: lighthouse_vc     # validator client :5064
    static_configs:
      - targets: ["127.0.0.1:5064"]
  - job_name: node_exporter     # CPU/RAM/disk của máy :9100
    static_configs:
      - targets: ["127.0.0.1:9100"]
```

`node_exporter` là process riêng expose số liệu **hệ điều hành** (disk, CPU, RAM) — quan trọng ngang metrics của client, vì lỗi hay gặp nhất là **hết dung lượng ổ SSD** khi chain lớn dần.

### 5.2 Những metric PHẢI theo dõi

| Metric (ý nghĩa) | Vì sao sống còn |
|------------------|-----------------|
| **Sync distance** của beacon (`beacon_head_slot` vs slot hiện tại) | Node tụt sau → attestation trễ/sai → mất reward |
| **Peers** (EL & CL) | Rơi về 0 → node cô lập, không nhận block mới |
| **Disk free** (`node_filesystem_avail_bytes`) | Hết disk → node crash; cảnh báo sớm khi < 15% |
| **Validator: attestations hit/miss** (`validator_monitor_prev_epoch_attestations_...`) | Miss nhiều = đang mất tiền, có gì đó sai |
| **`process_cpu` / memory** | Quá tải → block xử lý chậm, trễ nhịp |

### 5.3 Cảnh báo — bắt máy báo cho bạn

```yaml
# alerts.yml — quy tắc Alertmanager
groups:
  - name: eth-node
    rules:
      - alert: BeaconOutOfSync
        expr: (max(beacon_clock_time_slot) - max(beacon_head_slot)) > 3
        for: 2m
        labels: { severity: critical }
        annotations:
          summary: "Beacon tụt {{ $value }} slot — validator có nguy cơ miss"
      - alert: LowPeers
        expr: libp2p_peers < 5
        for: 5m
        labels: { severity: warning }
        annotations: { summary: "Số peer thấp — kiểm tra firewall/cổng P2P" }
      - alert: DiskAlmostFull
        expr: node_filesystem_avail_bytes{mountpoint="/data"} / node_filesystem_size_bytes{mountpoint="/data"} < 0.15
        for: 10m
        labels: { severity: critical }
        annotations: { summary: "Ổ /data còn dưới 15% — dọn/nâng dung lượng NGAY" }
```

Grafana có sẵn dashboard cộng đồng cho từng client (import bằng ID trên grafana.com) — không phải vẽ tay. Việc của bạn là **cắm data source Prometheus** và **cấu hình kênh báo** (Telegram/PagerDuty/email) trong Alertmanager, để khi node lệch nhịp lúc 3h sáng, **điện thoại reo** thay vì bạn phát hiện sau khi đã mất một ngày reward.

---

## 6. Tóm tắt
- **Full node** giữ state hiện tại + verify mọi block (~1.5 TB); **archive** giữ thêm state của mọi block quá khứ (12–20+ TB, chỉ dùng khi cần trace lịch sử); **light** chỉ giữ header.
- Post-Merge, một node = **hai process**: execution client (Geth/Nethermind, RPC :8545) + consensus client (Lighthouse/Prysm, beacon :5052), nối qua **Engine API :8551** bảo vệ bằng **JWT secret** chung. Sai JWT = node đứng im.
- Validate cần **32 ETH** + EL + beacon + validator client. Phân biệt **validator/signing key** (nóng, online, chỉ ký được thứ gây slash — không rút được tiền) và **withdrawal key** (offline, giữ mnemonic — mất là mất vốn).
- **Slashing** phạt nặng khi ký mâu thuẫn; nguy cơ lớn nhất là **chạy một khóa ở hai nơi cùng lúc**. **Slashing protection DB** chặn ký trùng — không bao giờ copy nó chạy song song; di chuyển validator phải export/import đúng quy trình. Offline chỉ phạt nhẹ, slash mới đáng sợ.
- **RPC**: prototype dùng Infura/Alchemy; tải lớn/cần archive/kiểm soát chi phí thì self-host (Erigon/Reth); production nên lai + fallback; key provider không để lộ ở client.
- **Monitoring** bắt buộc: Prometheus scrape `--metrics` của từng client + node_exporter, Grafana dashboard, Alertmanager cảnh báo **sync distance / peers / disk free / attestation miss** — để hỏng hóc gọi bạn dậy trước khi mất tiền.

> **Bài tiếp theo:** bảo mật vận hành hạ tầng Web3 — key management, hardware wallet/HSM, và incident response khi node/validator gặp sự cố.
