# Bài 1 — Cloud Concepts & AWS Global Infrastructure

## 1. Mục tiêu
Sau bài này bạn có thể:
- Định nghĩa **cloud computing** trong 1 câu, không bắt chước.
- Liệt kê **6 lợi thế chính thức của AWS** (đề thi hỏi nguyên văn).
- Phân biệt **IaaS / PaaS / SaaS / FaaS** với ví dụ AWS cụ thể.
- Phân biệt **Public / Private / Hybrid / Multi-cloud**.
- Vẽ được quan hệ **Region ↔ AZ ↔ Edge Location ↔ Local Zone ↔ Wavelength ↔ Outposts**.
- Áp dụng 4 tiêu chí chọn Region cho 1 use case thực tế.

---

## 2. Lý thuyết

### 2.0 Analogy — Cloud như thuê khách sạn vs mua nhà

Tưởng tượng bạn cần chỗ ở khi đi công tác:

| Lựa chọn | Tương đương IT | Đặc điểm |
|----------|----------------|----------|
| **Mua nhà** | On-premise datacenter | Trả nhiều tiền trước (CapEx), tự lo điện nước, sửa chữa. Dùng 20 năm thì rẻ. |
| **Thuê căn hộ dài hạn** | Colocation (rack thuê) | Chủ nhà lo cấu trúc, bạn lo nội thất. Hợp đồng năm. |
| **Thuê khách sạn theo đêm** | **Cloud (EC2 On-Demand)** | Trả theo dùng, không cần báo trước, check-out lúc nào cũng được. |
| **Đặt phòng theo cuộc họp** | **Serverless (Lambda)** | Chỉ trả khi thực sự "ngồi vào phòng". Hết họp = hết tính tiền. |
| **Đặt khách sạn cả năm để được giảm giá** | **Reserved Instance / Savings Plan** | Cam kết dài hạn để giảm 30-72%. |
| **Đăng kí khách sạn vào tour của 1 đoàn lỡ** | **Spot Instance** | Rẻ 90% nhưng có thể bị "đuổi" bất cứ lúc nào (khi có khách trả full price). |

Cloud không phải "tốt hơn on-prem". Nó là **mô hình kinh tế khác** — chuyển CapEx (mua tài sản) sang OpEx (chi phí vận hành) để đổi lấy linh hoạt.

---

### 2.0.1 Câu chuyện: 2 startup, 1 lựa chọn — Anna vs Ben

Hai startup cùng làm app giao đồ ăn, cùng lúc, cùng vốn $50k.

#### Anna — chọn on-prem (sai cách kinh điển 2010)
- Tháng 0: đoán 1000 user/ngày → mua **10 server $5k/cái** + tủ rack + UPS = $52k. Hết vốn dự phòng.
- Tháng 1-3: chỉ có 80 user/ngày → **9 server idle, đốt điện $300/tháng**.
- Tháng 4: lên TV → 50k user trong 1 đêm → **server không scale kịp**, crash 12 giờ → app store rating tụt từ 4.5 xuống 2.8 → mất 70% khách quay lại.
- Tháng 6: phải mua thêm 30 server → giao 6 tuần mới về → đối thủ đã chiếm thị trường.
- **Kết cục**: phá sản tháng 12.

#### Ben — chọn cloud (đúng cách)
- Tháng 0: launch **1 EC2 t3.micro $7/tháng** + RDS db.t3.micro $15. **Tổng $22**.
- Tháng 1-3: 80 user → vẫn $22/tháng. Vốn còn $49,950 để marketing.
- Tháng 4: lên TV → **Auto Scaling Group** tự scale **1 → 40 instance** trong 5 phút theo CPU. App vẫn chạy mượt. Cost đêm đó $180.
- Tháng 5: ổn định 8k user/ngày → 3 instance liên tục, $400/tháng.
- Tháng 6: mở rộng Singapore → **deploy ap-southeast-1 trong 1 giờ**, không cần mua máy.
- **Kết cục**: gọi vốn vòng A năm 2.

**Bài học**: cloud không miễn phí, nhưng nó loại bỏ **rủi ro quy mô** — overprovision (lãng phí) và underprovision (mất khách). 4 trong 6 lợi thế AWS hỏi đều xoay quanh ý này.

---

### 2.0.2 Use case map — On-prem / Cloud / Hybrid

| Tình huống | Nên chọn | Lý do |
|------------|----------|-------|
| Startup MVP, chưa biết user bao nhiêu | **Cloud Pay-as-you-go** | Không đoán capacity, không CapEx. |
| Workload ổn định 24/7 nhiều năm (vd ERP nội bộ) | **Cloud + Reserved Instance** hoặc **on-prem nếu đã có DC** | RI giảm 60-72% nếu chắc cam kết 3 năm. |
| Batch xử lý big data, chịu được gián đoạn | **Cloud Spot Instance** | Rẻ 90% so với On-Demand. |
| Data nhạy cảm bị regulate (vd y tế VN, banking) | **Hybrid** hoặc **AWS Outposts** | Data ở on-prem, app trên cloud. |
| Mobile app cần latency < 10ms ở downtown LA | **AWS Local Zone** (Los Angeles) | Gần user hơn region. |
| App chạy trên mạng 5G của Verizon ở Mỹ | **AWS Wavelength Zone** | Nhúng compute vào MEC của telco. |
| Lab học AWS cá nhân | **Cloud Free Tier + LocalStack** | $0/tháng đầu. |
| Game studio nhiều dữ liệu, transfer in/out lớn | **Hybrid** (data tại on-prem, GPU render cloud) | Tránh egress fee. |
| Doanh nghiệp đang chạy VMware on-prem, muốn migrate dần | **VMware Cloud on AWS** | Lift workload không thay đổi hypervisor. |

---

### 2.0.3 Ví dụ progressive — 4 service models

Cùng một việc "build 1 web app to-do list", 4 cách:

**Level 1 — IaaS (EC2)**: tự kiểm soát nhiều nhất, tốn công nhất.
- Launch 1 EC2 Ubuntu → `ssh` vào → `apt install nginx postgres` → deploy code → cấu hình systemd → tự `certbot` SSL → tự `apt upgrade` mỗi tháng → tự `pg_dump` backup.
- Khi user tăng: tự scale, tự cấu hình Load Balancer.
- ✅ Free Tier 12 tháng. Phù hợp khi cần custom kernel, app legacy, hoặc học.

**Level 2 — PaaS (Elastic Beanstalk)**: AWS lo OS + scaling.
- `eb init` + `eb create` → AWS tự tạo EC2 + LB + Auto Scaling + Health Check.
- Bạn chỉ deploy code (`eb deploy`).
- Không SSH, không cấu hình. AWS auto patch OS.
- ✅ Tăng tốc dev, vẫn linh hoạt config.

**Level 3 — FaaS / Serverless (Lambda + API Gateway + DynamoDB)**: AWS lo TẤT CẢ trừ code.
- Viết 1 function `handleRequest(event)` → upload lên Lambda.
- API Gateway route HTTP → Lambda. DynamoDB lưu data.
- **Không có server**. Không trả tiền khi không có request.
- Scale từ 1 → 10,000 concurrent tự động trong giây.
- ✅ Phù hợp event-driven, traffic không đều.

**Level 4 — SaaS (Notion / Todoist)**: không build, dùng luôn.
- Trả $5-10/user/tháng. Login là dùng.
- Không control hạ tầng, không control code.
- ✅ Khi không phải core competency của công ty.

→ **Càng đi lên (IaaS → SaaS), bạn càng tốn ít công nhưng càng ít control.** Chọn level theo nhu cầu thực, không phải "càng modern càng tốt".

---

### 2.0.4 5 hiểu lầm phổ biến

1. **"Cloud luôn rẻ hơn on-prem"** — SAI tuỳ context. Workload ổn định 24/7 trong 5 năm, đã có sẵn datacenter, đội IT giỏi → on-prem có thể rẻ hơn 30-50%. Dropbox đã **migrate ngược từ AWS về on-prem** năm 2016 vì lý do này (tiết kiệm $75M). Cloud rẻ khi workload **biến động, ngắn hạn, geographic spread, hoặc cần dịch vụ managed**.

2. **"Lên cloud = mất kiểm soát data"** — SAI. Bạn vẫn own data, có thể bật encryption tự quản key (KMS Customer Managed Key, hoặc CloudHSM). AWS không bao giờ đọc data của bạn (trừ khi bạn bật service như Macie cho phép phân tích).

3. **"Lift-and-shift = cloud-native"** — SAI. Lift-and-shift (rehost) chỉ là **phase 1 của "6 R" migration** (Rehost / Replatform / Refactor / Repurchase / Retain / Retire). Workload thực sự cloud-native cần **re-architect** dùng managed services (Lambda thay EC2, DynamoDB thay self-managed Postgres).

4. **"Region càng nhiều càng an toàn"** — SAI. Multi-region tăng **cost (2-3x), complexity (DR test, data sync, consistency)**. Chỉ multi-region khi: (1) compliance đòi, (2) RTO/RPO cực ngắn (< 1 phút) mà 1 region không đủ, (3) user thực sự global. Phần lớn workload **Multi-AZ trong 1 region là đủ** (HA 99.99%).

5. **"Edge Location chỉ để cache static file"** — SAI một phần. Edge còn chạy **Lambda@Edge / CloudFront Functions** (compute tại edge), **terminate TLS**, **AWS Shield DDoS protection**, **WAF rule**, **Route 53 DNS**. Edge là "tầng kiến trúc" chứ không chỉ CDN.

---

### 2.1 Cloud computing là gì?

**Định nghĩa NIST**: cloud computing là mô hình cung cấp **on-demand network access** tới shared pool of configurable computing resources (compute, storage, network, app) — có thể provision và release nhanh chóng với **minimal management effort**.

5 đặc trưng:
- **On-demand self-service** — tự bấm console, không phải xin sysadmin.
- **Broad network access** — qua Internet, từ mọi thiết bị.
- **Resource pooling** — multi-tenancy, hardware share.
- **Rapid elasticity** — scale up/down trong vài giây.
- **Measured service** — đo và tính tiền theo dùng.

### 2.2 6 lợi thế của cloud (đề thi hỏi nguyên văn)

1. **Trade upfront expense for variable expense** (CapEx → OpEx).
2. **Benefit from massive economies of scale** — AWS mua chung nên giá rẻ.
3. **Stop guessing capacity** — scale up/down theo demand thực.
4. **Increase speed and agility** — provision tài nguyên trong phút thay vì tuần.
5. **Stop spending money running and maintaining data centers** — focus core business.
6. **Go global in minutes** — deploy multi-region chỉ vài click.

**Mẹo nhớ**: **C**-**E**-**G**-**S**-**M**-**G** → "Capital → variable, Economies, Guess capacity stop, Speed agility, Maintenance stop, Global". Hoặc 1 câu: *"Đổi tiền lớn lấy linh hoạt, mua chung rẻ hơn, không đoán nữa, nhanh hơn, không lo máy, đi global trong phút."*

### 2.3 Mô hình dịch vụ

| Model | AWS quản | Bạn quản | Ví dụ AWS | Khi nào dùng |
|-------|----------|----------|-----------|--------------|
| **IaaS** | HW, virtualization, network | OS, runtime, app, data | EC2, EBS, VPC | Cần kiểm soát kernel, app legacy. |
| **PaaS** | + OS, runtime, middleware | App, data, config | Elastic Beanstalk, RDS, ECS Fargate | Tăng tốc dev nhưng vẫn cần config. |
| **FaaS** (serverless) | + scaling, idle management | Chỉ code function | Lambda, Step Functions | Event-driven, traffic không đều. |
| **SaaS** | Tất cả | Chỉ cấu hình sử dụng | WorkMail, Chime, QuickSight, Connect | Không phải core competency. |

### 2.4 Deployment models

- **Public cloud** — AWS / Azure / GCP. Multi-tenant, share hardware (vẫn isolate logical). Đa số use case.
- **Private cloud** — riêng 1 tổ chức, có thể on-prem (VMware) hoặc AWS Outposts. Compliance cao.
- **Hybrid** — kết hợp. VD: HR system on-prem (data nhạy cảm) + web public trên AWS, nối **Direct Connect** hoặc **Site-to-Site VPN**.
- **Multi-cloud** — chạy đồng thời ≥ 2 cloud (vd AWS + GCP). Tránh vendor lock-in nhưng cost + complexity cao.

### 2.5 AWS Global Infrastructure

| Tầng | Định nghĩa | Số lượng (2024) | Ví dụ |
|------|------------|------------------|-------|
| **Region** | Vùng địa lý, độc lập về data | 33 region | `ap-southeast-1` (Singapore), `us-east-1` (N. Virginia) |
| **Availability Zone (AZ)** | 1+ datacenter trong region, cách nhau vài chục km, nối fiber low-latency | ≥ 3 AZ/region | `ap-southeast-1a`, `1b`, `1c` |
| **Edge Location (PoP)** | Điểm cache toàn cầu cho CloudFront, Route 53 | 600+ | TPHCM, Hà Nội (CloudFront PoP) |
| **Regional Edge Cache** | Cache lớp giữa Edge và Origin | 13 | Mỗi continent vài cái |
| **Local Zone** | Mini-region gần metro, latency thấp | 35+ | Los Angeles, Boston, Hà Nội (đang plan) |
| **Wavelength Zone** | Compute nhúng vào mạng 5G của telco | ~30 | Verizon Boston, KDDI Tokyo |
| **Outposts** | AWS rack đặt tại văn phòng bạn | Tuỳ đặt | Datacenter của ngân hàng |

**Quan hệ**:
```
                            ┌─────────────────────────────────┐
                            │ Region: ap-southeast-1 (SG)     │
                            │                                 │
   User in TPHCM ──► Edge   │   ┌─────┐  ┌─────┐  ┌─────┐    │
   (~10ms tới Edge)   PoP   │   │ AZ-a│  │ AZ-b│  │ AZ-c│    │
   TPHCM              ──────│──►│ DC1 │  │ DC2 │  │ DC3 │    │
                            │   │ DC2 │  │ DC2 │  │ DC2 │    │
                            │   └──┬──┘  └──┬──┘  └──┬──┘    │
                            │      └────────┼────────┘        │
                            │       fiber <2ms inter-AZ       │
                            └─────────────────────────────────┘
```

### 2.6 Cách chọn Region (4 tiêu chí)

1. **Compliance** — data có bắt buộc nằm trong quốc gia/khối nào không? (GDPR cho EU → eu-central-1, PDPA Singapore → ap-southeast-1).
2. **Latency** — region gần user nhất. Test bằng [cloudping.co](https://www.cloudping.co/).
3. **Giá** — `us-east-1` thường rẻ nhất (đến 20% so với region khác); region mới mở thường đắt.
4. **Service availability** — không phải region nào cũng có đủ service. Region mới chỉ có service core; service mới (Bedrock, q Developer) thường ra ở `us-east-1`, `us-west-2` trước.

**Ví dụ thực tế cho VN**: web app cho user Việt Nam → chọn `ap-southeast-1` (Singapore, ~30ms tới VN). Nếu cần Bedrock GenAI → có thể fallback `us-east-1` cho riêng AI workload, chấp nhận latency cao.

---

## 3. Hands-on có account

### Lab 1 — Setup account + bảo vệ root (15 phút)
1. Đăng ký tại https://aws.amazon.com/free/ (cần card credit, không charge nếu trong Free Tier).
2. Login root → IAM → **Activate MFA** (Google Authenticator / Authy).
3. **Billing** → **Budgets** → tạo budget **$1** → email alert khi vượt 80%. Đây là **lá chắn số 1** chống bill shock.
4. **Billing preferences** → bật **PDF invoice by email**.
5. Cất password root vào password manager, **không dùng root hàng ngày** (bài 3 sẽ tạo IAM user).

### Lab 2 — So sánh region & latency (20 phút)
1. Mở https://www.cloudping.co/grid → xem latency từ máy bạn tới 33 region. Ghi 3 region nhanh nhất.
2. Mở console, click region selector trên góc phải → đổi giữa `ap-southeast-1`, `us-east-1`, `me-south-1` (Bahrain). Vào **EC2** → **Instance Types** → so sánh **số lượng instance type** giữa các region. Region nhỏ có ít option hơn.
3. Vào **AWS Regional Services** page (https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/) → check region nào **chưa có** `Bedrock` hoặc `EKS Auto Mode`.

### Lab 3 — Vẽ kiến trúc đầu tiên (15 phút)
1. Mở https://app.diagrams.net (free).
2. Vẽ:
   - 1 hộp lớn = Region `ap-southeast-1`.
   - Bên trong: 3 hộp AZ.
   - Mỗi AZ: 1 EC2 + 1 RDS standby.
   - 1 ALB ngoài, mũi tên từ user qua CloudFront → ALB → EC2 multi-AZ.
3. Lưu ý: **VPC vẽ trùm cả region, subnet thuộc 1 AZ**. Đây là sai lầm #1 của người từ GCP qua.

---

## 4. Hands-on không tốn tiền

### Option A — Interactive Global Infrastructure
- Mở https://aws.amazon.com/about-aws/global-infrastructure/ → quay địa cầu, click từng region xem AZ count + launch date.
- Đoán region mới nhất là gì (gợi ý: Taipei 2025, Saudi Arabia 2026 — kiến thức này không thi nhưng tốt cho phỏng vấn).

### Option B — AWS Pricing Calculator
- https://calculator.aws/ → ước lượng chi phí cho web app:
  - 2 EC2 t3.medium chạy 730h/tháng
  - 1 RDS db.t3.small Multi-AZ
  - 100GB S3
  - 1TB CloudFront
- So sánh giá giữa region (chuyển dropdown). Ghi nhận chênh lệch.

### Option C — AWS Skill Builder (free courses)
- https://skillbuilder.aws → search "Cloud Practitioner Essentials" (free, 7 giờ, có lab).

---

## 5. Tự kiểm tra (có đáp án)

1. Công ty đang chạy datacenter on-prem, đầu tư đầy đủ, server còn dùng được 4 năm. Workload ổn định. Có nên migrate hết lên cloud không?
   <details><summary>Trả lời</summary>**Chưa chắc**. Workload ổn định + đã có sẵn DC → cost on-prem có thể rẻ hơn 30-50%. Cân nhắc **hybrid**: cloud cho workload mới, scale-out, DR, hoặc geographic expansion. On-prem giữ workload steady-state.</details>

2. Bạn cần chạy phân tích batch 8 tiếng/đêm, có thể bị gián đoạn và retry. Loại EC2 pricing nào rẻ nhất?
   <details><summary>Trả lời</summary>**Spot Instance** — rẻ tới 90% so với On-Demand. Phù hợp batch chịu được interrupt (AWS có thể reclaim với thông báo 2 phút trước).</details>

3. Region thường có **tối thiểu** bao nhiêu AZ?
   <details><summary>Trả lời</summary>**3 AZ** (theo thiết kế khuyến nghị AWS). Một số region cũ có 2 nhưng region mới đều ≥ 3 để hỗ trợ quorum-based services như RDS Multi-AZ cluster.</details>

4. Edge Location khác AZ ở điểm nào quan trọng nhất?
   <details><summary>Trả lời</summary>**Mục đích**: Edge phục vụ **cache content gần user** (CloudFront, Route 53, Shield). AZ là **datacenter compute thực sự** trong region. Edge không chạy EC2/RDS được. Edge có **>>> nhiều hơn** AZ (600+ Edge vs ~100 AZ toàn cầu).</details>

5. Công ty Đức bắt buộc data customer EU phải nằm trong EU. Bạn chọn region nào và lý do?
   <details><summary>Trả lời</summary>**eu-central-1 (Frankfurt)** hoặc **eu-west-1 (Ireland)**. Cả hai đều trong EU, đáp ứng GDPR. Frankfurt thường được chọn vì gần khách hàng Đức nhất + có hầu hết service. eu-west-1 (Ireland) cũng OK nhưng có ý kiến cho rằng Brexit có thể ảnh hưởng (tranh cãi).</details>

6. Lambda thuộc model gì?
   <details><summary>Trả lời</summary>**FaaS (Function-as-a-Service)**, là 1 dạng của **Serverless / PaaS mở rộng**. AWS quản OS, runtime, scaling, idle. Bạn chỉ viết code function. Không trả tiền khi không có request.</details>

7. Một game studio cần latency < 5ms cho player ở Los Angeles. EC2 trong `us-west-2` (Oregon) không đủ. Giải pháp?
   <details><summary>Trả lời</summary>**AWS Local Zone** Los Angeles (`us-west-2-lax-1a`). Local Zone là mini-AZ đặt gần metro lớn, latency single-digit ms với user trong thành phố. Workload chính vẫn ở Oregon region; chỉ component cần low-latency (vd game server tick) chạy ở Local Zone.</details>

8. Một startup chọn `us-east-1` vì rẻ nhất, user toàn ở VN. OK không?
   <details><summary>Trả lời</summary>**Không OK**. Latency `us-east-1` → VN khoảng 220ms, user trải nghiệm tệ (mọi click cảm thấy lag). Chọn `ap-southeast-1` (Singapore, ~30ms) đắt hơn 10-15% nhưng UX tốt hơn nhiều lần. Cost vs UX trade-off — đa số startup chọn UX.</details>

---

## 6. Đối chiếu GCP

| Khái niệm | AWS | GCP | Khác biệt cốt lõi |
|-----------|-----|-----|--------------------|
| Vùng địa lý | **Region** (`ap-southeast-1`) | **Region** (`asia-southeast1`) | Naming khác, concept giống. |
| Datacenter trong region | **Availability Zone** (`ap-southeast-1a`) | **Zone** (`asia-southeast1-a`) | Giống. |
| CDN edge | **CloudFront Edge Location** | **Cloud CDN Edge / PoP** | Giống. |
| Mini-region cho metro | **Local Zone** | (không có equivalent trực tiếp; gần nhất là Edge Network) | AWS đi trước. |
| Compute trên 5G | **Wavelength Zone** | (không có) | AWS độc quyền. |
| On-prem AWS rack | **Outposts** | **Google Distributed Cloud (Edge)** / **Anthos on-prem** | GCP rộng hơn (cả K8s on-prem). |
| Account boundary | **Account** | **Project** | GCP project nhẹ hơn, AWS account nặng hơn (cần root credential). |
| VPC scope | **VPC = regional**, subnet = AZ-bound | **VPC = global**, subnet = regional | **Bẫy #1**: nhiều người từ GCP qua AWS quên rằng VPC AWS bị giới hạn 1 region. |

---

## 7. Lưu ý khi thi CLF-C02

- Thuộc **6 lợi thế nguyên văn tiếng Anh** — đề có thể hỏi "which is NOT one of the 6 benefits".
- **IaaS = EC2, PaaS = Elastic Beanstalk, SaaS = WorkMail / Chime / Connect**. Lambda thường được xếp **Serverless / FaaS** nhưng AWS docs đôi khi xếp PaaS — chấp nhận cả hai.
- **Region ≥ 3 AZ** (theo recommended design).
- **Edge Location ≠ AZ** — Edge cho CDN, AZ cho compute.
- **Region chọn theo 4 tiêu chí**: compliance, latency, cost, service availability.
- Câu có "minimal management" / "no server to manage" / "pay per request" → **Serverless / Lambda**.
- Câu có "datacenter at customer site" → **AWS Outposts**.
- Câu có "5G low latency" → **Wavelength**.

## 8. Lưu ý khi thi SAA-C03 (sâu hơn)

- **Multi-AZ vs Multi-Region trade-off**: Multi-AZ = HA trong 1 region (đủ cho 99.99%); Multi-Region = DR + global presence (cost + complexity 2-3x).
- **AZ failure isolation**: AWS thiết kế AZ độc lập điện, network, cooling — failure 1 AZ không lan sang AZ khác cùng region.
- **Pricing models đề hỏi nhiều**: On-Demand (steady tạm), Reserved 1y/3y (commitment), Savings Plans (linh hoạt hơn RI), Spot (chịu interrupt), Dedicated Host (compliance/BYOL).
- **Latency-based routing** với Route 53: tự route user về region gần nhất.
- **CloudFront origin failover** dùng Lambda@Edge cho multi-region active-active.
- **Outposts vs Local Zone vs Wavelength** — phân biệt rõ ở SAA: Outposts on-prem, Local Zone gần metro, Wavelength trong 5G MEC.

## 9. Lưu ý khi đi làm

### Bảo mật
- Bật **MFA root ngay**, không trì hoãn (root bị hack = mất account).
- **Budget alert + Cost Anomaly Detection** ngay từ ngày đầu — tránh bill $50k overnight do attacker mine crypto.
- Bật **CloudTrail** ngay (free 90 ngày event history) — biết ai làm gì.

### Vận hành
- **Tag mọi resource** (`Project`, `Env`, `Owner`, `CostCenter`) từ ngày đầu — sau này tách bill dễ.
- **us-east-1 mặc định** khi click console — luôn check region trước khi launch resource (rất nhiều người tạo nhầm region rồi tốn tiền migrate).
- **Multi-region chỉ khi cần**, không "phòng hờ" — multi-region cost 2-3x.
- Cron mỗi đêm: AWS **Trusted Advisor** check security best practice (free tier có 7 check).

### Anti-pattern thường gặp
- ❌ Để mặc region us-east-1 cho user VN.
- ❌ Không có budget alert → bị attacker mine crypto đốt $20k.
- ❌ Không tag → cuối tháng không biết bill từ project nào.
- ❌ Multi-region active-active mà chưa test failover bao giờ.
- ❌ "Cloud-native" mà thực chất chỉ lift-and-shift VM lên EC2.
- ❌ Quên xoá resource sau khi xong PoC (NAT Gateway $32/tháng, RDS $15/tháng cứ chạy mãi).

---

## 10. Flashcard

- **Cloud computing** — thuê tài nguyên IT qua Internet, trả theo dùng.
- **6 lợi thế**: CapEx→OpEx · Economies of scale · Stop guess capacity · Speed/agility · Stop running DC · Go global.
- **IaaS** — EC2 (control nhiều, công nhiều).
- **PaaS** — Beanstalk, RDS (AWS lo OS).
- **FaaS / Serverless** — Lambda (chỉ viết function, AWS lo scale).
- **SaaS** — WorkMail, Chime (dùng luôn).
- **Public** — AWS/Azure/GCP. **Private** — riêng 1 tổ chức. **Hybrid** — kết hợp.
- **Region** — vùng địa lý, độc lập data.
- **AZ** — 1+ datacenter trong region, nối fiber.
- **Edge Location** — CDN PoP, 600+ toàn cầu.
- **Local Zone** — mini-region gần metro.
- **Wavelength** — compute trong 5G telco.
- **Outposts** — AWS rack on-prem.
- **Chọn Region**: compliance / latency / cost / service availability.
- **Spot rẻ nhất** (90% off) nhưng có thể bị reclaim.
- **RI / Savings Plan** giảm 30-72% cho workload steady.
