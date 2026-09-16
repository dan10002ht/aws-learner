# SAA Ch2.6 — Data Ingestion & Analytics

> Mục tiêu: Phủ **task statement TS5 của Domain 3** — thu thập (ingestion) và phân tích (analytics) dữ liệu ở quy mô lớn. Nắm chắc **Kinesis Data Streams vs Firehose vs Managed Service for Apache Flink** (và vs MSK/SQS), pipeline **data lake** (S3 → Glue → Athena/Redshift → QuickSight), và các bảng decision exam hay bẫy: **Redshift vs Athena vs EMR**, **csv vs Parquet**. (Góc *decoupling* của Kinesis đã học ở resilient-01; ở đây là góc *ingestion & analytics*.)

---

## 1. Câu chuyện mở đầu — "phân tích 10 tỷ log/ngày"

Một sản phẩm sinh **hàng tỷ clickstream/log mỗi ngày**. Yêu cầu: (a) nạp dữ liệu real-time vào kho, (b) phân tích ad-hoc bằng SQL, (c) dashboard cho business. Bạn của bạn định "đổ hết vào RDS rồi query". Sai ở đâu?

> RDS (OLTP, row-based) sẽ gục trước khối lượng ghi streaming + quét phân tích. Cần **pipeline chuyên biệt**: ingestion (Kinesis) → lưu cột hoá (S3 Parquet) → query (Athena/Redshift) → BI (QuickSight).

Đây là dạng câu hỏi exam: cho một luồng dữ liệu + yêu cầu (real-time? near-real-time? ad-hoc? dashboard?), hỏi bạn ghép dịch vụ nào.

---

## 2. Streaming ingestion — họ Kinesis

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 250" role="img" aria-labelledby="ki-t ki-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="ki-t">Chọn dịch vụ streaming Kinesis</title>
<desc id="ki-d">Phân nhánh Kinesis Data Streams, Firehose, Managed Service for Apache Flink theo nhu cầu</desc>
<rect x="280" y="12" width="160" height="38" rx="8" fill="currentColor" fill-opacity="0.10" stroke="currentColor"/>
<text x="360" y="36" text-anchor="middle" font-size="13" fill="currentColor">Streaming data?</text>
<rect x="20" y="95" width="210" height="60" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="125" y="116" text-anchor="middle" font-size="12" fill="currentColor">Data Streams</text>
<text x="125" y="134" text-anchor="middle" font-size="10" fill="currentColor">custom real-time, replay,</text>
<text x="125" y="148" text-anchor="middle" font-size="10" fill="currentColor">nhiều consumer, giữ 1-365 ngày</text>
<rect x="255" y="95" width="210" height="60" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="116" text-anchor="middle" font-size="12" fill="currentColor">Data Firehose</text>
<text x="360" y="134" text-anchor="middle" font-size="10" fill="currentColor">deliver near-real-time vào</text>
<text x="360" y="148" text-anchor="middle" font-size="10" fill="currentColor">S3/Redshift/OpenSearch, no-code</text>
<rect x="490" y="95" width="210" height="60" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="595" y="116" text-anchor="middle" font-size="12" fill="currentColor">Managed Flink</text>
<text x="595" y="134" text-anchor="middle" font-size="10" fill="currentColor">phân tích/biến đổi trong luồng</text>
<text x="595" y="148" text-anchor="middle" font-size="10" fill="currentColor">(SQL/Apache Flink, windowing)</text>
<line x1="330" y1="50" x2="150" y2="93" stroke="currentColor" stroke-width="1"/>
<line x1="360" y1="50" x2="360" y2="93" stroke="currentColor" stroke-width="1"/>
<line x1="390" y1="50" x2="570" y2="93" stroke="currentColor" stroke-width="1"/>
<rect x="255" y="185" width="210" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="205" text-anchor="middle" font-size="11" fill="currentColor">Cần Kafka API / hệ Kafka sẵn?</text>
<text x="360" y="221" text-anchor="middle" font-size="11" fill="currentColor">→ Amazon MSK</text>
<text x="360" y="248" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.85">Firehose = đường ống nạp lười · Data Streams = xử lý tùy biến · Flink = tính toán trong luồng</text>
</svg>

### 2.1 Kinesis Data Streams
- **Ingest real-time** với thông lượng cao; **giữ dữ liệu 1–365 ngày** → nhiều consumer đọc **độc lập** (mỗi consumer giữ offset riêng), có thể **replay**.
- Cần **bạn viết consumer** (Lambda, KCL app...) để xử lý.
- Đơn vị mở rộng = **shard** (1MB/s ghi, 2MB/s đọc mỗi shard); **on-demand** mode tự scale.

### 2.2 Kinesis Data Firehose
- **Đường ống nạp "lười"**: tự động **buffer + deliver** vào **S3, Redshift, OpenSearch, Splunk** — **không cần quản lý consumer/shard**.
- **Near-real-time** (buffer theo size/time, tối thiểu ~60s), có thể **convert sang Parquet/ORC** và transform bằng Lambda ngay trong đường ống.
- Không có replay, không giữ dữ liệu — nạp xong là xong.

### 2.3 Managed Service for Apache Flink (Kinesis Data Analytics cũ)
- **Phân tích/biến đổi ngay trong luồng** bằng SQL hoặc Apache Flink: windowing, aggregate, anomaly detection real-time.

> 🪤 Bẫy thi: *"nạp streaming data vào S3/Redshift near-real-time, ít vận hành nhất"* → **Firehose**. *"nhiều app xử lý real-time độc lập + replay được"* → **Data Streams**. *"tính toán cửa sổ thời gian trong luồng"* → **Managed Flink**. *"đã có hệ Kafka / cần Kafka API"* → **MSK**.

---

## 3. MSK vs Kinesis Data Streams, và Enhanced Fan-Out

### 3.1 Amazon MSK (Managed Streaming for Apache Kafka)

MSK chạy **Apache Kafka thật** (AWS quản broker, ZooKeeper/KRaft, patching, multi-AZ) — nên client dùng **đúng Kafka API/protocol**: `kafka-console-producer`, Kafka Connect, Kafka Streams, Spark Structured Streaming, Debezium CDC… đều cắm thẳng vào, **không phải viết lại code**. Đó là lý do duy nhất nhưng rất mạnh để chọn MSK: **đã có hệ Kafka on-prem cần lift-and-shift**, hoặc **bắt buộc dùng thư viện/ecosystem Kafka**.

- Đơn vị song song = **partition** (bạn tự chọn số partition/topic), khác Kinesis dùng **shard** có hạn mức cứng.
- **MSK Serverless**: không phải chọn broker size / số broker, tự scale theo throughput — dùng khi tải khó đoán.
- **MSK Connect**: chạy Kafka Connect connector managed (sink sang S3, OpenSearch…).
- Kích thước message mặc định của Kafka là **1 MB**, nhưng **cấu hình được** (`message.max.bytes`) — Kinesis thì **1 MB/record là trần cứng, không đổi được**. Đề hay dùng chi tiết "message lớn hơn 1 MB" để đẩy về MSK.
- **Retention**: Kafka giữ theo cấu hình (có thể **vô hạn** với tiered storage); Kinesis Data Streams tối đa **365 ngày**.

### 3.2 Bảng quyết định MSK vs Kinesis Data Streams

| | **Kinesis Data Streams** | **Amazon MSK** |
|--|--------------------------|----------------|
| API | API riêng của AWS (PutRecord / KCL / Lambda ESM) | **Apache Kafka API** chuẩn |
| Đơn vị scale | **Shard**: 1 MB/s ghi, 2 MB/s đọc mỗi shard | **Partition**: tự chọn số lượng, tự tune |
| Vận hành | Serverless nhất (nhất là **on-demand mode**) | Phải chọn broker/size (trừ MSK Serverless), vẫn phải hiểu Kafka |
| Trần record | **1 MB/record, cứng** | Mặc định 1 MB, **cấu hình tăng được** |
| Retention | 1–365 ngày | Cấu hình tự do, có tiered storage giữ rất lâu |
| Khi nào chọn | Mặc định trên AWS: nhanh, ít vận hành, tích hợp sẵn Firehose/Lambda/Flink | **Đã có Kafka**, cần Kafka Connect/Streams/Debezium, cần message > 1 MB |
| Bẫy | Thêm consumer mà không bật EFO → tranh nhau 2 MB/s (xem §3.3) | Chọn MSK chỉ vì "streaming" trong khi đề không hề nhắc Kafka → thừa vận hành |

> 🪤 Bẫy thi: đề **không** nhắc chữ *Kafka*, *Kafka Connect*, *migrate cụm Kafka on-prem* mà bạn chọn MSK thì thường sai — mặc định của exam là **Kinesis** vì "ít vận hành nhất".

### 3.3 Enhanced Fan-Out (EFO) — khi nhiều consumer tranh nhau một shard

**Standard consumer** dùng mô hình **pull**: gọi `GetRecords` theo chu kỳ. Vấn đề là mỗi shard chỉ có **2 MB/s đọc** và **5 lần gọi `GetRecords`/giây** — và con số đó **chia chung cho TẤT CẢ consumer** của shard đó. Ba ứng dụng cùng đọc → mỗi bên thực tế còn ~0,67 MB/s, và càng nhiều consumer thì càng dễ ăn `ProvisionedThroughputExceededException`, độ trễ đọc thường ~**200 ms** trở lên (chưa kể phải chờ lượt poll).

**Enhanced Fan-Out** đổi sang mô hình **push**: consumer **đăng ký** (`RegisterStreamConsumer`) rồi mở kết nối HTTP/2 bằng `SubscribeToShard`, Kinesis **chủ động đẩy** record về.

- Mỗi **EFO consumer** có **2 MB/s riêng trên mỗi shard** — không chia với ai. 5 consumer = 5 × 2 MB/s trên cùng shard.
- Tối đa **20 EFO consumer đã đăng ký cho mỗi stream**.
- Độ trễ trung bình xuống khoảng **70 ms** (HTTP/2 push, không phải chờ poll).
- Đánh đổi: **trả thêm tiền** theo consumer-shard-hour + GB dữ liệu đẩy ra.

| | **Standard consumer** | **Enhanced Fan-Out** |
|--|-----------------------|----------------------|
| Mô hình | Pull (`GetRecords`, 5 lần/giây/shard) | Push (`SubscribeToShard`, HTTP/2) |
| Băng thông đọc | **2 MB/s dùng CHUNG cho mọi consumer** của shard | **2 MB/s RIÊNG cho từng consumer**, mỗi shard |
| Độ trễ điển hình | ~200 ms trở lên | ~**70 ms** |
| Số consumer hợp lý | 1–2 | tới **20 consumer đăng ký/stream** |
| Chi phí | Đã gồm trong giá shard | Tính thêm per consumer-shard-hour + per GB |
| Khi nào chọn | Ít consumer, latency không gắt | **Nhiều app đọc cùng lúc** hoặc cần latency thấp và ổn định |

> 🪤 Bẫy thi: đề tả *"thêm ứng dụng consumer thứ ba thì các consumer cũ bị chậm / bị throttle, không được tăng số shard"* → **bật Enhanced Fan-Out**, **không** phải "thêm shard" (thêm shard tốn tiền mà vẫn chia chung băng thông) và cũng không phải "chuyển sang Firehose".

---

## 4. Athena — SQL serverless truy vấn thẳng S3

- Chạy **SQL (Presto/Trino)** trực tiếp trên file ở S3, **serverless**, **trả tiền theo lượng dữ liệu quét** (per TB scanned).
- Không cần load vào DB — hợp **ad-hoc / không thường xuyên**.
- **Tối ưu cost cực mạnh** bằng **cột hoá + partition** (xem §5).

> 💡 Athena tính tiền theo **GB quét**. Chuyển CSV → **Parquet** (columnar, nén) + **partition theo ngày** có thể giảm **>90%** dữ liệu quét → rẻ hơn & nhanh hơn nhiều.

### 4.1 CSV vs Parquet (rất hay ra đề)
| | CSV/JSON (row) | **Parquet/ORC (columnar)** |
|--|----------------|----------------------------|
| Đọc vài cột | Quét cả dòng | Chỉ đọc cột cần → ít IO |
| Nén | Kém | Rất tốt (nén theo cột) |
| Cost Athena/Spectrum | Cao | Thấp (quét ít hơn) |
| Hợp cho | Ghi/nhập thô | **Phân tích/OLAP** |

---

## 5. AWS Glue — ETL serverless + Data Catalog

- **Glue Data Catalog**: kho metadata trung tâm (schema, partition) — Athena/Redshift Spectrum/EMR đều dùng chung.
- **Glue Crawler**: tự quét S3, suy ra schema, tạo table trong Catalog.
- **Glue ETL** (Spark serverless): biến đổi dữ liệu — ví dụ **CSV → Parquet**, làm sạch, join — không quản server.

---

## 6. Data warehouse & big-data engines

### 6.1 Amazon Redshift
- **Data warehouse** columnar MPP cho **phân tích phức tạp trên dữ liệu có cấu trúc, lặp lại** (BI, báo cáo).
- **Redshift Spectrum**: query thẳng dữ liệu S3 (Parquet) mà không load vào cluster.
- **Redshift Serverless** cho workload biến động/ad-hoc (không nuôi cluster 24/7).

### 6.2 Amazon EMR
- Cụm **Hadoop/Spark/Hive/Presto** managed cho **big-data xử lý nặng, tùy biến** (ML, transform khối lượng lớn, framework Hadoop cụ thể).

### 6.3 Redshift vs Athena vs EMR — bảng quyết định

| | **Redshift** | **Athena** | **EMR** |
|--|-------------|-----------|---------|
| Mô hình | Data warehouse (cluster/serverless) | Query serverless trên S3 | Cụm Hadoop/Spark |
| Hợp khi | BI/báo cáo **lặp lại**, join phức tạp, cần hiệu năng ổn định | Ad-hoc, **thỉnh thoảng**, không muốn quản gì | **Custom** big-data (Spark/Hadoop framework), ML, transform nặng |
| Chi phí | Trả cluster (hoặc serverless) | Per-TB quét | Trả cụm khi chạy |
| Vận hành | Vừa | Thấp nhất | Cao nhất |

> 🪤 Bẫy thi: *"query S3 thỉnh thoảng, không muốn hạ tầng"* → **Athena**. *"BI dashboard chạy hằng ngày, nhiều join"* → **Redshift**. *"cần Apache Spark/Hadoop cụ thể"* → **EMR**.

---

## 7. Amazon OpenSearch Service — search & log analytics near-real-time

Athena hợp với "quét cả đống file S3 bằng SQL, thỉnh thoảng". Nhưng khi yêu cầu là **tìm kiếm full-text** hoặc **soi log vừa xảy ra vài giây trước trên dashboard**, Athena chậm và đắt vì mỗi lần hỏi là mỗi lần quét lại S3. Đó là chỗ của **OpenSearch Service** (ELK managed).

- Dữ liệu được **index** trước → truy vấn **near-real-time** (thường trong vài giây sau khi nạp), hợp cho **log analytics, observability, full-text search, dashboard cập nhật liên tục** với **OpenSearch Dashboards** (Kibana cũ).
- Đường nạp chuẩn trong pipeline: **Firehose → OpenSearch**, hoặc **CloudWatch Logs subscription filter → Lambda/Firehose → OpenSearch**, hoặc **OpenSearch Ingestion** (pipeline managed kiểu Data Prepper).
- **Chi phí theo cluster chạy 24/7** (data node + master node), không phải per-query như Athena → hạ giá bằng **UltraWarm** và **cold storage** cho index cũ ít truy cập, index nóng để trên hot node.
- **OpenSearch Serverless**: collection kiểu *time series* (log) hoặc *search*, tính theo OCU — dùng khi tải bập bênh, không muốn sizing node.
- Bảo mật: đặt domain **trong VPC** (không public endpoint), fine-grained access control, encryption at rest/in transit.

### 7.1 OpenSearch vs Athena vs Kendra

| | **OpenSearch Service** | **Athena** | **Kendra** |
|--|------------------------|-----------|-----------|
| Bản chất | Search/analytics engine **có index** | SQL serverless **quét thẳng S3** | **Enterprise search bằng ML**, hỏi bằng câu tự nhiên |
| Truy vấn | Full-text, filter, aggregation, dashboard | SQL (Presto/Trino) ad-hoc | Câu hỏi ngôn ngữ tự nhiên → trả **câu trả lời**, không chỉ danh sách link |
| Độ trễ dữ liệu | Near-real-time (vài giây) | Theo file đã nằm ở S3 | Theo lịch sync của connector |
| Chi phí | Cluster chạy liên tục (hoặc OCU serverless) | **Per-TB quét** | Theo **index-hour** của edition (Developer/Enterprise) |
| Từ khoá đề | *"log analytics"*, *"Kibana/dashboard real-time"*, *"full-text search"* | *"ad-hoc SQL trên S3"*, *"không muốn hạ tầng"* | *"nhân viên hỏi bằng ngôn ngữ tự nhiên"*, *"tìm trong tài liệu nội bộ SharePoint/S3"* |
| Bẫy | Dùng OpenSearch làm nơi lưu trữ dài hạn thay S3 → đắt; hãy để index cũ sang UltraWarm/cold | Dùng Athena làm dashboard refresh mỗi phút → tiền quét S3 phình to | Nhầm Kendra với OpenSearch khi đề nhấn *"natural language"* |

> 🪤 Bẫy thi: *"search bar cho người dùng gõ từ khoá, kết quả tức thì"* → **OpenSearch**. *"nhân viên hỏi 'chính sách nghỉ phép thế nào?' trên kho tài liệu nội bộ"* → **Kendra**. *"analyst chạy SQL vài lần một tuần trên log S3"* → **Athena**.

---

## 8. Lake Formation & QuickSight

- **AWS Lake Formation**: dựng & **phân quyền tập trung** cho **data lake** trên S3 + Glue Catalog (permission theo bảng/cột/hàng), thay vì rải rác IAM/bucket policy. Từ khoá: *"central fine-grained access cho data lake"*.
- **Amazon QuickSight**: **BI serverless** — dashboard, **SPICE** (in-memory tăng tốc), ML Insights. Từ khoá: *"dashboard/BI cho business users, serverless"*.

---

## 9. Pipeline data lake điển hình (end-to-end)

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 170" role="img" aria-labelledby="dl-t dl-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dl-t">Pipeline data lake analytics</title>
<desc id="dl-d">Nguồn qua Kinesis vào S3 raw, Glue ETL sang Parquet curated, Athena hoặc Redshift query, QuickSight hiển thị</desc>
<rect x="10" y="60" width="110" height="48" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="65" y="80" text-anchor="middle" font-size="11" fill="currentColor">Nguồn →</text>
<text x="65" y="96" text-anchor="middle" font-size="10" fill="currentColor">Kinesis/Firehose</text>
<rect x="150" y="60" width="110" height="48" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="205" y="80" text-anchor="middle" font-size="11" fill="currentColor">S3 (raw)</text>
<text x="205" y="96" text-anchor="middle" font-size="10" fill="currentColor">CSV/JSON</text>
<rect x="290" y="60" width="120" height="48" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="80" text-anchor="middle" font-size="11" fill="currentColor">Glue ETL +</text>
<text x="350" y="96" text-anchor="middle" font-size="10" fill="currentColor">Crawler/Catalog</text>
<rect x="440" y="60" width="120" height="48" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="500" y="80" text-anchor="middle" font-size="11" fill="currentColor">S3 (curated)</text>
<text x="500" y="96" text-anchor="middle" font-size="10" fill="currentColor">Parquet</text>
<rect x="590" y="34" width="120" height="44" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="650" y="53" text-anchor="middle" font-size="11" fill="currentColor">Athena /</text>
<text x="650" y="69" text-anchor="middle" font-size="10" fill="currentColor">Redshift</text>
<rect x="590" y="92" width="120" height="44" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="650" y="111" text-anchor="middle" font-size="11" fill="currentColor">QuickSight</text>
<text x="650" y="127" text-anchor="middle" font-size="10" fill="currentColor">dashboard/BI</text>
<line x1="120" y1="84" x2="148" y2="84" stroke="currentColor" stroke-width="1.5" marker-end="url(#da)"/>
<line x1="260" y1="84" x2="288" y2="84" stroke="currentColor" stroke-width="1.5" marker-end="url(#da)"/>
<line x1="410" y1="84" x2="438" y2="84" stroke="currentColor" stroke-width="1.5" marker-end="url(#da)"/>
<line x1="560" y1="78" x2="588" y2="62" stroke="currentColor" stroke-width="1.5" marker-end="url(#da)"/>
<line x1="560" y1="90" x2="588" y2="106" stroke="currentColor" stroke-width="1.5" marker-end="url(#da)"/>
<text x="360" y="158" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.85">Lake Formation phân quyền tập trung toàn bộ data lake trên S3 + Glue Catalog</text>
<defs><marker id="da" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

---

## 10. Bảng chọn dịch vụ AI/ML — nhóm hay ra đề nhất mà dễ bỏ

Exam SAA không bắt bạn train model, chỉ bắt **nhận ra dịch vụ managed nào giải đúng bài toán** để khỏi tự dựng hạ tầng ML. Gần như luôn là một API gọi được, không server.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 210" role="img" aria-labelledby="ai-t ai-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="ai-t">Chọn dịch vụ AI managed theo loại dữ liệu đầu vào</title>
<desc id="ai-d">Ảnh và video dùng Rekognition, tài liệu scan dùng Textract, giọng nói dùng Transcribe hoặc Polly, văn bản dùng Comprehend Translate Kendra Lex, trường hợp còn lại dùng SageMaker</desc>
<rect x="270" y="8" width="180" height="34" rx="8" fill="currentColor" fill-opacity="0.10" stroke="currentColor"/>
<text x="360" y="30" text-anchor="middle" font-size="12" fill="currentColor">Đầu vào là gì?</text>
<rect x="8" y="80" width="126" height="62" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="71" y="100" text-anchor="middle" font-size="11" fill="currentColor">Ảnh / video</text>
<text x="71" y="118" text-anchor="middle" font-size="10" fill="currentColor">Rekognition</text>
<text x="71" y="133" text-anchor="middle" font-size="9" fill="currentColor">nhận diện mặt, vật thể</text>
<rect x="150" y="80" width="126" height="62" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="213" y="100" text-anchor="middle" font-size="11" fill="currentColor">Tài liệu scan</text>
<text x="213" y="118" text-anchor="middle" font-size="10" fill="currentColor">Textract</text>
<text x="213" y="133" text-anchor="middle" font-size="9" fill="currentColor">text + form + table</text>
<rect x="292" y="80" width="126" height="62" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="355" y="100" text-anchor="middle" font-size="11" fill="currentColor">Giọng nói</text>
<text x="355" y="118" text-anchor="middle" font-size="10" fill="currentColor">Transcribe / Polly</text>
<text x="355" y="133" text-anchor="middle" font-size="9" fill="currentColor">audio↔text</text>
<rect x="434" y="80" width="126" height="62" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="497" y="100" text-anchor="middle" font-size="11" fill="currentColor">Văn bản</text>
<text x="497" y="118" text-anchor="middle" font-size="10" fill="currentColor">Comprehend/Translate</text>
<text x="497" y="133" text-anchor="middle" font-size="9" fill="currentColor">Kendra · Lex</text>
<rect x="576" y="80" width="136" height="62" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="644" y="100" text-anchor="middle" font-size="11" fill="currentColor">Bài toán riêng</text>
<text x="644" y="118" text-anchor="middle" font-size="10" fill="currentColor">SageMaker</text>
<text x="644" y="133" text-anchor="middle" font-size="9" fill="currentColor">tự train / host model</text>
<line x1="300" y1="42" x2="90" y2="78" stroke="currentColor" stroke-width="1"/>
<line x1="330" y1="42" x2="220" y2="78" stroke="currentColor" stroke-width="1"/>
<line x1="360" y1="42" x2="355" y2="78" stroke="currentColor" stroke-width="1"/>
<line x1="390" y1="42" x2="490" y2="78" stroke="currentColor" stroke-width="1"/>
<line x1="420" y1="42" x2="630" y2="78" stroke="currentColor" stroke-width="1"/>
<text x="360" y="176" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.85">Có dịch vụ managed khớp bài toán → chọn nó; chỉ rơi về SageMaker khi không cái nào khớp</text>
<text x="360" y="196" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.85">Ghép nhiều dịch vụ là hợp lệ: Transcribe → Translate → Polly, hay Textract → Comprehend</text>
</svg>

### 10.1 Bảng quyết định

| Dịch vụ | Làm gì | Khi nào chọn (từ khoá đề) | Bẫy |
|---------|--------|---------------------------|-----|
| **Rekognition** | Phân tích **ảnh/video**: nhận diện vật thể, khuôn mặt, celebrity, **content moderation**, so khớp mặt; có cả video streaming | *"lọc ảnh phản cảm do user upload"*, *"nhận diện khuôn mặt"*, *"đếm người trong video"* | Có `DetectText` nhưng chỉ hợp **chữ ngắn trong ảnh** (biển số, biển hiệu) — **không** dùng để bóc hoá đơn/biểu mẫu |
| **Textract** | **OCR tài liệu**: trích **text + key-value của form + bảng** từ PDF/ảnh scan; API chuyên biệt `AnalyzeExpense` (hoá đơn), `AnalyzeID` (giấy tờ tuỳ thân) | *"trích dữ liệu từ hoá đơn/đơn bảo hiểm scan"*, *"số hoá form giấy giữ được cấu trúc bảng"* | Nhầm với Rekognition; Textract **giữ quan hệ trường–giá trị**, Rekognition chỉ trả chuỗi rời |
| **Transcribe** | **Speech → text**, có speaker diarization, custom vocabulary, **lọc/ẩn PII**, transcribe real-time | *"tạo phụ đề cho video"*, *"ghi lại nội dung cuộc gọi call center"* | Đề nói *"dịch cuộc gọi sang tiếng khác"* → phải ghép **Transcribe + Translate**, không có dịch vụ đơn lẻ nào làm cả hai |
| **Polly** | **Text → speech** giọng tự nhiên (neural), SSML, **Speech Marks** để đồng bộ môi/phụ đề | *"đọc bài báo thành audio"*, *"trợ lý phát thoại"* | Ngược chiều với Transcribe — đọc kỹ chiều mũi tên trong đề |
| **Translate** | **Dịch máy** neural giữa các ngôn ngữ, custom terminology | *"đưa nội dung ra nhiều ngôn ngữ"*, *"dịch review của khách"* | Chỉ dịch, **không** phân tích ý nghĩa/cảm xúc |
| **Comprehend** | **NLP**: sentiment, entity, key phrase, ngôn ngữ, topic modeling, **phát hiện PII**; bản **Comprehend Medical** cho hồ sơ y tế | *"phân tích cảm xúc review của khách hàng"*, *"tự động gắn nhãn chủ đề ticket support"*, *"tìm PII trong văn bản"* | Đề chỉ cần *tìm tài liệu* chứ không *hiểu nội dung* → là Kendra/OpenSearch, không phải Comprehend |
| **Kendra** | **Enterprise search bằng ML**: hỏi bằng **câu tự nhiên**, trả về câu trả lời; connector sẵn cho S3, SharePoint, Salesforce, RDS… | *"nhân viên hỏi bằng ngôn ngữ tự nhiên trên kho tài liệu nội bộ"*, *"tìm trong wiki nội bộ mà không cần biết từ khoá chính xác"* | Không phải OpenSearch: OpenSearch là **search engine bạn tự index và tự viết query**, Kendra là **hỏi–đáp có sẵn ML** (xem §7.1) |
| **Lex** | **Chatbot** hội thoại (chính engine của Alexa): intent, slot, tích hợp Lambda để gọi backend; ghép Connect làm IVR | *"chatbot đặt lịch/hỗ trợ khách"*, *"IVR tổng đài"* | Lex lo hội thoại, **logic nghiệp vụ vẫn là Lambda của bạn** |
| **Fraud Detector** | Phát hiện **gian lận online**: tài khoản giả, thanh toán bất thường — train bằng lịch sử giao dịch của chính bạn | *"chặn đăng ký tài khoản giả"*, *"chấm điểm rủi ro giao dịch real-time"* | Đừng chọn SageMaker khi đề mô tả đúng bài toán fraud có sẵn dịch vụ |
| **Personalize / Forecast** | Gợi ý cá nhân hoá kiểu Amazon.com / dự báo chuỗi thời gian (cầu, tồn kho) | *"gợi ý sản phẩm theo hành vi"*, *"dự báo doanh số theo mùa"* | — |
| **SageMaker** | Nền tảng **tự build–train–deploy model**: notebook, training job, **endpoint** real-time hoặc batch transform | *"dữ liệu và bài toán đặc thù, không dịch vụ nào khớp"*, *"đã có model tự train cần host"* | Là đáp án **cuối cùng** — nếu đề khớp một AI service managed thì SageMaker luôn là lựa chọn "đúng về kỹ thuật, sai về operational overhead" |

### 10.2 Ghép chuỗi — dạng đề thường gặp

- **Call center**: ghi âm → **Transcribe** (text) → **Comprehend** (sentiment + PII) → **Translate** (đa ngôn ngữ) → lưu S3 → **Athena/QuickSight** báo cáo.
- **Số hoá chứng từ**: PDF scan vào S3 → sự kiện S3 gọi **Lambda** → **Textract** trích bảng/field → **Comprehend** phân loại → ghi **DynamoDB**.
- **Nội dung do user upload**: ảnh vào S3 → **Rekognition** content moderation → ảnh vi phạm bị gắn cờ trước khi hiển thị.

> 🪤 Bẫy thi kinh điển: đề mô tả đúng một bài toán có AI service sẵn (OCR hoá đơn, sentiment, phụ đề) mà đáp án lại gồm cả "**train model trên SageMaker**" hoặc "**chạy engine OCR trên EC2**" — cả hai đều làm được, nhưng **operational overhead cao hơn** nên đều sai với câu hỏi kiểu *"least operational overhead"*.

---

## 11. Ví dụ chọn dịch vụ

**11.1** *Nạp clickstream vào S3 để phân tích, ít vận hành nhất.* → **Firehose** (buffer + deliver vào S3, convert Parquet, no shard/consumer).

**11.2** *Nhiều nhóm cần xử lý real-time cùng luồng giao dịch, mỗi nhóm độc lập, có thể phát lại 7 ngày.* → **Kinesis Data Streams** (multi-consumer + replay).

**11.3** *Data analyst thỉnh thoảng query log S3 bằng SQL, không muốn hạ tầng.* → **Athena** (+ Parquet + partition để rẻ).

**11.4** *BI team cần dashboard doanh thu chạy hằng ngày, nhiều join phức tạp trên dữ liệu có cấu trúc.* → **Redshift** + **QuickSight**.

**11.5** *Team ML cần chạy job Spark khổng lồ biến đổi hàng petabyte.* → **EMR**.

**11.6** *Đã có cụm Kafka on-prem cùng Kafka Connect, cần chuyển lên AWS mà không sửa code producer/consumer.* → **Amazon MSK** (giữ nguyên Kafka API).

**11.7** *Thêm consumer thứ tư vào Kinesis stream thì các consumer cũ bị throttle và trễ tăng.* → bật **Enhanced Fan-Out** (2 MB/s riêng mỗi consumer, tối đa 20 consumer/stream).

**11.8** *Team vận hành cần dashboard log ứng dụng cập nhật trong vài giây, có full-text search.* → **Firehose → OpenSearch Service** + OpenSearch Dashboards (UltraWarm cho index cũ).

**11.9** *Trích số tiền, ngày và bảng dòng hàng từ hàng nghìn hoá đơn PDF scan mỗi ngày.* → **Textract** (`AnalyzeExpense`), không phải Rekognition.

**11.10** *Phân tích cảm xúc hàng triệu review tiếng Anh, ít vận hành nhất.* → **Comprehend**.

**11.11** *Nhân viên muốn hỏi bằng câu tự nhiên trên kho tài liệu nội bộ ở S3 và SharePoint.* → **Kendra**.

---

## 12. Tóm tắt
- **TS5 Domain 3** = ingestion + analytics: **Kinesis** (Data Streams cho custom/replay, Firehose cho nạp near-real-time no-code, Managed Flink cho tính toán trong luồng; MSK khi cần Kafka).
- **Athena** = SQL serverless trên S3, trả theo GB quét → dùng **Parquet + partition** để rẻ. **Glue** = ETL + Data Catalog (biến CSV→Parquet, crawler schema).
- **Redshift vs Athena vs EMR**: warehouse lặp lại vs ad-hoc serverless vs Hadoop/Spark tùy biến.
- **MSK** chỉ khi đề nhắc **Kafka** (Kafka API/Connect/Streams, migrate cụm sẵn có) hoặc cần message > 1 MB; còn lại mặc định là **Kinesis**.
- **Enhanced Fan-Out**: standard consumer chia chung **2 MB/s + 5 GetRecords/s mỗi shard**; EFO cho **2 MB/s riêng mỗi consumer**, tối đa **20 consumer/stream**, latency ~70 ms.
- **OpenSearch** = search/log analytics near-real-time có index (Athena = SQL ad-hoc trên S3, Kendra = hỏi ngôn ngữ tự nhiên).
- **AI service managed**: Rekognition (ảnh/video) · Textract (tài liệu scan, form/table) · Transcribe (speech→text) · Polly (text→speech) · Translate · Comprehend (NLP/sentiment/PII) · Kendra (enterprise search) · Lex (chatbot) · Fraud Detector · SageMaker chỉ khi không cái nào khớp.
- **Lake Formation** = phân quyền tập trung data lake; **QuickSight** = BI/dashboard serverless (SPICE).
- Pipeline chuẩn: **nguồn → Kinesis → S3 raw → Glue → S3 Parquet → Athena/Redshift → QuickSight**.

> 🎯 Nhớ: Firehose = nạp lười · Data Streams = xử lý tùy biến/replay · MSK = có chữ Kafka · EFO = nhiều consumer · OpenSearch = log/search real-time · Athena = query lười theo GB · Redshift = BI lặp lại · EMR = Spark/Hadoop · Parquet = rẻ hơn CSV · Textract ≠ Rekognition · Kendra ≠ OpenSearch.
