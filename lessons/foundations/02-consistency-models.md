# Foundations 02 — Consistency Models

> Mục tiêu: Hiểu các "mức độ đúng" của dữ liệu trong hệ phân tán — từ **strong** xuống **eventual** — và biết từng AWS service rơi vào mức nào, để khi đi thi SAA bạn không phải đoán.

Tiền đề: bạn đã đọc [[01-cap-theorem]] và hiểu tại sao phải đánh đổi C vs A khi có partition, và L vs C ngay cả khi mạng bình thường (PACELC). Bài này zoom vào câu hỏi: **"đánh đổi C nghĩa là cụ thể như thế nào?"**

---

## 1. Câu chuyện mở đầu — Vợ chồng và cuốn sổ chi tiêu

Hai vợ chồng dùng chung một app ghi chi tiêu, app đồng bộ qua cloud. Vợ vừa nhập "mua rau 50k" trên iPhone.

- **Strong consistency**: Chồng mở app sau 0.1 giây, **chắc chắn thấy** "mua rau 50k". App phải chờ cloud xác nhận trước khi hiển thị bất cứ thứ gì.
- **Read-your-writes**: Vợ refresh app, **chắc chắn thấy** giao dịch mình vừa nhập. Nhưng chồng có thể chưa thấy ngay.
- **Monotonic reads**: Chồng mở app thấy "50k". 5 phút sau mở lại — chắc chắn **không bị mất** giao dịch đó (không "lùi" về trạng thái cũ).
- **Causal consistency**: Vợ nhập "mua rau 50k", rồi comment "rau hôm nay đắt". Bất kỳ ai thấy comment → cũng phải thấy giao dịch (nguyên nhân trước, kết quả sau).
- **Eventual consistency**: Chồng có thể không thấy ngay, nhưng "cuối cùng" (vài giây — vài phút) sẽ thấy.

Từ trên xuống dưới: **độ chính xác giảm dần, latency và availability tăng dần**. Không có "tốt nhất" — chỉ có "phù hợp use case".

---

## 2. Bảng các models theo độ chặt chẽ

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

**Bài tiếp theo**: [[03-replication-and-quorum]] — leader/follower, Paxos/Raft cơ bản, vì sao Aurora dùng quorum 4/6.
