# SAA Ch2.4 — Network & Edge Performance

> Mục tiêu: Hiểu các tầng tối ưu network từ **client → edge → region → VPC → service**, biết khi nào dùng CloudFront vs Global Accelerator, hiểu VPC endpoint tiết kiệm cả tiền lẫn latency, và Direct Connect khi nào hơn VPN.

Tiền đề: [[foundations-04-latency-vs-consistency]], CLF [[06-vpc]].

---

## 1. Câu chuyện mở đầu — Web app "chậm với user Singapore"

Web app deploy ở `us-east-1`. User ở Việt Nam complain trang load 8 giây. Devtool cho thấy:

- DNS: 200ms (Route 53 default ở Virginia).
- TCP handshake + TLS: 600ms (3 RTT × 200ms từ VN ↔ US).
- TTFB (server response): 400ms.
- Download HTML 50KB: 800ms.
- Subsequent assets (CSS/JS/IMG): mỗi cái lặp lại TCP + TLS.

→ Trong 8 giây, **chỉ 400ms là server work**. Phần còn lại là **network latency** vật lý xuyên Thái Bình Dương. Không tune backend nào giải quyết được.

**Lời giải**: đẩy content ra **edge gần user** (CloudFront), TLS terminate ở edge (rút RTT), HTTP/2/3 multiplex, và **routing nhanh hơn DNS** (Global Accelerator) cho dynamic.

---

## 2. Tầng tối ưu network

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 470" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Các tầng tối ưu network — từ user xuống service</title>
  <desc>Luồng đi xuống qua các tầng: User, DNS Route 53, Edge POP CloudFront hoặc Global Accelerator, AWS backbone, VPC ALB hoặc API Gateway, ENI hoặc VPC endpoint, rồi tới EC2 Lambda DB. Mỗi hop là một cơ hội tối ưu.</desc>
  <defs>
    <marker id="np1Arr" markerWidth="11" markerHeight="11" refX="5" refY="8" orient="auto"><path d="M0 0 L5 8 L10 0" fill="none" stroke="currentColor" stroke-opacity="0.6"/></marker>
  </defs>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Các tầng tối ưu network — mỗi hop một cơ hội</text>
  <rect x="180" y="38" width="360" height="42" rx="10" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="60" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">User</text>
  <text x="360" y="74" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.62">trình duyệt / client app</text>
  <line x1="360" y1="80" x2="360" y2="98" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#np1Arr)"/>
  <text x="372" y="94" font-size="10" fill="currentColor" opacity="0.6">DNS resolution</text>
  <rect x="120" y="100" width="480" height="46" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
  <rect x="132" y="112" width="84" height="22" rx="11" fill="#3b82f6" fill-opacity="0.9"/>
  <text x="174" y="127" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">DNS</text>
  <text x="232" y="121" font-size="12.5" font-weight="700" fill="currentColor">Route 53</text>
  <text x="232" y="138" font-size="10.5" fill="currentColor" opacity="0.62">latency / geo / failover routing</text>
  <line x1="360" y1="146" x2="360" y2="164" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#np1Arr)"/>
  <text x="372" y="160" font-size="10" fill="currentColor" opacity="0.6">Edge (POP gần user)</text>
  <rect x="120" y="166" width="480" height="46" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
  <rect x="132" y="178" width="84" height="22" rx="11" fill="#10b981" fill-opacity="0.92"/>
  <text x="174" y="193" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">Edge POP</text>
  <text x="232" y="187" font-size="12.5" font-weight="700" fill="currentColor">CloudFront cache · Lambda@Edge · GA</text>
  <text x="232" y="204" font-size="10.5" fill="currentColor" opacity="0.62">TLS terminate, cache, anycast IP</text>
  <line x1="360" y1="212" x2="360" y2="230" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#np1Arr)"/>
  <text x="372" y="226" font-size="10" fill="currentColor" opacity="0.6">AWS backbone (private fiber)</text>
  <rect x="120" y="232" width="480" height="42" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
  <rect x="132" y="242" width="84" height="22" rx="11" fill="#f59e0b" fill-opacity="0.92"/>
  <text x="174" y="257" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">Backbone</text>
  <text x="232" y="259" font-size="11.5" fill="currentColor" opacity="0.85">private fiber giữa edge và region — ít jitter/loss</text>
  <line x1="360" y1="274" x2="360" y2="292" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#np1Arr)"/>
  <rect x="120" y="294" width="480" height="46" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
  <rect x="132" y="306" width="84" height="22" rx="11" fill="#8b5cf6" fill-opacity="0.92"/>
  <text x="174" y="321" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">VPC</text>
  <text x="232" y="315" font-size="12.5" font-weight="700" fill="currentColor">ALB / API Gateway</text>
  <text x="232" y="332" font-size="10.5" fill="currentColor" opacity="0.62">entry point vào region</text>
  <line x1="360" y1="340" x2="360" y2="358" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#np1Arr)"/>
  <text x="372" y="354" font-size="10" fill="currentColor" opacity="0.6">ENI / VPC endpoint</text>
  <rect x="120" y="360" width="480" height="42" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
  <rect x="132" y="370" width="84" height="22" rx="11" fill="#3b82f6" fill-opacity="0.9"/>
  <text x="174" y="385" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">ENI</text>
  <text x="232" y="387" font-size="11.5" fill="currentColor" opacity="0.85">ENI / VPC endpoint — private path tới service</text>
  <line x1="360" y1="402" x2="360" y2="420" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#np1Arr)"/>
  <rect x="180" y="422" width="360" height="40" rx="10" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="447" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">EC2 · Lambda · DB</text>
</svg>

Mỗi hop là cơ hội tối ưu.

---

## 3. Route 53 — DNS

### 3.1 Routing policies

| Policy | Use case |
|--------|----------|
| **Simple** | 1 record → 1 IP |
| **Weighted** | Phân % traffic giữa các target (A/B testing, canary) |
| **Latency-based** | Route đến region với latency thấp nhất từ resolver |
| **Geolocation** | Theo continent/country/state |
| **Geoproximity** | Theo bias số dương/âm quanh location (cần Route 53 Traffic Flow) |
| **Failover** | Primary + secondary, healthcheck-based |
| **Multivalue** | Trả nhiều IP (giống simple nhưng có healthcheck) |
| **IP-based** | Theo CIDR client (mới) |

### 3.2 TTL trade-off
- TTL thấp (60s): failover nhanh, nhưng nhiều DNS query → cost cao + tải resolver.
- TTL cao (1 ngày): cache lâu, query ít, nhưng failover chậm.

### 3.3 Healthcheck
- Endpoint, calculated (gộp nhiều check), CloudWatch alarm.
- Latency 30s default. Tăng frequency = $$$.
- **Combine với failover routing** → DR pattern cơ bản.

### 3.4 Private hosted zone
- DNS internal cho VPC. Không expose ra internet.
- Cần `enableDnsHostnames + enableDnsSupport`.
- Resolver endpoints để query Route 53 từ on-prem hoặc ngược lại.

---

## 4. CloudFront — CDN

### 4.1 Cơ bản
- 600+ POP toàn cầu.
- Origin: S3, ALB, EC2, custom HTTP, MediaPackage…
- **Cache key**: URL + selected headers/cookies/query strings.
- TTL: từ Cache-Control của origin hoặc CloudFront behavior.

### 4.2 Cache behaviors
- Path pattern → behavior khác nhau (TTL, origin, viewer protocol policy).
- Vd: `/api/*` không cache, `/static/*` cache 1 năm.

### 4.3 Origin Shield
- Extra cache layer **trước** origin.
- Use case: origin đắt (Lambda@Edge, dynamic), hoặc multi-region origin.
- Giảm origin request 50-80%.
- Có cost extra.

### 4.4 Lambda@Edge vs CloudFront Functions

| Aspect | CloudFront Functions | Lambda@Edge |
|--------|---------------------|-------------|
| Runtime | JavaScript (cfront-js) | Node.js / Python |
| Memory | 2 MB | 128 MB - 10 GB |
| Execution time | < 1 ms | < 5s (viewer) / 30s (origin) |
| Trigger | Viewer request/response | Viewer + Origin request/response |
| Use case | URL rewrite, header manipulation, JWT validate | Heavier logic, S3 routing, AB test |
| Cost | $$ (~$0.10/1M) | $$$ (~$0.60/1M + duration) |

### 4.5 Optimizations
- **Compression**: enable Gzip/Brotli → reduce payload 70%.
- **HTTP/2 + HTTP/3 (QUIC)**: multiplex, less RTT.
- **TLS 1.3**: 1-RTT handshake (vs 2-RTT TLS 1.2).
- **Cache invalidation**: tốn tiền sau 1000 invalidation/tháng. Prefer versioned filename (`app-v123.js`).
- **Signed URL / Signed Cookie**: cho private content.
- **OAC (Origin Access Control)** thay OAI cũ: secure S3 origin.

### 4.6 Khi nào dùng CloudFront
- Static assets toàn cầu.
- Video on demand (HLS/DASH manifest cache).
- API GET cacheable.
- WebSocket: chỉ một số case (CloudFront hỗ trợ WebSocket nhưng không cache).

### 4.7 Khi nào **không** dùng CloudFront
- Traffic chỉ trong 1 region, dataset nhỏ: thêm complexity không xứng.
- Realtime push, ultra-low-latency interactive: dùng Global Accelerator hoặc AppSync.

---

## 5. Global Accelerator (GA)

### 5.1 Khác CloudFront thế nào

| Aspect | CloudFront | Global Accelerator |
|--------|------------|-------------------|
| Layer | L7 (HTTP) | L4 (TCP/UDP) |
| Caching | Có | Không |
| Anycast IP | Không | 2 static anycast IP |
| Failover speed | Phụ thuộc TTL DNS | < 1 giây |
| Use case | Web content cacheable | Non-HTTP (TCP/UDP), low latency dynamic, gaming, voice |

### 5.2 Cách hoạt động
- User → AWS edge POP gần nhất (anycast IP).
- Edge → AWS backbone (private fiber) → endpoint region.
- Giảm jitter, packet loss so với public internet.

### 5.3 Use case
- Multi-region failover ALB / NLB. (DNS TTL không kịp → GA failover nhanh hơn.)
- Game server UDP.
- IoT device cần static IP.
- Whitelist IP cho enterprise client (chỉ 2 static IP).

### 5.4 CloudFront vs GA quick

- HTTP cacheable → **CloudFront**.
- HTTP dynamic non-cacheable cross-region → **CloudFront có Dynamic Acceleration**, **hoặc GA**.
- TCP/UDP non-HTTP → **GA**.
- Cần static IP → **GA**.

### 5.5 Route 53 failover vs Global Accelerator — chọn cái nào cho multi-region failover

Cả hai đều "chuyển traffic từ region hỏng sang region lành", nhưng **điểm chuyển hướng khác nhau**: Route 53 chuyển ở tầng **phân giải tên** (client phải hỏi DNS lại mới biết), Global Accelerator chuyển ở tầng **edge POP** (client vẫn giữ nguyên IP, không cần hỏi lại gì).

| Tiêu chí | Route 53 failover | Global Accelerator |
|---|---|---|
| Cơ chế chuyển hướng | Đổi record trả về khi health check fail | Đổi endpoint phía sau **2 static anycast IP** — IP client dùng không đổi |
| Thời gian thực tế tới khi client đi đúng chỗ | Thời gian health check phát hiện lỗi **+ TTL của record + cache của resolver + cache DNS của client** | Thời gian health check phát hiện lỗi; sau đó chuyển hướng gần như tức thì vì không có bước resolve lại |
| Health check | Route 53 health check (interval 30s chuẩn, 10s nếu bật fast) | Health check tới endpoint (ALB/NLB/EIP/EC2) của accelerator |
| Hoạt động với non-HTTP (TCP/UDP thuần, game, VoIP, MQTT) | Có, nhưng vẫn là DNS nên vẫn dính TTL | Có — GA làm việc ở L4 |
| Cho client cần **IP tĩnh để whitelist firewall** | Không — record trỏ tới DNS name của ALB, IP thay đổi | **Có** — 2 anycast IP cố định suốt vòng đời accelerator |
| Chi phí | Rẻ: tiền hosted zone + query + health check | Phí cố định theo giờ cho mỗi accelerator (~$0.025/h) + phí data transfer premium theo GB |
| Bẫy | Client cache DNS quá TTL (một số cấu hình JVM cache vĩnh viễn (`networkaddress.cache.ttl=-1`), nhiều SDK/OS cũng cache riêng) → hạ TTL xuống 60s vẫn có client kẹt ở IP chết | GA **không cache** nội dung; đặt GA trước origin static không giúp gì so với CloudFront |

**Khi nào bắt buộc phải là Global Accelerator** (đề mô tả một trong các ý này thì Route 53 là đáp án sai):

- Đề nói khách hàng/đối tác phải **whitelist IP cố định** trong firewall của họ.
- Protocol **không phải HTTP**: UDP game server, VoIP/SIP, MQTT, custom TCP.
- Yêu cầu failover **"gần như tức thì" / "không phụ thuộc DNS TTL" / "client không kiểm soát được"** (thiết bị IoT, set-top box, app cũ cache DNS).
- Cần **client affinity theo source IP** cho session TCP dài.

**Khi nào Route 53 failover là đủ (và rẻ hơn)**: web app HTTP mà client là trình duyệt (trình duyệt tôn trọng TTL tương đối tốt), RTO đo bằng phút chứ không phải giây, hoặc DR kiểu pilot light / backup-restore nơi vài phút DNS chẳng đáng gì so với thời gian khôi phục stack.

> Khi cần **quyết định failover bằng tay, không để health check tự bật tắt** (tránh flapping trong sự cố lớn), Route 53 **Application Recovery Controller** cho "routing control" — công tắc On/Off chạy trên data plane 5 region, bật/tắt được kể cả khi control plane region chính đang lỗi.

---

## 6. Hạ tầng edge & hybrid compute — Outposts, Local Zones, Wavelength

CloudFront và Global Accelerator chỉ đưa **điểm vào mạng** lại gần user; compute vẫn nằm trong Region. Khi đề nói "app phải chạy gần user/gần máy móc, latency single-digit millisecond" hoặc "dữ liệu không được rời khỏi toà nhà", thì phải đẩy **chính compute** ra ngoài Region. Đó là nhóm Outposts / Local Zones / Wavelength.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 250" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Phổ hạ tầng AWS từ Region ra tới datacenter khách hàng</title>
  <desc>Trục ngang từ xa user tới gần user. Region chứa compute đầy đủ. Local Zone đặt ở metro lớn, chạy EC2 và EBS, latency vài mili giây tới user trong metro. Wavelength Zone nằm trong datacenter nhà mạng 5G, traffic từ thiết bị di động không rời mạng carrier. Outposts là rack AWS đặt ngay trong datacenter khách hàng, dùng khi cần data residency hoặc nói chuyện với hệ thống on-premises. CloudFront và Global Accelerator nằm ở edge POP nhưng chỉ đưa điểm vào mạng lại gần, không chạy workload của bạn.</desc>
  <text x="16" y="22" font-size="14" font-weight="700" fill="currentColor">Compute nằm ở đâu — từ Region ra tới DC khách hàng</text>
  <line x1="30" y1="200" x2="694" y2="200" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="30" y="222" font-size="10.5" fill="currentColor" opacity="0.6">xa user · service đầy đủ nhất</text>
  <text x="694" y="222" font-size="10.5" text-anchor="end" fill="currentColor" opacity="0.6">gần user / gần máy móc · service hạn chế</text>
  <rect x="24" y="52" width="150" height="128" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <rect x="36" y="64" width="78" height="20" rx="10" fill="#3b82f6" fill-opacity="0.9"/>
  <text x="75" y="78" font-size="10" font-weight="700" text-anchor="middle" fill="#fff">Region</text>
  <text x="36" y="104" font-size="11" font-weight="700" fill="currentColor">AWS Region / AZ</text>
  <text x="36" y="122" font-size="10" fill="currentColor" opacity="0.65">mọi service, nhiều AZ</text>
  <text x="36" y="138" font-size="10" fill="currentColor" opacity="0.65">mặc định cho mọi thứ</text>
  <text x="36" y="160" font-size="10" fill="currentColor" opacity="0.5">latency: hàng chục ms</text>
  <rect x="190" y="52" width="150" height="128" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <rect x="202" y="64" width="98" height="20" rx="10" fill="#10b981" fill-opacity="0.92"/>
  <text x="251" y="78" font-size="10" font-weight="700" text-anchor="middle" fill="#fff">Local Zone</text>
  <text x="202" y="104" font-size="11" font-weight="700" fill="currentColor">metro lớn</text>
  <text x="202" y="122" font-size="10" fill="currentColor" opacity="0.65">EC2, EBS, ALB, FSx…</text>
  <text x="202" y="138" font-size="10" fill="currentColor" opacity="0.65">AWS quản hạ tầng</text>
  <text x="202" y="160" font-size="10" fill="currentColor" opacity="0.5">latency: vài ms trong metro</text>
  <rect x="356" y="52" width="150" height="128" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <rect x="368" y="64" width="106" height="20" rx="10" fill="#8b5cf6" fill-opacity="0.92"/>
  <text x="421" y="78" font-size="10" font-weight="700" text-anchor="middle" fill="#fff">Wavelength</text>
  <text x="368" y="104" font-size="11" font-weight="700" fill="currentColor">trong DC nhà mạng 5G</text>
  <text x="368" y="122" font-size="10" fill="currentColor" opacity="0.65">traffic không rời carrier</text>
  <text x="368" y="138" font-size="10" fill="currentColor" opacity="0.65">chỉ cho client 5G</text>
  <text x="368" y="160" font-size="10" fill="currentColor" opacity="0.5">AR/VR, xe kết nối, IoT 5G</text>
  <rect x="522" y="52" width="172" height="128" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <rect x="534" y="64" width="92" height="20" rx="10" fill="#f59e0b" fill-opacity="0.92"/>
  <text x="580" y="78" font-size="10" font-weight="700" text-anchor="middle" fill="#fff">Outposts</text>
  <text x="534" y="104" font-size="11" font-weight="700" fill="currentColor">rack AWS trong DC bạn</text>
  <text x="534" y="122" font-size="10" fill="currentColor" opacity="0.65">data residency tại chỗ</text>
  <text x="534" y="138" font-size="10" fill="currentColor" opacity="0.65">nói chuyện hệ thống on-prem</text>
  <text x="534" y="160" font-size="10" fill="currentColor" opacity="0.5">control plane vẫn ở Region</text>
  <text x="30" y="242" font-size="10.5" fill="currentColor" opacity="0.7">CloudFront / Global Accelerator: ở edge POP nhưng CHỈ đưa điểm vào mạng lại gần — workload của bạn vẫn ở Region.</text>
</svg>

### 6.1 Bảng chọn hạ tầng edge

| Hạ tầng | Đặt ở đâu | Chạy được gì | Khi nào chọn | Từ khoá đề | Bẫy |
|---|---|---|---|---|---|
| **AWS Outposts** (rack 42U hoặc server 1U/2U) | Trong datacenter / nhà máy / cửa hàng **của khách hàng**, AWS giao và vận hành | EC2, EBS, S3 on Outposts, ECS/EKS, RDS, ElastiCache, ALB (tập con service) | Dữ liệu **bắt buộc ở lại tại chỗ** vì luật/hợp đồng; app phải nói chuyện với hệ thống on-prem (SCADA, máy sản xuất, mainframe) ở latency dưới mili giây | "data residency", "không được rời khỏi cơ sở", "kết nối tới hệ thống cũ trong nhà máy", "cùng API/công cụ như AWS nhưng on-prem" | Vẫn cần **service link** ổn định về home Region: mất link thì instance đang chạy vẫn chạy nhưng **control plane (tạo/xoá instance, API) ngừng dùng được**. Không phải giải pháp "chạy hoàn toàn offline". Capacity là hữu hạn và mua trước — không co giãn vô hạn như Region |
| **Local Zones** | Cơ sở của AWS đặt ở **trung tâm đô thị lớn**, là phần mở rộng của một parent Region (tên dạng `us-west-2-lax-1a`) | EC2, EBS, và một tập con service (thường có ALB, FSx) — không phải mọi service | Cần **single-digit millisecond** tới user hoặc tới on-prem trong chính metro đó, nhưng **không muốn tự quản rack** | "user ở thành phố X cần độ trễ vài ms", "media/game rendering", "ML inference gần user", "app on-prem chưa migrate được cần latency thấp tới AWS" | Thường chỉ có **một zone** (vài Local Zone như LA có 2) → gần như không có HA đa AZ trong Local Zone; muốn bền phải kết hợp với parent Region. Service thiếu thì phải gọi ngược về parent Region (thêm latency) |
| **AWS Wavelength** | **Bên trong datacenter của nhà mạng** ở rìa mạng 5G (tên zone dạng `us-east-1-wl1-…`) | EC2, EBS và một tập con rất hẹp | Client là **thiết bị di động trên mạng 5G** của chính carrier đó, và cần latency cực thấp | "5G", "mobile edge computing", "AR/VR trên điện thoại", "xe kết nối", "nhà máy thông minh qua 5G" | Chỉ hưởng lợi khi traffic **đi qua mạng của carrier đó** — user trên Wi-Fi/cáp quang không được lợi gì. Không phải cách làm web app toàn cầu nhanh hơn |
| **CloudFront edge location** | 600+ POP toàn cầu | Chỉ CloudFront Functions / Lambda@Edge, không phải app của bạn | Nội dung **HTTP cacheable**, TLS terminate gần user | "static content", "video", "cache", "toàn cầu" | Không chạy được workload nặng/stateful ở edge |
| **Global Accelerator edge** | Cùng mạng edge POP | Không chạy code — chỉ là điểm vào anycast | Non-HTTP, IP tĩnh, failover nhanh (xem 5.5) | "static IP", "UDP", "failover không phụ thuộc DNS" | Không cache |

### 6.2 Phân biệt nhanh khi đọc đề

- Đề nhắc **quy định/luật/dữ liệu không được rời cơ sở** → **Outposts**. Local Zones và Wavelength là hạ tầng của AWS/telco, không giải quyết bài toán data residency trong toà nhà của khách.
- Đề nhắc **một thành phố cụ thể + vài mili giây + không muốn quản hạ tầng** → **Local Zones**.
- Đề nhắc **5G / carrier / thiết bị di động** → **Wavelength**. Thấy chữ "5G" gần như luôn là Wavelength.
- Đề nhắc **cache / static asset / video toàn cầu** → **CloudFront**, không phải nhóm trên.
- Đề nhắc **IP tĩnh hoặc TCP/UDP + failover nhanh** → **Global Accelerator**.
- Đề nhắc **thiết bị rời rạc ở nơi không có mạng ổn định, cần xử lý cục bộ rồi đồng bộ sau** → đó là bài toán của **Snowball Edge / IoT Greengrass**, không phải Outposts (xem [[ch2-05-migration-transfer]]).

---

## 7. VPC networking

### 7.1 VPC endpoints — tránh internet

| Type | Service | Cost |
|------|---------|------|
| **Gateway endpoint** | S3, DynamoDB | Free |
| **Interface endpoint (PrivateLink)** | Most AWS services + 3rd-party | $0.01/h per AZ + data |

→ Traffic giữa VPC và service đi qua **private AWS network**, không qua NAT GW → tiết kiệm NAT data charge + giảm latency.

### 7.2 NAT Gateway

- $0.045/h + **$0.045/GB processed**.
- Cho instance trong private subnet ra internet.
- **1 NAT GW per AZ** cho HA.
- Nếu chỉ cần access S3/DynamoDB → dùng **Gateway endpoint** (free), không cần NAT cho traffic đó.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Truy cập S3/DynamoDB: Gateway endpoint so với đi qua NAT Gateway</title>
  <desc>So sánh hai đường tới S3 hoặc DynamoDB. Đường trên qua NAT Gateway rồi Internet Gateway ra internet, tính phí data và đi qua mạng công cộng. Đường dưới qua VPC Gateway endpoint đi thẳng trên mạng riêng AWS, miễn phí và bảo mật hơn.</desc>
  <defs>
    <marker id="ge1" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <text x="16" y="22" font-size="14" font-weight="700" fill="currentColor">EC2 (private subnet) → S3 / DynamoDB: hai đường</text>
  <rect x="14" y="38" width="80" height="56" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="54" y="62" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">EC2</text>
  <text x="54" y="79" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.62">private</text>
  <rect x="690" y="120" width="16" height="0" fill="none"/>
  <rect x="600" y="118" width="104" height="56" rx="10" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="652" y="142" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">S3 / DynamoDB</text>
  <text x="652" y="159" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.62">AWS service</text>
  <text x="16" y="46" font-size="10.5" fill="#f59e0b" opacity="0.95" font-weight="700">CÁCH CŨ</text>
  <rect x="150" y="40" width="120" height="46" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="210" y="60" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">NAT Gateway</text>
  <text x="210" y="76" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.65">$/h + $/GB</text>
  <rect x="320" y="40" width="120" height="46" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="380" y="60" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Internet GW</text>
  <text x="380" y="76" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.65">ra public internet</text>
  <rect x="478" y="40" width="120" height="46" rx="9" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 3"/>
  <text x="538" y="60" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Internet</text>
  <text x="538" y="76" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.65">mạng công cộng</text>
  <line x1="94" y1="58" x2="146" y2="60" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#ge1)"/>
  <line x1="270" y1="63" x2="316" y2="63" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#ge1)"/>
  <line x1="440" y1="63" x2="474" y2="63" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#ge1)"/>
  <path d="M598 60 C 640 60 652 90 652 116" fill="none" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#ge1)"/>
  <text x="300" y="104" font-size="10" fill="#f59e0b" opacity="0.95">tính phí data · đi qua internet</text>
  <text x="16" y="200" font-size="10.5" fill="#10b981" opacity="0.95" font-weight="700">CÁCH ĐÚNG</text>
  <rect x="240" y="194" width="220" height="50" rx="10" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
  <rect x="252" y="206" width="120" height="22" rx="11" fill="#10b981" fill-opacity="0.92"/>
  <text x="312" y="221" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">Gateway endpoint</text>
  <text x="386" y="222" font-size="10.5" font-weight="700" fill="currentColor">FREE</text>
  <text x="350" y="240" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.62">route table → endpoint, không cần NAT</text>
  <path d="M70 94 C 70 220 130 219 236 219" fill="none" stroke="#10b981" stroke-opacity="0.65" marker-end="url(#ge1)"/>
  <path d="M460 219 C 560 219 600 200 642 176" fill="none" stroke="#10b981" stroke-opacity="0.65" marker-end="url(#ge1)"/>
  <text x="250" y="270" font-size="10" fill="#10b981" opacity="0.95">private AWS network · miễn phí · không qua internet</text>
  <text x="250" y="286" font-size="9.5" fill="currentColor" opacity="0.6">(data through endpoint $0.01/GB; gateway endpoint không tính phí endpoint)</text>
</svg>

### 7.3 Enhanced Networking

- **ENA**: tới 100 Gbps. Default cho modern instance.
- **EFA**: low latency, HPC, MPI.
- **Placement Group Cluster**: low intra-cluster latency.

### 7.4 Jumbo frames
- MTU 9001 (vs 1500 default) trong VPC (cùng AZ và peered VPC).
- Tăng throughput cho bulk transfer (giảm header overhead).
- **Không** ra internet với MTU > 1500.

### 7.5 VPC Peering vs Transit Gateway

| Aspect | VPC Peering | Transit Gateway (TGW) |
|--------|-------------|----------------------|
| Topology | 1-1 | Hub-and-spoke |
| Transitive routing | Không | Có |
| Cross-region | Có (inter-region peering) | Có (peering attachment) |
| Số VPC | Pairwise → O(n²) | O(n) |
| Cost | Data transfer | $0.05/h per attachment + data |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 330" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>VPC Peering (full mesh) so với Transit Gateway (hub-and-spoke)</title>
  <desc>Bên trái: bốn VPC nối peering từng cặp 1-1 tạo full mesh với 6 kết nối, không transitive routing, số kết nối tăng O(n bình phương). Bên phải: bốn VPC cùng gắn vào một Transit Gateway ở giữa theo hub-and-spoke, có transitive routing, chỉ 4 kết nối, tăng tuyến tính O(n).</desc>
  <text x="180" y="24" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">VPC Peering — full mesh</text>
  <text x="540" y="24" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Transit Gateway — hub-and-spoke</text>
  <line x1="360" y1="40" x2="360" y2="300" stroke="currentColor" stroke-opacity="0.15"/>
  <g stroke="#3b82f6" stroke-opacity="0.55" fill="none" stroke-width="1.5">
    <line x1="90" y1="90" x2="270" y2="90"/>
    <line x1="90" y1="230" x2="270" y2="230"/>
    <line x1="90" y1="90" x2="90" y2="230"/>
    <line x1="270" y1="90" x2="270" y2="230"/>
    <line x1="90" y1="90" x2="270" y2="230"/>
    <line x1="270" y1="90" x2="90" y2="230"/>
  </g>
  <g>
    <circle cx="90" cy="90" r="26" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="90" y="94" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">VPC A</text>
    <circle cx="270" cy="90" r="26" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="270" y="94" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">VPC B</text>
    <circle cx="90" cy="230" r="26" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="90" y="234" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">VPC C</text>
    <circle cx="270" cy="230" r="26" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="270" y="234" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">VPC D</text>
  </g>
  <text x="180" y="288" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.78">4 VPC → 6 kết nối · O(n²)</text>
  <text x="180" y="306" font-size="10.5" text-anchor="middle" fill="#f59e0b" opacity="0.95">không transitive (A↛C qua B)</text>
  <g stroke="#10b981" stroke-opacity="0.6" fill="none" stroke-width="1.5">
    <line x1="450" y1="100" x2="540" y2="160"/>
    <line x1="630" y1="100" x2="540" y2="160"/>
    <line x1="450" y1="220" x2="540" y2="160"/>
    <line x1="630" y1="220" x2="540" y2="160"/>
  </g>
  <rect x="498" y="138" width="84" height="44" rx="10" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.32"/>
  <text x="540" y="158" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Transit GW</text>
  <text x="540" y="173" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.65">hub</text>
  <g>
    <circle cx="450" cy="100" r="24" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="450" y="104" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">VPC A</text>
    <circle cx="630" cy="100" r="24" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="630" y="104" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">VPC B</text>
    <circle cx="450" cy="220" r="24" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="450" y="224" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">VPC C</text>
    <circle cx="630" cy="220" r="24" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="630" y="224" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">VPC D</text>
  </g>
  <text x="540" y="288" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.78">4 VPC → 4 attachment · O(n)</text>
  <text x="540" y="306" font-size="10.5" text-anchor="middle" fill="#10b981" opacity="0.95">transitive routing (A↔C qua hub)</text>
</svg>

> Quy tắc: ≤ 5 VPC dùng peering. ≥ 10 VPC dùng TGW.

### 7.6 PrivateLink

- Expose service từ **VPC provider** sang **VPC consumer** qua ENI private.
- Use case: SaaS multi-tenant, share service nội bộ giữa account.
- Consumer không cần biết IP/route của provider.

---

## 8. Hybrid network — on-prem ↔ AWS

### 8.1 Site-to-Site VPN

- IPsec qua internet.
- Setup: phút.
- Throughput: ~1.25 Gbps per tunnel (2 tunnel per VPN connection).
- Latency: phụ thuộc internet route, jitter.
- Cost: $0.05/h + data egress.
- Use case: dev, backup, low-traffic.

### 8.2 Direct Connect (DX)

- Physical fiber từ on-prem → AWS DX location.
- Throughput: 1, 10, 100 Gbps.
- Latency thấp, predictable.
- Setup: tuần - tháng (physical install).
- Cost: port + data egress (rẻ hơn internet egress).
- HA: cần 2 DX ở 2 location khác nhau, hoặc DX + VPN backup.

### 8.3 DX Gateway
- Cho phép 1 DX kết nối nhiều VPC ở nhiều region.

### 8.4 Khi nào DX vs VPN

| Yêu cầu | Chọn |
|---------|------|
| Throughput > 1 Gbps consistent | DX |
| Latency predictable, low jitter | DX |
| Setup nhanh, traffic thấp | VPN |
| HA cao | DX × 2 hoặc DX + VPN backup |
| Compliance "no internet" | DX |

### 8.5 Cloud WAN (mới)
- AWS managed WAN cho enterprise multi-region multi-VPC + on-prem.
- Higher-level abstraction trên TGW.

---

## 9. Bandwidth & egress cost

| Path | Cost (US) |
|------|-----------|
| Internet egress (first 10TB) | $0.09/GB |
| CloudFront egress | $0.085/GB (US), thấp hơn ở vài region |
| Cross-region (US ↔ US) | $0.02/GB |
| Cross-region (cross-continent) | $0.02-0.09/GB |
| Cross-AZ trong region | $0.01/GB each way |
| Same-AZ private IP | Free |
| To/from VPC endpoint | Free (data through endpoint $0.01/GB) |

> 💡 Egress là **cost trap** lớn nhất. Mỗi GB từ AWS ra internet đắt gấp 30 lần lưu trữ trên S3 Standard. Trước khi mở firehose egress, tính tiền.

### Cost optimization patterns

1. **CloudFront trước S3/ALB**: edge cache rẻ hơn origin egress + giảm origin load.
2. **VPC Gateway endpoint cho S3/DynamoDB**: bỏ NAT GW data charge.
3. **Cross-AZ traffic**: tối ưu cluster placement, dùng zonal-aware routing.
4. **CloudFront Reserved Capacity**: discount nếu commit > 10 TB/tháng.
5. **Compression**: enable mọi nơi (CloudFront, ALB, app-level).

---

## 10. API Gateway performance

### 10.1 Types

| Type | Protocol | Use case |
|------|----------|----------|
| **REST API** | HTTP | Feature-rich, validate, transform, API keys |
| **HTTP API** | HTTP | ~70% rẻ hơn REST, simple use case, JWT |
| **WebSocket API** | WebSocket | Realtime |

### 10.2 Optimization
- **Caching**: enable per stage, TTL configurable. Reduce backend load.
- **Throttling**: per-API key, per-stage. Bảo vệ backend.
- **Regional vs Edge-optimized**: edge route qua CloudFront mạng AWS — tốt cho global client. Regional cho client cùng region.
- **Private API**: chỉ accessible từ VPC.

---

## 11. App Mesh / Service Mesh

- Sidecar (Envoy proxy) per service.
- Cung cấp: traffic shifting, retry policy, circuit breaker, mTLS, observability.
- Use case: microservice phức tạp, cần fine-grained traffic control.
- AWS App Mesh đang phase-out (announcement 2024), chuyển sang VPC Lattice.

### VPC Lattice (mới)
- AWS native service-to-service connectivity, no sidecar.
- Cross-VPC, cross-account.
- Replace cho App Mesh + một số PrivateLink case.

---

## 12. Ví dụ design network cho 4 use case

### 12.1 SaaS web app, user toàn cầu, B2C
- Route 53 latency-based → 2 region (us-east-1, eu-west-1).
- CloudFront trước ALB ở mỗi region.
- WAF integrated với CloudFront.
- ACM certificate.
- Aurora Global Database, write us-east-1.

### 12.2 Game server realtime UDP
- Global Accelerator → NLB → EC2 fleet (instance store cho state).
- Static anycast IP cho client.
- 2 region failover qua GA.

### 12.3 Enterprise hybrid
- Direct Connect 10 Gbps × 2 (HA, 2 DX location).
- Transit Gateway hub.
- VPC endpoints cho S3/DynamoDB (tránh NAT cost).
- VPN backup.

### 12.4 Multi-account organization
- Transit Gateway shared via Resource Access Manager (RAM).
- Centralized egress qua security account.
- PrivateLink expose shared service.

---

## 13. Cạm bẫy đề thi (SAA)

1. **"CloudFront cache POST"** → **Không**, chỉ cache GET/HEAD (và OPTIONS). POST đi thẳng origin.
2. **"Global Accelerator có cache"** → **Sai**.
3. **"Route 53 failover < 1 giây"** → **Sai**, phụ thuộc DNS TTL + client cache. Nhanh hơn dùng GA.
4. **"Gateway endpoint S3 mất tiền"** → **Sai**, free. Interface endpoint mới tốn.
5. **"NAT Gateway cần thiết để EC2 truy cập S3"** → **Sai** nếu dùng Gateway endpoint S3.
6. **"Direct Connect encrypt mặc định"** → **Sai**, là L2 fiber. Cần MACsec (option) hoặc IPsec qua DX.
7. **"VPC Peering transitive"** → **Sai**. Nếu A↔B và B↔C, A không thể đến C qua B. Dùng TGW.
8. **"HTTP API có WAF"** → **Sai** (chưa support gốc, cần workaround qua CloudFront).
9. **"CloudFront và GA dùng cùng underlay"** → AWS backbone giống nhau, nhưng GA expose anycast IP, CloudFront là HTTP cache.

---

## 14. Tóm tắt 1 dòng

> Đẩy content ra **edge** (CloudFront) cho static, dùng **AWS backbone** (Global Accelerator, VPC endpoint, DX) cho dynamic / private. Egress là cost trap — design để minimize cross-AZ, cross-region, và internet egress.

---

## 15. Bài tập tự kiểm tra

1. Web app deploy us-east-1, user VN báo chậm. CloudFront giải quyết bao nhiêu trong các vấn đề: (a) DNS, (b) TLS handshake, (c) TTFB dynamic, (d) static asset?
2. NAT Gateway hóa đơn $5000/tháng, 90% traffic là S3 read. Action?
3. So sánh failover speed: Route 53 failover routing (TTL 60s) vs Global Accelerator. Tại sao GA nhanh hơn?
4. App 10 microservice trong 5 VPC khác account. Cần communicate full mesh. Chọn peering hay TGW hay Lattice? Vì sao?
5. Enterprise cần kết nối 4 datacenter on-prem với AWS, traffic 500 Mbps mỗi DC, latency < 5ms. VPN hay DX? Setup thế nào HA?
6. CloudFront cache hit rate 40%. Liệt kê 5 hành động cụ thể để tăng hit rate.

---

## 16. Đọc thêm

- AWS Whitepaper — *AWS Networking Overview*, *Best Practices for VPC Design*.
- AWS Builder's Library — nhiều bài về *Workload isolation*, *Caching*.
- AWS docs — *CloudFront developer guide*, *Global Accelerator developer guide*.
- *High Performance Browser Networking* — Ilya Grigorik (kinh điển về HTTP/TLS/TCP).

---

**Chương 2 hoàn thành.** Tiếp theo: chương 3 — Design Secure Architectures.
