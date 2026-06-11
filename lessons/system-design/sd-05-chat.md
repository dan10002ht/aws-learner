# Case study: Chat / Messaging realtime

Chat là bài tập "thử lửa" kinh điển vì nó ép bạn đối mặt với thứ mà CRUD web bình thường né được: **server phải chủ động đẩy dữ liệu xuống client** (server push), kết nối phải **sống lâu** (long-lived), và hệ thống phải **stateful** ở tầng connection. Mọi quyết định ở đây đều là đánh đổi — không có kiến trúc "đúng", chỉ có kiến trúc phù hợp với ràng buộc của bạn.

> 💡 Nguyên tắc: Trước khi vẽ box, hãy hỏi quy mô. Một app chat 10K user nội bộ công ty và một WhatsApp 2 tỷ user là **hai bài toán khác nhau hoàn toàn**. Đừng thiết kế Kafka + 5 tầng cache cho 10K user.

---

## 1. Requirements — làm rõ trước khi vẽ

Trong phỏng vấn, 5 phút đầu mà lao vào vẽ kiến trúc là trượt. Hỏi để cắt scope.

**Functional:**
- 1-1 chat (hai người) và **group chat** (giả sử tối đa N người/group — con số này quan trọng, sẽ quay lại ở phần fan-out).
- Gửi/nhận tin nhắn **realtime** (độ trễ cảm nhận < 200ms khi cùng online).
- **Online status / presence** (đang online / offline / last seen).
- **Delivery receipt**: đã gửi (sent) → đã nhận tới server → đã giao tới máy người nhận (delivered) → đã đọc (read).
- Lưu **lịch sử** tin nhắn, kéo lại được khi mở app.
- **Push notification** khi người nhận offline.

**Non-functional (đây mới là nơi phân loại kỹ sư):**
- Độ trễ thấp, **highly available** (chat sập là thảm hoạ trải nghiệm).
- **Consistency**: với tin nhắn, ta chấp nhận eventual consistency về mặt hiển thị ở các thiết bị, nhưng **không được mất tin** và **thứ tự trong một cuộc hội thoại phải ổn định**.
- Durable: tin đã gửi không được biến mất.

> ⚠️ Bẫy thiết kế: Đừng hứa "global total ordering" cho mọi tin nhắn của cả hệ thống. Bạn chỉ cần **thứ tự nhất quán trong phạm vi một conversation**. Hứa nhiều hơn = tự đào hố scale.

**Khoanh vùng câu hỏi cần hỏi interviewer:** DAU bao nhiêu? Group tối đa bao nhiêu người? Có cần media (ảnh/video) không? Có cần end-to-end encryption không? (E2EE thay đổi rất nhiều thứ — thường để sau.)

---

## 2. Capacity estimation — con số định hình kiến trúc

Giả sử:
- **50 triệu DAU**.
- Mỗi user gửi trung bình **40 tin/ngày**.

```
Tin/ngày      = 50e6 * 40            = 2e9 tin/ngày
Tin/giây (TB) = 2e9 / 86400          ≈ 23,000 msg/s
Peak (x3)     ≈ 70,000 msg/s
```

Lưu trữ (mỗi tin ~ metadata + text ~ 300 bytes):
```
Mỗi ngày  = 2e9 * 300 bytes         = 600 GB/ngày
Mỗi năm   ≈ 600 GB * 365            ≈ 220 TB/năm (chưa nhân replication)
```

Connection (đây là con số "đắt" nhất của chat):
```
Giả sử 10% DAU online đồng thời lúc peak = 5 triệu kết nối WebSocket mở cùng lúc.
Một node giữ ~ 50,000–100,000 kết nối (thực tế, phụ thuộc tuning).
=> cần ~ 50–100 connection node CHỈ để giữ kết nối.
```

> 💡 Nguyên tắc: Con số 5 triệu connection đồng thời là lý do tầng connection phải tách riêng khỏi tầng business logic. Bạn scale "chỗ giữ kết nối" độc lập với "chỗ xử lý tin".

---

## 3. WebSocket vs Long Polling — chọn transport

Vấn đề cốt lõi: HTTP là client-hỏi-server-trả. Chat cần server **chủ động đẩy**. Có mấy lựa chọn:

| Cách | Cơ chế | Độ trễ | Tải server | Khi nào dùng |
|------|--------|--------|-----------|--------------|
| **Short polling** | Client hỏi mỗi X giây | Cao (tới X giây) | Lãng phí (nhiều request rỗng) | Prototype, traffic thấp |
| **Long polling** | Client hỏi, server **giữ** request đến khi có data | Trung bình | Vẫn tốn (mở/đóng liên tục) | Fallback khi WS bị chặn |
| **SSE (Server-Sent Events)** | Server đẩy 1 chiều qua HTTP | Thấp | Nhẹ | Khi chỉ cần **nhận** (feed, notification) |
| **WebSocket** | Kết nối 2 chiều, full-duplex, persistent | Thấp nhất | Nhẹ khi idle, nhưng **stateful** | Chat thực thụ |

**Kết luận:** dùng **WebSocket** làm chính, **long polling làm fallback** (mạng doanh nghiệp / proxy đôi khi chặn WS). SSE không đủ vì chat cần gửi 2 chiều.

```
Long polling:                       WebSocket:
client --req--> server              client <===handshake===> server
       (server giữ...)                       (1 kết nối, 2 chiều)
client <--resp-- server             client <----msg-------- server
client --req--> server (lặp lại)    client ----msg--------> server
```

> ⚠️ Bẫy thiết kế: WebSocket biến server thành **stateful** — kết nối "thuộc về" một node cụ thể. Đây là gốc rễ của mọi khó khăn scale phía dưới. Long polling thì stateless hơn nhưng tốn CPU vì đóng/mở liên tục.

---

## 4. API design

Chat không thuần REST vì có kênh realtime. Tách làm hai loại:

**REST (request/response truyền thống) — qua HTTP:**
```
POST /v1/conversations                 # tạo conversation (1-1 hoặc group)
GET  /v1/conversations/{id}/messages   # phân trang lịch sử, ?before=<msgId>&limit=50
POST /v1/conversations/{id}/members    # thêm thành viên group
GET  /v1/users/{id}/presence           # lấy presence
```

**WebSocket (realtime) — các "frame" trên kết nối WS:**
```
// client -> server
{ "type": "SEND",   "convId": "c123", "clientMsgId": "uuid-A", "text": "hi" }
{ "type": "ACK",    "msgId": "m789" }            // client báo đã nhận
{ "type": "TYPING", "convId": "c123" }

// server -> client
{ "type": "MESSAGE", "msgId": "m789", "convId": "c123", "senderId": "u1",
  "seq": 4521, "text": "hi", "ts": 1718000000 }
{ "type": "DELIVERED", "msgId": "m789" }
{ "type": "PRESENCE",  "userId": "u2", "status": "online" }
```

> 💡 Nguyên tắc: `clientMsgId` (UUID do client sinh) là chìa khoá cho **idempotency**. Client retry gửi lại cùng `clientMsgId`, server nhận ra trùng và không tạo tin nhân đôi. Đây là chi tiết nhỏ nhưng "phân biệt người đã từng làm thật".

---

## 5. High-level design

```
                          ┌─────────────────────────┐
   client (WS) ───────────┤   Load Balancer (L4/L7)  │
   client (WS) ───────────┤   (route theo userId)    │
                          └────────────┬─────────────┘
                                       │
                     ┌─────────────────┴──────────────────┐
                     │        CONNECTION / GATEWAY tier    │
                     │  (chỉ giữ WS, không chứa logic)     │
                     │  node-1   node-2   ...   node-N     │
                     └───┬─────────────┬──────────────┬────┘
                         │             │              │
        ┌────────────────┼─────────────┼──────────────┼─────────┐
        │           Pub/Sub bus (Redis pub/sub / Kafka)         │
        └────┬───────────────┬───────────────┬─────────────┬────┘
             │               │               │             │
       ┌─────┴────┐   ┌──────┴─────┐  ┌──────┴─────┐  ┌─────┴──────┐
       │  Chat    │   │ Presence   │  │  History   │  │   Push     │
       │  service │   │  service   │  │  store     │  │  (offline) │
       └────┬─────┘   └─────┬──────┘  └──────┬─────┘  └─────┬──────┘
            │               │                │              │
      message queue    Redis (TTL)      DB (sharded)    APNs / FCM
```

Luồng gửi một tin 1-1 (A → B):
1. A gửi frame `SEND` qua WS tới **node giữ kết nối của A**.
2. Node forward sang **Chat service**: gán `msgId` + `seq`, ghi vào **history store** (durable), kiểm `clientMsgId` để idempotent.
3. Tra **Connection registry**: B đang giữ ở node nào? (lưu trong Redis: `userId -> nodeId`).
4. Publish tin lên **pub/sub**; node của B subscribe và **đẩy frame `MESSAGE`** xuống B.
5. Nếu B offline → đẩy sang **Push service** (APNs/FCM).
6. B nhận, gửi `ACK` → server gửi `DELIVERED` về cho A.

---

## 6. Deep dive

### 6.1. Connection layer: sticky vs stateless + pub/sub

Vì WS stateful, một tin gửi cho B phải tới **đúng node đang giữ B**. Hai trường phái:

| | **Sticky (session affinity)** | **Stateless gateway + pub/sub** |
|---|---|---|
| Cơ chế | LB ghim user vào 1 node; node biết user nào của mình | Gateway chỉ giữ WS; routing qua registry + pub/sub |
| Tìm node của B | Cần **registry** (`userId -> nodeId` trong Redis) | Như trên — registry là bắt buộc |
| Node chết | Mọi connection trên node đó **rớt**, client reconnect | Tương tự, nhưng tin đang bay đã nằm trong queue/store |
| Mở rộng | Khó rebalance khi thêm node | Dễ hơn, gateway "ngu" và đồng nhất |
| Độ phức tạp | Thấp lúc đầu, đau khi scale | Cao hơn lúc đầu, bền khi scale |

**Lựa chọn thực tế:** gateway giữ WS + một **Connection Registry** (Redis) ánh xạ `userId -> nodeId`, và một **pub/sub** để node-của-A nói chuyện với node-của-B mà không cần biết nhau trực tiếp.

```
A ở node-1, B ở node-7. node-1 KHÔNG kết nối trực tiếp node-7.
node-1 --publish(channel: node-7)--> [pub/sub] --> node-7 --push--> B
        (tra registry: B -> node-7)
```

> ⚠️ Bẫy thiết kế: Đừng cho các connection node **kết nối mesh trực tiếp** với nhau (N node → N² kết nối). Pub/sub là tầng gián tiếp giúp tránh nổ N². Nhưng nhớ: registry và pub/sub trở thành điểm phụ thuộc nóng — phải HA.

### 6.2. Message ordering & delivery semantics

**Ordering:** chỉ cần thứ tự **trong một conversation**, không cần global. Cách phổ biến: mỗi conversation có một **bộ đếm seq tăng dần** (per-conversation sequence number). Server gán `seq` khi ghi tin; client sort theo `seq`. Không dựa vào wall-clock timestamp để sắp xếp (đồng hồ các server lệch nhau).

**Delivery semantics:** thực tế chọn **at-least-once** + **idempotency**, không cố đạt exactly-once (rất đắt/khó trong hệ phân tán).

```
Exactly-once  = ảo tưởng tốn kém (cần 2-phase commit, consensus...)
At-most-once  = chấp nhận mất tin (KHÔNG được với chat)
At-least-once = có thể giao trùng -> KHỬ TRÙNG bằng idempotency key
```

Khử trùng bằng `clientMsgId`: client dedupe khi hiển thị; server dedupe khi ghi (unique index trên `(convId, clientMsgId)`).

> 💡 Nguyên tắc: "At-least-once + idempotent consumer" là công thức kinh điển của hệ phân tán. Bạn thiết kế để **thà giao trùng còn hơn mất**, rồi dùng key để dọn trùng. Nói được câu này trong phỏng vấn là điểm cộng lớn.

### 6.3. Lưu lịch sử — sharding theo conversation

Mẫu truy cập: "lấy 50 tin gần nhất của conversation X, phân trang ngược". Đây là **partition key = conversationId**, **sort key = seq (hoặc msgId tăng dần)**.

```
PK: convId        SK: seq (desc)
c123#  -> [seq:4521 "hi", seq:4520 "...", ...]
```

| Sharding theo | Ưu | Nhược |
|---------------|-----|-------|
| **conversationId** (nên dùng) | Mọi tin của 1 cuộc hội thoại nằm cùng shard → đọc lịch sử 1 lần truy vấn | Group siêu lớn / siêu active tạo **hot shard** |
| userId | Inbox của user gọn | Một conversation bị xé ra nhiều shard, đọc lịch sử phải gather |

Chọn **conversationId** vì truy vấn chính là theo conversation. Xử lý hot shard (group khổng lồ) bằng cách tách thành sub-partition theo khoảng thời gian (`convId#202406`).

> ⚠️ Bẫy thiết kế: 220 TB/năm và tăng mãi. Tin cũ ít được đọc → **tiering**: tin nóng (gần đây) trên store nhanh/đắt, tin nguội archive sang object storage rẻ. Đừng giữ tất cả trong DB nóng đắt tiền mãi.

### 6.4. Presence (online status)

Presence vừa "to" vừa "nhiễu": user bật/tắt mạng liên tục. Đừng coi nó là dữ liệu durable.

- Lưu trong **Redis với TTL** (vd 30s). Client gửi **heartbeat** định kỳ → refresh TTL. Hết hạn không refresh = coi như offline.
- **Fan-out presence có chọn lọc**: chỉ đẩy presence của một user tới những người **đang mở cửa sổ chat với họ / trong danh bạ online**, không broadcast cho cả thế giới.

```
u2 online -> Redis SET presence:u2 = online EX 30
mỗi 10s u2 gửi heartbeat -> reset EX 30
mất mạng -> 30s sau key hết hạn -> presence service phát "u2 offline"
```

> ⚠️ Bẫy thiết kế: Presence dễ thành "fan-out bomb". Nếu mỗi lần một user online mà broadcast cho 5000 bạn, và hàng triệu user đổi trạng thái mỗi giây → sập. Giới hạn phạm vi fan-out và chấp nhận presence hơi trễ (eventual).

### 6.5. Push notification (offline)

Nếu B offline (không có WS), tin phải tới qua hệ điều hành:
- Server gửi tới **APNs (iOS)** / **FCM (Android)**.
- Lưu tin vào **offline inbox** của B; khi B online lại, sync các tin "đã giao tới server nhưng chưa giao tới máy" theo `seq` lớn hơn lần cuối B nhận.

### 6.6. Group fan-out

1-1 thì fan-out tới 1 người. Group là chỗ kiến trúc dễ vỡ.

| Chiến lược | Cơ chế | Hợp với |
|-----------|--------|---------|
| **Write fan-out** | Ghi 1 lần vào conversation, **đẩy realtime** tới N member đang online qua pub/sub | Group nhỏ–vừa (N ≤ vài trăm) |
| **Read fan-out** | Ghi 1 lần; client **chủ động pull** khi mở | Group rất lớn (broadcast channel) |
| **Hybrid** | Member active → push; member ít hoạt động → pull | WhatsApp/Slack-scale |

Với group N người: một tin sinh ra **N lần delivery**. Group 1000 người, một tin = 1000 lần đẩy + 1000 receipt. Đây là lý do phải đặt **giới hạn N** (vd group thường ≤ 256, "channel" lớn hơn thì chuyển sang mô hình pull/broadcast khác).

```
A gửi vào group G (1000 member):
  ghi 1 tin (seq) -> tra ai đang online -> publish tới các node giữ họ
  -> mỗi node đẩy xuống các member của mình
  member offline -> đẩy vào inbox + push
```

> 💡 Nguyên tắc: Read receipt trong group **đắt gấp bội** số tin. Thường gộp/đếm thay vì hiển thị từng người ("đã xem bởi 87 người") để cắt fan-out của riêng receipt.

---

## 7. Bottleneck & Scale — đi từ đâu vỡ trước

| Bottleneck | Triệu chứng | Cách giải |
|-----------|------------|----------|
| Connection node quá tải | Số WS/node chạm trần, RAM cạn | Thêm node, scale ngang tầng gateway độc lập |
| Pub/sub thành nghẽn cổ chai | Latency tăng khi nhiều fan-out | Partition theo conversation; nâng từ Redis pub/sub lên Kafka khi cần durable + throughput cao |
| Hot conversation/shard | 1 group viral nuốt 1 shard | Sub-partition theo thời gian; cache; rate-limit |
| Presence fan-out | CPU Redis tăng vọt | Thu hẹp phạm vi fan-out, tăng TTL, debounce |
| History store đọc chậm | Query lịch sử trễ | Cache trang gần nhất; index `(convId, seq)`; tiering |

**Trình tự scale thực tế:** (1) tách connection tier khỏi logic → (2) thêm registry + pub/sub → (3) shard history theo conversation → (4) tách presence ra Redis riêng → (5) hybrid fan-out cho group lớn.

> ⚠️ Bẫy thiết kế: Đừng nhảy thẳng tới Kafka + Cassandra + global multi-region ngay câu đầu. Interviewer muốn thấy bạn **scale theo nhu cầu** và giải thích *vì sao* mỗi bước, không phải đọc tên công nghệ.

---

## 8. Cách trình bày khi phỏng vấn / review

- **Mở bằng requirements + estimation**, viết con số ra bảng. Con số biện minh cho mọi quyết định sau đó.
- Nói rõ ràng buộc tự đặt: "Tôi giả định group ≤ 256, không E2EE — nếu cần tôi sẽ điều chỉnh."
- Khi đụng quyết định, **luôn nêu 2-3 phương án + đánh đổi rồi mới chọn**. Câu thần chú: *"Tôi chọn X vì nó tối ưu cho [ràng buộc Y], đổi lại chấp nhận [chi phí Z]."*
- Chủ động chỉ ra **điểm vỡ** trước khi bị hỏi: "Chỗ này sẽ nghẽn khi hot conversation, tôi sẽ sub-partition."
- Phân biệt rạch ròi **what** (giữ thứ tự trong conversation) với **how** (per-conversation seq) — đừng lẫn lộn yêu cầu và giải pháp.
- Khi review thiết kế của người khác: hỏi "delivery semantics là gì?", "node chết thì tin đang bay đi đâu?", "presence fan-out giới hạn thế nào?" — đó là các câu lộ ra hệ thống có được nghĩ kỹ chưa.

---

## 9. Liên hệ sang AWS

Không phải để "AWS hoá" mọi thứ, mà để thấy managed service nào lấp vào vai trò nào — và đánh đổi managed vs tự vận hành.

| Vai trò trong thiết kế | Dịch vụ AWS | Ghi chú đánh đổi |
|------------------------|-------------|------------------|
| **Connection tier (WebSocket)** | **API Gateway WebSocket API** | Quản lý sẵn handshake, route `$connect`/`$disconnect`/`$default`, `connectionId`. Đỡ tự vận hành fleet WS, nhưng có giới hạn (idle timeout ~10 phút, message ≤ 128KB) và tính tiền theo connection-minute + message. Tự host (ALB + EC2/ECS giữ WS) linh hoạt hơn nhưng phải tự lo scale & registry. |
| **Connection registry & presence** | **ElastiCache (Redis)** | `connectionId -> userId`, presence với TTL, pub/sub giữa các consumer. Latency thấp. Cần thiết kế HA (cluster mode, replica). |
| **History store (sharded)** | **DynamoDB** | PK=`convId`, SK=`seq/msgId`. Scale ngang tự nhiên, single-digit ms. Dùng **TTL** cho tin tạm; **DynamoDB Streams** để fan-out / đẩy push. Coi chừng hot partition với group lớn. |
| **Fan-out / push trigger** | **SNS** (+ **SQS**) | SNS fan-out tới nhiều subscriber; tích hợp **mobile push** tới APNs/FCM. SQS làm offline queue / decouple consumer (at-least-once → idempotent). |
| **Business logic** | **Lambda** hoặc **ECS/Fargate** | Lambda hợp event-driven (mỗi message một invocation) nhưng cold start & kém stateful; Fargate hợp khi cần luồng/kết nối dài. |
| **Archive tin nguội** | **S3** (+ lifecycle) | Tiering tin cũ rời DynamoDB sang S3 cho rẻ. |

```
Mobile ──WS──> API Gateway (WebSocket) ──> Lambda/Fargate (chat svc)
                                              │   │        │
                              ElastiCache(Redis) DynamoDB  SNS ──> APNs/FCM
                              (registry+presence) (history) (push offline)
```

> 💡 Nguyên tắc: Chọn managed service không phải vì "AWS có sẵn", mà vì nó cắt **operational toil** ở chỗ bạn không có lợi thế cạnh tranh (giữ WebSocket, push fan-out). Nhưng luôn biết **giới hạn** của nó (idle timeout, message size, hot partition) — đó là nơi cuộc nói chuyện "managed vs self-hosted" thực sự diễn ra, và là tư duy của một Solutions Architect cấp cao.
