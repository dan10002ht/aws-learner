# Bài 6 — Hệ phân tán & bài toán Byzantine Generals

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **vì sao đồng thuận trong hệ phân tán lại khó**, ngay cả khi không ai gian lận.
- Phát biểu chính xác **bài toán các tướng Byzantine (Byzantine Generals Problem)** và nó mô hình hóa điều gì.
- Phân biệt **crash fault** vs **Byzantine fault**, hiểu **Byzantine Fault Tolerance (BFT)**.
- Chứng minh trực giác **giới hạn 1/3** — vì sao BFT chỉ chịu được dưới một phần ba node phản bội (`n ≥ 3f + 1`).
- Nắm **CAP theorem** và cách blockchain đặt cược trong tam giác Consistency–Availability–Partition tolerance.
- Nói rõ **blockchain giải bài toán niềm tin phi tập trung** như thế nào so với BFT cổ điển.

---

## 2. Lý thuyết

### 2.1 Vì sao đồng thuận phân tán lại khó?

Trong một máy đơn, "sự thật" chỉ có một bản: đọc biến ra là biết ngay. Nhưng khi **nhiều máy nối qua mạng**, ba thứ đồng thời phá vỡ mọi giả định:

| Vấn đề | Bản chất | Hệ quả |
|--------|----------|--------|
| **Không có đồng hồ chung** | Mỗi node có clock riêng, lệch nhau; không có "hiện tại" toàn cục | Không thể nói chắc sự kiện nào xảy ra *trước* — mất khái niệm thứ tự tuyệt đối |
| **Mạng không tin cậy** | Gói tin có thể mất, trễ, đến sai thứ tự, bị lặp | Không phân biệt được "node chết" với "node chậm / mạng đứt" |
| **Node có thể lỗi** | Máy crash, hoặc tệ hơn — bị chiếm quyền và **nói dối** | Phải đạt thống nhất *dù* một phần hệ thống chống lại bạn |

Điều nghịch lý: **ngay cả khi mọi node đều trung thực**, đồng thuận vẫn khó. Kết quả kinh điển **FLP impossibility** (Fischer–Lynch–Paterson, 1985) chứng minh: trong một hệ **bất đồng bộ** (asynchronous — không giới hạn trên cho độ trễ mạng), **không tồn tại thuật toán deterministic** nào đảm bảo đạt đồng thuận nếu chỉ **một** node có thể crash. Lý do: một node im lặng có thể là *đã chết* hoặc *chỉ chậm*, và không cách nào phân biệt trong thời gian hữu hạn.

Các hệ thực tế "lách" FLP bằng cách nới một giả định: thêm **timeout** (giả định bán đồng bộ), hoặc dùng **randomness** (như Nakamoto consensus). Đây là điểm mấu chốt để hiểu vì sao mọi cơ chế đồng thuận đều phải đánh đổi.

### 2.2 Analogy — các tướng vây thành

Bài toán Byzantine Generals (Lamport, Shostak, Pease — 1982) đóng gói cái khó đó thành một câu chuyện:

Nhiều đạo quân của **Đế quốc Byzantine** vây quanh một thành phố. Mỗi đạo có **một vị tướng**. Họ chỉ thắng nếu **cùng tấn công** hoặc **cùng rút lui** — nếu nửa tấn công nửa rút thì thua thảm. Các tướng ở xa nhau, **chỉ liên lạc qua người đưa tin (messenger)**, và éo le thay:

- **Người đưa tin có thể bị bắt** → tin nhắn mất (fault của kênh).
- **Một số tướng là kẻ phản bội** → cố tình gửi tin *khác nhau* cho các tướng khác nhau để phá vỡ đồng thuận ("nói với A là tấn công, nói với B là rút lui").

Câu hỏi: **Các tướng trung thành có cách nào luôn đi đến một kế hoạch chung, dù có f kẻ phản bội trong đám?**

<svg viewBox="0 0 700 300" role="img" aria-labelledby="bg-t bg-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="bg-t">Bài toán các tướng Byzantine</title>
<desc id="bg-d">Bốn tướng bao vây thành phố, một tướng phản bội gửi tin mâu thuẫn cho các tướng còn lại</desc>
<rect x="300" y="120" width="100" height="60" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="146" text-anchor="middle" font-size="13" fill="currentColor">Thành</text>
<text x="350" y="164" text-anchor="middle" font-size="11" fill="currentColor">bị vây</text>
<circle cx="120" cy="60" r="26" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="58" text-anchor="middle" font-size="11" fill="currentColor">Tướng A</text>
<text x="120" y="73" text-anchor="middle" font-size="10" fill="currentColor">trung thành</text>
<circle cx="580" cy="60" r="26" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="580" y="58" text-anchor="middle" font-size="11" fill="currentColor">Tướng B</text>
<text x="580" y="73" text-anchor="middle" font-size="10" fill="currentColor">trung thành</text>
<circle cx="120" cy="245" r="26" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="243" text-anchor="middle" font-size="11" fill="currentColor">Tướng C</text>
<text x="120" y="258" text-anchor="middle" font-size="10" fill="currentColor">trung thành</text>
<circle cx="580" cy="245" r="26" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="580" y="243" text-anchor="middle" font-size="11" fill="currentColor">Tướng D</text>
<text x="580" y="258" text-anchor="middle" font-size="10" fill="#f43f5e">phản bội</text>
<line x1="146" y1="60" x2="554" y2="60" stroke="currentColor" stroke-width="1"/>
<line x1="120" y1="86" x2="120" y2="219" stroke="currentColor" stroke-width="1"/>
<line x1="146" y1="245" x2="554" y2="245" stroke="currentColor" stroke-width="1"/>
<line x1="558" y1="228" x2="146" y2="77" stroke="#f43f5e" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#bga)"/>
<line x1="558" y1="252" x2="146" y2="252" stroke="#f43f5e" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#bga)"/>
<text x="360" y="200" text-anchor="middle" font-size="10" fill="#f43f5e">"Tấn công!" gửi A</text>
<text x="360" y="270" text-anchor="middle" font-size="10" fill="#f43f5e">"Rút lui!" gửi C</text>
<defs><marker id="bga" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#f43f5e"/></marker></defs>
</svg>

Đây **chính xác** là mô hình của một mạng blockchain: các **node** = các tướng, **mạng P2P** = người đưa tin, **node bị hack / kẻ tấn công** = tướng phản bội. Đạt đồng thuận = tất cả node trung thực thống nhất **cùng một sổ cái**.

### 2.3 Crash fault vs Byzantine fault

Không phải mọi lỗi đều như nhau. Đây là phân biệt sống còn:

| Loại lỗi | Node lỗi làm gì | Ví dụ | Khó chống? |
|----------|-----------------|-------|-----------|
| **Crash fault** (fail-stop) | Ngừng hoạt động, im lặng hẳn | Máy tắt điện, kernel panic | Dễ hơn — chỉ cần chờ / bỏ qua |
| **Byzantine fault** | Hành xử **tùy ý**: nói dối, gửi tin mâu thuẫn, chọn thời điểm hiểm, phối hợp phá | Node bị hack, kẻ tấn công có chủ đích, bug hiểm | Rất khó — kẻ địch *thông minh & thù địch* |

Byzantine là **siêu tập** của crash: một node crash chỉ là một trường hợp con của "hành xử tùy ý". Vì vậy **Byzantine Fault Tolerance (BFT)** — khả năng đạt đồng thuận đúng dù có node Byzantine — là chuẩn mực khắt khe nhất. Blockchain public *bắt buộc* phải BFT: bất kỳ ai cũng vào mạng được, nên phải giả định có kẻ xấu chủ động.

### 2.4 Giới hạn 1/3 — trái tim của BFT

Định lý nền tảng: với thuật toán BFT cổ điển (dạng bỏ phiếu, mạng bán đồng bộ), để chịu được **f** node Byzantine cần **tối thiểu `n ≥ 3f + 1` node**. Tương đương: hệ chỉ an toàn khi **số node phản bội < 1/3 tổng số**.

Vì sao là 1/3 chứ không phải 1/2? Trực giác qua ba yêu cầu chồng nhau:

1. **Phải hoạt động được dù f node im lặng.** Kẻ Byzantine có thể chỉ đơn giản *không trả lời*. Muốn quyết định, ta không thể chờ mãi — phải kết luận sau khi nghe được `n − f` node. Vậy quyết định dựa trên `n − f` phiếu.
2. **Trong `n − f` phiếu đó, có thể f phiếu là của kẻ nói dối.** (Kẻ im lặng lúc trước giờ có thể là node khác, còn f kẻ xấu lại trả lời và nói dối.) Vậy số phiếu *trung thực chắc chắn* chỉ là `n − f − f = n − 2f`.
3. **Phe trung thực phải áp đảo phe nói dối** để một quyết định sai không bao giờ được chốt: cần `n − 2f > f`, tức **`n > 3f`**, tức **`n ≥ 3f + 1`**.

<svg viewBox="0 0 700 200" role="img" aria-labelledby="tf-t tf-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="tf-t">Giới hạn một phần ba của BFT</title>
<desc id="tf-d">Thanh chia n node thành phần trung thực và phần Byzantine, an toàn khi phần Byzantine dưới một phần ba</desc>
<text x="350" y="26" text-anchor="middle" font-size="14" fill="currentColor">n = 3f + 1 (ví dụ n=4, f=1)</text>
<rect x="60" y="60" width="480" height="50" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="540" y="60" width="100" height="50" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="300" y="90" text-anchor="middle" font-size="12" fill="currentColor">Trung thực: 2f+1 (đa số áp đảo)</text>
<text x="590" y="90" text-anchor="middle" font-size="12" fill="currentColor">Byzantine: f</text>
<line x1="540" y1="50" x2="540" y2="120" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/>
<text x="350" y="150" text-anchor="middle" font-size="12" fill="currentColor">An toàn ⇔ phần đỏ &lt; 1/3 tổng ⇔ f &lt; n/3</text>
<text x="350" y="175" text-anchor="middle" font-size="11" fill="currentColor">Hai quorum bất kỳ (mỗi cái n−f node) luôn giao nhau ở ≥ 1 node trung thực</text>
</svg>

Ý tưởng sâu hơn là **quorum intersection**: mọi quyết định cần một *quorum* `n − f` node. Hai quorum bất kỳ luôn chồng lấn ở ít nhất `n − 2f` node; với `n ≥ 3f + 1` thì `n − 2f ≥ f + 1 > f`, nghĩa là **giao điểm luôn chứa ít nhất một node trung thực** — node này không thể đồng thời nói "có" cho quyết định A và "có" cho quyết định B mâu thuẫn. Đó là cách BFT chặn **fork** (hai lịch sử mâu thuẫn cùng được chốt).

> Con số **1/3** giải thích luôn thiết kế thực tế: các chain PoS dạng BFT (Tendermint/Cosmos, Ethereum sau Merge với finality gadget) đều cần **> 2/3 stake** đồng ý để finalize một block, và **an toàn tan vỡ khi ≥ 1/3 stake trở nên độc ác** — đây là ngưỡng để định giá chi phí tấn công.

### 2.5 PBFT — BFT làm được trong thực tế

Năm 1999, **Castro & Liskov** công bố **PBFT (Practical Byzantine Fault Tolerance)**, chứng minh BFT chạy đủ nhanh cho hệ thật. PBFT chọn một node làm **leader (primary)** và chạy 3 pha bỏ phiếu cho mỗi quyết định:

<svg viewBox="0 0 700 260" role="img" aria-labelledby="pb-t pb-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="pb-t">Ba pha của PBFT</title>
<desc id="pb-d">Luồng thông điệp giữa client, node primary và các node backup qua pha pre-prepare, prepare và commit</desc>
<text x="70" y="28" text-anchor="middle" font-size="12" fill="currentColor">Client</text>
<text x="70" y="70" text-anchor="middle" font-size="12" fill="#3b82f6">Primary</text>
<text x="70" y="120" text-anchor="middle" font-size="12" fill="currentColor">Node 1</text>
<text x="70" y="170" text-anchor="middle" font-size="12" fill="currentColor">Node 2</text>
<text x="70" y="220" text-anchor="middle" font-size="12" fill="#f43f5e">Node 3 (lỗi)</text>
<line x1="130" y1="24" x2="670" y2="24" stroke="currentColor" stroke-width="0.5"/>
<line x1="130" y1="66" x2="670" y2="66" stroke="currentColor" stroke-width="0.5"/>
<line x1="130" y1="116" x2="670" y2="116" stroke="currentColor" stroke-width="0.5"/>
<line x1="130" y1="166" x2="670" y2="166" stroke="currentColor" stroke-width="0.5"/>
<line x1="130" y1="216" x2="670" y2="216" stroke="currentColor" stroke-width="0.5"/>
<text x="200" y="46" text-anchor="middle" font-size="10" fill="currentColor">request</text>
<line x1="150" y1="24" x2="230" y2="66" stroke="currentColor" stroke-width="1" marker-end="url(#pba)"/>
<text x="280" y="58" text-anchor="middle" font-size="10" fill="#3b82f6">pre-prepare</text>
<line x1="240" y1="66" x2="330" y2="116" stroke="#3b82f6" stroke-width="1" marker-end="url(#pba)"/>
<line x1="240" y1="66" x2="330" y2="166" stroke="#3b82f6" stroke-width="1" marker-end="url(#pba)"/>
<text x="410" y="108" text-anchor="middle" font-size="10" fill="currentColor">prepare (all↔all)</text>
<line x1="345" y1="116" x2="435" y2="166" stroke="currentColor" stroke-width="1" marker-end="url(#pba)"/>
<line x1="345" y1="166" x2="435" y2="116" stroke="currentColor" stroke-width="1" marker-end="url(#pba)"/>
<line x1="345" y1="116" x2="435" y2="66" stroke="currentColor" stroke-width="1" marker-end="url(#pba)"/>
<text x="540" y="150" text-anchor="middle" font-size="10" fill="#10b981">commit (all↔all)</text>
<line x1="470" y1="66" x2="560" y2="116" stroke="#10b981" stroke-width="1" marker-end="url(#pba)"/>
<line x1="470" y1="116" x2="560" y2="166" stroke="#10b981" stroke-width="1" marker-end="url(#pba)"/>
<line x1="470" y1="166" x2="560" y2="116" stroke="#10b981" stroke-width="1" marker-end="url(#pba)"/>
<text x="630" y="46" text-anchor="middle" font-size="10" fill="currentColor">reply</text>
<line x1="590" y1="66" x2="650" y2="24" stroke="currentColor" stroke-width="1" marker-end="url(#pba)"/>
<line x1="590" y1="116" x2="650" y2="24" stroke="currentColor" stroke-width="1" marker-end="url(#pba)"/>
<text x="350" y="250" text-anchor="middle" font-size="11" fill="currentColor">Node lỗi (đỏ) im lặng — vẫn commit được vì 3 node trung thực ≥ 2f+1</text>
<defs><marker id="pba" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

- **Pre-prepare**: primary đề xuất thứ tự cho request, phát cho các backup.
- **Prepare**: mỗi node phát "tôi thấy đề xuất này", chờ nhận `2f` phiếu prepare khớp → chắc chắn *đa số trung thực* đồng ý *cùng một thứ tự*.
- **Commit**: mỗi node phát commit, chờ `2f + 1` phiếu commit → chốt. Ba pha là cần thiết để chống cả trường hợp primary chính là kẻ Byzantine (khi đó cơ chế **view-change** thay leader).

Đặc điểm quan trọng: PBFT cho **finality tức thì** (block đã commit là *bất khả đảo ngược*, không có "chờ 6 xác nhận"), nhưng **giao tiếp O(n²)** thông điệp → chỉ scale tới vài chục–vài trăm node, và cần **biết trước danh sách thành viên** (permissioned). Đây chính là lý do Bitcoin cần một cách tiếp cận *khác*.

### 2.6 CAP theorem — không có bữa trưa miễn phí

Định lý **CAP** (Brewer, 2000; Gilbert & Lynch chứng minh hình thức 2002) nói về mọi hệ dữ liệu phân tán, dựa trên ba tính chất:

- **C — Consistency**: mọi node đọc ra *cùng một* dữ liệu mới nhất (linearizability).
- **A — Availability**: mọi request tới node còn sống đều nhận *được* phản hồi (không lỗi/không treo).
- **P — Partition tolerance**: hệ vẫn chạy khi mạng bị **chia cắt** (partition) — nhóm node này không nói chuyện được với nhóm kia.

Định lý: **khi partition xảy ra (P), bạn chỉ được chọn một trong C hoặc A.** Vì trong một môi trường mạng thật partition là *chắc chắn sẽ xảy ra*, P không phải lựa chọn — nên câu hỏi thực tế luôn là **CP hay AP**:

| Lựa chọn | Khi partition | Ví dụ |
|----------|---------------|-------|
| **CP** (ưu tiên nhất quán) | Từ chối/treo request để không bao giờ trả dữ liệu cũ hay mâu thuẫn | HBase, Zookeeper, **PBFT-chain (Tendermint)** — dừng finalize khi mất >1/3 |
| **AP** (ưu tiên sẵn sàng) | Vẫn trả lời, chấp nhận dữ liệu tạm thời không đồng bộ, hòa giải sau | Cassandra, DynamoDB, **Bitcoin** — luôn nhận block, giải fork sau |

Blockchain đặt cược ở đây rất rõ:
- **Bitcoin / Nakamoto consensus = thiên AP.** Khi mạng chia cắt, *cả hai* phía vẫn tiếp tục đào block (available). Có thể tạm thời có hai chain (mất consistency tức thời), nhưng khi mạng liền lại, **longest-chain rule** chọn chain nhiều công nhất, phía kia bị bỏ (reorg). Đây là lý do có khái niệm **probabilistic finality**: giao dịch chỉ *càng lúc càng chắc*, không bao giờ tuyệt đối 100%.
- **BFT-PoS (Tendermint, Ethereum finality) = thiên CP.** Cần >2/3 online để chốt; nếu partition khiến không đủ 2/3 ở một phía, chain **dừng finalize** (mất availability) nhưng **không bao giờ fork** (giữ consistency). An toàn hơn về finality, đổi lấy rủi ro "đứng hình" khi mất quá nhiều node.

> CAP không phải "chọn 2 trong 3" như slogan phổ biến — chính xác hơn là: **P là bắt buộc, và dưới partition phải hy sinh C hoặc A.** Hiểu đúng điều này giúp bạn đọc được *tính cách* của mọi blockchain.

### 2.7 Blockchain giải "bài toán niềm tin phi tập trung" như thế nào

PBFT giải Byzantine đẹp, nhưng có hai giả định chết người với môi trường mở: (1) **biết trước ai là thành viên** (để đếm 2f+1), và (2) **không chống được Sybil** — kẻ tấn công tạo hàng triệu node giả để chiếm >1/3. Trong mạng public *ai cũng vào được*, bỏ phiếu "một node một phiếu" là vô nghĩa.

Đột phá của **Nakamoto (2008)** không phải là "một thuật toán BFT nhanh hơn", mà là **đổi luật đếm phiếu**:

| Chiều | BFT cổ điển (PBFT) | Nakamoto consensus (Bitcoin) |
|-------|---------------------|------------------------------|
| Đơn vị "phiếu" | 1 node = 1 phiếu | **1 đơn vị công/tài nguyên** = 1 phiếu (hashpower ở PoW, stake ở PoS) |
| Thành viên | Cố định, biết trước (permissioned) | **Mở, không cần xin phép** (permissionless) |
| Chống Sybil | Không có → phải giới hạn thành viên | **Có** — tạo node giả *miễn phí*, nhưng công/stake thì *tốn tiền thật* |
| Ngưỡng an toàn | < 1/3 node Byzantine | < **1/2** hashpower/stake (51% attack) |
| Finality | Tức thì, tuyệt đối | Xác suất, càng nhiều block càng chắc |
| Quy mô | Vài trăm node | Hàng chục nghìn node |

Cái tài tình: gắn quyền bỏ phiếu vào **một tài nguyên đắt đỏ, khan hiếm bên ngoài** (điện năng để tính hash, hoặc vốn bị khóa). Muốn lật đồng thuận, kẻ tấn công không "tạo node giả" được nữa — phải **thực sự sở hữu > 50% tài nguyên toàn mạng**, một chi phí khổng lồ và tự hủy (tấn công thành công thì tài sản chính mình mất giá). Niềm tin được **thay bằng chi phí kinh tế**: bạn không cần tin ai, chỉ cần tin rằng *không kẻ nào bỏ ra nổi số tiền để tấn công lớn hơn số tiền chúng kiếm được*.

Đó là ý nghĩa đầy đủ của "**giải bài toán niềm tin phi tập trung**": biến bài toán Byzantine Generals — vốn cần biết trước và giới hạn số tướng — thành một bài toán **mở, chống Sybil, tự khích lệ kinh tế**, nơi các bên xa lạ và không tin nhau vẫn hội tụ về một sổ cái chung mà không cần bất kỳ trung gian nào.

---

## 3. So sánh nhanh các mô hình đồng thuận

| Tiêu chí | Raft/Paxos (crash-only) | PBFT (BFT cổ điển) | Nakamoto (PoW/PoS) |
|----------|-------------------------|--------------------|--------------------|
| **Chịu lỗi** | Chỉ crash, ≤ n/2 chết | Byzantine, < n/3 | Byzantine kinh tế, < 1/2 tài nguyên |
| **Thành viên** | Biết trước | Biết trước | Mở, permissionless |
| **Chống Sybil** | Không | Không | Có (PoW/PoS) |
| **Finality** | Tức thì | Tức thì | Xác suất (PoW) / tức thì kèm điều kiện (PoS-BFT) |
| **Quy mô node** | Chục | Chục–trăm | Chục nghìn |
| **Chi phí tin cậy** | Tin thành viên không nói dối | ≥ 2/3 trung thực | Kinh tế (điện/stake) |

---

## 4. Ví dụ thực tế — số học để "cảm" được ngưỡng

- **Tendermint / Cosmos**: 100 validator, tổng stake S. Chain **finalize** một block khi ≥ **67 phiếu (> 2/3)** theo trọng số stake. Kẻ tấn công cần > 1/3 stake để *chặn* finality (liveness attack), và > 2/3 để *chốt block sai* (safety attack). Đó là lý do phân tán stake ra nhiều validator lại quan trọng: gom stake vào ít bên làm ngưỡng tấn công rẻ đi.
- **Bitcoin**: không "đếm 2/3" gì cả — mỗi block là một cuộc bỏ phiếu bằng hashpower. Muốn viết lại lịch sử k block, kẻ tấn công phải đào nhanh hơn cả phần còn lại của mạng trong suốt k block. Với > 50% hashpower thì *chắc chắn* làm được (51% attack); dưới 50% xác suất thành công **giảm mũ** theo k — đây là gốc rễ tại sao ta chờ **6 xác nhận** cho giao dịch giá trị lớn.

Hai ví dụ cho thấy cùng một bài toán Byzantine được "định giá" bằng hai đơn vị khác nhau: **tỷ lệ node/stake trung thực** (BFT) vs **tỷ lệ tài nguyên trung thực** (Nakamoto).

---

## 5. Tóm tắt
- Đồng thuận phân tán khó vì **không có đồng hồ chung + mạng không tin cậy + node có thể lỗi**; FLP chứng minh không có giải pháp deterministic hoàn hảo trong hệ bất đồng bộ.
- **Byzantine Generals Problem** mô hình hóa việc đạt thống nhất khi có node **nói dối chủ động** — đúng bối cảnh của blockchain public.
- **BFT** chịu được lỗi Byzantine; giới hạn kinh điển **`n ≥ 3f + 1`** (dưới 1/3 phản bội) đến từ yêu cầu **quorum luôn giao nhau ở node trung thực**.
- **PBFT** làm BFT chạy thực tế với 3 pha (pre-prepare/prepare/commit) và finality tức thì, nhưng O(n²) và cần permissioned.
- **CAP theorem**: dưới partition phải chọn **CP hoặc AP** — Bitcoin thiên **AP** (finality xác suất, cho fork tạm), BFT-PoS thiên **CP** (không fork, có thể dừng finalize).
- Blockchain **giải bài toán niềm tin phi tập trung** bằng cách đổi "một node một phiếu" thành "**một đơn vị tài nguyên một phiếu**" — chống Sybil, mở, khích lệ kinh tế, thay niềm tin bằng chi phí.

> **Bài tiếp theo (Bài 7):** đi sâu vào lời giải Nakamoto đầu tiên — **Proof of Work**, cách "đào" gắn phiếu vào công thật và biến 51% attack thành một canh bạc thua lỗ.
