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
