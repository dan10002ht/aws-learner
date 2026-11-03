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

> Lỗi người mới hay gặp: dùng `FLOAT`/`DOUBLE` cho tiền. Số thực dấu phẩy động làm tròn sai (vd `0.1 + 0.2 ≠ 0.3`). Tiền luôn dùng `DECIMAL(p, s)` — `p` là tổng chữ số, `s` là số chữ số sau dấu phẩy. `DECIMAL(10,2)` chứa tối đa `99999999.99`.

> Ghi nhớ: `VARCHAR(100)` chỉ tốn chỗ theo độ dài thực tế của chuỗi, còn `CHAR(100)` luôn chiếm đủ 100 ký tự. Với dữ liệu dài không định trước (bài viết, mô tả), dùng `TEXT`.

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

> Ghi nhớ: nên dùng khoá chính là một id "vô nghĩa" (surrogate key) do hệ thống sinh ra, thay vì dữ liệu nghiệp vụ như email hay số điện thoại. Email có thể đổi; id thì không bao giờ đổi.

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

> Lỗi người mới hay gặp: quên đặt `UNIQUE` cho email rồi để hai khách trùng email, sau này tính năng "đăng nhập bằng email" loạn lên. Đặt ràng buộc ngay từ đầu rẻ hơn dọn dữ liệu bẩn về sau rất nhiều.

> Ghi nhớ: ràng buộc là "lưới an toàn" ở tầng database. Đừng chỉ kiểm tra ở code ứng dụng — bug ở code vẫn có thể đẩy dữ liệu sai xuống. Database là tuyến phòng thủ cuối cùng.

## 4. Quan hệ giữa các bảng

Ba kiểu quan hệ cơ bản giữa các bảng — đọc ký hiệu: vạch đơn `┼` là phía "một", chân quạ `<` là phía "nhiều":

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Ba kiểu quan hệ giữa các bảng: 1-n, 1-1 và n-n</title>
  <desc>Sơ đồ ER minh hoạ: customers một-nhiều orders (khoá ngoại customer_id phía nhiều), customers một-một customer_profiles (khoá ngoại UNIQUE), và orders nhiều-nhiều products qua bảng trung gian order_items.</desc>
  <text x="16" y="22" font-size="13" font-weight="700" fill="currentColor">1-n (một-nhiều)</text>
  <g>
    <rect x="16" y="36" width="120" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="76" y="54" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">customers</text>
    <text x="76" y="69" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">id (PK)</text>
    <rect x="236" y="36" width="120" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="296" y="54" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">orders</text>
    <text x="296" y="69" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">customer_id (FK)</text>
    <line x1="136" y1="56" x2="236" y2="56" stroke="currentColor" stroke-opacity="0.55"/>
    <line x1="150" y1="48" x2="150" y2="64" stroke="currentColor" stroke-opacity="0.55"/>
    <path d="M236 56 L222 48 M236 56 L222 64" fill="none" stroke="currentColor" stroke-opacity="0.55"/>
    <text x="186" y="50" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">1 : n</text>
    <text x="378" y="60" font-size="10.5" fill="currentColor" opacity="0.7">Một khách → nhiều đơn.</text>
  </g>
  <text x="16" y="124" font-size="13" font-weight="700" fill="currentColor">1-1 (một-một)</text>
  <g>
    <rect x="16" y="138" width="120" height="40" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="76" y="156" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">customers</text>
    <text x="76" y="171" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">id (PK)</text>
    <rect x="236" y="138" width="150" height="40" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="311" y="156" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">customer_profiles</text>
    <text x="311" y="171" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">customer_id (PK, FK)</text>
    <line x1="136" y1="158" x2="236" y2="158" stroke="currentColor" stroke-opacity="0.55"/>
    <line x1="150" y1="150" x2="150" y2="166" stroke="currentColor" stroke-opacity="0.55"/>
    <line x1="222" y1="150" x2="222" y2="166" stroke="currentColor" stroke-opacity="0.55"/>
    <text x="186" y="152" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">1 : 1</text>
    <text x="408" y="162" font-size="10.5" fill="currentColor" opacity="0.7">FK là UNIQUE → đúng 1 hồ sơ.</text>
  </g>
  <text x="16" y="226" font-size="13" font-weight="700" fill="currentColor">n-n (nhiều-nhiều) — cần bảng trung gian</text>
  <g>
    <rect x="16" y="244" width="110" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="71" y="262" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">orders</text>
    <text x="71" y="277" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">id (PK)</text>
    <rect x="290" y="244" width="160" height="40" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="370" y="262" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">order_items</text>
    <text x="370" y="277" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">(order_id, product_id) PK</text>
    <rect x="600" y="244" width="110" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="655" y="262" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">products</text>
    <text x="655" y="277" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">id (PK)</text>
    <line x1="126" y1="264" x2="290" y2="264" stroke="currentColor" stroke-opacity="0.55"/>
    <line x1="140" y1="256" x2="140" y2="272" stroke="currentColor" stroke-opacity="0.55"/>
    <path d="M290 264 L276 256 M290 264 L276 272" fill="none" stroke="currentColor" stroke-opacity="0.55"/>
    <line x1="450" y1="264" x2="600" y2="264" stroke="currentColor" stroke-opacity="0.55"/>
    <line x1="586" y1="256" x2="586" y2="272" stroke="currentColor" stroke-opacity="0.55"/>
    <path d="M450 264 L464 256 M450 264 L464 272" fill="none" stroke="currentColor" stroke-opacity="0.55"/>
    <text x="208" y="258" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">1 : n</text>
    <text x="525" y="258" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">n : 1</text>
  </g>
  <text x="16" y="312" font-size="10.5" fill="currentColor" opacity="0.7">n-n được tách thành hai quan hệ 1-n nối qua bảng trung gian order_items.</text>
</svg>

### Quan hệ 1-n (một-nhiều)

Phổ biến nhất. Một khách có **nhiều** đơn hàng; mỗi đơn hàng thuộc về **một** khách. Ta đặt khoá ngoại ở phía "nhiều" (bảng `orders`).

```sql
-- orders.customer_id trỏ về customers.id (đã làm ở mục 3)
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

> Ghi nhớ: dấu hiệu nhận biết n-n là khi cả hai phía đều "nhiều". Lúc đó **luôn** cần bảng trung gian. Khoá chính của nó thường là cặp `(order_id, product_id)` — gọi là khoá chính tổ hợp (composite key).

## 5. Chuẩn hoá (Normalization): 1NF, 2NF, 3NF

Chuẩn hoá là quá trình tách bảng để **mỗi sự thật chỉ lưu một chỗ**, tránh lặp và mâu thuẫn. Hãy bắt đầu từ một bảng "xấu" rồi sửa dần.

Hành trình từ bảng "xấu" nhồi mọi thứ → schema tách bảng (giả định mỗi sản phẩm có một dòng trong đơn):

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 552" role="img" aria-labelledby="fix-sql04-nf-t fix-sql04-nf-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif,system-ui,sans-serif">
<title id="fix-sql04-nf-t">Chuẩn hoá: từ danh sách sản phẩm tới ba bảng liên kết</title>
<desc id="fix-sql04-nf-d">Chuẩn hoá: từ danh sách sản phẩm tới ba bảng liên kết</desc>
<defs><marker id="fix-sql04-nf-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker></defs>
<text x="16" y="24" font-size="15" text-anchor="start" fill="currentColor">Tách theo phụ thuộc hàm, không theo tên cột</text><rect x="16" y="42" width="488" height="64" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="28" y="65" font-size="13" text-anchor="start" fill="currentColor">order_id · customer_name · products</text><text x="28" y="88" font-size="13" text-anchor="start" fill="currentColor">1 · Lan Anh · &quot;Áo, Quần&quot;; 2 · Minh · &quot;Mũ&quot;</text><g data-step="1"><path d="M260 106 V148" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#fix-sql04-nf-a)"/><text x="276" y="133" font-size="13" text-anchor="start" fill="currentColor">1NF</text><rect x="16" y="150" width="488" height="86" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="28" y="173" font-size="13" text-anchor="start" fill="currentColor">order_id · customer_name · product</text><text x="28" y="196" font-size="13" text-anchor="start" fill="currentColor">1 · Lan Anh · Áo; 1 · Lan Anh · Quần</text><text x="28" y="219" font-size="13" text-anchor="start" fill="currentColor">2 · Minh · Mũ (mỗi ô một giá trị)</text></g><g data-step="2"><path d="M260 236 L123 316" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#fix-sql04-nf-a)"/><path d="M260 236 L381 316" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#fix-sql04-nf-a)"/><text x="16" y="253" font-size="13" fill="currentColor">2NF: order_id → customer_name</text><rect x="16" y="320" width="214" height="80" rx="7" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/><text x="28" y="343" font-size="13" fill="currentColor">orders: id (PK)</text><rect x="258" y="320" width="246" height="80" rx="7" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/><text x="270" y="343" font-size="13" fill="currentColor">order_items: khoá tổ hợp</text><text x="270" y="366" font-size="13" fill="currentColor">(order_id, product_id)</text><text x="270" y="389" font-size="13" fill="currentColor">quantity</text></g>
<g data-step="3"><text x="28" y="366" font-size="13" fill="currentColor">customer_id (FK)</text><path d="M123 400 V440" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#fix-sql04-nf-a)"/><text x="258" y="426" font-size="13" fill="currentColor">3NF: customer_id → name</text><rect x="16" y="444" width="214" height="50" rx="7" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/><text x="28" y="466" font-size="13" fill="currentColor">customers: id (PK), name</text><text x="258" y="472" font-size="13" fill="currentColor">tên khách lưu một nơi</text></g>
<text x="16" y="510" font-size="13" text-anchor="start" fill="currentColor">order_items giữ quantity theo khoá tổ hợp.</text><text x="16" y="534" font-size="13" text-anchor="start" fill="currentColor">Ví dụ city/zip bên dưới minh hoạ 3NF riêng.</text>
</svg>
<step-note data-step="1">Tách danh sách sản phẩm thành dòng; giả định một sản phẩm xuất hiện tối đa một dòng mỗi đơn, khoá là (order_id, product).</step-note>
<step-note data-step="2">Tên khách phụ thuộc order_id, không phụ thuộc toàn bộ khoá tổ hợp: tách thông tin đơn khỏi dòng hàng để đạt 2NF.</step-note>
<step-note data-step="3">Ở schema cuối, thêm customer_id để tham chiếu customers; tên khách phụ thuộc customer_id nên tách khỏi orders. quantity vẫn ở order_items. Ví dụ city/zip trong phần 3NF là ví dụ độc lập.</step-note>
</step-flow>

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

2NF áp dụng khi khoá chính là tổ hợp. **Mọi cột không-khoá phải phụ thuộc vào TOÀN BỘ khoá**, không chỉ một phần. Ở bảng trên, khoá là `(order_id, product)`, nhưng `customer_name` chỉ phụ thuộc vào `order_id` — đó là phụ thuộc một phần. Tách thông tin đơn khỏi dòng hàng; schema cuối dưới đây dùng thêm bảng `customers` với phụ thuộc `customer_id → name`, nên tên khách không lặp trong `orders`. Ví dụ `city/zip` ở mục sau minh hoạ 3NF độc lập.

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

Trong mô hình ví dụ, giả định mỗi thành phố có đúng một mã zip (không phải quy tắc địa chỉ thực tế). Ở đây `city_zip` phụ thuộc vào `customer_city`, mà `customer_city` lại không phải khoá → phụ thuộc bắc cầu (`id → city → zip`). Nếu Hà Nội đổi mã zip, bạn phải sửa nhiều dòng. Tách `city`/`zip` sang bảng riêng.

> Ghi nhớ nhanh 3NF: "mỗi cột không-khoá phụ thuộc vào **khoá, toàn bộ khoá, và không gì ngoài khoá**" (the key, the whole key, and nothing but the key).

> Lỗi người mới hay gặp: lưu lặp dữ liệu suy ra được, ví dụ cột `total` trong `orders` rồi cũng lưu thêm `customer_name` trong từng dòng `order_items`. Tên khách có thể tra qua `JOIN` — lưu lại chỉ tạo cơ hội cho dữ liệu mâu thuẫn.

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

> Ghi nhớ: mặc định hãy chuẩn hoá. Chỉ denormalize khi đã đo được vấn đề hiệu năng thật, chứ không phỏng đoán. "Premature optimization" cũng đúng với database.

## 7. Ghép lại: CREATE TABLE toàn schema

Sơ đồ ER hoàn chỉnh của schema cuối — bốn bảng với khoá chính (PK), khoá ngoại (FK) và khoá tổ hợp ở bảng trung gian:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Sơ đồ ER hoàn chỉnh: customers, products, orders, order_items với PK, FK và khoá tổ hợp</title>
  <desc>customers một-nhiều orders qua customer_id; orders một-nhiều order_items qua order_id; products một-nhiều order_items qua product_id. order_items có khoá chính tổ hợp (order_id, product_id) và là bảng trung gian cho quan hệ nhiều-nhiều giữa orders và products.</desc>
  <g>
    <rect x="16" y="40" width="170" height="92" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.28"/>
    <text x="101" y="60" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">customers</text>
    <line x1="16" y1="68" x2="186" y2="68" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="28" y="86" font-size="10.5" font-weight="700" fill="currentColor">PK id</text>
    <text x="28" y="104" font-size="10.5" fill="currentColor" opacity="0.78">name</text>
    <text x="28" y="121" font-size="10.5" fill="currentColor" opacity="0.78">email (UNIQUE)</text>
  </g>
  <g>
    <rect x="534" y="40" width="170" height="92" rx="9" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.28"/>
    <text x="619" y="60" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">products</text>
    <line x1="534" y1="68" x2="704" y2="68" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="546" y="86" font-size="10.5" font-weight="700" fill="currentColor">PK id</text>
    <text x="546" y="104" font-size="10.5" fill="currentColor" opacity="0.78">name</text>
    <text x="546" y="121" font-size="10.5" fill="currentColor" opacity="0.78">price</text>
  </g>
  <g>
    <rect x="16" y="226" width="170" height="92" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.28"/>
    <text x="101" y="246" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">orders</text>
    <line x1="16" y1="254" x2="186" y2="254" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="28" y="272" font-size="10.5" font-weight="700" fill="currentColor">PK id</text>
    <text x="28" y="290" font-size="10.5" fill="currentColor" opacity="0.78">FK customer_id</text>
    <text x="28" y="307" font-size="10.5" fill="currentColor" opacity="0.78">ordered_at</text>
  </g>
  <g>
    <rect x="500" y="222" width="204" height="104" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.28"/>
    <text x="602" y="242" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">order_items</text>
    <line x1="500" y1="250" x2="704" y2="250" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="512" y="268" font-size="10" font-weight="700" fill="currentColor">PK,FK order_id</text>
    <text x="512" y="285" font-size="10" font-weight="700" fill="currentColor">PK,FK product_id</text>
    <text x="512" y="302" font-size="10" fill="currentColor" opacity="0.78">quantity</text>
    <text x="512" y="318" font-size="10" fill="currentColor" opacity="0.78">unit_price</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none">
    <path d="M101 132 L101 226"/>
    <line x1="93" y1="148" x2="109" y2="148"/>
    <path d="M101 226 L93 212 M101 226 L109 212"/>
    <path d="M186 280 L500 280"/>
    <line x1="200" y1="272" x2="200" y2="288"/>
    <path d="M500 280 L486 272 M500 280 L486 288"/>
    <path d="M619 132 L619 222"/>
    <line x1="611" y1="148" x2="627" y2="148"/>
    <path d="M619 222 L611 208 M619 222 L627 208"/>
  </g>
  <g font-size="10" fill="currentColor" opacity="0.72">
    <text x="111" y="184">1 : n</text>
    <text x="330" y="274">1 : n</text>
    <text x="629" y="184">1 : n</text>
  </g>
  <text x="220" y="356" font-size="10.5" fill="currentColor" opacity="0.72">order_items là bảng trung gian: khoá tổ hợp (order_id, product_id) đồng thời là hai FK.</text>
</svg>

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

> Lỗi người mới hay gặp: tạo bảng sai thứ tự. Bảng được `REFERENCES` (vd `customers`) phải tồn tại **trước** bảng tham chiếu nó (vd `orders`). Tạo cha trước, con sau.

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

> Ghi nhớ: hiểu chuẩn hoá giúp bạn chọn đúng công cụ. Dữ liệu quan hệ phức tạp, cần toàn vẹn → RDS/Aurora. Truy vấn đơn giản, lưu lượng khổng lồ, mẫu truy cập cố định → DynamoDB. Thiết kế schema không phải "đúng/sai" tuyệt đối, mà là chọn đánh đổi phù hợp với bài toán.
