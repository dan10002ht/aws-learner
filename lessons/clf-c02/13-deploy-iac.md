# Bài 13 — Deploy & Operate trong AWS (CLI / SDK / Console / IaC / Systems Manager)

> Map exam: **CLF-C02 Task 3.1 — Define methods of deploying and operating in the AWS Cloud**.

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân biệt **4 cách truy cập AWS**: Management Console, CLI, SDK, IaC.
- Hiểu **Infrastructure as Code** và **CloudFormation** căn bản.
- Phân biệt **CloudFormation / CDK / SAM / Terraform**.
- Hiểu **3 deployment model**: cloud / hybrid / on-prem.
- Hiểu **3 connectivity option**: public Internet / VPN / Direct Connect.
- Biết khi nào dùng **AWS Systems Manager** vs **Launch Wizard** vs **Service Catalog**.

---

## 2. Lý thuyết

### 2.0 Analogy — 4 cách điều khiển AWS như 4 cách lái xe

| Cách | Analogy | AWS option | Ai dùng |
|------|---------|------------|---------|
| Tay lái cơ học truyền thống | Click chuột từng bước | **Management Console** | Beginner, exploration |
| Lệnh thoại đơn lẻ | Gõ 1 lệnh | **AWS CLI** | DevOps, script nhanh |
| Lập trình tự lái | Code app gọi API | **AWS SDK** (Python boto3, JS, Java, Go, …) | Developer trong app |
| Thiết kế nhà xưởng + lập trình robot | Khai báo declarative | **IaC** (CloudFormation, CDK, Terraform) | Production, reproducible |

---

### 2.1 Bốn cách truy cập AWS

#### Management Console
- Web UI (https://console.aws.amazon.com).
- Trực quan, tốt cho **exploration + 1-time task**.
- ❌ Không tự động hoá, không reproducible.

#### AWS CLI
- Command-line `aws <service> <action>`. VD: `aws s3 ls`, `aws ec2 describe-instances`.
- Cấu hình: `aws configure` (Access Key + Secret Key).
- **AWS CloudShell** = CLI sẵn trong browser, không cần cài.
- ✅ Script, automation.

#### AWS SDK
- Thư viện cho ngôn ngữ: **Python (boto3), JavaScript, Java, Go, .NET, Ruby, PHP, C++, Rust, Swift, Kotlin**.
- Dùng trong app code (Lambda function, backend).
- ✅ Programmatic access trong app.

#### Infrastructure as Code (IaC)
- Khai báo hạ tầng bằng file template → tool tạo/sửa/xoá resource.
- **AWS-native**: CloudFormation, CDK, SAM.
- **Third-party**: Terraform (HashiCorp), Pulumi, Crossplane.
- ✅ Reproducible, versioned, peer-reviewed.

---

### 2.2 AWS CloudFormation (IaC native)

**Cách hoạt động**:
1. Viết **template** (JSON hoặc YAML) khai báo resource.
2. CloudFormation tạo **stack** từ template.
3. Sửa template → update stack → CloudFormation tự diff + apply.
4. Xoá stack → CloudFormation xoá tất cả resource.

**Ví dụ YAML 10 dòng**:
```yaml
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: my-learning-bucket-12345
  MyTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: tasks
      AttributeDefinitions:
        - AttributeName: id
          AttributeType: S
      KeySchema:
        - AttributeName: id
          KeyType: HASH
      BillingMode: PAY_PER_REQUEST
```

**Khái niệm**:
- **Template** — file YAML/JSON.
- **Stack** — instance của template.
- **Change set** — preview thay đổi trước khi apply.
- **Stack set** — deploy stack ra nhiều account + region cùng lúc.
- **Drift detection** — phát hiện ai sửa resource thủ công ngoài CF.
- **Rollback** — nếu apply fail, CF tự revert.

**Pricing**: CloudFormation **miễn phí** (chỉ trả tiền resource bên trong).

Vòng đời của một stack — và đường mà CDK đi vòng qua CloudFormation:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Luồng CloudFormation: template tới stack, update qua change set, rollback khi fail, delete xoá hết — và CDK synth ra template</title>
  <desc>Sơ đồ luồng trái sang phải. Template YAML hoặc JSON đưa vào Create Stack tạo ra resource. Sửa template sinh Change Set để preview rồi Update; nếu apply fail thì CloudFormation tự Rollback về trạng thái cũ. Delete Stack xoá hết resource. Phía dưới: code CDK chạy cdk synth sinh ra CloudFormation template rồi deploy theo cùng luồng trên.</desc>
  <defs>
    <marker id="iacArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <text x="16" y="22" font-size="13.5" font-weight="700" fill="currentColor">Vòng đời CloudFormation Stack</text>
  <rect x="16" y="38" width="150" height="54" rx="9" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="91" y="60" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Template</text>
  <text x="91" y="78" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">YAML / JSON</text>
  <line x1="166" y1="65" x2="216" y2="65" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#iacArr)"/>
  <rect x="218" y="38" width="150" height="54" rx="9" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="293" y="60" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Create Stack</text>
  <text x="293" y="78" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">CF gọi API tạo</text>
  <line x1="368" y1="65" x2="418" y2="65" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#iacArr)"/>
  <rect x="420" y="38" width="150" height="54" rx="9" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="495" y="60" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Resource</text>
  <text x="495" y="78" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">S3, DynamoDB...</text>
  <rect x="596" y="38" width="108" height="54" rx="9" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="650" y="60" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Delete Stack</text>
  <text x="650" y="78" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">xoá hết</text>
  <line x1="570" y1="65" x2="594" y2="65" stroke="currentColor" stroke-opacity="0.5" stroke-dasharray="4 3" marker-end="url(#iacArr)"/>
  <line x1="91" y1="92" x2="91" y2="132" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#iacArr)"/>
  <text x="100" y="118" font-size="10" fill="currentColor" opacity="0.7">sửa template</text>
  <rect x="16" y="134" width="150" height="54" rx="9" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="91" y="156" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Change Set</text>
  <text x="91" y="174" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">preview diff</text>
  <line x1="166" y1="161" x2="216" y2="161" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#iacArr)"/>
  <rect x="218" y="134" width="150" height="54" rx="9" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="293" y="156" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Update Stack</text>
  <text x="293" y="174" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">apply thay đổi</text>
  <line x1="293" y1="92" x2="293" y2="132" stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="4 3" marker-end="url(#iacArr)"/>
  <line x1="368" y1="150" x2="495" y2="98" stroke="currentColor" stroke-opacity="0.45" marker-end="url(#iacArr)"/>
  <text x="400" y="128" font-size="10" fill="#10b981" opacity="0.95" font-weight="700">OK</text>
  <line x1="293" y1="188" x2="293" y2="220" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#iacArr)"/>
  <text x="302" y="208" font-size="10" fill="#f59e0b" opacity="0.95" font-weight="700">FAIL</text>
  <rect x="218" y="222" width="220" height="44" rx="9" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="328" y="244" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Auto Rollback</text>
  <text x="328" y="260" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">CF tự revert về trạng thái cũ</text>
  <line x1="218" y1="200" x2="120" y2="200" stroke="currentColor" stroke-opacity="0" />
  <text x="16" y="300" font-size="13.5" font-weight="700" fill="currentColor">CDK đi vòng qua CloudFormation</text>
  <rect x="16" y="312" width="150" height="40" rx="9" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="91" y="337" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">CDK code (TS/Py)</text>
  <line x1="166" y1="332" x2="216" y2="332" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#iacArr)"/>
  <text x="191" y="325" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">synth</text>
  <rect x="218" y="312" width="150" height="40" rx="9" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="293" y="337" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">CF template</text>
  <line x1="368" y1="332" x2="418" y2="332" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#iacArr)"/>
  <text x="393" y="325" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">deploy</text>
  <rect x="420" y="312" width="150" height="40" rx="9" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="495" y="337" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Stack tạo resource</text>
</svg>

---

### 2.3 AWS CDK (Cloud Development Kit)

- Viết hạ tầng bằng **code TypeScript / Python / Java / Go / C#** thay YAML.
- CDK **synth** → ra CloudFormation template → deploy bằng CF.
- ✅ Type checking, autocomplete, vòng lặp/condition như code.
- ❌ Cần biết lập trình.

```python
# CDK Python ví dụ
from aws_cdk import aws_s3 as s3, Stack
class MyStack(Stack):
    def __init__(self, scope, id):
        super().__init__(scope, id)
        s3.Bucket(self, "Bucket", versioned=True)
```

---

### 2.4 AWS SAM (Serverless Application Model)

- **Extension của CloudFormation** chuyên cho serverless (Lambda + API Gateway + DynamoDB).
- Syntax ngắn hơn CF, transform thành CF khi deploy.
- `sam local invoke` chạy Lambda local để debug.

---

### 2.5 CloudFormation vs CDK vs SAM vs Terraform

| Tool | Ngôn ngữ | Multi-cloud | Pros | Cons |
|------|----------|-------------|------|------|
| **CloudFormation** | YAML/JSON | AWS only | Native, free, drift detection | Verbose, no loop/condition đẹp |
| **CDK** | TypeScript/Python/Go/Java/C# | AWS only (CDKTF có multi-cloud) | Code thật, reusable construct | Cần biết code, debug khó |
| **SAM** | YAML (subset CF) | AWS only | Ngắn cho serverless, local test | Chỉ phù hợp serverless |
| **Terraform** | HCL (declarative) | Multi-cloud (AWS, Azure, GCP, …) | Multi-cloud, ecosystem lớn | State file management khó |

**CLF-C02 chính chủ nhắc**: CloudFormation. Đề có thể hỏi "IaC service of AWS" → **CloudFormation** (chính), CDK (đẹp hơn).

---

### 2.6 Deployment Models (Task 3.1 knowledge bullet)

| Model | Định nghĩa | AWS option |
|-------|-----------|------------|
| **Cloud (all-in)** | Mọi workload chạy public cloud | Standard AWS region |
| **Hybrid** | Kết hợp on-prem + cloud | Direct Connect / VPN + Outposts / Local Zone |
| **On-premises (private cloud)** | Tất cả on-prem nhưng dùng cloud tech | **AWS Outposts**, **VMware Cloud on AWS** |

**Edge variants**:
- **AWS Outposts** — rack AWS đặt on-prem.
- **AWS Local Zones** — mini-region gần metro.
- **AWS Wavelength** — compute trong 5G telco.
- **VMware Cloud on AWS** — VMware stack trên AWS hardware.

---

### 2.7 Connectivity options

3 cách kết on-prem ↔ AWS:

| Option | Latency | Cost | Bảo mật | Use case |
|--------|---------|------|---------|----------|
| **Public Internet** | Cao + biến động | Rẻ | TLS thôi | Browser → console, app bình thường |
| **AWS Site-to-Site VPN** | Trung bình, qua Internet nhưng IPsec encrypted | Trung bình ($0.05/h gateway) | IPsec | Nhanh, không cần ký hợp đồng telco |
| **AWS Direct Connect** | Thấp ổn định | Đắt + thời gian setup tuần-tháng | Private link | Enterprise, băng thông lớn, ổn định |
| **AWS Direct Connect + VPN** | Thấp + encrypted | Đắt nhất | Cả hai | Compliance đòi encrypt over private link |

Ba con đường nối on-prem ↔ AWS, đặt cạnh nhau trên ba trục latency / cost / bảo mật:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Ba lựa chọn kết nối on-prem tới AWS: Public Internet, Site-to-Site VPN, Direct Connect</title>
  <desc>Ba cột song song so sánh ba cách kết nối từ data center on-prem tới AWS. Public Internet đi qua Internet công cộng chỉ bảo vệ bằng TLS, latency cao biến động, chi phí rẻ, bảo mật thấp. Site-to-Site VPN đi qua Internet nhưng tạo đường hầm IPsec mã hoá, latency trung bình, chi phí trung bình, bảo mật trung bình. Direct Connect dùng cáp quang riêng không qua Internet, latency thấp ổn định, chi phí cao và setup lâu, bảo mật cao nhất.</desc>
  <text x="16" y="22" font-size="13.5" font-weight="700" fill="currentColor">On-prem ↔ AWS — 3 con đường</text>
  <rect x="16" y="36" width="120" height="38" rx="8" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="76" y="59" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Data center</text>
  <rect x="584" y="36" width="120" height="38" rx="8" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="644" y="59" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">AWS VPC</text>
  <rect x="16" y="92" width="220" height="206" rx="10" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.2"/>
  <rect x="252" y="92" width="220" height="206" rx="10" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.2"/>
  <rect x="488" y="92" width="216" height="206" rx="10" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="126" y="116" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Public Internet</text>
  <text x="362" y="116" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Site-to-Site VPN</text>
  <text x="596" y="116" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Direct Connect</text>
  <text x="126" y="138" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">qua Internet, chỉ TLS</text>
  <text x="362" y="138" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">qua Internet, hầm IPsec</text>
  <text x="596" y="138" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">cáp quang riêng, private</text>
  <g font-size="10.5" fill="currentColor">
    <text x="32" y="172" opacity="0.6">Latency</text>
    <text x="126" y="172" text-anchor="middle" font-weight="700">cao, biến động</text>
    <text x="362" y="172" text-anchor="middle" font-weight="700">trung bình</text>
    <text x="596" y="172" text-anchor="middle" font-weight="700">thấp, ổn định</text>
    <text x="32" y="210" opacity="0.6">Cost</text>
    <text x="126" y="210" text-anchor="middle" font-weight="700">rẻ</text>
    <text x="362" y="210" text-anchor="middle" font-weight="700">trung bình</text>
    <text x="596" y="210" text-anchor="middle" font-weight="700">đắt + setup lâu</text>
    <text x="32" y="248" opacity="0.6">Bảo mật</text>
    <text x="126" y="248" text-anchor="middle" font-weight="700">TLS thôi</text>
    <text x="362" y="248" text-anchor="middle" font-weight="700">IPsec encrypted</text>
    <text x="596" y="248" text-anchor="middle" font-weight="700">private link</text>
  </g>
  <line x1="16" y1="186" x2="704" y2="186" stroke="currentColor" stroke-opacity="0.12"/>
  <line x1="16" y1="224" x2="704" y2="224" stroke="currentColor" stroke-opacity="0.12"/>
  <text x="126" y="282" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">browser, app thường</text>
  <text x="362" y="282" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">nhanh, không cần telco</text>
  <text x="596" y="282" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">enterprise, băng thông lớn</text>
</svg>

**Khái niệm khác**:
- **Transit Gateway** — hub kết nối nhiều VPC + on-prem.
- **VPC Peering** — kết 1-1 VPC.
- **PrivateLink** — expose service AWS qua private endpoint, không qua Internet.
- **VPC Endpoint** (Gateway / Interface) — truy cập S3, DynamoDB, … private.

---

### 2.8 AWS Systems Manager (SSM)

**Bộ tool quản lý EC2 + on-prem + multi-cloud server**:

| Feature | Mục đích |
|---------|---------|
| **Session Manager** | SSH/RDP không cần port 22, qua IAM + log CloudWatch |
| **Run Command** | Chạy script song song trên nhiều instance |
| **Patch Manager** | Patch OS theo schedule |
| **Parameter Store** | Lưu config + secret (string, secure string với KMS) |
| **State Manager** | Đảm bảo config khớp baseline (như Ansible) |
| **Inventory** | Quản tài sản phần cứng/phần mềm |
| **Automation** | Workflow runbook (như Ansible playbook) |
| **OpsCenter / Incident Manager** | Sự cố, runbook ứng phó |
| **Distributor** | Đẩy phần mềm/agent ra fleet |
| **Maintenance Windows** | Cửa sổ bảo trì định kỳ |

**Lưu ý**: SSM Agent có sẵn trên Amazon Linux, Windows AMI mới; on-prem cần cài thủ công.

---

### 2.9 AWS Launch Wizard

- **Wizard hướng dẫn deploy** workload phức tạp (SQL Server, SAP HANA, Active Directory, …).
- Hỏi yêu cầu → wizard tự gen CloudFormation, deploy đúng best practice.
- Free, chỉ trả resource.

---

### 2.10 AWS Service Catalog

- **Quản trị danh mục template** approved cho organization.
- Admin tạo "products" (CloudFormation templates), end-user chỉ thấy/launch product được duyệt.
- Đảm bảo compliance + security baseline khi end-user (developer, ops) self-service.

---

### 2.11 AWS OpsWorks (deprecated, vẫn có thể xuất hiện trong đề)

- Managed Chef + Puppet (legacy config management).
- AWS đã **announce end-of-life** OpsWorks Stacks (2024), OpsWorks for Chef Automate / Puppet Enterprise (2024).
- Đề CLF v1.0 (2023) có thể vẫn hỏi — biết là **config management** với Chef/Puppet.

---

### 2.12 Repeatable vs One-time operations

**Knowledge bullet trong task 3.1**: "Evaluating requirements to determine whether to use one-time operations or repeatable processes."

| Loại | Cách | Khi nào |
|------|------|---------|
| **One-time** | Console click + CLI | PoC, exploration, debug |
| **Repeatable** | IaC (CF/CDK/Terraform) + CI/CD pipeline | Production, staging, có versioning |

**Anti-pattern**: production setup bằng console rồi không có template — không reproducible, không peer review, drift.

---

## 3. Hands-on có account

### Lab 1 — CLI + CloudShell (15 phút)
1. Console → mở **CloudShell** (icon góc trên).
2. `aws s3 ls` → liệt kê bucket.
3. `aws s3 mb s3://learner-cli-bucket-$RANDOM` → tạo bucket.
4. `aws s3 cp /etc/passwd s3://learner-cli-bucket-XXX/` → upload.
5. `aws s3 rb s3://learner-cli-bucket-XXX --force` → xoá.

### Lab 2 — CloudFormation đầu tiên (30 phút)
1. Lưu file `stack.yml` với content ở mục 2.2.
2. Console → CloudFormation → Create stack → upload file → stack name `my-first`.
3. Đợi `CREATE_COMPLETE`.
4. Vào S3 + DynamoDB → thấy resource.
5. CF console → Update → đổi BucketName → CF tự delete + create.
6. Delete stack → CF dọn hết.

### Lab 3 — CDK Python (45 phút)
```
npm install -g aws-cdk
mkdir cdk-app && cd cdk-app
cdk init app --language python
source .venv/bin/activate
pip install -r requirements.txt
# Sửa stack file thêm S3 bucket
cdk bootstrap
cdk synth   # ra template
cdk deploy
cdk destroy
```

### Lab 4 — SSM Session Manager (10 phút)
1. Launch EC2 với IAM role có policy `AmazonSSMManagedInstanceCore`.
2. Console → EC2 → Connect → **Session Manager** (không cần SSH key, không cần port 22 mở).
3. Shell terminal trong browser.

---

## 4. Hands-on không tốn tiền

### Option A — LocalStack
- `awslocal cloudformation deploy …` để test template không tốn tiền.

### Option B — CloudFormation Designer
- Console → CloudFormation → Designer → drag-drop để học structure.

### Option C — AWS Skill Builder
- "AWS Cloud Quest: Cloud Practitioner" (free, gamified).
- "AWS CloudFormation Primer".

---

## 5. Tự kiểm tra (có đáp án)

1. Đề: *"Service nào cho phép quản hạ tầng AWS bằng YAML template, miễn phí, tự rollback?"*
   <details><summary>Trả lời</summary>**AWS CloudFormation**.</details>

2. Đề: *"SSH vào EC2 mà không cần mở port 22 hay quản key?"*
   <details><summary>Trả lời</summary>**AWS Systems Manager Session Manager**.</details>

3. Đề: *"Lưu config (DB password, API key) có encryption + audit?"*
   <details><summary>Trả lời</summary>**SSM Parameter Store** (rẻ) hoặc **AWS Secrets Manager** (đắt hơn, có auto-rotate).</details>

4. Đề: *"Cần kết on-prem với AWS, băng thông 10 Gbps, latency ổn định cho enterprise."*
   <details><summary>Trả lời</summary>**AWS Direct Connect**.</details>

5. Đề: *"Cần deploy hạ tầng giống nhau ra 50 region cùng lúc."*
   <details><summary>Trả lời</summary>**CloudFormation StackSets**.</details>

6. Đề: *"Admin muốn cho developer self-service launch DB nhưng phải theo template được duyệt."*
   <details><summary>Trả lời</summary>**AWS Service Catalog**.</details>

7. CDK khác CloudFormation chính ở điểm nào?
   <details><summary>Trả lời</summary>CDK cho phép viết hạ tầng bằng **code TypeScript / Python / Java / Go / C#**, có type checking + loop, synth ra CF template để deploy.</details>

8. Đề: *"Đẩy script `yum update -y` lên 500 EC2 cùng lúc, log kết quả."*
   <details><summary>Trả lời</summary>**SSM Run Command** (Systems Manager).</details>

9. 3 deployment model là gì?
   <details><summary>Trả lời</summary>**Cloud** (all-in), **Hybrid** (mix), **On-premises / private cloud** (qua Outposts hoặc VMware Cloud on AWS).</details>

10. Đề: *"Cần wizard hướng dẫn deploy SAP HANA theo best practice."*
    <details><summary>Trả lời</summary>**AWS Launch Wizard**.</details>

---

## 6. Đối chiếu GCP & Azure

| Tool | AWS | GCP | Azure |
|------|-----|-----|-------|
| Console | Management Console | Cloud Console | Azure Portal |
| CLI | aws CLI / CloudShell | gcloud / Cloud Shell | az CLI / Azure Cloud Shell |
| SDK | boto3 (Python), JS, Java, … | google-cloud-* | azure-* |
| IaC native | CloudFormation, CDK | Deployment Manager, **Config Connector** | ARM, Bicep |
| Multi-cloud IaC | Terraform / Pulumi | Terraform / Pulumi | Terraform / Pulumi |
| Serverless framework | SAM | Functions Framework | Functions Core Tools |
| Run command | SSM Run Command | gcloud compute ssh | Azure Run Command |
| Patch | SSM Patch Manager | OS Config | Update Management |
| Secret store | Secrets Manager | Secret Manager | Key Vault |
| Service catalog | Service Catalog | Private Catalog | Managed Applications |

---

## 7. Lưu ý khi thi CLF-C02

- **4 cách truy cập AWS**: Console / CLI / SDK / IaC.
- **CloudFormation = IaC native AWS, free**.
- **CDK** = code language, **SAM** = serverless extension CF, **Terraform** = multi-cloud (third-party).
- **3 deployment model**: cloud / hybrid / on-prem.
- **3 connectivity**: public Internet / VPN / Direct Connect.
- **SSM Session Manager** thay SSH key.
- **Service Catalog** = approved template cho org.
- **Launch Wizard** = wizard cho SAP/SQL/…
- **CloudShell** = terminal trong browser, không cần cài CLI.

## 8. Lưu ý khi thi SAA-C03 (sâu hơn)

- **CloudFormation cross-region/account** với StackSets + delegated admin.
- **Drift detection** + **change set**.
- **Nested stack** + **module**.
- **EventBridge + Lambda + CloudFormation** automation.
- **Direct Connect** SiteLink, multi-account.
- **Transit Gateway** vs **VPC Peering** trade-off.

## 9. Lưu ý khi đi làm

- **Không tạo production bằng console** — luôn IaC, peer review qua PR.
- **Pipeline IaC**: CodePipeline → CloudFormation deploy → manual approval cho prod.
- **CDK + TypeScript** đang thành chuẩn cho team product mới.
- **Terraform** vẫn dùng nhiều cho multi-cloud + team đã quen.
- **Secrets Manager rotation** bật cho RDS — không hardcode password trong .env.
- **SSM Session Manager + IAM** thay SSH bastion — log đầy đủ, audit tốt.

---

## 10. Flashcard

- **Console / CLI / SDK / IaC** = 4 cách access AWS.
- **CloudShell** — terminal in-browser, free.
- **CloudFormation** — IaC native, YAML/JSON, free, stack-based.
- **CDK** — code (TS/Py/Java/Go/C#), synth ra CF.
- **SAM** — extension CF cho serverless.
- **Terraform** — third-party multi-cloud IaC.
- **3 deployment models**: cloud / hybrid / on-prem.
- **3 connectivity**: Internet / VPN / Direct Connect.
- **Systems Manager** features: Session Manager, Run Command, Parameter Store, Patch Manager, Inventory, Automation, State Manager.
- **Launch Wizard** — wizard cho SAP/SQL/AD.
- **Service Catalog** — approved template self-service.
- **OpsWorks** — Chef/Puppet (đang EOL).
- **VPC Endpoint** — truy cập S3/DDB private.
- **PrivateLink** — expose service private.
- **Transit Gateway** — hub multi-VPC.
