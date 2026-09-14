# Case study: Metrics Monitoring & Alerting

Hệ thống monitoring là thứ kỳ lạ nhất trong hạ tầng: nó là **hệ duy nhất bắt buộc phải còn sống đúng vào lúc mọi hệ khác đang chết**. Mọi service khác được phép degrade — cache miss thì chậm, queue đầy thì trễ, replica chết thì failover. Monitoring mà degrade thì bạn mù đúng lúc cần nhìn nhất. Và nó còn khó ở một điểm nữa, ít người để ý khi mới thiết kế: đây là hệ **write-heavy cực đoan, read thưa nhưng bùng nổ theo cụm**. Bình thường không ai mở dashboard; lúc incident thì 50 người mở 30 dashboard cùng lúc, mỗi dashboard 20 panel, mỗi panel quét 6 giờ dữ liệu của hàng nghìn series — tức là đúng khoảnh khắc hệ thống ghi nhiều nhất cũng là khoảnh khắc nó bị đọc nặng nhất. Thiết kế nào không tách được hai đường này sẽ tự giết chính nó trong incident đầu tiên.

Bài này thiết kế một hệ metrics monitoring & alerting nội bộ cho một công ty lớn: 100.000 máy, ~10 triệu time series sống, retention 1 năm. Ta sẽ đi từ chỗ hay bị bỏ qua nhất — **phân biệt metrics với logs và traces** — vì chọn sai ranh giới ở đây thì mọi con số estimation phía sau đều vô nghĩa.

> 💡 **Nguyên tắc xuyên suốt**: metrics monitoring không phải bài toán "lưu số liệu". Nó là bài toán **nén một lượng dữ liệu khổng lồ có cấu trúc rất đều đặn xuống đủ nhỏ để giữ được 1 năm, mà vẫn trả lời được câu hỏi trong 100 ms lúc 3 giờ sáng**. Mọi quyết định thiết kế đều xoay quanh đánh đổi giữa *độ phân giải*, *cardinality* và *chi phí*.

---

## 1. Metrics, logs, traces — ba trụ observability và vì sao không nhét chung một hệ

Đây là câu hỏi mở đầu gần như chắc chắn được hỏi ("chúng ta có cần log không?"), và nó không phải câu hỏi phạm vi cho có: ba loại dữ liệu này có **hình dạng khác nhau hoàn toàn**, nên cấu trúc lưu trữ tối ưu cho loại này là thảm hoạ cho loại kia.

| | Metrics | Logs | Traces |
|---|---|---|---|
| Bản chất | Chuỗi số theo thời gian, lấy mẫu đều | Sự kiện rời rạc, text tự do | Cây span của một request qua N service |
| Kích thước 1 bản ghi | ~2 byte (đã nén) | 200 B – 5 KB | 100 B/span × 10–100 span |
| Cardinality | Phải giữ **thấp** (10⁶–10⁷ series) | Vô hạn (mỗi dòng một khác) | Vô hạn (`trace_id` là unique) |
| Truy vấn điển hình | Tổng hợp theo thời gian và label | Full-text search | Tra đúng 1 `trace_id` |
| Cấu trúc lưu tối ưu | Column store nén delta, index theo label | Inverted index (Lucene) | KV theo `trace_id` + index phụ |
| Retention thực tế | 1 năm (rẻ) | 7–30 ngày (đắt) | 3–7 ngày, có sampling |
| Trả lời câu hỏi | **"Có gì bất thường không?"** | **"Chuyện gì đã xảy ra?"** | **"Chậm ở đâu?"** |

Ba câu hỏi ở dòng cuối mới là lý do thật sự tách ba hệ. Quy trình debug chuẩn là **metrics → traces → logs**: metrics báo động và thu hẹp phạm vi, traces chỉ ra chặng nào chậm, logs cho biết dòng nào ném exception. Bạn không thể bắt đầu từ logs — riêng việc scan 30 ngày log để biết "có bất thường không" đã tốn hơn cả downtime.

**Vì sao không nhét chung?** Ba lý do kỹ thuật:

1. **Chi phí lệch 3 bậc.** Một điểm metric nén xuống ~1,4 byte; một dòng log ~500 byte. Lưu metrics dưới dạng log JSON thì 604 tỷ điểm × 200 byte = **120 TB cho 7 ngày** thay vì 0,8 TB.
2. **Cardinality ngược nhau.** Hệ log *mong đợi* mỗi bản ghi là duy nhất — nên nó dùng inverted index. Hệ metrics *sụp đổ* khi mỗi bản ghi là duy nhất, vì mỗi tổ hợp label mới sinh một series phải index và giữ trong RAM (§4).
3. **Access pattern trái dấu.** Metrics đọc theo **dải thời gian của một ít series** (quét tuần tự → column store thắng). Logs đọc theo **từ khoá cắt ngang mọi bản ghi** (tìm ngẫu nhiên → cần inverted index). Không layout đĩa nào tối ưu cả hai.

Điểm nối hợp lý giữa ba hệ không phải gộp storage mà là **gộp ngữ cảnh**: dùng chung bộ label (`service`, `env`, `region`, `version`) và đính `trace_id` vào log (exemplar). Đó là "correlation", không phải "consolidation".

> ⚠️ **Bẫy phổ biến nhất trong thực tế**: dùng CloudWatch Logs (hoặc ELK) làm nơi đếm số liệu — ghi log mỗi request rồi dựng Metric Filter để đếm. Nó chạy được ở quy mô nhỏ và **đắt kinh hoàng** ở quy mô lớn, vì bạn trả tiền theo GB ingest cho dữ liệu mà 99,99% nội dung bị vứt đi ngay sau khi đếm. Đúng ra phải đếm ở phía client rồi chỉ gửi con số (xem EMF ở phần AWS).

Phạm vi bài này: **chỉ metrics hạ tầng và metrics ứng dụng mức thô** (CPU, memory, disk, RPS, latency, queue depth). Logs và traces nằm ngoài scope, nhưng ta sẽ bàn điểm nối ở phần AWS.


## 2. Làm rõ yêu cầu

**Functional.** (F1) Thu thập metric từ ~100.000 máy thuộc 1.000 server pool — metric hệ điều hành và metric ứng dụng cơ bản. (F2) Lưu time series với retention 1 năm, downsampling theo tầng: raw 7 ngày → 1 phút 30 ngày → 1 giờ 1 năm. (F3) Truy vấn tổng hợp theo label và theo khoảng thời gian. (F4) Dashboard tự refresh. (F5) Alert rule định nghĩa bằng file cấu hình có versioning. (F6) Gửi alert qua email, SMS, PagerDuty, webhook — có dedupe, grouping, silence.

**Non-functional — và mỗi cái ép ra quyết định gì:**

| Thuộc tính | Mục tiêu | Ép ra quyết định |
|---|---|---|
| Scalability | Ghi ~1 triệu điểm/giây, tăng gấp đôi không thiết kế lại | Collector không trạng thái + sharding bằng consistent hashing |
| Query latency | p99 < 1 s cho dashboard 6 giờ; < 100 ms nếu đã cache | Pre-aggregation + cache, không cho dashboard bắn thẳng TSDB |
| Alert latency | Từ lúc triệu chứng xuất hiện tới lúc điện thoại rung < 1 phút (chưa kể `for`) | Scrape 10 s, eval rule 15–30 s |
| Reliability | Không được **bỏ sót** alert nghiêm trọng | Alert path at-least-once, có state store riêng |
| Durability của metric | **Được phép mất vài điểm** | Điểm nới lỏng quan trọng nhất của cả bài |
| Cost | Vài TB, không phải vài trăm TB | Nén + downsampling + trần cardinality |

Chốt **ba giả định quyết định toàn bộ thiết kế**:

1. **Mất dữ liệu lẻ tẻ là chấp nhận được.** Mất một điểm CPU trong chuỗi lấy mẫu mỗi 10 giây không làm sai kết luận nào — biểu đồ có một lỗ nhỏ, alert có `for: 5m` nên không ảnh hưởng. Đây là lý do client được "fire and forget", collector được dùng UDP, và không cần transaction ở bất kỳ đâu trên đường ghi. **Nhưng mất alert thì không chấp nhận được** — nên đường alert có đảm bảo hoàn toàn khác đường metric.
2. **Cardinality bị chặn trần.** Không label nào mang giá trị không giới hạn (user_id, request_id, URL đầy đủ). Ràng buộc này phải được *thực thi bằng kỹ thuật*, không phải bằng lời khuyên (§4.3).
3. **Dữ liệu cũ được phép mất độ phân giải.** Không ai debug sự cố tháng trước ở mức 10 giây. Downsampling không phải "tối ưu thêm" — nó là điều kiện tồn tại của retention 1 năm.


## 3. Back-of-envelope estimation

Ước lượng ở bài này đặc biệt có giá trị vì các con số **rất đều đặn và dự đoán được** — khác hẳn news feed hay chat. Nghĩa là bạn có thể tính ra dung lượng chính xác đến ±20%, và chính sự chính xác đó là thứ chứng minh downsampling bắt buộc.

### 3.1 Write QPS

```
Số máy          = 1.000 pool × 100 máy          = 100.000 máy
Metric mỗi máy  ≈ 100 (CPU, mem, disk, net, app…)
→ Số time series sống                            = 10.000.000 (10 triệu)

Chu kỳ lấy mẫu  = 10 giây
→ Write QPS     = 10.000.000 / 10                = 1.000.000 điểm/giây
```

**1 triệu điểm ghi mỗi giây.** Con số này lập tức loại bỏ một loạt phương án:

- PostgreSQL/MySQL tuned tốt cho ~10–50k insert/s mỗi node → cần **20–100 node** chỉ để ghi, mà mỗi insert còn cập nhật B-tree, WAL, ghi khuếch đại 5–10×. Hỏng ngay (§9.1).
- Một node InfluxDB/Prometheus khoẻ xử lý ~200–500k điểm/s → cần **3–8 shard**, cộng replication là 6–16 node. Khả thi.
- Và: **mọi thứ trên đường ghi phải O(1), không khoá** — không lookup, không transaction, không unique constraint.

Biến thể hay bị hỏi: hạ chu kỳ xuống **1 giây** thì write QPS thành 10 triệu/s — gấp 10 hạ tầng, gấp 10 chi phí, đổi lấy phát hiện sớm hơn... 9 giây. Gần như không bao giờ đáng. **Độ phân giải là một tham số chi phí, không phải hằng số vật lý.**

### 3.2 Băng thông

```
Payload line protocol (chưa nén): ~100 byte/điểm
→ Ingress thô = 1M × 100 B = 100 MB/s ≈ 800 Mbps
Nén snappy (~10×)          → ~10 MB/s ≈ 80 Mbps
```

80 Mbps cho cả hạ tầng là **rất nhỏ** — băng thông không phải nút thắt. Chia theo host còn nhỏ hơn: mỗi máy 10 KB mỗi 10 giây. Nhưng nhân 100.000 máy thì collector phải chịu **10.000 scrape/giây** — đó mới là con số định hình tầng collection (§7.4).

### 3.3 Dung lượng lưu trữ — và vì sao downsampling là bắt buộc

Tính nếu lưu **thô kiểu bảng quan hệ**:

```
Một hàng: metric name 20 B + tags 40 B + timestamp 8 B + value 8 B ≈ 76 B
7 ngày raw  = 1M/s × 86.400 × 7 = 604,8 tỷ điểm
            × 76 B ≈ 46 TB  (chỉ 7 ngày, chưa replication!)
1 năm raw   = 1M/s × 86.400 × 365 = 31.536 tỷ điểm × 76 B ≈ 2,4 PB
```

**2,4 PB cho một năm**, nhân replication 3 là 7,2 PB. Không khả thi về chi phí. Áp dụng hai kỹ thuật của TSDB:

**(a) Nén.** Metric name và tag được tách thành *series key*, lưu **một lần** trong index; dữ liệu chỉ còn cặp `(timestamp, value)`. Với delta-of-delta cho timestamp và XOR cho float (§9.3), Facebook đo được **~1,37 byte mỗi cặp**. Lấy tròn 2 byte cho an toàn:

```
7 ngày raw = 604,8 tỷ × 2 B ≈ 1,2 TB   (thay vì 46 TB — giảm 38×)
```

**(b) Downsampling theo tầng.** Sau 7 ngày, gộp về 1 phút; sau 30 ngày, gộp về 1 giờ. Mỗi bucket rollup lưu 4 giá trị (`min`, `max`, `sum`, `count` — đủ tái tạo avg và giữ được đỉnh):

```
Tầng 1 — raw 10 s, giữ 7 ngày
   604,8 tỷ điểm × 2 B                            ≈ 1,2 TB

Tầng 2 — 1 phút, giữ 30 ngày
   10M series × (60×24×30 = 43.200 điểm) = 432 tỷ
   × 2 B × 4 giá trị                              ≈ 3,5 TB

Tầng 3 — 1 giờ, giữ 1 năm
   10M series × 8.760 điểm = 87,6 tỷ
   × 2 B × 4 giá trị                              ≈ 0,7 TB
   ─────────────────────────────────────────────────────
   TỔNG (1 bản)                                   ≈ 5,4 TB
   × replication 3                                ≈ 16 TB
```

**16 TB thay vì 7,2 PB — giảm 450 lần.** Đây là con số đắt giá nhất của cả bài: nó cho thấy retention 1 năm **không hề khả thi nếu thiếu downsampling**, và cho thấy tầng 2 (1 phút, 30 ngày) mới là tầng ngốn nhiều nhất, nên nếu cần cắt chi phí thì cắt ở đó (giữ 14 ngày thay vì 30, hoặc chỉ rollup `avg` + `max` thay vì 4 giá trị).

> 💡 **Nguyên tắc**: trong hệ time series, **dung lượng tỉ lệ với `số series × tần suất × thời gian giữ`**. Ba số nhân với nhau. Muốn giảm chi phí, hãy giảm thừa số rẻ nhất — và thừa số rẻ nhất gần như luôn là *tần suất của dữ liệu cũ*, chứ không phải số series (bạn cần series) hay retention (hợp đồng yêu cầu).

### 3.4 Read QPS — con số nhỏ nhưng lệch tải kinh khủng

```
Lúc bình thường: ~50 dashboard mở × 20 panel / 30 s refresh ≈ 33 query/s
Lúc incident:    ~500 dashboard × 20 panel / 10 s refresh   ≈ 1.000 query/s
Alert eval:      ~10.000 rule / 15 s                        ≈ 667 query/s (liên tục)
```

Hai quan sát quan trọng:

1. **Alert evaluation mới là read load thường trực lớn nhất**, không phải người xem dashboard. 10.000 rule chạy mỗi 15 giây là 667 query/s chạy 24/7. Nhiều đội thiết kế xong mới phát hiện alert engine đang là khách hàng nặng nhất của TSDB.
2. **Read load tăng vọt đúng lúc hệ thống có sự cố** — tức là đúng lúc write load cũng tăng (log/metric lỗi bùng nổ) và đúng lúc TSDB có thể đang mất node. Phải có cơ chế bảo vệ: cache, rate limit query, và **ưu tiên alert query hơn dashboard query** (nếu phải bỏ, bỏ dashboard).

---

## 4. Data model — và kẻ giết hệ thống mang tên cardinality

### 4.1 Cấu trúc một time series

```
   cpu.load{host="i631", region="us-west", pool="web"}  1613707265  50.0
   └──┬───┘└───────────────────┬──────────────────────┘ └────┬───┘ └─┬─┘
   metric name             labels / tags                 timestamp  value
   └──────────────────────────┬─────────────────────────┘
              SERIES KEY — định danh duy nhất một chuỗi
```

Điểm cốt lõi: **series key = metric name + toàn bộ tập label đã sắp xếp**. Đổi một ký tự trong bất kỳ label nào → một series hoàn toàn mới. TSDB băm series key thành `series_id`, lưu dữ liệu dưới dạng `series_id → [(ts₁,v₁), (ts₂,v₂), ...]` (chuỗi nén, ghi tuần tự), và duy trì một **inverted index** để tra ngược từ label sang series:

```
region="us-west"    → {series_id: 1, 7, 12, 88, 341, ...}   (posting list)
pool="web"          → {series_id: 1, 7, 55, 341, ...}
__name__="cpu.load" → {series_id: 1, 7, 12, ...}
```

Truy vấn `avg(cpu.load{region="us-west", pool="web"})` được thực hiện bằng cách **giao các posting list** rồi quét dữ liệu của các series còn lại. Đây chính là lý do cardinality giết hệ thống: cả chi phí bộ nhớ lẫn chi phí truy vấn đều tỉ lệ thuận với số series.

### 4.2 Cardinality explosion — giải thích bằng số

Cardinality = **số series sống**, và nó là **tích** của số giá trị khác nhau của từng label, không phải tổng.

```
metric http_request_duration:
   service 200 × endpoint 50 × method 5 × status 10 × region 5
   = 2.500.000 series                      ← nhiều nhưng chịu được

thêm một label tưởng chừng vô hại:
   + user_id 100.000.000
   = 2,5 × 10¹⁴ series                     ← hai trăm năm mươi nghìn tỷ
```

Nhưng thực tế không bùng lên ngay, và **đó mới là phần nguy hiểm**: series chỉ được tạo khi thực sự có dữ liệu. Hệ sẽ không sập trong 1 giây — nó **phình đều đặn suốt vài giờ rồi chết** khi bộ nhớ cạn, đúng kiểu sự cố khó chẩn đoán nhất.

| Tài nguyên | Vì sao phình | Hậu quả |
|---|---|---|
| **Bộ nhớ index** | Mỗi series cần entry trong inverted index + head chunk trong RAM (~1–3 KB/series) | 10M series ≈ 10–30 GB RAM; 100M series ≈ OOM |
| **Posting list** | Mỗi label value mới tạo một posting list mới | Query `by (region)` phải giao list hàng triệu phần tử |
| **Chunk trên đĩa** | Series chỉ vài điểm vẫn tốn nguyên chunk header | Nén sụp đổ: 1,37 B/điểm thành 50 B/điểm |
| **Query latency** | Phải mở hàng triệu chuỗi thay vì hàng nghìn | p99 từ 200 ms lên hàng chục giây rồi timeout |
| **Chi phí** | CloudWatch tính tiền *theo từng custom metric* | Hoá đơn nhảy từ trăm đô lên chục nghìn đô/tháng |

Và cái độc nhất: **cardinality không tự dọn**. Series chết (pod bị xoá) vẫn nằm trong index đến hết retention. Một cluster Kubernetes deploy 50 lần/ngày, mỗi lần 200 pod mới, mỗi pod 100 metric có label `pod_name` → **1 triệu series mới mỗi ngày**, toàn series sống vài giờ. Hiện tượng này gọi là **churn**, và nó âm thầm hơn cả explosion vì active series nhìn vẫn bình thường trong khi tổng series trong index tăng tuyến tính.

### 4.3 Quy tắc dùng label, và cách thực thi

> 💡 **Quy tắc vàng**: một label chỉ hợp lệ khi **(a)** tập giá trị hữu hạn và biết trước, **(b)** bạn thực sự muốn *group by* hoặc *filter* theo nó, **(c)** giá trị không do người dùng cuối kiểm soát.

| Label | Nên? | Vì sao |
|---|---|---|
| `region`, `az`, `env`, `service`, `pool` | ✅ | Vài chục đến vài trăm giá trị, cố định, luôn muốn group by |
| `status_code` | ✅ | ~10 giá trị hữu ích (gộp 2xx/4xx/5xx càng tốt) |
| `endpoint` | ⚠️ | Phải là **route template** (`/orders/:id`), không phải URL thật |
| `instance` / `host` | ⚠️ | Ổn với VM dài hạn; nguy hiểm với pod/lambda (churn) |
| `version` | ⚠️ | Tăng theo mỗi deploy → churn; nên drop sau khi rollout xong |
| `user_id`, `order_id`, `trace_id` | ❌ | Không giới hạn — việc của **logs/traces**, không phải metrics |
| `error_message` | ❌ | Text tự do, cardinality vô hạn tuyệt đối |

Vì "hãy cẩn thận" không bao giờ đủ, phải thực thi bằng kỹ thuật:

1. **Trần cardinality cho mỗi metric** ở tầng ingest: vượt 100.000 series thì **drop label nghi vấn** (giữ metric ở mức tổng hợp) và cảnh báo đội sở hữu. Thà mất chi tiết còn hơn mất cả hệ.
2. **Allowlist label** theo từng metric trong service catalog — label lạ bị loại ở collector.
3. **Meta-metric `series_created_per_second` theo từng đội**, alert khi tăng đột biến. Đây là alert cứu hệ thống nhiều nhất trong thực tế.
4. **Cần chiều có cardinality cao thì dùng exemplar** — đính vài `trace_id` mẫu vào histogram bucket thay vì biến nó thành label. Vẫn nhảy được sang trace của request chậm mà không tạo series mới.

> ⚠️ **Bẫy**: histogram nhân cardinality thêm một lần nữa. Một histogram 12 bucket tạo **14 series cho mỗi tổ hợp label** (cộng `_sum` và `_count`), nên cardinality 2,5 triệu ở trên thực tế thành 35 triệu. Luôn tính histogram bằng *số bucket × cardinality*, và cắt số bucket xuống mức thật sự cần (8–10 là đủ cho SLO).


## 5. API design

Hệ này có ba nhóm API khác nhau về đảm bảo.

**Ghi metric (push path)** — tối ưu thông lượng, không đảm bảo bền:

```
POST /v1/metrics/write     (Content-Encoding: snappy, body protobuf)
  timeseries: [{ labels:[{__name__:"cpu.load"},{host:"i631"}],
                 samples:[{ts:1613707265000, value:50.0}, ...] }]
→ 204 No Content          (fire-and-forget, không xác nhận đã bền)
→ 429 Too Many Requests   (client phải DROP, không retry vô hạn)
```

Batch là bắt buộc: một request chứa hàng nghìn sample của nhiều series. Gửi từng điểm sẽ tạo 1 triệu request/giây — chết vì overhead HTTP chứ không vì dữ liệu.

**Expose metric (pull path)** — endpoint do *service được giám sát* cung cấp:

```
GET /metrics  → 200 text/plain
   cpu_load{host="i631",region="us-west"} 50.0
   http_requests_total{method="GET",status="200"} 148293
```

Đặc điểm đáng chú ý: endpoint này **không có timestamp** — thời điểm do collector gán lúc scrape. Điều đó đơn giản hoá client (chỉ cần giữ counter trong bộ nhớ) và loại bỏ hoàn toàn vấn đề lệch đồng hồ giữa 100.000 máy.

**Truy vấn**:

```
GET /v1/query_range?query=avg(rate(http_requests_total{service="checkout"}[5m])) by (region)
                   &start=1613707265&end=1613710865&step=60
→ matrix: [{metric:{region:"us-west"}, values:[[1613707265,"142.3"], ...]}]
```

Bộ ba `start/end/step` là chữ ký nhận dạng của query time series: **bạn không hỏi "các hàng thoả điều kiện", bạn hỏi "một chuỗi giá trị theo lưới thời gian"** — cũng chính là lý do SQL không phù hợp (§9.1).

**Quản lý alert**: `POST /v1/rules`, `GET /v1/alerts?state=firing`, `POST|DELETE /v1/silences`.


## 6. High-level design

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         HẠ TẦNG ĐƯỢC GIÁM SÁT                           │
│  app server · DB · queue · LB · k8s node · batch job (100.000 máy)       │
│   mỗi máy expose /metrics   hoặc   chạy agent đẩy metric đi              │
└───────┬─────────────────────────────────────────┬───────────────────────┘
        │ ① PULL (scrape mỗi 10 s)                │ ① PUSH (agent/StatsD)
        │                                         │
┌───────▼─────────────────────────────────────────▼───────────────────────┐
│                    METRICS COLLECTOR POOL (stateless)                    │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐   phân mảnh bằng             │
│   │collector1│  │collector2│  │collector3│   consistent hashing          │
│   └──────────┘  └──────────┘  └──────────┘   trên tập target            │
│        ▲ ② danh sách target + cấu hình scrape                            │
│   ┌────┴──────────────────┐                                              │
│   │ SERVICE DISCOVERY     │  etcd / Consul / k8s API / EC2 tags          │
│   └───────────────────────┘                                              │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ ③ write (nén, batch)
                  ┌────────────▼─────────────┐
                  │   KAFKA (tuỳ chọn)       │  buffer · decouple ·
                  │   partition theo         │  replay khi TSDB chết
                  │   hash(series_key)       │
                  └────────────┬─────────────┘
                               │ ④ consumer / stream processor (Flink)
                               │    tính rollup, lọc, làm giàu label
        ┌──────────────────────▼───────────────────────┐
        │        TIME-SERIES DATABASE (sharded)        │
        │  ┌────────┐ ┌────────┐ ┌────────┐            │
        │  │shard 1 │ │shard 2 │ │shard 3 │  ×RF3      │
        │  └────────┘ └────────┘ └────────┘            │
        │  tầng nóng: WAL + head chunk trong RAM       │
        │  tầng ấm : block nén trên SSD (7–30 ngày)    │
        │  tầng lạnh: object storage (S3) 1 năm        │
        └───────┬──────────────────────────┬───────────┘
                │ ⑤                        │ ⑤
      ┌─────────▼──────────┐     ┌─────────▼──────────┐
      │   QUERY SERVICE    │     │ DOWNSAMPLING /     │
      │  + CACHE (Redis)   │     │ COMPACTION JOB     │
      │  + rate limit      │     │ 10 s→1 m→1 h       │
      └────┬──────────┬────┘     └────────────────────┘
           │ ⑥        │ ⑥
  ┌────────▼───┐  ┌───▼────────────────────────────────┐
  │ DASHBOARD  │  │        ALERTING SYSTEM             │
  │ (Grafana)  │  │ ┌────────────┐   ┌──────────────┐  │
  └────────────┘  │ │ rule engine│──▶│alert manager │  │
                  │ │ eval 15 s  │   │dedupe/group/ │  │
                  │ │ for: 5m    │   │silence/inhibit│ │
                  │ └────────────┘   └──────┬───────┘  │
                  │   alert store (KV)      │          │
                  └─────────────────────────┼──────────┘
                                            │ ⑦
                  ┌─────────────────────────▼──────────┐
                  │ Email · SMS · PagerDuty · Slack ·  │
                  │ webhook                            │
                  └────────────────────────────────────┘
```

Hai điểm cần nhấn ngay: **đường ghi và đường alert có đảm bảo khác nhau** (ghi là best-effort, alert là at-least-once), và **query service là lớp cách ly bắt buộc** chứ không phải tầng thừa (§10).


## 7. Deep dive 1 — Thu thập: pull hay push?

Đây là câu hỏi nhiều chiều nhất của bài, và câu trả lời "tuỳ" chỉ được chấp nhận nếu bạn liệt kê đúng các chiều.

### 7.1 Pull model — collector chủ động đi lấy

```
  ┌─────────────────┐ 1. đọc target list  ┌───────────┐
  │Service Discovery│◀────────────────────│ collector │
  └─────────────────┘  (etcd/Consul/k8s)  │ scrape    │
  ┌──────────┐  2. GET /metrics           │ mỗi 10 s  │
  │ app:9090 │◀───────────────────────────│           │
  │ /metrics │───────────────────────────▶│ 3. gán ts │──▶ TSDB
  └──────────┘  text response             └───────────┘
```

Collector giữ danh sách target lấy từ service discovery, mỗi `scrape_interval` thì GET `/metrics` của từng target, parse, gán timestamp, ghi đi.

Cái hay lớn nhất — lý do Prometheus thắng trong thế giới container — là một hệ quả phụ: **scrape thất bại thì collector biết ngay target đã chết.** Prometheus tự sinh `up{instance="..."} = 0`, cho bạn alert `up == 0 for 5m` áp dụng cho **mọi** service mà không service nào phải viết code. Trong mô hình push, "không nhận được dữ liệu" là tín hiệu mơ hồ: máy chết, agent chết, mạng nghẽn, hay máy đó vốn không tồn tại? **Bạn không thể alert trên sự vắng mặt của thứ bạn không biết là phải có mặt.**

Hai lợi ích nữa: **debug tại chỗ** (`curl localhost:9090/metrics` cho thấy đúng cái collector thấy, không có tầng trung gian để nghi ngờ) và **backpressure tự nhiên** — collector kiểm soát tần suất nên không bao giờ bị dội; quá tải thì giãn interval, một kiểu degradation êm ái. Push thì nguồn quyết định tốc độ, collector chỉ biết chịu hoặc từ chối.

Nhược điểm thật của pull:

- **Job ngắn chết trước khi bị scrape.** Cron job chạy 3 giây với interval 10 giây thì phần lớn không bao giờ được lấy. Vá bằng **push gateway** (job đẩy vào kho trung gian, collector scrape kho đó) — nhưng push gateway thành điểm lưu trạng thái (metric của job đã chết nằm đó mãi) và phá vỡ chính đặc tính `up`.
- **Mạng phải thông chiều collector → target**: nhiều VPC, nhiều DC, NAT, firewall → rất phiền. Push chỉ cần outbound, gần như luôn mở.
- **Serverless không pull được** — Lambda không có endpoint để gọi vào và sống vài trăm mili giây.
- **Phải quản lý danh sách target** — thêm một hệ trạng thái phải luôn đúng.

### 7.2 Push model — nguồn chủ động gửi đi

```
  ┌──────────┐ StatsD/UDP  ┌──────────┐  HTTP batch  ┌──────────┐
  │   app    │────────────▶│  agent   │─────────────▶│collector │
  │ in-proc  │ (localhost, │ sidecar/ │ (nén + gom   │ LB + ASG │
  │ counter  │  latency≈0) │ daemon   │  10 s)       │          │
  └──────────┘             └──────────┘              └──────────┘
```

Push thường có **hai chặng**. Chặng UDP nội bộ là thiết kế thông minh đáng nói riêng: **app không bao giờ bị block vì monitoring**. Gửi UDP tới `127.0.0.1` là fire-and-forget thật sự — không bắt tay, không chờ ACK; agent chết thì gói tin rơi vào hư không mà app không biết. Đổi độ tin cậy lấy việc **không bao giờ để monitoring làm chậm production** là đánh đổi hầu như luôn đúng. Chặng agent → collector cũng có giá trị: agent gom 10 giây counter thành một con số, giảm khối lượng 10–100 lần.

Nhược điểm thật của push:

- **Không phân biệt được "chết" và "im lặng"** — nghiêm trọng nhất.
- **Collector có thể bị dội.** Bug gây vòng lặp phát metric, hay 10.000 pod cùng khởi động sau deploy, đập thẳng vào collector. Bắt buộc LB + ASG + rate limit, và client bị 429 phải **drop chứ không retry** (retry storm làm mọi thứ tệ hơn).
- **Nguồn gốc dữ liệu không đảm bảo** — ai cũng gửi được, cần allowlist/mTLS. Pull không có gánh nặng này vì chỉ lấy từ target trong config.
- **Lệch đồng hồ**: timestamp do nguồn gán, 100.000 máy có 100.000 đồng hồ; lệch 30 giây tạo dữ liệu ở tương lai, hỏng cả biểu đồ lẫn alert.

### 7.3 Bảng đối chiếu

| Tiêu chí | Pull | Push | Thắng |
|---|---|---|---|
| Biết target chết | `up == 0` ngay, miễn phí, cho mọi service | Chỉ thấy "không có dữ liệu" — mơ hồ | **Pull** |
| Debug thủ công | `curl /metrics` thấy đúng cái collector thấy | Phải lần agent → mạng → collector | **Pull** |
| Job ngắn / batch / Lambda | Chết trước khi được scrape; cần push gateway | Tự nhiên, đúng mô hình | **Push** |
| Firewall / NAT / multi-VPC | Cần đường vào từng target | Chỉ cần outbound | **Push** |
| Xác thực nguồn dữ liệu | Mặc định tin được (target trong config) | Cần allowlist / mTLS | **Pull** |
| Backpressure | Collector tự điều tiết tần suất | Chỉ biết từ chối (429) | **Pull** |
| Độ trễ truyền | Tối đa = scrape interval | Gửi ngay, UDP latency ≈ 0 | **Push** |
| Đồng hồ | Một nguồn thời gian duy nhất | N nguồn, lệch nhau | **Pull** |
| Tổng hợp trước khi gửi | Khó (client phải giữ trạng thái) | Dễ (agent gom 10 s) | **Push** |
| Quản lý cấu hình | Tập trung, dễ audit | Phân tán trên N agent | **Pull** |

> 💡 **Kết luận thực chiến**: tổ chức lớn **luôn phải hỗ trợ cả hai**. Pull làm mặc định cho service chạy dài (nhận `up` miễn phí, cấu hình tập trung); push cho ba trường hợp pull không với tới: **job ngắn/serverless**, **mạng không thông chiều vào**, **thiết bị ngoài tổ chức**. Cả hai đổ vào cùng collector pool và cùng TSDB — khác biệt chỉ ở tầng thu thập.

> ⚠️ **Bẫy khi trả lời**: nói "Prometheus dùng pull nên pull tốt hơn". Prometheus dùng pull vì nó sinh ra cho môi trường container nơi service discovery sẵn có và mạng nội bộ phẳng. CloudWatch dùng push vì phải nhận dữ liệu từ tài khoản khách hàng qua Internet, nơi AWS không thể mở đường gọi vào. **Kiến trúc mạng và mô hình sở hữu quyết định lựa chọn, không phải chất lượng kỹ thuật.**

### 7.4 Scale tầng collection bằng consistent hashing

Một collector scrape được ~1.000–2.000 target, nên 100.000 target cần **50–100 collector**. Ngay lập tức nảy sinh vấn đề: làm sao mỗi target **được đúng một collector** scrape? Hai collector cùng scrape thì dữ liệu nhân đôi (`rate()` sai gấp đôi); không collector nào scrape thì mất dữ liệu.

```
       consistent hash ring (băm target_id và collector_id lên cùng vòng)
                      0/2³²
                        │
           C3 ●─────────┼─────────● C1
             ╱  t7  t2  │  t1  t9  ╲
            │ t4        │        t3 │
             ╲  t5      │      t6 t8╱
           C2 ●─────────┴─────────● C4

   target đi theo chiều kim đồng hồ, gặp collector nào trước thì thuộc về
   collector đó → thêm/bớt collector chỉ xáo trộn ~1/N tập target
```

Vì sao không phải `hash(target) % N`? Vì `% N` khiến **toàn bộ** ánh xạ thay đổi khi N đổi — mà N đổi liên tục do collector cũng autoscale và cũng chết. Rehash toàn bộ nghĩa là 100.000 target chuyển chủ đồng loạt: mất dữ liệu một chu kỳ và mọi collector cùng tải lại cấu hình (thundering herd). Chi tiết cơ chế xem `sd-09 — Consistent Hashing`.

Bốn chi tiết thực thi làm câu trả lời có sức nặng:

1. **Ai giữ vòng băm?** Coordination service (etcd/Consul). Collector đăng ký membership kèm lease/TTL; hết lease không gia hạn thì bị gỡ khỏi vòng.
2. **Khoảng chuyển giao.** Vòng đổi thì có lúc hai collector cùng nghĩ mình sở hữu một target. Ta chấp nhận **at-least-once và khử trùng lặp ở TSDB**: cùng `(series_id, timestamp)` thì ghi đè, không cộng dồn. Ghi *idempotent* làm toàn bộ vấn đề re-sharding trở nên vô hại — mẹo đáng giá nhất ở đây.
3. **Lệch tải.** Có máy expose 100 metric, có máy 50.000. Băm đều theo *số target* vẫn lệch nặng theo *số series*: gán **trọng số theo series count đo được**, tách target "khổng lồ" vào pool riêng.
4. **Giãn pha scrape.** 1.000 target bị scrape cùng một mili giây tạo đỉnh tải răng cưa — rải pha bằng `hash(target) % interval`.


## 8. Deep dive 2 — Đường truyền: có thật sự cần Kafka?

Sách giáo khoa thường vẽ Kafka vào giữa collector và TSDB rồi đi tiếp. Phần đáng giá nằm ở chỗ **đặt câu hỏi ngược lại**.

### 8.1 Lý lẽ ủng hộ

1. **Tách rời vòng đời.** TSDB cần restart để nâng cấp, hoặc một shard đang compaction và chậm đi 10×. Không có buffer, collector phải hoặc chặn (hỏng scrape) hoặc vứt dữ liệu. Có Kafka, collector cứ ghi bình thường, consumer chậm lại rồi đuổi kịp.
2. **Replay.** Ghi sai (nhầm label, nhầm đơn vị) hoặc mất một shard — vẫn còn 24 giờ dữ liệu để ghi lại.
3. **Nhiều consumer trên cùng một luồng**: TSDB, một consumer tính rollup thời gian thực, một consumer phát hiện bất thường, một consumer đẩy sang data lake. Fan-out miễn phí.
4. **Hấp thụ đỉnh.** Sau sự cố mạng, 100.000 agent đồng loạt gửi lại dữ liệu tồn — Kafka nuốt được đỉnh đó, TSDB thì không.

Partition nên chia theo `hash(series_key)`, **không phải theo metric name**. Chia theo metric name nghe hợp lý nhưng tạo hot partition khủng khiếp: `http_requests_total` chiếm 30% khối lượng còn `zookeeper_znode_count` gần như trống. Băm theo series key thì tải đều mà vẫn giữ được tính chất quan trọng nhất: **mọi điểm của cùng một series vào cùng một partition**, nên consumer tính rollup không cần shuffle và thứ tự trong series được bảo toàn.

### 8.2 Lý lẽ phản đối — và khi nào bỏ Kafka

Kafka ở quy mô này không nhỏ: 100 MB/s ingress × replication 3 = 300 MB/s ghi đĩa, giữ 24 giờ là ~8,6 TB, cỡ 6–12 broker cộng đội vận hành — và thêm một hệ nữa phải giám sát (ai giám sát nó? §13.3). Quan trọng hơn: **TSDB hiện đại đã có sẵn nhiều thứ Kafka cung cấp** — Prometheus có WAL cục bộ nên mất kết nối vẫn giữ được dữ liệu và gửi lại qua remote-write queue. Nếu đường ghi là pull và collector có đĩa cục bộ, collector **chính là** buffer rồi.

| Tình huống | Có nên đặt Kafka? |
|---|---|
| Chỉ ghi vào một TSDB, collector có WAL cục bộ | ❌ Thừa — dùng WAL + remote-write queue |
| Nhiều consumer (TSDB + anomaly detection + data lake) | ✅ Fan-out là lý do chính đáng nhất |
| Cần replay khi ghi sai hoặc mất shard | ✅ |
| Cần biến đổi/tổng hợp nặng trước khi ghi (Flink) | ✅ |
| Đội nhỏ, không có kinh nghiệm vận hành Kafka | ❌ Chi phí vận hành lớn hơn lợi ích |
| Nguồn đẩy qua Internet, đỉnh khó đoán | ✅ Hấp thụ đỉnh |

> 💡 **Nguyên tắc**: Kafka ở đây không phải để "cho chắc" — nó tồn tại khi bạn cần **fan-out hoặc replay**. Nếu chỉ chống TSDB restart, một WAL cục bộ ở collector rẻ hơn nhiều lần.

### 8.3 Tổng hợp ở đâu — ba vị trí, ba đánh đổi

| Vị trí | Cách làm | Được | Mất |
|---|---|---|---|
| **Agent (client-side)** | Gom counter 10 s rồi gửi một số | Giảm 10–100× khối lượng; rẻ nhất | Chỉ làm được phép đơn giản; **percentile cục bộ không cộng được** |
| **Ingest pipeline (Flink)** | Rollup/pre-aggregation trước khi ghi | Giảm khối lượng ghi và dung lượng; dashboard nhanh sẵn | Mất dữ liệu thô → không truy ngược được; phải xử lý late-arriving data |
| **Query time** | Lưu thô, tính lúc truy vấn | Không mất gì, linh hoạt tuyệt đối | Query chậm và tốn; lặp cùng phép tính hàng nghìn lần |

Sai lầm kinh điển là **tính percentile ở agent**. Nếu 100 máy mỗi máy báo "p99 của tôi là 200 ms", bạn **không thể** suy ra p99 toàn service — p99 toàn cục có thể là 800 ms nếu một máy có đuôi dài. Cách đúng là gửi **histogram bucket** (counter đếm số request rơi vào từng khoảng), vì bucket **cộng được**: cộng bucket của 100 máy rồi mới nội suy percentile. Đây là lý do thực sự tồn tại của kiểu dữ liệu histogram.

Kiến trúc thực dụng nhất là **kết hợp cả ba**: agent gom counter thô, pipeline tính sẵn các rollup dashboard dùng nhiều nhất (recording rules), và giữ dữ liệu thô cho câu hỏi đột xuất.


## 9. Deep dive 3 — Storage: vì sao cần một time-series database riêng

### 9.1 Vì sao RDBMS hỏng

Không phải vì "SQL chậm", mà vì bốn lý do cấu trúc:

**(a) B-tree ghét ghi ngẫu nhiên khối lượng lớn.** Mỗi insert phải tìm chỗ trong cây, có thể gây page split, cập nhật mọi index phụ, ghi WAL — ghi khuếch đại 5–10×, tức 1 triệu insert/s thực chất là 5–10 triệu thao tác ghi/s. Ngược lại, dữ liệu metric **đến gần như đúng thứ tự thời gian** — đặc tính vàng cho **LSM-tree**: gom vào memtable, đầy thì ghi tuần tự một mạch xuống SSTable, không bao giờ sửa tại chỗ.

**(b) Row-oriented lãng phí khủng khiếp.** Hàng `(metric_name, host, region, pool, ts, value)` lặp lại bốn trường đầu **mỗi 10 giây, mãi mãi** — 76 byte cho 8 byte thông tin thật. TSDB tách series key lưu **một lần** trong index, dữ liệu chỉ còn `(ts, value)` lưu theo **cột**, nén cực tốt vì giá trị cạnh nhau rất giống nhau.

**(c) Xoá dữ liệu cũ là ác mộng.** `DELETE ... WHERE ts < now() - 7 days` trên hàng trăm tỷ hàng: khoá bảng, phình WAL, dead tuple, VACUUM. TSDB lưu theo **block thời gian** (mỗi block 2 giờ), hết hạn thì **xoá nguyên file** — `unlink`, O(1). Lợi thế bị đánh giá thấp nhất nhưng vận hành cảm nhận rõ nhất.

**(d) Truy vấn sai hình dạng.** Câu hỏi metric luôn dạng "một chuỗi giá trị trên lưới thời gian đều, có nội suy, có cửa sổ trượt" — viết bằng SQL phải dùng window function lồng nhau, `generate_series`, `LATERAL JOIN`, hàng chục dòng cho việc PromQL viết một dòng:

```promql
avg(rate(http_requests_total{service="checkout"}[5m])) by (region)
```

Điểm tinh tế của `rate()`: nó tự xử lý **counter reset** (process restart, counter về 0). Viết logic đó bằng SQL cho đúng và nhanh là bài tập khó chịu; trong TSDB nó là ngữ nghĩa có sẵn của kiểu dữ liệu.

> ⚠️ **Ngoại lệ đáng biết**: TimescaleDB và các giải pháp "SQL + time series" chạy tốt ở quy mô vừa (hàng chục nghìn ghi/s) và rất đáng dùng nếu bạn đã có PostgreSQL và muốn join metric với dữ liệu nghiệp vụ. Ở 1 triệu ghi/s thì không.

### 9.2 Kiến trúc lưu trữ của một TSDB

```
  samples ─▶ WAL (append-only, fsync theo lô)      ← chống mất khi crash
                 │
                 ▼
     HEAD BLOCK trong RAM — 2 giờ gần nhất
       series_id → chunk đang ghi (nén) + inverted index của label
                 │  mỗi 2 giờ: flush
                 ▼
     BLOCK bất biến trên SSD
       chunks/ (nén theo cột) · index (label → posting list) · meta.json
                 │  compaction: 2 h → 8 h → 1 ngày, kèm bản downsample
                 ▼
     OBJECT STORAGE (S3) — tầng lạnh, đọc qua store gateway + cache
```

Ba đặc tính then chốt:

1. **Block là bất biến** — đã flush thì không bao giờ sửa. Cache cực dễ (không cần invalidate), sao lưu chỉ là copy file, nhiều process cùng đọc không cần khoá.
2. **Dữ liệu nóng nằm trong RAM.** Facebook đo được **85% truy vấn nhắm vào dữ liệu của 26 giờ gần nhất** — con số này biện minh hoàn toàn cho một tầng in-memory (chính là ý tưởng Gorilla). Giữ ~1 ngày dữ liệu nén trong RAM là phục vụ được phần lớn truy vấn mà không chạm đĩa.
3. **Tầng lạnh trên object storage.** Dữ liệu 1 giờ của cả năm chỉ ~0,7 TB nhưng gần như không ai đọc — để trên S3 rẻ hơn SSD 10–20 lần, truy vấn hiếm hoi chấp nhận chậm vài giây.

### 9.3 Nén: delta-of-delta và XOR

Phần này là "niche knowledge", nhưng nêu được thì nó chứng minh con số 1,37 byte/điểm ở §3.3 là có thật. Kỹ thuật đến từ **Gorilla (Facebook, VLDB 2015)**, nay là chuẩn chung của Prometheus, InfluxDB, M3, VictoriaMetrics.

**Timestamp — delta-of-delta.** Metric được lấy mẫu đều nên timestamp cách nhau gần đúng bằng interval:

```
thô:            1613707265, 1613707275, 1613707285, 1613707295, 1613707306
delta:                     +10        +10        +10        +11
delta-of-delta:              0          0         +1   ← phần lớn là 0 → 1 bit
```

Mã hoá biến độ dài: dod = 0 → **1 bit**; trong [-63, 64] → 9 bit; [-255, 256] → 12 bit. Trong dữ liệu thực của Facebook, **96% timestamp nén xuống 1 bit** — 64-bit thành 1 bit cho một nửa dữ liệu.

**Giá trị — XOR float.** Giá trị liền kề thường rất giống nhau (CPU 50,1% rồi 50,3%), nên biểu diễn IEEE-754 của chúng chỉ khác vài bit ở giữa:

```
v(n-1) = 0x4049 0000 0000 0000
v(n)   = 0x4049 1000 0000 0000
XOR    = 0x0000 1000 0000 0000   ← rất nhiều bit 0 ở đầu và cuối
```

Ghi XOR thay vì ghi giá trị: XOR = 0 (giá trị không đổi — cực phổ biến với gauge) thì ghi **1 bit**; khác 0 thì chỉ ghi "cửa sổ ý nghĩa" (số bit 0 dẫn đầu + độ dài + các bit giữa). Facebook đo: **59% giá trị nén xuống 1 bit**, còn lại trung bình ~13 bit. Kết hợp: 16 byte → **~1,37 byte**, hệ số ~12×. Chính con số này biến "2,4 PB" thành "vài TB".

> ⚠️ **Điều kiện để nén hiệu quả**: dữ liệu phải **đều đặn và đến đúng thứ tự**. Dữ liệu out-of-order hoặc interval nhảy loạn làm delta-of-delta mất tác dụng và chunk phải mở lại — thêm một lý do để dùng pull (timestamp do collector gán, luôn đều) và chuẩn hoá interval trong toàn tổ chức.

### 9.4 Downsampling và retention

Hai khái niệm hay bị lẫn: **downsampling** giảm độ phân giải, **retention** xoá hẳn.

| Tầng | Độ phân giải | Giữ | Dùng cho | Dung lượng |
|---|---|---|---|---|
| Raw | 10 s | 7 ngày | Debug incident đang diễn ra, alert | ~1,2 TB |
| Rollup 1 | 1 phút | 30 ngày | So sánh tuần trước, phân tích sau sự cố | ~3,5 TB |
| Rollup 2 | 1 giờ | 1 năm | Xu hướng, capacity planning, báo cáo | ~0,7 TB |

Ba chi tiết thực thi thường bị bỏ qua:

**Lưu gì trong mỗi bucket rollup?** Không phải chỉ `avg`. Chỉ giữ trung bình là **mất vĩnh viễn các đỉnh** — spike CPU 100% kéo dài 20 giây thành 35% khi gộp về 1 phút, và bạn không bao giờ tìm lại được. Phải giữ tối thiểu `min`, `max`, `sum`, `count` (từ `sum/count` tái tạo `avg`, `max` giữ đỉnh). Với histogram thì rollup phải cộng theo từng bucket, tuyệt đối không tính percentile trước khi rollup.

**Ai chạy rollup?** Một compaction job chạy nền: đọc block cũ, sinh block mới ở độ phân giải thấp, ghi xong mới xoá block cũ (an toàn khi crash). Job này ngốn I/O nặng nên phải throttle và tránh giờ cao điểm — rất nhiều sự cố monitoring bắt nguồn từ compaction chạy trùng lúc với incident.

**Truy vấn chọn tầng nào?** Query service tự chọn theo `step` và khoảng thời gian: 6 giờ với step 30 s → raw; 90 ngày với step 1 giờ → rollup 1 giờ. Chọn sai tầng là nguyên nhân số một của query timeout — hỏi 1 năm ở độ phân giải 10 s là quét 3,1 triệu điểm **cho mỗi series**.

> 💡 **Nguyên tắc**: độ phân giải cần có tỉ lệ nghịch với tuổi dữ liệu, vì **giá trị của một điểm dữ liệu giảm theo thời gian nhưng chi phí lưu nó thì không**. Không ai cần biết CPU của 8 tháng trước ở giây thứ 37.


## 10. Deep dive 4 — Query service: vì sao dashboard không được nói chuyện thẳng với TSDB

Cám dỗ lớn: Grafana nối thẳng vào Prometheus/InfluxDB, bỏ được một tầng. Quy mô nhỏ thì đúng; quy mô này thì sai, vì bốn lý do.

**(a) Không ai chắn được truy vấn giết người.** Một người gõ `sum(rate(http_requests_total[1h])) by (pod)` trên 30 ngày sẽ mở hàng triệu series và **kéo cả TSDB xuống** — trong khi alert engine cũng đang cần chính TSDB đó. Query service là nơi đặt giới hạn số series, giới hạn khoảng thời gian, timeout, và **hàng đợi ưu tiên** (alert query đi trước dashboard query).

**(b) Dashboard lặp lại truy vấn đến mức ngớ ngẩn.** 50 người mở cùng một dashboard refresh 30 giây → cùng một truy vấn chạy 100 lần/phút cho cùng một kết quả. Một tầng cache là đủ giảm 90%+ tải đọc.

**(c) Không đổi được TSDB.** Nếu mọi dashboard và alert nhúng thẳng PromQL vào một TSDB cụ thể, chuyển sang Thanos/Mimir/Timestream là dự án nhiều tháng. Query service là lớp chống rò rỉ (anti-corruption layer).

**(d) Không fan-out được.** Ở 10 triệu series, TSDB phải shard. Ai bắn truy vấn tới 8 shard, gộp kết quả, xử lý chuyện một shard không trả lời? Nếu không phải query service thì logic phân tán đó nằm trong Grafana — một nơi rất tệ để đặt nó.

### 10.1 Chiến lược cache — tinh tế hơn "cắm Redis vào"

Time series có một đặc tính khai thác được: **quá khứ là bất biến**. Truy vấn `[12:00 → 18:00]` lúc 18:05 và lúc 18:10 chỉ khác nhau ở phần đuôi.

```
lúc 18:05:  ├───────── 12:00 → 18:05 ─────────┤
lúc 18:10:  ├───────── 12:00 → 18:05 ─────────┤──┤
            └── bất biến, CACHE VĨNH VIỄN ────┘  └ chỉ phần này mới
```

**Time-split caching**: chia trục thời gian thành ô cố định (mỗi giờ), cache riêng từng ô; ô đã đóng cache vô thời hạn, chỉ ô cuối phải tính lại. Một dashboard refresh 30 giây chỉ thực sự tính khoảng 1/700 khối lượng.

| Tầng cache | Nội dung | TTL | Hiệu quả |
|---|---|---|---|
| Kết quả truy vấn (Redis) | Chuỗi đã tính, chia ô theo giờ | Ô quá khứ: vĩnh viễn; ô hiện tại: 10–30 s | Cao nhất, dễ nhất |
| Chunk (trong TSDB) | Block nén đã đọc từ S3/SSD | LRU theo RAM | Cứu tầng lạnh |
| Recording rule | Kết quả pre-aggregation ghi thành series mới | — (là dữ liệu thật) | Giảm cả CPU lẫn latency |

### 10.2 Pre-aggregation (recording rules) — vũ khí mạnh nhất

Phép tính mà dashboard và alert dùng đi dùng lại thì **tính sẵn mỗi 30 giây rồi ghi thành series mới**, thay vì tính lại lúc truy vấn.

```yaml
- record: service:http_requests:rate5m
  expr:    sum(rate(http_requests_total{job="api"}[5m])) by (service, region)
```

Truy vấn dashboard trở thành `service:http_requests:rate5m` — đọc **một series đã tổng hợp** thay vì gộp mười nghìn series. Cải thiện thường là **100–1000×** về latency, và nó làm alert rule chạy nhanh hơn nhiều (nhớ §3.4: alert eval là read load thường trực lớn nhất).

Cái giá: mỗi rule tạo thêm series (tốn dung lượng và cardinality) và phải được bảo trì — đổi label mà quên sửa rule thì dashboard im lặng trả rỗng. Nguyên tắc: **chỉ pre-aggregate những gì có trong alert rule hoặc dashboard xem hàng ngày**.


## 11. Deep dive 5 — Alerting: phần dễ làm sai nhất

Tầng lưu trữ sai thì tốn tiền. **Tầng alert sai thì con người bỏ cuộc** — hỏng hóc tệ hơn nhiều, vì nó không hiện trên bất kỳ dashboard nào.

### 11.1 Kiến trúc

```
RULE STORE (YAML trong Git) ──▶ RULE ENGINE (eval mỗi 15 s) ──▶ QUERY SERVICE
                                  thoả → PENDING; giữ đủ `for` → FIRING
                                        │ alert event (kèm toàn bộ label)
                                        ▼
   ALERT STORE (KV) ◀──▶ ALERT MANAGER: ①dedupe ②group ③inhibit
   trạng thái + lịch sử gửi              ④silence ⑤route ⑥throttle/retry
                                        │
                                        ▼ Kafka → consumer
                     Email · SMS · PagerDuty · Slack · webhook
```

Vì sao alert store là KV database riêng (Cassandra/DynamoDB) chứ không nằm trong bộ nhớ? Vì **alert manager có thể chết**, và hai thứ phải sống sót qua cái chết đó: alert nào đang firing (để biết khi nào gửi "resolved"), và alert nào đã gửi rồi (để không gửi trùng). Không có store bền, một lần restart sẽ dội lại toàn bộ alert đang mở vào điện thoại on-call lúc 3 giờ sáng.

### 11.2 `for: 5m` — vì sao không alert ngay

```yaml
- alert: HighErrorRate
  expr: |
    sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
      / sum(rate(http_requests_total[5m])) by (service) > 0.05
  for: 5m
  labels:   { severity: page, team: checkout }
  annotations:
    summary: "{{ $labels.service }} lỗi 5xx {{ $value | humanizePercentage }}"
    runbook: "https://wiki/runbooks/high-error-rate"
```

`for: 5m` nghĩa là điều kiện phải đúng **liên tục 5 phút** mới chuyển PENDING → FIRING. Nó chống **flapping** — điều kiện dao động quanh ngưỡng và bắn ra hàng chục alert rồi tự resolve.

Cách nghĩ định lượng đáng nhớ: nếu nhiễu khiến metric vượt ngưỡng ngẫu nhiên 1% số lần đo, với eval 15 giây bạn nhận **~58 alert giả mỗi ngày**. Với `for: 5m` (cần 20 lần eval liên tiếp cùng vượt), xác suất giả là 0,01²⁰ — bằng không.

Cái giá là **độ trễ phát hiện**: alert latency thật = `scrape` + `eval` + `for` + thời gian giao ≈ 10 s + 15 s + 300 s + 30 s ≈ **~6 phút**. Nếu SLO cần phát hiện dưới 2 phút, phải hạ `for` và chịu nhiễu — hoặc dùng burn rate nhiều cửa sổ (§11.5), cách giải quyết thanh lịch hơn nhiều.

| Loại triệu chứng | `for` | Lý do |
|---|---|---|
| Service không phản hồi | 1–2 phút | Rõ ràng, không cần xác nhận lâu |
| Tỉ lệ lỗi vượt ngưỡng | 5 phút | Nhiễu nhiều, cần xác nhận xu hướng |
| Latency p99 cao | 10 phút | Rất nhiễu; spike ngắn thường tự hồi |
| Đĩa sẽ đầy | 30–60 phút | Biến chậm, alert sớm vô ích |
| Certificate sắp hết hạn | 1 ngày (ngưỡng 14 ngày) | Không khẩn cấp, chỉ cần không quên |

### 11.3 Dedupe, grouping, inhibition, silence — bốn cơ chế chống ngập

Bốn cơ chế giải quyết bốn vấn đề khác nhau; lẫn lộn chúng là lỗi rất phổ biến.

**① Deduplication — cùng một alert, nhiều nguồn phát.** Chạy 3 bản rule engine để chịu lỗi → cùng alert đến 3 lần. Alert manager băm theo tập label (fingerprint) và giữ một. Đây là điều kiện để rule engine chạy HA mà không nhân ba thông báo.

**② Grouping — nhiều alert khác nhau, cùng một sự kiện.** Một switch chết kéo theo 200 alert `InstanceDown`. Gom theo `group_by: [cluster, alertname]` và gửi **một** thông báo liệt kê 200 instance.

```yaml
route:
  group_by: [cluster, alertname]
  group_wait:      30s   # chờ gom các alert liên quan đến sau
  group_interval:  5m    # có thành viên mới thì 5 phút sau mới báo tiếp
  repeat_interval: 4h    # vẫn firing thì 4 giờ nhắc lại
```

`group_wait: 30s` là chi tiết nhỏ mà quan trọng: nó cố tình **trì hoãn** thông báo đầu tiên để alert liên quan kịp đến và được gom chung — đổi 30 giây lấy việc không bắn 200 tin nhắn.

**③ Inhibition — alert nguyên nhân che alert hệ quả.** `DatacenterDown` đang firing thì ức chế mọi `ServiceDown` trong DC đó; nếu không, on-call nhận 500 thông báo mô tả cùng một sự thật.

```yaml
inhibit_rules:
  - source_matchers: [severity="critical", alertname="DatacenterDown"]
    target_matchers: [severity="warning"]
    equal: [datacenter]     # chỉ ức chế trong cùng datacenter
```

**④ Silence — con người chủ động tắt tạm** khi bảo trì theo kế hoạch hoặc đã biết vấn đề. Silence phải có **thời hạn bắt buộc** và ghi lại người tạo + lý do. Silence vĩnh viễn là cách chuẩn để một alert quan trọng biến mất mãi mãi mà không ai nhớ.

| Cơ chế | Giải quyết | Ai kích hoạt | Ví dụ |
|---|---|---|---|
| Dedupe | Cùng alert từ nhiều nguồn | Tự động | 3 rule engine HA |
| Grouping | Nhiều alert cùng sự kiện | Tự động | 200 `InstanceDown` của một rack |
| Inhibition | Alert hệ quả của alert khác | Tự động, theo rule | DC down che service down |
| Silence | Đã biết / đang bảo trì | Con người, có thời hạn | Nâng cấp cluster 2 giờ |

### 11.4 Alert fatigue và nguyên tắc alert trên triệu chứng

**Alert fatigue** là trạng thái đội ngũ nhận nhiều alert đến mức ngừng đọc. Đó không phải vấn đề tâm lý mà là vấn đề kỹ thuật có hậu quả đo được: khi 95% alert là nhiễu, phản xạ hợp lý của con người là bỏ qua — và alert thứ 96 là alert thật. Dấu hiệu định lượng: nếu một ca trực **bị đánh thức hơn 1–2 lần**, hệ alert đã hỏng. Google SRE Book đặt tiêu chí sắc hơn: **mọi page phải cần trí tuệ con người**. Nếu phản hồi là "restart service rồi đi ngủ tiếp", việc đó phải được tự động hoá chứ không phải đánh thức người.

> 💡 **Alert trên triệu chứng người dùng cảm nhận được (symptom), không alert trên nguyên nhân (cause).**

| Alert trên nguyên nhân ❌ | Alert trên triệu chứng ✅ |
|---|---|
| `cpu_usage > 90%` | `latency_p99 > 500ms` |
| `memory_usage > 85%` | `error_rate > 1%` |
| `disk_io_wait cao` | `checkout_success_rate < 99%` |
| `số connection DB > 800` | `queue_age > 5 phút` |
| `một pod bị restart` | `số replica khoẻ < ngưỡng tối thiểu` |

Ba lý do:

1. **CPU 95% không phải sự cố** nếu người dùng vẫn được phục vụ đúng hạn — đó có thể là hệ thống đang dùng đúng tài nguyên đã mua. Alert trên nó tạo nhiễu liên tục.
2. **Nguyên nhân thì vô hạn, triệu chứng thì hữu hạn.** Có 50 cách khiến checkout chậm; bạn không viết nổi 50 alert. Một alert trên độ trễ checkout bắt được **cả 50**, kể cả nguyên nhân bạn chưa từng nghĩ tới — đúng loại sự cố gây thiệt hại nhất.
3. **Triệu chứng ánh xạ thẳng vào tác động kinh doanh**, nên độ ưu tiên tự nhiên đúng.

Metric nguyên nhân không mất vai trò — chúng vẫn cực cần cho dashboard và chẩn đoán, chỉ là không nên đánh thức người. Ngoại lệ hợp lý: **alert dự báo** khi cạn tài nguyên là chắc chắn và không hồi phục được (đĩa đầy trong 4 giờ, cert hết hạn trong 7 ngày).

| | Page (đánh thức) | Ticket (giờ hành chính) |
|---|---|---|
| Tiêu chí | Người dùng đang bị ảnh hưởng, cần hành động **ngay** | Cần xử lý nhưng chịu được vài giờ |
| Ví dụ | Checkout lỗi 5%, service không phản hồi | Đĩa đầy trong 3 ngày, 1/5 replica chết |
| Kênh | PagerDuty / điện thoại | Jira / Slack |
| Ngân sách | ≤ 2 lần/ca trực | Không giới hạn cứng |

### 11.5 SLO, error budget và burn rate

Đây là phần tạo khác biệt rõ nhất, vì nó giải quyết triệt để mâu thuẫn "phát hiện nhanh ↔ ít báo giả" mà `for` chỉ vá tạm.

SLO **99,9% request thành công trong 30 ngày** → **error budget** 0,1%, tức 43 phút lỗi mỗi tháng. **Burn rate** là tốc độ tiêu ngân sách so với tốc độ đều:

```
burn rate = (tỉ lệ lỗi quan sát) / (1 - SLO)

lỗi 0,1%  → burn 1   → hết ngân sách đúng cuối 30 ngày
lỗi 1%    → burn 10  → hết sau 3 ngày
lỗi 14,4% → burn 144 → hết sau 5 giờ  ⚠️ page ngay
```

Thay vì một ngưỡng cứng, dùng **nhiều cửa sổ, nhiều tốc độ**:

| Burn rate | Cửa sổ dài | Cửa sổ ngắn (xác nhận) | Tiêu hết ngân sách trong | Hành động |
|---|---|---|---|---|
| 14,4× | 1 giờ | 5 phút | ~2 ngày | **Page ngay** |
| 6× | 6 giờ | 30 phút | ~5 ngày | **Page** |
| 3× | 1 ngày | 2 giờ | ~10 ngày | Ticket |
| 1× | 3 ngày | 6 giờ | 30 ngày | Ticket |

```yaml
- alert: ErrorBudgetBurnFast
  expr: |
    (slo:error_ratio:rate1h{service="checkout"} > 14.4 * 0.001)
      and
    (slo:error_ratio:rate5m{service="checkout"} > 14.4 * 0.001)
  for: 2m
  labels: { severity: page }
```

Hai điều tinh tế làm nên sức mạnh: **cửa sổ dài quyết định "có nghiêm trọng không", cửa sổ ngắn quyết định "còn đang xảy ra không"** — điều kiện `and` khiến alert tự tắt nhanh khi sự cố đã hết thay vì kéo dài cả giờ vì cửa sổ dài còn nhớ. Và **sự cố càng nặng thì alert càng nhanh**: sập hoàn toàn được phát hiện trong vài phút, rò rỉ lỗi nhỏ chỉ tạo ticket. Một ngưỡng cố định duy nhất không bao giờ làm được điều đó.

Lợi ích văn hoá cũng đáng kể: alert phát biểu bằng ngôn ngữ **"chúng ta đang tiêu ngân sách đáng tin cậy nhanh gấp 14 lần mức cho phép"** — câu mà cả kỹ sư lẫn product đều hiểu, và nó tự nhiên dẫn tới quyết định "dừng ra tính năng, đi sửa độ ổn định".


## 12. Visualization

Câu trả lời đúng gần như luôn là **đừng tự xây**. Grafana giải quyết một lượng chi tiết khổng lồ mà nhìn từ xa không thấy: templating theo biến, annotation deploy trên biểu đồ, downsample phía client, dữ liệu thưa, so sánh cùng kỳ, phân quyền, chia sẻ. Xây lại là nhiều năm công sức để có thứ kém hơn.

Điều đáng nói ở mặt thiết kế là **dashboard là một khách hàng nặng và phải được đối xử như vậy**: mỗi panel là một truy vấn, một dashboard 30 panel với 5 biến template có thể bắn hàng trăm truy vấn mỗi lần refresh. Ba quy tắc: ép **max data points ≈ số pixel ngang** (~1.000 — vẽ 100.000 điểm lên 1.000 pixel là lãng phí 99% công sức, TSDB nên downsample phía server); refresh mặc định 1 phút chứ không phải 5 giây; và sinh tự động cho mọi service một dashboard **bốn tín hiệu vàng** — **Latency, Traffic, Errors, Saturation** — từ template chung, vì bốn biểu đồ này trả lời phần lớn câu hỏi mở đầu incident.


## 13. Bottleneck & failure mode

### 13.1 Cái gì nghẽn trước

| Thứ tự | Nút thắt | Triệu chứng | Xử lý |
|---|---|---|---|
| 1 | **Cardinality / bộ nhớ index** | TSDB OOM, query chậm dần rồi timeout | Trần cardinality ở ingest, drop label, alert `series_created_rate` |
| 2 | **Truy vấn chết người** | Một query kéo sập node, alert eval trễ theo | Giới hạn series/khoảng thời gian, timeout, hàng đợi ưu tiên |
| 3 | **Ghi vào TSDB** | Ingest lag tăng, WAL phình | Thêm shard, tăng batch, tách hot series |
| 4 | **Compaction/downsampling** | I/O bão hoà, ghi và đọc cùng chậm | Throttle, lệch giờ, node chuyên compaction |
| 5 | **Alert eval** | Rule chạy quá `eval_interval` → alert trễ | Recording rules, chia nhóm rule, chạy song song |
| 6 | **Collector** | Scrape timeout, `up` nhấp nháy | Thêm collector, giãn pha, tăng timeout |
| 7 | **Băng thông** | Hiếm khi là vấn đề ở quy mô này | — |

Đáng chú ý: **cardinality đứng đầu, băng thông đứng cuối** — ngược hoàn toàn với trực giác người mới. Trong hệ metrics, kẻ thù là *chiều rộng* (số series), không phải *chiều sâu* (số điểm mỗi series).

### 13.2 Từng component chết thì sao

| Component chết | Hậu quả tức thì | Giảm nhẹ |
|---|---|---|
| Một collector | Target của nó không được scrape → lỗ dữ liệu | Consistent hashing chia lại; ghi idempotent nên trùng lặp vô hại |
| Toàn bộ collector pool | Mù hoàn toàn phía thu thập | ASG đa AZ; agent push có buffer cục bộ |
| Service discovery | Không biết target mới; target cũ vẫn scrape được | Collector **cache danh sách trên đĩa** và tiếp tục dùng — quan trọng nhất |
| Kafka | Collector không ghi được | Đệm cục bộ theo giới hạn; quá hạn thì drop (chấp nhận được) |
| Một shard TSDB | Mất truy vấn phần series đó | RF3; query trả **kết quả một phần kèm cảnh báo** thay vì lỗi toàn bộ |
| Toàn bộ TSDB | Không query, không alert | Kafka giữ 24 h để replay; alert quan trọng nên có bản chạy trên hệ độc lập |
| Query service | Dashboard và alert eval đều chết | Stateless, nhiều bản sau LB; cache còn phục vụ kết quả cũ |
| Alert manager | Alert không được gửi — **nguy hiểm nhất** | Nhiều bản gossip đồng bộ trạng thái; alert store bền |
| Kênh thông báo (PagerDuty) | Alert kêu mà không ai biết | **Nhiều kênh độc lập**: PagerDuty + SMS nhà cung cấp khác + Slack |

### 13.3 Ai giám sát người giám sát — meta-monitoring

Nếu hệ monitoring chết, nó **không thể alert về cái chết của chính nó**. Bạn không mất khả năng quan sát một service — bạn mất khả năng biết rằng mình đã mất khả năng quan sát. Sự cố im lặng hoàn toàn.

Bốn lớp phòng vệ, từ rẻ tới đắt:

**① Dead man's switch (quan trọng nhất, gần như miễn phí).** Một alert **luôn luôn firing** (`expr: vector(1)`) được gửi đều đặn tới dịch vụ bên ngoài (Healthchecks.io, PagerDuty heartbeat, Lambda ở account khác). Dịch vụ đó alert khi **ngừng nhận** heartbeat. Logic bị đảo ngược: thay vì tin vào tín hiệu xuất hiện, ta tin vào tín hiệu biến mất. Đây là cách duy nhất phát hiện "toàn bộ pipeline alert đã chết trong im lặng", và nó kiểm tra **toàn tuyến**: scrape → TSDB → rule engine → alert manager → kênh gửi.

```yaml
- alert: DeadMansSwitch
  expr: vector(1)
  labels: { severity: heartbeat }
  # route tới webhook ngoài; hệ ngoài alert nếu 5 phút không nhận được
```

**② Monitoring của monitoring, chạy độc lập** — một Prometheus nhỏ ở account/region khác, hạ tầng khác, chỉ giám sát hệ chính (ingest rate, WAL size, rule eval duration, scrape failures, số series). Phải nhỏ và đơn giản đến mức gần như không thể hỏng.

**③ Giám sát chéo** — hai cụm monitoring ở hai region giám sát lẫn nhau; cẩn thận để chúng không chết vì cùng một nguyên nhân (cùng version, cùng cấu hình sai, cùng cert hết hạn).

**④ Synthetic/blackbox từ bên ngoài** — prober ngoài gọi vào API thật và vào cả API của hệ monitoring. Thứ duy nhất phát hiện được sự cố mà mọi metric nội bộ đều báo xanh: DNS hỏng, cert hết hạn, BGP sai, CDN lỗi cấu hình.

> 💡 **Nguyên tắc**: hệ giám sát hệ monitoring **phải đơn giản hơn và độc lập hơn** thứ nó giám sát. Nếu phức tạp tương đương, bạn vừa tạo lại đúng bài toán ở tầng trên — đệ quy vô hạn. Dừng ở tầng hai, và tầng hai phải là dead man's switch ra ngoài tổ chức.

| Meta-metric | Alert khi | Bắt được gì |
|---|---|---|
| `ingest_samples_per_second` | Giảm > 20% so với 1 giờ trước | Collector chết, mạng đứt, deploy hỏng |
| `active_series` / `series_created_rate` | Tăng đột biến | Cardinality explosion đang diễn ra |
| `rule_evaluation_duration` | Vượt `eval_interval` | Alert đang bị trễ, sắp bỏ sót |
| `rule_evaluation_failures` | Bất kỳ | Rule hỏng → alert đó vô hiệu trong im lặng |
| `notification_failures` | Bất kỳ | Alert kêu nhưng không gửi được |
| Độ trễ heartbeat (từ ngoài) | Không nhận sau 5 phút | Cả pipeline đã chết |


## Liên hệ sang AWS

| Thành phần thiết kế | Dịch vụ AWS | Vì sao hợp |
|---|---|---|
| Metric store (push, managed) | **CloudWatch Metrics** | Không phải vận hành gì; tự có metric của mọi service AWS; retention 15 tháng với rollup tự động (1 phút/15 ngày → 5 phút/63 ngày → 1 giờ/15 tháng) — đúng mô hình tầng ở §9.4 |
| Metric store (pull, Prometheus) | **Amazon Managed Service for Prometheus (AMP)** | Tương thích PromQL và remote-write; giữ được hệ sinh thái exporter/rule sẵn có; AWS lo shard, replication, compaction |
| Metrics collector | **ADOT Collector**, CloudWatch Agent | ADOT vừa scrape Prometheus vừa đẩy sang AMP/CloudWatch/X-Ray — một agent cho cả ba trụ |
| Service discovery | **EC2 tags, ECS/EKS API, AWS Cloud Map** | Dùng trực tiếp làm target list, tự cập nhật khi autoscale |
| Ghi metric từ code hiệu quả | **CloudWatch EMF** (Embedded Metric Format) | Ghi JSON có cấu trúc ra stdout, CloudWatch tự trích thành metric — **không cần PutMetricData đồng bộ**, không thêm latency, không bị throttle. Cách đúng cho Lambda |
| Metric từ log có sẵn | **CloudWatch Logs Metric Filter** | Khi không sửa được code (log bên thứ ba, access log). Đắt — xem cảnh báo bên dưới |
| Buffer / decouple | **Amazon MSK** hoặc **Kinesis Data Streams** | Vai trò Kafka ở §8; Kinesis rẻ và đơn giản hơn nếu chỉ cần buffer + vài consumer |
| Rollup / stream processing | **Managed Service for Apache Flink**, Lambda | Pre-aggregation, lọc metric rác, làm giàu label trước khi ghi |
| Tầng lạnh | **S3 / Glacier**, truy vấn bằng Athena | Rollup 1 giờ cả năm ~0,7 TB, rẻ hơn SSD 10–20×; Thanos/Mimir tự host cũng dùng S3 làm tầng lạnh |
| Query + dashboard | **Amazon Managed Grafana (AMG)** | Nối đồng thời CloudWatch, AMP, X-Ray, OpenSearch trong một dashboard; SSO qua IAM Identity Center |
| Alert rule engine | **CloudWatch Alarms**; **AMP ruler** | Alarm có `EvaluationPeriods` + `DatapointsToAlarm` — chính là `for` ở §11.2. AMP ruler chạy đúng cú pháp Prometheus alerting rules |
| Ức chế alert hệ quả | **CloudWatch Composite Alarm** | Kêu khi tổ hợp điều kiện con thoả (`ALARM(a) AND ALARM(b)`), có `ActionsSuppressor` — tương đương inhibition ở §11.3 |
| Routing thông báo | **SNS**, **EventBridge** | SNS fan-out chuẩn sang email/SMS/Lambda/HTTPS; EventBridge định tuyến theo pattern sang PagerDuty/Opsgenie/Slack |
| Alert store / trạng thái | **DynamoDB** | KV bền, low-latency cho trạng thái alert và lịch sử gửi (§11.1) |
| Tự động khắc phục | **SSM Automation / Lambda** từ Alarm action | Biến "page vì việc máy làm được" thành runbook tự chạy (§11.4) |
| Traces | **AWS X-Ray**, ADOT | Trụ thứ ba ở §1; đính `trace_id` làm exemplar để nhảy từ metric sang trace |
| Synthetic / dead man's switch | **CloudWatch Synthetics Canary**; Lambda + EventBridge Scheduler ở **account khác** | Kiểm tra từ ngoài vào (DNS/cert/CDN) và heartbeat phải nằm ngoài hệ chính (§13.3) |

### CloudWatch vs Prometheus tự host

| Tiêu chí | CloudWatch | Prometheus (tự host / AMP) |
|---|---|---|
| Mô hình thu thập | Push | Pull (remote-write cho push) |
| Vận hành | Không có gì để vận hành | Tự host: nặng. AMP: nhẹ như CloudWatch |
| Metric của dịch vụ AWS | **Có sẵn, phần lớn miễn phí** | Phải cài exporter, và exporter vẫn gọi CloudWatch API |
| Metric trong container/app | Cần agent hoặc EMF | **Điểm mạnh nhất** — hệ sinh thái exporter khổng lồ |
| Ngôn ngữ truy vấn | Metric Math, khá hạn chế | **PromQL — mạnh hơn nhiều** cho phân tích theo label |
| Mô hình chi phí | Theo **số metric** (mỗi tổ hợp dimension = 1 metric) + lần gọi API + số alarm | Theo **hạ tầng** (node, đĩa), hoặc theo sample ingest với AMP |
| Cardinality cao | **Rất đắt, có giới hạn cứng** (30 dimension/metric) | Đắt về RAM nhưng bạn kiểm soát được |
| Retention | 15 tháng, rollup tự động, không chỉnh được | Tự cấu hình hoàn toàn |
| Đa cloud / on-prem | Khó | Trung lập, chạy ở đâu cũng được |
| Alert | Alarm + Composite Alarm: đơn giản, đủ dùng | Alertmanager: mạnh hơn nhiều (inhibition, routing theo label, template) |
| Phù hợp nhất | Hạ tầng thuần AWS, đội nhỏ, metric hạ tầng là chính | Nhiều container, cần PromQL, cardinality cao, đa môi trường |

> ⚠️ **Bẫy chi phí lớn nhất trên CloudWatch**: **mỗi tổ hợp dimension duy nhất là một custom metric riêng và bị tính tiền riêng** (bậc đầu ~0,30 USD/metric/tháng). Thêm dimension `user_id` với 100.000 người dùng hoạt động không phải là "metric có nhiều nhãn hơn" — đó là **100.000 custom metric**, khoảng **30.000 USD/tháng** cho một dòng code. Đây chính là §4.2 nhưng có hoá đơn đi kèm, và nó khiến cardinality explosion bị phát hiện bởi phòng kế toán chứ không phải bởi trang alert. Luôn đặt **AWS Budgets alert riêng cho CloudWatch**, và review dimension trong code review như review một truy vấn database.

> ⚠️ **Bẫy thứ hai**: dùng Logs Metric Filter để đếm những thứ lẽ ra phải là metric — bạn trả tiền ingest (~0,50 USD/GB) cho toàn bộ nội dung log chỉ để trích ra một con số. Sửa được code thì dùng **EMF**.

> 💡 **Kiến trúc lai phổ biến nhất trong thực tế**: CloudWatch cho metric hạ tầng AWS + AMP cho metric ứng dụng/container + **AMG làm một cửa duy nhất** hiển thị cả hai + SNS/EventBridge định tuyến alert từ cả hai nguồn. Được cái tốt nhất của cả hai mà chỉ phải vận hành tầng dashboard.


## Cách trình bày khi phỏng vấn / review

1. **Cắt phạm vi ngay câu đầu — metrics, không phải logs, không phải traces.** Ba loại khác nhau về hình dạng, chi phí và access pattern nên là ba hệ khác nhau, nối bằng label chung và exemplar. Mất 60 giây, cho thấy ngay bạn đã làm observability thật.

2. **Chốt ba giả định nới lỏng trước khi vẽ**: mất metric lẻ tẻ chấp nhận được nhưng mất alert thì không; dữ liệu cũ được phép mất độ phân giải; cardinality bị chặn trần. Ba giả định này biện minh cho gần như mọi lựa chọn sau đó.

3. **Gắn mỗi con số estimation với một quyết định.** 1 triệu ghi/giây → loại RDBMS, phải shard. 2,4 PB nếu lưu thô → **downsampling không phải tối ưu mà là điều kiện tồn tại**. 16 TB sau nén và rollup → khả thi. Đừng đọc số suông; mỗi số phải kèm một câu "vì vậy...".

4. **Dành nhiều thời gian nhất cho cardinality** — chủ đề người vận hành production nhận ra ngay. Ba ý: cardinality là **tích** chứ không phải tổng; `user_id` làm nổ hệ; **churn** nguy hiểm hơn vì âm thầm. Rồi nêu cách thực thi bằng kỹ thuật (trần ở ingest, allowlist label, alert `series_created_rate`), không phải bằng lời khuyên.

5. **Trình bày pull vs push theo chiều, không theo phe.** Pull cho `up == 0` miễn phí; push cho job ngắn, serverless, mạng không thông chiều vào; tổ chức lớn làm cả hai. Prometheus chọn pull còn CloudWatch chọn push vì **mô hình mạng và mô hình sở hữu khác nhau**, không phải vì cái nào tốt hơn.

6. **Với Kafka, chủ động đặt câu hỏi ngược**: "đặt Kafka **nếu** cần fan-out hoặc replay; nếu chỉ chống TSDB restart thì WAL cục bộ ở collector rẻ hơn nhiều". Chủ động loại bỏ một component gây ấn tượng tốt hơn vẽ thêm một component.

7. **Về storage, ba điều là đủ sâu**: LSM thay B-tree, column store tách series key khỏi dữ liệu, và **delta-of-delta + XOR cho ~1,37 byte/điểm (Gorilla)**. Thêm một ý vận hành ít người nói: hết hạn dữ liệu là **xoá nguyên file block**, không phải `DELETE` hàng tỷ hàng.

8. **Bảo vệ tầng query như một quyết định có chủ đích**: dashboard không bắn thẳng vào TSDB vì cần rate limit, cache và **ưu tiên alert query hơn dashboard query** — alert eval mới là read load thường trực lớn nhất, không phải con người.

9. **Ở phần alert, chuyển từ kỹ thuật sang con người.** `for: 5m` chống flapping với giá ~6 phút độ trễ. Bốn cơ chế dedupe/group/inhibit/silence giải quyết bốn vấn đề khác nhau. Chốt bằng **symptom chứ không phải cause**, kèm lý do mạnh nhất: nguyên nhân thì vô hạn, triệu chứng thì hữu hạn.

10. **Nếu còn thời gian, đưa error budget burn rate vào** — cửa sổ dài quyết định mức nghiêm trọng, cửa sổ ngắn quyết định sự cố còn đang diễn ra. Nó giải quyết triệt để mâu thuẫn "nhanh ↔ ít nhiễu" mà `for` chỉ vá tạm.

11. **Kết bằng meta-monitoring**: "nếu hệ monitoring chết, nó không thể alert về cái chết của chính nó" → **dead man's switch** gửi ra ngoài, hệ ngoài kêu khi ngừng nhận. Nhấn mạnh tầng giám sát phải **đơn giản hơn** thứ nó giám sát, nếu không thì đệ quy vô hạn.

12. **Đừng quên nói "đừng tự xây"** — Grafana, Alertmanager, AMP/CloudWatch. Phần đáng tự xây nhất chỉ là **query service** và **chính sách cardinality**. Biết chỗ nào *không* xây là tín hiệu trưởng thành mạnh không kém biết xây thế nào. Với câu hỏi AWS thì đi thẳng vào tiền: CloudWatch tính tiền **theo từng tổ hợp dimension**, nên cardinality explosion hiện ra dưới dạng hoá đơn; EMF là cách đúng để phát metric từ Lambda.
