# Terraform & Infrastructure as Code

Bạn đã biết click chuột trên console cloud hoặc gõ `aws ec2 run-instances`. Bài này dạy bạn **mô tả hạ tầng bằng code** để nó có thể review, version, tái tạo y hệt ở mọi môi trường. Trọng tâm là Terraform — chuẩn de-facto của IaC năm 2025-2026.

## 1. Mục tiêu

Sau bài này bạn có thể:
- Giải thích **vì sao cần IaC** và phân biệt **declarative vs imperative**.
- Viết HCL cơ bản: `provider`, `resource`, `variable`, `output`, `data`.
- Hiểu **state file** là gì, vì sao phải dùng **remote backend** (S3 + DynamoDB lock).
- Đóng gói hạ tầng thành **module** tái sử dụng.
- Dùng đúng `plan` / `apply` / `destroy`, nhận diện và xử lý **drift**.
- Quản lý nhiều môi trường bằng **workspace**, đưa tài nguyên có sẵn vào state bằng `import`.
- Áp dụng **best practices** vận hành thật: không sửa tay, luôn review plan.

---

## 2. IaC là gì và vì sao cần

**Infrastructure as Code** = mô tả toàn bộ hạ tầng (VPC, EC2, security group, IAM, database…) bằng các file text, đưa vào Git, rồi để công cụ dựng ra đúng như mô tả.

Vấn đề của cách làm tay (ClickOps):
- **Không tái tạo được**: prod chạy nhưng không ai biết chính xác đã bấm gì. Dựng lại staging cho giống prod → bất khả thi.
- **Drift âm thầm**: ai đó sửa tay 1 security group lúc 2h sáng, không ai biết.
- **Không review được**: thay đổi hạ tầng không qua PR, không có lịch sử.
- **Snowflake servers**: mỗi server một kiểu, không server nào giống server nào.

IaC giải quyết: hạ tầng thành **artifact có version**, review qua **Pull Request**, dựng lại **idempotent** (chạy lại không tạo trùng).

> 💡 Ghi nhớ: IaC không chỉ là "script tạo hạ tầng". Điểm cốt lõi là **state** — công cụ biết hiện trạng và chỉ thay đổi phần khác biệt, nên chạy lại nhiều lần vẫn ra cùng kết quả (idempotent).

### Declarative vs Imperative

| | Imperative | Declarative |
|--|-----------|-------------|
| Bạn viết gì | **Các bước** phải làm | **Trạng thái mong muốn** |
| Ví dụ | `aws ec2 run-instances ...` (script bash) | "Tôi muốn 1 EC2 t3.micro với tag X" |
| Chạy lại | Tạo thêm instance mới (không idempotent) | Không làm gì nếu đã khớp |
| Công cụ | Bash + AWS CLI, một phần Ansible | **Terraform**, OpenTofu, CloudFormation, Pulumi |
| Bạn lo | Cách đạt được | Kết quả cuối |

Terraform là **declarative**: bạn khai báo đích đến, Terraform tự tính ra các bước (tạo / sửa / xoá) bằng cách so trạng thái mong muốn với state hiện tại.

> ⚠️ Bẫy production: OpenTofu là bản fork mã nguồn mở của Terraform (sau khi HashiCorp đổi license sang BSL tháng 8/2023). Cú pháp HCL gần như giống hệt; nhiều công ty đã chuyển sang `tofu`. Kiểm tra license/policy nội bộ trước khi chọn — cú pháp trong bài này áp dụng cho cả hai.

---

## 3. HCL cơ bản

HCL (HashiCorp Configuration Language) là ngôn ngữ khai báo của Terraform. Một project Terraform là một thư mục chứa các file `.tf`.

### 3.1 Provider — kết nối tới cloud

```hcl
terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"   # cho phép 5.x, không nhảy lên 6.0
    }
  }
}

provider "aws" {
  region = "ap-southeast-1"   # Singapore
  default_tags {
    tags = {
      ManagedBy   = "Terraform"
      Environment = "dev"
    }
  }
}
```

> 💡 Ghi nhớ: Luôn **pin version** provider (`~> 5.0`) và `required_version`. Không pin → đồng nghiệp chạy `terraform init` ở máy khác có thể kéo provider mới hơn, gây plan khác nhau và "works on my machine".

### 3.2 Resource — đơn vị hạ tầng

Cú pháp: `resource "<TYPE>" "<TÊN_LOCAL>" { ... }`.

```hcl
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = { Name = "main-vpc" }
}
```

- `aws_vpc` là **type** (do provider AWS định nghĩa).
- `main` là **tên local** — chỉ dùng để tham chiếu trong code, không lên AWS.
- Tham chiếu sang resource khác: `aws_vpc.main.id`.

### 3.3 Variable — đầu vào

```hcl
variable "instance_type" {
  description = "Loại EC2 instance"
  type        = string
  default     = "t3.micro"
}

variable "allowed_cidr" {
  description = "CIDR được phép SSH"
  type        = string
  # không default → bắt buộc truyền vào
}
```

Truyền giá trị: qua `terraform.tfvars`, biến môi trường `TF_VAR_instance_type`, hoặc cờ `-var`.

```hcl
# terraform.tfvars
instance_type = "t3.small"
allowed_cidr  = "203.0.113.10/32"
```

### 3.4 Output — đầu ra

```hcl
output "instance_public_ip" {
  description = "IP public của web server"
  value       = aws_instance.web.public_ip
}

output "db_password" {
  value     = aws_db_instance.main.password
  sensitive = true   # không in ra console / log
}
```

### 3.5 Data source — đọc thông tin có sẵn

`data` đọc tài nguyên Terraform **không quản lý** (chỉ query, không tạo). Hay dùng để lấy AMI mới nhất, AZ khả dụng…

```hcl
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}
# Dùng: data.aws_ami.ubuntu.id
```

---

## 4. State file & remote backend

### 4.1 State là gì

Sau `apply`, Terraform ghi ra `terraform.tfstate` — một file JSON ánh xạ **resource trong code ↔ resource thật trên AWS** (kèm ID, thuộc tính). Đây là "trí nhớ" của Terraform: nhờ state nó biết `aws_instance.web` ứng với instance `i-0abc123` nào để sửa/xoá.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 250" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>State là cầu nối giữa code HCL và resource thật trên AWS</title>
  <desc>Code HCL mô tả trạng thái mong muốn nối với terraform.tfstate; state lại nối tới resource thật trên AWS. State là trí nhớ ánh xạ tên local trong code với ID resource thật để Terraform biết cái nào sửa hay xoá.</desc>
  <defs>
    <marker id="ar-state" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">State — cầu nối code ↔ AWS</text>
  <g>
    <rect x="16" y="56" width="190" height="150" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="111" y="80" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Code HCL</text>
    <text x="111" y="98" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">trạng thái mong muốn</text>
    <rect x="34" y="116" width="154" height="74" rx="7" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="46" y="138" font-size="11" fill="currentColor" opacity="0.85">resource "aws_instance"</text>
    <text x="46" y="156" font-size="11" fill="currentColor" opacity="0.85">  "web" { ... }</text>
    <text x="46" y="178" font-size="10.5" fill="currentColor" opacity="0.55">tên local: web</text>
  </g>
  <g>
    <rect x="265" y="56" width="190" height="150" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="360" y="80" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">terraform.tfstate</text>
    <text x="360" y="98" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">trí nhớ / bản đồ</text>
    <rect x="283" y="116" width="154" height="74" rx="7" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="295" y="140" font-size="11" fill="currentColor" opacity="0.85">web  ⇄  i-0abc123</text>
    <text x="295" y="160" font-size="10.5" fill="currentColor" opacity="0.55">+ thuộc tính, ID</text>
    <text x="295" y="180" font-size="10.5" fill="currentColor" opacity="0.55">(JSON)</text>
  </g>
  <g>
    <rect x="514" y="56" width="190" height="150" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="609" y="80" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Resource thật</text>
    <text x="609" y="98" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">trên AWS</text>
    <rect x="532" y="116" width="154" height="74" rx="7" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="609" y="148" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.9">EC2 i-0abc123</text>
    <text x="609" y="170" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.55">đang chạy</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.6" fill="none" stroke-width="1.6">
    <line x1="206" y1="131" x2="263" y2="131" marker-start="url(#ar-state)" marker-end="url(#ar-state)"/>
    <line x1="455" y1="131" x2="512" y2="131" marker-start="url(#ar-state)" marker-end="url(#ar-state)"/>
  </g>
  <text x="234" y="120" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">ánh xạ</text>
  <text x="483" y="120" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">khớp ID</text>
  <text x="360" y="232" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">State giúp Terraform biết resource nào để sửa / xoá</text>
</svg>

> ⚠️ Bẫy production: **KHÔNG BAO GIỜ commit `terraform.tfstate` vào Git.** State chứa secret dạng plaintext (password DB, private key). Thêm vào `.gitignore`: `*.tfstate`, `*.tfstate.*`, `.terraform/`.

### 4.2 Vì sao cần remote backend

State để local có 3 vấn đề chí mạng khi làm việc nhóm:
1. **Không chia sẻ được** — đồng nghiệp không có state, apply sẽ tạo trùng.
2. **Không có lock** — 2 người `apply` cùng lúc → state corrupt.
3. **Không bền** — mất laptop là mất state.

Giải pháp chuẩn trên AWS: **S3 lưu state + DynamoDB làm lock**.

```hcl
terraform {
  backend "s3" {
    bucket         = "mycompany-tfstate-prod"
    key            = "network/terraform.tfstate"   # đường dẫn trong bucket
    region         = "ap-southeast-1"
    dynamodb_table = "terraform-locks"              # bảng lock
    encrypt        = true
  }
}
```

DynamoDB table cho lock chỉ cần partition key `LockID` (kiểu String). Khi ai đó đang `apply`, Terraform ghi 1 record lock; người thứ hai sẽ bị chặn với lỗi `Error acquiring the state lock`.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 290" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Remote backend trên S3 và cơ chế lock chống apply đồng thời</title>
  <desc>Hai engineer cùng chạy terraform apply. Người thứ nhất lấy được lock từ DynamoDB hoặc S3 lockfile và ghi state vào S3. Người thứ hai bị chặn với lỗi acquiring the state lock vì lock đang giữ.</desc>
  <defs>
    <marker id="ar-lock" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">Remote backend + lock — chống apply đồng thời</text>
  <g>
    <rect x="16" y="52" width="180" height="56" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="106" y="76" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Engineer A</text>
    <text x="106" y="94" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.65">terraform apply</text>
  </g>
  <g>
    <rect x="16" y="186" width="180" height="56" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="106" y="210" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Engineer B</text>
    <text x="106" y="228" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.65">terraform apply</text>
  </g>
  <g>
    <rect x="300" y="50" width="180" height="86" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="390" y="76" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Lock</text>
    <text x="390" y="96" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">DynamoDB LockID</text>
    <text x="390" y="113" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">hoặc S3 lockfile</text>
    <rect x="332" y="120" width="116" height="0" />
  </g>
  <g>
    <rect x="540" y="50" width="164" height="86" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="622" y="80" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">S3 bucket</text>
    <text x="622" y="100" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.65">terraform.tfstate</text>
    <text x="622" y="118" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.55">encrypt = true</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.65" fill="none" stroke-width="1.6">
    <path d="M196 80 L298 82" marker-end="url(#ar-lock)"/>
    <path d="M480 96 L538 95" marker-end="url(#ar-lock)"/>
  </g>
  <text x="245" y="66" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">① lấy lock OK</text>
  <text x="508" y="84" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">② ghi state</text>
  <g stroke="#ef4444" stroke-opacity="0.7" fill="none" stroke-width="1.6" stroke-dasharray="5 4">
    <path d="M196 210 L298 124" marker-end="url(#ar-lock)"/>
  </g>
  <g>
    <rect x="300" y="200" width="300" height="56" rx="9" fill="#ef4444" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="450" y="222" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Bị chặn — lock đang giữ</text>
    <text x="450" y="241" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">Error acquiring the state lock</text>
  </g>
  <text x="250" y="168" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">lock đã bận → block</text>
</svg>

> 💡 Ghi nhớ: Từ khi S3 hỗ trợ **conditional writes** (cuối 2024), Terraform 1.10+ có thể lock state bằng chính S3 với tham số `use_lockfile = true`, **không còn bắt buộc DynamoDB**. Nhưng rất nhiều codebase hiện tại vẫn dùng DynamoDB — bạn cần biết cả hai.

> ⚠️ Bẫy production: Backend **không nhận biến** (`variable`) — block `backend` phải là giá trị literal. Cần tham số hoá thì dùng `terraform init -backend-config=prod.hcl` với partial configuration.

---

## 5. Module — tái sử dụng

Module = một thư mục chứa `.tf`, đóng gói thành khối tái dùng được. Code bạn viết ở mục 3 thực ra đã là **root module**. Tách logic chung (vd: "1 VPC chuẩn", "1 web server") ra module con để dùng lại cho dev/staging/prod.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Phân cấp module: root module gọi module con qua source và input, nhận lại output</title>
  <desc>Root module dùng block module với source trỏ tới module vpc và truyền vào input variables như cidr và az_count. Module con tạo resource và trả về outputs. Các resource khác trong root dùng lại output đó.</desc>
  <defs>
    <marker id="ar-mod" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">Phân cấp module — root gọi module con</text>
  <g>
    <rect x="220" y="44" width="280" height="74" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="360" y="68" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Root module</text>
    <text x="360" y="88" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">module "network" { source = "./modules/vpc" }</text>
    <text x="360" y="106" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.55">+ resource khác trong root</text>
  </g>
  <g>
    <rect x="180" y="210" width="360" height="84" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="360" y="234" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Module con: vpc</text>
    <text x="360" y="254" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">main.tf · variables.tf · outputs.tf</text>
    <text x="360" y="276" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">tạo aws_vpc, aws_subnet…</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.65" fill="none" stroke-width="1.6">
    <path d="M300 118 L260 208" marker-end="url(#ar-mod)"/>
    <path d="M420 208 L460 120" marker-end="url(#ar-mod)"/>
  </g>
  <g>
    <rect x="40" y="142" width="190" height="44" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="135" y="160" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">input variables ↓</text>
    <text x="135" y="177" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">cidr, az_count</text>
  </g>
  <g>
    <rect x="490" y="142" width="190" height="44" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="585" y="160" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">outputs ↑</text>
    <text x="585" y="177" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">public_subnet_ids</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.4" fill="none" stroke-width="1.3" stroke-dasharray="4 4">
    <path d="M135 186 L135 252 L178 252"/>
    <path d="M542 252 L585 252 L585 186"/>
  </g>
  <text x="360" y="314" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">module.network.public_subnet_ids[0] → dùng cho aws_instance.web</text>
</svg>

```
modules/
  vpc/
    main.tf        # định nghĩa resource
    variables.tf   # đầu vào module
    outputs.tf     # đầu ra module
```

Gọi module:

```hcl
module "network" {
  source   = "./modules/vpc"
  cidr     = "10.0.0.0/16"
  az_count = 2
}

# Dùng output của module:
resource "aws_instance" "web" {
  subnet_id = module.network.public_subnet_ids[0]
  # ...
}
```

`source` có thể là local (`./modules/vpc`), Git (`git::https://...`), hoặc **Terraform Registry**:

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"   # module registry PHẢI pin version
  # ...
}
```

> 💡 Ghi nhớ: Module công khai trên registry (như `terraform-aws-modules/vpc`) được duy trì tốt, dùng được trong production. Đừng tự viết lại VPC module từ đầu nếu module registry đã đáp ứng.

---

## 6. Vòng đời: plan / apply / destroy

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 280" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Vòng đời plan và apply: so trạng thái mong muốn với state để tính diff rồi hội tụ</title>
  <desc>Terraform so trạng thái mong muốn trong code với state hiện tại, plan tính ra diff gồm tạo, sửa, xoá và replace, sau đó apply thực thi để thực tế hội tụ về đúng trạng thái mong muốn.</desc>
  <defs>
    <marker id="ar-life" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">plan so sánh → apply hội tụ</text>
  <g>
    <rect x="16" y="52" width="170" height="58" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="101" y="76" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Trạng thái mong muốn</text>
    <text x="101" y="95" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.65">code HCL</text>
  </g>
  <g>
    <rect x="16" y="160" width="170" height="58" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="101" y="184" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">State hiện tại</text>
    <text x="101" y="203" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.65">terraform.tfstate</text>
  </g>
  <g>
    <rect x="276" y="86" width="148" height="98" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="350" y="110" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">plan</text>
    <text x="350" y="128" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">tính diff</text>
    <text x="296" y="150" font-size="11" fill="currentColor" opacity="0.85">+ create   ~ update</text>
    <text x="296" y="168" font-size="11" fill="currentColor" opacity="0.85">- destroy  -/+ replace</text>
  </g>
  <g>
    <rect x="514" y="86" width="190" height="98" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="609" y="116" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">apply</text>
    <text x="609" y="138" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">thực thi diff</text>
    <text x="609" y="158" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">→ thực tế hội tụ về</text>
    <text x="609" y="174" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">trạng thái mong muốn</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.6" fill="none" stroke-width="1.6">
    <path d="M186 84 L240 110 L274 116" marker-end="url(#ar-life)"/>
    <path d="M186 186 L240 160 L274 154" marker-end="url(#ar-life)"/>
    <path d="M424 135 L512 135" marker-end="url(#ar-life)"/>
  </g>
  <text x="234" y="100" font-size="10" fill="currentColor" opacity="0.6">so sánh</text>
  <g stroke="currentColor" stroke-opacity="0.45" fill="none" stroke-width="1.4" stroke-dasharray="5 4">
    <path d="M609 184 L609 240 L101 240 L101 218" marker-end="url(#ar-life)"/>
  </g>
  <text x="355" y="256" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">apply cập nhật lại state → lần plan sau không còn diff (idempotent)</text>
</svg>

```bash
terraform init      # tải provider + cấu hình backend (chạy 1 lần / khi đổi provider)
terraform fmt       # format code chuẩn
terraform validate  # kiểm tra cú pháp
terraform plan      # XEM TRƯỚC thay đổi, KHÔNG đụng gì
terraform apply     # thực thi (hỏi yes/no, hoặc -auto-approve)
terraform destroy   # xoá toàn bộ resource trong state
```

Ký hiệu trong `plan`:

| Ký hiệu | Nghĩa |
|---------|-------|
| `+` | create — tạo mới |
| `~` | update in-place — sửa tại chỗ |
| `-` | destroy — xoá |
| `-/+` | **replace** — xoá rồi tạo lại (downtime!) |
| `<=` | đọc data source |

> ⚠️ Bẫy production: Thấy `-/+` (force replacement) là phải dừng lại đọc kỹ. Ví dụ đổi `availability_zone` của EC2 → Terraform **xoá instance cũ tạo instance mới** → mất dữ liệu trên ổ đĩa ephemeral và downtime. Plan luôn ghi rõ dòng `# forces replacement`.

Lưu plan để apply đúng cái đã review (chuẩn cho CI/CD):

```bash
terraform plan -out=tfplan
terraform apply tfplan       # apply CHÍNH XÁC plan đã lưu, không hỏi lại
```

---

## 7. Drift — lệch giữa code và thực tế

**Drift** = trạng thái thật trên AWS khác với state/code, thường do ai đó sửa tay trên console hoặc dịch vụ khác thay đổi resource.

```bash
terraform plan                 # plan tự refresh state, hiện drift dưới dạng diff
terraform plan -refresh-only   # CHỈ xem drift, không đề xuất đổi gì
```

Khi phát hiện drift, có 2 hướng:
- **Code là chân lý** (khuyến nghị): chạy `apply` để kéo thực tế về đúng code.
- **Thực tế là đúng**: cập nhật code cho khớp, hoặc `terraform apply -refresh-only` để nạp thay đổi vào state.

> ⚠️ Bẫy production: Drift kinh điển — dev sửa tay rule security group trên console để "fix gấp", quên báo. Lần `apply` tiếp theo của người khác sẽ **âm thầm xoá rule đó** (vì code không có). Chính sách: **mọi thay đổi đi qua Terraform**, hoặc bật quy trình phát hiện drift định kỳ.

---

## 8. Workspace — nhiều môi trường

Workspace cho phép cùng một codebase quản lý nhiều state độc lập (dev/staging/prod).

```bash
terraform workspace new staging
terraform workspace list      # * đánh dấu workspace hiện tại
terraform workspace select prod
```

Trong code, lấy tên workspace qua `terraform.workspace`:

```hcl
resource "aws_instance" "web" {
  instance_type = terraform.workspace == "prod" ? "t3.large" : "t3.micro"
  tags          = { Name = "web-${terraform.workspace}" }
}
```

> ⚠️ Bẫy production: Workspace **phù hợp cho khác biệt nhỏ** (đổi size, đổi count). Nhiều team production lại **không dùng workspace cho prod** vì dễ nhầm workspace mà `apply` nhầm môi trường. Mẫu phổ biến hơn: **thư mục riêng cho mỗi env** (`envs/dev`, `envs/prod`) với backend `key` khác nhau — cô lập rõ ràng, khó bấm nhầm.

---

## 9. Import — đưa resource có sẵn vào state

Khi đã có resource tạo tay và muốn Terraform quản lý nó (không xoá đi tạo lại):

Cách mới (Terraform 1.5+) — **import block**, an toàn vì đi qua `plan`:

```hcl
import {
  to = aws_instance.web
  id = "i-0abc123def456"
}

resource "aws_instance" "web" {
  # phải viết tay khối resource khớp với instance thật
}
```

```bash
terraform plan      # xem Terraform định import gì
terraform apply     # thực hiện import
```

Cách cũ (vẫn dùng nhiều): `terraform import aws_instance.web i-0abc123def456`.

> 💡 Ghi nhớ: Import **không tự sinh code**. Bạn vẫn phải viết block `resource` cho khớp. Terraform 1.5+ có cờ `-generate-config-out=gen.tf` để sinh khung HCL ban đầu, nhưng cần dọn lại bằng tay.

---

## 10. Ví dụ hoàn chỉnh: VPC + EC2

Ghép tất cả lại — dựng 1 VPC, 1 public subnet, internet gateway, security group và 1 EC2 chạy web.

```hcl
# main.tf
data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  tags                 = { Name = "demo-vpc" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true
  tags                    = { Name = "demo-public" }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "web" {
  name_prefix = "web-sg-"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "SSH from office"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_cidr]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "web" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web.id]

  user_data = <<-EOF
    #!/bin/bash
    apt-get update -y && apt-get install -y nginx
    echo "Hello from Terraform" > /var/www/html/index.html
  EOF

  tags = { Name = "demo-web" }
}
```

```hcl
# variables.tf
variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}
variable "instance_type" {
  type    = string
  default = "t3.micro"
}
variable "allowed_cidr" {
  type = string
}
```

```hcl
# outputs.tf
output "web_url" {
  value = "http://${aws_instance.web.public_ip}"
}
```

Chạy:

```bash
terraform init
terraform plan -out=tfplan -var="allowed_cidr=203.0.113.10/32"
terraform apply tfplan
# ... thử nghiệm xong:
terraform destroy -var="allowed_cidr=203.0.113.10/32"
```

> ⚠️ Bẫy production: `security_group` ở trên mở SSH theo `var.allowed_cidr` — **đừng để `0.0.0.0/0`** cho cổng 22. Để cả thế giới SSH vào là lỗi bảo mật phổ biến nhất, bị scanner quét ra trong vài phút.

---

## 11. Best practices vận hành

- **Không sửa tay** (ClickOps) trên resource do Terraform quản lý. Sửa tay → drift → bị apply ghi đè.
- **Luôn review plan** trước khi apply. Trong CI/CD: `plan` chạy trên PR, người duyệt đọc diff, `apply` chỉ chạy sau khi merge.
- **Pin version** cả Terraform lẫn provider lẫn module registry.
- **Remote backend + lock** ngay từ đầu, kể cả project nhỏ.
- **State có secret** → mã hoá, bucket private, không log ra. Đừng commit state.
- **`fmt` + `validate`** trong pre-commit hook; thêm `tflint` (lint) và `tfsec`/`checkov` (quét bảo mật).
- **Module nhỏ, rõ trách nhiệm**; tách state theo domain (network / app / data) để blast radius nhỏ.
- **Đừng `apply -auto-approve` bằng tay** ở local cho prod. Để CI/CD apply từ plan đã lưu.
- **`prevent_destroy`** cho resource sống còn (DB prod):

```hcl
resource "aws_db_instance" "main" {
  # ...
  lifecycle {
    prevent_destroy = true   # apply/destroy nào định xoá → báo lỗi, chặn lại
  }
}
```

> 💡 Ghi nhớ: 3 nguyên tắc cốt lõi — **state remote + có lock**, **mọi thay đổi qua plan đã review**, **không bao giờ sửa tay**. Giữ được 3 cái này là tránh 90% sự cố Terraform trong production.

---

## 12. Liên hệ sang AWS

Terraform là cách phổ biến nhất để dựng và vận hành hạ tầng AWS thật. Liên hệ trực tiếp:

| Khái niệm trong bài | Trên AWS |
|---------------------|----------|
| Remote backend | **S3** (state) + **DynamoDB** hoặc S3 lockfile (lock) |
| IaC "thuần AWS" thay thế | **CloudFormation** (declarative, YAML/JSON), **CDK** (code TS/Python sinh CloudFormation), **SAM** (serverless) |
| Provider credentials | **IAM role** (OIDC từ GitHub Actions → AssumeRole, không lưu access key tĩnh) |
| Resource ví dụ | VPC, Subnet, IGW, Security Group, EC2 — đúng các service nền tảng |
| Quét bảo mật IaC | `tfsec`/`checkov` chạy local; **AWS Config** kiểm tra drift/compliance sau khi dựng |
| Dựng cluster container | Terraform thường dùng để tạo **EKS** (Kubernetes) và **ECS**; cluster dựng xong thì app deploy qua pipeline |
| Pipeline apply | **CodePipeline + CodeBuild** chạy `terraform plan/apply`, hoặc GitHub Actions với OIDC; artifact plan lưu ở **S3** |

So sánh nhanh **Terraform vs CloudFormation**: Terraform đa-cloud, cú pháp HCL gọn, ecosystem module lớn, nhưng bạn tự quản state; CloudFormation native AWS, AWS tự quản state và rollback, nhưng chỉ AWS và verbose hơn. Trong thực tế nhiều team AWS vẫn chọn Terraform/OpenTofu vì module ecosystem và khả năng dùng chung quy trình cho nhiều cloud.

Bài tiếp theo sẽ dùng chính tư duy declarative này cho **Kubernetes** — nơi bạn khai báo trạng thái mong muốn của workload và để control plane tự hội tụ về đó.
