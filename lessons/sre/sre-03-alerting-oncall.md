# Alerting & On-call

> Mục tiêu: Sau bài này bạn thiết kế được một hệ thống alert mà khi nó page bạn lúc 3 giờ sáng, bạn biết chắc có người dùng đang chịu thiệt hại và bạn có việc cụ thể để làm. Mọi alert khác đều là noise.

Một hệ thống monitoring tốt sinh ra rất ít alert. Nếu kỹ sư on-call nhận hơn ~2 page mỗi ca trực, gần như chắc chắn bạn đang alert sai chỗ. Bài này nói về việc alert **cái gì**, gửi cho **ai**, với **mức độ nào**, và làm sao giữ cho con người trực hệ thống không kiệt sức.

---

## 1. Alert trên symptom, không alert trên cause

Nguyên tắc nền tảng của toàn bộ chương này: **alert mô tả nỗi đau của người dùng, không mô tả nguyên nhân kỹ thuật.**

- **Symptom (triệu chứng)**: "10% request trả về 5xx", "p99 latency của checkout vượt 2s", "queue xử lý đơn hàng tồn đọng 30 phút".
- **Cause (nguyên nhân)**: "CPU node-7 đạt 95%", "MySQL replica trễ 200s", "JVM heap đầy".

Tại sao ưu tiên symptom?

1. **Cause không suy ra được tác động.** CPU 95% có thể hoàn toàn vô hại (batch job ban đêm), cũng có thể là dấu hiệu sập dịch vụ. Page theo CPU = bạn đoán mò.
2. **Một symptom gom được vô số cause.** Bạn không thể liệt kê hết mọi cách checkout có thể hỏng. Nhưng nếu alert "checkout success rate < 99%", mọi nguyên nhân — DB, network, deploy lỗi, third-party down — đều bị bắt bằng đúng một rule.
3. **Symptom map thẳng vào SLO.** Nếu SLO của bạn là 99.9% request thành công, thì alert nên phát ra **trước khi** bạn đốt hết error budget.

> 💡 Nguyên tắc: Mỗi page phải trả lời được câu "ngay lúc này có người dùng đang bị ảnh hưởng không?". Nếu câu trả lời là "không chắc", đó không phải page.

Cause-based metric (CPU, memory, disk, replica lag...) **vẫn cần thu thập** — chúng là công cụ chẩn đoán trên dashboard khi bạn đã được page. Chỉ là chúng không nên tự page bạn. Ngoại lệ duy nhất: cause mà bạn **biết chắc** sẽ thành symptom và có **đủ thời gian** để xử lý trước (ví dụ disk sẽ đầy trong 4 giờ — page sớm để tránh sự cố). Đây là alert "saturation/predictive", không phải alert reactive.

### Ví dụ: symptom-based alert (PromQL)

```yaml
# Alert khi tỷ lệ lỗi 5xx của API checkout vượt ngưỡng đốt error budget
- alert: CheckoutHighErrorRate
  expr: |
    sum(rate(http_requests_total{job="checkout", code=~"5.."}[5m]))
      /
    sum(rate(http_requests_total{job="checkout"}[5m]))
      > 0.01
  for: 5m            # phải duy trì 5 phút mới page, tránh spike thoáng qua
  labels:
    severity: page
  annotations:
    summary: "Checkout error rate {{ $value | humanizePercentage }} (SLO 99%)"
    runbook: "https://runbooks.internal/checkout-high-error-rate"
```

Lưu ý `for: 5m`: nó lọc bỏ blip ngắn. Đừng để giá trị này quá lớn cho sự cố nghiêm trọng — với một sự cố "đốt sạch budget trong 1 giờ" thì 5 phút chờ là chấp nhận được; với outage toàn phần thì rút xuống 2m.

---

## 2. Burn-rate alerting: gắn alert vào error budget

Alert ngưỡng cố định ("error rate > 1%") có nhược điểm: một spike nhỏ kéo dài và một outage toàn phần ngắn được đối xử như nhau. Google SRE khuyến nghị **multi-window, multi-burn-rate** alert: page nhanh khi đốt budget nhanh, page chậm (hoặc chỉ ticket) khi đốt chậm.

Với SLO 99.9% (error budget 0.1% trong 30 ngày):

| Burn rate | Ý nghĩa | Budget tiêu trong | Window phát hiện | Hành động |
|-----------|---------|-------------------|------------------|-----------|
| 14.4x | Cháy rất nhanh | ~2 ngày hết budget tháng | 5m + 1h | **Page ngay** |
| 6x | Cháy nhanh | ~5 ngày | 30m + 6h | **Page** |
| 3x | Cháy vừa | ~10 ngày | 2h + 1 ngày | **Ticket** |
| 1x | Bình thường | Vừa đúng 30 ngày | — | Không alert |

```promql
# Burn rate = (tỷ lệ lỗi thực tế) / (tỷ lệ lỗi cho phép theo SLO)
# SLO 99.9% -> ngưỡng lỗi cho phép = 0.001
(
  sum(rate(http_requests_total{job="checkout",code=~"5.."}[1h]))
    / sum(rate(http_requests_total{job="checkout"}[1h]))
) / 0.001 > 14.4
```

Dùng hai window (ví dụ 1h **và** 5m cùng vượt) để vừa nhạy vừa không page vì một blip 30 giây.

> ⚠️ Bẫy: Đặt SLO quá nghiêm (99.999%) cho dịch vụ không cần. Mỗi "số 9" thêm vào làm alert nhạy hơn theo cấp số nhân và biến đêm của on-call thành địa ngục. SLO phải phản ánh kỳ vọng thực của người dùng, không phải lòng tự hào kỹ thuật.

---

## 3. Page-worthy vs Ticket-worthy

Không phải mọi thứ đáng chú ý đều đáng đánh thức người ta dậy. Phân loại rõ ràng:

| | **Page** (đánh thức ngay) | **Ticket** (xử lý trong giờ làm) | **Log/Dashboard** (chỉ ghi nhận) |
|---|---|---|---|
| Tiêu chí | Đang/sắp gây thiệt hại cho user **và** cần hành động của con người **ngay** | Cần con người nhưng hoãn được vài giờ/ngày | Không cần hành động |
| Ví dụ | Checkout down, đốt budget 14.4x | 1 replica trong 3 chết, redundancy giảm | Một retry thành công sau lần fail đầu |
| Phản hồi | Phút | Giờ đến ngày | Không |
| Kênh | PagerDuty/Opsgenie → điện thoại | Jira/ticket queue | Grafana |

Bài kiểm tra ba câu hỏi cho mọi alert page:

1. **Có thật sự khẩn cấp không?** (Không xử lý trong 30 phút thì có hại không?)
2. **Có hành động không?** Nếu chẳng có gì để làm ngoài "chờ nó tự khỏi" → không page.
3. **Có cần con người không?** Nếu hệ thống tự heal được (auto-scaling, retry, failover) → không page, chỉ log.

Nếu **bất kỳ** câu nào trả lời "không" → hạ xuống ticket hoặc bỏ.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cây quyết định phân loại alert thành Page, Ticket hoặc Log</title>
  <desc>Từ một alert đi qua ba câu hỏi nối tiếp: Có khẩn cấp không? Có hành động không? Có cần con người không? Trả lời có ở cả ba thì Page; bất kỳ câu nào trả lời không thì hạ cấp xuống Ticket hoặc Log.</desc>
  <text x="360" y="24" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">Một alert nổ — phân loại thế nào?</text>
  <defs>
    <marker id="ar1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none" marker-end="url(#ar1)">
    <path d="M120 70 V104"/>
    <path d="M120 154 V188"/>
    <path d="M120 238 V272"/>
    <path d="M210 54 H300"/>
    <path d="M210 138 H300"/>
    <path d="M210 222 H300"/>
  </g>
  <g>
    <rect x="40" y="40" width="160" height="34" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="120" y="62" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Alert đầu vào</text>
  </g>
  <g>
    <rect x="30" y="104" width="180" height="50" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="120" y="124" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">1. Có khẩn cấp không?</text>
    <text x="120" y="141" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">hại nếu chờ quá 30 phút?</text>
  </g>
  <g>
    <rect x="30" y="188" width="180" height="50" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="120" y="208" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">2. Có hành động không?</text>
    <text x="120" y="225" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">có việc cụ thể để làm?</text>
  </g>
  <g>
    <rect x="30" y="272" width="180" height="50" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="120" y="292" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">3. Có cần con người?</text>
    <text x="120" y="309" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">hệ thống tự heal được?</text>
  </g>
  <g font-size="10.5" font-weight="700" fill="#10b981">
    <text x="155" y="98">CÓ</text>
    <text x="155" y="182">CÓ</text>
    <text x="155" y="266">CÓ</text>
  </g>
  <g font-size="10.5" font-weight="700" fill="#f59e0b">
    <text x="250" y="49" text-anchor="middle">KHÔNG</text>
    <text x="250" y="133" text-anchor="middle">KHÔNG</text>
    <text x="250" y="217" text-anchor="middle">KHÔNG</text>
  </g>
  <g>
    <rect x="300" y="38" width="220" height="32" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="410" y="59" font-size="11.5" text-anchor="middle" fill="currentColor">Hạ cấp → Ticket / Log</text>
    <rect x="300" y="122" width="220" height="32" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="410" y="143" font-size="11.5" text-anchor="middle" fill="currentColor">Không actionable → bỏ / Log</text>
    <rect x="300" y="206" width="220" height="32" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="410" y="227" font-size="11.5" text-anchor="middle" fill="currentColor">Tự heal → chỉ Log</text>
  </g>
  <g>
    <rect x="540" y="278" width="160" height="50" rx="11" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="620" y="299" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">PAGE</text>
    <text x="620" y="316" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">đánh thức người on-call</text>
  </g>
  <path d="M210 297 H540" stroke="currentColor" stroke-opacity="0.55" fill="none" marker-end="url(#ar1)"/>
  <text x="375" y="290" font-size="10.5" font-weight="700" text-anchor="middle" fill="#10b981">cả 3 đều CÓ</text>
</svg>

> 💡 Nguyên tắc: "Mỗi lần bị page, on-call phải phản ứng bằng trí tuệ, không phải phản xạ máy móc." Nếu phản ứng luôn là cùng một thao tác (restart pod), hãy tự động hoá thao tác đó và xoá alert.

---

## 4. Alert fatigue và cách giảm

Alert fatigue là khi quá nhiều alert (nhất là false positive) khiến con người chai lì — bắt đầu phớt lờ, ack vô thức, và rồi bỏ sót alert thật. Đây là nguyên nhân hàng đầu của các outage kéo dài.

Triệu chứng đo được:

- **Pages mỗi ca trực**: mục tiêu < 2. Trên 5 là báo động đỏ.
- **Tỷ lệ actionable**: bao nhiêu % page dẫn tới hành động thật? Mục tiêu > 75%. Dưới 50% nghĩa là nửa số lần đánh thức là vô ích.
- **Tỷ lệ flapping**: alert bật/tắt liên tục.

Chiến lược giảm fatigue:

1. **Xoá alert không actionable.** Mỗi tuần review danh sách page; bất kỳ alert nào nổ mà on-call chỉ ack rồi không làm gì → ứng viên xoá ngay.
2. **Thêm `for:` / multi-window** để diệt blip thoáng qua.
3. **Gom (grouping) và dedupe.** Khi 50 pod cùng chết, gửi **một** page cho cả cluster, không phải 50 page.
4. **Inhibition (ức chế).** Khi đã page "toàn datacenter down", ức chế mọi page con bên trong nó.
5. **Routing theo severity.** Ticket-worthy không bao giờ vào kênh page.
6. **Tự động hoá hành động lặp lại.** Nếu phản ứng luôn là restart → để hệ thống tự restart.

```yaml
# Alertmanager: gom & ức chế để giảm noise
route:
  group_by: ['alertname', 'cluster']
  group_wait: 30s          # chờ gom các alert cùng nhóm phát gần nhau
  group_interval: 5m
  repeat_interval: 4h      # không spam lại page đã ack

inhibit_rules:
  - source_matchers: [severity="page", scope="cluster-down"]
    target_matchers: [severity="page"]
    equal: ['cluster']     # cluster down -> nuốt mọi page con cùng cluster
```

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Grouping và inhibition giảm noise: trước và sau</title>
  <desc>Bên trái không gom: 50 pod cùng chết và một cluster-down sinh ra rất nhiều page lẻ làm on-call quá tải. Bên phải có gom và ức chế: 50 pod gộp thành một page, và cluster-down nuốt mọi page con cùng cluster, còn lại một page duy nhất.</desc>
  <text x="360" y="22" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">Grouping và inhibition giảm noise</text>
  <defs>
    <marker id="ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="175" y="48" font-size="12.5" font-weight="700" text-anchor="middle" fill="#f59e0b">TRƯỚC — không gom</text>
  <g font-size="9" text-anchor="middle">
    <rect x="40" y="60" width="60" height="22" rx="5" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/><text x="70" y="75" fill="currentColor">pod-1 chết</text>
    <rect x="110" y="60" width="60" height="22" rx="5" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/><text x="140" y="75" fill="currentColor">pod-2 chết</text>
    <rect x="180" y="60" width="60" height="22" rx="5" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/><text x="210" y="75" fill="currentColor">pod-3 chết</text>
    <rect x="250" y="60" width="60" height="22" rx="5" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/><text x="280" y="75" fill="currentColor">…</text>
    <rect x="40" y="90" width="60" height="22" rx="5" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/><text x="70" y="105" fill="currentColor">pod-49 chết</text>
    <rect x="110" y="90" width="60" height="22" rx="5" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/><text x="140" y="105" fill="currentColor">pod-50 chết</text>
    <rect x="180" y="90" width="130" height="22" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/><text x="245" y="105" fill="currentColor">cluster-A down</text>
  </g>
  <text x="175" y="138" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">↓ mỗi alert một page</text>
  <g>
    <rect x="55" y="150" width="240" height="44" rx="9" fill="#f59e0b" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="175" y="170" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">52 page</text>
    <text x="175" y="186" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">on-call quá tải → fatigue</text>
  </g>
  <line x1="360" y1="44" x2="360" y2="296" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 4"/>
  <text x="545" y="48" font-size="12.5" font-weight="700" text-anchor="middle" fill="#10b981">SAU — gom + ức chế</text>
  <g font-size="9.5" fill="currentColor">
    <rect x="410" y="62" width="270" height="24" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="420" y="78">group_by [alertname, cluster] → 50 pod = 1 nhóm</text>
    <rect x="410" y="94" width="270" height="24" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="420" y="110">inhibit: cluster-down nuốt mọi page con</text>
  </g>
  <path d="M545 122 V150" stroke="currentColor" stroke-opacity="0.55" fill="none" marker-end="url(#ar2)"/>
  <g>
    <rect x="425" y="150" width="240" height="44" rx="9" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="545" y="170" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">1 page</text>
    <text x="545" y="186" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">"cluster-A down" — actionable</text>
  </g>
  <text x="360" y="240" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.75">Cùng một sự cố, một lần đánh thức thay vì 52 lần</text>
</svg>

> ⚠️ Bẫy: "Để đó cho chắc, biết đâu cần." Mỗi alert giữ lại 'cho chắc' đều cộng vào noise và bào mòn sự tin tưởng vào toàn bộ hệ thống alert. Alert là nợ kỹ thuật; mặc định nên là xoá.

---

## 5. Runbook gắn liền với mỗi alert

**Quy tắc cứng: không alert page nào được tồn tại nếu không có runbook.** Khi bị đánh thức lúc 3h sáng, người on-call (có thể không phải tác giả dịch vụ) cần một tài liệu trả lời ngay:

Một runbook tốt gồm:

1. **Ý nghĩa**: alert này nói lên điều gì về tác động tới user.
2. **Đánh giá mức độ**: cách xác nhận thật/giả và quy mô (dashboard nào, query nào).
3. **Cách xử lý ngay (mitigation)**: rollback, failover, scale up, feature flag off — ưu tiên cầm máu **trước** khi tìm root cause.
4. **Khi nào escalate**: ngưỡng và liên hệ.
5. **Liên kết**: dashboard, log query, deploy gần nhất.

```yaml
annotations:
  summary: "Checkout error rate cao ({{ $value | humanizePercentage }})"
  description: "Vượt SLO 99%. Người dùng không đặt được hàng."
  runbook: "https://runbooks.internal/checkout-high-error-rate"
  dashboard: "https://grafana.internal/d/checkout"
```

> 💡 Nguyên tắc: Runbook là để **giảm thời gian ra quyết định**, không phải thay thế tư duy. Nó hướng dẫn các bước an toàn đã biết; với tình huống lạ, runbook chỉ ra điểm bắt đầu và người để gọi. Runbook cũ/sai còn nguy hiểm hơn không có — review mỗi khi xảy ra incident.

---

## 6. Severity và escalation policy

Định nghĩa severity rõ ràng, có ràng buộc thời gian, để mọi người phản ứng đồng nhất:

| Severity | Định nghĩa | Ví dụ | Phản hồi mong đợi | Kênh |
|----------|-----------|-------|-------------------|------|
| **SEV1** | Outage toàn phần / mất dữ liệu / thiệt hại doanh thu lớn | Toàn site down, checkout 0% | Ack < 5 phút, mở incident bridge | Page primary + leadership |
| **SEV2** | Suy giảm nghiêm trọng, một phần lớn user ảnh hưởng | p99 checkout 8s, 1 region down | Ack < 15 phút | Page primary |
| **SEV3** | Suy giảm hạn chế, có workaround | Một feature phụ lỗi | Trong giờ làm | Ticket |
| **SEV4** | Bất thường, chưa ảnh hưởng user | Disk sẽ đầy sau 4h | Theo dõi / ticket | Ticket |

**Escalation policy** đảm bảo không có page nào rơi vào hư không:

```yaml
# Opsgenie/PagerDuty escalation
escalation:
  - level: 1
    notify: primary_oncall
    timeout: 5m        # không ack trong 5 phút -> leo cấp
  - level: 2
    notify: secondary_oncall
    timeout: 10m
  - level: 3
    notify: engineering_manager
  # SEV1: song song notify incident_commander ngay từ đầu
```

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Thang escalation theo thời gian khi page không được ack</title>
  <desc>Page tới primary on-call; nếu không ack trong 5 phút thì leo lên secondary on-call; nếu không ack trong 10 phút nữa thì leo lên engineering manager. Với SEV1, song song notify Incident Commander ngay từ đầu.</desc>
  <text x="360" y="24" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">Thang escalation theo thời gian (không ack → leo cấp)</text>
  <defs>
    <marker id="ar3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <g>
    <rect x="40" y="56" width="190" height="56" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="52" y="70" width="44" height="20" rx="6" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="74" y="84" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">L1</text>
    <text x="106" y="80" font-size="12.5" font-weight="700" fill="currentColor">primary_oncall</text>
    <text x="106" y="98" font-size="10.5" fill="currentColor" opacity="0.65">nhận page đầu tiên</text>
  </g>
  <g>
    <rect x="40" y="142" width="190" height="56" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="52" y="156" width="44" height="20" rx="6" fill="#f59e0b" fill-opacity="0.95"/>
    <text x="74" y="170" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">L2</text>
    <text x="106" y="166" font-size="12.5" font-weight="700" fill="currentColor">secondary_oncall</text>
    <text x="106" y="184" font-size="10.5" fill="currentColor" opacity="0.65">backup nhận escalation</text>
  </g>
  <g>
    <rect x="40" y="228" width="190" height="56" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="52" y="242" width="44" height="20" rx="6" fill="#8b5cf6" fill-opacity="0.95"/>
    <text x="74" y="256" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">L3</text>
    <text x="106" y="252" font-size="12.5" font-weight="700" fill="currentColor">engineering_manager</text>
    <text x="106" y="270" font-size="10.5" fill="currentColor" opacity="0.65">chốt chặn cuối</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none" marker-end="url(#ar3)">
    <path d="M135 112 V142"/>
    <path d="M135 198 V228"/>
  </g>
  <g font-size="10.5" font-weight="700" fill="#f59e0b">
    <text x="148" y="131">không ack 5m</text>
    <text x="148" y="217">không ack 10m</text>
  </g>
  <line x1="300" y1="56" x2="300" y2="284" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 4"/>
  <text x="300" y="48" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.6">thời gian ↓</text>
  <g>
    <rect x="430" y="120" width="240" height="64" rx="11" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="550" y="146" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Incident Commander</text>
    <text x="550" y="165" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">chỉ SEV1 — notify song song</text>
    <text x="550" y="179" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">ngay từ đầu, không chờ leo cấp</text>
  </g>
  <path d="M230 84 C330 84 360 152 430 152" stroke="#10b981" stroke-opacity="0.7" stroke-dasharray="5 4" fill="none" marker-end="url(#ar3)"/>
  <text x="360" y="104" font-size="10" font-weight="700" text-anchor="middle" fill="#10b981">SEV1</text>
</svg>

Hai chiều escalation cần phân biệt:
- **Theo thời gian (không ack)**: primary không phản hồi → tự động sang secondary → manager. Đây là an toàn cơ bản.
- **Theo chuyên môn (functional)**: on-call xác nhận sự cố nằm ngoài hiểu biết → chủ động kéo team chuyên trách (DBA, network). Escalate **không** phải là thất bại; im lặng vật lộn một mình mới là thất bại.

> 💡 Nguyên tắc: Trong incident lớn, tách vai **Incident Commander** (điều phối, ra quyết định, giao tiếp) khỏi người **operator** (tay gõ lệnh khắc phục). Một người không thể vừa sửa vừa cập nhật cho 20 người hỏi.

---

## 7. On-call bền vững

Hệ thống alert tốt mà con người kiệt sức thì vẫn sập. On-call phải được thiết kế như một hệ thống có giới hạn tải.

### Rotation

- **Đủ người**: tối thiểu ~6–8 người/rotation để mỗi người trực không quá ~1 tuần mỗi 6–8 tuần. Rotation 2–3 người là công thức burnout.
- **Primary + Secondary**: secondary là backup khi primary miss page hoặc cần thêm tay; cũng là người nhận escalation.
- **Follow-the-sun** nếu có team đa múi giờ: mỗi vùng trực giờ ban ngày của mình, gần như xoá bỏ page ban đêm. Đây là cải thiện chất lượng sống lớn nhất nếu khả thi.
- **Giới hạn tải cứng**: Google đặt trần ~2 incident/ca 12h. Vượt trần = dấu hiệu hệ thống chưa đủ tin cậy để on-call; phải dành thời gian sửa gốc thay vì chữa cháy liên tục.

### Handoff (bàn giao ca)

Bàn giao tệ làm rơi context và kéo dài incident. Một handoff tốt cần:

- Tình trạng incident đang mở và việc đang dở.
- Alert đang flapping / đã silence và lý do (kèm thời điểm hết hạn silence).
- Deploy/change đang diễn ra hoặc sắp tới.
- Bản ghi ngắn gọn (handoff doc / thread), không chỉ truyền miệng.

> ⚠️ Bẫy: Silence một alert ồn ào rồi quên mất, người ca sau không biết. Mọi silence phải có **thời hạn hết hạn** và **lý do** — không có silence vĩnh viễn.

### Compensation (đền bù)

On-call là lao động thật, ngoài giờ thật. Bền vững đòi hỏi ghi nhận tương xứng: trả thêm tiền on-call, hoặc nghỉ bù (time-off-in-lieu) cho đêm bị page. Nếu on-call "miễn phí", tổ chức mất động lực giảm noise — vì noise không tốn gì cho người ra quyết định. Compensation biến độ ồn của on-call thành chi phí nhìn thấy được, từ đó tạo áp lực lành mạnh để dọn dẹp alert.

> 💡 Nguyên tắc: Thời gian xử lý "operational work" (page, ticket, on-call) nên bị giới hạn ở ~50% quỹ thời gian của SRE. Phần còn lại dành cho engineering để giảm chính tải đó. Vượt ngưỡng → trả bớt operational load về cho dev team cho tới khi cân bằng lại.

---

## 8. Khi nào KHÔNG alert

Đôi khi quyết định đúng nhất là **không tạo alert**:

- **Hệ thống tự phục hồi.** Retry thành công, auto-scaling đã giãn, failover đã chuyển. Log lại để phân tích, đừng page.
- **Không có hành động khả thi.** Third-party down mà bạn chỉ có thể chờ → không page primary (có thể notify một kênh thông tin để trả lời support).
- **Cause-based không kèm tác động.** CPU cao, memory cao, replica lag — đưa lên dashboard, đừng page.
- **Đã có alert symptom bao trùm.** Nếu "checkout error rate" đã bắt được hệ quả, đừng thêm page cho từng cause con (DB, cache, queue) — chúng chỉ làm bạn bị page nhiều lần cho cùng một sự cố.
- **Tín hiệu quá nhiễu để hành động.** Nếu một metric flapping tới mức bạn không bao giờ tin nó → sửa metric hoặc bỏ, đừng alert.

> ⚠️ Bẫy: Alert "phòng khi". Một alert chỉ có giá trị nếu ai đó sẽ **làm gì đó khác đi** khi nó nổ. Nếu hành động giống hệt dù có hay không alert, thì alert đó là zero-value — xoá.

---

## Tóm tắt

| Nguyên tắc | Thực hành |
|-----------|-----------|
| Alert trên symptom | Page theo SLO/error budget của user, cause chỉ để chẩn đoán |
| Page có chọn lọc | Khẩn cấp + actionable + cần người → page; còn lại ticket/log |
| Chống fatigue | < 2 page/ca, > 75% actionable, gom + inhibit + tự động hoá |
| Mọi page có runbook | Mitigation trước root-cause |
| Severity rõ ràng | SEV1–4 ràng buộc thời gian + escalation tự động |
| On-call bền vững | ≥ 6 người, handoff có tài liệu, compensation, trần 50% ops |

---

## Liên hệ sang AWS

Các khái niệm trên ánh xạ trực tiếp vào AWS:

- **CloudWatch Alarms**: tạo alert symptom-based trên metric (ví dụ `5XXError`, `TargetResponseTime` của ALB). Dùng `M out of N datapoints` như tương đương `for:` để lọc blip. `TreatMissingData` để xử lý gián đoạn dữ liệu.
- **CloudWatch Composite Alarms**: gom nhiều alarm bằng logic AND/OR để **giảm noise** — chỉ page khi tổ hợp điều kiện thật sự nghiêm trọng, tương đương inhibition/grouping của Alertmanager.
- **CloudWatch Metric Math / Anomaly Detection**: tính burn rate (error / total) hoặc dải kỳ vọng động thay vì ngưỡng cứng.
- **Amazon SNS → PagerDuty/Opsgenie**: alarm bắn vào SNS topic, route tới hệ thống paging với escalation policy. Tách topic theo severity (page vs ticket).
- **AWS X-Ray**: khi đã được page, X-Ray service map và trace giúp đi từ **symptom** (latency/error cao) xuống **cause** (downstream service, DB call chậm) — đúng vai "công cụ chẩn đoán sau khi page".
- **CloudWatch ServiceLens / Application Signals**: định nghĩa **SLO** ngay trong AWS, tự sinh burn-rate alert và theo dõi error budget — sát nhất với mô hình SRE.
- **AWS Health Dashboard (Personal Health)**: phân biệt "sự cố do AWS" với "sự cố do mình"; sự kiện Health có thể đẩy qua EventBridge để thông báo on-call (notify, không nhất thiết page nếu không actionable).
- **CloudWatch Synthetics (canaries)**: probe ngoài, đo đúng trải nghiệm user (symptom thật) thay vì chỉ metric nội bộ — nền tảng cho alert symptom-based đáng tin.
