# AWS ↔ GCP — Bảng đối chiếu dành cho người đang làm GCP

Vì bạn đang làm việc trên GCP, việc học AWS sẽ nhanh hơn rất nhiều nếu map từng service sang khái niệm đã quen. Tài liệu này để tra nhanh, KHÔNG thay thế việc học sâu từng service AWS — vì dù giống nhau ~70% về mục đích, chi tiết cấu hình / pricing / quota / IAM model **khác nhau đáng kể**, và đề thi AWS hỏi đúng cái khác nhau đó.

---

## 1. Những điểm "khác căn bản" cần nhớ (bẫy của người từ GCP qua)

| Khái niệm | GCP | AWS | Cảnh báo |
|-----------|-----|-----|----------|
| Tổ chức | Organization → **Folder** → **Project** → Resource | Organization → **OU** → **Account** → Resource | AWS "Account" ≈ GCP "Project". Mọi isolation ở AWS là **Account**, không phải region. |
| Billing | 1 Billing Account gắn nhiều Project | **Per-account** + consolidated billing qua Organizations | Ở AWS, nhiều team = nhiều Account riêng là best practice. |
| IAM | Role-based + principal email, **policy gắn resource** | Policy JSON (identity-based hoặc resource-based), **evaluation có Deny override** | AWS phức tạp hơn: SCP + permission boundary + resource policy + session policy. GCP không có khái niệm tương tự trực tiếp. |
| IAM "Role" | = tập hợp permission | = **identity** có thể assume (không phải permission set) — permission set ở AWS gọi là **Policy** | Đây là bẫy #1. "IAM Role" AWS ≠ "IAM Role" GCP. |
| Default network | Auto-mode VPC, subnet mỗi region | Default VPC có nhưng **khuyên tạo mới**, subnet **per-AZ không per-region** | AWS subnet gắn với **1 AZ cụ thể**, không phải cả region như GCP. |
| Load Balancer | Global LB (anycast IP) sẵn có | ALB/NLB là **regional**. Muốn global → **Global Accelerator** hoặc **CloudFront** | Bẫy hay ra SAA. |
| Object storage region | Bucket có thể **multi-region** (us, eu, asia) | Bucket gắn **1 region cố định**, muốn multi-region phải **CRR/MRAP** | |
| Serverless | Cloud Run = container serverless auto-scale 0→N | **App Runner** hoặc **ECS Fargate**, KHÔNG auto scale tới 0 (trừ Lambda) | Lambda ≈ Cloud Functions, không ≈ Cloud Run. |
| Network pricing | Egress premium vs standard tier | Không có "tier" — nhưng **cross-AZ cùng region** đã tính phí $0.01/GB (GCP intra-region free giữa zone) | **Rất dễ bị đội cost** nếu design theo mindset GCP. |

---

## 2. Service Mapping Table

### Compute

| GCP | AWS | Ghi chú |
|-----|-----|---------|
| Compute Engine (GCE) | **EC2** | Instance family AWS phức tạp hơn (t/m/c/r/g/i/x…). |
| Instance Template + MIG | **Launch Template + Auto Scaling Group** | MIG autoheal ≈ ASG health check. |
| Preemptible VM / Spot VM | **Spot Instance / Spot Fleet** | AWS Spot có warning 2 phút; GCP Spot 30s. |
| Sole-tenant node | **Dedicated Host / Dedicated Instance** | Dùng cho BYOL license. |
| Cloud Run | **App Runner** (managed) hoặc **ECS Fargate + ALB** | Lambda KHÔNG phải Cloud Run tương đương. |
| Cloud Run Jobs | **ECS Task / AWS Batch / Step Functions** | |
| Cloud Functions | **Lambda** | AWS Lambda giới hạn 15 phút, 10GB RAM. |
| GKE | **EKS** | EKS control plane **có phí $0.10/h/cluster**. GKE Autopilot ≈ **EKS Fargate**. |
| App Engine Standard/Flex | **Elastic Beanstalk** (gần nhất, deprecated-ish) | AWS push về App Runner / ECS. |
| Batch | **AWS Batch** | |

### Storage

| GCP | AWS | Ghi chú |
|-----|-----|---------|
| Cloud Storage | **S3** | S3 storage class nhiều hơn (7 class). |
| — Standard / Nearline / Coldline / Archive | **Standard / Standard-IA / Glacier Instant / Glacier Flexible / Deep Archive** | Archive GCP ≈ Deep Archive AWS. |
| Persistent Disk (zonal) | **EBS** | EBS chỉ gắn 1 EC2 (trừ io1/io2 Multi-Attach). |
| Persistent Disk (regional) | **Không có equivalent trực tiếp** | Replication tự làm, hoặc dùng EFS/FSx. |
| Local SSD | **EC2 Instance Store** | Ephemeral, mất khi stop. |
| Filestore | **EFS** (Linux NFS) / **FSx for NetApp ONTAP** | |
| Filestore (Windows via 3rd party) | **FSx for Windows** | SMB. |
| — | **FSx for Lustre** | HPC scratch, không có GCP native. |
| Storage Transfer Service | **DataSync** | |
| Transfer Appliance | **Snowball / Snowcone / Snowmobile** | |
| Backup and DR | **AWS Backup** | |

### Database

| GCP | AWS | Ghi chú |
|-----|-----|---------|
| Cloud SQL (MySQL/PG/SQL Server) | **RDS** | AWS có Multi-AZ + Read Replica riêng biệt. |
| Cloud SQL + HA | **RDS Multi-AZ** | HA khác Read Replica. |
| AlloyDB / Spanner | **Aurora** (regional) / **Aurora Global Database** | Spanner ≈ Aurora Global nhưng strong consistency (Aurora eventual read replica). |
| Firestore / Datastore | **DynamoDB** | DDB cần hiểu partition key, GSI/LSI. |
| Bigtable | **DynamoDB** (phần nào) hoặc **Keyspaces** (Cassandra) | |
| Memorystore (Redis/Memcached) | **ElastiCache** (Redis/Memcached) | |
| BigQuery | **Redshift** (managed) hoặc **Athena + S3** (serverless query) | Athena ≈ BigQuery serverless feeling; Redshift cần cluster. |
| Dataflow | **Kinesis Data Analytics** / **Glue Streaming** / **EMR** | |
| Dataproc | **EMR** | |
| Pub/Sub | **SNS + SQS** hoặc **EventBridge** hoặc **Kinesis** | Pub/Sub = hybrid. Stream nặng → Kinesis; event routing → EventBridge; fanout → SNS. |
| Dataplex / Data Catalog | **Lake Formation + Glue Data Catalog** | |
| Looker / Data Studio | **QuickSight** | |

### Networking

| GCP | AWS | Ghi chú |
|-----|-----|---------|
| VPC (global) | **VPC (regional)** | Đây là khác biệt lớn nhất về network. |
| Subnet (regional) | **Subnet (per-AZ)** | AWS bạn phải tạo subnet mỗi AZ. |
| Cloud NAT | **NAT Gateway** | NAT GW AWS per-AZ, có phí $/h + $/GB. |
| Cloud Router (BGP) | **VGW / TGW với BGP** | |
| VPC Peering | **VPC Peering** | AWS không transitive, phải TGW. |
| Shared VPC | **VPC Sharing (via RAM)** | |
| Network Connectivity Center | **Transit Gateway** (+ Cloud WAN) | |
| Cloud VPN | **Site-to-Site VPN** | |
| Cloud Interconnect (Dedicated/Partner) | **Direct Connect** | |
| Cloud Load Balancing (Global HTTPS) | **CloudFront + ALB** hoặc **Global Accelerator + ALB** | Không có "Global LB" 1 service duy nhất. |
| Regional Network LB | **NLB** | |
| Regional Internal LB | **Internal ALB/NLB** | |
| Cloud CDN | **CloudFront** | |
| Cloud Armor | **WAF + Shield** | Shield Advanced $3k/tháng. |
| Private Service Connect | **PrivateLink (Interface VPC Endpoint)** | |
| Cloud DNS | **Route 53** | R53 có 7 routing policy + domain registrar. |
| Service Directory | **Cloud Map** | |

### Identity & Security

| GCP | AWS | Ghi chú |
|-----|-----|---------|
| IAM (per-project) | **IAM (per-account) + SCP (Organizations)** | |
| Workload Identity Federation | **IAM Roles Anywhere / OIDC Federation** | |
| Service Account | **IAM Role** (assumed by service/EC2/Lambda) | Đừng nhầm với IAM Role GCP (= permission set). |
| Cloud KMS | **KMS** | |
| Cloud HSM | **CloudHSM** | |
| Secret Manager | **Secrets Manager** (auto-rotate) hoặc **Parameter Store SecureString** (rẻ, no auto-rotate) | |
| Identity Platform / Firebase Auth | **Cognito User Pool** | |
| Identity-Aware Proxy (IAP) | **ALB + Cognito** hoặc **VPN + SSM** | |
| Security Command Center | **Security Hub + GuardDuty + Inspector + Macie** | AWS tách nhỏ nhiều service. |
| Chronicle / SCC Premium | **Security Hub + Detective** | |
| Binary Authorization | **Signer + ECR scanning + Inspector** | |
| VPC Service Controls | **VPC Endpoint Policy + aws:SourceVpce + SCP** | Không có service ngang hàng, phải combine. |
| Policy Intelligence | **IAM Access Analyzer** | |
| Audit Logs | **CloudTrail** | |
| Cloud Logging | **CloudWatch Logs** | |
| Cloud Monitoring | **CloudWatch Metrics + Alarms** | |
| Cloud Trace | **X-Ray** | |
| Cloud Profiler | **CodeGuru Profiler** | |
| Error Reporting | **CloudWatch Logs Insights** (tự query) | |

### Application / Dev

| GCP | AWS | Ghi chú |
|-----|-----|---------|
| Cloud Build | **CodeBuild** | |
| Cloud Deploy | **CodeDeploy + CodePipeline** | |
| Artifact Registry | **ECR (Docker)** + **CodeArtifact** (npm/pypi/maven) | |
| Cloud Source Repositories | **CodeCommit** | Cả 2 đều ít dùng thực tế, mọi người dùng GitHub. |
| Cloud Scheduler | **EventBridge Scheduler** | |
| Cloud Tasks | **SQS + Lambda** | |
| Workflows | **Step Functions** | Step Functions mạnh hơn, có Express workflow. |
| Eventarc | **EventBridge** | |
| Deployment Manager | **CloudFormation** | Terraform là lựa chọn tốt cho cả 2. |
| — | **CDK** (TypeScript/Python IaC) | GCP có "CDK for Terraform", không native. |

### AI / ML

| GCP | AWS | Ghi chú |
|-----|-----|---------|
| Vertex AI | **SageMaker** | |
| Vertex AI Workbench | **SageMaker Studio** | |
| AutoML | **SageMaker Canvas / AutoPilot** | |
| Vision / Video / Speech / NLP API | **Rekognition / Transcribe / Polly / Comprehend** | |
| Document AI | **Textract** | |
| Dialogflow | **Amazon Lex** | |
| Translate | **Amazon Translate** | |
| Recommendations AI | **Personalize** | |
| Vertex AI Gemini / Model Garden | **Bedrock** (Claude, Titan, Llama…) | Bedrock không có OpenAI/Gemini. |

---

## 3. Mental model conversion (khi học AWS từ nền GCP)

1. **"Project" của GCP ≈ "Account" của AWS.** Mọi isolation, billing, IAM boundary ở AWS đều ở cấp Account. Design đa môi trường ở AWS: ít nhất 3 account (dev/staging/prod) + shared services account.

2. **VPC AWS là regional, subnet là zonal (per-AZ).** Bạn KHÔNG thể có 1 subnet trải nhiều AZ như subnet GCP trải region. Thiết kế multi-AZ phải **tạo nhiều subnet**.

3. **Cross-zone/AZ có phí ở AWS.** GCP intra-region zone-to-zone free (với internal IP), AWS tính $0.01/GB mỗi chiều. **Đây là trap lớn.**

4. **IAM Role AWS ≠ IAM Role GCP.**
   - GCP "Role" = tập permission (giống `Policy` ở AWS).
   - AWS "Role" = identity tạm mà EC2/Lambda/user AssumeRole để lấy temporary credential.
   - GCP "Service Account" ≈ AWS "IAM Role" (dùng cho workload).

5. **Không có "Global Load Balancer 1 cú click" như GCP.** Global latency ở AWS = **CloudFront** (HTTP cache) + **Global Accelerator** (TCP/UDP anycast 2 static IP) + **Route 53 latency routing**.

6. **Serverless container ≠ Cloud Run.** Lambda = function (15 phút max, 10GB RAM, package nhỏ). Muốn "container scale 0→N có cold start chấp nhận được" → **App Runner** hoặc **ECS Fargate + Auto Scaling**.

7. **Object storage bucket AWS bị khoá 1 region.** Muốn "multi-region bucket" như GCP phải enable **versioning + CRR** hoặc **Multi-Region Access Point**.

8. **Pub/Sub GCP** KHÔNG có service ngang hàng duy nhất ở AWS. Phải chọn:
   - Event routing với schema + filter → **EventBridge**
   - Pure fanout → **SNS**
   - Queue với consumer pull → **SQS**
   - High throughput streaming (shard, replay, order) → **Kinesis Data Stream / MSK Kafka**

9. **BigQuery → 2 option:** Cần ANSI SQL trên S3 không manage cluster → **Athena**. Cần warehouse performance cao, có concurrency scaling, MV, stored proc → **Redshift**.

10. **Cloud Spanner không có equivalent 100%.** Gần nhất: **Aurora Global Database** (nhưng chỉ 1 primary writer, không multi-region active-active strong consistent). Hoặc **DynamoDB Global Tables** (eventually consistent).

---

## 4. Exam tip cho người từ GCP

- Khi thấy câu hỏi "global low latency API", đừng reflex chọn 1 option duy nhất như GCP LB — AWS đúng sẽ là **combo** (CloudFront + Regional ALB + Route 53).
- Nghe "auto-scale to zero container" mà đáp án có **Fargate** + **App Runner** + **EC2 ASG** + **Lambda** → **App Runner** hoặc **Lambda** tuỳ workload.
- "Cross-project access" GCP → ở AWS đọc là "cross-account access" → **AssumeRole với trust policy**.
- "VPC Service Controls" GCP → ở AWS là **VPC Endpoint Policy + S3 Bucket Policy điều kiện `aws:SourceVpce`** + **SCP**.
- Đề AWS hay hỏi **pricing chi tiết** (ví dụ `gp2` vs `gp3`, NAT GW vs VPC Endpoint cost) — GCP rarely test sâu vậy.

---

## 5. Khi đi làm (dùng cả 2 cloud)

- Multi-cloud bằng **Terraform** là cách tỉnh nhất. Tránh native IaC (CloudFormation/Deployment Manager) nếu có kế hoạch 2 cloud.
- Secret: dùng **Vault** hoặc sync giữa Secrets Manager ↔ Secret Manager.
- Network: **Cloud Interconnect + Direct Connect** qua **Megaport/Equinix** nếu cần nối 2 cloud; hoặc VPN site-to-site.
- Observability: **Datadog / Grafana Cloud / New Relic** thay vì CloudWatch + Cloud Monitoring riêng lẻ.
- CI/CD: **GitHub Actions / GitLab CI** deploy tới cả 2 thay vì CodePipeline + Cloud Build.
- Identity federation: IdP chung (Okta/Azure AD/Google Workspace) → **IAM Identity Center** (AWS) + **Workforce Identity Federation** (GCP).
