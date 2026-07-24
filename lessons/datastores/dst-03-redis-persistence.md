# Bài 3 — Redis persistence, eviction & memory

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **hai cơ chế bền hoá** của Redis: **RDB snapshot** (point-in-time) và **AOF** (append log) — bản chất, cách hoạt động, khác nhau ở đâu.
- Hiểu **fork + copy-on-write (COW)** khi tạo snapshot và vì sao nó có thể ngốn RAM đột biến.
- Chọn đúng **fsync policy** (`always` / `everysec` / `no`) theo yêu cầu durability vs performance, và biết vì sao **hybrid RDB+AOF** là mặc định khuyến nghị.
- Nắm cách Redis **xoá key hết hạn** (lazy + active expiration) và cấu hình **TTL**.
- Cấu hình **maxmemory** và chọn đúng **eviction policy** (`noeviction`, `allkeys-lru`, `allkeys-lfu`, `volatile-*`).
- Phát hiện & xử lý **big key** và **memory fragmentation**.

---

## 2. Lý thuyết

### 2.1 Vì sao cần persistence? Redis là RAM mà.

Redis giữ dataset trong RAM (Bài 1). RAM **bay sạch khi process chết** — restart, crash, mất điện, OOM kill. Nếu Redis chỉ làm cache thuần thì mất là chuyện nhỏ (đọc lại từ DB). Nhưng khi Redis là **session store**, **queue**, hay **database tốc độ cao**, mất dữ liệu là mất thật.

**Persistence** = ghi một bản sao dataset xuống **đĩa** để khi restart có thể **nạp lại (reload)** vào RAM. Redis có hai cách ghi, triết lý khác hẳn nhau:

> **Ẩn dụ:** RDB giống **chụp ảnh cả căn phòng** mỗi 15 phút — gọn nhẹ, nhưng mất những gì thay đổi giữa hai lần chụp. AOF giống **camera quay lại từng hành động** — dựng lại chính xác đến giây cuối, nhưng file to và tua lại lâu.

### 2.2 RDB — snapshot point-in-time

RDB (Redis Database) ghi **toàn bộ dataset tại một thời điểm** thành một file nhị phân nén (`dump.rdb`). Đây là ảnh chụp *nhất quán* — mọi key trong file thuộc về đúng một mốc thời gian.

Vấn đề: dataset có thể vài chục GB, ghi ra đĩa mất giây → nếu event loop (single-thread) tự đi ghi thì **chặn toàn bộ client**. Redis giải quyết bằng **`fork()`**:

1. Process cha gọi `fork()` tạo **child process**. Child thừa hưởng **ảnh chụp bộ nhớ** của cha tại thời điểm fork.
2. Child **ghi RDB xuống đĩa** trong khi cha **tiếp tục phục vụ client** bình thường.
3. Ghi xong, child đổi tên file tạm thành `dump.rdb` (atomic rename) rồi thoát.

Mấu chốt là **copy-on-write (COW)** của OS: sau `fork()`, cha và con **dùng chung** các memory page (không copy thật). Chỉ khi cha **ghi vào** một page (client SET/DEL...) thì OS mới **copy riêng page đó** ra cho cha, để bản child nhìn thấy vẫn là ảnh chụp cũ.

<svg viewBox="0 0 660 260" role="img" aria-labelledby="rdb-t rdb-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="rdb-t">RDB snapshot bằng fork và copy-on-write</title>
<desc id="rdb-d">Process cha fork ra child, hai bên dùng chung memory page; khi cha ghi vào một page thì OS copy riêng page đó, child vẫn giữ ảnh chụp cũ để ghi ra dump.rdb</desc>
<rect x="20" y="30" width="150" height="70" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="58" text-anchor="middle" font-size="12" fill="currentColor">Redis cha</text>
<text x="95" y="76" text-anchor="middle" font-size="11" fill="currentColor">phục vụ client</text>
<rect x="20" y="160" width="150" height="70" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="188" text-anchor="middle" font-size="12" fill="currentColor">Child (fork)</text>
<text x="95" y="206" text-anchor="middle" font-size="11" fill="currentColor">ghi snapshot</text>
<line x1="95" y1="100" x2="95" y2="160" stroke="currentColor" stroke-width="1" marker-end="url(#ar)"/>
<text x="150" y="135" font-size="10" fill="currentColor">fork()</text>
<rect x="250" y="70" width="170" height="120" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="335" y="95" text-anchor="middle" font-size="12" fill="currentColor">Memory pages</text>
<text x="335" y="118" text-anchor="middle" font-size="11" fill="currentColor">dùng chung (COW)</text>
<text x="335" y="140" text-anchor="middle" font-size="11" fill="currentColor">cha ghi → OS copy</text>
<text x="335" y="158" text-anchor="middle" font-size="11" fill="currentColor">riêng page đó</text>
<line x1="170" y1="65" x2="250" y2="100" stroke="currentColor" stroke-width="1" marker-end="url(#ar)"/>
<line x1="170" y1="195" x2="250" y2="160" stroke="currentColor" stroke-width="1" marker-end="url(#ar)"/>
<rect x="500" y="110" width="140" height="60" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="570" y="138" text-anchor="middle" font-size="12" fill="currentColor">dump.rdb</text>
<text x="570" y="156" text-anchor="middle" font-size="11" fill="currentColor">trên đĩa</text>
<line x1="170" y1="195" x2="500" y2="150" stroke="currentColor" stroke-width="1.5" marker-end="url(#ar)"/>
<defs><marker id="ar" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

> **Bẫy RAM cần nhớ:** nếu trong lúc snapshot mà **write nhiều**, số page bị copy tăng → RAM dùng thêm có thể lên tới **gần gấp đôi** dataset trong tình huống xấu nhất. Đây là lý do cần chừa RAM đầu (đừng để dataset chiếm sát 100% RAM máy). Ngoài ra `fork()` trên dataset lớn tốn thời gian và có thể gây một **latency spike** ngắn.

Cấu hình RDB trong `redis.conf`:

```conf
# Tự động snapshot: "save <giây> <số key thay đổi>"
# Ghi RDB nếu: sau 900s có >=1 thay đổi, HOẶC 300s có >=100, HOẶC 60s có >=10000
save 900 1
save 300 100
save 60 10000

dbfilename dump.rdb
dir /data                      # thư mục chứa file
rdbcompression yes             # nén LZF (nhỏ hơn, tốn ít CPU)
rdbchecksum yes                # CRC64 phát hiện file hỏng
stop-writes-on-bgsave-error yes  # nếu bgsave lỗi thì chặn write -> lộ lỗi sớm
```

```bash
# Ép snapshot thủ công (KHÔNG chặn — fork ra child ghi nền)
127.0.0.1:6379> BGSAVE
Background saving started

# SAVE (không "BG") ghi ĐỒNG BỘ trên main thread -> CHẶN mọi client. Chỉ dùng khi maintenance.
127.0.0.1:6379> LASTSAVE          # timestamp lần save thành công gần nhất
(integer) 1721800000
```

**Ưu:** file nhỏ gọn, **restart/reload cực nhanh** (nạp một file nhị phân), tốt cho backup và disaster recovery. **Nhược:** nếu crash giữa hai snapshot, **mất toàn bộ thay đổi** từ snapshot cuối (cửa sổ mất mát = khoảng cách giữa hai lần save).

### 2.3 AOF — append-only log

AOF (Append Only File) ghi **mọi lệnh làm thay đổi dữ liệu** (SET, LPUSH, DEL, EXPIRE...) vào một file log, **nối tiếp**. Khi restart, Redis **replay lại** toàn bộ log để dựng lại state — như tua lại camera.

Điểm sống còn của AOF là **fsync policy**: ghi vào file thực chất trước tiên vào **OS page cache** (buffer trong RAM của kernel), rồi kernel mới flush xuống đĩa vật lý. `fsync()` là lệnh ép flush ngay. Redis cho chọn tần suất fsync:

| `appendfsync` | Hành vi | Mất mát tối đa khi crash | Hiệu năng |
|---------------|---------|--------------------------|-----------|
| `always` | fsync **mỗi lệnh write** | ~0 (an toàn nhất) | Chậm nhất (mỗi write chờ đĩa) |
| `everysec` | fsync **mỗi 1 giây** (nền) | **~1 giây** dữ liệu | Cân bằng — **mặc định khuyến nghị** |
| `no` | để **OS tự quyết** khi nào flush | Nhiều (tuỳ OS, ~30s) | Nhanh nhất |

`everysec` là điểm ngọt: fsync chạy trên **thread nền riêng** nên không chặn event loop, và tệ nhất chỉ mất ~1 giây. `always` cho durability gần tuyệt đối nhưng mỗi write phải chờ đĩa quay về → throughput rơi mạnh.

**AOF rewrite — chống file phình vô hạn:** vì AOF nối *mọi* lệnh, log phình mãi (100 lần `INCR x` = 100 dòng, dù kết quả chỉ là một số). Redis định kỳ **rewrite**: fork child, ghi ra một AOF **mới gọn nhất** (tập lệnh tối thiểu tái tạo state hiện tại), rồi thay file cũ. Cũng dùng fork+COW như RDB.

```conf
appendonly yes
appendfsync everysec           # always | everysec | no
appendfilename "appendonly.aof"
appenddirname "appendonlydir"  # Redis 7+: AOF tách nhiều file trong thư mục này

# Tự động rewrite khi AOF lớn gấp đôi kích thước sau lần rewrite trước,
# và tối thiểu phải đạt 64mb (tránh rewrite liên tục khi còn nhỏ)
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Khi ghi file AOF mới lúc rewrite, fsync theo từng chunk (~từng vài chục MB)
# thay vì một fsync khổng lồ ở cuối -> tránh latency spike lớn. yes = khuyến nghị.
aof-rewrite-incremental-fsync yes
```

```bash
127.0.0.1:6379> BGREWRITEAOF     # ép rewrite thủ công
Background append only file rewriting started
```

**Ưu:** durability cao (tuỳ fsync), cửa sổ mất mát nhỏ. **Nhược:** file **lớn hơn RDB**, **restart chậm hơn** (phải replay log), throughput thấp hơn RDB một chút.

### 2.4 Hybrid RDB + AOF — mặc định khuyến nghị

Từ Redis 4.0 có **hybrid persistence**: khi AOF rewrite, phần **đầu file ghi ở định dạng RDB** (ảnh chụp gọn, nạp nhanh), phần **đuôi là các lệnh AOF** tích luỹ sau đó. Vậy là **kết hợp cái tốt nhất của cả hai**: restart nhanh như RDB (nạp phần snapshot) + cửa sổ mất mát nhỏ như AOF (replay phần đuôi).

```conf
appendonly yes
aof-use-rdb-preamble yes       # bật hybrid (mặc định yes ở Redis 7)
```

<svg viewBox="0 0 640 150" role="img" aria-labelledby="hy-t hy-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="hy-t">Cấu trúc file AOF hybrid</title>
<desc id="hy-d">File AOF hybrid gồm phần đầu định dạng RDB nạp nhanh và phần đuôi là các lệnh AOF tích luỹ sau lần rewrite</desc>
<rect x="30" y="45" width="260" height="60" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="160" y="70" text-anchor="middle" font-size="12" fill="currentColor">Phần đầu: RDB preamble</text>
<text x="160" y="90" text-anchor="middle" font-size="11" fill="currentColor">ảnh chụp gọn, nạp nhanh</text>
<rect x="300" y="45" width="310" height="60" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="455" y="70" text-anchor="middle" font-size="12" fill="currentColor">Phần đuôi: lệnh AOF</text>
<text x="455" y="90" text-anchor="middle" font-size="11" fill="currentColor">write sau rewrite — replay để bắt kịp</text>
<text x="320" y="130" font-size="10" fill="currentColor">restart: nạp RDB rồi replay đuôi → nhanh và ít mất mát</text>
</svg>

**Quy tắc chọn:**
- Redis làm **cache thuần** (mất được): tắt cả hai hoặc chỉ RDB thưa — ưu tiên tốc độ.
- Redis làm **nguồn dữ liệu quan trọng**: bật **AOF `everysec` + hybrid**. Cần durability tối đa: `appendfsync always` (chấp nhận chậm).
- **Backup định kỳ**: RDB vẫn vô giá vì một file gọn dễ copy/khôi phục.

---

## 3. TTL & cách Redis xoá key hết hạn

Đặt **TTL (time to live)** cho key → sau khoảng đó key tự biến mất. Đây là nền tảng của cache, session, rate limit.

```bash
127.0.0.1:6379> SET otp:0912 "483920" EX 300   # sống 300 giây
OK
127.0.0.1:6379> TTL otp:0912                    # còn bao lâu (giây)
(integer) 297
127.0.0.1:6379> PTTL otp:0912                   # còn bao lâu (mili-giây)
(integer) 296500
127.0.0.1:6379> PERSIST otp:0912                # bỏ TTL, key sống mãi
(integer) 1
127.0.0.1:6379> EXPIRE otp:0912 60              # đặt lại TTL 60s
(integer) 1
```

Câu hỏi hay: key hết hạn *chính xác vào giây đó* thì ai đi xoá? Redis **không** có timer riêng cho từng key (hàng triệu timer thì tốn). Nó dùng **hai cơ chế bổ trợ**:

**1. Lazy expiration (bị động):** khi có client **truy cập** một key, Redis kiểm tra TTL; nếu đã hết hạn thì **xoá ngay và trả về nil**, coi như không tồn tại. Rẻ, nhưng nếu key hết hạn mà **không ai đụng tới** thì nó vẫn nằm trong RAM.

**2. Active expiration (chủ động):** ~10 lần/giây, Redis chạy một vòng: **lấy mẫu ngẫu nhiên** một số key có TTL, xoá những key đã hết hạn. Nếu tỉ lệ hết hạn trong mẫu **> 25%**, lặp lại ngay vòng nữa (để dọn nhanh khi có nhiều key hết hạn). Cơ chế xác suất này giữ số key "hết hạn nhưng chưa xoá" ở mức thấp mà không quét toàn bộ keyspace.

<svg viewBox="0 0 640 210" role="img" aria-labelledby="exp-t exp-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="exp-t">Lazy và active expiration</title>
<desc id="exp-d">Lazy xoá key hết hạn khi client truy cập; active định kỳ lấy mẫu ngẫu nhiên key có TTL và xoá cái đã hết hạn, lặp lại nếu quá 25 phần trăm mẫu hết hạn</desc>
<rect x="30" y="30" width="270" height="150" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="165" y="55" text-anchor="middle" font-size="12" fill="currentColor">Lazy (bị động)</text>
<text x="165" y="85" text-anchor="middle" font-size="11" fill="currentColor">client GET key</text>
<text x="165" y="107" text-anchor="middle" font-size="11" fill="currentColor">→ TTL hết? xoá + trả nil</text>
<text x="165" y="137" text-anchor="middle" font-size="11" fill="currentColor">rẻ, nhưng key không ai đụng</text>
<text x="165" y="155" text-anchor="middle" font-size="11" fill="currentColor">thì nằm mãi trong RAM</text>
<rect x="340" y="30" width="270" height="150" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="475" y="55" text-anchor="middle" font-size="12" fill="currentColor">Active (chủ động)</text>
<text x="475" y="85" text-anchor="middle" font-size="11" fill="currentColor">~10 lần/giây</text>
<text x="475" y="107" text-anchor="middle" font-size="11" fill="currentColor">lấy mẫu ngẫu nhiên key có TTL</text>
<text x="475" y="129" text-anchor="middle" font-size="11" fill="currentColor">xoá cái đã hết hạn</text>
<text x="475" y="155" text-anchor="middle" font-size="11" fill="currentColor">nếu &gt;25% mẫu hết hạn → lặp lại</text>
</svg>

> **Lưu ý replication:** replica **không tự** xoá key hết hạn. Master gửi lệnh `DEL` xuống replica khi key hết hạn, đảm bảo thứ tự nhất quán. Do đó một key hết hạn có thể *tạm thời* còn thấy trên replica — cần biết khi thiết kế logic đọc từ replica.

---

## 4. maxmemory & eviction policy

Nếu không giới hạn, Redis sẽ ăn RAM đến khi hết → OOM killer giết process (mất sạch). Vì thế đặt **`maxmemory`**: trần RAM cho dataset. Khi chạm trần, Redis áp **eviction policy** — chọn key nào **hi sinh** để lấy chỗ.

```conf
maxmemory 4gb
maxmemory-policy allkeys-lru
maxmemory-samples 5             # mỗi lần eviction lấy mẫu 5 key để "gần đúng" LRU/LFU
```

Các policy:

| Policy | Xét key nào | Chọn hi sinh theo | Dùng khi |
|--------|-------------|-------------------|----------|
| `noeviction` | — | **Không xoá**; write mới bị **báo lỗi** | Redis là DB — thà lỗi còn hơn mất data |
| `allkeys-lru` | **Mọi** key | **Least Recently Used** — lâu chưa dùng nhất | **Cache** phổ biến nhất |
| `allkeys-lfu` | **Mọi** key | **Least Frequently Used** — ít dùng nhất | Cache có key "nóng" ổn định, chống quét 1 lần đẩy hot key ra |
| `allkeys-random` | Mọi key | Ngẫu nhiên | Hiếm — khi mọi key ngang nhau |
| `volatile-lru` | Chỉ key **có TTL** | LRU trong nhóm có TTL | Trộn data bền (không TTL) + cache (có TTL) trong cùng instance |
| `volatile-lfu` | Chỉ key có TTL | LFU trong nhóm có TTL | Như trên, ưu tiên tần suất |
| `volatile-ttl` | Chỉ key có TTL | Sắp **hết hạn sớm nhất** | Ưu tiên bỏ cái sắp chết dù sao |

**LRU vs LFU — khác biệt cốt lõi:** LRU nhìn *lần cuối truy cập*; một job **quét một lượt** toàn bộ key (scan) sẽ làm mọi key "vừa được dùng" và có thể đẩy hot key thật ra ngoài. **LFU** nhìn *tần suất* (đếm lượt, có giảm dần theo thời gian) → key dùng thường xuyên được giữ, chống được kiểu "cache pollution" đó. Redis không dùng LRU/LFU tuyệt đối (tốn bộ nhớ metadata) mà **lấy mẫu gần đúng** — `maxmemory-samples` càng cao càng sát thật nhưng tốn CPU hơn.

> **Bẫy `volatile-*`:** nếu chọn `volatile-lru` mà **không key nào có TTL**, Redis không tìm được ứng viên để evict → hành xử như `noeviction` (write mới **lỗi** dù RAM đầy). Chọn `volatile-*` chỉ khi bạn *chắc* có tập key gắn TTL để hi sinh.

---

## 5. Big key & memory fragmentation

### 5.1 Big key — quả bom hẹn giờ

**Big key** là một key có value *quá lớn*: một hash/list/set/zset chứa hàng triệu phần tử, hay một string vài chục MB. Vì Redis single-thread, các thao tác trên big key nguy hiểm:
- `DEL` một hash 10 triệu field là **O(N)** → **chặn** event loop hàng trăm ms, mọi client treo.
- Big key làm **eviction/migration (Cluster) lệch tải**, memory một node phình bất thường.

```bash
# Quét tìm big key (an toàn, không chặn — dùng SCAN + lấy mẫu)
redis-cli --bigkeys
redis-cli --memkeys              # thống kê theo memory

# Đo memory một key cụ thể
127.0.0.1:6379> MEMORY USAGE cart:42:items
(integer) 5242880

# Xoá big key KHÔNG chặn: UNLINK giải phóng ở thread nền (thay cho DEL)
127.0.0.1:6379> UNLINK cart:42:items
(integer) 1
```

```conf
lazyfree-lazy-eviction yes     # evict giải phóng bộ nhớ ở thread nền
lazyfree-lazy-expire yes       # expire cũng vậy
lazyfree-lazy-server-del yes   # DEL ngầm (vd do SET đè) giải phóng nền
```

**Cách chữa gốc:** đừng tạo big key. Chia nhỏ (shard) một hash lớn thành nhiều key theo bucket (`user:{id}:part:{n}`), hoặc dùng cấu trúc phù hợp. Với xoá lớn, luôn `UNLINK` thay `DEL`.

### 5.2 Memory fragmentation

Redis cấp phát bộ nhớ qua allocator (thường **jemalloc**). Khi key liên tục được tạo/xoá với kích thước khác nhau, RAM bị **phân mảnh**: allocator giữ nhiều "khoảng trống" không trả lại được cho OS, khiến **RSS (RAM thực tế OS thấy)** lớn hơn **dữ liệu logic** Redis đang dùng.

```bash
127.0.0.1:6379> INFO memory
used_memory:2100000000              # dữ liệu logic Redis dùng
used_memory_rss:2900000000          # RAM thật OS cấp cho process
mem_fragmentation_ratio:1.38        # rss / used_memory
mem_allocator:jemalloc-5.3.0
```

**Đọc `mem_fragmentation_ratio`:**
- **~1.0 – 1.5:** bình thường, khoẻ.
- **> 1.5:** phân mảnh cao, đang lãng phí RAM.
- **< 1.0:** nguy hiểm — Redis đang bị **swap ra đĩa** (RSS nhỏ hơn cả dữ liệu logic vì phần dữ liệu nằm ở swap). Rất chậm, cần thêm RAM hoặc tắt swap.

Khắc phục: bật **active defrag** để jemalloc dồn bộ nhớ ngay khi Redis chạy (không cần restart):

```conf
activedefrag yes
active-defrag-ignore-bytes 100mb    # bắt đầu defrag khi phân mảnh vượt ngưỡng
active-defrag-threshold-lower 10    # phân mảnh >=10% thì bắt đầu
active-defrag-threshold-upper 100
active-defrag-cycle-min 5           # % CPU tối thiểu dành cho defrag
active-defrag-cycle-max 75          # % CPU tối đa
```

---

## 6. Tóm tắt
- **RDB** = snapshot point-in-time qua **fork + COW**: file gọn, **restart nhanh**, tốt cho backup; nhưng **mất data** giữa hai snapshot. Coi chừng **RAM tăng gần gấp đôi** khi write nhiều lúc đang snapshot.
- **AOF** = append log mọi lệnh write; durability quyết bởi **fsync policy**: `always` (an toàn, chậm), `everysec` (~1s mất mát, **khuyến nghị**), `no` (nhanh, rủi ro). **Rewrite** giữ file không phình.
- **Hybrid** (`aof-use-rdb-preamble yes`) = đầu file RDB (nạp nhanh) + đuôi AOF (ít mất mát) — mặc định nên dùng cho data quan trọng.
- Key hết hạn được xoá bằng **lazy** (khi truy cập) + **active** (lấy mẫu ~10 lần/giây, lặp nếu >25% mẫu hết hạn).
- **maxmemory** + **eviction policy**: `noeviction` cho DB; `allkeys-lru`/`allkeys-lfu` cho cache; `volatile-*` khi trộn data bền và cache — nhưng cẩn thận evict lỗi nếu không key nào có TTL.
- **Big key** chặn single-thread → phát hiện `--bigkeys`, xoá bằng **UNLINK** + bật lazyfree; **fragmentation** đọc `mem_fragmentation_ratio`, chữa bằng **active defrag**.

> **Bài tiếp theo (Bài 4):** Redis làm **message broker** — Pub/Sub, List như queue, và **Streams** với consumer group cho xử lý sự kiện tin cậy.
