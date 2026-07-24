# Bài 19 — Distributed transaction: 2PC & 3PC

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **atomic commit** qua nhiều node/DB: hoặc **tất cả** cùng commit, hoặc **tất cả** cùng abort — không có ở giữa.
- Mổ xẻ **two-phase commit (2PC)** đến từng thông điệp: vai coordinator, phase *prepare → vote*, phase *commit/abort*.
- Chỉ ra chính xác **vì sao 2PC blocking**: khi coordinator chết sau lúc participant đã vote *yes*, participant rơi vào **in-doubt** và bị khoá.
- Hiểu vai trò của **coordinator recovery log** và giao thức khi khôi phục.
- Biết **3PC** thêm phase để giảm blocking nhưng phải trả giá bằng **giả định đồng bộ** (synchronous, có bound về timeout) — nên hiếm dùng thật.
- Nắm **XA standard** (interface chuẩn cho 2PC) và **vì sao microservices thường NÉ 2PC**: coupling, khoá lâu, khả dụng kém — dẫn sang Saga.

---

## 2. Lý thuyết

### 2.1 Bài toán: atomic commit đa node

Trên **một** database, transaction có tính **atomicity** nhờ engine: ghi WAL (write-ahead log), tới `COMMIT` thì flush log, mọi thay đổi thành hiện thực cùng lúc; lỗi thì rollback sạch. Cả quyết định nằm ở **một** nơi nên đơn giản.

Giờ hình dung một lệnh chạm **nhiều** kho dữ liệu độc lập: trừ tiền ở `AccountDB` (bank A), cộng tiền ở `AccountDB` (bank B), ghi bút toán ở `LedgerDB`. Ta cần **atomic commit phân tán**:

> **Atomic commit**: một tập participant phải đi tới **cùng một quyết định** — *tất cả commit* hoặc *tất cả abort*. Tuyệt đối không được cảnh "bank A đã trừ mà bank B chưa cộng".

Analogy đời thường: **ba người cùng ký một hợp đồng ba bên**. Không thể để hai người ký còn một người bỏ dở — hoặc cả ba ký, hoặc xé cả ba bản. Cần một *người điều phối* (công chứng viên) đi hỏi từng người "anh sẵn sàng ký chứ?" trước, rồi mới hô "ký!".

Đây chính là bài toán **consensus** ở dạng đặc biệt (đồng thuận trên đúng 1 bit: commit hay abort), và nó thừa hưởng mọi cái khó của hệ phân tán ở Bài 1: partial failure, mạng mất tin, không phân biệt được node chết hay chậm.

### 2.2 Two-Phase Commit (2PC) — giao thức

2PC có một **coordinator** (transaction manager) và nhiều **participant** (resource manager — mỗi DB một cái). Chạy đúng hai phase:

**Phase 1 — Prepare / Voting.**
1. Coordinator gửi `PREPARE` tới mọi participant.
2. Mỗi participant làm hết mọi việc *trừ commit*: thực thi thay đổi, ghi **prepare record** vào log bền (durable), **giữ khoá** trên các row liên quan. Nếu làm được và chắc chắn có thể commit sau này → **vote YES** (`VOTE-COMMIT`). Nếu gặp lỗi (vi phạm ràng buộc, hết chỗ...) → **vote NO** (`VOTE-ABORT`).
3. Khi đã vote YES, participant **tự trói tay mình**: nó KHÔNG được đơn phương abort nữa, phải chờ lệnh coordinator — dù có phải chờ rất lâu.

**Phase 2 — Commit / Abort.**
4. Coordinator gom vote. **Chỉ cần một NO** (hoặc một timeout) → quyết định **ABORT**. **Tất cả YES** → quyết định **COMMIT**.
5. Coordinator ghi quyết định vào **recovery log** (điểm "no return" — commit point), rồi gửi `COMMIT`/`ABORT` tới tất cả.
6. Mỗi participant thi hành (release khoá, làm thay đổi vĩnh viễn hoặc rollback), rồi gửi `ACK`. Coordinator nhận đủ ACK thì kết thúc, dọn log.

<svg viewBox="0 0 700 360" role="img" aria-labelledby="pc-t pc-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="pc-t">Sequence diagram của two-phase commit thành công</title>
<desc id="pc-d">Coordinator gửi prepare, hai participant vote yes, coordinator ghi commit point rồi gửi commit và nhận ack</desc>
<rect x="40" y="20" width="120" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="100" y="42" text-anchor="middle" font-size="13" fill="currentColor">Coordinator</text>
<rect x="300" y="20" width="120" height="34" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="42" text-anchor="middle" font-size="13" fill="currentColor">Participant 1</text>
<rect x="540" y="20" width="120" height="34" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="600" y="42" text-anchor="middle" font-size="13" fill="currentColor">Participant 2</text>
<line x1="100" y1="54" x2="100" y2="345" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<line x1="360" y1="54" x2="360" y2="345" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<line x1="600" y1="54" x2="600" y2="345" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<text x="60" y="78" font-size="11" fill="currentColor" font-weight="bold">Phase 1</text>
<line x1="100" y1="90" x2="360" y2="90" stroke="currentColor" stroke-width="1.5" marker-end="url(#tx)"/>
<text x="230" y="84" text-anchor="middle" font-size="11" fill="currentColor">PREPARE</text>
<line x1="100" y1="108" x2="600" y2="108" stroke="currentColor" stroke-width="1.5" marker-end="url(#tx)"/>
<text x="350" y="102" text-anchor="middle" font-size="11" fill="currentColor">PREPARE</text>
<text x="360" y="132" text-anchor="middle" font-size="10" fill="#f59e0b">ghi log, khoá row</text>
<line x1="360" y1="150" x2="100" y2="150" stroke="currentColor" stroke-width="1.5" marker-end="url(#tx)"/>
<text x="230" y="144" text-anchor="middle" font-size="11" fill="#10b981">VOTE-COMMIT</text>
<line x1="600" y1="168" x2="100" y2="168" stroke="currentColor" stroke-width="1.5" marker-end="url(#tx)"/>
<text x="350" y="162" text-anchor="middle" font-size="11" fill="#10b981">VOTE-COMMIT</text>
<rect x="30" y="184" width="140" height="30" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="100" y="203" text-anchor="middle" font-size="10" fill="currentColor">ghi COMMIT (điểm no-return)</text>
<text x="60" y="238" font-size="11" fill="currentColor" font-weight="bold">Phase 2</text>
<line x1="100" y1="250" x2="360" y2="250" stroke="currentColor" stroke-width="1.5" marker-end="url(#tx)"/>
<text x="230" y="244" text-anchor="middle" font-size="11" fill="currentColor">COMMIT</text>
<line x1="100" y1="268" x2="600" y2="268" stroke="currentColor" stroke-width="1.5" marker-end="url(#tx)"/>
<text x="350" y="262" text-anchor="middle" font-size="11" fill="currentColor">COMMIT</text>
<line x1="360" y1="300" x2="100" y2="300" stroke="currentColor" stroke-width="1.5" marker-end="url(#tx)"/>
<text x="230" y="294" text-anchor="middle" font-size="11" fill="currentColor">ACK</text>
<line x1="600" y1="318" x2="100" y2="318" stroke="currentColor" stroke-width="1.5" marker-end="url(#tx)"/>
<text x="350" y="312" text-anchor="middle" font-size="11" fill="currentColor">ACK</text>
<defs><marker id="tx" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Điểm cốt lõi: **commit point** là khoảnh khắc coordinator flush bản ghi `COMMIT` xuống log bền. Trước đó, mọi thứ có thể abort. Sau đó, quyết định là **bất khả huỷ** — dù coordinator có chết ngay lúc đó, khi sống lại nó đọc log thấy `COMMIT` và tiếp tục gửi lệnh commit cho tới khi mọi participant ACK.

### 2.3 Vì sao 2PC blocking — kịch bản in-doubt

Đây là nhược điểm chí mạng, phải hiểu thật kỹ. Xét thời điểm nguy hiểm nhất: participant **đã vote YES** ở phase 1 và đang **chờ** lệnh phase 2. Lúc này participant ở trạng thái **in-doubt** (prepared/uncertain): nó đã hứa sẽ commit nếu được bảo, đã giữ khoá, và **không được tự quyết**.

Bây giờ **coordinator chết** (hoặc mạng tới coordinator đứt) ngay sau khi các participant vote YES nhưng **trước khi** kịp gửi quyết định phase 2. Participant kẹt cứng:
- Nó **không thể commit** đơn phương — biết đâu một participant khác đã vote NO và coordinator định abort.
- Nó **không thể abort** đơn phương — biết đâu coordinator đã ghi `COMMIT` và các bên khác đã commit rồi; abort sẽ vỡ atomicity.
- Nó **không thể hỏi coordinator** — coordinator đang chết.

→ Participant chỉ còn cách **chờ**, mà trong lúc chờ nó **vẫn giữ khoá** trên các row. Mọi transaction khác đụng row đó bị block theo. Đây là **blocking**: hệ thống có thể đứng vô thời hạn cho tới khi coordinator sống lại. Hỏi các participant khác cũng không cứu được nếu tất cả đều in-doubt — không ai biết quyết định.

<svg viewBox="0 0 680 250" role="img" aria-labelledby="id-t id-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="id-t">In-doubt window: coordinator chết sau khi participant vote yes</title>
<desc id="id-d">Participant đã vote yes và giữ khoá thì coordinator chết, participant kẹt không thể commit hay abort</desc>
<rect x="30" y="30" width="150" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="47" text-anchor="middle" font-size="12" fill="currentColor">Coordinator</text>
<text x="105" y="62" text-anchor="middle" font-size="11" fill="#f43f5e">CHẾT sau vote</text>
<rect x="30" y="150" width="150" height="60" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="172" text-anchor="middle" font-size="12" fill="currentColor">Participant</text>
<text x="105" y="189" text-anchor="middle" font-size="11" fill="#10b981">đã VOTE-COMMIT</text>
<text x="105" y="204" text-anchor="middle" font-size="11" fill="#f59e0b">GIỮ KHOÁ</text>
<line x1="105" y1="150" x2="105" y2="70" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#id1)"/>
<text x="165" y="115" font-size="10" fill="#f43f5e">hỏi? không ai trả lời</text>
<rect x="270" y="60" width="180" height="45" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="80" text-anchor="middle" font-size="11" fill="currentColor">không thể COMMIT</text>
<text x="360" y="96" text-anchor="middle" font-size="10" fill="currentColor">(biết đâu bên khác vote NO)</text>
<rect x="270" y="135" width="180" height="45" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="155" text-anchor="middle" font-size="11" fill="currentColor">không thể ABORT</text>
<text x="360" y="171" text-anchor="middle" font-size="10" fill="currentColor">(biết đâu đã COMMIT)</text>
<rect x="490" y="97" width="160" height="46" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="570" y="117" text-anchor="middle" font-size="12" fill="currentColor">=> BLOCK</text>
<text x="570" y="133" text-anchor="middle" font-size="10" fill="currentColor">khoá bị giữ vô hạn</text>
<defs><marker id="id1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Đây là kết quả **không thể tránh** về lý thuyết: 2PC không thể vừa an toàn (không vi phạm atomicity) vừa non-blocking khi coordinator có thể chết. Nói cách khác, coordinator là **single point of failure** cho tiến độ (liveness).

### 2.4 Recovery log — cách 2PC sống sót qua crash

2PC vẫn *đúng* (không vi phạm atomicity) nhờ mọi bên **ghi log bền trước khi hành động**. Quy tắc:

| Node | Ghi log TRƯỚC khi | Khi khởi động lại đọc log thấy... | Hành động |
|------|-------------------|-----------------------------------|-----------|
| Participant | gửi VOTE-COMMIT | `prepared` (chưa có quyết định) | vẫn in-doubt → **hỏi coordinator** để lấy kết cục |
| Participant | thi hành phase 2 | `committed`/`aborted` | đã xong, chỉ cần chắc chắn đã thi hành |
| Coordinator | gửi COMMIT tới ai | `commit` (commit point) | **tiếp tục** gửi COMMIT cho tới khi đủ ACK |
| Coordinator | — | không thấy quyết định | an toàn abort (chưa qua commit point) |

Cơ chế participant hỏi lại gọi là **cooperative termination protocol**: participant in-doubt hỏi coordinator (và có thể hỏi participant khác) "quyết định là gì?". Nếu coordinator đã hồi sinh và đọc được `commit` trong log → trả lời COMMIT. Chính vì phải hỏi được coordinator nên **liveness vẫn phụ thuộc coordinator sống lại**. Log đảm bảo *safety* (không sai), không đảm bảo *liveness* (không kẹt).

Trong thực tế, người ta giảm rủi ro bằng: coordinator **HA** (nhiều bản, bầu leader qua Raft), timeout để participant tự abort *chỉ khi chưa vote YES*, và presumed-abort/presumed-commit để tiết kiệm log.

### 2.5 Three-Phase Commit (3PC) — giảm blocking, nhưng...

3PC ra đời để loại bỏ blocking bằng cách chèn thêm một phase "báo trước" giữa vote và commit:

1. **CanCommit?** (phase 1): coordinator hỏi, participant trả lời Yes/No. Chưa khoá nặng, chưa "hứa".
2. **PreCommit** (phase 2 — MỚI): nếu tất cả Yes, coordinator gửi `PRE-COMMIT`. Participant ACK và ghi nhận "sắp commit". Điểm mấu chốt: khi một participant nhận `PRE-COMMIT`, nó **biết chắc mọi bên đều đã đồng ý** — không còn khả năng "bên nào đó vote NO".
3. **DoCommit** (phase 3): coordinator gửi `COMMIT`, participant thi hành.

Vì sao bớt block? Nếu coordinator chết ở giai đoạn in-doubt, participant có thể **suy luận an toàn** dựa trên trạng thái:
- Nếu **chưa** ai nhận `PRE-COMMIT` → chắc chắn chưa commit → an toàn **abort**.
- Nếu **đã** có `PRE-COMMIT` → mọi bên đã đồng ý → an toàn **commit** (bầu coordinator mới điều phối tiếp).

Nghĩa là participant có thể tự chọn timeout-action mà không đợi coordinator vô hạn.

> **Cái giá của 3PC — vì sao gần như không ai dùng thật:** 3PC chỉ non-blocking khi giả định **synchronous system** — có **bound đã biết** cho độ trễ mạng và tốc độ xử lý, để timeout thực sự phân biệt được "chết" và "chậm". Nhưng như Bài 1 và Bài 2 đã chỉ ra, hệ thực tế là **asynchronous/partially synchronous**: một node chậm không phân biệt được với node chết. Khi có **network partition**, 3PC có thể để hai nhóm participant đi tới hai quyết định trái ngược → **vỡ atomicity** (tệ hơn cả blocking!). Thêm một round-trip cũng làm 3PC chậm hơn, latency cao hơn. Vì vậy thực tế người ta hoặc dùng 2PC + coordinator HA, hoặc thay hẳn bằng consensus (Paxos/Raft) cho quyết định commit (ví dụ **Google Spanner** dùng Paxos để lưu trạng thái mỗi participant + 2PC giữa các group).

| Tiêu chí | 2PC | 3PC |
|---------|-----|-----|
| Số phase / round-trip | 2 | 3 (chậm hơn) |
| Blocking khi coordinator chết | **Có** (in-doubt) | Giảm nhiều |
| Giả định hệ thống | Chạy cả trên async | Cần **synchronous** (bound timeout) |
| An toàn khi network partition | An toàn (chỉ block) | **Có thể vỡ atomicity** |
| Dùng thực tế | Phổ biến (XA), có coordinator HA | Gần như chỉ trong sách |

### 2.6 XA standard

**XA** (X/Open Distributed Transaction Processing) là **chuẩn interface** để hiện thực 2PC giữa một transaction manager (coordinator) và nhiều resource manager (DB, message broker). Nó định nghĩa các lời gọi như `xa_start`, `xa_end`, `xa_prepare`, `xa_commit`, `xa_rollback`, `xa_recover`. Nhờ XA, một TM (ví dụ JTA/Atomikos, Narayana, Tuxedo, hay MSDTC) có thể điều phối commit qua PostgreSQL + Oracle + IBM MQ cùng lúc miễn là các driver hỗ trợ XA.

Ví dụ vòng đời một XA transaction bằng SQL (PostgreSQL hỗ trợ *prepared transactions* — chính là phase 1 của XA):

```sql
-- Trên mỗi resource (mỗi DB), coordinator điều khiển từng bước:

-- Phase 1: PREPARE ------------------------------------------
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 'A';
-- ghi bền, giữ khoá, sẵn sàng commit nhưng CHƯA commit:
PREPARE TRANSACTION 'txn-42';      -- <- vote YES nằm ở đây
-- Từ giờ 'txn-42' là in-doubt: khoá vẫn giữ, sống sót qua restart.

-- Coordinator gom vote của MỌI resource. Nếu tất cả OK:

-- Phase 2: COMMIT -------------------------------------------
COMMIT PREPARED 'txn-42';          -- thi hành, nhả khoá
-- hoặc nếu có ai vote NO / lỗi:
-- ROLLBACK PREPARED 'txn-42';
```

Cần bật cấu hình trước (nếu không, `PREPARE TRANSACTION` sẽ báo lỗi):

```conf
# postgresql.conf — số prepared transaction tối đa tồn tại đồng thời
max_prepared_transactions = 100    # mặc định 0 = TẮT tính năng XA
```

Xem và dọn các transaction đang in-doubt (rất quan trọng khi coordinator chết mà quên chúng — khoá bị giữ mãi):

```sql
-- Liệt kê các prepared txn đang treo (in-doubt) và từ bao giờ:
SELECT gid, prepared, owner, database FROM pg_prepared_xacts;

-- Nếu một txn bị bỏ rơi (orphaned) đang giữ khoá, dọn thủ công:
ROLLBACK PREPARED 'txn-42';
```

> Lưu ý vận hành: một prepared transaction bị quên sẽ **giữ khoá và chặn VACUUM vô thời hạn**, làm phình bảng và kẹt các query khác. Đây là biểu hiện thực tế của "blocking" trong 2PC — nên giám sát `pg_prepared_xacts` là bắt buộc khi dùng XA.

### 2.7 Vì sao microservices thường NÉ 2PC

2PC *đúng* về atomicity, nhưng trong kiến trúc microservices nó gây quá nhiều tác hại nên bị xem là **anti-pattern** trong đa số trường hợp:

- **Coupling (bó chặt)**: coordinator phải biết toàn bộ participant và tất cả phải "cùng vào một transaction". Điều này phá vỡ tính độc lập của service — trái tim của microservices. Deploy/scale một service kéo theo ràng buộc với các service khác trong giao dịch.
- **Khoá lâu → throughput thấp**: giữa phase 1 và phase 2, participant **giữ khoá** trên dữ liệu suốt cả round-trip mạng (chưa kể chờ participant chậm nhất). Với gọi liên service qua mạng (hàng chục ms), khoá bị giữ lâu gấp bội so với transaction local, làm giảm mạnh concurrency.
- **Khả dụng kém (availability)**: giao dịch chỉ commit được khi **tất cả** participant + coordinator đều sống và trả lời. Availability là **tích** các xác suất: 5 service mỗi cái 99.9% → toàn cục chỉ ~99.5%. Coordinator lại là single point of failure gây blocking (mục 2.3).
- **Nhiều datastore không hỗ trợ XA**: đa số NoSQL/queue (MongoDB kiểu cũ, Kafka, nhiều REST API) không nói được giao thức 2PC → không thể đưa vào một XA transaction.
- **Chặn tiến độ**: một participant in-doubt có thể khoá dữ liệu và làm degrade cả luồng nghiệp vụ trong sự cố.

→ Thay vì atomic commit đồng bộ, microservices dùng **eventual consistency** với **Saga pattern**: chuỗi transaction local, mỗi bước có **compensating transaction** (bù trừ) để "quay lui" về mặt nghiệp vụ khi bước sau thất bại — đổi *atomicity* lấy *availability + loose coupling*. Kèm theo là **outbox pattern + idempotency** (Bài 7) để đảm bảo message không mất/không nhân đôi. 2PC chỉ nên giữ cho phạm vi hẹp, trong cùng một biên tin cậy (ví dụ ghi DB + gửi vào một broker hỗ trợ transaction), nơi các bên đều sống chung SLA.

| | 2PC / XA | Saga (microservices) |
|--|----------|----------------------|
| Nhất quán | Strong, atomic tức thì | Eventual (có cửa sổ không nhất quán) |
| Khoá | Giữ khoá qua mạng | Chỉ khoá trong từng local txn ngắn |
| Coupling | Chặt (cùng 1 transaction) | Lỏng (event/command giữa service) |
| Availability | Thấp (cần tất cả sống) | Cao (chịu được bên tạm chết) |
| Rollback | Tự động, sạch | Thủ công qua compensating txn |
| Khi nào dùng | 1 biên tin cậy, cần atomic chặt | Nghiệp vụ dài, nhiều service |

---

## 3. Ví dụ thực tế & con số

**Chuyển tiền liên ngân hàng qua XA/2PC:** trừ ở `BankA`, cộng ở `BankB`. Round-trip mạng giữa hai DC ~20ms; phase 1 + phase 2 tối thiểu ~2 round-trip → **~40ms** khoá bị giữ trên account row, so với ~1ms nếu transaction local. Nếu coordinator chết giữa chừng lúc BankB đã prepared → row của BankB **in-doubt**, mọi giao dịch khác trên tài khoản đó **treo** cho tới khi coordinator (hoặc DBA chạy `ROLLBACK PREPARED`) can thiệp — có thể là hàng phút, phá SLA.

**Vì sao đặt-món-online (Bài 1) không dùng 2PC:** Order → Payment → Inventory → Delivery đi qua 4 service, có cả Kafka và REST không nói XA. Nếu dùng 2PC, đặt một đơn hàng sẽ khoá tồn kho suốt vài chục ms và sập nếu Delivery đang deploy. Thực tế người ta chạy **Saga**: đặt đơn → trừ tiền → giữ hàng; nếu giữ hàng fail thì **hoàn tiền** (compensating) thay vì rollback đồng bộ. Người dùng chấp nhận trạng thái "đang xử lý" trong vài giây để đổi lấy hệ luôn sống.

---

## 4. Tóm tắt
- **Atomic commit** qua nhiều node: tất cả commit hoặc tất cả abort — đây là consensus trên 1 bit, thừa hưởng mọi cái khó của hệ phân tán.
- **2PC** = coordinator + participant, hai phase: *prepare→vote* (ghi log bền, giữ khoá, hứa) rồi *commit/abort*. **Commit point** là lúc coordinator flush quyết định xuống recovery log.
- **Blocking** xảy ra khi coordinator chết sau khi participant đã vote YES: participant **in-doubt** không được tự commit/abort, **giữ khoá** và chờ vô hạn. Log đảm bảo *safety*, không đảm bảo *liveness*.
- **3PC** thêm phase PreCommit để participant suy luận và tự quyết → giảm blocking, nhưng chỉ đúng khi **synchronous**; gặp partition có thể **vỡ atomicity**, nên hầu như không dùng thật.
- **XA** là chuẩn interface hiện thực 2PC (PostgreSQL: `PREPARE TRANSACTION`/`COMMIT PREPARED`, giám sát `pg_prepared_xacts`).
- **Microservices né 2PC** vì coupling chặt, khoá lâu, availability là tích các xác suất, và nhiều datastore không nói XA → chuyển sang **Saga + compensating transaction + outbox/idempotency**, đổi atomicity lấy availability.

> **Bài tiếp theo (Bài 20):** đi sâu **Saga pattern** — orchestration vs choreography, thiết kế compensating transaction, và cách outbox + idempotency giữ cho eventual consistency không mất dữ liệu.
