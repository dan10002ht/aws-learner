# Bài 16 — Networking Advanced (VPC, TGW, PrivateLink, Hybrid)

## 1. Mục tiêu
- Thiết kế VPC enterprise: multi-account hub-spoke với TGW.
- Hiểu PrivateLink, VPC Endpoint Gateway vs Interface.
- Hybrid connectivity: VPN, Direct Connect, Cloud WAN.
- Tránh cost trap (NAT GW, cross-AZ, Interface Endpoint).

---

## 2. VPC review + advanced

### 2.1 CIDR planning
- **Tránh overlap** với on-prem + cloud khác.
- Reserve range: `10.<env>.<region>.<subnet>` (dev=10, prod=30; sg=1, us=2).
- /20 (4k IP) cho VPC prod đủ; /16 dư cho EKS Fargate.
- Reserve 5 IP / subnet: .0, .1, .2, .3, .255.

### 2.2 Subnet pattern
```
Public (ALB, NAT)         /24
Private app (EC2/EKS)     /22 (rộng cho pod)
Private data (RDS, Cache) /24
Private mgmt (jumpbox)    /28
```

### 2.3 NAT Gateway deep
- **AZ-specific** — 1/AZ cho HA.
- **Phí $0.045/h + $0.045/GB** processed. Đây là cost trap #1.
- Bandwidth 5 → 100 Gbps auto.
- Alternative cost saving:
  - **VPC Endpoint Gateway** (S3/DDB) free.
  - **Interface Endpoint** cho service hay gọi.
  - 1 NAT GW shared 3 AZ (chấp nhận risk).

### 2.4 IPv6
- **Egress-only IGW** — IPv6 outbound private (NAT GW không có IPv6).
- Dual-stack VPC subnet.
- IPv4 public từ 2024 tính phí $0.005/h → IPv6 free.

---

## 3. VPC Endpoints

### 3.1 Gateway Endpoint
- **S3 và DynamoDB only**.
- **Free**.
- Route table entry, traffic không qua Internet/NAT.
- Cấu hình endpoint policy giới hạn principal/resource.

### 3.2 Interface Endpoint (PrivateLink)
- Hầu hết AWS service + 3rd-party.
- **ENI trong subnet** (1/AZ).
- **$0.01/h + $0.01/GB** processed.
- DNS endpoint resolve về private IP.
- **VPC Endpoint Service** (publisher side) qua NLB → expose your service tới VPC khác.

### 3.3 PrivateLink pattern

```
[Provider VPC]                     [Consumer VPC]
  NLB ─→ EC2/ECS                     Endpoint (ENI)
   │                                   │
   └─ VPC Endpoint Service ←───────────┘
        (whitelist consumer accounts)
```

Use case: SaaS provider expose service không qua Internet.

### 3.4 Endpoint policy
```json
{
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::my-bucket/*",
    "Condition": {
      "StringEquals": { "aws:PrincipalAccount": "${aws:ResourceAccount}" }
    }
  }]
}
```

→ Endpoint chỉ cho phép access bucket cùng account → chống exfiltration.

---

## 4. VPC Peering

- **1-1 connection**, **không transitive**.
- Same/diff region, same/diff account.
- **Không overlap CIDR**.
- Free trong region; cross-region có phí data.
- Limit ~125 peering / VPC (soft).
- Route table phải add manually.

→ Dùng cho **2-5 VPC**. Hơn thì → TGW.

---

## 5. Transit Gateway (TGW)

### 5.1 Đặc điểm
- **Hub-and-spoke** cho 1000s VPC + on-prem + Direct Connect.
- Per region. Cross-region: **TGW Peering**.
- Cost: $0.05/h/attachment + $0.02/GB processed.

### 5.2 Components
- **TGW**: hub.
- **Attachment**: VPC, VPN, Direct Connect, TGW peering, Connect (SD-WAN).
- **Route Table** (multiple): traffic isolation (vd prod ↔ shared services nhưng không ↔ dev).
- **Propagation**: tự động share routes giữa attachment.

### 5.3 Segmentation pattern
```
TGW Route Tables:
- prod-rt:     prod-vpc, shared-services
- dev-rt:      dev-vpc, shared-services
- shared-rt:   shared-vpc, prod-vpc, dev-vpc
```

→ prod ↔ shared OK, dev ↔ shared OK, prod ↮ dev (isolation).

### 5.4 TGW vs VPC Peering

| | Peering | TGW |
|--|---------|-----|
| Topology | Mesh | Hub-spoke |
| Transitive | ❌ | ✅ |
| Scale | < 5 VPC | 1000s |
| Cost | Free (same region) | Per attachment + GB |
| Latency | Lower | Higher (qua hub) |
| Cross-account | ✅ | ✅ (qua RAM share) |

### 5.5 Cloud WAN (2022)
- Managed WAN cho global network multi-region multi-account.
- Policy-based routing (declarative).
- Tự setup TGW peering + segments.
- Use case: enterprise > 5 region.

---

## 6. Hybrid connectivity

### 6.1 Site-to-Site VPN
- **IPsec qua Internet**.
- 2 tunnels per connection (HA).
- ~1.25 Gbps/tunnel.
- Setup phút.
- Backup cho Direct Connect.

### 6.2 Client VPN
- **OpenVPN-based** managed.
- Remote worker access VPC.
- Auth: AD, SAML, mTLS.

### 6.3 Direct Connect (DX)
- **Private fiber** qua partner (Equinix, Megaport, AT&T...).
- 1, 10, 100 Gbps.
- **Không encrypt mặc định** (private network, không phải Internet).
- Setup tuần-tháng.
- **VIF (Virtual Interface)**:
  - **Public VIF** — access public AWS services (S3 endpoint) qua private link.
  - **Private VIF** — access VPC qua VGW hoặc DX Gateway.
  - **Transit VIF** — access TGW (recommend cho multi-VPC).
- **DX Gateway** — 1 DX kết nối nhiều VPC nhiều region.
- **MACsec** — L2 encryption optional cho DX dedicated 10/100 Gbps.
- SLA 99.9% (single connection) — luôn + VPN backup hoặc 2 DX redundant.

### 6.4 DX + VPN
Pattern hybrid: DX cho data hằng ngày + VPN backup (failover khi DX down) + IPsec encrypt over DX (compliance).

### 6.5 Global Accelerator
- **Anycast 2 static IP** routed qua AWS backbone đến gần endpoint nhất.
- Layer 4 (TCP/UDP).
- Auto failover region.
- Use case: global TCP app (game, IoT, VoIP), legacy app cần static IP.

| | CloudFront | Global Accelerator |
|--|-----------|---------------------|
| Layer | 7 (HTTP/HTTPS) | 4 (TCP/UDP) |
| Cache | ✅ | ❌ |
| Static IP | ❌ | ✅ (2 anycast) |
| Use case | Web cache static + dynamic | Global TCP/UDP |
| Pricing | Per GB egress + req | $0.025/h + per GB |

---

## 7. Route 53 advanced

### 7.1 Routing policies (recap, đi sâu cho SAA)
- **Simple** — 1 record.
- **Weighted** — % traffic (A/B testing, canary).
- **Latency** — region gần nhất theo AWS health check.
- **Failover** — primary/secondary với health check.
- **Geolocation** — theo quốc gia user.
- **Geoproximity** — bias khoảng cách + bias number.
- **Multi-value** — up to 8 healthy records (poor man's LB).
- **IP-based** (mới) — theo CIDR.

### 7.2 Health Checks
- HTTP/HTTPS/TCP từ Route 53 PoP (outside AWS).
- **Calculated** — combine multiple checks logic.
- **CloudWatch alarm** based.
- Threshold: number of failure + interval (10s standard, 30s fast).

### 7.3 Hybrid DNS
- **Private Hosted Zone** — resolve trong VPC.
- **Resolver Inbound Endpoint** — on-prem resolve `*.aws.internal`.
- **Resolver Outbound Endpoint** — AWS query on-prem DNS.
- **DNS Firewall** — block malicious domain.

### 7.4 Domain registration
- Route 53 registrar — $12-$50/năm tuỳ TLD.
- Auto-renew, transfer support.

---

## 8. Tự kiểm tra

1. 30 VPC cần kết nối full-mesh. Peering hay TGW?
   <details><summary>Đáp án</summary>**TGW** — peering scale linear (30 VPC = 435 peering), TGW chỉ 30 attachment.</details>

2. App private subnet cần access S3 không trả phí NAT data. Setup?
   <details><summary>Đáp án</summary>**S3 Gateway Endpoint** — free, route table entry.</details>

3. Expose SaaS service tới customer VPC mà không qua Internet?
   <details><summary>Đáp án</summary>**PrivateLink + VPC Endpoint Service** — NLB phía bạn, endpoint phía customer.</details>

4. Hybrid app cần private connection, throughput 5 Gbps stable, latency ổn định. VPN hay DX?
   <details><summary>Đáp án</summary>**Direct Connect** (10 Gbps port). VPN unstable + cap throughput. DX không encrypt mặc định nên + VPN over DX nếu compliance.</details>

5. Global TCP game app cần static IP + low latency toàn cầu?
   <details><summary>Đáp án</summary>**Global Accelerator** — 2 anycast IP, AWS backbone routing. CloudFront không phải L4.</details>

6. EC2 private subnet không có route Internet, cần download package từ S3?
   <details><summary>Đáp án</summary>**S3 Gateway Endpoint** (free). Hoặc NAT GW (đắt).</details>

7. TGW segmentation: prod ↔ shared OK, prod ↮ dev. Setup?
   <details><summary>Đáp án</summary>**Multiple TGW Route Tables** — prod-rt và dev-rt riêng, cùng có route → shared, nhưng không có route lẫn nhau.</details>

8. DX bị down. Auto failover sang VPN không?
   <details><summary>Đáp án</summary>**Có** nếu set up đúng — BGP route từ VPN có higher priority sau khi DX BGP withdraw. Hoặc dùng Route 53 failover routing.</details>

9. On-prem cần resolve `api.internal.aws.acme.com` (Private Hosted Zone). Setup?
   <details><summary>Đáp án</summary>**Route 53 Resolver Inbound Endpoint** — IP trong VPC, on-prem DNS forward query đến đó.</details>

10. App cần latency-routing 5 region, mỗi region có ALB. Setup?
    <details><summary>Đáp án</summary>**Route 53 Latency routing policy** — 5 records, mỗi cái trỏ ALB region đó. Plus health check + failover backup.</details>

---

## 9. Đối chiếu GCP

| AWS | GCP |
|-----|-----|
| VPC regional | VPC **global** |
| Subnet zonal | Subnet **regional** |
| NAT Gateway | Cloud NAT |
| TGW | **Network Connectivity Center** |
| VPC Peering | VPC Peering (non-transitive both) |
| Gateway Endpoint S3/DDB | **Private Google Access** (free) |
| Interface Endpoint | **Private Service Connect** |
| PrivateLink service | **PSC published service** |
| Site-to-Site VPN | Cloud VPN (HA, Classic) |
| Direct Connect | Cloud Interconnect (Dedicated/Partner) |
| Global Accelerator | (không có direct) — Global LB anycast |
| Route 53 | Cloud DNS |
| Route 53 Resolver Inbound | Cloud DNS Inbound Forwarding |
| Cloud WAN | Network Connectivity Center |

**Bẫy:**
1. **GCP VPC global** — 1 VPC trải mọi region, không cần peering/TGW intra-VPC. AWS phải VPC mỗi region + peer.
2. **GCP Private Google Access** free, AWS Gateway Endpoint S3/DDB free nhưng Interface Endpoint có phí.
3. **GCP Cloud Interconnect Partner** giống AWS DX Partner. **Dedicated** cũng giống.
4. **Anycast Global LB** GCP built-in. AWS phải kết hợp Global Accelerator + ALB.

---

## 10. Lưu ý SAA

- **Gateway Endpoint** free (S3/DDB). **Interface Endpoint** có phí.
- **PrivateLink** = expose service qua VPC Endpoint Service.
- **TGW** cho > 5 VPC, **Peering** cho 2-5.
- **Cloud WAN** cho enterprise > 5 region.
- **DX + VPN backup** SLA mission-critical.
- **DX Gateway** 1 DX nhiều VPC nhiều region.
- **Global Accelerator** L4, static IP, anycast.
- **CloudFront** L7, cache.
- **Route 53 7 routing policies**.
- **Resolver Inbound/Outbound** hybrid DNS.
- **Egress-only IGW** IPv6 outbound private.
- **NAT GW per AZ** HA.

## 11. Lưu ý đi làm

### Cost optimization
- **VPC Endpoint Gateway** S3/DDB → save NAT data fee.
- **Interface Endpoint** chỉ cho service hay dùng (ECR, SSM, Secrets...).
- **Cross-AZ traffic** ($0.01/GB) — đặt service cùng AZ, ASG balance.
- **IPv4 public** $0.005/h từ 2024 — release EIP idle, dùng IPv6 nếu được.
- **1 NAT GW 3 AZ** chấp nhận risk thay 3 NAT GW.

### Security
- **VPC Flow Logs** prod + S3 + Athena query.
- **GuardDuty** dùng VPC Flow + DNS.
- **DNS Firewall** block malicious domain.
- **Network Firewall** L3-7 firewall managed (deep packet inspection).
- **VPC Endpoint Policy** + `aws:SourceVpce` chống exfiltration.

### Architecture
- **Landing zone** với Control Tower → mỗi account có VPC chuẩn template.
- **Shared services account** (Route53 PHZ, AD, monitoring) qua TGW.
- **RAM share** subnet/TGW cross-account.

### Anti-pattern
- ❌ Full mesh peering > 5 VPC → TGW.
- ❌ NAT GW serve S3 traffic → Gateway Endpoint.
- ❌ Single NAT GW cho 3 AZ → AZ-A down = mất egress AZ-A,B,C.
- ❌ DX không backup VPN → SLA single connection 99.9% không đủ.
- ❌ VPC CIDR overlap → cannot peer/TGW future.
- ❌ Public RDS với SG `0.0.0.0/0`.

## 12. Foundations
- [[foundations-06-failure-modes]] — network partition là chủ đề CAP.

## 13. Flashcard

- **VPC** regional, **Subnet** zonal, reserve 5 IP.
- **Gateway Endpoint** S3+DDB, free.
- **Interface Endpoint** PrivateLink, $/h + $/GB.
- **VPC Endpoint Service** = publisher PrivateLink via NLB.
- **Peering** 1-1, non-transitive, no CIDR overlap.
- **TGW** hub-spoke 1000s VPC, $0.05/h/attachment.
- **TGW Route Table** segmentation.
- **Cloud WAN** policy-based global network.
- **DX** private fiber, GBps, không encrypt mặc định, + VPN backup.
- **DX Gateway** 1 DX nhiều VPC region.
- **Public/Private/Transit VIF**.
- **MACsec** DX L2 encrypt.
- **VPN** IPsec qua Internet.
- **Global Accelerator** L4 anycast static IP.
- **CloudFront** L7 cache.
- **Route 53** 7 policies + health check + alias.
- **PHZ** private DNS in VPC.
- **Resolver Endpoint** hybrid DNS.
- **DNS Firewall** block domain.
- **NAT GW** per AZ, $0.045/h + GB.
- **Egress-only IGW** IPv6.
- **IPv4 public** $0.005/h 2024+.
