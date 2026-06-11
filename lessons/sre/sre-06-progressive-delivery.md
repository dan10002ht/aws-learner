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

## Canary & Automated Rollback theo SLO/Metric

Canary deployment: đẩy phiên bản mới ra một phần nhỏ traffic trước, **so sánh metric của canary với baseline (bản đang chạy)**, chỉ mở rộng khi tốt.

Tiến trình điển hình theo phần trăm traffic: `1% -> 5% -> 25% -> 50% -> 100%`, mỗi bước "bake" (theo dõi) đủ lâu để metric ổn định — thường 10–30 phút mỗi giai đoạn tùy lưu lượng.

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

```
us-staging   ->  bake 30m  ->  ap-southeast-1 (nhỏ)  ->  bake 1h
            ->  eu-west-1 (vừa)  ->  bake 1h  ->  us-east-1 (lớn nhất, cuối cùng)
```

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
