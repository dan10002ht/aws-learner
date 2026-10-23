# Bài 6 — Redis patterns: lock, rate limiter, leaderboard, cache

## 1. Mục tiêu
Sau bài này bạn có thể:
- Cài đúng **distributed lock** bằng `SET NX PX` — hiểu vì sao **bắt buộc unique token** và phải **xoá bằng Lua compare-and-del**.
- Biết **Redlock là gì** và tóm được **tranh cãi Martin Kleppmann vs Antirez** để chọn công cụ cho đúng.
- Viết 3 kiểu **rate limiter**: fixed window (`INCR`+`EXPIRE`), sliding window log (sorted set), token bucket (Lua atomic).
- Dựng **leaderboard** thời gian thực bằng sorted set (`ZADD`/`ZREVRANGE`/`ZRANK`).
- Làm **session store** và **cache-aside** đúng chuẩn (TTL, stampede, invalidation).
- Hiểu **vì sao Lua script trong Redis là atomic** và khi nào phải dùng nó.

---

## 2. Sợi chỉ đỏ: vì sao Lua script atomic?

Trước khi vào từng pattern, phải nắm cái này vì nó chi phối tất cả.

Nhớ từ [[dst-01-redis-intro]]: Redis xử lý lệnh trên **một thread event loop, tuần tự**. Mỗi lệnh đơn là atomic tự nhiên. Nhưng khi logic của bạn cần **đọc → quyết định → ghi** (ví dụ "nếu token này là của tôi thì mới xoá"), nếu tách làm nhiều lệnh thì giữa chúng có thể chen vào lệnh của client khác → **race condition**.

Redis cho gửi một đoạn **Lua script** qua `EVAL`. Server chạy **trọn vẹn cả script như MỘT lệnh**: trong lúc script chạy, **không lệnh nào khác được xen vào** (vì vẫn là single-thread). Do đó chuỗi read-modify-write bên trong script là **atomic** — không cần lock, không cần `WATCH/MULTI` optimistic.

<svg viewBox="0 0 640 220" role="img" aria-labelledby="lua-t lua-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="lua-t">Vì sao Lua script atomic trong Redis</title>
<desc id="lua-d">So sánh ba lệnh rời có thể bị chen ngang với một Lua script chạy trọn vẹn không bị xen kẽ trên event loop single-thread</desc>
<text x="150" y="24" text-anchor="middle" font-size="12" fill="currentColor">3 lệnh rời (GET, so sánh, DEL)</text>
<rect x="40" y="38" width="70" height="28" rx="5" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="75" y="56" text-anchor="middle" font-size="11" fill="currentColor">GET</text>
<rect x="120" y="38" width="90" height="28" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="165" y="56" text-anchor="middle" font-size="11" fill="currentColor">lệnh client B</text>
<rect x="220" y="38" width="70" height="28" rx="5" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="255" y="56" text-anchor="middle" font-size="11" fill="currentColor">DEL</text>
<text x="150" y="86" text-anchor="middle" font-size="11" fill="currentColor">B chen vào giữa → xoá nhầm lock của người khác</text>
<line x1="20" y1="110" x2="620" y2="110" stroke="currentColor" stroke-width="0.5" stroke-dasharray="4 4"/>
<text x="150" y="140" text-anchor="middle" font-size="12" fill="currentColor">EVAL 1 Lua script</text>
<rect x="40" y="154" width="250" height="30" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="165" y="173" text-anchor="middle" font-size="11" fill="currentColor">GET + so sánh + DEL (trọn vẹn)</text>
<text x="165" y="204" text-anchor="middle" font-size="11" fill="currentColor">Không lệnh nào xen vào → atomic</text>
<rect x="360" y="40" width="250" height="150" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="485" y="70" text-anchor="middle" font-size="12" fill="currentColor">Event loop single-thread</text>
<text x="485" y="95" text-anchor="middle" font-size="11" fill="currentColor">chạy tuần tự từng lệnh</text>
<text x="485" y="118" text-anchor="middle" font-size="11" fill="currentColor">Lua = 1 đơn vị thực thi</text>
<text x="485" y="141" text-anchor="middle" font-size="11" fill="currentColor">→ read-modify-write</text>
<text x="485" y="162" text-anchor="middle" font-size="11" fill="currentColor">không bị race</text>
</svg>

> **Cảnh báo song hành:** vì script chặn cả server, **giữ script ngắn**. Đừng loop hàng triệu key trong Lua — sẽ block mọi client như một lệnh O(N) lớn.

---

## 3. Distributed lock — SET NX PX

### 3.1 Bài toán
Nhiều pod cùng chạy một cron/job (gửi email, tính toán). Chỉ muốn **đúng một pod** làm tại một thời điểm. Lock chính là "chìa khoá phòng vệ sinh trên tàu": ai cầm chìa mới được vào, trả chìa xong người khác mới vào được.

### 3.2 Acquire đúng cách
```bash
# SET key value NX PX <ttl_ms>
#   NX  = chỉ set nếu key CHƯA tồn tại  (đây là "giành lock")
#   PX  = TTL tính bằng mili-giây       (auto-hết-hạn nếu pod chết → tránh deadlock)
SET lock:report "a3f9c1-uuid-của-pod-này" NX PX 30000
# -> OK    nghĩa là giành được lock
# -> nil   nghĩa là người khác đang giữ
```

Hai thành phần **không được thiếu**:
1. **`PX` (TTL)**: nếu pod giữ lock rồi crash mà không có TTL → lock kẹt vĩnh viễn (deadlock). TTL đảm bảo lock tự nhả.
2. **`NX`**: đảm bảo "kiểm tra chưa có + set" là **một thao tác atomic**. Nếu tách `EXISTS` rồi `SET` thì hai pod cùng thấy trống và cùng set → cả hai tưởng mình có lock.

### 3.3 Vì sao BẮT BUỘC unique token?
Value của lock **phải là một token duy nhất** (UUID) của người giữ. Lý do nằm ở kịch bản chết người sau:

<step-flow>
<svg viewBox="0 0 760 430" role="img" aria-labelledby="dst06b-t dst06b-d" style="width:100%;height:auto">
<title id="dst06b-t">Vì sao cần unique token khi nhả lock</title>
<desc id="dst06b-d">Dòng thời gian của Pod A, key lock:report trên Redis, Pod B và Pod C. A giành lock TTL 30s rồi bị GC pause quá 30s; TTL hết, lock tự nhả; B giành lock mới; A tỉnh dậy DEL mù và xoá nhầm lock của B; C giành được lock nên B và C cùng chạy. Chỉ xoá khi token khớp mới an toàn.</desc>
<defs><marker id="dst06b-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker></defs>
<text x="12" y="65" text-anchor="start" font-size="13" fill="currentColor" font-weight="600">Pod A</text>
<text x="12" y="155" text-anchor="start" font-size="13" fill="currentColor" font-weight="600">Redis</text>
<text x="12" y="245" text-anchor="start" font-size="13" fill="currentColor" font-weight="600">Pod B</text>
<text x="12" y="315" text-anchor="start" font-size="13" fill="currentColor" font-weight="600">Pod C</text>
<text x="12" y="171" text-anchor="start" font-size="12" fill="currentColor" opacity="0.8">lock:report</text>
<line x1="110" y1="350" x2="750" y2="350" stroke="currentColor" stroke-opacity="0.6"/>
<line x1="120" y1="345" x2="120" y2="355" stroke="currentColor"/><text x="120" y="368" text-anchor="middle" font-size="12" fill="currentColor">t = 0</text>
<text x="750" y="368" text-anchor="end" font-size="12" fill="currentColor" opacity="0.8">thời gian →</text>
<g data-step="1"><rect x="120" y="48" width="80" height="24" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-width="1"/><text x="160" y="65" text-anchor="middle" font-size="12" fill="currentColor">chạy job</text><line x1="130" y1="72" x2="130" y2="136" stroke="currentColor" stroke-width="1.6" marker-end="url(#dst06b-arrow)"/><text x="138" y="108" text-anchor="start" font-size="12" fill="currentColor">SET NX PX 30000 → OK</text><rect x="120" y="138" width="280" height="24" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-width="1"/><text x="260" y="155" text-anchor="middle" font-size="12" fill="currentColor">tokenA (TTL 30s)</text></g>
<g data-step="2"><rect x="200" y="48" width="300" height="24" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-width="1"/><text x="310" y="65" text-anchor="middle" font-size="12" fill="currentColor">GC pause / chậm &gt; 30s</text></g>
<g data-step="3"><line x1="400" y1="36" x2="400" y2="350" stroke="#f43f5e" stroke-width="1.2" stroke-dasharray="3 3"/><line x1="400" y1="345" x2="400" y2="355" stroke="currentColor"/><text x="400" y="368" text-anchor="middle" font-size="12" fill="currentColor">t = 30s</text><text x="394" y="190" text-anchor="end" font-size="12" fill="currentColor">TTL hết → lock tự nhả</text></g>
<g data-step="4"><rect x="440" y="228" width="310" height="24" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-width="1"/><text x="525" y="245" text-anchor="middle" font-size="12" fill="currentColor">B chạy job</text><line x1="446" y1="228" x2="446" y2="164" stroke="currentColor" stroke-width="1.6" marker-end="url(#dst06b-arrow)"/><text x="452" y="200" text-anchor="start" font-size="12" fill="currentColor">SET NX → OK</text><rect x="440" y="138" width="90" height="24" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-width="1"/><text x="485" y="155" text-anchor="middle" font-size="12" fill="currentColor">tokenB</text></g>
<g data-step="5"><rect x="500" y="48" width="30" height="24" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-width="1"/><line x1="530" y1="72" x2="530" y2="136" stroke="#f43f5e" stroke-width="2" marker-end="url(#dst06b-arrow)"/><text x="538" y="100" text-anchor="start" font-size="12" fill="currentColor">DEL lock:report (mù)</text><rect x="440" y="138" width="90" height="24" rx="5" fill="none" stroke="#f43f5e" stroke-width="2.5" stroke-dasharray="5 3"/><text x="570" y="155" text-anchor="middle" font-size="12" fill="currentColor" opacity="0.8">trống</text><text x="538" y="118" text-anchor="start" font-size="12" fill="currentColor">xoá nhầm lock của B</text></g>
<g data-step="6"><rect x="610" y="224" width="140" height="102" rx="6" fill="#f43f5e" fill-opacity="0.13"/><rect x="610" y="298" width="140" height="24" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-width="1"/><text x="680" y="315" text-anchor="middle" font-size="12" fill="currentColor">C chạy job</text><line x1="620" y1="298" x2="620" y2="164" stroke="currentColor" stroke-width="1.6" marker-end="url(#dst06b-arrow)"/><text x="626" y="200" text-anchor="start" font-size="12" fill="currentColor">SET NX → OK</text><rect x="610" y="138" width="140" height="24" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-width="1"/><text x="680" y="155" text-anchor="middle" font-size="12" fill="currentColor">tokenC</text><text x="680" y="278" text-anchor="middle" font-size="12" fill="currentColor" font-weight="600">hai pod cùng chạy!</text></g>
<g data-step="7"><rect x="110" y="384" width="640" height="40" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-width="1"/><text x="430" y="400" text-anchor="middle" font-size="12" fill="currentColor">Nhả bằng Lua compare-and-del: GET = tokenB ≠ tokenA → return 0, lock của B còn nguyên.</text><text x="430" y="417" text-anchor="middle" font-size="12" fill="currentColor" font-weight="600">Chỉ xoá nếu token khớp mới an toàn.</text></g>
</svg>
<step-note data-step="1">A giành lock bằng token riêng của mình. TTL 30s có mặt để lock tự nhả nếu A chết giữa chừng (mục 3.2).</step-note>
<step-note data-step="2">Stop-the-world GC, máy quá tải hay mạng treo đóng băng A lâu hơn TTL. A không thấy thời gian trôi: với A, nó vẫn đang giữ lock.</step-note>
<step-note data-step="3">Redis không biết A còn sống hay đã chết, hết 30s là xoá key. Chính cơ chế chống deadlock giờ mở cửa cho người khác.</step-note>
<step-note data-step="4">Key đang trống nên <code>NX</code> thành công cho B một cách hoàn toàn hợp lệ. Từ lúc này B mới là chủ lock thật.</step-note>
<step-note data-step="5">A làm nốt rồi nhả lock mà không kiểm ai đang giữ, nên lệnh <code>DEL</code> xoá mất lock của B. B không nhận được báo gì, vẫn tin mình giữ lock.</step-note>
<step-note data-step="6">Key lại trống nên C cũng giành được. B và C cùng ở trong vùng găng: vỡ mutual exclusion, đúng điều lock sinh ra để ngăn.</step-note>
<step-note data-step="7">Token duy nhất cộng so-rồi-mới-xoá atomic (mục 3.4) chặn đúng bước 5. Đoạn ngắn A và B cùng chạy sau khi A tỉnh thì token không chặn được, đó là việc của fencing token ở mục 3.5.</step-note>
</step-flow>

Nếu nhả lock bằng `DEL lock:report` mù (không kiểm tra ai đang giữ): A bị pause quá TTL, lock hết hạn, B giành được lock, rồi A tỉnh dậy và `DEL` — **xoá nhầm lock của B**. Giờ B tưởng mình còn giữ nhưng thực tế lock trống, pod thứ ba lại giành được → vỡ mutual exclusion.

### 3.4 Nhả lock: compare-and-del bằng Lua
Phải làm "so token rồi mới xoá" **atomic**. `GET` rồi `DEL` rời nhau vẫn dính đúng race ở hình trên. Dùng Lua:

```lua
-- release.lua : chỉ xoá nếu token của tôi khớp
-- KEYS[1] = tên lock, ARGV[1] = token của tôi
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
else
    return 0
end
```
```bash
# Gọi từ redis-cli: 1 = số lượng KEYS
EVAL "$(cat release.lua)" 1 lock:report a3f9c1-uuid-của-pod-này
```

GET + so sánh + DEL nằm trọn trong một script → không client nào chen vào giữa. Đây chính là lý do **mọi thư viện lock nghiêm túc** (Redisson, node-redlock...) đều dùng Lua để release.

### 3.5 Redlock và tranh cãi Martin Kleppmann
Một Redis node đơn là **single point of failure**: node chết là mất lock. **Redlock** (do antirez/Salvatore Sanfilippo đề xuất) giành lock trên **N node độc lập** (thường 5), coi là thành công nếu chiếm được **đa số (majority, N/2+1)** trong thời gian ngắn hơn TTL.

**Martin Kleppmann phản biện** (bài "How to do distributed locking", 2016) — hai luận điểm cốt lõi bạn phải nhớ:

| Vấn đề | Nội dung |
|--------|----------|
| **Timing giả định** | Redlock dựa vào đồng hồ & tốc độ mạng ổn định. Một **GC pause dài, clock jump, hoặc gói tin trễ** có thể khiến hai client cùng tin mình giữ lock → mất mutual exclusion. |
| **Không có fencing token** | Lock kiểu này **không đủ** để bảo vệ tài nguyên nếu client bị pause. Cần **fencing token**: một số tăng dần cấp cùng lock; tài nguyên (DB, storage) **từ chối** ghi có token cũ hơn token đã thấy. Redis không tự cấp số này. |

Antirez phản hồi rằng fencing có thể thay bằng *check-and-set* ở tầng tài nguyên, và Redlock đủ cho phần lớn use case. Kết luận thực dụng:

- **Lock để tối ưu (efficiency)** — tránh làm việc trùng, thi thoảng chạy đôi cũng không sao: **1 node Redis + SET NX + Lua release là quá đủ**.
- **Lock để đảm bảo đúng đắn (correctness)** — hai bên chạy đồng thời là *thảm hoạ* (ghi tiền, ghi file): **đừng chỉ tin Redis**. Dùng hệ đồng thuận thật (ZooKeeper, etcd, Consul) và **fencing token** ở tầng tài nguyên.

> Quy tắc: Redis lock là "hàng rào mềm", không phải "khoá thép". Đừng đặt tính đúng đắn tài chính lên nó.

---

## 4. Rate limiter — 3 kiểu

Giới hạn "mỗi user tối đa X request / khoảng thời gian". Ba cách, đánh đổi khác nhau.

### 4.1 Fixed window — INCR + EXPIRE
Đơn giản nhất: mỗi (user, cửa sổ thời gian) một counter, hết cửa sổ thì reset.

```bash
# Giới hạn 100 req/phút cho user 42. Key gắn mốc phút hiện tại.
# Client tính key = rate:42:<epoch_phút>, ví dụ rate:42:29010318
127.0.0.1:6379> INCR rate:42:29010318      # tăng, trả về số hiện tại
(integer) 1
127.0.0.1:6379> EXPIRE rate:42:29010318 60 # đặt TTL 60s cho lần đầu
```
Vấn đề **atomic**: `INCR` xong mới `EXPIRE` — nếu crash giữa hai lệnh, key không có TTL → kẹt mãi. Gộp bằng Lua cho chắc:

```lua
-- fixed_window.lua : KEYS[1]=key, ARGV[1]=limit, ARGV[2]=ttl_giây
local c = redis.call("INCR", KEYS[1])
if c == 1 then
    redis.call("EXPIRE", KEYS[1], ARGV[2])   -- chỉ đặt TTL ở lần đầu
end
if c > tonumber(ARGV[1]) then
    return 0    -- vượt hạn -> chặn
end
return 1        -- cho qua
```

**Nhược điểm cố hữu — burst ở mép cửa sổ:** 100 req lúc 12:00:59 và 100 req lúc 12:01:00 = 200 req trong 1 giây mà vẫn "hợp lệ" vì rơi vào hai cửa sổ khác nhau. Đây là lý do có sliding window.

### 4.2 Sliding window log — sorted set
Lưu **timestamp từng request** vào một sorted set, mỗi lần đến thì bỏ các timestamp cũ hơn (now − window) rồi đếm số còn lại.

```lua
-- sliding_log.lua
-- KEYS[1]=key, ARGV[1]=now_ms, ARGV[2]=window_ms, ARGV[3]=limit
redis.call("ZREMRANGEBYSCORE", KEYS[1], 0, ARGV[1] - ARGV[2])  -- bỏ log cũ
local n = redis.call("ZCARD", KEYS[1])                          -- đếm trong cửa sổ
if n < tonumber(ARGV[3]) then
    redis.call("ZADD", KEYS[1], ARGV[1], ARGV[1])               -- ghi timestamp mới
    redis.call("PEXPIRE", KEYS[1], ARGV[2])                     -- dọn rác tự động
    return 1
end
return 0
```
Chính xác tuyệt đối (đúng "trong bất kỳ 60s liền nào tối đa 100"), không burst mép. **Đổi lại tốn bộ nhớ**: lưu mọi timestamp — user gửi 10k req/phút thì set 10k phần tử. Hợp với limit vừa phải.

### 4.3 Token bucket — Lua atomic
Mô hình "xô token": xô chứa tối đa `burst` token, đổ đầy đều `rate` token/giây. Mỗi request tiêu 1 token; hết token thì chặn. Cho phép **burst có kiểm soát** mà vẫn giữ trung bình ổn định — cách các API gateway lớn (Stripe, AWS) hay dùng.

```lua
-- token_bucket.lua
-- KEYS[1]=key (một hash lưu {tokens, ts})
-- ARGV[1]=rate (token/giây), ARGV[2]=burst (dung tích), ARGV[3]=now_ms, ARGV[4]=cost
local data   = redis.call("HMGET", KEYS[1], "tokens", "ts")
local tokens = tonumber(data[1])
local ts     = tonumber(data[2])
local rate   = tonumber(ARGV[1])
local burst  = tonumber(ARGV[2])
local now    = tonumber(ARGV[3])
local cost   = tonumber(ARGV[4])
if tokens == nil then          -- lần đầu: xô đầy
    tokens = burst
    ts = now
end
-- đổ thêm token theo thời gian trôi qua, không vượt dung tích
local delta = math.max(0, now - ts) / 1000.0
tokens = math.min(burst, tokens + delta * rate)
local allowed = 0
if tokens >= cost then
    tokens = tokens - cost
    allowed = 1
end
redis.call("HMSET", KEYS[1], "tokens", tokens, "ts", now)
redis.call("PEXPIRE", KEYS[1], math.ceil(burst / rate * 1000) * 2)
return allowed
```
Toàn bộ "đọc token + tính refill + trừ + ghi lại" phải atomic, nếu không hai request song song cùng đọc `tokens=1` rồi cùng trừ → âm. **Lua giải đúng bài này.**

| Kiểu | Chính xác | Bộ nhớ | Cho burst | Độ phức tạp |
|------|-----------|--------|-----------|-------------|
| Fixed window | Kém (burst mép) | Rất thấp | Không kiểm soát | Thấp |
| Sliding log | Cao nhất | Cao (mỗi req 1 phần tử) | Không | Trung bình |
| Token bucket | Cao | Thấp (2 field) | **Có, kiểm soát** | Trung bình |

---

## 5. Leaderboard — sorted set

Sorted set (zset) là "danh sách luôn được sắp theo score" — Redis giữ nó dạng skip list, nên **chèn, xếp hạng, lấy top-N đều O(log N)**. Đây là công cụ hoàn hảo cho bảng xếp hạng thời gian thực (game, điểm thi, trending).

```bash
# Thêm/cập nhật điểm (ZADD ghi đè score nếu member đã có)
127.0.0.1:6379> ZADD game:score 1500 "an"
(integer) 1
127.0.0.1:6379> ZADD game:score 2300 "binh" 900 "cuong"
(integer) 2

# Top 3 điểm cao nhất, kèm score (REV = giảm dần)
127.0.0.1:6379> ZREVRANGE game:score 0 2 WITHSCORES
1) "binh"
2) "2300"
3) "an"
4) "1500"
5) "cuong"
6) "900"

# Hạng của "an" (0-based, cao->thấp). Trả 1 nghĩa là hạng 2.
127.0.0.1:6379> ZREVRANK game:score "an"
(integer) 1

# Cộng thêm điểm nguyên tử (không cần đọc rồi ghi)
127.0.0.1:6379> ZINCRBY game:score 250 "an"
"1750"

# Tổng số người chơi & số người trong khoảng điểm
127.0.0.1:6379> ZCARD game:score
(integer) 3
127.0.0.1:6379> ZCOUNT game:score 1000 2000
(integer) 1
```

Mẹo thực chiến:
- **Hiển thị "hạng của tôi + 5 người quanh tôi"**: lấy `ZREVRANK` ra hạng `r`, rồi `ZREVRANGE key r-2 r+2 WITHSCORES`.
- **Tie-break bằng thời gian**: điểm bằng nhau muốn ai đạt trước xếp trên → nhét thời gian vào phần thập phân của score, ví dụ `score = điểm*1e13 - epoch_ms` (dùng số âm để người sớm hơn có score cao hơn khi bằng điểm).
- **Leaderboard theo ngày/tuần**: đặt tên key theo kỳ `lb:2026-07-24`, gắn TTL để tự dọn; muốn "tổng tuần" dùng `ZUNIONSTORE` gộp 7 key ngày.

---

## 6. Session store

HTTP không có trạng thái; app chạy nhiều pod sau load balancer. Lưu session trong RAM của một pod thì request lần sau rơi vào pod khác là mất. Giải: để session vào Redis — **bộ nhớ dùng chung** cho mọi pod.

```bash
# Lưu session bằng hash (mỗi field một thuộc tính), kèm TTL trượt
127.0.0.1:6379> HSET sess:9f3a uid 42 role admin csrf x7k2
(integer) 3
127.0.0.1:6379> EXPIRE sess:9f3a 1800        # idle timeout 30 phút

# Mỗi request hợp lệ: đọc + gia hạn TTL (sliding expiration)
127.0.0.1:6379> HGETALL sess:9f3a
127.0.0.1:6379> EXPIRE sess:9f3a 1800        # đẩy hạn về 30 phút nữa

# Đăng xuất = xoá ngay
127.0.0.1:6379> DEL sess:9f3a
```
Vì sao hợp Redis: TTL native lo **hết hạn tự động**, hash cho **cập nhật từng field** không phải serialize lại cả object, và **logout tức thì** (khác JWT stateless không thu hồi được trước hạn). Đây là lý do session store là một trong các use case phổ biến nhất của Redis.

---

## 7. Cache-aside (lazy loading)

Pattern cache dùng nhiều nhất. App làm trung gian: **đọc cache trước, miss thì đọc DB rồi nạp lại cache**.

<svg viewBox="0 0 640 210" role="img" aria-labelledby="ca-t ca-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="ca-t">Luồng cache-aside</title>
<desc id="ca-d">App đọc Redis trước, nếu hit trả ngay, nếu miss thì đọc database rồi SET lại vào Redis kèm TTL</desc>
<rect x="30" y="80" width="90" height="44" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="75" y="106" text-anchor="middle" font-size="12" fill="currentColor">App</text>
<rect x="270" y="20" width="110" height="44" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="325" y="46" text-anchor="middle" font-size="12" fill="currentColor">Redis (cache)</text>
<rect x="270" y="140" width="110" height="44" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="325" y="166" text-anchor="middle" font-size="12" fill="currentColor">Database</text>
<line x1="120" y1="95" x2="265" y2="52" stroke="currentColor" stroke-width="1" marker-end="url(#ca-a)"/>
<text x="180" y="63" text-anchor="middle" font-size="10" fill="currentColor">1. GET</text>
<line x1="265" y1="60" x2="122" y2="100" stroke="currentColor" stroke-width="1" marker-end="url(#ca-a)"/>
<text x="205" y="92" text-anchor="middle" font-size="10" fill="currentColor">hit → trả ngay</text>
<line x1="120" y1="110" x2="265" y2="158" stroke="currentColor" stroke-width="1" marker-end="url(#ca-a)"/>
<text x="175" y="145" text-anchor="middle" font-size="10" fill="currentColor">2. miss → SELECT</text>
<line x1="325" y1="140" x2="325" y2="66" stroke="currentColor" stroke-width="1" marker-end="url(#ca-a)"/>
<text x="410" y="106" text-anchor="middle" font-size="10" fill="currentColor">3. SET key val EX ttl</text>
<defs><marker id="ca-a" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

```python
def get_user(uid):
    key = f"user:{uid}"
    val = r.get(key)
    if val is not None:                       # cache HIT
        return json.loads(val)
    row = db.query("SELECT * FROM users WHERE id=%s", uid)  # MISS -> nguồn sự thật
    r.set(key, json.dumps(row), ex=300)       # nạp lại cache, TTL 5 phút
    return row

def update_user(uid, data):
    db.update("users", uid, data)
    r.delete(f"user:{uid}")   # invalidate: xoá cache, KHÔNG ghi đè cache
```

Ba cạm bẫy phải xử lý:
- **Invalidation**: khi DB đổi, **xoá key** (`DEL`) thay vì ghi cache mới. Ghi cache mới dễ đua với request khác đang nạp giá trị cũ; `DEL` để lần đọc sau nạp lại từ DB là an toàn hơn.
- **Cache stampede** (thundering herd): một key hot hết hạn, hàng nghìn request cùng miss và cùng đập DB. Giảm bằng: một **mutex lock ngắn** (dùng chính SET NX ở mục 3) cho phép **một** request nạp DB, số còn lại chờ hoặc trả giá trị cũ; hoặc **early recompute** (làm mới trước khi hết hạn).
- **Cache penetration**: query key không tồn tại (miss mãi, luôn đập DB). Chống bằng cache cả **giá trị rỗng** với TTL ngắn.

---

## 8. Tóm tắt
- **Lua atomic** vì single-thread chạy trọn script như một lệnh — nền tảng của mọi read-modify-write an toàn trong Redis.
- **Distributed lock** = `SET key <uuid> NX PX ttl`; nhả bằng **Lua compare-and-del**. Thiếu **unique token** → xoá nhầm lock người khác; thiếu **TTL** → deadlock.
- **Redlock** giành majority trên N node; nhưng theo **Kleppmann** không an toàn dưới pause/clock skew và thiếu **fencing token** → chỉ dùng cho lock *efficiency*, việc *correctness* dùng etcd/ZooKeeper + fencing.
- **Rate limiter**: fixed window (`INCR`+`EXPIRE`, rẻ nhưng burst mép), sliding log (chính xác, tốn RAM), **token bucket bằng Lua** (cân bằng, cho burst kiểm soát).
- **Leaderboard**: sorted set — `ZADD`/`ZINCRBY`/`ZREVRANGE`/`ZREVRANK`, top-N và hạng đều O(log N).
- **Session store**: hash + TTL trượt = bộ nhớ dùng chung, logout tức thì.
- **Cache-aside**: đọc cache → miss → DB → nạp lại; nhớ **invalidate bằng DEL**, chống **stampede** (mutex) và **penetration** (cache rỗng).

> **Bài tiếp theo (Bài 7):** persistence & độ bền của Redis — **RDB snapshot vs AOF**, `fork` copy-on-write, và đánh đổi durability khi Redis vừa làm cache vừa làm store.
