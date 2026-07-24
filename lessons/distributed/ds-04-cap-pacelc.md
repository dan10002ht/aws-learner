# Bài 4 — CAP theorem &amp; PACELC

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phát biểu **CAP theorem CHÍNH XÁC** theo Gilbert–Lynch, và vứt bỏ cách hiểu ngây thơ "chọn 2 trong 3".
- Giải thích vì sao **P (partition tolerance) không phải thứ để chọn** — với hệ chạy thật qua mạng, partition là điều bắt buộc phải chịu; nên lựa chọn thật sự chỉ là **CP hay AP khi đang có partition**.
- Dùng **PACELC** để bổ khuyết chỗ CAP im lặng: **khi KHÔNG có partition (Else), hệ vẫn phải đánh đổi Latency ↔ Consistency**.
- Phân loại được các hệ thật (Dynamo, Cassandra, HBase, Spanner...) theo cả hai chiều **PA/PC** và **EL/EC**, và giải thích lựa chọn đó xuất phát từ đâu.

---

## 2. Lý thuyết

### 2.1 Analogy đời thường: hai chi nhánh mất liên lạc

Hình dung một ngân hàng có **hai chi nhánh** cùng phục vụ một tài khoản, số dư 100 triệu. Bình thường hai chi nhánh gọi điện cho nhau để đồng bộ. Một hôm **đường dây liên lạc giữa hai chi nhánh đứt** (đó chính là *partition*). Khách tới chi nhánh A rút 80 triệu. Chi nhánh A đứng trước đúng hai lựa chọn, không có cửa thứ ba:

- **Từ chối giao dịch** cho tới khi liên lạc lại được với B, để chắc chắn không chi vượt số dư. → Giữ **nhất quán (Consistency)** nhưng **mất sẵn sàng (Availability)**: khách bị từ chối dù tiền có thật. Đây là **CP**.
- **Cho rút luôn** dựa trên số liệu cục bộ, đồng bộ với B sau. → Giữ **sẵn sàng** nhưng **hy sinh nhất quán**: nếu cùng lúc khách khác rút ở B, tổng chi có thể vượt số dư (double-spend). Đây là **AP**.

Bạn **không thể vừa** trả lời khách ngay (available) **vừa** đảm bảo con số đúng tuyệt đối (consistent) khi đường dây đã đứt. Đó là toàn bộ tinh thần của CAP — và mấu chốt là: **partition là thứ xảy tới với bạn, không phải thứ bạn chọn.**

### 2.2 Phát biểu CAP cho chính xác

Ba thuộc tính, hiểu đúng theo bài chứng minh của Gilbert &amp; Lynch (2002):

| Chữ | Tên đầy đủ | Định nghĩa chặt (không phải cảm tính) |
|-----|-----------|----------------------------------------|
| **C** | Consistency | **Linearizability**: mọi read thấy được write mới nhất đã hoàn tất; toàn hệ hành xử như thể có **một bản copy duy nhất**. Đây là consistency *mạnh*, KHÔNG phải chữ C trong ACID. |
| **A** | Availability | **Mọi request tới một node còn sống đều nhận được response non-error** trong thời gian hữu hạn. Lưu ý: response chậm-vô-hạn hoặc lỗi thì KHÔNG tính là available. |
| **P** | Partition tolerance | Hệ **vẫn tiếp tục hoạt động** dù mạng **mất/hoãn tuỳ ý** các message giữa các node (network partition). |

> **Phát biểu chuẩn (không phải "2 trong 3"):**
> *Khi xảy ra network partition, một hệ phân tán không thể đồng thời đảm bảo cả Consistency (linearizability) lẫn Availability. Nó buộc phải hy sinh ít nhất một trong hai.*

Cách nói "**pick 2 of 3**" là **sai và gây hiểu lầm**, vì nó ngụ ý P là một món ngang hàng để bạn tự do bỏ. Thực tế:

### 2.3 Vì sao P là thứ BẮT BUỘC PHẢI CHỊU, không phải để chọn

Partition = mạng làm mất hoặc trì hoãn message. Trong bất kỳ hệ nào có **≥ 2 node giao tiếp qua mạng thật**, partition **chắc chắn sẽ xảy ra**: đứt cáp, switch treo, GC pause dài, node quá tải không kịp trả lời... Về mặt quan sát, một node **không phân biệt được** "peer đã chết" với "message tới peer bị mất" (đúng vấn đề *partial failure* ở Bài 1).

Vậy "bỏ P" nghĩa là gì? Nghĩa là **giả định mạng không bao giờ mất message** — điều chỉ đúng khi tất cả chạy trên **một máy duy nhất**. Một hệ "CA" theo nghĩa từ chối P **không phải hệ phân tán**; nó là một RDBMS single-node. Ngay khi bạn có mạng, **P được áp lên bạn**, và câu hỏi duy nhất còn lại là:

> **Khi (không phải "nếu") partition xảy ra, tôi giữ C hay giữ A?** → đó là lựa chọn **CP hay AP**.

<svg viewBox="0 0 700 300" role="img" aria-labelledby="cap-t cap-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="cap-t">CAP: khi partition xảy ra buộc chọn CP hoặc AP</title>
<desc id="cap-d">Hai node bị đường mạng đứt, mỗi bên phải chọn từ chối để giữ consistency (CP) hoặc trả lời để giữ availability (AP)</desc>
<rect x="40" y="110" width="120" height="70" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="100" y="140" text-anchor="middle" font-size="14" fill="currentColor">Node A</text>
<text x="100" y="162" text-anchor="middle" font-size="11" fill="currentColor">x = 5</text>
<rect x="540" y="110" width="120" height="70" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="600" y="140" text-anchor="middle" font-size="14" fill="currentColor">Node B</text>
<text x="600" y="162" text-anchor="middle" font-size="11" fill="currentColor">x = 5</text>
<line x1="160" y1="145" x2="310" y2="145" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 5"/>
<line x1="390" y1="145" x2="540" y2="145" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 5"/>
<text x="350" y="120" text-anchor="middle" font-size="30" fill="#f43f5e">✂</text>
<text x="350" y="168" text-anchor="middle" font-size="12" fill="#f43f5e">PARTITION</text>
<rect x="20" y="215" width="300" height="70" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="170" y="240" text-anchor="middle" font-size="12" fill="currentColor">Chọn CP: A từ chối write mới</text>
<text x="170" y="262" text-anchor="middle" font-size="11" fill="currentColor">→ đúng tuyệt đối, nhưng KHÔNG available</text>
<rect x="380" y="215" width="300" height="70" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="530" y="240" text-anchor="middle" font-size="12" fill="currentColor">Chọn AP: A nhận write (x=9)</text>
<text x="530" y="262" text-anchor="middle" font-size="11" fill="currentColor">→ available, nhưng A và B lệch nhau</text>
<text x="350" y="40" text-anchor="middle" font-size="14" fill="currentColor">Client ghi x = 9 vào A, B không nhận được</text>
<line x1="100" y1="60" x2="100" y2="110" stroke="currentColor" stroke-width="1.5" marker-end="url(#c1)"/>
<defs><marker id="c1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.4 CP và AP trong thực tế nghĩa là gì

- **CP (Consistency + Partition tolerance):** khi partition, node ở **phía thiểu số** (không đạt quorum) sẽ **từ chối phục vụ** (trả lỗi hoặc block) để không bao giờ trả về dữ liệu cũ/mâu thuẫn. Ưu tiên **đúng hơn là luôn trả lời**. Ví dụ: hệ dựa trên consensus (ZooKeeper, etcd), HBase, MongoDB (mặc định, primary-based).
- **AP (Availability + Partition tolerance):** khi partition, **mọi node vẫn nhận read/write** từ dữ liệu cục bộ, chấp nhận các bản sao **tạm thời lệch nhau (divergence)** và **hoà giải sau** (khi mạng lành lại) bằng cơ chế như *last-write-wins*, *vector clock*, hoặc *CRDT*. Ưu tiên **luôn trả lời hơn là luôn đúng**. Ví dụ: Dynamo, Cassandra, Riak.

**Không có bên nào "tốt hơn" tuyệt đối** — nó phụ thuộc bài toán. Giỏ hàng thương mại điện tử thà available (khách luôn thêm được hàng, hoà giải sau) → AP. Chuyển tiền, khoá phân tán, bầu leader thà đúng → CP.

---

## 3. PACELC — vá chỗ CAP im lặng

### 3.1 Vì sao CAP chưa đủ

CAP chỉ nói về hành vi **khi đang có partition**. Nhưng partition là chuyện **hiếm** (mạng trong một data center rớt cỡ vài lần/năm). Câu hỏi đắt giá hơn hằng ngày là: **khi mạng vẫn LÀNH thì hệ đánh đổi gì?** CAP hoàn toàn im lặng về chuyện này — và đó lại là 99.9% thời gian vận hành.

Daniel Abadi (2012) chỉ ra: ngay cả khi **không** có partition, một hệ có replication vẫn phải chọn giữa **độ trễ thấp (Latency)** và **nhất quán mạnh (Consistency)**. Vì để một write được nhất quán mạnh, bạn phải chờ nó **ghi/xác nhận trên đủ replica** (ví dụ chờ quorum, chờ replica đồng bộ) — chờ = tăng latency. Muốn latency thấp thì trả lời ngay sau khi ghi 1 bản → chấp nhận replica khác đọc ra dữ liệu cũ (stale).

### 3.2 Phát biểu PACELC

> **PACELC:** *If there is a **P**artition, choose between **A**vailability and **C**onsistency; **E**lse (khi bình thường, không partition), choose between **L**atency and **C**onsistency.*

Đọc là: "**P** → **A** hoặc **C**; **E**lse → **L** hoặc **C**". Nó ghép **hai** quyết định thành một nhãn hai vế, ví dụ **PA/EL** hay **PC/EC**.

<svg viewBox="0 0 720 320" role="img" aria-labelledby="pacelc-t pacelc-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="pacelc-t">Cây quyết định PACELC</title>
<desc id="pacelc-d">Nếu có partition chọn giữa Availability và Consistency, ngược lại khi bình thường chọn giữa Latency và Consistency</desc>
<rect x="290" y="20" width="140" height="46" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="48" text-anchor="middle" font-size="14" fill="currentColor">Có partition?</text>
<line x1="330" y1="66" x2="180" y2="110" stroke="currentColor" stroke-width="1.5" marker-end="url(#p1)"/>
<line x1="390" y1="66" x2="540" y2="110" stroke="currentColor" stroke-width="1.5" marker-end="url(#p1)"/>
<text x="230" y="92" text-anchor="middle" font-size="12" fill="#f43f5e">CÓ (P)</text>
<text x="500" y="92" text-anchor="middle" font-size="12" fill="#10b981">KHÔNG (Else)</text>
<rect x="90" y="112" width="180" height="46" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="180" y="140" text-anchor="middle" font-size="13" fill="currentColor">A hay C ?</text>
<rect x="450" y="112" width="180" height="46" rx="10" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="540" y="140" text-anchor="middle" font-size="13" fill="currentColor">L hay C ?</text>
<line x1="140" y1="158" x2="110" y2="210" stroke="currentColor" stroke-width="1.5" marker-end="url(#p1)"/>
<line x1="220" y1="158" x2="250" y2="210" stroke="currentColor" stroke-width="1.5" marker-end="url(#p1)"/>
<line x1="500" y1="158" x2="470" y2="210" stroke="currentColor" stroke-width="1.5" marker-end="url(#p1)"/>
<line x1="580" y1="158" x2="610" y2="210" stroke="currentColor" stroke-width="1.5" marker-end="url(#p1)"/>
<rect x="55" y="212" width="110" height="42" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="110" y="238" text-anchor="middle" font-size="12" fill="currentColor">PA</text>
<rect x="200" y="212" width="110" height="42" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="255" y="238" text-anchor="middle" font-size="12" fill="currentColor">PC</text>
<rect x="415" y="212" width="110" height="42" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="470" y="238" text-anchor="middle" font-size="12" fill="currentColor">EL</text>
<rect x="560" y="212" width="110" height="42" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="615" y="238" text-anchor="middle" font-size="12" fill="currentColor">EC</text>
<text x="360" y="290" text-anchor="middle" font-size="12" fill="currentColor">Nhãn đầy đủ ghép 2 vế: ví dụ PA/EL (Dynamo) hoặc PC/EC (Spanner)</text>
<defs><marker id="p1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 3.3 Bốn tổ hợp và ý nghĩa

| Nhãn | Khi partition | Khi bình thường | Tính cách hệ thống |
|------|---------------|-----------------|--------------------|
| **PA/EL** | Ưu tiên available | Ưu tiên latency thấp | "Luôn nhanh, luôn trả lời; nhất quán yếu (eventual)". |
| **PC/EC** | Ưu tiên consistency | Ưu tiên consistency | "Luôn đúng bằng mọi giá, chịu chậm hơn". |
| **PA/EC** | Available khi đứt | Consistency khi bình thường | Nhất quán mạnh lúc thường, nhưng nới ra để sống sót khi partition. |
| **PC/EL** | Consistency khi đứt | Latency khi bình thường | Hiếm/kỳ lạ; ít hệ thật rơi vào đây. |

Điểm hay của PACELC: nó phơi bày rằng **"eventually consistent" không chỉ là hệ quả của partition** — Dynamo chọn latency thấp (EL) **ngay cả khi mạng hoàn toàn khoẻ**, đó là một quyết định thiết kế chủ động chứ không phải "bị ép do CAP".

---

## 4. Phân loại các hệ thật

| Hệ thống | Mô hình | Nhãn PACELC | Vì sao |
|----------|---------|-------------|--------|
| **Amazon Dynamo / Cassandra / Riak** | Leaderless, quorum tuỳ chỉnh | **PA/EL** | Khi partition vẫn nhận read/write (AP); khi bình thường trả lời ngay sau W replica, không chờ đồng bộ đủ → latency thấp, đọc có thể stale. |
| **HBase / BigTable** | Region/tablet có **một** server phục vụ mỗi range | **PC/EC** | Mỗi key chỉ do một RegionServer master phục vụ; partition tách nó khỏi cluster → range đó **không phục vụ** (mất A) để không double-serve; bình thường mọi read/write qua đúng một bản → nhất quán mạnh. |
| **Google Spanner** | Multi-Paxos + **TrueTime** | **PC/EC** | Commit phải đạt Paxos quorum và chờ "commit-wait" theo TrueTime → luôn linearizable (thực chất external consistency). Đổi lại latency ghi cao hơn (chờ quorum + uncertainty window). |
| **MongoDB** (mặc định) | Single-primary replica set | **PC/EC** | Write qua primary; nếu primary bị partition khỏi majority nó **tự hạ cấp** (step down) → phía thiểu số ngừng nhận write (mất A, giữ C). |
| **ZooKeeper / etcd** | ZAB / Raft consensus | **PC/EC** | Cần majority quorum để tiến; phía thiểu số từ chối write → CP điển hình, làm nền cho khoá phân tán và bầu leader. |
| **DynamoDB** (AWS, mặc định) | Managed, eventually consistent read mặc định | **PA/EL** (đọc mạnh là tuỳ chọn) | Mặc định eventually-consistent read cho latency thấp; có `ConsistentRead=true` để đổi sang đọc mạnh (trả thêm latency) — minh hoạ EL↔EC là **cấu hình được**. |

> **Lưu ý quan trọng:** nhiều hệ **không cứng nhắc một nhãn**. Cassandra cho chọn `consistency level` mỗi query (ONE → EL, QUORUM → nghiêng EC). Spanner có read-only "stale read" để giảm latency. Nhãn PACELC mô tả **mặc định/tính cách chủ đạo**, còn thực tế bạn thường **điều chỉnh được trên từng thao tác**.

### 4.1 Ví dụ số học: quorum và đánh đổi EL/EC trong Cassandra

Với N replica, đọc-quorum R và ghi-quorum W: nếu **R + W > N** thì read chắc chắn "chạm" ít nhất một replica có bản mới nhất → đọc nhất quán mạnh hơn (nghiêng EC), nhưng phải chờ nhiều node → **latency cao hơn**.

```sql
-- Cassandra: chọn consistency level per-query, đây chính là EL ↔ EC dạng cấu hình
-- N (replication factor) = 3

-- Nghiêng EL: nhanh, chỉ chờ 1 replica, chấp nhận đọc cũ
CONSISTENCY ONE;
SELECT balance FROM accounts WHERE id = 42;   -- W=1, R=1 → R+W=2 ≤ 3: có thể stale

-- Nghiêng EC: chờ đa số, đọc-của-mình luôn thấy write mới nhất
CONSISTENCY QUORUM;                            -- quorum = floor(3/2)+1 = 2
INSERT INTO accounts (id, balance) VALUES (42, 900000);  -- W=2
SELECT balance FROM accounts WHERE id = 42;    -- R=2 → R+W=4 > 3: đọc nhất quán, chậm hơn
```

Cùng một cluster, cùng dữ liệu — bạn **trượt núm giữa Latency và Consistency ngay trong từng câu lệnh**. Đó là PACELC hiển hiện ở tầng vận hành.

### 4.2 Bản đồ hai chiều

<svg viewBox="0 0 640 360" role="img" aria-labelledby="map-t map-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="map-t">Bản đồ hai chiều PA/PC và EL/EC của các hệ thật</title>
<desc id="map-d">Trục ngang khi bình thường Latency đến Consistency, trục dọc khi partition Availability đến Consistency, định vị Dynamo Cassandra HBase Spanner</desc>
<line x1="70" y1="300" x2="600" y2="300" stroke="currentColor" stroke-width="1.5" marker-end="url(#m1)"/>
<line x1="70" y1="300" x2="70" y2="40" stroke="currentColor" stroke-width="1.5" marker-end="url(#m1)"/>
<text x="335" y="335" text-anchor="middle" font-size="12" fill="currentColor">Else (bình thường):  EL  ————→  EC</text>
<text x="30" y="170" text-anchor="middle" font-size="12" fill="currentColor" transform="rotate(-90 30 170)">Partition:  PA  ————→  PC</text>
<rect x="95" y="215" width="150" height="60" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="170" y="240" text-anchor="middle" font-size="12" fill="currentColor">Dynamo / Cassandra</text>
<text x="170" y="260" text-anchor="middle" font-size="11" fill="currentColor">PA / EL</text>
<rect x="410" y="70" width="150" height="60" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="485" y="95" text-anchor="middle" font-size="12" fill="currentColor">HBase / BigTable</text>
<text x="485" y="115" text-anchor="middle" font-size="11" fill="currentColor">PC / EC</text>
<rect x="410" y="150" width="150" height="60" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="485" y="175" text-anchor="middle" font-size="12" fill="currentColor">Spanner</text>
<text x="485" y="195" text-anchor="middle" font-size="11" fill="currentColor">PC / EC</text>
<rect x="240" y="80" width="150" height="60" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="315" y="105" text-anchor="middle" font-size="12" fill="currentColor">MongoDB / etcd</text>
<text x="315" y="125" text-anchor="middle" font-size="11" fill="currentColor">PC / EC</text>
<defs><marker id="m1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

---

## 5. Những hiểu lầm phải tránh

| Hiểu lầm phổ biến | Thực tế đúng |
|-------------------|--------------|
| "Chọn 2 trong 3 (CA, CP, AP)". | Sai. P bắt buộc chịu; chỉ chọn C hay A **khi có partition**. "CA" = single-node, không phải hệ phân tán. |
| C trong CAP giống C trong ACID. | Không. CAP-C là **linearizability** (thuộc tính về thứ tự/độ mới của read-write); ACID-C là **ràng buộc toàn vẹn** của giao dịch. Hai thứ khác nhau. |
| A trong CAP = "uptime cao". | Không. CAP-A là định nghĩa toán học: **mọi request tới node sống đều được trả lời**. Một hệ CP vẫn có thể có uptime 99.99% trong vận hành thật. |
| "Hệ tôi eventually consistent vì CAP ép". | Không hẳn. Theo PACELC, đó thường là chọn **EL** (latency) khi **không** partition — quyết định chủ động, không phải hệ quả của partition. |
| Partition hiếm nên bỏ qua CAP. | Partition hiếm nhưng **chắc chắn xảy ra**; đúng lúc đó hệ phải cư xử đã-định-trước, nếu không sẽ mất dữ liệu hoặc split-brain. |

---

## 6. Tóm tắt
- **CAP (chuẩn):** khi có **network partition**, không thể vừa **linearizable (C)** vừa **available (A)** — phải hy sinh một. Bỏ ngay cách hiểu "2 trong 3".
- **P không phải lựa chọn:** hễ có mạng thật thì partition **bắt buộc phải chịu**; lựa chọn thật sự chỉ là **CP** (từ chối để giữ đúng) hay **AP** (trả lời để luôn sống, hoà giải sau).
- **PACELC** vá chỗ CAP im: **E**lse — khi **không** partition — vẫn phải chọn **Latency** hay **Consistency**, vì nhất quán mạnh đòi chờ đủ replica.
- **Phân loại thật:** Dynamo/Cassandra = **PA/EL** (luôn nhanh, eventual); HBase, Spanner, MongoDB, etcd = **PC/EC** (đúng bằng mọi giá, chịu chậm). Nhiều hệ cho **cấu hình per-request** (Cassandra consistency level, DynamoDB `ConsistentRead`).
- Câu hỏi vàng khi thiết kế: *"Khi partition, tôi thà từ chối hay thà trả lời? Khi bình thường, tôi thà nhanh hay thà luôn mới nhất?"* — trả lời được là bạn đã chọn xong nhãn PACELC.

> **Bài tiếp theo (Bài 5):** đi sâu vào **consistency models** — từ linearizability, sequential, causal tới eventual — để định lượng chính xác cái "C" mà bài này mới chỉ gọi tên.
