# Bài 25 — Hot key, hot partition & noisy neighbor ở scale

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân biệt **hot partition** (một shard nhận phần lớn tải vì partition key kém) với **hot key** (một key đơn bị đọc/ghi dồn — celebrity problem).
- Giải thích **sequential key hotspot**: vì sao auto-increment/timestamp làm ghi dồn hết vào một shard cuối.
- Chọn lại **partition key** đúng (high cardinality, tránh time-based cho write) và biết khi nào cần **composite key**.
- Cài **key salting/sharding** một hot key thành N: write split + read scatter-gather — có code chạy được.
- Chống hot read bằng **cache + request coalescing** (single-flight); chống hot write bằng **write-back/buffering**.
- Cô lập **noisy neighbor** trong multi-tenant: rate limit per-tenant, resource quota, tách shard riêng cho tenant lớn.

---

## 2. Bản chất: data skew là gì và vì sao nó chết người

Một hệ phân tán chia tải bằng cách **băm/chia key vào N partition** rồi rải partition lên nhiều node. Giả định ngầm: tải **đều** trên các key. Khi giả định đó vỡ — vài key hoặc vài partition nóng bất thường — ta gọi là **data skew** (lệch tải).

Analogy: một siêu thị có 10 quầy thu ngân (partition). Nếu khách xếp hàng ngẫu nhiên, mỗi quầy ~10% tải. Nhưng nếu bạn "chia quầy theo chữ cái đầu của họ tên" thì quầy chữ "N" (Nguyễn) ở Việt Nam sẽ đông nghẹt còn quầy chữ "Q, X" ngồi chơi. Quầy không nghỉ được — nó **nghẽn**, và **tổng throughput của cả siêu thị bị chặn bởi cái quầy đông nhất**, không phải bởi trung bình.

Đây là điểm mấu chốt của scale: hệ phân tán **không nhanh bằng trung bình các node, nó chậm bằng node nóng nhất**. Bạn có thể có cluster 20 node công suất 200k ops/s, nhưng nếu 90% traffic dồn vào 1 partition trên 1 node, trần thực tế là ~10k ops/s của node đó — 19 node kia rảnh rỗi trong khi hệ báo quá tải.

<svg viewBox="0 0 660 250" role="img" aria-labelledby="sk-t sk-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="sk-t">So sánh tải đều và tải lệch (skew) trên 6 partition</title>
<desc id="sk-d">Bên trái các partition cao bằng nhau, bên phải một partition cao vọt còn lại thấp, minh hoạ throughput bị chặn bởi partition nóng nhất</desc>
<text x="150" y="24" text-anchor="middle" font-size="13" fill="currentColor">Tải ĐỀU (lý tưởng)</text>
<rect x="40" y="120" width="28" height="70" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="80" y="118" width="28" height="72" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="120" y="122" width="28" height="68" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="160" y="119" width="28" height="71" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="200" y="121" width="28" height="69" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="240" y="120" width="28" height="70" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<line x1="34" y1="190" x2="274" y2="190" stroke="currentColor" stroke-width="1.5"/>
<text x="150" y="212" text-anchor="middle" font-size="10" fill="currentColor">mọi node ~17% tải</text>
<text x="500" y="24" text-anchor="middle" font-size="13" fill="currentColor">Tải LỆCH (hot partition)</text>
<rect x="390" y="55" width="28" height="135" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<rect x="430" y="172" width="28" height="18" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="470" y="176" width="28" height="14" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="510" y="170" width="28" height="20" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="550" y="178" width="28" height="12" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="590" y="174" width="28" height="16" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<line x1="384" y1="190" x2="624" y2="190" stroke="currentColor" stroke-width="1.5"/>
<text x="404" y="48" text-anchor="middle" font-size="10" fill="#f43f5e">HOT</text>
<text x="500" y="212" text-anchor="middle" font-size="10" fill="currentColor">1 node nghẽn, 5 node rảnh</text>
<text x="500" y="230" text-anchor="middle" font-size="10" fill="currentColor">trần = công suất 1 node</text>
</svg>

---

## 3. Ba loại hotspot — phân biệt cho đúng

### 3.1 Hot partition — partition key kém chọn
Một **partition/shard** nhận phần lớn tải vì key phân bố lệch. Ví dụ điển hình:
- **Partition theo ngày** (`partition_key = date`): mọi write hôm nay đổ vào đúng partition `2026-07-28`. Partition hôm qua nguội ngắt, hôm nay cháy.
- **Partition theo tenant**: SaaS có 1 khách hàng lớn chiếm 60% traffic → shard chứa tenant đó nóng, các shard tenant nhỏ rảnh.
- **Partition theo country/status/category** (low cardinality): `status='pending'` chứa 80% dòng nóng.

### 3.2 Hot key — celebrity problem
Không phải cả partition nóng, mà **một key đơn** bị dồn. Salting lại partition **không cứu được** vì bản thân giá trị key đó bị truy cập điên cuồng:
- 1 influencer 50M follower — mọi lần họ post, hàng triệu client đọc `user:influencer_id` cùng lúc.
- 1 sản phẩm flash sale — hàng trăm nghìn `DECR stock:sku_123` dồn vào đúng một key trong vài giây.
- 1 config/feature-flag toàn cục mọi request đều đọc.

Hot key khác hot partition ở chỗ: hot key **không thể chia nhỏ bằng cách đổi partition scheme** — vì logic nghiệp vụ *chính là* dồn về một thực thể. Phải xử lý bằng **replicate/cache/coalesce** (đọc) hoặc **split value + aggregate** (ghi).

### 3.3 Sequential key hotspot — monotonic write
Key tăng đơn điệu (auto-increment ID, timestamp, ULID theo thời gian) làm **mọi write mới luôn rơi vào cùng một range**. Với hệ range-partitioned (HBase, Bigtable, Cassandra với `ByteOrderedPartitioner`), range cuối = **hot shard**:

```
id=1000001 → shard z   ┐
id=1000002 → shard z   │  mọi INSERT mới đều rơi vào shard cuối
id=1000003 → shard z   │  → 1 node nhận 100% write, N-1 node rảnh
id=1000004 → shard z   ┘  (append hotspot)
```

Với hash-partitioned engine (Cassandra `Murmur3Partitioner`, DynamoDB — partition key luôn được băm), sequential key **ít đau hơn** vì hash làm phân tán, nhưng bạn mất khả năng **range scan hiệu quả**. Đây là trade-off cốt lõi: range-partition tốt cho scan nhưng dễ append-hotspot; hash-partition rải đều nhưng scan phải scatter-gather.

---

## 4. Gỡ hot partition & sequential: chọn lại partition key

Nguyên tắc chọn partition key tốt: **high cardinality + phân bố đều + khớp query pattern**.

| Partition key | Vấn đề | Sửa thành |
|---------------|--------|-----------|
| `date` (ghi theo ngày) | mọi write dồn hôm nay | `hash(user_id)` hoặc composite `(user_id, date)` |
| `tenant_id` (có tenant khổng lồ) | 1 shard cháy | composite `(tenant_id, bucket)` — chia tenant lớn thành nhiều bucket |
| `status`, `country` (ít giá trị) | vài giá trị chiếm hết | thêm thành phần cardinality cao: `(status, hash(id))` |
| auto-increment `id` | append vào shard cuối | UUID/hash prefix, hoặc **salt** `(id % N)` làm prefix |

Với **DynamoDB**, partition key phải cardinality cao và phân bố đều. Một pattern chuẩn để bẻ sequential/time hotspot là **write sharding** — thêm suffix ngẫu nhiên vào partition key:

```
# XẤU: mọi event của ngày rơi vào 1 partition
PK = "2026-07-28"

# TỐT: rải event ra 10 partition con bằng shard suffix
PK = "2026-07-28#" + str(random.randint(0, 9))   # ghi
# đọc: query song song cả 10 partition rồi merge (scatter-gather)
```

Composite key khớp query pattern cũng quan trọng: nếu query luôn là "lấy đơn của user X trong tháng", đặt `PK=user_id, SK=yyyymm#order_id` vừa rải đều theo user (cardinality cao) vừa cho phép range scan theo tháng — không phải scatter-gather.

---

## 5. Gỡ hot key WRITE bằng key salting (split-N)

Khi **một key bị ghi dồn** (đếm view, trừ tồn kho, tăng counter), ta **tách một key logic thành N key vật lý** (salt/shard), phân tán ghi ra N slot, rồi **cộng gộp khi đọc**. Đây là kỹ thuật trung tâm của bài.

<svg viewBox="0 0 660 260" role="img" aria-labelledby="salt-t salt-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="salt-t">Salting một hot counter thành N shard rồi scatter-gather khi đọc</title>
<desc id="salt-d">Ghi được rải ngẫu nhiên vào N counter con nằm trên nhiều node, đọc thì cộng gộp tất cả các shard lại</desc>
<rect x="30" y="30" width="120" height="50" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="52" text-anchor="middle" font-size="12" fill="currentColor">INCR views</text>
<text x="90" y="69" text-anchor="middle" font-size="10" fill="currentColor">(ghi ồ ạt)</text>
<text x="200" y="45" text-anchor="middle" font-size="10" fill="#f43f5e">chọn shard ngẫu nhiên</text>
<line x1="150" y1="55" x2="255" y2="55" stroke="currentColor" stroke-width="1.5" marker-end="url(#sa)"/>
<rect x="260" y="20" width="150" height="30" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="335" y="40" text-anchor="middle" font-size="11" fill="currentColor">views:{id}:0 → node A</text>
<rect x="260" y="58" width="150" height="30" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="335" y="78" text-anchor="middle" font-size="11" fill="currentColor">views:{id}:1 → node B</text>
<rect x="260" y="96" width="150" height="30" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="335" y="116" text-anchor="middle" font-size="11" fill="currentColor">views:{id}:2 → node C</text>
<rect x="260" y="134" width="150" height="30" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="335" y="154" text-anchor="middle" font-size="11" fill="currentColor">views:{id}:N → node …</text>
<rect x="470" y="70" width="160" height="60" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="550" y="94" text-anchor="middle" font-size="12" fill="currentColor">READ = SUM tất cả</text>
<text x="550" y="112" text-anchor="middle" font-size="10" fill="currentColor">scatter-gather N shard</text>
<line x1="410" y1="35" x2="468" y2="90" stroke="currentColor" stroke-width="1" marker-end="url(#sa)"/>
<line x1="410" y1="73" x2="468" y2="95" stroke="currentColor" stroke-width="1" marker-end="url(#sa)"/>
<line x1="410" y1="111" x2="468" y2="105" stroke="currentColor" stroke-width="1" marker-end="url(#sa)"/>
<line x1="410" y1="149" x2="468" y2="115" stroke="currentColor" stroke-width="1" marker-end="url(#sa)"/>
<text x="330" y="200" text-anchor="middle" font-size="11" fill="currentColor">Ghi phân tán trên N node → không còn 1 key nghẽn.</text>
<text x="330" y="220" text-anchor="middle" font-size="11" fill="currentColor">Đổi lại: đọc đắt hơn (phải gộp N), giá trị chỉ eventually-consistent.</text>
<defs><marker id="sa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 5.1 Sharded counter trên Redis

```python
import redis, random

r = redis.Redis()
N_SHARDS = 16   # số shard cho MỖI hot key

def incr_views(post_id: str, by: int = 1) -> None:
    # Ghi: chọn ngẫu nhiên 1 shard → tải ghi rải đều trên N key,
    # N key này hash tới N slot/node khác nhau trong cluster.
    shard = random.randrange(N_SHARDS)
    r.incrby(f"views:{post_id}:{shard}", by)
    # KHÔNG dùng hash-tag {...}: để CẢ key (gồm shard suffix) được băm →
    # N shard rơi vào N slot khác nhau → phân tán ghi trên nhiều node.

def get_views(post_id: str) -> int:
    # Đọc: scatter-gather — lấy hết N shard rồi cộng.
    # (RedisCluster tự tách pipeline theo slot; transaction=False vì key khác slot.)
    pipe = r.pipeline(transaction=False)
    for s in range(N_SHARDS):
        pipe.get(f"views:{post_id}:{s}")
    vals = pipe.execute()
    return sum(int(v) for v in vals if v is not None)
```

> ⚠️ **Cạm bẫy hash-tag:** trong Redis Cluster, chỉ **phần nằm trong `{...}`** quyết định slot. Nếu bạn bọc **riêng phần dùng chung** (`{post_id}`) vào hash-tag — như `views:{post_id}:0`, `views:{post_id}:1`… — thì mọi shard có **cùng nội dung tag** → **cùng một slot → cùng một node → salting vô nghĩa** (chỉ đỡ tải CPU của thao tác INCR trên một key, nhưng vẫn nghẽn đúng node đó). Muốn rải qua nhiều node, các shard phải hash tới **slot khác nhau** — hoặc **không dùng hash-tag** (băm cả key gồm shard, như code trên), hoặc đưa **luôn shard-suffix vào tag** (`views:{post_id:0}`) để nội dung tag khác nhau. Đánh đổi: khi các shard nằm khác slot thì **không** gộp đọc bằng một `MGET` atomic được — phải pipeline scatter-gather. Chọn có ý thức tuỳ nhu cầu.

### 5.2 Chọn N và trade-off
- **N càng lớn** → ghi càng phân tán, nhưng **đọc càng đắt** (gộp N giá trị) và tốn N key bộ nhớ. Chọn N theo mức nóng: hot vừa N=4–8, celebrity thật sự N=16–64.
- **Chỉ salt key thật sự nóng**, không salt mọi key (phần lớn key nguội, salt chỉ làm đọc đắt vô ích). Thường phát hiện hot key qua monitoring rồi salt **động** (chỉ những key vượt ngưỡng QPS).
- Giá trị đọc ra là **eventually-consistent** khi đọc trong lúc ghi đang bay — chấp nhận được cho counter (view, like), **không** dùng cho số dư tài khoản cần chính xác tuyệt đối.

### 5.3 Hot write trên SQL: tránh single-row contention
Cùng nguyên lý cho DB quan hệ. Đừng để mọi request `UPDATE counters SET n=n+1 WHERE id=1` — dòng đó thành **lock hotspot** (row lock + contention). Tách thành N dòng rồi `SUM`:

```sql
-- Ghi: rải vào 1 trong N dòng con (shard chọn ngẫu nhiên trong app)
UPDATE counter_shards SET n = n + 1
WHERE counter_id = 42 AND shard = :random_0_to_N;

-- Đọc: gộp lại
SELECT SUM(n) FROM counter_shards WHERE counter_id = 42;
```

---

## 6. Gỡ hot key READ: cache + request coalescing

Hot key đọc (celebrity profile, config) không cần salt ghi — cần **giảm số lần chạm nguồn gốc**. Hai vũ khí:

**(a) Cache trước DB + replicate.** Đặt giá trị nóng vào cache (Redis/local LRU). Với cache cũng có thể **replicate hot key sang nhiều node** để không một node nào nghẽn.

**(b) Request coalescing (single-flight).** Khi cache miss và 10.000 request cùng hỏi một key trong cùng khoảnh khắc, nếu để cả 10.000 cùng gọi DB thì đó là **thundering herd / cache stampede** — DB gục. Coalescing: cho **duy nhất một** request đi xuống nguồn, 9.999 request còn lại **chờ chung một kết quả**.

```go
// Go: golang.org/x/sync/singleflight — gộp mọi request trùng key
var g singleflight.Group

func GetProfile(ctx context.Context, id string) (*Profile, error) {
    if p, ok := cache.Get(id); ok {
        return p.(*Profile), nil          // cache hit
    }
    // Dù 10k goroutine gọi cùng lúc với cùng id, hàm dưới chạy ĐÚNG 1 LẦN;
    // các goroutine khác block chờ và nhận CHUNG kết quả đó.
    v, err, _ := g.Do(id, func() (interface{}, error) {
        p, err := db.LoadProfile(ctx, id)  // chỉ 1 lần chạm DB
        if err == nil {
            cache.SetWithTTL(id, p, 30*time.Second)
        }
        return p, err
    })
    if err != nil {
        return nil, err
    }
    return v.(*Profile), nil
}
```

Kết hợp thêm: **TTL jitter** (mỗi entry TTL lệch nhau ±vài giây để không hết hạn đồng loạt) và **early/probabilistic refresh** (làm mới trước khi hết hạn) để tránh mọi bản sao hết hạn cùng lúc gây stampede.

---

## 7. Gỡ hot WRITE bằng write-back/buffering

Khi ghi nóng nhưng **không cần bền vững tức thì từng cái** (metric, counter, analytics event), gom trong bộ nhớ rồi **flush theo lô** — đổi độ tươi lấy throughput:

```python
# Buffer trong process, flush mỗi 1s hoặc mỗi 500 sự kiện.
# 500.000 INCR/s → gộp thành ~1000 write/s xuống DB. Đổi lại: mất tối đa 1s
# dữ liệu nếu process chết (chấp nhận được cho view count, KHÔNG cho tiền).
import collections
buf = collections.Counter()

def record_view(post_id): buf[post_id] += 1

def flush():
    if not buf: return
    snapshot = dict(buf)   # chụp nhanh rồi reset in-place (mutate chính buf global)
    buf.clear()            # đơn giản hoá: bỏ qua race hiếm giữa snapshot và clear
    pipe = r.pipeline()
    for pid, cnt in snapshot.items():
        pipe.incrby(f"views:{pid}", cnt)     # 1 write gộp cho mỗi post
    pipe.execute()
# schedule flush() mỗi 1s hoặc khi len(buf) >= 500
```

Write-back giảm áp lực ghi tận gốc: thay vì N lần chạm store, chỉ 1 lần với giá trị đã cộng dồn. Trade-off là **durability window** — mất dữ liệu trong buffer nếu crash. Chọn theo yêu cầu nghiệp vụ.

---

## 8. Noisy neighbor trong multi-tenant

Ở hệ multi-tenant dùng chung tài nguyên (cùng cluster DB, cùng node cache, cùng Kafka), một tenant "ồn ào" ngốn IO/CPU/connection làm **chậm các tenant khác** — dù họ chẳng làm gì sai. Đây là hot partition ở tầng **tài nguyên chia sẻ**, không phải tầng key.

Ví dụ số: cluster Postgres 10.000 IOPS phục vụ 500 tenant. Một tenant chạy report quét full-table ngốn 8.000 IOPS trong 30 giây. 499 tenant còn lại chia nhau 2.000 IOPS → p99 của họ nhảy từ 20ms lên 400ms. Không ai down, nhưng cả nền tảng "lag" — và support ngập ticket.

<svg viewBox="0 0 660 210" role="img" aria-labelledby="nn-t nn-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="nn-t">Noisy neighbor và các lớp isolation</title>
<desc id="nn-d">Một tenant ngốn tài nguyên chung làm chậm tenant khác, các cơ chế rate limit quota và shard riêng ngăn chặn</desc>
<rect x="30" y="30" width="150" height="60" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="54" text-anchor="middle" font-size="12" fill="currentColor">Tenant ỒN ÀO</text>
<text x="105" y="72" text-anchor="middle" font-size="10" fill="currentColor">quét full-table, ngốn IO</text>
<rect x="30" y="120" width="150" height="60" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="144" text-anchor="middle" font-size="12" fill="currentColor">Tenant thường</text>
<text x="105" y="162" text-anchor="middle" font-size="10" fill="currentColor">bị chậm lây</text>
<rect x="250" y="70" width="150" height="70" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="325" y="98" text-anchor="middle" font-size="12" fill="currentColor">Tài nguyên CHUNG</text>
<text x="325" y="116" text-anchor="middle" font-size="10" fill="currentColor">IOPS / CPU / conn pool</text>
<line x1="180" y1="60" x2="248" y2="95" stroke="currentColor" stroke-width="2" marker-end="url(#nx)"/>
<line x1="180" y1="150" x2="248" y2="118" stroke="currentColor" stroke-width="1.5" marker-end="url(#nx)"/>
<rect x="460" y="30" width="180" height="45" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="550" y="50" text-anchor="middle" font-size="11" fill="currentColor">Rate limit per-tenant</text>
<text x="550" y="66" text-anchor="middle" font-size="9" fill="currentColor">token bucket theo tenant</text>
<rect x="460" y="82" width="180" height="45" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="550" y="102" text-anchor="middle" font-size="11" fill="currentColor">Resource quota</text>
<text x="550" y="118" text-anchor="middle" font-size="9" fill="currentColor">conn/CPU/mem cap mỗi tenant</text>
<rect x="460" y="134" width="180" height="45" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="550" y="154" text-anchor="middle" font-size="11" fill="currentColor">Tách shard riêng</text>
<text x="550" y="170" text-anchor="middle" font-size="9" fill="currentColor">tenant lớn → cluster riêng</text>
<line x1="400" y1="105" x2="458" y2="55" stroke="currentColor" stroke-width="1" marker-end="url(#nx)"/>
<line x1="400" y1="105" x2="458" y2="104" stroke="currentColor" stroke-width="1" marker-end="url(#nx)"/>
<line x1="400" y1="105" x2="458" y2="155" stroke="currentColor" stroke-width="1" marker-end="url(#nx)"/>
<defs><marker id="nx" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 8.1 Ba lớp isolation

| Lớp | Cơ chế | Khi dùng |
|-----|--------|----------|
| **Rate limit per-tenant** | token bucket theo `tenant_id` ở API/proxy | chặn tenant spam request, fair share |
| **Resource quota** | giới hạn connection pool, CPU/mem, `statement_timeout` mỗi tenant | chặn query nặng ngốn tài nguyên |
| **Physical isolation** | tenant lớn → shard/cluster/namespace riêng (bin-packing) | tenant vượt ngưỡng, cần SLA cứng |

**Rate limit per-tenant** — token bucket, mỗi tenant một bucket, quá hạn thì reject/throttle:

```python
# Redis token bucket theo tenant: mỗi tenant có quota QPS riêng,
# tenant ồn ào tiêu hết token của CHÍNH NÓ, không đụng vào token tenant khác.
def allow(tenant_id: str, qps_limit: int) -> bool:
    key = f"rl:{tenant_id}"
    # INCR + EXPIRE cửa sổ 1s (đơn giản; production dùng sliding/token-bucket Lua)
    cnt = r.incr(key)
    if cnt == 1:
        r.expire(key, 1)
    return cnt <= qps_limit
```

**Resource quota ở DB** — chặn một tenant giữ hết connection và query treo:

```sql
-- Postgres: mỗi tenant login role có trần connection riêng
ALTER ROLE tenant_big CONNECTION LIMIT 20;
-- chặn query treo ngốn tài nguyên vô hạn
ALTER ROLE tenant_big SET statement_timeout = '5s';
-- (kèm pgbouncer pool riêng per-tenant để cô lập connection)
```

**Physical isolation** — pattern phổ biến: **pool nhỏ dùng chung, tenant lớn tách riêng**. Đa số tenant nhỏ ở cluster chia sẻ (rẻ, dễ vận hành); vài tenant khổng lồ được **bin-pack sang shard/cluster riêng** để noisy của họ không chạm ai. Đây cũng là lý do "cell-based architecture" ra đời: chia hệ thành nhiều cell độc lập, mỗi tenant nằm gọn trong một cell → sự cố/nóng của cell này không lan sang cell khác (blast radius nhỏ).

### 8.2 Fair scheduling
Ở tầng ứng dụng/queue, dùng **weighted fair queueing**: thay vì một hàng đợi FIFO chung (tenant ồn ào chiếm hết chỗ), cấp mỗi tenant một hàng đợi con và round-robin có trọng số — tenant nặng vẫn chạy nhưng không **bỏ đói** (starvation) tenant khác.

---

## 9. Phát hiện hotspot (không đoán mò)
- **Per-partition/per-shard metrics**: theo dõi QPS/throughput **theo từng partition**, không chỉ trung bình. Skew lộ ra khi max/avg ≫ 1.
- **DynamoDB**: `ConsumedThroughput` per-partition, `ThrottledRequests` — throttle tập trung ở vài partition = hot partition.
- **Redis**: `redis-cli --hotkeys` (cần `maxmemory-policy` LFU), `MONITOR` sampling, hoặc `OBJECT FREQ`.
- **Cassandra**: `nodetool toppartitions` cho ra hot partition realtime.
- **Multi-tenant**: gắn `tenant_id` vào mọi metric/log/trace để quy tải về đúng tenant gây nóng.

---

## 10. Tóm tắt
- **Data skew** khiến hệ chậm bằng **node nóng nhất**, không phải trung bình — vài node cháy trong khi phần còn lại rảnh.
- **Hot partition** = partition key kém (time-based, low cardinality, tenant lớn) → **chọn lại key**: high cardinality, composite, write-sharding.
- **Sequential key** dồn write vào shard cuối → thêm hash/salt prefix (hoặc chấp nhận scatter-gather để đổi lấy range scan).
- **Hot key** (celebrity) không sửa được bằng partition scheme: ghi nóng → **salting split-N + scatter-gather đọc**; đọc nóng → **cache + request coalescing (single-flight)**; ghi ồ ạt không cần bền → **write-back buffering**.
- Salting: chọn N theo độ nóng, chỉ salt key thật nóng, giá trị **eventually-consistent** (đừng dùng cho tiền); cẩn thận **hash-tag** kẻo N shard vẫn về cùng node.
- **Noisy neighbor** multi-tenant → ba lớp isolation: **rate limit per-tenant**, **resource quota** (connection/CPU/timeout), và **tách shard riêng** cho tenant lớn (cell-based, blast radius nhỏ).
- Luôn **đo per-partition/per-tenant** để phát hiện skew — đừng nhìn trung bình.

> **Bài tiếp theo (Bài 26):** backpressure & load shedding — khi hệ quá tải thì **từ chối có kiểm soát** thế nào để giữ p99 và không sụp dây chuyền.
