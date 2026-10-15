# SAA Ch3.6 — Operations & Infrastructure as Code

> Mục tiêu: Đọc đề dạng "vận hành fleet EC2 trong private subnet, không mở port 22, không có NAT" hoặc "deploy cùng một stack sang 40 account" là chọn đúng service — Systems Manager, CloudFormation/StackSets, Elastic Beanstalk, Launch Template, DLM hay AWS Backup — và biết **điều kiện hạ tầng** nào phải có thì lựa chọn đó mới chạy.

Tiền đề: [[ch3-01-iam-deep-dive]], [[ch3-05-multi-account-governance]], [[ch3-02-network-security]], [[resilient-02-ha-fault-tolerance]].

---

## 1. Câu chuyện mở đầu — "Bastion host chết, 200 instance thành hộp đen"

2h sáng, on-call cần vào một EC2 trong private subnet đọc log vì app trả 502. Đường vào duy nhất: một bastion t3.micro có Elastic IP, security group mở 22 cho dải IP văn phòng, key `prod-2019.pem` nằm trên Google Drive chung. Sáng đó bastion bị terminate vì "instance không tag". Hệ quả: không ai vào được 200 instance phía sau, và CloudTrail chỉ thấy `TerminateInstances` chứ không có phiên SSH nào.

Fix đúng không phải "dựng lại bastion cho HA" mà là **bỏ hẳn đường SSH**: Session Manager mở shell qua API AWS, xác thực bằng IAM, ghi log phiên, instance **không cần inbound port, không cần public IP**. Đổi lại nó có một danh sách điều kiện hạ tầng — và chính danh sách đó là thứ đề hỏi nhiều nhất.

---

## 2. Bức tranh: ba trục của mảng Operations

"Operations" trong đề SAA không phải một dịch vụ mà là ba nhóm việc bạn làm **sau khi** hệ thống đã lên: chăm cái đang chạy, dựng lại nó ở chỗ khác khi cần, và giữ bản sao dữ liệu của nó. Mỗi nhóm có một bộ dịch vụ riêng, và bài này đi lần lượt theo đúng thứ tự đó (§3–5, §6–9, §10).

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

Một **interface VPC endpoint** là một card mạng (ENI) có IP private mà AWS đặt vào subnet của bạn; gói tin gửi tới IP đó đi thẳng vào dịch vụ AWS trên mạng nội bộ của AWS (công nghệ này tên là PrivateLink), không ra internet. **Private DNS** làm cho tên miền công khai `ssm.<region>.amazonaws.com` phân giải ra IP private đó khi hỏi từ trong VPC, nên agent không phải cấu hình gì thêm. Mỗi dịch vụ cần một endpoint riêng, vì vậy mới có tới ba cái:

| Endpoint | Dùng cho |
|---|---|
| `ssm` | API điều khiển: đăng ký node, nhận document, báo trạng thái |
| `ssmmessages` | Kênh dữ liệu của **Session Manager** (shell, port forwarding) |
| `ec2messages` | Kênh agent nhận **Run Command** / job từ service |

Thêm tuỳ tính năng: gateway endpoint **`s3`** (session log / Run Command output, Patch Manager lấy patch), **`kms`** (mã hoá session), **`logs`** (CloudWatch Logs).

**Tính thử tiền endpoint** (us-east-1, ~$0,01/giờ cho mỗi endpoint ở mỗi AZ, ~$0,01/GB đi qua), với fleet trải trên 2 AZ:

```
3 endpoint × 2 AZ × $0,01/giờ × 730 giờ   ≈ $43,80/tháng  (+ $0,01 mỗi GB)
1 NAT Gateway:  $0,045/giờ × 730 giờ      ≈ $32,85/tháng  (+ $0,045 mỗi GB)
2 NAT Gateway (mỗi AZ một cái cho HA)     ≈ $65,70/tháng  (+ $0,045 mỗi GB)
```

Tức là endpoint **không hẳn rẻ hơn** một NAT Gateway đơn lẻ. Lý do đề chọn endpoint là bảo mật: instance chỉ tới được đúng mấy dịch vụ AWS đó chứ không ra được internet, đúng với yêu cầu "no internet access".

### 3.3 Session Manager vs bastion vs Instance Connect

Có ba cách để lấy được một shell trên EC2. **Bastion host** là một EC2 đặt ở public subnet làm trạm trung chuyển: bạn SSH vào nó rồi từ nó SSH tiếp vào máy private. **EC2 Instance Connect** vẫn là SSH, chỉ khác ở chỗ thay vì giữ file `.pem` lâu dài, bạn gọi một API để AWS đặt một public key tạm vào instance trong 60 giây, đủ để mở phiên. **Session Manager** thì bỏ hẳn SSH như §3.1 đã mô tả.

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

Session Manager cho **một người** vào **một máy**. Phần còn lại của Systems Manager trả lời câu hỏi lớn hơn: làm cùng một việc trên 300 máy mà không ai phải đăng nhập vào máy nào. Tất cả đều chạy trên cùng kênh agent ở §3, nên cùng bốn điều kiện đó — máy nào chưa là *managed node* (node mà Systems Manager nhìn thấy và điều khiển được) thì không tính năng nào dưới đây với tới.

### 5.1 Run Command và State Manager — chạy một lần và giữ cho luôn đúng

Cả hai đều chạy một **SSM Document**: file JSON/YAML mô tả các bước cần làm trên máy. AWS có sẵn hàng trăm document, hai cái hay gặp là `AWS-RunShellScript` (Linux) và `AWS-RunPowerShellScript` (Windows) — bạn chỉ việc truyền đoạn script vào.

**Run Command** chạy document đó **một lần** trên nhiều node cùng lúc. Bạn chọn đích bằng instance-id hoặc bằng **tag** (ví dụ mọi máy có `Env=prod`), và đặt hai cái phanh:

- `MaxConcurrency`: tối đa bao nhiêu node chạy cùng lúc, ghi bằng số hoặc phần trăm.
- `MaxErrors`: bao nhiêu node lỗi thì dừng, không gửi lệnh cho các node còn lại nữa.

```
Fleet 300 node, MaxConcurrency = 10%, MaxErrors = 5
→ mỗi đợt chạy trên 30 node; node nào xong thì node kế tiếp vào thay
→ tới node lỗi thứ 6 thì Systems Manager ngừng phát lệnh cho phần còn lại
```

Đó chính là câu đề hay mô tả: "chạy 10% fleet trước, dừng nếu quá 5 node lỗi". Không cần SSH, và ai chạy lệnh gì được ghi vào CloudTrail.

**State Manager** là bản "lặp lại". Bạn tạo một *association* gồm ba thứ: document, tập node đích và lịch chạy. Systems Manager áp document đó định kỳ để giữ **trạng thái mong muốn**, ví dụ CloudWatch agent luôn được cài, file cấu hình luôn đúng bản. Nếu ai đó sửa tay trên máy thì lần chạy kế tiếp kéo về như cũ; máy mới sinh ra khớp tag cũng tự được áp.

Cách phân biệt nhanh: việc làm một lần (restart service, gom log ngay bây giờ) là Run Command; việc phải **luôn đúng** kể cả với máy sẽ sinh ra tuần sau là State Manager.

### 5.2 Patch Manager — vá hệ điều hành theo quy tắc và theo giờ

Patch Manager tự động hoá việc cài bản vá cho **hệ điều hành và các package cài qua trình quản lý gói** (yum, apt, Windows Update). Nó trả lời ba câu hỏi, mỗi câu bằng một khái niệm:

**Vá cái gì? — Patch baseline.** Baseline là bộ quy tắc duyệt patch: loại nào (Security, Bugfix…), mức nghiêm trọng nào (Critical, Important…), và **chờ bao nhiêu ngày sau khi patch phát hành** rồi mới tự duyệt. Khoảng chờ đó để người khác vấp lỗi của bản vá trước mình. Ngoài quy tắc chung còn có danh sách approve và reject tường minh cho từng patch cụ thể.

**Máy nào dùng baseline nào? — Patch group.** Gắn cho instance một tag có khoá **`Patch Group`** (hoặc `PatchGroup` viết liền, bắt buộc dùng dạng này nếu instance bật tính năng đọc tag qua instance metadata), giá trị là tên nhóm do bạn đặt. Rồi đăng ký tên nhóm đó với một baseline. Instance không có tag này thì dùng baseline mặc định của hệ điều hành.

**Vá lúc nào? — Maintenance window.** Một khung giờ lặp lại (cron) mà trong đó Systems Manager được phép tác động lên máy. Nó có *duration* (dài bao lâu) và *cutoff* (còn bao nhiêu giờ trước khi hết khung thì thôi không khởi động task mới, để task đang chạy kịp xong).

Ghép ba thứ lại cho một hệ thống thật:

```
Tag instance          Baseline                                    Maintenance window
Patch Group = dev     Security + Bugfix, mọi mức, duyệt sau 0 ngày   hằng ngày 02:00, dài 2 giờ
Patch Group = prod    Security mức Critical/Important, sau 7 ngày    Chủ nhật 02:00, dài 3 giờ, cutoff 1 giờ

→ một bản vá Critical phát hành thứ Hai: dev nhận ngay đêm đó,
  prod nhận vào Chủ nhật tuần sau (Chủ nhật đầu tiên mới qua 6 ngày, chưa đủ 7)
```

Mỗi lần chạy chọn một trong hai chế độ. **Scan** chỉ so máy với baseline rồi báo cáo máy nào thiếu patch nào (compliance), không đổi gì trên máy. **Install** cài các patch còn thiếu và có thể reboot.

> Patch Manager **không** vá thư viện trong code ứng dụng (một gói npm hay một file JAR có lỗ hổng). Việc tìm loại lỗ hổng đó là của Amazon Inspector.

### 5.3 Automation — runbook chạy ở tầng API

Run Command chạy lệnh **bên trong hệ điều hành** của một máy. Có những việc không nằm trong máy nào cả: tạo AMI, stop/start instance, đổi security group, cập nhật AMI trong Launch Template. Đó là các lời gọi **API AWS**, và **Automation** là công cụ xâu chuỗi chúng thành một *runbook* (document loại Automation) gồm nhiều bước, có rẽ nhánh và có bước chờ người duyệt.

Ví dụ runbook "làm AMI vàng hằng tháng": khởi động instance từ AMI cũ, gọi Run Command để vá, tạo AMI mới, tắt instance, ghi AMI ID mới vào Parameter Store.

Điểm thi quan trọng nhất: **AWS Config remediation gọi SSM Automation**. Config chỉ *phát hiện* tài nguyên sai cấu hình; muốn *tự sửa* thì gắn cho rule một runbook Automation. "Phát hiện security group mở 22 ra `0.0.0.0/0` rồi tự đóng lại" = Config rule + Automation runbook.

### 5.4 Inventory và server on-prem

**Inventory** cho agent thu thập định kỳ thông tin *về* máy: danh sách package và phiên bản, cấu hình mạng, service đang chạy, bản cập nhật Windows. Nó không thu nội dung file hay dữ liệu ứng dụng. Mặc định dữ liệu này nằm riêng theo từng account và Region; **resource data sync** là tính năng đổ tất cả về **một S3 bucket trung tâm**, từ đó query bằng Athena (dịch vụ chạy SQL trực tiếp trên file S3). Đây là đáp án cho câu "làm sao biết trong 40 account còn server nào chạy OpenSSL bản cũ".

Systems Manager cũng quản được máy **không phải EC2**: server on-prem, VM ở cloud khác. Máy đó không có instance profile để lấy quyền IAM, nên bạn tạo một **hybrid activation**: Systems Manager cấp một cặp *activation code + activation ID*, bạn cài SSM Agent lên server rồi đăng ký bằng cặp mã đó. Từ đó server hiện ra như một managed node với id bắt đầu bằng **`mi-`** (EC2 thì bắt đầu bằng `i-`), dùng chung Run Command, Patch Manager, Inventory với fleet trên AWS.

### 5.5 Parameter Store vs Secrets Manager

Hai dịch vụ này cùng giải một bài toán: đưa cấu hình và bí mật **ra khỏi code và khỏi AMI**, để app đọc lúc chạy bằng một lời gọi API có kiểm soát IAM. Khác nhau ở chỗ Parameter Store là kho key–value đa dụng, còn Secrets Manager chuyên cho bí mật cần **xoay vòng** (rotation — tự đổi mật khẩu định kỳ ở cả phía kho lẫn phía database).

| Tiêu chí | Parameter Store | Secrets Manager |
|---|---|---|
| Kiểu & kích thước | String, StringList, **SecureString** (KMS); Standard 4 KB, Advanced 8 KB | Chuỗi hoặc JSON, luôn mã hoá, dung lượng lớn hơn |
| Số lượng / giá | Standard: 10.000 parameter/Region/account, **miễn phí**; Advanced theo parameter/tháng | Theo **secret/tháng** + lượng API call |
| Rotation tự động | **Không có sẵn** — tự viết Lambda + EventBridge | **Có sẵn**, blueprint cho RDS/Redshift/DocumentDB, xoay luôn credential trong DB |
| Cross-account / multi-Region | Không sẵn | Resource policy cross-account, **replicate multi-Region** |
| Tính năng phụ | Hierarchy `/app/prod/db/url`, version, **parameter policy** (expiration, notification) ở tier Advanced | Staging label `AWSCURRENT`/`AWSPENDING` |
| **Khi nào chọn** | Config hoặc bí mật **không cần rotate tự động**; cần **chi phí gần 0**; nhiều key dạng cây | Bắt buộc rotate định kỳ theo compliance, credential database, chia sẻ cross-account |
| Bẫy | "Parameter Store tự rotate password RDS" là **sai** | Dùng cho 5.000 feature flag: đúng kỹ thuật nhưng **sai về cost** |

**Tính thử** cho một app có 4.000 khoá cấu hình và 6 credential database phải xoay 30 ngày một lần (giá us-east-1: Secrets Manager ~$0,40/secret/tháng, Parameter Store Advanced ~$0,05/parameter/tháng, Standard không tính phí):

```
Cách đúng:  4.000 khoá → Parameter Store Standard (dưới trần 10.000)   = $0
            6 credential → Secrets Manager: 6 × $0,40                   = $2,40/tháng

Cách sai:   nhét cả 4.006 thứ vào Secrets Manager: 4.006 × $0,40        ≈ $1.602/tháng
```

Chênh nhau hơn 600 lần cho cùng một kết quả, chưa kể cả hai phía đều tính ~$0,05 cho mỗi 10.000 lời gọi API (Parameter Store Standard ở mức throughput mặc định thì miễn phí). Trần 10.000 của Standard là **mỗi account mỗi Region**; vượt thì lên Advanced với trần 100.000.

---

## 6. CloudFormation — mô tả hạ tầng bằng template

**Infrastructure as Code (IaC)** nghĩa là hạ tầng được viết thành file văn bản để máy đọc và dựng, thay vì bấm tay trên console. CloudFormation là dịch vụ IaC của AWS: bạn viết một **template** (YAML hoặc JSON) khai báo *muốn có những tài nguyên nào*, nộp cho CloudFormation, và nó tạo ra một **stack** — tập tài nguyên thật được quản như một khối, tạo cùng nhau, sửa cùng nhau, xoá cùng nhau.

Điểm khác với một shell script gọi AWS CLI: template là **khai báo** chứ không phải chuỗi lệnh. Bạn không viết "tạo security group rồi tạo instance"; bạn mô tả trạng thái cuối, CloudFormation tự suy ra thứ tự từ các tham chiếu giữa tài nguyên, và khi bạn sửa template nó tự tính phần chênh lệch cần thay đổi.

### 6.1 Giải phẫu template

Một template nhỏ nhưng đủ gần hết các section, dựng một web server kèm security group:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Web server + security group

Parameters:                      # input, hỏi lúc tạo stack
  Env:
    Type: String
    AllowedValues: [dev, prod]
  VpcId:
    Type: AWS::EC2::VPC::Id
  SubnetId:
    Type: AWS::EC2::Subnet::Id

Mappings:                        # bảng tra tĩnh
  RegionAmi:
    us-east-1:      { Ami: ami-0aaa1111bbbb2222c }
    ap-southeast-1: { Ami: ami-0ddd3333eeee4444f }

Conditions:                      # biểu thức đúng/sai
  IsProd: !Equals [!Ref Env, prod]

Resources:                       # tài nguyên thật
  WebSg:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: !Sub 'web-${Env} in ${AWS::Region}'
      VpcId: !Ref VpcId
  Web:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: !FindInMap [RegionAmi, !Ref 'AWS::Region', Ami]
      InstanceType: !If [IsProd, m5.large, t3.micro]
      SubnetId: !Ref SubnetId
      SecurityGroupIds: [!GetAtt WebSg.GroupId]

Outputs:                         # giá trị trả ra sau khi tạo xong
  WebPrivateIp:
    Value: !GetAtt Web.PrivateIp
  WebSgId:
    Value: !GetAtt WebSg.GroupId
    Export:
      Name: !Sub '${Env}-WebSgId'
```

`WebSg` và `Web` là **logical ID** — tên do bạn đặt, chỉ có nghĩa trong template. Tài nguyên thật mà AWS tạo ra có **physical ID** riêng (`sg-0abc…`, `i-0def…`). Các hàm dưới đây là cách nối hai thế giới đó:

- **`Ref`** trả về "giá trị định danh mặc định" của thứ được trỏ tới. `!Ref Env` trả giá trị người dùng nhập (`prod`); `!Ref Web` trả instance ID (`i-0def…`).
- **`Fn::GetAtt`** lấy **một thuộc tính khác** của tài nguyên mà `Ref` không trả về. `!GetAtt Web.PrivateIp` trả `10.0.1.25`; `!GetAtt WebSg.GroupId` trả ID của security group. Quy tắc nhớ: cần ID/tên thì thử `Ref` trước, cần ARN, IP, DNS name, endpoint thì gần như chắc chắn là `GetAtt`.
- **`Fn::Sub`** thay biến vào một chuỗi: `'web-${Env}'` thành `web-prod`.
- **`Fn::FindInMap`** tra bảng `Mappings`. Ở trên nó lấy AMI ID theo Region đang deploy, vì AMI ID mỗi Region một khác.
- **`Fn::If`** chọn một trong hai giá trị theo một `Condition`: prod dùng `m5.large`, còn lại `t3.micro`.
- **`Fn::ImportValue`** đọc một giá trị mà **stack khác** đã `Export` (xem §6.3).

`AWS::Region` trong template là một **pseudo parameter**: biến có sẵn, CloudFormation tự điền. Hay gặp nhất là `AWS::Region`, `AWS::AccountId`, `AWS::StackName`. Nhờ chúng mà cùng một template deploy được ở nhiều account và Region mà không phải hardcode gì.

Cũng để ý `Web` tham chiếu `WebSg`: nhờ đó CloudFormation biết phải tạo security group **trước** instance, và khi xoá stack thì xoá theo thứ tự ngược lại. Bạn không khai báo thứ tự ở đâu cả.

Sau khi đã thấy template, bảng các section mới có nghĩa:

| Section | Vai trò | Bắt buộc |
|---|---|---|
| `AWSTemplateFormatVersion`, `Description`, `Metadata` | Phiên bản, mô tả, dữ liệu phụ | Không |
| `Parameters` | Input lúc tạo/update: `AllowedValues`, `NoEcho` cho mật khẩu, type đọc thẳng từ SSM Parameter Store | Không |
| `Mappings` / `Conditions` / `Transform` | Bảng tra tĩnh (Region → AMI ID, qua `Fn::FindInMap`), logic bật/tắt resource theo môi trường, và macro (`AWS::Serverless` chính là SAM) | Không |
| **`Resources`** | Khai báo tài nguyên thật | **Có** |
| `Outputs` | Giá trị trả ra; thêm `Export` để stack khác `Fn::ImportValue` | Không |

**`Resources` là section DUY NHẤT bắt buộc** — đề hỏi thẳng mệnh đề này. Một template chỉ có `Resources:` với một S3 bucket là hợp lệ. Hai chi tiết nhỏ trong bảng: `NoEcho: true` làm giá trị parameter hiện thành `*****` trên console và trong API (dùng cho mật khẩu); còn `Transform` bảo CloudFormation chạy template qua một bộ xử lý trước khi dựng — SAM dùng cơ chế này để nở vài dòng `AWS::Serverless::Function` thành Lambda + IAM role + API Gateway đầy đủ.

### 6.2 Cơ chế an toàn

Sửa hạ tầng production bằng một file văn bản thì một dòng sai có thể xoá một database. CloudFormation có một dãy cơ chế chặn ở từng thời điểm: trước khi update, trong khi update, khi xoá, và sau khi ai đó sửa tay.

**Trước khi update — Change set.** Thay vì áp template mới ngay, bạn tạo một *change set*: CloudFormation so template mới với stack đang chạy rồi liệt kê tài nguyên nào sẽ được **Add**, **Modify** hay **Remove**, mà chưa đụng vào gì. Cột cần đọc kỹ nhất là **Replacement**. Có những thuộc tính không sửa tại chỗ được (đổi tên một RDS instance, đổi AZ của một EBS volume), nên CloudFormation phải **tạo tài nguyên mới rồi xoá cái cũ**. `Replacement: True` trên một database nghĩa là bạn sắp có một database mới trống rỗng. Xem xong mới bấm *Execute*.

**Trong khi update — Stack policy.** Đây là một tài liệu JSON gắn vào stack, quy định tài nguyên nào **được phép bị update**. Nó trông giống IAM policy:

```json
{
  "Statement": [
    { "Effect": "Allow", "Action": "Update:*", "Principal": "*", "Resource": "*" },
    { "Effect": "Deny",  "Action": ["Update:Replace", "Update:Delete"],
      "Principal": "*",  "Resource": "LogicalResourceId/ProdDatabase" }
  ]
}
```

Policy trên cho update mọi thứ, trừ việc replace hay xoá tài nguyên có logical ID `ProdDatabase`. Một khi stack đã có stack policy thì mặc định **mọi** tài nguyên bị khoá, nên luôn phải có câu `Allow` tường minh. Khác với IAM ở chỗ nó không hỏi "ai đang làm": nó áp cho mọi người update stack, kể cả admin, và chỉ có tác dụng với thao tác *update stack*. Nó không ngăn ai đó xoá database bằng console RDS, cũng không ngăn xoá cả stack (việc đó là của *termination protection*). AWS mô tả nó là chốt an toàn chống lỡ tay chứ không phải kiểm soát truy cập: người có quyền `SetStackPolicy` vẫn truyền được một policy ghi đè tạm thời cho một lần update.

**Khi update lỗi — Rollback.** Nếu một tài nguyên tạo hoặc sửa thất bại giữa chừng, CloudFormation tự đưa stack về **cấu hình** trước đó: xoá những thứ vừa tạo, trả thuộc tính đã sửa về giá trị cũ. Stack kết thúc ở trạng thái `UPDATE_ROLLBACK_COMPLETE`. Với tài nguyên bị replace, bản cũ chỉ bị xoá ở bước dọn dẹp cuối cùng khi mọi thứ đã thành công, nên rollback đơn giản là quay lại dùng bản cũ.

> Rollback khôi phục **cấu hình tài nguyên**, không khôi phục **dữ liệu bên trong**. Nếu bản deploy lỗi đã kịp chạy một migration xoá cột trong database thì rollback của CloudFormation không trả lại cột đó. Muốn có lại dữ liệu thì phải có snapshot/backup (§10).

**Khi xoá — `DeletionPolicy`.** Đây là một thuộc tính đặt trên từng resource, quyết định số phận của nó khi stack bị xoá (hoặc khi bạn gỡ nó khỏi template):

| Giá trị | Chuyện gì xảy ra | Dùng cho |
|---|---|---|
| `Delete` | Xoá tài nguyên. Đây là **mặc định** cho hầu hết loại tài nguyên | Thứ dựng lại được: EC2, ALB, security group |
| **`Retain`** | Stack biến mất nhưng tài nguyên **ở lại** nguyên vẹn, vẫn tính tiền, từ đó bạn tự quản. Dùng được cho mọi loại tài nguyên | S3 bucket chứa dữ liệu, database production |
| **`Snapshot`** | Chụp một snapshot rồi mới xoá tài nguyên | Chỉ loại có snapshot: EBS volume, RDS, Aurora, Redshift, ElastiCache, Neptune, DocumentDB |

```yaml
  ProdDatabase:
    Type: AWS::RDS::DBInstance
    DeletionPolicy: Snapshot
    UpdateReplacePolicy: Snapshot
```

`DeletionPolicy` **không** áp cho trường hợp tài nguyên bị *replace* trong lúc update (cái `Replacement: True` ở trên). Trường hợp đó do thuộc tính anh em **`UpdateReplacePolicy`** quyết định, với cùng ba giá trị. Vì vậy tài nguyên chứa dữ liệu thường khai cả hai như ví dụ.

> Ngoại lệ của mặc định `Delete`: `AWS::RDS::DBCluster` và `AWS::RDS::DBInstance` đứng riêng (không thuộc cluster) có mặc định là `Snapshot`. Đề thi thường chỉ cần "mặc định là Delete, muốn giữ thì Retain hoặc Snapshot". Còn một chi tiết: S3 bucket phải **rỗng** thì CloudFormation mới xoá được, nếu không thao tác xoá stack sẽ lỗi.

**Sau khi ai đó sửa tay — Drift detection.** *Drift* là độ lệch giữa cái template mô tả và cái đang thật sự chạy, sinh ra khi có người sửa tài nguyên ngoài CloudFormation (thêm một rule vào security group bằng console chẳng hạn). Bạn bấm *Detect drift*, CloudFormation đọc cấu hình thật của từng tài nguyên, so với template và gắn nhãn `IN_SYNC`, `MODIFIED` hoặc `DELETED`, kèm thuộc tính nào khác. Nó **chỉ báo cáo, không tự sửa**. Sửa drift là việc của bạn: update stack để ghi đè lại, hoặc đưa thay đổi vào template. Muốn drift không xảy ra từ đầu thì chặn quyền sửa tay bằng IAM hoặc SCP.

**Chờ app sẵn sàng — `CreationPolicy` và `cfn-signal`.** Với CloudFormation, một EC2 instance "tạo xong" ngay khi máy ảo bật lên, dù script cài đặt trong user data còn chạy thêm 10 phút hoặc đã chết giữa chừng. `CreationPolicy` bảo CloudFormation **chưa đánh dấu `CREATE_COMPLETE`** cho tới khi nhận đủ số tín hiệu thành công trong thời hạn cho phép (ví dụ `Timeout: PT15M`, tức 15 phút). Tín hiệu do script **`cfn-signal`** gửi đi: bạn gọi nó ở cuối user data, kèm exit code của bước cài đặt. Hết giờ mà chưa có tín hiệu, hoặc tín hiệu báo lỗi, thì tài nguyên bị coi là tạo thất bại và stack rollback.

**Cập nhật Auto Scaling group — `UpdatePolicy`.** Khi bạn đổi Launch Template của một ASG trong template, mặc định các instance đang chạy **không bị đụng tới**; chỉ instance sinh ra sau mới theo cấu hình mới. `UpdatePolicy` trên resource ASG bảo CloudFormation thay luôn instance cũ, theo kiểu rolling (từng lô, giữ tối thiểu bao nhiêu instance phục vụ) hoặc kiểu replacing (dựng hẳn ASG mới rồi đổi sang).

Bản thân CloudFormation **không tính phí**; bạn trả tiền cho tài nguyên nó tạo ra.

### 6.3 Nested vs cross-stack vs StackSet

Một stack duy nhất chứa mọi thứ sẽ tới lúc quá to: update chậm, mỗi lần sửa app là đụng tới file có cả VPC lẫn database. Có ba cách tách, mỗi cách giải một bài toán khác nhau.

**Nested stack** giải bài toán **lặp lại**. Bạn viết đoạn "VPC chuẩn" thành một template riêng, đặt lên S3, rồi trong template cha khai một resource kiểu `AWS::CloudFormation::Stack` trỏ tới file đó. Stack con là một *resource* của stack cha: tạo, update, xoá đều đi qua cha. Mười ứng dụng dùng chung một `vpc.yaml` thì có mười bản VPC độc lập sinh ra từ cùng một khuôn.

**Cross-stack reference** giải bài toán **khác vòng đời**. Stack `network` (VPC, subnet) tạo một lần và sống nhiều năm; stack `app` deploy mỗi ngày. Hai stack hoàn toàn độc lập, chỉ nối với nhau bằng giá trị: `network` khai `Export: prod-VpcId` trong `Outputs`, `app` đọc bằng `Fn::ImportValue prod-VpcId`. Ở đây chỉ có **một** VPC, nhiều stack dùng chung. Đổi lại, CloudFormation khoá giá trị đang được dùng: chừng nào còn stack import `prod-VpcId` thì bạn **không sửa được, không xoá được** export đó, và do vậy không xoá được stack `network`. Phải gỡ import ở mọi stack tiêu thụ trước.

Nếu ràng buộc đó gây khó (VPC cần dựng lại thường xuyên), có hai cách tổ chức khác: gom network và app vào quan hệ cha–con bằng nested stack để chúng được update cùng nhau, hoặc để stack `network` ghi VPC ID vào SSM Parameter Store và stack `app` nhận nó qua một `Parameter` kiểu SSM. Cách sau là nối lỏng: không còn khoá cứng, đổi lại CloudFormation không còn cản bạn xoá thứ đang có người dùng.

**StackSet** giải bài toán **nhiều account, nhiều Region**. Một stack thường chỉ sống trong một account và một Region. StackSet cho bạn đứng ở một *administrator account*, đưa một template, chỉ định danh sách account và Region đích, và nó tạo ra ở mỗi cặp (account, Region) một stack giống nhau, gọi là *stack instance*.

```
40 account × 2 Region = 80 stack instance, quản bằng một StackSet
sửa template một lần → cả 80 stack được update
```

| Cách | Cơ chế | Khi nào chọn | Bẫy |
|---|---|---|---|
| **Nested stack** | `AWS::CloudFormation::Stack` trỏ tới template con trên S3 | Tái sử dụng **component** (VPC chuẩn, ALB chuẩn) trong nhiều stack cha | Update phải qua stack cha; template con phải ở S3 |
| **Cross-stack reference** | Stack A `Export`, stack B `Fn::ImportValue` | Chia theo **vòng đời**: network sống lâu, app đổi liên tục | Tên export duy nhất trong account+Region; **không sửa/xoá được output đang bị import** |
| **StackSet** | Một template → **nhiều account × nhiều Region** | Chuẩn hoá org: bật Config/GuardDuty, tạo IAM role, VPC baseline mọi account | Phải chọn đúng mô hình quyền |
| **Stack đơn** | Một stack, một account, một Region | App nhỏ, độc lập | Phình to thì update chậm và rủi ro |

**Hai mô hình quyền của StackSet.** Để tạo tài nguyên trong account *khác*, CloudFormation ở administrator account phải assume một IAM role trong account đích. Câu hỏi là ai tạo role đó.

- **Self-managed**: bạn tự tạo. Cần **hai** role vì có hai đầu của một quan hệ tin cậy cross-account. Ở administrator account là `AWSCloudFormationStackSetAdministrationRole`, role mà dịch vụ CloudFormation dùng, có quyền `sts:AssumeRole` sang account đích. Ở **mỗi** account đích là `AWSCloudFormationStackSetExecutionRole`, role tin administrator account và có quyền thật sự tạo tài nguyên. Thêm account mới thì phải tự vào đó tạo execution role trước. Mô hình này dùng khi **không có AWS Organizations**, hoặc account đích nằm ngoài organization.
- **Service-managed**: bật *trusted access* giữa StackSets và AWS Organizations, từ đó StackSets **tự tạo role** trong các account thành viên. Đích không còn là danh sách account mà là **OU** (organizational unit — một nhóm account trong Organizations). Bật thêm **automatic deployment** thì account nào **mới gia nhập OU sẽ tự nhận stack**, và account rời OU thì stack được gỡ (hoặc giữ lại, tuỳ bạn chọn).

Service-managed + automatic deployment là đáp án cho câu "mọi account, kể cả account tạo sau này, phải có baseline mà không ai thao tác thủ công".

**Operation preferences** là mấy cái phanh khi rải một thay đổi ra hàng chục account, cùng ý tưởng với `MaxConcurrency`/`MaxErrors` ở §5.1:

- *Maximum concurrent accounts*: chạy cùng lúc trên bao nhiêu account, tính trong một Region.
- *Failure tolerance*: bao nhiêu stack lỗi **trong một Region** thì dừng cả operation và không đi tiếp sang Region sau.
- *Region order* và *Region concurrency*: mặc định đi **tuần tự** từng Region theo thứ tự bạn xếp; có thể chọn song song.

```
10 account × 2 Region, Maximum concurrent accounts = 50%, Failure tolerance = 20%
→ Region thứ nhất: 5 account, rồi 5 account còn lại; xong mới sang Region thứ hai
→ trong một Region được lỗi tối đa 2 stack; stack lỗi thứ 3 thì dừng, bỏ qua Region còn lại
```

Xếp Region ít quan trọng lên đầu, đặt failure tolerance thấp, là cách để một template lỗi chỉ làm hỏng vài account thay vì cả tổ chức.

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

Khi bạn đẩy một phiên bản code mới lên environment đang có N instance phục vụ khách, Beanstalk phải thay code trên N máy đó theo một thứ tự nào đó. Thứ tự ấy gọi là **deployment policy**, và mọi lựa chọn là sự đánh đổi giữa ba thứ: có **downtime** không, **capacity** (số instance đang nhận traffic) tụt bao nhiêu trong lúc deploy, và khi bản mới lỗi thì **quay lại** nhanh cỡ nào. Từ "batch" trong bảng là một lô instance được xử lý cùng lúc, kích thước do bạn đặt bằng số máy hoặc phần trăm.

| Cách đưa bản mới lên | Cơ chế | Downtime | Capacity lúc deploy | Instance thêm | Rollback | Khi nào chọn |
|---|---|---|---|---|---|---|
| **All at once** | Deploy đồng loạt mọi instance | **Có** | Về 0 chốc lát | Không | Deploy lại bản cũ | Dev/test, nhanh và rẻ nhất |
| **Rolling** | Theo batch trên fleet hiện tại | Không | **Giảm** (batch bị rút khỏi LB) | Không | Theo batch | Chịu giảm công suất tạm, không tốn thêm tiền |
| **Rolling with additional batch** | Thêm một batch mới trước rồi mới rolling | Không | **Giữ 100%** | Có (tạm) | Theo batch | Production cần đủ capacity, chịu trả thêm ít |
| **Immutable** | ASG tạm với **toàn bộ instance mới**, pass health check mới chuyển sang | Không | Giữ nguyên | Có (gấp đôi tạm) | **Nhanh, sạch** | Production rủi ro cao, đề nói "minimize risk" |
| **Blue/Green (swap CNAME)** | Dựng **environment thứ hai**, test xong thì **swap CNAME** | Không | Giữ nguyên | Cả một environment | Swap ngược, tức thì | Thay đổi lớn/không tương thích, cần test đầy đủ |

**Tính thử với environment 20 instance**, batch size 5:

```
All at once               20 máy cùng dừng để nhận code     → capacity về 0, không tốn thêm máy
Rolling                   mỗi lượt rút 5 máy khỏi LB        → còn 15/20 = 75% capacity, 4 lượt
Rolling + additional      bật thêm 5 máy mới trước          → đỉnh 25 máy, luôn đủ 20 máy phục vụ
Immutable                 dựng 20 máy mới ở ASG tạm         → đỉnh 40 máy, 20 máy cũ không bị đụng
Blue/Green                dựng environment thứ hai 20 máy   → 40 máy cho tới khi bạn xoá env cũ
```

Con số đỉnh giải thích cột *Rollback*. Với hai kiểu rolling, lúc phát hiện lỗi thì một phần fleet **đã mang code mới**, nên quay lại nghĩa là deploy bản cũ thêm một vòng nữa. Với immutable, 20 máy cũ vẫn nguyên vẹn suốt quá trình: bản mới trượt health check thì Beanstalk chỉ việc terminate ASG tạm. Với blue/green, environment cũ vẫn chạy song song, quay lại là đổi CNAME ngược về.

**Traffic splitting** là deployment policy thứ năm của Beanstalk, không nằm trong bảng: nó dựng đủ bộ instance mới như immutable, nhưng thay vì chuyển hết traffic ngay thì chỉ gửi **một phần trăm** do bạn đặt (ví dụ 15%) sang bản mới trong một khoảng thời gian đánh giá (ví dụ 10 phút). Bản mới khoẻ thì chuyển nốt, không khoẻ thì traffic quay về bản cũ. Đây là kiểu **canary** (thử trên một nhóm nhỏ người dùng thật trước), chọn khi đề dùng đúng từ đó. Nó cần Application Load Balancer.

**Blue/green không phải là một deployment policy.** Năm giá trị thật sự chọn được trong mục *Deployment policy* của Beanstalk là All at once, Rolling, Rolling with additional batch, Immutable và Traffic splitting. Dòng blue/green trong bảng là một **thao tác vận hành** bạn tự làm: clone environment, deploy bản mới lên bản clone, test, rồi bấm *Swap environment URLs* để hai environment đổi CNAME cho nhau. Vì là đổi DNS nên client còn cache bản ghi cũ sẽ tiếp tục vào environment cũ thêm một lúc.

> **RDS tạo bên trong environment sẽ bị xoá cùng environment.** Database khai trong cấu hình Beanstalk là một phần của stack bên dưới, có cùng vòng đời với environment: terminate environment (kể cả environment "blue" sau khi swap xong) là mất database. Production luôn tạo RDS **bên ngoài** Beanstalk rồi truyền connection string vào qua biến môi trường.

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

Auto Scaling group (ASG) tự bật thêm EC2 khi tải tăng, nên nó cần một "bản khuôn" trả lời sẵn mọi câu mà bạn vẫn điền tay khi launch instance: AMI nào, instance type gì, security group nào, key pair, user data, IAM role. AWS có hai đời bản khuôn. **Launch Configuration** là đời đầu: một bản ghi bất biến, muốn đổi một trường phải tạo cái mới. **Launch Template** là đời thay thế, có version và phủ hết tính năng EC2 hiện tại.

Mấy thuật ngữ sẽ gặp trong bảng:

- **IMDSv2.** Mỗi EC2 đọc được thông tin về chính nó, gồm cả **credential tạm của IAM role**, bằng cách gọi HTTP tới địa chỉ `169.254.169.254` — đó là *Instance Metadata Service (IMDS)*. Bản v1 trả lời mọi lệnh GET đơn giản, nên một app web có lỗ hổng SSRF (bị lừa gửi request tới URL do kẻ tấn công chọn) có thể bị moi credential. Bản **v2** bắt phải xin một token bằng lệnh PUT trước rồi kèm token đó vào mọi request, và kiểu tấn công trên không làm được bước này. "Bắt buộc IMDSv2" là đặt `HttpTokens: required` trong Launch Template để tắt hẳn v1.
- **T-unlimited.** Instance họ T (t3, t4g) được cấp CPU theo *credit*: chạy dưới mức nền thì tích credit, vượt mức nền thì tiêu credit. Ở chế độ *standard*, hết credit là CPU bị bóp về mức nền. Ở chế độ **unlimited**, instance được chạy vượt tiếp và bạn trả thêm tiền theo vCPU-giờ cho phần vượt.
- **Mixed instances policy.** Một ASG dùng nhiều instance type cùng lúc (m5.large, m5a.large, m6i.large) và trộn On-Demand với Spot theo tỉ lệ, ví dụ "4 máy nền On-Demand, phần trên đó 30% On-Demand và 70% Spot". Nhiều type thì khi Spot của một type bị thu hồi vẫn còn type khác để lấy.

| Tiêu chí | Launch Configuration | Launch Template |
|---|---|---|
| Trạng thái | **Cũ, đang bị loại bỏ**: không nhận instance type mới từ 1/1/2023; account tạo từ 1/10/2024 không tạo mới được bằng bất kỳ cách nào | Chuẩn hiện tại cho ASG, EC2 Fleet, Spot Fleet |
| Versioning | Không — đổi phải tạo cái mới rồi trỏ ASG sang | **Có**: nhiều version, `$Default`/`$Latest`, rollback bằng cách trỏ version cũ |
| Mixed instances / Spot | Không | **Có** — một ASG trộn nhiều instance type và On-Demand/Spot theo tỉ lệ |
| Tính năng | Thiếu nhiều | Placement group, nhiều ENI, T-unlimited, Dedicated Host, **bắt buộc IMDSv2**, tag theo resource |
| **Khi nào chọn** | Chỉ khi duy trì hệ thống cũ chưa migrate | **Mặc định cho mọi thiết kế mới** |

Đề nói "ASG trộn Spot và On-Demand" hay "bắt buộc IMDSv2 toàn fleet" → loại đáp án còn nhắc Launch Configuration.

**Đổi AMI cho cả fleet.** Tạo một version mới của Launch Template trỏ tới AMI mới thì chỉ instance **sinh ra sau đó** dùng AMI mới; các máy đang chạy vẫn là AMI cũ. Để thay luôn máy cũ, chạy **instance refresh** trên ASG: nó terminate và launch lại instance theo từng lô, với hai tham số *minimum healthy percentage* và *maximum healthy percentage* quyết định cỡ lô.

```
ASG 20 instance, min healthy 90%, max healthy 100%
→ mỗi lượt thay 10% = 2 máy, luôn còn ít nhất 18 máy phục vụ → 10 lượt

min healthy 100% (max healthy cao hơn, ví dụ 110%)
→ launch máy mới TRƯỚC rồi mới terminate máy cũ, capacity không bao giờ dưới 20
```

Máy mới phải qua health check và hết thời gian *warmup* thì lượt sau mới bắt đầu. Có thể đặt *checkpoint* để refresh tự dừng ở một mốc phần trăm cho bạn kiểm tra, và huỷ hoặc rollback nếu bản mới có vấn đề.

---

## 10. Sao lưu: Data Lifecycle Manager vs AWS Backup

Sao lưu trên AWS ban đầu là việc của từng dịch vụ: EBS có snapshot, RDS có automated backup, DynamoDB có on-demand backup, mỗi thứ một màn hình, một kiểu lịch, một kiểu retention. Hai dịch vụ dưới đây đều **tự động hoá lịch chụp và lịch xoá**, khác nhau ở phạm vi.

### 10.1 Data Lifecycle Manager (DLM) — chỉ cho EBS

Một EBS **snapshot** là bản sao tại một thời điểm của một volume, lưu trên S3 do AWS quản và có tính *incremental* (bản sau chỉ lưu các block đã đổi so với bản trước). Snapshot không tự sinh ra và không tự mất đi, nên không có công cụ thì hoặc là quên chụp, hoặc là chụp mãi không xoá.

DLM là bộ hẹn giờ cho đúng việc đó. Một *lifecycle policy* gồm: chọn volume hoặc instance đích **bằng tag**, lịch chụp, và quy tắc giữ theo **số lượng** (giữ N bản mới nhất) hoặc theo **tuổi** (giữ N ngày). Bản nào quá hạn thì DLM tự xoá. Nó cũng tạo được **AMI** từ instance EBS-backed và sao chép snapshot sang Region khác.

```
Chính sách: mọi volume có tag Backup=yes, chụp mỗi 12 giờ, giữ 14 ngày
→ 2 bản/ngày × 14 ngày = luôn có 28 snapshot cho mỗi volume, bản thứ 29 ra đời thì bản cũ nhất bị xoá
```

DLM không tính phí (bạn chỉ trả tiền lưu snapshot). Giới hạn của nó là phạm vi: **chỉ biết EBS snapshot và AMI**, không đụng RDS, DynamoDB, EFS, FSx, S3.

### 10.2 AWS Backup — một chính sách cho nhiều loại tài nguyên

**AWS Backup** là lớp điều phối đứng trên cơ chế backup riêng của từng dịch vụ, phủ EBS, EC2, RDS/Aurora, DynamoDB, EFS, FSx, DocumentDB, Neptune, Redshift, S3, Storage Gateway và cả VMware on-prem. Bạn mô tả chính sách một lần, nó gọi đúng cơ chế của từng dịch vụ. Bốn khái niệm cần nắm:

- **Recovery point** là tên AWS Backup gọi **một bản backup cụ thể** của một tài nguyên tại một thời điểm: một snapshot EBS, một snapshot RDS, một bản backup DynamoDB. Tên gọi chung để khỏi phải phân biệt từng loại.
- **Backup vault** là "két" chứa các recovery point. Vault có KMS key riêng để mã hoá và có access policy riêng để quy định ai được xoá, ai được restore.
- **Backup plan** là chính sách, gồm các *rule*. Mỗi rule ghi tần suất, cửa sổ backup (khung giờ được phép bắt đầu), sau bao nhiêu ngày thì chuyển sang cold storage, giữ tổng cộng bao lâu, cất vào vault nào, có copy sang Region hay account khác không.
- **Resource assignment** gắn plan với tài nguyên, bằng **tag** hoặc ARN. Gắn theo tag `Backup=daily` thì database nào tạo sau này mang tag đó sẽ tự vào lịch.

**Warm và cold storage.** Mọi recovery point được tạo ra ở tầng *warm* (restore nhanh, giá lưu cao hơn). Rule có thể chuyển nó sang tầng *cold* rẻ hơn sau một số ngày, kèm hai ràng buộc:

- Đã vào cold thì phải nằm đó **tối thiểu 90 ngày**. Vì vậy AWS Backup bắt thời gian giữ tổng cộng phải dài hơn mốc chuyển cold ít nhất 90 ngày.
- Chỉ một số loại tài nguyên hỗ trợ cold storage, trong đó có EFS, DynamoDB (bật advanced features), EBS (qua snapshot archive) và VMware. **RDS và Aurora không có**, backup của chúng nằm ở warm suốt vòng đời.

```
Rule: chuyển cold sau 30 ngày  → phải giữ tổng cộng ≥ 30 + 90 = 120 ngày
Backup giữ 35 ngày             → không dùng cold được (35 < 120), cứ để warm
Backup giữ 7 năm (~2.557 ngày) → 30 ngày warm + ~2.527 ngày cold: đúng chỗ của cold storage
```

**Vault Lock — backup không xoá được.** *WORM* (write once, read many) là kiểu lưu trữ ghi một lần rồi chỉ đọc: đã ghi thì không sửa, không xoá trước hạn. Vault Lock biến một vault thành WORM. Khi vault đã khoá, mọi lệnh xoá recovery point hay rút ngắn retention đều bị từ chối, kể cả từ root user. Bạn có thể đặt thêm retention tối thiểu và tối đa mà mọi backup đưa vào vault phải tuân theo. Hai chế độ khác nhau ở câu hỏi **ai gỡ được cái khoá**:

| | **Governance mode** | **Compliance mode** |
|---|---|---|
| Gỡ khoá | Người có đủ quyền IAM gỡ được | **Không ai gỡ được**, kể cả root user và kể cả AWS |
| Thời gian đổi ý | Không cần | *Grace time* (cooling-off) do bạn đặt, **tối thiểu 3 ngày**; trong lúc đó còn sửa hoặc gỡ được, hết thời gian đó thì khoá vĩnh viễn |
| Hợp với | Chống xoá nhầm, vẫn chừa lối thoát cho nhóm quản trị | Quy định pháp lý, chống ransomware và chống chính admin bị chiếm quyền |

Compliance mode là đáp án cho câu "backup không thể bị xoá kể cả khi credential admin bị chiếm". Cái giá của nó là thật: đặt nhầm retention 100 năm rồi để qua grace time thì bạn trả tiền lưu chừng ấy năm.

**Cross-Region và cross-account copy** khai ngay trong rule: mỗi recovery point tạo xong được tự sao sang một vault ở Region khác (phòng mất cả Region) hoặc ở account khác (phòng account chính bị chiếm). Trong AWS Organizations, **backup policy** là một loại policy gắn từ management account xuống OU, và mọi account trong OU tự nhận backup plan đó mà không ai phải vào từng account cấu hình.

**Backup Audit Manager** kiểm tra liên tục xem tài nguyên có đang được backup đúng chuẩn không (có nằm trong plan nào không, tần suất và retention có đạt mức tối thiểu không, vault có khoá không) rồi xuất báo cáo cho auditor. **Restore testing** định kỳ tự restore thử một recovery point rồi dọn đi, để chứng minh backup thật sự khôi phục được chứ không chỉ tồn tại.

### 10.3 Chọn cái nào

| Nhu cầu | DLM | AWS Backup | Snapshot thủ công |
|---|---|---|---|
| Chỉ snapshot EBS theo lịch, đơn giản, rẻ | **Chọn** | Được nhưng thừa | Phải tự viết logic xoá |
| Nhiều loại resource (RDS + DynamoDB + EFS + EBS) trong một chính sách | Không làm được | **Chọn** | Không khả thi |
| Bắt buộc lịch backup cho **mọi account trong Organization** | Không | **Chọn** (backup policy) | Không |
| Backup **không thể xoá** cho compliance/ransomware, và báo cáo cho auditor | Không có | **Chọn** — Vault Lock compliance mode + Backup Audit Manager | Không |

---

## 11. Cost — chỗ nào thật sự tốn tiền

Gần như mọi dịch vụ trong bài đều "miễn phí" ở lớp điều khiển; tiền nằm ở tài nguyên mà chúng tạo ra hoặc đi qua. Giá dưới đây là us-east-1, làm tròn.

| Thành phần | Mô hình tính tiền | Điều cần nhớ |
|---|---|---|
| **Systems Manager** vs **endpoint/NAT** | Session Manager, Run Command, State Manager, Patch Manager, Inventory không tính phí thêm trên EC2. Interface endpoint ~$0,01/giờ mỗi endpoint mỗi AZ + ~$0,01/GB; NAT Gateway ~$0,045/giờ + ~$0,045/GB | Ba endpoint × 2 AZ ≈ $44/tháng, một NAT Gateway ≈ $33/tháng (phép tính ở §3.2). Chọn endpoint vì instance không cần ra internet, không phải vì rẻ hơn. Session log lưu ở S3/CloudWatch Logs tính tiền riêng |
| **Parameter Store / Secrets Manager** | Standard miễn phí; Advanced ~$0,05/parameter/tháng; Secrets Manager ~$0,40/secret/tháng + ~$0,05 mỗi 10.000 API call | Hàng nghìn config → Standard. 5.000 key trong Secrets Manager ≈ $2.000/tháng. App nên cache giá trị thay vì gọi API mỗi request |
| **CloudFormation / Beanstalk / DLM** | Không tính phí dịch vụ | Immutable và blue/green **nhân đôi số instance** trong lúc deploy (20 → 40 máy ở §8.1). Retention snapshot dài thì hoá đơn lưu trữ dài theo |
| **AWS Backup** | Theo GB lưu mỗi tháng (warm đắt hơn cold), theo GB restore, và phí truyền dữ liệu khi copy cross-Region | Cold storage phải nằm **tối thiểu 90 ngày**, nên retention phải dài hơn mốc chuyển cold ít nhất 90 ngày (§10.2). Backup có vòng đời vài tuần không dùng cold được; cold dành cho backup giữ nhiều tháng tới nhiều năm |

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
