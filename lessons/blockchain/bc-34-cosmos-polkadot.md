# Bài 37 — Cosmos (IBC) & Polkadot (parachain)

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **app-chain thesis** — tại sao một số dự án chọn **chain riêng** thay vì viết smart contract trên Ethereum.
- Nắm kiến trúc **Cosmos**: **Tendermint/CometBFT**, **Cosmos SDK**, và **IBC** (inter-blockchain communication) hoạt động thế nào.
- Nắm kiến trúc **Polkadot**: **relay chain + parachain**, **shared security**, và **XCM** (cross-consensus messaging).
- Phân biệt hai triết lý interoperability: **sovereignty** (Cosmos) vs **shared security** (Polkadot).
- Phân biệt **multi-chain vs cross-chain**, hiểu bản chất **wrapped asset** và vì sao **bridge** là điểm yếu bảo mật lớn nhất của cross-chain.

---

## 2. Lý thuyết

### 2.1 App-chain thesis — vì sao lại cần chain riêng?

Trên Ethereum, mọi dApp là **khách trọ chung một máy tính thế giới**: cùng chia sẻ block space, cùng một cơ chế phí gas, cùng bị "hàng xóm" (một NFT mint sốt) làm nghẽn và đội phí. Bạn **không kiểm soát** được luật nền: gas token là ETH, thời gian block cố định, không tùy biến được tầng đồng thuận.

**App-chain thesis** nói: nếu ứng dụng của bạn đủ lớn (một DEX, một game, một sàn phái sinh), hãy **tự làm một blockchain riêng** cho đúng nhu cầu. Đánh đổi:

| Tiêu chí | dApp trên L1 chung (Ethereum) | App-chain (chain riêng) |
|----------|-------------------------------|--------------------------|
| **Block space** | Chia sẻ, tranh nhau, phí biến động | Trọn vẹn cho 1 app, phí ổn định |
| **Tùy biến** | Bị khóa trong EVM & luật nền | Tùy biến logic tầng nền (state machine, phí, gas token riêng) |
| **Bảo mật** | Thừa hưởng ngay từ L1 | **Phải tự lo** validator set (Cosmos) hoặc thuê (Polkadot) |
| **Khởi động** | Deploy contract là xong | Phải bootstrap cả một mạng node/validator |
| **Interoperability** | Composability ngay trong 1 VM | Cần giao thức liên chuỗi (IBC/XCM) |

Điểm mấu chốt của app-chain là **sovereignty (chủ quyền)**: bạn sở hữu toàn bộ stack, nhưng cũng **gánh** toàn bộ trách nhiệm bảo mật. Cosmos và Polkadot là hai câu trả lời **trái ngược** cho bài toán "làm sao có nhiều app-chain mà vẫn nói chuyện được với nhau và vẫn an toàn".

### 2.2 Hai triết lý kiến trúc

<svg viewBox="0 0 720 320" role="img" aria-labelledby="ar-t ar-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="ar-t">Cosmos hub-and-zone vs Polkadot relay-parachain</title>
<desc id="ar-d">Bên trái các zone Cosmos chủ quyền tự bảo mật nối qua IBC, bên phải relay chain Polkadot bảo mật chung cho các parachain</desc>
<text x="180" y="26" text-anchor="middle" font-size="14" fill="currentColor">Cosmos — mỗi chain tự bảo mật</text>
<circle cx="180" cy="160" r="34" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="180" y="158" text-anchor="middle" font-size="12" fill="currentColor">Hub</text>
<text x="180" y="174" text-anchor="middle" font-size="10" fill="currentColor">(cầu nối)</text>
<circle cx="80" cy="80" r="26" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="84" text-anchor="middle" font-size="10" fill="currentColor">Zone A</text>
<circle cx="300" cy="70" r="26" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="300" y="74" text-anchor="middle" font-size="10" fill="currentColor">Zone B</text>
<circle cx="70" cy="250" r="26" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="70" y="254" text-anchor="middle" font-size="10" fill="currentColor">Zone C</text>
<circle cx="300" cy="255" r="26" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="300" y="259" text-anchor="middle" font-size="10" fill="currentColor">Zone D</text>
<line x1="103" y1="97" x2="152" y2="140" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/>
<line x1="277" y1="90" x2="210" y2="140" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/>
<line x1="95" y1="232" x2="152" y2="182" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/>
<line x1="278" y1="238" x2="210" y2="182" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/>
<text x="180" y="306" text-anchor="middle" font-size="10" fill="currentColor">IBC (đường đứt) = kênh tin nhắn giữa các validator set độc lập</text>
<line x1="380" y1="30" x2="380" y2="300" stroke="currentColor" stroke-width="1" stroke-dasharray="3 4"/>
<text x="550" y="26" text-anchor="middle" font-size="14" fill="currentColor">Polkadot — bảo mật dùng chung</text>
<rect x="470" y="130" width="160" height="56" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="550" y="154" text-anchor="middle" font-size="12" fill="currentColor">Relay Chain</text>
<text x="550" y="172" text-anchor="middle" font-size="10" fill="currentColor">1 validator set chung</text>
<rect x="440" y="60" width="70" height="40" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="475" y="84" text-anchor="middle" font-size="10" fill="currentColor">Para 1</text>
<rect x="590" y="60" width="70" height="40" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="625" y="84" text-anchor="middle" font-size="10" fill="currentColor">Para 2</text>
<rect x="440" y="215" width="70" height="40" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="475" y="239" text-anchor="middle" font-size="10" fill="currentColor">Para 3</text>
<rect x="590" y="215" width="70" height="40" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="625" y="239" text-anchor="middle" font-size="10" fill="currentColor">Para 4</text>
<line x1="490" y1="100" x2="520" y2="130" stroke="currentColor" stroke-width="1.5"/>
<line x1="610" y1="100" x2="580" y2="130" stroke="currentColor" stroke-width="1.5"/>
<line x1="490" y1="215" x2="520" y2="186" stroke="currentColor" stroke-width="1.5"/>
<line x1="610" y1="215" x2="580" y2="186" stroke="currentColor" stroke-width="1.5"/>
<text x="550" y="306" text-anchor="middle" font-size="10" fill="currentColor">Đường liền = relay chain finalize block cho mọi parachain</text>
</svg>

- **Cosmos**: mỗi chain là một **hòn đảo có chủ quyền** — tự chọn validator set, tự lo bảo mật, tự nâng cấp. Các đảo nối nhau bằng **IBC** như đường hàng hải giữa các quốc gia độc lập.
- **Polkadot**: mọi parachain **thuê chung một đội bảo vệ** (relay chain validator). Parachain lo logic ứng dụng, relay chain lo **finality & bảo mật** cho tất cả.

### 2.3 Cosmos — "Internet of Blockchains"

Cosmos là một **bộ công cụ**, không phải một chain duy nhất. Ba tầng:

**1) CometBFT (trước là Tendermint Core)** — tầng đồng thuận + networking. Đây là một engine **BFT (Byzantine Fault Tolerant)** cho **instant finality**: mỗi block được validator vote 2 vòng (`pre-vote` → `pre-commit`), khi đạt **+2/3 quyền biểu quyết** thì block **final ngay lập tức** — không có xác suất reorg như Nakamoto/PoW (xem Bài 7). Đổi lại, mạng chịu được tối đa **<1/3 validator gian lận**; nếu vượt ngưỡng, chain **dừng** (ưu tiên safety hơn liveness).

**2) Cosmos SDK** — framework viết bằng Go để dựng **application logic** (state machine) dạng **module**: `bank` (chuyển token), `staking`, `gov` (quản trị on-chain), `ibc`... Bạn ghép module như lego và viết module riêng cho app của mình. CometBFT nói chuyện với app qua giao diện **ABCI** (`DeliverTx`, `CheckTx`, `Commit`) — tách bạch **đồng thuận** và **ứng dụng**.

**3) IBC** — giao thức chuẩn để hai chain Cosmos (thực ra bất kỳ chain nào có finality nhanh + light client) chuyển token và message cho nhau.

### 2.4 IBC hoạt động thế nào — light client, không phải "bên thứ ba tin cậy"

Điểm thiên tài của IBC: chain B **không tin một validator cầu nối** nào cả. Thay vào đó, chain B chạy một **light client** của chain A **ngay bên trong state của mình** — nó lưu và cập nhật các **block header** của A, và tự kiểm chứng bằng chữ ký validator A (nhờ finality tức thời của CometBFT, header là bằng chứng chắc chắn). Một **relayer** (off-chain, không cần tin cậy) chỉ làm nhiệm vụ **bưng packet + proof** qua lại; relayer gian lận cũng không giả được proof.

<svg viewBox="0 0 700 300" role="img" aria-labelledby="ibc-t ibc-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="ibc-t">Luồng IBC token transfer</title>
<desc id="ibc-d">Chain A khoá token và phát packet, relayer chuyển kèm proof, light client trên chain B xác minh rồi mint voucher</desc>
<rect x="30" y="30" width="150" height="240" rx="10" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="54" text-anchor="middle" font-size="13" fill="currentColor">Chain A</text>
<rect x="520" y="30" width="150" height="240" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="595" y="54" text-anchor="middle" font-size="13" fill="currentColor">Chain B</text>
<rect x="290" y="120" width="120" height="60" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="146" text-anchor="middle" font-size="12" fill="currentColor">Relayer</text>
<text x="350" y="164" text-anchor="middle" font-size="10" fill="currentColor">(off-chain)</text>
<text x="105" y="90" text-anchor="middle" font-size="11" fill="currentColor">1. Khoá (escrow)</text>
<text x="105" y="106" text-anchor="middle" font-size="11" fill="currentColor">100 ATOM</text>
<text x="105" y="128" text-anchor="middle" font-size="11" fill="currentColor">2. Ghi commitment</text>
<text x="105" y="144" text-anchor="middle" font-size="11" fill="currentColor">của packet</text>
<line x1="180" y1="130" x2="288" y2="140" stroke="currentColor" stroke-width="1.5" marker-end="url(#ib-ah)"/>
<text x="230" y="122" text-anchor="middle" font-size="10" fill="currentColor">packet + proof</text>
<line x1="410" y1="150" x2="518" y2="160" stroke="currentColor" stroke-width="1.5" marker-end="url(#ib-ah)"/>
<text x="595" y="96" text-anchor="middle" font-size="11" fill="currentColor">3. Light client of A</text>
<text x="595" y="112" text-anchor="middle" font-size="11" fill="currentColor">verify proof</text>
<text x="595" y="200" text-anchor="middle" font-size="11" fill="currentColor">4. Mint voucher</text>
<text x="595" y="216" text-anchor="middle" font-size="11" fill="currentColor">ibc/ATOM (100)</text>
<text x="350" y="250" text-anchor="middle" font-size="10" fill="currentColor">Relayer chỉ chuyển dữ liệu — không giữ tiền, không được tin cậy</text>
<defs><marker id="ib-ah" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Cơ chế **ICS-20 (fungible token transfer)**: token gốc bị **khoá (escrow)** ở chain A, chain B **mint một voucher** đại diện. Token trên B mang **denom truy vết đường đi**, ví dụ `ibc/27394FB0...` = hash của path `transfer/channel-0/uatom`. Muốn rút, đốt voucher ở B → mở khoá ở A. Đây là **lock-and-mint** nhưng **không cần bridge tin cậy** vì tính đúng đắn được light client tự kiểm chứng.

> IBC là **cross-chain thật sự an toàn**: bảo mật của kênh = bảo mật của **hai chain hai đầu**, không thêm giả định tin cậy nào. Đây là khác biệt cốt lõi với đa số bridge EVM (mục 2.7).

### 2.5 Polkadot — shared security & parachain

Polkadot đảo ngược triết lý: thay vì mỗi chain tự lo bảo mật, **relay chain** cung cấp **shared security (pooled security)** cho tất cả.

- **Relay chain**: chain trung tâm, **không chạy smart contract**, chỉ làm hai việc — **đồng thuận & finality** (NPoS: Nominated Proof-of-Stake, cùng GRANDPA finality gadget) và **điều phối** các parachain.
- **Parachain**: các app-chain song song. Mỗi parachain sản xuất block **candidate**, gửi lên **validator relay chain**; validator được **gán ngẫu nhiên** để kiểm tra tính hợp lệ (thông qua **PVF — Parachain Validation Function**, chính là runtime WASM của parachain) rồi **finalize chung** trong block relay chain.
- **Collator**: node của parachain gom giao dịch và đề xuất block candidate cho validator (không giữ vai trò bảo mật — chỉ "phục vụ").

Vì **một validator set duy nhất** bảo vệ mọi parachain, kẻ tấn công muốn viết lại lịch sử một parachain phải **tấn công cả relay chain** — chi phí cực lớn. Đây là điểm mạnh: một parachain non trẻ vẫn có **bảo mật ngang** cả mạng ngay từ block đầu. Đánh đổi: số slot parachain **hữu hạn**, trước đây phải **thắng đấu giá slot (parachain auction)** hoặc thuê **coretime** (mô hình Agile Coretime mới).

### 2.6 XCM — ngôn ngữ nhắn tin giữa các chain Polkadot

**XCM (Cross-Consensus Messaging)** không phải "giao thức truyền tin" mà là một **định dạng/ngôn ngữ** mô tả **ý định** ("rút asset này, chuyển sang chain kia, thực thi lệnh nọ"). Việc **vận chuyển** thực tế do **XCMP** (giữa parachain) hoặc **HRMP/VMP** (qua relay chain) đảm nhiệm. Vì tất cả parachain chia sẻ cùng validator + finality, message giữa chúng **không cần bridge tin cậy** — tương tự IBC nhưng dựa trên **shared security** thay vì **light client + finality độc lập**.

### 2.7 So sánh Cosmos vs Polkadot

| Tiêu chí | Cosmos | Polkadot |
|----------|--------|----------|
| **Triết lý** | Sovereignty — mỗi chain tự chủ | Shared security — bảo mật gộp |
| **Bảo mật chain mới** | **Tự lo** validator set (tốn công bootstrap) | **Thừa hưởng ngay** từ relay chain |
| **Đồng thuận** | CometBFT (BFT, instant finality) | NPoS + BABE/GRANDPA (finality gadget) |
| **Framework app** | Cosmos SDK (Go) / hoặc bất kỳ | Substrate (Rust, runtime WASM) |
| **Liên chuỗi** | IBC (light client + proof) | XCM qua XCMP/HRMP |
| **Nâng cấp** | Governance từng chain, hard fork điều phối | **Forkless upgrade** (thay runtime WASM on-chain) |
| **Ràng buộc mở rộng** | Không giới hạn số chain | Số **slot/coretime** hữu hạn |
| **Đánh đổi chính** | Tự do tối đa, nhưng tự gánh bảo mật | An toàn sẵn, nhưng bớt chủ quyền & phải giành slot |

Nói ngắn: **Cosmos cho bạn tự do; Polkadot cho bạn an toàn.** Cosmos hợp với dự án đủ lớn để tự nuôi validator (Osmosis, dYdX v4, Celestia, Injective). Polkadot hợp với dự án muốn bảo mật cao ngay mà chưa muốn tự bootstrap.

### 2.8 Multi-chain vs cross-chain, và cạm bẫy wrapped asset

Ba khái niệm hay bị nhầm:

- **Multi-chain**: cùng một ứng dụng/token **tồn tại độc lập** trên nhiều chain, **không** nhất thiết chuyển giá trị qua lại (ví dụ USDC được Circle phát hành **native** riêng trên mỗi chain).
- **Cross-chain**: **chuyển giá trị/thông điệp** từ chain này sang chain khác qua một giao thức (IBC, XCM, bridge).
- **Wrapped asset**: token đại diện cho tài sản ở chain khác. Cơ chế phổ biến **lock-and-mint**: khoá BTC thật, mint **WBTC** trên Ethereum. Giá trị WBTC phụ thuộc **hoàn toàn** vào bên giữ khoá và tính đúng đắn của bridge.

<svg viewBox="0 0 700 250" role="img" aria-labelledby="wr-t wr-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="wr-t">Wrapped asset lock-and-mint và rủi ro bridge</title>
<desc id="wr-d">Tài sản gốc bị khoá ở chain nguồn, token đại diện được mint ở chain đích, bridge ở giữa là điểm tin cậy dễ bị tấn công</desc>
<rect x="30" y="70" width="150" height="110" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="98" text-anchor="middle" font-size="12" fill="currentColor">Chain nguồn</text>
<text x="105" y="130" text-anchor="middle" font-size="11" fill="currentColor">Khoá 1 BTC</text>
<text x="105" y="150" text-anchor="middle" font-size="11" fill="currentColor">(escrow)</text>
<rect x="275" y="80" width="150" height="90" rx="10" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="120" text-anchor="middle" font-size="12" fill="currentColor">BRIDGE</text>
<text x="350" y="140" text-anchor="middle" font-size="10" fill="currentColor">điểm tin cậy</text>
<rect x="520" y="70" width="150" height="110" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="595" y="98" text-anchor="middle" font-size="12" fill="currentColor">Chain đích</text>
<text x="595" y="130" text-anchor="middle" font-size="11" fill="currentColor">Mint 1 WBTC</text>
<text x="595" y="150" text-anchor="middle" font-size="11" fill="currentColor">(voucher)</text>
<line x1="180" y1="125" x2="273" y2="125" stroke="currentColor" stroke-width="1.5" marker-end="url(#wr-ah)"/>
<line x1="425" y1="125" x2="518" y2="125" stroke="currentColor" stroke-width="1.5" marker-end="url(#wr-ah)"/>
<text x="350" y="205" text-anchor="middle" font-size="11" fill="#f43f5e">Chiếm được bridge = mint vô hạn WBTC không có BTC bảo chứng</text>
<text x="350" y="228" text-anchor="middle" font-size="10" fill="currentColor">Ronin ~625M$, Wormhole ~325M$, Nomad ~190M$ đều mất ở tầng bridge</text>
<defs><marker id="wr-ah" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Tại sao bridge là điểm yếu số một của cross-chain?** Đa số bridge EVM dùng **multisig/validator ngoài** để canh khoá — bảo mật của cây cầu **chỉ bằng** nhóm ký đó, **không** bằng hai chain hai đầu. Chiếm được multisig là **mint token không bảo chứng** (Ronin: 5/9 khóa bị lộ). IBC và XCM tránh được lớp tin cậy thừa này: IBC dùng **light client + cryptographic proof**, XCM dùng **shared security** — bảo mật kênh **quy về** bảo mật chain, không phát sinh giả định mới.

> Quy tắc thực chiến: khi cầm một **wrapped asset**, luôn hỏi "ai đang giữ tài sản gốc, và giả định tin cậy của cầu là gì?". `ibc/...` voucher và `WBTC` custody khác nhau **một trời một vực** về rủi ro, dù cùng gọi là "wrapped".

---

## 3. Ví dụ thực tế — chọn kiến trúc

- **dYdX v4**: rời khỏi rollup Ethereum, dựng **app-chain Cosmos SDK riêng** để có **orderbook off-chain hiệu năng cao** và toàn quyền tùy biến — kinh điển cho app-chain thesis.
- **Celestia**: chain Cosmos SDK chuyên **data availability**, kết nối hệ sinh thái qua IBC.
- **Moonbeam**: parachain Polkadot **tương thích EVM**, thừa hưởng bảo mật relay chain mà vẫn chạy được contract Solidity.
- **Osmosis**: DEX-appchain Cosmos, dùng IBC làm nguồn thanh khoản đa chuỗi **không cần bridge tin cậy**.

---

## 4. Tóm tắt
- **App-chain thesis**: app đủ lớn thì tự làm chain riêng để có trọn block space + toàn quyền tùy biến, đổi lại phải tự lo (hoặc thuê) bảo mật.
- **Cosmos** = **sovereignty**: CometBFT (BFT instant finality) + Cosmos SDK (module Go) + **IBC** liên chuỗi bằng **light client + proof** — không thêm giả định tin cậy.
- **Polkadot** = **shared security**: relay chain finalize & bảo vệ mọi **parachain**; liên chuỗi bằng **XCM** qua XCMP/HRMP; nâng cấp **forkless** bằng runtime WASM.
- **Cosmos cho tự do, Polkadot cho an toàn** — chọn theo việc bạn tự nuôi validator được hay không.
- **Multi-chain ≠ cross-chain**; **wrapped asset** an toàn tới đâu là do **mô hình tin cậy của bridge**. IBC/XCM quy bảo mật về chính các chain; multisig bridge thêm một điểm chết — nơi hầu hết các vụ hack lớn nhất lịch sử xảy ra.

> **Bài tiếp theo:** rollup & modular blockchain — cách Ethereum mở rộng theo hướng "chia tầng" (execution / settlement / data availability) và vì sao nó cạnh tranh trực tiếp với app-chain thesis.
