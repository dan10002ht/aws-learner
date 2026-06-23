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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Ba trụ cột observability: Metrics, Logs, Traces liên kết bằng trace_id</title>
  <desc>Ba cột song song. Metrics trả lời "Có sai không?", Logs trả lời "Chuyện gì xảy ra với request này?", Traces trả lời "Đi qua đâu, chậm ở đâu?". Cả ba được nối với nhau bằng khóa chung trace_id ở đáy.</desc>
  <text x="360" y="24" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Ba trụ cột — mỗi cột một câu hỏi</text>
  <g>
    <rect x="20" y="44" width="210" height="190" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="125" y="74" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Metrics</text>
    <text x="125" y="100" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.85">"Có sai không?</text>
    <text x="125" y="116" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.85">Bao nhiêu?"</text>
    <text x="125" y="146" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">Số tổng hợp theo</text>
    <text x="125" y="162" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">thời gian</text>
    <text x="125" y="184" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">cardinality thấp</text>
    <text x="125" y="206" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">rẻ — vài byte/điểm</text>
  </g>
  <g>
    <rect x="255" y="44" width="210" height="190" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="360" y="74" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Logs</text>
    <text x="360" y="100" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.85">"Chuyện gì xảy ra</text>
    <text x="360" y="116" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.85">với request này?"</text>
    <text x="360" y="146" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">Sự kiện rời rạc</text>
    <text x="360" y="162" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">giàu context</text>
    <text x="360" y="184" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">cardinality cao OK</text>
    <text x="360" y="206" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">đắt — full text</text>
  </g>
  <g>
    <rect x="490" y="44" width="210" height="190" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="595" y="74" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Traces</text>
    <text x="595" y="100" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.85">"Đi qua đâu,</text>
    <text x="595" y="116" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.85">chậm ở đâu?"</text>
    <text x="595" y="146" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">Cây span nối</text>
    <text x="595" y="162" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">các service</text>
    <text x="595" y="184" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">thường sample</text>
    <text x="595" y="206" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">trung bình</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.3" fill="none" stroke-dasharray="4 3">
    <path d="M125 234 v34"/>
    <path d="M360 234 v34"/>
    <path d="M595 234 v34"/>
  </g>
  <rect x="20" y="268" width="680" height="36" rx="10" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="291" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">trace_id — khóa chung liên kết xuyên suốt cả ba trụ cột</text>
</svg>

| Trụ cột | Trả lời | Đặc tính | Chi phí lưu trữ |
|---|---|---|---|
| **Metrics** | "Có sai không? Bao nhiêu?" | Số đã tổng hợp theo thời gian, cardinality thấp | Rẻ (vài byte/điểm) |
| **Logs** | "Chuyện gì đã xảy ra với *request này*?" | Sự kiện rời rạc, giàu context | Đắt (full text) |
| **Traces** | "Request đi qua những đâu, chậm ở chặng nào?" | Cây span nối các service | Trung bình (thường sample) |

### Cách phối hợp thực chiến

Luồng điều tra điển hình:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 230" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Luồng điều tra: Metric phát hiện bất thường, Trace khoanh vùng span chậm, Log chỉ ra nguyên nhân</title>
  <desc>Ba bước nối bằng mũi tên trái sang phải: Metric phát hiện p99 tăng vọt, Trace khoanh vùng span gọi DB chậm, Log chỉ ra slow query. Tất cả liên kết bằng trace_id xuyên suốt.</desc>
  <defs>
    <marker id="arrFlow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="360" y="24" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Luồng điều tra một sự cố</text>
  <g>
    <rect x="14" y="50" width="200" height="110" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="114" y="76" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">1. Metric</text>
    <text x="114" y="98" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.78">phát hiện bất thường</text>
    <text x="114" y="124" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">p99 latency tăng vọt</text>
    <text x="114" y="140" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">lúc 14:02</text>
  </g>
  <g>
    <rect x="260" y="50" width="200" height="110" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="360" y="76" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">2. Trace</text>
    <text x="360" y="98" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.78">khoanh vùng span chậm</text>
    <text x="360" y="124" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">90% thời gian nằm ở</text>
    <text x="360" y="140" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">span gọi DB</text>
  </g>
  <g>
    <rect x="506" y="50" width="200" height="110" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="606" y="76" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">3. Log</text>
    <text x="606" y="98" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.78">chi tiết nguyên nhân</text>
    <text x="606" y="124" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">"slow query: SELECT</text>
    <text x="606" y="140" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">WHERE status IN (...)"</text>
  </g>
  <g stroke="currentColor" stroke-width="2" marker-end="url(#arrFlow)">
    <line x1="216" y1="105" x2="256" y2="105"/>
    <line x1="462" y1="105" x2="502" y2="105"/>
  </g>
  <line x1="14" y1="190" x2="706" y2="190" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 3"/>
  <rect x="250" y="178" width="220" height="26" rx="13" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="195" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">trace_id nối ba bước xuyên suốt</text>
  <g stroke="currentColor" stroke-opacity="0.3" fill="none" stroke-dasharray="3 3">
    <path d="M114 160 v18 h136"/>
    <path d="M606 160 v18 h-136"/>
  </g>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Đánh đổi cardinality: cao là bạn của logs/traces nhưng là kẻ thù của metrics</title>
  <desc>Hai phía đối lập. Bên an toàn: gắn customer_id vào logs và traces cho phép lọc ad-hoc, label metric vẫn cardinality thấp. Bên thảm họa: nhúng id vào label metric, mỗi tổ hợp label thành một time series riêng khiến số series nổ tung và sập Prometheus.</desc>
  <text x="360" y="24" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Cardinality cao — cùng một thứ, hai số phận</text>
  <g>
    <rect x="16" y="44" width="334" height="236" rx="12" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="183" y="72" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">AN TOÀN — bạn của logs/traces</text>
    <text x="183" y="96" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.7">id cardinality cao → vào logs/traces</text>
    <rect x="40" y="112" width="286" height="44" rx="7" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="56" y="131" font-size="10.5" fill="currentColor" opacity="0.78">log: customer_id, build, feature_flag</text>
    <text x="56" y="148" font-size="10.5" fill="currentColor" opacity="0.78">trace: gắn thoải mái — lọc ad-hoc</text>
    <text x="183" y="182" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">label metric vẫn cardinality thấp:</text>
    <rect x="40" y="194" width="286" height="26" rx="7" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="183" y="211" font-size="10.5" text-anchor="middle" fill="currentColor">method, route, code → ít series</text>
    <text x="183" y="248" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">→ lọc "0.3% lỗi từ build Android"</text>
    <text x="183" y="268" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">+ Prometheus khỏe</text>
  </g>
  <g>
    <rect x="370" y="44" width="334" height="236" rx="12" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="537" y="72" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">THẢM HỌA — kẻ thù của metrics</text>
    <text x="537" y="96" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.7">id nhúng vào label của metric</text>
    <rect x="394" y="112" width="286" height="44" rx="7" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="410" y="131" font-size="10.5" fill="currentColor" opacity="0.78">http_requests_total{user_id="...",</text>
    <text x="410" y="148" font-size="10.5" fill="currentColor" opacity="0.78">request_id="..."}</text>
    <text x="537" y="182" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">mỗi tổ hợp label = 1 time series:</text>
    <g>
      <rect x="408" y="192" width="10" height="30" rx="2" fill="#f59e0b" fill-opacity="0.8"/>
      <rect x="424" y="192" width="10" height="30" rx="2" fill="#f59e0b" fill-opacity="0.8"/>
      <rect x="440" y="192" width="10" height="30" rx="2" fill="#f59e0b" fill-opacity="0.8"/>
      <rect x="456" y="192" width="10" height="30" rx="2" fill="#f59e0b" fill-opacity="0.8"/>
      <rect x="472" y="192" width="10" height="30" rx="2" fill="#f59e0b" fill-opacity="0.8"/>
      <rect x="488" y="192" width="10" height="30" rx="2" fill="#f59e0b" fill-opacity="0.8"/>
      <rect x="504" y="192" width="10" height="30" rx="2" fill="#f59e0b" fill-opacity="0.8"/>
      <text x="600" y="212" font-size="13" font-weight="700" fill="currentColor">1 triệu series</text>
    </g>
    <text x="537" y="248" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">→ cardinality explosion</text>
    <text x="537" y="268" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">sập Prometheus</text>
  </g>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 290" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cây span distributed tracing kiểu Gantt: payment-svc và DB là thủ phạm</title>
  <desc>Trace 7be2f1a9c0 tổng 842ms. Span api-gateway 12ms, checkout-svc 820ms bọc inventory-svc 30ms, payment-svc 780ms chứa db SELECT 760ms (chặng dài nhất, thủ phạm), và email-svc async 5ms. Độ dài thanh tỉ lệ với thời gian.</desc>
  <text x="16" y="22" font-size="14" font-weight="700" fill="currentColor">Trace 7be2f1a9c0 — tổng 842ms</text>
  <g font-size="11" fill="currentColor" opacity="0.5">
    <text x="190" y="46">0ms</text>
    <text x="690" y="46" text-anchor="end">842ms</text>
  </g>
  <line x1="190" y1="52" x2="690" y2="52" stroke="currentColor" stroke-opacity="0.25"/>
  <g font-size="11.5">
    <text x="16" y="74" fill="currentColor">api-gateway</text>
    <rect x="190" y="64" width="7" height="14" rx="3" fill="#3b82f6" fill-opacity="0.85"/>
    <text x="205" y="74" font-size="10.5" fill="currentColor" opacity="0.6">12ms</text>
  </g>
  <g font-size="11.5">
    <text x="28" y="100" fill="currentColor">checkout-svc</text>
    <rect x="197" y="90" width="487" height="14" rx="3" fill="#3b82f6" fill-opacity="0.55"/>
    <text x="688" y="100" font-size="10.5" text-anchor="end" fill="#fff">820ms</text>
  </g>
  <g font-size="11.5">
    <text x="40" y="126" fill="currentColor">inventory-svc</text>
    <rect x="201" y="116" width="18" height="14" rx="3" fill="#10b981" fill-opacity="0.85"/>
    <text x="227" y="126" font-size="10.5" fill="currentColor" opacity="0.6">30ms</text>
  </g>
  <g font-size="11.5">
    <text x="40" y="152" font-weight="700" fill="currentColor">payment-svc</text>
    <rect x="225" y="142" width="463" height="14" rx="3" fill="#f59e0b" fill-opacity="0.55"/>
    <text x="684" y="152" font-size="10.5" text-anchor="end" fill="#fff">780ms — chặng chậm</text>
  </g>
  <g font-size="11.5">
    <text x="52" y="178" font-weight="700" fill="currentColor">db: SELECT...</text>
    <rect x="237" y="168" width="451" height="14" rx="3" fill="#f59e0b" fill-opacity="0.9"/>
    <text x="684" y="178" font-size="10.5" text-anchor="end" fill="#fff">760ms — gốc rễ</text>
  </g>
  <g font-size="11.5">
    <text x="40" y="204" fill="currentColor">email-svc (async)</text>
    <rect x="201" y="194" width="5" height="14" rx="2" fill="#8b5cf6" fill-opacity="0.85"/>
    <text x="214" y="204" font-size="10.5" fill="currentColor" opacity="0.6">5ms</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.3" fill="none">
    <path d="M22 78 v18 h4"/>
    <path d="M34 104 v14 h4"/>
    <path d="M34 104 v36 h4"/>
    <path d="M34 104 v92 h4"/>
    <path d="M46 156 v14 h4"/>
  </g>
  <g>
    <path d="M236 220 q160 26 320 0" fill="none" stroke="#f59e0b" stroke-opacity="0.7" stroke-width="1.5"/>
    <text x="396" y="252" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">payment-svc → db chiếm gần trọn 842ms — thủ phạm</text>
    <text x="396" y="272" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.6">độ dài thanh tỉ lệ với thời gian span</text>
  </g>
</svg>

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
