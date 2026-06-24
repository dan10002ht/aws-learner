# Deployment Safety & Progressive Delivery

> 💡 Nguyên tắc: Mỗi lần deploy là một thí nghiệm có chủ đích trên production. Mục tiêu của bạn không phải là "không bao giờ sai", mà là "khi sai thì phát hiện trong vài phút và quay lui trong vài giây, với số người dùng bị ảnh hưởng nhỏ nhất có thể".

## Vì sao deploy là nguyên nhân sự cố hàng đầu

Khi mổ xẻ các post-mortem ở Google, Meta hay phần lớn công ty SaaS, một mẫu hình lặp lại rõ rệt: **phần lớn các sự cố production (thường được trích dẫn là 60–80%) bắt nguồn từ một thay đổi do con người đưa vào** — code deploy, config push, feature flag flip, schema migration. Hệ thống ở trạng thái nghỉ (steady state) rất hiếm khi tự hỏng.

Lý do đơn giản: production đang chạy ổn định là bằng chứng thực nghiệm rằng phiên bản hiện tại "đủ tốt". Biến số duy nhất bạn chủ động thay đổi là `deploy`. Vì vậy:

- Nếu MTTR (Mean Time To Recovery) của bạn cao, gần như chắc chắn nguyên nhân nằm ở chỗ **không quay lui được nhanh**, chứ không phải ở chỗ "không debug được".
- Cách giảm số sự cố hiệu quả nhất không phải là deploy ít đi (deploy lớn, hiếm = blast radius khổng lồ), mà là deploy **nhỏ, thường xuyên, có khả năng quan sát và quay lui tức thì**.

> ⚠️ Bẫy: "Chúng ta deploy mỗi tuần một lần vào thứ Sáu để cho an toàn". Deploy gộp lô lớn nghĩa là khi hỏng bạn có 200 commit để truy vết nguyên nhân, và deploy thứ Sáu nghĩa là on-call phải xử lý sự cố vào cuối tuần. Đây là anti-pattern kinh điển.

## Rollback nhanh: Forward fix vs Rollback

Khi metric bắt đầu đỏ sau một lần deploy, bạn có hai lựa chọn. Nguyên tắc mặc định phải khắc cốt ghi tâm:

> 💡 Nguyên tắc: **Rollback trước, điều tra sau.** Khôi phục dịch vụ là ưu tiên số một; tìm root cause là việc của hậu sự cố. Đừng cố "sửa nhanh một dòng rồi đẩy lên" trong lúc đang cháy.

| Tiêu chí | Rollback (quay về bản cũ) | Forward fix (vá rồi đẩy bản mới) |
|---|---|---|
| Thời gian khôi phục | Vài giây đến vài phút (chỉ trỏ traffic về artifact cũ) | Phải code + build + test + deploy lại: 15–60 phút |
| Rủi ro | Thấp — bản cũ đã được kiểm chứng trên production | Cao — code viết vội dưới áp lực, chưa qua canary |
| Khi nào dùng | Mặc định cho hầu hết sự cố do deploy | Khi không thể rollback (schema migration không tương thích ngược, data đã ghi sai format) |
| Điều kiện tiên quyết | Backward-compatible deploy, artifact cũ còn lưu | CI/CD pipeline nhanh, có canary để chặn lỗi mới |

**Trường hợp rollback bất khả thi** là dấu hiệu thiết kế cần sửa. Ví dụ phổ biến nhất: một migration đổi tên cột `user_name` -> `username` rồi deploy code dùng tên mới. Bây giờ bản cũ không chạy được vì cột cũ đã mất. Giải pháp là **expand/contract migration (multi-phase)**:

1. **Expand**: thêm cột `username`, code ghi cả hai cột, đọc từ cột cũ. Deploy. (Rollback an toàn.)
2. **Migrate**: backfill dữ liệu sang `username`, đổi code sang đọc `username`. Deploy. (Rollback an toàn.)
3. **Contract**: xóa cột `user_name` — chỉ sau khi đã chắc chắn ổn định nhiều ngày.

Nhờ vậy mọi bước đều có thể quay lui mà không mất dữ liệu.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 250" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Expand / Contract migration 3 pha backward-compatible</title>
  <desc>Vòng đời migration ba pha: Expand thêm cột username và ghi cả hai cột; Migrate backfill dữ liệu và đọc cột mới; Contract xóa cột cũ user_name. Mỗi pha đều rollback an toàn vì luôn tương thích ngược.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Expand / Contract — mỗi pha đều rollback an toàn</text>
  <g>
    <rect x="14" y="44" width="218" height="120" rx="11" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="30" y="68" font-size="13" font-weight="700" fill="currentColor">1 · Expand</text>
    <text x="30" y="90" font-size="11" fill="currentColor" opacity="0.85">Thêm cột username</text>
    <text x="30" y="108" font-size="11" fill="currentColor" opacity="0.85">Ghi cả user_name + username</text>
    <text x="30" y="126" font-size="11" fill="currentColor" opacity="0.85">Đọc từ cột cũ user_name</text>
    <text x="30" y="151" font-size="10.5" font-weight="700" fill="#10b981">✓ rollback an toàn</text>
  </g>
  <g>
    <rect x="251" y="44" width="218" height="120" rx="11" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="267" y="68" font-size="13" font-weight="700" fill="currentColor">2 · Migrate</text>
    <text x="267" y="90" font-size="11" fill="currentColor" opacity="0.85">Backfill dữ liệu sang username</text>
    <text x="267" y="108" font-size="11" fill="currentColor" opacity="0.85">Vẫn ghi cả hai cột</text>
    <text x="267" y="126" font-size="11" fill="currentColor" opacity="0.85">Đổi code sang đọc username</text>
    <text x="267" y="151" font-size="10.5" font-weight="700" fill="#10b981">✓ rollback an toàn</text>
  </g>
  <g>
    <rect x="488" y="44" width="218" height="120" rx="11" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="504" y="68" font-size="13" font-weight="700" fill="currentColor">3 · Contract</text>
    <text x="504" y="90" font-size="11" fill="currentColor" opacity="0.85">Xóa cột cũ user_name</text>
    <text x="504" y="108" font-size="11" fill="currentColor" opacity="0.85">Chỉ sau khi ổn định nhiều ngày</text>
    <text x="504" y="126" font-size="11" fill="currentColor" opacity="0.85">Dọn code ghi cột cũ</text>
    <text x="504" y="151" font-size="10.5" font-weight="700" fill="currentColor" opacity="0.7">điểm không quay lui</text>
  </g>
  <defs>
    <marker id="sreMig" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0 0 L6 3 L0 6 z" fill="currentColor"/>
    </marker>
  </defs>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none" stroke-width="1.5">
    <path d="M232 104 H251" marker-end="url(#sreMig)"/>
    <path d="M469 104 H488" marker-end="url(#sreMig)"/>
  </g>
  <text x="360" y="200" text-anchor="middle" font-size="11.5" font-weight="700" fill="currentColor">Luôn backward-compatible: bản cũ và bản mới chạy song song được</text>
  <text x="360" y="222" text-anchor="middle" font-size="10.5" fill="currentColor" opacity="0.75">Không bao giờ "đổi tên cột rồi deploy code mới" trong một bước — đó là cái bẫy khiến rollback bất khả thi</text>
</svg>

## Canary & Automated Rollback theo SLO/Metric

Canary deployment: đẩy phiên bản mới ra một phần nhỏ traffic trước, **so sánh metric của canary với baseline (bản đang chạy)**, chỉ mở rộng khi tốt.

Tiến trình điển hình theo phần trăm traffic: `1% -> 5% -> 25% -> 50% -> 100%`, mỗi bước "bake" (theo dõi) đủ lâu để metric ổn định — thường 10–30 phút mỗi giai đoạn tùy lưu lượng.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 290" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Canary tăng dần traffic qua các cổng automated gate</title>
  <desc>Chuỗi bước canary 1%, 5%, 25%, 50%, 100%; giữa mỗi bước là bake time và một automated gate so sánh canary với baseline về error rate và p99; nếu gate fail thì rollback ngay về baseline.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Canary là chuỗi bước có cổng — không bật ngay 100%</text>
  <g font-size="12.5" font-weight="700">
    <rect x="14" y="44" width="84" height="46" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="56" y="66" text-anchor="middle" fill="currentColor">1%</text>
    <text x="56" y="82" text-anchor="middle" font-size="10" font-weight="400" fill="currentColor" opacity="0.7">canary</text>
    <rect x="172" y="44" width="84" height="46" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="214" y="66" text-anchor="middle" fill="currentColor">5%</text>
    <text x="214" y="82" text-anchor="middle" font-size="10" font-weight="400" fill="currentColor" opacity="0.7">canary</text>
    <rect x="330" y="44" width="84" height="46" rx="9" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="372" y="66" text-anchor="middle" fill="currentColor">25%</text>
    <text x="372" y="82" text-anchor="middle" font-size="10" font-weight="400" fill="currentColor" opacity="0.7">canary</text>
    <rect x="488" y="44" width="84" height="46" rx="9" fill="#3b82f6" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="530" y="66" text-anchor="middle" fill="currentColor">50%</text>
    <text x="530" y="82" text-anchor="middle" font-size="10" font-weight="400" fill="currentColor" opacity="0.7">canary</text>
    <rect x="620" y="44" width="86" height="46" rx="9" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="663" y="66" text-anchor="middle" fill="currentColor">100%</text>
    <text x="663" y="82" text-anchor="middle" font-size="10" font-weight="400" fill="currentColor" opacity="0.7">promote</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none" stroke-width="1.5">
    <path d="M98 67 H172" marker-end="url(#sreArrow)"/>
    <path d="M256 67 H330" marker-end="url(#sreArrow)"/>
    <path d="M414 67 H488" marker-end="url(#sreArrow)"/>
    <path d="M572 67 H620" marker-end="url(#sreArrow)"/>
  </g>
  <defs>
    <marker id="sreArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0 0 L6 3 L0 6 z" fill="currentColor"/>
    </marker>
  </defs>
  <g font-size="9.5" fill="currentColor" opacity="0.75" text-anchor="middle">
    <text x="135" y="106">bake + gate</text>
    <text x="293" y="106">bake + gate</text>
    <text x="451" y="106">bake + gate</text>
    <text x="596" y="106">bake + gate</text>
  </g>
  <rect x="14" y="132" width="692" height="86" rx="11" fill="#f59e0b" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="28" y="153" font-size="12" font-weight="700" fill="currentColor">Automated gate ở mỗi bước (máy quyết định, không nhìn dashboard bằng mắt)</text>
  <text x="28" y="175" font-size="11" fill="currentColor" opacity="0.85">So sánh canary vs baseline: error rate (5xx) · latency p99</text>
  <text x="28" y="194" font-size="11" fill="currentColor" opacity="0.85">PASS → tăng % sang bước kế</text>
  <text x="28" y="211" font-size="11" fill="currentColor" opacity="0.85">FAIL → abort ngay</text>
  <g>
    <rect x="470" y="234" width="236" height="42" rx="10" fill="#ef4444" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="588" y="260" text-anchor="middle" font-size="12.5" font-weight="700" fill="currentColor">ROLLBACK về baseline tức thì</text>
  </g>
  <path d="M120 218 V250 H470" stroke="#ef4444" stroke-opacity="0.7" stroke-width="1.5" fill="none" stroke-dasharray="5 4" marker-end="url(#sreArrow)"/>
  <text x="150" y="245" font-size="9.5" fill="currentColor" opacity="0.75">gate FAIL bất kỳ bước nào</text>
</svg>

Điều khiến canary thực sự an toàn không phải là việc chia traffic, mà là **automated rollback dựa trên SLI**. Quyết định promote/rollback phải do máy ra, không phải do con người căng mắt nhìn dashboard.

Các tín hiệu (SLI) thường dùng để gate canary:

- **Error rate** (HTTP 5xx, gRPC non-OK)
- **Latency** p99 / p95
- **Saturation** (CPU, memory, restart/crash loop)
- Các business metric quan trọng (ví dụ tỷ lệ checkout thành công)

Ví dụ rule chặn canary bằng PromQL — error rate của canary cao hơn 5x_ baseline thì rollback:

```promql
# Tỷ lệ lỗi 5xx của canary
sum(rate(http_requests_total{job="api", version="canary", status=~"5.."}[5m]))
  / sum(rate(http_requests_total{job="api", version="canary"}[5m]))
> 0.01   # ngưỡng tuyệt đối: >1% lỗi -> abort
```

```promql
# So sánh tương đối canary vs baseline (latency p99)
histogram_quantile(0.99,
  sum by (le) (rate(http_request_duration_seconds_bucket{version="canary"}[5m])))
>
1.2 * histogram_quantile(0.99,
  sum by (le) (rate(http_request_duration_seconds_bucket{version="stable"}[5m])))
# canary chậm hơn baseline >20% -> abort
```

Cấu hình một bước canary (kiểu Argo Rollouts / Flagger) trông như sau:

```yaml
strategy:
  canary:
    steps:
      - setWeight: 5          # 5% traffic vào canary
      - pause: { duration: 10m }
      - analysis:             # tự động phân tích metric
          templates:
            - templateName: error-rate
            - templateName: latency-p99
      - setWeight: 25
      - pause: { duration: 15m }
      - setWeight: 50
      - pause: { duration: 15m }
      - setWeight: 100
    analysis:
      successCondition: "result < 0.01"   # error rate < 1%
      failureLimit: 1                       # 1 lần fail là rollback ngay
      interval: 1m
      count: 10
```

> 💡 Nguyên tắc: Dùng **cả ngưỡng tuyệt đối lẫn ngưỡng so sánh**. Ngưỡng tuyệt đối ("error rate < 1%") bắt lỗi nghiêm trọng. Ngưỡng so sánh ("không tệ hơn baseline 20%") bắt regression tinh vi mà ngưỡng cố định bỏ sót khi baseline vốn đã có chút lỗi nền.

> ⚠️ Bẫy: Canary 1% nhưng SLI tổng hợp trên 100% traffic. Khi đó 1% xấu bị 99% tốt làm loãng, alert không bao giờ kêu. **Phải tách label `version="canary"`** để đánh giá riêng nhóm canary, nếu không canary chỉ là trang trí.

## Feature Flag: tách Deploy khỏi Release

Đây là sự phân biệt quan trọng nhất và bị nhầm lẫn nhiều nhất:

- **Deploy** = đưa binary/code lên production (kỹ thuật).
- **Release** = bật tính năng cho người dùng nhìn thấy (sản phẩm/kinh doanh).

Feature flag cho phép bạn deploy code "tắt", rồi bật dần một cách độc lập:

```python
if feature_flags.enabled("new_checkout_flow", user=ctx.user):
    return new_checkout(ctx)
return legacy_checkout(ctx)
```

Lợi ích vận hành:

- **Rollback tức thời không cần deploy**: tắt flag mất < 1 giây, không cần build pipeline.
- **Tách blast radius theo người dùng**: bật cho nội bộ -> 1% -> 10% -> đối tượng cụ thể.
- **Kill switch** cho dependency: khi một downstream service quá tải, tắt feature đang gọi nó để giảm tải tức thì.

| | Canary | Feature Flag |
|---|---|---|
| Đơn vị kiểm soát | Phiên bản binary (theo instance/traffic) | Tính năng (theo user/segment) |
| Tốc độ tắt | Phải shift traffic / redeploy | Tức thì, không deploy |
| Phạm vi | Toàn bộ release đi cùng nhau | Từng tính năng độc lập |
| Rủi ro nợ kỹ thuật | Thấp | Cao nếu flag chết không được dọn |

> ⚠️ Bẫy: Flag debt. Flag tạo ra để rollout rồi quên xóa, tích lũy thành rừng `if/else` không ai dám đụng. Đặt **TTL cho mỗi flag tạm thời** và có quy trình dọn dẹp định kỳ. Một flag tồn tại 18 tháng là một quả mìn cấu hình.

## Blast radius nhỏ

Blast radius = số lượng người dùng / dữ liệu / hệ thống bị ảnh hưởng khi một thay đổi hỏng. Nguyên tắc cốt lõi của progressive delivery là **không bao giờ để một thay đổi chạm 100% cùng lúc**.

Các đòn bẩy thu nhỏ blast radius:

- **Phân vùng theo cell / shard**: chia hạ tầng thành nhiều cell độc lập, deploy lần lượt từng cell.
- **Staged rollout theo region**: deploy region nhỏ nhất / ít quan trọng nhất trước (ví dụ một region nội bộ), bake, rồi mới tới region lớn.
- **Per-user / per-tenant rollout**: kết hợp feature flag, mở dần theo tệp người dùng.

Ví dụ thứ tự rollout theo region với "bake time":

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 220" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Staged rollout theo region giảm blast radius</title>
  <desc>Pipeline rollout theo region với bake time tăng dần và kích cỡ region tăng dần: us-staging, bake 30 phút, ap-southeast-1 nhỏ, bake 1 giờ, eu-west-1 vừa, bake 1 giờ, us-east-1 lớn nhất ở cuối cùng.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Deploy nơi rẻ nhất trước — region lớn nhất ở cuối</text>
  <text x="16" y="44" font-size="10.5" fill="currentColor" opacity="0.7">Cột càng cao = region càng lớn = blast radius càng to nếu hỏng</text>
  <defs>
    <marker id="sreReg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0 0 L6 3 L0 6 z" fill="currentColor"/>
    </marker>
  </defs>
  <g>
    <rect x="14" y="146" width="118" height="40" rx="9" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="73" y="164" text-anchor="middle" font-size="11.5" font-weight="700" fill="currentColor">us-staging</text>
    <text x="73" y="179" text-anchor="middle" font-size="9.5" fill="currentColor" opacity="0.7">đầu tiên</text>
  </g>
  <g>
    <rect x="186" y="116" width="118" height="70" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="245" y="142" text-anchor="middle" font-size="11.5" font-weight="700" fill="currentColor">ap-southeast-1</text>
    <text x="245" y="159" text-anchor="middle" font-size="9.5" fill="currentColor" opacity="0.7">nhỏ</text>
  </g>
  <g>
    <rect x="358" y="86" width="118" height="100" rx="9" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="417" y="112" text-anchor="middle" font-size="11.5" font-weight="700" fill="currentColor">eu-west-1</text>
    <text x="417" y="129" text-anchor="middle" font-size="9.5" fill="currentColor" opacity="0.7">vừa</text>
  </g>
  <g>
    <rect x="530" y="60" width="118" height="126" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="589" y="86" text-anchor="middle" font-size="11.5" font-weight="700" fill="currentColor">us-east-1</text>
    <text x="589" y="103" text-anchor="middle" font-size="9.5" fill="currentColor" opacity="0.7">lớn nhất · cuối</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none" stroke-width="1.5">
    <path d="M132 166 H186" marker-end="url(#sreReg)"/>
    <path d="M304 151 H358" marker-end="url(#sreReg)"/>
    <path d="M476 136 H530" marker-end="url(#sreReg)"/>
  </g>
  <g font-size="9.5" fill="currentColor" opacity="0.78" text-anchor="middle">
    <text x="159" y="160">bake 30m</text>
    <text x="331" y="145">bake 1h</text>
    <text x="503" y="130">bake 1h</text>
  </g>
  <line x1="14" y1="198" x2="648" y2="198" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="14" y="214" font-size="10" fill="currentColor" opacity="0.7">thời gian →  (bake time tăng dần khi region lớn dần)</text>
</svg>

> 💡 Nguyên tắc: **Deploy nơi rẻ nhất trước.** Region/cell đầu tiên nên là nơi mà nếu hỏng thì thiệt hại thấp nhất, nhưng vẫn đủ traffic thật để SLI có ý nghĩa thống kê. Staging không có traffic thật thường không bắt được lỗi thật.

> ⚠️ Bẫy: "Global config" đẩy đồng thời mọi region trong 1 giây. Config push thường bị coi nhẹ vì "không phải code", nhưng một dòng config sai (ví dụ timeout = 0) có blast radius toàn cầu tức thì. **Config cũng phải đi qua progressive rollout** như code.

## Error-budget-based release freeze

Đây là chỗ SLO gặp deployment. Nếu SLO của bạn là **99.9% availability/tháng**, error budget là **0.1% ≈ 43 phút downtime/tháng**. Error budget là "ngân sách rủi ro" để chi cho việc release nhanh.

Cơ chế policy điển hình:

| Tình trạng error budget | Hành động |
|---|---|
| Còn dồi dào (> 50%) | Release thoải mái, ưu tiên tốc độ, chạy thử nghiệm rủi ro hơn |
| Cạn dần (10–50%) | Vẫn release nhưng siết canary, tăng bake time, review kỹ hơn |
| Cháy hết (≤ 0%) | **Freeze**: chỉ cho phép thay đổi giảm rủi ro (P0 fix, reliability work). Dừng feature mới |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 280" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Error budget như đèn giao thông tự điều chỉnh tốc độ release</title>
  <desc>Thanh error budget chia ba vùng: trên 50 phần trăm release thoải mái, 10 đến 50 phần trăm siết canary và tăng bake time, nhỏ hơn hoặc bằng 0 thì freeze. Bên dưới minh hoạ Deploy tách rời Release qua feature flag.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Error budget là "đèn giao thông" tự điều chỉnh tốc độ release</text>
  <g>
    <rect x="14" y="44" width="690" height="44" rx="9" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
    <circle cx="40" cy="66" r="9" fill="#10b981"/>
    <text x="62" y="63" font-size="12.5" font-weight="700" fill="currentColor">Budget &gt; 50% — GO</text>
    <text x="62" y="80" font-size="10.5" fill="currentColor" opacity="0.82">Release thoải mái, ưu tiên tốc độ, dám chạy thử nghiệm rủi ro hơn</text>
  </g>
  <g>
    <rect x="14" y="96" width="690" height="44" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
    <circle cx="40" cy="118" r="9" fill="#f59e0b"/>
    <text x="62" y="115" font-size="12.5" font-weight="700" fill="currentColor">Budget 10–50% — CAUTION</text>
    <text x="62" y="132" font-size="10.5" fill="currentColor" opacity="0.82">Vẫn release nhưng siết canary, tăng bake time, review kỹ hơn</text>
  </g>
  <g>
    <rect x="14" y="148" width="690" height="44" rx="9" fill="#ef4444" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
    <circle cx="40" cy="170" r="9" fill="#ef4444"/>
    <text x="62" y="167" font-size="12.5" font-weight="700" fill="currentColor">Budget ≤ 0% — STOP (freeze)</text>
    <text x="62" y="184" font-size="10.5" fill="currentColor" opacity="0.82">Chỉ thay đổi giảm rủi ro (P0 fix, reliability). Dừng feature mới — tự động theo policy</text>
  </g>
  <line x1="14" y1="208" x2="704" y2="208" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="16" y="228" font-size="12" font-weight="700" fill="currentColor">Feature flag tách Deploy khỏi Release</text>
  <defs>
    <marker id="sreBud" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0 0 L6 3 L0 6 z" fill="currentColor"/>
    </marker>
  </defs>
  <g>
    <rect x="16" y="238" width="150" height="34" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="91" y="259" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor">Deploy (code lên prod)</text>
  </g>
  <path d="M166 255 H214" stroke="currentColor" stroke-opacity="0.55" stroke-width="1.5" fill="none" marker-end="url(#sreBud)"/>
  <g>
    <rect x="216" y="238" width="150" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="291" y="254" text-anchor="middle" font-size="10.5" font-weight="700" fill="currentColor">Feature flag</text>
    <text x="291" y="267" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.75">đèn budget điều khiển</text>
  </g>
  <path d="M366 255 H414" stroke="currentColor" stroke-opacity="0.55" stroke-width="1.5" fill="none" marker-end="url(#sreBud)"/>
  <g>
    <rect x="416" y="238" width="150" height="34" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="491" y="259" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor">Release (bật cho user)</text>
  </g>
  <text x="582" y="252" font-size="9.5" fill="currentColor" opacity="0.75">Code có thể đã deploy</text>
  <text x="582" y="265" font-size="9.5" fill="currentColor" opacity="0.75">mà chưa release nếu freeze</text>
</svg>

Lợi ích lớn nhất: nó **biến độ tin cậy thành một cuộc đối thoại dựa trên dữ liệu**, không phải tranh cãi cảm tính giữa dev (muốn ship) và SRE (muốn chậm). Khi budget cháy, freeze là tự động theo policy, không ai phải "làm người xấu".

Ví dụ alert burn-rate (multi-window) để biết budget đang bị đốt nhanh:

```promql
# Burn rate 14.4x trong 1h => sẽ đốt hết budget tháng trong ~2 ngày
(
  sum(rate(http_requests_total{status=~"5.."}[1h]))
  / sum(rate(http_requests_total[1h]))
) > (14.4 * 0.001)   # 0.001 = 1 - SLO 99.9%
```

> 💡 Nguyên tắc: Dùng **multi-window, multi-burn-rate alert** (fast burn 1h + slow burn 6h). Fast burn page on-call ngay; slow burn chỉ tạo ticket. Cách này vừa nhạy với sự cố lớn vừa không spam vì những đốt nhỏ kéo dài.

## Deployment checklist

Một checklist thực dụng để gắn vào pipeline (tự động hóa được càng nhiều càng tốt):

**Trước deploy**
- [ ] Thay đổi là **backward-compatible** (DB schema, API contract, message format)? Rollback có an toàn không?
- [ ] Còn **error budget** không? Đang trong freeze window không?
- [ ] Có **feature flag** bọc tính năng rủi ro, mặc định OFF?
- [ ] Đã định nghĩa **SLI + ngưỡng abort** cho canary chưa?
- [ ] Artifact bản hiện tại còn lưu để rollback? Lệnh rollback đã được kiểm chứng?

**Trong deploy**
- [ ] Canary chạy theo từng bước, **gate bằng metric tự động**, không skip bake time.
- [ ] Dashboard so sánh canary vs baseline đang theo dõi.
- [ ] On-call biết đang có deploy (deploy marker trên dashboard/alert).

**Sau deploy**
- [ ] Theo dõi đủ một chu kỳ traffic (gồm giờ cao điểm) trước khi coi là "xong".
- [ ] Dọn flag tạm, cleanup migration phase contract khi đã ổn định.
- [ ] Cập nhật post-mortem nếu có abort/rollback.

> 💡 Nguyên tắc: **Nếu một bước trong checklist không tự động hóa được, đó là nợ kỹ thuật cần ghi nhận.** Checklist thủ công sẽ bị bỏ qua vào 2 giờ sáng khi đang vội — chỉ những gate được pipeline ép buộc mới thực sự bảo vệ bạn.

---

## Liên hệ sang AWS

Các khái niệm trên ánh xạ trực tiếp sang dịch vụ AWS:

- **Canary + automated rollback**: **AWS CodeDeploy** hỗ trợ deployment config `Canary`/`Linear` (ví dụ `CodeDeployDefault.ECSCanary10Percent5Minutes`) và **rollback tự động khi CloudWatch Alarm chuyển sang ALARM**. Với Lambda, dùng alias + traffic shifting kết hợp CodeDeploy.
- **SLI/metric & alarm gate**: **Amazon CloudWatch** (metrics, alarms, **composite alarms** cho điều kiện AND/OR), **CloudWatch Synthetics canary** để probe endpoint chủ động, và **Metric Math** để tính tỷ lệ lỗi/burn-rate tương tự PromQL ở trên.
- **Distributed tracing để tìm regression latency**: **AWS X-Ray** (service map, trace, so sánh latency theo segment giữa version cũ/mới).
- **Feature flag**: **AWS AppConfig** với **feature flags + deployment strategy** (rollout theo phần trăm + bake time) và **automatic rollback** khi CloudWatch Alarm kích hoạt — đúng tinh thần "tách deploy khỏi release".
- **Progressive / blast radius theo region**: pipeline nhiều stage trong **AWS CodePipeline** deploy lần lượt theo region/account, kết hợp **CloudFormation StackSets** cho cell-based rollout.
- **Tín hiệu sức khỏe nền tảng**: **AWS Health Dashboard** (sự kiện ảnh hưởng tài khoản/region) để phân biệt "sự cố do deploy của ta" với "sự cố hạ tầng AWS".
- **Error-budget policy**: tự dựng bằng CloudWatch Metric Math + alarm, hoặc dùng **CloudWatch Application Signals (SLO)** để định nghĩa SLO và theo dõi error budget burn rate trực tiếp.
