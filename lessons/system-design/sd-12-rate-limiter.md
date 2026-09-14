# Rate Limiter phân tán — thuật toán, đặt ở đâu, và cái giá phải trả

Rate limiter là component bị đánh giá thấp nhất trong System Design: ai cũng nghĩ nó là "một cái counter trong Redis". Nhưng nó là thứ **duy nhất nằm trên đường đi của 100% request, phải ghi (write) ở mỗi request, và phải nhất quán giữa mọi instance**. Ba tính chất đó gộp lại thành một bài toán khó thật: một shared mutable state được cập nhật hàng trăm nghìn lần mỗi giây, với latency budget dưới 1 ms, vẫn phải đúng khi hai server đọc cùng một counter cùng lúc — và vẫn phải quyết định được chuyện gì xảy ra khi cái store giữ state đó chết. Cache sai thì chỉ chậm. Rate limiter sai thì hoặc bạn chặn nhầm khách trả tiền, hoặc bạn để lọt đúng cuộc tấn công mà bạn dựng nó lên để chặn.

Bài này là **bản deep-dive**. Phần cơ bản (định nghĩa 5 thuật toán, "dùng Redis cho distributed") đã có ở `sd-03 — URL Shortener & Rate Limiter`; ở đây ta tóm lại trong một bảng rồi đi thẳng vào chỗ reviewer thật sự đào: sai số của sliding window counter bằng bao nhiêu, race condition nằm ở dòng nào, hot key giết Redis ra sao, và vì sao thứ tự áp dụng multi-tier limit lại làm sai counter.

> 💡 **Nguyên tắc xuyên suốt**: rate limiter không phải bài toán "đếm". Nó là bài toán **đồng thuận về một con số, đủ nhanh để không ai để ý, và đủ sai để vẫn chạy được khi hạ tầng lung lay**. Mọi thiết kế hay đều là chấp nhận sai số có kiểm soát.

---

## 0. Nhắc lại 30 giây — rồi bỏ qua

| Thuật toán | Ý tưởng một dòng | Cho burst? | State mỗi key | Điểm yếu chí mạng |
|---|---|---|---|---|
| Token bucket | Xô token nạp đều, request tiêu token | Có, bằng capacity | 2 số (tokens, ts) | Burst có thể dồn hết vào vài ms |
| Leaking bucket | Hàng đợi FIFO chảy ra tốc độ cố định | Không | Queue + timestamp | Request bị *trễ* thay vì bị *từ chối* |
| Fixed window counter | Đếm trong khung giờ cố định, reset theo mốc | Có, nhưng sai | 1 số nguyên | Lỗi biên cửa sổ → lọt 2× limit |
| Sliding window log | Lưu timestamp từng request | Mượt | N timestamp | Bộ nhớ tuyến tính theo limit |
| Sliding window counter | Nội suy giữa window trước và hiện tại | Mượt | 2 số nguyên | Xấp xỉ — sai cả hai chiều |

Bài này bắt đầu từ câu hỏi tiếp theo: **mỗi lựa chọn tốn bao nhiêu, sai bao nhiêu, và hỏng thế nào trong môi trường thật.**

---

## 1. Đặt rate limiter ở đâu — bốn vị trí, bốn hệ quả

Câu hỏi này quan trọng hơn câu hỏi thuật toán, vì vị trí quyết định **bạn nhìn thấy thông tin gì** và **request bị chặn đã tốn bao nhiêu tài nguyên trước khi bị chặn**.

```
   ┌──────────┐
   │  Client  │  ① client-side limiter (SDK) · rẻ nhất · KHÔNG tin được
   └────┬─────┘
  ══════╪═══════ Internet ═══════════════════════
   ┌────▼──────────────┐
   │ Edge / CDN / WAF  │  ② chặn trước khi tốn băng thông origin
   │ (CloudFront+WAF)  │     chỉ biết IP/URL, KHÔNG biết user là ai
   └────┬──────────────┘
   ┌────▼──────────────┐
   │   API Gateway     │  ③ sau authn → biết API key/user/plan
   │  (authn → limit)  │     một chỗ cấu hình cho N service
   └────┬──────────────┘
   ┌────▼─────┐  ┌──────────┐
   │ sidecar  │──│  app     │  ④ Envoy/middleware: biết ngữ cảnh nghiệp vụ
   │ (Envoy)  │  │ process  │     nhưng request đã đi hết chặng mới bị chặn
   └────┬─────┘  └──────────┘
   ┌────▼──────────────┐
   │ Redis / RLS shared│  state dùng chung cho ②③④
   └───────────────────┘
```

**① Client-side.** Retry có backoff, debounce, giới hạn request đang bay. Nó giảm tải thật cho client "ngoan" — và phần lớn traffic của API nội bộ đến từ client ngoan. Nhưng nó **không bao giờ là biện pháp bảo vệ**: client do người dùng kiểm soát, kẻ tấn công chỉ việc không dùng SDK của bạn. Coi nó là tối ưu chi phí, không phải an ninh.

**② Edge / CDN / WAF.** Chặn **trước khi** request tiêu băng thông và connection của origin — với tấn công volumetric hay scraping, đây là nơi duy nhất chặn có ý nghĩa kinh tế. Cái giá: ở edge bạn **chưa biết user là ai** (JWT chưa verify, API key chưa tra). Chỉ có IP, path, header. Và edge là hệ phân tán toàn cầu: các PoP không chia sẻ counter theo thời gian thực, nên giới hạn ở đây luôn **xấp xỉ, trễ vài giây, tính riêng từng vùng**. Đừng hứa chính xác tuyệt đối cho một rule WAF.

**③ API Gateway.** Mặc định đúng cho đa số hệ thống: nằm **sau authentication** nên biết `user_id`, `tenant_id`, `plan` — đủ để áp quota theo hợp đồng thương mại, và chỉ một chỗ cấu hình. Cái giá: gateway thành điểm nghẽn chung, và chỉ thấy ngữ cảnh mức HTTP — nó không biết `POST /reports` này quét 3 triệu dòng còn cái kia quét 10 dòng. Quota theo *số request* luôn thô hơn quota theo *chi phí thật*.

**④ Sidecar / in-process.** Envoy gọi ra Rate Limit Service qua gRPC, hoặc thư viện ngay trong process. Đây là nơi duy nhất áp được limit **theo chi phí nghiệp vụ** ("mỗi tenant 1000 đơn vị tính toán/phút, query nặng tiêu 50") và là nơi duy nhất bảo vệ được **service-to-service** — traffic nội bộ không đi qua gateway ngoài. Cái giá: request đã đi hết hạ tầng mới bị từ chối, cấu hình rải trên hàng trăm sidecar, và nếu state để trong bộ nhớ process thì limit thực = limit × số instance (§4).

| Vị trí | Biết được gì | Chặn sớm cỡ nào | Độ chính xác | Hợp với |
|---|---|---|---|---|
| Client SDK | Ngữ cảnh app đầy đủ | Trước cả khi gửi | Không tin được | Giảm tải client ngoan, retry backoff |
| Edge/CDN/WAF | IP, path, header | Sớm nhất phía server | Thấp (per-PoP, trễ) | Chống DDoS/scraping, bảo vệ chi phí |
| API Gateway | user/API key/plan | Trước app tier | Tốt (shared store) | Quota thương mại, đa số hệ thống |
| Sidecar / in-process | Ngữ cảnh nghiệp vụ | Muộn nhất | Tốt nhất | Cost-based limit, service-to-service |

> 💡 **Nguyên tắc**: dùng **nhiều tầng**, không chọn một. Edge chặn thô và rẻ, gateway áp quota hợp đồng, sidecar áp cost-based — mỗi tầng bảo vệ một loại tài nguyên khác nhau.

> ⚠️ **Bẫy**: đặt limiter **trước** authentication rồi đếm theo `user_id` lấy từ header client gửi. Kẻ tấn công chỉ cần đổi header là có quota mới. Định danh dùng để đếm phải là định danh **đã xác thực**, hoặc thứ client không tự chọn được (IP nguồn ở tầng TCP).

---

## 2. Năm thuật toán — phần mà tài liệu thường bỏ qua

### 2.1 Token bucket — "burst" nghĩa là gì cho chính xác

Hai tham số: `capacity` (C) và `refill_rate` (r token/giây). State: `(tokens, last_refill_ts)`.

```
elapsed = now - last_refill_ts
tokens  = min(C, tokens + elapsed * r)
if tokens >= 1: tokens -= 1 → cho qua
else:           từ chối, retry_after = (1 - tokens) / r
```

Chỗ nhiều người hiểu lơ mơ: **rate trung bình dài hạn luôn là r, nhưng trong một khoảnh khắc hệ thống có thể nhận tối đa C request gần như đồng thời**. Với `C=100, r=10/s`, một client im lặng 10 giây rồi bắn 100 request trong 20 ms là hoàn toàn hợp lệ. Nếu backend chỉ chịu được 30 request đồng thời, rate limiter "đúng" vừa giết nó.

Nên `C` không chọn theo cảm tính "bằng limit mỗi phút". `C` trả lời câu hỏi: *lượng request dồn cục tối đa mà downstream nuốt được là bao nhiêu?*

| Cấu hình | Hành vi | Rủi ro |
|---|---|---|
| C = r (burst 1 giây) | Gần như smooth | Từ chối cả traffic hợp lệ hơi gợn |
| C = 10r | Cho phép batch job hợp lý | Spike 10 giây dồn vào downstream |
| C = 60r ("100/phút") | Rất thân thiện client | Cả quota phút có thể dồn vào 50 ms |

Quy tắc thực dụng: `r` = throughput bền vững theo hợp đồng; `C = r × T_burst` với `T_burst` thường 1–10 giây, hiếm khi cả phút; và nếu downstream có connection pool cứng thì `C` phải ≤ kích thước pool, nếu không limiter chẳng bảo vệ được gì.

Token bucket còn một ưu điểm ít được nhắc: nó cho phép **request có giá khác nhau** (query nặng tiêu 20 token, query nhẹ tiêu 1). Không thuật toán nào khác làm việc này tự nhiên bằng — đó là lý do nó mặc định cho cost-based limiting.

### 2.2 Leaking bucket — thuật toán duy nhất làm *trễ* thay vì *từ chối*

Một hàng đợi FIFO kích thước cố định, tiêu thụ bởi worker chạy đúng r request/giây. Điểm phân biệt cốt lõi: **token bucket điều tiết đầu vào (admission), leaking bucket điều tiết đầu ra (shaping)**.

Hệ quả rất thực tế: một request hợp lệ có thể phải **đợi**. Hàng đang có 500 request, r = 100/s → request vừa vào được phục vụ sau 5 giây; client HTTP đã timeout từ lâu. Bạn vừa biến một lỗi 429 rẻ tiền thành một timeout đắt tiền giữ connection suốt 5 giây.

Nên leaking bucket hợp với **traffic async** (đẩy job vào queue, ghi batch) và **outbound** — khi bạn là bên *phải tuân thủ* quota của người khác (Stripe, Shopify, SendGrid). Với HTTP inbound đồng bộ, gần như luôn nên dùng token bucket và trả 429 ngay. Biến thể lai đáng dùng: hàng đợi có **deadline** — ước lượng thời gian chờ vượt ngưỡng (vd 200 ms) thì từ chối luôn thay vì xếp hàng; đây chính là ý tưởng của CoDel trong load shedding (§7).

> ⚠️ **Bẫy**: leaking bucket với hàng đợi không giới hạn là công thức tạo **bufferbloat** — hệ thống trông như còn sống (không trả lỗi) nhưng mọi response đều quá hạn. Hàng đợi phải hữu hạn và phải nhỏ hơn bạn nghĩ.

### 2.3 Fixed window counter — lỗi biên, tính bằng con số

Key là `rl:{user}:{floor(now/60)}`, mỗi request `INCR`, so với limit, đặt TTL. Rẻ nhất có thể: một số nguyên, một round-trip.

Lỗi biên (boundary burst) không phải chuyện lý thuyết. Ví dụ, limit **5 request/phút**:

```
 phút 12:00                          │ phút 12:01
 ─────────────────────────────────── │ ───────────────────────────────────
                          ▲▲▲▲▲      │ ▲▲▲▲▲
                      12:00:58-59    │ 12:01:00-01
                      5 request      │ 5 request
       counter window 12:00 = 5 ✔    │ counter window 12:01 = 5 ✔
       ╰──────── cửa sổ thật 12:00:58 → 12:01:02 = 10 request ───────╯
                   = 2 × limit, mà cả hai window đều "hợp lệ"
```

Thuật toán không sai theo định nghĩa của nó — nhưng trong **bất kỳ khoảng 60 giây trượt nào** chứa mốc 12:01:00, client đã gửi tới 10 request. **Giới hạn thực tế hệ thống phải chịu là 2×limit**, dồn vào vài giây.

Mức độ đau phụ thuộc vào độ dài cửa sổ: window 1 phút limit 100 → lọt 200 req trong ~2 giây, đáng lo; window 1 giây limit 100 → lọt 200 req trong ~20 ms, vẫn 2× nhưng downstream thường chịu được. Từ đó ra một mẹo ít ai nói: **fixed window với cửa sổ ngắn là xấp xỉ rất tốt và rất rẻ**. Chấp nhận cấu hình "10 req/giây" thay vì "600 req/phút" thì fixed window gần như hết nhược điểm. Lỗi biên chỉ đau khi cửa sổ dài.

Hệ quả thứ hai ít được nhắc: fixed window tạo **đồng bộ hoá theo mốc thời gian**. Mọi client bị chặn đều biết counter reset đầu phút nên cùng thử lại ở giây 0 → hệ thống nhận một gai tải đều đặn mỗi phút. Chữa bằng cách dịch mốc window theo hash của key (`floor((now + hash(key) % 60)/60)`) để rải đều mốc reset, và luôn thêm jitter vào `Retry-After`.

### 2.4 Sliding window log — chính xác tuyệt đối, và hoá đơn RAM

Lưu timestamp từng request được chấp nhận vào một sorted set: xoá entry cũ hơn cửa sổ, đếm, còn chỗ thì thêm. Đây là thuật toán **duy nhất chính xác tuyệt đối** — trong mọi cửa sổ trượt độ dài W, số request chấp nhận không bao giờ vượt limit. Không lỗi biên, không xấp xỉ.

Cái giá là bộ nhớ, tuyến tính theo `limit`. Ước lượng thực tế cho Redis sorted set: score 8 byte + member unique (`ts:random`, ~20 byte) + overhead skiplist/dict ~50–60 byte → khoảng **80 byte/entry**.

```
10M user × 100 entry × 80 B ≈ 80 GB   (nếu ai cũng dùng hết quota 100/phút)
10M user ×  20 entry × 80 B ≈ 16 GB   (thực tế, phần lớn user gửi ít)
so với token bucket: 10M × ~130 B    ≈ 1,3 GB
```

Chênh **hơn một bậc độ lớn**. Điểm tệ thứ hai thường bị bỏ qua: nếu bạn `ZADD` trước rồi mới đếm, kẻ tấn công bắn 100K request/phút vừa được quyền ghi 100K entry vào Redis — tấn công rate limiter bằng chính rate limiter. Luôn **đếm trước, chỉ ghi khi chấp nhận**.

> 💡 **Khi nào log đáng tiền**: limit nhỏ, hậu quả sai lớn. "3 lần đăng nhập sai/15 phút", "5 OTP/giờ", "10 lần rút tiền/ngày" — memory không đáng kể, độ chính xác thì xứng đáng. Với "1000 request API/phút" thì dùng log là lãng phí thuần tuý.

### 2.5 Sliding window counter — công thức nội suy và sai số thật

Giữ **hai** counter fixed-window: cửa sổ trước (`prev`) và hiện tại (`curr`). Gọi `e` là tỉ lệ phần đã trôi qua của cửa sổ hiện tại:

```
estimate = curr + prev × (1 − e)
```

Limit 100/phút, bây giờ 12:01:18 → `e = 18/60 = 0,3`, phần cửa sổ trước còn nằm trong cửa sổ trượt là 70%:

```
 12:00 (prev) = 84 request
 12:01 (curr) = 36 request      e = 0,30
 estimate = 36 + 84 × 0,70 = 94,8  →  94 < 100  →  CHO QUA
```

Giả định ngầm: **request trong cửa sổ trước phân bố đều**. Giả định đó gần như luôn sai một chút — và đây là chỗ reviewer giỏi sẽ hỏi: *sai theo chiều nào?*

- **Chiều lọt (false accept)**: 84 request của 12:00 dồn hết vào 12:00:59. Cửa sổ trượt [12:00:18 → 12:01:18] thật sự chứa 84 + 36 = **120 request**, thuật toán ước lượng 94,8 và vẫn cho qua → vượt 20% limit.
- **Chiều chặn nhầm (false reject)**: 84 request đó dồn vào 12:00:00–12:00:05. Cửa sổ trượt thật chỉ có 36 request, nhưng thuật toán vẫn tính 94,8 và chặn client ở request thứ ~6 tiếp theo — bị phạt oan cho traffic đã ra khỏi cửa sổ từ lâu.

Giới hạn lý thuyết của sai số là `prev × (1 − e)`, tối đa gần bằng **một lần limit** ở trường hợp bệnh hoạn nhất. Nhưng trên traffic thật phân bố đều hơn nhiều: Cloudflare công bố số liệu kinh điển — trên 400 triệu request, sliding window counter chỉ cho lọt **0,003%** request lẽ ra phải chặn, tỉ lệ chặn nhầm cùng bậc. Đó là lý do nó là lựa chọn mặc định của gần như mọi limiter thương mại.

Muốn chính xác hơn mà không tốn như log? **Chia nhỏ cửa sổ**: thay vì 2 counter cho window 60 giây, dùng **12 counter 5 giây**, cộng các bucket nằm trọn trong cửa sổ và chỉ nội suy bucket rìa. Sai số giảm theo độ phân giải, bộ nhớ chỉ tăng tuyến tính theo số bucket. Đây là kiến trúc nhiều limiter production dùng thật.

| | Bộ nhớ / key | Sai số | Round-trip | Request "có giá" |
|---|---|---|---|---|
| Token bucket | ~2 field | 0 (theo định nghĩa của nó) | 1 (Lua) | ✅ tự nhiên |
| Leaking bucket | queue | 0 | 1 + worker | ❌ |
| Fixed window | 1 int | tới 2× ở biên | 1 (`INCR`) | ⚠️ (`INCRBY`) |
| Sliding log | N × ~80 B | 0 | 1 (Lua) | ❌ |
| Sliding counter | 2 int | ~0,003% thực tế | 1 (Lua) | ⚠️ (`INCRBY`) |

> 💡 **Câu trả lời mặc định khi phỏng vấn**: "Token bucket cho quota API thương mại vì cho burst có kiểm soát và hỗ trợ request khác giá; sliding window counter khi cần con số 'X/phút' sát nghĩa; sliding window log chỉ cho hành động nhạy cảm có limit nhỏ." Ba lựa chọn cho ba ngữ cảnh mạnh hơn hẳn việc chọn một thuật toán "tốt nhất".

---

## 3. Back-of-envelope: rate limiter tốn gì

Giả định API cỡ trung: **50.000 request/giây** đỉnh, **20 triệu** user định danh, **5 triệu** IP/ngày, mỗi request kiểm **3 tầng** limit.

**Tải Redis.** Mỗi tầng một round-trip riêng → `50K × 3 = 150K ops/s`. Một node Redis xử lý an toàn ~100K ops/s. → Phải gộp 3 tầng vào **một Lua script một round-trip** (§5.4) để về `50K ops/s`, hoặc shard. Riêng con số này đã biện minh cho quyết định thiết kế quan trọng nhất của bài.

**Bộ nhớ.** Token bucket 3 tầng: `(20M + 5M + ~1K) × 130 B ≈ 3,3 GB` → chọn node ~8 GB kể cả fragmentation. Nếu dùng sliding window log cho cả 3 tầng: `~25M × 20 × 80 B ≈ 40 GB` — đắt gấp 5–10 lần **chỉ vì đổi thuật toán**. Đây là lúc con số quyết định thuật toán, không phải sở thích.

**Latency.** ElastiCache cùng AZ: RTT ~0,3–0,6 ms; khác AZ ~1–2 ms. Với API p99 = 80 ms thì 1 ms là 1,2% — chấp nhận được. Nhưng một internal service p99 = 5 ms thì thêm 1 ms là **+20% latency cho 100% request** → lúc đó phải cân nhắc local token bucket + đồng bộ định kỳ (§5.5). Luôn đặt limiter và Redis **cùng AZ**, luôn timeout ngắn (5–20 ms) trên lệnh Redis.

**Băng thông.** ~300 byte/lần kiểm → `50K × 300 B ≈ 15 MB/s`, không đáng kể. Nhưng **50K packet/giây** mới là thứ làm nóng CPU node Redis — thêm một lý do để gộp round-trip.

---

## 4. Cốt lõi của bản phân tán: state chung

### 4.1 Vì sao in-memory counter hỏng

20 instance, mỗi cái giữ counter riêng, limit 100/phút → mỗi client thực tế được **2000 request/phút**, và con số đó **đổi mỗi lần autoscaling**. Tệ hơn, limit thực phụ thuộc cách load balancer rải request: cùng một client có thể bị chặn hoặc không tuỳ may rủi.

**Sticky session** — ghim client vào một instance (cookie affinity, IP hash) để counter cục bộ thành đúng. Nghe hấp dẫn vì bỏ được Redis, nhưng: instance chết/deploy → counter về 0, client được reset quota miễn phí (kẻ tấn công có thể chủ động ép reset); một tenant lớn ghim vào một instance sẽ giết instance đó; autoscaling đảo lộn ánh xạ; và **không áp được limit global** — thứ bạn gần như chắc chắn cũng cần.

**Shared store** — counter ở Redis/Memcached/DynamoDB. Mất 1 round-trip, được tính đúng bất kể instance nào phục vụ, autoscaling vô hại. Đây là mặc định.

| | Sticky session | Shared store (Redis) |
|---|---|---|
| Độ chính xác | Đúng *nếu* ánh xạ ổn định | Đúng |
| Latency thêm | 0 | ~0,5–2 ms |
| Chịu autoscale/deploy | Kém (mất state) | Tốt |
| Global limit | Không làm được | Làm được |
| Điểm hỏng thêm | LB affinity | Redis |
| Hợp với | Limit thô, best-effort, latency cực nhạy | Gần như mọi trường hợp còn lại |

> 💡 Có lựa chọn thứ ba đáng nhắc: **gossip / eventual sync**. Mỗi instance đếm cục bộ và phát counter của mình cho các instance khác mỗi ~100 ms, quyết định dựa trên tổng ước lượng. Không có single point of failure, không round-trip trên đường nóng — đổi lại limit lỏng hơn trong cửa sổ đồng bộ. Đây là cách các limiter ở edge (nhiều PoP toàn cầu) buộc phải làm, vì đồng bộ đồng thời xuyên lục địa là bất khả thi.

### 4.2 Race condition — chính xác nó nằm ở dòng nào

Đây là câu hỏi phân biệt "đã đọc" với "đã làm". Cách cài ngây thơ:

```python
count = redis.get(key)          # ① đọc
if count < limit:               # ② so sánh
    redis.incr(key)             # ③ ghi
    allow()
```

Với 20 instance cùng phục vụ một client, tất cả có thể thực thi ① trước khi bất kỳ ai chạm ③:

```
 t0   A: GET → 99        B: GET → 99        C: GET → 99
 t1   A: 99 < 100 ✔      B: 99 < 100 ✔      C: 99 < 100 ✔
 t2   A: INCR → 100      B: INCR → 101      C: INCR → 102
      ⇒ 3 request được chấp nhận khi chỉ còn 1 suất
```

**Lost update** kinh điển, và mức nghiêm trọng tỉ lệ thuận với tốc độ tấn công: bắn song song càng nhiều càng lọt nhiều. Với limit kiểu "1 lần đổi quà" thì đây là lỗ hổng nghiệp vụ thật, không phải khiếm khuyết học thuật.

| Cách chữa | Cơ chế | Vấn đề |
|---|---|---|
| Distributed lock (`SETNX`) | Khoá key trước khi đọc-ghi | Thêm 2 round-trip; lock chết phải chờ TTL; giết throughput. **Đừng dùng** |
| `WATCH`/`MULTI`/`EXEC` | Optimistic, retry khi xung đột | Đúng, nhưng hot key → bão retry; nhiều round-trip |
| `INCR` + `EXPIRE` | Lệnh atomic sẵn có | Đúng cho fixed window, nhưng là **hai** lệnh → key có thể mất TTL |
| **Lua script** | Read-modify-write nguyên tử trong Redis | Lựa chọn đúng cho mọi thuật toán |

Redis thực thi Lua script **đơn luồng và nguyên tử** — không lệnh nào xen vào giữa. Toàn bộ "đọc, tính lại token, quyết định, ghi" thành một thao tác không thể chia cắt, mà vẫn chỉ tốn **một** round-trip.

Ngay cả `INCR` cũng có bẫy:

```
INCR   rl:u123:12:01      # nếu tiến trình chết ở đây...
EXPIRE rl:u123:12:01 60   # ...dòng này không chạy → key sống vĩnh viễn
```

Key không TTL tích tụ đến khi Redis chạm `maxmemory`, kích hoạt eviction — evict nhầm key của limiter khác. Chữa bằng Lua, hoặc `SET key 0 EX 60 NX` rồi `INCR`.

---

## 5. Cài đặt: Lua script và các biến thể

### 5.1 Token bucket nguyên tử (bản dùng được trong production)

```lua
-- KEYS[1] : khoá bucket, vd "rl:tb:{user:123}"
-- ARGV[1] : capacity | ARGV[2] : refill_rate (token/giây)
-- ARGV[3] : now_ms (đồng hồ caller) | ARGV[4] : cost (token request này tiêu)
-- trả về  : { allowed(0|1), tokens_remaining, retry_after_ms, reset_ms }

local capacity = tonumber(ARGV[1])
local rate     = tonumber(ARGV[2])
local now      = tonumber(ARGV[3])
local cost     = tonumber(ARGV[4])

local state  = redis.call('HMGET', KEYS[1], 't', 'ts')
local tokens = tonumber(state[1])
local ts     = tonumber(state[2])
if tokens == nil then tokens = capacity; ts = now end   -- lần đầu: xô đầy

-- nạp lại theo thời gian đã trôi (chặn âm phòng khi đồng hồ lùi)
local delta = math.max(0, now - ts) / 1000.0
tokens = math.min(capacity, tokens + delta * rate)

local allowed, retry_after = 0, 0
if tokens >= cost then
  tokens  = tokens - cost
  allowed = 1
else
  retry_after = math.ceil(((cost - tokens) / rate) * 1000)
end

redis.call('HSET', KEYS[1], 't', tokens, 'ts', now)
-- TTL = thời gian để xô đầy lại + biên an toàn: key im lặng lâu hơn thế
-- thì trạng thái của nó không còn ý nghĩa (xô đầy ≡ chưa từng tồn tại)
redis.call('PEXPIRE', KEYS[1], math.ceil((capacity / rate) * 1000) + 1000)

return { allowed, math.floor(tokens), retry_after,
         math.ceil(((capacity - tokens) / rate) * 1000) }
```

Vài chi tiết không hiển nhiên:

- **`now` truyền từ client, không dùng `redis.call('TIME')`** — lý do lịch sử là replication phải tất định, lý do thực tế là bạn muốn kiểm soát và test được nguồn thời gian. Cái giá là **clock skew**: nếu server A lệch +2 giây và ghi `ts = T+2`, server B tới với `now = T` sẽ tính `delta` âm — đó là lý do phải có `math.max(0, …)`. Chạy NTP/chrony và nêu rõ đây là một giả định.
- **TTL tự dọn** giữ bộ nhớ hữu hạn mà không cần job dọn dẹp.
- **`{user:123}`** là hash tag của Redis Cluster, xem §5.4.
- Phía app, `SCRIPT LOAD` một lần rồi `EVALSHA`, và luôn xử lý `NOSCRIPT` bằng cách `EVAL` lại — Redis restart là mất script cache.

### 5.2 Sliding window log bằng sorted set

```lua
-- KEYS[1] "rl:swl:{user:123}" | ARGV: window_ms, limit, now_ms, member duy nhất
local window, limit, now = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])

redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, now - window)   -- dọn entry hết hạn
local used = redis.call('ZCARD', KEYS[1])

if used < limit then
  redis.call('ZADD', KEYS[1], now, ARGV[4])   -- CHỈ ghi khi được chấp nhận
  redis.call('PEXPIRE', KEYS[1], window)
  return { 1, limit - used - 1, 0 }
end

local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')  -- suất sớm nhất hết hạn khi nào
redis.call('PEXPIRE', KEYS[1], window)
return { 0, 0, math.ceil(tonumber(oldest[2]) + window - now) }
```

`ZADD` nằm **trong** nhánh cho qua (§2.4), và `retry_after` tính chính xác từ entry cũ nhất — đây là thuật toán duy nhất trả `Retry-After` đúng tuyệt đối.

### 5.3 Sliding window counter

```lua
-- KEYS[1] counter cửa sổ hiện tại, KEYS[2] cửa sổ trước
-- ARGV: limit, window_ms, elapsed_ms trong cửa sổ hiện tại
local limit, window, elapsed = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])
local curr = tonumber(redis.call('GET', KEYS[1])) or 0
local prev = tonumber(redis.call('GET', KEYS[2])) or 0

local estimate = curr + prev * (1 - elapsed / window)
if estimate >= limit then return { 0, 0 } end

redis.call('INCR', KEYS[1])
redis.call('PEXPIRE', KEYS[1], window * 2)   -- phải sống qua cả lượt làm "prev"
return { 1, math.floor(limit - estimate - 1) }
```

`PEXPIRE` bằng `2 × window` là chi tiết quan trọng: counter hiện tại còn được đọc suốt cửa sổ kế tiếp với vai trò `prev`. Đặt TTL bằng `window` là một **bug im lặng** — `prev` luôn bằng 0 và thuật toán thoái hoá thành fixed window, mang lại đúng lỗi biên mà ta định tránh.

### 5.4 Multi-tier trong một script — và bẫy "đếm rồi mới bị chặn"

Thực tế bạn cần nhiều tầng cùng lúc:

| Tầng | Key | Mục đích |
|---|---|---|
| Global | `rl:global` | Bảo vệ tổng dung lượng hệ thống |
| Per-tenant | `rl:tenant:{t42}` | Công bằng giữa khách hàng, quota hợp đồng |
| Per-user | `rl:user:{u123}` | Chống một user chiếm hết quota tenant |
| Per-IP | `rl:ip:{1.2.3.4}` | Chống abuse khi chưa/không đăng nhập |
| Per-endpoint | `rl:user:{u123}:POST:/reports` | Bảo vệ endpoint đắt tiền riêng |

Kiểm từng tầng bằng từng lệnh riêng sinh ra một lỗi tinh vi: per-IP pass (đã `INCR`, đã tiêu 1 suất), per-user pass (tiêu 1 suất), rồi per-endpoint **fail**. Request bị từ chối nhưng bạn đã trừ quota ở hai tầng đầu — client bị tính tiền cho request chưa từng được phục vụ. Kẻ tấn công cố tình bắn vào endpoint bị chặn có thể **bào mòn quota tầng trên** mà không tốn gì: một dạng amplification.

Cách đúng: **kiểm tất cả trước, chỉ commit khi tất cả pass**, trong một Lua script để giữ nguyên tử.

```lua
-- KEYS = key của mọi tầng; ARGV = limit tương ứng + TTL
for i = 1, #KEYS do                                   -- Pha 1: chỉ ĐỌC
  local used = tonumber(redis.call('GET', KEYS[i])) or 0
  if used >= tonumber(ARGV[i]) then
    return { 0, i }                                   -- từ chối; CHƯA ghi gì cả
  end
end
for i = 1, #KEYS do                                   -- Pha 2: mọi tầng còn chỗ
  redis.call('INCR', KEYS[i])
  redis.call('EXPIRE', KEYS[i], tonumber(ARGV[#KEYS + 1]), 'NX')
end
return { 1, 0 }
```

**Thứ tự đánh giá** vẫn quan trọng, nhưng vì lý do chi phí và thông tin:

1. Tầng **rẻ và cục bộ** kiểm trước (blocklist trong bộ nhớ, giới hạn kích thước body) — không cần đi mạng.
2. Tầng **chặn nhiều nhất** kiểm sớm trong nhóm còn lại để short-circuit.
3. Tầng **cụ thể nhất** (per-endpoint) phải được nêu trong thông báo lỗi, vì đó là thứ client sửa được.
4. Tầng **global** nên là cuối, và thực ra nên được coi là *load shedding* (§7): khi nó kích hoạt, ưu tiên bỏ traffic hạng thấp trước, không bỏ đều.

> ⚠️ **Bẫy Redis Cluster**: một Lua script chỉ được đụng các key **cùng hash slot**. `rl:user:u123` và `rl:ip:1.2.3.4` gần như chắc chắn khác slot → lỗi `CROSSSLOT`. Chữa bằng **hash tag**: đặt cùng một phần trong `{}` cho mọi key của một request (`rl:{u123}:user`, `rl:{u123}:ip`). Nhưng như vậy **mọi key của một user rơi về cùng một node** — bạn vừa tự tạo hot key cho tenant lớn. Đây là đánh đổi thật, không có lời giải đẹp: hoặc nhiều script (mất nguyên tử xuyên tầng), hoặc gom slot (mất phân tán). Cách thực dụng phổ biến: gom theo user cho các tầng liên quan user, để tầng global/IP ở script riêng và chấp nhận sai số nhỏ ở đó.

### 5.5 Giảm round-trip: local bucket + lease

Khi 1 ms cũng quá đắt, hoặc Redis đã nóng: mỗi instance xin trước một khối token (vd 20) và tiêu dần trong bộ nhớ, chỉ gọi lại Redis khi hết hoặc sau T ms.

```
instance A ──"cho tôi 20 token"──▶ Redis   (1 round-trip)
   tiêu tại chỗ: 20 request tiếp theo mất 0 ms
   hết token / hết 200 ms → xin tiếp
```

Giảm tải Redis đúng bằng hệ số batch. Đổi lại limit lỏng hơn: tại một thời điểm có tới `N_instance × batch` token "nằm ngoài sổ" — 50 instance × batch 20 = có thể lọt thêm 1000 request. Instance chết mang theo token chưa dùng → client mất quota im lặng (trừ khi lease có TTL trả token về). Hợp khi limit lớn và mục tiêu là *bảo vệ dung lượng*; **đừng** dùng cho "3 lần OTP/giờ".

### 5.6 Hot key — khi một key giết cả cluster

Redis Cluster chia key theo 16384 slot, mỗi slot thuộc một node, và **mỗi node xử lý lệnh đơn luồng**. Nghĩa là dù cluster có 50 node, một key duy nhất vẫn chỉ được phục vụ bởi **một core của một node**. Rate limiter là nơi sinh hot key tự nhiên nhất: `rl:global` nhận mọi request; một tenant khổng lồ (hoặc một bot) tạo 80% traffic trên một key; một endpoint viral hút hết traffic trong 10 phút.

Triệu chứng: một node Redis 100% CPU trong khi các node khác nhàn rỗi, p99 của **toàn bộ** API tăng vọt, `redis-cli --hotkeys` / `SLOWLOG` chỉ vào một key.

| Cách chữa | Cơ chế | Đánh đổi |
|---|---|---|
| **Shard key** | Tách `rl:global` thành `rl:global:0..N-1`, mỗi shard giữ `limit/N` | Tải không đều → limit hiệu dụng **thấp hơn** danh nghĩa; shard cạn trước thì client rơi vào đó bị chặn sớm |
| **Local + lease** (§5.5) | Chỉ chạm Redis mỗi N request | Limit lỏng hơn |
| **Hai tầng: local thô + Redis chuẩn** | Instance tự chặn client vượt xa ngưỡng trước khi gọi Redis | Chỉ giúp với abuser rõ ràng |
| **Client-side caching** (Redis 6+) | Cache kết quả "đã bị chặn" vài trăm ms tại client | Chỉ an toàn cho quyết định *từ chối*, không cho *chấp nhận* |
| **Cụm Redis riêng cho limiter** | Hot key của limiter không làm hỏng cache nghiệp vụ | Thêm hạ tầng, thêm chi phí |

Chi tiết đáng nói về shard key: chọn shard **ngẫu nhiên** mỗi request thì do phương sai nhị thức, một shard có thể cạn trong khi shard khác còn chỗ → tăng chặn nhầm. Giảm bằng cách chọn shard **theo instance id** (phân bố ổn định hơn), hoặc "power of two choices" — thử 2 shard ngẫu nhiên, dùng cái còn nhiều token hơn. Với `N` nhỏ (4–16) và traffic lớn, sai số này nhỏ và chấp nhận được.

> 💡 **Nguyên tắc**: hot key là bài toán **phân mảnh không gian khoá**, không phải bài toán thêm node. Thêm node không cứu được một key.

---

## 6. Hợp đồng với client: header, mã lỗi, fail mode

### 6.1 Trả gì cho client

Limiter tốt phải cho client biết **hiện trạng** (còn bao nhiêu suất), không chỉ **phán quyết**. Client biết trước sẽ tự điều tiết, giảm tải cho chính bạn.

| Header | Nghĩa | Ghi chú |
|---|---|---|
| `X-RateLimit-Limit` | Quota tối đa trong cửa sổ | De-facto (GitHub, Twitter). Chuẩn IETF mới bỏ tiền tố `X-`: `RateLimit-Limit` |
| `X-RateLimit-Remaining` | Số suất còn lại | Trả ở **mọi** response, không chỉ khi 429 |
| `X-RateLimit-Reset` | Khi nào quota hồi | Chọn **một** quy ước: epoch giây (GitHub) hoặc *số giây còn lại* — và ghi rõ trong tài liệu. Nhầm hai cái này là bug tích hợp phổ biến nhất |
| `Retry-After` | Chờ bao lâu rồi thử lại | Chuẩn HTTP (RFC 9110), số giây hoặc HTTP-date. Chỉ gửi kèm 429/503 |
| `RateLimit-Policy` | Mô tả chính sách, vd `100;w=60` | Chuẩn IETF, hữu ích khi nhiều tầng quota |

Mã trạng thái: **429 Too Many Requests** cho "bạn vượt quota của bạn". Đừng dùng 403 (nghĩa về quyền), đừng dùng 503 (nghĩa server đang có vấn đề — client và CDN diễn giải khác). Ngược lại, khi từ chối vì **hệ thống quá tải chứ không phải lỗi client** thì 503 + `Retry-After` mới đúng; phân biệt này giúp bên gọi biết có nên alert hay không.

Body nên ghi rõ **tầng nào** chặn, vì đó là thứ client sửa được:

```json
{
  "error": "rate_limit_exceeded",
  "scope": "per_user_endpoint",
  "limit": 100,
  "window_seconds": 60,
  "retry_after_seconds": 23
}
```

> ⚠️ **Bẫy vận hành**: `Retry-After` không có jitter làm mọi client bị chặn cùng lúc quay lại cùng lúc — một **thundering herd** do chính bạn lên lịch. Thêm jitter ngay phía server (`retry_after × (1 + random(0; 0,3))`). Và đừng để 429 bị CDN cache với TTL dài.

### 6.2 Redis chết thì làm gì: fail-open hay fail-closed

Đây là câu hỏi thiết kế quan trọng nhất của cả bài, và nó **không có đáp án kỹ thuật** — nó là quyết định nghiệp vụ.

| | Fail-open (cho qua) | Fail-closed (chặn) |
|---|---|---|
| Ưu tiên | Availability | Bảo vệ tài nguyên |
| Rủi ro | Mất khả năng chống abuse đúng lúc dễ tổn thương nhất | Tự gây outage toàn phần từ một sự cố cache |
| Hợp với | API sản phẩm, traffic chủ yếu hợp lệ | Login, OTP, thanh toán, đổi thưởng |

Câu trả lời trưởng thành là **cả hai, theo từng tầng**: quota thương mại fail-open (mất tiền ít hơn mất khách), brute-force login fail-closed (một phút Redis chết không được phép thành cửa sổ vàng cho credential stuffing). Và giữa hai cực còn có lựa chọn tốt hơn cả hai:

- **Degraded local limiting**: Redis chết → chuyển sang in-memory limiter với hạn mức chặt hơn (vd `limit/N_instance`). Không đúng tuyệt đối nhưng hơn hẳn mở toang.
- **Circuit breaker quanh chính Redis**: lỗi vượt ngưỡng thì ngừng gọi trong 5 giây. Đừng để mỗi request phải chờ hết timeout mới fail-open — đó là cách một Redis *chậm* kéo sập API dù bạn đã chọn fail-open.
- **Timeout ngắn bắt buộc** (5–20 ms). Redis chậm nguy hiểm hơn Redis chết, vì nó không kích hoạt bất kỳ nhánh xử lý lỗi nào.
- **Alarm to**: fail-open âm thầm là cách sự cố bảo mật ủ bệnh hàng tháng. Metric `limiter_fail_open_total` phải có alert.

> 💡 Hãy phát biểu chế độ hỏng **trước khi** được hỏi: "Quota API tôi fail-open kèm alarm; login tôi fail-closed và chấp nhận từ chối đăng nhập trong lúc Redis chết, vì rủi ro brute-force lớn hơn."

---

## 7. Phân biệt bốn thứ hay bị gộp làm một

| | Câu hỏi nó trả lời | Kích hoạt bởi | Nhìn vào | Hành động |
|---|---|---|---|---|
| **Rate limiting** | "Client này có vượt quota *của nó* không?" | Hành vi **một** client | Counter theo định danh client | Từ chối (429) |
| **Throttling** | "Có nên làm chậm client này lại không?" | Như trên | Như trên | **Trễ / xếp hàng / giảm tốc**, không nhất thiết từ chối |
| **Load shedding** | "Hệ thống *tôi* có đang quá tải không?" | Sức khoẻ của **server** | CPU, độ dài hàng đợi, latency | Bỏ bớt request theo hạng ưu tiên |
| **Circuit breaker** | "Dependency *tôi gọi* có đang hỏng không?" | Sức khoẻ của **downstream** | Tỉ lệ lỗi/timeout khi gọi ra | Ngừng gọi, fail nhanh, thử lại theo chu kỳ |

**Rate limiting nhìn client, load shedding nhìn chính mình.** Hệ thống có thể quá tải dù **không** client nào vượt quota — chỉ vì có quá nhiều client hợp lệ cùng lúc, hoặc vì một replica DB vừa chết làm dung lượng giảm nửa. Rate limiter tĩnh không cứu được tình huống này vì nó không biết hệ thống đang khoẻ hay yếu. Đó là lý do mọi hệ thống nghiêm túc cần **cả hai**.

**Load shedding phải có thứ hạng (priority).** Bỏ đều là bỏ dở: giữa một health-check nội bộ, một retry lần ba, và một checkout của khách trả tiền, phải bỏ theo đúng thứ tự đó. Thực dụng: gắn `priority` vào request ở gateway, tải cao thì nâng dần ngưỡng — bỏ prefetch trước, rồi analytics, rồi read không quan trọng, checkout bỏ sau cùng. Nâng cao hơn: **adaptive LIFO** (hàng đợi dài thì phục vụ request mới nhất trước, vì request cũ nhiều khả năng đã bị client timeout — phục vụ nó là lãng phí thuần tuý) và **CoDel** (đo thời gian nằm chờ, bỏ request đã chờ quá ngưỡng).

**Circuit breaker bảo vệ người khác, rate limiter bảo vệ mình.** Breaker mở khi *downstream* hỏng, để (a) bạn fail nhanh thay vì cạn thread pool vì chờ timeout, và (b) downstream có khoảng lặng để hồi phục thay vì bị bão retry đè chết.

```
       ┌────────── request vào ──────────┐
       ▼                                 │
  rate limit (client này vượt quota?)    │ 429
       ▼                                 │
  load shed  (tôi có đang quá tải?)      │ 503 + Retry-After
       ▼                                 │
  xử lý nghiệp vụ                        │
       ▼                                 │
  circuit breaker (downstream sống?)     │ fail nhanh / fallback
       ▼
  gọi downstream (kèm throttle đầu ra = leaking bucket)
```

Thứ tự không tuỳ tiện: kiểm tra rẻ nhất và từ chối sớm nhất trước, chỉ tiêu tài nguyên đắt sau khi qua mọi cổng.

---

## 8. Khi định danh không đáng tin: NAT và IPv6

Rate limit theo IP là bản năng đầu tiên của mọi người, và nó sai ở **cả hai** đầu.

**Quá chặt với IPv4 sau NAT.** Một trường đại học, một toà văn phòng, hay cả một nhà mạng dùng CGNAT có thể đẩy **hàng chục nghìn** người dùng thật ra internet qua một IPv4 duy nhất. "100 request/phút mỗi IP" nghĩa là bạn vừa chặn cả công ty của khách hàng — loại sự cố tinh vi nhất, vì chỉ một nhóm bị ảnh hưởng và họ hiếm khi báo cáo, họ chỉ bỏ đi.

**Quá lỏng với IPv6.** Một thuê bao IPv6 thường được cấp nguyên prefix `/64` — tức `2^64` địa chỉ. Đếm theo địa chỉ đầy đủ (`/128`) thì kẻ tấn công chỉ cần đổi địa chỉ mỗi request là có quota vô hạn, **và** bảng counter của bạn phình vô hạn (một dạng tấn công memory). Với IPv6, đơn vị đếm phải là **prefix**: `/64` cho người dùng cuối, thêm tầng lỏng hơn ở `/48`–`/56` để bắt mạng được cấp nhiều `/64`.

Các lớp phòng thủ, theo thứ tự nên áp dụng:

1. **Chuẩn hoá đơn vị đếm.** IPv4 → `/32` (hoặc `/24` cho phòng thủ thô); IPv6 → `/64` và `/48`. Không bao giờ đếm IPv6 theo `/128`.
2. **Lấy IP client cho đúng.** `X-Forwarded-For` do client gửi có thể giả mạo tuỳ ý. Chỉ tin các hop **từ proxy tin cậy của bạn trở vào**: duyệt XFF từ **phải sang trái**, bỏ qua IP thuộc dải proxy của bạn, lấy IP đầu tiên không thuộc dải đó. Trên AWS dùng `CloudFront-Viewer-Address` hoặc cấu hình `xff_header_processing` của ALB thay vì tự parse.
3. **Đừng dùng IP làm định danh chính khi có định danh tốt hơn.** Endpoint yêu cầu đăng nhập thì đếm theo `user_id` — định danh đắt tiền để tạo mới. IP chỉ là tầng phòng thủ cho traffic ẩn danh.
4. **Phân tầng theo độ chặt**: per-IP rất lỏng (chỉ bắt abuser cực đoan), per-account/per-device chặt. Văn phòng 5000 người không bị kẹt, mà bot dùng một tài khoản vẫn bị chặn.
5. **Làm việc tạo định danh mới tốn kém.** Quota gắn với account mà account tạo miễn phí trong 3 giây thì rate limit chỉ là gờ giảm tốc. Xác minh email/SĐT, giới hạn số account mỗi IP/ngày — chi phí đăng ký là một phần của thiết kế rate limiter.
6. **Leo thang thay vì chặn cứng**: thêm độ trễ (tarpit) → CAPTCHA/proof-of-work → bắt xác thực → chặn. Mỗi bậc tăng chi phí cho kẻ tấn công nhiều hơn cho người dùng thật.
7. **Tín hiệu ngoài IP**: TLS fingerprint (JA3/JA4), device ID, thứ tự header, tỉ lệ gọi endpoint đắt. Không tín hiệu nào đủ một mình, kết hợp thì khó giả mạo hơn hẳn.

> ⚠️ **Bẫy**: ghép "IP + User-Agent" làm khoá đếm để "chính xác hơn". UA do client tự khai và đổi tự do — bạn vừa biến một khoá không hoàn hảo thành khoá **vô dụng**. Thêm một trường vào khoá luôn làm limiter **lỏng hơn**, không bao giờ chặt hơn. Chỉ ghép thêm trường mà client **không** kiểm soát được.

---

## 9. Bottleneck & failure mode

**Cái gì nghẽn trước.** Gần như luôn là **một key nóng trên một node Redis**, không phải tổng throughput cluster (§5.6): một node 100% CPU, các node khác 10%, p99 toàn API tăng. Thứ hai là **số round-trip mỗi request** — mỗi tầng limit là thêm một chuyến đi mạng nếu không gộp script. Thứ ba, ít ngờ hơn, là **connection pool tới Redis**: 50 connection mỗi instance nghe thừa, cho tới khi Redis chậm lại 10 ms và pool cạn trong vài trăm ms, biến sự cố Redis thành outage toàn phần.

**Redis failover.** Với ElastiCache replication group, failover mất vài giây và replicate **bất đồng bộ** — một phần counter vừa ghi có thể mất, nên sau failover một số client được reset quota. Chấp nhận được cho quota API; không chấp nhận cho "3 lần OTP" — hãy đặt các limit nhạy cảm ở store bền hơn (DynamoDB conditional write), đổi latency lấy độ bền.

**Cấu hình sai** là nguyên nhân sự cố rate limiter phổ biến nhất trong thực tế, hơn cả hạ tầng chết: ai đó đổi `100/phút` thành `100/giây`, hoặc bật limit mới cho toàn bộ khách hàng cùng lúc. Phòng ngừa: luôn có **chế độ shadow/dry-run** — tính toán và ghi metric "lẽ ra đã chặn" mà không chặn thật, chạy vài ngày, xem ai bị ảnh hưởng, rồi mới bật, và roll out theo phần trăm khách hàng.

**Đồng hồ lệch.** Token bucket dùng `now` từ app server; `math.max(0, …)` chặn được chiều lùi, còn chiều tiến (server chạy nhanh) thì nạp token sớm → limit lỏng hơn. NTP là bắt buộc, không phải tuỳ chọn.

**Rate limiter tự nó bị tấn công.** Mỗi request bị chặn vẫn tốn một round-trip và một entry counter. Nếu khoá đếm có không gian vô hạn (IPv6 `/128`, hay bất kỳ giá trị nào client tự chọn), kẻ tấn công làm Redis hết bộ nhớ. Luôn giới hạn **lực lượng của không gian khoá**, luôn đặt TTL, và cân nhắc đẩy việc chặn các nguồn đã xác định là xấu xuống tầng rẻ hơn (WAF).

**Quan sát được.** Tối thiểu bốn metric gắn nhãn theo tầng: request chấp nhận, request từ chối, latency lệnh Redis, số lần fail-open. Thêm bảng top-N khoá bị chặn nhiều nhất — công cụ điều tra đầu tiên khi khách hàng phàn nàn "API của các anh chặn tôi".

---

## Liên hệ sang AWS

| Thành phần thiết kế | Dịch vụ AWS | Vì sao hợp |
|---|---|---|
| Limiter ở edge, chống DDoS/scraping | **AWS WAF rate-based rule** | Đánh giá theo cửa sổ trượt (mặc định 5 phút) trên IP nguồn hoặc **custom aggregate key** (header, cookie, query string, JA3). Chặn trước khi chạm origin → tiết kiệm cả băng thông lẫn compute. Đổi lại: độ phân giải thô, có độ trễ cập nhật |
| Quota thương mại theo khách hàng | **API Gateway usage plan + API key** | Chính là **token bucket**: `rate` = refill rate, `burst` = capacity; kèm quota ngày/tuần/tháng, trả 429 chuẩn — không phải viết dòng code nào |
| Bảo vệ toàn account | **API Gateway account-level throttling** | Mặc định 10.000 rps, burst 5.000 mỗi region — đây là **load shedding** cấp hạ tầng chứ không phải quota per-client; cần biết con số này khi ước lượng |
| State counter/token phân tán | **ElastiCache for Redis** | Lua script nguyên tử một round-trip; đặt **cùng AZ** với compute để RTT < 1 ms; cluster mode để scale, kèm hash tag tránh `CROSSSLOT` |
| Limit nhạy cảm cần bền qua failover | **DynamoDB** (`UpdateItem` + condition expression) | Atomic counter bền vững, không mất khi cache failover. Latency ~5–10 ms → chỉ dùng cho limit ít gọi và quan trọng (OTP, đổi thưởng) |
| Chặn/định tuyến tại edge, rẻ | **CloudFront Functions** / **Lambda@Edge** | Functions chạy sub-millisecond ngay tại PoP, hợp kiểm tra rất nhẹ. Không có state chia sẻ toàn cầu → chỉ làm được limit thô |
| Rate limit trước ALB | **WAF gắn vào ALB** | ALB tự nó **không** rate limit (chỉ có giới hạn connection/target); muốn giới hạn tầng 7 phải gắn WAF hoặc làm ở app |
| Lấy IP client chính xác | `CloudFront-Viewer-Address`, xử lý XFF của ALB | Tránh tự parse `X-Forwarded-For` rồi bị giả mạo |
| Bảo vệ backend khỏi Lambda bùng nổ | **Lambda reserved concurrency** | Chính là **load shedding**: vượt hạn mức thì invoke bị throttle; cũng giữ một hàm không ăn hết concurrency của cả account |
| Leaking bucket cho traffic ra | **SQS + consumer giới hạn concurrency** | Hàng đợi hấp thụ burst, consumer chảy đều — đúng mô hình leaking bucket khi gọi API bên thứ ba có quota cứng |
| Tấn công thể tích lớn | **Shield Advanced** + WAF | Limiter tầng 7 không cứu được tấn công tầng 3/4 |
| Đồng hồ chuẩn cho token bucket | **Amazon Time Sync Service** | Lệch dưới 1 ms, miễn phí qua link-local — loại bỏ cả một lớp bug clock skew |
| Quan sát & alarm | **CloudWatch** + WAF sampled requests | Tỉ lệ 429, latency Redis, `fail_open` count; sampled requests để xem ai đang bị chặn |

**Kiến trúc mặc định gọn**: CloudFront (+ WAF rate-based rule theo IP/JA3, rất lỏng) → API Gateway (usage plan token bucket theo API key) → app trên ECS/Lambda có middleware gọi ElastiCache Redis bằng một Lua script gộp per-user/per-endpoint → Lambda reserved concurrency làm van an toàn cuối. Bốn tầng, mỗi tầng bảo vệ một loại tài nguyên và hỏng theo một kiểu khác nhau.

---

## Cách trình bày khi phỏng vấn / review

1. **Chốt định danh đếm ngay từ đầu.** Câu hỏi đầu tiên phải là *"đếm theo gì — user, API key, IP, tenant, hay tổ hợp?"*, không phải *"dùng thuật toán nào?"*. Chọn sai định danh thì thuật toán nào cũng vô nghĩa; nói luôn rằng định danh phải đã xác thực hoặc client không tự chọn được.
2. **Hỏi mục tiêu thật.** "Chống abuse", "công bằng giữa tenant", "bảo vệ dung lượng", "thực thi hợp đồng thương mại" dẫn tới bốn thiết kế khác nhau — và mục tiêu thứ ba thực ra là load shedding chứ không phải rate limiting. Nói được điều đó là một điểm cộng lớn.
3. **Ra số trước khi vẽ.** "50K rps × 3 tầng = 150K ops/s lên Redis, vượt sức một node" dẫn tự nhiên tới quyết định gộp Lua script và shard key. Không có số thì mọi lựa chọn trông tuỳ tiện.
4. **Nêu thuật toán kèm ngữ cảnh, đừng xếp hạng.** Ba lựa chọn cho ba ngữ cảnh (§2.5) thay vì một thuật toán "tốt nhất".
5. **Chủ động vẽ race condition.** Viết ra `GET → so sánh → INCR`, chỉ ra ba instance cùng đọc 99, rồi nói "vì vậy tôi gói vào Lua script — Redis đơn luồng nên toàn bộ read-modify-write là nguyên tử, vẫn chỉ một round-trip". Đây là khoảnh khắc thuyết phục nhất của cả bài.
6. **Nói về lỗi biên bằng con số**, không bằng tính từ: "5 request lúc 12:00:59 cộng 5 request lúc 12:01:00 là 10 request trong 2 giây với limit 5/phút". Cụ thể luôn thắng trừu tượng.
7. **Đừng bỏ qua hot key.** Nhiều người dừng ở "dùng Redis là xong". Một câu — *"`rl:global` sẽ là hot key vì một key chỉ nằm trên một node, thêm node không cứu được; tôi sẽ shard thành N key con hoặc dùng lease cục bộ"* — tách bạn khỏi phần còn lại.
8. **Phát biểu chế độ hỏng trước khi bị hỏi**: fail-open cho quota, fail-closed cho login, timeout 10 ms, circuit breaker quanh Redis, alarm khi fail-open. Bốn ý mất 20 giây để nói và thể hiện kinh nghiệm vận hành thật.
9. **Nhắc hợp đồng với client**: header `X-RateLimit-*`, `Retry-After` có jitter, 429 chứ không phải 403, body chỉ rõ tầng nào chặn. Rate limiter là API hướng tới con người, không chỉ là một cái cổng.
10. **Kết bằng rollout**: "Tôi sẽ bật ở chế độ shadow, đo xem ai lẽ ra bị chặn, rồi mới thực thi theo từng phần trăm khách hàng." Sự cố rate limiter phần lớn đến từ cấu hình chứ không từ hạ tầng — biết điều đó là dấu hiệu đã làm thật.

> 💡 **Nguyên tắc cuối**: một rate limiter hoàn hảo về mặt toán học nhưng chặn nhầm khách trả tiền là một thất bại; một rate limiter xấp xỉ 0,003% nhưng không bao giờ làm ai ngạc nhiên là một thành công. Ba câu hỏi luôn phải trả lời được: **đếm theo gì, state ở đâu, và khi store chết thì chuyện gì xảy ra.**
