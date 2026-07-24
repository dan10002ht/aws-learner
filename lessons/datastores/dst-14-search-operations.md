# Bài 14 — Elasticsearch vận hành: query DSL, aggregation, scale

## 1. Mục tiêu
Sau bài này bạn có thể:
- Viết truy vấn bằng **Query DSL** và phân biệt **query context** (tính điểm relevance) với **filter context** (yes/no, có cache).
- Dùng đúng `match` / `term` / `range` / `bool` (`must` / `should` / `filter` / `must_not`) cho từng nhu cầu.
- Gom nhóm và tổng hợp dữ liệu bằng **aggregation** (bucket `terms`/`histogram`, metric `avg`/`sum`).
- Hiểu **shard, replica, routing**, quan hệ **primary vs replica**, mô hình **near-real-time** (`refresh_interval`) và **ILM** (index lifecycle management).
- Quyết định **khi nào dùng ES vs DB** và cách **đồng bộ dữ liệu từ DB** (CDC / dual-write) — nhớ rằng ES **không phải nguồn sự thật**.

---

## 2. Lý thuyết

### 2.1 Elasticsearch là gì? — analogy "mục lục ngược của thư viện"

Hình dung một thư viện khổng lồ. Database quan hệ giống việc **đi dọc từng kệ, mở từng cuốn** để tìm cuốn có chữ "quorum" — chậm khi dữ liệu lớn. Elasticsearch làm ngược lại: nó xây sẵn một **mục lục ngược (inverted index)** — với mỗi *từ*, ghi ra *danh sách tài liệu chứa từ đó*. Muốn tìm "quorum"? Tra đúng một dòng trong mục lục, ra ngay danh sách. Đó là lý do full-text search trên ES nhanh gấp nhiều lần `LIKE '%...%'` của SQL (vốn phải quét toàn bảng).

> **Elasticsearch** là một search & analytics engine phân tán, xây trên thư viện **Lucene**. Dữ liệu là các **document JSON**, gom vào **index**; mỗi index chia thành nhiều **shard** (mỗi shard là một Lucene index độc lập) rải trên nhiều node.

Bản chất cần nhớ: ES **đánh đổi tính nhất quán tức thời và tính giao dịch** để lấy **tốc độ tìm kiếm, khả năng chấm điểm relevance, và scale ngang**. Vì vậy nó là *lớp tìm kiếm/phân tích*, không phải nơi giữ nguồn sự thật.

### 2.2 Query context vs Filter context — điểm phân biệt cốt lõi

Đây là khái niệm quan trọng nhất khi viết query. Mỗi mệnh đề (clause) chạy trong một trong hai ngữ cảnh:

| | **Query context** | **Filter context** |
|---|---|---|
| Câu hỏi trả lời | "Document này khớp *tốt tới mức nào*?" | "Document này có khớp không? yes/no" |
| Kết quả | Tính **`_score`** (relevance) | Không tính điểm |
| Cache | Thường **không** cache | **Có cache** (filter cache) → lần sau cực nhanh |
| Dùng cho | Full-text, xếp hạng theo độ liên quan | Lọc chính xác: trạng thái, khoảng giá, ngày, tag |

Quy tắc vàng: **cái gì chỉ cần lọc "đúng/sai" thì bỏ vào filter context** — vừa nhanh hơn (bỏ qua bước tính điểm) vừa được cache. Chỉ để trong query context những gì cần *ảnh hưởng đến thứ hạng*.

<svg viewBox="0 0 640 260" role="img" aria-labelledby="qf-t qf-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="qf-t">Query context vs Filter context</title>
<desc id="qf-d">Một bool query tách thành nhánh query context tính điểm và nhánh filter context chỉ trả yes hoặc no và được cache</desc>
<rect x="250" y="20" width="140" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="45" text-anchor="middle" font-size="12" fill="currentColor">bool query</text>
<line x1="290" y1="60" x2="150" y2="110" stroke="currentColor" stroke-width="1" marker-end="url(#af)"/>
<line x1="350" y1="60" x2="490" y2="110" stroke="currentColor" stroke-width="1" marker-end="url(#af)"/>
<rect x="30" y="115" width="240" height="120" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="150" y="138" text-anchor="middle" font-size="12" fill="currentColor">Query context (must, should)</text>
<text x="150" y="162" text-anchor="middle" font-size="11" fill="currentColor">Tính _score: khớp tốt tới đâu?</text>
<text x="150" y="184" text-anchor="middle" font-size="11" fill="currentColor">match tiêu đề, mô tả</text>
<text x="150" y="212" text-anchor="middle" font-size="11" fill="currentColor">Không cache, xếp hạng relevance</text>
<rect x="370" y="115" width="240" height="120" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="490" y="138" text-anchor="middle" font-size="12" fill="currentColor">Filter context (filter, must_not)</text>
<text x="490" y="162" text-anchor="middle" font-size="11" fill="currentColor">Chỉ yes/no, bỏ qua tính điểm</text>
<text x="490" y="184" text-anchor="middle" font-size="11" fill="currentColor">term status, range giá/ngày</text>
<text x="490" y="212" text-anchor="middle" font-size="11" fill="currentColor">Được CACHE → lần sau rất nhanh</text>
<defs><marker id="af" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.3 Các loại clause thường dùng

- **`match`**: full-text. Chuỗi truy vấn được **phân tích (analyzed)** — tách token, hạ chữ thường, bỏ dấu... rồi khớp từng token vào inverted index. Dùng cho trường `text`.
- **`term`**: khớp **chính xác, không phân tích**. Dùng cho trường `keyword`, số, boolean, trạng thái. ⚠️ Dùng `term` trên trường `text` thường trượt vì text đã bị analyze còn giá trị bạn đưa vào thì không.
- **`range`**: khoảng — `gte`, `lte`, `gt`, `lt` cho số và ngày.
- **`bool`**: gộp nhiều clause:
  - `must` — TẤT CẢ phải khớp, **tính điểm** (query context).
  - `should` — nên khớp; tăng điểm nếu khớp (OR mềm). Nếu không có `must`/`filter` thì mặc định cần ít nhất 1 `should` khớp.
  - `filter` — phải khớp nhưng **không tính điểm**, **có cache** (filter context).
  - `must_not` — KHÔNG được khớp, cũng chạy trong filter context.

### 2.4 Text vs Keyword — vì sao mapping quyết định query đúng/sai

Một chuỗi như `"Áo Thun Đỏ"` có thể được index theo hai kiểu cùng lúc (multi-field):
- `text`: phân tích thành `["ao","thun","do"]` → phục vụ `match` (tìm "áo thun").
- `keyword`: giữ nguyên `"Áo Thun Đỏ"` → phục vụ `term`, sort, và **aggregation**.

Đây là lý do bạn thường thấy `field` (text) và `field.keyword` (keyword) đi cùng nhau. Aggregation và sort **phải** dùng nhánh keyword; full-text search dùng nhánh text.

---

## 3. Query DSL — code thực chiến

Chuẩn bị dữ liệu mẫu (index sản phẩm):

```bash
# Tạo index với mapping rõ ràng (đừng để ES tự đoán trên production)
PUT /products
{
  "settings": { "number_of_shards": 3, "number_of_replicas": 1 },
  "mappings": {
    "properties": {
      "name":     { "type": "text" },
      "category": { "type": "keyword" },
      "status":   { "type": "keyword" },
      "price":    { "type": "double" },
      "rating":   { "type": "float" },
      "created":  { "type": "date" }
    }
  }
}
```

Ví dụ **bool** kết hợp cả hai context — mẫu 90% truy vấn thực tế:

```bash
GET /products/_search
{
  "query": {
    "bool": {
      "must": [
        { "match": { "name": "áo thun cotton" } }   // query context: tính _score
      ],
      "should": [
        { "match": { "name": "premium" } }            // khớp thì cộng điểm, không bắt buộc
      ],
      "filter": [
        { "term":  { "category": "clothing" } },       // filter: yes/no, được cache
        { "term":  { "status":   "active"   } },
        { "range": { "price": { "gte": 100000, "lte": 500000 } } }
      ],
      "must_not": [
        { "term": { "status": "discontinued" } }       // loại bỏ, filter context
      ]
    }
  },
  "sort": [ "_score", { "created": "desc" } ],
  "size": 20
}
```

Giải thích: người dùng gõ "áo thun cotton" → `must.match` chọn document liên quan và **xếp hạng theo relevance**. Các bộ lọc danh mục/trạng thái/giá nằm trong `filter` nên **không kéo điểm và được cache** — lần lọc "clothing + active" sau sẽ ăn cache, phản hồi mili giây.

`term` vs `match` — cùng dữ liệu, kết quả khác nhau:

```bash
# ĐÚNG: term trên keyword (khớp chính xác trạng thái)
GET /products/_search
{ "query": { "term": { "status": "active" } } }

# SAI phổ biến: term trên trường text đã bị analyze -> thường 0 kết quả
GET /products/_search
{ "query": { "term": { "name": "Áo Thun Đỏ" } } }   // name đã tách token, "Áo Thun Đỏ" nguyên khối không match

# ĐÚNG cho text: dùng match
GET /products/_search
{ "query": { "match": { "name": "áo thun đỏ" } } }
```

---

## 4. Aggregation — phân tích, không chỉ tìm kiếm

Aggregation biến ES thành công cụ analytics. Hai họ chính:
- **Bucket**: chia document thành nhóm (giống `GROUP BY`). Ví dụ `terms` (nhóm theo giá trị), `date_histogram` / `histogram` (nhóm theo khoảng).
- **Metric**: tính một con số trên tập document. Ví dụ `avg`, `sum`, `min`, `max`, `cardinality` (đếm distinct).

Metric có thể **lồng trong bucket** — tính chỉ số cho từng nhóm.

```bash
# Đếm sản phẩm theo category, và giá trung bình mỗi category
GET /products/_search
{
  "size": 0,                        // không cần document, chỉ cần số liệu tổng hợp
  "aggs": {
    "by_category": {
      "terms": { "field": "category", "size": 10 },   // bucket: nhóm theo keyword
      "aggs": {
        "avg_price":   { "avg": { "field": "price" } },  // metric lồng trong bucket
        "total_value": { "sum": { "field": "price" } }    // tổng giá trị của nhóm
      }
    }
  }
}
```

`size: 0` là mẹo quan trọng: ta chỉ cần con số tổng hợp, không cần trả về document → nhẹ và nhanh hơn nhiều.

Histogram theo thời gian (đếm đơn theo ngày) — nền tảng của mọi dashboard:

```bash
GET /products/_search
{
  "size": 0,
  "aggs": {
    "per_day": {
      "date_histogram": {
        "field": "created",
        "calendar_interval": "day"
      },
      "aggs": {
        "revenue": { "sum": { "field": "price" } }
      }
    }
  }
}
```

⚠️ Nhớ: aggregation `terms` phải chạy trên trường **keyword** (hoặc số), không phải `text`. Trên `text` sẽ lỗi (cần bật `fielddata`, rất tốn RAM — tránh).

---

## 5. Kiến trúc scale: shard, replica, routing

### 5.1 Shard & replica

Một index quá lớn cho một máy → ES **cắt index thành nhiều shard**, mỗi shard giữ một phần document và có thể nằm trên node khác nhau → **scale ngang** cả dung lượng lẫn thông lượng.

- **Primary shard**: bản gốc nhận ghi. Số primary **cố định lúc tạo index** (không đổi được sau đó — muốn đổi phải reindex). Ví dụ trên đặt `number_of_shards: 3`.
- **Replica shard**: bản sao của primary, đặt trên node **khác** primary. Vai trò kép: **HA** (primary chết, replica được promote thành primary) và **tăng throughput đọc** (đọc/search chia đều primary + replica). Số replica **đổi được động**.

<svg viewBox="0 0 640 300" role="img" aria-labelledby="sh-t sh-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="sh-t">Phân bố primary và replica shard trên ba node</title>
<desc id="sh-d">Index ba primary shard mỗi cái có một replica được rải sao cho primary và replica của cùng shard không nằm chung node</desc>
<rect x="20" y="60" width="180" height="200" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="110" y="82" text-anchor="middle" font-size="12" fill="currentColor">Node 1</text>
<rect x="45" y="100" width="130" height="40" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="110" y="125" text-anchor="middle" font-size="11" fill="currentColor">P0 (primary)</text>
<rect x="45" y="160" width="130" height="40" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="110" y="185" text-anchor="middle" font-size="11" fill="currentColor">R1 (replica)</text>
<rect x="230" y="60" width="180" height="200" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="82" text-anchor="middle" font-size="12" fill="currentColor">Node 2</text>
<rect x="255" y="100" width="130" height="40" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="125" text-anchor="middle" font-size="11" fill="currentColor">P1 (primary)</text>
<rect x="255" y="160" width="130" height="40" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="185" text-anchor="middle" font-size="11" fill="currentColor">R2 (replica)</text>
<rect x="440" y="60" width="180" height="200" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="530" y="82" text-anchor="middle" font-size="12" fill="currentColor">Node 3</text>
<rect x="465" y="100" width="130" height="40" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="530" y="125" text-anchor="middle" font-size="11" fill="currentColor">P2 (primary)</text>
<rect x="465" y="160" width="130" height="40" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="530" y="185" text-anchor="middle" font-size="11" fill="currentColor">R0 (replica)</text>
<text x="320" y="240" text-anchor="middle" font-size="11" fill="currentColor">Primary Pn và replica Rn của cùng shard không bao giờ chung node</text>
</svg>

### 5.2 Routing — document đi vào shard nào?

ES quyết định shard bằng công thức mặc định:

```
shard = hash(_routing) % number_of_primary_shards
```

Mặc định `_routing` = `_id` của document. Vì mẫu số là **số primary shard**, đổi số này sẽ làm hàm hash trỏ sai → đó là lý do **không đổi được số primary sau khi tạo** (phải reindex sang index mới).

Bạn có thể **custom routing** để gom document liên quan vào cùng shard (ví dụ routing theo `user_id`) → search theo user chỉ chạm 1 shard thay vì tất cả, nhanh hơn nhiều:

```bash
# Ghi với routing tùy chỉnh
PUT /orders/_doc/1001?routing=user-42
{ "user_id": "user-42", "total": 250000 }

# Search chỉ trên shard của user đó
GET /orders/_search?routing=user-42
{ "query": { "term": { "user_id": "user-42" } } }
```

### 5.3 Near-real-time & refresh interval

ES **không** hiển thị document ngay khi ghi. Vòng đời: ghi vào **in-memory buffer** + **translog** (để bền), rồi định kỳ **refresh** đẩy buffer thành một **segment** Lucene mới → lúc đó document mới **searchable**. Mặc định `refresh_interval` = **1 giây** → đây chính là nghĩa "near-real-time": có độ trễ ~1s giữa ghi và tìm thấy.

```bash
# Bulk index lớn: tắt refresh để tăng throughput, bật lại + refresh khi xong
PUT /products/_settings
{ "index": { "refresh_interval": "-1" } }
# ... chạy bulk ...
PUT /products/_settings
{ "index": { "refresh_interval": "1s" } }
POST /products/_refresh
```

Đây là đòn bẩy hiệu năng lớn: mỗi lần refresh tạo segment tốn CPU/IO; với batch load, tắt refresh có thể tăng tốc gấp nhiều lần.

### 5.4 ILM — Index Lifecycle Management

Với log/metric/event ghi liên tục, một index khổng lồ vĩnh viễn là ác mộng. Mẫu chuẩn: **time-based indices** (`logs-2026.07.24`) qua một **rollover alias**, và **ILM policy** tự động chuyển index qua các phase theo tuổi/kích thước:

- **hot**: đang ghi + search nhiều → node mạnh, SSD.
- **warm**: ngừng ghi, còn search → giảm replica, force-merge segment.
- **cold**: ít truy vấn → node rẻ, có thể freeze.
- **delete**: hết hạn lưu → xóa index.

```bash
PUT _ilm/policy/logs-policy
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": { "max_size": "50gb", "max_age": "1d" }
        }
      },
      "warm": {
        "min_age": "2d",
        "actions": {
          "forcemerge": { "max_num_segments": 1 },
          "set_priority": { "priority": 50 }
        }
      },
      "delete": {
        "min_age": "30d",
        "actions": { "delete": {} }
      }
    }
  }
}
```

Rollover tự cắt index mới khi đạt 50GB hoặc 1 ngày → không index nào phình vô hạn; xóa tự động sau 30 ngày → chi phí lưu trữ trong tầm kiểm soát.

---

## 6. Khi nào ES vs DB, và đồng bộ dữ liệu

### 6.1 Chọn công cụ

| Nhu cầu | Nên dùng |
|---|---|
| Giao dịch ACID, join, ràng buộc, nguồn sự thật | **Database** (Postgres/MySQL) |
| Đọc theo primary key, ghi tần suất cao, chính xác tức thời | **Database** |
| Full-text search, relevance ranking, gợi ý, autocomplete | **Elasticsearch** |
| Aggregation/analytics trên nhiều chiều, dashboard log/metric | **Elasticsearch** |
| Lọc + tìm kiếm phức tạp trên hàng chục triệu bản ghi | **Elasticsearch** |

Nguyên tắc kiến trúc: **DB giữ nguồn sự thật, ES là bản sao đã tối ưu cho đọc/tìm kiếm.** ES **không** có giao dịch đa document, không bền như DB về nghĩa nguồn sự thật, và có thể bị mất/lệch dữ liệu khi reindex — nên **không bao giờ để ES là nơi duy nhất chứa dữ liệu quan trọng**.

### 6.2 Đồng bộ DB → ES: hai cách

**Dual-write** (ứng dụng ghi cả hai): đơn giản nhưng nguy hiểm — ghi DB thành công, ghi ES lỗi → hai bên lệch, không có tính nguyên tử giữa hai hệ thống. Chỉ tạm chấp nhận với hệ nhỏ, và cần cơ chế reconcile.

**CDC (Change Data Capture)** — cách được ưa dùng: đọc **transaction log** của DB (binlog MySQL / WAL Postgres) qua công cụ như **Debezium**, đẩy thay đổi vào **Kafka**, một consumer index vào ES. Ưu điểm: ES bám sát DB, ứng dụng không cần biết tới ES, và nếu ES chết ta chỉ cần **replay** từ Kafka/CDC để dựng lại — vì **nguồn sự thật vẫn là DB**.

<svg viewBox="0 0 660 200" role="img" aria-labelledby="cdc-t cdc-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="cdc-t">Luồng đồng bộ dữ liệu từ database sang Elasticsearch qua CDC</title>
<desc id="cdc-d">Ứng dụng ghi vào database, Debezium đọc transaction log đẩy vào Kafka, consumer index vào Elasticsearch dùng cho tìm kiếm</desc>
<rect x="20" y="75" width="110" height="50" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="75" y="105" text-anchor="middle" font-size="12" fill="currentColor">App (ghi)</text>
<line x1="130" y1="100" x2="165" y2="100" stroke="currentColor" stroke-width="1.5" marker-end="url(#ac)"/>
<rect x="168" y="70" width="120" height="60" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="228" y="95" text-anchor="middle" font-size="12" fill="currentColor">Database</text>
<text x="228" y="115" text-anchor="middle" font-size="10" fill="currentColor">nguồn sự thật</text>
<line x1="288" y1="100" x2="325" y2="100" stroke="currentColor" stroke-width="1.5" marker-end="url(#ac)"/>
<text x="306" y="90" text-anchor="middle" font-size="9" fill="currentColor">binlog/WAL</text>
<rect x="328" y="70" width="120" height="60" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="388" y="95" text-anchor="middle" font-size="11" fill="currentColor">Debezium</text>
<text x="388" y="115" text-anchor="middle" font-size="10" fill="currentColor">-> Kafka</text>
<line x1="448" y1="100" x2="485" y2="100" stroke="currentColor" stroke-width="1.5" marker-end="url(#ac)"/>
<rect x="488" y="70" width="150" height="60" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="563" y="95" text-anchor="middle" font-size="12" fill="currentColor">Elasticsearch</text>
<text x="563" y="115" text-anchor="middle" font-size="10" fill="currentColor">bản sao để search</text>
<text x="330" y="165" text-anchor="middle" font-size="11" fill="currentColor">ES chết -> replay từ Kafka/CDC để dựng lại; DB không hề mất dữ liệu</text>
<defs><marker id="ac" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Vài lưu ý vận hành khi đồng bộ:
- **Idempotent index**: dùng chính khóa DB làm `_id` của document → replay nhiều lần không tạo bản trùng (ghi đè đúng document).
- **Bulk API**: gom nhiều thao tác một request, đừng index từng document một khi throughput cao.
- **Reindex an toàn**: khi đổi mapping, tạo index mới + `_reindex`, rồi trỏ **alias** sang index mới (zero-downtime) thay vì sửa tại chỗ.

```bash
# Idempotent bulk: dùng id của DB làm _id, index (upsert) an toàn khi replay
POST /products/_bulk
{ "index": { "_id": "1001" } }
{ "name": "Áo thun cotton", "category": "clothing", "status": "active", "price": 199000 }
{ "index": { "_id": "1002" } }
{ "name": "Quần jeans",     "category": "clothing", "status": "active", "price": 450000 }
```

---

## 7. Tóm tắt
- **Query context** tính `_score` (relevance, không cache); **filter context** chỉ yes/no, **được cache** — cái gì chỉ cần lọc thì đưa vào `filter`/`must_not`.
- `match` = full-text (analyzed, trường `text`); `term` = khớp chính xác (trường `keyword`/số); `range` = khoảng; `bool` gộp `must`/`should`/`filter`/`must_not`.
- **Aggregation**: bucket (`terms`, `date_histogram`) chia nhóm, metric (`avg`, `sum`) tính số — metric lồng trong bucket; luôn chạy trên **keyword/số**, dùng `size: 0`.
- **Shard** cho scale ngang (số primary cố định lúc tạo, routing = `hash(_id) % primaries`); **replica** cho HA + tăng đọc; ES **near-real-time** (`refresh_interval` ~1s); **ILM** tự động hot→warm→cold→delete.
- **DB là nguồn sự thật, ES là bản sao tối ưu đọc/tìm kiếm.** Đồng bộ ưu tiên **CDC (Debezium→Kafka)** hơn dual-write; index idempotent theo khóa DB để replay an toàn.

> **Bài tiếp theo:** đi sâu vào relevance scoring (BM25), analyzer/tokenizer tùy chỉnh cho tiếng Việt, và tối ưu mapping cho autocomplete.
