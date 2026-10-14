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

*Governance* ở đây nghĩa là: công ty có vài chục AWS account, làm sao đặt **một bộ luật chung** mà không phải vào từng account cấu hình tay. Các dịch vụ trong bài chia làm ba tầng, mỗi tầng trả lời một câu hỏi khác nhau — đề thi hay gài bằng cách lấy công cụ của tầng này trả lời câu hỏi của tầng kia.

- **Tầng cấu trúc — "account nào thuộc nhóm nào, ai trả tiền?"** Đây là việc của **AWS Organizations**: gom các account thành một cây (root, OU, member account) và gộp hoá đơn (consolidated billing).
- **Tầng chặn/cho phép — "ai được làm gì?"** Gồm **IAM policy** và **permission boundary** (nằm trong từng account), cộng với **SCP** và **RCP** (gắn từ trên cây Organizations xuống).
- **Tầng vận hành — "làm sao dựng và dùng hằng ngày cho nhanh?"** Gồm **Control Tower** (dựng sẵn cả bộ khung), **IAM Identity Center** (đăng nhập một lần vào mọi account), **RAM** (chia sẻ resource), **Service Catalog** (tự phục vụ hạ tầng đã duyệt), **License Manager** (đếm license).

Nguyên tắc xuyên suốt: **Organizations không cấp quyền cho ai cả**, nó chỉ *thu hẹp* thứ IAM có thể cấp. Quyền luôn phải được cấp từ bên trong account (IAM policy hoặc resource policy); mọi thứ gắn từ cây Organizations xuống chỉ là cái trần.

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

Một **organization** (viết tắt Org) là một nhóm AWS account được quản lý chung. Bốn khái niệm tạo nên nó:

- **Management account** (tên cũ: master account, payer account) là account tạo ra Org. Nó mời hoặc tạo account khác, gắn policy lên cây, và **trả tiền cho toàn Org**. Mỗi Org có đúng một management account.
- **Member account** là mọi account còn lại. Lý do thật để tách nhiều account không phải cho gọn, mà vì mỗi account là một **ranh giới bảo mật** (IAM của account này mặc định không chạm được resource account kia) và một **ranh giới quota** (hạn mức như số vCPU EC2 hay số lần gọi API mỗi giây tính riêng từng account — team test chạy load không ăn hết quota của production).
- **Root** là node gốc của cây, nơi mọi OU và account treo vào. Đừng nhầm với *root user* — người dùng gốc đăng nhập bằng email của một account (mục 11). Mỗi Org có đúng một root.
- **OU (Organizational Unit)** là một "thư mục" gom account, lồng nhau được tối đa **5 cấp** dưới root. Một account thuộc **đúng một OU** tại một thời điểm, giống một file chỉ nằm trong một thư mục.

Policy gắn vào root thì áp cho cả cây, gắn vào OU thì áp cho mọi account bên dưới OU đó — đó là lý do người ta xếp OU theo *mức độ kiểm soát giống nhau* (Prod, Dev, Sandbox, Security) chứ không theo sơ đồ phòng ban.

### 3.1 Hai chế độ

Khi tạo Org bạn chọn một trong hai bộ tính năng. Khác biệt gốc: chế độ đầu chỉ đụng tới **hoá đơn**, chế độ sau cho management account quyền **đặt luật** lên member account.

| Chế độ | Có gì | Khi nào chọn |
|---|---|---|
| **Consolidated billing only** | Gộp hoá đơn, chia sẻ volume discount + RI/Savings Plans | Chỉ cần gom tiền, chưa ràng buộc quyền |
| **All features** | Trên **+ SCP, RCP, tag/backup/AI opt-out/declarative policy, delegated administrator** | Mặc định; **bắt buộc** nếu đề nhắc SCP hoặc Control Tower |

Bẫy: đề nói "chặn service ở vài account" mà Org đang ở consolidated billing only → bước đầu là **enable all features**, chưa phải viết SCP.

### 3.2 Consolidated billing

Cả Org nhận **một hoá đơn** do management account trả, nhưng chi phí không bị trộn: Cost Explorer vẫn tách được theo chiều `linked account` (tên gọi của member account trong ngữ cảnh billing — xem [[ch4-04-cost-visibility]]). Gộp hoá đơn kéo theo ba hệ quả về tiền:

- **Bậc giá theo khối lượng cộng dồn.** Nhiều dịch vụ càng dùng nhiều thì đơn giá càng giảm (S3, data transfer). AWS cộng mức dùng của mọi account rồi mới xét bậc: 100 account, mỗi account 1 TB S3, được tính giá như **một** khách hàng dùng 100 TB — chạm bậc rẻ hơn (S3 Standard hạ đơn giá sau 50 TB đầu) trong khi từng account riêng lẻ không bao giờ tới.
- **Reserved Instance và Savings Plans chia sẻ toàn Org.** Đây là các cam kết trả trước để được giảm giá compute. Account A mua mà giờ đó không dùng hết thì phần giảm giá tự áp sang instance phù hợp ở account B. Mặc định bật, tắt được cho từng account (khi một đơn vị muốn giữ riêng phần mình mua).
- **Free tier chỉ tính một lần cho cả Org**, không phải mỗi account một suất.

### 3.3 Delegated administrator

Management account là account quyền lực nhất và cũng là nơi SCP không với tới (mục 4.3), nên càng ít người đăng nhập vào đó càng tốt. Nhưng nhiều dịch vụ bảo mật cần một "account quản trị" nhìn xuyên cả Org. Lời giải là **delegated administrator**: management account chỉ định một member account làm quản trị viên cho **từng service** — GuardDuty, Security Hub, Config, Backup, IAM Identity Center… Team security làm việc hằng ngày trong account đó (thường đặt tên *Security Tooling* hoặc *Audit*) mà không cần chạm vào management account.

---

## 4. SCP — Service Control Policy

### 4.1 Cơ chế: filter, không phải grant

**Nó là gì.** SCP là một tài liệu JSON viết gần giống IAM policy, nhưng gắn vào **root, OU hoặc account** trên cây Organizations thay vì gắn vào user/role. Nó định nghĩa **quyền tối đa** mà mọi *principal* (user hoặc role — "ai" đang gọi API) trong các account bên dưới có thể có.

**SCP lọc, không cấp.** Hình dung IAM policy là danh sách "việc tôi được giao", còn SCP là nội quy toà nhà. Nội quy cho phép mang laptop không có nghĩa bạn được phát laptop. Cụ thể:

```
SCP allow s3:*   +  IAM policy không cho gì      → KHÔNG làm được gì (không ai cấp quyền)
SCP deny  ec2:*  +  IAM có AdministratorAccess  → KHÔNG dùng được EC2 (trần chặn)
SCP allow s3:*   +  IAM cho s3:GetObject        → làm được đúng s3:GetObject
```

Quyền hiệu lực là **phần giao (AND)** của SCP và IAM policy: một action phải được cả hai bên cho qua.

**Vì sao lúc mới bật thì SCP "trong suốt".** SCP theo mô hình *mặc định là chặn*: action nào không có câu `Allow` thì coi như bị cấm. Để việc bật SCP không làm sập cả Org, AWS tự gắn sẵn một SCP tên **`FullAWSAccess`** (nội dung: allow `*` trên `*`) vào **root, mọi OU và mọi account**. Nhờ nó, trần đang ở mức "mọi thứ", nên chưa cấu hình gì thêm thì SCP không thay đổi hành vi nào cả.

**Nhiều tầng cũng là phép giao.** Một account chịu mọi SCP trên đường đi từ root xuống nó. Luật đánh giá có hai vế:

- **Allow phải có ở MỌI tầng**: root, từng OU trên đường đi, và chính account. Thiếu `Allow` ở một tầng là action đó bị chặn cho mọi thứ bên dưới tầng ấy.
- **Deny chỉ cần ở MỘT tầng** bất kỳ là đủ chặn, và không `Allow` nào ở tầng dưới gỡ lại được.

Ví dụ cây ba tầng:

```
Root                     FullAWSAccess
└─ OU Workloads          FullAWSAccess + SCP "Deny mọi region ngoài EU"
   └─ OU Dev             SCP "Allow ec2:*, s3:*, cloudwatch:*"   (đã gỡ FullAWSAccess ở OU này)
      └─ Account dev-1   FullAWSAccess

Một role trong dev-1 có IAM policy AdministratorAccess:
  ec2:RunInstances  ở eu-west-1  → ĐƯỢC   (mọi tầng allow, không tầng nào deny)
  ec2:RunInstances  ở ap-east-1  → CHẶN   (Deny tại OU Workloads)
  rds:CreateDBInstance eu-west-1 → CHẶN   (OU Dev không có Allow cho rds)
```

Dòng cuối là chỗ hay nhầm: không có câu `Deny rds` nào cả, RDS bị chặn chỉ vì **một tầng** trên đường đi thiếu `Allow`. `FullAWSAccess` ở root và ở account dev-1 không cứu được.

### 4.2 Deny-list vs allow-list

Từ luật trên suy ra hai cách dùng SCP. **Deny-list** (danh sách cấm): để nguyên `FullAWSAccess` ở mọi tầng rồi gắn thêm SCP `Deny` cho những thứ muốn cấm — "được hết, trừ…". **Allow-list** (danh sách cho phép): thay `FullAWSAccess` bằng một SCP chỉ `Allow` vài service — "cấm hết, trừ…".

Điểm dễ sai của allow-list là chỗ gỡ `FullAWSAccess`. Phải gỡ nó ở **đúng tầng bạn gắn SCP allow-list**. Trong ví dụ trên, nếu OU Dev vẫn còn `FullAWSAccess` bên cạnh SCP allow-list thì hai SCP cùng tầng cộng lại thành "allow mọi thứ", allow-list vô tác dụng. Ngược lại, gỡ `FullAWSAccess` ở root mà không gắn SCP `Allow` nào thay thế thì root không còn câu `Allow` nào, toàn bộ member account mất hết quyền.

| Kiểu | Cách làm | Khi nào chọn | Bẫy |
|---|---|---|---|
| **Deny-list** | Giữ `FullAWSAccess`, thêm SCP `Deny` vài action | Mặc định; service mới vẫn dùng ngay | Không siết được "chỉ dùng N service" |
| **Allow-list** | **Gỡ `FullAWSAccess`**, chỉ `Allow` đúng action cần | Compliance cao, cần khoá chặt danh mục service | Quên gỡ `FullAWSAccess` → vẫn full quyền; dễ chặt nhầm dependency (KMS, CloudWatch, IAM) |

### 4.3 Những gì SCP KHÔNG đụng tới

SCP có bốn vùng mù. Đề thi thích hỏi đúng bốn chỗ này.

1. **Management account.** SCP chỉ tác động lên member account. User và role trong management account không bị ảnh hưởng, kể cả khi SCP gắn ở root của cây. Hệ quả thực tế: **đừng chạy workload trong management account**, vì thứ gì chạy ở đó nằm ngoài mọi hàng rào bạn dựng.
2. **Service-linked role (SLR).** Đây là loại IAM role đặc biệt do **chính một dịch vụ AWS tạo ra và định nghĩa quyền**, để dịch vụ đó thay bạn gọi các dịch vụ khác — ví dụ `AWSServiceRoleForAutoScaling` cho phép Auto Scaling launch và terminate EC2. Bạn không sửa được policy của nó, và chỉ dịch vụ chủ mới assume được. SCP không chặn action thực hiện bằng SLR, vì nếu chặn được thì một SCP viết ẩu sẽ làm chính các dịch vụ AWS (kể cả những dịch vụ tích hợp với Organizations như Control Tower, Config) ngừng hoạt động. Lưu ý: miễn trừ áp cho *việc SLR làm*, không áp cho người dùng *tạo ra* SLR.
3. **Root user của management account.** Hệ quả trực tiếp của điểm 1. Ngược lại, **root user của member account thì SCP CHẶN ĐƯỢC** — SCP áp lên mọi principal của member account, tính cả root.
4. **Principal ở ngoài và resource-based policy.** SCP lọc theo *ai gọi từ trong account của tôi*. Một người ở account ngoài Org đọc bucket của bạn (vì bucket policy cho phép) không phải principal của bạn, nên SCP không có tiếng nói. Lỗ hổng đó là lý do RCP ra đời (mục 5).

### 4.4 Condition hay dùng

SCP mạnh nhờ khối `Condition`: chặn theo ngữ cảnh của request chứ không chỉ theo tên action. Năm kiểu sau gần như phủ hết các câu hỏi về SCP.

**Khoá region — `aws:RequestedRegion`.** Đây chính là thứ còn thiếu trong câu chuyện ở mục 1. Key này mang giá trị region mà request gửi tới.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyOutsideEU",
    "Effect": "Deny",
    "NotAction": ["iam:*", "organizations:*", "route53:*", "cloudfront:*", "sts:*", "support:*"],
    "Resource": "*",
    "Condition": {
      "StringNotEquals": { "aws:RequestedRegion": ["eu-west-1", "eu-central-1"] },
      "ArnNotLike":      { "aws:PrincipalArn": "arn:aws:iam::*:role/BreakGlassAdmin" }
    }
  }]
}
```

Đọc policy này thành lời: *chặn mọi action, trừ nhóm trong `NotAction`, khi region không phải hai region EU và người gọi không phải role `BreakGlassAdmin`*. Hai chi tiết cần hiểu:

- **Vì sao phải có `NotAction`.** IAM, Organizations, Route 53, CloudFront là **global service**: chúng không thuộc region nào và API của chúng đặt ở `us-east-1`. Request tới các dịch vụ này luôn mang `aws:RequestedRegion = us-east-1`. Không loại chúng ra thì khoá region xong không ai tạo được IAM role hay sửa được DNS nữa.
- **Gắn ở đâu.** Gắn vào root (áp cả Org) hoặc OU. Management account vẫn không bị áp (mục 4.3).

**Chừa lối thoát — `aws:PrincipalArn` với `ArnNotLike`.** *Break-glass* ("đập kính khi khẩn cấp") là một role dự phòng quyền rất cao, bình thường không ai dùng, chỉ mở khi sự cố và mọi lần dùng đều bị ghi log, báo động. Điều kiện `ArnNotLike` ở trên chừa role đó ra khỏi lệnh cấm, để khi chính SCP gây sự cố vẫn còn một đường vào sửa.

**Cấm loại instance đắt — `ec2:InstanceType`.** Ở OU Sandbox, deny `ec2:RunInstances` khi instance type khớp `p*` hoặc `g*` (các họ GPU). Kết hợp với khoá region là chặn được trọn kịch bản mục 1.

**Bảo vệ tầng log.** Không cần condition: deny thẳng các action `cloudtrail:StopLogging`, `cloudtrail:DeleteTrail`, `config:DeleteConfigurationRecorder`, `guardduty:DeleteDetector`. Kẻ chiếm được quyền admin của một account thường tắt log trước tiên; SCP này khiến admin account cũng không tắt được tầng detective của [[ch3-04-detective-controls]].

**`aws:PrincipalOrgID` và `aws:ResourceOrgID`.** Hai key này so ID của Org. `aws:ResourceOrgID` dùng trong SCP để cấm principal của bạn ghi dữ liệu ra resource ngoài Org. `aws:PrincipalOrgID` chủ yếu dùng trong resource policy và RCP để chỉ cho principal trong Org vào. Cả hai là nền của data perimeter ở mục 5.2.

> 📏 **Giới hạn kích thước.** Docs hiện tại: một SCP tối đa **10.240 ký tự**, và gắn trực tiếp được tối đa **10 SCP** lên mỗi root, OU hay account (SCP thừa kế từ tầng trên không tính vào con số này). Tài liệu ôn thi cũ ghi **5.120 ký tự và 5 SCP** — gặp con số nào trong đề thì ý cần nhớ vẫn là một: SCP có trần kích thước, nên tách theo chủ đề (một SCP cho region, một cho bảo vệ log…) và gắn ở OU cao thay vì lặp lại ở từng account.

---

## 5. RCP và data perimeter

### 5.1 RCP soi chiều ngược lại

**SCP** giới hạn *principal trong account của tôi* được làm gì, dù resource ở đâu. **RCP (Resource Control Policy)** giới hạn *ai được chạm resource trong account của tôi*, dù họ từ đâu tới. RCP cũng **không cấp quyền**, cũng có policy mặc định cho phép mọi thứ (`RCPFullAWSAccess`), cũng **không áp lên resource trong management account**, và chỉ hỗ trợ **một tập service** chứ không phải toàn bộ AWS. Lúc ra mắt là năm service hay bị lộ dữ liệu nhất — S3, STS, KMS, SQS, Secrets Manager (danh sách đề thi quen dùng); docs hiện tại đã mở rộng thêm nhiều service khác như DynamoDB, ECR, CloudWatch Logs, Cognito.

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

SCP và RCP là hai loại policy *phân quyền* (authorization): chúng quyết định một lời gọi API được qua hay không. Organizations còn một nhóm policy *quản lý* gắn lên cây theo cùng cách (root, OU, account) nhưng làm việc khác hẳn: chúng **đẩy một cấu hình xuống** các account. Bốn loại đề thi nhắc tới:

**Tag policy — chuẩn hoá cách viết tag.** Bạn khai báo key chuẩn và các giá trị hợp lệ, ví dụ key phải viết đúng `CostCenter` và giá trị chỉ được là `100`, `200`, `300`. Organizations báo cáo resource nào lệch chuẩn (`costcenter`, `Cost_Center`…), và có thể bật chế độ từ chối thao tác gắn tag sai giá trị cho một số loại resource. Nó sinh ra để báo cáo chi phí theo tag không bị vỡ vì mỗi team viết một kiểu.

**Backup policy — một lịch backup cho cả OU.** Bạn viết một backup plan (tần suất, giữ bao lâu, copy sang region nào) thành policy; Organizations tự tạo plan đó trong AWS Backup ở mọi account bên dưới. Account mới vào OU là có lịch backup ngay, không ai phải nhớ cấu hình.

**AI services opt-out policy — không cho AWS dùng dữ liệu của bạn để huấn luyện.** Một số dịch vụ AI của AWS (Rekognition, Transcribe, Lex…) mặc định có thể lưu và dùng nội dung bạn gửi lên để cải thiện dịch vụ. Policy này tắt việc đó cho cả Org bằng một lần gắn ở root.

**Declarative policy — khoá một thiết lập của dịch vụ.** Bạn khai báo *trạng thái mong muốn* của một thuộc tính cấp account, và dịch vụ giữ nguyên trạng thái đó; admin account không đổi lại được, account mới vào Org tự thừa kế. Hiện hỗ trợ chủ yếu cho EC2/VPC/EBS:

| Thuộc tính | Khoá cái gì |
|---|---|
| VPC Block Public Access | Chặn traffic internet qua internet gateway của mọi VPC |
| Image Block Public Access | Không cho chia sẻ AMI ra public |
| Snapshot Block Public Access | Không cho chia sẻ EBS snapshot ra public |
| Allowed Images Settings | Chỉ được launch từ AMI của nhà cung cấp đã duyệt |
| Instance Metadata defaults | Ép IMDSv2 cho instance mới |
| Serial Console Access | Bật/tắt EC2 serial console |

Khác SCP ở đâu? SCP chặn **từng lời gọi API**, nên dịch vụ ra API mới là bạn phải viết thêm action vào SCP. Declarative policy được thi hành **ngay trong dịch vụ**, không phụ thuộc API nào được gọi, nên vẫn đúng khi có API mới — và nó áp lên cả service-linked role, thứ SCP bỏ qua (mục 4.3). Bạn còn đặt được thông báo lỗi riêng để người bị chặn biết phải hỏi ai.

> 🪤 Bẫy thi: **tag policy không bắt buộc gắn tag.** Nó chỉ kiểm tra tag *khi tag có mặt*; tạo resource không tag nào vẫn qua. Muốn *không tag thì không tạo được* phải dùng **SCP `Deny`** với condition key `aws:RequestTag` (giá trị tag gửi kèm request tạo resource):
>
> ```json
> {
>   "Effect": "Deny",
>   "Action": "ec2:RunInstances",
>   "Resource": "arn:aws:ec2:*:*:instance/*",
>   "Condition": { "Null": { "aws:RequestTag/CostCenter": "true" } }
> }
> ```
>
> `Null … "true"` nghĩa là "key này không có trong request" — tức launch instance mà thiếu tag `CostCenter` thì bị chặn. Tag policy lo *viết đúng*, SCP lo *phải có*; hai thứ dùng cùng nhau.

---

## 6. AWS Control Tower

### 6.1 Nó làm gì

Tự dựng mọi thứ ở mục 3–5 cho một Org mới là vài tuần làm việc: tạo OU, viết SCP, bật CloudTrail và Config ở từng account, gom log về một chỗ, dựng đăng nhập tập trung. **Landing zone** là tên gọi của kết quả cuối: một môi trường multi-account đã có sẵn cấu trúc account, logging, bảo mật và đăng nhập, để team chỉ việc "hạ cánh" workload vào. **Control Tower** là dịch vụ dựng landing zone đó giúp bạn trong khoảng một giờ.

Control Tower **không phải công nghệ mới**. Nó là lớp điều phối: thay bạn gọi và cấu hình các dịch vụ sẵn có — Organizations, CloudTrail, Config, IAM Identity Center, Service Catalog, CloudFormation StackSets — theo một thiết kế AWS đã chọn. Sau khi chạy xong bạn có:

- **OU Security** chứa hai account dùng chung: **Log Archive** (bucket S3 nhận log của mọi account, gần như không ai có quyền ghi/xoá) và **Audit** (nơi team security đọc xuyên account).
- Ít nhất một **OU cho workload** (mặc định tên *Sandbox*).
- **CloudTrail cấp organization**: mọi account, kể cả account tạo sau này, đều ghi log API về Log Archive.
- **AWS Config** bật ở mọi account, có **aggregator** (bảng tổng hợp trạng thái resource của cả Org) đặt ở Audit.
- **IAM Identity Center** với vài permission set dựng sẵn (mục 7).
- Một **home region** — region bạn chạy Control Tower, nơi đặt các resource dùng chung của landing zone — và tuỳ chọn **Region deny**: một SCP cấm dùng các region ngoài danh sách bạn cho phép.

### 6.2 Controls — ba loại

Luật trong Control Tower gọi là **control** (tên cũ: *guardrail*, đề thi dùng cả hai). Bạn bật control trên một OU, Control Tower tự triển khai cơ chế thực thi bên dưới. Có ba loại, khác nhau ở **thời điểm can thiệp**:

| Loại | Thi hành bằng | Thời điểm | Ví dụ |
|---|---|---|---|
| **Preventive** | **SCP** | *Trước* khi action xảy ra | Cấm tắt CloudTrail, cấm region lạ |
| **Detective** | **AWS Config rule** | *Sau* khi resource tồn tại | EBS chưa mã hoá, bucket public |
| **Proactive** | **CloudFormation hook** | *Khi provision qua CFN* | Từ chối template RDS không mã hoá |

Ba loại khác nhau vì cơ chế bên dưới khác nhau. **Preventive** dùng SCP nên chặn ngay tại lời gọi API: hành động không bao giờ xảy ra. **Detective** dùng Config rule, mà Config chỉ biết về một resource *sau khi* nó được tạo hoặc sửa, nên chỉ có thể đánh dấu "non-compliant" chứ không ngăn được. **Proactive** dùng *CloudFormation hook* — một đoạn kiểm tra chạy trước khi CloudFormation tạo resource, soi template và từ chối nếu vi phạm; vì thế nó chỉ bắt được resource tạo **qua CloudFormation**, tạo tay trên console thì lọt.

Mỗi control có một mức khuyến nghị: **Mandatory** (bật sẵn, không tắt được — ví dụ cấm sửa bucket log ở Log Archive), **Strongly recommended**, **Elective** (tuỳ chọn).

> 🪤 Bẫy kinh điển là đọc đúng động từ trong đề. "Cần **phát hiện** / báo cáo resource vi phạm" → **detective** (Config rule). "Cần **ngăn** không cho làm" → **preventive** (SCP). "Cần chặn resource sai chuẩn **trước khi được provision bằng CloudFormation**" → **proactive** (hook).

### 6.3 Account Factory

Team mới cần một account. Làm tay thì phải tạo account, đưa vào đúng OU, bật CloudTrail và Config, tạo role, cấu hình đăng nhập — mười mấy bước dễ sót. **Account Factory** là tính năng *account vending* ("máy bán account") của Control Tower: bạn điền một form (tên account, email, OU đích, tuỳ chọn mạng) rồi Control Tower làm hết phần còn lại, cho ra một account đã nằm trong OU, đã áp control của OU đó và đã nối với Identity Center.

Về kỹ thuật, Account Factory được xuất bản như một **Service Catalog product** (mục 9) — đó là lý do hai dịch vụ này luôn xuất hiện cùng nhau, và bạn có thể cấp cho một team quyền tự "launch" account mà không cần quyền Organizations. Công ty đã chuẩn hoá Terraform thì dùng **Account Factory for Terraform (AFT)**: yêu cầu account là một commit vào git thay vì một lần bấm form.

Bốn thuật ngữ đi kèm:

- **Baseline** là bộ cấu hình nền Control Tower cài vào mỗi account nó quản lý: CloudTrail, Config recorder, các IAM role để Control Tower vào quản trị. Nó được triển khai bằng CloudFormation StackSets.
- **Register OU** là đưa một OU có sẵn vào tầm quản lý của Control Tower. **Enroll account** là việc tương tự cho một account có sẵn (account tạo trước khi có Control Tower, hoặc tạo thẳng bằng Organizations): Control Tower cài baseline vào account đó và áp control của OU. Account tạo qua Account Factory thì được enroll sẵn.
- **Drift** ("trôi") là khi trạng thái thật lệch khỏi thứ Control Tower đã thiết lập, do ai đó sửa bên ngoài Control Tower: chuyển account sang OU khác bằng console Organizations, sửa hoặc gỡ một SCP do Control Tower quản lý, xoá một role của baseline. Control Tower tự quét và báo drift.
- **Re-register OU** là cách sửa drift phổ biến nhất: Control Tower áp lại baseline và control lên OU và mọi account trong đó. Drift nặng ở tầng landing zone (xoá OU Security, xoá role nền) thì phải **reset/update landing zone**.

Bài học rút ra cho đề thi: đã dùng Control Tower thì thay đổi cấu trúc nên làm **qua Control Tower**, không sửa thẳng trong Organizations.

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

*Identity source* là nơi Identity Center lấy danh sách user và group — tức nơi lưu username/mật khẩu thật. Chỉ chọn được **một** nguồn tại một thời điểm. Hai thuật ngữ cần biết trước khi đọc bảng: **IdP (identity provider)** là hệ thống quản lý danh tính của công ty như Okta hay Microsoft Entra ID; **SAML 2.0** là giao thức để IdP xác nhận với AWS "người này đã đăng nhập, tên là X" mà AWS không cần biết mật khẩu; **SCIM** là giao thức để IdP tự động **đồng bộ danh sách** user/group sang AWS (tạo, sửa, vô hiệu hoá).

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

**Cái gì miễn phí.** Organizations, SCP, RCP, RAM, IAM Identity Center và bản thân Control Tower không tính phí riêng. Nhưng **những dịch vụ Control Tower bật giúp bạn thì có tính**, và chúng nhân lên theo số account.

**AWS Config — thường là khoản lớn nhất.** Config tính tiền theo **configuration item (CI)**: mỗi lần một resource được tạo, sửa hoặc xoá, Config ghi lại một bản chụp cấu hình của resource đó, và mỗi bản chụp là một CI. Giá ~**0,003 USD/CI** (us-east-1, chế độ ghi liên tục). Nghe nhỏ, nhưng Control Tower bật Config ghi **mọi loại resource ở mọi account**:

```
Giả định: 40 account, mỗi account trung bình 15.000 CI/tháng
40 × 15.000 CI × 0,003 USD  = 1.800 USD/tháng  (chưa tính phí đánh giá rule)
```

Con số 15.000 CI/tháng không cần hệ thống lớn mới tới. Thủ phạm là resource **sống ngắn và đổi liên tục**: một Auto Scaling group scale ra vào cả ngày, mỗi instance sinh rồi chết kéo theo CI của instance, network interface, EBS volume. Có hai cách hạ:

- **Loại bớt resource type** khỏi recorder ở những account không cần (ví dụ bỏ network interface ở account Dev).
- **Chuyển sang periodic recording** cho resource đổi nhiều: thay vì ghi mỗi lần đổi, Config ghi tối đa một CI mỗi 24 giờ nếu có thay đổi, giá ~0,012 USD/CI.

```
Một resource đổi 20 lần/ngày:
  ghi liên tục:  20 × 0,003 = 0,060 USD/ngày
  ghi định kỳ:    1 × 0,012 = 0,012 USD/ngày   → rẻ hơn 5 lần
Điểm hoà vốn: 0,012 ÷ 0,003 = 4 lần đổi/ngày; đổi ít hơn thế thì ghi liên tục rẻ hơn.
```

Cái giá của ghi định kỳ là mất lịch sử chi tiết giữa hai lần chụp, nên không dùng cho resource cần audit từng thay đổi (security group, IAM).

**CloudTrail.** Bản sao đầu tiên của *management event* (lời gọi API quản trị như `RunInstances`, `CreateBucket`) ghi ra S3 là miễn phí, nên trail cấp organization của Control Tower gần như chỉ tốn tiền lưu S3. Thứ đắt là **data event** — lời gọi trên chính dữ liệu như `s3:GetObject` hay `lambda:Invoke` — giá ~0,10 USD cho mỗi 100.000 event:

```
Một bucket nhận 50 triệu GET/ngày, bật data event:
50.000.000 × 30 ngày = 1,5 tỷ event/tháng
1.500.000.000 ÷ 100.000 × 0,10 USD = 1.500 USD/tháng — chỉ cho MỘT bucket
```

Vì vậy data event chỉ bật cho những bucket nhạy cảm, không bật toàn Org.

**Security Hub, GuardDuty** nếu bật kèm cũng tính theo account và theo lượng dữ liệu phân tích.

**Chiều tiết kiệm.** Multi-account cũng là đòn bẩy giảm tiền: **consolidated billing** gộp bậc giá và chia sẻ RI/Savings Plans (mục 3.2); **VPC sharing qua RAM** cho nhiều account dùng chung NAT Gateway thay vì mỗi account một bộ (mục 8); và chiều `linked account` trong Cost Explorer cho bạn chia chi phí về từng team (*chargeback*) mà không cần hệ thống tag hoàn hảo.

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
