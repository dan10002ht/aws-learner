# Performance & Profiling

## Vì sao bài này quan trọng

Tối ưu hiệu năng là kỹ năng phân biệt một mid-level developer với một Solutions Architect. Mid-level dev thấy chậm thì thêm cache, thêm index, đổi ngôn ngữ. Architect thì **đo trước, tìm bottleneck thật, rồi mới tối ưu đúng chỗ** — và biết khi nào *không* cần tối ưu.

> 💡 Ghi nhớ: "Premature optimization is the root of all evil" (Knuth) không có nghĩa là bỏ qua hiệu năng — mà là **không tối ưu khi chưa có số liệu**. Câu đầy đủ của Knuth còn vế sau: "yet we should not pass up our opportunities in that critical 3%".

## 1. Đo trước khi tối ưu: p50/p95/p99 và vì sao average nói dối

### Average là chỉ số tệ nhất để nhìn latency

Giả sử 100 request: 99 request mất 10ms, 1 request mất 5000ms.

- **Average** = (99×10 + 5000) / 100 ≈ **60ms** → trông "ổn"
- **p50 (median)** = 10ms → đa số user thấy nhanh
- **p99** = 5000ms → 1% user thấy hệ thống "chết"

Average bị kéo lệch bởi outlier, và tệ hơn: nó **che giấu phân phối bimodal** (hai cụm nhanh/chậm — ví dụ cache hit vs cache miss). Latency thực tế gần như không bao giờ là phân phối chuẩn, nên mean và standard deviation đều vô nghĩa.

| Percentile | Ý nghĩa | Dùng để |
|---|---|---|
| p50 | Trải nghiệm "điển hình" | Theo dõi xu hướng chung |
| p95 | 1/20 request chậm hơn mức này | SLO phổ biến cho API nội bộ |
| p99 | 1/100 request | SLO cho API user-facing |
| p99.9 | Tail thực sự | Hệ thống quy mô lớn, fan-out |

### Tail latency khuếch đại theo fan-out

Đây là insight quan trọng nhất (từ paper "The Tail at Scale" của Google): nếu 1 trang web gọi **100 service con**, và mỗi service có p99 = 1s, thì xác suất *toàn bộ trang* nhanh là 0.99¹⁰⁰ ≈ **37%** — tức **63% request của user chạm tail** dù mỗi service riêng lẻ "chỉ" có 1% chậm.

> ⚠️ Bẫy production: KHÔNG được lấy average của percentile từ nhiều server (`avg(p99 của 10 instance)` là con số vô nghĩa về mặt toán học). Percentile phải tính từ phân phối gộp — dùng histogram (HDR Histogram, t-digest) rồi merge, không merge percentile.

### Kỹ thuật chống tail latency

- **Hedged request**: gửi request thứ hai nếu request đầu chậm hơn p95, lấy kết quả nào về trước.
- **Timeout + retry có jitter**: cắt tail thay vì chờ.
- **Load shedding**: từ chối sớm khi quá tải còn hơn để mọi request đều chậm.

## 2. Profiling: CPU vs Memory vs I/O

Trước khi profile, hỏi: **hệ thống đang bound bởi cái gì?**

| Loại bound | Triệu chứng | Công cụ |
|---|---|---|
| CPU-bound | CPU 100%, latency tăng tuyến tính với load | CPU profiler (flame graph): `py-spy`, `pprof`, `async-profiler`, `perf` |
| Memory-bound | GC pause, OOM kill, RSS tăng dần | Heap profiler, allocation tracking, `memray` |
| I/O-bound | CPU thấp nhưng latency cao, thread chờ | Distributed tracing, `iostat`, off-CPU flame graph |
| Lock contention | CPU thấp, throughput không tăng khi thêm thread | Off-CPU profiling, mutex profiling |

### Flame graph — đọc thế nào

- Trục ngang = **tỷ lệ thời gian CPU** (không phải thứ tự thời gian).
- Trục dọc = call stack.
- Tìm **plateau rộng** (hàm chiếm nhiều % ngang) chứ không phải đỉnh cao.

> 💡 Ghi nhớ: **On-CPU profiling** trả lời "CPU đang làm gì". **Off-CPU profiling** trả lời "thread đang *chờ* cái gì" (lock, disk, network). Hệ backend đa số là I/O-bound — nếu chỉ nhìn on-CPU flame graph, bạn sẽ tối ưu nhầm chỗ.

### Continuous profiling

Chuẩn 2025: profiling không còn là việc "bật lên khi có sự cố" mà chạy liên tục ở production với overhead ~1-2% (sampling profiler dựa trên eBPF như Parca, Pyroscope, Datadog Continuous Profiler). Sự cố hiệu năng tái hiện được ngay từ dữ liệu lịch sử.

## 3. N+1 và chattiness — kẻ giết hiệu năng số một

### N+1 query

```python
orders = db.query("SELECT * FROM orders WHERE user_id = ?", uid)  # 1 query
for o in orders:
    o.items = db.query("SELECT * FROM items WHERE order_id = ?", o.id)  # N queries!
```

100 order = 101 round-trip. Mỗi round-trip tốn ~0.5-2ms trong VPC → 100-200ms chỉ cho network, chưa tính query.

Sửa: **JOIN**, **batch IN-clause**, hoặc **DataLoader pattern** (gom các lookup trong cùng tick thành một batch — bắt buộc với GraphQL):

```python
items = db.query("SELECT * FROM items WHERE order_id IN (...)", [o.id for o in orders])
# rồi group theo order_id trong memory
```

### Chattiness giữa service

N+1 không chỉ ở DB. Microservice gọi nhau trong vòng lặp là N+1 qua network — đắt gấp 10-100 lần. Nguyên tắc: **API nhận và trả batch** (`GET /users?ids=1,2,3` thay vì gọi `GET /users/{id}` N lần).

> ⚠️ Bẫy production: ORM với lazy loading mặc định (Hibernate, SQLAlchemy, Prisma include lồng nhau) là nguồn N+1 phổ biến nhất. Nó **chạy ổn ở dev** (10 bản ghi) và **chết ở production** (10.000 bản ghi). Bật log SQL ở môi trường staging và đếm số query mỗi request — đó là một test đáng viết.

## 4. Connection pool sizing — Little's Law

### Little's Law

```
L = λ × W
(số connection cần dùng đồng thời) = (request/giây) × (thời gian giữ connection mỗi request)
```

Ví dụ: 500 req/s, mỗi request giữ DB connection 20ms → L = 500 × 0.02 = **10 connection** đang dùng đồng thời. Pool size ~15-20 (thêm headroom) là đủ — không phải 200.

### Vì sao pool to hơn không nhanh hơn

DB chỉ thực thi song song hiệu quả bằng số core (+ một phần chờ I/O). Công thức kinh nghiệm của HikariCP:

```
pool_size ≈ cores × 2 + số_disk_spindle
```

Pool quá to → context switch, lock contention trong DB, mỗi connection Postgres tốn vài MB RAM → **tổng throughput giảm**. Pool quá nhỏ → request xếp hàng chờ connection (nhưng xếp hàng ở app rẻ hơn nghẽn ở DB).

> 💡 Ghi nhớ: Khi DB quá tải, **giảm** pool size thường giúp throughput tăng. Hàng đợi nên nằm ở tầng app (rẻ, kiểm soát được, timeout được) chứ không phải trong DB.

> ⚠️ Bẫy production: Tổng pool = pool_size × số instance app. Autoscale app từ 10 lên 50 instance với pool 20 mỗi instance = 1000 connection đè lên DB → cần connection proxy (PgBouncer/RDS Proxy).

## 5. Serialization cost — chi phí vô hình

Serialize/deserialize JSON thường chiếm **10-30% CPU** của một API service điển hình, và là nguồn allocation lớn nhất (gây áp lực GC).

| Format | Tốc độ | Kích thước | Schema | Khi nào dùng |
|---|---|---|---|---|
| JSON | Chậm | Lớn | Không | Public API, debug dễ |
| Protobuf | Nhanh | Nhỏ (~3-10x so JSON) | Có, evolution tốt | gRPC nội bộ |
| Avro | Nhanh | Nhỏ | Có, schema registry | Kafka/streaming |
| MessagePack | Khá | Nhỏ vừa | Không | Cache value, drop-in thay JSON |

Mẹo thực tế:

- **Đừng deserialize rồi serialize lại** khi chỉ proxy/forward — pass-through bytes.
- Trả về ít field hơn (projection) rẻ hơn mọi tối ưu serializer.
- Với Python, `orjson` nhanh hơn `json` chuẩn 5-10x — một dòng đổi import.
- Nén (gzip/brotli/zstd) đổi CPU lấy bandwidth — đáng làm cho response >1KB qua internet, thường không đáng trong nội bộ VPC băng thông cao.

## 6. Batch & Streaming

### Batching: amortize chi phí cố định

Mỗi thao tác có chi phí cố định (syscall, network round-trip, fsync, transaction overhead). Batch chia chi phí đó cho N item:

- 1000 INSERT riêng lẻ: 1000 round-trip + 1000 fsync.
- 1 INSERT 1000 row (hoặc `COPY`): 1 round-trip → nhanh hơn 50-100x.

Trade-off: batch tăng **latency của item đầu tiên** (phải chờ gom đủ batch hoặc hết timeout). Pattern chuẩn: **batch theo size HOẶC time, cái nào đến trước** (giống Kafka `linger.ms` + `batch.size`).

### Streaming: đừng giữ cả dataset trong RAM

```python
# OOM với 10 triệu row:
rows = db.fetch_all("SELECT * FROM events")
return json(rows)

# Streaming — memory phẳng, time-to-first-byte thấp:
for chunk in db.cursor("SELECT * FROM events", chunk_size=5000):
    yield serialize(chunk)
```

Áp dụng: export CSV, response lớn (chunked transfer / NDJSON), xử lý file upload, ETL. Quy tắc: **memory sử dụng không được tỷ lệ với kích thước dữ liệu**, chỉ tỷ lệ với chunk size.

## 7. Async I/O vs Thread

| | Thread-per-request | Async I/O (event loop) |
|---|---|---|
| Mô hình | Block trong khi chờ I/O | Một thread phục vụ nghìn connection |
| Chi phí mỗi connection | ~1MB stack + context switch | Vài KB (coroutine/task) |
| Phù hợp | Concurrency thấp-vừa, code đơn giản | Nhiều connection chờ I/O lâu (websocket, fan-out) |
| Điểm chết | Hết thread khi I/O chậm | **Một đoạn CPU-bound block cả event loop** |
| CPU-bound | OK (nhiều thread, nhiều core) | Phải đẩy sang worker pool/process |

> ⚠️ Bẫy production: Trong Node.js/Python asyncio, một hàm sync chậm (parse JSON 50MB, bcrypt, gọi thư viện blocking) sẽ **đóng băng mọi request đang phục vụ** trên event loop đó. Triệu chứng: p99 tăng vọt toàn bộ endpoint dù chỉ một endpoint có lỗi. Theo dõi event loop lag như một metric hạng nhất.

Lưu ý 2025: virtual threads (Java 21+ Loom), goroutine (Go) cho mô hình lập trình sync với chi phí gần như async — xu hướng là runtime lo việc này thay developer. Async/await tường minh vẫn thống trị ở Python/TypeScript/Rust.

Quan trọng nhất: **async không làm một request nhanh hơn** — nó làm hệ thống chịu được nhiều request đồng thời hơn. Nếu vấn đề là latency của một call, async không cứu được.

## 8. Benchmark đúng cách

Benchmark sai còn nguy hiểm hơn không benchmark — vì nó cho quyết định sai một vẻ ngoài khoa học.

### Checklist benchmark

1. **Warmup**: JIT (JVM, V8) cần hàng nghìn lần chạy để compile hot path; connection pool cần fill; cache cần ấm. Bỏ kết quả vài nghìn iteration đầu.
2. **Đo nhiều lần, báo cáo phân phối**: chạy ≥5 lần, báo p50/p99 và variance — không báo "best of N" hay một con số duy nhất.
3. **Môi trường giống production**: cùng instance type, cùng kích thước dữ liệu, network thật. Benchmark trên laptop (turbo boost, thermal throttle, background process) gần như vô nghĩa.
4. **Dữ liệu thực tế**: 1000 row khác 100 triệu row (index fit RAM hay không, plan khác nhau). Phân phối key thực (hot key, skew) khác uniform random.
5. **Load generator không được là bottleneck**: kiểm tra CPU của máy bắn load.
6. **Closed-loop vs open-loop** — dẫn đến coordinated omission bên dưới.

### Coordinated omission

Lỗi kinh điển của load test (Gil Tene chỉ ra): tool dạng closed-loop (gửi request → **chờ response** → gửi tiếp) sẽ **tự động ngừng gửi khi server chậm**. Khi server stall 5 giây, tool chỉ ghi nhận 1 request chậm thay vì hàng trăm request *lẽ ra* đã được gửi trong 5 giây đó — kết quả p99 đẹp giả tạo.

User thật là **open-loop**: họ đến theo nhịp của họ, không chờ user khác xong. Dùng tool open-loop / có hiệu chỉnh coordinated omission (wrk2, k6 với arrival-rate executor, Vegeta) và đo latency từ **thời điểm lẽ ra request được gửi**, không phải thời điểm gửi thực tế.

> 💡 Ghi nhớ: Nếu kết quả load test cho p99 thấp đáng ngờ trong khi production kêu ca, nghi ngờ coordinated omission đầu tiên.

## 9. Capacity planning cơ bản

Quy trình 4 bước:

1. **Đo đơn vị công suất**: 1 instance chịu được bao nhiêu req/s ở mức latency chấp nhận được? (Tìm bằng load test tăng dần đến khi p99 vượt SLO — đó là công suất thực, không phải điểm CPU 100%.)
2. **Dự báo nhu cầu**: peak traffic = baseline × hệ số peak (daily/seasonal) × tăng trưởng dự kiến. Plan cho **peak**, không phải average.
3. **Headroom**: chạy ở ~50-70% công suất tại peak. Trên 70-80% utilization, queueing theory cho thấy latency tăng phi tuyến (W ~ 1/(1−ρ)) — hệ thống 90% utilization không còn buffer cho spike hay mất một AZ.
4. **Tìm bottleneck kế tiếp**: scale app gấp đôi thì DB, cache, downstream API có chịu nổi không? Capacity planning là bài toán **chuỗi**, mắt xích yếu nhất quyết định.

> ⚠️ Bẫy production: Autoscaling không thay thế capacity planning — scale-out mất 1-5 phút (boot, warmup, health check), trong khi spike đến trong giây. Cần đủ headroom để *sống sót đến khi* autoscale kịp, và DB thường không autoscale theo app.

## Liên hệ sang AWS

| Khái niệm trong bài | Service / tính năng AWS |
|---|---|
| p50/p95/p99 | **CloudWatch** hỗ trợ percentile (`p99`) trên metric — nhưng chỉ khi publish dữ liệu thô/histogram; với metric tự đẩy, dùng **EMF (Embedded Metric Format)** hoặc high-resolution metrics. Average của ALB `TargetResponseTime` nói dối y như bài đã phân tích — luôn xem p99 |
| Distributed tracing, tìm N+1 và chattiness | **AWS X-Ray** (và **CloudWatch Application Signals**): service map hiện rõ một request gọi DynamoDB 50 lần; subsegment cho thấy thời gian từng call |
| CPU vs memory bound | **Lambda**: memory và CPU bị **ghép cặp** — tăng memory đồng thời tăng CPU (1769MB ≈ 1 vCPU). Hàm CPU-bound chậm? Tăng memory có khi vừa nhanh hơn vừa *rẻ hơn* (billing = GB-giây, chạy nhanh hơn bù lại). Dùng **AWS Lambda Power Tuning** để tìm điểm tối ưu |
| Profiling DB, tìm query nóng | **RDS Performance Insights**: biểu đồ Average Active Sessions, top SQL, wait event (lock, I/O, CPU) — chính là phân loại CPU/memory/I/O-bound cho database |
| Connection pool & autoscale | **RDS Proxy** đóng vai PgBouncer managed — bắt buộc cân nhắc khi Lambda/Fargate scale-out nối thẳng vào RDS |
| Batch | SQS `SendMessageBatch`/`ReceiveMessage` (tối đa 10), DynamoDB `BatchWriteItem` (25), Kinesis `PutRecords` (500), Firehose buffer theo size-or-time |
| Streaming | S3 multipart, Lambda response streaming, Kinesis/Data Firehose cho pipeline |
| Serialization | API Gateway + payload nhỏ; gRPC qua ALB/App Mesh cho nội bộ; DynamoDB tính phí theo kích thước item — payload gọn = rẻ hơn trực tiếp |
| Capacity & headroom | Auto Scaling target tracking (đặt target ~50-60% CPU, không phải 85%), **provisioned concurrency** cho Lambda chống cold start lúc peak, Compute Optimizer gợi ý right-sizing |
| Continuous profiling | **Amazon CodeGuru Profiler** (flame graph production, gợi ý dòng code đắt nhất) |

### Tự kiểm tra

1. Vì sao `avg(p99)` từ 10 instance là con số vô nghĩa, và cách gộp đúng là gì?
2. Hệ thống 500 req/s, mỗi request giữ connection 40ms — pool size hợp lý khoảng bao nhiêu? Điều gì xảy ra khi autoscale lên 30 instance?
3. Load test của bạn báo p99 = 50ms nhưng user phàn nàn treo vài giây — cơ chế nào của tool có thể gây ra kết quả đẹp giả tạo này?
4. Lambda của bạn CPU-bound và đang để memory 256MB — vì sao tăng lên 1024MB có thể giảm cả latency lẫn chi phí?
