# Bài 12 — Schema Registry & schema evolution

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích vì sao **message là một contract** giữa producer và consumer *qua thời gian*, và vì sao cần **schema** để bảo vệ contract đó.
- So sánh ba định dạng **Avro, Protobuf, JSON Schema** về kích thước, tốc độ, khả năng evolution.
- Mô tả cách **Confluent Schema Registry** hoạt động: **subject**, **version**, **schema id** gắn vào message, producer/consumer tra registry.
- Phân biệt các **compatibility mode**: **backward, forward, full** — và biết chọn cái nào cho tình huống nào.
- Nắm **quy tắc evolution an toàn** (thêm field có default, không đổi type, không xoá required) và **hậu quả** khi phá vỡ compatibility.
- Viết được một **Avro schema** rồi **evolve** nó an toàn.

---

## 2. Lý thuyết

### 2.1 Vấn đề: message là contract ngầm, sống lâu hơn bạn nghĩ

Khi `Order service` gửi message `{"order_id": 123, "amount": 50}` vào Kafka, nó đang **hứa** với mọi consumer về hình dạng dữ liệu: có field `order_id` kiểu số, field `amount` kiểu số. `Billing`, `Analytics`, `Fraud` đọc theo lời hứa đó. Đây là một **contract** — nhưng là contract *ngầm*, không ai viết ra, không ai kiểm.

Vấn đề nổ ra khi thời gian trôi. Sáu tháng sau, team Order đổi `amount` (số nguyên VND) thành `{"value": 50, "currency": "USD"}` để hỗ trợ đa tiền tệ. Producer deploy phiên bản mới. Ngay lập tức:
- `Billing` (chưa kịp deploy) đọc message mới, không thấy field `amount` → **crash** hoặc tính tiền = 0.
- Trong Kafka **vẫn còn hàng triệu message cũ** (log giữ lại 7 ngày). Consumer mới đọc lại từ đầu (reprocess) sẽ gặp cả message cũ lẫn mới → phải hiểu **cả hai** dạng.

Điểm cốt lõi: trong hệ streaming, **producer và consumer deploy độc lập, không đồng thời**, và **dữ liệu cũ vẫn tồn tại**. Nên tại một thời điểm bất kỳ, trong hệ luôn có **nhiều phiên bản schema cùng chạy**. Contract không phải "ảnh chụp hiện tại" mà là "mọi phiên bản còn sống". Không có gì canh giữ contract này → mỗi lần đổi field là một quả bom hẹn giờ.

### 2.2 Giải pháp: schema tường minh + một nơi quản lý

Ta cần hai thứ:
1. Một **schema tường minh** (máy đọc được) mô tả chính xác hình dạng message — thay cho lời hứa ngầm.
2. Một **cơ quan trung tâm** giữ mọi phiên bản schema và **từ chối** thay đổi phá vỡ contract *trước khi* nó ra production.

Đó chính là vai trò của **Schema Registry**. Producer đăng ký schema, registry kiểm tra "schema mới này có tương thích với các phiên bản cũ không?"; nếu không → chặn ngay lúc produce, không để consumer chết lúc 3 giờ sáng.

<svg viewBox="0 0 660 250" role="img" aria-labelledby="sr-t sr-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="sr-t">Producer và consumer tra Schema Registry qua schema id</title>
<desc id="sr-d">Producer đăng ký schema nhận về id, gắn id vào message; consumer đọc id rồi tra registry lấy schema để giải mã</desc>
<rect x="20" y="95" width="90" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="65" y="115" text-anchor="middle" font-size="11" fill="currentColor">Producer</text>
<text x="65" y="131" text-anchor="middle" font-size="9" fill="currentColor">serialize</text>
<rect x="285" y="30" width="120" height="52" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="345" y="52" text-anchor="middle" font-size="11" fill="currentColor">Schema Registry</text>
<text x="345" y="68" text-anchor="middle" font-size="9" fill="currentColor">subject · version · id</text>
<rect x="270" y="150" width="150" height="40" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="345" y="167" text-anchor="middle" font-size="10" fill="currentColor">Kafka topic (log)</text>
<text x="345" y="182" text-anchor="middle" font-size="9" fill="currentColor">[id=42][payload nhị phân]</text>
<rect x="560" y="95" width="90" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="605" y="115" text-anchor="middle" font-size="11" fill="currentColor">Consumer</text>
<text x="605" y="131" text-anchor="middle" font-size="9" fill="currentColor">deserialize</text>
<line x1="90" y1="95" x2="290" y2="70" stroke="currentColor" stroke-width="1" marker-end="url(#sa)"/>
<text x="175" y="72" text-anchor="middle" font-size="9" fill="currentColor">1. register → id=42</text>
<line x1="110" y1="128" x2="268" y2="165" stroke="currentColor" stroke-width="1.5" marker-end="url(#sa)"/>
<text x="180" y="158" text-anchor="middle" font-size="9" fill="currentColor">2. produce (kèm id)</text>
<line x1="420" y1="165" x2="580" y2="132" stroke="currentColor" stroke-width="1.5" marker-end="url(#sa)"/>
<text x="505" y="158" text-anchor="middle" font-size="9" fill="currentColor">3. đọc [id=42]+payload</text>
<line x1="575" y1="95" x2="400" y2="72" stroke="currentColor" stroke-width="1" marker-end="url(#sa)"/>
<text x="490" y="80" text-anchor="middle" font-size="9" fill="currentColor">4. lookup id=42 → schema</text>
<defs><marker id="sa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Chú ý điều tinh tế: message trên wire **không chứa cả schema** (sẽ phình to kinh khủng nếu mỗi record đính kèm định nghĩa field). Nó chỉ chứa một **schema id** 4 byte. Consumer thấy id → tra registry (có cache) → lấy đúng schema đã dùng để ghi. Đây là mấu chốt giúp binary format vừa nhỏ vừa an toàn.

---

## 3. Ba định dạng: Avro vs Protobuf vs JSON Schema

| | **Avro** | **Protobuf** | **JSON Schema** |
|--|----------|--------------|-----------------|
| Payload | Nhị phân, rất gọn | Nhị phân, gọn | Text JSON, cồng kềnh |
| Schema đi kèm | Tách riêng (.avsc), cần lúc đọc | Tách riêng (.proto), sinh code | Mô tả JSON, dữ liệu vẫn là JSON |
| Field định danh bằng | **Tên field** (thứ tự không quan trọng) | **Số thứ tự (tag)** | Tên field |
| Đọc cần schema? | **Cần cả writer + reader schema** | Chỉ cần schema reader (tag tự khớp) | Không bắt buộc (JSON tự mô tả) |
| Codegen | Không bắt buộc (dynamic) | Gần như bắt buộc | Không |
| Evolution | Mạnh, dựa trên default + tên | Mạnh, dựa trên tag number | Yếu hơn, dễ sai |
| Con người đọc được | Không (nhị phân) | Không | Có |

**Bản chất khác biệt:**
- **Avro** khớp field theo **tên** và cần **cả schema của người ghi (writer) lẫn người đọc (reader)** để giải mã (registry cung cấp writer schema qua id). Nhờ vậy Avro làm evolution rất tự nhiên: reader dùng schema của mình, field thiếu thì lấy `default`.
- **Protobuf** khớp field theo **tag number** (vd `amount = 3`). Đây là lý do vàng của Protobuf: **không bao giờ đổi số tag, không tái dùng số đã bỏ**, thì đổi tên field thoải mái. Nó là lựa chọn mặc định của gRPC (Bài 11).
- **JSON Schema** giữ payload là JSON đọc được bằng mắt — tiện debug, tốn băng thông. Không có tag number, evolution phải cẩn thận thủ công.

Con số thực tế: một record đơn hàng ~15 field, JSON ~450 byte, Avro/Protobuf ~90 byte. Với 100.000 msg/s, chênh 360 byte × 100k = **36 MB/s** băng thông và lưu trữ — chưa kể CPU parse. Ở quy mô lớn, binary thắng rõ. Trong hệ Kafka + Confluent, **Avro là lựa chọn phổ biến nhất** vì registry sinh ra chính từ hệ sinh thái Avro; ta lấy Avro làm ví dụ chính bên dưới.

---

## 4. Confluent Schema Registry hoạt động thế nào

Registry là một **service HTTP** riêng, lưu schema trong một Kafka topic đặc biệt `_schemas` (bản thân nó cũng dùng Kafka để bền & replicate). Ba khái niệm phải thuộc:

| Khái niệm | Nghĩa |
|-----------|-------|
| **Subject** | "Không gian tên" cho tập phiên bản schema. Mặc định (`TopicNameStrategy`): mỗi topic có subject `<topic>-value` (và `<topic>-key`). Ví dụ topic `orders` → subject `orders-value`. |
| **Version** | Mỗi lần đăng ký schema *khác* vào một subject → tạo version mới (1, 2, 3...). Version tăng dần trong phạm vi subject. |
| **Schema id** | ID **toàn cục** (global), duy nhất cho mỗi schema *nội dung*. Chính id này (4 byte) được nhúng vào từng message. |

**Wire format** của một message Avro do Confluent serializer tạo ra:

```text
byte 0      : magic byte (0x00)
byte 1..4   : schema id (int 32-bit, big-endian)   ← ví dụ 42
byte 5..end : payload Avro nhị phân
```

**Luồng producer** (do `KafkaAvroSerializer` làm tự động):
1. Lấy schema của record → tính subject `orders-value`.
2. Gọi registry: "đăng ký schema này cho subject `orders-value`". Registry **kiểm tra compatibility** với các version hiện có; nếu hợp → trả về `schema id` (nếu schema đã tồn tại thì trả id cũ).
3. Ghép `magic byte + id + payload` rồi gửi vào Kafka.

**Luồng consumer** (do `KafkaAvroDeserializer` làm tự động):
1. Đọc 5 byte đầu → lấy `schema id = 42`.
2. Gọi registry lấy **writer schema** ứng với id 42 (có **cache** local, chỉ gọi mạng lần đầu).
3. Giải mã payload bằng **writer schema** (để đọc đúng byte), rồi **project sang reader schema** của chính consumer (để điền default cho field thiếu, bỏ field thừa) — đây là bước làm evolution "tàng hình".

Điểm mấu chốt để hiểu compatibility: **compatibility được kiểm ở phía producer, lúc register schema mới**. Registry là "người gác cổng" chặn schema xấu *trước khi* nó chạm vào topic.

---

## 5. Compatibility mode — trái tim của evolution

Compatibility là **quy tắc** registry dùng để trả lời câu hỏi: "schema MỚI có được phép thêm vào subject này không?". Cài đặt ở mức subject (hoặc global).

<svg viewBox="0 0 660 210" role="img" aria-labelledby="cm-t cm-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="cm-t">Backward, forward và full compatibility</title>
<desc id="cm-d">Backward cho consumer mới đọc dữ liệu cũ; forward cho consumer cũ đọc dữ liệu mới; full là cả hai chiều</desc>
<text x="110" y="24" text-anchor="middle" font-size="12" fill="currentColor">BACKWARD</text>
<rect x="35" y="40" width="150" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="110" y="61" text-anchor="middle" font-size="10" fill="currentColor">Consumer schema MỚI</text>
<rect x="35" y="110" width="150" height="34" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="110" y="131" text-anchor="middle" font-size="10" fill="currentColor">đọc DATA cũ</text>
<line x1="110" y1="110" x2="110" y2="76" stroke="currentColor" stroke-width="1.5" marker-end="url(#ca)"/>
<text x="110" y="165" text-anchor="middle" font-size="9" fill="currentColor">nâng consumer trước</text>
<text x="330" y="24" text-anchor="middle" font-size="12" fill="currentColor">FORWARD</text>
<rect x="255" y="40" width="150" height="34" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="330" y="61" text-anchor="middle" font-size="10" fill="currentColor">Consumer schema CŨ</text>
<rect x="255" y="110" width="150" height="34" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="330" y="131" text-anchor="middle" font-size="10" fill="currentColor">đọc DATA mới</text>
<line x1="330" y1="110" x2="330" y2="76" stroke="currentColor" stroke-width="1.5" marker-end="url(#ca)"/>
<text x="330" y="165" text-anchor="middle" font-size="9" fill="currentColor">nâng producer trước</text>
<text x="550" y="24" text-anchor="middle" font-size="12" fill="currentColor">FULL</text>
<rect x="475" y="40" width="150" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="550" y="61" text-anchor="middle" font-size="10" fill="currentColor">cả hai chiều OK</text>
<rect x="475" y="110" width="150" height="34" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="550" y="131" text-anchor="middle" font-size="10" fill="currentColor">deploy thứ tự nào cũng được</text>
<line x1="540" y1="110" x2="540" y2="76" stroke="currentColor" stroke-width="1.5" marker-end="url(#ca)"/>
<line x1="560" y1="76" x2="560" y2="110" stroke="currentColor" stroke-width="1.5" marker-end="url(#ca)"/>
<text x="550" y="165" text-anchor="middle" font-size="9" fill="currentColor">an toàn nhất</text>
<defs><marker id="ca" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

| Mode | Nghĩa (ai đọc được gì) | Thay đổi được phép | Deploy trước |
|------|------------------------|--------------------|--------------|
| **BACKWARD** (mặc định) | Consumer dùng schema **mới** đọc được data ghi bằng schema **cũ** | **Thêm** field có default; **xoá** field | Nâng **consumer** trước |
| **FORWARD** | Consumer dùng schema **cũ** đọc được data ghi bằng schema **mới** | **Thêm** field; **xoá** field có default | Nâng **producer** trước |
| **FULL** | Cả hai chiều đều đọc được | Chỉ **thêm/xoá field có default** | Thứ tự nào cũng an toàn |
| **NONE** | Không kiểm gì | Mọi thay đổi | Tự chịu trách nhiệm |

Còn có biến thể `*_TRANSITIVE` (BACKWARD_TRANSITIVE...): kiểm với **mọi version trước đó**, không chỉ version liền kề. Quan trọng khi consumer có thể **reprocess từ đầu topic** (đọc lại data rất cũ) — lúc đó chỉ tương thích với version ngay trước là chưa đủ.

**Cách chọn thực dụng:**
- **BACKWARD** phù hợp phần lớn use case Kafka: bạn muốn consumer luôn nâng cấp được để đọc mọi data cũ trong log. Đây là lý do nó là default.
- **FORWARD** khi producer là bên chủ động tiến hoá, còn consumer (vd hệ thống bên thứ ba) chậm cập nhật và phải chịu được data mới.
- **FULL / FULL_TRANSITIVE** khi bạn không kiểm soát được thứ tự deploy hoặc dữ liệu sống rất lâu — an toàn nhất, đổi lại gò bó nhất (mọi field mới **bắt buộc có default**).

---

## 6. Quy tắc evolution an toàn

Đọc kỹ, đây là phần "làm được việc":

| Thao tác | An toàn? | Vì sao |
|----------|----------|--------|
| **Thêm field CÓ default** | ✅ Backward & Forward | Reader cũ bỏ qua field lạ; reader mới đọc data cũ thì điền default |
| **Thêm field KHÔNG default** | ❌ Phá backward | Reader mới đọc data cũ không có field này → không biết điền gì |
| **Xoá field CÓ default** | ✅ Backward | Reader mới thiếu field → dùng default khi đọc data cũ |
| **Xoá field required (không default)** | ❌ Phá forward | Reader cũ đọc data mới thiếu field bắt buộc → lỗi |
| **Đổi KIỂU field** (int → string) | ❌ Luôn nguy hiểm | Byte giải mã sai hoàn toàn; Avro không ép kiểu tuỳ tiện |
| **Đổi TÊN field** (Avro) | ❌ (trừ khi dùng `aliases`) | Avro khớp theo tên; đổi tên = xoá field cũ + thêm field mới |
| **Thu hẹp kiểu** (long → int) | ❌ | Giá trị cũ có thể tràn |
| **Mở rộng kiểu** (int → long) | ⚠️ Một số trường hợp OK | Avro cho phép promote int→long, float→double khi đọc |

Ba luật vàng để nhớ:
1. **Field mới → luôn có `default`.** Đây là chiếc phao cứu sinh cho evolution: có default thì cả reader cũ lẫn mới đều xử lý được khi field vắng mặt.
2. **Không bao giờ đổi kiểu của một field đang tồn tại.** Cần kiểu khác → thêm field *mới* với tên mới, migrate dần, rồi bỏ field cũ (có default) sau.
3. **Không xoá field required.** Muốn bỏ, trước hết cấp `default` cho nó ở một version, đợi mọi consumer nâng cấp, rồi mới xoá.

### Hậu quả khi phá compatibility

Nếu compatibility mode là `NONE` (hoặc ai đó vô hiệu hoá check) và bạn deploy một schema phá vỡ:
- **Consumer crash hàng loạt**: deserializer ném exception (`SerializationException` / thiếu field / kiểu sai). Trên Kafka, một record độc (poison pill) có thể làm consumer group **kẹt lặp**: fail → retry → fail, không tiến offset được, **lag** tăng vô hạn.
- **Mất/hỏng dữ liệu ngầm**: tệ hơn crash là *đọc sai mà không báo lỗi* — ví dụ đổi đơn vị tiền mà không đổi kiểu, `amount=50` giờ là USD nhưng consumer cũ vẫn hiểu là VND.
- **Kẹt cả log**: data xấu đã nằm trong log 7 ngày; sửa producer cũng không xoá được những message đã ghi. Bạn phải viết code consumer chịu được cả dạng cũ lẫn mới, hoặc dùng DLQ (Bài 2) để tách record độc.

Đó chính là lý do để registry **bật compatibility check ở CI/CD**: sai thì fail lúc build, không phải lúc 100 consumer đang chạy production.

---

## 7. CODE: Avro schema + evolution

**Version 1** — schema đơn hàng ban đầu (`order-v1.avsc`):

```json
{
  "type": "record",
  "name": "Order",
  "namespace": "com.shop.events",
  "fields": [
    { "name": "order_id", "type": "long" },
    { "name": "customer_id", "type": "long" },
    { "name": "amount_cents", "type": "long" }
  ]
}
```

**Version 2** — evolve AN TOÀN dưới mode `BACKWARD`: thêm `currency` (có default) và `status` (enum có default). Không đổi/không xoá field cũ:

```json
{
  "type": "record",
  "name": "Order",
  "namespace": "com.shop.events",
  "fields": [
    { "name": "order_id", "type": "long" },
    { "name": "customer_id", "type": "long" },
    { "name": "amount_cents", "type": "long" },
    { "name": "currency", "type": "string", "default": "VND" },
    {
      "name": "status",
      "type": { "type": "enum", "name": "OrderStatus",
                "symbols": ["PLACED", "PAID", "SHIPPED"] },
      "default": "PLACED"
    }
  ]
}
```

Vì `currency` và `status` đều có `default`: consumer chạy schema v2 đọc lại message v1 (không có hai field này) sẽ tự điền `"VND"` và `"PLACED"` → **backward-compatible**, đọc data cũ ngon lành.

**Đổi tên an toàn bằng `aliases`** — giả sử muốn đổi `amount_cents` thành `total_cents`. KHÔNG đổi trực tiếp (Avro khớp theo tên → hỏng). Dùng `aliases` để reader mới nhận diện tên cũ:

```json
{ "name": "total_cents", "type": "long", "aliases": ["amount_cents"] }
```

**Kiểm compatibility trước khi deploy** (dùng REST API của registry — nên chạy trong CI):

```bash
# Đăng ký / kiểm schema v2 cho subject orders-value
curl -s -X POST http://localhost:8081/compatibility/subjects/orders-value/versions/latest \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data @<(jq -n --rawfile s order-v2.avsc '{schema: $s, schemaType: "AVRO"}')
# → {"is_compatible": true}   ← phải TRUE mới cho deploy

# Đặt compatibility mode cho subject (một lần)
curl -s -X PUT http://localhost:8081/config/orders-value \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{"compatibility": "BACKWARD"}'

# Xem các version hiện có của subject
curl -s http://localhost:8081/subjects/orders-value/versions   # → [1, 2]
```

**Producer Java** — serializer lo hết phần register + gắn id, ta chỉ cấu hình:

```java
Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("key.serializer", StringSerializer.class.getName());
props.put("value.serializer",
    "io.confluent.kafka.serializers.KafkaAvroSerializer");
props.put("schema.registry.url", "http://localhost:8081");
// Chặn tự động đăng ký schema lạ ở prod: bắt buộc register qua CI trước
props.put("auto.register.schemas", "false");
props.put("use.latest.version", "true");

var producer = new KafkaProducer<String, Order>(props);
Order o = Order.newBuilder()
    .setOrderId(123).setCustomerId(9).setAmountCents(5000)
    .setCurrency("USD").setStatus(OrderStatus.PAID).build();
producer.send(new ProducerRecord<>("orders", "123", o));
```

Đặt `auto.register.schemas=false` là best-practice production: **cấm** producer tự nhét schema mới vào registry lúc runtime (dễ lọt schema chưa qua review). Mọi schema phải được đăng ký chủ động qua pipeline CI có chạy compatibility check.

**Consumer** chỉ cần trỏ registry; deserializer đọc id, tra schema, project sang reader schema — evolution diễn ra tự động:

```java
props.put("value.deserializer",
    "io.confluent.kafka.serializers.KafkaAvroDeserializer");
props.put("schema.registry.url", "http://localhost:8081");
props.put("specific.avro.reader", "true");   // map sang class Order sinh từ .avsc
```

---

## 8. Tóm tắt
- Message là một **contract sống lâu**: producer/consumer deploy độc lập và data cũ vẫn nằm trong log → luôn có **nhiều version schema cùng chạy**. Cần **schema tường minh** + **nơi quản lý** để bảo vệ contract.
- **Avro** (khớp theo tên, cần writer+reader schema, evolution mạnh) là chuẩn phổ biến với Confluent; **Protobuf** khớp theo **tag number** (mặc định của gRPC); **JSON Schema** đọc được bằng mắt nhưng cồng kềnh và yếu về evolution.
- **Schema Registry** quản lý **subject** (thường `<topic>-value`), **version**, **schema id**. Chỉ **id 4 byte** được nhúng vào message; consumer tra registry (có cache) để lấy writer schema.
- Compatibility check chạy **ở producer lúc register**: **BACKWARD** (consumer mới đọc data cũ, default), **FORWARD** (consumer cũ đọc data mới), **FULL** (cả hai chiều).
- Quy tắc vàng: **thêm field luôn có `default`**, **không đổi kiểu**, **không xoá field required**; đổi tên dùng `aliases`. Phá compatibility → consumer crash/lag vô hạn hoặc đọc sai dữ liệu ngầm; nên **gác cổng bằng CI**.

> **Bài tiếp theo (Bài 13):** khi schema đã chặt chẽ, ta bước vào **stream processing** — biến đổi, join và cửa sổ hoá (windowing) các luồng event theo thời gian thực với Kafka Streams / Flink.
