# Metrics sâu: Prometheus & Grafana

Log kể cho bạn *chuyện gì đã xảy ra ở một request cụ thể*; metric kể cho bạn *hệ thống đang khoẻ hay ốm ngay lúc này, ở quy mô toàn cục, với chi phí lưu trữ gần như bằng phẳng dù traffic tăng 100 lần*. Đó là lý do metric là trụ cột đầu tiên bạn dựng khi vận hành production. Bài này đi sâu vào Prometheus — chuẩn de-facto của thế giới cloud-native — từ mô hình thu thập, 4 kiểu dữ liệu, ngôn ngữ truy vấn PromQL, tới alerting, Grafana và hai khung tư duy RED/USE. Kèm rất nhiều PromQL và config chạy được thật.

## Mục tiêu

- Hiểu **bản chất pull model** của Prometheus, tại sao scrape `/metrics` thay vì push, và service discovery hoạt động ra sao.
- Phân biệt **4 loại metric** (counter, gauge, histogram, summary) và biết khi nào dùng loại nào — sai loại là sai từ gốc.
- Viết được **PromQL** thực chiến: `rate()`, `histogram_quantile()` cho p95/p99, aggregation `sum by`, recording rule.
- Cấu hình **alerting rule + Alertmanager** (routing, dedup, silence) đúng chuẩn production.
- Áp dụng **RED** (cho service) và **USE** (cho resource) để biết *nên đo cái gì* thay vì đo bừa.
- Tránh **cardinality explosion** — cái bẫy giết chết Prometheus phổ biến nhất.

## 1. Pull model: Prometheus tự đi lấy, không chờ ai đẩy

Đa số hệ thống monitoring cũ (Graphite, StatsD) dùng **push**: app tự bắn metric tới server. Prometheus lật ngược: **pull** — Prometheus chủ động HTTP GET vào một endpoint (`/metrics`) của từng target theo chu kỳ (`scrape_interval`, thường 15–60s). Target chỉ cần *phơi bày* trạng thái hiện tại ở dạng text; nó không biết và không quan tâm ai đang đọc.

Endpoint `/metrics` trả về text thuần, mỗi dòng là một time series:

```
# HELP http_requests_total Total HTTP requests processed.
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/orders",status="200"} 128973
http_requests_total{method="POST",route="/orders",status="500"} 42
# HELP process_resident_memory_bytes Resident memory size in bytes.
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes 5.1273728e+07
```

Vì sao pull lại thắng ở quy mô cloud-native:

- **Health check miễn phí**: nếu scrape fail, Prometheus biết ngay target *down* (`up == 0`) — push model không phân biệt được "app khoẻ nhưng im lặng" với "app chết".
- **Không cần app biết địa chỉ monitoring**: app chỉ mở port, Prometheus tự tìm. Dễ chạy nhiều Prometheus song song (một cho team, một cho global) cùng scrape một target.
- **Chống quá tải ngược**: Prometheus tự điều tiết nhịp lấy; push model dễ làm sập chính server monitoring khi có storm.

> ⚠️ Pull không hợp cho **job ngắn/batch** (chạy 2 giây rồi chết, chưa kịp bị scrape). Với loại này dùng **Pushgateway**: job push metric vào Pushgateway, Prometheus scrape Pushgateway. Đừng lạm dụng Pushgateway cho service thường trực — nó phá luôn health check và giữ metric cũ mãi.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" aria-labelledby="pullT pullD" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title id="pullT">Prometheus pull model với service discovery và scrape endpoint /metrics</title>
  <desc id="pullD">Service discovery (Kubernetes API) cung cấp danh sách target; Prometheus server chủ động HTTP GET /metrics vào từng target theo scrape_interval, lưu vào TSDB; Grafana và Alertmanager đọc từ Prometheus.</desc>
  <defs>
    <marker id="pah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <g font-size="11.5" fill="currentColor" stroke="currentColor">
    <rect x="24" y="130" width="150" height="70" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="99" y="158" text-anchor="middle" stroke="none" font-weight="700">Service Discovery</text>
    <text x="99" y="176" text-anchor="middle" stroke="none" font-size="10" opacity="0.7">Kubernetes API</text>
    <text x="99" y="190" text-anchor="middle" stroke="none" font-size="10" opacity="0.7">danh sách target</text>
    <line x1="174" y1="165" x2="256" y2="165" stroke-opacity="0.6" marker-end="url(#pah)"/>
    <text x="215" y="158" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.75">targets</text>
  </g>
  <g font-size="11.5" fill="currentColor" stroke="currentColor">
    <rect x="258" y="128" width="170" height="74" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke-opacity="0.2"/>
    <text x="343" y="152" text-anchor="middle" stroke="none" font-weight="700">Prometheus Server</text>
    <text x="343" y="170" text-anchor="middle" stroke="none" font-size="10" opacity="0.7">scrape loop + TSDB</text>
    <text x="343" y="186" text-anchor="middle" stroke="none" font-size="10" opacity="0.7">PromQL engine + rules</text>
  </g>
  <g font-size="10.5" fill="currentColor" stroke="currentColor">
    <rect x="530" y="40" width="166" height="40" rx="8" fill="#10b981" fill-opacity="0.15" stroke-opacity="0.2"/>
    <text x="613" y="58" text-anchor="middle" stroke="none">app A · /metrics</text>
    <text x="613" y="72" text-anchor="middle" stroke="none" font-size="9" opacity="0.65">exporter trong app</text>
    <rect x="530" y="92" width="166" height="40" rx="8" fill="#10b981" fill-opacity="0.15" stroke-opacity="0.2"/>
    <text x="613" y="110" text-anchor="middle" stroke="none">app B · /metrics</text>
    <rect x="530" y="144" width="166" height="40" rx="8" fill="#14b8a6" fill-opacity="0.15" stroke-opacity="0.2"/>
    <text x="613" y="162" text-anchor="middle" stroke="none">node_exporter</text>
    <text x="613" y="176" text-anchor="middle" stroke="none" font-size="9" opacity="0.65">CPU/mem/disk của host</text>
  </g>
  <g stroke="currentColor" font-size="9.5" fill="currentColor">
    <line x1="428" y1="150" x2="528" y2="62" stroke-opacity="0.6" marker-end="url(#pah)"/>
    <line x1="428" y1="162" x2="528" y2="112" stroke-opacity="0.6" marker-end="url(#pah)"/>
    <line x1="428" y1="176" x2="528" y2="164" stroke-opacity="0.6" marker-end="url(#pah)"/>
    <text x="474" y="96" text-anchor="middle" stroke="none" font-weight="700" opacity="0.85">GET /metrics</text>
    <text x="474" y="108" text-anchor="middle" stroke="none" opacity="0.6">mỗi 15s (pull)</text>
  </g>
  <g font-size="10.5" fill="currentColor" stroke="currentColor">
    <rect x="258" y="248" width="170" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="343" y="266" text-anchor="middle" stroke="none">Alertmanager</text>
    <text x="343" y="280" text-anchor="middle" stroke="none" font-size="9" opacity="0.65">route · dedup · silence</text>
    <rect x="60" y="248" width="150" height="40" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="135" y="272" text-anchor="middle" stroke="none">Grafana</text>
    <line x1="320" y1="202" x2="320" y2="246" stroke-opacity="0.6" marker-end="url(#pah)"/>
    <text x="366" y="228" stroke="none" font-size="9" opacity="0.7">push alert</text>
    <line x1="258" y1="180" x2="180" y2="246" stroke-opacity="0.6" marker-end="url(#pah)"/>
    <text x="196" y="216" stroke="none" font-size="9" opacity="0.7">query PromQL</text>
  </g>
</svg>

## 2. Exporter: cầu nối cho thứ không tự nói tiếng Prometheus

Không phải mọi thứ đều tự phơi `/metrics`. **Exporter** là process nhỏ dịch trạng thái của một hệ thống sang định dạng Prometheus:

- **node_exporter**: đọc `/proc`, `/sys` của Linux → phơi CPU, memory, disk I/O, network, filesystem của *host*. Đây là nền tảng cho USE method ở phần dưới.
- **cAdvisor / kube-state-metrics**: metric của container và trạng thái object Kubernetes (số pod, replica mong muốn vs thực tế).
- **blackbox_exporter**: probe từ ngoài vào (HTTP, TCP, ICMP, DNS) — đo được cả cái Prometheus không scrape trực tiếp được.
- Exporter cho DB (postgres_exporter, redis_exporter), message broker, v.v.

Còn app của chính bạn thì **tự instrument** bằng client library (Go, Java, Python, Node...) — nó dựng sẵn một registry và một handler `/metrics`. Ví dụ Python:

```python
from prometheus_client import Counter, Histogram, start_http_server
import time

REQS = Counter("http_requests_total", "Total requests",
               ["method", "route", "status"])
LAT = Histogram("http_request_duration_seconds", "Request latency",
                ["route"],
                buckets=(.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5))

def handle(method, route):
    start = time.perf_counter()
    status = do_work(route)                       # xử lý nghiệp vụ
    LAT.labels(route=route).observe(time.perf_counter() - start)
    REQS.labels(method=method, route=route, status=str(status)).inc()

start_http_server(8000)   # phơi /metrics ở :8000, Prometheus tự scrape
```

## 3. Bốn loại metric — chọn sai là hỏng từ gốc

| Loại | Ngữ nghĩa | Giá trị | Ví dụ | Truy vấn điển hình |
|---|---|---|---|---|
| **Counter** | Chỉ **tăng** (reset về 0 khi restart) | Tổng tích luỹ | `http_requests_total`, `errors_total` | luôn bọc `rate()` |
| **Gauge** | Lên **và** xuống | Giá trị tức thời | `memory_bytes`, `queue_depth`, `temperature` | đọc trực tiếp, `avg`, `max` |
| **Histogram** | Phân phối, chia **bucket** phía client | Nhiều series (`_bucket`, `_sum`, `_count`) | latency, response size | `histogram_quantile()` |
| **Summary** | Quantile tính sẵn **phía client** | `_sum`, `_count`, quantile cố định | latency khi không cần gộp | đọc trực tiếp quantile |

**Counter** là loại hay dùng nhất. Điều mấu chốt: **giá trị thô của counter vô nghĩa** ("128973 request" tính từ bao giờ?). Cái ta cần là *tốc độ thay đổi* — dùng `rate()`. Counter reset về 0 khi process restart; `rate()` được thiết kế để tự phát hiện và xử lý cú reset đó, nên đừng bao giờ tự tính hiệu tay.

**Gauge** đo cái lên xuống. Đừng bọc `rate()` quanh gauge — vô nghĩa. Với gauge bạn muốn giá trị hiện tại, `max_over_time`, hoặc `deriv()` nếu cần độ dốc.

**Histogram vs Summary** — điểm khác biệt then chốt và hay bị hiểu sai:

- **Histogram** đếm số quan sát rơi vào từng **bucket** định trước (`le` = "less than or equal"). Bucket là **cumulative**. Quantile được tính *phía server* lúc query bằng `histogram_quantile()` — nghĩa là bạn **gộp được nhiều instance** rồi mới tính p99 toàn hệ thống. Đây là lý do histogram gần như luôn là lựa chọn đúng cho latency.
- **Summary** tính quantile ngay *phía client* cho từng instance. Rẻ khi query nhưng **không cộng gộp được**: trung bình của p99 từng máy *không phải* p99 toàn cục. Chọn bucket của histogram sai thì độ chính xác quantile kém, nhưng bạn linh hoạt; summary thì quantile chính xác cho một instance nhưng cứng nhắc và không aggregate.

> 💡 Quy tắc ngón tay cái: **latency → histogram** (để gộp p95/p99 nhiều instance). Chỉ dùng summary khi bạn đo một thứ đơn lẻ, không cần gộp, và muốn quantile chính xác không phụ thuộc bucket.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" aria-labelledby="hT hD" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title id="hT">Histogram bucket cumulative và cách histogram_quantile nội suy p95</title>
  <desc id="hD">Mỗi bucket le đếm cộng dồn số quan sát nhỏ hơn hoặc bằng ngưỡng; histogram_quantile tìm bucket chứa vị trí phần trăm mong muốn rồi nội suy tuyến tính bên trong bucket đó để ước lượng p95.</desc>
  <text x="16" y="24" font-size="13" font-weight="700" fill="currentColor">Histogram: bucket cumulative (le = ≤ ngưỡng), đơn vị giây</text>
  <g font-size="10.5" fill="currentColor">
    <rect x="30" y="70" width="70" height="150" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/>
    <rect x="110" y="55" width="70" height="165" rx="4" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <rect x="190" y="40" width="70" height="180" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/>
    <rect x="270" y="90" width="70" height="130" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/>
    <rect x="350" y="120" width="70" height="100" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/>
    <rect x="430" y="130" width="70" height="90" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="65" y="240" text-anchor="middle" fill="currentColor">le=0.05</text>
    <text x="65" y="90" text-anchor="middle" fill="currentColor" font-weight="700">920</text>
    <text x="145" y="240" text-anchor="middle" fill="currentColor" font-weight="700">le=0.1</text>
    <text x="145" y="75" text-anchor="middle" fill="currentColor" font-weight="700">960</text>
    <text x="225" y="240" text-anchor="middle" fill="currentColor">le=0.25</text>
    <text x="225" y="60" text-anchor="middle" fill="currentColor" font-weight="700">988</text>
    <text x="305" y="240" text-anchor="middle" fill="currentColor">le=0.5</text>
    <text x="305" y="110" text-anchor="middle" fill="currentColor" font-weight="700">995</text>
    <text x="385" y="240" text-anchor="middle" fill="currentColor">le=1.0</text>
    <text x="385" y="140" text-anchor="middle" fill="currentColor" font-weight="700">999</text>
    <text x="465" y="240" text-anchor="middle" fill="currentColor">le=+Inf</text>
    <text x="465" y="150" text-anchor="middle" fill="currentColor" font-weight="700">1000</text>
  </g>
  <g font-size="11" fill="currentColor">
    <line x1="145" y1="40" x2="145" y2="260" stroke="#f43f5e" stroke-opacity="0.7" stroke-dasharray="5 4"/>
    <text x="540" y="120" fill="currentColor" font-weight="700">p95 của 1000 quan sát</text>
    <text x="540" y="140" fill="currentColor" opacity="0.75" font-size="10.5">= quan sát thứ 950</text>
    <text x="540" y="158" fill="currentColor" opacity="0.75" font-size="10.5">rơi vào bucket (0.05, 0.1]</text>
    <text x="540" y="182" fill="currentColor" opacity="0.75" font-size="10.5">histogram_quantile nội suy</text>
    <text x="540" y="198" fill="currentColor" opacity="0.75" font-size="10.5">tuyến tính trong bucket đó</text>
    <text x="540" y="216" fill="currentColor" font-weight="700" font-size="10.5">≈ 0.088s</text>
  </g>
  <text x="16" y="285" font-size="10" fill="currentColor" opacity="0.6">Độ chính xác quantile phụ thuộc HOÀN TOÀN vào việc chọn bucket sát vùng SLO của bạn.</text>
</svg>

## 4. PromQL: ngôn ngữ để hỏi TSDB

PromQL vận hành trên **time series** được định danh bởi tên metric + bộ **label**. Nắm 5 khối này là đủ dùng 90% thời gian.

### 4.1 Selector + label matching

```promql
# instant vector: giá trị mới nhất của mọi series khớp
http_requests_total{route="/orders", status="500"}

# matcher: = (bằng), != (khác), =~ (regex khớp), !~ (regex không khớp)
http_requests_total{status=~"5.."}          # mọi status 5xx
http_requests_total{route!="/healthz"}      # bỏ health check

# range vector: lấy dữ liệu trong cửa sổ 5 phút (cần cho rate/increase)
http_requests_total{status=~"5.."}[5m]
```

### 4.2 rate() — luôn dùng cho counter

`rate()` tính tốc độ tăng trung bình mỗi giây của counter trong cửa sổ, đã xử lý counter reset:

```promql
# request/giây trên mỗi (route, status) trong 5 phút gần nhất
rate(http_requests_total[5m])

# irate() = tốc độ tức thời (2 điểm cuối) — nhạy hơn, dùng cho graph biến động nhanh
# increase() = tổng tăng tuyệt đối trong cửa sổ (= rate * số giây)
increase(http_requests_total[1h])           # tổng request trong 1 giờ
```

> ⚠️ Cửa sổ của `rate()` phải **≥ 4× scrape_interval** để chịu được 1–2 lần scrape lỗi. Scrape 15s thì `[1m]` là tối thiểu an toàn, `[5m]` mượt hơn cho alert. Quá ngắn → đồ thị đầy lỗ; quá dài → phản ứng chậm với sự cố.

### 4.3 histogram_quantile() — p95/p99 đúng cách

Đây là công thức bạn sẽ dùng đi dùng lại. Chú ý: `rate()` áp lên `_bucket`, rồi `sum by (le, ...)` để gộp instance, rồi mới `histogram_quantile`:

```promql
# p99 latency toàn hệ thống, theo route
histogram_quantile(
  0.99,
  sum by (le, route) (
    rate(http_request_duration_seconds_bucket[5m])
  )
)

# p50 / p95 / p99 tổng thể (bỏ route, gộp tất cả)
histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))
```

Thứ tự đúng là **rate → sum by (le) → histogram_quantile**. Đảo thứ tự (tính quantile từng instance rồi trung bình) cho ra số sai về mặt toán học.

### 4.4 Aggregation: sum by / without

Toán tử gộp (`sum`, `avg`, `max`, `min`, `count`, `topk`, `quantile`) thu nhỏ chiều label:

```promql
# tổng request/giây toàn service (gộp hết label)
sum(rate(http_requests_total[5m]))

# giữ lại chỉ label route, gộp phần còn lại
sum by (route) (rate(http_requests_total[5m]))

# gộp TẤT CẢ trừ những label liệt kê (nghịch của by)
sum without (instance, pod) (rate(http_requests_total[5m]))

# top 5 route bận nhất
topk(5, sum by (route) (rate(http_requests_total[5m])))
```

Error ratio — công thức RED kinh điển: **chia hai rate**, nhớ khớp label bằng `on()`/`by()`:

```promql
# tỉ lệ lỗi 5xx theo route (0..1)
sum by (route) (rate(http_requests_total{status=~"5.."}[5m]))
/
sum by (route) (rate(http_requests_total[5m]))
```

### 4.5 Recording rule — tính trước để nhanh và rẻ

Query lồng nhiều tầng (nhất là histogram_quantile trên high-cardinality) *đắt* khi Grafana vẽ dashboard hay alert chạy mỗi 15s. **Recording rule** tính sẵn theo chu kỳ, lưu thành series mới, đặt tên theo quy ước `level:metric:operation`:

```yaml
# rules/recording.yml
groups:
  - name: http_slo
    interval: 30s
    rules:
      - record: job:http_requests:rate5m           # request rate theo job
        expr: sum by (job, route) (rate(http_requests_total[5m]))
      - record: job:http_errors:ratio5m            # error ratio dựng sẵn
        expr: |
          sum by (job, route) (rate(http_requests_total{status=~"5.."}[5m]))
          /
          sum by (job, route) (rate(http_requests_total[5m]))
      - record: job:http_latency:p99_5m
        expr: histogram_quantile(0.99, sum by (job, route, le) (rate(http_request_duration_seconds_bucket[5m])))
```

Sau đó dashboard/alert chỉ đọc `job:http_errors:ratio5m` — rẻ và nhất quán một nguồn sự thật.

## 5. Alerting: rule + Alertmanager

Prometheus tách bạch **phát hiện** (alerting rule, trong Prometheus) và **định tuyến/thông báo** (Alertmanager, service riêng). Prometheus đánh giá rule; khi điều kiện đúng liên tục đủ `for`, nó *bắn* alert sang Alertmanager; Alertmanager lo group, dedup, silence và gửi tới đích (PagerDuty, Slack, email).

### Alerting rule

```yaml
# rules/alerts.yml
groups:
  - name: service_health
    rules:
      - alert: HighErrorRate
        expr: job:http_errors:ratio5m > 0.05          # > 5% lỗi
        for: 10m                                       # phải đúng LIÊN TỤC 10 phút
        labels:
          severity: page                               # dùng để routing
          team: orders
        annotations:
          summary: "Error rate cao trên {{ $labels.route }}"
          description: "{{ $labels.route }} lỗi {{ $value | humanizePercentage }} (ngưỡng 5%)."
          runbook_url: "https://wiki/runbooks/high-error-rate"

      - alert: TargetDown
        expr: up == 0
        for: 5m
        labels: { severity: page }
        annotations:
          summary: "Target {{ $labels.job }}/{{ $labels.instance }} không scrape được."
```

`for` là *cực* quan trọng: nó lọc nhiễu thoáng qua. Không có `for`, một spike 15s cũng gọi bạn dậy lúc 3h sáng. Chỉ page trên **symptom ảnh hưởng user** (error rate, latency, SLO burn), không page trên *cause* (CPU cao) — cause nên là `severity: warning` gửi Slack.

### Alertmanager: routing, dedup, silence

```yaml
# alertmanager.yml
route:
  receiver: slack-default
  group_by: [alertname, team]        # gộp alert cùng nhóm thành 1 thông báo
  group_wait: 30s                    # chờ gom thêm alert cùng nhóm trước khi gửi lần đầu
  group_interval: 5m                 # nhịp gửi cập nhật cho nhóm đang active
  repeat_interval: 4h                # nhắc lại nếu vẫn firing
  routes:
    - matchers: [severity="page"]    # severity=page → PagerDuty (đánh thức người)
      receiver: pagerduty-oncall
      continue: false
    - matchers: [team="orders"]
      receiver: slack-orders

receivers:
  - name: slack-default
    slack_configs:
      - channel: "#alerts"
        api_url: "https://hooks.slack.com/services/XXX"
  - name: pagerduty-oncall
    pagerduty_configs:
      - service_key: "<key>"

inhibit_rules:                       # dedup theo quan hệ nhân-quả
  - source_matchers: [severity="page", alertname="TargetDown"]
    target_matchers: [severity="warning"]
    equal: [instance]                # nếu cả node down, im các warning của chính node đó
```

Ba cơ chế lõi của Alertmanager:

- **Grouping/Dedup**: 200 pod cùng lỗi → *một* thông báo theo `group_by`, không phải 200 tin nhắn. Nhiều Prometheus HA gửi cùng alert → Alertmanager khử trùng.
- **Inhibition**: alert "cả node chết" *đè* (ức chế) các alert con "pod trên node đó chết" — bạn thấy nguyên nhân gốc, không bị ngập hệ quả.
- **Silence**: tắt tạm alert khớp matcher trong khoảng thời gian (ví dụ đang bảo trì DB) — set qua UI/API, có TTL, không cần sửa config.

## 6. Grafana: dashboard & panel

Prometheus có UI query thô, nhưng **Grafana** là nơi bạn dựng dashboard vận hành. Panel = một truy vấn PromQL + cách hiển thị (time series, stat, gauge, bar, heatmap, table). Vài nguyên tắc panel tốt:

```promql
# Panel "Latency p50/p95/p99" — 3 query trong 1 time-series panel
histogram_quantile(0.50, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))
histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))
histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))
```

- **Template variable** `$route`, `$namespace`: dropdown filter, dùng `label_values(http_requests_total, route)` để tự sinh danh sách — một dashboard tái dùng cho mọi service.
- **Đặt panel theo RED/USE**, không đặt theo "cái gì dễ vẽ". Hàng trên: Rate, Errors, Duration của service; hàng dưới: Utilization/Saturation của resource.
- **Heatmap cho histogram**: hiển thị `_bucket` dạng heatmap thấy được cả phân phối latency thay đổi theo thời gian — phát hiện bimodal (2 cụm nhanh/chậm) mà p99 giấu đi.
- Provisioning dashboard **as-code** (JSON trong Git), không chỉnh tay trên UI production.

## 7. RED và USE: đo cái gì, cho cái nào

Đây là câu trả lời cho "tôi nên tạo metric gì". Hai khung bổ sung nhau: RED nhìn từ **góc user/service**, USE nhìn từ **góc resource**.

| | **RED** (cho service) | **USE** (cho resource) |
|---|---|---|
| Áp dụng cho | Cái *phục vụ request*: API, RPC, queue consumer | Cái *có giới hạn hữu hạn*: CPU, memory, disk, network, connection pool |
| Đo | **R**ate · **E**rrors · **D**uration | **U**tilization · **S**aturation · **E**rrors |
| Trả lời | "User có đang khổ không?" | "Tài nguyên nào sắp cạn?" |
| Loại metric | counter (rate, errors) + histogram (duration) | gauge (utilization, saturation) + counter (errors) |

**RED** — với mọi service, đo đúng 3 thứ:

```promql
# Rate: request/giây
sum by (service) (rate(http_requests_total[5m]))
# Errors: request lỗi/giây (hoặc tỉ lệ)
sum by (service) (rate(http_requests_total{status=~"5.."}[5m]))
# Duration: p99 latency
histogram_quantile(0.99, sum by (service, le) (rate(http_request_duration_seconds_bucket[5m])))
```

**USE** — với mọi resource, đo 3 thứ (ví dụ node từ node_exporter):

```promql
# Utilization: % CPU đang bận (1 - tỉ lệ idle)
1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m]))
# Saturation: độ dài hàng chờ — run-queue vượt số core = CPU quá tải
node_load15 / count by (instance) (node_cpu_seconds_total{mode="idle"})
# Errors: lỗi phần cứng/mạng
rate(node_network_receive_errs_total[5m])

# Memory utilization: % RAM đã dùng
1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes
# Disk saturation: I/O bận (thời gian thiết bị busy mỗi giây)
rate(node_disk_io_time_seconds_total[5m])
```

**Utilization vs Saturation** — chỗ hay lẫn: utilization là *tỉ lệ bận* (0–100%); saturation là *lượng việc phải xếp hàng chờ* vì tài nguyên đã đầy (run-queue, swap, queue depth). CPU 100% utilization mà run-queue = 0 thì vẫn ổn (dùng hết đúng nghĩa); nhưng run-queue = 20 nghĩa là có 20 tiến trình đang xếp hàng — đó mới là đau. Saturation thường là chỉ báo sớm và sát "sắp sập" hơn utilization.

## 8. Cardinality: cái bẫy giết Prometheus

Prometheus lưu **mỗi tổ hợp label duy nhất là một time series riêng** trong bộ nhớ. **Cardinality** = số tổ hợp label. Nó nhân lên theo tích Descartes:

```
http_requests_total{method, route, status}
= |method(5)| × |route(20)| × |status(6)| = 600 series   ✅ ổn
```

Thêm một label giá trị vô hạn thì nổ:

```
http_requests_total{method, route, status, user_id}
= 600 × |user_id (1 triệu)| = 600 triệu series           💥 sập
```

**Label giá trị cao (unbounded) = tử thần**: `user_id`, `email`, `request_id`, `trace_id`, `session_id`, full URL có query param, IP client, timestamp, error message thô. Mỗi giá trị mới tạo một series mới sống mãi trong RAM → Prometheus OOM, query chậm, ingest nghẽn.

> ⚠️ Quy tắc vàng: **label chỉ dùng cho giá trị hữu hạn, ít, biết trước** (method, route đã normalize, status class, region, pod đến mức chấp nhận được). Thứ high-cardinality như `user_id`, `trace_id` **thuộc về log/trace, không phải metric**. Cần biết "user X gặp lỗi gì" → nhảy sang trace bằng exemplar, đừng nhét vào label.

Mẹo phòng thủ:

- **Normalize route TRƯỚC khi thành label**: `/orders/12345` → `/orders/:id`. Nếu không, mỗi order id là một series.
- Đặt `sample_limit` per-scrape để một target lỗi không kéo sập cả Prometheus.
- Soi thủ phạm: `topk(10, count by (__name__)({__name__=~".+"}))` — metric nào đẻ nhiều series nhất; hoặc `count(count by (label) (metric))` để đo cardinality một label.

## Tóm tắt

- **Pull model**: Prometheus scrape `/metrics` theo chu kỳ; scrape fail = target down (health check miễn phí). Job ngắn → Pushgateway.
- **Exporter** dịch hệ thống bên ngoài sang định dạng Prometheus (node_exporter cho host); app tự instrument bằng client library. **Service discovery** (K8s) tự cập nhật danh sách target.
- **4 loại metric**: counter (chỉ tăng, luôn `rate()`), gauge (lên xuống, đọc thẳng), histogram (bucket → `histogram_quantile()`, gộp được nhiều instance), summary (quantile client-side, không gộp được). Latency → dùng histogram.
- **PromQL** cốt lõi: selector + label matcher, `rate()` cho counter, `histogram_quantile(0.99, sum by (le) (rate(..._bucket[5m])))` cho p99, `sum by/without` để gộp, recording rule để tính trước.
- **Alerting**: rule + `for` (lọc nhiễu, page trên symptom) → **Alertmanager** lo routing, grouping/dedup, inhibition, silence.
- **RED** (Rate/Errors/Duration) cho service, **USE** (Utilization/Saturation/Errors) cho resource — khung để biết *đo cái gì*.
- **Cardinality**: đừng bao giờ đặt giá trị unbounded (user_id, trace_id, request_id) làm label — đó là cách phổ biến nhất làm sập Prometheus.

> Bài tiếp theo: distributed tracing — theo dấu một request xuyên nhiều service bằng OpenTelemetry, và cách exemplar nối metric với trace để nhảy từ "p99 tăng" sang đúng trace chậm.
