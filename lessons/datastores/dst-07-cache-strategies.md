# Bài 7 — Cache strategies: aside, read/write-through, write-behind

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân biệt **4 chiến lược cache** cốt lõi: **cache-aside** (lazy loading), **read-through**, **write-through**, **write-behind** (write-back) — ai chịu trách nhiệm đọc/ghi và luồng dữ liệu đi qua đâu.
- Viết đúng **code cache-aside** — pattern phổ biến nhất — và biết các cạm bẫy của nó.
- Hiểu **TTL & staleness**: vì sao cache luôn có nguy cơ trả dữ liệu cũ, và cách kiểm soát.
- Chọn **nơi đặt cache** (browser → CDN → app-local → distributed) theo tầng.
- Cân **trade-off nhất quán (consistency) vs hiệu năng (performance)** để chọn đúng chiến lược cho từng bài toán.

---

## 2. Lý thuyết

### 2.1 Vấn đề gốc: cache là "bản sao thứ hai"

> **Cache** là một bản sao dữ liệu đặt ở nơi truy cập nhanh hơn nguồn thật (database). Nó tồn tại vì một sự thật phũ phàng: database chậm và đắt khi phải phục vụ hàng vạn read giống nhau, còn RAM/Redis trả lời trong micro giây (xem [[dst-01-redis-intro]]).

Nhưng khoảnh khắc bạn có **hai bản sao** của một dữ liệu (một trong cache, một trong DB), bạn thừa hưởng bài toán khó nhất của hệ phân tán: **giữ chúng đồng bộ**. Mọi chiến lược cache thực chất chỉ là một câu trả lời khác nhau cho câu hỏi: *"Ai đọc/ghi vào đâu, theo thứ tự nào, và chấp nhận lệch bao lâu?"*

Có hai trục quyết định để phân loại:
- **Đọc**: khi cache **miss**, ai đi lấy từ DB — *ứng dụng* (cache-aside) hay *chính cache* (read-through)?
- **Ghi**: khi update dữ liệu, ghi vào DB **đồng bộ** (write-through), hay ghi cache trước rồi **flush DB sau** (write-behind)?

### 2.2 Analogy đời thường

Hình dung một **thủ thư** (cache) đứng trước một **kho sách khổng lồ dưới tầng hầm** (DB):
- **Cache-aside**: bạn tự hỏi thủ thư "có cuốn X không?". Không có → *bạn* tự xuống hầm lấy, rồi *bạn* đưa cho thủ thư giữ hộ cho lần sau. Thủ thư khá "thụ động".
- **Read-through**: bạn hỏi thủ thư "cuốn X". Không có → *thủ thư* xuống hầm lấy giúp bạn, tự cất lên kệ, rồi đưa bạn. Bạn không bao giờ phải biết cái hầm tồn tại.
- **Write-through**: bạn trả sách. Thủ thư *vừa* để lên kệ *vừa* chạy xuống hầm cất — xong mới báo bạn "đã nhận". Chắc chắn, nhưng bạn chờ lâu hơn.
- **Write-behind**: thủ thư nhận sách, để tạm lên kệ, gật đầu "ok xong" ngay — rồi *lát nữa* gom một mẻ mang xuống hầm. Bạn được phục vụ nhanh, nhưng nếu thủ thư ngất xỉu trước khi kịp mang xuống, mẻ sách đó *mất*.

### 2.3 Cache-aside (lazy loading) — phổ biến nhất

Ứng dụng đóng vai "nhạc trưởng": nó nói chuyện với **cả cache lẫn DB**. Cache chỉ là một cái kho key→value ngốc nghếch, không biết gì về DB.

Luồng **đọc**:
1. Đọc cache theo key.
2. **Hit** → trả về ngay.
3. **Miss** → đọc DB → **ghi ngược** kết quả vào cache (kèm TTL) → trả về.

Luồng **ghi**: ghi DB, rồi **invalidate** (xoá) key trong cache — *không* ghi giá trị mới vào cache. Lần đọc sau sẽ miss và tự nạp lại từ DB.

<svg viewBox="0 0 640 250" role="img" aria-labelledby="ca-t ca-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="ca-t">Luồng cache-aside khi đọc</title>
<desc id="ca-d">Ứng dụng đọc cache trước; nếu miss thì đọc database rồi ghi ngược vào cache</desc>
<rect x="20" y="100" width="100" height="44" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="70" y="126" text-anchor="middle" font-size="12" fill="currentColor">App</text>
<rect x="270" y="30" width="110" height="44" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="325" y="56" text-anchor="middle" font-size="12" fill="currentColor">Cache</text>
<rect x="270" y="170" width="110" height="44" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="325" y="196" text-anchor="middle" font-size="12" fill="currentColor">Database</text>
<line x1="120" y1="110" x2="270" y2="60" stroke="currentColor" stroke-width="1.5" marker-end="url(#ca-a)"/>
<text x="180" y="78" text-anchor="middle" font-size="10" fill="currentColor">1. GET key</text>
<line x1="270" y1="70" x2="120" y2="120" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3" marker-end="url(#ca-a)"/>
<text x="180" y="112" text-anchor="middle" font-size="10" fill="currentColor">2. miss</text>
<line x1="120" y1="130" x2="270" y2="185" stroke="currentColor" stroke-width="1.5" marker-end="url(#ca-a)"/>
<text x="185" y="165" text-anchor="middle" font-size="10" fill="currentColor">3. SELECT</text>
<line x1="325" y1="170" x2="325" y2="74" stroke="currentColor" stroke-width="1.5" marker-end="url(#ca-a)"/>
<text x="405" y="125" text-anchor="middle" font-size="10" fill="currentColor">4. SET key + TTL</text>
<text x="325" y="240" text-anchor="middle" font-size="11" fill="currentColor">Lần sau: bước 1 hit ngay, không chạm DB</text>
<defs><marker id="ca-a" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Vì sao phổ biến nhất?** Vì nó **đơn giản, resilient, và chỉ nạp dữ liệu thực sự được dùng** (lazy — key nào chưa ai hỏi thì không tốn RAM). Nếu cache chết, ứng dụng vẫn chạy được (chỉ chậm hơn vì đọc thẳng DB). Đây là lý do Redis + cache-aside là combo mặc định của hầu hết backend.

**Ba cạm bẫy phải nhớ:**
- **Cache miss penalty**: lần đọc đầu (cold) luôn chậm — miss → DB → set. Với dữ liệu quan trọng có thể **warm cache** trước (pre-load).
- **Stale data**: nếu ai đó update thẳng DB mà quên invalidate cache, cache trả giá trị cũ đến khi TTL hết. Vì vậy quy tắc: **mọi đường ghi phải invalidate**.
- **Thundering herd / cache stampede**: một key hot hết hạn đúng lúc nghìn request cùng miss → tất cả đồng loạt đập vào DB. Chống bằng lock/single-flight (chỉ 1 request đi nạp, số còn lại chờ) hoặc TTL jitter.

### 2.4 Read-through — cache tự đi lấy

Giống cache-aside về *hành vi đọc*, nhưng **dời trách nhiệm nạp từ app vào lớp cache**. Ứng dụng chỉ gọi `cache.get(key)`; nếu miss, **chính cache** (qua một provider/loader được cấu hình) gọi xuống DB, tự lưu, rồi trả. App **không bao giờ nói chuyện trực tiếp với DB cho đường đọc**.

| | Cache-aside | Read-through |
|---|---|---|
| Ai xử lý miss | **Ứng dụng** | **Lớp cache** (loader) |
| App biết về DB? | Có | Không (đường đọc) |
| Code phía app | Nhiều (get/miss/load/set thủ công) | Ít (`get` là xong) |
| Model dữ liệu cache | Tự do, khác DB tuỳ ý | Thường khớp model DB |
| Hay gặp ở | Redis + code tay | Thư viện/lib có loader (Caffeine, Guava, DAX, Ehcache) |

Read-through **gọn code** và tập trung logic nạp một chỗ, nhưng đòi hỏi lớp cache hỗ trợ loader và thường trói bạn vào một cách map dữ liệu cố định.

### 2.5 Write-through — ghi cache + DB đồng bộ

Mọi lệnh **ghi đi qua cache**: app ghi vào cache, cache **ghi tiếp xuống DB ngay trong cùng thao tác**, và chỉ báo "thành công" khi **cả hai đã ghi xong**.

<svg viewBox="0 0 640 210" role="img" aria-labelledby="wt-t wt-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="wt-t">Write-through so với write-behind</title>
<desc id="wt-d">Write-through ghi cache rồi ghi DB đồng bộ trước khi trả về; write-behind trả về ngay sau khi ghi cache và flush DB sau theo lô</desc>
<text x="160" y="24" text-anchor="middle" font-size="12" fill="currentColor">Write-through (đồng bộ)</text>
<rect x="30" y="45" width="80" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="70" y="69" text-anchor="middle" font-size="11" fill="currentColor">App</text>
<rect x="150" y="45" width="80" height="40" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="190" y="69" text-anchor="middle" font-size="11" fill="currentColor">Cache</text>
<rect x="270" y="45" width="80" height="40" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="310" y="69" text-anchor="middle" font-size="11" fill="currentColor">DB</text>
<line x1="110" y1="65" x2="150" y2="65" stroke="currentColor" stroke-width="1.5" marker-end="url(#wt-a)"/>
<line x1="230" y1="65" x2="270" y2="65" stroke="currentColor" stroke-width="1.5" marker-end="url(#wt-a)"/>
<text x="70" y="110" text-anchor="middle" font-size="9" fill="currentColor">ghi</text>
<text x="310" y="110" text-anchor="middle" font-size="9" fill="currentColor">chờ DB xong</text>
<text x="190" y="130" text-anchor="middle" font-size="9" fill="currentColor">→ trả OK sau cùng: bền, nhưng chậm hơn</text>
<text x="490" y="24" text-anchor="middle" font-size="12" fill="currentColor">Write-behind (bất đồng bộ)</text>
<rect x="360" y="45" width="80" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="400" y="69" text-anchor="middle" font-size="11" fill="currentColor">App</text>
<rect x="480" y="45" width="80" height="40" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="520" y="69" text-anchor="middle" font-size="11" fill="currentColor">Cache</text>
<rect x="600" y="45" width="30" height="40" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="615" y="69" text-anchor="middle" font-size="10" fill="currentColor">DB</text>
<line x1="440" y1="65" x2="480" y2="65" stroke="currentColor" stroke-width="1.5" marker-end="url(#wt-a)"/>
<line x1="480" y1="60" x2="440" y2="60" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2" marker-end="url(#wt-a)"/>
<text x="460" y="42" text-anchor="middle" font-size="8" fill="currentColor">OK ngay</text>
<line x1="560" y1="80" x2="600" y2="80" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3" marker-end="url(#wt-a)"/>
<text x="520" y="130" text-anchor="middle" font-size="9" fill="currentColor">flush theo lô sau → nhanh, rủi ro mất data</text>
<defs><marker id="wt-a" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Ưu**: cache **luôn khớp DB** (write-through cache không bao giờ stale so với dữ liệu vừa ghi), và dữ liệu **bền ngay** vì đã nằm ở DB. Thường ghép với read-through để cache luôn "nóng và đúng".

**Nhược**: mỗi ghi phải chờ **cả hai** → **write latency cao hơn**. Và nó ghi *mọi* thứ vào cache kể cả dữ liệu hiếm khi đọc → **phí RAM** (giảm bằng TTL).

### 2.6 Write-behind (write-back) — ghi cache trước, flush DB sau

App ghi vào cache và cache **trả về ngay lập tức**, chưa chạm DB. Cache **gom (buffer/coalesce)** các thay đổi rồi **flush xuống DB bất đồng bộ** — sau một khoảng thời gian, đủ số lượng, hoặc theo batch.

**Ưu**: **write latency cực thấp** (chỉ ghi RAM), **hấp thụ được burst ghi** khổng lồ, và **gộp nhiều update cùng key thành một** (write coalescing) → giảm mạnh tải ghi lên DB. Rất hợp counter, metrics, view-count, IoT ingest — nơi ghi dày đặc và mất vài bản ghi cuối là chấp nhận được.

**Nhược — rủi ro cốt lõi**: dữ liệu "đã xác nhận" với client nhưng **chỉ nằm trong cache**; nếu node cache **crash trước khi flush**, **mất dữ liệu**. Ngoài ra DB **tạm thời lệch** với cache (eventual consistency), và **khó xử lý lỗi ghi DB** (client đã đi rồi, lấy gì báo lỗi). Muốn giảm rủi ro: dùng cache có **persistence/replication** cho buffer, hoặc ghi buffer vào một log bền (Kafka/WAL) trước khi ack.

### 2.7 Bảng tổng hợp 4 chiến lược

| Chiến lược | Ai nạp khi miss | Đường ghi | Consistency cache↔DB | Write latency | Rủi ro mất data | Hợp cho |
|---|---|---|---|---|---|---|
| **Cache-aside** | App | Ghi DB + invalidate cache | Có thể stale tới khi TTL/invalidate | — (ghi thẳng DB) | Không (DB là nguồn) | Đọc nhiều, mặc định phổ biến |
| **Read-through** | Cache (loader) | (thường ghép write-through) | Như cache-aside nhưng gọn code | — | Không | Khi có lib loader sẵn |
| **Write-through** | (ghép read-through) | Ghi cache→DB đồng bộ | Luôn khớp | **Cao** | Không | Cần cache luôn đúng |
| **Write-behind** | (ghép read-through) | Ghi cache, flush DB sau | Lệch tạm thời | **Rất thấp** | **Có** | Ghi dày đặc, chịu được mất ít |

Lưu ý: read và write là **hai trục độc lập** — thực tế thường **kết hợp**: ví dụ *cache-aside cho đọc + invalidate cho ghi* (combo phổ biến nhất), hay *read-through + write-through* (cache library "toàn quyền"), hay *read-through + write-behind* (throughput ghi cao).

### 2.8 TTL & staleness — cache luôn có thể "sai một chút"

**TTL (time-to-live)** là hạn dùng của một entry: hết hạn thì cache tự xoá, lần đọc sau miss và nạp lại tươi. TTL là **cơ chế an toàn cuối cùng** chống stale: kể cả khi bạn *quên* invalidate ở đâu đó, dữ liệu sai cũng chỉ tồn tại **tối đa bằng TTL**.

Chọn TTL là bài toán đánh đổi:
- **TTL ngắn** → tươi hơn, ít stale, nhưng **hit rate thấp** và đập DB nhiều hơn.
- **TTL dài** → hit rate cao, nhẹ DB, nhưng **stale lâu** khi có thay đổi.

Ba kỹ thuật kiểm soát staleness cần biết:
- **Invalidate-on-write**: chủ động xoá/ghi lại cache ngay khi DB đổi → giảm cửa sổ stale xuống gần 0 (không phụ thuộc TTL).
- **TTL jitter**: đặt TTL = base ± ngẫu nhiên (vd 300s ± 60s) để **tránh nhiều key hết hạn cùng lúc** → chống stampede.
- **Stale-while-revalidate**: trả bản cũ ngay cho nhanh, **đồng thời** nạp bản mới ở nền cho lần sau — mượt cho UX, phổ biến ở CDN/HTTP cache.

> **Nhớ**: cache mặc định là **eventual consistency**. Đừng cache thứ **tuyệt đối không được sai một giây nào** (số dư ví lúc chuyển tiền, tồn kho lúc checkout) trừ khi bạn dùng write-through + invalidate chặt và chấp nhận độ phức tạp.

### 2.9 Nơi đặt cache — nhiều tầng, càng gần user càng rẻ

Cache không chỉ là Redis. Request đi qua **nhiều tầng cache xếp chồng**, mỗi tầng chặn bớt tải cho tầng sau:

<svg viewBox="0 0 640 250" role="img" aria-labelledby="lc-t lc-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="lc-t">Các tầng đặt cache từ user tới database</title>
<desc id="lc-d">Từ trên xuống: browser cache, CDN edge, app-local in-process cache, distributed cache Redis, cuối cùng là database nguồn sự thật</desc>
<rect x="120" y="20" width="400" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="42" text-anchor="middle" font-size="12" fill="currentColor">Browser cache — gần user nhất, 0 request mạng</text>
<rect x="120" y="66" width="400" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="88" text-anchor="middle" font-size="12" fill="currentColor">CDN / edge — asset tĩnh, gần vùng địa lý</text>
<rect x="120" y="112" width="400" height="34" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="134" text-anchor="middle" font-size="12" fill="currentColor">App-local (in-process) — nhanh nhất trong server, nhỏ</text>
<rect x="120" y="158" width="400" height="34" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="180" text-anchor="middle" font-size="12" fill="currentColor">Distributed (Redis) — dùng chung mọi instance</text>
<rect x="120" y="204" width="400" height="34" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="226" text-anchor="middle" font-size="12" fill="currentColor">Database — nguồn sự thật, chậm nhất, chỉ chạm khi miss hết</text>
<line x1="60" y1="30" x2="60" y2="230" stroke="currentColor" stroke-width="1.5" marker-end="url(#lc-a)"/>
<text x="44" y="130" text-anchor="middle" font-size="10" fill="currentColor" transform="rotate(-90 44 130)">càng xuống càng chậm và đắt</text>
<defs><marker id="lc-a" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

| Tầng | Ví dụ | Sống ở đâu | Điểm mạnh | Cảnh giác |
|---|---|---|---|---|
| **Browser** | `Cache-Control`, ETag | Máy user | 0 round-trip, rẻ nhất | Khó invalidate — user giữ bản cũ |
| **CDN / edge** | CloudFront, Cloudflare | POP gần user | Chặn tải toàn cầu, tốt cho tĩnh | Cần purge khi đổi nội dung |
| **App-local** | Caffeine, `lru-cache`, map | Trong process | Nhanh nhất (không qua mạng) | **Không nhất quán giữa các instance**; tốn heap |
| **Distributed** | Redis, Memcached | Server riêng | Dùng chung, dung lượng lớn | Thêm 1 network hop; là 1 điểm phụ thuộc |

**Lưu ý app-local**: mỗi pod/instance có bản riêng → dễ **lệch giữa các pod** (pod A đã invalidate, pod B chưa). Vì thế app-local hợp cho dữ liệu **ít đổi** hoặc **chịu được lệch ngắn**; dữ liệu cần nhất quán giữa các instance thì dùng distributed cache.

---

## 3. Thực hành: code cache-aside

Ví dụ đọc user profile với Redis + Postgres (Python, pseudo gần thực tế):

```python
import json
import time
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)
TTL = 300  # 5 phút — hạn an toàn chống stale

def get_user(user_id: int) -> dict:
    key = f"user:{user_id}"

    # 1) Thử cache trước
    cached = r.get(key)
    if cached is not None:
        return json.loads(cached)          # HIT → trả ngay, không chạm DB

    # 2) MISS → đọc nguồn sự thật
    row = db.query_one("SELECT * FROM users WHERE id = %s", user_id)
    if row is None:
        # cache cả "không tồn tại" với TTL ngắn để chống cache penetration
        r.set(key, json.dumps(None), ex=30)
        return None

    # 3) Ghi ngược vào cache kèm TTL, rồi trả về
    r.set(key, json.dumps(row), ex=TTL)
    return row

def update_user(user_id: int, changes: dict) -> None:
    # Ghi DB TRƯỚC (nguồn sự thật), rồi INVALIDATE cache.
    db.execute("UPDATE users SET ... WHERE id = %s", user_id)
    r.delete(f"user:{user_id}")            # KHÔNG ghi giá trị mới — để lần đọc sau tự nạp
```

Vài điểm cốt lõi trong đoạn trên:
- **Ghi DB trước, xoá cache sau.** Nếu làm ngược (xoá cache trước rồi mới ghi DB), một request đọc chen vào giữa sẽ **nạp lại giá trị CŨ** từ DB vào cache → stale kéo dài. Thứ tự quan trọng.
- **`delete` chứ không `set` giá trị mới**: tránh ghi đè bằng dữ liệu có thể đã lỗi thời do race với request khác; để cache lazy nạp lại là an toàn hơn.
- **Cache cả kết quả rỗng** (negative caching) với TTL ngắn: chống **cache penetration** — kẻ tấn công spam id không tồn tại để mọi request đều miss và đập DB.

Chống **cache stampede** khi một key hot hết hạn (single-flight bằng Redis lock):

```python
def get_hot(key: str):
    val = r.get(key)
    if val is not None:
        return json.loads(val)

    lock_key = f"lock:{key}"
    # Chỉ 1 request giành được lock đi nạp DB; số còn lại chờ rồi đọc lại cache
    if r.set(lock_key, "1", nx=True, ex=5):          # NX = chỉ set nếu chưa có
        try:
            data = db.load(key)
            r.set(key, json.dumps(data), ex=300)
            return data
        finally:
            r.delete(lock_key)
    else:
        time.sleep(0.05)                             # backoff ngắn
        return get_hot(key)                          # thử lại — lúc này thường đã hit
```

---

## 4. Chọn chiến lược nào? — trade-off consistency vs performance

- **Đọc nhiều, ghi vừa, chịu được stale ngắn** → **cache-aside + invalidate + TTL**. Mặc định 90% trường hợp. Đơn giản, resilient.
- **Muốn code gọn, có sẵn cache library với loader** → **read-through** (đường đọc) ghép **write-through** (đường ghi) để cache luôn đúng.
- **Cache bắt buộc luôn khớp DB, ghi không quá nóng** → **write-through**. Trả giá bằng write latency.
- **Ghi cực dày (counter, metrics, telemetry), chịu được mất vài bản ghi cuối** → **write-behind**, kèm buffer bền (Kafka/WAL/replica) để giảm rủi ro.
- **Tuyệt đối không được sai** (tiền, tồn kho lúc checkout) → cân nhắc **không cache**, hoặc write-through + invalidate chặt, hoặc đọc thẳng nguồn cho đường quan trọng.

Nguyên tắc xuyên suốt: **cache là tối ưu hiệu năng, DB là nguồn sự thật.** Mỗi chiến lược chỉ đang chọn *chấp nhận lệch bao lâu* để đổi lấy *nhanh và nhẹ tải bao nhiêu*.

---

## 5. Tóm tắt
- **Cache-aside (lazy)**: app tự đọc cache → miss thì đọc DB → set lại; ghi thì **ghi DB rồi invalidate**. Phổ biến nhất, đơn giản, resilient.
- **Read-through**: dời việc nạp-khi-miss từ app vào **lớp cache** (loader) → code gọn.
- **Write-through**: ghi cache **và** DB **đồng bộ** → cache luôn đúng, bền ngay, nhưng **write latency cao**.
- **Write-behind (write-back)**: ghi cache, trả về ngay, **flush DB sau theo lô** → ghi cực nhanh và gộp được tải, nhưng **rủi ro mất dữ liệu** nếu cache crash trước khi flush.
- **TTL** là lưới an toàn chống stale; kết hợp **invalidate-on-write**, **TTL jitter**, **stale-while-revalidate** để cân tươi vs hit rate.
- Cache có nhiều tầng: **browser → CDN → app-local → distributed**; càng gần user càng rẻ, càng xa càng chậm và là nguồn sự thật.
- Read và write là **hai trục độc lập**, thực tế thường **kết hợp**; luôn nhớ: cache = hiệu năng, DB = sự thật.

> **Bài tiếp theo (Bài 8):** khi cache và DB *phải* đồng bộ chặt hơn — các mẫu **cache invalidation** nâng cao, versioning key, và eviction policy (LRU/LFU/TTL) khi RAM đầy.
