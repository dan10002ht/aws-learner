# Nguyên lý SRE: SLI/SLO/Error Budget

Bài học này đặt nền móng cho toàn bộ tư duy SRE: thay vì "giữ hệ thống không bao giờ down", bạn học cách **đo lường mức độ tin cậy bằng con số**, đặt mục tiêu hợp lý, và dùng phần "được phép hỏng" như một ngân sách để cân bằng giữa tốc độ ra tính năng và độ ổn định.

## SRE là gì?

SRE (Site Reliability Engineering) là cách Google định nghĩa: *"what happens when you ask a software engineer to design an operations team."* Nói gọn, SRE là **vận hành (operations) được giải quyết bằng kỹ thuật phần mềm (software engineering)**.

Khác biệt cốt lõi so với mô hình sysadmin truyền thống:

| Khía cạnh | Ops truyền thống | SRE |
|---|---|---|
| Xử lý sự cố | Thủ công, dựa vào kinh nghiệm cá nhân | Tự động hoá, runbook, code |
| Mục tiêu reliability | "Càng cao càng tốt" (mơ hồ) | SLO định lượng (vd 99.9%) |
| Công việc lặp lại (toil) | Chấp nhận như một phần của job | Bị coi là nợ, phải <50% thời gian |
| Quan hệ với Dev | Tách biệt, hay đổ lỗi | Chung error budget, chung trách nhiệm |
| Thay đổi (change) | Sợ thay đổi, hạn chế deploy | Deploy thường xuyên trong giới hạn budget |

> 💡 Nguyên tắc: Reliability là một **tính năng (feature)** của hệ thống, không phải một mong muốn. Đã là feature thì phải đo được, có mục tiêu, và có chi phí.

SRE đứng trên ba khái niệm liên kết với nhau: **SLI → SLO → Error Budget**. Hiểu sai một cái là sai cả chuỗi.

## SLI — Service Level Indicator

SLI là **một con số đo trực tiếp mức độ tốt của dịch vụ tại một thời điểm**, thường biểu diễn dưới dạng tỉ lệ "sự kiện tốt / tổng sự kiện".

```
SLI = (số request "tốt") / (tổng số request hợp lệ) × 100%
```

Bốn nhóm SLI phổ biến nhất (the four golden signals nghiêng về phía SLI):

| Loại SLI | Đo cái gì | Ví dụ "tốt" |
|---|---|---|
| Availability | Tỉ lệ request thành công | HTTP status != 5xx |
| Latency | Tỉ lệ request đủ nhanh | p99 < 300ms |
| Error rate | Tỉ lệ lỗi | < 0.1% request trả 5xx |
| Throughput / Saturation | Tải hệ thống chịu được | queue depth < 1000 |

### Chọn đúng metric

Đây là phần dễ làm sai nhất. Vài nguyên tắc:

- **Đo từ góc nhìn người dùng, không phải góc nhìn server.** "CPU 80%" không phải SLI tốt — người dùng không quan tâm CPU. "Tỉ lệ trang load < 1s" mới là cái họ cảm nhận.
- **Latency phải dùng percentile, không dùng trung bình.** Trung bình che giấu đuôi (tail). Nếu trung bình 100ms nhưng p99 là 4s, thì 1% người dùng (có thể là khách hàng lớn nhất) đang khổ.
- **Định nghĩa rõ "request hợp lệ".** Health-check nội bộ, bot scan, request từ chính monitoring... nên loại khỏi mẫu số, nếu không SLI bị bóp méo.

Ví dụ định nghĩa SLI latency bằng PromQL (tỉ lệ request dưới 300ms trong 5 phút):

```promql
sum(rate(http_request_duration_seconds_bucket{le="0.3", job="api"}[5m]))
/
sum(rate(http_request_duration_seconds_count{job="api"}[5m]))
```

> ⚠️ Bẫy: Đo availability bằng cách ping `/healthz`. Endpoint health-check thường chỉ kiểm tra process còn sống, không gọi database, không qua business logic. Nó sẽ báo "xanh" trong khi user thật đang nhận lỗi 500. Hãy đo trên **traffic thật của user**.

## SLO — Service Level Objective

SLO là **mục tiêu bạn tự đặt cho SLI trong một cửa sổ thời gian** (thường 28 hoặc 30 ngày rolling). Đây là cam kết nội bộ của team.

Ví dụ một bộ SLO cho API thanh toán:

```yaml
slo:
  name: payment-api-availability
  sli: success_rate          # request != 5xx
  objective: 99.9%           # mục tiêu
  window: 28d                # rolling 28 ngày
  alerting:
    page_on_burn_rate: 14.4  # đốt budget nhanh gấp 14.4x → page ngay

  - name: payment-api-latency
    sli: fraction_under_300ms
    objective: 99.0%
    window: 28d
```

### "Chín nhân" và ý nghĩa thực tế

Mỗi số 9 thêm vào làm giảm downtime cho phép gấp ~10 lần, nhưng chi phí kỹ thuật tăng phi tuyến:

| SLO | Downtime/tháng (30 ngày) | Downtime/năm | Downtime/tuần |
|---|---|---|---|
| 99% (2 nines) | 7h 18m | 3.65 ngày | 1h 41m |
| 99.9% (3 nines) | 43m 50s | 8.76h | 10m 4s |
| 99.95% | 21m 54s | 4.38h | 5m 2s |
| 99.99% (4 nines) | 4m 23s | 52.6m | 1m 0s |
| 99.999% (5 nines) | 26s | 5.26m | 6s |

> 💡 Nguyên tắc: SLO tối ưu **không phải là 100%**. 100% nghĩa là bạn không bao giờ được deploy, không bao giờ được bảo trì, và phải trả chi phí dự phòng vô hạn. Mức 99.9% thường là điểm cân bằng tốt; chỉ leo lên 99.99% khi business thực sự trả tiền cho nó.

### SLO phải bám vào kỳ vọng người dùng

Đặt SLO 99.999% cho một dashboard nội bộ dùng giờ hành chính là lãng phí. Ngược lại, đặt 99% cho cổng thanh toán là tự sát về doanh thu. Hãy hỏi: *nếu hệ thống đạt đúng SLO này (không hơn), người dùng có hài lòng không?* Nếu user không phân biệt nổi 99.9% và 99.99% thì đừng trả chi phí cho con 9 thứ tư.

## SLA — Service Level Agreement

SLA là **cam kết với khách hàng kèm hậu quả tài chính/pháp lý nếu vi phạm** (thường là hoàn tiền hoặc credit). SLA là hợp đồng; SLO là mục tiêu kỹ thuật.

| | SLI | SLO | SLA |
|---|---|---|---|
| Bản chất | Phép đo | Mục tiêu nội bộ | Cam kết hợp đồng |
| Đối tượng | Hệ thống | Team kỹ thuật | Khách hàng / pháp lý |
| Vi phạm thì sao | (không áp dụng) | Báo động, dừng deploy | Hoàn tiền / phạt credit |
| Con số | 99.95% đo được | 99.9% đặt ra | 99.5% cam kết bán |

> 💡 Nguyên tắc: **SLA luôn lỏng hơn SLO.** Nếu bạn bán SLA 99.9% thì nội bộ nên đặt SLO 99.95%. Khoảng đệm đó cho bạn thời gian phát hiện và sửa trước khi chạm ngưỡng phải trả tiền cho khách. Nếu SLO = SLA, bạn sẽ phải bồi thường ngay khi báo động đầu tiên kêu.

Ví dụ thực tế: AWS Compute SLA cam kết 99.99% cho EC2 ở cấp Region; nếu xuống dưới, khách nhận service credit theo bậc (10% / 30% / 100% hoá đơn tháng tuỳ mức vi phạm) — chứ không phải hoàn toàn bộ.

## Error Budget — trái tim của SRE

Error budget là **phần "được phép hỏng" còn lại**, suy ra trực tiếp từ SLO:

```
Error Budget = 100% − SLO
```

Nó biến reliability từ cuộc tranh cãi cảm tính ("hệ thống có ổn định không?") thành một con số ngân sách mà cả Dev và SRE đều nhìn vào.

### Ví dụ tính error budget từ SLO 99.9%

Giả sử API xử lý **43,200,000 request / 28 ngày** (tức ~1.08M request/ngày, ~12.5 req/s).

```
SLO            = 99.9%
Error budget   = 100% − 99.9% = 0.1%
Budget request = 43,200,000 × 0.001 = 43,200 request được phép lỗi / 28 ngày
Budget thời gian = 28 ngày × 0.001
                 = 28 × 24 × 60 × 0.001 phút
                 = 40,320 × 0.001 = 40.32 phút downtime / 28 ngày
```

Diễn giải: bạn có **43,200 lỗi** hoặc **~40 phút downtime** để "tiêu" trong 28 ngày. Một incident lớn ngốn 30 phút? Bạn vừa đốt 75% budget của cả chu kỳ.

### Burn rate — tốc độ đốt budget

Burn rate = mức độ nhanh chậm so với "tiêu đều". Burn rate = 1 nghĩa là nếu cứ thế này thì hết đúng budget khi hết window. Burn rate = 14.4 nghĩa là sẽ cháy sạch budget 28 ngày chỉ trong ~2 ngày.

```promql
# Burn rate trong 1 giờ: tỉ lệ lỗi thực tế / error budget cho phép
(
  sum(rate(http_requests_total{status=~"5.."}[1h]))
  /
  sum(rate(http_requests_total[1h]))
) / 0.001    # 0.001 = error budget của SLO 99.9%
```

Cảnh báo multi-window, multi-burn-rate (kiểu Google SRE workbook):

| Mức nghiêm trọng | Burn rate | Cửa sổ ngắn / dài | % budget tiêu | Hành động |
|---|---|---|---|---|
| Critical (page) | 14.4 | 5m và 1h | ~2% trong 1h | Đánh thức người trực ngay |
| High (page) | 6 | 30m và 6h | ~5% trong 6h | Page giờ làm việc |
| Warning (ticket) | 1 | 6h và 3d | ~10% trong 3d | Tạo ticket, xử lý trong tuần |

Ví dụ alert YAML (Prometheus):

```yaml
- alert: ErrorBudgetBurnFast
  expr: |
    (
      sum(rate(http_requests_total{status=~"5.."}[5m]))
      / sum(rate(http_requests_total[5m]))
    ) > (14.4 * 0.001)
  for: 2m
  labels: { severity: page }
  annotations:
    summary: "Đốt error budget nhanh gấp 14.4x — sẽ cháy sạch budget 28d trong ~2 ngày"
```

> ⚠️ Bẫy: Cảnh báo trực tiếp trên "tỉ lệ lỗi > 0.1%" sẽ kêu ré lên với mọi spike 30 giây vô hại, gây alert fatigue. Hãy cảnh báo trên **burn rate kết hợp nhiều cửa sổ** (vd vi phạm cả 5m lẫn 1h) để vừa nhạy với sự cố thật, vừa không page vì nhiễu.

### Chính sách error budget — dùng số để ra quyết định

Đây là điểm khiến error budget hữu dụng: nó là **cơ chế tự điều chỉnh** cho mâu thuẫn muôn thuở giữa Dev (muốn ship nhanh) và SRE (muốn ổn định).

> 💡 Nguyên tắc (Error Budget Policy):
> - **Còn budget** → Dev được tự do deploy feature, thử nghiệm, chấp nhận rủi ro.
> - **Hết budget** → đóng băng feature (feature freeze). Mọi nỗ lực dồn vào reliability: sửa bug, thêm test, cải thiện rollback — cho đến khi budget hồi lại.

Vì cùng nhìn một con số, không còn cãi nhau cảm tính. Budget cạn không phải để "trừng phạt" mà là tín hiệu khách quan rằng hệ thống cần được chăm sóc trước khi đẩy thêm rủi ro. Nó cũng tạo động lực để Dev tự đầu tư vào canary, automated rollback, feature flag — vì đó là cách bảo vệ budget của chính họ.

Một tình huống thực tế: team đã đốt 90% budget tháng vì một sự cố cache. Một feature lớn đang chờ release. Theo policy, release bị hoãn đến đầu chu kỳ sau — không phải vì sếp quyết, mà vì con số. Đổi lại, nếu cả tháng yên ổn và budget gần như nguyên vẹn, đó là tín hiệu bạn đang **quá thận trọng** (over-provisioned) và có thể tăng nhịp deploy, hạ chi phí hạ tầng.

## Toil & Tự động hoá

Toil là **công việc vận hành thủ công, lặp lại, không tạo giá trị lâu dài, và tự động hoá được** — nó tăng tuyến tính theo quy mô dịch vụ.

Một việc là toil khi nó hội đủ các đặc điểm: thủ công, lặp lại, có thể script hoá, mang tính phản ứng (reactive), không có giá trị bền vững, và **scale tuyến tính theo traffic/số host**. Ví dụ: restart service bằng tay, duyệt cấp quyền lặp đi lặp lại, clear disk đầy mỗi tuần, copy log thủ công khi điều tra.

> 💡 Nguyên tắc: Google đặt **trần toil ở mức 50%** thời gian của một SRE. Phần còn lại phải dành cho kỹ thuật làm giảm toil trong tương lai (automation, tooling, cải thiện hệ thống). Nếu không, team biến thành đội ops thuần, toil nuốt chửng mọi thời gian, và không bao giờ thoát ra được.

Tại sao đo và giới hạn toil quan trọng:

| Hệ quả nếu toil không kiểm soát | Cách SRE giảm toil |
|---|---|
| Team không scale: x2 traffic cần x2 người | Automation: việc lặp → code |
| Burnout, nghỉ việc, mất kiến thức | Self-service tooling cho Dev |
| Không còn thời gian cải thiện hệ thống | Runbook → runbook automation |
| Lỗi do thao tác tay (human error) | Loại bỏ thao tác tay khỏi critical path |

Ví dụ: "duyệt cấp quyền truy cập" mỗi tuần tốn 5 giờ thủ công. Thay vì làm mãi, SRE bỏ 2 ngày viết một tool self-service có approval workflow. Sau đó toil về gần 0 và thời gian được giải phóng cho việc tạo giá trị thật. Đó chính là tinh thần "ops bằng kỹ thuật phần mềm".

## Liên hệ sang AWS

Các khái niệm trên ánh xạ trực tiếp vào dịch vụ AWS:

| Khái niệm SRE | Dịch vụ / tính năng AWS | Ghi chú |
|---|---|---|
| SLI (đo metric) | **CloudWatch Metrics** | Custom metrics, percentile statistics (p99) cho latency |
| SLI/SLO chính thức | **CloudWatch Application Signals (Service Level Objectives)** | Định nghĩa SLO trực tiếp, theo dõi attainment & error budget burn |
| Alert theo burn rate | **CloudWatch Alarms** (metric math, composite alarms) | Dựng burn-rate alert bằng metric math; composite alarm cho multi-window |
| Latency / tracing (tail) | **AWS X-Ray** | Truy vết request, tìm bottleneck p99, service map |
| Tổng hợp dashboard | **CloudWatch Dashboards** | Hiển thị SLO attainment, budget còn lại |
| Tình trạng dịch vụ AWS | **AWS Health Dashboard** (Personal Health) | Sự cố từ phía AWS ảnh hưởng tài nguyên của bạn |
| SLA cam kết hợp đồng | **AWS Service SLAs** | Vd EC2/Compute SLA 99.99%, trả service credit khi vi phạm |
| Giảm toil / automation | **Systems Manager (Automation, Run Command)**, **EventBridge**, **Lambda** | Runbook automation, phản ứng sự kiện tự động |
| Số liệu để tính error budget | **CloudWatch Logs Insights / Metrics** | Đếm 5xx vs tổng request từ ALB access logs hoặc app metrics |

Gợi ý triển khai nhanh: đẩy success/latency của user thật (vd từ ALB hoặc app) vào CloudWatch, dùng **Application Signals** để khai báo SLO 99.9%, để CloudWatch tự tính error budget và bật **multi-window burn-rate alarm** page vào on-call (SNS → PagerDuty/Opsgenie). Đối chiếu sự cố nghi từ phía hạ tầng với **AWS Health Dashboard** trước khi kết luận lỗi là của ứng dụng bạn.

> 💡 Nguyên tắc tổng kết: Đừng hỏi "hệ thống có ổn không?" — hãy hỏi "SLI đang bao nhiêu, còn bao nhiêu error budget, và burn rate có an toàn không?". Khi cả tổ chức nói cùng ngôn ngữ con số đó, reliability ngừng là cảm tính và trở thành kỹ thuật.
