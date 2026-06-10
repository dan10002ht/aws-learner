# Designing for Scalability

Scalability là khả năng hệ thống xử lý được lượng tải tăng dần (hoặc đột biến) bằng cách thêm tài nguyên — mà không phải đập đi xây lại kiến trúc. Trong đề SAA-C03, đây là chủ đề "sương sống": đa số câu hỏi tình huống đều quy về *làm sao hấp thụ traffic spike* và *làm sao tách read khỏi write*. Bài này đi từ nguyên tắc đến từng service cụ thể, kèm bẫy thường gặp.

## 1. Horizontal vs Vertical Scaling

| Tiêu chí | Vertical (scale up) | Horizontal (scale out) |
|---|---|---|
| Cách làm | Đổi instance lớn hơn (t3.medium → m5.4xlarge) | Thêm nhiều instance giống nhau |
| Giới hạn | Có trần phần cứng, phải reboot | Gần như vô hạn |
| Downtime | Thường có (resize cần stop/start) | Không, thêm node nóng |
| Resilience | Vẫn là single point of failure | Tăng độ sẵn sàng (nhiều AZ) |
| Phù hợp | RDS, tier stateful khó phân tán | Web/app tier stateless, container, Lambda |

> 💡 Mẹo thi: Đề thi gần như **luôn ưu tiên horizontal scaling** vì nó vừa tăng scalability vừa tăng availability. Khi thấy đáp án "resize to a larger instance" cho web tier có khả năng cao là bẫy. Vertical chỉ hợp lý cho thành phần khó phân tán (ví dụ một RDS primary cần ghi mạnh hơn).

Nguyên tắc vàng: **muốn scale out thì tier đó phải stateless**. Đẩy session/state ra ngoài (DynamoDB, ElastiCache, hoặc dùng sticky session chỉ khi bất đắc dĩ).

## 2. Auto Scaling Policies (EC2 Auto Scaling Group)

ASG duy trì số lượng instance giữa `min` – `max` quanh giá trị `desired`, phân bổ qua nhiều AZ. Điểm cốt lõi của bài thi là chọn đúng **loại scaling policy**.

| Policy | Cơ chế | Khi nào dùng |
|---|---|---|
| **Target tracking** | Giữ một metric ở mức mục tiêu (vd CPU = 50%) | Mặc định khuyến nghị, đơn giản, tự tính số instance cần thêm/bớt |
| **Step scaling** | Thêm/bớt theo bậc tuỳ mức vượt ngưỡng alarm | Cần kiểm soát chi tiết phản ứng theo độ lệch metric |
| **Simple scaling** | Một hành động cho mỗi alarm, có cooldown | Cũ, ít dùng — step scaling thay thế |
| **Scheduled** | Scale theo lịch (cron) | Tải có quy luật thời gian biết trước (9h sáng thứ Hai tăng) |
| **Predictive** | ML dự báo tải tương lai, provision trước | Tải tuần hoàn theo ngày/tuần, muốn tránh độ trễ khởi động |

> 💡 Mẹo thi:
> - Tải **biết trước theo giờ/ngày** (batch tối, giờ hành chính) → **Scheduled scaling**.
> - Tải **lặp theo chu kỳ nhưng muốn AWS tự dự báo** → **Predictive scaling**.
> - Spike **đột ngột, không đoán được** → Target tracking phản ứng nhanh, hoặc kết hợp với queue (mục 6).

> ⚠️ Bẫy: Target tracking có **độ trễ** — phải phát hiện metric vượt ngưỡng, launch instance, chờ instance boot + health check. Nếu spike rất nhanh và đề nhấn "instantaneous"/"immediate", câu trả lời thường là **kiến trúc đệm bằng queue/serverless**, không phải tinh chỉnh ASG.

**Warm pools** giúp giảm thời gian khởi động khi cần scale gấp (giữ sẵn instance ở trạng thái stopped/hibernated). **Lifecycle hooks** cho phép chạy bước chuẩn bị (load data, drain connection) trước khi instance vào/ra service.

> ⚠️ Bẫy: Khi instance bị terminate lúc scale-in mà connection chưa drain → dùng **lifecycle hook (Terminating:Wait)** + connection draining (deregistration delay) ở ELB, đừng để mất request đang xử lý.

## 3. Scaling Reads — Tách Read khỏi Write

Đây là chủ đề bị hỏi *cực nhiều*. Hầu hết workload là read-heavy, nên scale phần đọc là cách rẻ và nhanh nhất.

### RDS Read Replicas
- Tới **15 read replica** (Aurora) hoặc tối đa 5–15 tuỳ engine với RDS thường.
- Replication **bất đồng bộ** → có **replica lag** → eventual consistency cho read.
- Replica có **endpoint riêng**; ứng dụng phải chủ động route read query sang đó.
- Dùng để: offload báo cáo/analytics, scale read traffic, cross-region read.

> ⚠️ Bẫy phân biệt **Read Replica vs Multi-AZ**:
> - **Multi-AZ** = *high availability/disaster recovery*. Standby **không phục vụ read**, chỉ để failover tự động. (Trừ Multi-AZ DB cluster mới có 2 readable standby.)
> - **Read Replica** = *scale read performance*. Không tự failover (trừ khi promote thủ công).
> - Câu hỏi nói "offload reads / scale read traffic" → Read Replica. Nói "survive AZ failure / automatic failover" → Multi-AZ.

### Aurora Replicas
- Tới **15 Aurora Replicas** chia sẻ chung storage volume → **lag rất thấp** (mili-giây), failover nhanh.
- **Reader endpoint** tự load-balance read qua các replica → app chỉ cần một endpoint.
- **Aurora Auto Scaling** thêm/bớt reader theo tải đọc tự động.
- **Aurora Global Database**: cross-region, lag < 1s, đọc địa phương + DR.

### ElastiCache (Redis / Memcached)
- Cache layer trước DB để giảm read load và latency.
- **Redis**: replication, cluster mode, persistence, pub/sub, sorted set — chọn khi cần HA, đọc replica, cấu trúc dữ liệu phong phú.
- **Memcached**: đa luồng, đơn giản, scale ngang bằng cách thêm node — chọn khi chỉ cần cache đơn giản, không cần bền vững.

### DynamoDB
- **On-demand** vs **Provisioned + Auto Scaling**: spike không đoán được → on-demand; tải ổn định/biết trước → provisioned rẻ hơn.
- **DAX** (DynamoDB Accelerator): in-memory cache *cho DynamoDB*, đưa latency từ mili-giây xuống micro-giây cho read. Chỉ dùng với DynamoDB.
- **Global Tables**: multi-region, multi-active write, đọc địa phương low-latency.

> 💡 Mẹo thi: "DynamoDB read latency cao, cần microsecond" → **DAX**. "Cache cho RDS / kết quả query SQL tuỳ ý" → **ElastiCache**, KHÔNG phải DAX.

## 4. Caching Layers — Đặt cache ở đâu

Cache đẩy dữ liệu gần người dùng / gần compute hơn, giảm tải backend và latency.

| Layer | Service | Cache cái gì |
|---|---|---|
| Edge (gần user) | **CloudFront** | Static + dynamic content, API responses, video |
| Database/app | **ElastiCache** | Kết quả query, session, leaderboard, rate-limit counter |
| DynamoDB | **DAX** | Item/query reads của DynamoDB |
| API | **API Gateway caching** | Response của REST API theo stage |

> 💡 Mẹo thi: "Giảm tải cho origin/web server, phục vụ user toàn cầu, hấp thụ spike đọc nội dung tĩnh" → **CloudFront**. Nó còn hấp thụ được spike đột biến (flash sale, viral) cho static/cacheable content mà không cần scale backend.

Mẫu kiến trúc nhiều tầng cache điển hình: **CloudFront → API Gateway (cache) → ElastiCache → RDS/DynamoDB(+DAX)**.

Hai chiến lược cache phổ biến (đôi khi bị hỏi):
- **Lazy loading (cache-aside)**: chỉ cache khi có request miss. Tiết kiệm bộ nhớ, nhưng lần miss đầu chậm và có thể stale.
- **Write-through**: ghi vào cache mỗi khi ghi DB. Dữ liệu cache luôn mới, nhưng tốn ghi và có thể cache dữ liệu không bao giờ đọc. Thường kèm **TTL** để tránh stale.

## 5. Scaling Stateless Tiers

Để scale out web/app tier mượt mà:
- **Tách state ra ngoài**: session → ElastiCache for Redis hoặc DynamoDB; file upload → S3; không lưu trên local disk instance.
- **ELB phía trước ASG**: ALB cho HTTP/HTTPS (layer 7, path/host routing), NLB cho TCP/UDP cực nhanh và static IP.
- **Health check** để ASG thay thế instance hỏng; **connection draining** khi scale-in.

> ⚠️ Bẫy: Sticky session (session affinity) trói user vào một instance → khi instance đó scale-in, user mất session, và load phân bổ không đều. Đề thi thích đáp án **externalize session vào ElastiCache/DynamoDB** hơn là bật sticky session.

## 6. Queue-Based Load Leveling — Hấp thụ Spike

Đây là *pattern kinh điển* để xử lý traffic spike mà SAA-C03 rất thích hỏi.

**Vấn đề**: Producer (frontend) tạo request nhanh hơn nhiều so với tốc độ Consumer (backend xử lý). Spike trực tiếp vào backend → quá tải, mất request.

**Giải pháp**: Chèn **SQS** giữa hai tầng. Queue đóng vai trò *buffer*:
- Producer đẩy message vào queue *ngay lập tức* (queue co giãn gần vô hạn) → frontend không bao giờ bị nghẽn.
- Fleet consumer (ASG hoặc Lambda) đọc và xử lý theo **tốc độ ổn định của riêng nó**, không bị spike đè bẹp.
- Scale consumer dựa trên **chiều dài queue** (`ApproximateNumberOfMessagesVisible`) làm metric cho target tracking.

```
[Frontend] --> [SQS Queue] --> [ASG Consumers / Lambda]
   spike         buffer            scale theo backlog
```

> 💡 Mẹo thi: Bất cứ khi nào đề mô tả "spiky/unpredictable traffic", "decouple", "không được mất request khi backend bận", "smooth out the load" → nghĩ ngay **SQS (queue-based load leveling)**.

Phân biệt nhanh các dịch vụ decoupling:

| Service | Mô hình | Dùng khi |
|---|---|---|
| **SQS** | Queue, 1 consumer group lấy & xoá message | Load leveling, xử lý bất đồng bộ, mỗi message xử lý một lần |
| **SNS** | Pub/sub, fan-out nhiều subscriber | Một event → nhiều hệ thống nhận |
| **SQS FIFO** | Thứ tự + exactly-once | Cần đảm bảo thứ tự, throughput thấp hơn |
| **Kinesis Data Streams** | Streaming, replay, nhiều consumer đọc cùng dữ liệu | Real-time analytics, ordered per-shard, giữ data 1–365 ngày |
| **EventBridge** | Event bus, routing theo rule, tích hợp SaaS | Event-driven, định tuyến theo nội dung |

> ⚠️ Bẫy SQS vs Kinesis: SQS message bị **xoá sau khi xử lý**, không replay được, không giữ thứ tự (standard). Kinesis **giữ lại data** cho phép nhiều consumer & replay, theo thứ tự trong shard. Đề nói "multiple consumers cùng đọc một stream", "real-time analytics", "replay" → **Kinesis**, không phải SQS.

**Pattern SNS + SQS fan-out**: SNS publish một event, fan-out vào nhiều SQS queue, mỗi queue có fleet riêng xử lý độc lập và scale riêng. Vừa decouple vừa hấp thụ spike cho nhiều downstream.

## 7. ECS / EKS Auto Scaling

Container scaling có **hai tầng** — phải scale cả task lẫn hạ tầng chạy task.

- **Service Auto Scaling** (tầng task): tăng/giảm số task theo CPU/memory/ALB request count — dùng target tracking, step, scheduled. Tương tự ASG nhưng cho task.
- **Cluster capacity** (tầng hạ tầng):
  - **EC2 launch type**: cần **Cluster Auto Scaling (Capacity Provider)** để thêm EC2 khi task không có chỗ chạy.
  - **Fargate**: serverless, **không quản lý EC2** — chỉ cần scale task, AWS lo capacity. Đề nhấn "không muốn quản lý server/cluster capacity" → **Fargate**.
- **EKS**: dùng **Cluster Autoscaler** hoặc **Karpenter** (provision node nhanh, tối ưu hơn) cho node; **HPA** (Horizontal Pod Autoscaler) cho pod.

> 💡 Mẹo thi: "Chạy container không muốn quản lý infrastructure/patching, scale theo nhu cầu" → **Fargate**. "Cần kiểm soát instance type/GPU, tối ưu chi phí với reserved/spot" → **EC2 launch type + Capacity Provider**.

## 8. Lambda Concurrency & Scaling

Lambda tự scale theo số request đồng thời, nhưng có vài cơ chế phải nắm:

- **Concurrency** = số execution chạy đồng thời. Account mặc định giới hạn (vd 1.000) trên toàn region — chia sẻ giữa các function.
- **Reserved concurrency**: *dành riêng* một phần hạn mức cho function quan trọng (vừa đảm bảo nó luôn có chỗ, vừa **giới hạn trần** để không làm cạn quota / không đè sập downstream như RDS).
- **Provisioned concurrency**: giữ sẵn execution environment đã khởi tạo → **loại bỏ cold start**, dùng cho API latency-sensitive. Có thể auto scale theo lịch/utilization.
- **Burst concurrency**: scale rất nhanh ban đầu rồi tăng theo bước; vượt giới hạn → request bị **throttle (429)**.

> ⚠️ Bẫy Lambda + RDS: Lambda scale ra hàng nghìn concurrent execution có thể **làm cạn connection pool của RDS**. Giải pháp: **RDS Proxy** (gộp & tái dùng connection), hoặc đặt **reserved concurrency** để giới hạn. Đề hay hỏi tình huống "too many database connections" này.

> ⚠️ Bẫy cold start: Latency-sensitive API spike → **Provisioned concurrency**. Đừng nhầm với Reserved concurrency (cái này không loại bỏ cold start, chỉ phân bổ/giới hạn quota).

## 9. Cây quyết định nhanh cho phòng thi

- **Spike đột ngột, không mất request** → SQS buffer + consumer scale theo queue depth (hoặc Lambda).
- **Tải biết trước theo lịch** → Scheduled scaling. **Tuần hoàn để AWS dự báo** → Predictive scaling.
- **Read-heavy SQL, offload đọc** → Read Replica / Aurora reader endpoint. **Sống sót khi AZ chết** → Multi-AZ.
- **Giảm DB read latency**: kết quả SQL → ElastiCache; DynamoDB → DAX.
- **Phục vụ global, hấp thụ spike nội dung cacheable** → CloudFront.
- **Container không muốn quản hạ tầng** → Fargate. **Cần control/spot** → ECS on EC2 + Capacity Provider.
- **Lambda làm sập RDS connection** → RDS Proxy / reserved concurrency. **Cold start API** → Provisioned concurrency.
- **Web/app tier scale out** → stateless + externalize session (ElastiCache/DynamoDB) + ASG sau ALB.

## 10. Tổng kết các bẫy hay gặp

- Vertical scaling cho web tier thường là **đáp án sai** — ưu tiên horizontal.
- **Multi-AZ ≠ Read Replica**: HA vs scale read.
- **DAX chỉ cho DynamoDB**, ElastiCache cho phần còn lại.
- Spike "tức thời" không giải bằng tinh chỉnh ASG mà bằng **queue / serverless / cache**.
- **SQS không replay / Kinesis có replay** + multi-consumer.
- **Provisioned concurrency** xử lý cold start, **Reserved concurrency** xử lý phân bổ/giới hạn quota — đừng nhầm.
- Sticky session là giải pháp kém; **externalize state** mới đúng tinh thần scalable.
- Quên **lifecycle hook / connection draining** khi scale-in → mất request đang xử lý.
