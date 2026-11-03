# Case study: Chat / Messaging realtime

Chat là bài tập "thử lửa" kinh điển vì nó ép bạn đối mặt với thứ mà CRUD web bình thường né được: **server phải chủ động đẩy dữ liệu xuống client** (server push), kết nối phải **sống lâu** (long-lived), và hệ thống phải **stateful** ở tầng connection. Mọi quyết định ở đây đều là đánh đổi — không có kiến trúc "đúng", chỉ có kiến trúc phù hợp với ràng buộc của bạn.

> Nguyên tắc: Trước khi vẽ box, hãy hỏi quy mô. Một app chat 10K user nội bộ công ty và một WhatsApp 2 tỷ user là **hai bài toán khác nhau hoàn toàn**. Đừng thiết kế Kafka + 5 tầng cache cho 10K user.

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

> Bẫy thiết kế: Đừng hứa "global total ordering" cho mọi tin nhắn của cả hệ thống. Bạn chỉ cần **thứ tự nhất quán trong phạm vi một conversation**. Hứa nhiều hơn = tự đào hố scale.

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

> Nguyên tắc: Con số 5 triệu connection đồng thời là lý do tầng connection phải tách riêng khỏi tầng business logic. Bạn scale "chỗ giữ kết nối" độc lập với "chỗ xử lý tin".

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

<ab-toggle data-labels="Long polling|WebSocket">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 470" role="img" aria-labelledby="sd05-med-lp-t sd05-med-lp-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="sd05-med-lp-t">Long polling</title>
<desc id="sd05-med-lp-d">Cùng trục thời gian đi xuống giữa client và server; request/response lặp lại hoặc một kết nối hai chiều.</desc>
<defs><marker id="sd05-med-lp-a" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="currentColor"/></marker></defs>
<rect x="40" y="20" width="120" height="45" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="100.0" y="45" text-anchor="middle" font-size="14" fill="currentColor">Client</text>
<line x1="100" y1="65" x2="100" y2="395" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="4 4"/>
<rect x="360" y="20" width="120" height="45" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="420.0" y="45" text-anchor="middle" font-size="14" fill="currentColor">Server</text>
<line x1="420" y1="65" x2="420" y2="395" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="4 4"/>
<text x="260" y="91" text-anchor="middle" font-size="14" fill="currentColor">Request 1</text><path d="M100 100 L420 100" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#sd05-med-lp-a)"/>
<text x="260" y="206" text-anchor="middle" font-size="14" fill="currentColor">Response · tin 1</text><path d="M420 215 L100 215" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#sd05-med-lp-a)"/>
<text x="260" y="241" text-anchor="middle" font-size="14" fill="currentColor">Request 2 · lặp lại</text><path d="M100 250 L420 250" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#sd05-med-lp-a)"/>
<text x="260" y="336" text-anchor="middle" font-size="14" fill="currentColor">Response · tin 2</text><path d="M420 345 L100 345" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#sd05-med-lp-a)"/>
<text x="260" y="376" text-anchor="middle" font-size="14" fill="currentColor">Request 3 · lặp lại</text><path d="M100 385 L420 385" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#sd05-med-lp-a)"/>
<text x="260" y="165" text-anchor="middle" font-size="14" fill="currentColor">Server giữ request…</text><text x="260" y="300" text-anchor="middle" font-size="14" fill="currentColor">Server giữ tiếp…</text>
<text x="260" y="425" text-anchor="middle" font-size="14" fill="currentColor">Nhiều vòng HTTP → thêm overhead, độ trễ.</text>
<text x="260" y="450" text-anchor="middle" font-size="13" fill="currentColor">Thời gian đi từ trên xuống</text>
</svg>
<ab-note>Server giữ request tới khi có data rồi trả; client phải mở request tiếp theo. Đây là fallback khi WebSocket bị chặn.</ab-note>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 470" role="img" aria-labelledby="sd05-med-ws-t sd05-med-ws-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="sd05-med-ws-t">WebSocket</title>
<desc id="sd05-med-ws-d">Cùng trục thời gian đi xuống giữa client và server; request/response lặp lại hoặc một kết nối hai chiều.</desc>
<defs><marker id="sd05-med-ws-a" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="currentColor"/></marker></defs>
<rect x="40" y="20" width="120" height="45" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="100.0" y="45" text-anchor="middle" font-size="14" fill="currentColor">Client</text>
<line x1="100" y1="65" x2="100" y2="395" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="4 4"/>
<rect x="360" y="20" width="120" height="45" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="420.0" y="45" text-anchor="middle" font-size="14" fill="currentColor">Server</text>
<line x1="420" y1="65" x2="420" y2="395" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="4 4"/>
<text x="260" y="91" text-anchor="middle" font-size="14" fill="currentColor">Handshake · 1 lần</text><path d="M100 100 L420 100" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#sd05-med-ws-a)"/>
<text x="260" y="131" text-anchor="middle" font-size="14" fill="currentColor">Upgrade thành công</text><path d="M420 140 L100 140" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#sd05-med-ws-a)"/>
<text x="260" y="206" text-anchor="middle" font-size="14" fill="currentColor">Tin 1 · server đẩy</text><path d="M420 215 L100 215" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#sd05-med-ws-a)"/>
<text x="260" y="271" text-anchor="middle" font-size="14" fill="currentColor">Tin 2 · client gửi</text><path d="M100 280 L420 280" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#sd05-med-ws-a)"/>
<text x="260" y="336" text-anchor="middle" font-size="14" fill="currentColor">Tin 3 · server đẩy</text><path d="M420 345 L100 345" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#sd05-med-ws-a)"/>
<text x="260" y="177" text-anchor="middle" font-size="13" fill="currentColor">Một kết nối persistent · full-duplex</text>
<text x="260" y="425" text-anchor="middle" font-size="14" fill="currentColor">Giữ kết nối → đẩy ngay; server stateful.</text>
<text x="260" y="450" text-anchor="middle" font-size="13" fill="currentColor">Thời gian đi từ trên xuống</text>
</svg>
<ab-note>Bắt tay một lần rồi gửi hai chiều trên cùng kết nối; connection node phải giữ state của socket.</ab-note>
</ab-toggle>

> Bẫy thiết kế: WebSocket biến server thành **stateful** — kết nối "thuộc về" một node cụ thể. Đây là gốc rễ của mọi khó khăn scale phía dưới. Long polling thì stateless hơn nhưng tốn CPU vì đóng/mở liên tục.

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

> Nguyên tắc: `clientMsgId` (UUID do client sinh) là chìa khoá cho **idempotency**. Client retry gửi lại cùng `clientMsgId`, server nhận ra trùng và không tạo tin nhân đôi. Đây là chi tiết nhỏ nhưng "phân biệt người đã từng làm thật".

---

## 5. High-level design

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Kiến trúc high-level hệ thống chat realtime</title>
  <desc>Client WS đi qua Load Balancer tới tầng Connection/Gateway chỉ giữ WebSocket; tầng này nối với pub/sub bus, từ đó tới các service Chat, Presence, History, Push, mỗi service gắn với message queue, Redis TTL, DB sharded và APNs/FCM.</desc>
  <g stroke="currentColor" stroke-opacity="0.4" fill="none" stroke-width="1.3">
    <line x1="120" y1="58" x2="280" y2="58"/>
    <line x1="120" y1="82" x2="280" y2="82"/>
    <line x1="360" y1="96" x2="360" y2="120"/>
    <line x1="200" y1="172" x2="200" y2="210"/>
    <line x1="360" y1="172" x2="360" y2="210"/>
    <line x1="520" y1="172" x2="520" y2="210"/>
    <line x1="150" y1="262" x2="150" y2="300"/>
    <line x1="290" y1="262" x2="290" y2="300"/>
    <line x1="430" y1="262" x2="430" y2="300"/>
    <line x1="570" y1="262" x2="570" y2="300"/>
    <line x1="150" y1="350" x2="150" y2="388"/>
    <line x1="290" y1="350" x2="290" y2="388"/>
    <line x1="430" y1="350" x2="430" y2="388"/>
    <line x1="570" y1="350" x2="570" y2="388"/>
  </g>
  <!-- clients -->
  <rect x="24" y="46" width="96" height="24" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="72" y="62" font-size="11" text-anchor="middle" fill="currentColor">client (WS)</text>
  <rect x="24" y="70" width="96" height="24" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="72" y="86" font-size="11" text-anchor="middle" fill="currentColor">client (WS)</text>
  <!-- LB -->
  <rect x="280" y="46" width="160" height="50" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="360" y="66" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Load Balancer (L4/L7)</text>
  <text x="360" y="83" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">route theo userId</text>
  <!-- gateway tier -->
  <rect x="120" y="120" width="480" height="52" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="360" y="139" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">CONNECTION / GATEWAY tier — chỉ giữ WS, không logic</text>
  <g font-size="10.5" fill="currentColor">
    <rect x="150" y="147" width="60" height="18" rx="5" fill="#10b981" fill-opacity="0.18"/><text x="180" y="160" text-anchor="middle">node-1</text>
    <rect x="222" y="147" width="60" height="18" rx="5" fill="#10b981" fill-opacity="0.18"/><text x="252" y="160" text-anchor="middle">node-2</text>
    <text x="320" y="160" text-anchor="middle" opacity="0.7">…</text>
    <rect x="350" y="147" width="60" height="18" rx="5" fill="#10b981" fill-opacity="0.18"/><text x="380" y="160" text-anchor="middle">node-N</text>
  </g>
  <!-- pub/sub bus -->
  <rect x="120" y="210" width="480" height="52" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="360" y="234" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Pub/Sub bus</text>
  <text x="360" y="251" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">Redis pub/sub / Kafka</text>
  <!-- services -->
  <g font-size="11" fill="currentColor">
    <rect x="98" y="300" width="104" height="50" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="150" y="322" font-weight="700" text-anchor="middle">Chat</text><text x="150" y="338" text-anchor="middle">service</text>
    <rect x="238" y="300" width="104" height="50" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="290" y="322" font-weight="700" text-anchor="middle">Presence</text><text x="290" y="338" text-anchor="middle">service</text>
    <rect x="378" y="300" width="104" height="50" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="430" y="322" font-weight="700" text-anchor="middle">History</text><text x="430" y="338" text-anchor="middle">store</text>
    <rect x="518" y="300" width="104" height="50" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="570" y="322" font-weight="700" text-anchor="middle">Push</text><text x="570" y="338" text-anchor="middle">(offline)</text>
  </g>
  <!-- backends -->
  <g font-size="10.5" fill="currentColor">
    <rect x="96" y="388" width="108" height="42" rx="7" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="150" y="405" text-anchor="middle">message</text><text x="150" y="420" text-anchor="middle">queue</text>
    <rect x="236" y="388" width="108" height="42" rx="7" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="290" y="405" text-anchor="middle">Redis</text><text x="290" y="420" text-anchor="middle">(TTL)</text>
    <rect x="376" y="388" width="108" height="42" rx="7" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="430" y="405" text-anchor="middle">DB</text><text x="430" y="420" text-anchor="middle">(sharded)</text>
    <rect x="516" y="388" width="108" height="42" rx="7" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="570" y="405" text-anchor="middle">APNs</text><text x="570" y="420" text-anchor="middle">/ FCM</text>
  </g>
</svg>

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

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 330" role="img" aria-labelledby="sd05-med-route2-t sd05-med-route2-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto">
<title id="sd05-med-route2-t">Định tuyến tin A tới B qua registry và pub/sub</title>
<desc id="sd05-med-route2-d">A nối node-1; node-1 tra registry B ở node-7, publish vào channel node-7; node-7 subscribe rồi push xuống B. Mỗi node chỉ xuất hiện một lần.</desc>
<defs><marker id="sd05-med-route2-a" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="currentColor"/></marker></defs>
<text x="360" y="32" text-anchor="middle" font-size="15" fill="currentColor">Không nối mesh trực tiếp node ↔ node (tránh N²)</text>
<circle cx="48" cy="135" r="23" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6" stroke-opacity="0.65"/><text x="48" y="140" text-anchor="middle" font-size="15" fill="currentColor">A</text>
<circle cx="666" cy="135" r="23" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6" stroke-opacity="0.65"/><text x="666" y="140" text-anchor="middle" font-size="15" fill="currentColor">B</text>
<rect x="130" y="110" width="100" height="50" rx="10" fill="#10b981" fill-opacity="0.14" stroke="#10b981" stroke-opacity="0.65"/>
<text x="180.0" y="135" text-anchor="middle" font-size="13" fill="currentColor">node-1</text>
<rect x="300" y="100" width="145" height="70" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6" stroke-opacity="0.65"/>
<text x="372.5" y="125" text-anchor="middle" font-size="13" fill="currentColor">Pub/sub</text>
<text x="372.5" y="143" text-anchor="middle" font-size="13" fill="currentColor">channel: node-7</text>
<rect x="515" y="110" width="100" height="50" rx="10" fill="#10b981" fill-opacity="0.14" stroke="#10b981" stroke-opacity="0.65"/>
<text x="565.0" y="135" text-anchor="middle" font-size="13" fill="currentColor">node-7</text>
<rect x="118" y="245" width="210" height="60" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b" stroke-opacity="0.65"/>
<text x="223.0" y="270" text-anchor="middle" font-size="13" fill="currentColor">Connection Registry</text>
<text x="223.0" y="288" text-anchor="middle" font-size="13" fill="currentColor">B → node-7</text>
<g data-step="1"><path d="M72 135 H126" fill="none" stroke="currentColor" stroke-width="1.7" marker-end="url(#sd05-med-route2-a)"/><text x="100" y="124" text-anchor="middle" font-size="13" fill="currentColor">WS</text></g>
<g data-step="2"><path d="M165 160 V240" fill="none" stroke="currentColor" stroke-width="1.7" marker-end="url(#sd05-med-route2-a)"/><path d="M200 245 V165" fill="none" stroke="currentColor" stroke-width="1.7" stroke-dasharray="4 3" marker-end="url(#sd05-med-route2-a)"/><text x="115" y="205" text-anchor="middle" font-size="13" fill="currentColor">Tra B?</text><text x="259" y="205" text-anchor="middle" font-size="13" fill="currentColor">B → node-7</text></g>
<g data-step="3"><path d="M230 135 H295" fill="none" stroke="currentColor" stroke-width="1.7" marker-end="url(#sd05-med-route2-a)"/><text x="265" y="124" text-anchor="middle" font-size="13" fill="currentColor">publish</text></g>
<g data-step="4"><path d="M445 135 H510" fill="none" stroke="currentColor" stroke-width="1.7" marker-end="url(#sd05-med-route2-a)"/><text x="480" y="124" text-anchor="middle" font-size="13" fill="currentColor">subscribe</text></g>
<g data-step="5"><path d="M615 135 H638" fill="none" stroke="currentColor" stroke-width="1.7" marker-end="url(#sd05-med-route2-a)"/><text x="642" y="99" text-anchor="middle" font-size="13" fill="currentColor">push</text></g>
</svg>
<step-note data-step="1">Socket của A thuộc node-1; node khác không thể dùng trực tiếp kết nối này.</step-note>
<step-note data-step="2">Tra registry để biết B đang ở node nào; mũi tên nét đứt là kết quả lookup.</step-note>
<step-note data-step="3">Publish lên kênh node-7 giúp node-1 không phải nối mesh trực tiếp tới mọi gateway.</step-note>
<step-note data-step="4">node-7 nhận từ kênh đã subscribe và tìm socket B cục bộ.</step-note>
<step-note data-step="5">Push frame xuống B hoàn tất chặng realtime. Registry và pub/sub cần HA.</step-note>
</step-flow>

> Bẫy thiết kế: Đừng cho các connection node **kết nối mesh trực tiếp** với nhau (N node → N² kết nối). Pub/sub là tầng gián tiếp giúp tránh nổ N². Nhưng nhớ: registry và pub/sub trở thành điểm phụ thuộc nóng — phải HA.

### 6.2. Message ordering & delivery semantics

**Ordering:** chỉ cần thứ tự **trong một conversation**, không cần global. Cách phổ biến: mỗi conversation có một **bộ đếm seq tăng dần** (per-conversation sequence number). Server gán `seq` khi ghi tin; client sort theo `seq`. Không dựa vào wall-clock timestamp để sắp xếp (đồng hồ các server lệch nhau).

**Delivery semantics:** thực tế chọn **at-least-once** + **idempotency**, không cố đạt exactly-once (rất đắt/khó trong hệ phân tán).

```
Exactly-once  = ảo tưởng tốn kém (cần 2-phase commit, consensus...)
At-most-once  = chấp nhận mất tin (KHÔNG được với chat)
At-least-once = có thể giao trùng -> KHỬ TRÙNG bằng idempotency key
```

Khử trùng bằng `clientMsgId`: client dedupe khi hiển thị; server dedupe khi ghi (unique index trên `(convId, clientMsgId)`).

> Nguyên tắc: "At-least-once + idempotent consumer" là công thức kinh điển của hệ phân tán. Bạn thiết kế để **thà giao trùng còn hơn mất**, rồi dùng key để dọn trùng. Nói được câu này trong phỏng vấn là điểm cộng lớn.

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

> Bẫy thiết kế: 220 TB/năm và tăng mãi. Tin cũ ít được đọc → **tiering**: tin nóng (gần đây) trên store nhanh/đắt, tin nguội archive sang object storage rẻ. Đừng giữ tất cả trong DB nóng đắt tiền mãi.

### 6.4. Presence (online status)

Presence vừa "to" vừa "nhiễu": user bật/tắt mạng liên tục. Đừng coi nó là dữ liệu durable.

- Lưu trong **Redis với TTL** (vd 30s). Client gửi **heartbeat** định kỳ → refresh TTL. Hết hạn không refresh = coi như offline.
- **Fan-out presence có chọn lọc**: chỉ đẩy presence của một user tới những người **đang mở cửa sổ chat với họ / trong danh bạ online**, không broadcast cho cả thế giới.

```
u2 online -> Redis SET presence:u2 = online EX 30
mỗi 10s u2 gửi heartbeat -> reset EX 30
mất mạng -> 30s sau key hết hạn -> presence service phát "u2 offline"
```

> Bẫy thiết kế: Presence dễ thành "fan-out bomb". Nếu mỗi lần một user online mà broadcast cho 5000 bạn, và hàng triệu user đổi trạng thái mỗi giây → sập. Giới hạn phạm vi fan-out và chấp nhận presence hơi trễ (eventual).

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Luồng fan-out tin nhắn trong group</title>
  <desc>A gửi vào group: ghi một tin có seq, tra ai online, publish tới các node đang giữ member; mỗi node đẩy xuống member của mình; member offline thì đưa vào inbox và gửi push.</desc>
  <g stroke="currentColor" fill="currentColor">
    <!-- step boxes flow left to right -->
    <rect x="16" y="40" width="120" height="56" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="76" y="62" font-size="11" font-weight="700" text-anchor="middle">A gửi vào</text>
    <text x="76" y="78" font-size="11" text-anchor="middle">group G</text>
    <rect x="172" y="40" width="120" height="56" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="232" y="62" font-size="11" font-weight="700" text-anchor="middle">ghi 1 tin</text>
    <text x="232" y="78" font-size="11" text-anchor="middle">(gán seq)</text>
    <rect x="328" y="40" width="120" height="56" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="388" y="62" font-size="11" font-weight="700" text-anchor="middle">tra ai</text>
    <text x="388" y="78" font-size="11" text-anchor="middle">đang online</text>
    <rect x="484" y="40" width="130" height="56" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="549" y="62" font-size="11" font-weight="700" text-anchor="middle">publish tới các</text>
    <text x="549" y="78" font-size="11" text-anchor="middle">node giữ member</text>
  </g>
  <g stroke="currentColor" fill="currentColor" stroke-width="1.5">
    <line x1="136" y1="68" x2="168" y2="68"/><polygon points="172,68 164,64 164,72" stroke="none"/>
    <line x1="292" y1="68" x2="324" y2="68"/><polygon points="328,68 320,64 320,72" stroke="none"/>
    <line x1="448" y1="68" x2="480" y2="68"/><polygon points="484,68 476,64 476,72" stroke="none"/>
  </g>
  <!-- fan-out down to nodes -->
  <g stroke="currentColor" stroke-width="1.4" fill="currentColor">
    <line x1="549" y1="96" x2="162" y2="148"/><polygon points="160,150 169,148 165,141" stroke="none"/>
    <line x1="549" y1="96" x2="361" y2="148"/><polygon points="360,150 368,145 362,140" stroke="none"/>
    <line x1="549" y1="96" x2="560" y2="148"/><polygon points="560,150 556,141 565,143" stroke="none"/>
  </g>
  <!-- nodes -->
  <g font-size="11" fill="currentColor">
    <rect x="108" y="150" width="104" height="38" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="160" y="173" font-weight="700" text-anchor="middle">node-a</text>
    <rect x="308" y="150" width="104" height="38" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="360" y="173" font-weight="700" text-anchor="middle">node-b</text>
    <rect x="508" y="150" width="104" height="38" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="560" y="173" font-weight="700" text-anchor="middle">node-c</text>
  </g>
  <!-- members from each node -->
  <g stroke="currentColor" stroke-width="1.2" fill="currentColor">
    <line x1="160" y1="188" x2="135" y2="232"/><polygon points="135,232 142,226 136,222" stroke="none"/>
    <line x1="160" y1="188" x2="185" y2="232"/><polygon points="185,232 184,224 178,228" stroke="none"/>
    <line x1="360" y1="188" x2="335" y2="232"/><polygon points="335,232 342,226 336,222" stroke="none"/>
    <line x1="360" y1="188" x2="385" y2="232"/><polygon points="385,232 384,224 378,228" stroke="none"/>
    <line x1="560" y1="188" x2="560" y2="232"/><polygon points="560,232 556,224 564,224" stroke="none"/>
  </g>
  <g font-size="10.5" fill="currentColor">
    <circle cx="135" cy="248" r="14" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/><text x="135" y="252" text-anchor="middle">m1</text>
    <circle cx="185" cy="248" r="14" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/><text x="185" y="252" text-anchor="middle">m2</text>
    <circle cx="335" cy="248" r="14" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/><text x="335" y="252" text-anchor="middle">m3</text>
    <circle cx="385" cy="248" r="14" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/><text x="385" y="252" text-anchor="middle">m4</text>
    <circle cx="560" cy="248" r="14" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/><text x="560" y="252" text-anchor="middle">m5</text>
  </g>
  <!-- caption đặt ở vùng trống trái, không cắt đường fan-out -->
  <text x="16" y="128" font-size="10.5" text-anchor="start" fill="currentColor" opacity="0.78">mỗi node đẩy</text>
  <text x="16" y="143" font-size="10.5" text-anchor="start" fill="currentColor" opacity="0.78">xuống member</text>
  <text x="16" y="158" font-size="10.5" text-anchor="start" fill="currentColor" opacity="0.78">của mình</text>
  <!-- offline branch: m5 offline -> inbox + push (tách riêng, không xuyên node) -->
  <rect x="436" y="298" width="248" height="46" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="560" y="318" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">member offline (m5)</text>
  <text x="560" y="334" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">→ đưa vào inbox + gửi push</text>
  <line x1="560" y1="262" x2="560" y2="294" stroke="currentColor" stroke-width="1.3" stroke-dasharray="4 3"/>
  <polygon points="560,298 556,289 564,289" fill="currentColor" stroke="none"/>
</svg>

> Nguyên tắc: Read receipt trong group **đắt gấp bội** số tin. Thường gộp/đếm thay vì hiển thị từng người ("đã xem bởi 87 người") để cắt fan-out của riêng receipt.

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

> Bẫy thiết kế: Đừng nhảy thẳng tới Kafka + Cassandra + global multi-region ngay câu đầu. Interviewer muốn thấy bạn **scale theo nhu cầu** và giải thích *vì sao* mỗi bước, không phải đọc tên công nghệ.

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

> Nguyên tắc: Chọn managed service không phải vì "AWS có sẵn", mà vì nó cắt **operational toil** ở chỗ bạn không có lợi thế cạnh tranh (giữ WebSocket, push fan-out). Nhưng luôn biết **giới hạn** của nó (idle timeout, message size, hot partition) — đó là nơi cuộc nói chuyện "managed vs self-hosted" thực sự diễn ra, và là tư duy của một Solutions Architect cấp cao.
