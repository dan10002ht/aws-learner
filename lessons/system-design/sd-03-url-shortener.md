# Case study: URL Shortener & Rate Limiter

> Bài này không dạy bạn "đáp án đúng" — vì trong System Design không có đáp án đúng tuyệt đối. Bài này dạy bạn cách **tư duy theo đánh đổi (trade-off)**: mỗi lựa chọn đều mua một thứ bằng cách bán một thứ khác. Người phỏng vấn cấp Senior/Staff không chấm bạn ở chỗ "vẽ đúng sơ đồ", mà ở chỗ bạn có **nêu được giả định, ước lượng được con số, và biện luận được vì sao chọn A thay vì B** hay không.

URL Shortener (kiểu bit.ly, tinyurl) là bài "kinh điển" vì nó nhỏ về scope nhưng đụng đủ mọi trục: read-heavy, sinh ID phân tán, lựa chọn storage, cache, CDN, và analytics. Ghép thêm Rate Limiter để thấy một service hạ tầng dùng chung trông như thế nào.

---

## Phần 1 — URL Shortener

### Bước 1: Requirements (làm rõ trước khi vẽ)

Đừng vội vẽ box. Câu đầu tiên trong phỏng vấn luôn là *"Cho tôi làm rõ phạm vi đã"*.

**Functional**
- Cho một `longURL`, trả về một `shortURL` ngắn (vd `https://sho.rt/aXf3Qz`).
- Truy cập `shortURL` → redirect tới `longURL`.
- (Tuỳ chọn) custom alias do user đặt: `sho.rt/my-brand`.
- (Tuỳ chọn) link có thời hạn (TTL / expiry).
- (Tuỳ chọn) analytics: đếm click, theo geo/referrer.

**Non-functional**
- **Read-heavy**: tỉ lệ đọc/ghi rất lệch, thường lấy mốc **100:1**. Đây là quyết định kiến trúc quan trọng nhất của bài — mọi thiết kế phải tối ưu cho redirect.
- Latency redirect thấp (< 50–100 ms p99), vì nó nằm trên critical path của user.
- High availability cho đọc. Ghi có thể chấp nhận eventual consistency một chút.
- ShortURL không đoán được tuần tự (tránh lộ thông tin / scraping) — một trade-off với độ ngắn.

> 💡 **Nguyên tắc**: Xác định "trục chi phối" (đây là *read-heavy*) ngay từ đầu. Nó là kim chỉ nam cho mọi đánh đổi sau này: cache, CDN, denormalize đều phục vụ đọc.

---

### Bước 2: Estimation (ước lượng có con số)

Giả định để có số mà nói chuyện — sai số 2× không sao, sai bậc 10× mới chết.

```
Giả định:
  - Ghi (URL mới)      : 100 triệu / ngày
  - Tỉ lệ đọc:ghi      : 100 : 1
  - Đọc (redirect)     : 10 tỉ / ngày
  - Thời gian giữ data : 5 năm

QPS:
  1 ngày = 86,400 s  ≈ 10^5 s
  Write QPS  = 100M / 10^5 = 1,000 wps
  Read QPS   = 10B  / 10^5 = 100,000 rps
  Peak (×2)  : write ~2K, read ~200K rps

Storage:
  Số bản ghi 5 năm = 100M × 365 × 5 ≈ 1.8 × 10^11 ≈ 180 tỉ URL
  Một bản ghi ~500 bytes (longURL ~ vài trăm byte + metadata)
  Tổng ≈ 180B × 500B ≈ 90 TB  (làm tròn ~100 TB)

Cache (rule 80/20 — 20% link nóng tạo 80% traffic):
  Đọc/ngày = 10B, cache 20% bản ghi đang hot trong ngày
  ~ 10B × 20% × 500B ≈ 1 TB cache  → phân shard nhiều node ElastiCache

Bandwidth redirect:
  200K rps × 500B ≈ 100 MB/s out  (chưa kể CDN gánh phần lớn)
```

Hai con số đáng nhớ: **đọc ~100K–200K rps** và **storage ~100 TB**. 100K rps thì một DB SQL đơn không gánh nổi nếu không có cache/CDN; 100 TB thì phải nghĩ tới sharding hoặc KV store phân tán.

---

### Bước 3: API design

Giữ REST tối giản. Ghi và đọc là hai path rất khác nhau.

```
POST /api/v1/urls
  body: { "longUrl": "...", "customAlias": "?", "expireAt": "?" }
  headers: Authorization: <api_key>      # để rate-limit & quota theo user
  201 -> { "shortUrl": "https://sho.rt/aXf3Qz", "expireAt": "..." }
  409 -> alias đã tồn tại

GET /{shortCode}
  302 (hoặc 301) Location: <longUrl>      # đây là đường nóng, 99% traffic

DELETE /api/v1/urls/{shortCode}           # auth chủ sở hữu
GET    /api/v1/urls/{shortCode}/stats     # analytics
```

> 💡 **Nguyên tắc**: Tách rõ **write API** (có auth, đi qua app server, ghi DB) khỏi **read path** (redirect, tối ưu cực mạnh bằng cache/CDN, lý tưởng là không chạm DB chính). Hai luồng này scale độc lập.

---

### Bước 4: Sinh short code — trái tim của bài

Ta cần biến một số/khoá thành chuỗi ngắn. Dùng **Base62** (`[a-zA-Z0-9]`, 62 ký tự).

```
Không gian địa chỉ theo độ dài:
  62^5 ≈ 916 triệu
  62^6 ≈ 56.8 tỉ
  62^7 ≈ 3,521 tỉ
=> Với ~180 tỉ URL trong 5 năm, cần 7 ký tự (6 ký tự không đủ).
```

Có 3 hướng sinh code — đây là chỗ phải **nêu trade-off**, không chọn bừa.

#### Cách A — Counter + Base62 (mã hoá số tự tăng)

Mỗi URL nhận một ID số tự tăng (auto-increment), rồi `base62(id)` ra short code.

- ✅ Ngắn nhất có thể, không bao giờ trùng (1 ID = 1 code).
- ✅ Đơn giản, dễ giải thích.
- ⚠️ Counter tập trung là **single point of contention**. Auto-increment của một SQL đơn không chịu nổi 2K wps khi scale.
- ⚠️ **Code đoán được tuần tự** → lộ tổng số link, cho phép enumerate/scrape. Khắc phục: trộn (multiply theo số nguyên tố, XOR mask) hoặc dùng dải counter ngẫu hoá.

**Counter phân tán** — đừng để một node phát số. Dùng **dải (range/batch)**: một dịch vụ trung tâm (vd ZooKeeper, hay một bảng "counter" trong DynamoDB) cấp cho mỗi app server một **block 1,000 ID**. Server tiêu hết block mới xin block mới.

```
ZK / counter table
   |  cấp block [1,000,000 .. 1,000,999]
   v
App-1  dùng cục bộ 1,000 ID → không cần round-trip mỗi request
App-2  block [1,001,000 .. 1,001,999]
```

Nếu server chết giữa chừng, mất vài ID trong block — chấp nhận được (ID không cần liên tục).

#### Cách B — Hash longURL (MD5/SHA → lấy 7 ký tự đầu base62)

- ✅ Stateless, không cần counter.
- ✅ Cùng longURL → cùng short (dedup tự nhiên) — nếu bạn *muốn* thế.
- ⚠️ **Collision**: cắt 7 ký tự thì hai URL khác nhau có thể đụng nhau. Phải kiểm tra DB (đọc trước khi ghi) và thêm salt/retry khi đụng → thêm round-trip, thêm độ phức tạp.
- ⚠️ Nếu *không* muốn dedup (hai user rút gọn cùng URL muốn 2 link riêng để analytics tách biệt) thì hash thuần lại sai yêu cầu.

#### Cách C — KGS (Key Generation Service) — sinh sẵn key offline

Một service chạy nền **sinh trước** hàng tỉ key 7-ký-tự ngẫu nhiên, lưu vào 2 bảng: `unused_keys` và `used_keys`. Khi tạo URL, app chỉ việc *lấy một key có sẵn* và đánh dấu used.

```
KGS (offline, batch)
   sinh sẵn keys -> [ unused_keys ]
App server: POP 1 key  ----->  chuyển sang [ used_keys ]
```

- ✅ Tách việc sinh key khỏi đường nóng → tạo URL chỉ là một lần "lấy key", rất nhanh.
- ✅ Không collision (key đã unique sẵn, đánh dấu used là xong).
- ✅ Code ngẫu nhiên, không đoán tuần tự được.
- ⚠️ KGS thành component cần HA + tránh **cấp trùng key cho 2 server** (phải đồng bộ khi pop; thường mỗi server load trước một lô key vào memory).
- ⚠️ Tốn storage cho bảng key (nhưng key 7 byte × vài tỉ = vài chục GB — rẻ).

#### Bảng so sánh

| Tiêu chí | A. Counter+Base62 | B. Hash(longURL) | C. KGS |
|---|---|---|---|
| Độ dài code | Ngắn nhất | 7 (cắt) | 7 cố định |
| Collision | Không | Có, phải xử lý | Không |
| Đoán tuần tự | Có (xấu) | Không | Không |
| Điểm nghẽn | Counter tập trung | Đọc kiểm tra trùng | KGS + đồng bộ pop |
| Dedup cùng URL | Không | Có (mặc định) | Không |
| Độ phức tạp | Thấp–TB | TB | Cao hơn |

> ⚠️ **Bẫy thiết kế**: Chọn "hash MD5 rồi lấy 7 ký tự" mà không nói tới collision là dấu hiệu thiếu chín. Luôn nêu: *"cắt hash sẽ đụng, nên cần check + retry, và điều đó thêm một lần đọc DB trên đường ghi."*

**Khuyến nghị** cho bài này (đoán tuần tự là điều cấm, write 2K nhỏ): **KGS** là lời giải sạch nhất; **Counter phân tán theo block** là phương án thay thế tốt nếu muốn code ngắn nhất và chấp nhận trộn ID.

---

### Bước 5: Schema & lưu trữ — SQL vs KV

Dữ liệu cốt lõi đơn giản, gần như không có relation:

```
url_mapping
  short_code   STRING (PK)     -- aXf3Qz
  long_url     STRING
  owner_id     STRING
  created_at   TIMESTAMP
  expire_at    TIMESTAMP (nullable)

(analytics tách bảng riêng — xem bước 8)
```

Access pattern duy nhất quan trọng: **lookup bằng `short_code` → ra `long_url`**. Đây là một point-query bằng key. Đó là lý do KV store toả sáng.

| Tiêu chí | SQL (Postgres/MySQL) | KV / NoSQL (DynamoDB, Cassandra) |
|---|---|---|
| Mô hình truy cập | Linh hoạt (join, range) | Point-lookup theo key — đúng nhu cầu |
| Scale ghi/đọc | Sharding thủ công, đau | Sharding tự động theo partition key |
| 100 TB / 200K rps | Khó, phải tự shard | Sinh ra để làm việc này |
| Consistency | Mạnh sẵn | Tunable (eventual mặc định, có strong) |
| Transaction phức tạp | Tốt | Hạn chế |

Vì không cần join, ghi đơn giản, và phải scale ngang tới 100 TB / 200K rps → **KV store (DynamoDB) là lựa chọn tự nhiên**, dùng `short_code` làm partition key. SQL vẫn ổn ở quy mô nhỏ và bạn quen vận hành nó hơn — đó là trade-off "đơn giản vận hành" đổi lấy "trần scale thấp hơn".

> 💡 **Nguyên tắc**: Chọn storage theo **access pattern**, không theo "công nghệ tôi thích". Một point-lookup bằng key thì KV thắng; cần truy vấn ad-hoc nhiều chiều thì SQL/search engine thắng.

---

### Bước 6: Cache đọc — vì read-heavy

100K–200K rps đọc mà mỗi lần đều xuống DynamoDB thì vừa tốn tiền vừa thêm latency. Đặt một lớp cache (Redis/ElastiCache) trước DB:

```
GET /aXf3Qz
   |
   v
 [Cache?] --hit (80%)--> trả long_url ngay  (sub-ms)
   | miss
   v
 [DynamoDB] -> long_url -> điền cache (TTL) -> trả về
```

- **Pattern**: cache-aside (lazy loading). Miss thì đọc DB rồi nạp cache.
- **Eviction**: LRU — link nóng tự ở lại, link nguội bị đẩy ra.
- **TTL**: đặt TTL để cache tự làm mới và để xử lý link bị xoá/hết hạn.
- **Hit ratio**: với 80/20, hit ~80–90% là thực tế → DB chỉ còn gánh ~10–20K rps.

> ⚠️ **Bẫy thiết kế**: Quên xử lý **cache invalidation khi xoá/đổi link**. Nếu user xoá link mà cache vẫn còn, redirect tới đích cũ. Phải xoá cache (hoặc set tombstone) khi DELETE/expire.

---

### Bước 7: Redirect 301 vs 302 — một dòng, nhiều hệ quả

Đây là chi tiết nhỏ nhưng người phỏng vấn rất thích hỏi.

| | 301 Moved Permanently | 302 Found (tạm thời) |
|---|---|---|
| Browser cache | Cache mạnh, lần sau **không gọi lại server** | Không cache (hoặc yếu), mỗi lần gọi lại server |
| Tải lên server | Thấp hơn nhiều (giảm read QPS thật) | Cao hơn — mọi click đều chạm hệ thống |
| Analytics | **Mất click** sau lần đầu (browser đi thẳng) | **Đếm được mọi click** |
| Đổi đích sau này | Khó (client đã cache cũ) | Dễ — luôn hỏi lại server |

→ Chọn **302** nếu analytics và khả năng đổi đích quan trọng (đa số dịch vụ rút gọn thương mại chọn 302). Chọn **301** nếu muốn giảm tải tối đa và không cần đếm chính xác. Đây là đánh đổi **tải hệ thống ↔ độ chính xác analytics & linh hoạt**.

---

### Bước 8: Analytics

Đếm click không nên nằm trên đường redirect đồng bộ (đừng để analytics làm chậm user). Bắn **bất đồng bộ** qua một hàng đợi:

```
GET /aXf3Qz
  -> trả 302 NGAY cho user
  -> đồng thời emit event {code, ts, ip, ua, referrer} -> Queue (Kafka/Kinesis)
                                                              |
                                          Stream processor / batch
                                                              |
                                          Aggregate -> analytics store
                                          (click count, geo, top referrer)
```

- Fire-and-forget: nếu mất vài event cũng không hỏng redirect.
- Aggregate theo cửa sổ thời gian; lưu vào store cho phép truy vấn theo chiều (warehouse / OLAP).
- Tránh ghi counter `+1` trực tiếp vào DB chính mỗi click — đó là hot-key, sẽ nghẽn.

---

### Bước 9: Custom alias

- User đặt `sho.rt/my-brand` → kiểm tra **uniqueness**: thử ghi với điều kiện "chỉ ghi nếu chưa tồn tại" (conditional put). Trùng → trả 409.
- Giới hạn độ dài, ký tự hợp lệ, và blacklist từ cấm/đụng route hệ thống (`api`, `admin`...).
- Alias và code tự sinh chia chung không gian key → khi sinh code tự động phải tránh đụng alias đã đặt (KGS pop key rồi check, hoặc tách prefix namespace).

---

### Bước 10: Bottleneck & Scale (High-level đầy đủ)

```
                         ┌─────────────┐
   User ───302 cache───▶ │  CloudFront  │ (CDN, cache redirect ở edge)
                         └──────┬──────┘
                                │ miss
                         ┌──────▼──────┐
                         │ API Gateway  │ (auth, rate limit, route)
                         └──────┬──────┘
              ┌─────────────────┼───────────────────┐
              │ WRITE                                │ READ
        ┌─────▼─────┐                          ┌─────▼─────┐
        │ Write svc │◀── KGS (cấp key)         │ Read svc  │
        └─────┬─────┘                          └─────┬─────┘
              │                          hit   ┌─────▼─────┐
              │                         ◀──────│ ElastiCache│
              ▼                                └─────┬─────┘ miss
        ┌───────────┐  ◀── đọc/ghi ──────────────────┘
        │ DynamoDB   │ (url_mapping, sharded by short_code)
        └───────────┘
              │ click event (async)
              ▼
        Kinesis ─▶ stream proc ─▶ analytics store
```

| Bottleneck tiềm ẩn | Triệu chứng | Cách gỡ |
|---|---|---|
| Sinh ID tập trung | Write nghẽn/đụng | KGS / counter theo block phân tán |
| DB đọc 200K rps | Latency cao, tốn $$ | Cache (ElastiCache) + CDN trước DB |
| Hot link (viral) | Một key cháy | CDN edge cache + 301 hoặc cache TTL ngắn |
| Counter analytics | Hot-key ghi | Async qua queue, aggregate |
| Storage 100 TB | Một node không chứa | Partition theo short_code (DynamoDB tự lo) |

---

## Phần 2 — Rate Limiter

Vì sao ghép vào đây? URL Shortener mở public → bị abuse (spam tạo link, scrape redirect). Rate limiter là service hạ tầng **dùng chung**, và bản thân nó là một bài design hay về **trạng thái phân tán**.

### Yêu cầu
- Giới hạn vd "100 request / phút / API key" (hoặc / IP).
- Latency cực thấp — nó nằm trước *mọi* request.
- Hoạt động đúng khi có **nhiều app server** (distributed): cùng một key bị đếm chung dù request rơi vào server nào.
- Khi quá hạn: trả **429 Too Many Requests** + header `Retry-After`.

### Các thuật toán — trade-off

#### Token Bucket
Mỗi key có một "xô" chứa token, được nạp đầy với tốc độ cố định (vd 100 token/phút), tối đa = dung lượng xô. Mỗi request tiêu 1 token; hết token → từ chối.

```
[ ●●●●●  ] capacity=5, refill 1 token/s
request -> lấy 1 token; nếu xô rỗng -> 429
```
- ✅ Cho phép **burst** tới mức capacity (thân thiện traffic thật).
- ✅ Ít state: chỉ cần (token còn lại, timestamp lần refill).
- ⚠️ Chọn capacity vs refill rate cần cân nhắc.

#### Leaky Bucket
Request xếp vào hàng đợi, xử lý ra với tốc độ cố định (rò đều). Đầy hàng → drop.
- ✅ Làm mượt output, tốc độ ra ổn định.
- ⚠️ **Không cho burst**; request có thể bị giữ trễ; cần quản lý queue.

#### Fixed Window Counter
Đếm request trong cửa sổ cố định (vd mỗi phút reset về 0).
- ✅ Đơn giản nhất, 1 counter/key/window.
- ⚠️ **Lỗi biên cửa sổ**: 100 req cuối phút này + 100 req đầu phút sau = 200 req trong 1 giây thực → vượt gấp đôi limit.

#### Sliding Window Log / Counter
- *Log*: lưu timestamp từng request, đếm số request trong cửa sổ trượt. Chính xác tuyệt đối nhưng **tốn bộ nhớ** (lưu mọi timestamp).
- *Counter (hybrid)*: nội suy giữa window hiện tại và trước theo trọng số → gần chính xác, rẻ. Thường là lựa chọn cân bằng nhất.

| Thuật toán | Burst | Bộ nhớ | Chính xác | Độ phức tạp |
|---|---|---|---|---|
| Token bucket | Có | Thấp | Tốt | Thấp |
| Leaky bucket | Không | TB | Tốt | TB |
| Fixed window | Có (lỗi biên) | Thấp | Kém ở biên | Thấp |
| Sliding log | Mượt | **Cao** | Cao nhất | TB |
| Sliding counter | Mượt | Thấp | Gần cao | TB |

> 💡 **Nguyên tắc**: Mặc định nói **Token Bucket** (đơn giản, cho burst, ít state) — hoặc **Sliding Window Counter** khi cần chính xác mà vẫn rẻ. Nêu rõ Fixed Window có lỗi biên để chứng tỏ bạn hiểu cạm bẫy.

### Distributed với Redis

Nhiều app server thì state phải tập trung, nếu không mỗi server đếm riêng → limit thực = limit × số server.

```
App-1 ┐
App-2 ┼──▶ Redis (atomic) ── key=rl:{user}:{window}
App-3 ┘     INCR + EXPIRE, hoặc token-bucket
```

- Lưu counter/token ở **Redis** (ElastiCache) — chia sẻ giữa mọi server.
- Phải **atomic** để tránh race: dùng **Lua script** (đọc-tính-ghi trong một thao tác), hoặc `INCR`+`EXPIRE`. Race condition ở đây = cho lọt quá limit.
- **Trade-off chính**: gọi Redis mỗi request thêm 1 round-trip (~1 ms) trên đường nóng. Tối ưu: cho phép **đếm xấp xỉ cục bộ** (token bucket local đồng bộ định kỳ về Redis) → nhanh hơn nhưng giới hạn lỏng hơn một chút.
- Redis chết → quyết định **fail-open** (cho qua, ưu tiên availability) hay **fail-closed** (chặn, ưu tiên bảo vệ). Đây là một đánh đổi nghiệp vụ phải nêu rõ.

> ⚠️ **Bẫy thiết kế**: Đếm rate limit trong memory của từng app server mà quên rằng có N server → limit thực bị nhân lên N lần. Luôn hỏi "có bao nhiêu server, state ở đâu?".

---

## Liên hệ sang AWS

| Thành phần thiết kế | Dịch vụ AWS | Vì sao hợp |
|---|---|---|
| Redirect cache ở edge | **CloudFront** | CDN cache 301/302 sát user, gánh phần lớn read QPS, giảm tải origin |
| Cổng vào, auth, rate limit | **API Gateway** | Có **usage plans + API keys + throttling** built-in (token-bucket) — rate limiter cơ bản gần như miễn phí công sức |
| Storage url_mapping | **DynamoDB** | KV point-lookup theo `short_code` (partition key), tự sharding tới 100 TB / hàng trăm K rps, **DynamoDB TTL** lo expiry |
| Cache đọc + state rate limiter | **ElastiCache (Redis)** | Cache-aside cho redirect; counter/token atomic (Lua) cho distributed rate limit |
| Compute write/read svc | **Lambda** hoặc **ECS/EKS** | Lambda hợp burst & write nhẹ; ECS/EKS hợp read QPS ổn định cao |
| Hàng đợi click analytics | **Kinesis** (hoặc SQS) | Nuốt click event async, đưa vào stream processing |
| Aggregate & query analytics | **Kinesis Data Analytics / Lambda → S3 + Athena** hoặc **Redshift** | Tổng hợp theo cửa sổ, truy vấn đa chiều ngoài đường nóng |
| Cấp ID / counter (nếu cần) | **DynamoDB atomic counter** (`UpdateItem ADD`) | Thay ZooKeeper để cấp block ID khi không muốn thêm hạ tầng |

**Một kiến trúc serverless gọn**: CloudFront → API Gateway (throttle) → Lambda → DynamoDB (+TTL), DynamoDB DAX/ElastiCache cho cache đọc, Kinesis cho analytics. Rate limiter cơ bản dùng luôn usage plan của API Gateway; cần logic tuỳ biến (sliding window theo user phức tạp) thì tự cài trên ElastiCache.

---

## Cách trình bày khi phỏng vấn / review

1. **Hỏi làm rõ trước (2–3 phút)**: scope, read:write ratio, có custom alias không, có analytics không. Chốt ngay "đây là read-heavy" — đó là tuyên bố định hướng cả bài.
2. **Estimation ra số** rồi mới vẽ: nói thẳng "đọc ~200K rps, storage ~100 TB" — con số biện minh cho việc bạn thêm cache, CDN, sharding. Không có số = thiết kế treo lơ lửng.
3. **API tối giản** trước, đừng sa đà.
4. **Vẽ high-level**, rồi người phỏng vấn sẽ đẩy bạn **deep-dive** một phần — thường là *sinh short code* (counter vs hash vs KGS) hoặc *cache/CDN*. Chuẩn bị sẵn trade-off cho hai chỗ này.
5. **Chủ động nêu bottleneck** trước khi bị hỏi: "counter tập trung sẽ nghẽn, nên tôi phân block…". Điều này phân biệt Senior với Junior.
6. **Luôn đóng khung bằng đánh đổi**: "Tôi chọn 302 để có analytics, đổi lại server chịu tải cao hơn — nếu ưu tiên giảm tải thì 301." Đừng nói "cái này tốt hơn"; nói "cái này tốt hơn *cho mục tiêu X*, kém hơn ở *Y*".
7. Khi review thiết kế của người khác, hỏi đúng 3 câu vàng: *"State ở đâu? Cái gì nghẽn trước? Khi component này chết thì sao (fail-open/closed)?"*

> 💡 **Nguyên tắc cuối**: System Design không phải kể tên công nghệ — mà là **liên kết yêu cầu → con số → lựa chọn → đánh đổi**. Người nghe phải thấy được *vì sao* mỗi box xuất hiện, không chỉ *cái gì* trong box.
