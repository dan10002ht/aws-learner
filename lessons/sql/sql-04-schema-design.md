# Thiết kế schema & chuẩn hoá

Trước khi viết bất kỳ câu `SELECT` nào, bạn cần một nơi để chứa dữ liệu cho gọn gàng. Bài này dạy bạn cách **thiết kế bảng** (schema): chọn kiểu dữ liệu, đặt khoá, ràng buộc, dựng quan hệ giữa các bảng, và chuẩn hoá (normalization) để tránh dữ liệu lặp lung tung.

Ta dùng một schema cửa hàng xuyên suốt: `customers`, `orders`, `products`.

## 1. Kiểu dữ liệu cơ bản

Mỗi cột phải khai báo một kiểu. Chọn kiểu nhỏ nhất mà vẫn đủ chứa dữ liệu — vừa tiết kiệm bộ nhớ, vừa giúp database kiểm tra giúp bạn.

| Kiểu | Dùng cho | Ví dụ giá trị |
|---|---|---|
| `INT` | số nguyên (id, số lượng) | `42` |
| `DECIMAL(10,2)` | tiền, số có phần lẻ chính xác | `199.90` |
| `VARCHAR(n)` | chuỗi độ dài thay đổi (tên, email) | `'Lan Anh'` |
| `DATE` | ngày | `'2026-06-11'` |
| `TIMESTAMP` | ngày + giờ | `'2026-06-11 14:30:00'` |
| `BOOLEAN` | đúng/sai | `TRUE` |

```sql
CREATE TABLE products (
  id          INT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  price       DECIMAL(10,2) NOT NULL,
  in_stock    BOOLEAN DEFAULT TRUE,
  created_at  DATE
);
```

> ⚠️ Lỗi người mới hay gặp: dùng `FLOAT`/`DOUBLE` cho tiền. Số thực dấu phẩy động làm tròn sai (vd `0.1 + 0.2 ≠ 0.3`). Tiền luôn dùng `DECIMAL(p, s)` — `p` là tổng chữ số, `s` là số chữ số sau dấu phẩy. `DECIMAL(10,2)` chứa tối đa `99999999.99`.

> 💡 Ghi nhớ: `VARCHAR(100)` chỉ tốn chỗ theo độ dài thực tế của chuỗi, còn `CHAR(100)` luôn chiếm đủ 100 ký tự. Với dữ liệu dài không định trước (bài viết, mô tả), dùng `TEXT`.

## 2. PRIMARY KEY — khoá chính

`PRIMARY KEY` là cột (hoặc nhóm cột) định danh **duy nhất** mỗi dòng. Nó tự động vừa `NOT NULL` vừa `UNIQUE`, và database tạo index để tra cứu nhanh.

```sql
CREATE TABLE customers (
  id     INT PRIMARY KEY,
  name   VARCHAR(100) NOT NULL,
  email  VARCHAR(255)
);
```

Thường ta để database tự sinh id (auto-increment) thay vì tự gõ tay:

```sql
-- PostgreSQL
CREATE TABLE customers (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(100) NOT NULL
);

-- MySQL
CREATE TABLE customers (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(100) NOT NULL
);
```

Dữ liệu mẫu sau khi chèn vài dòng:

| id | name |
|---|---|
| 1 | Lan Anh |
| 2 | Minh |
| 3 | Hùng |

> 💡 Ghi nhớ: nên dùng khoá chính là một id "vô nghĩa" (surrogate key) do hệ thống sinh ra, thay vì dữ liệu nghiệp vụ như email hay số điện thoại. Email có thể đổi; id thì không bao giờ đổi.

## 3. FOREIGN KEY & ràng buộc

### FOREIGN KEY — khoá ngoại

`FOREIGN KEY` nối một bảng tới khoá chính của bảng khác. Nó đảm bảo **toàn vẹn tham chiếu**: không thể tạo đơn hàng cho một khách không tồn tại.

```sql
CREATE TABLE orders (
  id           INT PRIMARY KEY,
  customer_id  INT NOT NULL,
  total        DECIMAL(10,2) NOT NULL,
  ordered_at   DATE,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

| id | customer_id | total | ordered_at |
|---|---|---|---|
| 1 | 1 | 199.90 | 2026-06-01 |
| 2 | 1 | 50.00 | 2026-06-03 |
| 3 | 2 | 320.00 | 2026-06-05 |

Nếu thử chèn `customer_id = 99` (không có trong `customers`), database **từ chối**:

```sql
INSERT INTO orders (id, customer_id, total) VALUES (4, 99, 10.00);
-- ERROR: insert or update on table "orders" violates foreign key constraint
```

### Các ràng buộc khác

| Ràng buộc | Ý nghĩa |
|---|---|
| `NOT NULL` | cột bắt buộc có giá trị |
| `UNIQUE` | không cho phép trùng (vd email) |
| `CHECK (...)` | giá trị phải thoả điều kiện |
| `DEFAULT v` | giá trị mặc định nếu không truyền |

```sql
CREATE TABLE customers (
  id     SERIAL PRIMARY KEY,
  name   VARCHAR(100) NOT NULL,
  email  VARCHAR(255) UNIQUE,
  age    INT CHECK (age >= 0)
);
```

> ⚠️ Lỗi người mới hay gặp: quên đặt `UNIQUE` cho email rồi để hai khách trùng email, sau này tính năng "đăng nhập bằng email" loạn lên. Đặt ràng buộc ngay từ đầu rẻ hơn dọn dữ liệu bẩn về sau rất nhiều.

> 💡 Ghi nhớ: ràng buộc là "lưới an toàn" ở tầng database. Đừng chỉ kiểm tra ở code ứng dụng — bug ở code vẫn có thể đẩy dữ liệu sai xuống. Database là tuyến phòng thủ cuối cùng.

## 4. Quan hệ giữa các bảng

### Quan hệ 1-n (một-nhiều)

Phổ biến nhất. Một khách có **nhiều** đơn hàng; mỗi đơn hàng thuộc về **một** khách. Ta đặt khoá ngoại ở phía "nhiều" (bảng `orders`).

```sql
-- orders.customer_id trỏ về customers.id (đã làm ở mục 3)
```

```
customers (1) ────< orders (n)
```

### Quan hệ 1-1 (một-một)

Một khách có đúng một hồ sơ chi tiết. Đặt khoá ngoại `UNIQUE` để chặn việc một khách có hai hồ sơ.

```sql
CREATE TABLE customer_profiles (
  customer_id  INT PRIMARY KEY,
  address      VARCHAR(255),
  phone        VARCHAR(20),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

Vì `customer_id` vừa là khoá chính (duy nhất) vừa là khoá ngoại nên quan hệ này là 1-1.

### Quan hệ n-n (nhiều-nhiều) — cần bảng trung gian

Một đơn hàng chứa **nhiều** sản phẩm; một sản phẩm xuất hiện trong **nhiều** đơn hàng. Không thể nhét trực tiếp — ta tạo **bảng trung gian** (junction/join table) `order_items`.

```sql
CREATE TABLE order_items (
  order_id    INT NOT NULL,
  product_id  INT NOT NULL,
  quantity    INT NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (order_id, product_id),
  FOREIGN KEY (order_id)   REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

Dữ liệu mẫu — đơn hàng 1 gồm 2 sản phẩm:

| order_id | product_id | quantity |
|---|---|---|
| 1 | 10 | 2 |
| 1 | 11 | 1 |
| 2 | 10 | 5 |

> 💡 Ghi nhớ: dấu hiệu nhận biết n-n là khi cả hai phía đều "nhiều". Lúc đó **luôn** cần bảng trung gian. Khoá chính của nó thường là cặp `(order_id, product_id)` — gọi là khoá chính tổ hợp (composite key).

## 5. Chuẩn hoá (Normalization): 1NF, 2NF, 3NF

Chuẩn hoá là quá trình tách bảng để **mỗi sự thật chỉ lưu một chỗ**, tránh lặp và mâu thuẫn. Hãy bắt đầu từ một bảng "xấu" rồi sửa dần.

Bảng `orders` ban đầu nhồi mọi thứ vào một chỗ:

| order_id | customer_name | products |
|---|---|---|
| 1 | Lan Anh | "Áo, Quần" |
| 2 | Minh | "Mũ" |

### 1NF — mỗi ô chỉ chứa một giá trị

Cột `products` đang chứa danh sách `"Áo, Quần"` — vi phạm 1NF. **1NF yêu cầu mỗi ô là một giá trị nguyên tử** (atomic), không phải danh sách. Sửa: tách thành nhiều dòng (và sau này là bảng `order_items`).

| order_id | customer_name | product |
|---|---|---|
| 1 | Lan Anh | Áo |
| 1 | Lan Anh | Quần |
| 2 | Minh | Mũ |

### 2NF — bỏ phụ thuộc một phần vào khoá

2NF áp dụng khi khoá chính là tổ hợp. **Mọi cột không-khoá phải phụ thuộc vào TOÀN BỘ khoá**, không chỉ một phần. Ở bảng trên, khoá là `(order_id, product)`, nhưng `customer_name` chỉ phụ thuộc vào `order_id` — đó là phụ thuộc một phần. Tách ra:

```sql
-- orders: thông tin thuộc về cả đơn hàng
CREATE TABLE orders (
  id           INT PRIMARY KEY,
  customer_id  INT NOT NULL REFERENCES customers(id)
);

-- order_items: thông tin thuộc về từng dòng hàng
CREATE TABLE order_items (
  order_id    INT REFERENCES orders(id),
  product_id  INT REFERENCES products(id),
  quantity    INT NOT NULL,
  PRIMARY KEY (order_id, product_id)
);
```

### 3NF — bỏ phụ thuộc bắc cầu

**Cột không-khoá không được phụ thuộc vào một cột không-khoá khác.** Ví dụ bảng sai:

| id | customer_id | customer_city | city_zip |
|---|---|---|---|
| 1 | 1 | Hà Nội | 100000 |

Ở đây `city_zip` phụ thuộc vào `customer_city`, mà `customer_city` lại không phải khoá → phụ thuộc bắc cầu (`id → city → zip`). Nếu Hà Nội đổi mã zip, bạn phải sửa nhiều dòng. Tách `city`/`zip` sang bảng riêng.

> 💡 Ghi nhớ nhanh 3NF: "mỗi cột không-khoá phụ thuộc vào **khoá, toàn bộ khoá, và không gì ngoài khoá**" (the key, the whole key, and nothing but the key).

> ⚠️ Lỗi người mới hay gặp: lưu lặp dữ liệu suy ra được, ví dụ cột `total` trong `orders` rồi cũng lưu thêm `customer_name` trong từng dòng `order_items`. Tên khách có thể tra qua `JOIN` — lưu lại chỉ tạo cơ hội cho dữ liệu mâu thuẫn.

## 6. Khi nào denormalize (cố ý lặp lại)?

Chuẩn hoá tốt cho tính đúng đắn, nhưng đôi khi phải `JOIN` quá nhiều bảng làm truy vấn chậm. **Denormalization** là cố ý lưu lặp/tính sẵn để đọc nhanh hơn — đánh đổi: dữ liệu có thể lệch nếu không cập nhật đồng bộ.

Nên cân nhắc denormalize khi:
- Báo cáo/dashboard đọc rất nhiều, ghi rất ít.
- Một phép tính (vd tổng đơn hàng) bị gọi đi gọi lại và tốn kém.
- Dữ liệu lịch sử cần "đóng băng": lưu `unit_price` ngay tại thời điểm mua trong `order_items`, vì giá sản phẩm sẽ đổi sau này.

```sql
ALTER TABLE order_items ADD COLUMN unit_price DECIMAL(10,2) NOT NULL;
-- Lưu giá lúc mua, không tra ngược products.price (đã có thể đổi)
```

> 💡 Ghi nhớ: mặc định hãy chuẩn hoá. Chỉ denormalize khi đã đo được vấn đề hiệu năng thật, chứ không phỏng đoán. "Premature optimization" cũng đúng với database.

## 7. Ghép lại: CREATE TABLE toàn schema

```sql
CREATE TABLE customers (
  id     SERIAL PRIMARY KEY,
  name   VARCHAR(100) NOT NULL,
  email  VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE products (
  id     SERIAL PRIMARY KEY,
  name   VARCHAR(100) NOT NULL,
  price  DECIMAL(10,2) NOT NULL CHECK (price >= 0)
);

CREATE TABLE orders (
  id           SERIAL PRIMARY KEY,
  customer_id  INT NOT NULL REFERENCES customers(id),
  ordered_at   DATE DEFAULT CURRENT_DATE
);

CREATE TABLE order_items (
  order_id    INT NOT NULL REFERENCES orders(id),
  product_id  INT NOT NULL REFERENCES products(id),
  quantity    INT NOT NULL CHECK (quantity > 0),
  unit_price  DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (order_id, product_id)
);
```

> ⚠️ Lỗi người mới hay gặp: tạo bảng sai thứ tự. Bảng được `REFERENCES` (vd `customers`) phải tồn tại **trước** bảng tham chiếu nó (vd `orders`). Tạo cha trước, con sau.

## Bài tập: Thiết kế database cho một blog

**Đề bài.** Thiết kế schema cho một blog đơn giản với yêu cầu:
1. Mỗi **user** có id, tên hiển thị, email (không trùng).
2. Mỗi **post** (bài viết) thuộc về một user, có tiêu đề, nội dung, ngày đăng, cờ đã xuất bản hay chưa.
3. Mỗi post có nhiều **comment**; mỗi comment do một user viết.
4. Một post gắn được nhiều **tag** (vd "aws", "sql"); một tag dùng cho nhiều post.

Hãy xác định các quan hệ rồi viết `CREATE TABLE`.

<details>
<summary>Xem lời giải</summary>

**Phân tích quan hệ:**
- `users` 1-n `posts` (một user, nhiều bài).
- `posts` 1-n `comments`, và `users` 1-n `comments`.
- `posts` n-n `tags` → cần bảng trung gian `post_tags`.

```sql
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  display_name  VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE posts (
  id            SERIAL PRIMARY KEY,
  author_id     INT NOT NULL REFERENCES users(id),
  title         VARCHAR(200) NOT NULL,
  body          TEXT NOT NULL,
  published     BOOLEAN NOT NULL DEFAULT FALSE,
  published_at  TIMESTAMP
);

CREATE TABLE comments (
  id          SERIAL PRIMARY KEY,
  post_id     INT NOT NULL REFERENCES posts(id),
  author_id   INT NOT NULL REFERENCES users(id),
  body        TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tags (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(50) UNIQUE NOT NULL
);

-- Bảng trung gian cho quan hệ n-n giữa posts và tags
CREATE TABLE post_tags (
  post_id  INT NOT NULL REFERENCES posts(id),
  tag_id   INT NOT NULL REFERENCES tags(id),
  PRIMARY KEY (post_id, tag_id)
);
```

**Vì sao thiết kế này đạt 3NF:**
- Tên tag `"aws"` chỉ lưu một lần trong `tags`, không lặp ở từng post → tránh dư thừa.
- `comments.author_id` không lưu lại tên user (tra qua `JOIN users`) → không phụ thuộc bắc cầu.
- Quan hệ n-n được tách đúng bằng `post_tags` thay vì nhồi danh sách tag vào một cột (giữ 1NF).

</details>

## Liên hệ sang AWS

Những khái niệm trên áp dụng trực tiếp khi bạn chạy database trên AWS:

- **Amazon RDS** (PostgreSQL, MySQL, MariaDB, SQL Server, Oracle): chạy đúng các engine SQL quan hệ bạn vừa học. Mọi `CREATE TABLE`, `PRIMARY KEY`, `FOREIGN KEY`, ràng buộc `CHECK`/`UNIQUE` ở trên hoạt động y hệt — RDS chỉ lo phần vận hành (backup, vá lỗi, sao chép). Schema chuẩn hoá là lựa chọn mặc định cho RDS.

- **Amazon Aurora** (tương thích MySQL/PostgreSQL): cùng mô hình quan hệ và chuẩn hoá, nhưng tầng lưu trữ được thiết kế lại cho hiệu năng và độ sẵn sàng cao. Khi cần đọc nhiều, bạn thêm **read replica** thay vì denormalize vội — một cách "tăng tốc đọc" mà vẫn giữ schema sạch.

- **Amazon DynamoDB** (NoSQL, key-value/document): ngược hẳn triết lý ở đây. DynamoDB **khuyến khích denormalize** và thường gộp nhiều thực thể vào một bảng (single-table design), tối ưu cho các mẫu truy vấn biết trước ở quy mô cực lớn. Không có `JOIN` hay `FOREIGN KEY` — bạn đánh đổi tính linh hoạt truy vấn để lấy độ trễ thấp ổn định.

> 💡 Ghi nhớ: hiểu chuẩn hoá giúp bạn chọn đúng công cụ. Dữ liệu quan hệ phức tạp, cần toàn vẹn → RDS/Aurora. Truy vấn đơn giản, lưu lượng khổng lồ, mẫu truy cập cố định → DynamoDB. Thiết kế schema không phải "đúng/sai" tuyệt đối, mà là chọn đánh đổi phù hợp với bài toán.
