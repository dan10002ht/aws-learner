# Bài 12 — Compute mở rộng (Containers, Lambda, Beanstalk, Auto Scaling, ELB)

> Map exam: **CLF-C02 Task 3.3 — Identify AWS compute services**. Bài 8 đã học EC2 (instance, pricing). Bài này phủ phần còn lại của task 3.3.

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 430" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cách Auto Scaling Group hoạt động</title>
  <desc>Launch Template định nghĩa instance; ASG giữ Min/Desired/Max và trải instance qua nhiều AZ; CloudWatch metric kích hoạt scaling policy (target tracking, step, scheduled, predictive); health check tự thay instance unhealthy.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Auto Scaling Group hoạt động thế nào</text>
  <defs>
    <marker id="asgArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <rect x="16" y="42" width="190" height="66" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="28" y="62" font-size="12.5" font-weight="700" fill="currentColor">Launch Template</text>
  <text x="28" y="80" font-size="10.5" fill="currentColor" opacity="0.72">AMI · instance type</text>
  <text x="28" y="96" font-size="10.5" fill="currentColor" opacity="0.72">Security Group · IAM role</text>
  <line x1="111" y1="108" x2="111" y2="130" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#asgArr)"/>
  <text x="120" y="124" font-size="10" fill="currentColor" opacity="0.7">khuôn tạo</text>
  <rect x="14" y="132" width="430" height="222" rx="11" fill="#3b82f6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="28" y="154" font-size="12.5" font-weight="700" fill="currentColor">Auto Scaling Group</text>
  <g font-size="11" fill="currentColor">
    <rect x="28" y="164" width="120" height="26" rx="6" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="88" y="181" font-size="11" text-anchor="middle" fill="currentColor">Min 2</text>
    <rect x="156" y="164" width="120" height="26" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="216" y="181" font-size="11" text-anchor="middle" font-weight="700" fill="currentColor">Desired 3</text>
    <rect x="284" y="164" width="120" height="26" rx="6" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="344" y="181" font-size="11" text-anchor="middle" fill="currentColor">Max 6</text>
  </g>
  <g>
    <rect x="28" y="206" width="120" height="94" rx="8" fill="#10b981" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="88" y="224" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">AZ-a</text>
    <rect x="44" y="234" width="88" height="30" rx="6" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="88" y="253" font-size="10.5" text-anchor="middle" fill="currentColor">EC2/ECS</text>
    <rect x="156" y="206" width="120" height="94" rx="8" fill="#10b981" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="216" y="224" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">AZ-b</text>
    <rect x="172" y="234" width="88" height="30" rx="6" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="216" y="253" font-size="10.5" text-anchor="middle" fill="currentColor">EC2/ECS</text>
    <rect x="284" y="206" width="120" height="94" rx="8" fill="#10b981" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="344" y="224" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">AZ-c</text>
    <rect x="300" y="234" width="88" height="32" rx="6" fill="#f59e0b" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 3"/>
    <text x="344" y="249" font-size="9.5" text-anchor="middle" fill="currentColor">unhealthy</text>
    <text x="344" y="260" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">→ bị thay</text>
  </g>
  <text x="28" y="320" font-size="10" fill="currentColor" opacity="0.72">Health check (EC2/ELB) thấy instance hỏng</text>
  <text x="28" y="336" font-size="10" fill="currentColor" opacity="0.72">→ ASG tự tạo instance mới (cross-AZ cân bằng)</text>
  <rect x="466" y="42" width="240" height="66" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="478" y="62" font-size="12.5" font-weight="700" fill="currentColor">CloudWatch metric</text>
  <text x="478" y="80" font-size="10.5" fill="currentColor" opacity="0.72">CPU · request count · queue</text>
  <text x="478" y="96" font-size="10.5" fill="currentColor" opacity="0.72">vượt ngưỡng → báo động</text>
  <rect x="466" y="132" width="240" height="222" rx="11" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="478" y="154" font-size="12.5" font-weight="700" fill="currentColor">Scaling policy</text>
  <g font-size="10.5" fill="currentColor">
    <rect x="478" y="164" width="216" height="40" rx="6" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="488" y="180" font-weight="700">Target tracking</text>
    <text x="488" y="196" opacity="0.72">giữ metric (CPU 50%)</text>
    <rect x="478" y="210" width="216" height="40" rx="6" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="488" y="226" font-weight="700">Step scaling</text>
    <text x="488" y="242" opacity="0.72">CPU trên 70% +2, trên 90% +5</text>
    <rect x="478" y="256" width="216" height="40" rx="6" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="488" y="272" font-weight="700">Scheduled</text>
    <text x="488" y="288" opacity="0.72">9h tăng · đêm giảm</text>
    <rect x="478" y="302" width="216" height="40" rx="6" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="488" y="318" font-weight="700">Predictive</text>
    <text x="488" y="334" opacity="0.72">ML dự đoán trước</text>
  </g>
  <line x1="586" y1="108" x2="586" y2="130" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#asgArr)"/>
  <line x1="464" y1="243" x2="446" y2="200" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#asgArr)"/>
  <text x="372" y="382" font-size="10.5" fill="currentColor" opacity="0.78">Policy đổi Desired → ASG thêm/bớt instance theo template</text>
  <line x1="216" y1="354" x2="216" y2="372" stroke="currentColor" stroke-opacity="0.4"/>
  <line x1="216" y1="372" x2="366" y2="372" stroke="currentColor" stroke-opacity="0.4" marker-end="url(#asgArr)"/>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Pattern HA cổ điển trên AWS</title>
  <desc>Luồng từ User qua CloudFront (CDN, DDoS L3/4, TLS), tới ALB multi-AZ (routing L7, WAF), tới ASG chạy EC2/ECS trải nhiều AZ, xuống RDS Multi-AZ với standby đồng bộ ở AZ khác; mỗi tầng chú thích vai trò.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Pattern HA cổ điển — vai trò từng tầng</text>
  <defs>
    <marker id="haArr" markerWidth="11" markerHeight="11" refX="8" refY="3.5" orient="auto"><path d="M0 0 L8 3.5 L0 7 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <rect x="280" y="40" width="160" height="40" rx="9" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="65" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">User</text>
  <line x1="360" y1="80" x2="360" y2="104" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#haArr)"/>
  <rect x="220" y="106" width="280" height="56" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="360" y="128" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">CloudFront (CDN)</text>
  <text x="360" y="148" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">cache edge · DDoS L3/4 · TLS</text>
  <line x1="360" y1="162" x2="360" y2="186" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#haArr)"/>
  <rect x="220" y="188" width="280" height="56" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="360" y="210" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">ALB (multi-AZ)</text>
  <text x="360" y="230" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">routing L7 · TLS termination · WAF</text>
  <rect x="60" y="280" width="600" height="110" rx="11" fill="#10b981" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="74" y="300" font-size="11.5" font-weight="700" fill="currentColor">Auto Scaling Group — EC2/ECS trải nhiều AZ</text>
  <g>
    <rect x="80" y="312" width="150" height="62" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="155" y="333" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">AZ-a</text>
    <text x="155" y="352" font-size="11" text-anchor="middle" fill="currentColor">EC2/ECS</text>
    <rect x="285" y="312" width="150" height="62" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="333" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">AZ-b</text>
    <text x="360" y="352" font-size="11" text-anchor="middle" fill="currentColor">EC2/ECS</text>
    <rect x="490" y="312" width="150" height="62" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="565" y="333" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">AZ-c</text>
    <text x="565" y="352" font-size="11" text-anchor="middle" fill="currentColor">EC2/ECS</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <path d="M300 246 L155 312" marker-end="url(#haArr)"/>
    <path d="M360 246 L360 312" marker-end="url(#haArr)"/>
    <path d="M420 246 L565 312" marker-end="url(#haArr)"/>
  </g>
  <line x1="360" y1="390" x2="360" y2="414" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#haArr)"/>
  <rect x="200" y="416" width="320" height="50" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="280" y="445" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">RDS primary</text>
  <text x="420" y="438" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">standby AZ khác</text>
  <text x="420" y="453" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">sync replica · auto failover</text>
  <line x1="356" y1="441" x2="375" y2="441" stroke="currentColor" stroke-opacity="0.45" stroke-dasharray="3 3"/>
</svg>

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
