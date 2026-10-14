# SAA Ch4.4 — Cost Visibility & Governance

> Mục tiêu: Biết "tiền AWS chảy đi đâu" và **ngăn** chảy mất kiểm soát — Cost Explorer, Budgets, Anomaly Detection, tagging strategy, SCP guardrail, FinOps basics. Đây là chương cuối SAA-C03 — sau khi học design hệ thống resilient/performant/secure, phải có cách quản lý cost lâu dài.

Tiền đề: [[ch4-01-compute-cost]], [[ch4-02-storage-cost]], [[ch4-03-db-network-cost]], CLF [[08-billing]].

---

## 1. Câu chuyện mở đầu — "Bill tháng này nổ x3, không ai biết tại sao"

CFO gọi: bill AWS tháng trước $50k, tháng này $150k. Không có release lớn. Engineering hoang mang.

Sau 2 ngày dig:
- 1 dev tạo EKS cluster ở 3 region để test, quên xóa: $20k.
- 1 Lambda recursive bug (Lambda gọi S3, trigger Lambda lại): $30k Lambda + $5k S3.
- 1 SageMaker endpoint quên stop sau demo: $15k.
- 1 EC2 p4 instance dev train model 1 tuần: $25k.
- 1 NAT GW egress tăng do bug code download S3 qua NAT: $5k.

→ **Mỗi cái lẽ ra có alert trong 24h** nếu có visibility + alarm. Cost mất control vì **không ai nhìn**.

Bài này dạy cách **không bị bất ngờ**.

---

## 2. Stack visibility AWS

Trước khi đi vào từng công cụ, cần biết một sự thật chung: **không có công cụ cost nào của AWS là real-time**. Tất cả đều đọc từ cùng một nguồn là dữ liệu billing, và dữ liệu này được AWS tổng hợp theo đợt — thường **vài lần mỗi ngày**, nên một khoản chi phát sinh lúc 9 giờ sáng có thể tới tối hoặc sáng hôm sau mới hiện lên. "Nhanh nhất" trong thế giới cost nghĩa là **trong vòng 24 giờ**, không phải vài giây như CloudWatch metric của EC2.

Năm công cụ dưới đây dùng chung dữ liệu đó nhưng trả lời năm câu hỏi khác nhau. Xếp theo nhịp mà một team thường dùng:

| Nhịp dùng | Công cụ | Trả lời câu hỏi | Độ trễ thật |
|-----------|---------|-----------------|-------------|
| Tự động, hằng ngày | **Cost Anomaly Detection** (§5) | "Hôm nay có khoản nào tăng **bất thường so với mọi khi** không?" | Chạy ~3 lần/ngày; phát hiện chậm tối đa ~24 giờ sau khi usage xảy ra |
| Tự động, hằng ngày | **CloudWatch Billing Alarm** | "Tổng bill tháng này đã **vượt con số X** chưa?" | Metric cập nhật vài lần/ngày |
| Tự động, theo tháng/quý | **AWS Budgets** (§4) | "Đã tiêu / **sắp tiêu** quá ngân sách của team này chưa?" — và có thể tự hành động | Cập nhật tối đa 3 lần/ngày, cách nhau 8–12 giờ |
| Người xem, hằng tuần | **Cost Explorer** (§3) | "Tiền tăng **ở đâu**: service nào, account nào, tag nào?" | Làm mới ít nhất 1 lần/24 giờ |
| Phân tích sâu, hằng tháng/quý | **Cost & Usage Report** + Athena (§6) | "Chi phí **từng resource, từng giờ**, chia cho từng khách hàng là bao nhiêu?" | File cập nhật ít nhất 1 lần/ngày, tối đa 3 lần |

**CloudWatch Billing Alarm** là công cụ đời cũ nhất và đơn giản nhất nên chỉ nói ở đây: bật "Receive CloudWatch Billing Alerts" trong Billing Preferences, AWS sẽ đẩy metric `EstimatedCharges` (namespace `AWS/Billing`) vào CloudWatch, rồi bạn đặt alarm "lớn hơn $X thì gửi SNS". Hai điều phải nhớ: metric này **chỉ có ở region us-east-1** (dù nó cộng chi phí toàn cầu), và alarm chỉ so với số **đã tiêu thực tế**, không dự báo. Budgets làm được mọi thứ Billing Alarm làm và hơn thế (dự báo, lọc theo tag, tự hành động), nên đề thi gần như luôn muốn bạn chọn Budgets.

> 🪤 Bẫy thi: thấy chữ *"real-time cost"* trong đáp án thì nghi ngờ ngay. Kịch bản §1 nói "lẽ ra có alert trong 24h" chứ không phải "trong 5 phút" — đó là giới hạn thật của dữ liệu billing.

---

## 3. AWS Cost Explorer

### 3.1 Core

**Nó là gì.** Cost Explorer là màn hình biểu đồ (kèm API) để **cắt lát hoá đơn** theo nhiều chiều. Hoá đơn AWS gốc chỉ cho một con số tổng theo từng service; Cost Explorer cho phép hỏi tiếp "trong $40k của EC2 đó, account nào, region nào, loại máy nào chiếm nhiều nhất".

Hai thao tác làm nên mọi phân tích:

- **Filter (lọc)** là *thu hẹp* dữ liệu: chỉ giữ lại những dòng thoả điều kiện, ví dụ "chỉ service EC2" và "chỉ account dev".
- **Group by (nhóm theo)** là *chia* phần còn lại thành các cột màu trên biểu đồ theo một chiều, ví dụ theo instance type.

Các chiều (dimension) dùng được cho cả hai thao tác: service, linked account (account con trong Organization), region, instance type, usage type (loại sử dụng chi tiết, ví dụ `NatGateway-Bytes` hay `DataTransfer-Out-Bytes`), purchase option (On-Demand / Spot / Savings Plan), và **tag** (§7).

**Xem được bao xa:**

| Dữ liệu | Phạm vi | Ghi chú |
|---------|---------|---------|
| Lịch sử theo **tháng** và theo **ngày** | Tháng hiện tại + **13 tháng** trước | Mặc định, miễn phí |
| Theo **giờ**, và theo **từng resource** (mức ngày) | **14 ngày** gần nhất | Phải bật thêm; dữ liệu theo giờ **tính phí** (xem dưới) |
| Lịch sử nhiều năm (mức tháng) | Hơn 13 tháng | Phải bật thêm |
| **Forecast** (dự báo) | **18 tháng** tới | Ngoại suy từ lịch sử tiêu của chính bạn |

> 📏 Đề thi và nhiều tài liệu cũ dùng con số **"12 tháng lịch sử, dự báo 12 tháng"**. Docs hiện tại ghi 13 tháng lịch sử và dự báo 18 tháng. Ý cần nhớ không đổi: Cost Explorer nhìn được **khoảng một năm về trước và có dự báo về sau**; muốn chi tiết từng giờ thì chỉ có 2 tuần gần nhất.

**Độ trễ.** Cost Explorer làm mới dữ liệu **ít nhất một lần mỗi 24 giờ**. Lần đầu bật, dữ liệu tháng hiện tại có sau khoảng 24 giờ, các tháng cũ lâu hơn vài ngày.

**Giá.** Giao diện web miễn phí. Hai thứ tốn tiền:

```
API:   $0,01 mỗi request (mỗi trang kết quả tính 1 request)
       Một script gọi API 5 phút/lần:  288 lần/ngày × 30 ngày = 8.640 request → ~$86/tháng

Giờ:   $0,01 cho mỗi 1.000 "usage record" mỗi tháng
       (1 resource chạy 1 giờ ≈ 1 record; chỉ giữ 14 ngày)
       500 EC2 chạy liên tục:  500 × 24 giờ × 14 ngày = 168.000 record → ~$1,68/tháng
```

Con số nhỏ, nhưng là lý do bài viết "hourly bật khi cần": dashboard tự chế mà gọi API liên tục thì đắt hơn hẳn việc đổ CUR ra S3 (§6).

### 3.2 Use case

**Ví dụ: trả lời câu "EC2 tháng này tăng vì cái gì?"** Đây là cách lần ngược một khoản tăng, mỗi bước là một lần đổi filter / group by:

```
Bước 1  Group by: Service, so tháng này với tháng trước
        → cột "EC2-Instances" tăng từ $18k lên $43k. Khoanh vùng: EC2.

Bước 2  Filter: Service = EC2-Instances.  Group by: Linked account
        → account "ml-dev" từ $1k lên $26k. Khoanh vùng: một account.

Bước 3  Giữ filter trên + Account = ml-dev.  Group by: Instance type
        → gần như toàn bộ là p4d.24xlarge. Khoanh vùng: một loại máy GPU.

Bước 4  Đổi granularity sang Daily
        → chi phí bắt đầu từ ngày 9 và chạy đều tới nay: một máy bật rồi không ai tắt.
```

Bốn lần bấm, không cần viết query. Nếu account `ml-dev` có tag `Owner`, bước 5 là group by tag đó để biết gọi ai.

Ngoài phân tích tự do như trên, Cost Explorer có sẵn mấy báo cáo đề thi hay nhắc tên:

- **Trend / so sánh kỳ:** spend tăng hay giảm theo thời gian, service nào đổi nhiều nhất.
- **Tìm spike:** đổi sang mức ngày để thấy ngày nào đội lên, rồi group by để tìm thủ phạm (Cost Anomaly Detection ở §5 làm việc này tự động).
- **Forecast:** ước lượng số tiền cuối tháng / các tháng tới dựa trên đà hiện tại.
- **RI / Savings Plans recommendation:** dựa trên usage on-demand trong 7, 30 hoặc 60 ngày gần nhất, đề xuất nên cam kết bao nhiêu $/giờ. Kèm hai báo cáo **utilization** và **coverage** (định nghĩa ở §4.1).
- **Rightsizing recommendation:** chỉ ra EC2 đang chạy dưới tải để hạ cỡ hoặc tắt. *Right-sizing* nghĩa là chọn lại cỡ máy cho khớp tải thật, ví dụ máy 8 vCPU mà CPU chưa bao giờ quá 10% thì xuống 2 vCPU. Phần này lấy dữ liệu từ Compute Optimizer (§10).

### 3.3 Best practices
- **Group by tag** là cách duy nhất để thấy chi phí theo team hay theo dự án, vì AWS không biết "team" của bạn là gì. Muốn dùng được thì phải có tagging strategy và phải **activate** tag (mục 7).
- **Hourly granularity** chỉ bật khi cần soi mẫu hình trong ngày (ví dụ quyết định giờ nào scale-in), vì có phí như phép tính ở §3.1.
- **Lưu report** (Save to report library) các view hay dùng rồi chia sẻ link cho team, thay vì mỗi người tự dựng lại filter. Cần file thì export CSV.

---

## 4. AWS Budgets

**Nó là gì.** Cost Explorer là nơi *người* vào xem. Budgets thì ngược lại: bạn đặt trước một con số, AWS **tự theo dõi và báo** khi chạm ngưỡng — và nếu cấu hình thêm thì tự hành động. Một budget gồm ba phần: **phạm vi** (cả account, hay lọc theo service / account con / tag), **con số và chu kỳ** (ví dụ $1.000 mỗi tháng), và **các ngưỡng cảnh báo**.

### 4.1 Loại budget

Hai loại đầu theo dõi "tiêu quá nhiều"; hai loại sau theo dõi "dùng cam kết chưa hiệu quả".

- **Cost budget** theo dõi **số tiền**. Loại dùng nhiều nhất: "account dev không quá $1.000/tháng".
- **Usage budget** theo dõi **lượng dùng** tính bằng đơn vị của dịch vụ: số giờ chạy EC2, số GB lưu S3, số request. Dùng khi thứ cần canh là hạn mức chứ không phải tiền, ví dụ canh không vượt mức free tier.
- **RI / Savings Plans utilization budget** và **coverage budget** theo dõi hai tỉ lệ phần trăm của các gói cam kết. Với hai loại này, cảnh báo bắn khi con số **tụt xuống dưới** ngưỡng, ngược với hai loại trên.

Hai tỉ lệ đó hay bị lẫn, nên tính thử. Nhắc lại từ [[ch4-01-compute-cost]]: Savings Plan là cam kết **tiêu X $/giờ** trong 1 hoặc 3 năm để đổi lấy giá rẻ hơn on-demand; giờ nào dùng không hết thì vẫn trả đủ X, giờ nào dùng vượt thì phần vượt tính giá on-demand.

```
Cam kết Savings Plan: $10/giờ

UTILIZATION = phần cam kết ĐÃ DÙNG ÷ phần cam kết ĐÃ MUA      → "tôi có mua thừa không?"
  Giờ thấp điểm (3h sáng) chỉ dùng hết $7 trong $10
  → utilization = 7 ÷ 10 = 70%  ($3 còn lại trả mà không dùng)

COVERAGE    = usage ĐƯỢC cam kết che ÷ TỔNG usage đủ điều kiện → "tôi có mua thiếu không?"
  (cả hai vế quy về giá on-demand)
  Giờ cao điểm: $10 cam kết che được lượng máy trị giá $14 on-demand,
  còn dư lượng máy trị giá $5 phải trả on-demand
  → coverage = 14 ÷ (14 + 5) ≈ 74%
```

Utilization thấp nghĩa là cam kết **dư**, đang trả tiền cho thứ không dùng. Coverage thấp nghĩa là cam kết **thiếu**, còn nhiều usage đang trả giá on-demand đắt. Hai con số kéo ngược nhau: mua thêm cam kết thì coverage tăng nhưng utilization dễ giảm.

| Type | Track | Cảnh báo khi |
|------|-------|--------------|
| **Cost budget** | Tiền chi tiêu | **Vượt** ngưỡng |
| **Usage budget** | Số GB / hour / request | **Vượt** ngưỡng |
| **RI/Savings Plan utilization budget** | % cam kết đã mua được dùng tới | **Tụt dưới** ngưỡng (đang mua thừa) |
| **RI/Savings Plan coverage budget** | % usage được cam kết che | **Tụt dưới** ngưỡng (đang mua thiếu) |

### 4.2 Alert

**Actual và forecasted — hai kiểu ngưỡng.** Mỗi ngưỡng cảnh báo so với một trong hai con số:

- **Actual**: số tiền *đã* tiêu từ đầu kỳ tới giờ. Bắn khi chuyện đã xảy ra.
- **Forecasted**: số tiền AWS *dự báo* bạn sẽ tiêu tính tới cuối kỳ nếu giữ đà hiện tại. Bắn **trước** khi vượt.

```
Budget: $1.000/tháng.  Hôm nay là ngày 12, đã tiêu $520.

Đà tiêu:           $520 ÷ 12 ngày  ≈ $43,3/ngày
Dự báo cuối tháng: $43,3 × 30 ngày ≈ $1.300    (ước lượng tuyến tính để minh hoạ;
                                                 mô hình của AWS còn xét cả mẫu hình lịch sử)

Ngưỡng "100% forecasted" → BẮN NGAY hôm nay (ngày 12), vì $1.300 > $1.000
Ngưỡng "80% actual"      → chưa bắn ($520 < $800); sẽ bắn khoảng ngày 18-19
Ngưỡng "100% actual"     → bắn khoảng ngày 23, khi tiền đã tiêu xong
```

Cách đặt phổ biến là dùng cả hai: **100% forecasted** để biết sớm và còn kịp sửa, cộng **80% actual** làm lưới an toàn phòng khi dự báo sai. Đề thi hỏi *"được cảnh báo **trước khi** vượt ngân sách"* thì đáp án là ngưỡng **forecasted**.

**Gửi cảnh báo đi đâu.** Email trực tiếp, hoặc một **SNS topic** (từ SNS đi tiếp được tới Lambda, hệ thống ticket…). Muốn nhận trong Slack / Microsoft Teams thì nối SNS topic với AWS Chatbot (nay đổi tên thành *Amazon Q Developer in chat applications*; đề thi có thể dùng cả hai tên).

**Budget Actions — khi cảnh báo thôi là chưa đủ.** Mặc định Budgets **chỉ thông báo**, không đụng tới resource nào. Budget Action là phần cấu hình thêm: khi chạm một ngưỡng, Budgets tự làm một trong ba việc.

| Action | Làm gì | Ví dụ |
|--------|--------|-------|
| **Gắn IAM policy** | Gắn một policy Deny vào user / group / role | Dev account chạm $1.000 → gắn policy cấm `ec2:RunInstances` cho role developer |
| **Gắn SCP** | Gắn một Service Control Policy (định nghĩa ở §8) vào account hoặc OU. Chỉ làm được từ management account | Cả OU sandbox vượt budget → gắn SCP cấm tạo mới mọi resource đắt tiền |
| **Dừng EC2 / RDS instance** | Stop những instance **cụ thể** đã chọn trước, và chỉ trong chính account đó | Vượt budget → stop 3 máy GPU của team ML |

Action có thể chạy **tự động** hoặc **chờ một người bấm duyệt**; Budgets cần một IAM role để thay bạn thực hiện. Lưu ý hai giới hạn: cấm tạo mới **không tắt** những thứ đang chạy, nên tiền vẫn tiếp tục chảy cho tới khi có người dọn; và vì dữ liệu budget cập nhật tối đa 3 lần/ngày, action có thể chạy trễ 8–12 giờ so với lúc thực sự vượt.

Giá: theo dõi và thông báo miễn phí. Hai budget có gắn action đầu tiên miễn phí, từ cái thứ ba là $0,10/ngày (~$3/tháng) mỗi budget.

### 4.3 Patterns

- **Mỗi team / project / environment một budget riêng**, lọc theo account hoặc theo tag. Một budget tổng $50k không cho biết ai đang tiêu quá; mười budget $5k thì có.
- **Budget Action cho account dev/sandbox:** vượt budget thì gắn SCP chặn các service đắt (mẫu SCP ở §8). Không nên đặt action tự động trên production, vì chặn nhầm lúc cao điểm còn tệ hơn tốn tiền.
- **Ngưỡng forecasted** để được báo sớm, như phép tính ở §4.2.

---

## 5. Cost Anomaly Detection

**Nó giải quyết bài toán gì.** Budgets cần bạn **biết trước con số** để đặt ngưỡng. Nhưng nhìn lại §1: không ai đặt budget riêng cho "Lambda ở account X" cả, và một khoản $1.000/ngày chìm nghỉm trong budget tổng $50k/tháng. Cost Anomaly Detection không cần ngưỡng: nó tự học "bình thường là bao nhiêu" rồi báo khi có thứ lệch khỏi mức đó.

### 5.1 Cách hoạt động

- **Baseline học từ đâu.** Từ chính lịch sử chi tiêu của bạn (dữ liệu của Cost Explorer). Mô hình machine learning ước lượng "hôm nay khoản này *lẽ ra* tốn bao nhiêu" (gọi là *expected spend*), có tính tới chu kỳ lặp theo tuần và theo tháng lẫn đà tăng tự nhiên. Nhờ vậy việc bill thứ Hai cao hơn Chủ nhật, hay tháng sau cao hơn tháng trước 5%, không bị coi là bất thường.
- **Thế nào là anomaly.** Khi chi tiêu thực tế vượt mức dự kiến một cách rõ rệt. Mỗi anomaly có hai số đo:

  ```
  Lambda mọi khi tốn ~$40/ngày, hôm nay $1.000

  Cost impact = thực tế − dự kiến       = 1.000 − 40   = $960
  Impact %    = cost impact ÷ dự kiến   = 960 ÷ 40     = 2.400%
  ```

- **Bao lâu thì báo.** Dịch vụ chạy khoảng **3 lần mỗi ngày**, sau mỗi đợt dữ liệu billing được xử lý. Vì nó ăn dữ liệu của Cost Explorer (trễ tới 24 giờ), một anomaly có thể mất **tới 24 giờ** sau khi usage xảy ra mới được phát hiện. Một service bạn *mới dùng lần đầu* cần **10 ngày** dữ liệu rồi mới được soi, vì chưa có lịch sử thì chưa có "bình thường".
- **Chỉ ra nguyên nhân.** Mỗi anomaly kèm phần root cause xếp theo số tiền: service nào, account nào, region nào, usage type nào đóng góp nhiều nhất.
- **Soi theo chiều nào.** Theo từng AWS service, từng linked account, từng giá trị của một cost allocation tag, hoặc từng *cost category* (nhóm chi phí tự định nghĩa trong Billing, ví dụ gom nhiều account thành "Business Unit A").

### 5.2 Setup

Chỉ có hai thứ phải tạo:

1. **Cost monitor**: khai báo *soi cái gì*. Chọn một chiều ở trên. Monitor loại "AWS services" là điểm bắt đầu hợp lý: nó soi riêng từng service và tự thêm service mới khi bạn bắt đầu dùng.
2. **Alert subscription**: khai báo *báo cho ai, khi nào*. Gồm ngưỡng để lọc nhiễu, tính theo **số tiền** ($ cost impact) hoặc **phần trăm** (impact %), và tần suất gửi:
   - *Individual alerts*: gửi ngay khi phát hiện, qua **SNS** (từ đó ra Slack).
   - *Daily / weekly summary*: gom lại gửi **email** một lần mỗi ngày hoặc mỗi tuần.

Ngưỡng chỉ quyết định cái gì được *gửi đi*; mọi anomaly dù nhỏ vẫn hiện trong console.

### 5.3 Use case
- **Dev quên tắt resource**: SageMaker endpoint hay cụm EKS ở §1 xuất hiện như một bậc thang đi lên rồi không xuống.
- **Bug gây tốn**: vòng lặp Lambda → S3 → Lambda làm chi phí Lambda nhảy vài chục lần chỉ sau một đêm.
- **Bị tấn công**: access key lộ, kẻ xấu bật hàng loạt EC2 đào coin ở một region bạn chưa từng dùng.

### 5.4 Khác Budgets ở đâu

Hai công cụ bắn vì hai lý do khác nhau, và ví dụ Lambda trong §1 cho thấy rõ:

```
Bình thường cả account tiêu $50.000/tháng ≈ $1.667/ngày.  Budget $50.000, cảnh báo ở 80% actual = $40.000.
Từ ngày 1, bug Lambda đốt thêm $1.000/ngày.

Budgets:            ($1.667 + $1.000) × N ngày ≥ $40.000  → N = 15
                    → tới ngày 15 mới báo, lúc đó bug đã đốt ~$14.000
Anomaly Detection:  Lambda từ $40 lên $1.000/ngày = +2.400%
                    → báo trong khoảng 24 giờ, thiệt hại ~$1.000
```

| | **AWS Budgets** | **Cost Anomaly Detection** |
|--|-----------------|----------------------------|
| So với cái gì | Một **con số bạn đặt** | **Mẫu hình lịch sử** do ML học |
| Bắt được | Tiêu vượt kế hoạch, kể cả khi tăng từ từ | Tăng đột ngột, kể cả khi tổng vẫn dưới budget |
| Bỏ sót | Spike nhỏ so với budget tổng | Tăng chậm đều (mô hình coi là tăng trưởng tự nhiên) |
| Cấu hình | Phải biết con số hợp lý cho từng phạm vi | Gần như không: 1 monitor + 1 subscription |
| Hành động tự động | Có (Budget Actions) | Không, chỉ thông báo |

Vì chúng bỏ sót những thứ khác nhau nên dùng **cả hai**, không cái nào thay cái nào.

→ **Khuyên dùng**: bật cho mọi account. Dịch vụ không tính phí riêng và chỉ mất vài phút cấu hình, trong khi mỗi sự cố ở §1 đều thuộc loại nó bắt được.

---

## 6. Cost & Usage Report (CUR)

**Nó là gì, và khi nào Cost Explorer không đủ.** Cost Explorer cho bạn xem dữ liệu **đã cộng gộp** qua các chiều có sẵn, và chỉ giữ chi tiết theo giờ trong 14 ngày. CUR là **dữ liệu thô**: AWS ghi toàn bộ hoá đơn chi tiết thành file vào một S3 bucket của bạn, để bạn tự query bằng SQL. Cần CUR khi câu hỏi vượt khỏi những gì giao diện bấm được:

- "Chi phí của **từng** S3 bucket / **từng** Lambda function trong 6 tháng qua?" (Cost Explorer chỉ có mức resource cho 14 ngày.)
- "Ghép chi phí với bảng khách hàng của công ty để ra chi phí mỗi khách?" (phải JOIN với dữ liệu ngoài AWS.)
- "Lưu toàn bộ chi tiết billing 5 năm để kiểm toán?"

### 6.1 Format

- **Line item** là đơn vị của CUR. Mỗi dòng trả lời: *resource nào* (resource ID), *dùng loại gì* (usage type, ví dụ `BoxUsage:m5.large`), *trong khoảng giờ nào*, *bao nhiêu*, *giá bao nhiêu*, kèm các cột tag. Một EC2 chạy cả tháng sinh ra hơn 700 dòng (mỗi giờ một dòng), chưa kể các dòng riêng cho EBS và data transfer của nó. Vì vậy CUR của một công ty vừa đã lên tới hàng triệu dòng mỗi tháng — lý do không thể mở bằng Excel.
- **Độ chi tiết** chọn khi tạo report: theo giờ, ngày, hoặc tháng; có kèm resource ID hay không.
- **Định dạng**: CSV (nén gzip) hoặc **Parquet**. Parquet là định dạng lưu theo cột, giúp Athena chỉ đọc những cột cần nên query rẻ và nhanh hơn — xem [[ch2-06-data-ingestion-analytics]] §4.1.
- **Tần suất**: file trong bucket được cập nhật **ít nhất 1 lần/ngày, tối đa 3 lần**. Số liệu trong tháng là ước tính; AWS chốt sau khi xuất hoá đơn cuối tháng. Report mới tạo mất tới 24 giờ mới có file đầu tiên.

> 📏 Tên gọi: bản hiện tại là **CUR 2.0**, tạo qua tính năng **AWS Data Exports**. Đề thi vẫn gọi chung là *Cost and Usage Report* và mô tả bằng cụm *"most granular / most detailed billing data"* — thấy cụm đó là chọn CUR.

### 6.2 Analysis stack

Chuỗi quen thuộc là `CUR → S3 → Glue Crawler → Athena → QuickSight`. Mỗi chặng làm một việc:

1. **S3** là nơi AWS thả file CUR. Chỉ là file nằm trong bucket, chưa query được.
2. **Glue Crawler** đọc các file đó, tự suy ra tên cột và kiểu dữ liệu, rồi ghi định nghĩa bảng vào **Glue Data Catalog**. Chạy lại định kỳ để nhận partition của tháng mới.
3. **Athena** dùng định nghĩa bảng đó để chạy SQL **thẳng trên file S3**, không cần dựng database. Tính tiền theo lượng dữ liệu quét, nên CUR dạng Parquet rẻ hơn CSV nhiều lần.
4. **QuickSight** (docs mới gọi là Amazon Quick) vẽ dashboard từ kết quả Athena cho người không viết SQL.

Hai biến thể:

- **CUR → Redshift** khi dữ liệu billing rất lớn và có nhiều người query đồng thời cả ngày. Redshift là data warehouse chạy thường trực nên trả tiền theo cụm, hợp với tải query dày; Athena trả theo từng query, hợp với phân tích thưa.
- **Công cụ bên thứ ba** (Vantage, CloudHealth, Apptio) đọc chính CUR của bạn rồi cung cấp sẵn dashboard và báo cáo, đổi lại là phí thuê bao.

### 6.3 Use case

- **Showback / chargeback theo team.** *Showback* là **cho mỗi team xem** họ đã tiêu bao nhiêu, chỉ để biết. *Chargeback* đi thêm một bước: **trừ thật** số tiền đó vào ngân sách của team. Cả hai cần chi phí chia được theo tag `Team` ở mức chi tiết, thứ mà CUR có.
- **Unit economics** là chi phí tính **trên một đơn vị kinh doanh**: mỗi request, mỗi khách hàng, mỗi đơn hàng. Ví dụ bill $50.000/tháng phục vụ 2.000 khách thì là $25/khách; tháng sau bill lên $60.000 nhưng có 3.000 khách thì còn $20/khách — bill tăng mà hệ thống đang hiệu quả hơn. Con số này chỉ tính được khi JOIN CUR với dữ liệu kinh doanh.
- **FinOps deep dive**: truy một khoản tới tận resource ID và giờ phát sinh, đối chiếu giá thực trả sau chiết khấu.

Bảng chọn nhanh:

| Cần | Dùng |
|-----|------|
| Xem nhanh, bấm biểu đồ, không viết query | **Cost Explorer** |
| Chi tiết từng resource, từng giờ, giữ lâu dài, JOIN với dữ liệu khác | **CUR** + Athena |
| Dashboard cho nhiều người từ dữ liệu chi tiết | **CUR** + Athena + QuickSight |

---

## 7. Tagging strategy

### 7.1 Vì sao quan trọng

**Tag** là một cặp `key = value` bạn gắn lên resource, ví dụ `Team = payments`. AWS biết resource thuộc service nào, account nào, region nào, nhưng **không biết** nó thuộc team nào hay dự án nào — thông tin đó chỉ tồn tại nếu bạn ghi vào tag.

Cost Explorer / Budgets / CUR đều chia chi phí theo **tag**. Resource không tag thì toàn bộ chi phí của nó rơi vào một nhóm "không có tag", không ai nhận.

### 7.2 Tag tối thiểu enterprise

| Tag | Purpose |
|-----|---------|
| `Environment` | prod / staging / dev |
| `Team` / `Owner` | Ai sở hữu |
| `Project` / `CostCenter` | Cost allocation |
| `Application` | App name |
| `Compliance` | PCI / HIPAA / none |
| `DataClassification` | Public / Internal / Confidential |
| `BackupPolicy` | daily / weekly / none |

Ba dòng đầu phục vụ trực tiếp việc chia chi phí. Các dòng sau phục vụ bảo mật và vận hành, nhưng thường được chuẩn hoá cùng một lượt.

### 7.3 Enforcement

Viết quy định "mọi resource phải có tag `Team`" vào wiki thì không ai theo. AWS có bốn cơ chế ép, và điểm đề thi hay hỏi là: **cái nào chặn được ngay lúc tạo, cái nào chỉ phát hiện sau**.

- **Tag Policies** (một loại policy của AWS Organizations) **chuẩn hoá** tag: quy định key viết hoa thường thế nào và value được phép là gì, ví dụ `Environment` chỉ nhận `prod`, `staging`, `dev`. Mặc định nó chỉ **báo cáo** resource sai chuẩn; bật chế độ enforce (`enforced_for`) thì thao tác gắn tag sai value sẽ bị **từ chối**. Giới hạn quan trọng: Tag Policy chỉ kiểm tra tag **khi tag đó có mặt**. Resource tạo ra **không có tag nào** thì nó không chặn.
- **SCP** (§8) là thứ **chặn việc tạo resource thiếu tag**. Viết một statement Deny cho `ec2:RunInstances` kèm điều kiện "request không mang tag `Team`":

  ```json
  {
    "Effect": "Deny",
    "Action": "ec2:RunInstances",
    "Resource": "arn:aws:ec2:*:*:instance/*",
    "Condition": {
      "Null": { "aws:RequestTag/Team": "true" }
    }
  }
  ```

  `aws:RequestTag/Team` là giá trị tag `Team` gửi kèm trong request tạo resource. Toán tử `Null … "true"` đúng khi key đó **vắng mặt**. Đọc cả câu: "cấm chạy instance nếu request không có tag `Team`".
- **IAM policy với condition `aws:RequestTag`** dùng đúng cú pháp trên nhưng gắn vào user/role trong **một** account. Khác SCP ở phạm vi: SCP phủ cả OU và admin của account con không gỡ được; IAM policy thì admin account đó sửa được.
- **AWS Config rule** `required-tags` **không chặn** gì cả. Nó quét định kỳ và đánh dấu resource *đã tồn tại* mà thiếu tag là non-compliant, từ đó có thể gửi cảnh báo hoặc chạy remediation tự động.

| Cơ chế | Loại | Xử lý được | Phạm vi |
|--------|------|-----------|---------|
| **Tag Policies** | Chuẩn hoá (+ chặn nếu enforce) | Tag **sai value / sai hoa-thường** | OU / cả Organization |
| **SCP** + `aws:RequestTag` | **Chặn** (preventive) | Tạo resource **thiếu tag** | OU / cả Organization |
| **IAM condition** `aws:RequestTag` | **Chặn** (preventive) | Tạo resource **thiếu tag** | Từng user/role trong 1 account |
| **AWS Config rule** | **Phát hiện** (detective) | Resource **đã tồn tại** mà thiếu tag | Account / Organization |

Thực tế dùng kết hợp: SCP chặn cái mới, Tag Policy giữ value thống nhất, Config tìm những thứ cũ tạo ra trước khi có luật.

> 🪤 Bẫy thi: *"đảm bảo mọi resource mới **phải có** tag CostCenter"* → **SCP** (hoặc IAM condition), không phải Tag Policy. *"chuẩn hoá value của tag trên toàn Organization"* → **Tag Policy**. *"tìm resource hiện có đang thiếu tag"* → **AWS Config**.

### 7.4 Cost allocation tags

Đây là ý quan trọng nhất của cả mục 7 và là thứ đề thi hỏi thẳng: **gắn tag lên resource là chưa đủ để tag hiện trong billing.** Tag trên resource và tag trong dữ liệu chi phí là hai thứ tách rời; muốn tag đi vào Cost Explorer, Budgets và CUR thì phải **activate** key đó thành *cost allocation tag* trong Billing console.

Trình tự và thời gian chờ:

```
1. Gắn tag `Team` lên resource
2. Chờ tới 24 giờ  → key `Team` mới xuất hiện trong trang "Cost allocation tags"
3. Bấm Activate    (trong Organization: làm ở management account)
4. Chờ tới 24 giờ  → key có hiệu lực, bắt đầu hiện trong Cost Explorer / Budgets / CUR
```

- **Không tự hồi tố.** Chi phí chỉ mang tag từ lúc activate trở đi. Muốn lấp ngược thì dùng tính năng *backfill*, lấy lại được tối đa **12 tháng**, nhưng chỉ cho những tháng mà tag **đã thật sự nằm trên resource**. Tháng nào resource chưa có tag thì không gì cứu được. Hệ quả: gắn tag và activate **càng sớm càng tốt**, vì mỗi ngày chậm là một ngày dữ liệu không chia được.
- **"Tag inheritance" nghĩa là gì.** Sau khi activate, chi phí của một resource được ghi kèm tag của chính resource đó: EC2 có `Team = payments` thì các line item của EC2 đó mang `Team = payments`. Nó **không** có nghĩa là tag tự lan từ resource này sang resource khác (xem §7.5).
- **Hai loại cost allocation tag.** *User-defined* là tag bạn tự đặt (trong CUR có tiền tố `user:`). *AWS-generated* là tag do AWS tự sinh, quan trọng nhất là `aws:createdBy`, ghi lại **ai đã tạo resource** (user, role hoặc root). Tag này miễn phí nhưng cũng phải activate ở management account, và chỉ áp cho resource tạo **sau** khi activate. Nó rất hữu ích cho kịch bản §1: không ai tag cụm EKS thừa, nhưng `aws:createdBy` vẫn cho biết ai bật nó.

### 7.5 Pitfalls
- Tag inconsistent: `prod` vs `Production` vs `PROD` → 3 nhóm khác nhau.
- Tag không inherit (vd EBS không tự tag từ EC2).
- AWS-generated cost data có lag → tag mới setup phải đợi.

---

## 8. SCP guardrails cho cost

**SCP là gì.** *Service Control Policy* là một loại policy của AWS Organizations, viết bằng JSON gần giống IAM policy, nhưng gắn vào **cả một account hoặc một OU** (nhóm account) thay vì gắn vào user/role. Nó đặt **trần quyền**: mọi user và role trong account đó, kể cả admin và root user của account, không thể làm điều SCP cấm. Chi tiết đầy đủ ở [[ch3-05-multi-account-governance]] §4; ở đây chỉ cần ba tính chất:

- **SCP không cấp quyền, chỉ giới hạn.** Một hành động chỉ chạy được khi IAM policy cho phép **và** SCP không cấm.
- **Deny luôn thắng.** Trong cách AWS đánh giá quyền, một câu Deny tường minh ở bất kỳ đâu sẽ thắng mọi câu Allow. Nên một statement Deny trong SCP là hàng rào không ai trong account vượt được, kể cả người có `AdministratorAccess`.
- **Không áp lên management account.** SCP chỉ có tác dụng với các account thành viên.

**Vì sao đây là công cụ cost.** Mọi công cụ ở §3–§6 đều báo **sau** khi tiền đã tiêu, và trễ tới 24 giờ. SCP là thứ duy nhất **ngăn từ trước**: máy GPU $25k ở §1 đơn giản là không bật lên được ở account dev. Người ta gọi đó là *guardrail* (lan can): không điều khiển bạn đi đâu, chỉ chặn không cho rơi khỏi đường.

Dưới đây là ba guardrail cost phổ biến. Mỗi khối là một statement, đặt trong mảng `"Statement"` của một SCP.

**Guardrail 1: chỉ cho phép vài loại instance rẻ ở account dev.**

```json
{
  "Effect": "Deny",
  "Action": "ec2:RunInstances",
  "Resource": "arn:aws:ec2:*:*:instance/*",
  "Condition": {
    "StringNotLike": {
      "ec2:InstanceType": ["t3.*", "t4g.*", "m6i.large", "m6i.xlarge"]
    }
  }
}
```

Đọc từ trong ra: `ec2:InstanceType` là loại máy trong request. `StringNotLike` đúng khi giá trị đó **không khớp mẫu nào** trong danh sách (dấu `*` khớp mọi chuỗi, nên `t3.*` phủ từ `t3.nano` tới `t3.2xlarge`). Cả câu: "**cấm** chạy instance **nếu** loại máy **không nằm trong** danh sách". Viết kiểu phủ định kép này, "Deny mọi thứ ngoài danh sách cho phép", an toàn hơn liệt kê các loại bị cấm, vì AWS ra loại máy đắt mới thì nó tự động bị chặn.

**Guardrail 2: chỉ cho dùng các region chính.**

```json
{
  "Effect": "Deny",
  "NotAction": ["iam:*", "organizations:*", "route53:*", "cloudfront:*", "support:*"],
  "Resource": "*",
  "Condition": {
    "StringNotEquals": { "aws:RequestedRegion": ["us-east-1", "ap-southeast-1"] }
  }
}
```

`aws:RequestedRegion` là region mà request gửi tới. Cả câu: "cấm mọi hành động ở region không phải hai region này". Cụm EKS bật ở 3 region lạ trong §1 sẽ bị chặn ngay. Phần `NotAction` nghĩa là "áp cho mọi action **trừ** những cái liệt kê": các dịch vụ toàn cầu như IAM, Route 53, CloudFront chỉ có một endpoint đặt ở `us-east-1`, nên nếu account chỉ được phép dùng region khác mà không chừa chúng ra thì IAM cũng ngừng hoạt động. (Viết `"Action": "*"` chỉ ổn khi `us-east-1` nằm trong danh sách cho phép, như ở ví dụ này; dùng `NotAction` thì đúng trong mọi trường hợp.)

**Guardrail 3: cấm SageMaker training trên máy GPU lớn.**

```json
{
  "Effect": "Deny",
  "Action": "sagemaker:CreateTrainingJob",
  "Resource": "*",
  "Condition": {
    "ForAnyValue:StringLike": { "sagemaker:InstanceTypes": ["ml.p4*", "ml.p5*"] }
  }
}
```

Ở đây dùng `StringLike` (khớp thì cấm) vì chỉ muốn chặn đúng hai họ máy. `sagemaker:InstanceTypes` là key nhiều giá trị (một request có thể khai nhiều loại máy), nên cần tiền tố `ForAnyValue:` với nghĩa "chỉ cần **một** loại trong request khớp là cấm".

**Kết hợp với Budget Action.** Ba guardrail trên là hàng rào **thường trực**. Có thể thêm một lớp **theo điều kiện**: chuẩn bị sẵn một SCP khắt khe hơn (ví dụ cấm toàn bộ `ec2:RunInstances` và `sagemaker:Create*`), rồi cấu hình Budget Action (§4.2) để khi account vượt budget thì AWS tự gắn SCP đó vào account. Lúc bình thường team làm việc thoải mái trong hàng rào rộng; vượt ngân sách thì hàng rào tự siết lại cho tới khi có người vào xem.

> 🪤 Bẫy thi: *"**ngăn** các account thành viên tạo resource ở region / loại instance không được duyệt, kể cả admin của account đó"* → **SCP**. Budgets và Anomaly Detection chỉ *báo*; IAM policy thì admin account tự gỡ được.

---

## 9. Trusted Advisor — built-in checks

**Nó là gì.** Trusted Advisor là một bộ **kiểm tra tự động có sẵn**: AWS quét account của bạn, so với danh sách best practice và trả về từng mục kèm trạng thái xanh / vàng / đỏ. Các check chia thành sáu nhóm: **cost optimization**, performance, security, fault tolerance, service limits và operational excellence. Bạn không cấu hình gì; số check được xem phụ thuộc **gói Support** đang mua.

### 9.1 Free checks

Gói Basic (miễn phí, account nào cũng có) được xem toàn bộ nhóm **Service Limits** và một số check chọn lọc về security và fault tolerance:

- **Service limits**: báo khi sắp chạm quota, ví dụ đã dùng hơn 80% số vCPU on-demand cho phép trong một region.
- **Security group mở port ra toàn thế giới**: rule cho `0.0.0.0/0` vào các port nhạy cảm như SSH 22 hay RDP 3389.
- **Root MFA**: root user chưa bật xác thực hai lớp.
- **S3 bucket permission**: bucket đang cho phép truy cập công khai.

Điểm cần nhớ: **nhóm cost optimization không có trong gói miễn phí.**

### 9.2 Business/Enterprise Support checks

Toàn bộ check, gồm cả nhóm cost, chỉ mở khi account có gói Support trả tiền cấp cao. Đề thi gọi là **Business hoặc Enterprise Support**. (Hiện AWS đang đổi tên gói: Business Support+, Enterprise Support, Unified Operations; gói Developer và Business cũ dừng từ 1/1/2027. Ý cần nhớ không đổi: *full checks cần gói trả tiền*.)

Các check cost hay gặp, kèm tiêu chí để thấy "idle" được định nghĩa cụ thể thế nào:

- **Idle Load Balancers**: load balancer không có instance nào phía sau, hoặc nhận dưới 100 request/ngày suốt 7 ngày.
- **Low utilization EC2 instances**: CPU trung bình ngày từ 10% trở xuống và network I/O từ 5 MB trở xuống trong ít nhất 4 trên 14 ngày gần nhất.
- **Reserved Instance / Savings Plans**: đề xuất mua thêm cam kết dựa trên usage on-demand, và báo RI sắp hết hạn.
- **Lambda functions with excessive timeouts**: function hay chạy tới hết timeout, vừa tốn tiền (Lambda tính theo thời gian chạy) vừa là dấu hiệu lỗi.
- Ngoài ra: Elastic IP không gắn vào đâu, EBS volume ít dùng, RDS instance không có kết nối nào trong 7 ngày.

### 9.3 Use case
- **Rà hằng tuần**: mở tab cost optimization, xử lý các mục vàng/đỏ. Rẻ hơn nhiều so với tự viết script tìm resource thừa.
- **Tự động hoá**: kết quả check phát ra event trên EventBridge, từ đó gọi Lambda để tự dọn (ví dụ gỡ Elastic IP không dùng) hoặc mở ticket. Kết quả security cũng xem được chung với Security Hub.

---

## 10. AWS Compute Optimizer

(Đã đề cập [[ch4-01-compute-cost]].)

**Nó là gì.** Dịch vụ miễn phí chuyên một việc: **right-sizing**. Nó đọc metric sử dụng thật của resource từ CloudWatch (CPU, network, disk I/O), dùng ML so với các cấu hình khác, rồi xếp mỗi resource vào một trong ba loại: *over-provisioned* (đang thừa, hạ cỡ để tiết kiệm), *under-provisioned* (đang thiếu, nâng cỡ để tránh nghẽn) hoặc *optimized*. Mỗi đề xuất kèm số tiền tiết kiệm ước tính và mức rủi ro về hiệu năng.

- **Phủ những gì:** EC2 instance, Auto Scaling group, EBS volume, Lambda function (đề xuất memory), ECS service chạy trên Fargate, và RDS / Aurora.
- **Cần bao nhiêu dữ liệu:** EC2 cần ít nhất **30 giờ** metric trong **14 ngày** gần nhất; Lambda cần ít nhất 50 lần invoke trong 14 ngày. Sau khi đủ, phân tích mất tới 24 giờ rồi đề xuất mới hiện. Mặc định nó nhìn lại 14 ngày; bật *enhanced infrastructure metrics* (tính phí thêm) thì nhìn lại được tới 93 ngày, có ích cho workload có chu kỳ theo tháng hay theo quý.
- **Điểm mù về memory:** EC2 mặc định **không** gửi metric memory lên CloudWatch. Muốn đề xuất tính cả RAM thì phải cài CloudWatch agent trên máy; nếu không, Compute Optimizer chỉ dựa vào CPU, network và disk.
- **Setup:** bật dịch vụ (opt-in) cho một account hoặc cả Organization, rồi chờ đủ dữ liệu.

So với Trusted Advisor: Trusted Advisor quét **rộng** nhiều lĩnh vực với tiêu chí cố định (CPU ≤ 10% là "low utilization") và cần gói Support trả tiền để xem phần cost. Compute Optimizer chỉ làm right-sizing nhưng làm **sâu** hơn, đề xuất đúng loại máy nên chuyển sang, và miễn phí với mọi account.

> 🪤 Bẫy thi: *"đề xuất loại/cỡ instance tối ưu dựa trên mức sử dụng thực tế"* → **Compute Optimizer**. *"đề xuất mua Savings Plan / RI"* → **Cost Explorer**. *"kiểm tra tổng quát theo best practice, gồm cả security và service limits"* → **Trusted Advisor**.

---

## 11. FinOps framework

**FinOps** (ghép từ Finance + DevOps) là cách tổ chức để **engineering tự chịu trách nhiệm về chi phí cloud** của mình, thay vì để phòng tài chính phát hiện vào cuối tháng. Đề SAA không hỏi thẳng FinOps, nhưng khung này giúp xếp các công cụ ở trên vào đúng chỗ.

### 11.1 3 phase

Ba pha lặp vòng liên tục, không phải làm một lần rồi xong:

1. **Inform (thấy được)**: làm cho chi phí nhìn thấy được và quy được về người chịu trách nhiệm. Công cụ: Cost Explorer, CUR, tagging. Chưa qua pha này thì hai pha sau chỉ là đoán.
2. **Optimize (hành động)**: cắt giảm dựa trên thứ đã thấy. Right-size, mua RI/Savings Plan, đặt lifecycle cho S3, tắt resource thừa. Đây là nội dung của ba bài trước trong chương 4.
3. **Operate (duy trì)**: biến việc trên thành nếp thường xuyên. Budget, alarm, dashboard, KPI, họp review định kỳ.

### 11.2 KPIs
- **Cost per customer / per request / per GB** (unit economics, §6.3): đo hiệu quả, không chỉ đo tổng tiền.
- **Savings Plan utilization** (target > 95%) và **coverage** (target > 70%), định nghĩa ở §4.1. Utilization đặt cao vì dưới 100% là tiền mất trắng; coverage đặt thấp hơn có chủ đích, vì phần tải biến động nên để cho on-demand và Spot.
- **% idle resource**: tỉ lệ chi phí nằm ở resource không dùng (Trusted Advisor và Compute Optimizer cung cấp số này).
- **Tag compliance rate**: tỉ lệ chi phí quy được về một team. Phần không quy được càng lớn thì báo cáo showback càng ít ý nghĩa.

### 11.3 Cultural
- **Showback / chargeback per team** tạo ownership: team nào cũng thấy con số của mình, hoặc bị trừ thật vào ngân sách (§6.3).
- **Cost dashboard chia theo team**, đặt ở nơi engineer vẫn nhìn hằng ngày.
- **Đưa cost vào OKR của engineering**, ví dụ "giảm chi phí mỗi request 15% trong quý".

---

## 12. AWS Pricing tools

Các công cụ ở trên xem tiền **đã tiêu**. Nhóm này ước lượng tiền **sẽ tiêu**, trước khi dựng hệ thống.

### 12.1 AWS Pricing Calculator
- **Nó là gì:** trang web miễn phí (`calculator.aws`) để ước lượng chi phí một kiến trúc **trước khi deploy**. Chọn service, nhập cấu hình (loại máy, số giờ chạy, số GB lưu, lượng data transfer) và nhận ước tính theo tháng và theo năm. Không cần có AWS account.
- **So sánh kịch bản:** dựng hai nhóm trong cùng một estimate, ví dụ "EC2 on-demand" và "EC2 + Savings Plan 1 năm", hoặc "region us-east-1" và "ap-southeast-1", để đặt cạnh nhau.
- **Chia sẻ:** lưu thành link công khai, hoặc export CSV / PDF gửi cho stakeholder.
- Ước tính dùng giá niêm yết và **chưa gồm thuế**.

Đề thi phân biệt: *"ước lượng chi phí một workload **chưa tồn tại**"* → Pricing Calculator. *"xem / dự báo chi phí của workload **đang chạy**"* → Cost Explorer.

### 12.2 AWS Migration Hub Strategy
- Dùng ở giai đoạn **trước khi migrate** từ on-premises: phân tích server và ứng dụng hiện có rồi đề xuất chiến lược cho từng cái (rehost, replatform, refactor…), làm đầu vào cho việc ước tính **TCO** (*Total Cost of Ownership*: tổng chi phí sở hữu, gồm cả phần cứng, điện, nhân sự vận hành, không chỉ tiền thuê máy).
- Công cụ chuyên dựng business case so sánh TCO on-premises với AWS là **Migration Evaluator**.
- Lưu ý: từ 7/11/2025 AWS Migration Hub không còn nhận khách hàng mới; các tính năng tương tự được chuyển sang **AWS Transform**. Tên Migration Hub vẫn có thể xuất hiện trong đề.

### 12.3 AWS Customer Carbon Footprint Tool
- Đây không phải công cụ về tiền. Nó ước tính **lượng khí thải carbon** do việc dùng AWS của bạn gây ra, tính bằng tấn CO₂ tương đương (MTCO2e), chia theo service và region, phục vụ báo cáo bền vững (ESG).
- Nó được xếp cạnh nhóm cost vì cùng nằm trong khu Billing và vì hai mục tiêu thường đi cùng chiều: tắt resource thừa và right-size vừa giảm bill vừa giảm phát thải. Đây là góc nhìn của trụ cột **Sustainability** trong Well-Architected Framework.
- Tên gọi: chức năng này nay nằm trong dịch vụ **AWS Sustainability**; đề thi vẫn dùng tên Customer Carbon Footprint Tool.

---

## 13. Patterns enterprise

### 13.1 Multi-account cost governance

Tách mỗi team hoặc mỗi môi trường thành một account riêng là cách chia chi phí **chắc chắn nhất**: mọi thứ trong account đó mặc nhiên thuộc về team đó, không phụ thuộc việc có ai quên tag hay không.

- **Management account** (tên cũ: master account): bật **Consolidated Billing** để gộp mọi account vào một hoá đơn. Usage được cộng dồn nên đạt bậc giá khối lượng sớm hơn, và RI / Savings Plan mua ở một account được chia sẻ cho account khác. Budget tổng đặt ở đây.
- **Mỗi account của team**: budget riêng kèm Budget Action riêng.
- **CUR tập trung**: xuất về một S3 bucket ở account chuyên cho audit / FinOps, để dữ liệu billing không nằm ở nơi nhiều người có quyền.
- **IAM Identity Center**: đăng nhập một lần (SSO) và cấp cho người làm FinOps một permission set chỉ xem billing trên các account cần thiết.

### 13.2 Showback workflow
1. CUR → Athena → một query chạy hằng ngày, group by tag `Team`.
2. Kết quả gửi email / Slack cho từng team mỗi tuần.
3. Mỗi quý: họp review chi tiêu với engineering lead.

### 13.3 Cost gate trong CI/CD
- Công cụ như **Infracost** đọc `terraform plan` và tính ra thay đổi này làm bill tăng hay giảm bao nhiêu mỗi tháng. (**OpenCost** làm việc tương tự cho chi phí bên trong cụm Kubernetes.)
- Con số được comment thẳng vào pull request, nên người review thấy "+$1.200/tháng" **trước khi merge**. Đây là chỗ sớm nhất có thể chặn một khoản chi, sớm hơn cả SCP.

---

## 14. Ví dụ setup cho 3 org

### 14.1 Startup 5 người
- Single account → multi account khi scale.
- Budget $500/tháng total + alert.
- Cost Anomaly Detection bật.
- Trusted Advisor weekly check.

### 14.2 Scale-up 50 người
- Org với account per env (prod/staging/dev).
- Budget per env.
- Cost Explorer dashboard cho engineering team.
- Tagging required (Config rule + SCP).
- Monthly FinOps review.

### 14.3 Enterprise 1000 người
- Org với 50+ account.
- CUR → Redshift → BI dashboard.
- FinOps team dedicated.
- EDP negotiate (*Enterprise Discount Program*: hợp đồng cam kết mức chi tiêu nhiều năm với AWS để đổi lấy chiết khấu trên toàn bộ hoá đơn).
- Showback/chargeback per business unit.
- Cost dashboard per team trong internal portal.

---

## 15. Cạm bẫy đề thi (SAA)

1. **"AWS Budgets dừng resource khi vượt limit"** → **Sai mặc định**. Cần config Budget Action explicit.
2. **"Cost Explorer real-time"** → **Sai**, lag 24h. Không công cụ cost nào real-time (§2).
3. **"Tag tự inherit từ parent resource"** → **Sai**, phải set explicit (vài service inherit như Auto Scaling). Và tag phải được **activate** thành cost allocation tag mới hiện trong billing (§7.4).
4. **"Cost Anomaly Detection thay thế Budget"** → **Không**. Anomaly = unusual spike, Budget = absolute limit.
5. **"Consolidated Billing tự tier discount"** → **Đúng** cho service eligible (S3, data transfer): usage của mọi account cộng dồn để tính bậc giá.
6. **"Cost Explorer free unlimited"** → Giao diện web miễn phí, nhưng **API tính $0,01 mỗi request** và dữ liệu theo giờ tính phí riêng (§3.1).
7. **"Trusted Advisor full free"** → **Sai**, full checks cần Business/Enterprise Support. Gói miễn phí chỉ có service limits và vài check security.
8. **"Tag Policy bắt buộc mọi resource phải có tag"** → **Sai**. Tag Policy chuẩn hoá value của tag đang có; ép phải có tag là việc của SCP / IAM condition `aws:RequestTag` (§7.3).
9. **"Cần cảnh báo trước khi vượt ngân sách"** → Budgets với ngưỡng **forecasted**, không phải CloudWatch Billing Alarm (chỉ so với số đã tiêu).

---

## 16. Tóm tắt 1 dòng

> Cost không tự quản. Stack: **Cost Explorer** (trend), **Budgets** (limit + action), **Anomaly Detection** (spike), **CUR + Athena** (deep), **Tagging** (group by), **SCP** (guardrail), **FinOps process** (continuous). Inform → Optimize → Operate.

---

## 17. Bài tập tự kiểm tra

1. Startup vừa nhận seed $500k. Setup cost governance từ ngày 1 — minimum viable stack?
2. Dev team đốt $20k/tháng không ai biết. Plan để có visibility trong 1 tuần?
3. Tag inconsistent: 30% resource không tag, 20% tag sai key. Cleanup strategy?
4. Budget alert email không ai đọc. Cách make accountable?
5. Forecast Q4 spend vượt 30% budget. Cách action trước khi xảy ra?
6. Multi-account org, 1 account spike $10k 1 ngày. Detect/respond trong 1h thế nào? (Gợi ý: dữ liệu billing trễ tới 24 giờ theo §2, nên muốn nhanh cỡ 1 giờ phải canh **usage** bằng CloudWatch metric/alarm, không phải canh tiền.)

---

## 18. Đọc thêm

- AWS Whitepaper — *Cost Optimization Pillar*, *Tagging Best Practices*.
- *AWS FinOps Foundation*.
- AWS Builder's Library — *Cost optimization* series.
- AWS docs — *Cost Explorer*, *Budgets*, *CUR* user guides.

---

**🎉 Chương 4 và SAA-C03 (chapter 1-4) hoàn thành!**

Bạn đã có nền tảng để:
- Đọc đề SAA với cách nhìn architect, không phải checklist.
- Áp dụng vào hệ thống thực tế.

Bước tiếp theo có thể:
- Làm SAA practice exam (Tutorials Dojo, Stephane Maarek).
- Review lại Foundation [[foundations-01-cap-theorem]] đến [[foundations-06-failure-modes]] sau khi qua chương 2-4 — sẽ "click" sâu hơn.
- Hands-on lab build 1 architecture end-to-end (multi-AZ web app, CI/CD, observability).
