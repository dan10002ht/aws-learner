# Bài 10 — Document DB: MongoDB

## 1. Mục tiêu
Sau bài này bạn có thể:
- Hiểu **document model** (BSON, nested) khác gì bảng quan hệ — và vì sao "một document = một object trong code".
- Ra quyết định **embedding vs referencing**: khi nào lồng dữ liệu vào, khi nào tách bảng rồi `$lookup`.
- Nắm vai trò của **`_id`** và các loại **index** (single, compound, multikey, text) — biết index nào cứu được query nào.
- Viết được **aggregation pipeline** (`$match` → `$group` → `$lookup`) để tính toán/join.
- Hiểu **replica set** (HA) và **sharding** (scale), cùng **multi-document transaction**.
- Tránh **anti-pattern** kinh điển: unbounded array, massive document.

---

## 2. Lý thuyết

### 2.1 Document model — object thay vì hàng-cột

Trong SQL, một entity bị "xé" ra nhiều bảng và bạn phải `JOIN` lại mỗi lần đọc. MongoDB đi hướng ngược: lưu **cả cụm dữ liệu đi liền nhau vào MỘT document** — giống hệt object bạn có trong code.

> Analogy: bảng SQL như một **tủ hồ sơ** với ngăn kéo cứng, mọi tờ giấy cùng loại phải cùng khuôn. Document như một **cặp tài liệu** cho từng khách hàng: bên trong muốn để bao nhiêu tờ, lồng cặp con thế nào cũng được, mỗi cặp một kiểu.

Một document là **BSON** (Binary JSON) — JSON dạng nhị phân, thêm kiểu dữ liệu mà JSON thuần thiếu: `ObjectId`, `Date`, `Decimal128`, `int32/int64`, `binary`. Đây là ví dụ một document `order` với dữ liệu **nested** (object lồng object, array lồng object):

```json
{
  "_id": ObjectId("665f1a2b9c1e4a0012ab34cd"),
  "code": "ORD-2026-001",
  "customer": { "id": 42, "name": "An", "tier": "gold" },
  "items": [
    { "sku": "A1", "qty": 2, "price": 150 },
    { "sku": "B7", "qty": 1, "price": 300 }
  ],
  "total": 600,
  "status": "paid",
  "createdAt": ISODate("2026-07-24T09:00:00Z")
}
```

Đọc cả đơn hàng chỉ tốn **một lần đọc, không JOIN** — vì customer và items đã nằm ngay trong document. Đó là lợi thế locality cốt lõi của document model.

**Schema-flexible, không phải schema-less.** Mỗi document trong cùng một collection *có thể* khác cấu trúc, nhưng thực tế bạn vẫn nên có schema nhất quán và dùng **schema validation** (`$jsonSchema`) để chặn dữ liệu rác. "Linh hoạt" nghĩa là *tiến hoá schema không cần migration khoá bảng*, không phải "vứt bỏ kỷ luật".

### 2.2 Embedding vs Referencing — quyết định thiết kế quan trọng nhất

Đây là câu hỏi trung tâm của schema design trong MongoDB. Không có bảng trung gian, không có foreign key cưỡng chế — **bạn** chọn lồng hay tách.

<svg viewBox="0 0 640 300" role="img" aria-labelledby="er-t er-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="er-t">Embedding vs Referencing</title>
<desc id="er-d">Bên trái lồng items vào trong document order; bên phải tách order và product thành hai collection nối bằng productId</desc>
<text x="160" y="28" text-anchor="middle" font-size="13" fill="currentColor">EMBEDDING (lồng)</text>
<rect x="30" y="45" width="260" height="150" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="45" y="70" font-size="12" fill="currentColor">order {</text>
<text x="60" y="92" font-size="12" fill="currentColor">code, total,</text>
<text x="60" y="114" font-size="12" fill="currentColor">items: [</text>
<rect x="75" y="124" width="195" height="26" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="85" y="141" font-size="11" fill="currentColor">{ sku, qty, price }</text>
<rect x="75" y="154" width="195" height="26" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="85" y="171" font-size="11" fill="currentColor">{ sku, qty, price }</text>
<text x="45" y="192" font-size="12" fill="currentColor">] }  → 1 lần đọc</text>
<text x="480" y="28" text-anchor="middle" font-size="13" fill="currentColor">REFERENCING (tách)</text>
<rect x="350" y="45" width="260" height="70" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="365" y="70" font-size="12" fill="currentColor">order {</text>
<text x="380" y="92" font-size="12" fill="currentColor">productId: 77, qty: 2</text>
<text x="365" y="108" font-size="12" fill="currentColor">}</text>
<rect x="350" y="150" width="260" height="70" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="365" y="175" font-size="12" fill="currentColor">product {</text>
<text x="380" y="197" font-size="12" fill="currentColor">_id: 77, name, price</text>
<text x="365" y="213" font-size="12" fill="currentColor">}</text>
<line x1="440" y1="115" x2="440" y2="150" stroke="currentColor" stroke-width="1.5" marker-end="url(#ea)"/>
<text x="500" y="138" font-size="11" fill="currentColor">$lookup để join</text>
<defs><marker id="ea" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Quy tắc thực dụng — dựa trên **cách dữ liệu được đọc và ghi cùng nhau**:

| Chọn **EMBED** khi | Chọn **REFERENCE** khi |
|--------------------|------------------------|
| Dữ liệu con luôn được đọc **cùng** cha (items của order) | Dữ liệu con được đọc/cập nhật **độc lập** |
| Quan hệ **1–1** hoặc **1–ít** (địa chỉ, cấu hình) | Quan hệ **1–rất nhiều** hoặc **nhiều–nhiều** |
| Con **không** bị chia sẻ giữa nhiều cha | Con **được chia sẻ** (product dùng chung mọi order) |
| Con thay đổi **hiếm**, kích thước **bị chặn** | Con lớn không giới hạn / cập nhật thường xuyên |
| Cần đọc atomic một phát | Muốn tránh duplicate và document phình to |

Nguyên tắc vàng của MongoDB: **"Data that is accessed together should be stored together"** — dữ liệu truy cập cùng nhau nên nằm cùng chỗ. Nhưng đừng embed thứ **tăng vô hạn** (xem anti-pattern §5).

### 2.3 `_id` — khoá chính bắt buộc

Mọi document có trường **`_id` duy nhất trong collection**, là primary key và tự động được index (unique). Nếu bạn không cấp, MongoDB sinh một **`ObjectId`** 12 byte:

```
| 4 byte timestamp | 5 byte random (sinh 1 lần mỗi process) | 3 byte counter |
```

Vì 4 byte đầu là thời gian, ObjectId **tăng dần theo thời gian tạo** → sắp theo `_id` gần như sắp theo thời gian, và insert mới ghi vào cuối B-tree (ít phân mảnh). Bạn cũng có thể tự đặt `_id` bằng giá trị nghiệp vụ (email, mã đơn) để ép duy nhất tự nhiên.

### 2.4 Index — không có index thì mọi query là collection scan

Query không trúng index buộc MongoDB **quét toàn bộ collection** (COLLSCAN) — chậm tuyến tính theo số document. Index là B-tree trỏ tới document, biến quét thành tra cứu.

```javascript
// Single-field: lọc/sắp theo một trường
db.orders.createIndex({ status: 1 })                 // 1 = tăng dần

// Compound: nhiều trường — THỨ TỰ rất quan trọng (quy tắc ESR)
db.orders.createIndex({ customerId: 1, createdAt: -1 })

// Multikey: index trên trường ARRAY — tự động, mỗi phần tử một entry
db.orders.createIndex({ "items.sku": 1 })

// Text: full-text search cơ bản
db.products.createIndex({ name: "text", description: "text" })

// Kiểm tra query có dùng index không
db.orders.find({ status: "paid" }).explain("executionStats")
```

| Loại index | Dùng cho | Ghi chú then chốt |
|------------|----------|-------------------|
| **Single** | 1 trường | Cơ bản nhất |
| **Compound** | Nhiều trường | Prefix trái dùng lại được; theo **ESR: Equality → Sort → Range** |
| **Multikey** | Trường mảng | Tự thành multikey; **không** compound 2 mảng cùng lúc |
| **Text** | Tìm từ khoá | Mỗi collection **tối đa 1** text index |

**Quy tắc ESR** cho compound index: đặt các trường **Equality** (so khớp bằng) trước, rồi trường **Sort**, rồi trường **Range** (`$gt`, `$lt`). Với index `{customerId:1, createdAt:-1}`, một query `find({customerId: 42}).sort({createdAt:-1})` dùng được cả hai phần — vừa lọc vừa sắp không cần sort trong RAM.

Cân bằng: index tăng tốc **đọc** nhưng làm **ghi chậm hơn** và tốn RAM/đĩa (mỗi index là một B-tree phải cập nhật khi ghi). Chỉ tạo index phục vụ query thật.

### 2.5 Aggregation pipeline — dây chuyền biến đổi dữ liệu

`find()` chỉ lọc và trả về. Muốn **nhóm, tính tổng, join, reshape** thì dùng **aggregation pipeline**: dữ liệu chảy qua từng **stage**, output stage trước là input stage sau — giống pipe của Unix.

```javascript
// Doanh thu mỗi khách trong tháng 7/2026, kèm tên khách, top chi tiêu
db.orders.aggregate([
  // 1) $match: lọc SỚM để giảm dữ liệu (dùng được index) — luôn đặt đầu
  { $match: {
      status: "paid",
      createdAt: { $gte: ISODate("2026-07-01"), $lt: ISODate("2026-08-01") }
  }},
  // 2) $group: gom theo customerId, cộng total, đếm số đơn
  { $group: {
      _id: "$customerId",
      revenue: { $sum: "$total" },
      orderCount: { $sum: 1 }
  }},
  // 3) $lookup: JOIN sang collection customers (left outer join)
  { $lookup: {
      from: "customers",
      localField: "_id",           // customerId đã thành _id sau $group
      foreignField: "_id",
      as: "customer"
  }},
  { $unwind: "$customer" },         // biến mảng 1 phần tử thành object
  // 4) $sort + $limit: xếp hạng, lấy top 5
  { $sort: { revenue: -1 } },
  { $limit: 5 },
  // 5) $project: chọn/đổi hình field cuối cùng
  { $project: { _id: 0, name: "$customer.name", revenue: 1, orderCount: 1 } }
])
```

Các stage cốt lõi cần nhớ:

| Stage | Vai trò (tương đương SQL) |
|-------|---------------------------|
| `$match` | `WHERE` — **đặt đầu** để dùng index và cắt dữ liệu sớm |
| `$group` | `GROUP BY` + hàm tổng hợp (`$sum`, `$avg`, `$max`, `$push`) |
| `$lookup` | `LEFT JOIN` sang collection khác |
| `$unwind` | "nổ" mảng thành nhiều document, mỗi phần tử một dòng |
| `$sort` / `$limit` | `ORDER BY` / `LIMIT` |
| `$project` | `SELECT` các cột, tính field mới |

Mẹo hiệu năng: `$match` và `$sort` càng gần đầu càng tốt để tận dụng index; `$lookup` trên trường **có index** ở collection `from`, nếu không sẽ scan mỗi lần join.

### 2.6 Replica set — High Availability

Một node đơn chết là mất dịch vụ. **Replica set** là một nhóm node giữ **cùng dữ liệu**: một **primary** nhận mọi write, các **secondary** sao chép qua **oplog** (nhật ký thao tác). Primary chết → các node **election** bầu primary mới trong vài giây → tự phục hồi (automatic failover).

<svg viewBox="0 0 640 240" role="img" aria-labelledby="rs-t rs-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="rs-t">MongoDB replica set</title>
<desc id="rs-d">Một primary nhận write và sao chép oplog xuống hai secondary; khi primary chết một secondary được bầu lên</desc>
<rect x="40" y="90" width="140" height="60" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="110" y="115" text-anchor="middle" font-size="13" fill="currentColor">PRIMARY</text>
<text x="110" y="135" text-anchor="middle" font-size="11" fill="currentColor">nhận mọi write</text>
<rect x="420" y="30" width="160" height="55" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="500" y="52" text-anchor="middle" font-size="12" fill="currentColor">SECONDARY</text>
<text x="500" y="70" text-anchor="middle" font-size="11" fill="currentColor">bản sao</text>
<rect x="420" y="155" width="160" height="55" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="500" y="177" text-anchor="middle" font-size="12" fill="currentColor">SECONDARY</text>
<text x="500" y="195" text-anchor="middle" font-size="11" fill="currentColor">bản sao</text>
<line x1="180" y1="110" x2="420" y2="60" stroke="currentColor" stroke-width="1.5" marker-end="url(#ra)"/>
<line x1="180" y1="130" x2="420" y2="180" stroke="currentColor" stroke-width="1.5" marker-end="url(#ra)"/>
<text x="300" y="78" text-anchor="middle" font-size="11" fill="currentColor">replicate oplog</text>
<text x="300" y="165" text-anchor="middle" font-size="11" fill="currentColor">replicate oplog</text>
<text x="110" y="185" text-anchor="middle" font-size="11" fill="currentColor">primary chết →</text>
<text x="110" y="202" text-anchor="middle" font-size="11" fill="currentColor">election bầu mới</text>
<defs><marker id="ra" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

- **Write concern** `w: "majority"`: write chỉ được xác nhận khi **đa số** node đã ghi → chống mất dữ liệu khi failover. `w:1` nhanh hơn nhưng có thể mất write nếu primary chết trước khi replicate.
- **Read preference**: `primary` (mặc định, đọc dữ liệu mới nhất) hay `secondaryPreferred` (giảm tải, chấp nhận trễ replication — eventual consistency).
- Nên có **số node lẻ** (3, 5) để election luôn đạt majority; node thứ 3 có thể là **arbiter** (chỉ bỏ phiếu, không giữ dữ liệu) khi thiếu tài nguyên.

### 2.7 Sharding — Scale ngang khi một node không đủ

Replica set giải quyết HA nhưng **mọi write vẫn dồn vào một primary** và toàn bộ data phải vừa một máy. Khi vượt ngưỡng đó, dùng **sharding**: chia collection thành nhiều **shard** (mỗi shard là một replica set) theo **shard key**. `mongos` (router) định tuyến query tới đúng shard.

```javascript
sh.enableSharding("shop")
// Hashed shard key: rải đều write, tránh hotspot (nhưng range query kém)
sh.shardCollection("shop.orders", { customerId: "hashed" })
```

**Shard key là quyết định sống còn** — chọn sai rất khó sửa. Tiêu chí: **high cardinality** (nhiều giá trị), **phân bố đều** (tránh dồn 1 shard), và **khớp pattern query** (query có shard key → **targeted**, chỉ chạm 1 shard; không có → **scatter-gather**, hỏi mọi shard, chậm). Đừng shard sớm: nó thêm phức tạp vận hành lớn — chỉ dùng khi replica set đơn thật sự chạm trần dung lượng/throughput.

### 2.8 Multi-document transaction

Trước đây MongoDB chỉ đảm bảo atomic **trong một document** (nên embedding giúp giữ tính nhất quán). Từ 4.0 (replica set) và 4.2 (sharded), có **multi-document ACID transaction**:

```javascript
const session = db.getMongo().startSession()
session.startTransaction({ writeConcern: { w: "majority" } })
try {
  const orders = session.getDatabase("shop").orders
  const stock  = session.getDatabase("shop").inventory
  orders.insertOne({ code: "ORD-2", total: 300, status: "paid" })
  stock.updateOne({ sku: "A1" }, { $inc: { qty: -2 } })  // trừ tồn kho
  session.commitTransaction()   // cả hai cùng thành công, hoặc cùng rollback
} catch (e) {
  session.abortTransaction()
} finally {
  session.endSession()
}
```

Transaction **có chi phí** (giữ lock, ép majority) — trong MongoDB nó là ngoại lệ chứ không phải mặc định. Thiết kế tốt là **embed để đa số cập nhật gói trong một document** (đã atomic sẵn), chỉ dùng transaction khi thật sự phải chạm nhiều document/collection cùng lúc.

---

## 3. So sánh MongoDB với SQL (bảng quan hệ)

| Khái niệm | SQL | MongoDB |
|-----------|-----|---------|
| Đơn vị lưu | Row trong table | **Document** trong collection |
| Schema | Cứng, migration khoá | **Linh hoạt** + validation tuỳ chọn |
| Quan hệ | JOIN qua foreign key | **Embed** hoặc reference + `$lookup` |
| Khoá chính | `PRIMARY KEY` | **`_id`** (auto ObjectId) |
| Truy vấn nâng cao | SQL, `GROUP BY` | **Aggregation pipeline** |
| Scale | Chủ yếu scale-up | **Sharding** scale-out sẵn |
| Giao dịch | ACID nhiều bảng | ACID (single doc sẵn; multi-doc từ 4.0) |

MongoDB không "tốt hơn" SQL — nó tối ưu cho **dữ liệu dạng document, đọc theo cụm, schema tiến hoá nhanh, scale ngang**. Dữ liệu quan hệ nặng, join phức tạp nhiều chiều, báo cáo ad-hoc thì SQL vẫn hợp hơn.

---

## 4. Thực hành nhanh

```bash
# Chạy MongoDB bằng Docker
docker run --name mongo -p 27017:27017 -d mongo:7

# Vào mongosh
docker exec -it mongo mongosh
```

```javascript
use shop
// Insert document nested
db.orders.insertOne({
  code: "ORD-2026-001",
  customer: { id: 42, name: "An", tier: "gold" },
  items: [ { sku: "A1", qty: 2, price: 150 } ],
  total: 300, status: "paid", createdAt: new Date()
})

// Query: lọc theo trường lồng + phần tử mảng
db.orders.find({ "customer.tier": "gold", "items.sku": "A1" })

// Cập nhật atomic trong document: thêm item, tăng tổng
db.orders.updateOne(
  { code: "ORD-2026-001" },
  { $push: { items: { sku: "B7", qty: 1, price: 300 } },
    $inc:  { total: 300 } }
)

// Tạo index phục vụ query trên
db.orders.createIndex({ "customer.tier": 1, createdAt: -1 })
```

---

## 5. Anti-pattern phải tránh

| Anti-pattern | Vì sao hại | Cách đúng |
|--------------|-----------|-----------|
| **Unbounded array** (embed mảng tăng vô hạn: mọi comment, mọi event vào 1 doc) | Document phình quá **giới hạn 16 MB**, ghi ngày càng chậm (rewrite cả doc), index multikey nổ | **Reference**: tách sang collection riêng, mỗi phần tử một document |
| **Massive document** | Đọc 1 field vẫn tải cả doc lớn qua mạng và RAM | Tách document, chỉ embed phần đọc cùng nhau |
| **Query không index** | COLLSCAN, chậm tuyến tính | `explain()` rồi tạo index đúng theo ESR |
| **Lạm dụng `$lookup`** | Join runtime trên dữ liệu lớn tốn kém | Cân nhắc embed hoặc denormalize field hay đọc |
| **Shard key cardinality thấp** | Dồn 1 shard (jumbo chunk), scatter-gather | Chọn key cardinality cao, khớp query pattern |

**Bounded vs unbounded** là ranh giới quan trọng nhất khi embed: địa chỉ của user (bị chặn ~vài cái) → embed thoải mái; bình luận của một bài viết viral (không giới hạn) → phải reference.

---

## 6. Tóm tắt
- MongoDB lưu **BSON document** (nested, giống object) — đọc theo cụm không cần JOIN; schema **linh hoạt** nhưng nên có validation.
- Quyết định lớn nhất là **embed vs reference**: embed khi đọc cùng nhau và **bị chặn kích thước**; reference khi 1–nhiều/nhiều–nhiều, chia sẻ, hoặc tăng vô hạn.
- **`_id`** là PK (ObjectId tăng dần theo thời gian). **Index** (single/compound/multikey/text) biến COLLSCAN thành tra cứu; compound theo **ESR**.
- **Aggregation pipeline** (`$match → $group → $lookup → $sort → $project`) làm mọi tính toán/join; đặt `$match` đầu để dùng index.
- **Replica set** cho HA (primary + secondary + election, `w:"majority"`); **sharding** cho scale ngang (chọn **shard key** cẩn thận); **multi-document transaction** khi thật cần.
- Tránh **unbounded array / massive document** và query không index.

> **Bài tiếp theo (Bài 11):** rời document model để sang **wide-column & key-value phân tán** — Cassandra và mô hình dữ liệu tối ưu cho ghi khối lượng cực lớn.
