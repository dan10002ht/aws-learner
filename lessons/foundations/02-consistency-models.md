# Foundations 02 — Consistency Models

> Mục tiêu: Hiểu các "mức độ đúng" của dữ liệu trong hệ phân tán — từ **strong** xuống **eventual** — và biết từng AWS service rơi vào mức nào, để khi đi thi SAA bạn không phải đoán.

Tiền đề: bạn đã đọc [[foundations-01-cap-theorem]] và hiểu tại sao phải đánh đổi C vs A khi có partition, và L vs C ngay cả khi mạng bình thường (PACELC). Bài này zoom vào câu hỏi: **"đánh đổi C nghĩa là cụ thể như thế nào?"**

---

## 1. Câu chuyện mở đầu — Vợ chồng và cuốn sổ chi tiêu

Hai vợ chồng dùng chung một app ghi chi tiêu, app đồng bộ qua cloud. Vợ vừa nhập "mua rau 50k" trên iPhone.

- **Strong consistency**: Chồng mở app sau 0.1 giây, **chắc chắn thấy** "mua rau 50k". App phải chờ cloud xác nhận trước khi hiển thị bất cứ thứ gì.
- **Read-your-writes**: Vợ refresh app, **chắc chắn thấy** giao dịch mình vừa nhập. Nhưng chồng có thể chưa thấy ngay.
- **Monotonic reads**: Chồng mở app thấy "50k". 5 phút sau mở lại — chắc chắn **không bị mất** giao dịch đó (không "lùi" về trạng thái cũ).
- **Causal consistency**: Vợ nhập "mua rau 50k", rồi comment "rau hôm nay đắt". Bất kỳ ai thấy comment → cũng phải thấy giao dịch (nguyên nhân trước, kết quả sau).
- **Eventual consistency**: Chồng có thể không thấy ngay, nhưng "cuối cùng" (vài giây — vài phút) sẽ thấy.

Từ trên xuống dưới: **độ chính xác giảm dần, latency và availability tăng dần**. Không có "tốt nhất" — chỉ có "phù hợp use case".

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 240" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Timeline strong vs eventual consistency — vợ ghi, chồng đọc sau 0.1 giây</title>
  <desc>Lúc t0 vợ ghi "mua rau 50k". Với strong consistency chồng đọc lúc t0+0.1s thấy ngay 50k; với eventual consistency chồng thấy giá trị cũ rồi vài giây sau replica mới hội tụ về 50k.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Vợ ghi "mua rau 50k" lúc t0 — chồng đọc lúc t0+0.1s</text>
  <line x1="120" y1="44" x2="120" y2="220" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
  <text x="120" y="40" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">t0 (ghi)</text>
  <line x1="300" y1="44" x2="300" y2="220" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
  <text x="300" y="40" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">t0+0.1s (đọc)</text>
  <rect x="16" y="56" width="688" height="64" rx="9" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="28" y="80" font-size="12.5" font-weight="700" fill="currentColor">Strong</text>
  <rect x="100" y="68" width="40" height="22" rx="6" fill="#10b981" fill-opacity="0.9"/>
  <text x="120" y="83" font-size="11" text-anchor="middle" fill="#fff">50k</text>
  <line x1="140" y1="100" x2="296" y2="100" stroke="currentColor" stroke-opacity="0.5"/>
  <rect x="280" y="68" width="40" height="22" rx="6" fill="#10b981" fill-opacity="0.9"/>
  <text x="300" y="83" font-size="11" text-anchor="middle" fill="#fff">50k</text>
  <text x="332" y="83" font-size="11" fill="currentColor" opacity="0.8">chồng thấy ngay 50k ✓</text>
  <rect x="16" y="132" width="688" height="92" rx="9" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="28" y="156" font-size="12.5" font-weight="700" fill="currentColor">Eventual</text>
  <rect x="100" y="144" width="40" height="22" rx="6" fill="#10b981" fill-opacity="0.9"/>
  <text x="120" y="159" font-size="11" text-anchor="middle" fill="#fff">50k</text>
  <rect x="280" y="144" width="48" height="22" rx="6" fill="#f59e0b" fill-opacity="0.9"/>
  <text x="304" y="159" font-size="11" text-anchor="middle" fill="#fff">cũ</text>
  <text x="340" y="159" font-size="11" fill="currentColor" opacity="0.8">chồng thấy giá trị cũ ✗</text>
  <line x1="140" y1="176" x2="520" y2="176" stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="3 3"/>
  <rect x="500" y="186" width="40" height="22" rx="6" fill="#10b981" fill-opacity="0.9"/>
  <text x="520" y="201" font-size="11" text-anchor="middle" fill="#fff">50k</text>
  <text x="552" y="201" font-size="11" fill="currentColor" opacity="0.8">vài giây sau mới hội tụ</text>
</svg>

---

## 2. Bảng các models theo độ chặt chẽ

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 280" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Quang phổ consistency từ Linearizable (mạnh nhất) tới Eventual (yếu nhất)</title>
  <desc>Sáu mức consistency xếp từ chặt nhất xuống lỏng nhất: Linearizable, Sequential, Causal, Read-your-writes, Monotonic reads, Eventual. Đi xuống dưới thì độ chính xác giảm còn latency và availability tăng.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Quang phổ consistency</text>
  <g>
    <rect x="80" y="40" width="544" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="96" y="62" font-size="12.5" font-weight="700" fill="currentColor">Linearizable</text>
    <text x="616" y="62" font-size="11" text-anchor="end" fill="currentColor" opacity="0.65">mạnh nhất · real-time order</text>
  </g>
  <g>
    <rect x="80" y="80" width="544" height="34" rx="8" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="96" y="102" font-size="12.5" font-weight="700" fill="currentColor">Sequential</text>
    <text x="616" y="102" font-size="11" text-anchor="end" fill="currentColor" opacity="0.65">cùng thứ tự mọi node</text>
  </g>
  <g>
    <rect x="80" y="120" width="544" height="34" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="96" y="142" font-size="12.5" font-weight="700" fill="currentColor">Causal</text>
    <text x="616" y="142" font-size="11" text-anchor="end" fill="currentColor" opacity="0.65">nhân trước, quả sau</text>
  </g>
  <g>
    <rect x="80" y="160" width="544" height="34" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="96" y="182" font-size="12.5" font-weight="700" fill="currentColor">Read-your-writes</text>
    <text x="616" y="182" font-size="11" text-anchor="end" fill="currentColor" opacity="0.65">đọc được write của mình</text>
  </g>
  <g>
    <rect x="80" y="200" width="544" height="34" rx="8" fill="#10b981" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="96" y="222" font-size="12.5" font-weight="700" fill="currentColor">Monotonic reads</text>
    <text x="616" y="222" font-size="11" text-anchor="end" fill="currentColor" opacity="0.65">không lùi về cũ</text>
  </g>
  <g>
    <rect x="80" y="240" width="544" height="34" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="96" y="262" font-size="12.5" font-weight="700" fill="currentColor">Eventual</text>
    <text x="616" y="262" font-size="11" text-anchor="end" fill="currentColor" opacity="0.65">yếu nhất · cuối cùng hội tụ</text>
  </g>
  <g>
    <line x1="62" y1="46" x2="62" y2="268" stroke="currentColor" stroke-opacity="0.5"/>
    <path d="M62 268 l-5 -9 h10 z" fill="currentColor"/>
    <text x="62" y="157" font-size="10.5" fill="currentColor" opacity="0.75" transform="rotate(-90 62 157)" text-anchor="middle" dominant-baseline="central">đi xuống: độ chính xác giảm · latency và availability tăng</text>
  </g>
  <g>
    <line x1="660" y1="46" x2="660" y2="268" stroke="currentColor" stroke-opacity="0.5"/>
    <path d="M660 268 l-5 -9 h10 z" fill="currentColor"/>
    <text x="660" y="157" font-size="10.5" fill="currentColor" opacity="0.75" transform="rotate(90 660 157)" text-anchor="middle" dominant-baseline="central">đi xuống: dữ liệu cũ dễ chấp nhận hơn</text>
  </g>
</svg>

| # | Model | Đảm bảo | Đánh đổi |
|---|-------|---------|----------|
| 1 | **Linearizable** (strongest) | Mọi thao tác xuất hiện như xảy ra **tức thời** tại 1 thời điểm, theo đúng real-time order | Latency cao, cần consensus (Paxos/Raft) |
| 2 | **Sequential** | Mọi node thấy thao tác **theo cùng 1 thứ tự**, nhưng không cần khớp real-time | Nhẹ hơn linearizable một chút |
| 3 | **Causal** | Nếu A xảy ra trước B (về mặt nhân-quả), mọi node phải thấy A trước B. Các thao tác không liên quan thì free order | Cần vector clock / dependency tracking |
| 4 | **Read-your-writes** | Một client luôn đọc được write của chính mình | Client khác có thể chưa thấy |
| 5 | **Monotonic reads** | Đọc lần sau ≥ đọc lần trước (không lùi) | Cần sticky session hoặc track version |
| 6 | **Eventual** (weakest) | Nếu ngừng write, sau "một lúc" mọi replica sẽ hội tụ | Không cam kết gì trong khoảng thời gian đó |

**Lưu ý**: 4, 5, 6 không loại trừ nhau — eventual + read-your-writes + monotonic reads gộp lại gọi là **session consistency**, là mức "vừa đủ dùng" cho phần lớn ứng dụng web.

---

## 3. Map vào AWS

### 3.1 DynamoDB

| Loại read | Model | RCU cost | Khi dùng |
|-----------|-------|----------|----------|
| **Eventually consistent read** (default) | Eventual | 0.5 RCU | Feed, listing, analytics — chấp nhận trễ vài ms |
| **Strongly consistent read** | Linearizable trong region | 1 RCU (gấp đôi) | Đọc số dư, kiểm tra tồn kho |
| **Transactional read** (`TransactGetItems`) | Snapshot isolation | 2 RCU | Đọc nhiều item cùng "ảnh chụp" nhất quán |
| **Global Tables** cross-region | Eventual + LWW (last-writer-wins) | — | Multi-region active-active |

> 💡 Tại sao strongly consistent read **không khả dụng** cho GSI (Global Secondary Index)? Vì GSI được cập nhật bất đồng bộ từ base table — không có cách nào linearize. Đây là bẫy thi quen thuộc.

### 3.2 S3

- **Read-after-write** cho PUT mới: strong consistency (sau Dec 2020).
- **Read-after-overwrite (PUT cùng key)**: strong consistency.
- **Read-after-delete**: strong consistency.
- **Cross-region replication (CRR)**: eventual.
- **List operations**: strong consistency cho objects trong cùng bucket trong cùng region.

Trước 2020, S3 chỉ strong cho PUT mới, eventual cho overwrite/delete — nhiều câu hỏi thi cũ vẫn dựa trên model cũ → **luôn check năm xuất bản đề**.

### 3.3 RDS

- **Primary**: linearizable cho mọi read/write trên cùng node.
- **Read Replica**: **eventual** — replication lag thường vài ms tới vài giây, có thể tới phút nếu primary write heavy.
- **Multi-AZ standby**: **không phục vụ read**. Chỉ đứng chờ failover. Sync replication → khi failover xong, không mất data đã commit.
- **Aurora Reader endpoint**: eventual, lag thường < 100ms vì shared storage.

> 🪤 Bẫy thi: "Tôi cần scale read mà vẫn strong consistency" → **không có** lời giải trong RDS. Đáp án thường là (a) chấp nhận eventual với Read Replica, hoặc (b) chuyển sang DynamoDB strongly consistent read, hoặc (c) ElastiCache để giảm tải primary.

### 3.4 ElastiCache

- **Redis (cluster mode)** với replication: async → eventual. Replica có thể trả dữ liệu cũ.
- **MemoryDB for Redis**: sync Multi-AZ transaction log → strong consistency, **durable**. Đây là điểm khác biệt chính so với ElastiCache Redis.

### 3.5 Route 53

- DNS bản chất là eventual: propagation qua resolver chain tốn TTL.
- Health check + failover: **không phải** strong consistency, dựa vào polling.

### 3.6 Cognito / IAM

- IAM policy changes: eventual (thường < 1 phút, nhưng spec nói "có thể vài phút"). Không assume policy mới có hiệu lực ngay.
- Cognito user pool writes: eventual cross-region nếu enable multi-region.

---

## 4. Session consistency — pattern thực tế nhất

Phần lớn web app cần:
1. User của mình **luôn thấy** thay đổi của mình (read-your-writes).
2. Không bao giờ "lùi" thời gian (monotonic reads).
3. Người khác eventually thấy — vài trăm ms là OK.

**Cách implement trên AWS:**

| Tier | Kỹ thuật |
|------|----------|
| RDS Read Replica | Sticky session theo user → cùng 1 user luôn đọc cùng replica. Hoặc đọc primary cho user vừa write trong N giây. |
| DynamoDB | Sau khi write, dùng strongly consistent read trong session đó. |
| S3 | Lưu version ID sau PUT, GET với version ID đó để đảm bảo đọc đúng version (workaround). |
| Caching | Cache-aside với TTL ngắn, invalidate ngay sau write. |

---

## 5. Conflict resolution — khi eventual gặp ghi đồng thời

Eventual không miễn phí — bạn phải xử lý conflict khi 2 region cùng ghi 1 key:

| Chiến lược | AWS service dùng | Trade-off |
|------------|------------------|-----------|
| **Last-Writer-Wins (LWW)** theo timestamp | DynamoDB Global Tables | Đơn giản; có thể mất write nếu clock lệch |
| **Vector clock / version vector** | (Cassandra, Riak — không có service AWS thuần) | Chính xác hơn nhưng phức tạp |
| **CRDT** (Conflict-free Replicated Data Type) | Một số DynamoDB pattern (counter dùng `ADD`) | Auto-merge nhưng giới hạn data type |
| **Application-level reconciliation** | Bạn tự viết logic merge | Linh hoạt nhất, tốn công |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 280" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Last-Writer-Wins làm mất write âm thầm khi 2 region cùng ghi 1 key</title>
  <desc>Region us-east ghi giá trị A lúc timestamp 100, region eu-west ghi giá trị B lúc timestamp 101. Khi hai bản replicate gặp nhau, LWW giữ bản timestamp lớn hơn (B) và bỏ A — write của us-east biến mất không cảnh báo (lost update).</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Last-Writer-Wins theo timestamp — một write biến mất âm thầm</text>
  <rect x="16" y="44" width="300" height="74" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="32" y="68" font-size="12.5" font-weight="700" fill="currentColor">Region us-east</text>
  <text x="32" y="88" font-size="11.5" fill="currentColor">PUT key = A</text>
  <rect x="200" y="74" width="100" height="24" rx="6" fill="#3b82f6" fill-opacity="0.9"/>
  <text x="250" y="90" font-size="11" text-anchor="middle" fill="#fff">ts = 100</text>
  <rect x="404" y="44" width="300" height="74" rx="9" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="420" y="68" font-size="12.5" font-weight="700" fill="currentColor">Region eu-west</text>
  <text x="420" y="88" font-size="11.5" fill="currentColor">PUT key = B</text>
  <rect x="588" y="74" width="100" height="24" rx="6" fill="#f59e0b" fill-opacity="0.9"/>
  <text x="638" y="90" font-size="11" text-anchor="middle" fill="#fff">ts = 101</text>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <path d="M166 118 L320 168"/>
    <path d="M554 118 L400 168"/>
  </g>
  <path d="M320 168 l-11 -1 l5 -9 z" fill="currentColor" fill-opacity="0.6"/>
  <path d="M400 168 l11 -1 l-5 -9 z" fill="currentColor" fill-opacity="0.6"/>
  <text x="360" y="142" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">replicate gặp nhau</text>
  <rect x="210" y="170" width="300" height="52" rx="9" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="360" y="192" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">LWW: giữ ts lớn hơn → B (ts 101)</text>
  <text x="360" y="210" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">so sánh 100 vs 101</text>
  <rect x="210" y="236" width="300" height="32" rx="8" fill="#f59e0b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="257" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">A (ts 100) biến mất — lost update ✗</text>
</svg>

> Câu chuyện cảnh báo: **DynamoDB Global Tables LWW** — nếu 2 region cùng update item trong vòng vài chục ms, một bên sẽ **biến mất không cảnh báo**. Nếu logic của bạn cần "không bao giờ mất update" (ví dụ counter, balance) → **không dùng LWW**, hoặc dùng atomic counter (`ADD`) thay vì `PUT`.

---

## 6. Ví dụ chọn model cho 4 use case

### 6.1 E-commerce checkout — kiểm tra tồn kho
- **Cần**: linearizable. Không được oversell.
- **Chọn**: DynamoDB strongly consistent read + `ConditionExpression` (optimistic locking), HOẶC Aurora với `SELECT ... FOR UPDATE`.

### 6.2 Like count trên post
- **Cần**: eventual ổn. Lệch vài giây không ai chết.
- **Chọn**: DynamoDB atomic counter (`UpdateItem ADD`) + DAX cache. Global Tables OK vì `ADD` là CRDT-style.

### 6.3 Profile editor (user sửa info của mình)
- **Cần**: read-your-writes. User sửa avatar xong, refresh phải thấy avatar mới.
- **Chọn**: Sau write, set cookie `last_write_ts`. Nếu request đọc trong vòng N giây, route tới primary thay vì read replica. Hoặc dùng strongly consistent read trong DynamoDB.

### 6.4 Audit log
- **Cần**: monotonic, không mất event.
- **Chọn**: Kinesis / Kafka (ordered append-only) → S3 + Athena. Không bao giờ overwrite.

---

## 7. Cạm bẫy đề thi (SAA)

1. **"DynamoDB GSI strongly consistent"** → **Sai**, GSI luôn eventual.
2. **"Multi-AZ standby scale read"** → **Sai**, standby không serve traffic.
3. **"S3 eventual consistency for overwrite"** → Đáp án này từng đúng (trước Dec 2020) nhưng giờ sai. Đọc kỹ năm câu hỏi.
4. **"Aurora Reader Endpoint cho strong read"** → **Sai**, eventual (lag thấp nhưng có).
5. **"Global Tables strong consistency cross-region"** → **Không có**. Global Tables chỉ eventual.
6. **"IAM policy change có hiệu lực ngay"** → **Eventual**. Đôi khi cần retry.

---

## 8. Tóm tắt 1 dòng

> **Consistency** là một dải, không phải bật/tắt. Mỗi mức trên dải đánh đổi với **latency** và **availability**. Khi đi thi SAA, đừng chọn "strong" mặc định — hỏi: "use case này có thực sự cần linearizable không?"

---

## 9. Bài tập tự kiểm tra

1. Bạn build hệ thống bán vé concert (chống oversell). User check số ghế còn → đặt → confirm. Nên dùng consistency model nào ở mỗi bước?
2. DynamoDB tính 1 RCU cho strongly consistent read 4KB, 0.5 RCU cho eventually. Vì sao khác biệt đúng bằng 2x?
3. Bạn dùng RDS với 3 Read Replica. User báo "tôi vừa update profile mà refresh không thấy". Giải thích nguyên nhân và 2 cách fix.
4. Aurora Multi-Master (đã deprecated) cho phép write từ nhiều node. Vì sao AWS bỏ đi, và Global Database (single-writer) lại được giữ?
5. So sánh **MemoryDB** vs **ElastiCache Redis** ở góc độ consistency. Use case nào bắt buộc MemoryDB?

---

## 10. Đọc thêm

- *Designing Data-Intensive Applications* — Kleppmann, chương 5 (Replication) & 9 (Consistency and Consensus).
- Werner Vogels — *Eventually Consistent* (2008, ACM Queue) — kinh điển về tại sao Amazon chọn eventual.
- Jepsen analyses — đặc biệt bài về DynamoDB, MongoDB, Redis.
- AWS Builder's Library — *Caching challenges and strategies*.

---

**Bài tiếp theo**: [[foundations-03-replication-and-quorum]] — leader/follower, Paxos/Raft cơ bản, vì sao Aurora dùng quorum 4/6.
