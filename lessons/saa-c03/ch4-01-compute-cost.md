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

Bốn lựa chọn chính nằm trên một trục **đánh đổi**: càng cam kết (commitment) thì discount càng cao nhưng càng kém linh hoạt; ngược lại càng linh hoạt thì discount càng thấp (hoặc chấp nhận bị ngắt).

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Phổ EC2 purchase options theo trục discount và độ linh hoạt</title>
  <desc>Bốn lựa chọn mua EC2 đặt trên đồ thị: trục dọc là mức discount, trục ngang là độ linh hoạt giảm dần (ràng buộc tăng dần). On-demand discount 0% nhưng linh hoạt nhất; Savings Plan tới 66% (cam kết $/h); Reserved Instance tới 72% (cố định family/region); Spot tới 90% nhưng đánh đổi bằng rủi ro bị ngắt 2 phút thông báo, không phải bằng cam kết.</desc>
  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">Phổ EC2 purchase options</text>

  <line x1="70" y1="56" x2="70" y2="320" stroke="currentColor" stroke-opacity="0.45"/>
  <line x1="70" y1="320" x2="690" y2="320" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="60" y="64" font-size="11" text-anchor="end" fill="currentColor" opacity="0.7">Discount</text>
  <text x="60" y="320" font-size="11" text-anchor="end" fill="currentColor" opacity="0.7">0%</text>
  <text x="60" y="200" font-size="11" text-anchor="end" fill="currentColor" opacity="0.7">~70%</text>
  <text x="60" y="100" font-size="11" text-anchor="end" fill="currentColor" opacity="0.7">90%</text>
  <text x="380" y="350" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.75">Linh hoạt giảm → (độ ràng buộc / rủi ro bị ngắt tăng)</text>

  <g stroke="currentColor" stroke-opacity="0.18" stroke-dasharray="3 4">
    <line x1="70" y1="200" x2="690" y2="200"/>
    <line x1="70" y1="100" x2="690" y2="100"/>
  </g>

  <g>
    <circle cx="150" cy="300" r="9" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="150" y="284" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">On-demand</text>
    <text x="150" y="270" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">0% · linh hoạt nhất</text>
  </g>
  <g>
    <circle cx="320" cy="218" r="9" fill="#10b981" fill-opacity="0.95"/>
    <text x="320" y="202" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Savings Plan</text>
    <text x="320" y="188" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">≤66% · cam kết $/h 1–3 năm</text>
  </g>
  <g>
    <circle cx="490" cy="196" r="9" fill="#f59e0b" fill-opacity="0.95"/>
    <text x="490" y="180" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Reserved Instance</text>
    <text x="490" y="166" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">≤72% · family/region cố định</text>
  </g>
  <g>
    <circle cx="630" cy="108" r="9" fill="#8b5cf6" fill-opacity="0.95"/>
    <text x="630" y="92" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Spot</text>
    <text x="684" y="132" font-size="10.5" text-anchor="end" fill="currentColor" opacity="0.65">≤90% · interrupt 2-min</text>
    <text x="684" y="146" font-size="10.5" text-anchor="end" fill="currentColor" opacity="0.65">cam kết = Không · discount do rủi ro</text>
  </g>

  <path d="M150 300 Q235 250 320 218 T490 196" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="5 4"/>
</svg>

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

ASG Mixed Instances Policy mua theo **lớp**: một **baseline** chạy On-demand / Savings Plan luôn được đảm bảo capacity, còn phần **scale-out** dùng Spot diversified (nhiều instance type, allocation **capacity-optimized**) để cắt cost mà vẫn chịu được khi một pool Spot bị ngắt.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Layered purchase trong ASG Mixed Instances Policy</title>
  <desc>Lớp dưới là baseline đảm bảo: On-demand hoặc Savings Plan, ví dụ 2 instance. Lớp trên là scale-out dùng Spot diversified qua nhiều instance type với chiến lược capacity-optimized, ví dụ 8 instance. Baseline luôn chạy, Spot co giãn theo tải.</desc>
  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">ASG Mixed Instances — mua theo lớp</text>

  <rect x="40" y="46" width="640" height="118" rx="10" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="56" y="70" font-size="13" font-weight="700" fill="currentColor">Scale-out — 8 × Spot diversified (co giãn theo tải)</text>
  <text x="56" y="88" font-size="11" fill="currentColor" opacity="0.7">≤90% rẻ · 4+ instance type · capacity-optimized · nhiều AZ · ngắt 1 pool → ASG bù pool khác</text>
  <g>
    <rect x="56" y="100" width="68" height="48" rx="7" fill="#8b5cf6" fill-opacity="0.9"/>
    <rect x="136" y="100" width="68" height="48" rx="7" fill="#8b5cf6" fill-opacity="0.9"/>
    <rect x="216" y="100" width="68" height="48" rx="7" fill="#8b5cf6" fill-opacity="0.9"/>
    <rect x="296" y="100" width="68" height="48" rx="7" fill="#8b5cf6" fill-opacity="0.9"/>
    <rect x="376" y="100" width="68" height="48" rx="7" fill="#8b5cf6" fill-opacity="0.9"/>
    <rect x="456" y="100" width="68" height="48" rx="7" fill="#8b5cf6" fill-opacity="0.9"/>
    <rect x="536" y="100" width="68" height="48" rx="7" fill="#8b5cf6" fill-opacity="0.9"/>
    <rect x="616" y="100" width="48" height="48" rx="7" fill="#8b5cf6" fill-opacity="0.9"/>
  </g>

  <rect x="40" y="178" width="640" height="96" rx="10" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="56" y="202" font-size="13" font-weight="700" fill="currentColor">Baseline — 2 × On-demand / Savings Plan (luôn đảm bảo)</text>
  <text x="56" y="220" font-size="11" fill="currentColor" opacity="0.7">capacity guaranteed · cover bằng Savings Plan để có discount</text>
  <g>
    <rect x="56" y="232" width="120" height="30" rx="7" fill="#10b981" fill-opacity="0.95"/>
    <rect x="188" y="232" width="120" height="30" rx="7" fill="#10b981" fill-opacity="0.95"/>
  </g>

  <text x="360" y="300" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">Tổng 10 instance: 2 chắc chắn (baseline) + 8 rẻ, co giãn (Spot)</text>
</svg>

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
