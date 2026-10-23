# SAA Ch2.3 — Database Performance & Caching

> Mục tiêu: Tune Aurora/RDS/DynamoDB cho hiệu năng cao, thiết kế caching layer (ElastiCache, DAX, CloudFront) đúng cách, và tránh các sai lầm cổ điển: connection storm, cache stampede, hot partition.

Tiền đề: [[foundations-02-consistency-models]], [[foundations-03-replication-and-quorum]], [[foundations-05-partitioning-and-sharding]], CLF [[07-databases]].

---

## 1. Câu chuyện mở đầu — "DB chậm, thêm CPU đi"

Production OLTP, traffic Black Friday tăng x3. CPU RDS lên 90%. Team scale-up từ `r6i.4xlarge` lên `r6i.8xlarge`. **Xong x2 cost, latency cải thiện 10%**. Vẫn báo chậm.

Profile thực tế: **80% query time đang dùng cho 5 query thiếu index**. Sửa index → CPU xuống 30%, scale-up không cần. Tiền tiết kiệm: ~$3,000/tháng.

**Quy tắc 0**: trước khi tune infra, tune query. Slow query log, `EXPLAIN`, Performance Insights. Một index đúng giá trị bằng x2 instance size.

---

## 2. Map database theo workload

### 2.1 Map nhanh theo workload

Bốn thuật ngữ dùng suốt bài, định nghĩa một lần ở đây:

- **OLTP** (Online Transaction Processing) là kiểu tải của app phục vụ người dùng: rất nhiều thao tác nhỏ, mỗi thao tác đọc/ghi **vài dòng** (đặt một đơn hàng, xem một profile) và phải trả lời trong vài mili-giây.
- **OLAP** (Online Analytical Processing) ngược lại: ít query, nhưng mỗi query **quét hàng triệu tới hàng tỉ dòng** để tính tổng/trung bình (doanh thu theo tháng của 3 năm). Chạy vài giây tới vài phút là chấp nhận được.
- **QPS** (queries per second) là số query mỗi giây. **Latency** là thời gian trả lời một query. "Single-digit ms" nghĩa là dưới 10 ms; "sub-ms" là dưới 1 ms; "microsecond" (µs) là phần nghìn của ms.
- **In-memory** nghĩa là dữ liệu nằm trong RAM chứ không trên đĩa. Đọc RAM mất cỡ 0,1 µs, đọc SSD qua mạng mất cỡ 1 ms (chậm hơn khoảng 10.000 lần), nên mọi dịch vụ cache đều là in-memory.

Bảng dưới là bản đồ tổng quát; cột "Lý do" nêu nguyên nhân gốc, các section sau giải thích kỹ từng cái.

| Workload | DB chính | Lý do |
|----------|----------|-------|
| OLTP truyền thống, ACID, JOIN nhiều | **Aurora MySQL/Postgres** | Giữ nguyên SQL và driver của MySQL/PostgreSQL. AWS quảng cáo throughput tới 5x MySQL và 3x PostgreSQL trên cùng phần cứng (benchmark của AWS, không phải cam kết) nhờ tầng storage viết lại ở §3.1. Storage tự nở, không phải resize đĩa |
| OLTP cần scale ngang không giới hạn thực tế, truy cập theo key | **DynamoDB** | Mỗi request chỉ chạm **một partition** nên latency giữ ở dưới 10 ms dù bảng 1 GB hay 100 TB, 100 hay 100.000+ request/giây. Đổi lại: không JOIN, phải biết trước cách truy vấn (§5) |
| Cache layer | **ElastiCache (Redis/Memcached)** | In-memory nên trả lời dưới 1 ms, so với vài ms tới vài chục ms của một query SQL |
| DynamoDB cần cache | **DAX** (DynamoDB Accelerator) | Cụm cache in-memory đặt trước DynamoDB, đưa read từ vài ms xuống vài trăm µs (§8) |
| OLAP, BI report | **Redshift** | **Columnar**: lưu theo cột, query chỉ đọc 3 cột thì không phải đọc 47 cột còn lại. **MPP** (massively parallel processing): một query được chia cho nhiều node chạy song song. Hợp với dữ liệu từ hàng trăm GB tới petabyte (1 PB = 1.000 TB) |
| Ad-hoc query trên S3 | **Athena** | Serverless SQL, không có cluster để bật/tắt; trả tiền theo số GB dữ liệu bị quét |
| Time-series | **Timestream** | Purpose-built, auto tiering |
| Graph (social, fraud) | **Neptune** | Property graph + RDF |
| Search, log analytics | **OpenSearch** | Full-text, aggregation |
| Ledger immutable | **QLDB** | Cryptographic verify |
| MongoDB workload | **DocumentDB** | MongoDB API compatible (3.6/4.0/5.0) |
| Cassandra workload | **Keyspaces** | Cassandra-compatible, serverless |

### 2.2 Purpose-built database — chọn theo dạng dữ liệu + từ khoá đề

AWS không có "một DB cho mọi thứ". Đề SAA gần như luôn mô tả **dạng dữ liệu** và **kiểu truy vấn** rồi bắt bạn chọn engine — nhận ra từ khoá là xong câu, không cần biết sâu engine.

| Service | Dạng dữ liệu | Truy vấn đặc trưng | Từ khoá đề hay dùng | Bẫy |
|---------|--------------|--------------------|---------------------|-----|
| **DynamoDB** | Key-value / document, schemaless | `GetItem`/`Query` theo PK(+SK), single-digit ms ở quy mô bất kỳ | "millions of requests/s", "serverless", "key-value", "access pattern biết trước" | Không JOIN, không ad-hoc query. Query theo thuộc tính khác PK phải tạo GSI |
| **Aurora (MySQL/PostgreSQL)** | Quan hệ, schema chặt | SQL JOIN, transaction ACID, report | "relational", "ACID", "failover nhanh", "cần đọc scale tới 15 replica" | Không phải drop-in cho mọi engine — chỉ MySQL/PostgreSQL-compatible |
| **RDS (Oracle/SQL Server/MariaDB/Db2…)** | Quan hệ | SQL, feature riêng của engine | "lift-and-shift Oracle/SQL Server", "cần license BYOL" | Engine ngoài MySQL/PostgreSQL thì **không** có bản Aurora |
| **DocumentDB** | JSON document | MongoDB API/driver, aggregation pipeline | "MongoDB workload", "migrate MongoDB không sửa code" | MongoDB-**compatible**, không phải MongoDB thật — feature mới nhất của Mongo có thể thiếu |
| **Keyspaces** | Wide-column | CQL của Cassandra, partition key + clustering column | "Cassandra", "CQL", "không muốn quản node Cassandra" | Serverless: không tự chọn node/replication factor như cluster Cassandra tự dựng |
| **Neptune** | Graph — node + edge + property | Duyệt quan hệ nhiều bậc bằng **Gremlin / openCypher** (property graph) hoặc **SPARQL** (RDF) | "social network", "friend-of-friend", "fraud ring", "recommendation engine", "knowledge graph", "relationship" | Quan hệ nhiều bậc trên RDBMS = self-JOIN lồng nhau → đề mô tả "JOIN quá sâu, chậm" là dấu hiệu Neptune |
| **Timestream** | Time-series (timestamp + measure + dimension) | Aggregate theo cửa sổ thời gian, interpolation, smoothing | "IoT sensor", "metric", "telemetry", "dữ liệu theo thời gian, dữ liệu cũ ít truy cập" | Tiering memory store → magnetic store là **built-in**; đáp án "tự viết lifecycle cho time-series trên DynamoDB" thường là bẫy |
| **QLDB** | Ledger — journal append-only, immutable | Đọc đầy đủ lịch sử thay đổi + **verify bằng mật mã** (hash chain, digest) | "immutable", "cryptographically verifiable", "audit trail không sửa được", "system of record" | Khác blockchain: QLDB do **một chủ sở hữu tập trung** vận hành, không có consensus phi tập trung. Đề nói "nhiều bên không tin nhau cùng ghi" → Managed Blockchain. Lưu ý: AWS đã công bố ngừng hỗ trợ QLDB và khuyến nghị chuyển sang Aurora PostgreSQL, nhưng ngân hàng đề SAA-C03 vẫn còn câu chạm tới nó |
| **MemoryDB** | In-memory (kiểu dữ liệu Redis-compatible) | Như Redis, nhưng **durable** nhờ Multi-AZ transaction log | "in-memory **database**", "microsecond read", "không được mất dữ liệu", "Redis làm primary datastore" | Đề hỏi "cache" → ElastiCache; hỏi "primary database in-memory, durable" → MemoryDB. Chọn nhầm chiều là mất điểm |
| **ElastiCache (Redis/Valkey/Memcached)** | In-memory, ephemeral | Cache-aside, session, leaderboard, rate limit | "cache", "giảm tải DB", "session store", "leaderboard" | Là **cache**, không phải nguồn dữ liệu chuẩn. Mất node = mất phần dữ liệu chưa persist |
| **Redshift** | Quan hệ, columnar MPP | Aggregate trên hàng tỉ dòng, BI/dashboard | "data warehouse", "OLAP", "complex analytical query", "join nhiều bảng fact/dimension" | Không dùng làm OLTP — write đơn lẻ tần suất cao là anti-pattern |

**Quy tắc đọc đề 10 giây**: tìm danh từ mô tả dữ liệu trước (relationship / time-series / ledger / document / key-value / warehouse), rồi mới đọc phần yêu cầu vận hành (serverless, managed, HA). Danh từ quyết định engine; yêu cầu vận hành chỉ quyết định biến thể (Serverless v2, on-demand, Multi-AZ).

---

## 3. Aurora — performance deep dive

### 3.1 Architecture cốt lõi

**Nó là gì.** Aurora là một database quan hệ tương thích MySQL/PostgreSQL, nhưng AWS viết lại hoàn toàn phần lưu trữ. Ở MySQL thường (kể cả RDS MySQL), mỗi máy database có **ổ đĩa riêng** chứa toàn bộ dữ liệu. Ở Aurora, các máy database (gọi là **instance**, tầng *compute*) không giữ dữ liệu; tất cả cùng đọc/ghi vào **một ổ đĩa ảo dùng chung** gọi là *cluster volume* (tầng *storage*). Một cluster có đúng **một writer** (nhận cả đọc lẫn ghi) và tối đa **15 reader** (chỉ đọc).

**Vì sao 6 bản trên 3 AZ.** Cluster volume tự chia dữ liệu thành các đoạn 10 GB, mỗi đoạn được chép thành **6 bản, 2 bản ở mỗi AZ**. Aurora dùng **quorum** (biểu quyết theo đa số): một lần ghi được coi là xong khi **4/6** bản xác nhận, một lần đọc cần **3/6** bản. Hai con số đó cho ra khả năng chịu lỗi cụ thể:

```
Mất 1 AZ           = mất 2 bản → còn 4 → vẫn GHI và ĐỌC bình thường
Mất 1 AZ + 1 bản   = mất 3 bản → còn 3 → hết ghi được, vẫn ĐỌC được (đủ để tự chép lại bản thiếu)
```

Nếu chỉ có 3 bản (mỗi AZ một bản) thì mất một AZ cộng thêm một ổ đĩa hỏng lẻ ở AZ khác là đã không còn đa số. Sáu bản tồn tại vì lý do đó, và bạn **không trả tiền 6 lần**: storage tính theo số GB dữ liệu thật.

**Vì sao reader của Aurora gần như không trễ.** Cần so với cách replica truyền thống làm việc. Ở RDS MySQL, primary ghi mọi thay đổi vào **binlog** (binary log, cuốn nhật ký "đã sửa dòng nào thành gì"). Replica tải binlog về rồi **thực hiện lại từng thay đổi lên ổ đĩa riêng của nó**, việc này gọi là *replay*. Khi primary ghi dồn dập, replica replay không kịp và tụt lại từ vài giây tới vài phút.

Reader của Aurora không có ổ đĩa riêng để mà replay. Dữ liệu mới đã nằm sẵn trên cluster volume dùng chung ngay khi writer ghi xong. Việc duy nhất reader phải làm là cập nhật những **page** (khối dữ liệu 8–16 KB) nó đang giữ trong RAM cho khỏi cũ; page nào chưa có trong RAM thì lần sau đọc thẳng từ storage là ra bản mới. Kết quả là độ trễ writer→reader (*replica lag*) **thường thấp hơn nhiều so với 100 ms**.

Ba hệ quả thực dụng của kiến trúc này:

- **Thêm reader nhanh**, vì không phải chép dữ liệu sang máy mới. Reader mới chỉ cần gắn vào volume có sẵn.
- **Failover nhanh.** Khi writer chết, Aurora nâng một reader lên làm writer. Dữ liệu vốn dùng chung nên không mất gì, dịch vụ thường trở lại trong **dưới 60 giây, hay gặp là dưới 30 giây**.
- **Reader vẫn là eventual consistency.** Lag nhỏ nhưng khác 0: ghi xong ở writer rồi đọc ngay ở reader có thể chưa thấy. Cần đọc-ngay-sau-ghi thì đọc ở writer.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Kiến trúc Aurora — compute tách khỏi shared storage 6 bản / 3 AZ</title>
  <desc>Tầng compute gồm 1 writer và các reader nối xuống một shared storage layer dùng chung; storage giữ 6 bản sao trải trên 3 vùng sẵn sàng. Writer ghi xuống storage; reader chỉ invalidate cache page thay vì replay binlog.</desc>
  <defs>
    <marker id="auArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Aurora — compute tách khỏi shared storage</text>
  <text x="16" y="50" font-size="11.5" font-weight="700" fill="currentColor" opacity="0.7">Tầng COMPUTE</text>
  <g>
    <rect x="40" y="58" width="150" height="56" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="52" y="68" width="56" height="18" rx="9" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="80" y="81" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">WRITER</text>
    <text x="52" y="103" font-size="10.5" fill="currentColor" opacity="0.75">read + write</text>
  </g>
  <g>
    <rect x="270" y="58" width="130" height="56" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="282" y="68" width="62" height="18" rx="9" fill="#10b981" fill-opacity="0.95"/>
    <text x="313" y="81" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">READER 1</text>
    <text x="282" y="103" font-size="10.5" fill="currentColor" opacity="0.75">read-only</text>
  </g>
  <g>
    <rect x="420" y="58" width="130" height="56" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="432" y="68" width="62" height="18" rx="9" fill="#10b981" fill-opacity="0.95"/>
    <text x="463" y="81" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">READER N</text>
    <text x="432" y="103" font-size="10.5" fill="currentColor" opacity="0.75">tới 15 reader</text>
  </g>
  <line x1="115" y1="114" x2="115" y2="176" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#auArr)"/>
  <text x="122" y="150" font-size="10" fill="currentColor" opacity="0.8">ghi</text>
  <line x1="335" y1="114" x2="200" y2="176" stroke="currentColor" stroke-opacity="0.45" marker-end="url(#auArr)"/>
  <line x1="485" y1="114" x2="240" y2="176" stroke="currentColor" stroke-opacity="0.45" marker-end="url(#auArr)"/>
  <text x="360" y="150" font-size="10" fill="currentColor" opacity="0.8">đọc · invalidate cache page</text>
  <text x="16" y="200" font-size="11.5" font-weight="700" fill="currentColor" opacity="0.7">SHARED STORAGE LAYER — 6 bản / 3 AZ</text>
  <rect x="40" y="210" width="640" height="120" rx="12" fill="#f59e0b" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <g>
    <rect x="60" y="232" width="180" height="86" rx="9" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="150" y="251" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">AZ-a</text>
    <rect x="76" y="262" width="66" height="44" rx="7" fill="#f59e0b" fill-opacity="0.5"/>
    <text x="109" y="288" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">copy 1</text>
    <rect x="156" y="262" width="66" height="44" rx="7" fill="#f59e0b" fill-opacity="0.5"/>
    <text x="189" y="288" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">copy 2</text>
  </g>
  <g>
    <rect x="270" y="232" width="180" height="86" rx="9" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="360" y="251" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">AZ-b</text>
    <rect x="286" y="262" width="66" height="44" rx="7" fill="#f59e0b" fill-opacity="0.5"/>
    <text x="319" y="288" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">copy 3</text>
    <rect x="366" y="262" width="66" height="44" rx="7" fill="#f59e0b" fill-opacity="0.5"/>
    <text x="399" y="288" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">copy 4</text>
  </g>
  <g>
    <rect x="480" y="232" width="180" height="86" rx="9" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="570" y="251" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">AZ-c</text>
    <rect x="496" y="262" width="66" height="44" rx="7" fill="#f59e0b" fill-opacity="0.5"/>
    <text x="529" y="288" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">copy 5</text>
    <rect x="576" y="262" width="66" height="44" rx="7" fill="#f59e0b" fill-opacity="0.5"/>
    <text x="609" y="288" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">copy 6</text>
  </g>
  <text x="40" y="352" font-size="10.5" fill="currentColor" opacity="0.7">Storage dùng chung cho mọi node → reader không replay binlog, lag writer→reader thường dưới 100ms.</text>
</svg>

### 3.2 Performance levers

"Lever" là những cái cần gạt bạn có thể kéo khi Aurora chậm. Mỗi cái giải quyết một kiểu nghẽn khác nhau, nên phải biết mình đang nghẽn ở đâu trước khi kéo.

**Instance size — nghẽn CPU hoặc RAM.** Đổi sang instance lớn hơn (họ `r` như r6g, r6i, r7g là họ nhiều RAM, hợp với database) cho thêm CPU, RAM và băng thông mạng. RAM quan trọng nhất: database giữ các page hay dùng trong RAM (vùng này gọi là **buffer pool** ở MySQL, *buffer cache* ở PostgreSQL). Dữ liệu "nóng" nằm gọn trong RAM thì query không phải đọc đĩa. Đây là cách duy nhất để tăng sức **ghi**, vì cluster chỉ có một writer.

**Read replica — nghẽn vì quá nhiều query đọc.** Thêm reader (tối đa 15) rồi cho app gửi query đọc vào **reader endpoint**, một địa chỉ DNS tự chia kết nối đều cho các reader. Query ghi vẫn phải đi **cluster endpoint** (luôn trỏ tới writer). Mỗi reader cũng có endpoint riêng nếu muốn dành hẳn một máy cho báo cáo nặng.

**Aurora Serverless v2 — tải lên xuống thất thường.** Thay vì chọn cỡ instance cố định, bạn đặt khoảng min–max và Aurora tự co giãn. Chi tiết ở §3.3.

**Aurora Global Database — người dùng ở Region khác đọc chậm.** Một cluster chính ở một Region, các cluster phụ chỉ-đọc ở Region khác. Việc sao chép diễn ra ở tầng storage, độ trễ **thường dưới 1 giây**. Người dùng châu Âu đọc từ cluster ở Frankfurt thay vì vượt đại dương về Virginia; khi Region chính sập thì nâng một cluster phụ lên làm chính.

**Aurora I/O-Optimized — hoá đơn I/O quá lớn.** Đây là lever về tiền, không làm query nhanh hơn. Aurora có hai cách tính tiền storage:

| | **Aurora Standard** | **Aurora I/O-Optimized** |
|--|---------------------|---------------------------|
| Phí I/O (mỗi lần đọc/ghi page xuống storage) | ~$0,20 / 1 triệu request | **$0** |
| Storage | ~$0,10 / GB-tháng | ~$0,225 / GB-tháng |
| Instance | giá gốc | đắt hơn ~30% |

(Giá us-east-1.) AWS khuyến nghị chuyển sang I/O-Optimized khi **tiền I/O chiếm từ 25% tổng hoá đơn Aurora trở lên**. Con số 25% chính là điểm hoà vốn của hai bảng giá trên. Tính thử với một cluster tốn $1.000/tháng tiền instance và có 500 GB dữ liệu:

```
Standard        = 1.000 + 500 × 0,10  + tiền I/O = 1.050 + tiền I/O
I/O-Optimized   = 1.000 × 1,3 + 500 × 0,225      = 1.412,5

Hoà vốn khi tiền I/O = 1.412,5 − 1.050 = 362,5 $
362,5 ÷ 1.412,5 ≈ 25,7% hoá đơn   (≈ 1,8 tỉ I/O request mỗi tháng)
```

Tiền I/O cao hơn mức đó thì I/O-Optimized rẻ hơn và, quan trọng không kém, hoá đơn không còn nhảy theo tải.

**Parallel Query (chỉ Aurora MySQL) — một query phân tích quét bảng rất lớn.** Bình thường instance phải kéo từng page từ storage lên rồi tự lọc bằng CPU của nó. Parallel Query **đẩy việc lọc xuống các node của tầng storage** chạy song song, instance chỉ nhận kết quả đã lọc. Hợp với query kiểu báo cáo chạy trên dữ liệu OLTP mới nhất mà không muốn dựng riêng data warehouse. Không giúp gì cho query nhỏ đã có index.

**Parameter group — tinh chỉnh engine.** Các thông số như kích thước buffer pool hay `max_connections` được đặt qua *parameter group* (bộ cấu hình gắn vào cluster/instance). Mặc định của Aurora đã tính theo cỡ instance, nên đây là lever cuối cùng, không phải đầu tiên.

| Triệu chứng | Lever nên kéo |
|-------------|---------------|
| CPU writer cao vì query **ghi** | Instance lớn hơn (sau khi đã tối ưu query, xem Quy tắc 0) |
| CPU cao vì query **đọc** | Thêm reader + dùng reader endpoint; hoặc thêm cache (§6) |
| Tải ngày cao gấp nhiều lần đêm, hoặc không đoán được | Serverless v2 |
| Người dùng ở Region khác đọc chậm; cần DR cross-Region | Global Database |
| Tiền I/O ≥ 25% hoá đơn | I/O-Optimized |
| Một query báo cáo quét cả bảng lớn (Aurora MySQL) | Parallel Query |

### 3.3 Aurora Serverless v2

**Nó là gì.** Vẫn là Aurora với đúng tầng storage ở §3.1, chỉ khác ở tầng compute: instance không có cỡ cố định mà tự phình ra/co lại theo tải, trong khoảng bạn cho phép.

**ACU — đơn vị đo.** Sức chứa tính bằng **ACU** (Aurora Capacity Unit). **1 ACU ≈ 2 GiB RAM** kèm lượng CPU và mạng tương ứng. Để dễ hình dung: 8 ACU ≈ 16 GiB RAM, ngang một `db.r6i.large`; 32 ACU ≈ 64 GiB, ngang một `db.r6i.2xlarge`. Bạn đặt **min ACU** và **max ACU**; mỗi writer/reader trong cluster tự chạy giữa hai mốc đó.

**Scale thế nào.** Aurora theo dõi CPU, RAM và mạng liên tục, tăng/giảm theo bước nhỏ nhất **0,5 ACU**, và làm việc đó **trong khi kết nối và transaction vẫn đang chạy**, không ngắt gì cả. Đây là khác biệt lớn với Serverless v1 đời cũ (đã deprecated): v1 phải chờ một "điểm lặng" không có transaction rồi mới nhảy sang mức dung lượng kế tiếp, nên chậm hơn và có thể kẹt không scale được khi transaction chạy liên tục.

**Khoảng dung lượng:**

| | Giá trị hiện tại | Con số đề thi quen dùng |
|--|------------------|--------------------------|
| Min | **0 ACU** (auto-pause) hoặc từ 0,5 ACU | 0,5 ACU |
| Max | **256 ACU** (≈ 512 GiB RAM) | 128 ACU |

Đặt min = 0 thì instance **tự tạm dừng** sau một khoảng không có kết nối nào (tối thiểu 5 phút) và không tính tiền compute trong lúc dừng. Kết nối đầu tiên sau đó phải chờ **khoảng 15 giây** để instance thức dậy. Hợp với dev/test, không hợp với production có người dùng thật.

**Chọn min và max.** Max là trần hoá đơn và trần chịu tải. Min nên đủ để giữ dữ liệu nóng trong RAM: nếu min quá thấp, sau một đêm vắng buffer pool bị thu nhỏ, và sáng hôm sau các query đầu tiên phải đọc lại từ đĩa trong lúc Aurora đang scale lên.

**Tính tiền thử** (us-east-1, ~$0,12 mỗi ACU-giờ; để so sánh, `db.r6i.large` 16 GiB giá ~$0,29/giờ):

```
Chạy cố định 8 ACU:    8 × 0,12 = 0,96 $/giờ   → đắt gấp ~3,3 lần r6i.large cùng lượng RAM
Điểm hoà vốn:          0,29 ÷ 0,12 ≈ 2,4 ACU trung bình (≈ 30% của đỉnh 8 ACU)

Kịch bản A — đỉnh 8 ACU trong 8 giờ, còn lại 1 ACU:
  (8×8 + 1×16) × 0,12 = 9,60 $/ngày   > 6,96 $/ngày của r6i.large  → provisioned rẻ hơn
Kịch bản B — đỉnh 8 ACU trong 4 giờ, còn lại 0,5 ACU:
  (8×4 + 0,5×20) × 0,12 = 5,04 $/ngày < 6,96 $/ngày                → serverless rẻ hơn

Min 0,5 ACU chạy cả tháng: 0,5 × 0,12 × 730 giờ ≈ 44 $
```

Bài học từ phép tính: mỗi đơn vị dung lượng của serverless đắt hơn khoảng 3 lần, nên nó chỉ rẻ khi **phần lớn thời gian database chạy thấp hơn nhiều so với đỉnh**.

- **Hợp:** dev/test, tải thất thường hoặc không đoán được, SaaS multi-tenant (mỗi tenant một cluster nhỏ, đa số ngủ gần hết ngày), ứng dụng mới chưa biết cần bao nhiêu.
- **Không hợp:** tải đều 24/7. Instance provisioned rẻ hơn nhiều và latency ổn định hơn vì không có giai đoạn "đang scale lên".

### 3.4 Aurora vs RDS quick

Sau khi đã hiểu §3.1, bảng này chỉ còn là tóm tắt. Mọi khác biệt đều bắt nguồn từ một điểm: Aurora dùng **chung một storage**, RDS thì **mỗi instance một ổ EBS riêng**.

| Aspect | Aurora | RDS standard |
|--------|--------|--------------|
| Storage | Dùng chung, 6 bản / 3 AZ, tự nở theo dữ liệu. Trần: đề thi dùng **128 TiB**; các phiên bản engine mới đã lên 256 TiB | Mỗi instance một ổ EBS, bạn chọn dung lượng (có storage autoscaling nhưng phải bật) |
| Replica lag | Thường thấp hơn nhiều so với 100 ms, vì reader không phải replay | Từ mili-giây tới nhiều giây khi ghi nhiều, vì replica phải replay log lên đĩa riêng |
| Failover | Thường dưới 60 giây, hay gặp dưới 30 giây: nâng một reader vốn đã thấy sẵn dữ liệu | Khoảng 60–120 giây: chuyển sang standby ở AZ khác |
| Standby có phục vụ đọc không | Có. Reader vừa đọc vừa là ứng viên failover | Không (Multi-AZ instance): standby chỉ nằm chờ |
| Backtrack | Có (Aurora MySQL): tua ngược tại chỗ, không cần restore (§4.3) | Không |
| Cost | Instance đắt hơn RDS cùng cỡ. Storage ~$0,10/GB-tháng tính theo dung lượng **dùng thật**, cộng phí I/O (hoặc chọn I/O-Optimized, §3.2) | Instance rẻ hơn. Storage EBS tính theo dung lượng **cấp phát**, không có phí I/O riêng với gp3 |

Khi nào vẫn chọn RDS: engine không có bản Aurora (Oracle, SQL Server, MariaDB, Db2), database nhỏ cần giá thấp nhất, hoặc cần một tính năng/extension mà Aurora không hỗ trợ.

### 3.5 Connection management

**Bài toán.** Mỗi kết nối tới database không miễn phí: database cấp cho nó một phần RAM và một thread/process riêng, và việc mở kết nối mới (bắt tay TLS, xác thực) tốn cả CPU lẫn vài chục mili-giây. Vì vậy mỗi database có trần `max_connections`. Ở Aurora, trần này mặc định tính theo RAM của instance, instance càng lớn trần càng cao.

Một app server truyền thống giữ sẵn một nhóm kết nối dùng lại (*connection pool*), ví dụ 20 server × 25 kết nối = 500. Lambda thì phá vỡ mô hình đó: **mỗi môi trường chạy Lambda là một tiến trình riêng, tự mở kết nối của riêng nó**, không chia sẻ pool với ai.

```
Lambda concurrency:   5.000 môi trường chạy đồng thời → 5.000 kết nối
Aurora max_connections:  500
→ 4.500 lần gọi nhận lỗi "too many connections". Hiện tượng này gọi là connection storm.
```

Tăng cỡ instance để nâng `max_connections` lên 5.000 là trả tiền RAM cho những kết nối gần như ngồi không.

**RDS Proxy giải quyết thế nào.** RDS Proxy là một dịch vụ managed, serverless, đứng giữa app và database. App kết nối tới endpoint của proxy thay vì endpoint của database. Proxy làm hai việc:

- **Pooling:** nó giữ sẵn một số kết nối tới database và dùng lại, nên database không phải mở/đóng kết nối liên tục.
- **Multiplexing:** proxy nhận ra ranh giới của từng transaction. Một kết nối database chỉ bị "mượn" trong lúc transaction đang chạy, xong là trả về pool cho client khác. Nhờ vậy **rất nhiều kết nối phía client dùng chung một số ít kết nối phía database**.

```
Mỗi lần gọi Lambda chạy 100 ms, trong đó chỉ ~5 ms thật sự nằm trong transaction.
5.000 client × (5 ÷ 100) = ~250 kết nối database bận cùng lúc  → nằm gọn dưới trần 500
```

(5 ms là số minh hoạ; tỉ lệ thật tuỳ app.) Khi mọi kết nối đều bận, proxy **xếp hàng** request thay vì trả lỗi ngay.

Hai lợi ích phụ hay ra đề:

- **Failover mượt hơn.** Proxy giữ kết nối với client và tự trỏ sang writer mới, không phụ thuộc DNS cache. AWS công bố giảm thời gian failover **tới 66%** với Aurora Multi-AZ.
- **Bảo mật.** App xác thực với proxy bằng **IAM**, còn mật khẩu database nằm trong **Secrets Manager**, không nằm trong code hay biến môi trường.

Một giới hạn cần biết: nếu session dùng thứ gắn chặt với một kết nối cụ thể (biến session, bảng tạm…), proxy buộc phải giữ riêng kết nối đó cho client tới hết session. Hiện tượng này gọi là **pinning** và làm mất tác dụng multiplexing.

> Bẫy thi: *"Lambda + RDS/Aurora, lỗi too many connections"* → **RDS Proxy**, không phải tăng cỡ instance hay thêm read replica. Và RDS Proxy không chỉ dành cho Lambda: app trên Fargate/EC2 scale ra nhiều instance cũng hưởng lợi.

---

## 4. RDS & Aurora — backup tự động, PITR và restore

Hiệu năng vô nghĩa nếu mất dữ liệu. Đây là nhóm câu "RPO/RTO cho database": đề mô tả một sự cố (DROP TABLE nhầm, deploy hỏng dữ liệu lúc 14:37) rồi hỏi cách khôi phục **ít mất dữ liệu nhất**.

### 4.1 Automated backup vs manual snapshot

| Tiêu chí | **Automated backup** | **Manual snapshot** |
|----------|----------------------|---------------------|
| Ai tạo | RDS/Aurora tự tạo hằng ngày trong **backup window** | Bạn gọi `CreateDBSnapshot` / `CreateDBClusterSnapshot` |
| Retention | **1–35 ngày** (RDS cho phép đặt 0 để tắt; Aurora tối thiểu 1 — **không tắt được**) | **Giữ tới khi bạn xoá**, không có hạn |
| Cho phép PITR | ✓ — đây là thứ duy nhất bật được PITR | ✗ — chỉ restore về đúng thời điểm chụp |
| Khi xoá DB instance/cluster | Bị xoá theo (trừ final snapshot bạn chọn giữ) | Vẫn còn |
| Copy cross-Region / share sang account khác | Gián tiếp (phải copy ra snapshot trước) | ✓ trực tiếp |
| Ảnh hưởng hiệu năng | Aurora: **không** (backup liên tục ở storage layer). RDS Single-AZ: có thể khựng I/O vài giây lúc chụp | Như trên |

- **Backup window**: cửa sổ ~30 phút/ngày bạn chọn (hoặc AWS chọn hộ theo Region). Đặt vào giờ thấp điểm và **không trùng maintenance window**.
- Retention = 0 (chỉ RDS) nghĩa là **tắt automated backup** ⇒ mất luôn PITR. Bẫy thi: đề kể "team đặt retention 0 cho rẻ" rồi hỏi vì sao không PITR được.
- Snapshot **mã hoá** chỉ share sang account khác được khi mã hoá bằng **customer managed KMS key** (key mặc định `aws/rds` không share được) — và phải share cả key.

### 4.2 Point-in-Time Recovery hoạt động thế nào

Automated backup = **snapshot hằng ngày + transaction log liên tục** đẩy sang S3. Restore = lấy snapshot gần nhất trước mốc bạn chọn rồi **replay log tới đúng giây** bạn yêu cầu.

| Điểm cần nhớ | Chi tiết |
|--------------|----------|
| Độ mịn | Chọn tới **từng giây** trong khoảng retention |
| Cận trên | Không phải "ngay bây giờ" — API trả về **latest restorable time**, thường trễ vài phút so với hiện tại |
| Kết quả | **Luôn tạo instance/cluster MỚI**, endpoint mới — không ghi đè cái đang chạy |
| Hệ quả vận hành | Phải trỏ app sang endpoint mới (đổi connection string, hoặc CNAME/Route 53) → RTO gồm cả bước này |
| RPO điển hình | Vài phút (phụ thuộc latest restorable time), **không phải 0** |

> Bẫy thi kinh điển: đáp án nào nói "PITR khôi phục tại chỗ, app không phải đổi gì" → **sai**. PITR luôn sinh resource mới.

### 4.3 Aurora Backtrack — khác PITR thế nào

| Tiêu chí | **PITR (restore)** | **Aurora Backtrack** |
|----------|--------------------|----------------------|
| Engine | RDS + Aurora (MySQL & PostgreSQL) | **Chỉ Aurora MySQL-compatible** |
| Cơ chế | Tạo cluster mới từ snapshot + log | **Tua ngược cluster đang chạy, tại chỗ** |
| Endpoint | Mới → phải đổi connection string | **Giữ nguyên** |
| Tốc độ | Phút → giờ, tuỳ kích thước dữ liệu | Thường vài phút, ít phụ thuộc kích thước |
| Phạm vi thời gian | Cả khoảng retention (tới 35 ngày) | Trong **backtrack window**, tối đa **72 giờ** |
| Tính chất | Không đụng dữ liệu hiện tại (ra bản mới) | **Phá huỷ** — dữ liệu sau mốc tua sẽ mất (vẫn tua tới lại được nếu còn trong window) |
| Phải bật trước? | Chỉ cần automated backup đang bật | **Bật lúc tạo cluster** — không bật thêm cho cluster đang chạy |

**Chọn cái nào**: lỡ chạy `UPDATE` thiếu `WHERE` cách đây 20 phút trên Aurora MySQL và cần app online lại nhanh nhất → **Backtrack**. Cần trạng thái 3 ngày trước để đối chiếu mà production vẫn phải chạy → **PITR ra cluster mới**. Cần giữ bản sao lâu dài cho compliance → **manual snapshot** (hoặc AWS Backup với vault + retention policy tập trung).

### 4.4 Ba thứ hay bị nhầm

1. **Read Replica ≠ backup**. Xoá nhầm bảng thì replica xoá theo trong vài trăm ms. Chỉ PITR/snapshot cứu được.
2. **Multi-AZ ≠ backup**. Standby là bản sao đồng bộ — lỗi logic được nhân bản y hệt.
3. **DynamoDB có PITR riêng**: bật `PointInTimeRecovery` cho table, restore tới bất kỳ giây nào trong **35 ngày** gần nhất, và cũng **luôn ra table mới**. Cùng tư duy với RDS, khác API.

---

## 5. DynamoDB performance

Trước khi nói tới hiệu năng cần bốn khái niệm nền. Phần lý thuyết sâu hơn nằm ở [[foundations-05-partitioning-and-sharding]], nhưng đọc đoạn dưới là đủ cho cả section này.

- **Item** là một bản ghi (tương đương một dòng), tối đa **400 KB**. **Table** là tập các item, không có schema cố định ngoài khoá.
- **Partition key (PK)** là thuộc tính bắt buộc của mọi item, ví dụ `userId`. DynamoDB **băm** giá trị PK để quyết định item nằm ở **partition** nào. Partition là một mảnh dữ liệu vật lý nằm trên một nhóm máy riêng; bảng càng lớn hoặc càng nhiều tải thì DynamoDB tự tách thêm partition.
- **Sort key (SK)** là thuộc tính tuỳ chọn, ví dụ `orderDate`. Các item cùng PK được xếp cạnh nhau theo thứ tự SK, nên lấy "mọi đơn hàng của user 42 trong tháng 10" chỉ là đọc một dải liên tục.
- Ba cách đọc: **`GetItem`** lấy đúng một item theo PK (+SK). **`Query`** lấy nhiều item **cùng một PK**, lọc theo SK. **`Scan`** đọc **cả bảng** rồi mới lọc, vừa chậm vừa đắt, gần như luôn là đáp án sai trong đề.

Mọi thứ về hiệu năng DynamoDB suy ra từ một câu: **request nhanh và rẻ khi nó chỉ chạm một partition và biết trước PK**. Vì thế phải thiết kế bảng theo cách app truy vấn (*access pattern*), không phải theo hình dạng dữ liệu.

### 5.1 Capacity modes

DynamoDB không cho bạn chọn cỡ máy. Bạn mua **thông lượng**: bảng được phép đọc/ghi bao nhiêu mỗi giây. Có hai cách mua.

**Provisioned.** Bạn khai trước bảng cần bao nhiêu **RCU** (read capacity unit) và **WCU** (write capacity unit) mỗi giây (cách tính ở §5.2) và trả tiền theo giờ cho con số đó, **dù có dùng hết hay không**. Vượt quá thì request bị từ chối bằng lỗi `ProvisionedThroughputExceededException`, gọi là bị *throttle*. Thường bật kèm **auto scaling**: DynamoDB tự chỉnh RCU/WCU để giữ mức sử dụng quanh một ngưỡng (mặc định 70%). Auto scaling phản ứng sau vài phút, nên nó theo kịp tải tăng dần, không cứu được cú tăng vọt trong vài giây.

**On-demand.** Không khai gì cả. Mỗi request tự tính tiền, bảng tự chịu tải tăng giảm. Trả tiền theo **số request thật**.

| | **Provisioned** (+ auto scaling) | **On-demand** |
|--|----------------------------------|---------------|
| Trả tiền theo | RCU/WCU đã khai × số giờ | Từng request |
| Giá us-east-1 | ~$0,00013 / RCU-giờ, ~$0,00065 / WCU-giờ | ~$0,125 / 1 triệu read unit, ~$0,625 / 1 triệu write unit |
| Vượt tải | Throttle cho tới khi auto scaling kịp tăng | Tự chịu, miễn không vượt quá gấp đôi đỉnh cũ trong thời gian rất ngắn |
| Hợp khi | Tải đều hoặc đoán trước được | Tải thất thường, bảng mới chưa biết tải, dev/test, bảng ít dùng |

**On-demand đắt hơn bao nhiêu?** Đặt hai bảng giá cạnh nhau:

```
1 RCU chạy 1 giờ phục vụ được tối đa 3.600 lần đọc, giá 0,00013 $
→ provisioned dùng hết 100%:  0,00013 ÷ 3.600 × 1.000.000 ≈ 0,036 $ / 1 triệu lần đọc
→ on-demand:                                               0,125 $ / 1 triệu lần đọc
→ on-demand đắt gấp ~3,5 lần NẾU provisioned được dùng hết 100%

Điểm hoà vốn: 0,036 ÷ 0,125 ≈ 29%
→ bảng provisioned dùng trung bình dưới ~29% dung lượng đã khai thì on-demand lại rẻ hơn
```

(Phép tính cho WCU ra đúng tỉ lệ đó.)

> Nhiều tài liệu luyện thi còn ghi on-demand "đắt gấp ~7 lần". Đó là giá trước tháng 11/2024; AWS đã giảm 50% giá on-demand nên nay còn ~3,5 lần. Ý mà đề thi kiểm tra không đổi: **tải đều và đoán được → provisioned rẻ hơn; tải thất thường → on-demand**.

**Tính thử một bảng có đỉnh ngắn** (đây là bài tập 5): mỗi ngày 1 giờ đỉnh 50.000 lần đọc/giây, 23 giờ còn lại 5.000 lần/giây, mỗi lần đọc tốn 1 read unit.

```
Tổng lần đọc/ngày = 50.000×3.600 + 5.000×82.800 = 594 triệu

(a) On-demand:                      594 × 0,125 × 30 ngày            ≈ 2.228 $/tháng
(b) Provisioned cố định 50.000 RCU: 50.000 × 0,00013 × 730 giờ       ≈ 4.745 $/tháng
    (mức dùng trung bình chỉ 13,75% → dưới điểm hoà vốn 29% → thua on-demand)
(c) Provisioned cố định 10.000 RCU: 10.000 × 0,00013 × 730           ≈   949 $/tháng
    nhưng giờ đỉnh cần 50.000 → 80% request bị throttle. Rẻ mà không chạy được.
(d) Provisioned + auto scaling:     50.000 RCU × 1 giờ + ~7.143 RCU × 23 giờ
    (7.143 = 5.000 ÷ 70% ngưỡng)   = (6,50 + 21,36) × 30             ≈   836 $/tháng
```

Phương án (d) rẻ nhất, với điều kiện giờ đỉnh **biết trước** (đặt lịch tăng RCU sẵn trước giờ đỉnh). Nếu đỉnh đến bất ngờ thì chỉ (a) chịu được.

Đổi qua lại giữa hai mode: từ provisioned sang on-demand được **tối đa 4 lần trong 24 giờ**; chiều ngược lại đổi lúc nào cũng được. (Đề thi và tài liệu cũ hay ghi "mỗi 24 giờ một lần".)

> Đừng mặc định on-demand cho mọi bảng. Bảng production có tải đều mà để on-demand là trả gấp ~3,5 lần cho cùng lượng request.

### 5.2 Item size & cost

RCU và WCU không đếm "số request" mà đếm **số request nhân với kích thước item**, làm tròn lên theo khối:

| Thao tác | Đơn vị tốn cho **mỗi lần** |
|----------|------------------------------|
| Đọc **strongly consistent** | 1 RCU cho mỗi khối **4 KB** (làm tròn lên) |
| Đọc **eventually consistent** | Một nửa số trên |
| Ghi | 1 WCU cho mỗi khối **1 KB** (làm tròn lên) |
| Đọc/ghi trong transaction | Gấp đôi số tương ứng |

Hai kiểu đọc khác nhau ở chỗ: DynamoDB giữ mỗi item thành nhiều bản. *Eventually consistent* (mặc định) đọc từ một bản bất kỳ, có thể chưa kịp nhận lần ghi cách đó chưa tới một giây. *Strongly consistent* bảo đảm thấy lần ghi mới nhất, đổi lại tốn gấp đôi.

**Tính thử:** item 10 KB, app cần 100 lần đọc/giây và 100 lần ghi/giây.

```
Đọc strongly consistent:    10 KB ÷ 4 KB = 2,5 → làm tròn 3 RCU/lần × 100 = 300 RCU
Đọc eventually consistent:  300 ÷ 2                                       = 150 RCU
Ghi:                        10 KB ÷ 1 KB = 10 WCU/lần × 100               = 1.000 WCU
Ghi trong transaction:      1.000 × 2                                     = 2.000 WCU
```

Để ý ghi đắt hơn đọc rất nhiều: khối tính tiền nhỏ hơn 4 lần (1 KB so với 4 KB) và đơn giá mỗi WCU cao gấp 5 lần RCU. Item nhỏ lại thì mọi thứ rẻ theo: item 3,5 KB chỉ tốn 1 RCU khi đọc (tròn 4 KB) và 4 WCU khi ghi.

Từ đó có hai quy tắc thực dụng:

- **Giữ item hay truy cập ở mức nhỏ**, lý tưởng dưới 4 KB để mỗi lần đọc chỉ tốn 1 RCU. Thuộc tính to mà ít dùng (mô tả dài, JSON lớn) tách sang item khác.
- **File lớn không để trong DynamoDB.** Trần item là **400 KB**; ảnh, PDF, video để trên S3 và chỉ lưu đường dẫn (S3 key) trong item.

### 5.3 Hot partition revisit

**Vấn đề.** Thông lượng của bảng được chia cho các partition, và mỗi partition có trần cứng: tối đa khoảng **3.000 RCU và 1.000 WCU mỗi giây**. Nếu phần lớn request dồn vào cùng một giá trị PK, tất cả rơi vào một partition, gọi là **hot partition**. Partition đó bị throttle trong khi cả bảng còn thừa dung lượng.

Ví dụ kinh điển: bảng log dùng `PK = ngày` (`2026-10-13`). Hôm nay mọi lần ghi đều có cùng PK:

```
5.000 lần ghi/giây (item ≤ 1 KB) → 5.000 WCU dồn vào MỘT partition, trần là 1.000
→ 80% lần ghi bị throttle, dù bảng khai 20.000 WCU
```

Lý thuyết đầy đủ ở [[foundations-05-partitioning-and-sharding]]. Ba cách xử lý:

- **Chọn PK có nhiều giá trị và phân bố đều** (`userId`, `deviceId`, `orderId`) thay vì thứ ít giá trị (`ngày`, `status`, `country`). Đây là cách sửa đúng gốc.
- **Write sharding** khi buộc phải dùng PK ít giá trị: gắn thêm hậu tố để tách một key thành N key, `PK = 2026-10-13#7` với hậu tố là số ngẫu nhiên hoặc hash từ 0 tới N−1. Với ví dụ trên cần ít nhất 5.000 ÷ 1.000 = 5 mảnh, chọn N = 10 cho dư. Cái giá: muốn đọc cả ngày phải `Query` đủ N key rồi gộp kết quả.
- **Adaptive capacity** là cơ chế DynamoDB tự bật sẵn: nó chuyển dung lượng dư từ partition rảnh sang partition nóng và có thể tách riêng một key nóng ra partition khác. Nó cứu được lệch tải vừa phải, nhưng **không vượt được trần 3.000/1.000 của một partition**, nên không thay được việc chọn key đúng.

**Sparse GSI** (GSI giải thích ở §5.4) là kỹ thuật liên quan: DynamoDB chỉ đưa vào index những item **có** thuộc tính làm khoá của index. Nếu chỉ 1% đơn hàng có thuộc tính `needsReview`, index trên thuộc tính đó chỉ chứa 1% số item. Index nhỏ thì query nhanh, và 99% lần ghi còn lại không phải ghi thêm vào index.

### 5.4 Indexes

**Vì sao cần.** Bảng chỉ truy vấn nhanh được theo PK (+SK) của nó. Bảng `Orders` có `PK = customerId` trả lời tốt câu "đơn của khách 42", nhưng câu "mọi đơn đang ở trạng thái SHIPPED" thì phải `Scan` cả bảng. **Secondary index** là một bản sao của bảng (toàn bộ hoặc vài thuộc tính) được **sắp theo một khoá khác**, do DynamoDB tự duy trì mỗi khi bảng gốc thay đổi.

**LSI (Local Secondary Index)** giữ **nguyên PK**, chỉ đổi **sort key**. Ví dụ bảng gốc sắp đơn theo `orderDate`, LSI sắp theo `amount` để hỏi "đơn lớn nhất của khách 42". Vì cùng PK, dữ liệu index nằm chung partition với item gốc ("local"). Nhờ đó LSI **đọc strongly consistent được** và dùng chung RCU/WCU với bảng. Hai hạn chế: phải khai **lúc tạo bảng** (không thêm sau được), tối đa **5** cái.

**GSI (Global Secondary Index)** đổi **cả PK**. Ví dụ `PK = status`, `SK = orderDate`. Dữ liệu được tổ chức lại hoàn toàn nên GSI là một cấu trúc **riêng**, có partition riêng và RCU/WCU riêng. Mỗi lần ghi vào bảng gốc, DynamoDB **sao chép bất đồng bộ** sang GSI, thường trong chưa tới một giây. Chính vì bất đồng bộ nên GSI **chỉ đọc eventually consistent**. Thêm/xoá lúc nào cũng được, mặc định tối đa **20** cái mỗi bảng.

| Index | Khoá | Tạo lúc | Lưu ở đâu | Strongly consistent? | Capacity |
|-------|------|---------|-----------|----------------------|----------|
| **LSI** | Cùng PK, khác SK | Chỉ lúc tạo bảng, tối đa 5 | Chung partition với bảng gốc | ✓ | Dùng chung RCU/WCU của bảng |
| **GSI** | PK (và SK) khác hẳn | Bất kỳ lúc nào, mặc định tối đa 20 | Riêng | ✗ (eventual, vì sao chép bất đồng bộ) | RCU/WCU riêng |

Ba điều về chi phí của GSI:

- Mỗi lần ghi vào bảng gốc mà chạm tới thuộc tính có trong GSI thì tốn thêm WCU **của GSI**. Bảng có 3 GSI thì một lần ghi có thể thành 4 lần ghi.
- **Projection** quyết định GSI chép những thuộc tính nào: `KEYS_ONLY` (chỉ khoá), `INCLUDE` (khoá + vài thuộc tính chọn), `ALL` (cả item). `ALL` tiện nhưng nhân đôi dung lượng lưu trữ và làm mọi lần ghi vào index nặng bằng cả item.
- Nếu GSI khai thiếu WCU, nó throttle **ngược lại lần ghi vào bảng gốc**. Luôn cấp WCU cho GSI ngang với bảng.

> Bẫy thi: "Cần strongly consistent với PK khác" → **không có giải pháp 100%**. GSI eventual. Workaround: write thêm record với PK đó vào main table (denormalize).

### 5.5 DynamoDB Streams + Lambda

**Nó là gì.** Bật Streams trên một bảng thì mỗi lần một item được tạo, sửa hoặc xoá, DynamoDB ghi thêm một **stream record** vào một log riêng, mô tả thay đổi đó. Kỹ thuật này gọi là *change data capture* (CDC): bắt lấy dòng thay đổi của database để hệ thống khác phản ứng theo. Bạn chọn record chứa gì: chỉ khoá, bản mới của item, bản cũ, hoặc cả hai.

Ba tính chất cần nhớ:

- Record được giữ **24 giờ** rồi tự xoá. Consumer chết quá 24 giờ là mất dữ liệu.
- Mỗi thay đổi xuất hiện **đúng một lần**, và các thay đổi của **cùng một item** đến đúng thứ tự.
- Bật Streams không làm chậm bảng, vì việc ghi stream diễn ra bất đồng bộ.

**Nối với Lambda.** Lambda tự đọc stream theo từng lô (qua *event source mapping*) và gọi hàm của bạn với các record đó; bạn không viết code đọc stream. Từ đó có các use case hay ra đề:

- Đồng bộ dữ liệu sang **OpenSearch** để tìm kiếm full-text (DynamoDB không tìm kiếm theo từ khoá được).
- Cập nhật bảng tổng hợp hoặc bộ đếm khi bảng chi tiết thay đổi.
- Gửi thông báo, ghi audit log, hoặc đẩy thay đổi sang hệ thống khác.

Cần giữ lâu hơn 24 giờ hoặc cần nhiều consumer đọc độc lập thì dùng tuỳ chọn **Kinesis Data Streams for DynamoDB** (retention tới 365 ngày, xem bài ch2-06 §2.1).

### 5.6 DynamoDB Transactions

**Bài toán.** Bình thường mỗi lần ghi trong DynamoDB độc lập với nhau. Chuyển 100 điểm từ ví A sang ví B là hai lần ghi; nếu lần đầu thành công mà lần hai lỗi thì điểm biến mất. **Transaction** gom nhiều thao tác thành một khối **all-or-nothing**: hoặc tất cả thành công, hoặc không có gì thay đổi.

- **`TransactWriteItems`** gom tối đa **100 thao tác ghi** (Put, Update, Delete, hoặc chỉ kiểm tra điều kiện), tổng kích thước tối đa **4 MB**, trải trên một hoặc nhiều bảng trong cùng account và Region.
- **`TransactGetItems`** đọc tối đa **100 item** thành một ảnh chụp nhất quán.

**Vì sao tốn gấp đôi.** Để bảo đảm all-or-nothing, DynamoDB chạm mỗi item hai lần: một lần *chuẩn bị* (khoá item, kiểm tra điều kiện) và một lần *commit*. Vì thế transaction tốn **2x WCU** (hoặc 2x RCU) so với thao tác thường, như phép tính ở §5.2 (1.000 → 2.000 WCU). Capacity bị trừ cả khi transaction thất bại.

Dùng cho nghiệp vụ tài chính, tồn kho, hoặc bất kỳ chỗ nào nhiều item phải đổi cùng nhau. **Không** bọc mọi lần ghi vào transaction: tốn gấp đôi và dễ xung đột khi hai transaction cùng chạm một item (một trong hai bị huỷ, phải thử lại).

### 5.7 Global Tables

**Nó là gì.** Một bảng có **bản sao (replica) ở nhiều Region**, và **mọi replica đều nhận cả đọc lẫn ghi**. Mô hình này gọi là *active-active* hay *multi-active*: người dùng ở Singapore ghi vào replica Singapore, người dùng ở Frankfurt ghi vào replica Frankfurt, không ai phải gửi request vượt đại dương. So sánh với Aurora Global Database (§3.2), nơi chỉ một Region nhận ghi.

**Sao chép và xung đột.** Ở chế độ mặc định, một lần ghi vào replica nào thì được chép **bất đồng bộ** sang các replica còn lại, thường trong khoảng một giây. Vì bất đồng bộ nên có thể xảy ra chuyện hai Region cùng sửa một item gần như đồng thời. DynamoDB xử lý bằng **last writer wins (LWW)**: bản có dấu thời gian mới hơn thắng, bản kia bị ghi đè **trong im lặng**, không có lỗi nào được trả về. Nếu nghiệp vụ không chấp nhận mất một lần ghi kiểu đó (số dư tài khoản, tồn kho), hãy thiết kế để mỗi item chỉ được ghi ở một Region "chủ". Lý thuyết đánh đổi nằm ở [[foundations-04-latency-vs-consistency]].

**Chi phí.** Mỗi lần ghi được thực hiện lại ở **mọi** replica, và bạn trả write unit ở từng Region. Bảng có 3 replica thì một lần ghi tốn tiền ghi 3 lần.

Hệ quả hay ra đề:

- Mất cả một Region thì app chuyển sang replica khác và **ghi tiếp được ngay**. Dữ liệu chưa kịp chép (khoảng một vài giây cuối) có thể đến muộn, tức RPO nhỏ nhưng khác 0.
- Đọc strongly consistent chỉ nhất quán **trong một Region**. Nó không thấy lần ghi vừa xảy ra ở Region khác.

> Mới hơn phạm vi đề thi: Global Tables nay có thêm chế độ **multi-Region strong consistency** (ghi đồng bộ sang ít nhất một Region khác, RPO = 0, phải triển khai đúng 3 Region). Đề SAA-C03 mặc định Global Tables là eventual + last writer wins.

---

## 6. Caching — đòn bẩy lớn nhất

**Cache là gì và vì sao là đòn bẩy lớn.** Cache là một kho **key → value nằm trong RAM**, đặt giữa app và database, giữ sẵn kết quả của những lần đọc hay lặp lại. Lấy một giá trị từ cache mất dưới 1 ms; chạy lại query SQL để ra đúng giá trị đó mất vài ms tới vài trăm ms và tốn CPU của database.

Ba từ dùng suốt section: **hit** là lần đọc tìm thấy dữ liệu trong cache. **Miss** là lần không tìm thấy, phải xuống database. **Hit rate** là tỉ lệ hit trên tổng số lần đọc. Hit rate quyết định database còn phải gánh bao nhiêu:

```
App có 10.000 lần đọc/giây.
Hit rate 80% → database còn nhận 2.000 lần/giây
Hit rate 95% → database còn nhận   500 lần/giây   (giảm 20 lần so với không cache)
Hit rate 99% → database còn nhận   100 lần/giây
```

Cái giá của cache là dữ liệu trong đó có thể **cũ** (*stale*) so với database. Bốn mục dưới đây là bốn cách trả lời hai câu hỏi: dữ liệu vào cache **lúc nào**, và làm sao để nó **không cũ quá lâu**.

### 6.1 Cache-aside (lazy loading)

App tự điều khiển cache, và chỉ nạp dữ liệu vào cache **khi có người hỏi tới**:

1. App đọc cache theo key.
2. **Hit** thì trả về ngay.
3. **Miss** thì app đọc database, rồi **ghi kết quả vào cache** (kèm TTL, xem §6.4) để lần sau hit.

Khi dữ liệu thay đổi, app ghi database rồi **xoá key đó khỏi cache** (*invalidate*); lần đọc kế tiếp sẽ miss và nạp lại bản mới.

- **Ưu:** cache chỉ chứa thứ thực sự được đọc, nên tiết kiệm RAM. Cache chết thì app vẫn chạy được (chậm hơn), vì database vẫn là nguồn chính.
- **Nhược:** lần đọc đầu tiên của mỗi key luôn là miss, và một lần miss tốn **ba chặng** thay vì một: hỏi cache (trượt), đọc database, ghi lại cache. Khi cache vừa khởi động hoặc vừa bị xoá sạch (*cold cache*), mọi request đều miss cùng lúc và database lãnh trọn tải.

Đây là pattern mặc định với ElastiCache và là thứ đề thi ngầm hiểu khi nói "thêm cache trước RDS".

### 6.2 Write-through

Cache được cập nhật **ngay trong lúc ghi**, không chờ ai đọc: mỗi lần app ghi database, nó ghi luôn giá trị mới vào cache.

- **Ưu:** dữ liệu trong cache luôn mới, lần đọc ngay sau khi ghi là hit.
- **Nhược:** mọi lần ghi đều tốn thêm một chặng, và cache chứa cả những thứ **không ai đọc lại** (ví dụ 1 triệu đơn hàng cũ), tốn RAM vô ích. Node cache mới thay vào cũng trống trơn cho tới khi dữ liệu được ghi lại.

Thực tế hay **kết hợp** cả hai: write-through để dữ liệu vừa ghi có sẵn trong cache, cache-aside để tự nạp những gì còn thiếu, và TTL để dọn những thứ không ai đọc.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cache-aside (lazy loading) so với Write-through — luồng đọc/ghi giữa App, Cache, DB</title>
  <desc>Hai chiến lược cạnh nhau. Cache-aside khi đọc: App hỏi Cache, nếu miss thì đọc DB rồi ghi ngược vào Cache. Write-through khi ghi: App ghi cả Cache và DB cùng lúc nên cache luôn fresh.</desc>
  <defs>
    <marker id="caArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <text x="180" y="24" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Cache-aside (lazy loading) — khi ĐỌC</text>
  <text x="540" y="24" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Write-through — khi GHI</text>
  <line x1="360" y1="36" x2="360" y2="340" stroke="currentColor" stroke-opacity="0.18"/>
  <g>
    <rect x="30" y="56" width="110" height="40" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="85" y="81" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">App</text>
    <rect x="225" y="56" width="110" height="40" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="280" y="81" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Cache</text>
    <rect x="125" y="270" width="110" height="40" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="180" y="295" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">DB</text>
    <line x1="140" y1="70" x2="221" y2="70" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#caArr)"/>
    <text x="180" y="64" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">1. đọc</text>
    <line x1="221" y1="84" x2="142" y2="84" stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="4 3" marker-end="url(#caArr)"/>
    <text x="182" y="110" font-size="10" text-anchor="middle" fill="#10b981" opacity="0.95" font-weight="700">HIT → trả ngay</text>
    <line x1="100" y1="96" x2="165" y2="266" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#caArr)"/>
    <text x="78" y="200" font-size="10" fill="currentColor" opacity="0.85">2. MISS → đọc DB</text>
    <line x1="232" y1="270" x2="276" y2="100" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#caArr)"/>
    <text x="262" y="200" font-size="10" fill="currentColor" opacity="0.85">3. ghi lại cache</text>
  </g>
  <g>
    <rect x="385" y="56" width="110" height="40" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="440" y="81" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">App</text>
    <rect x="585" y="56" width="110" height="40" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="640" y="81" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Cache</text>
    <rect x="485" y="270" width="110" height="40" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="540" y="295" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">DB</text>
    <line x1="495" y1="74" x2="581" y2="74" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#caArr)"/>
    <text x="538" y="68" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">1a. ghi cache</text>
    <line x1="460" y1="96" x2="525" y2="266" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#caArr)"/>
    <text x="408" y="200" font-size="10" fill="currentColor" opacity="0.85">1b. ghi DB (cùng lúc)</text>
    <text x="640" y="120" font-size="10" text-anchor="middle" fill="#10b981" opacity="0.95" font-weight="700">cache luôn fresh</text>
  </g>
  <text x="30" y="338" font-size="10" fill="currentColor" opacity="0.7">Chỉ data được hỏi mới vào cache; lần miss đầu tốn 3 bước.</text>
  <text x="385" y="338" font-size="10" fill="currentColor" opacity="0.7">Mọi write đều vào cache, kể cả data ít khi đọc lại.</text>
</svg>

### 6.3 Write-behind / write-back

App **chỉ ghi vào cache** và trả lời người dùng ngay; cache tự đẩy thay đổi xuống database sau đó, theo lô, bất đồng bộ.

- **Ưu:** ghi rất nhanh, và database nhận ít lần ghi hơn vì nhiều thay đổi của cùng một key được gộp lại.
- **Nhược:** trong khoảng thời gian dữ liệu mới chỉ nằm ở cache, cache chết là **mất dữ liệu**. Vì rủi ro đó nên hiếm dùng, và trong đề SAA nó thường chỉ xuất hiện như một đáp án nhiễu.

### 6.4 TTL strategy

**TTL** (time to live) là thời hạn sống gắn cho mỗi key: hết hạn thì cache tự xoá key, lần đọc sau sẽ miss và nạp lại bản mới từ database. TTL là lưới an toàn chống dữ liệu cũ, kể cả khi app quên invalidate.

- **TTL ngắn (vài giây tới vài phút):** dữ liệu cũ tối đa bấy nhiêu, nhưng key hết hạn thường xuyên nên miss nhiều hơn. Hợp với giá, tồn kho, trạng thái.
- **TTL dài (hàng giờ):** hit rate cao, database nhẹ, nhưng người dùng có thể thấy dữ liệu cũ hàng giờ nếu không invalidate chủ động. Hợp với thứ gần như không đổi: danh mục, cấu hình, profile.

**Vấn đề hết hạn đồng loạt.** Giả sử lúc deploy, app nạp 10.000 key vào cache cùng lúc, tất cả TTL = 300 giây. Đúng 300 giây sau cả 10.000 key cùng hết hạn, 10.000 lần miss đập xuống database trong cùng một giây. Hiện tượng "cả bầy cùng lao vào một lúc" này gọi là **thundering herd**.

**Jitter** là cách chữa: cộng thêm một lượng ngẫu nhiên vào TTL của từng key, ví dụ ±10%.

```
TTL = 300 giây ± 10%  → mỗi key hết hạn ở một thời điểm ngẫu nhiên trong khoảng 270–330 giây
10.000 key trải đều trên 60 giây ≈ 167 lần nạp lại mỗi giây, thay vì 10.000 trong một giây
```

Trường hợp **một** key rất nóng hết hạn (cache stampede) là vấn đề khác, xử lý ở §10.3.

| Pattern | Dữ liệu vào cache khi | Dữ liệu cũ? | Rủi ro chính |
|---------|------------------------|-------------|--------------|
| **Cache-aside** | Có người đọc (miss) | Có, tới khi invalidate hoặc hết TTL | Miss đầu tiên chậm; cold cache dồn tải xuống DB |
| **Write-through** | Mỗi lần ghi | Không | Tốn RAM cho dữ liệu không ai đọc |
| **Write-behind** | Mỗi lần ghi (DB cập nhật sau) | Không (cache mới hơn cả DB) | Mất dữ liệu nếu cache chết |

---

## 7. ElastiCache

**Nó là gì.** ElastiCache là dịch vụ AWS vận hành hộ các engine cache in-memory: AWS lo cấp máy, vá lỗi, thay node hỏng, failover. Một **node** là một máy cache; lượng dữ liệu chứa được bằng RAM của node. Có hai họ engine: **Redis** (cùng với **Valkey**, bản fork mã nguồn mở tương thích Redis mà AWS nay khuyến nghị; với đề thi coi hai cái là một) và **Memcached**.

### 7.1 Redis vs Memcached

**Memcached** là kho key → chuỗi byte thuần tuý. Nó không có replica, không ghi gì xuống đĩa: node chết là mất phần dữ liệu trên node đó. Điểm mạnh là đơn giản và **đa luồng**, một node lớn tận dụng được mọi core CPU.

**Redis/Valkey** làm được nhiều hơn hẳn, và mỗi tính năng dưới đây là một từ khoá trong đề:

- **Cấu trúc dữ liệu.** Value không chỉ là chuỗi mà còn là list, hash, set, và **sorted set** (tập hợp tự sắp theo điểm số). Sorted set là lý do "leaderboard" luôn dẫn tới Redis: thêm điểm và lấy top 10 đều là một lệnh, không phải `ORDER BY` trên cả bảng.
- **Replication + Multi-AZ failover.** Mỗi primary có tới 5 **replica** chỉ-đọc ở AZ khác. Primary chết thì một replica tự được nâng lên.
- **Persistence** (lưu xuống đĩa). **RDB** là ảnh chụp toàn bộ dữ liệu ra file theo định kỳ, đây chính là cơ chế backup/snapshot của ElastiCache. **AOF** (append-only file) ghi nối đuôi từng lệnh ghi để phát lại khi khởi động. Cả hai chỉ giúp khôi phục *phần lớn* dữ liệu: những gì ghi sau lần lưu cuối vẫn mất.
- **Transaction** với `MULTI`/`EXEC`: gom nhiều lệnh chạy liền nhau như một khối, không lệnh của client khác chen vào giữa.
- **Pub/Sub**: client đăng ký một kênh và nhận ngay mọi message gửi vào kênh đó. Dùng cho chat, thông báo real-time.

| Aspect | Redis / Valkey | Memcached |
|--------|----------------|-----------|
| Data type | String, list, hash, set, sorted set, stream, geo | Chỉ string |
| Replication | Có, tới 5 replica mỗi shard | Không |
| Persistence | RDB/AOF, có backup/restore | Không (chỉ nằm trong RAM) |
| Multi-AZ failover | Có, tự động | Không |
| Transaction (MULTI/EXEC) | Có | Không |
| Pub/Sub | Có | Không |
| Mô hình luồng | Chạy lệnh trên một luồng chính; scale bằng cách thêm shard | Đa luồng; scale bằng cách dùng node nhiều core hơn |
| Use case | Session, leaderboard, queue, geo, rate limit, cache cần HA | Cache key-value đơn giản, mất được |

Gần như mọi trường hợp chọn Redis/Valkey. Memcached chỉ đúng khi đề nói rõ: cache **đơn giản**, **đa luồng**, **không cần** replica/persistence/kiểu dữ liệu phức tạp.

### 7.2 ElastiCache Redis modes

Hai chế độ khác nhau ở một câu hỏi: dữ liệu nằm trên **một** nhóm máy hay được **chia ra nhiều** nhóm. Mỗi nhóm gọi là một **shard**: 1 primary (nhận ghi) cộng 0–5 replica (chỉ đọc, giữ bản sao của primary đó).

**Cluster mode disabled: đúng 1 shard.** Toàn bộ dữ liệu nằm trên một primary và được sao sang các replica. Thêm replica thì tăng được sức **đọc** và có HA. Nhưng mọi lần **ghi** vẫn chỉ đi vào một primary, và toàn bộ dataset phải nằm gọn trong RAM của **một node**. Muốn hơn chỉ còn cách đổi sang node to hơn (scale dọc).

**Cluster mode enabled: nhiều shard (tới 500).** Dữ liệu được **chia ra**. Redis băm mỗi key vào một trong 16.384 *hash slot*, mỗi shard giữ một dải slot. Client tự biết key nào thuộc shard nào và gửi thẳng tới đó. Hai thứ tăng theo số shard:

- **Sức ghi**, vì mỗi shard có primary riêng. 3 shard là 3 primary cùng nhận ghi.
- **Dung lượng**, vì dataset trải trên nhiều node.

```
Dataset 300 GB, node có 64 GB RAM:
  300 ÷ 64 ≈ 4,7 → tối thiểu 5 shard, thực tế 6–7 để chừa chỗ cho overhead và tăng trưởng
  Cluster mode disabled không làm được, trừ khi có node đủ 300+ GB RAM
```

Cái giá của cluster mode enabled: lệnh đụng nhiều key cùng lúc (transaction, `MGET`) chỉ chạy được khi các key đó nằm chung một slot, nên phải thiết kế key có chủ ý.

| Mode | Shard | Scale đọc | Scale ghi / dung lượng | Use case |
|------|-------|-----------|-------------------------|----------|
| **Cluster mode disabled** | 1 (1 primary + 0–5 replica) | Thêm replica | Chỉ bằng node to hơn | Dataset vừa một node, tải thiên về đọc |
| **Cluster mode enabled** | 1–500, mỗi shard 1 primary + 0–5 replica | Thêm replica | **Thêm shard** | Dataset lớn hơn một node, hoặc ghi vượt sức một primary |

> Bẫy thi: *"Redis đang nghẽn **ghi**"* mà đáp án là "thêm read replica" → **sai**, replica chỉ nhận đọc. Phải thêm shard (cluster mode enabled) hoặc đổi node lớn hơn. (Đây là bài tập 4.)

### 7.3 Global Datastore

Global Datastore sao chép một cluster Redis/Valkey **sang Region khác**. Một cluster ở Region chính nhận cả đọc lẫn ghi; tối đa 2 cluster phụ ở Region khác **chỉ nhận đọc**. Việc sao chép là bất đồng bộ, độ trễ thường dưới 1 giây.

Hai công dụng: người dùng ở xa đọc từ cluster phụ gần họ với latency thấp, và **disaster recovery**: khi Region chính gặp sự cố, bạn nâng một cluster phụ lên làm chính. Khác với DynamoDB Global Tables (§5.7), ở đây chỉ **một** Region nhận ghi.

### 7.4 MemoryDB for Redis (khác ElastiCache)

**Vấn đề của ElastiCache khi làm database chính.** Replication của Redis là bất đồng bộ: primary trả lời "đã ghi" cho client **trước khi** replica nhận được. Primary chết đúng lúc đó thì lần ghi ấy mất, dù có Multi-AZ. Với cache thì chấp nhận được vì database gốc vẫn còn. Với nguồn dữ liệu duy nhất thì không.

**MemoryDB** dùng cùng API và kiểu dữ liệu của Redis nhưng đổi cách ghi: mỗi lần ghi được lưu vào một **transaction log trải trên nhiều AZ trước khi** trả lời client. Từ đó có hai tính chất:

- **Durable:** node chết không mất lần ghi nào đã được xác nhận.
- **Strong consistency** trên primary: đã ghi xong thì đọc lại chắc chắn thấy.

Cái giá: lần **ghi** chậm hơn ElastiCache (cỡ vài mili-giây thay vì dưới mili-giây, vì phải chờ log), đọc vẫn ở mức micro-giây; và đơn giá cao hơn ElastiCache cùng cỡ node.

Dùng khi muốn Redis làm **primary database** và bỏ hẳn tầng "database + cache" hai lớp. Đề hỏi "cache" → ElastiCache; hỏi "in-memory **database**, durable, không được mất dữ liệu" → MemoryDB.

---

## 8. DAX — DynamoDB Accelerator

**Nó là gì.** DAX là một cụm node cache in-memory do AWS vận hành, đặt trong VPC của bạn, **chỉ dùng cho DynamoDB**. Nó đưa thời gian đọc từ vài mili-giây của DynamoDB xuống cỡ vài trăm micro-giây cho những item đã nằm trong cache.

**Vì sao gần như không phải sửa code.** DAX nói đúng API của DynamoDB (`GetItem`, `Query`, `PutItem`…). App chỉ đổi client của SDK sang DAX client và trỏ tới endpoint của cụm DAX. Logic "hỏi cache trước, miss thì xuống database, rồi ghi lại cache" do DAX tự làm, bạn không viết.

**Hai cache bên trong, hoạt động độc lập:**

- **Item cache** giữ kết quả của `GetItem`/`BatchGetItem`, theo khoá của item.
- **Query cache** giữ nguyên tập kết quả của `Query`/`Scan`, theo đúng tham số của câu query.

Mỗi cache có TTL riêng, cấu hình được.

**Ghi qua DAX là write-through.** DAX chuyển lần ghi xuống DynamoDB trước, DynamoDB xác nhận xong thì DAX mới cập nhật item cache và trả lời app. Hai chỗ dễ sai:

- Lần ghi chỉ làm mới **item cache**. **Query cache không bị invalidate**: một `Query` đã cache vẫn trả tập kết quả cũ cho tới khi hết TTL, dù item trong đó vừa đổi.
- Ai đó ghi **thẳng vào DynamoDB**, không qua DAX, thì DAX không biết. Item trong cache sẽ cũ cho tới khi hết TTL.

**Chỉ tăng tốc được đọc eventually consistent.** Khi app yêu cầu đọc strongly consistent (`ConsistentRead=true`), DAX **chuyển thẳng** request xuống DynamoDB và **không cache** kết quả, vì nó không có cách nào biết bản trong RAM của mình có phải mới nhất hay không. Request đó không nhanh hơn chút nào, còn tốn thêm một chặng mạng.

> Bẫy thi: "Read DynamoDB strongly consistent < 1ms" → **DAX không giúp**. DAX chỉ accelerate eventual.

### 8.1 DAX vs ElastiCache — chọn cái nào (câu exam kinh điển)

Cả hai đều là in-memory cache, nhưng phục vụ mục đích khác nhau. Đề SAA rất hay hỏi "cache cho DynamoDB read-heavy, ít đổi code nhất" (→ DAX) vs "cache đa nguồn/RDS, cần cấu trúc dữ liệu phong phú" (→ ElastiCache).

| Tiêu chí | **DAX** | **ElastiCache (Redis/Memcached)** |
|----------|---------|-----------------------------------|
| Chuyên cho | **Chỉ DynamoDB** | **Đa mục đích** — RDS/Aurora, DynamoDB, kết quả tính toán, session, bất kỳ nguồn nào |
| Latency | **Microsecond** (µs) read | **Sub-millisecond** (ms) |
| Cache pattern | **Write-through tích hợp sẵn** — app không tự quản lý cache | **Cache-aside**: app phải tự code đọc/ghi/invalidate |
| Thay đổi code | **Rất ít** — API tương thích DynamoDB, chỉ đổi endpoint/client sang DAX SDK | **Nhiều** — viết logic cache-aside, key design, serialize |
| Cấu trúc dữ liệu | Chỉ item/query result của DynamoDB | Redis: string, list, hash, set, sorted set, stream, geo, pub/sub |
| Consistency | **Eventually consistent reads only** (strong → bypass DAX) | Tùy chiến lược app tự định nghĩa |
| Invalidation | Tự động (write-through) + TTL | App tự invalidate hoặc dựa TTL |
| Trường hợp điển hình | DynamoDB read-heavy, hot key, cần µs, ngại đổi code | Leaderboard, session store, cache RDS, rate limiter, queue, cache đa nguồn |

**Quyết định nhanh**:
- Nguồn dữ liệu là **DynamoDB** + read-heavy + muốn **thay đổi code tối thiểu** → **DAX**.
- Cache cho **RDS/Aurora** hoặc **nhiều nguồn**, cần **cấu trúc dữ liệu phong phú** (sorted set, pub/sub...) hoặc pattern cache tùy biến → **ElastiCache Redis**.
- Cần cache DynamoDB **nhưng** muốn dùng chung một lớp cache với dữ liệu khác, hoặc cần strongly consistent qua cache → ElastiCache cache-aside (tự quản lý).

> Bẫy thi: "Cache cho **RDS/Aurora**" mà đáp án có DAX → **loại ngay**. DAX chỉ cache DynamoDB. Ngược lại "cache DynamoDB, ít sửa code nhất" mà chọn ElastiCache thì thua DAX vì phải tự code cache-aside.

> Không loại trừ nhau: một hệ thống có thể dùng **DAX** cho lớp DynamoDB và **ElastiCache Redis** cho session/leaderboard cùng lúc.

---

## 9. CloudFront — cache ở edge

Bài [[ch2-04-network-performance]] nói về CloudFront ở góc độ mạng. Ở đây chỉ xét nó như **một tầng cache nữa**, nằm xa database nhất và gần người dùng nhất.

**Nó là gì.** CloudFront là CDN (content delivery network): một mạng máy chủ cache đặt ở hàng trăm **edge location** khắp thế giới. Người dùng gửi request tới edge gần họ nhất. Nếu edge đã có sẵn bản sao của response thì trả luôn (hit); nếu chưa thì edge hỏi **origin** (máy chủ gốc của bạn: S3, ALB, API Gateway…), trả cho người dùng và giữ lại một bản. Một request hit ở edge thì **không chạm tới app server lẫn database**, nên với nội dung cache được, đây là tầng cache rẻ và hiệu quả nhất.

**Cache được gì.** Không chỉ file tĩnh (ảnh, CSS, JS). Response của API `GET` giống nhau cho mọi người (danh mục sản phẩm, bảng giá, bài viết) cũng cache được, dù chỉ vài giây. Nội dung riêng từng người dùng (giỏ hàng, trang tài khoản) thì không.

**Cache trong bao lâu.** Theo header `Cache-Control: max-age=...` mà origin trả về, nằm trong khoảng min/max TTL bạn đặt ở **cache behavior** (bộ quy tắc gắn với một mẫu đường dẫn, ví dụ `/images/*`).

**Cache key — thứ quyết định hit rate.** Edge tìm bản sao theo **cache key**: mặc định là đường dẫn URL, cộng thêm bất kỳ header, cookie, query string nào bạn bảo CloudFront đưa vào. Hai request chỉ dùng chung một bản cache khi cache key **giống hệt** nhau. Đây là nguyên nhân số một khiến hit rate thấp:

```
Đưa 2 cookie vào cache key, mỗi cookie có 3 giá trị
→ 3 × 3 = 9 bản cache khác nhau cho CÙNG một file, mỗi bản phải miss một lần ở mỗi edge

Đưa cookie session (mỗi user một giá trị) vào cache key
→ mỗi user một bản riêng → hit rate gần 0%
```

**Các cách tăng hit rate** (bài tập 6 hỏi đúng phần này):

- **Thu gọn cache key.** Chỉ đưa vào những header/cookie/query string mà origin thực sự dùng để trả nội dung khác nhau. Bỏ các tham số theo dõi kiểu `utm_source`.
- **Tách cache behavior** cho nội dung tĩnh và động: `*.css`, `/images/*` không forward cookie nào; chỉ đường dẫn động mới forward.
- **Chuẩn hoá request.** `?a=1&b=2` và `?b=2&a=1`, hay `Color=Red` và `color=red`, là các cache key khác nhau. Giữ một thứ tự và một kiểu chữ.
- **Tránh header nhiều giá trị.** Đừng cache theo `User-Agent` (hàng nghìn giá trị); dùng các header rút gọn của CloudFront như `CloudFront-Is-Mobile-Viewer`.
- **Tăng `max-age`** cho nội dung ít đổi, kèm tên file có version (`app.3f9a.js`) để đổi nội dung là đổi URL, không phải chờ hết TTL.
- **Bật Origin Shield.**

**Origin Shield** là một tầng cache tập trung nằm giữa các edge và origin. Không có nó, mỗi edge (hoặc cụm edge theo vùng) khi miss sẽ tự hỏi origin, nên cùng một file có thể bị kéo về hàng chục lần từ hàng chục nơi. Có Origin Shield, mọi edge hỏi qua **một điểm duy nhất**; origin chỉ phải trả mỗi object một lần. Hit rate tổng tăng và tải lên origin giảm.

**Compute ở edge.** Hai lựa chọn chạy code của bạn ngay tại edge, không phải về origin. **CloudFront Functions** là JavaScript rất nhẹ, chạy dưới 1 ms, dành cho việc đơn giản như sửa header, chuyển hướng URL, chuẩn hoá cache key. **Lambda@Edge** là hàm Lambda đầy đủ (Node.js/Python), gọi được mạng và xử lý được body, dành cho việc nặng hơn như cá nhân hoá nội dung hay xác thực phức tạp.

Hai tính năng khác hay ra đề, không liên quan cache nhưng cùng nằm ở CloudFront: **geo restriction** chặn/cho phép theo quốc gia, và **signed URL / signed cookie** cấp quyền truy cập nội dung riêng tư có thời hạn.

---

## 10. Patterns kết hợp

### 10.1 Web stack điển hình

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 352" role="img" aria-labelledby="sd203c-t sd203c-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="sd203c-t">Web stack nhiều tầng cache: Client, CloudFront, ALB, ECS/EC2, ElastiCache, RDS/Aurora</title>
<desc id="sd203c-d">Request đi từ Client (trình duyệt) qua CloudFront (cache edge), ALB (load balancer L7) tới app tier ECS/EC2. App hỏi ElastiCache trước theo cache-aside; miss thì đọc RDS/Aurora. CloudFront và ElastiCache là hai tầng cache giảm tải.</desc>
<defs><marker id="sd203c-arr" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker></defs>
<text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Web stack điển hình: request đi theo mũi tên</text>
<rect x="150" y="38" width="100" height="104" rx="10" fill="#10b981" fill-opacity="0.14" stroke="#10b981" stroke-opacity="0.6"/>
<use href="#aws-res-client" x="48" y="46" width="44" height="44"/>
<text x="70" y="110" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">Client</text>
<text x="70" y="127" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.75">trình duyệt</text>
<use href="#aws-cloudfront" x="178" y="46" width="44" height="44"/>
<text x="200" y="110" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">CloudFront</text>
<rect x="155" y="115" width="90" height="19" rx="9.5" fill="#10b981" fill-opacity="0.9"/>
<text x="200" y="129" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">cache edge</text>
<use href="#aws-alb" x="308" y="46" width="44" height="44"/>
<text x="330" y="110" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">ALB</text>
<text x="330" y="127" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.75">L7 LB</text>
<path d="M96 68 H144" fill="none" stroke="currentColor" stroke-opacity="0.65" stroke-width="1.6" marker-end="url(#sd203c-arr)"/>
<path d="M254 68 H298" fill="none" stroke="currentColor" stroke-opacity="0.65" stroke-width="1.6" marker-end="url(#sd203c-arr)"/>
<rect x="400" y="52" width="16" height="16" rx="4" fill="#10b981" fill-opacity="0.14" stroke="#10b981" stroke-opacity="0.6"/>
<text x="422" y="65" font-size="13" fill="currentColor">tầng cache</text>
<path d="M330 134 V176" fill="none" stroke="currentColor" stroke-opacity="0.65" stroke-width="1.6" marker-end="url(#sd203c-arr)"/>
<rect x="120" y="174" width="100" height="104" rx="10" fill="#10b981" fill-opacity="0.14" stroke="#10b981" stroke-opacity="0.6"/>
<use href="#aws-elasticache" x="148" y="182" width="44" height="44"/>
<text x="170" y="246" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">ElastiCache</text>
<rect x="125" y="251" width="90" height="19" rx="9.5" fill="#10b981" fill-opacity="0.9"/>
<text x="170" y="265" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">cache-aside</text>
<use href="#aws-elastic-container-service" x="290" y="184" width="38" height="38"/>
<use href="#aws-ec2" x="332" y="184" width="38" height="38"/>
<text x="330" y="246" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">ECS/EC2</text>
<text x="330" y="263" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.75">app tier</text>
<use href="#aws-rds" x="426" y="184" width="38" height="38"/>
<use href="#aws-aurora" x="468" y="184" width="38" height="38"/>
<text x="466" y="246" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">RDS/Aurora</text>
<path d="M284 203 H226" fill="none" stroke="currentColor" stroke-opacity="0.65" stroke-width="1.6" marker-end="url(#sd203c-arr)"/>
<text x="255" y="196" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.85">1. hỏi</text>
<text x="255" y="222" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.85">cache</text>
<path d="M374 203 H420" fill="none" stroke="currentColor" stroke-opacity="0.65" stroke-width="1.6" marker-end="url(#sd203c-arr)"/>
<text x="397" y="196" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.85">2. miss</text>
<text x="397" y="222" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.85">đọc DB</text>
<text x="16" y="318" font-size="13" fill="currentColor" opacity="0.8">Hai tầng cache giảm tải: CloudFront chặn ở edge cho nội dung tĩnh;</text>
<text x="16" y="336" font-size="13" fill="currentColor" opacity="0.8">ElastiCache (cache-aside) đỡ DB cho app tier.</text>
</svg>

### 10.2 DynamoDB heavy read
```
Client → API Gateway → Lambda → DAX → DynamoDB
```

Lambda gọi DAX client thay cho DynamoDB client. Item nóng được trả từ RAM của DAX; chỉ lần miss và các lần ghi mới xuống tới DynamoDB, nên bảng cần ít RCU hơn. Vì cụm DAX nằm trong VPC, hàm Lambda cũng phải được gắn vào VPC đó.

### 10.3 Cache stampede protection

**Cache stampede là gì.** Một key **rất nóng** hết hạn (hoặc bị invalidate), và trong lúc chưa ai kịp nạp lại, **mọi** request tới key đó đều miss và cùng chạy lại một query đắt xuống database.

```
Key "trang chủ" nhận 1.000 request/giây. Query dựng lại nó mất 2 giây.
Key hết hạn → trong 2 giây đó có 1.000 × 2 = 2.000 request đều miss
→ 2.000 bản của cùng một query nặng chạy đồng thời trên database
→ database quá tải, query chậm thêm, cửa sổ miss dài thêm: vòng xoáy tự làm nặng
```

Khác với thundering herd ở §6.4 (nhiều key hết hạn cùng lúc), ở đây chỉ **một** key nhưng rất nhiều request. Bốn cách phòng, thường dùng kết hợp:

- **Lock.** Request đầu tiên thấy miss thì giành một khoá (ví dụ lệnh `SET key NX` của Redis) và là request **duy nhất** được chạy query. Các request khác chờ vài chục mili-giây rồi đọc lại cache. 2.000 query thành 1.
- **Stale-while-revalidate.** Khi key vừa hết hạn, vẫn **trả bản cũ** cho người dùng, đồng thời một tác vụ nền đi nạp bản mới. Không ai phải chờ, đổi lại vài request nhận dữ liệu cũ thêm vài giây.
- **TTL jitter** (§6.4) để các key nóng không hết hạn cùng một thời điểm.
- **Pre-warm.** Một job chạy theo lịch nạp lại các key nóng **trước khi** chúng hết hạn, nên người dùng không bao giờ gặp miss ở các key đó. Cũng dùng để làm nóng cache trước một đợt sale.

---

## 11. Anti-patterns

1. **Cache mọi thứ** → cache hit rate thấp, tốn RAM, không lợi. Đo hit rate trước.
2. **Không invalidate cache khi write** → stale data. Phải có chiến lược: TTL ngắn, hoặc invalidate explicit.
3. **Cache giá trị lớn (> 100 KB)** → ElastiCache có thể OOM, latency tăng. Compress hoặc partition.
4. **Lambda + RDS không qua Proxy** → connection storm, DB max_connections exhaust.
5. **DynamoDB với GSI projection ALL** → tốn 2x storage + WCU. Project KEYS_ONLY hoặc INCLUDE khi đủ.
6. **DAX cho strongly consistent** → không hỗ trợ.
7. **Aurora reader cho write** → reader read-only, write phải qua writer endpoint.

---

## 12. Performance Insights

- RDS / Aurora built-in tool.
- **Top SQL** theo wait time.
- Phân tích wait event (CPU, IO, lock).
- Free tier: 7 ngày retention. Long-term: pay.
- **Quy tắc**: bật cho mọi production DB. Free, low overhead.

> Đề thi gọi công cụ này là **Performance Insights**. Từ giữa năm 2026 AWS đã gộp nó vào **CloudWatch Database Insights** (console cũ chuyển hướng sang đó); chức năng và mức 7 ngày lưu miễn phí giữ nguyên. Gặp tên nào trong đề cũng là cùng một thứ: công cụ chỉ ra query nào đang làm database chậm.

---

## 13. Ví dụ design cho 4 use case

### 13.1 E-commerce, product catalog 100k SKU, read 10k QPS
- DynamoDB + DAX cluster. PK=`productId`, GSI theo `category`.
- TTL 5 phút trên DAX. Update SKU → invalidate DAX entry.
- CloudFront cache thumbnail S3.

### 13.2 SaaS multi-tenant, OLTP, variable per tenant
- Aurora Serverless v2, min 1 ACU max 32 ACU.
- RDS Proxy cho Lambda app tier.
- ElastiCache Redis cho session.

### 13.3 Real-time leaderboard game
- Redis sorted set (`ZADD`, `ZRANGE`).
- MemoryDB nếu cần durable.
- Snapshot Redis sang S3 daily.

### 13.4 Analytics dashboard, data ở S3
- **Hot path**: Athena query trực tiếp.
- **Aggregated**: pre-compute với Glue → S3 Parquet → Athena.
- Cache report kết quả trong ElastiCache 1h.

---

## 14. Cạm bẫy đề thi (SAA)

1. **"Aurora reader endpoint strong consistency"** → **Sai**, eventual lag < 100ms.
2. **"DAX cho strongly consistent read"** → **Sai**.
3. **"DynamoDB GSI strongly consistent"** → **Sai**.
4. **"Aurora Serverless v1 = v2 chỉ khác tên"** → **Sai**, v2 scale theo bước 0,5 ACU ngay khi đang có kết nối, kiến trúc khác hẳn (§3.3). v1 đã bị AWS xếp vào diện deprecated.
5. **"ElastiCache durable mặc định"** → **Sai**. Chỉ MemoryDB durable. ElastiCache Redis với AOF + snapshot có thể recover phần lớn, nhưng không strong durability.
6. **"Read Replica cho Multi-AZ failover"** → **Sai**. Read Replica async, không phải HA solution. Multi-AZ standby là HA.
7. **"On-demand DynamoDB rẻ hơn provisioned"** → **Sai** với tải đều: đắt hơn ~3,5 lần nếu provisioned được dùng gần hết (tài liệu cũ ghi ~7 lần, xem §5.1). Chỉ rẻ hơn khi mức dùng trung bình dưới ~29%.
8. **"RDS Proxy chỉ dùng cho Lambda"** → **Sai**, cũng giúp Fargate, EC2 nhiều instance, giảm reconnect.

---

## 15. Tóm tắt 1 dòng

> Tune query trước infra. Cache là đòn bẩy 10x — nhưng đi kèm complexity (invalidation, stampede). Chọn DB theo access pattern, không theo "phổ biến nhất".

---

## 16. Bài tập tự kiểm tra

1. Aurora MySQL CPU 85% sustained. Performance Insights cho thấy 1 query chiếm 60% wait time. Bước tiếp theo? (Không phải scale up.)
2. DynamoDB table read 50k RCU, hit rate cache thấp (40%). Bạn analyze gì để quyết định có nên thêm DAX không?
3. Web app Lambda + Aurora Postgres. CloudWatch báo Lambda concurrency 5000, Aurora `max_connections=500` exceeded. Fix?
4. Redis cluster mode disabled, 1 primary 2 replica. Workload 80% read, 20% write. Write QPS đạt limit của node. Lựa chọn?
5. So sánh chi phí: 10k RCU provisioned 24/7 vs 10k RCU on-demand (50k requests/s peak 1h/ngày, 5k/s rest). Cái nào rẻ hơn?
6. CloudFront cache hit rate 30%. Bạn cải thiện thế nào? (≥3 cách, không phải "tăng TTL toàn bộ".)

---

## 17. Đọc thêm

- AWS Whitepaper — *Best Practices for Amazon Aurora MySQL/Postgres*.
- AWS Builder's Library — *Caching challenges and strategies*, *Avoiding fallback*.
- *Amazon DynamoDB Best Practices* (AWS docs).
- *Designing Data-Intensive Applications* — chương 3 (Storage and Retrieval).

---

**Bài tiếp theo**: [[ch2-04-network-performance]] — CloudFront, Global Accelerator, VPC endpoints, Direct Connect.
