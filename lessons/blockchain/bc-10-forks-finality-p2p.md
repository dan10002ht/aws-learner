# Bài 10 — Fork choice, finality, P2P & mempool

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân biệt **fork tình cờ** (accidental) do độ trễ mạng vs **fork tranh cãi** (contentious) do bất đồng quy tắc.
- Giải thích **reorg** (tổ chức lại chain) và vì sao nó là chuyện bình thường, không phải lỗi.
- Nắm **fork choice rule** — luật để cả mạng chọn ra một chain "chính tắc" duy nhất (longest chain / heaviest / LMD-GHOST).
- Phân biệt **finality probabilistic** (đếm confirmations) vs **finality deterministic** (checkpoint không thể đảo).
- Hiểu **mạng P2P + gossip protocol**, **mempool**, cách giao dịch và block **lan truyền** khắp mạng.
- Phân loại **node**: full / light (SPV) / archive — mỗi loại giữ gì và dùng để làm gì.

---

## 2. Fork — vì sao chain lại "chẻ nhánh"?

### 2.1 Analogy — hai người chép sổ cùng lúc

Nhớ lại "cuốn sổ nợ của cả làng" ở Bài 1: mỗi nhà giữ một bản sao. Vấn đề là **thông tin cần thời gian để đi**. Giả sử hai người ở hai đầu làng **cùng lúc** ghi thêm một trang mới rồi hô lớn cho cả làng chép theo. Nửa làng nghe người này trước, nửa kia nghe người kia trước — trong chốc lát tồn tại **hai phiên bản sổ hợp lệ song song**. Đó chính là **fork**.

Trong blockchain, mỗi block trỏ về block cha bằng **hash** của cha (Bài 4). Bình thường chuỗi là một đường thẳng. Nhưng khi **hai miner/validator tạo block gần như đồng thời** ở cùng chiều cao (height), cả hai đều hợp lệ và cùng trỏ về một cha → chain tách thành hai nhánh. Fork là **hệ quả tất yếu của một hệ phân tán không có đồng hồ chung**, không phải bug.

<svg viewBox="0 0 720 260" role="img" aria-labelledby="fk-t fk-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="fk-t">Fork và reorg trong chain</title>
<desc id="fk-d">Chuỗi block tách hai nhánh tại cùng chiều cao rồi một nhánh dài hơn thắng, nhánh kia thành orphan</desc>
<rect x="20" y="105" width="70" height="45" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="55" y="132" text-anchor="middle" font-size="12" fill="currentColor">#100</text>
<rect x="130" y="105" width="70" height="45" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="165" y="132" text-anchor="middle" font-size="12" fill="currentColor">#101</text>
<rect x="250" y="45" width="70" height="45" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="285" y="72" text-anchor="middle" font-size="12" fill="currentColor">#102a</text>
<rect x="250" y="165" width="70" height="45" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="285" y="192" text-anchor="middle" font-size="12" fill="currentColor">#102b</text>
<rect x="370" y="45" width="70" height="45" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="405" y="72" text-anchor="middle" font-size="12" fill="currentColor">#103a</text>
<rect x="490" y="45" width="70" height="45" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="525" y="72" text-anchor="middle" font-size="12" fill="currentColor">#104a</text>
<line x1="90" y1="127" x2="130" y2="127" stroke="currentColor" stroke-width="1.5"/>
<line x1="200" y1="120" x2="250" y2="80" stroke="currentColor" stroke-width="1.5"/>
<line x1="200" y1="135" x2="250" y2="185" stroke="currentColor" stroke-width="1.5"/>
<line x1="320" y1="67" x2="370" y2="67" stroke="currentColor" stroke-width="1.5"/>
<line x1="440" y1="67" x2="490" y2="67" stroke="currentColor" stroke-width="1.5"/>
<text x="405" y="150" text-anchor="middle" font-size="12" fill="#10b981">nhánh dài hơn → thắng (canonical)</text>
<text x="285" y="235" text-anchor="middle" font-size="12" fill="#f43f5e">#102b bị bỏ → orphan / stale block</text>
<text x="620" y="72" text-anchor="middle" font-size="11" fill="currentColor">chain tip</text>
</svg>

### 2.2 Accidental fork vs contentious fork

| Tiêu chí | **Accidental fork** | **Contentious fork** |
|----------|---------------------|----------------------|
| **Nguyên nhân** | Độ trễ lan truyền — hai block hợp lệ cùng height | Bất đồng về **luật** giữa các nhóm |
| **Quy tắc** | Cùng một bộ rule | Rule **khác nhau** (hard fork) |
| **Thời gian tồn tại** | Vài giây → tự lành khi fork choice chọn nhánh | Vĩnh viễn — tách thành **hai chain riêng** |
| **Ví dụ** | Hai miner đào trúng cùng lúc | Bitcoin ↔ Bitcoin Cash (2017), ETH ↔ ETH Classic (2016) |
| **Kết cục** | Một nhánh bị bỏ (orphan) | Hai coin, hai cộng đồng, hai lịch sử chung tới điểm tách |

Phân biệt thêm **soft fork** vs **hard fork** (đều thuộc thay đổi luật, không phải fork do trễ mạng):
- **Soft fork**: siết luật cho **chặt hơn** — block hợp lệ theo luật mới **vẫn** hợp lệ với node cũ → **tương thích ngược**, node chưa nâng cấp vẫn theo được (ví dụ SegWit).
- **Hard fork**: nới/đổi luật khiến block mới **không** hợp lệ với node cũ → node cũ **buộc phải nâng cấp**, nếu không sẽ tách ra chain riêng.

### 2.3 Reorg (chain reorganization)

Khi accidental fork xảy ra, mỗi node tạm thời coi nhánh mình nhận được trước là "tip". Đến khi một nhánh vượt lên (dài hơn / nặng hơn), node **loại bỏ các block của nhánh thua** khỏi chain chính và **áp dụng các block của nhánh thắng** — đó là **reorg**. Các giao dịch trong block bị loại **không mất**: chúng quay lại mempool và thường được đưa vào block sau (trừ khi đã bị nhánh thắng bao gồm rồi).

Reorg độ sâu 1–2 block là bình thường trên Bitcoin/PoW. Reorg **sâu** (nhiều block) là dấu hiệu nguy hiểm — đó chính là cơ chế của tấn công **51%** và **double-spend**: kẻ tấn công bí mật đào một nhánh dài hơn rồi công bố để "ghi đè" lịch sử, đảo ngược một giao dịch đã tưởng xong.

---

## 3. Fork choice rule — chọn một chain duy nhất

Vì fork luôn xảy ra, mạng cần một **luật xác định (deterministic)** để mọi node **độc lập** tính ra **cùng một** chain chính tắc mà không cần bỏ phiếu. Đó là **fork choice rule**.

| Cơ chế | Luật chọn | Dùng ở |
|--------|-----------|--------|
| **Longest chain** | Chain có **nhiều block nhất** | Bitcoin (mô tả gốc) |
| **Heaviest chain** | Chain có **tổng công (accumulated work)** lớn nhất | Bitcoin (chính xác hơn — vì độ khó thay đổi) |
| **GHOST / LMD-GHOST** | Nhánh có **nhiều phiếu (attestation) tích lũy** nhất | Ethereum PoS |

Lưu ý quan trọng: Bitcoin **không** chọn "chain dài nhất theo số block" mà là chain có **tổng proof-of-work lớn nhất**. Vì độ khó (difficulty) mỗi block khác nhau, một chain ít block hơn nhưng khó hơn vẫn có thể thắng. "Longest chain" chỉ là cách nói phổ thông; chuẩn xác là **most-work chain**.

Ethereum sau khi chuyển sang PoS dùng **LMD-GHOST** (Latest Message Driven Greediest Heaviest Observed SubTree): tại mỗi nút chẽ, chọn nhánh con có **tổng trọng số phiếu attestation** của validator lớn nhất — kết hợp với **Casper FFG** để đóng dấu finality (mục 4.2).

---

## 4. Finality — khi nào giao dịch mới "chắc chắn xong"?

**Finality** = mức độ đảm bảo một giao dịch/block **không thể bị đảo ngược**. Có hai triết lý.

### 4.1 Finality probabilistic (xác suất) — đếm confirmations

Trong PoW (Bitcoin), **không có** thời điểm nào tuyên bố "final tuyệt đối". Thay vào đó, mỗi block chồng thêm lên trên giao dịch của bạn làm xác suất bị đảo ngược **giảm theo cấp số nhân**. Mỗi block đào tiếp = **1 confirmation**.

- 0 conf: giao dịch còn trong mempool — chưa vào block, **có thể bị double-spend**.
- 1 conf: đã vào block — nhưng reorg 1 block vẫn có thể xảy ra.
- **6 conf** (~60 phút trên Bitcoin): quy ước thực tế cho "đủ an toàn" — để đảo ngược, kẻ tấn công phải vượt qua 6 block công đã tích lũy, xác suất cực nhỏ nếu chúng nắm < 50% hashrate.

> **Bản chất:** finality probabilistic không bao giờ = 100%, chỉ **tiệm cận**. Bạn tự chọn ngưỡng confirmations theo giá trị giao dịch: cà phê chấp nhận 0–1 conf, chuyển 1 triệu USD nên chờ nhiều hơn.

### 4.2 Finality deterministic (tất định) — checkpoint bất khả đảo

Trong nhiều hệ PoS/BFT, mạng **bỏ phiếu** để **đóng dấu finality** cho một block: khi đủ **⅔ validator** (theo stake) chứng thực, block thành **finalized** — đảo ngược nó **không còn là chuyện xác suất** mà đòi hỏi phá vỡ giả định an toàn của giao thức, và trên các hệ có **slashing**, kẻ phá phải **mất ⅓ tổng stake bị đốt**.

Ethereum PoS dùng **Casper FFG**: mỗi ~2 epoch (~12.8 phút) một cặp checkpoint được **justified** rồi **finalized**. Một block đã finalized chỉ có thể bị đảo nếu ≥ ⅓ stake cùng bị slash — thiệt hại kinh tế khổng lồ (economic finality). Các hệ Tendermint/Cosmos còn mạnh hơn: **finality tức thì trong 1 block** (không có reorg), đổi lại chấp nhận dừng chain nếu > ⅓ validator offline.

| | **Probabilistic (PoW)** | **Deterministic (BFT/PoS finality)** |
|---|---|---|
| Đảm bảo | Tiệm cận 100% theo confirmations | Tuyệt đối sau khi finalized |
| Reorg | Luôn có thể (xác suất nhỏ dần) | Không thể sau finalize (trừ tấn công ⅓) |
| Độ trễ "an toàn" | ~6 block (Bitcoin ~60 phút) | 1 block (Tendermint) → ~13 phút (Eth FFG) |
| Đánh đổi | Chain luôn tiến (liveness cao) | Có thể dừng nếu thiếu validator (ưu tiên safety) |

Đây là hệ quả của **CAP/định lý FLP**: không thể vừa an toàn tuyệt đối vừa luôn tiến trong mạng bất đồng bộ. PoW chọn **liveness** (chain không bao giờ dừng, an toàn chỉ tiệm cận); BFT chọn **safety** (không đảo ngược, nhưng có thể ngừng tiến).

---

## 5. Mạng P2P & gossip protocol

### 5.1 Không có server trung tâm — chỉ có các peer

Blockchain chạy trên **mạng P2P (peer-to-peer)**: mỗi node kết nối trực tiếp tới một số **peer** (Bitcoin mặc định ~8–125 kết nối), không qua máy chủ trung tâm. Không node nào biết toàn bộ mạng; mỗi node chỉ biết hàng xóm của mình. Node mới tham gia tìm peer qua **DNS seeds** (danh sách domain trả về IP các node đang chạy) rồi bắt tay trao đổi danh sách địa chỉ.

### 5.2 Gossip — lan truyền kiểu "tin đồn"

Giao dịch và block lan khắp mạng bằng **gossip protocol**: khi một node nhận thứ mới, nó **kể lại cho các hàng xóm**, những node này lại kể tiếp — như tin đồn lan trong đám đông. Sau vài "hop", gần như mọi node đều biết. Để tránh gửi trùng dữ liệu lớn, Bitcoin dùng cơ chế **announce-then-fetch**:

<svg viewBox="0 0 700 300" role="img" aria-labelledby="gs-t gs-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="gs-t">Gossip lan truyền giao dịch qua inv/getdata</title>
<desc id="gs-d">Node A báo có tx bằng inv, node B chưa có nên xin bằng getdata, A gửi tx đầy đủ, B lại báo tiếp cho hàng xóm</desc>
<circle cx="110" cy="150" r="34" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="110" y="155" text-anchor="middle" font-size="14" fill="currentColor">Node A</text>
<circle cx="360" cy="150" r="34" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="155" text-anchor="middle" font-size="14" fill="currentColor">Node B</text>
<circle cx="600" cy="70" r="28" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="600" y="75" text-anchor="middle" font-size="12" fill="currentColor">C</text>
<circle cx="600" cy="230" r="28" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="600" y="235" text-anchor="middle" font-size="12" fill="currentColor">D</text>
<line x1="144" y1="132" x2="326" y2="132" stroke="currentColor" stroke-width="1.5" marker-end="url(#ga)"/>
<text x="235" y="122" text-anchor="middle" font-size="11" fill="#3b82f6">1. inv (có tx#h)</text>
<line x1="326" y1="150" x2="144" y2="150" stroke="currentColor" stroke-width="1.5" marker-end="url(#ga)"/>
<text x="235" y="166" text-anchor="middle" font-size="11" fill="#f59e0b">2. getdata (xin tx#h)</text>
<line x1="144" y1="170" x2="326" y2="170" stroke="currentColor" stroke-width="1.5" marker-end="url(#ga)"/>
<text x="235" y="188" text-anchor="middle" font-size="11" fill="#10b981">3. tx (nội dung đầy đủ)</text>
<line x1="390" y1="128" x2="574" y2="82" stroke="currentColor" stroke-width="1.5" marker-end="url(#ga)"/>
<line x1="390" y1="172" x2="574" y2="218" stroke="currentColor" stroke-width="1.5" marker-end="url(#ga)"/>
<text x="500" y="95" text-anchor="middle" font-size="11" fill="currentColor">4. inv tiếp...</text>
<defs><marker id="ga" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

1. **`inv` (inventory)**: A báo cho B "tôi có giao dịch hash `h`" — chỉ gửi hash, rất nhẹ.
2. **`getdata`**: nếu B **chưa có**, B mới xin nội dung đầy đủ. (Đã có thì thôi → tiết kiệm băng thông.)
3. **`tx` / `block`**: A gửi dữ liệu thật.
4. B lại `inv` cho hàng xóm của mình — lặp lại tới khi cả mạng phủ.

Với block, các node hiện đại dùng **compact block relay** (BIP 152): thay vì gửi cả block, chỉ gửi header + danh sách ID giao dịch ngắn; node nhận **dựng lại** block từ các tx đã có sẵn trong mempool → giảm mạnh băng thông và **rút ngắn thời gian lan truyền**, nhờ đó **giảm tần suất accidental fork**.

### 5.3 Mempool — phòng chờ của giao dịch

**Mempool** (memory pool) là **hàng đợi giao dịch chưa xác nhận** mà mỗi node giữ trong RAM. Vòng đời:

1. Giao dịch được ký và broadcast → vào mempool của các node (mỗi node một bản mempool riêng, **không đồng nhất tuyệt đối**).
2. Node **kiểm tra hợp lệ** (chữ ký đúng, không double-spend, đủ phí) trước khi chấp nhận và gossip tiếp.
3. Miner/validator **chọn giao dịch từ mempool** — thường **ưu tiên phí cao** (fee/byte hoặc gas price) — để xếp vào block. Đây là **thị trường phí**: khi mempool tắc nghẽn, muốn nhanh phải trả phí cao hơn.
4. Khi giao dịch vào block → **rời mempool**. Giao dịch chờ quá lâu, phí quá thấp có thể bị **evict** (đẩy ra) khi mempool đầy.

Mempool là nơi diễn ra nhiều hiện tượng quan trọng: **RBF (Replace-By-Fee)** — thay giao dịch cũ bằng bản phí cao hơn; **fee estimation**; và **MEV** (Maximal Extractable Value) — validator sắp xếp/chèn/bỏ giao dịch để trục lợi (front-running, sandwich attack). Vì mempool **công khai**, ai cũng thấy giao dịch đang chờ — đó vừa là minh bạch vừa là bề mặt tấn công.

---

## 6. Node types — full / light / archive

Không phải mọi node đều giữ như nhau. Tùy tài nguyên và nhu cầu tin cậy, ta chọn loại node phù hợp.

<svg viewBox="0 0 700 250" role="img" aria-labelledby="nd-t nd-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="nd-t">So sánh full, light và archive node</title>
<desc id="nd-d">Light node chỉ giữ header, full node giữ toàn bộ state hiện tại, archive node giữ toàn bộ lịch sử state</desc>
<rect x="30" y="50" width="180" height="150" rx="10" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="78" text-anchor="middle" font-size="14" fill="currentColor">Light (SPV)</text>
<text x="120" y="108" text-anchor="middle" font-size="11" fill="currentColor">chỉ block header</text>
<text x="120" y="128" text-anchor="middle" font-size="11" fill="currentColor">+ Merkle proof</text>
<text x="120" y="155" text-anchor="middle" font-size="11" fill="currentColor">~ vài trăm MB</text>
<text x="120" y="180" text-anchor="middle" font-size="11" fill="currentColor">tin cậy nhờ full node</text>
<rect x="255" y="50" width="180" height="150" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="345" y="78" text-anchor="middle" font-size="14" fill="currentColor">Full node</text>
<text x="345" y="108" text-anchor="middle" font-size="11" fill="currentColor">verify mọi block/tx</text>
<text x="345" y="128" text-anchor="middle" font-size="11" fill="currentColor">giữ state hiện tại</text>
<text x="345" y="155" text-anchor="middle" font-size="11" fill="currentColor">có thể prune lịch sử</text>
<text x="345" y="180" text-anchor="middle" font-size="11" fill="currentColor">tự chủ, không cần tin ai</text>
<rect x="480" y="50" width="190" height="150" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="575" y="78" text-anchor="middle" font-size="14" fill="currentColor">Archive node</text>
<text x="575" y="108" text-anchor="middle" font-size="11" fill="currentColor">full + TOÀN BỘ</text>
<text x="575" y="128" text-anchor="middle" font-size="11" fill="currentColor">state lịch sử</text>
<text x="575" y="155" text-anchor="middle" font-size="11" fill="currentColor">nhiều TB dung lượng</text>
<text x="575" y="180" text-anchor="middle" font-size="11" fill="currentColor">cho explorer / analytics</text>
</svg>

| Loại node | Giữ gì | Tự verify? | Dung lượng (tham khảo) | Dùng khi |
|-----------|--------|------------|------------------------|----------|
| **Full node** | Toàn bộ block + **state hiện tại**; verify độc lập mọi luật | Có — không cần tin ai | Bitcoin ~vài trăm GB; Eth ~1 TB+ | Bạn muốn **tự chủ**, chạy validator/miner, làm backbone mạng |
| **Light / SPV** | Chỉ **block header** + xin **Merkle proof** khi cần | Chỉ kiểm được "tx có trong block" | Vài trăm MB | Ví di động, thiết bị yếu; đánh đổi: **tin** full node cấp proof |
| **Archive** | Full node **cộng toàn bộ state ở mọi block quá khứ** | Có | Nhiều TB (Eth: hàng chục TB) | Block explorer, phân tích on-chain, truy vấn "số dư tại block X" |

Điểm mấu chốt:
- **Full node** verify **mọi** giao dịch theo luật đồng thuận → đây là thứ khiến blockchain **trustless**. Càng nhiều full node độc lập, mạng càng khó bị ép luật gian.
- **SPV** (Simplified Payment Verification, mô tả trong whitepaper Bitcoin) chỉ tải header (~80 byte/block) và dùng **Merkle proof** (Bài 2) để chứng minh một giao dịch nằm trong một block — nhưng **không** tự kiểm được block đó có hợp lệ toàn cục hay không, nên phải **giả định đa số miner trung thực**.
- **Archive** không "an toàn hơn" full node ở khâu đồng thuận — nó chỉ **giữ thêm lịch sử state** để tra cứu, tốn dung lượng khổng lồ.

---

## 7. Tình huống thực tế — nhận thanh toán an toàn

Bạn bán hàng, khách trả bằng crypto. Ghép mọi thứ vừa học:

1. Ví khách ký giao dịch, broadcast → vào **mempool**, lan qua **gossip** khắp mạng (0 conf). **Chưa** giao hàng — giai đoạn này còn double-spend/RBF được.
2. Một block bao gồm giao dịch → **1 conf**. Với đồ giá trị nhỏ có thể chấp nhận.
3. Nếu là PoW (Bitcoin): chờ **~6 conf** để xác suất reorg gần bằng 0 mới giao hàng giá trị lớn.
4. Nếu là chain có **finality tất định** (Eth PoS đã finalized, hay Cosmos 1-block finality): sau khi finalized, **an tâm tuyệt đối** — không cần đếm 6 conf, vì đảo ngược đòi hỏi phá giả định an toàn + slashing.
5. Bạn tự chạy **full node** để **không phải tin** dịch vụ bên thứ ba khi xác nhận đã nhận tiền — không ai lừa được bạn về việc giao dịch đã nằm trong chain chính tắc.

Đây chính là lý do "chờ mấy xác nhận" khác nhau giữa các sàn: nó phản ánh **mô hình finality** và **giá trị giao dịch**, không phải quy định tùy tiện.

---

## 8. Tóm tắt
- **Fork** là hệ quả tất yếu của mạng phân tán: **accidental** (do trễ mạng, tự lành) khác **contentious** (bất đồng luật → tách chain vĩnh viễn); phân biệt thêm **soft** (tương thích ngược) vs **hard fork**.
- **Reorg** loại nhánh thua và áp nhánh thắng; tx bị loại quay lại mempool. Reorg sâu = dấu hiệu tấn công 51%.
- **Fork choice rule** cho mọi node độc lập chọn cùng một chain: Bitcoin dùng **most-work chain** (không chỉ "dài nhất"), Ethereum PoS dùng **LMD-GHOST**.
- **Finality probabilistic** (PoW): đếm confirmations, tiệm cận 100% (~6 conf Bitcoin). **Finality deterministic** (BFT/PoS): checkpoint finalized không thể đảo, đổi lấy rủi ro chain dừng. Đây là đánh đổi **liveness vs safety** (FLP).
- **Mạng P2P + gossip** (`inv → getdata → tx/block`, compact block) lan truyền dữ liệu không cần trung tâm; **mempool** là phòng chờ giao dịch chưa xác nhận, nơi diễn ra thị trường phí, RBF và MEV.
- **Node types**: **full** (tự verify, trustless), **light/SPV** (chỉ header + Merkle proof, phải tin full node), **archive** (giữ toàn bộ state lịch sử để tra cứu).

> **Bài tiếp theo:** rời khỏi tầng mạng để bước vào lập trình on-chain — **smart contract & máy ảo EVM**, nơi giao dịch không chỉ chuyển tiền mà còn chạy code.
