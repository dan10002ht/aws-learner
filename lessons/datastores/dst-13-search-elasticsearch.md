# Bài 13 — Search: Elasticsearch — inverted index & relevance

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **vì sao `LIKE '%...%'` trong database vừa chậm vừa không xếp hạng** kết quả.
- Hiểu bản chất **inverted index** — cấu trúc lật ngược "term → danh sách document" khiến full-text search nhanh.
- Nắm vai trò của **analyzer** (tokenizer + token filter: lowercase, stemming, stopword) trong cả lúc index và lúc query.
- Hiểu **relevance scoring** bằng trực giác: **TF-IDF** và **BM25** — vì sao tài liệu này đứng trên tài liệu kia.
- Phân biệt **mapping / document / `_source`**, và biết khác nhau giữa **Elasticsearch và OpenSearch** (fork).
- Chạy được: tạo index có analyzer, nạp document, và search có xếp hạng.

---

## 2. Lý thuyết

### 2.1 Vấn đề: tại sao database "tìm chữ" lại tệ?

Hình dung một cuốn sách 800 trang. Bạn muốn tìm từ "quorum". Có hai cách:

1. **Lật từng trang, đọc từng dòng** cho tới khi thấy chữ "quorum". Với 800 trang thì cực lâu.
2. **Mở phần Index (mục lục tra cứu) ở cuối sách** — nơi liệt kê `quorum → trang 41, 233, 512`. Nhảy thẳng tới đúng trang.

`SELECT * FROM docs WHERE body LIKE '%quorum%'` chính là **cách 1**. Database phải **quét tuần tự (full scan)** từng dòng, so khớp chuỗi con. Vì mẫu bắt đầu bằng `%`, **index B-tree thông thường vô dụng** (B-tree chỉ giúp khi biết *tiền tố*, ví dụ `LIKE 'quo%'`). Kết quả: độ phức tạp **O(N × độ dài văn bản)**, chậm tuyến tính theo số bản ghi.

Nhưng chậm mới chỉ là một nửa vấn đề. `LIKE` còn **ngu về ngôn ngữ và không xếp hạng**:

| Điều người dùng mong đợi | `LIKE '%...%'` làm được? |
|--------------------------|--------------------------|
| Tìm "running" ra cả "run", "ran" (stemming) | Không — chỉ khớp chuỗi thô |
| Không phân biệt hoa/thường một cách thông minh | Phải tự `LOWER()`, vẫn thô |
| Bỏ qua từ vô nghĩa "the", "và", "is" (stopword) | Không |
| Khớp "New York" khớp cả "york new"? cụm từ? gần nhau? | Không |
| **Xếp hạng**: tài liệu nào *liên quan nhất* lên đầu | **Không — chỉ có match/không match** |
| Gõ sai "elasticsarch" vẫn ra kết quả (fuzzy) | Không |

Đây là lý do sinh ra **search engine** chuyên dụng như Elasticsearch: nó xây một **inverted index** để tra cực nhanh, chạy văn bản qua **analyzer** để hiểu ngôn ngữ, và **chấm điểm relevance** để xếp hạng.

### 2.2 Inverted index — trái tim của full-text search

Một database bình thường lưu theo hướng **document → nội dung**:

```
doc1 → "the quick brown fox"
doc2 → "the lazy brown dog"
```

**Inverted index** lật ngược lại: với mỗi **term** (từ đã chuẩn hoá), lưu **danh sách document chứa nó** (gọi là **postings list**), kèm vị trí/tần suất:

<svg viewBox="0 0 660 300" role="img" aria-labelledby="ii-t ii-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="ii-t">Inverted index: term ánh xạ tới postings list</title>
<desc id="ii-d">Ba document được phân tích thành các term, mỗi term trỏ tới danh sách các document chứa nó cùng tần suất</desc>
<text x="30" y="30" font-size="13" fill="currentColor">Documents</text>
<rect x="20" y="42" width="200" height="30" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="30" y="62" font-size="12" fill="currentColor">doc1: the quick brown fox</text>
<rect x="20" y="80" width="200" height="30" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="30" y="100" font-size="12" fill="currentColor">doc2: the lazy brown dog</text>
<rect x="20" y="118" width="200" height="30" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="30" y="138" font-size="12" fill="currentColor">doc3: quick brown quick</text>
<line x1="230" y1="95" x2="290" y2="95" stroke="currentColor" stroke-width="1.5" marker-end="url(#ar)"/>
<text x="235" y="88" font-size="10" fill="currentColor">analyze</text>
<text x="330" y="30" font-size="13" fill="currentColor">Inverted index (term → postings)</text>
<rect x="310" y="42" width="330" height="30" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="62" font-size="12" fill="currentColor">brown  → doc1(1), doc2(1), doc3(1)</text>
<rect x="310" y="80" width="330" height="30" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="100" font-size="12" fill="currentColor">quick  → doc1(1), doc3(2)</text>
<rect x="310" y="118" width="330" height="30" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="138" font-size="12" fill="currentColor">fox    → doc1(1)</text>
<rect x="310" y="156" width="330" height="30" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="176" font-size="12" fill="currentColor">lazy   → doc2(1)</text>
<rect x="310" y="194" width="330" height="30" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="214" font-size="12" fill="currentColor">dog    → doc2(1)</text>
<text x="320" y="252" font-size="11" fill="currentColor">"the" bị stopword filter loại bỏ — không vào index</text>
<text x="320" y="272" font-size="11" fill="currentColor">Số trong ngoặc = term frequency (số lần xuất hiện trong doc)</text>
<defs><marker id="ar" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Khi tìm `brown`, engine **không quét gì cả** — nó nhảy thẳng tới key `brown` trong index (tra bằng cấu trúc dạng dictionary/FST) và đọc ngay postings list `[doc1, doc2, doc3]`. Đây là **O(1) để tra term + O(số kết quả)**, thay vì O(N) quét toàn bảng. Muốn tìm cụm `quick brown`? Engine lấy postings của `quick` và của `brown` rồi **giao (intersect)** hai danh sách — vì postings được lưu **sắp xếp theo doc id**, phép giao chạy tuyến tính rất nhanh.

> **Bản chất cần nhớ:** inverted index đánh đổi **thời gian ghi (index chậm hơn, tốn dung lượng)** lấy **thời gian đọc/tìm nhanh khủng khiếp**. Trong Elasticsearch, mỗi **shard** là một index Lucene độc lập; index này **bất biến (immutable segment)** — ghi mới tạo segment mới rồi merge nền, nên đọc không bao giờ bị khoá bởi ghi.

### 2.3 Analyzer — biến văn bản thô thành term

Câu hỏi mấu chốt: **"the Quick BROWN Foxes"** phải thành những term nào để `brown` và `fox` tìm ra nó? Trả lời: chạy qua **analyzer**. Analyzer là một pipeline 3 tầng:

<svg viewBox="0 0 660 210" role="img" aria-labelledby="an-t an-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="an-t">Pipeline của analyzer trong Elasticsearch</title>
<desc id="an-d">Văn bản thô đi qua character filter, tokenizer, rồi token filter để tạo ra các term cuối cùng đưa vào inverted index</desc>
<rect x="15" y="80" width="120" height="50" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="75" y="100" text-anchor="middle" font-size="11" fill="currentColor">Văn bản thô</text>
<text x="75" y="118" text-anchor="middle" font-size="10" fill="currentColor">"the Quick BROWN Foxes"</text>
<line x1="135" y1="105" x2="165" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<rect x="168" y="80" width="110" height="50" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="223" y="100" text-anchor="middle" font-size="11" fill="currentColor">Tokenizer</text>
<text x="223" y="118" text-anchor="middle" font-size="10" fill="currentColor">tách theo khoảng trắng</text>
<line x1="278" y1="105" x2="308" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<rect x="311" y="70" width="130" height="70" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="376" y="90" text-anchor="middle" font-size="11" fill="currentColor">Token filters</text>
<text x="376" y="108" text-anchor="middle" font-size="10" fill="currentColor">lowercase</text>
<text x="376" y="123" text-anchor="middle" font-size="10" fill="currentColor">stopword + stemming</text>
<line x1="441" y1="105" x2="471" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<rect x="474" y="80" width="170" height="50" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="559" y="100" text-anchor="middle" font-size="11" fill="currentColor">Terms vào index</text>
<text x="559" y="118" text-anchor="middle" font-size="10" fill="currentColor">[quick, brown, fox]</text>
<text x="330" y="175" text-anchor="middle" font-size="11" fill="currentColor">"the" bị loại (stopword), "Foxes" → "fox" (stemming), chữ hạ thường (lowercase)</text>
<defs><marker id="a2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

- **Character filter** (tuỳ chọn): xử lý ký tự trước khi tách — ví dụ bỏ thẻ HTML `<p>`, đổi `&` → `and`.
- **Tokenizer**: cắt chuỗi thành **token**. `standard` tokenizer tách theo ranh giới từ (khoảng trắng, dấu câu). "the Quick BROWN Foxes" → `[the, Quick, BROWN, Foxes]`.
- **Token filters** (chạy nối tiếp, thứ tự quan trọng):
  - **lowercase**: `Quick → quick`, `BROWN → brown` — để tìm không phân biệt hoa thường.
  - **stopword**: bỏ các từ quá phổ biến, ít giá trị phân biệt (`the`, `a`, `is`, `và`, `của`) — giảm kích thước index và nhiễu.
  - **stemming**: đưa từ về gốc — `foxes → fox`, `running → run`, `better` (một số stemmer) → `good`. Nhờ đó gõ "run" khớp cả "running", "ran".

**Nguyên tắc vàng — hay bị sai:** cùng một analyzer phải áp dụng cho **cả lúc index lẫn lúc query**. Nếu lúc index bạn stem "Foxes" → "fox" nhưng lúc query lại không stem, gõ "foxes" sẽ **không khớp** vì trong index chỉ có term "fox". Elasticsearch mặc định dùng cùng analyzer cho cả hai; bạn chỉ tách ra khi cố ý (ví dụ dùng `search_analyzer` riêng cho synonym).

### 2.4 Relevance scoring — vì sao doc này trên doc kia

Khi một query khớp 10.000 document, thứ tự hiển thị là **tất cả**. Elasticsearch chấm mỗi document một điểm `_score` (số thực) rồi sắp giảm dần. Trực giác dựa trên ba đại lượng:

- **TF (Term Frequency)** — term xuất hiện **càng nhiều lần trong một document** thì document đó **càng liên quan**. Doc nhắc "elasticsearch" 8 lần liên quan hơn doc nhắc 1 lần.
- **IDF (Inverse Document Frequency)** — term **càng hiếm trong toàn bộ collection** thì **càng có giá trị phân biệt**. Từ "the" xuất hiện ở mọi doc → gần như vô dụng để xếp hạng (IDF thấp); từ "quorum" hiếm → khớp nó rất đáng giá (IDF cao).
- **Field length (chuẩn hoá độ dài)** — term khớp trong một field **ngắn** (tiêu đề 5 từ) đáng giá hơn khớp trong field **dài** (bài viết 2000 từ), vì mật độ liên quan cao hơn.

**TF-IDF** cổ điển: điểm ≈ `TF × IDF`. Đơn giản nhưng có một khuyết điểm: TF tăng **tuyến tính** không giới hạn — doc nhồi từ khoá 100 lần sẽ có điểm gấp 100 lần doc nhắc 1 lần, dễ bị **keyword stuffing**.

**BM25** (Best Matching 25 — mặc định của Elasticsearch/Lucene từ v5) sửa đúng chỗ đó:

| Đặc điểm | TF-IDF | **BM25** |
|----------|--------|----------|
| Ảnh hưởng của TF | Tuyến tính, không chặn | **Bão hoà** — thêm lần lặp thứ 10 gần như không tăng điểm |
| Chuẩn hoá độ dài field | Thô sơ | Tinh chỉnh được qua tham số `b` |
| Tham số điều chỉnh | Không | `k1` (độ bão hoà TF), `b` (mức phạt độ dài) |
| Chống spam từ khoá | Kém | **Tốt** |

Trực giác BM25: lần xuất hiện đầu tiên của term giá trị **rất cao**, lần thứ hai thêm ít hơn, tới lần thứ 20 thì gần như **phẳng** (đường cong bão hoà). Điều này khớp cảm nhận con người: một bài nhắc "redis" 20 lần **không** liên quan gấp 20 lần bài nhắc 1 lần — nó chỉ liên quan hơn *một chút*. Mặc định `k1 = 1.2`, `b = 0.75` chạy tốt cho hầu hết trường hợp; hiếm khi cần chỉnh.

> **Lưu ý phân tán:** IDF được tính **trên từng shard** (mặc định), không toàn cục. Với dataset lớn phân bố đều thì sai khác không đáng kể; nếu cần chính xác tuyệt đối, dùng `search_type=dfs_query_then_fetch` để gom thống kê toàn cục trước khi chấm điểm.

### 2.5 Mapping, document và `_source`

Ba khái niệm hay lẫn:

- **Document**: đơn vị dữ liệu, một object JSON (một sản phẩm, một bài viết, một log line). Tương đương "một dòng" nhưng dạng JSON lồng nhau.
- **Mapping**: **schema** của index — khai báo mỗi field có **kiểu gì** và **được analyze ra sao**. Đây là quyết định quan trọng nhất:
  - **`text`**: được chạy qua analyzer → vào inverted index → dùng cho **full-text search** (khớp mờ, có scoring). *Không* dùng để sort/aggregate.
  - **`keyword`**: **không** analyze, lưu nguyên chuỗi → dùng cho **lọc chính xác, sort, aggregation, facet** (ví dụ `status = "active"`, group theo `category`).
  - Một field thường khai báo **cả hai** (multi-field): `title` là `text` để search, `title.raw` là `keyword` để sort. Chọn sai kiểu là lỗi kinh điển khiến "sort không được" hoặc "search không ra".
- **`_source`**: Elasticsearch **lưu lại nguyên văn JSON gốc** bạn gửi vào, trong field ẩn `_source`. Inverted index chỉ chứa *term* (đã băm nát, không tái tạo lại văn bản gốc) để **tìm**; còn `_source` là bản gốc để **trả về** cho client sau khi tìm thấy. Hai vai trò tách biệt: index để match/score, `_source` để hiển thị. (Có thể tắt `_source` để tiết kiệm dung lượng, nhưng khi đó mất khả năng reindex và trả full document.)

### 2.6 Elasticsearch vs OpenSearch

Cả hai đều xây trên thư viện **Apache Lucene** (Lucene mới thật sự chứa inverted index và BM25; Elasticsearch/OpenSearch là lớp phân tán + REST API bọc quanh).

Năm **2021**, Elastic đổi giấy phép Elasticsearch từ **Apache 2.0 (open source thật)** sang **SSPL/Elastic License** (nguồn mở hạn chế, chặn nhà cung cấp cloud bán dịch vụ managed). Phản ứng lại, **AWS fork** Elasticsearch 7.10 (bản Apache 2.0 cuối cùng) và tạo **OpenSearch** — giữ Apache 2.0. Từ đó hai nhánh **rẽ đường**:

| Tiêu chí | **Elasticsearch** (Elastic) | **OpenSearch** (AWS/Linux Foundation) |
|----------|------------------------------|----------------------------------------|
| Nguồn gốc | Bản gốc | Fork từ ES 7.10 (2021) |
| Giấy phép | Elastic License / SSPL (v9 thêm lại AGPL) | **Apache 2.0** thuần |
| Ngôn ngữ query | Query DSL, ES\|QL, EQL | Query DSL, PPL, tương thích phần lớn |
| Hệ sinh thái UI | Kibana | OpenSearch Dashboards (fork Kibana) |
| Tính năng mới | Nhanh, dẫn dắt (vector search, ES\|QL) | Bám sát, cộng đồng-driven |
| Managed điển hình | Elastic Cloud | Amazon OpenSearch Service |

Thực tế: **API và khái niệm gần như giống nhau** tới ES 7.10 (client cũ chạy được cả hai). Từ ES 8+ chúng phân kỳ dần — client Elasticsearch 8+ có kiểm tra phía server và **không** trỏ thẳng vào OpenSearch được. Chọn cái nào tuỳ **ràng buộc giấy phép** (SSPL có chấp nhận được không) và **nhà cung cấp cloud** (trên AWS thì OpenSearch tiện tích hợp hơn).

---

## 3. Thực hành: tạo index, nạp document, search

Dưới đây dùng REST API (chạy được trên cả Elasticsearch và OpenSearch bản tương thích).

```bash
# Chạy nhanh một node dev bằng Docker (tắt security cho gọn — CHỈ để học)
docker run --name es -p 9200:9200 -d \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  docker.elastic.co/elasticsearch/elasticsearch:8.13.0
```

**Bước 1 — tạo index với mapping và analyzer.** Ta khai báo `title`/`body` là `text` (full-text) và `category` là `keyword` (lọc/sort):

```json
PUT /articles
{
  "settings": {
    "analysis": {
      "analyzer": {
        "my_english": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "english_stop", "english_stemmer"]
        }
      },
      "filter": {
        "english_stop":    { "type": "stop",     "stopwords": "_english_" },
        "english_stemmer": { "type": "stemmer",  "language": "english" }
      }
    }
  },
  "mappings": {
    "properties": {
      "title":    { "type": "text", "analyzer": "my_english" },
      "body":     { "type": "text", "analyzer": "my_english" },
      "category": { "type": "keyword" },
      "views":    { "type": "integer" }
    }
  }
}
```

**Bước 2 — nạp document** (JSON gốc sẽ được giữ trong `_source`):

```json
POST /articles/_doc/1
{ "title": "Running Elasticsearch fast",
  "body":  "The quick brown fox runs. Elasticsearch indexes text quickly.",
  "category": "database", "views": 120 }

POST /articles/_doc/2
{ "title": "A lazy guide to search",
  "body":  "The lazy dog sleeps while search engines run inverted indexes.",
  "category": "database", "views": 40 }
```

**Bước 3 — kiểm tra analyzer** (rất hữu ích để debug "vì sao không khớp"):

```json
POST /articles/_analyze
{ "analyzer": "my_english", "text": "The Quick Running Foxes" }
# → terms: [quick, run, fox]   ("the" bị loại, "Running"→"run", "Foxes"→"fox")
```

**Bước 4 — search full-text có xếp hạng.** Gõ "runs" vẫn khớp "Running/runs" nhờ stemming:

```json
GET /articles/_search
{
  "query": {
    "match": { "body": "running fox" }
  }
}
```

Kết quả (rút gọn) — chú ý `_score` giảm dần và `_source` là JSON gốc:

```json
{ "hits": {
    "max_score": 1.89,
    "hits": [
      { "_id": "1", "_score": 1.89,
        "_source": { "title": "Running Elasticsearch fast", "views": 120, "...": "..." } },
      { "_id": "2", "_score": 0.62,
        "_source": { "title": "A lazy guide to search", "views": 40, "...": "..." } }
    ] } }
```

doc1 điểm cao hơn vì chứa cả `run` lẫn `fox`, còn doc2 chỉ khớp `run`.

**Bước 5 — kết hợp lọc chính xác (keyword) với full-text (bool query):** lọc cứng `category` bằng `filter` (không tính điểm, cache được → nhanh), tìm chữ bằng `must` (có tính điểm):

```json
GET /articles/_search
{
  "query": {
    "bool": {
      "must":   { "match": { "body": "search engine" } },
      "filter": { "term":  { "category": "database" } }
    }
  }
}
```

Đây là mẫu phổ biến nhất: **`filter` cho điều kiện đúng/sai** (rẻ, cache), **`must`/`should` cho phần cần relevance**. Nếu để `category` là `text` thay vì `keyword`, `term` filter sẽ khớp trượt (vì "Database" đã bị lowercase thành "database" trong index) — đó là lý do phải chọn đúng kiểu field ngay từ mapping.

---

## 4. Tóm tắt
- `LIKE '%...%'` phải **full scan O(N)**, không dùng được index, **không hiểu ngôn ngữ** và **không xếp hạng** — sai công cụ cho full-text search.
- **Inverted index** lật "document → text" thành **"term → postings list"**, biến tìm kiếm thành tra dictionary + giao danh sách → nhanh khủng khiếp; đổi lại ghi tốn hơn và index bất biến (immutable segment).
- **Analyzer** = character filter + **tokenizer** + **token filter** (lowercase, stopword, stemming) biến văn bản thô thành term; phải **dùng cùng analyzer khi index và khi query**.
- **Relevance**: **TF** (nhiều lần → liên quan hơn), **IDF** (term hiếm → giá trị hơn), **field length**. **BM25** hơn TF-IDF nhờ **bão hoà TF** (`k1`) và **phạt độ dài** (`b`) — chống nhồi từ khoá; là mặc định.
- **Mapping** là schema chọn `text` (analyze, search, score) vs `keyword` (nguyên văn, filter/sort/aggregate); **`_source`** giữ JSON gốc để trả về, tách biệt với term trong index dùng để match.
- **Elasticsearch vs OpenSearch**: cùng nền Lucene; OpenSearch là fork Apache 2.0 của AWS (2021) do Elastic đổi sang SSPL/Elastic License. API gần giống tới ES 7.10, phân kỳ dần từ ES 8+.

> **Bài tiếp theo:** đi từ full-text sang **vector search / semantic search** — tìm theo *ý nghĩa* bằng embedding và ANN, và cách kết hợp với BM25 thành **hybrid search**.
