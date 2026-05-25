# SAA Ch4.1 — Compute Cost Optimization

> Mục tiêu: Cắt 30-70% compute bill mà không sacrifice performance. Hiểu **Savings Plan vs RI vs Spot**, Graviton ROI, **right-sizing**, autoscaling cost-aware, và serverless cost model.

Tiền đề: [[ch2-01-compute-performance]], CLF [[08-billing]].

---

## 1. Câu chuyện mở đầu — "Tôi save $200k/năm chỉ bằng 3 việc"

Real story (anonymized): SaaS B2B, compute bill $80k/tháng. SRE team làm 3 việc trong 1 sprint:

1. **Right-sizing**: dùng Compute Optimizer report → 40% instance over-provisioned (CPU < 20%). Downsize 1 step → save $20k/tháng.
2. **Savings Plan**: commit 50% baseline với Compute SP 3-year → save $15k/tháng (37% discount).
3. **Graviton migration**: Java service migrate m5 → m7g → save $5k/tháng + perf bằng/cao hơn.

Tổng: **$40k/tháng = $480k/năm**. Effort: ~2 tuần. ROI: vô cùng cao.

→ Compute cost optimization là **low-hanging fruit lớn nhất**. Bài này gom kỹ thuật.

---

## 2. Hệ thống pricing AWS compute

### 2.1 EC2 purchase options (đã đề cập ch2.1)

| Option | Discount | Commit | Linh hoạt |
|--------|----------|--------|-----------|
| On-demand | 0% | Không | ✅ |
| **Compute Savings Plan** | ≤ 66% | 1/3 năm $/h | ✅ EC2/Lambda/Fargate, mọi family/region |
| **EC2 Instance Savings Plan** | ≤ 72% | 1/3 năm $/h | Family + region cụ thể |
| **Standard Reserved Instance** | ≤ 72% | 1/3 năm | Family/region cụ thể, exchange được |
| **Convertible Reserved Instance** | ≤ 54% | 1/3 năm | Exchange family/OS được |
| **Spot** | ≤ 90% | Không | Interrupt 2-min notice |
| **Dedicated Host** | — | — | Compliance, BYOL |
| **Capacity Reservation** | 0% (giá on-demand) | — | Đảm bảo capacity, không discount |

### 2.2 Payment options
- **All Upfront**: discount max.
- **Partial Upfront**: cân bằng.
- **No Upfront**: ít discount nhất, không lock cash.

---

## 3. Savings Plan vs Reserved Instance — chọn cái nào?

### Quy tắc 2024
- **Compute Savings Plan** > Standard RI trong **99% case**.
  - Lý do: linh hoạt cross-family, cross-region, cross-service (cover Lambda + Fargate + EC2).
  - Discount sát RI (66% vs 72%, không đáng để hy sinh flexibility).
- **EC2 Instance Savings Plan** = chỉ khi chắc chắn 1 family + 1 region 3 năm.
- **Convertible RI** = legacy, prefer Compute SP.
- **Standard RI** = chỉ khi có exit strategy (sell on Marketplace).

### Cách commit
1. Cost Explorer → **Savings Plan recommendation**.
2. Bắt đầu **baseline conservative** (vd commit 50-70% baseline đo qua 30 ngày).
3. Track utilization. Nếu < 90% → commit dư. Nếu = 100% → có thể commit thêm.

---

## 4. Spot — tiết kiệm 70-90% nhưng phải design đúng

### 4.1 Eligible workload

| ✅ Phù hợp Spot | ❌ Tránh Spot |
|----------------|---------------|
| Batch (ML training, video transcoding) | Stateful DB (Postgres primary) |
| CI/CD runner | Hệ thống real-time strict latency |
| Containerized stateless API | Long-running session not-resumable |
| Big data (EMR, Glue) | Single-instance critical service |
| Dev/test | License server |

### 4.2 Spot Fleet & Mixed Instances Policy

- **Spot Fleet** / **ASG MIP** mix instance type & AZ → giảm interrupt rate.
- **Capacity Optimized allocation strategy**: chọn pool ít có nguy cơ interrupt.
- **Spot Placement Score**: AWS gợi ý pool best fit.

### 4.3 Graceful shutdown

- Instance metadata `http://169.254.169.254/latest/meta-data/spot/instance-action` → check mỗi 5s.
- Khi nhận signal → drain ALB target, save state to S3, exit.
- Container: SIGTERM → terminate gracefully.

### 4.4 Spot best practices

1. Multi-AZ, multi-instance-type.
2. Diversify family (m5, m6i, m6a, c5, c6i…).
3. **Capacity-Optimized** strategy.
4. Workload **fully stateless** hoặc state external (S3/DB).
5. Combine Spot + On-demand baseline qua ASG MIP.

### 4.5 EC2 Spot tactical
- **Spot price predictable** (2017+ pricing model). Không còn spike khốc liệt.
- Interrupt rate: thường < 5%/tháng cho pool tốt.

---

## 5. Right-sizing

### 5.1 AWS Compute Optimizer
- ML phân tích CloudWatch metric 14 ngày.
- Recommend instance size/family cho EC2, ASG, Lambda, EBS.
- Free.
- **Action**: review weekly, downsize over-provisioned, upsize starved.

### 5.2 CloudWatch agent
- Default chỉ CPU + network. **RAM** không có → cài CloudWatch agent.
- RAM-bound workload mà không bật → recommend Sai.

### 5.3 Right-sizing pitfalls
- Down-size quá tay → hit cap performance lúc peak.
- Test ở environment thấp → migrate. Đừng change production hot.
- Một số app license per-vCPU → up/down ảnh hưởng license cost.

---

## 6. Graviton — free 20-40% discount

### 6.1 Ai chạy được?
- **Linux** workload có ARM build:
  - Java/Kotlin (JIT supports ARM), Python, Node.js, Go, Rust, .NET 6+.
  - Container: rebuild image với ARM tag.
  - Most managed service (RDS, Aurora, ElastiCache, OpenSearch, EMR) có Graviton option.

### 6.2 Ai chưa?
- Native x86 dependency (some C/C++ với SIMD intrinsics, proprietary lib).
- .NET Framework legacy (chỉ Windows).
- Một số GPU/CUDA workload (chỉ x86 + NVIDIA).

### 6.3 Migration approach
1. Test ở dev/staging với t4g/m7g.
2. Benchmark perf vs cost.
3. CI build multi-arch image (Docker buildx).
4. Rolling deploy production.
5. Track failure rate sau migrate.

> 💡 Aurora Postgres / MySQL Graviton (`r7g`): free performance boost ~15-20%, không cần app change.

---

## 7. Serverless cost model

### 7.1 Lambda
- $0.20 / 1M request + $0.0000166667 / GB-second.
- **Memory tune**: Lambda CPU scale với memory. Đôi khi tăng memory → cost giảm vì duration giảm hơn tỷ lệ.
- **Lambda Power Tuning** (open-source) tool benchmark optimal memory.
- **ARM (Graviton2)**: 20% rẻ hơn x86 cho cùng config.
- **Provisioned Concurrency**: pay/giờ — chỉ dùng khi cold start là vấn đề.

### 7.2 Fargate
- Per vCPU-hour + per GB-hour.
- **Fargate Spot**: ≤ 70% discount.
- **ARM (Graviton)**: 20% rẻ.

### 7.3 API Gateway
- HTTP API ~70% rẻ hơn REST API.
- Caching reduce backend call → reduce Lambda invocation cost.

### 7.4 Step Functions
- Standard: $0.025 / 1000 transition.
- Express: $0.001 / 1000 + duration → rẻ cho high-frequency short workflow.

### 7.5 Serverless vs container vs EC2 cost tipping point

- < 100k request/tháng: Lambda gần như free.
- 1M-100M request/tháng: tùy, calculate cụ thể.
- > 100M request constant: container/EC2 thường rẻ hơn.
- Spiky: serverless thắng vì không pay idle.

---

## 8. Container cost optimization

### 8.1 ECS / EKS
- **Fargate Spot** cho non-critical.
- **EKS Karpenter**: chọn instance type tối ưu cost cho pod requirement.
- **Cluster Autoscaler** / **Karpenter**: scale down idle node aggressively.
- Resource request **chính xác** — pod request 4 vCPU dùng 0.5 → cluster over-provision.

### 8.2 Vertical Pod Autoscaler (VPA)
- K8s tool recommend pod CPU/memory dựa actual usage.
- Tránh over-provision.

### 8.3 Spot mix
- Karpenter + Spot diversified → cluster cost ↓ 60-80%.
- Daemonset cho graceful handle Spot interrupt.

---

## 9. ASG cost-aware patterns

### 9.1 Predictive scaling
- ML predict traffic, scale trước.
- Tránh over-provision baseline.

### 9.2 Scheduled scaling
- Office hours app: scale down 0 lúc đêm/cuối tuần.
- Save 60-70% cho dev/test environment.

### 9.3 Spot + On-demand mix
```
ASG Mixed Instances Policy:
- 2 On-demand baseline (guaranteed)
- 8 Spot scale-out (4 instance types, capacity-optimized)
```

### 9.4 Hibernate
- EC2 hibernate (RAM saved to EBS, restore nhanh).
- Use case: dev workstation off-hours.

---

## 10. License & BYOL

### 10.1 Windows / SQL Server
- **License Included**: AWS bill all-in.
- **BYOL với Dedicated Host**: dùng license enterprise có sẵn.
- Software Assurance qua License Manager.

### 10.2 SAP / Oracle
- Dedicated Host required for some license.
- License Manager track usage.

---

## 11. Cost optimization workflow

### 11.1 Weekly review
- Cost Explorer trend (week-over-week).
- Compute Optimizer recommendation.
- Savings Plan utilization > 95%? Coverage > 70% baseline?

### 11.2 Monthly review
- Trusted Advisor cost check.
- Top 10 services by cost.
- Untagged resource cleanup.

### 11.3 Quarterly review
- Renegotiate Enterprise Discount Program (EDP).
- Right-size Savings Plan commit.
- Architecture review (move to serverless? container? Graviton?).

---

## 12. Ví dụ tối ưu cho 3 use case

### 12.1 SaaS web app, 80% traffic predictable
- Baseline 70% → Compute Savings Plan 3-year.
- Burst 30% → On-demand.
- Async worker → Spot.
- Dev/staging → scheduled scale-down + Spot.
- Graviton cho Java tier.
- Lambda cho image processing (spiky).

### 12.2 CI/CD farm
- 100% Spot (CI job re-runnable).
- Karpenter trên EKS chọn instance phù hợp build job.
- Cache dependency S3 + reuse.

### 12.3 ML training pipeline
- **EC2 Spot** P/Trn family với checkpoint S3.
- **SageMaker managed spot training** — built-in interrupt handling.
- Bid với multi-AZ, multi-instance.

---

## 13. Cạm bẫy đề thi (SAA)

1. **"Reserved Instance = best discount"** → **Sai**, Spot tới 90% > RI 72%. Tùy workload.
2. **"Compute Savings Plan chỉ cho EC2"** → **Sai**, cover Lambda + Fargate + EC2.
3. **"Spot phù hợp DB primary"** → **Sai**.
4. **"Auto Scaling tự giảm cost"** → **Đúng một phần**. Scale-down phải có policy đúng (cooldown, instance protection).
5. **"Graviton compatible mọi app"** → **Sai**.
6. **"Provisioned concurrency giảm cost"** → **Sai**, tăng cost. Giảm latency cold start.
7. **"Lambda free tier vô tận"** → **Sai**, 1M req + 400k GB-s free/tháng.
8. **"Right-sizing là one-time"** → **Sai**, tải thay đổi → review định kỳ.

---

## 14. Tóm tắt 1 dòng

> **Right-size + Savings Plan + Spot + Graviton** = 50-70% cut compute bill. Free wins trước: Compute Optimizer, scheduled scale-down dev, Graviton migration. Commit Savings Plan conservative, layer Spot trên top.

---

## 15. Bài tập tự kiểm tra

1. Compute bill $50k/tháng, 24/7 m5.4xlarge fleet 20 instance. Cost Explorer cho thấy CPU avg 25%. Bạn làm gì trước? Quantify expected saving?
2. Lambda function memory 256MB, duration 5s, 10M req/tháng. Tăng memory 1024MB còn duration 1s. Tổng cost thay đổi thế nào?
3. So sánh Compute SP vs EC2 Instance SP cho team đang chạy m5/m6i/m7g lung tung. Chọn cái nào & vì sao?
4. CI/CD chạy 1000 build/ngày, mỗi build 10 phút, cần c5.4xlarge. Design compute strategy?
5. Production có 24/7 baseline 30 instance, peak 100 lúc business hour. Layered purchase plan?
6. Team Java migrate sang Graviton. Checklist 5 thứ test trước production rollout?

---

## 16. Đọc thêm

- AWS Whitepaper — *AWS Well-Architected Cost Optimization Pillar*.
- AWS Builder's Library — *Cost Optimization*.
- *Lambda Power Tuning* tool (Alex Casalboni).
- AWS docs — *Savings Plans*, *EC2 Spot best practices*.

---

**Bài tiếp theo**: [[ch4-02-storage-cost]] — S3 tier, lifecycle, EBS optimization, snapshot cost.
