# Bài 19 — Capstone: Thiết kế storage layer cho một hệ thực tế

## 1. Mục tiêu
Đây là **dự án tổng kết** của cả course. Không giới thiệu công nghệ mới — thay vào đó bạn **ghép mọi thứ đã học** lại thành một quyết định kiến trúc thật. Sau bài này bạn có thể:
- Nhìn một hệ thực tế (e-commerce) và **phân rã** nó thành các workload lưu trữ khác nhau.
- Áp dụng **framework chọn store của Bài 18** để bảo vệ từng lựa chọn: PostgreSQL, Redis, Elasticsearch, ClickHouse, S3.
- Giải thích **vì sao KHÔNG dùng một store cho tất cả** — và cái giá của polyglot persistence.
- Thiết kế **cơ chế đồng bộ dữ liệu** giữa các store (outbox / CDC) mà không mất event.
- Xử lý **nhất quán cache ↔ DB** đúng cách (chống stale, chống dual-write race).

---

## 2. Bài toán: hệ e-commerce "ShopX"

Hình dung một sàn thương mại điện tử quy mô vừa: ~2 triệu SKU, ~50k đơn/ngày, đỉnh flash-sale 5k req/s. Các nghiệp vụ **không hề giống nhau** về yêu cầu dữ liệu:

| Nghiệp vụ | Đặc điểm dữ liệu | Yêu cầu nổi bật |
|-----------|------------------|-----------------|
| Đặt hàng, thanh toán, trừ tồn kho | Quan hệ, giao dịch nhiều bảng | **ACID tuyệt đối** — không được bán quá tồn |
| Session đăng nhập, giỏ hàng | Key → value tạm, TTL | Đọc/ghi micro giây, chia sẻ giữa app server |
| Cache trang sản phẩm | Đọc rất nhiều, ghi ít | Giảm tải DB, chấp nhận trễ vài giây |
| Rate limit API, chống spam | Đếm + TTL nguyên tử | Atomic, cực nhanh |
| Tìm kiếm "áo thun cotton nam" | Full-text, facet, fuzzy | Relevance, filter theo thuộc tính |
| Phân tích hành vi, doanh thu | Ghi khổng lồ, quét cột | Aggregate hàng tỷ dòng trong giây |
| Ảnh sản phẩm, hoá đơn PDF | Blob lớn, bất biến | Rẻ, bền, phục vụ qua CDN |

**Cốt lõi của Bài 18 nhắc lại:** một database chỉ tối ưu được cho *một trục* (đọc vs ghi, nhất quán vs sẵn sàng, quan hệ vs quét cột). Không có store nào giỏi cả 7 dòng trên. Vì thế hệ thật là **polyglot persistence** — mỗi workload đi vào store *đúng hình dạng* của nó.

---

## 3. Kiến trúc tổng thể

<svg viewBox="0 0 760 400" role="img" aria-labelledby="arch-t arch-d" style="width:100%;max-width:740px;height:auto;display:block;margin:1.25rem auto">
<title id="arch-t">Kiến trúc storage layer ShopX</title>
<desc id="arch-d">Service layer ghi vào PostgreSQL nguồn sự thật, phát event qua outbox và CDC sang Elasticsearch và ClickHouse, dùng Redis làm cache và session, S3 chứa ảnh</desc>
<rect x="20" y="20" width="720" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="380" y="48" text-anchor="middle" font-size="13" fill="currentColor">API / Service layer (order, catalog, search, auth)</text>
<rect x="40" y="120" width="150" height="70" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="148" text-anchor="middle" font-size="12" fill="currentColor">PostgreSQL</text>
<text x="115" y="167" text-anchor="middle" font-size="10" fill="currentColor">order, inventory</text>
<text x="115" y="181" text-anchor="middle" font-size="10" fill="currentColor">NGUỒN SỰ THẬT</text>
<rect x="215" y="120" width="150" height="70" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="290" y="148" text-anchor="middle" font-size="12" fill="currentColor">Redis</text>
<text x="290" y="167" text-anchor="middle" font-size="10" fill="currentColor">session, cart, cache</text>
<text x="290" y="181" text-anchor="middle" font-size="10" fill="currentColor">rate limit</text>
<rect x="590" y="120" width="150" height="70" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="665" y="153" text-anchor="middle" font-size="12" fill="currentColor">S3</text>
<text x="665" y="172" text-anchor="middle" font-size="10" fill="currentColor">ảnh, PDF (blob)</text>
<rect x="215" y="290" width="150" height="70" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="290" y="318" text-anchor="middle" font-size="12" fill="currentColor">Elasticsearch</text>
<text x="290" y="337" text-anchor="middle" font-size="10" fill="currentColor">tìm kiếm sản phẩm</text>
<text x="290" y="351" text-anchor="middle" font-size="10" fill="currentColor">facet, fuzzy</text>
<rect x="415" y="290" width="150" height="70" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="490" y="318" text-anchor="middle" font-size="12" fill="currentColor">ClickHouse</text>
<text x="490" y="337" text-anchor="middle" font-size="10" fill="currentColor">analytics hành vi</text>
<text x="490" y="351" text-anchor="middle" font-size="10" fill="currentColor">doanh thu</text>
<rect x="415" y="215" width="150" height="44" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="490" y="235" text-anchor="middle" font-size="11" fill="currentColor">outbox + CDC</text>
<text x="490" y="250" text-anchor="middle" font-size="10" fill="currentColor">(Debezium → Kafka)</text>
<line x1="380" y1="66" x2="115" y2="118" stroke="currentColor" stroke-width="1" marker-end="url(#a2)"/>
<line x1="380" y1="66" x2="290" y2="118" stroke="currentColor" stroke-width="1" marker-end="url(#a2)"/>
<line x1="380" y1="66" x2="665" y2="118" stroke="currentColor" stroke-width="1" marker-end="url(#a2)"/>
<line x1="190" y1="165" x2="413" y2="230" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<line x1="465" y1="259" x2="320" y2="288" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<line x1="500" y1="259" x2="500" y2="288" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<text x="600" y="290" text-anchor="middle" font-size="10" fill="currentColor">stream 1 lần ghi →</text>
<text x="600" y="304" text-anchor="middle" font-size="10" fill="currentColor">nhiều bản đọc</text>
<defs><marker id="a2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Nguyên tắc điều phối (quan trọng nhất):** chọn **một nguồn sự thật duy nhất** cho mỗi mẩu dữ liệu. Ở ShopX, PostgreSQL là nguồn sự thật cho order/inventory/catalog gốc. Mọi store khác — Elasticsearch, ClickHouse, cache Redis — là **bản sao dẫn xuất (derived view)**, được nuôi từ nguồn sự thật qua stream. Điều này biến bài toán "N store phải nhất quán với nhau" (rất khó) thành "N-1 view phải bám theo 1 nguồn" (giải được bằng CDC).

---

## 4. Bảo vệ từng lựa chọn theo framework Bài 18

Framework Bài 18 hỏi 5 câu cho mỗi workload: **(1) hình dạng dữ liệu, (2) pattern truy vấn, (3) yêu cầu nhất quán, (4) tỉ lệ đọc/ghi & quy mô, (5) chi phí sai lệch.** Áp vào từng store:

### 4.1 PostgreSQL — order & inventory (ACID)
- **Hình dạng:** quan hệ chặt — `orders`, `order_items`, `inventory`, `payments` liên kết khoá ngoại.
- **Truy vấn:** giao dịch nhiều bảng: trừ tồn kho + tạo đơn + ghi payment phải **cùng một transaction**.
- **Nhất quán:** yêu cầu **serializable / read-committed + row lock**. Bán quá tồn = mất tiền thật, không thể "eventual".
- **Chi phí sai:** cực cao (oversell, sai sổ sách) → chọn store mạnh nhất về ACID.

```sql
BEGIN;
-- Khoá dòng tồn kho, chặn race giữa 2 đơn cùng mua SKU cuối cùng
SELECT qty FROM inventory WHERE sku = 'TS-001' FOR UPDATE;
UPDATE inventory SET qty = qty - 1 WHERE sku = 'TS-001' AND qty >= 1;
-- Nếu UPDATE ảnh hưởng 0 dòng → hết hàng → ROLLBACK
INSERT INTO orders (id, user_id, status) VALUES ('o_42', 'u_9', 'PENDING');
INSERT INTO order_items (order_id, sku, qty) VALUES ('o_42', 'TS-001', 1);
COMMIT;
```

`FOR UPDATE` + điều kiện `qty >= 1` là chốt chặn chống oversell — đúng thứ chỉ một DB ACID mới đảm bảo được dưới đồng thời cao.

### 4.2 Redis — session, cart, cache sản phẩm, rate limit
Bốn use case, cùng một lý do: **key → value nóng, tạm, cần micro giây, chia sẻ giữa nhiều pod** (Bài 1, 6, 7).

```bash
# Session (TTL tự hết hạn khi user rời đi)
SET session:tok_abc '{"uid":"u_9","role":"buyer"}' EX 1800

# Giỏ hàng — hash, sửa từng món không cần đọc-ghi cả object
HSET cart:u_9 TS-001 2 SH-050 1
EXPIRE cart:u_9 604800

# Cache trang sản phẩm (cache-aside, TTL ngắn + jitter chống stampede)
SET product:TS-001 '{...json...}' EX 300

# Rate limit — INCR atomic + TTL cho cửa sổ 1 phút, không cần lock
# key = user:cửa-sổ-phút (epoch // 60), TTL 60s để bucket tự dọn
INCR rl:u_9:28166667
EXPIRE rl:u_9:28166667 60   # >100 lần trong cửa sổ này thì chặn
```
- **Nhất quán:** cache **chấp nhận stale vài giây**; session/cart là dữ liệu người dùng tạm, mất thì đăng nhập lại — không dùng Redis làm nguồn sự thật cho tiền.
- **Vì sao không nhét cart vào Postgres?** Ghi/đọc cart cực nhiều, dữ liệu vòng đời ngắn → nếu vào Postgres sẽ đốt IOPS vô ích. Đây là workload *đúng hình dạng* Redis.

### 4.3 Elasticsearch — tìm kiếm sản phẩm
- **Truy vấn:** full-text tiếng Việt có dấu/không dấu, fuzzy typo, **facet** (lọc theo brand/màu/giá), sort theo relevance. SQL `LIKE '%...%'` không làm nổi việc này ở quy mô triệu SKU.
- **Nhất quán:** **eventual** hoàn toàn ổn — sản phẩm mới lên kệ trễ vài giây trong ô tìm kiếm không ai chết.
- **Chú ý:** Elasticsearch là **view dẫn xuất**, KHÔNG phải nguồn sự thật. Không bao giờ đặt số tồn kho "bán được" hay giá thanh toán *chỉ* trong ES; nó là index để tìm, giá/tồn cuối cùng luôn xác nhận lại ở Postgres lúc checkout.

### 4.4 ClickHouse — analytics hành vi & doanh thu
- **Hình dạng:** event append-only khổng lồ (pageview, add-to-cart, purchase) — hàng tỷ dòng.
- **Truy vấn:** aggregate quét cột: "doanh thu theo ngày × danh mục 90 ngày", "funnel xem → giỏ → mua". Columnar + nén → quét tỷ dòng trong **dưới giây**; cùng query trên Postgres row-store sẽ chết.
- **Nhất quán:** eventual, batch/near-real-time đều chấp nhận. Tách hẳn khỏi DB giao dịch để **query analytics nặng không bao giờ làm chậm đường đặt hàng** (isolation of workloads — lý do cốt lõi tách OLTP khỏi OLAP).

### 4.5 S3 — ảnh & tài liệu
- **Hình dạng:** blob lớn, bất biến, đọc nhiều. Nhét ảnh vào DB là phản mẫu kinh điển: phình bảng, đắt, chậm.
- **Cách làm chuẩn:** DB/ES chỉ lưu **URL/key** trỏ tới S3; ảnh phục vụ qua **CDN** trước S3. Rẻ, bền 11 số 9, scale vô hạn.

### Decision table tổng hợp

| Workload | Store | Yếu tố quyết định (Bài 18) | Nhất quán | Nếu chọn sai |
|----------|-------|----------------------------|-----------|--------------|
| Order + trừ tồn kho | **PostgreSQL** | ACID nhiều bảng, chống oversell | Strong | Bán quá tồn, sai sổ |
| Session / cart | **Redis** | key-value nóng tạm, micro giây | Không cần bền | Đốt IOPS DB vô ích |
| Cache trang SP | **Redis** | đọc nặng, giảm tải DB | Eventual (TTL) | DB quá tải giờ cao điểm |
| Rate limit | **Redis** | INCR + TTL atomic | Best-effort | Không chống được spam |
| Tìm kiếm SP | **Elasticsearch** | full-text, facet, fuzzy | Eventual | LIKE chậm, không relevance |
| Analytics | **ClickHouse** | quét cột hàng tỷ dòng | Eventual | Query nặng làm chậm OLTP |
| Ảnh / PDF | **S3 + CDN** | blob bất biến, rẻ, bền | — | Phình DB, chậm, đắt |

---

## 5. Đồng bộ dữ liệu: outbox + CDC (không mất event)

Nếu ES và ClickHouse là bản sao của Postgres, làm sao chúng luôn cập nhật? Cám dỗ đầu tiên là **dual-write**: service ghi Postgres *rồi* gọi thẳng ES. Đây là **cái bẫy** — nếu commit Postgres xong mà tiến trình chết trước khi kịp ghi ES, hai store **lệch vĩnh viễn** (không có transaction bao trùm hai hệ khác nhau).

### 5.1 Transactional Outbox — làm sự kiện thành một phần của transaction
Ghi thay đổi **và** một dòng "event" vào **cùng một transaction Postgres**. Vì cùng transaction, hoặc cả hai cùng commit, hoặc cả hai cùng rollback — không còn cửa sổ mất mát.

```sql
BEGIN;
UPDATE products SET price = 199000 WHERE sku = 'TS-001';
INSERT INTO outbox (aggregate, payload, created_at)
VALUES ('product', '{"sku":"TS-001","price":199000}', now());
COMMIT;
```

### 5.2 CDC đọc log, phát ra stream
Một tiến trình CDC (ví dụ **Debezium**) đọc **WAL / logical replication** của Postgres, biến mỗi thay đổi thành message Kafka. Consumer riêng cho từng đích cập nhật ES và ClickHouse.

<svg viewBox="0 0 720 220" role="img" aria-labelledby="cdc-t cdc-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="cdc-t">Luồng outbox và CDC</title>
<desc id="cdc-d">Postgres commit trong một transaction, Debezium đọc WAL đẩy vào Kafka, consumer group cập nhật Elasticsearch và ClickHouse</desc>
<rect x="20" y="80" width="120" height="60" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="106" text-anchor="middle" font-size="12" fill="currentColor">PostgreSQL</text>
<text x="80" y="124" text-anchor="middle" font-size="10" fill="currentColor">WAL + outbox</text>
<rect x="190" y="80" width="120" height="60" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="250" y="106" text-anchor="middle" font-size="12" fill="currentColor">Debezium</text>
<text x="250" y="124" text-anchor="middle" font-size="10" fill="currentColor">(đọc log)</text>
<rect x="360" y="80" width="120" height="60" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="420" y="106" text-anchor="middle" font-size="12" fill="currentColor">Kafka</text>
<text x="420" y="124" text-anchor="middle" font-size="10" fill="currentColor">topic: products</text>
<rect x="540" y="30" width="160" height="52" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="620" y="60" text-anchor="middle" font-size="12" fill="currentColor">consumer → Elasticsearch</text>
<rect x="540" y="138" width="160" height="52" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="620" y="168" text-anchor="middle" font-size="12" fill="currentColor">consumer → ClickHouse</text>
<line x1="140" y1="110" x2="188" y2="110" stroke="currentColor" stroke-width="1.5" marker-end="url(#a3)"/>
<line x1="310" y1="110" x2="358" y2="110" stroke="currentColor" stroke-width="1.5" marker-end="url(#a3)"/>
<line x1="480" y1="100" x2="538" y2="66" stroke="currentColor" stroke-width="1.5" marker-end="url(#a3)"/>
<line x1="480" y1="120" x2="538" y2="158" stroke="currentColor" stroke-width="1.5" marker-end="url(#a3)"/>
<defs><marker id="a3" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Vì sao mô hình này thắng:** một lần ghi vào nguồn sự thật → **fan-out** ra nhiều view độc lập. Mỗi consumer có offset riêng, chậm/chết thì **replay từ Kafka** mà không mất event (at-least-once). Đích phải **idempotent** — dùng `sku` làm document id trong ES, dùng `ReplacingMergeTree` theo version trong ClickHouse — để xử lý message trùng an toàn.

---

## 6. Nhất quán cache ↔ DB: chống stale

Cache Redis là view của Postgres, nên phải trả lời: khi giá sản phẩm đổi, cache cũ xử lý sao? (Sâu hơn ở Bài 7, 8.)

- **Cache-aside + TTL:** đọc thì thử Redis trước, miss thì đọc Postgres rồi `SET ... EX`. Đơn giản, tự lành nhờ TTL.
- **Cập nhật thì INVALIDATE, đừng WRITE cache:** khi ghi Postgres, **xoá key** (`DEL product:TS-001`) thay vì ghi giá trị mới vào cache. Vì sao? Hai request ghi đồng thời có thể ghi cache theo thứ tự đảo → cache giữ giá cũ vĩnh viễn. Xoá thì lần đọc kế tiếp tự nạp lại giá trị mới nhất từ DB.
- **Thứ tự chuẩn:** ghi DB **trước**, xoá cache **sau**. Nếu xoá trước rồi mới ghi DB, một request đọc chen giữa sẽ nạp lại *giá trị cũ* vào cache.
- **Trường hợp khó (xoá cache thất bại sau khi DB đã đổi):** để CDC ở Mục 5 đảm nhận — consumer bắt event `product changed` và **xoá key Redis tương ứng**, biến việc invalidate thành phần của cùng luồng event tin cậy, không còn phụ thuộc "nhớ xoá" trong code service.

```text
# Luồng cập nhật giá an toàn
1. UPDATE products ... (Postgres, có outbox trong cùng transaction)
2. DEL product:TS-001   (best-effort, nhanh)
3. CDC event → consumer cũng DEL product:TS-001  (bảo hiểm, chắc chắn)
```

> **Nguyên tắc vàng:** cache và index luôn là **eventual**; chỉ đường đi tiền (order, inventory, payment) mới **strong**. Đừng bao giờ để quyết định trừ tiền/tồn kho phụ thuộc vào một bản sao dẫn xuất.

---

## 7. Tóm tắt
- Hệ thật là **polyglot persistence**: không store nào giỏi cả 7 workload — chọn store *đúng hình dạng dữ liệu* của từng workload theo **framework Bài 18**.
- **Một nguồn sự thật duy nhất** (PostgreSQL cho order/inventory/catalog); ES, ClickHouse, Redis đều là **view dẫn xuất** — biến "N store nhất quán với nhau" thành "N-1 view bám theo 1 nguồn".
- **PostgreSQL** giữ ACID nhiều bảng chống oversell; **Redis** cho session/cart/cache/rate-limit micro giây; **Elasticsearch** cho tìm kiếm full-text + facet; **ClickHouse** cho analytics quét cột tách khỏi OLTP; **S3 + CDN** cho blob.
- Đồng bộ bằng **transactional outbox + CDC (Debezium → Kafka)** thay vì dual-write → không mất event, fan-out 1 ghi ra nhiều view, replay được, đích phải idempotent.
- Nhất quán cache: **cache-aside + TTL**, ghi DB trước rồi **xoá** (không ghi) cache, và để **CDC làm lớp invalidate bảo hiểm**. Chỉ đường tiền mới strong; view luôn eventual.

> **Kết course:** Bạn đã đi từ một Redis đơn lẻ (Bài 1) tới việc điều phối cả một storage layer nhiều thành phần. Kỹ năng cuối cùng — và khó nhất — không phải biết từng store, mà là **biết đặt mỗi mẩu dữ liệu vào đúng chỗ và giữ chúng đồng bộ mà không nói dối người dùng.**
