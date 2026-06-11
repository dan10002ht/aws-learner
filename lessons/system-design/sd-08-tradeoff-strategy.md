# Build vs Buy & Technology Strategy

Đến bài này, bạn đã biết *thiết kế* hệ thống. Nhưng càng lên cao — Senior Architect, Principal, CTO — công việc dịch chuyển từ "thiết kế cái gì" sang "**có nên tự thiết kế hay không**". Một CTO giỏi không phải người viết được nhiều hệ thống nhất, mà là người **nói KHÔNG với việc tự xây** đúng lúc, để đội ngũ dồn năng lượng hữu hạn vào thứ thực sự tạo ra lợi thế.

Bài này không có sơ đồ throughput. Nó nói về **đánh đổi giữa kỹ thuật — kinh doanh — con người**, và đa số quyết định ở đây không thể đo bằng benchmark. Đó là lý do nó khó.

> 💡 **Nguyên tắc**: Mỗi dòng code bạn tự viết là một dòng code bạn phải **bảo trì mãi mãi**. Tài sản kỹ thuật cũng là nợ kỹ thuật trá hình. Câu hỏi không phải "xây được không?" mà "đáng để sở hữu suốt vòng đời không?".

---

## 1. Khung quyết định Build vs Buy

Đây là quyết định lặp lại liên tục: hệ thống auth, payment, search, analytics, feature flag, queue, CMS... Tự viết hay mua? Không có đáp án mặc định. Nhưng có **4 trục đánh đổi** để soi mọi quyết định.

### Trục 1 — Core vs Context (quan trọng nhất)

Khái niệm từ Geoffrey Moore. Phân loại mọi capability của công ty:

- **Core**: thứ khách hàng trả tiền vì nó, thứ tạo ra **lợi thế cạnh tranh khác biệt**. Đối thủ làm giống là bạn mất giá trị.
- **Context**: cần-thiết-để-vận-hành nhưng **không khác biệt hoá**. Khách hàng không trả thêm một đồng nào vì bạn làm nó tốt hơn đối thủ.

```
                       LÀM TỐT CÓ TẠO LỢI THẾ?
                         CÓ            KHÔNG
                   ┌──────────────┬──────────────┐
   QUAN     CAO    │   CORE       │   CONTEXT     │
   TRỌNG          │   → BUILD    │  quan trọng   │
   VỚI            │   (tự xây,    │  → BUY tốt   │
   VẬN            │    đầu tư)    │  (SaaS xịn)   │
   HÀNH?   ├──────────────┼──────────────┤
           THẤP   │  hiếm gặp     │   CONTEXT     │
                   │  (cân nhắc    │  → BUY rẻ /  │
                   │   bỏ hẳn)     │   open-source │
                   └──────────────┴──────────────┘
```

> 💡 **Nguyên tắc**: **Build cái Core, Buy cái Context.** Netflix tự xây recommendation engine (core) nhưng dùng AWS cho hạ tầng (context). Một startup fintech build risk-engine (core) nhưng *không bao giờ* tự viết hệ thống gửi email (context).

Cái bẫy chết người: kỹ sư **thích** tự xây vì nó vui và "ta làm tốt hơn được". Nhưng "làm tốt hơn" một cái context không tạo ra đồng doanh thu nào — nó chỉ đốt thời gian của những người giỏi nhất vào thứ không ai trả tiền.

### Trục 2 — TCO (Total Cost of Ownership), không phải giá license

So sánh "SaaS $2.000/tháng" với "tự host miễn phí" là sai lầm kinh điển. TCO của tự xây gồm:

| Hạng mục chi phí | Buy (SaaS) | Build (tự xây) |
|---|---|---|
| Phí license / usage | Cao, rõ ràng | $0 |
| Lương kỹ sư xây ban đầu | $0 | 2–4 người × nhiều tháng |
| Bảo trì, vá lỗi, on-call | Nhà cung cấp lo | **Mãi mãi** của bạn |
| Hạ tầng vận hành | Gộp trong giá | Server, monitor, backup |
| Chi phí cơ hội | Đội làm việc khác | Đội **không** làm core |
| Rủi ro bảo mật / compliance | Họ chứng nhận | Bạn tự chịu |

### Ước lượng có con số — đừng quyết bằng cảm giác

Giả sử một SaaS search giá **$30.000/năm**. Nghe đắt. Tự xây thì sao?

```
TỰ XÂY hệ thống search:
  Năm 1 (build):
    3 kỹ sư × 4 tháng × $10.000/người/tháng  = $120.000
    Hạ tầng (cluster, replica, monitor)       =  $20.000/năm
                                       Tổng năm 1 ≈ $140.000

  Năm 2 trở đi (maintain):
    1 kỹ sư × 30% thời gian × 12 tháng        =  $36.000/năm
    Hạ tầng                                    =  $20.000/năm
                                       Tổng/năm ≈  $56.000/năm

So sánh 3 năm:
  BUY:   $30k × 3                  = $90.000
  BUILD: $140k + $56k + $56k       = $252.000   → đắt gấp ~2.8 lần
```

Tự xây chỉ **rẻ hơn** khi: (a) search là core (giá trị > tiền), hoặc (b) quy mô lớn đến mức license SaaS vượt $250k/năm. Với startup, gần như luôn **BUY**.

> ⚠️ **Bẫy thiết kế**: Bỏ qua chi phí *bảo trì vĩnh viễn* và *chi phí cơ hội*. Đội 5 người tự xây queue thay vì dùng SQS không chỉ tốn tiền — họ **không** xây feature giúp công ty thắng thị trường. Cái mất lớn nhất là thứ bạn không nhìn thấy.

### Trục 3 — Time-to-market

Buy = chạy trong vài ngày. Build = vài tháng. Với startup đang đua giành thị trường, **6 tháng chậm có thể là phá sản** — số tiền tiết kiệm được khi tự xây trở nên vô nghĩa nếu đối thủ chiếm thị trường trước.

> 💡 **Nguyên tắc**: Sớm thì **Buy để đi nhanh**, kiểm chứng product-market fit. Khi đã chứng minh được giá trị và quy mô tăng, mới cân nhắc **build lại phần đã thành core**. Thứ tự ngược lại (build trước, hối tiếc sau) là cái chết của startup.

### Trục 4 — Lock-in & khả năng thoát

Buy không miễn phí về tự do. Mỗi SaaS/managed service tạo một mức lock-in:

| Mức lock-in | Ví dụ | Đánh đổi |
|---|---|---|
| Thấp (chuẩn mở) | PostgreSQL trên RDS, Redis, S3-compatible | Đổi nhà cung cấp dễ |
| Trung bình | Stripe, Auth0, Datadog | Đổi tốn công nhưng làm được |
| Cao (proprietary sâu) | DynamoDB single-table, Cognito, vendor BPM | Đổi ≈ viết lại |

Lock-in không hẳn xấu. DynamoDB lock-in cao nhưng đổi lại bạn được vận hành gần-như-zero ở quy mô khủng. **Vấn đề là lock-in có chủ đích** — bạn chọn nó vì giá trị, không phải vô tình rơi vào.

---

## 2. Khi nào tự xây, khi nào dùng Managed/SaaS

Một heuristic thực dụng để cắt tranh luận:

```
   ┌─ Có phải CORE / lợi thế cạnh tranh?  ──YES──► nghiêng BUILD
   │
   ├─ Đã có giải pháp managed/SaaS chín muồi? ──YES──► nghiêng BUY
   │
   ├─ Yêu cầu của ta có "kỳ dị" mà SaaS không đáp ứng? ──YES──► cân nhắc BUILD
   │
   ├─ Quy mô đủ lớn để license SaaS > chi phí tự vận hành? ─YES─► cân nhắc BUILD
   │
   └─ Còn lại  ───────────────────────────────────────────────► BUY
```

Ba "tầng" lựa chọn, không phải nhị phân:

1. **SaaS hoàn toàn** (vd Stripe, Auth0): nhanh nhất, vận hành = 0, lock-in & chi phí cao nhất.
2. **Managed service trên cloud** (vd RDS, SQS, OpenSearch): bạn quản cấu hình nhưng không quản máy. Cân bằng tốt nhất cho đa số.
3. **Self-hosted open-source** (vd Postgres trên EC2, Kafka tự quản): rẻ license, kiểm soát tối đa, **nhưng** bạn nhận toàn bộ gánh nặng vận hành — backup, patching, scaling, on-call lúc 3 giờ sáng.

> ⚠️ **Bẫy thiết kế**: "Open-source nên miễn phí" là ảo tưởng. Self-host Kafka không có phí license nhưng cần một đội chuyên trách. Với hầu hết công ty, **managed Kafka (MSK) đắt hơn về license nhưng rẻ hơn về TCO**.

---

## 3. Đánh giá công nghệ mới — Tech Radar & Hype Cycle

CTO bị dội bom công nghệ mới mỗi tuần (giờ là AI, hôm qua là blockchain, serverless, microservices...). Cần khung để **không** chạy theo hype mà cũng không bỏ lỡ thứ thực sự đổi cuộc chơi.

### Gartner Hype Cycle — biết mình đang ở đâu

```
 Kỳ vọng
   ▲         Đỉnh kỳ vọng phồng (Peak of Inflated Expectations)
   │            ╱╲   ← "công nghệ này thay đổi tất cả!!!"
   │           ╱  ╲
   │          ╱    ╲___        Dốc khai sáng    Cao nguyên
   │         ╱        ╲___    (Slope of         năng suất
   │        ╱  Vực thẳm    ╲__  Enlightenment) ____________
   │   ____╱   vỡ mộng        ╲╱              ╱
   │ ╱  Khởi phát   (Trough of Disillusionment)
   └────────────────────────────────────────────────► Thời gian
```

> 💡 **Nguyên tắc**: Đừng đưa công nghệ vào sản xuất khi nó ở **đỉnh hype** — thiếu best practice, tài liệu sai, công cụ non. Hãy đợi nó leo qua "vực thẳm vỡ mộng" lên **dốc khai sáng**, lúc đó pattern đã chín và rủi ro thấp hơn nhiều. Trừ khi bạn cố tình đặt cược sớm cho lợi thế tiên phong (bet có chủ đích, biết rủi ro).

### ThoughtWorks Tech Radar — bốn vòng phân loại

Áp dụng cho công nghệ trong nội bộ công ty:

| Vòng | Ý nghĩa | Hành động |
|---|---|---|
| **Adopt** | Đã chứng minh, mặc định dùng | Dùng tự tin |
| **Trial** | Đáng thử trên dự án chịu được rủi ro | Pilot có giới hạn blast radius |
| **Assess** | Theo dõi, làm POC nhỏ | Học, chưa cam kết |
| **Hold** | Tránh dùng cho cái mới | Ngừng mở rộng |

Mỗi công nghệ mới nên vào qua **Assess → Trial → Adopt**, không nhảy thẳng vào production. Và đừng quên vòng **Hold** — biết khi nào *ngừng* dùng cái cũ cũng quan trọng như chọn cái mới.

> ⚠️ **Bẫy thiết kế**: "Resume-driven development" — chọn tech vì nó hot trên CV kỹ sư, không vì bài toán cần. Mỗi công nghệ mới thêm vào stack là một thứ phải tuyển người, đào tạo, vận hành, debug. **Sự nhàm chán là một tính năng**: chọn công nghệ "buồn tẻ nhưng đáng tin" cho phần lõi.

---

## 4. Nợ kỹ thuật — chiến lược quản lý

Nợ kỹ thuật (technical debt) không phải lúc nào cũng xấu — giống nợ tài chính, **vay đúng lúc giúp đi nhanh hơn**, miễn là bạn trả lãi có ý thức. Vấn đề là nợ *vô tình* và nợ *không bao giờ trả*.

### Phân loại để quản (ma trận Fowler)

```
                  CỐ Ý                    VÔ TÌNH
        ┌──────────────────────┬──────────────────────┐
THẬN    │ "Ship trước, refactor │ "Giờ ta biết lẽ ra   │
TRỌNG   │  sprint sau" — nợ      │  nên thiết kế thế này"│
        │  CHIẾN LƯỢC, OK        │  — học hỏi, OK        │
        ├──────────────────────┼──────────────────────┤
LIỀU    │ "Không có thời gian   │ "Design pattern là   │
LĨNH    │  cho thiết kế tử tế"  │  cái gì?" — nợ NGUY  │
        │  — nguy hiểm          │  HIỂM, phải đào tạo   │
        └──────────────────────┴──────────────────────┘
```

Nợ ở góc **Cố ý + Thận trọng** là công cụ kinh doanh hợp lệ. Nợ ở góc **Liều lĩnh** là dấu hiệu đội thiếu kỷ luật hoặc kỹ năng.

### Chiến lược trả nợ

- **Làm nợ hữu hình**: ghi vào backlog như tickets, gắn nhãn, đo "lãi suất" (nó làm chậm mỗi feature mới bao nhiêu?). Nợ vô hình không bao giờ được ưu tiên.
- **Boy Scout Rule**: mỗi lần đụng vào code, để nó sạch hơn một chút. Trả nợ tăng dần thay vì "dự án refactor lớn" (gần như luôn thất bại).
- **Ngân sách cố định**: dành ~15–20% năng lực mỗi sprint cho trả nợ. Coi như chi phí vận hành, không phải việc "khi nào rảnh".
- **Trả nơi đau nhất**: chỉ refactor phần code **thay đổi thường xuyên**. Code xấu nhưng ổn định và không ai đụng tới thì... để yên. Refactor nó là lãng phí.

> 💡 **Nguyên tắc**: Mục tiêu không phải **không có nợ** (bất khả thi và không kinh tế), mà là **nợ luôn nằm trong tầm kiểm soát và minh bạch**. CTO giỏi quản nợ kỹ thuật như CFO quản dòng tiền.

---

## 5. Monolith vs Microservices — quyết định **tổ chức**, không phải kỹ thuật

Đây là cái bẫy lớn nhất với kỹ sư mới lên kiến trúc. Họ tranh luận microservices bằng lý lẽ kỹ thuật (scale, deploy độc lập...). Nhưng **Luật Conway** nói thật:

> "Hệ thống bạn thiết kế sẽ sao chép cấu trúc giao tiếp của tổ chức bạn."

Microservices về bản chất là một quyết định **về tổ chức con người**: chia hệ thống thành các mảnh để **các team độc lập** sở hữu và ship mà không giẫm chân nhau. Nếu bạn chỉ có một team 8 người, microservices cho bạn toàn bộ chi phí (mạng, vận hành phân tán, eventual consistency) mà không có lợi ích chính (tách team).

| Yếu tố | Monolith | Microservices |
|---|---|---|
| Phù hợp quy mô team | 1–3 team nhỏ | Nhiều team độc lập |
| Tốc độ ban đầu | Nhanh | Chậm (cần hạ tầng) |
| Deploy | Đơn giản, 1 unit | Độc lập từng service |
| Debug / trace | Dễ (1 process) | Khó (distributed tracing) |
| Eventual consistency | Tránh được | Phải sống chung |
| Chi phí vận hành | Thấp | Cao (service mesh, observability) |
| Scale từng phần | Khó | Dễ |

> 💡 **Nguyên tắc**: **Bắt đầu bằng monolith** (hay "modular monolith" — ranh giới module rõ ràng bên trong một deploy unit). Tách microservice ra **khi và chỉ khi** một ranh giới module gây đau thực sự về tổ chức: hai team xung đột deploy, một phần cần scale/công nghệ riêng. Tách theo *đau*, không theo lý thuyết.

> ⚠️ **Bẫy thiết kế**: "Microservices từ ngày một" với startup 6 người. Bạn dành 80% thời gian xây hạ tầng phân tán thay vì sản phẩm, và mọi feature giờ phải sửa ở 5 repo. Đây là nguyên nhân giết startup thầm lặng nhất.

---

## 6. Tư duy CTO — cân bằng Kỹ thuật, Kinh doanh, Con người

Kỹ sư tối ưu cho cái *đẹp về kỹ thuật*. CTO tối ưu cho cái *thắng cho công ty*, mà công ty là giao của ba lực:

```
            KỸ THUẬT
          (đúng đắn,
        bền vững, scale)
              ╱  ╲
             ╱    ╲
            ╱  ✔   ╲     ← quyết định tốt
           ╱ vùng   ╲       nằm ở giao cả ba
          ╱  cân bằng ╲
   KINH DOANH ────── CON NGƯỜI
  (doanh thu,        (kỹ năng đội,
   tốc độ, chi phí)   tuyển dụng, tinh thần)
```

Một giải pháp **hoàn hảo về kỹ thuật** nhưng team không đủ kỹ năng vận hành, hoặc mất 1 năm trong khi đối thủ ship trong 2 tháng, là một giải pháp **tệ**. Vài câu hỏi CTO luôn hỏi mà kỹ sư hay quên:

- "Team của ta có **vận hành nổi** cái này lúc 3 giờ sáng không?" (con người)
- "Cái này giúp ta kiếm/giữ tiền **nhanh hơn** bao nhiêu?" (kinh doanh)
- "Chọn này khoá ta vào con đường nào trong 3 năm tới?" (kỹ thuật dài hạn)
- "Nếu sai, ta **quay đầu** được không, tốn bao nhiêu?" (xem mục 7)

> 💡 **Nguyên tắc**: Quyết định kiến trúc tốt nhất thường **không** phải cái tối ưu nhất về kỹ thuật, mà là cái **đủ tốt về kỹ thuật** và **thắng về kinh doanh và con người**. "Boring technology that the team can run" thắng "shiny tech nobody understands".

---

## 7. Quyết định một-chiều vs hai-chiều (One-way vs Two-way Door)

Khung của Jeff Bezos, công cụ ra quyết định mạnh nhất của bài này.

- **Two-way door** (cửa hai chiều): quyết định **đảo ngược được**. Nếu sai, bước trở lại dễ. → **Quyết nhanh, phân quyền**, không cần họp nhiều. Tốc độ quan trọng hơn sự hoàn hảo.
- **One-way door** (cửa một chiều): quyết định **khó/không thể đảo ngược**. Sai thì rất tốn. → **Quyết chậm, cẩn trọng**, thu thập dữ liệu, nhiều người soi.

```
   ĐẢO NGƯỢC ĐƯỢC?
   ┌───────────────────────────┬───────────────────────────┐
   │  TWO-WAY DOOR             │   ONE-WAY DOOR            │
   │  (cửa hai chiều)          │   (cửa một chiều)         │
   ├───────────────────────────┼───────────────────────────┤
   │ • Chọn thư viện UI        │ • Chọn ngôn ngữ lõi        │
   │ • Tên endpoint nội bộ     │ • Mô hình dữ liệu công khai│
   │ • Feature flag bật/tắt    │ • Public API contract     │
   │ • Đổi managed service     │ • Single vs multi-tenant   │
   │   ranh giới chuẩn         │ • Chọn cloud provider sâu  │
   │                           │ • Database chính           │
   │ → QUYẾT NHANH, thử & học  │ → QUYẾT CHẬM, đo & soi kỹ │
   └───────────────────────────┴───────────────────────────┘
```

> ⚠️ **Bẫy thiết kế**: Hai sai lầm đối xứng. (1) Đối xử **two-way door như one-way** → tê liệt phân tích (analysis paralysis), họp 6 tuần để chọn thứ đổi lại trong 1 ngày. (2) Đối xử **one-way door như two-way** → "cứ làm rồi tính", rồi mắc kẹt với public API hay schema sai trong 5 năm vì hàng nghìn client đã phụ thuộc.

Mẹo thực dụng để **biến one-way thành two-way**: thêm một lớp trừu tượng. Public API qua một façade/adapter cho phép đổi backend sau. Đặt repository pattern trước database cho phép đổi DB ít đau hơn. **Đầu tư vào tính đảo-ngược-được chính là mua quyền quyết nhanh về sau.**

---

## 8. Cách trình bày khi phỏng vấn / review kiến trúc

Ở phỏng vấn cấp cao (Staff/Principal) và architecture review, người ta không chấm bạn ở "đáp án đúng" — họ chấm **chất lượng tư duy đánh đổi**. Cách ghi điểm:

1. **Đặt tên trade-off, không phán xét tuyệt đối.** Nói "Build cho ta kiểm soát và tiết kiệm dài hạn nhưng tốn time-to-market và năng lực đội; Buy ngược lại" thay vì "Nên dùng X". Người nghe cấp cao dị ứng với câu trả lời tuyệt đối.
2. **Phân loại quyết định trước.** "Đây là one-way door nên tôi sẽ cẩn trọng" — câu này lập tức cho thấy bạn tư duy như leader.
3. **Gắn vào kinh doanh.** "Vì ta là startup đua thị trường, time-to-market áp đảo, nên tôi Buy giai đoạn này và đặt một adapter để build lại nếu thành core." Kết nối kỹ thuật ↔ kinh doanh ↔ tính đảo-ngược.
4. **Định lượng khi có thể.** Đưa ước lượng TCO 3 năm thô như mục 1. Con số thắng cảm tính.
5. **Nêu điều kiện đổi ý.** "Tôi sẽ build lại khi license vượt $250k/năm hoặc khi nó thành core" — cho thấy bạn nghĩ động theo thời gian, không quyết một lần rồi quên.
6. **Thừa nhận chi phí con người.** "Team chưa có kinh nghiệm Kafka nên dù MSK đắt hơn, nó giảm rủi ro vận hành" — rất ít ứng viên nói điều này, và nó cho thấy độ chín.

> 💡 **Nguyên tắc**: Câu trả lời "đúng" duy nhất trong những bài này là: **"Còn tuỳ — và đây là các biến số quyết định nó, cùng cách tôi sẽ cân chúng."** Người trình bày được khung tư duy thắng người đọc thuộc một đáp án.

---

## Liên hệ sang AWS

Triết lý build-vs-buy ánh xạ gần như 1-1 vào việc chọn dịch vụ AWS. AWS bán cho bạn "buy" ở mọi tầng — câu hỏi luôn là *mua sâu tới đâu*.

| Nhu cầu | "Buy" sâu (managed, lock-in cao) | "Buy" nông / tự quản hơn |
|---|---|---|
| Auth | **Cognito** (nhanh, lock-in) | Tự host Keycloak trên EKS |
| Database | **DynamoDB**, **Aurora Serverless** | PostgreSQL tự quản trên EC2 |
| Queue / event | **SQS / SNS / EventBridge** | Kafka tự quản trên EC2 |
| Streaming | **Kinesis**, **MSK (managed Kafka)** | Kafka thuần trên EC2 |
| Search | **OpenSearch Service** | Elasticsearch tự host |
| Compute | **Lambda** (serverless, lock-in cao) | **ECS/EKS** (chuẩn container, dễ thoát) |
| ML / AI | **Bedrock**, **SageMaker** | Tự host model trên GPU instances |

Vài liên hệ cụ thể về tư duy:

- **Lambda vs container**: Lambda là one-way-door hơn (lock-in vào model của AWS) nhưng vận hành ~0; container (ECS/EKS dùng image chuẩn) giữ tính đảo-ngược cao hơn. Chọn theo việc bạn coi portability là core hay không.
- **AWS Well-Architected Framework** chính là một "tech radar" có cấu trúc: trụ Operational Excellence, Security, Reliability, Performance, **Cost Optimization**, Sustainability — đều là các trục đánh đổi, không phải checklist tuân thủ máy móc.
- **Managed luôn là default hợp lý trên AWS**: dùng RDS thay vì tự cài Postgres, SQS thay vì tự dựng queue — trừ khi capability đó là **core** của bạn hoặc quy mô lớn tới mức TCO tự quản rẻ hơn rõ rệt.
- **Lock-in có chủ đích**: đi sâu DynamoDB single-table để được scale gần-vô-hạn ở vận hành tối thiểu là một đánh đổi *tốt* — miễn bạn quyết nó như một one-way door, có cân nhắc, chứ không vô tình.

> 💡 **Nguyên tắc cuối cùng**: Cloud không xoá bỏ quyết định build-vs-buy — nó **đẩy ranh giới "buy" lên cao hơn**, cho bạn mua được những thứ trước đây phải tự xây. Việc của kiến trúc sư cấp cao là biết **mua tới đâu thì dừng**, và để dành sức xây thứ duy nhất khiến công ty bạn khác biệt: **core của bạn.**
