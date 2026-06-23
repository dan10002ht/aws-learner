# Incident Management & Postmortem

Một sự cố (incident) không phải là dấu hiệu thất bại của đội ngũ — nó là điều tất yếu của bất kỳ hệ thống production nào đủ phức tạp. Câu hỏi không phải là "làm sao để không bao giờ có sự cố", mà là "khi sự cố xảy ra, chúng ta phản ứng nhanh, có kỷ luật và học được gì". Bài học này trình bày một quy trình incident management thực dụng theo tinh thần Google SRE, kèm những con số và tình huống cụ thể.

> 💡 **Nguyên tắc**: Mục tiêu số một khi đang có sự cố là **khôi phục dịch vụ** (restore service), không phải tìm ra nguyên nhân gốc. Root-cause analysis là việc của postmortem, không phải của lúc 3 giờ sáng khi error rate đang ở 40%.

## Severity levels: phân loại để phản ứng đúng mức

Không phải mọi sự cố đều như nhau. Một typo trên trang footer và việc database master down là hai thế giới khác nhau. Severity level quyết định: ai được gọi dậy, tốc độ phản hồi, và mức độ communication.

| Severity | Định nghĩa | Ví dụ | Response time | Ai được huy động |
|----------|-----------|-------|---------------|------------------|
| **SEV1** | Mất dịch vụ toàn phần / mất dữ liệu / rò rỉ bảo mật | Checkout API trả 5xx 100%, DB master mất dữ liệu | < 5 phút, paging 24/7 | IC + on-call + engineering lead, có thể cả VP |
| **SEV2** | Mất một phần lớn chức năng, có workaround hạn chế | Search down nhưng browse vẫn chạy; p99 latency 8s (SLO 500ms) | < 15 phút, paging 24/7 | IC + on-call team liên quan |
| **SEV3** | Suy giảm chức năng phụ, không ảnh hưởng đường dẫn tiền | Email notification chậm 30 phút | < 1 giờ, giờ làm việc | On-call engineer |
| **SEV4** | Lỗi nhỏ, cosmetic, không ảnh hưởng người dùng | Sai màu nút, log noise | Backlog | Tự xử lý trong sprint |

> ⚠️ **Bẫy**: Đừng để "severity inflation" hoặc "severity deflation". Gọi mọi thứ là SEV1 sẽ làm đội kiệt sức và mất nhạy cảm với cảnh báo thật. Ngược lại, hạ cấp một SEV2 thành SEV3 để tránh phải thức dậy là cách bạn biến một sự cố 20 phút thành một sự cố 4 giờ.

Một quy tắc định lượng hữu ích: gắn severity với **error budget burn rate**. Nếu một sự cố đang đốt error budget của 30 ngày trong vòng dưới 1 giờ, nó tự động là SEV1 — bất kể "cảm giác" nghiêm trọng đến đâu.

```yaml
# Ví dụ alert rule gắn với severity (Prometheus Alertmanager)
- alert: CheckoutHighErrorRate
  expr: |
    sum(rate(http_requests_total{job="checkout",code=~"5.."}[5m]))
      / sum(rate(http_requests_total{job="checkout"}[5m])) > 0.05
  for: 2m
  labels:
    severity: sev1
    team: payments
  annotations:
    summary: "Checkout error rate {{ $value | humanizePercentage }} (SLO 99.9%)"
    runbook: "https://runbooks.internal/checkout-5xx"
```

## Incident Commander & các vai trò

Khi một SEV1 nổ ra, vấn đề lớn nhất thường không phải kỹ thuật — mà là **hỗn loạn tổ chức**. Mười kỹ sư cùng nhảy vào, ba người cùng restart một service, không ai cập nhật cho khách hàng, sếp nhắn tin liên tục làm phân tâm người đang debug. Mô hình **Incident Command System (ICS)** giải quyết chính xác việc này bằng cách tách vai trò.

| Vai trò | Trách nhiệm | KHÔNG làm |
|---------|-------------|-----------|
| **Incident Commander (IC)** | Điều phối tổng thể, ra quyết định, phân công, giữ tổng quan. Là "single source of truth" | Không tự mình debug sâu — sẽ mất tầm nhìn tổng thể |
| **Operations / Ops Lead** | Người trực tiếp thao tác trên hệ thống, chạy lệnh, đề xuất mitigation | Không tự ý broadcast ra ngoài |
| **Communications Lead** | Cập nhật status page, stakeholder, khách hàng theo nhịp | Không can thiệp vào kỹ thuật |
| **Scribe** | Ghi timeline real-time: ai làm gì, lúc nào, kết quả ra sao | Không tham gia debug |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 430" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Sơ đồ Incident Command System: IC điều phối trung tâm và ba vai trò xung quanh</title>
  <desc>Incident Commander ở trung tâm điều phối, nối tới ba vai trò xung quanh: Operations/Ops Lead, Communications Lead, và Scribe. Mỗi vai trò ghi rõ trách nhiệm và ranh giới KHÔNG làm. IC sở hữu quyết định, không sở hữu giải pháp.</desc>
  <g stroke="currentColor" stroke-opacity="0.4" stroke-width="1.5">
    <line x1="360" y1="150" x2="170" y2="300"/>
    <line x1="360" y1="150" x2="360" y2="300"/>
    <line x1="360" y1="150" x2="550" y2="300"/>
  </g>
  <g>
    <rect x="240" y="62" width="240" height="78" rx="12" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5"/>
    <text x="360" y="86" font-size="14.5" font-weight="700" text-anchor="middle" fill="currentColor">Incident Commander (IC)</text>
    <text x="360" y="105" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.75">Điều phối · ra quyết định · single source of truth</text>
    <text x="360" y="123" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">KHÔNG tự debug sâu — sẽ mất tầm nhìn tổng thể</text>
  </g>
  <g>
    <rect x="30" y="300" width="218" height="100" rx="12" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="139" y="324" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Operations / Ops Lead</text>
    <text x="139" y="343" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">Thao tác hệ thống · chạy lệnh</text>
    <text x="139" y="358" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">đề xuất mitigation</text>
    <text x="139" y="383" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.58">KHÔNG tự broadcast ra ngoài</text>
  </g>
  <g>
    <rect x="251" y="300" width="218" height="100" rx="12" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="324" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Communications Lead</text>
    <text x="360" y="343" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">Cập nhật status page,</text>
    <text x="360" y="358" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">stakeholder, khách hàng</text>
    <text x="360" y="383" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.58">KHÔNG can thiệp kỹ thuật</text>
  </g>
  <g>
    <rect x="472" y="300" width="218" height="100" rx="12" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="581" y="324" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Scribe</text>
    <text x="581" y="343" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">Ghi timeline real-time:</text>
    <text x="581" y="358" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">ai làm gì, lúc nào, kết quả</text>
    <text x="581" y="383" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.58">KHÔNG tham gia debug</text>
  </g>
  <text x="360" y="420" font-size="11.5" font-weight="600" text-anchor="middle" fill="currentColor" opacity="0.85">IC sở hữu QUYẾT ĐỊNH, không sở hữu GIẢI PHÁP</text>
</svg>

> 💡 **Nguyên tắc**: IC sở hữu **quyết định**, không sở hữu **giải pháp**. Khi có bất đồng về cách xử lý, IC nói "ta thử cách A trong 10 phút, nếu burn rate không giảm thì chuyển cách B" — ra quyết định có ràng buộc thời gian, thay vì tranh luận vô tận.

Trong sự cố nhỏ (SEV3), một người có thể kiêm cả IC, Ops và Comms. Nhưng với SEV1, **phải tách**. Quy tắc thực dụng: nếu sự cố kéo dài quá 30 phút hoặc có hơn 3 người tham gia, hãy chỉ định IC rõ ràng ngay lập tức — "Tôi là IC cho sự cố này" được nói thành lời trong kênh.

## Communication: status page và stakeholder

Khách hàng tha thứ cho downtime. Họ không tha thứ cho sự im lặng. Communication trong sự cố có hai luồng riêng biệt, đừng trộn lẫn.

**Luồng nội bộ (internal)** — kênh chat dành riêng cho sự cố (ví dụ `#incident-2026-06-11-checkout`):

```
[14:02] IC (An): Tuyên bố SEV1. Checkout 5xx ở 38%. Tôi làm IC.
[14:03] Ops (Bình): Đang xem dashboard, nghi do deploy v2.4.1 lúc 13:58.
[14:05] Comms (Chi): Đã cập nhật status page → "Investigating".
[14:08] Ops (Bình): Rollback v2.4.1 đang chạy.
[14:14] Ops (Bình): Error rate giảm về 2%. Tiếp tục theo dõi.
[14:20] IC (An): SLO phục hồi. Hạ xuống monitoring. Comms cập nhật "Resolved".
```

**Luồng bên ngoài (external)** — status page, ngắn gọn, không đổ lỗi, không thuật ngữ nội bộ:

```
14:05 — Investigating: Chúng tôi đang điều tra sự cố ảnh hưởng đến chức năng
        thanh toán. Một số người dùng có thể không hoàn tất đơn hàng.
14:15 — Identified: Đã xác định nguyên nhân và đang triển khai khắc phục.
14:25 — Resolved: Sự cố đã được khắc phục. Dịch vụ thanh toán hoạt động
        bình thường. Chúng tôi xin lỗi vì sự bất tiện.
```

> ⚠️ **Bẫy**: Đừng cam kết "đã sửa xong" trước khi có dữ liệu xác nhận ổn định. Tuyên bố "Resolved" rồi sự cố tái phát sau 5 phút làm xói mòn niềm tin nặng hơn cả sự cố ban đầu. Quy tắc: chờ ít nhất 2x chu kỳ alert (ví dụ 10 phút) với metric khỏe mạnh rồi mới tuyên bố resolved.

Với stakeholder (lãnh đạo, sales, support): Comms Lead gửi cập nhật theo nhịp cố định (ví dụ mỗi 30 phút cho SEV1), kể cả khi "chưa có gì mới". Một cập nhật "vẫn đang xử lý, chưa có ETA, lần tới cập nhật lúc 14:45" tốt hơn nhiều so với im lặng khiến mọi người nhảy vào kênh kỹ thuật hỏi han.

## Mitigate trước, root-cause sau

Đây là điểm phân biệt giữa một đội vận hành trưởng thành và một đội mới. Bản năng của kỹ sư là "hiểu tại sao trước khi sửa". Trong production, bản năng đó giết chết SLA.

> 💡 **Nguyên tắc**: **Stop the bleeding first.** Nếu rollback dừng được sự cố, hãy rollback ngay — kể cả khi bạn chưa biết chính xác commit nào gây ra. Bạn có thể điều tra root cause trên một bản copy, trong giờ làm việc, với cái đầu tỉnh táo.

Các đòn mitigate phổ biến, xếp theo tốc độ:

| Mitigation | Khi nào dùng | Thời gian điển hình |
|------------|--------------|---------------------|
| **Rollback** deploy gần nhất | Sự cố bắt đầu ngay sau một deploy | 2-5 phút |
| **Feature flag** tắt tính năng mới | Lỗi cô lập trong một feature | < 1 phút |
| **Failover** sang region/replica khác | Hỏng tầng hạ tầng (AZ, DB) | 5-15 phút |
| **Scale up / out** | Quá tải do traffic | 3-10 phút |
| **Rate limit / shed load** | Hệ thống bị overload dây chuyền | < 2 phút |

Tình huống thực tế: lúc 02:14, alert `CheckoutHighErrorRate` bắn. Ops thấy sự cố bắt đầu lúc 02:11, đúng 3 phút sau khi deploy `v2.4.1` lên prod. **Không cần biết dòng code nào sai** — correlation về thời gian đã đủ để rollback. Sau rollback lúc 02:18, error rate về 0.3%. Tổng thời gian sự cố: 7 phút. Root cause (một N+1 query mới làm DB connection pool cạn) được điều tra lúc 10 giờ sáng hôm sau.

## Blameless postmortem

Sau khi dịch vụ phục hồi, công việc thật sự bắt đầu. Postmortem là tài liệu giúp tổ chức **học từ sự cố** mà không phá hủy con người. Nguyên tắc cốt lõi: **blameless** (không đổ lỗi).

> 💡 **Nguyên tắc**: Con người không gây ra sự cố vì họ ngu dốt hay bất cẩn. Họ hành động hợp lý dựa trên thông tin họ có vào thời điểm đó. Nếu một thao tác sai làm sập hệ thống, lỗi nằm ở **hệ thống cho phép thao tác đó dễ dàng gây sập** — chứ không ở người bấm nút. Sửa hệ thống, không trừng phạt người.

Tại sao blameless không chỉ là tử tế mà còn **hiệu quả hơn**: khi người ta sợ bị đổ lỗi, họ giấu thông tin, tô hồng timeline, và sự cố tiếp theo sẽ tệ hơn vì không ai dám nói thật. Văn hóa blameless mua được sự trung thực — thứ duy nhất giúp bạn thực sự hiểu chuyện gì đã xảy ra.

Một postmortem tốt gồm các phần:

### 1. Summary & Impact
Một đoạn ngắn cho người không có thời gian đọc hết. Kèm con số: **bao nhiêu người dùng bị ảnh hưởng, trong bao lâu, mất bao nhiêu doanh thu/giao dịch.**

```
Tóm tắt: Trong 7 phút (02:11–02:18), 38% request checkout thất bại do
deploy v2.4.1 làm cạn DB connection pool. Ước tính ~1.200 đơn hàng bị
ảnh hưởng, ~85 triệu VNĐ giao dịch không hoàn tất. SLO availability
tháng giảm từ 99.95% xuống 99.91% (vẫn trong budget).
```

### 2. Timeline
Dòng thời gian khách quan, dùng giờ tuyệt đối, lấy từ ghi chép của Scribe + log + alert. Bao gồm cả thời điểm **phát hiện** (detection) so với thời điểm **bắt đầu** (onset) — khoảng cách này chính là TTD (time to detect).

| Thời điểm | Sự kiện |
|-----------|---------|
| 02:08 | Deploy v2.4.1 bắt đầu |
| 02:11 | Onset: error rate bắt đầu tăng (chưa ai biết) |
| 02:14 | Alert bắn, on-call được paged (TTD = 3 phút) |
| 02:16 | IC xác nhận SEV1, nghi deploy |
| 02:18 | Rollback hoàn tất, error rate phục hồi (TTM = 7 phút) |
| 02:28 | Tuyên bố Resolved sau 10 phút metric khỏe |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Timeline vòng đời sự cố trên trục thời gian với metric TTD và TTM</title>
  <desc>Trục thời gian ngang: Deploy lúc 02:08, Onset 02:11, Detection 02:14 (TTD = 3 phút từ onset), Rollback/Mitigate hoàn tất 02:18 (TTM = 7 phút từ onset), Resolved 02:28. TTD và TTM được đánh dấu là các metric sức khỏe.</desc>
  <line x1="40" y1="170" x2="690" y2="170" stroke="currentColor" stroke-opacity="0.45" stroke-width="2"/>
  <polygon points="690,170 680,165 680,175" fill="currentColor" fill-opacity="0.45"/>
  <g text-anchor="middle">
    <g>
      <circle cx="70" cy="170" r="7" fill="#3b82f6" fill-opacity="0.9"/>
      <text x="70" y="150" font-size="11.5" font-weight="700" fill="currentColor">02:08</text>
      <text x="70" y="200" font-size="11" fill="currentColor" opacity="0.8">Deploy</text>
      <text x="70" y="215" font-size="9.5" fill="currentColor" opacity="0.55">v2.4.1</text>
    </g>
    <g>
      <circle cx="220" cy="170" r="7" fill="#f59e0b" fill-opacity="0.95"/>
      <text x="220" y="150" font-size="11.5" font-weight="700" fill="currentColor">02:11</text>
      <text x="220" y="200" font-size="11" fill="currentColor" opacity="0.8">Onset</text>
      <text x="220" y="215" font-size="9.5" fill="currentColor" opacity="0.55">error rate tăng</text>
    </g>
    <g>
      <circle cx="370" cy="170" r="7" fill="#f59e0b" fill-opacity="0.95"/>
      <text x="370" y="150" font-size="11.5" font-weight="700" fill="currentColor">02:14</text>
      <text x="370" y="200" font-size="11" fill="currentColor" opacity="0.8">Detection</text>
      <text x="370" y="215" font-size="9.5" fill="currentColor" opacity="0.55">alert, paged</text>
    </g>
    <g>
      <circle cx="520" cy="170" r="7" fill="#10b981" fill-opacity="0.95"/>
      <text x="520" y="150" font-size="11.5" font-weight="700" fill="currentColor">02:18</text>
      <text x="520" y="200" font-size="11" fill="currentColor" opacity="0.8">Rollback / Mitigate</text>
      <text x="520" y="215" font-size="9.5" fill="currentColor" opacity="0.55">error rate phục hồi</text>
    </g>
    <g>
      <circle cx="660" cy="170" r="7" fill="#10b981" fill-opacity="0.95"/>
      <text x="660" y="150" font-size="11.5" font-weight="700" fill="currentColor">02:28</text>
      <text x="660" y="200" font-size="11" fill="currentColor" opacity="0.8">Resolved</text>
    </g>
  </g>
  <g>
    <rect x="220" y="95" width="150" height="26" rx="6" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="295" y="112" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">TTD = 3 phút</text>
    <line x1="220" y1="121" x2="220" y2="163" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="3 3"/>
    <line x1="370" y1="121" x2="370" y2="163" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="3 3"/>
  </g>
  <g>
    <rect x="220" y="252" width="300" height="26" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="370" y="269" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">TTM / MTTR = 7 phút</text>
    <line x1="220" y1="177" x2="220" y2="252" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 3"/>
    <line x1="520" y1="177" x2="520" y2="252" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 3"/>
  </g>
  <text x="40" y="30" font-size="13" font-weight="700" fill="currentColor">Vòng đời sự cố — TTD và TTM là metric sức khỏe</text>
</svg>

### 3. Root cause & contributing factors
Phân biệt **root cause** (nguyên nhân trực tiếp) với **contributing factors** (yếu tố góp phần). Một sự cố hiếm khi có một nguyên nhân duy nhất — đó là sự hội tụ của nhiều lỗ hổng.

- **Root cause**: ORM trong v2.4.1 sinh ra N+1 query, mỗi request checkout mở 30 connection thay vì 1, làm cạn pool (max 100).
- **Contributing factors**:
  - Pool size không có alert riêng (chỉ alert khi error rate đã cao).
  - Load test không bao gồm kịch bản checkout với giỏ hàng nhiều mặt hàng.
  - Canary deploy chỉ chạy 2 phút — chưa đủ để pool cạn lộ ra.

### 4. 5 Whys
Kỹ thuật đào sâu để không dừng ở triệu chứng bề mặt:

```
1. Tại sao checkout thất bại? → DB connection pool cạn.
2. Tại sao pool cạn?         → Mỗi request mở 30 connection thay vì 1.
3. Tại sao mở 30?            → N+1 query do thay đổi ORM trong v2.4.1.
4. Tại sao không phát hiện?  → Load test không có kịch bản giỏ nhiều món.
5. Tại sao thiếu kịch bản?   → Không có quy trình bắt buộc cập nhật load
                               test khi đổi data access layer.
```

Lưu ý "why" cuối cùng dẫn tới một **lỗ hổng quy trình**, không phải một con người. Đó là dấu hiệu của 5 Whys làm đúng.

> ⚠️ **Bẫy**: 5 Whys dễ bị lạm dụng thành công cụ đổ lỗi nếu câu trả lời là "vì kỹ sư X viết code sai". Khi gặp câu trả lời chỉ về một người, hãy hỏi tiếp: "tại sao hệ thống của chúng ta cho phép lỗi đó lọt qua?" — chuyển trọng tâm về quy trình và công cụ.

### 5. Action items
Phần quan trọng nhất — và bị bỏ bê nhiều nhất. Mỗi action item phải có **chủ sở hữu (owner)**, **deadline**, và **mức ưu tiên**. Action item không có owner là action item sẽ không bao giờ xảy ra.

| Action item | Owner | Priority | Due | Trạng thái |
|-------------|-------|----------|-----|-----------|
| Thêm alert cho DB pool utilization > 80% | An | P0 | 13/06 | Done |
| Bổ sung kịch bản load test giỏ nhiều món | Bình | P1 | 20/06 | In progress |
| Bắt buộc cập nhật load test khi đổi data layer (CI gate) | Chi | P1 | 27/06 | Todo |
| Tăng canary duration lên 15 phút | An | P2 | 30/06 | Todo |

## Theo dõi action item & học từ sự cố

Một postmortem đẹp nhưng action item không được làm thì vô giá trị — bạn sẽ gặp lại đúng sự cố đó sau 3 tháng.

> 💡 **Nguyên tắc**: Action item của postmortem phải vào **chung backlog** với feature work và được tính như công việc thật, không phải "việc làm thêm khi rảnh". Theo Google SRE, đặt ngưỡng: action item P0/P1 từ một SEV1 phải hoàn thành trong vòng **30 ngày**, và tỷ lệ hoàn thành được theo dõi như một metric của tổ chức.

Một số metric để đo sức khỏe của quy trình incident:

- **MTTD** (Mean Time To Detect): từ onset đến phát hiện. Mục tiêu kéo xuống bằng cách cải thiện alert.
- **MTTR** (Mean Time To Recover/Mitigate): từ phát hiện đến khôi phục. Kéo xuống bằng runbook tốt và mitigation nhanh.
- **Action item completion rate**: % action item P0/P1 đóng đúng hạn. Mục tiêu > 90%.
- **Recurrence rate**: % sự cố là lặp lại của một sự cố cũ. Nếu cao → postmortem không hiệu quả.

Để "học từ sự cố" trở thành văn hóa chứ không phải nghi thức: tổ chức **postmortem review** định kỳ, chia sẻ các postmortem đáng chú ý cho toàn đội (không chỉ đội liên quan), và xây một thư viện postmortem tìm kiếm được. Khi một on-call mới gặp alert lạ, họ nên tìm được postmortem cũ tương tự trong vài giây.

> ⚠️ **Bẫy**: Đừng biến postmortem thành thủ tục hành chính chỉ để "đóng ticket". Dấu hiệu nhận biết: postmortem có 15 action item nhưng chẳng cái nào có owner thật, hoặc tất cả đều "cập nhật tài liệu". Một postmortem với 3 action item được thực thi thật giá trị hơn 15 cái nằm chết trong backlog.

## Liên hệ sang AWS

Các nguyên tắc trên ánh xạ trực tiếp vào công cụ AWS:

- **Amazon CloudWatch Alarms** đóng vai trò engine alert — cấu hình theo burn rate bằng `metric math` và composite alarms để gắn severity. Kết hợp **CloudWatch Synthetics** (canary) để phát hiện sự cố từ góc nhìn người dùng trước khi error rate bùng nổ, giảm MTTD.
- **AWS Systems Manager Incident Manager** là dịch vụ ICS bản địa: định nghĩa **response plan**, **escalation** (paging on-call qua tích hợp với PagerDuty/SNS), tự động gán **Incident Commander** và các vai trò, mở **chat channel** (qua AWS Chatbot/Slack), và lưu **timeline** tự động — đúng vai trò của Scribe.
- **AWS X-Ray** hỗ trợ root-cause analysis: service map và trace giúp xác định nhanh service nào đang chậm/lỗi, đúng cho bước điều tra N+1 query hay latency tăng đột biến.
- **AWS Health Dashboard** (Personal Health Dashboard) cho biết liệu sự cố có đến từ phía AWS (một AZ, một service) hay không — quyết định giữa mitigation "failover sang AZ khác" và "rollback deploy của ta".
- **CloudWatch Logs Insights** để truy vấn log trong lúc điều tra; **Amazon SNS** cho luồng stakeholder communication; và **AWS CodeDeploy** với automatic rollback + canary/blue-green deployment hiện thực hóa nguyên tắc "mitigate trước" — rollback tự động khi CloudWatch alarm kích hoạt, biến đòn mitigate nhanh nhất thành hành động tự động trong vài giây.

Incident Manager còn hỗ trợ tạo **post-incident analysis** (postmortem) từ template ngay sau sự cố, với timeline đã được ghi sẵn và phần action item theo dõi được — đóng trọn vòng lặp từ phát hiện đến học hỏi.
