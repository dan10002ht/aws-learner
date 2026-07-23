# Bài 50 — Capstone 4: Full dApp (contract + frontend + indexer)

## 1. Mục tiêu
Đây là **dự án thực chiến end-to-end**. Kết thúc bài bạn có một dApp chạy thật trên **Sepolia**, gồm ba tầng ghép lại:
- **Smart contract** Solidity (`Guestbook` — sổ lưu bút on-chain có phí "tip"), test & deploy bằng **Foundry**.
- **Indexer** bằng **subgraph The Graph** — lắng nghe `event`, ghi vào GraphQL để query nhanh, không phải quét chain.
- **Frontend** React + **wagmi/viem** — connect ví, **đọc** state, **ghi** giao dịch, và hiển thị dữ liệu đã index qua GraphQL.

Trọng tâm: hiểu **tại sao cần cả 3 tầng** và **luồng dữ liệu** chảy giữa chúng, chứ không chỉ copy code.

---

## 2. Kiến trúc — ba tầng và luồng dữ liệu

Một dApp production **không đọc thẳng toàn bộ lịch sử từ chain**. RPC `eth_getLogs` chậm và giới hạn range; muốn hiển thị "100 tin nhắn mới nhất, sắp theo tip" thì query trực tiếp chain gần như bất khả thi. Vì vậy có **luật phân vai**:

- **Ghi** (write) và **đọc state hiện tại** (current storage) → nói thẳng với contract qua RPC (wagmi/viem).
- **Đọc lịch sử / danh sách / tổng hợp** → hỏi **indexer** (The Graph), vì nó đã "đọc hết event một lần" và lưu vào DB truy vấn được.

<svg viewBox="0 0 720 300" role="img" aria-labelledby="arch-t arch-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="arch-t">Kiến trúc dApp ba tầng</title>
<desc id="arch-d">Frontend ghi giao dịch vào contract; contract phát event; subgraph index event; frontend đọc danh sách từ subgraph qua GraphQL</desc>
<rect x="30" y="115" width="150" height="70" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="145" text-anchor="middle" font-size="14" fill="currentColor">Frontend</text>
<text x="105" y="165" text-anchor="middle" font-size="11" fill="currentColor">React + wagmi/viem</text>
<rect x="290" y="115" width="150" height="70" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="365" y="145" text-anchor="middle" font-size="14" fill="currentColor">Contract</text>
<text x="365" y="165" text-anchor="middle" font-size="11" fill="currentColor">Guestbook.sol</text>
<rect x="550" y="115" width="150" height="70" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="625" y="145" text-anchor="middle" font-size="14" fill="currentColor">Indexer</text>
<text x="625" y="165" text-anchor="middle" font-size="11" fill="currentColor">The Graph</text>
<line x1="180" y1="135" x2="288" y2="135" stroke="currentColor" stroke-width="1.5" marker-end="url(#a4)"/>
<text x="234" y="126" text-anchor="middle" font-size="11" fill="#3b82f6">write tx</text>
<line x1="288" y1="165" x2="182" y2="165" stroke="currentColor" stroke-width="1.5" marker-end="url(#a4)" stroke-dasharray="4 3"/>
<text x="234" y="182" text-anchor="middle" font-size="11" fill="currentColor">read state</text>
<line x1="440" y1="150" x2="548" y2="150" stroke="currentColor" stroke-width="1.5" marker-end="url(#a4)"/>
<text x="494" y="141" text-anchor="middle" font-size="11" fill="#8b5cf6">events</text>
<path d="M600 115 C600 55 200 55 130 112" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#a4)"/>
<text x="365" y="55" text-anchor="middle" font-size="11" fill="#10b981">GraphQL: danh sách đã index</text>
<text x="365" y="250" text-anchor="middle" font-size="11" fill="currentColor">Ghi &amp; đọc-state đi thẳng contract — Đọc danh sách/lịch sử đi qua indexer</text>
<defs><marker id="a4" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Điểm khớp nối quan trọng:** cả ba tầng đồng bộ nhờ **`struct` và `event` được thiết kế chung từ đầu**. Contract emit event → subgraph map event thành entity → frontend query entity. Nếu bạn đổi tên field trong event, cả subgraph lẫn frontend phải đổi theo.

---

## 3. Tầng 1 — Smart contract (Foundry)

Khởi tạo dự án:

```bash
forge init guestbook-dapp && cd guestbook-dapp
```

`src/Guestbook.sol` — sổ lưu bút: ai cũng đăng được tin nhắn, gửi kèm **tip** (ETH) cho chủ contract, và emit event đầy đủ để index.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Guestbook {
    struct Entry {
        address author;
        string  message;
        uint256 tip;        // wei kèm theo
        uint256 timestamp;
    }

    address public immutable owner;
    Entry[] private entries;
    mapping(address => uint256) public tipsByAuthor;

    // Event là "API" cho indexer. indexed => filter/search được theo trường đó.
    event NewEntry(
        uint256 indexed id,
        address indexed author,
        string  message,
        uint256 tip,
        uint256 timestamp
    );

    error EmptyMessage();
    error MessageTooLong();

    constructor() {
        owner = msg.sender;
    }

    function post(string calldata message) external payable returns (uint256 id) {
        if (bytes(message).length == 0)   revert EmptyMessage();
        if (bytes(message).length > 280)  revert MessageTooLong();

        id = entries.length;
        entries.push(Entry(msg.sender, message, msg.value, block.timestamp));
        tipsByAuthor[msg.sender] += msg.value;

        emit NewEntry(id, msg.sender, message, msg.value, block.timestamp);
    }

    function total() external view returns (uint256) {
        return entries.length;
    }

    function getEntry(uint256 id) external view returns (Entry memory) {
        return entries[id];
    }

    // Chủ contract rút toàn bộ tip đã nhận.
    function withdraw() external {
        require(msg.sender == owner, "not owner");
        (bool ok, ) = owner.call{value: address(this).balance}("");
        require(ok, "transfer failed");
    }
}
```

Điểm thiết kế cần nhớ:
- **`indexed`** trên `id` và `author` cho phép subgraph (và `eth_getLogs`) **filter theo topic** — muốn "tất cả tin của địa chỉ X" thì `author` phải `indexed`.
- **`getEntry`/`total`** là đường **đọc-state trực tiếp** cho frontend (ví dụ đọc chi tiết 1 entry) — không cần indexer.
- **Custom error** (`revert EmptyMessage()`) rẻ gas hơn string require và frontend `viem` decode được để hiện lỗi thân thiện.

### Test bằng Foundry

`test/Guestbook.t.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Guestbook} from "../src/Guestbook.sol";

contract GuestbookTest is Test {
    Guestbook gb;
    address alice = address(0xA11CE);

    function setUp() public {
        gb = new Guestbook();
        vm.deal(alice, 10 ether);
    }

    function test_PostEmitsEventAndStores() public {
        vm.expectEmit(true, true, false, true);
        emit Guestbook.NewEntry(0, alice, "gm", 1 ether, block.timestamp);

        vm.prank(alice);
        uint256 id = gb.post{value: 1 ether}("gm");

        assertEq(id, 0);
        assertEq(gb.total(), 1);
        assertEq(gb.tipsByAuthor(alice), 1 ether);
        assertEq(gb.getEntry(0).message, "gm");
    }

    function test_RevertOnEmpty() public {
        vm.expectRevert(Guestbook.EmptyMessage.selector);
        gb.post("");
    }

    function test_OwnerWithdraws() public {
        vm.prank(alice);
        gb.post{value: 2 ether}("hi");
        uint256 before = address(this).balance;
        gb.withdraw();               // this == owner (đã deploy trong setUp)
        assertEq(address(this).balance, before + 2 ether);
    }

    receive() external payable {}     // để nhận ETH khi withdraw
}
```

```bash
forge test -vvv        # chạy test; -vvv để xem trace khi fail
```

`vm.expectEmit(true, true, false, true)` kiểm tra 2 topic indexed đầu + toàn bộ data — đây chính là bước **bảo đảm event khớp** với thứ subgraph sẽ map.

### Deploy lên Sepolia

`script/Deploy.s.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {Guestbook} from "../src/Guestbook.sol";

contract Deploy is Script {
    function run() external returns (Guestbook gb) {
        vm.startBroadcast();       // dùng PRIVATE_KEY từ CLI
        gb = new Guestbook();
        vm.stopBroadcast();
    }
}
```

```bash
# .env: SEPOLIA_RPC_URL, PRIVATE_KEY (ví TEST, có Sepolia ETH từ faucet), ETHERSCAN_API_KEY
source .env
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast --verify --etherscan-api-key $ETHERSCAN_API_KEY
```

Ghi lại **địa chỉ contract** và **block deploy** — subgraph cần `startBlock` để không phải quét từ genesis. Lấy ABI ở `out/Guestbook.sol/Guestbook.json` cho cả subgraph và frontend.

---

## 4. Tầng 2 — Indexer (subgraph The Graph)

```bash
npm install -g @graphprotocol/graph-cli
graph init --studio guestbook   # dán address + startBlock + ABI khi hỏi
```

**`schema.graphql`** — định nghĩa entity mà frontend sẽ query. Mỗi entity ~ một dòng bảng trong DB:

```graphql
type Entry @entity(immutable: true) {
  id: Bytes!            # dùng txHash-logIndex làm khóa duy nhất
  entryId: BigInt!
  author: Bytes!
  message: String!
  tip: BigInt!
  timestamp: BigInt!
}

type Author @entity {
  id: Bytes!            # địa chỉ author
  totalTips: BigInt!
  entryCount: BigInt!
}
```

**`subgraph.yaml`** (rút gọn) — chỉ contract nào, event nào, handler nào:

```yaml
dataSources:
  - kind: ethereum
    name: Guestbook
    network: sepolia
    source:
      address: "0xYourContract"
      abi: Guestbook
      startBlock: 5123456
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities: [Entry, Author]
      abis:
        - name: Guestbook
          file: ./abis/Guestbook.json
      eventHandlers:
        - event: NewEntry(indexed uint256,indexed address,string,uint256,uint256)
          handler: handleNewEntry
      file: ./src/mapping.ts
```

**`src/mapping.ts`** — hàm chạy **mỗi khi có event `NewEntry`**, biến event thành entity. Đây là "trái tim" của indexer:

```typescript
import { NewEntry } from "../generated/Guestbook/Guestbook";
import { Entry, Author } from "../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";

export function handleNewEntry(event: NewEntry): void {
  // id duy nhất theo tx + vị trí log => idempotent, tránh trùng
  let entry = new Entry(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entry.entryId  = event.params.id;
  entry.author   = event.params.author;
  entry.message  = event.params.message;
  entry.tip      = event.params.tip;
  entry.timestamp = event.params.timestamp;
  entry.save();

  // Cập nhật tổng hợp theo author (load-or-create)
  let author = Author.load(event.params.author);
  if (author == null) {
    author = new Author(event.params.author);
    author.totalTips  = BigInt.zero();
    author.entryCount = BigInt.zero();
  }
  author.totalTips  = author.totalTips.plus(event.params.tip);
  author.entryCount = author.entryCount.plus(BigInt.fromI32(1));
  author.save();
}
```

```bash
graph codegen && graph build           # sinh type từ ABI + schema
graph deploy guestbook                  # đẩy lên Subgraph Studio
```

Chờ subgraph **sync** tới block hiện tại, rồi test query trong Studio playground:

```graphql
{
  entries(first: 20, orderBy: timestamp, orderDirection: desc) {
    entryId author message tip timestamp
  }
}
```

Chú ý: subgraph làm được thứ contract **không** làm nổi rẻ tiền — **sắp xếp, phân trang, tổng hợp** (`Author.totalTips`). Contract chỉ emit dữ liệu thô; indexer biến nó thành dạng query được.

---

## 5. Tầng 3 — Frontend (React + wagmi/viem)

```bash
npm create vite@latest guestbook-ui -- --template react-ts
cd guestbook-ui && npm i wagmi viem @tanstack/react-query
```

**`config.ts`** — cấu hình chain + client:

```typescript
import { http, createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const config = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: { [sepolia.id]: http(import.meta.env.VITE_RPC_URL) },
});

export const GUESTBOOK = "0xYourContract" as const;
export const SUBGRAPH_URL = import.meta.env.VITE_SUBGRAPH_URL;
```

Bọc app trong provider (trong `main.tsx`):

```tsx
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "./config";

const qc = new QueryClient();
// <WagmiProvider config={config}><QueryClientProvider client={qc}><App/></QueryClientProvider></WagmiProvider>
```

**`abi.ts`** — chỉ giữ phần frontend dùng (viem cần ABI để encode/decode):

```typescript
export const guestbookAbi = [
  { type: "function", name: "post", stateMutability: "payable",
    inputs: [{ name: "message", type: "string" }],
    outputs: [{ name: "id", type: "uint256" }] },
  { type: "function", name: "total", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint256" }] },
  { type: "error", name: "EmptyMessage", inputs: [] },
] as const;
```

**`App.tsx`** — connect ví + **ghi** giao dịch `post` + **đọc-state** `total`:

```tsx
import { useState } from "react";
import { parseEther } from "viem";
import {
  useAccount, useConnect, useReadContract,
  useWriteContract, useWaitForTransactionReceipt,
} from "wagmi";
import { guestbookAbi } from "./abi";
import { GUESTBOOK } from "./config";
import { Feed } from "./Feed";

export default function App() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const [msg, setMsg] = useState("");
  const [tip, setTip] = useState("0");

  // ĐỌC-STATE trực tiếp contract (số entry hiện tại)
  const { data: total } = useReadContract({
    address: GUESTBOOK, abi: guestbookAbi, functionName: "total",
  });

  // GHI: gửi tx post()
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: mining, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  if (!isConnected)
    return <button onClick={() => connect({ connector: connectors[0] })}>
      Connect Wallet
    </button>;

  return (
    <main>
      <p>Đã kết nối: {address} — tổng entry: {total?.toString() ?? "…"}</p>
      <textarea value={msg} maxLength={280}
        onChange={(e) => setMsg(e.target.value)} placeholder="Lời nhắn…" />
      <input value={tip} onChange={(e) => setTip(e.target.value)}
        placeholder="tip (ETH)" />
      <button disabled={isPending || mining || !msg}
        onClick={() => writeContract({
          address: GUESTBOOK, abi: guestbookAbi, functionName: "post",
          args: [msg], value: parseEther(tip || "0"),
        })}>
        {mining ? "Đang xác nhận…" : "Đăng"}
      </button>
      {isSuccess && <p>✓ Đã lên chain! (subgraph sẽ index sau vài giây)</p>}
      <Feed />
    </main>
  );
}
```

**`Feed.tsx`** — **đọc danh sách** từ subgraph qua GraphQL (dùng react-query để cache & refetch):

```tsx
import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";
import { SUBGRAPH_URL } from "./config";

const QUERY = `{
  entries(first: 50, orderBy: timestamp, orderDirection: desc) {
    entryId author message tip timestamp
  }
}`;

async function fetchEntries() {
  const res = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY }),
  });
  const { data } = await res.json();
  return data.entries as {
    entryId: string; author: string;
    message: string; tip: string; timestamp: string;
  }[];
}

export function Feed() {
  // refetch mỗi 5s để bắt entry mới sau khi subgraph index xong
  const { data, isLoading } = useQuery({
    queryKey: ["entries"], queryFn: fetchEntries, refetchInterval: 5000,
  });
  if (isLoading) return <p>Đang tải feed…</p>;
  return (
    <ul>
      {data?.map((e) => (
        <li key={e.entryId}>
          <b>{e.author.slice(0, 6)}…</b>: {e.message}
          {e.tip !== "0" && <em> — tip {formatEther(BigInt(e.tip))} ETH</em>}
        </li>
      ))}
    </ul>
  );
}
```

---

## 6. Luồng chạy thật — vòng đời một tin nhắn

<svg viewBox="0 0 720 250" role="img" aria-labelledby="flow-t flow-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="flow-t">Vòng đời một tin nhắn qua ba tầng</title>
<desc id="flow-d">Người dùng gửi tx post, contract emit event, subgraph index, feed refetch và hiển thị</desc>
<rect x="20" y="100" width="120" height="55" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="124" text-anchor="middle" font-size="12" fill="currentColor">1. User bấm</text>
<text x="80" y="141" text-anchor="middle" font-size="12" fill="currentColor">Đăng</text>
<rect x="180" y="100" width="120" height="55" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="240" y="124" text-anchor="middle" font-size="12" fill="currentColor">2. tx vào block</text>
<text x="240" y="141" text-anchor="middle" font-size="12" fill="currentColor">emit NewEntry</text>
<rect x="340" y="100" width="120" height="55" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="400" y="124" text-anchor="middle" font-size="12" fill="currentColor">3. subgraph</text>
<text x="400" y="141" text-anchor="middle" font-size="12" fill="currentColor">handleNewEntry</text>
<rect x="500" y="100" width="120" height="55" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="560" y="124" text-anchor="middle" font-size="12" fill="currentColor">4. Entity lưu</text>
<text x="560" y="141" text-anchor="middle" font-size="12" fill="currentColor">GraphQL sẵn</text>
<rect x="630" y="100" width="70" height="55" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="665" y="124" text-anchor="middle" font-size="12" fill="currentColor">5. Feed</text>
<text x="665" y="141" text-anchor="middle" font-size="12" fill="currentColor">refetch</text>
<line x1="140" y1="127" x2="178" y2="127" stroke="currentColor" stroke-width="1.5" marker-end="url(#a5)"/>
<line x1="300" y1="127" x2="338" y2="127" stroke="currentColor" stroke-width="1.5" marker-end="url(#a5)"/>
<line x1="460" y1="127" x2="498" y2="127" stroke="currentColor" stroke-width="1.5" marker-end="url(#a5)"/>
<line x1="620" y1="127" x2="628" y2="127" stroke="currentColor" stroke-width="1.5" marker-end="url(#a5)"/>
<text x="360" y="200" text-anchor="middle" font-size="11" fill="currentColor">Độ trễ index vài giây → dùng optimistic UI hoặc refetchInterval để trải nghiệm mượt</text>
<defs><marker id="a5" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Độ trễ index** là đặc trưng phải xử lý: sau khi tx confirm, subgraph mất vài giây tới vài block mới index xong. Hai cách xử lý UX: (1) **`refetchInterval`** như trên; (2) **optimistic update** — chèn tạm entry vào feed ngay khi tx success, rồi để refetch thay bằng dữ liệu thật.

---

## 7. Những lỗi thực chiến hay gặp

| Triệu chứng | Nguyên nhân | Cách sửa |
|-------------|-------------|----------|
| Feed trống dù tx thành công | subgraph chưa sync / sai `startBlock` | Kiểm tra trạng thái sync trong Studio; đặt `startBlock` = block deploy |
| Query lỗi field | schema ↔ frontend lệch tên | Đồng bộ tên field giữa `schema.graphql` và query |
| `post` revert không rõ lý do | thiếu custom error trong ABI frontend | Thêm `type: "error"` vào `abi.ts` để viem decode |
| Không filter được theo author | event thiếu `indexed` | Thêm `indexed` vào tham số event, redeploy contract + subgraph |
| Tip hiển thị sai | quên đổi wei ↔ ETH | Dùng `formatEther`/`parseEther` ở biên frontend |

---

## 8. Tóm tắt
- dApp production chia **ba tầng**: contract (nguồn chân lý), indexer (biến event thành dữ liệu query được), frontend (đọc/ghi + hiển thị).
- **Luật phân vai:** ghi & đọc-state đi thẳng contract; đọc **danh sách/lịch sử/tổng hợp** đi qua indexer — vì query chain trực tiếp quá chậm & giới hạn.
- **Event là hợp đồng chung** của cả ba tầng: thiết kế `struct` + `event` với `indexed` đúng ngay từ đầu, mọi tầng bám theo.
- **Foundry** lo test (`vm.expectEmit` khớp event) và deploy/verify Sepolia; **The Graph** lo index (`mapping.ts` load-or-create entity); **wagmi/viem** lo connect ví, `useWriteContract`, `useReadContract`, và fetch GraphQL.
- Xử lý **độ trễ index** bằng `refetchInterval` hoặc optimistic UI — đây là khác biệt giữa demo và sản phẩm dùng được.

> Bạn vừa ghép trọn một sản phẩm on-chain. Từ đây có thể mở rộng: phân trang subgraph, thêm ENS resolve tên author, gộp nhiều contract, hoặc chuyển sang L2 để phí rẻ hơn.
