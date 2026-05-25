# Bài 12 — Auto Scaling & ELB Deep

## 1. Mục tiêu
- Thiết kế ASG production-grade: scaling policy, lifecycle hook, warm pool.
- Chọn đúng ELB: ALB / NLB / GLB.
- Hiểu **target tracking** vs **step** vs **predictive** scaling.
- Tránh các bẫy: scale-in oscillation, cold start, sticky session.

---

## 2. Auto Scaling Group (ASG)

### 2.1 Components
- **Launch Template** (recommended) hoặc Launch Configuration (deprecating). Template support versioning.
- **Min / Desired / Max capacity**.
- **VPC subnets** — multi-AZ (≥ 2).
- **Health check**: EC2 (default) hoặc ELB (recommend).
- **Cooldown** (default 300s) — wait giữa scaling actions.
- **Termination policy**: OldestInstance / NewestInstance / OldestLaunchTemplate / ClosestToNextInstanceHour / **Default** (mix).

### 2.2 Scaling policies

| Policy | Khi nào |
|--------|---------|
| **Target Tracking** | Default lựa chọn. Set target CPU 60% → ASG tự maintain. |
| **Step Scaling** | Cần fine control: spike to +5 instance nếu CPU > 80%, +10 nếu > 90%. |
| **Simple Scaling** | Legacy, không khuyến nghị (no cooldown awareness). |
| **Scheduled** | Predictable spike (Black Friday, 9AM business). |
| **Predictive** | ML-based, AWS dự đoán dựa trên 14 ngày metric. |

### 2.3 Lifecycle Hooks
- **`pending:wait`** — instance launch, wait trước khi InService → chạy script bootstrap.
- **`terminating:wait`** — wait trước khi terminate → drain connection, save state.
- Notify SNS/SQS/EventBridge.
- Default timeout 1h, max 48h.

### 2.4 Warm Pool
- Pre-initialized instance ở trạng thái **Stopped** hoặc **Hibernated**.
- Khi scale-out cần → bring from warm pool → fast (60s vs 2-3 phút launch fresh).
- Use case: app cold start lâu (Java JVM warm, large image).

### 2.5 Instance Refresh
- Replace toàn bộ instance để apply new launch template version.
- Rolling: terminate batch X% → launch new → wait healthy → tiếp.
- Better than blue/green qua ASG riêng cho 1 số case.

### 2.6 Mixed Instances Policy
- 1 ASG dùng nhiều instance type + mix On-Demand + Spot.
- **Capacity-optimized** strategy minimize Spot interruption.
- Use case: cost saving 60-90% với workload stateless.

### 2.7 ASG bẫy
- **Cooldown quá ngắn** → oscillation (scale up rồi scale down liên tục).
- **Health check EC2-only** → instance app crash nhưng EC2 OK → không bị replace. **Dùng ELB health check**.
- **Scale-in protection** off → instance đang xử lý long-running job bị kill.
- **Termination Policy Default** mix balanced — production thường set `OldestLaunchTemplate` để rolling update.

---

## 3. Elastic Load Balancer

### 3.1 So sánh 3 loại

| | **ALB** | **NLB** | **GLB** |
|--|---------|---------|---------|
| Layer | 7 | 4 | 3 |
| Protocol | HTTP/HTTPS/gRPC/WS | TCP/UDP/TLS | IP (GENEVE) |
| Static IP | DNS only | **EIP per AZ** | - |
| SSL terminate | ✅ | passthrough hoặc terminate | ❌ |
| Path/host routing | ✅ | ❌ | ❌ |
| WAF | ✅ | ❌ | ❌ |
| Sticky session | Cookie (app/duration) | Source IP | - |
| Health check | HTTP/HTTPS/TCP | HTTP/HTTPS/TCP | - |
| Cross-zone LB | Default ON, free | Default OFF, có phí cross-AZ | - |
| Latency | ~ms | **Cực thấp**, µs | - |
| Use case | Web, microservice, container | Game, IoT, extreme perf, static IP | Third-party firewall (Palo Alto, Fortinet) |

### 3.2 ALB features
- **Target groups**: EC2, IP, Lambda, container (ECS auto-register).
- **Listener rules**: path, host, header, query, source IP → forward, redirect, fixed response, auth.
- **Built-in auth**: Cognito hoặc OIDC IdP → bảo vệ app không phải code.
- **Slow start**: ramp traffic to new target gradually (warm cache).
- **WebSocket + HTTP/2 + gRPC** native.
- **Outpost / Local Zone** support.

### 3.3 NLB features
- **Static IP per AZ** (EIP) — IoT firmware hardcode IP được.
- **TLS passthrough** — không decrypt, chuyển raw tới backend.
- **TLS terminate** option cũng có.
- **Cross-zone LB OFF** mặc định → traffic AZ A chỉ vào target AZ A (giảm cross-AZ cost nhưng risk unbalanced load).
- **UDP** support (chỉ NLB).
- **Preserve client IP** native (ALB phải đọc X-Forwarded-For).

### 3.4 Sticky Session
- **ALB**:
  - **Duration-based**: cookie `AWSALB`, ALB tạo.
  - **Application-based**: app set cookie, ALB tôn trọng.
- **NLB**: source IP based (không cookie).
- ⚠️ Sticky session = chống stateless. Avoid khi có thể, dùng external session store (ElastiCache).

### 3.5 Connection Draining (Deregistration Delay)
- Khi target deregister, ELB chờ in-flight request hoàn thành.
- Default 300s, max 3600s.
- ASG terminating:wait + deregistration delay → graceful shutdown.

### 3.6 Cross-Zone Load Balancing
- ON: traffic chia đều mọi target mọi AZ.
- OFF: traffic AZ-X chỉ vào target AZ-X.
- ALB **default ON, free**. NLB **default OFF, có phí cross-AZ data** nếu bật.

---

## 4. Hands-on

### Lab 1 — ASG + ALB classic 3-tier
1. Launch Template `app-lt` với user-data nginx.
2. Target Group `app-tg` health check `/`.
3. ALB ở 2 public subnet, target group `app-tg`.
4. ASG min=2, desired=2, max=6, target tracking CPU 50%.
5. Generate load (`ab` hoặc `wrk`) → xem ASG scale out.

### Lab 2 — Lifecycle hook drain
```bash
aws autoscaling put-lifecycle-hook \
  --auto-scaling-group-name app-asg \
  --lifecycle-hook-name drain-on-terminate \
  --lifecycle-transition autoscaling:EC2_INSTANCE_TERMINATING \
  --heartbeat-timeout 300 \
  --notification-target-arn arn:aws:sns:...:drain-topic \
  --role-arn arn:aws:iam::...:role/asg-lifecycle
```

Lambda subscribe SNS → call ELB deregister → wait → complete-lifecycle-action.

### Lab 3 — Instance Refresh rolling update
```bash
aws autoscaling start-instance-refresh \
  --auto-scaling-group-name app-asg \
  --preferences MinHealthyPercentage=90,InstanceWarmup=300
```

### Lab 4 — NLB với static IP
```bash
aws elbv2 create-load-balancer --name learn-nlb --type network \
  --scheme internet-facing \
  --subnet-mappings SubnetId=subnet-a,AllocationId=eipalloc-1 \
                    SubnetId=subnet-b,AllocationId=eipalloc-2
```

### Lab 5 — Mixed instance + Spot
Launch template + ASG với:
```bash
--mixed-instances-policy '{
  "LaunchTemplate": {
    "LaunchTemplateSpecification": {"LaunchTemplateName":"app-lt","Version":"$Latest"},
    "Overrides": [
      {"InstanceType":"m6i.large"},{"InstanceType":"m6a.large"},{"InstanceType":"m7g.large"}
    ]
  },
  "InstancesDistribution": {
    "OnDemandBaseCapacity": 2,
    "OnDemandPercentageAboveBaseCapacity": 20,
    "SpotAllocationStrategy": "capacity-optimized"
  }
}'
```

---

## 5. Tự kiểm tra

1. ASG ở 3 AZ, desired=3. 1 AZ down. ASG làm gì?
   <details><summary>Đáp án</summary>Phát hiện instance unhealthy → launch instance mới ở AZ khác (tự rebalance). Có thể tạm 4 instance trong lúc rebalance.</details>

2. App Java JVM mất 60s warm up. Scaling slow. Solution?
   <details><summary>Đáp án</summary>**Warm Pool** với instance stopped, scale-out bring lên nhanh. Hoặc lifecycle hook `pending:wait` để health check đợi đủ thời gian warm.</details>

3. App có session in-memory. Scale-out → user mất session. Fix?
   <details><summary>Đáp án</summary>**Sticky session** (quick fix nhưng anti-pattern). **Tốt hơn**: externalize session vào **ElastiCache Redis** hoặc DynamoDB → stateless app.</details>

4. Cần static IP cho legacy partner whitelist. ALB hay NLB?
   <details><summary>Đáp án</summary>**NLB** — có EIP per AZ. ALB không có static IP.</details>

5. WebSocket app. ALB hay NLB?
   <details><summary>Đáp án</summary>**ALB** — native WS. NLB cũng được nhưng mất feature L7.</details>

6. Cross-zone LB tắt. Target 3 AZ unbalanced (AZ-a 6, AZ-b 2, AZ-c 1). Hậu quả?
   <details><summary>Đáp án</summary>Client request vào AZ-c bị overload, AZ-a thừa. **Cross-zone ON** giải quyết. NLB OFF default → cẩn thận hoặc ON với cost.</details>

7. ASG scale-out OK nhưng scale-in oscillation. Sao?
   <details><summary>Đáp án</summary>Cooldown quá ngắn / target tracking threshold quá narrow. Tăng cooldown, dùng dual-threshold (scale-out 70%, scale-in 30%).</details>

8. ALB target group có 5 EC2, 1 unhealthy. ASG có replace không?
   <details><summary>Đáp án</summary>Chỉ khi ASG dùng **ELB health check**, không phải EC2 health check. Default là EC2 → app crash mà EC2 OK = không replace.</details>

---

## 6. Đối chiếu GCP

| AWS | GCP |
|-----|-----|
| ASG | **MIG (Managed Instance Group)** |
| Launch Template | **Instance Template** |
| Target Tracking | **Autoscaling target metric** |
| Lifecycle hook | **MIG lifecycle hook** (limited) |
| Warm Pool | **MIG suspended instance** (gần tương đương) |
| Mixed Spot+OD | **Spot VM in MIG** |
| ALB | **HTTPS Load Balancer (global)** hoặc **Regional ALB** |
| NLB | **Network LB** (regional/global) |
| GLB | **không có direct** — dùng custom appliance VM |
| Cross-zone LB | **Cross-region** built-in cho Global LB |
| Sticky session | **Session affinity** (CLIENT_IP, GENERATED_COOKIE) |
| Health check | Health check object reusable |

**Bẫy:**
1. GCP **Global LB anycast IP** built-in. AWS phải **Global Accelerator + Regional ALB**.
2. AWS **NLB cross-zone OFF default** → tính phí cross-AZ. GCP regional LB intra-region free.
3. GCP MIG **không có warm pool sâu** như AWS. Workload cold start lâu thường dùng pre-built image hoặc keep min instance cao.

---

## 7. Lưu ý SAA

- **ALB**: L7, host/path/header/query routing, WebSocket, gRPC, Lambda target, Cognito auth.
- **NLB**: L4, static IP, UDP, TLS passthrough, extreme perf, cross-zone OFF default.
- **GLB**: L3 cho third-party firewall via GENEVE.
- **Target Tracking** ưu tiên (đơn giản). **Step** khi cần fine control. **Predictive** khi pattern lặp lại.
- **Lifecycle hook + SQS/Lambda** cho graceful drain.
- **Warm Pool** cho cold start.
- **Mixed + Spot capacity-optimized** save cost.
- **Instance Refresh** rolling update launch template.
- **Cross-zone LB**: ALB ON free, NLB OFF default.
- **Sticky session anti-pattern** — externalize state.

## 8. Lưu ý đi làm

### Production checklist
- [ ] ASG min ≥ 2, multi-AZ ≥ 3.
- [ ] Health check ELB (không phải EC2).
- [ ] Lifecycle hook drain on terminate.
- [ ] Instance Refresh + Launch Template versioning.
- [ ] Mixed Spot + On-Demand base (capacity-optimized).
- [ ] Target tracking + dual-threshold scale-in/out.
- [ ] CloudWatch alarm: RequestCount, HealthyHostCount, UnHealthyHostCount, TargetResponseTime.
- [ ] X-Ray trace ALB request.
- [ ] Tag `Project`, `Environment`, `AutoStop` cho FinOps.

### Anti-pattern
- ❌ Sticky session làm stateful.
- ❌ Self-managed nginx LB trên EC2 thay ALB.
- ❌ Single AZ ASG.
- ❌ Health check EC2-only.
- ❌ NLB cross-zone bật trên workload không cần (cost cross-AZ).
- ❌ ALB không gắn WAF cho public app.

## 9. Foundations
Bài 18 (DR/HA) sẽ dùng concept failure modes — load balancer + ASG là core của HA pattern.

## 10. Flashcard

- **ASG** — auto-scale EC2 multi-AZ.
- **Launch Template** > Launch Config (versioning).
- **Target Tracking** default. **Step** fine control. **Predictive** ML.
- **Lifecycle Hook** — pending:wait, terminating:wait, max 48h.
- **Warm Pool** — pre-init stopped/hibernate instance.
- **Instance Refresh** — rolling update.
- **Mixed Instances + Spot** — save cost.
- **ALB** L7, WebSocket, host/path, Cognito auth.
- **NLB** L4, static IP, UDP, µs latency.
- **GLB** L3, GENEVE, third-party firewall.
- **Cross-zone LB** ALB ON free, NLB OFF default.
- **Deregistration delay** = connection draining.
- **Slow start** — ramp traffic to new target.
- **Sticky session** = anti-pattern (use external store).
- **Health check ELB** > EC2-only.
