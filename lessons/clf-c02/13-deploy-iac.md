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
