# Bài 20 — Migrations & Online Schema Change ở quy mô lớn

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **vì sao một migration/DDL lại làm IO của DB căng thẳng** — cơ chế thật, không chung chung.
- Đọc đúng **bậc khoá (lock level)** mà mỗi lệnh DDL chiếm, và vì sao có lệnh "nhanh" vẫn gây downtime.
- Giải thích **DDL lan tới replica thế nào** (physical vs logical) và vì sao nó gây **replication lag** — trả lời trực tiếp câu "master migrate thì slave có bị không".
- Dùng **CREATE INDEX CONCURRENTLY**, online DDL, và hiểu **gh-ost / pt-online-schema-change** hoạt động ra sao.
- Viết được **playbook zero-downtime** cho migration trên bảng hàng trăm triệu dòng.

---

## 2. Vì sao migration làm IO căng?

Một `ALTER TABLE` hay `CREATE INDEX` nhìn thì một dòng, nhưng bên dưới nó đụng vào **ba nguồn tài nguyên khan hiếm** cùng lúc: **disk IOPS**, **buffer cache**, và **WAL/redo log**.

| Việc migration làm | Hệ quả IO |
|--------------------|-----------|
| **Quét cả bảng** (build index, rewrite) | Đọc hàng trăm GB từ đĩa → tốn IOPS/throughput |
| **Đẩy dữ liệu nóng ra khỏi buffer cache** | Cache hit ratio tụt → query bình thường *cũng* phải đọc đĩa → latency spike lan sang mọi truy vấn khác |
| **Ghi index/bảng mới + WAL** | Ghi gấp đôi–ba: dữ liệu + WAL (+ ship WAL cho replica) |
| **Sort dữ liệu để build index** | Tốn `maintenance_work_mem`, tràn thì sort trên đĩa (temp files) |

Điểm mấu chốt ít người để ý: **migration không chỉ làm chậm chính nó, mà làm chậm TẤT CẢ** — vì nó chiếm mất cache và IOPS mà các query online đang cần. Một `CREATE INDEX` trên bảng 500M dòng có thể đẩy p99 của toàn hệ lên gấp nhiều lần dù nó "không khoá ghi".

### 2.1 Lock level — thứ quyết định có downtime hay không

Ở Postgres, mỗi DDL chiếm một mức khoá. Nguy hiểm nhất là **ACCESS EXCLUSIVE** — chặn cả đọc lẫn ghi:

| Lệnh | Lock | Chặn gì |
|------|------|---------|
| `ALTER TABLE ... ADD COLUMN` (không default, PG11+) | ACCESS EXCLUSIVE **nhưng nhanh** (metadata) | Chặn ngắn — vẫn phải chờ lấy được lock |
| `ALTER TABLE ... ADD COLUMN ... DEFAULT <hằng>` (PG11+) | Nhanh (metadata) | OK |
| `ALTER TABLE ... ADD COLUMN ... DEFAULT <volatile>` / `ALTER TYPE` | ACCESS EXCLUSIVE + **rewrite cả bảng** | Chặn đọc+ghi rất lâu ✗ |
| `CREATE INDEX` (thường) | SHARE — **chặn ghi** | App không INSERT/UPDATE được ✗ |
| `CREATE INDEX CONCURRENTLY` | Không chặn ghi | An toàn ✓  (nhưng chậm hơn, quét bảng 2 lần) |

> **Bẫy nguy hiểm nhất:** một `ALTER TABLE` "nhanh" vẫn phải **giành được ACCESS EXCLUSIVE lock**. Nếu có một transaction dài đang giữ lock trên bảng, lệnh ALTER của bạn **xếp hàng chờ** — và trong lúc chờ, nó **chặn luôn mọi query mới** phía sau nó. Bảng đang chạy ngon bỗng "đứng hình" chỉ vì một ALTER tưởng vô hại. → Luôn đặt `lock_timeout` ngắn (vd `SET lock_timeout = '2s'`) rồi retry, đừng để ALTER chờ vô hạn.

---

## 3. Migration lan tới replica thế nào? (câu hỏi cốt lõi)

**Tùy cơ chế — physical tự replay schema, MySQL binlog thường truyền DDL; PG logical không tự truyền DDL và chỉ cần schema tương thích.** Nhưng *cách* lan tới và *hậu quả* khác nhau tuỳ loại replication, và đây chính là chỗ gây đau:

<svg viewBox="0 0 660 260" role="img" aria-labelledby="rl-t rl-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="rl-t">Migration trên master gây replication lag trên replica</title>
<desc id="rl-d">Master chạy DDL nặng, đẩy WAL lớn sang replica, replica replay đơn luồng nên bị tụt lại và ảnh hưởng query đọc</desc>
<rect x="30" y="30" width="180" height="70" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="55" text-anchor="middle" font-size="13" fill="currentColor">Master</text>
<text x="120" y="75" text-anchor="middle" font-size="11" fill="currentColor">CREATE INDEX / backfill</text>
<text x="120" y="91" text-anchor="middle" font-size="11" fill="currentColor">(IO nặng)</text>
<line x1="210" y1="65" x2="440" y2="65" stroke="currentColor" stroke-width="2" marker-end="url(#al)"/>
<text x="325" y="52" text-anchor="middle" font-size="11" fill="#f59e0b">WAL/binlog lớn ồ ạt</text>
<rect x="445" y="30" width="185" height="70" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="537" y="55" text-anchor="middle" font-size="13" fill="currentColor">Replica</text>
<text x="537" y="75" text-anchor="middle" font-size="11" fill="currentColor">replay ĐƠN LUỒNG</text>
<text x="537" y="91" text-anchor="middle" font-size="11" fill="currentColor">→ không theo kịp</text>
<rect x="445" y="130" width="185" height="55" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="537" y="153" text-anchor="middle" font-size="12" fill="currentColor">Hậu quả trên replica:</text>
<text x="537" y="171" text-anchor="middle" font-size="10" fill="currentColor">lag ↑, stale read, query bị cancel</text>
<line x1="537" y1="100" x2="537" y2="130" stroke="currentColor" stroke-width="1" marker-end="url(#al)"/>
<rect x="30" y="210" width="600" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.10" stroke="currentColor"/>
<text x="330" y="231" text-anchor="middle" font-size="11" fill="currentColor">Read replica đang phục vụ traffic → user thấy dữ liệu cũ hoặc lỗi trong suốt lúc migrate</text>
<defs><marker id="al" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Physical replication (Postgres streaming — WAL block-level):**
- DDL được ghi vào WAL; replica **replay lại y hệt** ở tầng block. Việc build index nặng chạy ở master, nhưng WAL của các block index mới bị ship sang và replay ở replica.
- Replay WAL trên standby là **một luồng tuần tự** → DDL/backfill lớn làm **lag tăng vọt**.
- Gotcha đặc trưng Postgres: khi replay một thao tác cần ACCESS EXCLUSIVE, nó **đụng với query đọc đang chạy trên replica** → hoặc hoãn replay (lag tăng), hoặc **huỷ query** (`ERROR: canceling statement due to conflict with recovery`, điều chỉnh bằng `max_standby_streaming_delay`).

**Logical replication — phải tách MySQL binlog và PG logical:**
- Với **MySQL**, DDL đi vào binlog dạng **statement**,  replica **chạy LẠI câu `ALTER` đó** một lần nữa trên chính nó. Trên replication đơn luồng, việc này **chặn luồng apply** → slave lag nặng suốt thời gian ALTER chạy (có thể hàng giờ với bảng lớn).
- Với **PG logical**, schema/DDL **không được replicate**; phải triển khai schema tương thích trên subscriber (thường thêm cột trước), nếu không apply có thể lỗi.
- Đây chính là lý do **gh-ost / pt-online-schema-change** của MySQL tồn tại: chúng migrate theo cách kiểm soát được lag của replica.

> **Chốt cho câu ba hỏi:** master migrate → physical/MySQL replica thường **cũng đổi schema**, còn PG logical cần đồng bộ schema riêng, nhưng nó không "miễn phí": slave phải replay/chạy lại chính công việc nặng đó, nên **replication lag phình ra**, read replica trả dữ liệu cũ và (với Postgres) có thể **huỷ query đọc**. Vì thế migration lớn phải **throttle theo lag** và làm giờ thấp điểm.

---

## 4. Công cụ: làm migration mà không khoá

### 4.1 `CREATE INDEX CONCURRENTLY` (Postgres)
Quét bảng 2 lần, không chặn ghi. Đổi lại: chậm hơn, **không chạy trong transaction**, và nếu fail để lại index `INVALID` phải `DROP` rồi làm lại.

```sql
-- KHÔNG chặn INSERT/UPDATE trong lúc build
CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders (user_id);

-- Chỉ nếu build thất bại và đã xác nhận index INVALID mới dọn rồi thử lại:
-- DROP INDEX CONCURRENTLY IF EXISTS idx_orders_user_id;
```

### 4.2 Online DDL (MySQL 8)
MySQL phân loại thao tác thành `INSTANT` (chỉ metadata, tức thì), `INPLACE` (không rewrite, cho phép ghi song song), `COPY` (rewrite, khoá ghi):
```sql
ALTER TABLE orders ADD COLUMN status TINYINT, ALGORITHM=INSTANT;
ALTER TABLE orders ADD INDEX idx_status (status), ALGORITHM=INPLACE, LOCK=NONE;
```

### 4.3 gh-ost / pt-online-schema-change — migrate bảng khổng lồ không downtime
Ý tưởng chung: **không sửa trực tiếp bảng gốc**, mà:

1. Tạo một **bảng bóng** (`_orders_new`) với schema mới.
2. **Copy dữ liệu theo batch** từ bảng gốc sang bảng bóng.
3. Bắt **mọi thay đổi mới** trên bảng gốc (pt-osc dùng **trigger**; gh-ost đọc **binlog**) và áp vào bảng bóng → hai bảng đồng bộ dần.
4. Khi bắt kịp, **đổi tên nguyên tử** (`RENAME orders → _orders_old, _orders_new → orders`) — chỉ khoá một khoảnh khắc rất ngắn.

Điểm ăn tiền: cả hai công cụ **tự throttle theo replication lag** — thấy replica tụt là chậm lại. gh-ost còn đọc binlog (không cần trigger, nhẹ hơn cho master) và có thể chạy migration **từ một replica**.

```bash
gh-ost \
  --host=master.db --database=shop --table=orders \
  --alter="ADD COLUMN status TINYINT NOT NULL DEFAULT 0" \
  --max-lag-millis=1500 \    # replica lag vượt 1.5s → tự dừng copy
  --chunk-size=1000 \        # copy 1000 dòng mỗi batch
  --execute
```

---

## 5. Pattern expand–migrate–contract (đổi cột an toàn)

Không bao giờ "đổi tại chỗ" một cột đang được code dùng. Tách thành các bước độc lập, **expand/migrate giữ tương thích ngược**. Contract chỉ chạy sau khi mọi reader/writer đã chuyển và hết cửa sổ rollback; drop cột cũ mất dữ liệu, không thể rollback bằng cách chỉ deploy lại code:

<step-flow>
<svg viewBox="0 0 650 375" role="img" aria-labelledby="dst19fix-schema-t dst19fix-schema-d" style="width:100%;max-width:650px;height:auto;display:block;margin:1.25rem auto">
<title id="dst19fix-schema-t">Dữ liệu và đường truy cập khi expand–contract</title>
<desc id="dst19fix-schema-d">Dữ liệu và đường truy cập khi expand–contract</desc>
<text x="210" y="30" font-size="13" text-anchor="middle" fill="currentColor">Cột cũ</text><text x="430" y="30" font-size="13" text-anchor="middle" fill="currentColor">Cột mới</text><rect x="150" y="45" width="120" height="165" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><rect x="165" y="65" width="90" height="25" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><rect x="165" y="100" width="90" height="25" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><rect x="165" y="135" width="90" height="25" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><rect x="165" y="170" width="90" height="25" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><rect x="20" y="95" width="95" height="40" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/><text x="67" y="120" font-size="13" text-anchor="middle" fill="currentColor">Writer</text><g data-step="1">
<rect x="370" y="45" width="120" height="165" rx="6" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/><path d="M115 103 L150 80" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#dst19fix-schema-arrow)"/><path d="M115 125 L370 80" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#dst19fix-schema-arrow)"/><text x="310" y="65" font-size="13" text-anchor="middle" fill="currentColor">dual-write</text>
</g>
<g data-step="2">
<rect x="385" y="65" width="90" height="25" rx="6" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/><path d="M270 77 L370 77" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#dst19fix-schema-arrow)"/><rect x="385" y="100" width="90" height="25" rx="6" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/><path d="M270 112 L370 112" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#dst19fix-schema-arrow)"/><rect x="385" y="135" width="90" height="25" rx="6" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/><path d="M270 147 L370 147" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#dst19fix-schema-arrow)"/><rect x="385" y="170" width="90" height="25" rx="6" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/><path d="M270 182 L370 182" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#dst19fix-schema-arrow)"/><text x="310" y="235" font-size="13" text-anchor="middle" fill="currentColor">Backfill theo batch</text>
</g>
<rect x="260" y="280" width="120" height="38" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/><text x="320" y="304" font-size="13" text-anchor="middle" fill="currentColor">Reader mới</text><g data-step="3">
<path d="M380 299 L430 210" fill="none" stroke="#10b981" stroke-width="1.5" marker-end="url(#dst19fix-schema-arrow)"/><text x="480" y="265" font-size="13" text-anchor="middle" fill="currentColor">đổi route</text>
</g>
<g data-step="4">
<path d="M145 42 L275 215 M275 42 L145 215" stroke="#f43f5e" stroke-width="3"/><text x="260" y="352" font-size="13" text-anchor="middle" fill="currentColor">Contract: hết cửa sổ rollback mới drop</text>
</g>
<defs><marker id="dst19fix-schema-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 Z" fill="currentColor"/></marker></defs>
</svg>
<step-note data-step="1">Thêm cột mới, giữ cột cũ và dual-write; release cũ còn hoạt động.</step-note>
<step-note data-step="2">Các mũi tên ngang là dữ liệu backfill theo batch, có throttle theo lag.</step-note>
<step-note data-step="3">Chuyển reader/writer khi dữ liệu đã bắt kịp và đã kiểm chứng.</step-note>
<step-note data-step="4">Drop cột cũ là ranh giới mất tương thích; quay lại code cũ cần phục hồi dữ liệu/schema.</step-note>
</step-flow>

Backfill đúng cách — **theo batch, throttle theo lag**, không phải một `UPDATE` khổng lồ (một UPDATE 500M dòng khoá & sinh WAL kinh khủng, làm replica lag hàng giờ):

```sql
-- Lặp cho tới khi affected rows = 0; nghỉ giữa các vòng & theo dõi replication lag
UPDATE orders
SET status = 0
WHERE status IS NULL
  AND id IN (
    SELECT id FROM orders WHERE status IS NULL LIMIT 5000
  );
-- sleep 100ms giữa mỗi batch; nếu replica lag > ngưỡng thì dừng chờ
```

---

## 6. Playbook zero-downtime cho bảng 500M dòng
1. **Đo trước**: kích thước bảng, replica lag hiện tại, disk IOPS còn dư, có transaction dài không.
2. Chọn công cụ: cột đơn giản → online DDL / `ADD COLUMN` metadata; nặng (đổi kiểu, bảng khổng lồ) → **gh-ost**.
3. **Đặt `lock_timeout` ngắn** để không "đứng hình" cả bảng khi chờ lock.
4. **Batch nhỏ + sleep + throttle theo `max-lag`**; giám sát replication lag & disk IO realtime.
5. Chạy **giờ thấp điểm**; có sẵn nút **dừng/rollback**.
6. Với đổi schema: theo **expand–migrate–contract**, không đổi tại chỗ.
7. Sau cùng: xác nhận replica đã bắt kịp trước khi coi là xong.

---

## 7. Tóm tắt
- Migration làm **căng IO** vì đụng đồng thời **IOPS, buffer cache (evict dữ liệu nóng), và WAL** — nó làm chậm **cả hệ**, không chỉ chính nó.
- **Lock level** quyết định downtime: `CREATE INDEX` thường chặn ghi; `ALTER TYPE` rewrite chặn tất cả; dùng `CONCURRENTLY`/online DDL để né. Luôn đặt `lock_timeout`.
- **DDL trên replica tùy cơ chế: physical/MySQL tự truyền, PG logical triển khai riêng**, nhưng replica phải **replay/chạy lại** công việc nặng đó ⇒ **replication lag** phình, stale read, và (Postgres) **huỷ query đọc** trên standby.
- **gh-ost/pt-osc** migrate qua bảng bóng + copy batch + **tự throttle theo lag** → không downtime cho bảng khổng lồ.
- Đổi cột theo **expand–migrate–contract**, backfill **theo batch có throttle**, không "big bang".

> **Bài tiếp theo (Bài 21):** đi sâu vào **index ở production** — chi phí IO khi build, **index bloat & REINDEX**, phát hiện index thừa/không dùng, và khi nào index lại làm hệ chậm đi.
