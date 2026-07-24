# Ba trụ cột Observability & OpenTelemetry

Khi production kêu lúc 2 giờ sáng, thứ cứu bạn không phải là một dashboard đẹp — mà là khả năng **đi từ "có gì đó sai" đến "sai ở dòng code nào, service nào, vì input nào" chỉ bằng dữ liệu đã có sẵn**. Ba loại tín hiệu — Metrics, Logs, Traces — mỗi loại trả lời một câu hỏi khác nhau và bù đắp điểm mù cho nhau. Bài này mổ xẻ bản chất, điểm mạnh/yếu, chi phí thực của từng trụ cột, rồi đi vào **OpenTelemetry** — chuẩn mở đang thống nhất cả ba để bạn không bị khoá vào một vendor.

> 💡 Nguyên tắc: Ba trụ cột không phải ba sản phẩm bạn mua rời, mà là **ba góc nhìn vào cùng một sự kiện**. Sức mạnh thật nằm ở chỗ nối chúng lại: từ một điểm nhọn trên biểu đồ metric, nhảy sang trace của đúng request chậm đó, rồi mở log của đúng span bị lỗi. Correlation mới là đích, không phải từng trụ cột riêng lẻ.

## Mục tiêu

- Phân biệt rạch ròi Metrics / Logs / Traces: mỗi loại trả lời câu hỏi gì, mạnh/yếu ở đâu, tốn kém thế nào, khi nào dùng.
- Hiểu chính xác observability khác monitoring ra sao — và vì sao "unknown-unknown" là lằn ranh.
- Nắm kiến trúc OpenTelemetry: API/SDK, auto vs manual instrumentation, Collector, giao thức OTLP, và giá trị vendor-neutral.
- Viết được code instrument một service (trace + metric) và cấu hình Collector chạy được.

## 1. Ba trụ cột — mỗi cái một câu hỏi

Mỗi trụ cột sinh ra để trả lời một câu hỏi mà hai cái kia trả lời tệ:

| Trụ cột | Câu hỏi cốt lõi | Bản chất dữ liệu | Chi phí lưu/query |
|---|---|---|---|
| **Metrics** | "Có vấn đề không? Xu hướng ra sao?" | Số đo tổng hợp theo thời gian (counter, gauge, histogram) | Rẻ nhất — dữ liệu đã aggregate, dung lượng cố định theo số chuỗi |
| **Logs** | "Chuyện gì đã xảy ra ở thời điểm đó?" | Sự kiện rời rạc, giàu ngữ cảnh, thường dạng text/JSON | Đắt — khối lượng lớn, index tốn kém |
| **Traces** | "Chậm/lỗi ở đâu trong chuỗi service?" | Cây các span nối theo một request đi xuyên hệ thống | Trung bình–cao — thường phải sample |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" aria-labelledby="p3-title p3-desc" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title id="p3-title">Ba trụ cột observability và câu hỏi mỗi trụ cột trả lời</title>
  <desc id="p3-desc">Metrics trả lời có vấn đề không với dữ liệu tổng hợp rẻ dùng để cảnh báo; Logs trả lời chuyện gì xảy ra với sự kiện chi tiết; Traces trả lời chậm hoặc lỗi ở đâu bằng đường đi của một request qua nhiều service. Cả ba nối với nhau qua trace_id và exemplar.</desc>
  <text x="360" y="26" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">Cùng một sự cố — ba góc nhìn</text>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <rect x="24" y="48" width="210" height="210" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="129" y="72" text-anchor="middle" stroke="none" font-weight="700" font-size="13">METRICS</text>
    <text x="129" y="92" text-anchor="middle" stroke="none" font-size="10.5" opacity="0.75">"Có vấn đề không?"</text>
    <text x="129" y="220" text-anchor="middle" stroke="none" font-size="10" opacity="0.7">rẻ · aggregate · cảnh báo</text>
    <text x="129" y="236" text-anchor="middle" stroke="none" font-size="10" opacity="0.7">error_rate, p99, RPS</text>
    <polyline points="40,180 68,168 96,176 124,120 152,150 180,110 208,132" fill="none" stroke="currentColor" stroke-opacity="0.75" stroke-width="1.6"/>
    <circle cx="124" cy="120" r="4" fill="#f43f5e" fill-opacity="0.9" stroke="none"/>
  </g>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <rect x="255" y="48" width="210" height="210" rx="10" fill="#10b981" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="360" y="72" text-anchor="middle" stroke="none" font-weight="700" font-size="13">LOGS</text>
    <text x="360" y="92" text-anchor="middle" stroke="none" font-size="10.5" opacity="0.75">"Chuyện gì xảy ra?"</text>
    <rect x="270" y="108" width="180" height="18" rx="3" fill="currentColor" fill-opacity="0.06" stroke="none"/>
    <rect x="270" y="130" width="180" height="18" rx="3" fill="currentColor" fill-opacity="0.06" stroke="none"/>
    <rect x="270" y="152" width="180" height="18" rx="3" fill="#f43f5e" fill-opacity="0.16" stroke="none"/>
    <rect x="270" y="174" width="180" height="18" rx="3" fill="currentColor" fill-opacity="0.06" stroke="none"/>
    <text x="278" y="121" stroke="none" font-size="9.5" opacity="0.7">14:02:11 INFO order created</text>
    <text x="278" y="143" stroke="none" font-size="9.5" opacity="0.7">14:02:11 WARN retry payment</text>
    <text x="278" y="165" stroke="none" font-size="9.5">14:02:12 ERROR timeout gw-3</text>
    <text x="278" y="187" stroke="none" font-size="9.5" opacity="0.7">14:02:12 INFO fallback used</text>
    <text x="360" y="220" text-anchor="middle" stroke="none" font-size="10" opacity="0.7">chi tiết · nhiều · đắt index</text>
    <text x="360" y="236" text-anchor="middle" stroke="none" font-size="10" opacity="0.7">structured JSON + trace_id</text>
  </g>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <rect x="486" y="48" width="210" height="210" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="591" y="72" text-anchor="middle" stroke="none" font-weight="700" font-size="13">TRACES</text>
    <text x="591" y="92" text-anchor="middle" stroke="none" font-size="10.5" opacity="0.75">"Chậm/lỗi ở đâu?"</text>
    <rect x="502" y="110" width="176" height="16" rx="3" fill="#8b5cf6" fill-opacity="0.28" stroke="none"/>
    <text x="508" y="122" stroke="none" font-size="9">api-gateway  120ms</text>
    <rect x="516" y="130" width="130" height="16" rx="3" fill="#8b5cf6" fill-opacity="0.24" stroke="none"/>
    <text x="522" y="142" stroke="none" font-size="9">order-svc  95ms</text>
    <rect x="530" y="150" width="120" height="16" rx="3" fill="#f43f5e" fill-opacity="0.28" stroke="none"/>
    <text x="536" y="162" stroke="none" font-size="9">payment  88ms (slow)</text>
    <rect x="544" y="170" width="40" height="16" rx="3" fill="#8b5cf6" fill-opacity="0.24" stroke="none"/>
    <text x="550" y="182" stroke="none" font-size="9">db 20ms</text>
    <text x="591" y="220" text-anchor="middle" stroke="none" font-size="10" opacity="0.7">đường đi 1 request</text>
    <text x="591" y="236" text-anchor="middle" stroke="none" font-size="10" opacity="0.7">span cha–con · sample</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <line x1="234" y1="290" x2="486" y2="290" stroke-dasharray="4 4"/>
  </g>
  <text x="360" y="286" text-anchor="middle" font-size="10.5" fill="currentColor" opacity="0.8" font-weight="700">nối bằng trace_id / exemplar</text>
  <text x="360" y="318" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.75">Metric cảnh báo → nhảy vào Trace của request chậm → mở Log của span lỗi</text>
</svg>

### 1.1 Metrics — rẻ, tổng hợp, để cảnh báo

Metric là **một con số đo lặp lại theo thời gian**, đã được aggregate trước khi lưu. Chi phí lưu trữ gần như **không phụ thuộc vào lưu lượng request** — 1 triệu hay 1 tỷ request cùng đổ vào một histogram thì dung lượng như nhau; cái quyết định chi phí là **số chuỗi (time series) = tích các label**.

Ba kiểu cơ bản (theo mô hình Prometheus/OTel):

- **Counter** — chỉ tăng: `http_requests_total`, `errors_total`. Query lấy *rate* (`rate()` trên counter) mới có nghĩa.
- **Gauge** — lên xuống tự do: `queue_depth`, `memory_bytes`, `active_connections`.
- **Histogram** — phân phối theo bucket: `http_request_duration_seconds`. Từ đây tính được p50/p95/p99 — thứ metric quan trọng nhất cho latency.

Điểm mạnh: rẻ, query nhanh, giữ được lâu (downsample nhiều năm), lý tưởng để đặt **alert** và vẽ **trend**. Điểm yếu chí mạng: **cardinality**. Đừng bao giờ đặt `user_id`, `request_id`, `email` làm label — mỗi giá trị unique tạo một time series mới; vài triệu user = vài triệu series = nổ bộ nhớ TSDB. Đó cũng là lý do metric **không trả lời được "request nào"** — nó đã vứt bỏ danh tính từng sự kiện để đổi lấy sự rẻ.

### 1.2 Logs — chi tiết, giàu ngữ cảnh, đắt

Log là **bản ghi rời rạc của một sự kiện** với ngữ cảnh tuỳ ý. Đây là nơi bạn đọc được câu chuyện: input gì, rẽ nhánh nào, exception stack ra sao. Quy tắc production số một: **structured logging** (JSON), không phải chuỗi text tự do.

```json
{"ts":"2026-07-24T14:02:12Z","level":"ERROR","service":"payment",
 "msg":"gateway timeout","provider":"stripe","attempt":3,
 "order_id":"o_88213","trace_id":"4bf92f3577b34da6a3ce929d0e0e4736","duration_ms":88}
```

Có `trace_id` trong log là mấu chốt để **nối log ↔ trace**. Điểm mạnh: chi tiết vô hạn, giữ nguyên danh tính từng sự kiện — trả lời được "chuyện gì xảy ra với đơn o_88213". Điểm yếu: **đắt và ồn**. Volume tỷ lệ thuận với traffic, index full-text tốn kém, và log không cấu trúc gần như vô dụng khi query ở quy mô lớn. Vì thế production thường **sample debug/info log**, giữ đủ error/warn, và đẩy phần đông vào cold storage rẻ (S3) thay vì index nóng.

### 1.3 Traces — đường đi một request qua nhiều service

Trace theo dấu **một request duy nhất** khi nó đi xuyên qua nhiều service. Mỗi đơn vị công việc là một **span** (có tên, thời điểm bắt đầu/kết thúc, attributes, status); các span nối cha–con thành một cây, chung một `trace_id`.

Cơ chế lan truyền (**context propagation**): service đầu tiên tạo `trace_id` + `span_id`, nhét vào HTTP header chuẩn W3C `traceparent`, mỗi service kế tiếp đọc header đó làm parent rồi tạo span con. Nhờ vậy bạn ghép được toàn bộ hành trình dù đi qua 12 service.

```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
             │  └ trace_id (16 byte)                └ parent span_id  └ flags (01 = sampled)
             └ version
```

Điểm mạnh: chỉ ra **chính xác service/span nào ngốn thời gian** hoặc phát lỗi trong một chuỗi phân tán — thứ metric và log đơn lẻ không thấy được. Điểm yếu: **volume khổng lồ** nếu trace 100% → bắt buộc **sampling** (xem §4), và tự nó ít giá trị khi không kèm attribute đủ giàu hoặc không nối được với log.

> ⚠️ Bẫy thường gặp: coi ba trụ cột là ba silo tách biệt (ba tool, ba team, ba ngân sách) rồi lúc sự cố phải copy timestamp thủ công qua lại. Giá trị thật đến khi **exemplar** gắn `trace_id` vào bucket histogram (từ điểm p99 nhảy thẳng vào trace mẫu), và mọi log đều mang `trace_id`. Thiết kế để **nối**, đừng để rời.

## 2. Chọn trụ cột nào — quy trình điều tra thực tế

Trình tự điều tra kinh điển đi từ rẻ đến đắt, từ tổng quát đến chi tiết:

1. **Metric** phát hiện & cảnh báo: `error_rate` vượt SLO, `p99` latency tăng gấp đôi → *biết có vấn đề, biết khi nào bắt đầu*.
2. **Trace** khoanh vùng: mở vài trace của request chậm/lỗi trong khung giờ đó → *thấy payment-service span đỏ, tốn 88ms và trả lỗi*.
3. **Log** tìm nguyên nhân gốc: lọc log theo `trace_id` của đúng request đó → *đọc được "gateway timeout, provider stripe, attempt 3"*.

Ba bước, ba trụ cột, một mạch liền. Ai bỏ qua bước nối (không có `trace_id` xuyên suốt) sẽ kẹt ở "biết chậm nhưng không biết vì sao".

## 3. Observability vs Monitoring — known vs unknown-unknown

Hai khái niệm bổ sung nhau, không thay thế:

| | Monitoring | Observability |
|---|---|---|
| Trả lời | Câu hỏi bạn **đã biết trước** ("CPU > 80%?") | Câu hỏi bạn **chưa từng nghĩ tới** lúc sự cố |
| Dựa vào | Metric/threshold định nghĩa sẵn | Dữ liệu giàu chiều, query tự do lúc điều tra |
| Bài toán | **Known-unknown** (biết cái cần đo) | **Unknown-unknown** (chưa biết sẽ cần hỏi gì) |
| Khi hệ thống fail lạ | Dashboard xanh nhưng vẫn không hiểu vì sao | Suy ra nguyên nhân từ output, không cần deploy thêm |

Định nghĩa vận hành sắc bén nhất: **nếu để debug một sự cố mới bạn phải thêm log rồi deploy lại chờ tái hiện — hệ thống của bạn chưa observable.** Observable nghĩa là bạn có thể đặt câu hỏi *mới* trên dữ liệu *cũ*: "chỉ 0.3% request, từ app Android build 4.2.1, qua provider X, ở region ap-southeast-1 timeout" — tổ hợp chiều đó không ai dựng dashboard trước, nhưng nếu trace/log đủ giàu attribute (high cardinality!) thì bạn lọc ra được. Chính vì cần cardinality cao mà observability dựa nhiều vào trace/log giàu thuộc tính, còn monitoring dựa vào metric ít label.

> 💡 Ghi nhớ: Monitoring nói "có gì đó cháy". Observability trả lời "cháy ở đâu, vì sao, ảnh hưởng ai" mà không cần chạy về lấy thêm cảm biến. Bạn cần cả hai: alert từ monitoring gọi bạn dậy, observability giúp bạn tắt lửa.

## 4. OpenTelemetry — chuẩn mở thống nhất ba trụ cột

Trước OTel, mỗi vendor một agent, một SDK, một format riêng: đổi từ Datadog sang khác nghĩa là **re-instrument toàn bộ codebase** — lock-in điển hình. **OpenTelemetry (OTel)** là dự án CNCF (đứng thứ hai về hoạt động chỉ sau Kubernetes) đưa ra **một chuẩn duy nhất** cho cả traces, metrics, logs: bạn instrument một lần, xuất đi đâu tùy chọn.

Các thành phần:

- **API** — interface trung lập ngôn ngữ để tạo span/metric trong code ứng dụng. Code chỉ phụ thuộc API; nếu không cấu hình SDK thì các lời gọi thành no-op (an toàn cho thư viện).
- **SDK** — bản triển khai thực của API: quản lý sampling, batching, và **exporter** đẩy dữ liệu ra ngoài.
- **Instrumentation**:
  - *Auto-instrumentation*: agent/thư viện tự chèn tracing vào framework phổ biến (HTTP server, gRPC, DB driver, Kafka client) — **không sửa code**. Java/Node/Python có agent gắn qua `-javaagent` hoặc biến môi trường.
  - *Manual instrumentation*: bạn tự tạo span cho logic nghiệp vụ và thêm attribute có ý nghĩa domain — nơi giá trị thật của observability nằm.
- **Collector** — một binary độc lập **nhận → xử lý → xuất** telemetry, đứng giữa app và backend.
- **OTLP** (OpenTelemetry Protocol) — giao thức chuẩn (gRPC hoặc HTTP/protobuf) mà SDK và Collector nói chuyện.
- **Semantic Conventions** — quy ước đặt tên attribute thống nhất (`http.request.method`, `db.system`, `service.name`) để dashboard/quy tắc dùng lại được giữa các hệ.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" aria-labelledby="otel-title otel-desc" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title id="otel-title">Luồng dữ liệu OpenTelemetry từ ứng dụng qua Collector tới các backend</title>
  <desc id="otel-desc">Ứng dụng được instrument bằng OTel API và SDK phát traces, metrics, logs qua giao thức OTLP tới Collector. Collector gồm ba tầng receiver nhận, processor xử lý như batch và sampling và thêm thuộc tính, exporter xuất tới nhiều backend vendor-neutral như Prometheus, Jaeger hoặc Tempo, và Loki. Nhờ Collector đứng giữa nên đổi backend không phải sửa lại code.</desc>
  <defs>
    <marker id="oah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <rect x="20" y="120" width="150" height="150" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="95" y="142" text-anchor="middle" stroke="none" font-weight="700">Ứng dụng</text>
    <rect x="34" y="152" width="122" height="30" rx="6" fill="#3b82f6" fill-opacity="0.16" stroke-opacity="0.18"/>
    <text x="95" y="171" text-anchor="middle" stroke="none" font-size="10">OTel API (tạo span)</text>
    <rect x="34" y="188" width="122" height="30" rx="6" fill="#3b82f6" fill-opacity="0.16" stroke-opacity="0.18"/>
    <text x="95" y="207" text-anchor="middle" stroke="none" font-size="10">SDK + exporter</text>
    <rect x="34" y="224" width="122" height="34" rx="6" fill="currentColor" fill-opacity="0.05" stroke-opacity="0.15"/>
    <text x="95" y="239" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.8">auto + manual</text>
    <text x="95" y="252" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.8">instrumentation</text>
  </g>
  <g font-size="10" fill="currentColor" stroke="currentColor">
    <line x1="170" y1="195" x2="252" y2="195" stroke-opacity="0.6" marker-end="url(#oah)"/>
    <text x="211" y="187" text-anchor="middle" stroke="none" font-weight="700" font-size="10.5">OTLP</text>
    <text x="211" y="210" text-anchor="middle" stroke="none" font-size="9" opacity="0.7">gRPC / HTTP</text>
  </g>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <rect x="254" y="70" width="196" height="250" rx="10" fill="#14b8a6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="352" y="92" text-anchor="middle" stroke="none" font-weight="700">OTel Collector</text>
    <rect x="270" y="108" width="164" height="56" rx="7" fill="#14b8a6" fill-opacity="0.18" stroke-opacity="0.18"/>
    <text x="352" y="130" text-anchor="middle" stroke="none" font-size="10.5" font-weight="700">Receiver</text>
    <text x="352" y="147" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.75">nhận OTLP / Prometheus</text>
    <rect x="270" y="170" width="164" height="70" rx="7" fill="#f59e0b" fill-opacity="0.15" stroke-opacity="0.18"/>
    <text x="352" y="192" text-anchor="middle" stroke="none" font-size="10.5" font-weight="700">Processor</text>
    <text x="352" y="209" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.75">batch · sampling</text>
    <text x="352" y="223" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.75">thêm attribute · lọc PII</text>
    <rect x="270" y="246" width="164" height="56" rx="7" fill="#8b5cf6" fill-opacity="0.16" stroke-opacity="0.18"/>
    <text x="352" y="268" text-anchor="middle" stroke="none" font-size="10.5" font-weight="700">Exporter</text>
    <text x="352" y="285" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.75">xuất đi nhiều backend</text>
    <line x1="352" y1="164" x2="352" y2="168" stroke-opacity="0.5"/>
    <line x1="352" y1="240" x2="352" y2="244" stroke-opacity="0.5"/>
  </g>
  <g font-size="10.5" fill="currentColor" stroke="currentColor">
    <line x1="450" y1="150" x2="524" y2="120" stroke-opacity="0.6" marker-end="url(#oah)"/>
    <line x1="450" y1="195" x2="524" y2="195" stroke-opacity="0.6" marker-end="url(#oah)"/>
    <line x1="450" y1="240" x2="524" y2="270" stroke-opacity="0.6" marker-end="url(#oah)"/>
    <rect x="526" y="100" width="170" height="40" rx="8" fill="#10b981" fill-opacity="0.15" stroke-opacity="0.2"/>
    <text x="611" y="118" text-anchor="middle" stroke="none" font-size="10.5">Prometheus / Mimir</text>
    <text x="611" y="132" text-anchor="middle" stroke="none" font-size="9" opacity="0.7">metrics</text>
    <rect x="526" y="175" width="170" height="40" rx="8" fill="#10b981" fill-opacity="0.15" stroke-opacity="0.2"/>
    <text x="611" y="193" text-anchor="middle" stroke="none" font-size="10.5">Jaeger / Tempo</text>
    <text x="611" y="207" text-anchor="middle" stroke="none" font-size="9" opacity="0.7">traces</text>
    <rect x="526" y="250" width="170" height="40" rx="8" fill="#10b981" fill-opacity="0.15" stroke-opacity="0.2"/>
    <text x="611" y="268" text-anchor="middle" stroke="none" font-size="10.5">Loki / OpenSearch</text>
    <text x="611" y="282" text-anchor="middle" stroke="none" font-size="9" opacity="0.7">logs</text>
  </g>
  <text x="360" y="352" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.8" font-weight="700">Collector đứng giữa: đổi backend chỉ sửa config, KHÔNG đụng code app</text>
</svg>

### 4.1 Vì sao có Collector — đừng cho app nói thẳng với backend

Về lý thuyết SDK có thể export thẳng lên vendor. Nhưng đặt **Collector** ở giữa cho bạn:

- **Vendor-neutral thật sự**: đổi Datadog → Grafana chỉ sửa exporter trong config Collector, app không đổi một dòng, không redeploy.
- **Gỡ gánh nặng khỏi app**: batching, retry, nén, sampling nằm ở Collector — process app nhẹ đi, chết Collector không kéo theo app.
- **Xử lý tập trung**: **lọc PII** (bỏ attribute chứa email/thẻ), thêm resource attribute (`k8s.pod.name`, `region`), tail-based sampling (giữ 100% trace lỗi/chậm, bỏ phần lớn trace bình thường) — làm một chỗ cho mọi service.
- **Nhận đa nguồn**: Collector cũng scrape được Prometheus, nhận Jaeger/Zipkin cũ → cầu nối khi di cư dần.

Hai kiểu triển khai: **agent** (một Collector mỗi node/pod, thường DaemonSet) gom gần app; và **gateway** (một cụm Collector trung tâm) để tail-sampling và xuất tập trung. Production lớn thường chạy cả hai tầng: agent → gateway → backend.

## 5. Code: instrument một service bằng OTel

Ví dụ Python — kết hợp **auto** (HTTP framework) và **manual** (span nghiệp vụ + counter):

```python
# pip install opentelemetry-distro opentelemetry-exporter-otlp \
#     opentelemetry-instrumentation-flask opentelemetry-instrumentation-requests
from opentelemetry import trace, metrics
from opentelemetry.sdk.resources import Resource

# service.name là attribute quan trọng nhất — mọi backend group theo nó
resource = Resource.create({"service.name": "order-service", "service.version": "1.4.2"})

tracer = trace.get_tracer(__name__)                 # dùng API, SDK cấu hình qua env/distro
order_counter = metrics.get_meter(__name__).create_counter(
    "orders.created", unit="1", description="Số order tạo thành công")

def create_order(user_id: str, items: list) -> str:
    # manual span cho logic nghiệp vụ — auto-instrumentation không biết "đặt hàng" là gì
    with tracer.start_as_current_span("create_order") as span:
        span.set_attribute("order.item_count", len(items))
        span.set_attribute("user.id", user_id)      # OK trên trace (cardinality cao chấp nhận được)
        try:
            charge_payment(user_id, total(items))    # span con tự nối qua context hiện hành
            order_id = persist_order(user_id, items)
            span.set_attribute("order.id", order_id)
            order_counter.add(1, {"channel": "web"}) # label channel cardinality THẤP — an toàn cho metric
            return order_id
        except PaymentError as e:
            span.set_status(trace.StatusCode.ERROR, str(e))
            span.record_exception(e)                  # gắn stack vào span → hiện trong trace UI
            raise
```

Chạy với auto-instrumentation, không cần sửa framework code:

```bash
# opentelemetry-instrument tự bọc Flask + requests, tự propagate traceparent, tự export OTLP
export OTEL_SERVICE_NAME=order-service
export OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317   # gRPC OTLP tới Collector
export OTEL_TRACES_SAMPLER=parentbased_traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.1                              # head-sampling 10%
opentelemetry-instrument python app.py
```

Điểm mấu chốt: code nghiệp vụ chỉ gọi **API** (`get_tracer`, `start_as_current_span`), còn *export đi đâu, sample bao nhiêu* là chuyện của SDK cấu hình bằng biến môi trường — đúng tinh thần tách bạch để không lock-in.

### 5.1 Cấu hình Collector

```yaml
# otel-collector-config.yaml — nhận OTLP, batch + sample, xuất đa backend
receivers:
  otlp:
    protocols:
      grpc: { endpoint: 0.0.0.0:4317 }   # SDK app đẩy vào đây
      http: { endpoint: 0.0.0.0:4318 }

processors:
  batch: {}                              # gom lô để giảm số call ra backend
  resourcedetection:                     # tự gắn k8s.pod.name, cloud.region...
    detectors: [env, system]
  attributes/scrub:                      # xoá PII trước khi rời hệ thống
    actions:
      - key: user.email
        action: delete

exporters:
  otlphttp/tempo:                        # traces -> Tempo
    endpoint: http://tempo:4318
  prometheusremotewrite:                 # metrics -> Prometheus/Mimir
    endpoint: http://mimir:9009/api/v1/push
  otlphttp/loki:                         # logs -> Loki
    endpoint: http://loki:3100/otlp

service:
  pipelines:                             # mỗi tín hiệu một pipeline receiver->processor->exporter
    traces:
      receivers: [otlp]
      processors: [resourcedetection, attributes/scrub, batch]
      exporters: [otlphttp/tempo]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheusremotewrite]
    logs:
      receivers: [otlp]
      processors: [attributes/scrub, batch]
      exporters: [otlphttp/loki]
```

Muốn đổi từ Tempo sang Datadog? Thêm một exporter và sửa dòng `exporters:` của pipeline traces — **không đụng tới bất kỳ service nào**. Đó chính là giá trị vendor-neutral bằng tiền thật.

## 6. Sampling — cái giá của trace ở quy mô lớn

Trace 100% ở quy mô cao là bất khả thi về chi phí. Hai chiến lược:

| | Head-based sampling | Tail-based sampling |
|---|---|---|
| Quyết định ở | Đầu request (ngay khi tạo trace) | Sau khi trace hoàn tất (ở Collector gateway) |
| Ưu | Rẻ, đơn giản, không giữ trace trong RAM | **Giữ được đúng trace lỗi/chậm** dù hiếm |
| Nhược | Có thể vứt mất trace lỗi hiếm | Tốn RAM/CPU (phải buffer toàn trace), phức tạp |
| Dùng khi | Traffic đồng đều, chi phí là ưu tiên | Cần bắt anomaly, debug lỗi hiếm |

Thực tế nhiều team dùng **tail-based ở gateway Collector**: giữ 100% trace có lỗi hoặc latency vượt ngưỡng, sample 1–5% trace "bình thường". Nhờ vậy khi điều tra, trace của đúng request hỏng gần như luôn còn.

> ⚠️ Bẫy production: sampling phải **nhất quán theo cả trace** — nếu service A giữ span nhưng service B (do config lệch) drop, bạn có trace gãy, còn tệ hơn không có. Dùng `parentbased_*` sampler để service con tôn trọng quyết định sampled của cha (đọc từ flag `01` trong `traceparent`), đừng để mỗi service tự quyết độc lập.

## Tóm tắt

- **Metrics** (rẻ, tổng hợp) trả lời *"có vấn đề không"* và là nền của alert — cẩn thận cardinality, đừng nhét id vào label.
- **Logs** (chi tiết, đắt) trả lời *"chuyện gì xảy ra"* — structured JSON + `trace_id`, sample cái ồn ào.
- **Traces** (đường đi phân tán) trả lời *"chậm/lỗi ở đâu"* — dựa vào context propagation (`traceparent`), cần sampling ở quy mô lớn.
- Sức mạnh thật = **nối ba trụ cột** qua `trace_id`/exemplar, không dùng rời.
- **Observability ≠ monitoring**: monitoring theo dõi known-metric đã biết; observability điều tra unknown-unknown từ output giàu chiều mà không cần deploy thêm.
- **OpenTelemetry** = chuẩn mở thống nhất: API/SDK, auto + manual instrumentation, **Collector** (nhận–xử lý–xuất), giao thức **OTLP**, semantic conventions — instrument một lần, đổi backend chỉ sửa config, thoát vendor lock-in.

> Bài tiếp theo: đi sâu vào **alerting và on-call** — biến các metric/SLO ở trên thành cảnh báo đáng tin, giảm alert fatigue, và vận hành ca trực.
