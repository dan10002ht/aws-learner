# gRPC & Protobuf: giao tiếp service hiệu năng cao

Khi hai service gọi nhau hàng chục nghìn lần mỗi giây trong nội bộ, cái giá của mỗi RPC không còn là chi tiết nhỏ: parse JSON tốn CPU, mỗi request mở một connection tốn round-trip TLS, và hai team dễ lệch hợp đồng vì "docs nói một đằng, code làm một nẻo". gRPC + Protobuf ra đời để trả lời đúng ba vấn đề đó: **contract-first** (một file `.proto` là nguồn sự thật), **serialize binary** (nhỏ và nhanh hơn JSON nhiều lần), và **HTTP/2** (multiplexing, streaming, header compression). Bài này mổ xẻ cơ chế bên dưới — không dừng ở "gRPC nhanh hơn REST" — để bạn biết *tại sao* và *khi nào* dùng nó.

## Mục tiêu

- Hiểu Protobuf là gì: IDL định nghĩa message/service, cách serialize binary theo wire format, và **schema evolution** an toàn (field number, `reserved`).
- Nắm vì sao gRPC chạy trên HTTP/2 lại hơn hẳn HTTP/1.1: multiplexing, framing, header compression.
- Viết được `.proto` và sinh code (stub) cho server/client, cả 4 kiểu RPC.
- Dùng đúng deadline propagation, metadata, interceptor, và error model (status code).
- Quyết định gRPC vs REST vs GraphQL dựa trên consumer và traffic pattern.

## 1. Protocol Buffers: hợp đồng là một file `.proto`

Protobuf là một **IDL (Interface Definition Language)**: bạn mô tả hình dạng dữ liệu (`message`) và các phương thức (`service`) trong file `.proto`, rồi compiler `protoc` sinh ra code cho ngôn ngữ bạn chọn. Điểm mấu chốt: cả người gửi và người nhận cùng sinh code từ **một file** — không thể lệch schema như JSON tự do.

```protobuf
syntax = "proto3";

package shop.v1;

option go_package = "github.com/acme/shop/gen/shopv1;shopv1";

// message = một struct dữ liệu. Số sau dấu = là FIELD NUMBER (không phải giá trị).
message Order {
  string id = 1;
  string customer_id = 2;
  int64 amount_cents = 3;
  OrderStatus status = 4;
  repeated LineItem items = 5;        // repeated = mảng/list
  google.protobuf.Timestamp created_at = 6;
}

message LineItem {
  string sku = 1;
  uint32 quantity = 2;
  int64 unit_price_cents = 3;
}

enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;       // proto3 BẮT BUỘC enum đầu tiên = 0
  ORDER_STATUS_PENDING = 1;
  ORDER_STATUS_PAID = 2;
  ORDER_STATUS_SHIPPED = 3;
}
```

**Field number** là trái tim của Protobuf và là thứ hay bị hiểu nhầm nhất. Khi serialize, Protobuf **không ghi tên field** (`"customer_id"`) vào bytes — nó chỉ ghi *số* của field. Đó là lý do payload nhỏ hơn JSON rất nhiều, nhưng cũng là lý do bạn **không bao giờ được đổi số của một field đã dùng**.

### Wire format: tại sao binary nhỏ và nhanh hơn JSON

Mỗi field trên dây được mã hoá thành một cặp **tag + value**, trong đó `tag = (field_number << 3) | wire_type`. `wire_type` (3 bit) cho parser biết đọc bao nhiêu byte tiếp theo. Số nguyên dùng **varint** — số nhỏ chỉ tốn 1 byte. So sánh cùng một order:

```
JSON  (69 bytes):  {"id":"o_42","customer_id":"c_7","amount_cents":1500,"status":"PAID"}
Proto (16 bytes):  0A 04 6F 5F 34 32  12 03 63 5F 37  18 DC 0B  20 02
                   └field1 "o_42"┘   └field2 "c_7"┘  └f3 1500┘ └f4 2┘
```

Không có dấu ngoặc, dấu phẩy, tên field, hay khoảng trắng — chỉ có tag và giá trị. Ngoài kích thước, parse cũng nhanh hơn nhiều: JSON parser phải quét từng ký tự, xử lý escape, chuyển chuỗi `"1500"` thành số; Protobuf đọc thẳng byte theo `wire_type` đã biết trước, gần như copy trực tiếp vào struct.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 260" role="img" aria-labelledby="t1 d1" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title id="t1">So sánh kích thước JSON và Protobuf trên cùng một message</title>
  <desc id="d1">JSON ghi cả tên field, dấu ngoặc và dấu phẩy nên tốn khoảng 81 byte; Protobuf chỉ ghi tag gồm field number và wire type rồi tới giá trị, không có tên field, còn khoảng 20 byte.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Cùng một Order — hai cách mã hoá trên dây</text>
  <g font-size="11" fill="currentColor">
    <rect x="16" y="40" width="688" height="70" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="28" y="60" font-size="12" font-weight="700" fill="currentColor">JSON — 69 bytes</text>
    <text x="28" y="80" fill="currentColor" opacity="0.8" font-size="10.5">{"id":"o_42","customer_id":"c_7","amount_cents":1500,"status":"PAID"}</text>
    <text x="28" y="99" fill="currentColor" opacity="0.6" font-size="10">tên field lặp lại mỗi record · số là chuỗi text · dấu ngoặc và phẩy</text>
  </g>
  <g font-size="11" fill="currentColor">
    <rect x="16" y="126" width="688" height="70" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="28" y="146" font-size="12" font-weight="700" fill="currentColor">Protobuf — 16 bytes</text>
    <text x="28" y="166" fill="currentColor" opacity="0.8" font-size="10.5">0A 04 6F 5F 34 32 · 12 03 63 5F 37 · 18 DC 0B · 20 02</text>
    <text x="28" y="185" fill="currentColor" opacity="0.6" font-size="10">tag = (field_number &lt;&lt; 3) | wire_type → chỉ SỐ field, không có tên · varint cho số nguyên</text>
  </g>
  <text x="360" y="228" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.75">Nhỏ hơn khoảng 4 lần và parse nhanh hơn nhiều vì không quét text hay tra tên field</text>
  <text x="360" y="246" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.55">Đổi lại: bytes không tự mô tả — phải có schema .proto mới đọc được</text>
</svg>

> 💡 Ghi nhớ: cái giá của binary là **không self-describing**. Nhìn một chuỗi byte Protobuf không có schema thì không biết field nào là gì — đây vừa là điểm mạnh (nhỏ) vừa là ràng buộc (phải chia sẻ `.proto`, phải có `grpcurl`/reflection để debug).

## 2. Schema evolution: tiến hoá không phá vỡ

Trong hệ phân tán, client cũ và server mới (hoặc ngược lại) luôn tồn tại đồng thời trong lúc rollout. Protobuf được thiết kế để **backward và forward compatible** nếu bạn tuân thủ vài quy tắc quanh field number.

| Thao tác | An toàn? | Vì sao |
|---|---|---|
| Thêm field mới (số mới) | ✅ | Bên cũ gặp field lạ thì bỏ qua (giữ trong unknown fields), bên mới thấy field vắng thì nhận default |
| Đổi **tên** field | ✅ | Tên không đi trên dây, chỉ field number mới quan trọng |
| Xoá field | ⚠️ có điều kiện | Phải `reserved` số đó để không ai tái dùng |
| **Đổi field number** của field đang dùng | ❌ | Bên kia đọc byte theo số cũ → lệch dữ liệu hoàn toàn |
| Đổi **type** không tương thích (vd `int32` → `string`) | ❌ | Wire type khác → parse hỏng |

Quy tắc sống còn: khi xoá một field, **cấm vĩnh viễn** field number (và tên) đó để lần sau không ai vô tình tái sử dụng và đọc nhầm dữ liệu cũ:

```protobuf
message Order {
  string id = 1;
  string customer_id = 2;
  int64 amount_cents = 3;
  OrderStatus status = 4;
  // Đã xoá field discount_code (số 7) và legacy_note (số 9) ở v2.
  reserved 7, 9;
  reserved "discount_code", "legacy_note";
  // Field mới luôn lấy SỐ MỚI, không bao giờ tái dùng 7 hay 9.
  string coupon_id = 12;
}
```

Vài lưu ý bản chất trong proto3:
- Số nguyên `int32`/`int64` mã hoá varint không hiệu quả cho **số âm** (luôn tốn 10 byte) — dùng `sint32`/`sint64` (zigzag) nếu giá trị hay âm.
- Field vắng và field mang **giá trị default** (0, `""`, `false`) không phân biệt được trên dây. Cần phân biệt "chưa set" với "set = 0" thì dùng `optional` (sinh ra hàm `HasX()`), hoặc wrapper type.
- **Không dùng enum ở biên** mà không có giá trị `_UNSPECIFIED = 0`: giá trị 0 là default khi field vắng, để dành cho "không biết" giúp phát hiện lỗi thay vì mặc định nhầm vào một trạng thái thật.

## 3. gRPC trên HTTP/2: tại sao không phải HTTP/1.1

gRPC bắt buộc HTTP/2. Đây không phải chi tiết kỹ thuật vô thưởng vô phạt — nó là thứ cho phép streaming và hiệu năng cao mà HTTP/1.1 không làm được:

- **Multiplexing**: HTTP/1.1 mỗi connection xử lý *một* request tại một thời điểm (head-of-line blocking); muốn song song phải mở nhiều TCP connection. HTTP/2 chia mỗi RPC thành một **stream** có id riêng, nhiều stream chạy xen kẽ trên **cùng một** connection. Một connection gRPC gánh được hàng nghìn RPC đồng thời.
- **Binary framing**: dữ liệu chia thành các frame (HEADERS, DATA) có kích thước rõ ràng — đây chính là nền tảng để gửi từng "message" trong streaming.
- **Header compression (HPACK)**: header lặp lại (`:path`, `content-type`, auth token) được nén và cache theo connection thay vì gửi text đầy đủ mỗi request như HTTP/1.1.
- **Flow control** theo từng stream: consumer chậm không làm nghẽn cả connection.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" aria-labelledby="t2 d2" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title id="t2">HTTP/1.1 mỗi request một connection nối tiếp so với HTTP/2 multiplexing nhiều stream trên một connection</title>
  <desc id="d2">Bên trái HTTP/1.1 phải mở nhiều TCP connection, mỗi connection chỉ chạy một request tại một thời điểm. Bên phải HTTP/2 dùng một connection duy nhất mang nhiều stream có id riêng chạy xen kẽ đồng thời.</desc>
  <text x="16" y="22" font-size="13" font-weight="700" fill="currentColor">HTTP/1.1</text>
  <g font-size="10" fill="currentColor" stroke="currentColor">
    <rect x="16" y="40" width="120" height="34" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="76" y="61" text-anchor="middle" stroke="none">conn 1 · req A</text>
    <rect x="16" y="86" width="120" height="34" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="76" y="107" text-anchor="middle" stroke="none">conn 2 · req B</text>
    <rect x="16" y="132" width="120" height="34" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="76" y="153" text-anchor="middle" stroke="none">conn 3 · req C</text>
    <line x1="140" y1="57" x2="290" y2="70" stroke-opacity="0.4" marker-end="url(#a2)"/>
    <line x1="140" y1="103" x2="290" y2="100" stroke-opacity="0.4" marker-end="url(#a2)"/>
    <line x1="140" y1="149" x2="290" y2="130" stroke-opacity="0.4" marker-end="url(#a2)"/>
    <rect x="292" y="70" width="70" height="60" rx="7" fill="currentColor" fill-opacity="0.06" stroke-opacity="0.15"/>
    <text x="327" y="104" text-anchor="middle" stroke="none" font-size="9">server</text>
  </g>
  <text x="76" y="192" font-size="9.5" fill="currentColor" opacity="0.6">nhiều TCP + TLS handshake · 1 request/conn tại một thời điểm</text>
  <defs>
    <marker id="a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker>
  </defs>
  <line x1="400" y1="34" x2="400" y2="260" stroke="currentColor" stroke-opacity="0.15" stroke-dasharray="4 4"/>
  <text x="416" y="22" font-size="13" font-weight="700" fill="currentColor">HTTP/2 (gRPC)</text>
  <g font-size="10" fill="currentColor" stroke="currentColor">
    <rect x="416" y="40" width="150" height="126" rx="9" fill="#10b981" fill-opacity="0.12" stroke-opacity="0.2"/>
    <text x="491" y="58" text-anchor="middle" stroke="none" font-weight="700" font-size="10.5">1 connection</text>
    <rect x="430" y="68" width="122" height="22" rx="5" fill="#3b82f6" fill-opacity="0.18" stroke-opacity="0.18"/>
    <text x="491" y="83" text-anchor="middle" stroke="none" font-size="9.5">stream 1 · req A</text>
    <rect x="430" y="96" width="122" height="22" rx="5" fill="#8b5cf6" fill-opacity="0.18" stroke-opacity="0.18"/>
    <text x="491" y="111" text-anchor="middle" stroke="none" font-size="9.5">stream 3 · req B</text>
    <rect x="430" y="124" width="122" height="22" rx="5" fill="#14b8a6" fill-opacity="0.2" stroke-opacity="0.18"/>
    <text x="491" y="139" text-anchor="middle" stroke="none" font-size="9.5">stream 5 · req C</text>
    <line x1="566" y1="103" x2="628" y2="103" stroke-opacity="0.5" marker-end="url(#a2)"/>
    <rect x="630" y="72" width="74" height="62" rx="7" fill="currentColor" fill-opacity="0.06" stroke-opacity="0.15"/>
    <text x="667" y="107" text-anchor="middle" stroke="none" font-size="9">server</text>
  </g>
  <text x="560" y="192" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">nhiều stream xen kẽ đồng thời · HPACK nén header · nền tảng cho streaming</text>
  <text x="360" y="240" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.8">Cùng lượng RPC, HTTP/2 dùng ít connection hơn → ít handshake, ít tài nguyên, độ trễ thấp hơn</text>
</svg>

> ⚠️ Bẫy production: chính vì gRPC dồn mọi RPC vào một connection HTTP/2 sống lâu, đặt sau một **L4 load balancer**, toàn bộ traffic của một client sẽ dính vào **một** backend — LB không nhìn thấy từng RPC để rải. Cần client-side load balancing, hoặc L7 proxy hiểu HTTP/2 (Envoy, ALB), hoặc đặt `MAX_CONNECTION_AGE` để ép client mở lại connection và tái cân bằng định kỳ.

## 4. Định nghĩa service & code generation

Thêm `service` vào `.proto`, mỗi `rpc` nhận một message và trả một message:

```protobuf
service OrderService {
  // unary: 1 request → 1 response (giống REST call thông thường)
  rpc GetOrder(GetOrderRequest) returns (Order);
  rpc CreateOrder(CreateOrderRequest) returns (Order);

  // server streaming: 1 request → nhiều response (theo dõi thay đổi)
  rpc WatchOrders(WatchOrdersRequest) returns (stream OrderEvent);

  // client streaming: nhiều request → 1 response (upload/gộp)
  rpc ImportOrders(stream Order) returns (ImportSummary);

  // bidirectional: hai chiều độc lập (chat, sync realtime)
  rpc SyncInventory(stream InventoryDelta) returns (stream InventoryAck);
}

message GetOrderRequest { string id = 1; }
message CreateOrderRequest { string customer_id = 1; repeated LineItem items = 2; }
message WatchOrdersRequest { string customer_id = 1; }
message OrderEvent { Order order = 1; string change = 2; }
message ImportSummary { uint32 imported = 1; uint32 failed = 2; }
message InventoryDelta { string sku = 1; int32 delta = 2; }
message InventoryAck { string sku = 1; int32 on_hand = 2; }
```

Sinh code (stub) bằng `protoc` với plugin cho từng ngôn ngữ — client và server ở các ngôn ngữ khác nhau vẫn khớp hợp đồng tuyệt đối:

```bash
# Cài compiler + plugin Go (một lần)
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Sinh Go struct + gRPC server/client interface
protoc --go_out=. --go_opt=paths=source_relative \
       --go-grpc_out=. --go-grpc_opt=paths=source_relative \
       shop/v1/order.proto

# Ngôn ngữ khác dùng plugin tương ứng, CÙNG file .proto:
#   Python:  python -m grpc_tools.protoc --python_out=. --grpc_python_out=. ...
#   TS/Node: protoc --plugin=protoc-gen-ts_proto ...
```

> 💡 Ghi nhớ: giá trị lớn nhất của gRPC không phải tốc độ mà là **contract-first + codegen**. `.proto` nằm trong một repo chung (hoặc buf registry), CI chặn breaking change (`buf breaking`), mọi team `import` cùng stub sinh ra — không thể có chuyện client và server hiểu field khác nhau.

## 5. Bốn kiểu RPC — và code thật

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" aria-labelledby="t3 d3" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title id="t3">Bốn kiểu RPC của gRPC: unary, server streaming, client streaming, bidirectional</title>
  <desc id="d3">Unary là một request một response. Server streaming là một request nhiều response. Client streaming là nhiều request một response. Bidirectional là nhiều request và nhiều response độc lập hai chiều.</desc>
  <defs>
    <marker id="a3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker>
  </defs>
  <g font-size="10.5" fill="currentColor" stroke="currentColor">
    <text x="90" y="20" text-anchor="middle" stroke="none" font-weight="700" fill="currentColor">Unary</text>
    <rect x="20" y="30" width="60" height="22" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke-opacity="0.18"/>
    <text x="50" y="45" text-anchor="middle" stroke="none" font-size="9">client</text>
    <rect x="100" y="30" width="60" height="22" rx="5" fill="#10b981" fill-opacity="0.16" stroke-opacity="0.18"/>
    <text x="130" y="45" text-anchor="middle" stroke="none" font-size="9">server</text>
    <line x1="80" y1="70" x2="100" y2="70" stroke-opacity="0.6" marker-end="url(#a3)"/>
    <line x1="100" y1="90" x2="80" y2="90" stroke-opacity="0.6" marker-end="url(#a3)"/>
    <text x="90" y="112" text-anchor="middle" stroke="none" font-size="9" opacity="0.65">1 req → 1 resp</text>
  </g>
  <g font-size="10.5" fill="currentColor" stroke="currentColor">
    <text x="270" y="20" text-anchor="middle" stroke="none" font-weight="700" fill="currentColor">Server streaming</text>
    <rect x="200" y="30" width="60" height="22" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke-opacity="0.18"/>
    <text x="230" y="45" text-anchor="middle" stroke="none" font-size="9">client</text>
    <rect x="280" y="30" width="60" height="22" rx="5" fill="#10b981" fill-opacity="0.16" stroke-opacity="0.18"/>
    <text x="310" y="45" text-anchor="middle" stroke="none" font-size="9">server</text>
    <line x1="260" y1="66" x2="280" y2="66" stroke-opacity="0.6" marker-end="url(#a3)"/>
    <line x1="280" y1="84" x2="260" y2="84" stroke-opacity="0.6" marker-end="url(#a3)"/>
    <line x1="280" y1="98" x2="260" y2="98" stroke-opacity="0.6" marker-end="url(#a3)"/>
    <line x1="280" y1="112" x2="260" y2="112" stroke-opacity="0.6" marker-end="url(#a3)"/>
    <text x="270" y="132" text-anchor="middle" stroke="none" font-size="9" opacity="0.65">1 req → nhiều resp</text>
  </g>
  <g font-size="10.5" fill="currentColor" stroke="currentColor">
    <text x="450" y="20" text-anchor="middle" stroke="none" font-weight="700" fill="currentColor">Client streaming</text>
    <rect x="380" y="30" width="60" height="22" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke-opacity="0.18"/>
    <text x="410" y="45" text-anchor="middle" stroke="none" font-size="9">client</text>
    <rect x="460" y="30" width="60" height="22" rx="5" fill="#10b981" fill-opacity="0.16" stroke-opacity="0.18"/>
    <text x="490" y="45" text-anchor="middle" stroke="none" font-size="9">server</text>
    <line x1="440" y1="66" x2="460" y2="66" stroke-opacity="0.6" marker-end="url(#a3)"/>
    <line x1="440" y1="80" x2="460" y2="80" stroke-opacity="0.6" marker-end="url(#a3)"/>
    <line x1="440" y1="94" x2="460" y2="94" stroke-opacity="0.6" marker-end="url(#a3)"/>
    <line x1="460" y1="112" x2="440" y2="112" stroke-opacity="0.6" marker-end="url(#a3)"/>
    <text x="450" y="132" text-anchor="middle" stroke="none" font-size="9" opacity="0.65">nhiều req → 1 resp</text>
  </g>
  <g font-size="10.5" fill="currentColor" stroke="currentColor">
    <text x="630" y="20" text-anchor="middle" stroke="none" font-weight="700" fill="currentColor">Bidirectional</text>
    <rect x="560" y="30" width="60" height="22" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke-opacity="0.18"/>
    <text x="590" y="45" text-anchor="middle" stroke="none" font-size="9">client</text>
    <rect x="640" y="30" width="60" height="22" rx="5" fill="#10b981" fill-opacity="0.16" stroke-opacity="0.18"/>
    <text x="670" y="45" text-anchor="middle" stroke="none" font-size="9">server</text>
    <line x1="620" y1="66" x2="640" y2="66" stroke-opacity="0.6" marker-end="url(#a3)"/>
    <line x1="640" y1="82" x2="620" y2="82" stroke-opacity="0.6" marker-end="url(#a3)"/>
    <line x1="620" y1="98" x2="640" y2="98" stroke-opacity="0.6" marker-end="url(#a3)"/>
    <line x1="640" y1="114" x2="620" y2="114" stroke-opacity="0.6" marker-end="url(#a3)"/>
    <text x="630" y="132" text-anchor="middle" stroke="none" font-size="9" opacity="0.65">hai chiều độc lập</text>
  </g>
  <line x1="20" y1="158" x2="700" y2="158" stroke="currentColor" stroke-opacity="0.15" stroke-dasharray="4 4"/>
  <text x="360" y="184" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">Cả 4 kiểu chạy trên cùng một stream HTTP/2 — streaming là first-class, không cần WebSocket hay SSE chắp vá</text>
  <text x="360" y="212" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">Chọn kiểu theo bản chất luồng dữ liệu: kết quả lớn/liên tục → server stream · gộp nhiều input → client stream · realtime hai chiều → bidi</text>
</svg>

**Server (Go)** — cài `Unary` và `Server streaming`:

```go
type orderServer struct {
    shopv1.UnimplementedOrderServiceServer   // forward-compat: rpc mới không vỡ build
    repo *Repo
}

// Unary
func (s *orderServer) GetOrder(ctx context.Context, req *shopv1.GetOrderRequest) (*shopv1.Order, error) {
    o, err := s.repo.Find(ctx, req.GetId())
    if errors.Is(err, ErrNotFound) {
        return nil, status.Errorf(codes.NotFound, "order %s không tồn tại", req.GetId())
    }
    if err != nil {
        return nil, status.Error(codes.Internal, "lỗi nội bộ")   // KHÔNG leak chi tiết
    }
    return o, nil
}

// Server streaming: đẩy nhiều event qua stream.Send()
func (s *orderServer) WatchOrders(req *shopv1.WatchOrdersRequest, stream shopv1.OrderService_WatchOrdersServer) error {
    events := s.repo.Subscribe(req.GetCustomerId())
    for ev := range events {
        if err := stream.Send(ev); err != nil {   // client ngắt → err, thoát vòng lặp
            return err
        }
        if stream.Context().Err() != nil {         // deadline/cancel từ client
            return stream.Context().Err()
        }
    }
    return nil
}
```

**Client streaming** (server nhận nhiều, trả một khi client gọi `CloseAndRecv`):

```go
func (s *orderServer) ImportOrders(stream shopv1.OrderService_ImportOrdersServer) error {
    var imported, failed uint32
    for {
        order, err := stream.Recv()
        if err == io.EOF {                                   // client đã gửi xong
            return stream.SendAndClose(&shopv1.ImportSummary{Imported: imported, Failed: failed})
        }
        if err != nil {
            return err
        }
        if s.repo.Save(stream.Context(), order) == nil { imported++ } else { failed++ }
    }
}
```

**Client (Go)** gọi unary với deadline, và đọc server stream:

```go
conn, _ := grpc.NewClient("orders.internal:50051", grpc.WithTransportCredentials(creds))
defer conn.Close()
client := shopv1.NewOrderServiceClient(conn)

// Unary + deadline (xem mục 6)
ctx, cancel := context.WithTimeout(context.Background(), 300*time.Millisecond)
defer cancel()
order, err := client.GetOrder(ctx, &shopv1.GetOrderRequest{Id: "o_42"})

// Đọc server stream tới khi EOF
stream, _ := client.WatchOrders(ctx, &shopv1.WatchOrdersRequest{CustomerId: "c_7"})
for {
    ev, err := stream.Recv()
    if err == io.EOF { break }
    if err != nil { log.Fatal(err) }
    fmt.Println(ev.GetChange(), ev.GetOrder().GetId())
}
```

**Client ở ngôn ngữ khác** (Python) — cùng `.proto`, khớp hoàn toàn:

```python
import grpc
from shop.v1 import order_pb2, order_pb2_grpc

with grpc.insecure_channel("orders.internal:50051") as channel:
    stub = order_pb2_grpc.OrderServiceStub(channel)
    order = stub.GetOrder(order_pb2.GetOrderRequest(id="o_42"), timeout=0.3)  # 300ms deadline
    print(order.status)
```

## 6. Deadline, metadata, interceptor, error model

Bốn cơ chế biến gRPC từ "RPC nhanh" thành "RPC vận hành được ở production".

### Deadline & timeout propagation

Khác REST (mỗi hop tự đặt timeout riêng), gRPC truyền **deadline tuyệt đối** đi kèm request xuống toàn bộ chuỗi gọi. Nếu A cho B 300ms, B gọi C thì C **thừa hưởng phần thời gian còn lại** — hết hạn thì mọi hop cùng huỷ, không còn ai làm việc vô ích cho một request đã chết. Đây là vũ khí chống **cascading failure**: server quá tải sẽ thấy deadline đã qua và bỏ request thay vì chất đống.

```go
// A đặt deadline; ctx này truyền tự nhiên khi A gọi tiếp C
ctx, cancel := context.WithTimeout(context.Background(), 300*time.Millisecond)
defer cancel()
resp, err := client.GetOrder(ctx, req)
if status.Code(err) == codes.DeadlineExceeded {
    // trả cache/degraded thay vì treo
}
```

> ⚠️ Bẫy production: **luôn** đặt deadline ở phía client. Mặc định không có deadline nghĩa là một downstream treo có thể giữ goroutine/thread và connection vô thời hạn, kéo sập cả service. Deadline là bắt buộc, không phải tuỳ chọn.

### Metadata: header của gRPC

Metadata là các cặp key-value đi kèm RPC (tương đương HTTP header) — dùng cho auth token, trace id, tenant id:

```go
// Client gắn metadata
ctx = metadata.AppendToOutgoingContext(ctx, "authorization", "Bearer "+token, "x-tenant", "acme")
// Server đọc
md, _ := metadata.FromIncomingContext(ctx)
token := md.Get("authorization")
```

### Interceptor = middleware

Interceptor bọc quanh mọi RPC để làm cross-cutting concern (auth, logging, metrics, retry) một lần cho tất cả method — đúng vai trò middleware trong REST:

```go
func AuthInterceptor(ctx context.Context, req any, info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler) (any, error) {
    md, _ := metadata.FromIncomingContext(ctx)
    if !validToken(md.Get("authorization")) {
        return nil, status.Error(codes.Unauthenticated, "token không hợp lệ")
    }
    start := time.Now()
    resp, err := handler(ctx, req)                       // gọi handler thật
    metrics.Observe(info.FullMethod, time.Since(start), status.Code(err))
    return resp, err
}
// server := grpc.NewServer(grpc.ChainUnaryInterceptor(AuthInterceptor, RecoveryInterceptor))
```

### Error model: status code, không phải HTTP 4xx/5xx

gRPC có bộ **status code riêng** (khoảng 17 mã), giàu ngữ nghĩa hơn HTTP và độc lập với transport. Trả lỗi đúng mã để client quyết định retry hay không:

| gRPC code | Ý nghĩa | Client nên |
|---|---|---|
| `OK` | Thành công | — |
| `INVALID_ARGUMENT` | Input sai (client bug) | Không retry, sửa input |
| `NOT_FOUND` | Không tồn tại | Không retry |
| `ALREADY_EXISTS` | Trùng (unique violation) | Không retry |
| `PERMISSION_DENIED` / `UNAUTHENTICATED` | Không quyền / chưa auth | Refresh token hoặc dừng |
| `DEADLINE_EXCEEDED` | Hết hạn | Retry có backoff nếu idempotent |
| `RESOURCE_EXHAUSTED` | Rate limit / hết quota | Retry có backoff, tôn trọng delay |
| `UNAVAILABLE` | Server tạm chết (rất hay gặp) | Retry với backoff — thường an toàn |
| `FAILED_PRECONDITION` | Trạng thái không cho phép | Không retry mù |
| `INTERNAL` | Lỗi server | Không leak chi tiết ra client |

Chi tiết lỗi có cấu trúc gửi qua `google.rpc.Status` details (vd `BadRequest.FieldViolation` cho từng field sai) — client đọc máy được thay vì parse chuỗi.

## 7. gRPC vs REST/JSON vs GraphQL: chọn cái nào

Không có "cái tốt hơn" — chỉ có "hợp consumer nào":

| | gRPC | REST/JSON | GraphQL |
|---|---|---|---|
| Contract | `.proto`, codegen, strict | OpenAPI (tuỳ chọn), lỏng hơn | SDL schema, strict |
| Payload | Binary Protobuf (nhỏ, nhanh) | Text JSON (to, dễ đọc) | JSON (client chọn field) |
| Transport | HTTP/2 bắt buộc | HTTP/1.1 hoặc 2 | Thường `POST /graphql` |
| Streaming | 4 kiểu, first-class | SSE/WebSocket chắp vá | Subscriptions (WS) |
| Browser | Cần gRPC-Web + proxy | Native | Native |
| Debug | Cần `grpcurl`/reflection | `curl` được ngay | GraphiQL |
| Over/under-fetch | Cố định theo message | Dễ over-fetch | Client chọn đúng field |
| Điểm mạnh nhất | Service-to-service, low latency, streaming | Public API, cache/CDN, ai cũng gọi được | Nhiều client cần data shape khác nhau |

Quy tắc thực dụng:
- **gRPC cho east-west** (nội bộ, service-to-service): RPS cao, cần độ trễ thấp, cần streaming, các team kiểm soát cả hai đầu.
- **REST cho north-south** (edge, public): browser gọi trực tiếp, third-party tích hợp, cần cache HTTP/CDN, cần `curl` để debug.
- **GraphQL** khi nhiều loại frontend cần các hình dạng dữ liệu khác nhau từ một backend (BFF/aggregation).

Kiến trúc phổ biến gộp cả ba: **REST/GraphQL ở edge → dịch xuống gRPC giữa các microservice nội bộ**.

> 💡 Ghi nhớ: đừng ép gRPC ra tới browser vì "nhanh". Browser không nói HTTP/2 trailer thô nên phải dùng **gRPC-Web** kèm proxy (Envoy) dịch sang — thêm hạ tầng, mất một phần streaming (client/bidi streaming bị giới hạn). Nếu consumer là browser/public, REST hoặc GraphQL gần như luôn đúng hơn.

## Tóm tắt

- **Protobuf** là IDL: `.proto` định nghĩa `message`/`service`, serialize **binary** theo tag (field number + wire type) — nhỏ và parse nhanh hơn JSON nhiều, đổi lại không self-describing (phải có schema).
- **Field number là bất biến**: thêm field an toàn, đổi tên an toàn, nhưng **không bao giờ** đổi số hay tái dùng số đã xoá — luôn `reserved`. Đó là nền tảng của schema evolution backward/forward compatible.
- **gRPC = HTTP/2**: multiplexing (nhiều stream/1 connection), binary framing (nền cho streaming), HPACK nén header — hiệu năng và streaming mà HTTP/1.1 không có.
- **Codegen** sinh stub client/server đa ngôn ngữ từ cùng một `.proto` → contract-first, không lệch hợp đồng.
- **4 kiểu RPC**: unary, server streaming, client streaming, bidirectional — streaming là first-class.
- **Vận hành**: luôn đặt **deadline** (propagation chống cascading failure), dùng **metadata** cho auth/trace, **interceptor** cho middleware, và **status code** đúng ngữ nghĩa để client retry chuẩn.
- **Chọn transport theo consumer**: gRPC cho nội bộ/low-latency/streaming; REST cho public/browser/cache; GraphQL cho BFF nhiều client. Không có cái "xịn nhất".

> Bài tiếp theo: service mesh & mTLS — làm sao vận hành hàng trăm kết nối gRPC nội bộ với load balancing, retry, và bảo mật mà không nhét hết logic đó vào từng service.
