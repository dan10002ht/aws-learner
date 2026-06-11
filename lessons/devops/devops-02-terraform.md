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

> 💡 Ghi nhớ: Từ khi S3 hỗ trợ **conditional writes** (cuối 2024), Terraform 1.10+ có thể lock state bằng chính S3 với tham số `use_lockfile = true`, **không còn bắt buộc DynamoDB**. Nhưng rất nhiều codebase hiện tại vẫn dùng DynamoDB — bạn cần biết cả hai.

> ⚠️ Bẫy production: Backend **không nhận biến** (`variable`) — block `backend` phải là giá trị literal. Cần tham số hoá thì dùng `terraform init -backend-config=prod.hcl` với partial configuration.

---

## 5. Module — tái sử dụng

Module = một thư mục chứa `.tf`, đóng gói thành khối tái dùng được. Code bạn viết ở mục 3 thực ra đã là **root module**. Tách logic chung (vd: "1 VPC chuẩn", "1 web server") ra module con để dùng lại cho dev/staging/prod.

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
