# Distributed tracing: span, context & Jaeger

Trong một monolith, khi request chậm bạn mở stack trace hoặc profiler là thấy ngay hàm nào ngốn thời gian. Trong microservices, một cú `GET /checkout` có thể đi qua 15 service, 3 message queue và 5 database — log của mỗi service nằm rời rạc, đồng hồ mỗi máy lệch nhau vài mili-giây, và câu hỏi "request này chậm ở đâu?" trở thành đi mò kim đáy bể. **Distributed tracing** là câu trả lời: khâu lại toàn bộ hành trình của một request xuyên nhiều tiến trình thành một bức tranh nhân-quả duy nhất, có trục thời gian. Bài này đi từ mô hình dữ liệu (span/trace), cơ chế nối span cross-service (context propagation), tới sampling và cách gắn trace với log/metric để có được "ba trụ observability" thật sự liên thông.

## Mục tiêu

- Hiểu **vì sao** metric và log đơn lẻ không đủ để định vị điểm chậm/lỗi trong hệ phân tán, và tracing lấp khoảng trống đó thế nào.
- Nắm mô hình dữ liệu: **trace = cây span**, mỗi span là gì (operation, thời điểm bắt đầu/độ dài, tag/attribute, parent).
- Hiểu **context propagation**: trace id + span id được truyền qua HTTP header (chuẩn W3C `traceparent`) và qua message để nối span giữa các service.
- Phân biệt **head-based sampling** (quyết định lúc đầu, rẻ) vs **tail-based sampling** (quyết định sau khi có full trace, giữ được trace lỗi/chậm).
- Biết vai trò backend Jaeger / Tempo / Zipkin, và cách **liên kết trace với log** (inject trace id) và **metric** (exemplar).

## 1. Tại sao metric và log không đủ

Ba loại tín hiệu observability trả lời ba câu hỏi khác nhau:

| Tín hiệu | Trả lời | Điểm mù |
|---|---|---|
| **Metric** | "Có vấn đề không? p99 latency đang tăng?" | Aggregate — biết cả hệ chậm nhưng không biết *request nào*, *ở đâu* |
| **Log** | "Chuyện gì xảy ra ở service X, dòng nào?" | Rời rạc theo service, khó ghép một request xuyên nhiều service |
| **Trace** | "*Request cụ thể này* đi qua đâu, mỗi chặng tốn bao lâu?" | Chi phí lưu trữ cao → phải sampling |

Ví dụ thực tế: dashboard báo p99 của `/checkout` nhảy từ 300ms lên 2.4s. Metric cho bạn biết *có* sự cố nhưng không biết nghẽn ở `payment-service`, `inventory-service` hay ở cú gọi Redis nào. Log của 15 service thì hàng triệu dòng, không có sợi chỉ chung để lần. Trace giải quyết đúng chỗ này: mỗi request mang một **trace id** duy nhất theo suốt hành trình, và bạn xem được biểu đồ waterfall thấy rõ 1.9s trong 2.4s là do một câu query N+1 ở `inventory-service`.

> 💡 Ghi nhớ: metric để **phát hiện** (alert), trace để **định vị** (chặng nào), log để **giải thích** (tại sao). Chúng bổ sung chứ không thay thế nhau — và giá trị bùng nổ khi ba thứ *liên kết* được với nhau qua trace id.

## 2. Mô hình dữ liệu: trace là một cây span

**Span** là đơn vị cơ bản — đại diện cho *một đơn vị công việc có tên, có thời lượng*. Mỗi span gồm:

- **Operation name**: tên công việc, ví dụ `HTTP GET /orders/{id}`, `SELECT orders`, `grpc PaymentService/Charge`.
- **Trace ID** (16 byte / 128-bit): định danh chung cho toàn bộ trace — mọi span của cùng một request chia sẻ trace id này.
- **Span ID** (8 byte / 64-bit): định danh riêng của span đó.
- **Parent Span ID**: span cha đã spawn ra span này. Root span (điểm vào đầu tiên) không có parent → chính cấu trúc parent/child này tạo nên **cây**.
- **Start time + Duration**: mốc bắt đầu và độ dài (thường micro-giây).
- **Tags / Attributes**: cặp key-value mô tả bối cảnh — `http.status_code=200`, `db.statement=...`, `user.id=42`, `error=true`.
- **Events / Logs**: các mốc thời điểm bên trong span (ví dụ "cache miss lúc t+3ms").
- **Status**: OK / ERROR.

Một **trace** là tập hợp mọi span cùng trace id, ghép theo quan hệ parent/child thành cây có gốc. Xoay cây đó theo trục thời gian ta được biểu đồ **waterfall** — công cụ đọc trace mạnh nhất:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" aria-labelledby="wf-t wf-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title id="wf-t">Biểu đồ waterfall của một trace checkout</title>
  <desc id="wf-d">Root span api-gateway kéo dài toàn bộ request; bên trong lần lượt spawn các span con order-service, payment-service và inventory-service với select DB; span inventory kéo dài nhất do query N+1, là điểm nghẽn của trace.</desc>
  <text x="16" y="22" font-size="13" font-weight="700" fill="currentColor">Trace 4bf92f3577b34da6 — checkout (tổng 2.4s)</text>
  <g font-size="10" fill="currentColor" opacity="0.55">
    <line x1="250" y1="34" x2="250" y2="316" stroke="currentColor" stroke-opacity="0.12"/>
    <line x1="405" y1="34" x2="405" y2="316" stroke="currentColor" stroke-opacity="0.12"/>
    <line x1="560" y1="34" x2="560" y2="316" stroke="currentColor" stroke-opacity="0.12"/>
    <text x="250" y="332" text-anchor="middle">0.8s</text>
    <text x="405" y="332" text-anchor="middle">1.6s</text>
    <text x="560" y="332" text-anchor="middle">2.4s</text>
  </g>
  <g font-size="11" fill="currentColor">
    <rect x="96" y="44" width="600" height="26" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="104" y="61" font-size="10.5" fill="currentColor">api-gateway · GET /checkout · 2.4s (root)</text>
    <rect x="120" y="78" width="120" height="24" rx="5" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="128" y="94" font-size="10.5" fill="currentColor">order-service 0.42s</text>
    <rect x="140" y="110" width="70" height="24" rx="5" fill="#14b8a6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="148" y="126" font-size="10" fill="currentColor">SELECT 0.2s</text>
    <rect x="245" y="142" width="150" height="24" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="253" y="158" font-size="10.5" fill="currentColor">payment-service 0.55s</text>
    <rect x="265" y="174" width="90" height="24" rx="5" fill="#14b8a6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="273" y="190" font-size="10" fill="currentColor">grpc Charge</text>
    <rect x="130" y="206" width="490" height="26" rx="5" fill="#f43f5e" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.28"/>
    <text x="138" y="223" font-size="10.5" font-weight="700" fill="currentColor">inventory-service 1.9s ← điểm nghẽn</text>
    <rect x="150" y="240" width="150" height="22" rx="5" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="158" y="255" font-size="10" fill="currentColor">SELECT item #1</text>
    <rect x="304" y="240" width="150" height="22" rx="5" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="312" y="255" font-size="10" fill="currentColor">SELECT item #2</text>
    <rect x="458" y="240" width="150" height="22" rx="5" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="466" y="255" font-size="10" fill="currentColor">SELECT item #3</text>
  </g>
  <text x="130" y="284" font-size="10.5" fill="currentColor" opacity="0.75">↑ mỗi item một query riêng (N+1) → 1.9s. Waterfall lộ ngay nghẽn nằm đâu,</text>
  <text x="130" y="300" font-size="10.5" fill="currentColor" opacity="0.75">   điều mà metric p99 tổng hợp không bao giờ chỉ ra được.</text>
</svg>

Nhìn waterfall, mắt bắt ngay: `inventory-service` chiếm 1.9s/2.4s, và bên trong là 3 query tuần tự (N+1). Đây là loại insight mà không metric hay log rời rạc nào cho được.

> ⚠️ Đồng hồ lệch (clock skew): mỗi span mang timestamp theo đồng hồ máy sinh ra nó. Máy khác nhau lệch nhau vài ms → thi thoảng thấy span con "bắt đầu trước" span cha hoặc âm thời gian. Backend tốt (Jaeger) có heuristic điều chỉnh, nhưng đừng tin tuyệt đối vào chênh lệch dưới ~10ms giữa hai service.

## 3. Context propagation: sợi chỉ nối span cross-service

Câu hỏi mấu chốt: service B làm sao biết span nó vừa tạo thuộc *cùng trace* với request mà service A gửi sang? Câu trả lời là **context propagation** — A nhét `trace id` + `span id` (của span A, sẽ thành parent) vào **header** khi gọi B; B đọc header đó, tạo span mới với parent = span id của A, và cùng trace id. Cứ thế lan ra toàn hệ.

Chuẩn công nghiệp hiện nay là **W3C Trace Context** với header `traceparent`:

```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
             │  │                                │                │
             │  └ trace-id (16 byte hex)         └ parent-id      └ flags
             └ version                             (span-id 8 byte)  (01 = sampled)
```

- **trace-id**: định danh trace, không đổi suốt hành trình.
- **parent-id**: span-id của bên gửi — sẽ trở thành `parentSpanId` của span mà bên nhận tạo.
- **flags**: bit `sampled` (01) báo cho downstream "trace này đã được chọn để ghi lại" — quyết định sampling ở đầu được *truyền đi* để cả trace nhất quán (xem mục 4).
- Đi kèm `tracestate` (tuỳ chọn) mang metadata riêng của từng vendor.

Luồng propagation qua một hop HTTP:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" aria-labelledby="cp-t cp-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title id="cp-t">Context propagation qua một HTTP hop</title>
  <desc id="cp-d">Service A tạo span, inject traceparent vào HTTP header khi gọi service B; B extract header, tạo span con cùng trace id với parent là span id của A; cả hai span được export về collector rồi tới backend tracing.</desc>
  <defs>
    <marker id="cpah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <rect x="24" y="40" width="180" height="92" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke-opacity="0.2"/>
    <text x="114" y="62" text-anchor="middle" stroke="none" font-weight="700">Service A</text>
    <text x="114" y="82" text-anchor="middle" stroke="none" font-size="10">span-id ab..b7</text>
    <text x="114" y="98" text-anchor="middle" stroke="none" font-size="10">trace-id 4bf9..4736</text>
    <text x="114" y="118" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.7">inject() vào header</text>
    <rect x="516" y="40" width="180" height="92" rx="9" fill="#10b981" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="606" y="62" text-anchor="middle" stroke="none" font-weight="700">Service B</text>
    <text x="606" y="82" text-anchor="middle" stroke="none" font-size="10">span-id cc..91 (mới)</text>
    <text x="606" y="98" text-anchor="middle" stroke="none" font-size="10">trace-id 4bf9..4736</text>
    <text x="606" y="118" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.7">extract() → parent = ab..b7</text>
    <line x1="204" y1="72" x2="514" y2="72" stroke-opacity="0.6" marker-end="url(#cpah)"/>
  </g>
  <g font-size="10">
    <rect x="238" y="80" width="242" height="24" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="359" y="96" text-anchor="middle" fill="currentColor">traceparent: 00-4bf9..4736-ab..b7-01</text>
  </g>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <line x1="114" y1="132" x2="114" y2="212" stroke-opacity="0.5" stroke-dasharray="4 4" marker-end="url(#cpah)"/>
    <line x1="606" y1="132" x2="606" y2="212" stroke-opacity="0.5" stroke-dasharray="4 4" marker-end="url(#cpah)"/>
    <rect x="230" y="214" width="260" height="52" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="360" y="236" text-anchor="middle" stroke="none" font-weight="700">Collector (OTel) → Backend</text>
    <text x="360" y="253" text-anchor="middle" stroke="none" font-size="10" opacity="0.7">ghép span theo trace-id thành cây</text>
    <path d="M114 212 L114 240 L228 240" fill="none" stroke-opacity="0.5" marker-end="url(#cpah)"/>
    <path d="M606 212 L606 240 L492 240" fill="none" stroke-opacity="0.5" marker-end="url(#cpah)"/>
  </g>
</svg>

Trong thực tế bạn **không tự tay** ghép header — thư viện **OpenTelemetry (OTel)** và các auto-instrumentation làm việc này. Nhưng hiểu cơ chế là bắt buộc, vì tracing "đứt" gần như luôn do propagation hỏng. Đây là ví dụ tường minh bằng OpenTelemetry (Python) cho cả hai phía:

```python
from opentelemetry import trace
from opentelemetry.propagate import inject, extract
from opentelemetry.trace import SpanKind
import requests

tracer = trace.get_tracer(__name__)

# ---- SERVICE A (client): tạo span rồi INJECT context vào header ----
def call_service_b(order_id):
    with tracer.start_as_current_span(
        "GET /inventory", kind=SpanKind.CLIENT
    ) as span:
        span.set_attribute("order.id", order_id)   # tag/attribute
        headers = {}
        inject(headers)      # nhét traceparent (+tracestate) vào dict headers
        # headers == {"traceparent": "00-4bf9...-ab..b7-01"}
        return requests.get("http://inventory/api", headers=headers)

# ---- SERVICE B (server): EXTRACT context từ header rồi nối span ----
def handle_request(http_headers):
    ctx = extract(http_headers)     # đọc traceparent → SpanContext của A
    with tracer.start_as_current_span(
        "handle /inventory", context=ctx, kind=SpanKind.SERVER
    ) as span:                      # span này có parent = span của A, cùng trace-id
        span.set_attribute("http.status_code", 200)
        return do_work()
```

Điểm cốt lõi: `inject()` ở bên gửi ghi context ra header, `extract()` ở bên nhận đọc lại và dùng làm `context` cho span mới → parent/child được nối, trace liền mạch.

### Propagation qua message queue

Với HTTP, header là chỗ chứa context tự nhiên. Với Kafka/SQS/RabbitMQ thì nhét context vào **message header/attribute**. Producer `inject()` vào header của message; consumer `extract()` khi nhận. Nhờ vậy trace kéo dài xuyên cả ranh giới async — bạn thấy được cả quãng message *nằm chờ trong queue* (một span "receive" có parent là span "publish"), thứ cực kỳ giá trị khi debug độ trễ end-to-end.

```python
# Producer (Kafka)
headers = {}
inject(headers)
producer.send("orders", value=payload,
              headers=[(k, v.encode()) for k, v in headers.items()])

# Consumer
carrier = {k: v.decode() for k, v in msg.headers}
ctx = extract(carrier)
with tracer.start_as_current_span("process order", context=ctx,
                                  kind=SpanKind.CONSUMER):
    ...
```

> ⚠️ Bẫy propagation kinh điển: một service ở giữa **không forward header** (viết bằng framework cũ, hoặc dùng HTTP client tự chế không có instrumentation) → trace bị "gãy" thành hai cây rời. Triệu chứng: trace cụt lủn, thiếu hẳn nửa downstream. Luôn kiểm tra *mọi* egress client đều được instrument và không có proxy/gateway nào strip header lạ.

## 4. Sampling: không thể lưu 100% trace

Ở quy mô lớn, ghi lại *mọi* trace là bất khả thi về chi phí lưu trữ và băng thông: 100k RPS × mỗi trace vài chục span = hàng tỷ span/ngày. **Sampling** = chỉ giữ một phần. Có hai triết lý, khác nhau ở *thời điểm ra quyết định*.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" aria-labelledby="sp-t sp-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title id="sp-t">Head-based vs tail-based sampling</title>
  <desc id="sp-d">Head-based quyết định giữ hay bỏ ngay tại root span trước khi biết kết quả, rẻ nhưng có thể bỏ mất trace lỗi. Tail-based buffer toàn bộ span của trace tại collector rồi mới quyết định sau khi thấy full trace, giữ được mọi trace lỗi hoặc chậm nhưng tốn bộ nhớ.</desc>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <text x="16" y="24" font-size="12.5" font-weight="700" stroke="none">HEAD-BASED — quyết định ngay ở đầu (root span)</text>
    <rect x="24" y="36" width="120" height="34" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="84" y="57" text-anchor="middle" stroke="none" font-size="10">root span: roll 1%</text>
    <line x1="144" y1="53" x2="196" y2="53" stroke-opacity="0.55" marker-end="url(#spah)"/>
    <rect x="198" y="36" width="150" height="34" rx="7" fill="#10b981" fill-opacity="0.15" stroke-opacity="0.2"/>
    <text x="273" y="52" text-anchor="middle" stroke="none" font-size="10">giữ → flag sampled=1</text>
    <text x="273" y="65" text-anchor="middle" stroke="none" font-size="9" opacity="0.7">truyền xuống mọi downstream</text>
    <rect x="360" y="36" width="150" height="34" rx="7" fill="#f43f5e" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="435" y="52" text-anchor="middle" stroke="none" font-size="10">bỏ 99% → không ghi gì</text>
    <text x="435" y="65" text-anchor="middle" stroke="none" font-size="9" opacity="0.7">kể cả nếu về sau nó lỗi!</text>
    <text x="524" y="49" stroke="none" font-size="10" opacity="0.75">rẻ, không</text>
    <text x="524" y="62" stroke="none" font-size="10" opacity="0.75">cần buffer</text>
  </g>
  <defs>
    <marker id="spah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <line x1="16" y1="92" x2="704" y2="92" stroke="currentColor" stroke-opacity="0.15" stroke-dasharray="5 5"/>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <text x="16" y="120" font-size="12.5" font-weight="700" stroke="none">TAIL-BASED — buffer full trace rồi mới quyết định</text>
    <rect x="24" y="134" width="150" height="70" rx="8" fill="#8b5cf6" fill-opacity="0.13" stroke-opacity="0.2"/>
    <text x="99" y="156" text-anchor="middle" stroke="none" font-size="10">mọi span của trace</text>
    <text x="99" y="172" text-anchor="middle" stroke="none" font-size="10">gửi hết về collector</text>
    <text x="99" y="190" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.7">buffer trong RAM</text>
    <line x1="174" y1="169" x2="222" y2="169" stroke-opacity="0.55" marker-end="url(#spah)"/>
    <path d="M300 138 L390 118 L390 158 Z" fill="#f59e0b" fill-opacity="0.15" stroke-opacity="0.2"/>
    <rect x="224" y="150" width="150" height="40" rx="8" fill="#f59e0b" fill-opacity="0.13" stroke-opacity="0.2"/>
    <text x="299" y="167" text-anchor="middle" stroke="none" font-size="10">chờ đủ span, xét</text>
    <text x="299" y="182" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.7">luật: error? slow?</text>
    <line x1="374" y1="163" x2="418" y2="150" stroke-opacity="0.55" marker-end="url(#spah)"/>
    <line x1="374" y1="176" x2="418" y2="196" stroke-opacity="0.55" marker-end="url(#spah)"/>
    <rect x="420" y="132" width="180" height="34" rx="7" fill="#f43f5e" fill-opacity="0.15" stroke-opacity="0.25"/>
    <text x="510" y="153" text-anchor="middle" stroke="none" font-size="10" font-weight="700">GIỮ 100% trace lỗi/chậm</text>
    <rect x="420" y="180" width="180" height="34" rx="7" fill="#10b981" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="510" y="201" text-anchor="middle" stroke="none" font-size="10">giữ ~1% trace bình thường</text>
    <text x="612" y="180" stroke="none" font-size="10" opacity="0.75">tốn RAM,</text>
    <text x="612" y="194" stroke="none" font-size="10" opacity="0.75">độ trễ,</text>
    <text x="612" y="208" stroke="none" font-size="10" opacity="0.75">hạ tầng</text>
  </g>
</svg>

**Head-based sampling** — quyết định *ngay tại root span*, trước khi biết request thành công hay thất bại:

- Cơ chế: root roll xác suất (ví dụ giữ 1%). Quyết định được ghi vào flag `sampled` của `traceparent` và **truyền xuống toàn bộ downstream** → cả trace nhất quán (hoặc giữ hết, hoặc bỏ hết span), không có trace "nửa vời".
- Ưu: cực rẻ, không cần buffer, phi tập trung. Là mặc định của hầu hết setup.
- Nhược chí mạng: quyết định *mù* — bạn roll bỏ 99% *trước khi* biết request nào sẽ lỗi. Kết quả: đúng những trace lỗi/chậm hiếm gặp — thứ bạn cần nhất — lại thường bị vứt.

**Tail-based sampling** — quyết định *sau khi đã thu đủ toàn bộ span của trace*:

- Cơ chế: mọi span được gửi về collector và **buffer** cho tới khi trace "đủ" (hết span hoặc timeout), rồi mới áp luật: `error=true` → giữ; `duration > 1s` → giữ; còn lại giữ theo tỉ lệ nhỏ.
- Ưu: giữ được **100% trace lỗi và chậm** — đúng thứ đáng điều tra — mà tổng lưu trữ vẫn thấp.
- Nhược: collector phải buffer toàn bộ span của mọi trace đang mở trong RAM → tốn bộ nhớ và cần *mọi span của một trace tới cùng một collector instance* (đòi hỏi load-balancing theo trace-id). Phức tạp và đắt hơn nhiều.

| | Head-based | Tail-based |
|---|---|---|
| Thời điểm quyết định | Ngay ở root, trước khi biết kết quả | Sau khi có full trace |
| Chi phí | Rẻ, không buffer | Đắt: buffer RAM + LB theo trace-id |
| Giữ được trace lỗi/chậm | Chỉ theo may rủi | Có, gần như 100% |
| Nơi thực thi | SDK ở mỗi service | Collector tập trung |

Cấu hình tail-based bằng OpenTelemetry Collector:

```yaml
processors:
  tail_sampling:
    decision_wait: 10s          # chờ 10s gom đủ span của một trace
    num_traces: 100000          # số trace giữ trong buffer
    policies:
      - name: keep-errors
        type: status_code
        status_code: { status_codes: [ERROR] }   # mọi trace có span lỗi
      - name: keep-slow
        type: latency
        latency: { threshold_ms: 1000 }           # trace chậm hơn 1s
      - name: baseline
        type: probabilistic
        probabilistic: { sampling_percentage: 1 } # 1% phần còn lại
```

> 💡 Ghi nhớ: chiến lược thực dụng phổ biến là **kết hợp** — head-based ở SDK giữ một tỉ lệ vừa phải để giảm tải mạng, rồi tail-based ở collector chắt lọc giữ 100% lỗi/chậm. Đừng để head-based 1% "mù" là dây chuyền duy nhất, nếu không bạn sẽ mất đúng những trace cần khi sự cố xảy ra.

## 5. Backend: Jaeger, Tempo, Zipkin

Sau khi span được export (thường qua giao thức **OTLP** của OpenTelemetry) tới **collector**, chúng được lưu vào một **tracing backend** để truy vấn và dựng waterfall:

| Backend | Đặc điểm | Lưu trữ |
|---|---|---|
| **Jaeger** | Của Uber (CNCF). UI waterfall mạnh, so sánh trace, service dependency graph. Chuẩn de-facto cho self-host | Cassandra / Elasticsearch / OpenSearch |
| **Grafana Tempo** | Tối ưu *chi phí*: chỉ index theo trace-id, lưu span trên **object storage** (S3/GCS) rất rẻ. Tìm trace qua trace-id (thường từ log/exemplar) hơn là search phức tạp | S3 / GCS / Azure Blob |
| **Zipkin** | Của Twitter, ra đời sớm, đơn giản, nhẹ. Hệ sinh thái nhỏ hơn Jaeger | Cassandra / ES / MySQL |

Kiến trúc thu thập điển hình 2025 hoàn toàn **vendor-neutral** nhờ OpenTelemetry: app dùng OTel SDK → **OTel Collector** (nơi làm sampling, xử lý, batching) → export sang Jaeger/Tempo/Zipkin *hoặc* backend thương mại (Datadog, Honeycomb, Grafana Cloud) mà không đổi code app. Đây là lý do lớn khiến OTel thắng thế: bạn instrument một lần, đổi backend tuỳ ý.

```
[App + OTel SDK] --OTLP--> [OTel Collector: sampling, batch] --> Jaeger / Tempo / Zipkin
```

> 💡 Ghi nhớ: chọn **Jaeger** khi cần UI điều tra mạnh và search linh hoạt; chọn **Tempo** khi ưu tiên chi phí ở quy mô rất lớn và bạn đã có sẵn kỷ luật "lần theo trace-id từ log/metric" thay vì search mù.

## 6. Liên kết ba trụ: trace ↔ log ↔ metric

Sức mạnh thật sự đến khi ba tín hiệu *nhảy qua lại được* nhờ chung một trace id.

**Trace ↔ Log — inject trace id vào log.** Cấu hình logger in kèm `trace_id` (và `span_id`) vào *mọi* dòng log. Khi mở một trace lỗi trong Jaeger, bạn copy trace id, dán vào log backend (Loki/Elasticsearch) là ra *đúng* những dòng log của request đó, xuyên mọi service — thay vì mò theo timestamp.

```python
# Cấu hình logging kèm trace context (OTel)
from opentelemetry.instrumentation.logging import LoggingInstrumentor
LoggingInstrumentor().instrument(set_logging_format=True)
# → mỗi dòng log tự có: otelTraceID=4bf9...4736 otelSpanID=00f0...
# Ví dụ dòng log JSON structured:
#   {"level":"error","msg":"charge failed","trace_id":"4bf92f3577b34da6...",
#    "span_id":"00f067aa0ba902b7","service":"payment"}
```

**Trace ↔ Metric — exemplar.** Vấn đề: histogram latency (metric) chỉ cho biết "p99 = 2.4s" nhưng không cho biết *trace cụ thể nào* rơi vào p99 đó. **Exemplar** là cây cầu: mỗi bucket của histogram Prometheus đính kèm một mẫu (`trace_id`, giá trị) của một quan sát rơi vào bucket đó. Trên Grafana, bạn thấy chấm exemplar trên biểu đồ latency, click vào là **nhảy thẳng sang trace** tương ứng trong Tempo/Jaeger.

```
# Prometheus exposition với exemplar (dấu # là exemplar):
http_request_duration_seconds_bucket{le="2.5"} 12345 # {trace_id="4bf92f35..."} 2.41 1718000000
```

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 250" role="img" aria-labelledby="lk-t lk-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title id="lk-t">Ba trụ observability liên kết qua trace id</title>
  <desc id="lk-d">Metric phát hiện p99 tăng và mang exemplar trỏ tới trace id; từ trace id nhảy sang trace để định vị chặng nghẽn; trace id cũng có trong mọi dòng log để giải thích nguyên nhân. Vòng phát hiện, định vị, giải thích khép kín qua chung một trace id.</desc>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <rect x="30" y="90" width="180" height="70" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="120" y="114" text-anchor="middle" stroke="none" font-weight="700">METRIC</text>
    <text x="120" y="132" text-anchor="middle" stroke="none" font-size="10" opacity="0.75">p99 tăng → phát hiện</text>
    <text x="120" y="148" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.7">exemplar mang trace_id</text>
    <rect x="270" y="90" width="180" height="70" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="360" y="114" text-anchor="middle" stroke="none" font-weight="700">TRACE</text>
    <text x="360" y="132" text-anchor="middle" stroke="none" font-size="10" opacity="0.75">waterfall → định vị chặng</text>
    <text x="360" y="148" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.7">trace_id là khoá chung</text>
    <rect x="510" y="90" width="180" height="70" rx="10" fill="#10b981" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="600" y="114" text-anchor="middle" stroke="none" font-weight="700">LOG</text>
    <text x="600" y="132" text-anchor="middle" stroke="none" font-size="10" opacity="0.75">dòng log → giải thích</text>
    <text x="600" y="148" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.7">inject trace_id mỗi dòng</text>
    <line x1="210" y1="118" x2="268" y2="118" stroke-opacity="0.6" marker-end="url(#lkah)"/>
    <text x="239" y="110" text-anchor="middle" stroke="none" font-size="9" opacity="0.75">exemplar</text>
    <line x1="450" y1="118" x2="508" y2="118" stroke-opacity="0.6" marker-end="url(#lkah)"/>
    <text x="479" y="110" text-anchor="middle" stroke="none" font-size="9" opacity="0.75">trace_id</text>
  </g>
  <defs>
    <marker id="lkah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="360" y="40" text-anchor="middle" font-size="12.5" font-weight="700" fill="currentColor">Phát hiện → Định vị → Giải thích, khép vòng qua một trace_id</text>
  <path d="M120 160 L120 200 L600 200 L600 160" fill="none" stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="5 4" marker-end="url(#lkah)"/>
  <text x="360" y="222" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.7">cùng trace_id nối metric ↔ trace ↔ log — một cú click nhảy giữa ba trụ</text>
</svg>

> ⚠️ Bẫy thường gặp: instrument tracing nhưng **quên inject trace id vào log** → có trace đẹp nhưng vẫn phải mò log theo timestamp lúc 3h sáng. Việc rẻ nhất mà lời nhất là bật ngay log correlation từ ngày đầu.

## 7. Thực hành: những điều dễ sai

- **Đặt tên span có kỷ luật**: dùng low-cardinality cho operation name (`GET /orders/{id}`, *không* phải `GET /orders/12345` — nếu không mỗi id thành một tên khác, vỡ aggregation). Id cụ thể để vào **attribute**, không vào tên.
- **Không nhét dữ liệu nhạy cảm vào tag**: `db.statement`, header, PII đều có thể lộ. Redact ở collector.
- **Auto-instrumentation trước, thủ công sau**: OTel có sẵn instrumentation cho HTTP client/server, gRPC, DB driver, Kafka... Bật auto để có 80% giá trị gần như miễn phí, rồi thêm span thủ công cho business logic quan trọng.
- **Span quá mịn cũng hại**: mỗi span có chi phí. Không cần span cho từng vòng lặp — gom theo đơn vị công việc có ý nghĩa.
- **Propagation là mắt xích yếu nhất**: mọi client gọi ra ngoài (HTTP, gRPC, queue) phải được instrument, và không proxy/mesh nào strip header. Đây là nguyên nhân số một của "trace bị gãy".

## Tóm tắt

- Trong microservices, **metric phát hiện, trace định vị, log giải thích** — tracing lấp đúng khoảng trống "chặng nào chậm/lỗi".
- **Trace = cây span**. Mỗi span có operation name, trace-id/span-id/parent-id, start+duration, tag và status. Waterfall là công cụ đọc mạnh nhất.
- **Context propagation** nối span cross-service: bên gửi `inject()` `traceparent` (W3C) vào HTTP header hoặc message; bên nhận `extract()` để tạo span con cùng trace-id. Propagation hỏng = trace gãy.
- **Sampling**: head-based quyết định ngay ở root (rẻ, nhưng mù, dễ mất trace lỗi); tail-based buffer full trace rồi mới giữ 100% trace lỗi/chậm (đắt hơn, cần LB theo trace-id). Kết hợp cả hai là thực dụng nhất.
- Backend: **Jaeger** (UI điều tra mạnh), **Tempo** (rẻ, lưu trên object storage), **Zipkin** (nhẹ). OpenTelemetry cho phép instrument một lần, đổi backend tuỳ ý.
- Giá trị bùng nổ khi **liên kết ba trụ**: inject trace id vào log, dùng exemplar nối metric ↔ trace — một trace id khép kín vòng phát hiện/định vị/giải thích.

> Bài tiếp theo: đi vào backend service communication — cách các service gọi nhau tin cậy (retry, timeout, circuit breaker) mà chính tracing ở trên giúp bạn quan sát.
