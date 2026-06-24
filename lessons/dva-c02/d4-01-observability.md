# Observability: CloudWatch

CloudWatch là "trung tâm quan sát" của AWS: thu thập **logs**, **metrics**, tạo **alarms**, **dashboards** và chạy **query**. Trong DVA-C02 Domain 4, đề thi cực thích các tình huống "tôi muốn theo dõi X, đẩy dữ liệu đi đâu, dùng tính năng nào" — đặc biệt là phân biệt **EMF vs PutMetricData**, **metric filter vs subscription filter**, và cấu hình **retention**. Bài này đi từ logs → metrics → alarms → query với góc nhìn của developer viết code, kèm bẫy thi.

---

## 1. CloudWatch Logs

### Cấu trúc: Log Group → Log Stream → Log Event

- **Log group**: nhóm logic, thường tương ứng 1 ứng dụng/service. Retention, encryption, metric filter, subscription filter đều set ở mức **log group**.
- **Log stream**: chuỗi log từ **một nguồn** (1 container, 1 instance, 1 Lambda execution environment). Ví dụ Lambda: mỗi execution environment tạo một stream `YYYY/MM/DD/[$LATEST]xxxx`.
- **Log event**: 1 dòng log + timestamp.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Phân cấp CloudWatch Logs: Log Group chứa nhiều Log Stream, mỗi stream chứa Log Event</title>
  <desc>Cây phân cấp: một Log Group (đặt retention, encryption, metric filter, subscription filter) chứa nhiều Log Stream, mỗi stream ứng với một nguồn (container, instance, Lambda environment), và mỗi stream chứa các Log Event là dòng log kèm timestamp.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">Log Group → Log Stream → Log Event</text>
  <rect x="16" y="40" width="280" height="64" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="32" y="62" font-size="13" font-weight="700" fill="currentColor">Log Group</text>
  <text x="32" y="80" font-size="10.5" fill="currentColor" opacity="0.72">1 app/service · /aws/lambda/my-func</text>
  <text x="32" y="96" font-size="10.5" fill="currentColor" opacity="0.72">retention · encryption · metric/subscription filter</text>
  <g stroke="currentColor" stroke-opacity="0.4" fill="none">
    <path d="M48 104 v22 h360 v18"/>
    <path d="M48 104 v22"/>
    <path d="M408 126 h-180 v18"/>
  </g>
  <g>
    <rect x="60" y="144" width="180" height="52" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="72" y="164" font-size="11.5" font-weight="700" fill="currentColor">Log Stream</text>
    <text x="72" y="182" font-size="10" fill="currentColor" opacity="0.72">nguồn: 1 container</text>
  </g>
  <g>
    <rect x="320" y="144" width="180" height="52" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="332" y="164" font-size="11.5" font-weight="700" fill="currentColor">Log Stream</text>
    <text x="332" y="182" font-size="10" fill="currentColor" opacity="0.72">nguồn: 1 instance</text>
  </g>
  <g>
    <rect x="560" y="144" width="150" height="52" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="572" y="164" font-size="11.5" font-weight="700" fill="currentColor">Log Stream</text>
    <text x="572" y="182" font-size="10" fill="currentColor" opacity="0.72">1 Lambda env</text>
  </g>
  <line x1="408" y1="144" x2="408" y2="126" stroke="currentColor" stroke-opacity="0.4"/>
  <g stroke="currentColor" stroke-opacity="0.4" fill="none">
    <path d="M408 126 h227"/>
    <line x1="635" y1="126" x2="635" y2="144"/>
    <line x1="150" y1="196" x2="150" y2="222"/>
  </g>
  <g>
    <rect x="60" y="222" width="440" height="118" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="72" y="242" font-size="11.5" font-weight="700" fill="currentColor">Log Event (trong một stream)</text>
    <rect x="72" y="252" width="416" height="24" rx="5" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="82" y="268" font-size="10.5" fill="currentColor" opacity="0.85">2026-06-23T10:00:01Z  START RequestId: abc-123</text>
    <rect x="72" y="282" width="416" height="24" rx="5" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="82" y="298" font-size="10.5" fill="currentColor" opacity="0.85">2026-06-23T10:00:01Z  ERROR connect timeout</text>
    <text x="82" y="328" font-size="10" fill="currentColor" opacity="0.7">mỗi event = 1 dòng log + timestamp</text>
  </g>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Hai lối ra khỏi một Log Group: metric filter ra metric, subscription filter ra luồng log</title>
  <desc>Từ một Log Group có hai nhánh. Nhánh trên là metric filter: khớp pattern rồi phát ra CloudWatch Metric dùng cho alarm. Nhánh dưới là subscription filter: stream log gần real-time tới Lambda, Kinesis Data Streams, hoặc Firehose dẫn tới S3/OpenSearch.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">Metric filter vs Subscription filter — hai lối ra từ Log Group</text>
  <defs>
    <marker id="rtArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <rect x="16" y="140" width="150" height="70" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="91" y="170" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Log Group</text>
  <text x="91" y="188" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">log event</text>
  <!-- metric filter branch -->
  <path d="M166 158 C 210 110, 240 70, 290 70" stroke="currentColor" stroke-opacity="0.5" fill="none" marker-end="url(#rtArr)"/>
  <g>
    <rect x="298" y="48" width="160" height="46" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="378" y="68" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">metric filter</text>
    <text x="378" y="84" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.72">khớp pattern "ERROR"</text>
  </g>
  <line x1="458" y1="71" x2="500" y2="71" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#rtArr)"/>
  <g>
    <rect x="508" y="48" width="196" height="46" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="606" y="68" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">CloudWatch Metric</text>
    <text x="606" y="84" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.72">→ Alarm</text>
  </g>
  <!-- subscription filter branch -->
  <path d="M166 192 C 210 240, 240 280, 290 280" stroke="currentColor" stroke-opacity="0.5" fill="none" marker-end="url(#rtArr)"/>
  <g>
    <rect x="298" y="178" width="160" height="160" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="378" y="200" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">subscription filter</text>
    <text x="378" y="216" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.72">stream gần real-time</text>
    <rect x="312" y="226" width="132" height="28" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="378" y="244" font-size="10.5" text-anchor="middle" fill="currentColor">Lambda</text>
    <rect x="312" y="258" width="132" height="28" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="378" y="276" font-size="10.5" text-anchor="middle" fill="currentColor">Kinesis Data Streams</text>
    <rect x="312" y="290" width="132" height="28" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="378" y="308" font-size="10.5" text-anchor="middle" fill="currentColor">Firehose</text>
  </g>
  <line x1="444" y1="304" x2="500" y2="304" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#rtArr)"/>
  <g>
    <rect x="508" y="282" width="196" height="46" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="606" y="302" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">S3 / OpenSearch</text>
    <text x="606" y="318" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.72">lưu trữ / phân tích</text>
  </g>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>EMF vs PutMetricData: ghi log JSON ra stdout so với gọi API trực tiếp</title>
  <desc>Hai con đường đẩy custom metric. Đường EMF: app ghi JSON có cấu trúc ra stdout vào CloudWatch Logs, CloudWatch tự trích metric, không có network call và giữ nguyên context log. Đường PutMetricData: app gọi API đồng bộ thẳng tới CloudWatch, thêm latency và không có context log.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">EMF vs PutMetricData — hai cách đẩy custom metric</text>
  <defs>
    <marker id="emfArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <!-- EMF row -->
  <rect x="16" y="44" width="80" height="44" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="56" y="64" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">App</text>
  <text x="56" y="80" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">(Lambda)</text>
  <text x="120" y="50" font-size="11" font-weight="700" fill="#10b981" opacity="0.95">EMF</text>
  <line x1="96" y1="66" x2="150" y2="66" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#emfArr)"/>
  <text x="123" y="84" font-size="8.5" text-anchor="middle" fill="currentColor" opacity="0.65">ghi JSON</text>
  <rect x="158" y="44" width="150" height="44" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="233" y="62" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">stdout → CW Logs</text>
  <text x="233" y="79" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">không network call</text>
  <line x1="308" y1="66" x2="362" y2="66" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#emfArr)"/>
  <text x="335" y="84" font-size="8.5" text-anchor="middle" fill="currentColor" opacity="0.65">CW trích</text>
  <rect x="370" y="44" width="150" height="44" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="445" y="62" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">CloudWatch Metric</text>
  <text x="445" y="79" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">+ giữ context log</text>
  <rect x="538" y="44" width="166" height="44" rx="8" fill="#10b981" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="621" y="62" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.85">+ không thêm latency</text>
  <text x="621" y="78" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.85">+ metric đi cùng log</text>
  <line x1="16" y1="120" x2="704" y2="120" stroke="currentColor" stroke-opacity="0.15"/>
  <!-- PutMetricData row -->
  <rect x="16" y="160" width="80" height="44" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="56" y="180" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">App</text>
  <text x="56" y="196" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">(SDK)</text>
  <text x="180" y="150" font-size="11" font-weight="700" fill="#f59e0b" opacity="0.95">PutMetricData</text>
  <line x1="96" y1="182" x2="368" y2="182" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#emfArr)"/>
  <text x="232" y="174" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">API call đồng bộ (network)</text>
  <rect x="376" y="160" width="150" height="44" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="451" y="180" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">CloudWatch Metric</text>
  <text x="451" y="197" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">chỉ có số</text>
  <rect x="544" y="160" width="160" height="44" rx="8" fill="#f59e0b" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="624" y="178" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.85">− thêm latency/throttle</text>
  <text x="624" y="194" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.85">− không context log</text>
  <text x="16" y="240" font-size="10.5" fill="currentColor" opacity="0.75">EMF: không gọi API, metric sinh ra từ chính log → hợp Lambda. PutMetricData: gọi thẳng CloudWatch → thêm chi phí runtime.</text>
</svg>

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
