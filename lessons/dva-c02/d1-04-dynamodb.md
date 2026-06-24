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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Bố cục vật lý của Partition Key và Sort Key trong DynamoDB</title>
  <desc>Partition Key được hash để chọn partition vật lý; các item cùng PK nằm chung một partition và sắp xếp theo Sort Key. Một PK bị dồn quá nhiều traffic trở thành hot partition gây throttle dù tổng capacity còn dư.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">Partition Key hash → partition vật lý; cùng PK sắp theo Sort Key</text>
  <defs>
    <marker id="pkArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
  <rect x="16" y="44" width="150" height="120" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="91" y="64" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Items (PK, SK)</text>
  <text x="28" y="86" font-size="10.5" fill="currentColor" opacity="0.8">C1 · 2026-03-01</text>
  <text x="28" y="104" font-size="10.5" fill="currentColor" opacity="0.8">C1 · 2026-03-05</text>
  <text x="28" y="122" font-size="10.5" fill="currentColor" opacity="0.8">C2 · 2026-03-02</text>
  <text x="28" y="140" font-size="10.5" fill="currentColor" opacity="0.8">C3 · 2026-03-03</text>
  <text x="28" y="158" font-size="10.5" fill="currentColor" opacity="0.8">C3 · 2026-03-09</text>
  <rect x="196" y="86" width="96" height="36" rx="9" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="244" y="102" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">hash(PK)</text>
  <text x="244" y="116" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">chọn partition</text>
  <line x1="166" y1="104" x2="194" y2="104" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#pkArr)"/>
  <g>
    <rect x="322" y="44" width="180" height="92" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="412" y="62" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Partition P1 — PK=C1</text>
    <text x="334" y="84" font-size="10.5" fill="currentColor" opacity="0.85">SK 2026-03-01</text>
    <text x="334" y="102" font-size="10.5" fill="currentColor" opacity="0.85">SK 2026-03-05</text>
    <text x="334" y="124" font-size="9.5" fill="currentColor" opacity="0.6">↑ sắp theo Sort Key</text>
  </g>
  <line x1="292" y1="100" x2="320" y2="86" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#pkArr)"/>
  <g>
    <rect x="322" y="146" width="180" height="56" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="412" y="164" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Partition P2 — PK=C2/C3</text>
    <text x="334" y="186" font-size="10.5" fill="currentColor" opacity="0.85">C2 · C3 · ... cùng SK order</text>
  </g>
  <line x1="292" y1="108" x2="320" y2="160" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#pkArr)"/>
  <g>
    <rect x="322" y="236" width="382" height="104" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="334" y="248" width="120" height="20" rx="10" fill="#f59e0b" fill-opacity="0.9"/>
    <text x="394" y="262" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">HOT partition</text>
    <text x="334" y="288" font-size="11" font-weight="700" fill="currentColor">Một PK bị dồn quá nhiều request</text>
    <text x="334" y="308" font-size="10.5" fill="currentColor" opacity="0.82">→ throttle ngay tại partition đó</text>
    <text x="334" y="326" font-size="10.5" fill="currentColor" opacity="0.82">dù tổng RCU/WCU của bảng vẫn còn dư</text>
  </g>
  <rect x="16" y="236" width="290" height="104" rx="9" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="28" y="258" font-size="11" font-weight="700" fill="currentColor">Cùng PK = cùng 1 partition</text>
  <text x="28" y="280" font-size="10.5" fill="currentColor" opacity="0.82">PK quyết định partition nào.</text>
  <text x="28" y="298" font-size="10.5" fill="currentColor" opacity="0.82">SK quyết định thứ tự trong partition</text>
  <text x="28" y="316" font-size="10.5" fill="currentColor" opacity="0.82">→ query range theo SK rất nhanh.</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Quan hệ giữa LSI, GSI và bảng gốc trong DynamoDB</title>
  <desc>LSI dùng chung Partition Key của bảng gốc, nằm cùng partition, dùng chung capacity và hỗ trợ strongly consistent read. GSI có Partition Key và Sort Key riêng, capacity riêng và chỉ eventually consistent.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">LSI bám PK bảng gốc · GSI là bảng phụ độc lập</text>
  <defs>
    <marker id="idxArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
  <rect x="270" y="44" width="180" height="96" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="66" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Bảng gốc</text>
  <text x="360" y="86" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">PK + SK</text>
  <text x="360" y="106" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">RCU/WCU của bảng</text>
  <text x="360" y="126" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">strong + eventual read</text>
  <g>
    <rect x="16" y="180" width="290" height="120" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <rect x="28" y="192" width="60" height="20" rx="10" fill="#10b981" fill-opacity="0.9"/>
    <text x="58" y="206" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">LSI</text>
    <text x="98" y="207" font-size="10.5" font-weight="700" fill="currentColor">Local Secondary Index</text>
    <text x="28" y="232" font-size="10.5" fill="currentColor" opacity="0.85">• CÙNG PK với bảng gốc, SK khác</text>
    <text x="28" y="252" font-size="10.5" fill="currentColor" opacity="0.85">• Nằm CÙNG partition, dùng chung capacity</text>
    <text x="28" y="272" font-size="10.5" fill="currentColor" opacity="0.85">• Hỗ trợ STRONGLY consistent read</text>
    <text x="28" y="292" font-size="10.5" fill="currentColor" opacity="0.85">• Chỉ tạo lúc tạo bảng (≤5)</text>
  </g>
  <line x1="300" y1="120" x2="180" y2="178" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#idxArr)"/>
  <text x="206" y="158" font-size="10" fill="currentColor" opacity="0.7">chia sẻ PK</text>
  <g>
    <rect x="414" y="180" width="290" height="120" rx="10" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <rect x="426" y="192" width="60" height="20" rx="10" fill="#8b5cf6" fill-opacity="0.9"/>
    <text x="456" y="206" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">GSI</text>
    <text x="496" y="207" font-size="10.5" font-weight="700" fill="currentColor">Global Secondary Index</text>
    <text x="426" y="232" font-size="10.5" fill="currentColor" opacity="0.85">• PK + SK RIÊNG (như bảng riêng)</text>
    <text x="426" y="252" font-size="10.5" fill="currentColor" opacity="0.85">• RCU/WCU RIÊNG, throttle độc lập</text>
    <text x="426" y="272" font-size="10.5" fill="currentColor" opacity="0.85">• CHỈ eventually consistent</text>
    <text x="426" y="292" font-size="10.5" fill="currentColor" opacity="0.85">• Thêm/xóa bất kỳ lúc nào (≤20)</text>
  </g>
  <line x1="420" y1="120" x2="540" y2="178" stroke="currentColor" stroke-opacity="0.5" stroke-dasharray="5 3" marker-end="url(#idxArr)"/>
  <text x="500" y="158" font-size="10" fill="currentColor" opacity="0.7">tách riêng</text>
</svg>

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
