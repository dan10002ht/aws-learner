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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Vòng đời transaction: BEGIN, thay đổi tạm thời, rồi rẽ nhánh COMMIT hoặc ROLLBACK</title>
  <desc>Từ trạng thái nhàn rỗi, BEGIN mở transaction; các UPDATE/INSERT/DELETE là thay đổi tạm thời chưa ai khác thấy; từ đó rẽ hai nhánh: COMMIT chốt vĩnh viễn và bền vững, hoặc ROLLBACK xoá sạch mọi thay đổi như chưa từng xảy ra, cả hai quay về trạng thái nhàn rỗi.</desc>
  <defs>
    <marker id="txArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">Vòng đời một transaction</text>
  <g>
    <rect x="20" y="118" width="120" height="44" rx="22" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="80" y="145" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.85">Nhàn rỗi</text>
  </g>
  <line x1="140" y1="140" x2="184" y2="140" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#txArr)"/>
  <text x="162" y="132" font-size="10.5" text-anchor="middle" font-weight="700" fill="currentColor">BEGIN</text>
  <g>
    <rect x="190" y="104" width="200" height="72" rx="11" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="290" y="130" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Đang mở</text>
    <text x="290" y="149" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">thay đổi TẠM THỜI</text>
    <text x="290" y="165" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">UPDATE / INSERT / DELETE</text>
  </g>
  <line x1="390" y1="124" x2="500" y2="68" stroke="#10b981" stroke-opacity="0.7" marker-end="url(#txArr)"/>
  <text x="438" y="84" font-size="10.5" font-weight="700" fill="#10b981">COMMIT</text>
  <line x1="390" y1="156" x2="500" y2="212" stroke="#f59e0b" stroke-opacity="0.85" marker-end="url(#txArr)"/>
  <text x="438" y="205" font-size="10.5" font-weight="700" fill="#f59e0b">ROLLBACK</text>
  <g>
    <rect x="506" y="40" width="198" height="60" rx="11" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="605" y="64" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Đã chốt</text>
    <text x="605" y="83" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">chính thức &amp; bền vững (D)</text>
  </g>
  <g>
    <rect x="506" y="180" width="198" height="60" rx="11" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="605" y="204" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Đã huỷ</text>
    <text x="605" y="223" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">xoá sạch như chưa xảy ra</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.35" fill="none" stroke-dasharray="4 3">
    <path d="M605 100 v18 h-525 v18" marker-end="url(#txArr)"/>
    <path d="M605 240 v22 h-525 v-100" marker-end="url(#txArr)"/>
  </g>
  <text x="330" y="286" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">cả hai nhánh kết thúc → quay về Nhàn rỗi</text>
</svg>

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

Ta cần biết 3 hiện tượng lỗi (read phenomena) trước. Sơ đồ dưới đọc theo trục thời gian đi **xuống**, hai cột là hai transaction chạy song song — ai đọc/ghi/COMMIT lúc nào dẫn tới lỗi:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 470" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Timeline ba hiện tượng đọc lỗi: dirty read, non-repeatable read, phantom read</title>
  <desc>Ba sơ đồ thời gian, mỗi sơ đồ hai cột T1 và T2 với thời gian đi xuống. Dirty read: T1 ghi balance=0 chưa commit, T2 đọc thấy 0, T1 rollback nên số 0 là ma. Non-repeatable read: T1 đọc 500, T2 cập nhật còn 400 và commit, T1 đọc lại ra 400 khác lần đầu. Phantom read: T1 đếm 3 đơn paid, T2 chèn thêm một đơn paid và commit, T1 đếm lại ra 4 đơn.</desc>
  <g font-size="11.5" font-weight="700" fill="currentColor">
    <text x="120" y="22" text-anchor="middle">Dirty read</text>
    <text x="365" y="22" text-anchor="middle">Non-repeatable read</text>
    <text x="610" y="22" text-anchor="middle">Phantom read</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.2">
    <line x1="20" y1="36" x2="230" y2="36"/>
    <line x1="255" y1="36" x2="475" y2="36"/>
    <line x1="500" y1="36" x2="700" y2="36"/>
  </g>
  <g font-size="10.5" font-weight="700" fill="currentColor" text-anchor="middle">
    <text x="70" y="52">T1</text><text x="170" y="52">T2</text>
    <text x="310" y="52">T1</text><text x="420" y="52">T2</text>
    <text x="550" y="52">T1</text><text x="660" y="52">T2</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.28" stroke-dasharray="3 4">
    <line x1="70" y1="58" x2="70" y2="440"/><line x1="170" y1="58" x2="170" y2="440"/>
    <line x1="310" y1="58" x2="310" y2="440"/><line x1="420" y1="58" x2="420" y2="440"/>
    <line x1="550" y1="58" x2="550" y2="440"/><line x1="660" y1="58" x2="660" y2="440"/>
  </g>
  <text x="14" y="250" font-size="9.5" fill="currentColor" opacity="0.5" transform="rotate(-90 14 250)" text-anchor="middle">thời gian →</text>
  <defs>
    <marker id="rpArr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
  <!-- Dirty read -->
  <g font-size="9.5" fill="currentColor">
    <rect x="28" y="74" width="84" height="34" rx="6" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="70" y="88" text-anchor="middle">UPDATE bal=0</text>
    <text x="70" y="101" text-anchor="middle" opacity="0.7">(chưa COMMIT)</text>
    <rect x="128" y="128" width="86" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="171" y="142" text-anchor="middle">SELECT bal</text>
    <text x="171" y="155" text-anchor="middle" font-weight="700">đọc 0 (bẩn!)</text>
    <rect x="34" y="182" width="72" height="24" rx="6" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="70" y="198" text-anchor="middle" font-weight="700">ROLLBACK</text>
    <text x="120" y="232" text-anchor="middle" opacity="0.75" font-style="italic">số 0 chưa từng có thật</text>
    <line x1="112" y1="92" x2="166" y2="128" stroke="currentColor" stroke-opacity="0.4" marker-end="url(#rpArr)"/>
  </g>
  <!-- Non-repeatable read -->
  <g font-size="9.5" fill="currentColor">
    <rect x="270" y="74" width="80" height="30" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="310" y="93" text-anchor="middle">SELECT → 500</text>
    <rect x="378" y="120" width="86" height="34" rx="6" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="421" y="134" text-anchor="middle">UPDATE bal=400</text>
    <text x="421" y="147" text-anchor="middle" font-weight="700">COMMIT</text>
    <rect x="266" y="170" width="88" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="310" y="184" text-anchor="middle">SELECT → 400</text>
    <text x="310" y="197" text-anchor="middle" font-weight="700">khác lần đầu!</text>
    <line x1="464" y1="150" x2="356" y2="178" stroke="currentColor" stroke-opacity="0.4" marker-end="url(#rpArr)"/>
  </g>
  <!-- Phantom read -->
  <g font-size="9.5" fill="currentColor">
    <rect x="508" y="74" width="86" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="551" y="88" text-anchor="middle">COUNT paid</text>
    <text x="551" y="101" text-anchor="middle">→ 3 đơn</text>
    <rect x="616" y="120" width="86" height="34" rx="6" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="659" y="134" text-anchor="middle">INSERT paid</text>
    <text x="659" y="147" text-anchor="middle" font-weight="700">COMMIT</text>
    <rect x="506" y="170" width="90" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="551" y="184" text-anchor="middle">COUNT → 4 đơn</text>
    <text x="551" y="197" text-anchor="middle" font-weight="700">bóng ma!</text>
    <line x1="702" y1="150" x2="598" y2="178" stroke="currentColor" stroke-opacity="0.4" marker-end="url(#rpArr)"/>
  </g>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Deadlock vòng chờ tròn và cách phá bằng khoá theo cùng thứ tự id</title>
  <desc>Bên trái: T1 giữ khoá hàng 1 và chờ hàng 2, T2 giữ khoá hàng 2 và chờ hàng 1, tạo vòng chờ tròn nên bế tắc. Bên phải: cả T1 và T2 đều khoá id nhỏ trước rồi tới id lớn, nên không tạo vòng tròn và không deadlock.</desc>
  <defs>
    <marker id="dlHold" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 z" fill="#10b981" fill-opacity="0.85"/></marker>
    <marker id="dlWait" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 z" fill="#f59e0b" fill-opacity="0.9"/></marker>
  </defs>
  <text x="180" y="24" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Vòng chờ tròn → DEADLOCK</text>
  <text x="545" y="24" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Cùng thứ tự id → an toàn</text>
  <line x1="360" y1="40" x2="360" y2="300" stroke="currentColor" stroke-opacity="0.2"/>
  <!-- LEFT: deadlock cycle -->
  <g>
    <rect x="40" y="60" width="84" height="40" rx="9" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="82" y="85" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">T1</text>
    <rect x="240" y="60" width="84" height="40" rx="9" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="282" y="85" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">T2</text>
    <rect x="40" y="230" width="84" height="40" rx="9" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="82" y="255" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">hàng 1</text>
    <rect x="240" y="230" width="84" height="40" rx="9" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="282" y="255" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">hàng 2</text>
    <line x1="82" y1="100" x2="82" y2="228" stroke="#10b981" stroke-opacity="0.7" marker-end="url(#dlHold)"/>
    <text x="60" y="170" font-size="9.5" text-anchor="end" fill="#10b981" font-weight="700">giữ</text>
    <line x1="282" y1="100" x2="282" y2="228" stroke="#10b981" stroke-opacity="0.7" marker-end="url(#dlHold)"/>
    <text x="304" y="170" font-size="9.5" fill="#10b981" font-weight="700">giữ</text>
    <line x1="120" y1="240" x2="238" y2="92" stroke="#f59e0b" stroke-opacity="0.85" stroke-dasharray="5 3" marker-end="url(#dlWait)"/>
    <text x="208" y="178" font-size="9.5" fill="#f59e0b" font-weight="700">chờ hàng 2</text>
    <line x1="244" y1="240" x2="126" y2="92" stroke="#f59e0b" stroke-opacity="0.85" stroke-dasharray="5 3" marker-end="url(#dlWait)"/>
    <text x="112" y="135" font-size="9.5" text-anchor="end" fill="#f59e0b" font-weight="700">chờ hàng 1</text>
    <text x="182" y="298" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7" font-style="italic">vòng tròn → bế tắc mãi mãi</text>
  </g>
  <!-- RIGHT: ordered locking -->
  <g>
    <rect x="412" y="60" width="84" height="40" rx="9" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="454" y="85" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">T1</text>
    <rect x="600" y="60" width="84" height="40" rx="9" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="642" y="85" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">T2</text>
    <rect x="476" y="160" width="144" height="38" rx="9" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="548" y="184" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">khoá id NHỎ trước</text>
    <rect x="476" y="232" width="144" height="38" rx="9" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="548" y="256" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">rồi id LỚN</text>
    <line x1="454" y1="100" x2="510" y2="158" stroke="#10b981" stroke-opacity="0.7" marker-end="url(#dlHold)"/>
    <line x1="642" y1="100" x2="586" y2="158" stroke="#10b981" stroke-opacity="0.7" marker-end="url(#dlHold)"/>
    <line x1="548" y1="198" x2="548" y2="230" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#dlHold)"/>
    <text x="548" y="298" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7" font-style="italic">không có vòng tròn → không deadlock</text>
  </g>
</svg>

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
