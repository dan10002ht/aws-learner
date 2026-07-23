# Bài 1 — Blockchain là gì? Sổ cái phân tán & bài toán double-spending

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **blockchain trong 1 câu** mà không lặp lại định nghĩa sáo rỗng.
- Nói rõ **bài toán double-spending** — lý do gốc rễ khiến tiền số cần blockchain.
- Phân biệt **sổ cái tập trung** (centralized ledger) vs **sổ cái phân tán** (distributed ledger).
- So sánh blockchain với **database truyền thống** — biết khi nào KHÔNG nên dùng blockchain.
- Phân loại **public / private / permissioned / consortium** và chọn đúng use case.

---

## 2. Lý thuyết

### 2.1 Analogy — cuốn sổ nợ của cả làng

Tưởng tượng một ngôi làng ghi nợ bằng **một cuốn sổ duy nhất** do trưởng làng giữ:

| Cách ghi sổ | Tương đương IT | Điểm yếu |
|-------------|----------------|----------|
| **Trưởng làng giữ 1 cuốn** | Centralized ledger (ngân hàng, DB) | Trưởng làng gian lận / mất sổ / cháy nhà là mất hết. Phải **tin** 1 người. |
| **Mỗi nhà giữ 1 bản sao giống hệt, ai ghi gì cả làng cùng thấy & cùng duyệt** | **Distributed ledger (blockchain)** | Không ai sửa lén được — muốn gian lận phải lừa được **quá nửa** cả làng cùng lúc. |

Blockchain **không phải "database tốt hơn"**. Nó là một **mô hình niềm tin khác**: thay vì tin một bên trung gian, bạn tin vào **luật chơi mật mã + số đông** — cho phép các bên **không tin nhau** vẫn giao dịch được trên một sổ cái chung.

### 2.2 Bài toán cốt lõi: double-spending

Với tiền vật lý (tờ tiền), tiêu là **đưa đi** — không giữ lại được. Nhưng dữ liệu số thì **copy-paste vô hạn**. Nếu tiền chỉ là một file, tôi có thể gửi **cùng một đồng** cho hai người: đó là **double-spending** (tiêu hai lần).

<svg viewBox="0 0 700 260" role="img" aria-labelledby="ds-t ds-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="ds-t">Bài toán double-spending</title>
<desc id="ds-d">Một người cố gửi cùng một đồng coin cho hai người nhận cùng lúc</desc>
<rect x="300" y="100" width="100" height="60" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="126" text-anchor="middle" font-size="14" fill="currentColor">Alice</text>
<text x="350" y="146" text-anchor="middle" font-size="12" fill="currentColor">1 coin</text>
<rect x="560" y="30" width="110" height="55" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="615" y="62" text-anchor="middle" font-size="13" fill="currentColor">Bob</text>
<rect x="560" y="175" width="110" height="55" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="615" y="207" text-anchor="middle" font-size="13" fill="currentColor">Carol</text>
<line x1="400" y1="120" x2="558" y2="60" stroke="currentColor" stroke-width="1.5" marker-end="url(#ah)"/>
<line x1="400" y1="140" x2="558" y2="200" stroke="currentColor" stroke-width="1.5" marker-end="url(#ah)"/>
<text x="470" y="75" text-anchor="middle" font-size="12" fill="#f43f5e">gửi coin X</text>
<text x="470" y="188" text-anchor="middle" font-size="12" fill="#f43f5e">gửi coin X (lại!)</text>
<text x="350" y="240" text-anchor="middle" font-size="12" fill="currentColor">Ai là chủ thật của coin X? → cần một sổ cái đồng thuận</text>
<defs><marker id="ah" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Ngân hàng giải bài này bằng cách **giữ sổ trung tâm**: trừ tài khoản Alice trước khi cộng cho Bob, nên coin X không thể tiêu lần hai. Nhưng nếu **không có ngân hàng**? Bitcoin (2008) là lời giải đầu tiên cho double-spending **mà không cần bên trung gian** — bằng cách cho cả mạng cùng đồng thuận một thứ tự giao dịch duy nhất.

### 2.3 Sổ cái tập trung vs phân tán

<svg viewBox="0 0 700 300" role="img" aria-labelledby="cd-t cd-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="cd-t">Sổ cái tập trung vs phân tán</title>
<desc id="cd-d">Bên trái một máy chủ trung tâm, bên phải nhiều node ngang hàng mỗi node giữ một bản sao</desc>
<text x="175" y="24" text-anchor="middle" font-size="14" fill="currentColor">Tập trung (1 sổ)</text>
<rect x="130" y="120" width="90" height="55" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="175" y="152" text-anchor="middle" font-size="12" fill="currentColor">Server</text>
<circle cx="70" cy="60" r="16" fill="none" stroke="currentColor"/>
<circle cx="70" cy="230" r="16" fill="none" stroke="currentColor"/>
<circle cx="280" cy="60" r="16" fill="none" stroke="currentColor"/>
<circle cx="280" cy="230" r="16" fill="none" stroke="currentColor"/>
<line x1="84" y1="70" x2="140" y2="125" stroke="currentColor" stroke-width="1"/>
<line x1="84" y1="220" x2="140" y2="170" stroke="currentColor" stroke-width="1"/>
<line x1="266" y1="70" x2="210" y2="125" stroke="currentColor" stroke-width="1"/>
<line x1="266" y1="220" x2="210" y2="170" stroke="currentColor" stroke-width="1"/>
<line x1="350" y1="30" x2="350" y2="270" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<text x="525" y="24" text-anchor="middle" font-size="14" fill="currentColor">Phân tán (mỗi node 1 bản sao)</text>
<circle cx="450" cy="90" r="20" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<circle cx="600" cy="90" r="20" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<circle cx="450" cy="220" r="20" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<circle cx="600" cy="220" r="20" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<circle cx="525" cy="155" r="20" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<line x1="450" y1="90" x2="600" y2="90" stroke="currentColor" stroke-width="1"/>
<line x1="450" y1="220" x2="600" y2="220" stroke="currentColor" stroke-width="1"/>
<line x1="450" y1="90" x2="450" y2="220" stroke="currentColor" stroke-width="1"/>
<line x1="600" y1="90" x2="600" y2="220" stroke="currentColor" stroke-width="1"/>
<line x1="450" y1="90" x2="525" y2="155" stroke="currentColor" stroke-width="1"/>
<line x1="600" y1="90" x2="525" y2="155" stroke="currentColor" stroke-width="1"/>
<line x1="450" y1="220" x2="525" y2="155" stroke="currentColor" stroke-width="1"/>
<line x1="600" y1="220" x2="525" y2="155" stroke="currentColor" stroke-width="1"/>
<text x="350" y="292" text-anchor="middle" font-size="11" fill="currentColor">Tập trung: nhanh, rẻ, nhưng 1 điểm chết &amp; phải tin bên giữ sổ — Phân tán: chậm hơn, nhưng chống kiểm duyệt &amp; không cần tin ai</text>
</svg>

### 2.4 Blockchain trong 1 câu

> **Blockchain** là một **sổ cái phân tán, chỉ-ghi-thêm (append-only)**, trong đó các giao dịch được gom thành **block** nối nhau bằng **hàm băm mật mã**, và được **cả mạng đồng thuận** — khiến dữ liệu quá khứ **gần như không thể sửa** mà không bị phát hiện.

Bốn trụ cột (sẽ học sâu ở các bài sau):
1. **Mật mã** (hàm băm + chữ ký số) — Bài 2, 3
2. **Cấu trúc chain** (block nối bằng hash) — Bài 4
3. **Đồng thuận phi tập trung** (PoW/PoS) — Chương 2
4. **Mạng P2P** — Bài 10

---

## 3. Blockchain vs Database truyền thống

| Tiêu chí | Database (SQL) | Blockchain |
|----------|----------------|------------|
| **Quyền ghi** | Admin có toàn quyền, sửa/xóa được | Chỉ append; sửa quá khứ ~ bất khả |
| **Niềm tin** | Tin vào bên vận hành | Tin vào mật mã + số đông |
| **Tốc độ** | Rất nhanh (hàng vạn TPS) | Chậm (Bitcoin ~7 TPS, Ethereum ~15–30) |
| **Chi phí** | Thấp | Cao (phí gas / mining) |
| **Điểm chết** | Có (server trung tâm) | Không (nhiều node) |
| **Kiểm duyệt** | Dễ bị chặn/gỡ | Chống kiểm duyệt |

> **Quy tắc quyết định:** Nếu bạn **có** một bên đáng tin để giữ sổ và các bên đều tin bên đó → **dùng database**, nhanh & rẻ hơn nhiều. Chỉ chọn blockchain khi các bên **không tin nhau**, cần **chống kiểm duyệt / bất biến / minh bạch** mà không có trung gian.

Đa số "ý tưởng blockchain" trong doanh nghiệp thực chất chỉ cần một database dùng chung — đừng dùng blockchain chỉ vì nghe sang.

---

## 4. Các loại blockchain

| Loại | Ai đọc được | Ai ghi/validate được | Ví dụ |
|------|-------------|----------------------|-------|
| **Public** (permissionless) | Bất kỳ ai | Bất kỳ ai (mở) | Bitcoin, Ethereum |
| **Private** | Giới hạn | Một tổ chức | Chuỗi nội bộ doanh nghiệp |
| **Permissioned / Consortium** | Giới hạn | Nhóm được cấp phép | Hyperledger Fabric, R3 Corda |

- **Public**: phi tập trung cao nhất, chống kiểm duyệt, nhưng chậm & minh bạch hoàn toàn.
- **Private/Consortium**: nhanh hơn, riêng tư hơn, nhưng **đánh đổi** phi tập trung — gần với database dùng chung có kiểm toán.

---

## 5. Ví dụ end-to-end: một giao dịch đi qua blockchain

1. Alice ký giao dịch "gửi 1 coin cho Bob" bằng **private key** (Bài 3).
2. Giao dịch phát tán ra **mạng P2P**, nằm trong **mempool** chờ xử lý (Bài 10).
3. Một validator/miner gom nó vào **block**, giải bài đồng thuận (Chương 2).
4. Block được nối vào chain bằng **hash** của block trước (Bài 4); cả mạng cập nhật bản sao.
5. Sau đủ số block xác nhận, giao dịch coi như **final** — coin X giờ thuộc Bob, Alice không thể tiêu lại.

---

## 6. Tóm tắt
- Blockchain sinh ra để giải **double-spending không cần trung gian** — đóng góp cốt lõi của Bitcoin.
- Nó là **sổ cái phân tán, append-only**, dựa trên **mật mã + đồng thuận số đông**.
- **Không phải** lúc nào cũng nên dùng: có bên đáng tin → database nhanh & rẻ hơn.
- Ba dạng chính: **public / private / permissioned**, đánh đổi giữa phi tập trung và hiệu năng/riêng tư.
- Bốn trụ cột — mật mã, cấu trúc chain, đồng thuận, mạng P2P — là bản đồ cho toàn bộ chương này.

> **Bài tiếp theo (Bài 2):** đi sâu vào trụ cột đầu tiên — **hàm băm SHA-256 & cây Merkle**, thứ khiến "sửa quá khứ là bất khả".
