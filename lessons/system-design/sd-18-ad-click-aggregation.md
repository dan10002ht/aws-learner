# Case study: Ad Click Event Aggregation

> Đây là case study đầu tiên trong course mà **kết quả tính toán của bạn chính là hoá đơn gửi cho khách hàng**. Các bài trước — news feed, autocomplete, crawler — sai một chút thì trải nghiệm hơi xấu. Bài này sai một chút thì một nhà quảng cáo bị tính thừa vài trăm nghìn đô. Sự khác biệt đó thay đổi *toàn bộ* cách thiết kế: nó biến những thứ bình thường là "nice to have" (exactly-once, reconciliation, watermark, replay) thành **bắt buộc**, và biến những thứ bình thường là "best practice" (xấp xỉ bằng sketch, at-least-once cho rẻ) thành **cấm dùng** ở một số chỗ.

Ad Click Event Aggregation là bài kinh điển để kiểm tra xem bạn hiểu **stream processing** thật hay chỉ biết tên Kafka và Flink. Nó đụng đủ: unbounded stream, cửa sổ thời gian, event time vs processing time, late event, delivery semantics, hot partition, top-N phân tán, kiến trúc lambda. Phần khó **không** nằm ở throughput (10K–50K QPS là con số khiêm tốn so với các bài trước), mà ở **tính đúng đắn dưới sự cố** — câu hỏi "khi một node chết giữa chừng, số tiền tôi tính ra có còn đúng không?".

---

## Bối cảnh: RTB và vì sao "gần đúng" không chấp nhận được

Khi bạn mở một trang có chỗ đặt quảng cáo, chuỗi sự kiện sau xảy ra trong **dưới 100 ms**:

```
User mở trang
   │
   ▼
Publisher  ──── "tôi có 1 slot, user ở US, đang đọc bài về ô tô"
   │
   ▼
Ad Exchange  ──── bid request tới hàng chục DSP
   │                 ├── DSP A: $1.20
   │                 ├── DSP B: $0.90
   │                 └── DSP C: $2.05   ← thắng
   ▼
Render creative của DSP C  (impression)
   │
   ▼
User CLICK ──────▶ [ Ad Click Event ] ← hệ thống ta thiết kế bắt đầu từ đây
```

Cuộc đấu giá đó là **real-time bidding (RTB)** — mỗi lần hiển thị là một phiên đấu giá riêng, phải xong dưới một giây vì user đang chờ trang load.

> ⚠️ **Đừng nhầm hai hệ thống**. RTB (chọn quảng cáo nào để hiện) cần latency < 1 s, là hệ thống *online*. Ad click aggregation (đếm click đã xảy ra) cần latency **vài phút**, là hệ thống *near real-time*. Nhiều ứng viên nghe "RTB" rồi nhảy vào thiết kế hệ thống mili-giây — sai đề. Cái RTB cần từ ta không phải tốc độ, mà là **dữ liệu tổng hợp chính xác của quá khứ gần** để feed vào mô hình bidding.

Con số click được dùng cho ba việc, xếp theo độ nhạy cảm:

| Mục đích | Ai đọc | Hậu quả nếu sai 1% |
|---|---|---|
| **Billing** — tính tiền theo CPC | Kế toán, advertiser | 1 tỉ click × $0.5 = $500M/ngày ⇒ **1% = $5 triệu/ngày**. Kiện tụng, audit |
| **Bidding model** — dự đoán CTR cho RTB | Hệ thống tự động | Bid sai giá, đốt ngân sách. Sai lệch *có hệ thống* nguy hiểm hơn nhiễu ngẫu nhiên |
| **Dashboard/reporting** | Con người | Quyết định sai, mất niềm tin ("số của các anh không khớp số của tôi") |

So với analytics thông thường (đếm page view, DAU) thì khác hẳn: ở đó at-least-once và xấp xỉ hoàn toàn ổn — DAU hiển thị 10.3 triệu thay vì 10.28 triệu thì không ai chết, người ta còn chủ động dùng HyperLogLog sai số 2% để tiết kiệm bộ nhớ. Ở đây thì không. Và điều tệ nhất: **sai lệch thường không ngẫu nhiên mà có hệ thống** — một node retry sau crash sẽ nhân đôi đúng một khoảng offset, tạo cục sai lệch tập trung vào vài `ad_id`, chứ không rải đều để triệt tiêu nhau.

> 💡 **Nguyên tắc định hướng cả bài**: mỗi lần đứng trước lựa chọn "nhanh/rẻ nhưng xấp xỉ" vs "chậm/đắt nhưng chính xác", hãy hỏi *"con số này có đi vào hoá đơn không?"*. Có → chính xác. Không (ví dụ bảng xếp hạng top-100 để tham khảo) → được xấp xỉ, và phải nói rõ là đang xấp xỉ.

---

## Bước 1 — Làm rõ yêu cầu

"Aggregation" là từ quá rộng, nên hỏi làm rõ ở bài này quan trọng hơn bình thường.

**Input?** Mỗi event là một dòng log: `ad_id`, `click_timestamp`, `user_id`, `ip`, `country` — khoảng 0.1 KB.
**Quy mô?** 1 tỉ click/ngày, 2 triệu ad đang chạy, tăng ~30%/năm.
**Latency?** E2E vài phút. Không cần sub-second — đây là dữ liệu billing và reporting, không nằm trên đường nóng RTB.
**Edge case?** Event đến trễ; event trùng; một phần hệ thống chết; logic tổng hợp có bug và phải tính lại.

### Functional requirements

- Tổng hợp số click của một `ad_id` trong **Y phút gần nhất**.
- Trả về **top N ad được click nhiều nhất trong M phút**, tính lại **mỗi phút** (N và M configurable).
- **Lọc theo dimension** (`ip`, `user_id`, `country`) cho cả hai truy vấn trên.
- **Tính lại (recalculation/backfill)** kết quả từ dữ liệu thô khi phát hiện sai.

### Non-functional requirements

- **Correctness là ưu tiên số một** — kết quả dùng cho billing ⇒ cần **exactly-once** ở tầng aggregation.
- Xử lý đúng **event đến trễ** và **event trùng**.
- **Robustness**: một node chết không được làm mất hoặc nhân đôi dữ liệu.
- **Latency e2e ≤ vài phút.**
- **Replayability**: logic sai thì chạy lại được từ dữ liệu gốc, không cần ai gửi lại gì.
- **Availability tầng ingest rất cao** — click mất là mất vĩnh viễn, không ai gửi lại click cho bạn.

### Giả định chốt

| Giả định | Giá trị | Vì sao |
|---|---|---|
| Click/ngày | 1 tỉ | Đề bài (1 tỉ DAU × 1 click/ngày) |
| Kích thước event | 0.1 KB | Vài field ngắn + timestamp |
| Số ad đang chạy | 2 triệu | Quyết định kích thước state trong bộ nhớ |
| Cửa sổ cơ sở | **1 phút** | Mọi truy vấn là bội số của phút ⇒ phút là đơn vị lưu trữ tự nhiên |
| Giữ raw | 1–3 năm (cold storage) | Audit/pháp lý + backfill |
| Độ trễ "hợp lý" tối đa | vài giây → vài phút | Quyết định độ dài watermark |
| Nguồn timestamp | do **server ingest** gắn | Không tin client |

> ⚠️ **Bẫy**: nhiều người nhận `click_timestamp` từ client rồi dùng luôn làm event time. Đồng hồ điện thoại lệch vài phút là chuyện thường, và attacker có thể gắn timestamp tuỳ ý để phá cửa sổ tổng hợp. Chuẩn thực tế: **gắn timestamp ở edge/log server** — điểm đầu tiên dưới quyền kiểm soát của mình — và coi đó là event time. Timestamp client vẫn giữ như một field để phát hiện bất thường.

---

## Bước 2 — Back-of-the-envelope estimation

Ước lượng ở đây không nhằm chứng minh "hệ thống to", mà chứng minh điều ngược lại: **throughput nhỏ, cái khó nằm chỗ khác**. Đó là một kết luận đáng giá.

```
Số liệu gốc:
  Click/ngày = 10^9      1 ngày ≈ 10^5 s      1 event = 0.1 KB      2×10^6 ad

QPS:
  Trung bình = 10^9 / 10^5 = 10,000 clicks/s
  Đỉnh (×5)  = 50,000 clicks/s
    (×5 vì traffic quảng cáo dồn vào giờ vàng theo múi giờ; ×2 là quá lạc quan)

Băng thông ingest:
  Trung bình = 1 MB/s     Đỉnh = 5 MB/s     → nhỏ đến bất ngờ

Storage raw:
  100 GB/ngày → ~3 TB/tháng → ~36 TB/năm (chưa nén)
  Parquet + nén còn ~1/5 → ~7 TB/năm; giữ 3 năm ≈ 20 TB nén

Storage aggregated:
  Bản ghi (ad_id, minute, filter_id, count) ≈ 40 B ; 1,440 phút/ngày
  Nếu MỌI ad có click mỗi phút: 2M × 1,440 × 40 B = 115 GB/ngày (chỉ chiều gốc)
  Thực tế ~5–10% ad có click trong một phút → ~6–12 GB/ngày
  Mỗi filter dimension nhân thêm: +country (×3–5), tổ hợp khác (×2–3)
  → ~50–100 GB/ngày. Nhỏ hơn raw 1 bậc, query nhanh hơn NHIỀU bậc.

State in-memory của aggregation:
  1 cửa sổ 1 phút: 2M ad × ~45 B ≈ 90 MB toàn cục
  Giữ vài cửa sổ (watermark + sliding M=5 phút) ≈ 0.5 GB
  Chia 20 partition → ~25 MB/node → vừa RAM thoải mái
  ⇒ KHÔNG cần external state store cho cửa sổ ngắn
```

| Con số | Kết luận thiết kế |
|---|---|
| 50K QPS đỉnh, 5 MB/s | Ingest **không phải** vấn đề — đừng tốn thời gian tối ưu throughput |
| 100 GB raw/ngày, ~100 TB/3 năm | Raw phải nằm ở **object storage rẻ** (S3 + Parquet), không phải DB nóng |
| Aggregated nhỏ hơn raw 1 bậc, query nhanh hơn 3 bậc | **Pre-aggregate là bắt buộc** |
| State/cửa sổ vài chục MB/node | Aggregation **in-memory + checkpoint** khả thi, không cần Redis |
| Tăng 30%/năm ⇒ ×2.2 sau 3 năm | Không cần dự phòng quá mức |
| Mỗi dimension nhân bản ghi | **Không thể pre-aggregate mọi tổ hợp filter** (xem star schema) |

> 💡 **Nguyên tắc**: khi ước lượng ra con số *nhỏ*, đó cũng là phát hiện quan trọng. Nó cho phép bạn nói: *"Throughput không phải bottleneck; bottleneck là tính đúng đắn khi có sự cố, nên tôi sẽ dành phần lớn thời gian cho delivery semantics."* Câu đó định khung cả buổi phỏng vấn theo hướng có lợi cho bạn.

---

## Bước 3 — API design

Client không phải end-user mà là **dashboard** (advertiser, analyst) và **hệ thống billing**. Hai endpoint là đủ.

```
GET /v1/ads/{ad_id}/aggregated_count
      ?from=202601140900   &to=202601140905   &filter=0012
  200 -> { "ad_id":"ad001", "count":41230, "filter":"0012",
           "watermark_complete": true }        ← quan trọng

GET /v1/ads/popular_ads
      ?count=100   &window=5   &filter=0012
  200 -> { "window_end":"202601140905",
           "ads":[{"ad_id":"ad732","count":98211}, ...],
           "approximate": false }              ← quan trọng
```

Hai field metadata thể hiện bạn hiểu bản chất bài toán:

- **`watermark_complete`** — cửa sổ này đã "đóng" chưa, tức đã hết thời gian chờ event đến trễ chưa. `false` nghĩa là con số còn có thể tăng. **Billing chỉ được đọc khi `true`**; dashboard đọc thoải mái nhưng nên hiển thị nhãn "đang cập nhật".
- **`approximate`** — kết quả có dùng cấu trúc xấp xỉ không. API nào trả số có thể xấp xỉ đều phải **tự khai báo**, không để người dùng tự đoán.

> ⚠️ **Bẫy**: trả về con số trần trụi không kèm metadata về độ hoàn chỉnh. Sau đó team billing gọi API lúc 00:00:30 cho cửa sổ 23:59, lấy con số chưa đủ late event, xuất hoá đơn thiếu. Lỗi này đã xảy ra thật ở nhiều công ty. **Làm cho tính không-hoàn-chỉnh hiển nhiên ngay trong contract.**

---

## Bước 4 — Data model và vì sao không query thẳng raw

### Dữ liệu thô

| ad_id | click_timestamp | user_id | ip | country |
|---|---|---|---|---|
| ad001 | 2026-01-14 09:00:01 | user_1 | 207.148.22.22 | US |
| ad001 | 2026-01-14 09:00:02 | user_1 | 207.148.22.22 | US |
| ad002 | 2026-01-14 09:00:02 | user_2 | 209.153.56.11 | GB |

### Vì sao không `SELECT COUNT(*) ... GROUP BY` trên raw

Đây là câu hỏi đầu tiên khi bạn vẽ thêm tầng aggregation. Phải trả lời bằng con số:

```
Truy vấn "top 100 ad trong 5 phút gần nhất":
  5 phút traffic = 10,000 QPS × 300 s  =  3,000,000 dòng  (giờ thường)
                 = 50,000 QPS × 300 s  = 15,000,000 dòng  (giờ đỉnh)
  Phải quét 300 MB – 1.5 GB, GROUP BY ad_id (shuffle), ORDER BY LIMIT 100
  ⇒ vài giây đến vài chục giây. Hàng trăm ms là không tưởng.

Nhân lên: dashboard refresh mỗi 30 s × 10,000 advertiser + alerting job
  ⇒ hàng nghìn truy vấn quét-toàn-bảng đồng thời trên bảng đang nhận 50K writes/s
```

Ba lý do độc lập khiến cách này hỏng:

1. **Chi phí lặp lại vô ích.** Mười nghìn người hỏi "top 100 phút vừa rồi" thì câu trả lời **giống hệt nhau**. Tính một lần, phục vụ mười nghìn lần — đó chính là định nghĩa của pre-aggregation.
2. **Read giành tài nguyên với write.** Bảng raw đang chịu 50K writes/s; thêm quét toàn bảng vào cùng cluster là công thức để cuối cùng **mất dữ liệu ingest** — mà click mất là mất vĩnh viễn.
3. **Chi phí tỉ lệ với độ dài cửa sổ.** Query "24 giờ gần nhất" phải quét 1 tỉ dòng, trong khi người dùng mong thời gian phản hồi như nhau.

**Lối thoát**: chuyển chi phí từ **lúc đọc** sang **lúc ghi**. Ghi xảy ra một lần cho mỗi event; đọc xảy ra hàng nghìn lần.

| ad_id | click_minute | filter_id | count |
|---|---|---|---|
| ad001 | 202601140900 | 0000 | 2 |
| ad001 | 202601140901 | 0000 | 1 |
| ad002 | 202601140900 | 0000 | 1 |

```
Chi phí một truy vấn "đếm click ad X trong 5 phút":
  Trên raw        : quét 3–15 triệu dòng, GROUP BY  → vài giây
  Trên aggregated : đọc 5 dòng theo key            → < 10 ms   (~nhanh hơn 3 bậc)
```

### Lọc theo dimension: star schema

Yêu cầu "lọc theo ip / user_id / country" nếu làm ngây thơ sẽ buộc ta quay lại raw. Cách tránh: **định nghĩa trước các bộ lọc và tổng hợp sẵn theo chúng**.

| filter_id | country | ip | user_id |
|---|---|---|---|
| 0000 | * | * | * |
| 0012 | US | * | * |
| 0013 | * | 123.1.2.3 | * |

Kỹ thuật này là **star schema** trong data warehouse; các trường lọc gọi là **dimension**.

| | Ưu | Nhược |
|---|---|---|
| **Pre-aggregate theo dimension** | Query cực nhanh, dùng lại pipeline sẵn có | Số bản ghi nhân theo **tích** các dimension; chỉ trả lời được filter **đã định nghĩa trước** |
| **Query ad-hoc trên raw** | Lọc tuỳ ý | Chậm (giây–phút), đắt, không dùng cho dashboard realtime |

**Dung hoà thực tế**: pre-aggregate các dimension **lực lượng thấp** (`country` ~200 giá trị, `device_type`, `campaign_id`). Dimension **lực lượng cao** như `ip` và `user_id` (hàng tỉ) thì **không bao giờ pre-aggregate toàn bộ** — sẽ nổ tung số bản ghi; phục vụ bằng ad-hoc query trên raw (S3 + Athena), chấp nhận vài chục giây, và nói rõ đó là "báo cáo", không phải "dashboard realtime".

> 💡 **Nguyên tắc**: đừng hứa "lọc theo bất kỳ chiều nào, realtime". Chia rõ hai hạng dịch vụ: **dimension đã pre-aggregate → realtime < 10 ms**; **dimension tuỳ ý → ad-hoc vài chục giây**. Nêu ranh giới này ra trước là dấu hiệu của người đã làm thật.

### Giữ raw hay chỉ giữ aggregated?

Giữ **cả hai**, với vai trò khác nhau: aggregated nằm trong DB nóng phục vụ query; raw nằm trong **cold storage rẻ** (S3, Parquet, nén, lifecycle sang Glacier sau 90 ngày) và tồn tại vì đúng ba lý do — **debug, backfill, audit**. Không ai query raw trong ngày làm việc bình thường; nó là bảo hiểm. Trong hệ thống dính tới tiền, bảo hiểm đó là bắt buộc.

---

## Bước 5 — High-level design

### Cách ngây thơ và vì sao nó hỏng

```
  [Log server] ──sync──▶ [Aggregation service] ──sync──▶ [Database]
```

- **Ghép cứng nhịp độ**: DB chậm hoặc aggregation chết → log server bị chặn → **click mất ngay tại nguồn** = mất tiền vĩnh viễn.
- **Không có chỗ để retry hay replay** khi logic sai.
- **Không hấp thụ được đỉnh** (gấp 5 lần trung bình) — phải provision cho mức đỉnh 24/7.

Sửa bằng **message queue** ở giữa: tách nhịp producer/consumer, làm bộ đệm chịu đỉnh, và quan trọng nhất — **giữ lại log để replay**.

### Kiến trúc đề xuất

```
  Ad server / Edge log collector   (gắn event timestamp tại đây)
        │
        ▼
  ┌─────────────────────────┐
  │  TOPIC 1: raw clicks    │ ─── tee ───▶ ┌──────────────────────┐
  │  (Kafka, key = ad_id)   │              │ Cold storage         │
  │  retention 7 ngày       │              │ S3 / Parquet (raw)   │
  └───────────┬─────────────┘              └──────────┬───────────┘
              │                                       │
              ▼                                       │
  ┌───────────────────────────────────────────┐       │
  │  AGGREGATION SERVICE (Flink / Spark)      │       │
  │   map → sanitize, ip→country, gán key     │       │
  │   agg → tumbling 1 phút, count theo ad_id │       │
  │   agg → sliding M phút, local top-N heap  │       │
  │   state in-memory + checkpoint định kỳ    │       │
  └───────────┬───────────────────────────────┘       │
              │ transactional producer                │
              ▼                                       │
  ┌─────────────────────────┐                         │
  │  TOPIC 2: aggregated    │ (ad_id, minute, count)  │
  └───────────┬─────────────┘ (minute, top_n_ads[])   │
              ▼                                       │
  ┌─────────────────────────┐   ┌──────────────────┐  │
  │ DB writer (idempotent   │──▶│ AGGREGATION DB   │  │
  │ upsert)                 │   │ Cassandra/Dynamo │  │
  └─────────────────────────┘   └────────┬─────────┘  │
                                         ▼            │
                            ┌───────────────────────┐ │
                            │ Query svc → Dashboard │ │
                            │             Billing   │ │
                            └───────────┬───────────┘ │
                                        │             │
  ── nhánh đối chiếu (cuối ngày) ───────┴─────────────┘
     Batch job đếm lại từ raw ──▶ so sánh với Aggregation DB ──▶ báo lệch
```

### Vì sao cần **hai** Kafka topic, chứ không ghi thẳng DB?

Đây là chi tiết tinh tế nhất và hay bị hỏi nhất. Nếu chỉ có một topic, aggregation service phải làm **hai việc không nguyên tử**: (a) ghi kết quả vào DB, (b) commit offset về Kafka. Hai hệ thống khác nhau ⇒ luôn có khe hở:

```
Kịch bản A — ghi DB trước, commit offset sau:
   ghi DB ✓ ... CRASH trước khi commit offset ...
   node mới đọc lại từ offset cũ → ghi DB LẦN HAI   ⇒ ĐẾM DƯ (tính thừa tiền)

Kịch bản B — commit offset trước, ghi DB sau:
   commit offset ✓ ... CRASH trước khi ghi DB ...
   node mới đọc từ offset mới → khoảng đó KHÔNG BAO GIỜ được ghi
                                                    ⇒ ĐẾM THIẾU (mất doanh thu)
```

Không thứ tự nào đúng. Vấn đề không phải chọn sai thứ tự — mà là **hai hệ thống không đồng thuận được**.

Topic thứ hai kéo cả hai thao tác về **cùng một hệ thống là Kafka**, nơi có **transaction**:

```
Trong MỘT transaction của Kafka:
   ├─ produce (ad001, 09:01, count=4230) vào TOPIC 2
   └─ commit offset 15000 của TOPIC 1
   → commit

Crash TRƯỚC commit → abort; consumer đọc lại từ offset 15000; message nửa vời
                     không bao giờ hiển thị (read_committed bỏ qua)
Crash SAU  commit → cả hai đã bền vững, không lặp
```

Hai lợi ích nữa, không kém quan trọng:

- **Tách nhịp giữa tính toán và lưu trữ.** Aggregation DB chậm/sự cố/bảo trì thì kết quả vẫn nằm an toàn trong topic-2 và được ghi lại khi DB sống dậy — aggregation service không bị chặn, không dồn lag.
- **Nhiều consumer độc lập cho cùng kết quả**: DB writer, alerting (phát hiện ad tăng vọt), hệ thống bidding, data warehouse. Ghi thẳng DB thì mỗi consumer mới phải đi hỏi DB; có topic-2 thì chỉ cần thêm consumer group.

> 💡 **Nguyên tắc**: khi phải "làm hai việc ở hai hệ thống một cách nguyên tử", chỉ có hai lối thoát — **gom về một hệ thống có transaction**, hoặc **làm việc thứ hai idempotent**. Bài này dùng cả hai.

### Bên trong aggregation service: DAG kiểu MapReduce

```
      TOPIC 1 (raw)   partition theo hash(ad_id)
   ┌──────┬──────┬──────┐
   │ p0   │ p1   │ p2   │
   └──┬───┴──┬───┴──┬───┘
      ▼      ▼      ▼
   [ MAP ][ MAP ][ MAP ]   sanitize, ip→country, drop event hỏng,
      │      │      │      gán key = (ad_id, filter_id)
      ▼      ▼      ▼
   [ AGG ][ AGG ][ AGG ]   HashMap<key,count> cho cửa sổ hiện tại
      └──────┼──────┘      + heap cục bộ cho top-N
             ▼
        [ REDUCE ]         gộp kết quả cục bộ → merge heap → top-N toàn cục
             ▼
        TOPIC 2 (aggregated)
```

*Nếu Kafka đã partition theo `ad_id` rồi, sao còn cần tầng MAP?* Ba lý do:

1. **Ta không kiểm soát producer.** Ad server có thể do team khác vận hành, partition theo region chẳng hạn, nên event cùng `ad_id` nằm rải nhiều partition. MAP re-key lại cho đúng.
2. **Phải làm sạch và làm giàu trước khi đếm**: `ip → country` (GeoIP), chuẩn hoá `USA`/`US`/`us` → `US`, loại event thiếu field. Nhét logic này vào node đếm sẽ làm nó nặng và khó test.
3. **Một event sinh ra nhiều key.** Một click ở US phải cộng vào cả `filter_id=0000` lẫn `0012` — phép fan-out tự nhiên thuộc về tầng map.

---

## Deep dive 1 — Thời gian: event time, window, watermark

Đây là phần khó nhất về khái niệm, và là nơi phân biệt người đã làm stream processing thật.

### Hai loại thời gian

- **Event time** — thời điểm click *thực sự xảy ra*.
- **Processing time** — thời điểm hệ thống *xử lý* event đó.

Chúng luôn lệch: mạng di động chập chờn, buffer ở client, hàng đợi ở collector, Kafka lag, GC pause, restart sau deploy. Lệch bình thường vài trăm ms; lệch bất thường (một region mất kết nối 10 phút rồi flush) là vài phút đến vài giờ.

| | Ưu | Nhược |
|---|---|---|
| **Event time** | **Đúng về ngữ nghĩa** — click lúc 9:00 luôn được tính vào phút 9:00, bất kể đến muộn bao lâu. Chạy lại cho kết quả y hệt (deterministic) | Phải xử lý event muộn; phải chờ; timestamp client có thể sai/giả mạo |
| **Processing time** | Đơn giản, không cần chờ, latency thấp nhất | **Sai**. Một đợt retry dồn hàng triệu click cũ vào phút hiện tại, tạo đỉnh giả. Chạy lại cho kết quả khác nhau |

**Vì kết quả đi vào hoá đơn, ta chọn event time**, lấy từ **timestamp do log collector ở edge gắn**. Ví dụ cho thấy processing time sai đến mức nào:

```
09:00–09:05  một DC ở EU mất kết nối tới Kafka.
             5 phút × ~2,000 clicks/s = 600,000 click bị buffer.
09:05        hồi phục, toàn bộ flush trong 20 giây.

PROCESSING TIME:  phút 09:00–09:04 count ≈ 0        ← "không ai click"
                  phút 09:05       count ≈ 630,000  ← alerting nổ, bidding hoảng
                  ⇒ hoá đơn theo giờ sai, biểu đồ vô nghĩa

EVENT TIME:       600,000 event mang nhãn 09:00–09:04, cộng đúng vào các phút đó
                  ⇒ biểu đồ đúng; hệ quả duy nhất: các phút đó chốt muộn 5 phút
```

### Các loại cửa sổ

```
Tumbling (cố định, không chồng lấn):
  |--- 9:00 ---|--- 9:01 ---|--- 9:02 ---|     mỗi event thuộc ĐÚNG MỘT cửa sổ

Hopping/Sliding (cửa sổ dài hơn bước nhảy):
  |------ 5 phút ------|
       |------ 5 phút ------|      bước 1 phút → một event thuộc NHIỀU cửa sổ
            |------ 5 phút ------|

Session (gom burst, ngắt khi im lặng đủ lâu) — dùng cho phân tích hành vi,
  không dùng ở bài này.
```

| Yêu cầu | Loại cửa sổ | Vì sao |
|---|---|---|
| Đếm click theo phút (nền tảng billing) | **Tumbling 1 phút** | Mỗi click phải được tính **đúng một lần**; cửa sổ chồng lấn sẽ đếm trùng → sai tiền. Lưu trữ cũng gọn: một hàng cho một (ad, phút) |
| Top N trong M phút, cập nhật mỗi phút | **Hopping: cửa sổ M phút, bước 1 phút** | Bản chất là chồng lấn. Và vì đây là bảng xếp hạng chứ không phải hoá đơn, một click góp mặt ở nhiều cửa sổ là **đúng ý**, không phải lỗi |

Điểm hay: cửa sổ M phút **không cần đọc lại event thô** — chỉ cộng M kết quả tumbling 1 phút đã có. Tumbling 1 phút là "đơn vị tiền tệ" của toàn hệ thống.

> 💡 **Nguyên tắc**: chọn **granularity nhỏ nhất người dùng thực sự cần** (ở đây 1 phút) làm đơn vị lưu trữ, rồi dựng mọi cửa sổ lớn hơn bằng phép cộng. Nếu lưu trực tiếp cửa sổ 5 phút, ai hỏi 3 phút thì bạn chịu chết.

### Watermark — khi nào thì đóng sổ

Với event time xuất hiện câu hỏi không có lời giải hoàn hảo: *chờ bao lâu trước khi tuyên bố "phút 9:00 đã xong"?* Chờ mãi thì không bao giờ ra kết quả; không chờ thì mất event muộn.

**Watermark** là một mốc thời gian trôi theo dòng dữ liệu, nghĩa là *"tôi tin mọi event có event time ≤ W đều đã tới"*. Khi watermark vượt điểm cuối một cửa sổ, cửa sổ đó **đóng (fire)** và phát kết quả. Công thức phổ biến (bounded out-of-orderness):

```
watermark = (event time lớn nhất từng thấy) − (độ trễ cho phép, vd 30 s)
```

Ví dụ chi tiết — tumbling 1 phút, độ trễ cho phép 30 s:

```
Trục event time: 9:00:00 ──── W1 ──── 9:01:00 ──── W2 ──── 9:02:00

t=1  event(9:00:10)  max=9:00:10  watermark=8:59:40  W1 mở, count=1
t=2  event(9:00:45)  max=9:00:45  watermark=9:00:15  W1 mở, count=2
t=3  event(9:00:20)  max=9:00:45  watermark=9:00:15  ← ĐẾN LỆCH THỨ TỰ
                       nhưng vẫn thuộc W1 và W1 CHƯA ĐÓNG → được tính. count=3
t=4  event(9:01:10)  max=9:01:10  watermark=9:00:40  W1 vẫn mở (chưa vượt
                       9:01:00). W2 mở, count=1
t=5  event(9:01:35)  max=9:01:35  watermark=9:01:05  ← VƯỢT 9:01:00
                       ⇒ W1 ĐÓNG, phát ra count=3
t=6  event(9:00:50)  max=9:01:35  watermark=9:01:05  ← LATE EVENT! W1 đóng rồi
```

Bước t=3 minh hoạ chính xác giá trị của watermark: event **lệch thứ tự nhưng chưa muộn** vẫn được tính đúng. Watermark 30 giây tức là ta trả giá 30 giây độ trễ để hấp thụ mọi lệch thứ tự trong phạm vi đó.

| Độ dài watermark | Latency | Tỉ lệ late | Phù hợp |
|---|---|---|---|
| 0 s | Thấp nhất | Cao — mọi lệch thứ tự thành late | Không bao giờ, với dữ liệu tính tiền |
| **30 s** | +30 s | ~0.1% | **Cân bằng điển hình cho pipeline billing** |
| 5 phút | +5 phút | Cực thấp | Khi client chủ yếu là mobile ở vùng sóng yếu |
| 1 giờ | Không dùng được cho dashboard | ~0 | Không đáng — dùng batch reconciliation thay thế |

> 💡 **Nguyên tắc**: watermark không loại bỏ event muộn, nó **mua** tỉ lệ muộn thấp hơn bằng **độ trễ**. Đuôi phân phối luôn dài vô tận. Đừng cố kéo dài để đạt 100% — chi phí latency tăng tuyến tính còn lợi ích giảm theo hàm mũ. Đặt 30 s – 2 phút rồi **để nhánh batch cuối ngày dọn nốt phần đuôi**.

### Xử lý event đến muộn

```
Mức muộn                    Xử lý                          Vì sao
─────────────────────────────────────────────────────────────────────────────
≤ watermark (30 s)          Tính bình thường               Cửa sổ còn mở

30 s → allowed lateness     Mở lại cửa sổ, phát bản cập    Sink idempotent upsert
(vd 10 phút)                nhật = COUNT MỚI (không phải   nên ghi đè an toàn.
                            delta) → upsert đè             Dashboard tự sửa số.

> allowed lateness          Đẩy vào "late side output"     Số lượng cực nhỏ.
                            (topic/bảng riêng), KHÔNG vứt  Batch cuối ngày xử lý,
                                                           giữ để audit.
```

Ba điểm phải nhấn:

1. **Không bao giờ vứt event muộn im lặng.** Side output vừa cho phép sửa sau, vừa cung cấp metric "tỉ lệ late" cực giá trị. Hệ thống lặng lẽ drop dữ liệu tính tiền là hệ thống sẽ có sự cố không giải thích được.
2. **Bản cập nhật phải là giá trị tuyệt đối, không phải delta.** Phát "count của (ad001, 9:00) giờ là 3" chứ không phải "+1" — nếu bản cập nhật bị retry, giá trị tuyệt đối vẫn đúng, còn delta thì cộng dồn sai. Đây là **idempotency ở tầng thiết kế message**.
3. **Allowed lateness giữ state sống lâu hơn.** Cho phép muộn 10 phút nghĩa là giữ 10 cửa sổ (~45 MB/node) — ổn. Nhưng ai đề xuất allowed lateness 24 giờ thì hãy chỉ ra state sẽ phình lên 1,440 cửa sổ và giết node.

### Nhánh batch đối chiếu — lambda architecture

Watermark tốt đến đâu vẫn còn đuôi lọt lưới, cộng thêm rủi ro bug trong chính logic streaming. Lời giải cuối cùng là **tính lại bằng batch và đối chiếu**.

```
  Kafka raw ──tee──▶ S3 (Parquet, phân vùng theo giờ)
                        │  chạy 02:00 mỗi ngày, cho dữ liệu ngày hôm trước
                        ▼
             [ BATCH JOB (Spark/Athena) ]  đếm lại TOÀN BỘ từ raw
                        │                   không có khái niệm "muộn" —
                        ▼                   dữ liệu đã nằm yên (bounded input)
             [ SO SÁNH với kết quả stream ]
                 ┌──────┴──────┐
                 ▼             ▼
        lệch < 0.01%      lệch ≥ ngưỡng
        ghi log, đóng sổ  → ALERT + điều tra
                          → ghi đè bằng số của batch
                            (batch là nguồn chân lý cho billing)
```

Kiến trúc có **hai nhánh xử lý trên cùng dữ liệu** gọi là **lambda architecture**: *speed layer* (stream, vài phút, phục vụ dashboard/alerting, chấp nhận thiếu sót nhỏ), *batch layer* (chậm, bounded input, **chuẩn xác**, nguồn chân lý cho billing), *serving layer* (ưu tiên số batch khi đã có).

| | Lambda | Kappa |
|---|---|---|
| Số codebase | **Hai** — phải giữ chúng cho cùng kết quả | Một |
| Độ tin cậy cho billing | Cao — có nhánh độc lập đối chiếu | Thấp hơn — bug ở stream không ai phát hiện |
| Chi phí vận hành | Cao hơn | Thấp hơn |
| Tính lại lịch sử | Chạy batch job | Replay từ Kafka qua chính pipeline stream |
| Phù hợp | Dữ liệu **tính tiền**, cần audit độc lập | Analytics thông thường |

Lựa chọn thực dụng: **Kappa cho backfill/recalculation** (chạy lại chính pipeline stream trên dữ liệu cũ, ghi bảng shadow), nhưng **giữ một job batch độc lập, viết bằng công nghệ khác, chỉ để đối chiếu**. Job đó đơn giản (chỉ `COUNT GROUP BY`) nên bảo trì rẻ, mà giá trị rất lớn: nó là thứ **duy nhất** phát hiện được bug trong pipeline chính.

> ⚠️ **Bẫy**: dùng chung code giữa nhánh stream và nhánh đối chiếu để "đỡ bảo trì hai nơi". Làm vậy là tự huỷ mục đích — cả hai cùng chạy một hàm có bug sẽ khớp nhau hoàn hảo và báo "không lệch". **Đối chiếu chỉ có giá trị khi hai nhánh độc lập.**

### Quy trình tính lại khi phát hiện sai

Khi phát hiện bug (ví dụ chuẩn hoá `country` sai): **(1)** đóng băng — ngừng xuất hoá đơn cho khoảng bị ảnh hưởng; **(2)** sửa logic, deploy bản mới chỉ áp dụng cho dữ liệu từ giờ trở đi; **(3)** dựng pipeline tính lại **riêng biệt** — đọc S3 raw (hoặc Kafka nếu còn retention), chạy trên **cụm riêng** rồi ghi vào **bảng shadow**; **(4)** so sánh shadow vs bảng chính và kiểm tra chênh lệch có **đúng như dự đoán** không (bug "gộp nhầm UK vào others" thì lệch phải nằm đúng ở `country=UK`; lệch rải khắp nơi ⇒ bản sửa còn sai chỗ khác); **(5)** chỉ khi bước 4 hợp lý mới hoán đổi bảng, mở lại billing và gửi thư đính chính.

Hai chi tiết quan trọng: **cụm riêng** (job backfill không được cạnh tranh tài nguyên làm tụt lag pipeline realtime — lỗi kinh điển biến sự cố nhỏ thành sự cố lớn), và **bảng shadow trước** (ghi đè trực tiếp bảng billing là không thể hoàn tác).

---

## Deep dive 2 — Exactly-once: vì sao at-least-once làm sai tiền

| Mức | Nghĩa | Rủi ro | Dùng ở đâu |
|---|---|---|---|
| **At-most-once** | Gửi một lần, không retry | **Mất dữ liệu** | Metric hệ thống, log debug |
| **At-least-once** | Retry đến khi có ack | **Trùng lặp** | Phần lớn hệ thống; đúng khi consumer idempotent |
| **Exactly-once** | Mỗi event ảnh hưởng kết quả đúng một lần | Phức tạp, chậm hơn | **Dữ liệu tính tiền** |

At-least-once là mặc định đúng ở hầu hết hệ thống. Ở đây thì không: 1% sai lệch = hàng triệu đô/ngày, và nhân đôi do retry **không phải nhiễu ngẫu nhiên** — nó luôn lệch về một phía (đếm dư) và tập trung vào một số ad.

### Trùng lặp đến từ đâu

```
1. CLIENT gửi lại: app mất mạng → retry → cùng một click vật lý, hai event
   Chữa: client_event_id (UUID) + dedupe ở tầng ingest.

2. PRODUCER gửi lại vào Kafka: broker ghi xong nhưng ack mất trên đường về
   Chữa: Kafka idempotent producer (enable.idempotence=true) — broker khử
         trùng theo (producer_id, sequence_number).

3. AGGREGATION node chết giữa chừng: đọc offset 100..200, đếm, gửi kết quả,
   CRASH trước khi commit offset → node mới đọc lại 100..200, gửi LẦN HAI
   ⇒ NGUY HIỂM NHẤT vì nó nhân đôi cả một lô.
   Chữa: transaction hoặc idempotent sink — xem dưới.

4. GIAN LẬN chủ ý: bot gửi cùng một click hàng nghìn lần
   Chữa: không phải việc của pipeline — việc của risk engine.
```

### Chữa nguồn 3

**Cách A (sai)** — commit offset vào chính DB kết quả bằng một lệnh ghi riêng: vẫn còn khe hở giữa hai lệnh, chỉ nhỏ hơn. Không giải quyết vấn đề gốc.

**Cách B (đúng, và đơn giản nhất) — làm sink idempotent.** Nếu ghi kết quả là idempotent (ghi n lần = ghi 1 lần) thì trùng lặp trở nên vô hại, và ta chỉ cần **at-least-once** cho rẻ và nhanh. Cách làm: **upsert theo khoá với giá trị tuyệt đối**, không cộng dồn.

```sql
-- ĐÚNG: ghi đè giá trị tuyệt đối, khoá (ad_id, minute, filter_id)
UPSERT INTO ad_counts (ad_id, click_minute, filter_id, count, agg_version)
VALUES ('ad001', 202601140900, '0000', 4230, 17);
-- chạy 1 lần hay 5 lần đều cho count = 4230

-- SAI: cộng dồn
UPDATE ad_counts SET count = count + 4230 WHERE ...;   -- chạy 2 lần → 8460
```

Với DynamoDB, tương đương là **conditional update**:

```
UpdateItem
  Key: { pk: "ad001#0000", sk: "202601140900" }
  UpdateExpression:    SET #c = :count, #v = :ver
  ConditionExpression: attribute_not_exists(#v) OR #v < :ver
```

`agg_version` bảo đảm một bản ghi **cũ hơn đến muộn** không ghi đè bản mới hơn — chuyện hoàn toàn có thể xảy ra khi retry kèm reorder.

> 💡 **Nguyên tắc**: idempotency gần như luôn rẻ hơn distributed transaction. Trước khi nghĩ tới 2PC, hãy hỏi *"tôi có thể thiết kế lại thao tác ghi để chạy lại nhiều lần cũng vô hại không?"*. Ở bài này câu trả lời là có, và bí quyết là **phát ra trạng thái, không phát ra delta**.

**Cách C (mạnh nhất) — distributed transaction / two-phase commit.** Khi sink không thể idempotent (append-only không có khoá, hoặc phải ghi đồng thời nhiều nơi), cần commit nguyên tử giữa "kết quả đã ghi" và "offset đã tiến".

```
PHASE 1 — PREPARE  (coordinator = engine, vd Flink)
  ├─ Kafka producer: mở transaction, ghi message vào topic-2
  │                  (message tồn tại nhưng consumer read_committed CHƯA thấy)
  ├─ Aggregation:    snapshot state in-memory xuống durable storage
  └─ Offset:         ghi nhận "sẽ commit offset 15000"
  tất cả trả lời "sẵn sàng" ───┐
                               ▼
PHASE 2 — COMMIT
  Coordinator ghi quyết định COMMIT vào log bền vững  ← ĐIỂM KHÔNG QUAY LẠI
  ├─ Kafka: commit transaction → message hiển thị cho consumer
  └─ Offset 15000 được commit

Crash TRƯỚC điểm không quay lại → abort tất cả, đọc lại từ offset cũ
Crash SAU  điểm không quay lại → khi hồi phục, coordinator đọc log, hoàn tất
```

Đây chính là **Flink two-phase-commit sink**: checkpoint của Flink và transaction của Kafka ghép vào cùng một giao thức. Phải nêu được **giá phải trả**: coordinator là điểm tập trung; nếu nó chết sau prepare mà trước commit, participant bị **treo tài nguyên** (giữ transaction mở) cho tới khi coordinator hồi phục; throughput giảm vì checkpoint barrier định kỳ. Đó là lý do **idempotent sink luôn tốt hơn khi làm được**.

| | Idempotent sink (B) | Two-phase commit (C) |
|---|---|---|
| Độ phức tạp | Thấp | Cao |
| Hiệu năng | Gần như không mất gì | Giảm (barrier, transaction overhead) |
| Điểm chết tập trung | Không | Coordinator |
| Yêu cầu với sink | Hỗ trợ upsert theo khoá | Hỗ trợ transaction / 2PC |
| Khi nào | **Mặc định.** Đúng cho DynamoDB/Cassandra | Khi sink không idempotent được |

**Exactly-once thực chất là "effectively-once".** Nên nói rõ điều này để tránh bị bắt bẻ: không tồn tại exactly-once ở tầng gửi tin trên mạng (bài toán two generals chứng minh là bất khả thi). Cái Kafka/Flink gọi là exactly-once thực chất là **at-least-once delivery + effectively-once processing**: message vẫn có thể gửi nhiều lần, nhưng **tác động lên trạng thái cuối chỉ xảy ra một lần**.

### Khôi phục và replay

```
Aggregation node chết lúc đang xử lý cửa sổ 9:03:
  1. Engine phát hiện (heartbeat timeout), lên lịch lại task trên node khác.
  2. Node mới đọc CHECKPOINT gần nhất (vd tại 9:02:00) → khôi phục HashMap đếm
     dở + heap top-N + offset Kafka tương ứng.
  3. Đọc lại Kafka từ offset đó → xử lý lại 9:02:00 → 9:03:xx. Kết quả cửa sổ
     9:02 được ghi LẠI, nhưng upsert idempotent nên giá trị cuối vẫn đúng.
  4. Tiếp tục bình thường. Gián đoạn = vài chục giây.

Điều kiện BẮT BUỘC:
  - Kafka retention DÀI HƠN khoảng phải replay (7 ngày là hợp lý).
  - Checkpoint NGUYÊN TỬ: state + offset lưu CÙNG NHAU. Lưu riêng rẽ thì lại
    quay về đúng bài toán hai hệ thống không đồng thuận.
  - Sink idempotent (hoặc transactional). Nếu không, mỗi lần recovery là một
    lần đếm dư.
```

Replay còn là **công cụ sửa lỗi mạnh nhất**: logic sai thì không cần ai gửi lại dữ liệu, không cần khôi phục backup — chỉ cần tua lại offset (hoặc đọc từ S3 nếu ngoài retention) và chạy lại. Đó là lý do **giữ log thô là bất khả xâm phạm**: nó là cỗ máy thời gian của hệ thống.

> ⚠️ **Bẫy**: đặt Kafka retention 1 ngày để tiết kiệm đĩa. 100 GB/ngày × replication 3 × 7 ngày ≈ 2 TB — rẻ hơn rất nhiều so với một lần không thể tính lại hoá đơn. Hãy tính chi phí retention **so với chi phí của sự cố nó ngăn chặn**.

---

## Deep dive 3 — Top-N mỗi phút: heap, merge, và khi nào được xấp xỉ

Bài toán: trong 2 triệu ad, tìm 100 ad click nhiều nhất trong M phút, tính lại mỗi phút.

**Vì sao không sort toàn bộ.** Sort 2 triệu phần tử là `O(n log n)` ≈ 42 triệu phép so sánh, lại phải gom hết về một node — trong khi ta chỉ cần 100 phần tử đầu. Dùng **min-heap kích thước N**: duyệt một lượt, mỗi phần tử tốn `O(log N)` = 7 phép; quan trọng hơn, **bộ nhớ chỉ là N chứ không phải n**.

```
Min-heap 100 phần tử (đỉnh là phần tử NHỎ NHẤT trong top-100):
  heap chưa đủ 100    → push
  count > heap.top()  → pop rồi push     (đẩy kẻ yếu nhất ra)
  ngược lại           → bỏ qua, O(1)     ← trường hợp phổ biến nhất
```

**Phân tán: heap cục bộ rồi merge.** Vì partition theo `hash(ad_id)`, count của một ad **không bị chia nhỏ** — điều kiện then chốt làm merge trở nên đúng.

```
      p0        p1        p2        p3
  [heap 100][heap 100][heap 100][heap 100]   mỗi node gửi đi 100 dòng,
       └────────┴────┬────┴─────────┘         không phải 500K dòng
                     ▼
      [ REDUCE: merge 400 ứng viên → heap → top-100 TOÀN CỤC ]
```

**Vì sao merge chính xác tuyệt đối?** Một ad thuộc top-100 toàn cục thì bắt buộc thuộc top-100 của chính partition chứa nó (partition đó chứa ít ad hơn toàn cục, nên thứ hạng cục bộ không thể tệ hơn thứ hạng toàn cục) ⇒ không ứng viên nào bị bỏ sót. Điều này **chỉ đúng khi mỗi ad nằm gọn trong một partition** — nếu count bị chia đôi giữa hai node thì mỗi nửa có thể không lọt top-100 cục bộ và ad đó biến mất. Đây chính là lý do partition key phải là `ad_id`. Băng thông cũng tiết kiệm lớn: vài KB thay vì ~32 MB/phút.

**Count-Min Sketch (CMS)** đếm tần suất bằng bộ nhớ cố định: ma trận `d × w` với `d` hàm băm; ghi thì tăng `d` ô, đọc lấy **min** (vì va chạm chỉ làm tăng) ⇒ kết quả luôn ≥ giá trị thật, không bao giờ nhỏ hơn.

| | Heap chính xác | Count-Min Sketch |
|---|---|---|
| Bộ nhớ | O(số khoá) — 2M ad ≈ 90 MB | Cố định vài MB, bất kể số khoá |
| Sai số | **Không** | Luôn **đếm dư**, ~ε·tổng |
| Phù hợp | Khoá lực lượng vừa phải | Khoá lực lượng cực lớn (hàng tỉ) |

**Ở bài này CMS không cần thiết cho chiều chính**: chỉ 2 triệu ad, state chính xác tốn ~90 MB/cửa sổ — vừa RAM. Đánh đổi độ chính xác để tiết kiệm 90 MB trong hệ thống tính tiền là quyết định tồi. CMS **chỉ có lý khi khoá là `ip` hoặc `(ad_id, user_id)`** (lực lượng hàng tỉ), ví dụ "IP nào click bất thường trong 1 phút" cho chống gian lận — nơi kết quả dùng để **đánh dấu nghi vấn**, không dùng tính tiền.

> ⚠️ **Ranh giới cứng**: mọi con số đi vào **hoá đơn** phải chính xác tuyệt đối — cấm HyperLogLog, cấm CMS, cấm sampling. Con số dùng để **xếp hạng, cảnh báo, khám phá** thì xấp xỉ được, miễn API tự khai báo (`approximate: true`). Nhiều ứng viên khoe CMS/HLL để tỏ ra hiểu biết rồi áp vào đúng chỗ cấm — đó là điểm trừ.

**Top-N cho cửa sổ M phút** chỉ cần cộng M bảng `(ad_id, minute, count)` rồi lấy heap, không đọc lại event thô. Nhưng **không thể chỉ cộng top-100 của từng phút**: một ad hạng 150 ở cả 5 phút vẫn có thể lọt top-100 khi cộng lại. Vì vậy heap cục bộ mỗi phút nên giữ **nhiều hơn N** (vd top-1000) làm ứng viên cho cửa sổ dài — đánh đổi giữa độ chính xác cửa sổ dài và băng thông, chi tiết rất ít người nhắc tới.

---

## Deep dive 4 — Scale và bài toán hot ad

**Message queue.** Consumer scale bằng cách tăng instance trong consumer group — **trần cứng là số partition**. Phải **tạo dư partition từ đầu**: tăng partition sau khi chạy làm đổi ánh xạ `hash(ad_id) → partition`, khiến state đang giữ trong bộ nhớ không còn khớp. Rebalance với hàng nghìn consumer mất hàng chục giây và làm dừng xử lý ⇒ nên làm ngoài giờ cao điểm; có thể tách topic theo địa lý (`clicks_na`, `clicks_eu`) để giới hạn phạm vi rebalance.

**Aggregation service.** Scale ngang bằng thêm task (tối đa = số partition), scale dọc bằng đa luồng; thực tế để resource manager (YARN/K8s/Flink autoscaler) cấp phát động theo lag.

**Database.** Cassandra scale ngang bằng consistent hashing, DynamoDB managed hoàn toàn. Điểm cần chú ý không phải throughput mà là **thiết kế khoá**: PK = `(ad_id, filter_id)`, SK = `minute`, để "ad X trong Y phút" thành range scan trên một partition.

### Hot ad — một quảng cáo viral chiếm trọn một partition

Phân bố click theo ad tuân luật lũy thừa: một chiến dịch lớn trong giờ vàng có thể chiếm **vài phần trăm tổng traffic** một mình.

```
Bình thường (20 partition, 50K QPS):     Khi có hot ad:
  p0: 2,500/s   p1: 2,500/s                p0: 2,500/s   p1: 2,500/s
  p7: 2,500/s   ...                        p7: 22,000/s  ← ad viral ở đây
  ⇒ đều                                    ⇒ p7 nghẽn, lag tăng dần
```

Điều tệ nhất không phải p7 chậm, mà là **watermark toàn cục bị kéo theo node chậm nhất** — watermark phải là min của mọi partition để không đóng cửa sổ quá sớm, nên một partition nghẽn làm **mọi cửa sổ của mọi ad** chốt muộn. Và không chữa được bằng "thêm partition": cùng `ad_id` luôn băm về cùng một chỗ.

**Cách chữa chuẩn mực — key salting (local-global / two-stage aggregation)**: chia khoá nóng thành nhiều khoá con ở tầng một, gộp lại ở tầng hai.

```
Tầng 1 (local) — key = (ad_id, salt), salt ∈ [0,K)
   ad_viral#0 → node A → 5,400        ad_viral#2 → node C → 5,500
   ad_viral#1 → node B → 5,600        ad_viral#3 → node D → 5,500
                          │
Tầng 2 (global) — key = ad_id  ──▶  ad_viral = 22,000
                                    ← đúng, tải đã trải đều trên 4 node
```

Tầng hai không nghẽn dù ad rất nóng vì nó chỉ nhận **K bản ghi mỗi phút cho mỗi ad**, không phải K nghìn event — cùng ý tưởng với combiner trong MapReduce: **giảm dữ liệu trước khi gom về một điểm**.

| Cách | Ưu | Nhược |
|---|---|---|
| **Salting cố định** | Đơn giản, dự đoán được, hiệu quả | Thêm một tầng shuffle; K lớn thì 99.99% ad thường cũng bị tách vô ích |
| **Salting thích ứng** (CMS ở tầng map phát hiện khoá > 2% traffic mới salt) | Chỉ trả giá cho khoá nóng | Phức tạp, cần state "hot key" chia sẻ. (CMS ở đây để **phát hiện**, không ra số cuối) |
| **Cấp thêm tài nguyên cho node nóng** | Không đổi logic | Vẫn còn điểm tập trung (node đó vẫn nhận toàn bộ event), phản ứng chậm |
| **Tách topic riêng cho ad nóng** | Cách ly hoàn toàn | Thủ công, không kịp với viral đột ngột |

> 💡 **Nguyên tắc**: hot key là bệnh cố hữu của **mọi** hệ thống partition theo khoá (xem lại bài consistent hashing và rate limiter). Thuốc chữa luôn cùng một họ: **thêm một chiều vào khoá để trải tải, rồi gộp lại ở tầng sau**. Nói được điều đó cho thấy bạn nhìn ra pattern, không chỉ nhớ một mẹo.

---

## Chống gian lận click (click fraud) — mức cơ bản

Ước tính trong ngành: 10–20% traffic quảng cáo là bot. Nếu pipeline đếm hết, advertiser trả tiền cho bot và sẽ rời bỏ nền tảng. Kiến trúc đúng là **tách risk engine khỏi pipeline tổng hợp**, đặt ở tầng ingest:

```
  Click ─▶ [Log collector] ─▶ [RISK ENGINE] ─┬─▶ Topic 1 (hợp lệ) ─▶ aggregation
                                             └─▶ Topic invalid (lưu, không tính tiền)
```

Tách riêng vì logic chống gian lận thay đổi liên tục (attacker thích nghi), cần ML và dữ liệu ngoài luồng, và cần **gắn nhãn lại quá khứ** khi phát hiện mạng bot mới — nhét vào aggregation service sẽ làm component quan trọng nhất trở nên khó thay đổi.

| Tín hiệu cơ bản | Cách phát hiện | Lưu ý |
|---|---|---|
| **Click trùng** | `client_event_id` (UUID) trong Redis/Bloom filter, TTL vài giờ | Rẻ nhất; bắt cả lỗi retry lẫn bot ngây thơ |
| **Tần suất bất thường theo IP** | CMS đếm theo `ip` trong cửa sổ 1 phút | Cẩn thận NAT doanh nghiệp và mobile carrier — hàng nghìn người thật chung một IP |
| **Click không có impression trước** | Đối chiếu `impression_id` giữa stream impression và click | Rất mạnh: click mà không có lần hiển thị nào là giả rõ ràng |
| **impression → click < 100 ms** | So `click_ts − impression_ts` | Người thật không click nhanh hơn thời gian phản xạ |
| **Data center IP / UA lạ, mẫu hành vi** | Dải IP cloud, UA headless; một user click 50 ad trong 1 phút | Mẫu hành vi cần state theo user ⇒ thường chạy ở nhánh batch |

Ba nguyên tắc vận hành: **(1)** không xoá click nghi ngờ mà **gắn nhãn** vào bảng riêng kèm lý do — dương tính giả luôn tồn tại và advertiser có quyền khiếu nại; **(2)** tính hai con số `gross_clicks` và `billable_clicks`, hiển thị cả hai, chênh lệch giữa chúng chính là một metric sức khoẻ nền tảng; **(3)** phát hiện muộn là chuyện thường — một mạng bot có thể chỉ lộ sau vài ngày, khi đó phải **tính lại và hoàn tiền**, và chỉ làm được nếu raw data còn nguyên.

---

## Monitoring và đảm bảo tính đúng đắn

| Nhóm | Chỉ số | Ngưỡng gợi ý | Ý nghĩa |
|---|---|---|---|
| **Pipeline** | **Consumer lag** (`records-lag-max`) | > 1 phút traffic, hoặc tăng đơn điệu 5 phút | Chỉ số quan trọng nhất: consumer không theo kịp producer |
| | Lag **theo từng partition** | một partition > 3× trung vị | Dấu hiệu **hot key** — bắt trước khi thành sự cố |
| | Checkpoint duration / failure | > 30 s hoặc có thất bại | Checkpoint chậm ⇒ state phình, recovery lâu. GC pause dài cũng làm trễ watermark |
| **Chất lượng dữ liệu** | **Tỉ lệ late event** | > 0.1% hoặc tăng đột biến | Early warning tốt nhất: một region đang gặp sự cố mạng |
| | p99 của `processing_ts − event_ts` | p99 tiến sát watermark | Watermark hiện tại có còn phù hợp không |
| | Tỉ lệ event hỏng / thiếu field | thay đổi bậc nào cũng cảnh báo | Thường do producer deploy sai schema |
| **Đúng đắn nghiệp vụ** | **Chênh lệch stream vs batch** (job cuối ngày) | > 0.01% | Chỉ số tối thượng — thứ duy nhất phát hiện bug logic |
| | Tổng click/phút vs cùng giờ tuần trước | lệch > 20% | Bắt cả mất dữ liệu lẫn đợt tấn công bot |
| | `billable / gross` ratio; latency e2e | thay đổi đột ngột; p99 > 5 phút | Risk engine hỏng / mạng bot mới; vi phạm SLA |

Cách đọc kết quả job đối chiếu:

```
lệch ~0                       bình thường
lệch dương nhỏ, rải đều       late event vượt allowed lateness (chấp nhận được)
lệch dương TẬP TRUNG vài ad   stream ĐẾM THIẾU → nhiều khả năng một task chết
                              mà recovery không đúng
lệch ÂM (stream > batch)      stream ĐẾM DƯ ⇒ NGHIÊM TRỌNG: exactly-once đang
                              không hoạt động. DỪNG BILLING.
```

> 💡 **Nguyên tắc**: trong hệ thống tính tiền, **lệch âm nguy hiểm hơn lệch dương**. Đếm thiếu là mất doanh thu của mình; đếm dư là tính sai tiền khách hàng — hậu quả pháp lý và uy tín lớn hơn nhiều. Đặt ngưỡng cảnh báo **bất đối xứng** theo hướng đó.

---

## Bottleneck và failure mode

**Cái gì nghẽn trước**, theo thứ tự thực tế sẽ gặp: **(1)** một partition nóng — không phải throughput tổng; **(2)** state phình khi bật allowed lateness dài (GC pause, checkpoint chậm, OOM); **(3)** write amplification ở aggregation DB do thêm dimension — một yêu cầu nghe vô hại ("cho tôi lọc thêm theo device") làm tăng tải ghi vài lần; **(4)** query service khi dashboard hỏi cửa sổ dài ("30 ngày theo phút" = 43,200 hàng/ad → chữa bằng **roll-up phân tầng** phút → giờ → ngày); **(5)** đĩa Kafka — chỉ ~2 TB cho 7 ngày, nhưng hết đĩa là mất khả năng ingest.

| Chết cái gì | Hậu quả tức thì | Cơ chế chịu lỗi | Việc phải làm |
|---|---|---|---|
| **Một aggregation node** | Cửa sổ đang tính dở mất state | Lên lịch lại task, khôi phục từ checkpoint + offset, replay | Không cần can thiệp; latency tăng vài chục giây |
| **Toàn bộ aggregation cluster** | Không có kết quả mới | Kafka giữ dữ liệu 7 ngày | Khôi phục cluster, nó tự đuổi kịp lag. **Không mất dữ liệu** |
| **Aggregation DB** | Query lỗi, writer không ghi được | Kết quả nằm an toàn trong topic-2 | Khắc phục DB rồi cho writer chạy tiếp — đây chính là giá trị của topic thứ hai |
| **Một Kafka broker** | Partition có leader ở đó gián đoạn ngắn | RF=3 + `min.insync.replicas=2` | Tự bầu leader mới, producer retry |
| **Cả Kafka cluster** | **Click mất ngay tại nguồn** | Log collector buffer xuống đĩa cục bộ | Failure mode **nghiêm trọng nhất**. Bắt buộc local disk buffer + multi-AZ |
| **Risk engine** | Click không được lọc gian lận | Quyết định nghiệp vụ: **fail-open**, gắn nhãn "chưa kiểm" | Fail-closed sẽ chặn cả traffic thật ⇒ mất doanh thu. Gắn nhãn lại sau bằng batch |
| **Batch reconciliation** | Không phát hiện được lệch | Không ảnh hưởng realtime | Chạy lại — nhưng **không đóng sổ billing khi job này chưa xong** |

> ⚠️ **Bẫy hay gặp**: coi "mất Kafka" là chuyện không thể xảy ra nên không có buffer ở collector. Mọi component **phía sau** Kafka đều khôi phục được *vì Kafka giữ dữ liệu*; nhưng **trước** Kafka thì không có lưới an toàn nào. Đó là **điểm mong manh duy nhất của toàn kiến trúc**, và phải nói ra.

---

## Liên hệ sang AWS

| Thành phần thiết kế | Dịch vụ AWS | Vì sao hợp |
|---|---|---|
| Thu thập click ở edge, gắn event time | **CloudFront + Lambda@Edge**, hoặc ALB → ECS | Bắt click gần user, giảm mất mát; gắn timestamp tại điểm đầu tiên mình kiểm soát |
| **Topic 1 — raw click stream** | **Kinesis Data Streams** hoặc **MSK** | Kinesis: managed hoàn toàn, on-demand tự scale shard, retention tới 365 ngày. MSK: khi cần đúng semantics Kafka (transaction, exactly-once, hệ connector) |
| Chọn cái nào | — | **MSK** nếu cần **Kafka transaction** cho exactly-once và đội đã quen Kafka. **Kinesis** nếu ưu tiên ít vận hành — đổi lại phải tự lo idempotency vì Kinesis không có transaction nguyên tử kiểu Kafka |
| Đổ raw xuống cold storage | **Kinesis Data Firehose → S3** (Parquet, phân vùng `dt=/hour=`) | Tự buffer, nén, chuyển định dạng, phân vùng — gần như không phải viết code cho nhánh lưu trữ |
| **Aggregation service** | **Managed Service for Apache Flink** | Đúng engine: event-time window, watermark, allowed lateness, side output cho late event, **checkpoint/savepoint tới S3**, **two-phase-commit sink cho exactly-once**. Savepoint cho phép nâng cấp job mà không mất state — điều kiện deploy an toàn hệ thống tính tiền |
| Consumer nhẹ thay cho Flink | **Lambda** (event source mapping từ Kinesis/MSK) | Hợp cho DB writer, alerting, fan-out. **Giới hạn phải biết**: Lambda **không giữ state giữa các lần gọi** ⇒ không làm được windowing thật; timeout 15 phút; một message lỗi có thể chặn cả shard (cần `BisectBatchOnFunctionError` + on-failure destination). **Đừng dùng Lambda làm aggregation engine** |
| **Topic 2 — aggregated results** | **MSK** (topic khác) hoặc Kinesis | Để có transaction nguyên tử "produce + commit offset", và tách nhịp tính toán khỏi ghi DB |
| **Aggregation DB** | **DynamoDB** (+ **DAX**/ElastiCache cache top-N) | PK = `ad_id#filter_id`, SK = `click_minute` ⇒ "Y phút gần nhất" là range query trên một partition. **Conditional update** theo `agg_version` cho **idempotent upsert** (đúng cách B ở deep dive 2). **TTL** tự xoá phút cũ sau roll-up. Phương án khác: Keyspaces, Timestream |
| **Nhánh batch reconciliation** | **S3 + Glue Catalog + Athena**, điều phối bằng **Step Functions** | Athena chạy `COUNT(*) GROUP BY ad_id, minute` trên Parquet, trả phí theo dữ liệu quét; Glue quản schema/partition. Codebase **độc lập** với Flink ⇒ đúng tinh thần đối chiếu chéo |
| Batch nặng / backfill lớn | **EMR (Spark)** | Khi tính lại nhiều tháng hoặc join phức tạp với dữ liệu impression. Chạy trên cụm **riêng**, không đụng tài nguyên realtime |
| Kho phân tích đa chiều, dashboard | **Redshift** (+ Spectrum), **QuickSight** | Advertiser khoan sâu nhiều dimension, join với chiến dịch/ngân sách; Spectrum đọc thẳng Parquet trên S3; QuickSight + SPICE cache cho báo cáo xem nhiều |
| Risk engine | **Lambda/Flink + ElastiCache** (dedupe `client_event_id`), **Fraud Detector**, **WAF** | ElastiCache giữ tập id đã thấy với TTL; WAF chặn bot ở tầng ngoài; Fraud Detector cho mô hình ML |
| Monitoring | **CloudWatch** (`IteratorAgeMilliseconds` của Kinesis, `records-lag-max` của MSK, metric tuỳ biến cho tỉ lệ late) + **Alarms** | Iterator age là chỉ số lag quan trọng nhất của Kinesis — alarm trên nó là cảnh báo đầu tiên phải dựng |

```
Kiến trúc AWS gọn nhất:

CloudFront/ALB → ECS log collector
      │
      ├──▶ MSK "clicks-raw" ──▶ Managed Flink (event-time window, watermark,
      │                          checkpoint→S3, exactly-once sink)
      │                                  ▼
      │                          MSK "clicks-agg"
      │                                  ▼
      │                          Lambda writer ──▶ DynamoDB (conditional
      │                                             update, TTL)  ──▶ API GW
      │                                             + Lambda (+DAX) → Dashboard
      └──▶ Firehose ──▶ S3 (Parquet) ──▶ Glue Catalog
                             ├──▶ Athena (đối chiếu cuối ngày, Step Functions)
                             └──▶ Redshift Spectrum / QuickSight
```

> 💡 **Khi nói về AWS trong phỏng vấn**, đừng chỉ đọc tên dịch vụ. Gắn mỗi dịch vụ với **thuộc tính thiết kế nó cung cấp**: "Managed Flink vì tôi cần event-time watermark và exactly-once sink"; "DynamoDB conditional update vì tôi cần idempotent upsert"; "S3 + Athena cho nhánh đối chiếu vì tôi muốn một codebase độc lập với nhánh stream".

---

## Cách trình bày khi phỏng vấn / review

1. **Mở đầu bằng câu định khung**: *"Đây là dữ liệu dùng để tính tiền, nên correctness là ràng buộc số một — nó sẽ chi phối mọi lựa chọn sau đây."* Câu này tạo lý do chính đáng cho mọi thứ phức tạp bạn sắp thêm vào.
2. **Phân biệt RTB và aggregation ngay từ đầu**: RTB cần dưới một giây, hệ thống này cần vài phút. Nêu được điều đó ở phút thứ hai là điểm cộng lớn.
3. **Ước lượng rồi chỉ ra throughput KHÔNG phải vấn đề.** "50K QPS, 5 MB/s — nhỏ. Chỗ khó là exactly-once và event đến trễ." Kết luận phản trực giác này mua cho bạn thời gian để đào đúng chỗ.
4. **Chủ động giải thích vì sao có HAI topic** trước khi bị hỏi, bằng kịch bản crash cụ thể (ghi DB trước / commit offset trước — cả hai đều hỏng), rồi mới đưa transaction làm lời giải.
5. **Giải thích watermark bằng ví dụ có số, không bằng định nghĩa.** Kể một dòng event cụ thể: event lệch thứ tự nhưng chưa muộn thì vẫn đúng, event muộn hơn thì đi đâu. 90% ứng viên chỉ nói được định nghĩa sách vở.
6. **Nói rõ "exactly-once" thực chất là effectively-once** — at-least-once delivery cộng idempotency hoặc transaction. Và nêu **idempotent sink rẻ hơn 2PC**, kèm lý do: phát ra giá trị tuyệt đối thay vì delta.
7. **Chủ động nêu hot ad trước khi bị hỏi về scale**, mô tả cơ chế nó làm hỏng watermark toàn cục (chứ không chỉ "một node chậm"), rồi đưa salting hai tầng.
8. **Với top-N, giải thích vì sao merge heap cục bộ CHÍNH XÁC** và điều kiện để đúng (một ad nằm gọn trong một partition). Rồi chủ động nói **khi nào KHÔNG được xấp xỉ**: số vào hoá đơn thì cấm sketch; xếp hạng và cảnh báo thì được.
9. **Đừng quên nhánh đối chiếu.** Nhiều ứng viên dừng ở kiến trúc streaming đẹp đẽ. Câu *"tôi vẫn cần một job batch độc lập cuối ngày để kiểm tra chéo, vì không có gì khác phát hiện được bug trong chính pipeline của tôi"* phân biệt người đã vận hành hệ thống thật.
10. **Nêu failure mode mong manh nhất**: mọi thứ sau Kafka đều khôi phục được, nhưng click mất **trước** khi vào Kafka là mất vĩnh viễn ⇒ collector cần buffer xuống đĩa. Chỉ ra điểm yếu duy nhất của kiến trúc mình vừa vẽ là dấu hiệu chín chắn.
11. **Khi review thiết kế của người khác**, hỏi đúng bốn câu: *"Event time hay processing time?"*, *"Retry hai lần thì số có đổi không?"*, *"Watermark bao lâu, event muộn hơn thế đi đâu?"*, *"Có ai kiểm tra chéo con số này không?"*. Bốn câu đó bóc trần gần như mọi lỗi phổ biến của một pipeline tổng hợp dữ liệu.

> 💡 **Nguyên tắc cuối**: bài này dạy một sự thật tổng quát của stream processing — **độ chính xác, độ trễ và chi phí là một tam giác không thể đạt cả ba**. Watermark dài hơn = chính xác hơn nhưng chậm hơn. Exactly-once = chính xác hơn nhưng đắt và chậm hơn. Sketch = rẻ và nhanh hơn nhưng kém chính xác. Việc của người thiết kế không phải thắng tam giác đó, mà là **đặt kim chỉ nam đúng chỗ tuỳ theo con số ấy có đi vào hoá đơn hay không** — và nói ra lựa chọn đó một cách tường minh.
