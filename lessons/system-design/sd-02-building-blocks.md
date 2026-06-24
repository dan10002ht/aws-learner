# Các khối xây dựng & trade-off

Mọi hệ thống lớn, dù phức tạp đến đâu, đều được lắp ghép từ một số ít **khối xây dựng (building blocks)** lặp đi lặp lại. Tư duy kiến trúc không phải là nhớ "công nghệ X tốt nhất", mà là hiểu mỗi khối **giải quyết vấn đề gì** và **bắt ta trả giá gì**. Bài này đi qua bảy khối nền tảng. Với mỗi khối, hãy luôn tự hỏi: *"Nó che giấu độ phức tạp nào, và đẩy độ phức tạp đó đi đâu?"*

> 💡 Nguyên tắc: Không có khối nào "miễn phí". Mỗi lần bạn thêm một thành phần để giải quyết một vấn đề, bạn tạo ra ít nhất một vấn đề mới (vận hành, nhất quán, độ trễ, chi phí). Kiến trúc tốt là chọn tập đánh đổi mà bạn *chịu được*, không phải tập không có đánh đổi.

---

## 1. Load Balancer

### Giải quyết gì
Phân phối traffic tới nhiều instance để có **horizontal scaling** + **high availability**. Nếu một node chết, traffic được định tuyến sang node khác (health check). Là điểm vào (entry point) che giấu số lượng và danh tính của backend.

### L4 vs L7

```
        Client
          │
          ▼
   ┌─────────────┐
   │ Load Balancer│
   └─────────────┘
     │    │    │
     ▼    ▼    ▼
   app1  app2  app3   (stateless tier)
```

- **L4 (Transport / TCP-UDP):** chỉ nhìn IP + port, không mở payload. Rất nhanh, throughput cao, độ trễ thấp. Không hiểu HTTP nên không route theo path/header, không terminate TLS (hoặc passthrough).
- **L7 (Application / HTTP):** đọc được URL, header, cookie. Cho phép path-based routing (`/api` → service A, `/img` → service B), sticky session theo cookie, TLS termination, nén, WAF. Đổi lại: tốn CPU hơn, độ trễ thêm vài trăm µs–ms, là một điểm cần scale riêng.

### Thuật toán cân bằng

| Thuật toán | Cách hoạt động | Hợp khi | Bẫy |
|---|---|---|---|
| Round Robin | Lần lượt từng node | Request đồng đều, node đồng nhất | Node "nặng" và "nhẹ" như nhau |
| Weighted RR | Theo trọng số (CPU/RAM) | Node không đồng nhất | Phải chỉnh trọng số thủ công |
| Least Connections | Node ít kết nối nhất | Request thời lượng lệch nhau | Cần state về kết nối |
| IP Hash / Consistent Hash | Hash client → node cố định | Cần affinity (cache cục bộ) | Lệch tải, khó co giãn |
| Least Response Time | Node phản hồi nhanh nhất | Nhạy với node chậm | Đo lường tốn kém |

> ⚠️ Bẫy thiết kế: **Sticky session** (gắn user vào một node) là cách nhanh để "giữ state", nhưng nó phá vỡ tính stateless: node chết là mất session, scale-in mất dữ liệu, tải lệch. Hãy đẩy state ra ngoài (Redis) thay vì dùng sticky.

---

## 2. Reverse Proxy & API Gateway

### Giải quyết gì
**Reverse proxy** đứng trước backend, nhận request thay cho server thật: TLS termination, caching, nén, che giấu topology, chống tấn công trực tiếp. **API Gateway** là reverse proxy "thông minh" cho hệ microservices — gom các cross-cutting concern vào một chỗ.

```
Client ──► API Gateway ──► [authn/authz]
                       ──► [rate limit]
                       ──► [routing]      ──► svc-user
                       ──► [aggregation]  ──► svc-order
                       ──► [logging]      ──► svc-payment
```

Trách nhiệm điển hình: authentication/authorization, rate limiting & throttling, request routing, response aggregation (BFF), protocol translation (REST↔gRPC), versioning, observability tập trung.

### Đánh đổi
- **Lợi:** service không phải tự làm auth/rate-limit/logging → đơn giản hoá hàng chục service.
- **Hại:** gateway trở thành **single point of failure** và **single point of contention**. Mọi request đi qua nó → phải HA + scale cẩn thận. Có nguy cơ thành "monolith mới": logic nghiệp vụ rò vào gateway. Thêm một network hop → độ trễ.

> 💡 Nguyên tắc: Gateway chỉ chứa logic *cross-cutting* (đúng cho mọi service). Logic *nghiệp vụ* (đặc thù một service) phải nằm trong service. Vi phạm ranh giới này là cách phổ biến nhất biến API Gateway thành nút thắt không thể bảo trì.

---

## 3. Cache

### Giải quyết gì
Giảm độ trễ và giảm tải lên nguồn dữ liệu đắt đỏ (DB, service downstream) bằng cách giữ kết quả gần nơi dùng. Khai thác locality: dữ liệu vừa truy cập thường được truy cập lại.

### Các tầng cache

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Phân tầng cache từ gần user tới gần "chân lý"</title>
  <desc>Sáu tầng cache xếp chồng từ trái sang phải: Browser, CDN edge, API Gateway, App cache Redis, DB buffer pool, Disk; trục dưới đi từ rẻ và gần user tới đắt, xa và đúng nhất.</desc>
  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">Phân tầng cache: gần user → gần "chân lý"</text>
  <g font-size="12">
    <rect x="16" y="48" width="108" height="92" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="70" y="74" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Browser</text>
    <text x="70" y="94" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">asset, response</text>
    <text x="70" y="110" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">0 round-trip</text>
    <text x="70" y="128" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.55">mỗi user 1 bản</text>
    <rect x="132" y="48" width="108" height="92" rx="9" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="186" y="74" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">CDN edge</text>
    <text x="186" y="94" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">ảnh, JS/CSS</text>
    <text x="186" y="110" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">gần user toàn cầu</text>
    <text x="186" y="128" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.55">dễ stale</text>
    <rect x="248" y="48" width="108" height="92" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="302" y="74" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">API GW</text>
    <text x="302" y="94" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">response cache</text>
    <text x="302" y="110" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">chặn tải downstream</text>
    <rect x="364" y="48" width="108" height="92" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="418" y="74" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">App cache</text>
    <text x="418" y="91" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">Redis</text>
    <text x="418" y="107" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">query, session</text>
    <text x="418" y="125" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.55">chia sẻ giữa node</text>
    <rect x="480" y="48" width="108" height="92" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="534" y="71" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">DB buffer</text>
    <text x="534" y="86" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">pool</text>
    <text x="534" y="104" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">trang nóng</text>
    <text x="534" y="122" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.55">giới hạn RAM của DB</text>
    <rect x="596" y="48" width="108" height="92" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="650" y="78" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Disk</text>
    <text x="650" y="98" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">nguồn "chân lý"</text>
    <text x="650" y="116" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.55">chậm nhất, đúng nhất</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <defs>
      <marker id="caHead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
      </marker>
    </defs>
    <line x1="124" y1="94" x2="132" y2="94" marker-end="url(#caHead)"/>
    <line x1="240" y1="94" x2="248" y2="94" marker-end="url(#caHead)"/>
    <line x1="356" y1="94" x2="364" y2="94" marker-end="url(#caHead)"/>
    <line x1="472" y1="94" x2="480" y2="94" marker-end="url(#caHead)"/>
    <line x1="588" y1="94" x2="596" y2="94" marker-end="url(#caHead)"/>
  </g>
  <line x1="16" y1="178" x2="704" y2="178" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#caHead)"/>
  <text x="20" y="200" font-size="11.5" font-weight="600" fill="currentColor" opacity="0.85">rẻ, gần user (cache miss = nhanh tới)</text>
  <text x="700" y="200" font-size="11.5" font-weight="600" text-anchor="end" fill="currentColor" opacity="0.85">đắt, xa, "đúng" nhất</text>
  <text x="16" y="232" font-size="11.5" fill="currentColor" opacity="0.7">Cache miss ở tầng trên rơi xuống tầng dưới; càng xuống dưới càng chậm nhưng càng tươi.</text>
  <text x="16" y="252" font-size="11.5" fill="currentColor" opacity="0.7">Mỗi tầng đổi tốc độ lấy nguy cơ stale — và một bài toán invalidation riêng.</text>
</svg>

```
Browser ─► CDN ─► API GW ─► App Cache ─► DB Cache ─► Disk
 (ms 0)   (edge)           (Redis)      (buffer pool)
  rẻ, gần user ─────────────────────────► đắt, xa, "đúng" nhất
```

| Tầng | Nội dung | Lợi | Hại |
|---|---|---|---|
| Client/Browser | Asset tĩnh, response | 0 round-trip | Khó invalidate, mỗi user một bản |
| CDN (edge) | Ảnh, JS/CSS, video, API GET | Gần user toàn cầu, chặn tải gốc | Stale, chi phí, khó cá nhân hoá |
| Application (Redis/Memcached) | Kết quả query, session, object | Chia sẻ giữa node, linh hoạt | Thêm hạ tầng, vấn đề nhất quán |
| Database (buffer pool) | Trang dữ liệu nóng | Trong suốt | Giới hạn bởi RAM của DB |

### Chiến lược ghi
- **Cache-aside (lazy):** app đọc cache, miss thì đọc DB rồi nạp cache. Phổ biến nhất. Bẫy: dữ liệu lần đầu luôn miss; có thể **cache stampede** khi key nóng hết hạn.
- **Write-through:** ghi cache + DB đồng thời → cache luôn tươi, nhưng mỗi write chậm hơn.
- **Write-back:** ghi cache trước, flush DB sau → write nhanh, rủi ro mất dữ liệu khi cache chết.

### Eviction
Khi cache đầy, bỏ gì ra? **LRU** (ít dùng gần đây nhất) là mặc định tốt; **LFU** (ít dùng nhất) hợp khi có key "siêu nóng" lâu dài; **FIFO/TTL** đơn giản nhưng kém thông minh.

### Invalidation — vấn đề khó nhất
> ⚠️ Bẫy thiết kế: "There are only two hard things in Computer Science: cache invalidation and naming things." Cache **stale** (cũ) là nguồn bug khó tái hiện nhất. Ba cách: **TTL** (đơn giản, chấp nhận stale trong khoảng T), **write-time invalidation** (xoá/cập nhật khi ghi — đúng hơn nhưng phức tạp, dễ sót), **versioned key** (đổi key khi dữ liệu đổi — không bao giờ stale nhưng phình bộ nhớ).

**Capacity ví dụ:** 10M user active, mỗi profile 2 KB, hit rate mong muốn 90% → cache khoảng 1M profile nóng × 2 KB ≈ **2 GB** RAM. Một node Redis 16 GB thừa sức; vấn đề thật là *invalidation*, không phải dung lượng.

---

## 4. Message Queue & Pub/Sub

### Giải quyết gì
**Decoupling** (tách rời) producer khỏi consumer theo cả thời gian và tốc độ. Producer không cần consumer online; consumer xử lý theo nhịp của mình. Hấp thụ burst traffic (**load leveling**), cho phép retry, xử lý bất đồng bộ.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 280" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Queue (point-to-point) so với Pub/Sub (fan-out)</title>
  <desc>So sánh hai topology: bên trái Queue point-to-point, mỗi message do đúng một consumer xử lý; bên phải Pub/Sub fan-out, mỗi message tới mọi subscriber.</desc>
  <defs>
    <marker id="mqHead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <line x1="360" y1="24" x2="360" y2="264" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 4"/>
  <text x="20" y="28" font-size="13.5" font-weight="700" fill="currentColor">QUEUE — point-to-point</text>
  <text x="20" y="46" font-size="11" fill="currentColor" opacity="0.65">mỗi msg → đúng 1 consumer</text>
  <g font-size="11">
    <rect x="20" y="100" width="78" height="40" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="59" y="124" text-anchor="middle" fill="currentColor">producer</text>
    <rect x="138" y="98" width="96" height="44" rx="6" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <g fill="#f59e0b" fill-opacity="0.85">
      <rect x="146" y="110" width="14" height="20" rx="2"/>
      <rect x="164" y="110" width="14" height="20" rx="2"/>
      <rect x="182" y="110" width="14" height="20" rx="2"/>
      <rect x="200" y="110" width="14" height="20" rx="2"/>
    </g>
    <text x="186" y="158" text-anchor="middle" fill="currentColor" opacity="0.65">queue</text>
    <rect x="274" y="74" width="78" height="36" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="313" y="96" text-anchor="middle" fill="currentColor">consumer 1</text>
    <rect x="274" y="130" width="78" height="36" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="313" y="152" text-anchor="middle" fill="currentColor">consumer 2</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none">
    <line x1="98" y1="120" x2="138" y2="120" marker-end="url(#mqHead)"/>
    <line x1="234" y1="116" x2="274" y2="98" marker-end="url(#mqHead)"/>
    <line x1="234" y1="124" x2="274" y2="142" stroke-dasharray="3 3" stroke-opacity="0.3"/>
  </g>
  <text x="186" y="200" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">mỗi msg do MỘT consumer lấy</text>
  <text x="186" y="216" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">→ task/job: gửi email, resize ảnh</text>
  <text x="380" y="28" font-size="13.5" font-weight="700" fill="currentColor">PUB/SUB — fan-out</text>
  <text x="380" y="46" font-size="11" fill="currentColor" opacity="0.65">mỗi msg → MỌI subscriber</text>
  <g font-size="11">
    <rect x="380" y="100" width="78" height="40" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="419" y="124" text-anchor="middle" fill="currentColor">publisher</text>
    <rect x="494" y="98" width="64" height="44" rx="9" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="526" y="124" text-anchor="middle" fill="currentColor">topic</text>
    <rect x="612" y="58" width="78" height="34" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="651" y="79" text-anchor="middle" fill="currentColor">sub A</text>
    <rect x="612" y="103" width="78" height="34" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="651" y="124" text-anchor="middle" fill="currentColor">sub B</text>
    <rect x="612" y="148" width="78" height="34" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="651" y="169" text-anchor="middle" fill="currentColor">sub C</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none">
    <line x1="458" y1="120" x2="494" y2="120" marker-end="url(#mqHead)"/>
    <line x1="558" y1="116" x2="612" y2="75" marker-end="url(#mqHead)"/>
    <line x1="558" y1="120" x2="612" y2="120" marker-end="url(#mqHead)"/>
    <line x1="558" y1="124" x2="612" y2="165" marker-end="url(#mqHead)"/>
  </g>
  <text x="540" y="216" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">cùng một msg tới MỌI sub</text>
  <text x="540" y="232" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">→ event: order.created → kho, kế toán, email</text>
</svg>

```
   QUEUE (point-to-point)            PUB/SUB (fan-out)
                                                ┌─► sub A
producer ─► [ ■■■■ ] ─► consumer     publisher ─►│─► sub B
            mỗi msg 1 consumer       topic       └─► sub C
                                     mỗi msg → mọi sub
```

- **Queue (point-to-point):** mỗi message được *một* consumer xử lý. Hợp với task/job (gửi email, resize ảnh).
- **Pub/Sub (topic):** mỗi message được *broadcast* tới mọi subscriber. Hợp với event ("order.created" → kho, kế toán, email cùng phản ứng).

### Đánh đổi
- **Lợi:** chịu tải đỉnh, độ bền (durability), khả năng phục hồi, tách dịch vụ.
- **Hại:** mất tính **đồng bộ** → hệ trở thành eventually consistent, khó debug (luồng phân tán), thêm hạ tầng vận hành. Phải xử lý: **at-least-once delivery** (message có thể lặp → consumer cần **idempotent**), **ordering** (không phải lúc nào cũng đảm bảo), **poison message** (cần dead-letter queue), **backpressure** khi consumer chậm hơn producer.

> 💡 Nguyên tắc: Dùng queue khi câu trả lời có thể đến *sau* và việc gửi đi *phải* thành công cuối cùng. Đừng dùng queue cho luồng cần phản hồi tức thì cho user — bạn sẽ phải tự xây lại cơ chế request/response trên nó.

> ⚠️ Bẫy thiết kế: Vì delivery thường là *at-least-once*, **mọi consumer phải idempotent** (xử lý cùng message 2 lần cho cùng kết quả). Bỏ qua điều này → trừ tiền khách hai lần. Dùng idempotency key + dedup store.

---

## 5. Database Replication (Leader–Follower)

### Giải quyết gì
**Đọc co giãn** và **độ sẵn sàng cao**. Một leader nhận write, nhiều follower (replica) sao chép dữ liệu và phục vụ read. Follower cũng là bản dự phòng khi leader chết (failover).

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Replication leader–follower và replication lag</title>
  <desc>Writes đi vào leader; replication log fan tới các follower phục vụ read. Một follower bị lag minh hoạ tình huống read-after-write trả về dữ liệu cũ.</desc>
  <defs>
    <marker id="rpHead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">Leader–Follower: write tập trung, read co giãn</text>
  <rect x="276" y="52" width="120" height="32" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="336" y="73" font-size="12" text-anchor="middle" fill="currentColor">writes (client)</text>
  <line x1="336" y1="84" x2="336" y2="106" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#rpHead)"/>
  <rect x="276" y="110" width="120" height="48" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="336" y="132" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">LEADER</text>
  <text x="336" y="149" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">nhận mọi write</text>
  <text x="336" y="184" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">replication log (async) ↓ fan tới followers</text>
  <g font-size="11">
    <rect x="40" y="206" width="150" height="58" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="115" y="228" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">follower 1</text>
    <text x="115" y="246" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">đã bắt kịp</text>
    <text x="115" y="260" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.55">read trả dữ liệu mới</text>
    <rect x="262" y="206" width="150" height="58" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="337" y="228" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">follower 2</text>
    <text x="337" y="246" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">đã bắt kịp</text>
    <text x="337" y="260" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.55">read trả dữ liệu mới</text>
    <rect x="484" y="206" width="196" height="58" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="582" y="226" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">follower 3 — đang LAG</text>
    <text x="582" y="244" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">log chưa apply kịp</text>
    <text x="582" y="258" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">read-after-write thấy dữ liệu CŨ</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <path d="M300 158 C220 180 130 188 115 206" marker-end="url(#rpHead)"/>
    <line x1="336" y1="158" x2="337" y2="206" marker-end="url(#rpHead)"/>
    <path d="M372 158 C470 180 560 188 582 206" stroke-dasharray="4 3" marker-end="url(#rpHead)"/>
  </g>
  <text x="16" y="296" font-size="11" fill="currentColor" opacity="0.7">read fan ra các follower; mỗi follower thêm dung lượng đọc — nhưng write vẫn dồn vào 1 leader.</text>
  <text x="16" y="312" font-size="11" fill="currentColor" opacity="0.7">Khắc phục stale read-after-write: route read của chính user về leader trong vài giây, hoặc theo dõi LSN.</text>
</svg>

```
        writes
          │
          ▼
      ┌────────┐   replication log
      │ LEADER │ ──────────────┐
      └────────┘               │
        reads?           ┌─────┼─────┐
                         ▼     ▼     ▼
                     follower follower follower
                       (reads)
```

### Đồng bộ vs bất đồng bộ
- **Synchronous:** leader chờ follower xác nhận mới commit. Không mất dữ liệu khi failover, nhưng write chậm và nếu follower treo thì leader cũng treo.
- **Asynchronous:** leader commit ngay, follower bắt kịp sau. Write nhanh, nhưng có **replication lag** → đọc từ follower có thể thấy dữ liệu cũ (**read-your-writes** bị vi phạm), và mất vài giây dữ liệu nếu leader chết trước khi replica bắt kịp.

> ⚠️ Bẫy thiết kế: User cập nhật profile rồi reload, thấy dữ liệu cũ vì read trúng follower đang lag. Khắc phục: route read-after-write của *chính user đó* về leader trong vài giây, hoặc theo dõi vị trí log (LSN) per-user.

### Giới hạn
Replication giải quyết *read scaling* nhưng **không** giải quyết *write scaling* — mọi write vẫn dồn vào một leader. Khi ghi vượt sức một máy → cần sharding.

---

## 6. Sharding (Phân mảnh dữ liệu)

### Giải quyết gì
**Write scaling** và dữ liệu vượt một máy. Chia dataset thành nhiều **shard** độc lập, mỗi shard là một DB riêng giữ một tập con dữ liệu.

### Chiến lược chọn shard

| Chiến lược | Cách | Lợi | Hại |
|---|---|---|---|
| **Range** | Theo khoảng key (A–F, G–M…) | Range query hiệu quả | **Hotspot** nếu key lệch (theo thời gian) |
| **Hash** | `hash(key) % N` | Phân bố đều | Range query phải scatter; **rehash toàn bộ** khi đổi N |
| **Consistent hashing** | Map key & node lên vòng tròn | Thêm/bớt node chỉ dời ~1/N dữ liệu | Phức tạp hơn, cần virtual node để cân tải |
| **Directory** | Bảng tra cứu key→shard | Linh hoạt tối đa | Bảng tra cứu thành SPOF/nút thắt |

### Consistent hashing — vì sao quan trọng

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Vòng consistent hashing và việc thêm node D</title>
  <desc>Key và node được map lên một vòng tròn; mỗi key đi theo chiều kim đồng hồ tới node đầu tiên. Thêm node D chỉ cướp cung của hàng xóm nên chỉ dời khoảng một phần N số key. Bên phải minh hoạ virtual node.</desc>
  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">Consistent hashing — thêm node chỉ dời ~1/N key</text>
  <g>
    <circle cx="200" cy="190" r="110" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-width="2"/>
    <text x="200" y="194" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.55">vòng băm</text>
    <text x="200" y="208" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.45">(theo chiều kim đồng hồ)</text>
    <g fill="#3b82f6" fill-opacity="0.9">
      <circle cx="200" cy="80" r="9"/>
      <circle cx="295" cy="245" r="9"/>
      <circle cx="105" cy="245" r="9"/>
    </g>
    <text x="200" y="64" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">node A</text>
    <text x="320" y="258" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">node B</text>
    <text x="78" y="258" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">node C</text>
    <g fill="#10b981" fill-opacity="0.95">
      <circle cx="285" cy="130" r="6"/>
      <circle cx="160" cy="295" r="6"/>
      <circle cx="92" cy="120" r="6"/>
    </g>
    <text x="300" y="123" font-size="10.5" fill="currentColor" opacity="0.8">k1</text>
    <text x="160" y="316" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">k2</text>
    <text x="74" y="113" font-size="10.5" text-anchor="end" fill="currentColor" opacity="0.8">k3</text>
    <g fill="#f59e0b" fill-opacity="0.95">
      <circle cx="310" cy="190" r="9"/>
    </g>
    <text x="328" y="194" font-size="11.5" font-weight="700" fill="currentColor">+ node D</text>
    <path d="M289 173 A30 30 0 0 1 305 181" fill="none" stroke="#f59e0b" stroke-opacity="0.8" stroke-width="2" stroke-dasharray="3 2"/>
    <text x="200" y="338" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">D chỉ "cướp" cung B→D: dời mỗi key trong cung đó</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 4"><line x1="430" y1="60" x2="430" y2="320"/></g>
  <text x="460" y="74" font-size="12.5" font-weight="700" fill="currentColor">hash % N (so sánh)</text>
  <text x="460" y="94" font-size="11" fill="currentColor" opacity="0.7">đổi N → gần như MỌI key đổi chỗ</text>
  <text x="460" y="111" font-size="11" fill="currentColor" opacity="0.7">→ đại di trú dữ liệu, cache cháy</text>
  <text x="460" y="150" font-size="12.5" font-weight="700" fill="currentColor">consistent hashing</text>
  <text x="460" y="170" font-size="11" fill="currentColor" opacity="0.7">thêm/bớt node → chỉ ~1/N key dời</text>
  <text x="460" y="208" font-size="12.5" font-weight="700" fill="currentColor">virtual node</text>
  <text x="460" y="228" font-size="11" fill="currentColor" opacity="0.7">mỗi node vật lý = nhiều điểm trên vòng</text>
  <g fill="#3b82f6" fill-opacity="0.85">
    <circle cx="468" cy="252" r="5"/><circle cx="500" cy="252" r="5"/><circle cx="532" cy="252" r="5"/>
    <circle cx="564" cy="252" r="5"/><circle cx="596" cy="252" r="5"/><circle cx="628" cy="252" r="5"/>
  </g>
  <text x="460" y="284" font-size="11" fill="currentColor" opacity="0.7">→ cân tải đều hơn, thêm node "mượt" hơn</text>
</svg>

```
        node A
      ╱        ╲
  k3 •          • k1     Vòng băm: mỗi key đi theo chiều kim đồng
    │   ●hash   │        hồ tới node đầu tiên. Thêm node D chỉ
  node C       node B    "cướp" cung của hàng xóm → dời ~1/N key,
      ╲   k2  ╱          không phải toàn bộ như `% N`.
        ╲   ╱
         •
```

Với `hash % N` thông thường, đổi `N` (thêm/bớt node) làm **gần như mọi key đổi chỗ** → đại di trú dữ liệu, cache cháy. Consistent hashing giới hạn thiệt hại còn ~1/N. **Virtual nodes** (mỗi node vật lý chiếm nhiều điểm trên vòng) giúp cân tải đều và làm "mượt" việc thêm node không đồng nhất.

> ⚠️ Bẫy thiết kế: Sharding làm **JOIN xuyên shard**, **transaction xuyên shard**, và **distributed query** trở nên đắt hoặc bất khả thi. Chọn **shard key** sai (gây hotspot hoặc buộc fan-out mọi query) là quyết định khó đảo ngược nhất hệ thống. Chọn key sao cho query phổ biến nhất chỉ chạm *một* shard.

---

## 7. CAP & Consistency trong thực tế

### Định lý CAP
Khi có **Partition** (mạng chia cắt — điều *sẽ* xảy ra trong hệ phân tán), bạn phải chọn:
- **CP (Consistency):** từ chối phục vụ phần bị chia cắt để không trả dữ liệu sai. Ví dụ: hệ tài chính, etcd, ZooKeeper.
- **AP (Availability):** vẫn phục vụ, chấp nhận tạm thời không nhất quán, hoà giải sau. Ví dụ: giỏ hàng, feed mạng xã hội, DNS, Cassandra/DynamoDB (chế độ eventually consistent).

```
         P xảy ra
        ╱        ╲
   chọn CP      chọn AP
   (đúng,        (sống,
    có thể       có thể
   từ chối)      cũ/lệch)
```

> 💡 Nguyên tắc: CAP không phải lựa chọn "một lần cho cả hệ thống". Nó là quyết định **per-operation**. Một hệ thống có thể CP cho thanh toán và AP cho hiển thị số lượt like. Hãy hỏi từng luồng: "Nếu trả dữ liệu cũ ở đây, hậu quả là gì?"

### Phổ nhất quán thực tế
Trong đời thực ta hiếm khi cần "strong consistency" tuyệt đối ở mọi nơi:

| Mức | Ý nghĩa | Giá phải trả |
|---|---|---|
| Strong / Linearizable | Mọi read thấy write mới nhất | Độ trễ cao, kén availability |
| Read-your-writes | Bạn luôn thấy thay đổi *của chính mình* | Cần sticky/routing thông minh |
| Monotonic reads | Không bao giờ "lùi về quá khứ" | Theo dõi vị trí đọc |
| Eventual | Cuối cùng hội tụ, tạm thời lệch | Đơn giản, rẻ, scale tốt nhất |

**PACELC** mở rộng CAP: *kể cả khi không có Partition (Else)*, bạn vẫn đánh đổi **Latency** đổi lấy **Consistency**. Đồng bộ nhiều replica = chậm; lỏng hơn = nhanh. Đây là đánh đổi diễn ra mỗi millisecond, không chỉ khi sự cố.

---

## 8. Stateless Tier — khối kết dính tất cả

### Giải quyết gì
Tầng ứng dụng **không giữ state cục bộ** giữa các request: bất kỳ node nào cũng xử lý được bất kỳ request nào. Đây là điều kiện để load balancer round-robin tự do, để **auto-scale** (thêm/bớt node tuỳ ý), và để node chết không mất dữ liệu.

```
        LB (tự do định tuyến)
     ┌────┼────┼────┐
     ▼    ▼    ▼    ▼
   app  app  app  app   ← stateless, thay thế được, vứt đi được
     └────┴──┬─┴────┘
             ▼
   ┌─────────────────┐
   │ State đẩy ra ngoài│  Redis (session), DB, object store, queue
   └─────────────────┘
```

> 💡 Nguyên tắc: "Treat servers as cattle, not pets." State *phải* sống ở đâu đó (DB, cache, object store) — stateless không có nghĩa là phi-state, mà là **đẩy state xuống một tầng được thiết kế để giữ nó**. Bạn đã đổi sự đơn giản của tầng app lấy độ phức tạp tập trung ở tầng lưu trữ — và đó là một đổi chác *tốt*.

---

## Bức tranh tổng thể: các khối phối hợp

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Bức tranh tổng thể end-to-end của các khối phối hợp</title>
  <desc>Luồng từ Client qua CDN, L7 LB, API Gateway tới stateless app tier; app tier dùng App Cache và Queue cộng workers; ghi vào Leader DB sharded rồi replicate tới followers phục vụ read. Mỗi mũi tên là một đánh đổi.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">End-to-end: mỗi mũi tên là một đánh đổi</text>
  <defs>
    <marker id="e2eHead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <g font-size="11">
    <rect x="16" y="52" width="92" height="40" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="62" y="76" text-anchor="middle" fill="currentColor">Client</text>
    <rect x="138" y="52" width="92" height="40" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="184" y="76" text-anchor="middle" fill="currentColor">CDN</text>
    <rect x="260" y="52" width="92" height="40" rx="9" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="306" y="71" text-anchor="middle" fill="currentColor">L7 LB</text>
    <text x="306" y="85" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">path route, TLS</text>
    <rect x="382" y="52" width="108" height="40" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="436" y="71" text-anchor="middle" fill="currentColor">API Gateway</text>
    <text x="436" y="85" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">auth, rate limit</text>
    <rect x="520" y="48" width="184" height="48" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="612" y="70" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">stateless app tier</text>
    <text x="612" y="86" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">cattle, auto-scale</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none">
    <line x1="108" y1="72" x2="138" y2="72" marker-end="url(#e2eHead)"/>
    <line x1="230" y1="72" x2="260" y2="72" marker-end="url(#e2eHead)"/>
    <line x1="352" y1="72" x2="382" y2="72" marker-end="url(#e2eHead)"/>
    <line x1="490" y1="72" x2="520" y2="72" marker-end="url(#e2eHead)"/>
  </g>
  <g font-size="11">
    <rect x="380" y="160" width="120" height="46" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="440" y="181" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">App Cache</text>
    <text x="440" y="196" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">Redis — read nhanh</text>
    <rect x="560" y="150" width="144" height="40" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="632" y="174" text-anchor="middle" fill="currentColor">Queue / Pub-Sub</text>
    <rect x="580" y="206" width="104" height="38" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="632" y="229" text-anchor="middle" fill="currentColor">workers</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <line x1="590" y1="96" x2="490" y2="160" marker-end="url(#e2eHead)"/>
    <line x1="634" y1="96" x2="632" y2="150" stroke-dasharray="4 3" marker-end="url(#e2eHead)"/>
    <line x1="632" y1="190" x2="632" y2="206" marker-end="url(#e2eHead)"/>
  </g>
  <text x="660" y="124" font-size="9.5" text-anchor="end" fill="currentColor" opacity="0.6">async</text>
  <g font-size="11">
    <rect x="300" y="300" width="180" height="56" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="390" y="324" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Leader DB (sharded)</text>
    <text x="390" y="342" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">nhận write, phân mảnh</text>
    <rect x="528" y="296" width="176" height="32" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="616" y="316" text-anchor="middle" fill="currentColor">follower 1 (reads)</text>
    <rect x="528" y="334" width="176" height="32" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="616" y="354" text-anchor="middle" fill="currentColor">follower 2 (reads)</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <line x1="440" y1="206" x2="400" y2="300" marker-end="url(#e2eHead)"/>
    <line x1="600" y1="244" x2="450" y2="300" marker-end="url(#e2eHead)"/>
    <line x1="480" y1="318" x2="528" y2="312" marker-end="url(#e2eHead)"/>
    <line x1="480" y1="332" x2="528" y2="346" marker-end="url(#e2eHead)"/>
  </g>
  <text x="492" y="290" font-size="9.5" fill="currentColor" opacity="0.6">replication →</text>
  <text x="16" y="392" font-size="11" fill="currentColor" opacity="0.7">Mỗi hop thêm: độ trễ, một điểm cần HA, một chỗ dữ liệu có thể stale.</text>
  <text x="16" y="408" font-size="11" font-weight="600" fill="currentColor" opacity="0.85">Đừng thêm khối nào trước khi có vấn đề đo được mà nó giải quyết.</text>
</svg>

```
                    ┌─────┐
 Client ──► CDN ──► │ L7  │ ──► API Gateway ──► [stateless app tier]
                    │ LB  │     (auth, rate)        │      │
                    └─────┘                          │      │ async
                                              ┌──────┘      ▼
                                              ▼          [Queue/PubSub]
                                         [App Cache]         │
                                              │              ▼
                                              ▼          [workers]
                                      ┌───────────────┐
                                      │  Leader DB    │── replication ──► followers (reads)
                                      │  (sharded)    │
                                      └───────────────┘
```

Mỗi mũi tên thêm vào là một đánh đổi: thêm hop độ trễ, thêm điểm cần HA, thêm một chỗ dữ liệu có thể stale. **Đừng thêm khối nào trước khi có vấn đề đo được mà nó giải quyết.**

---

## Cách trình bày khi phỏng vấn / review

- **Bắt đầu từ vấn đề, không từ công nghệ.** Đừng nói "em dùng Redis"; hãy nói "read latency của profile cao và DB quá tải vì đọc lặp, nên em thêm một cache layer; đánh đổi là phải xử lý invalidation, em chọn TTL 60s vì dữ liệu profile chịu được stale 1 phút."
- **Luôn nói thành tiếng đánh đổi.** Mỗi khi thêm một khối, câu tiếp theo phải là "...đổi lại em phải chấp nhận/xử lý X." Người phỏng vấn senior đánh giá bạn qua việc *bạn có thấy cái giá không*, chứ không phải bạn biết bao nhiêu công nghệ.
- **Định lượng.** "Khoảng 10M DAU, ~100 req/s đỉnh, mỗi bản ghi 2 KB → ~2 GB cache nóng." Con số biến ý kiến thành phân tích.
- **Gọi tên consistency yêu cầu của từng luồng.** "Số dư tài khoản cần strong; số lượt xem video chịu được eventual." Điều này cho thấy bạn hiểu CAP không phải khẩu hiệu.
- **Thừa nhận giới hạn của lựa chọn.** "Sharding theo user_id giải quyết write scaling nhưng làm báo cáo cross-user phải fan-out — em sẽ giải quyết bằng một read replica/OLAP riêng." Cho thấy bạn nghĩ tới hệ quả bậc hai.

> ⚠️ Bẫy phỏng vấn: Vẽ kiến trúc đầy box ngay từ đầu mà không hỏi requirement. Hãy hỏi quy mô, tỷ lệ read/write, yêu cầu nhất quán *trước*, rồi mới thêm khối tương ứng. Một hệ thống over-engineered là tín hiệu xấu ngang một hệ thống không chịu tải.

---

## Liên hệ sang AWS

| Khối xây dựng | Dịch vụ AWS | Ghi chú |
|---|---|---|
| L4 Load Balancer | **NLB** (Network Load Balancer) | TCP/UDP, throughput cực cao, static IP |
| L7 Load Balancer | **ALB** (Application Load Balancer) | Path/host routing, TLS termination, WAF |
| Reverse proxy / API Gateway | **API Gateway**, **AppSync** (GraphQL) | Auth, throttling, request mapping |
| CDN (edge cache) | **CloudFront** | Cache tĩnh + API, gần 600+ edge location |
| Application cache | **ElastiCache** (Redis / Memcached) | Cache-aside, session store |
| Message Queue (point-to-point) | **SQS** (Standard / FIFO) | At-least-once; FIFO cho ordering + dedup |
| Pub/Sub (fan-out) | **SNS**, **EventBridge** | SNS→SQS fan-out; EventBridge cho event routing |
| Streaming/event log | **Kinesis**, **MSK** (Kafka) | Ordered, replay, consumer độc lập |
| Replication (leader-follower) | **RDS Multi-AZ** (HA) + **Read Replicas** | Multi-AZ đồng bộ; replica async cho read scaling |
| Sharding / horizontal NoSQL | **DynamoDB** (partition key), **Aurora** | DynamoDB tự shard theo partition key |
| Consistency lựa chọn | **DynamoDB**: eventually vs strongly consistent read | Chọn per-read; strong tốn gấp đôi RCU |
| Stateless tier | **EC2 ASG**, **ECS/Fargate**, **Lambda** | State đẩy sang ElastiCache / DynamoDB / S3 |
| State bền ngoài app | **S3**, **DynamoDB**, **ElastiCache** | "Cattle not pets" — app node vứt đi được |

> 💡 Nguyên tắc cuối: Tên dịch vụ AWS sẽ đổi, nhưng *khối xây dựng* thì không. Khi đứng trước một dịch vụ mới, hãy hỏi "đây là khối nào trong bảy khối trên, và nó đánh đổi gì?" — bạn sẽ hiểu nó trong vài phút thay vì đọc tài liệu hàng giờ.
