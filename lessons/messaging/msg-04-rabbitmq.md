# Bài 4 — RabbitMQ: exchange, queue, binding & routing

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **mô hình AMQP**: producer **không** publish thẳng vào queue mà publish vào **exchange**; exchange mới quyết định message đi vào queue nào theo **binding + routing key**.
- Phân biệt và chọn đúng **4 loại exchange**: `direct`, `topic`, `fanout`, `headers`.
- Nắm luật khớp **wildcard** của topic exchange: `*` (đúng 1 word) và `#` (0 hoặc nhiều word).
- Dùng đúng **ack / nack / reject** và **prefetch (QoS)** để một consumer chậm không "ôm" hết message.
- Cấu hình được một hệ định tuyến log theo **severity** bằng cả `rabbitmqadmin` và pseudo-code client.

---

## 2. Lý thuyết

### 2.1 Vì sao có lớp exchange ở giữa?

Ở Bài 1 ta hình dung broker như "một cái hộp queue". RabbitMQ tinh vi hơn: nó tách **việc nhận** khỏi **việc định tuyến**. Producer chỉ ném message kèm một nhãn nhỏ (`routing key`) vào một **exchange** — một cái "bàn phân loại thư". Bàn này nhìn nhãn rồi copy message vào các queue đã **đăng ký (bind)** với nó. Producer **không biết**, **không cần biết** có bao nhiêu queue phía sau.

Analogy: bạn bỏ thư vào **bưu cục** (exchange) với mã vùng ghi trên phong bì (routing key). Bưu cục có bảng phân tuyến (binding) để đẩy thư về đúng các **hòm thư** (queue). Người gửi không cần biết hòm thư nằm ở đâu — thêm một hòm thư mới chỉ cần đăng ký thêm một dòng ở bưu cục, người gửi **không phải sửa gì**. Đây chính là decoupling ở Bài 1, nhưng đẩy sự linh hoạt của định tuyến vào broker.

<svg viewBox="0 0 640 250" role="img" aria-labelledby="rt-t rt-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="rt-t">Đường đi của message trong AMQP</title>
<desc id="rt-d">Producer publish vào exchange kèm routing key; exchange chiếu binding để copy message vào các queue phù hợp; consumer lấy từ queue</desc>
<rect x="20" y="100" width="90" height="44" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="65" y="120" text-anchor="middle" font-size="11" fill="currentColor">Producer</text>
<text x="65" y="136" text-anchor="middle" font-size="9" fill="currentColor">publish</text>
<line x1="110" y1="122" x2="170" y2="122" stroke="currentColor" stroke-width="1.5" marker-end="url(#ra)"/>
<text x="140" y="114" text-anchor="middle" font-size="9" fill="currentColor">key</text>
<rect x="172" y="92" width="96" height="60" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="220" y="118" text-anchor="middle" font-size="11" fill="currentColor">Exchange</text>
<text x="220" y="134" text-anchor="middle" font-size="9" fill="currentColor">(định tuyến)</text>
<line x1="268" y1="108" x2="360" y2="58" stroke="currentColor" stroke-width="1" marker-end="url(#ra)"/>
<line x1="268" y1="122" x2="360" y2="122" stroke="currentColor" stroke-width="1" marker-end="url(#ra)"/>
<line x1="268" y1="136" x2="360" y2="186" stroke="currentColor" stroke-width="1" marker-end="url(#ra)"/>
<text x="312" y="78" text-anchor="middle" font-size="8" fill="currentColor">binding</text>
<rect x="362" y="42" width="86" height="34" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="405" y="63" text-anchor="middle" font-size="10" fill="currentColor">Queue A</text>
<rect x="362" y="105" width="86" height="34" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="405" y="126" text-anchor="middle" font-size="10" fill="currentColor">Queue B</text>
<rect x="362" y="170" width="86" height="34" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="405" y="191" text-anchor="middle" font-size="10" fill="currentColor">Queue C</text>
<line x1="448" y1="59" x2="540" y2="59" stroke="currentColor" stroke-width="1" marker-end="url(#ra)"/>
<line x1="448" y1="122" x2="540" y2="122" stroke="currentColor" stroke-width="1" marker-end="url(#ra)"/>
<line x1="448" y1="187" x2="540" y2="187" stroke="currentColor" stroke-width="1" marker-end="url(#ra)"/>
<rect x="542" y="42" width="86" height="34" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="585" y="63" text-anchor="middle" font-size="10" fill="currentColor">Consumer</text>
<rect x="542" y="105" width="86" height="34" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="585" y="126" text-anchor="middle" font-size="10" fill="currentColor">Consumer</text>
<rect x="542" y="170" width="86" height="34" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="585" y="191" text-anchor="middle" font-size="10" fill="currentColor">Consumer</text>
<text x="320" y="232" text-anchor="middle" font-size="10" fill="currentColor">Producer chỉ chạm tới exchange; queue và consumer nằm sau binding</text>
<defs><marker id="ra" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Bốn khái niệm cốt lõi, thuộc lòng:

| Khái niệm | Vai trò |
|-----------|---------|
| **Exchange** | Điểm nhận message của producer; áp luật routing để chọn queue đích. Không lưu message. |
| **Queue** | Buffer thực sự chứa message chờ xử lý; consumer đọc từ đây. Message chỉ "sống" trong queue. |
| **Binding** | Một "luật nối" exchange → queue, thường kèm **binding key** / pattern. |
| **Routing key** | Nhãn producer gắn lên **từng** message; exchange đối chiếu nó với binding key. |

> Điểm dễ nhầm: **message không nằm trong exchange**. Nếu một message tới exchange mà **không khớp binding nào**, nó bị **rơi (dropped)** một cách âm thầm (trừ khi bật `mandatory` hoặc cấu hình `alternate-exchange`). Không có queue = không ai giữ.

### 2.2 Bốn loại exchange

<svg viewBox="0 0 640 250" role="img" aria-labelledby="ex-t ex-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="ex-t">Bốn loại exchange trong RabbitMQ</title>
<desc id="ex-d">Direct khớp chính xác routing key, topic khớp wildcard, fanout broadcast tới mọi queue, headers khớp theo header</desc>
<rect x="16" y="40" width="140" height="180" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="86" y="64" text-anchor="middle" font-size="12" fill="currentColor">direct</text>
<text x="86" y="120" text-anchor="middle" font-size="10" fill="currentColor">routing key</text>
<text x="86" y="138" text-anchor="middle" font-size="10" fill="currentColor">khớp CHÍNH XÁC</text>
<text x="86" y="168" text-anchor="middle" font-size="9" fill="currentColor">key = "error"</text>
<text x="86" y="184" text-anchor="middle" font-size="9" fill="currentColor">→ queue bind "error"</text>
<rect x="166" y="40" width="140" height="180" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="236" y="64" text-anchor="middle" font-size="12" fill="currentColor">topic</text>
<text x="236" y="120" text-anchor="middle" font-size="10" fill="currentColor">wildcard</text>
<text x="236" y="138" text-anchor="middle" font-size="10" fill="currentColor">* và #</text>
<text x="236" y="168" text-anchor="middle" font-size="9" fill="currentColor">key = "eu.order.new"</text>
<text x="236" y="184" text-anchor="middle" font-size="9" fill="currentColor">→ bind "eu.#"</text>
<rect x="316" y="40" width="140" height="180" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="386" y="64" text-anchor="middle" font-size="12" fill="currentColor">fanout</text>
<text x="386" y="120" text-anchor="middle" font-size="10" fill="currentColor">BỎ QUA key</text>
<text x="386" y="138" text-anchor="middle" font-size="10" fill="currentColor">copy tới MỌI queue</text>
<text x="386" y="168" text-anchor="middle" font-size="9" fill="currentColor">broadcast thuần</text>
<text x="386" y="184" text-anchor="middle" font-size="9" fill="currentColor">(pub/sub)</text>
<rect x="466" y="40" width="158" height="180" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="545" y="64" text-anchor="middle" font-size="12" fill="currentColor">headers</text>
<text x="545" y="120" text-anchor="middle" font-size="10" fill="currentColor">khớp theo</text>
<text x="545" y="138" text-anchor="middle" font-size="10" fill="currentColor">HEADER (map)</text>
<text x="545" y="168" text-anchor="middle" font-size="9" fill="currentColor">x-match: all / any</text>
<text x="545" y="184" text-anchor="middle" font-size="9" fill="currentColor">bỏ qua routing key</text>
</svg>

**a) `direct` — khớp routing key chính xác.** Message đi vào queue có binding key **bằng đúng** routing key (so sánh chuỗi tuyệt đối). Dùng khi định tuyến theo một nhãn rời rạc, cố định — ví dụ `error`, `info`, `warning`. Nhiều queue có thể cùng bind một key (khi đó cả hai đều nhận), và một queue có thể bind nhiều key.

**b) `topic` — khớp theo pattern phân cấp.** Routing key là chuỗi các *word* ngăn bởi dấu chấm, ví dụ `eu.order.created`. Binding key được phép chứa wildcard:
- `*` khớp **đúng một** word. `*.order.*` khớp `eu.order.created` nhưng **không** khớp `eu.order` (thiếu word) hay `eu.order.line.created` (thừa word).
- `#` khớp **không hoặc nhiều** word. `eu.#` khớp `eu`, `eu.order`, `eu.order.created`. `#` một mình khớp **tất cả**.

**c) `fanout` — broadcast.** Bỏ qua routing key hoàn toàn, copy message vào **mọi** queue đang bind với exchange. Đây là pub/sub thuần của Bài 1 (một event → mọi subscriber). Dùng cho cache invalidation, thông báo realtime tới nhiều dịch vụ.

**d) `headers` — khớp theo header thay vì routing key.** Bind theo một map header + `x-match`: `all` (phải khớp mọi cặp) hoặc `any` (khớp ít nhất một). Mạnh khi tiêu chí định tuyến là **nhiều thuộc tính** không tiện nhồi vào một chuỗi (`format=pdf` và `region=eu`). Đổi lại chậm và ít dùng hơn topic.

| Exchange | Căn cứ route | Khớp | Ca dùng điển hình |
|----------|--------------|------|-------------------|
| `direct` | routing key | bằng chuỗi | Route theo nhãn cố định (severity, loại job) |
| `topic` | routing key | wildcard `*` `#` | Route phân cấp linh hoạt (region.entity.action) |
| `fanout` | (bỏ qua) | tất cả queue | Broadcast / pub-sub thuần |
| `headers` | headers | map + `x-match` | Route theo nhiều thuộc tính không thứ tự |

> Mẹo: `direct` chỉ là trường hợp đặc biệt của `topic` (không dùng wildcard). Trong thực tế nhiều team dùng thẳng `topic` cho mọi thứ để không phải đổi loại exchange khi nhu cầu route phức tạp lên.

### 2.3 Ví dụ định tuyến log theo severity

Ta muốn: log `error` phải vào cả queue lưu-đĩa **và** queue cảnh báo; `info`/`warning` chỉ vào queue lưu-đĩa. Đây đúng bài toán route theo một nhãn rời rạc → dùng `direct` exchange.

<svg viewBox="0 0 640 240" role="img" aria-labelledby="lg-t lg-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="lg-t">Định tuyến log theo severity qua direct exchange</title>
<desc id="lg-d">Queue lưu đĩa bind info warning error; queue cảnh báo chỉ bind error nên chỉ nhận log error</desc>
<rect x="16" y="90" width="110" height="54" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="71" y="112" text-anchor="middle" font-size="10" fill="currentColor">App logger</text>
<text x="71" y="128" text-anchor="middle" font-size="9" fill="currentColor">key=severity</text>
<line x1="126" y1="116" x2="196" y2="116" stroke="currentColor" stroke-width="1.5" marker-end="url(#la)"/>
<rect x="198" y="86" width="110" height="62" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="253" y="112" text-anchor="middle" font-size="10" fill="currentColor">logs_direct</text>
<text x="253" y="128" text-anchor="middle" font-size="9" fill="currentColor">(direct)</text>
<line x1="308" y1="104" x2="420" y2="60" stroke="currentColor" stroke-width="1" marker-end="url(#la)"/>
<text x="360" y="72" text-anchor="middle" font-size="8" fill="currentColor">info,warning,error</text>
<line x1="308" y1="128" x2="420" y2="176" stroke="currentColor" stroke-width="1" marker-end="url(#la)"/>
<text x="356" y="164" text-anchor="middle" font-size="8" fill="currentColor">error</text>
<rect x="422" y="42" width="140" height="40" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="492" y="60" text-anchor="middle" font-size="10" fill="currentColor">q.all (lưu đĩa)</text>
<text x="492" y="74" text-anchor="middle" font-size="8" fill="currentColor">nhận mọi severity</text>
<rect x="422" y="158" width="140" height="40" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="492" y="176" text-anchor="middle" font-size="10" fill="currentColor">q.alerts</text>
<text x="492" y="190" text-anchor="middle" font-size="8" fill="currentColor">chỉ nhận error</text>
<text x="320" y="226" text-anchor="middle" font-size="10" fill="currentColor">Một queue bind nhiều key; một key (error) tới nhiều queue</text>
<defs><marker id="la" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Khai báo bằng `rabbitmqadmin` (CLI đi kèm plugin management) — chạy được ngay:

```bash
# 1) Exchange kiểu direct, durable để sống sót qua restart broker
rabbitmqadmin declare exchange \
  name=logs_direct type=direct durable=true

# 2) Hai queue durable
rabbitmqadmin declare queue name=q.all    durable=true
rabbitmqadmin declare queue name=q.alerts durable=true

# 3) Binding: q.all nhận cả 3 severity (3 binding, mỗi cái một key)
rabbitmqadmin declare binding source=logs_direct destination=q.all routing_key=info
rabbitmqadmin declare binding source=logs_direct destination=q.all routing_key=warning
rabbitmqadmin declare binding source=logs_direct destination=q.all routing_key=error

# 4) q.alerts CHỈ nhận error
rabbitmqadmin declare binding source=logs_direct destination=q.alerts routing_key=error

# 5) Thử publish — routing_key chính là severity
rabbitmqadmin publish exchange=logs_direct routing_key=error   payload='disk full on db-01'
rabbitmqadmin publish exchange=logs_direct routing_key=info    payload='user 42 logged in'
```

Kết quả: message `error` xuất hiện trong **cả** `q.all` lẫn `q.alerts`; message `info` chỉ trong `q.all`. Muốn linh hoạt hơn (route theo `app.severity`, ví dụ `payment.error`) thì đổi sang `topic` và bind `q.alerts` với `*.error`.

Publish phía client (pseudo-code, phong cách thư viện `pika` của Python):

```python
import pika, json

conn = pika.BlockingConnection(pika.ConnectionParameters("localhost"))
ch = conn.channel()
ch.exchange_declare(exchange="logs_direct", exchange_type="direct", durable=True)

def log(severity: str, msg: str):
    ch.basic_publish(
        exchange="logs_direct",
        routing_key=severity,               # "error" / "warning" / "info"
        body=json.dumps({"msg": msg}),
        properties=pika.BasicProperties(
            delivery_mode=2,                # 2 = persistent: message ghi xuống đĩa
            content_type="application/json",
        ),
    )

log("error", "disk full on db-01")          # vào q.all + q.alerts
log("info",  "user 42 logged in")           # chỉ q.all
```

> Lưu ý bền vững cần **cả ba**: exchange `durable`, queue `durable`, và message `delivery_mode=2` (persistent). Thiếu một cái, dữ liệu có thể bay khi broker restart.

### 2.4 Queue, consumer và vòng đời một message: ack / nack / reject

Khi consumer nhận message, broker **chưa xoá** nó — nó chỉ đánh dấu "đang giao" (unacked). Consumer phải chốt số phận message:

- **ack** (`basic_ack`): "xử lý xong, xoá đi". Broker mới thực sự bỏ message.
- **nack** (`basic_nack`) / **reject** (`basic_reject`): "tôi không xử lý được". Tham số `requeue`:
  - `requeue=true` → trả message về đầu queue để thử lại (coi chừng **vòng lặp độc** nếu lỗi vĩnh viễn).
  - `requeue=false` → bỏ message; nếu queue có cấu hình **Dead Letter Exchange (DLX)** thì message bị đẩy sang đó (xem Bài 2/DLQ).

Khác biệt: `reject` xử lý **một** message; `nack` xử lý được **nhiều** (cờ `multiple=true` ack/nack tất cả tới delivery-tag đó). Điểm sinh tử: nếu consumer **chết trước khi ack**, broker phát hiện kênh đứt và **giao lại** message cho consumer khác → đảm bảo **at-least-once**. Đó là lý do phải ack **sau khi** làm xong việc, không phải lúc vừa nhận.

<svg viewBox="0 0 620 210" role="img" aria-labelledby="ak-t ak-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="ak-t">Vòng đời một message trong queue theo ack nack reject</title>
<desc id="ak-d">Message từ Ready sang Unacked khi giao cho consumer; ack thì xoá, nack requeue thì quay lại Ready, nack không requeue thì sang dead letter</desc>
<rect x="20" y="80" width="100" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="70" y="100" text-anchor="middle" font-size="10" fill="currentColor">Ready</text>
<text x="70" y="115" text-anchor="middle" font-size="8" fill="currentColor">chờ trong queue</text>
<line x1="120" y1="103" x2="200" y2="103" stroke="currentColor" stroke-width="1" marker-end="url(#ka)"/>
<text x="160" y="95" text-anchor="middle" font-size="8" fill="currentColor">deliver</text>
<rect x="202" y="80" width="110" height="46" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="257" y="100" text-anchor="middle" font-size="10" fill="currentColor">Unacked</text>
<text x="257" y="115" text-anchor="middle" font-size="8" fill="currentColor">đang xử lý</text>
<line x1="312" y1="92" x2="470" y2="46" stroke="currentColor" stroke-width="1" marker-end="url(#ka)"/>
<text x="392" y="58" text-anchor="middle" font-size="8" fill="currentColor">ack → xoá hẳn</text>
<line x1="257" y1="126" x2="70" y2="126" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3" marker-end="url(#ka)"/>
<text x="160" y="150" text-anchor="middle" font-size="8" fill="currentColor">nack requeue=true</text>
<line x1="312" y1="114" x2="470" y2="160" stroke="currentColor" stroke-width="1" marker-end="url(#ka)"/>
<text x="400" y="150" text-anchor="middle" font-size="8" fill="currentColor">nack requeue=false</text>
<rect x="472" y="28" width="120" height="38" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="532" y="51" text-anchor="middle" font-size="10" fill="currentColor">Xong (xoá)</text>
<rect x="472" y="142" width="120" height="38" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="532" y="160" text-anchor="middle" font-size="10" fill="currentColor">Dead Letter</text>
<text x="532" y="173" text-anchor="middle" font-size="8" fill="currentColor">(qua DLX)</text>
<text x="300" y="200" text-anchor="middle" font-size="10" fill="currentColor">Consumer chết trước ack → message tự quay lại Ready (at-least-once)</text>
<defs><marker id="ka" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.5 Prefetch (QoS): chống một consumer ôm hết

Mặc định, nếu bật auto-ack hoặc không giới hạn, broker **đẩy dồn** message cho consumer nhanh nhất có thể. Vấn đề: khi có nhiều consumer nhưng message tới thành cụm, RabbitMQ round-robin **ngay lúc message tới** — một consumer có thể nhận cả chồng vào buffer nội bộ trong khi consumer khác **ngồi không**. Consumer "ôm hàng" đó xử lý chậm, các message đang xếp sau nó bị kẹt dù có worker rảnh.

**Giải pháp: `basic_qos(prefetch_count=N)`** — "đừng giao cho consumer này quá **N** message chưa-ack cùng lúc". Broker chỉ tiếp message mới cho một consumer khi nó đã ack bớt. Đặt `prefetch=1` biến việc phân phối thành **fair dispatch** thật sự: ai ack xong (rảnh) mới nhận việc kế — giống Bài 1 hàng người trước một quầy.

```python
ch.basic_qos(prefetch_count=1)              # fair dispatch: mỗi lúc tối đa 1 message chưa-ack

def on_message(ch, method, props, body):
    try:
        do_work(body)                       # ví dụ: xử lý ảnh, mất vài giây
        ch.basic_ack(delivery_tag=method.delivery_tag)          # xong → xoá
    except TransientError:
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)   # lỗi tạm → thử lại
    except PoisonMessage:
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)  # hỏng vĩnh viễn → DLX

ch.basic_consume(queue="q.all", on_message_callback=on_message, auto_ack=False)
ch.start_consuming()
```

**Chọn N bao nhiêu?**

| prefetch_count | Hệ quả |
|----------------|--------|
| `1` | Công bằng tuyệt đối, nhưng mỗi round-trip ack tốn latency → throughput thấp nếu message nhẹ & nhanh. |
| Vừa (vd `10`–`50`) | Cân bằng: consumer luôn có sẵn ít việc để không chờ mạng, mà không ôm quá nhiều. Mặc định tốt cho job nặng. |
| Quá lớn / vô hạn | Một consumer buffer cả nghìn message → mất fairness, RAM phình, restart mất nhiều việc-đang-làm. |

Quy tắc thực dụng: **job càng nặng/lâu, prefetch càng thấp** (gần 1); **message nhỏ, xử lý cực nhanh, số lượng khổng lồ** thì tăng prefetch để giấu độ trễ mạng. Prefetch đặt trên **channel** (hoặc `global=true` cho cả connection).

---

## 3. Ghép lại: một pipeline hoàn chỉnh

```python
# --- Producer side (khai báo topology idempotent, gọi bao nhiêu lần cũng an toàn) ---
ch.exchange_declare("logs", exchange_type="topic", durable=True)

# --- Consumer side: worker xử lý mọi log, và worker cảnh báo chỉ nghe error ---
ch.queue_declare("q.all",    durable=True)
ch.queue_declare("q.alerts", durable=True)
ch.queue_bind("q.all",    "logs", routing_key="#")          # mọi log
ch.queue_bind("q.alerts", "logs", routing_key="*.error")    # <app>.error bất kỳ
ch.basic_qos(prefetch_count=20)
```

- Producer publish `payment.error`, `auth.info`, `billing.warning` vào exchange `logs`.
- `q.all` (bind `#`) nhận tất cả để lưu.
- `q.alerts` (bind `*.error`) chỉ nhận `payment.error`, `auth.error`... → đội on-call chỉ bị đánh thức bởi `error`.
- Nhiều worker cùng consume `q.all` sẽ **chia tải** (point-to-point trong nội bộ một queue); còn hai queue khác nhau nhận **bản sao độc lập** (fan-out ở tầng exchange). RabbitMQ đạt cả hai mô hình của Bài 1 nhờ tách exchange khỏi queue.

---

## 4. Tóm tắt
- Trong AMQP, producer publish vào **exchange**, không vào queue. Exchange áp **binding + routing key** để copy message vào queue; **message chỉ sống trong queue**, không khớp binding nào thì **rơi**.
- **Bốn exchange**: `direct` (khớp key chính xác), `topic` (wildcard `*` = 1 word, `#` = 0+ word), `fanout` (broadcast bỏ qua key), `headers` (khớp map header + `x-match`).
- Vòng đời message: `Ready → Unacked → ack (xoá) / nack-requeue (quay lại) / nack-no-requeue (DLX)`. Ack **sau khi** xử lý xong; consumer chết trước ack → message được giao lại (**at-least-once**).
- **Prefetch (QoS)** giới hạn số message chưa-ack mỗi consumer → **fair dispatch**, chống một consumer ôm hết. Job nặng đặt prefetch thấp, message nhẹ số lượng lớn đặt cao.
- Muốn bền: **durable** exchange + **durable** queue + **persistent** message (`delivery_mode=2`) — thiếu một là mất dữ liệu khi restart.

> **Bài tiếp theo (Bài 5):** bước sang **Kafka** — vì sao "log giữ lại + offset" cho phép replay và nhiều consumer group, khác hẳn mô hình "xoá khi ack" của RabbitMQ.
