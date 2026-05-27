# Bài 11 — Compute mở rộng (Containers, Lambda, Beanstalk, Auto Scaling, ELB)

> Map exam: **CLF-C02 Task 3.3 — Identify AWS compute services**. Bài 4 đã học EC2 (instance, pricing). Bài này phủ phần còn lại của task 3.3.

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân biệt **EC2 / ECS / EKS / Fargate / Lambda / Beanstalk / Lightsail / Batch** với use case rõ.
- Hiểu **ECS vs EKS**: khi nào K8s, khi nào ECS.
- Phân biệt **EC2 launch type** vs **Fargate launch type** trong ECS/EKS.
- Hiểu **Auto Scaling Group (ASG)** + tự thiết kế scaling policy.
- Phân biệt **ALB / NLB / GLB / CLB** — 4 loại Elastic Load Balancer.

---

## 2. Lý thuyết

### 2.0 Analogy — Compute như "phương tiện giao hàng"

Bạn cần ship 1 gói hàng:

| Phương tiện | Compute option | Khi nào dùng |
|--------------|----------------|---------------|
| Tự lái xe tải | **EC2** | Cần full control (kernel, OS) |
| Thuê tài xế lái xe của bạn | **ECS on EC2** | Container nhưng bạn quản node |
| Gọi Grab giao hàng | **ECS on Fargate / Lambda** | Không cần quan tâm xe, chỉ trả tiền chuyến đi |
| Đặt dịch vụ giao hàng K8s-experienced | **EKS** | Đội đã quen K8s, multi-cloud |
| Mua gói chuyển phát trọn gói | **Elastic Beanstalk** | Deploy app, AWS lo tất cả |
| Mua app giao hàng (Grab có sẵn) | **Lightsail** | Đơn giản, fixed price, không phải nghĩ nhiều |
| Xe tải batch chở 1 lô hàng đêm | **AWS Batch** | Batch job hàng loạt |

---

### 2.1 So sánh tất cả compute service

| Service | Loại | Bạn quản | AWS quản | Use case |
|---------|------|----------|----------|----------|
| **EC2** | IaaS, VM | OS, runtime, app | Hypervisor, hardware | Full control |
| **ECS on EC2** | Container orchestration | EC2 nodes + container | Control plane | Đã có K8s/Docker knowledge, muốn quản node |
| **ECS on Fargate** | Serverless container | Container image + task def | Mọi thứ khác | Serverless container, đơn giản |
| **EKS on EC2** | Managed K8s | Node + worker + K8s app | K8s control plane | Multi-cloud K8s, đội đã quen K8s |
| **EKS on Fargate** | Serverless K8s | K8s manifest | Mọi thứ khác | K8s nhưng không quản node |
| **AWS Lambda** | FaaS | Code + dependency | Mọi thứ khác | Event-driven, < 15 phút |
| **Elastic Beanstalk** | PaaS | Code (app) | EC2 + LB + ASG + monitor | Web app deploy nhanh |
| **AWS Lightsail** | VPS đơn giản | App | EC2 + IP + DB | Dev side project, fixed $3.5/tháng |
| **AWS Batch** | Batch compute | Job definition | Schedule, retry, EC2/Fargate underneath | HPC, render, ETL batch |
| **AWS Outposts** | On-prem AWS rack | App | Rack | Workload phải on-prem |
| **AWS Wavelength** | 5G edge compute | App | Hardware nhúng 5G MEC | Ultra-low-latency mobile |
| **AWS Local Zones** | Metro mini-region | App | Hardware ở metro | Low latency cho 1 thành phố |

---

### 2.2 Containers — ECR / ECS / EKS / Fargate

#### Amazon ECR (Elastic Container Registry)
- **Docker registry private** managed bởi AWS, tích hợp IAM.
- Tương đương Docker Hub private + ECR scan vulnerability tự động.
- Tính tiền theo dung lượng GB lưu + egress.

#### Amazon ECS (Elastic Container Service)
- **AWS-proprietary** orchestrator. **Đơn giản hơn K8s rất nhiều**.
- 2 launch type:
  - **EC2** — bạn quản EC2 node, ECS dispatch container lên node.
  - **Fargate** — AWS quản node, bạn chỉ định CPU/RAM per task.
- Concept: **Task Definition** (như Docker Compose) → **Task** (1 instance) → **Service** (n task) → **Cluster** (group of nodes).

#### Amazon EKS (Elastic Kubernetes Service)
- **Managed Kubernetes** control plane (kube-apiserver, etcd, scheduler).
- Bạn manifest YAML K8s như bình thường (`kubectl apply`).
- Launch type giống ECS: **EC2** hoặc **Fargate**.
- Trả $0.10/h cho control plane + $ cho node/Fargate.
- **Khi nào dùng EKS thay ECS**: đội đã quen K8s, multi-cloud, ecosystem K8s (Helm, Istio, ArgoCD).

#### AWS Fargate
- **Serverless compute for containers** — chạy với cả ECS và EKS.
- Không quản node, không SSH, không patch OS.
- Trả per task per second (vCPU + RAM).
- Đắt hơn EC2 tự quản tầm 20% nhưng giảm operational burden.

**Mẹo nhớ**:
- "Container + AWS-native + đơn giản" → **ECS**.
- "Container + K8s + multi-cloud" → **EKS**.
- "Container + không quản server" → **Fargate** (cả ECS và EKS đều dùng được).

---

### 2.3 AWS Lambda (Function-as-a-Service)

**Đặc điểm**:
- **Runtime managed** (Node.js, Python, Java, Go, .NET, Ruby, custom).
- **Trigger từ ~200 service AWS** (S3, SNS, SQS, API Gateway, EventBridge, DynamoDB Streams, …).
- **Max runtime 15 phút**, **max memory 10 GB**, **package 250 MB unzipped** (hoặc 10 GB container image).
- **Stateless** — không lưu state giữa invocation. Dùng DynamoDB / S3 cho state.
- **Cold start** ~100ms-1s tùy runtime. Provisioned Concurrency để loại bỏ cold start.
- **Pricing**: $0.20 / 1M request + $0.0000166667 / GB-second. Free tier 1M request/tháng vĩnh viễn.

**Khi dùng Lambda**:
- ✅ Event-driven, traffic không đều.
- ✅ API backend cho mobile/web (qua API Gateway).
- ✅ ETL nhỏ, file processing.
- ❌ Long-running task > 15 phút → dùng **AWS Batch / ECS / Step Functions**.
- ❌ Stateful workload (game server).

---

### 2.4 Elastic Beanstalk (PaaS)

- Deploy app web (Java, .NET, PHP, Node.js, Python, Ruby, Go, Docker) chỉ với 1 lệnh `eb deploy`.
- AWS tự tạo **EC2 + ASG + ELB + CloudWatch + RDS (option)**.
- **Free** — chỉ trả tiền resource bên dưới.
- Có console + CLI (`eb`).
- Dễ migrate khỏi Beanstalk (vì chỉ là wrapper) — không vendor lock-in nặng.

**Beanstalk vs Fargate vs Lambda**:
- Beanstalk = AWS quản hạ tầng nhưng vẫn có VM thấy được.
- Fargate = không có VM (chỉ task).
- Lambda = không có server, không có process dài.

---

### 2.5 Amazon Lightsail (VPS đơn giản)

- **VPS giá fixed** ($3.50–$160/tháng).
- Bao gồm: instance + static IP + DNS + 1-click app (WordPress, Magento, …) + DB nhỏ option.
- **Đối tượng**: dev side project, blog cá nhân, learner mới.
- **Khác EC2**: không cần biết VPC/SG, fixed price, ít linh hoạt.

---

### 2.6 AWS Batch

- **Quản lý batch job** ở quy mô lớn.
- Bạn submit **job definition** (Docker image + command), Batch tự chọn EC2/Fargate, scale up/down.
- Underneath dùng ECS, có thể chạy **Spot** để rẻ.
- Use case: scientific computing, video transcoding, ETL nightly, ML training pipeline.
- Khác Lambda: không giới hạn 15 phút, không giới hạn memory.

---

### 2.7 Auto Scaling (ASG)

**ASG = Auto Scaling Group** — nhóm EC2 tự thay đổi số lượng theo demand.

**Thành phần**:
- **Launch Template** — định nghĩa AMI, instance type, SG, IAM role.
- **Min / Desired / Max** — số instance tối thiểu / mong muốn / tối đa.
- **Scaling policy** — khi nào scale:
  - **Target tracking** — duy trì metric (CPU 50%, requests 1000).
  - **Step scaling** — CPU > 70% thêm 2 instance, > 90% thêm 5.
  - **Scheduled scaling** — sáng 9h tăng, đêm giảm.
  - **Predictive scaling** — ML dự đoán.
- **Health check** — EC2 status hoặc ELB target health.

**ASG + ELB** = pattern HA cổ điển: ALB → ASG (EC2 nhiều AZ) → RDS Multi-AZ.

**Lưu ý exam**:
- **ASG miễn phí**, chỉ trả tiền EC2.
- **ASG cross-AZ tự cân bằng** — nếu 1 AZ chết, instance ở AZ khác.
- **Cooldown period** mặc định 300s — tránh scale liên tục.
- **Lifecycle hook** — chạy script trước khi instance bị terminate (drain connection).

**AWS Auto Scaling** (vs **EC2 Auto Scaling**):
- **EC2 Auto Scaling** = chỉ scale EC2.
- **AWS Auto Scaling** = scale nhiều resource (EC2, ECS, DynamoDB, Aurora replica) qua 1 dashboard.

---

### 2.8 Elastic Load Balancer (ELB) — 4 loại

| Loại | Layer OSI | Giao thức | Đặc điểm | Use case |
|------|-----------|-----------|----------|----------|
| **Classic Load Balancer (CLB)** | L4 + L7 (cũ) | HTTP/HTTPS/TCP | Legacy, **AWS không khuyến nghị** | Chỉ giữ cho VPC EC2-Classic cũ |
| **Application Load Balancer (ALB)** | L7 | HTTP/HTTPS/gRPC/WebSocket | Path-based, host-based, header-based routing | Web app, microservices |
| **Network Load Balancer (NLB)** | L4 | TCP/UDP/TLS | **Cực nhanh** (millions req/s), **static IP / Elastic IP** per AZ | Gaming, IoT, low-latency, white-list IP |
| **Gateway Load Balancer (GWLB)** | L3 | IP | Đưa traffic qua **third-party firewall/IDS** | Insert virtual appliance (Palo Alto, Check Point) |

**ALB features hay ra đề**:
- Path routing (`/api/*` → service A, `/web/*` → service B).
- Host routing (`api.example.com` vs `web.example.com`).
- HTTPS termination (cert từ ACM).
- WAF integration.
- Target type: instance / IP / **Lambda** / ECS task.
- Sticky session (cookie).

**NLB features**:
- Static IP per AZ (white-list được).
- Source IP preserve (target nhìn thấy client IP gốc).
- Hỗ trợ UDP (DNS, IoT).

**Health check**: cả ALB + NLB tự ping target, instance unhealthy → ngừng route đến.

---

### 2.9 Pattern HA cổ điển

```
                User
                  │
              CloudFront (CDN)
                  │
                ALB (multi-AZ)
            ┌────┴────┐
            │         │
        EC2/ECS    EC2/ECS    ← ASG
            │         │
            └────┬────┘
              RDS Multi-AZ
```

Pattern này **xuất hiện trong 30%+ câu thi**. Phải hiểu role từng layer:
- CloudFront: cache + DDoS L3/4 + TLS.
- ALB: L7 routing + TLS termination + WAF.
- ASG: tự scale + tự thay instance unhealthy.
- RDS Multi-AZ: HA database (sync replica AZ khác).

---

## 3. Hands-on có account

### Lab 1 — ECS Fargate hello world (30 phút)
1. ECR → create repository → push Docker image (`nginx:latest`).
2. ECS → create cluster (Fargate type).
3. Task definition → CPU 0.25 vCPU, Memory 512 MB, image từ ECR.
4. Run task → mở public IP → xem nginx welcome.
5. Tear down.

### Lab 2 — Lambda + API Gateway hello (15 phút)
1. Lambda → create function → Python → paste:
   ```python
   def handler(event, context):
       return {"statusCode": 200, "body": "hello from Lambda"}
   ```
2. Add trigger → API Gateway → REST API → deploy.
3. Hit URL từ browser.

### Lab 3 — ASG + ALB (45 phút)
1. EC2 → Launch Template → Amazon Linux 2023 + user data:
   ```bash
   #!/bin/bash
   yum install -y httpd
   echo "<h1>$(hostname)</h1>" > /var/www/html/index.html
   systemctl enable --now httpd
   ```
2. ASG → 2 min, 4 max, 2 desired, 2 AZ.
3. ALB → target group HTTP:80 → attach ASG.
4. Truy cập ALB DNS → refresh → thấy hostname đổi (round-robin).
5. Stress test bằng `ab` → watch ASG scale-out.

### Lab 4 — Elastic Beanstalk (20 phút)
1. `eb init` → chọn platform Python.
2. Code 1 Flask app 5 dòng.
3. `eb create` → AWS tự tạo EC2 + ALB + ASG + Beanstalk env.
4. `eb deploy` lần 2 sau khi sửa code.
5. `eb terminate` để dọn dẹp.

---

## 4. Hands-on không tốn tiền

### Option A — LocalStack
- `awslocal lambda create-function …`
- `awslocal ecs create-cluster …`

### Option B — Docker desktop + K3s
- Học K8s căn bản local trước khi vào EKS.

### Option C — AWS Skill Builder
- "Introduction to Amazon Elastic Container Service" (free, 1h).
- "AWS Lambda Foundations" (free, 1.5h).

---

## 5. Tự kiểm tra (có đáp án)

1. Bạn muốn chạy container nhưng không muốn quản lý EC2 node. Service?
   <details><summary>Trả lời</summary>**Fargate** (chạy với ECS hoặc EKS).</details>

2. App cần latency cực thấp + static IP để partner white-list. Loại LB?
   <details><summary>Trả lời</summary>**NLB (Network Load Balancer)** — L4, static IP per AZ.</details>

3. Lambda max runtime?
   <details><summary>Trả lời</summary>**15 phút**.</details>

4. Đề: *"A startup deploys a Python web app and wants AWS to manage EC2, load balancer, and auto-scaling automatically. Which service?"*
   <details><summary>Trả lời</summary>**AWS Elastic Beanstalk** — PaaS dành cho web app, AWS tự tạo và quản EC2+ALB+ASG.</details>

5. ECS vs EKS, khác cốt lõi?
   <details><summary>Trả lời</summary>**ECS** = AWS-proprietary orchestrator, đơn giản. **EKS** = managed Kubernetes (chuẩn open-source), phù hợp đội đã quen K8s và muốn portability đa cloud.</details>

6. Đề: *"Which service allows you to insert third-party virtual appliances (firewall, IDS) into traffic flow?"*
   <details><summary>Trả lời</summary>**Gateway Load Balancer (GWLB)**.</details>

7. ASG có miễn phí không?
   <details><summary>Trả lời</summary>**Miễn phí** — chỉ trả tiền EC2 nó launch.</details>

8. Đề: *"What's the simplest way to host a WordPress site for $5/month with 1-click setup?"*
   <details><summary>Trả lời</summary>**Amazon Lightsail** với blueprint WordPress.</details>

9. Đề: *"A scientific batch job needs 200 CPU for 3 hours, can use Spot, must retry if interrupted."*
   <details><summary>Trả lời</summary>**AWS Batch** với Spot — quản lý job, retry, scale tự động.</details>

10. ALB route theo path `/api/*` cho service A, `/web/*` cho service B — đúng/sai?
    <details><summary>Trả lời</summary>**Đúng** — ALB hỗ trợ path-based routing.</details>

---

## 6. Đối chiếu GCP & Azure

| Service | AWS | GCP | Azure |
|---------|-----|-----|-------|
| VM | EC2 | Compute Engine | Virtual Machines |
| Container orchestrator | ECS | (Cloud Run for Anthos cũ) | Azure Container Instances/Apps |
| Managed K8s | EKS | GKE (phổ biến nhất) | AKS |
| Serverless container | Fargate | **Cloud Run** | Container Apps |
| FaaS | Lambda | Cloud Functions | Azure Functions |
| PaaS | Beanstalk | App Engine | App Service |
| VPS đơn giản | Lightsail | (không có equivalent trực tiếp) | (App Service Basic) |
| Batch | AWS Batch | Batch | Azure Batch |
| LB L7 | ALB | Cloud Load Balancing (HTTP(S)) | App Gateway |
| LB L4 | NLB | Cloud Load Balancing (TCP/UDP) | Azure Load Balancer |

---

## 7. Lưu ý khi thi CLF-C02

- Thuộc **use case 1 dòng** cho mỗi compute service.
- **Fargate = serverless container** (cả ECS + EKS đều xài).
- **Lambda max 15 phút** — đề hay bẫy "1 hour job" → loại Lambda.
- **ALB = L7** (path/host route, HTTP), **NLB = L4** (TCP/UDP, static IP), **GWLB = L3** (third-party appliance), **CLB = legacy**.
- **Auto Scaling = elasticity** (knowledge bullet 3.3).
- **Beanstalk free**, chỉ trả resource. Service được liệt kê "free forever".
- **Lightsail = fixed price VPS**, không cần biết VPC/SG.
- **Batch** ≠ **Lambda** — Batch cho job dài + nhiều job song song.

## 8. Lưu ý khi thi SAA-C03 (sâu hơn)

- **ALB target = Lambda** — không cần API Gateway, ALB trigger Lambda được.
- **NLB preserve source IP**, ALB **không** (trừ khi dùng X-Forwarded-For).
- **ASG mixed instance** (mix On-Demand + Spot, mix instance type) để giảm cost + tăng resilience.
- **Lambda concurrency**: reserved vs provisioned.
- **Lambda cold start** mitigations: provisioned concurrency, SnapStart (Java).
- **EKS Fargate vs EKS Managed Node Group vs EKS self-managed**.

## 9. Lưu ý khi đi làm

- **Start với serverless** (Lambda/Fargate) nếu workload phù hợp — giảm 80% operational work.
- **Beanstalk** tốt cho early-stage startup; lớn dần thì migrate sang ECS/EKS.
- **ASG scale policy** — bắt đầu bằng target tracking CPU 60%, refine dần.
- **ALB + WAF + Shield Advanced** ở production-facing.
- **EKS đắt** ($73/tháng control plane mỗi cluster) — không nên tạo nhiều cluster cho dev/test.
- **Cost trap**: NAT Gateway cho VPC private subnet → EKS Fargate vẫn tốn NAT cost; cân nhắc **VPC endpoint**.

---

## 10. Flashcard

- **EC2** — VM, full control.
- **ECS** — AWS-native container orchestrator.
- **EKS** — managed Kubernetes.
- **Fargate** — serverless container (chạy với ECS/EKS).
- **ECR** — private Docker registry.
- **Lambda** — FaaS, ≤ 15 min, ≤ 10GB RAM, event-driven.
- **Elastic Beanstalk** — PaaS, deploy web app.
- **Lightsail** — VPS fixed price, dev/cá nhân.
- **Batch** — batch job hàng loạt, long-running.
- **ASG** — Auto Scaling Group, free.
- **ALB** — L7, path/host route, HTTP/HTTPS/gRPC.
- **NLB** — L4, static IP, TCP/UDP, ultra-fast.
- **GWLB** — L3, insert third-party appliance.
- **CLB** — legacy, không nên dùng.
- **Outposts / Local Zone / Wavelength** — compute "ngoài region": on-prem / metro / 5G.
