# Transaction & SQL nâng cao

## Mở đầu: chuyển tiền và bài toán "nửa vời"

Bạn chuyển 100 nghìn từ tài khoản A sang B. Về bản chất database phải làm 2 việc:

1. Trừ 100 nghìn ở A.
2. Cộng 100 nghìn vào B.

Giờ tưởng tượng: làm xong bước 1, máy chủ mất điện, bước 2 không kịp chạy. Tiền của A biến mất, B chẳng nhận được gì. Đây là tình huống "nửa vời" (partial update) — ác mộng của mọi hệ thống tài chính.

**Transaction** (giao dịch) là cơ chế để database hứa với bạn: *"Hoặc cả 2 bước cùng thành công, hoặc không bước nào xảy ra — không có chuyện nửa vời."*

Suốt bài này ta dùng lại schema cửa hàng quen thuộc:

```sql
-- customers: khách hàng, có số dư ví
CREATE TABLE customers (
  id      INT PRIMARY KEY,
  name    TEXT NOT NULL,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- products: sản phẩm, có tồn kho
CREATE TABLE products (
  id    INT PRIMARY KEY,
  name  TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0
);

-- orders: đơn hàng
CREATE TABLE orders (
  id          INT PRIMARY KEY,
  customer_id INT REFERENCES customers(id),
  product_id  INT REFERENCES products(id),
  qty         INT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new'
);
```

Dữ liệu khởi tạo:

```sql
INSERT INTO customers (id, name, balance) VALUES
  (1, 'An',  500.00),
  (2, 'Bình', 50.00);

INSERT INTO products (id, name, price, stock) VALUES
  (10, 'Bàn phím', 300.00, 5),
  (11, 'Chuột',    150.00, 0);
```

| id | name | balance |
|---|---|---|
| 1 | An | 500.00 |
| 2 | Bình | 50.00 |

> 💡 Ghi nhớ: Transaction biến **nhiều câu lệnh** thành **một đơn vị không thể chia cắt**. Hệ thống ngân hàng, đặt vé, trừ kho... đều sống nhờ nó.

## 1. ACID — bốn lời hứa của transaction

ACID là 4 chữ cái viết tắt cho 4 tính chất mà một transaction "đàng hoàng" phải đảm bảo. Hiểu nôm na:

| Chữ | Tên | Nói dễ hiểu |
|---|---|---|
| **A** | Atomicity (nguyên tử) | Tất cả-hoặc-không-gì. Không có nửa vời. |
| **C** | Consistency (nhất quán) | Dữ liệu trước và sau luôn hợp lệ (không vi phạm ràng buộc). |
| **I** | Isolation (cô lập) | Nhiều transaction chạy cùng lúc nhưng không giẫm chân nhau. |
| **D** | Durability (bền vững) | Đã COMMIT thì dù mất điện ngay sau đó, dữ liệu vẫn còn. |

Ví dụ áp vào chuyển tiền:

- **Atomicity**: trừ A và cộng B cùng sống cùng chết.
- **Consistency**: nếu có ràng buộc `balance >= 0`, transaction nào làm âm số dư sẽ bị từ chối.
- **Isolation**: cùng lúc có người khác đọc số dư, họ không thấy trạng thái "đang nửa chừng".
- **Durability**: chuyển xong, đèn báo "thành công" rồi thì không bao giờ mất.

> 💡 Ghi nhớ: Cứ thấy chữ "ACID" hãy nhớ tới **độ tin cậy**. Database SQL truyền thống (PostgreSQL, MySQL) cho bạn ACID gần như miễn phí — đó là lý do người ta tin chúng giữ tiền.

## 2. BEGIN / COMMIT / ROLLBACK

Ba câu lệnh điều khiển transaction:

- `BEGIN` — mở một transaction. Từ đây mọi thay đổi là "tạm thời".
- `COMMIT` — chốt sổ. Mọi thay đổi trở thành chính thức và bền vững.
- `ROLLBACK` — huỷ bỏ. Mọi thay đổi từ lúc `BEGIN` bị xoá sạch như chưa từng xảy ra.

```sql
BEGIN;
  UPDATE customers SET balance = balance - 100 WHERE id = 1;  -- An trừ 100
  UPDATE customers SET balance = balance + 100 WHERE id = 2;  -- Bình cộng 100
COMMIT;
```

Sau khi COMMIT:

| id | name | balance |
|---|---|---|
| 1 | An | 400.00 |
| 2 | Bình | 150.00 |

Nếu giữa chừng phát hiện sai (ví dụ chuyển nhầm người), ta dùng ROLLBACK:

```sql
BEGIN;
  UPDATE customers SET balance = balance - 100 WHERE id = 1;
  -- Ối, nhầm rồi!
ROLLBACK;
-- balance của An trở lại 400.00, y như chưa làm gì
```

### Tự động ROLLBACK khi có lỗi

Trong thực tế ta thường kiểm tra điều kiện rồi tự huỷ. Ví dụ Bình (số dư 150) muốn chuyển 999 — không đủ tiền:

```sql
BEGIN;
  UPDATE customers SET balance = balance - 999 WHERE id = 2;
  -- Nếu có ràng buộc CHECK (balance >= 0), câu trên báo lỗi
  -- và toàn bộ transaction tự ROLLBACK.
COMMIT;
```

> ⚠️ Lỗi người mới hay gặp: Quên `COMMIT`. Bạn chạy `BEGIN` rồi `UPDATE`, thấy `SELECT` ra số mới nên tưởng đã xong — nhưng nếu kết nối đóng mà chưa COMMIT, mọi thứ bị ROLLBACK. Người dùng khác cũng **không hề thấy** thay đổi của bạn cho tới khi COMMIT.

## 3. Ví dụ thực chiến: đặt hàng (trừ kho + trừ tiền)

Đây là transaction điển hình trong cửa hàng: An mua 2 "Bàn phím" (giá 300). Phải làm 3 việc cùng lúc.

```sql
BEGIN;
  -- 1. Trừ tồn kho
  UPDATE products SET stock = stock - 2 WHERE id = 10;

  -- 2. Trừ tiền khách (2 * 300 = 600)
  UPDATE customers SET balance = balance - 600 WHERE id = 1;

  -- 3. Ghi đơn hàng
  INSERT INTO orders (id, customer_id, product_id, qty, status)
  VALUES (1001, 1, 10, 2, 'paid');
COMMIT;
```

Nếu bất kỳ bước nào lỗi (hết kho, không đủ tiền), ta ROLLBACK để cả 3 cùng bị huỷ — không bao giờ có cảnh "đã trừ kho mà chưa thu tiền".

> ⚠️ Lỗi người mới hay gặp: Kiểm tra tồn kho bằng câu `SELECT` *trước khi* `BEGIN`, rồi mới trừ kho. Giữa lúc kiểm tra và lúc trừ, người khác có thể đã mua hết. Hãy đặt kiểm tra **bên trong** transaction, hoặc dùng `UPDATE ... WHERE stock >= 2` rồi xem số hàng bị ảnh hưởng.

## 4. Isolation levels — khi nhiều người cùng làm một lúc

Phần khó nhất nhưng quan trọng nhất. Khi nhiều transaction chạy song song, chúng có thể "nhìn thấy" dữ liệu của nhau ở các mức khác nhau. Database cho bạn chọn mức **cô lập** (isolation level): càng chặt càng an toàn nhưng càng chậm.

Ta cần biết 3 hiện tượng lỗi (read phenomena) trước:

### Dirty read (đọc bẩn)

Transaction T2 đọc được dữ liệu mà T1 **đã sửa nhưng chưa COMMIT**. Nếu T1 sau đó ROLLBACK, T2 đã đọc một con số "ma" không bao giờ tồn tại.

```sql
-- T1: BEGIN; UPDATE customers SET balance = 0 WHERE id = 1;  (chưa COMMIT)
-- T2: SELECT balance FROM customers WHERE id = 1;  -- đọc thấy 0 (bẩn!)
-- T1: ROLLBACK;  -- số 0 đó chưa từng có thật
```

### Non-repeatable read (đọc lại khác nhau)

Trong **cùng một** transaction, đọc cùng một hàng hai lần ra hai kết quả khác nhau, vì giữa hai lần đọc có transaction khác đã COMMIT thay đổi.

```sql
-- T1: SELECT balance FROM customers WHERE id = 1;  -- 500
-- T2: UPDATE customers SET balance = 400 WHERE id = 1; COMMIT;
-- T1: SELECT balance FROM customers WHERE id = 1;  -- 400 (khác lần đầu!)
```

### Phantom read (đọc bóng ma)

Giống non-repeatable read nhưng ở mức **tập hợp hàng**: đọc lại cùng một điều kiện thì số hàng thoả mãn thay đổi vì có hàng mới được chèn vào.

```sql
-- T1: SELECT COUNT(*) FROM orders WHERE status = 'paid';  -- 3 đơn
-- T2: INSERT INTO orders (...) VALUES (..., 'paid'); COMMIT;
-- T1: SELECT COUNT(*) FROM orders WHERE status = 'paid';  -- 4 đơn (bóng ma!)
```

### Bảng so sánh các mức isolation

| Isolation level | Dirty read | Non-repeatable read | Phantom read |
|---|---|---|---|
| READ UNCOMMITTED | có thể | có thể | có thể |
| **READ COMMITTED** (mặc định PostgreSQL) | không | có thể | có thể |
| **REPEATABLE READ** | không | không | có thể* |
| **SERIALIZABLE** | không | không | không |

> *Trên PostgreSQL, REPEATABLE READ chặn luôn cả phantom; chuẩn SQL thì không bắt buộc — tuỳ database.

Cách đặt mức:

```sql
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
  -- ... các câu lệnh ...
COMMIT;
```

> 💡 Ghi nhớ: 99% trường hợp dùng **READ COMMITTED** (mặc định) là đủ. Chỉ nâng lên **SERIALIZABLE** khi logic thật sự nhạy cảm với việc đọc nhất quán (báo cáo tài chính, kiểm kho chính xác). Càng chặt càng dễ bị xung đột phải thử lại.

## 5. Deadlock — hai người chờ nhau mãi mãi

Deadlock xảy ra khi hai transaction giữ khoá (lock) của nhau và cùng chờ. Ví dụ kinh điển:

```sql
-- T1: BEGIN; UPDATE customers SET ... WHERE id = 1;  -- khoá hàng 1
-- T2: BEGIN; UPDATE customers SET ... WHERE id = 2;  -- khoá hàng 2
-- T1: UPDATE customers SET ... WHERE id = 2;  -- chờ T2 nhả hàng 2
-- T2: UPDATE customers SET ... WHERE id = 1;  -- chờ T1 nhả hàng 1
-- Cả hai chờ nhau → DEADLOCK
```

May mắn là database **tự phát hiện** deadlock và **huỷ một trong hai** transaction (báo lỗi `deadlock detected`). Transaction bị huỷ chỉ cần... chạy lại.

Cách phòng tránh: **luôn khoá các hàng theo cùng một thứ tự**. Nếu mọi transaction đều update id nhỏ trước id lớn, sẽ không bao giờ có vòng chờ.

> ⚠️ Lỗi người mới hay gặp: Hoảng loạn khi thấy lỗi `deadlock detected` rồi đi tắt isolation. Sai hướng. Hãy (1) chuẩn hoá thứ tự khoá, (2) giữ transaction ngắn gọn, (3) ở tầng app cứ retry vài lần là xong.

## 6. UPSERT — chèn nếu chưa có, cập nhật nếu đã có

Tình huống quen: "ghi tồn kho cho sản phẩm 11; nếu đã có thì cộng dồn." Nếu làm thủ công bạn phải `SELECT` xem tồn tại chưa rồi mới quyết định `INSERT` hay `UPDATE` — vừa dài vừa dính race condition.

PostgreSQL cho cú pháp gọn: `INSERT ... ON CONFLICT`.

```sql
INSERT INTO products (id, name, price, stock)
VALUES (11, 'Chuột', 150.00, 20)
ON CONFLICT (id)
DO UPDATE SET stock = products.stock + EXCLUDED.stock;
```

- `ON CONFLICT (id)`: nếu đụng khoá trùng ở cột `id`...
- `EXCLUDED`: là hàng *định chèn* (giá trị 20 ở trên).
- `products.stock`: là hàng *đang có sẵn* trong bảng.

Sản phẩm 11 vốn có stock = 0, sau câu này thành 20:

| id | name | price | stock |
|---|---|---|---|
| 11 | Chuột | 150.00 | 20 |

Chạy lại lần nữa (cộng thêm 20 nữa) → stock = 40. Nếu chỉ muốn bỏ qua khi trùng, dùng `ON CONFLICT (id) DO NOTHING`.

> 💡 Ghi nhớ: UPSERT là một câu lệnh nguyên tử — không cần `SELECT` trước, không lo hai request cùng tạo trùng. MySQL có cú pháp tương đương `INSERT ... ON DUPLICATE KEY UPDATE`.

## 7. VIEW — đặt tên cho một câu truy vấn

Khi một câu `SELECT` phức tạp được dùng đi dùng lại, bạn có thể lưu nó dưới một cái tên: **VIEW**. View không lưu dữ liệu, nó chỉ là "câu truy vấn có sẵn"; mỗi lần đọc view, database chạy lại câu bên dưới.

```sql
CREATE VIEW paid_orders AS
SELECT o.id, c.name AS customer, p.name AS product, o.qty
FROM orders o
JOIN customers c ON c.id = o.customer_id
JOIN products  p ON p.id = o.product_id
WHERE o.status = 'paid';
```

Giờ truy vấn đơn đã thanh toán đơn giản như đọc một bảng:

```sql
SELECT * FROM paid_orders WHERE customer = 'An';
```

| id | customer | product | qty |
|---|---|---|---|
| 1001 | An | Bàn phím | 2 |

Lợi ích của view:

- **Gọn**: giấu phần JOIN phức tạp đi.
- **An toàn**: cấp quyền đọc view mà không lộ cột nhạy cảm (ví dụ ẩn `balance`).
- **Nhất quán**: mọi người dùng chung một định nghĩa "đơn đã thanh toán".

> 💡 Ghi nhớ: View thường **chỉ để đọc**. Nếu cần lưu sẵn kết quả cho nhanh (vì câu truy vấn nặng), hãy tìm hiểu **materialized view** — nó lưu dữ liệu thật và cần `REFRESH`.

## 8. Transaction trong ứng dụng

Trong code thật, transaction được điều khiển từ ngôn ngữ lập trình. Mẫu chung luôn là: mở transaction → làm việc → COMMIT nếu ổn, ROLLBACK nếu lỗi.

```python
# Python với thư viện psycopg
conn = get_connection()
try:
    with conn:                    # khối này = một transaction
        cur = conn.cursor()
        cur.execute("UPDATE products SET stock = stock - %s WHERE id = %s", (2, 10))
        cur.execute("UPDATE customers SET balance = balance - %s WHERE id = %s", (600, 1))
        cur.execute("INSERT INTO orders (id, customer_id, product_id, qty, status)"
                    " VALUES (%s, %s, %s, %s, 'paid')", (1001, 1, 10, 2))
    # ra khỏi `with` không lỗi → tự COMMIT
except Exception:
    # có lỗi → tự ROLLBACK, đơn hàng không bị tạo nửa vời
    raise
```

Nguyên tắc vàng khi viết transaction ở tầng app:

- **Giữ transaction ngắn**: đừng gọi API bên ngoài hay `sleep` khi đang mở transaction (sẽ khoá hàng rất lâu).
- **Đừng để transaction "treo"**: luôn có nhánh COMMIT/ROLLBACK rõ ràng.
- **Sẵn sàng retry**: với SERIALIZABLE hoặc deadlock, lỗi xung đột là bình thường — bắt lỗi rồi chạy lại.

> ⚠️ Lỗi người mới hay gặp: Mở transaction, gọi một API thanh toán bên thứ ba (mất 5 giây), rồi mới COMMIT. Suốt 5 giây đó các hàng bị khoá, người khác phải chờ. Hãy COMMIT phần DB trước, xử lý việc chậm sau.

## 9. SQL vs NoSQL — khi nào dùng gì

Không phải lúc nào cũng cần ACID và bảng có cấu trúc. NoSQL (MongoDB, DynamoDB, Redis...) đánh đổi một phần để lấy quy mô và linh hoạt.

| Tiêu chí | SQL (quan hệ) | NoSQL |
|---|---|---|
| Cấu trúc dữ liệu | Bảng cố định, schema rõ | Linh hoạt (document, key-value, graph) |
| Quan hệ & JOIN | Mạnh, là thế mạnh chính | Yếu/không có; gộp dữ liệu sẵn |
| Giao dịch ACID | Đầy đủ, nhiều bảng | Thường giới hạn (1 bản ghi) |
| Mở rộng | Chủ yếu scale dọc (máy mạnh hơn) | Scale ngang dễ (thêm máy) |
| Hợp với | Tài chính, đơn hàng, dữ liệu có quan hệ | Log, cache, dữ liệu khổng lồ ít quan hệ |

Quy tắc thực dụng:

- Dữ liệu có **quan hệ chặt** và cần **tính đúng tuyệt đối** (tiền bạc, đơn hàng, kho) → **SQL**.
- Cần **đọc/ghi cực nhanh ở quy mô lớn**, cấu trúc thay đổi liên tục, ít JOIN (giỏ hàng tạm, session, đếm lượt xem) → **NoSQL**.
- Rất nhiều hệ thống dùng **cả hai**: SQL cho dữ liệu lõi, Redis cache cho tốc độ, DynamoDB cho phần quy mô khủng.

> 💡 Ghi nhớ: "NoSQL nhanh hơn SQL" là hiểu lầm. Chúng giải bài toán khác nhau. Chọn theo **hình dạng dữ liệu và yêu cầu nhất quán**, không theo trào lưu.

## 10. Bài tập (có lời giải)

Dùng schema cửa hàng ở đầu bài. Hãy tự làm trước khi xem đáp án.

**Bài 1.** Viết một transaction chuyển 200 từ An (id=1) sang Bình (id=2), đảm bảo nếu một bước lỗi thì huỷ cả hai.

**Bài 2.** Giải thích: hiện tượng "đọc cùng một số dư hai lần trong một transaction ra hai kết quả khác nhau" tên là gì, và mức isolation nào trở lên sẽ chặn được nó?

**Bài 3.** Viết câu UPSERT: chèn sản phẩm id=12 tên 'Tai nghe' giá 250 stock 10; nếu đã tồn tại thì **ghi đè** giá và **cộng dồn** stock.

**Bài 4.** Tạo một VIEW tên `rich_customers` liệt kê `id, name` của các khách có `balance >= 300`.

---

### Lời giải

**Bài 1:**

```sql
BEGIN;
  UPDATE customers SET balance = balance - 200 WHERE id = 1;
  UPDATE customers SET balance = balance + 200 WHERE id = 2;
COMMIT;
-- Nếu giữa chừng có lỗi (vd ràng buộc balance >= 0), gọi ROLLBACK
-- thì cả hai UPDATE đều bị huỷ.
```

**Bài 2:** Đó là **non-repeatable read**. Cần mức **REPEATABLE READ** trở lên (REPEATABLE READ hoặc SERIALIZABLE) để chặn. Mức mặc định READ COMMITTED vẫn cho phép hiện tượng này.

**Bài 3:**

```sql
INSERT INTO products (id, name, price, stock)
VALUES (12, 'Tai nghe', 250.00, 10)
ON CONFLICT (id)
DO UPDATE SET price = EXCLUDED.price,
              stock = products.stock + EXCLUDED.stock;
```

Lưu ý: `price` lấy thẳng `EXCLUDED.price` (ghi đè), còn `stock` cộng dồn `products.stock + EXCLUDED.stock`.

**Bài 4:**

```sql
CREATE VIEW rich_customers AS
SELECT id, name
FROM customers
WHERE balance >= 300;

-- Dùng:
SELECT * FROM rich_customers;
```

| id | name |
|---|---|
| 1 | An |

(An có balance 400 sau các ví dụ trước; Bình 150 nên không xuất hiện.)

## Liên hệ sang AWS

Trên AWS, bạn hiếm khi tự cài và vận hành database — có dịch vụ quản lý (managed) lo giúp phần khó (sao lưu, vá lỗi, nhân bản):

- **Amazon RDS** — chạy các database SQL quen thuộc (PostgreSQL, MySQL, MariaDB, SQL Server, Oracle) dạng dịch vụ. Mọi thứ bạn học trong bài (BEGIN/COMMIT, isolation level, VIEW) hoạt động y hệt. AWS lo backup, cập nhật, và **Multi-AZ** để tự chuyển sang máy dự phòng khi sự cố — đúng tinh thần chữ **D** (Durability) của ACID.

- **Amazon Aurora** — bản tương thích PostgreSQL/MySQL do AWS tự xây lại phần lưu trữ cho nhanh và bền hơn. Vẫn là SQL đầy đủ ACID, nhưng chịu tải tốt hơn và có **read replica** mở rộng phần đọc. Hợp khi RDS thường không đủ sức.

- **Amazon DynamoDB** — đại diện NoSQL key-value/document, scale ngang gần như vô hạn, độ trễ ổn định ở mili-giây. Có hỗ trợ **transaction** (TransactWriteItems) nhưng giới hạn hơn SQL. Hợp với giỏ hàng, session, bảng đếm, hồ sơ người dùng quy mô lớn — đúng cột "NoSQL" trong bảng so sánh ở trên.

Một kiến trúc cửa hàng điển hình trên AWS: **RDS/Aurora** giữ `customers`, `orders`, `products` (cần ACID và JOIN), **DynamoDB** giữ giỏ hàng tạm và phiên đăng nhập (cần nhanh, quy mô lớn). Bạn vừa học xong tư duy để quyết định cái nào nằm ở đâu.
