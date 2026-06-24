# Bài 2 — Shared Responsibility Model

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích sự khác biệt giữa **"Security OF the cloud"** vs **"Security IN the cloud"**.
- Nói chính xác trách nhiệm thuộc về **AWS** hay **khách hàng** cho 1 service cụ thể (EC2, RDS, Lambda, S3, DynamoDB...).
- Phân biệt 3 loại service: **Infrastructure / Container / Abstracted** — và trách nhiệm dịch chuyển ra sao.
- Tránh 5 hiểu lầm phổ biến gây ra 90% data breach trên AWS.

---

## 2. Lý thuyết

### 2.0 Analogy — Thuê căn hộ chung cư cao cấp

AWS = **chủ đầu tư toà nhà**. Bạn = **khách thuê căn hộ**.

| Thành phần | Ai chịu | Tại sao |
|------------|---------|---------|
| **Móng, cột, kết cấu toà nhà** | Chủ đầu tư (AWS) | Bạn không động vào được. |
| **Thang máy, máy phát điện, máy lọc nước** | Chủ đầu tư (AWS) | Hạ tầng dùng chung. |
| **Bảo vệ ngoài cổng, camera hành lang** | Chủ đầu tư (AWS) | Physical security. |
| **Khoá cửa căn hộ bạn** | **Bạn** | Bạn quyết định ai có chìa. |
| **Đồ đạc trong nhà, két sắt** | **Bạn** | Tài sản riêng. |
| **Để cửa mở ra rồi mất đồ** | **Bạn chịu**, không kiện chủ đầu tư được | Lỗi của bạn. |
| **Khoá cửa hỏng do nhà sản xuất** | Chủ đầu tư (AWS) | Vấn đề thiết bị của họ. |
| **Mời khách lạ vào rồi bị cướp** | **Bạn** | Bạn cho phép. |
| **Hoả hoạn do bạn nấu bếp ẩu** | **Bạn** | Trừ khi do hệ thống điện của toà. |

**Quy tắc vàng**: AWS chịu **"OF the cloud"** (toà nhà — hardware, network vật lý, hypervisor, datacenter). Bạn chịu **"IN the cloud"** (đồ trong nhà — data, IAM, OS guest, app, network config).

---

### 2.0.1 Câu chuyện — Capital One 2019: $190M phạt vì hiểu sai shared responsibility

**Tóm tắt sự kiện**: Tháng 7/2019, hacker Paige Thompson (cựu engineer Amazon) đánh cắp data **106 triệu khách hàng** Capital One từ S3 bucket, gồm SSN, số tài khoản, hạn mức tín dụng. Capital One bị phạt **$80M (OCC) + $190M settlement**, mất uy tín, CIO bị sa thải.

#### Cái sai
1. **WAF (Web Application Firewall)** trên EC2 chạy với **IAM Role overly-permissive** — role có `s3:ListBuckets` và `s3:GetObject` cho **mọi bucket trong account**, không giới hạn.
2. Có **lỗ hổng SSRF (Server-Side Request Forgery)** trong WAF code — hacker khai thác để gọi metadata endpoint `http://169.254.169.254` → lấy temp credential của role.
3. **IMDSv1** (legacy) cho phép request không token → SSRF dễ khai thác.
4. Bucket S3 **không có encryption-by-default + không có bucket policy deny external principal**.
5. **CloudTrail không alert** khi 1 IP lạ download hàng GB từ S3.

#### Mỗi bên chịu gì
- **AWS chịu** (đã làm tốt): S3 hạ tầng không bị compromise. EC2 hypervisor an toàn. IAM service hoạt động đúng. **AWS không có lỗi**.
- **Capital One chịu** (đã làm sai):
  - Cấu hình IAM Role: **trách nhiệm khách hàng**.
  - Patch lỗ hổng SSRF trong WAF app code: **trách nhiệm khách hàng**.
  - Bật IMDSv2 thay IMDSv1: **trách nhiệm khách hàng**.
  - Bật encryption + bucket policy: **trách nhiệm khách hàng**.
  - Setup CloudTrail alert: **trách nhiệm khách hàng**.

**Bài học**:
- AWS không bao giờ "bao" cho bạn lỗi cấu hình.
- Service "managed" như S3 vẫn cần bạn config đúng IAM và encryption.
- Bật **IMDSv2** (token-based) — bài 4 sẽ chi tiết.
- **Least privilege** cho IAM Role — bài 3 đã nói.

---

### 2.0.2 Use case map — service nào bạn chịu gì

3 tầng service AWS, trách nhiệm dịch chuyển dần:

| Tầng | Service ví dụ | AWS chịu | Khách hàng chịu |
|------|----------------|----------|------------------|
| **Infrastructure** | EC2, EBS, VPC, Auto Scaling | HW, hypervisor, network vật lý | **OS guest, patching, IAM, SG, NACL, encryption, backup, app** |
| **Container** (managed platform) | RDS, ECS, EKS, Beanstalk, EMR | + OS, runtime patching, scaling, backup tự động | IAM, network config, **data, schema, query, encryption choice (KMS)** |
| **Abstracted** | S3, DynamoDB, SQS, Lambda, SNS | + tất cả OS/runtime, tự scale | IAM policy, **data**, encryption choice, code (Lambda) |

→ **Càng "abstracted" càng đỡ việc**, nhưng **IAM + data + encryption choice LUÔN của bạn**, dù service abstract đến đâu.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Ranh giới trách nhiệm dịch chuyển qua 3 loại service AWS</title>
  <desc>Ba cột so sánh cùng cấu trúc: Infrastructure (EC2), Container (RDS), Abstracted (S3 và Lambda). Mỗi cột chia hai phần — phần khách hàng chịu (phía trên) thu hẹp dần khi service càng managed, phần AWS chịu (phía dưới) lớn dần. Ranh giới đi lên từ trái sang phải.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Service càng managed → phần khách hàng chịu càng thu hẹp</text>
  <g font-size="11.5">
    <rect x="16" y="44" width="150" height="16" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="26" y="56" fill="currentColor">Khách hàng chịu (IN)</text>
    <rect x="180" y="44" width="150" height="16" rx="4" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="190" y="56" fill="currentColor">AWS chịu (OF)</text>
  </g>
  <!-- Infrastructure (EC2) -->
  <g>
    <text x="100" y="84" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Infrastructure</text>
    <text x="100" y="100" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.65">EC2 · EBS · VPC</text>
    <rect x="32" y="110" width="136" height="150" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="100" y="132" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">OS guest · patch</text>
    <text x="100" y="150" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">app · IAM</text>
    <text x="100" y="168" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">SG · NACL</text>
    <text x="100" y="186" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">data · encryption</text>
    <text x="100" y="204" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">backup</text>
    <rect x="32" y="262" width="136" height="68" rx="7" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="100" y="290" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">HW · hypervisor</text>
    <text x="100" y="308" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">network vật lý</text>
  </g>
  <!-- Container (RDS) -->
  <g>
    <text x="290" y="84" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Container</text>
    <text x="290" y="100" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.65">RDS · ECS · EKS</text>
    <rect x="222" y="110" width="136" height="92" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="290" y="134" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">IAM · network</text>
    <text x="290" y="152" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">data · schema</text>
    <text x="290" y="170" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">query · encryption</text>
    <text x="290" y="188" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">choice (KMS)</text>
    <rect x="222" y="204" width="136" height="126" rx="7" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="290" y="230" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">+ OS · runtime</text>
    <text x="290" y="248" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">patch · scaling</text>
    <text x="290" y="266" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">backup tự động</text>
    <text x="290" y="298" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">HW · hypervisor</text>
  </g>
  <!-- Abstracted (S3/Lambda) -->
  <g>
    <text x="480" y="84" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Abstracted</text>
    <text x="480" y="100" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.65">S3 · Lambda · DynamoDB</text>
    <rect x="412" y="110" width="136" height="60" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="480" y="134" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">IAM policy · data</text>
    <text x="480" y="152" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">encryption · code</text>
    <rect x="412" y="172" width="136" height="158" rx="7" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="480" y="210" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">+ tất cả OS/runtime</text>
    <text x="480" y="232" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">tự scale</text>
    <text x="480" y="262" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">service code</text>
    <text x="480" y="284" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">HW · hypervisor</text>
  </g>
  <!-- boundary trend line going up -->
  <g stroke="#f59e0b" stroke-width="2.2" stroke-opacity="0.85" fill="none">
    <path d="M32 262 L168 262 L222 204 L358 204 L412 172 L548 172" stroke-dasharray="6 4"/>
  </g>
  <text x="566" y="176" font-size="10.5" fill="#f59e0b" opacity="0.95" font-weight="700">ranh giới</text>
  <text x="566" y="190" font-size="10.5" fill="#f59e0b" opacity="0.95" font-weight="700">dịch lên ↑</text>
  <text x="566" y="252" font-size="10" fill="currentColor" opacity="0.6">phần KH</text>
  <text x="566" y="266" font-size="10" fill="currentColor" opacity="0.6">co lại →</text>
</svg>

---

### 2.0.3 Ví dụ progressive — EC2 vs RDS vs Lambda vs S3

Cùng câu hỏi: "Ai patch lỗ hổng bảo mật mới phát hiện?"

**Level 1 — EC2 chạy MySQL self-managed**
- OS lỗ hổng (vd kernel CVE) → **bạn** `apt upgrade && reboot`.
- MySQL lỗ hổng → **bạn** `apt upgrade mysql-server`.
- Hypervisor lỗ hổng (như Spectre/Meltdown 2018) → **AWS** patch, bạn nhận "Scheduled Event" để reboot.

**Level 2 — RDS MySQL (managed)**
- OS lỗ hổng → **AWS tự patch** trong maintenance window bạn config.
- MySQL engine version cũ có CVE → **AWS push patch**, bạn quyết "Apply immediately" hay đợi window.
- Bạn vẫn chịu: **DB user/password, schema, query injection, encryption-at-rest choice** (mặc định OFF — bạn phải bật khi tạo).

**Level 3 — Lambda function**
- Runtime lỗ hổng (vd Python 3.10 CVE) → **AWS patch runtime**, bạn không phải làm gì.
- App lỗ hổng (vd SQL injection trong code bạn viết) → **bạn**.
- IAM Role permission overly broad → **bạn**.

**Level 4 — S3 bucket**
- S3 service lỗ hổng → **AWS** (chưa bao giờ xảy ra ở mức nghiêm trọng public).
- Public bucket leak data → **bạn** (S3 Block Public Access default ON từ 2023 nhưng vẫn có thể tắt).
- Object encrypt hay không → **bạn chọn** (default SSE-S3 từ 2023).

→ **Pattern**: càng managed, AWS lo càng nhiều **về hạ tầng**. Nhưng **app logic, IAM, data, choice** — không bao giờ AWS lo thay bạn.

---

### 2.0.4 5 hiểu lầm phổ biến — 90% data breach trên AWS đến từ đây

1. **"Managed service = bảo mật tự động"** — SAI. RDS managed nhưng **DB user password yếu** vẫn bị brute-force. DynamoDB managed nhưng **IAM policy `dynamodb:*` cho mọi resource** vẫn bị query trộm.

2. **"AWS có Default Encryption nên data luôn an toàn"** — SAI một phần. Default encryption (SSE-S3 cho S3 từ 2023, EBS từ 2023) bảo vệ **at-rest physical disk**. Nhưng nếu **IAM Role cấp quá rộng cho external principal**, encryption không cứu được — hacker dùng đúng credential decrypt ra như chủ.

3. **"Private subnet trong VPC là an toàn"** — SAI. Private subnet không có Internet **inbound**, nhưng vẫn có **outbound qua NAT Gateway**. App bị compromise vẫn exfiltrate data ra Internet được, hoặc bị attacker lateral movement nếu cùng subnet với DB.

4. **"S3 bucket policy `s3:GetObject` cho `*` chỉ cho read, không nguy hiểm"** — SAI nghiêm trọng. `Principal: "*"` = **anyone trên Internet**, kể cả không cần AWS account. Đây chính là lý do nhiều bucket bị crawl bởi tools như `bucket.discoverable` rồi public lên dark web.

5. **"AWS đảm bảo SLA = đảm bảo data không mất"** — SAI. SLA chỉ đảm bảo **uptime**. Data durability là khái niệm khác (S3: 11 nines, EBS: 99.999%). Nhưng **nếu bạn vô tình `aws s3 rm --recursive`**, AWS không restore được. **Backup là trách nhiệm bạn** (S3 Versioning, EBS snapshot, RDS automated backup).

---

### 2.1 Mô hình Security OF vs IN

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 430" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Mô hình Shared Responsibility — Security IN vs OF the cloud</title>
  <desc>Hai tầng xếp chồng, ngăn bởi một đường ranh giới rõ. Tầng trên là Customer (Security IN the cloud) gồm Customer Data, Platform/Application/IAM, OS và cấu hình Network/Firewall, mã hoá client-side, mã hoá server-side, bảo vệ traffic mạng. Tầng dưới là AWS (Security OF the cloud) gồm Software hạ tầng Compute/Storage/Database/Networking và Hardware/Global Infrastructure Regions/AZs/Edge/Datacenters.</desc>
  <!-- CUSTOMER tier -->
  <text x="16" y="26" font-size="14" font-weight="700" fill="#3b82f6">CUSTOMER — Security IN the cloud</text>
  <text x="704" y="26" font-size="11" text-anchor="end" fill="currentColor" opacity="0.65">khách hàng chịu</text>
  <g font-size="11.5">
    <rect x="16" y="38" width="688" height="34" rx="7" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="28" y="59" font-weight="700" fill="currentColor">Customer Data — phân loại, mã hoá, backup, xoá</text>
    <rect x="16" y="78" width="338" height="34" rx="7" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="28" y="99" fill="currentColor">Platform · Application · IAM</text>
    <rect x="366" y="78" width="338" height="34" rx="7" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="378" y="99" fill="currentColor">OS · Network &amp; Firewall config</text>
    <rect x="16" y="118" width="338" height="34" rx="7" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="28" y="139" fill="currentColor">Client-side encryption &amp; integrity</text>
    <rect x="366" y="118" width="338" height="34" rx="7" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="378" y="139" fill="currentColor">Server-side encryption (file/data)</text>
    <rect x="16" y="158" width="688" height="34" rx="7" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="28" y="179" fill="currentColor">Networking traffic protection (encryption, IDS/IPS)</text>
  </g>
  <!-- boundary -->
  <line x1="16" y1="210" x2="704" y2="210" stroke="#f59e0b" stroke-width="2.5" stroke-opacity="0.9"/>
  <rect x="288" y="200" width="144" height="20" rx="10" fill="#f59e0b" fill-opacity="0.95"/>
  <text x="360" y="214" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">RANH GIỚI TRÁCH NHIỆM</text>
  <!-- AWS tier -->
  <text x="16" y="248" font-size="14" font-weight="700" fill="#10b981">AWS — Security OF the cloud</text>
  <text x="704" y="248" font-size="11" text-anchor="end" fill="currentColor" opacity="0.65">AWS chịu</text>
  <g font-size="11.5">
    <rect x="16" y="260" width="688" height="44" rx="7" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="28" y="280" font-weight="700" fill="currentColor">Software</text>
    <text x="28" y="297" fill="currentColor" opacity="0.85">Compute · Storage · Database · Networking · hypervisor (Nitro)</text>
    <rect x="16" y="312" width="688" height="58" rx="7" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="28" y="332" font-weight="700" fill="currentColor">Hardware / Global Infrastructure</text>
    <text x="28" y="349" fill="currentColor" opacity="0.85">Regions · Availability Zones · Edge Locations</text>
    <text x="28" y="365" fill="currentColor" opacity="0.85">Datacenters (an ninh vật lý, điện, làm mát)</text>
  </g>
  <text x="16" y="396" font-size="11" fill="currentColor" opacity="0.7">AWS lo "toà nhà" (hạ tầng) · Bạn lo "đồ trong nhà" (data, IAM, OS guest, app, config).</text>
</svg>

### 2.2 AWS chịu (Security OF the cloud)

- **Hardware**: server, storage, network thiết bị vật lý.
- **Software** chạy hạ tầng: hypervisor (Nitro), storage subsystem, network controller.
- **Vật lý datacenter**: kiểm soát ra vào, camera, 24/7 security, hỏa hoạn, điện, làm mát.
- **Global infrastructure**: Region, AZ, Edge.
- **Service-level patching** cho service abstract: S3, DynamoDB, Lambda runtime, ELB, CloudFront.
- **Compliance certifications**: SOC 1/2/3, PCI-DSS, HIPAA BAA, ISO 27001, FedRAMP — AWS đạt cho **hạ tầng**. App của bạn vẫn cần compliant riêng.

### 2.3 Khách hàng chịu (Security IN the cloud)

- **Data**: classify, encrypt, backup, lifecycle, deletion.
- **IAM**: users, roles, policies, MFA, rotation.
- **OS guest** (khi dùng EC2): patching, hardening, antivirus.
- **Application**: code không có SQL injection, XSS, SSRF; dependency CVE; secret không hardcode.
- **Network config trong VPC**: Security Group, NACL, VPC endpoint, encryption-in-transit (TLS).
- **Identity & access cho app users** (khác AWS IAM): Cognito, SAML, OAuth.
- **Configuration của managed service**: encryption-at-rest, backup retention, public/private endpoint.

### 2.4 Bảng chi tiết cho từng service phổ biến

| Service | AWS chịu | Khách hàng chịu |
|---------|----------|------------------|
| **EC2** | HW, hypervisor, network vật lý | OS patch, AMI security, SG, app, data, IAM, encrypt EBS |
| **RDS** | HW, hypervisor, OS, engine patch (theo window), backup tự động | DB user/password, schema, query, encryption-at-rest opt-in, network access (SG, subnet group), restore khi cần |
| **DynamoDB** | Tất cả hạ tầng + service code | IAM, data, encryption choice (default AWS-managed KMS), backup choice (PITR opt-in) |
| **Lambda** | OS, runtime, container, scaling | Function code, IAM execution role, env var (KMS encrypt), VPC config nếu dùng |
| **S3** | Service code, durability hạ tầng (11 nines) | Bucket policy, IAM, encryption choice, Block Public Access, lifecycle, versioning, MFA Delete |
| **CloudFront** | Edge HW, network | Origin config, SSL cert (ACM hoặc upload), WAF rule, behavior |
| **VPC** | Network underlying, route propagation | CIDR design, subnet, route table, SG, NACL, NAT/IGW config |
| **EKS** | Control plane (API server, etcd) | Worker nodes (nếu self-managed) hoặc Fargate (AWS lo), workload manifest, RBAC, network policy |
| **Fargate** | Compute, network, OS, runtime container | Image security, app, IAM task role, secret |

### 2.5 Inherited / Shared / Customer-specific controls

Khi audit compliance (SOC, PCI, ISO), 3 loại control:

- **Inherited** từ AWS — bạn được "miễn phí" (vd physical security, environmental control). Khi auditor hỏi, bạn show AWS SOC/ISO report (download từ AWS Artifact).
- **Shared** — cả 2 cùng phải implement:
  - **Patching**: AWS patch hypervisor, bạn patch OS guest.
  - **Encryption**: AWS cung cấp KMS, bạn quyết key + bật flag.
  - **Configuration management**: AWS có baseline AMI, bạn customize.
- **Customer-specific** — chỉ bạn làm: app code, IAM policy, data classification, business logic.

→ Câu hỏi audit thường gặp: "Ai chịu encryption-at-rest cho RDS?" → **Shared** — AWS cung cấp capability, khách hàng phải opt-in.

---

## 3. Hands-on có account

### Lab 1 — Bật các "lá chắn cơ bản" (20 phút)
1. **IAM** → Activate **MFA cho root** (đã làm bài 1).
2. **S3** → Account-level **Block Public Access** = ON cho cả 4 setting (default ON từ 2023, check lại).
3. **EC2** → Account attributes → **Always encrypt new EBS volumes** = ON. Default KMS key của AWS được.
4. **EC2** → Launch template settings → **IMDSv2 required**, hop limit = 1.
5. **CloudTrail** → tạo trail org-wide, log vào S3 bucket riêng, **bật log file validation** + encrypt KMS.

### Lab 2 — Trusted Advisor security checks (10 phút)
1. Mở **Trusted Advisor** (Basic tier có 7 check security cơ bản; Business+ có đầy đủ).
2. Free checks: **MFA on Root**, **Security Groups - Specific Ports Unrestricted** (port 22, 3389 từ 0.0.0.0/0), **IAM Use** (có IAM user không hay vẫn dùng root), **S3 Bucket Permissions** (bucket public).
3. Fix tất cả red flag.

### Lab 3 — IAM Access Analyzer (15 phút, free)
1. **IAM** → **Access Analyzer** → tạo analyzer.
2. Scan toàn account: report ra **resource share external** (S3 bucket public, KMS key share, IAM role trust account khác).
3. Review từng finding, **archive** (chấp nhận có chủ đích) hoặc **fix** (sai).

### Lab 4 — Mô phỏng SSRF lấy IMDS credential (lab học, không chạy prod)
- Mục đích: hiểu vì sao IMDSv2 quan trọng.
- Setup: EC2 t3.micro, gắn role có `s3:ListBuckets`, **IMDSv1 enabled** (default cũ).
- SSH vào EC2, chạy:
  ```bash
  curl http://169.254.169.254/latest/meta-data/iam/security-credentials/MyRole
  # → trả về AccessKey + SecretKey + Token
  ```
- Có credential này, attacker có thể `aws s3 ls` với quyền của role.
- **Fix**: Modify instance metadata options → IMDSv2 required → IMDSv1 disabled. Thử lại lệnh trên → 401 Unauthorized.

---

## 4. Hands-on không tốn tiền

### Option A — Đọc AWS docs chính thức
- https://aws.amazon.com/compliance/shared-responsibility-model/ — đọc 15 phút, có infographic chính thức của AWS.
- https://docs.aws.amazon.com/whitepapers/latest/aws-overview/security-and-compliance.html

### Option B — AWS Compliance Center + Artifact
- https://aws.amazon.com/compliance/programs/ — xem các chứng nhận AWS đạt (SOC, PCI, HIPAA, ISO).
- Login console → **AWS Artifact** → download **SOC 2 report** (free, cần login).

### Option C — Bài tập phân loại (15 phút, không cần máy)

Ghi "AWS / Khách hàng / Cả hai" cho mỗi tình huống:

1. EC2 instance bị brute-force SSH port 22 từ Internet.
2. Hypervisor lỗi do CVE.
3. RDS MySQL bị SQL injection do app web.
4. S3 bucket data bị mã hoá bởi ransomware (object lock không bật).
5. Datacenter cháy do chập điện.
6. IAM credential leak vì commit lên Git.
7. Lambda runtime Python 3.9 có CVE.
8. Lambda function code có lỗi cho phép remote code execution.

<details><summary>Đáp án</summary>

1. **Khách hàng** — SG bạn để 0.0.0.0/0.
2. **AWS** — hypervisor là của AWS.
3. **Khách hàng** — app code bạn viết.
4. **Khách hàng** — bật Versioning + MFA Delete + Object Lock là việc của bạn.
5. **AWS** — physical security.
6. **Khách hàng** — IAM credential là của bạn.
7. **AWS** — runtime do AWS quản.
8. **Khách hàng** — code là của bạn.

</details>

---

## 5. Tự kiểm tra (có đáp án)

1. AWS chịu trách nhiệm gì khi bạn dùng EC2?
   <details><summary>Trả lời</summary>**HW vật lý, hypervisor (Nitro), datacenter, mạng vật lý, global infrastructure**. Không chịu OS guest, app, IAM, SG config, data.</details>

2. Bạn chịu trách nhiệm gì khi dùng RDS?
   <details><summary>Trả lời</summary>**DB user/password, schema, query (SQL injection), encryption-at-rest choice (opt-in), backup retention setting, network access (SG/subnet group)**. AWS lo OS, engine patch, backup tự động, hạ tầng.</details>

3. S3 có Default Encryption từ 2023. Có nghĩa data luôn an toàn?
   <details><summary>Trả lời</summary>**Không**. Default Encryption chỉ bảo vệ **at-rest physical disk**. Nếu IAM policy hoặc bucket policy cho phép Principal `*` đọc, hacker vẫn lấy được data (đã decrypt sẵn). Bảo mật S3 phải đủ: **IAM + Bucket Policy + Block Public Access + Encryption + Logging**.</details>

4. Lambda function của bạn bị remote code execution vì dùng dependency có CVE. Lỗi của ai?
   <details><summary>Trả lời</summary>**Của bạn**. AWS chịu runtime (Python interpreter), bạn chịu code + dependency. Dùng Dependabot / Snyk / Inspector để scan dependency.</details>

5. AWS có chứng nhận PCI-DSS Level 1. Bạn build payment app trên AWS có tự động compliant PCI không?
   <details><summary>Trả lời</summary>**Không tự động**. AWS đạt PCI cho **hạ tầng**. App của bạn vẫn cần audit riêng cho code + process. AWS chỉ "trao cho bạn nền tảng compliant", bạn xây tiếp trên đó. Đây là "inherited control" + "customer responsibility".</details>

6. Bạn vô tình xoá toàn bộ S3 bucket. Gọi AWS Support có restore được không?
   <details><summary>Trả lời</summary>**Không**. Bạn chịu backup. Nếu bật **Versioning** trước đó thì restore từ delete marker. Nếu bật **Cross-Region Replication** thì có bản ở region khác. Nếu không bật gì thì mất luôn. AWS không có "trash bin" cho S3.</details>

7. Datacenter AWS bị cháy. Service ảnh hưởng?
   <details><summary>Trả lời</summary>**1 AZ down**. Workload Multi-AZ (RDS Multi-AZ, EC2 ASG cross-AZ) vẫn chạy. Workload single-AZ down. Đây là lý do **Multi-AZ là default best practice** cho production.</details>

8. Bạn cấu hình IAM Role cho EC2 với `Action: "*", Resource: "*"`. EC2 bị compromise. Lỗi của ai?
   <details><summary>Trả lời</summary>**Hoàn toàn của bạn**. IAM policy là trách nhiệm khách hàng. Least privilege là nguyên tắc — chỉ cấp đúng action cần.</details>

---

## 6. Đối chiếu GCP

| Khái niệm | AWS | GCP |
|-----------|-----|-----|
| Mô hình tên gọi | **Shared Responsibility Model** | **Shared Fate Model** (mới hơn, GCP nhấn mạnh "cùng trên 1 con thuyền") |
| Triết lý | "AWS lo OF, khách lo IN" — ranh giới rõ | "GCP chủ động hỗ trợ khách compliant hơn, không chỉ đẩy hết cho khách" |
| Default encryption | EBS / S3 default ON từ 2023 | **GCS / Persistent Disk default ON từ lâu** — GCP đi trước nhiều năm |
| Default deny IAM | Có | Có |
| Public access bucket | S3 Block Public Access default ON từ 2023 | GCS có Uniform Bucket-Level Access (đẩy về IAM thay vì ACL) |
| Compliance reports | **AWS Artifact** | **Compliance Reports Manager** |

**Khác biệt triết lý**: AWS clear-cut ("đây là việc bạn"), GCP softer ("chúng tôi giúp bạn làm đúng"). Thực tế responsibility tương tự nhưng GCP defaults thường an toàn hơn (ít cần opt-in).

---

## 7. Lưu ý khi thi CLF-C02

- **AWS chịu**: HW, hypervisor, datacenter physical, network vật lý, global infra.
- **Khách hàng chịu**: data, IAM, OS guest (EC2), app, encryption choice, network config (SG, NACL).
- **"Security OF the cloud"** = AWS. **"Security IN the cloud"** = khách hàng.
- Câu có "patch OS" + dùng EC2 → **khách hàng**.
- Câu có "patch OS" + dùng RDS → **AWS**.
- Câu có "customer data" → **luôn luôn khách hàng**.
- Câu có "physical security datacenter" → **luôn luôn AWS**.
- Câu có "IAM users / policies" → **luôn luôn khách hàng**.
- Câu có "compliance certification của hạ tầng" (SOC, PCI, ISO của datacenter) → **AWS**.
- Câu có "app-level compliance" → **khách hàng**.

## 8. Lưu ý khi thi SAA-C03 (sâu hơn)

- **Inherited vs Shared vs Customer-specific** controls — khi nào kiểm soát thuộc loại nào.
- **Encryption-in-transit** (TLS) — thường là **shared**: AWS cung cấp ACM cert + ALB termination, bạn chịu cấu hình client/app.
- **Encryption-at-rest cho RDS, EBS, S3**: **opt-in** (khách hàng quyết) → **trách nhiệm khách hàng** dù service managed.
- **VPC + network**: SG / NACL / route table là khách hàng. AWS chỉ chịu underlay.
- **Service Catalog** cho enterprise: publish blueprint compliant — giảm rủi ro dev tự config sai.
- **AWS Config rules** + **Security Hub** + **GuardDuty** — toolset bạn dùng để **enforce trách nhiệm IN the cloud**.
- **KMS key**: customer-managed key (CMK) vs AWS-managed key. CMK cho quyền control + audit, AWS-managed dễ nhưng ít visibility.

## 9. Lưu ý khi đi làm

### Bảo mật
- Bật **AWS Security Hub** + **GuardDuty** ngay khi có account production — phát hiện anomaly tự động.
- **CloudTrail** org-trail + log file validation + KMS encrypt + S3 Object Lock — để hacker không xoá audit log được.
- **IMDSv2 required** cho mọi EC2 (set via Launch Template default).
- **S3 Block Public Access** account-level — chỉ exception khi thực sự cần public (static site, dùng OAC qua CloudFront thay vì public bucket).
- **KMS CMK** cho data nhạy cảm, không dùng AWS-managed key cho production critical data.
- **AWS Config rules** enforce: encryption ON, no public bucket, no 0.0.0.0/0 SG, MFA root...

### Vận hành
- **Tag mọi resource** với `DataClassification` (Public / Internal / Confidential / Restricted) — Config rule check tag bắt buộc khi tạo.
- **Audit định kỳ** với IAM Access Analyzer + Trusted Advisor + Security Hub findings.
- **Compliance docs**: tải SOC 2 report từ AWS Artifact, attach vào hồ sơ compliance công ty.

### Anti-pattern thường gặp
- ❌ Cho rằng "managed service = không cần lo bảo mật".
- ❌ S3 bucket policy `Principal: "*"` cho "internal use" → vô tình public Internet.
- ❌ IAM Role với `Action: "*"` cho EC2 "để cho tiện debug".
- ❌ IMDSv1 vẫn enabled (default trước 2022).
- ❌ Không có CloudTrail → không trace được khi incident.
- ❌ KMS key policy quá rộng (`Principal: "*"`) → defeat purpose của customer-managed key.
- ❌ Lambda environment variable lưu password plain text → dùng Secrets Manager hoặc Parameter Store với KMS.
- ❌ RDS public endpoint cho "tiện kết nối từ máy dev" → dùng bastion hoặc SSM Session Manager.

---

## 10. Flashcard

- **Security OF the cloud** — AWS chịu: HW, hypervisor, network vật lý, datacenter, global infra.
- **Security IN the cloud** — khách hàng chịu: data, IAM, OS guest (EC2), app, network config, encryption choice.
- **3 tầng service**: Infrastructure (EC2 — bạn lo nhiều) → Container (RDS — chia sẻ) → Abstracted (S3, Lambda — AWS lo nhiều).
- **Quy tắc bất biến**: **IAM + Data + Encryption choice** luôn của khách hàng, dù service abstract đến đâu.
- **Inherited / Shared / Customer-specific** — 3 loại control trong audit.
- **AWS Artifact** — nơi tải compliance reports (SOC, PCI, ISO).
- **IMDSv2** — token-based metadata, bắt buộc dùng để chống SSRF.
- **Default Encryption** (S3 / EBS) — bật từ 2023 nhưng không thay thế IAM/access control.
- **Backup là của khách hàng** — bật Versioning, snapshot, RDS automated backup.
- **PCI/HIPAA của hạ tầng** ≠ **app compliant** — bạn vẫn audit riêng.
- **Capital One 2019** — case study kinh điển: SSRF + IMDSv1 + IAM Role overly broad + thiếu CloudTrail alert = $190M phạt.
