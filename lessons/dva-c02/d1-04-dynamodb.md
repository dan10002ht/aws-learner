# DynamoDB for Developers

DynamoDB là NoSQL key-value + document database, fully managed, serverless, single-digit millisecond latency. Trong DVA-C02 đây là service "tủ" của Domain 1 — gần như chắc chắn xuất hiện 8-12 câu. Bài này tập trung vào những thứ một developer phải nắm để vừa code đúng vừa né bẫy đề.

## 1. Cấu trúc bảng: Partition Key & Sort Key

Mỗi item được định danh bằng **primary key**. Có 2 loại:

| Loại primary key | Thành phần | Ý nghĩa |
|---|---|---|
| Simple (Partition key) | Chỉ Partition Key (PK) | PK quyết định item nằm ở partition nào |
| Composite (PK + SK) | Partition Key + Sort Key | Cùng PK gom vào 1 partition, sắp xếp theo SK |

- **Partition Key (a.k.a. hash key)**: DynamoDB hash giá trị này để chọn partition vật lý lưu item.
- **Sort Key (a.k.a. range key)**: cho phép nhiều item cùng PK, sắp xếp theo SK → query theo range rất mạnh.

Ví dụ bảng `Orders`:

```
PK = CustomerId, SK = OrderDate
```

Query "tất cả order của customer X trong tháng 3" → siêu nhanh vì cùng partition, SK cho phép `between`.

### High-cardinality keys & hot partition

DynamoDB chia dữ liệu thành các partition vật lý. Nếu PK có **cardinality thấp** (ít giá trị khác nhau) hoặc traffic dồn vào vài giá trị PK, ta gặp **hot partition** → throttling dù tổng capacity còn dư.

> ⚠️ Bẫy: Câu hỏi kiểu "ứng dụng bị throttle dù chưa hết capacity provisioned" → nguyên nhân thường là **hot partition / poor key design**, KHÔNG phải thiếu RCU/WCU.

Cách chọn PK tốt:
- Chọn key **high-cardinality** (nhiều giá trị unique): `UserId`, `DeviceId`, `OrderId`...
- Tránh: `Status` (chỉ vài giá trị), `CountryCode`, ngày tháng cố định.
- Nếu buộc phải dùng key cardinality thấp → **write sharding**: thêm suffix random/calculated vào PK, ví dụ `2026-06-10#7` (0-9).

> 💡 Mẹo thi: Từ khóa "evenly distribute", "avoid hot partition", "high cardinality" → đáp án luôn nghiêng về việc chọn/tạo partition key phân bố đều.

## 2. Secondary Indexes: GSI vs LSI

Mặc định bạn chỉ query được theo primary key. Muốn query theo attribute khác → cần **secondary index**.

| Tiêu chí | LSI (Local Secondary Index) | GSI (Global Secondary Index) |
|---|---|---|
| Partition key | **Giống** PK bảng gốc | **Khác** được (PK + SK riêng) |
| Sort key | Sort key khác | Sort key riêng |
| Tạo lúc nào | **Chỉ khi tạo bảng** (không thêm sau) | Thêm/xóa **bất kỳ lúc nào** |
| Consistency | Hỗ trợ **strongly consistent** read | **Chỉ eventually consistent** |
| Capacity | Dùng chung RCU/WCU với bảng gốc | Có RCU/WCU **riêng** |
| Giới hạn | 5 LSI/bảng | 20 GSI/bảng (mặc định) |
| Kích thước item collection | Giới hạn 10GB/partition key | Không giới hạn |

Cách nhớ: **L**ocal = cùng partition key, **L**ocked vào lúc create table. **G**lobal = tự do PK mới, nhưng chỉ **G**uess được (eventually consistent).

> ⚠️ Bẫy hay gặp:
> - "Cần thêm index theo access pattern mới trên bảng đã chạy production" → **GSI** (LSI không thêm được sau khi tạo bảng).
> - "Cần strongly consistent read trên index" → **LSI** (GSI không hỗ trợ strong consistency).
> - GSI có thể bị throttle riêng — nếu GSI thiếu WCU, write vào bảng gốc cũng bị throttle (với provisioned mode).

### Projection
Khi tạo index bạn chọn attribute nào được "chiếu" vào index:
- `KEYS_ONLY`: chỉ key.
- `INCLUDE`: key + một số attribute chỉ định.
- `ALL`: toàn bộ attribute (tốn storage/WCU nhất).

Nếu query GSI cần attribute không được project → DynamoDB phải fetch lại từ bảng gốc (với LSI) hoặc trả về thiếu/không hỗ trợ (GSI chỉ trả attribute đã project).

## 3. Query vs Scan

Đây là cặp bẫy kinh điển nhất của DynamoDB trong đề.

| | Query | Scan |
|---|---|---|
| Cách hoạt động | Truy theo **partition key** (bắt buộc), optional điều kiện SK | Đọc **toàn bộ** bảng/index |
| Hiệu năng | Nhanh, chỉ đọc item liên quan | Chậm, đọc mọi item rồi mới filter |
| Chi phí RCU | Thấp | Cao (tính theo toàn bộ data đọc) |
| Khi nào dùng | Khi biết partition key | Khi cần quét toàn bảng (hiếm) |

```python
# Query - tốt
resp = table.query(
    KeyConditionExpression=Key('CustomerId').eq('C123') & Key('OrderDate').begins_with('2026-06')
)

# Scan - tránh nếu có thể
resp = table.scan(
    FilterExpression=Attr('Status').eq('SHIPPED')  # filter chạy SAU khi đọc
)
```

> ⚠️ Bẫy lớn: **FilterExpression KHÔNG giảm RCU tiêu thụ.** DynamoDB đọc hết item rồi mới filter — bạn vẫn trả tiền cho data đã đọc. Filter chỉ giảm lượng data trả về mạng.

> 💡 Mẹo thi: Câu "scan chậm/tốn kém, làm sao tối ưu" → đáp án thường là **thiết kế lại để dùng Query** hoặc thêm **GSI** đúng access pattern. Nếu buộc scan → dùng **Parallel Scan** (chia `Segment`/`TotalSegments`) để tăng tốc.

## 4. Strongly vs Eventually Consistent Reads

| | Eventually Consistent (mặc định) | Strongly Consistent |
|---|---|---|
| Độ mới dữ liệu | Có thể trả data cũ (vài chục ms) | Luôn trả bản mới nhất |
| Chi phí RCU | Rẻ hơn (½ RCU) | Gấp đôi |
| Hỗ trợ trên GSI | Có | **KHÔNG** |
| Cách bật | Mặc định | `ConsistentRead=True` |

> ⚠️ Bẫy: Strongly consistent read **không dùng được trên GSI**. Nếu đề nói "phải đọc dữ liệu mới nhất qua một index" → câu trả lời là LSI, không phải GSI.

## 5. Capacity: RCU/WCU, On-demand vs Provisioned

### Đơn vị capacity
- **RCU (Read Capacity Unit)**: 1 RCU = 1 strongly consistent read/giây cho item **≤ 4KB**. Eventually consistent = ½ RCU (1 RCU = 2 reads/s ≤4KB). Item lớn hơn làm tròn lên bội số 4KB.
- **WCU (Write Capacity Unit)**: 1 WCU = 1 write/giây cho item **≤ 1KB**. Item lớn hơn làm tròn lên bội số 1KB.

```
Ví dụ: đọc item 6KB, strongly consistent
→ làm tròn 6KB lên 8KB = 2 × 4KB → cần 2 RCU
Nếu eventually consistent → 2 / 2 = 1 RCU

Ví dụ: ghi item 3.5KB → làm tròn lên 4KB → cần 4 WCU
```

> 💡 Mẹo thi: Học thuộc công thức làm tròn. Đề rất hay hỏi "đọc/ghi item X KB với Y req/s thì cần bao nhiêu RCU/WCU". Read làm tròn bội số **4KB**, write bội số **1KB**.

### On-demand vs Provisioned

| | Provisioned | On-demand |
|---|---|---|
| Cách tính tiền | Trả theo RCU/WCU đặt trước | Trả theo từng request thực tế |
| Traffic phù hợp | Ổn định, dự đoán được | Bất định, spiky, mới launch |
| Throttling | Có thể throttle nếu vượt | Tự scale (gần như không throttle) |
| Auto scaling | Cần bật Auto Scaling | Tự động hoàn toàn |
| Giá đơn vị | Rẻ hơn khi tải đều | Đắt hơn/request |

**Auto Scaling (provisioned)**: đặt target utilization (vd 70%), min/max capacity. DynamoDB tự tăng/giảm provisioned theo CloudWatch. Phản ứng chậm hơn so với on-demand burst.

> 💡 Mẹo thi:
> - "Traffic không dự đoán được / ứng dụng mới / spiky" → **On-demand**.
> - "Traffic ổn định, muốn tối ưu chi phí" → **Provisioned + Auto Scaling**.
> - **Reserved Capacity**: cam kết dài hạn để giảm giá provisioned — chỉ áp dụng provisioned mode.

## 6. DAX (DynamoDB Accelerator)

DAX là **in-memory cache** được quản lý, đặt trước DynamoDB, giảm latency từ ms xuống **microsecond** cho read.

- Là **write-through cache**: ghi qua DAX → ghi vào DynamoDB rồi cập nhật cache.
- Phù hợp **read-heavy, eventually consistent** workload (vd leaderboard, catalog đọc nhiều).
- KHÔNG phù hợp khi cần strongly consistent read (DAX phục vụ từ cache → có thể cũ), hoặc write-heavy.
- Là cluster chạy trong VPC, ứng dụng dùng **DAX SDK** (API tương thích DynamoDB).

> ⚠️ Bẫy: Đừng nhầm DAX với **ElastiCache**. Câu "cache cho DynamoDB với code tối thiểu, API tương thích" → **DAX**. ElastiCache cần viết logic cache-aside thủ công.

> 💡 Mẹo thi: "Giảm latency read DynamoDB xuống microsecond" → DAX. "Strongly consistent vẫn cần nhanh" → DAX không giúp (vẫn phải đi thẳng DynamoDB).

## 7. DynamoDB Streams

Stream ghi lại **thay đổi item** (insert/modify/remove) theo thứ tự, giữ trong **24 giờ**. Thường gắn với **Lambda trigger** để xử lý event-driven.

`StreamViewType` quyết định data ghi vào stream:

| Giá trị | Ghi gì |
|---|---|
| `KEYS_ONLY` | Chỉ key của item bị đổi |
| `NEW_IMAGE` | Item sau khi đổi |
| `OLD_IMAGE` | Item trước khi đổi |
| `NEW_AND_OLD_IMAGES` | Cả hai |

Use case: replicate sang service khác, gửi notification, cập nhật aggregation, audit, ETL.

> 💡 Mẹo thi: "Phản ứng real-time khi item thay đổi" → DynamoDB Streams + Lambda. Cần cả giá trị cũ và mới (vd tính delta) → `NEW_AND_OLD_IMAGES`.

> ⚠️ Bẫy: **Global Tables** (multi-region replication) **yêu cầu** DynamoDB Streams bật (`NEW_AND_OLD_IMAGES`).

## 8. TTL (Time To Live)

TTL tự động xóa item khi đến thời điểm — dựa trên một attribute chứa **epoch timestamp (giây)**.

```python
import time
table.put_item(Item={
    'SessionId': 'abc',
    'data': '...',
    'expireAt': int(time.time()) + 3600   # hết hạn sau 1h
})
```

- Xóa **miễn phí** (không tốn WCU).
- Không xóa **chính xác tại giây** đó — có thể trễ tới 48 giờ.
- Item bị TTL xóa cũng xuất hiện trong Streams (REMOVE event) → có thể archive trước khi mất.

> ⚠️ Bẫy: Attribute TTL phải là **epoch time tính bằng giây (Number)**, KHÔNG phải ISO string hay milliseconds. Sai format → item không bị xóa.

## 9. Transactions

DynamoDB hỗ trợ **ACID transaction** trên nhiều item/nhiều bảng (cùng region, cùng account):

- `TransactWriteItems`: ghi all-or-nothing (Put/Update/Delete/ConditionCheck).
- `TransactGetItems`: đọc nhất quán nhiều item.

Mỗi transaction tốn **gấp đôi capacity** (2 underlying read/write per item) so với thao tác thường.

> 💡 Mẹo thi: "Cần đảm bảo nhiều thao tác thành công hoặc thất bại cùng nhau (vd chuyển tiền giữa 2 account)" → **TransactWriteItems**.

## 10. Conditional Writes & Optimistic Locking

**Conditional write**: chỉ ghi nếu điều kiện đúng → tránh ghi đè ngoài ý muốn, đảm bảo idempotency.

```python
# Chỉ tạo nếu chưa tồn tại (idempotent insert)
table.put_item(
    Item={'OrderId': 'O1', 'Status': 'NEW'},
    ConditionExpression='attribute_not_exists(OrderId)'
)
```

Nếu điều kiện sai → ném `ConditionalCheckFailedException`.

**Optimistic Locking**: dùng một attribute `version`. Khi update, điều kiện `version = X` rồi tăng version. Nếu ai đó đã sửa (version đổi) → fail, client retry.

```python
table.update_item(
    Key={'Id': '1'},
    UpdateExpression='SET stock = :s, version = :nv',
    ConditionExpression='version = :cv',
    ExpressionAttributeValues={':s': 9, ':nv': 6, ':cv': 5}
)
```

> 💡 Mẹo thi: "Tránh lost update / nhiều client cùng sửa 1 item" → **Optimistic Locking với version attribute + ConditionExpression**. DynamoDB Mapper (Java) có annotation `@DynamoDBVersionAttribute` làm tự động.

## 11. Batch Operations

| API | Công dụng | Giới hạn |
|---|---|---|
| `BatchGetItem` | Lấy nhiều item (nhiều bảng) | Tối đa 100 item / 16MB |
| `BatchWriteItem` | Put/Delete nhiều item | Tối đa 25 item / 16MB |

- **Không** hỗ trợ UpdateItem, **không** transactional (mỗi op độc lập).
- Có thể trả về `UnprocessedKeys`/`UnprocessedItems` → bạn **phải tự retry** (với exponential backoff).

> ⚠️ Bẫy: Batch **không atomic**. Một số item fail không rollback các item khác. Cần all-or-nothing → dùng **Transactions**, không phải Batch.

## 12. Pagination

Một response giới hạn **1MB data**. Nếu còn dữ liệu, response chứa `LastEvaluatedKey`. Truyền nó vào `ExclusiveStartKey` của request kế để lấy trang tiếp.

```python
items = []
resp = table.query(KeyConditionExpression=Key('PK').eq('x'))
items += resp['Items']
while 'LastEvaluatedKey' in resp:
    resp = table.query(
        KeyConditionExpression=Key('PK').eq('x'),
        ExclusiveStartKey=resp['LastEvaluatedKey']
    )
    items += resp['Items']
```

> ⚠️ Bẫy: Nếu thiếu vòng lặp `LastEvaluatedKey`, bạn chỉ lấy được trang đầu (≤1MB) và tưởng query "mất data". Đề hay hỏi "tại sao chỉ nhận được một phần kết quả".

## Tổng kết bẫy thi nhanh

| Tình huống | Đáp án thường đúng |
|---|---|
| Throttle dù còn capacity | Hot partition / key cardinality thấp |
| Thêm index sau khi bảng chạy | GSI (không phải LSI) |
| Strongly consistent trên index | LSI (GSI không hỗ trợ) |
| Scan chậm/tốn | Redesign dùng Query / thêm GSI |
| Traffic spiky/khó đoán | On-demand |
| Cache read microsecond | DAX |
| React khi item đổi | Streams + Lambda |
| Nhiều thao tác all-or-nothing | Transactions |
| Tránh lost update | Optimistic locking (version + condition) |
| Chỉ nhận một phần kết quả | Thiếu xử lý LastEvaluatedKey |

Nắm chắc 4 cặp bẫy lõi — **Query vs Scan**, **GSI vs LSI**, **consistency**, **capacity** — là bạn xử lý được phần lớn câu DynamoDB trong DVA-C02.
