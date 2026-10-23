# Bài 17 — Analytics Services (Athena, Glue, EMR, Kinesis, MSK, OpenSearch, QuickSight, Redshift, Data Exchange)

> Map exam: **CLF-C02 Task 3.7 — Identify AWS analytics services**.

## 1. Mục tiêu
Sau bài này bạn có thể:
- Hiểu pattern **data lake trên AWS** (S3 + Glue + Athena + QuickSight).
- Phân biệt **Athena vs Redshift vs EMR**.
- Phân biệt **Kinesis Data Streams / Firehose / Data Analytics / Video Streams**.
- Biết khi nào dùng **MSK** vs **Kinesis**.
- Hiểu vai trò **Glue**, **OpenSearch**, **QuickSight**, **Data Exchange**.

---

## 2. Lý thuyết

### 2.0 Analogy — Analytics stack như "nhà máy chế biến thực phẩm"

| Bước nhà máy | Analytics | AWS |
|---------------|-----------|-----|
| Thu nguyên liệu (rau, thịt) | Ingest data | **Kinesis / MSK / DMS / DataSync** |
| Kho lạnh chứa nguyên liệu | Data lake | **S3** |
| Phân loại + đóng gói | ETL | **Glue** |
| Chế biến thành món | Query + analyze | **Athena / Redshift / EMR** |
| Bày ra menu cho khách | Visualize / BI | **QuickSight** |
| Tìm món theo keyword | Search | **OpenSearch** |
| Mua nguyên liệu của bên thứ 3 | Data marketplace | **Data Exchange** |

---

### 2.1 Pattern data lake chuẩn AWS

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 470" role="img" aria-labelledby="clf16a-t clf16a-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="clf16a-t">Pipeline data lake chuẩn trên AWS</title>
<desc id="clf16a-d">Luồng xử lý 6 chặng: Nguồn (Apps, DB, IoT) đi vào lớp Ingest (Kinesis, DMS, MSK), đổ vào S3 làm data lake, qua Glue để Crawler, Catalog và ETL Job, rồi được truy vấn bằng Athena, Redshift hoặc EMR, cuối cùng trực quan hoá bằng QuickSight.</desc>
<defs><marker id="clf16a-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="10" y="26" font-size="15" font-weight="700" fill="currentColor">Pipeline data lake chuẩn AWS</text>
<rect x="10" y="48" width="148" height="150" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
<text x="20" y="68" font-size="13" font-weight="700" fill="currentColor" opacity="0.7">1. Source</text>
<use href="#aws-res-mobile-client" x="22" y="82" width="32" height="32"/>
<text x="64" y="103" font-size="14" font-weight="600" fill="currentColor">Apps</text>
<use href="#aws-res-database" x="22" y="120" width="32" height="32"/>
<text x="64" y="141" font-size="14" font-weight="600" fill="currentColor">DB</text>
<g fill="none" stroke="currentColor" stroke-width="1.6"><rect x="28" y="164" width="20" height="20" rx="3"/><rect x="34" y="170" width="8" height="8" fill="currentColor" fill-opacity="0.35"/><path d="M33 159V164M43 159V164M33 184V189M43 184V189M23 169H28M23 179H28M48 169H53M48 179H53"/></g>
<text x="64" y="179" font-size="14" font-weight="600" fill="currentColor">IoT</text>
<rect x="186" y="48" width="148" height="150" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
<text x="196" y="68" font-size="13" font-weight="700" fill="currentColor" opacity="0.7">2. Ingest</text>
<use href="#aws-kinesis" x="198" y="82" width="32" height="32"/>
<text x="240" y="103" font-size="14" font-weight="600" fill="currentColor">Kinesis</text>
<use href="#aws-dms" x="198" y="120" width="32" height="32"/>
<text x="240" y="141" font-size="14" font-weight="600" fill="currentColor">DMS</text>
<use href="#aws-msk" x="198" y="158" width="32" height="32"/>
<text x="240" y="179" font-size="14" font-weight="600" fill="currentColor">MSK</text>
<rect x="362" y="48" width="148" height="150" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
<text x="372" y="68" font-size="13" font-weight="700" fill="currentColor" opacity="0.7">3. Lake</text>
<use href="#aws-s3" x="412" y="78" width="48" height="48"/>
<text x="436" y="145" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">S3</text>
<text x="436" y="165" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.75">data lake</text>
<rect x="362" y="256" width="148" height="150" rx="9" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
<text x="372" y="276" font-size="13" font-weight="700" fill="currentColor" opacity="0.7">4. Catalog / ETL</text>
<use href="#aws-glue" x="412" y="286" width="48" height="48"/>
<text x="436" y="353" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">Glue</text>
<text x="436" y="373" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.75">Crawler · Catalog</text>
<text x="436" y="390" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.75">ETL Job</text>
<rect x="186" y="256" width="148" height="150" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
<text x="196" y="276" font-size="13" font-weight="700" fill="currentColor" opacity="0.7">5. Query</text>
<use href="#aws-athena" x="198" y="290" width="32" height="32"/>
<text x="240" y="311" font-size="14" font-weight="600" fill="currentColor">Athena</text>
<use href="#aws-redshift" x="198" y="328" width="32" height="32"/>
<text x="240" y="349" font-size="14" font-weight="600" fill="currentColor">Redshift</text>
<use href="#aws-emr" x="198" y="366" width="32" height="32"/>
<text x="240" y="387" font-size="14" font-weight="600" fill="currentColor">EMR</text>
<rect x="10" y="256" width="148" height="150" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
<text x="20" y="276" font-size="13" font-weight="700" fill="currentColor" opacity="0.7">6. Visualize</text>
<use href="#aws-quick" x="60" y="286" width="48" height="48"/>
<text x="84" y="353" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">QuickSight</text>
<text x="84" y="373" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.75">dashboard BI</text>
<g stroke="currentColor" stroke-width="2" fill="none">
<line x1="160" y1="123.0" x2="183" y2="123.0" marker-end="url(#clf16a-arr)"/>
<line x1="336" y1="123.0" x2="359" y2="123.0" marker-end="url(#clf16a-arr)"/>
<line x1="436.0" y1="200" x2="436.0" y2="253" marker-end="url(#clf16a-arr)"/>
<line x1="360" y1="331.0" x2="337" y2="331.0" marker-end="url(#clf16a-arr)"/>
<line x1="184" y1="331.0" x2="161" y2="331.0" marker-end="url(#clf16a-arr)"/>
</g>
<text x="260" y="436" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.7">Nguồn dữ liệu → thu nạp → hồ lưu trữ →</text>
<text x="260" y="455" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.7">lập danh mục/biến đổi → truy vấn → trực quan hoá</text>
</svg>

---

### 2.2 Amazon Athena — serverless SQL trên S3

- **Query S3 trực tiếp bằng SQL** (Presto/Trino engine), không cần ETL hay load.
- **Serverless** — không có cluster, trả per data scanned ($5/TB).
- Hỗ trợ format: CSV, JSON, **Parquet**, **ORC**, Avro. Parquet/ORC nén tốt → rẻ hơn 10x.
- Tích hợp **Glue Data Catalog** cho schema.
- Kết quả lưu lại S3.

**Use case**:
- Ad-hoc analyze log CloudTrail / VPC Flow Logs / ALB log trong S3.
- Query data lake không có DB warehouse.

---

### 2.3 Amazon Redshift — data warehouse

- **Columnar data warehouse** PB-scale, OLAP.
- 2 mode:
  - **Provisioned** — chọn node type + số node.
  - **Serverless** — auto scale, trả per RPU.
- **Redshift Spectrum** — query S3 trực tiếp như Athena.
- **Concurrency Scaling** — auto thêm cluster phụ khi spike.
- **Federated Query** — query RDS/Aurora trực tiếp.
- **Data Sharing** — share data giữa Redshift cluster mà không copy.
- **Materialized view** + **AQUA** (cache hardware).

**Khi dùng Redshift**:
- Báo cáo BI lặp lại nhiều, query phức tạp.
- Dataset > 1 TB.
- Workload tập trung, SLA cao.

**Athena vs Redshift**:
- **Athena** = ad-hoc, infrequent, serverless, S3 only.
- **Redshift** = lặp lại, OLAP performance, có cluster (hoặc serverless), tối ưu cho dashboard.

---

### 2.4 Amazon EMR (Elastic MapReduce)

- **Managed Hadoop / Spark / Hive / Presto / Trino / HBase / Flink** cluster.
- Chạy trên EC2, EKS, hoặc **EMR Serverless**.
- **Use case**:
  - Big data ETL (Spark job hàng TB).
  - Machine learning prep data.
  - Geo-spatial / genomics / scientific.
- Có thể chạy **Spot** để rẻ.

**EMR vs Glue**:
- **Glue** = serverless Spark ETL, đơn giản.
- **EMR** = nhiều framework hơn (Hive, Flink, HBase), control nhiều hơn, cần Spark/Hadoop expertise.

---

### 2.5 AWS Glue — ETL + Data Catalog

**Glue gồm nhiều component**:
- **Glue Data Catalog** — central metadata (schema, partition) cho data lake. Athena, Redshift Spectrum, EMR đều xài.
- **Glue Crawler** — tự scan S3 → infer schema → đẩy vào Catalog.
- **Glue ETL Jobs** — Spark job serverless (viết PySpark hoặc Glue Studio drag-drop).
- **Glue DataBrew** — clean + transform data no-code (UI).
- **Glue Studio** — UI visual cho ETL.
- **Glue Schema Registry** — quản schema cho Kafka/Kinesis.
- **Glue Workflow** — orchestration nhiều job ETL.

**Use case**: tự động phát hiện schema CSV/JSON mới upload S3 → Athena query ngay.

---

### 2.6 Kinesis — 4 service streaming

| Service | Mục đích | Tương đương |
|---------|----------|-------------|
| **Kinesis Data Streams (KDS)** | Real-time streaming ingest, multiple consumer | Kafka (managed) |
| **Kinesis Data Firehose** | **Delivery** stream → S3/Redshift/OpenSearch/Splunk, batching + compress | (load tool) |
| **Kinesis Data Analytics** | SQL/Flink trên stream real-time | (giờ rename **Managed Service for Apache Flink**) |
| **Kinesis Video Streams** | Video streaming ingest (security cam, drone) | (đặc thù) |

**KDS vs Firehose**:
- **KDS** = developer xử lý record (consumer code), retention 1–365 ngày, có shard.
- **Firehose** = "đường ống" tự động đẩy vào S3/Redshift/OpenSearch, **không lưu**, near real-time (buffer 60s).

**Kinesis vs MSK**:
- **Kinesis** = AWS-native, đơn giản, đắt hơn ở scale lớn.
- **MSK (Managed Streaming for Apache Kafka)** = open-source Kafka, ecosystem rộng, có **MSK Serverless**.
- Đội đã quen Kafka → MSK. Khởi tạo nhanh → Kinesis.

---

### 2.7 Amazon OpenSearch Service

- **Managed Elasticsearch + Kibana** (Elastic fork khi license đổi 2021).
- **Use case**: log analytics, full-text search, observability.
- **OpenSearch Serverless** — auto-scale.
- **OpenSearch Dashboards** = Kibana (rename).

**OpenSearch vs Athena**:
- Athena = SQL query S3.
- OpenSearch = full-text search + log analytics real-time.

**OpenSearch vs Kendra**:
- OpenSearch = lower-level search engine (cần build relevance).
- Kendra = enterprise search NLU, pre-tuned.

---

### 2.8 Amazon QuickSight — BI / visualization

- **SaaS BI** managed, serverless.
- Pricing per-session (Reader) hoặc per-user (Author).
- **SPICE** — in-memory engine cache data, query nhanh.
- **Q** — natural language query ("show me sales by region last quarter").
- **Embedded analytics** — nhúng dashboard vào app SaaS.

**Connector**: Redshift, RDS, Athena, S3, Aurora, OpenSearch, Snowflake, …

**QuickSight vs Tableau / Power BI**: rẻ hơn, native AWS, ít feature hơn nhưng đủ cho đa số.

---

### 2.9 AWS Data Exchange

- **Marketplace data** — mua/bán dataset từ third-party (Reuters, Foursquare, S&P, weather, …).
- Data tự động delivery vào S3, Redshift, Lake Formation, API.
- Khác **AWS Marketplace** (software) — Data Exchange chỉ data.

---

### 2.10 AWS Lake Formation

- **Quản trị** data lake trên S3: permission, audit, cross-account share.
- Tích hợp Glue + Athena + Redshift Spectrum + EMR.
- Quản fine-grained ở row/column/cell level (Athena, Redshift).
- Tag-based access control.

---

### 2.11 So sánh nhanh — chọn service nào

| Tình huống | Service |
|------------|---------|
| Ad-hoc SQL trên log S3 | **Athena** |
| BI dashboard lặp lại, dataset lớn | **Redshift** |
| Big data Spark ETL phức tạp | **EMR** hoặc **Glue ETL** |
| ETL serverless Spark đơn giản | **Glue** |
| Stream click/IoT real-time, multi-consumer | **Kinesis Data Streams** |
| Đẩy stream vào S3/Redshift tự động | **Kinesis Firehose** |
| Real-time SQL trên stream | **Managed Service for Apache Flink** |
| Kafka managed, ecosystem Kafka | **MSK** |
| Log search + dashboard real-time | **OpenSearch** |
| Visualize dashboard cho business | **QuickSight** |
| Mua dataset third-party | **Data Exchange** |
| Permission centralized data lake | **Lake Formation** |
| Metadata catalog | **Glue Data Catalog** |

---

## 3. Hands-on có account

### Lab 1 — Athena query CSV (20 phút)
1. Upload 1 CSV (vd movies.csv) lên S3.
2. Glue Crawler → scan S3 → tạo table trong Data Catalog.
3. Athena → query `SELECT * FROM movies LIMIT 10;`.

### Lab 2 — Kinesis Firehose → S3 (30 phút)
1. Firehose → create delivery stream → source Direct PUT → target S3.
2. Test data generator → ghi vào stream.
3. Đợi 60s → kiểm tra S3 bucket có file mới.

### Lab 3 — QuickSight free trial (30 phút)
1. QuickSight → Sign up (free 30 ngày Author).
2. Add dataset → Athena → query bảng từ Lab 1.
3. Tạo bar chart, pie chart.

---

## 4. Hands-on không tốn tiền

### Option A — Athena free tier
- 5 GB scanned free trial (nếu chưa dùng).

### Option B — AWS Skill Builder
- "Getting Started with Amazon Athena" (free, 1h).
- "Amazon Kinesis Data Streams Getting Started" (free).

### Option C — Đoán service
1. Search log nginx 100GB realtime + dashboard → **OpenSearch**.
2. ETL daily JSON → Parquet → **Glue ETL**.
3. Stream IoT 100k device 24/7 → **Kinesis Data Streams** hoặc **MSK**.
4. BI report cho CEO → **QuickSight**.
5. Mua data demographic Mỹ → **Data Exchange**.

---

## 5. Tự kiểm tra (có đáp án)

1. Đề: *"Ad-hoc SQL query log CloudTrail trong S3, không muốn quản cluster."*
   <details><summary>Trả lời</summary>**Amazon Athena**.</details>

2. Đề: *"Data warehouse PB-scale, dashboard BI lặp lại hằng ngày."*
   <details><summary>Trả lời</summary>**Amazon Redshift**.</details>

3. Kinesis Data Streams vs Firehose khác chính?
   <details><summary>Trả lời</summary>**KDS** = developer xử lý record (consumer code), có retention 1–365 ngày. **Firehose** = ống đẩy stream vào S3/Redshift/OpenSearch/Splunk, không lưu.</details>

4. Đề: *"Real-time SQL aggregation trên click stream."*
   <details><summary>Trả lời</summary>**Managed Service for Apache Flink** (formerly Kinesis Data Analytics).</details>

5. MSK vs Kinesis?
   <details><summary>Trả lời</summary>**MSK** = managed Apache Kafka (open-source, ecosystem Kafka). **Kinesis** = AWS-native streaming. MSK phù hợp team đã quen Kafka.</details>

6. Đề: *"Log search + dashboard Kibana cho Elasticsearch workload."*
   <details><summary>Trả lời</summary>**Amazon OpenSearch Service**.</details>

7. Đề: *"ETL serverless Spark drag-drop, auto-discover schema S3."*
   <details><summary>Trả lời</summary>**AWS Glue** (Studio + Crawler + Data Catalog).</details>

8. Đề: *"BI tool serverless với natural language query."*
   <details><summary>Trả lời</summary>**Amazon QuickSight** với **Q** feature.</details>

9. Đề: *"Mua dataset weather third-party, deliver vào S3."*
   <details><summary>Trả lời</summary>**AWS Data Exchange**.</details>

10. Đề: *"Permission row-level cho 100 user trên data lake."*
    <details><summary>Trả lời</summary>**AWS Lake Formation**.</details>

---

## 6. Đối chiếu GCP & Azure

| Function | AWS | GCP | Azure |
|----------|-----|-----|-------|
| Serverless SQL trên blob | Athena | BigQuery (serverless luôn) | Synapse Serverless |
| Data warehouse | Redshift | BigQuery | Synapse Dedicated |
| Hadoop/Spark managed | EMR | Dataproc | HDInsight |
| Serverless ETL | Glue | Dataflow / Dataform | Data Factory + Synapse |
| Stream | Kinesis | Pub/Sub + Dataflow | Event Hubs |
| Kafka managed | MSK | (qua Confluent) | Event Hubs (Kafka API) |
| Search | OpenSearch | (qua marketplace) | Cognitive Search |
| BI | QuickSight | Looker Studio / Looker | Power BI |
| Data marketplace | Data Exchange | Analytics Hub | Data Share |
| Data governance | Lake Formation | Dataplex | Purview |

---

## 7. Lưu ý khi thi CLF-C02

- Thuộc **1 dòng use case** mỗi service.
- **Athena = serverless SQL S3**, **Redshift = data warehouse**, **EMR = Hadoop/Spark cluster**.
- **Kinesis 4 service**: Data Streams (multi-consumer), Firehose (delivery), Analytics/Flink (real-time SQL), Video Streams.
- **MSK = managed Kafka**.
- **OpenSearch = Elasticsearch managed** (log analytics + search).
- **QuickSight = BI**.
- **Glue = ETL + Data Catalog**.
- **Data Exchange = data marketplace third-party**.
- **Lake Formation = data lake permission**.

## 8. Lưu ý khi thi SAA-C03 (sâu hơn)

- Redshift **RA3** node + Redshift Managed Storage.
- Kinesis shard math (1 MB/s in, 2 MB/s out per shard).
- Glue **bookmark** để incremental.
- OpenSearch **UltraWarm** + **cold storage** tier.
- Athena **partition projection** giảm cost scan.
- **Workgroup** Athena phân isolated team + budget.

## 9. Lưu ý khi đi làm

- **Data Lake First** — push mọi data thô lên S3 trước, schema-on-read sau (Athena/Glue).
- **Parquet/ORC + partition** — Athena cost giảm 10–100x.
- **Firehose buffer + compress** = "no-code" log pipeline.
- **QuickSight Embedded** — tích hợp BI vào product, không phải build dashboard riêng.
- **Lake Formation row/column-level** — compliance GDPR, HIPAA.
- **MSK Serverless** mới (2022) — pricing fairer hơn provisioned.

---

## 10. Flashcard

- **Athena** — serverless SQL trên S3, $5/TB scanned.
- **Redshift** — data warehouse columnar, OLAP.
- **EMR** — managed Hadoop/Spark/Hive/Flink/HBase.
- **Glue** — serverless ETL + Data Catalog + Crawler + Studio + DataBrew.
- **Kinesis Data Streams** — real-time stream, retention 1–365 ngày, shard.
- **Kinesis Firehose** — delivery stream → S3/Redshift/OpenSearch/Splunk.
- **Managed Service for Apache Flink** — real-time SQL/Flink (formerly Kinesis Data Analytics).
- **Kinesis Video Streams** — video stream.
- **MSK** — managed Apache Kafka (có Serverless).
- **OpenSearch Service** — managed Elasticsearch + Kibana.
- **QuickSight** — BI serverless, SPICE engine, Q natural language.
- **Data Exchange** — marketplace data third-party.
- **Lake Formation** — data lake permission.
- **Glue Data Catalog** — central metadata.
