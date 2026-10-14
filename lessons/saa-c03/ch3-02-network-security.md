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

Subnet và SG cô lập các tầng **bên trong một VPC**. Lớp cô lập mạnh hơn nữa là **AWS account**: hai account khác nhau mặc định không nhìn thấy resource của nhau, không chung IAM user/role, không chung VPC. Muốn đi từ account này sang account kia thì phải có người chủ động mở đường (một role cho phép assume, một kết nối mạng). Vì vậy best practice là dùng **AWS Organizations** (dịch vụ gom nhiều account về một mối để quản lý và tính tiền chung) và chia:

- Prod / Staging / Dev → mỗi môi trường một **account riêng biệt**.
- Security / Audit → account riêng, để người vận hành prod không sửa/xoá được log kiểm toán của chính mình.
- Shared services (DNS, log archive) → account riêng.

**Blast radius** ("bán kính vụ nổ") là phạm vi thiệt hại khi một thứ bị chiếm hoặc bị cấu hình sai. Access key của một dev bị lộ trong account dev thì kẻ tấn công chỉ phá được account dev; dữ liệu khách hàng nằm ở account prod, nơi key đó không có quyền gì. Nếu tất cả chung một account, ranh giới duy nhất còn lại là IAM policy — viết lỏng một dòng là mất hết.

Tách account rồi thì các account vẫn phải nói chuyện với nhau. Ba công cụ hay gặp:

| Công cụ | Nó là gì | Dùng khi |
|---|---|---|
| **Transit Gateway (TGW)** | Một router trung tâm do AWS quản lý. Mỗi VPC (và đường VPN/Direct Connect) cắm vào nó một lần, thay vì nối từng cặp VPC với nhau | Nhiều VPC ở nhiều account cần **thông mạng** với nhau ở tầng IP |
| **Resource Access Manager (RAM)** | Dịch vụ **chia sẻ một resource** cho account khác dùng chung, không phải tạo bản sao (subnet, TGW, Resolver rule…) | Account network sở hữu TGW/subnet, các account khác chỉ "dùng nhờ" |
| **PrivateLink** | Mở **đúng một service** (một cổng, một chiều) cho VPC khác gọi qua private IP, không thông cả hai mạng | Chỉ cần gọi một API nội bộ, không muốn hai VPC thấy hết nhau (chi tiết ở §4.1) |

Thứ tự "hẹp dần": TGW thông cả mạng, PrivateLink chỉ thông một service. Đề nhấn "least privilege về mạng" hoặc "hai VPC trùng CIDR" → PrivateLink. Chi tiết TGW ở bài ch2-07 §6, RAM ở [[ch3-05-multi-account-governance]] §8.

---

## 3. Security Groups (SG) vs Network ACL (NACL)

### 3.1 Bảng so sánh đầy đủ

Cả hai đều là bộ lọc gói tin theo IP + port (L3/L4), khác nhau ở **chỗ đứng** và ở việc **có nhớ kết nối hay không**.

- **Security Group** bọc quanh từng **ENI** (card mạng ảo của instance, RDS, Lambda trong VPC…). Nó **stateful**: khi cho một kết nối đi qua, nó ghi kết nối đó vào bảng theo dõi, và gói trả lời của đúng kết nối ấy được đi qua mà không cần rule nào.
- **NACL** đứng ở **ranh giới subnet**. Nó **stateless**: không nhớ gì cả, mỗi gói tin (kể cả gói trả lời) được xét lại từ đầu theo rule của chiều nó đang đi. Vì thế phải viết rule cho **cả hai chiều** — đây là gốc của bẫy ephemeral port ở §3.3.

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

**Ephemeral port là gì.** Một kết nối TCP có hai đầu, mỗi đầu là một cặp IP + port. Phía server nghe ở port cố định ai cũng biết (443 cho HTTPS, 5432 cho PostgreSQL). Phía **client** thì không cần port cố định: mỗi lần mở kết nối, hệ điều hành của client **bốc tạm một port còn trống** trong một dải cao để làm "địa chỉ nhận trả lời", dùng xong thì trả lại. Port tạm đó gọi là ephemeral port.

Hệ quả: gói trả lời của server **không** quay về port 443, mà quay về port tạm của client.

```
Client 203.0.113.7 gọi web server 10.0.1.20 trong subnet của bạn:

  Request :  203.0.113.7:51514  →  10.0.1.20:443      (vào subnet  → xét NACL INBOUND)
  Response:  10.0.1.20:443      →  203.0.113.7:51514  (ra khỏi subnet → xét NACL OUTBOUND)
                                              ^^^^^ đích là port tạm của client, không phải 443
```

SG nhớ kết nối nên tự cho response đi. NACL thì không: nếu outbound chỉ allow 443, gói response có **đích là port 51514** sẽ rơi vào rule `*` DENY. Triệu chứng kinh điển: request tới được server (thấy trong access log) nhưng client treo tới khi timeout.

**Dải port tuỳ ai là client** — bên **mở kết nối** quyết định dải, không phải server:

| Client | Dải ephemeral port |
|---|---|
| Linux (nhiều kernel, gồm Amazon Linux) | 32768–61000 |
| Windows Server 2008 trở lên, Windows 10/11 | 49152–65535 |
| Elastic Load Balancing, NAT Gateway, Lambda | 1024–65535 |

Vì không biết trước client ngoài internet chạy hệ điều hành gì, subnet public thường mở hẳn **1024–65535** cho chiều trả lời (ví dụ mẫu trong docs AWS dùng 32768–65535).

**Chiều ngược lại cũng dính bẫy.** Khi instance trong subnet là bên **gọi ra** (ví dụ gọi API bên ngoài ở port 443), vai trò đảo lại:

```
  Request :  10.0.1.20:40000   →  198.51.100.5:443    (OUTBOUND phải allow đích 443)
  Response:  198.51.100.5:443  →  10.0.1.20:40000     (INBOUND phải allow đích 32768–61000)
```

Áp vào bài tập 5 cuối bài: NACL "inbound chỉ 443, outbound chỉ 1024–65535" hỏng **cả hai gói** — request ra có đích 443 không nằm trong dải outbound 1024–65535, và response về có đích là port tạm ~40000 không khớp inbound 443. Cách sửa: thêm outbound 443 và inbound 1024–65535 (hoặc đúng dải của hệ điều hành trên instance).

> 🪤 Thấy "NACL" + "request tới nơi nhưng không có phản hồi" trong đề → nghĩ ngay tới thiếu rule ephemeral port ở chiều trả lời. Thấy cùng triệu chứng mà chỉ có SG → không phải lỗi này, vì SG stateful.

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

### 4.1 Ba loại VPC endpoint — nhìn từ góc bảo mật

**Bài toán.** S3, DynamoDB, Secrets Manager, SQS… là dịch vụ có **địa chỉ public**. Một EC2 trong private subnet muốn gọi chúng thì mặc định phải đi vòng ra internet qua NAT Gateway. Đi như vậy có hai cái dở: tốn phí NAT theo từng GB, và — quan trọng hơn về bảo mật — đã mở đường ra internet thì dữ liệu cũng có đường đi tới bất kỳ đâu. **VPC endpoint** là một "cửa riêng" đặt ngay trong VPC, nối thẳng tới dịch vụ qua mạng nội bộ của AWS: traffic không ra internet, và tại cửa đó bạn đặt được chính sách kiểm soát (§4.2, §4.3).

Có ba loại, khác nhau ở **cách traffic được dẫn tới cửa**:

- **Gateway endpoint** hoạt động ở tầng **định tuyến**. Bạn không nhận được IP nào cả; AWS thêm vào route table của subnet một dòng "đi tới S3 thì rẽ lối này". Đích của dòng đó là một **prefix list** — một danh sách đặt tên (`pl-xxxx`) chứa sẵn các dải IP của S3 trong region, do AWS tự cập nhật. App vẫn gọi tên miền và IP public của S3 như cũ, chỉ có đường đi là khác. Chỉ có cho **S3 và DynamoDB**, và miễn phí.
- **Interface endpoint** đặt hẳn một **ENI có private IP** (ví dụ `10.0.2.57`) vào subnet của bạn; gọi tới IP đó là tới dịch vụ. Công nghệ đứng sau tên là **PrivateLink**: kết nối một chiều từ VPC của bạn tới đúng một service, không thông hai mạng với nhau. Vì nó là một IP thật trong VPC nên **bất kỳ mạng nào route được tới VPC** (on-prem qua Direct Connect/VPN, VPC khác qua peering/TGW) đều gọi được — điều gateway endpoint không làm được, vì route table của VPC không lan ra ngoài VPC. Cũng nhờ là ENI nên gắn được Security Group.
- **Gateway Load Balancer endpoint (GWLBe)** không dùng để gọi dịch vụ AWS, mà để **bắt traffic đi vòng qua thiết bị kiểm tra** của hãng thứ ba. **Gateway Load Balancer (GWLB)** là một load balancer tầng 3: nó nhận nguyên gói IP rồi chia cho một dàn appliance (firewall, IDS/IPS chạy trên EC2). Bạn sửa route table để gói tin có next hop là GWLBe; GWLB bọc **nguyên vẹn** gói gốc trong một lớp vỏ theo giao thức **GENEVE** (chạy trên UDP port 6081) rồi gửi cho appliance. Bọc lại như vậy để appliance thấy đúng IP nguồn/đích ban đầu; kiểm xong nó trả gói về và gói đi tiếp tới đích. Hai đầu kết nối không biết có thiết bị đứng giữa — đề gọi là "transparent inspection".

Về tiền (us-east-1, số tròn): gateway endpoint **$0**; interface endpoint ~**$0,01/giờ cho mỗi AZ** + ~**$0,01/GB**.

```
3 interface endpoint (SSM, Secrets Manager, ECR) × 2 AZ × 730 giờ × $0,01  ≈ $43,8/tháng
+ 100 GB đi qua × $0,01                                                    ≈ $1
                                                                    Tổng   ≈ $44,8/tháng
```

Rẻ theo từng cái nhưng cộng dồn nhanh: mỗi service cần một endpoint riêng, nhân với số AZ. Đó là lý do với S3/DynamoDB trong VPC, đề luôn ưu tiên gateway endpoint miễn phí.

Bảng dưới gom lại ba loại theo các tiêu chí đề hay hỏi:

| | **Gateway endpoint** | **Interface endpoint (PrivateLink)** | **Gateway Load Balancer endpoint (GWLBe)** |
|---|---|---|---|
| Cơ chế | Entry trong **route table**, đích là prefix list `pl-xxxx` | **ENI có private IP** trong subnet của bạn | ENI làm **next hop** trong route table, bọc traffic bằng **GENEVE (UDP 6081)** gửi sang GWLB |
| Dùng cho | Chỉ **S3 và DynamoDB** | Hầu hết service AWS (SSM, KMS, Secrets Manager, ECR, CloudWatch Logs…) + **service của bên thứ 3 / của chính bạn** publish qua PrivateLink | Đẩy traffic qua **appliance inspect của bên thứ 3** (Palo Alto, Fortinet, IDS/IPS) |
| Có Security Group? | ❌ Không — SG không gắn được vào gateway endpoint | ✅ Có — SG trên ENI endpoint là chốt chặn ai trong VPC được gọi endpoint | ❌ Không (SG nằm ở appliance phía sau GWLB) |
| Có endpoint policy? | ✅ (mặc định `Allow *`) | ✅ (mặc định full access) | ❌ |
| On-prem qua DX/VPN gọi được? | ❌ **Không** — route table của VPC không lan sang on-prem | ✅ Có — đây là lý do chính chọn interface endpoint cho S3 dù gateway free | — |
| Tiền | **Free** | Tính **giờ/endpoint/AZ + per-GB** xử lý | Giờ + per-GB |
| Từ khoá đề | "S3 access không ra internet, không tốn thêm phí" | "on-prem phải tới S3 mà **không qua internet**", "private IP cho service", "expose SaaS cho khách mà không peering" | "chèn firewall của hãng thứ ba", "transparent inspection" |

**Bẫy 1**: gateway endpoint chỉ hoạt động **trong VPC**. Đề tả "on-premises qua Direct Connect phải truy cập S3 riêng tư" → đáp án là **interface endpoint cho S3**, không phải gateway endpoint.

**Bẫy 2**: interface endpoint có **private DNS**. Bật lên thì tên chuẩn (`secretsmanager.ap-southeast-1.amazonaws.com`) resolve về private IP — app không phải đổi code. Nếu tắt private DNS mà app vẫn gọi tên chuẩn thì traffic lại ra NAT/internet.

**Bẫy 3**: VPC endpoint **không thay được NAT Gateway** cho mọi thứ. Chỉ service AWS có endpoint mới đi lối này; `yum update` hay gọi API bên ngoài vẫn cần NAT.

### 4.2 Endpoint policy — chặn ngay tại cửa VPC

Endpoint policy là **resource policy gắn trên chính endpoint**. Nó **không cấp quyền**; quyền hiệu lực = **giao** của (IAM identity policy) ∩ (endpoint policy) ∩ (resource policy của service). Mặc định là `Allow *`, tức không siết gì — phải chủ động thay.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ChiChoDocBucketCuaCongTy",
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::acme-prod-data",
        "arn:aws:s3:::acme-prod-data/*"
      ]
    },
    {
      "Sid": "ChanBucketNgoaiOrg",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": "*",
      "Condition": {
        "StringNotEquals": { "aws:ResourceOrgID": "o-a1b2c3d4e5" }
      }
    }
  ]
}
```

Statement thứ hai là mẫu chống **data exfiltration** (resource perimeter): nhân viên hoặc malware trong
VPC không copy được dữ liệu sang bucket **ngoài Organization**, vì request qua endpoint này bị Deny.

> 🪤 **Đừng lẫn hai key này — đề rất hay đánh tráo:**
>
> | Key | Lọc theo | Dùng cho | Chặn được gì |
> |---|---|---|---|
> | `aws:ResourceOrgID` | Org của **resource** đang bị truy cập | **Resource perimeter** | Nhân viên hợp lệ copy dữ liệu ra bucket cá nhân ngoài org (**exfiltration**) |
> | `aws:PrincipalOrgID` | Org của **principal** gọi request | **Identity perimeter** | Người ngoài org dùng credential lạ truy cập resource của bạn |
>
> Chống exfil mà dùng nhầm `aws:PrincipalOrgID` là **vô tác dụng**: nhân viên vẫn đang dùng credential
> trong org, condition không khớp, Deny không bao giờ nổ, dữ liệu vẫn ra ngoài.

### 4.3 Ép traffic chỉ đi qua endpoint — `aws:SourceVpce` vs `aws:SourceVpc`

Hai condition key này chỉ **tồn tại khi request đi qua VPC endpoint**. Request từ internet, từ console, từ laptop có access key → key vắng mặt → `StringNotEquals` khớp → bị Deny. Đó chính là cơ chế khoá bucket.

| Condition key | Giá trị | Khi nào chọn |
|---|---|---|
| `aws:SourceVpce` | ID của **một endpoint** (`vpce-0a1b2c3d`) | Siết chặt nhất — chỉ đúng một endpoint. Dùng khi chỉ có 1 lối vào hợp lệ |
| `aws:SourceVpc` | ID của **VPC** (`vpc-0a1b2c3d`) | Dễ vận hành hơn — mọi endpoint trong VPC đó đều qua được, khỏi sửa policy mỗi lần tạo endpoint mới ở AZ khác |

```json
{
  "Effect": "Deny",
  "Principal": "*",
  "Action": "s3:*",
  "Resource": ["arn:aws:s3:::bucket", "arn:aws:s3:::bucket/*"],
  "Condition": {
    "StringNotEquals": { "aws:SourceVpce": "vpce-0a1b2c3d4e5f6a7b8" }
  }
}
```

→ Bucket chỉ accessible từ VPC endpoint đó, **kể cả kẻ tấn công đã có access key hợp lệ**.

**Bẫy khoá chính mình**: `Deny` này chặn luôn console, CloudShell, CloudFront OAC, và replication/ Athena/ CloudTrail ghi log vào bucket — vì những đường đó không đi qua endpoint. Muốn giữ chúng, thêm ngoại lệ bằng `aws:PrincipalArn`, `aws:SourceArn` hoặc `aws:PrincipalIsAWSService` trong cùng statement.

---

## 5. AWS WAF (Web Application Firewall)

### 5.1 Cơ bản

**Nó là gì.** SG và NACL chỉ nhìn "phong bì" của gói tin: IP nào, port nào. WAF **mở phong bì ra đọc nội dung HTTP** — URI, query string, header, cookie, body — rồi quyết định cho qua hay chặn. Trong câu chuyện ở §1, request `GET /search?q=' OR 1=1--` tới port 443 hoàn toàn hợp lệ với SG; chỉ thứ đọc được chuỗi `q=` mới nhận ra đó là SQL injection.

**Gắn vào đâu.** WAF không đứng một mình trong mạng. Nó chạy **bên trong** một dịch vụ đã giải mã TLS và hiểu HTTP: **CloudFront, ALB, API Gateway, AppSync, App Runner** (và Cognito user pool). Suy ra hai điều đề hay hỏi: WAF **không gắn được vào NLB hay thẳng vào EC2** (NLB làm việc ở L4, không đọc HTTP), và muốn WAF che một app chạy trên EC2 thì phải đặt ALB hoặc CloudFront phía trước.

**Web ACL và cách nó xét một request.** Một **Web ACL** là danh sách rule có đánh số ưu tiên, kèm một **default action** (Allow hoặc Block) cho request không khớp rule nào. Mỗi request đi qua các rule theo **priority từ số nhỏ tới số lớn**:

- Khớp rule có action **Allow** hoặc **Block** → dừng ngay, các rule phía sau không được xét.
- Khớp rule có action **Count** → chỉ tăng bộ đếm, ghi log, rồi **xét tiếp** rule sau. Count không chặn gì cả.
- Không khớp rule nào → áp default action.

Vì "khớp là dừng" nên thứ tự là chuyện sống còn: một rule Allow rộng (ví dụ "cho mọi IP văn phòng") đặt ở priority 0 sẽ khiến IP văn phòng **bỏ qua toàn bộ** rule SQLi phía sau.

**Ba nguồn rule:**

- **Managed rule group** — bộ rule viết sẵn, do AWS hoặc hãng bảo mật trên Marketplace duy trì và tự cập nhật khi có kiểu tấn công mới. Ví dụ: *Core rule set* (các lỗi phổ biến thuộc **OWASP Top 10** — danh sách 10 nhóm lỗ hổng web thường gặp nhất), *SQL database* (SQL injection), *Known bad inputs*, *Bot Control*. Đề nói "chặn SQLi/XSS với ít công vận hành nhất" → managed rule group.
- **Custom rule** — tự viết điều kiện trên IP (IP set), quốc gia (geo match), header, URI, body, kích thước.
- **Rate-based rule** — rule đếm request theo từng nguồn và chỉ ra tay khi nguồn đó gửi quá nhanh (chi tiết ngay dưới).

**Rate-based rule hoạt động thế nào.** Bạn đặt một ngưỡng (tối thiểu 10) và một **cửa sổ đánh giá**: 1, 2, 5 hoặc 10 phút, mặc định 5 phút. WAF gom request theo **khoá gộp** — mặc định là IP nguồn; cũng có thể là IP trong header `X-Forwarded-For`, một header, cookie, hoặc tổ hợp tự chọn — và liên tục đếm số request của mỗi khoá trong cửa sổ vừa qua.

```
Rule: ngưỡng 2.000 request / 5 phút, gộp theo IP
  2.000 ÷ 300 giây ≈ 6,7 request/giây (trung bình) — người dùng thật hiếm khi vượt

IP A gửi 50 request/giây  → sau ~40 giây đã quá 2.000 → các request tiếp theo của A bị Block
IP B gửi 2 request/giây   → 600 request / 5 phút       → không bị gì
```

Không có "án phạt" cố định: IP bị chặn **chừng nào tốc độ của nó còn trên ngưỡng**, tụt xuống dưới thì tự được gỡ. WAF chỉ **ước lượng** tốc độ và có độ trễ (thường dưới 30 giây) cả khi bắt đầu chặn lẫn khi gỡ, nên đây là công cụ chống flood, **không phải** bộ đếm quota chính xác cho API — việc đó thuộc về usage plan của API Gateway.

### 5.2 Patterns

Các rule hay gặp, viết theo thứ tự priority của một Web ACL thực tế (default action = Allow):

```
0  Allow   IP thuộc IP set "monitoring" của công ty      (đặt trước để khỏi bị rate-limit)
1  Block   User-Agent khớp danh sách bot xấu
2  Block   Request từ quốc gia X                          (geo match)
3  Block   Quá 2.000 request / 5 phút trên mỗi IP         (rate-based)
4  Block   Managed: Core rule set — XSS trong URI/header, …
5  Block   Managed: SQL database — SQL injection trong body/query string
6  Block   Body lớn hơn 8 KB                              (size constraint)
```

Một rule rate-based dạng JSON trông như sau — đủ để nhận ra ba thành phần ngưỡng, cửa sổ, khoá gộp:

```json
{
  "Name": "RateLimitPerIP",
  "Priority": 3,
  "Statement": {
    "RateBasedStatement": {
      "Limit": 2000,
      "EvaluationWindowSec": 300,
      "AggregateKeyType": "IP"
    }
  },
  "Action": { "Block": {} }
}
```

**Vì sao rule số 6 là 8 KB chứ không phải 10 MB.** WAF chỉ được đọc phần **đầu** của body: **8 KB** đầu tiên với ALB và AppSync; **16 KB** mặc định (nâng được tới 64 KB, trả thêm tiền) với CloudFront, API Gateway, Cognito, App Runner. Phần body vượt quá mức đó WAF không nhìn thấy, nên kẻ tấn công có thể độn 8 KB rác rồi mới đặt payload phía sau. Cách bịt: một rule size constraint chặn body lớn hơn đúng giới hạn inspect, hoặc đặt *oversize handling* = Match trên các rule đọc body. Endpoint cần nhận file upload lớn thì viết rule Allow riêng cho đúng URI đó, đặt trước.

**Tính tiền** (us-east-1): ~$5/Web ACL/tháng + ~$1/rule (hoặc rule group)/tháng + ~$0,60 mỗi triệu request.

```
1 Web ACL + 5 rule + 100 triệu request/tháng
  = $5 + 5 × $1 + 100 × $0,60  = $70/tháng
```

Phần theo request chiếm gần hết, và nó tính cả request **bị chặn** — bị flood L7 thì hoá đơn WAF cũng tăng.

### 5.3 WAF không phải silver bullet

- **Chỉ làm việc ở L7.** Một trận **DDoS volumetric** (đánh bằng khối lượng: đổ lưu lượng tính bằng Gbps để làm nghẽn đường truyền, chưa cần tới tầng HTTP) không phải việc của WAF — gói SYN hay UDP rác không phải là HTTP request để WAF đọc. Lớp đó do Shield lo (§6). WAF chỉ giúp với flood **HTTP** nhờ rate-based rule.
- **False positive.** Bật mọi managed rule group thì sẽ chặn nhầm request hợp lệ: một form cho người dùng dán đoạn code hay nội dung HTML rất dễ bị coi là XSS/SQLi. Phải chỉnh theo từng app.
- **Quy trình triển khai an toàn:** bật rule ở chế độ **Count** trước (chỉ đếm và ghi log, không chặn), xem log vài ngày để biết rule sẽ chặn những request nào, loại trừ các trường hợp nhầm, rồi mới chuyển sang **Block**. Đề hỏi "thử rule mới mà không ảnh hưởng người dùng" → Count.

---

## 6. AWS Shield

**DDoS là gì.** *Distributed Denial of Service*: kẻ tấn công không tìm cách đột nhập mà dùng hàng nghìn tới hàng triệu máy bị chiếm quyền (botnet) cùng gửi traffic, làm hệ thống **hết tài nguyên** nên người dùng thật không vào được. Có ba kiểu, đánh vào ba thứ tài nguyên khác nhau:

| Kiểu | Đánh vào | Ví dụ và cơ chế |
|---|---|---|
| **Volumetric** (L3/L4) | **Băng thông** đường truyền | **UDP reflection**: kẻ tấn công gửi truy vấn nhỏ tới các server DNS/NTP công cộng nhưng **giả IP nguồn thành IP nạn nhân**. Server trả lời (to hơn câu hỏi nhiều lần) về phía nạn nhân. Nạn nhân bị dội traffic từ hàng nghìn server hợp pháp, không thấy được kẻ đứng sau |
| **State exhaustion** (L4) | **Bảng kết nối** của server/load balancer | **SYN flood**: mở kết nối TCP cần 3 bước (SYN → SYN-ACK → ACK). Kẻ tấn công gửi dồn dập gói SYN rồi **không bao giờ gửi ACK**. Server giữ chỗ cho từng kết nối dang dở tới khi bảng đầy, kết nối thật bị từ chối |
| **Application layer** (L7) | **CPU, database** của ứng dụng | **HTTP flood**: botnet gửi request HTTP hợp lệ vào đúng endpoint nặng (`/search`, `/login`). Từng request trông bình thường, chỉ tổng số là bất thường |

Shield lo hai kiểu đầu ở tầng mạng. Kiểu thứ ba phải có thứ đọc được HTTP — tức WAF.

### 6.1 Shield Standard

Shield Standard là lớp lọc DDoS nằm sẵn ở **biên mạng của AWS**, trước khi traffic tới resource của bạn. Nó nhận diện và bỏ các kiểu tấn công L3/L4 đã biết (SYN flood, UDP reflection) ngay trên đường vào.

- **Miễn phí và luôn bật** cho mọi AWS account. Không có nút bật, không có gì để cấu hình.
- Hiệu quả nhất khi traffic đi vào qua **CloudFront, Route 53, Global Accelerator** (ba dịch vụ chạy ở edge, hấp thụ tấn công trên toàn bộ mạng lưới edge thay vì dồn về một region) và **ELB**.
- Giới hạn: bạn **không thấy gì** (không có báo cáo "đang bị tấn công"), không có ai để gọi, và nó không hiểu traffic "bình thường" của riêng app bạn trông thế nào.

### 6.2 Shield Advanced

Shield Advanced là gói trả tiền, thêm vào đúng ba chỗ Standard thiếu: **phát hiện theo từng resource**, **con người hỗ trợ**, và **bảo vệ hoá đơn**.

- **Phát hiện theo baseline của riêng bạn.** Standard chỉ bắt được các mẫu tấn công chung. Advanced học mức traffic thường ngày của **từng resource** đã đăng ký và báo động khi lệch khỏi mức đó; nếu gắn thêm Route 53 health check, nó dùng luôn tình trạng sức khoẻ của app làm tín hiệu, nên phát hiện được cả những đợt tấn công nhỏ nhưng đủ làm app chậm. "Tinh vi hơn" chính là ở đây: các đợt tấn công **nhỏ, nhắm đúng một app**, không đủ lớn để lộ ra ở quy mô toàn mạng AWS.
- **Giảm thiểu tự động ở L7.** Với resource có Web ACL, Shield Advanced có thể tự tạo và gỡ rule WAF để chặn HTTP flood. Đây là lý do bảng ghi phạm vi "L3–L7": phần L7 thực chất làm **thông qua WAF**.
- **Shield Response Team (SRT)** — tên cũ là DRT (DDoS Response Team), đề thi dùng cả hai. Đội kỹ sư chuyên DDoS trực 24/7; nếu bạn uỷ quyền trước, họ được sửa rule WAF thay bạn ngay trong lúc bị tấn công. Điều kiện: account phải có **Business hoặc Enterprise Support**.
- **Cost protection.** Bị DDoS thì Auto Scaling nở ra, data transfer tăng vọt, và hoá đơn đó vẫn là của bạn. Với Advanced, bạn được xin hoàn (dưới dạng credit) phần chi phí tăng do tấn công trên EC2, ELB, CloudFront, Global Accelerator, Route 53.
- **Nhìn thấy được.** Có metric CloudWatch và báo cáo chi tiết từng sự kiện.
- **Kèm AWS WAF** cho resource đã đăng ký: không tính phí Web ACL, rule và request cơ bản (Bot Control và các gói nâng cao vẫn tính riêng).
- Resource phải **đăng ký thủ công từng cái**, không tự áp: CloudFront distribution, Route 53 hosted zone, Global Accelerator, ELB, và **Elastic IP** (đây là cách bảo vệ EC2 hoặc NLB).

**Giá:**

```
$3.000/tháng × 12 tháng cam kết  = $36.000/năm   (+ phí data transfer out trên resource được bảo vệ)
```

Phí $3.000 tính **một lần cho payer account**, tức cả Organization dùng chung một hoá đơn chỉ trả một lần, không nhân theo số account. Để dễ hình dung mức giá: nó gấp ~40 lần chi phí WAF của ví dụ ở §5.2 ($70/tháng).

### 6.3 Khi nào cần Shield Advanced

Phép so đơn giản: thiệt hại của một lần sập vì DDoS có lớn hơn $36.000/năm không?

- Doanh thu hoặc uy tín mất đi khi down vượt xa mức phí đó: ngân hàng, sàn giao dịch, game online, trang bầu cử, hệ thống có SLA phạt tiền.
- Đã từng bị DDoS, hoặc thuộc ngành hay bị nhắm tới.
- Cần **người** hỗ trợ trong lúc bị tấn công (SRT), hoặc cần **cost protection** để hoá đơn không nổ theo.

Không rơi vào các trường hợp trên thì Shield Standard + CloudFront + WAF rate-based rule là đủ, và đó cũng là đáp án khi đề nhấn "cost-effective".

> 🪤 Đề nhắc "DDoS Response Team / SRT", "hoàn chi phí scale do tấn công", hoặc "bảo vệ Elastic IP" → **Shield Advanced**. Đề chỉ nói "bảo vệ DDoS, không tốn thêm chi phí" → **Shield Standard**, và không cần làm gì để bật.

---

## 7. AWS Network Firewall

**Nó giải quyết bài toán gì.** SG và NACL chỉ trả lời được câu "IP nào, port nào". Chúng không trả lời được: *"server này được ra internet ở port 443, nhưng chỉ tới `api.stripe.com` và `github.com` thôi"*, hay *"gói tin này có mang dấu hiệu của một mã độc đã biết không"*. WAF đọc được nội dung nhưng chỉ cho HTTP **đi vào** qua ALB/CloudFront. **AWS Network Firewall** là firewall do AWS quản lý (bạn không dựng và vá EC2 nào) đứng trên đường đi của **mọi loại traffic của VPC**, cả vào lẫn ra, và đọc được tới nội dung gói tin.

### Traffic bị ép đi qua firewall thế nào

Network Firewall không tự động thấy traffic. Bạn tạo firewall thì AWS đặt một **firewall endpoint** vào một **subnet riêng** ở mỗi AZ (subnet này chỉ chứa endpoint, không chứa gì khác). Sau đó chính bạn **sửa route table** để traffic có next hop là endpoint đó:

```
Trước:  private subnet ──► NAT Gateway ──► Internet Gateway ──► internet

Sau:    private subnet ──► NAT Gateway ──► firewall endpoint ──► Internet Gateway ──► internet
                                           (subnet firewall)
        Chiều về: route table gắn vào IGW trỏ dải IP của VPC về lại firewall endpoint
```

Quên sửa route ở một chiều thì traffic chiều đó lách qua firewall, hoặc bị rớt vì firewall chỉ thấy một nửa kết nối. Với nhiều VPC, mô hình thường gặp là một **inspection VPC** riêng chứa firewall, nối vào **Transit Gateway**; TGW route mọi traffic giữa các VPC và ra internet đi vòng qua đó.

### Bên trong: hai bộ máy rule

Mỗi gói tin đi qua hai tầng theo thứ tự:

1. **Stateless engine** xét từng gói riêng lẻ theo **5-tuple** (IP nguồn, IP đích, port nguồn, port đích, giao thức), giống NACL: rule theo thứ tự ưu tiên, khớp là dừng. Kết quả là pass, drop, hoặc chuyển tiếp cho tầng sau.
2. **Stateful engine** xét gói tin **trong ngữ cảnh cả kết nối** và đọc được nội dung. Đây là nơi làm các việc SG/NACL không làm được:
   - **Lọc theo tên miền.** Với HTTP nó đọc header `Host`; với HTTPS nó đọc trường **SNI** — tên miền mà client gửi **không mã hoá** ở bước đầu của bắt tay TLS. Nhờ vậy cho/chặn được `*.example.com` mà không cần giải mã traffic.
   - **IDS/IPS theo chữ ký.** *IDS* (Intrusion Detection System) phát hiện và báo động; *IPS* (Intrusion Prevention System) phát hiện rồi chặn luôn. "Signature-based" nghĩa là so traffic với một thư viện **mẫu nhận dạng** của các cuộc tấn công đã biết (chuỗi byte đặc trưng của một exploit, kiểu gói tin của một họ malware).
   - Rule viết theo cú pháp của **Suricata** — một engine IPS mã nguồn mở phổ biến. "Suricata-compatible" có ý nghĩa thực tế: bộ rule Suricata công ty đang dùng ở on-prem, hoặc mua từ hãng bảo mật, mang lên dùng lại được. AWS cũng có sẵn managed rule group (danh sách domain độc hại, chữ ký mối đe doạ).

### Use case

- **Egress filtering**: chỉ cho server gọi ra một danh sách domain đã duyệt. Malware trong VPC muốn gọi về máy chủ điều khiển của kẻ tấn công (**C2** — *command and control*) thì bị chặn vì domain không nằm trong danh sách.
- **Inspect traffic giữa các VPC** qua TGW (east-west), không chỉ traffic ra internet.
- **Compliance** yêu cầu có IDS/IPS hoặc deep packet inspection trên mọi luồng mạng.

### Khác SG/NACL và WAF

| | SG / NACL | AWS WAF | Network Firewall |
|---|---|---|---|
| Nhìn thấy | IP, port, giao thức | Nội dung **HTTP** | IP/port **và** nội dung gói tin của nhiều giao thức |
| Chiều | Vào + ra | Chỉ request **vào** app | Vào + ra + giữa các VPC |
| Lọc theo tên miền | Không | Chỉ header `Host` của request vào | Có (HTTP `Host`, TLS SNI) |
| IDS/IPS | Không | Không | Có (rule Suricata) |
| Đứng ở đâu | ENI / subnet | Trong CloudFront, ALB, API Gateway… | Endpoint trong subnet riêng, traffic tới nhờ route table |
| Giá | Miễn phí | ~$70/tháng ở ví dụ §5.2 | ~$640/tháng ở ví dụ dưới |

### Cost

Tính theo **giờ của mỗi endpoint** (mỗi AZ một endpoint) cộng **mỗi GB** đi qua. Giá us-east-1: ~$0,395/giờ/endpoint và ~$0,065/GB. So với NAT Gateway (~$0,045/giờ và ~$0,045/GB), cho hệ thống 2 AZ, 1.000 GB/tháng:

```
Network Firewall:  2 endpoint × 730 giờ × $0,395 = $576,70
                   1.000 GB × $0,065             =  $65,00
                                           Tổng  ≈ $641,70/tháng

NAT Gateway:       2 × 730 giờ × $0,045          =  $65,70
                   1.000 GB × $0,045             =  $45,00
                                           Tổng  ≈ $110,70/tháng
```

Tức đắt gấp ~6 lần NAT Gateway, và phần lớn là **phí giờ cố định** ($577) — trả đủ dù traffic gần bằng 0. (AWS có miễn một phần phí NAT Gateway khi NAT đứng chung đường với Network Firewall, nhưng phí firewall thì vẫn nguyên.) Vì vậy chỉ chọn Network Firewall khi đề thật sự đòi **đọc nội dung gói tin, IDS/IPS, hoặc compliance**. Nếu chỉ cần chặn tên miền thì DNS Firewall (§10) rẻ hơn khoảng 10 lần.

---

## 8. AWS Firewall Manager

- Centralize WAF, Shield Advanced, Security Group, Network Firewall, Route 53 DNS Firewall **across accounts in Organization**.
- 1 policy → apply nhiều account.
- Use case: enforce baseline security (vd: bắt buộc mọi ALB phải có WAF với managed rule X).

---

## 9. Bastion & access pattern

Bài toán: instance nằm trong private subnet, không có public IP. Admin cần shell vào để debug thì đi đường nào, và đường đó mở thêm bề mặt tấn công gì?

### 9.1 Classic bastion (anti-pattern ngày càng)

**Bastion host** (còn gọi jump box) là một EC2 đặt ở **public subnet** làm trạm trung chuyển: admin SSH từ internet vào bastion, rồi từ bastion SSH tiếp vào instance private. SG của instance private chỉ nhận port 22 từ SG của bastion.

Cách này chạy được, nhưng mỗi phần của nó là một gánh:

- **Một port 22 mở ra internet.** Dù SG giới hạn theo IP văn phòng, đó vẫn là một cửa vào phải canh; nếu lỡ để `0.0.0.0/0` thì bot quét SSH trên internet sẽ dò mật khẩu/key liên tục.
- **Phải quản SSH key.** Key nằm trên laptop từng người; ai nghỉ việc phải đi gỡ public key trên từng server. Key lộ là mất quyền vào.
- **Audit yếu.** SSH log chỉ cho biết "user `ec2-user` đăng nhập", không biết là người nào và đã gõ lệnh gì.
- **Thêm một server để nuôi**: vá lỗi, trả tiền, và nếu chỉ có một cái thì nó là điểm chết duy nhất.

### 9.2 Systems Manager Session Manager (recommended)

**Cơ chế — vì sao không cần mở inbound port nào.** Trên instance có sẵn **SSM Agent** (cài sẵn trong Amazon Linux, Ubuntu và Windows AMI của AWS). Agent **tự mở một kết nối HTTPS đi ra** (outbound 443) tới dịch vụ Systems Manager và giữ kết nối đó để chờ lệnh. Khi admin bấm "Start session", lệnh và kết quả chạy **ngược về trên chính kết nối outbound ấy**. Từ góc nhìn của SG, không hề có kết nối nào đi *vào* instance, nên inbound để trống hoàn toàn — không port 22, không public IP, không bastion.

Instance trong private subnet tới được Systems Manager bằng một trong hai đường: qua NAT Gateway, hoặc — nếu subnet không có đường ra internet — qua **interface endpoint** (§4.1) cho `ssm`, `ssmmessages` và `ec2messages`.

Đổi lại những gì:

- **Không SSH key.** Ai được mở session do **IAM policy** quyết định (`ssm:StartSession`), nên kéo theo được MFA, giới hạn theo tag, và thu hồi quyền bằng cách gỡ policy.
- **Audit đầy đủ.** CloudTrail ghi **IAM principal nào** mở session vào instance nào, lúc nào; nội dung phiên (lệnh gõ và output) ghi được ra S3 hoặc CloudWatch Logs.
- Instance cần một **instance profile** có policy `AmazonSSMManagedInstanceCore`. Thiếu role này là lý do số một khiến instance không hiện trong danh sách.

Bốn điều kiện đầy đủ và sơ đồ một phiên trong private subnet nằm ở [[ch3-06-operations-iac]] §3–§4.

### 9.3 Client VPN / Direct Connect

Hai cách trên cho admin vào **một instance**. Khi cả nhóm dev cần tới **nhiều thứ trong VPC** (database, dashboard nội bộ, service chưa public) thì đưa hẳn máy họ vào mạng:

- **AWS Client VPN**: dịch vụ VPN do AWS quản lý, chạy giao thức OpenVPN. Laptop cài client, kết nối xong thì có một IP trong dải riêng và route được vào VPC. Xác thực người dùng bằng **Active Directory**, **certificate** (mutual TLS: cả hai phía trình chứng thư), hoặc **SAML** (chuẩn đăng nhập một lần — người dùng đăng nhập ở hệ thống danh tính của công ty như Okta/Entra ID, hệ thống đó cấp một "giấy xác nhận" có chữ ký để Client VPN tin).
- **Direct Connect / Site-to-Site VPN**: nối **cả mạng văn phòng** với VPC, người trong văn phòng tới thẳng private IP mà không cài gì. Chi tiết ở bài ch2-07.

Vào được mạng rồi thì SG vẫn là lớp quyết định ai tới được port nào.

### 9.4 EC2 Instance Connect

Vẫn là SSH, nhưng bỏ được việc quản key dài hạn. Khi bạn kết nối, API của EC2 Instance Connect **đẩy một SSH public key dùng một lần** vào instance metadata; key đó chỉ tồn tại **60 giây**, đủ để phiên SSH xác thực xong. Quyền đẩy key do IAM kiểm soát và mọi lần kết nối được ghi vào CloudTrail. Dùng được ngay từ console (SSH trong trình duyệt), miễn phí.

Khác biệt gốc so với Session Manager: đây vẫn là **kết nối SSH đi vào**, nên instance vẫn phải **mở inbound port 22** và phải tới được qua mạng (có public IP, hoặc đi qua *EC2 Instance Connect Endpoint* cho instance private).

### 9.5 Đặt bốn cách cạnh nhau

| | Bastion | Session Manager | EC2 Instance Connect | Client VPN |
|---|---|---|---|---|
| Inbound port trên instance | 22 (từ bastion) | **Không** | 22 | Tuỳ service cần tới |
| SSH key dài hạn | Có | Không | Không (key sống 60 giây) | Tuỳ |
| Ai được vào do | Key + SG | **IAM** | **IAM** + SG | AD / certificate / SAML + SG |
| Audit | Log SSH của OS | CloudTrail + log nội dung phiên | CloudTrail (ai kết nối) | Log kết nối VPN |
| Chi phí thêm | Một EC2 chạy 24/7 | Không (trừ phí interface endpoint nếu dùng) | Không | Theo giờ endpoint + giờ kết nối |

> 🪤 Đề hỏi "truy cập shell vào instance private, **không mở port inbound, không quản SSH key**, có audit" → **Session Manager**. Đáp án có "bastion host" gần như luôn là mồi nhử, trừ khi đề nói rõ phải dùng công cụ chỉ chạy được qua SSH thuần.

---

## 10. Route 53 Resolver DNS Firewall

Mọi instance trong VPC mặc định hỏi tên miền qua **Route 53 Resolver** — DNS server có sẵn của VPC. DNS Firewall là bộ lọc đặt ngay tại resolver đó: nó xem **tên miền đang được hỏi** và quyết định trả lời hay không. Malware gần như luôn phải resolve tên miền của máy chủ điều khiển (C2) trước khi kết nối, nên chặn ở bước hỏi DNS là cắt được từ gốc, mà không cần đụng tới route table.

**DNS tunneling** là cách tuồn dữ liệu ra ngoài bằng chính câu hỏi DNS: malware mã hoá dữ liệu thành tên miền con, ví dụ hỏi `4d7a5f3e2a.evil.com`. Câu hỏi đó được chuyển tới DNS server của kẻ tấn công (chủ của `evil.com`), và phần `4d7a5f3e2a` chính là dữ liệu bị đánh cắp. Cách này lọt qua SG và NACL vì SG không chặn được traffic tới Route 53 Resolver, và gần như VPC nào cũng cho phép DNS.

- Block DNS query đến domain xấu (malware, C2).
- Hoặc đảo lại thành allow list: chỉ cho resolve các domain đã duyệt, còn lại chặn hết. Chặt nhất, và là cách chống DNS tunneling triệt để.
- Giá (us-east-1): ~$0,60 mỗi triệu query. 100 triệu query/tháng ≈ **$60**, so với ~$640 của Network Firewall ở §7.
- Gắn vào **VPC** (qua Resolver rule group), không gắn vào instance. Action mỗi domain list: **ALLOW / BLOCK / ALERT**; khi BLOCK chọn trả `NODATA`, `NXDOMAIN` hoặc `OVERRIDE` (trả về domain sinkhole của bạn).
- Có **AWS managed domain list** (malware, botnet C2) — bật được ngay, không cần tự nuôi feed.

---

## 11. Bảng quyết định — WAF vs Shield vs Network Firewall vs DNS Firewall

Đây là nhóm dễ nhầm nhất của domain 1. Mẹo phân biệt: **hỏi "chặn ở tầng nào và gắn vào cái gì"**, không hỏi "cái nào mạnh hơn".

| Service | Tầng chặn | Chặn được gì | Gắn vào | Tính tiền | Từ khoá đề |
|---|---|---|---|---|---|
| **AWS WAF** | **L7 — HTTP/HTTPS request** | SQLi, XSS, bad bot, scraping, credential stuffing, geo-block, **rate-based rule** (mặc định cửa sổ 5 phút, cấu hình được 1/2/5/10 phút; aggregate theo IP, forwarded IP, header, cookie hoặc custom key), size constraint | CloudFront, ALB, API Gateway, AppSync, Cognito user pool, App Runner | Web ACL/tháng + mỗi rule/tháng + **theo triệu request** | "OWASP Top 10", "SQL injection", "chặn theo quốc gia", "giới hạn số request từ một IP", "chặn bot" |
| **Shield Standard** | L3/L4 | DDoS thường gặp: SYN/UDP flood, reflection | **Tự động, không cấu hình** — CloudFront, Route 53, Global Accelerator, ELB | **Miễn phí, luôn bật** cho mọi account | "đã có sẵn", "không tốn thêm chi phí", "bảo vệ DDoS cơ bản" |
| **Shield Advanced** | L3–L7 | DDoS tinh vi, phát hiện theo health check của resource, **kèm AWS WAF miễn phí** trên resource được bảo vệ | Đăng ký thủ công từng resource: CloudFront, Route 53 hosted zone, Global Accelerator, ELB, **Elastic IP của EC2/NLB** | **$3.000/tháng** cho cả Organization, cam kết 1 năm (+ data transfer) | "**SRT**/DDoS Response Team trực 24/7", "**cost protection** hoàn tiền khi scale do DDoS", "SLA/brand nhạy cảm" |
| **Network Firewall** | L3–L7, **stateful + stateless**, có **IDS/IPS** | Lọc **egress theo domain** (kể cả HTTPS nhờ đọc **SNI**), chặn C2 callback, deep packet inspection, rule **Suricata** | **VPC** — tạo firewall endpoint trong **subnet riêng mỗi AZ**, sửa route table để traffic vòng qua | Theo **giờ/endpoint** + **per-GB** xử lý → đắt | "inspect mọi outbound", "IDS/IPS", "compliance bắt buộc deep packet inspection", "chặn domain xấu ở tầng mạng" |
| **Route 53 Resolver DNS Firewall** | **Tầng truy vấn DNS** | Chặn/cho phép **tên miền** khi resolve; chống **DNS tunneling exfiltration** | **VPC** (qua rule group) | Theo số **DNS query** + rule group | "DNS tunneling", "chỉ cho resolve domain trong allow list", "chặn malware domain rẻ nhất" |

**Cách chọn nhanh trong phòng thi**

- Đề nói **HTTP request có payload độc** → **WAF**. WAF **không** chặn được DDoS volumetric.
- Đề nói **DDoS** mà nhấn "không tốn thêm tiền / đã có sẵn" → **Shield Standard**. Nhấn "đội hỗ trợ khi bị tấn công", "được hoàn phần chi phí scale" → **Shield Advanced**.
- Đề nói **outbound / egress phải kiểm soát** → nếu chỉ cần chặn **tên miền** thì **DNS Firewall** (rẻ hơn nhiều); nếu cần **inspect nội dung gói tin / IDS/IPS / compliance** thì **Network Firewall**.
- Đề nói **áp một chính sách cho tất cả account trong Organization** → **AWS Firewall Manager** (mục 8), không phải cấu hình tay từng cái.

**Bẫy chồng chéo**: DNS Firewall chỉ thấy **truy vấn DNS**. Malware hard-code IP (không resolve DNS) thì DNS Firewall mù — lúc đó mới cần Network Firewall. Ngược lại, Network Firewall đắt hơn nhiều; đề nào nhấn "cost-effective" mà chỉ yêu cầu chặn domain thì chọn DNS Firewall.

---

## 12. GuardDuty (detective, sang chương 3.4)

Nhắc lại trong context: GuardDuty phân tích VPC Flow Logs + DNS Logs + CloudTrail → detect anomaly. Là **detective**, không **preventive**. Chi tiết ở [[ch3-04-detective-controls]].

---

## 13. Defense in depth — ví dụ web app

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

## 14. Ví dụ design cho 4 use case

Mỗi thiết kế dưới đây xuất phát từ một câu hỏi: **mối đe doạ chính là gì**, rồi mới chọn lớp chặn tương ứng. Cùng một bộ dịch vụ, bốn bối cảnh cho ra bốn lựa chọn khác nhau.

### 14.1 Public web app B2C

Mối đe doạ: ai trên internet cũng gọi được, nên phải chịu cả tấn công web lẫn flood.

| Thành phần | Vì sao chọn |
|---|---|
| **CloudFront + WAF** (managed Core rule set, SQL database, rate-based rule) | Chặn SQLi/XSS và HTTP flood **ở edge**, trước khi request tới region. CloudFront còn hấp thụ DDoS L3/L4 trên mạng lưới edge |
| **ALB + SG** | ALB là thứ duy nhất nằm ở public subnet. Nên giới hạn SG của ALB chỉ nhận từ CloudFront (managed prefix list của CloudFront), để không ai gọi thẳng ALB mà né WAF |
| **App ở private subnet, SG tham chiếu SG của ALB** (§3.4) | App không có public IP; chỉ ALB gọi được vào port app, kể cả khi ALB đổi IP lúc scale |
| **RDS Multi-AZ ở subnet riêng, SG chỉ nhận từ SG của app, mã hoá bằng KMS** | DB không có đường ra/vào internet. KMS bảo vệ dữ liệu lúc lưu, phòng khi snapshot hay ổ đĩa bị lộ |
| **Shield Standard** (có sẵn); **Advanced** nếu là mục tiêu DDoS | Theo phép so ở §6.3 |

### 14.2 Enterprise SaaS B2B, customer cấp IP whitelist

Mối đe doạ: chỉ một nhóm khách hàng biết trước được phép gọi; mọi nguồn khác đều là không mong muốn.

- **Cách 1 — vẫn đi internet, lọc theo IP nguồn.** Endpoint vẫn internet-facing, nhưng chỉ cho CIDR của khách: dùng **SG** nếu danh sách ngắn và ít đổi, hoặc **WAF IP set** nếu danh sách dài, đổi thường xuyên, hay mỗi khách một đường dẫn riêng (WAF kết hợp được điều kiện IP với URI, SG thì không). Điểm yếu: IP nguồn của khách đổi là phải cập nhật, và traffic vẫn chạy trên internet.
- **Cách 2 — PrivateLink.** Bạn publish service thành một *endpoint service* (đứng sau NLB); khách tạo interface endpoint trong VPC của họ và gọi qua private IP. Không qua internet, không cần whitelist IP, không lo trùng CIDR, và khách **chỉ thấy đúng một service** chứ không thấy mạng của bạn. Đề nhấn "private connectivity tới khách hàng, không peering" → cách này.

### 14.3 Healthcare HIPAA

Mối đe doạ: **dữ liệu bệnh nhân lọt ra ngoài**, và phải **chứng minh được** với kiểm toán rằng nó không lọt.

- **Multi-account: prod / data / audit** (§2.2). Người vận hành prod không có quyền trong account audit, nên không xoá được dấu vết.
- **Network Firewall inspect mọi egress** (§7). Server chỉ gọi ra được các domain đã duyệt; đây là chỗ yêu cầu compliance biện minh cho mức phí ~$640/tháng.
- **Mã hoá mọi dữ liệu bằng KMS**, và **bucket policy từ chối upload không mã hoá** để việc mã hoá là bắt buộc chứ không phụ thuộc vào ý thức của từng dev.
- **VPC endpoint cho mọi service AWS cần dùng**, data subnet không có route tới IGW/NAT. Dữ liệu tới S3/KMS đi mạng nội bộ AWS; kèm endpoint policy ở §4.2 để không copy được ra bucket ngoài Organization.
- **CloudTrail + GuardDuty + Config conformance pack HIPAA**: ba lớp *detective* — ai làm gì, có hành vi bất thường không, cấu hình có lệch khỏi chuẩn không (chi tiết ở [[ch3-04-detective-controls]]).

### 14.4 Dev environment

Mối đe doạ: không phải hacker tinh vi, mà là **sai sót và chi phí** — dev mở nhầm port, quên tắt máy, tạo resource lung tung. Thiết kế ưu tiên đơn giản và rẻ.

- **Một account dev riêng, SG đơn giản.** Tách khỏi prod là đủ để sai sót ở dev không chạm dữ liệu thật; không cần WAF hay Network Firewall.
- **Session Manager thay bastion** (§9.2): bớt một EC2 phải trả tiền và vá, không có port 22 nào để dev lỡ tay mở ra `0.0.0.0/0`.
- **SCP chặn các region không dùng** (SCP — *Service Control Policy* — là policy của Organizations đặt trần quyền cho cả account). Dev không tạo được resource ở region lạ, nơi không ai theo dõi và hoá đơn âm thầm chạy.

---

## 15. Cạm bẫy đề thi (SAA)

1. **"NACL stateful"** → **Sai**, stateless.
2. **"SG có deny rule"** → **Sai**, SG chỉ allow.
3. **"WAF chặn DDoS volumetric"** → **Sai**, WAF L7. DDoS lớn cần Shield Advanced + scale infra.
4. **"Shield Standard cần bật"** → **Sai**, mặc định bật và free.
5. **"VPC endpoint thay thế NAT GW cho mọi traffic"** → **Sai**, chỉ cho service AWS có endpoint. Traffic internet khác vẫn cần NAT.
6. **"Bastion là best practice"** → **Lạc hậu**. SSM Session Manager tốt hơn.
7. **"SG cross-VPC reference"** → **Đúng** nếu hai VPC nối bằng VPC peering hoặc Transit Gateway, cùng region (qua TGW chỉ tham chiếu được trong rule **inbound**). Khác region thì phải dùng CIDR.
8. **"NACL allow ephemeral port 1024-65535"** → Đúng nếu muốn phủ mọi loại client (ELB, NAT Gateway, Lambda dùng cả dải này). Dải hẹp hơn tuỳ hệ điều hành của **bên mở kết nối**: Linux 32768–61000, Windows Server 2008+ 49152–65535 (§3.3). Điều đề thật sự kiểm tra là bạn có nhớ mở dải này ở **chiều trả lời** hay không.
9. **"PrivateLink tự encrypt"** → Layer transport (TCP). App vẫn nên TLS.
10. **"Gateway endpoint cho on-prem qua Direct Connect truy cập S3"** → **Sai**. Gateway endpoint chỉ dùng được trong VPC. On-prem cần **interface endpoint** (PrivateLink) cho S3.
11. **"Endpoint policy cấp quyền cho request"** → **Sai**. Nó chỉ **giới hạn**; quyền hiệu lực = giao của IAM policy ∩ endpoint policy ∩ resource policy. Mặc định endpoint policy là `Allow *` nên không siết gì cho tới khi bạn thay.
12. **"Shield Advanced tính $3000/tháng cho mỗi account"** → **Sai**, tính một lần cho cả Organization.
13. **"Dùng Network Firewall để chặn nhân viên resolve domain xấu cho rẻ"** → Sai hướng: nếu chỉ cần chặn **tên miền** thì **Route 53 Resolver DNS Firewall** rẻ hơn nhiều. Network Firewall dành cho inspect nội dung gói tin / IDS/IPS.
14. **"DNS Firewall chặn được mọi kết nối ra ngoài"** → **Sai**. Malware hard-code IP không truy vấn DNS → DNS Firewall mù. Lúc đó mới cần Network Firewall.

---

## 16. Tóm tắt 1 dòng

> Defense in depth: **L3/L4 (SG, NACL, Shield) + L7 (WAF) + DNS Firewall + Network Firewall + IAM + Encryption**. SG cho 95% case, NACL cho deny explicit, WAF cho HTTP, Shield Standard free luôn-bật, Advanced cho high-stake.

---

## 17. Bài tập tự kiểm tra

1. App bị DDoS layer 7 (botnet với valid HTTP request). SG và Shield Standard có chặn được không? Bạn dùng gì?
2. Compliance yêu cầu mọi outbound traffic đến internet phải inspect domain. Service AWS nào? So sánh với chỉ dùng NAT + proxy app-level.
3. Bucket S3 lưu PII. Yêu cầu: chỉ truy cập từ VPC `vpc-xxx`, từ role `arn:aws:iam::123:role/Reader`, MFA enabled. Viết bucket policy.
4. So sánh SSM Session Manager vs Bastion EC2 ở 4 khía cạnh: security, cost, audit, UX.
5. Một subnet có NACL allow inbound 443 only, outbound 1024-65535 only. EC2 trong subnet không kết nối được ra ngoài port 443. Vì sao? Fix?
6. Multi-account org cần đảm bảo mọi VPC có VPC Flow Logs bật. Cách scale (không phải Terraform mỗi VPC)?

---

## 18. Đọc thêm

- AWS Whitepaper — *AWS Security Best Practices*, *AWS Best Practices for DDoS Resiliency*.
- AWS docs — *VPC Security*, *AWS WAF Developer Guide*.
- *AWS Security Maturity Model*.

---

**Bài tiếp theo**: [[ch3-03-data-protection]] — KMS, encryption everywhere, Secrets Manager, certificate management.
