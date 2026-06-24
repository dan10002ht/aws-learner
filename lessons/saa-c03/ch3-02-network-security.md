# SAA Ch3.2 — Network Security

> Mục tiêu: Thiết kế VPC isolation đúng tier, hiểu **SG vs NACL** sâu (không chỉ "stateful vs stateless"), biết WAF/Shield/Network Firewall/GuardDuty đứng ở tầng nào, và áp dụng defense-in-depth thay vì single firewall.

Tiền đề: CLF [[06-vpc]], [[ch3-01-iam-deep-dive]].

---

## 1. Câu chuyện mở đầu — "Có SG rồi không cần WAF"

Junior cấu hình ALB → EC2. Bật SG chỉ cho phép `0.0.0.0/0 → 443`. Deploy. 1 tuần sau: app bị SQL injection, exfil data. SG không chặn vì traffic legit ở layer 4 (TCP/443). SQL injection ở layer 7.

**Quy tắc 0**: mỗi layer chặn được mỗi loại tấn công.

- **L3/L4 (IP, port)**: SG, NACL, AWS Shield (DDoS).
- **L7 (HTTP)**: WAF, ALB.
- **DNS, BGP**: Route 53 DNS firewall, AWS Shield Advanced.
- **Application logic**: code review, dependency scan.

**Defense in depth**: stack nhiều layer, mỗi layer chặn 1 class attack.

---

## 2. VPC isolation pattern

### 2.1 Subnet tier hóa

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>VPC isolation theo tier — Public, Private và Database subnet</title>
  <desc>Internet qua Internet Gateway vào Public subnet chứa ALB, NAT Gateway, Bastion. Public subnet nối xuống Private subnet (App tier EC2/ECS/Lambda ENI), App tier nối xuống Database subnet (RDS, ElastiCache) không có đường ra internet. Traffic ra ngoài của App tier đi qua NAT Gateway.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">VPC isolation theo tier — cô lập theo lớp subnet</text>
  <defs>
    <marker id="vpcArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <rect x="240" y="36" width="240" height="32" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="56" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Internet — 0.0.0.0/0</text>
  <line x1="360" y1="68" x2="360" y2="86" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#vpcArr)"/>
  <rect x="285" y="86" width="150" height="26" rx="13" fill="#f59e0b" fill-opacity="0.9"/>
  <text x="360" y="104" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">Internet Gateway</text>
  <rect x="20" y="122" width="680" height="218" rx="12" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="34" y="142" font-size="12" font-weight="700" fill="currentColor" opacity="0.75">VPC</text>
  <line x1="360" y1="112" x2="360" y2="150" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#vpcArr)"/>
  <rect x="40" y="150" width="640" height="50" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="52" y="170" font-size="12.5" font-weight="700" fill="currentColor">Public subnet — route → IGW</text>
  <rect x="430" y="160" width="78" height="30" rx="7" fill="#3b82f6" fill-opacity="0.85"/>
  <text x="469" y="179" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">ALB</text>
  <rect x="516" y="160" width="78" height="30" rx="7" fill="#3b82f6" fill-opacity="0.85"/>
  <text x="555" y="179" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">NAT GW</text>
  <rect x="602" y="160" width="66" height="30" rx="7" fill="#3b82f6" fill-opacity="0.85"/>
  <text x="635" y="179" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">Bastion</text>
  <line x1="200" y1="200" x2="200" y2="222" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#vpcArr)"/>
  <rect x="40" y="222" width="640" height="50" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="52" y="242" font-size="12.5" font-weight="700" fill="currentColor">Private subnet — no IGW</text>
  <text x="52" y="260" font-size="10.5" fill="currentColor" opacity="0.7">App tier: EC2 / ECS / Lambda ENI — ra internet qua NAT GW</text>
  <line x1="560" y1="222" x2="560" y2="200" stroke="currentColor" stroke-opacity="0.45" stroke-dasharray="4 3" marker-end="url(#vpcArr)"/>
  <text x="600" y="216" font-size="9.5" fill="currentColor" opacity="0.7">egress qua NAT</text>
  <line x1="200" y1="272" x2="200" y2="294" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#vpcArr)"/>
  <rect x="40" y="294" width="640" height="50" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="52" y="314" font-size="12.5" font-weight="700" fill="currentColor">Database subnet — no IGW, no route to public</text>
  <text x="52" y="332" font-size="10.5" fill="currentColor" opacity="0.7">RDS, ElastiCache — backup qua VPC endpoint S3, không ra internet</text>
</svg>

- Public chỉ chứa LB và NAT.
- App tier private, ra internet qua NAT.
- DB không ra internet — backup qua VPC endpoint S3.

### 2.2 Multi-account separation

Best practice **AWS Organizations**:
- Prod / Staging / Dev → **account riêng biệt**.
- Security / Audit account riêng.
- Shared services (DNS, log archive) account riêng.
- Communicate qua TGW + RAM + PrivateLink.

→ Blast radius nhỏ. Compromise dev account không leak prod.

---

## 3. Security Groups (SG) vs Network ACL (NACL)

### 3.1 Bảng so sánh đầy đủ

| Aspect | Security Group | NACL |
|--------|---------------|------|
| Tầng | Instance/ENI | Subnet |
| Stateful? | ✅ Stateful (allow inbound → outbound trả tự động) | ❌ Stateless (cần allow cả 2 chiều) |
| Rule | Chỉ Allow | Allow + Deny |
| Đánh giá | Tất cả rule (union OR) | Theo thứ tự rule number, dừng ở first match |
| Default outbound | Allow all | Allow all (cho default NACL) |
| Default inbound | Deny all (cho new SG) | Allow all (cho default NACL) hoặc Deny (custom NACL) |
| Áp dụng | ENI attach SG nào → đó | Subnet level, mọi instance trong subnet |
| Reference khác | SG reference SG khác (peer SG, cross-VPC qua peering) | Chỉ CIDR/IP |

### 3.2 Khi nào dùng NACL?

- **SG đủ cho 95% case**.
- NACL chỉ thêm vào khi:
  - Cần **deny** rule explicit (block IP attacker).
  - Compliance yêu cầu tách layer.
  - Bảo vệ subnet level (chống lateral movement nội VPC).

### 3.3 Ephemeral ports trap

Vì NACL stateless, return traffic phải allow port range. Linux dùng port 32768-65535, Windows khác. Sai range → "request đi được, response không về".

→ Đây là bẫy quen thuộc khi audit NACL. Luôn allow ephemeral range outbound.

### 3.4 SG-to-SG reference

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 200" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Chuỗi SG-to-SG reference — ALB SG, App SG, DB SG</title>
  <desc>Internet gửi 443 vào ALB SG. ALB SG là nguồn cho App SG inbound 8080. App SG là nguồn cho DB SG inbound 5432. Mỗi Security Group tham chiếu SG đứng trước thay vì IP, nên khi ALB scale-out IP mới tự được chấp nhận.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">SG-to-SG reference — tham chiếu SG thay vì IP</text>
  <defs>
    <marker id="sgArr" markerWidth="11" markerHeight="11" refX="9" refY="3.2" orient="auto"><path d="M0 0 L9 3.2 L0 6.4 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <rect x="16" y="60" width="120" height="56" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="76" y="84" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Internet</text>
  <text x="76" y="102" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">0.0.0.0/0</text>
  <line x1="136" y1="88" x2="178" y2="88" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#sgArr)"/>
  <text x="157" y="80" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.8">443</text>
  <rect x="182" y="60" width="152" height="56" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="258" y="84" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">ALB SG</text>
  <text x="258" y="102" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">in 443 from internet</text>
  <line x1="334" y1="88" x2="378" y2="88" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#sgArr)"/>
  <text x="356" y="80" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.8">8080</text>
  <rect x="382" y="60" width="152" height="56" rx="9" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="458" y="84" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">App SG</text>
  <text x="458" y="102" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">in 8080 from ALB SG</text>
  <line x1="534" y1="88" x2="578" y2="88" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#sgArr)"/>
  <text x="556" y="80" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.8">5432</text>
  <rect x="582" y="60" width="122" height="56" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="643" y="84" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">DB SG</text>
  <text x="643" y="102" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">in 5432 from App SG</text>
  <text x="16" y="158" font-size="11" fill="currentColor" opacity="0.8">Mỗi SG nhận nguồn là SG đứng trước (không phải IP).</text>
  <text x="16" y="176" font-size="11" fill="currentColor" opacity="0.8">→ ALB scale-out: IP mới tự được App SG chấp nhận, không cần update IP list.</text>
</svg>

→ Khi ALB scale-out, IP mới tự động được app accept. Không cần update IP list.

---

## 4. Endpoint security

### 4.1 VPC endpoints (lại)

- **Gateway endpoint** (S3, DynamoDB): free, route trong VPC.
- **Interface endpoint** (PrivateLink): ENI với private IP, $$$.

**Security benefit**: traffic không qua internet. Combine với:

```json
// S3 bucket policy: chỉ cho phép access qua VPC endpoint
{
  "Effect": "Deny",
  "Principal": "*",
  "Action": "s3:*",
  "Resource": ["arn:aws:s3:::bucket", "arn:aws:s3:::bucket/*"],
  "Condition": {
    "StringNotEquals": { "aws:SourceVpce": "vpce-xxx" }
  }
}
```

→ Bucket chỉ accessible từ VPC cụ thể, kể cả có access key.

### 4.2 PrivateLink endpoint policy

- Mỗi VPC endpoint có policy riêng — restrict thêm action/resource qua endpoint.
- Vd: endpoint S3 chỉ allow GetObject từ bucket whitelist.

---

## 5. AWS WAF (Web Application Firewall)

### 5.1 Cơ bản
- Attach vào CloudFront, ALB, API Gateway, AppSync, App Runner.
- **Web ACL** = collection of rules.
- Rule type:
  - **Managed rule groups** (AWS, vendor): SQL injection, XSS, bot, OWASP top 10.
  - **Custom rules**: theo IP, header, body, geo, rate-limit.
  - **Rate-based**: throttle theo IP, 5-min window.

### 5.2 Patterns

```
Block list bot user-agent
Block specific country (geo match)
Rate limit 2000 req / 5 min per IP
SQL injection match in body
XSS match in URI/header
Size constraint: body > 10 MB → block
```

### 5.3 WAF không phải silver bullet
- Layer 7 only, không chặn DDoS volumetric.
- False positive cao nếu enable mọi managed rule — phải tune theo app.
- Mode: **Count** (log only) → tune → **Block**.

---

## 6. AWS Shield

### 6.1 Shield Standard
- **Free, mặc định bật** cho mọi AWS account.
- Bảo vệ chống DDoS L3/L4 phổ biến (SYN flood, UDP reflection).
- Tích hợp tự động với CloudFront, Route 53, Global Accelerator, ELB.

### 6.2 Shield Advanced
- **$3000/tháng**, commitment 1 năm.
- Bảo vệ DDoS sophisticate hơn, L3-L7.
- **DDoS Response Team (DRT)** support 24/7.
- **Cost protection**: bồi hoàn cost spike do DDoS (EC2, ELB, CloudFront…).
- WAF included.
- Use case: high-profile app (banking, gaming, election), SLA tài chính.

### 6.3 Khi nào cần Shield Advanced

- Doanh thu / brand impact > $3000/tháng nếu down.
- Đã từng bị DDoS / là target nhạy cảm.
- Cần DRT response.

---

## 7. AWS Network Firewall

- Managed stateful firewall ở **VPC level** (cross-subnet, cross-VPC qua TGW).
- Suricata-compatible rule set.
- Use case:
  - **Egress filtering**: chặn outbound đến domain xấu (C2 callback).
  - **Inspect inter-VPC traffic** qua TGW.
  - **Compliance** yêu cầu IDS/IPS dedicated.

### Khác SG/NACL
- SG/NACL không inspect payload.
- Network Firewall inspect L3-L7, signature-based + behavior.

### Cost
- $$$$ (per endpoint hour + traffic GB). Đắt. Dùng khi compliance bắt.

---

## 8. AWS Firewall Manager

- Centralize WAF, Shield Advanced, Security Group, Network Firewall, Route 53 DNS Firewall **across accounts in Organization**.
- 1 policy → apply nhiều account.
- Use case: enforce baseline security (vd: bắt buộc mọi ALB phải có WAF với managed rule X).

---

## 9. Bastion & access pattern

### 9.1 Classic bastion (anti-pattern ngày càng)
- EC2 trong public subnet, SSH từ admin → bastion → private instance.
- Maintain SSH key, audit khó.

### 9.2 Systems Manager Session Manager (recommended)
- Không cần bastion, không cần SSH key, không cần public IP.
- SSM Agent → SSM endpoint qua PrivateLink.
- Audit log mọi session.
- MFA + IAM permission.

### 9.3 Client VPN / Direct Connect
- Cho user/dev VPN vào VPC.
- Authenticate qua AD, certificate, SAML.

### 9.4 EC2 Instance Connect
- Browser-based SSH, ephemeral key push qua AWS.
- Free, dễ setup.

---

## 10. Route 53 Resolver DNS Firewall

- Block DNS query đến domain bad (malware, C2).
- Hoặc allow list (paranoid mode).
- Use case: prevent data exfiltration qua DNS tunneling.

---

## 11. GuardDuty (detective, sang chương 3.4)

Nhắc lại trong context: GuardDuty phân tích VPC Flow Logs + DNS Logs + CloudTrail → detect anomaly. Là **detective**, không **preventive**. Chi tiết ở [[ch3-04-detective-controls]].

---

## 12. Defense in depth — ví dụ web app

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Defense in depth — các lớp đồng tâm bảo vệ data, từ ngoài vào trong</title>
  <desc>Các lớp phòng thủ bao bọc đồng tâm. Vòng ngoài cùng là Route 53 DNS firewall chặn DNS tunneling và exfil; tiếp đến CloudFront với Shield và WAF chặn DDoS và OWASP L7 (SQLi/XSS); rồi ALB với Security Group chặn IP/port lạ; rồi App EC2 với Security Group chỉ nhận từ ALB SG chặn lateral access; lõi trong cùng là RDS với Security Group và KMS chặn truy cập trực tiếp và lộ data lúc nghỉ. Mũi tên request độc hại đâm từ ngoài vào, mỗi lớp chặn một class attack riêng; lớp nào trong mất thì breach tới đó.</desc>
  <text x="360" y="22" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Defense in depth — các lớp đồng tâm, từ ngoài vào trong</text>
  <defs>
    <marker id="didArr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 z" fill="#ef4444"/></marker>
  </defs>
  <rect x="40"  y="44"  width="640" height="316" rx="16" fill="#f59e0b" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.3"/>
  <rect x="86"  y="78"  width="548" height="270" rx="15" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.3"/>
  <rect x="132" y="112" width="456" height="216" rx="14" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
  <rect x="178" y="146" width="364" height="156" rx="13" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
  <rect x="224" y="186" width="272" height="84"  rx="12" fill="#f59e0b" fill-opacity="0.2"  stroke="currentColor" stroke-opacity="0.4"/>
  <text x="360" y="64" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Route 53 DNS firewall</text>
  <text x="666" y="64" font-size="10" text-anchor="end" fill="currentColor" opacity="0.75">DNS tunneling / exfil</text>
  <text x="360" y="98" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">CloudFront — Shield + WAF</text>
  <text x="620" y="98" font-size="10" text-anchor="end" fill="currentColor" opacity="0.75">DDoS + OWASP L7</text>
  <text x="360" y="132" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">ALB — Security Group</text>
  <text x="574" y="132" font-size="10" text-anchor="end" fill="currentColor" opacity="0.75">IP/port lạ</text>
  <text x="360" y="166" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">App EC2 — Security Group</text>
  <text x="528" y="166" font-size="10" text-anchor="end" fill="currentColor" opacity="0.75">lateral access</text>
  <text x="360" y="222" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">RDS — Security Group + KMS</text>
  <text x="360" y="240" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.8">lõi: data được bảo vệ</text>
  <text x="360" y="256" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">chặn truy cập trực tiếp + lộ data lúc nghỉ</text>
  <line x1="6" y1="228" x2="218" y2="228" stroke="#ef4444" stroke-width="2" marker-end="url(#didArr)"/>
  <text x="10" y="218" font-size="11" font-weight="700" fill="#ef4444">request độc hại</text>
  <text x="360" y="376" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.8">lớp nào trong mất → breach tới đó · mỗi lớp chặn 1 class attack</text>
</svg>

Xuyên suốt mọi lớp (cross-cutting):

- **Network Firewall** inspect egress.
- **VPC Flow Logs** → GuardDuty.
- **CloudTrail** → audit.
- **IAM** least privilege.
- **Secrets Manager** rotate creds.

Mỗi layer chặn 1 class. Không layer nào trong mất → app down/breach.

---

## 13. Ví dụ design cho 4 use case

### 13.1 Public web app B2C
- CloudFront + WAF (managed Core, SQL, XSS, rate-limit).
- ALB + SG.
- App private subnet + SG SG-to-SG.
- RDS Multi-AZ private + KMS.
- Shield Standard (free), Advanced nếu DDoS-target.

### 13.2 Enterprise SaaS B2B, customer cấp IP whitelist
- Internet-facing endpoint nhưng SG hoặc WAF rule allow chỉ customer CIDR.
- Hoặc PrivateLink → customer VPC trực tiếp (không qua internet).

### 13.3 Healthcare HIPAA
- Multi-account: prod / data / audit.
- Network Firewall inspect mọi egress.
- All data KMS encrypted, S3 bucket policy require encryption.
- VPC endpoint everywhere (không IGW cho data subnet).
- CloudTrail + GuardDuty + Config conformance pack HIPAA.

### 13.4 Dev environment
- Single account, simple SG.
- SSM Session Manager thay bastion.
- SCP block production region.

---

## 14. Cạm bẫy đề thi (SAA)

1. **"NACL stateful"** → **Sai**, stateless.
2. **"SG có deny rule"** → **Sai**, SG chỉ allow.
3. **"WAF chặn DDoS volumetric"** → **Sai**, WAF L7. DDoS lớn cần Shield Advanced + scale infra.
4. **"Shield Standard cần bật"** → **Sai**, mặc định bật và free.
5. **"VPC endpoint thay thế NAT GW cho mọi traffic"** → **Sai**, chỉ cho service AWS có endpoint. Traffic internet khác vẫn cần NAT.
6. **"Bastion là best practice"** → **Lạc hậu**. SSM Session Manager tốt hơn.
7. **"SG cross-VPC reference"** → **Đúng** nếu VPC peer hoặc TGW + cùng region.
8. **"NACL allow ephemeral port 1024-65535"** → Cụ thể Linux 32768-65535, Windows khác. Đề chi tiết hỏi.
9. **"PrivateLink tự encrypt"** → Layer transport (TCP). App vẫn nên TLS.

---

## 15. Tóm tắt 1 dòng

> Defense in depth: **L3/L4 (SG, NACL, Shield) + L7 (WAF) + DNS Firewall + Network Firewall + IAM + Encryption**. SG cho 95% case, NACL cho deny explicit, WAF cho HTTP, Shield Standard free luôn-bật, Advanced cho high-stake.

---

## 16. Bài tập tự kiểm tra

1. App bị DDoS layer 7 (botnet với valid HTTP request). SG và Shield Standard có chặn được không? Bạn dùng gì?
2. Compliance yêu cầu mọi outbound traffic đến internet phải inspect domain. Service AWS nào? So sánh với chỉ dùng NAT + proxy app-level.
3. Bucket S3 lưu PII. Yêu cầu: chỉ truy cập từ VPC `vpc-xxx`, từ role `arn:aws:iam::123:role/Reader`, MFA enabled. Viết bucket policy.
4. So sánh SSM Session Manager vs Bastion EC2 ở 4 khía cạnh: security, cost, audit, UX.
5. Một subnet có NACL allow inbound 443 only, outbound 1024-65535 only. EC2 trong subnet không kết nối được ra ngoài port 443. Vì sao? Fix?
6. Multi-account org cần đảm bảo mọi VPC có VPC Flow Logs bật. Cách scale (không phải Terraform mỗi VPC)?

---

## 17. Đọc thêm

- AWS Whitepaper — *AWS Security Best Practices*, *AWS Best Practices for DDoS Resiliency*.
- AWS docs — *VPC Security*, *AWS WAF Developer Guide*.
- *AWS Security Maturity Model*.

---

**Bài tiếp theo**: [[ch3-03-data-protection]] — KMS, encryption everywhere, Secrets Manager, certificate management.
