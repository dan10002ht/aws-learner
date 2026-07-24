# Bài 1 — Redis là gì? In-memory, single-thread & use cases

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **Redis là gì** và vì sao nó nhanh tới mức trở thành "dao đa năng" của backend.
- Hiểu bản chất **in-memory** và mô hình **single-thread event loop** — và vì sao single-thread *không* làm Redis chậm.
- Kể đúng **các use case** Redis giỏi (và các chỗ *không* nên dùng Redis).
- So sánh Redis với **Memcached** và với một database thường.
- Chạy được Redis và thao tác cơ bản bằng `redis-cli`.

---

## 2. Lý thuyết

### 2.1 Redis là gì?

> **Redis** (REmote DIctionary Server) là một **in-memory data store** — lưu dữ liệu trong RAM dưới dạng **key → value**, nhưng value không chỉ là chuỗi mà là các **cấu trúc dữ liệu** giàu (list, set, hash, sorted set...). Nó thường dùng làm **cache**, **message broker nhẹ**, và **database tốc độ cao** cho dữ liệu tạm.

Điểm khác biệt cốt lõi so với một `HashMap` trong code của bạn: Redis là một **server độc lập** mà *nhiều* ứng dụng/instance cùng truy cập qua mạng — nên nó là "bộ nhớ dùng chung" cho cả hệ phân tán. Đây chính là lý do nó xuất hiện ngay sau khi bạn scale ra nhiều server (xem [[ds-01-what-is-distributed]]).

### 2.2 Vì sao Redis nhanh? — In-memory

Redis giữ **toàn bộ dataset trong RAM**. Đọc/ghi RAM nhanh hơn đĩa (kể cả SSD) hàng trăm–nghìn lần:

| Thao tác | Độ trễ điển hình |
|----------|------------------|
| Đọc RAM | ~100 nanosecond |
| Đọc SSD | ~100 microsecond (chậm hơn ~1000×) |
| Đọc HDD | ~10 millisecond (chậm hơn ~100.000×) |

Vì thế một lệnh Redis đơn giản thường trả về trong **micro giây**, và một node có thể phục vụ **hàng trăm nghìn ops/giây**. Đổi lại: RAM đắt và hữu hạn → Redis hợp với dữ liệu *nóng*, *vừa*, *tạm*; không phải nơi chứa hàng terabyte lịch sử.

### 2.3 Mô hình single-thread — nghịch lý "một luồng mà nhanh"

Đây là điều gây bất ngờ nhất: **phần xử lý lệnh của Redis chạy trên MỘT thread duy nhất**. Không mutex, không lock, không context-switch giữa các core cho việc xử lý command.

Nghe có vẻ phản trực giác, nhưng đó lại là **sức mạnh**:
- Mọi lệnh được xử lý **tuần tự**, nên mỗi lệnh đơn là **atomic** tự nhiên — không có race condition giữa hai client.
- Không tốn chi phí khoá/đồng bộ giữa các thread.
- Vì làm việc trong RAM, mỗi lệnh xong cực nhanh → một thread vẫn kịp phục vụ khối lượng khổng lồ.

Redis dùng **I/O multiplexing** (epoll/kqueue) trong một **event loop**: một thread lắng nghe nhiều kết nối, lệnh nào sẵn sàng thì xử lý ngay lệnh đó rồi sang lệnh kế tiếp.

<svg viewBox="0 0 640 250" role="img" aria-labelledby="el-t el-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="el-t">Redis single-thread event loop</title>
<desc id="el-d">Nhiều client gửi lệnh vào một hàng đợi, event loop một thread xử lý tuần tự từng lệnh trong RAM</desc>
<rect x="20" y="40" width="90" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="65" y="62" text-anchor="middle" font-size="12" fill="currentColor">Client A</text>
<rect x="20" y="105" width="90" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="65" y="127" text-anchor="middle" font-size="12" fill="currentColor">Client B</text>
<rect x="20" y="170" width="90" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="65" y="192" text-anchor="middle" font-size="12" fill="currentColor">Client C</text>
<line x1="110" y1="57" x2="235" y2="110" stroke="currentColor" stroke-width="1" marker-end="url(#ae)"/>
<line x1="110" y1="122" x2="235" y2="122" stroke="currentColor" stroke-width="1" marker-end="url(#ae)"/>
<line x1="110" y1="187" x2="235" y2="134" stroke="currentColor" stroke-width="1" marker-end="url(#ae)"/>
<rect x="240" y="95" width="150" height="55" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="315" y="118" text-anchor="middle" font-size="12" fill="currentColor">Event loop</text>
<text x="315" y="137" text-anchor="middle" font-size="11" fill="currentColor">(1 thread, tuần tự)</text>
<line x1="390" y1="122" x2="470" y2="122" stroke="currentColor" stroke-width="1.5" marker-end="url(#ae)"/>
<rect x="475" y="90" width="140" height="65" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="545" y="115" text-anchor="middle" font-size="12" fill="currentColor">Dữ liệu trong RAM</text>
<text x="545" y="134" text-anchor="middle" font-size="11" fill="currentColor">key → value</text>
<text x="315" y="185" text-anchor="middle" font-size="11" fill="currentColor">Mỗi lệnh atomic vì xử lý tuần tự — không cần lock</text>
<defs><marker id="ae" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

> **Hệ quả thực tế phải nhớ:** vì một thread xử lý tuần tự, một lệnh **chậm** (ví dụ `KEYS *` trên hàng triệu key, hay `FLUSHALL` lớn) sẽ **chặn toàn bộ** các client khác. Quy tắc vàng: **tránh lệnh O(N) lớn trên production.** (Redis hiện đại có thêm I/O threads cho phần đọc/ghi network và một số tác vụ nền, nhưng phần *thực thi lệnh* vẫn tuần tự.)

### 2.4 Redis vs Memcached vs Database

| Tiêu chí | Memcached | **Redis** | Database (SQL) |
|----------|-----------|-----------|----------------|
| Kiểu value | Chỉ chuỗi/blob | **Nhiều cấu trúc** (list, set, zset, hash...) | Bảng quan hệ |
| Persistence | Không | **Có** (RDB/AOF) | Có (bền) |
| Replication/HA | Hạn chế | **Có** (replica, Sentinel, Cluster) | Có |
| Pub/Sub, Streams, Lua | Không | **Có** | Không |
| Tốc độ | Rất nhanh | Rất nhanh | Chậm hơn nhiều |
| Vai trò chính | Cache thuần | Cache **+ nhiều hơn** | Nguồn sự thật |

→ Redis mạnh hơn Memcached ở **cấu trúc dữ liệu + persistence + tính năng**; nhưng **không thay thế** database làm nguồn sự thật cho dữ liệu quan trọng, lâu dài.

---

## 3. Use case: Redis giỏi việc gì?

| Use case | Vì sao Redis hợp |
|----------|------------------|
| **Cache** (cache-aside) | Giảm tải DB, đọc micro giây — dùng nhiều nhất |
| **Session store** | Chia sẻ session giữa nhiều app server |
| **Rate limiting** | Đếm & TTL nguyên tử (Bài 6) |
| **Leaderboard / xếp hạng** | Sorted Set trả top-N cực nhanh (Bài 2, 6) |
| **Queue / job nhẹ** | List (LPUSH/BRPOP) hoặc Streams (Bài 4) |
| **Pub/Sub realtime** | Kênh publish/subscribe (Bài 4) |
| **Distributed lock** | SET NX + TTL (Bài 6) |
| **Đếm / analytics gần thời gian thực** | INCR, HyperLogLog, Bitmap (Bài 2) |

**Không nên dùng Redis khi:** dữ liệu lớn hơn RAM & cần lưu vĩnh viễn; cần truy vấn quan hệ phức tạp/join; cần giao dịch ACID nhiều bảng — đó là việc của database.

---

## 4. Thực hành: chạy Redis

```bash
# Chạy nhanh bằng Docker
docker run --name redis -p 6379:6379 -d redis:7

# Vào redis-cli
docker exec -it redis redis-cli

# Thao tác cơ bản
127.0.0.1:6379> SET user:1:name "An"      # lưu key -> value
OK
127.0.0.1:6379> GET user:1:name           # đọc
"An"
127.0.0.1:6379> EXPIRE user:1:name 60     # đặt TTL 60 giây
(integer) 1
127.0.0.1:6379> TTL user:1:name           # còn sống bao lâu
(integer) 57
127.0.0.1:6379> INCR page:views           # tăng bộ đếm (atomic)
(integer) 1
127.0.0.1:6379> INCR page:views
(integer) 2
```

Quy ước đặt key phổ biến: dùng dấu `:` phân cấp không gian tên — `user:1:name`, `cart:42:items` — giúp dễ đọc & nhóm logic (Redis không có "bảng", chỉ có không gian key phẳng).

---

## 5. Tóm tắt
- **Redis** là in-memory data store **key → cấu trúc dữ liệu**, dùng chung qua mạng cho cả hệ phân tán.
- Nhanh nhờ **giữ dữ liệu trong RAM**; xử lý lệnh trên **một thread event loop** → mỗi lệnh **atomic**, không cần lock, nhưng **lệnh O(N) lớn sẽ chặn tất cả**.
- Hơn Memcached ở **cấu trúc dữ liệu + persistence + HA + tính năng** (Pub/Sub, Streams, Lua); nhưng **không thay database** làm nguồn sự thật.
- Use case tiêu biểu: cache, session, rate limit, leaderboard, queue, pub/sub, distributed lock, đếm.

> **Bài tiếp theo (Bài 2):** đi sâu vào thứ khiến Redis mạnh hơn "một cái map" — **các data structure (string, hash, list, set, sorted set, bitmap, HyperLogLog, geo)** và chọn đúng cấu trúc cho từng bài toán.
