# Kiến trúc multi-account & tối ưu chi phí

Khi bạn còn là engineer, "kiến trúc tốt" thường nghĩa là sơ đồ chạy được, scale được. Lên cấp Solutions Architect cao cấp / CTO, câu hỏi đổi sang: **ai được phép làm gì, khi một thứ cháy thì cháy tới đâu, và mỗi tháng cái này tốn bao nhiêu tiền?** Bài này nói về hai trục đó — **organization design** (chia account) và **cost-aware architecture** — vốn luôn dính chặt vào nhau, vì ranh giới account chính là ranh giới billing.

Không có sơ đồ "đúng tuyệt đối". Mọi quyết định ở tầng này là đánh đổi giữa **cost — reliability — speed (tốc độ ship) — security/isolation**. Việc của bạn không phải chọn cái tốt nhất, mà là *biết mình đang đánh đổi gì và nói rõ được lý do*.

---

## 1. Vì sao multi-account? Ba lý do thật

Một startup khởi đầu với 1 account, mọi thứ chung nhau. Nó hoạt động — cho tới khi không. Ba áp lực đẩy bạn tách account:

**Blast radius (bán kính sát thương).** Một IAM key bị lộ, một `terraform destroy` nhầm, một service bị compromise — trong single account, "tới đâu" là *toàn bộ*. Account là ranh giới cô lập mạnh nhất AWS cung cấp: mạnh hơn IAM policy, mạnh hơn VPC, mạnh hơn tag.

**Isolation (cô lập môi trường & team).** Prod và Dev chung account nghĩa là một query test có thể đập vào RDS prod, một service quota (vd. số Lambda concurrent) bị Dev ăn hết làm Prod nghẹn. Tách account = quota riêng, limit riêng, IAM riêng.

**Billing & ownership.** Đây là lý do bị xem nhẹ nhưng quan trọng nhất với người ra quyết định. Một account = một đường kẻ chi phí rõ ràng. Muốn biết team Search tốn bao nhiêu? Cho họ account riêng, đọc bill. Không cần tag chuẩn chỉnh, không cần cost allocation phức tạp.

```
       SINGLE ACCOUNT                      MULTI-ACCOUNT
  ┌───────────────────────┐      ┌─────────┐ ┌─────────┐ ┌─────────┐
  │ dev  staging  prod     │      │  Prod   │ │ Staging │ │   Dev   │
  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓       │      │ ▓▓▓▓▓▓  │ │ ▓▓▓▓    │ │ ▓▓▓     │
  │  một lỗ → cháy hết      │      └────┬────┘ └────┬────┘ └────┬────┘
  └───────────────────────┘           cháy ở đây ↑ dừng ở ranh giới account
   billing: 1 cục mờ mịt              billing: 3 dòng rõ ràng
```

> 💡 Nguyên tắc: Account là đơn vị cô lập VÀ đơn vị tính tiền. Hãy vẽ ranh giới account theo *blast radius bạn muốn chặn* và *chi phí bạn muốn đo riêng* — thường hai cái này trùng nhau.

> ⚠️ Bẫy thiết kế: Tách quá tay. 200 account cho 200 microservice nghe "cô lập tuyệt đối" nhưng tạo gánh nặng vận hành khổng lồ (networking, IAM, quản lý baseline). Đa số tổ chức chia theo **team/business unit + môi trường**, không phải theo service.

---

## 2. AWS Organizations & cây OU

**AWS Organizations** gom nhiều account dưới một **management account** (account gốc, trước đây gọi "master/payer"). Lợi ích lập tức: **consolidated billing** (một hoá đơn, gộp usage để ăn volume discount & chia sẻ Reserved Instances / Savings Plans), và khả năng áp **policy tập trung**.

**OU (Organizational Unit)** là thư mục để nhóm account và áp policy theo nhóm. Cây OU nên phản ánh *cách bạn muốn quản trị*, không phải sơ đồ phòng ban.

```
Root
├── Management account            ← chỉ billing + Organizations, KHÔNG chạy workload
├── OU: Security
│   ├── Log Archive account       ← gom CloudTrail/Config logs, write-once
│   └── Audit account             ← read-only cross-account cho security team
├── OU: Infrastructure
│   └── Shared Services account   ← DNS, AD, CI/CD, golden AMI, TGW
├── OU: Workloads
│   ├── OU: Prod   → prod-app-a, prod-app-b
│   └── OU: NonProd→ dev-app-a, staging-app-a
└── OU: Sandbox                   ← account thử nghiệm, SCP siết chặt, auto-clean
```

> ⚠️ Bẫy thiết kế: Chạy workload trong management account. Đừng. Account này nắm quyền tối thượng trên cả org; mọi compromise ở đây là game over. Giữ nó trống, chỉ làm billing và quản lý Organizations.

---

## 3. Landing zone & Control Tower

Dựng 30 account thủ công, mỗi cái phải cấu hình CloudTrail, Config, IAM baseline, VPC, log shipping... là công việc chán và dễ sai. **Landing zone** = một bộ khung account + guardrail + baseline đã chuẩn hoá, để mỗi account mới sinh ra "đúng chuẩn" từ giây đầu tiên.

**AWS Control Tower** là dịch vụ managed dựng landing zone giúp bạn: tạo cây OU mẫu, bật CloudTrail/Config org-wide, cung cấp **Account Factory** (vend account mới theo template), và một bộ **guardrail** (preventive + detective) bật sẵn.

| | Tự build (Terraform/CDK) | Control Tower |
|---|---|---|
| Tốc độ khởi đầu | Chậm, phải tự code | Nhanh, vài click |
| Linh hoạt | Tối đa | Bị giới hạn theo khuôn |
| Bảo trì | Bạn tự gánh | AWS quản phần lõi |
| Phù hợp | Team platform mạnh, yêu cầu đặc thù | Đa số tổ chức, muốn chuẩn nhanh |

> 💡 Nguyên tắc: Control Tower để *khởi động nhanh và đúng*; khi nhu cầu vượt khuôn của nó, bổ sung bằng IaC chứ đừng vứt bỏ. "Buy then extend" rẻ hơn "build from zero" cho hạ tầng nền.

---

## 4. SCP — guardrail cấp tổ chức

**SCP (Service Control Policy)** là policy gắn vào OU/account, đặt **trần quyền tối đa** (permission boundary) cho mọi principal trong đó — *kể cả root user của account con*. SCP **không cấp** quyền; nó chỉ **giới hạn** quyền mà IAM có thể cấp.

```
   Quyền thực tế = (IAM cho phép)  ∩  (SCP cho phép)
   IAM nói "được" + SCP nói "không" → KHÔNG ĐƯỢC
```

Ví dụ guardrail thường gặp — chặn mọi region ngoài danh sách cho phép:

```json
{
  "Effect": "Deny",
  "Action": ["ec2:RunInstances"],
  "Resource": "*",
  "Condition": {
    "StringNotEquals": { "ec2:Region": ["ap-southeast-1", "us-east-1"] }
  }
}
```

Vài SCP "kinh điển" nên có: chặn region ngoài danh sách (giảm bề mặt tấn công + bill bất ngờ), chặn tắt CloudTrail/GuardDuty, chặn xoá log bucket, chặn tạo IAM user (ép dùng SSO/role).

> ⚠️ Bẫy thiết kế: Đặt SCP `Deny *` lên OU chứa account của bạn rồi tự khoá mình ra ngoài. Luôn test SCP trên một OU sandbox trước; nhớ rằng management account **không** bị SCP ràng buộc (nên đừng dựa vào SCP để bảo vệ chính nó).

> 💡 Nguyên tắc: SCP đặt *ranh giới không bao giờ được vượt* (vd. "không region lạ", "không tắt audit"). IAM lo *quyền hằng ngày*. Đừng nhồi logic chi tiết vào SCP — nó là hàng rào, không phải cánh cửa.

---

## 5. Shared Services — gom cái dùng chung

Một số thứ vô lý nếu mỗi account tự dựng: DNS private, Active Directory, CI/CD runner, golden AMI/container image, certificate, package registry. Gom vào một **Shared Services account**, các account khác tiêu thụ qua cross-account (Resource Access Manager, role assumption, hoặc endpoint).

```
        ┌────────────────────────┐
        │ Shared Services account │
        │  Route53 private zones  │
        │  CI/CD (pipeline)       │
        │  Golden AMI / ECR       │
        │  Centralized egress NAT │
        └───────────┬────────────┘
        ┌───────────┼───────────┐
    ┌───▼───┐   ┌───▼───┐   ┌───▼───┐
    │ Prod  │   │Staging│   │  Dev  │   ← consume, không tự dựng lại
    └───────┘   └───────┘   └───────┘
```

Đánh đổi: gom giảm trùng lặp & chi phí (một NAT gateway thay vì N cái), nhưng tạo **single point of dependency** — shared services sập thì nhiều account bị ảnh hưởng. Hệ quả: cái gì đã "shared" phải được thiết kế reliability cao hơn workload thường.

---

## 6. Networking giữa account — Transit Gateway

Nhiều account = nhiều VPC. Kết nối chúng thế nào?

| Cách | Mô hình | Khi nào | Đánh đổi |
|---|---|---|---|
| **VPC Peering** | Điểm-điểm, full mesh | Ít VPC (2–4), traffic đơn giản | N VPC → N(N-1)/2 peering, không bắc cầu (non-transitive) → bùng nổ |
| **Transit Gateway (TGW)** | Hub-and-spoke | Nhiều VPC/account, cần định tuyến tập trung | Hub trung tâm, dễ quản route; **tốn phí/giờ + phí/GB** |
| **PrivateLink** | Expose 1 service qua endpoint | Chỉ cần *một dịch vụ*, không cần nối cả mạng | Cô lập tốt nhất, nhưng per-service |

```
   PEERING (mesh)            TRANSIT GATEWAY (hub)
   A───B                        A   B   C
   │ ╳ │                         \  │  /
   C───D                          ┌─▼─┐
   4 VPC = 6 link                 │TGW│ ← 1 attachment/VPC, route bảng trung tâm
   thêm 1 VPC = +4 link           └───┘
```

> ⚠️ Bẫy thiết kế: Dùng TGW như default cho mọi thứ. TGW tính tiền theo *attachment-hour* **và** *GB xử lý*. Nếu hai service chỉ cần gọi nhau một API, **PrivateLink** rẻ và an toàn hơn nhiều việc nối phẳng cả hai mạng.

---

## 7. Cost-aware architecture — chọn service theo chi phí

Đây là chỗ tư duy CTO khác engineer rõ nhất. Cùng một bài toán, kiến trúc "đẹp" và kiến trúc "đúng chi phí" có thể rất khác.

**Capacity estimation có con số.** Giả sử một API: **500 req/s** trung bình, payload 2 KB, peak 3×.

```
Trung bình : 500 req/s × 86 400 s ≈ 43.2 triệu req/ngày
Peak       : 1 500 req/s
Bandwidth  : 500 req/s × 2 KB    ≈ 1 MB/s egress  ≈ 86 GB/ngày
```

So sánh hai cách chạy compute cho API này (giá minh hoạ, để so *tỷ lệ* chứ không phải số tuyệt đối):

| Tiêu chí | Lambda (serverless) | EC2/ECS (luôn bật) |
|---|---|---|
| Chi phí khi *idle* | ~0 (trả theo request) | Trả full 24/7 dù không ai gọi |
| Chi phí khi *traffic đều & cao* | Đắt dần (mỗi req tính tiền) | Rẻ hơn nếu utilization cao |
| Điểm hoà vốn | Traffic thấp/bursty → Lambda thắng | Traffic cao/ổn định → EC2 thắng |
| Speed (ship nhanh) | Nhanh, không quản server | Chậm hơn |
| Reliability | Auto-scale built-in | Phải tự dựng ASG |

Quy tắc thô: **traffic bursty/không đoán được → serverless**; **traffic cao, đều, dự đoán được → reserved/committed compute**. Sai ở đây có thể chênh 5–10× hoá đơn.

### Bẫy chi phí lớn nhất: Data transfer

Hầu hết engineer định giá theo compute & storage, rồi sốc khi đọc bill. **Data transfer** là sát thủ thầm lặng:

```
Egress ra Internet              : tính tiền/GB (đắt)
Cross-AZ trong VPC              : tính tiền/GB CẢ HAI CHIỀU
Cross-Region                   : tính tiền/GB (đắt hơn cross-AZ)
NAT Gateway processing         : tính tiền/GB qua NAT
TGW processing                 : tính tiền/GB qua hub
Inbound (vào AWS)              : thường miễn phí
```

Một kiến trúc microservice "chuẩn HA" trải đều 3 AZ, gọi nhau chéo AZ liên tục, có thể đốt một khoản cross-AZ transfer mà không ai nhìn thấy trong sơ đồ.

> ⚠️ Bẫy thiết kế: Chatty service span nhiều AZ. Hai service gọi nhau hàng triệu lần/ngày nhưng nằm khác AZ → bạn trả tiền cross-AZ cho từng cuộc gọi. Cân nhắc AZ-affinity (giữ cặp service cùng AZ, chỉ failover khi cần) — đánh đổi *một chút reliability* lấy *cắt mạnh transfer cost*.

> 💡 Nguyên tắc: Trước khi tối ưu compute, **vẽ luồng dữ liệu và hỏi "byte này đi qua ranh giới tính tiền nào?"**. Egress, cross-AZ, NAT, cross-region — đó mới là nơi tiền rò rỉ.

Vài đòn bẩy chi phí khác đáng nhớ: **S3 lifecycle** (chuyển sang Infrequent Access / Glacier theo tuổi dữ liệu), **VPC Gateway Endpoint cho S3/DynamoDB** (miễn phí, tránh trả NAT cho traffic tới S3), **CloudFront** trước origin (cache giảm egress origin), **Graviton** (ARM, rẻ hơn ~20% cùng hiệu năng), **Spot** cho workload chịu gián đoạn.

---

## 8. FinOps & tagging

**FinOps** là văn hoá: chi phí là trách nhiệm chung của engineering, không phải việc của riêng finance. Trụ cột là **visibility → accountability → optimization**.

Không có **tagging** chuẩn thì mọi cost report đều mù. Một bộ tag tối thiểu:

```
Environment = prod | staging | dev
Team        = search | payments | platform
CostCenter  = CC-1042
Owner       = email / team
```

Áp **tag policy** (qua Organizations) để ép định dạng, kích hoạt **Cost Allocation Tags** để tag xuất hiện trong Cost Explorer. Đặt **Budgets** với alert khi vượt ngưỡng, và **Cost Anomaly Detection** để bắt vọt chi phí bất thường (thường là leak hoặc bị tấn công).

> 💡 Nguyên tắc: Cost không phải báo cáo cuối tháng — nó là *signal real-time*. Một service tự nhiên đắt gấp đôi tuần này là một incident, hãy xử lý như incident.

> ⚠️ Bẫy thiết kế: Để tagging "làm sau". Untagged resource gần như không bao giờ được dọn; nợ tag tích luỹ tới mức không thể truy ngược ai sở hữu cái gì. Ép tag *ngay từ provisioning* (SCP/IaC từ chối resource thiếu tag).

---

## 9. Well-Architected — 6 pillar áp vào multi-account

**AWS Well-Architected Framework** cho bạn một checklist chung. Áp vào bối cảnh multi-account/cost:

| Pillar | Câu hỏi cốt lõi | Liên hệ multi-account |
|---|---|---|
| **Operational Excellence** | Vận hành & cải tiến thế nào? | Landing zone, IaC, baseline tự động |
| **Security** | Bảo vệ data & system ra sao? | Account isolation, SCP, centralized logging |
| **Reliability** | Phục hồi khi hỏng thế nào? | Multi-AZ, blast radius theo account |
| **Performance Efficiency** | Dùng đúng resource? | Chọn service đúng workload (serverless vs EC2) |
| **Cost Optimization** | Có lãng phí không? | Tagging, RI/Savings Plans, transfer trap |
| **Sustainability** | Tác động môi trường? | Graviton, right-sizing, tắt idle |

Điểm mấu chốt: **các pillar mâu thuẫn nhau, và đó là điều bình thường**. Reliability tối đa (multi-region active-active) đánh nhau trực diện với Cost. Speed (ship nhanh, dùng managed) đôi khi hy sinh Cost hoặc Performance tuning. Well-Architected không bảo bạn tối đa hoá cả 6 — nó bắt bạn *làm rõ trade-off và quyết định có chủ đích*.

```
            RELIABILITY
                 ▲
                 │   bạn không ở đỉnh
   bạn ở đâu đó →●   một góc nào đó
                ╱ ╲
               ╱   ╲
          COST◄─────►SPEED
   kéo về một góc = hy sinh hai góc kia
```

---

## 10. Tư duy đánh đổi: Cost vs Reliability vs Speed

Một khung quyết định thực dụng khi đứng trước lựa chọn kiến trúc:

1. **Workload này quan trọng cỡ nào?** Prod doanh thu vs internal tool — quyết định bạn được "mua" bao nhiêu reliability bằng tiền.
2. **Traffic đoán được không?** Đoán được → committed/reserved (rẻ). Bursty → on-demand/serverless.
3. **Đội ngũ chịu được vận hành tới đâu?** Team nhỏ → managed/serverless (đắt hơn nhưng đổi lấy speed & ít người). Team platform mạnh → tự build rẻ hơn.
4. **Chi phí thực sự nằm ở đâu?** Thường không phải compute mà là data transfer & idle resource.

> 💡 Nguyên tắc: "Tiết kiệm tối đa" không phải mục tiêu. Mục tiêu là **chi tiền đúng chỗ tạo giá trị** và **không trả cho thứ không dùng**. Một kiến trúc rẻ 30% nhưng làm team mất 2 tuần/tháng đi vá là kiến trúc đắt.

---

## Cách trình bày khi phỏng vấn / review

Ở vòng phỏng vấn senior/staff hoặc khi review một design, đừng nhảy vào sơ đồ. Hãy đi theo trình tự cho thấy bạn nghĩ về tổ chức và tiền:

- **Hỏi về ranh giới trước:** "Tổ chức có bao nhiêu team, môi trường? Mức cô lập yêu cầu? Có ràng buộc compliance/region không?" — điều này quyết định cây account/OU.
- **Nêu blast radius rõ ràng:** "Tôi tách Prod và NonProd thành OU riêng vì muốn một sự cố Dev *không thể* chạm Prod, kể cả ở tầng IAM."
- **Luôn nói trade-off thành lời:** không nói "tôi dùng TGW" mà "tôi dùng TGW vì có >5 VPC cần định tuyến tập trung; đánh đổi là chi phí per-GB, nên service chỉ-gọi-một-API tôi sẽ để PrivateLink."
- **Đưa con số khi nói cost:** "Với ~500 req/s đều, EC2 reserved rẻ hơn Lambda; nhưng nếu traffic bursty 10:1 thì ngược lại." Con số > tính từ.
- **Chốt bằng cách bạn *đo*:** tagging, Budgets, Anomaly Detection — cho thấy bạn nghĩ về vận hành lâu dài, không chỉ ngày launch.

> 💡 Nguyên tắc trình bày: Người phỏng vấn cấp cao không tìm "đáp án đúng" — họ tìm xem bạn có *nhận ra mình đang đánh đổi gì* và *có khung để quyết định* hay không. Một câu "tuỳ vào X, nếu X thì A, nếu không thì B" giá trị hơn một sơ đồ hoàn hảo không kèm lý do.

---

## Liên hệ sang AWS

| Khái niệm | Service AWS cụ thể |
|---|---|
| Quản lý nhiều account, billing gộp | **AWS Organizations** |
| Landing zone dựng nhanh + Account Factory | **AWS Control Tower** |
| Guardrail trần quyền cấp org | **Service Control Policies (SCP)**, **Tag policies** |
| Đăng nhập tập trung qua account | **IAM Identity Center** (trước là AWS SSO) |
| Chia sẻ resource cross-account | **Resource Access Manager (RAM)** |
| Networking hub nhiều VPC | **Transit Gateway**; điểm-điểm: **VPC Peering**; per-service: **PrivateLink** |
| Audit & log tập trung | **CloudTrail (org trail)**, **AWS Config**, account Log Archive |
| Phát hiện mối đe doạ | **GuardDuty**, **Security Hub** |
| Phân tích & dự báo chi phí | **Cost Explorer**, **Cost and Usage Report (CUR)** |
| Cảnh báo ngân sách & bất thường | **AWS Budgets**, **Cost Anomaly Detection** |
| Cam kết chi phí giảm giá | **Savings Plans**, **Reserved Instances**, **Spot** |
| Đánh giá kiến trúc theo 6 pillar | **AWS Well-Architected Tool** |
| Tối ưu right-sizing | **Compute Optimizer**, **Trusted Advisor** |

**Tóm lại:** multi-account không phải để "trông pro" — nó là cách bạn vẽ ranh giới blast radius và ranh giới chi phí, hai thứ vốn là một. Cost-aware architecture không phải keo kiệt — nó là biết byte nào đi qua ranh giới tính tiền nào. Và Well-Architected không cho bạn đáp án — nó buộc bạn gọi tên trade-off giữa Cost, Reliability và Speed, rồi quyết định có chủ đích. Đó chính là khác biệt giữa một engineer giỏi và một người thiết kế hệ thống ở cấp tổ chức.
