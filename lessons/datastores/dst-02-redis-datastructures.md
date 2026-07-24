# Bài 2 — Redis data structures: string, hash, list, set, zset...

## 1. Mục tiêu
Sau bài này bạn có thể:
- Kể đúng **các data structure** Redis: String, Hash, List, Set, Sorted Set (zset), Bitmap, HyperLogLog, Geo.
- Với mỗi cấu trúc: biết **lệnh chính**, **độ phức tạp Big-O**, và **khi nào nên dùng**.
- Chọn **đúng cấu trúc cho từng bài toán** (leaderboard, queue, đếm unique, daily active, tìm quanh vị trí...).
- Viết được các đoạn `redis-cli` thực tế cho từng cấu trúc và tránh các lệnh O(N) nguy hiểm.

---

## 2. Lý thuyết: vì sao "cấu trúc dữ liệu" mới là linh hồn của Redis

Ở Bài 1 ta nói Redis là `key → value`, nhưng value **không phải chỉ là chuỗi**. Với mỗi key, Redis chọn một **kiểu dữ liệu server-side** và cung cấp bộ lệnh chuyên biệt thao tác **ngay trong RAM, nguyên tử**. Đây là điểm khác biệt lớn nhất với một cache "chuỗi thuần" như Memcached.

**Analogy đời thường:** hãy hình dung Redis như một **hộp đồ nghề**, mỗi cấu trúc là một dụng cụ. Bạn *có thể* đóng đinh bằng cán tua-vít, nhưng dùng búa vẫn đúng hơn. Lưu leaderboard bằng String + tự sort ở client là "đóng đinh bằng tua-vít"; dùng Sorted Set là "cầm búa". Chọn sai cấu trúc → code phức tạp, tốn round-trip mạng, mất tính nguyên tử.

**Bản chất phải nhớ:** phần lớn "phép tính" nên đẩy **về phía server**. Thay vì `GET` danh sách về client, sửa, rồi `SET` lại (3 round-trip + race condition), ta gọi một lệnh như `LPUSH`, `ZADD`, `SINTERSTORE` chạy nguyên tử trong Redis. Ít mạng hơn, không lock, đúng kết quả.

Redis còn tự **tối ưu bộ nhớ theo kích thước**: một Hash/List/Set/Zset nhỏ được lưu dạng **listpack** (mảng liền, tiết kiệm RAM); khi vượt ngưỡng cấu hình (`hash-max-listpack-entries`, `zset-max-listpack-entries`...) nó tự chuyển sang cấu trúc đầy đủ (hashtable, skiplist, quicklist). Bạn không phải làm gì — nhưng hiểu điều này giúp lý giải vì sao "nhiều object nhỏ trong Hash" tiết kiệm RAM hơn nhiều key String rời rạc.

<svg viewBox="0 0 660 300" role="img" aria-labelledby="ds-t ds-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="ds-t">Bản đồ các data structure của Redis</title>
<desc id="ds-d">Một key trỏ tới một trong các kiểu: String, Hash, List, Set, Sorted Set, Bitmap, HyperLogLog, Geo, kèm use case tiêu biểu của từng loại</desc>
<rect x="270" y="20" width="120" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="330" y="38" text-anchor="middle" font-size="12" fill="currentColor">key</text>
<text x="330" y="53" text-anchor="middle" font-size="11" fill="currentColor">→ value có kiểu</text>
<rect x="20" y="100" width="140" height="46" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="120" text-anchor="middle" font-size="11" fill="currentColor">String / Bitmap</text>
<text x="90" y="136" text-anchor="middle" font-size="10" fill="currentColor">counter, cache, cờ</text>
<rect x="180" y="100" width="140" height="46" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="250" y="120" text-anchor="middle" font-size="11" fill="currentColor">Hash</text>
<text x="250" y="136" text-anchor="middle" font-size="10" fill="currentColor">object nhỏ nhiều field</text>
<rect x="340" y="100" width="140" height="46" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="410" y="120" text-anchor="middle" font-size="11" fill="currentColor">List</text>
<text x="410" y="136" text-anchor="middle" font-size="10" fill="currentColor">queue / stack</text>
<rect x="500" y="100" width="140" height="46" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="570" y="120" text-anchor="middle" font-size="11" fill="currentColor">Set</text>
<text x="570" y="136" text-anchor="middle" font-size="10" fill="currentColor">unique, giao/hợp</text>
<rect x="60" y="180" width="150" height="46" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="135" y="200" text-anchor="middle" font-size="11" fill="currentColor">Sorted Set (zset)</text>
<text x="135" y="216" text-anchor="middle" font-size="10" fill="currentColor">leaderboard, range</text>
<rect x="230" y="180" width="150" height="46" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="305" y="200" text-anchor="middle" font-size="11" fill="currentColor">HyperLogLog</text>
<text x="305" y="216" text-anchor="middle" font-size="10" fill="currentColor">đếm unique xấp xỉ</text>
<rect x="400" y="180" width="150" height="46" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="475" y="200" text-anchor="middle" font-size="11" fill="currentColor">Geo</text>
<text x="475" y="216" text-anchor="middle" font-size="10" fill="currentColor">tọa độ, tìm quanh</text>
<text x="330" y="270" text-anchor="middle" font-size="11" fill="currentColor">Chọn đúng cấu trúc = đẩy phép tính về server, nguyên tử, ít round-trip</text>
<line x1="300" y1="60" x2="120" y2="100" stroke="currentColor" stroke-width="1"/>
<line x1="320" y1="60" x2="250" y2="100" stroke="currentColor" stroke-width="1"/>
<line x1="340" y1="60" x2="410" y2="100" stroke="currentColor" stroke-width="1"/>
<line x1="360" y1="60" x2="560" y2="100" stroke="currentColor" stroke-width="1"/>
</svg>

> **Về Big-O:** trong Redis, `N` thường là số phần tử của **một key** (số field trong Hash, số phần tử List...), còn `M` là số phần tử **trả về/thao tác**. Ưu tiên lệnh **O(1)** hoặc **O(log N + M)**; cảnh giác các lệnh **O(N)** duyệt toàn bộ key lớn vì chúng chặn cả server (single-thread, Bài 1).

---

## 3. String — nền tảng, không chỉ là chuỗi

String là kiểu cơ bản nhất: một key trỏ tới một chuỗi byte (tối đa 512MB). Nhưng nó kiêm luôn **số nguyên** (INCR/DECR nguyên tử) và **bit array** (thao tác từng bit).

| Lệnh | Ý nghĩa | Big-O |
|------|---------|-------|
| `SET`/`GET` | ghi/đọc | O(1) |
| `SETEX`/`SET k v EX 60` | set kèm TTL | O(1) |
| `SET k v NX` | chỉ set nếu chưa tồn tại (dùng cho lock) | O(1) |
| `INCR`/`DECR`/`INCRBY` | tăng/giảm nguyên tử | O(1) |
| `MSET`/`MGET` | nhiều key một lượt | O(N) theo số key |
| `APPEND`/`GETRANGE` | nối/lấy đoạn con | O(1)~O(M) |
| `SETBIT`/`GETBIT`/`BITCOUNT` | thao tác bit | O(1) / O(N) |

```bash
# Counter nguyên tử — không cần lock, an toàn giữa nhiều client
127.0.0.1:6379> INCR post:42:likes
(integer) 1
127.0.0.1:6379> INCRBY post:42:likes 5
(integer) 6

# Cache một JSON kèm TTL 300 giây trong đúng 1 lệnh
127.0.0.1:6379> SET user:1:profile '{"name":"An","age":30}' EX 300
OK

# Đọc nhiều key một round-trip thay vì N lần GET
127.0.0.1:6379> MSET p:1 apple p:2 banana p:3 cherry
OK
127.0.0.1:6379> MGET p:1 p:2 p:3
1) "apple"
2) "banana"
3) "cherry"
```

**Khi nào dùng:** cache blob/JSON, bộ đếm (view, like), cờ cấu hình, token phiên. Với dữ liệu số cần tăng/giảm đồng thời từ nhiều nơi, `INCR` là lựa chọn nguyên tử chuẩn — không được `GET` rồi `+1` rồi `SET` (race condition).

---

## 4. Hash — object nhỏ nhiều field

Hash là **map lồng bên trong một key**: `key → { field → value }`. Lý tưởng để lưu một object (user, sản phẩm) khi bạn muốn đọc/ghi **từng field** mà không phải serialize/deserialize cả object.

| Lệnh | Ý nghĩa | Big-O |
|------|---------|-------|
| `HSET`/`HGET` | ghi/đọc một field | O(1) |
| `HMGET` | đọc nhiều field | O(M) |
| `HGETALL` | lấy toàn bộ field | O(N) — cẩn thận key lớn |
| `HINCRBY` | tăng field số nguyên tử | O(1) |
| `HDEL`/`HEXISTS` | xóa/kiểm tra field | O(1) |
| `HSCAN` | duyệt an toàn (cursor) | O(1) mỗi bước |

```bash
127.0.0.1:6379> HSET user:1 name "An" age 30 city "Hanoi"
(integer) 3
127.0.0.1:6379> HGET user:1 name
"An"
127.0.0.1:6379> HINCRBY user:1 age 1        # sinh nhật, +1 nguyên tử
(integer) 31
127.0.0.1:6379> HGETALL user:1
1) "name"
2) "An"
3) "age"
4) "31"
5) "city"
6) "Hanoi"
```

**Hash vs nhiều String:** lưu `user:1` là một Hash (3 field) tiết kiệm RAM và gọn hơn nhiều so với `user:1:name`, `user:1:age`, `user:1:city` là ba key String — Hash nhỏ được đóng gói dạng **listpack**. Nhược điểm: **TTL đặt trên cả key**, không đặt trên từng field (trước Redis 7.4); và `HGETALL` trên Hash rất lớn là O(N) chặn server — với Hash lớn hãy dùng `HSCAN`.

---

## 5. List — chuỗi có thứ tự, làm queue/stack

List là danh sách liên kết theo thứ tự chèn, thao tác nhanh ở **hai đầu**. Là công cụ chủ lực cho **queue** (FIFO) và **stack** (LIFO).

| Lệnh | Ý nghĩa | Big-O |
|------|---------|-------|
| `LPUSH`/`RPUSH` | chèn đầu trái/phải | O(1) |
| `LPOP`/`RPOP` | lấy & xóa ở đầu | O(1) |
| `BRPOP`/`BLPOP` | pop **blocking** (chờ tới khi có phần tử) | O(1) |
| `LRANGE` | lấy đoạn theo chỉ số | O(S+M) |
| `LLEN` | độ dài | O(1) |
| `LMOVE`/`BLMOVE` | chuyển phần tử giữa 2 list nguyên tử | O(1) |

```bash
# Producer đẩy job vào đầu trái
127.0.0.1:6379> LPUSH jobs "send-email:42"
(integer) 1
127.0.0.1:6379> LPUSH jobs "resize-image:7"
(integer) 2

# Consumer lấy từ đầu phải => FIFO (queue).
# BRPOP chặn tối đa 5s chờ job; trả (tên list, giá trị)
127.0.0.1:6379> BRPOP jobs 5
1) "jobs"
2) "send-email:42"

# Muốn stack (LIFO)? Push và pop cùng một đầu:
127.0.0.1:6379> LPUSH undo "action-1"
127.0.0.1:6379> LPOP undo
"action-1"
```

**`BRPOP` là chìa khóa cho worker:** thay vì polling `RPOP` liên tục đốt CPU, worker gọi `BRPOP jobs 0` và **ngủ** cho tới khi có job — Redis đánh thức ngay khi phần tử tới. Với queue tin cậy hơn (ack, retry, consumer group), Redis **Streams** là lựa chọn tốt hơn (Bài 4), nhưng List đủ cho job queue nhẹ.

**Lưu ý:** `LRANGE key 0 -1` trên list dài là O(N); pattern **reliable queue** cổ điển dùng `LMOVE`/`BLMOVE` để chuyển job sang list "processing" nguyên tử, tránh mất job nếu worker chết giữa chừng.

---

## 6. Set — tập unique, đại số tập hợp

Set là tập các phần tử **không trùng, không thứ tự**. Sức mạnh nằm ở các phép **giao / hợp / hiệu** chạy server-side.

| Lệnh | Ý nghĩa | Big-O |
|------|---------|-------|
| `SADD`/`SREM` | thêm/xóa | O(1) mỗi phần tử |
| `SISMEMBER` | kiểm tra thuộc tập | O(1) |
| `SCARD` | đếm phần tử | O(1) |
| `SINTER`/`SUNION`/`SDIFF` | giao/hợp/hiệu | O(N) |
| `SINTERSTORE` | giao và lưu kết quả | O(N) |
| `SRANDMEMBER`/`SPOP` | lấy ngẫu nhiên | O(1)~O(M) |

```bash
127.0.0.1:6379> SADD user:1:follows alice bob carol
(integer) 3
127.0.0.1:6379> SADD user:2:follows bob carol dave
(integer) 3

# Bạn chung giữa user 1 và user 2 — một lệnh, server tự tính
127.0.0.1:6379> SINTER user:1:follows user:2:follows
1) "bob"
2) "carol"

# Kiểm tra tư cách thành viên O(1): "user 1 có follow alice?"
127.0.0.1:6379> SISMEMBER user:1:follows alice
(integer) 1

# Gợi ý "người bạn nên follow" = follows của bạn - follows của mình
127.0.0.1:6379> SDIFF user:2:follows user:1:follows
1) "dave"
```

**Khi nào dùng:** tag, danh sách unique (đã xem bài viết nào), quan hệ (following/followers), khử trùng lặp. Các phép tập hợp giúp làm "bạn chung", "sản phẩm liên quan", "gợi ý" **ngay trong Redis** thay vì kéo hết về app. Với Set rất lớn, tránh `SMEMBERS` (O(N)) — dùng `SSCAN`. Nếu chỉ cần **đếm** số phần tử unique cực lớn mà chấp nhận sai số, dùng HyperLogLog (mục 9) thay vì Set để tiết kiệm RAM khổng lồ.

---

## 7. Sorted Set (zset) — cấu trúc "ngôi sao": phần tử + score

Sorted Set = Set nhưng **mỗi phần tử gắn một `score` (số thực)**, và Redis **luôn giữ thứ tự theo score**. Bên trong là **skiplist + hashtable**, cho phép cả tra cứu O(1) theo member lẫn truy vấn theo hạng/khoảng O(log N). Đây là cấu trúc mạnh và đặc trưng nhất của Redis.

| Lệnh | Ý nghĩa | Big-O |
|------|---------|-------|
| `ZADD` | thêm/cập nhật member kèm score | O(log N) |
| `ZINCRBY` | cộng dồn score nguyên tử | O(log N) |
| `ZRANGE`/`ZREVRANGE` | lấy theo hạng (chỉ số) | O(log N + M) |
| `ZRANGEBYSCORE` | lấy theo khoảng score | O(log N + M) |
| `ZRANK`/`ZREVRANK` | hạng của một member | O(log N) |
| `ZSCORE` | score của member | O(1) |
| `ZREMRANGEBYRANK` | cắt bớt theo hạng | O(log N + M) |

### Use case 1 — Leaderboard (bảng xếp hạng)

```bash
127.0.0.1:6379> ZADD game:lb 1500 alice 2200 bob 1800 carol
(integer) 3
127.0.0.1:6379> ZINCRBY game:lb 350 alice     # alice ghi thêm điểm
"1850"

# Top 3 điểm cao nhất, kèm score (WITHSCORES) — alice 1850 > carol 1800
127.0.0.1:6379> ZREVRANGE game:lb 0 2 WITHSCORES
1) "bob"
2) "2200"
3) "alice"
4) "1850"
5) "carol"
6) "1800"

# Hạng của alice (0-based, cao nhất là hạng 0): bob=0, alice=1, carol=2
127.0.0.1:6379> ZREVRANK game:lb alice
(integer) 1
```

Leaderboard bằng zset là **O(log N)** cho mọi thao tác — hàng triệu người chơi vẫn trả top-N tức thì. Làm bằng SQL `ORDER BY score` sẽ chậm và tốn tài nguyên hơn nhiều ở quy mô lớn.

### Use case 2 — Range by score: dùng score làm timestamp/priority

Vì score là số thực, ta có thể nhét **timestamp** vào score để lọc theo thời gian, hoặc **priority** để làm hàng đợi ưu tiên.

```bash
# Dùng score = epoch ms. Lấy các sự kiện trong một khoảng thời gian
127.0.0.1:6379> ZADD events 1721800000 "login" 1721803600 "purchase" 1721807200 "logout"
(integer) 3
127.0.0.1:6379> ZRANGEBYSCORE events 1721800000 1721804000
1) "login"
2) "purchase"

# Priority queue: score = độ ưu tiên, lấy việc ưu tiên thấp nhất trước
127.0.0.1:6379> ZADD tasks 1 "critical" 5 "normal" 10 "low"
127.0.0.1:6379> ZRANGE tasks 0 0            # phần tử score nhỏ nhất
1) "critical"

# Sliding window rate limit: xóa timestamp cũ hơn cửa sổ rồi đếm còn lại
127.0.0.1:6379> ZREMRANGEBYSCORE api:user:1 0 1721800000
127.0.0.1:6379> ZCARD api:user:1
```

**Khi nào dùng zset:** bất cứ khi nào cần "danh sách được sắp theo một chỉ số": leaderboard, bảng xu hướng (trending), hàng đợi ưu tiên, sliding-window rate limiter, lịch/timeline theo thời gian, "top N gần nhất".

---

## 8. Bitmap — hàng triệu cờ boolean trong vài KB

Bitmap không phải kiểu riêng mà là **String nhìn dưới góc độ mảng bit**. Mỗi user map tới một **offset bit**; bật bit = "user đó có mặt/đã làm việc X". Cực kỳ tiết kiệm: 1 triệu user vừa đúng **125 KB**.

| Lệnh | Ý nghĩa | Big-O |
|------|---------|-------|
| `SETBIT k offset 0/1` | bật/tắt bit tại offset | O(1) |
| `GETBIT k offset` | đọc bit | O(1) |
| `BITCOUNT k` | đếm số bit = 1 | O(N) |
| `BITOP AND/OR/XOR dest k1 k2` | phép bit giữa nhiều bitmap | O(N) |
| `BITPOS` | tìm bit 0/1 đầu tiên | O(N) |

### Use case — Daily Active Users (DAU)

```bash
# Mỗi ngày một bitmap. User id làm offset. User 42, 100, 500 hoạt động hôm nay:
127.0.0.1:6379> SETBIT active:2026-07-24 42 1
(integer) 0
127.0.0.1:6379> SETBIT active:2026-07-24 100 1
127.0.0.1:6379> SETBIT active:2026-07-24 500 1

# Có bao nhiêu user active hôm nay?
127.0.0.1:6379> BITCOUNT active:2026-07-24
(integer) 3

# User 42 có active hôm nay không?
127.0.0.1:6379> GETBIT active:2026-07-24 42
(integer) 1

# Retention: user active CẢ hôm qua VÀ hôm nay = AND hai bitmap
127.0.0.1:6379> BITOP AND active:both active:2026-07-23 active:2026-07-24
(integer) 63
127.0.0.1:6379> BITCOUNT active:both
(integer) 2
```

**Khi nào dùng:** trạng thái boolean theo id trên tập lớn — DAU/MAU, "đã đọc thông báo chưa", A/B flag, streak điểm danh. `BITOP` cho phép làm retention/cohort (AND, OR, XOR nhiều ngày) ngay trong Redis. Điều kiện: id phải là số nguyên **liền và không quá thưa** — nếu id thưa (UUID), offset khổng lồ sẽ tốn RAM, khi đó dùng Set hoặc HyperLogLog.

---

## 9. HyperLogLog — đếm unique xấp xỉ với ~12KB cố định

Bài toán: đếm **số lượng phần tử unique** (cardinality) của tập cực lớn — ví dụ số IP unique truy cập, số user unique xem video. Dùng Set thì chính xác nhưng tốn RAM tỉ lệ với số phần tử (hàng trăm MB). **HyperLogLog (HLL)** đánh đổi độ chính xác lấy bộ nhớ: đếm hàng **tỉ** phần tử unique chỉ với **~12 KB cố định**, sai số chuẩn **~0.81%**.

| Lệnh | Ý nghĩa | Big-O |
|------|---------|-------|
| `PFADD k v...` | thêm phần tử vào HLL | O(1) |
| `PFCOUNT k...` | ước lượng số unique | O(1) (hoặc O(N) khi hợp nhiều key) |
| `PFMERGE dest k1 k2` | hợp nhất nhiều HLL | O(N) |

```bash
# Đếm số visitor unique hôm nay. Thêm bao nhiêu lần một IP cũng chỉ tính 1.
127.0.0.1:6379> PFADD visits:2026-07-24 1.2.3.4 5.6.7.8 1.2.3.4
(integer) 1
127.0.0.1:6379> PFADD visits:2026-07-24 9.9.9.9
(integer) 1
127.0.0.1:6379> PFCOUNT visits:2026-07-24     # ước lượng, không chính xác tuyệt đối
(integer) 3

# Unique visitor cả tuần = merge 7 HLL ngày rồi đếm (union, tự khử trùng)
127.0.0.1:6379> PFMERGE visits:week visits:2026-07-18 visits:2026-07-19 visits:2026-07-24
OK
127.0.0.1:6379> PFCOUNT visits:week
(integer) 5
```

**Khi nào dùng:** đếm unique quy mô lớn khi **sai số nhỏ chấp nhận được** và bạn **không cần liệt kê** phần tử (HLL không cho biết *ai* đã ghé, chỉ cho biết *bao nhiêu*). Nếu cần biết chính xác hoặc cần truy vấn thành viên → dùng Set. So sánh nhanh:

| Nhu cầu | Set | HyperLogLog |
|---------|-----|-------------|
| Chính xác tuyệt đối | ✅ | ❌ (~0.81% sai số) |
| Liệt kê được phần tử | ✅ | ❌ |
| RAM cho 100M unique | hàng GB | ~12 KB |
| Kiểm tra thành viên (SISMEMBER) | ✅ | ❌ |

---

## 10. Geo — tọa độ và tìm kiếm quanh vị trí

Geo lưu **kinh độ/vĩ độ** của các điểm và tìm điểm trong bán kính. Bên trong thực chất là một **Sorted Set** mà score là **geohash 52-bit** — nên bạn có thể dùng cả lệnh zset trên geo key.

| Lệnh | Ý nghĩa | Big-O |
|------|---------|-------|
| `GEOADD k lon lat member` | thêm điểm | O(log N) |
| `GEOSEARCH ... BYRADIUS` | tìm trong bán kính | O(N+log M) |
| `GEODIST k a b` | khoảng cách 2 điểm | O(1) |
| `GEOPOS k member` | lấy tọa độ | O(1) |

```bash
# Thêm vài quán cà phê (lon lat member)
127.0.0.1:6379> GEOADD shops 105.8542 21.0285 "HoanKiem"
(integer) 1
127.0.0.1:6379> GEOADD shops 105.8194 21.0227 "BaDinh" 105.8000 20.9950 "ThanhXuan"
(integer) 2

# Tìm quán trong bán kính 5km quanh một vị trí, kèm khoảng cách, gần nhất trước
127.0.0.1:6379> GEOSEARCH shops FROMLONLAT 105.85 21.02 BYRADIUS 5 km ASC WITHDIST
1) 1) "HoanKiem"
   2) "0.9876"
2) 1) "BaDinh"
   2) "3.1204"

# Khoảng cách giữa hai điểm (km)
127.0.0.1:6379> GEODIST shops HoanKiem BaDinh km
"3.7654"
```

**Khi nào dùng:** "tìm tài xế/cửa hàng/người dùng gần tôi" — ứng dụng ride-hailing, giao đồ ăn, hẹn hò theo vị trí, cửa hàng lân cận. Với dữ liệu địa lý phức tạp (polygon, đa lớp bản đồ) thì PostGIS mạnh hơn; Geo của Redis hợp bài toán **radius/nearest** đơn giản, tốc độ cao.

---

## 11. Bảng chọn nhanh: bài toán → cấu trúc

| Bài toán | Cấu trúc | Lệnh lõi |
|----------|----------|----------|
| Cache JSON/blob + TTL | String | `SET ... EX` |
| Bộ đếm (view, like) nguyên tử | String | `INCR`, `INCRBY` |
| Object nhiều field, sửa từng field | Hash | `HSET`, `HINCRBY` |
| Queue / job worker | List | `LPUSH` + `BRPOP` |
| Stack (undo) | List | `LPUSH` + `LPOP` |
| Tập unique, tag, quan hệ | Set | `SADD`, `SINTER` |
| Leaderboard / xếp hạng | Sorted Set | `ZADD`, `ZREVRANGE` |
| Timeline / range theo thời gian | Sorted Set | `ZRANGEBYSCORE` |
| Rate limit sliding window | Sorted Set | `ZREMRANGEBYSCORE`+`ZCARD` |
| DAU / cờ boolean theo id | Bitmap | `SETBIT`, `BITCOUNT`, `BITOP` |
| Đếm unique quy mô lớn (xấp xỉ) | HyperLogLog | `PFADD`, `PFCOUNT` |
| Tìm quanh vị trí | Geo | `GEOADD`, `GEOSEARCH` |

---

## 12. Tóm tắt
- Redis mạnh vì value là **cấu trúc dữ liệu server-side** với lệnh **nguyên tử** — đẩy phép tính về server, bớt round-trip, khỏi lock.
- **String**: cache + counter (`INCR`) + bit; **Hash**: object nhỏ, sửa từng field (`HINCRBY`); **List**: queue/stack, `BRPOP` blocking cho worker.
- **Set**: unique + đại số tập hợp (`SINTER` làm bạn chung); **Sorted Set**: cấu trúc ngôi sao — leaderboard, range-by-score, priority queue, sliding-window, tất cả **O(log N)**.
- **Bitmap**: hàng triệu cờ boolean/DAU trong vài KB (`SETBIT`/`BITOP`); **HyperLogLog**: đếm unique cực lớn ~12KB, sai số ~0.81%; **Geo**: tìm quanh vị trí (thực chất là zset geohash).
- Quy tắc chọn: khớp **hình dạng dữ liệu + truy vấn** với cấu trúc; tránh lệnh **O(N)** (`KEYS`, `HGETALL`, `SMEMBERS`) trên key lớn vì single-thread sẽ chặn cả server — dùng biến thể `SCAN`.

> **Bài tiếp theo (Bài 3):** persistence & độ bền — **RDB snapshot vs AOF**, đánh đổi giữa mất dữ liệu và hiệu năng, và cách Redis khôi phục sau khi restart.
