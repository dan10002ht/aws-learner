# Bài 11 — Kafka Connect & CDC (Debezium)

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **Kafka Connect** là gì và vì sao nó tồn tại: khung (framework) chuẩn để **đưa dữ liệu vào/ra Kafka mà không cần viết code**.
- Phân biệt **source connector** (hệ ngoài → Kafka) với **sink connector** (Kafka → hệ ngoài).
- Hiểu cách Connect chạy **distributed**: worker, task, rebalance, và **offset management** để bền/không mất dữ liệu.
- Nắm bản chất **Change Data Capture (CDC)** với **Debezium**: đọc **WAL/binlog** của database để stream *mọi thay đổi* thành event.
- Triển khai **use case đồng bộ DB → search/cache/warehouse** và **Outbox pattern** (liên hệ [[msg-17-saga-outbox]]).
- Dùng **SMT (Single Message Transform)** để nắn message ngay trong pipeline, không cần stream processor.

---

## 2. Lý thuyết

### 2.1 Vấn đề: ai cũng viết lại cùng một cầu nối

Bạn có Postgres, muốn đẩy dữ liệu sang Elasticsearch để tìm kiếm. Cách thủ công: viết một service đọc DB, bắt thay đổi, gửi vào Kafka; rồi viết một service khác đọc Kafka ghi vào Elasticsearch. Tuần sau lại cần S3, cần Redis, cần Snowflake... Mỗi cặp hệ thống một đoạn code riêng, ai cũng phải tự lo **retry, offset (đã đọc tới đâu), song song hoá, schema, chịu lỗi khi restart**. Đây là công việc lặp đi lặp lại, dễ sai, tốn người.

**Kafka Connect** là câu trả lời: một **framework** tách phần "logic kết nối một loại hệ thống" (connector plugin) ra khỏi phần "vận hành bền vững" (worker runtime). Bạn chỉ **khai báo cấu hình JSON**, Connect lo hết phần khó.

> Ẩn dụ: Connect giống **bến cảng container**. Con tàu (Postgres, MySQL, S3, Elastic...) đủ hình dạng, nhưng ai cũng nói chung một chuẩn *container* (Kafka record). Cần cẩu, đường ray, lịch trình (worker, task, offset) là **hạ tầng dùng chung** — bạn không tự đóng cẩu cho mỗi con tàu.

### 2.2 Source và Sink — hai chiều của cầu nối

<svg viewBox="0 0 680 220" role="img" aria-labelledby="sk-t sk-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="sk-t">Source connector đưa dữ liệu vào Kafka, Sink connector đưa ra hệ khác</title>
<desc id="sk-d">Bên trái các hệ nguồn qua source connector vào Kafka topic ở giữa; bên phải sink connector đẩy ra Elasticsearch, S3, warehouse</desc>
<rect x="20" y="40" width="90" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="65" y="62" text-anchor="middle" font-size="10" fill="currentColor">Postgres</text>
<rect x="20" y="93" width="90" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="65" y="115" text-anchor="middle" font-size="10" fill="currentColor">MySQL</text>
<rect x="20" y="146" width="90" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="65" y="168" text-anchor="middle" font-size="10" fill="currentColor">REST API</text>
<rect x="150" y="70" width="90" height="80" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="195" y="105" text-anchor="middle" font-size="10" fill="currentColor">Source</text>
<text x="195" y="121" text-anchor="middle" font-size="10" fill="currentColor">connector</text>
<line x1="110" y1="57" x2="150" y2="95" stroke="currentColor" stroke-width="1" marker-end="url(#ca)"/>
<line x1="110" y1="110" x2="150" y2="110" stroke="currentColor" stroke-width="1" marker-end="url(#ca)"/>
<line x1="110" y1="163" x2="150" y2="125" stroke="currentColor" stroke-width="1" marker-end="url(#ca)"/>
<rect x="290" y="60" width="100" height="100" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="340" y="105" text-anchor="middle" font-size="11" fill="currentColor">Kafka</text>
<text x="340" y="122" text-anchor="middle" font-size="10" fill="currentColor">topics</text>
<line x1="240" y1="110" x2="290" y2="110" stroke="currentColor" stroke-width="1.5" marker-end="url(#ca)"/>
<rect x="440" y="70" width="90" height="80" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="485" y="105" text-anchor="middle" font-size="10" fill="currentColor">Sink</text>
<text x="485" y="121" text-anchor="middle" font-size="10" fill="currentColor">connector</text>
<line x1="390" y1="110" x2="440" y2="110" stroke="currentColor" stroke-width="1.5" marker-end="url(#ca)"/>
<rect x="570" y="40" width="90" height="34" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="615" y="62" text-anchor="middle" font-size="10" fill="currentColor">Elastic</text>
<rect x="570" y="93" width="90" height="34" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="615" y="115" text-anchor="middle" font-size="10" fill="currentColor">S3</text>
<rect x="570" y="146" width="90" height="34" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="615" y="168" text-anchor="middle" font-size="10" fill="currentColor">Warehouse</text>
<line x1="530" y1="95" x2="570" y2="57" stroke="currentColor" stroke-width="1" marker-end="url(#ca)"/>
<line x1="530" y1="110" x2="570" y2="110" stroke="currentColor" stroke-width="1" marker-end="url(#ca)"/>
<line x1="530" y1="125" x2="570" y2="163" stroke="currentColor" stroke-width="1" marker-end="url(#ca)"/>
<defs><marker id="ca" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

| | **Source connector** | **Sink connector** |
|--|----------------------|--------------------|
| Chiều dữ liệu | Hệ ngoài **→ Kafka** | Kafka **→ hệ ngoài** |
| Offset lưu ở đâu | Topic nội bộ `connect-offsets` (đọc tới đâu trong nguồn) | Chính là **consumer offset** của Kafka (`__consumer_offsets`) |
| Ví dụ | Debezium (CDC từ DB), JDBC Source, FileStream | Elasticsearch Sink, S3 Sink, JDBC Sink |
| Đơn vị bắt lỗi | Task đọc từ nguồn, commit offset khi đã ghi vào Kafka | Task đọc Kafka, commit sau khi ghi thành công vào đích |

Điểm mấu chốt: **bạn không viết code**. Connector là plugin có sẵn (Confluent Hub, Debezium, cộng đồng). Việc của bạn là **cấu hình JSON** và vận hành.

### 2.3 Kiến trúc distributed: worker, task, offset

Connect chạy hai mode: **standalone** (1 tiến trình, config trong file — chỉ để thử/dev) và **distributed** (nhiều worker thành **cluster**, quản lý qua REST API — dùng cho production).

<svg viewBox="0 0 660 260" role="img" aria-labelledby="wk-t wk-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="wk-t">Connect distributed: một connector chia thành nhiều task trải trên các worker</title>
<desc id="wk-d">Một connector logic được chia thành ba task, phân bổ lên hai worker, trạng thái lưu trong ba topic nội bộ config offset status</desc>
<text x="330" y="22" text-anchor="middle" font-size="12" fill="currentColor">Connect cluster (distributed mode)</text>
<rect x="40" y="45" width="250" height="120" rx="8" fill="#3b82f6" fill-opacity="0.10" stroke="currentColor"/>
<text x="165" y="64" text-anchor="middle" font-size="11" fill="currentColor">Worker A (JVM)</text>
<rect x="60" y="78" width="90" height="34" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="99" text-anchor="middle" font-size="10" fill="currentColor">Task 1</text>
<rect x="170" y="78" width="90" height="34" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="215" y="99" text-anchor="middle" font-size="10" fill="currentColor">Task 2</text>
<rect x="60" y="122" width="90" height="30" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="141" text-anchor="middle" font-size="9" fill="currentColor">connector mgr</text>
<rect x="370" y="45" width="250" height="120" rx="8" fill="#3b82f6" fill-opacity="0.10" stroke="currentColor"/>
<text x="495" y="64" text-anchor="middle" font-size="11" fill="currentColor">Worker B (JVM)</text>
<rect x="390" y="78" width="90" height="34" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="435" y="99" text-anchor="middle" font-size="10" fill="currentColor">Task 3</text>
<rect x="500" y="78" width="100" height="34" rx="5" fill="#f43f5e" fill-opacity="0.12" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="550" y="99" text-anchor="middle" font-size="9" fill="currentColor">(dự phòng)</text>
<line x1="330" y1="105" x2="370" y2="105" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<text x="330" y="180" text-anchor="middle" font-size="10" fill="currentColor">Trạng thái không nằm trong worker — lưu ở Kafka:</text>
<rect x="90" y="195" width="140" height="34" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="160" y="216" text-anchor="middle" font-size="9" fill="currentColor">connect-configs</text>
<rect x="260" y="195" width="140" height="34" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="330" y="216" text-anchor="middle" font-size="9" fill="currentColor">connect-offsets</text>
<rect x="430" y="195" width="140" height="34" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="500" y="216" text-anchor="middle" font-size="9" fill="currentColor">connect-status</text>
</svg>

Bản chất cần nhớ:
- **Connector** là *cấu hình logic* ("hãy đồng bộ 5 bảng này"). Nó tự chia việc thành nhiều **task** chạy song song (`tasks.max`). Với Debezium, 1 DB thường chỉ 1 task (đọc log tuần tự); với JDBC/S3 có thể nhiều task chia bảng/partition.
- **Worker** là *tiến trình JVM* thật sự chạy task. Thêm worker = scale ngang. Một worker chết → Connect **rebalance**, chuyển task của nó sang worker còn sống.
- **Toàn bộ trạng thái nằm trong 3 topic nội bộ** (`connect-configs`, `connect-offsets`, `connect-status`), *không* nằm trong bộ nhớ worker. Nhờ vậy cluster **bền**: giết sạch worker rồi bật lại, task chạy tiếp **từ đúng offset đã commit** — không mất, không đọc lại từ đầu.

Đây chính là **offset management**: Connect định kỳ commit "đã xử lý tới điểm nào của nguồn". Source lưu offset nguồn (vd vị trí trong binlog); sink dùng consumer offset Kafka. Ngữ nghĩa giao hàng mặc định là **at-least-once** — khi worker chết giữa chừng, một số record có thể được gửi lại → **đích phải idempotent** (ví dụ Elasticsearch dùng document id ổn định để ghi đè thay vì tạo trùng).

### 2.4 Change Data Capture (CDC) — đọc *nhật ký* thay vì hỏi *bảng*

Làm sao biết một hàng trong DB vừa đổi? Hai cách:

| Cách | Cơ chế | Nhược điểm |
|------|--------|-----------|
| **Polling** (JDBC Source) | Cứ mỗi X giây `SELECT ... WHERE updated_at > :last` | Trễ; **bỏ sót DELETE**; thêm tải query; cần cột timestamp/id tăng dần |
| **CDC** (Debezium) | Đọc **transaction log** (Postgres WAL, MySQL binlog) mà DB *đã ghi sẵn* cho việc replicate | Cần bật logical replication; nhưng bắt **mọi** INSERT/UPDATE/DELETE, gần **real-time**, **không đụng** vào query nghiệp vụ |

**CDC là kỹ thuật thắng cuộc.** Mọi database đều đã ghi một **nhật ký thay đổi tuần tự** (WAL — Write-Ahead Log ở Postgres, binlog ở MySQL) để phục vụ crash-recovery và replication. **Debezium** giả làm một *replica*: nó "subscribe" vào chính dòng log đó, dịch mỗi thay đổi thành một Kafka event có cấu trúc `before`/`after`. Vì đọc từ log chứ không query bảng, nó thấy **tất cả**, kể cả DELETE, đúng thứ tự commit, và **gần như không gây tải** lên đường nghiệp vụ.

<svg viewBox="0 0 640 210" role="img" aria-labelledby="cdc-t cdc-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="cdc-t">Debezium đọc WAL binlog của DB và stream event thay đổi vào Kafka</title>
<desc id="cdc-d">Ứng dụng ghi vào bảng, DB ghi vào WAL, Debezium đọc WAL rồi phát event before after vào topic, các consumer đồng bộ sang search cache warehouse</desc>
<rect x="20" y="80" width="80" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="60" y="104" text-anchor="middle" font-size="10" fill="currentColor">App ghi</text>
<rect x="130" y="55" width="110" height="90" rx="8" fill="#10b981" fill-opacity="0.12" stroke="currentColor"/>
<text x="185" y="76" text-anchor="middle" font-size="10" fill="currentColor">Database</text>
<rect x="145" y="88" width="80" height="22" rx="4" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="185" y="103" text-anchor="middle" font-size="8" fill="currentColor">table rows</text>
<rect x="145" y="115" width="80" height="22" rx="4" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor"/>
<text x="185" y="130" text-anchor="middle" font-size="8" fill="currentColor">WAL / binlog</text>
<line x1="100" y1="100" x2="130" y2="100" stroke="currentColor" stroke-width="1.5" marker-end="url(#cd)"/>
<rect x="275" y="78" width="90" height="44" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="97" text-anchor="middle" font-size="10" fill="currentColor">Debezium</text>
<text x="320" y="112" text-anchor="middle" font-size="8" fill="currentColor">đọc log</text>
<line x1="225" y1="126" x2="275" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#cd)"/>
<rect x="400" y="78" width="90" height="44" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="445" y="97" text-anchor="middle" font-size="10" fill="currentColor">Kafka topic</text>
<text x="445" y="112" text-anchor="middle" font-size="8" fill="currentColor">before/after</text>
<line x1="365" y1="100" x2="400" y2="100" stroke="currentColor" stroke-width="1.5" marker-end="url(#cd)"/>
<rect x="525" y="45" width="95" height="30" rx="5" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="572" y="64" text-anchor="middle" font-size="9" fill="currentColor">Search</text>
<rect x="525" y="85" width="95" height="30" rx="5" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="572" y="104" text-anchor="middle" font-size="9" fill="currentColor">Cache</text>
<rect x="525" y="125" width="95" height="30" rx="5" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="572" y="144" text-anchor="middle" font-size="9" fill="currentColor">Warehouse</text>
<line x1="490" y1="95" x2="525" y2="62" stroke="currentColor" stroke-width="1" marker-end="url(#cd)"/>
<line x1="490" y1="100" x2="525" y2="100" stroke="currentColor" stroke-width="1" marker-end="url(#cd)"/>
<line x1="490" y1="105" x2="525" y2="138" stroke="currentColor" stroke-width="1" marker-end="url(#cd)"/>
<defs><marker id="cd" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Debezium khởi động qua **hai pha**: (1) **snapshot** — đọc toàn bộ dữ liệu hiện có của bảng để "khởi tạo" trạng thái đầy đủ trong Kafka; (2) **streaming** — từ đó chỉ đọc phần log mới. Nhờ vậy consumer luôn dựng được bức tranh trọn vẹn.

---

## 3. Thực hành: cấu hình connector bằng JSON

Connect distributed điều khiển qua **REST API** (cổng 8083). Tạo connector = POST một JSON.

### 3.1 Source: Debezium bắt CDC từ Postgres

```bash
curl -X POST http://localhost:8083/connectors \
  -H 'Content-Type: application/json' -d '{
  "name": "inventory-postgres-cdc",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "tasks.max": "1",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "dbz-secret",
    "database.dbname": "shop",
    "topic.prefix": "shop",
    "plugin.name": "pgoutput",
    "slot.name": "dbz_shop",
    "table.include.list": "public.orders,public.customers",
    "snapshot.mode": "initial",
    "publication.autocreate.mode": "filtered",
    "tombstones.on.delete": "true"
  }
}'
```

Giải thích các trường quan trọng:
- `connector.class`: plugin nào — ở đây là Debezium Postgres.
- `plugin.name=pgoutput`: dùng **logical decoding** có sẵn của Postgres 10+ (không cần cài thư viện ngoài). Yêu cầu server đặt `wal_level=logical`.
- `slot.name`: **replication slot** — Postgres giữ WAL chưa được Debezium đọc để không xoá mất. ⚠️ Nếu Debezium chết lâu, slot làm WAL phình to → phải giám sát.
- `table.include.list`: chỉ bắt bảng cần. Mỗi bảng ra **một topic** riêng: `shop.public.orders`, `shop.public.customers`.
- `snapshot.mode=initial`: lần đầu chụp toàn bộ rồi mới streaming.
- `tombstones.on.delete`: khi xoá hàng, phát thêm một record `value=null` (tombstone) — cần cho **log compaction** để đích thực sự xoá được.

Một event `UPDATE` Debezium sinh ra (rút gọn) trông như sau — có cả `before` và `after`, cực kỳ hữu ích để biết *đã đổi từ gì sang gì*:

```json
{
  "op": "u",
  "ts_ms": 1721800000000,
  "source": { "table": "orders", "lsn": 24567810, "txId": 1201 },
  "before": { "id": 42, "status": "PENDING",  "total": 100 },
  "after":  { "id": 42, "status": "SHIPPED",  "total": 100 }
}
```

`op` là `c` (create), `u` (update), `d` (delete), `r` (read — trong snapshot).

### 3.2 Sink: đẩy sang Elasticsearch (đồng bộ DB → search)

```bash
curl -X POST http://localhost:8083/connectors \
  -H 'Content-Type: application/json' -d '{
  "name": "orders-to-elasticsearch",
  "config": {
    "connector.class": "io.confluent.connect.elasticsearch.ElasticsearchSinkConnector",
    "tasks.max": "3",
    "topics": "shop.public.orders",
    "connection.url": "http://elasticsearch:9200",
    "key.ignore": "false",
    "schema.ignore": "true",
    "write.method": "upsert",
    "behavior.on.null.values": "delete"
  }
}'
```

- `write.method=upsert` + dùng **key của message làm document id** → ghi đè thay vì tạo mới ⇒ **idempotent**, an toàn với at-least-once. Đây là cách hoá giải "gửi lại" khi rebalance.
- `behavior.on.null.values=delete`: gặp tombstone (`value=null`) thì **xoá** document tương ứng ⇒ DELETE ở Postgres lan tới Elasticsearch.
- `tasks.max=3`: chia partition của topic cho 3 task chạy song song (giới hạn bởi số partition).

Vòng đời đầy đủ giờ đã khép kín: sửa hàng ở Postgres → Debezium bắt qua WAL → Kafka → Elasticsearch Sink upsert → tìm kiếm luôn tươi, **trễ dưới giây**, và bạn **không viết một dòng code ứng dụng nào**.

### 3.3 SMT — nắn message ngay trong pipeline

**Single Message Transform** là các hàm nhỏ chạy *trên từng message* trong Connect, trước khi tới Kafka (source) hoặc trước khi tới đích (sink): đổi tên trường, thêm field, che dữ liệu nhạy cảm, định tuyến topic... — mà **không cần** dựng Kafka Streams.

Ví dụ điển hình với Debezium: mặc định value bọc trong `before/after/op`. Nhiều đích chỉ muốn *bản ghi phẳng sau khi đổi*. Dùng SMT `ExtractNewRecordState`:

```json
"transforms": "unwrap,route",
"transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
"transforms.unwrap.drop.tombstones": "false",
"transforms.route.type": "org.apache.kafka.connect.transforms.RegexRouter",
"transforms.route.regex": "shop.public.(.*)",
"transforms.route.replacement": "cdc_$1"
```

- `unwrap`: bóc `after` ra thành record phẳng (`{id, status, total}`), giữ tombstone để xoá vẫn chạy.
- `route`: đổi tên topic `shop.public.orders` → `cdc_orders` bằng regex. SMT chạy theo **chuỗi** (khai báo thứ tự trong `transforms`).

Ranh giới cần nhớ: SMT là **stateless, per-message** — hợp cho biến đổi nhẹ. Cần join, aggregate, window (có trạng thái) thì đó là việc của **Kafka Streams / ksqlDB** (bài khác), đừng ép SMT làm.

### 3.4 Outbox pattern — CDC giải bài "dual write"

Vấn đề kinh điển: service vừa muốn **ghi DB** vừa muốn **phát event Kafka**. Làm hai thao tác tách rời (dual write) → nếu ghi DB xong mà gửi Kafka lỗi (hoặc ngược lại), hai bên **lệch nhau**, không có transaction chung.

**Outbox pattern**: trong *cùng một DB transaction* với thay đổi nghiệp vụ, ghi thêm một dòng vào bảng `outbox`. Vì cùng transaction nên **atomic** — hoặc cả hai cùng có, hoặc cả hai cùng không. Sau đó **Debezium CDC bảng `outbox`** để phát event ra Kafka. Không còn dual write; DB làm trọng tài duy nhất.

```sql
BEGIN;
  UPDATE orders SET status = 'SHIPPED' WHERE id = 42;
  INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
  VALUES ('order', '42', 'OrderShipped', '{"orderId":42,"status":"SHIPPED"}');
COMMIT;
```

Debezium có SMT chuyên dụng `EventRouter` để đọc bảng outbox và định tuyến theo `aggregate_type`:

```json
"transforms": "outbox",
"transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
"transforms.outbox.route.by.field": "aggregate_type",
"transforms.outbox.table.field.event.key": "aggregate_id"
```

Kết quả: event `OrderShipped` ra topic `outbox.event.order`, key = `42`. Chi tiết về Saga/Outbox trong ngữ cảnh giao dịch phân tán xem [[msg-17-saga-outbox]].

---

## 4. Vận hành & bẫy thường gặp

| Vấn đề | Nguyên nhân | Cách xử lý |
|--------|-------------|-----------|
| WAL/replication slot phình to | Debezium chết/tụt hậu, Postgres giữ WAL | Giám sát `pg_replication_slots`; đừng để slot mồ côi; cảnh báo lag |
| Message "poison" làm task chết lặp | Một record lỗi convert/schema | Bật **DLQ**: `errors.tolerance=all`, `errors.deadletterqueue.topic.name=...` |
| Đích nhận bản ghi trùng | At-least-once + rebalance | Thiết kế đích **idempotent** (upsert theo key) |
| DELETE không lan tới đích | Thiếu tombstone / config sai | `tombstones.on.delete=true` + `behavior.on.null.values=delete` |
| Đổi schema nguồn làm vỡ consumer | Thêm/bớt cột | Dùng **Schema Registry** (Avro) + quy tắc tương thích (bài schema) |

DLQ ở tầng Connect (khác DLQ nghiệp vụ ở Bài 2):

```json
"errors.tolerance": "all",
"errors.deadletterqueue.topic.name": "dlq-orders-sink",
"errors.deadletterqueue.context.headers.enable": "true",
"errors.log.enable": "true"
```

---

## 5. Tóm tắt
- **Kafka Connect** là framework **cấu hình-không-code** để đưa dữ liệu vào/ra Kafka: **source** (ngoài → Kafka), **sink** (Kafka → ngoài).
- Chạy **distributed** = cluster nhiều **worker**, mỗi connector chia thành **task**; toàn bộ trạng thái (config/offset/status) nằm trong **topic nội bộ Kafka** ⇒ bền, rebalance được, chạy tiếp từ **offset** đã commit. Ngữ nghĩa **at-least-once** ⇒ đích nên **idempotent**.
- **CDC với Debezium** đọc **WAL/binlog** — bắt **mọi** INSERT/UPDATE/DELETE gần real-time, gần như không tải, kèm `before/after`. Hai pha: **snapshot** rồi **streaming**.
- Use case: **DB → search/cache/warehouse** khép kín không viết code; **Outbox pattern** dùng CDC để diệt bài **dual write**, đảm bảo DB-và-event atomic (xem [[msg-17-saga-outbox]]).
- **SMT** nắn message per-message (unwrap, route, mask) ngay trong pipeline; việc có trạng thái để cho Kafka Streams. Vận hành nhớ giám sát **replication slot** và bật **DLQ**.

> **Bài tiếp theo:** Schema Registry và quản lý tiến hoá schema (Avro/Protobuf) — để pipeline Connect/CDC không vỡ khi nguồn đổi cấu trúc.
