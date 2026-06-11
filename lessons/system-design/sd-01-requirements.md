# Tiếp cận bài toán & ước lượng quy mô

Câu phỏng vấn "Thiết kế Twitter" không có đáp án đúng. Nó có **những đáp án phòng thủ được** — và sự khác biệt giữa một kỹ sư mid-level với một architect không nằm ở việc biết nhiều component hơn, mà ở chỗ: trước khi vẽ một cái hộp nào, họ đã biết hệ thống này phải chịu **bao nhiêu QPS**, lưu **bao nhiêu TB mỗi năm**, và **đánh đổi** gì để đạt được điều đó.

Bài này không dạy bạn vẽ kiến trúc. Bài này dạy bạn hai kỹ năng đến *trước* khi vẽ: (1) biến một câu hỏi mơ hồ thành tập yêu cầu rõ ràng, và (2) ước lượng quy mô bằng số học lớp 5 để mọi quyết định sau đó có cơ sở. Bỏ qua hai bước này, bạn sẽ thiết kế một hệ thống đúng cho bài toán mà không ai hỏi.

> 💡 Nguyên tắc: Một thiết kế không có con số chỉ là ý kiến. "Cần cache" là ý kiến. "10k QPS đọc, 95% trùng key, một node Redis làm được 100k ops/s nên 1 node thừa sức" là một lập luận. Architect nói bằng vế thứ hai.

## 1. Functional vs non-functional requirements

Mọi bài toán thiết kế tách làm hai loại yêu cầu, và người mới luôn đổ hết thời gian vào loại thứ nhất.

**Functional requirements** — hệ thống *làm gì*. Là các động từ nghiệp vụ: "người dùng đăng tweet", "rút gọn URL", "gửi tin nhắn". Dễ liệt kê, nhưng chúng *không* quyết định kiến trúc. Một blog cá nhân và Twitter có functional requirements gần giống nhau (đăng bài, theo dõi, xem feed).

**Non-functional requirements (NFR)** — hệ thống làm điều đó *tốt đến mức nào*. Đây là nơi kiến trúc được sinh ra:

| Thuộc tính | Câu hỏi cần trả lời | Ảnh hưởng tới thiết kế |
|---|---|---|
| Scale | Bao nhiêu user? QPS đọc/ghi? | Sharding, replication, có cần cache không |
| Latency | p99 phải dưới bao nhiêu ms? | Cache, CDN, đặt data gần user, denormalize |
| Availability | 99.9% hay 99.99%? | Redundancy, multi-AZ/region, failover |
| Consistency | Đọc-sau-ghi có cần thấy ngay? | Strong vs eventual, CAP trade-off |
| Durability | Mất dữ liệu có chấp nhận được không? | Replication factor, write quorum, backup |
| Read/write ratio | Đọc nhiều hay ghi nhiều? | Quyết định *toàn bộ* hình dạng kiến trúc |

> 💡 Nguyên tắc: Read/write ratio là con số quan trọng nhất bạn hỏi được sớm. Hệ thống đọc-nhiều (Twitter feed ~100:1) thì cache và read replica giải quyết 90% vấn đề. Hệ thống ghi-nhiều (ingest metric, log) thì cache vô dụng, vấn đề chuyển sang write throughput và partition. Hai hệ thống này gần như không có gì chung dù functional requirements giống nhau.

## 2. Làm rõ yêu cầu — clarifying questions

Người phỏng vấn *cố tình* cho đề mơ hồ. Lao vào vẽ ngay là cái bẫy số một. 3–5 phút đầu phải dành để thu hẹp phạm vi. Mục tiêu không phải hỏi cho có, mà là **chốt được các con số để ước lượng** và **cắt scope** xuống vừa thời gian.

Bộ câu hỏi khung cho bất kỳ bài nào:

```
SCOPE   — Tính năng cốt lõi nào MVP? Cái gì để sau? (cắt scope tàn nhẫn)
USERS   — Bao nhiêu DAU/MAU? Tăng trưởng dự kiến?
TRAFFIC — Đọc/ghi ratio? Có peak (giờ vàng, flash sale) không?
DATA    — Mỗi bản ghi bao lớn? Lưu bao lâu? Cần query kiểu gì?
NFR     — Latency p99 mục tiêu? Availability? Strong hay eventual consistency?
GEO     — 1 region hay toàn cầu? Có yêu cầu data residency?
```

Ví dụ với "Thiết kế URL shortener", câu hỏi và giả định bạn chốt:

- *"Bao nhiêu URL tạo mỗi tháng?"* → giả định 100M/tháng.
- *"Đọc/ghi ratio?"* → "redirect nhiều hơn tạo rất nhiều", chốt 100:1.
- *"URL tồn tại bao lâu?"* → 5 năm rồi expire.
- *"Custom alias không?"* → để sau, MVP sinh mã tự động.
- *"p99 redirect?"* → dưới 100ms (đây là tính năng đọc nóng).

> ⚠️ Bẫy thiết kế: Đừng hỏi 20 câu rồi mới làm. Hỏi 4–5 câu *có ảnh hưởng tới con số*, tự đưa ra giả định cho phần còn lại và **nói to giả định đó** ("tôi giả định mỗi URL ~500 bytes, anh thấy hợp lý không?"). Người phỏng vấn đánh giá khả năng ra quyết định dưới điều kiện thiếu thông tin, chứ không phải khả năng moi đủ thông tin.

## 3. Đơn vị & con số phải thuộc lòng

Không ước lượng được nếu không nhớ các bậc độ lớn. Đây là kiến thức nền, học một lần dùng cả đời.

**Powers of 2 → đổi sang dung lượng:**

| Lũy thừa | Giá trị xấp xỉ | Tên | Dùng cho |
|---|---|---|---|
| 2^10 | ~1 nghìn (1.024) | Kilo | KB |
| 2^20 | ~1 triệu | Mega | MB |
| 2^30 | ~1 tỷ | Giga | GB |
| 2^40 | ~1 nghìn tỷ | Tera | TB |
| 2^50 | ~1 triệu tỷ | Peta | PB |

**Quy đổi thời gian (để ra QPS):**

```
1 ngày  ≈ 86.400 giây  ≈ 10^5 giây  (làm tròn, nhớ con số này)
1 tháng ≈ 2,5 triệu giây
1 năm   ≈ 3,15 × 10^7 giây ≈ 31,5 triệu giây
```

**Latency numbers every engineer should know** (bậc độ lớn, không cần chính xác):

| Thao tác | Thời gian | Ghi nhớ |
|---|---|---|
| L1 cache reference | ~1 ns | |
| Truy cập RAM | ~100 ns | RAM nhanh hơn SSD ~1000x |
| Đọc 1MB tuần tự từ RAM | ~10 µs | |
| SSD random read | ~100 µs | |
| Đọc 1MB tuần tự từ SSD | ~1 ms | |
| Round-trip trong cùng datacenter | ~0,5 ms | |
| Disk (HDD) seek | ~10 ms | HDD chậm hơn SSD ~100x |
| Đọc 1MB từ network | ~10 ms | |
| Round-trip giữa các châu lục | ~150 ms | tốc độ ánh sáng, không tối ưu được |

> 💡 Nguyên tắc: Hệ quả thực dụng của bảng này: (1) *Memory nhanh hơn disk ~1000 lần* → cache đáng giá. (2) *Cùng datacenter nhanh hơn xuyên lục địa ~300 lần* → đặt data gần user, dùng CDN. (3) *Network round-trip đắt* → gộp request, tránh N+1, dùng batch. Mọi tối ưu kiến trúc đều là hệ quả của ba dòng này.

## 4. Back-of-envelope estimation — công thức

Bốn đại lượng cần ước lượng, theo đúng thứ tự (mỗi cái dùng kết quả cái trước).

### 4.1 QPS (queries per second)

```
Write QPS  = số ghi mỗi ngày / 86.400
Read QPS   = Write QPS × (read/write ratio)
Peak QPS   = Average QPS × hệ số đỉnh (thường 2–10× tuỳ traffic)
```

Hệ số đỉnh là giả định bạn phải tự chốt: mạng xã hội có giờ vàng (~3×), hệ thống nội bộ có thể phẳng (~1,5×), bán vé concert/flash sale có thể 50×.

### 4.2 Storage

```
Storage/ngày = số ghi/ngày × kích thước mỗi bản ghi
Storage/năm  = Storage/ngày × 365
Storage thực = Storage/năm × replication factor × (1 + overhead index/metadata)
```

### 4.3 Bandwidth

```
Bandwidth ghi (vào) = Write QPS × kích thước payload
Bandwidth đọc (ra)  = Read QPS  × kích thước payload
```

### 4.4 Số node / cache

```
Số app server   = Peak QPS / (throughput mỗi server)
Số shard DB      = Tổng storage / (dung lượng mỗi node)  HOẶC  Write QPS / (write/s mỗi node)
RAM cache cần    = data nóng cần cache (thường ~20% data, theo nguyên tắc 80/20)
```

## 5. Ví dụ có số thật — "Thiết kế Twitter (rút gọn)"

Đi từ giả định đã chốt ở bước clarifying. Toàn bộ phép tính làm trong đầu, làm tròn mạnh tay.

**Giả định đã chốt:**
- 200M DAU. Mỗi user đăng trung bình 2 tweet/ngày.
- Read/write ratio = 100:1 (đọc feed nhiều hơn đăng rất nhiều).
- Mỗi tweet ~300 bytes text + metadata, làm tròn **0,5 KB**.
- Giữ tweet 5 năm. Replication factor = 3.
- Hệ số đỉnh = 2×.

**Bước 1 — Write QPS:**
```
Tweets/ngày = 200M × 2 = 400M
Write QPS   = 400M / 86.400 ≈ 400M / 10^5 ≈ 4.000 QPS
Peak write  = 4.000 × 2 = 8.000 QPS
```

**Bước 2 — Read QPS:**
```
Read QPS    = 4.000 × 100 = 400.000 QPS
Peak read   = 800.000 QPS   ← con số định hình cả kiến trúc
```

**Bước 3 — Storage:**
```
Storage/ngày = 400M × 0,5 KB = 200 GB/ngày
Storage/năm  = 200 GB × 365  ≈ 73 TB/năm
5 năm        ≈ 365 TB
× replication 3 ≈ 1,1 PB  (chưa tính ảnh/video — sẽ gấp nhiều lần)
```

**Bước 4 — Bandwidth:**
```
Bandwidth ra  = Peak read 800k QPS × 0,5 KB ≈ 400 MB/s ≈ 3,2 Gbps
Bandwidth vào = Peak write 8k × 0,5 KB ≈ 4 MB/s   (nhỏ, không đáng lo)
```

**Bước 5 — Số node / cache:**
```
Giả định 1 app server xử lý ~10k QPS read (đã qua cache):
  Số app server ≈ 800k / 10k = 80 server (cho lớp read)

Cache feed nóng — 80/20: 20% user active sinh ra phần lớn read.
  Giả định cache 5 ngày tweet gần nhất ở hot path:
  5 × 200 GB = 1 TB data nóng → vài chục node Redis (mỗi node ~32–64 GB).
```

**Kết luận rút ra từ số:** 800k read QPS so với 8k write QPS — chênh 100 lần — nói thẳng rằng đây là **read-heavy**, và kiến trúc phải dồn sức vào đường đọc: cache feed, fan-out, read replica. Đường ghi 8k QPS một cụm DB sharded vừa phải là làm được. Không có những con số này, bạn sẽ tốn thời gian tối ưu nhầm chỗ.

> ⚠️ Bẫy thiết kế: Làm tròn quá tay sai dấu phẩy. `86.400 ≈ 10^5` là ổn (sai ~15%, không đổi bậc độ lớn). Nhưng nhầm GB với TB, hay quên nhân replication factor, làm lệch kết quả 1000 lần và mọi quyết định sau đó sai theo. Luôn viết đơn vị ra giấy và kiểm tra bậc độ lớn ở cuối: "1 PB cho 200M user, ~5 MB/user — nghe hợp lý."

## 6. Khi nào thực sự cần scale?

Ước lượng xong, câu hỏi tiếp theo: con số này có *cần* kiến trúc phân tán không, hay một server to là đủ? Architect giỏi biết khi nào **không** scale.

| Tín hiệu | Ngưỡng tham khảo | Hành động |
|---|---|---|
| QPS | Một Postgres tuned ~5–10k QPS đơn giản | Dưới ngưỡng: 1 primary + replica là đủ |
| Dataset | Vài TB vừa với 1 node hiện đại | Chưa cần sharding nếu chưa vượt |
| Read-heavy & latency | Cache hit cứu được p99 | Thêm cache *trước* khi nghĩ tới sharding |
| Write-heavy vượt 1 node | Single primary nghẽn write | Lúc này mới shard / chuyển sang LSM store |
| Cần global low-latency | User nhiều châu lục | Multi-region, CDN, edge |

> 💡 Nguyên tắc: Thứ tự nâng cấp gần như luôn là: **scale up (máy to hơn) → cache → read replica → sharding/scale out**. Sharding là bước đắt nhất về độ phức tạp (cross-shard query, rebalancing, transaction phân tán) — đừng nhảy tới nó khi cache hoặc một replica đã giải quyết được. "Cần Cassandra" cho hệ thống 500 QPS là dấu hiệu over-engineering, không phải năng lực.

## 7. Cách trình bày khi phỏng vấn / review

Đây là phần biến tính toán đúng thành ấn tượng tốt. Trình tự nói:

1. **Khung lại bài toán (1 phút).** "Trước khi vẽ, tôi muốn chốt scope và vài con số." Cho thấy bạn có quy trình.
2. **Hỏi 4–5 clarifying questions**, ghi giả định lên bảng dưới dạng danh sách rõ ràng.
3. **Đọc to functional + non-functional requirements.** Nhấn mạnh read/write ratio và NFR — đây là tín hiệu seniority.
4. **Làm estimation ra giấy**, vừa tính vừa nói. Sai số nhỏ không sao; *bỏ quên cả bước* mới là vấn đề. Khoanh tròn con số định hình kiến trúc (ở ví dụ Twitter là 800k read QPS).
5. **Kết nối số → quyết định.** "Vì đọc gấp 100 lần ghi, tôi sẽ ưu tiên cache và replica ở đường đọc" — đừng để con số mồ côi, luôn rút ra hệ quả thiết kế.

> ⚠️ Bẫy thiết kế: Đừng vẽ hộp khi chưa có số. Một ứng viên vẽ ngay load balancer, microservice, Kafka mà chưa biết hệ thống chịu 50 QPS hay 50k QPS đang tự bắn vào chân: nếu hoá ra là 50 QPS, toàn bộ kiến trúc đó là over-engineering và người review sẽ thấy ngay bạn thiết kế theo phản xạ, không theo bài toán.

## 8. Liên hệ sang AWS

Những con số ước lượng trên ánh xạ trực tiếp sang lựa chọn service. Đây là cách architect dùng estimation để chọn đúng công cụ thay vì theo thói quen:

| Kết quả ước lượng | Service AWS phù hợp | Lý do |
|---|---|---|
| Read-heavy, cần cache feed nóng | **ElastiCache (Redis/Memcached)** | In-memory, hàng trăm nghìn ops/s mỗi node |
| Bandwidth ra lớn, user toàn cầu | **CloudFront (CDN)** | Cache ở edge, cắt latency xuyên lục địa & egress |
| Write-heavy, cần scale ghi tuyến tính | **DynamoDB** | Auto-partition theo throughput, single-digit ms |
| QPS vừa phải, cần SQL & strong consistency | **RDS / Aurora** | Aurora tách compute–storage, read replica dễ thêm |
| Storage lớn, rẻ, ít query nóng (ảnh/video) | **S3** | 11 số 9 durability, chi phí/GB thấp nhất |
| Đỉnh tải nhọn, cần hấp thụ spike ghi | **SQS / Kinesis** | Queue làm buffer, tách producer khỏi consumer |
| Số app server co giãn theo Peak QPS | **Auto Scaling + ALB** | Khớp số node với tải thực, không trả tiền dư |
| Cần ước lượng RAM để chọn instance | **EC2 instance types** | RAM cache đã tính ở §4.4 → chọn r-series (memory) |

> 💡 Nguyên tắc: Ước lượng quy mô là *đầu vào* cho quyết định service. Cùng một functional requirement "lưu dữ liệu", nhưng "73 TB/năm read-heavy" dẫn tới DynamoDB + DAX, còn "5 GB query phức tạp" dẫn tới Aurora. AWS không chọn giúp bạn — con số mới chọn. Hãy luôn quay lại bảng estimation trước khi gọi tên một service.

---

**Tóm tắt một dòng:** Trước khi vẽ bất kỳ cái hộp nào — chốt scope bằng clarifying questions, phân biệt functional với non-functional, rồi ước lượng QPS → storage → bandwidth → node bằng số học làm tròn. Con số quyết định kiến trúc; kiến trúc không quyết định con số.
