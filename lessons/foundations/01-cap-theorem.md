# Foundations 01 — Định lý CAP (và PACELC)

> Mục tiêu: Hiểu **CAP** đủ sâu để chọn đúng database/architecture trên AWS, và biết tại sao "Multi-Region active-active" lại khó đến vậy.

---

## 1. Câu chuyện mở đầu — Hai chi nhánh ngân hàng mất liên lạc

Hãy tưởng tượng một ngân hàng có **2 chi nhánh** ở Hà Nội (HN) và TP.HCM (SG). Mỗi chi nhánh có 1 cuốn sổ ghi số dư tài khoản của bạn. Hai sổ phải **giống nhau** (consistent) và được đồng bộ qua đường truyền internet.

Một buổi sáng, **đường truyền giữa HN ↔ SG đứt** (network partition). Bạn cầm thẻ đến HN rút 10 triệu. Chi nhánh HN đứng trước 2 lựa chọn:

- **(A)** Cho rút ngay, ghi vào sổ HN. Sổ SG sẽ lệch cho đến khi đường truyền nối lại. → **Available** nhưng **không Consistent**.
- **(C)** Từ chối phục vụ cho đến khi liên lạc được với SG để xác nhận số dư mới nhất. → **Consistent** nhưng **không Available**.

**Bạn không có lựa chọn thứ ba**. Đó chính là CAP.

<ab-toggle data-labels="Chọn A|Chọn C">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 290" role="img" aria-labelledby="fd01-cap-0-t fd01-cap-0-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="fd01-cap-0-t">Hai sổ khi partition: Cho rút ngay</title>
<desc id="fd01-cap-0-d">Hai sổ khi partition: Cho rút ngay</desc>
<text x="260" y="25" font-size="14" text-anchor="middle" fill="currentColor">Rút 10tr tại HN • đường truyền bị đứt</text>
<rect x="25" y="55" width="190" height="175" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6" />
<rect x="305" y="55" width="190" height="175" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6" />
<text x="120" y="82" font-size="14" text-anchor="middle" fill="currentColor">Chi nhánh HN</text>
<text x="400" y="82" font-size="14" text-anchor="middle" fill="currentColor">Chi nhánh SG</text>
<line x1="215" y1="110" x2="245" y2="110" stroke="currentColor" stroke-width="2" stroke-dasharray="5 4"/>
<line x1="275" y1="110" x2="305" y2="110" stroke="currentColor" stroke-width="2" stroke-dasharray="5 4"/>
<line x1="250" y1="100" x2="270" y2="120" stroke="#f43f5e" stroke-width="2" />
<line x1="270" y1="100" x2="250" y2="120" stroke="#f43f5e" stroke-width="2" />
<text x="260" y="145" font-size="13" text-anchor="middle" fill="currentColor">partition</text>
<text x="120" y="115" font-size="14" text-anchor="middle" fill="currentColor">Cho rút ngay</text>
<text x="120" y="153" font-size="14" text-anchor="middle" fill="currentColor">Số dư: 0tr</text>
<text x="400" y="153" font-size="14" text-anchor="middle" fill="currentColor">Số dư: 10tr</text>
<rect x="50" y="172" width="140" height="28" rx="7" fill="#10b981" fill-opacity="0" stroke="#10b981" stroke-dasharray="3 3"/>
<rect x="330" y="172" width="140" height="28" rx="7" fill="#10b981" fill-opacity="0.14" stroke="#10b981" />
<text x="120" y="192" font-size="14" text-anchor="middle" fill="currentColor">0</text>
<text x="400" y="192" font-size="14" text-anchor="middle" fill="currentColor">10tr</text>
<text x="260" y="264" font-size="14" text-anchor="middle" fill="currentColor">Available, lệch sổ</text>
</svg>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 290" role="img" aria-labelledby="fd01-cap-1-t fd01-cap-1-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="fd01-cap-1-t">Hai sổ khi partition: Từ chối rút</title>
<desc id="fd01-cap-1-d">Hai sổ khi partition: Từ chối rút</desc>
<text x="260" y="25" font-size="14" text-anchor="middle" fill="currentColor">Rút 10tr tại HN • đường truyền bị đứt</text>
<rect x="25" y="55" width="190" height="175" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6" />
<rect x="305" y="55" width="190" height="175" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6" />
<text x="120" y="82" font-size="14" text-anchor="middle" fill="currentColor">Chi nhánh HN</text>
<text x="400" y="82" font-size="14" text-anchor="middle" fill="currentColor">Chi nhánh SG</text>
<line x1="215" y1="110" x2="245" y2="110" stroke="currentColor" stroke-width="2" stroke-dasharray="5 4"/>
<line x1="275" y1="110" x2="305" y2="110" stroke="currentColor" stroke-width="2" stroke-dasharray="5 4"/>
<line x1="250" y1="100" x2="270" y2="120" stroke="#f43f5e" stroke-width="2" />
<line x1="270" y1="100" x2="250" y2="120" stroke="#f43f5e" stroke-width="2" />
<text x="260" y="145" font-size="13" text-anchor="middle" fill="currentColor">partition</text>
<text x="120" y="115" font-size="14" text-anchor="middle" fill="currentColor">Từ chối rút</text>
<text x="120" y="153" font-size="14" text-anchor="middle" fill="currentColor">Số dư: 10tr</text>
<text x="400" y="153" font-size="14" text-anchor="middle" fill="currentColor">Số dư: 10tr</text>
<rect x="50" y="172" width="140" height="28" rx="7" fill="#10b981" fill-opacity="0.14" stroke="#10b981" />
<rect x="330" y="172" width="140" height="28" rx="7" fill="#10b981" fill-opacity="0.14" stroke="#10b981" />
<text x="120" y="192" font-size="14" text-anchor="middle" fill="currentColor">10tr</text>
<text x="400" y="192" font-size="14" text-anchor="middle" fill="currentColor">10tr</text>
<text x="260" y="264" font-size="14" text-anchor="middle" fill="currentColor">Consistent, mất availability</text>
</svg>
<ab-note>HN ghi giảm số dư ngay; SG còn 10tr cho tới khi đường truyền nối lại.</ab-note>
<ab-note>HN chờ xác nhận từ SG; giữ hai sổ giống nhau bằng cách từ chối phục vụ.</ab-note>
</ab-toggle>

---

## 2. Định nghĩa chính xác

CAP nói rằng một **distributed system** chỉ có thể đảm bảo **2 trong 3** thuộc tính sau khi xảy ra sự cố mạng:

| Chữ | Nghĩa | Định nghĩa "khắt khe" |
|-----|-------|------------------------|
| **C** — Consistency | Mọi node đọc ra cùng dữ liệu mới nhất | Linearizability: sau khi write thành công, mọi read tiếp theo phải thấy giá trị đó |
| **A** — Availability | Mọi request đều nhận được response (không lỗi) | Node còn sống phải trả lời, không được "im lặng" hay từ chối |
| **P** — Partition tolerance | Hệ thống vẫn hoạt động khi mạng giữa các node bị chia cắt | Không sập toàn cục chỉ vì một link đứt |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Tam giác CAP — trong hệ phân tán P bắt buộc nên chỉ chọn được CP hoặc AP</title>
  <desc>Tam giác ba đỉnh Consistency, Availability, Partition tolerance. Vì network partition là chắc chắn xảy ra nên P bắt buộc; lựa chọn thực tế chỉ còn cạnh CP (giữ C, bỏ A) hoặc cạnh AP (giữ A, bỏ C).</desc>
  <line x1="360" y1="50" x2="120" y2="290" stroke="#3b82f6" stroke-width="6" stroke-opacity="0.55"/>
  <line x1="360" y1="50" x2="600" y2="290" stroke="#10b981" stroke-width="6" stroke-opacity="0.55"/>
  <line x1="120" y1="290" x2="600" y2="290" stroke="currentColor" stroke-width="2" stroke-dasharray="6 6" stroke-opacity="0.35"/>
  <circle cx="360" cy="50" r="30" fill="#f59e0b" fill-opacity="0.9"/>
  <text x="360" y="58" font-size="20" font-weight="700" text-anchor="middle" fill="#fff">P</text>
  <text x="360" y="108" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.8">Partition tolerance (BẮT BUỘC)</text>
  <circle cx="120" cy="290" r="30" fill="#3b82f6" fill-opacity="0.9"/>
  <text x="120" y="298" font-size="20" font-weight="700" text-anchor="middle" fill="#fff">C</text>
  <text x="120" y="338" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.8">Consistency</text>
  <circle cx="600" cy="290" r="30" fill="#10b981" fill-opacity="0.9"/>
  <text x="600" y="298" font-size="20" font-weight="700" text-anchor="middle" fill="#fff">A</text>
  <text x="600" y="338" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.8">Availability</text>
  <rect x="170" y="150" width="84" height="26" rx="13" fill="#3b82f6" fill-opacity="0.9" transform="rotate(45 212 163)"/>
  <text x="212" y="167" font-size="13" font-weight="700" text-anchor="middle" fill="#fff" transform="rotate(45 212 163)">CP</text>
  <rect x="466" y="150" width="84" height="26" rx="13" fill="#10b981" fill-opacity="0.9" transform="rotate(-45 508 163)"/>
  <text x="508" y="167" font-size="13" font-weight="700" text-anchor="middle" fill="#fff" transform="rotate(-45 508 163)">AP</text>
  <text x="360" y="220" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Lựa chọn thực tế chỉ còn hai cạnh nối với P</text>
  <text x="360" y="312" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.55">cạnh CA (không có P) — không tồn tại trong hệ phân tán</text>
</svg>

### Hiểu lầm phổ biến

> "Tôi chọn CA, không cần P".

**Sai.** Trong hệ phân tán thực tế, **network partition là điều chắc chắn sẽ xảy ra** (cable đứt, switch hỏng, AZ mất kết nối). Bạn **không được chọn bỏ P** — bạn chỉ chọn được: **khi partition xảy ra, hy sinh C hay A?**

Vậy CAP thực chất chỉ là lựa chọn giữa **CP** và **AP**.

---

## 3. Bản đồ AWS theo CAP

| Service | Loại | Lý do |
|---------|------|-------|
| **DynamoDB** (default eventually consistent reads) | **AP** | Khi partition giữa các replica, vẫn nhận read/write; consistency hội tụ sau |
| **DynamoDB** (strongly consistent reads) | Nghiêng **CP** | Cần đọc phiên bản mới nhất; khi không thể đáp ứng bảo đảm có thể fail |
| **DynamoDB Global Tables** | Theo mode | **MREC**: eventual + LWW; **MRSC**: strong read xuyên các region được hỗ trợ, đánh đổi latency/availability |
| **S3** (sau 2020) | Strong cho object read/write và LIST | Không suy nhãn CAP cho toàn service từ một API; CRR vẫn bất đồng bộ |
| **RDS Single-AZ** | Không phân tán → CAP không áp dụng trực tiếp | Một node, sập là sập |
| **RDS Multi-AZ** | **CP** | Standby chỉ phục vụ sau failover; trong lúc failover (60-120s) → unavailable |
| **Aurora** | **CP-leaning** | 6 copies / 3 AZ, write quorum 4/6, read quorum 3/6; ưu tiên consistency |
| **ElastiCache Redis Cluster** | **AP** hoặc **CP** tùy config | Async replication mặc định = AP |
| **MemoryDB** | **CP** | Synchronous Multi-AZ transaction log |
| **Kafka / MSK** | Phụ thuộc cấu hình | `acks=all` chờ ISR; `min.insync.replicas` đặt ngưỡng chấp nhận ghi, không phải majority cố định |
| **Cassandra / Keyspaces** | **AP** (tunable) | Quorum có thể chỉnh; mặc định ưu tiên availability |

### Quy tắc nhanh khi đi thi SAA

- Câu hỏi nhắc **"low latency, global, eventual ok"** → AP → **DynamoDB Global Tables**, **S3 Cross-Region Replication**.
- Câu hỏi nhắc **"financial, no data loss, strong consistency"** → CP → **Aurora Multi-AZ**, **RDS Multi-AZ**, **DynamoDB strongly consistent reads**.
- Câu hỏi nhắc **"99.999% availability across regions"** → AP, chấp nhận conflict resolution.

---

## 4. Tại sao CAP chưa đủ — PACELC

CAP chỉ nói về **khi có partition (P)**. Nhưng phần lớn thời gian mạng **bình thường**, hệ thống vẫn phải đánh đổi giữa **Latency** và **Consistency**:

> **PACELC**: nếu **P**artition → chọn **A** hay **C**; **E**lse → chọn **L**atency hay **C**onsistency.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cây quyết định PACELC với vị trí DynamoDB và Aurora</title>
  <desc>Cây quyết định PACELC: nếu có Partition thì chọn Availability hay Consistency; nếu không (Else) thì chọn Latency hay Consistency. DynamoDB nằm ở nhánh PA và EL, Aurora nằm ở nhánh PC và EC.</desc>
  <rect x="280" y="24" width="160" height="48" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="46" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Mạng hiện thế nào?</text>
  <text x="360" y="63" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">PACELC: P ? A/C : E ? L/C</text>
  <g stroke="currentColor" stroke-opacity="0.4" fill="none" stroke-width="1.5">
    <path d="M360 72 L360 92 L180 92 L180 112"/>
    <path d="M360 92 L540 92 L540 112"/>
  </g>
  <text x="250" y="86" font-size="11" font-weight="700" text-anchor="middle" fill="#ef4444">if Partition</text>
  <text x="470" y="86" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.75">Else (bình thường)</text>
  <rect x="100" y="112" width="160" height="42" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="180" y="138" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">chọn A hay C ?</text>
  <rect x="460" y="112" width="160" height="42" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="540" y="138" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">chọn L hay C ?</text>
  <g stroke="currentColor" stroke-opacity="0.4" fill="none" stroke-width="1.5">
    <path d="M180 154 L180 172 L110 172 L110 192"/>
    <path d="M180 172 L250 172 L250 192"/>
    <path d="M540 154 L540 172 L470 172 L470 192"/>
    <path d="M540 172 L610 172 L610 192"/>
  </g>
  <rect x="60" y="192" width="100" height="40" rx="20" fill="#10b981" fill-opacity="0.9"/>
  <text x="110" y="217" font-size="14" font-weight="700" text-anchor="middle" fill="#fff">PA</text>
  <rect x="200" y="192" width="100" height="40" rx="20" fill="#3b82f6" fill-opacity="0.9"/>
  <text x="250" y="217" font-size="14" font-weight="700" text-anchor="middle" fill="#fff">PC</text>
  <rect x="420" y="192" width="100" height="40" rx="20" fill="#10b981" fill-opacity="0.9"/>
  <text x="470" y="217" font-size="14" font-weight="700" text-anchor="middle" fill="#fff">EL</text>
  <rect x="560" y="192" width="100" height="40" rx="20" fill="#3b82f6" fill-opacity="0.9"/>
  <text x="610" y="217" font-size="14" font-weight="700" text-anchor="middle" fill="#fff">EC</text>
  <rect x="60" y="262" width="240" height="84" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="180" y="288" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">DynamoDB → PA / EL</text>
  <text x="180" y="310" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.8">khi partition: ưu tiên Available</text>
  <text x="180" y="328" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.8">bình thường: ưu tiên Latency thấp</text>
  <rect x="420" y="262" width="240" height="84" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="540" y="288" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Aurora → PC / EC</text>
  <text x="540" y="310" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.8">khi partition: ưu tiên Consistency</text>
  <text x="540" y="328" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.8">bình thường: vẫn ưu tiên Consistency</text>
  <g stroke="currentColor" stroke-opacity="0.3" fill="none" stroke-width="1.2" stroke-dasharray="4 4">
    <path d="M110 232 L150 262"/>
    <path d="M250 232 L480 262"/>
    <path d="M470 232 L240 262"/>
    <path d="M610 232 L580 262"/>
  </g>
</svg>

| Service | PACELC |
|---------|--------|
| DynamoDB | **PA / EL** — ưu tiên availability khi partition, ưu tiên latency khi bình thường |
| Aurora | **PC / EC** — luôn ưu tiên consistency |
| Cassandra | **PA / EL** |
| MongoDB (default) | **PA / EC** |

→ Khi bạn thấy DynamoDB trả về dữ liệu cũ vài trăm ms dù không có sự cố gì, đó là **EL** — nó đánh đổi consistency để có single-digit ms latency.

---

## 5. Liên hệ với các consistency models (sẽ học sau)

CAP/PACELC dẫn tới các "mức độ" consistency mà AWS hay nhắc:

- **Strong consistency** — đọc ra giá trị mới nhất ngay sau write. (DynamoDB strongly consistent read, S3 read-after-write, Aurora primary read)
- **Eventual consistency** — sau "một lúc", mọi replica hội tụ. (DynamoDB default, S3 cross-region, Route53)
- **Read-your-writes** — bạn luôn đọc được write của chính mình, nhưng user khác có thể chưa thấy. (DynamoDB strong read sau write; RDS đọc primary hoặc replica đã replay write)
- **Monotonic reads** — đọc lần sau không "lùi" so với lần trước.

Chi tiết sẽ ở bài [[foundations-02-consistency-models]].

---

## 6. Ví dụ thực chiến — chọn DB cho 3 use case

### 6.1 Hệ thống đặt vé máy bay (tránh oversell)
- **Cần**: không bao giờ bán quá số ghế.
- **Chọn**: **CP** — Aurora với transaction, hoặc DynamoDB với `ConditionExpression` + strongly consistent read.
- **Đánh đổi**: khi 1 AZ chết, vài chục giây không bán được. Chấp nhận.

### 6.2 Feed mạng xã hội
- **Cần**: luôn load được feed, dù dữ liệu hơi cũ.
- **Chọn**: **AP** — DynamoDB + DAX cache, hoặc Cassandra.
- **Đánh đổi**: bạn có thể thấy post bạn bè trễ 1-2 giây. Không ai chết.

### 6.3 Số dư tài khoản ngân hàng
- **Cần**: đúng tuyệt đối.
- **Chọn**: **CP** — Aurora Multi-AZ, transaction nghiêm ngặt. Không Multi-Region active-active cho bảng `accounts`.
- **Mẹo thực tế**: nhiều ngân hàng dùng kiến trúc lai — `accounts` ở CP, còn `notifications`, `audit_log` ở AP để giảm tải.

---

## 7. Cạm bẫy đề thi (SAA)

1. "Multi-Region active-active với strong consistency" — Global Tables **MRSC** hỗ trợ; **MREC** mới là eventual + LWW. Phải đọc đúng mode và các region/tính năng hỗ trợ.
2. "Aurora Global Database cho write từ region phụ" — không, **chỉ region chính write**, region phụ read-only (trừ Aurora Global Write Forwarding, nhưng latency cao). Đó là lựa chọn CP.
3. "S3 strong read-after-write" — đúng cho **PUT/GET cùng key**, nhưng **không** đảm bảo cross-region.
4. "RDS Multi-AZ có tăng read throughput không?" — **Không với Multi-AZ DB instance**: standby không phục vụ read. Multi-AZ DB cluster có hai reader. Muốn scale read → Read Replica (eventually consistent).

---

## 8. Tóm tắt 1 dòng

> Trong hệ phân tán, **partition là điều không tránh khỏi**. Bạn không chọn "có P hay không" — bạn chọn **khi P xảy ra, hy sinh Consistency hay Availability**. Và ngay cả khi mạng bình thường, bạn vẫn đánh đổi **Latency vs Consistency** mỗi ngày.

---

## 9. Bài tập tự kiểm tra

1. Một game leaderboard global, 100M user, accept dữ liệu trễ vài giây. Bạn chọn CP hay AP? Service nào trên AWS?
2. Tại sao DynamoDB strongly consistent read **tốn gấp đôi RCU** so với eventually consistent?
3. Aurora có 6 copies. Vì sao write quorum là 4/6 chứ không phải 6/6?
4. Một hệ thống claim "CA, không P" — đánh giá claim này.
5. Với Kafka `acks=all`, `min.insync.replicas=2`, RF=3, khi nào ghi bị từ chối? Vì sao ISR không phải majority cố định?

(Đáp án ở 01-cap-theorem-answers — sẽ viết sau.)

---

## 10. Đọc thêm

- Brewer (2000) — "Towards Robust Distributed Systems" (paper gốc CAP).
- Daniel Abadi (2012) — "Consistency Tradeoffs in Modern Distributed Database System Design" (PACELC).
- AWS Whitepaper — "Amazon DynamoDB: A Scalable, Predictably Performant, and Fully Managed NoSQL Database Service" (USENIX ATC 2022).
- Designing Data-Intensive Applications — Martin Kleppmann, chương 5 & 9.

---

**Bài tiếp theo**: [[foundations-02-consistency-models]] — đi sâu vào strong / eventual / causal / read-your-writes và map vào từng AWS service.
