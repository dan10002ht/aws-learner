# Tổng hợp: GROUP BY & subquery

## Mở đầu: từ "liệt kê từng dòng" sang "trả lời câu hỏi"

Ở các bài trước, SELECT giúp bạn **lấy ra từng dòng** dữ liệu. Nhưng sếp hiếm khi hỏi "cho tôi xem 10.000 đơn hàng". Sếp hỏi: *"Tháng này bán được bao nhiêu tiền?"*, *"Khách nào mua nhiều nhất?"*, *"Mỗi danh mục sản phẩm đóng góp bao nhiêu doanh thu?"*.

Đó là những câu hỏi **tổng hợp** (aggregate): gộp nhiều dòng lại thành một con số. Bài này dạy bạn biến hàng nghìn dòng dữ liệu thành những con số biết nói — bằng `COUNT/SUM/AVG`, `GROUP BY`, `HAVING`, subquery, CTE và một chút window function.

> 💡 Ghi nhớ: Câu lệnh hay bắt đầu từ một câu hỏi bằng tiếng Việt. Dịch câu hỏi đó sang SQL, đừng dịch SQL ngược lại.

## Schema xuyên suốt: cửa hàng nhỏ

Cả bài dùng đúng 3 bảng này. Hãy chạy đoạn sau một lần để có dữ liệu thực hành:

```sql
CREATE TABLE customers (
  id        INTEGER PRIMARY KEY,
  name      TEXT,
  city      TEXT
);

CREATE TABLE products (
  id        INTEGER PRIMARY KEY,
  name      TEXT,
  category  TEXT,
  price     NUMERIC
);

CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  product_id  INTEGER REFERENCES products(id),
  quantity    INTEGER,
  ordered_at  DATE
);

INSERT INTO customers VALUES
  (1, 'An',  'Ha Noi'),
  (2, 'Binh','Da Nang'),
  (3, 'Chi', 'Ha Noi'),
  (4, 'Dung','HCM');

INSERT INTO products VALUES
  (1, 'Ban phim',  'Phu kien', 350000),
  (2, 'Chuot',     'Phu kien', 150000),
  (3, 'Man hinh',  'Thiet bi', 2500000),
  (4, 'Laptop',    'Thiet bi', 18000000);

INSERT INTO orders VALUES
  (1, 1, 4, 1, '2026-01-05'),
  (2, 1, 2, 2, '2026-01-09'),
  (3, 2, 1, 3, '2026-02-02'),
  (4, 3, 3, 1, '2026-02-15'),
  (5, 3, 2, 1, '2026-02-20'),
  (6, 1, 1, 1, '2026-03-01'),
  (7, 4, 4, 2, '2026-03-11');
```

`orders` lưu `product_id` và `quantity`, nên **doanh thu một dòng** = `quantity * price` (lấy `price` từ `products`). Ý này lặp lại suốt bài.

## 1. Hàm tổng hợp: COUNT, SUM, AVG, MIN, MAX

Năm hàm tổng hợp cơ bản, mỗi hàm gộp nhiều dòng thành **một** giá trị.

```sql
SELECT
  COUNT(*)      AS so_don,
  SUM(quantity) AS tong_so_luong,
  AVG(quantity) AS trung_binh,
  MIN(quantity) AS it_nhat,
  MAX(quantity) AS nhieu_nhat
FROM orders;
```

Kết quả:

| so_don | tong_so_luong | trung_binh | it_nhat | nhieu_nhat |
|--------|---------------|------------|---------|------------|
| 7      | 11            | 1.57       | 1       | 3          |

Vài điểm quan trọng:

- `COUNT(*)` đếm **số dòng**. `COUNT(cot)` chỉ đếm những dòng có `cot` **khác NULL**.
- `COUNT(DISTINCT cot)` đếm số giá trị **khác nhau**.
- `SUM/AVG` chỉ chạy trên cột số. `MIN/MAX` chạy được cả với ngày tháng và chữ.

```sql
SELECT
  COUNT(*)                    AS tong_don,
  COUNT(DISTINCT customer_id) AS so_khach_da_mua
FROM orders;
```

| tong_don | so_khach_da_mua |
|----------|-----------------|
| 7        | 4               |

> ⚠️ Lỗi người mới hay gặp: `AVG` **bỏ qua** dòng NULL chứ không coi NULL là 0. Nếu 1 trong 4 giá trị là NULL, `AVG` chia cho 3, không phải 4. Muốn coi NULL là 0 thì dùng `AVG(COALESCE(cot, 0))`.

## 2. GROUP BY: tổng hợp theo từng nhóm

`COUNT(*)` ở trên cho **một** con số cho toàn bộ bảng. Thường ta muốn con số đó **cho mỗi nhóm**: mỗi khách, mỗi thành phố, mỗi danh mục. Đó là việc của `GROUP BY`.

Câu hỏi: *"Mỗi khách hàng đã đặt bao nhiêu đơn?"*

```sql
SELECT customer_id, COUNT(*) AS so_don
FROM orders
GROUP BY customer_id
ORDER BY so_don DESC;
```

Kết quả:

| customer_id | so_don |
|-------------|--------|
| 1           | 3      |
| 3           | 2      |
| 2           | 1      |
| 4           | 1      |

Cách `GROUP BY` hoạt động: gom các dòng có cùng `customer_id` vào một "rổ", rồi áp hàm tổng hợp lên từng rổ. 7 dòng đơn được gom thành 4 rổ → 4 dòng kết quả.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 350" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>GROUP BY customer_id — 7 dòng gom thành 4 rổ rồi ra 4 dòng kết quả</title>
  <desc>Bảy dòng orders ở cột trái được gom theo customer_id vào bốn rổ ở giữa (khách 1 có 3 đơn, khách 3 có 2 đơn, khách 2 và 4 mỗi khách 1 đơn); áp COUNT lên mỗi rổ cho ra bốn dòng kết quả ở cột phải.</desc>
  <text x="16" y="22" font-size="13" font-weight="700" fill="currentColor">7 dòng orders</text>
  <text x="300" y="22" font-size="13" font-weight="700" fill="currentColor">GROUP BY customer_id → 4 rổ</text>
  <text x="600" y="22" font-size="13" font-weight="700" fill="currentColor">4 dòng kết quả</text>
  <g font-size="11" fill="currentColor">
    <rect x="16" y="34" width="150" height="26" rx="5" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/><text x="26" y="51">id=1 · cust 1</text>
    <rect x="16" y="64" width="150" height="26" rx="5" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/><text x="26" y="81">id=2 · cust 1</text>
    <rect x="16" y="94" width="150" height="26" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/><text x="26" y="111">id=3 · cust 2</text>
    <rect x="16" y="124" width="150" height="26" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/><text x="26" y="141">id=4 · cust 3</text>
    <rect x="16" y="154" width="150" height="26" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/><text x="26" y="171">id=5 · cust 3</text>
    <rect x="16" y="184" width="150" height="26" rx="5" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/><text x="26" y="201">id=6 · cust 1</text>
    <rect x="16" y="214" width="150" height="26" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/><text x="26" y="231">id=7 · cust 4</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.4" fill="none">
    <path d="M166 47 C220 47 230 60 286 60"/>
    <path d="M166 77 C220 77 230 60 286 60"/>
    <path d="M166 201 C220 201 230 60 286 60"/>
    <path d="M166 107 C230 107 240 122 286 122"/>
    <path d="M166 137 C220 137 240 175 286 175"/>
    <path d="M166 167 C220 167 240 175 286 175"/>
    <path d="M166 227 C230 227 250 232 286 232"/>
  </g>
  <g font-size="11" fill="currentColor">
    <rect x="286" y="44" width="180" height="34" rx="6" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/><text x="298" y="65" font-weight="700">Rổ cust 1 · 3 đơn</text>
    <rect x="286" y="105" width="180" height="34" rx="6" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25"/><text x="298" y="126" font-weight="700">Rổ cust 2 · 1 đơn</text>
    <rect x="286" y="158" width="180" height="34" rx="6" fill="#f59e0b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25"/><text x="298" y="179" font-weight="700">Rổ cust 3 · 2 đơn</text>
    <rect x="286" y="215" width="180" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25"/><text x="298" y="236" font-weight="700">Rổ cust 4 · 1 đơn</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.45" fill="none">
    <defs><marker id="gbArr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker></defs>
    <line x1="466" y1="61" x2="556" y2="61" marker-end="url(#gbArr)"/>
    <line x1="466" y1="122" x2="556" y2="122" marker-end="url(#gbArr)"/>
    <line x1="466" y1="175" x2="556" y2="175" marker-end="url(#gbArr)"/>
    <line x1="466" y1="232" x2="556" y2="232" marker-end="url(#gbArr)"/>
  </g>
  <text x="495" y="56" font-size="10" fill="currentColor" opacity="0.7">COUNT(*)</text>
  <g font-size="11" fill="currentColor">
    <rect x="556" y="46" width="148" height="30" rx="5" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/><text x="566" y="65">cust 1 → so_don 3</text>
    <rect x="556" y="107" width="148" height="30" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/><text x="566" y="126">cust 2 → so_don 1</text>
    <rect x="556" y="160" width="148" height="30" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/><text x="566" y="179">cust 3 → so_don 2</text>
    <rect x="556" y="217" width="148" height="30" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/><text x="566" y="236">cust 4 → so_don 1</text>
  </g>
  <text x="16" y="300" font-size="11" fill="currentColor" opacity="0.7">Mỗi rổ → đúng 1 dòng kết quả. Hàm tổng hợp (COUNT/SUM/AVG) áp riêng cho từng rổ.</text>
</svg>

**Quy tắc vàng:** mọi cột xuất hiện trong `SELECT` mà **không** nằm trong hàm tổng hợp thì **bắt buộc** phải có trong `GROUP BY`.

```sql
-- Doanh thu theo thanh pho: phai JOIN de lay price va city
SELECT c.city,
       SUM(o.quantity * p.price) AS doanh_thu
FROM orders o
JOIN customers c ON c.id = o.customer_id
JOIN products  p ON p.id = o.product_id
GROUP BY c.city
ORDER BY doanh_thu DESC;
```

Kết quả:

| city    | doanh_thu |
|---------|-----------|
| HCM     | 36000000  |
| Ha Noi  | 21000000  |
| Da Nang | 1050000   |

> ⚠️ Lỗi người mới hay gặp: viết `SELECT c.city, p.name, SUM(...)` nhưng `GROUP BY c.city`. Một số database báo lỗi, một số (như SQLite/MySQL chế độ lỏng) trả về `p.name` ngẫu nhiên trong rổ — sai âm thầm. Hãy luôn đưa **mọi** cột không-tổng-hợp vào `GROUP BY`.

## 3. WHERE vs HAVING: lọc trước hay lọc sau?

Cả hai đều "lọc", nhưng lọc ở **hai thời điểm khác nhau**:

- `WHERE` lọc **từng dòng**, **trước khi** gom nhóm.
- `HAVING` lọc **từng nhóm**, **sau khi** gom nhóm (dùng được kết quả của `SUM/COUNT...`).

Câu hỏi: *"Khách nào có tổng doanh thu trên 10 triệu?"*

```sql
SELECT o.customer_id,
       SUM(o.quantity * p.price) AS doanh_thu
FROM orders o
JOIN products p ON p.id = o.product_id
GROUP BY o.customer_id
HAVING SUM(o.quantity * p.price) > 10000000
ORDER BY doanh_thu DESC;
```

Kết quả:

| customer_id | doanh_thu |
|-------------|-----------|
| 4           | 36000000  |
| 1           | 18500000  |

Thử dùng `WHERE doanh_thu > 10000000` thay cho `HAVING` → **báo lỗi**, vì lúc `WHERE` chạy thì `SUM` còn chưa được tính.

Dùng cả hai cùng lúc cũng được — `WHERE` thu hẹp dữ liệu, `HAVING` lọc nhóm:

```sql
-- Chi xet don tu thang 2 tro di, roi loc nhom >= 2 don
SELECT customer_id, COUNT(*) AS so_don
FROM orders
WHERE ordered_at >= '2026-02-01'
GROUP BY customer_id
HAVING COUNT(*) >= 2;
```

| customer_id | so_don |
|-------------|--------|
| 3           | 2      |

> 💡 Ghi nhớ: thứ tự thực thi logic là `FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY`. Hiểu thứ tự này thì không bao giờ nhầm WHERE với HAVING.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 230" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Thứ tự thực thi logic của một câu truy vấn: FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY</title>
  <desc>Pipeline trái sang phải sáu bước: FROM lấy bảng và JOIN, WHERE lọc từng dòng trước khi gom, GROUP BY gom thành nhóm, HAVING lọc từng nhóm sau khi gom, SELECT chọn cột và tính hàm tổng hợp, ORDER BY sắp xếp. WHERE lọc trước GROUP BY, HAVING lọc sau.</desc>
  <text x="16" y="22" font-size="13" font-weight="700" fill="currentColor">Thứ tự thực thi logic của truy vấn</text>
  <defs><marker id="eoArr" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker></defs>
  <g font-size="12">
    <rect x="16" y="40" width="104" height="56" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="68" y="62" font-weight="700" text-anchor="middle" fill="currentColor">FROM</text>
    <text x="68" y="80" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">lấy bảng + JOIN</text>
    <rect x="138" y="40" width="104" height="56" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="190" y="62" font-weight="700" text-anchor="middle" fill="currentColor">WHERE</text>
    <text x="190" y="80" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">lọc từng DÒNG</text>
    <rect x="260" y="40" width="104" height="56" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="312" y="62" font-weight="700" text-anchor="middle" fill="currentColor">GROUP BY</text>
    <text x="312" y="80" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">gom thành nhóm</text>
    <rect x="382" y="40" width="104" height="56" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="434" y="62" font-weight="700" text-anchor="middle" fill="currentColor">HAVING</text>
    <text x="434" y="80" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">lọc từng NHÓM</text>
    <rect x="504" y="40" width="104" height="56" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="556" y="62" font-weight="700" text-anchor="middle" fill="currentColor">SELECT</text>
    <text x="556" y="80" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">chọn cột + SUM</text>
    <rect x="626" y="40" width="78" height="56" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="665" y="62" font-weight="700" text-anchor="middle" fill="currentColor">ORDER BY</text>
    <text x="665" y="80" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">sắp xếp</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <line x1="120" y1="68" x2="136" y2="68" marker-end="url(#eoArr)"/>
    <line x1="242" y1="68" x2="258" y2="68" marker-end="url(#eoArr)"/>
    <line x1="364" y1="68" x2="380" y2="68" marker-end="url(#eoArr)"/>
    <line x1="486" y1="68" x2="502" y2="68" marker-end="url(#eoArr)"/>
    <line x1="608" y1="68" x2="624" y2="68" marker-end="url(#eoArr)"/>
  </g>
  <g stroke="currentColor" stroke-opacity="0.4" fill="none">
    <path d="M190 96 v22 h66" marker-end="url(#eoArr)"/>
    <path d="M434 96 v44 h-66" marker-end="url(#eoArr)"/>
  </g>
  <text x="16" y="124" font-size="11" fill="currentColor" font-weight="700">WHERE: lọc TRƯỚC khi gom</text>
  <text x="704" y="166" font-size="11" text-anchor="end" fill="currentColor" font-weight="700">HAVING: lọc SAU khi gom</text>
  <text x="16" y="195" font-size="11" fill="currentColor" opacity="0.72">WHERE chạy lúc SUM/COUNT chưa tồn tại → không lọc được theo kết quả tổng hợp. HAVING thì có.</text>
  <text x="16" y="214" font-size="11" fill="currentColor" opacity="0.72">Lưu ý: SELECT chạy gần cuối, nên bí danh cột đặt ở SELECT thường chưa dùng được trong WHERE/HAVING.</text>
</svg>

## 4. Subquery: câu lệnh lồng trong câu lệnh

**Subquery** (truy vấn con) là một SELECT đặt bên trong một SELECT khác. Nó xuất hiện ở 3 chỗ.

### 4.1. Subquery trong WHERE

Câu hỏi: *"Liệt kê khách đã từng đặt sản phẩm thuộc danh mục 'Thiet bi'."*

```sql
SELECT name
FROM customers
WHERE id IN (
  SELECT o.customer_id
  FROM orders o
  JOIN products p ON p.id = o.product_id
  WHERE p.category = 'Thiet bi'
);
```

Kết quả:

| name |
|------|
| An   |
| Chi  |
| Dung |

Subquery bên trong chạy trước, trả về tập `customer_id`; câu ngoài lọc `customers` theo tập đó. Dùng `IN (...)` cho nhiều giá trị, dùng `= (...)` khi chắc chắn subquery trả về đúng **một** dòng.

### 4.2. Subquery trong FROM (bảng tạm)

Khi cần tổng hợp **hai tầng** — ví dụ "doanh thu trung bình của mỗi khách" — ta gom ở tầng trong rồi tính tiếp ở tầng ngoài:

```sql
SELECT AVG(doanh_thu) AS doanh_thu_tb_moi_khach
FROM (
  SELECT customer_id,
         SUM(o.quantity * p.price) AS doanh_thu
  FROM orders o
  JOIN products p ON p.id = o.product_id
  GROUP BY customer_id
) AS theo_khach;
```

| doanh_thu_tb_moi_khach |
|------------------------|
| 14637500               |

> ⚠️ Lỗi người mới hay gặp: subquery trong `FROM` **bắt buộc** phải có bí danh (`AS theo_khach`). Quên đặt tên là báo lỗi cú pháp ngay.

### 4.3. Subquery trong SELECT (giá trị từng dòng)

Đặt subquery ngay trong danh sách cột để gắn một con số tổng hợp vào mỗi dòng:

```sql
SELECT name,
       (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS so_don
FROM customers c;
```

| name | so_don |
|------|--------|
| An   | 3      |
| Binh | 1      |
| Chi  | 2      |
| Dung | 1      |

Đây là **subquery tương quan** (correlated): nó tham chiếu `c.id` của dòng ngoài, nên chạy lại cho **mỗi** dòng. Tiện nhưng dễ chậm trên dữ liệu lớn.

## 5. CTE: đặt tên cho bước trung gian với WITH

Subquery lồng nhiều tầng đọc rất rối. **CTE** (Common Table Expression) với `WITH` cho phép tách từng bước ra, đặt tên rõ ràng — như đặt biến trung gian khi lập trình.

Viết lại ví dụ "doanh thu trung bình mỗi khách" cho dễ đọc:

```sql
WITH doanh_thu_khach AS (
  SELECT o.customer_id,
         SUM(o.quantity * p.price) AS doanh_thu
  FROM orders o
  JOIN products p ON p.id = o.product_id
  GROUP BY o.customer_id
)
SELECT AVG(doanh_thu) AS trung_binh,
       MAX(doanh_thu) AS cao_nhat
FROM doanh_thu_khach;
```

Kết quả:

| trung_binh | cao_nhat |
|------------|----------|
| 14637500   | 36000000 |

Bạn có thể khai báo **nhiều** CTE, cách nhau bằng dấu phẩy, và CTE sau dùng được CTE trước:

```sql
WITH doanh_thu_khach AS (
  SELECT o.customer_id,
         SUM(o.quantity * p.price) AS doanh_thu
  FROM orders o
  JOIN products p ON p.id = o.product_id
  GROUP BY o.customer_id
),
khach_vip AS (
  SELECT customer_id
  FROM doanh_thu_khach
  WHERE doanh_thu > 15000000
)
SELECT c.name
FROM khach_vip k
JOIN customers c ON c.id = k.customer_id;
```

| name |
|------|
| An   |
| Dung |

> 💡 Ghi nhớ: CTE và subquery-trong-FROM cho cùng kết quả. Hãy ưu tiên CTE khi câu lệnh dài hoặc tái sử dụng bước trung gian — code dễ đọc, dễ sửa hơn nhiều.

## 6. Giới thiệu window function

Hàm tổng hợp gộp nhiều dòng thành **một**. **Window function** tính toán tổng hợp **nhưng vẫn giữ nguyên từng dòng** — mỗi dòng có thêm một cột "nhìn sang các dòng khác". Cú pháp: `HAM(...) OVER (...)`.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>GROUP BY gộp nhiều dòng thành một, còn PARTITION BY chia nhóm nhưng giữ nguyên từng dòng</title>
  <desc>So sánh hai bên. Bên trái GROUP BY category: bốn dòng sản phẩm gộp lại còn hai dòng kết quả, mỗi danh mục một dòng. Bên phải window function PARTITION BY category: vẫn giữ đủ bốn dòng nhưng thêm một cột tính toán theo nhóm.</desc>
  <text x="180" y="22" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">GROUP BY category</text>
  <text x="180" y="40" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">GỘP nhiều dòng → 1 dòng/nhóm</text>
  <text x="540" y="22" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">OVER (PARTITION BY category)</text>
  <text x="540" y="40" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">GIỮ nguyên từng dòng + thêm cột</text>
  <line x1="360" y1="50" x2="360" y2="300" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 4"/>
  <g font-size="11" fill="currentColor">
    <text x="16" y="66" font-size="10.5" opacity="0.65">Đầu vào: 4 sản phẩm</text>
    <rect x="16" y="72" width="320" height="24" rx="4" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.18"/><text x="26" y="88">Phu kien · Ban phim · 350000</text>
    <rect x="16" y="98" width="320" height="24" rx="4" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.18"/><text x="26" y="114">Phu kien · Chuot · 150000</text>
    <rect x="16" y="124" width="320" height="24" rx="4" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/><text x="26" y="140">Thiet bi · Laptop · 18000000</text>
    <rect x="16" y="150" width="320" height="24" rx="4" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/><text x="26" y="166">Thiet bi · Man hinh · 2500000</text>
  </g>
  <g font-size="11" fill="currentColor">
    <text x="384" y="66" font-size="10.5" opacity="0.65">Cùng 4 sản phẩm đầu vào</text>
    <rect x="384" y="72" width="320" height="24" rx="4" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.18"/><text x="394" y="88">Phu kien · Ban phim · 350000</text>
    <rect x="384" y="98" width="320" height="24" rx="4" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.18"/><text x="394" y="114">Phu kien · Chuot · 150000</text>
    <rect x="384" y="124" width="320" height="24" rx="4" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/><text x="394" y="140">Thiet bi · Laptop · 18000000</text>
    <rect x="384" y="150" width="320" height="24" rx="4" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/><text x="394" y="166">Thiet bi · Man hinh · 2500000</text>
  </g>
  <defs><marker id="cmpArr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker></defs>
  <line x1="180" y1="174" x2="180" y2="208" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#cmpArr)"/>
  <line x1="540" y1="174" x2="540" y2="208" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#cmpArr)"/>
  <g font-size="11" fill="currentColor">
    <text x="16" y="226" font-size="10.5" opacity="0.65">Kết quả: 2 dòng (COUNT mỗi danh mục)</text>
    <rect x="16" y="232" width="320" height="26" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/><text x="26" y="249" font-weight="700">Phu kien → 2 sản phẩm</text>
    <rect x="16" y="262" width="320" height="26" rx="5" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25"/><text x="26" y="279" font-weight="700">Thiet bi → 2 sản phẩm</text>
  </g>
  <g font-size="10.5" fill="currentColor">
    <text x="384" y="226" font-size="10.5" opacity="0.65">Kết quả: vẫn 4 dòng + cột so_trong_nhom</text>
    <rect x="384" y="232" width="320" height="16" rx="3" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.18"/><text x="392" y="244">Phu kien · Ban phim · 350000 · <tspan font-weight="700">2</tspan></text>
    <rect x="384" y="250" width="320" height="16" rx="3" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.18"/><text x="392" y="262">Phu kien · Chuot · 150000 · <tspan font-weight="700">2</tspan></text>
    <rect x="384" y="268" width="320" height="16" rx="3" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/><text x="392" y="280">Thiet bi · Laptop · 18000000 · <tspan font-weight="700">2</tspan></text>
    <rect x="384" y="286" width="320" height="16" rx="3" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/><text x="392" y="298">Thiet bi · Man hinh · 2500000 · <tspan font-weight="700">2</tspan></text>
  </g>
</svg>

### 6.1. ROW_NUMBER và RANK: đánh số / xếp hạng

Câu hỏi: *"Trong mỗi danh mục, xếp hạng sản phẩm theo giá giảm dần."*

```sql
SELECT category, name, price,
       ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) AS so_thu_tu,
       RANK()       OVER (PARTITION BY category ORDER BY price DESC) AS hang
FROM products;
```

Kết quả:

| category  | name     | price    | so_thu_tu | hang |
|-----------|----------|----------|-----------|------|
| Phu kien  | Ban phim | 350000   | 1         | 1    |
| Phu kien  | Chuot    | 150000   | 2         | 2    |
| Thiet bi  | Laptop   | 18000000 | 1         | 1    |
| Thiet bi  | Man hinh | 2500000  | 2         | 2    |

- `PARTITION BY category`: chia dữ liệu thành các nhóm (giống `GROUP BY` nhưng không gộp dòng).
- `ORDER BY price DESC`: thứ tự xếp hạng trong mỗi nhóm.
- Khác nhau: `ROW_NUMBER` luôn 1,2,3 (không trùng); `RANK` cho hai dòng bằng nhau **cùng hạng** rồi nhảy số (1,1,3).

### 6.2. Running total: cộng dồn theo thời gian

Câu hỏi: *"Doanh thu cộng dồn theo từng đơn, sắp theo ngày."*

```sql
SELECT o.id, o.ordered_at,
       o.quantity * p.price AS doanh_thu_don,
       SUM(o.quantity * p.price) OVER (ORDER BY o.ordered_at) AS cong_don
FROM orders o
JOIN products p ON p.id = o.product_id
ORDER BY o.ordered_at;
```

Kết quả:

| id | ordered_at | doanh_thu_don | cong_don |
|----|------------|---------------|----------|
| 1  | 2026-01-05 | 18000000      | 18000000 |
| 2  | 2026-01-09 | 300000        | 18300000 |
| 3  | 2026-02-02 | 1050000       | 19350000 |
| 4  | 2026-02-15 | 2500000       | 21850000 |
| 5  | 2026-02-20 | 150000        | 22000000 |
| 6  | 2026-03-01 | 350000        | 22350000 |
| 7  | 2026-03-11 | 36000000      | 58350000 |

`SUM(...) OVER (ORDER BY ...)` cộng dồn từ dòng đầu đến dòng hiện tại — cực kỳ hữu ích cho báo cáo tăng trưởng.

> ⚠️ Lỗi người mới hay gặp: không được lồng window function bên trong hàm tổng hợp, cũng không dùng được trong `WHERE`/`HAVING`. Muốn lọc theo kết quả window, hãy bọc nó trong một CTE rồi lọc ở câu ngoài.

## Bài tập: dựng báo cáo doanh thu

Dùng đúng schema cửa hàng ở đầu bài. Hãy tự viết trước khi xem lời giải.

**Bài 1.** Tính tổng doanh thu toàn cửa hàng (một con số duy nhất).

**Bài 2.** Doanh thu theo từng danh mục sản phẩm, sắp giảm dần.

**Bài 3.** Liệt kê các khách có **từ 2 đơn trở lên**, kèm số đơn.

**Bài 4.** Tìm tên sản phẩm có giá cao hơn giá trung bình của tất cả sản phẩm.

**Bài 5.** Dùng CTE: tính doanh thu mỗi khách, rồi xếp hạng khách theo doanh thu giảm dần bằng `RANK()`.

### Lời giải

**Bài 1:**

```sql
SELECT SUM(o.quantity * p.price) AS tong_doanh_thu
FROM orders o
JOIN products p ON p.id = o.product_id;
```

Kết quả: `58350000`.

**Bài 2:**

```sql
SELECT p.category,
       SUM(o.quantity * p.price) AS doanh_thu
FROM orders o
JOIN products p ON p.id = o.product_id
GROUP BY p.category
ORDER BY doanh_thu DESC;
```

| category | doanh_thu |
|----------|-----------|
| Thiet bi | 56500000  |
| Phu kien | 1850000   |

**Bài 3:**

```sql
SELECT c.name, COUNT(*) AS so_don
FROM orders o
JOIN customers c ON c.id = o.customer_id
GROUP BY c.name
HAVING COUNT(*) >= 2
ORDER BY so_don DESC;
```

| name | so_don |
|------|--------|
| An   | 3      |
| Chi  | 2      |

**Bài 4:**

```sql
SELECT name, price
FROM products
WHERE price > (SELECT AVG(price) FROM products);
```

Giá trung bình = `5250000`, nên kết quả:

| name   | price    |
|--------|----------|
| Laptop | 18000000 |

**Bài 5:**

```sql
WITH doanh_thu_khach AS (
  SELECT o.customer_id,
         SUM(o.quantity * p.price) AS doanh_thu
  FROM orders o
  JOIN products p ON p.id = o.product_id
  GROUP BY o.customer_id
)
SELECT c.name,
       d.doanh_thu,
       RANK() OVER (ORDER BY d.doanh_thu DESC) AS hang
FROM doanh_thu_khach d
JOIN customers c ON c.id = d.customer_id
ORDER BY hang;
```

| name | doanh_thu | hang |
|------|-----------|------|
| Dung | 36000000  | 1    |
| An   | 18500000  | 2    |
| Chi  | 2650000   | 3    |
| Binh | 1050000   | 4    |

## Liên hệ sang AWS

Những câu `GROUP BY`, subquery, CTE, window function bạn vừa học **chạy y hệt** trên các database quản lý của AWS — bạn chỉ việc trỏ ứng dụng vào, không phải tự vận hành máy chủ:

- **Amazon RDS** — chạy đúng các database SQL quen thuộc (PostgreSQL, MySQL, MariaDB, SQL Server, Oracle) dưới dạng dịch vụ quản lý. AWS lo backup, vá lỗi, thay phần cứng hỏng. Mọi câu trong bài này chạy nguyên xi trên RDS PostgreSQL/MySQL.
- **Amazon Aurora** — phiên bản tương thích MySQL/PostgreSQL do AWS tự thiết kế, nhanh hơn và tự co giãn. Cùng cú pháp `WITH`, window function — hợp cho báo cáo doanh thu trên dữ liệu lớn. Có thêm **Aurora Serverless** tự bật/tắt theo tải.
- **Amazon Redshift** — kho dữ liệu (data warehouse) chuyên cho phân tích: chính là nơi các truy vấn `GROUP BY` + window function trên hàng tỷ dòng được tối ưu để chạy nhanh. Khi báo cáo doanh thu lớn dần, người ta chuyển phần phân tích sang Redshift.
- **Amazon DynamoDB** — database **NoSQL**, **không** dùng SQL và **không** có `JOIN`/`GROUP BY` kiểu này. Nó cực nhanh cho tra cứu theo khoá (ví dụ "lấy giỏ hàng của user X"), nhưng tổng hợp/báo cáo thì phải xử lý ở tầng khác. Đây là lời nhắc quan trọng: chọn đúng loại database theo bài toán — SQL để phân tích, NoSQL để tra cứu khoá tốc độ cao.

> 💡 Ghi nhớ: kỹ năng SQL không phụ thuộc nhà cung cấp. Học chắc `GROUP BY`/CTE/window function một lần, bạn dùng được trên RDS, Aurora, Redshift và cả database tự dựng — chỉ phần *vận hành* là khác nhau.
