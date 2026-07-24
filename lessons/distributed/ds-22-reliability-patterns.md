# Bài 22 — Reliability patterns: timeout, retry, circuit breaker, backpressure

## 1. Mục tiêu
Sau bài này bạn có thể:
- Đặt **timeout hợp lý** cho mọi lời gọi mạng và hiểu **deadline/budget propagation** để không "cộng dồn" timeout theo chuỗi service.
- Retry **đúng cách**: **exponential backoff + jitter**, chỉ retry lỗi **transient** và thao tác **idempotent**, tránh **retry storm**.
- Vẽ và cài đặt **circuit breaker** (closed → open → half-open) — biết vì sao nó cắt được **cascading failure**.
- Dùng **bulkhead** để cô lập tài nguyên, **backpressure / load shedding** để tự bảo vệ, và **rate limiting** bằng **token bucket**.

---

## 2. Lý thuyết

### 2.1 Kẻ thù chung: cascading failure

Analogy: một nút giao thông kẹt cứng. Xe không đi được, dồn ngược ra các tuyến phía sau, các tuyến đó lại dồn tiếp — chỉ một điểm nghẽn mà cả thành phố tê liệt. Trong hệ phân tán, một service downstream chậm/chết sẽ làm caller **giữ kết nối chờ**, cạn thread/connection pool, rồi chính caller cũng "chậm" với **service gọi nó** — sập lan truyền ngược lên toàn hệ. Đây là **cascading failure**.

Bản chất: khi B chậm, mỗi request tới A **giữ tài nguyên của A lâu hơn**. Với tải không đổi, số request đồng thời (concurrency) = throughput × latency (**định luật Little**). Latency tăng 10× thì số request "đang bay" tăng 10× → pool cạn → A từ chối cả những request lẽ ra phục vụ được. Toàn bộ các pattern dưới đây tồn tại để **chặn vòng khuếch đại này**.

<svg viewBox="0 0 700 210" role="img" aria-labelledby="cf-t cf-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="cf-t">Cascading failure lan ngược từ downstream lên upstream</title>
<desc id="cf-d">Service D chậm làm C giữ tài nguyên, C cạn pool kéo theo B rồi A cùng sập theo</desc>
<rect x="20" y="80" width="120" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="102" text-anchor="middle" font-size="13" fill="currentColor">A (edge)</text>
<text x="80" y="120" text-anchor="middle" font-size="10" fill="currentColor">pool cạn</text>
<rect x="180" y="80" width="120" height="50" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="240" y="102" text-anchor="middle" font-size="13" fill="currentColor">B</text>
<text x="240" y="120" text-anchor="middle" font-size="10" fill="currentColor">chờ C, cạn pool</text>
<rect x="340" y="80" width="120" height="50" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="400" y="102" text-anchor="middle" font-size="13" fill="currentColor">C</text>
<text x="400" y="120" text-anchor="middle" font-size="10" fill="currentColor">chờ D</text>
<rect x="500" y="80" width="120" height="50" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="560" y="102" text-anchor="middle" font-size="13" fill="currentColor">D (chậm/chết)</text>
<text x="560" y="120" text-anchor="middle" font-size="10" fill="currentColor">gốc sự cố</text>
<line x1="140" y1="105" x2="178" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#cfa)"/>
<line x1="300" y1="105" x2="338" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#cfa)"/>
<line x1="460" y1="105" x2="498" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#cfa)"/>
<text x="350" y="30" text-anchor="middle" font-size="12" fill="#f43f5e">áp lực lan NGƯỢC lên upstream</text>
<line x1="560" y1="60" x2="80" y2="60" stroke="#f43f5e" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#cfa)"/>
<defs><marker id="cfa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

---

### 2.2 Timeout — luật số 1

**Không bao giờ gọi mạng mà không có timeout.** Một lời gọi không timeout là một lời gọi có thể chờ **vô hạn** — và một request treo vĩnh viễn chính là hạt giống của cascading failure.

Cách chọn con số: đo **latency phân phối** của downstream (p50, p99, p999), đặt timeout hơi trên **p99.9** ở đường bình thường — đủ rộng để không cắt oan request khoẻ, đủ chặt để không ôm request bệnh. Ví dụ downstream p99 = 40ms, p999 = 120ms → timeout ~250–300ms là hợp lý; đặt 30s là "tự sát".

**Phân biệt hai loại timeout:**

| Loại | Ý nghĩa | Rủi ro nếu quá dài |
|------|---------|--------------------|
| **Connection timeout** | Thời gian bắt tay TCP/TLS | Treo ngay khi downstream không nhận kết nối |
| **Request (read) timeout** | Thời gian chờ response sau khi đã kết nối | Giữ thread/connection khi downstream xử lý lâu |

#### Deadline / budget propagation

Sai lầm kinh điển: mỗi service tự đặt timeout 1s độc lập. Chuỗi A→B→C→D, mỗi hop 1s, thì A có thể chờ tới ~3s dù A "nghĩ" mình chỉ chờ 1s — và khi A đã bỏ cuộc thì B, C, D **vẫn còn cắm đầu làm việc thừa** (wasted work), càng làm nghẽn thêm.

Đúng: truyền **deadline tuyệt đối** (mốc thời gian phải xong) đi kèm request. Mỗi hop tính **budget còn lại = deadline − now**, nếu ≤ 0 thì **fail-fast ngay**, khỏi gọi tiếp. gRPC làm sẵn qua `context.WithTimeout` + gRPC deadline; HTTP thì truyền header `X-Deadline` / `grpc-timeout`.

```go
// Go: deadline propagation qua context — budget tự co lại mỗi hop
func handleA(ctx context.Context) error {
    // A cấp tổng ngân sách 800ms cho cả chuỗi phía dưới
    ctx, cancel := context.WithTimeout(ctx, 800*time.Millisecond)
    defer cancel()
    return callB(ctx) // ctx mang deadline tuyệt đối; B, C... thừa hưởng phần CÒN LẠI
}

func callB(ctx context.Context) error {
    // Nếu budget đã cạn thì fail-fast, không tốn công gọi downstream
    if deadline, ok := ctx.Deadline(); ok && time.Until(deadline) <= 0 {
        return context.DeadlineExceeded
    }
    req, _ := http.NewRequestWithContext(ctx, "GET", "http://svc-c/data", nil)
    resp, err := http.DefaultClient.Do(req) // tự huỷ khi ctx hết hạn
    if err != nil {
        return err
    }
    defer resp.Body.Close()
    return nil
}
```

---

### 2.3 Retry — con dao hai lưỡi

Retry cứu các lỗi **transient** (rớt gói, node vừa restart, leader election thoáng qua). Nhưng retry **ngây thơ** là dầu đổ vào lửa: downstream đang quá tải, ta retry → nhân đôi/ba tải → nó chết hẳn. Đó là **retry storm**.

**Ba quy tắc bắt buộc khi retry:**

**(1) Chỉ retry lỗi transient + thao tác idempotent.**
- Transient: timeout, `503 Service Unavailable`, `429 Too Many Requests`, connection reset. **KHÔNG** retry `400`, `401`, `404`, `409` — lỗi do request, retry vô ích.
- Idempotent: `GET`, `PUT`, `DELETE` retry an toàn. `POST` (trừ tiền, tạo đơn) retry có thể **nhân đôi tác dụng** → phải kèm **idempotency key** (xem Bài 7) thì mới được retry.

**(2) Exponential backoff.** Đừng retry ngay lập tức. Chờ tăng theo hàm mũ: 100ms, 200ms, 400ms, 800ms... cho downstream thời gian hồi phục. Luôn có **cap** (trần, ví dụ 2s) và **giới hạn số lần** (ví dụ 3 lần).

**(3) Jitter.** Nếu 1000 client cùng backoff cứng "200ms, 400ms..." chúng sẽ **retry đồng loạt cùng thời điểm** → sóng tải nhịp nhàng đập vào downstream (thundering herd). Thêm **ngẫu nhiên hoá** để rải đều. Công thức khuyến nghị (AWS "full jitter"):

```
sleep = random(0, min(cap, base * 2^attempt))
```

```python
import random, time

def retry_with_backoff(fn, max_attempts=4, base=0.1, cap=2.0):
    for attempt in range(max_attempts):
        try:
            return fn()
        except TransientError:               # CHỈ bắt lỗi transient
            if attempt == max_attempts - 1:
                raise                        # hết lượt -> ném ra, đừng nuốt
            backoff = min(cap, base * (2 ** attempt))
            time.sleep(random.uniform(0, backoff))  # full jitter
        # PermanentError (4xx) KHÔNG bắt ở đây -> ném thẳng, không retry
```

**(4) Retry budget.** Ngoài giới hạn per-request, đặt trần **tỉ lệ retry toàn cục** (ví dụ retry ≤ 10% số request gốc). Khi vượt ngưỡng thì **ngừng retry** — dấu hiệu downstream đang sự cố hệ thống chứ không phải lỗi lẻ tẻ. Đây là cầu nối tự nhiên sang circuit breaker.

> **Nguyên tắc vàng:** retry chỉ nên diễn ra ở **một tầng**. Nếu A retry B, B retry C, C retry D — thì D nhận **số lần retry nhân lên theo cấp số nhân** (3×3×3 = 27 lần cho một request gốc). Chọn retry ở tầng gần client nhất, các tầng trong **fail-fast**.

---

### 2.4 Circuit breaker — cầu dao tự ngắt

Analogy: cầu dao điện trong nhà. Khi chập mạch, cầu dao **tự ngắt** để không cháy cả nhà; sau một lúc bạn **thử bật lại** — nếu vẫn chập thì ngắt tiếp, nếu ổn thì đóng hẳn. Circuit breaker làm y hệt cho lời gọi service.

Ý tưởng cốt lõi: khi downstream đang chết, **retry cũng vô ích và còn hại**. Thay vì cho mọi request lao vào chờ timeout rồi fail, circuit breaker **fail ngay lập tức** (fail-fast) — trả lỗi/fallback tức thì, **giải phóng thread**, cho downstream không gian hồi phục. Ba trạng thái:

| Trạng thái | Hành vi | Chuyển tiếp |
|-----------|---------|-------------|
| **Closed** (bình thường) | Cho request đi qua; đếm lỗi | Lỗi vượt ngưỡng (ví dụ ≥50% trong cửa sổ) → **Open** |
| **Open** (đã ngắt) | **Fail-fast ngay**, không gọi downstream; trả fallback | Sau `cooldown` (ví dụ 30s) → **Half-Open** |
| **Half-Open** (thăm dò) | Cho **vài** request thử qua | Thử thành công → **Closed**; thất bại → **Open** lại |

<svg viewBox="0 0 660 320" role="img" aria-labelledby="cb-t cb-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="cb-t">State machine của circuit breaker</title>
<desc id="cb-d">Ba trạng thái Closed, Open, Half-Open với các điều kiện chuyển giữa chúng</desc>
<rect x="240" y="20" width="180" height="66" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="330" y="48" text-anchor="middle" font-size="15" fill="currentColor">CLOSED</text>
<text x="330" y="70" text-anchor="middle" font-size="11" fill="currentColor">cho qua, đếm lỗi</text>
<rect x="40" y="220" width="180" height="66" rx="10" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="130" y="248" text-anchor="middle" font-size="15" fill="currentColor">OPEN</text>
<text x="130" y="270" text-anchor="middle" font-size="11" fill="currentColor">fail-fast, chặn hết</text>
<rect x="440" y="220" width="180" height="66" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="530" y="248" text-anchor="middle" font-size="15" fill="currentColor">HALF-OPEN</text>
<text x="530" y="270" text-anchor="middle" font-size="11" fill="currentColor">cho vài req thử</text>
<line x1="245" y1="72" x2="150" y2="218" stroke="currentColor" stroke-width="1.5" marker-end="url(#cba)"/>
<text x="140" y="140" text-anchor="middle" font-size="11" fill="#f43f5e">lỗi vượt ngưỡng</text>
<line x1="220" y1="240" x2="438" y2="240" stroke="currentColor" stroke-width="1.5" marker-end="url(#cba)"/>
<text x="330" y="232" text-anchor="middle" font-size="11" fill="currentColor">hết cooldown (30s)</text>
<line x1="500" y1="218" x2="400" y2="74" stroke="currentColor" stroke-width="1.5" marker-end="url(#cba)"/>
<text x="500" y="150" text-anchor="middle" font-size="11" fill="#10b981">thử OK</text>
<path d="M530 286 q -10 34 -60 20 q -40 -12 -30 -46" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#cba)"/>
<text x="470" y="312" text-anchor="middle" font-size="11" fill="#f43f5e">thử FAIL → Open lại</text>
<defs><marker id="cba" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

#### Cài đặt circuit breaker (Go, thread-safe)

```go
package breaker

import (
    "errors"
    "sync"
    "time"
)

type State int

const (
    Closed State = iota
    Open
    HalfOpen
)

var ErrOpen = errors.New("circuit breaker is open") // fail-fast không gọi downstream

type Breaker struct {
    mu           sync.Mutex
    state        State
    failures     int           // số lỗi liên tiếp ở trạng thái Closed
    threshold    int           // ngưỡng lỗi -> mở
    cooldown     time.Duration // thời gian ở Open trước khi thử
    openedAt     time.Time     // mốc chuyển sang Open
    halfOpenReqs int           // số request thử đã cho qua ở Half-Open
    halfOpenMax  int           // tối đa request thử đồng thời
}

func New(threshold int, cooldown time.Duration) *Breaker {
    return &Breaker{state: Closed, threshold: threshold, cooldown: cooldown, halfOpenMax: 1}
}

// Allow: gọi TRƯỚC khi thực hiện request. false => phải fail-fast.
func (b *Breaker) Allow() bool {
    b.mu.Lock()
    defer b.mu.Unlock()
    switch b.state {
    case Open:
        // Hết cooldown thì chuyển sang thăm dò
        if time.Since(b.openedAt) >= b.cooldown {
            b.state = HalfOpen
            b.halfOpenReqs = 0
        } else {
            return false // vẫn Open -> chặn
        }
        fallthrough
    case HalfOpen:
        if b.halfOpenReqs >= b.halfOpenMax {
            return false // đã đủ request thử, chặn phần còn lại
        }
        b.halfOpenReqs++
        return true
    default: // Closed
        return true
    }
}

// OnSuccess / OnFailure: gọi SAU khi có kết quả để cập nhật trạng thái.
func (b *Breaker) OnSuccess() {
    b.mu.Lock()
    defer b.mu.Unlock()
    if b.state == HalfOpen {
        b.state = Closed // thử thành công -> đóng lại
    }
    b.failures = 0
}

func (b *Breaker) OnFailure() {
    b.mu.Lock()
    defer b.mu.Unlock()
    if b.state == HalfOpen {
        b.trip() // thử mà lỗi -> mở lại ngay
        return
    }
    b.failures++
    if b.failures >= b.threshold {
        b.trip()
    }
}

func (b *Breaker) trip() {
    b.state = Open
    b.openedAt = time.Now()
}
```

Cách dùng — bọc quanh lời gọi downstream:

```go
func callWithBreaker(b *Breaker, do func() error) error {
    if !b.Allow() {
        return ErrOpen // fail-fast: trả về ngay, có thể kèm fallback (cache cũ, giá trị mặc định)
    }
    err := do()
    if err != nil {
        b.OnFailure()
        return err
    }
    b.OnSuccess()
    return nil
}
```

**Lưu ý cài đặt thực chiến:**
- Đếm lỗi theo **cửa sổ trượt theo tỉ lệ** (ví dụ ≥50% lỗi trên tối thiểu 20 request) tốt hơn "N lỗi liên tiếp" — tránh mở oan khi tải thấp.
- **Chỉ tính lỗi hệ thống** (timeout, 5xx) vào ngưỡng; **không** tính 4xx (lỗi client) — nếu không một loạt 404 sẽ mở nhầm cầu dao.
- Có **fallback** rõ ràng khi Open: trả cache cũ, giá trị mặc định, hoặc lỗi thân thiện — đừng để nghiệp vụ vỡ.
- Production nên dùng thư viện chín: **resilience4j** (Java), **Polly** (.NET), **gobreaker/sony** (Go), **Hystrix** (đã ngừng phát triển nhưng là kinh điển).

---

### 2.5 Bulkhead — cô lập tài nguyên

Analogy: khoang chống chìm của tàu thuỷ. Thân tàu chia nhiều **khoang kín**; một khoang thủng thì nước không tràn sang khoang khác, tàu vẫn nổi. Bulkhead cô lập tài nguyên để **một downstream chết không nuốt hết pool** của cả service.

Nếu tất cả lời gọi (tới Payment, tới Recommendation, tới Search) **dùng chung một thread pool 100 luồng**, chỉ cần Recommendation chậm là 100 luồng bị nó chiếm hết → Payment (quan trọng) cũng không có luồng để chạy. Bulkhead: **chia pool riêng** cho từng downstream (ví dụ Payment 60, Recommendation 20, Search 20). Recommendation chết chỉ ăn hết 20 luồng của nó; 80 luồng còn lại vẫn phục vụ Payment và Search.

Trong Kubernetes, bulkhead còn ở tầng hạ tầng: **resource limits** (CPU/memory) per pod, tách **node pool**, hoặc chạy tính năng rủi ro ở **deployment riêng** để lỗi không lây.

---

### 2.6 Backpressure & load shedding — biết từ chối

Khi tải đến vượt năng lực xử lý, có hai lựa chọn: **xếp hàng vô hạn** (queue phình to → latency phình theo Little's Law → cuối cùng OOM và chết toàn bộ) hoặc **từ chối bớt** để phần còn lại được phục vụ tử tế. Hệ thống trưởng thành chọn cách hai.

- **Backpressure**: đẩy tín hiệu "chậm lại" **ngược về nguồn**. Ví dụ: bounded queue đầy → producer bị chặn (blocking) hoặc TCP window thu nhỏ; reactive streams (Reactor, RSocket) truyền tín hiệu `request(n)` để consumer điều tiết producer. Nguồn tự giảm tốc thay vì hệ dưới vỡ.
- **Load shedding**: khi quá tải, **chủ động drop** request ngay ở cửa (trả `503` + `Retry-After`), ưu tiên request quan trọng. Tốt hơn nhiều so với để mọi request cùng chậm rồi cùng timeout. Nguyên tắc: **fail fast, fail cheap** — từ chối sớm ở lớp rẻ nhất.

> Một hàng đợi **có giới hạn (bounded)** là bạn của bạn; hàng đợi **không giới hạn** là quả bom hẹn giờ. Queue đầy = tín hiệu sức khoẻ, hãy dùng nó để shed tải, đừng giấu nó bằng cách nới queue.

---

### 2.7 Rate limiting — token bucket

Rate limiting đặt **trần tốc độ** request để bảo vệ hệ khỏi bị dội (dù do client lỗi, retry storm, hay tấn công). Thuật toán phổ biến nhất là **token bucket** vì nó cho phép **burst có kiểm soát**:

- Một "xô" chứa tối đa `capacity` token; token được **đổ thêm đều đặn** `refill` token/giây.
- Mỗi request lấy 1 token. Còn token → cho qua; hết token → từ chối (`429`) hoặc chờ.
- Xô đầy = cho phép **burst** tức thời tới `capacity`; nhưng tốc độ trung bình dài hạn bị chặn ở `refill`.

```python
import time

class TokenBucket:
    def __init__(self, capacity: float, refill_per_sec: float):
        self.capacity = capacity          # cho phép burst tối đa
        self.refill = refill_per_sec      # tốc độ trung bình dài hạn
        self.tokens = capacity
        self.last = time.monotonic()

    def allow(self, cost: float = 1.0) -> bool:
        now = time.monotonic()
        # Lazy refill: cộng token theo thời gian trôi qua (không cần timer nền)
        self.tokens = min(self.capacity, self.tokens + (now - self.last) * self.refill)
        self.last = now
        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False                      # hết token -> 429 Too Many Requests

# Ví dụ: trung bình 100 req/s, cho phép dồn tối đa 200 req tức thời
bucket = TokenBucket(capacity=200, refill_per_sec=100)
```

So sánh nhanh với các thuật toán khác:

| Thuật toán | Đặc điểm | Khi dùng |
|-----------|----------|----------|
| **Token bucket** | Cho burst tới capacity, trung bình = refill | Mặc định tốt cho API |
| **Leaky bucket** | Làm phẳng tuyệt đối, không cho burst | Cần output rate ổn định (traffic shaping) |
| **Fixed window** | Đơn giản; lỗi "biên cửa sổ" cho 2× burst | Đếm thô, ít khắt khe |
| **Sliding window log** | Chính xác nhất, tốn bộ nhớ | Cần chính xác cao |

Trong hệ phân tán, rate limit toàn cục thường đặt ở **API gateway** (Envoy, Kong, NGINX) hoặc dùng Redis (`INCR` + `EXPIRE`, hoặc script Lua token bucket) để **chia sẻ counter** giữa nhiều instance.

---

## 3. Ghép tất cả lại — thứ tự đúng

Các pattern không loại trừ nhau; chúng **xếp lớp**. Một lời gọi downstream chắc chắn nên đi qua chuỗi:

<svg viewBox="0 0 700 130" role="img" aria-labelledby="st-t st-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="st-t">Thứ tự xếp lớp các reliability pattern quanh một lời gọi</title>
<desc id="st-d">Request đi qua rate limit, bulkhead, circuit breaker, timeout, rồi retry bọc ngoài</desc>
<rect x="14" y="45" width="120" height="46" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="74" y="65" text-anchor="middle" font-size="11" fill="currentColor">Rate limit</text>
<text x="74" y="80" text-anchor="middle" font-size="10" fill="currentColor">(token bucket)</text>
<rect x="150" y="45" width="110" height="46" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="205" y="65" text-anchor="middle" font-size="11" fill="currentColor">Bulkhead</text>
<text x="205" y="80" text-anchor="middle" font-size="10" fill="currentColor">(pool riêng)</text>
<rect x="276" y="45" width="120" height="46" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="336" y="65" text-anchor="middle" font-size="11" fill="currentColor">Circuit breaker</text>
<text x="336" y="80" text-anchor="middle" font-size="10" fill="currentColor">(fail-fast)</text>
<rect x="412" y="45" width="110" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="467" y="65" text-anchor="middle" font-size="11" fill="currentColor">Timeout</text>
<text x="467" y="80" text-anchor="middle" font-size="10" fill="currentColor">(+ deadline)</text>
<rect x="538" y="45" width="110" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="593" y="65" text-anchor="middle" font-size="11" fill="currentColor">Downstream</text>
<line x1="134" y1="68" x2="148" y2="68" stroke="currentColor" stroke-width="1.5" marker-end="url(#sta)"/>
<line x1="260" y1="68" x2="274" y2="68" stroke="currentColor" stroke-width="1.5" marker-end="url(#sta)"/>
<line x1="396" y1="68" x2="410" y2="68" stroke="currentColor" stroke-width="1.5" marker-end="url(#sta)"/>
<line x1="522" y1="68" x2="536" y2="68" stroke="currentColor" stroke-width="1.5" marker-end="url(#sta)"/>
<text x="350" y="24" text-anchor="middle" font-size="11" fill="currentColor">retry (backoff + jitter) bọc NGOÀI cùng, chỉ khi idempotent</text>
<path d="M593 100 q 0 20 -259 20 q -260 0 -260 -20" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#sta)"/>
<defs><marker id="sta" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Logic thứ tự: **rate limit** chặn tải thừa sớm nhất (rẻ nhất); **bulkhead** đảm bảo lời gọi này không nuốt pool của lời gọi khác; **circuit breaker** fail-fast nếu downstream đang chết; **timeout** chặn treo vô hạn cho từng lần thử; **retry** bọc ngoài cùng nhưng **chỉ retry khi thao tác idempotent** và **feed kết quả vào circuit breaker** (mỗi lần fail đều `OnFailure`). Thiếu một lớp là để hở một đường cho cascading failure.

---

## 4. Ví dụ thực tế & con số

Sự cố kinh điển AWS/Netflix: một service phụ (gợi ý) chậm 2s. Không có bảo vệ: mỗi request tới edge giữ thread 2s, edge có 200 thread → chỉ chịu được **100 req/s** thay vì 10.000 req/s bình thường → 99% người dùng thấy trang trắng dù **Payment và Catalog vẫn khoẻ**.

Sau khi thêm bảo vệ: circuit breaker mở sau 50% lỗi, service gợi ý bị **fail-fast trong <1ms**, trang vẫn render (chỉ thiếu ô gợi ý — fallback rỗng), thread được giải phóng ngay, edge tiếp tục chịu 10.000 req/s. Một tính năng phụ **degrade** thay vì kéo sập cả trang — đó chính là **graceful degradation**, thành quả của cả bộ pattern này.

---

## 5. Tóm tắt
- Kẻ thù là **cascading failure**: downstream chậm → caller cạn pool → sập lan ngược. Mọi pattern ở đây đều để cắt vòng khuếch đại này.
- **Timeout**: luôn đặt, chọn quanh p99.9; truyền **deadline/budget** xuyên chuỗi để fail-fast và không làm việc thừa.
- **Retry**: chỉ với lỗi **transient** + thao tác **idempotent**; **exponential backoff + jitter**; có cap, giới hạn lần, và **retry budget**; retry ở **một tầng**.
- **Circuit breaker**: **closed → open → half-open**; fail-fast khi downstream chết để nó hồi phục; đếm theo tỉ lệ, chỉ tính lỗi hệ thống, có fallback.
- **Bulkhead**: pool/tài nguyên riêng để một downstream chết không nuốt cả service.
- **Backpressure / load shedding**: hàng đợi **bounded**, đẩy tín hiệu chậm lại về nguồn, chủ động shed tải quá mức — fail fast, fail cheap.
- **Rate limiting**: **token bucket** cho burst có kiểm soát; đặt ở gateway/Redis cho giới hạn toàn cục.
- Ghép lại theo thứ tự **rate limit → bulkhead → circuit breaker → timeout → (retry bọc ngoài)** để có **graceful degradation**.

> **Bài tiếp theo (Bài 23):** khi đã chống được sự cố lan truyền, ta cần **quan sát** hệ thống để biết chuyện gì đang xảy ra — **observability: metrics, logs, tracing** và bốn tín hiệu vàng (latency, traffic, errors, saturation).
