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

```
User
  ↓ DNS resolution
[Route 53 / CloudFront / Global Accelerator]
  ↓ Edge (POP gần user)
[CloudFront cache / Lambda@Edge / GA endpoint]
  ↓ AWS backbone (private fiber giữa region)
[VPC / ALB / API Gateway]
  ↓ ENI / VPC endpoint
[EC2 / Lambda / DB]
```

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

---

## 6. VPC networking

### 6.1 VPC endpoints — tránh internet

| Type | Service | Cost |
|------|---------|------|
| **Gateway endpoint** | S3, DynamoDB | Free |
| **Interface endpoint (PrivateLink)** | Most AWS services + 3rd-party | $0.01/h per AZ + data |

→ Traffic giữa VPC và service đi qua **private AWS network**, không qua NAT GW → tiết kiệm NAT data charge + giảm latency.

### 6.2 NAT Gateway

- $0.045/h + **$0.045/GB processed**.
- Cho instance trong private subnet ra internet.
- **1 NAT GW per AZ** cho HA.
- Nếu chỉ cần access S3/DynamoDB → dùng **Gateway endpoint** (free), không cần NAT cho traffic đó.

### 6.3 Enhanced Networking

- **ENA**: tới 100 Gbps. Default cho modern instance.
- **EFA**: low latency, HPC, MPI.
- **Placement Group Cluster**: low intra-cluster latency.

### 6.4 Jumbo frames
- MTU 9001 (vs 1500 default) trong VPC (cùng AZ và peered VPC).
- Tăng throughput cho bulk transfer (giảm header overhead).
- **Không** ra internet với MTU > 1500.

### 6.5 VPC Peering vs Transit Gateway

| Aspect | VPC Peering | Transit Gateway (TGW) |
|--------|-------------|----------------------|
| Topology | 1-1 | Hub-and-spoke |
| Transitive routing | Không | Có |
| Cross-region | Có (inter-region peering) | Có (peering attachment) |
| Số VPC | Pairwise → O(n²) | O(n) |
| Cost | Data transfer | $0.05/h per attachment + data |

> Quy tắc: ≤ 5 VPC dùng peering. ≥ 10 VPC dùng TGW.

### 6.6 PrivateLink

- Expose service từ **VPC provider** sang **VPC consumer** qua ENI private.
- Use case: SaaS multi-tenant, share service nội bộ giữa account.
- Consumer không cần biết IP/route của provider.

---

## 7. Hybrid network — on-prem ↔ AWS

### 7.1 Site-to-Site VPN

- IPsec qua internet.
- Setup: phút.
- Throughput: ~1.25 Gbps per tunnel (2 tunnel per VPN connection).
- Latency: phụ thuộc internet route, jitter.
- Cost: $0.05/h + data egress.
- Use case: dev, backup, low-traffic.

### 7.2 Direct Connect (DX)

- Physical fiber từ on-prem → AWS DX location.
- Throughput: 1, 10, 100 Gbps.
- Latency thấp, predictable.
- Setup: tuần - tháng (physical install).
- Cost: port + data egress (rẻ hơn internet egress).
- HA: cần 2 DX ở 2 location khác nhau, hoặc DX + VPN backup.

### 7.3 DX Gateway
- Cho phép 1 DX kết nối nhiều VPC ở nhiều region.

### 7.4 Khi nào DX vs VPN

| Yêu cầu | Chọn |
|---------|------|
| Throughput > 1 Gbps consistent | DX |
| Latency predictable, low jitter | DX |
| Setup nhanh, traffic thấp | VPN |
| HA cao | DX × 2 hoặc DX + VPN backup |
| Compliance "no internet" | DX |

### 7.5 Cloud WAN (mới)
- AWS managed WAN cho enterprise multi-region multi-VPC + on-prem.
- Higher-level abstraction trên TGW.

---

## 8. Bandwidth & egress cost

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

## 9. API Gateway performance

### 9.1 Types

| Type | Protocol | Use case |
|------|----------|----------|
| **REST API** | HTTP | Feature-rich, validate, transform, API keys |
| **HTTP API** | HTTP | ~70% rẻ hơn REST, simple use case, JWT |
| **WebSocket API** | WebSocket | Realtime |

### 9.2 Optimization
- **Caching**: enable per stage, TTL configurable. Reduce backend load.
- **Throttling**: per-API key, per-stage. Bảo vệ backend.
- **Regional vs Edge-optimized**: edge route qua CloudFront mạng AWS — tốt cho global client. Regional cho client cùng region.
- **Private API**: chỉ accessible từ VPC.

---

## 10. App Mesh / Service Mesh

- Sidecar (Envoy proxy) per service.
- Cung cấp: traffic shifting, retry policy, circuit breaker, mTLS, observability.
- Use case: microservice phức tạp, cần fine-grained traffic control.
- AWS App Mesh đang phase-out (announcement 2024), chuyển sang VPC Lattice.

### VPC Lattice (mới)
- AWS native service-to-service connectivity, no sidecar.
- Cross-VPC, cross-account.
- Replace cho App Mesh + một số PrivateLink case.

---

## 11. Ví dụ design network cho 4 use case

### 11.1 SaaS web app, user toàn cầu, B2C
- Route 53 latency-based → 2 region (us-east-1, eu-west-1).
- CloudFront trước ALB ở mỗi region.
- WAF integrated với CloudFront.
- ACM certificate.
- Aurora Global Database, write us-east-1.

### 11.2 Game server realtime UDP
- Global Accelerator → NLB → EC2 fleet (instance store cho state).
- Static anycast IP cho client.
- 2 region failover qua GA.

### 11.3 Enterprise hybrid
- Direct Connect 10 Gbps × 2 (HA, 2 DX location).
- Transit Gateway hub.
- VPC endpoints cho S3/DynamoDB (tránh NAT cost).
- VPN backup.

### 11.4 Multi-account organization
- Transit Gateway shared via Resource Access Manager (RAM).
- Centralized egress qua security account.
- PrivateLink expose shared service.

---

## 12. Cạm bẫy đề thi (SAA)

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

## 13. Tóm tắt 1 dòng

> Đẩy content ra **edge** (CloudFront) cho static, dùng **AWS backbone** (Global Accelerator, VPC endpoint, DX) cho dynamic / private. Egress là cost trap — design để minimize cross-AZ, cross-region, và internet egress.

---

## 14. Bài tập tự kiểm tra

1. Web app deploy us-east-1, user VN báo chậm. CloudFront giải quyết bao nhiêu trong các vấn đề: (a) DNS, (b) TLS handshake, (c) TTFB dynamic, (d) static asset?
2. NAT Gateway hóa đơn $5000/tháng, 90% traffic là S3 read. Action?
3. So sánh failover speed: Route 53 failover routing (TTL 60s) vs Global Accelerator. Tại sao GA nhanh hơn?
4. App 10 microservice trong 5 VPC khác account. Cần communicate full mesh. Chọn peering hay TGW hay Lattice? Vì sao?
5. Enterprise cần kết nối 4 datacenter on-prem với AWS, traffic 500 Mbps mỗi DC, latency < 5ms. VPN hay DX? Setup thế nào HA?
6. CloudFront cache hit rate 40%. Liệt kê 5 hành động cụ thể để tăng hit rate.

---

## 15. Đọc thêm

- AWS Whitepaper — *AWS Networking Overview*, *Best Practices for VPC Design*.
- AWS Builder's Library — nhiều bài về *Workload isolation*, *Caching*.
- AWS docs — *CloudFront developer guide*, *Global Accelerator developer guide*.
- *High Performance Browser Networking* — Ilya Grigorik (kinh điển về HTTP/TLS/TCP).

---

**Chương 2 hoàn thành.** Tiếp theo: chương 3 — Design Secure Architectures.
