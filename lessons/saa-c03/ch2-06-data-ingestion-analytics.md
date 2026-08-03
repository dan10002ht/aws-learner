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

## 3. Athena — SQL serverless truy vấn thẳng S3

- Chạy **SQL (Presto/Trino)** trực tiếp trên file ở S3, **serverless**, **trả tiền theo lượng dữ liệu quét** (per TB scanned).
- Không cần load vào DB — hợp **ad-hoc / không thường xuyên**.
- **Tối ưu cost cực mạnh** bằng **cột hoá + partition** (xem §4).

> 💡 Athena tính tiền theo **GB quét**. Chuyển CSV → **Parquet** (columnar, nén) + **partition theo ngày** có thể giảm **>90%** dữ liệu quét → rẻ hơn & nhanh hơn nhiều.

### 3.1 CSV vs Parquet (rất hay ra đề)
| | CSV/JSON (row) | **Parquet/ORC (columnar)** |
|--|----------------|----------------------------|
| Đọc vài cột | Quét cả dòng | Chỉ đọc cột cần → ít IO |
| Nén | Kém | Rất tốt (nén theo cột) |
| Cost Athena/Spectrum | Cao | Thấp (quét ít hơn) |
| Hợp cho | Ghi/nhập thô | **Phân tích/OLAP** |

---

## 4. AWS Glue — ETL serverless + Data Catalog

- **Glue Data Catalog**: kho metadata trung tâm (schema, partition) — Athena/Redshift Spectrum/EMR đều dùng chung.
- **Glue Crawler**: tự quét S3, suy ra schema, tạo table trong Catalog.
- **Glue ETL** (Spark serverless): biến đổi dữ liệu — ví dụ **CSV → Parquet**, làm sạch, join — không quản server.

---

## 5. Data warehouse & big-data engines

### 5.1 Amazon Redshift
- **Data warehouse** columnar MPP cho **phân tích phức tạp trên dữ liệu có cấu trúc, lặp lại** (BI, báo cáo).
- **Redshift Spectrum**: query thẳng dữ liệu S3 (Parquet) mà không load vào cluster.
- **Redshift Serverless** cho workload biến động/ad-hoc (không nuôi cluster 24/7).

### 5.2 Amazon EMR
- Cụm **Hadoop/Spark/Hive/Presto** managed cho **big-data xử lý nặng, tùy biến** (ML, transform khối lượng lớn, framework Hadoop cụ thể).

### 5.3 Redshift vs Athena vs EMR — bảng quyết định

| | **Redshift** | **Athena** | **EMR** |
|--|-------------|-----------|---------|
| Mô hình | Data warehouse (cluster/serverless) | Query serverless trên S3 | Cụm Hadoop/Spark |
| Hợp khi | BI/báo cáo **lặp lại**, join phức tạp, cần hiệu năng ổn định | Ad-hoc, **thỉnh thoảng**, không muốn quản gì | **Custom** big-data (Spark/Hadoop framework), ML, transform nặng |
| Chi phí | Trả cluster (hoặc serverless) | Per-TB quét | Trả cụm khi chạy |
| Vận hành | Vừa | Thấp nhất | Cao nhất |

> 🪤 Bẫy thi: *"query S3 thỉnh thoảng, không muốn hạ tầng"* → **Athena**. *"BI dashboard chạy hằng ngày, nhiều join"* → **Redshift**. *"cần Apache Spark/Hadoop cụ thể"* → **EMR**.

---

## 6. Lake Formation & QuickSight

- **AWS Lake Formation**: dựng & **phân quyền tập trung** cho **data lake** trên S3 + Glue Catalog (permission theo bảng/cột/hàng), thay vì rải rác IAM/bucket policy. Từ khoá: *"central fine-grained access cho data lake"*.
- **Amazon QuickSight**: **BI serverless** — dashboard, **SPICE** (in-memory tăng tốc), ML Insights. Từ khoá: *"dashboard/BI cho business users, serverless"*.

---

## 7. Pipeline data lake điển hình (end-to-end)

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

## 8. Ví dụ chọn dịch vụ

**8.1** *Nạp clickstream vào S3 để phân tích, ít vận hành nhất.* → **Firehose** (buffer + deliver vào S3, convert Parquet, no shard/consumer).

**8.2** *Nhiều nhóm cần xử lý real-time cùng luồng giao dịch, mỗi nhóm độc lập, có thể phát lại 7 ngày.* → **Kinesis Data Streams** (multi-consumer + replay).

**8.3** *Data analyst thỉnh thoảng query log S3 bằng SQL, không muốn hạ tầng.* → **Athena** (+ Parquet + partition để rẻ).

**8.4** *BI team cần dashboard doanh thu chạy hằng ngày, nhiều join phức tạp trên dữ liệu có cấu trúc.* → **Redshift** + **QuickSight**.

**8.5** *Team ML cần chạy job Spark khổng lồ biến đổi hàng petabyte.* → **EMR**.

---

## 9. Tóm tắt
- **TS5 Domain 3** = ingestion + analytics: **Kinesis** (Data Streams cho custom/replay, Firehose cho nạp near-real-time no-code, Managed Flink cho tính toán trong luồng; MSK khi cần Kafka).
- **Athena** = SQL serverless trên S3, trả theo GB quét → dùng **Parquet + partition** để rẻ. **Glue** = ETL + Data Catalog (biến CSV→Parquet, crawler schema).
- **Redshift vs Athena vs EMR**: warehouse lặp lại vs ad-hoc serverless vs Hadoop/Spark tùy biến.
- **Lake Formation** = phân quyền tập trung data lake; **QuickSight** = BI/dashboard serverless (SPICE).
- Pipeline chuẩn: **nguồn → Kinesis → S3 raw → Glue → S3 Parquet → Athena/Redshift → QuickSight**.

> 🎯 Nhớ: Firehose = nạp lười · Data Streams = xử lý tùy biến/replay · Athena = query lười theo GB · Redshift = BI lặp lại · EMR = Spark/Hadoop · Parquet = rẻ hơn CSV.
