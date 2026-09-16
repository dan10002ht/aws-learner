# SAA Ch3.6 — Operations & Infrastructure as Code

> Mục tiêu: Đọc đề dạng "vận hành fleet EC2 trong private subnet, không mở port 22, không có NAT" hoặc "deploy cùng một stack sang 40 account" là chọn đúng service — Systems Manager, CloudFormation/StackSets, Elastic Beanstalk, Launch Template, DLM hay AWS Backup — và biết **điều kiện hạ tầng** nào phải có thì lựa chọn đó mới chạy.

Tiền đề: [[ch3-01-iam-deep-dive]], [[ch3-05-multi-account-governance]], [[ch3-02-network-security]], [[resilient-02-ha-fault-tolerance]].

---

## 1. Câu chuyện mở đầu — "Bastion host chết, 200 instance thành hộp đen"

2h sáng, on-call cần vào một EC2 trong private subnet đọc log vì app trả 502. Đường vào duy nhất: một bastion t3.micro có Elastic IP, security group mở 22 cho dải IP văn phòng, key `prod-2019.pem` nằm trên Google Drive chung. Sáng đó bastion bị terminate vì "instance không tag". Hệ quả: không ai vào được 200 instance phía sau, và CloudTrail chỉ thấy `TerminateInstances` chứ không có phiên SSH nào.

Fix đúng không phải "dựng lại bastion cho HA" mà là **bỏ hẳn đường SSH**: Session Manager mở shell qua API AWS, xác thực bằng IAM, ghi log phiên, instance **không cần inbound port, không cần public IP**. Đổi lại nó có một danh sách điều kiện hạ tầng — và chính danh sách đó là thứ đề hỏi nhiều nhất.

---

## 2. Bức tranh: ba trục của mảng Operations

| Trục | Câu hỏi nền | Service chủ đạo |
|---|---|---|
| **Vận hành cái đang chạy** | Vào máy thế nào, patch ra sao, config để đâu? | Systems Manager: Session Manager, Run Command, State/Patch Manager, Automation, Inventory, Parameter Store |
| **Dựng lại được** | Hạ tầng mô tả bằng gì, nhân bản sang account/Region khác ra sao? | CloudFormation + StackSets, Beanstalk, Service Catalog, Launch Template |
| **Giữ lại được** | Snapshot ai tạo, giữ bao lâu, ai xoá được? | Data Lifecycle Manager, AWS Backup |

Đề SAA thường trộn cả ba trong cùng một tình huống.

---

## 3. Systems Manager — Session Manager và cái giá vào cửa

### 3.1 Cơ chế

SSM Agent trên instance **mở kết nối outbound** tới endpoint Systems Manager và giữ kênh long-poll; khi bạn gọi `ssm:StartSession`, service đẩy lệnh xuống qua kênh đó. Không packet nào đi từ ngoài vào → **security group inbound có thể rỗng hoàn toàn**, không cần public IP.

Quyền vào máy trở thành **quyền IAM** (`ssm:StartSession` theo instance-id hoặc tag) chứ không còn là "ai giữ file .pem" — thu hồi bằng cách sửa policy.

### 3.2 Bốn điều kiện — thiếu một là instance "mất tích"

1. **SSM Agent** đang chạy (có sẵn trên Amazon Linux 2/2023, Ubuntu AMI Canonical, Windows Server AMI; AMI custom phải cài tay).
2. **Instance profile** gắn role có managed policy **`AmazonSSMManagedInstanceCore`** — lỗi số một trong đề.
3. **Đường ra tới endpoint**: NAT/IGW, hoặc — với **private subnet không NAT** — ba **interface VPC endpoint (PrivateLink)** `com.amazonaws.<region>.ssm`, `.ssmmessages`, `.ec2messages`.
4. **Security group của endpoint** mở 443 từ dải subnet, bật **private DNS**.

| Endpoint | Dùng cho |
|---|---|
| `ssm` | API điều khiển: đăng ký node, nhận document, báo trạng thái |
| `ssmmessages` | Kênh dữ liệu của **Session Manager** (shell, port forwarding) |
| `ec2messages` | Kênh agent nhận **Run Command** / job từ service |

Thêm tuỳ tính năng: gateway endpoint **`s3`** (session log / Run Command output, Patch Manager lấy patch), **`kms`** (mã hoá session), **`logs`** (CloudWatch Logs).

### 3.3 Session Manager vs bastion vs Instance Connect

| Cách vào | Khi nào chọn | Bẫy |
|---|---|---|
| **Session Manager** | Mặc định cho mọi fleet EC2; đề nói "không mở inbound port", "không quản lý SSH key", "audit ai vào máy nào" | Quên 1 trong 3 endpoint hoặc quên `AmazonSSMManagedInstanceCore`; session log **không tự bật** |
| **Bastion host** | Chỉ khi công cụ bên thứ ba bắt buộc SSH trực tiếp | SPOF, phải patch, phải quản key, mở 22 ra internet |
| **EC2 Instance Connect** | Đẩy key SSH tạm hiệu lực ngắn qua API | Vẫn là SSH → vẫn cần đường mạng và security group |

Session Manager còn làm **port forwarding** (`AWS-StartPortForwardingSessionToRemoteHost`) để chọc tới RDS/Redis private, khỏi dựng VPN.

---

## 4. Sơ đồ — một phiên Session Manager trong private subnet

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 386" role="img" fill="currentColor" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Luồng Session Manager tới EC2 trong private subnet không có NAT</title>
  <desc>Admin gọi API ssm StartSession qua IAM. Service Systems Manager giữ kênh. SSM Agent trong private subnet mở kết nối outbound 443 tới ba interface VPC endpoint ssm, ssmmessages, ec2messages. Không có inbound rule nào trên security group của instance. Log phiên ghi xuống S3 và CloudWatch Logs.</desc>
  <defs>
    <marker id="smArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" stroke="none" fill-opacity="0.55"/></marker>
  </defs>
  <text x="16" y="22" font-size="14" font-weight="700">Session Manager — mọi kết nối đều là outbound từ agent</text>
  <rect x="16" y="40" width="150" height="66" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="28" y="62" font-size="12.5" font-weight="700">Admin / CLI</text>
  <text x="28" y="80" font-size="10" opacity="0.7">ssm:StartSession</text>
  <text x="28" y="94" font-size="10" opacity="0.7">xác thực bằng IAM</text>
  <line x1="166" y1="73" x2="212" y2="73" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#smArr)"/>
  <rect x="216" y="40" width="182" height="66" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="228" y="62" font-size="12.5" font-weight="700">Systems Manager</text>
  <text x="228" y="80" font-size="10" opacity="0.7">giữ kênh của agent,</text>
  <text x="228" y="94" font-size="10" opacity="0.7">đẩy lệnh xuống</text>
  <line x1="307" y1="106" x2="307" y2="148" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#smArr)"/>
  <text x="315" y="132" font-size="10" opacity="0.7">kênh sẵn có</text>
  <rect x="16" y="152" width="688" height="196" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="5 4"/>
  <text x="30" y="174" font-size="11.5" font-weight="700" opacity="0.75">VPC — private subnet, KHÔNG NAT, KHÔNG IGW</text>
  <rect x="36" y="188" width="300" height="60" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="48" y="210" font-size="12" font-weight="700">3 interface endpoint (PrivateLink)</text>
  <text x="48" y="228" font-size="10" opacity="0.75">ssm · ssmmessages · ec2messages</text>
  <text x="48" y="241" font-size="10" opacity="0.6">SG endpoint mở 443 từ subnet · private DNS ON</text>
  <line x1="336" y1="218" x2="386" y2="218" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#smArr)"/>
  <text x="338" y="210" font-size="9.5" opacity="0.6">443 outbound</text>
  <rect x="390" y="188" width="300" height="60" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="402" y="210" font-size="12" font-weight="700">EC2 — SSM Agent</text>
  <text x="402" y="228" font-size="10" opacity="0.75">instance profile: AmazonSSMManagedInstanceCore</text>
  <text x="402" y="241" font-size="10" opacity="0.6">inbound SG: rỗng · không public IP</text>
  <rect x="36" y="266" width="654" height="64" rx="9" fill="#3b82f6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="48" y="288" font-size="12" font-weight="700">Ghi log phiên (phải bật thủ công)</text>
  <text x="48" y="306" font-size="10" opacity="0.75">S3 bucket (cần gateway endpoint s3) · CloudWatch Logs (cần endpoint logs) · mã hoá KMS (cần endpoint kms)</text>
  <text x="48" y="321" font-size="10" opacity="0.6">CloudTrail ghi StartSession / TerminateSession — biết ai vào instance nào, lúc nào</text>
  <text x="16" y="374" font-size="11" opacity="0.7">Thiếu bất kỳ mảnh nào ở trên → instance không xuất hiện trong danh sách managed node.</text>
</svg>

---

## 5. Systems Manager — phần còn lại của bộ đồ nghề

**Run Command** chạy một SSM Document (`AWS-RunShellScript`, `AWS-RunPowerShellScript`) trên nhiều node cùng lúc, target bằng instance-id hoặc **tag filter**, rate control `MaxConcurrency`/`MaxErrors` — đúng thứ đề mô tả bằng "chạy 10% fleet trước, dừng nếu quá 5 node lỗi". Không cần SSH.

**State Manager** là bản "lặp lại": một *association* gắn document + target + schedule, SSM áp lại định kỳ để giữ **trạng thái mong muốn** (CloudWatch agent luôn được cài, file cấu hình đúng bản). Ai sửa tay thì lần chạy sau kéo về.

**Patch Manager**: **patch baseline** định nghĩa quy tắc duyệt patch (severity, classification, độ trễ ngày kể từ khi phát hành, approve/reject tường minh); tag khoá **`Patch Group`** ánh xạ instance vào baseline (dev/prod khác nhau); **maintenance window** giới hạn giờ tác động, có cutoff. Hai chế độ **Scan** (báo cáo compliance) và **Install** (vá, có thể reboot). Nó vá **OS và package**, không vá thư viện trong code app.

**Automation** là runbook chạy chuỗi bước trên **mặt phẳng API** chứ không chỉ trong OS: tạo AMI, restart instance, cập nhật AMI cho Launch Template, cô lập instance nghi bị xâm nhập. Điểm thi: **Config remediation gọi SSM Automation** — "phát hiện SG mở 0.0.0.0/0 rồi tự sửa" = Config rule + Automation runbook.

**Inventory** thu thập metadata node (package, phiên bản, network config); **resource data sync** đổ về S3 trung tâm để query bằng Athena — đáp án cho "làm sao biết còn server nào chạy thư viện cũ". Server on-prem tham gia bằng **hybrid activation** (node id `mi-`), dùng chung Run Command và Patch Manager.

### 5.1 Parameter Store vs Secrets Manager

| Tiêu chí | Parameter Store | Secrets Manager |
|---|---|---|
| Kiểu & kích thước | String, StringList, **SecureString** (KMS); Standard 4 KB, Advanced 8 KB | Chuỗi hoặc JSON, luôn mã hoá, dung lượng lớn hơn |
| Số lượng / giá | Standard: 10.000 parameter/Region/account, **miễn phí**; Advanced theo parameter/tháng | Theo **secret/tháng** + lượng API call |
| Rotation tự động | **Không có sẵn** — tự viết Lambda + EventBridge | **Có sẵn**, blueprint cho RDS/Redshift/DocumentDB, xoay luôn credential trong DB |
| Cross-account / multi-Region | Không sẵn | Resource policy cross-account, **replicate multi-Region** |
| Tính năng phụ | Hierarchy `/app/prod/db/url`, version, **parameter policy** (expiration, notification) ở tier Advanced | Staging label `AWSCURRENT`/`AWSPENDING` |
| **Khi nào chọn** | Config hoặc bí mật **không cần rotate tự động**; cần **chi phí gần 0**; nhiều key dạng cây | Bắt buộc rotate định kỳ theo compliance, credential database, chia sẻ cross-account |
| Bẫy | "Parameter Store tự rotate password RDS" là **sai** | Dùng cho 5.000 feature flag: đúng kỹ thuật nhưng **sai về cost** |

---

## 6. CloudFormation — mô tả hạ tầng bằng template

### 6.1 Giải phẫu template

**`Resources` là section DUY NHẤT bắt buộc** — đề hỏi thẳng mệnh đề này.

| Section | Vai trò | Bắt buộc |
|---|---|---|
| `AWSTemplateFormatVersion`, `Description`, `Metadata` | Phiên bản, mô tả, dữ liệu phụ | Không |
| `Parameters` | Input lúc tạo/update: `AllowedValues`, `NoEcho` cho mật khẩu, type đọc thẳng từ SSM Parameter Store | Không |
| `Mappings` / `Conditions` / `Transform` | Bảng tra tĩnh (Region → AMI ID, qua `Fn::FindInMap`), logic bật/tắt resource theo môi trường, và macro (`AWS::Serverless` chính là SAM) | Không |
| **`Resources`** | Khai báo tài nguyên thật | **Có** |
| `Outputs` | Giá trị trả ra; thêm `Export` để stack khác `Fn::ImportValue` | Không |

Hàm hay gặp: `Ref`, `Fn::GetAtt`, `Fn::Sub`, `Fn::ImportValue`, `Fn::If`; pseudo parameter `AWS::Region`, `AWS::AccountId`, `AWS::StackName` giúp template không hardcode.

### 6.2 Cơ chế an toàn

- **Change set** xem trước resource nào bị thêm/sửa/**replace** — cột *Replacement: True* nghĩa là tạo mới rồi xoá cũ, cảnh báo lớn với DB. **Stack policy** khoá update lên resource nhạy cảm ở mức stack; **rollback** tự quay về trạng thái trước khi update lỗi.
- **DeletionPolicy**: `Delete` (mặc định), **`Retain`** (giữ S3/DB lại khi xoá stack), **`Snapshot`** (chụp trước khi xoá — EBS volume, RDS, Redshift, ElastiCache, Neptune, DocumentDB); **`UpdateReplacePolicy`** áp cùng logic khi resource bị replace lúc update.
- **Drift detection** so trạng thái thực với template (sửa SG bằng tay → `MODIFIED`) nhưng **không tự sửa**; muốn chặn từ gốc thì dùng IAM/SCP.
- **`CreationPolicy` + `cfn-signal`** để stack chờ app báo sẵn sàng; **`UpdatePolicy`** điều khiển rolling update của ASG. CloudFormation không tính phí.

### 6.3 Nested vs cross-stack vs StackSet

| Cách | Cơ chế | Khi nào chọn | Bẫy |
|---|---|---|---|
| **Nested stack** | `AWS::CloudFormation::Stack` trỏ tới template con trên S3 | Tái sử dụng **component** (VPC chuẩn, ALB chuẩn) trong nhiều stack cha | Update phải qua stack cha; template con phải ở S3 |
| **Cross-stack reference** | Stack A `Export`, stack B `Fn::ImportValue` | Chia theo **vòng đời**: network sống lâu, app đổi liên tục | Tên export duy nhất trong account+Region; **không sửa/xoá được output đang bị import** |
| **StackSet** | Một template → **nhiều account × nhiều Region** | Chuẩn hoá org: bật Config/GuardDuty, tạo IAM role, VPC baseline mọi account | Phải chọn đúng mô hình quyền |
| **Stack đơn** | Một stack, một account, một Region | App nhỏ, độc lập | Phình to thì update chậm và rủi ro |

Hai mô hình quyền của StackSet: **self-managed** (tự tạo cặp role `AWSCloudFormationStackSetAdministrationRole` + `AWSCloudFormationStackSetExecutionRole`, khi không có Organizations) và **service-managed** (target là **OU**; bật automatic deployment thì **account mới join OU tự nhận stack**) — cái sau là đáp án cho "mọi account mới phải có baseline mà không thao tác thủ công". *Operation preferences* chỉnh số account song song, ngưỡng lỗi, thứ tự Region.

---

## 7. Sơ đồ — stack, cross-stack và StackSet

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 296" role="img" fill="currentColor" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>So sánh nested stack, cross-stack reference và StackSet</title>
  <desc>Ba mô hình tổ chức CloudFormation. Nested stack là stack cha gọi stack con. Cross-stack reference là stack network export giá trị cho stack app import. StackSet là một template từ account quản trị triển khai xuống nhiều account trong các OU và nhiều Region.</desc>
  <defs>
    <marker id="cfArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" stroke="none" fill-opacity="0.55"/></marker>
  </defs>
  <text x="16" y="22" font-size="14" font-weight="700">Ba cách tổ chức CloudFormation</text>
  <text x="16" y="52" font-size="12" font-weight="700" opacity="0.8">1. Nested — tái sử dụng component</text>
  <rect x="16" y="62" width="200" height="34" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="28" y="84" font-size="11.5">Stack cha (app)</text>
  <line x1="60" y1="96" x2="60" y2="116" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#cfArr)"/>
  <line x1="170" y1="96" x2="170" y2="116" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#cfArr)"/>
  <rect x="16" y="120" width="96" height="32" rx="8" fill="#3b82f6" fill-opacity="0.09" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="26" y="140" font-size="10.5">vpc.yaml</text>
  <rect x="120" y="120" width="96" height="32" rx="8" fill="#3b82f6" fill-opacity="0.09" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="130" y="140" font-size="10.5">alb.yaml</text>
  <text x="252" y="52" font-size="12" font-weight="700" opacity="0.8">2. Cross-stack — khác vòng đời</text>
  <rect x="252" y="62" width="196" height="40" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="264" y="79" font-size="11.5">Stack network (sống lâu)</text>
  <text x="264" y="94" font-size="10" opacity="0.7">Outputs → Export: prod-VpcId</text>
  <line x1="350" y1="102" x2="350" y2="122" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#cfArr)"/>
  <rect x="252" y="126" width="196" height="40" rx="8" fill="#10b981" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="264" y="143" font-size="11.5">Stack app (đổi liên tục)</text>
  <text x="264" y="158" font-size="10" opacity="0.7">Fn::ImportValue prod-VpcId</text>
  <text x="484" y="52" font-size="12" font-weight="700" opacity="0.8">3. StackSet — nhiều account</text>
  <rect x="484" y="62" width="220" height="36" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="496" y="84" font-size="11.5">Account quản trị · 1 template</text>
  <line x1="530" y1="98" x2="530" y2="118" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#cfArr)"/>
  <line x1="600" y1="98" x2="600" y2="118" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#cfArr)"/>
  <line x1="670" y1="98" x2="670" y2="118" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#cfArr)"/>
  <rect x="484" y="122" width="68" height="44" rx="8" fill="#f59e0b" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="494" y="140" font-size="10">acct A</text>
  <text x="494" y="155" font-size="9" opacity="0.65">2 Region</text>
  <rect x="560" y="122" width="68" height="44" rx="8" fill="#f59e0b" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="570" y="140" font-size="10">acct B</text>
  <text x="570" y="155" font-size="9" opacity="0.65">2 Region</text>
  <rect x="636" y="122" width="68" height="44" rx="8" fill="#f59e0b" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="646" y="140" font-size="10">acct mới</text>
  <text x="646" y="155" font-size="9" opacity="0.65">auto-deploy</text>
  <rect x="16" y="196" width="688" height="56" rx="9" fill="#8b5cf6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="30" y="218" font-size="12" font-weight="700">Thứ tự an toàn khi thay đổi</text>
  <text x="30" y="236" font-size="10.5" opacity="0.78">Change set → Stack policy → Rollback khi lỗi → Drift detection · lúc xoá: DeletionPolicy Retain / Snapshot</text>
  <text x="16" y="278" font-size="11" opacity="0.7">Không xoá được stack đang export giá trị mà stack khác đang import — lý do nested stack đôi khi an toàn hơn cross-stack.</text>
</svg>

---

## 8. Elastic Beanstalk — PaaS trên hạ tầng bạn vẫn nhìn thấy

Beanstalk nhận code (JAR/WAR/zip hoặc Dockerfile) và **tự sinh một CloudFormation stack** bên dưới: EC2 + ASG + ELB + security group + alarm. Vòng đời do Beanstalk điều phối; cấu hình sâu qua `.ebextensions` hoặc *saved configuration*. Hai loại environment: **web server** (HTTP qua ELB) và **worker** (daemon đọc job từ SQS).

### 8.1 Deployment policy — bảng phải thuộc

| Cách đưa bản mới lên | Cơ chế | Downtime | Capacity lúc deploy | Instance thêm | Rollback | Khi nào chọn |
|---|---|---|---|---|---|---|
| **All at once** | Deploy đồng loạt mọi instance | **Có** | Về 0 chốc lát | Không | Deploy lại bản cũ | Dev/test, nhanh và rẻ nhất |
| **Rolling** | Theo batch trên fleet hiện tại | Không | **Giảm** (batch bị rút khỏi LB) | Không | Theo batch | Chịu giảm công suất tạm, không tốn thêm tiền |
| **Rolling with additional batch** | Thêm một batch mới trước rồi mới rolling | Không | **Giữ 100%** | Có (tạm) | Theo batch | Production cần đủ capacity, chịu trả thêm ít |
| **Immutable** | ASG tạm với **toàn bộ instance mới**, pass health check mới chuyển sang | Không | Giữ nguyên | Có (gấp đôi tạm) | **Nhanh, sạch** | Production rủi ro cao, đề nói "minimize risk" |
| **Blue/Green (swap CNAME)** | Dựng **environment thứ hai**, test xong thì **swap CNAME** | Không | Giữ nguyên | Cả một environment | Swap ngược, tức thì | Thay đổi lớn/không tương thích, cần test đầy đủ |

Biến thể **traffic splitting**: như immutable nhưng chia một % traffic sang bản mới — chọn khi đề nói "canary".

Lưu ý bảng trên: 5 dòng đầu là **deployment policy** thật sự chọn được trong cấu hình Beanstalk; dòng blue/green thì **không phải deployment policy** (nó là thao tác swap environment URL); RDS nằm **trong** environment sẽ bị xoá theo environment — production luôn để DB **ngoài**.

### 8.2 Beanstalk vs các cách deploy khác

| Lựa chọn | Bạn quản gì | Khi nào chọn | Bẫy |
|---|---|---|---|
| **Elastic Beanstalk** | Code + ít cấu hình | Team dev đẩy app web lên nhanh, vẫn cần thấy EC2, không muốn viết CloudFormation | Ràng buộc platform version; cần managed platform update |
| **ECS / EKS** | Image + task/service definition | App đã container hoá, nhiều service, cần kiểm soát scheduling | Chi phí vận hành cao hơn |
| **Lambda** | Chỉ hàm | Workload sự kiện, trả theo lần gọi | Giới hạn thời gian chạy, không hợp app chạy dài |
| **CloudFormation trực tiếp** | Toàn bộ hạ tầng | Cần kiểm soát từng resource, cần StackSet, versioning hạ tầng | Không lo build/deploy code — ghép thêm CodePipeline |
| **Service Catalog** | Danh mục sản phẩm đóng gói | Cho người dùng cuối tự tạo hạ tầng **đã duyệt** | Không thay IaC — bên dưới vẫn là CloudFormation |

**Service Catalog**: admin đóng gói template CloudFormation thành *product*, gom vào *portfolio*, gắn **launch constraint** (IAM role mà Service Catalog dùng để tạo resource). Người dùng cuối chỉ cần quyền launch product — không có `ec2:RunInstances` nhưng vẫn tạo được instance **đúng khuôn mẫu**, kèm TagOptions áp tag bắt buộc; portfolio chia sẻ được cho cả Organization.

---

## 9. Launch Template vs Launch Configuration

| Tiêu chí | Launch Configuration | Launch Template |
|---|---|---|
| Trạng thái | **Cũ, AWS đã ngừng cho tạo mới**, không nhận instance type mới | Chuẩn hiện tại cho ASG, EC2 Fleet, Spot Fleet |
| Versioning | Không — đổi phải tạo cái mới rồi trỏ ASG sang | **Có**: nhiều version, `$Default`/`$Latest`, rollback bằng cách trỏ version cũ |
| Mixed instances / Spot | Không | **Có** — một ASG trộn nhiều instance type và On-Demand/Spot theo tỉ lệ |
| Tính năng | Thiếu nhiều | Placement group, nhiều ENI, T-unlimited, Dedicated Host, **bắt buộc IMDSv2**, tag theo resource |
| **Khi nào chọn** | Chỉ khi duy trì hệ thống cũ chưa migrate | **Mặc định cho mọi thiết kế mới** |

Đề nói "ASG trộn Spot và On-Demand" hay "bắt buộc IMDSv2 toàn fleet" → loại đáp án còn nhắc Launch Configuration. Đổi AMI: tạo **version mới của Launch Template** rồi **instance refresh** ASG.

---

## 10. Sao lưu: Data Lifecycle Manager vs AWS Backup

**DLM** chuyên cho **EBS**: tạo snapshot EBS (và AMI từ instance EBS-backed) theo lịch, chọn target bằng **tag**, giữ theo **số lượng** hoặc **tuổi**, tự xoá cái cũ, sao chép sang Region khác. DLM không tính phí, nhưng **chỉ biết EBS/AMI** — không đụng RDS, DynamoDB, EFS, FSx, S3.

**AWS Backup** sao lưu tập trung cho nhiều loại tài nguyên (EBS, EC2, RDS/Aurora, DynamoDB, EFS, FSx, DocumentDB, Neptune, Redshift, S3, Storage Gateway, cả VMware on-prem):

- **Backup plan**: các rule (tần suất, cửa sổ backup, thời điểm chuyển cold storage, thời gian giữ) + **resource selection** bằng tag/ARN; **backup vault** chứa recovery point, mã hoá KMS.
- **Vault Lock** giữ dữ liệu kiểu WORM: chế độ **governance** cho người có quyền đặc biệt gỡ; **compliance** thì **không ai gỡ được, kể cả root** — đáp án cho "backup không thể bị xoá kể cả khi credential admin bị chiếm".
- **Cross-Region / cross-account copy** khai báo ngay trong rule; trong Organizations, **backup policy** áp từ management account xuống OU.
- **Backup Audit Manager** báo cáo tuân thủ, **restore testing** chạy thử khôi phục định kỳ.

| Nhu cầu | DLM | AWS Backup | Snapshot thủ công |
|---|---|---|---|
| Chỉ snapshot EBS theo lịch, đơn giản, rẻ | **Chọn** | Được nhưng thừa | Phải tự viết logic xoá |
| Nhiều loại resource (RDS + DynamoDB + EFS + EBS) trong một chính sách | Không làm được | **Chọn** | Không khả thi |
| Bắt buộc lịch backup cho **mọi account trong Organization** | Không | **Chọn** (backup policy) | Không |
| Backup **không thể xoá** cho compliance/ransomware, và báo cáo cho auditor | Không có | **Chọn** — Vault Lock compliance mode + Backup Audit Manager | Không |

---

## 11. Cost — chỗ nào thật sự tốn tiền

| Thành phần | Mô hình tính tiền | Điều cần nhớ |
|---|---|---|
| **Systems Manager** vs **endpoint/NAT** | Năng lực lõi của SSM không tính phí riêng; interface endpoint tính giờ × AZ + GB, NAT Gateway tính giờ + GB | Tiền nằm ở endpoint và ở S3/CloudWatch lưu session log; fleet chỉ cần SSM thì endpoint an toàn hơn và khỏi trả tiền NAT |
| **Parameter Store / Secrets Manager** | Standard miễn phí, Advanced theo parameter/tháng; Secrets Manager theo secret/tháng + API call | Hàng nghìn config → Standard; cache phía app |
| **CloudFormation / Beanstalk / DLM** | Không tính phí dịch vụ | Immutable và blue/green **nhân đôi instance tạm thời**; retention snapshot dài = hoá đơn dài |
| **AWS Backup** | GB lưu (warm/cold), GB restore, copy cross-Region | Cold storage có thời gian lưu tối thiểu, đừng dùng cho backup vòng đời ngắn |

---

## 12. Bẫy thi thường gặp

1. **"Session Manager phải mở port 22"** → Sai, không cần inbound rule nào; tất cả là outbound 443 từ agent.
2. **"Private subnet không NAT thì không dùng được"** → Sai, dùng ba interface endpoint. **"Chỉ cần endpoint `ssm`"** cũng sai: thiếu `ssmmessages` là không mở được session, thiếu `ec2messages` là Run Command không tới.
3. **"Có SSM Agent là instance tự hiện trong managed node"** → Sai nếu thiếu `AmazonSSMManagedInstanceCore`. **"Session Manager tự lưu log phiên"** → Sai, phải chỉ định đích.
4. **"Parameter Store tự rotate mật khẩu RDS"** → Sai, rotation native là của Secrets Manager; ngược lại Secrets Manager cho 5.000 key không nhạy cảm là sai về cost.
5. **"Template phải có Parameters và Outputs"** → Sai, chỉ `Resources` bắt buộc. **"Drift detection tự sửa drift"** → Sai, nó chỉ phát hiện. **"Xoá stack là mất hết dữ liệu"** → Không, nếu `DeletionPolicy: Retain`/`Snapshot`.
6. **"StackSet chỉ deploy nhiều Region trong một account"** → Sai: nhiều account **và** nhiều Region; service-managed còn tự phủ account mới của OU.
7. **"Export sửa lúc nào cũng được"** → Sai, đang bị `Fn::ImportValue` thì không sửa/xoá được.
8. **"Rolling giữ nguyên capacity"** → Sai; muốn đủ capacity phải là **rolling with additional batch** hoặc immutable.
9. **"Blue/green là một deployment policy của Beanstalk"** → Sai, nó là swap CNAME. **"Immutable đắt nên không dùng cho prod"** → Ngược lại, nó rollback nhanh nhất.
10. **"Launch Configuration vẫn ổn"** → Thiết kế mới luôn chọn **Launch Template**.
11. **"DLM backup được RDS"** → Sai, DLM là EBS/AMI. **"Vault Lock governance mode không ai xoá được"** → Sai, **compliance mode** mới bất khả gỡ.
12. **"Service Catalog thay CloudFormation"** → Sai, nó **bọc** CloudFormation. **"Patch Manager vá lỗ hổng code app"** → Sai, nó vá OS/package.

---

## 13. Tóm tắt 1 dòng

> **Vận hành** = Systems Manager: Session Manager thay bastion (agent + `AmazonSSMManagedInstanceCore` + 3 endpoint), Run Command một lần / State Manager lặp lại, Patch Manager theo baseline + maintenance window, Automation ở tầng API, Inventory để biết mình có gì, Parameter Store rẻ còn Secrets Manager rotate. **Dựng lại** = CloudFormation (chỉ `Resources` bắt buộc, change set trước update, DeletionPolicy trước xoá, StackSet phủ nhiều account), Beanstalk cho app web, Service Catalog để phát hành có kiểm soát, Launch Template thay Launch Configuration. **Giữ lại** = DLM cho EBS, AWS Backup cho phần còn lại (Vault Lock compliance = bất khả xoá).

---

## 14. Bài tập tự kiểm tra

1. Fleet 300 EC2 trong private subnet **không NAT**. Ops cần shell và chạy script hàng loạt. Liệt kê đủ mọi thứ phải cấu hình, nói rõ endpoint nào phục vụ gì.
2. App đọc 4.000 khoá cấu hình và 6 credential database phải xoay vòng 30 ngày/lần. Phân bổ vào Parameter Store và Secrets Manager thế nào, vì sao?
3. Organizations 40 account, thường xuyên thêm account mới. Mọi account kể cả account tương lai phải có IAM role audit và bật AWS Config ở hai Region. Thiết kế bằng gì, mô hình quyền nào?
4. Stack `network` export `prod-VpcId`, stack `app` import. Team muốn xoá `network` để dựng lại VPC — điều gì xảy ra, hai cách tổ chức lại template để tránh?
5. Beanstalk production 20 instance: không giảm capacity lúc deploy, lỗi thì rollback trong vài phút. So sánh rolling with additional batch, immutable và blue/green — chọn gì, đánh đổi gì?
6. Compliance: snapshot EBS mỗi 12 giờ giữ 14 ngày; backup RDS và DynamoDB giữ 7 năm **không ai xoá được kể cả admin**; bản sao ở account khác. Dùng service nào cho từng phần?

---

## 15. Đọc thêm

- *Systems Manager User Guide*: "Setting up Session Manager", "Improve security of EC2 instances by using VPC endpoints".
- *CloudFormation User Guide*: "Template anatomy", "StackSets concepts", "DeletionPolicy attribute", "Detecting unmanaged configuration changes".
- *Elastic Beanstalk Developer Guide*: "Deployment policies and settings", "Blue/green deployments".
- *Amazon Data Lifecycle Manager*; *AWS Backup Developer Guide* — "Vault Lock", "Backup policies in AWS Organizations".
- Well-Architected **Operational Excellence Pillar**; Builder's Library — *Ensuring rollback safety during deployments*.


---

**Tiếp theo**: [[ch2-07-hybrid-connectivity]] — Direct Connect, Site-to-Site VPN và Transit Gateway.
