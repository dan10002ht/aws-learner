# Bài 17 — Route 53 + CloudFront + Global Accelerator

**Foundation:** [[foundations-04-latency-vs-consistency]] — vì sao multi-region khó.

## 1. Mục tiêu
- Thiết kế **edge layer** global low-latency.
- Route 53 7 policies + health check pattern.
- CloudFront cache strategy + signed URL + OAC.
- Global Accelerator khi nào dùng.

---

## 2. Route 53

### 2.1 Hosted Zones
- **Public** — Internet-facing.
- **Private** — resolve trong 1 hoặc nhiều VPC.
- **Reusable Delegation Set** — DNS name servers cố định khi tạo nhiều zone.

### 2.2 Records
- A, AAAA, CNAME, MX, NS, SOA, TXT, SRV, CAA, PTR.
- **Alias** (AWS proprietary):
  - **Free query** (CNAME tính phí).
  - Hỗ trợ **apex** (zone root như `example.com` — CNAME không hỗ trợ).
  - Target: CloudFront, ALB/NLB, S3 website, API Gateway, Beanstalk env, VPC Endpoint, Global Accelerator, Route 53 record cùng zone.

### 2.3 Routing Policies — 7 loại

| Policy | Use case | Health check? |
|--------|----------|---------------|
| **Simple** | 1 endpoint hoặc list (random round-robin) | Không |
| **Weighted** | A/B test, canary deploy | ✅ |
| **Latency** | Multi-region, route gần user nhất | ✅ |
| **Failover** | Primary + secondary (DR) | ✅ |
| **Geolocation** | Theo quốc gia user | ✅ |
| **Geoproximity** | Khoảng cách + bias (chỉ qua Traffic Flow) | ✅ |
| **Multi-value** | Up to 8 healthy records (poor LB) | ✅ |
| **IP-based** (2022) | Theo CIDR | ✅ |

### 2.4 Latency vs Geolocation
- **Latency** = AWS đo network latency từ user → region, route best. **Network reality**.
- **Geolocation** = lookup IP → quốc gia → route. **Compliance** (data GDPR Germany phải vào `eu-central-1`).

→ Đa số app dùng latency. Compliance dùng geolocation.

### 2.5 Health Checks
- HTTP/HTTPS/TCP từ Route 53 health checker (outside AWS).
- **Interval**: 30s standard, 10s fast (đắt hơn 5x).
- **Threshold**: 3 fail liên tiếp default.
- **Endpoint**: IP hoặc domain (cẩn thận DNS lookup trong check).
- **Calculated**: combine logic AND/OR multiple checks.
- **CloudWatch alarm**-based.
- Health check **không free** — $0.50/check/tháng (AWS endpoint), $0.75 (non-AWS endpoint).

### 2.6 Failover pattern
```
Primary record  → ALB region us-east-1 (health check ON)
Secondary record → ALB region us-west-2 (health check ON)
```
Khi primary fail → DNS trả secondary.

### 2.7 DNSSEC
- Sign DNS response chống cache poisoning.
- Bật ở hosted zone, KMS key cho ZSK.
- DS record register parent zone.

---

## 3. CloudFront

### 3.1 Components
- **Distribution** — config.
- **Origin** — S3, ALB/NLB, EC2 IP, MediaPackage, custom HTTP, Lambda Function URL.
- **Origin Group** — primary + failover.
- **Behaviors** — path pattern → origin + cache policy.
- **Edge Location** — > 400 PoP toàn cầu.
- **Regional Edge Cache** — mid-tier, lớn hơn Edge, cache lâu hơn.

### 3.2 Cache strategy
- **Cache Policy** — TTL, cache key (headers, query, cookies whitelist).
- **Origin Request Policy** — headers/query/cookies forward to origin.
- **Response Headers Policy** — add/modify headers in response.
- **Managed Policies** — AWS-provided sẵn (CachingOptimized, CachingDisabled, AllViewerExceptHostHeader...).

### 3.3 OAC (Origin Access Control) — replace OAI
- **OAI deprecated**, không hỗ trợ SSE-KMS, không SigV4.
- **OAC** — SigV4, hỗ trợ KMS, cross-account, all S3 features.
- Bucket policy condition `AWS:SourceArn = distribution ARN`.

### 3.4 Lambda@Edge vs CloudFront Functions

| | Lambda@Edge | CloudFront Functions |
|--|-------------|----------------------|
| Triggers | Viewer req/resp, Origin req/resp (4) | Viewer req/resp only (2) |
| Runtime | Node.js, Python | JS (V8) |
| Duration | Up to 5s viewer, 30s origin | < 1 ms |
| Memory | 128MB - 10GB | 2MB |
| Region | Edge (replicated regional) | Edge in-process |
| Cost | $0.60/M req + GB-s | **$0.10/M req** |
| Use case | URL rewrite phức tạp, header manipulation, A/B test, auth | Simple URL rewrite, header, redirect, cache key normalize |

→ Thử **CloudFront Functions** trước (rẻ + nhanh), fallback Lambda@Edge khi cần.

### 3.5 Signed URL / Signed Cookie
- **Signed URL** — 1 user, 1 file.
- **Signed Cookie** — 1 user, multiple file (toàn site private).
- Trusted signer: key pair từ CloudFront (legacy) hoặc **CloudFront Key Group** (new).
- Use case: paid content, video streaming, premium download.

### 3.6 Field-Level Encryption
- Encrypt sensitive field (credit card, SSN) tại CloudFront trước khi forward origin.
- Public key encrypt, only app server có private key decrypt.

### 3.7 Real-time Logs + Standard Logs
- **Standard** → S3, delay vài phút.
- **Real-time** → Kinesis Data Stream, < 1s.

### 3.8 Price Class
- **PriceClass_All** — mọi Edge.
- **PriceClass_200** — không SA, AU, NZ, Africa.
- **PriceClass_100** — chỉ US + EU.

→ Giảm cost nếu user vùng hẹp.

---

## 4. Global Accelerator

### 4.1 Đặc điểm
- **2 anycast static IP** routed qua AWS backbone.
- Layer 4 (TCP/UDP).
- Endpoint: ALB, NLB, EC2, EIP.
- Auto **health check + region failover** ms-scale.
- **Traffic Dial** + **Endpoint Weight** cho A/B test.

### 4.2 CloudFront vs Global Accelerator

| Feature | CloudFront | Global Accelerator |
|---------|-----------|---------------------|
| Layer | 7 (HTTP) | 4 (TCP/UDP) |
| Static IP | ❌ | ✅ |
| Cache | ✅ | ❌ |
| WAF | ✅ | ❌ |
| Edge compute | ✅ (Functions, Lambda@Edge) | ❌ |
| Failover speed | DNS (TTL-based) | **Sub-minute** anycast |
| Use case | Web static + dynamic | TCP/UDP game, IoT, VoIP, legacy app static IP |

### 4.3 Khi dùng cả 2
```
User → Global Accelerator → CloudFront (cache layer) → Origin
```
Game with HTTP API + UDP voice → CloudFront cho HTTP, GA cho UDP.

---

## 5. Pattern thiết kế global app

### 5.1 Standard global web app
```
User → Route 53 (latency) → CloudFront → ALB region → ASG
                              ↓
                           S3 origin (static)
```

### 5.2 Multi-region active-active
```
User → Route 53 (latency + health) → ┬→ ap-southeast-1: ALB → ECS → Aurora Global (reader)
                                      └→ us-east-1: ALB → ECS → Aurora Global (writer)
```

### 5.3 DR Pilot Light
```
User → Route 53 (failover) → Primary: us-east-1 (ALB + ASG + RDS Multi-AZ)
                            → Secondary: ap-southeast-1 (RDS Read Replica, ASG stopped)
                              Khi primary fail: promote replica, scale ASG, R53 failover.
```

### 5.4 Global TCP game
```
Player → Global Accelerator (2 anycast IP) → Region gần nhất
          ↓
        NLB region X → ECS Fargate game server
```

---

## 6. Tự kiểm tra

1. App cần global low-latency cho REST API + WebSocket. Edge layer?
   <details><summary>Đáp án</summary>**CloudFront** L7. WebSocket hỗ trợ. Add Global Accelerator nếu cần static IP.</details>

2. Game UDP global, player whitelist IP. Service?
   <details><summary>Đáp án</summary>**Global Accelerator** — UDP, 2 static anycast IP cho whitelist.</details>

3. CloudFront serve S3 private. Pattern đúng?
   <details><summary>Đáp án</summary>**OAC** (KHÔNG OAI cũ) + bucket policy condition `AWS:SourceArn`.</details>

4. Latency vs Geolocation routing — khi nào dùng cái nào?
   <details><summary>Đáp án</summary>**Latency** — đa số app, route gần user network. **Geolocation** — compliance (data residency GDPR), language/content theo nước.</details>

5. CloudFront edge JS rewrite URL đơn giản. Function nào?
   <details><summary>Đáp án</summary>**CloudFront Functions** — rẻ ($0.10/M), nhanh < 1ms. Lambda@Edge chỉ khi cần Node/Python hoặc full SDK.</details>

6. Premium video streaming, mỗi user view link riêng có hạn 1h?
   <details><summary>Đáp án</summary>**CloudFront Signed URL** với expires 1h.</details>

7. Toàn site private cho subscriber. Signed URL hay Cookie?
   <details><summary>Đáp án</summary>**Signed Cookie** — 1 lần authorize, mọi resource accessible. Signed URL phải sign mỗi file.</details>

8. Multi-region active-active web. DNS failover hay GA?
   <details><summary>Đáp án</summary>Active-active = traffic both region cùng lúc → **Route 53 latency** routing. Failover = primary/standby. GA = sub-minute failover L4, không cache.</details>

9. CloudFront origin ALB ở region đắt (US). User chủ yếu Asia. Cost saving?
   <details><summary>Đáp án</summary>**PriceClass_200** (skip SA/AU/NZ/Africa) hoặc move origin sang Asia region (Singapore/Tokyo) — egress Asia rẻ hơn US.</details>

10. Cần encrypt credit card field tại edge trước khi origin thấy. Service?
    <details><summary>Đáp án</summary>**CloudFront Field-Level Encryption** — public key encrypt tại edge, app server decrypt với private key.</details>

---

## 7. Đối chiếu GCP

| AWS | GCP |
|-----|-----|
| Route 53 | Cloud DNS |
| Route 53 routing policies | DNS routing policies (geo, weighted, failover) |
| Route 53 health check | (qua LB health check) |
| CloudFront | Cloud CDN (gắn HTTPS LB) |
| OAC | Signed URL with private bucket |
| Lambda@Edge | (gần như không có) — chỉ Cloud Run service workers |
| CloudFront Functions | Cloud CDN không có edge compute native — dùng **Cloud Run on edge** |
| Global Accelerator | **Global LB anycast** (built-in) |
| Field-Level Encryption | (không có native) |
| Signed Cookie | Signed Cookie (GCS) |
| Edge Location | GCP PoP |

**Bẫy:**
1. **GCP Global LB anycast built-in** — không cần thêm service. AWS phải **CloudFront** (L7) + **GA** (L4) tách biệt.
2. **CloudFront Functions vs Lambda@Edge** không có equivalent ở GCP. Edge compute GCP yếu hơn.
3. **GCP Cloud CDN** gắn LB, không standalone.

---

## 8. Lưu ý SAA

- **Alias record** free, hỗ trợ apex. CNAME tính phí + không apex.
- **Latency routing** — network. **Geolocation** — IP country.
- **Failover** primary/secondary. **Multi-value** poor LB up to 8.
- **Health check** $0.50-0.75/check/tháng.
- **CloudFront OAC** thay OAI.
- **Functions** < 1ms JS, **Lambda@Edge** Node/Python full SDK.
- **Signed URL** 1 file. **Signed Cookie** site.
- **Global Accelerator** L4 anycast, static IP, sub-minute failover.
- **CloudFront + GA** combo cho mixed L7 + L4.
- **PriceClass** giảm cost cho region hẹp.

## 9. Lưu ý đi làm

### Best practice
- **HTTPS-only**: redirect HTTP → HTTPS in CloudFront.
- **HSTS header** via Response Headers Policy.
- **WAF** trước ALB và CloudFront.
- **Cache key normalization** (lowercase, strip tracking params) qua Functions.
- **Origin Shield** giảm cache miss tăng hit ratio.
- **Real-time Logs** + Kinesis cho threat detection.
- **Route 53 PHZ + Resolver** cho hybrid DNS.
- **Multi-region** với Aurora Global + Route 53 latency failover.

### Anti-pattern
- ❌ CNAME apex → không hợp lệ DNS, dùng Alias.
- ❌ OAI cho S3 mới (deprecated).
- ❌ CloudFront origin EC2 IP cứng → dùng ALB.
- ❌ Cache GET với cookies/headers không cần → cache key explode, low hit ratio.
- ❌ Origin EC2 public không có SG chỉ accept CloudFront → bypass cache.
- ❌ Lambda@Edge dùng cho 1 line JS → Functions rẻ hơn 6x.

## 10. Foundations
- [[foundations-04-latency-vs-consistency]] — multi-region tradeoff. Edge cache reduce latency nhưng staleness là consistency loss.

## 11. Flashcard

- **Route 53** — DNS + 7 routing + domain registrar.
- **Alias** free + apex support.
- **Latency** network distance. **Geolocation** IP country.
- **Failover** primary/secondary. **Multi-value** 8 records.
- **Health check** $0.50+/check.
- **DNSSEC** cache poisoning prevention.
- **CloudFront** CDN edge cache.
- **OAC** > OAI (KMS, SigV4, cross-account).
- **CloudFront Functions** < 1ms, JS, viewer.
- **Lambda@Edge** 4 trigger, Node/Python.
- **Signed URL** 1 file. **Signed Cookie** site.
- **Field-Level Encryption** at edge.
- **Origin Shield** cache mid-tier.
- **Price Class** All/200/100.
- **Global Accelerator** L4 anycast 2 static IP.
- **CloudFront vs GA**: L7 cache vs L4 static IP.
- **PHZ** + **Resolver** = hybrid DNS.
