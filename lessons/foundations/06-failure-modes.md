# Foundations 06 — Failure Modes & Cascading Failures

> Mục tiêu: Hiểu **các kiểu chết** của hệ phân tán mà naive design không xử lý được — retry storm, thundering herd, cascading failure — và các pattern phòng vệ (circuit breaker, backoff, bulkhead, load shedding). Đây là kiến thức tách biệt một "junior cloud engineer" khỏi "senior architect".

Tiền đề: [[01-cap-theorem]], [[03-replication-and-quorum]], [[04-latency-vs-consistency]].

---

## 1. Câu chuyện mở đầu — Sự cố "Black Friday" tưởng tượng

12h trưa Black Friday. Site bạn chạy bình thường, RDS 50% CPU, app 60%.

12h00m30s: 1 trong 3 EC2 chết.
- ALB redirect traffic sang 2 EC2 còn lại.
- 2 EC2 này giờ load 90%.
- Latency tăng 100ms → 500ms.

12h01m00s: User refresh vì chậm.
- QPS x2.
- 2 EC2 đầy → request queue → latency 5s.
- ALB health check timeout → đánh 1 EC2 là unhealthy.

12h01m30s: 1 EC2 còn lại nhận **toàn bộ traffic**.
- CPU 100%, OOM, restart.
- Trong lúc restart, request rớt.
- Client retry → traffic vào ALB tăng x10 (retry storm).

12h02m00s: ASG launch instance mới (mất 3 phút bootstrap).
- 3 phút không có capacity → toàn site down.

12h05m00s: Instance mới lên.
- Nhưng RDS connection pool đã exhausted vì old instance không close connection sạch.
- DB CPU 100%.
- Lambda timeout → SQS DLQ tràn → alert pager loạn.

→ **Single instance failure → site down 10 phút.** Đây là **cascading failure**, và nó **bình thường** trong mọi hệ phân tán không thiết kế chống.

---

## 2. Các kiểu failure cơ bản

| Loại | Mô tả | Ví dụ AWS |
|------|-------|-----------|
| **Crash failure** | Node chết hẳn, không response | EC2 hardware fail |
| **Omission failure** | Drop message ngẫu nhiên | Network packet loss |
| **Timing failure** | Response trễ vượt deadline | DB query chậm |
| **Byzantine failure** | Trả response **sai** (bit flip, malicious) | Hiếm, nhưng có; Aurora dùng checksum |
| **Partial failure** | Một số request thành công, một số fail | Khu vực 1 AZ degraded |
| **Gray failure** | Service "có vẻ" sống nhưng performance kém | EBS volume IOPS giảm âm thầm |

**Gray failure** là khó debug nhất. Health check 200 OK, nhưng p99 latency 5s. Đây là lý do health check cần check **performance**, không chỉ liveness.

---

## 3. Cascading failure — anatomy

Cascading failure xảy ra khi 1 failure → tạo điều kiện cho failure tiếp → snowball.

### 3.1 Retry storm
- Service B chậm.
- Service A timeout → retry.
- Mỗi user request giờ thành 3 backend request → B chịu 3x tải → càng chậm.
- A retry tiếp → B chết hẳn.

### 3.2 Thundering herd
- Cache key TTL expire cùng lúc.
- 1000 request đều miss cache cùng giây → 1000 request đập DB → DB chết.
- Hoặc: service restart → 1000 client cùng reconnect → restart server lại chết.

### 3.3 Connection pool exhaustion
- DB slow query → connection giữ lâu hơn.
- App vẫn nhận request → mở thêm connection.
- DB max_connections cap → app fail mở mới → trả 500 cho user.

### 3.4 Queue backup
- Producer ghi vào SQS nhanh, consumer xử lý chậm.
- Queue depth tăng.
- Visibility timeout expire → message reprocess → consumer càng quá tải.

### 3.5 Metastable failure
- Hệ thống vào trạng thái xấu mà tự nó **không thoát ra được** dù tải giảm. Cần can thiệp thủ công.
- Ví dụ: GC thrash → request chậm → retry tăng → GC nhiều hơn → vĩnh viễn không recover trừ khi restart.

---

## 4. Pattern phòng vệ

### 4.1 Retry với exponential backoff + jitter

❌ Sai: `for i in 1..3: retry()` ngay lập tức.
✅ Đúng: chờ `min(cap, base * 2^attempt) + random_jitter()`.

- **Backoff**: lần retry sau cách lần trước lâu hơn (2x, 4x, 8x…).
- **Jitter**: thêm random để 1000 client không retry cùng lúc (chống thundering herd).
- **Cap**: giới hạn max delay (vd 30s).

AWS SDK mặc định có exponential backoff cho hầu hết service.

> 📐 Công thức AWS khuyên dùng: `delay = random_between(0, min(cap, base * 2^attempt))` — "full jitter".

### 4.2 Circuit breaker

3 trạng thái:
- **Closed**: request đi qua bình thường.
- **Open**: ngắt mạch, fail-fast ngay (không gọi downstream). Sau N giây → half-open.
- **Half-open**: cho 1-2 request thử. Thành công → close. Fail → open lại.

→ Ngăn cascading failure: nếu B chết, A không phí thời gian gọi nữa, fail nhanh, free up resource.

**AWS**: không có service "circuit breaker" sẵn (trừ App Mesh, Istio nếu dùng service mesh). Thường implement trong code (Hystrix kiểu cũ, resilience4j, AWS SDK retry config).

### 4.3 Timeout aggressive

❌ Default `connect timeout = 30s, read timeout = 60s` → quá lâu, giữ connection chết.
✅ Set timeout **ngắn hơn upstream**. Vd: nếu Lambda timeout 6s, gọi DynamoDB nên timeout 1s.

Quy tắc: **timeout phải có**, default vô hạn là bug.

### 4.4 Bulkhead

Tên gọi từ tàu thủy: chia khoang để 1 khoang ngập không chìm cả tàu.

- Tách thread pool / connection pool theo loại request.
- Vd: critical path (checkout) dùng pool riêng; non-critical (recommend) pool khác. Recommend chết không kéo checkout chết.
- **AWS**: tách Lambda, tách ASG, tách DB read replica theo workload.

### 4.5 Load shedding

Khi quá tải, **chủ động** từ chối 1 số request thay vì cố xử lý hết → chết cả.

- Trả 503 nhanh cho low-priority request.
- Giữ capacity cho high-priority (logged-in user > anonymous).
- **AWS**: API Gateway throttling, ALB target group threshold.

### 4.6 Hedged request

Cho 1 user request → gửi đồng thời tới 2 replica, dùng response đến trước, cancel cái kia.

- Giảm p99 latency (loại bỏ slow tail).
- Tốn x2 backend resource → chỉ dùng khi tail latency thực sự đau.
- DynamoDB SDK có thể bật.

### 4.7 Health check 2 tầng

- **Shallow** (liveness): "process còn sống?" → restart nếu fail.
- **Deep** (readiness): "có thể serve request thật?" → bỏ khỏi LB nếu fail (nhưng không restart).

ALB / Target Group: nên check deep, nhưng không gọi downstream DB trong check (recursive failure).

### 4.8 Idempotency

Retry chỉ an toàn khi operation **idempotent**: gọi 2 lần = gọi 1 lần.

- `GET` luôn idempotent.
- `PUT` thường idempotent.
- `POST` **không** mặc định → cần `Idempotency-Key`.

DynamoDB `TransactWriteItems` có `ClientRequestToken`. Stripe API có `Idempotency-Key`. Lambda + SQS có **message deduplication** trong FIFO queue.

### 4.9 Chaos engineering

Chủ động inject failure trong production-like → tìm cascading failure trước khi user tìm thấy.

- **AWS Fault Injection Service** (FIS): kill EC2, throttle DB, drop network.
- Netflix Chaos Monkey là ông tổ.
- Quy tắc: bắt đầu small (1 instance, off-peak), monitor kỹ, có rollback.

---

## 5. Map vào AWS — built-in protections

| Pattern | AWS service làm sẵn |
|---------|---------------------|
| Backoff + jitter | AWS SDK mặc định |
| Throttling | API Gateway, AWS WAF rate limit |
| Circuit breaker | App Mesh, AWS SDK (retry config) |
| Bulkhead | ALB target group / weighted routing, separate ASG |
| Health check | ALB, Route 53, ASG |
| Idempotency | SQS FIFO dedup, DynamoDB `ClientRequestToken` |
| Load shedding | ALB / NLB target unhealthy, throttle 4xx |
| Chaos testing | AWS FIS |
| Auto-recovery | EC2 Auto Recovery, ASG Replace Unhealthy |

---

## 6. Anti-pattern thường thấy

### 6.1 Retry vô hạn
```python
while True:
    try: call(); break
    except: continue  # 🔥 retry storm guaranteed
```
**Fix**: max attempts + exponential backoff + jitter.

### 6.2 Synchronous chain dài
A → B → C → D, mỗi gọi sync.
- Một service chậm → toàn chain chậm.
- Latency cộng dồn.
- 1 fail → cả chain fail.

**Fix**: chuyển sang async (SQS, EventBridge) ở những chỗ không cần response ngay.

### 6.3 Cache stampede
TTL 60s, cache miss → 1000 request đập DB.

**Fix**:
- Stale-while-revalidate: trả stale data trong khi 1 request refresh background.
- Lock: chỉ 1 request được refresh cache, các request khác chờ.
- TTL với jitter (60s ± 10s) để không expire cùng lúc.

### 6.4 Tight coupling
Service A "gọi" service B trực tiếp. B down → A down.

**Fix**: event-driven. A publish event, B subscribe. B down → event tích lại trong queue, không kéo A chết.

### 6.5 Không có circuit breaker → cả mesh cùng chết
Microservice A,B,C,D,E. C chết. A,B,D,E vẫn cố gọi C → tốn thread, queue đầy → A,B,D,E lần lượt chết.

**Fix**: circuit breaker ở mọi outbound call.

### 6.6 Health check gọi DB
Mỗi 5s, 100 instance, mỗi check 1 query → 2000 QPS chỉ cho healthcheck. DB chậm → health check fail → instance bị remove → traffic dồn vào ít hơn → DB chậm hơn → cascading.

**Fix**: health check không gọi downstream. Cache trạng thái downstream với TTL.

---

## 7. Số RPO/RTO và availability — toán cơ bản

| Service | Uptime |
|---------|--------|
| 99% | 3.65 ngày down/năm |
| 99.9% ("three nines") | 8.76h |
| 99.95% | 4.38h |
| 99.99% ("four nines") | 52.6 phút |
| 99.999% ("five nines") | 5.26 phút |

**Composite availability**: nếu 2 service phụ thuộc nhau (cả 2 phải up), availability = A1 × A2.
- 99.99% × 99.99% × 99.99% × 99.99% = **99.96%**. 4 services 99.99% chain lại được 99.96%.

→ Hệ thống có nhiều dependency → đừng hứa nines cao trừ khi mỗi component có nhiều nines hơn nữa.

**RPO** (Recovery Point Objective): mất tối đa bao nhiêu data?
**RTO** (Recovery Time Objective): bao lâu thì up lại?

| Strategy | RPO | RTO | Cost |
|----------|-----|-----|------|
| Backup & restore | Giờ | Giờ | $ |
| Pilot light | Phút | 10s phút | $$ |
| Warm standby | Giây | Phút | $$$ |
| Active-active | ~0 | ~0 | $$$$ |

(Bài [[04-latency-vs-consistency]] đã đi sâu trade-off này.)

---

## 8. Ví dụ — design defenses cho 3 use case

### 8.1 API public-facing
- API Gateway throttle theo API key.
- Lambda concurrency limit per function (bulkhead).
- DynamoDB on-demand (không lo RCU/WCU).
- Circuit breaker cho mọi outbound (gọi 3rd-party).
- WAF rate-based rule chặn bot.

### 8.2 Payment processing
- SQS FIFO với dedup (idempotency).
- Lambda xử lý → outbound call payment provider có retry + circuit breaker.
- Outbox pattern: ghi DB + queue trong cùng transaction.
- DLQ + alarm khi message vào DLQ.

### 8.3 Internal microservice mesh
- App Mesh / Istio cho circuit breaker, retry policy.
- mTLS để defend giả mạo.
- Health check 2 tầng.
- Chaos testing hàng tuần với AWS FIS.

---

## 9. Cạm bẫy đề thi (SAA)

1. **"Multi-AZ = không bao giờ down"** → **Sai**. Multi-AZ giảm RPO/RTO không phải 0. Cascading failure có thể vẫn xảy ra (xem mục 1).
2. **"Auto Scaling fix mọi vấn đề scale"** → **Sai**. Scale-out mất phút (bootstrap). Burst traffic vẫn drop. Cần buffer trước (warm pool, pre-warmed capacity).
3. **"DLQ là giải pháp"** → DLQ là **placeholder cho bug**, không phải fix. Cần monitor + alarm + root cause.
4. **"Retry là an toàn"** → Chỉ nếu **idempotent**. POST tạo order 2 lần = 2 đơn.
5. **"Health check pass = service healthy"** → Gray failure: pass health nhưng latency cao. Cần monitor p99 ngoài health check.
6. **"99.99% × 99.99% = 99.99%"** → **Sai**, ~99.98%. Composite availability giảm theo dependency count.

---

## 10. Tóm tắt 1 dòng

> Hệ phân tán **luôn fail** — câu hỏi chỉ là "fail thế nào". Defense in depth: timeout, retry với jitter, circuit breaker, bulkhead, idempotency, chaos testing. **Không có defense = cascading failure chỉ là vấn đề thời gian.**

---

## 11. Bài tập tự kiểm tra

1. Hệ thống của bạn có 5 microservice, mỗi cái SLA 99.95%. Composite SLA là bao nhiêu? Nếu cần 99.99% end-to-end, làm gì?
2. Bạn thấy DLQ tăng đều đặn 100 msg/h. Hành động đầu tiên là gì? (Không phải "tăng worker".)
3. Cache TTL 5 phút. Bạn quan sát mỗi 5 phút DB CPU spike. Vì sao? 3 cách fix?
4. Lambda gọi DynamoDB throttle, retry. Sau 10 phút, DynamoDB OK nhưng Lambda vẫn lỗi. Nguyên nhân có thể? (≥2 nguyên nhân)
5. Bạn dùng SQS standard. Consumer đọc message, xử lý 5 phút, ack. Visibility timeout mặc định 30s. Vấn đề gì xảy ra?
6. Service A gọi B đồng bộ. B response p50=50ms, p99=2s. A có timeout 5s. Tại sao A vẫn có thể chết khi B chậm?

---

## 12. Đọc thêm

- *Release It!* — Michael Nygard (kinh điển về stability patterns).
- AWS Builder's Library — gần như **mọi bài** đều liên quan: *Timeouts, retries, and backoff with jitter*, *Avoiding fallback in distributed systems*, *Workload isolation*, *Caching challenges and strategies*, *Implementing health checks*.
- *Google SRE Book* — chương về cascading failures, overload, addressing failure.
- Marc Brooker (AWS) blog — nhiều bài về metastable failure & feedback loops.
- AWS Well-Architected — Reliability Pillar.

---

**Chúc mừng!** Bạn đã hoàn thành 6 bài foundations về distributed systems. Giờ khi vào SAA-C03, mỗi service bạn học sẽ "có chỗ đứng" trong khung tư duy CAP / consistency / replication / partition / failure mode — thay vì memorize rời rạc.

**Đề xuất bài tiếp**: trở lại course CLF-C02 finish (nếu chưa xong), hoặc bắt đầu series SAA chuyên sâu — *Reliability Pillar*, *Performance Pillar*, *Security Pillar* của AWS Well-Architected.
