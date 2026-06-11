# Observability cơ bản: Nhìn thấy hệ thống đang "nghĩ gì"

Hãy tưởng tượng bạn là bác sĩ trực cấp cứu. Bệnh nhân (hệ thống của bạn) không biết nói. Bạn chỉ có thể đoán bệnh qua: nhật ký sinh hoạt (logs), các chỉ số đo được như nhịp tim, huyết áp (metrics), và phim chụp X-quang cho thấy đường đi của vấn đề bên trong cơ thể (traces). Observability chính là nghệ thuật trang bị đủ "thiết bị y tế" để khi hệ thống "đổ bệnh" lúc 3 giờ sáng, bạn chẩn đoán được nguyên nhân thay vì đoán mò.

Bài này dành cho bạn đã từng deploy ứng dụng, đã từng `console.log` để debug — và bây giờ muốn làm việc đó một cách bài bản ở quy mô production.

## 1. Logging vs Monitoring vs Observability — ba từ hay bị dùng lẫn

Ba khái niệm này liên quan nhưng KHÔNG đồng nghĩa:

| Khái niệm | Câu hỏi trả lời | Ví dụ đời thường |
|---|---|---|
| **Logging** | "Chuyện gì đã xảy ra, theo trình tự?" | Nhật ký hành trình của thuyền trưởng |
| **Monitoring** | "Hệ thống có đang khỏe không, so với ngưỡng định trước?" | Đồng hồ đo nhiệt độ + chuông báo khi quá 39°C |
| **Observability** | "Tại sao hệ thống lại hành xử như vậy — kể cả với câu hỏi tôi CHƯA từng nghĩ tới?" | Khả năng chẩn đoán bệnh lạ từ toàn bộ hồ sơ bệnh án |

Điểm khác biệt cốt lõi:

- **Monitoring** là theo dõi những thứ bạn **biết trước** có thể hỏng ("known unknowns"). Bạn đặt sẵn câu hỏi: "CPU có vượt 80% không?", "Error rate có quá 1% không?"
- **Observability** là khả năng trả lời những câu hỏi bạn **chưa đặt ra trước** ("unknown unknowns"). Ví dụ: "Tại sao chỉ user ở Đà Nẵng, dùng iOS, thanh toán bằng ví X mới bị lỗi timeout?" — không dashboard nào dựng sẵn cho câu hỏi này, nhưng nếu dữ liệu telemetry đủ giàu, bạn vẫn "đào" ra được câu trả lời.

> 💡 Ghi nhớ: Monitoring cho bạn biết **hệ thống đang hỏng**. Observability cho bạn biết **vì sao nó hỏng**. Monitoring là tập con của hành trình hướng tới observability.

Observability (thường viết tắt **o11y** — chữ o, 11 ký tự, chữ y) đứng trên ba "trụ cột" dữ liệu: **logs, metrics, traces**. Ta đi từng trụ một.

## 2. Trụ 1 — Logs: nhật ký sự kiện

### 2.1. Log là gì?

Log là bản ghi **một sự kiện rời rạc** tại một thời điểm: "lúc 14:32:05, user 123 đăng nhập thất bại vì sai mật khẩu". Log trả lời câu hỏi *chi tiết, cụ thể* nhất trong ba trụ — nhưng cũng tốn dung lượng lưu trữ nhất.

### 2.2. Unstructured vs Structured logging

Đây là bài học lớn đầu tiên khi làm production. So sánh:

**Log "tự do" (unstructured)** — kiểu `console.log` quen thuộc:

```
Loi roi! user 123 khong thanh toan duoc, ma loi 502, mat 3.2s
```

Con người đọc được, nhưng máy thì... bó tay. Muốn đếm "bao nhiêu lỗi 502 trong giờ qua" phải viết regex mò mẫm.

**Structured log** — mỗi dòng là một bản ghi có cấu trúc (thường là JSON):

```json
{
  "timestamp": "2026-06-11T14:32:05Z",
  "level": "ERROR",
  "service": "payment-api",
  "event": "payment_failed",
  "user_id": "123",
  "http_status": 502,
  "duration_ms": 3200,
  "trace_id": "abc-789"
}
```

Bây giờ máy truy vấn được như database: "lọc tất cả `level=ERROR` của `service=payment-api` có `duration_ms > 3000`". Đây là nền tảng để công cụ tìm kiếm log (CloudWatch Logs Insights, Elasticsearch...) phát huy sức mạnh.

Vài nguyên tắc structured logging tốt:

- **Log level rõ ràng**: DEBUG < INFO < WARN < ERROR. Production thường bật từ INFO trở lên.
- **Đính kèm ngữ cảnh**: request ID, user ID, trace ID — để nối các dòng log của cùng một request lại với nhau.
- **Đừng log dữ liệu nhạy cảm**: mật khẩu, số thẻ, token. Đây là lỗi bảo mật kinh điển.
- **Log là sự kiện, không phải tiểu thuyết**: mỗi sự kiện đáng quan tâm = một dòng, đủ ngữ cảnh để đứng độc lập.

> 💡 Ghi nhớ: Hãy viết log cho **máy đọc trước, người đọc sau**. Structured log (JSON) với trace ID đính kèm là tiêu chuẩn de facto của hệ phân tán.

## 3. Trụ 2 — Metrics: con số đo theo thời gian

### 3.1. Metric là gì?

Nếu log là "kể chuyện từng sự kiện" thì metric là **con số tổng hợp đo đều đặn theo thời gian**: số request mỗi giây, % CPU, độ trễ trung bình. Metric cực rẻ để lưu (chỉ là số + timestamp), nên nó là lựa chọn số một cho **dashboard và cảnh báo**.

Phép so sánh: log giống camera an ninh ghi lại từng người ra vào tòa nhà; metric giống bảng đếm "hôm nay có 1.247 lượt khách" treo ở sảnh. Bảng đếm không cho biết AI đã vào — nhưng nhìn một giây là biết hôm nay đông hay vắng.

### 3.2. Ba kiểu metric kinh điển

| Kiểu | Đặc điểm | Ví dụ | Hình dung |
|---|---|---|---|
| **Counter** | Chỉ tăng, không giảm (reset khi restart) | Tổng số request, tổng số lỗi | Đồng hồ công-tơ-mét xe máy |
| **Gauge** | Lên xuống tự do, đo "trạng thái hiện tại" | % CPU, RAM đang dùng, số kết nối đang mở | Kim đồng hồ xăng |
| **Histogram** | Phân phối giá trị vào các "rổ" (buckets) | Độ trễ request, kích thước response | Biểu đồ điểm thi của cả lớp |

Counter thường được nhìn dưới dạng **rate** (tốc độ tăng): "requests/giây" thay vì "tổng 5 tỷ requests từ thuở khai thiên".

### 3.3. Percentile và huyền thoại p99 — tại sao "trung bình" là kẻ nói dối

Tình huống thật: độ trễ **trung bình** API của bạn là 80ms. Nghe ổn? Chưa chắc. Giả sử 99 request mất 50ms, còn 1 request mất 3.000ms:

```
Độ trễ (ms)
3000 |                                          █  ← 1 user "đau khổ"
     |
 100 |
  50 | █ █ █ █ █ █ █ █ █ █ █ █ █ █ ... (99 user vui vẻ)
     +------------------------------------------------
       request thứ 1 ........................ thứ 100
```

Trung bình = (99×50 + 3000)/100 ≈ 79.5ms — con số đẹp che giấu một trải nghiệm tồi tệ. Vì thế người ta dùng **percentile**:

- **p50 (median)**: 50% request nhanh hơn giá trị này → trải nghiệm "điển hình".
- **p95**: 95% request nhanh hơn giá trị này.
- **p99**: 99% request nhanh hơn → nắm bắt được "cái đuôi" (tail latency), nhóm 1% kém may mắn nhất.

Trong ví dụ trên: p50 = 50ms nhưng p99 ≈ 3000ms — chênh lệch khổng lồ này hé lộ vấn đề mà trung bình giấu nhẹm. Với hệ lớn, 1% của 10 triệu request/ngày là **100.000 trải nghiệm tệ mỗi ngày** — và thường rơi vào chính những user dùng nhiều nhất.

Histogram chính là cấu trúc dữ liệu cho phép tính percentile hiệu quả: thay vì lưu từng giá trị, ta đếm số mẫu rơi vào từng rổ (0-10ms, 10-50ms, 50-100ms...).

> 💡 Ghi nhớ: Đừng bao giờ đánh giá độ trễ bằng giá trị trung bình. Hãy nhìn **p50 + p99**: p50 cho biết trải nghiệm điển hình, p99 cho biết những user khổ nhất khổ đến mức nào.

## 4. Trụ 3 — Traces: theo dấu một request qua nhiều service

### 4.1. Bài toán của hệ phân tán

Thời monolith, một request đi vào một process — stack trace là đủ. Thời microservices, một lần bấm "Mua hàng" có thể chạy qua 6 service:

```
User → [API Gateway] → [Order Service] → [Inventory Service]
                              │
                              ├──→ [Payment Service] → [Bank API]
                              └──→ [Notification Service]
```

User báo "thanh toán chậm 5 giây". Chậm ở đâu? Log của từng service đều "có vẻ bình thường". Đây là lúc cần **distributed tracing**.

### 4.2. Ý tưởng cốt lõi: trace ID và span

Cơ chế đơn giản đến bất ngờ:

1. Khi request bước vào hệ thống, gán cho nó một **trace ID** duy nhất (ví dụ `abc-789`).
2. Trace ID này được **truyền tiếp** (propagate) qua mọi lần gọi service kế tiếp, thường qua HTTP header.
3. Mỗi đoạn công việc (một lần gọi service, một câu query DB) là một **span** — có tên, thời điểm bắt đầu, thời lượng, và biết span "cha" của nó.

Ghép tất cả span cùng trace ID lại, ta được biểu đồ "thác nước" (waterfall):

```
trace_id: abc-789                 Tổng: 5.020ms
─────────────────────────────────────────────────────
API Gateway      ████████████████████████████  5.020ms
 Order Service    ███████████████████████████  4.950ms
  Inventory        ██                             120ms
  Payment          ████████████████████████     4.500ms  ← THỦ PHẠM!
   Bank API         ███████████████████████     4.400ms  ← gốc rễ
  Notification                              █     90ms
```

Nhìn một phát ra ngay: 90% thời gian nằm ở Bank API. Không cần đoán, không cần họp 3 team đổ lỗi cho nhau.

Trace cũng cho thấy **cấu trúc** lời gọi: cái gì chạy tuần tự (có thể song song hóa?), cái gì bị gọi lặp N lần (bug N+1 query?).

> 💡 Ghi nhớ: Bộ ba hoạt động cùng nhau: **metric** báo "có gì đó chậm" → **trace** chỉ ra "chậm ở service nào, bước nào" → **log** (lọc theo trace ID) kể "chính xác chuyện gì xảy ra ở bước đó". Đó là quy trình điều tra sự cố chuẩn.

## 5. Alerting: đánh thức đúng người, đúng lúc

### 5.1. Cảnh báo tốt là cảnh báo hiếm

Có dữ liệu rồi, bước tiếp theo là **alert**: tự động báo cho con người khi có chuyện. Nhưng alerting làm dở còn tệ hơn không có — vì nó dẫn tới căn bệnh nghề nghiệp tên là **alert fatigue** (mệt mỏi vì cảnh báo).

Câu chuyện "cậu bé chăn cừu" phiên bản DevOps: hệ thống kêu "CPU vượt 80%!" 20 lần mỗi đêm, lần nào cũng tự hết. Sau hai tuần, kỹ sư trực mute luôn kênh thông báo. Đến đêm hệ thống sập thật — không ai nhìn.

### 5.2. Nguyên tắc thiết kế alert lành mạnh

- **Alert theo triệu chứng, không theo nguyên nhân**: báo khi *user bị ảnh hưởng* ("error rate 5%", "p99 latency 3s") thay vì báo mọi biến động nội bộ ("CPU 80%"). CPU cao mà user vẫn nhanh thì... kệ nó, đó là dùng tài nguyên hiệu quả.
- **Mỗi alert phải actionable**: nhận alert thì phải có việc cụ thể để làm. Nếu phản xạ là "à, cái này kệ nó" → xóa alert đó đi.
- **Phân cấp độ khẩn**: *page* (gọi dậy lúc 3h sáng — chỉ dành cho sự cố ảnh hưởng user ngay) vs *ticket* (xử lý trong giờ hành chính — ví dụ "disk sẽ đầy trong 5 ngày").
- **Có ngưỡng + thời lượng**: "error rate > 2% **kéo dài 5 phút**" thay vì nhảy số một giây cũng kêu — tránh nhiễu do gai (spike) thoáng qua.
- **Định kỳ dọn rác alert**: alert nào hay kêu sai thì sửa ngưỡng hoặc xóa, như dọn cỏ vườn.

> 💡 Ghi nhớ: Một alert đánh thức bạn lúc 3h sáng phải thỏa hai điều: (1) user đang thực sự bị ảnh hưởng, (2) bạn có thể làm gì đó ngay. Không thỏa cả hai → nó không xứng đáng là page.

## 6. SLI, SLO, SLA — ba chữ S hay nhầm

Đo và cảnh báo "theo triệu chứng user" nghĩa là cần định nghĩa được "user hài lòng" bằng con số. Đó là việc của bộ ba SLI/SLO/SLA:

| Thuật ngữ | Là gì | Ví dụ | Ai quan tâm |
|---|---|---|---|
| **SLI** (Service Level **Indicator**) | **Chỉ số đo** chất lượng dịch vụ — một metric được chọn làm thước đo | % request thành công; % request có latency < 300ms | Kỹ sư |
| **SLO** (Service Level **Objective**) | **Mục tiêu nội bộ** cho SLI đó | "99.9% request thành công, tính theo cửa sổ 30 ngày" | Team & sản phẩm |
| **SLA** (Service Level **Agreement**) | **Hợp đồng với khách hàng**, có chế tài (thường là đền tiền) nếu vi phạm | "Uptime < 99.5%/tháng → hoàn 10% phí" | Pháp lý, kinh doanh |

Analogy giao pizza:

- **SLI** = thước đo: "% đơn giao trong vòng 30 phút" (tuần này đo được 97%).
- **SLO** = mục tiêu cửa hàng tự đặt: "ít nhất 95% đơn giao trong 30 phút".
- **SLA** = cam kết in trên hộp: "Trễ quá 45 phút — miễn phí pizza".

Để ý: SLO (30 phút, 95%) **chặt hơn** SLA (45 phút). Đây là chủ đích — SLO là hàng rào nội bộ; vi phạm SLO thì team biết để siết lại, *trước khi* chạm tới SLA và phải đền tiền khách.

Khái niệm đi kèm rất hay: **error budget** (ngân sách lỗi). SLO 99.9% nghĩa là bạn được "phép hỏng" 0.1% — khoảng 43 phút downtime mỗi tháng. Còn budget → cứ mạnh dạn deploy tính năng mới. Cháy budget → đóng băng release, dồn sức cho độ ổn định. Error budget biến cuộc cãi vã muôn thuở "dev muốn ship nhanh vs ops muốn ổn định" thành một con số khách quan.

> 💡 Ghi nhớ: SLI là **thước đo**, SLO là **mục tiêu nội bộ** (chặt hơn), SLA là **hợp đồng có đền bù** (lỏng hơn). Và 100% không bao giờ là mục tiêu đúng — chi phí tiệm cận vô hạn, trong khi user không phân biệt nổi 99.99% với 100%.

## 7. Dashboard tốt trông như thế nào?

Dashboard là "buồng lái" của hệ thống. Buồng lái máy bay tốt không hiển thị 5.000 con số — nó làm nổi bật vài chỉ số sống còn và chỉ "đỏ đèn" khi cần chú ý.

Đặc điểm của dashboard tốt:

- **Trả lời một câu hỏi cụ thể**: "Dịch vụ checkout có khỏe không?" — không phải bãi rác 60 biểu đồ gom từ mọi nơi.
- **Quan trọng nhất ở trên cùng**: hàng đầu là các SLI hướng user (request rate, error rate, p50/p99 latency); chi tiết hạ tầng (CPU, memory) nằm dưới, phục vụ "đào sâu" (drill-down).
- **Theo khung mẫu có sẵn**: phổ biến nhất là **RED method** cho service — **R**ate (lưu lượng), **E**rrors (tỷ lệ lỗi), **D**uration (độ trễ, có percentile); và **USE method** cho tài nguyên — **U**tilization, **S**aturation, **E**rrors.
- **Có ngữ cảnh để so sánh**: đường ngưỡng SLO vẽ ngay trên biểu đồ; so với cùng giờ hôm qua/tuần trước. Một con số trơ trọi "1.200 req/s" là tốt hay xấu? Không ai biết nếu thiếu mốc so sánh.
- **Thống nhất khoảng thời gian và đánh dấu deploy**: mọi panel cùng time range; vạch dọc đánh dấu thời điểm deploy — vì câu hỏi đầu tiên khi có sự cố luôn là "vừa rồi ai deploy gì?"

Bố cục mẫu cho một service:

```
┌────────────────────────────────────────────────────┐
│  CHECKOUT SERVICE — Health          [SLO: 99.9% ✓] │
├──────────────┬──────────────┬──────────────────────┤
│ Request rate │  Error rate  │  Latency p50 / p99   │
│   (req/s)    │ (% vs SLO ─) │  (ms, 2 đường)       │
├──────────────┴──────────────┴──────────────────────┤
│  Error budget còn lại tháng này: ████████░░  78%   │
├────────────────────────────────────────────────────┤
│  Drill-down: CPU │ Memory │ DB connections │ Queue │
└────────────────────────────────────────────────────┘
        ↑ vạch deploy: 14:02 (release v2.31)
```

> 💡 Ghi nhớ: Dashboard tốt được thiết kế cho khoảnh khắc **3h sáng, đầu óc mơ màng**: liếc 10 giây phải trả lời được "có sự cố không, nặng cỡ nào, bắt đầu từ khi nào".

## 8. Liên hệ sang AWS

Khi học CLF/SAA/DVA, các khái niệm trong bài map gần như 1-1 sang dịch vụ AWS:

| Khái niệm trong bài | Dịch vụ / tính năng AWS |
|---|---|
| Logs (thu thập, lưu, truy vấn) | **CloudWatch Logs** (log groups/streams), truy vấn structured log bằng **CloudWatch Logs Insights** |
| Metrics (counter/gauge, percentile) | **CloudWatch Metrics** — metric mặc định của EC2/RDS/Lambda... + **custom metrics**; thống kê hỗ trợ percentile (p99) |
| Alerting | **CloudWatch Alarms** (ngưỡng + khoảng đánh giá, đúng tinh thần "kéo dài N phút") → bắn qua **SNS** để email/gọi/webhook |
| Dashboard | **CloudWatch Dashboards** |
| Distributed tracing (trace ID, span, waterfall) | **AWS X-Ray** — service map + trace timeline qua Lambda, API Gateway, ECS... |
| Sự kiện thay đổi hệ thống (audit "ai deploy/làm gì") | **CloudTrail** (ghi mọi API call — thi CLF rất hay hỏi phân biệt CloudWatch vs CloudTrail) |
| SLA | Mỗi dịch vụ AWS có SLA công khai kèm service credit khi vi phạm (ví dụ S3, EC2) |

Mẹo phân biệt hay gặp trong đề thi: **CloudWatch** trả lời "hệ thống *hoạt động* ra sao" (hiệu năng, log, metric); **CloudTrail** trả lời "*ai đã làm gì* trên tài khoản AWS" (audit); **X-Ray** trả lời "request *đi qua đâu và chậm ở đâu*" (tracing).

## Tóm tắt

- **Monitoring** trả lời câu hỏi định sẵn; **observability** cho phép trả lời cả câu hỏi chưa từng nghĩ tới — dựa trên ba trụ: logs, metrics, traces.
- **Structured logging** (JSON + trace ID) để máy truy vấn được; đừng log dữ liệu nhạy cảm.
- Metrics có ba kiểu: **counter** (chỉ tăng), **gauge** (lên xuống), **histogram** (phân phối). Đánh giá độ trễ bằng **percentile (p50/p99)**, không bằng trung bình.
- **Distributed tracing**: một trace ID truyền xuyên các service, mỗi bước là một span — biểu đồ thác nước chỉ thẳng mặt thủ phạm gây chậm.
- Alert phải **hướng triệu chứng, actionable, phân cấp khẩn** — nếu không sẽ sinh alert fatigue và bị mute.
- **SLI** = thước đo, **SLO** = mục tiêu nội bộ (chặt hơn), **SLA** = hợp đồng có đền bù; **error budget** cân bằng tốc độ ship và độ ổn định.
- Dashboard tốt: RED method, SLI ở trên cùng, có ngưỡng SLO và vạch deploy — đọc được trong 10 giây lúc nửa đêm.
- Trên AWS: **CloudWatch** (logs/metrics/alarms/dashboards), **X-Ray** (tracing), **CloudTrail** (audit).
