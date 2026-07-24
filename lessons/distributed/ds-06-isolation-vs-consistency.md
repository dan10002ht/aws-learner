# Bài 6 — Isolation levels (ACID) vs distributed consistency

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân biệt rõ **hai trục hoàn toàn khác nhau** thường bị nhét chung một chữ "consistency": **isolation** (nhiều transaction đồng thời trên **một** logical store, chữ **I** trong ACID) và **consistency của replication** (nhiều **bản sao** của cùng dữ liệu trên nhiều node — linearizability, causal...).
- Đọc và chọn đúng **isolation level**: read uncommitted, read committed, snapshot/repeatable read, serializable.
- Gọi tên và nhận diện các **anomaly**: dirty read, non-repeatable read, phantom, lost update, **write skew**.
- Hiểu **strict serializability = serializable + linearizable** — đỉnh của cả hai trục, và vì sao nó đắt.

---

## 2. Lý thuyết

### 2.1 Hai trục bị nhầm — và vì sao chúng khác nhau

Chữ "consistency" bị dùng cho **hai khái niệm khác hẳn**, thuộc hai thế giới học thuật khác nhau:

- **Chữ C trong ACID** (database transactions): "consistency" chỉ nghĩa là *một transaction đưa DB từ trạng thái hợp lệ sang trạng thái hợp lệ* — tôn trọng constraint (khóa ngoại, UNIQUE, CHECK). Đây gần như là **trách nhiệm của ứng dụng**, không phải thứ ta bàn ở đây. Chữ ta quan tâm trong ACID là **I — Isolation**.
- **Chữ C trong CAP** (distributed systems): "consistency" nghĩa là **linearizability** — các bản sao trên nhiều node hiện ra như *một* bản duy nhất, mọi client thấy cùng một thứ tự.

Hai trục thật sự cần phân biệt:

| Trục | Câu hỏi nó trả lời | Kẻ thù | Thuộc về |
|------|--------------------|--------|----------|
| **Isolation** (ACID-I) | Nhiều **transaction chạy song song** trên **cùng dữ liệu** có giẫm lên nhau không? | Concurrency của các transaction | Lý thuyết CSDL (serializability theory) |
| **Consistency** (replication) | Nhiều **bản sao** của một mảnh dữ liệu trên các node có **đồng bộ** với nhau không? | Độ trễ và phân vùng mạng giữa các replica | Hệ phân tán (CAP, consistency models) |

Cốt lõi: **isolation nói về THỜI GIAN (nhiều tác vụ chồng lấn), consistency nói về KHÔNG GIAN (nhiều nơi lưu bản sao).** Một hệ single-node (một Postgres không replica) **không có** vấn đề consistency của CAP nhưng **vẫn** có đầy đủ vấn đề isolation. Ngược lại một key-value store một-thao-tác-một-key có thể cần linearizability mà chẳng có "transaction" nào để nói tới isolation.

<svg viewBox="0 0 700 260" role="img" aria-labelledby="ax-t ax-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="ax-t">Hai trục: isolation (thời gian) và consistency (không gian)</title>
<desc id="ax-d">Isolation xử lý nhiều transaction chồng lấn thời gian trên một store; consistency xử lý nhiều bản sao trên nhiều node</desc>
<rect x="20" y="20" width="320" height="220" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="180" y="45" text-anchor="middle" font-size="14" fill="currentColor">ISOLATION — trục THỜI GIAN</text>
<text x="180" y="65" text-anchor="middle" font-size="11" fill="currentColor">nhiều transaction song song / 1 store</text>
<rect x="45" y="90" width="130" height="26" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="110" y="107" text-anchor="middle" font-size="11" fill="currentColor">T1: read-modify-write</text>
<rect x="150" y="126" width="150" height="26" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="225" y="143" text-anchor="middle" font-size="11" fill="currentColor">T2: read-modify-write</text>
<text x="180" y="185" text-anchor="middle" font-size="11" fill="currentColor">chồng lấn → lost update,</text>
<text x="180" y="202" text-anchor="middle" font-size="11" fill="currentColor">write skew, phantom...</text>
<rect x="360" y="20" width="320" height="220" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="520" y="45" text-anchor="middle" font-size="14" fill="currentColor">CONSISTENCY — trục KHÔNG GIAN</text>
<text x="520" y="65" text-anchor="middle" font-size="11" fill="currentColor">nhiều bản sao / nhiều node</text>
<rect x="390" y="95" width="80" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="430" y="119" text-anchor="middle" font-size="11" fill="currentColor">replica A</text>
<rect x="490" y="95" width="80" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="530" y="119" text-anchor="middle" font-size="11" fill="currentColor">replica B</text>
<rect x="590" y="95" width="70" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="625" y="119" text-anchor="middle" font-size="11" fill="currentColor">replica C</text>
<line x1="470" y1="115" x2="490" y2="115" stroke="currentColor" stroke-width="1.5"/>
<line x1="570" y1="115" x2="590" y2="115" stroke="currentColor" stroke-width="1.5"/>
<text x="520" y="185" text-anchor="middle" font-size="11" fill="currentColor">lệch nhau → stale read,</text>
<text x="520" y="202" text-anchor="middle" font-size="11" fill="currentColor">read-your-writes vỡ...</text>
</svg>

### 2.2 Analogy đời thường

- **Isolation** giống **hai kế toán cùng sửa một cuốn sổ quỹ**. Sổ chỉ có một cuốn (một store), nhưng hai người viết cùng lúc: người A đọc số dư 100, người B cũng đọc 100, A trừ 30 ghi 70, B trừ 50 ghi 50 — mất luôn giao dịch của A. Đây là **lost update** — vấn đề của *sự đồng thời*, không liên quan gì tới việc có bao nhiêu cuốn sổ.
- **Consistency** giống **nhiều bản photo của cùng cuốn sổ đặt ở các chi nhánh**. Chi nhánh Hà Nội vừa cập nhật số dư, nhưng bản ở Sài Gòn chưa kịp đồng bộ — khách hỏi ở SG thấy số cũ. Đây là vấn đề của *nhiều bản sao*, không liên quan tới có bao nhiêu người đang ghi.

Một hệ thực tế (ví dụ CockroachDB, Spanner) phải giải **cả hai** cùng lúc — đó là lý do chúng khó và đắt.

### 2.3 Isolation level là gì

Chạy các transaction thực sự tuần tự (một lúc chỉ một cái) thì không bao giờ có anomaly — nhưng throughput thảm hại. Nên DB cho phép chạy **đồng thời** và đánh đổi độ đúng lấy tốc độ. **Isolation level** chính là **hợp đồng**: "tôi cho phép anomaly nào xảy ra, cấm anomaly nào". Level càng cao càng ít anomaly, càng nhiều lock/abort, càng chậm.

Chuẩn SQL-92 định nghĩa 4 level theo 3 anomaly. Định nghĩa này *thiếu sót* (không có snapshot isolation, không nói write skew), nhưng vẫn là ngôn ngữ chung:

| Level | Dirty read | Non-repeatable read | Phantom |
|-------|:---:|:---:|:---:|
| **Read Uncommitted** | Có thể | Có thể | Có thể |
| **Read Committed** | Cấm | Có thể | Có thể |
| **Repeatable Read** | Cấm | Cấm | Có thể (chuẩn); Postgres cấm luôn |
| **Serializable** | Cấm | Cấm | Cấm |

### 2.4 Các anomaly — hiểu bản chất

- **Dirty read** — đọc dữ liệu của một transaction **chưa commit**. Nếu transaction đó rollback, bạn đã đọc thứ *chưa từng tồn tại*. Ví dụ: đọc số dư sau khi T khác vừa cộng tiền nhưng T đó sắp bị hủy.
- **Non-repeatable read** — trong **cùng một transaction**, đọc *cùng một hàng* hai lần ra **hai giá trị khác nhau** vì transaction khác đã commit sửa đổi ở giữa. Giá trị hàng bị đổi.
- **Phantom read** — đọc một *tập hàng theo điều kiện* (`WHERE status='pending'`) hai lần, lần sau **xuất hiện/biến mất hàng** vì transaction khác `INSERT`/`DELETE` hàng khớp điều kiện. Khác non-repeatable ở chỗ: hàng cũ không đổi, mà **tập kết quả** đổi.
- **Lost update** — hai transaction cùng làm **read-modify-write** trên một hàng; cái ghi sau đè mất cập nhật của cái ghi trước (ví dụ hai kế toán ở 2.2). Đáng chú ý: SQL-92 **không liệt kê** anomaly này.
- **Write skew** — anomaly tinh vi nhất, và là **lý do snapshot isolation KHÔNG bằng serializable**. Hai transaction **đọc cùng một tập dữ liệu**, mỗi cái ghi vào **hàng khác nhau**, không đè lên nhau (nên không phải lost update), nhưng **cùng nhau vi phạm một bất biến (invariant)** mà từng cái riêng lẻ thì không.

Ví dụ kinh điển của write skew — **lịch trực bệnh viện**, invariant "luôn ≥ 1 bác sĩ on-call":

```
Trạng thái: Alice=on-call, Bob=on-call (2 người trực)
T1 (Alice): thấy Bob vẫn on-call → "còn người, mình off được" → Alice=off
T2 (Bob):   thấy Alice vẫn on-call → "còn người, mình off được" → Bob=off
```

Dưới **snapshot isolation**, cả T1 và T2 đọc *snapshot cùng thời điểm* (thấy đủ 2 người), mỗi cái ghi một hàng khác nhau (Alice vs Bob) nên **không xung đột ghi** → cả hai commit → **0 bác sĩ on-call**. Invariant bị phá dù mỗi transaction nhìn riêng đều "hợp lệ". Chỉ **serializable** mới bắt được.

### 2.5 Snapshot Isolation (SI) — cái level ai cũng dùng mà hay hiểu sai

Đa số DB hiện đại (Postgres "Repeatable Read", Oracle "Serializable" (!), MySQL InnoDB "Repeatable Read", SQL Server SNAPSHOT) mặc định hoặc thực chất chạy **Snapshot Isolation** bằng **MVCC** (Multi-Version Concurrency Control): mỗi transaction đọc từ một **snapshot đông cứng** tại thời điểm nó bắt đầu, không thấy thay đổi của transaction khác commit sau đó.

SI mạnh hơn Read Committed rất nhiều — nó **loại được** dirty read, non-repeatable read, phantom, và **lost update** (nhờ cơ chế first-committer-wins / abort khi phát hiện ghi chồng). **Nhưng SI KHÔNG chống được write skew.** Đây là điểm bẫy quan trọng nhất của bài:

> Nhiều engineer nghĩ "tôi để Repeatable Read/Snapshot là an toàn tuyệt đối". Sai. SI vẫn cho **write skew** và một biến thể **phantom liên quan predicate**. Nếu logic của bạn dựa trên *"đọc để kiểm tra một điều kiện rồi ghi dựa vào điều kiện đó"* trên hàng khác, bạn **cần serializable** hoặc phải **khóa tường minh** (`SELECT ... FOR UPDATE`).

<svg viewBox="0 0 700 300" role="img" aria-labelledby="ws-t ws-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="ws-t">Write skew dưới snapshot isolation</title>
<desc id="ws-d">Hai transaction đọc cùng snapshot đủ hai bác sĩ trực, mỗi transaction ghi một hàng khác nhau, cùng commit và phá vỡ invariant</desc>
<text x="150" y="30" text-anchor="middle" font-size="13" fill="currentColor">T1 (Alice)</text>
<text x="540" y="30" text-anchor="middle" font-size="13" fill="currentColor">T2 (Bob)</text>
<line x1="150" y1="45" x2="150" y2="270" stroke="currentColor" stroke-width="1.5"/>
<line x1="540" y1="45" x2="540" y2="270" stroke="currentColor" stroke-width="1.5"/>
<rect x="270" y="55" width="150" height="34" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="345" y="76" text-anchor="middle" font-size="11" fill="currentColor">snapshot: Alice+Bob on-call</text>
<line x1="150" y1="72" x2="270" y2="72" stroke="currentColor" stroke-width="1.2" marker-end="url(#w1)"/>
<line x1="540" y1="72" x2="420" y2="72" stroke="currentColor" stroke-width="1.2" marker-end="url(#w1)"/>
<rect x="60" y="120" width="180" height="34" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="150" y="141" text-anchor="middle" font-size="11" fill="currentColor">thấy Bob còn → set Alice=off</text>
<rect x="450" y="160" width="180" height="34" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="540" y="181" text-anchor="middle" font-size="11" fill="currentColor">thấy Alice còn → set Bob=off</text>
<rect x="60" y="215" width="120" height="30" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="235" text-anchor="middle" font-size="11" fill="currentColor">COMMIT ok</text>
<rect x="480" y="215" width="120" height="30" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="540" y="235" text-anchor="middle" font-size="11" fill="currentColor">COMMIT ok</text>
<text x="345" y="282" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">Kết quả: 0 bác sĩ on-call — invariant vỡ</text>
<defs><marker id="w1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.6 Serializable — và hai cách hiện thực

**Serializable** là hợp đồng mạnh nhất về isolation: kết quả của các transaction chạy đồng thời **tương đương với một thứ tự tuần tự nào đó** của chúng. Không dirty/non-repeatable/phantom/lost update/write skew — hết. Hai cách phổ biến để đạt:

- **2PL (Two-Phase Locking)** — pessimistic: khóa mọi thứ đọc/ghi, giữ tới khi commit. Đúng nhưng dễ deadlock và chậm khi tranh chấp cao.
- **SSI (Serializable Snapshot Isolation)** — optimistic (Postgres `SERIALIZABLE` dùng cái này): vẫn chạy trên MVCC snapshot như SI (nhanh, đọc không khóa), nhưng DB **theo dõi dependency giữa các read/write** và **abort** transaction nào tạo thành chu trình nguy hiểm (dangerous structure). Ứng dụng phải **retry** transaction bị abort (serialization failure, SQLSTATE `40001`).

### 2.7 Điểm hợp nhất hai trục: Strict Serializability

Đây là chỗ hai trục gặp nhau. Đặt cạnh nhau hai đỉnh:

- **Serializable** (trục isolation): tồn tại *một* thứ tự tuần tự tương đương — nhưng thứ tự đó **không bắt buộc trùng với thứ tự thời gian thực (real-time)**. Một transaction commit lúc 10:00 có thể bị "xếp sau" một transaction commit lúc 10:05 trong thứ tự tương đương.
- **Linearizability** (trục consistency, chữ C của CAP): mỗi thao tác **đơn lẻ** trên **một object** có hiệu lực tại một điểm thời gian giữa lúc gọi và lúc nhận kết quả — tôn trọng **real-time order**, nhưng chỉ nói về từng thao tác đơn, không nói về transaction nhiều thao tác.

> **Strict Serializability = Serializable + Linearizable.** Nghĩa là: các transaction (nhiều thao tác, nhiều object) tương đương với **một thứ tự tuần tự**, VÀ thứ tự đó **tôn trọng thời gian thực** — nếu T1 commit xong hoàn toàn *trước khi* T2 bắt đầu, thì trong thứ tự tương đương T1 phải đứng trước T2.

| Model | Nhiều thao tác/transaction? | Tôn trọng real-time order? |
|-------|:---:|:---:|
| Linearizability | Không (từng op đơn trên 1 object) | **Có** |
| Serializability | Có | **Không** |
| **Strict serializability** | **Có** | **Có** |

Google **Spanner** và **CockroachDB** nhắm tới strict serializability. Nó đắt vì cần vừa serializable (2PL/SSI) vừa linearizable — mà linearizable qua nhiều node đòi **thứ tự thời gian thực toàn cục**. Spanner dùng **TrueTime** (đồng hồ nguyên tử + GPS, sai số giới hạn ε) và **cố tình chờ** (commit-wait ~ vài ms) để đảm bảo không hai transaction nào có timestamp chồng lấn không đúng thứ tự.

---

## 3. Thực hành — quan sát chính anomaly

### 3.1 Đọc và đặt isolation level (PostgreSQL)

```sql
-- Xem level mặc định (Postgres mặc định READ COMMITTED)
SHOW default_transaction_isolation;   -- read committed

-- Đặt cho một transaction cụ thể
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  -- ... câu lệnh ...
COMMIT;

-- Hoặc đặt cho toàn session
SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL REPEATABLE READ;
```

### 3.2 Tái hiện write skew (chạy 2 session song song)

```sql
-- Chuẩn bị
CREATE TABLE doctors (name text PRIMARY KEY, on_call boolean);
INSERT INTO doctors VALUES ('alice', true), ('bob', true);

-- === Session 1 ===                    -- === Session 2 ===
BEGIN ISOLATION LEVEL REPEATABLE READ;  BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT count(*) FROM doctors            SELECT count(*) FROM doctors
  WHERE on_call = true;  -- 2             WHERE on_call = true;  -- 2
UPDATE doctors SET on_call=false        UPDATE doctors SET on_call=false
  WHERE name='alice';                     WHERE name='bob';
COMMIT;  -- ok                          COMMIT;  -- ok  → 0 bác sĩ on-call!
```

Đổi cả hai sang `ISOLATION LEVEL SERIALIZABLE`: session commit sau sẽ bị **abort** với lỗi
`ERROR: could not serialize access due to read/write dependencies among transactions` (SQLSTATE `40001`) — và ứng dụng phải retry. Invariant được giữ.

### 3.3 Phòng lost update mà không cần serializable

```sql
-- Cách 1: khóa tường minh hàng khi đọc để ghi
BEGIN;
SELECT balance FROM accounts WHERE id = 42 FOR UPDATE;  -- khóa hàng
UPDATE accounts SET balance = balance - 30 WHERE id = 42;
COMMIT;

-- Cách 2: atomic — để DB tự đọc-sửa-ghi trong 1 câu (tránh race hoàn toàn)
UPDATE accounts SET balance = balance - 30 WHERE id = 42 AND balance >= 30;

-- Cách 3: optimistic concurrency bằng cột version
UPDATE accounts SET balance = 70, version = version + 1
WHERE id = 42 AND version = 5;   -- nếu affected rows = 0 → ai đó đã sửa, retry
```

### 3.4 Mẫu retry cho serialization failure (application-level)

```python
import psycopg2, time
def run_txn(conn, work):
    for attempt in range(5):
        try:
            with conn:                       # commit/rollback tự động
                with conn.cursor() as cur:
                    cur.execute("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE")
                    work(cur)
            return
        except psycopg2.errors.SerializationFailure:   # SQLSTATE 40001
            conn.rollback()
            time.sleep(0.01 * (2 ** attempt))          # backoff
    raise RuntimeError("txn không serialize được sau 5 lần thử")
```

Mẫu này là **bắt buộc** khi dùng `SERIALIZABLE` hoặc SSI: level cao đẩy trách nhiệm xử lý xung đột từ lock (chờ) sang abort (retry).

---

## 4. Bảng tổng hợp — chọn cái gì khi nào

| Nhu cầu | Trục | Chọn |
|---------|------|------|
| Không đọc dữ liệu chưa commit | Isolation | ≥ Read Committed (mặc định là đủ cho đa số) |
| Đọc lại trong 1 txn không đổi | Isolation | Snapshot / Repeatable Read |
| Read-modify-write một hàng an toàn | Isolation | `FOR UPDATE`, atomic update, hoặc version column |
| Check-điều-kiện-rồi-ghi (chống write skew) | Isolation | **Serializable** (hoặc khóa predicate tường minh) |
| Client luôn thấy write mới nhất qua nhiều replica | Consistency | Linearizable read (đọc từ leader / quorum) |
| Thứ tự nhân-quả giữa các thao tác | Consistency | Causal consistency |
| Vừa transaction đúng vừa real-time order toàn cục | Cả hai | **Strict serializability** (Spanner, CockroachDB) |

---

## 5. Tóm tắt
- **Isolation** (ACID-I) và **consistency** (CAP) là **hai trục khác nhau**: isolation về *nhiều transaction đồng thời trên một store* (trục thời gian); consistency về *nhiều bản sao trên nhiều node* (trục không gian). Đừng gộp chữ "consistency".
- **Isolation level** là hợp đồng "cho phép anomaly nào": Read Committed → Snapshot/Repeatable Read → Serializable, càng cao càng ít anomaly nhưng càng nhiều lock/abort.
- Các anomaly: **dirty read, non-repeatable read, phantom, lost update, write skew**. SQL-92 chỉ bắt 3 cái đầu; thực tế quan trọng nhất là **lost update** và **write skew**.
- **Snapshot Isolation** (MVCC) chặn được lost update nhưng **KHÔNG chặn write skew** — cái bẫy phổ biến nhất. Cần **serializable** (2PL hoặc SSI + retry) hoặc khóa tường minh.
- **Strict serializability = serializable + linearizable**: đỉnh của cả hai trục — thứ tự tuần tự tương đương *và* tôn trọng real-time order. Đắt (Spanner dùng TrueTime + commit-wait), nhưng là mô hình dễ suy luận nhất.

> **Bài tiếp theo:** đi sâu vào **consistency models trong replication** — linearizability, sequential, causal và eventual — cùng cách đo và hiện thực từng mức.
