# Index & hiệu năng truy vấn

Bạn viết một câu `SELECT ... WHERE email = '...'` và lúc dữ liệu còn ít thì nhanh như chớp. Nhưng khi bảng có vài triệu dòng, cũng câu đó bỗng chậm đến mức trang web treo. Khác biệt nằm ở một thứ: **INDEX**.

Trong bài này ta học INDEX là gì, vì sao nó nhanh (B-tree), cách tạo và đọc kế hoạch truy vấn (`EXPLAIN`), khi nào INDEX bị bỏ qua, lỗi N+1, và cái giá phải trả khi ghi dữ liệu.

## Schema xuyên suốt

Ta dùng lại cửa hàng quen thuộc: `customers`, `products`, `orders`.

```sql
CREATE TABLE customers (
  id          BIGINT PRIMARY KEY,
  email       VARCHAR(255),
  full_name   VARCHAR(255),
  city        VARCHAR(100),
  created_at  TIMESTAMP
);

CREATE TABLE products (
  id      BIGINT PRIMARY KEY,
  name    VARCHAR(255),
  price   NUMERIC(10,2)
);

CREATE TABLE orders (
  id            BIGINT PRIMARY KEY,
  customer_id   BIGINT,        -- tham chiếu customers.id
  product_id    BIGINT,        -- tham chiếu products.id
  status        VARCHAR(20),   -- 'paid', 'pending', 'cancelled'
  total         NUMERIC(10,2),
  created_at    TIMESTAMP
);
```

Giả sử `customers` có 2 triệu dòng, `orders` có 10 triệu dòng. Đủ lớn để cảm nhận sự khác biệt.

## INDEX là gì? — Mục lục của cuốn sách

Hình dung bạn cần tìm từ "PostgreSQL" trong một cuốn sách 900 trang.

- **Không có mục lục:** lật từng trang từ đầu đến cuối. Đây là **full table scan** (PostgreSQL gọi là **Sequential Scan / Seq Scan**).
- **Có mục lục (index) cuối sách:** "PostgreSQL ... trang 412". Bạn nhảy thẳng tới trang 412. Đây là **Index Scan**.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Seq Scan so với Index Scan — lật từng trang so với dùng mục lục</title>
  <desc>Hai cột so sánh: bên trái Seq Scan quét tuần tự toàn bộ 2 triệu dòng như lật từng trang; bên phải Index Scan dùng mục lục nhảy thẳng tới dòng cần.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">Tìm 1 dòng trong 2.000.000 dòng</text>
  <rect x="16" y="40" width="336" height="264" rx="10" fill="#f59e0b" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="32" y="64" font-size="12.5" font-weight="700" fill="currentColor">Seq Scan — lật từng trang</text>
  <text x="32" y="82" font-size="10.5" fill="currentColor" opacity="0.7">Không có index · O(n)</text>
  <g>
    <rect x="32" y="98" width="44" height="58" rx="4" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="84" y="98" width="44" height="58" rx="4" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="136" y="98" width="44" height="58" rx="4" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="188" y="98" width="44" height="58" rx="4" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="240" y="98" width="44" height="58" rx="4" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="296" y="98" width="44" height="58" rx="4" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="262" y="132" font-size="14" text-anchor="middle" fill="currentColor">★</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.45" fill="none" marker-end="url(#sqArr)">
    <path d="M54 164 v8 h52"/>
    <path d="M106 172 v-8"/>
    <path d="M158 164 v8 h52"/>
    <path d="M210 172 v-8"/>
    <path d="M262 164 v8 h52"/>
  </g>
  <text x="32" y="200" font-size="11" fill="currentColor" opacity="0.85">Đọc lần lượt 1 → 2 → 3 → ... đến khi gặp.</text>
  <text x="32" y="222" font-size="11" fill="currentColor" opacity="0.85">Đọc 2.000.000 dòng, vứt đi 1.999.999.</text>
  <rect x="32" y="238" width="288" height="48" rx="7" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="44" y="258" font-size="11.5" font-weight="700" fill="currentColor">~412 ms</text>
  <text x="44" y="276" font-size="10.5" fill="currentColor" opacity="0.75">Rows Removed by Filter: 1999999</text>
  <rect x="368" y="40" width="336" height="264" rx="10" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="384" y="64" font-size="12.5" font-weight="700" fill="currentColor">Index Scan — dùng mục lục</text>
  <text x="384" y="82" font-size="10.5" fill="currentColor" opacity="0.7">Có index · O(log n)</text>
  <rect x="384" y="98" width="170" height="92" rx="7" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="396" y="118" font-size="10.5" font-weight="700" fill="currentColor">Mục lục (index)</text>
  <text x="396" y="138" font-size="10.5" fill="currentColor" opacity="0.8">an@… → trang</text>
  <text x="396" y="156" font-size="10.5" fill="currentColor" opacity="0.8">binh@… → trang</text>
  <text x="396" y="174" font-size="10.5" fill="currentColor" opacity="0.55">… đã sắp xếp …</text>
  <rect x="606" y="120" width="84" height="58" rx="4" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="648" y="153" font-size="14" text-anchor="middle" fill="currentColor">★</text>
  <text x="648" y="170" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">dòng cần</text>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <path d="M554 138 H600" marker-end="url(#idxArr)"/>
  </g>
  <text x="384" y="214" font-size="11" fill="currentColor" opacity="0.85">Nhảy thẳng tới đúng dòng, không quét.</text>
  <rect x="384" y="238" width="304" height="48" rx="7" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="396" y="258" font-size="11.5" font-weight="700" fill="currentColor">~0.07 ms</text>
  <text x="396" y="276" font-size="10.5" fill="currentColor" opacity="0.75">nhanh hơn ~5800 lần</text>
  <defs>
    <marker id="sqArr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 z" fill="currentColor" fill-opacity="0.5"/></marker>
    <marker id="idxArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
</svg>

INDEX là một cấu trúc dữ liệu phụ, sắp xếp sẵn theo cột bạn chọn, để database tìm dòng mà **không phải đọc toàn bộ bảng**.

```sql
-- Không có index trên email: phải quét cả 2 triệu dòng
SELECT * FROM customers WHERE email = 'an@example.com';
```

Quét tuần tự 2 triệu dòng để tìm 1 dòng là lãng phí khủng khiếp.

> 💡 **Ghi nhớ:** INDEX không thay đổi *kết quả* của truy vấn, chỉ thay đổi *tốc độ* tìm ra kết quả đó. Câu SQL viết y hệt, nhưng chạy nhanh hơn rất nhiều.

## B-tree — vì sao tìm kiếm nhanh

Loại INDEX mặc định trong hầu hết database (PostgreSQL, MySQL) là **B-tree** (cây cân bằng). Bạn không cần tự dựng nó, nhưng hiểu ý tưởng giúp đoán được khi nào INDEX có ích.

B-tree giữ các giá trị **đã sắp xếp** trong một cây nhiều tầng:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cấu trúc B-tree nhiều tầng và đường đi tìm kiếm O(log n)</title>
  <desc>Cây B-tree ba tầng: nút gốc, tầng nhánh, tầng lá chứa giá trị và con trỏ tới dòng. Đường tìm một giá trị chỉ qua 3 bước, mỗi tầng loại bỏ phần lớn nhánh còn lại.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">B-tree — tìm 1 giá trị chỉ qua 3–4 bước</text>
  <g stroke="currentColor" stroke-opacity="0.3" fill="none">
    <path d="M360 86 L188 138"/>
    <path d="M360 86 L532 138"/>
    <path d="M150 174 L70 226"/>
    <path d="M150 174 L150 226"/>
    <path d="M226 174 L290 226"/>
    <path d="M494 174 L430 226"/>
    <path d="M570 174 L570 226"/>
    <path d="M570 174 L650 226"/>
  </g>
  <g stroke="currentColor" stroke-opacity="0.85" fill="none" stroke-width="2.2">
    <path d="M360 86 L188 138"/>
    <path d="M150 174 L290 226"/>
  </g>
  <g>
    <rect x="312" y="56" width="96" height="32" rx="7" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.35"/>
    <text x="360" y="77" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">M</text>
    <text x="416" y="77" font-size="10.5" fill="currentColor" opacity="0.7">gốc</text>
  </g>
  <g>
    <rect x="108" y="146" width="118" height="32" rx="7" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.45"/>
    <text x="167" y="167" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">D · H</text>
    <rect x="452" y="146" width="118" height="32" rx="7" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="511" y="167" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">R · W</text>
    <text x="232" y="167" font-size="10.5" fill="currentColor" opacity="0.7">nhánh</text>
  </g>
  <g font-size="10.5" text-anchor="middle">
    <rect x="28" y="226" width="84" height="42" rx="6" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="70" y="244" font-weight="700" fill="currentColor">A · B · C</text>
    <text x="70" y="260" fill="currentColor" opacity="0.6">→ con trỏ</text>
    <rect x="116" y="226" width="84" height="42" rx="6" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="158" y="244" font-weight="700" fill="currentColor">E · F · G</text>
    <text x="158" y="260" fill="currentColor" opacity="0.6">→ con trỏ</text>
    <rect x="248" y="226" width="84" height="42" rx="6" fill="#f59e0b" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.5"/>
    <text x="290" y="244" font-weight="700" fill="currentColor">I · J · K</text>
    <text x="290" y="260" fill="currentColor" opacity="0.75">→ DÒNG</text>
    <rect x="388" y="226" width="84" height="42" rx="6" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="430" y="244" font-weight="700" fill="currentColor">N · P · Q</text>
    <text x="430" y="260" fill="currentColor" opacity="0.6">→ con trỏ</text>
    <rect x="528" y="226" width="84" height="42" rx="6" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="570" y="244" font-weight="700" fill="currentColor">S · T · V</text>
    <text x="570" y="260" fill="currentColor" opacity="0.6">→ con trỏ</text>
    <rect x="616" y="226" width="84" height="42" rx="6" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="658" y="244" font-weight="700" fill="currentColor">X · Y · Z</text>
    <text x="658" y="260" fill="currentColor" opacity="0.6">→ con trỏ</text>
  </g>
  <text x="16" y="219" font-size="10" fill="currentColor" opacity="0.55">tầng lá</text>
  <g font-size="10.5" fill="#f59e0b">
    <text x="240" y="108" font-weight="700">"J" trước M → trái</text>
    <text x="60" y="200" font-weight="700">"J" sau H → phải</text>
  </g>
  <text x="360" y="300" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.8">2.000.000 dòng → chỉ ~3–4 bước thay vì 2.000.000 lần so sánh (O(log n))</text>
</svg>

Để tìm `'an@example.com'`, database đi từ gốc, mỗi tầng loại bỏ một nửa (hoặc hơn) số nhánh còn lại. Với 2 triệu dòng, thay vì so sánh 2.000.000 lần, B-tree chỉ cần khoảng **3–4 bước**. Đó là độ phức tạp **O(log n)** thay vì **O(n)**.

Vì B-tree giữ thứ tự, nó hỗ trợ tốt:

- So sánh bằng: `WHERE email = '...'`
- Khoảng/so sánh: `WHERE created_at >= '2026-01-01'`, `WHERE price < 100`
- Sắp xếp: `ORDER BY created_at`
- Tiền tố chuỗi: `WHERE name LIKE 'Áo%'`

Nhưng **không** hỗ trợ tốt `LIKE '%áo%'` (ký tự đại diện ở đầu) — vì không có "điểm bắt đầu" để định vị trong cây sắp xếp.

## CREATE INDEX

Cú pháp cơ bản:

```sql
CREATE INDEX idx_customers_email ON customers (email);
```

Sau lệnh này, truy vấn tìm theo `email` chuyển từ Seq Scan sang Index Scan.

Quy ước đặt tên (không bắt buộc nhưng nên theo): `idx_<bảng>_<cột>`.

PRIMARY KEY và UNIQUE **tự động** có INDEX — bạn không cần tạo lại cho `customers.id`. Nhưng **FOREIGN KEY thì KHÔNG** tự động được đánh index ở nhiều database (PostgreSQL không tự tạo). Đây là cái bẫy kinh điển.

```sql
-- orders.customer_id dùng để JOIN và lọc liên tục
-- nhưng thường KHÔNG có index sẵn -> phải tự tạo
CREATE INDEX idx_orders_customer_id ON orders (customer_id);
```

## Single INDEX vs Composite INDEX (leftmost prefix)

**Single-column index** đánh trên một cột. **Composite (multi-column) index** đánh trên nhiều cột theo **thứ tự**:

```sql
CREATE INDEX idx_orders_cust_status
  ON orders (customer_id, status);
```

Hãy hình dung index này như một danh bạ điện thoại sắp xếp theo *(họ, tên)*: trước tiên theo họ, trong cùng họ thì theo tên.

**Quy tắc leftmost prefix (tiền tố trái):** database chỉ dùng được index khi truy vấn lọc theo cột **từ trái sang**, không bỏ trống cột đầu.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Composite index leftmost-prefix — danh bạ sắp theo (customer_id, status)</title>
  <desc>Index gồm hai cột customer_id rồi status, sắp xếp như danh bạ. Query lọc từ cột trái dùng được index; query bỏ qua cột đầu chỉ lọc status thì không nhảy thẳng được, phải dò gần hết.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">Index (customer_id, status) — sắp như danh bạ</text>
  <rect x="16" y="40" width="300" height="284" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.2"/>
  <g font-size="11">
    <rect x="32" y="56" width="120" height="22" rx="5" fill="#3b82f6" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="92" y="71" font-weight="700" text-anchor="middle" fill="currentColor">customer_id</text>
    <rect x="160" y="56" width="120" height="22" rx="5" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="220" y="71" font-weight="700" text-anchor="middle" fill="currentColor">status</text>
  </g>
  <g font-size="11" fill="currentColor">
    <text x="40" y="102">41</text><text x="170" y="102" opacity="0.85">paid</text>
    <text x="40" y="124">41</text><text x="170" y="124" opacity="0.85">pending</text>
    <text x="40" y="146" font-weight="700">42</text><text x="170" y="146" font-weight="700">paid</text>
    <text x="40" y="168" font-weight="700">42</text><text x="170" y="168" opacity="0.85">pending</text>
    <text x="40" y="190">43</text><text x="170" y="190" opacity="0.85">cancelled</text>
    <text x="40" y="212">43</text><text x="170" y="212" opacity="0.85">paid</text>
    <text x="40" y="234">44</text><text x="170" y="234" opacity="0.85">paid</text>
  </g>
  <line x1="146" y1="86" x2="146" y2="244" stroke="currentColor" stroke-opacity="0.15"/>
  <rect x="32" y="134" width="248" height="22" rx="4" fill="#f59e0b" fill-opacity="0.22"/>
  <text x="36" y="270" font-size="10.5" fill="currentColor" opacity="0.7">Sắp theo cột trái trước; trong cùng id mới theo status.</text>
  <text x="36" y="288" font-size="10.5" fill="currentColor" opacity="0.7">Như danh bạ: theo HỌ trước, rồi mới đến TÊN.</text>
  <g font-size="11">
    <rect x="332" y="40" width="372" height="86" rx="9" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="346" y="60" font-size="12" font-weight="700" fill="currentColor">✓ DÙNG ĐƯỢC — lọc từ cột trái</text>
    <text x="346" y="82" fill="currentColor" opacity="0.9">WHERE customer_id = 42 AND status = 'paid'</text>
    <text x="346" y="102" fill="currentColor" opacity="0.9">WHERE customer_id = 42</text>
    <text x="346" y="120" font-size="10" fill="currentColor" opacity="0.65">→ nhảy thẳng tới khối id=42 (đã gom liền nhau)</text>
    <rect x="332" y="138" width="372" height="80" rx="9" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="346" y="158" font-size="12" font-weight="700" fill="currentColor">✗ KHÔNG dùng được — bỏ cột đầu</text>
    <text x="346" y="180" fill="currentColor" opacity="0.9">WHERE status = 'paid'</text>
    <text x="346" y="200" font-size="10" fill="currentColor" opacity="0.65">→ 'paid' nằm rải khắp mọi id, không có điểm</text>
    <text x="346" y="214" font-size="10" fill="currentColor" opacity="0.65">  bắt đầu để nhảy → phải dò gần hết.</text>
    <rect x="332" y="230" width="372" height="94" rx="9" fill="#3b82f6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="346" y="250" font-size="11.5" font-weight="700" fill="currentColor">Ẩn dụ danh bạ</text>
    <text x="346" y="270" font-size="10.5" fill="currentColor" opacity="0.8">Biết HỌ (cột trái) → mở thẳng tới đúng trang.</text>
    <text x="346" y="288" font-size="10.5" fill="currentColor" opacity="0.8">Chỉ biết TÊN (cột sau) → tên rải khắp danh bạ,</text>
    <text x="346" y="304" font-size="10.5" fill="currentColor" opacity="0.8">không thể nhảy thẳng, phải lật gần hết.</text>
  </g>
</svg>

Index `(customer_id, status)` **dùng được** cho:

```sql
-- Dùng cả 2 cột -> tốt nhất
WHERE customer_id = 42 AND status = 'paid';

-- Dùng cột trái nhất -> vẫn dùng được index
WHERE customer_id = 42;
```

Nhưng **KHÔNG dùng được** (hoặc dùng kém hiệu quả) cho:

```sql
-- Bỏ qua customer_id, chỉ lọc status -> index gần như vô dụng
WHERE status = 'paid';
```

Giống như tìm trong danh bạ khi bạn chỉ biết *tên* mà không biết *họ* — không thể nhảy thẳng tới, phải dò gần hết.

> 💡 **Ghi nhớ:** Đặt cột hay dùng để lọc *bằng* (`=`) lên trước trong composite index; cột dùng cho khoảng/sắp xếp đặt sau. Một composite index `(a, b)` đã bao luôn vai trò của index `(a)`, nên đừng tạo thừa index `(a)` riêng.

> ⚠️ **Lỗi người mới hay gặp:** Tạo composite index rồi đặt sai thứ tự cột. `(status, customer_id)` sẽ vô dụng cho truy vấn lọc theo mỗi `customer_id`, mà đó lại là truy vấn bạn chạy nhiều nhất. Thứ tự cột trong composite index quan trọng sống còn.

## EXPLAIN — đọc kế hoạch truy vấn

Đừng đoán xem index có được dùng không — hãy **hỏi database**. Đặt `EXPLAIN` (hoặc `EXPLAIN ANALYZE` để chạy thật và đo thời gian) trước câu lệnh:

```sql
EXPLAIN ANALYZE
SELECT * FROM customers WHERE email = 'an@example.com';
```

**Khi CHƯA có index** (xấu):

```
Seq Scan on customers  (cost=0.00..45213.00 rows=1 width=72)
  Filter: (email = 'an@example.com')
  Rows Removed by Filter: 1999999
Planning Time: 0.1 ms
Execution Time: 412.880 ms
```

Đọc hiểu:
- `Seq Scan` → quét tuần tự toàn bảng. Dấu hiệu xấu trên bảng lớn.
- `Rows Removed by Filter: 1999999` → đọc 2 triệu dòng chỉ để vứt đi gần hết. Lãng phí.
- `Execution Time: 412 ms` → quá chậm.

Sau khi tạo index:

```sql
CREATE INDEX idx_customers_email ON customers (email);

EXPLAIN ANALYZE
SELECT * FROM customers WHERE email = 'an@example.com';
```

**Khi ĐÃ có index** (tốt):

```
Index Scan using idx_customers_email on customers  (cost=0.43..8.45 rows=1 width=72)
  Index Cond: (email = 'an@example.com')
Planning Time: 0.2 ms
Execution Time: 0.071 ms
```

Đọc hiểu:
- `Index Scan using idx_customers_email` → đã dùng index. 
- `Index Cond` (chứ không phải `Filter`) → điều kiện được giải quyết *bằng* index.
- `Execution Time: 0.071 ms` → nhanh hơn ~5800 lần.

> 💡 **Ghi nhớ:** Thấy `Index Cond` là index đang gánh việc lọc. Thấy `Filter` kèm `Rows Removed by Filter` lớn nghĩa là database vẫn phải đọc rồi loại thủ công — index chưa giúp được.

## Khi nào INDEX KHÔNG được dùng?

Có index không bảo đảm nó sẽ được dùng. Những trường hợp hay gặp:

**1. Bọc cột trong hàm.** Index nằm trên *giá trị gốc* của cột, không phải trên kết quả hàm:

```sql
-- Index trên email KHÔNG dùng được vì cột bị bọc trong LOWER()
SELECT * FROM customers WHERE LOWER(email) = 'an@example.com';   -- Seq Scan

-- Cách sửa: chuẩn hoá phía ứng dụng, hoặc tạo index biểu thức
CREATE INDEX idx_customers_email_lower ON customers (LOWER(email));
```

**2. So khớp với ký tự đại diện ở đầu:**

```sql
SELECT * FROM customers WHERE full_name LIKE '%Nam';   -- Seq Scan
SELECT * FROM customers WHERE full_name LIKE 'Nam%';   -- Index Scan (tiền tố cố định)
```

**3. Lệch kiểu dữ liệu.** So sánh cột số với chuỗi (`WHERE customer_id = '42'`) có thể khiến database ép kiểu và bỏ qua index.

**4. Truy vấn trả về phần lớn bảng.** Nếu `WHERE status = 'paid'` khớp 80% số dòng, database **cố ý** chọn Seq Scan — đọc tuần tự nhanh hơn nhảy index hàng triệu lần. Đây không phải lỗi, mà là tối ưu đúng. Index chỉ đáng giá khi lọc ra **một phần nhỏ** (tính chọn lọc cao).

> ⚠️ **Lỗi người mới hay gặp:** Đánh index lên cột có ít giá trị khác nhau (như `status` chỉ 3 trạng thái, hay cột `gender`). Tính chọn lọc thấp → database vẫn ưu tiên Seq Scan → index tốn chỗ, tốn chi phí ghi mà gần như không bao giờ được dùng.

## Vấn đề N+1 query

Đây là vấn đề hiệu năng *do code ứng dụng*, không phải do thiếu index, nhưng cực kỳ phổ biến (nhất là khi dùng ORM).

Tình huống: hiển thị 100 khách hàng kèm đơn hàng của mỗi người.

```text
1 truy vấn lấy danh sách 100 khách:
   SELECT * FROM customers LIMIT 100;

rồi LẶP qua từng khách, mỗi vòng 1 truy vấn:
   SELECT * FROM orders WHERE customer_id = 1;
   SELECT * FROM orders WHERE customer_id = 2;
   ... (100 lần)
```

Tổng cộng **1 + 100 = 101** lần đi vòng tới database. Đó là "N+1": 1 query gốc cộng N query con. Mỗi lần đi-về tốn độ trễ mạng, cộng dồn thành rất chậm dù mỗi câu đều có index.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 330" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Vấn đề N+1 — 101 lần đi-về DB so với gộp thành 1 query JOIN</title>
  <desc>Bên trái: 1 query lấy 100 khách rồi vòng lặp phát sinh 100 query con, tổng 101 lần đi-về database. Bên phải: gộp tất cả thành 1 query JOIN, chỉ 1 lần đi-về.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">Lấy 100 khách kèm đơn hàng của mỗi người</text>
  <rect x="16" y="40" width="336" height="278" rx="10" fill="#f59e0b" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="32" y="64" font-size="12.5" font-weight="700" fill="currentColor">N+1 — 101 lần đi-về</text>
  <text x="48" y="90" font-size="10.5" font-weight="700" fill="currentColor">APP</text>
  <text x="300" y="90" font-size="10.5" font-weight="700" text-anchor="end" fill="currentColor">DB</text>
  <line x1="62" y1="96" x2="62" y2="300" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="306" y1="96" x2="306" y2="300" stroke="currentColor" stroke-opacity="0.3"/>
  <g stroke="currentColor" fill="none">
    <path d="M62 112 H300" stroke-opacity="0.5" marker-end="url(#n1a)"/>
    <path d="M306 124 H68" stroke-opacity="0.3" marker-end="url(#n1b)"/>
    <path d="M62 148 H300" stroke="#f59e0b" stroke-opacity="0.7" marker-end="url(#n1a)"/>
    <path d="M306 160 H68" stroke="#f59e0b" stroke-opacity="0.5" marker-end="url(#n1b)"/>
    <path d="M62 184 H300" stroke="#f59e0b" stroke-opacity="0.7" marker-end="url(#n1a)"/>
    <path d="M306 196 H68" stroke="#f59e0b" stroke-opacity="0.5" marker-end="url(#n1b)"/>
    <path d="M62 220 H300" stroke="#f59e0b" stroke-opacity="0.7" marker-end="url(#n1a)"/>
    <path d="M306 232 H68" stroke="#f59e0b" stroke-opacity="0.5" marker-end="url(#n1b)"/>
  </g>
  <text x="70" y="109" font-size="9.5" fill="currentColor" opacity="0.8">1× lấy 100 khách</text>
  <text x="70" y="145" font-size="9.5" fill="currentColor" opacity="0.8">orders WHERE customer_id=1</text>
  <text x="70" y="181" font-size="9.5" fill="currentColor" opacity="0.8">… customer_id=2</text>
  <text x="70" y="217" font-size="9.5" fill="currentColor" opacity="0.8">… customer_id=3</text>
  <text x="70" y="252" font-size="11" fill="currentColor" opacity="0.6">⋮ (tới customer_id=100)</text>
  <rect x="32" y="268" width="288" height="38" rx="7" fill="#f59e0b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="44" y="292" font-size="11.5" font-weight="700" fill="currentColor">1 + 100 = 101 lần đi-về (chậm)</text>
  <rect x="368" y="40" width="336" height="278" rx="10" fill="#10b981" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="384" y="64" font-size="12.5" font-weight="700" fill="currentColor">JOIN — 1 lần đi-về</text>
  <text x="400" y="90" font-size="10.5" font-weight="700" fill="currentColor">APP</text>
  <text x="688" y="90" font-size="10.5" font-weight="700" text-anchor="end" fill="currentColor">DB</text>
  <line x1="414" y1="96" x2="414" y2="300" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="666" y1="96" x2="666" y2="300" stroke="currentColor" stroke-opacity="0.3"/>
  <g stroke="currentColor" fill="none">
    <path d="M414 150 H660" stroke="#10b981" stroke-opacity="0.8" stroke-width="2" marker-end="url(#n1c)"/>
    <path d="M666 178 H420" stroke="#10b981" stroke-opacity="0.6" stroke-width="2" marker-end="url(#n1d)"/>
  </g>
  <text x="422" y="144" font-size="10" fill="currentColor" opacity="0.85">1× JOIN orders ON customer_id</text>
  <text x="422" y="200" font-size="10" fill="currentColor" opacity="0.85">tất cả khách + đơn trong 1 kết quả</text>
  <rect x="384" y="248" width="304" height="58" rx="7" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="396" y="270" font-size="11.5" font-weight="700" fill="currentColor">1 lần đi-về (nhanh)</text>
  <text x="396" y="290" font-size="10" fill="currentColor" opacity="0.75">cắt 100 lần độ trễ mạng cộng dồn</text>
  <defs>
    <marker id="n1a" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
    <marker id="n1b" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="currentColor" fill-opacity="0.4"/></marker>
    <marker id="n1c" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 z" fill="#10b981"/></marker>
    <marker id="n1d" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 z" fill="#10b981" fill-opacity="0.7"/></marker>
  </defs>
</svg>

**Cách sửa — gộp thành 1 truy vấn** bằng JOIN hoặc `IN`:

```sql
-- Thay 101 query bằng 1 query
SELECT c.id, c.full_name, o.id AS order_id, o.total
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE c.id IN (1, 2, 3, /* ... */ 100);
```

| id | full_name | order_id | total  |
|----|-----------|----------|--------|
| 1  | An Nguyễn | 5001     | 250000 |
| 1  | An Nguyễn | 5002     | 120000 |
| 2  | Bình Lê   | 5003     | 80000  |
| 3  | Chi Trần  | NULL     | NULL   |

> 💡 **Ghi nhớ:** Với ORM, tìm các từ khoá "eager loading" / "prefetch" / `JOIN`-loading (ví dụ `includes` trong Rails, `selectinload`/`joinedload` trong SQLAlchemy, `with` trong Laravel) để ép tải kèm trong 1–2 query thay vì N+1.

## Index làm CHẬM ghi dữ liệu

INDEX không miễn phí. Mỗi index là một cấu trúc **phải được cập nhật** mỗi khi dữ liệu thay đổi:

- `INSERT` một đơn hàng → mọi index trên `orders` phải chèn thêm mục.
- `UPDATE` một cột có index → index cũ phải xoá, index mới phải thêm.
- `DELETE` → phải gỡ khỏi mọi index.

Bảng có 8 index nghĩa là mỗi `INSERT` thực chất ghi vào 9 chỗ (1 bảng + 8 index). Với bảng ghi nhiều (log, sự kiện, đơn hàng giờ cao điểm), index thừa làm ghi chậm rõ rệt và phình dung lượng đĩa.

> ⚠️ **Lỗi người mới hay gặp:** "Cứ đánh index hết mọi cột cho chắc." Sai. Mỗi index giúp *đọc* nhưng phạt *ghi* và tốn bộ nhớ. Chỉ đánh index cho cột thực sự dùng trong `WHERE`, `JOIN`, `ORDER BY` với tần suất cao.

> 💡 **Ghi nhớ:** Index là sự đánh đổi đọc–ghi. Đọc nhanh hơn ↔ ghi chậm hơn. Hãy đo (`EXPLAIN ANALYZE`) trước và sau, đừng đoán.

## Bài tập: tối ưu truy vấn chậm

Báo cáo "đơn đã thanh toán của một khách trong năm 2026" đang rất chậm. Bảng `orders` có 10 triệu dòng, hiện chỉ có index mặc định trên `id`.

```sql
EXPLAIN ANALYZE
SELECT id, total, created_at
FROM orders
WHERE customer_id = 42
  AND status = 'paid'
  AND created_at >= '2026-01-01'
ORDER BY created_at DESC;
```

Kế hoạch hiện tại:

```
Sort  (cost=251000.00..251020.00 rows=80)
  Sort Key: created_at DESC
  ->  Seq Scan on orders  (cost=0.00..250000.00 rows=80)
        Filter: ((customer_id = 42) AND (status = 'paid') AND (created_at >= '2026-01-01'))
        Rows Removed by Filter: 9999920
Execution Time: 1830.500 ms
```

**Câu hỏi:** Tạo index gì để câu này nhanh? Giải thích thứ tự cột.

---

**Lời giải:**

Phân tích vai trò từng cột trong truy vấn:
- `customer_id = 42` → lọc **bằng** (`=`), tính chọn lọc cao → đặt **đầu tiên**.
- `status = 'paid'` → cũng lọc **bằng** → đặt **thứ hai**.
- `created_at >= ...` → lọc **khoảng** và còn dùng để `ORDER BY` → đặt **cuối**.

Quy tắc: các cột so sánh bằng đặt trước, cột dùng khoảng/sắp xếp đặt sau (vì B-tree đã sắp xếp nên cột cuối có thể phục vụ luôn `ORDER BY`).

```sql
CREATE INDEX idx_orders_report
  ON orders (customer_id, status, created_at);
```

Chạy lại `EXPLAIN ANALYZE`:

```
Index Scan using idx_orders_report on orders  (cost=0.56..40.10 rows=80)
  Index Cond: ((customer_id = 42) AND (status = 'paid')
               AND (created_at >= '2026-01-01'))
Execution Time: 0.230 ms
```

Kết quả:
- `Seq Scan` → `Index Scan`: không còn đọc 10 triệu dòng.
- Bước `Sort` biến mất: index đã sắp xếp sẵn theo `created_at`, nên `ORDER BY created_at DESC` được phục vụ miễn phí (database đọc index theo chiều ngược).
- 1830 ms → 0.23 ms (nhanh ~8000 lần).

**Bẫy cần tránh:** Nếu bạn đặt `(created_at, customer_id, status)`, leftmost prefix là `created_at` (khoảng) — database không thể nhảy chính xác tới `customer_id = 42`, hiệu quả kém hẳn. Thứ tự cột quyết định tất cả.

## Liên hệ sang AWS

Mọi điều trên là kiến thức SQL thuần, áp dụng nguyên vẹn khi bạn chạy database trên AWS:

- **Amazon RDS** (PostgreSQL, MySQL, MariaDB, SQL Server, Oracle): database quan hệ được quản lý. `CREATE INDEX` và `EXPLAIN` hoạt động y hệt. RDS còn có **Performance Insights** — bảng điều khiển trực quan giúp tìm truy vấn chậm và truy vấn chạy nhiều nhất, để biết nên đánh index ở đâu mà không phải tự `EXPLAIN` từng câu.

- **Amazon Aurora** (bản tương thích MySQL/PostgreSQL của AWS): cùng SQL, cùng cách dùng index, nhưng tầng lưu trữ được thiết kế lại cho hiệu năng và độ bền cao. Aurora có thêm các **read replica** để tách tải đọc; index tốt vẫn là điều kiện cần để mỗi replica phản hồi nhanh.

- **Amazon DynamoDB** (NoSQL): tư duy về index **khác hẳn**. Bạn không viết `WHERE` tuỳ ý rồi mong có index. DynamoDB bắt buộc thiết kế quanh **partition key / sort key**, và muốn truy vấn theo thuộc tính khác phải tạo **Global Secondary Index (GSI)** *trước*. Triết lý chung thì giống — "muốn truy vấn nhanh phải có cấu trúc tra cứu phù hợp" — nhưng DynamoDB ép bạn quyết định ngay từ lúc thiết kế, không cho thêm index tuỳ hứng như SQL.

> 💡 **Ghi nhớ:** Đổi từ máy chủ tự quản sang RDS/Aurora *không* tự làm truy vấn nhanh lên. Index kém vẫn chậm trên AWS — chỉ là bạn được trả thêm tiền cho phần cứng to hơn để che lấp. Sửa index trước, nâng cấp máy sau.
