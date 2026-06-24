# Designing for Scalability

Scalability là khả năng hệ thống xử lý được lượng tải tăng dần (hoặc đột biến) bằng cách thêm tài nguyên — mà không phải đập đi xây lại kiến trúc. Trong đề SAA-C03, đây là chủ đề "sương sống": đa số câu hỏi tình huống đều quy về *làm sao hấp thụ traffic spike* và *làm sao tách read khỏi write*. Bài này đi từ nguyên tắc đến từng service cụ thể, kèm bẫy thường gặp.

## 1. Horizontal vs Vertical Scaling

| Tiêu chí | Vertical (scale up) | Horizontal (scale out) |
|---|---|---|
| Cách làm | Đổi instance lớn hơn (t3.medium → m5.4xlarge) | Thêm nhiều instance giống nhau |
| Giới hạn | Có trần phần cứng, phải reboot | Gần như vô hạn |
| Downtime | Thường có (resize cần stop/start) | Không, thêm node nóng |
| Resilience | Vẫn là single point of failure | Tăng độ sẵn sàng (nhiều AZ) |
| Phù hợp | RDS, tier stateful khó phân tán | Web/app tier stateless, container, Lambda |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Vertical scaling (scale up) so với Horizontal scaling (scale out)</title>
  <desc>Bên trái: vertical scaling đổi một instance nhỏ thành một instance lớn hơn (hộp cao to hơn) nhưng vẫn là một node duy nhất. Bên phải: horizontal scaling giữ kích thước node nhưng thêm nhiều node giống nhau trải qua nhiều AZ.</desc>
  <text x="180" y="26" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Vertical — scale UP</text>
  <text x="540" y="26" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Horizontal — scale OUT</text>
  <line x1="360" y1="40" x2="360" y2="300" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="5 4"/>
  <text x="180" y="46" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.6">đổi instance lớn hơn — 1 node</text>
  <rect x="70" y="200" width="60" height="60" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="100" y="234" font-size="11" text-anchor="middle" fill="currentColor">t3</text>
  <text x="100" y="248" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">nhỏ</text>
  <path d="M148 230 h44" stroke="currentColor" stroke-opacity="0.55" fill="none" marker-end="url(#suArr)"/>
  <rect x="210" y="62" width="100" height="198" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="260" y="156" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">m5.4xlarge</text>
  <text x="260" y="174" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">CPU/RAM lớn hơn</text>
  <text x="180" y="288" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">có trần phần cứng · cần reboot · vẫn 1 SPOF</text>
  <text x="540" y="46" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.6">thêm nhiều node giống nhau qua AZ</text>
  <g>
    <rect x="410" y="66" width="116" height="56" rx="7" fill="#3b82f6" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="4 3"/>
    <text x="418" y="80" font-size="10" text-anchor="start" fill="currentColor" opacity="0.6">AZ-a</text>
    <rect x="420" y="88" width="44" height="28" rx="6" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="472" y="88" width="44" height="28" rx="6" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
  </g>
  <g>
    <rect x="550" y="66" width="116" height="56" rx="7" fill="#3b82f6" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="4 3"/>
    <text x="558" y="80" font-size="10" text-anchor="start" fill="currentColor" opacity="0.6">AZ-b</text>
    <rect x="560" y="88" width="44" height="28" rx="6" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="612" y="88" width="44" height="28" rx="6" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
  </g>
  <g>
    <rect x="480" y="134" width="116" height="56" rx="7" fill="#3b82f6" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="4 3"/>
    <text x="488" y="148" font-size="10" text-anchor="start" fill="currentColor" opacity="0.6">AZ-c</text>
    <rect x="490" y="156" width="44" height="28" rx="6" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="542" y="156" width="44" height="28" rx="6" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
  </g>
  <text x="540" y="224" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">… thêm node nóng, không downtime …</text>
  <text x="540" y="288" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">gần như vô hạn · tăng cả availability (nhiều AZ)</text>
  <defs>
    <marker id="suArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
</svg>

> 💡 Mẹo thi: Đề thi gần như **luôn ưu tiên horizontal scaling** vì nó vừa tăng scalability vừa tăng availability. Khi thấy đáp án "resize to a larger instance" cho web tier có khả năng cao là bẫy. Vertical chỉ hợp lý cho thành phần khó phân tán (ví dụ một RDS primary cần ghi mạnh hơn).

Nguyên tắc vàng: **muốn scale out thì tier đó phải stateless**. Đẩy session/state ra ngoài (DynamoDB, ElastiCache, hoặc dùng sticky session chỉ khi bất đắc dĩ).

## 2. Auto Scaling Policies (EC2 Auto Scaling Group)

ASG duy trì số lượng instance giữa `min` – `max` quanh giá trị `desired`, phân bổ qua nhiều AZ. Điểm cốt lõi của bài thi là chọn đúng **loại scaling policy**.

| Policy | Cơ chế | Khi nào dùng |
|---|---|---|
| **Target tracking** | Giữ một metric ở mức mục tiêu (vd CPU = 50%) | Mặc định khuyến nghị, đơn giản, tự tính số instance cần thêm/bớt |
| **Step scaling** | Thêm/bớt theo bậc tuỳ mức vượt ngưỡng alarm | Cần kiểm soát chi tiết phản ứng theo độ lệch metric |
| **Simple scaling** | Một hành động cho mỗi alarm, có cooldown | Cũ, ít dùng — step scaling thay thế |
| **Scheduled** | Scale theo lịch (cron) | Tải có quy luật thời gian biết trước (9h sáng thứ Hai tăng) |
| **Predictive** | ML dự báo tải tương lai, provision trước | Tải tuần hoàn theo ngày/tuần, muốn tránh độ trễ khởi động |

> 💡 Mẹo thi:
> - Tải **biết trước theo giờ/ngày** (batch tối, giờ hành chính) → **Scheduled scaling**.
> - Tải **lặp theo chu kỳ nhưng muốn AWS tự dự báo** → **Predictive scaling**.
> - Spike **đột ngột, không đoán được** → Target tracking phản ứng nhanh, hoặc kết hợp với queue (mục 6).

> ⚠️ Bẫy: Target tracking có **độ trễ** — phải phát hiện metric vượt ngưỡng, launch instance, chờ instance boot + health check. Nếu spike rất nhanh và đề nhấn "instantaneous"/"immediate", câu trả lời thường là **kiến trúc đệm bằng queue/serverless**, không phải tinh chỉnh ASG.

**Warm pools** giúp giảm thời gian khởi động khi cần scale gấp (giữ sẵn instance ở trạng thái stopped/hibernated). **Lifecycle hooks** cho phép chạy bước chuẩn bị (load data, drain connection) trước khi instance vào/ra service.

> ⚠️ Bẫy: Khi instance bị terminate lúc scale-in mà connection chưa drain → dùng **lifecycle hook (Terminating:Wait)** + connection draining (deregistration delay) ở ELB, đừng để mất request đang xử lý.

## 3. Scaling Reads — Tách Read khỏi Write

Đây là chủ đề bị hỏi *cực nhiều*. Hầu hết workload là read-heavy, nên scale phần đọc là cách rẻ và nhanh nhất.

### RDS Read Replicas
- Tới **15 read replica** (Aurora) hoặc tối đa 5–15 tuỳ engine với RDS thường.
- Replication **bất đồng bộ** → có **replica lag** → eventual consistency cho read.
- Replica có **endpoint riêng**; ứng dụng phải chủ động route read query sang đó.
- Dùng để: offload báo cáo/analytics, scale read traffic, cross-region read.

> ⚠️ Bẫy phân biệt **Read Replica vs Multi-AZ**:
> - **Multi-AZ** = *high availability/disaster recovery*. Standby **không phục vụ read**, chỉ để failover tự động. (Trừ Multi-AZ DB cluster mới có 2 readable standby.)
> - **Read Replica** = *scale read performance*. Không tự failover (trừ khi promote thủ công).
> - Câu hỏi nói "offload reads / scale read traffic" → Read Replica. Nói "survive AZ failure / automatic failover" → Multi-AZ.

### Aurora Replicas
- Tới **15 Aurora Replicas** chia sẻ chung storage volume → **lag rất thấp** (mili-giây), failover nhanh.
- **Reader endpoint** tự load-balance read qua các replica → app chỉ cần một endpoint.
- **Aurora Auto Scaling** thêm/bớt reader theo tải đọc tự động.
- **Aurora Global Database**: cross-region, lag < 1s, đọc địa phương + DR.

### ElastiCache (Redis / Memcached)
- Cache layer trước DB để giảm read load và latency.
- **Redis**: replication, cluster mode, persistence, pub/sub, sorted set — chọn khi cần HA, đọc replica, cấu trúc dữ liệu phong phú.
- **Memcached**: đa luồng, đơn giản, scale ngang bằng cách thêm node — chọn khi chỉ cần cache đơn giản, không cần bền vững.

### DynamoDB
- **On-demand** vs **Provisioned + Auto Scaling**: spike không đoán được → on-demand; tải ổn định/biết trước → provisioned rẻ hơn.
- **DAX** (DynamoDB Accelerator): in-memory cache *cho DynamoDB*, đưa latency từ mili-giây xuống micro-giây cho read. Chỉ dùng với DynamoDB.
- **Global Tables**: multi-region, multi-active write, đọc địa phương low-latency.

> 💡 Mẹo thi: "DynamoDB read latency cao, cần microsecond" → **DAX**. "Cache cho RDS / kết quả query SQL tuỳ ý" → **ElastiCache**, KHÔNG phải DAX.

Mẫu tổng hợp tách read/write cho RDS/Aurora: app **ghi** qua một endpoint tới primary/writer, còn **đọc** đi qua reader endpoint được load-balance trên nhiều read replica, và một lớp cache đứng trước để chặn bớt read trúng DB.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Tách read khỏi write: writer endpoint cho ghi, reader endpoint load-balance qua nhiều read replica, cache đứng trước</title>
  <desc>Ứng dụng gửi write tới writer endpoint nối vào primary. Đọc đi qua cache ElastiCache trước; nếu miss thì qua reader endpoint load-balance tới nhiều read replica. Primary replicate bất đồng bộ sang các replica.</desc>
  <rect x="40" y="150" width="120" height="56" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="100" y="174" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Ứng dụng</text>
  <text x="100" y="192" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">read + write</text>
  <path d="M160 166 C 210 150, 240 96, 300 96" stroke="#f59e0b" stroke-opacity="0.85" stroke-width="2" fill="none" marker-end="url(#rwArr)"/>
  <text x="222" y="108" font-size="11" font-weight="700" fill="currentColor">write</text>
  <path d="M160 190 C 210 210, 240 250, 300 250" stroke="#10b981" stroke-opacity="0.85" stroke-width="2" fill="none" marker-end="url(#rwArr)"/>
  <text x="218" y="248" font-size="11" font-weight="700" fill="currentColor">read</text>
  <rect x="300" y="70" width="150" height="50" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="375" y="90" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Writer endpoint</text>
  <text x="375" y="107" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">→ Primary (1 node)</text>
  <rect x="252" y="226" width="120" height="48" rx="9" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="312" y="246" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Cache</text>
  <text x="312" y="262" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">ElastiCache</text>
  <path d="M372 250 h28" stroke="#10b981" stroke-opacity="0.7" stroke-width="2" fill="none" marker-end="url(#rwArr)"/>
  <text x="386" y="242" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">miss</text>
  <rect x="400" y="226" width="150" height="48" rx="9" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="475" y="246" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Reader endpoint</text>
  <text x="475" y="262" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">load-balance read</text>
  <rect x="560" y="60" width="130" height="44" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="625" y="86" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Primary</text>
  <path d="M450 95 h100" stroke="currentColor" stroke-opacity="0.5" fill="none" marker-end="url(#rwArr)"/>
  <rect x="560" y="150" width="130" height="38" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="625" y="174" font-size="10.5" text-anchor="middle" fill="currentColor">Read replica 1</text>
  <rect x="560" y="196" width="130" height="38" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="625" y="220" font-size="10.5" text-anchor="middle" fill="currentColor">Read replica 2</text>
  <rect x="560" y="242" width="130" height="38" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="625" y="266" font-size="10.5" text-anchor="middle" fill="currentColor">Read replica … (tới 15)</text>
  <path d="M550 250 C 552 220, 554 190, 558 175" stroke="currentColor" stroke-opacity="0.45" fill="none" marker-end="url(#rwArr)"/>
  <path d="M550 250 h6" stroke="currentColor" stroke-opacity="0.45" fill="none" marker-end="url(#rwArr)"/>
  <path d="M550 250 C 552 256, 554 258, 558 260" stroke="currentColor" stroke-opacity="0.45" fill="none" marker-end="url(#rwArr)"/>
  <g stroke="#f59e0b" stroke-opacity="0.55" stroke-dasharray="4 3" fill="none">
    <path d="M625 104 V 150" marker-end="url(#rwArr)"/>
    <path d="M690 104 C 720 150, 720 200, 692 210" marker-end="url(#rwArr)"/>
  </g>
  <text x="700" y="130" font-size="9.5" fill="currentColor" opacity="0.7" transform="rotate(90 700 130)">replicate async (lag)</text>
  <defs>
    <marker id="rwArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
</svg>

## 4. Caching Layers — Đặt cache ở đâu

Cache đẩy dữ liệu gần người dùng / gần compute hơn, giảm tải backend và latency.

| Layer | Service | Cache cái gì |
|---|---|---|
| Edge (gần user) | **CloudFront** | Static + dynamic content, API responses, video |
| Database/app | **ElastiCache** | Kết quả query, session, leaderboard, rate-limit counter |
| DynamoDB | **DAX** | Item/query reads của DynamoDB |
| API | **API Gateway caching** | Response của REST API theo stage |

> 💡 Mẹo thi: "Giảm tải cho origin/web server, phục vụ user toàn cầu, hấp thụ spike đọc nội dung tĩnh" → **CloudFront**. Nó còn hấp thụ được spike đột biến (flash sale, viral) cho static/cacheable content mà không cần scale backend.

Mẫu kiến trúc nhiều tầng cache điển hình: **CloudFront → API Gateway (cache) → ElastiCache → RDS/DynamoDB(+DAX)**.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 280" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cache nhiều tầng: CloudFront ở edge, API Gateway cache, ElastiCache, rồi RDS/DynamoDB với DAX — mỗi tầng chặn bớt tải xuống backend</title>
  <desc>Request đi từ trái sang phải qua các tầng cache. Mỗi tầng phục vụ phần lớn request (cache hit) và chỉ để lọt phần nhỏ xuống tầng sau, nên lượng tải tới database nhỏ dần. Thứ tự: CloudFront edge, API Gateway cache, ElastiCache, cuối cùng RDS/DynamoDB kèm DAX.</desc>
  <text x="16" y="24" font-size="12.5" font-weight="700" fill="currentColor">Mỗi tầng cache chặn bớt — tải xuống backend nhỏ dần</text>
  <rect x="20" y="60" width="120" height="120" rx="10" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="80" y="86" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">CloudFront</text>
  <text x="80" y="103" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">edge, gần user</text>
  <text x="80" y="120" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">tĩnh + API resp</text>
  <rect x="180" y="72" width="116" height="96" rx="10" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="238" y="98" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">API Gateway</text>
  <text x="238" y="114" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">cache theo</text>
  <text x="238" y="128" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">stage</text>
  <rect x="336" y="84" width="112" height="72" rx="10" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="392" y="110" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">ElastiCache</text>
  <text x="392" y="126" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">query/session</text>
  <rect x="488" y="96" width="100" height="48" rx="10" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="538" y="118" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">DAX</text>
  <text x="538" y="133" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">cache DynamoDB</text>
  <rect x="616" y="96" width="86" height="48" rx="10" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="659" y="116" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">RDS /</text>
  <text x="659" y="132" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">DynamoDB</text>
  <g fill="none" stroke="currentColor">
    <path d="M140 120 h40" stroke-opacity="0.55" stroke-width="3" marker-end="url(#cArr)"/>
    <path d="M296 120 h40" stroke-opacity="0.5" stroke-width="2.2" marker-end="url(#cArr)"/>
    <path d="M448 120 h40" stroke-opacity="0.45" stroke-width="1.6" marker-end="url(#cArr)"/>
    <path d="M588 120 h28" stroke-opacity="0.4" stroke-width="1" marker-end="url(#cArr)"/>
  </g>
  <text x="160" y="210" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">phần lớn request</text>
  <text x="160" y="226" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">dừng sớm ở edge</text>
  <text x="540" y="210" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">chỉ phần nhỏ (miss)</text>
  <text x="540" y="226" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">mới chạm DB</text>
  <path d="M250 245 h220" stroke="currentColor" stroke-opacity="0.4" fill="none" marker-end="url(#cArr)"/>
  <text x="360" y="262" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">tải còn lại giảm dần qua từng tầng</text>
  <defs>
    <marker id="cArr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
</svg>

Hai chiến lược cache phổ biến (đôi khi bị hỏi):
- **Lazy loading (cache-aside)**: chỉ cache khi có request miss. Tiết kiệm bộ nhớ, nhưng lần miss đầu chậm và có thể stale.
- **Write-through**: ghi vào cache mỗi khi ghi DB. Dữ liệu cache luôn mới, nhưng tốn ghi và có thể cache dữ liệu không bao giờ đọc. Thường kèm **TTL** để tránh stale.

## 5. Scaling Stateless Tiers

Để scale out web/app tier mượt mà:
- **Tách state ra ngoài**: session → ElastiCache for Redis hoặc DynamoDB; file upload → S3; không lưu trên local disk instance.
- **ELB phía trước ASG**: ALB cho HTTP/HTTPS (layer 7, path/host routing), NLB cho TCP/UDP cực nhanh và static IP.
- **Health check** để ASG thay thế instance hỏng; **connection draining** khi scale-in.

> ⚠️ Bẫy: Sticky session (session affinity) trói user vào một instance → khi instance đó scale-in, user mất session, và load phân bổ không đều. Đề thi thích đáp án **externalize session vào ElastiCache/DynamoDB** hơn là bật sticky session.

## 6. Queue-Based Load Leveling — Hấp thụ Spike

Đây là *pattern kinh điển* để xử lý traffic spike mà SAA-C03 rất thích hỏi.

**Vấn đề**: Producer (frontend) tạo request nhanh hơn nhiều so với tốc độ Consumer (backend xử lý). Spike trực tiếp vào backend → quá tải, mất request.

**Giải pháp**: Chèn **SQS** giữa hai tầng. Queue đóng vai trò *buffer*:
- Producer đẩy message vào queue *ngay lập tức* (queue co giãn gần vô hạn) → frontend không bao giờ bị nghẽn.
- Fleet consumer (ASG hoặc Lambda) đọc và xử lý theo **tốc độ ổn định của riêng nó**, không bị spike đè bẹp.
- Scale consumer dựa trên **chiều dài queue** (`ApproximateNumberOfMessagesVisible`) làm metric cho target tracking.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 270" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Queue-based load leveling: frontend spike đẩy vào SQS làm buffer, consumer ASG/Lambda đọc và scale theo độ dài queue (backlog)</title>
  <desc>Frontend tạo traffic đột biến lởm chởm, đẩy message ngay vào SQS đóng vai trò buffer co giãn. Phía sau, fleet consumer ASG hoặc Lambda đọc message với tốc độ ổn định và tự scale theo độ dài backlog của queue, nên backend không bị spike đè bẹp.</desc>
  <rect x="20" y="80" width="150" height="86" rx="10" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="95" y="106" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Frontend</text>
  <text x="95" y="123" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">producer</text>
  <g stroke="currentColor" stroke-opacity="0.6" fill="none" stroke-width="1.4">
    <path d="M38 152 l8 -18 l8 22 l8 -28 l8 24 l8 -14 l8 16"/>
  </g>
  <text x="95" y="160" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">traffic spike</text>
  <path d="M170 123 h44" stroke="currentColor" stroke-opacity="0.55" stroke-width="2" fill="none" marker-end="url(#qArr)"/>
  <text x="192" y="113" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">đẩy ngay</text>
  <rect x="216" y="74" width="190" height="98" rx="10" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="311" y="98" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">SQS Queue</text>
  <text x="311" y="114" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">buffer co giãn gần vô hạn</text>
  <g>
    <rect x="236" y="130" width="20" height="26" rx="3" fill="#3b82f6" fill-opacity="0.45" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="260" y="130" width="20" height="26" rx="3" fill="#3b82f6" fill-opacity="0.45" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="284" y="130" width="20" height="26" rx="3" fill="#3b82f6" fill-opacity="0.45" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="308" y="130" width="20" height="26" rx="3" fill="#3b82f6" fill-opacity="0.45" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="332" y="130" width="20" height="26" rx="3" fill="#3b82f6" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="356" y="130" width="20" height="26" rx="3" fill="#3b82f6" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="380" y="130" width="20" height="26" rx="3" fill="#3b82f6" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
  </g>
  <path d="M406 123 h44" stroke="currentColor" stroke-opacity="0.55" stroke-width="2" fill="none" marker-end="url(#qArr)"/>
  <text x="428" y="113" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">poll đều</text>
  <rect x="452" y="74" width="172" height="98" rx="10" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="538" y="98" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">ASG / Lambda</text>
  <text x="538" y="114" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">consumers, tốc độ ổn định</text>
  <g>
    <rect x="466" y="128" width="40" height="30" rx="5" fill="#10b981" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="514" y="128" width="40" height="30" rx="5" fill="#10b981" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="562" y="128" width="40" height="30" rx="5" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
  </g>
  <path d="M538 172 C 538 208, 420 208, 360 196" stroke="currentColor" stroke-opacity="0.45" stroke-dasharray="5 4" fill="none" marker-end="url(#qArr)"/>
  <rect x="206" y="196" width="320" height="40" rx="8" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="366" y="214" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">scale consumer theo độ dài queue</text>
  <text x="366" y="229" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">metric: ApproximateNumberOfMessagesVisible</text>
  <defs>
    <marker id="qArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
</svg>

> 💡 Mẹo thi: Bất cứ khi nào đề mô tả "spiky/unpredictable traffic", "decouple", "không được mất request khi backend bận", "smooth out the load" → nghĩ ngay **SQS (queue-based load leveling)**.

Phân biệt nhanh các dịch vụ decoupling:

| Service | Mô hình | Dùng khi |
|---|---|---|
| **SQS** | Queue, 1 consumer group lấy & xoá message | Load leveling, xử lý bất đồng bộ, mỗi message xử lý một lần |
| **SNS** | Pub/sub, fan-out nhiều subscriber | Một event → nhiều hệ thống nhận |
| **SQS FIFO** | Thứ tự + exactly-once | Cần đảm bảo thứ tự, throughput thấp hơn |
| **Kinesis Data Streams** | Streaming, replay, nhiều consumer đọc cùng dữ liệu | Real-time analytics, ordered per-shard, giữ data 1–365 ngày |
| **EventBridge** | Event bus, routing theo rule, tích hợp SaaS | Event-driven, định tuyến theo nội dung |

> ⚠️ Bẫy SQS vs Kinesis: SQS message bị **xoá sau khi xử lý**, không replay được, không giữ thứ tự (standard). Kinesis **giữ lại data** cho phép nhiều consumer & replay, theo thứ tự trong shard. Đề nói "multiple consumers cùng đọc một stream", "real-time analytics", "replay" → **Kinesis**, không phải SQS.

**Pattern SNS + SQS fan-out**: SNS publish một event, fan-out vào nhiều SQS queue, mỗi queue có fleet riêng xử lý độc lập và scale riêng. Vừa decouple vừa hấp thụ spike cho nhiều downstream.

## 7. ECS / EKS Auto Scaling

Container scaling có **hai tầng** — phải scale cả task lẫn hạ tầng chạy task.

- **Service Auto Scaling** (tầng task): tăng/giảm số task theo CPU/memory/ALB request count — dùng target tracking, step, scheduled. Tương tự ASG nhưng cho task.
- **Cluster capacity** (tầng hạ tầng):
  - **EC2 launch type**: cần **Cluster Auto Scaling (Capacity Provider)** để thêm EC2 khi task không có chỗ chạy.
  - **Fargate**: serverless, **không quản lý EC2** — chỉ cần scale task, AWS lo capacity. Đề nhấn "không muốn quản lý server/cluster capacity" → **Fargate**.
- **EKS**: dùng **Cluster Autoscaler** hoặc **Karpenter** (provision node nhanh, tối ưu hơn) cho node; **HPA** (Horizontal Pod Autoscaler) cho pod.

> 💡 Mẹo thi: "Chạy container không muốn quản lý infrastructure/patching, scale theo nhu cầu" → **Fargate**. "Cần kiểm soát instance type/GPU, tối ưu chi phí với reserved/spot" → **EC2 launch type + Capacity Provider**.

## 8. Lambda Concurrency & Scaling

Lambda tự scale theo số request đồng thời, nhưng có vài cơ chế phải nắm:

- **Concurrency** = số execution chạy đồng thời. Account mặc định giới hạn (vd 1.000) trên toàn region — chia sẻ giữa các function.
- **Reserved concurrency**: *dành riêng* một phần hạn mức cho function quan trọng (vừa đảm bảo nó luôn có chỗ, vừa **giới hạn trần** để không làm cạn quota / không đè sập downstream như RDS).
- **Provisioned concurrency**: giữ sẵn execution environment đã khởi tạo → **loại bỏ cold start**, dùng cho API latency-sensitive. Có thể auto scale theo lịch/utilization.
- **Burst concurrency**: scale rất nhanh ban đầu rồi tăng theo bước; vượt giới hạn → request bị **throttle (429)**.

> ⚠️ Bẫy Lambda + RDS: Lambda scale ra hàng nghìn concurrent execution có thể **làm cạn connection pool của RDS**. Giải pháp: **RDS Proxy** (gộp & tái dùng connection), hoặc đặt **reserved concurrency** để giới hạn. Đề hay hỏi tình huống "too many database connections" này.

> ⚠️ Bẫy cold start: Latency-sensitive API spike → **Provisioned concurrency**. Đừng nhầm với Reserved concurrency (cái này không loại bỏ cold start, chỉ phân bổ/giới hạn quota).

## 9. Cây quyết định nhanh cho phòng thi

- **Spike đột ngột, không mất request** → SQS buffer + consumer scale theo queue depth (hoặc Lambda).
- **Tải biết trước theo lịch** → Scheduled scaling. **Tuần hoàn để AWS dự báo** → Predictive scaling.
- **Read-heavy SQL, offload đọc** → Read Replica / Aurora reader endpoint. **Sống sót khi AZ chết** → Multi-AZ.
- **Giảm DB read latency**: kết quả SQL → ElastiCache; DynamoDB → DAX.
- **Phục vụ global, hấp thụ spike nội dung cacheable** → CloudFront.
- **Container không muốn quản hạ tầng** → Fargate. **Cần control/spot** → ECS on EC2 + Capacity Provider.
- **Lambda làm sập RDS connection** → RDS Proxy / reserved concurrency. **Cold start API** → Provisioned concurrency.
- **Web/app tier scale out** → stateless + externalize session (ElastiCache/DynamoDB) + ASG sau ALB.

## 10. Tổng kết các bẫy hay gặp

- Vertical scaling cho web tier thường là **đáp án sai** — ưu tiên horizontal.
- **Multi-AZ ≠ Read Replica**: HA vs scale read.
- **DAX chỉ cho DynamoDB**, ElastiCache cho phần còn lại.
- Spike "tức thời" không giải bằng tinh chỉnh ASG mà bằng **queue / serverless / cache**.
- **SQS không replay / Kinesis có replay** + multi-consumer.
- **Provisioned concurrency** xử lý cold start, **Reserved concurrency** xử lý phân bổ/giới hạn quota — đừng nhầm.
- Sticky session là giải pháp kém; **externalize state** mới đúng tinh thần scalable.
- Quên **lifecycle hook / connection draining** khi scale-in → mất request đang xử lý.
