# Hệ thống data-intensive: search & analytics

Đến đây bạn đã thiết kế những hệ thống *request/response*: client gọi, server trả lời trong vài chục mili-giây. Hệ thống **data-intensive** đảo ngược trọng tâm: không phải logic phức tạp, mà **khối lượng dữ liệu**, **tốc độ dữ liệu chảy vào** và **độ đa dạng của truy vấn** mới là thứ giết chết kiến trúc của bạn.

Bài này không có một sơ đồ "đúng". Mỗi quyết định — batch hay stream, lake hay warehouse, ETL hay ELT — là một **đánh đổi giữa latency, chi phí và độ phức tạp vận hành**. Mục tiêu của một kiến trúc sư cấp cao không phải là biết service nào, mà là biết *vì sao* chọn nó và *sẽ trả giá ở đâu*.

> 💡 Nguyên tắc: Trong hệ data, câu hỏi đầu tiên không phải "lưu ở đâu" mà là **"ai đọc, đọc kiểu gì, và chấp nhận dữ liệu cũ bao lâu?"**. Latency của *truy vấn* và độ *tươi* của dữ liệu định hình toàn bộ phần còn lại.

---

## 1. Hai trục tư duy: tốc độ xử lý & loại truy vấn

Trước khi vẽ box nào, hãy định vị bài toán trên hai trục.

**Trục 1 — Khi nào xử lý dữ liệu?**

```
  Batch  ─────────────────────────────►  Stream
  (gom lô, chạy định kỳ)              (xử lý ngay khi đến)
  latency: phút → giờ                 latency: ms → giây
  throughput cao, rẻ                  phức tạp, đắt hơn
```

**Trục 2 — Truy vấn kiểu gì?**

| Loại truy vấn | Ví dụ | Hệ phù hợp |
|---|---|---|
| Tra cứu theo key | "đơn hàng #123" | OLTP DB (Postgres, DynamoDB) |
| Tổng hợp/phân tích | "doanh thu theo vùng tháng 3" | OLAP / data warehouse |
| Tìm kiếm full-text / fuzzy | "áo thun cotton nam" | search index (OpenSearch) |
| Khám phá dữ liệu thô | "join 5 nguồn lạ, ad-hoc" | data lake + query engine |

Một sai lầm kinh điển: nhồi cả 4 loại vào *một* database. OLTP DB rất tệ ở tổng hợp triệu dòng; search index rất tệ ở transaction. **Tách workload theo loại truy vấn** là quyết định kiến trúc lớn nhất ở đây.

---

## 2. Batch vs Stream processing

### Batch
Gom dữ liệu thành lô lớn, chạy job theo lịch (mỗi giờ/ngày). Đơn giản, dễ retry (chạy lại cả lô), throughput cực cao trên dữ liệu khổng lồ.

### Stream
Xử lý từng event ngay khi đến. Latency thấp, nhưng phải lo: *out-of-order events*, *late data*, *state* (cửa sổ thời gian), và *exactly-once* khó hơn nhiều.

```
BATCH                              STREAM
  Source                            Source
    │ (gom 1 giờ)                     │ (event-by-event)
    ▼                                 ▼
 [Object store] ──► [Job]         [Queue/Log] ──► [Stream proc]
    │  Spark/EMR                      │  Kinesis + Flink/Lambda
    ▼                                 ▼
 [Warehouse]                       [Sink: DB / index / store]
```

| Tiêu chí | Batch | Stream |
|---|---|---|
| Latency | phút → giờ | ms → giây |
| Độ phức tạp | thấp | cao (state, ordering, late data) |
| Chi phí/đơn vị | rẻ | đắt hơn (luôn chạy) |
| Retry / reprocess | dễ (chạy lại lô) | khó (phải replay log) |
| Hợp với | báo cáo, ML training, billing | fraud detection, dashboard live, alert |

> ⚠️ Bẫy thiết kế: Đừng chọn stream chỉ vì nghe "real-time" sang hơn. Nếu người dùng chỉ xem báo cáo mỗi sáng, một batch job chạy 4h sáng **rẻ hơn 5–10 lần** và ít sự cố vận hành hơn. Real-time là *yêu cầu*, không phải *mặc định*.

---

## 3. Search index & inverted index

OLTP DB tìm `WHERE name LIKE '%cotton%'` phải quét toàn bảng — O(n), không có ranking, không hiểu typo. Search engine giải bằng **inverted index**.

Ý tưởng: thay vì map *document → từ*, ta map *từ → danh sách document*.

```
Documents:
  doc1: "áo thun cotton nam"
  doc2: "quần jean nam"
  doc3: "áo khoác cotton"

Inverted index (term → postings):
  áo     → [doc1, doc3]
  cotton → [doc1, doc3]
  nam    → [doc1, doc2]
  jean   → [doc2]

Query "cotton nam"  →  (doc1,doc3) ∩ (doc1,doc2) = doc1
                       + ranking theo TF-IDF / BM25
```

Tìm từ → ra ngay danh sách doc trong O(1) lookup, rồi giao/hợp các danh sách. Cộng thêm analyzer (tách từ, lowercase, bỏ dấu, stemming) và scoring (BM25) để rank theo độ liên quan.

**Khi nào dùng Elasticsearch / OpenSearch?**
- Full-text search, autocomplete, fuzzy/typo-tolerant.
- Log & observability (gom log, tìm theo thời gian + filter).
- Aggregation nhanh trên dữ liệu bán cấu trúc (facet, top-N).

**Khi nào KHÔNG dùng làm "database chính":**
- Không phải source of truth — không có transaction mạnh, không relational integrity.
- Eventual consistency: index trễ so với DB.
- Reindex tốn kém khi đổi mapping.

> 💡 Nguyên tắc: Search index là **read model**, không phải source of truth. Luôn có một DB chính làm chân lý, rồi *sync* sang index. Nếu index hỏng, ta rebuild được từ DB — đó là lý do nó được phép "eventually consistent".

---

## 4. Data lake vs Data warehouse

Cả hai chứa dữ liệu để phân tích, nhưng khác nhau ở **schema áp khi nào** và **dữ liệu thô hay đã làm sạch**.

| | Data Lake | Data Warehouse |
|---|---|---|
| Dữ liệu | thô, mọi định dạng (JSON, log, ảnh, Parquet) | đã làm sạch, có cấu trúc |
| Schema | schema-on-read (áp lúc query) | schema-on-write (áp lúc nạp) |
| Chi phí lưu | rất rẻ (object store) | đắt hơn (storage tính phí cao) |
| Truy vấn | linh hoạt, có thể chậm | tối ưu, nhanh, SQL chuẩn |
| Người dùng | data engineer, data scientist | analyst, BI, dashboard |
| Rủi ro | thành "data swamp" nếu không quản trị | cứng nhắc, khó chứa dữ liệu lạ |

Thực tế hiện đại là **lakehouse**: giữ dữ liệu thô rẻ trên lake, thêm lớp table format (Iceberg/Delta/Hudi) để có ACID + schema + time-travel, và query trực tiếp bằng SQL engine. Bạn được sự rẻ của lake và một phần kỷ luật của warehouse.

> ⚠️ Bẫy thiết kế: "Cứ đổ hết vào S3 rồi tính sau" biến lake thành **data swamp**: không ai biết bảng nào tin được, partition lung tung, query quét toàn bộ tốn tiền. Lake cần **catalog + partition + governance** ngay từ đầu, nếu không nó là nợ kỹ thuật ẩn.

---

## 5. ETL vs ELT

Cùng ba bước Extract, Transform, Load — khác ở **thứ tự Transform**.

```
ETL (cổ điển):  Extract → Transform (engine riêng) → Load vào warehouse
                 transform TRƯỚC khi nạp → warehouse chỉ chứa data sạch

ELT (cloud):    Extract → Load (data thô) → Transform (bằng chính warehouse)
                 nạp thô TRƯỚC → transform bằng SQL trong warehouse/lake
```

| | ETL | ELT |
|---|---|---|
| Transform ở đâu | engine trung gian (Spark) | trong warehouse (SQL) |
| Dữ liệu thô có giữ? | thường không | có (load trước) |
| Linh hoạt đổi logic | phải chạy lại pipeline | query lại data thô đã có |
| Hợp với | nguồn nặng, transform phức tạp, compliance lọc sớm | cloud warehouse mạnh, storage rẻ |

ELT thắng thế trong cloud vì storage rẻ và compute warehouse co giãn: cứ nạp thô, transform sau bằng SQL, và *giữ được data gốc* để reprocess khi logic đổi. ETL vẫn hợp lý khi phải lọc/ẩn dữ liệu nhạy cảm *trước* khi nó chạm warehouse (PII, compliance).

---

## 6. Lambda vs Kappa architecture

Vấn đề kinh điển: bạn cần **vừa real-time vừa chính xác lịch sử**. Hai trường phái.

### Lambda architecture — hai nhánh
```
            ┌──► Batch layer  ──► (bảng tổng hợp chính xác, trễ)
  Events ───┤                                    ┐
            └──► Speed layer  ──► (kết quả gần đúng, real-time) │
                                                  ▼
                              Serving layer (gộp batch + speed)
```
Batch layer cho con số *đúng* nhưng trễ; speed layer "vá" khoảng trống gần đây. Nhược điểm chí mạng: **viết logic hai lần** (một cho batch, một cho stream) → dễ lệch, tốn công bảo trì.

### Kappa architecture — một nhánh
```
  Events ──► [Log bền, replay được] ──► Stream processor ──► Serving
                  (Kinesis/Kafka)         (chỉ MỘT codebase)
  Cần tính lại lịch sử? → REPLAY log từ đầu qua cùng processor.
```
Chỉ một đường stream. Muốn recompute lịch sử thì *replay* lại log. Đơn giản hơn về code, nhưng đòi hỏi log **giữ đủ lâu** và stream processor **đủ mạnh để gánh cả batch khi replay**.

| | Lambda | Kappa |
|---|---|---|
| Số codebase | 2 (batch + stream) | 1 (stream) |
| Reprocess lịch sử | chạy batch layer | replay log |
| Độ phức tạp | cao (đồng bộ 2 nhánh) | trung bình (cần log bền) |
| Khi nào chọn | transform batch & stream khác nhau căn bản | logic giống nhau, muốn ít code |

> 💡 Nguyên tắc: Xu hướng hiện nay nghiêng về Kappa khi storage log đủ rẻ — *"một codebase, replay khi cần"* loại bỏ cả lớp bug do hai nhánh lệch nhau. Nhưng Lambda vẫn hợp lý khi batch dùng engine/thuật toán khác hẳn stream.

---

## 7. CDC — Change Data Capture

Câu hỏi: làm sao đưa thay đổi từ OLTP DB sang lake/warehouse/search **mà không** bắt app double-write hay chạy query `SELECT * WHERE updated_at > ?` mỗi phút (nặng và bỏ sót delete)?

CDC đọc thẳng **transaction log** của database (WAL/binlog) và phát ra từng thay đổi dưới dạng event.

```
   App  ──writes──►  Postgres
                        │ WAL (transaction log)
                        ▼
                   CDC connector  ──► [Stream/Log] ──┬──► Warehouse
                   (đọc WAL, ra                       ├──► Search index
                    INSERT/UPDATE/DELETE)             └──► Data lake
```

Lợi ích: gần real-time, không tải lên DB nguồn (đọc log, không query), bắt được cả `DELETE`, và là cách "sạch" để xây *read models* downstream. CDC là xương sống của kiến trúc event-driven và đồng bộ lake/warehouse hiện đại.

> ⚠️ Bẫy thiết kế: CDC tạo cơn lũ event khi ai đó chạy `UPDATE` triệu dòng (backfill, migration). Downstream phải chịu được spike, và *ordering theo key* phải được giữ — nếu UPDATE rồi DELETE bị xử lý ngược thứ tự, read model sẽ sai vĩnh viễn.

---

## 8. Eventual consistency & idempotency trong pipeline

Pipeline phân tán **không** cho bạn exactly-once miễn phí. Mạng timeout, consumer crash giữa chừng → message bị gửi lại. Mô hình thực tế của hầu hết hệ thống stream là **at-least-once**: thà trùng còn hơn mất.

Vậy chìa khoá để "trông như exactly-once" là **idempotency**: xử lý cùng một event hai lần cho ra *cùng kết quả*.

```
Mỗi event mang id duy nhất (event_id).
Consumer:
   if seen(event_id):  skip          # dedupe
   else:               apply; mark_seen(event_id)

Hoặc dùng UPSERT theo key thay vì INSERT:
   INSERT ... ON CONFLICT (key) DO UPDATE   # chạy lại vẫn đúng
```

Hai hệ quả phải chấp nhận và *nói rõ với stakeholder*:
- **Eventual consistency**: search index / dashboard trễ vài giây–phút so với DB chính. Ổn cho analytics, *không* ổn cho "số dư tài khoản ngay sau khi chuyển tiền".
- **Out-of-order**: events có thể đến lệch thứ tự → cần event-time + watermark, hoặc thiết kế phép cộng có tính giao hoán/idempotent.

> 💡 Nguyên tắc: Trong data pipeline, đừng cố đạt exactly-once tuyệt đối — hãy đạt **at-least-once + xử lý idempotent**. Đó là combo vừa khả thi vừa đúng, và đơn giản hơn nhiều so với two-phase commit phân tán.

---

## 9. Capacity estimation — có con số

Ước lượng cho một pipeline analytics cỡ trung: **10.000 events/giây**, mỗi event ~1 KB.

```
Throughput (peak ~2x trung bình):
  10.000 ev/s × 1 KB        = 10 MB/s ingest
  peak                       ≈ 20 MB/s
  events/ngày                = 10.000 × 86.400 ≈ 864 triệu event/ngày

Storage thô (data lake, nén Parquet ~5x):
  raw/ngày    = 864 tr × 1 KB ≈ 864 GB/ngày
  nén ~5x     ≈ 170 GB/ngày  ≈ ~5 TB/tháng  ≈ ~60 TB/năm

Số shard cần (1 shard ~1 MB/s hoặc ~1000 rec/s ingest):
  theo MB/s:  20 MB/s / 1 MB/s   = 20 shard
  theo rec/s: 20.000 / 1.000     = 20 shard   → chọn ~20–24 shard

Chi phí (định hướng, để so sánh — không phải báo giá):
  - Lưu trên object store (S3): ~vài chục USD/TB/tháng  → 60 TB rẻ
  - Quét query theo dữ liệu đọc (Athena ~$5/TB scan):
        query quét 1 TB = ~$5  → PHẠT NẶNG nếu không partition!
  - Warehouse luôn-chạy: tốn theo giờ compute, đắt nếu để 24/7
```

> 💡 Nguyên tắc: Trong analytics, **chi phí ≈ lượng dữ liệu bị quét**, không phải lượng dữ liệu được lưu. Partition theo ngày + cột Parquet + nén có thể cắt một query từ "quét 60 TB" xuống "quét 200 MB" — chênh nhau *hàng nghìn lần tiền*.

---

## 10. Chi phí của data — góc nhìn kiến trúc sư cấp cao

Data là nơi hoá đơn cloud âm thầm phình to. Bốn đòn bẩy chính:

1. **Storage tiering**: data nóng (truy vấn thường) để chuẩn; data lạnh (audit, >90 ngày) đẩy xuống tier rẻ/archive. Lifecycle policy tự động.
2. **Partition & format**: lưu Parquet/ORC (cột, nén) + partition theo `dt=YYYY-MM-DD`. Query engine chỉ quét partition liên quan → đọc ít → trả ít tiền.
3. **Tách storage & compute**: lake (storage rẻ, vô hạn) tách khỏi compute (bật khi cần, tắt khi xong). Đừng để warehouse 24/7 nếu chỉ query buổi sáng.
4. **Vòng đời dữ liệu**: không phải data nào cũng cần giữ mãi. TTL, downsample (giữ raw 30 ngày, sau đó chỉ giữ bản tổng hợp).

> ⚠️ Bẫy thiết kế: "Lưu hết, biết đâu cần" nghe vô hại vì storage rẻ — nhưng cái đắt là **mỗi query phải bơi qua đống đó**. Chi phí thật của data hoarding nằm ở *compute quét* và *độ chậm query*, không phải ở dung lượng đĩa.

---

## 11. Ghép lại: kiến trúc tham chiếu

```
                      ┌──────────► OLTP DB (source of truth, key lookup)
   Apps / Services ───┤
                      └── CDC ─┐
                               ▼
   Events / Clickstream ──► [Stream log] ──► Stream proc ──► (alert, dashboard live)
                               │  (Kinesis/Kafka)              ▲ at-least-once + idempotent
                               ▼
                          [DATA LAKE: object store, Parquet, partition]   ◄── source phân tích
                               │            │
                  ELT / batch  │            │  ad-hoc SQL trên dữ liệu thô
                               ▼            ▼
                       [WAREHOUSE]     [Query engine SQL trực tiếp lên lake]
                        (BI, report)         │
                               │             ▼
                               └──► Sync ──► [SEARCH INDEX] (full-text, log, facet)
```

Không có sơ đồ này là "đúng cho mọi nhà" — đây là *bộ khung* để bạn rút bớt theo nhu cầu. Startup nhỏ có thể chỉ cần: app → S3 (lake) → query engine SQL. Đừng dựng cả 7 hộp khi bạn chưa có vấn đề mà chúng giải quyết.

---

## 12. Cách trình bày khi phỏng vấn / review

Đi theo khung quen thuộc, nhưng nhấn vào *đặc thù data*:

1. **Requirements**: Hỏi ngay 3 câu — *(a) độ tươi cần bao nhiêu* (real-time hay daily?), *(b) ai đọc & truy vấn kiểu gì* (key lookup / aggregate / search?), *(c) volume & growth* (GB hay PB? tăng bao nhiêu/năm?). Phân biệt rõ functional vs non-functional (latency, freshness, cost).
2. **Estimation**: Nói thành tiếng con số — events/s, MB/s, GB/ngày, số shard. Người phỏng vấn muốn thấy bạn *quy mô hoá quyết định*, không chém gió.
3. **API / ingestion contract**: schema event, có `event_id` (idempotency) và `event_time` (ordering) không? Producer push hay pull?
4. **High-level design**: vẽ lake/warehouse/index, chỉ rõ *đâu là source of truth*, đâu là read model.
5. **Deep dive**: chọn MỘT chỗ khó mà đào — thường là *exactly-once vs idempotency*, *partition strategy*, hay *batch vs stream cho yêu cầu freshness này*.
6. **Bottleneck**: hot partition, query quét toàn bảng, stream processor không kịp khi replay, CDC lag khi backfill.
7. **Scale**: thêm shard, partition lại, tách compute, tiering, materialized aggregate.

> 💡 Nguyên tắc trình bày: Luôn **phát biểu đánh đổi thành lời**: "Tôi chọn ELT + lake vì storage rẻ và muốn giữ data thô để reprocess; cái giá là query có thể chậm và cần kỷ luật partition." Người review đánh giá *tư duy đánh đổi*, không phải việc bạn đọc đúng tên service.

> ⚠️ Bẫy phỏng vấn: Nhảy thẳng vào "tôi dùng Kafka + Spark + Snowflake" trước khi hỏi freshness và volume. Bạn vừa over-engineer cho một bài toán có thể chỉ cần một batch job đêm. Hỏi yêu cầu *trước*, chọn công cụ *sau*.

---

## 13. Liên hệ sang AWS

Khung tư duy ở trên ánh xạ gần như 1–1 sang dịch vụ AWS:

| Vai trò trong kiến trúc | Dịch vụ AWS | Ghi chú đánh đổi |
|---|---|---|
| Stream log / ingestion real-time | **Kinesis Data Streams** | shard-based; throughput = số shard; có replay trong retention window (hợp Kappa) |
| Data lake (storage thô, rẻ) | **S3** | source of truth cho analytics; dùng Parquet + partition + lifecycle để rẻ |
| ETL / ELT, catalog, crawler | **Glue** | serverless Spark + Data Catalog (schema cho lake); Glue Crawler dò schema |
| Query SQL trực tiếp trên lake | **Athena** | serverless, trả tiền theo TB *scan* → partition là sống còn |
| Data warehouse (BI, report) | **Redshift** | OLAP nhanh; cân nhắc Serverless để tránh trả 24/7; Spectrum query thẳng S3 |
| Search & full-text / log | **OpenSearch** | read model, eventual consistency; tốt cho log analytics & autocomplete |
| Batch lớn, Spark/Hadoop tuỳ biến | **EMR** | kiểm soát cao, hợp job nặng/đặc thù; vận hành nặng hơn Glue |

Một pipeline AWS điển hình theo Kappa-nghiêng: **clickstream → Kinesis → (Lambda/Flink xử lý stream) → S3 (lake, Parquet partition theo ngày) → Glue Catalog → Athena cho ad-hoc + Redshift cho BI; CDC từ RDS đẩy qua Kinesis để đồng bộ lake & OpenSearch.**

> 💡 Nguyên tắc cuối: Service AWS chỉ là *hộp đã đóng gói sẵn* cho các khối tư duy bạn vừa học. Khi ai đó hỏi "dùng gì", câu trả lời cấp cao luôn bắt đầu bằng *"tuỳ freshness và pattern truy vấn"* — rồi mới đến tên service. Tên service thay đổi mỗi vài năm; tư duy đánh đổi thì không.
