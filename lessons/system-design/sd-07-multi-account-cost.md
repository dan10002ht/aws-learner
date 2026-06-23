# Kiến trúc multi-account & tối ưu chi phí

Khi bạn còn là engineer, "kiến trúc tốt" thường nghĩa là sơ đồ chạy được, scale được. Lên cấp Solutions Architect cao cấp / CTO, câu hỏi đổi sang: **ai được phép làm gì, khi một thứ cháy thì cháy tới đâu, và mỗi tháng cái này tốn bao nhiêu tiền?** Bài này nói về hai trục đó — **organization design** (chia account) và **cost-aware architecture** — vốn luôn dính chặt vào nhau, vì ranh giới account chính là ranh giới billing.

Không có sơ đồ "đúng tuyệt đối". Mọi quyết định ở tầng này là đánh đổi giữa **cost — reliability — speed (tốc độ ship) — security/isolation**. Việc của bạn không phải chọn cái tốt nhất, mà là *biết mình đang đánh đổi gì và nói rõ được lý do*.

---

## 1. Vì sao multi-account? Ba lý do thật

Một startup khởi đầu với 1 account, mọi thứ chung nhau. Nó hoạt động — cho tới khi không. Ba áp lực đẩy bạn tách account:

**Blast radius (bán kính sát thương).** Một IAM key bị lộ, một `terraform destroy` nhầm, một service bị compromise — trong single account, "tới đâu" là *toàn bộ*. Account là ranh giới cô lập mạnh nhất AWS cung cấp: mạnh hơn IAM policy, mạnh hơn VPC, mạnh hơn tag.

**Isolation (cô lập môi trường & team).** Prod và Dev chung account nghĩa là một query test có thể đập vào RDS prod, một service quota (vd. số Lambda concurrent) bị Dev ăn hết làm Prod nghẹn. Tách account = quota riêng, limit riêng, IAM riêng.

**Billing & ownership.** Đây là lý do bị xem nhẹ nhưng quan trọng nhất với người ra quyết định. Một account = một đường kẻ chi phí rõ ràng. Muốn biết team Search tốn bao nhiêu? Cho họ account riêng, đọc bill. Không cần tag chuẩn chỉnh, không cần cost allocation phức tạp.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Single account vs Multi-account: blast radius và billing</title>
  <desc>Single account: một lỗ làm cháy toàn bộ, billing là một cục mờ. Multi-account: sự cố dừng ở ranh giới mỗi account, billing là nhiều dòng rõ ràng.</desc>
  <text x="170" y="28" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">SINGLE ACCOUNT</text>
  <text x="540" y="28" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">MULTI-ACCOUNT</text>
  <rect x="40" y="48" width="260" height="150" rx="11" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="170" y="74" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.7">dev · staging · prod chung nhau</text>
  <circle cx="170" cy="125" r="34" fill="#f59e0b" fill-opacity="0.55"/>
  <circle cx="170" cy="125" r="60" fill="none" stroke="#f59e0b" stroke-opacity="0.5" stroke-dasharray="4 4"/>
  <text x="170" y="129" font-size="11" text-anchor="middle" font-weight="700" fill="#fff">CHÁY HẾT</text>
  <text x="170" y="186" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">một lỗ → lan ra toàn bộ</text>
  <rect x="380" y="48" width="100" height="150" rx="11" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/>
  <rect x="490" y="48" width="100" height="150" rx="11" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/>
  <rect x="600" y="48" width="100" height="150" rx="11" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/>
  <text x="430" y="74" font-size="12" text-anchor="middle" font-weight="700" fill="currentColor">Prod</text>
  <text x="540" y="74" font-size="12" text-anchor="middle" font-weight="700" fill="currentColor">Staging</text>
  <text x="650" y="74" font-size="12" text-anchor="middle" font-weight="700" fill="currentColor">Dev</text>
  <circle cx="430" cy="130" r="26" fill="#f59e0b" fill-opacity="0.55"/>
  <text x="430" y="134" font-size="9.5" text-anchor="middle" font-weight="700" fill="#fff">cháy</text>
  <text x="430" y="184" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">dừng ở ranh giới</text>
  <text x="540" y="134" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">an toàn</text>
  <text x="650" y="134" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">an toàn</text>
  <rect x="40" y="226" width="260" height="64" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="56" y="250" font-size="11.5" font-weight="700" fill="currentColor">Billing:</text>
  <rect x="56" y="262" width="228" height="14" rx="3" fill="#f59e0b" fill-opacity="0.4"/>
  <text x="170" y="273" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.8">1 cục mờ mịt — không tách được</text>
  <rect x="380" y="226" width="320" height="64" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="396" y="246" font-size="11.5" font-weight="700" fill="currentColor">Billing:</text>
  <text x="396" y="264" font-size="10.5" fill="currentColor" opacity="0.85">Prod  ........ $$$$</text>
  <text x="396" y="278" font-size="10.5" fill="currentColor" opacity="0.85">Staging ...... $$   ·   Dev ...... $</text>
  <text x="560" y="246" font-size="10" fill="currentColor" opacity="0.7">3 dòng rõ ràng</text>
</svg>

> 💡 Nguyên tắc: Account là đơn vị cô lập VÀ đơn vị tính tiền. Hãy vẽ ranh giới account theo *blast radius bạn muốn chặn* và *chi phí bạn muốn đo riêng* — thường hai cái này trùng nhau.

> ⚠️ Bẫy thiết kế: Tách quá tay. 200 account cho 200 microservice nghe "cô lập tuyệt đối" nhưng tạo gánh nặng vận hành khổng lồ (networking, IAM, quản lý baseline). Đa số tổ chức chia theo **team/business unit + môi trường**, không phải theo service.

---

## 2. AWS Organizations & cây OU

**AWS Organizations** gom nhiều account dưới một **management account** (account gốc, trước đây gọi "master/payer"). Lợi ích lập tức: **consolidated billing** (một hoá đơn, gộp usage để ăn volume discount & chia sẻ Reserved Instances / Savings Plans), và khả năng áp **policy tập trung**.

**OU (Organizational Unit)** là thư mục để nhóm account và áp policy theo nhóm. Cây OU nên phản ánh *cách bạn muốn quản trị*, không phải sơ đồ phòng ban.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cây OU của AWS Organizations</title>
  <desc>Root phân nhánh xuống Management account và bốn OU: Security (Log Archive, Audit), Infrastructure (Shared Services), Workloads (Prod, NonProd), và Sandbox.</desc>
  <g stroke="currentColor" stroke-opacity="0.4" fill="none">
    <path d="M120 56 V94 H120 M120 56 V300 M120 130 H164 M120 188 H164 M120 246 H164 M120 300 H164"/>
    <path d="M250 130 V160 H294 M250 130 V218 H294"/>
    <path d="M250 246 V276 H294 M250 246 V334 H294"/>
  </g>
  <rect x="48" y="36" width="144" height="40" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="120" y="61" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Root</text>
  <rect x="164" y="110" width="220" height="40" rx="9" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="176" y="127" font-size="12.5" font-weight="700" fill="currentColor">Management account</text>
  <text x="176" y="143" font-size="10.5" fill="currentColor" opacity="0.62">chỉ billing — KHÔNG chạy workload</text>
  <rect x="164" y="168" width="100" height="40" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="214" y="186" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">OU: Security</text>
  <text x="214" y="201" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.62">guardrail siết</text>
  <rect x="294" y="146" width="170" height="34" rx="8" fill="#10b981" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="304" y="167" font-size="11" fill="currentColor">Log Archive · CloudTrail/Config</text>
  <rect x="294" y="204" width="170" height="34" rx="8" fill="#10b981" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="304" y="225" font-size="11" fill="currentColor">Audit · read-only cross-account</text>
  <rect x="164" y="226" width="100" height="40" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="214" y="251" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">OU: Infra</text>
  <rect x="294" y="262" width="190" height="34" rx="8" fill="#3b82f6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="304" y="283" font-size="11" fill="currentColor">Shared Services · DNS/CI-CD/TGW</text>
  <rect x="164" y="284" width="100" height="40" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="214" y="309" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">OU: Workloads</text>
  <rect x="294" y="320" width="190" height="34" rx="8" fill="#3b82f6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="304" y="335" font-size="10.5" fill="currentColor">OU Prod → prod-app-a/b</text>
  <text x="304" y="349" font-size="10.5" fill="currentColor">OU NonProd → dev/staging</text>
  <rect x="164" y="362" width="220" height="40" rx="9" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="176" y="379" font-size="12.5" font-weight="700" fill="currentColor">OU: Sandbox</text>
  <text x="176" y="395" font-size="10.5" fill="currentColor" opacity="0.62">thử nghiệm, SCP siết chặt, auto-clean</text>
  <g stroke="currentColor" stroke-opacity="0.4" fill="none">
    <path d="M120 300 V382 H164"/>
  </g>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>VPC Peering full-mesh vs Transit Gateway hub-and-spoke</title>
  <desc>Peering full-mesh: 4 VPC cần 6 link điểm-điểm, không bắc cầu, thêm 1 VPC là thêm 4 link. Transit Gateway: mỗi VPC chỉ một attachment vào hub trung tâm với route table chung.</desc>
  <text x="170" y="28" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">VPC PEERING (full-mesh)</text>
  <text x="540" y="28" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">TRANSIT GATEWAY (hub)</text>
  <g stroke="#3b82f6" stroke-opacity="0.7" stroke-width="1.6">
    <line x1="95" y1="90" x2="245" y2="90"/>
    <line x1="95" y1="200" x2="245" y2="200"/>
    <line x1="95" y1="90" x2="95" y2="200"/>
    <line x1="245" y1="90" x2="245" y2="200"/>
    <line x1="95" y1="90" x2="245" y2="200"/>
    <line x1="245" y1="90" x2="95" y2="200"/>
  </g>
  <g font-size="13" font-weight="700" text-anchor="middle">
    <circle cx="95" cy="90" r="22" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/><text x="95" y="95" fill="currentColor">A</text>
    <circle cx="245" cy="90" r="22" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/><text x="245" y="95" fill="currentColor">B</text>
    <circle cx="95" cy="200" r="22" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/><text x="95" y="205" fill="currentColor">C</text>
    <circle cx="245" cy="200" r="22" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/><text x="245" y="205" fill="currentColor">D</text>
  </g>
  <text x="170" y="252" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.85">4 VPC = 6 link · không bắc cầu</text>
  <text x="170" y="270" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.65">thêm 1 VPC = +4 link → bùng nổ</text>
  <g stroke="#10b981" stroke-opacity="0.7" stroke-width="1.6">
    <line x1="450" y1="90" x2="540" y2="150"/>
    <line x1="540" y1="80" x2="540" y2="125"/>
    <line x1="630" y1="90" x2="540" y2="150"/>
    <line x1="450" y1="210" x2="540" y2="170"/>
    <line x1="630" y1="210" x2="540" y2="170"/>
  </g>
  <g font-size="13" font-weight="700" text-anchor="middle">
    <circle cx="450" cy="90" r="20" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/><text x="450" y="95" fill="currentColor">A</text>
    <circle cx="540" cy="70" r="20" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/><text x="540" y="75" fill="currentColor">B</text>
    <circle cx="630" cy="90" r="20" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/><text x="630" y="95" fill="currentColor">C</text>
    <circle cx="450" cy="210" r="20" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/><text x="450" y="215" fill="currentColor">D</text>
    <circle cx="630" cy="210" r="20" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/><text x="630" y="215" fill="currentColor">E</text>
  </g>
  <rect x="500" y="138" width="80" height="44" rx="9" fill="#10b981" fill-opacity="0.5" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="540" y="164" font-size="13" font-weight="700" text-anchor="middle" fill="#fff">TGW</text>
  <text x="540" y="252" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.85">1 attachment/VPC</text>
  <text x="540" y="270" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.65">route table trung tâm · phí/giờ + phí/GB</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Ranh giới tính tiền của data transfer</title>
  <desc>Một byte rời tiến trình đi qua các ranh giới: inbound vào AWS miễn phí; cross-AZ tính cả hai chiều; NAT và TGW tính theo GB xử lý; egress Internet tính theo GB đắt; cross-region đắt hơn cross-AZ.</desc>
  <text x="360" y="26" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Byte này đi qua ranh giới tính tiền nào?</text>
  <rect x="40" y="160" width="120" height="64" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="100" y="190" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Service</text>
  <text x="100" y="207" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">AZ-a, VPC</text>
  <g stroke="currentColor" stroke-opacity="0.45" fill="none" marker-end="url(#ar)">
    <defs><marker id="ar" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="currentColor"/></marker></defs>
    <path d="M40 120 H100 V154"/>
    <path d="M160 175 H300"/>
    <path d="M160 200 H205 V300 H300"/>
    <path d="M160 210 H225 V370 H300"/>
  </g>
  <rect x="300" y="78" width="160" height="44" rx="9" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="380" y="98" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Inbound vào AWS</text>
  <text x="380" y="114" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">thường MIỄN PHÍ</text>
  <rect x="300" y="153" width="170" height="44" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="385" y="173" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Cross-AZ (AZ-a↔AZ-b)</text>
  <text x="385" y="189" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">tính/GB CẢ HAI CHIỀU</text>
  <rect x="300" y="278" width="170" height="44" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="385" y="298" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">NAT / TGW processing</text>
  <text x="385" y="314" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">tính/GB qua hub/NAT</text>
  <rect x="300" y="348" width="170" height="44" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="385" y="368" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Cross-Region</text>
  <text x="385" y="384" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">tính/GB — đắt hơn cross-AZ</text>
  <g stroke="currentColor" stroke-opacity="0.45" fill="none" marker-end="url(#ar)">
    <path d="M470 175 H560"/>
    <path d="M470 300 H525 V230 H560"/>
  </g>
  <rect x="560" y="153" width="130" height="64" rx="10" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="625" y="180" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Egress</text>
  <text x="625" y="196" font-size="11" text-anchor="middle" fill="currentColor">Internet</text>
  <text x="625" y="211" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">tính/GB (đắt)</text>
  <text x="625" y="240" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.55">đích cuối</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" style="width:100%;max-width:560px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Tam giác đánh đổi Well-Architected: Reliability, Cost, Speed</title>
  <desc>Ba góc Reliability, Cost, Speed. Bạn nằm đâu đó bên trong tam giác; kéo về một góc nghĩa là hy sinh hai góc kia, không thể ở cả ba đỉnh cùng lúc.</desc>
  <polygon points="360,50 160,290 560,290" fill="#3b82f6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.6"/>
  <circle cx="360" cy="50" r="7" fill="#10b981"/>
  <circle cx="160" cy="290" r="7" fill="#f59e0b"/>
  <circle cx="560" cy="290" r="7" fill="#8b5cf6"/>
  <text x="360" y="38" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">RELIABILITY</text>
  <text x="150" y="312" font-size="14" font-weight="700" text-anchor="end" fill="currentColor">COST</text>
  <text x="570" y="312" font-size="14" font-weight="700" text-anchor="start" fill="currentColor">SPEED</text>
  <circle cx="335" cy="195" r="9" fill="#ef4444" fill-opacity="0.9"/>
  <circle cx="335" cy="195" r="16" fill="none" stroke="#ef4444" stroke-opacity="0.5" stroke-dasharray="3 3"/>
  <text x="335" y="232" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">bạn ở đâu đó</text>
  <text x="335" y="249" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">một góc nào đó, không ở đỉnh</text>
  <text x="360" y="330" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.8">kéo về một góc = hy sinh hai góc kia</text>
</svg>

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
