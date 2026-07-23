# Bài 49 — Indexing on-chain data: The Graph & IPFS

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **vì sao query trực tiếp từ node là kém** — và khi nào nó vẫn ổn.
- Hiểu kiến trúc **The Graph**: subgraph, indexer, GraphQL endpoint.
- Viết đủ 3 mảnh của một subgraph: **`schema.graphql`** (entity), **`subgraph.yaml`** (manifest), **AssemblyScript mapping** (handler cho event).
- **Deploy** subgraph (Subgraph Studio / graph-node local) và **query bằng GraphQL** từ frontend.
- Lưu & **pin file lên IPFS** bằng web3.storage / Pinata, gắn CID vào on-chain data (NFT metadata, tài liệu).

---

## 2. Lý thuyết

### 2.1 Analogy — thư viện không có mục lục

Blockchain là một **thư viện khổng lồ append-only**: mọi giao dịch, mọi event đều nằm đó, nhưng **không có mục lục theo chủ đề**. Bạn chỉ có thể lật từng trang (block) theo thứ tự thời gian. Muốn trả lời "tất cả NFT mà địa chỉ 0xAbc… đang giữ" bạn phải **đọc lại từng block từ đầu** và tự dựng bảng — cực chậm.

**Indexer** (như The Graph) là **người thủ thư** ngồi đọc hết thư viện một lần, dựng sẵn mục lục theo chủ đề, rồi phục vụ mọi câu hỏi trong mili-giây.

### 2.2 Vì sao query trực tiếp node lại kém?

Node Ethereum (Geth/Erigon) chỉ cho bạn các RPC **cấp thấp**: đọc state hiện tại của một slot, hoặc lọc log theo topic. Nó **không** có "SELECT … WHERE … ORDER BY".

<svg viewBox="0 0 720 250" role="img" aria-labelledby="rpc-t rpc-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="rpc-t">Query trực tiếp node vs qua indexer</title>
<desc id="rpc-d">Bên trái frontend gọi thẳng RPC node và phải tự quét từng block; bên phải frontend query GraphQL tới indexer đã dựng sẵn mục lục</desc>
<text x="180" y="22" text-anchor="middle" font-size="14" fill="currentColor">Trực tiếp: eth_getLogs từng block</text>
<rect x="60" y="45" width="100" height="46" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="110" y="73" text-anchor="middle" font-size="12" fill="currentColor">Frontend</text>
<rect x="60" y="150" width="240" height="60" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="180" y="176" text-anchor="middle" font-size="12" fill="currentColor">Node RPC</text>
<text x="180" y="196" text-anchor="middle" font-size="11" fill="currentColor">quét block 0 → N, tự gộp</text>
<line x1="110" y1="91" x2="140" y2="148" stroke="currentColor" stroke-width="1.5" marker-end="url(#a1)"/>
<line x1="250" y1="148" x2="150" y2="93" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#a1)"/>
<text x="330" y="120" text-anchor="middle" font-size="11" fill="#f43f5e">chậm, giới hạn</text>
<text x="330" y="136" text-anchor="middle" font-size="11" fill="#f43f5e">range, không join</text>
<line x1="400" y1="20" x2="400" y2="230" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<text x="560" y="22" text-anchor="middle" font-size="14" fill="currentColor">Qua indexer: GraphQL</text>
<rect x="460" y="45" width="100" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="510" y="73" text-anchor="middle" font-size="12" fill="currentColor">Frontend</text>
<rect x="600" y="45" width="100" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="650" y="67" text-anchor="middle" font-size="12" fill="currentColor">Subgraph</text>
<text x="650" y="83" text-anchor="middle" font-size="10" fill="currentColor">DB đã index</text>
<rect x="600" y="150" width="100" height="46" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="650" y="178" text-anchor="middle" font-size="12" fill="currentColor">Node</text>
<line x1="560" y1="68" x2="598" y2="68" stroke="currentColor" stroke-width="1.5" marker-end="url(#a1)"/>
<line x1="650" y1="91" x2="650" y2="148" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#a1)"/>
<text x="650" y="120" text-anchor="middle" font-size="10" fill="currentColor">nghe event</text>
<text x="510" y="120" text-anchor="middle" font-size="11" fill="#10b981">1 request, ms</text>
<defs><marker id="a1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Cụ thể những điểm đau:

| Vấn đề khi query thẳng node | Vì sao |
|-----------------------------|--------|
| **Không có aggregation/join** | RPC chỉ trả log thô; muốn "top 10 holder" phải tự tính trên client |
| **`eth_getLogs` bị giới hạn range** | Nhiều RPC provider chặn > vài nghìn block/request → phải phân trang thủ công, rất chậm |
| **State chỉ là "hiện tại"** | Muốn lịch sử (số dư tại block cũ) phải archive node — nặng & đắt |
| **Không sort/filter phía server** | Kéo hết về client rồi lọc → tốn băng thông, chậm UI |
| **Reorg** | Nếu chain reorg, dữ liệu bạn tự cache bị sai; phải tự xử lý rollback |
| **Rate limit & chi phí** | Mỗi request tốn credit RPC; UI nhiều user sẽ đội chi phí |

The Graph giải quyết bằng cách **nghe event một lần**, ghi vào một **Postgres đã chuẩn hóa** theo schema bạn định nghĩa, tự xử lý reorg, rồi expose một **GraphQL API** có filter/sort/pagination sẵn.

> Khi nào query thẳng node vẫn ổn? Khi bạn chỉ cần **state hiện tại của một key đã biết** (số dư của 1 địa chỉ, `ownerOf(tokenId)`) — một lệnh `eth_call` là đủ, không cần indexer.

### 2.3 Ba mảnh của một subgraph

<svg viewBox="0 0 700 200" role="img" aria-labelledby="sg-t sg-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="sg-t">Ba mảnh của subgraph</title>
<desc id="sg-d">Manifest yaml trỏ tới contract và event, schema định nghĩa entity, mapping AssemblyScript biến event thành entity lưu vào store</desc>
<rect x="30" y="70" width="180" height="70" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="98" text-anchor="middle" font-size="13" fill="currentColor">subgraph.yaml</text>
<text x="120" y="118" text-anchor="middle" font-size="11" fill="currentColor">contract + event → handler</text>
<rect x="260" y="70" width="180" height="70" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="98" text-anchor="middle" font-size="13" fill="currentColor">mapping.ts (AS)</text>
<text x="350" y="118" text-anchor="middle" font-size="11" fill="currentColor">handleEvent → tạo entity</text>
<rect x="490" y="70" width="180" height="70" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="580" y="98" text-anchor="middle" font-size="13" fill="currentColor">schema.graphql</text>
<text x="580" y="118" text-anchor="middle" font-size="11" fill="currentColor">Entity = bảng trong store</text>
<line x1="210" y1="105" x2="258" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<line x1="440" y1="105" x2="488" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<text x="350" y="165" text-anchor="middle" font-size="11" fill="currentColor">graph-node đọc yaml → chạy mapping mỗi khi có event → ghi entity theo schema</text>
<defs><marker id="a2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

---

## 3. DỰ ÁN CODE — index một contract NFT

Giả sử ta có contract ERC-721 phát 2 event ta cần index:

```solidity
// GameItem.sol (phần liên quan)
event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
event ItemMinted(uint256 indexed tokenId, address indexed owner, string tokenURI);
```

Mục tiêu subgraph: trả lời được **"địa chỉ X đang giữ NFT nào"**, **"lịch sử transfer của tokenId"**, và **"tổng số item đã mint"** — chỉ bằng một GraphQL query.

### 3.1 Khởi tạo project

```bash
# cài Graph CLI
npm install -g @graphprotocol/graph-cli

# tạo subgraph từ contract đã verify trên Etherscan (tự sinh khung)
graph init \
  --product subgraph-studio \
  --from-contract 0xYourContractAddress \
  --network sepolia \
  --abi ./abis/GameItem.json \
  game-items

cd game-items
```

Cấu trúc sinh ra:

```
game-items/
├── subgraph.yaml        # manifest
├── schema.graphql       # entity
├── src/mapping.ts       # AssemblyScript handler
├── abis/GameItem.json   # ABI để decode event
└── networks.json
```

### 3.2 `schema.graphql` — định nghĩa entity

Entity chính là **bảng** trong store. Mỗi entity **bắt buộc có `id: ID!`** (khóa chính, kiểu string/bytes). Quan hệ giữa entity dùng field kiểu entity + directive `@derivedFrom` để tạo quan hệ ngược không tốn storage.

```graphql
type Token @entity {
  id: ID!                         # tokenId dạng string
  tokenId: BigInt!
  owner: Account!                 # quan hệ nhiều-1 tới Account
  tokenURI: String!
  mintedAt: BigInt!               # block timestamp
  transfers: [Transfer!]! @derivedFrom(field: "token")
}

type Account @entity {
  id: ID!                         # địa chỉ dạng hex
  tokens: [Token!]! @derivedFrom(field: "owner")  # NFT đang giữ, quan hệ ngược
  tokenCount: Int!
}

type Transfer @entity(immutable: true) {
  id: ID!                         # txHash-logIndex
  token: Token!
  from: Account!
  to: Account!
  timestamp: BigInt!
  txHash: Bytes!
}

# entity gộp thống kê toàn cục
type Collection @entity {
  id: ID!                         # cố định "singleton"
  totalMinted: BigInt!
  totalTransfers: BigInt!
}
```

Điểm quan trọng:
- `@derivedFrom` = quan hệ **ảo**: `Account.tokens` không lưu mảng trên Account, mà The Graph tự truy ngược từ `Token.owner`. Tránh mảng phình vô hạn → hiệu năng tốt.
- `@entity(immutable: true)`: entity **chỉ tạo, không sửa** (như log lịch sử) → indexer tối ưu, index nhanh hơn.
- Kiểu: `BigInt` cho uint256, `Bytes` cho address/hash, `BigDecimal` cho số thập phân (giá token).

### 3.3 `subgraph.yaml` — manifest

Manifest nối **contract + event** với **handler** trong mapping, và khai báo entity nào handler được ghi.

```yaml
specVersion: 1.0.0
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum/contract
    name: GameItem
    network: sepolia
    source:
      address: "0xYourContractAddress"
      abi: GameItem
      startBlock: 5200000          # block deploy contract — QUAN TRỌNG, khỏi quét từ 0
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.9
      language: wasm/assemblyscript
      entities:
        - Token
        - Account
        - Transfer
        - Collection
      abis:
        - name: GameItem
          file: ./abis/GameItem.json
      eventHandlers:
        - event: Transfer(indexed address,indexed address,indexed uint256)
          handler: handleTransfer
        - event: ItemMinted(indexed uint256,indexed address,string)
          handler: handleItemMinted
      file: ./src/mapping.ts
```

`startBlock` là mẹo sống còn: đặt đúng block deploy contract để indexer **không quét hàng triệu block trống** — rút thời gian sync từ hàng giờ xuống vài phút.

### 3.4 Mapping — AssemblyScript handler

AssemblyScript là **subset của TypeScript** biên dịch ra WASM. Khác biệt lớn: **không có `null` ngầm, không dùng `any`, số nguyên lớn dùng `BigInt`**, và mọi entity thao tác qua class sinh sẵn trong `../generated/schema`.

Trước tiên sinh type từ ABI + schema:

```bash
graph codegen        # sinh ../generated/schema.ts và ../generated/GameItem/GameItem.ts
```

```typescript
// src/mapping.ts
import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { Transfer as TransferEvent, ItemMinted } from "../generated/GameItem/GameItem";
import { Token, Account, Transfer, Collection } from "../generated/schema";

const ZERO = BigInt.fromI32(0);
const ONE = BigInt.fromI32(1);
const COLLECTION_ID = "singleton";

// lấy Account, tạo mới nếu chưa có (upsert)
function loadOrCreateAccount(address: Bytes): Account {
  let acc = Account.load(address.toHexString());
  if (acc == null) {
    acc = new Account(address.toHexString());
    acc.tokenCount = 0;
    acc.save();
  }
  return acc as Account;
}

function loadOrCreateCollection(): Collection {
  let c = Collection.load(COLLECTION_ID);
  if (c == null) {
    c = new Collection(COLLECTION_ID);
    c.totalMinted = ZERO;
    c.totalTransfers = ZERO;
  }
  return c as Collection;
}

export function handleItemMinted(event: ItemMinted): void {
  let owner = loadOrCreateAccount(event.params.owner);

  let token = new Token(event.params.tokenId.toString());
  token.tokenId = event.params.tokenId;
  token.owner = owner.id;                       // gán bằng id (string), không phải object
  token.tokenURI = event.params.tokenURI;
  token.mintedAt = event.block.timestamp;
  token.save();

  owner.tokenCount = owner.tokenCount + 1;
  owner.save();

  let col = loadOrCreateCollection();
  col.totalMinted = col.totalMinted.plus(ONE);
  col.save();
}

export function handleTransfer(event: TransferEvent): void {
  // mint (from = 0x0) đã xử lý ở handleItemMinted → chỉ đếm, không tạo lại Token
  let isMint = event.params.from.toHexString() == "0x0000000000000000000000000000000000000000";

  let token = Token.load(event.params.tokenId.toString());
  if (token == null) {
    // phòng trường hợp Transfer tới trước ItemMinted trong cùng block
    return;
  }

  let from = loadOrCreateAccount(event.params.from);
  let to = loadOrCreateAccount(event.params.to);

  // cập nhật chủ sở hữu
  if (!isMint) {
    token.owner = to.id;
    token.save();
    from.tokenCount = from.tokenCount - 1;
    from.save();
    to.tokenCount = to.tokenCount + 1;
    to.save();
  }

  // ghi lịch sử transfer (immutable) — id duy nhất = txHash-logIndex
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let transfer = new Transfer(id);
  transfer.token = token.id;
  transfer.from = from.id;
  transfer.to = to.id;
  transfer.timestamp = event.block.timestamp;
  transfer.txHash = event.transaction.hash;
  transfer.save();

  let col = loadOrCreateCollection();
  col.totalTransfers = col.totalTransfers.plus(ONE);
  col.save();
}
```

Những bẫy hay gặp:
- **Không so sánh `== null` bằng `!`**: dùng `entity == null` rồi ép kiểu `as Account`.
- **Gán quan hệ bằng `id`** (`token.owner = owner.id`) chứ không phải bằng object.
- **`BigInt` phải dùng `.plus()/.minus()`**, không dùng `+/-` cho uint256.
- Handler chạy **tuần tự theo thứ tự event trên chain** → có thể dựa vào trạng thái đã ghi ở event trước.

### 3.5 Build & deploy

```bash
graph codegen && graph build      # biên dịch mapping ra WASM

# đăng nhập Subgraph Studio (lấy deploy key ở thegraph.com/studio)
graph auth <DEPLOY_KEY>

# deploy — bump version mỗi lần
graph deploy game-items --version-label v0.0.1
```

Studio cho bạn một **query endpoint** dạng
`https://api.studio.thegraph.com/query/<id>/game-items/v0.0.1`.
Khi lên mạng chính (mainnet) bạn **publish** subgraph lên decentralized network và **curate GRT signal** để các indexer thật phục vụ nó.

Muốn chạy **hoàn toàn local** (không cần Studio) — dựng graph-node bằng Docker:

```bash
# docker-compose có graph-node + ipfs + postgres
docker compose up -d
graph create --node http://localhost:8020/ game-items
graph deploy --node http://localhost:8020/ --ipfs http://localhost:5001 game-items
# endpoint: http://localhost:8000/subgraphs/name/game-items
```

### 3.6 Query GraphQL từ frontend

Giờ mọi câu hỏi khó thành 1 request. Ví dụ **NFT mà một địa chỉ đang giữ + lịch sử transfer**:

```graphql
query TokensOfOwner($owner: ID!) {
  account(id: $owner) {
    tokenCount
    tokens(first: 20, orderBy: mintedAt, orderDirection: desc) {
      tokenId
      tokenURI
      mintedAt
      transfers(orderBy: timestamp, orderDirection: desc, first: 5) {
        from { id }
        to { id }
        timestamp
        txHash
      }
    }
  }
  collection(id: "singleton") {
    totalMinted
    totalTransfers
  }
}
```

Gọi từ React (fetch thuần, không cần thư viện):

```typescript
const ENDPOINT = "https://api.studio.thegraph.com/query/<id>/game-items/v0.0.1";

async function fetchTokens(owner: string) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: /* GraphQL */ `
        query ($owner: ID!) {
          account(id: $owner) {
            tokenCount
            tokens(first: 20, orderBy: mintedAt, orderDirection: desc) {
              tokenId tokenURI mintedAt
            }
          }
        }`,
      variables: { owner: owner.toLowerCase() },   // address lưu lowercase!
    }),
  });
  const { data, errors } = await res.json();
  if (errors) throw new Error(errors[0].message);
  return data.account?.tokens ?? [];
}
```

Lưu ý `owner.toLowerCase()`: trong mapping ta lưu id bằng `toHexString()` → luôn lowercase, nên khi query phải normalize theo đúng dạng đã lưu.

Với Apollo Client:

```typescript
import { ApolloClient, InMemoryCache, gql } from "@apollo/client";

const client = new ApolloClient({ uri: ENDPOINT, cache: new InMemoryCache() });

const { data } = await client.query({
  query: gql`
    query ($owner: ID!) {
      account(id: $owner) { tokenCount tokens { tokenId tokenURI } }
    }`,
  variables: { owner: address.toLowerCase() },
});
```

---

## 4. IPFS — lưu file cho on-chain data

On-chain lưu file là **cực đắt** (mỗi byte tốn gas). Chuẩn thực tế: **để file off-chain trên IPFS, chỉ lưu CID trên chain**. Đây chính là lý do `tokenURI` của NFT thường là `ipfs://Qm…`.

### 4.1 CID = địa chỉ theo nội dung

IPFS là **content-addressed**: địa chỉ file (**CID** — Content Identifier) là **hash của chính nội dung**. Sửa 1 byte → CID đổi hoàn toàn. Vì thế CID vừa là địa chỉ vừa là **bằng chứng bất biến**: nếu tải về đúng CID, bạn chắc chắn nội dung không bị đổi.

Nhưng IPFS **không tự lưu vĩnh viễn**: một node chỉ giữ file khi được **pin**. Nếu không ai pin, file bị dọn (garbage collect) và biến mất → cần **pinning service** (web3.storage, Pinata, Filecoin).

### 4.2 Pin bằng web3.storage

```typescript
import { create } from "@web3-storage/w3up-client";

async function uploadMetadata(name: string, imageFile: File) {
  const client = await create();
  await client.login("you@example.com");        // xác thực email lần đầu
  await client.setCurrentSpace("did:key:...");  // space đã tạo

  // 1) upload ảnh trước, lấy CID
  const imageCid = await client.uploadFile(imageFile);

  // 2) tạo metadata JSON chuẩn ERC-721 trỏ tới ảnh
  const metadata = {
    name,
    description: "A game item NFT",
    image: `ipfs://${imageCid}/`,
    attributes: [{ trait_type: "rarity", value: "rare" }],
  };
  const blob = new Blob([JSON.stringify(metadata)], { type: "application/json" });
  const metadataCid = await client.uploadFile(new File([blob], "metadata.json"));

  return `ipfs://${metadataCid}`;                // dùng làm tokenURI khi mint
}
```

### 4.3 Pin bằng Pinata (REST API)

```typescript
async function pinJSONToPinata(metadata: object): Promise<string> {
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PINATA_JWT}`,   // JWT, KHÔNG để lộ ở client
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: { name: "metadata.json" },
    }),
  });
  const { IpfsHash } = await res.json();
  return `ipfs://${IpfsHash}`;
}
```

> Bảo mật: JWT/API key của Pinata **không được nhúng vào frontend** (ai xem source cũng lấy được). Upload phải đi qua **backend** của bạn, hoặc dùng **presigned upload URL** một lần. Client chỉ nhận về CID.

### 4.4 Đọc lại file qua gateway

Trình duyệt không nói IPFS nativelly → đổi `ipfs://CID` sang HTTP gateway:

```typescript
function ipfsToHttp(uri: string): string {
  // ipfs://Qm.../metadata.json  →  https://<gw>/ipfs/Qm.../metadata.json
  const cidPath = uri.replace("ipfs://", "");
  return `https://gateway.pinata.cloud/ipfs/${cidPath}`;   // hoặc gateway riêng
}

async function loadTokenMetadata(tokenURI: string) {
  const res = await fetch(ipfsToHttp(tokenURI));
  return res.json();     // { name, image: "ipfs://...", attributes }
  // nhớ đổi tiếp metadata.image sang gateway để hiển thị <img>
}
```

### 4.5 Ghép The Graph + IPFS trong subgraph

The Graph có thể **tự fetch file IPFS ngay trong mapping** để tách metadata thành entity query được. Trong `mapping.ts`:

```typescript
import { ipfs, json, JSONValueKind } from "@graphprotocol/graph-ts";

export function handleItemMinted(event: ItemMinted): void {
  let token = new Token(event.params.tokenId.toString());
  token.tokenURI = event.params.tokenURI;

  // tokenURI = "ipfs://Qm.../metadata.json" → bỏ prefix lấy path
  let path = event.params.tokenURI.replace("ipfs://", "");
  let bytes = ipfs.cat(path);            // đọc file từ IPFS node của indexer
  if (bytes !== null) {
    let obj = json.fromBytes(bytes as Bytes).toObject();
    let nameVal = obj.get("name");
    if (nameVal !== null && nameVal.kind == JSONValueKind.STRING) {
      token.name = nameVal.toString();   // thêm field name vào schema Token
    }
  }
  token.save();
}
```

Lưu ý: `ipfs.cat` là **best-effort** — nếu file chưa được pin/không truy cập được, nó trả `null` và indexer **không retry**. Vì vậy chỉ dùng cho metadata **đã pin chắc chắn** (immutable), và luôn kiểm tra `null`.

---

## 5. So sánh các cách lấy dữ liệu

| Cách | Độ trễ | Query phức tạp | Lịch sử | Chi phí vận hành | Khi nào dùng |
|------|--------|----------------|---------|------------------|--------------|
| **eth_call trực tiếp** | thấp (1 key) | không | không | RPC credit | đọc 1 state đã biết |
| **eth_getLogs tự index** | cao | tự code | có (tự lưu) | tự chạy DB | prototype nhỏ |
| **The Graph (hosted/Studio)** | thấp | có sẵn | có | phí query/GRT | app production |
| **The Graph self-host** | thấp | có sẵn | có | tự chạy graph-node | cần private/kiểm soát |

---

## 6. Tóm tắt
- Node chỉ cho RPC **cấp thấp**: không join, không sort, `getLogs` giới hạn range, phải tự xử lý reorg → **query thẳng node để làm UI là kém**.
- **The Graph** nghe event một lần, ghi vào store theo **schema bạn định nghĩa**, expose **GraphQL** có filter/sort/pagination.
- Một subgraph gồm 3 mảnh: **`schema.graphql`** (entity/bảng), **`subgraph.yaml`** (contract+event→handler), **mapping AssemblyScript** (biến event thành entity).
- Nhớ `startBlock` đúng, address lưu **lowercase**, quan hệ gán bằng **`id`**, dùng `@derivedFrom` cho quan hệ ngược.
- File nặng để **off-chain trên IPFS**, on-chain chỉ giữ **CID**; phải **pin** (web3.storage/Pinata) nếu không file biến mất. Key pinning **không để lộ ở client**.
- The Graph có thể `ipfs.cat` ngay trong mapping để index cả metadata — nhưng là best-effort, luôn check `null`.

> **Bài tiếp theo:** đưa toàn bộ stack lên production — RPC provider, monitoring subgraph, và tối ưu chi phí query.
