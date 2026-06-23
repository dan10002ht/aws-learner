# Foundations 04 — Latency vs Consistency: Vì sao Multi-Region khó

> Mục tiêu: Hiểu **tại sao** "active-active global, strong consistency" gần như không tồn tại, và đọc đề SAA về Multi-Region đủ tinh để không sa bẫy "deploy mọi thứ ở mọi region".

Tiền đề: [[foundations-01-cap-theorem]] (PACELC), [[foundations-02-consistency-models]], [[foundations-03-replication-and-quorum]] (quorum cost).

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 250" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Latency budget của một request user-facing khoảng 200ms</title>
  <desc>Thanh ngang chia một budget 200ms thành các chặng: User đến edge, edge đến region, LB đến app, app đến DB same-AZ; chặng cross-region 60 đến 200ms tô nổi bật vì ăn gần hết budget.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Latency budget ~200ms cho một request user-facing</text>
  <g font-size="11" fill="currentColor">
    <text x="16" y="50" opacity="0.7">0ms</text>
    <text x="688" y="50" text-anchor="end" opacity="0.7">~200ms (giới hạn "đẹp")</text>
  </g>
  <g>
    <rect x="16" y="58" width="84" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="58" y="74" font-size="11" font-weight="600" text-anchor="middle" fill="currentColor">User→edge</text>
    <text x="58" y="88" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">10-30ms</text>
    <rect x="104" y="58" width="150" height="34" rx="6" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="179" y="74" font-size="11" font-weight="600" text-anchor="middle" fill="currentColor">Edge→region</text>
    <text x="179" y="88" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">20-100ms</text>
    <rect x="258" y="58" width="46" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="281" y="71" font-size="10" font-weight="600" text-anchor="middle" fill="currentColor">LB→app</text>
    <text x="281" y="86" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">~5ms</text>
    <rect x="308" y="58" width="56" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="336" y="71" font-size="10" font-weight="600" text-anchor="middle" fill="currentColor">App→DB</text>
    <text x="336" y="86" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">1-5ms (AZ)</text>
  </g>
  <text x="16" y="120" font-size="11" fill="currentColor" opacity="0.7">Chỉ cần MỘT lần đi DB cross-region:</text>
  <g>
    <rect x="16" y="128" width="672" height="42" rx="7" fill="#f59e0b" fill-opacity="0.18" stroke="#f59e0b" stroke-opacity="0.9" stroke-width="1.5"/>
    <rect x="24" y="138" width="58" height="22" rx="11" fill="#f59e0b" fill-opacity="0.95"/>
    <text x="53" y="153" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">App→DB</text>
    <text x="98" y="146" font-size="12.5" font-weight="700" fill="currentColor">cross-region: 60-200ms</text>
    <text x="98" y="163" font-size="11" fill="currentColor" opacity="0.75">→ một mình chặng này ăn gần hết budget 200ms</text>
  </g>
  <g>
    <rect x="16" y="186" width="672" height="46" rx="7" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="28" y="206" font-size="11.5" font-weight="600" fill="currentColor">Quy tắc 1: giữ hot path TRONG region.</text>
    <text x="28" y="223" font-size="11" fill="currentColor" opacity="0.78">Cross-region 2 lần (forward write + đợi quorum) → user phàn nàn. Để cross-region cho replication async / DR.</text>
  </g>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Bản đồ RTT xấp xỉ giữa các AWS region so với cross-AZ</title>
  <desc>Năm region AWS (us-east-1, us-west-2, eu-west-1, ap-southeast-1, ap-northeast-1) với RTT giữa chúng từ 70 đến 220ms, đối lập với cross-AZ trong cùng region chỉ 1 đến 2ms.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">RTT giữa các AWS region (xấp xỉ)</text>
  <g stroke="currentColor" fill="none">
    <line x1="150" y1="150" x2="120" y2="270" stroke-opacity="0.3"/>
    <line x1="150" y1="150" x2="430" y2="90" stroke-opacity="0.3"/>
    <line x1="150" y1="150" x2="560" y2="250" stroke-opacity="0.3"/>
    <line x1="430" y1="90" x2="560" y2="250" stroke-opacity="0.3"/>
    <line x1="560" y1="250" x2="620" y2="120" stroke-opacity="0.3"/>
  </g>
  <g font-size="10.5" fill="currentColor" opacity="0.8">
    <rect x="100" y="200" width="44" height="17" rx="8" fill="currentColor" fill-opacity="0.08"/>
    <text x="122" y="212" text-anchor="middle">~70ms</text>
    <rect x="258" y="108" width="44" height="17" rx="8" fill="currentColor" fill-opacity="0.08"/>
    <text x="280" y="120" text-anchor="middle">~75ms</text>
    <rect x="318" y="192" width="50" height="17" rx="8" fill="#f59e0b" fill-opacity="0.18"/>
    <text x="343" y="204" text-anchor="middle">~220ms</text>
    <rect x="468" y="158" width="44" height="17" rx="8" fill="currentColor" fill-opacity="0.08"/>
    <text x="490" y="170" text-anchor="middle">~170ms</text>
    <rect x="588" y="178" width="44" height="17" rx="8" fill="currentColor" fill-opacity="0.08"/>
    <text x="610" y="190" text-anchor="middle">~70ms</text>
  </g>
  <g>
    <circle cx="150" cy="150" r="34" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="150" y="148" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">us-east-1</text>
    <text x="150" y="161" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.65">N. Virginia</text>
    <circle cx="120" cy="270" r="34" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="120" y="268" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">us-west-2</text>
    <text x="120" y="281" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.65">Oregon</text>
    <circle cx="430" cy="90" r="34" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="430" y="88" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">eu-west-1</text>
    <text x="430" y="101" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.65">Ireland</text>
    <circle cx="560" cy="250" r="36" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="560" y="244" font-size="9.5" font-weight="700" text-anchor="middle" fill="currentColor">ap-southeast-1</text>
    <text x="560" y="257" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.65">Singapore</text>
    <circle cx="640" cy="110" r="36" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="640" y="104" font-size="9.5" font-weight="700" text-anchor="middle" fill="currentColor">ap-northeast-1</text>
    <text x="640" y="117" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.65">Tokyo</text>
  </g>
  <g>
    <rect x="16" y="318" width="672" height="46" rx="7" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
    <rect x="28" y="330" width="80" height="22" rx="11" fill="#10b981" fill-opacity="0.95"/>
    <text x="68" y="345" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">cross-AZ</text>
    <text x="120" y="338" font-size="12" font-weight="700" fill="currentColor">~1-2ms trong cùng region</text>
    <text x="120" y="356" font-size="10.5" fill="currentColor" opacity="0.75">→ Multi-AZ "rẻ" về latency; Multi-Region "đắt" (70-220ms) — không chỉ tiền.</text>
  </g>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Spectrum kiến trúc Multi-Region theo trục RTO/RPO giảm và chi phí/độ phức tạp tăng</title>
  <desc>Sáu pattern xếp từ trái sang phải: Single-region, Pilot light, Warm standby, Active-passive, Active-active single-writer, Active-active multi-writer. Đi sang phải thì RTO và RPO giảm dần nhưng chi phí và độ phức tạp tăng vọt.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Spectrum kiến trúc Multi-Region</text>
  <g>
    <rect x="16" y="44" width="688" height="28" rx="6" fill="#f59e0b" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="28" y="62" font-size="11.5" font-weight="600" fill="currentColor">Chi phí &amp; độ phức tạp TĂNG</text>
    <text x="676" y="62" font-size="11.5" font-weight="600" text-anchor="end" fill="currentColor">RTO/RPO GIẢM →</text>
    <line x1="350" y1="58" x2="370" y2="58" stroke="currentColor" stroke-opacity="0.5"/>
    <path d="M676 50 l8 8 l-8 8" fill="none" stroke="currentColor" stroke-opacity="0.5"/>
  </g>
  <g font-size="10.5">
    <rect x="16" y="86" width="108" height="120" rx="7" fill="#3b82f6" fill-opacity="0.10" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="70" y="104" font-weight="700" text-anchor="middle" fill="currentColor">Single-region</text>
    <text x="70" y="118" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">(multi-AZ)</text>
    <text x="70" y="142" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">RTO 60-120s</text>
    <text x="70" y="156" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">RPO 0</text>
    <text x="70" y="186" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">phức tạp: thấp</text>

    <rect x="132" y="100" width="108" height="106" rx="7" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="186" y="118" font-weight="700" text-anchor="middle" fill="currentColor">Pilot light</text>
    <text x="186" y="132" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">(cold standby)</text>
    <text x="186" y="156" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">RTO 10-30 phút</text>
    <text x="186" y="170" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">RPO phút</text>
    <text x="186" y="194" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">phức tạp: TB</text>

    <rect x="248" y="114" width="108" height="92" rx="7" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="302" y="132" font-weight="700" text-anchor="middle" fill="currentColor">Warm standby</text>
    <text x="302" y="158" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">RTO vài phút</text>
    <text x="302" y="172" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">RPO giây</text>
    <text x="302" y="194" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">phức tạp: TB</text>

    <rect x="364" y="128" width="108" height="78" rx="7" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="418" y="146" font-weight="700" text-anchor="middle" fill="currentColor">Active-passive</text>
    <text x="418" y="160" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">(read in DR)</text>
    <text x="418" y="180" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">RTO vài phút</text>
    <text x="418" y="194" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">phức tạp: TB</text>

    <rect x="480" y="142" width="108" height="64" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="534" y="158" font-size="9.5" font-weight="700" text-anchor="middle" fill="currentColor">Active-active</text>
    <text x="534" y="170" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">single-writer</text>
    <text x="534" y="186" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">RTO/RPO giây</text>
    <text x="534" y="199" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.6">phức tạp: cao</text>

    <rect x="596" y="156" width="108" height="50" rx="7" fill="#8b5cf6" fill-opacity="0.18" stroke="#8b5cf6" stroke-opacity="0.8" stroke-width="1.5"/>
    <text x="650" y="172" font-size="9.5" font-weight="700" text-anchor="middle" fill="currentColor">Active-active</text>
    <text x="650" y="184" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">multi-writer (LWW)</text>
    <text x="650" y="199" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.65">phức tạp: RẤT cao</text>
  </g>
  <g>
    <rect x="16" y="222" width="688" height="44" rx="7" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="28" y="242" font-size="11.5" font-weight="600" fill="currentColor">Hầu hết workload thực tế chỉ cần Warm Standby là đủ.</text>
    <text x="28" y="259" font-size="11" fill="currentColor" opacity="0.78">Đừng tự nhảy lên Active-Active vì "nghe ngầu" — chi phí và độ phức tạp tăng vọt.</text>
  </g>
  <g font-size="10" fill="currentColor" opacity="0.6">
    <text x="16" y="288">Cột càng ngắn (sang phải) = RTO/RPO càng nhỏ; nhưng giá phải trả là chi phí + conflict càng lớn.</text>
  </g>
</svg>

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

**Bài tiếp theo**: [[foundations-05-partitioning-and-sharding]] — partition key DynamoDB, sharding RDS, hot partition và cách tránh.
