# Bài 48 — Full-stack Web3: viem/wagmi & kết nối ví

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân biệt **viem** (thư viện lõi TypeScript) vs **wagmi** (bộ React hooks bọc quanh viem) — dùng cái nào khi nào.
- Nắm bản chất **Public Client** (provider — đọc chain) vs **Wallet Client** (signer — ký & gửi tx), và **Transport**.
- Cấu hình **connect wallet**: injected (MetaMask/EIP-6963) và **WalletConnect**; đọc account/chain state.
- **Đọc contract** với `useReadContract` và **ghi** với `useWriteContract` + `useWaitForTransactionReceipt`.
- **Ký message**: EIP-191 (`personal_sign`) vs EIP-712 (typed data) — dùng cho off-chain auth & meta-tx.
- **Theo dõi** trạng thái tx (idle → pending → confirming → success) và **lắng nghe event** on-chain.
- Xử lý **chain switching** an toàn: phát hiện sai mạng, `useSwitchChain`, guard trước khi ghi.

---

## 2. Lý thuyết

### 2.1 viem vs wagmi — hai tầng, đừng lẫn lộn

**viem** là thư viện TypeScript low-level thay thế ethers.js/web3.js: type-safe, tree-shakeable, encode/decode ABI, gọi JSON-RPC. Nó **không phụ thuộc React** — dùng được ở backend, script, bot.

**wagmi** là tầng React **trên** viem: biến các thao tác của viem thành **hooks** (`useReadContract`, `useAccount`...) có sẵn caching, dedupe, reactivity nhờ **TanStack Query**. Bạn hầu như không tự viết `useEffect` để fetch — wagmi lo cache, refetch, loading/error state.

> Quy tắc: trong **component React** dùng **wagmi hooks**. Cần logic ngoài render (event handler phức tạp, script, server) thì rơi xuống **viem** trực tiếp qua `getPublicClient()` / `getWalletClient()`.

### 2.2 Provider vs Signer — hai loại "client"

Đây là khái niệm quan trọng nhất của lớp kết nối. viem tách đôi rạch ròi:

| | **Public Client** (provider) | **Wallet Client** (signer) |
|---|---|---|
| Vai trò | **Đọc** chain: `readContract`, `getBalance`, `getLogs`, ước lượng gas | **Ký & gửi**: `sendTransaction`, `writeContract`, `signMessage` |
| Cần private key? | Không — chỉ đọc dữ liệu công khai | Có — thông qua ví (MetaMask giữ key, ký hộ) |
| Transport | Thường là HTTP RPC (Alchemy/Infura) | `custom(window.ethereum)` / WalletConnect |
| wagmi hook tương ứng | `useReadContract`, `usePublicClient` | `useWriteContract`, `useWalletClient`, `useSignMessage` |

**Analogy:** Public Client như **cửa sổ tra cứu** ở ngân hàng — ai cũng nhìn được số dư, lịch sử. Wallet Client như **chữ ký + con dấu** của bạn — chỉ bạn (qua ví) mới tạo được lệnh chuyển tiền. Đọc thì miễn phí và không cần ai đồng ý; ghi thì phải **ký bằng private key** và trả **gas**.

**Transport** là "đường ống" chở JSON-RPC: `http()` (gọi node qua HTTP), `webSocket()` (subscribe realtime), `custom()` (đẩy request vào ví injected). Một client = chain + transport + (account nếu là wallet).

<svg viewBox="0 0 720 340" role="img" aria-labelledby="arch-t arch-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="arch-t">Kiến trúc lớp kết nối frontend Web3</title>
<desc id="arch-d">React component gọi wagmi hooks, hooks dùng viem clients, Public Client đọc qua RPC còn Wallet Client ký qua ví tới blockchain</desc>
<rect x="250" y="20" width="220" height="50" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="42" text-anchor="middle" font-size="14" fill="currentColor">React Component</text>
<text x="360" y="60" text-anchor="middle" font-size="11" fill="currentColor">useAccount · useReadContract · useWriteContract</text>
<rect x="250" y="100" width="220" height="46" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="128" text-anchor="middle" font-size="14" fill="currentColor">wagmi hooks (TanStack Query)</text>
<rect x="70" y="180" width="260" height="60" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="200" y="204" text-anchor="middle" font-size="14" fill="currentColor">Public Client (provider)</text>
<text x="200" y="224" text-anchor="middle" font-size="11" fill="currentColor">đọc: read · getLogs · gas — transport http()</text>
<rect x="390" y="180" width="260" height="60" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="520" y="204" text-anchor="middle" font-size="14" fill="currentColor">Wallet Client (signer)</text>
<text x="520" y="224" text-anchor="middle" font-size="11" fill="currentColor">ký: write · sign — transport custom(ví)</text>
<rect x="70" y="285" width="260" height="40" rx="10" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="200" y="310" text-anchor="middle" font-size="12" fill="currentColor">RPC node (Alchemy/Infura)</text>
<rect x="390" y="285" width="260" height="40" rx="10" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="520" y="310" text-anchor="middle" font-size="12" fill="currentColor">Ví (MetaMask / WalletConnect)</text>
<line x1="360" y1="70" x2="360" y2="98" stroke="currentColor" stroke-width="1.5" marker-end="url(#aa)"/>
<line x1="300" y1="146" x2="200" y2="178" stroke="currentColor" stroke-width="1.5" marker-end="url(#aa)"/>
<line x1="420" y1="146" x2="520" y2="178" stroke="currentColor" stroke-width="1.5" marker-end="url(#aa)"/>
<line x1="200" y1="240" x2="200" y2="283" stroke="currentColor" stroke-width="1.5" marker-end="url(#aa)"/>
<line x1="520" y1="240" x2="520" y2="283" stroke="currentColor" stroke-width="1.5" marker-end="url(#aa)"/>
<defs><marker id="aa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

---

## 3. Cấu hình wagmi & connect wallet

### 3.1 Cài đặt & config

```bash
npm i wagmi viem @tanstack/react-query
```

Tạo `config.ts` — nơi khai báo **chains**, **transports** (mỗi chain một RPC) và **connectors** (loại ví). `injected()` tự bắt các ví cắm vào `window.ethereum` (chuẩn mới **EIP-6963** cho phép nhiều ví cùng tồn tại, không tranh giành).

```ts
// wagmi.config.ts
import { http, createConfig } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

export const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    injected(),                                     // MetaMask, Rabby... (EIP-6963)
    walletConnect({ projectId: import.meta.env.VITE_WC_PROJECT_ID }),
  ],
  transports: {
    [mainnet.id]: http('https://eth-mainnet.g.alchemy.com/v2/KEY'),
    [sepolia.id]: http('https://eth-sepolia.g.alchemy.com/v2/KEY'),
  },
})

// Cho TypeScript autocomplete chain id chặt chẽ
declare module 'wagmi' {
  interface Register { config: typeof config }
}
```

> **RPC riêng, không dùng `http()` rỗng.** `http()` không tham số dùng public RPC mặc định — rate-limit gắt, dễ fail trên production. Luôn cắm endpoint Alchemy/Infura/QuickNode của bạn.

### 3.2 Provider tree

wagmi cần **WagmiProvider** + **QueryClientProvider** bao ngoài app (thứ tự này bắt buộc):

```tsx
// main.tsx
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './wagmi.config'

const queryClient = new QueryClient()

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
```

### 3.3 Nút Connect & đọc account state

`useConnect` liệt kê connectors; `useAccount` trả về trạng thái phản ứng theo thời gian thực (`status`: `connected | reconnecting | connecting | disconnected`). Không tự quản state ví bằng `useState` — wagmi đồng bộ với ví, kể cả khi user đổi account trong MetaMask.

```tsx
import { useAccount, useConnect, useDisconnect } from 'wagmi'

export function WalletButton() {
  const { address, chain, isConnected } = useAccount()
  const { connectors, connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected)
    return (
      <div>
        <span>{address?.slice(0, 6)}…{address?.slice(-4)} · {chain?.name}</span>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    )

  return (
    <div>
      {connectors.map((c) => (
        <button key={c.uid} disabled={isPending} onClick={() => connect({ connector: c })}>
          Connect {c.name}
        </button>
      ))}
    </div>
  )
}
```

---

## 4. Đọc contract — `useReadContract`

Đọc là **view/pure call** qua Public Client: không tốn gas, không cần ví. Truyền `abi`, `address`, `functionName`, `args`. wagmi tự cache theo TanStack Query và trả `{ data, isLoading, isError, refetch }`.

```tsx
import { useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { erc20Abi } from 'viem' // ABI ERC-20 chuẩn có sẵn

const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const

export function UsdcBalance({ owner }: { owner: `0x${string}` }) {
  const { data: balance, isLoading, refetch } = useReadContract({
    abi: erc20Abi,
    address: USDC,
    functionName: 'balanceOf',
    args: [owner],
    query: { enabled: Boolean(owner) }, // đừng gọi khi chưa có địa chỉ
  })

  if (isLoading) return <span>Loading…</span>
  return (
    <span onClick={() => refetch()}>
      {balance !== undefined ? formatUnits(balance, 6) : '0'} USDC
    </span>
  )
}
```

Điểm quan trọng:
- **`as const`** trên ABI/address giúp viem suy ra kiểu trả về chính xác (ở đây `balance: bigint`). Đây là điểm mạnh lớn nhất so với ethers: **type-safe end-to-end**.
- Số on-chain luôn là **`bigint`** (wei/smallest unit). Dùng `formatUnits`/`parseUnits` để đổi qua lại với đơn vị người đọc — **không** dùng `Number` (mất chính xác).
- Đọc nhiều field cùng lúc thì dùng **`useReadContracts`** (số nhiều) để batch qua **Multicall3**, chỉ 1 vòng RPC.

---

## 5. Ghi contract — `useWriteContract` + chờ receipt

Ghi là **state-changing tx**: ví hiện popup để user ký, tx vào mempool, rồi cần chờ **được confirm** trong block. Flow chuẩn gồm 2 bước tách biệt:

1. `useWriteContract` → gửi tx, trả về `hash` khi user đã ký.
2. `useWaitForTransactionReceipt` → poll cho tới khi tx được đóng block (`success`/`reverted`).

```tsx
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'

const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const

export function TransferUsdc({ to }: { to: `0x${string}` }) {
  const { data: hash, writeContract, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash })

  function onSend() {
    writeContract({
      abi: erc20Abi,
      address: USDC,
      functionName: 'transfer',
      args: [to, parseUnits('10', 6)], // 10 USDC
    })
  }

  return (
    <div>
      <button onClick={onSend} disabled={isPending || isConfirming}>
        {isPending ? 'Confirm in wallet…' : isConfirming ? 'Confirming…' : 'Send 10 USDC'}
      </button>
      {hash && <p>Tx: {hash}</p>}
      {isSuccess && <p>✅ Confirmed</p>}
      {error && <p>❌ {(error as any).shortMessage ?? error.message}</p>}
    </div>
  )
}
```

**Simulate trước khi ghi (best practice).** Với hàm dễ revert (approve/allowance, quyền hạn, số dư), dùng `useSimulateContract` để **dry-run** qua Public Client — nếu sẽ revert bạn biết *trước khi* làm phiền user ký, và nhận `request` đã type-hoá để đưa thẳng vào `writeContract`:

```tsx
import { useSimulateContract, useWriteContract } from 'wagmi'

const { data: sim } = useSimulateContract({
  abi: erc20Abi, address: USDC, functionName: 'transfer',
  args: [to, parseUnits('10', 6)],
})
const { writeContract } = useWriteContract()
// chỉ enable nút khi sim.request tồn tại (mô phỏng thành công)
<button disabled={!sim} onClick={() => writeContract(sim!.request)}>Send</button>
```

### 5.1 Vòng đời một tx — state machine

Đây là mô hình tinh thần bạn phải nắm để thiết kế UI đúng: mỗi trạng thái là một thông điệp khác nhau cho user.

<svg viewBox="0 0 760 210" role="img" aria-labelledby="tx-t tx-d" style="width:100%;max-width:740px;height:auto;display:block;margin:1.25rem auto">
<title id="tx-t">Vòng đời trạng thái của một giao dịch ghi</title>
<desc id="tx-d">Từ idle sang chờ ký trong ví, đã gửi vào mempool, đang confirm, rồi kết thúc thành công hoặc reverted</desc>
<rect x="20" y="80" width="120" height="50" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="102" text-anchor="middle" font-size="13" fill="currentColor">idle</text>
<text x="80" y="120" text-anchor="middle" font-size="10" fill="currentColor">chờ user bấm</text>
<rect x="180" y="80" width="130" height="50" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="245" y="102" text-anchor="middle" font-size="13" fill="currentColor">isPending</text>
<text x="245" y="120" text-anchor="middle" font-size="10" fill="currentColor">ký trong ví</text>
<rect x="350" y="80" width="130" height="50" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="415" y="100" text-anchor="middle" font-size="13" fill="currentColor">có hash</text>
<text x="415" y="118" text-anchor="middle" font-size="10" fill="currentColor">vào mempool</text>
<rect x="520" y="80" width="130" height="50" rx="10" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="585" y="100" text-anchor="middle" font-size="13" fill="currentColor">isConfirming</text>
<text x="585" y="118" text-anchor="middle" font-size="10" fill="currentColor">chờ block</text>
<rect x="640" y="15" width="110" height="42" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="695" y="41" text-anchor="middle" font-size="12" fill="currentColor">success</text>
<rect x="640" y="150" width="110" height="42" rx="10" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="695" y="176" text-anchor="middle" font-size="12" fill="currentColor">reverted</text>
<line x1="140" y1="105" x2="178" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#ta)"/>
<line x1="310" y1="105" x2="348" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#ta)"/>
<line x1="480" y1="105" x2="518" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#ta)"/>
<line x1="650" y1="90" x2="690" y2="57" stroke="currentColor" stroke-width="1.5" marker-end="url(#ta)"/>
<line x1="650" y1="120" x2="690" y2="150" stroke="currentColor" stroke-width="1.5" marker-end="url(#ta)"/>
<text x="245" y="70" text-anchor="middle" font-size="10" fill="#f43f5e">user reject → error</text>
<defs><marker id="ta" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Lưu ý: tx **có receipt** không đồng nghĩa **thành công**. Receipt có `status: 'success' | 'reverted'`. Một tx revert on-chain vẫn tốn gas và vẫn trả receipt — phải kiểm tra `status`, đừng chỉ dựa vào `isSuccess` của việc *có* receipt.

---

## 6. Ký message — EIP-191 vs EIP-712

Ký message là **off-chain**: không gửi tx, không tốn gas. Dùng để **chứng minh quyền sở hữu địa chỉ** (login "Sign-In with Ethereum"), tạo **meta-transaction**, hoặc **permit** (approve không cần tx).

| | **EIP-191** (`personal_sign`) | **EIP-712** (typed data) |
|---|---|---|
| Ví hiển thị | Một chuỗi text thô | **Struct có field/label** dễ đọc, an toàn |
| Dùng cho | Login đơn giản, nonce challenge | Permit, order DEX, vote gasless, bất kỳ dữ liệu có cấu trúc |
| Chống replay | Tự nhét nonce/domain vào string | Có **domain separator** (name, version, chainId, contract) chống replay xuyên chain/contract |
| wagmi hook | `useSignMessage` | `useSignTypedData` |

**EIP-712 luôn ưu tiên** khi ký dữ liệu có ý nghĩa: user thấy rõ mình ký gì (ví dụ "approve 100 USDC cho 0xRouter"), và `domain.chainId` + `verifyingContract` chặn chữ ký bị dùng lại ở chain/contract khác.

```tsx
// EIP-191: login challenge
import { useSignMessage } from 'wagmi'

const { signMessageAsync } = useSignMessage()
async function login(address: `0x${string}`) {
  const nonce = await fetch('/api/nonce').then((r) => r.text())
  const message = `app.example.com muốn bạn đăng nhập\nAddress: ${address}\nNonce: ${nonce}`
  const signature = await signMessageAsync({ message })
  // gửi {address, message, signature} lên server để verify (recover signer)
  await fetch('/api/verify', { method: 'POST', body: JSON.stringify({ message, signature }) })
}
```

```tsx
// EIP-712: ký permit ERC-2612 (approve gasless)
import { useSignTypedData } from 'wagmi'

const { signTypedDataAsync } = useSignTypedData()
async function signPermit(owner: `0x${string}`, spender: `0x${string}`, value: bigint) {
  const signature = await signTypedDataAsync({
    domain: {
      name: 'USD Coin', version: '2',
      chainId: 1, verifyingContract: USDC,           // domain separator
    },
    types: {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    primaryType: 'Permit',
    message: { owner, spender, value, nonce: 0n, deadline: BigInt(Date.now() + 3600_000) },
  })
  return signature // v,r,s tách ra rồi đưa vào contract.permit(...)
}
```

Server verify EIP-191 bằng viem (không cần wallet, chỉ cần Public Client):

```ts
import { verifyMessage } from 'viem'
const valid = await verifyMessage({ address, message, signature })
// với smart-contract wallet (EIP-1271) verifyMessage tự fallback gọi isValidSignature
```

---

## 7. Lắng nghe event on-chain

Sau khi ghi, thường ta muốn UI cập nhật khi contract phát **event** (ví dụ `Transfer`). `useWatchContractEvent` subscribe log realtime (qua WebSocket/polling), gọi callback mỗi khi có log khớp.

```tsx
import { useWatchContractEvent } from 'wagmi'

useWatchContractEvent({
  abi: erc20Abi,
  address: USDC,
  eventName: 'Transfer',
  args: { to: myAddress },        // lọc theo indexed topic → chỉ nhận tx gửi tới mình
  onLogs(logs) {
    for (const log of logs) {
      const { from, value } = log.args
      toast(`Nhận ${formatUnits(value!, 6)} USDC từ ${from}`)
    }
    queryClient.invalidateQueries()  // ép các useReadContract refetch số dư
  },
})
```

Đọc log lịch sử (không realtime) thì dùng viem `getLogs` / `getContractEvents` với `fromBlock`/`toBlock`. Nhớ: nhiều RPC **giới hạn khoảng block** mỗi query (thường ≤ 10k block) — chia nhỏ range nếu quét sâu.

---

## 8. Chain switching — guard trước khi ghi

User có thể đang ở **sai mạng** (ví dụ app chạy trên Sepolia nhưng ví đang ở mainnet). Ghi tx khi sai chain sẽ gửi lên nhầm mạng hoặc revert. `useAccount().chainId` cho biết chain hiện tại; `useSwitchChain` yêu cầu ví đổi mạng.

```tsx
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi'
import { sepolia } from 'wagmi/chains'

export function GuardedAction() {
  const { chainId } = useAccount()
  const { switchChain, isPending } = useSwitchChain()
  const { writeContract } = useWriteContract()
  const wrongNetwork = chainId !== sepolia.id

  if (wrongNetwork)
    return (
      <button disabled={isPending} onClick={() => switchChain({ chainId: sepolia.id })}>
        {isPending ? 'Switching…' : 'Chuyển sang Sepolia'}
      </button>
    )

  return (
    <button onClick={() => writeContract({ /* ...args... */ } as any)}>
      Thực hiện
    </button>
  )
}
```

Ba lưu ý về chain switching:
- **`chainId` phải nằm trong `chains` của config**, nếu không wagmi/viem không biết RPC nào để nối sau khi đổi.
- Nếu ví **chưa có mạng đó**, viem tự gửi `wallet_addEthereumChain` (cần khai `rpcUrls`, `blockExplorers` trong chain object) trước khi switch.
- Đừng chỉ đọc `chainId` một lần rồi ghi; user có thể đổi mạng giữa chừng. Luôn **guard ngay tại thời điểm ghi** và ưu tiên `useSimulateContract` (nó chạy trên đúng chain của Public Client).

---

## 9. Tóm tắt
- **viem** là lõi TypeScript type-safe; **wagmi** là React hooks bọc quanh viem + TanStack Query lo cache/reactivity. Trong component dùng hooks, ngoài component rơi xuống viem.
- **Public Client (provider)** để **đọc** (miễn phí, không cần ví); **Wallet Client (signer)** để **ký & ghi** (cần ví + gas). **Transport** (`http`/`custom`/`webSocket`) là đường ống RPC.
- Connect wallet qua **connectors** (`injected` theo EIP-6963, `walletConnect`); dùng `useAccount` làm nguồn state ví — đừng tự quản bằng `useState`.
- Đọc: `useReadContract`/`useReadContracts` (batch Multicall). Ghi: `useWriteContract` → chờ `useWaitForTransactionReceipt`, và **simulate trước** với `useSimulateContract`. Số on-chain là **`bigint`** — dùng `parseUnits`/`formatUnits`.
- Ký off-chain: **EIP-191** cho login đơn giản, **EIP-712** cho dữ liệu có cấu trúc + domain separator chống replay. Verify server-side bằng `verifyMessage`.
- Theo dõi tx qua **state machine** (idle → pending → hash → confirming → success/reverted) và cập nhật UI bằng `useWatchContractEvent` + invalidate query.
- **Guard chain switching** ngay tại điểm ghi với `useAccount().chainId` + `useSwitchChain`.

> **Bài tiếp theo:** hoàn thiện dApp — thiết kế UX cho pending/error, gasless (ERC-4337 account abstraction) và indexing dữ liệu với The Graph.
