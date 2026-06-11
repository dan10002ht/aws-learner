# Resilience trong code: Timeout, Retry, Circuit Breaker

Hệ thống phân tán có một sự thật khó chịu: **mọi lời gọi qua mạng đều có thể thất bại, treo, hoặc chậm bất thường** — và "chậm" thường nguy hiểm hơn "chết hẳn". Một service chết trả lỗi ngay lập tức; một service chậm giữ thread, giữ connection, giữ memory của bạn làm con tin. Bài này đi qua bộ công cụ resilience kinh điển — timeout, retry, circuit breaker, bulkhead, fallback, hedging, load shedding — và quan trọng hơn: cách chúng **tương tác** với nhau, vì phần lớn sự cố production đến từ việc kết hợp sai chứ không phải thiếu công cụ.

## 1. Timeout là một hợp đồng, không phải tham số tuỳ chọn

### Mặc định vô hạn là bug

Rất nhiều HTTP client, DB driver, gRPC stub có **default timeout = vô hạn** (hoặc rất lớn). Nghĩa là khi downstream treo, request của bạn treo theo — và mỗi request treo chiếm một thread/connection trong pool. Pool đầy → toàn bộ service của bạn ngừng phục vụ **cả những request không liên quan gì đến downstream đang hỏng**. Đây là cơ chế lan truyền sự cố (cascading failure) phổ biến nhất.

```python
# BUG tiềm ẩn: requests không có default timeout
resp = requests.get("https://payment-svc/charge")  # treo vô hạn nếu peer không trả lời

# Đúng: timeout là tham số bắt buộc trong code review
resp = requests.get("https://payment-svc/charge", timeout=(0.5, 2.0))
# (connect_timeout=500ms, read_timeout=2s)
```

> ⚠️ Bẫy production: `timeout` của Python `requests` là **per-read**, không phải tổng thời gian response. Một server nhỏ giọt 1 byte mỗi 1.9s có thể giữ bạn hàng phút dù `read_timeout=2s`. Nếu cần deadline tổng, phải tự bọc (hoặc dùng `httpx` với `Timeout(pool=..., read=...)` + deadline ở tầng trên).

### Timeout là hợp đồng hai chiều

Đặt timeout nghĩa là bạn tuyên bố: *"Tôi chỉ chờ X ms; quá hạn tôi coi như thất bại và đi tiếp."* Hợp đồng này có hệ quả:

- **Caller** phải có kế hoạch khi hết hạn (retry? fallback? trả lỗi?).
- **Callee** nên biết deadline của caller — làm việc tiếp sau khi caller đã bỏ đi là lãng phí tài nguyên thuần tuý. gRPC giải quyết bằng **deadline propagation**: client gửi deadline trong metadata, server tự huỷ việc khi quá hạn.
- Timeout quá ngắn → false failure, kích hoạt retry vô ích. Timeout quá dài → giữ tài nguyên, lan truyền độ trễ. Chọn theo dữ liệu: thường lấy **p99 latency của downstream + biên độ an toàn**, không chọn theo cảm tính "5 giây cho chắc".

### Timeout budget xuyên call chain

Xét chuỗi: `API Gateway (30s) → Service A (?) → Service B (?) → DB (?)`.

Nếu mỗi tầng tự đặt timeout độc lập và đều retry, tổng thời gian xấu nhất bùng nổ. Cách đúng là **budget giảm dần**: tầng ngoài cấp một deadline tổng, mỗi tầng trong tiêu một phần và truyền phần còn lại xuống.

```
Edge nhận request, budget tổng = 3000ms
  ├─ Service A: tự dùng 100ms xử lý, truyền xuống budget còn ~2800ms
  │    ├─ gọi Service B với timeout = min(local_max, remaining - reserve)
  │    │    └─ B gọi DB với timeout = remaining_của_B - reserve
  │    └─ luôn chừa "reserve" (~100-200ms) để kịp trả lỗi/fallback có kiểm soát
```

Triển khai thực tế: truyền header `x-request-deadline` (epoch ms) hoặc dùng `context.WithDeadline` (Go) / gRPC deadline / `AbortSignal.timeout()` (Node) xuyên suốt.

```typescript
// Node 18+: deadline truyền theo AbortSignal
const remaining = deadlineMs - Date.now();
if (remaining < 150) throw new DeadlineExceeded(); // không gọi nữa, fail fast
const resp = await fetch(url, { signal: AbortSignal.timeout(remaining - 100) });
```

> 💡 Ghi nhớ: timeout của tầng trong **phải nhỏ hơn** timeout của tầng ngoài. Nếu Service B có timeout 10s nhưng API Gateway cắt ở 5s, mọi công việc B làm sau giây thứ 5 là vô nghĩa — và client còn có thể retry, nhân đôi tải lên hệ thống đang chậm.

## 2. Retry đúng cách

Retry dựa trên một giả định: **lỗi là thoáng qua (transient)**. Nếu giả định sai, retry chỉ là cách lịch sự để DDoS chính hệ thống của mình.

### Chỉ retry lỗi retryable

| Tình huống | Retry? | Lý do |
|---|---|---|
| Connect timeout, connection refused | ✅ | Request chưa tới nơi, an toàn |
| HTTP 503, 429 (tôn trọng `Retry-After`) | ✅ | Server tự khai là tạm thời quá tải |
| HTTP 500 trên request **idempotent** (GET, PUT có key) | ⚠️ Có điều kiện | Có thể transient, nhưng cần chắc idempotent |
| Read timeout trên request **không idempotent** (charge tiền) | ❌ (trừ khi có idempotency key) | Request có thể **đã được xử lý** — retry = double charge |
| HTTP 400, 401, 403, 404, 422 | ❌ | Lỗi của bạn; gửi lại 100 lần vẫn 400 |
| Lỗi nghiệp vụ (số dư không đủ) | ❌ | Không phải lỗi hạ tầng |

Hệ quả thiết kế quan trọng: **muốn retry an toàn cho thao tác ghi, API phải hỗ trợ idempotency key** (kiểu `Idempotency-Key` của Stripe). Resilience không phải chuyện riêng của client — nó là yêu cầu thiết kế API.

### Backoff + jitter

Retry ngay lập tức khi server đang quá tải là đổ thêm dầu. Chuẩn hiện nay: **exponential backoff + full jitter**.

```python
def backoff_delay(attempt: int, base=0.1, cap=5.0) -> float:
    # Full jitter (AWS Architecture Blog) — phân tán đều, tránh đồng pha
    return random.uniform(0, min(cap, base * 2 ** attempt))
```

Vì sao cần jitter: không có jitter, hàng nghìn client thất bại cùng lúc (ví dụ khi server vừa restart) sẽ retry **đồng pha** — tạo các đợt sóng tải dồn dập đúng chu kỳ (thundering herd), server vừa ngóc đầu dậy lại bị đè xuống.

### Retry budget — giới hạn ở mức hệ thống, không chỉ per-request

`max_retries=3` per-request nghe vô hại, nhưng khi downstream hỏng **toàn bộ**, mọi request đều retry 3 lần → tải lên downstream nhân 4 đúng lúc nó yếu nhất. Giải pháp là **retry budget**: giới hạn tổng số retry theo tỷ lệ traffic, ví dụ "retry không vượt quá 10-20% số request gốc trong cửa sổ trượt" (cách Google SRE và Envoy `retry_budget` làm). Khi budget cạn, lỗi được trả thẳng về caller thay vì retry.

```python
# Phác thảo token-bucket retry budget
class RetryBudget:
    def __init__(self, ratio=0.1):
        self.tokens = 0.0; self.ratio = ratio
    def on_request(self): self.tokens = min(100, self.tokens + self.ratio)
    def can_retry(self):
        if self.tokens >= 1: self.tokens -= 1; return True
        return False
```

### Retry storm & amplification — bài toán nhân số

Đây là lỗi kiến trúc, không phải lỗi code. Xét chuỗi 4 tầng, **mỗi tầng đều retry 3 lần** (1 gốc + 3 retry = 4 lần thử):

```
Client(×4) → API(×4) → Service A(×4) → Service B(×4) → DB
Tải lên DB trong tình huống xấu nhất: 4⁴ = 256 lần cho MỘT request gốc.
```

Khi DB chậm vì quá tải, amplification này đảm bảo nó **không bao giờ hồi phục được** cho tới khi ai đó tắt bớt traffic bằng tay. Đây là kịch bản đứng sau rất nhiều outage lớn (kể cả các sự cố của chính AWS).

> 💡 Ghi nhớ — quy tắc đặt retry: **retry ở ÍT tầng nhất có thể, lý tưởng là một tầng duy nhất** — thường là tầng gần client nhất có đủ ngữ cảnh để biết lỗi có retryable không. Các tầng giữa: timeout ngắn, fail fast, truyền lỗi lên. Nếu service mesh (Envoy/App Mesh) đã retry, application code đừng retry nữa.

## 3. Circuit Breaker

Retry trả lời câu hỏi "lỗi *này* có thử lại không?". Circuit breaker trả lời câu hỏi cấp cao hơn: "**downstream này còn đáng gọi không?**". Khi downstream hỏng kéo dài, tiếp tục gọi chỉ tốn timeout + tài nguyên + làm nó khó hồi phục.

### Ba trạng thái

```
            lỗi vượt ngưỡng                hết open_duration
 CLOSED ───────────────────────► OPEN ───────────────────────► HALF-OPEN
 (gọi bình thường,               (chặn ngay, trả lỗi/           (cho qua N request thử)
  đếm tỷ lệ lỗi)                  fallback, không gọi thật)        │ thành công → CLOSED
    ▲                                                              │ thất bại  → OPEN
    └──────────────────────────────────────────────────────────────┘
```

- **Closed**: trạng thái bình thường. Theo dõi tỷ lệ lỗi trên cửa sổ trượt (ví dụ: ≥50% lỗi trong 10s, tối thiểu 20 request — ngưỡng tối thiểu tránh việc 1 lỗi / 1 request = "100% error" làm mở mạch oan).
- **Open**: từ chối ngay lập tức (fail fast), không tốn timeout. Caller nhận lỗi sau ~0ms thay vì sau 2s timeout — chính điểm này cứu thread pool của bạn.
- **Half-open**: sau `open_duration`, cho **một lượng nhỏ** request thăm dò. Thành công → đóng mạch; thất bại → mở lại. Tuyệt đối không xả toàn bộ traffic ngay khi half-open — đó là cách đánh gục một service vừa hồi phục.

```typescript
// Phác thảo tối giản
class CircuitBreaker {
  state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  async call<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() < this.openUntil) return fallback();   // fail fast
      this.state = "HALF_OPEN";
    }
    try {
      const r = await fn();
      this.onSuccess(); return r;
    } catch (e) {
      this.onFailure();                                     // có thể chuyển OPEN
      return fallback();
    }
  }
}
```

> ⚠️ Bẫy production:
> - **Breaker phải tách theo dependency** (và đôi khi theo endpoint). Một breaker chung cho "mọi HTTP call" sẽ khiến payment-svc hỏng làm chặn luôn call tới search-svc khoẻ mạnh.
> - **Đếm timeout là failure.** Breaker chỉ đếm exception mà bỏ qua slow call là vô dụng — chế độ hỏng phổ biến nhất là *chậm*, không phải *throw*. (Resilience4j có riêng `slowCallRateThreshold` vì lý do này.)
> - Trong môi trường nhiều instance, mỗi instance có breaker riêng với góc nhìn riêng — chấp nhận điều đó; breaker state tập trung qua Redis tạo thêm một dependency và một điểm hỏng mới, hiếm khi đáng giá.
> - Thư viện 2025: Resilience4j (Java), Polly v8 (.NET), `pybreaker`/`tenacity` (Python), `cockatiel`/`opossum` (Node). Hystrix đã ngừng phát triển từ lâu — đừng chọn cho dự án mới.

## 4. Bulkhead & connection pool isolation

Tên lấy từ vách ngăn khoang tàu: thủng một khoang, tàu không chìm. Trong code: **cô lập tài nguyên theo từng dependency** để một downstream chậm không nuốt hết tài nguyên dùng chung.

Tình huống kinh điển: service của bạn gọi cả `recommendation-svc` (phụ) và `order-svc` (chính) qua **một** HTTP connection pool 100 connection. Recommendation chậm → 100 connection dần bị giữ hết bởi các call recommendation đang chờ → order call không lấy được connection → **tính năng phụ giết tính năng chính**.

```
SAI:  [ shared pool: 100 ] ← order + recommendation + email tranh nhau
ĐÚNG: [ order: 60 ] [ recommendation: 20 ] [ email: 10 ] [ dự phòng: 10 ]
       → recommendation hỏng chỉ "đầy" đúng khoang 20 của nó
```

Các dạng bulkhead thường dùng:

| Cơ chế | Cô lập cái gì | Ghi chú |
|---|---|---|
| Connection pool riêng per-dependency | Outbound connection | Rẻ nhất, làm trước tiên |
| Semaphore / max-concurrent per-dependency | Số call đồng thời | Overhead thấp, phù hợp async runtime |
| Thread pool riêng | Thread (blocking I/O) | Nặng; chủ yếu ở hệ Java blocking cũ |
| Tách process/service/queue | Toàn bộ runtime | Mức kiến trúc: tách critical path khỏi batch |

Nguyên tắc tương tự áp cho **DB connection pool**: endpoint báo cáo nặng dùng chung pool với endpoint checkout là tự chuốc lấy sự cố — tách pool, hoặc tách hẳn sang read replica.

## 5. Fallback & graceful degradation

Khi breaker mở hoặc budget cạn, câu hỏi sản phẩm là: **trả gì cho user?** Thứ tự ưu tiên thực dụng:

1. **Giá trị cache cũ (stale)** — trang sản phẩm với giá cache 5 phút trước tốt hơn trang lỗi 500.
2. **Giá trị mặc định an toàn** — recommendation hỏng → trả danh sách bestseller tĩnh; feature flag service hỏng → dùng giá trị mặc định đã chọn trước.
3. **Giảm chức năng có chủ đích** — "Tạm thời không hiển thị điểm review" thay vì chặn cả trang.
4. **Hàng đợi xử lý sau** — ghi không gấp (analytics, email) đẩy vào queue, xử lý khi downstream hồi.

Hai cảnh báo:

- **Fallback phải rẻ và gần như không thể hỏng.** Fallback gọi sang một service khác qua mạng là đổi một dependency lấy một dependency — và nhánh fallback hiếm khi được test dưới tải thật cho đến đúng ngày sự cố.
- **Có những thứ không được phép fallback.** Authorization, charge tiền, kiểm tra tồn kho: thất bại đúng (fail closed) tốt hơn thành công giả. Phân loại từng call thành *critical* (lỗi thì fail) và *best-effort* (lỗi thì degrade) là một quyết định thiết kế phải làm tường minh.

## 6. Hedging — cứu tail latency

Khác retry (gửi lại **sau khi** thất bại), hedging gửi request **thứ hai song song khi request đầu chậm quá ngưỡng** (thường là p95), lấy kết quả nào về trước, huỷ cái còn lại.

```
t=0     gửi request → instance A
t=p95   A chưa trả lời → gửi bản sao → instance B
        nhận kết quả đầu tiên, cancel cái kia
```

- Chi phí: chỉ ~5% request bị hedge (những request vượt p95) → tải tăng ~5%, nhưng p99 cải thiện mạnh — kỹ thuật "The Tail at Scale" (Dean & Barroso) mà Google, gRPC, và DynamoDB dùng nội bộ.
- Điều kiện: request **idempotent** tuyệt đối, và phải **cancel** được bản thua — không cancel thì hedging chỉ là nhân đôi tải. Tuyệt đối tắt hedging khi hệ thống đang quá tải (kết hợp với retry budget).

## 7. Load shedding — phía server tự vệ

Mọi thứ ở trên là góc nhìn caller. Phía callee cần nguyên tắc đối ngẫu: **từ chối sớm một phần còn hơn chậm toàn bộ**. Server quá tải mà vẫn nhận hết request sẽ chậm dần đều cho mọi người, vượt timeout của caller, kích hoạt retry, và sập theo hình xoắn ốc.

- **Giới hạn concurrent + queue ngắn**: vượt ngưỡng → trả `429`/`503` + `Retry-After` ngay. Queue dài chỉ tạo ra những request mà khi xử lý xong thì caller đã timeout từ lâu (goodput = 0 dù throughput cao).
- **Shed có ưu tiên**: bỏ traffic best-effort (crawler, analytics, prefetch) trước, giữ traffic trả tiền (checkout) đến cùng.
- **Adaptive concurrency**: tự dò mức concurrency tối ưu theo latency quan sát được (ý tưởng Netflix concurrency-limits, dựa trên Little's Law) thay vì hằng số cứng.
- Lý do shed bằng `503` thay vì cứ để timeout: lỗi tường minh + `Retry-After` cho client tín hiệu để backoff **đúng cách**; timeout im lặng cho client tín hiệu mơ hồ và thường dẫn tới retry hỗn loạn hơn.

## 8. Lỗi thường gặp — checklist trước khi ship

| # | Lỗi | Hậu quả |
|---|---|---|
| 1 | Không đặt timeout (tin vào default) | Thread/connection pool cạn, sập lan |
| 2 | **Retry chồng ở mọi tầng** (SDK retry + app retry + mesh retry + client retry) | Amplification 4⁴, downstream không thể hồi phục |
| 3 | Retry lỗi không retryable (400, lỗi nghiệp vụ) | Tải rác, log nhiễu, che giấu bug thật |
| 4 | Retry thao tác ghi không có idempotency key | Double charge, duplicate order |
| 5 | Backoff không jitter | Retry đồng pha, thundering herd theo chu kỳ |
| 6 | Timeout tầng trong ≥ tầng ngoài | Làm việc cho caller đã bỏ đi |
| 7 | Breaker không đếm slow call / dùng chung cho mọi dependency | Breaker vô dụng hoặc chặn nhầm hàng loạt |
| 8 | Một connection pool dùng chung cho mọi downstream | Dependency phụ giết tính năng chính |
| 9 | Fallback phức tạp, không bao giờ được test | Hỏng đúng lúc cần |
| 10 | Không có load shedding phía server | Chậm đều cho tất cả, goodput về 0 |

> 💡 Ghi nhớ — thứ tự lắp ráp cho một outbound call: **deadline/timeout (luôn luôn) → bulkhead (giới hạn concurrent) → circuit breaker → retry có budget + jitter (chỉ một tầng, chỉ lỗi retryable) → fallback**. Và quan sát được tất cả: metric riêng cho timeout rate, retry rate, breaker state, pool utilization — không có metric thì các cơ chế này hỏng trong im lặng.

## Liên hệ sang AWS

- **AWS SDK retry config**: mọi SDK đã có sẵn retry + exponential backoff + jitter. SDK v2/v3 hỗ trợ retry mode `standard` (mặc định, có **retry quota** — chính là retry budget) và `adaptive` (thêm client-side rate limiting khi gặp throttling). Bài học #2 áp dụng trực tiếp: SDK đã retry rồi thì **đừng bọc thêm vòng retry trong application code** quanh call DynamoDB/S3 — đó là retry chồng tầng kinh điển. Tinh chỉnh qua `maxAttempts` / `AWS_MAX_ATTEMPTS`.
- **SQS redrive policy + DLQ**: phiên bản hạ tầng của "retry có giới hạn": `maxReceiveCount` là số lần retry tối đa của một message, vượt ngưỡng thì vào Dead-Letter Queue thay vì retry vô hạn (poison message làm nghẽn consumer). `VisibilityTimeout` đóng vai trò timeout — phải dài hơn thời gian xử lý thật, nếu không message bị "retry" trong khi consumer cũ vẫn đang xử lý → duplicate processing (lại cần idempotency).
- **Route 53 health check + failover routing**: circuit breaker ở tầng DNS — endpoint fail liên tiếp quá ngưỡng thì rút khỏi rotation, trỏ traffic sang region/record dự phòng; health check hồi phục đóng vai trò half-open probe.
- **ALB + ECS/App Mesh (→ ECS Service Connect / VPC Lattice)**: ALB health check loại target hỏng khỏi target group (cô lập kiểu bulkhead theo instance). Tầng mesh — App Mesh (đã được AWS chuyển hướng sang ECS Service Connect và VPC Lattice từ 2024-2026) — cho cấu hình retry policy, timeout, outlier detection (tự loại host lỗi — circuit breaking per-host) ở tầng hạ tầng, không cần sửa code. Nhưng nhớ bài học #2: mesh đã retry thì app nhường quyền retry cho mesh.
- **API Gateway**: timeout tích hợp tối đa mặc định 29s (nay có thể nới cho REST API regional) — đây là "ngân sách tổng" mà mọi tầng sau phải chia nhau; throttling (rate + burst limit) chính là load shedding được quản lý sẵn, trả 429 cho client.
- **ElastiCache (Redis/Valkey)**: nơi chứa fallback "stale value" và counter cho retry budget/rate limiter phân tán; đồng thời là dependency cần timeout + pool riêng như mọi downstream khác.
- **RDS/Aurora + RDS Proxy**: RDS Proxy là bulkhead/connection-pool isolation được quản lý — gom và giới hạn connection từ hàng nghìn Lambda/container, tránh cạn `max_connections` của database, và rút ngắn failover.
- **Lambda**: async invocation có sẵn retry (2 lần) + DLQ/failure destination — lại một tầng retry có sẵn cần tính vào sơ đồ amplification của bạn trước khi tự thêm retry trong handler.
