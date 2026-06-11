# SELECT cơ bản: lấy dữ liệu

Trong bài này bạn sẽ học cách **đọc dữ liệu** ra khỏi một cơ sở dữ liệu — kỹ năng bạn sẽ dùng nhiều nhất khi làm việc thật. Triết lý của bài là **học qua làm**: mỗi khái niệm đi kèm một câu lệnh `SELECT` chạy được và một bảng kết quả minh hoạ. Bạn nên gõ lại từng câu (xem mục "Chạy thử ở đâu?" cuối phần đầu) thay vì chỉ đọc.

Chúng ta dùng **một cửa hàng online** làm ví dụ xuyên suốt cả khoá: khách hàng, sản phẩm và đơn hàng.

## Database, bảng, cột, hàng là gì?

Hãy hình dung một **bảng tính Excel** khổng lồ và có quy tắc chặt chẽ:

- **Database** (cơ sở dữ liệu): cả file Excel — gồm nhiều sheet liên quan tới nhau. Ví dụ: database `shop`.
- **Bảng** (table): một sheet, ví dụ sheet `customers`. Mỗi bảng lưu **một loại sự vật** (khách hàng, sản phẩm, đơn hàng...).
- **Cột** (column): một thuộc tính, ví dụ `email`, `price`. Mỗi cột có một **kiểu dữ liệu** cố định (số, chuỗi, ngày...).
- **Hàng** (row): một bản ghi cụ thể, ví dụ "khách hàng tên Lan ở Hà Nội".

Đây là schema (cấu trúc) mà ta sẽ dùng cả bài. Bạn chưa cần thuộc, cứ ngó lại khi cần:

```sql
-- Bảng khách hàng
CREATE TABLE customers (
  id         INTEGER PRIMARY KEY,
  name       TEXT,
  city       TEXT,
  age        INTEGER,
  email      TEXT
);

-- Bảng sản phẩm
CREATE TABLE products (
  id         INTEGER PRIMARY KEY,
  name       TEXT,
  category   TEXT,
  price      INTEGER   -- đơn vị: nghìn đồng
);

-- Bảng đơn hàng
CREATE TABLE orders (
  id           INTEGER PRIMARY KEY,
  customer_id  INTEGER,   -- trỏ tới customers.id
  product_id   INTEGER,   -- trỏ tới products.id
  quantity     INTEGER,
  order_date   TEXT       -- dạng 'YYYY-MM-DD'
);
```

Dữ liệu mẫu trong bảng `customers` (ta sẽ tham chiếu suốt bài):

| id | name  | city    | age | email         |
|----|-------|---------|-----|---------------|
| 1  | Lan   | Hà Nội  | 28  | lan@mail.com  |
| 2  | Minh  | Đà Nẵng | 35  | minh@mail.com |
| 3  | Hoa   | Hà Nội  | 22  | NULL          |
| 4  | Tuấn  | TP HCM  | 41  | tuan@mail.com |
| 5  | Bình  | Đà Nẵng | 19  | binh@mail.com |
| 6  | Chi   | TP HCM  | 33  | NULL          |

> 💡 Ghi nhớ: **bảng = một loại sự vật, cột = thuộc tính, hàng = một bản ghi cụ thể.** Mọi câu truy vấn đều xoay quanh việc "chọn hàng nào, lấy cột nào".

**Chạy thử ở đâu?** Cách nhanh nhất là vào [sqliteonline.com](https://sqliteonline.com) hoặc [db-fiddle.com](https://www.db-fiddle.com), dán đoạn `CREATE TABLE` ở trên cùng vài câu `INSERT`, rồi gõ thử từng ví dụ trong bài.

## SELECT: chọn cột muốn lấy

Câu lệnh `SELECT` nói với database: "cho tôi xem dữ liệu". Cấu trúc đơn giản nhất là liệt kê **tên các cột** muốn lấy, rồi `FROM` tên bảng:

```sql
SELECT name, city
FROM customers;
```

Kết quả — chỉ 2 cột bạn yêu cầu, theo đúng thứ tự bạn viết:

| name | city    |
|------|---------|
| Lan  | Hà Nội  |
| Minh | Đà Nẵng |
| Hoa  | Hà Nội  |
| Tuấn | TP HCM  |
| Bình | Đà Nẵng |
| Chi  | TP HCM  |

Câu lệnh đọc gần như tiếng Anh tự nhiên: "SELECT (chọn) name, city FROM (từ) customers". Mọi câu `SELECT` đều kết thúc bằng dấu chấm phẩy `;`.

## SELECT *: lấy tất cả các cột

Dấu `*` nghĩa là "mọi cột". Tiện khi muốn xem nhanh toàn bộ bảng:

```sql
SELECT *
FROM products;
```

| id | name      | category | price |
|----|-----------|----------|-------|
| 1  | Bàn phím  | Phụ kiện | 350   |
| 2  | Chuột     | Phụ kiện | 150   |
| 3  | Màn hình  | Màn hình | 2500  |
| 4  | Tai nghe  | Âm thanh | 800   |
| 5  | Webcam    | Phụ kiện | 600   |

> ⚠️ Lỗi người mới hay gặp: lạm dụng `SELECT *` trong code thật. Khi bảng có hàng chục cột, lấy hết là **lãng phí** và dễ vỡ khi schema đổi. Dùng `*` để thăm dò, nhưng trong ứng dụng hãy liệt kê đúng cột cần.

## WHERE: lọc hàng theo điều kiện

`SELECT` chọn cột; `WHERE` chọn **hàng**. Chỉ những hàng làm điều kiện đúng (TRUE) mới được trả về.

### So sánh bằng (=)

```sql
SELECT name, city
FROM customers
WHERE city = 'Hà Nội';
```

| name | city   |
|------|--------|
| Lan  | Hà Nội |
| Hoa  | Hà Nội |

> ⚠️ Lỗi người mới hay gặp: trong SQL, so sánh bằng dùng **một** dấu `=` (không phải `==` như nhiều ngôn ngữ lập trình). Và chuỗi văn bản phải đặt trong **dấu nháy đơn**: `'Hà Nội'`, không phải nháy kép.

### Lớn hơn, nhỏ hơn

Với cột số ta dùng `>`, `<`, `>=`, `<=`, `<>` (khác):

```sql
SELECT name, age
FROM customers
WHERE age >= 30;
```

| name | age |
|------|-----|
| Minh | 35  |
| Tuấn | 41  |
| Chi  | 33  |

### BETWEEN: trong khoảng

`BETWEEN a AND b` lấy giá trị **từ a tới b, bao gồm cả hai đầu**:

```sql
SELECT name, age
FROM customers
WHERE age BETWEEN 20 AND 35;
```

| name | age |
|------|-----|
| Lan  | 28  |
| Minh | 35  |
| Hoa  | 22  |
| Chi  | 33  |

### IN: thuộc một danh sách

`IN (...)` thay cho nhiều điều kiện `OR` bằng nhau, gọn hơn:

```sql
SELECT name, city
FROM customers
WHERE city IN ('Hà Nội', 'Đà Nẵng');
```

| name | city    |
|------|---------|
| Lan  | Hà Nội  |
| Minh | Đà Nẵng |
| Hoa  | Hà Nội  |
| Bình | Đà Nẵng |

### LIKE: khớp mẫu chuỗi

`LIKE` tìm chuỗi theo **khuôn mẫu**. Hai ký tự đặc biệt:

- `%` — thay cho **bất kỳ số ký tự nào** (kể cả 0 ký tự).
- `_` — thay cho **đúng một ký tự**.

```sql
-- Tên bắt đầu bằng chữ 'H'
SELECT name
FROM customers
WHERE name LIKE 'H%';
```

| name |
|------|
| Hoa  |

```sql
-- Email kết thúc bằng '@mail.com'
SELECT name, email
FROM customers
WHERE email LIKE '%@mail.com';
```

| name | email         |
|------|---------------|
| Lan  | lan@mail.com  |
| Minh | minh@mail.com |
| Tuấn | tuan@mail.com |
| Bình | binh@mail.com |

> 💡 Ghi nhớ: `'H%'` = bắt đầu bằng H; `'%a'` = kết thúc bằng a; `'%an%'` = chứa "an" ở bất kỳ đâu.

## AND / OR / NOT: kết hợp điều kiện

Một câu `WHERE` có thể có nhiều điều kiện ghép lại:

- `AND` — **tất cả** điều kiện phải đúng.
- `OR` — **ít nhất một** điều kiện đúng.
- `NOT` — đảo ngược điều kiện.

```sql
-- Khách ở Hà Nội VÀ từ 25 tuổi trở lên
SELECT name, city, age
FROM customers
WHERE city = 'Hà Nội' AND age >= 25;
```

| name | city   | age |
|------|--------|-----|
| Lan  | Hà Nội | 28  |

```sql
-- Khách ở Đà Nẵng HOẶC TP HCM, nhưng KHÔNG phải tuổi teen
SELECT name, city
FROM customers
WHERE (city = 'Đà Nẵng' OR city = 'TP HCM')
  AND NOT age < 20;
```

| name | city    |
|------|---------|
| Minh | Đà Nẵng |
| Tuấn | TP HCM  |
| Chi  | TP HCM  |

(Bình ở Đà Nẵng nhưng 19 tuổi nên `NOT age < 20` loại bạn ấy ra.)

> ⚠️ Lỗi người mới hay gặp: trộn `AND` và `OR` mà không dùng ngoặc. `AND` được tính trước `OR`, nên kết quả dễ sai ý bạn. Hãy đặt ngoặc cho rõ ràng:
> ```sql
> WHERE (city = 'Hà Nội' OR city = 'Đà Nẵng') AND age >= 30;
> ```

## ORDER BY: sắp xếp kết quả

Mặc định database trả về hàng theo thứ tự **không xác định**. Muốn sắp xếp, dùng `ORDER BY`:

- `ASC` — tăng dần (mặc định, có thể bỏ).
- `DESC` — giảm dần.

```sql
SELECT name, age
FROM customers
ORDER BY age DESC;
```

| name | age |
|------|-----|
| Tuấn | 41  |
| Minh | 35  |
| Chi  | 33  |
| Lan  | 28  |
| Hoa  | 22  |
| Bình | 19  |

Sắp xếp theo nhiều cột: phân tách bằng dấu phẩy. Database sắp theo cột đầu trước, hoà thì xét cột sau:

```sql
SELECT name, city, age
FROM customers
ORDER BY city ASC, age DESC;
```

## LIMIT / OFFSET: lấy một phần kết quả

`LIMIT n` chỉ lấy **n hàng đầu tiên**. Rất hữu ích khi bảng có hàng triệu dòng — bạn không muốn kéo hết về.

```sql
-- 3 khách lớn tuổi nhất
SELECT name, age
FROM customers
ORDER BY age DESC
LIMIT 3;
```

| name | age |
|------|-----|
| Tuấn | 41  |
| Minh | 35  |
| Chi  | 33  |

`OFFSET m` bỏ qua m hàng đầu rồi mới lấy — dùng để **phân trang** (trang 2, trang 3...):

```sql
-- Bỏ qua 3 hàng đầu, lấy 3 hàng tiếp theo (trang 2)
SELECT name, age
FROM customers
ORDER BY age DESC
LIMIT 3 OFFSET 3;
```

| name | age |
|------|-----|
| Lan  | 28  |
| Hoa  | 22  |
| Bình | 19  |

> 💡 Ghi nhớ: luôn dùng `ORDER BY` đi kèm `LIMIT`. Nếu không sắp xếp, "3 hàng đầu" là 3 hàng **bất kỳ** — chạy lại có thể ra khác.

## DISTINCT: loại bỏ trùng lặp

`DISTINCT` chỉ giữ lại các giá trị **khác nhau**, bỏ trùng:

```sql
SELECT DISTINCT city
FROM customers;
```

| city    |
|---------|
| Hà Nội  |
| Đà Nẵng |
| TP HCM  |

Không có `DISTINCT`, câu này trả về 6 hàng (mỗi khách một dòng, "Hà Nội" lặp lại). Với `DISTINCT` ta chỉ thấy 3 thành phố duy nhất.

## NULL và IS NULL: giá trị "trống"

`NULL` nghĩa là **không có giá trị / chưa biết** — khác hẳn với số 0 hay chuỗi rỗng. Trong bảng `customers`, Hoa và Chi có `email` là `NULL`.

> ⚠️ Lỗi người mới hay gặp: dùng `= NULL` để tìm ô trống. Sai! Vì `NULL` nghĩa là "không biết", nên `email = NULL` không bao giờ TRUE. Phải dùng `IS NULL` / `IS NOT NULL`:

```sql
-- Khách chưa có email
SELECT name, email
FROM customers
WHERE email IS NULL;
```

| name | email |
|------|-------|
| Hoa  | NULL  |
| Chi  | NULL  |

```sql
-- Khách đã có email
SELECT name
FROM customers
WHERE email IS NOT NULL;
```

| name |
|------|
| Lan  |
| Minh |
| Tuấn |
| Bình |

## Alias với AS: đổi tên hiển thị

`AS` đặt **tên gọi tạm** (alias) cho cột trong kết quả — giúp tiêu đề dễ đọc hơn, đặc biệt khi cột là biểu thức tính toán:

```sql
SELECT name AS ten_khach,
       age  AS tuoi
FROM customers
LIMIT 2;
```

| ten_khach | tuoi |
|-----------|------|
| Lan       | 28   |
| Minh      | 35   |

`AS` cũng dùng cho **bảng** (viết tắt khi câu lệnh dài), và từ khoá `AS` có thể bỏ — `customers c` cũng được hiểu như `customers AS c`. Bạn sẽ thấy điều này rất tiện ở bài JOIN.

> 💡 Ghi nhớ thứ tự viết một câu truy vấn cơ bản:
> `SELECT` cột → `FROM` bảng → `WHERE` lọc → `ORDER BY` sắp xếp → `LIMIT` cắt bớt.
> Viết sai thứ tự này, database sẽ báo lỗi cú pháp.

## Bài tập truy vấn cửa hàng

Hãy tự viết câu SQL trước khi xem lời giải. Dùng đúng schema và dữ liệu mẫu ở trên.

**Bài 1.** Lấy tên và giá của tất cả sản phẩm thuộc category `'Phụ kiện'`.

**Bài 2.** Lấy tên các khách hàng từ 20 đến 30 tuổi, sắp xếp theo tuổi tăng dần.

**Bài 3.** Liệt kê các thành phố (city) khác nhau mà khách hàng đang sống.

**Bài 4.** Lấy 2 sản phẩm đắt nhất (tên và giá).

**Bài 5.** Lấy danh sách khách ở Đà Nẵng hoặc TP HCM, đồng thời đã có email.

---

### Lời giải

**Bài 1.**

```sql
SELECT name, price
FROM products
WHERE category = 'Phụ kiện';
```

| name     | price |
|----------|-------|
| Bàn phím | 350   |
| Chuột    | 150   |
| Webcam   | 600   |

**Bài 2.** Dùng `BETWEEN` cho khoảng tuổi và `ORDER BY ... ASC`:

```sql
SELECT name, age
FROM customers
WHERE age BETWEEN 20 AND 30
ORDER BY age ASC;
```

| name | age |
|------|-----|
| Hoa  | 22  |
| Lan  | 28  |

**Bài 3.** Dùng `DISTINCT` để bỏ trùng:

```sql
SELECT DISTINCT city
FROM customers;
```

| city    |
|---------|
| Hà Nội  |
| Đà Nẵng |
| TP HCM  |

**Bài 4.** Sắp giảm dần theo giá rồi `LIMIT 2`:

```sql
SELECT name, price
FROM products
ORDER BY price DESC
LIMIT 2;
```

| name     | price |
|----------|-------|
| Màn hình | 2500  |
| Tai nghe | 800   |

**Bài 5.** Ghép điều kiện `IN` (hoặc `OR`) với `IS NOT NULL` bằng `AND` — nhớ đặt ngoặc cho phần `OR`:

```sql
SELECT name, city, email
FROM customers
WHERE city IN ('Đà Nẵng', 'TP HCM')
  AND email IS NOT NULL;
```

| name | city    | email         |
|------|---------|---------------|
| Minh | Đà Nẵng | minh@mail.com |
| Tuấn | TP HCM  | tuan@mail.com |
| Bình | Đà Nẵng | binh@mail.com |

(Chi ở TP HCM nhưng `email` là `NULL` nên bị loại.)

## Liên hệ sang AWS

Khi đưa ứng dụng lên cloud, bạn hiếm khi tự cài và vận hành máy chủ database. AWS cung cấp các **dịch vụ database được quản lý** (managed) để lo phần hạ tầng giúp bạn:

- **Amazon RDS** (Relational Database Service): chạy đúng các database quan hệ quen thuộc — PostgreSQL, MySQL, MariaDB, SQL Server, Oracle. Mọi câu `SELECT`, `WHERE`, `ORDER BY` bạn vừa học **dùng y hệt** trên RDS; AWS chỉ lo backup, vá lỗi, nhân bản (replica). Đây là nơi tự nhiên nhất để đặt bảng `customers`, `orders`, `products`.
- **Amazon Aurora**: bản database quan hệ của AWS, **tương thích** với MySQL và PostgreSQL nhưng nhanh hơn và tự co giãn lưu trữ. Cùng cú pháp SQL — bạn chuyển từ RDS sang Aurora gần như không phải sửa truy vấn.
- **Amazon DynamoDB**: đây là **NoSQL** — không dùng bảng/cột/SQL kiểu trên, mà lưu theo key-value/document. Không có `SELECT ... WHERE` tự do; bạn truy vấn theo khoá đã thiết kế trước. Phù hợp khi cần độ trễ cực thấp ở quy mô rất lớn (giỏ hàng, phiên đăng nhập), nhưng đánh đổi sự linh hoạt truy vấn.

> 💡 Ghi nhớ: **RDS và Aurora = SQL quan hệ** (mọi thứ trong bài này áp dụng trực tiếp). **DynamoDB = NoSQL**, một mô hình khác. Khi đề thi hay dự án nhắc "dữ liệu có quan hệ, cần JOIN và truy vấn linh hoạt" → nghĩ tới RDS/Aurora; "key-value đơn giản, quy mô khổng lồ, độ trễ thấp" → nghĩ tới DynamoDB.

Ở bài tiếp theo bạn sẽ học cách **nối nhiều bảng** với `JOIN` — ghép `orders` với `customers` và `products` để trả lời câu hỏi "khách nào mua sản phẩm gì".
