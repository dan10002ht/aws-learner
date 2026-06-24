# Bài 6 — VPC (Virtual Private Cloud) & Networking cơ bản

## 1. Mục tiêu
Sau bài này bạn có thể:
- Thiết kế 1 VPC multi-AZ với public/private subnet.
- Phân biệt IGW vs NAT GW vs VPC Endpoint.
- Cấu hình Route Table, SG, NACL đúng.
- Hiểu Route 53, CloudFront, ELB (level CLF).
- Tránh các bẫy cost (NAT GW, cross-AZ).

---

## 2. Lý thuyết

### 2.0 Analogy — VPC như khu đô thị có cổng

| Khái niệm VPC | Trong khu đô thị | Ý nghĩa |
|---------------|--------------------|---------|
| **VPC** | Cả khu đô thị có tường rào | Mạng ảo isolated, 1 region. |
| **CIDR block** | Bản đồ địa chỉ nhà của khu | `10.0.0.0/16` = 65k địa chỉ. |
| **Subnet** | 1 dãy phố trong khu | Block IP nhỏ hơn, nằm trong 1 AZ. |
| **Public subnet** | Dãy phố mặt tiền có cổng ra đường lớn | Có route 0.0.0.0/0 → IGW. |
| **Private subnet** | Dãy phố trong ngõ | Không có route IGW. Chỉ ra Internet qua NAT. |
| **IGW (Internet Gateway)** | Cổng chính của khu đô thị (2 chiều) | Nối VPC ↔ Internet. |
| **NAT Gateway** | Cổng phụ "1 chiều" cho ngõ | Private subnet ra Internet OK, Internet vào KHÔNG. |
| **Route Table** | Bản đồ chỉ đường trên mỗi dãy phố | "Đi đâu thì rẽ cổng nào". |
| **Security Group** | Bảo vệ ngay trước nhà bạn | Stateful, allow-only, gắn ENI. |
| **NACL (Network ACL)** | Trạm gác đầu mỗi dãy phố | Stateless, có allow + deny, gắn subnet. |
| **VPC Peering** | Cầu nối 2 khu đô thị | Point-to-point, không transitive. |
| **Transit Gateway** | Vòng xuyến trung tâm nối nhiều khu | Hub-spoke, có transitive routing. |
| **VPC Endpoint (Gateway)** | Lối tắt riêng tới chợ S3 / DynamoDB | Không qua IGW, không tốn data transfer. |
| **VPC Endpoint (Interface)** | Quầy đại diện AWS service trong khu | ENI trong subnet bạn, đi qua PrivateLink. |
| **Direct Connect** | Đường hầm vật lý riêng tới datacenter công ty | Bandwidth lớn, không qua Internet. |
| **Site-to-Site VPN** | Đường hầm mã hoá qua Internet | Rẻ, nhanh setup. |
| **Flow Logs** | Camera ghi lại mọi xe ra/vào | Audit + troubleshoot. |

**Quy tắc vàng**: VPC = regional, subnet = AZ-bound. Đây là **bẫy #1** của người từ GCP qua AWS (GCP VPC global, subnet regional).

---

### 2.0.1 Câu chuyện — Startup mất $9,000 vì NAT Gateway và data transfer

**Tình huống**: Acme deploy microservices trên ECS. Architect mới thiết kế: 5 service đặt trong private subnet, mỗi service gọi S3 và DynamoDB. Mỗi service generate ~10TB request/tháng (logs, metrics, image processing).

#### Sai cách
1. **5 service trong private subnet** đi qua **1 NAT Gateway** để gọi `s3.ap-southeast-1.amazonaws.com`.
2. **NAT Gateway data processing fee**: **$0.045/GB**.
3. 50TB/tháng × $0.045 = **$2,250 chỉ riêng data processing NAT**.
4. Cộng **NAT Gateway hourly** $0.045 × 730h = $33.
5. Service gọi RDS ở **AZ khác** → cross-AZ data transfer **$0.01/GB inter-AZ** in + out → thêm $500.
6. CloudWatch Logs từ ECS → log endpoint cross-region (vì cấu hình sai) → **$0.09/GB** cross-region = thêm $5,000.

→ Tổng bill **$9,000/tháng cho data movement** mà không tạo value gì.

#### Đúng cách
1. **VPC Endpoint Gateway cho S3 & DynamoDB** — **FREE**, không qua NAT, không tốn data transfer trong region.
2. **VPC Endpoint Interface cho các AWS service khác** (Logs, KMS, Secrets) — $0.01/giờ + $0.01/GB nhưng vẫn rẻ hơn NAT nhiều.
3. **CloudWatch Logs trong same region** với app, không cross-region.
4. **Đặt RDS cùng AZ với app chính** (Multi-AZ vẫn OK, chỉ chú ý read traffic về primary).
5. **VPC Flow Logs** để monitor data flow, alert khi cross-AZ vượt threshold.
6. **Cost Explorer group by "Usage Type"** xem `DataTransfer-*` mỗi tháng.

→ Bill giảm từ $9k xuống **~$200/tháng**. Saving = 97%.

(Đây là **anti-pattern phổ biến nhất** về cost. NAT Gateway data processing fee là **silent killer** mà nhiều team không để ý đến khi audit.)

---

### 2.0.2 Use case map — Networking architectures

| Tình huống | Architecture | Lý do |
|------------|--------------|-------|
| Web app 3-tier truyền thống | Public subnet (ALB) + Private subnet (EC2/ECS) + Private subnet (RDS) | Standard pattern. |
| Microservices nội bộ không cần Internet | Tất cả Private subnet + VPC Endpoint cho AWS services | Không có NAT cost. |
| Lambda cần truy cập RDS trong VPC | Lambda trong VPC + ENI trong private subnet | Lambda VPC mode. |
| 2 VPC trong 1 account cần nói chuyện (vd dev ↔ shared services) | **VPC Peering** | Đơn giản nhất, point-to-point. |
| 10+ VPC cross-account, cross-region | **Transit Gateway** | Hub-spoke, scale tốt. |
| On-prem ↔ AWS thuần Internet | **Site-to-Site VPN** | Rẻ, encrypted IPsec. |
| On-prem ↔ AWS bandwidth lớn ổn định | **Direct Connect** | Cáp vật lý private, 1-100 Gbps. |
| User Internet → static site | CloudFront + S3 (no VPC) | Serverless. |
| User Internet → app | CloudFront → ALB (public) → EC2 (private) | DDoS protection từ Shield free. |
| Cho phép third-party access service của bạn | **PrivateLink (VPC Endpoint Service)** | Không expose qua Internet. |
| Multi-region active-active | VPC ở 2+ region + Route 53 latency-based routing | + DynamoDB Global Tables. |
| Compliance: tất cả traffic phải qua firewall | **AWS Network Firewall** đặt giữa subnet | Hoặc dùng appliance bên thứ ba. |

---

### 2.0.3 5 hiểu lầm phổ biến về VPC

1. **"Private subnet = không có Internet"** — SAI một phần. Private subnet **không có Internet inbound** (không gắn IGW). Nhưng nếu route table có 0.0.0.0/0 → NAT Gateway → vẫn **outbound Internet OK**. Nhiều bug security là vì dev tưởng private là isolated hoàn toàn, mà app trong đó vẫn `curl api.attacker.com` được.

2. **"Security Group là firewall của subnet"** — SAI. SG ở **instance level** (ENI), không phải subnet. **NACL** mới ở subnet level. SG stateful (return traffic auto cho qua), NACL stateless (phải khai báo cả inbound + outbound).

3. **"VPC Peering có thể nối nhiều VPC như mesh"** — SAI một phần. Peering chỉ **point-to-point**, **không transitive** (A-B peering + B-C peering KHÔNG cho A ↔ C). Muốn mesh thì dùng **Transit Gateway**.

4. **"Đổi CIDR của VPC sau khi tạo được"** — SAI. CIDR primary không đổi được. Chỉ thêm **secondary CIDR** (max 5 thêm). Plan CIDR cẩn thận từ đầu — vd `/16` cho VPC chính, chia `/20` cho subnet, để chừa chỗ cho expand.

5. **"NAT Gateway free, chỉ tốn data transfer"** — SAI nghiêm trọng. NAT Gateway tính **$0.045/giờ** (~$33/tháng/AZ) + **$0.045/GB** processing fee. 3 AZ × NAT = $100/tháng baseline trước khi data. Đây là 1 trong những **service tốn tiền âm thầm** nhất AWS. **VPC Endpoint Gateway (S3/DDB) free** — luôn dùng khi có thể.

---

### 2.1 VPC là gì
- **VPC** = mạng ảo isolated của bạn trong 1 region.
- Bạn chọn **CIDR block** (private IP range, RFC 1918): `10.0.0.0/16`, `172.16.0.0/16`, `192.168.0.0/16`.
- Max /16 (65k IP), min /28 (16 IP, nhưng AWS reserve 5 → còn 11 usable).
- 1 account default có **5 VPC per region** (soft limit).

### 2.2 Subnet
- Sub-CIDR trong VPC, **gắn 1 AZ cụ thể**.
- AWS **reserve 5 IP** mỗi subnet: `.0` network, `.1` VPC router, `.2` DNS, `.3` future, `.255` broadcast.
- Ví dụ subnet `10.0.1.0/24` → 256 IP, usable 251.
- **Public subnet** = subnet có route `0.0.0.0/0 → IGW`.
- **Private subnet** = no IGW route. Egress qua NAT GW.
- **Isolated subnet** = không có route ra Internet (DB tier, compliance).

### 2.3 Internet Gateway (IGW)
- 1 IGW per VPC, attach để có Internet access.
- Free.
- Subnet "public" = có route `0.0.0.0/0 → igw-xxx` **VÀ** instance có public IP.

### 2.4 NAT Gateway / NAT Instance
- **NAT GW** = managed NAT, đặt trong **public subnet**, instance private dùng để egress Internet.
- **AZ-specific** — muốn HA → 1 NAT GW / AZ.
- **Phí**: $0.045/h + **$0.045/GB processed** → workload lớn cost cao bất ngờ.
- Bandwidth: 5 → 100 Gbps auto-scale.
- **NAT Instance** (legacy) — EC2 tự setup, bạn quản lý, rẻ hơn nhưng phải HA tay.

### 2.5 Route Table
- 1 Route Table associate với 1+ subnet.
- Routes: destination CIDR → target (local, IGW, NAT GW, VGW, VPC Endpoint, TGW, Peering…).
- **Local route** (CIDR của VPC) tự động và **không xóa được**.
- Mỗi subnet associate **đúng 1 route table**.

### 2.6 Security Group vs Network ACL

| | Security Group (SG) | Network ACL (NACL) |
|--|---------------------|--------------------|
| Level | Instance (ENI) | Subnet |
| Stateful? | **Stateful** (response tự allow) | **Stateless** (phải mở cả 2 chiều) |
| Rule | Chỉ **Allow** | Cả **Allow** và **Deny** |
| Order | Tất cả rules evaluate cùng lúc | Theo **số thứ tự** (rule# thấp ưu tiên) |
| Default | Inbound deny, Outbound allow | Allow all 2 chiều |
| Number | 1 instance ≤ 5 SG | 1 subnet đúng 1 NACL |
| Reference | Có thể reference SG khác | Chỉ CIDR |

**Mẹo:** dùng SG cho 95% case. NACL chỉ khi cần Deny rõ ràng (blacklist IP, compliance).

### 2.7 VPC Endpoints
Truy cập AWS service từ private subnet **không qua Internet/NAT**.

| Type | Service hỗ trợ | Giá | Cấu hình |
|------|----------------|-----|----------|
| **Gateway Endpoint** | **S3, DynamoDB** | **Free** | Route table entry |
| **Interface Endpoint** (PrivateLink) | Hầu hết service AWS | **$0.01/h + $0.01/GB** | ENI trong subnet |

→ **Saving:** route S3/DDB qua Gateway Endpoint thay vì NAT GW → giảm $0.045/GB.

So sánh đường đi data từ private subnet để gọi S3/DynamoDB — cùng một request, hai chi phí khác hẳn nhau:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Đường đi traffic và chi phí — NAT Gateway so với S3/DynamoDB Gateway Endpoint</title>
  <desc>Hai luồng song song từ app trong private subnet gọi S3 hoặc DynamoDB. Luồng trên đi qua NAT Gateway rồi ra Internet, tốn 0.045 đô la mỗi GB data processing cộng phí giờ. Luồng dưới đi qua Gateway Endpoint, chỉ là một entry trong route table, không qua NAT, không qua Internet, hoàn toàn miễn phí.</desc>
  <defs>
    <marker id="costArr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <text x="16" y="22" font-size="14" font-weight="700" fill="currentColor">Private subnet gọi S3/DynamoDB — hai đường, hai chi phí</text>
  <!-- App node (shared start) -->
  <rect x="16" y="120" width="120" height="58" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="76" y="144" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">App</text>
  <text x="76" y="162" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.8">private subnet</text>
  <!-- TOP path: via NAT GW (expensive, amber/red) -->
  <line x1="136" y1="135" x2="178" y2="92" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#costArr)"/>
  <rect x="182" y="60" width="150" height="56" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.28"/>
  <text x="257" y="82" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">NAT Gateway</text>
  <text x="257" y="100" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">$0.045/GB + $/giờ</text>
  <line x1="332" y1="88" x2="374" y2="88" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#costArr)"/>
  <rect x="378" y="60" width="120" height="56" rx="9" fill="#f59e0b" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.28"/>
  <text x="438" y="92" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Internet</text>
  <line x1="498" y1="88" x2="540" y2="88" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#costArr)"/>
  <rect x="544" y="60" width="160" height="56" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="624" y="92" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">S3 / DynamoDB</text>
  <rect x="182" y="124" width="316" height="22" rx="11" fill="#f59e0b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="340" y="139" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">50 TB/tháng × $0.045 = ~$2,250 data processing</text>
  <!-- BOTTOM path: via Gateway Endpoint (free, green) -->
  <line x1="136" y1="163" x2="178" y2="218" stroke="#10b981" stroke-opacity="0.7" marker-end="url(#costArr)"/>
  <rect x="182" y="206" width="190" height="56" rx="9" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.28"/>
  <text x="277" y="228" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">S3/DDB Gateway Endpoint</text>
  <text x="277" y="246" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">chỉ là route table entry</text>
  <line x1="372" y1="234" x2="540" y2="234" stroke="#10b981" stroke-opacity="0.7" marker-end="url(#costArr)"/>
  <rect x="544" y="206" width="160" height="56" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="624" y="238" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">S3 / DynamoDB</text>
  <rect x="182" y="272" width="316" height="22" rx="11" fill="#10b981" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="340" y="287" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">không qua NAT · không qua Internet · FREE ($0)</text>
  <text x="438" y="190" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.8">cùng request → khác đường → khác tiền</text>
</svg>

### 2.8 VPC Peering
- 1-1 connection giữa 2 VPC (same/diff region/account).
- **Không transitive** (A↔B, B↔C → A KHÔNG đến C).
- **Không overlap CIDR**.
- Free trong region, có data transfer cross-region.
- Limit: 50/VPC (soft, lên 125).

### 2.9 Transit Gateway (TGW) — chỉ giới thiệu
- Hub-and-spoke cho multi-VPC + multi-account + on-prem.
- Scale ~5000 VPC.
- Có phí $0.05/h/attachment + $0.02/GB processed.
- Đi sâu ở SAA.

### 2.10 VPN & Direct Connect
- **Site-to-Site VPN** — IPsec qua Internet, ~1.25 Gbps/tunnel, setup phút.
- **Client VPN** — managed OpenVPN cho remote worker.
- **Direct Connect (DX)** — fiber riêng qua partner (Equinix, Megaport…). 1/10/100 Gbps. Setup tuần–tháng. Không encrypt mặc định.
- **DX + VPN** = encrypted + low latency.

### 2.11 Route 53 (DNS)
- **Hosted Zone** — public (Internet) hoặc private (VPC).
- **Records**: A, AAAA, CNAME, MX, TXT, **Alias** (AWS-specific, free query, hỗ trợ apex).
- **Routing policies** (7 loại):
  1. **Simple** — 1 record.
  2. **Weighted** — chia % traffic.
  3. **Latency** — route đến region gần user nhất.
  4. **Failover** — primary/secondary với health check.
  5. **Geolocation** — theo quốc gia.
  6. **Geoproximity** — bias khoảng cách (cần Traffic Flow).
  7. **Multi-value** — up to 8 healthy records (cheap LB).
- **Health Checks** — HTTP/HTTPS/TCP, calculated.
- **Domain Registrar** — đăng ký domain trực tiếp ($12/năm cho .com).

### 2.12 CloudFront (CDN)
- Cache content ở **Edge Location** toàn cầu.
- Origins: **S3, ALB/EC2, MediaPackage, custom HTTP**.
- **HTTPS** end-to-end với SNI / dedicated IP (đắt).
- **OAC** thay OAI cho S3 private origin.
- **Lambda@Edge** (4 trigger, Regional Edge) vs **CloudFront Functions** (viewer req/resp, µs, rẻ).
- **Price Class**: All / 200 (không SA/AU/NZ/Africa) / 100 (US+EU) — giảm cost nếu user vùng hẹp.
- **Signed URL/Cookie** cho content private có thời hạn.

### 2.13 ELB — 3 loại

| | ALB | NLB | GLB |
|--|-----|-----|-----|
| Layer | 7 (HTTP/HTTPS/gRPC/WS) | 4 (TCP/UDP/TLS) | 3 (IP, GENEVE) |
| Static IP | Không (DNS) | **Có + EIP per AZ** | - |
| SSL | Terminate được | Passthrough hoặc terminate | - |
| Routing | path / host / header / query / IP | port | - |
| WAF | ✅ | ❌ | ❌ |
| Slow start | ✅ | ❌ | - |
| Sticky session | Có (cookie) | Có (source IP) | - |
| Use case | Web, microservice | Game, IoT, high perf | Third-party firewall (Palo Alto, Fortinet) |

### 2.14 Pattern thiết kế VPC chuẩn (3-tier)

Kiến trúc 3-tier multi-AZ chuẩn: 1 VPC `/16`, 3 AZ, mỗi AZ có 3 tầng subnet (public → private → db). IGW dùng chung cho cả VPC; **mỗi AZ 1 NAT GW** để HA; S3 truy cập qua **Gateway Endpoint** (free) thay vì đi NAT.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 560" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Kiến trúc VPC 3-tier multi-AZ với IGW, NAT GW mỗi AZ và S3 Gateway Endpoint</title>
  <desc>VPC CIDR 10.0.0.0/16 gồm 3 AZ. Internet kết nối qua Internet Gateway dùng chung. Mỗi AZ có public subnet (ALB và NAT Gateway), private subnet (app tier) route ra Internet qua NAT GW của chính AZ đó, và db subnet (RDS) không có route Internet. S3 Gateway Endpoint cho phép cả ba AZ truy cập S3 miễn phí không qua NAT. Route public đi IGW, route private đi NAT.</desc>
  <defs>
    <marker id="vpcArr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
  <text x="16" y="22" font-size="14" font-weight="700" fill="currentColor">VPC 10.0.0.0/16  ·  ap-southeast-1  ·  3-tier multi-AZ</text>
  <!-- Internet + IGW -->
  <rect x="300" y="34" width="120" height="30" rx="15" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="360" y="53" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Internet</text>
  <line x1="360" y1="64" x2="360" y2="80" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#vpcArr)"/>
  <rect x="296" y="82" width="128" height="30" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="360" y="101" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">IGW (1/VPC, free)</text>
  <!-- VPC boundary -->
  <rect x="12" y="124" width="696" height="392" rx="12" fill="#3b82f6" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="6 4"/>
  <!-- S3 Gateway Endpoint badge (top-right inside VPC) -->
  <rect x="500" y="82" width="208" height="30" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="604" y="101" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">S3 Gateway Endpoint (free)</text>
  <!-- 3 AZ columns -->
  <g font-size="11" fill="currentColor">
    <!-- column geometry: x starts 28, 256, 484 ; width 208 -->
    <!-- AZ-a -->
    <rect x="28" y="138" width="208" height="366" rx="9" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="132" y="156" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">AZ-a</text>
    <!-- AZ-b -->
    <rect x="256" y="138" width="208" height="366" rx="9" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="360" y="156" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">AZ-b</text>
    <!-- AZ-c -->
    <rect x="484" y="138" width="208" height="366" rx="9" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="588" y="156" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">AZ-c</text>
  </g>
  <!-- Public subnets (blue) -->
  <g>
    <rect x="40" y="166" width="184" height="62" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="132" y="182" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Public 10.0.0.0/24</text>
    <text x="132" y="200" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">ALB</text>
    <text x="132" y="218" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">NAT GW</text>
    <rect x="268" y="166" width="184" height="62" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="360" y="182" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Public 10.0.1.0/24</text>
    <text x="360" y="200" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">ALB</text>
    <text x="360" y="218" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">NAT GW</text>
    <rect x="496" y="166" width="184" height="62" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="588" y="182" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Public 10.0.2.0/24</text>
    <text x="588" y="200" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">ALB</text>
    <text x="588" y="218" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">NAT GW</text>
  </g>
  <!-- Private subnets (green) -->
  <g>
    <rect x="40" y="284" width="184" height="54" rx="7" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="132" y="300" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Private 10.0.10.0/24</text>
    <text x="132" y="320" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">App (EC2/Fargate)</text>
    <rect x="268" y="284" width="184" height="54" rx="7" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="360" y="300" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Private 10.0.11.0/24</text>
    <text x="360" y="320" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">App (EC2/Fargate)</text>
    <rect x="496" y="284" width="184" height="54" rx="7" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="588" y="300" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Private 10.0.12.0/24</text>
    <text x="588" y="320" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">App (EC2/Fargate)</text>
  </g>
  <!-- DB subnets (purple) -->
  <g>
    <rect x="40" y="430" width="184" height="54" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="132" y="446" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">DB 10.0.20.0/24</text>
    <text x="132" y="466" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">RDS (no Internet)</text>
    <rect x="268" y="430" width="184" height="54" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="360" y="446" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">DB 10.0.21.0/24</text>
    <text x="360" y="466" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">RDS (no Internet)</text>
    <rect x="496" y="430" width="184" height="54" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="588" y="446" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">DB 10.0.22.0/24</text>
    <text x="588" y="466" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">RDS (no Internet)</text>
  </g>
  <!-- IGW <-> public ALB edges -->
  <g stroke="currentColor" stroke-opacity="0.45" fill="none">
    <path d="M320 100 H132 V166" marker-end="url(#vpcArr)"/>
    <path d="M360 112 V166" marker-end="url(#vpcArr)"/>
    <path d="M420 100 H478 V152 H520 V166" marker-end="url(#vpcArr)"/>
  </g>
  <!-- private -> NAT (up) edges, labelled -->
  <g stroke="currentColor" stroke-opacity="0.5" fill="none" stroke-dasharray="5 3">
    <path d="M100 284 V228" marker-end="url(#vpcArr)"/>
    <path d="M328 284 V228" marker-end="url(#vpcArr)"/>
    <path d="M556 284 V228" marker-end="url(#vpcArr)"/>
  </g>
  <g font-size="9" fill="currentColor" opacity="0.75">
    <text x="60" y="262">0.0.0.0/0</text>
    <text x="68" y="274">→ NAT</text>
    <text x="288" y="262">0.0.0.0/0</text>
    <text x="296" y="274">→ NAT</text>
    <text x="516" y="262">0.0.0.0/0</text>
    <text x="524" y="274">→ NAT</text>
  </g>
  <!-- app -> RDS edges -->
  <g stroke="currentColor" stroke-opacity="0.4" fill="none">
    <path d="M164 338 V430" marker-end="url(#vpcArr)"/>
    <path d="M392 338 V430" marker-end="url(#vpcArr)"/>
    <path d="M620 338 V430" marker-end="url(#vpcArr)"/>
  </g>
  <!-- private/db -> S3 Gateway Endpoint (free path) cho cả 3 AZ -->
  <g stroke="#10b981" stroke-opacity="0.7" fill="none">
    <path d="M224 312 H244 V132 H540 V112" marker-end="url(#vpcArr)"/>
    <path d="M452 312 H472 V124 H604 V112" marker-end="url(#vpcArr)"/>
    <path d="M680 312 H692 V116 H668 V112" marker-end="url(#vpcArr)"/>
  </g>
  <text x="588" y="78" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.8">S3 (free) ×3</text>
  <!-- legend -->
  <g font-size="9.5" fill="currentColor" opacity="0.85">
    <rect x="28" y="498" width="664" height="0" />
  </g>
  <text x="16" y="538" font-size="10.5" fill="currentColor" opacity="0.75">Public RT: 0.0.0.0/0 → IGW  ·  Private RT (per AZ): 0.0.0.0/0 → NAT GW của AZ đó  ·  DB RT: chỉ local + S3/DDB Gateway Endpoint</text>
</svg>

```
VPC 10.0.0.0/16 (ap-southeast-1)
├── Public subnets       (ALB, NAT GW, Bastion)
│   ├── 10.0.0.0/24  AZ-a
│   ├── 10.0.1.0/24  AZ-b
│   └── 10.0.2.0/24  AZ-c
├── Private subnets      (App tier, EC2/Fargate)
│   ├── 10.0.10.0/24 AZ-a
│   ├── 10.0.11.0/24 AZ-b
│   └── 10.0.12.0/24 AZ-c
└── DB subnets           (RDS, ElastiCache — isolated)
    ├── 10.0.20.0/24 AZ-a
    ├── 10.0.21.0/24 AZ-b
    └── 10.0.22.0/24 AZ-c
```

Route tables:
- Public RT: `0.0.0.0/0 → IGW`.
- Private RT (per AZ): `0.0.0.0/0 → NAT GW của AZ đó`.
- DB RT: no Internet route, có Gateway Endpoint S3/DDB.

---

## 3. Hands-on có account

### Lab 1 — Tạo VPC custom bằng CLI (20 phút)
```bash
REGION=ap-southeast-1

# 1. VPC
VPC=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=learn-vpc},{Key=Project,Value=aws-learner}]' \
  --query 'Vpc.VpcId' --output text)
aws ec2 modify-vpc-attribute --vpc-id $VPC --enable-dns-hostnames

# 2. IGW
IGW=$(aws ec2 create-internet-gateway --query 'InternetGateway.InternetGatewayId' --output text)
aws ec2 attach-internet-gateway --vpc-id $VPC --internet-gateway-id $IGW

# 3. Public subnet AZ-a
PUB_A=$(aws ec2 create-subnet --vpc-id $VPC --cidr-block 10.0.0.0/24 \
  --availability-zone ${REGION}a --query 'Subnet.SubnetId' --output text)
aws ec2 modify-subnet-attribute --subnet-id $PUB_A --map-public-ip-on-launch

# 4. Private subnet AZ-a
PRIV_A=$(aws ec2 create-subnet --vpc-id $VPC --cidr-block 10.0.10.0/24 \
  --availability-zone ${REGION}a --query 'Subnet.SubnetId' --output text)

# 5. Route table public + route to IGW
RT_PUB=$(aws ec2 create-route-table --vpc-id $VPC --query 'RouteTable.RouteTableId' --output text)
aws ec2 create-route --route-table-id $RT_PUB --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW
aws ec2 associate-route-table --route-table-id $RT_PUB --subnet-id $PUB_A

# 6. NAT GW (có phí ~$0.045/h !!!)
EIP=$(aws ec2 allocate-address --query AllocationId --output text)
NAT=$(aws ec2 create-nat-gateway --subnet-id $PUB_A --allocation-id $EIP \
  --query 'NatGateway.NatGatewayId' --output text)
aws ec2 wait nat-gateway-available --nat-gateway-ids $NAT

# 7. Route table private → NAT
RT_PRIV=$(aws ec2 create-route-table --vpc-id $VPC --query 'RouteTable.RouteTableId' --output text)
aws ec2 create-route --route-table-id $RT_PRIV --destination-cidr-block 0.0.0.0/0 --nat-gateway-id $NAT
aws ec2 associate-route-table --route-table-id $RT_PRIV --subnet-id $PRIV_A
```

🚨 NAT GW **đắt**, nhớ delete khi xong: `aws ec2 delete-nat-gateway --nat-gateway-id $NAT && aws ec2 release-address --allocation-id $EIP`.

### Lab 2 — Gateway Endpoint S3 (5 phút, free)
```bash
aws ec2 create-vpc-endpoint --vpc-id $VPC \
  --service-name com.amazonaws.${REGION}.s3 \
  --vpc-endpoint-type Gateway \
  --route-table-ids $RT_PRIV
```

Từ EC2 private subnet, `aws s3 ls` đi qua endpoint thay vì NAT.

### Lab 3 — Bastion + Private EC2 (15 phút)
1. Launch bastion EC2 ở public subnet, SG allow SSH từ IP của bạn.
2. Launch app EC2 ở private subnet, SG allow SSH **từ bastion SG**.
3. SSH bastion → SSH app.
4. Better: **SSM Session Manager** thay bastion (no SSH port mở).

### Lab 4 — Route 53 hosted zone (10 phút, $0.50/tháng/zone)
```bash
aws route53 create-hosted-zone --name learn.example.com \
  --caller-reference $(date +%s)
```

### Lab 5 — ALB + EC2 target group (30 phút)
1. Tạo target group cho EC2.
2. Tạo ALB ở 2 public subnet.
3. Register 2 EC2 (mỗi AZ 1 cái).
4. Health check `/`.
5. Curl ALB DNS → load balance.

---

## 4. Hands-on không tốn tiền

### LocalStack
```bash
awslocal ec2 create-vpc --cidr-block 10.0.0.0/16
awslocal ec2 describe-vpcs
awslocal ec2 create-subnet --vpc-id vpc-... --cidr-block 10.0.0.0/24
```

### Vẽ diagram (cực quan trọng — kỹ năng SAA)
Vẽ trên Excalidraw:
1. VPC 10.0.0.0/16, 3 AZ, mỗi AZ 1 public + 1 private + 1 DB subnet.
2. IGW, NAT GW per AZ, Gateway Endpoint S3.
3. ALB ở public, ASG ở private, RDS Multi-AZ ở DB subnet.
4. SG chain ALB → App → DB.
5. CloudFront trước ALB cho static.
6. Route 53 alias `app.example.com → CloudFront`.

### Bài tập tính IP
- VPC `10.0.0.0/16` chia thành 16 subnet `/20`. Mỗi subnet bao nhiêu IP usable?
- Subnet `10.0.16.0/20` start IP usable là gì? End IP usable?
- Bao nhiêu IP AWS reserve mỗi subnet?

→ Đáp án trong [practice/06-vpc/solution.md](../practice/06-vpc/solution.md).

---

## 5. Tự kiểm tra

1. EC2 trong subnet không có route IGW. Bạn cần Internet access. Làm gì?
   <details><summary>Đáp án</summary>(1) Thêm NAT GW ở public subnet + route private→NAT, hoặc (2) move EC2 sang public subnet + assign public IP. Tuỳ workload.</details>

2. App phải đọc S3 từ private subnet, không muốn trả phí NAT data transfer. Giải pháp?
   <details><summary>Đáp án</summary>**S3 Gateway Endpoint** — free, route table entry, traffic không qua NAT/Internet.</details>

3. SG allow inbound port 443 từ `0.0.0.0/0`. Outbound default. Client gửi HTTPS request → response có về được không?
   <details><summary>Đáp án</summary>**Có** — SG stateful, inbound allow tự cho phép response outbound.</details>

4. NACL chỉ allow inbound 443, outbound default. Cùng tình huống — response về được không?
   <details><summary>Đáp án</summary>**Tùy** — NACL stateless. Response dùng **ephemeral port** (1024–65535). Outbound default allow nên OK. Nhưng nếu siết outbound chỉ port 80/443 thì response **không về được** vì source port là ephemeral.</details>

5. 2 VPC peering A↔B, B↔C. EC2 ở A có ping được C không?
   <details><summary>Đáp án</summary>**Không** — peering không transitive. Phải tạo peering A↔C riêng, hoặc dùng **Transit Gateway**.</details>

6. Web app cần serve global, latency thấp, content tĩnh + động. Dùng gì?
   <details><summary>Đáp án</summary>**CloudFront** (cache tĩnh + Edge logic) + **Route 53 latency routing** + **Global Accelerator** nếu cần TCP/UDP anycast IP.</details>

7. WebSocket app cần load balancer. ALB hay NLB?
   <details><summary>Đáp án</summary>**ALB** — hỗ trợ WebSocket native, sticky session. NLB cũng dùng được nhưng mất feature L7.</details>

8. Reserve IP của subnet `10.0.1.0/24`?
   <details><summary>Đáp án</summary>`.0` network, `.1` VPC router, `.2` Route 53 Resolver, `.3` future, `.255` broadcast. → 251 usable.</details>

---

## 6. Đối chiếu GCP

| Khái niệm | AWS | GCP |
|-----------|-----|-----|
| Virtual network | **VPC** (regional) | **VPC** (**global**!) |
| Subnet | **Per-AZ** | **Per-region** |
| Internet route | **IGW** | **Default route** (auto-created) |
| NAT | **NAT Gateway** ($/h + $/GB) | **Cloud NAT** ($/h + $/GB) |
| Firewall | **SG** (instance) + **NACL** (subnet) | **VPC Firewall Rule** (network, có priority + Deny) |
| Stateful firewall | SG stateful, NACL stateless | Cloud Firewall stateful |
| Private API access | **VPC Endpoint** (Gateway free, Interface $) | **Private Google Access** (free) + **Private Service Connect** |
| Peering | **VPC Peering** (non-transitive) | **VPC Peering** (non-transitive) |
| Multi-VPC hub | **Transit Gateway** | **Network Connectivity Center** |
| DNS | **Route 53** | **Cloud DNS** |
| CDN | **CloudFront** | **Cloud CDN** (gắn LB) |
| L7 LB | **ALB** (regional) | **HTTPS LB** (**global**, anycast IP) |
| L4 LB | **NLB** (regional, static IP) | **Network LB** (regional/global) |
| WAF | **AWS WAF** + Shield | **Cloud Armor** |
| Hybrid private | **Direct Connect** | **Cloud Interconnect** (Dedicated/Partner) |
| Hybrid VPN | **Site-to-Site VPN** | **Cloud VPN** (HA, Classic) |
| Service mesh | **App Mesh** (deprecating) / EKS | **Traffic Director** / **GKE Service Mesh** |

**5 bẫy lớn khi từ GCP qua AWS network:**
1. **VPC global vs regional** — đây là khác biệt căn bản. GCP 1 VPC trải nhiều region, AWS phải tạo VPC mỗi region + peering/TGW.
2. **Subnet zonal AWS** — phải tạo subnet riêng mỗi AZ. GCP subnet trải cả region (1 subnet duy nhất).
3. **Global LB 1-click** không có ở AWS. Phải **CloudFront + ALB** hoặc **Global Accelerator + NLB/ALB**.
4. **Cross-AZ traffic AWS tính phí** ($0.01/GB mỗi chiều). GCP intra-region zone-to-zone via internal IP **miễn phí**. **Đây là bẫy cost lớn nhất**.
5. **Default VPC AWS** có sẵn ở mỗi region, default subnet mỗi AZ. **GCP auto-mode VPC** auto tạo subnet mỗi region. Cả 2 đều khuyên **tạo VPC custom cho prod**.

**Khi đi làm multi-cloud:**
- Hybrid cloud: **Direct Connect + Cloud Interconnect** qua provider chung (Equinix/Megaport) → 1 cross-connect serve cả 2.
- IP plan: tránh overlap CIDR giữa AWS VPC, GCP VPC, on-prem. Reserve range riêng từng cloud.

---

## 7. Lưu ý khi thi CLF-C02

- VPC là **regional**, subnet là **zonal**.
- SG **stateful**, NACL **stateless**.
- IGW free, NAT GW **có phí**.
- VPC Endpoint Gateway (S3/DDB) **free**.
- Route 53 = DNS + domain registrar, ALB = L7, NLB = L4.
- CloudFront = CDN, có Edge Location.
- Direct Connect = private fiber (đắt), VPN = qua Internet (rẻ).
- AWS reserve **5 IP** mỗi subnet.

## 8. Lưu ý khi thi SAA-C03

- **NAT GW per AZ** cho HA, không share cross-AZ.
- **Gateway Endpoint** chỉ S3 + DDB, free. **Interface Endpoint** mọi service khác, có phí.
- **PrivateLink** = expose your service tới VPC khác qua NLB.
- **Route 53 routing policies** — biết 7 loại + khi nào dùng. Latency vs Geolocation: latency tự AWS đo, geolocation theo IP quốc gia.
- **CloudFront OAC** thay OAI, hỗ trợ SSE-KMS.
- **Lambda@Edge** (4 trigger) vs **CloudFront Functions** (viewer only, JS, µs).
- **ALB sticky session** cookie; **NLB sticky** source IP.
- **TGW** scale 5000 VPC, khác peering không transitive.
- **Cross-region peering** có phí inter-region data transfer.
- **Egress-only IGW** cho IPv6 outbound private.
- **VPC Flow Logs** → CloudWatch / S3 / Firehose, level VPC/subnet/ENI.

## 9. Lưu ý khi đi làm

### Thiết kế
- **CIDR plan từ đầu** — tránh overlap. Đề xuất `10.<env>.<region>.<subnet>` (e.g. dev=10, staging=20, prod=30; ap-southeast-1=1, us-east-1=2…).
- **Min /20 cho VPC prod** — đừng dùng /16 lãng phí nếu không cần 65k IP.
- **3 AZ luôn** cho prod, kể cả region 2 AZ → mở rộng dễ.
- **Subnet riêng cho từng tier** (public / app / data / management).

### Cost
- **NAT GW** là cost trap #1. Giảm bằng:
  - Gateway Endpoint S3/DDB.
  - Interface Endpoint cho service AWS hay gọi.
  - 1 NAT GW shared nhiều AZ (chấp nhận risk AZ down → mất egress 1 AZ).
- **Cross-AZ** ($0.01/GB mỗi chiều) — đặt service cùng AZ khi có thể (ASG balance, cache local).
- **Public IPv4** từ 2024 tính phí $0.005/h dù dùng hay không. **IPv6** free.
- **VPC Endpoint Interface** cũng có cost — chỉ tạo cho service hay dùng.

### Bảo mật
- **Không mở SG `0.0.0.0/0:22/3389`** → SSM Session Manager.
- **VPC Flow Logs** bật cho prod, level REJECT → detect intrusion, giá rẻ.
- **GuardDuty** dùng VPC Flow + DNS để detect threat.
- **NACL** dùng để block IP malicious (SG không có Deny).
- **PrivateLink** thay VPN site-to-site khi share service tới partner.

### Anti-pattern
- ❌ 1 NAT GW chung cho 3 AZ → AZ-A down = mất NAT cho cả 3.
- ❌ VPC peering full mesh > 5 VPC → dùng TGW.
- ❌ Route table chung cho mọi subnet → mọi subnet thành "public" nếu thêm route IGW.
- ❌ Reserve IP < /28 → /29 không khả dụng (AWS reserve 5/min 16).
- ❌ Default VPC cho prod → tạo VPC custom.
- ❌ CloudFront không OAC, dùng S3 public → policy leak risk.

---

## 10. Flashcard

- **VPC** — virtual network regional, CIDR `/16`–`/28`.
- **Subnet** — sub-CIDR, **per-AZ**, AWS reserve 5 IP.
- **IGW** — Internet Gateway, free, 1/VPC.
- **NAT GW** — managed NAT, có phí, AZ-specific.
- **Route Table** — destination → target, mỗi subnet 1 RT.
- **SG** — instance, stateful, Allow only, reference SG.
- **NACL** — subnet, stateless, Allow + Deny, ordered.
- **Gateway Endpoint** — S3 + DDB, free, route entry.
- **Interface Endpoint** — PrivateLink, ENI, có phí.
- **VPC Peering** — 1-1, không transitive, không overlap.
- **Transit Gateway** — hub-spoke 5000 VPC.
- **Direct Connect** — private fiber, GBps, không encrypt mặc định.
- **Route 53** — DNS, 7 routing policy, alias record.
- **CloudFront** — CDN, OAC for S3, Edge Functions, Lambda@Edge.
- **ALB** — L7, host/path routing, WebSocket, WAF.
- **NLB** — L4, static IP, TCP/UDP, extreme perf.
- **VPN** — IPsec qua Internet.
- **VPC Flow Logs** — log traffic, CloudWatch/S3/Firehose.
- **5 IP reserved**: .0, .1 (router), .2 (DNS), .3, .255.
- **Cross-AZ**: $0.01/GB mỗi chiều → cost trap.
