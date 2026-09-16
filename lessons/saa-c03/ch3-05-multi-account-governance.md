# SAA Ch3.5 — Multi-Account & Governance

> Mục tiêu: Đọc đề dạng "40 account, cần chặn region lạ / không ai xoá được log / dev chỉ dùng 3 service" là chọn ngay đúng công cụ — Organizations, SCP, RCP, Control Tower, IAM Identity Center, RAM — thay vì đoán mò giữa chúng.

Tiền đề: [[ch3-01-iam-deep-dive]], [[ch3-04-detective-controls]].

---

## 1. Câu chuyện mở đầu — "Ai mở EC2 ở ap-east-1 vậy?"

Cuối quý, finance gửi bill: 3.400 USD phát sinh ở **ap-east-1**, region công ty chưa bao giờ dùng. CloudTrail cho thấy một role của team data đã chạy 12 instance GPU ở đó suốt 3 tuần; người làm đã nghỉ việc.

Câu hỏi của sếp không phải "ai làm", mà là: *"Sao hệ thống lại cho phép chuyện đó?"* Vì mọi quyền nằm trong IAM policy của từng account, và **không có tầng nào ở trên IAM** để nói "account này tuyệt đối không đụng region khác". Admin account đó có `AdministratorAccess` — mà admin thì sửa được chính policy của mình.

Đó là khoảng trống **Organizations + SCP** sinh ra để lấp: một **trần quyền** mà chính admin trong account cũng không nâng lên được.

---

## 2. Bức tranh tổng thể — 3 tầng governance

Ba tầng, đừng trộn vào nhau: **cấu trúc** (Organizations: root, OU, member account, consolidated billing) — **chặn/cho phép** (SCP, RCP, IAM policy, permission boundary) — **vận hành** (Control Tower, IAM Identity Center, RAM, Service Catalog, License Manager).

Nguyên tắc xuyên suốt: **Organizations không cấp quyền cho ai cả**, nó chỉ *thu hẹp* thứ IAM có thể cấp.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 230" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cây AWS Organizations và điểm gắn policy</title>
  <desc>Root ở trên, ba OU bên dưới (Security, Infrastructure, Workloads) mỗi OU chứa member account; policy gắn ở root, OU hoặc account và hiệu lực là giao của mọi tầng; management account nằm ngoài tầm SCP.</desc>
  <text x="16" y="22" font-size="13.5" font-weight="700" fill="currentColor">Policy gắn ở Root / OU / Account — hiệu lực là GIAO của mọi tầng trên đường đi</text>
  <rect x="264" y="36" width="160" height="32" rx="9" fill="#8b5cf6" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="344" y="57" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Root (gốc Org)</text>
  <line x1="344" y1="68" x2="344" y2="84" stroke="currentColor" stroke-opacity="0.45"/>
  <line x1="96" y1="84" x2="504" y2="84" stroke="currentColor" stroke-opacity="0.45"/>
  <line x1="96" y1="84" x2="96" y2="100" stroke="currentColor" stroke-opacity="0.45"/>
  <line x1="300" y1="84" x2="300" y2="100" stroke="currentColor" stroke-opacity="0.45"/>
  <line x1="504" y1="84" x2="504" y2="100" stroke="currentColor" stroke-opacity="0.45"/>
  <rect x="20" y="100" width="152" height="28" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="96" y="119" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">OU Security</text>
  <rect x="20" y="134" width="152" height="28" rx="7" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.15"/>
  <text x="96" y="152" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">Log Archive · Audit</text>
  <rect x="224" y="100" width="152" height="28" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="300" y="119" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">OU Infrastructure</text>
  <rect x="224" y="134" width="152" height="28" rx="7" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.15"/>
  <text x="300" y="152" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">Network (VPC + TGW)</text>
  <rect x="428" y="100" width="152" height="28" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="504" y="119" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">OU Workloads</text>
  <rect x="428" y="134" width="152" height="28" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="504" y="152" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">OU Prod · OU Dev</text>
  <rect x="600" y="100" width="104" height="62" rx="8" fill="#ef4444" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 3"/>
  <text x="652" y="122" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Management</text>
  <text x="652" y="140" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">SCP KHÔNG áp</text>
  <text x="652" y="154" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">→ để trống workload</text>
  <rect x="16" y="180" width="688" height="38" rx="9" fill="#8b5cf6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="30" y="204" font-size="10.5" fill="currentColor" opacity="0.9">Gắn được: SCP · RCP · Tag · Backup · AI opt-out · Declarative. Một account = ĐÚNG MỘT OU.</text>
</svg>

---

## 3. AWS Organizations — cấu trúc

**Management account** (tên cũ master/payer) tạo Org, mời account, gắn policy và **trả tiền cho toàn Org**. **Member account** là phần còn lại — mỗi account là một **ranh giới bảo mật và ranh giới quota** độc lập, đây mới là lý do thật để tách account. **Root** là node gốc của cây, đừng nhầm với *root user* của một account. **OU** gom account; một account thuộc **đúng một OU**.

### 3.1 Hai chế độ

| Chế độ | Có gì | Khi nào chọn |
|---|---|---|
| **Consolidated billing only** | Gộp hoá đơn, chia sẻ volume discount + RI/Savings Plans | Chỉ cần gom tiền, chưa ràng buộc quyền |
| **All features** | Trên **+ SCP, RCP, tag/backup/AI opt-out/declarative policy, delegated administrator** | Mặc định; **bắt buộc** nếu đề nhắc SCP hoặc Control Tower |

Bẫy: đề nói "chặn service ở vài account" mà Org đang ở consolidated billing only → bước đầu là **enable all features**, chưa phải viết SCP.

### 3.2 Consolidated billing

Một hoá đơn, nhưng Cost Explorer vẫn tách theo `linked account` ([[ch4-04-cost-visibility]]). **Volume tier cộng dồn**: 100 account × 1 TB S3 tính bậc giá như 100 TB. **RI và Savings Plans chia sẻ toàn Org** mặc định, tắt được cho từng account. Free tier tính **một lần cho cả Org**.

### 3.3 Delegated administrator

Management account không nên là nơi vận hành hằng ngày. AWS cho chỉ định một member account làm **delegated administrator** cho từng service (GuardDuty, Security Hub, Config, Backup, IAM Identity Center…) — thực tế giao cho account *Security Tooling*.

---

## 4. SCP — Service Control Policy

### 4.1 Cơ chế: filter, không phải grant

SCP định nghĩa **quyền tối đa** của principal trong account và **không cấp quyền**: SCP allow `s3:*` mà IAM policy không cho gì thì user vẫn không làm được gì. Quyền hiệu lực = **giao (AND)** của SCP và IAM policy. Mặc định AWS gắn `FullAWSAccess` ở **root, mọi OU và mọi account** — nên khi chuyển sang allow-list phải gỡ nó ở **đúng tầng đang gắn SCP allow-list**, gỡ mỗi ở root là chưa đủ. Vì vậy khi chưa cấu hình gì SCP "trong suốt". Nhiều tầng SCP cũng là **giao**: mọi tầng (root → OU cha → OU con → account) đều phải allow và không tầng nào deny.

### 4.2 Deny-list vs allow-list

| Kiểu | Cách làm | Khi nào chọn | Bẫy |
|---|---|---|---|
| **Deny-list** | Giữ `FullAWSAccess`, thêm SCP `Deny` vài action | Mặc định; service mới vẫn dùng ngay | Không siết được "chỉ dùng N service" |
| **Allow-list** | **Gỡ `FullAWSAccess`**, chỉ `Allow` đúng action cần | Compliance cao, cần khoá chặt danh mục service | Quên gỡ `FullAWSAccess` → vẫn full quyền; dễ chặt nhầm dependency (KMS, CloudWatch, IAM) |

### 4.3 Những gì SCP KHÔNG đụng tới

1. **Management account** — SCP hoàn toàn không áp, kể cả gắn ở root. Hệ quả: **đừng chạy workload trong management account**.
2. **Service-linked role** — action của SLR không bị chặn.
3. **Root user của management account** — không chặn được; ngược lại **root của member account thì SCP CHẶN ĐƯỢC**.
4. **Resource-based policy** — SCP lọc theo *ai gọi trong account của tôi*, nên principal từ account ngoài đọc bucket của bạn thì SCP không có tiếng nói — lỗ hổng đó là lý do RCP ra đời.

### 4.4 Condition hay dùng

`aws:RequestedRegion` khoá region (thứ thiếu ở mục 1); `aws:PrincipalOrgID` chỉ cho principal trong Org; `ec2:InstanceType` cấm family đắt ở OU Sandbox; `aws:PrincipalArn` + `ArnNotLike` chừa một break-glass role; deny `cloudtrail:StopLogging` và `config:DeleteConfigurationRecorder` để bảo vệ tầng detective của [[ch3-04-detective-controls]]. SCP có **giới hạn kích thước tài liệu** khá chặt — tách theo chủ đề.

---

## 5. RCP và data perimeter

### 5.1 RCP soi chiều ngược lại

**SCP** giới hạn *principal trong account của tôi* được làm gì, dù resource ở đâu. **RCP (Resource Control Policy)** giới hạn *ai được chạm resource trong account của tôi*, dù họ từ đâu tới. RCP cũng **không cấp quyền**, cũng có policy mặc định cho phép mọi thứ (`RCPFullAWSAccess`), và chỉ hỗ trợ **một tập service chọn lọc** — nhóm hay bị lộ nhất: S3, STS, KMS, SQS, Secrets Manager.

### 5.2 Data perimeter

- Chỉ **identity tin cậy** chạm data của tôi → **RCP** với `aws:PrincipalOrgID`.
- Identity của tôi chỉ chạm **resource tin cậy** → **SCP** với `aws:ResourceOrgID` (chống exfiltration).
- Chỉ từ **network tin cậy** → RCP/SCP + endpoint policy với `aws:SourceVpce` / `aws:SourceIp`.

Nhân viên copy dữ liệu sang bucket cá nhân: IAM cho `s3:PutObject`, hợp lệ — chỉ SCP với `aws:ResourceOrgID` mới chặn. Ngược lại, bucket của bạn bị người ngoài Org đọc vì bucket policy viết ẩu → RCP chặn, **admin account đó không tự gỡ được**.

### 5.3 Bảng trọng tâm — SCP vs IAM policy vs Permission boundary vs RCP

| | **IAM policy** | **Permission boundary** | **SCP** | **RCP** |
|---|---|---|---|---|
| Cấp quyền? | **Có** — duy nhất trong bảng | Không | Không | Không |
| Phạm vi | Principal được gắn | Principal được gắn | Mọi principal trong account (do Org quản) | Mọi resource service-hỗ-trợ trong account (do Org quản) |
| Chặn cross-account đọc resource của tôi? | Không | Không | Không | **Có** |
| **Khi nào chọn** | Việc thường ngày: cho role này quyền kia | Cho dev tự tạo role nhưng không vượt trần | Luật toàn tổ chức: khoá region, cấm xoá log, cấm instance đắt | Data perimeter: không ai ngoài Org chạm data, dù bucket policy viết sai |
| **Bẫy** | Admin tự nâng quyền được | Phải kèm condition `iam:PermissionsBoundary` | Không áp lên management account & SLR | Chỉ một tập service; không thay bucket policy |

### 5.4 Thứ tự đánh giá một request

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 210" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Thứ tự đánh giá quyền của một request</title>
  <desc>Request đi qua chuỗi cổng: explicit deny ở bất kỳ policy nào là chặn; rồi tới SCP, RCP, resource-based policy, permission boundary và session policy, cuối cùng identity policy mới cho Allow.</desc>
  <defs><marker id="govArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker></defs>
  <text x="16" y="22" font-size="13.5" font-weight="700" fill="currentColor">Qua MỌI cổng mới Allow — trượt một cổng là Deny</text>
  <rect x="16" y="40" width="130" height="40" rx="9" fill="#ef4444" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="81" y="65" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Explicit Deny?</text>
  <line x1="146" y1="60" x2="168" y2="60" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#govArr)"/>
  <rect x="172" y="40" width="130" height="40" rx="9" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="237" y="58" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">SCP</text>
  <text x="237" y="73" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">trần của principal</text>
  <line x1="302" y1="60" x2="324" y2="60" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#govArr)"/>
  <rect x="328" y="40" width="130" height="40" rx="9" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="393" y="58" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">RCP</text>
  <text x="393" y="73" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">trần của resource</text>
  <line x1="458" y1="60" x2="480" y2="60" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#govArr)"/>
  <rect x="484" y="40" width="150" height="40" rx="9" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="559" y="65" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Resource policy</text>
  <line x1="559" y1="80" x2="559" y2="98" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#govArr)"/>
  <rect x="484" y="102" width="150" height="40" rx="9" fill="#f59e0b" fill-opacity="0.17" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="559" y="120" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Permission boundary</text>
  <text x="559" y="135" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">+ session policy</text>
  <line x1="484" y1="122" x2="462" y2="122" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#govArr)"/>
  <rect x="312" y="102" width="146" height="40" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="385" y="120" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Identity policy</text>
  <text x="385" y="135" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">nơi DUY NHẤT grant</text>
  <line x1="312" y1="122" x2="290" y2="122" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#govArr)"/>
  <rect x="186" y="102" width="100" height="40" rx="9" fill="#10b981" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="236" y="128" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">ALLOW</text>
  <text x="16" y="172" font-size="10.5" fill="currentColor" opacity="0.85">Explicit deny ở bất kỳ tầng nào là hỏng. Chỉ identity policy (hoặc resource policy khi cross-account) mới grant.</text>
  <text x="16" y="192" font-size="10.5" fill="currentColor" opacity="0.85">Cross-account: account nguồn và account đích đều phải allow.</text>
</svg>

### 5.5 Policy Organization khác

**Tag policy** chuẩn hoá key/value tag và báo cáo resource lệch chuẩn; **backup policy** đẩy backup plan của AWS Backup xuống toàn OU; **AI services opt-out** chặn AWS dùng dữ liệu của bạn để cải thiện AI service; **declarative policy** giữ *cấu hình mặc định mong muốn* của vài service, kể cả với account mới.

Bẫy: tag policy **không** cưỡng chế. Muốn *bắt buộc* gắn tag thì dùng **SCP `Deny` + `aws:RequestTag`**.

---

## 6. AWS Control Tower

### 6.1 Nó làm gì

Control Tower là lớp *orchestration* dựng sẵn một **landing zone** theo best practice, chạy trên chính Organizations + Config + CloudTrail + IAM Identity Center + Service Catalog. Nó tạo: OU nền **Security** (chứa **Log Archive** + **Audit**) và một OU workload, **CloudTrail org-wide** ghi về Log Archive, **Config** + aggregator ở Audit, **IAM Identity Center** với permission set sẵn, một **home region** và khả năng **deny region không dùng**.

Bẫy kinh điển: "cần **phát hiện**" → detective (Config); "cần **ngăn** không cho tạo" → preventive (SCP) hoặc proactive (hook).

### 6.2 Controls — ba loại

| Loại | Thi hành bằng | Thời điểm | Ví dụ |
|---|---|---|---|
| **Preventive** | **SCP** | *Trước* khi action xảy ra | Cấm tắt CloudTrail, cấm region lạ |
| **Detective** | **AWS Config rule** | *Sau* khi resource tồn tại | EBS chưa mã hoá, bucket public |
| **Proactive** | **CloudFormation hook** | *Khi provision qua CFN* | Từ chối template RDS không mã hoá |

Mỗi control có mức **Mandatory** (bật sẵn, không tắt được), **Strongly recommended**, **Elective**.

### 6.3 Account Factory

**Account vending**: điền form (tên, email, OU, tuỳ chọn mạng) → Control Tower tạo account, đưa vào OU, áp control, cấu hình Identity Center. Nó được xuất bản như một **Service Catalog product** — lý do hai service này luôn đi cùng nhau. Đã chuẩn hoá Terraform thì dùng **Account Factory for Terraform (AFT)**. Account có sẵn thì **enroll**; account drift khỏi baseline phải re-register OU.

### 6.4 Control Tower vs Organizations thuần

| | **Organizations thuần (+ CloudFormation/StackSets)** | **Control Tower** |
|---|---|---|
| Vending account | Tự động hoá bằng API/IaC | Account Factory sẵn dùng |
| **Khi nào chọn** | Org đã lớn, đã có IaC và quy trình riêng, cấu trúc đặc thù | Bắt đầu multi-account, cần best practice nhanh; đề có chữ "landing zone" |
| **Bẫy** | Dễ quên chặn xoá log, quên khoá region | Không phải region/service nào cũng hỗ trợ; gỡ ra rất khó |

---

## 7. IAM Identity Center

### 7.1 Cơ chế thật sự

User đăng nhập **AWS access portal** bằng identity của *identity source*, chọn account + **permission set** được assign; Identity Center **tự tạo một IAM role trong account đích** (tiền tố `AWSReservedSSO_`) mang đúng policy của permission set, rồi phát **credential tạm thời của STS** với thời hạn cấu hình được.

Tức là **permission set ≈ template của một IAM role**, nhân bản vào mọi account nó được gán; sửa permission set thì IdC đồng bộ lại role ở tất cả account. Không IAM user, không access key dài hạn. Permission set chứa managed policy AWS, **customer managed policy** (tham chiếu theo tên — policy phải có sẵn ở account đích), inline policy và một **permission boundary**.

### 7.2 Identity source

| Identity source | Mô tả | Khi nào chọn |
|---|---|---|
| **Identity Center directory** | Thư mục user tích hợp sẵn | Công ty nhỏ, chưa có IdP; POC |
| **Active Directory** (Managed AD / AD Connector) | Dùng lại user/group AD | Đã có AD, muốn đăng nhập bằng tài khoản domain |
| **External IdP** (SAML 2.0 + SCIM: Okta, Entra ID…) | IdP là nguồn sự thật, SCIM đồng bộ user/group | Đã có IdP doanh nghiệp — mặc định của enterprise |

Đề hay bắt: muốn **nhân viên nghỉ việc là mất quyền AWS ngay** thì phải có **SCIM** — SAML chỉ xác thực từng lần đăng nhập, SCIM mới quản vòng đời user/group.

### 7.3 Assignment và ABAC

**Assignment** = bộ ba *(group/user, account, permission set)*. Console cho duyệt theo **cây OU** và chọn hàng loạt account, nhưng assignment vẫn gắn vào từng account — account mới vending xong phải gán lại hoặc tự động hoá bằng API/IaC.

**ABAC**: bật *attributes for access control*, IdC lấy attribute từ IdP (`department`, `project`…) thành session tag, permission set viết một lần:

```
"Condition": { "StringEquals": { "aws:ResourceTag/project": "${aws:PrincipalTag/project}" } }
```

→ 200 team dùng **một** permission set, ai chạm gì do tag quyết định.

### 7.4 IdC vs SAML trực tiếp vs IAM user

| | **IAM Identity Center** | **SAML federation trực tiếp vào IAM** | **IAM user từng account** |
|---|---|---|---|
| Cấu hình 40 account | Một lần ở IdC, gán permission set | Tạo **identity provider + role** trong **từng** account | Tạo user/khoá từng account |
| **Khi nào chọn** | Mặc định cho mọi tổ chức multi-account | Chỉ một account, hoặc hạ tầng SAML cũ chưa muốn đổi | Gần như không bao giờ |
| **Bẫy** | Customer managed policy phải có sẵn ở account đích | Số role nhân lên theo account × vai trò | Khoá rò rỉ là thảm hoạ, phải tự rotate |

---

## 8. RAM — chia sẻ resource thay vì nhân bản

**Resource Access Manager** cho account chủ chia sẻ resource để account khác **dùng trực tiếp trong account của họ**, không cần assume role sang. Bật *sharing with AWS Organizations* thì trong Org **không cần lời mời**; ra ngoài Org phải **accept invitation**.

- **Subnet (VPC sharing)** — nhiều account chạy workload trong **một VPC chung**: tiết kiệm IP, bớt peering. Bên nhận **không sửa/xoá được subnet hay VPC** và chỉ thấy resource của mình; owner trả tiền hạ tầng VPC; security group tham chiếu chéo được.
- **Transit Gateway** — một TGW dùng chung toàn Org; định tuyến xem [[ch2-07-hybrid-connectivity]].
- **Route 53 Resolver rule** — mọi account phân giải được DNS on-prem.
- **License Manager configuration** — đếm license BYOL trên toàn Org.

### 8.1 RAM vs cross-account IAM role

| | **RAM** | **Cross-account role (AssumeRole)** |
|---|---|---|
| Chia cái gì | **Chính resource**, hiện trong account bên nhận | **Quyền** — bạn "bước sang" account kia |
| **Khi nào chọn** | Nhiều account **xài chung hạ tầng** (mạng, TGW, license) | Cần **truy cập tạm thời** vào tài nguyên account khác |

---

## 9. Service Catalog

Service Catalog đóng gói **CloudFormation template** thành **product**, gom vào **portfolio**, rồi cho end user quyền **launch product** mà **không** cần quyền tạo trực tiếp resource bên dưới.

Mấu chốt là **launch constraint**: product được provision bằng **một IAM role do bạn chỉ định**, nên developer chỉ cần quyền ở mức người dùng Service Catalog — bấm "Launch", điền tham số hợp lệ, nhận về một RDS đúng chuẩn công ty (mã hoá, backup, subnet private) mà không chạm console RDS. Kèm theo: **template constraint** (giới hạn giá trị tham số), **TagOption** (ép tag), **version** của product, và chia sẻ portfolio sang OU khác.

| Cách để team tự phục vụ hạ tầng | Cơ chế | Khi nào chọn | Bẫy |
|---|---|---|---|
| **Service Catalog** | Product = CFN template + launch role + constraint | Self-service **có hàng rào**: user không có quyền thô, chỉ chọn sản phẩm đã duyệt | Phải duy trì catalog; stack đã launch không tự lên version mới |
| **Control Tower Account Factory** | Vending **cả account** | Đơn vị cách ly cần là account (team mới, dự án mới) | Mỗi account là một đơn vị phải quản trị suốt vòng đời |

---

## 10. License Manager

Bài toán: mang license **BYOL** của Windows Server, SQL Server, Oracle, SAP lên AWS. Hợp đồng tính theo **vCPU / core / socket / số instance**, mà Auto Scaling bung thêm máy là rất dễ vượt hạn mức — rủi ro là **bị phạt khi audit**.

**AWS License Manager** cho tạo **license configuration** (loại đếm + hạn mức), gắn vào **AMI hoặc launch template** để mọi instance sinh ra đều bị đếm, chọn **hard limit** (chặn launch khi vượt) hay soft limit (cảnh báo), theo dõi cả máy **on-premises**, quản lý **Dedicated Host** cho license tính theo phần cứng vật lý, và kết hợp **Organizations + RAM** để thấy tiêu thụ toàn Org.

| Nhu cầu | Chọn | Vì sao |
|---|---|---|
| Không vượt số license BYOL khi ASG scale out | **License Manager** + hard limit | Chặn ngay tại thời điểm launch |
| Biết **tiền** license tiêu ở đâu | Cost Explorer + tag | License Manager đếm *license*, không đếm USD |
| License affinity trên phần cứng vật lý | License Manager + **Dedicated Host** | Hợp đồng tính theo socket/core vật lý |

---

## 11. Root user — bảo vệ đúng chỗ

### 11.1 Việc chỉ root làm được

Root user không bị IAM policy giới hạn và có những tác vụ không ai khác làm được: đổi **tên account / email / mật khẩu root** và thông tin thanh toán; **đóng account**; đổi **support plan**; **khôi phục quyền** khi IAM policy viết hỏng tới mức không ai vào được; gỡ **bucket policy hoặc queue policy tự chặn chính mình**; bật **MFA Delete** trên S3.

### 11.2 Ba lớp bảo vệ

1. **Ở từng account**: bật **MFA** cho root (AWS đã siết yêu cầu MFA với root, nhất là root management account), **xoá mọi access key của root**, dùng email nhóm, cất credential theo quy trình break-glass.
2. **Ở tầng Org**: **SCP deny root của member account** bằng condition `aws:PrincipalArn` khớp `arn:aws:iam::*:root`. Nhớ mục 4.3: chặn được root **member**, **không** chặn root **management account**.
3. **Centralized root access management**: Organizations cho **xoá hẳn credential root khỏi member account**. Khi cần tác vụ đặc quyền (gỡ bucket/queue policy hỏng), principal ở management account hoặc delegated admin cho IAM lấy **phiên root ngắn hạn, phạm vi hẹp** cho đúng account đó.

| Cách | Chặn được gì | Khi nào chọn | Bẫy |
|---|---|---|---|
| **MFA + xoá access key root** | Đăng nhập trái phép bằng mật khẩu rò rỉ | Luôn luôn, mọi account | Credential vẫn tồn tại → vẫn còn bề mặt tấn công |
| **SCP deny root** | Mọi action của root member account | Org đã bật all features | Không áp dụng cho management account |
| **Centralized root access management** | Bỏ hẳn credential root ở member account, cấp phiên root có phạm vi khi cần | Org lớn, không muốn quản hàng chục bộ credential root | Vẫn phải bảo vệ tuyệt đối root của management account |

---

## 12. Cost — góc nhìn governance

Organizations, SCP, RCP, RAM và Control Tower controls không tính phí riêng, nhưng **thứ Control Tower bật thì có**: Config ghi configuration item ở mọi account, CloudTrail org-wide (data event là khoản đắt), Security Hub/GuardDuty nếu bật kèm — với Org vài chục account, **Config thường là khoản lớn nhất**, nên cấu hình recorder có chọn lọc. Ở chiều ngược lại, **consolidated billing** là đòn bẩy tiết kiệm, **VPC sharing qua RAM** giảm số NAT Gateway, và `linked account` cho chargeback chính xác gần như miễn phí.

---

## 13. Bẫy thi thường gặp

1. **"SCP cấp quyền"** → Sai, SCP chỉ đặt trần.
2. **"Gắn SCP ở root là mọi account bị áp"** → Trừ **management account** — vì thế đừng chạy workload ở đó.
3. **"SCP chặn được root user"** → Chặn root **member account**; **không** chặn root management account.
4. **"Thêm SCP Allow là có allow-list"** → Phải **gỡ `FullAWSAccess`**.
5. **"SCP chặn người ngoài Org đọc bucket của tôi"** → Sai, việc của **RCP**.
6. **"Tag policy bắt buộc gắn tag"** → Sai; bắt buộc thì SCP + `aws:RequestTag`.
7. **"Control Tower guardrail = SCP"** → Chỉ **preventive**; detective là Config rule, proactive là CFN hook.
8. **"Identity Center tạo IAM user"** → Sai, nó tạo **IAM role** + credential STS tạm thời; và đổi IdP chỉ cắt quyền kịp khi có **SCIM**.
9. **"RAM cho account kia toàn quyền trên subnet chia sẻ"** → Sai, bên nhận không sửa/xoá được subnet.
10. **"Service Catalog cần cấp quyền RDS cho developer"** → Sai, điểm mạnh ở **launch constraint role**.
11. **"Một account nằm trong nhiều OU"** → Sai, đúng một OU; và consolidated billing only thì chưa dùng được SCP.
12. **"License Manager giảm giá license"** → Nó **đếm và cưỡng chế** hạn mức, tránh phạt khi audit.

---

## 14. Tóm tắt 1 dòng

> **Organizations** dựng cây và gộp tiền; **SCP** đặt trần cho principal, **RCP** đặt trần cho resource (data perimeter) — cả hai *không cấp quyền*; **Control Tower** dựng landing zone với control preventive (SCP) / detective (Config) / proactive (hook) + Account Factory; **IAM Identity Center** thay IAM user bằng permission set → role tạm thời + ABAC; **RAM** chia sẻ chính resource (subnet, TGW, resolver rule, license); **Service Catalog** cho self-service có hàng rào; **License Manager** đếm BYOL; root thì MFA + SCP deny hoặc centralized root access management.

---

## 15. Bài tập tự kiểm tra

1. 60 account, không account nào (kể cả admin của nó) được tạo resource ngoài `eu-west-1` và `eu-central-1`, nhưng vẫn dùng được IAM, CloudFront, Route 53. Policy loại gì, gắn ở đâu, condition nào? Management account thì sao?
2. Một bucket trong account Prod có bucket policy `Principal: "*"`. Làm sao để chuyện tương tự không bao giờ có hiệu lực ở **bất kỳ** account nào, kể cả khi admin account đó viết sai? Vì sao SCP không giải được?
3. "Cần **phát hiện** mọi EBS volume chưa mã hoá trong toàn Org, nhưng **không** chặn việc tạo volume." Loại control nào của Control Tower, chạy trên service nào?
4. Đã có Okta, 150 project. Nhân viên nghỉ việc phải mất quyền AWS trong vài phút; mỗi kỹ sư chỉ chạm resource project mình. Thiết kế Identity Center thế nào để **không** phải tạo 150 permission set?
5. Account Network sở hữu một VPC lớn và một Transit Gateway; bốn team ở bốn account cần chạy EC2 trong subnet đó. So sánh RAM subnet sharing với "mỗi team một VPC + peering": khác nhau về IP, chi phí NAT, và ai xoá được gì?
6. Developer cần tự tạo RDS đúng chuẩn công ty (mã hoá KMS, backup 14 ngày, subnet private) nhưng **không** có quyền `rds:CreateDBInstance`. Dựng bằng Service Catalog thế nào, launch constraint làm gì?

---

## 16. Đọc thêm

- AWS Whitepaper — *Organizing Your AWS Environment Using Multiple Accounts*; AWS Prescriptive Guidance — *AWS Security Reference Architecture (SRA)*.
- AWS docs — *Organizations User Guide* (SCP, RCP, policy evaluation), *Control Tower User Guide* (controls reference), *IAM Identity Center User Guide*; blog series *Establishing a data perimeter on AWS*.

---

Tiếp theo: [[ch3-06-operations-iac]] — Systems Manager, CloudFormation/StackSets và tự động hoá vận hành trên nền multi-account vừa dựng.
