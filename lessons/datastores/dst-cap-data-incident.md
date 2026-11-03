# Bài 26 — Capstone: Chẩn đoán một sự cố data-layer thực chiến

## 1. Mục tiêu
Đây là **dự án tổng kết** của cả chương. Không có công nghệ mới — thay vào đó bạn **ghép mọi thứ đã học ở Bài 20–25** (migration, index, replication lag, connection pool, read replica, WAL) để **chẩn đoán một sự cố thật** như một kỹ sư on-call. Sau bài này bạn có thể:
- Đọc một **triệu chứng dây chuyền** và lần ngược về **một nguyên nhân gốc** thay vì chữa từng cái ngọn.
- Dùng đúng công cụ điều tra Postgres realtime: `pg_stat_activity`, `pg_stat_replication`, `pg_locks`, `EXPLAIN`.
- Ra **quyết định khắc phục dưới áp lực** (kill / chờ / failover) và hiểu cái giá của mỗi lựa chọn.
- Làm lại migration **đúng cách** và dựng **guard rail** để nó không tái diễn.
- Viết một **postmortem blameless** đầy đủ: timeline, impact, root cause, action item.

---

## 2. Tình huống: 14:00, một dòng lệnh "vô hại"

Bạn on-call cho hệ e-commerce **ShopX**. Kiến trúc: một Postgres **primary** nhận ghi, hai **read replica** (streaming physical replication) phục vụ toàn bộ traffic đọc trang đơn hàng. Bảng `orders` có **800 triệu dòng**. Một engineer muốn tăng tốc truy vấn lọc theo `status`, và lúc 14:00 chạy thẳng trên primary:

```sql
-- Chạy trên PRIMARY, giờ cao điểm, KHÔNG có CONCURRENTLY
CREATE INDEX idx_orders_status ON orders (status);
```

Một dòng. Trông vô hại. Nhưng nó châm ngòi cho một chuỗi sụp đổ dây chuyền trong 12 phút. Đây là **timeline** của tình huống minh họa (số liệu dùng để luyện chẩn đoán, không phải số đo lab):

<step-flow>
<svg viewBox="0 0 760 655" role="img" aria-labelledby="dstcapfix-path-t dstcapfix-path-d" style="width:100%;max-width:760px;height:auto;display:block;margin:1.25rem auto">
<title id="dstcapfix-path-t">Timeline sự cố trên bốn lifeline cố định</title>
<desc id="dstcapfix-path-d">App và pool, primary orders 800 triệu dòng, hai replica. Các mốc thời gian gắn với thao tác hoặc thông điệp trên lifeline tương ứng; backlog WAL nằm cạnh đường gửi, không bị đường xuyên qua.</desc>
<rect x="15.0" y="15" width="140" height="38" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="85" y="39" font-size="13" text-anchor="middle" fill="currentColor">App / pool</text>
<path d="M85 54 V635" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="4 5"/>
<rect x="275.0" y="15" width="130" height="38" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="340" y="39" font-size="13" text-anchor="middle" fill="currentColor">Primary</text>
<path d="M340 54 V635" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="4 5"/>
<rect x="475.0" y="15" width="120" height="38" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="535" y="39" font-size="13" text-anchor="middle" fill="currentColor">Replica 1</text>
<path d="M535 54 V635" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="4 5"/>
<rect x="630.0" y="15" width="120" height="38" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="690" y="39" font-size="13" text-anchor="middle" fill="currentColor">Replica 2</text>
<path d="M690 54 V635" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="4 5"/>
<g data-step="1">
<rect x="330" y="80" width="20" height="60" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="365" y="91" font-size="13" text-anchor="start" fill="currentColor">14:00 INDEX</text><text x="365" y="112" font-size="13" text-anchor="start" fill="currentColor">orders: 800M</text><text x="365" y="133" font-size="13" text-anchor="start" fill="currentColor">IO 100% · cache evict</text>
</g>
<g data-step="2">
<path d="M85 190 H330" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#dstcapfix-path-arrow)"/><text x="208" y="167" font-size="13" text-anchor="middle" fill="currentColor">14:02: ghi bị chặn</text><path d="M321 178 V202 M328 178 V202" stroke="#f43f5e" stroke-width="3"/>
</g>
<g data-step="3">
<path d="M350 250 H535" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#dstcapfix-path-arrow)"/><path d="M350 310 H690" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#dstcapfix-path-arrow)"/><text x="437" y="233" font-size="13" text-anchor="middle" fill="currentColor">WAL → replica</text><text x="520" y="293" font-size="13" text-anchor="middle" fill="currentColor">WAL → replica</text><rect x="375" y="333" width="16" height="18" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><rect x="397" y="333" width="16" height="18" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><rect x="419" y="333" width="16" height="18" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><rect x="441" y="333" width="16" height="18" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><rect x="463" y="333" width="16" height="18" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><rect x="485" y="333" width="16" height="18" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="510" y="372" font-size="13" text-anchor="middle" fill="currentColor">14:04: replay chậm, lag ~40 giây</text><path d="M535 310 V357" stroke="#f59e0b" stroke-width="1.5"/><text x="439" y="405" font-size="13" text-anchor="middle" fill="currentColor">Backlog WAL (đã nhận/flush)</text>
</g>
<g data-step="4">
<path d="M535 443 H85" fill="none" stroke="#f43f5e" stroke-width="1.5" marker-end="url(#dstcapfix-path-arrow)"/><text x="310" y="431" font-size="13" text-anchor="middle" fill="currentColor">14:06: cancel → app retry</text><path d="M690 485 H85" fill="none" stroke="#f43f5e" stroke-width="1.5" marker-end="url(#dstcapfix-path-arrow)"/><text x="440" y="473" font-size="13" text-anchor="middle" fill="currentColor">Replica 2: cùng rủi ro recovery conflict</text>
</g>
<g data-step="5">
<rect x="20" y="510" width="130" height="67" rx="5" fill="#f43f5e" fill-opacity="0.14" stroke="#f43f5e"/><text x="85" y="530" font-size="13" text-anchor="middle" fill="currentColor">14:08: timeout</text><text x="85" y="550" font-size="13" text-anchor="middle" fill="currentColor">100/100 pool</text><rect x="30" y="558" width="110" height="9" rx="3" fill="#f43f5e" fill-opacity="0.65"/><text x="85" y="598" font-size="13" text-anchor="middle" fill="currentColor">5xx · ~38% lỗi</text>
</g>
<g data-step="6">
<rect x="330" y="535" width="20" height="20" rx="5" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/><text x="365" y="546" font-size="13" text-anchor="start" fill="currentColor">14:12: kill migration</text><text x="365" y="570" font-size="13" text-anchor="start" fill="currentColor">14:14: ghi thông</text><text x="365" y="594" font-size="13" text-anchor="start" fill="currentColor">14:19: replica lag &lt;1s</text>
</g>
<defs><marker id="dstcapfix-path-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 Z" fill="currentColor"/></marker></defs>
</svg>
<step-note data-step="1">Build index thường giữ SHARE lock, quét bảng và tranh disk/cache.</step-note>
<step-note data-step="2">Ghi orders xếp hàng; p99 tăng từ 80ms tới 12s trong tình huống.</step-note>
<step-note data-step="3">WAL đã tới/flush nhanh nhưng replay chậm: backlog tăng, đọc có thể stale. Khoảng 40 giây sau bốn phút là khả thi.</step-note>
<step-note data-step="4">Recovery conflict hủy query đọc; retry thiếu backoff khuếch đại tải.</step-note>
<step-note data-step="5">Connection giữ lâu làm cạn pool, khoảng 38% checkout lỗi, không phải doanh thu bằng 0.</step-note>
<step-note data-step="6">Dừng build nhả lock và giảm nguồn WAL; ghi thông lúc 14:14, replica bắt kịp lúc 14:19.</step-note>
</step-flow>

Điểm cốt lõi để nhớ suốt bài: **một nguyên nhân gốc, năm triệu chứng khác nhau**. Nếu bạn chỉ nhìn "pool cạn" mà tăng `max_connections`, hoặc chỉ nhìn "lag cao" mà thêm replica, bạn **chữa ngọn** và sự cố quay lại ngay lập tức.

---

## 3. Điều tra — lần theo bằng chứng, không đoán

Nguyên tắc on-call: **đọc số liệu trước, hành động sau**. Đi từ dashboard tổng quan xuống truy vấn cụ thể.

### 3.1 Đọc dashboard — bức tranh lớn

Bốn đường đầu tiên phải nhìn, và chúng khớp nhau một cách đáng ngờ:

| Metric | Bình thường | Lúc sự cố | Nói lên điều gì |
|--------|-------------|-----------|-----------------|
| **Disk IOPS / throughput (primary)** | ~30% | **bão hoà 100%** | Có gì đó đang quét cả bảng |
| **Replication lag (replica)** | < 1s | **40 giây và tăng** | Replica không replay kịp WAL |
| **Active connections (app pool)** | ~40/100 | **100/100, hàng đợi dài** | Connection bị giữ, không trả về pool |
| **p99 API latency** | 80ms | **12s → timeout** | Ghi bị chặn + đọc bị cancel |

Bốn đường cùng gãy một lúc → **không phải bốn sự cố**, mà là **một gốc lan ra**. Việc IO bão hoà + lag phình cùng thời điểm chỉ về một thứ đang chạy trên primary.

### 3.2 Trên primary — tìm lock và long-running query

`pg_stat_activity` là camera an ninh của DB: nó cho biết **ai đang chạy gì, bao lâu, và bị chặn bởi ai**.

```sql
-- Query nào chạy lâu nhất, đang giữ/chờ lock gì?
SELECT pid,
       now() - query_start AS duration,
       wait_event_type, wait_event,
       state,
       left(query, 80) AS query
FROM pg_stat_activity
WHERE state <> 'idle'
ORDER BY duration DESC;
```

Kết quả "bắt tận tay":

```
 pid  | duration | wait_event_type | wait_event | state  | query
------+----------+-----------------+------------+--------+---------------------------------
 8123 | 00:08:14 | IO              | DataFileRead | active | CREATE INDEX idx_orders_status ...
 8340 | 00:06:02 | Lock            | relation   | active | UPDATE orders SET status=... WHERE
 8355 | 00:05:58 | Lock            | relation   | active | INSERT INTO orders ...
 ...  (hàng chục dòng UPDATE/INSERT đang chờ Lock)
```

Đọc ra ngay: **PID 8123** (`CREATE INDEX`) chạy 8 phút, đang đọc file (`DataFileRead` — chính là quét 800M dòng). Tất cả `INSERT/UPDATE orders` phía sau đều `wait_event = Lock` → **bị nó chặn ghi**. Xác nhận bằng ai chặn ai:

```sql
-- Ai đang bị block, và bị block BỞI pid nào?
SELECT blocked.pid          AS blocked_pid,
       blocked.query        AS blocked_query,
       blocking.pid         AS blocking_pid,
       blocking.query       AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocking
  ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
WHERE cardinality(pg_blocking_pids(blocked.pid)) > 0;
```

→ Mọi `blocking_pid` đều là **8123**. Thủ phạm đã lộ diện. (Nhắc lại Bài 20: `CREATE INDEX` thường chiếm **SHARE lock** — không chặn đọc nhưng **chặn ghi**.)

### 3.3 Trên replica — vì sao lag phình

```sql
-- Chạy trên PRIMARY: xem từng replica đang tụt bao nhiêu
SELECT client_addr,
       state,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS replay_lag_bytes,
       write_lag, flush_lag, replay_lag
FROM pg_stat_replication;
```

```
 client_addr | state     | replay_lag_bytes | write_lag | flush_lag | replay_lag
-------------+-----------+------------------+-----------+-----------+-------------
 10.0.1.21   | streaming |      8_900_000_000 | 00:00:00.1| 00:00:00.2| 00:00:41.12
 10.0.1.22   | streaming |      8_700_000_000 | 00:00:00.1| 00:00:00.2| 00:00:40.05
```

Cực kỳ quan trọng — đọc kỹ ba cột lag: `write_lag` và `flush_lag` **rất nhỏ** (mạng và ghi WAL bình thường), nhưng `replay_lag` = **41 giây**. Nghĩa là WAL **đã tới replica và đã ghi xuống đĩa**, chỉ là **replay không kịp**. Đây là chữ ký kinh điển của **single-threaded WAL replay** (Bài 22): replica replay tuần tự một luồng, còn primary sinh WAL từ việc build index nhanh gấp nhiều lần tốc độ replay → khoảng cách phình theo thời gian.

Và trên replica, log đầy dòng này:

```
ERROR: canceling statement due to conflict with recovery
DETAIL: User query might have needed to see row versions that must be removed.
```

Đây là gotcha Postgres của Bài 22: khi WAL replay cần dọn row mà một query đọc đang cần, standby **huỷ query đọc** (giới hạn bởi `max_standby_streaming_delay`). App nhận lỗi → **retry** → mỗi retry mở connection mới, giữ lâu hơn.

### 3.4 Nối chuỗi tới pool exhaustion

Bức tranh khép kín. Đọc bị chậm (replica bận replay) + đọc bị cancel + ghi bị chặn → **mỗi request giữ connection lâu hơn bình thường hàng chục lần**. Pool có 100 slot, request đến với tốc độ cũ nhưng **thời gian giữ tăng 50 lần** → theo định luật Little (`concurrency = arrival_rate × hold_time`), pool cạn gần như tức thì. Request mới không mượn được connection → **timeout → 5xx hàng loạt**. Đây chính là Bài 24 (connection pool) gặp lại: pool không "hỏng", nó chỉ **phản ánh** việc downstream chậm đi.

<svg viewBox="0 0 700 250" role="img" aria-labelledby="cz-t cz-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="cz-t">Chuỗi nhân quả từ một index tới pool exhaustion</title>
<desc id="cz-d">CREATE INDEX gây SHARE lock chặn ghi và WAL flood, WAL flood gây replay lag và query cancel, cả hai làm connection giữ lâu dẫn tới pool cạn và app timeout</desc>
<rect x="20" y="100" width="130" height="52" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="85" y="122" text-anchor="middle" font-size="11" fill="currentColor">CREATE INDEX</text>
<text x="85" y="138" text-anchor="middle" font-size="10" fill="currentColor">(no CONCURRENTLY)</text>
<rect x="185" y="30" width="140" height="52" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="255" y="52" text-anchor="middle" font-size="11" fill="currentColor">SHARE lock</text>
<text x="255" y="68" text-anchor="middle" font-size="10" fill="currentColor">chặn ghi → p99 ↑</text>
<rect x="185" y="168" width="140" height="52" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="255" y="190" text-anchor="middle" font-size="11" fill="currentColor">WAL flood</text>
<text x="255" y="206" text-anchor="middle" font-size="10" fill="currentColor">replay lag + cancel</text>
<rect x="360" y="100" width="150" height="52" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="435" y="122" text-anchor="middle" font-size="11" fill="currentColor">connection giữ lâu</text>
<text x="435" y="138" text-anchor="middle" font-size="10" fill="currentColor">hold_time × 50</text>
<rect x="545" y="100" width="135" height="52" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="612" y="122" text-anchor="middle" font-size="11" fill="currentColor">pool CẠN</text>
<text x="612" y="138" text-anchor="middle" font-size="10" fill="currentColor">app timeout 5xx</text>
<line x1="150" y1="118" x2="183" y2="70" stroke="currentColor" stroke-width="1.5" marker-end="url(#cx)"/>
<line x1="150" y1="134" x2="183" y2="188" stroke="currentColor" stroke-width="1.5" marker-end="url(#cx)"/>
<line x1="325" y1="60" x2="360" y2="112" stroke="currentColor" stroke-width="1.5" marker-end="url(#cx)"/>
<line x1="325" y1="190" x2="360" y2="140" stroke="currentColor" stroke-width="1.5" marker-end="url(#cx)"/>
<line x1="510" y1="126" x2="543" y2="126" stroke="currentColor" stroke-width="1.5" marker-end="url(#cx)"/>
<defs><marker id="cx" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

---

## 4. Root cause — một câu, đủ sâu

> **Root cause:** `CREATE INDEX` (không `CONCURRENTLY`) trên `orders` (800M dòng) chạy giờ cao điểm đã (1) chiếm **SHARE lock chặn ghi**, (2) **quét cả bảng** làm bão hoà disk IO và evict buffer cache, (3) sinh **WAL ồ ạt** mà replica **replay đơn luồng** không kịp → lag khoảng 40 giây + **cancel query đọc**. Việc đọc/ghi đều chậm/lỗi khiến **connection bị giữ rất lâu**, làm **pool cạn** và app timeout hàng loạt. Bốn triệu chứng, một gốc.

Phân biệt rạch ròi để không nhầm khi viết postmortem:
- **Trigger** (mồi lửa): lệnh `CREATE INDEX` không `CONCURRENTLY`.
- **Root cause** (gốc): thiếu **guard rail migration** — không có `lock_timeout`, không review, không giới hạn giờ chạy.
- **Contributing factors** (yếu tố khuếch đại): replay đơn luồng, pool không có statement timeout, app retry không backoff.

---

## 5. Khắc phục ngay — mitigate dưới áp lực

Mục tiêu số một khi đang cháy: **dừng nguồn gây hại**, phục hồi service, *rồi mới* làm lại cho đúng. Ba lựa chọn, theo thứ tự ưu tiên:

**A. Kill migration (đúng và đủ trong đa số ca).**
```sql
-- Huỷ nhẹ trước (cancel query), giữ nguyên connection
SELECT pg_cancel_backend(8123);
-- Nếu không dừng, mới terminate hẳn
SELECT pg_terminate_backend(8123);
```
Ngay khi 8123 chết: SHARE lock nhả → hàng đợi INSERT/UPDATE thoát, ghi thông trở lại, WAL ngừng phình. Đây là hành động **có tác động lớn nhất, rủi ro thấp nhất** — build index thường bị rollback, không mặc nhiên để lại `INVALID`. Build `CONCURRENTLY` thất bại mới có thể để lại index invalid cần kiểm tra/dọn. **Làm cái này trước tiên.**

**B. Để replica bắt kịp.** Sau khi kill, primary ngừng sinh WAL nặng, replay đơn luồng dần đuổi kịp; lag tụt về 0 sau vài phút. Giám sát `replay_lag` cho tới khi < 1s **trước khi** tuyên bố hết sự cố — nếu tuyên bố sớm, user vẫn còn thấy stale read.

**C. Failover (chỉ khi primary hỏng thật).** Trong ca này primary vẫn sống nên **không cần failover** — failover một primary đang khoẻ chỉ đổi một sự cố lấy một sự cố khác (mất kết nối, cache lạnh, phải reconfigure). Chỉ failover khi primary thực sự down hoặc corrupt. **Đừng phản xạ failover chỉ vì hoảng.**

Song song, giảm áp cho app: hạ retry (tránh retry storm khuếch đại), tạm route đọc về primary nếu replica còn stale, và **hạ lag cấp cứu** nếu buộc phải nới:
```sql
-- Trên replica: HẠ delay (mặc định 30s) để ưu tiên replay hơn giữ query đọc
-- → replay không bị query đọc chặn, lag tụt nhanh (đánh đổi: query đọc dễ bị cancel hơn)
ALTER SYSTEM SET max_standby_streaming_delay = '2s';
SELECT pg_reload_conf();
```

---

## 6. Làm lại ĐÚNG — cùng mục tiêu, không sự cố

Vẫn cần index đó. Nhưng lần này theo playbook Bài 20:

```sql
-- 1) Chặn "đứng hình cả bảng" nếu có transaction dài đang giữ lock
SET lock_timeout = '3s';

-- 2) Build KHÔNG chặn ghi (quét bảng 2 lần, chậm hơn nhưng an toàn)
CREATE INDEX CONCURRENTLY idx_orders_status ON orders (status);

-- Không chạy DROP sau build thành công. Chỉ nếu build fail, kiểm tra indisvalid
-- trong pg_index; nếu index INVALID mới chạy riêng lệnh dọn và thử lại:
-- DROP INDEX CONCURRENTLY IF EXISTS idx_orders_status;
```

Với bảng cực lớn hoặc thao tác nặng hơn (đổi kiểu, thêm cột có rewrite, backfill dữ liệu), hãy **chia batch nhỏ và tự throttle theo replication lag** thay vì tin vào một lệnh DDL duy nhất. Lưu ý: `gh-ost`/`pt-online-schema-change` là công cụ của **MySQL** — với **Postgres** dùng `CREATE INDEX CONCURRENTLY` cho index, còn rewrite nặng thì dùng `pg_repack` hoặc `pgroll`/`pg-osc` (online schema change kiểu expand–contract):

```bash
# Backfill/rewrite theo batch, mỗi vòng kiểm tra replica lag rồi mới chạy tiếp.
# Ý tưởng giống --max-lag của gh-ost, nhưng viết tay cho Postgres.
while : ; do
  # 1) làm 1 batch nhỏ (vd cập nhật 1000 dòng) — không sinh WAL sốc
  rows=$(psql -h primary.db -d shop -tAc \
    "WITH b AS (SELECT id FROM orders WHERE need_backfill LIMIT 1000 FOR UPDATE SKIP LOCKED)
     UPDATE orders o SET need_backfill=false FROM b WHERE o.id=b.id RETURNING 1" | wc -l)
  [ "$rows" -eq 0 ] && break   # hết dòng → xong

  # 2) đo replay_lag của replica tụt nhất; > 1.5s thì nghỉ cho nó đuổi kịp
  lag=$(psql -h primary.db -d shop -tAc \
    "SELECT COALESCE(max(EXTRACT(epoch FROM replay_lag)),0) FROM pg_stat_replication")
  awk "BEGIN{exit !($lag > 1.5)}" && sleep 5
done
```

Và quy tắc con người, không phải kỹ thuật: chạy **giờ thấp điểm**, thông báo trước, có người ngồi canh dashboard với **nút dừng** trong tay.

---

## 7. Postmortem (blameless)

Sự cố chỉ có giá trị nếu biến thành phòng ngừa. Mẫu postmortem ShopX dùng — **trách hệ thống, không trách người**:

**Tiêu đề:** Gián đoạn đặt hàng 12 phút do CREATE INDEX chặn ghi trên `orders`

**Impact:** 14:02–14:14, p99 API 80ms → 12s; ~38% request checkout lỗi 5xx; ~4.100 đơn không đặt được; read replica trả stale read khoảng 40 giây (hai mẫu replay_lag khoảng 40–41 giây) khiến user thấy đơn "biến mất".

**Timeline (giờ thực):**
| Thời điểm | Sự kiện |
|-----------|---------|
| 14:00 | `CREATE INDEX` (no CONCURRENTLY) chạy trên primary |
| 14:02 | Alert p99 API; ghi `orders` bị chặn |
| 14:04 | Replication lag alert: 40 giây |
| 14:06 | Query đọc trên replica bị cancel; app retry tăng |
| 14:08 | Connection pool cạn; 5xx hàng loạt |
| 14:10 | On-call xác định PID qua `pg_stat_activity` |
| 14:12 | `pg_terminate_backend(8123)` — kill migration |
| 14:14 | Ghi thông; 14:19 replica lag < 1s; đóng sự cố |

**Root cause:** như mục 4 — thiếu guard rail migration, không `lock_timeout`, chạy giờ cao điểm; khuếch đại bởi replay đơn luồng, thiếu statement timeout ở pool, retry không backoff.

**Cái làm tốt:** alert lag và p99 bắn đúng; on-call dùng `pg_stat_activity` khoanh vùng nhanh; kill thay vì failover — quyết định đúng.

**Action items (có chủ + hạn):**
| Hành động | Loại | Chủ |
|-----------|------|-----|
| Cấm `CREATE INDEX`/`ALTER` trực tiếp trên prod; bắt buộc qua `CONCURRENTLY`/`pg_repack`/pipeline batch có throttle | Ngăn tái diễn | DBA |
| Migration tool tự set `lock_timeout` + `statement_timeout` + chạy giờ thấp điểm | Ngăn tái diễn | Platform |
| CI lint chặn DDL không CONCURRENTLY trên bảng > 10M dòng | Guard rail | Platform |
| Alert `replay_lag > 60s` (đang chỉ có > 5 phút — quá muộn) | Phát hiện sớm | SRE |
| Pool: `statement_timeout` + circuit breaker + retry có backoff | Giảm bán kính | Backend |

---

## 8. Phòng ngừa — biến bài học thành guard rail

Cấu hình để "sự cố này không thể xảy ra lần nữa", không phụ thuộc kỷ luật con người:

```sql
-- Guard rail cấp DB: mọi session migration phải bounded
SET lock_timeout      = '3s';    -- không đứng hình cả bảng chờ lock
SET statement_timeout = '0';     -- (migration cần chạy lâu — set ở app, không ở DDL)

-- Guard rail cấp app pool (Bài 24): request không được ôm connection vô hạn
-- statement_timeout = '5s'  → query treo bị cắt, connection trả lại pool sớm
```

Ba tầng phòng thủ, khớp đúng ba tầng đã vỡ trong sự cố:
- **Ngăn ở nguồn:** CI lint + review chặn DDL nguy hiểm; công cụ migration tự throttle theo lag; chạy giờ thấp điểm.
- **Phát hiện sớm:** alert `replay_lag`, disk IO, active connections — bắn ở ngưỡng *phút đầu tiên*, không phải khi đã sập.
- **Giảm bán kính:** `lock_timeout` + `statement_timeout` + circuit breaker + retry-with-backoff để một điểm chậm không kéo sập toàn hệ.

---

## 9. Tóm tắt
- Một sự cố data-layer thường là **một gốc, nhiều triệu chứng**. Chữa ngọn (tăng `max_connections`, thêm replica) chỉ giấu bệnh — phải lần về gốc.
- Bộ công cụ điều tra: **dashboard** (IO/lag/connections) → `pg_stat_activity` (lock + long query) → `pg_stat_replication` (đọc `replay_lag` tách khỏi `write/flush_lag`) → `EXPLAIN`.
- Chuỗi nhân quả ở đây: `CREATE INDEX` chặn ghi + WAL flood → replay đơn luồng lag + cancel query → **connection giữ lâu → pool cạn → timeout**. Ghép trọn Bài 20–25.
- Khắc phục ngay: **kill migration trước** (tác động lớn, rủi ro thấp), để replica đuổi kịp, **đừng phản xạ failover** khi primary còn khoẻ.
- Làm lại đúng: `CONCURRENTLY`/gh-ost + `lock_timeout` + throttle theo lag + giờ thấp điểm.
- **Postmortem blameless** + **guard rail bằng cấu hình** (CI lint, alert lag sớm, statement timeout) là thứ thật sự chấm dứt sự cố — không phải lời hứa "lần sau cẩn thận hơn".

> Đây là bài cuối chương Data & Caching Systems. Bạn giờ có thể đi từ một triệu chứng lạ trên dashboard tới root cause và action item như một kỹ sư on-call thực thụ.
