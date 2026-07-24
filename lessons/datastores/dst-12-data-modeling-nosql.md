# Bài 12 — Data modeling NoSQL: access-pattern first

## 1. Mục tiêu
Sau bài này bạn có thể:
- Hiểu vì sao data modeling NoSQL **ngược hoàn toàn** với SQL: liệt kê **access pattern TRƯỚC**, thiết kế bảng SAU.
- Nắm bản chất **denormalization** — nhân bản dữ liệu có chủ đích để đọc nhanh, đổi lấy ghi phức tạp hơn.
- Thiết kế **single-table design** trong DynamoDB: nhiều entity trong một bảng, **PK/SK overload**, **adjacency list**.
- Mô hình hoá quan hệ **one-to-many** và **many-to-many** mà không cần JOIN.
- Biết rõ **đánh đổi** và **khi nào KHÔNG nên** dùng single-table design.

---

## 2. Lý thuyết

### 2.1 Đảo ngược tư duy: từ "dữ liệu" sang "câu hỏi"

Trong thế giới SQL bạn được dạy: mô hình hoá **dữ liệu** cho gọn (chuẩn hoá 3NF, mỗi sự thật lưu đúng một chỗ), rồi khi cần đọc thì viết `JOIN` để ghép lại. Database làm phần việc nặng lúc **đọc**.

NoSQL (đặc biệt DynamoDB, Cassandra) đảo ngược điều đó. Không có JOIN hiệu quả ở quy mô lớn, không có query optimizer ghép bảng cho bạn. Vì thế bạn phải hỏi ngược:

> **Ứng dụng của tôi sẽ hỏi những câu gì?** — rồi thiết kế bảng sao cho mỗi câu hỏi trả về bằng **một query trên một partition**, không quét, không ghép.

Analogy: SQL giống một **thư viện tổng** — sách xếp theo chủ đề khoa học cho gọn, muốn tra cứu thì thủ thư đi gom từ nhiều kệ (JOIN). NoSQL access-pattern-first giống **quầy fast-food**: bạn biết trước 20 món khách hay gọi, nên gói sẵn từng combo để lấy phát ăn ngay. Món lạ ngoài menu? Rất chậm hoặc không phục vụ được.

Hệ quả cực kỳ quan trọng: **bạn phải biết access pattern trước khi tạo bảng.** Nếu chưa biết ứng dụng đọc gì, bạn chưa thể thiết kế đúng. Đây là lý do NoSQL "khó" — nó bắt bạn suy nghĩ về truy vấn ngay từ đầu.

### 2.2 Ba giới hạn vật lý ép ta phải thiết kế khác

DynamoDB chỉ cho bạn ba cách lấy dữ liệu, và đó là toàn bộ "bảng màu" của bạn:

| Thao tác | Chi phí | Ghi chú |
|----------|---------|---------|
| `GetItem` theo **PK** (+ SK) | Rẻ nhất, O(1) | Lấy đúng 1 item |
| `Query` theo **PK**, lọc **SK** | Rẻ, đọc 1 partition | Lấy nhiều item cùng PK, sort theo SK |
| `Scan` toàn bảng | **Đắt, chậm** | Đọc mọi item — tránh trên production |

Không có JOIN, không có `WHERE` tuỳ ý trên cột bất kỳ (chỉ `Query` trên khoá). Mọi thiết kế xoay quanh một mục tiêu: **biến mỗi access pattern thành một `Query` trên một partition.** Nếu một câu hỏi buộc phải `Scan`, thiết kế của bạn đã sai.

### 2.3 Denormalization: nhân bản có chủ đích

Chuẩn hoá (normalization) nói: mỗi sự thật lưu **đúng một chỗ**. Denormalization làm ngược: **cố tình nhân bản** dữ liệu để nơi đọc có sẵn mọi thứ, khỏi ghép.

Ví dụ một đơn hàng cần hiển thị tên khách. SQL: lưu `customer_id` trong `orders`, JOIN sang `customers` để lấy tên. NoSQL: **chép luôn `customer_name` vào item order**. Đọc đơn hàng → có ngay tên, một phát.

<svg viewBox="0 0 640 260" role="img" aria-labelledby="dn-t dn-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="dn-t">Normalized JOIN vs Denormalized đọc thẳng</title>
<desc id="dn-d">Bên trái mô hình chuẩn hoá cần JOIN hai bảng; bên phải denormalize chép tên khách vào order nên đọc một phát</desc>
<text x="150" y="24" text-anchor="middle" font-size="13" fill="currentColor">SQL — chuẩn hoá, JOIN lúc đọc</text>
<rect x="30" y="40" width="110" height="60" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="85" y="62" text-anchor="middle" font-size="11" fill="currentColor">orders</text>
<text x="85" y="80" text-anchor="middle" font-size="10" fill="currentColor">id, customer_id</text>
<rect x="180" y="40" width="110" height="60" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="235" y="62" text-anchor="middle" font-size="11" fill="currentColor">customers</text>
<text x="235" y="80" text-anchor="middle" font-size="10" fill="currentColor">id, name</text>
<line x1="140" y1="70" x2="180" y2="70" stroke="currentColor" stroke-width="1.5" marker-end="url(#dna)"/>
<text x="160" y="120" text-anchor="middle" font-size="10" fill="currentColor">JOIN mỗi lần đọc</text>
<line x1="30" y1="140" x2="290" y2="140" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<text x="490" y="24" text-anchor="middle" font-size="13" fill="currentColor">NoSQL — denormalize, đọc thẳng</text>
<rect x="380" y="40" width="220" height="80" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="490" y="62" text-anchor="middle" font-size="11" fill="currentColor">order item</text>
<text x="490" y="82" text-anchor="middle" font-size="10" fill="currentColor">id, customer_id,</text>
<text x="490" y="100" text-anchor="middle" font-size="10" fill="currentColor">customer_name (bản sao)</text>
<text x="490" y="140" text-anchor="middle" font-size="10" fill="currentColor">1 GetItem — không JOIN</text>
<text x="320" y="180" text-anchor="middle" font-size="11" fill="currentColor">Đổi lại: khách đổi tên → phải cập nhật ở NHIỀU nơi đã chép</text>
<text x="320" y="200" text-anchor="middle" font-size="11" fill="currentColor">Nguyên tắc: chép thứ ÍT đổi, đọc NHIỀU — chấp nhận ghi phức tạp hơn</text>
<defs><marker id="dna" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Đánh đổi rất rõ:
- **Đọc**: cực nhanh, một phát, không ghép.
- **Ghi**: khi dữ liệu bị chép thay đổi (khách đổi tên), bạn phải cập nhật **tất cả bản sao** — tốn công, dễ lệch (inconsistency).

Nên quy tắc thực dụng: **chỉ chép những gì ÍT thay đổi nhưng ĐỌC nhiều**. Tên sản phẩm, ảnh thumbnail, tên tác giả — hợp để chép. Số dư ví, tồn kho realtime — đừng chép, giữ một nguồn sự thật. NoSQL đánh đổi **storage rẻ + ghi phức tạp** lấy **đọc nhanh ở quy mô lớn** — và đây thường là canh bạc đúng vì hệ thống hiện đại đọc nhiều hơn ghi hàng chục lần.

### 2.4 Single-table design: nhiều entity trong một bảng

Cú sốc lớn nhất khi sang DynamoDB: **best practice là để TẤT CẢ entity (user, order, product, review...) trong MỘT bảng duy nhất.** Nghe điên rồ với dân SQL, nhưng có lý do vật lý: DynamoDB chỉ query nhanh **trong một partition**. Muốn lấy "user và toàn bộ order của user đó trong 1 query", chúng phải nằm **chung một partition** — tức chung một bảng, chung một partition key.

Chìa khoá là **generic key names**: đặt tên partition key là `PK`, sort key là `SK` (không phải `user_id`, `order_id`), rồi **overload** — mỗi loại entity nhét ý nghĩa riêng vào cùng hai cột đó:

| PK | SK | Loại entity | Thuộc tính khác |
|----|----|-------------|-----------------|
| `USER#42` | `PROFILE#42` | User | name, email |
| `USER#42` | `ORDER#1001` | Order | total, status, created_at |
| `USER#42` | `ORDER#1002` | Order | total, status |
| `PRODUCT#88` | `PRODUCT#88` | Product | title, price |

Nhìn kỹ: mọi thứ của user 42 (profile + các order) **chung PK `USER#42`**. Một `Query PK = "USER#42"` trả về **cả profile lẫn tất cả order trong đúng một lần đọc partition** — thứ mà SQL cần 2 bảng + JOIN. Prefix trong SK (`PROFILE#`, `ORDER#`) cho phép lọc theo loại: `Query PK = "USER#42" AND begins_with(SK, "ORDER#")` → chỉ lấy các order.

### 2.5 PK/SK overload và "item collection"

Nhóm các item **chung một PK** gọi là một **item collection** — đây là đơn vị bạn đọc bằng một `Query`. Thiết kế single-table thực chất là nghệ thuật **xếp những thứ hay-được-đọc-cùng-nhau vào chung một item collection**, và dùng SK có cấu trúc để (a) phân biệt loại, (b) sắp xếp, (c) lọc theo range.

SK dạng sortable rất mạnh. Nếu SK order là `ORDER#2026-07-24#1001`, thì vì DynamoDB sort SK theo thứ tự lexicographic, bạn có ngay "các order của user, mới nhất trước" bằng `Query ... ScanIndexForward=false`, hoặc "order trong tháng 7" bằng `begins_with(SK, "ORDER#2026-07")`. Timestamp dạng ISO-8601 sort đúng theo thời gian — đó là lý do luôn dùng ISO.

### 2.6 Adjacency list: mô hình hoá quan hệ (many-to-many)

One-to-many thì dễ (user → nhiều order, như trên). **Many-to-many** mới hóc: ví dụ e-commerce, một **order** chứa nhiều **product**, và một **product** nằm trong nhiều **order**. SQL giải bằng bảng nối `order_items`. DynamoDB dùng kỹ thuật **adjacency list** — coi dữ liệu như một đồ thị, mỗi cạnh (quan hệ) là một item được nhân bản để đọc được **từ cả hai phía**.

<svg viewBox="0 0 640 300" role="img" aria-labelledby="adj-t adj-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="adj-t">Adjacency list cho quan hệ many-to-many order và product</title>
<desc id="adj-d">Item cạnh order-product được lưu để query được cả từ phía order lẫn phía product</desc>
<text x="320" y="22" text-anchor="middle" font-size="13" fill="currentColor">Many-to-many: Order chứa Product, Product nằm trong nhiều Order</text>
<rect x="30" y="45" width="270" height="110" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="165" y="66" text-anchor="middle" font-size="12" fill="currentColor">Query từ phía ORDER</text>
<text x="165" y="88" text-anchor="middle" font-size="10" fill="currentColor">PK=ORDER#1001, SK=PRODUCT#88</text>
<text x="165" y="106" text-anchor="middle" font-size="10" fill="currentColor">PK=ORDER#1001, SK=PRODUCT#90</text>
<text x="165" y="130" text-anchor="middle" font-size="10" fill="currentColor">→ 1 Query lấy mọi product của order</text>
<rect x="340" y="45" width="270" height="110" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="475" y="66" text-anchor="middle" font-size="12" fill="currentColor">Query từ phía PRODUCT (GSI)</text>
<text x="475" y="88" text-anchor="middle" font-size="10" fill="currentColor">GSI-PK=PRODUCT#88, SK=ORDER#1001</text>
<text x="475" y="106" text-anchor="middle" font-size="10" fill="currentColor">GSI-PK=PRODUCT#88, SK=ORDER#1005</text>
<text x="475" y="130" text-anchor="middle" font-size="10" fill="currentColor">→ 1 Query lấy mọi order chứa product</text>
<rect x="140" y="185" width="360" height="70" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="208" text-anchor="middle" font-size="12" fill="currentColor">Cùng MỘT item cạnh, đảo PK/SK trên GSI</text>
<text x="320" y="230" text-anchor="middle" font-size="10" fill="currentColor">Base table: PK=ORDER, SK=PRODUCT — đọc theo order</text>
<text x="320" y="246" text-anchor="middle" font-size="10" fill="currentColor">GSI (inverted): PK=PRODUCT, SK=ORDER — đọc theo product</text>
<line x1="165" y1="155" x2="290" y2="185" stroke="currentColor" stroke-width="1" marker-end="url(#adja)"/>
<line x1="475" y1="155" x2="350" y2="185" stroke="currentColor" stroke-width="1" marker-end="url(#adja)"/>
<text x="320" y="278" text-anchor="middle" font-size="11" fill="currentColor">Một quan hệ đọc được từ hai chiều nhờ đảo khoá — không cần JOIN</text>
<defs><marker id="adja" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Kỹ thuật cốt lõi tên là **inverted index / GSI overloading**: bạn tạo một Global Secondary Index (GSI) có **PK và SK đảo vai** so với base table. Item cạnh `PK=ORDER#1001, SK=PRODUCT#88`:
- Trên **base table** đọc được "mọi product của order 1001" (`Query PK=ORDER#1001`).
- Trên **GSI** (PK cũ là SK, SK cũ là PK) đọc được "mọi order chứa product 88" (`Query GSI-PK=PRODUCT#88`).

Một item, một quan hệ, đọc được cả hai chiều — đó là adjacency list. Thuộc tính chung dùng cho GSI thường đặt tên `GSI1PK`, `GSI1SK` và điền giá trị "đảo" vào đó.

---

## 3. Ví dụ từng bước: blog platform

### Bước 1 — Liệt kê access pattern (TRƯỚC KHI thiết kế)

Đây là bước quan trọng nhất, làm sai thì thiết kế sai:

1. Lấy profile của một user.
2. Lấy một post theo id.
3. Lấy **tất cả post của một user**, mới nhất trước.
4. Lấy một post **kèm toàn bộ comment** của nó.
5. Lấy **tất cả comment của một user** (để moderation).

### Bước 2 — Thiết kế key cho từng pattern

| Entity | PK | SK | GSI1PK | GSI1SK |
|--------|----|----|--------|--------|
| User | `USER#alice` | `USER#alice` | — | — |
| Post | `USER#alice` | `POST#2026-07-24#p1` | `POST#p1` | `POST#p1` |
| Comment | `POST#p1` | `COMMENT#2026-07-24#c9` | `USER#bob` | `COMMENT#2026-07-24#c9` |

Giải cho từng access pattern:
- (1) Profile: `GetItem PK=USER#alice, SK=USER#alice`.
- (3) Mọi post của alice: `Query PK=USER#alice AND begins_with(SK,"POST#") ScanIndexForward=false` → SK chứa ngày ISO nên tự sort mới-trước.
- (2)(4) Post kèm comment: comment để **PK=POST#p1**, nên `Query PK=POST#p1` lấy luôn post-metadata (nếu chép vào) + mọi comment trong một item collection.
- (5) Comment của bob: dùng **GSI1** với `GSI1PK=USER#bob` → `Query GSI1-PK=USER#bob AND begins_with(GSI1SK,"COMMENT#")`.

Năm câu hỏi, năm truy vấn một-partition, không JOIN, không Scan. Đó là đích đến.

### Bước 3 — Code thật (AWS SDK v3, JavaScript)

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand }
  from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = "BlogApp";

// GHI: tạo một post của alice (denormalize: chép authorName vào post)
await ddb.send(new PutCommand({
  TableName: TABLE,
  Item: {
    PK: "USER#alice",
    SK: "POST#2026-07-24#p1",
    type: "Post",
    title: "Access-pattern first",
    authorName: "Alice",        // bản sao có chủ đích -> đọc khỏi ghép user
    GSI1PK: "POST#p1",          // để Query post theo id qua GSI1 (GSI không hỗ trợ GetItem)
    GSI1SK: "POST#p1",
  },
}));

// ĐỌC access pattern (3): mọi post của alice, mới nhất trước
const posts = await ddb.send(new QueryCommand({
  TableName: TABLE,
  KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
  ExpressionAttributeValues: { ":pk": "USER#alice", ":prefix": "POST#" },
  ScanIndexForward: false,      // đảo chiều SK -> ngày mới nằm trước
}));

// ĐỌC access pattern (4): một post kèm toàn bộ comment (cùng item collection)
const thread = await ddb.send(new QueryCommand({
  TableName: TABLE,
  KeyConditionExpression: "PK = :pk",
  ExpressionAttributeValues: { ":pk": "POST#p1" },
}));
// thread.Items chứa cả post-metadata (nếu lưu PK=POST#p1) lẫn các COMMENT#
```

```bash
# Tạo bảng: chỉ khai báo KHOÁ, KHÔNG khai báo cột dữ liệu (schemaless)
aws dynamodb create-table \
  --table-name BlogApp \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S AttributeName=GSI1SK,AttributeType=S \
  --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes \
    'IndexName=GSI1,KeySchema=[{AttributeName=GSI1PK,KeyType=HASH},{AttributeName=GSI1SK,KeyType=RANGE}],Projection={ProjectionType=ALL}' \
  --billing-mode PAY_PER_REQUEST
```

Chú ý: định nghĩa bảng chỉ khai báo **thuộc tính làm khoá** (PK, SK, GSI1PK, GSI1SK). DynamoDB **schemaless** cho phần còn lại — mỗi item mang tập thuộc tính khác nhau, đúng tinh thần "nhiều entity một bảng".

---

## 4. Khi nào KHÔNG dùng single-table design

Single-table không phải luôn đúng. Đánh đổi cần cân nhắc thẳng thắn:

| Ưu điểm | Nhược điểm |
|---------|------------|
| Đọc nhiều entity liên quan trong 1 query | Rất **khó hiểu** với người mới, khó onboard |
| Ít request → rẻ hơn, độ trễ thấp | **Cứng nhắc**: access pattern mới có thể phải làm lại model |
| Một bảng dễ quản lý provisioning | Analytics/ad-hoc query gần như bất khả — phải export |
| Transaction trong 1 bảng dễ hơn | Migration & backfill phức tạp |

**Nên dùng single-table khi**: quy mô lớn, access pattern **ổn định và biết trước**, cần độ trễ thấp ở scale (mạng xã hội, e-commerce, gaming).

**Nên cân nhắc multi-table / dùng SQL khi**:
- Access pattern **chưa rõ hoặc thay đổi liên tục** (startup giai đoạn dò dẫm) — SQL với JOIN linh hoạt sẽ cứu bạn.
- Cần **truy vấn phân tích ad-hoc**, báo cáo, aggregate tuỳ ý.
- Quan hệ phức tạp nhiều chiều, cần tính toàn vẹn tham chiếu (foreign key, ACID nhiều bảng).
- Team nhỏ, ưu tiên tốc độ phát triển hơn tối ưu scale.

Câu thần chú thực dụng: **"Nếu bạn không thể liệt kê hết access pattern, bạn chưa sẵn sàng cho single-table design."** Nhiều hệ thống chọn đường lai — DynamoDB cho phần hot-path scale lớn, và stream dữ liệu sang một kho phân tích (Redshift/Athena/Elasticsearch) cho query linh hoạt.

---

## 5. Tóm tắt
- NoSQL đảo ngược SQL: **liệt kê access pattern TRƯỚC**, thiết kế bảng để mỗi câu hỏi thành **một Query trên một partition** — không JOIN, không Scan.
- **Denormalization** = nhân bản có chủ đích: chép thứ **ít đổi, đọc nhiều** để đọc một phát; đổi lại ghi phải cập nhật nhiều nơi.
- **Single-table design**: nhiều entity một bảng, khoá generic `PK`/`SK` được **overload**; nhóm chung PK thành **item collection** đọc bằng một Query; SK dạng ISO-sortable cho phép range + sort.
- **Many-to-many** giải bằng **adjacency list** + **inverted GSI** (đảo PK/SK) — một item cạnh đọc được cả hai chiều.
- Single-table mạnh khi access pattern **ổn định, scale lớn**; tránh khi pattern chưa rõ hoặc cần analytics ad-hoc — khi đó SQL/multi-table hoặc kiến trúc lai hợp lý hơn.

> **Bài tiếp theo:** đi vào **indexing & secondary index** — LSI vs GSI, chi phí, chiến lược sparse index và cách chọn khoá phân tán đều để tránh hot partition.
