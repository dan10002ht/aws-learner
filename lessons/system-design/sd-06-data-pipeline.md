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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 410" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Inverted index: documents thành bảng term→postings, rồi giao postings để trả kết quả query</title>
  <desc>Ba document được lập chỉ mục ngược thành bảng term→postings (áo→doc1,doc3; cotton→doc1,doc3; nam→doc1,doc2; jean→doc2). Query "cotton nam" giao hai danh sách postings ra doc1, rồi xếp hạng bằng BM25.</desc>
  <text x="16" y="22" font-size="14" font-weight="700" fill="currentColor">Inverted index: từ → danh sách document</text>
  <text x="16" y="50" font-size="12" font-weight="700" fill="currentColor" opacity="0.8">Documents</text>
  <g>
    <rect x="16" y="60" width="200" height="34" rx="7" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="26" y="81" font-size="11.5" fill="currentColor"><tspan font-weight="700">doc1:</tspan> áo thun cotton nam</text>
    <rect x="16" y="100" width="200" height="34" rx="7" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="26" y="121" font-size="11.5" fill="currentColor"><tspan font-weight="700">doc2:</tspan> quần jean nam</text>
    <rect x="16" y="140" width="200" height="34" rx="7" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="26" y="161" font-size="11.5" fill="currentColor"><tspan font-weight="700">doc3:</tspan> áo khoác cotton</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <path d="M222 117 h36" marker-end="url(#ar3)"/>
  </g>
  <text x="240" y="110" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">index</text>
  <text x="270" y="50" font-size="12" font-weight="700" fill="currentColor" opacity="0.8">Inverted index (term → postings)</text>
  <g>
    <rect x="270" y="60" width="230" height="114" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="284" y="82" font-size="12" fill="currentColor"><tspan font-weight="700">áo</tspan>      → [doc1, doc3]</text>
    <text x="284" y="104" font-size="12" fill="currentColor"><tspan font-weight="700">cotton</tspan> → [doc1, doc3]</text>
    <text x="284" y="126" font-size="12" fill="currentColor"><tspan font-weight="700">nam</tspan>    → [doc1, doc2]</text>
    <text x="284" y="148" font-size="12" fill="currentColor"><tspan font-weight="700">jean</tspan>   → [doc2]</text>
    <text x="284" y="167" font-size="10" fill="currentColor" opacity="0.6">lookup O(1) → danh sách doc</text>
  </g>
  <g>
    <rect x="16" y="206" width="484" height="40" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="28" y="231" font-size="12.5" fill="currentColor">Query <tspan font-weight="700">"cotton nam"</tspan> → tách từ → tra 2 posting list</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <path d="M258 246 v18" marker-end="url(#ar3)"/>
  </g>
  <g>
    <rect x="120" y="276" width="290" height="44" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="265" y="296" font-size="12" text-anchor="middle" fill="currentColor">[doc1, doc3] ∩ [doc1, doc2]  =  <tspan font-weight="700">doc1</tspan></text>
    <text x="265" y="312" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">giao các posting list</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <path d="M265 322 v16" marker-end="url(#ar3)"/>
  </g>
  <g>
    <rect x="120" y="350" width="290" height="42" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="265" y="370" font-size="12" text-anchor="middle" fill="currentColor"><tspan font-weight="700">Ranking</tspan> theo TF-IDF / BM25</text>
    <text x="265" y="385" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">xếp kết quả theo độ liên quan</text>
  </g>
  <defs>
    <marker id="ar3" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>So sánh kiến trúc Lambda (hai nhánh batch + speed) và Kappa (một nhánh stream replay được)</title>
  <desc>Lambda: events tách vào batch layer (chính xác, trễ) và speed layer (gần đúng, real-time), serving layer gộp hai kết quả — hai codebase. Kappa: events vào log bền replay được, qua một stream processor duy nhất tới serving; tính lại lịch sử thì replay log.</desc>
  <text x="16" y="22" font-size="13.5" font-weight="700" fill="currentColor">Lambda — hai nhánh (batch + speed)</text>
  <g>
    <rect x="16" y="36" width="86" height="42" rx="8" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="59" y="62" font-size="12" text-anchor="middle" fill="currentColor">Events</text>
    <rect x="170" y="32" width="200" height="40" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="270" y="49" font-size="12" text-anchor="middle" fill="currentColor"><tspan font-weight="700">Batch layer</tspan></text>
    <text x="270" y="65" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">chính xác, trễ</text>
    <rect x="170" y="86" width="200" height="40" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="270" y="103" font-size="12" text-anchor="middle" fill="currentColor"><tspan font-weight="700">Speed layer</tspan></text>
    <text x="270" y="119" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">gần đúng, real-time</text>
    <rect x="440" y="59" width="200" height="42" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="540" y="77" font-size="12" text-anchor="middle" fill="currentColor"><tspan font-weight="700">Serving layer</tspan></text>
    <text x="540" y="93" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">gộp batch + speed</text>
    <g stroke="currentColor" stroke-opacity="0.5" fill="none">
      <path d="M102 52 C135 52 137 52 170 52" marker-end="url(#arL)"/>
      <path d="M102 62 C135 62 137 106 170 106" marker-end="url(#arL)"/>
      <path d="M370 52 C410 52 410 72 440 75" marker-end="url(#arL)"/>
      <path d="M370 106 C410 106 410 88 440 85" marker-end="url(#arL)"/>
    </g>
  </g>
  <text x="16" y="150" font-size="10.5" fill="currentColor" opacity="0.7">Nhược điểm: viết logic 2 lần (batch + stream) → dễ lệch, tốn bảo trì.</text>
  <line x1="16" y1="172" x2="704" y2="172" stroke="currentColor" stroke-opacity="0.15"/>
  <text x="16" y="206" font-size="13.5" font-weight="700" fill="currentColor">Kappa — một nhánh (stream replay được)</text>
  <g>
    <rect x="16" y="226" width="86" height="42" rx="8" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="59" y="252" font-size="12" text-anchor="middle" fill="currentColor">Events</text>
    <rect x="150" y="222" width="180" height="50" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="240" y="242" font-size="12" text-anchor="middle" fill="currentColor"><tspan font-weight="700">Log bền, replay được</tspan></text>
    <text x="240" y="259" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">Kinesis / Kafka</text>
    <rect x="378" y="222" width="170" height="50" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="463" y="242" font-size="12" text-anchor="middle" fill="currentColor"><tspan font-weight="700">Stream processor</tspan></text>
    <text x="463" y="259" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">chỉ MỘT codebase</text>
    <rect x="596" y="226" width="108" height="42" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="650" y="252" font-size="12" text-anchor="middle" fill="currentColor"><tspan font-weight="700">Serving</tspan></text>
    <g stroke="currentColor" stroke-opacity="0.5" fill="none">
      <path d="M102 247 h44" marker-end="url(#arL)"/>
      <path d="M330 247 h44" marker-end="url(#arL)"/>
      <path d="M548 247 h44" marker-end="url(#arL)"/>
      <path d="M463 272 v34 h-223 v-30" marker-end="url(#arL)"/>
    </g>
    <text x="352" y="324" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">REPLAY log từ đầu qua cùng processor để tính lại lịch sử</text>
  </g>
  <defs>
    <marker id="arL" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
</svg>

Lambda: batch layer cho con số *đúng* nhưng trễ; speed layer "vá" khoảng trống gần đây. Nhược điểm chí mạng: **viết logic hai lần** (một cho batch, một cho stream) → dễ lệch, tốn công bảo trì.

Kappa: chỉ một đường stream. Muốn recompute lịch sử thì *replay* lại log. Đơn giản hơn về code, nhưng đòi hỏi log **giữ đủ lâu** và stream processor **đủ mạnh để gánh cả batch khi replay**.

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 290" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Change Data Capture: App ghi vào Postgres, CDC connector đọc WAL phát event INSERT/UPDATE/DELETE, stream fan ra Warehouse, Search index và Data lake</title>
  <desc>App writes vào Postgres; Postgres ghi WAL (transaction log); CDC connector đọc WAL và phát các event INSERT/UPDATE/DELETE vào một stream log; stream fan-out tới ba đích downstream: Warehouse, Search index và Data lake.</desc>
  <text x="16" y="22" font-size="14" font-weight="700" fill="currentColor">CDC — đọc WAL, fan ra các read model</text>
  <g>
    <rect x="16" y="44" width="92" height="42" rx="8" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="62" y="70" font-size="12" text-anchor="middle" fill="currentColor">App</text>
    <rect x="156" y="38" width="130" height="54" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="221" y="58" font-size="12.5" text-anchor="middle" fill="currentColor"><tspan font-weight="700">Postgres</tspan></text>
    <text x="221" y="75" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">WAL (transaction log)</text>
    <rect x="156" y="124" width="180" height="58" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="246" y="145" font-size="12.5" text-anchor="middle" fill="currentColor"><tspan font-weight="700">CDC connector</tspan></text>
    <text x="246" y="162" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.72">đọc WAL → phát event</text>
    <text x="246" y="176" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.72">INSERT / UPDATE / DELETE</text>
    <rect x="392" y="128" width="120" height="50" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="452" y="150" font-size="12" text-anchor="middle" fill="currentColor"><tspan font-weight="700">Stream / Log</tspan></text>
    <text x="452" y="166" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">fan-out</text>
  </g>
  <g>
    <rect x="566" y="40" width="138" height="38" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="635" y="64" font-size="12" text-anchor="middle" fill="currentColor">Warehouse</text>
    <rect x="566" y="134" width="138" height="38" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="635" y="158" font-size="12" text-anchor="middle" fill="currentColor">Search index</text>
    <rect x="566" y="228" width="138" height="38" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="635" y="252" font-size="12" text-anchor="middle" fill="currentColor">Data lake</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <path d="M108 65 h44" marker-end="url(#arC)"/>
    <text x="130" y="58" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">writes</text>
    <path d="M221 92 v28" marker-end="url(#arC)"/>
    <path d="M336 153 h52" marker-end="url(#arC)"/>
    <path d="M512 153 C536 153 540 60 566 60" marker-end="url(#arC)"/>
    <path d="M512 153 h54" marker-end="url(#arC)"/>
    <path d="M512 153 C536 153 540 246 566 246" marker-end="url(#arC)"/>
  </g>
  <defs>
    <marker id="arC" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 440" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Kiến trúc tham chiếu data pipeline: Apps tới OLTP DB và qua CDC vào stream log, stream processor đổ vào data lake, ELT lên warehouse và query engine, sync sang search index</title>
  <desc>Apps/Services ghi vào OLTP DB (source of truth) và qua CDC vào stream log; events/clickstream cũng vào stream log; stream processor ra alert/dashboard live; data lake (Parquet, partition) là source phân tích; ELT/batch nạp vào Warehouse; query engine SQL chạy trực tiếp trên lake; warehouse sync sang Search index.</desc>
  <text x="16" y="22" font-size="14" font-weight="700" fill="currentColor">Kiến trúc tham chiếu (bộ khung, rút bớt theo nhu cầu)</text>
  <g>
    <rect x="16" y="40" width="150" height="46" rx="8" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="91" y="60" font-size="12" text-anchor="middle" fill="currentColor"><tspan font-weight="700">Apps / Services</tspan></text>
    <text x="91" y="76" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">+ Events / Clickstream</text>
    <rect x="240" y="36" width="180" height="46" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="330" y="56" font-size="12" text-anchor="middle" fill="currentColor"><tspan font-weight="700">OLTP DB</tspan></text>
    <text x="330" y="72" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">source of truth, key lookup</text>
    <rect x="240" y="118" width="180" height="48" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="330" y="139" font-size="12" text-anchor="middle" fill="currentColor"><tspan font-weight="700">Stream log</tspan></text>
    <text x="330" y="155" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">Kinesis / Kafka</text>
    <rect x="476" y="118" width="228" height="48" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="590" y="139" font-size="12" text-anchor="middle" fill="currentColor"><tspan font-weight="700">Stream proc</tspan> → alert, dashboard live</text>
    <text x="590" y="155" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">at-least-once + idempotent</text>
    <rect x="120" y="206" width="420" height="50" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="330" y="227" font-size="12.5" text-anchor="middle" fill="currentColor"><tspan font-weight="700">DATA LAKE</tspan> — object store, Parquet, partition</text>
    <text x="330" y="244" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">source phân tích</text>
    <rect x="86" y="300" width="200" height="50" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="186" y="321" font-size="12" text-anchor="middle" fill="currentColor"><tspan font-weight="700">WAREHOUSE</tspan></text>
    <text x="186" y="337" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">BI, report</text>
    <rect x="370" y="300" width="240" height="50" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="490" y="321" font-size="12" text-anchor="middle" fill="currentColor"><tspan font-weight="700">Query engine SQL</tspan></text>
    <text x="490" y="337" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">ad-hoc trực tiếp lên lake</text>
    <rect x="86" y="382" width="240" height="46" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="206" y="403" font-size="12" text-anchor="middle" fill="currentColor"><tspan font-weight="700">SEARCH INDEX</tspan></text>
    <text x="206" y="419" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">full-text, log, facet</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <path d="M166 56 h70" marker-end="url(#arR)"/>
    <path d="M166 72 C200 72 200 142 236 142" marker-end="url(#arR)"/>
    <text x="200" y="108" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">CDC</text>
    <path d="M330 82 C330 96 330 100 330 116" marker-end="url(#arR)"/>
    <text x="350" y="103" font-size="9.5" fill="currentColor" opacity="0.75">CDC</text>
    <path d="M420 142 h52" marker-end="url(#arR)"/>
    <path d="M330 166 v36" marker-end="url(#arR)"/>
    <path d="M260 256 C220 268 200 280 188 298" marker-end="url(#arR)"/>
    <text x="180" y="282" font-size="9.5" text-anchor="end" fill="currentColor" opacity="0.75">ELT / batch</text>
    <path d="M420 256 C460 268 480 280 490 298" marker-end="url(#arR)"/>
    <path d="M186 350 v32" marker-end="url(#arR)"/>
    <text x="206" y="370" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">sync</text>
  </g>
  <defs>
    <marker id="arR" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
</svg>

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
