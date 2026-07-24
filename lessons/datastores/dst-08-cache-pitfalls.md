# Bài 8 — Cache pitfalls: stampede, penetration, avalanche, hot key

## 1. Mục tiêu
Sau bài này bạn có thể:
- Nhận diện 4 "bệnh kinh điển" của tầng cache: **stampede** (thundering herd), **penetration**, **avalanche**, và **hot key / big key**.
- Hiểu **bản chất** vì sao mỗi lỗi xảy ra — không chỉ tên gọi, mà cơ chế dòng request dội vào DB.
- Viết được code **fix** thực chiến: single-flight/mutex, early recompute, probabilistic early expiration, cache null, bloom filter, jitter TTL.
- Hiểu vấn đề **nhất quán cache ↔ DB** khi invalidate, và các pattern giảm rủi ro stale.

---

## 2. Lý thuyết

Cache thêm vào hệ thống một **lớp trạng thái thứ hai** đứng trước database. Khi mọi thứ "hit", đời rất đẹp: đọc micro giây, DB nhàn. Nhưng cache có TTL, có miss, có key nóng — và chính những khoảnh khắc **chuyển trạng thái** (một key vừa hết hạn, một key không tồn tại, nhiều key chết cùng lúc) là lúc lưu lượng dồn thẳng xuống DB. Bốn pitfall dưới đây đều là biến thể của cùng một câu hỏi: *khi cache không đỡ được request, chuyện gì xảy ra với DB phía sau?*

Nhắc lại pattern **cache-aside** (lazy loading) làm nền cho cả bài:

```python
def get_user(uid):
    key = f"user:{uid}"
    val = redis.get(key)
    if val is not None:          # cache HIT
        return deserialize(val)
    row = db.query_user(uid)     # cache MISS -> đọc DB
    redis.set(key, serialize(row), ex=3600)  # ghi lại cache, TTL 1h
    return row
```

Đoạn code "ngây thơ" này chứa mầm mống của cả 4 pitfall. Ta soi từng cái.

### 2.1 Cache stampede (thundering herd)

**Analogy:** một quán phở chỉ có tấm biển "còn hàng / hết hàng". Đúng lúc biển lật sang "hết", 500 khách đang đứng chờ **cùng lúc** ùa vào bếp hỏi "nấu nồi mới đi". Bếp (DB) chỉ cần nấu **một nồi** là đủ cho tất cả, nhưng vì ai cũng hỏi cùng lúc nên bếp nhận 500 order nấu trùng nhau.

**Bản chất:** một key **hot** (nhiều request đọc) vừa **hết hạn**. Trong cửa sổ vài mili giây giữa lúc key biến mất và lúc request đầu tiên ghi lại cache, **hàng nghìn request cùng miss**, cùng chạy `db.query_user()`. DB nhận N truy vấn giống hệt nhau thay vì 1 → CPU/connection pool DB cạn kiệt, latency tăng vọt, đôi khi sập luôn (cascading failure).

<svg viewBox="0 0 640 260" role="img" aria-labelledby="st-t st-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="st-t">Cache stampede</title>
<desc id="st-d">Một key hot hết hạn, nhiều request cùng miss và cùng dội truy vấn trùng lặp xuống database</desc>
<rect x="20" y="20" width="120" height="30" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="40" text-anchor="middle" font-size="12" fill="currentColor">key hot EXPIRE</text>
<rect x="20" y="80" width="70" height="26" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="55" y="97" text-anchor="middle" font-size="11" fill="currentColor">req 1</text>
<rect x="20" y="115" width="70" height="26" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="55" y="132" text-anchor="middle" font-size="11" fill="currentColor">req 2</text>
<rect x="20" y="150" width="70" height="26" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="55" y="167" text-anchor="middle" font-size="11" fill="currentColor">req N</text>
<rect x="255" y="95" width="120" height="60" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="315" y="120" text-anchor="middle" font-size="12" fill="currentColor">Cache (miss)</text>
<text x="315" y="140" text-anchor="middle" font-size="11" fill="currentColor">key vừa trống</text>
<line x1="90" y1="93" x2="253" y2="115" stroke="currentColor" stroke-width="1" marker-end="url(#se)"/>
<line x1="90" y1="128" x2="253" y2="125" stroke="currentColor" stroke-width="1" marker-end="url(#se)"/>
<line x1="90" y1="163" x2="253" y2="135" stroke="currentColor" stroke-width="1" marker-end="url(#se)"/>
<rect x="470" y="80" width="150" height="90" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="545" y="118" text-anchor="middle" font-size="12" fill="currentColor">Database</text>
<text x="545" y="138" text-anchor="middle" font-size="11" fill="currentColor">N query trùng</text>
<text x="545" y="156" text-anchor="middle" font-size="11" fill="currentColor">→ quá tải</text>
<line x1="375" y1="112" x2="468" y2="112" stroke="currentColor" stroke-width="1" marker-end="url(#se)"/>
<line x1="375" y1="125" x2="468" y2="123" stroke="currentColor" stroke-width="1" marker-end="url(#se)"/>
<line x1="375" y1="138" x2="468" y2="134" stroke="currentColor" stroke-width="1" marker-end="url(#se)"/>
<text x="315" y="200" text-anchor="middle" font-size="11" fill="currentColor">Cần 1 lần recompute — nhưng N request cùng làm</text>
<defs><marker id="se" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Fix 1 — Single-flight / mutex lock:** chỉ cho **một** request được phép recompute, những request khác chờ hoặc trả giá trị cũ. Dùng `SET NX` làm lock phân tán:

```python
import time

def get_with_lock(uid):
    key = f"user:{uid}"
    val = redis.get(key)
    if val is not None:
        return deserialize(val)

    lock_key = f"lock:{key}"
    # chỉ 1 request giành được lock (NX = set nếu chưa tồn tại), TTL 5s chống deadlock
    if redis.set(lock_key, "1", nx=True, ex=5):
        try:
            row = db.query_user(uid)               # duy nhất request này chạm DB
            redis.set(key, serialize(row), ex=3600)
            return row
        finally:
            redis.delete(lock_key)
    else:
        # thua lock: chờ ngắn rồi đọc lại cache (đã được request thắng ghi)
        time.sleep(0.05)
        val = redis.get(key)
        return deserialize(val) if val else db.query_user(uid)  # fallback an toàn
```

Trong Go, thư viện `golang.org/x/sync/singleflight` làm việc này ở **mức process** cực gọn — nhiều goroutine cùng gọi 1 key thì chỉ 1 lần thực thi thật, các caller khác share kết quả:

```go
var g singleflight.Group

func GetUser(uid string) (*User, error) {
    v, err, _ := g.Do("user:"+uid, func() (interface{}, error) {
        return db.QueryUser(uid) // chỉ chạy 1 lần dù 1000 goroutine cùng gọi
    })
    return v.(*User), err
}
```

> **Lưu ý:** singleflight gộp trong **một process**. Với nhiều pod/instance, cần lock phân tán (Redis `SET NX`) để gộp toàn cụm — hoặc chấp nhận "mỗi pod tối đa 1 query", vốn đã giảm tải rất nhiều so với N.

**Fix 2 — Logical (early) recompute:** thay vì để key **thật sự** hết hạn (khoảnh khắc trống nguy hiểm), lưu kèm một **timestamp hết hạn logic** *bên trong* value và đặt TTL vật lý **dài hơn**. Khi đọc thấy đã quá hạn logic, request **vẫn trả về data cũ** ngay lập tức và kích một tác vụ nền recompute. Cache không bao giờ thật sự trống → không có cửa sổ stampede:

```python
import json, threading, time

def get_early_recompute(uid):
    key = f"user:{uid}"
    raw = redis.get(key)
    if raw is None:                       # miss thật (hiếm) -> nạp đồng bộ
        return load_and_store(uid)

    obj = json.loads(raw)
    if obj["logical_exp"] > time.time():  # còn "tươi" logic -> trả ngay
        return obj["data"]

    # đã quá hạn logic: trả data CŨ ngay, refresh nền (chỉ 1 request giành lock)
    if redis.set(f"lock:{key}", "1", nx=True, ex=5):
        threading.Thread(target=load_and_store, args=(uid,)).start()
    return obj["data"]                    # các request còn lại vẫn có data, DB không bị dội

def load_and_store(uid, ttl=3600):
    key = f"user:{uid}"
    row = db.query_user(uid)
    payload = {"data": row, "logical_exp": time.time() + ttl}
    redis.set(key, json.dumps(payload), ex=ttl * 2)  # TTL vật lý gấp đôi hạn logic
    return row
```

**Fix 3 — Probabilistic early expiration (XFetch):** một kỹ thuật thanh lịch cho key hot: mỗi request **tự tính xác suất** tự nguyện recompute *sớm hơn* thời điểm hết hạn, xác suất tăng dần khi càng gần hạn. Nhờ đó chỉ **một vài** request lẻ tẻ recompute trước khi key chết, không bao giờ có cú dội đồng loạt:

```python
import random, math, time

# lưu kèm: delta = thời gian tính (recompute) lần trước, exp = mốc hết hạn tuyệt đối
def xfetch(uid, beta=1.0):
    key = f"user:{uid}"
    obj = redis.hgetall(key)              # {value, delta, exp}
    now = time.time()
    if obj:
        exp = float(obj["exp"]); delta = float(obj["delta"])
        # nếu now - delta*beta*ln(rand) >= exp  => chủ động recompute sớm
        # dùng (1 - random()) để rand nằm trong (0,1], tránh log(0) -> math domain error
        if now - delta * beta * math.log(1 - random.random()) < exp:
            return obj["value"]           # phần lớn request đi nhánh này
    # recompute và đo thời gian tính để lưu lại delta
    t0 = time.time()
    row = db.query_user(uid)
    delta = time.time() - t0
    ttl = 3600
    redis.hset(key, mapping={"value": serialize(row), "delta": delta, "exp": now + ttl})
    redis.expire(key, ttl)
    return row
```

Giá trị `beta` càng lớn thì càng "hăng" recompute sớm. Đây là cách các hệ CDN/cache lớn tránh stampede mà không cần lock.

### 2.2 Cache penetration (xuyên thủng cache)

**Analogy:** kẻ phá quấy liên tục hỏi thủ thư về những **cuốn sách không tồn tại**. Thủ thư (cache) không có sẵn câu trả lời "không có", nên mỗi lần đều phải chạy xuống kho (DB) lục tung rồi quay lên nói "không có". Cache **hoàn toàn vô dụng** vì key đúng nghĩa không bao giờ tồn tại.

**Bản chất:** request query những key **không tồn tại trong DB** (`user:-1`, id ngẫu nhiên, hoặc bị tấn công có chủ đích). Cache-aside luôn miss (vì DB trả rỗng, không ai ghi cache), nên **mọi** request loại này xuyên thẳng xuống DB. Khác stampede (key có thật, hết hạn), penetration là **key ma** — và có thể bị khai thác để DDoS tầng DB.

**Fix 1 — Cache giá trị null:** khi DB trả rỗng, vẫn ghi một **null sentinel** vào cache với TTL ngắn. Lần sau cache đỡ được:

```python
NULL_SENTINEL = "\x00NULL\x00"

def get_cache_null(uid):
    key = f"user:{uid}"
    val = redis.get(key)
    if val == NULL_SENTINEL:              # đã biết là không tồn tại
        return None
    if val is not None:
        return deserialize(val)

    row = db.query_user(uid)
    if row is None:
        redis.set(key, NULL_SENTINEL, ex=60)   # TTL NGẮN cho null (60s) tránh giữ rác lâu
        return None
    redis.set(key, serialize(row), ex=3600)
    return row
```

Lưu ý cân bằng: TTL null **quá dài** → nếu về sau id đó được tạo thật, user thấy "không tồn tại" một lúc (stale). TTL **quá ngắn** → giảm hiệu quả chống penetration. Thường 30–120s là hợp lý, và khi **ghi** bản ghi mới phải chủ động xoá null sentinel.

**Fix 2 — Bloom filter:** với tấn công id ngẫu nhiên diện rộng, cache null vẫn tốn RAM cho hàng triệu key ma. **Bloom filter** là cấu trúc xác suất trả lời "**chắc chắn KHÔNG có**" hoặc "**có thể có**" cực nhẹ RAM. Đặt bloom filter (chứa mọi id **hợp lệ**) đứng trước cache: id không nằm trong filter → chặn ngay, không chạm cache lẫn DB:

```python
# Redis Stack có module Bloom sẵn
# Nạp 1 lần: đưa toàn bộ id hợp lệ vào filter
redis.execute_command("BF.RESERVE", "users:bloom", "0.001", "10000000")  # sai số 0.1%, 10M phần tử
for uid in all_valid_user_ids():
    redis.execute_command("BF.ADD", "users:bloom", uid)

def get_with_bloom(uid):
    # BF.EXISTS = 0 -> CHẮC CHẮN không tồn tại -> chặn, khỏi chạm DB
    if redis.execute_command("BF.EXISTS", "users:bloom", uid) == 0:
        return None
    return get_cache_null(uid)   # "có thể có" -> đi tiếp đường cache bình thường
```

Đặc tính bloom filter: **không có false negative** (đã nói "không có" thì chắc chắn không có → an toàn để chặn), nhưng có **false positive** nhỏ (đôi khi "có thể có" mà thực ra không → lọt xuống cache-null đỡ tiếp). Nhược điểm: khó xoá phần tử (dùng Cuckoo filter nếu cần xoá), và phải giữ filter đồng bộ khi thêm id mới.

### 2.3 Cache avalanche (tuyết lở)

**Analogy:** cả một khu chung cư hẹn giờ hết hạn hợp đồng điện **cùng đúng 0h ngày 1** → sáng hôm đó tổng đài điện lực nhận hàng nghìn cuộc gọi gia hạn cùng lúc và nghẽn. Vấn đề không phải một key, mà là **rất nhiều key chết đồng thời**.

**Bản chất:** khác stampede (1 key hot), avalanche là **số lượng lớn key hết hạn trong cùng một khoảnh khắc**. Kịch bản điển hình: bạn warm-up cache lúc deploy bằng một vòng lặp `set(key, val, ex=3600)` → **tất cả** có TTL 3600 giống hệt, nên **1 giờ sau tất cả chết cùng giây**. Hoặc Redis restart/mất cả cụm → toàn bộ miss cùng lúc. Kết quả: DB nhận đợt sóng miss khổng lồ.

<svg viewBox="0 0 640 210" role="img" aria-labelledby="av-t av-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="av-t">Avalanche: TTL đồng loạt vs TTL có jitter</title>
<desc id="av-d">So sánh trước sau: TTL giống hệt khiến mọi key chết cùng lúc; thêm jitter làm hạn hết trải đều</desc>
<text x="160" y="20" text-anchor="middle" font-size="12" fill="currentColor">TTL cố định (xấu)</text>
<line x1="40" y1="90" x2="280" y2="90" stroke="currentColor" stroke-width="1"/>
<line x1="250" y1="35" x2="250" y2="95" stroke="#f43f5e" stroke-width="2"/>
<circle cx="250" cy="45" r="4" fill="#f43f5e" fill-opacity="0.6" stroke="currentColor"/>
<circle cx="250" cy="55" r="4" fill="#f43f5e" fill-opacity="0.6" stroke="currentColor"/>
<circle cx="250" cy="65" r="4" fill="#f43f5e" fill-opacity="0.6" stroke="currentColor"/>
<circle cx="250" cy="75" r="4" fill="#f43f5e" fill-opacity="0.6" stroke="currentColor"/>
<text x="250" y="110" text-anchor="middle" font-size="10" fill="currentColor">mọi key chết 1 điểm</text>
<text x="480" y="20" text-anchor="middle" font-size="12" fill="currentColor">TTL + jitter (tốt)</text>
<line x1="360" y1="90" x2="620" y2="90" stroke="currentColor" stroke-width="1"/>
<circle cx="440" cy="70" r="4" fill="#10b981" fill-opacity="0.6" stroke="currentColor"/>
<circle cx="475" cy="60" r="4" fill="#10b981" fill-opacity="0.6" stroke="currentColor"/>
<circle cx="510" cy="72" r="4" fill="#10b981" fill-opacity="0.6" stroke="currentColor"/>
<circle cx="545" cy="58" r="4" fill="#10b981" fill-opacity="0.6" stroke="currentColor"/>
<circle cx="580" cy="68" r="4" fill="#10b981" fill-opacity="0.6" stroke="currentColor"/>
<text x="490" y="110" text-anchor="middle" font-size="10" fill="currentColor">hạn trải đều theo thời gian</text>
<text x="320" y="150" text-anchor="middle" font-size="11" fill="currentColor">Trục ngang = thời gian; mỗi chấm = một key hết hạn</text>
</svg>

**Fix 1 — Jitter TTL:** thêm một lượng **ngẫu nhiên** vào mỗi TTL để rải điểm hết hạn:

```python
import random

def set_with_jitter(key, val, base_ttl=3600, jitter=0.10):
    # TTL = base ± 10% ngẫu nhiên -> các key lệch nhau, không chết chùm
    ttl = int(base_ttl * (1 + random.uniform(-jitter, jitter)))
    redis.set(key, serialize(val), ex=ttl)
```

Chỉ một dòng `random` này đã biến "tất cả chết lúc 3600s" thành "chết rải rác trong khoảng 3240–3960s" → tải DB phẳng ra thay vì một spike.

**Fix 2 — Chống avalanche do mất cả cụm cache:** jitter không cứu được trường hợp Redis **sập toàn bộ** (mọi miss cùng lúc). Ở đây cần các lớp bảo vệ *phía sau*:
- **Circuit breaker + rate limit** trước DB: khi miss vọt lên, giới hạn số query đồng thời xuống DB, phần dư trả degraded/data cũ thay vì giết DB.
- **Multi-level cache:** thêm local in-process cache (L1, ví dụ Caffeine/Guava) trước Redis (L2); Redis chết thì L1 vẫn đỡ được phần lớn key hot.
- **High availability cho chính Redis** (replica + Sentinel/Cluster) để "mất cả cụm" hiếm khi xảy ra.

### 2.4 Hot key & big key

Hai vấn đề về **phân bố**, không phải về hết hạn.

**Hot key** — một key bị truy cập với tần suất cực cao (ví dụ tồn kho sản phẩm flash-sale, config toàn cục). Vì Redis Cluster chia dữ liệu theo **hash slot của key**, mọi request tới hot key đều đập vào **đúng một node** → node đó nghẽn dù cả cụm còn rảnh (nghiêng tải, hot shard). Fix:
- **Local cache** ngắn hạn cho hot key ở phía app (1–5s) để phần lớn đọc không chạm Redis.
- **Nhân bản key** (`product:123#0..#9`), mỗi request đọc ngẫu nhiên một bản → tải trải ra nhiều slot/node.
- **Read replica** cho phần đọc.

```python
# nhân bản hot key ra N bản, đọc ngẫu nhiên -> chia tải nhiều slot
N = 10
def read_hot(base_key):
    replica = f"{base_key}#{random.randint(0, N-1)}"
    return redis.get(replica)

def write_hot(base_key, val, ttl=30):
    for i in range(N):
        redis.set(f"{base_key}#{i}", val, ex=ttl)   # ghi cả N bản
```

**Big key** — một key chứa value quá lớn (một hash/list/set hàng trăm nghìn phần tử, hoặc string vài MB). Nguy hiểm vì: (1) thao tác O(N) trên nó (như `HGETALL`, `SMEMBERS`, `DEL`) **chặn event loop** single-thread (Bài 1) làm nghẽn cả server; (2) tốn băng thông mạng; (3) trong Cluster, một slot phình to gây lệch bộ nhớ. Fix:
- **Chia nhỏ** big key thành nhiều key con (shard hash theo field), hoặc dùng cấu trúc phù hợp.
- Xoá bằng `UNLINK` (giải phóng nền, không block) thay vì `DEL`; duyệt bằng `HSCAN`/`SSCAN` thay vì `HGETALL`/`SMEMBERS`.
- Dùng `redis-cli --bigkeys` / `MEMORY USAGE key` để **phát hiện** big key trước khi nó gây sự cố.

```bash
redis-cli --bigkeys                 # quét, báo cáo key lớn nhất mỗi loại
redis-cli MEMORY USAGE product:123  # xem 1 key chiếm bao nhiêu byte
redis-cli UNLINK huge:set           # xoá non-blocking (giải phóng ở thread nền)
```

### 2.5 Invalidation & nhất quán cache ↔ DB

Pitfall khó nhất không phải quá tải mà là **stale data**: cache giữ giá trị cũ trong khi DB đã đổi. Có hai chiến lược ghi phổ biến; cả hai đều có cửa sổ race:

| Chiến lược | Cách làm | Rủi ro chính |
|-----------|----------|--------------|
| **Cache-aside + delete** | Ghi DB, rồi **xoá** key cache | Race: reader nạp lại cache bằng data cũ ngay giữa write/delete |
| **Cache-aside + update** | Ghi DB, rồi **ghi đè** cache bằng giá trị mới | Hai write đồng thời ghi cache lệch thứ tự → cache giữ giá trị cũ hơn |

**Quy tắc thực chiến:** ưu tiên **xoá (invalidate) thay vì cập nhật** cache khi ghi — vì xoá là idempotent và để lần đọc kế nạp lại từ nguồn sự thật, tránh ghi đè lộn thứ tự. Và nên theo thứ tự **cập nhật DB trước, xoá cache sau** (đây là nhược điểm nhẹ hơn so với xoá cache trước):

```python
def update_user(uid, data):
    db.update_user(uid, data)         # 1) nguồn sự thật trước
    redis.delete(f"user:{uid}")       # 2) xoá cache -> lần đọc sau nạp lại từ DB
```

Vẫn còn một race hiếm: reader miss ngay trước bước (1), đọc DB cũ, rồi ghi cache **sau** bước (2). **Cache-aside delete** không đóng kín 100% cửa sổ này. Các cách siết chặt thêm:

- **Delayed double delete:** xoá cache, ghi DB, chờ một khoảng ngắn (vài trăm ms — dài hơn thời gian một read), rồi **xoá cache lần nữa** để dọn giá trị cũ mà reader lỡ ghi vào.
- **TTL luôn là lưới an toàn:** dù logic invalidate có lỗi, TTL bảo đảm stale không sống mãi — mọi key cache **phải có TTL**.
- **Đọc thay đổi từ binlog (CDC):** dùng Debezium/Canal theo dõi WAL/binlog của DB và phát sự kiện xoá cache → invalidation bám đúng thứ tự commit của DB, tin cậy hơn xoá thủ công trong code.

```python
import time, threading

def update_user_double_delete(uid, data):
    redis.delete(f"user:{uid}")                 # xoá lần 1
    db.update_user(uid, data)                   # ghi nguồn sự thật
    def second_delete():
        time.sleep(0.5)                         # chờ qua cửa sổ read đang bay
        redis.delete(f"user:{uid}")             # xoá lần 2, dọn stale reader lỡ ghi
    threading.Thread(target=second_delete).start()
```

> **Chốt quan trọng:** cache-aside cho **eventual consistency**, không phải strong. Nếu nghiệp vụ *tuyệt đối* không chịu được stale (số dư ví, tồn kho lúc trừ tiền) thì đọc thẳng nguồn sự thật cho đường đó, đừng cache.

---

## 3. Bảng tổng hợp: nhận diện & fix

| Pitfall | Nguyên nhân | Triệu chứng | Fix chính |
|---------|-------------|-------------|-----------|
| **Stampede** | 1 key hot hết hạn, N request cùng miss | Spike DB nhọn đúng lúc key hết hạn | single-flight/lock, early recompute, probabilistic expiry |
| **Penetration** | Query key không tồn tại (né cache) | DB nhận query id lạ/ngẫu nhiên liên tục | cache null (TTL ngắn), bloom filter |
| **Avalanche** | Nhiều key hết hạn cùng lúc / cache sập | Sóng miss lớn theo chu kỳ hoặc sau restart | jitter TTL, circuit breaker, multi-level cache, HA |
| **Hot key** | 1 key truy cập cực nhiều → nghiêng 1 node | 1 shard nóng, cả cụm rảnh | local cache, nhân bản key, replica |
| **Big key** | 1 value quá lớn | O(N) block event loop, lệch RAM | chia nhỏ, UNLINK/SCAN, --bigkeys |
| **Stale** | Cache ↔ DB không đồng bộ khi ghi | User thấy data cũ | update DB rồi delete cache, TTL, double-delete, CDC |

---

## 4. Tóm tắt
- Bốn pitfall đều là câu chuyện **request dội xuống DB khi cache không đỡ được** — chỉ khác *vì sao* cache trượt.
- **Stampede** (1 key hot hết hạn): gộp recompute bằng **single-flight/lock**, hoặc **early recompute**/**probabilistic expiry** để cache không bao giờ trống.
- **Penetration** (key ma): **cache null** với TTL ngắn cho case thường, **bloom filter** cho tấn công diện rộng.
- **Avalanche** (nhiều key chết cùng lúc): **jitter TTL** để rải hạn; thêm circuit breaker + multi-level cache + HA cho case mất cả cụm.
- **Hot key / big key** là vấn đề **phân bố**: nhân bản/local cache cho hot; chia nhỏ + UNLINK/SCAN cho big.
- **Nhất quán**: cache-aside là **eventual** — ghi DB trước rồi **xoá** cache, luôn đặt **TTL** làm lưới an toàn; siết thêm bằng double-delete hoặc CDC; dữ liệu không chịu nổi stale thì **đừng cache**.

> **Bài tiếp theo (Bài 9):** từ một node Redis sang **replication & high availability** — replica, Sentinel, Cluster, và cách "mất cả cụm cache" (nguyên nhân avalanche tệ nhất) được ngăn ngừa.
