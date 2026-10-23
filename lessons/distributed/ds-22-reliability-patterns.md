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

Mô phỏng đúng code trên (`base=0.1`, `max_attempts=4` → 3 lần retry), giả sử downstream lỗi trả về ngay cho mọi lần thử. Hình A: backoff cứng, cả 1000 retry rơi đúng một khoảnh khắc ở 100, 300, 700ms. Hình B: full jitter rải cùng 3000 retry đó ra 0–700ms.

<auto-anim data-dur="12">
<svg viewBox="0 0 520 428" role="img" aria-labelledby="ds22a-t ds22a-d" font-family="ui-sans-serif, system-ui, sans-serif" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto"><title id="ds22a-t">Retry đồng loạt với backoff cứng so với backoff có full jitter</title><desc id="ds22a-d">1000 client gặp lỗi cùng lúc ở t=0 và mỗi client retry tối đa 3 lần, giả sử mọi lần thử đều lỗi ngay. Backoff cứng 100, 200, 400ms khiến cả 1000 retry dội vào downstream cùng một khoảnh khắc ở 100, 300 và 700ms. Full jitter rải retry trên 0 đến 700ms, đỉnh mỗi khe 25ms chỉ còn khoảng 367. Cả hai cách downstream đều nhận 1000 request gốc cộng 3000 retry, tức 4000, gấp 4 lần; retry budget 10% giới hạn còn 1100.</desc><text x="10" y="22" font-size="14" font-weight="700" fill="currentColor">1000 client lỗi cùng lúc ở t=0, mỗi client retry ≤ 3 lần</text><text x="10" y="42" font-size="13" fill="currentColor" opacity="0.75">mỗi cột = số retry dội vào downstream trong 25ms</text><text x="10" y="72" font-size="13" font-weight="700" fill="currentColor">A. Backoff cứng 100 → 200 → 400ms</text><rect x="60" y="82" width="440" height="100" fill="#f43f5e" fill-opacity="0.05"/><line x1="60" y1="182" x2="500" y2="182" stroke="currentColor" stroke-opacity="0.5"/><text x="54" y="186.0" font-size="13" text-anchor="end" fill="currentColor" opacity="0.7">0</text><text x="54" y="136.0" font-size="13" text-anchor="end" fill="currentColor" opacity="0.7">500</text><line x1="60" y1="132.0" x2="500" y2="132.0" stroke="currentColor" stroke-opacity="0.12" stroke-dasharray="3 3"/><text x="54" y="86.0" font-size="13" text-anchor="end" fill="currentColor" opacity="0.7">1000</text><line x1="60" y1="82.0" x2="500" y2="82.0" stroke="currentColor" stroke-opacity="0.12" stroke-dasharray="3 3"/><rect x="116.0" y="82.0" width="11.8" height="100.0" fill="#f43f5e" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.1253;0.1263;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="226.0" y="82.0" width="11.8" height="100.0" fill="#f43f5e" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.3177;0.3187;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="446.0" y="82.0" width="11.8" height="100.0" fill="#f43f5e" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.7027;0.7037;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><text x="500" y="72" font-size="13" text-anchor="end" fill="currentColor" opacity="1">retry đã gửi: 0<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.1253;0.1263;1.0000" values="1;1;0;0"/></text><text x="500" y="72" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 1000<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.1253;0.1263;0.3177;0.3187;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="72" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 2000<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.3177;0.3187;0.7027;0.7037;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="72" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 3000<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.7027;0.7037;0.9690;0.9700;1.0000" values="0;0;1;1;0;0"/></text><text x="132.8" y="98" font-size="13" fill="#f43f5e" font-weight="700" opacity="0">1000<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.1253;0.1263;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></text><text x="242.8" y="98" font-size="13" fill="#f43f5e" font-weight="700" opacity="0">1000<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.3177;0.3187;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></text><text x="462.8" y="98" font-size="13" fill="#f43f5e" font-weight="700" opacity="0">1000<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.7027;0.7037;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></text><text x="10" y="224" font-size="13" font-weight="700" fill="currentColor">B. Full jitter: random(0, backoff)</text><rect x="60" y="234" width="440" height="100" fill="#10b981" fill-opacity="0.05"/><line x1="60" y1="334" x2="500" y2="334" stroke="currentColor" stroke-opacity="0.5"/><text x="54" y="338.0" font-size="13" text-anchor="end" fill="currentColor" opacity="0.7">0</text><text x="54" y="288.0" font-size="13" text-anchor="end" fill="currentColor" opacity="0.7">500</text><line x1="60" y1="284.0" x2="500" y2="284.0" stroke="currentColor" stroke-opacity="0.12" stroke-dasharray="3 3"/><text x="54" y="238.0" font-size="13" text-anchor="end" fill="currentColor" opacity="0.7">1000</text><line x1="60" y1="234.0" x2="500" y2="234.0" stroke="currentColor" stroke-opacity="0.12" stroke-dasharray="3 3"/><rect x="61.0" y="307.5" width="11.8" height="26.5" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.0290;0.0300;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="74.8" y="302.3" width="11.8" height="31.7" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.0531;0.0541;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="88.5" y="300.6" width="11.8" height="33.4" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.0771;0.0781;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="102.2" y="297.3" width="11.8" height="36.7" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.1012;0.1022;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="116.0" y="317.5" width="11.8" height="16.5" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.1253;0.1263;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="129.8" y="320.9" width="11.8" height="13.1" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.1493;0.1503;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="143.5" y="319.2" width="11.8" height="14.8" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.1734;0.1744;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="157.2" y="318.6" width="11.8" height="15.4" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.1974;0.1984;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="171.0" y="318.2" width="11.8" height="15.8" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.2215;0.2225;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="184.8" y="319.9" width="11.8" height="14.1" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.2456;0.2466;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="198.5" y="322.7" width="11.8" height="11.3" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.2696;0.2706;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="212.2" y="326.5" width="11.8" height="7.5" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.2937;0.2947;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="226.0" y="327.6" width="11.8" height="6.4" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.3177;0.3187;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="239.8" y="327.0" width="11.8" height="7.0" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.3418;0.3428;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="253.5" y="327.1" width="11.8" height="6.9" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.3659;0.3669;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="267.2" y="328.3" width="11.8" height="5.7" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.3899;0.3909;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="281.0" y="327.4" width="11.8" height="6.6" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.4140;0.4150;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="294.8" y="328.9" width="11.8" height="5.1" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.4381;0.4391;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="308.5" y="328.4" width="11.8" height="5.6" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.4621;0.4631;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="322.2" y="329.3" width="11.8" height="4.7" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.4862;0.4872;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="336.0" y="329.9" width="11.8" height="4.1" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.5102;0.5112;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="349.8" y="330.2" width="11.8" height="3.8" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.5343;0.5353;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="363.5" y="330.7" width="11.8" height="3.3" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.5584;0.5594;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="377.2" y="332.9" width="11.8" height="1.1" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.5824;0.5834;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="391.0" y="332.5" width="11.8" height="1.5" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.6065;0.6075;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="404.8" y="332.9" width="11.8" height="1.1" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.6306;0.6316;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="418.5" y="333.8" width="11.8" height="0.2" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.6546;0.6556;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><rect x="432.2" y="333.9" width="11.8" height="0.1" fill="#10b981" fill-opacity="0.85" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.6787;0.6797;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></rect><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="1">retry đã gửi: 0<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.0290;0.0300;1.0000" values="1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 265<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.0290;0.0300;0.0531;0.0541;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 582<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.0531;0.0541;0.0771;0.0781;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 916<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.0771;0.0781;0.1012;0.1022;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 1283<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.1012;0.1022;0.1253;0.1263;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 1448<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.1253;0.1263;0.1493;0.1503;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 1579<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.1493;0.1503;0.1734;0.1744;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 1727<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.1734;0.1744;0.1974;0.1984;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 1881<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.1974;0.1984;0.2215;0.2225;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 2039<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.2215;0.2225;0.2456;0.2466;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 2180<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.2456;0.2466;0.2696;0.2706;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 2293<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.2696;0.2706;0.2937;0.2947;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 2368<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.2937;0.2947;0.3177;0.3187;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 2432<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.3177;0.3187;0.3418;0.3428;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 2502<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.3418;0.3428;0.3659;0.3669;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 2571<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.3659;0.3669;0.3899;0.3909;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 2628<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.3899;0.3909;0.4140;0.4150;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 2694<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.4140;0.4150;0.4381;0.4391;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 2745<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.4381;0.4391;0.4621;0.4631;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 2801<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.4621;0.4631;0.4862;0.4872;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 2848<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.4862;0.4872;0.5102;0.5112;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 2889<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.5102;0.5112;0.5343;0.5353;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 2927<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.5343;0.5353;0.5584;0.5594;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 2960<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.5584;0.5594;0.5824;0.5834;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 2971<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.5824;0.5834;0.6065;0.6075;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 2986<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.6065;0.6075;0.6306;0.6316;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 2997<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.6306;0.6316;0.6546;0.6556;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 2999<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.6546;0.6556;0.6787;0.6797;1.0000" values="0;0;1;1;0;0"/></text><text x="500" y="224" font-size="13" text-anchor="end" fill="currentColor" opacity="0">retry đã gửi: 3000<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.6787;0.6797;0.9690;0.9700;1.0000" values="0;0;1;1;0;0"/></text><text x="112.1" y="291.3" font-size="13" fill="#10b981" font-weight="700" opacity="0">đỉnh ≈ 367<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.1012;0.1022;0.9700;0.9800;1.0000" values="0;0;1;1;0;0"/></text><text x="60.0" y="352" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.75">0</text><text x="115.0" y="352" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.75">100</text><text x="170.0" y="352" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.75">200</text><text x="225.0" y="352" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.75">300</text><text x="280.0" y="352" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.75">400</text><text x="335.0" y="352" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.75">500</text><text x="390.0" y="352" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.75">600</text><text x="445.0" y="352" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.75">700</text><text x="500.0" y="352" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.75">800</text><text x="500" y="370" font-size="13" text-anchor="end" fill="currentColor" opacity="0.75">thời gian (ms)</text><line x1="60" y1="78" x2="60" y2="334" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"><animate attributeName="x1" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.0300;0.8000;1.0000" values="60;60;500;500"/><animate attributeName="x2" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.0300;0.8000;1.0000" values="60;60;500;500"/></line><text x="10" y="396" font-size="13" fill="currentColor" opacity="0">Cả hai: downstream nhận 1000 gốc + 3000 retry = 4000 (×4)<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.7990;0.8000;0.9690;0.9700;1.0000" values="0;0;1;1;0;0"/></text><text x="10" y="416" font-size="13" fill="currentColor" opacity="0">Jitter chỉ rải đều, không giảm tổng → retry budget 10%: ≤ 1100<animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0.0000;0.7990;0.8000;0.9690;0.9700;1.0000" values="0;0;1;1;0;0"/></text></svg>
</auto-anim>

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
