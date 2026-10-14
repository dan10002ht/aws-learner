# SAA Ch3.4 — Detective Controls & Compliance

> Mục tiêu: Hiểu các service "phát hiện" (CloudTrail, Config, GuardDuty, Security Hub, Macie, Inspector, Detective) — vai trò mỗi cái, khi nào dùng cái nào, và design **audit + incident response** không bị mù khi sự cố xảy ra.

Tiền đề: [[ch3-01-iam-deep-dive]], [[ch3-02-network-security]], [[ch3-03-data-protection]].

---

## 1. Câu chuyện mở đầu — "Có ai xóa CloudTrail không?"

3h sáng, alert: production DB bị drop table. CEO gọi. Bạn check CloudTrail → **không có log nào trong 6 giờ qua**. Ai đã ngắt CloudTrail? Không biết, vì log dừng từ trước đó.

→ **Detective control là dùng được khi vẫn còn log để xem**. Phải:
1. Bật CloudTrail **org-wide**, log đến account audit riêng.
2. Bucket log **không cho ai trong account chính delete** (SCP + bucket policy).
3. Có **alarm** khi CloudTrail bị stop.

Đây là bài học cơ bản nhưng nhiều công ty học bằng máu.

---

## 2. Spectrum detective services

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 460" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Mapping detective service theo câu hỏi cần trả lời</title>
  <desc>Mỗi service trả lời một câu hỏi: CloudTrail (ai làm gì), Config (trạng thái resource), GuardDuty (threat), Inspector (vulnerability), Macie (sensitive data), Security Hub (aggregate findings), Detective (investigate), VPC Flow Logs (network traffic).</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Mỗi service = 1 câu hỏi</text>
  <text x="232" y="24" font-size="11.5" fill="currentColor" opacity="0.6">Câu hỏi cần trả lời</text>
  <text x="540" y="24" font-size="11.5" fill="currentColor" opacity="0.6">Service</text>
  <g>
    <rect x="16" y="38" width="500" height="44" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="30" y="65" font-size="12.5" fill="currentColor">"Ai đã làm gì, khi nào?" (API call)</text>
    <line x1="520" y1="60" x2="540" y2="60" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="540" y="46" width="164" height="28" rx="14" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="622" y="65" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">CloudTrail</text>
  </g>
  <g>
    <rect x="16" y="90" width="500" height="44" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="30" y="117" font-size="12.5" fill="currentColor">"Resource cấu hình ra sao, đổi khi nào?"</text>
    <line x1="520" y1="112" x2="540" y2="112" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="540" y="98" width="164" height="28" rx="14" fill="#10b981" fill-opacity="0.95"/>
    <text x="622" y="117" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">AWS Config</text>
  </g>
  <g>
    <rect x="16" y="142" width="500" height="44" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="30" y="169" font-size="12.5" fill="currentColor">"Có hành vi đe doạ / bị xâm nhập không?"</text>
    <line x1="520" y1="164" x2="540" y2="164" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="540" y="150" width="164" height="28" rx="14" fill="#f59e0b" fill-opacity="0.95"/>
    <text x="622" y="169" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">GuardDuty</text>
  </g>
  <g>
    <rect x="16" y="194" width="500" height="44" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="30" y="221" font-size="12.5" fill="currentColor">"Có lỗ hổng (CVE) trên EC2/ECR/Lambda?"</text>
    <line x1="520" y1="216" x2="540" y2="216" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="540" y="202" width="164" height="28" rx="14" fill="#8b5cf6" fill-opacity="0.95"/>
    <text x="622" y="221" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">Inspector</text>
  </g>
  <g>
    <rect x="16" y="246" width="500" height="44" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="30" y="273" font-size="12.5" fill="currentColor">"S3 có chứa dữ liệu nhạy cảm (PII)?"</text>
    <line x1="520" y1="268" x2="540" y2="268" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="540" y="254" width="164" height="28" rx="14" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="622" y="273" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">Macie</text>
  </g>
  <g>
    <rect x="16" y="298" width="500" height="44" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="30" y="325" font-size="12.5" fill="currentColor">"Gom mọi finding về 1 chỗ để xem?"</text>
    <line x1="520" y1="320" x2="540" y2="320" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="540" y="306" width="164" height="28" rx="14" fill="#10b981" fill-opacity="0.95"/>
    <text x="622" y="325" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">Security Hub</text>
  </g>
  <g>
    <rect x="16" y="350" width="500" height="44" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="30" y="377" font-size="12.5" fill="currentColor">"Đào sâu: entity nào liên quan nhau?"</text>
    <line x1="520" y1="372" x2="540" y2="372" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="540" y="358" width="164" height="28" rx="14" fill="#f59e0b" fill-opacity="0.95"/>
    <text x="622" y="377" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">Detective</text>
  </g>
  <g>
    <rect x="16" y="402" width="500" height="44" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="30" y="429" font-size="12.5" fill="currentColor">"Traffic mạng vào/ra (ACCEPT/REJECT)?"</text>
    <line x1="520" y1="424" x2="540" y2="424" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="540" y="410" width="164" height="28" rx="14" fill="#8b5cf6" fill-opacity="0.95"/>
    <text x="622" y="429" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">VPC Flow Logs</text>
  </g>
</svg>

Mỗi dịch vụ là một lớp, trả lời một câu hỏi. Ngoài tám dịch vụ trên hình còn hai nguồn log hay gặp: truy vấn DNS thì xem **Route 53 Resolver query logs**, từng request bị chặn hay cho qua ở tầng web thì xem **WAF logs** (§11).

Một từ sẽ gặp suốt bài: **finding** là một "phiếu báo vấn đề" do dịch vụ bảo mật sinh ra, gồm *chuyện gì*, *trên resource nào*, *nghiêm trọng cỡ nào*. GuardDuty, Inspector, Macie, Security Hub đều nói chuyện với nhau bằng finding.

---

## 3. CloudTrail — "ai làm gì khi nào"

**Nó là gì.** Mọi thao tác trên AWS, dù bấm trên console, gõ CLI hay gọi SDK, cuối cùng đều là một **API call** tới AWS. CloudTrail ghi lại từng API call đó thành một **event** dạng JSON: ai gọi (user/role nào), gọi API gì, lúc nào, từ IP nào, tham số gì, thành công hay bị từ chối. Đây là nguồn duy nhất trả lời được câu "ai đã xoá cái bucket đó".

Một event rút gọn trông như sau:

```json
{
  "eventTime": "2026-03-02T19:42:11Z",
  "eventSource": "ec2.amazonaws.com",
  "eventName": "AuthorizeSecurityGroupIngress",
  "userIdentity": { "type": "AssumedRole", "arn": "arn:aws:sts::111122223333:assumed-role/DevOps/alice" },
  "sourceIPAddress": "203.0.113.50",
  "requestParameters": { "groupId": "sg-0abc1234", "cidrIp": "0.0.0.0/0", "fromPort": 22 }
}
```

Đọc ra: lúc 19:42 UTC, `alice` (đang dùng role `DevOps`) từ IP `203.0.113.50` đã mở cổng 22 của `sg-0abc1234` cho cả internet. Event không có trường `errorCode` nghĩa là lệnh thành công; nếu bị từ chối sẽ có `"errorCode": "AccessDenied"`, tức CloudTrail ghi cả những lần thử thất bại.

### 3.1 Các loại event

Trước hết cần hai khái niệm. **Control plane** (mặt điều khiển) là các thao tác *quản lý resource*: tạo, sửa cấu hình, xoá, cấp quyền. **Data plane** (mặt dữ liệu) là các thao tác *dùng dữ liệu bên trong resource*: đọc/ghi object, gọi hàm, đọc một item. Tạo bucket là control plane; tải một file trong bucket là data plane. CloudTrail chia event theo đúng ranh giới này:

| Loại | Ghi lại gì | Mặc định | Giá (us-east-1) |
|------|-----------|----------|------------------|
| **Management events** | Thao tác control plane: `CreateBucket`, `RunInstances`, `AssumeRole`, `ConsoleLogin` | **Luôn ghi**, xem được 90 ngày gần nhất | Bản sao đầu tiên ra S3 **miễn phí**; bản thứ hai trở đi ~$2,00 / 100.000 event |
| **Data events** | Thao tác data plane: S3 `GetObject`/`PutObject`, Lambda `Invoke`, DynamoDB `GetItem` | **Tắt**, phải tự bật cho từng loại resource | ~$0,10 / 100.000 event |
| **Insights events** | *Không* phải API call, mà là cảnh báo "tần suất gọi API hoặc tỉ lệ lỗi đang bất thường" | **Tắt** | ~$0,35 / 100.000 management event được phân tích |

Docs hiện tại còn liệt kê loại thứ tư là **network activity events** (API call đi qua VPC endpoint, cũng tắt mặc định, ~$0,10 / 100.000 event). Đề thi SAA chủ yếu hỏi ba loại trong bảng.

**Vì sao data event tắt mặc định?** Vì số lượng lớn hơn management event nhiều bậc. Một tài khoản bình thường có vài nghìn tới vài chục nghìn management event mỗi ngày (số lần người và công cụ thay đổi hạ tầng). Còn data event thì mỗi request đọc/ghi là một event:

```
Một bucket phục vụ ảnh, trung bình 200 GetObject/giây:
200 × 86.400 giây × 30 ngày      = 518.400.000 event/tháng
518.400.000 ÷ 100.000 × $0,10    ≈ $518/tháng   (chỉ riêng một bucket, chưa tính tiền lưu log trên S3)
```

Nên cách dùng đúng là **bật có chọn lọc**: chỉ những bucket chứa dữ liệu nhạy cảm, và nếu được thì chỉ ghi thao tác *ghi* (xem bài tập 6 ở §18).

**Insights hoạt động thế nào?** CloudTrail liên tục theo dõi management event của tài khoản để biết mức "bình thường" (baseline), rồi sinh một Insights event khi lệch hẳn khỏi mức đó. Ví dụ trong docs: tài khoản thường có không quá 20 lần gọi `deleteBucket` mỗi phút, bỗng lên trung bình 100 lần mỗi phút. Một event được ghi lúc bắt đầu bất thường và một event lúc kết thúc. Insights chỉ nhìn **tần suất và tỉ lệ lỗi của API**, không biết IP nào độc hại; việc đó là của GuardDuty (§5).

### 3.2 Event history và trail — xem ở đâu, lưu bao lâu

Có hai nơi chứa event, và đề thi rất hay bẫy chỗ này.

**Event history** có sẵn trong mọi tài khoản, không cần cấu hình, không mất tiền. Nó chỉ chứa **management event** của **90 ngày** gần nhất, xem theo từng region. Hết 90 ngày là mất, và không có data event trong đó.

**Trail** là một cấu hình do bạn tạo, bảo CloudTrail "chép event ra S3 bucket này" (tuỳ chọn thêm CloudWatch Logs để đặt alarm). File log nằm trên S3 nên lưu bao lâu là do **bạn** quyết định bằng lifecycle của bucket: 1 năm, 7 năm hay mãi mãi. Event tới S3 sau vài phút (docs S3 ghi khoảng 5 phút với data event, 15 phút với management event), nên CloudTrail không phải công cụ realtime.

Ba loại trail:

- **Single-region trail** chỉ ghi event của một region. Kẻ tấn công chỉ cần thao tác ở region khác là bạn không thấy. Chỉ còn dùng trong vài trường hợp đặc biệt.
- **Multi-region trail** ghi event của mọi region vào cùng một bucket. Region mới AWS mở thêm cũng tự được ghi. **Luôn chọn loại này**.
- **Organization trail** được tạo ở management account (hoặc delegated administrator) của AWS Organizations và tự áp xuống **mọi account thành viên**, đổ log về một bucket trung tâm. Account mới gia nhập Organization tự động được ghi. User trong account thành viên nhìn thấy trail nhưng **không có quyền sửa, tắt hay xoá** nó.

### 3.3 Patterns audit-grade

Mục tiêu: sau khi kẻ tấn công đã có quyền admin trong một account, log vẫn còn và vẫn tin được. Năm lớp, mỗi lớp chặn một cách phá khác nhau:

1. **Organization trail ghi về bucket ở một account riêng** (thường gọi là log archive / audit account). Admin của account production không có quyền gì trên bucket đó, nên chiếm được production cũng không xoá được log.
2. **Bucket bật Object Lock hoặc MFA Delete.** Object Lock (chế độ governance hoặc compliance) khiến file log không thể bị xoá hay ghi đè trong thời hạn đã đặt. MFA Delete bắt phải có mã MFA mới xoá được version. Chi tiết hai cơ chế ở [[ch3-03-data-protection]].
3. **SCP cấm `cloudtrail:StopLogging` và `cloudtrail:DeleteTrail`** trên mọi account. SCP (service control policy) là "trần quyền" áp từ Organizations, admin trong account cũng không vượt được. Đây là lớp chặn đúng tình huống ở §1.
4. **Log file integrity validation** để chứng minh log không bị sửa. Cơ chế: CloudTrail tính **hash SHA-256** cho từng file log nó giao. Mỗi giờ, nó giao thêm một **digest file** liệt kê các file log của giờ vừa qua kèm hash của từng file, rồi **ký số** digest đó bằng private key của CloudTrail (SHA-256 with RSA). Mỗi digest còn chứa chữ ký của digest trước, nên chúng nối thành một chuỗi. Khi cần kiểm, chạy `aws cloudtrail validate-logs`: lệnh tính lại hash và so với digest. Sửa một byte trong file log thì hash lệch; xoá một file log thì digest vẫn liệt kê nó nên lộ ngay; xoá luôn digest thì chuỗi bị đứt. Kẻ tấn công không có private key của CloudTrail nên không tự ký lại được.
5. **CloudTrail → CloudWatch Logs → metric filter → alarm.** Metric filter là một mẫu tìm kiếm chạy trên log, mỗi lần khớp thì cộng 1 vào một metric; alarm bắn khi metric ≥ 1. Dùng cho các hành động nhạy cảm: đăng nhập bằng root, `StopLogging`, sửa IAM policy, đổi security group. Đây là thứ thiếu trong câu chuyện ở §1: không ai được báo lúc trail bị tắt.

### 3.4 CloudTrail Lake

**Bài toán.** Log trên S3 là hàng triệu file JSON nén. Muốn hỏi "role X đã gọi những API nào trong 6 tháng qua" thì phải tự dựng bảng Athena, khai partition, lo quyền đọc bucket.

**CloudTrail Lake** là kho được quản lý sẵn cho việc đó: event được nạp thẳng vào một **event data store** (kho bất biến, không sửa được), và bạn truy vấn bằng SQL ngay trong console CloudTrail, không cần trail, không cần Athena hay Glue. Kho này gom được event từ nhiều region, nhiều account trong Organization, và cả event từ nguồn ngoài AWS.

- **Lưu bao lâu:** tuỳ gói giá chọn lúc tạo. Gói *seven-year retention* lưu tối đa 2.557 ngày (~7 năm, con số đề thi hay dùng). Gói *one-year extendable* lưu tối đa 3.653 ngày (~10 năm).
- **Trả tiền hai chỗ:** theo GB nạp vào và theo GB quét khi query.

```
Gói one-year extendable, nạp 100 GB event/tháng (us-east-1):
Nạp:    100 GB × $0,75   = $75/tháng   (đã gồm 1 năm lưu)
Query:  quét 100 GB × $0,005 = $0,50 cho một lần quét hết dữ liệu của tháng đó
```

| | **Trail → S3 (+ Athena)** | **CloudTrail Lake** |
|--|---------------------------|---------------------|
| Bạn phải dựng | Bucket, lifecycle, bảng Athena, partition | Không gì cả, tạo event data store là xong |
| Chi phí | Bản sao management event đầu tiên miễn phí, trả tiền S3 và Athena | Trả theo GB nạp, đắt hơn S3 thuần |
| Lưu tối đa | Không giới hạn (do lifecycle S3) | ~7 hoặc ~10 năm tuỳ gói |
| Hợp khi | Chủ yếu để lưu trữ dài hạn, ít khi query | Team security query thường xuyên, không muốn vận hành pipeline |

> 🪤 Bẫy thi: *"lưu log API nhiều năm, chi phí thấp nhất"* → trail ra S3 + lifecycle sang Glacier. *"truy vấn SQL trên hoạt động API mà không tự dựng hạ tầng"* → CloudTrail Lake. *"phát hiện tần suất gọi API bất thường"* → CloudTrail Insights.

---

## 4. AWS Config — "resource state changed when, conform compliance?"

**Khác CloudTrail ở đâu.** CloudTrail ghi **hành động** ("alice gọi `AuthorizeSecurityGroupIngress` lúc 19:42"). Config ghi **kết quả của hành động lên resource** ("security group `sg-0abc1234` lúc 19:43 có những rule sau, trước đó có những rule kia"). Muốn biết SG này 30 ngày trước trông ra sao mà chỉ có CloudTrail thì phải tự lần ngược mọi API call từng đụng vào nó; Config lưu sẵn từng phiên bản.

### 4.1 Core — recorder, configuration item, rule, remediation

**Configuration recorder** là bộ phận phải bật đầu tiên. Nó theo dõi các loại resource bạn chọn (mặc định là mọi loại được hỗ trợ trong region) và mỗi khi một resource được tạo, sửa hay xoá, nó ghi lại một **configuration item (CI)**.

**Configuration item** là một bản chụp trạng thái của **một resource tại một thời điểm**: metadata, toàn bộ thuộc tính cấu hình, quan hệ với resource khác, và event CloudTrail liên quan. Rút gọn:

```json
{
  "resourceType": "AWS::EC2::SecurityGroup",
  "resourceId": "sg-0abc1234",
  "configurationItemCaptureTime": "2026-03-02T19:43:05Z",
  "configurationItemStatus": "OK",
  "configuration": {
    "ipPermissions": [ { "fromPort": 22, "toPort": 22, "ipRanges": ["0.0.0.0/0"] } ]
  },
  "relationships": [ { "resourceId": "i-0123456789abcdef0", "name": "Is associated with Instance" } ]
}
```

Xếp các CI của một resource theo thời gian thì được **configuration history** (dòng thời gian cấu hình). Config cũng định kỳ giao history ra một S3 bucket và có thể bắn thông báo qua SNS mỗi lần có CI mới.

**Config rule** là một phép kiểm "cấu hình này có đúng chuẩn không", trả về `COMPLIANT` hoặc `NON_COMPLIANT` cho từng resource. Có hai nguồn rule: **managed rule** do AWS viết sẵn (ví dụ `encrypted-volumes`, `s3-bucket-public-read-prohibited`, `restricted-ssh`), và **custom rule** do bạn viết bằng Lambda hoặc ngôn ngữ Guard. Rule chạy theo một trong hai kiểu kích hoạt (hoặc cả hai):

- **Configuration change:** chạy ngay khi có CI mới của loại resource nằm trong phạm vi rule. Vừa mở cổng 22 ra internet là rule `restricted-ssh` được đánh giá lại.
- **Periodic:** chạy theo chu kỳ bạn chọn (ví dụ mỗi 24 giờ), dùng cho những thứ không gắn với một lần thay đổi cụ thể, như "account có bật CloudTrail không".

**Remediation.** Bản thân rule chỉ **báo**, không sửa và không chặn. Muốn tự sửa thì gắn rule với một **SSM Automation document** (một kịch bản các bước do Systems Manager chạy). Khi resource thành `NON_COMPLIANT`, Config gọi kịch bản đó, tự động hoặc chờ người bấm. Ví dụ: rule `restricted-ssh` vi phạm thì chạy document `AWS-DisablePublicAccessForSecurityGroup` để gỡ rule 0.0.0.0/0.

> 🪤 Config là **detective**, không phải preventive. Resource sai chuẩn vẫn được tạo ra, rồi vài phút sau mới bị gắn nhãn vi phạm (và được sửa nếu có remediation). Muốn **chặn từ đầu** thì dùng SCP hoặc IAM policy.

### 4.2 Use case

- **Audit ngược thời gian:** "30 ngày trước `sg-xxx` có những rule nào?" Mở timeline của resource trong Config, chọn ngày.
- **Compliance liên tục:** "mọi EBS volume phải mã hoá" thì dùng rule `encrypted-volumes`, thêm remediation nếu muốn tự xử lý.
- **Phát hiện resource bị lộ:** snapshot EBS bị share public thì rule `ebs-snapshot-public-restorable-check` báo `NON_COMPLIANT`, remediation gỡ quyền public (đáp án bài tập 4).
- **Drift detection:** resource bị sửa tay ngoài IaC. Timeline cho thấy ai sửa gì, vì mỗi CI có link sang event CloudTrail tương ứng.

### 4.3 Conformance packs

Một **conformance pack** là một bó Config rule kèm remediation, đóng gói trong một file YAML và triển khai như một đơn vị. AWS cung cấp sẵn mẫu cho các khung chuẩn (HIPAA, PCI DSS, NIST, CIS). Thay vì bật tay từng rule trong vài chục rule, bạn triển khai một pack cho một account, hoặc cho cả Organization, rồi xem điểm tuân thủ của cả pack.

### 4.4 Aggregator

Config là dịch vụ theo **region và account**: mỗi account, mỗi region có recorder và dữ liệu riêng. **Aggregator** gom dữ liệu cấu hình và kết quả compliance từ nhiều account, nhiều region về **một account** để xem một chỗ. Nó chỉ **đọc**: không triển khai rule hay sửa gì ở account nguồn qua aggregator được. Với account thuộc Organizations thì không cần từng account cấp phép riêng. Dùng aggregator không tốn thêm tiền.

### 4.5 Cost

Config tính tiền theo hai thứ: số **configuration item** được ghi (~$0,003 mỗi CI ở chế độ ghi liên tục, us-east-1) và số lần **rule được đánh giá** (~$0,001 mỗi lần cho 100.000 lần đầu). Vì mỗi lần resource đổi là một CI, hoá đơn phụ thuộc vào **hạ tầng của bạn thay đổi thường xuyên cỡ nào**, không phải vào số resource.

```
Hạ tầng ít đổi: 300 resource, mỗi cái đổi 2 lần/tháng
  600 CI × $0,003                    = $1,80/tháng

Hạ tầng co giãn mạnh: Auto Scaling tạo/huỷ instance, ENI, volume liên tục,
sinh khoảng 5.000 CI/ngày
  5.000 × 30 ngày = 150.000 CI × $0,003 = $450/tháng
```

Hai cách giảm: **chọn loại resource cần ghi** (bỏ các loại đổi liên tục mà không cần audit), hoặc chuyển các loại đó sang **periodic recording**, tức mỗi ngày chỉ ghi một CI nếu có thay đổi (~$0,012 mỗi CI). Một resource đổi 50 lần mỗi ngày tốn 50 × $0,003 = $0,15/ngày khi ghi liên tục, còn $0,012/ngày khi ghi định kỳ; đổi lại bạn mất các trạng thái trung gian trong ngày.

---

## 5. GuardDuty — threat detection

**Nó là gì.** CloudTrail và Flow Logs chỉ là log thô, không ai ngồi đọc hàng triệu dòng mỗi ngày. GuardDuty là dịch vụ **đọc hộ** các log đó và chỉ lên tiếng khi thấy dấu hiệu tấn công. Bật bằng một cú bấm, không cài gì lên máy.

### 5.1 Cách hoạt động

**Nguồn dữ liệu.** Ba nguồn nền (foundational), có ngay khi bật GuardDuty:

- **CloudTrail management events**: ai gọi API gì, từ đâu.
- **VPC Flow Logs**: instance nói chuyện với IP nào, cổng nào.
- **Route 53 Resolver DNS query logs**: instance phân giải tên miền nào (chỉ thấy được khi instance dùng DNS resolver mặc định của AWS).

Điểm hay bị hiểu sai: **bạn không cần tự bật** CloudTrail trail, Flow Logs hay DNS query logging thì GuardDuty mới chạy. Nó lấy dữ liệu qua một **luồng riêng, độc lập** bên trong AWS, không đụng tới cấu hình log của bạn và bạn không trả tiền lưu log cho phần đó. Ngược lại, GuardDuty phân tích xong là bỏ, **không giữ log cho bạn xem**. Muốn tự tra cứu traffic khi điều tra thì vẫn phải bật Flow Logs (§10).

Ngoài ba nguồn nền còn các **protection plan** bật thêm, mỗi cái mở một nguồn: S3 Protection (CloudTrail data event của S3), EKS Protection (EKS audit logs), Lambda Protection (hoạt động mạng của Lambda), RDS Protection (hoạt động đăng nhập Aurora/RDS), Malware Protection (quét mã độc trên EBS, S3), Runtime Monitoring (hành vi tiến trình bên trong máy).

**Hai cách phát hiện.**

1. **Threat intelligence** là danh sách IP và tên miền đã biết là xấu (máy chủ điều khiển botnet, mining pool, Tor exit node) do AWS và đối tác duy trì. Instance của bạn kết nối tới một IP trong danh sách là có finding ngay, không cần học gì.
2. **Machine learning / phát hiện bất thường.** GuardDuty dựng **baseline hành vi cho từng principal và resource trong chính tài khoản của bạn**: role này thường gọi những API nào, từ mạng nào, vào giờ nào; instance này thường nói chuyện qua cổng nào, lưu lượng bao nhiêu. Finding sinh ra khi hành vi lệch khỏi baseline đó, ví dụ một role CI/CD xưa nay chỉ gọi `ecs:UpdateService` bỗng gọi `iam:CreateUser` từ một quốc gia chưa từng xuất hiện. Vì cần lịch sử để so, loại phát hiện này chính xác dần sau một thời gian chạy.

**Kết quả** là finding có điểm severity từ 1,0 đến 10,0:

| Mức | Điểm | Ý nghĩa |
|-----|------|---------|
| **Low** | 1,0 – 3,9 | Có hành vi đáng ngờ nhưng chưa gây hại, như port scan hay dò mật khẩu thất bại |
| **Medium** | 4,0 – 6,9 | Hành vi lệch khỏi bình thường, có thể resource đã bị chiếm, cần xem sớm |
| **High** | 7,0 – 8,9 | Resource (instance, credential) **đã bị chiếm** và đang bị dùng trái phép |
| **Critical** | 9,0 – 10,0 | Một **chuỗi tấn công** nhiều bước đang hoặc vừa diễn ra |

(Tài liệu cũ và nhiều câu hỏi thi chỉ nhắc ba mức Low/Medium/High; mức Critical được thêm sau.)

**Không cần agent** cho toàn bộ phần phát hiện nền, vì dữ liệu là log do AWS tự thu. Ngoại lệ duy nhất là Runtime Monitoring: muốn nhìn tiến trình bên trong máy thì phải có một security agent của GuardDuty chạy trên đó.

### 5.2 Finding types phổ biến

Tên finding có cấu trúc `MụcĐíchTấnCông:Resource/ChiTiết`, đọc tên là đoán được chuyện gì:

| Finding | Nghĩa là | Phát hiện từ |
|---------|----------|--------------|
| `UnauthorizedAccess:EC2/SSHBruteForce` | Instance đang bị (hoặc đang đi) dò mật khẩu SSH | VPC Flow Logs |
| `CryptoCurrency:EC2/BitcoinTool.B` | Instance kết nối tới IP liên quan đào coin, nhiều khả năng đã bị chiếm | VPC Flow Logs |
| `Backdoor:EC2/C&CActivity.B` | Instance gọi về máy chủ điều khiển (command and control) của kẻ tấn công | VPC Flow Logs |
| `Trojan:EC2/DNSDataExfiltration` | Instance tuồn dữ liệu ra ngoài bằng cách nhét vào các truy vấn DNS (DNS tunneling) | DNS logs |
| `Policy:S3/BucketAnonymousAccessGranted` | Ai đó vừa đổi policy/ACL khiến bucket đọc được công khai | CloudTrail management events |
| `Discovery:IAMUser/AnomalousBehavior` | Một principal gọi các API dò quyền, liệt kê resource theo cách lệch baseline | CloudTrail management events |
| `Stealth:IAMUser/CloudTrailLoggingDisabled` | Trail vừa bị tắt, đúng tình huống §1 | CloudTrail management events |

> 📏 Tài liệu cũ nhắc `Recon:IAMUser/UserPermissions` (dò quyền IAM đáng ngờ). Finding này đã bị AWS cho nghỉ; hành vi tương ứng nay được báo qua nhóm `…:IAMUser/AnomalousBehavior` như dòng `Discovery` ở trên.

### 5.3 Best practice

- **Bật ở mọi region**, kể cả region bạn không dùng. GuardDuty là dịch vụ theo region, mà kẻ tấn công có credential thường chọn đúng region vắng để dựng máy đào coin vì ở đó không ai nhìn.
- **Quản lý tập trung qua AWS Organizations.** Management account chỉ định một account (thường là account security, không nên là chính management account) làm **delegated administrator** cho GuardDuty. Account này bật GuardDuty cho mọi account thành viên, đặt chế độ **auto-enable** để account mới gia nhập tự được bật, và xem finding của toàn tổ chức ở một chỗ. Vì GuardDuty theo region nên phải chỉ định delegated administrator ở từng region, và phải là cùng một account. (Tài liệu cũ gọi mô hình này là "master account mời member account".)
- **Nối sang Security Hub và EventBridge.** Mỗi finding được phát thành một event trên EventBridge, từ đó gọi Lambda cách ly instance hay gửi cảnh báo (§14.2). GuardDuty tự nó chỉ **phát hiện**, không chặn và không sửa.

### 5.4 Cost

Tính theo **lượng dữ liệu được phân tích**: số management event của CloudTrail (theo triệu event) và số GB của Flow Logs và DNS logs, cộng phí riêng của từng protection plan bật thêm. Tài khoản càng nhiều traffic thì càng tốn, và không đoán trước được bằng số instance. Vì vậy có **30 ngày dùng thử miễn phí** cho mỗi region lần đầu bật; trong thời gian đó console hiện ước tính chi phí hằng tháng theo từng nguồn, dùng con số ấy để dự toán. GuardDuty đọc log qua luồng riêng nên không phát sinh thêm phí CloudTrail hay Flow Logs.

> 🪤 Bẫy thi: *"phát hiện instance bị chiếm, đào coin, credential bị dùng từ IP lạ, ít công vận hành nhất"* → **GuardDuty**. Không cần bật Flow Logs trước, không cần agent.

---

## 6. AWS Inspector

**Nó là gì.** GuardDuty tìm **cuộc tấn công đang diễn ra**. Inspector tìm **lỗ hổng chưa bị khai thác**: phần mềm bạn đang chạy có phiên bản nào dính lỗi bảo mật đã được công bố không. Lỗi công bố được đánh mã **CVE** (Common Vulnerabilities and Exposures, ví dụ `CVE-2021-44228` là lỗi Log4Shell của thư viện log4j).

### 6.1 Vulnerability scan

Cơ chế chung cho cả ba loại resource: Inspector lập **danh sách phần mềm** (tên gói + phiên bản) rồi đối chiếu với cơ sở dữ liệu CVE. Khác nhau ở cách lấy danh sách đó.

- **EC2** có hai cách lấy danh sách gói:
  - *Agent-based:* dùng **SSM Agent** đã có sẵn trên máy (không phải agent riêng của Inspector). Điều kiện là instance phải là "managed instance" của Systems Manager, tức có SSM Agent đang chạy và instance profile cho phép SSM quản lý. Thiếu điều kiện này là lý do phổ biến nhất khiến instance không được quét.
  - *Agentless:* Inspector chụp **EBS snapshot** của các volume, đọc danh sách gói từ snapshot rồi xoá snapshot. Dùng cho máy không có SSM, chạy mỗi 24 giờ.
  - Chế độ *hybrid* kết hợp cả hai: máy có SSM thì quét qua agent, máy không có thì quét qua snapshot.
- **Network reachability** (cũng cho EC2) là một phép kiểm khác hẳn, không nhìn vào trong máy. Inspector **phân tích cấu hình mạng** (security group, NACL, route table, internet gateway, load balancer) để trả lời: "cổng nào của instance này thực sự tới được từ internet?". Không gửi gói tin thật nào. Finding kiểu "cổng 22 của `i-0123…` mở ra internet qua `sg-0abc1234` và internet gateway `igw-…`". Chạy mỗi 12 giờ.
- **ECR container image**: quét các gói hệ điều hành và thư viện ngôn ngữ lập trình bên trong image, khi image được push và quét lại khi có CVE mới.
- **Lambda function**: quét các thư viện phụ thuộc đóng gói trong function và layer. Có thêm tuỳ chọn quét cả mã nguồn của bạn để tìm lỗi như hardcode secret.

Một finding gồm: mã CVE, gói và phiên bản đang cài, phiên bản đã vá, resource bị ảnh hưởng và điểm nghiêm trọng. Ví dụ: "`CVE-2021-44228`, gói `log4j-core 2.14.1` trong image `orders-api:1.8`, vá ở `2.15.0`, Critical".

### 6.2 Continuous vs on-demand

Inspector hiện tại (hay gọi là Inspector v2; bản cũ là Inspector Classic) quét **liên tục và tự động**: bật một lần cho account hoặc cả Organization, không phải lên lịch hay chọn target. Một instance được quét lại khi nó vừa khởi chạy, khi cài thêm phần mềm, và khi **cơ sở dữ liệu CVE có mục mới liên quan** tới gói nó đang chạy. Điểm cuối quan trọng: máy không đổi gì nhưng hôm nay vẫn có thể có finding mới, vì lỗ hổng vừa được công bố hôm qua.

Finding của Inspector tự chảy sang Security Hub (§8) và EventBridge.

### 6.3 Use case

- **Quét tuân thủ định kỳ:** chứng minh cho auditor rằng hạ tầng được quét lỗ hổng liên tục và lỗi nghiêm trọng được vá trong thời hạn.
- **CI/CD:** quét image khi push lên ECR, pipeline dừng deploy nếu có CVE mức Critical.

> 🪤 *"lỗ hổng phần mềm, CVE, cổng mở ra internet không chủ ý"* → **Inspector**. *"hành vi đáng ngờ, bị chiếm, mã độc đang chạy"* → **GuardDuty**. *"dữ liệu nhạy cảm trong S3"* → **Macie**.

---

## 7. Macie — sensitive data discovery

Đã giới thiệu ở [[ch3-03-data-protection]]. Nhắc lại phần cần cho bài này.

**PII** (personally identifiable information) là dữ liệu định danh được một người cụ thể: họ tên, địa chỉ, số điện thoại, số an sinh xã hội (SSN), số thẻ tín dụng. Câu hỏi Macie trả lời là: "trong hàng nghìn bucket của tôi, **bucket nào đang chứa** loại dữ liệu đó, và bucket ấy có đang public hay không mã hoá không?"

- **Cơ chế:** Macie lập danh mục mọi bucket S3 của account (trạng thái public, mã hoá, chia sẻ ra ngoài), rồi **đọc nội dung object** và so khớp bằng mẫu nhận dạng cùng machine learning. Có sẵn các bộ nhận dạng cho SSN, số thẻ, access key; bạn thêm được mẫu riêng bằng regex (ví dụ mã khách hàng nội bộ).
- **Kết quả:** finding kiểu "object `exports/users.csv` trong bucket `acme-backup` chứa 1.240 số thẻ tín dụng", gửi sang Security Hub và EventBridge.
- **Giá:** theo số bucket được theo dõi và theo **GB dữ liệu được quét**. Quét toàn bộ một data lake sẽ tốn, nên thường chọn bucket hoặc dùng chế độ lấy mẫu tự động.

Macie **chỉ làm việc với S3**. Không quét EBS, RDS hay DynamoDB.

---

## 8. Security Hub — aggregator

**Bài toán.** Đến đây bạn đã có GuardDuty, Inspector, Macie, Config, mỗi cái một console, một định dạng finding, nhân với 50 account và vài region. Không ai mở 200 màn hình mỗi sáng.

> 📏 Tên gọi: dịch vụ mô tả ở đây nay có tên chính thức là **AWS Security Hub CSPM** (Cloud Security Posture Management). Đề thi và hầu hết tài liệu vẫn gọi là **Security Hub**.

### 8.1 Role

Security Hub làm hai việc, cần tách bạch.

**Việc 1: gom finding.** Nó nhận finding từ GuardDuty, Inspector, Macie, IAM Access Analyzer, Firewall Manager và các sản phẩm bên thứ ba (Snyk, Wiz…), rồi đổi tất cả về **một định dạng JSON chung** gọi là ASFF (AWS Security Finding Format). Nhờ chung định dạng mà lọc, sắp xếp, viết automation được trên mọi nguồn cùng lúc. Security Hub **không tự phát hiện mối đe doạ**: tắt GuardDuty đi thì phần finding về threat trong Security Hub cũng trống.

**Việc 2: chấm điểm theo chuẩn (standards check).** Một **standard** là một bộ **control**; mỗi control là một phép kiểm cấu hình, ví dụ control `CloudTrail.1` kiểm "account có ít nhất một multi-region trail ghi management event". Các standard có sẵn: AWS Foundational Security Best Practices, CIS AWS Foundations Benchmark, PCI DSS, NIST. Bật một standard thì Security Hub chạy liên tục các control của nó và cho ra **điểm bảo mật** (tỉ lệ control đạt) theo từng account.

Cơ chế bên dưới: phần lớn control được hiện thực bằng **Config rule** do Security Hub tự tạo. Hệ quả cần nhớ là **phải bật AWS Config (recorder) thì standards check mới chạy**. Thiếu Config, Security Hub vẫn gom finding được nhưng phần chấm điểm gần như trống.

### 8.2 Workflow

Mỗi finding có trạng thái xử lý: mới, đã có người nhận, đã xử lý, hoặc **suppressed** (đã xem và chấp nhận, không báo lại). Team security làm việc trên danh sách này như một hàng đợi ticket.

Tự động hoá đi qua **EventBridge**: mỗi finding mới hoặc được cập nhật thành một event. Rule của EventBridge lọc theo điều kiện (ví dụ severity Critical, nguồn GuardDuty) rồi gọi đích: tạo ticket Jira, nhắn Slack, hoặc chạy Lambda tự khắc phục.

### 8.3 Best practice

- **Một account quản trị cho cả tổ chức.** Giống GuardDuty: management account của Organizations chỉ định account security làm **delegated administrator**; account này tự bật Security Hub cho mọi account thành viên và account mới, và thấy finding của tất cả. (Cách cũ là account quản trị gửi lời mời từng account, chỉ còn dùng khi không có Organizations.)
- **Gom nhiều region về một region.** Security Hub theo region; bật *cross-Region aggregation* để finding từ các region khác chảy về một region chính, khỏi phải đổi region trên console.
- **Bật ở mọi account, mọi region đang dùng**, cùng với Config.

---

## 9. AWS Detective

**Bài toán.** GuardDuty báo: "role `app-prod` gọi API từ một IP lạ". Finding dừng ở đó. Người điều tra cần câu trả lời cho các câu hỏi tiếp theo:

- IP đó còn dùng **những role nào khác** trong 30 ngày qua?
- Role `app-prod` sau đó đã gọi những API nào, có API nào nó **chưa từng gọi** trước đây?
- Instance mà role này gắn vào đã gửi bao nhiêu dữ liệu ra ngoài, tăng đột biến từ hôm nào?

Mọi dữ kiện đều có trong CloudTrail và Flow Logs, nhưng mỗi dòng log chỉ là **một sự kiện rời**. Để trả lời "IP này liên quan tới những ai", bạn phải tự viết query nối hàng triệu dòng theo IP, theo role, theo thời gian.

**Detective làm sẵn việc nối đó.** Nó nạp CloudTrail, VPC Flow Logs và finding của GuardDuty (tuỳ chọn thêm EKS audit logs), rồi dựng một **behavior graph**: các **entity** (IP, IAM user, role, instance, account) là nút, các hành động giữa chúng là cạnh, kèm thống kê theo thời gian. Dữ liệu được giữ tới **1 năm**, nên so được "tuần này" với "bình thường". Cũng như GuardDuty, Detective lấy log qua luồng riêng, bạn không cần bật trail hay Flow Logs cho nó.

Cách dùng: trong console GuardDuty, chọn finding rồi bấm **Investigate with Detective**. Detective mở trang hồ sơ của entity trong finding, với sẵn các biểu đồ kiểu "số lần gọi API theo ngày", "các IP mới xuất hiện", "lưu lượng ra ngoài theo giờ".

| | **GuardDuty** | **Security Hub** | **Detective** |
|--|---------------|------------------|---------------|
| Vai trò | **Phát hiện**: sinh finding | **Gom và ưu tiên** finding, chấm điểm theo chuẩn | **Điều tra** nguyên nhân gốc và phạm vi của một finding |
| Câu hỏi | "Có chuyện gì đáng ngờ không?" | "Trong tất cả vấn đề, cái nào cần xử lý trước?" | "Chuyện này bắt đầu từ đâu, lan tới đâu?" |
| Người dùng chính | Tự động | Trưởng nhóm security, auditor | Người phân tích trong SOC (security operations center, nhóm trực giám sát an ninh) |

---

## 10. VPC Flow Logs

**Nó là gì.** Bản ghi **metadata** của traffic IP đi qua các network interface trong VPC: ai nói chuyện với ai, cổng nào, bao nhiêu byte, được cho qua hay bị chặn. Nó **không ghi nội dung gói tin**. Giống hoá đơn điện thoại: có số gọi đi, số nhận, thời lượng, nhưng không có nội dung cuộc gọi.

### 10.1 Cấu hình

**Bật ở ba cấp**, từ rộng tới hẹp: cả **VPC** (mọi interface trong VPC), một **subnet**, hoặc một **ENI** cụ thể (ENI là card mạng ảo gắn vào instance).

**Đích ghi:** S3, CloudWatch Logs, hoặc Data Firehose (để đẩy tiếp sang nơi khác như Splunk, OpenSearch).

**Định dạng một bản ghi.** Một **flow** được xác định bằng **5-tuple**, tức bộ năm giá trị: IP nguồn, IP đích, cổng nguồn, cổng đích, giao thức. Flow Logs gom mọi gói tin có cùng 5-tuple trên cùng một interface trong một **khoảng gom** (aggregation interval, mặc định tối đa 10 phút, chọn được 1 phút) thành **một dòng**. Ví dụ ở định dạng mặc định:

```
2 123456789010 eni-1235b8ca123456789 172.31.16.139 172.31.16.21 20641 22 6 20 4249 1418530010 1418530070 ACCEPT OK
│ │            │                     │             │            │     │  │ │  │    │          │          │      └ log-status
│ │            │                     │             │            │     │  │ │  │    │          │          └ action
│ │            │                     │             │            │     │  │ │  │    │          └ end (Unix time, cách start 60 giây)
│ │            │                     │             │            │     │  │ │  │    └ start
│ │            │                     │             │            │     │  │ │  └ bytes
│ │            │                     │             │            │     │  │ └ packets
│ │            │                     │             │            │     │  └ protocol (6 = TCP)
│ │            │                     │             │            │     └ dstport (22 = SSH)
│ │            │                     │             │            └ srcport
│ │            │                     │             └ dstaddr
│ │            │                     └ srcaddr
│ │            └ interface-id
│ └ account-id
└ version
```

Đọc ra: trong 60 giây, máy `172.31.16.139` gửi 20 gói, tổng 4.249 byte, tới cổng SSH của `172.31.16.21`, và traffic **được cho qua**. Một dòng khác trong docs kết thúc bằng `... 49761 3389 6 20 4249 ... REJECT OK`: traffic tới cổng 3389 (RDP) **bị chặn** bởi security group hoặc NACL.

Hai điều suy ra từ cơ chế này:

- **Không realtime.** Phải hết khoảng gom rồi mới ghi, sau đó mất thêm thời gian giao: khoảng 5 phút tới CloudWatch Logs, khoảng 10 phút tới S3.
- **`REJECT` không nói ai chặn.** Bản ghi chỉ cho biết bị chặn, không ghi là do security group hay NACL. Mẹo phân biệt: security group là stateful (đã cho chiều đi thì chiều về tự qua), NACL là stateless. Nên nếu thấy chiều đi `ACCEPT` mà chiều về `REJECT` thì thủ phạm là NACL.

### 10.2 Use case

- **Gỡ rối mạng:** "app không nối được DB". Lọc theo IP và cổng của DB: thấy `REJECT` thì do SG hoặc NACL, không thấy dòng nào thì gói tin chưa tới nơi (sai route).
- **Điều tra sự cố:** instance bị chiếm đã nói chuyện với những IP nào, gửi ra bao nhiêu byte, từ lúc nào (câu a và d của bài tập 1).
- **Audit và compliance:** các chuẩn như PCI DSS yêu cầu lưu vết truy cập mạng tới vùng chứa dữ liệu thẻ.
- **Đầu vào của GuardDuty:** GuardDuty tự lấy flow log qua luồng riêng (§5.1), không phụ thuộc việc bạn có bật Flow Logs hay không.

### 10.3 Cost

Flow Logs thuộc nhóm **vended logs** (log do dịch vụ AWS tự sinh thay mặt bạn) và tính tiền **theo GB log được giao**, ở cả ba đích. Giao ra S3 **không miễn phí**; nó rẻ hơn CloudWatch Logs, không phải bằng 0.

```
VPC sinh 1.000 GB flow log/tháng, giao vào CloudWatch Logs (us-east-1):
1.000 GB × $0,50 (bậc 10 TB đầu của vended logs)  = $500/tháng tiền nạp
+ tiền lưu trong CloudWatch Logs cho tới khi hết hạn retention
```

Cùng lượng đó giao ra S3 thì đơn giá mỗi GB thấp hơn, và tiền lưu theo giá S3 (hạ tiếp được bằng lifecycle sang lớp lưu trữ lạnh). Vì vậy:

| Nhu cầu | Đích nên chọn | Lý do |
|---------|---------------|-------|
| Lưu lâu dài cho audit, thỉnh thoảng mới tra | **S3**, query bằng **Athena** | Rẻ nhất; ghi dạng Parquet và chia partition theo ngày để Athena quét ít |
| Cần alarm gần realtime trên traffic (metric filter) | **CloudWatch Logs** | Có metric filter và Logs Insights, đổi lại đắt hơn |
| Đẩy sang SIEM bên ngoài | **Data Firehose** | Firehose giao thẳng tới Splunk, OpenSearch, HTTP endpoint |

Giảm lượng log: chỉ ghi traffic `REJECT`, hoặc chỉ bật ở các subnet quan trọng thay vì cả VPC.

---

## 11. Other logs đáng nhớ

Mỗi dịch vụ dưới đây có log riêng, **tắt mặc định**, bật khi cần đúng loại thông tin ở cột phải.

| Log | Service | Cho biết gì, bật khi nào |
|-----|---------|--------------------------|
| **ALB / NLB access logs** | ELB | Từng request (ALB) hoặc từng kết nối TCP/TLS (NLB): IP client, đường dẫn, mã trả về, thời gian xử lý. Ghi ra S3, query bằng Athena |
| **CloudFront access logs** | CloudFront | Từng request tới edge: edge location nào phục vụ, cache hit hay miss |
| **S3 server access logs** | S3 | Từng request tới bucket. Là lựa chọn thay thế cho CloudTrail data events, so sánh ngay dưới |
| **WAF logs** | WAF | Từng request kèm rule nào khớp và hành động block/allow/count |
| **Route 53 Resolver query logs** | Route 53 | Tên miền mà resource trong VPC đã phân giải. Dùng để tra DNS khi điều tra (GuardDuty có luồng DNS riêng của nó) |
| **RDS audit logs** | RDS | Câu SQL và phiên đăng nhập, qua cơ chế audit của từng engine (Oracle Audit, MySQL audit plugin) |

**CloudTrail data events hay S3 server access logs?** Cả hai đều ghi truy cập object, nhưng sinh ra từ hai cơ chế khác nhau nên khác về độ tin cậy và giá:

| | **CloudTrail data events** | **S3 server access logs** |
|--|----------------------------|---------------------------|
| Giá | ~$0,10 / 100.000 event + tiền lưu | Không phí giao ra S3, chỉ trả tiền lưu |
| Tốc độ giao | Khoảng 5 phút | Trong vòng vài giờ |
| Kiểm tra toàn vẹn (chữ ký số) | Có (§3.3) | Không |
| Bật theo prefix | Có | Không, cả bucket |
| Định dạng | JSON, chung với mọi event API khác | Text phân tách bằng dấu cách |
| Ghi request **sai credential** (lỗi xác thực) | Không | Có |
| Ghi thao tác của lifecycle (chuyển lớp, hết hạn) | Không | Có |

Quy tắc chọn: cần bằng chứng audit có thể chứng minh không bị sửa, cần alarm trong vài phút, hoặc cần gom về một chỗ cùng log API khác thì dùng **CloudTrail data events**. Cần ghi lại *mọi* request với chi phí thấp nhất và chấp nhận trễ vài giờ thì dùng **server access logs**. AWS khuyến nghị CloudTrail cho mục đích audit (đáp án bài tập 2).

---

## 12. Compliance frameworks AWS support

**Compliance framework** là một bộ yêu cầu bảo mật do cơ quan quản lý hoặc tổ chức ngành ban hành; doanh nghiệp muốn hoạt động trong ngành đó phải chứng minh mình đáp ứng.

| Framework | Áp dụng cho |
|-----------|-------------|
| **HIPAA** | Dữ liệu y tế tại Mỹ |
| **PCI-DSS** | Bất kỳ ai xử lý dữ liệu thẻ thanh toán |
| **SOC 1/2/3** | Báo cáo kiểm toán về kiểm soát nội bộ của nhà cung cấp dịch vụ (SOC 1 về tài chính, SOC 2/3 về bảo mật và tính sẵn sàng) |
| **ISO 27001/27017/27018** | Chuẩn quốc tế về quản lý an toàn thông tin (27017 cho cloud, 27018 cho dữ liệu cá nhân trên cloud) |
| **FedRAMP** | Dịch vụ cloud bán cho chính phủ liên bang Mỹ |
| **GDPR** | Dữ liệu cá nhân của người ở EU |
| **NIST 800-53** | Danh mục kiểm soát bảo mật cho hệ thống liên bang Mỹ |
| **CIS Benchmarks** | Hướng dẫn cấu hình an toàn (hardening) cho từng nền tảng |

**AWS Artifact** là cổng tự phục vụ trong console, nơi bạn tải về **báo cáo kiểm toán của chính AWS** (báo cáo SOC, chứng chỉ ISO, xác nhận PCI) và ký các thoả thuận pháp lý với AWS, như BAA cho HIPAA. Auditor hỏi "nhà cung cấp cloud của anh có đạt SOC 2 không" thì bạn vào Artifact lấy báo cáo đưa cho họ. Dịch vụ miễn phí.

**Báo cáo đó chứng minh được gì, và không chứng minh được gì.** Theo mô hình shared responsibility:

- AWS chịu trách nhiệm bảo mật **của** cloud (*security **of** the cloud*): trung tâm dữ liệu, phần cứng, hypervisor, mạng vật lý. Các chứng nhận trong Artifact phủ đúng phần này.
- Bạn chịu trách nhiệm bảo mật **trong** cloud (*security **in** the cloud*): bucket có public không, dữ liệu có mã hoá không, IAM cấp quyền thế nào, hệ điều hành có vá không.

Chạy ứng dụng trên một dịch vụ AWS đã đạt PCI DSS **không** làm ứng dụng của bạn tự động đạt PCI DSS. Phần của bạn phải tự chứng minh, và ba công cụ ở §13 giúp việc đó.

> 🪤 *"cần tải báo cáo SOC / chứng chỉ ISO của AWS để đưa auditor"* → **AWS Artifact**. Artifact không kiểm tra gì trong tài khoản của bạn.

---

## 13. AWS Audit Manager

**Bài toán.** Mỗi kỳ kiểm toán, auditor đưa danh sách vài trăm control ("mọi thay đổi quyền truy cập đều được ghi log", "dữ liệu lưu trữ được mã hoá") và đòi **bằng chứng** cho từng cái trong suốt kỳ. Làm tay là chụp màn hình, xuất log, dán vào bảng tính trong nhiều tuần.

**Audit Manager** tự động hoá phần gom bằng chứng. Bạn chọn một framework có sẵn (HIPAA, PCI DSS, GDPR, SOC 2…) để tạo một **assessment**. Mỗi control trong framework đã được ánh xạ sẵn tới nguồn dữ liệu trên AWS. Audit Manager thu **liên tục** kết quả Config rule, kết quả control của Security Hub, event CloudTrail và ảnh chụp cấu hình qua API, rồi gắn vào đúng control. Cuối kỳ xuất ra một **assessment report** để nộp. Những control không tự động được (ví dụ chính sách đào tạo nhân viên) thì bạn tải bằng chứng lên tay.

Ba dịch vụ đều nhắc tới "PCI", "CIS" nên rất dễ lẫn. Khác nhau ở **đầu ra**:

| | **Config conformance pack** | **Security Hub standards** | **Audit Manager** |
|--|-----------------------------|----------------------------|-------------------|
| Bản chất | Một bó Config rule triển khai cùng lúc | Bộ control chấm điểm, phần lớn chạy trên Config rule | Bộ thu thập và sắp xếp **bằng chứng** theo control của framework |
| Đầu ra | Resource nào `NON_COMPLIANT`, kèm remediation | Điểm bảo mật + finding để team security xử lý | Hồ sơ bằng chứng theo thời gian + báo cáo cho auditor |
| Người dùng | Kỹ sư vận hành | Team security | Bộ phận compliance, auditor |
| Tự sửa được không | Có, qua remediation | Không trực tiếp (qua EventBridge) | Không, chỉ ghi nhận |

Chúng xếp tầng lên nhau chứ không thay thế nhau: Config rule đánh giá resource, Security Hub gom kết quả thành điểm, Audit Manager lấy cả hai làm bằng chứng.

> 🪤 *"liên tục thu thập bằng chứng để chuẩn bị kiểm toán, giảm công làm tay"* → **Audit Manager**. *"tự động sửa resource sai chuẩn"* → **Config rule + remediation**. *"một màn hình xem điểm tuân thủ CIS của mọi account"* → **Security Hub**.

---

## 14. Incident response patterns

### 14.1 Playbook cơ bản

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 250" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Luồng incident response playbook 7 bước</title>
  <desc>Chuỗi xử lý sự cố từ trái qua phải: Detect, Triage, Investigate, Contain, Eradicate, Recover, Post-mortem; mỗi bước kèm service AWS tương ứng.</desc>
  <text x="16" y="22" font-size="14" font-weight="700" fill="currentColor">Playbook ứng cứu sự cố — chuỗi 7 bước</text>
  <defs>
    <marker id="irArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
  <g>
    <rect x="16" y="40" width="150" height="56" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="28" y="62" font-size="13" font-weight="700" fill="currentColor">1. Detect</text>
    <text x="28" y="80" font-size="10" fill="currentColor" opacity="0.7">GuardDuty / Config</text>
    <text x="28" y="92" font-size="10" fill="currentColor" opacity="0.7">CloudWatch alarm</text>
  </g>
  <line x1="166" y1="68" x2="190" y2="68" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#irArr)"/>
  <g>
    <rect x="194" y="40" width="150" height="56" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="206" y="62" font-size="13" font-weight="700" fill="currentColor">2. Triage</text>
    <text x="206" y="80" font-size="10" fill="currentColor" opacity="0.7">Security Hub</text>
    <text x="206" y="92" font-size="10" fill="currentColor" opacity="0.7">đánh giá severity</text>
  </g>
  <line x1="344" y1="68" x2="368" y2="68" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#irArr)"/>
  <g>
    <rect x="372" y="40" width="150" height="56" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="384" y="62" font-size="13" font-weight="700" fill="currentColor">3. Investigate</text>
    <text x="384" y="80" font-size="10" fill="currentColor" opacity="0.7">Detective + CloudTrail</text>
    <text x="384" y="92" font-size="10" fill="currentColor" opacity="0.7">+ VPC Flow Logs</text>
  </g>
  <line x1="522" y1="68" x2="546" y2="68" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#irArr)"/>
  <g>
    <rect x="550" y="40" width="154" height="56" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="562" y="62" font-size="13" font-weight="700" fill="currentColor">4. Contain</text>
    <text x="562" y="80" font-size="10" fill="currentColor" opacity="0.7">isolate SG, revoke</text>
    <text x="562" y="92" font-size="10" fill="currentColor" opacity="0.7">cred, snapshot</text>
  </g>
  <line x1="627" y1="96" x2="627" y2="120" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#irArr)"/>
  <g>
    <rect x="550" y="124" width="154" height="56" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="562" y="146" font-size="13" font-weight="700" fill="currentColor">5. Eradicate</text>
    <text x="562" y="164" font-size="10" fill="currentColor" opacity="0.7">terminate resource</text>
    <text x="562" y="176" font-size="10" fill="currentColor" opacity="0.7">bị xâm nhập, patch</text>
  </g>
  <line x1="550" y1="152" x2="526" y2="152" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#irArr)"/>
  <g>
    <rect x="372" y="124" width="150" height="56" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="384" y="146" font-size="13" font-weight="700" fill="currentColor">6. Recover</text>
    <text x="384" y="164" font-size="10" fill="currentColor" opacity="0.7">restore từ backup</text>
    <text x="384" y="176" font-size="10" fill="currentColor" opacity="0.7">rotate secret</text>
  </g>
  <line x1="372" y1="152" x2="348" y2="152" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#irArr)"/>
  <g>
    <rect x="194" y="124" width="150" height="56" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="206" y="146" font-size="13" font-weight="700" fill="currentColor">7. Post-mortem</text>
    <text x="206" y="164" font-size="10" fill="currentColor" opacity="0.7">root cause +</text>
    <text x="206" y="176" font-size="10" fill="currentColor" opacity="0.7">cải thiện</text>
  </g>
  <text x="16" y="216" font-size="11" fill="currentColor" opacity="0.65">Detect → Triage → Investigate → Contain (chứa thiệt hại) → Eradicate → Recover → học từ sự cố.</text>
</svg>

1. **Detect**: GuardDuty / Config / CloudWatch alarm.
2. **Triage**: Security Hub aggregate, severity.
3. **Investigate**: Detective + CloudTrail + Flow Logs.
4. **Contain**: isolate instance (SG = deny all), revoke credentials, snapshot for forensics.
5. **Eradicate**: terminate compromised resource, patch.
6. **Recover**: restore từ backup, rotate secret.
7. **Post-mortem**: root cause + improvement.

### 14.2 Automation

Bước Contain cần xong trong vài phút, kể cả lúc 3 giờ sáng, nên phải để máy làm. Mảnh ghép trung tâm là **EventBridge**: GuardDuty và Security Hub phát mỗi finding thành một event, và một rule của EventBridge lọc event rồi gọi đích.

Một luồng điển hình:

1. Rule EventBridge khớp finding GuardDuty có severity từ 7 trở lên (mức High và Critical, xem bảng ở §5.1).
2. Rule gọi một **Lambda** (hoặc Step Functions nếu nhiều bước).
3. Lambda lần lượt: chụp **snapshot EBS** của instance để giữ bằng chứng, đổi instance sang một **security group cách ly** không có rule nào, gắn **tag** đánh dấu đang điều tra, rồi gửi thông báo cho SOC qua SNS.

**SSM Incident Manager** là dịch vụ quản lý quy trình xử lý sự cố: khi alarm hoặc event kích hoạt, nó mở một incident, gọi người trực theo lịch và thứ tự leo thang, chạy runbook (SSM Automation) và ghi lại dòng thời gian để làm post-mortem.

### 14.3 Forensic acquisition

Forensics là thu thập bằng chứng để biết kẻ tấn công đã làm gì. Thứ tự thao tác quyết định bằng chứng còn hay mất.

- **Đừng stop hay terminate instance ngay.** Tiến trình độc hại, kết nối mạng đang mở, khoá giải mã chỉ nằm trong RAM; stop là mất hết. Terminate còn có thể xoá luôn volume.
- **Cách ly trước:** đổi sang security group không có rule nào. Lưu ý security group theo dõi kết nối, nên kết nối đã mở trước đó có thể chưa bị cắt ngay; cần cắt tuyệt đối thì thêm NACL deny ở subnet.
- **Rồi mới thu:** snapshot EBS, dump bộ nhớ qua SSM (Run Command), tách instance khỏi Auto Scaling group và load balancer để nó không bị thay thế hay tiếp tục nhận traffic.
- **Chép snapshot và log sang một forensics account riêng**, nơi kẻ tấn công (đang có quyền ở account bị chiếm) không với tới.
- **Thu hồi credential:** role của instance có thể đã bị lấy cắp credential tạm thời, nên gắn policy deny cho mọi session cấp trước thời điểm phát hiện.

---

## 15. Patterns enterprise — landing zone

**Landing zone** là một môi trường AWS **nhiều account đã dựng sẵn nền móng** trước khi team nào deploy thứ gì: cấu trúc account, đăng nhập tập trung, log tập trung, và các hàng rào bảo mật áp cho mọi account. Tên gọi mượn hình ảnh bãi đáp: workload "hạ cánh" xuống một nơi đã chuẩn bị sẵn thay vì mỗi team tự dựng một kiểu.

Dựng tay thì phải tự ráp gần hết những thứ đã học trong bài này, nhân với số account. **AWS Control Tower** là dịch vụ dựng và duy trì landing zone tự động. Nó không phải một cơ chế mới mà là lớp **điều phối** các dịch vụ có sẵn:

| Control Tower dựng | Bằng dịch vụ nào | Tác dụng |
|--------------------|------------------|----------|
| Tổ chức nhiều account, chia theo OU | AWS Organizations | Tách workload, giới hạn phạm vi thiệt hại khi một account bị chiếm |
| **Log Archive account** | Organization trail của CloudTrail + Config, ghi về S3 ở account riêng | Log tập trung, account workload không xoá được (§3.3) |
| **Audit account** | Quyền đọc xuyên account, Config aggregator | Team security và auditor xem được mọi account, mặc định chỉ đọc |
| **Guardrail** (nay gọi là *control*) dạng **preventive** | SCP | Chặn hành động, ví dụ cấm tắt CloudTrail |
| Guardrail dạng **detective** | Config rule | Không chặn, chỉ báo account nào vi phạm, ví dụ bucket cho phép đọc public |
| Đăng nhập một lần cho người dùng | IAM Identity Center | Một danh tính, vào nhiều account bằng permission set |
| **Account Factory** | Service Catalog | Tạo account mới theo mẫu, tự có sẵn mọi thứ ở trên |

GuardDuty và Security Hub thường được bật thêm cho mọi account qua delegated administrator (§5.3, §8.3), với account Audit làm nơi quản trị.

Với một tổ chức mới bắt đầu nhiều account, dùng Control Tower thay vì tự ráp từng mảnh: ít việc hơn, và đúng theo cách AWS khuyến nghị. Cách tổ chức OU, viết SCP và Account Factory được giải thích kỹ ở [[ch3-05-multi-account-governance]].

> 🪤 *"dựng nhanh môi trường nhiều account an toàn theo best practice, ít công nhất"* → **Control Tower**. *"chỉ cần cấm một hành động trên mọi account"* → **SCP** của Organizations là đủ.

---

## 16. Cạm bẫy đề thi (SAA)

1. **"CloudTrail bật mặc định 90 ngày retention"** → Đúng, nhưng chỉ cho **management event trong Event history**. Muốn giữ lâu hơn hoặc có data event thì phải tạo trail; log trong S3 lưu bao lâu tuỳ bạn (§3.2).
2. **"CloudTrail log mọi API"** → **Sai mặc định**. Data event (S3 `GetObject`, Lambda `Invoke`) phải bật riêng và tính tiền theo số event (§3.1).
3. **"Config detect VPC Flow"** → **Sai**. Config ghi **trạng thái cấu hình của resource**. Traffic mạng là việc của VPC Flow Logs; phát hiện traffic đáng ngờ là việc của GuardDuty.
4. **"GuardDuty cần agent"** → **Sai**. Phần phát hiện nền đọc log do AWS tự thu, không cài gì, cũng không cần bạn bật Flow Logs trước. Chỉ tính năng tuỳ chọn Runtime Monitoring mới dùng agent (§5.1).
5. **"Inspector scan running EC2 chỉ"** → **Sai** với Inspector hiện tại: quét EC2, image trong ECR và Lambda function, liên tục và tự động (§6).
6. **"Security Hub thay thế GuardDuty"** → **Sai**. Security Hub gom và chấm điểm; GuardDuty mới là bên phát hiện. Tắt GuardDuty thì Security Hub không còn finding về threat (§8.1).
7. **"Macie scan EBS"** → **Sai**, Macie chỉ quét S3.
8. **"Detective replace SIEM"** → Đúng một phần. SIEM (security information and event management) là hệ thống gom và đối chiếu log bảo mật từ **mọi nguồn** của doanh nghiệp: firewall on-prem, máy trạm, ứng dụng SaaS. Detective chỉ điều tra trên dữ liệu AWS (CloudTrail, Flow Logs, GuardDuty, EKS), nên đủ cho môi trường thuần AWS nhưng không thay được SIEM khi còn nguồn log ngoài AWS.
9. **"Org trail tự log mọi account mới"** → **Đúng**. Account mới gia nhập Organization tự động nằm trong organization trail, và account thành viên không tắt được nó (§3.2).

---

## 17. Tóm tắt 1 dòng

> Detective = **biết khi nào có chuyện**. Stack: **CloudTrail** (ai làm gì), **Config** (resource trạng thái), **GuardDuty** (threat), **Inspector** (vuln), **Macie** (sensitive data), **Security Hub** (aggregate), **Detective** (investigate), **VPC Flow Logs** (traffic). Centralize ở audit account, alarm chỗ nhạy cảm.

---

## 18. Bài tập tự kiểm tra

1. Production breach. Bạn cần biết: (a) attacker IP, (b) account compromised, (c) bucket bị access, (d) data exfil time. Service nào trả lời từng câu?
2. Compliance PCI-DSS yêu cầu log mọi S3 access. So sánh CloudTrail data event vs S3 access logs — chọn cái nào & vì sao?
3. Org 50 account. Cần đảm bảo mọi account bật CloudTrail multi-region, log đến central bucket, không ai disable được. Plan?
4. EBS volume vô tình public (snapshot share to ALL). Service phát hiện và remediate auto?
5. GuardDuty báo finding `Backdoor:EC2/C&CActivity.B` — instance gọi C2 server. Bước response trong 15 phút đầu?
6. Cost CloudTrail data event $5000/tháng. Bạn analyze gì để giảm mà không mất visibility?

> 💡 Gợi ý cho bài 6, dùng đơn giá ở §3.1:
>
> ```
> $5.000 ÷ $0,10 × 100.000        = 5.000.000.000 data event/tháng
> 5.000.000.000 ÷ 2.592.000 giây  ≈ 1.930 event/giây liên tục
> ```
>
> Con số đó gần như chắc chắn đến từ vài bucket đọc nhiều (ảnh, file tĩnh, bucket chứa log). Tìm chúng bằng cách query log CloudTrail theo `eventSource` và tên bucket. Sau đó dùng **advanced event selectors** để thu hẹp: chỉ ghi các bucket nhạy cảm, chỉ ghi thao tác ghi (`readOnly = false`), loại trừ bucket log. Lấy bucket ở §3.1 làm ví dụ: nếu chỉ 5% request là ghi thì chi phí từ ~$518 còn ~$26/tháng. Bucket nào cần ghi cả lượt đọc nhưng không cần chữ ký toàn vẹn thì chuyển sang S3 server access logs (§11).

---

## 19. Đọc thêm

- AWS Whitepaper — *AWS Security Incident Response Guide*, *Logical Separation*.
- AWS Builder's Library — *Operational excellence*.
- AWS docs — *CloudTrail*, *Config*, *GuardDuty*, *Security Hub* user guides.

---

**Chương 3 hoàn thành.** Tiếp theo: chương 4 — Design Cost-Optimized Architectures.
