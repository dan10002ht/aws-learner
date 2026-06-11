# Observability sâu

Monitoring trả lời câu hỏi bạn đã biết trước: "CPU có quá 80% không?". Observability trả lời câu hỏi bạn **chưa từng nghĩ tới** lúc 3 giờ sáng: "Vì sao 0.3% request từ một build app Android cụ thể, gọi qua một payment provider, chỉ ở region ap-southeast-1, lại timeout?". Bài này dạy bạn dựng hệ thống mà khi có sự cố lạ, bạn **suy luận ra nguyên nhân từ dữ liệu sẵn có** thay vì phải deploy thêm log rồi chờ tái hiện.

> 💡 **Nguyên tắc:** Observability là thuộc tính "bạn có thể hiểu trạng thái bên trong hệ thống chỉ bằng output bên ngoài, mà không cần ship code mới". Nếu để debug một sự cố mới bạn phải thêm log rồi deploy lại — hệ thống của bạn chưa observable.

## 1. Monitoring vs Observability

Hai từ này hay bị dùng lẫn. Chúng bổ sung cho nhau, không thay thế.

| | Monitoring | Observability |
|---|---|---|
| Câu hỏi | "Known-unknowns" — điều bạn biết là cần theo dõi | "Unknown-unknowns" — điều bất ngờ |
| Cách dùng | Dashboard + alert đã định nghĩa sẵn | Truy vấn ad-hoc, slice/dice theo chiều tuỳ ý |
| Ví dụ | "Alert khi error rate > 1%" | "Lọc các request lỗi → nhóm theo `customer_id` → thấy 1 khách chiếm 90%" |
| Dữ liệu | Metrics tổng hợp | Logs + traces giàu chiều (high cardinality) |
| Khi nào tỏa sáng | Phát hiện vấn đề | Điều tra nguyên nhân |

Thực tế: bạn dùng **monitoring để biết có chuyện gì đó sai** (alert kêu), rồi dùng **observability để biết sai ở đâu** (đào sâu). Một hệ thống chỉ có monitoring sẽ kêu "error rate 5%" nhưng không cho bạn manh mối nào để biết tại sao.

> ⚠️ **Bẫy:** Mua một SaaS gắn nhãn "observability platform" rồi vẫn chỉ dùng nó như dashboard CPU/RAM. Công cụ không tạo ra observability — **độ giàu của dữ liệu bạn phát ra** (cardinality, context, trace id) mới tạo ra nó.

## 2. Ba trụ cột: Metrics, Logs, Traces

Đây là ba dạng tín hiệu (telemetry) bù trừ nhau. Mỗi loại trả lời một câu hỏi khác.

| Trụ cột | Trả lời | Đặc tính | Chi phí lưu trữ |
|---|---|---|---|
| **Metrics** | "Có sai không? Bao nhiêu?" | Số đã tổng hợp theo thời gian, cardinality thấp | Rẻ (vài byte/điểm) |
| **Logs** | "Chuyện gì đã xảy ra với *request này*?" | Sự kiện rời rạc, giàu context | Đắt (full text) |
| **Traces** | "Request đi qua những đâu, chậm ở chặng nào?" | Cây span nối các service | Trung bình (thường sample) |

### Cách phối hợp thực chiến

Luồng điều tra điển hình:

```
Metric (p99 latency tăng vọt lúc 14:02)
   → khoanh vùng thời gian + service
Trace (1 request mẫu: 90% thời gian nằm ở span gọi DB)
   → biết chặng nào chậm
Log (dòng log của span đó: "slow query: SELECT ... WHERE status IN (...)")
   → biết chính xác query nào, vì sao
```

Ba trụ cột phải **liên kết được với nhau**: từ một điểm metric bất thường, click sang exemplar trace, từ trace nhảy sang log của đúng span đó. Nếu chúng nằm ở ba hệ thống rời rạc không có khóa chung, bạn mất nửa giờ copy-paste timestamp mỗi lần điều tra.

> 💡 **Nguyên tắc:** Dùng `trace_id` làm khóa liên kết xuyên suốt cả ba trụ cột. Mọi dòng log phải có `trace_id`; mọi metric quan trọng nên có exemplar trỏ về một trace mẫu.

## 3. RED method — cho service hướng request

RED là bộ ba metric tối thiểu cho **bất kỳ** service nhận request (HTTP API, gRPC, consumer hàng đợi). Do Tom Wilkie đề xuất, rất hợp microservice.

| Chữ | Metric | Vì sao quan trọng |
|---|---|---|
| **R**ate | Số request/giây | Tải hiện tại; rate tụt bất thường = upstream chết |
| **E**rrors | Số request lỗi/giây (hoặc tỉ lệ %) | Trải nghiệm hỏng trực tiếp |
| **D**uration | Phân phối latency (percentile) | Chậm cũng là "hỏng" với người dùng |

PromQL ví dụ cho một service HTTP:

```promql
# Rate: request/giây trong 5 phút
sum(rate(http_requests_total{job="checkout"}[5m]))

# Errors: tỉ lệ 5xx
sum(rate(http_requests_total{job="checkout", code=~"5.."}[5m]))
  / sum(rate(http_requests_total{job="checkout"}[5m]))

# Duration: p99 từ histogram
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket{job="checkout"}[5m])) by (le))
```

Một SLO điển hình dựa trên RED: *"99% request checkout trả về < 300ms và không 5xx, đo trên cửa sổ rolling 30 ngày."*

## 4. USE method — cho tài nguyên

USE (Brendan Gregg) dùng cho **resource** (CPU, disk, network interface, connection pool, thread pool), không phải request. Với mỗi tài nguyên, đo ba thứ:

| Chữ | Ý nghĩa | Ví dụ |
|---|---|---|
| **U**tilization | % thời gian tài nguyên bận | CPU 75% busy |
| **S**aturation | Mức xếp hàng chờ vượt năng lực | Run-queue length, disk I/O wait, pool wait queue |
| **E**rrors | Số sự kiện lỗi | Packet drop, ECC error, connection refused |

Điểm tinh tế: **Utilization 100% chưa chắc là vấn đề** (một CPU chạy hết công suất mà không ai chờ thì vẫn ổn). Chính **Saturation** mới là tín hiệu đau: hàng đợi dài nghĩa là có việc đang phải chờ.

> ⚠️ **Bẫy:** Chỉ alert trên Utilization ("CPU > 80%"). CPU 80% trong batch job là bình thường; còn connection pool saturation (request xếp hàng chờ slot) mới làm latency p99 nổ tung dù CPU chỉ 40%. Hãy đo và alert trên saturation.

### RED hay USE?

```
Người dùng phàn nàn "app chậm/lỗi"  → bắt đầu từ RED (góc nhìn request)
Một host/pod/queue "có vẻ ốm"        → bắt đầu từ USE (góc nhìn tài nguyên)
```

Hai phương pháp gặp nhau khi điều tra: RED cho thấy *triệu chứng* (p99 tăng), USE chỉ ra *nguyên nhân tài nguyên* (DB connection pool saturated).

## 5. Percentile p50/p95/p99 — vì sao "average nói dối"

Đây là phần quan trọng nhất bài. **Đừng bao giờ alert hay đặt SLO trên average latency.**

Average bị che bởi số đông. Giả sử 100 request với latency (ms):

```
99 request: 50ms
 1 request: 5000ms   (5 giây — một người dùng đang chửi thề)

average = (99×50 + 5000) / 100 = 99.5ms   ← trông "ổn"
p99     = 5000ms                           ← phơi bày sự thật
```

Average 99.5ms khiến bạn yên tâm trong khi có người chờ 5 giây. Percentile mới nói thật:

| Percentile | Ý nghĩa | Dùng để |
|---|---|---|
| **p50** (median) | 50% nhanh hơn giá trị này | Trải nghiệm "điển hình" |
| **p95** | 5% chậm nhất bắt đầu từ đây | SLO phổ biến cho web |
| **p99** | 1% chậm nhất | Tail latency — nơi khách VIP/request nặng cư trú |
| **p99.9** | 1/1000 | Hệ thống fan-out lớn (xem dưới) |

### Vì sao tail latency quan trọng hơn bạn nghĩ

Một trang gọi 100 microservice song song (fan-out). Trang chỉ trả về khi **service chậm nhất** xong. Nếu mỗi service có p99 = 1s, xác suất *ít nhất một* trong 100 lần gọi rơi vào đuôi p99 là:

```
1 - (0.99)^100 ≈ 63%
```

Nghĩa là **63% số lần load trang** sẽ chạm tail latency 1s, dù mỗi service "chỉ" 1% chậm. Đây là lý do Amazon/Google ám ảnh với p99.9: ở quy mô fan-out, đuôi của một service trở thành trải nghiệm điển hình của người dùng.

> 💡 **Nguyên tắc:** Đặt SLO trên percentile (p95/p99), không phải average. "p99 latency < 300ms" là mục tiêu có ý nghĩa; "average < 300ms" có thể đúng trong khi 1% người dùng khốn khổ.

> ⚠️ **Bẫy:** Không lấy trung bình của percentile! `avg(p99 của 5 host)` là vô nghĩa toán học. Phải gộp histogram bucket từ tất cả host *rồi* mới tính `histogram_quantile`. Đó là lý do ta lưu latency dạng histogram chứ không lưu sẵn một con số p99 mỗi host.

## 6. High cardinality — sức mạnh và cái giá

**Cardinality** = số giá trị khác nhau của một label/field.

| Field | Cardinality | Ví dụ giá trị |
|---|---|---|
| `http_method` | ~5 | GET, POST, PUT... |
| `status_code` | ~12 | 200, 404, 500... |
| `region` | ~20 | ap-southeast-1... |
| `customer_id` | **hàng triệu** | mỗi khách một id |
| `request_id` | **vô hạn** | mỗi request một id |

Cardinality cao là **bạn của observability** nhưng là **kẻ thù của metrics**.

- Trong **logs/traces**: gắn `customer_id`, `build_version`, `feature_flag` thoải mái — đó chính là thứ cho phép bạn lọc "0.3% lỗi đến từ build Android 4.2.1". Đây là điều mà metric không làm được.
- Trong **metrics (Prometheus)**: mỗi tổ hợp label là **một time series riêng** tốn RAM/đĩa. Thêm `customer_id` (1 triệu giá trị) vào một metric = 1 triệu series → **cardinality explosion**, sập Prometheus.

```promql
# AN TOÀN: cardinality thấp
http_requests_total{method="POST", route="/checkout", code="200"}

# THẢM HỌA: nhúng id vào label metric → nổ series
http_requests_total{method="POST", user_id="u_8f3a...", request_id="r_..."}
```

> ⚠️ **Bẫy:** Đừng bao giờ đặt id duy nhất (user_id, request_id, email, full URL có query param) làm **label của metric**. Những chiều cardinality cao đó thuộc về **logs và traces**, nơi chúng có thể truy vấn ad-hoc mà không nhân bản time series.

## 7. Structured logging + trace id

Log dạng text tự do (`log.info(f"User {id} bought {item}")`) không grep/filter/aggregate được ở quy mô lớn. Hãy log dạng **structured (JSON)** với các field ổn định.

```python
# TỆ: phải viết regex để tách field, không filter được
logger.info(f"checkout failed for user {uid} amount {amt} in {ms}ms")

# TỐT: structured, mọi field query được
logger.info("checkout_failed", extra={
    "user_id":   uid,
    "amount":    amt,
    "duration_ms": ms,
    "trace_id":  ctx.trace_id,   # khóa liên kết sang trace
    "build":     "android-4.2.1",
    "error":     "payment_declined",
})
```

Kết quả là một dòng JSON:

```json
{"ts":"2026-06-11T14:02:31Z","level":"error","msg":"checkout_failed",
 "user_id":"u_8f3a","amount":129.0,"duration_ms":842,
 "trace_id":"7be2f1a9c0","build":"android-4.2.1","error":"payment_declined"}
```

Giờ bạn truy vấn được: *`error="payment_declined" AND build="android-4.2.1"` nhóm theo `region`*. Quy tắc:

- **Một sự kiện = một dòng JSON.** Đừng `print` nhiều dòng cho một event.
- **`trace_id` ở mọi dòng.** Đây là cây cầu sang distributed tracing.
- **Tên field nhất quán** toàn hệ thống (`user_id` chứ không lúc `uid` lúc `userId`).
- **Log level kỷ luật:** ERROR = cần người xem; WARN = bất thường tự hồi phục; INFO = mốc nghiệp vụ; DEBUG = tắt ở prod.

> 💡 **Nguyên tắc:** Log như thể bạn sẽ phải *truy vấn* nó, không phải *đọc* nó. Câu hỏi đúng không phải "dòng này đọc có dễ hiểu không" mà "tôi có lọc/đếm/nhóm theo nó được không".

## 8. Distributed tracing

Trong kiến trúc microservice, một request người dùng đi qua 5–20 service. Trace ghép tất cả thành **một cây span** với context truyền xuyên qua các lời gọi.

```
Trace 7be2f1a9c0  (tổng 842ms)
└─ api-gateway              [ 12ms]
   └─ checkout-svc          [820ms]   ← thủ phạm nằm trong đây
      ├─ inventory-svc      [ 30ms]
      ├─ payment-svc        [780ms]   ← chặng chậm
      │  └─ db: SELECT...   [760ms]   ← gốc rễ: query chậm
      └─ email-svc (async)  [  5ms]
```

Khái niệm cốt lõi:

| Thuật ngữ | Nghĩa |
|---|---|
| **Trace** | Toàn bộ hành trình một request, định danh bởi `trace_id` |
| **Span** | Một đơn vị công việc (1 lời gọi service/DB), có start/end, parent/child |
| **Context propagation** | Truyền `trace_id` + `span_id` qua header (W3C `traceparent`) giữa các service |
| **Sampling** | Chỉ giữ lại x% trace để tiết kiệm — head-based hoặc tail-based |

**Sampling** là đánh đổi quan trọng: lưu 100% trace ở quy mô lớn rất tốn. Phổ biến là giữ 100% trace lỗi/chậm (tail-based sampling) và sample 1–10% trace bình thường. Dùng chuẩn **OpenTelemetry (OTel)** để instrument một lần, gửi đi nhiều backend (Jaeger, Tempo, X-Ray...).

> ⚠️ **Bẫy:** Quên propagate context qua biên bất đồng bộ (message queue, background job). Khi đó trace "đứt" và bạn không nối được nguyên nhân từ producer sang consumer. Luôn nhét `trace_id` vào message metadata.

## 9. Dashboard tốt

Dashboard không phải để "trông cho ngầu" mà để **rút ngắn thời gian từ alert đến giả thuyết**.

| Nguyên tắc | Cụ thể |
|---|---|
| RED ở trên cùng | Rate, Errors, Duration của service đặt ngay đầu — câu hỏi đầu tiên của on-call |
| Trả lời "có sao không?" trong 10 giây | Người mới on-call nhìn vào phải biết ngay khỏe/ốm |
| Phân tầng | Dashboard tổng quan (service) → drill-down (dependency, host) |
| Vạch ngưỡng SLO | Vẽ đường SLO trên đồ thị để thấy "còn cách giới hạn bao xa" |
| Annotation deploy | Đánh dấu mốc deploy/config-change lên trục thời gian — phần lớn sự cố theo sau một thay đổi |
| Percentile, không average | Hiển thị p50/p95/p99 chồng lên nhau |

> 💡 **Nguyên tắc:** Mỗi dashboard nên trả lời một câu hỏi cụ thể ("checkout có khỏe không?"). Dashboard 60 panel không có câu hỏi rõ ràng là nơi tín hiệu đi chết — không ai đọc nổi lúc khẩn cấp.

> ⚠️ **Bẫy:** "Wall of graphs" — 40 panel đủ màu nhưng on-call không biết cái nào quan trọng. Ít panel có chủ đích đánh bại nhiều panel vô định. Mỗi panel phải gắn với một quyết định.

## Liên hệ sang AWS

Bản đồ khái niệm trong bài sang dịch vụ AWS thực tế:

| Khái niệm trong bài | Dịch vụ AWS |
|---|---|
| Metrics + dashboard | **CloudWatch Metrics**, **CloudWatch Dashboards** |
| Custom metric cardinality | **CloudWatch Metrics** tính phí theo *số metric* (mỗi tổ hợp dimension = 1 custom metric) — cẩn thận dimension cardinality cao |
| Structured logs + truy vấn | **CloudWatch Logs** + **Logs Insights** (query field JSON), **EMF** để nhúng metric vào log |
| Distributed tracing | **AWS X-Ray** (trace, service map, segment/subsegment ≈ span), tích hợp **OpenTelemetry** qua **ADOT** |
| Liên kết trace ↔ metric ↔ log | **X-Ray trace id** + CloudWatch **ServiceLens** (gắn metric/log/trace với nhau) |
| RED/USE alert | **CloudWatch Alarms** trên metric (kèm anomaly detection) |
| Percentile | CloudWatch hỗ trợ thống kê **p99/pXX** trực tiếp trên metric (`p99`, `p95`) |
| Tình trạng nền tảng AWS | **AWS Health Dashboard** (sự kiện ảnh hưởng tài khoản bạn), khác với Service Health công khai |

Ví dụ Logs Insights truy vấn structured log (tương đương phần 7):

```sql
fields @timestamp, user_id, region, error
| filter msg = "checkout_failed" and build = "android-4.2.1"
| stats count(*) by region
| sort count desc
```

Lưu ý chi phí thực tế trên AWS: **CloudWatch Logs tính theo GB ingest + lưu trữ**, và **custom metric tính theo từng metric** — nên đặt id cardinality cao vào *log fields* (query bằng Logs Insights) thay vì biến chúng thành dimension của custom metric, đúng như nguyên tắc cardinality ở phần 6. X-Ray nên bật **sampling rule** để khống chế chi phí khi traffic lớn: giữ 100% với lỗi và một tỉ lệ nhỏ với request thành công.
