# Reliability Patterns & Testing

Một hệ thống production không "tự nhiên" đáng tin cậy. Reliability là kết quả của thiết kế có chủ đích cộng với việc *chủ động kiểm chứng* các giả định trước khi sự cố thật xảy ra. Bài này đi qua các pattern cốt lõi và — quan trọng hơn — cách *test* chúng để bạn không phát hiện điểm yếu lúc 3 giờ sáng cùng khách hàng.

> 💡 Nguyên tắc
> Hope is not a strategy. Mọi cơ chế chống lỗi mà bạn chưa từng kích hoạt có chủ đích đều phải coi là *chưa hoạt động*. Untested failover = no failover.

---

## 1. Capacity Planning & Headroom

Capacity planning trả lời câu hỏi: "Hệ thống chịu được bao nhiêu tải, và còn dư bao nhiêu trước khi sập?" Headroom là phần dư đó.

### Vì sao cần headroom

Bạn không bao giờ chạy ở 100% công suất. Lý do:

- **Traffic spike**: marketing campaign, viral, retry storm.
- **Loss of capacity**: mất một AZ/region nghĩa là tải dồn sang phần còn lại.
- **Latency phi tuyến**: khi utilization vượt ~70-80%, queueing delay tăng theo cấp số nhân (Little's Law / lý thuyết hàng đợi M/M/1).

> ⚠️ Bẫy
> Lập kế hoạch để chạy ở 90% CPU "cho tiết kiệm". Tại 90%, một node chết sẽ đẩy các node còn lại vượt 100% → cascading failure. Đây là kịch bản kinh điển gây ra brownout toàn cụm.

### N+1 / N+2 redundancy

Quy tắc đơn giản: nếu cần N instance để phục vụ peak load, hãy provision N+1 (chịu mất 1) hoặc N+2. Với multi-AZ, tính headroom sao cho **mất trọn 1 AZ vẫn phục vụ peak**.

Ví dụ cụ thể: service cần 12 instance để xử lý peak 30k RPS. Triển khai 3 AZ.

| Cấu hình | Instance/AZ | Tổng | Mất 1 AZ còn lại | Đủ peak (12)? |
|---|---|---|---|---|
| Không headroom | 4 | 12 | 8 | ❌ thiếu 33% |
| N+ mỗi AZ chịu lỗi | 6 | 18 | 12 | ✅ vừa khít |
| An toàn (buffer 20%) | 8 | 24 | 16 | ✅ dư 33% |

Chi phí của cột thứ 3 cao hơn, nhưng đó là cái giá của việc survive một AZ outage mà không degrade.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Headroom đa-AZ: ba cấu hình khi mất trọn 1 AZ</title>
  <desc>So sánh ba cấu hình triển khai trên 3 AZ. Cần 12 instance cho peak. Không headroom (4/AZ) khi mất 1 AZ chỉ còn 8 instance, thiếu so với 12. N+ (6/AZ) còn 12, vừa khít. Buffer 20% (8/AZ) còn 16, dư.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Mất trọn 1 AZ → tải dồn sang 2 AZ còn lại (cần 12 instance cho peak)</text>
  <g>
    <text x="135" y="52" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Không headroom · 4/AZ</text>
    <rect x="30" y="62" width="62" height="86" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="61" y="80" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">AZ-a</text>
    <text x="61" y="112" font-size="17" font-weight="700" text-anchor="middle" fill="currentColor">4</text>
    <rect x="104" y="62" width="62" height="86" rx="7" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="135" y="80" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">AZ-b</text>
    <text x="135" y="112" font-size="17" font-weight="700" text-anchor="middle" fill="currentColor">4</text>
    <rect x="178" y="62" width="62" height="86" rx="7" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="209" y="80" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">AZ-c</text>
    <text x="209" y="112" font-size="17" font-weight="700" text-anchor="middle" fill="currentColor">4</text>
    <line x1="34" y1="68" x2="88" y2="142" stroke="#ef4444" stroke-width="2.5" stroke-opacity="0.8"/>
    <line x1="88" y1="68" x2="34" y2="142" stroke="#ef4444" stroke-width="2.5" stroke-opacity="0.8"/>
    <text x="135" y="170" font-size="12" text-anchor="middle" fill="currentColor">Còn lại: <tspan font-weight="700">8</tspan> / cần 12</text>
    <rect x="58" y="180" width="154" height="22" rx="11" fill="#ef4444" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="135" y="195" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">thiếu 33% → degrade</text>
  </g>
  <g>
    <text x="135" y="232" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">N+ chịu lỗi · 6/AZ</text>
    <rect x="30" y="242" width="62" height="60" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="61" y="278" font-size="16" font-weight="700" text-anchor="middle" fill="currentColor">6</text>
    <rect x="104" y="242" width="62" height="60" rx="7" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="135" y="278" font-size="16" font-weight="700" text-anchor="middle" fill="currentColor">6</text>
    <rect x="178" y="242" width="62" height="60" rx="7" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="209" y="278" font-size="16" font-weight="700" text-anchor="middle" fill="currentColor">6</text>
    <line x1="34" y1="248" x2="88" y2="296" stroke="#ef4444" stroke-width="2.5" stroke-opacity="0.8"/>
    <line x1="88" y1="248" x2="34" y2="296" stroke="#ef4444" stroke-width="2.5" stroke-opacity="0.8"/>
    <rect x="58" y="316" width="154" height="22" rx="11" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="135" y="331" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">còn 12 → vừa khít ✅</text>
  </g>
  <g>
    <text x="540" y="232" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Buffer 20% · 8/AZ</text>
    <rect x="435" y="242" width="62" height="60" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="466" y="278" font-size="16" font-weight="700" text-anchor="middle" fill="currentColor">8</text>
    <rect x="509" y="242" width="62" height="60" rx="7" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="540" y="278" font-size="16" font-weight="700" text-anchor="middle" fill="currentColor">8</text>
    <rect x="583" y="242" width="62" height="60" rx="7" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="614" y="278" font-size="16" font-weight="700" text-anchor="middle" fill="currentColor">8</text>
    <line x1="439" y1="248" x2="493" y2="296" stroke="#ef4444" stroke-width="2.5" stroke-opacity="0.8"/>
    <line x1="493" y1="248" x2="439" y2="296" stroke="#ef4444" stroke-width="2.5" stroke-opacity="0.8"/>
    <rect x="463" y="316" width="154" height="22" rx="11" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="540" y="331" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">còn 16 → dư 33% ✅</text>
  </g>
  <g>
    <text x="540" y="52" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Chú thích</text>
    <rect x="435" y="64" width="20" height="20" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="463" y="79" font-size="11" fill="currentColor">AZ bị mất (hổ phách)</text>
    <rect x="435" y="92" width="20" height="20" rx="5" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="463" y="107" font-size="11" fill="currentColor">AZ còn nhận tải</text>
    <line x1="435" y1="124" x2="455" y2="140" stroke="#ef4444" stroke-width="2.5" stroke-opacity="0.8"/>
    <line x1="455" y1="124" x2="435" y2="140" stroke="#ef4444" stroke-width="2.5" stroke-opacity="0.8"/>
    <text x="463" y="137" font-size="11" fill="currentColor">AZ outage</text>
    <text x="435" y="168" font-size="10.5" fill="currentColor" opacity="0.75">Headroom = dư đủ để</text>
    <text x="435" y="183" font-size="10.5" fill="currentColor" opacity="0.75">2 AZ còn lại gánh hết peak.</text>
  </g>
</svg>

### Headroom mục tiêu theo loại tài nguyên

| Tài nguyên | Ngưỡng cảnh báo | Lý do |
|---|---|---|
| CPU | 60-70% sustained | Queueing delay tăng nhanh sau 70% |
| Memory | 75-80% | OOM kill là hard failure, không graceful |
| Disk | 75% | Một số FS xuống cấp hiệu năng > 80%; cần buffer cho log spike |
| Connection pool | 70% | Pool exhaustion gây timeout lan rộng |
| Kafka/queue lag | < vài giây | Lag tăng = consumer không theo kịp producer |

```promql
# Alert: service còn quá ít headroom CPU trong 15 phút
# (page khi trung bình 5m vượt 70% liên tục 15m)
avg_over_time(
  (1 - rate(node_cpu_seconds_total{mode="idle"}[5m]))[15m:1m]
) > 0.70
```

> 💡 Nguyên tắc
> Capacity plan phải dựa trên **demand forecast** (số liệu tăng trưởng thực, sự kiện đã biết như Black Friday) chứ không phải cảm tính. Review hàng quý, không phải hàng năm.

---

## 2. Load Testing

Load test là cách duy nhất để biết headroom *thật* thay vì headroom *trên giấy*. Nhưng load test sai còn nguy hiểm hơn không test vì nó tạo cảm giác an toàn giả.

### Các loại test

| Loại | Mục tiêu | Câu hỏi trả lời |
|---|---|---|
| Load test | Tải dự kiến ở peak | "Có đạt SLO ở peak không?" |
| Stress test | Đẩy quá giới hạn | "Sập ở đâu, và sập như thế nào?" |
| Soak test (endurance) | Tải vừa, chạy nhiều giờ | "Có memory leak / fd leak / disk fill không?" |
| Spike test | Tăng đột ngột | "Autoscaling kịp không?" |

### Làm đúng

**1. Warm-up.** Không bao giờ đo số đầu tiên. JIT chưa compile, cache (CDN, app, DB buffer pool) còn lạnh, connection pool chưa mở, autoscaler chưa kịp scale. Cho hệ thống chạy ấm 5-10 phút rồi mới bắt đầu đo.

**2. Realistic traffic.** Một vòng lặp gọi cùng một endpoint với cùng một payload sẽ cho kết quả vô nghĩa — mọi thứ trúng cache. Cần:
- Phân bố endpoint theo tỷ lệ production thật (vd 70% read, 25% search, 5% write).
- Cardinality dữ liệu thật (key ngẫu nhiên để không trúng cache 100%).
- Think time giữa các request (người dùng thật không bắn liên tục).

**3. Test từ ngoài vào.** Đẩy tải qua load balancer / DNS thật, không gọi thẳng vào instance. Bạn muốn test cả LB, TLS termination, autoscaling.

**4. Closed vs open model.** Closed-loop (N user cố định, gửi request kế tiếp khi nhận response) sẽ tự giới hạn tải khi hệ thống chậm lại — che giấu vấn đề. Open-loop (gửi theo arrival rate cố định, vd 5k RPS bất kể latency) phản ánh đúng traffic thực và phơi bày coordinated omission.

```yaml
# Ví dụ k6 (open model) với ramp + warmup + think time
scenarios:
  warmup:
    executor: constant-arrival-rate
    rate: 500           # 500 RPS làm ấm cache/pool
    duration: 5m
    preAllocatedVUs: 200
  rampup:
    executor: ramping-arrival-rate
    startTime: 5m
    startRate: 500
    stages:
      - { target: 2000, duration: 5m }
      - { target: 5000, duration: 10m }   # peak dự kiến
      - { target: 7500, duration: 5m }    # stress 1.5x
    preAllocatedVUs: 2000
```

> ⚠️ Bẫy
> **Coordinated omission**: nếu load tool dừng gửi request khi server chậm, các request bị chậm "biến mất" khỏi thống kê → p99 trông đẹp giả tạo. Dùng arrival-rate executor và đo latency theo expected schedule, không theo actual send time.

> 💡 Nguyên tắc
> Test trên môi trường giống production nhất có thể (cùng instance type, cùng DB size). Test trên môi trường nhỏ hơn rồi nhân tỷ lệ là sai — bottleneck thường phi tuyến.

---

## 3. Chaos Engineering

Chaos engineering là việc *chủ động* tiêm lỗi vào hệ thống để kiểm chứng giả định về độ bền — trong điều kiện kiểm soát, có người trực, giờ làm việc.

### Quy trình

1. **Định nghĩa steady state**: một metric kinh doanh đo được (vd checkout success rate ≥ 99.5%, p99 ≤ 300ms).
2. **Đặt giả thuyết**: "Nếu một AZ mất, steady state vẫn giữ."
3. **Tiêm lỗi nhỏ nhất**: bắt đầu với blast radius hẹp (1 instance, 1% traffic).
4. **Đo lệch**: so steady state trước/trong/sau.
5. **Mở rộng dần** nếu hệ thống chịu được; **dừng ngay** (abort) nếu vượt ngưỡng.

### Game Day

Game day là buổi diễn tập có lịch, có kịch bản, có toàn đội tham gia. Mục tiêu kép: test hệ thống **và** test con người + runbook + alerting.

Ví dụ kịch bản game day:

| Thời điểm | Hành động | Kỳ vọng |
|---|---|---|
| T+0 | Kill 30% instance của service A | Autoscaler thay thế trong 2-3 phút, không lỗi user-facing |
| T+10 | Inject 200ms latency vào DB | Circuit breaker mở, fallback cache kích hoạt |
| T+20 | Block traffic tới AZ-b | LB rút AZ-b, headroom AZ còn lại đủ |
| T+30 | Cut dependency thanh toán | Graceful degradation: cho phép "pay later", không sập trang |

Sau game day, mọi alert *không* nổ đúng lúc, mọi runbook lỗi thời, mọi dashboard thiếu → đều là action item.

### Fault injection thường dùng

- Latency injection (thêm delay vào downstream call).
- Error injection (trả 500 / timeout từ dependency).
- Resource exhaustion (CPU/memory/disk stress).
- Network partition / packet loss.
- Instance/AZ termination.

> ⚠️ Bẫy
> Chạy chaos lần đầu thẳng trên production toàn bộ traffic, không có abort condition, lúc nửa đêm. Chaos engineering *giảm* rủi ro chỉ khi có blast radius nhỏ, monitoring tốt, và nút dừng.

> 💡 Nguyên tắc
> Mục tiêu chaos không phải "phá cho vui" mà là **biến unknown-unknowns thành known issues** trước khi khách hàng tìm ra giúp bạn.

---

## 4. Graceful Degradation & Load Shedding

Khi quá tải hoặc một phần hệ thống chết, lựa chọn không phải "hoạt động hoàn hảo vs sập hoàn toàn". Có vùng giữa: degrade có kiểm soát.

### Graceful degradation

Phục vụ phiên bản giảm chất lượng thay vì lỗi:

- Trang sản phẩm: nếu recommendation service chết → ẩn block "gợi ý cho bạn", phần còn lại vẫn render.
- Search: nếu personalization timeout → trả kết quả generic.
- Feed: nếu real-time count chết → hiển thị số cached/xấp xỉ.

Mỗi feature nên có một **fallback** rõ ràng và một quyết định "feature này critical hay optional?".

### Load shedding

Khi tải vượt khả năng, **chủ động từ chối một phần request** để bảo vệ phần còn lại. Phục vụ tốt 90% còn hơn phục vụ tệ 100% rồi sập cả 100%.

Nguyên tắc shed:
- Shed theo **priority**: drop request ít quan trọng (vd health-check probe của bot, batch job) trước traffic doanh thu.
- Trả nhanh `503` với `Retry-After`, đừng giữ request trong queue (giữ lâu = client timeout + retry = tệ hơn).
- Shed **trước** khi tài nguyên cạn, dựa trên latency/queue depth, không đợi tới lúc OOM.

```python
# Adaptive load shedding theo concurrency limit (giản lược)
if in_flight_requests > max_concurrency:
    metrics.increment("requests.shed")
    return Response(status=503, headers={"Retry-After": "2"})
```

> ⚠️ Bẫy
> **Retry storm**: client gặp lỗi → retry ngay → tăng tải → nhiều lỗi hơn → retry nhiều hơn. Bắt buộc: exponential backoff + jitter, retry budget (vd tối đa 10% request được retry), và circuit breaker.

| Cơ chế | Bảo vệ chống | Thông số ví dụ |
|---|---|---|
| Timeout | Treo vô hạn | p99 downstream × 1.5 |
| Retry + backoff + jitter | Lỗi thoáng qua | max 2 retry, base 100ms, jitter ±50% |
| Retry budget | Retry storm | ≤ 10% tổng request |
| Circuit breaker | Dependency chết kéo dài | mở khi error rate > 50% trong 30s |
| Load shedding | Quá tải | shed khi concurrency > limit |
| Bulkhead | Một dep nuốt hết thread pool | pool riêng / dependency |

---

## 5. Redundancy & Failover

Redundancy là có nhiều bản sao; failover là cơ chế chuyển sang bản sao khi bản chính chết.

### Active-active vs Active-passive

| Tiêu chí | Active-Active | Active-Passive |
|---|---|---|
| Cả hai phục vụ traffic | Có | Không (standby chờ) |
| Thời gian failover | ~tức thì (rút node) | Giây → phút (promote standby) |
| Tận dụng tài nguyên | Cao | Thấp (standby idle) |
| Độ phức tạp | Cao (conflict, consistency) | Thấp hơn |
| Rủi ro cold standby | Thấp | Cao — standby chưa từng chạy thật |

> ⚠️ Bẫy
> **Cold standby chưa từng nhận traffic**. Khi failover thật xảy ra, standby có config cũ, cache lạnh, hoặc thiếu IAM permission → failover thất bại đúng lúc cần nhất. Hãy *xoay vòng* (rotate) traffic qua standby định kỳ để giữ nó "ấm" và đã được chứng minh.

### Failover phải tự động và phải được test

- Health check phải phản ánh khả năng phục vụ thật (deep health check kiểm DB connectivity), không chỉ "process còn sống" (shallow check).
- Cẩn thận **flapping**: ngưỡng failover/failback phải có hysteresis để không dao động liên tục.
- Tránh split-brain: dùng quorum/leader election (vd Raft, hoặc managed như RDS Multi-AZ) thay vì hai node cùng nghĩ mình là primary.

---

## 6. DR Drill & RTO/RPO

Disaster Recovery xử lý sự cố thảm họa: mất cả region, mất data center, ransomware.

### Hai con số định nghĩa mọi DR plan

- **RTO (Recovery Time Objective)**: tối đa bao lâu để khôi phục dịch vụ. "Mất bao lâu để chạy lại?"
- **RPO (Recovery Point Objective)**: tối đa bao nhiêu dữ liệu được phép mất. "Mất bao nhiêu data?"

| Chiến lược DR | RTO điển hình | RPO điển hình | Chi phí |
|---|---|---|---|
| Backup & Restore | Giờ → ngày | Giờ (theo chu kỳ backup) | Thấp |
| Pilot Light | Chục phút → giờ | Phút | Trung bình |
| Warm Standby | Phút | Giây → phút | Cao |
| Active-Active (Multi-Region) | ~Giây | ~0 | Rất cao |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Tradeoff RTO/RPO theo 4 chiến lược DR</title>
  <desc>Mặt phẳng RTO (trục ngang, thời gian khôi phục) và RPO (trục dọc, dữ liệu mất). Bốn chiến lược từ góc trên-phải xuống góc dưới-trái: Backup và Restore RTO và RPO lớn chi phí thấp; Pilot Light; Warm Standby; Active-Active RTO và RPO gần 0 chi phí rất cao. RTO và RPO giảm dần thì chi phí tăng dần.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">RTO/RPO giảm dần ↔ chi phí tăng dần</text>
  <line x1="90" y1="350" x2="660" y2="350" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5"/>
  <line x1="90" y1="350" x2="90" y2="60" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5"/>
  <polygon points="660,350 650,345 650,355" fill="currentColor" fill-opacity="0.55"/>
  <polygon points="90,60 85,70 95,70" fill="currentColor" fill-opacity="0.55"/>
  <text x="375" y="385" font-size="12" text-anchor="middle" fill="currentColor">RTO — thời gian khôi phục (giảm ←)</text>
  <text x="660" y="340" font-size="10.5" text-anchor="end" fill="currentColor" opacity="0.7">nhanh ←</text>
  <text x="100" y="345" font-size="10.5" fill="currentColor" opacity="0.7">→ chậm</text>
  <g transform="rotate(-90 30 205)">
    <text x="30" y="205" font-size="12" text-anchor="middle" fill="currentColor">RPO — dữ liệu mất (giảm ↓)</text>
  </g>
  <text x="74" y="80" font-size="10.5" text-anchor="end" fill="currentColor" opacity="0.7">nhiều</text>
  <text x="74" y="345" font-size="10.5" text-anchor="end" fill="currentColor" opacity="0.7">~0</text>
  <line x1="170" y1="120" x2="560" y2="320" stroke="currentColor" stroke-opacity="0.18" stroke-width="10" stroke-linecap="round"/>
  <g>
    <circle cx="560" cy="120" r="13" fill="#3b82f6" fill-opacity="0.85"/>
    <text x="560" y="124" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">1</text>
    <text x="560" y="98" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Backup &amp; Restore</text>
    <text x="560" y="146" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">RTO giờ→ngày · RPO giờ · chi phí thấp</text>
  </g>
  <g>
    <circle cx="420" cy="190" r="13" fill="#10b981" fill-opacity="0.9"/>
    <text x="420" y="194" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">2</text>
    <text x="420" y="168" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Pilot Light</text>
    <text x="420" y="216" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">RTO chục phút→giờ · RPO phút · TB</text>
  </g>
  <g>
    <circle cx="270" cy="255" r="13" fill="#f59e0b" fill-opacity="0.9"/>
    <text x="270" y="259" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">3</text>
    <text x="270" y="233" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Warm Standby</text>
    <text x="270" y="281" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">RTO phút · RPO giây→phút · cao</text>
  </g>
  <g>
    <circle cx="150" cy="315" r="13" fill="#8b5cf6" fill-opacity="0.9"/>
    <text x="150" y="319" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">4</text>
    <text x="150" y="305" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Active-Active</text>
    <text x="200" y="335" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">RTO~giây · RPO~0 · rất cao</text>
  </g>
</svg>

### DR drill — diễn tập thật

Một DR plan trong tài liệu mà chưa từng diễn tập thì RTO/RPO chỉ là *con số ước mơ*.

Quy trình drill:
1. Tuyên bố disaster (giả định mất region chính).
2. Bấm giờ. Thực hiện runbook failover sang region DR.
3. Đo **RTO thực** (tới khi service phục vụ traffic) và **RPO thực** (so dữ liệu region DR với thời điểm "mất").
4. Test cả **failback** — quay về region chính cũng phải an toàn, không mất data.
5. Ghi nhận sai lệch giữa thực tế và mục tiêu → action item.

> 💡 Nguyên tắc
> Test khôi phục từ **backup**, không phải chỉ test rằng backup *chạy*. "Backup thành công" trong log không có nghĩa restore được. Hãy restore định kỳ vào môi trường sạch và verify tính toàn vẹn dữ liệu.

> ⚠️ Bẫy
> RPO đẹp trên giấy nhờ replication "real-time", nhưng replication lag thực tế là 45 giây dưới tải cao. Đo RPO *dưới tải*, không phải lúc rảnh.

---

## 7. Dependency Failure Isolation

Hệ thống của bạn chỉ đáng tin cậy bằng cách nó *xử lý* dependency không đáng tin cậy. Giả định mọi downstream sẽ chậm, lỗi, hoặc biến mất.

### Phân loại critical vs non-critical

Lập sơ đồ và gán nhãn mỗi dependency:

| Dependency | Loại | Khi nó chết |
|---|---|---|
| Primary DB | Critical (hard) | Service không phục vụ được core |
| Auth service | Critical (hard) | Cache token + fail-closed an toàn |
| Recommendation | Non-critical (soft) | Ẩn block, degrade |
| Analytics/logging | Non-critical | Buffer & drop, không chặn request |

Mục tiêu: **một soft dependency chết không bao giờ được kéo theo cả hệ thống.**

### Kỹ thuật cô lập

- **Bulkhead**: thread pool / connection pool riêng cho từng dependency. Một dep treo không nuốt hết tài nguyên của các dep khác.
- **Circuit breaker**: ngừng gọi dep đang chết để nó có thời gian hồi phục và để bạn fail nhanh.
- **Timeout aggressive**: mọi network call có timeout. Không có default-infinite.
- **Fallback**: giá trị cached, default, hoặc feature-off.
- **Async / queue**: tách dep không cần đồng bộ ra khỏi critical path.

> ⚠️ Bẫy
> **Shared connection pool**: search service và payment service dùng chung một pool 100 connection tới cùng một DB proxy. Search bị chậm → ăn hết 100 connection → payment cũng timeout. Cô lập pool theo dependency/criticality.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 330" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Bulkhead: shared pool vs pool riêng cho từng dependency</title>
  <desc>Bên trái shared pool: search và payment dùng chung 100 connection; search chậm ăn hết pool nên payment cũng timeout. Bên phải bulkhead: mỗi dependency có pool riêng nên search treo không kéo theo payment.</desc>
  <text x="180" y="24" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">Shared pool — 1 dep treo kéo cả hệ thống</text>
  <text x="540" y="24" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">Bulkhead — pool riêng, lỗi bị cô lập</text>
  <line x1="360" y1="40" x2="360" y2="310" stroke="currentColor" stroke-opacity="0.2" stroke-width="1" stroke-dasharray="4 4"/>
  <g>
    <rect x="30" y="48" width="120" height="44" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="90" y="68" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Search 🐌</text>
    <text x="90" y="84" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">chậm</text>
    <rect x="210" y="48" width="120" height="44" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="270" y="68" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Payment 💳</text>
    <text x="270" y="84" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">critical</text>
    <rect x="40" y="150" width="280" height="80" rx="10" fill="#ef4444" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="180" y="170" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Shared pool · 100 conn</text>
    <text x="180" y="188" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">Search nuốt cả 100 → 0 còn trống</text>
    <rect x="60" y="200" width="240" height="14" rx="7" fill="#f59e0b" fill-opacity="0.7"/>
    <text x="180" y="246" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">▮ = connection do Search chiếm hết</text>
    <line x1="90" y1="92" x2="150" y2="148" stroke="currentColor" stroke-opacity="0.4"/>
    <line x1="270" y1="92" x2="210" y2="148" stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="3 3"/>
    <rect x="60" y="270" width="240" height="30" rx="8" fill="#ef4444" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="180" y="290" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Payment cũng timeout ❌</text>
  </g>
  <g>
    <rect x="390" y="48" width="120" height="44" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="450" y="68" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Search 🐌</text>
    <text x="450" y="84" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">chậm</text>
    <rect x="570" y="48" width="120" height="44" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="630" y="68" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Payment 💳</text>
    <text x="630" y="84" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">critical</text>
    <line x1="450" y1="92" x2="450" y2="148" stroke="currentColor" stroke-opacity="0.4"/>
    <line x1="630" y1="92" x2="630" y2="148" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="390" y="150" width="120" height="80" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="450" y="170" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Pool Search</text>
    <text x="450" y="186" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.8">50 conn · cạn</text>
    <rect x="404" y="198" width="92" height="12" rx="6" fill="#f59e0b" fill-opacity="0.7"/>
    <rect x="570" y="150" width="120" height="80" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="630" y="170" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Pool Payment</text>
    <text x="630" y="186" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.8">50 conn · rảnh</text>
    <rect x="584" y="198" width="30" height="12" rx="6" fill="#10b981" fill-opacity="0.7"/>
    <rect x="420" y="270" width="240" height="30" rx="8" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="540" y="290" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Payment vẫn chạy ✅</text>
  </g>
</svg>

> 💡 Nguyên tắc
> Test dependency failure như một kịch bản first-class trong CI/chaos: tiêm timeout/500 từ mỗi dependency và assert rằng SLO của bạn (cho phần critical) vẫn giữ.

---

## Liên hệ sang AWS

| Khái niệm trong bài | Dịch vụ / tính năng AWS |
|---|---|
| Capacity & headroom | EC2 Auto Scaling (target tracking ~60-70% CPU), Application Auto Scaling, Compute Optimizer cho right-sizing |
| Headroom metrics & alert | **CloudWatch** metrics + alarms, Container Insights, RDS Performance Insights |
| Load testing realistic | Distributed Load Testing on AWS, hoặc k6/Locust chạy trên Fargate đẩy qua **ALB/Route 53** |
| Chaos / fault injection | **AWS FIS (Fault Injection Service)** — inject latency, terminate instance, AZ failure; tích hợp CloudWatch alarm làm **stop condition** (abort) |
| Tracing dependency latency/errors | **AWS X-Ray** service map, trace cho mỗi downstream; phát hiện dep nào làm chậm p99 |
| Graceful degradation / shedding | ALB/API Gateway throttling, target health, `503 Retry-After`; AppConfig feature flags để tắt feature non-critical |
| Retry/backoff/circuit breaker | AWS SDK retry với exponential backoff + jitter; App Mesh / Envoy circuit breaking |
| Redundancy & failover | Multi-AZ (RDS, ELB), **Route 53 health checks + failover routing**, Aurora replica auto-failover |
| DR & RTO/RPO | **AWS Elastic Disaster Recovery (DRS)**, AWS Backup (test restore!), cross-region replication (S3 CRR, Aurora Global DB cho RPO ~giây) |
| Pilot light / warm standby | CloudFormation/CDK để dựng nhanh region DR; Aurora Global Database; Route 53 ARC (Application Recovery Controller) cho readiness check & routing control |
| Service & dependency health | **AWS Health Dashboard** (sự kiện của AWS ảnh hưởng tài khoản bạn), CloudWatch Synthetics canary để phát hiện degradation từ ngoài vào |
| SLO/error budget | CloudWatch composite alarms, ServiceLcl/Application Signals (SLO tracking) |

> 💡 Nguyên tắc tổng kết
> Reliability không phải là *không bao giờ lỗi* — đó là điều bất khả thi. Reliability là **lỗi theo cách đã được dự liệu và diễn tập**: blast radius nhỏ, degrade thay vì sập, failover đã chứng minh, RTO/RPO đã đo bằng đồng hồ thật. Nếu bạn chưa tự tay tiêm lỗi đó, hãy giả định nó sẽ làm bạn bất ngờ.
