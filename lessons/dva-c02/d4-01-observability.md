# Observability: CloudWatch

CloudWatch là "trung tâm quan sát" của AWS: thu thập **logs**, **metrics**, tạo **alarms**, **dashboards** và chạy **query**. Trong DVA-C02 Domain 4, đề thi cực thích các tình huống "tôi muốn theo dõi X, đẩy dữ liệu đi đâu, dùng tính năng nào" — đặc biệt là phân biệt **EMF vs PutMetricData**, **metric filter vs subscription filter**, và cấu hình **retention**. Bài này đi từ logs → metrics → alarms → query với góc nhìn của developer viết code, kèm bẫy thi.

---

## 1. CloudWatch Logs

### Cấu trúc: Log Group → Log Stream → Log Event

- **Log group**: nhóm logic, thường tương ứng 1 ứng dụng/service. Retention, encryption, metric filter, subscription filter đều set ở mức **log group**.
- **Log stream**: chuỗi log từ **một nguồn** (1 container, 1 instance, 1 Lambda execution environment). Ví dụ Lambda: mỗi execution environment tạo một stream `YYYY/MM/DD/[$LATEST]xxxx`.
- **Log event**: 1 dòng log + timestamp.

> 💡 Mẹo thi: Lambda tự động ghi log vào group `/aws/lambda/<function-name>`. Để ghi được, **execution role** phải có quyền `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`. Nếu function "chạy ok nhưng không thấy log" → gần như chắc chắn là thiếu các quyền này trong IAM role.

### Retention

Mặc định log group giữ log **vĩnh viễn (Never expire)** → tốn tiền âm thầm. Bạn nên set retention rõ ràng.

```bash
aws logs put-retention-policy \
  --log-group-name /aws/lambda/my-func \
  --retention-in-days 14
```

Các giá trị hợp lệ cố định: 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 3288, 3653 ngày. Không phải số nào cũng được.

> ⚠️ Bẫy: "Log lưu mãi mãi, chi phí tăng" → câu trả lời là **set retention policy**, KHÔNG phải tự viết Lambda xóa log. Còn muốn lưu lâu/rẻ để audit → **export sang S3** (hoặc subscription filter → Firehose → S3).

### Metric Filter — biến log thành metric

Metric filter quét **log event** theo pattern và phát ra một **CloudWatch metric**. Dùng khi bạn muốn **đếm/đo** thứ gì đó xuất hiện trong log (số dòng `ERROR`, số lần `OutOfMemory`...) rồi dựng alarm.

```bash
aws logs put-metric-filter \
  --log-group-name /aws/lambda/my-func \
  --filter-name ErrorCount \
  --filter-pattern "ERROR" \
  --metric-transformations \
      metricName=ErrorCount,metricNamespace=MyApp,metricValue=1,defaultValue=0
```

- Pattern dạng `"ERROR"` (term), `"[ip, user, ..., status=5*]"` (space-delimited), hoặc JSON pattern `'{ $.level = "ERROR" }'`.
- `metricValue=1` → mỗi match đếm 1. Có thể trích giá trị số từ log: `metricValue=$.latency`.

> ⚠️ Bẫy kinh điển: **Metric filter chỉ áp dụng cho log MỚI** ghi vào sau khi tạo filter — không hồi tố log cũ. Muốn phân tích log cũ → dùng **Logs Insights**.

### Subscription Filter — stream log real-time đi nơi khác

Subscription filter đẩy **log event** (gần real-time) tới một **destination** để xử lý tiếp:

| Destination | Khi nào dùng |
|---|---|
| **Lambda** | Xử lý/biến đổi từng batch log bằng code (parse, alert custom, forward) |
| **Kinesis Data Streams** | Throughput cao, nhiều consumer, cần replay/ordering |
| **Kinesis Data Firehose** | Nạp log vào S3 / OpenSearch / Redshift gần real-time, không cần code |

```bash
aws logs put-subscription-filter \
  --log-group-name /aws/lambda/my-func \
  --filter-name ToFirehose \
  --filter-pattern "" \
  --destination-arn arn:aws:firehose:...:deliverystream/logs-to-s3 \
  --role-arn arn:aws:iam::...:role/CWLtoFirehoseRole
```

> 💡 Mẹo thi: Phân biệt nhanh:
> - **Metric filter** → ra **số (metric)** để alarm. Đích là CloudWatch Metrics.
> - **Subscription filter** → ra **luồng log** đi tới Lambda/Kinesis/Firehose để xử lý/lưu trữ.
> - "Real-time analytics / archive log sang OpenSearch hoặc S3" → subscription filter → **Firehose** (không cần code) hoặc → **Kinesis** (cần xử lý phức tạp/nhiều consumer).

---

## 2. CloudWatch Metrics

### Khái niệm: Namespace, Dimensions, Metric

- **Namespace**: container của metric (vd `AWS/Lambda`, `AWS/EC2`, hoặc custom `MyApp`). Namespace bắt đầu bằng `AWS/` là **của AWS** — bạn không tự ghi vào đó.
- **Metric**: tên đại lượng (vd `Invocations`, `Duration`).
- **Dimensions**: cặp key/value phân loại metric (vd `FunctionName=my-func`). Một metric + tổ hợp dimensions = một **time series** riêng. Tối đa **30 dimensions** cho một metric.

> ⚠️ Bẫy: Mỗi tổ hợp dimension **khác nhau** tạo ra một metric **riêng biệt** (và tính phí riêng). Đẩy `userId` làm dimension cho hàng triệu user → nổ chi phí custom metric. Dimension nên có **cardinality thấp** (env, region, service...), không phải id tự do.

### Standard vs Custom metrics

| | Standard metrics | Custom metrics |
|---|---|---|
| Nguồn | AWS service tự phát (EC2, Lambda, RDS...) | Bạn đẩy lên qua `PutMetricData` hoặc EMF |
| Namespace | `AWS/*` | Tự đặt |
| Tính phí | Phần lớn miễn phí | Tính theo số metric + số PutMetricData call |

### PutMetricData — đẩy custom metric trực tiếp

```python
import boto3
cw = boto3.client('cloudwatch')
cw.put_metric_data(
    Namespace='MyApp',
    MetricData=[{
        'MetricName': 'OrdersProcessed',
        'Dimensions': [{'Name': 'Env', 'Value': 'prod'}],
        'Value': 1,
        'Unit': 'Count',
        'StorageResolution': 1   # 1 = high-res (1s), 60 = standard (mặc định)
    }]
)
```

### Resolution: Standard vs High-resolution

| | Standard | High-resolution |
|---|---|---|
| `StorageResolution` | 60 (mặc định) | 1 |
| Granularity | 1 phút | 1 giây |
| Alarm period tối thiểu | 60s | 10s hoặc 30s |
| Chi phí | thấp hơn | cao hơn |

> 💡 Mẹo thi: Cần alarm phản ứng **dưới 1 phút** (vd burst traffic) → **high-resolution metric** + alarm period 10s/30s. Mặc định là standard (60s).

> ⚠️ Bẫy: Metric của EC2 mặc định là **5 phút** (basic monitoring). Muốn **1 phút** → bật **detailed monitoring** (tính phí thêm). Đây vẫn không phải high-resolution (1s) — đừng nhầm hai khái niệm.

---

## 3. Embedded Metric Format (EMF)

EMF cho phép bạn **vừa ghi log JSON có cấu trúc, vừa tự sinh CloudWatch metric** từ chính log đó — CloudWatch tự trích metric ra khi thấy block `_aws`.

```json
{
  "_aws": {
    "Timestamp": 1700000000000,
    "CloudWatchMetrics": [{
      "Namespace": "MyApp",
      "Dimensions": [["Env"]],
      "Metrics": [{ "Name": "Latency", "Unit": "Milliseconds" }]
    }]
  },
  "Env": "prod",
  "Latency": 42,
  "requestId": "abc-123"
}
```

Chỉ cần **ghi JSON này ra stdout/CloudWatch Logs** (Lambda log tự động) → CloudWatch sinh metric `Latency` trong namespace `MyApp`. Bạn vẫn giữ được context đầy đủ (`requestId`...) trong log để debug.

### EMF vs PutMetricData — bẫy thi cốt lõi

| | EMF | PutMetricData |
|---|---|---|
| Cách đẩy | Ghi **log JSON** → CW trích metric | Gọi **API trực tiếp** tới CloudWatch |
| Network call | Không (chỉ ghi log) | Có (mỗi lần đẩy = 1 API call, có thể bị throttle/latency) |
| Hợp với Lambda? | **Rất hợp** — không block, không cần SDK call | Thêm latency vào hàm, tốn thời gian thực thi |
| Giữ context log | Có (metric + log đi cùng nhau) | Không (chỉ có số) |
| Thư viện | `aws-embedded-metrics` | `boto3`/SDK |

> 💡 Mẹo thi: Trong **Lambda** muốn ghi custom metric mà **không thêm latency / không gọi API đồng bộ** → dùng **EMF**. Nếu đề nhấn "tránh API call thừa, tránh tăng duration, metric đi kèm log" → EMF. Nếu đề chỉ nói "đẩy 1 metric từ ứng dụng on-prem/script" → **PutMetricData** vẫn ổn.

> ⚠️ Bẫy: `aws-embedded-metrics` hay `PutMetricData` đều tạo **custom metric** (tính phí như nhau ở mức metric). Điểm khác là **cách truyền** và **chi phí runtime/API**, không phải giá metric.

---

## 4. CloudWatch Alarms

Alarm theo dõi **một metric** (hoặc kết quả **metric math**) và chuyển trạng thái `OK` / `ALARM` / `INSUFFICIENT_DATA`.

### Thành phần chính

- **Metric + period + statistic** (Average, Sum, p99...).
- **Threshold + comparison** (vd `> 80` trong `3` của `5` data points).
- **Treat missing data**: `notBreaching` / `breaching` / `ignore` / `missing`.

### Alarm actions

| Action target | Dùng để |
|---|---|
| **SNS topic** | Gửi email/SMS/trigger Lambda khi báo động |
| **Auto Scaling policy** | Scale out/in theo tải |
| **EC2 action** | Stop/terminate/reboot/recover instance |

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name HighErrorRate \
  --namespace MyApp --metric-name ErrorCount \
  --statistic Sum --period 60 \
  --threshold 10 --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:...:alerts
```

### Composite Alarm

Kết hợp nhiều alarm bằng logic `AND`/`OR` để **giảm noise** (chỉ báo khi nhiều điều kiện cùng đúng).

```text
ALARM("HighCPU") AND ALARM("HighLatency")
```

> 💡 Mẹo thi: "Quá nhiều cảnh báo lẻ, chỉ muốn báo khi cả CPU cao **và** latency cao" → **Composite alarm**. "Tự động thêm server khi tải cao" → alarm action gọi **Auto Scaling policy** (qua SNS không cần thiết). "Khôi phục instance lỗi phần cứng" → **EC2 recover action**.

> ⚠️ Bẫy: Alarm với high-resolution metric mới được dùng period **10s/30s**; metric thường tối thiểu **60s**. Đề cho "alarm mỗi 10 giây" mà metric là standard → sai.

---

## 5. CloudWatch Logs Insights

Ngôn ngữ query để **phân tích log có sẵn** (kể cả log cũ — khác metric filter), trả kết quả tương tác.

```text
fields @timestamp, @message, @duration
| filter @message like /ERROR/
| stats count(*) as errors by bin(5m)
| sort errors desc
| limit 20
```

- Tự nhận diện field từ JSON log (`@duration`, `@requestId`, hoặc `$.field`).
- Dùng cho điều tra sự cố ad-hoc, không tạo metric thường trực.

> 💡 Mẹo thi:
> - "Phân tích log **đã có** / điều tra sự cố quá khứ" → **Logs Insights**.
> - "Đếm liên tục để **alarm** về sau" → **Metric filter**.
> - "Stream log đi xử lý/lưu real-time" → **Subscription filter**.

---

## 6. Dashboards

- Dashboard gom nhiều widget (metric graph, log table, number, alarm status) vào một màn hình.
- **Cross-region & cross-account**: một dashboard có thể hiển thị metric từ nhiều region/account.
- Định nghĩa được bằng **JSON** (dashboard body) → quản lý bằng IaC.

> 💡 Mẹo thi: Cần một màn hình tổng hợp từ **nhiều region** → CloudWatch dashboard hỗ trợ sẵn, không cần tự gom dữ liệu thủ công.

---

## 7. CloudWatch Agent vs Default Metrics

EC2 **không** tự gửi **memory** và **disk usage** lên CloudWatch (hypervisor không nhìn thấy bên trong OS).

| | Default (không agent) | CloudWatch Agent |
|---|---|---|
| CPU, Network, Disk I/O | Có | Có |
| **RAM (memory) usage** | **Không** | **Có** |
| **Disk space (used %)** | **Không** | **Có** |
| Log files trong OS (vd `/var/log/app.log`) | Không | Có (đẩy lên CW Logs) |

> ⚠️ Bẫy thi rất hay gặp: "Muốn monitor **memory utilization** của EC2" → cài **CloudWatch Agent** (hoặc CloudWatch unified agent). KHÔNG có sẵn trong metric mặc định, và KHÔNG bật được chỉ bằng detailed monitoring.

---

## 8. Lambda Logging tự động

- `console.log` / `print` trong Lambda → tự vào `/aws/lambda/<func>` (không cần SDK).
- Cần IAM permission ghi log (mục 1).
- Custom metric trong Lambda → ưu tiên **EMF** (mục 3) để tránh latency.
- Lambda cũng phát sẵn metric `Invocations`, `Errors`, `Throttles`, `Duration`, `ConcurrentExecutions` trong `AWS/Lambda`.

> 💡 Mẹo thi: "Theo dõi số lần Lambda lỗi" → dùng metric **`Errors`** có sẵn + alarm, không cần tự ghi metric. "Theo dõi business metric (vd số đơn hàng)" → tự đẩy bằng **EMF**.

---

## Tổng kết nhanh (cheat-sheet bẫy thi)

| Tình huống | Chọn |
|---|---|
| Custom metric trong Lambda, không muốn thêm latency/API call | **EMF** |
| Đẩy metric từ script/on-prem | **PutMetricData** |
| Đếm "ERROR" trong log để alarm | **Metric filter** |
| Stream log real-time → S3/OpenSearch | **Subscription filter → Firehose** |
| Stream log → xử lý phức tạp, nhiều consumer | **Subscription filter → Kinesis** |
| Phân tích log cũ / điều tra sự cố | **Logs Insights** |
| Log lưu mãi, tốn tiền | **Set retention policy** |
| Alarm phản ứng dưới 1 phút | **High-resolution metric** (period 10s/30s) |
| Báo động khi nhiều điều kiện cùng đúng | **Composite alarm** |
| Monitor RAM/disk của EC2 | **CloudWatch Agent** |
| Lambda không ghi được log | Thiếu **IAM logs permission** |

> 💡 Quy tắc ghi nhớ: **filter ra số → metric filter; filter ra luồng → subscription filter; metric không tốn API trong Lambda → EMF; alarm gộp điều kiện → composite; RAM EC2 → agent.**
