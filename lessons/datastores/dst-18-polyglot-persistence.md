# Bài 18 — Polyglot persistence: chọn đúng store

## 1. Mục tiêu
Sau bài này bạn có thể:
- Hiểu vì sao **không có store "một cho tất cả"** — mỗi store tối ưu cho một loại bài toán và trả giá ở loại khác.
- Dùng một **framework quyết định** (decision matrix) dựa trên: access pattern, consistency, scale, latency, chi phí, vận hành.
- Kết hợp **nhiều store trong một hệ** (polyglot persistence) và giữ chúng **đồng bộ** đúng cách.
- Phân biệt **dual-write (nguy hiểm)** với **outbox pattern** và **CDC/Debezium** — và biết khi nào dùng cái nào.
- Đánh giá được **chi phí vận hành** khi đi polyglot để không "vẽ rắn thêm chân".

---

## 2. Lý thuyết

### 2.1 Vì sao không có store "một cho tất cả"?

**Analogy:** không ai đi siêu thị, leo núi, và chở hàng bằng *cùng một* chiếc xe. Sedan êm trên phố nhưng chết trên đường rừng; xe tải chở được nhiều nhưng tốn xăng và khó đỗ. Data store cũng vậy: mỗi loại được **thiết kế đánh đổi** (trade-off) quanh một điểm ngọt, và không có điểm ngọt nào phủ hết mọi bài toán.

Bản chất của đánh đổi nằm ở **cách dữ liệu được tổ chức trên đĩa/RAM và cách nó được truy cập**:

- **RDBMS (Postgres, MySQL)**: dữ liệu chuẩn hoá thành bảng, index B-tree, hỗ trợ **join** và **transaction ACID đa hàng**. Tối ưu cho quan hệ phức tạp và tính đúng đắn — nhưng join + khoá làm write-scale ngang khó.
- **Document store (MongoDB)**: lưu nguyên một aggregate (JSON) cạnh nhau → đọc "cả object" bằng một truy vấn, schema linh hoạt. Nhưng quan hệ nhiều-nhiều và transaction chéo document thì đắt.
- **Key-value / cache (Redis, DynamoDB)**: truy cập theo key ở độ trễ micro giây, scale ngang dễ. Nhưng không có truy vấn linh hoạt (không WHERE tuỳ ý, không join).
- **Wide-column (Cassandra, ScyllaDB)**: tối ưu **write throughput** cực lớn và scale tuyến tính; nhưng bạn phải **thiết kế bảng theo query trước** (query-first), không join, chỉ eventual consistency.
- **Search engine (Elasticsearch, OpenSearch)**: inverted index cho full-text và facet/aggregation. Nhưng không phải nguồn sự thật, không transaction.
- **Time-series (TimescaleDB, InfluxDB)**: tối ưu append theo thời gian + downsampling. Kém cho update ngẫu nhiên.
- **Graph (Neo4j)**: đi quan hệ nhiều bậc (friend-of-friend) cực nhanh nhờ lưu cạnh như con trỏ. Kém cho quét bảng lớn.
- **Object storage (S3)**: rẻ, vô hạn, cho blob/file lớn. Không có query trên nội dung.

> **Polyglot persistence** = trong *một* hệ thống, chủ động dùng **nhiều loại store**, mỗi loại cho phần dữ liệu/truy vấn mà nó giỏi nhất — thay vì ép mọi thứ vào một DB duy nhất.

### 2.2 Framework quyết định: 6 trục để chọn store

Khi đứng trước một dataset/tính năng, đừng hỏi "dùng DB nào?" mà hỏi **6 câu** sau:

1. **Access pattern** — Read/write ratio bao nhiêu? **Query shape** thế nào (theo key? theo range? full-text? aggregate? traverse quan hệ)? Đây là trục **quan trọng nhất**: query shape quyết định index và do đó quyết định store.
2. **Consistency** — Cần **strong** (đọc thấy ngay giá trị vừa ghi, giao dịch ACID) hay chấp nhận **eventual**? Tiền bạc/tồn kho thường cần strong; feed/đếm view chịu được eventual.
3. **Scale** — Dataset và throughput hiện tại và sau 2 năm? Có vượt một node (cần scale ngang / sharding) không?
4. **Latency** — SLA đọc/ghi (p99) là bao nhiêu? micro giây (cache), milli giây (OLTP), hay giây (analytics) đều là câu trả lời hợp lệ.
5. **Chi phí** — RAM đắt hơn SSD, SSD đắt hơn object storage nhiều bậc. Dữ liệu nóng nhỏ ở RAM, lạnh lớn ở S3.
6. **Vận hành (operability)** — Team có biết vận hành store này không? Backup/restore, upgrade, monitoring, on-call. Một store "hoàn hảo về lý thuyết" mà không ai vận hành nổi là một nợ kỹ thuật.

<svg viewBox="0 0 640 250" role="img" aria-labelledby="fw-t fw-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="fw-t">Framework 6 trục chọn store</title>
<desc id="fw-d">Sáu trục đầu vào — access pattern, consistency, scale, latency, chi phí, vận hành — đi vào một bộ quyết định và cho ra loại store phù hợp</desc>
<rect x="20" y="20" width="150" height="30" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="40" text-anchor="middle" font-size="12" fill="currentColor">Access pattern</text>
<rect x="20" y="58" width="150" height="30" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="78" text-anchor="middle" font-size="12" fill="currentColor">Consistency</text>
<rect x="20" y="96" width="150" height="30" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="116" text-anchor="middle" font-size="12" fill="currentColor">Scale</text>
<rect x="20" y="134" width="150" height="30" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="154" text-anchor="middle" font-size="12" fill="currentColor">Latency (p99)</text>
<rect x="20" y="172" width="150" height="30" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="192" text-anchor="middle" font-size="12" fill="currentColor">Chi phí</text>
<rect x="20" y="210" width="150" height="30" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="230" text-anchor="middle" font-size="12" fill="currentColor">Vận hành</text>
<rect x="250" y="95" width="130" height="70" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="315" y="126" text-anchor="middle" font-size="13" fill="currentColor">Bộ quyết định</text>
<text x="315" y="145" text-anchor="middle" font-size="11" fill="currentColor">(cân đối)</text>
<line x1="170" y1="35" x2="248" y2="110" stroke="currentColor" stroke-width="1" marker-end="url(#fa)"/>
<line x1="170" y1="73" x2="248" y2="118" stroke="currentColor" stroke-width="1" marker-end="url(#fa)"/>
<line x1="170" y1="111" x2="248" y2="126" stroke="currentColor" stroke-width="1" marker-end="url(#fa)"/>
<line x1="170" y1="149" x2="248" y2="134" stroke="currentColor" stroke-width="1" marker-end="url(#fa)"/>
<line x1="170" y1="187" x2="248" y2="142" stroke="currentColor" stroke-width="1" marker-end="url(#fa)"/>
<line x1="170" y1="225" x2="248" y2="150" stroke="currentColor" stroke-width="1" marker-end="url(#fa)"/>
<rect x="455" y="60" width="165" height="30" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="537" y="80" text-anchor="middle" font-size="12" fill="currentColor">RDBMS / Document</text>
<rect x="455" y="115" width="165" height="30" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="537" y="135" text-anchor="middle" font-size="12" fill="currentColor">KV / Wide-column</text>
<rect x="455" y="170" width="165" height="30" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="537" y="190" text-anchor="middle" font-size="12" fill="currentColor">Search / TS / Graph</text>
<line x1="380" y1="120" x2="453" y2="80" stroke="currentColor" stroke-width="1" marker-end="url(#fa)"/>
<line x1="380" y1="130" x2="453" y2="130" stroke="currentColor" stroke-width="1" marker-end="url(#fa)"/>
<line x1="380" y1="140" x2="453" y2="182" stroke="currentColor" stroke-width="1" marker-end="url(#fa)"/>
<defs><marker id="fa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.3 Decision matrix — bảng chọn nhanh

| Nhu cầu / query shape | Consistency | Scale write | Store phù hợp |
|---|---|---|---|
| Giao dịch tiền, tồn kho, quan hệ + join | **Strong (ACID)** | vừa | **RDBMS** (Postgres/MySQL) |
| Đọc "cả object" theo id, schema linh hoạt | tuning được | cao | **Document** (MongoDB) |
| Tra theo key, đếm, TTL, latency micro giây | eventual/strong-per-key | rất cao | **KV/Cache** (Redis, DynamoDB) |
| Ghi log/event khổng lồ, query-first, no join | eventual | **rất cao (tuyến tính)** | **Wide-column** (Cassandra) |
| Full-text, filter facet, relevance | eventual | cao | **Search** (Elasticsearch) |
| Metric theo thời gian, rollup | eventual | cao (append) | **Time-series** (Timescale/Influx) |
| Traverse quan hệ nhiều bậc | strong | vừa | **Graph** (Neo4j) |
| File/blob lớn, backup, data lake | eventual | vô hạn, rẻ | **Object storage** (S3) |

Ví dụ số thật của một sàn TMĐT: đơn hàng (10K/phút, cần ACID) ở **Postgres**; catalog sản phẩm (đọc 500K/phút) cache ở **Redis**; tìm kiếm sản phẩm ở **Elasticsearch**; click-stream (2M event/phút) ở **Cassandra**; ảnh sản phẩm ở **S3**; dashboard doanh thu ở **Timescale**. Không store nào trong số này thay được store kia.

### 2.4 Kiến trúc một hệ polyglot

Điểm mấu chốt: chọn **một nguồn sự thật (system of record)** cho mỗi mảnh dữ liệu, các store còn lại là **bản chiếu (derived / read model)** được đồng bộ *từ* nguồn sự thật. Đừng để hai store cùng nhận quyền ghi độc lập cho *cùng* một sự thật.

<svg viewBox="0 0 640 300" role="img" aria-labelledby="ar-t ar-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="ar-t">Kiến trúc polyglot với một nguồn sự thật và các bản chiếu</title>
<desc id="ar-d">Service ghi vào Postgres là nguồn sự thật, thay đổi được CDC lan sang Redis, Elasticsearch và Cassandra làm read model</desc>
<rect x="20" y="120" width="110" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="75" y="142" text-anchor="middle" font-size="12" fill="currentColor">Service</text>
<text x="75" y="159" text-anchor="middle" font-size="11" fill="currentColor">(ghi)</text>
<line x1="130" y1="145" x2="205" y2="145" stroke="currentColor" stroke-width="1.5" marker-end="url(#aa)"/>
<rect x="210" y="115" width="130" height="60" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="275" y="140" text-anchor="middle" font-size="12" fill="currentColor">Postgres</text>
<text x="275" y="158" text-anchor="middle" font-size="11" fill="currentColor">nguồn sự thật</text>
<line x1="340" y1="145" x2="410" y2="145" stroke="currentColor" stroke-width="1.5" marker-end="url(#aa)"/>
<rect x="413" y="120" width="90" height="50" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="458" y="141" text-anchor="middle" font-size="11" fill="currentColor">CDC / Bus</text>
<text x="458" y="158" text-anchor="middle" font-size="10" fill="currentColor">(Debezium)</text>
<line x1="503" y1="135" x2="560" y2="55" stroke="currentColor" stroke-width="1" marker-end="url(#aa)"/>
<line x1="503" y1="145" x2="560" y2="145" stroke="currentColor" stroke-width="1" marker-end="url(#aa)"/>
<line x1="503" y1="155" x2="560" y2="235" stroke="currentColor" stroke-width="1" marker-end="url(#aa)"/>
<rect x="562" y="30" width="70" height="46" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="597" y="50" text-anchor="middle" font-size="11" fill="currentColor">Redis</text>
<text x="597" y="66" text-anchor="middle" font-size="9" fill="currentColor">cache</text>
<rect x="562" y="122" width="70" height="46" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="597" y="142" text-anchor="middle" font-size="10" fill="currentColor">Elastic</text>
<text x="597" y="158" text-anchor="middle" font-size="9" fill="currentColor">search</text>
<rect x="562" y="214" width="70" height="46" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="597" y="234" text-anchor="middle" font-size="10" fill="currentColor">Cassandra</text>
<text x="597" y="250" text-anchor="middle" font-size="9" fill="currentColor">analytics</text>
<text x="275" y="205" text-anchor="middle" font-size="11" fill="currentColor">Ghi đúng MỘT nơi, các store kia là bản chiếu (read model)</text>
<text x="275" y="225" text-anchor="middle" font-size="11" fill="currentColor">đồng bộ eventual qua event, không ghi song song</text>
<defs><marker id="aa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.5 Giữ đồng bộ: dual-write vì sao NGUY HIỂM

Cách "ngây thơ" nhất để đồng bộ hai store là **dual-write**: trong cùng một request, code ghi vào DB *rồi* ghi vào store thứ hai.

```python
# ANTI-PATTERN — dual-write: KHÔNG làm thế này
def place_order(order):
    db.insert(order)                 # (1) ghi Postgres — thành công
    search.index(order)              # (2) ghi Elasticsearch — có thể FAIL
    # Nếu (2) fail hoặc process crash giữa (1) và (2):
    #   Postgres CÓ đơn, Elasticsearch KHÔNG → hai store lệch nhau vĩnh viễn
```

Vấn đề cốt lõi: **không có transaction bao trùm hai hệ khác nhau**. Hai lời ghi qua mạng tới hai hệ độc lập không thể **atomic**. Các chế độ hỏng:

- Ghi (1) xong, process **crash** trước (2) → lệch.
- Ghi (1) xong, (2) **timeout/lỗi** → lệch (và nếu bạn "rollback" (1) thì lại có thể lỗi rollback).
- Hai request đồng thời ghi theo thứ tự đảo nhau ở hai store → **giá trị cuối khác nhau** (lost update ẩn).

Distributed transaction (2PC/XA) có thể "giải" trên giấy nhưng thực tế **chậm, khoá lâu, và nhiều store hiện đại không hỗ trợ** — nên gần như không ai dùng cho luồng nóng. Kết luận: **đừng dual-write.** Hãy biến "ghi 2 nơi" thành "ghi 1 nơi rồi phát sự kiện".

### 2.6 Outbox pattern — ghi atomic rồi phát sự kiện

Ý tưởng: gộp "ghi dữ liệu" và "ghi ý định phát sự kiện" vào **cùng một transaction của DB nguồn** — thứ vốn *đã* atomic. Một tiến trình riêng đọc bảng `outbox` và phát ra message bus.

```sql
-- Cùng MỘT transaction Postgres: nghiệp vụ + outbox atomic với nhau
BEGIN;
INSERT INTO orders (id, user_id, total, status)
VALUES ('o_123', 'u_9', 250000, 'PLACED');

INSERT INTO outbox (id, aggregate, event_type, payload, created_at)
VALUES (gen_random_uuid(), 'order', 'OrderPlaced',
        '{"id":"o_123","user_id":"u_9","total":250000}', now());
COMMIT;
-- Vì cùng transaction: HOẶC cả hai cùng có, HOẶC cả hai cùng không.
-- Không còn cửa sổ lệch giữa "ghi order" và "ghi ý định phát event".
```

Sau commit, một **relay** đẩy các dòng outbox lên Kafka rồi đánh dấu đã gửi (hoặc để CDC đọc luôn bảng outbox — xem 2.7). Vì message có thể được gửi lại khi relay retry, consumer phải **idempotent** (khử trùng theo `event id`):

```python
# Consumer phải idempotent — xử lý lại cùng event không được nhân đôi tác dụng
def on_event(evt):
    if seen.exists(evt.id):     # đã xử lý rồi → bỏ qua
        return
    apply(evt)                  # cập nhật read model (ES/Redis/Cassandra)
    seen.add(evt.id)            # ghi nhận (nên atomic cùng apply nếu được)
```

Outbox cho bạn **at-least-once delivery** + **thứ tự theo aggregate** — đủ tốt cho tuyệt đại đa số hệ, không cần 2PC.

### 2.7 CDC / Debezium — bắt thay đổi từ transaction log

**Change Data Capture (CDC)** đọc **transaction log** của DB (WAL của Postgres, binlog của MySQL) — chính cái log mà DB dùng để replication — và biến mỗi thay đổi hàng thành một event. **Debezium** là công cụ CDC phổ biến chạy trên Kafka Connect.

Vì sao CDC "sạch" hơn dual-write: sự kiện được **phái sinh từ chính commit đã xảy ra**, nên nó **không bao giờ báo một thay đổi chưa được persist**, và không có cửa sổ lệch giữa "ghi DB" và "phát event". Bạn chỉ cần ghi **một nơi** (DB nguồn), phần còn lại tự chảy.

```json
// Ví dụ event Debezium khi một order được UPDATE (rút gọn)
{
  "op": "u",                       // c=create, u=update, d=delete
  "source": { "table": "orders", "lsn": 456123 },
  "before": { "id": "o_123", "status": "PLACED" },
  "after":  { "id": "o_123", "status": "PAID" }
}
```

Hai kiểu triển khai thường gặp:
- **CDC trực tiếp trên bảng nghiệp vụ**: đơn giản, nhưng consumer nhận nguyên schema bảng (rò rỉ chi tiết nội bộ) và mọi thay đổi cột đều thành event.
- **Outbox + CDC (khuyến nghị)**: nghiệp vụ ghi bảng `outbox` (2.6), Debezium chỉ đọc bảng `outbox` → event là **hợp đồng do bạn chủ động thiết kế**, sạch và ổn định.

> **Chốt lựa chọn:** cần đồng bộ nhiều store và có quyền chạm DB nguồn → **outbox + CDC**. Không muốn/không thể chạy CDC → **outbox + relay tự viết**. Tuyệt đối tránh **dual-write** trên đường nóng.

### 2.8 Đồng bộ so sánh nhanh

| Cách | Atomic? | Rủi ro lệch | Độ phức tạp | Khi nào dùng |
|---|---|---|---|---|
| **Dual-write** | Không | **Cao (lệch vĩnh viễn)** | Thấp (bề ngoài) | Gần như không bao giờ |
| **2PC / XA** | Có | Thấp | Cao, chậm, khoá | Hiếm; hệ cũ bắt buộc |
| **Outbox + relay** | Có (phía nguồn) | Thấp (eventual) | Vừa | Cần độ tin cậy, tự chủ |
| **CDC / Debezium** | Có (phía nguồn) | Thấp (eventual) | Vừa–cao (hạ tầng) | Nhiều store, ETL/streaming |

### 2.9 Cái giá của polyglot: độ phức tạp vận hành

Polyglot **không miễn phí**. Mỗi store thêm vào là một khối chi phí vận hành:

- **Kiến thức vận hành nhân lên**: mỗi engine có mô hình backup/restore, tuning, upgrade, failover riêng. Team on-call phải biết N hệ thay vì 1.
- **Nhất quán eventual thành mặc định**: read model **trễ** so với nguồn (mili giây → giây). UI/UX và nghiệp vụ phải chịu được "đọc dữ liệu hơi cũ". Phải giám sát **replication lag**.
- **Chế độ hỏng lai**: nguồn ok nhưng pipeline đồng bộ chết → read model "đóng băng" âm thầm. Cần **alert theo lag**, không chỉ theo up/down.
- **Reconciliation**: eventual + at-least-once nghĩa là thỉnh thoảng vẫn lệch. Cần job **đối soát định kỳ** (so nguồn với read model, sửa chênh lệch) và khả năng **rebuild** read model từ nguồn/từ Kafka (replay).
- **Chi phí tiền + nhận thức**: nhiều cluster = nhiều tiền hạ tầng + nhiều thứ để một dev mới phải hiểu.

Nguyên tắc thực dụng: **bắt đầu với một Postgres** cho đến khi một trục cụ thể (query shape, scale, latency) thực sự đau. Postgres hiện đại làm được rất nhiều (JSONB như document, `pg_trgm`/full-text như search nhỏ, `TimescaleDB` cho time-series, `pgvector` cho vector). Chỉ tách store khi **lợi ích đo được** vượt **cái giá vận hành** ở trên. Polyglot là công cụ, không phải huy hiệu.

---

## 3. Tóm tắt
- **Không có store "một cho tất cả"**: mỗi loại tối ưu quanh một điểm đánh đổi (tổ chức dữ liệu + access pattern).
- Chọn store bằng **framework 6 trục**: access pattern & query shape (quan trọng nhất), consistency, scale, latency, chi phí, vận hành — tra nhanh bằng **decision matrix**.
- Hệ **polyglot** chọn **một nguồn sự thật** cho mỗi mảnh dữ liệu; các store khác là **read model** đồng bộ eventual từ nguồn.
- **Dual-write nguy hiểm** vì không thể atomic qua hai hệ → lệch vĩnh viễn. Dùng **outbox pattern** (ghi atomic cùng transaction rồi phát event) hoặc **CDC/Debezium** (bắt thay đổi từ transaction log); consumer phải **idempotent**.
- Polyglot trả giá bằng **độ phức tạp vận hành** (backup/restore N hệ, replication lag, reconciliation, rebuild). Chỉ tách store khi lợi ích đo được vượt cái giá đó — mặc định bắt đầu từ một Postgres.

> **Bài tiếp theo:** đi sâu vào **CQRS & event sourcing** — tách hẳn mô hình ghi khỏi mô hình đọc, và dùng chuỗi event làm nguồn sự thật để dựng lại mọi read model.
