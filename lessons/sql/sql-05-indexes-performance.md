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

```
                 [ M ]
                /     \
          [ D  H ]   [ R  W ]
          /  |  \     /  |  \
        ...lá chứa giá trị thật + con trỏ tới dòng...
```

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
