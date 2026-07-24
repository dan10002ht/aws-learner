# Bài 9 — NoSQL taxonomy & khi nào rời bỏ SQL

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **vì sao NoSQL ra đời**: scale ngang (horizontal scaling), schema linh hoạt, throughput cao — và bản chất đánh đổi đằng sau.
- Phân biệt **4 họ NoSQL chính**: key-value, document, wide-column, graph — đặc trưng lưu trữ, truy vấn và use case của mỗi họ.
- Hiểu **BASE vs ACID** và định vị mỗi hệ theo **CAP theorem**.
- ⚠️ Nhận ra sai lầm phổ biến nhất: **"NoSQL nhanh hơn SQL"** là SAI — và vì sao **đa số ứng dụng vẫn nên bắt đầu bằng SQL**.
- Ra quyết định "khi nào thực sự cần rời bỏ SQL" dựa trên bằng chứng, không theo trend.

---

## 2. Lý thuyết

### 2.1 NoSQL không phải "không dùng SQL" — mà là "Not Only SQL"

Tên gọi gây hiểu lầm. **NoSQL** không có nghĩa "chống lại SQL"; nó là **"Not Only SQL"** — một *nhóm* các database từ bỏ một hoặc vài ràng buộc của mô hình quan hệ (relational) để đổi lấy một thứ khác: khả năng scale, độ linh hoạt schema, hay tối ưu cho một dạng truy vấn cụ thể.

Điểm mấu chốt cần hiểu ngay: **NoSQL không phải một công nghệ, nó là một *cái ô* che 4 họ database rất khác nhau** — khác nhau tới mức Redis (key-value) và Neo4j (graph) gần như không có điểm chung nào ngoài việc "không phải bảng quan hệ truyền thống". Nói "dự án dùng NoSQL" cũng mơ hồ như nói "dự án dùng ngôn ngữ không phải Java".

### 2.2 Ba động lực khiến người ta rời SQL

**Analogy:** Một database quan hệ giống một **thư viện trung tâm khổng lồ**: một toà nhà, thủ thư kiểm tra mọi cuốn sách phải đúng quy cách (schema), mọi giao dịch mượn/trả được ghi sổ chặt chẽ (ACID). Tuyệt vời — cho tới khi lượng độc giả tăng gấp 1000 lần và một toà nhà không chứa nổi. Lúc đó bạn muốn **nhiều chi nhánh nhỏ khắp thành phố** (nhiều node), mỗi nơi phục vụ độc lập. Nhưng để làm được thế, bạn phải chấp nhận: hai chi nhánh có thể *tạm thời* không đồng bộ danh mục sách với nhau.

Ba động lực chính:

1. **Scale ngang (horizontal scaling).** SQL truyền thống scale **dọc** (vertical) — mua máy mạnh hơn — và có trần cứng. NoSQL sinh ra để **sharding/partition tự động** trên nhiều máy commodity rẻ tiền, throughput cộng dồn tuyến tính khi thêm node. Đây là động lực *thật* và *quan trọng nhất*.
2. **Schema linh hoạt.** Mô hình quan hệ yêu cầu định nghĩa schema trước, đổi cột phải `ALTER TABLE` (có thể khoá bảng lớn). Document store cho phép mỗi bản ghi có cấu trúc riêng — hợp với dữ liệu hình dạng thay đổi nhanh, hoặc catalog sản phẩm mỗi loại có thuộc tính khác nhau.
3. **Throughput / độ trễ cho một access pattern hẹp.** Nếu app chỉ tra cứu theo một khoá duy nhất hàng triệu lần/giây, một key-value store tối ưu đúng pattern đó sẽ nhanh và rẻ hơn.

<svg viewBox="0 0 640 220" role="img" aria-labelledby="sc-t sc-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="sc-t">Vertical scaling vs Horizontal scaling</title>
<desc id="sc-d">SQL truyền thống scale dọc bằng một máy ngày càng lớn có trần cứng, NoSQL scale ngang bằng nhiều node commodity cộng dồn throughput</desc>
<text x="160" y="24" text-anchor="middle" font-size="13" fill="currentColor">Vertical (SQL cổ điển)</text>
<rect x="120" y="40" width="80" height="30" rx="4" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<rect x="112" y="75" width="96" height="40" rx="4" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<rect x="104" y="120" width="112" height="55" rx="4" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="160" y="152" text-anchor="middle" font-size="11" fill="currentColor">1 máy to hơn</text>
<text x="160" y="197" text-anchor="middle" font-size="11" fill="currentColor">→ trần cứng, đắt</text>
<line x1="300" y1="110" x2="340" y2="110" stroke="currentColor" stroke-width="1.5" marker-end="url(#na)"/>
<text x="500" y="24" text-anchor="middle" font-size="13" fill="currentColor">Horizontal (NoSQL)</text>
<rect x="380" y="45" width="55" height="45" rx="4" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="445" y="45" width="55" height="45" rx="4" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="510" y="45" width="55" height="45" rx="4" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="380" y="100" width="55" height="45" rx="4" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="445" y="100" width="55" height="45" rx="4" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="510" y="100" width="55" height="45" rx="4" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="472" y="170" text-anchor="middle" font-size="11" fill="currentColor">nhiều node rẻ, thêm node</text>
<text x="472" y="188" text-anchor="middle" font-size="11" fill="currentColor">→ throughput cộng dồn</text>
<defs><marker id="na" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.3 Bốn họ NoSQL chính

NoSQL được phân loại theo **cách nó mô hình hoá dữ liệu** — đây là taxonomy chuẩn.

<svg viewBox="0 0 660 300" role="img" aria-labelledby="tx-t tx-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="tx-t">Taxonomy 4 họ NoSQL</title>
<desc id="tx-d">NoSQL chia thành bốn họ chính là key-value, document, wide-column và graph, mỗi họ có mô hình dữ liệu và sản phẩm tiêu biểu riêng</desc>
<rect x="255" y="20" width="150" height="38" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="330" y="44" text-anchor="middle" font-size="14" fill="currentColor">NoSQL</text>
<line x1="330" y1="58" x2="90" y2="95" stroke="currentColor" stroke-width="1" marker-end="url(#ta)"/>
<line x1="330" y1="58" x2="250" y2="95" stroke="currentColor" stroke-width="1" marker-end="url(#ta)"/>
<line x1="330" y1="58" x2="415" y2="95" stroke="currentColor" stroke-width="1" marker-end="url(#ta)"/>
<line x1="330" y1="58" x2="580" y2="95" stroke="currentColor" stroke-width="1" marker-end="url(#ta)"/>
<rect x="20" y="100" width="140" height="80" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="122" text-anchor="middle" font-size="13" fill="currentColor">Key-Value</text>
<text x="90" y="142" text-anchor="middle" font-size="10" fill="currentColor">key → blob</text>
<text x="90" y="160" text-anchor="middle" font-size="10" fill="currentColor">Redis, DynamoDB</text>
<rect x="180" y="100" width="140" height="80" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="250" y="122" text-anchor="middle" font-size="13" fill="currentColor">Document</text>
<text x="250" y="142" text-anchor="middle" font-size="10" fill="currentColor">JSON/BSON lồng nhau</text>
<text x="250" y="160" text-anchor="middle" font-size="10" fill="currentColor">MongoDB</text>
<rect x="340" y="100" width="140" height="80" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="410" y="122" text-anchor="middle" font-size="13" fill="currentColor">Wide-Column</text>
<text x="410" y="142" text-anchor="middle" font-size="10" fill="currentColor">row → nhiều column</text>
<text x="410" y="160" text-anchor="middle" font-size="10" fill="currentColor">Cassandra, HBase</text>
<rect x="500" y="100" width="140" height="80" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="570" y="122" text-anchor="middle" font-size="13" fill="currentColor">Graph</text>
<text x="570" y="142" text-anchor="middle" font-size="10" fill="currentColor">node + edge</text>
<text x="570" y="160" text-anchor="middle" font-size="10" fill="currentColor">Neo4j</text>
<text x="90" y="205" text-anchor="middle" font-size="10" fill="currentColor">cache, session</text>
<text x="250" y="205" text-anchor="middle" font-size="10" fill="currentColor">catalog, CMS</text>
<text x="410" y="205" text-anchor="middle" font-size="10" fill="currentColor">time-series, ghi lớn</text>
<text x="570" y="205" text-anchor="middle" font-size="10" fill="currentColor">quan hệ, mạng xã hội</text>
<text x="330" y="250" text-anchor="middle" font-size="11" fill="currentColor">Chọn họ theo ACCESS PATTERN, không theo độ "hot" của công nghệ</text>
<defs><marker id="ta" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

#### (a) Key-Value — Redis, DynamoDB, Riak
Mô hình đơn giản nhất: một **key** ánh xạ tới một **value** (value có thể là blob, JSON, hoặc cấu trúc). Database chỉ hiểu key; nó **không nhìn vào trong value** để lọc/join. Vì thế truy vấn duy nhất hiệu quả là `GET(key)` / `PUT(key, value)` — O(1), cực nhanh, dễ shard bằng cách hash key.

- **Đặc trưng:** throughput cao nhất, latency thấp nhất, mô hình dữ liệu nghèo nhất.
- **Use case:** cache (Bài 1–8), session store, feature flag, giỏ hàng, shopping cart, đếm.
- **Lưu ý:** DynamoDB (managed của AWS) mở rộng thêm *composite key* (partition key + sort key) và secondary index, nên mạnh hơn key-value thuần — nhưng vẫn buộc bạn thiết kế trước theo access pattern.

#### (b) Document — MongoDB, Couchbase, Firestore
Value là một **document** có cấu trúc (JSON/BSON), **lồng nhau** được và database **hiểu được bên trong** — nên bạn truy vấn theo field, index theo field, filter, aggregate. Mỗi document trong cùng collection **không bắt buộc cùng schema**.

- **Đặc trưng:** cân bằng giữa linh hoạt và khả năng truy vấn; hợp mô hình "một aggregate = một document" (một đơn hàng kèm mọi line-item nằm gọn trong một document → đọc một phát là đủ, không cần join).
- **Use case:** product catalog, CMS/nội dung, user profile, event log, prototyping nhanh.
- **Cảnh báo:** dễ bị lạm dụng nhồi mọi thứ vào một document khổng lồ, hoặc nhân bản dữ liệu (denormalize) rồi phải cập nhật ở nhiều nơi. Document store *không* miễn phí việc mô hình hoá — nó chỉ dời việc đó sang lúc thiết kế access pattern.

#### (c) Wide-Column — Cassandra, HBase, ScyllaDB, Bigtable
Đừng nhầm với "cột" của SQL. Mô hình ở đây là: dữ liệu tổ chức theo **partition key → nhiều row → mỗi row là tập column linh hoạt**. Nó được thiết kế cho **ghi cực lớn, phân tán trên hàng trăm node, không có single point of failure**. Cassandra dùng kiến trúc **masterless (peer-to-peer)** với **tunable consistency** — bạn chọn số replica phải ack cho mỗi read/write (quorum).

- **Đặc trưng:** ghi (write) throughput khổng lồ, scale tuyến tính, HA đa vùng địa lý; **truy vấn phải khớp đúng partition key** đã thiết kế — không có join, không ad-hoc query tự do.
- **Use case:** time-series, IoT/sensor, message/feed, audit log, dữ liệu ghi-nhiều-đọc-theo-key.
- **Nguyên tắc sống còn:** với Cassandra bạn **thiết kế bảng theo câu truy vấn**, không theo entity. Query trước, schema sau.

#### (d) Graph — Neo4j, Amazon Neptune, JanusGraph
Dữ liệu là các **node** (thực thể) nối bằng **edge** (quan hệ), edge có hướng và thuộc tính. Điểm mạnh nằm ở việc **đi theo quan hệ nhiều bước (traversal)** — thứ mà SQL phải làm bằng nhiều `JOIN` lồng nhau, càng sâu càng chậm theo cấp số nhân. Graph DB lưu con trỏ trực tiếp giữa các node nên traversal là O(số cạnh đi qua), gần như độc lập với tổng kích thước dữ liệu.

- **Đặc trưng:** vô địch cho truy vấn *quan hệ nhiều bước*; kém cho quét/aggregate toàn bảng.
- **Use case:** mạng xã hội (bạn của bạn), recommendation engine, phát hiện gian lận (fraud ring), knowledge graph, phân tích phụ thuộc.

### 2.4 ACID vs BASE — hai triết lý về tính đúng đắn

Đây là trục *triết lý* phân biệt SQL truyền thống với phần lớn NoSQL phân tán.

**ACID** (Atomicity, Consistency, Isolation, Durability) — "thà chậm/từ chối còn hơn sai". Mỗi giao dịch hoặc hoàn tất trọn vẹn hoặc rollback; sau khi commit dữ liệu chắc chắn nhất quán. Đây là *hợp đồng* của RDBMS.

**BASE** (Basically Available, Soft state, Eventually consistent) — "luôn phục vụ được, chấp nhận tạm thời chưa nhất quán, rồi sẽ hội tụ". Đây là triết lý của nhiều hệ NoSQL phân tán ưu tiên availability.

| Khía cạnh | ACID | BASE |
|-----------|------|------|
| Ưu tiên | **Tính nhất quán** (correctness) | **Tính sẵn sàng** (availability) |
| Sau khi ghi | Đọc thấy ngay giá trị mới | Có thể đọc thấy giá trị cũ *tạm thời* |
| Khi node lỗi/mạng chia cắt | Có thể từ chối để giữ đúng | Vẫn phục vụ, hội tụ sau |
| Điển hình | PostgreSQL, MySQL (InnoDB) | Cassandra, DynamoDB (mặc định), Riak |
| Hợp với | Tiền, tồn kho, booking | Feed, like count, telemetry |

> **Đừng tuyệt đối hoá.** BASE không phải "NoSQL", ACID không phải "SQL". MongoDB có multi-document transactions ACID; DynamoDB có transactions; nhiều "NewSQL" (CockroachDB, Spanner) đạt ACID *trên* kiến trúc phân tán. Trục ACID↔BASE là **spectrum**, ngày càng nhiều hệ cho bạn *chọn* mức consistency theo từng thao tác (tunable).

### 2.5 Định vị theo CAP theorem

Nhắc lại CAP (đã học ở phần distributed systems): khi có **network partition (P)** — mạng giữa các node bị chia cắt — một hệ phân tán buộc phải chọn **Consistency (C)** hoặc **Availability (A)**, không thể cả hai. Khi *không* có partition, hệ có thể đạt cả C và A.

Điểm hay giải thích sai: CAP **không** nói "chọn 2 trong 3 mãi mãi". P là *sự cố bạn không tránh được*, nên lựa chọn thực sự chỉ là **CP hay AP khi partition xảy ra**.

| Hệ | Nghiêng về | Hành vi khi partition |
|-----|-----------|----------------------|
| **Cassandra, DynamoDB, Riak** | **AP** | Vẫn nhận read/write ở mọi phía, hội tụ sau |
| **MongoDB, HBase** | **CP** | Phía mất quorum ngừng phục vụ để không trả dữ liệu sai |
| **Redis** (single node) | không phân tán → không áp CAP; Redis Cluster nghiêng CP |
| **RDBMS single node** | Không phân tán → CAP không áp dụng trực tiếp |

Nhiều hệ AP như Cassandra cho **tunable consistency**: đặt `QUORUM` cho cả read và write thì `R + W > N` đảm bảo đọc thấy ghi mới nhất (nhất quán mạnh hơn), đổi lại giảm availability khi node chết. Bạn *mua* consistency bằng availability, theo từng câu query.

### 2.6 ⚠️ Cảnh báo lớn nhất: "NoSQL nhanh hơn SQL" là một huyền thoại

Đây là hiểu lầm tai hại nhất, phải nói thẳng:

- **NoSQL không nhanh hơn SQL một cách phổ quát.** Nó nhanh hơn *cho đúng một access pattern mà nó được tối ưu*, thường bằng cách **hy sinh** join, transaction đa bản ghi, và consistency mạnh. Bạn không được thêm tốc độ miễn phí — bạn *đánh đổi tính năng lấy tốc độ*.
- Với dữ liệu vừa phải (dưới vài trăm GB, dưới vài chục nghìn TPS), một **PostgreSQL/MySQL chỉnh index đúng** thường nhanh *ngang hoặc hơn* NoSQL, mà lại cho bạn join, transaction, ad-hoc query, và ràng buộc toàn vẹn — miễn phí.
- Cái NoSQL thực sự thắng là **scale ngang gần như vô hạn** và **HA đa vùng** khi bạn đã *vượt trần* của một máy SQL. Đó là bài toán của số ít công ty, không phải của đa số app.

**Cái giá phải trả khi rời SQL:**
- Mất **JOIN** → phải denormalize và tự đồng bộ dữ liệu trùng lặp ở tầng app.
- Mất **transaction đa bản ghi mạnh** (ở nhiều hệ) → phải xử lý eventual consistency, idempotency, reconciliation.
- Mất **ad-hoc query** → phải thiết kế *trước* mọi access pattern; đổi pattern = migrate dữ liệu đau đớn.
- Mất **ràng buộc toàn vẹn** (foreign key, unique, check) → bug dữ liệu dồn về code.

> **Quy tắc thực dụng:** **Bắt đầu với PostgreSQL.** Nó xử lý phần lớn nhu cầu (kể cả JSON linh hoạt qua kiểu `jsonb`, full-text search, thậm chí queue nhẹ). Chỉ rời SQL khi bạn có **bằng chứng đo được** rằng một access pattern cụ thể đã vượt khả năng của nó — và khi đó thường bạn *thêm* một NoSQL cho pattern đó (polyglot persistence), chứ không *thay thế* toàn bộ.

### 2.7 Ví dụ số & tình huống thực tế

- **Cache đọc:** trước một API 40ms hay bị nghẽn DB, đặt Redis cache-aside → p99 giảm còn ~2ms và DB giảm 80% tải. Đây là NoSQL (key-value) *bổ sung*, không thay SQL.
- **Feed/timeline 500 triệu event/ngày:** ghi tuần tự khổng lồ, đọc theo user-id + thời gian → Cassandra (wide-column) đúng bài. Nhét vào một Postgres đơn sẽ vỡ ở tầng ghi và storage.
- **"Bạn chung" ở độ sâu 4 hop trên 100 triệu user:** SQL cần 4 self-join, chậm hàng giây; Neo4j traversal trả trong mili giây.
- **Catalog 200 loại sản phẩm mỗi loại thuộc tính khác nhau:** MongoDB document tránh được rừng bảng EAV; nhưng Postgres `jsonb` cũng làm được — cân nhắc đừng vội rời SQL.

---

## 3. Bảng so sánh 4 họ NoSQL

| Tiêu chí | Key-Value | Document | Wide-Column | Graph |
|----------|-----------|----------|-------------|-------|
| Sản phẩm | Redis, DynamoDB | MongoDB, Couchbase | Cassandra, HBase | Neo4j, Neptune |
| Mô hình dữ liệu | key → value | JSON lồng nhau | partition → row → column | node + edge |
| Truy vấn tốt nhất | `GET(key)` O(1) | filter/index theo field | theo partition key | traversal nhiều hop |
| Điểm mạnh | latency & throughput | linh hoạt schema | ghi lớn, scale tuyến tính | quan hệ nhiều bước |
| Điểm yếu | không query bên trong value | dễ nhồi/denormalize sai | không join, không ad-hoc | kém aggregate toàn bộ |
| CAP điển hình | AP (DynamoDB) | CP (MongoDB) | AP (Cassandra) | thường CP |
| Use case | cache, session | catalog, CMS | time-series, feed | social, fraud, reco |

---

## 4. Cây quyết định: có nên rời SQL không?

```text
Bắt đầu: dùng PostgreSQL / MySQL (mặc định hợp lý cho ~90% app)
        │
        ├─ Cần transaction đa bảng, JOIN, ràng buộc chặt?     → Ở lại SQL.
        │
        ├─ Có ĐO ĐƯỢC nghẽn ở một access pattern cụ thể?
        │     │  (chưa đo → tối ưu index/query/replica trước)
        │     │
        │     ├─ Chỉ tra theo 1 key, cần latency cực thấp?    → + Key-Value (Redis/DynamoDB)
        │     ├─ Dữ liệu hình dạng đa dạng, đọc theo aggregate? → Document (MongoDB) / Postgres jsonb
        │     ├─ Ghi cực lớn, phân tán đa vùng, query theo key? → Wide-Column (Cassandra)
        │     └─ Bài toán chủ đạo là QUAN HỆ nhiều bước?       → Graph (Neo4j)
        │
        └─ Không có bằng chứng, chỉ vì "trend"?               → Ở lại SQL.
```

Chiến lược trưởng thành là **polyglot persistence**: SQL làm nguồn sự thật (source of truth) cho dữ liệu giao dịch, và *thêm* NoSQL đúng họ cho từng access pattern chuyên biệt — chứ không "một database cho tất cả".

---

## 5. Tóm tắt
- **NoSQL = "Not Only SQL"**, một cái ô che **4 họ rất khác nhau**: key-value, document, wide-column, graph — chọn theo **access pattern**, không theo độ hot.
- Ba động lực rời SQL: **scale ngang**, **schema linh hoạt**, **throughput cho pattern hẹp** — trong đó scale ngang là lý do *thật* quan trọng nhất.
- **ACID vs BASE** là spectrum về ưu tiên correctness↔availability; **CAP** buộc chọn **CP hay AP** *khi có partition*. Nhiều hệ cho **tunable consistency**.
- ⚠️ **"NoSQL nhanh hơn SQL" là huyền thoại**: bạn *đánh đổi* join/transaction/ad-hoc để lấy tốc độ trên một pattern. Rời SQL là mất mát, không phải nâng cấp.
- **Mặc định: bắt đầu bằng PostgreSQL.** Chỉ thêm NoSQL khi có **bằng chứng đo được**, và thường theo hướng **polyglot persistence** — thêm chứ không thay.

> **Bài tiếp theo (Bài 10):** đi sâu vào **document database với MongoDB** — mô hình document, cách mô hình hoá aggregate, index, và những cạm bẫy denormalize.
