# Bài 17 — Time-series DB: Prometheus TSDB & InfluxDB

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **đặc thù của dữ liệu time-series** và vì sao nó cần một loại database riêng.
- Hiểu **mô hình dữ liệu Prometheus** (metric + labels → series, chunk, head block, pull model) và **InfluxDB** (line protocol, tag/field, retention policy).
- Nhận diện và tránh **cardinality explosion** — cạm bẫy số một khi vận hành TSDB.
- Biết **downsampling / retention / rollup** để dữ liệu không phình vô hạn.
- Giải thích **vì sao không nên nhét time-series lớn vào SQL thường**.
- Viết được **PromQL cơ bản** để truy vấn metric.

---

## 2. Lý thuyết

### 2.1 Time-series là gì? — dữ liệu "chỉ tiến về phía trước"

> **Time-series** là chuỗi các điểm dữ liệu `(timestamp, value)` gắn với một *đối tượng đo* nào đó, sinh ra **liên tục theo thời gian**: CPU của một server mỗi 15 giây, nhiệt độ cảm biến mỗi giây, số request/giây của một API, giá cổ phiếu theo tick...

Hãy hình dung một **nhật ký hàng hải**: mỗi giờ thuyền trưởng ghi một dòng — vị trí, tốc độ, gió. Bạn **không bao giờ sửa** dòng của giờ trước; bạn chỉ **ghi thêm dòng mới xuống dưới**. Sau chuyến đi, bạn hiếm khi đọc từng dòng lẻ — bạn hỏi "tốc độ trung bình ngày 3?", "giờ nào gió mạnh nhất tuần này?". Đó chính xác là hành vi của time-series.

Từ analogy đó rút ra **4 đặc thù** quyết định thiết kế của TSDB:

| Đặc thù | Hệ quả kỹ thuật |
|---------|-----------------|
| **Append-heavy, gần như chỉ ghi thêm** | Ghi luôn ở "mép hiện tại" (timestamp tăng dần) → tối ưu write-path tuần tự, không cần update tại chỗ |
| **Hầu như không update/delete điểm cũ** | Không cần MVCC nặng, không cần B-tree cho update ngẫu nhiên |
| **Nén cực tốt** | timestamp đều nhau + giá trị biến thiên nhỏ → delta-of-delta + XOR nén xuống ~1-2 byte/điểm |
| **Truy vấn theo khoảng thời gian + tổng hợp** | Đọc range `[t0, t1]` rồi `avg/max/rate` — chứ ít khi lấy đúng 1 điểm |

### 2.2 Vì sao đừng nhét time-series lớn vào SQL thường?

Giả sử bạn tạo bảng `metrics(time, host, metric, value)` trong PostgreSQL và đổ vào 10.000 server × 100 metric × 1 điểm/15s. Đó là **~66.000 điểm/giây ≈ 5,7 tỷ dòng/ngày**. RDBMS "chuẩn" sẽ đau ở nhiều chỗ:

- **B-tree index phình và chậm dần khi insert**: mỗi insert phải cập nhật index; với append theo thời gian, phần lớn cây bị "bẩn" trang liên tục, index còn có thể *lớn hơn* dữ liệu.
- **Không nén theo cột**: mỗi dòng lưu lặp lại `host`, `metric` dạng text, tốn gấp nhiều lần so với TSDB nén delta.
- **Truy vấn tổng hợp quét toàn bảng**: `SELECT avg(value) ... WHERE time BETWEEN ...` phải đọc rất nhiều dòng rời rạc.
- **Retention = DELETE hàng loạt**: xoá dữ liệu quá 30 ngày bằng `DELETE` tạo bloat khổng lồ, phải `VACUUM` nặng nề. TSDB thì chỉ việc **bỏ nguyên block** cũ.

> **Bản chất:** SQL thường tối ưu cho **update ngẫu nhiên + join quan hệ + đọc điểm**; time-series cần **append tuần tự + nén theo series + đọc range tổng hợp + hết hạn theo khối**. Sai mô hình → càng scale càng đau. (Ngoại lệ: các extension chuyên dụng như **TimescaleDB** biến Postgres thành TSDB bằng hypertable/chunk + nén cột — đó là "SQL đã được TS-hoá", không phải "SQL thường".)

### 2.3 Kiến trúc dữ liệu chung của một TSDB

Mọi TSDB hiện đại tách rõ hai chiều: **series** (đối tượng đo, có danh tính) và **samples** (các điểm `(t, v)` của series đó theo thời gian).

<svg viewBox="0 0 640 260" role="img" aria-labelledby="ts-t ts-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="ts-t">Cấu trúc series và sample trong TSDB</title>
<desc id="ts-d">Một series được định danh bởi tên metric cộng tập label, và trỏ tới một chuỗi các điểm timestamp giá trị được nén theo thời gian</desc>
<rect x="20" y="20" width="270" height="90" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="155" y="42" text-anchor="middle" font-size="12" fill="currentColor">Series (danh tính, ít thay đổi)</text>
<text x="155" y="66" text-anchor="middle" font-size="11" fill="currentColor">http_requests_total</text>
<text x="155" y="86" text-anchor="middle" font-size="11" fill="currentColor">{method="GET", code="200", host="a"}</text>
<line x1="290" y1="65" x2="345" y2="65" stroke="currentColor" stroke-width="1.5" marker-end="url(#tae)"/>
<rect x="350" y="20" width="270" height="90" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="485" y="42" text-anchor="middle" font-size="12" fill="currentColor">Samples (nén delta, chỉ append)</text>
<text x="485" y="66" text-anchor="middle" font-size="11" fill="currentColor">(t0, 5) (t1, 7) (t2, 7) (t3, 12)</text>
<text x="485" y="86" text-anchor="middle" font-size="11" fill="currentColor">t đều nhau → nén cực tốt</text>
<rect x="20" y="140" width="600" height="90" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="162" text-anchor="middle" font-size="12" fill="currentColor">Index đảo (inverted index): label → danh sách series</text>
<text x="320" y="186" text-anchor="middle" font-size="11" fill="currentColor">method="GET" → {series 1, 4, 9, ...}</text>
<text x="320" y="206" text-anchor="middle" font-size="11" fill="currentColor">Truy vấn = giao (intersect) các posting list rồi đọc samples của series khớp</text>
<defs><marker id="tae" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Điểm mấu chốt: **số lượng series** (chứ không phải số điểm) quyết định chi phí bộ nhớ/index. Mỗi series cần một entry sống trong RAM để nhận điểm mới và các posting list trong inverted index. Ghi nhớ điều này — nó là gốc của **cardinality explosion** ở mục 2.6.

---

## 3. Prometheus TSDB

Prometheus là hệ **monitoring pull-based** phổ biến nhất trong thế giới cloud-native (CNCF). Nó vừa là **thu thập** (scrape) vừa là **TSDB** vừa là **query engine** (PromQL).

### 3.1 Mô hình dữ liệu: metric + labels = series

Một **sample** trong Prometheus:

```
http_requests_total{method="POST", handler="/api/orders", code="500"}  27  @1700000000
└────────┬────────┘ └──────────────────┬──────────────────────────┘  └┬┘  └────┬────┘
   metric name                       labels                         value   timestamp
```

- **metric name**: *cái gì* đang đo (`http_requests_total`, `node_cpu_seconds_total`).
- **labels**: các cặp key=value làm chiều phân tách. **metric name + tập label** xác định **một series duy nhất**. Đổi *một* giá trị label → series khác hoàn toàn.
- Kiểu metric: **counter** (chỉ tăng, dùng với `rate()`), **gauge** (lên xuống tự do), **histogram** & **summary** (phân phối, dùng cho latency percentile).

### 3.2 Pull model — Prometheus tự đi "hút"

Khác đa số hệ khác (client *push* dữ liệu lên), Prometheus **chủ động scrape**: cứ mỗi `scrape_interval` (mặc định 15s) nó gọi HTTP `GET /metrics` của từng target và đọc về.

<svg viewBox="0 0 640 210" role="img" aria-labelledby="pm-t pm-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="pm-t">Prometheus pull model</title>
<desc id="pm-d">Prometheus chủ động gọi HTTP tới các target theo chu kỳ để lấy metric, và biết target nào tồn tại qua service discovery</desc>
<rect x="250" y="80" width="140" height="50" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="100" text-anchor="middle" font-size="12" fill="currentColor">Prometheus</text>
<text x="320" y="118" text-anchor="middle" font-size="11" fill="currentColor">scrape mỗi 15s</text>
<rect x="500" y="20" width="120" height="40" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="560" y="44" text-anchor="middle" font-size="11" fill="currentColor">app /metrics</text>
<rect x="500" y="90" width="120" height="40" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="560" y="114" text-anchor="middle" font-size="11" fill="currentColor">node_exporter</text>
<rect x="500" y="160" width="120" height="40" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="560" y="184" text-anchor="middle" font-size="11" fill="currentColor">db_exporter</text>
<line x1="390" y1="95" x2="500" y2="42" stroke="currentColor" stroke-width="1.2" marker-end="url(#pae)"/>
<line x1="390" y1="105" x2="500" y2="108" stroke="currentColor" stroke-width="1.2" marker-end="url(#pae)"/>
<line x1="390" y1="115" x2="500" y2="176" stroke="currentColor" stroke-width="1.2" marker-end="url(#pae)"/>
<text x="440" y="150" text-anchor="middle" font-size="10" fill="currentColor">HTTP GET /metrics</text>
<rect x="20" y="80" width="150" height="50" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="100" text-anchor="middle" font-size="12" fill="currentColor">Service Discovery</text>
<text x="95" y="118" text-anchor="middle" font-size="10" fill="currentColor">(k8s, Consul...)</text>
<line x1="170" y1="105" x2="250" y2="105" stroke="currentColor" stroke-width="1.2" marker-end="url(#pae)"/>
<defs><marker id="pae" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Vì sao pull lại hợp với time-series/monitoring:
- **Tự biết target sống hay chết**: scrape fail → có ngay metric `up == 0` để cảnh báo. Push thì "im lặng" khó phân biệt với "chưa gửi".
- **Không cần mở cổng ngược vào app**; Prometheus chủ động, dễ kiểm soát tần suất, tránh app tự làm quá tải server metric.
- **Service discovery** (Kubernetes, Consul...) tự cập nhật danh sách target khi pod lên/xuống — rất hợp môi trường động.
- Ngoại lệ: job ngắn (batch/cron) không kịp bị scrape → đẩy qua **Pushgateway**.

### 3.3 Lưu trữ: head block, chunk, WAL và block trên đĩa

Đây là phần "TSDB" thật sự. Prometheus tổ chức dữ liệu theo thời gian thành các **block**:

- **Head block (in-memory)**: cửa sổ ~2 giờ gần nhất nằm trong RAM. Mỗi series có các **chunk** đang mở, điểm mới append vào chunk hiện tại; đầy 120 sample (hoặc hết cửa sổ) thì chunk được "đóng" và nén (**delta-of-delta** cho timestamp, **XOR** cho float — theo thuật toán Gorilla của Facebook).
- **WAL (Write-Ahead Log)**: mọi sample cũng ghi tuần tự vào WAL trên đĩa để *không mất dữ liệu head block* nếu process chết trước khi flush.
- **Persistent block trên đĩa**: định kỳ head được **flush** thành block bất biến (immutable) trong thư mục riêng, mỗi block gồm `chunks/`, `index` (inverted index), `meta.json`, phủ một khoảng `[minTime, maxTime]`.
- **Compaction**: các block 2h nhỏ được gộp thành block lớn hơn (2h → 6h → 1 ngày...) để giảm số file và tối ưu đọc.
- **Retention**: hết hạn thì **xoá nguyên block** (`--storage.tsdb.retention.time=15d`) — cực rẻ, không như `DELETE` từng dòng.

> **Vì sao head block bất biến + block đĩa lại nhanh:** ghi luôn tuần tự (append) vào WAL và chunk, không update tại chỗ; đọc thì mỗi block tự chứa index của riêng nó, query engine chỉ mở những block giao với khoảng thời gian hỏi. Đây là kiểu **LSM-friendly** thay vì B-tree update ngẫu nhiên.

### 3.4 PromQL cơ bản — code phải biết

PromQL là ngôn ngữ truy vấn của Prometheus. Bốn kiểu giá trị: **instant vector** (một điểm/series tại thời điểm), **range vector** (một dải điểm/series trong `[Xs]`), **scalar**, **string**.

```promql
# 1) Instant vector: giá trị hiện tại, lọc theo label
http_requests_total{job="api", code="500"}

# 2) rate(): tốc độ tăng trung bình/giây của counter trong 5 phút vừa qua
#    Luôn dùng rate/increase với counter — KHÔNG đọc counter thô (nó chỉ tăng dồn)
rate(http_requests_total{job="api"}[5m])

# 3) Tổng hợp theo nhãn: tổng req/s toàn cụm, gom theo mã trạng thái
sum by (code) (rate(http_requests_total{job="api"}[5m]))

# 4) Tỷ lệ lỗi 5xx (%) — kết hợp filter + sum + phép chia vector
100 * sum(rate(http_requests_total{code=~"5.."}[5m]))
    /  sum(rate(http_requests_total[5m]))

# 5) Latency p95 từ histogram (bucket le=...)
histogram_quantile(0.95,
  sum by (le) (rate(http_request_duration_seconds_bucket{job="api"}[5m])))

# 6) Còn bao nhiêu RAM trống (gauge), theo từng host
node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes * 100

# 7) Cảnh báo: có instance nào chết không (up là metric tổng hợp sẵn)
up{job="api"} == 0
```

Vài nguyên tắc "làm được việc":
- `code=~"5.."` là **regex match** (`=~`), `code="500"` là khớp đúng, `!=` / `!~` để loại trừ.
- Với **counter** luôn bọc `rate()`/`increase()`; đừng bao giờ vẽ đồ thị counter thô.
- Gom nhóm bằng `sum by (label)` / `sum without (label)` để giảm chiều trước khi hiển thị.
- `histogram_quantile` cần `by (le)` vì percentile được nội suy từ các bucket `le` (less-or-equal).

---

## 4. InfluxDB

InfluxDB là TSDB "đa dụng" hơn Prometheus: hợp cả monitoring lẫn IoT/sensor/analytics, mặc định **push** (client gửi lên), và có mô hình dữ liệu riêng.

### 4.1 Line protocol: measurement, tag, field

Dữ liệu vào Influx qua **line protocol** dạng text:

```
weather,location=hanoi,sensor=s1 temperature=31.2,humidity=68 1700000000000000000
└──┬──┘ └──────────┬───────────┘ └────────────┬────────────┘ └────────┬────────┘
measurement       tags (indexed)        fields (values)        timestamp (ns)
```

- **measurement**: tương tự "tên bảng"/metric (`weather`).
- **tags**: metadata **được index**, luôn là string — dùng để *lọc và group* (`location`, `sensor`, `host`, `region`).
- **fields**: giá trị đo thực sự (`temperature`, `humidity`), **không index**, có kiểu (float/int/bool/string).
- **timestamp**: mặc định nanosecond.

> **Quy tắc sống còn:** cái gì bạn sẽ **lọc/group theo** thì làm **tag**; cái gì là **số đo** thì làm **field**. `measurement + tag set` chính là **series** của Influx — y hệt vai trò của metric+labels ở Prometheus. Vì tag được index nên **đặt giá trị biến thiên cao (high-cardinality) vào tag là con đường nhanh nhất tới thảm hoạ** (mục 2.6/5).

### 4.2 Retention policy & downsampling

InfluxDB gắn dữ liệu vào **bucket/retention policy (RP)** có **thời hạn** (`DURATION`). Hết hạn, Influx tự xoá theo **shard** (khối theo thời gian) — lại là "bỏ nguyên block", rẻ.

Kết hợp với **downsampling** để giữ lịch sử dài mà không phình:

```sql
-- InfluxDB 1.x (InfluxQL): giữ dữ liệu thô 7 ngày, dữ liệu gộp 1 năm
CREATE RETENTION POLICY "raw"   ON "mydb" DURATION 7d  REPLICATION 1 DEFAULT
CREATE RETENTION POLICY "long"  ON "mydb" DURATION 52w REPLICATION 1

-- Continuous Query: mỗi 5 phút, tính trung bình rồi ghi sang RP "long"
CREATE CONTINUOUS QUERY "cq_5m" ON "mydb" BEGIN
  SELECT mean("temperature") AS "temperature"
  INTO "long"."weather_5m"
  FROM "raw"."weather"
  GROUP BY time(5m), "location"
END
```

Còn Flux (Influx 2.x) cho truy vấn linh hoạt hơn:

```js
from(bucket: "mydb")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "weather" and r._field == "temperature")
  |> aggregateWindow(every: 5m, fn: mean)   // downsample xuống mỗi 5 phút
```

### 4.3 Prometheus vs InfluxDB — chọn cái nào

| Tiêu chí | **Prometheus** | **InfluxDB** |
|----------|----------------|--------------|
| Mô hình thu thập | **Pull** (scrape) | **Push** (client gửi) — cũng scrape được |
| Mô hình dữ liệu | metric + labels | measurement + tag + field |
| Ngôn ngữ truy vấn | **PromQL** | InfluxQL / **Flux** |
| Sở trường | **Monitoring cloud-native**, alerting | IoT, sensor, event, monitoring |
| Downsampling | Recording rules (+ Thanos/Mimir) | Retention policy + CQ / task |
| Long-term / HA | Cần Thanos, Cortex, Mimir | Enterprise / Cloud cluster |
| Nhiều value/điểm | 1 value/series | **Nhiều field/điểm** |

Quy tắc nhanh: **Kubernetes/microservice monitoring → Prometheus** (hệ sinh thái, alertmanager, exporter khổng lồ). **IoT/telemetry/event nhiều field, cần push và giữ lịch sử dài → InfluxDB**.

---

## 5. Cardinality explosion — cạm bẫy số một

**Cardinality** = **tổng số series khác nhau** = tích các số giá trị phân biệt của từng label. Đây là thứ giết TSDB nhanh nhất, vì mỗi series tốn RAM (head + index) và làm chậm mọi truy vấn.

Công thức trực giác: nếu một metric có các label với số giá trị `n1 × n2 × n3...` thì đó là **số series tối đa**.

```
http_requests_total với label:
  method  : 5 giá trị   (GET, POST, ...)
  code    : 8 giá trị   (200, 404, 500, ...)
  host    : 500 giá trị
  ─────────────────────────────
  => 5 × 8 × 500 = 20.000 series   ✅ chịu được

Thêm 1 label "user_id" (1 triệu user):
  5 × 8 × 500 × 1.000.000 = 20 TỶ series  💥 sập RAM/OOM
```

<svg viewBox="0 0 640 200" role="img" aria-labelledby="ce-t ce-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="ce-t">Label cardinality thấp và cao</title>
<desc id="ce-d">Label giá trị hữu hạn tạo ít series an toàn, còn label giá trị vô biên như user id hay url tạo bùng nổ series</desc>
<rect x="20" y="20" width="290" height="160" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="165" y="44" text-anchor="middle" font-size="12" fill="currentColor">TỐT — label bounded</text>
<text x="165" y="72" text-anchor="middle" font-size="11" fill="currentColor">method, code, region, status</text>
<text x="165" y="96" text-anchor="middle" font-size="11" fill="currentColor">mỗi label vài đến vài trăm giá trị</text>
<text x="165" y="128" text-anchor="middle" font-size="11" fill="currentColor">số series nhỏ, ổn định</text>
<text x="165" y="156" text-anchor="middle" font-size="11" fill="currentColor">=> RAM và query dự đoán được</text>
<rect x="330" y="20" width="290" height="160" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="475" y="44" text-anchor="middle" font-size="12" fill="currentColor">XẤU — label unbounded</text>
<text x="475" y="72" text-anchor="middle" font-size="11" fill="currentColor">user_id, email, request_id</text>
<text x="475" y="96" text-anchor="middle" font-size="11" fill="currentColor">url đầy đủ, session, IP client</text>
<text x="475" y="128" text-anchor="middle" font-size="11" fill="currentColor">mỗi giá trị mới = 1 series mới</text>
<text x="475" y="156" text-anchor="middle" font-size="11" fill="currentColor">=> series bùng nổ, OOM, query chậm</text>
</svg>

### 5.1 Vì sao nó chết người
- Mỗi series **sống** cần entry trong head + posting list trong index → RAM tăng tuyến tính theo số series *đang hoạt động*.
- Series high-cardinality thường **chỉ nhận 1-2 điểm rồi chết** (churn) — nhưng index vẫn phải nhớ, và mỗi lần deploy/restart lại sinh loạt series mới.
- Query phải giao nhiều posting list khổng lồ → chậm, tốn CPU.

### 5.2 Cách tránh (làm được việc)
- **Không bao giờ** đưa vào label/tag: `user_id`, `email`, `request_id`/trace_id, **full URL** (có path param), IP client, timestamp, session id — mọi thứ **không giới hạn giá trị**.
- **Chuẩn hoá path**: dùng `/api/orders/:id` thay vì `/api/orders/12345` → gộp về hữu hạn route.
- Nhớ **cardinality là tích**: cẩn thận khi thêm label mới vào metric vốn đã nhiều series — nó **nhân lên**, không cộng.
- Muốn tra cứu theo id/user → đó là việc của **log (Loki, ELK)** hoặc **trace (Jaeger/Tempo)**, không phải metric. Metric để đo *xu hướng tổng hợp*, không phải để tìm 1 request.
- Giám sát chính TSDB: Prometheus có `prometheus_tsdb_head_series`; đặt alert khi series vượt ngưỡng. Với InfluxDB có `SHOW SERIES CARDINALITY`.
- Dùng **metric relabeling** (`metric_relabel_configs`) để *drop* label/series rác ngay khi scrape.

```yaml
# prometheus.yml — bỏ series có label rác trước khi lưu
metric_relabel_configs:
  - source_labels: [__name__]
    regex: 'go_gc_duration_seconds'      # ví dụ drop metric không cần
    action: drop
  - regex: 'id|request_id|session_id'    # xoá hẳn các label high-cardinality
    action: labeldrop
```

---

## 6. Downsampling, retention & rollup — giữ dữ liệu không phình vô hạn

Dữ liệu thô độ phân giải cao (15s) rất tốn chỗ và bạn **không cần độ chi tiết đó cho dữ liệu 6 tháng trước**. Chiến lược tiered:

| Tầng | Độ phân giải | Giữ | Cách |
|------|--------------|-----|------|
| Nóng | 15s (thô) | 15 ngày | head/block, retention ngắn |
| Ấm | 5 phút (rollup) | 90 ngày | recording rule / CQ |
| Lạnh | 1 giờ (rollup) | 1-2 năm | recording rule / CQ |

- **Downsampling / rollup**: định kỳ tính `avg/max/min/sum` gộp nhiều điểm thô thành **một điểm độ phân giải thấp** rồi lưu vào series mới. Prometheus dùng **recording rules**; InfluxDB dùng **CQ/task**.
- **Retention**: mỗi tầng có thời hạn riêng; hết hạn **bỏ nguyên block/shard** (rẻ).

```yaml
# Prometheus recording rule: tính sẵn req/s theo job, lưu thành metric mới
# -> dashboard đọc metric đã gộp, nhanh và dùng cho long-term (Thanos downsampling)
groups:
  - name: rollup
    interval: 1m
    rules:
      - record: job:http_requests:rate5m
        expr: sum by (job) (rate(http_requests_total[5m]))
```

> Recording rule vừa **tăng tốc dashboard** (tính trước thay vì mỗi lần mở) vừa là nền cho **downsampling dài hạn** (Thanos/Mimir nén dữ liệu cũ xuống 5m/1h). Với dữ liệu năm, đây là cách duy nhất để không "chết vì dung lượng".

---

## 7. Tóm tắt
- **Time-series** = `(timestamp, value)` theo đối tượng đo: **append-heavy, gần như không update, nén cực tốt, đọc theo range + tổng hợp** → cần TSDB riêng, **đừng nhét vào SQL thường** (index phình, không nén cột, retention = DELETE đau).
- **Prometheus**: metric + labels = **series**; **pull model** (scrape + service discovery); lưu **head block trong RAM + WAL + block bất biến trên đĩa**, retention = xoá nguyên block; truy vấn bằng **PromQL** (nhớ `rate()` cho counter, `sum by`, `histogram_quantile`).
- **InfluxDB**: **line protocol** measurement + **tag (index) + field (value)**; mặc định **push**; **retention policy + continuous query/task** cho downsampling.
- **Cardinality explosion** là kẻ giết TSDB số một: số series = **tích** các label; **không đưa user_id/url/request_id/IP** vào label/tag — dùng log/trace cho việc đó.
- **Downsampling + retention theo tầng** (recording rule / CQ) giữ lịch sử dài mà không phình dung lượng.

> **Bài tiếp theo (Bài 18):** rời khỏi metric, đi sang **search & log store** — Elasticsearch/OpenSearch: inverted index cho full-text, và vì sao tìm kiếm văn bản lại là một bài toán lưu trữ hoàn toàn khác.
