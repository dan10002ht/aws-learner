# Bài 5 — Redis replication, Sentinel & Cluster

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **replication master-replica** của Redis: async ra sao, replica đọc được, tại sao có thể **mất dữ liệu** khi master chết.
- Hiểu **Sentinel** làm gì: giám sát, bầu chọn, **tự động failover** và **service discovery** để có **HA** với một dataset.
- Hiểu **Cluster mode**: **16384 hash slot** chia cho nhiều master, **resharding**, redirect **MOVED/ASK**, **smart client**, và ràng buộc **multi-key phải cùng slot** (dùng **hash tag** `{}`).
- Quyết định đúng **khi nào Sentinel, khi nào Cluster** (hay cả hai).
- Cấu hình được replica, Sentinel và một cluster tối thiểu.

---

## 2. Lý thuyết

### 2.1 Ba bài toán khác nhau — đừng gộp làm một

Một node Redis đơn (Bài 1) có hai điểm yếu chí tử: nếu node **chết** thì service đứng (không **HA**), và toàn bộ dataset phải nhét vừa RAM một máy (không **scale ngang**). Ba công cụ trong bài này giải quyết **ba bài toán khác nhau** — nhầm lẫn giữa chúng là lỗi thiết kế phổ biến nhất:

| Bài toán | Công cụ | Nó cho bạn gì |
|----------|---------|---------------|
| Có bản sao dữ liệu, đọc mở rộng | **Replication** | Nhiều bản copy, nhưng **không** tự failover |
| **HA** cho **một** dataset | **Sentinel** | Tự phát hiện master chết → **promote** replica |
| **Scale ghi/RAM** vượt một máy | **Cluster** | **Sharding** dataset ra nhiều master + tự failover |

Analogy: replication giống **photocopy một cuốn sổ cái** ra vài bản; Sentinel là **người trực** canh cuốn gốc, nếu gốc cháy thì hô "bản B từ nay là gốc"; Cluster là **xé cuốn sổ quá dày thành nhiều tập**, mỗi tập một thủ thư giữ (và mỗi tập lại tự có bản photocopy + người trực riêng).

### 2.2 Replication master-replica

Bạn cấu hình một node là **replica** của một **master**. Master nhận **ghi**; replica giữ **bản sao chỉ-đọc** của dataset. Cách đồng bộ:

1. Replica kết nối master, gửi `PSYNC`.
2. Lần đầu (hoặc khi lệch quá xa) → **full resync**: master `BGSAVE` tạo snapshot RDB, gửi sang replica; các lệnh ghi phát sinh trong lúc đó được đệm ở **replication buffer**.
3. Sau đó master **stream liên tục** mọi lệnh ghi tới replica (**partial resync** khi reconnect ngắn nhờ **replication backlog** + `replication offset`).

<svg viewBox="0 0 640 250" role="img" aria-labelledby="rep-t rep-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="rep-t">Replication master-replica bất đồng bộ</title>
<desc id="rep-d">Client ghi vào master, master ACK ngay rồi stream lệnh sang hai replica, replica phục vụ đọc</desc>
<rect x="20" y="95" width="90" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="65" y="112" text-anchor="middle" font-size="12" fill="currentColor">Client</text>
<text x="65" y="128" text-anchor="middle" font-size="11" fill="currentColor">ghi</text>
<line x1="110" y1="115" x2="215" y2="115" stroke="currentColor" stroke-width="1.5" marker-end="url(#ra)"/>
<text x="163" y="107" text-anchor="middle" font-size="10" fill="currentColor">SET</text>
<line x1="215" y1="132" x2="110" y2="132" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#ra)"/>
<text x="163" y="148" text-anchor="middle" font-size="10" fill="currentColor">OK (ngay)</text>
<rect x="220" y="90" width="110" height="50" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="275" y="112" text-anchor="middle" font-size="12" fill="currentColor">MASTER</text>
<text x="275" y="128" text-anchor="middle" font-size="10" fill="currentColor">read + write</text>
<line x1="330" y1="105" x2="470" y2="60" stroke="currentColor" stroke-width="1.5" marker-end="url(#ra)"/>
<line x1="330" y1="125" x2="470" y2="170" stroke="currentColor" stroke-width="1.5" marker-end="url(#ra)"/>
<text x="405" y="70" text-anchor="middle" font-size="10" fill="currentColor">stream async</text>
<rect x="475" y="40" width="130" height="46" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="540" y="60" text-anchor="middle" font-size="12" fill="currentColor">Replica 1</text>
<text x="540" y="76" text-anchor="middle" font-size="10" fill="currentColor">read-only</text>
<rect x="475" y="150" width="130" height="46" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="540" y="170" text-anchor="middle" font-size="12" fill="currentColor">Replica 2</text>
<text x="540" y="186" text-anchor="middle" font-size="10" fill="currentColor">read-only</text>
<text x="315" y="225" text-anchor="middle" font-size="11" fill="currentColor">Master ACK client TRƯỚC khi replica nhận được — cửa sổ mất dữ liệu nếu master chết</text>
<defs><marker id="ra" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Điểm **bản chất phải khắc cốt**: replication của Redis là **bất đồng bộ (async)**. Master trả `OK` cho client **ngay khi ghi vào bộ nhớ của mình**, *rồi mới* đẩy lệnh sang replica. Nếu master chết trong cửa sổ đó, các ghi chưa kịp sao chép **biến mất** — nghĩa là **có thể mất dữ liệu** kể cả khi có replica. Đây là đánh đổi để đạt độ trễ thấp; Redis **không** cho consistency mạnh.

`WAIT numreplicas timeout` giúp *giảm nhẹ*: chặn client tới khi lệnh vừa ghi đã tới `numreplicas` replica. Nhưng nó chỉ là "chờ tốt nhất có thể", không phải commit đồng bộ thực sự, và không chống được split-brain hoàn toàn.

Cấu hình một replica rất đơn giản:

```bash
# Trên node muốn làm replica (redis.conf hoặc runtime)
replicaof 10.0.0.10 6379      # trỏ tới master
replica-read-only yes         # replica chỉ cho đọc (mặc định)

# Trên master: chỉ chấp nhận ghi khi còn đủ replica khỏe (an toàn hơn)
min-replicas-to-write 1       # cần >=1 replica đồng bộ mới cho ghi
min-replicas-max-lag 10       # replica coi là "khỏe" nếu lag <= 10s
```

Đọc từ replica giúp **scale read** (fan-out các câu GET nặng), nhưng phải chấp nhận **stale read**: replica có thể chậm hơn master vài mili giây tới vài giây tùy tải/mạng.

### 2.3 Sentinel — tự động failover cho HA

Replication cho bạn bản sao, nhưng **ai** phát hiện master chết và **ai** ra lệnh promote replica lên làm master mới? Nếu làm tay thì downtime tính bằng phút. **Redis Sentinel** là tiến trình riêng làm 4 việc:

- **Monitoring**: liên tục `PING` master và các replica.
- **Notification**: báo động khi có node hỏng.
- **Automatic failover**: khi master được xác nhận chết → **bầu** một replica, `REPLICAOF NO ONE` để nó thành master, trỏ các replica còn lại về master mới.
- **Service discovery**: client hỏi Sentinel "master hiện tại ở đâu?" và luôn nhận đúng địa chỉ, kể cả sau failover.

Then chốt: bạn chạy **nhiều Sentinel** (khuyến nghị **>= 3**, số lẻ). Một master bị nghi chết trải qua hai mức:

- **SDOWN** (Subjectively Down): *một* Sentinel thấy master không phản hồi quá `down-after-milliseconds`.
- **ODOWN** (Objectively Down): đủ **quorum** Sentinel cùng đồng ý master chết → mới khởi động failover.

<svg viewBox="0 0 640 280" role="img" aria-labelledby="sen-t sen-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="sen-t">Sentinel giám sát và failover</title>
<desc id="sen-d">Ba Sentinel cùng giám sát master và replica, khi master chết đạt quorum thì promote một replica lên master mới</desc>
<rect x="30" y="30" width="80" height="34" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="70" y="51" text-anchor="middle" font-size="11" fill="currentColor">Sentinel 1</text>
<rect x="30" y="123" width="80" height="34" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="70" y="144" text-anchor="middle" font-size="11" fill="currentColor">Sentinel 2</text>
<rect x="30" y="216" width="80" height="34" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="70" y="237" text-anchor="middle" font-size="11" fill="currentColor">Sentinel 3</text>
<text x="70" y="185" text-anchor="middle" font-size="10" fill="currentColor">quorum=2</text>
<rect x="260" y="30" width="120" height="46" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="320" y="50" text-anchor="middle" font-size="12" fill="currentColor">MASTER cũ</text>
<text x="320" y="67" text-anchor="middle" font-size="10" fill="currentColor">ODOWN (chết)</text>
<rect x="260" y="120" width="120" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="140" text-anchor="middle" font-size="12" fill="currentColor">Replica A</text>
<text x="320" y="157" text-anchor="middle" font-size="10" fill="currentColor">→ MASTER mới</text>
<rect x="260" y="210" width="120" height="46" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="230" text-anchor="middle" font-size="12" fill="currentColor">Replica B</text>
<text x="320" y="247" text-anchor="middle" font-size="10" fill="currentColor">trỏ về master mới</text>
<line x1="110" y1="47" x2="255" y2="50" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#sa)"/>
<line x1="110" y1="140" x2="255" y2="140" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#sa)"/>
<line x1="110" y1="233" x2="255" y2="233" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#sa)"/>
<line x1="320" y1="166" x2="320" y2="118" stroke="currentColor" stroke-width="1.5" marker-end="url(#sa)"/>
<text x="410" y="143" font-size="10" fill="currentColor">promote</text>
<rect x="470" y="120" width="140" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="540" y="140" text-anchor="middle" font-size="11" fill="currentColor">Client hỏi Sentinel</text>
<text x="540" y="157" text-anchor="middle" font-size="10" fill="currentColor">"master ở đâu?"</text>
<line x1="470" y1="143" x2="382" y2="143" stroke="currentColor" stroke-width="1.5" marker-end="url(#sa)"/>
<defs><marker id="sa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Vì sao cần số Sentinel lẻ và quorum? Để chống **split-brain** do phân mảnh mạng: chỉ phía **giữ được đa số** Sentinel mới được quyền failover, tránh hai master cùng tồn tại. Lưu ý quorum quyết định *khi nào tuyên bố ODOWN*, còn để *thực hiện* failover cần đa số tuyệt đối Sentinel bầu ra một leader (Raft-lite).

```conf
# sentinel.conf — mỗi Sentinel một file tương tự
port 26379
# theo dõi master tên "mymaster" tại 10.0.0.10:6379, cần quorum=2 Sentinel đồng ý
sentinel monitor mymaster 10.0.0.10 6379 2
sentinel down-after-milliseconds mymaster 5000   # 5s không PING nổi → SDOWN
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1               # mỗi lúc chỉ 1 replica resync master mới
```

Client **không** hardcode IP master; nó hỏi Sentinel. Ví dụ với `redis-py`:

```python
from redis.sentinel import Sentinel

sentinel = Sentinel([("10.0.0.20", 26379), ("10.0.0.21", 26379),
                     ("10.0.0.22", 26379)], socket_timeout=0.5)

# Luôn lấy master hiện tại (tự đổi sau failover, client không cần restart)
master = sentinel.master_for("mymaster", socket_timeout=0.5)
master.set("user:1:name", "An")

# Đọc phân tán trên các replica để scale read
replica = sentinel.slave_for("mymaster", socket_timeout=0.5)
print(replica.get("user:1:name"))
```

**Giới hạn cốt lõi của Sentinel**: nó **không sharding**. Toàn bộ dataset vẫn nằm trên **một** master → HA có, scale-write/scale-RAM thì **không**. Khi dataset hoặc lưu lượng ghi vượt một máy, bạn cần Cluster.

### 2.4 Cluster mode — sharding 16384 hash slot

Cluster **chia** keyspace ra nhiều master, mỗi master giữ một phần. Cơ chế phân mảnh: **16384 hash slot**. Mỗi key được ánh xạ vào một slot bằng:

```
slot = CRC16(key) mod 16384
```

Mỗi master **sở hữu một dải slot**. Ví dụ 3 master: A giữ slot 0–5460, B giữ 5461–10922, C giữ 10923–16383. Muốn tìm key nằm ở đâu → tính slot → biết master nào. Vì sao là slot chứ không hash trực tiếp ra node? Vì **slot là đơn vị di chuyển**: thêm/bớt node chỉ cần **chuyển vài dải slot**, không phải rehash toàn bộ keyspace như hashing thường (đây chính là ý tưởng gần với consistent hashing nhưng rời rạc, dễ quản trị).

<svg viewBox="0 0 640 250" role="img" aria-labelledby="cl-t cl-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="cl-t">Redis Cluster chia 16384 hash slot cho các master</title>
<desc id="cl-d">Key được CRC16 mod 16384 ra slot, mỗi master giữ một dải slot và có replica riêng</desc>
<rect x="20" y="20" width="600" height="34" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="41" text-anchor="middle" font-size="11" fill="currentColor">16384 hash slot: slot = CRC16(key) mod 16384</text>
<rect x="30" y="90" width="170" height="44" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="110" text-anchor="middle" font-size="12" fill="currentColor">Master A</text>
<text x="115" y="126" text-anchor="middle" font-size="10" fill="currentColor">slot 0–5460</text>
<rect x="235" y="90" width="170" height="44" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="110" text-anchor="middle" font-size="12" fill="currentColor">Master B</text>
<text x="320" y="126" text-anchor="middle" font-size="10" fill="currentColor">slot 5461–10922</text>
<rect x="440" y="90" width="170" height="44" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="525" y="110" text-anchor="middle" font-size="12" fill="currentColor">Master C</text>
<text x="525" y="126" text-anchor="middle" font-size="10" fill="currentColor">slot 10923–16383</text>
<rect x="30" y="175" width="170" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="199" text-anchor="middle" font-size="11" fill="currentColor">Replica A'</text>
<rect x="235" y="175" width="170" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="199" text-anchor="middle" font-size="11" fill="currentColor">Replica B'</text>
<rect x="440" y="175" width="170" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="525" y="199" text-anchor="middle" font-size="11" fill="currentColor">Replica C'</text>
<line x1="115" y1="134" x2="115" y2="173" stroke="currentColor" stroke-width="1.2" marker-end="url(#ca)"/>
<line x1="320" y1="134" x2="320" y2="173" stroke="currentColor" stroke-width="1.2" marker-end="url(#ca)"/>
<line x1="525" y1="134" x2="525" y2="173" stroke="currentColor" stroke-width="1.2" marker-end="url(#ca)"/>
<line x1="115" y1="54" x2="115" y2="88" stroke="currentColor" stroke-width="1" marker-end="url(#ca)"/>
<line x1="320" y1="54" x2="320" y2="88" stroke="currentColor" stroke-width="1" marker-end="url(#ca)"/>
<line x1="525" y1="54" x2="525" y2="88" stroke="currentColor" stroke-width="1" marker-end="url(#ca)"/>
<defs><marker id="ca" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Quan trọng: Cluster **đã tích hợp HA**. Mỗi master có **replica riêng**, và các node dùng **gossip protocol** giám sát lẫn nhau — khi một master chết, replica của nó tự promote. Vì thế **Cluster không cần Sentinel** (Sentinel chỉ dành cho kiến trúc non-cluster).

### 2.5 MOVED, ASK và smart client

Client nối vào node bất kỳ và gửi lệnh. Nếu key thuộc slot mà node đó **không** giữ, node trả lỗi redirect chứ không tự proxy:

- **`MOVED <slot> <ip:port>`**: "slot này đã thuộc node kia **cố định**" → client nên đi tới node đó và **cập nhật bản đồ slot** của mình.
- **`ASK <slot> <ip:port>`**: "slot này đang **migrate** dở sang node kia; **chỉ lần này** hỏi node kia" (gửi `ASKING` trước lệnh). Client **không** cache thay đổi vì migration chưa xong.

```
127.0.0.1:7000> GET user:1:name
(error) MOVED 12440 127.0.0.1:7002    # key thuộc slot 12440 ở node 7002
```

Một **smart client** (Lettuce, redis-py cluster, ioredis, go-redis...) sẽ: lúc khởi động gọi `CLUSTER SLOTS` để dựng **bản đồ slot → node**, rồi tính slot cục bộ và gửi lệnh **thẳng** đúng node → không tốn round-trip redirect. `MOVED` chỉ dùng để **học lại** bản đồ khi topology đổi (resharding, failover). Client "ngu" mà mỗi lệnh phải bị redirect thì hiệu năng thảm hại.

**Resharding** = chuyển một số slot từ node này sang node khác (khi thêm node mới, hoặc rebalance). Quá trình chuyển từng slot: node nguồn đánh dấu slot đang `MIGRATING`, node đích `IMPORTING`; key đã chuyển thì trả `ASK`, key chưa chuyển vẫn phục vụ tại nguồn — nhờ vậy resharding chạy **online**, không downtime.

### 2.6 Multi-key phải cùng slot — hash tag `{}`

Đây là **ràng buộc khó chịu nhất** của Cluster và hay bị bỏ sót. Một lệnh đụng **nhiều key** (`MGET`, `MSET`, `SUNION`, transaction `MULTI/EXEC`, script Lua nhiều key...) chỉ chạy được nếu **tất cả key cùng một slot** — vì một lệnh không thể trải qua nhiều node.

```
127.0.0.1:7000> MGET user:1:name user:2:name
(error) CROSSSLOT Keys in request don't hash to the same slot
```

Giải pháp: **hash tag**. Nếu key chứa `{...}`, Redis chỉ băm **phần trong ngoặc** để tính slot. Đặt cùng một tag → cùng slot → cùng node:

```
# Khác slot (hỏng với multi-key):   user:1:name , user:1:cart
# Cùng slot nhờ hash tag {1}:
SET {user:1}:name  "An"
SET {user:1}:cart  "[...]"
MGET {user:1}:name {user:1}:cart      # OK: cả hai băm theo "user:1"
```

Bản chất: bạn **chủ động gom** các key liên quan (cùng một user, cùng một tenant) vào một slot để dùng được lệnh multi-key và transaction. Nhưng đừng lạm dụng một tag cho *quá nhiều* key → tạo **hot slot** lệch tải, mất ý nghĩa sharding.

```bash
# Dựng cluster tối thiểu: 3 master + 3 replica (6 node)
redis-cli --cluster create \
  127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
  127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 \
  --cluster-replicas 1        # mỗi master 1 replica

# Kết nối ở CHẾ ĐỘ cluster (-c để tự follow MOVED/ASK)
redis-cli -c -p 7000
127.0.0.1:7000> SET {user:1}:name "An"
-> Redirected to slot [10778] located at 127.0.0.1:7001
OK

# Xem topology & phân bố slot
redis-cli -p 7000 CLUSTER NODES
redis-cli -p 7000 CLUSTER SLOTS

# Thêm node & rebalance slot (resharding online)
redis-cli --cluster add-node 127.0.0.1:7006 127.0.0.1:7000
redis-cli --cluster rebalance 127.0.0.1:7000
```

Trong `redis.conf` để bật cluster trên mỗi node:

```conf
port 7000
cluster-enabled yes
cluster-config-file nodes-7000.conf   # node tự ghi, đừng sửa tay
cluster-node-timeout 5000             # coi node là fail nếu mất liên lạc 5s
appendonly yes
```

### 2.7 Sentinel hay Cluster? — bảng quyết định

| Tiêu chí | **Sentinel** (non-cluster) | **Cluster** |
|----------|----------------------------|-------------|
| Sharding dữ liệu | **Không** — một dataset một master | **Có** — nhiều master |
| Scale ghi / RAM vượt 1 máy | Không | **Có** |
| HA / auto failover | Có (qua Sentinel) | **Có** (built-in) |
| Multi-key / transaction / Lua | **Thoải mái** (cùng một node) | Chỉ trong **cùng slot** (cần hash tag) |
| Độ phức tạp vận hành | Thấp hơn | Cao hơn |
| Client | Client thường + hỏi Sentinel | **Smart client** hiểu slot |
| Khi nào chọn | Dataset **vừa RAM 1 máy**, chỉ cần HA + scale read | Dataset/ghi **vượt 1 máy** |

Quy tắc ngón tay cái: **mặc định dùng Sentinel** (đơn giản, ít cạm bẫy) chừng nào toàn bộ dataset còn vừa RAM một máy và lưu lượng ghi một node kham nổi. Chỉ lên **Cluster** khi thực sự cần **scale ngang** dung lượng hoặc throughput ghi — và chấp nhận trả giá bằng ràng buộc cùng-slot cùng độ phức tạp vận hành. Đừng chọn Cluster chỉ để "cho oai": nhiều app bị hành vì CROSSSLOT mà lẽ ra chỉ cần một master + replica.

---

## 3. Tóm tắt
- **Replication** master-replica là **async**: master ACK trước, stream sau → **scale read** nhưng **có thể mất dữ liệu** khi master chết; `WAIT`/`min-replicas-to-write` giảm nhẹ chứ không cho consistency mạnh.
- **Sentinel** = giám sát + **auto failover** + **service discovery** cho **HA của một dataset**; chạy **>= 3 Sentinel số lẻ**, cần **quorum** (SDOWN → ODOWN) để chống split-brain. **Không** sharding.
- **Cluster** = sharding **16384 hash slot** cho nhiều master (`slot = CRC16(key) mod 16384`), **HA built-in** (không cần Sentinel), **resharding online**, redirect **MOVED** (cố định) / **ASK** (đang migrate); dùng **smart client** hiểu bản đồ slot.
- Multi-key/transaction/Lua chỉ chạy khi **cùng slot** → dùng **hash tag** `{...}` để gom key liên quan; coi chừng **hot slot**.
- **Sentinel khi dataset vừa 1 máy + cần HA**; **Cluster khi cần scale ghi/RAM vượt 1 máy**.

> **Bài tiếp theo (Bài 6):** các pattern ứng dụng kinh điển trên Redis — **rate limiting**, **distributed lock** (SET NX + TTL, Redlock), **leaderboard** và **cache-aside** đúng cách.
