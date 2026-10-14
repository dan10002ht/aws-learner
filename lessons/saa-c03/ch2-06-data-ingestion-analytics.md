# SAA Ch2.6 — Data Ingestion & Analytics

> Mục tiêu: Phủ **task statement TS5 của Domain 3** — thu thập (ingestion) và phân tích (analytics) dữ liệu ở quy mô lớn. Nắm chắc **Kinesis Data Streams vs Firehose vs Managed Service for Apache Flink** (và vs MSK/SQS), pipeline **data lake** (S3 → Glue → Athena/Redshift → QuickSight), và các bảng decision exam hay bẫy: **Redshift vs Athena vs EMR**, **csv vs Parquet**. (Góc *decoupling* của Kinesis đã học ở resilient-01; ở đây là góc *ingestion & analytics*.)

---

## 1. Câu chuyện mở đầu — "phân tích 10 tỷ log/ngày"

Một sản phẩm sinh **10 tỷ dòng clickstream/log mỗi ngày** (clickstream là chuỗi sự kiện ghi lại từng cú click, từng lượt xem trang của người dùng). Có ba yêu cầu: (a) nạp dữ liệu vào kho ngay khi nó phát sinh, (b) analyst hỏi được bằng SQL những câu chưa biết trước, (c) có dashboard cho phía business. Bạn của bạn định "đổ hết vào RDS rồi query". Sai ở đâu?

RDS là database kiểu **OLTP** (Online Transaction Processing): sinh ra để phục vụ rất nhiều giao dịch nhỏ, mỗi giao dịch đụng vài dòng — "lấy đơn hàng số 123", "trừ tồn kho 1 đơn vị". Để làm việc đó nhanh, nó lưu **theo dòng** (row-based): mọi cột của một dòng nằm liền nhau trên đĩa. Bài toán ở đây ngược lại hoàn toàn, và RDS vấp ở cả hai đầu:

```
Đầu ghi:   10.000.000.000 record ÷ 86.400 giây ≈ 115.740 record/giây   (trung bình, chưa tính giờ cao điểm)
Dung lượng: 10.000.000.000 × 500 byte          = 5 TB/ngày (≈ 4,55 TiB)
            Trần một RDS MySQL/PostgreSQL: 64 TiB ÷ 4,55 TiB/ngày      ≈ 14 ngày là đầy đĩa
```

- **Ghi:** mỗi `INSERT` vào RDS phải ghi transaction log, cập nhật bảng và từng index. Hơn 115.000 lần như vậy mỗi giây, liên tục cả ngày, trên **một** máy primary (RDS chỉ có một node nhận ghi) là quá sức — và chưa đầy hai tuần thì hết chỗ chứa.
- **Đọc:** câu hỏi phân tích kiểu "tỷ lệ lỗi 5xx theo từng quốc gia trong 30 ngày" phải quét hàng trăm tỷ dòng nhưng chỉ cần 2–3 cột. Kiểu việc này gọi là **OLAP** (Online Analytical Processing): ít câu query, mỗi câu quét cực nhiều dòng. Lưu theo dòng thì muốn đọc 3 cột vẫn phải kéo cả dòng lên, tức đọc thừa hàng chục lần — và trong lúc đó tranh CPU, đĩa với chính các giao dịch của ứng dụng.

Thay vì một database làm tất cả, bài toán này được chia thành bốn chặng, mỗi chặng một dịch vụ chuyên việc đó:

| Chặng | Việc phải làm | Dịch vụ | Học ở |
|-------|---------------|---------|-------|
| **Ingestion** (thu nạp) | Nhận hơn 100.000 record/giây mà không rơi | Kinesis Data Streams / Firehose | §2–§3 |
| **Lưu trữ** | Chứa 5 TB/ngày, rẻ, không có trần dung lượng | S3, định dạng cột (Parquet) | §4, §9 |
| **Query** | Chạy SQL trên khối dữ liệu đó | Athena / Redshift / EMR | §4–§6 |
| **BI** (business intelligence) | Vẽ dashboard cho người không viết SQL | QuickSight | §8 |

Đây cũng là dạng câu hỏi của đề thi: cho một luồng dữ liệu kèm yêu cầu, hỏi bạn ghép dịch vụ nào. Bốn từ trong yêu cầu quyết định đáp án, nên cần hiểu đúng nghĩa của chúng:

- **Real-time:** dữ liệu được xử lý trong **dưới 1 giây** sau khi phát sinh.
- **Near-real-time:** chấp nhận trễ **vài chục giây tới vài phút**.
- **Ad-hoc:** câu hỏi phát sinh tại chỗ, không biết trước, chạy **thỉnh thoảng** — trái với báo cáo cố định chạy lặp lại hằng ngày.
- **Dashboard:** biểu đồ có sẵn, nhiều người mở xem nhiều lần, cần hiện ra nhanh.

---

## 2. Streaming ingestion — họ Kinesis

**Streaming** nghĩa là dữ liệu đến **liên tục, từng mẩu nhỏ, không có điểm kết thúc** — mỗi cú click, mỗi dòng log, mỗi lần cảm biến đo là một **record** (thường vài trăm byte tới vài KB). Trái với **batch**: gom cả ngày thành một file rồi xử lý một lần vào ban đêm.

Ba vai sẽ gặp suốt bài: **producer** là bên *ghi* record vào (web server, app mobile, thiết bị IoT); **stream** là nơi record nằm chờ; **consumer** là bên *đọc* record ra để xử lý. "Họ Kinesis" gồm ba dịch vụ làm ba việc khác nhau — **giữ**, **giao**, và **tính** — và đề thi chủ yếu hỏi bạn phân biệt ba việc đó.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 250" role="img" aria-labelledby="ki-t ki-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="ki-t">Chọn dịch vụ streaming Kinesis</title>
<desc id="ki-d">Phân nhánh Kinesis Data Streams, Firehose, Managed Service for Apache Flink theo nhu cầu</desc>
<rect x="280" y="12" width="160" height="38" rx="8" fill="currentColor" fill-opacity="0.10" stroke="currentColor"/>
<text x="360" y="36" text-anchor="middle" font-size="13" fill="currentColor">Streaming data?</text>
<rect x="20" y="95" width="210" height="60" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="125" y="116" text-anchor="middle" font-size="12" fill="currentColor">Data Streams</text>
<text x="125" y="134" text-anchor="middle" font-size="10" fill="currentColor">custom real-time, replay,</text>
<text x="125" y="148" text-anchor="middle" font-size="10" fill="currentColor">nhiều consumer, giữ 1-365 ngày</text>
<rect x="255" y="95" width="210" height="60" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="116" text-anchor="middle" font-size="12" fill="currentColor">Data Firehose</text>
<text x="360" y="134" text-anchor="middle" font-size="10" fill="currentColor">deliver near-real-time vào</text>
<text x="360" y="148" text-anchor="middle" font-size="10" fill="currentColor">S3/Redshift/OpenSearch, no-code</text>
<rect x="490" y="95" width="210" height="60" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="595" y="116" text-anchor="middle" font-size="12" fill="currentColor">Managed Flink</text>
<text x="595" y="134" text-anchor="middle" font-size="10" fill="currentColor">phân tích/biến đổi trong luồng</text>
<text x="595" y="148" text-anchor="middle" font-size="10" fill="currentColor">(SQL/Apache Flink, windowing)</text>
<line x1="330" y1="50" x2="150" y2="93" stroke="currentColor" stroke-width="1"/>
<line x1="360" y1="50" x2="360" y2="93" stroke="currentColor" stroke-width="1"/>
<line x1="390" y1="50" x2="570" y2="93" stroke="currentColor" stroke-width="1"/>
<rect x="255" y="185" width="210" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="205" text-anchor="middle" font-size="11" fill="currentColor">Cần Kafka API / hệ Kafka sẵn?</text>
<text x="360" y="221" text-anchor="middle" font-size="11" fill="currentColor">→ Amazon MSK</text>
<text x="360" y="248" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.85">Firehose = đường ống nạp lười · Data Streams = xử lý tùy biến · Flink = tính toán trong luồng</text>
</svg>

### 2.1 Kinesis Data Streams — cuốn sổ ghi nối đuôi, đọc không mất

**Nó là gì.** Một stream là một **log chỉ ghi nối đuôi** (append-only): producer ghi record vào cuối, record nằm yên ở đó theo đúng thứ tự cho tới khi hết hạn lưu. Khác hẳn một queue như SQS: ở SQS, consumer xử lý xong thì **xoá** message, người khác không đọc lại được. Ở Kinesis, **đọc không làm mất dữ liệu** — consumer chỉ di chuyển "ngón tay đánh dấu" của riêng nó dọc theo log.

Từ một đặc điểm đó suy ra hai tính chất mà đề thi hay hỏi:

- **Nhiều consumer độc lập.** Mỗi ứng dụng tự nhớ mình đã đọc tới record nào (vị trí này gọi là *checkpoint*, tính bằng *sequence number* của record). Team fraud đọc tới record thứ 1.000, team analytics mới tới record 400 — không ai ảnh hưởng ai, vì không ai xoá gì cả.
- **Replay (phát lại).** Muốn xử lý lại dữ liệu hôm qua vì code consumer có bug? Đặt lại ngón tay về thời điểm cũ rồi đọc lại. Chỉ làm được trong **thời hạn lưu (retention)**: mặc định **24 giờ**, tăng được tới **365 ngày** (trả thêm tiền lưu).

**Shard — đơn vị đo "thông lượng".** Một stream được chia thành nhiều **shard**; mỗi shard là một làn log riêng với hạn mức cố định:

| Chiều | Hạn mức **mỗi shard** |
|-------|------------------------|
| Ghi | **1 MB/giây** *hoặc* **1.000 record/giây** — chạm cái nào trước thì bị chặn cái đó |
| Đọc | **2 MB/giây** (chia chung cho mọi consumer thường của shard — xem §3.3) |

Muốn thông lượng lớn hơn thì **thêm shard**; tổng thông lượng của stream = số shard × hạn mức trên. Không có trần số shard, nên "thông lượng cao" ở đây nghĩa là: **bắt đầu từ 1 MB/s và nới ngang gần như tuỳ ý — hàng trăm MB/s tới cỡ GB/s** — bằng cách cộng thêm shard, không phải bằng cách mua máy to hơn.

**Tính thử với câu chuyện mở đầu** (10 tỷ log/ngày, giả sử mỗi log ~500 byte):

```
10.000.000.000 record ÷ 86.400 giây  ≈ 115.740 record/giây
115.740 record/s × 500 byte           ≈ 57,9 MB/giây

Số shard theo dung lượng:  57,9 MB/s ÷ 1 MB/s        → 58 shard
Số shard theo số record:   115.740 ÷ 1.000 record/s  → 116 shard
→ phải lấy số LỚN hơn: 116 shard (record nhỏ nên giới hạn 1.000 record/s chạm trước)
```

Đó là mức trung bình; giờ cao điểm gấp 3 thì cần ~350 shard. Để so sánh: một RDS instance nhận 115.000 lệnh `INSERT` mỗi giây liên tục là chuyện không thực tế — đó là lý do §1 nói "đổ hết vào RDS" là sai.

**Record vào shard nào?** Mỗi record gửi kèm một **partition key** (ví dụ `user_id`). Kinesis băm key đó để chọn shard, nên **cùng key luôn vào cùng shard** và giữ đúng thứ tự *trong shard đó*. Hệ quả: thứ tự chỉ được đảm bảo **theo từng key**, không phải toàn stream; và nếu chọn key lệch (90% record chung một key) thì một shard quá tải trong khi các shard khác rảnh — gọi là **hot shard**.

**Hai chế độ dung lượng:**

| | **Provisioned** | **On-demand** |
|--|-----------------|---------------|
| Ai chọn số shard | **Bạn** tự tính (như phép tính trên) và tự tăng/giảm | **AWS** tự thêm/bớt shard theo tải |
| Vượt hạn mức | Lỗi `ProvisionedThroughputExceededException`, producer phải retry | Stream mới có sẵn 4 MB/s ghi; tự nới để chịu được **gấp đôi đỉnh tải** của 30 ngày gần nhất |
| Trả tiền | Theo **shard-giờ** (trả cả khi shard rảnh) | Theo **GB** ghi/đọc thực tế |
| Hợp khi | Tải đều, đoán trước được → rẻ hơn | Tải khó đoán, tăng vọt thất thường, không muốn tính shard |

**"Real-time" là nhanh cỡ nào?** Record ghi xong thì consumer đọc được sau **dưới 1 giây** (thường ~200 ms; ~70 ms nếu dùng Enhanced Fan-Out ở §3.3). So với Firehose bên dưới là vài chục giây tới vài phút.

**Cái giá phải trả: bạn tự viết phần đọc.** Kinesis Data Streams chỉ *giữ* dữ liệu, không tự đưa đi đâu cả. Phải có một consumer do bạn dựng: một **Lambda** (gắn stream làm event source), một ứng dụng dùng thư viện **KCL** chạy trên EC2/ECS (KCL lo việc chia shard giữa các worker và lưu checkpoint vào DynamoDB), một job **Flink**, hoặc gắn **Firehose** vào để đổ ra S3.

> 📏 Kích thước một record: đề thi và hầu hết tài liệu dùng con số **tối đa 1 MB/record**. Docs hiện tại đã nới lên tới **10 MiB** cho các record lớn thỉnh thoảng xuất hiện, nhưng hạn mức ghi của shard vẫn là 1 MB/s — Kinesis vẫn là dịch vụ cho **rất nhiều record nhỏ**, không phải để chuyển file.

### 2.2 Data Firehose — băng chuyền tự đổ dữ liệu vào kho

(Tên cũ: *Kinesis Data Firehose*; nay là **Amazon Data Firehose** — đề thi dùng cả hai.)

**Nó là gì.** Firehose **không lưu** dữ liệu và **không có consumer**. Nó là một băng chuyền một chiều: nhận record ở đầu vào, **gom thành lô**, rồi tự ghi lô đó vào **một đích** bạn chọn sẵn. Bạn không viết dòng code đọc nào, không tính shard — nó tự scale theo lượng dữ liệu vào và tính tiền theo GB nạp.

- **Đầu vào:** ứng dụng gọi thẳng API (`PutRecord`), hoặc Firehose tự đọc từ một **Kinesis Data Stream**, MSK, CloudWatch Logs…
- **Đích:** **S3**, **Redshift** (thực chất ghi ra S3 rồi chạy lệnh `COPY` vào Redshift), **OpenSearch**, **Splunk**, hoặc một HTTP endpoint (Datadog, New Relic…).

**Vì sao gọi là "near-real-time" chứ không phải real-time?** Vì bước gom lô (buffer). Firehose giữ record trong bộ đệm và chỉ xả ra đích khi **một trong hai** điều kiện xảy ra trước: bộ đệm **đủ dung lượng** hoặc **đủ thời gian**. Với đích S3, mặc định là **5 MB hoặc 300 giây**.

```
Tải lớn  (2 MB/giây):  bộ đệm 5 MB đầy sau ~2,5 giây   → cứ ~2,5 giây có một file mới trên S3
Tải nhỏ  (1 KB/giây):  5 MB phải ~83 phút mới đầy       → điều kiện 300 giây chạm trước,
                                                          dữ liệu nằm chờ tới 5 phút mới tới S3
```

Gom lô là chủ đích: ghi 1 file 5 MB lên S3 rẻ và dễ query hơn nhiều so với ghi 10.000 file 500 byte. Cái giá là độ trễ. Đề thi coi Firehose có độ trễ **khoảng 60 giây trở lên** (mức tối thiểu trong nhiều năm). Hiện nay có thể hạ thời gian đệm xuống 0 để giao trong vài giây, nhưng **bản chất không đổi**: nó vẫn chỉ giao hàng tới một đích, không cho bạn chạy logic riêng trên từng record.

**Làm được gì trên đường đi:**
- **Transform bằng Lambda:** mỗi lô đi qua một hàm Lambda của bạn để lọc, che dữ liệu nhạy cảm, đổi định dạng.
- **Convert JSON → Parquet/ORC** ngay trong đường ống (lấy schema từ Glue Data Catalog) — để Athena query rẻ hơn, xem §4.1.
- **Nén** (gzip, snappy) và ghi theo prefix ngày/giờ trên S3.

**Không làm được:** không replay (giao xong là hết, Firehose không giữ bản nào), không có nhiều consumer đọc độc lập.

> 💡 Hai dịch vụ này hay đi **cùng nhau** chứ không loại trừ nhau: producer → **Data Streams** (giữ 7 ngày, team fraud đọc real-time bằng Lambda) → **Firehose** gắn vào chính stream đó → **S3** (lưu lâu dài cho analytics). Một luồng, hai nhu cầu.

### 2.3 Managed Service for Apache Flink — tính toán ngay khi dữ liệu đang chảy

(Tên cũ: *Kinesis Data Analytics*.)

Hai dịch vụ trên chỉ **vận chuyển** dữ liệu. Câu hỏi kiểu *"trong 1 phút vừa qua có bao nhiêu đơn hàng?"* hay *"IP nào đăng nhập sai quá 5 lần trong 60 giây?"* thì cần một thứ **nhớ được trạng thái qua nhiều record** — đó là việc của Flink.

- **Windowing (cửa sổ thời gian):** stream là vô tận nên không thể "`COUNT(*)` cả bảng". Flink cắt dòng chảy thành các khoảng — ví dụ cửa sổ 1 phút: 10:00–10:01, 10:01–10:02… — rồi tính tổng/đếm/trung bình **trên từng cửa sổ** và phát kết quả ra ngay khi cửa sổ đóng.
- **Đọc từ** Kinesis Data Streams hoặc MSK; **ghi kết quả ra** một stream khác, Firehose, S3…
- AWS lo cụm Flink (cấp máy, scale, lưu snapshot trạng thái để khôi phục khi lỗi); bạn chỉ nộp code Flink (Java/Python/SQL của Flink).

Vì sao không dùng Lambda cho việc này? Lambda xử lý từng lô record rồi **quên hết**; muốn đếm qua nhiều lô bạn phải tự lưu bộ đếm ra DynamoDB/Redis. Flink giữ trạng thái đó sẵn trong bộ máy của nó.

### 2.4 Đặt ba dịch vụ cạnh nhau

| | **Data Streams** | **Data Firehose** | **Managed Flink** |
|--|------------------|-------------------|-------------------|
| Vai trò | **Giữ** dữ liệu streaming để nhiều bên đọc | **Giao** dữ liệu vào kho | **Tính toán** trên dữ liệu đang chảy |
| Độ trễ | Dưới 1 giây | Vài giây → vài phút (do gom lô) | Dưới giây → vài giây (theo cửa sổ) |
| Lưu dữ liệu / replay | Có: 24 giờ → 365 ngày | Không | Không (chỉ giữ trạng thái tính toán) |
| Bạn phải viết code? | Có — consumer | Không (Lambda transform là tuỳ chọn) | Có — job Flink |
| Scale | Shard (tự tính, hoặc on-demand) | Tự động hoàn toàn | AWS scale cụm Flink |
| Đích đến | Bất kỳ, do consumer của bạn quyết định | S3, Redshift, OpenSearch, Splunk, HTTP | Stream khác, Firehose, S3 |

> 🪤 Bẫy thi: *"nạp streaming data vào S3/Redshift near-real-time, ít vận hành nhất"* → **Firehose**. *"nhiều app xử lý real-time độc lập + replay được"* → **Data Streams**. *"tính toán cửa sổ thời gian trong luồng"* → **Managed Flink**. *"đã có hệ Kafka / cần Kafka API"* → **MSK**.
>
> Còn *"mỗi message chỉ một worker xử lý, xong thì xoá, không cần thứ tự/replay"* thì không phải Kinesis mà là **SQS** — so sánh chi tiết ở bài resilient-01.

---

## 3. MSK vs Kinesis Data Streams, và Enhanced Fan-Out

### 3.1 Amazon MSK (Managed Streaming for Apache Kafka)

**Kafka trong ba câu.** Apache Kafka là phần mềm mã nguồn mở làm đúng việc của Kinesis Data Streams: một log ghi nối đuôi, nhiều consumer đọc độc lập, replay được. Một máy chủ chạy Kafka gọi là **broker**; vài broker gộp lại thành một cluster. Dữ liệu được ghi vào **topic** (tương đương một *stream* của Kinesis), mỗi topic chia thành nhiều **partition** (tương đương *shard*: một làn log riêng, giữ thứ tự theo key trong làn đó).

**MSK là gì.** MSK chạy **Apache Kafka thật** trên hạ tầng AWS. AWS lo phần nặng nhọc của việc nuôi cluster: dựng và thay broker hỏng, vá phiên bản, rải broker qua nhiều AZ, và vận hành ZooKeeper/KRaft — thành phần giữ metadata của cluster (broker nào còn sống, partition nào nằm ở đâu). Phần còn lại vẫn là Kafka nguyên bản, nên client dùng **đúng Kafka API/protocol**: `kafka-console-producer`, Kafka Connect (bộ connector đọc/ghi sang hệ khác), Kafka Streams, Spark Structured Streaming, Debezium (công cụ CDC — bắt thay đổi từ database rồi đẩy vào Kafka)… đều cắm thẳng vào, **không phải viết lại code**.

Đó là lý do duy nhất nhưng rất mạnh để chọn MSK: **đã có hệ Kafka on-prem cần lift-and-shift**, hoặc **bắt buộc dùng thư viện/ecosystem Kafka**. Kinesis có API riêng của AWS, nên chuyển một hệ Kafka sang Kinesis nghĩa là sửa mọi producer và consumer.

**Khác Kinesis ở những điểm đề thi hay dùng:**

- **Đơn vị song song.** Shard của Kinesis có hạn mức do AWS đặt cứng (1 MB/s ghi). Partition của Kafka không có con số cố định như vậy: bạn tự chọn số partition cho mỗi topic, còn thông lượng phụ thuộc vào cỡ broker, đĩa và mạng mà bạn chọn. Linh hoạt hơn, đổi lại bạn phải tự tune.
- **Kích thước message.** Mặc định của Kafka là **1 MB**, nhưng **cấu hình tăng được** (`message.max.bytes`). Kinesis thì đề thi coi **1 MB/record là trần** (docs hiện tại đã nới tới 10 MiB, xem §2.1, nhưng shard vẫn chỉ ghi 1 MB/s nên record lớn vẫn là ngoại lệ). Đề hay dùng chi tiết "message lớn hơn 1 MB" để đẩy về MSK.
- **Retention.** Kafka giữ dữ liệu theo cấu hình của bạn. Với **tiered storage**, MSK tự chuyển dữ liệu cũ từ đĩa của broker sang một tầng lưu trữ rẻ hơn, dung lượng gần như không giới hạn — nên giữ được lâu tuỳ ý. Kinesis Data Streams tối đa **365 ngày**.

**Hai biến thể giảm vận hành:**

- **MSK Serverless:** không phải chọn cỡ broker hay số broker, cluster tự scale theo thông lượng. Dùng khi tải khó đoán mà vẫn cần Kafka API.
- **MSK Connect:** chạy các connector của Kafka Connect dưới dạng managed (ví dụ sink đổ topic sang S3, OpenSearch) — bạn không phải dựng máy chạy connector.

### 3.2 Bảng quyết định MSK vs Kinesis Data Streams

| | **Kinesis Data Streams** | **Amazon MSK** |
|--|--------------------------|----------------|
| API | API riêng của AWS (PutRecord / KCL / Lambda ESM) | **Apache Kafka API** chuẩn |
| Đơn vị scale | **Shard**: 1 MB/s ghi, 2 MB/s đọc mỗi shard | **Partition**: tự chọn số lượng, tự tune |
| Vận hành | Serverless nhất (nhất là **on-demand mode**) | Phải chọn broker/size (trừ MSK Serverless), vẫn phải hiểu Kafka |
| Trần record | **1 MB/record** theo đề thi (nay tới 10 MiB, không dành cho record lớn thường xuyên) | Mặc định 1 MB, **cấu hình tăng được** |
| Retention | 1–365 ngày | Cấu hình tự do, có tiered storage giữ rất lâu |
| Khi nào chọn | Mặc định trên AWS: nhanh, ít vận hành, tích hợp sẵn Firehose/Lambda/Flink | **Đã có Kafka**, cần Kafka Connect/Streams/Debezium, cần message lớn thường xuyên |
| Bẫy | Thêm consumer mà không bật EFO → tranh nhau 2 MB/s (xem §3.3) | Chọn MSK chỉ vì "streaming" trong khi đề không hề nhắc Kafka → thừa vận hành |

> 🪤 Bẫy thi: đề **không** nhắc chữ *Kafka*, *Kafka Connect*, *migrate cụm Kafka on-prem* mà bạn chọn MSK thì thường sai — mặc định của exam là **Kinesis** vì "ít vận hành nhất".

### 3.3 Enhanced Fan-Out (EFO) — khi nhiều consumer tranh nhau một shard

**Standard consumer** dùng mô hình **pull**: gọi `GetRecords` theo chu kỳ. Vấn đề là mỗi shard chỉ có **2 MB/s đọc** và **5 lần gọi `GetRecords`/giây** — và con số đó **chia chung cho TẤT CẢ consumer** của shard đó. Ba ứng dụng cùng đọc → mỗi bên thực tế còn ~0,67 MB/s, và càng nhiều consumer thì càng dễ ăn `ProvisionedThroughputExceededException`, độ trễ đọc thường ~**200 ms** trở lên (chưa kể phải chờ lượt poll).

**Enhanced Fan-Out** đổi sang mô hình **push**: consumer **đăng ký** (`RegisterStreamConsumer`) rồi mở kết nối HTTP/2 bằng `SubscribeToShard`, Kinesis **chủ động đẩy** record về.

- Mỗi **EFO consumer** có **2 MB/s riêng trên mỗi shard** — không chia với ai. 5 consumer = 5 × 2 MB/s trên cùng shard.
- Tối đa **20 EFO consumer đã đăng ký cho mỗi stream**.
- Độ trễ trung bình xuống khoảng **70 ms** (HTTP/2 push, không phải chờ poll).
- Đánh đổi: **trả thêm tiền** theo consumer-shard-hour + GB dữ liệu đẩy ra.

| | **Standard consumer** | **Enhanced Fan-Out** |
|--|-----------------------|----------------------|
| Mô hình | Pull (`GetRecords`, 5 lần/giây/shard) | Push (`SubscribeToShard`, HTTP/2) |
| Băng thông đọc | **2 MB/s dùng CHUNG cho mọi consumer** của shard | **2 MB/s RIÊNG cho từng consumer**, mỗi shard |
| Độ trễ điển hình | ~200 ms trở lên | ~**70 ms** |
| Số consumer hợp lý | 1–2 | tới **20 consumer đăng ký/stream** |
| Chi phí | Đã gồm trong giá shard | Tính thêm per consumer-shard-hour + per GB |
| Khi nào chọn | Ít consumer, latency không gắt | **Nhiều app đọc cùng lúc** hoặc cần latency thấp và ổn định |

> 🪤 Bẫy thi: đề tả *"thêm ứng dụng consumer thứ ba thì các consumer cũ bị chậm / bị throttle, không được tăng số shard"* → **bật Enhanced Fan-Out**, **không** phải "thêm shard" (thêm shard tốn tiền mà vẫn chia chung băng thông) và cũng không phải "chuyển sang Firehose".

---

## 4. Athena — SQL serverless truy vấn thẳng S3

**Nó là gì.** Athena cho bạn chạy **SQL trực tiếp trên file nằm ở S3** mà không phải nạp dữ liệu vào database nào. Bạn khai báo một "bảng" — thực chất chỉ là lời mô tả: file nằm ở prefix nào, định dạng gì, có những cột nào (lời mô tả này lưu ở Glue Data Catalog, §5) — rồi viết `SELECT` như bình thường. Mỗi lần chạy, Athena tự huy động một engine SQL phân tán (Presto/Trino) đọc các file đó, trả kết quả, rồi giải phóng. Giữa hai câu query không có máy nào chạy và bạn không trả tiền gì: đó là nghĩa của **serverless** ở đây.

**Cách tính tiền quyết định cách dùng.** Athena tính theo **lượng dữ liệu phải quét**: ~**$5 cho mỗi TB** (us-east-1). Không tính theo thời gian chạy, không tính theo số dòng trả về. Hệ quả:

- Hợp với truy vấn **ad-hoc, thỉnh thoảng**: vài câu query mỗi tuần thì chỉ tốn vài đô, không phải nuôi cluster nào.
- Mọi cách tối ưu chi phí đều quy về một việc: **làm cho Athena phải đọc ít byte hơn**. Có hai công cụ — định dạng cột (§4.1) và partition (§4.2).
- Không hợp với việc chạy lặp lại dày đặc: mỗi lần chạy là quét lại S3 và trả tiền lại từ đầu (so sánh với Redshift ở §6.3).

### 4.1 CSV vs Parquet (rất hay ra đề)

Khác biệt nằm ở chỗ dữ liệu được **xếp trên đĩa theo chiều nào**:

```
CSV / JSON — xếp theo DÒNG: mọi cột của một record nằm liền nhau
  2026-10-13,u123,/home,200,Chrome,VN,... (44 cột nữa)
  2026-10-13,u456,/cart,500,Safari,US,... (44 cột nữa)

Parquet / ORC — xếp theo CỘT (columnar): mọi giá trị của một cột nằm liền nhau
  [date]    2026-10-13 | 2026-10-13 | ...
  [user]    u123       | u456       | ...
  [status]  200        | 500        | ...
```

Xét câu `SELECT status, COUNT(*) FROM clicks GROUP BY status`. Với CSV, engine không biết cột `status` nằm ở byte thứ mấy của mỗi dòng, nên phải đọc **toàn bộ file** rồi tách từng dòng — đọc 50 cột để dùng 1 cột. Với Parquet, phần cuối file có mục lục ghi vị trí từng cột, nên engine nhảy thẳng tới khối `status` và **bỏ qua 49 cột còn lại**.

Xếp theo cột còn cho hai lợi ích nữa:

- **Nén tốt hơn.** Các giá trị cùng kiểu, giống nhau nằm cạnh nhau (một cột `status` gần như toàn `200`) nên nén được nhiều hơn hẳn so với một dòng trộn ngày, chuỗi, số.
- **Bỏ qua cả khối.** Parquet ghi giá trị nhỏ nhất/lớn nhất của từng khối dữ liệu; gặp `WHERE status >= 500` thì khối nào có max là 404 được bỏ qua mà không cần đọc.

Cái giá: file Parquet không đọc được bằng mắt, và phải ghi theo lô (không nối thêm từng dòng được). Vì thế dữ liệu thô thường được nạp vào ở dạng JSON/CSV, sau đó mới chuyển sang Parquet bằng Glue ETL (§5) hoặc ngay trong Firehose (§2.2).

| | CSV/JSON (theo dòng) | **Parquet/ORC (theo cột)** |
|--|----------------------|----------------------------|
| Query cần vài cột | Phải đọc cả dòng, tức mọi cột | Chỉ đọc đúng các cột được hỏi |
| Nén | Kém (mỗi dòng trộn nhiều kiểu dữ liệu) | Tốt (nén riêng từng cột) |
| Chi phí Athena / Redshift Spectrum | Cao: trả tiền cho cả những cột không dùng | Thấp: lượng byte quét giảm nhiều lần (tính thử ở §4.3) |
| Ghi | Nối thêm từng dòng được, đọc được bằng mắt | Ghi theo lô, cần công cụ để đọc |
| Hợp cho | Nạp dữ liệu thô, trao đổi giữa các hệ thống | **Phân tích / OLAP** |

### 4.2 Partition — chia dữ liệu theo thư mục để khỏi quét thừa

Định dạng cột giúp bỏ qua **cột** không cần. **Partition** giúp bỏ qua cả **file** không cần: dữ liệu được chia vào các prefix S3 theo giá trị của một cột hay bị lọc, thường là ngày.

```
s3://my-logs/clicks/dt=2026-10-12/part-0001.parquet
s3://my-logs/clicks/dt=2026-10-13/part-0001.parquet
s3://my-logs/clicks/dt=2026-10-13/part-0002.parquet
```

Khi bảng được khai báo là partition theo `dt`, câu `... WHERE dt = '2026-10-13'` khiến Athena **chỉ mở các file dưới prefix `dt=2026-10-13/`**; 29 ngày còn lại không bị đọc và không bị tính tiền. `dt` dùng được như một cột bình thường dù nó nằm trong đường dẫn chứ không nằm trong file.

Hai điều cần biết khi dùng:

- **Partition phải được đăng ký trong Data Catalog** thì Athena mới thấy. Có thể để **Glue crawler** tự phát hiện (§5), chạy `MSCK REPAIR TABLE` (với đường dẫn dạng `key=value` như trên), thêm tay bằng `ALTER TABLE ADD PARTITION`, hoặc bật **partition projection** để Athena tự suy ra partition từ quy tắc đặt tên mà không cần đăng ký. Triệu chứng kinh điển: file của ngày mới đã có trên S3 nhưng query không trả về dòng nào — vì partition đó chưa được đăng ký.
- **Chọn cột partition theo cách bạn hay lọc**, và đừng chia quá mịn. Partition theo `user_id` sẽ sinh hàng triệu thư mục chứa file tí hon, làm query chậm đi chứ không nhanh lên.

### 4.3 Tính thử: partition + Parquet tiết kiệm bao nhiêu

```
Dữ liệu: 30 ngày log = 1 TB CSV, 50 cột.   Câu query: 3 cột, của 1 ngày.

CSV, không partition:    quét cả 1 TB                       1 TB × $5        = $5,00
+ partition theo ngày:   1 TB ÷ 30 ≈ 33,3 GB                0,0333 TB × $5   ≈ $0,17
+ chuyển sang Parquet:   nén ~3:1 → 33,3 ÷ 3 ≈ 11,1 GB
                         chỉ đọc 3/50 cột → ≈ 0,67 GB       0,00067 TB × $5  ≈ $0,003
```

Từ 1 TB xuống 0,67 GB là giảm khoảng **1.500 lần** (99,9%). Tỉ lệ nén 3:1 và giả định "các cột to bằng nhau" là ước lượng — dữ liệu thật sẽ khác — nhưng bậc độ lớn thì đúng, và đó là lý do các tài liệu thường nói gọn là "giảm trên 90%".

> 💡 Athena tính tiền theo **lượng dữ liệu quét**. Chuyển CSV → **Parquet** (columnar, nén) + **partition theo ngày** giảm **trên 90%** dữ liệu quét, nên vừa rẻ hơn vừa nhanh hơn. Trong đề thi, "giảm chi phí Athena" gần như luôn có đáp án là hai việc này.

> 🪤 Bẫy thi: *"query log trên S3 thỉnh thoảng, không muốn quản hạ tầng"* → **Athena**. Đáp án nhiễu thường là "nạp vào Redshift/RDS rồi query" (đúng về kỹ thuật, thừa vận hành) hoặc "dựng cụm EMR". Còn *"query Athena chậm và đắt"* → đáp án là **Parquet + partition**, không phải đổi sang dịch vụ khác.

---

## 5. AWS Glue — ETL serverless + Data Catalog

**Bài toán.** S3 chỉ biết *object*: một đống file trong một bucket. Nó không biết "bảng `clicks` gồm cột `status` kiểu số". Để Athena chạy được `SELECT status FROM clicks`, phải có ai đó trả lời bốn câu: file nằm ở đâu, định dạng gì, gồm những cột nào kiểu gì, chia partition ra sao. Phần mô tả đó gọi là **metadata**. Glue là dịch vụ lo metadata, cộng thêm việc biến đổi dữ liệu. Nó gồm ba mảnh làm ba việc khác nhau.

### 5.1 Glue Data Catalog — nơi ghi "bảng này là gì, nằm ở đâu"

Catalog tổ chức như một database thông thường: *database* → *table* → danh sách cột, kiểu dữ liệu, định dạng file, đường dẫn S3 và danh sách partition. Nó **chỉ chứa mô tả**; dữ liệu vẫn nằm nguyên ở S3.

Điểm đáng giá là nó **dùng chung**: Athena, Redshift Spectrum (§6.1), EMR (§6.2), Glue ETL và cả Firehose (khi convert sang Parquet, §2.2) đều đọc cùng một định nghĩa bảng. Khai báo một lần, mọi engine cùng hiểu, không có chuyện mỗi công cụ một bản schema lệch nhau. Catalog tương thích với Hive metastore — chuẩn metadata của hệ sinh thái Hadoop/Spark — nên các công cụ đó cắm vào được mà không cần sửa.

### 5.2 Glue Crawler — tự đọc file để điền Catalog

Viết tay định nghĩa bảng cho hàng trăm bộ dữ liệu thì mệt và dễ sai. **Crawler** làm thay:

1. Bạn chỉ cho nó một đường dẫn S3 (hoặc một database qua JDBC).
2. Nó mở các file ở đó và chạy qua các **classifier** — bộ nhận dạng định dạng (có sẵn cho JSON, CSV, Avro, Parquet…) — để suy ra định dạng, tên cột và kiểu dữ liệu.
3. Nó nhìn cấu trúc thư mục để nhận ra partition: thấy `year=2019/month=Jan/day=1/` thì tạo **một bảng** với ba khoá partition `year`, `month`, `day`.
4. Nó ghi (hoặc cập nhật) định nghĩa bảng vào Data Catalog.

Crawler chạy **khi bạn bấm** hoặc **theo lịch** (ví dụ mỗi giờ). Lần chạy sau nó dò file mới/đổi để thêm partition mới và cập nhật schema. Crawler **không di chuyển hay biến đổi dữ liệu** — nó chỉ đọc để mô tả.

### 5.3 Glue ETL — job Spark không cần quản server

**ETL** là Extract – Transform – Load: lấy dữ liệu ra, biến đổi, ghi vào chỗ mới. Việc điển hình trong data lake: đọc JSON/CSV thô, bỏ dòng hỏng, join với bảng khác, rồi ghi ra **Parquet đã partition**.

Một Glue job là một script **Apache Spark** (engine xử lý dữ liệu phân tán: chia một việc lớn cho nhiều máy làm song song) viết bằng Python hoặc Scala. AWS tự dựng cụm Spark khi job chạy và dẹp khi job xong; bạn chỉ chọn số worker. Tiền tính theo **DPU-giờ**: 1 DPU (Data Processing Unit) = 4 vCPU + 16 GB RAM, giá ~**$0,44/DPU-giờ** (us-east-1), tính theo giây.

```
Job đổi CSV → Parquet cho dữ liệu của một giờ: 10 DPU, chạy 15 phút
10 DPU × 0,25 giờ = 2,5 DPU-giờ × $0,44 ≈ $1,10 mỗi lần chạy
```

Job được kích hoạt bằng **trigger**: theo lịch, chạy tay, hoặc theo sự kiện (một job/crawler khác vừa xong, hoặc một event từ EventBridge). Tính năng hay gặp trong đề là **job bookmark**: Glue nhớ những dữ liệu đã xử lý ở lần chạy trước, để lần sau chỉ xử lý phần **mới**, không làm lại từ đầu.

| Mảnh | Làm gì | Không làm gì | Từ khoá đề |
|------|--------|--------------|------------|
| **Data Catalog** | Lưu định nghĩa bảng (schema, vị trí, partition) dùng chung cho mọi engine | Không chứa dữ liệu | *"kho metadata trung tâm"*, *"Athena và EMR dùng chung schema"* |
| **Crawler** | Tự suy schema và partition từ file rồi ghi vào Catalog | Không biến đổi dữ liệu | *"tự động phát hiện schema"*, *"schema thay đổi theo thời gian"* |
| **ETL job** | Biến đổi dữ liệu bằng Spark serverless (CSV → Parquet, làm sạch, join) | Không phải nơi lưu, không phải nơi query | *"chuyển định dạng với ít vận hành nhất"*, *"chỉ xử lý dữ liệu mới"* (job bookmark) |

> 🪤 Bẫy thi: *"đổi CSV sang Parquet, ít vận hành nhất"* → **Glue ETL**, không phải "dựng cụm EMR" (làm được nhưng phải quản cluster, xem §6.2). Nếu dữ liệu đang chảy qua **Firehose** thì bật convert Parquet ngay trong Firehose còn ít việc hơn nữa. Và đừng nhầm vai: Crawler **mô tả**, ETL job **biến đổi**, Athena **query**.

---

## 6. Data warehouse & big-data engines

Athena trả tiền theo lần quét và không giữ gì giữa các lần chạy. Hai dịch vụ dưới đây đi theo hướng ngược lại: **giữ sẵn một cụm máy** để đổi lấy tốc độ ổn định (Redshift) hoặc quyền tuỳ biến toàn bộ (EMR).

### 6.1 Amazon Redshift

**Nó là gì.** Redshift là một **data warehouse**: database chuyên cho OLAP (xem §1), nơi dữ liệu có cấu trúc từ nhiều nguồn được **nạp vào sẵn** để chạy báo cáo và BI. Nó nói SQL và dựa trên PostgreSQL nên các công cụ SQL/BI quen thuộc kết nối được ngay.

**Vì sao nó nhanh với query phân tích** — ba cơ chế chồng lên nhau:

- **Columnar.** Lưu theo cột như Parquet (§4.1): query cần 3 cột thì chỉ đọc 3 cột.
- **MPP — Massively Parallel Processing.** Một cluster gồm một **leader node** và nhiều **compute node**. Leader nhận câu SQL, lập kế hoạch, chia việc; mỗi compute node xử lý phần dữ liệu của mình **song song** bằng CPU và bộ nhớ riêng, rồi gửi kết quả về cho leader gộp lại. Cần nhanh hơn thì thêm node.
- **Dữ liệu được sắp sẵn cho query.** Khi tạo bảng bạn chọn **distribution key** (cột quyết định dòng nào nằm ở node nào — hai bảng hay join với nhau mà chia theo cùng key thì join ngay tại node, không phải chuyển dữ liệu qua lại) và **sort key** (dữ liệu được lưu theo thứ tự cột này, nên lọc theo khoảng ngày thì bỏ qua được phần lớn các khối).

**Vì sao hợp với việc lặp lại, còn Athena thì không.** Athena mỗi lần chạy đều đọc lại file từ S3 và tính tiền lại theo TB. Redshift đã có dữ liệu nằm sẵn trong cluster, ở định dạng riêng đã sắp xếp và có thống kê, nên dashboard chạy 200 lần một ngày vẫn nhanh đều và **không phát sinh tiền theo từng lần query**. Cái giá là bạn phải **nạp dữ liệu vào trước** (lệnh `COPY` đọc song song từ S3) và trả tiền cluster kể cả lúc không ai hỏi.

**Ba biến thể cần biết:**

- **Redshift Spectrum.** Cho cluster Redshift query thẳng file trên S3 (qua định nghĩa bảng trong Glue Data Catalog) mà **không cần nạp vào**, và join được với bảng đã nạp. Dùng khi dữ liệu nóng nằm trong Redshift, còn vài năm dữ liệu cũ để ở S3 cho rẻ. Phần Spectrum tính như Athena: ~$5/TB quét.
- **Redshift Serverless.** Không chọn node, không nuôi cluster 24/7. Dung lượng tính bằng **RPU** (Redshift Processing Unit), trả theo RPU-giờ, tính từng giây **chỉ khi có query chạy** (~$0,375/RPU-giờ ở us-east-1, tối thiểu 4 RPU). Hợp với tải thất thường hoặc khó đoán.
- **Node RA3 / managed storage.** Compute và dung lượng lưu trữ scale tách rời nhau: dữ liệu nằm ở tầng lưu trữ dựa trên S3, SSD trên node làm cache. Không phải mua thêm node chỉ vì hết đĩa.

### 6.2 Amazon EMR

**Nó là gì.** EMR dựng cho bạn một **cụm EC2 cài sẵn các framework big-data mã nguồn mở**: Apache **Spark** (xử lý dữ liệu phân tán trong bộ nhớ), **Hadoop** (thế hệ trước, gồm hệ file phân tán HDFS và bộ điều phối tài nguyên YARN), **Hive** (SQL chạy trên Hadoop), **Presto/Trino** (engine SQL phân tán), HBase, Flink… Khác với Glue hay Athena, **cluster là của bạn**: bạn chọn phiên bản framework, loại instance, cấu hình từng tham số, SSH vào được.

**Cấu trúc cụm** — đề thi hỏi phần này dưới góc chi phí:

| Loại node | Vai trò | Giữ dữ liệu HDFS? | Nên chạy bằng |
|-----------|---------|-------------------|---------------|
| **Primary** | Điều phối cluster, theo dõi job | Không (giữ metadata) | On-Demand |
| **Core** | Chạy job **và** lưu dữ liệu HDFS | Có — mất node là có nguy cơ mất dữ liệu | On-Demand |
| **Task** | Chỉ thêm sức tính toán | Không | **Spot** — bị thu hồi thì chỉ chậm đi, không mất dữ liệu |

Dữ liệu đầu vào/đầu ra thường để ở **S3** chứ không để trong HDFS của cụm, nên cụm có thể là **tạm thời** (transient): dựng lên, chạy job vài giờ, rồi xoá — chỉ trả tiền EC2 trong lúc chạy. Ngoài kiểu chạy trên EC2 còn có **EMR Serverless** (không quản cluster) và **EMR on EKS** (chạy Spark trên cụm Kubernetes có sẵn).

**Khi nào EMR chứ không phải Glue ETL?** Cả hai đều chạy Spark. Glue hợp với ETL thông thường và ít vận hành nhất. Chọn EMR khi cần **kiểm soát**: một phiên bản hoặc framework cụ thể (Hive, HBase, Presto), đang **chuyển cụm Hadoop/Spark on-prem** lên AWS mà không muốn viết lại job, hoặc job rất lớn, chạy dài — cỡ hàng trăm TB tới petabyte — nơi việc tự chọn instance và dùng Spot tiết kiệm đáng kể.

### 6.3 Redshift vs Athena vs EMR — bảng quyết định

| | **Redshift** | **Athena** | **EMR** |
|--|-------------|-----------|---------|
| Mô hình | Data warehouse: dữ liệu **nạp sẵn** vào cluster (hoặc serverless) | Engine SQL serverless **đọc thẳng file S3** mỗi lần query | Cụm Hadoop/Spark **của bạn** trên EC2 |
| Hợp khi | BI/báo cáo **lặp lại** hằng ngày, join phức tạp nhiều bảng, cần tốc độ ổn định | Ad-hoc, **thỉnh thoảng**, không muốn quản gì | Xử lý **tuỳ biến** bằng Spark/Hadoop, ML, transform rất lớn, migrate Hadoop on-prem |
| Chi phí | Theo node-giờ (trả cả lúc rảnh), hoặc RPU-giờ khi có query (Serverless) | ~$5 mỗi TB quét, không query thì không tốn | Theo EC2 + phí EMR trong lúc cụm chạy; giảm bằng Spot cho task node |
| Vận hành | Vừa: thiết kế bảng, sort/dist key, nạp dữ liệu | Thấp nhất: chỉ cần định nghĩa bảng | Cao nhất: chọn instance, phiên bản, cấu hình, scale |

**Tính thử điểm chuyển từ Athena sang Redshift** (giả định để hình dung, không phải báo giá):

```
Dashboard chạy 200 query/ngày, mỗi query quét 50 GB trên S3:
  Athena:               200 × 50 GB = 10 TB/ngày × $5  = $50/ngày  ≈ $1.500/tháng
  Redshift Serverless:  8 RPU, tổng thời gian có query chạy ~4 giờ/ngày
                        8 × $0,375 × 4 giờ             = $12/ngày  ≈ $360/tháng
Cùng dashboard nhưng chỉ 5 query/ngày:
  Athena:               5 × 50 GB = 0,25 TB × $5       = $1,25/ngày ≈ $37,50/tháng
```

Query càng lặp lại nhiều trên cùng một khối dữ liệu thì warehouse càng có lợi; càng thưa thì trả theo lần quét càng rẻ.

> 🪤 Bẫy thi: *"query S3 thỉnh thoảng, không muốn hạ tầng"* → **Athena**. *"BI dashboard chạy hằng ngày, nhiều join"* → **Redshift**. *"cần Apache Spark/Hadoop cụ thể"* hoặc *"migrate cụm Hadoop on-prem"* → **EMR**. *"dữ liệu chính trong Redshift, cần join thêm với dữ liệu cũ nằm ở S3 mà không nạp vào"* → **Redshift Spectrum**.

---

## 7. Amazon OpenSearch Service — search & log analytics near-real-time

Athena hợp với "quét cả đống file S3 bằng SQL, thỉnh thoảng". Nhưng khi yêu cầu là **tìm kiếm full-text** hoặc **soi log vừa xảy ra vài giây trước trên dashboard**, Athena chậm và đắt vì mỗi lần hỏi là mỗi lần quét lại S3. Đó là chỗ của **OpenSearch Service** (ELK managed).

**Vì sao nó tìm nhanh: index.** Khi một document (một dòng log, một sản phẩm) được nạp vào, OpenSearch tách nó thành từng từ và ghi vào một **inverted index** — bảng tra ngược "từ này xuất hiện trong những document nào", giống mục lục tra cứu cuối sách. Tìm `timeout` thì chỉ cần tra bảng đó chứ không phải đọc lại mọi dòng log. Việc lập index tốn công lúc **ghi**, đổi lại lúc **đọc** gần như tức thì; document thường tìm được **trong vài giây** sau khi nạp, nên gọi là **near-real-time**. Nhờ vậy nó hợp cho **log analytics, observability, full-text search và dashboard cập nhật liên tục** bằng **OpenSearch Dashboards** (tên cũ: Kibana).

**Đường nạp chuẩn trong pipeline:**

- **Firehose → OpenSearch** (xem §2.2).
- **CloudWatch Logs subscription filter → Lambda/Firehose → OpenSearch**, khi nguồn là log đã nằm trong CloudWatch.
- **OpenSearch Ingestion**: pipeline nạp dữ liệu managed (dựa trên Data Prepper), khỏi tự dựng tầng trung gian.

**Chi phí và các tầng lưu trữ.** Một domain OpenSearch là một **cụm node chạy 24/7** (data node chứa index, master node điều phối), nên tiền tính theo giờ chạy của node chứ không theo từng query như Athena. Log thì cứ dồn lên mỗi ngày, mà giữ tất cả trên node thường thì tốn: ở tầng **hot**, một shard 20 GiB kèm một bản replica chiếm khoảng 58 GiB đĩa (do replica và phần dự trữ của hệ thống). Vì thế có thêm hai tầng rẻ hơn cho index cũ:

| Tầng | Dữ liệu nằm ở đâu | Ghi / query được không | Dùng cho |
|------|-------------------|------------------------|----------|
| **Hot** | Đĩa EBS/instance store gắn trên data node | Ghi và query, nhanh nhất | Log mới, đang được ghi và soi liên tục |
| **UltraWarm** | **S3**, có node UltraWarm làm cache và chạy query | **Chỉ đọc**, query bằng đúng API cũ nhưng chậm hơn hot | Log vài tuần/tháng tuổi, thỉnh thoảng xem. Không cần replica: shard 20 GiB chỉ tính 20 GiB |
| **Cold storage** | **S3**, không gắn compute nào | **Không query được** cho tới khi chuyển ngược về UltraWarm | Log phải giữ vì compliance, hiếm khi đụng tới |

**OpenSearch Serverless.** Không chọn node, không sizing: bạn tạo một *collection* (kiểu *time series* cho log, kiểu *search* cho tìm kiếm) và dịch vụ tự scale. Dung lượng tính bằng **OCU** (OpenSearch Compute Unit): mỗi OCU là 6 GiB bộ nhớ kèm vCPU tương ứng, tính riêng cho phần indexing và phần search, trả theo OCU-giờ. Dùng khi tải bập bênh hoặc không muốn tự tính cỡ cluster.

**Bảo mật.** Đặt domain **trong VPC** (không có endpoint public), bật fine-grained access control (phân quyền tới mức index, document, field), mã hoá at rest và in transit.

### 7.1 OpenSearch vs Athena vs Kendra

| | **OpenSearch Service** | **Athena** | **Kendra** |
|--|------------------------|-----------|-----------|
| Bản chất | Search/analytics engine **có index** | SQL serverless **quét thẳng S3** | **Enterprise search bằng ML**, hỏi bằng câu tự nhiên |
| Truy vấn | Full-text, filter, aggregation, dashboard | SQL (Presto/Trino) ad-hoc | Câu hỏi ngôn ngữ tự nhiên → trả **câu trả lời**, không chỉ danh sách link |
| Độ trễ dữ liệu | Near-real-time (vài giây) | Theo file đã nằm ở S3 | Theo lịch sync của connector |
| Chi phí | Cluster chạy liên tục (hoặc OCU serverless) | **Per-TB quét** | Theo **index-hour** của edition (Developer/Enterprise) |
| Từ khoá đề | *"log analytics"*, *"Kibana/dashboard real-time"*, *"full-text search"* | *"ad-hoc SQL trên S3"*, *"không muốn hạ tầng"* | *"nhân viên hỏi bằng ngôn ngữ tự nhiên"*, *"tìm trong tài liệu nội bộ SharePoint/S3"* |
| Bẫy | Dùng OpenSearch làm nơi lưu trữ dài hạn thay S3 → đắt; hãy để index cũ sang UltraWarm/cold | Dùng Athena làm dashboard refresh mỗi phút → tiền quét S3 phình to | Nhầm Kendra với OpenSearch khi đề nhấn *"natural language"* |

> 🪤 Bẫy thi: *"search bar cho người dùng gõ từ khoá, kết quả tức thì"* → **OpenSearch**. *"nhân viên hỏi 'chính sách nghỉ phép thế nào?' trên kho tài liệu nội bộ"* → **Kendra**. *"analyst chạy SQL vài lần một tuần trên log S3"* → **Athena**.

---

## 8. Lake Formation & QuickSight

Hai dịch vụ này nằm ở hai đầu của data lake: Lake Formation quyết định **ai được thấy gì**, QuickSight là nơi người dùng cuối **nhìn thấy** dữ liệu.

### 8.1 AWS Lake Formation — phân quyền data lake theo bảng, cột, dòng

**Data lake** là kho dữ liệu đặt trên S3, chứa đủ loại dữ liệu ở dạng file, được mô tả bằng Glue Data Catalog và query bằng nhiều engine.

**Bài toán.** IAM policy và bucket policy chỉ hiểu **object và prefix**: cho đọc file hay không. Nhưng một file Parquet của bảng `employees` chứa **mọi cột**, kể cả `salary`. Đã cấp `s3:GetObject` thì đọc được tất cả; không có cách nào viết "được đọc file này trừ cột lương" bằng bucket policy. Muốn làm bằng IAM thuần, bạn phải tạo một bản sao dữ liệu đã bỏ cột đó cho từng nhóm người dùng, rồi giữ đồng bộ quyền ở ba nơi: IAM, bucket policy, Glue.

**Cách Lake Formation giải.** Bạn đăng ký vị trí S3 với Lake Formation rồi cấp quyền **theo kiểu database**, trên các bảng của Data Catalog: `SELECT` trên bảng nào, cột nào. Ba mức lọc:

- **Column-level:** nhóm analyst thấy bảng `employees` nhưng không có cột `salary`.
- **Row-level:** HR chi nhánh Việt Nam chỉ thấy các dòng có `country = 'VN'`.
- **Cell-level:** kết hợp cả hai — cột địa chỉ bị ẩn với dòng của nước này nhưng hiện với nước khác.

Người dùng **không cần quyền S3 trực tiếp**. Khi họ query qua Athena, Redshift Spectrum, EMR hay Glue, engine hỏi Lake Formation, nhận quyền truy cập tạm thời và chỉ trả về đúng phần được phép. Quyền quản ở **một chỗ** thay vì rải ở nhiều policy, cấp được cho account khác, và có thể gán theo tag (LF-Tags) thay vì theo từng bảng.

> 🪤 Bẫy thi: *"phân quyền tập trung, chi tiết tới cột/dòng cho data lake"* → **Lake Formation**. Đáp án nhiễu là "viết bucket policy/IAM policy theo prefix" — chỉ chặn được ở mức file, không xuống được tới cột hay dòng.

### 8.2 Amazon QuickSight — BI serverless

(Tên hiện tại trong tài liệu AWS: *Amazon Quick Sight*, một phần của bộ *Amazon Quick*; đề thi vẫn gọi là **QuickSight**.)

**Nó là gì.** Dịch vụ **BI** (business intelligence): nối vào nguồn dữ liệu (Athena, Redshift, RDS, S3, file upload…), kéo thả để dựng biểu đồ và dashboard, rồi chia sẻ cho người dùng business xem trên trình duyệt. Không có server nào để cài hay scale, trả tiền theo người dùng.

**SPICE — vì sao dashboard mở ra là có ngay.** Mỗi dataset có hai cách lấy dữ liệu:

- **Direct query:** mỗi lần ai đó mở dashboard, QuickSight chạy query xuống nguồn. Dữ liệu luôn mới, nhưng chậm theo tốc độ của nguồn — và nếu nguồn là Athena thì **mỗi lượt mở là một lần quét S3 tính tiền**.
- **SPICE** (Super-fast, Parallel, In-memory Calculation Engine): QuickSight **chép dữ liệu vào bộ nhớ của chính nó** rồi phục vụ mọi lượt xem từ bản chép đó. Nguồn chỉ bị query lúc **refresh** (theo lịch bạn đặt). 500 người mở dashboard thì nguồn vẫn không bị đụng tới. Đánh đổi: dữ liệu chỉ mới tính tới lần refresh gần nhất, và dung lượng SPICE của account có hạn, hết thì phải mua thêm.

Ngoài ra có **ML Insights**: tự phát hiện điểm bất thường và dự báo xu hướng trên dữ liệu mà không cần tự dựng model.

> 🪤 Bẫy thi: *"dashboard/BI cho business users, serverless"* → **QuickSight**. Đừng chọn "dựng web app trên EC2 đọc từ Athena" hay "OpenSearch Dashboards" (cái sau dành cho log đã index trong OpenSearch, không phải BI trên data warehouse).

---

## 9. Pipeline data lake điển hình (end-to-end)

Ghép các mảnh ở trên lại thành một đường đi hoàn chỉnh cho bài toán ở §1:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 170" role="img" aria-labelledby="dl-t dl-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dl-t">Pipeline data lake analytics</title>
<desc id="dl-d">Nguồn qua Kinesis vào S3 raw, Glue ETL sang Parquet curated, Athena hoặc Redshift query, QuickSight hiển thị</desc>
<rect x="10" y="60" width="110" height="48" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="65" y="80" text-anchor="middle" font-size="11" fill="currentColor">Nguồn →</text>
<text x="65" y="96" text-anchor="middle" font-size="10" fill="currentColor">Kinesis/Firehose</text>
<rect x="150" y="60" width="110" height="48" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="205" y="80" text-anchor="middle" font-size="11" fill="currentColor">S3 (raw)</text>
<text x="205" y="96" text-anchor="middle" font-size="10" fill="currentColor">CSV/JSON</text>
<rect x="290" y="60" width="120" height="48" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="80" text-anchor="middle" font-size="11" fill="currentColor">Glue ETL +</text>
<text x="350" y="96" text-anchor="middle" font-size="10" fill="currentColor">Crawler/Catalog</text>
<rect x="440" y="60" width="120" height="48" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="500" y="80" text-anchor="middle" font-size="11" fill="currentColor">S3 (curated)</text>
<text x="500" y="96" text-anchor="middle" font-size="10" fill="currentColor">Parquet</text>
<rect x="590" y="34" width="120" height="44" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="650" y="53" text-anchor="middle" font-size="11" fill="currentColor">Athena /</text>
<text x="650" y="69" text-anchor="middle" font-size="10" fill="currentColor">Redshift</text>
<rect x="590" y="92" width="120" height="44" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="650" y="111" text-anchor="middle" font-size="11" fill="currentColor">QuickSight</text>
<text x="650" y="127" text-anchor="middle" font-size="10" fill="currentColor">dashboard/BI</text>
<line x1="120" y1="84" x2="148" y2="84" stroke="currentColor" stroke-width="1.5" marker-end="url(#da)"/>
<line x1="260" y1="84" x2="288" y2="84" stroke="currentColor" stroke-width="1.5" marker-end="url(#da)"/>
<line x1="410" y1="84" x2="438" y2="84" stroke="currentColor" stroke-width="1.5" marker-end="url(#da)"/>
<line x1="560" y1="78" x2="588" y2="62" stroke="currentColor" stroke-width="1.5" marker-end="url(#da)"/>
<line x1="560" y1="90" x2="588" y2="106" stroke="currentColor" stroke-width="1.5" marker-end="url(#da)"/>
<text x="360" y="158" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.85">Lake Formation phân quyền tập trung toàn bộ data lake trên S3 + Glue Catalog</text>
<defs><marker id="da" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Đi qua từng chặng — ai kích hoạt, và dữ liệu trễ bao lâu:**

1. **Nguồn → Kinesis/Firehose → S3 raw.** Ứng dụng ghi record vào stream; Firehose gom lô rồi ghi file xuống S3. Độ trễ do bộ đệm của Firehose: mặc định tối đa 300 giây (§2.2). Dữ liệu ở đây giữ **nguyên dạng gốc** (JSON/CSV), ghi theo prefix ngày/giờ.
2. **S3 raw → Glue → S3 curated.** Một Glue ETL job chạy **theo lịch** (mỗi giờ, mỗi đêm) hoặc **theo sự kiện**, đọc phần raw mới (job bookmark), làm sạch, rồi ghi ra **Parquet đã partition**. Crawler hoặc partition projection giữ cho Data Catalog biết partition mới. Đây thường là chặng trễ nhất: job chạy mỗi giờ thì dữ liệu curated chậm tới khoảng một giờ.
3. **S3 curated → Athena / Redshift.** Athena đọc được ngay khi file đã nằm ở S3 và partition đã đăng ký. Redshift thì nạp bằng `COPY` theo lịch, hoặc đọc tại chỗ qua Spectrum.
4. **→ QuickSight.** Dashboard lấy dữ liệu từ Athena/Redshift, thường qua SPICE với lịch refresh riêng (§8.2).

**Vì sao tách raw và curated thành hai vùng?**

- **Raw là bản gốc để làm lại.** Nếu job ETL có bug (parse sai múi giờ, bỏ nhầm dòng), bạn sửa code rồi chạy lại từ raw. Không có raw thì dữ liệu sai là sai vĩnh viễn — cùng ý tưởng với *replay* của Kinesis, nhưng không bị giới hạn bởi retention.
- **Curated là bản để query.** Dạng cột, đã partition, file đủ lớn, schema sạch — tức là rẻ và nhanh cho Athena/Redshift (§4.3). Raw thì ngược lại: nhiều file nhỏ theo dòng, query trực tiếp vừa chậm vừa đắt.
- **Phân quyền khác nhau.** Raw thường còn dữ liệu nhạy cảm chưa che; chỉ pipeline được đọc. Người dùng chỉ được cấp quyền trên curated, qua Lake Formation (§8.1).

**Hai biến thể hay gặp:**

- **Bỏ chặng Glue ETL** khi không cần biến đổi gì ngoài đổi định dạng: bật convert Parquet ngay trong Firehose (§2.2), dữ liệu xuống S3 đã là Parquet.
- **Cần thấy dữ liệu trong vài giây** (soi log, cảnh báo): pipeline này không đáp ứng được vì có hai lần gom lô. Thêm một nhánh song song **Firehose → OpenSearch** (§7), hoặc xử lý ngay trong luồng bằng Flink/Lambda đọc từ Data Streams (§2).

> 🪤 Bẫy thi: đề cho pipeline này rồi hỏi *"giảm chi phí query"* → Parquet + partition ở vùng curated. Hỏi *"analyst thấy cột không được phép"* → Lake Formation. Hỏi *"dashboard chậm khi nhiều người xem"* → SPICE. Hỏi *"cần dữ liệu trong vài giây"* → không phải tối ưu pipeline batch này, mà là thêm nhánh real-time.

---

## 10. Bảng chọn dịch vụ AI/ML — nhóm hay ra đề nhất mà dễ bỏ

Exam SAA không bắt bạn train model, chỉ bắt **nhận ra dịch vụ managed nào giải đúng bài toán** để khỏi tự dựng hạ tầng ML. Gần như luôn là một API gọi được, không server.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 210" role="img" aria-labelledby="ai-t ai-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="ai-t">Chọn dịch vụ AI managed theo loại dữ liệu đầu vào</title>
<desc id="ai-d">Ảnh và video dùng Rekognition, tài liệu scan dùng Textract, giọng nói dùng Transcribe hoặc Polly, văn bản dùng Comprehend Translate Kendra Lex, trường hợp còn lại dùng SageMaker</desc>
<rect x="270" y="8" width="180" height="34" rx="8" fill="currentColor" fill-opacity="0.10" stroke="currentColor"/>
<text x="360" y="30" text-anchor="middle" font-size="12" fill="currentColor">Đầu vào là gì?</text>
<rect x="8" y="80" width="126" height="62" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="71" y="100" text-anchor="middle" font-size="11" fill="currentColor">Ảnh / video</text>
<text x="71" y="118" text-anchor="middle" font-size="10" fill="currentColor">Rekognition</text>
<text x="71" y="133" text-anchor="middle" font-size="9" fill="currentColor">nhận diện mặt, vật thể</text>
<rect x="150" y="80" width="126" height="62" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="213" y="100" text-anchor="middle" font-size="11" fill="currentColor">Tài liệu scan</text>
<text x="213" y="118" text-anchor="middle" font-size="10" fill="currentColor">Textract</text>
<text x="213" y="133" text-anchor="middle" font-size="9" fill="currentColor">text + form + table</text>
<rect x="292" y="80" width="126" height="62" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="355" y="100" text-anchor="middle" font-size="11" fill="currentColor">Giọng nói</text>
<text x="355" y="118" text-anchor="middle" font-size="10" fill="currentColor">Transcribe / Polly</text>
<text x="355" y="133" text-anchor="middle" font-size="9" fill="currentColor">audio↔text</text>
<rect x="434" y="80" width="126" height="62" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="497" y="100" text-anchor="middle" font-size="11" fill="currentColor">Văn bản</text>
<text x="497" y="118" text-anchor="middle" font-size="10" fill="currentColor">Comprehend/Translate</text>
<text x="497" y="133" text-anchor="middle" font-size="9" fill="currentColor">Kendra · Lex</text>
<rect x="576" y="80" width="136" height="62" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="644" y="100" text-anchor="middle" font-size="11" fill="currentColor">Bài toán riêng</text>
<text x="644" y="118" text-anchor="middle" font-size="10" fill="currentColor">SageMaker</text>
<text x="644" y="133" text-anchor="middle" font-size="9" fill="currentColor">tự train / host model</text>
<line x1="300" y1="42" x2="90" y2="78" stroke="currentColor" stroke-width="1"/>
<line x1="330" y1="42" x2="220" y2="78" stroke="currentColor" stroke-width="1"/>
<line x1="360" y1="42" x2="355" y2="78" stroke="currentColor" stroke-width="1"/>
<line x1="390" y1="42" x2="490" y2="78" stroke="currentColor" stroke-width="1"/>
<line x1="420" y1="42" x2="630" y2="78" stroke="currentColor" stroke-width="1"/>
<text x="360" y="176" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.85">Có dịch vụ managed khớp bài toán → chọn nó; chỉ rơi về SageMaker khi không cái nào khớp</text>
<text x="360" y="196" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.85">Ghép nhiều dịch vụ là hợp lệ: Transcribe → Translate → Polly, hay Textract → Comprehend</text>
</svg>

### 10.1 Bảng quyết định

| Dịch vụ | Làm gì | Khi nào chọn (từ khoá đề) | Bẫy |
|---------|--------|---------------------------|-----|
| **Rekognition** | Phân tích **ảnh/video**: nhận diện vật thể, khuôn mặt, celebrity, **content moderation**, so khớp mặt; có cả video streaming | *"lọc ảnh phản cảm do user upload"*, *"nhận diện khuôn mặt"*, *"đếm người trong video"* | Có `DetectText` nhưng chỉ hợp **chữ ngắn trong ảnh** (biển số, biển hiệu) — **không** dùng để bóc hoá đơn/biểu mẫu |
| **Textract** | **OCR tài liệu**: trích **text + key-value của form + bảng** từ PDF/ảnh scan; API chuyên biệt `AnalyzeExpense` (hoá đơn), `AnalyzeID` (giấy tờ tuỳ thân) | *"trích dữ liệu từ hoá đơn/đơn bảo hiểm scan"*, *"số hoá form giấy giữ được cấu trúc bảng"* | Nhầm với Rekognition; Textract **giữ quan hệ trường–giá trị**, Rekognition chỉ trả chuỗi rời |
| **Transcribe** | **Speech → text**, có speaker diarization, custom vocabulary, **lọc/ẩn PII**, transcribe real-time | *"tạo phụ đề cho video"*, *"ghi lại nội dung cuộc gọi call center"* | Đề nói *"dịch cuộc gọi sang tiếng khác"* → phải ghép **Transcribe + Translate**, không có dịch vụ đơn lẻ nào làm cả hai |
| **Polly** | **Text → speech** giọng tự nhiên (neural), SSML, **Speech Marks** để đồng bộ môi/phụ đề | *"đọc bài báo thành audio"*, *"trợ lý phát thoại"* | Ngược chiều với Transcribe — đọc kỹ chiều mũi tên trong đề |
| **Translate** | **Dịch máy** neural giữa các ngôn ngữ, custom terminology | *"đưa nội dung ra nhiều ngôn ngữ"*, *"dịch review của khách"* | Chỉ dịch, **không** phân tích ý nghĩa/cảm xúc |
| **Comprehend** | **NLP**: sentiment, entity, key phrase, ngôn ngữ, topic modeling, **phát hiện PII**; bản **Comprehend Medical** cho hồ sơ y tế | *"phân tích cảm xúc review của khách hàng"*, *"tự động gắn nhãn chủ đề ticket support"*, *"tìm PII trong văn bản"* | Đề chỉ cần *tìm tài liệu* chứ không *hiểu nội dung* → là Kendra/OpenSearch, không phải Comprehend |
| **Kendra** | **Enterprise search bằng ML**: hỏi bằng **câu tự nhiên**, trả về câu trả lời; connector sẵn cho S3, SharePoint, Salesforce, RDS… | *"nhân viên hỏi bằng ngôn ngữ tự nhiên trên kho tài liệu nội bộ"*, *"tìm trong wiki nội bộ mà không cần biết từ khoá chính xác"* | Không phải OpenSearch: OpenSearch là **search engine bạn tự index và tự viết query**, Kendra là **hỏi–đáp có sẵn ML** (xem §7.1) |
| **Lex** | **Chatbot** hội thoại (chính engine của Alexa): intent, slot, tích hợp Lambda để gọi backend; ghép Connect làm IVR | *"chatbot đặt lịch/hỗ trợ khách"*, *"IVR tổng đài"* | Lex lo hội thoại, **logic nghiệp vụ vẫn là Lambda của bạn** |
| **Fraud Detector** | Phát hiện **gian lận online**: tài khoản giả, thanh toán bất thường — train bằng lịch sử giao dịch của chính bạn | *"chặn đăng ký tài khoản giả"*, *"chấm điểm rủi ro giao dịch real-time"* | Đừng chọn SageMaker khi đề mô tả đúng bài toán fraud có sẵn dịch vụ |
| **Personalize / Forecast** | Gợi ý cá nhân hoá kiểu Amazon.com / dự báo chuỗi thời gian (cầu, tồn kho) | *"gợi ý sản phẩm theo hành vi"*, *"dự báo doanh số theo mùa"* | — |
| **SageMaker** | Nền tảng **tự build–train–deploy model**: notebook, training job, **endpoint** real-time hoặc batch transform | *"dữ liệu và bài toán đặc thù, không dịch vụ nào khớp"*, *"đã có model tự train cần host"* | Là đáp án **cuối cùng** — nếu đề khớp một AI service managed thì SageMaker luôn là lựa chọn "đúng về kỹ thuật, sai về operational overhead" |

### 10.2 Ghép chuỗi — dạng đề thường gặp

- **Call center**: ghi âm → **Transcribe** (text) → **Comprehend** (sentiment + PII) → **Translate** (đa ngôn ngữ) → lưu S3 → **Athena/QuickSight** báo cáo.
- **Số hoá chứng từ**: PDF scan vào S3 → sự kiện S3 gọi **Lambda** → **Textract** trích bảng/field → **Comprehend** phân loại → ghi **DynamoDB**.
- **Nội dung do user upload**: ảnh vào S3 → **Rekognition** content moderation → ảnh vi phạm bị gắn cờ trước khi hiển thị.

> 🪤 Bẫy thi kinh điển: đề mô tả đúng một bài toán có AI service sẵn (OCR hoá đơn, sentiment, phụ đề) mà đáp án lại gồm cả "**train model trên SageMaker**" hoặc "**chạy engine OCR trên EC2**" — cả hai đều làm được, nhưng **operational overhead cao hơn** nên đều sai với câu hỏi kiểu *"least operational overhead"*.

---

## 11. Ví dụ chọn dịch vụ

**11.1** *Nạp clickstream vào S3 để phân tích, ít vận hành nhất.* → **Firehose** (buffer + deliver vào S3, convert Parquet, no shard/consumer).

**11.2** *Nhiều nhóm cần xử lý real-time cùng luồng giao dịch, mỗi nhóm độc lập, có thể phát lại 7 ngày.* → **Kinesis Data Streams** (multi-consumer + replay).

**11.3** *Data analyst thỉnh thoảng query log S3 bằng SQL, không muốn hạ tầng.* → **Athena** (+ Parquet + partition để rẻ).

**11.4** *BI team cần dashboard doanh thu chạy hằng ngày, nhiều join phức tạp trên dữ liệu có cấu trúc.* → **Redshift** + **QuickSight**.

**11.5** *Team ML cần chạy job Spark khổng lồ biến đổi hàng petabyte.* → **EMR**.

**11.6** *Đã có cụm Kafka on-prem cùng Kafka Connect, cần chuyển lên AWS mà không sửa code producer/consumer.* → **Amazon MSK** (giữ nguyên Kafka API).

**11.7** *Thêm consumer thứ tư vào Kinesis stream thì các consumer cũ bị throttle và trễ tăng.* → bật **Enhanced Fan-Out** (2 MB/s riêng mỗi consumer, tối đa 20 consumer/stream).

**11.8** *Team vận hành cần dashboard log ứng dụng cập nhật trong vài giây, có full-text search.* → **Firehose → OpenSearch Service** + OpenSearch Dashboards (UltraWarm cho index cũ).

**11.9** *Trích số tiền, ngày và bảng dòng hàng từ hàng nghìn hoá đơn PDF scan mỗi ngày.* → **Textract** (`AnalyzeExpense`), không phải Rekognition.

**11.10** *Phân tích cảm xúc hàng triệu review tiếng Anh, ít vận hành nhất.* → **Comprehend**.

**11.11** *Nhân viên muốn hỏi bằng câu tự nhiên trên kho tài liệu nội bộ ở S3 và SharePoint.* → **Kendra**.

---

## 12. Tóm tắt
- **TS5 Domain 3** = ingestion + analytics: **Kinesis** (Data Streams cho custom/replay, Firehose cho nạp near-real-time no-code, Managed Flink cho tính toán trong luồng; MSK khi cần Kafka).
- **Athena** = SQL serverless trên S3, trả theo GB quét → dùng **Parquet + partition** để rẻ. **Glue** = ETL + Data Catalog (biến CSV→Parquet, crawler schema).
- **Redshift vs Athena vs EMR**: warehouse lặp lại vs ad-hoc serverless vs Hadoop/Spark tùy biến.
- **MSK** chỉ khi đề nhắc **Kafka** (Kafka API/Connect/Streams, migrate cụm sẵn có) hoặc cần message lớn (> 1 MB) thường xuyên; còn lại mặc định là **Kinesis**.
- **Enhanced Fan-Out**: standard consumer chia chung **2 MB/s + 5 GetRecords/s mỗi shard**; EFO cho **2 MB/s riêng mỗi consumer**, tối đa **20 consumer/stream**, latency ~70 ms.
- **OpenSearch** = search/log analytics near-real-time có index (Athena = SQL ad-hoc trên S3, Kendra = hỏi ngôn ngữ tự nhiên).
- **AI service managed**: Rekognition (ảnh/video) · Textract (tài liệu scan, form/table) · Transcribe (speech→text) · Polly (text→speech) · Translate · Comprehend (NLP/sentiment/PII) · Kendra (enterprise search) · Lex (chatbot) · Fraud Detector · SageMaker chỉ khi không cái nào khớp.
- **Lake Formation** = phân quyền tập trung data lake; **QuickSight** = BI/dashboard serverless (SPICE).
- Pipeline chuẩn: **nguồn → Kinesis → S3 raw → Glue → S3 Parquet → Athena/Redshift → QuickSight**.

> 🎯 Nhớ: Firehose = nạp lười · Data Streams = xử lý tùy biến/replay · MSK = có chữ Kafka · EFO = nhiều consumer · OpenSearch = log/search real-time · Athena = query lười theo GB · Redshift = BI lặp lại · EMR = Spark/Hadoop · Parquet = rẻ hơn CSV · Textract ≠ Rekognition · Kendra ≠ OpenSearch.
