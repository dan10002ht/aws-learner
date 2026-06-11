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
