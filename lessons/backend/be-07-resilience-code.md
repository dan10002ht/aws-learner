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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Timeout budget giảm dần xuyên call chain</title>
  <desc>Edge cấp deadline tổng 3000ms. Mỗi tầng tiêu một phần và chừa reserve, truyền phần còn lại xuống tầng trong; tầng trong luôn có budget nhỏ hơn tầng ngoài: Edge 3000ms, Service A còn 2800ms, Service B còn 2600ms, DB còn 2400ms.</desc>
  <g font-size="11.5">
    <rect x="20" y="24" width="380" height="44" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="36" y="44" font-size="13" font-weight="700" fill="currentColor">Edge</text>
    <text x="36" y="60" fill="currentColor" opacity="0.75">nhận request, budget tổng = 3000ms</text>
    <rect x="408" y="32" width="120" height="28" rx="14" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="468" y="51" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">3000ms</text>
    <rect x="64" y="94" width="380" height="44" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="80" y="114" font-size="13" font-weight="700" fill="currentColor">Service A</text>
    <text x="80" y="130" fill="currentColor" opacity="0.75">tiêu ~100ms + reserve → truyền xuống</text>
    <rect x="452" y="102" width="120" height="28" rx="14" fill="#10b981" fill-opacity="0.9"/>
    <text x="512" y="121" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">~2800ms</text>
    <rect x="108" y="164" width="380" height="44" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="124" y="184" font-size="13" font-weight="700" fill="currentColor">Service B</text>
    <text x="124" y="200" fill="currentColor" opacity="0.75">timeout = min(local_max, remaining − reserve)</text>
    <rect x="496" y="172" width="120" height="28" rx="14" fill="#f59e0b" fill-opacity="0.95"/>
    <text x="556" y="191" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">~2600ms</text>
    <rect x="152" y="234" width="380" height="44" rx="9" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="168" y="254" font-size="13" font-weight="700" fill="currentColor">DB</text>
    <text x="168" y="270" fill="currentColor" opacity="0.75">timeout = remaining_của_B − reserve</text>
    <rect x="540" y="242" width="120" height="28" rx="14" fill="#8b5cf6" fill-opacity="0.95"/>
    <text x="600" y="261" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">~2400ms</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.45" fill="none" stroke-width="1.4">
    <path d="M40 68 V112 H64"/>
    <path d="M84 138 V182 H108"/>
    <path d="M128 208 V252 H152"/>
  </g>
  <text x="690" y="150" font-size="11" text-anchor="end" fill="currentColor" opacity="0.7" transform="rotate(90 690 150)">tầng trong nhỏ hơn tầng ngoài · luôn chừa reserve</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Retry storm và amplification qua 4 tầng</title>
  <desc>Khi mỗi tầng trong chuỗi Client, API, Service A, Service B đều retry 4 lần, một request gốc nhân thành 4 lũy thừa 4 bằng 256 lần gọi DB. So với retry chỉ một tầng thì DB chỉ nhận 4 lần.</desc>
  <defs>
    <marker id="rsArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="16" y="24" font-size="13" font-weight="700" fill="#ef4444">SAI — retry chồng ở mọi tầng</text>
  <g font-size="12">
    <g>
      <rect x="20" y="40" width="96" height="40" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.4"/>
      <text x="68" y="60" text-anchor="middle" font-weight="700" fill="currentColor">Client</text>
      <text x="68" y="74" text-anchor="middle" font-size="10" fill="#ef4444">×4</text>
    </g>
    <g>
      <rect x="172" y="40" width="96" height="40" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.4"/>
      <text x="220" y="60" text-anchor="middle" font-weight="700" fill="currentColor">API</text>
      <text x="220" y="74" text-anchor="middle" font-size="10" fill="#ef4444">×4</text>
    </g>
    <g>
      <rect x="324" y="40" width="96" height="40" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.4"/>
      <text x="372" y="58" text-anchor="middle" font-weight="700" fill="currentColor">Service A</text>
      <text x="372" y="74" text-anchor="middle" font-size="10" fill="#ef4444">×4</text>
    </g>
    <g>
      <rect x="476" y="40" width="96" height="40" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.4"/>
      <text x="524" y="58" text-anchor="middle" font-weight="700" fill="currentColor">Service B</text>
      <text x="524" y="74" text-anchor="middle" font-size="10" fill="#ef4444">×4</text>
    </g>
    <g>
      <rect x="624" y="36" width="80" height="48" rx="9" fill="#ef4444" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.5"/>
      <text x="664" y="64" text-anchor="middle" font-weight="700" fill="currentColor">DB</text>
    </g>
  </g>
  <g stroke="currentColor" stroke-opacity="0.6" fill="none" stroke-width="1.6">
    <path d="M116 60 H172" marker-end="url(#rsArrow)"/>
    <path d="M268 60 H324" marker-end="url(#rsArrow)"/>
    <path d="M420 60 H476" marker-end="url(#rsArrow)"/>
    <path d="M572 60 H624" marker-end="url(#rsArrow)"/>
  </g>
  <g font-size="10.5" fill="currentColor" opacity="0.7" text-anchor="middle">
    <text x="144" y="100">×4</text>
    <text x="296" y="100">×16</text>
    <text x="448" y="100">×64</text>
    <text x="598" y="100">×256</text>
  </g>
  <rect x="20" y="124" width="684" height="40" rx="9" fill="#ef4444" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="362" y="149" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Tải lên DB xấu nhất = 4 × 4 × 4 × 4 = 4⁴ = 256 lần cho MỘT request gốc</text>
  <text x="16" y="208" font-size="13" font-weight="700" fill="#10b981">ĐÚNG — chỉ một tầng retry, các tầng giữa fail-fast</text>
  <g font-size="12">
    <rect x="20" y="224" width="96" height="40" rx="9" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="68" y="244" text-anchor="middle" font-weight="700" fill="currentColor">Client</text>
    <text x="68" y="258" text-anchor="middle" font-size="10" fill="#10b981">×4</text>
    <rect x="172" y="224" width="96" height="40" rx="9" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="220" y="244" text-anchor="middle" font-weight="700" fill="currentColor">API</text>
    <text x="220" y="258" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.6">×1</text>
    <rect x="324" y="224" width="96" height="40" rx="9" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="372" y="242" text-anchor="middle" font-weight="700" fill="currentColor">Service A</text>
    <text x="372" y="258" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.6">×1</text>
    <rect x="476" y="224" width="96" height="40" rx="9" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="524" y="242" text-anchor="middle" font-weight="700" fill="currentColor">Service B</text>
    <text x="524" y="258" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.6">×1</text>
    <rect x="624" y="220" width="80" height="48" rx="9" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.5"/>
    <text x="664" y="248" text-anchor="middle" font-weight="700" fill="currentColor">DB</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.6" fill="none" stroke-width="1.6">
    <path d="M116 244 H172" marker-end="url(#rsArrow)"/>
    <path d="M268 244 H324" marker-end="url(#rsArrow)"/>
    <path d="M420 244 H476" marker-end="url(#rsArrow)"/>
    <path d="M572 244 H624" marker-end="url(#rsArrow)"/>
  </g>
  <text x="362" y="294" font-size="12.5" font-weight="700" text-anchor="middle" fill="#10b981">Tải lên DB = 4 lần — không bùng nổ</text>
</svg>

Khi DB chậm vì quá tải, amplification này đảm bảo nó **không bao giờ hồi phục được** cho tới khi ai đó tắt bớt traffic bằng tay. Đây là kịch bản đứng sau rất nhiều outage lớn (kể cả các sự cố của chính AWS).

> 💡 Ghi nhớ — quy tắc đặt retry: **retry ở ÍT tầng nhất có thể, lý tưởng là một tầng duy nhất** — thường là tầng gần client nhất có đủ ngữ cảnh để biết lỗi có retryable không. Các tầng giữa: timeout ngắn, fail fast, truyền lỗi lên. Nếu service mesh (Envoy/App Mesh) đã retry, application code đừng retry nữa.

## 3. Circuit Breaker

Retry trả lời câu hỏi "lỗi *này* có thử lại không?". Circuit breaker trả lời câu hỏi cấp cao hơn: "**downstream này còn đáng gọi không?**". Khi downstream hỏng kéo dài, tiếp tục gọi chỉ tốn timeout + tài nguyên + làm nó khó hồi phục.

### Ba trạng thái

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Máy trạng thái Circuit Breaker: CLOSED, OPEN, HALF-OPEN</title>
  <desc>Ba trạng thái: CLOSED gọi bình thường và đếm tỷ lệ lỗi; lỗi vượt ngưỡng chuyển sang OPEN chặn ngay fail-fast; hết open_duration chuyển sang HALF-OPEN cho qua vài request thử; thử thành công về CLOSED, thử thất bại quay lại OPEN.</desc>
  <defs>
    <marker id="cbArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <rect x="24" y="120" width="180" height="76" rx="12" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="114" y="150" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">CLOSED</text>
  <text x="114" y="170" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">gọi bình thường</text>
  <text x="114" y="184" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">đếm tỷ lệ lỗi</text>
  <rect x="516" y="120" width="180" height="76" rx="12" fill="#ef4444" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="606" y="150" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">OPEN</text>
  <text x="606" y="170" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">fail-fast: chặn ngay (~0ms)</text>
  <text x="606" y="184" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">trả lỗi/fallback, không gọi thật</text>
  <rect x="270" y="244" width="180" height="60" rx="12" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="360" y="270" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">HALF-OPEN</text>
  <text x="360" y="290" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">cho qua N request thử</text>
  <g stroke="currentColor" stroke-opacity="0.6" fill="none" stroke-width="1.6">
    <path d="M204 150 H516" marker-end="url(#cbArrow)"/>
    <path d="M516 178 Q360 178 360 244" marker-end="url(#cbArrow)"/>
    <path d="M270 274 Q114 274 114 196" marker-end="url(#cbArrow)"/>
    <path d="M450 256 Q580 240 600 196" marker-end="url(#cbArrow)"/>
  </g>
  <g font-size="11" fill="currentColor">
    <text x="360" y="142" text-anchor="middle" font-weight="600">lỗi vượt ngưỡng</text>
    <text x="448" y="220" text-anchor="middle" opacity="0.85">hết open_duration</text>
    <text x="150" y="232" text-anchor="middle" fill="#10b981" font-weight="600">thử thành công → CLOSED</text>
    <text x="560" y="232" text-anchor="middle" fill="#ef4444" font-weight="600">thử thất bại → OPEN</text>
  </g>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 290" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Bulkhead — cô lập connection pool theo dependency</title>
  <desc>Cách SAI: một shared pool 100 connection dùng chung, recommendation chậm nuốt hết, order và email không lấy được connection. Cách ĐÚNG: phân khoang riêng order 60, recommendation 20, email 10, dự phòng 10, nên recommendation hỏng chỉ làm đầy đúng khoang 20 của nó.</desc>
  <text x="16" y="24" font-size="13" font-weight="700" fill="#ef4444">SAI — shared pool 100, mọi dependency tranh nhau</text>
  <rect x="20" y="36" width="680" height="56" rx="10" fill="#ef4444" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="36" y="68" font-size="12" font-weight="700" fill="currentColor">shared pool: 100</text>
  <rect x="220" y="48" width="380" height="32" rx="7" fill="#ef4444" fill-opacity="0.55"/>
  <text x="410" y="69" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">recommendation chậm nuốt hết 100 connection</text>
  <text x="624" y="60" font-size="10.5" fill="#ef4444">order/email</text>
  <text x="624" y="74" font-size="10.5" fill="#ef4444">bị đói → chết theo</text>
  <text x="16" y="142" font-size="13" font-weight="700" fill="#10b981">ĐÚNG — phân khoang riêng, hỏng chỉ đầy khoang của nó</text>
  <g font-size="12">
    <rect x="20" y="156" width="378" height="64" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.45"/>
    <text x="209" y="180" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">order: 60</text>
    <text x="209" y="200" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">critical — luôn có chỗ</text>
    <rect x="406" y="156" width="120" height="64" rx="10" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/>
    <text x="466" y="180" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">reco: 20</text>
    <rect x="414" y="190" width="104" height="22" rx="5" fill="#ef4444" fill-opacity="0.55"/>
    <text x="466" y="206" font-size="9.5" font-weight="700" text-anchor="middle" fill="#fff">đầy → chỉ kẹt 20</text>
    <rect x="534" y="156" width="80" height="64" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.45"/>
    <text x="574" y="186" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">email: 10</text>
    <text x="574" y="202" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">vẫn chạy</text>
    <rect x="622" y="156" width="78" height="64" rx="10" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.35"/>
    <text x="661" y="186" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">dự phòng</text>
    <text x="661" y="202" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">10</text>
  </g>
  <text x="20" y="248" font-size="11.5" fill="currentColor" opacity="0.8">recommendation hỏng chỉ làm đầy đúng khoang 20 của nó — order (60) và email (10) không hề bị ảnh hưởng.</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 250" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Hedging theo timeline — gửi bản sao khi request đầu vượt p95</title>
  <desc>Thời gian chạy từ trái sang phải. t=0 gửi request tới instance A. Tới t=p95 mà A chưa trả lời thì gửi bản sao tới instance B. Lấy kết quả nào về trước (ở đây là B), rồi cancel cái còn lại (A). Chỉ khoảng 5% request vượt p95 nên bị hedge.</desc>
  <defs>
    <marker id="hgArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <line x1="60" y1="210" x2="700" y2="210" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.4" marker-end="url(#hgArrow)"/>
  <text x="700" y="232" font-size="11" text-anchor="end" fill="currentColor" opacity="0.7">thời gian</text>
  <g stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="3 4">
    <line x1="100" y1="40" x2="100" y2="210"/>
    <line x1="360" y1="40" x2="360" y2="210"/>
    <line x1="560" y1="40" x2="560" y2="210"/>
  </g>
  <g font-size="11" fill="currentColor">
    <text x="100" y="228" text-anchor="middle" font-weight="700">t=0</text>
    <text x="360" y="228" text-anchor="middle" font-weight="700">t=p95</text>
    <text x="560" y="228" text-anchor="middle" opacity="0.8">kết quả về</text>
  </g>
  <text x="20" y="84" font-size="12" font-weight="700" fill="currentColor">instance A</text>
  <rect x="100" y="68" width="500" height="22" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
  <rect x="100" y="68" width="460" height="22" rx="6" fill="#94a3b8" fill-opacity="0.25"/>
  <text x="240" y="84" font-size="10.5" fill="currentColor" opacity="0.75">A xử lý — vẫn chậm, chưa trả lời...</text>
  <text x="20" y="148" font-size="12" font-weight="700" fill="currentColor">instance B</text>
  <rect x="360" y="132" width="200" height="22" rx="6" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="460" y="148" font-size="10.5" font-weight="600" text-anchor="middle" fill="currentColor">B trả kết quả trước</text>
  <line x1="360" y1="79" x2="360" y2="132" stroke="currentColor" stroke-opacity="0.55" stroke-width="1.4" marker-end="url(#hgArrow)"/>
  <text x="372" y="116" font-size="10.5" fill="currentColor">gửi bản sao → B</text>
  <line x1="560" y1="79" x2="560" y2="68" stroke="#ef4444" stroke-opacity="0.7" stroke-width="1.6"/>
  <circle cx="560" cy="79" r="9" fill="#ef4444" fill-opacity="0.85"/>
  <text x="560" y="83" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">✕</text>
  <text x="572" y="58" font-size="10.5" fill="#ef4444" font-weight="600">cancel A (cái thua)</text>
  <text x="100" y="36" font-size="11" fill="currentColor" opacity="0.8">gửi request → A</text>
  <text x="660" y="178" font-size="10.5" text-anchor="end" fill="currentColor" opacity="0.7">chỉ ~5% request vượt p95 → bị hedge, tải tăng ~5%</text>
</svg>

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
