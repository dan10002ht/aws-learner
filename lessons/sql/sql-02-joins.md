# JOIN: kết nối nhiều bảng

Ở bài trước, mọi câu `SELECT` của chúng ta đều làm việc với **một bảng** duy nhất. Nhưng dữ liệu thật của một cửa hàng không bao giờ nằm gọn trong một bảng. Đơn hàng cần biết **ai** đã mua và **sản phẩm gì** — mà thông tin khách hàng và thông tin sản phẩm lại nằm ở các bảng riêng.

Bài này sẽ dạy bạn cách "ghép" các bảng đó lại với nhau bằng `JOIN`. Đây là kỹ năng quan trọng bậc nhất của SQL: nắm được `JOIN`, bạn mới thực sự khai thác được sức mạnh của cơ sở dữ liệu quan hệ.

## 1. Vì sao phải tách bảng?

### 1.1. Hình dung đời thường

Tưởng tượng bạn quản lý cửa hàng bằng **một bảng Excel khổng lồ** duy nhất, mỗi dòng là một đơn hàng và lặp lại toàn bộ thông tin khách:

| order_id | khach_ten | khach_email          | khach_dia_chi   | san_pham |
|----------|-----------|----------------------|-----------------|----------|
| 1        | An        | an@mail.com          | 12 Lê Lợi, HCM  | Bàn phím |
| 2        | An        | an@mail.com          | 12 Lê Lợi, HCM  | Chuột    |
| 3        | An        | an@mail.com          | 12 Lê Lợi, HCM  | Màn hình |

Khách "An" mua 3 lần thì email và địa chỉ của An bị **chép lại 3 lần**. Khi An đổi email, bạn phải sửa ở cả 3 dòng — sót một dòng là dữ liệu mâu thuẫn ngay. Đây gọi là **dư thừa dữ liệu (data redundancy)** và là nguồn gốc của lỗi.

### 1.2. Giải pháp: mỗi "thực thể" một bảng

Ta tách ra: thông tin khách ghi **một lần** ở bảng `customers`, mỗi đơn hàng ở bảng `orders` chỉ cần "trỏ" tới khách bằng một mã số. Đây chính là ý tưởng của **cơ sở dữ liệu quan hệ (relational database)**: dữ liệu được chia thành nhiều bảng có **quan hệ** với nhau.

> 💡 Ghi nhớ: Nguyên tắc vàng — **mỗi sự thật chỉ lưu ở một nơi**. Sửa một chỗ là đúng ở mọi nơi.

## 2. Khoá chính (PRIMARY KEY) & khoá ngoại (FOREIGN KEY)

Hai bảng "biết" liên kết với nhau nhờ một cặp khoá.

- **PRIMARY KEY (khoá chính)**: cột định danh **duy nhất** cho mỗi dòng trong một bảng. Như số căn cước của một người — không ai trùng ai. Ở `customers`, đó là `customer_id`.
- **FOREIGN KEY (khoá ngoại)**: cột ở bảng này **trỏ tới** khoá chính của bảng khác. Ở `orders`, cột `customer_id` là khoá ngoại trỏ về `customers.customer_id`.

Đây là **schema** (lược đồ) chúng ta sẽ dùng xuyên suốt bài:

```sql
CREATE TABLE customers (
  customer_id INT PRIMARY KEY,
  name        VARCHAR(50),
  city        VARCHAR(50)
);

CREATE TABLE products (
  product_id INT PRIMARY KEY,
  name       VARCHAR(50),
  price      INT
);

CREATE TABLE orders (
  order_id    INT PRIMARY KEY,
  customer_id INT REFERENCES customers(customer_id),  -- FOREIGN KEY
  product_id  INT REFERENCES products(product_id),    -- FOREIGN KEY
  quantity    INT
);
```

Hình dung quan hệ giữa ba bảng: `orders` ở giữa, mỗi đơn "trỏ" về một khách và một sản phẩm bằng hai khoá ngoại.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Sơ đồ quan hệ PK/FK giữa customers, orders, products</title>
  <desc>Bảng orders ở giữa có hai khoá ngoại: customer_id trỏ về khoá chính customer_id của bảng customers bên trái, và product_id trỏ về khoá chính product_id của bảng products bên phải.</desc>
  <defs>
    <marker id="fkArr" markerWidth="11" markerHeight="11" refX="9" refY="3.5" orient="auto"><path d="M0 0 L9 3.5 L0 7 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>

  <g>
    <rect x="16" y="80" width="176" height="120" rx="10" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="104" y="102" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">customers</text>
    <line x1="16" y1="112" x2="192" y2="112" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="26" y="122" width="34" height="18" rx="9" fill="#10b981" fill-opacity="0.9"/>
    <text x="43" y="135" font-size="9.5" font-weight="700" text-anchor="middle" fill="#fff">PK</text>
    <text x="68" y="135" font-size="11.5" font-weight="700" fill="currentColor">customer_id</text>
    <text x="26" y="160" font-size="11" fill="currentColor" opacity="0.7">name</text>
    <text x="26" y="182" font-size="11" fill="currentColor" opacity="0.7">city</text>
  </g>

  <g>
    <rect x="272" y="60" width="176" height="160" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="360" y="82" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">orders</text>
    <line x1="272" y1="92" x2="448" y2="92" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="282" y="102" width="34" height="18" rx="9" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="299" y="115" font-size="9.5" font-weight="700" text-anchor="middle" fill="#fff">PK</text>
    <text x="324" y="115" font-size="11.5" font-weight="700" fill="currentColor">order_id</text>
    <rect x="282" y="128" width="34" height="18" rx="9" fill="#f59e0b" fill-opacity="0.9"/>
    <text x="299" y="141" font-size="9.5" font-weight="700" text-anchor="middle" fill="#fff">FK</text>
    <text x="324" y="141" font-size="11.5" fill="currentColor">customer_id</text>
    <rect x="282" y="154" width="34" height="18" rx="9" fill="#f59e0b" fill-opacity="0.9"/>
    <text x="299" y="167" font-size="9.5" font-weight="700" text-anchor="middle" fill="#fff">FK</text>
    <text x="324" y="167" font-size="11.5" fill="currentColor">product_id</text>
    <text x="282" y="194" font-size="11" fill="currentColor" opacity="0.7">quantity</text>
  </g>

  <g>
    <rect x="528" y="80" width="176" height="120" rx="10" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="616" y="102" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">products</text>
    <line x1="528" y1="112" x2="704" y2="112" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="538" y="122" width="34" height="18" rx="9" fill="#8b5cf6" fill-opacity="0.9"/>
    <text x="555" y="135" font-size="9.5" font-weight="700" text-anchor="middle" fill="#fff">PK</text>
    <text x="580" y="135" font-size="11.5" font-weight="700" fill="currentColor">product_id</text>
    <text x="538" y="160" font-size="11" fill="currentColor" opacity="0.7">name</text>
    <text x="538" y="182" font-size="11" fill="currentColor" opacity="0.7">price</text>
  </g>

  <g stroke="currentColor" stroke-opacity="0.55" fill="none">
    <path d="M282 137 C248 137 224 133 200 131" marker-end="url(#fkArr)"/>
    <path d="M448 163 C486 163 504 134 520 131" marker-end="url(#fkArr)"/>
  </g>
  <text x="232" y="252" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">orders.customer_id → customers.customer_id</text>
  <text x="500" y="252" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">orders.product_id → products.product_id</text>
</svg>

Dữ liệu mẫu (hãy nhớ kỹ vì ta dùng lại liên tục):

**customers**

| customer_id | name | city    |
|-------------|------|---------|
| 1           | An   | HCM     |
| 2           | Bình | Hà Nội  |
| 3           | Châu | Đà Nẵng |
| 4           | Dũng | HCM     |

**products**

| product_id | name     | price   |
|------------|----------|---------|
| 10         | Bàn phím | 500000  |
| 20         | Chuột    | 200000  |
| 30         | Màn hình | 3000000 |

**orders**

| order_id | customer_id | product_id | quantity |
|----------|-------------|------------|----------|
| 1001     | 1           | 10         | 2        |
| 1002     | 1           | 20         | 1        |
| 1003     | 2           | 30         | 1        |
| 1004     | 5           | 10         | 1        |

> ⚠️ Lỗi người mới hay gặp: Để ý đơn `1004` có `customer_id = 5` — nhưng **không có** khách số 5 trong `customers`. Đây là dữ liệu "mồ côi" (cố tình để minh hoạ sự khác nhau giữa các loại JOIN ở phần sau). Khách `Dũng` (id 4) thì chưa có đơn nào.

## 3. INNER JOIN — chỉ lấy phần khớp nhau

`INNER JOIN` ghép hai bảng và **chỉ giữ những dòng khớp** ở cả hai bên. Câu hỏi: "Mỗi đơn hàng là của khách nào?"

```sql
SELECT o.order_id, c.name, o.product_id, o.quantity
FROM orders AS o
INNER JOIN customers AS c
  ON o.customer_id = c.customer_id;
```

Mệnh đề `ON` cho biết **ghép theo cột nào** — ở đây là cặp khoá chính/ngoại `customer_id`. Kết quả:

| order_id | name | product_id | quantity |
|----------|------|------------|----------|
| 1001     | An   | 10         | 2        |
| 1002     | An   | 20         | 1        |
| 1003     | Bình | 30         | 1        |

Để ý: đơn `1004` **biến mất** vì `customer_id = 5` không khớp khách nào. Đó là bản chất của INNER — không khớp thì loại.

> 💡 Ghi nhớ: `INNER JOIN` = giao của hai tập hợp. Trong sơ đồ Venn, đó là **phần chồng lên nhau** ở giữa.

## 4. LEFT / RIGHT / FULL OUTER JOIN

Đôi khi ta muốn **giữ lại cả những dòng không khớp**. Đó là việc của OUTER JOIN. Hình dung bằng sơ đồ Venn — vòng trái là bảng `orders`, vòng phải là `customers`; **vùng tô đậm là phần được giữ lại** ở mỗi loại JOIN:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 200" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Bốn sơ đồ Venn so sánh INNER, LEFT, RIGHT và FULL OUTER JOIN</title>
  <desc>Bốn cặp vòng tròn giao nhau, vòng trái là orders và vòng phải là customers. INNER tô đậm phần giao ở giữa. LEFT tô đậm toàn vòng trái. RIGHT tô đậm toàn vòng phải. FULL OUTER tô đậm cả hai vòng.</desc>
  <defs>
    <clipPath id="vL"><circle cx="0" cy="70" r="42"/></clipPath>
    <clipPath id="vR"><circle cx="44" cy="70" r="42"/></clipPath>
  </defs>

  <g transform="translate(38,10)">
    <text x="58" y="14" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">INNER JOIN</text>
    <g transform="translate(16,18)">
      <g clip-path="url(#vL)"><circle cx="44" cy="70" r="42" fill="#3b82f6" fill-opacity="0.55"/></g>
      <circle cx="0" cy="70" r="42" fill="none" stroke="currentColor" stroke-opacity="0.5"/>
      <circle cx="44" cy="70" r="42" fill="none" stroke="currentColor" stroke-opacity="0.5"/>
    </g>
    <text x="20" y="124" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">orders</text>
    <text x="96" y="124" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">customers</text>
  </g>

  <g transform="translate(206,10)">
    <text x="58" y="14" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">LEFT JOIN</text>
    <g transform="translate(16,18)">
      <circle cx="0" cy="70" r="42" fill="#3b82f6" fill-opacity="0.55" stroke="currentColor" stroke-opacity="0.5"/>
      <circle cx="44" cy="70" r="42" fill="none" stroke="currentColor" stroke-opacity="0.5"/>
    </g>
    <text x="20" y="124" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">orders</text>
    <text x="96" y="124" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">customers</text>
  </g>

  <g transform="translate(374,10)">
    <text x="58" y="14" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">RIGHT JOIN</text>
    <g transform="translate(16,18)">
      <circle cx="0" cy="70" r="42" fill="none" stroke="currentColor" stroke-opacity="0.5"/>
      <circle cx="44" cy="70" r="42" fill="#3b82f6" fill-opacity="0.55" stroke="currentColor" stroke-opacity="0.5"/>
    </g>
    <text x="20" y="124" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">orders</text>
    <text x="96" y="124" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">customers</text>
  </g>

  <g transform="translate(542,10)">
    <text x="58" y="14" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">FULL OUTER</text>
    <g transform="translate(16,18)">
      <circle cx="0" cy="70" r="42" fill="#3b82f6" fill-opacity="0.55" stroke="currentColor" stroke-opacity="0.5"/>
      <circle cx="44" cy="70" r="42" fill="#3b82f6" fill-opacity="0.55" stroke="currentColor" stroke-opacity="0.5"/>
    </g>
    <text x="20" y="124" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">orders</text>
    <text x="96" y="124" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">customers</text>
  </g>
</svg>

### 4.1. LEFT JOIN — giữ TẤT CẢ bảng bên trái

"Mọi đơn hàng, kèm tên khách nếu có." Bảng bên trái (`orders`) được giữ trọn vẹn; bên phải thiếu thì điền `NULL`.

```sql
SELECT o.order_id, o.customer_id, c.name
FROM orders AS o
LEFT JOIN customers AS c
  ON o.customer_id = c.customer_id;
```

| order_id | customer_id | name |
|----------|-------------|------|
| 1001     | 1           | An   |
| 1002     | 1           | An   |
| 1003     | 2           | Bình |
| 1004     | 5           | NULL |

Đơn `1004` được giữ lại, nhưng vì khách số 5 không tồn tại nên `name` là `NULL`. LEFT JOIN rất hữu ích để **tìm dữ liệu mồ côi**: thêm `WHERE c.customer_id IS NULL` sẽ lọc ra đúng đơn `1004`.

### 4.2. RIGHT JOIN — giữ TẤT CẢ bảng bên phải

Ngược lại với LEFT. "Mọi khách hàng, kèm đơn của họ nếu có."

```sql
SELECT c.name, o.order_id
FROM orders AS o
RIGHT JOIN customers AS c
  ON o.customer_id = c.customer_id;
```

| name | order_id |
|------|----------|
| An   | 1001     |
| An   | 1002     |
| Bình | 1003     |
| Châu | NULL     |
| Dũng | NULL     |

Lần này `Châu` và `Dũng` xuất hiện dù chưa mua gì (`order_id` là `NULL`). Đơn `1004` thì biến mất vì khách 5 không nằm trong `customers`.

> 💡 Ghi nhớ: `A RIGHT JOIN B` luôn viết lại được thành `B LEFT JOIN A`. Thực tế đa số người chỉ dùng LEFT cho dễ đọc — cứ đặt bảng "muốn giữ trọn" ở bên trái.

### 4.3. FULL OUTER JOIN — giữ cả hai bên

Giữ tất cả dòng của cả hai bảng; chỗ nào không khớp thì `NULL`.

```sql
SELECT c.name, o.order_id, o.customer_id
FROM orders AS o
FULL OUTER JOIN customers AS c
  ON o.customer_id = c.customer_id;
```

| name | order_id | customer_id |
|------|----------|-------------|
| An   | 1001     | 1           |
| An   | 1002     | 1           |
| Bình | 1003     | 2           |
| Châu | NULL     | NULL        |
| Dũng | NULL     | NULL        |
| NULL | 1004     | 5           |

Có cả `Dũng` (khách không đơn) lẫn đơn `1004` (đơn không khách). Đây là hợp của hai tập hợp trong sơ đồ Venn.

> ⚠️ Lỗi người mới hay gặp: MySQL **không** hỗ trợ `FULL OUTER JOIN` trực tiếp (PostgreSQL, SQL Server thì có). Trên MySQL phải mô phỏng bằng `LEFT JOIN` kết hợp `UNION` với `RIGHT JOIN`.

## 5. JOIN nhiều bảng cùng lúc

Không có giới hạn ở hai bảng — cứ nối tiếp `JOIN`. Câu hỏi: "Đơn nào, của ai, mua sản phẩm gì, thành tiền bao nhiêu?"

```sql
SELECT c.name        AS khach,
       p.name        AS san_pham,
       o.quantity    AS so_luong,
       o.quantity * p.price AS thanh_tien
FROM orders AS o
INNER JOIN customers AS c ON o.customer_id = c.customer_id
INNER JOIN products  AS p ON o.product_id  = p.product_id;
```

| khach | san_pham | so_luong | thanh_tien |
|-------|----------|----------|------------|
| An    | Bàn phím | 2        | 1000000    |
| An    | Chuột    | 1        | 200000     |
| Bình  | Màn hình | 1        | 3000000    |

`orders` đứng ở giữa, đóng vai bảng "cầu nối" giữa `customers` và `products`. Mỗi `JOIN` chỉ ghép thêm một bảng theo cặp khoá tương ứng. Đây là dạng truy vấn bạn sẽ viết hằng ngày.

## 6. Alias bảng — đặt tên gọi tắt

Bạn để ý mọi câu trên đều viết `orders AS o`, `customers AS c`. `o` và `c` là **alias** (bí danh) — tên gọi tắt của bảng. Lợi ích:

- Viết `o.customer_id` ngắn hơn `orders.customer_id`.
- **Bắt buộc** khi hai bảng có cột **trùng tên** (cả `customers` và `products` đều có cột `name`). Không có alias, SQL không biết `name` là của bảng nào và sẽ báo lỗi "ambiguous column".

Từ khoá `AS` có thể bỏ: `FROM orders o` tương đương `FROM orders AS o`.

> 💡 Ghi nhớ: Cứ đặt alias cho mọi bảng ngay từ đầu. Vừa gõ nhanh, vừa tránh lỗi cột nhập nhằng khi câu lệnh lớn dần.

## 7. SELF JOIN — bảng tự nối với chính nó

Đôi khi một bảng có quan hệ với... chính nó. Ví dụ kinh điển: bảng nhân viên, mỗi người có một `manager_id` trỏ tới một nhân viên khác cũng trong bảng đó.

```sql
CREATE TABLE employees (
  emp_id     INT PRIMARY KEY,
  name       VARCHAR(50),
  manager_id INT  -- trỏ tới emp_id của sếp
);
```

| emp_id | name | manager_id |
|--------|------|------------|
| 1      | An   | NULL       |
| 2      | Bình | 1          |
| 3      | Châu | 1          |

Câu hỏi: "Mỗi nhân viên có sếp tên là gì?" Ta nối `employees` với **chính nó**, dùng **hai alias khác nhau** để phân biệt vai "nhân viên" và vai "sếp":

```sql
SELECT e.name AS nhan_vien, m.name AS sep
FROM employees AS e
LEFT JOIN employees AS m
  ON e.manager_id = m.emp_id;
```

| nhan_vien | sep  |
|-----------|------|
| An        | NULL |
| Bình      | An   |
| Châu      | An   |

An là sếp lớn nhất nên không có sếp (`NULL`) — đó là lý do dùng `LEFT JOIN` để không loại mất An.

> 💡 Ghi nhớ: Self join **bắt buộc** phải có alias — vì không thể phân biệt hai "bản sao" của cùng một bảng nếu chúng cùng tên.

## 8. Bẫy fan-out — JOIN làm nhân dòng

Đây là cái bẫy khiến người mới đếm sai, cộng sai số tiền. Khi một dòng ở bảng A khớp với **nhiều** dòng ở bảng B, dòng của A sẽ bị **nhân lên**.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 250" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Bẫy fan-out — một dòng customers khớp hai dòng orders bị nhân thành hai dòng kết quả</title>
  <desc>Một dòng khách An ở bảng customers khớp hai dòng đơn 1001 và 1002 ở bảng orders, nên sau khi JOIN dòng của An bị nhân thành hai dòng kết quả.</desc>
  <text x="80" y="24" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">customers</text>
  <text x="320" y="24" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">orders</text>
  <text x="600" y="24" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">kết quả JOIN</text>

  <rect x="16" y="100" width="128" height="34" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.35"/>
  <text x="80" y="122" font-size="11.5" text-anchor="middle" fill="currentColor">An (id 1)</text>

  <rect x="256" y="56" width="128" height="34" rx="8" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.35"/>
  <text x="320" y="78" font-size="11.5" text-anchor="middle" fill="currentColor">đơn 1001 (id 1)</text>
  <rect x="256" y="144" width="128" height="34" rx="8" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.35"/>
  <text x="320" y="166" font-size="11.5" text-anchor="middle" fill="currentColor">đơn 1002 (id 1)</text>

  <rect x="496" y="56" width="208" height="34" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.35"/>
  <text x="600" y="78" font-size="11.5" text-anchor="middle" fill="currentColor">An — 1001</text>
  <rect x="496" y="144" width="208" height="34" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.35"/>
  <text x="600" y="166" font-size="11.5" text-anchor="middle" fill="currentColor">An — 1002</text>

  <defs>
    <marker id="foArr" markerWidth="11" markerHeight="11" refX="9" refY="3.5" orient="auto"><path d="M0 0 L9 3.5 L0 7 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none">
    <path d="M144 112 C200 100 210 78 252 73" marker-end="url(#foArr)"/>
    <path d="M144 122 C200 140 210 160 252 161" marker-end="url(#foArr)"/>
    <path d="M384 73 H492" marker-end="url(#foArr)"/>
    <path d="M384 161 H492" marker-end="url(#foArr)"/>
  </g>
  <text x="200" y="210" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.75">1 dòng khách khớp 2 đơn → nhân dòng</text>
  <text x="600" y="210" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.75">thành 2 dòng kết quả</text>
</svg>

Ví dụ: khách `An` (id 1) có **2 đơn** (1001, 1002). Bây giờ JOIN rồi đếm:

```sql
SELECT c.name, COUNT(*) AS so_dong
FROM customers AS c
INNER JOIN orders AS o ON c.customer_id = o.customer_id
GROUP BY c.name;
```

| name | so_dong |
|------|---------|
| An   | 2       |
| Bình | 1       |

Dòng của `An` đã bị nhân thành 2. Điều này **đúng** nếu bạn muốn đếm số đơn. Nhưng nếu bạn cộng một cột thuộc về *khách* (ví dụ một hạn mức tín dụng lưu ở `customers`), nó sẽ bị **cộng trùng** nhiều lần và ra số sai.

> ⚠️ Lỗi người mới hay gặp: `SUM` một giá trị thuộc bảng "một" sau khi JOIN với bảng "nhiều" sẽ bị nhân lên. Ví dụ nếu mỗi khách có cột `credit = 100`, thì `SUM(c.credit)` cho An ra `200` (sai), chứ không phải `100`.

Cách tránh: **tổng hợp trước rồi mới JOIN** (dùng subquery — sẽ học kỹ ở bài sau):

```sql
SELECT c.name, o.so_don
FROM customers AS c
LEFT JOIN (
  SELECT customer_id, COUNT(*) AS so_don
  FROM orders
  GROUP BY customer_id
) AS o ON c.customer_id = o.customer_id;
```

Như vậy mỗi khách chỉ còn đúng một dòng, không bị nhân.

## 9. Bài tập

Dùng đúng schema `customers`, `products`, `orders` với dữ liệu mẫu ở phần 2.

### Bài 1

Liệt kê tên khách (`name`), tên sản phẩm và số lượng của **mọi đơn hàng thực sự khớp** cả khách lẫn sản phẩm.

<details>
<summary>Lời giải</summary>

```sql
SELECT c.name AS khach, p.name AS san_pham, o.quantity
FROM orders AS o
INNER JOIN customers AS c ON o.customer_id = c.customer_id
INNER JOIN products  AS p ON o.product_id  = p.product_id;
```

Đơn `1004` bị loại vì khách số 5 không tồn tại. Kết quả 3 dòng: An–Bàn phím–2, An–Chuột–1, Bình–Màn hình–1.
</details>

### Bài 2

Tìm những khách hàng **chưa từng đặt đơn nào**.

<details>
<summary>Lời giải</summary>

```sql
SELECT c.name
FROM customers AS c
LEFT JOIN orders AS o ON c.customer_id = o.customer_id
WHERE o.order_id IS NULL;
```

LEFT JOIN giữ mọi khách; khách không có đơn sẽ có cột bên `orders` là `NULL`. Lọc `IS NULL` ra được `Châu` và `Dũng`.
</details>

### Bài 3

Với mỗi khách, tính **tổng số tiền** họ đã chi (`quantity * price`). Cẩn thận bẫy fan-out!

<details>
<summary>Lời giải</summary>

```sql
SELECT c.name, SUM(o.quantity * p.price) AS tong_chi
FROM customers AS c
INNER JOIN orders   AS o ON c.customer_id = o.customer_id
INNER JOIN products AS p ON o.product_id  = p.product_id
GROUP BY c.name;
```

Ở đây ta `SUM` một biểu thức tính **trên từng dòng đơn** (`quantity * price`), nên việc dòng bị nhân là *đúng ý muốn* — mỗi đơn được cộng một lần. Kết quả: An = 2×500000 + 1×200000 = 1.200.000; Bình = 1×3.000.000.

Bẫy fan-out chỉ nguy hiểm khi bạn `SUM` một giá trị thuộc bảng "một" (ví dụ một cột của `customers`), không phải biểu thức theo từng dòng đơn.
</details>

### Bài 4

Liệt kê **mọi sản phẩm**, kèm tổng số lượng đã bán; sản phẩm chưa bán được lần nào vẫn phải xuất hiện với số lượng `0`.

<details>
<summary>Lời giải</summary>

```sql
SELECT p.name, COALESCE(SUM(o.quantity), 0) AS da_ban
FROM products AS p
LEFT JOIN orders AS o ON p.product_id = o.product_id
GROUP BY p.name;
```

LEFT JOIN từ `products` giữ cả sản phẩm chưa có đơn; `SUM` của một tập rỗng là `NULL`, nên dùng `COALESCE(..., 0)` để đổi thành `0`. (Trong dữ liệu mẫu cả 3 sản phẩm đều đã bán, nhưng câu lệnh vẫn an toàn nếu thêm sản phẩm mới.)
</details>

## Liên hệ sang AWS

Mọi thứ bạn vừa học về `JOIN` và quan hệ giữa các bảng đều áp dụng nguyên vẹn khi bạn chạy database trên AWS — chỉ khác ở chỗ ai lo phần hạ tầng.

- **Amazon RDS**: dịch vụ database **quan hệ** được quản lý (managed). Bạn chọn engine quen thuộc — PostgreSQL, MySQL, SQL Server... — và AWS lo việc cài đặt, sao lưu, vá lỗi. Câu `INNER JOIN`, `LEFT JOIN` của bạn chạy y hệt; điều thay đổi là bạn không phải tự quản máy chủ. Đây là lựa chọn mặc định khi ứng dụng cần quan hệ và `JOIN`.
- **Amazon Aurora**: vẫn là database quan hệ (tương thích MySQL/PostgreSQL) nên `JOIN` không đổi gì, nhưng được AWS thiết kế lại phần lưu trữ để **nhanh và bền hơn**, tự nhân bản dữ liệu qua nhiều vùng khả dụng. Phù hợp khi cần hiệu năng và độ sẵn sàng cao mà vẫn giữ mô hình quan hệ.
- **Amazon DynamoDB**: đây là **NoSQL** — và điểm mấu chốt là DynamoDB **không có `JOIN`**. Triết lý ngược lại bài này: thay vì tách bảng rồi ghép khi truy vấn, người ta thường **gộp dữ liệu liên quan vào sẵn** (denormalize) để đọc cực nhanh ở quy mô lớn. Đổi lại, bạn mất sự linh hoạt khi truy vấn theo nhiều chiều.

> 💡 Ghi nhớ: Cần `JOIN`, quan hệ chặt chẽ, truy vấn linh hoạt thì chọn **RDS/Aurora**. Cần độ trễ cực thấp ở quy mô khổng lồ và chấp nhận thiết kế dữ liệu quanh một vài kiểu truy vấn cố định thì cân nhắc **DynamoDB**. Hiểu `JOIN` giúp bạn biết *khi nào nên* và *khi nào không nên* dùng database quan hệ.
