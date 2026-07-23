# Bài 13 — Lightning Network (Layer 2 Bitcoin)

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **tại sao Bitcoin cần Layer 2** và Lightning Network giải bài toán scalability bằng cách nào.
- Mô tả cơ chế **payment channel 2 bên**: mở channel bằng **funding transaction (2-of-2 multisig)**, cập nhật số dư off-chain, đóng channel on-chain.
- Hiểu **commitment transaction** và cơ chế **revocation** chống gian lận — trái tim của Lightning.
- Nắm **HTLC (Hashed Timelock Contract)** và cách nó cho phép **định tuyến đa hop** an toàn qua nhiều node không tin nhau.
- Phân tích **trade-off**: liquidity, inbound capacity, online requirement, watchtower — và biết khi nào Lightning phù hợp.

---

## 2. Lý thuyết

### 2.1 Analogy — mở "tab" ở quán bar thay vì quẹt thẻ từng ly

Bạn vào quán bar uống 8 ly cả tối. Có 2 cách trả:
- **Quẹt thẻ mỗi ly** → 8 lần giao dịch qua ngân hàng, mỗi lần tốn phí + chờ xác nhận. Đây là **on-chain**: mỗi lần trả tiền là một transaction lên blockchain Bitcoin — chậm (~10 phút/block), phí cao khi mạng nghẽn.
- **Mở tab (running tab)**: bartender ghi nợ trên một tờ giấy, bạn uống bao nhiêu ly cũng chỉ cập nhật con số trên tờ giấy — **không đụng ngân hàng**. Cuối tối bạn **chốt sổ một lần**, trả tổng qua ngân hàng.

Lightning Network chính là "cái tab" đó: hai bên **khóa tiền một lần** (mở channel — 1 transaction on-chain), rồi trao đổi **hàng nghìn lần** ngoài chuỗi (off-chain, tức thì, gần như miễn phí), cuối cùng chỉ **kết toán số dư cuối** lên blockchain (đóng channel — 1 transaction on-chain nữa). Bitcoin base layer chỉ thấy 2 giao dịch, dù bên trong đã có hàng nghìn lần chuyển tiền.

Đây là **mô hình L2 (Layer 2) đầu tiên** thành công: một giao thức chạy *bên trên* blockchain, dùng blockchain làm **tòa án cuối cùng (settlement layer)** chứ không dùng cho từng giao dịch.

### 2.2 Payment channel 2 bên — mở, cập nhật, đóng

Một payment channel giữa Alice và Bob đi qua 3 pha:

<svg viewBox="0 0 720 250" role="img" aria-labelledby="ch-t ch-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="ch-t">Vòng đời một payment channel</title>
<desc id="ch-d">Ba pha: mở channel bằng funding transaction on-chain, cập nhật số dư nhiều lần off-chain, đóng channel on-chain</desc>
<rect x="20" y="80" width="150" height="90" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="110" text-anchor="middle" font-size="13" fill="currentColor">1. OPEN</text>
<text x="95" y="132" text-anchor="middle" font-size="11" fill="currentColor">Funding tx</text>
<text x="95" y="150" text-anchor="middle" font-size="11" fill="currentColor">2-of-2 multisig</text>
<rect x="285" y="80" width="150" height="90" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="105" text-anchor="middle" font-size="13" fill="currentColor">2. UPDATE</text>
<text x="360" y="127" text-anchor="middle" font-size="11" fill="currentColor">off-chain, n lần</text>
<text x="360" y="145" text-anchor="middle" font-size="11" fill="currentColor">commitment tx</text>
<text x="360" y="160" text-anchor="middle" font-size="10" fill="currentColor">(không broadcast)</text>
<rect x="550" y="80" width="150" height="90" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="625" y="110" text-anchor="middle" font-size="13" fill="currentColor">3. CLOSE</text>
<text x="625" y="132" text-anchor="middle" font-size="11" fill="currentColor">Settlement tx</text>
<text x="625" y="150" text-anchor="middle" font-size="11" fill="currentColor">số dư cuối</text>
<line x1="170" y1="125" x2="283" y2="125" stroke="currentColor" stroke-width="1.5" marker-end="url(#a1)"/>
<line x1="435" y1="125" x2="548" y2="125" stroke="currentColor" stroke-width="1.5" marker-end="url(#a1)"/>
<text x="95" y="200" text-anchor="middle" font-size="11" fill="currentColor">ON-CHAIN</text>
<text x="360" y="200" text-anchor="middle" font-size="11" fill="currentColor">OFF-CHAIN (tức thì, ~0 phí)</text>
<text x="625" y="200" text-anchor="middle" font-size="11" fill="currentColor">ON-CHAIN</text>
<text x="360" y="230" text-anchor="middle" font-size="11" fill="currentColor">Blockchain chỉ thấy 2 giao dịch (mở + đóng) cho hàng nghìn lần chuyển</text>
<defs><marker id="a1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Pha 1 — Mở (funding transaction):** Alice nạp 0.05 BTC, Bob nạp 0.05 BTC vào một địa chỉ **2-of-2 multisig** (cần chữ ký của *cả hai* mới tiêu được). Đây là transaction on-chain duy nhất để mở. Từ giờ 0.1 BTC bị "khóa" trong channel, số dư khởi đầu là Alice 0.05 / Bob 0.05.

**Pha 2 — Cập nhật (off-chain):** Alice muốn trả Bob 0.01 BTC. Hai bên **không** gửi gì lên blockchain. Thay vào đó họ cùng ký một **commitment transaction** mới thể hiện số dư mới: Alice 0.04 / Bob 0.06. Mỗi lần chuyển tiền là một commitment transaction mới, ký ngay lập tức, giữ trong máy hai bên. Có thể lặp lại hàng nghìn lần trong vài giây.

**Pha 3 — Đóng (settlement):** Bất cứ lúc nào, một bên broadcast commitment transaction *mới nhất* lên blockchain. Vì nó chi tiêu output 2-of-2 và đã có đủ 2 chữ ký, blockchain chấp nhận và trả tiền theo đúng số dư cuối (Alice 0.04, Bob 0.06). Channel đóng, tiền về ví mỗi người on-chain.

### 2.3 Commitment transaction & bài toán "trạng thái cũ"

Vấn đề cốt tử: sau nhiều lần cập nhật, mỗi bên đang giữ **nhiều commitment transaction cũ**, mỗi cái đều có đủ 2 chữ ký và **về mặt kỹ thuật vẫn broadcast được**. Điều gì ngăn Bob broadcast một commitment cũ khi anh ta **giàu hơn** (ví dụ trạng thái Alice 0.02 / Bob 0.08 từ lúc trước)? Đây là **broadcasting old state** — hình thức gian lận nguy hiểm nhất của payment channel.

Lightning giải bằng cơ chế **revocation (thu hồi)** bất đối xứng, dựa trên script `OP_CHECKSEQUENCEVERIFY` (relative timelock):

- Mỗi bên giữ một commitment transaction **hơi khác nhau**. Trên commitment mà Alice giữ, phần tiền **của chính Alice** không lấy được ngay — nó bị khóa bởi một **timelock** (ví dụ ~144 block ≈ 1 ngày) HOẶC có thể bị Bob lấy ngay nếu Bob biết **revocation key**.
- Khi hai bên chuyển sang trạng thái mới, họ **trao đổi revocation secret của trạng thái cũ** cho nhau. Kể từ đó, nếu Alice gian lận broadcast commitment cũ, phần tiền của cô bị timelock giữ lại, còn Bob — nhờ đã nắm revocation key — có thể quét **toàn bộ** tiền trong channel trong khoảng thời gian timelock đó.

Hệ quả: **broadcast trạng thái cũ = mất trắng**. Đây là **penalty mechanism** — bạn không cần tin đối phương, chỉ cần biết rằng gian lận sẽ bị trừng phạt nặng hơn phần lợi. LN-penalty biến niềm tin thành động lực kinh tế.

### 2.4 HTLC — chìa khóa cho định tuyến đa hop

Payment channel 2 bên chỉ giải quyết Alice ↔ Bob. Nhưng Alice muốn trả **Dave** mà không có channel trực tiếp với Dave — chỉ có đường Alice → Bob → Carol → Dave. Làm sao trả tiền qua các trung gian **không tin nhau**, đảm bảo hoặc *tiền đến đích* hoặc *ai cũng được hoàn lại*, không ai bị "cầm tiền rồi quỵt"?

Câu trả lời là **HTLC — Hashed Timelock Contract**: một output có điều kiện, mở khóa theo 1 trong 2 nhánh:

- **Nhánh hash (thành công):** ai xuất trình được **preimage** `R` sao cho `SHA256(R) = H` thì nhận tiền.
- **Nhánh timelock (hoàn tiền):** nếu sau thời hạn `T` không ai xuất trình `R`, người gửi được hoàn tiền.

<svg viewBox="0 0 720 300" role="img" aria-labelledby="ht-t ht-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="ht-t">Định tuyến đa hop bằng HTLC</title>
<desc id="ht-d">Dave tạo bí mật R và hash H, gửi H ngược về Alice; HTLC được khóa dọc tuyến bằng H; preimage R lan ngược từ Dave về Alice để giải tiền từng chặng</desc>
<rect x="20" y="120" width="110" height="55" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="75" y="152" text-anchor="middle" font-size="13" fill="currentColor">Alice</text>
<rect x="215" y="120" width="110" height="55" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="270" y="152" text-anchor="middle" font-size="13" fill="currentColor">Bob</text>
<rect x="410" y="120" width="110" height="55" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="465" y="152" text-anchor="middle" font-size="13" fill="currentColor">Carol</text>
<rect x="600" y="120" width="110" height="55" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="655" y="150" text-anchor="middle" font-size="13" fill="currentColor">Dave</text>
<text x="655" y="166" text-anchor="middle" font-size="10" fill="currentColor">tạo R, H=SHA256(R)</text>
<line x1="130" y1="140" x2="213" y2="140" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<line x1="325" y1="140" x2="408" y2="140" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<line x1="520" y1="140" x2="598" y2="140" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<text x="172" y="132" text-anchor="middle" font-size="10" fill="currentColor">HTLC(H)</text>
<text x="367" y="132" text-anchor="middle" font-size="10" fill="currentColor">HTLC(H)</text>
<text x="559" y="132" text-anchor="middle" font-size="10" fill="currentColor">HTLC(H)</text>
<line x1="598" y1="200" x2="520" y2="200" stroke="#10b981" stroke-width="2" marker-end="url(#a3)"/>
<line x1="408" y1="200" x2="325" y2="200" stroke="#10b981" stroke-width="2" marker-end="url(#a3)"/>
<line x1="213" y1="200" x2="130" y2="200" stroke="#10b981" stroke-width="2" marker-end="url(#a3)"/>
<text x="367" y="222" text-anchor="middle" font-size="11" fill="#10b981">preimage R lan NGƯỢC, giải tiền từng chặng</text>
<text x="360" y="255" text-anchor="middle" font-size="11" fill="currentColor">Timelock giảm dần dọc tuyến (Alice&gt;Bob&gt;Carol&gt;Dave) để mỗi node có thời gian claim an toàn</text>
<defs><marker id="a2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker><marker id="a3" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#10b981"/></marker></defs>
</svg>

Luồng thanh toán Alice → Dave qua Bob, Carol:
1. **Dave** tạo bí mật ngẫu nhiên `R`, tính `H = SHA256(R)`, gửi **hóa đơn (invoice)** chứa `H` (không chứa `R`) cho Alice.
2. **Alice** lập HTLC với Bob: "Bob nhận X+phí nếu xuất trình `R` với `SHA256(R)=H` trước timelock `T₁`, ngược lại tiền hoàn Alice."
3. **Bob** lập HTLC tương tự với Carol (timelock `T₂ < T₁`), Carol lập với Dave (`T₃ < T₂`). Chuỗi HTLC cùng khóa bởi **cùng một `H`** trải dọc tuyến.
4. **Dave** — người duy nhất biết `R` — xuất trình `R` cho Carol, lấy tiền và **lộ `R`**. Carol dùng `R` lấy tiền từ Bob; Bob dùng `R` lấy tiền từ Alice. `R` lan **ngược** về nguồn, giải tiền từng chặng.

Tính an toàn: nếu ai đó ở giữa "biến mất", HTLC hết hạn timelock và **mọi người được hoàn tiền** — không ai mất tiền. Timelock **giảm dần** từ nguồn về đích để đảm bảo mỗi node trung gian luôn có đủ thời gian claim tiền chặng trước sau khi bị claim ở chặng sau (nếu không sẽ có "free option"). Đây là **atomicity**: hoặc cả tuyến thành công, hoặc cả tuyến hoàn — nhờ preimage duy nhất `R`.

Mô phỏng logic HTLC bằng pseudo-script (Bitcoin Script rút gọn):

```
# HTLC output — chi tiêu theo 1 trong 2 nhánh
OP_IF
    # Nhánh 1: người nhận biết preimage R (hash-lock)
    OP_SHA256 <H> OP_EQUALVERIFY
    <receiver_pubkey> OP_CHECKSIG
OP_ELSE
    # Nhánh 2: hết hạn -> người gửi hoàn tiền (time-lock)
    <T> OP_CHECKLOCKTIMEVERIFY OP_DROP
    <sender_pubkey> OP_CHECKSIG
OP_ENDIF
```

- `OP_SHA256 <H> OP_EQUALVERIFY`: kiểm tra `SHA256(R) == H` — chỉ ai có `R` mới qua được.
- `OP_CHECKLOCKTIMEVERIFY` (CLTV): chặn nhánh hoàn tiền cho tới khi đạt block height/thời gian `T` — đảm bảo người nhận có cửa sổ để claim trước.
- Trong LN thực tế, HTLC này là **output của commitment transaction** trong channel, không phải on-chain — chỉ khi tranh chấp mới đẩy lên chain.

### 2.5 Onion routing & tìm đường

Alice tự tính tuyến (source routing) dựa trên **channel graph** cô biết (các node quảng bá channel công khai kèm phí & capacity). Payload định tuyến được **mã hóa lớp (onion routing, kiểu Sphinx)**: mỗi hop chỉ giải mã được lớp của mình, biết **hop kế tiếp** là ai nhưng **không biết** nguồn/đích cuối hay vị trí mình trong tuyến — tăng tính riêng tư.

---

## 3. Trade-off — cái giá của tốc độ

| Vấn đề | Bản chất | Hệ quả thực tế |
|--------|----------|----------------|
| **Liquidity / inbound capacity** | Chỉ trả được trong giới hạn số dư *phía mình* của channel | Muốn *nhận* tiền cần **inbound liquidity** (đối phương/tuyến có đủ dư ở phía họ). Người mới thường "nhận không được" dù ví có tiền. |
| **Online requirement** | Phải online để ký commitment mới & để phản ứng khi bị broadcast trạng thái cũ | Ví offline dài ngày → dễ bị đối phương gian lận nếu không ai canh chừng. |
| **Watchtower** | Dịch vụ canh chừng thay bạn | Bạn giao trước "bằng chứng phạt" (justice transaction đã ký) cho watchtower; nó theo dõi chain, nếu thấy trạng thái cũ bị broadcast thì tự động phạt kẻ gian, quét tiền về cho bạn — cho phép ví offline an toàn. |
| **Vốn bị khóa (capital lockup)** | Tiền nằm trong channel không dùng on-chain được | Phải cân đối giữa mở nhiều channel (linh hoạt hơn) và chôn vốn. |
| **Không hợp giao dịch lớn/hiếm** | Phí on-chain mở/đóng đáng kể; capacity giới hạn | Lightning tối ưu cho **micro-payment & thanh toán thường xuyên**, không cho chuyển 1 lần giá trị rất lớn. |
| **Routing thất bại** | Không tìm được tuyến đủ liquidity | Payment fail (nhưng an toàn, tiền không mất) — cần thử tuyến khác. |

> **Nguyên tắc:** On-chain Bitcoin = két sắt, an toàn & final tuyệt đối nhưng chậm/đắt. Lightning = ví tiền lẻ, nhanh & rẻ cho chi tiêu hằng ngày nhưng cần liquidity & online. Chúng **bổ sung** nhau, không thay thế.

### So sánh On-chain vs Lightning

| Tiêu chí | On-chain Bitcoin | Lightning (L2) |
|----------|------------------|----------------|
| **Tốc độ xác nhận** | ~10–60 phút | Tức thì (< 1 giây) |
| **Phí** | Cao khi mạng nghẽn | Cực thấp (satoshi lẻ) |
| **Throughput** | ~7 TPS toàn mạng | Hàng triệu TPS (lý thuyết) |
| **Chi phí nhỏ (micro)** | Không khả thi | Lý tưởng |
| **Yêu cầu online** | Không | Có (hoặc watchtower) |
| **Tính final** | Khi đủ confirmation | Ngay khi ký, chốt on-chain khi đóng |

---

## 4. Ví dụ end-to-end: mua cà phê bằng Lightning

1. Quán cà phê hiển thị **QR invoice** chứa `H`, số tiền 5.000 sat, và pubkey node quán.
2. Ví Alice giải mã invoice, **tính tuyến** qua channel graph tới node quán (ví dụ qua 2 hop).
3. Ví dựng **onion packet**, đẩy HTLC dọc tuyến, mỗi node forward và tạm giữ HTLC với `H`.
4. Node quán biết `R`, xuất trình → tiền được giải **ngược** dọc tuyến trong ~1 giây. Alice thấy "Payment successful", quán thấy tiền vào.
5. Tất cả xảy ra **off-chain** — Bitcoin base layer không ghi gì. Chỉ khi các node muốn rút vốn/đóng channel mới có transaction on-chain.

Kết quả: thanh toán 5.000 sat tức thì, phí ~1 sat, thay vì chờ 10 phút + trả phí on-chain có khi lớn hơn cả ly cà phê.

---

## 5. Tóm tắt
- **Lightning Network** là **L2 đầu tiên** thành công của Bitcoin: đẩy phần lớn giao dịch **off-chain**, dùng blockchain chỉ làm **lớp settlement & tòa án cuối**.
- **Payment channel** = funding tx (2-of-2 multisig) mở một lần → hàng nghìn **commitment transaction** off-chain → settlement đóng một lần.
- **Revocation + penalty** (dựa relative timelock + revocation key) khiến **broadcast trạng thái cũ = mất trắng**, nên hai bên không cần tin nhau.
- **HTLC** (hash-lock + time-lock) cho phép **định tuyến đa hop atomic** qua các node không tin nhau: preimage `R` duy nhất giải tiền hoặc timelock hoàn tiền cho tất cả.
- **Trade-off** cốt lõi: **liquidity/inbound capacity**, **online requirement** (giảm nhẹ bằng **watchtower**), vốn bị khóa — Lightning là ví tiền lẻ nhanh-rẻ, bổ sung chứ không thay on-chain.

> **Bài tiếp theo (Bài 14):** rời Bitcoin để bước sang **Ethereum & smart contract** — nơi Layer 2 không chỉ là kênh thanh toán mà là cả rollup (Optimistic & ZK) chạy máy ảo đầy đủ.
