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
