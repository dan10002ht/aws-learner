# Foundations 04 — Latency vs Consistency: Vì sao Multi-Region khó

> Mục tiêu: Hiểu **tại sao** "active-active global, strong consistency" gần như không tồn tại, và đọc đề SAA về Multi-Region đủ tinh để không sa bẫy "deploy mọi thứ ở mọi region".

Tiền đề: [[01-cap-theorem]] (PACELC), [[02-consistency-models]], [[03-replication-and-quorum]] (quorum cost).

---

## 1. Câu chuyện mở đầu — Bạn gửi tin Telegram cho người yêu ở Mỹ

Bạn ở Hà Nội, người yêu ở New York. Tin nhắn của bạn phải đi qua cáp quang ngầm dưới đáy Thái Bình Dương:

- **Khoảng cách**: ~13,000 km
- **Tốc độ ánh sáng trong sợi quang**: ~200,000 km/s (chậm hơn vacuum 33%)
- **Latency lý thuyết một chiều**: 13,000 / 200,000 = **65ms**
- **Round-trip thực tế**: ~180-220ms (do routing, switching, queueing)

Đây là **giới hạn vật lý**. Không có CDN, không có cache, không có money nào "mua nhanh hơn ánh sáng" được. Mọi quyết định kiến trúc multi-region đều phải sống chung với con số 100-200ms này.

---

## 2. Latency budget — bạn có bao nhiêu ms?

Một request HTTP user-facing "đẹp" tổng cộng < 200ms. Tách ra:

| Tầng | Latency điển hình |
|------|-------------------|
| User → edge (CDN/CloudFront) | 10-30ms |
| Edge → region | 20-100ms (tùy địa lý) |
| LB → app | < 5ms |
| App → DB (same AZ) | 1-5ms |
| App → DB (cross-AZ) | 1-10ms |
| App → DB (cross-region) | **60-200ms** |
| TLS handshake (lần đầu) | 1 RTT |

→ Nếu một request **cross-region 1 lần** đã ăn gần hết budget. Cross-region **2 lần** (vd: forward write + đợi quorum cross-region) → user sẽ phàn nàn.

**Quy tắc 1**: keep hot path **trong region**. Cross-region chỉ dành cho replication async hoặc DR.

---

## 3. RTT giữa các AWS region (xấp xỉ, 2024)

| From → To | RTT |
|-----------|-----|
| us-east-1 ↔ us-west-2 | ~70ms |
| us-east-1 ↔ eu-west-1 | ~75ms |
| us-east-1 ↔ ap-southeast-1 (Singapore) | ~220ms |
| ap-southeast-1 ↔ ap-northeast-1 (Tokyo) | ~70ms |
| eu-west-1 ↔ ap-southeast-1 | ~170ms |

So sánh: trong cùng region, **cross-AZ** chỉ ~1-2ms. Đó là lý do Multi-AZ "rẻ" còn Multi-Region "đắt" — không chỉ tiền, mà cả latency.

---

## 4. Spectrum kiến trúc Multi-Region

| Pattern | Write | Read | RPO | RTO | Latency | Phức tạp |
|---------|-------|------|-----|-----|---------|----------|
| **Single region (multi-AZ)** | Region chính | Region chính | 0 | 60-120s | Thấp | Thấp |
| **Pilot light** (cold standby) | Region chính | Region chính | Phút | 10-30 phút | Thấp khi normal | Trung bình |
| **Warm standby** | Region chính | Region chính | Giây | Vài phút | Thấp | Trung bình |
| **Active-passive** (read in DR) | Region chính | Cả 2 (eventual) | Giây | Vài phút | Read region phụ thấp | Trung bình |
| **Active-active single-writer** | Region chính | Cả 2 (eventual) | Giây | Giây | Read thấp mọi nơi | Cao |
| **Active-active multi-writer** | Cả 2 (LWW) | Cả 2 (eventual) | ~0 | ~0 | Thấp mọi nơi | **Rất cao** (conflict) |

Bạn càng đi xuống bảng, **chi phí và độ phức tạp tăng vọt**, đổi lại RTO/RPO giảm dần. **Hầu hết workload thực tế chỉ cần Warm Standby là đủ** — đừng tự nhảy lên Active-Active vì "nghe ngầu".

---

## 5. Map vào AWS

### 5.1 Database

| Service | Pattern hỗ trợ | Ghi chú |
|---------|----------------|---------|
| **RDS Cross-Region Read Replica** | Active-passive | Read eventual ở DR. Promote thủ công khi failover. |
| **Aurora Global Database** | Active-passive (single-writer) | Lag thường < 1s. RPO ~1s, RTO ~1 phút. Có Write Forwarding cho convenience. |
| **DynamoDB Global Tables** | Active-active multi-writer | Eventual + LWW. Counter dùng `ADD`. |
| **DocumentDB Global** | Active-passive | Tương tự Aurora Global. |
| **ElastiCache Global Datastore** | Active-passive | Cross-region replication cho Redis. |

### 5.2 Storage

| Service | Pattern |
|---------|---------|
| **S3 Cross-Region Replication (CRR)** | Async; có thể 2-chiều (bi-directional) → giống active-active eventual. |
| **S3 Multi-Region Access Points** | Route request đến bucket gần nhất, có failover automatic. |
| **EBS** | Không cross-region. Snapshot có thể copy cross-region (manual / scheduled). |
| **EFS** | Không cross-region native. Dùng DataSync. |
| **FSx** | Không native. Backup → copy. |

### 5.3 Networking & routing

| Service | Vai trò Multi-Region |
|---------|---------------------|
| **Route 53** | Failover routing, latency-based, geolocation, weighted. **Eventual** vì DNS TTL. |
| **CloudFront** | Edge caching gần user. Origin có thể là multi-region. |
| **Global Accelerator** | Anycast IP. Failover trong **giây** (nhanh hơn Route 53 vì không phụ thuộc DNS TTL). |
| **Transit Gateway peering** | Inter-region private network. |

### 5.4 Compute

| Service | Pattern Multi-Region |
|---------|---------------------|
| **EC2 / ASG** | Deploy độc lập mỗi region. CloudFormation/Terraform stack-set. |
| **Lambda** | Deploy mỗi region. Có "Lambda@Edge" / CloudFront Functions cho edge compute. |
| **ECS / EKS** | Cluster độc lập mỗi region. Service mesh (App Mesh, Istio) cho cross-region. |

---

## 6. Khi nào thực sự cần Multi-Region?

**Có lý do tốt:**
1. **Compliance / data residency**: EU users phải lưu data ở EU (GDPR).
2. **Latency-sensitive global users**: < 100ms cho user mọi châu lục → bắt buộc edge + regional read.
3. **Disaster recovery**: RTO/RPO hợp đồng yêu cầu (vd: ngân hàng RTO < 1h).
4. **AWS region outage history**: 1-2 lần/năm có region bị degrade. Nếu downtime > 1h là không chấp nhận được → Multi-Region.

**Lý do tệ:**
1. "Vì có thể" — cost x2, complexity x4, bug surface x10.
2. "CEO nói deploy global" — hỏi lại: SLA bao nhiêu? Bao nhiêu user ở đâu?
3. "Để impress investor" — đừng.

---

## 7. Bẫy active-active phổ biến

### 7.1 Stateful session
- User login ở us-east-1, session lưu trong Redis local us-east-1.
- Request tiếp theo route về eu-west-1 → không có session → bắt login lại.
- **Fix**: session stateless (JWT), hoặc replicate session store (ElastiCache Global Datastore, MemoryDB Multi-Region preview).

### 7.2 Sequential ID conflict
- 2 region cùng gán `order_id = max+1` → trùng.
- **Fix**: UUID, Snowflake ID (region prefix), hoặc DynamoDB conditional write.

### 7.3 Lost update với LWW
- us-east-1 update giá $100 lúc t=100ms.
- eu-west-1 update giá $200 lúc t=105ms.
- Replication chéo → cả 2 region cuối cùng thấy $200. **OK?**
- Nhưng nếu clock của us-east-1 lệch +200ms → us-east-1 nghĩ write của nó là t=300ms → **giá $100 thắng**. Mất update $200 không cảnh báo.
- **Fix**: dùng version counter / vector clock, hoặc đẩy phép tính giá vào 1 region duy nhất.

### 7.4 Read-your-writes xuyên region
- User update profile ở us-east-1, refresh ở eu-west-1 (vd: đang đi du lịch).
- Replication chưa kịp → user thấy profile cũ → phàn nàn.
- **Fix**: route user "sticky" theo region cho N giây sau write; hoặc đọc primary region cho session vừa write.

---

## 8. PACELC nhìn lại

Nhắc lại PACELC: **P**artition? chọn A/C. **E**lse? chọn L/C.

Bài này là về **vế Else**. Ngay cả khi mạng hoàn hảo, bạn vẫn phải trade L vs C mỗi ngày:

| Service | PACELC | Lý do |
|---------|--------|-------|
| Aurora Global (read region phụ) | PA / EL | Eventual ở reader → trade C để có L thấp |
| DynamoDB Global Tables | PA / EL | LWW, eventual, ưu tiên latency local |
| Aurora (read primary) | PC / EC | Luôn linearizable, chấp nhận latency cao |
| Spanner (không phải AWS) | PC / EC | Multi-region strong, nhưng latency > 100ms cho write |

→ Nếu thấy "low latency global write **and** strong consistency" trong đề thi — đây là **trick option**. Không có service AWS nào làm được đồng thời.

---

## 9. Tính cost — sự thật phũ phàng

| Thành phần | Cost adder Multi-Region |
|------------|------------------------|
| Compute (EC2/Lambda) | x2 region → cost gần x2 |
| Data transfer **cross-region** | $0.02/GB (us↔us), $0.09/GB (cross-continent) — đáng kể |
| Aurora Global Database | + storage region phụ + Global Database fee |
| DynamoDB Global Tables | +1 write per region (RW từ region phụ tốn write thêm) |
| S3 CRR | + storage region phụ + replication request + data transfer |
| CloudWatch / X-Ray | Mỗi region trả riêng |
| Engineering time | Khó định lượng, nhưng x2-x4 |

**Quy tắc 2**: trước khi propose Multi-Region, làm cost estimate. Nhiều khi 99.95% SLA single-region rẻ hơn 99.99% Multi-Region cả chục lần, và business không cần 99.99%.

---

## 10. Ví dụ chọn pattern cho 3 use case

### 10.1 SaaS B2B, user toàn cầu, write nhiều
- **Sai**: DynamoDB Global Tables active-active cho mọi bảng → mất update giá, conflict đơn hàng.
- **Đúng**: Routing user về region theo profile (us users → us-east-1). DynamoDB local + Global Tables **chỉ cho metadata read-mostly** (catalog, settings).

### 10.2 News site đọc-nhiều, ghi-ít
- **Đúng**: CloudFront + S3/Lambda@Edge. Origin Aurora Global (write 1 region). Cache aggressive.
- Multi-Region cho **read scale & latency**, không cần multi-writer.

### 10.3 Banking core
- **Đúng**: 1 region primary (Aurora Multi-AZ). 1 region DR (Aurora Global Database read-only, promote thủ công khi DR). RPO ~1s, RTO ~10 phút — đủ cho mọi ngân hàng trừ Tier-1 quốc tế.
- **Không** active-active. Compliance + audit + reconciliation sẽ là cơn ác mộng.

---

## 11. Cạm bẫy đề thi (SAA)

1. **"Active-active multi-region cho transaction database"** → 99% là **wrong answer**. Đáp án đúng thường là Aurora Global (single-writer) + Route 53 failover.
2. **"Route 53 failover < 1s"** → **Sai**. DNS TTL min 60s, client cache nữa. Muốn nhanh dùng **Global Accelerator**.
3. **"Multi-Region = 99.999% SLA"** → AWS không SLA composite. Bạn phải tự tính.
4. **"S3 CRR strong consistency"** → **Eventual**, không phải strong.
5. **"DynamoDB Global Tables RTO = 0"** → Read OK, nhưng app vẫn cần logic failover route writes.
6. **"Cross-region data transfer free in same AWS account"** → **Không**. Cross-region luôn tính tiền.

---

## 12. Tóm tắt 1 dòng

> **Vật lý đặt giới hạn**: light speed → 100-200ms cross-region. Bạn không thể có cả low-latency global write và strong consistency cùng lúc. Hầu hết hệ thống cần **single region + Multi-AZ + warm standby**, không cần active-active.

---

## 13. Bài tập tự kiểm tra

1. Hệ thống bạn có 99.95% SLA, single-region. Sếp muốn lên 99.99%. Hãy tính: cần loại Multi-Region pattern nào, và cost adder khoảng %?
2. Vì sao **Global Accelerator** failover nhanh hơn **Route 53** dù cùng làm DNS-level routing?
3. Một game realtime PvP. User ở us, jp, eu. Bạn host server ở đâu? Database ở đâu? Tại sao không Global Tables cho mọi bảng?
4. Aurora Global Database có Write Forwarding. Vì sao nó không giải quyết được vấn đề "active-active write"?
5. So sánh chi phí và RPO/RTO của: (a) Aurora Multi-AZ, (b) Aurora Multi-AZ + Cross-Region Read Replica, (c) Aurora Global Database.

---

## 14. Đọc thêm

- AWS Well-Architected — *Reliability Pillar* (Multi-Region patterns).
- AWS Whitepaper — *Disaster Recovery of Workloads on AWS*.
- Werner Vogels — *Distributed Systems Engineering* talks.
- *Designing Data-Intensive Applications* — chương 9.

---

**Bài tiếp theo**: [[05-partitioning-and-sharding]] — partition key DynamoDB, sharding RDS, hot partition và cách tránh.
