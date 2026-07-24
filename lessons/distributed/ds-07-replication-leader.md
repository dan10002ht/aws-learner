# Bài 7 — Replication: leader-follower

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **bản chất single-leader replication** (master-slave): ai được ghi, ai chỉ đọc, dòng dữ liệu chảy thế nào.
- Phân biệt **synchronous / asynchronous / semi-synchronous** replication và chọn đúng theo yêu cầu durability vs latency.
- Hiểu **replication lag** và các **read guarantee** (read-your-writes, monotonic reads, consistent prefix) — vì sao user "vừa ghi xong đọc lại thấy mất".
- Biết cách **thêm một follower mới** an toàn bằng snapshot + replay log mà không cần khoá hệ thống.
- Xử lý **failover**: phát hiện leader chết, bầu leader mới, và hai cạm bẫy chết người: **split-brain** và **mất dữ liệu** khi async.
- Nắm ba dạng **replication log**: statement-based, WAL-based (physical), logical (row-based).

---

## 2. Lý thuyết

### 2.1 Vì sao phải replicate?

Giữ **nhiều bản sao (replica)** của cùng một dữ liệu trên nhiều node để đạt ba mục tiêu:
- **High availability**: một node chết, node khác vẫn phục vụ.
- **Đọc mở rộng (read scaling)**: chia tải đọc ra nhiều bản sao.
- **Latency địa lý**: đặt replica gần user để đọc nhanh.

Nếu dữ liệu **không đổi**, replication tầm thường — copy một lần là xong. Cái khó nằm ở **thay đổi**: làm sao mọi bản sao cùng thấy các thay đổi, theo đúng thứ tự, khi mạng và node đều có thể hỏng. **Single-leader** là câu trả lời đơn giản và phổ biến nhất (PostgreSQL, MySQL, MongoDB, Redis, Kafka partition đều dùng biến thể của nó).

### 2.2 Bản chất single-leader

Quy tắc vàng: **mọi ghi (write) đi qua đúng một node — leader**. Các node còn lại là **follower**, chỉ nhận bản sao thay đổi từ leader và **phục vụ đọc**.

Luồng một write:
1. Client gửi write **chỉ tới leader**.
2. Leader ghi vào storage cục bộ của nó, đồng thời ghi thay đổi vào **replication log**.
3. Leader **stream** log đó tới từng follower.
4. Follower **áp dụng (apply)** các thay đổi theo **đúng thứ tự leader ghi**.

Vì sao phải "đúng một leader"? Để có **một thứ tự ghi toàn cục (total order)** cho mọi thay đổi. Đây là mẹo tránh né cái khó "không có clock chung" ở Bài 1: thay vì để nhiều node cãi nhau ai ghi trước, ta chỉ định một node làm trọng tài thứ tự. Đơn giản, nhưng đánh đổi là leader thành **điểm nghẽn ghi** và **điểm chết đơn** (cần failover).

<svg viewBox="0 0 700 260" role="img" aria-labelledby="sl-t sl-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="sl-t">Single-leader replication topology</title>
<desc id="sl-d">Client ghi vào leader, leader stream replication log tới các follower, client đọc từ follower</desc>
<rect x="270" y="20" width="160" height="52" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="42" text-anchor="middle" font-size="14" fill="currentColor">LEADER</text>
<text x="350" y="60" text-anchor="middle" font-size="11" fill="currentColor">nhận mọi WRITE</text>
<rect x="60" y="180" width="150" height="52" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="135" y="202" text-anchor="middle" font-size="13" fill="currentColor">Follower 1</text>
<text x="135" y="220" text-anchor="middle" font-size="11" fill="currentColor">read-only</text>
<rect x="275" y="180" width="150" height="52" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="202" text-anchor="middle" font-size="13" fill="currentColor">Follower 2</text>
<text x="350" y="220" text-anchor="middle" font-size="11" fill="currentColor">read-only</text>
<rect x="490" y="180" width="150" height="52" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="565" y="202" text-anchor="middle" font-size="13" fill="currentColor">Follower 3</text>
<text x="565" y="220" text-anchor="middle" font-size="11" fill="currentColor">read-only</text>
<line x1="350" y1="72" x2="135" y2="180" stroke="currentColor" stroke-width="1.5" marker-end="url(#a7)"/>
<line x1="350" y1="72" x2="350" y2="180" stroke="currentColor" stroke-width="1.5" marker-end="url(#a7)"/>
<line x1="350" y1="72" x2="565" y2="180" stroke="currentColor" stroke-width="1.5" marker-end="url(#a7)"/>
<text x="215" y="120" text-anchor="middle" font-size="11" fill="#8b5cf6">replication log</text>
<text x="470" y="120" text-anchor="middle" font-size="11" fill="#8b5cf6">replication log</text>
<line x1="200" y1="46" x2="270" y2="46" stroke="currentColor" stroke-width="1.5" marker-end="url(#a7)"/>
<text x="150" y="42" text-anchor="middle" font-size="11" fill="#f59e0b">WRITE</text>
<defs><marker id="a7" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.3 Synchronous vs Asynchronous vs Semi-sync

Câu hỏi cốt tử: **leader chờ follower đến mức nào trước khi báo "OK" cho client?** Đây là đánh đổi giữa **durability** (không mất dữ liệu) và **latency + availability**.

| Kiểu | Leader báo OK khi... | Ưu | Nhược |
|------|----------------------|-----|-------|
| **Synchronous** | mọi follower (đồng bộ) đã xác nhận nhận log | Follower chắc chắn có bản mới nhất; failover không mất dữ liệu | Một follower chậm/chết là **chặn toàn bộ write**; latency = node chậm nhất |
| **Asynchronous** | ghi cục bộ xong, **không chờ** follower | Nhanh nhất; leader không phụ thuộc follower | Leader chết trước khi log kịp gửi → **mất write đã báo OK** |
| **Semi-synchronous** | **ít nhất 1** follower xác nhận (còn lại async) | Cân bằng: luôn có 1 bản sao bền vững, không phụ thuộc mọi follower | Vẫn có thể mất dữ liệu nếu cả leader và follower sync cùng chết |

Thực tế **fully synchronous với mọi follower gần như không ai dùng** — chỉ cần một follower kẹt GC hay full disk là cả cụm ngừng ghi. Cấu hình phổ biến là **semi-sync**: đảm bảo dữ liệu nằm trên ≥2 node trước khi ack, nhưng không chờ tất cả.

MySQL semi-sync ví dụ:
```sql
-- Trên leader (source)
INSTALL PLUGIN rpl_semi_sync_source SONAME 'semisync_source.so';
SET GLOBAL rpl_semi_sync_source_enabled = 1;
-- Chờ tối đa 1 giây có ack từ follower, quá thì tự rớt về async để không treo write
SET GLOBAL rpl_semi_sync_source_timeout = 1000;
-- Cần bao nhiêu follower ack trước khi commit trả về client
SET GLOBAL rpl_semi_sync_source_wait_for_replica_count = 1;
```

PostgreSQL dùng `synchronous_commit` + `synchronous_standby_names`:
```ini
# postgresql.conf trên primary
synchronous_commit = on
# Chờ ANY 1 trong 3 standby ack trước khi commit trả về client
synchronous_standby_names = 'ANY 1 (standby1, standby2, standby3)'
```
> `synchronous_commit = off` biến commit thành async cục bộ (nhanh hơn, có thể mất vài giao dịch cuối khi crash); `remote_apply` thì chờ standby **áp dụng xong** chứ không chỉ nhận — mạnh nhất, chậm nhất.

### 2.4 Replication lag và các đảm bảo đọc

Với async (phổ biến nhất), follower luôn **trễ hơn leader một khoảng** — gọi là **replication lag**. Bình thường vài mili-giây, nhưng khi tải cao hoặc mạng nghẽn có thể lên **giây tới phút**. Đây là dạng **eventual consistency**: ngừng ghi đủ lâu thì mọi follower sẽ đuổi kịp — nhưng "đủ lâu" không có bảo đảm về thời gian.

Lag gây ra ba nghịch lý mà user cảm nhận rõ. Mỗi cái có một **read guarantee** để chữa:

**a) Read-your-own-writes** — user vừa ghi, đọc lại phải thấy chính thay đổi của mình.
Ví dụ: bạn sửa comment rồi reload, comment về như cũ vì đọc trúng follower chưa nhận update → tưởng mất. Cách chữa: đọc những gì user **có thể tự sửa** từ **leader** (hoặc follower đã bắt kịp tới timestamp của write đó); phần còn lại đọc follower thoải mái.

**b) Monotonic reads** — đọc nhiều lần không được "lùi về quá khứ".
User đọc lần 1 trúng follower lag thấp (thấy comment mới), reload trúng follower lag cao (comment biến mất) → như du hành ngược thời gian. Cách chữa: **pin mỗi user vào cùng một replica** (ví dụ hash theo user id) để không nhảy qua replica trễ hơn.

**c) Consistent prefix reads** — nếu ghi theo thứ tự A rồi B, không ai được thấy B mà chưa thấy A.
Hay gặp khi partition dữ liệu: câu hỏi và câu trả lời nằm ở partition khác nhau, replicate với tốc độ khác → người xem thấy câu trả lời trước cả câu hỏi. Cách chữa: đảm bảo các write có quan hệ nhân quả nằm cùng một partition/thứ tự.

<svg viewBox="0 0 700 200" role="img" aria-labelledby="lag-t lag-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="lag-t">Replication lag phá vỡ read-your-writes</title>
<desc id="lag-d">User ghi vào leader rồi đọc từ follower chưa kịp cập nhật nên không thấy dữ liệu vừa ghi</desc>
<rect x="20" y="30" width="120" height="44" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="57" text-anchor="middle" font-size="12" fill="currentColor">User</text>
<rect x="290" y="20" width="140" height="44" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="42" text-anchor="middle" font-size="12" fill="currentColor">Leader</text>
<text x="360" y="58" text-anchor="middle" font-size="10" fill="currentColor">x = 42</text>
<rect x="290" y="120" width="140" height="44" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="142" text-anchor="middle" font-size="12" fill="currentColor">Follower (lag)</text>
<text x="360" y="158" text-anchor="middle" font-size="10" fill="currentColor">x = (cũ) null</text>
<line x1="140" y1="42" x2="290" y2="42" stroke="currentColor" stroke-width="1.5" marker-end="url(#a8)"/>
<text x="215" y="34" text-anchor="middle" font-size="11" fill="#f59e0b">1. WRITE x=42</text>
<line x1="140" y1="142" x2="290" y2="142" stroke="currentColor" stroke-width="1.5" marker-end="url(#a8)"/>
<text x="215" y="134" text-anchor="middle" font-size="11" fill="currentColor">2. READ x</text>
<line x1="290" y1="155" x2="150" y2="155" stroke="#f43f5e" stroke-width="1.5" marker-end="url(#a8r)"/>
<text x="215" y="180" text-anchor="middle" font-size="11" fill="#f43f5e">3. trả null (mất!)</text>
<line x1="360" y1="64" x2="360" y2="120" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#a8)"/>
<text x="470" y="95" text-anchor="middle" font-size="10" fill="#8b5cf6">log chưa tới</text>
<defs><marker id="a8" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker>
<marker id="a8r" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#f43f5e"/></marker></defs>
</svg>

### 2.5 Thêm một follower mới

Không thể chỉ copy file dữ liệu của leader vì nó **liên tục thay đổi** trong lúc copy → bản sao sẽ vá víu, không nhất quán. Và không thể khoá cả DB để copy (mất availability). Kỹ thuật chuẩn là **snapshot + log position**:

1. Chụp một **consistent snapshot** của leader tại một thời điểm, gắn với **một vị trí chính xác trong replication log** (PostgreSQL: LSN / log sequence number; MySQL: coordinate binlog file + offset, hoặc GTID).
2. Copy snapshot đó sang follower mới.
3. Follower kết nối leader, **yêu cầu tất cả thay đổi kể từ vị trí log** đã ghi ở bước 1.
4. Follower **replay** phần log đó cho tới khi **bắt kịp (caught up)**, rồi tiếp tục stream các thay đổi mới như một follower bình thường.

Ví dụ dựng PostgreSQL standby:
```bash
# 1+2: chụp snapshot base + ghi lại điểm start LSN, stream sẵn WAL
pg_basebackup -h leader.db -U replicator -D /var/lib/pg/standby \
  -Fp -Xstream -R -P
# -R tự sinh standby.signal + postgresql.auto.conf trỏ primary_conninfo
# 3+4: khởi động, Postgres tự replay WAL từ LSN của backup rồi bắt kịp
pg_ctl -D /var/lib/pg/standby start
```
Kiểm tra lag trên standby:
```sql
SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;
```

### 2.6 Failover: khi leader chết

Failover = **thăng một follower thành leader mới**. Ba bước, mỗi bước một cái bẫy:

**Bước 1 — Phát hiện leader chết.** Thường bằng **timeout/heartbeat**: nếu không thấy leader phản hồi trong N giây thì coi là chết. Nhưng nhớ Bài 1: **timeout không phân biệt được chết thật hay chỉ chậm/nghẽn mạng**. Đặt timeout ngắn → dễ failover nhầm khi leader chỉ tải cao (gây gián đoạn vô ích); đặt dài → thời gian downtime lâu hơn khi chết thật.

**Bước 2 — Bầu leader mới.** Chọn follower **có dữ liệu mới nhất** (log position lớn nhất) để mất ít nhất. Việc chọn cần **consensus** (Raft/ZooKeeper/etcd) để cả cụm đồng ý một leader duy nhất — nếu không sẽ dính split-brain.

**Bước 3 — Cấu hình lại hệ thống.** Client phải gửi write tới leader mới; các follower khác chuyển sang theo leader mới; nếu leader cũ sống lại phải **buộc nó thành follower** (dừng nhận write).

Hai thảm hoạ cần khắc cốt:

- **Split-brain (não chẻ đôi):** cả leader cũ (chưa thực sự chết, chỉ bị cô lập mạng) lẫn leader mới cùng nhận write → dữ liệu phân nhánh, ghi đè lẫn nhau. Chống bằng **fencing / STONITH** ("shoot the other node in the head"): buộc node cũ tắt/bị cách ly trước khi node mới nhận write; và dùng **quorum** để chỉ phía chiếm đa số mới được làm leader.

- **Mất dữ liệu với async:** leader cũ có những write **chưa kịp gửi** sang follower. Khi follower lên làm leader, các write đó bị bỏ. Nếu leader cũ hồi sinh, write "mồ côi" của nó thường bị **discard** — và nếu những write đó đã sinh side-effect bên ngoài (ví dụ auto-increment id đã đưa vào Redis/cache) thì gây **mâu thuẫn dữ liệu chéo hệ thống** rất khó truy vết. Đây là lý do các hệ nghiêm ngặt về durability chọn semi-sync để luôn có ≥1 bản sao bền vững trước khi ack.

<svg viewBox="0 0 700 240" role="img" aria-labelledby="sb-t sb-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="sb-t">Split-brain khi leader cũ bị cô lập chứ chưa chết</title>
<desc id="sb-d">Network partition khiến leader cũ và leader mới cùng nhận write dẫn tới phân nhánh dữ liệu</desc>
<line x1="350" y1="10" x2="350" y2="230" stroke="#f43f5e" stroke-width="2" stroke-dasharray="6 5"/>
<text x="350" y="28" text-anchor="middle" font-size="11" fill="#f43f5e">network partition</text>
<rect x="40" y="70" width="150" height="50" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="90" text-anchor="middle" font-size="12" fill="currentColor">Leader CŨ</text>
<text x="115" y="108" text-anchor="middle" font-size="10" fill="currentColor">bị cô lập, vẫn ghi</text>
<rect x="40" y="160" width="150" height="46" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="187" text-anchor="middle" font-size="11" fill="currentColor">Client A → ghi</text>
<line x1="115" y1="160" x2="115" y2="120" stroke="currentColor" stroke-width="1.5" marker-end="url(#a9)"/>
<rect x="510" y="70" width="150" height="50" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="585" y="90" text-anchor="middle" font-size="12" fill="currentColor">Leader MỚI</text>
<text x="585" y="108" text-anchor="middle" font-size="10" fill="currentColor">được bầu, cũng ghi</text>
<rect x="510" y="160" width="150" height="46" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="585" y="187" text-anchor="middle" font-size="11" fill="currentColor">Client B → ghi</text>
<line x1="585" y1="160" x2="585" y2="120" stroke="currentColor" stroke-width="1.5" marker-end="url(#a9)"/>
<text x="350" y="150" text-anchor="middle" font-size="12" fill="#f43f5e">Hai nhánh dữ liệu</text>
<text x="350" y="168" text-anchor="middle" font-size="12" fill="#f43f5e">xung đột nhau!</text>
<defs><marker id="a9" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.7 Ba dạng replication log

Leader gửi *cái gì* cho follower? Có ba cách, khác nhau về tính đúng đắn và tính linh hoạt:

| Dạng | Gửi gì | Vấn đề / ưu điểm |
|------|--------|------------------|
| **Statement-based** | Gửi nguyên câu lệnh SQL (`UPDATE ... SET ...`) | Gọn, nhưng **không tất định**: `NOW()`, `RAND()`, auto-increment, side-effect... cho kết quả khác trên mỗi node → lệch dữ liệu. Ít dùng làm mặc định. |
| **WAL / physical (log-shipping)** | Gửi các thay đổi ở mức byte/block trên đĩa (write-ahead log) | Rất chính xác, dễ triển khai (PostgreSQL streaming replication). Nhược: **gắn chặt storage engine & version** → khó nâng cấp không downtime, khó replicate sang hệ khác. |
| **Logical / row-based** | Gửi thay đổi ở mức **hàng logic** (row X: các cột này đổi thành...) | Tách khỏi định dạng lưu trữ nội bộ → **nâng cấp version cuốn chiếu**, replicate sang hệ khác, feed CDC (Change Data Capture) cho Kafka/search index. MySQL row-based binlog, Postgres logical replication. |

Ba tiêu chí chọn: (1) **an toàn/tất định** — tránh statement-based cho ghi có hàm không tất định; (2) **cùng version, cùng engine** → WAL nhanh gọn; (3) **cần zero-downtime upgrade hay đẩy dữ liệu ra ngoài (CDC)** → logical.

Bật logical replication trên PostgreSQL:
```sql
-- Trên primary (postgresql.conf: wal_level = logical)
CREATE PUBLICATION my_pub FOR ALL TABLES;
-- Trên node đích / consumer
CREATE SUBSCRIPTION my_sub
  CONNECTION 'host=primary dbname=app user=repl password=...'
  PUBLICATION my_pub;
```
MySQL chọn định dạng binlog:
```sql
SET GLOBAL binlog_format = 'ROW';   -- ROW (an toàn), STATEMENT, hoặc MIXED
```

---

## 3. Ví dụ thực tế & con số

**Kịch bản: cụm 1 leader + 3 follower async cho một app đọc-nhiều.**
- Tải: 5.000 write/s, 50.000 read/s. Async cho phép chia 50.000 read đó ra 3 follower (~16.000/follower) mà leader chỉ gánh write → **scale đọc gần như tuyến tính** theo số follower.
- Bình thường lag ~10 ms. Một đợt batch import 2 triệu dòng vào leader làm follower lag vọt lên **45 giây**: user vừa đổi avatar reload thấy avatar cũ (vi phạm read-your-writes). Fix: route đọc dữ liệu-của-chính-user về leader trong ~1 phút sau khi ghi.
- Leader chết lúc 03:12. Heartbeat timeout 10 s → 03:12:10 orchestrator (Patroni + etcd) bầu follower có LSN lớn nhất lên leader. Vì dùng **async**, 3 giao dịch cuối chưa kịp gửi → **mất 3 write**. Nếu cần zero-loss, phải trả giá bằng semi-sync (`ANY 1`) → mọi commit chậm thêm ~1 round-trip mạng (~1–3 ms trong 1 vùng, hàng chục ms nếu standby ở vùng khác).

Con số cần nhớ: **async = nhanh nhưng có cửa sổ mất dữ liệu bằng đúng replication lag tại thời điểm leader chết**. Muốn thu hẹp cửa sổ đó về 0 phải chuyển ít nhất một bản sao sang synchronous.

---

## 4. Tóm tắt
- **Single-leader**: mọi write qua một leader để có **thứ tự ghi toàn cục**; follower nhận log và phục vụ đọc. Đơn giản, phổ biến, nhưng leader là điểm nghẽn ghi + điểm chết đơn.
- **Sync** không mất dữ liệu nhưng một follower kẹt là chặn write; **async** nhanh nhưng có cửa sổ mất dữ liệu; **semi-sync** (đảm bảo ≥1 follower ack) là điểm cân bằng thực chiến.
- **Replication lag** sinh ra ba nghịch lý; chữa bằng **read-your-writes, monotonic reads, consistent prefix**.
- **Thêm follower** an toàn bằng **snapshot gắn với log position** rồi replay tới khi bắt kịp — không cần khoá hệ thống.
- **Failover** ba bước (phát hiện → bầu → cấu hình lại); hai cạm bẫy chết người là **split-brain** (chống bằng fencing + quorum) và **mất write async** chưa kịp gửi.
- **Replication log** ba dạng: statement (không tất định, tránh), **WAL/physical** (chính xác, gắn engine/version), **logical/row-based** (linh hoạt, hỗ trợ upgrade cuốn chiếu & CDC).

> **Bài tiếp theo (Bài 8):** khi một leader không đủ — **multi-leader & leaderless replication (Dynamo-style)**, và bài toán **conflict resolution** khi nhiều nơi cùng được ghi.
