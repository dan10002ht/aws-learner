# SAA Ch3.1 — IAM Deep Dive & Identity Federation

> Mục tiêu: Vượt qua mức "tạo user, gán policy" của CLF. Hiểu **policy evaluation logic**, **trust relationship**, **STS**, **federation với SSO/OIDC/SAML**, **permission boundary**, **SCP** — đủ để design IAM cho multi-account org và đọc đề SAA về security không lăn tăn.

Tiền đề: CLF [[03-iam]].

---

## 1. Câu chuyện mở đầu — "Tôi attach AdministratorAccess vì policy phức tạp quá"

Junior dev nhận task: Lambda cần đọc S3 bucket cụ thể. Mất 30 phút loay hoay với policy → bực mình → attach `AdministratorAccess` cho role. Code chạy. PR merged.

3 tháng sau, role này bị compromise qua SSRF. Attacker dùng credential từ instance metadata → list tất cả S3 bucket trong account → exfiltrate 2TB customer data. **Bill: 4 triệu USD + breach notification + lawsuit.**

**Quy tắc 0**: **Least privilege là kỹ năng, không phải checkbox**. Bài này dạy bạn cách viết policy chính xác, không phải attach wide policy "cho nhanh".

---

## 2. 4 loại IAM principal & 4 loại policy

Mọi lời gọi tới AWS (console, CLI, SDK) đều là một **request** gồm ba phần: *ai gọi* (principal), *làm gì* (action, ví dụ `s3:GetObject`), *trên cái gì* (resource, ví dụ một bucket). IAM trả lời đúng một câu hỏi cho mỗi request: **cho hay không cho**. Để trả lời, nó cần biết principal là ai và đọc các policy liên quan. Section này giới thiệu hai nhóm khái niệm đó; cách chúng kết hợp thành quyết định nằm ở §3.

### Principals (ai gọi AWS API?)

**Principal** là danh tính đứng sau một request. Có bốn loại:

- **Root user** là chủ account, đăng nhập bằng email. Nó có toàn quyền và không policy IAM nào trong account giới hạn được, nên chỉ dùng cho vài việc bắt buộc (đổi thông tin thanh toán, đóng account), không dùng hằng ngày.
- **IAM User** là một danh tính cố định trong account, có **credential dài hạn**: mật khẩu console và/hoặc access key không tự hết hạn. Đây là cách làm cũ. Access key lộ ra là dùng được mãi cho tới khi có người phát hiện và xoá.
- **IAM Role** là một danh tính **không có credential riêng**. Ai được phép thì "mượn" role (thuật ngữ là *assume*) và nhận credential tạm, hết hạn sau vài giờ. Service của AWS (EC2, Lambda…) và người dùng đăng nhập từ hệ thống ngoài đều dùng role. Cơ chế ở §4.
- **Federated user** là người hoặc ứng dụng đã được xác thực **ở một hệ thống ngoài AWS** (thư mục nhân viên công ty, Google, GitHub…), sau đó đổi bằng chứng xác thực lấy quyền dùng một role. Chi tiết ở §5.

| Principal | Credential | Ai dùng |
|-----------|-----------|---------|
| **Root** | Dài hạn (email + mật khẩu) | Owner account, không bao giờ dùng cho daily work |
| **IAM User** | Dài hạn (mật khẩu, access key) | Human dùng credentials lâu dài (legacy) |
| **IAM Role** | Tạm thời, cấp qua STS | AWS service (EC2, Lambda…) hoặc federated identity assume tạm thời |
| **Federated user** | Tạm thời, thông qua một role | SSO, SAML, OIDC, Web Identity |

### Policies (luật về quyền)

**Policy** là một tài liệu JSON gồm các *statement*; mỗi statement nói `Effect` (Allow hoặc Deny), `Action`, `Resource`, và tuỳ chọn `Condition`. Điều dễ nhầm nhất: **không phải policy nào cũng cấp quyền**. Chia làm hai nhóm theo việc chúng làm.

**Nhóm cấp quyền** — chỉ hai loại này mới làm một request từ "không được" thành "được":

- **Identity-based policy** gắn vào user, group hoặc role, đọc là *"principal này được làm Y trên Z"*. Đây là loại bạn viết nhiều nhất.
- **Resource-based policy** gắn vào chính resource (S3 bucket policy, SQS queue policy, KMS key policy, trust policy của role…), đọc là *"resource này cho ai làm gì"*. Khác biệt nhận ra ngay: nó có trường `Principal`, còn identity-based thì không (vì principal chính là thứ nó gắn vào).

**Nhóm giới hạn (trần quyền)** — không cấp được gì, chỉ thu hẹp những gì nhóm trên đã cấp:

- **Permission Boundary** gắn vào một user hoặc role cụ thể, đặt trần cho riêng principal đó. Dùng khi admin uỷ quyền cho dev tự tạo role mà vẫn chắc role đó không vượt mức cho phép (§7).
- **SCP (Service Control Policy)** gắn vào OU hoặc account trong AWS Organizations, đặt trần cho **mọi** principal của account đó (§8).
- **Session policy** được truyền kèm lúc gọi `AssumeRole`, đặt trần cho **riêng phiên đó**. Ví dụ role có quyền đọc 50 bucket, nhưng phiên này chỉ truyền session policy cho đọc 1 bucket.

Còn một loại cũ là **ACL** (trên S3 object/bucket), có từ trước khi IAM ra đời. Nó chỉ cấp được vài quyền thô và không có condition, nên AWS khuyên tắt và dùng bucket policy.

| Policy | Attach vào | Cấp quyền hay giới hạn? | Use case |
|--------|-----------|--------------------------|----------|
| **Identity-based** | User, Group, Role | Cấp | Phổ biến nhất: "X được làm Y trên Z" |
| **Resource-based** | S3 bucket, SQS, SNS, KMS, Lambda… | Cấp | "Resource này cho ai làm gì", kể cả principal ở account khác |
| **Permission Boundary** | User/Role | Giới hạn | Trần quyền của một principal, để uỷ quyền tạo role an toàn |
| **SCP (Service Control Policy)** | OU/Account trong Organization | Giới hạn | Trần quyền của cả account |
| **Session policy** | Khi `AssumeRole` | Giới hạn | Thu hẹp quyền của một phiên |
| **ACL** (legacy) | S3 object/bucket | Cấp (thô) | Hạn chế dùng, prefer bucket policy |

Tiêu đề nói "4 loại policy" vì bốn dòng đầu là thứ đề SAA hỏi đi hỏi lại. Session policy và ACL là hai loại phụ, cần nhận ra tên là đủ.

> 💡 Mẹo nhớ: quyền thực tế = (thứ nhóm cấp quyền đã cho) **giao với** (mọi cái trần đang áp lên) **trừ đi** (mọi thứ bị Deny tường minh). §3 biến câu này thành trình tự cụ thể.

---

## 3. Policy evaluation logic — quan trọng nhất bài này

Một request có thể bị chi phối bởi năm sáu policy cùng lúc. *Policy evaluation logic* là quy trình AWS dùng để gộp tất cả thành một quyết định duy nhất. Hiểu quy trình này thì mọi câu hỏi "user có làm được X không?" đều trả lời được bằng cách đi từng bước.

### 3.1 Ba từ phải phân biệt

- **Explicit allow**: có một statement `"Effect": "Allow"` khớp với request.
- **Explicit deny**: có một statement `"Effect": "Deny"` khớp với request. Ai đó đã chủ động viết ra lệnh cấm.
- **Implicit deny** (từ chối ngầm): **không có statement nào nhắc tới** request này, nên nó bị từ chối theo mặc định. Không ai cấm, chỉ là chưa ai cho.

Hai loại deny khác nhau ở chỗ **có cứu được không**. Implicit deny biến mất ngay khi bạn thêm một Allow đúng chỗ. Explicit deny thì không Allow nào gỡ được, kể cả `AdministratorAccess`; muốn hết bị chặn phải sửa hoặc xoá chính statement Deny đó.

### 3.2 Trình tự đánh giá khi caller và resource cùng account

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 520" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Luồng đánh giá policy của IAM — explicit DENY luôn thắng</title>
  <desc>Trình tự đánh giá một request: bắt đầu từ default DENY, qua SCP deny, resource-based allow, identity allow, permission boundary, session policy rồi ALLOW. Bất kỳ tầng nào có explicit DENY đều rẽ thẳng sang kết quả DENY.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Policy evaluation logic — request s3:GetObject</text>
  <defs>
    <marker id="peArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
  <rect x="40" y="40" width="360" height="38" rx="9" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="220" y="64" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">0. Mặc định DENY (chưa có allow nào)</text>
  <line x1="220" y1="78" x2="220" y2="96" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#peArr)"/>
  <rect x="40" y="98" width="360" height="40" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="220" y="123" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">1. SCP có deny? (kể cả admin)</text>
  <line x1="220" y1="138" x2="220" y2="156" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#peArr)"/>
  <rect x="40" y="158" width="360" height="40" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="220" y="183" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">2. Resource policy allow explicit? → ALLOW</text>
  <line x1="220" y1="198" x2="220" y2="216" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#peArr)"/>
  <rect x="40" y="218" width="360" height="40" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="220" y="243" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">3. Identity policy có allow? Không → DENY</text>
  <line x1="220" y1="258" x2="220" y2="276" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#peArr)"/>
  <rect x="40" y="278" width="360" height="40" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="220" y="303" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">4. Permission Boundary có allow? Không → DENY</text>
  <line x1="220" y1="318" x2="220" y2="336" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#peArr)"/>
  <rect x="40" y="338" width="360" height="40" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="220" y="363" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">5. Session policy có allow? Không → DENY</text>
  <line x1="220" y1="378" x2="220" y2="396" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#peArr)"/>
  <rect x="100" y="398" width="240" height="42" rx="11" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="220" y="424" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">✓ ALLOW</text>
  <rect x="470" y="200" width="210" height="64" rx="12" fill="#ef4444" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="575" y="228" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">✗ DENY</text>
  <text x="575" y="248" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">explicit DENY luôn thắng</text>
  <g stroke="currentColor" stroke-opacity="0.45" stroke-dasharray="5 3" fill="none">
    <path d="M400 118 H575 V200" marker-end="url(#peArr)"/>
    <path d="M400 238 H470" marker-end="url(#peArr)"/>
    <path d="M400 298 C440 298 575 290 575 264" marker-end="url(#peArr)"/>
    <path d="M400 358 C440 358 595 300 595 264" marker-end="url(#peArr)"/>
  </g>
  <text x="412" y="112" font-size="10" font-weight="700" fill="#ef4444" opacity="0.95">DENY</text>
  <text x="412" y="232" font-size="10" font-weight="700" fill="#ef4444" opacity="0.95">DENY</text>
</svg>

Sơ đồ trên là bản rút gọn để nhớ hướng đi. Trình tự đầy đủ theo tài liệu AWS như sau, với một request `s3:GetObject`:

```
0. Xuất phát: DENY (implicit) — chưa có gì cho phép.

1. Quét MỌI policy áp lên request (SCP, resource-based, identity-based,
   boundary, session) để tìm explicit Deny.
   Thấy dù chỉ một cái → DENY, dừng luôn.

2. Account thuộc Organization? Xét SCP: phải có Allow cho action này.
   Không có → DENY (implicit, do trần SCP).

3. Resource-based policy có Allow cho principal này?
   Có → trong nhiều trường hợp ALLOW luôn (xem ghi chú bên dưới).

4. Identity-based policy có Allow? Không → DENY (implicit).

5. Principal có Permission Boundary? Boundary phải Allow. Không → DENY.

6. Phiên có session policy? Session policy phải Allow. Không → DENY.

7. → ALLOW
```

Vì sao lại theo thứ tự này:

- **Bước 1 đứng đầu** vì explicit deny là công cụ để đặt lệnh cấm chắc chắn. Nếu một Allow ở đâu đó có thể đè lên Deny thì không ai dám tin vào Deny nữa. Vì vậy AWS quét Deny trước mọi thứ khác.
- **Bước 2, 5, 6 là ba cái trần.** Chúng không cấp gì cả. Nếu trần không chứa action thì request rơi ngay tại đó, dù identity policy có Allow.
- **Bước 3 và 4 là hai nguồn cấp quyền.** Trong cùng một account, **chỉ cần một trong hai** có Allow.

Bảng tóm tắt cho trường hợp cùng account (giả sử không có SCP, boundary hay session policy):

| Identity policy của caller | Resource policy | Kết quả | Lý do |
|----------------------------|-----------------|---------|-------|
| Allow | không nhắc tới | **ALLOW** | Một nguồn cấp là đủ |
| không nhắc tới | Allow đích danh caller | **ALLOW** | Một nguồn cấp là đủ |
| không nhắc tới | không nhắc tới | **DENY** | Implicit deny |
| Allow (kể cả admin) | **Deny** | **DENY** | Explicit deny thắng |

> 📏 Ghi chú cho bước 3 — đủ dùng cho đề thi là câu "cùng account thì identity **hoặc** resource policy Allow là được". Chi tiết chính xác hơn: resource policy Allow đích danh một **IAM user** thì không bị permission boundary của user đó chặn. Nếu Allow ghi **ARN của role** thì boundary và session policy của role vẫn áp dụng như thường. Có hai ngoại lệ mà Allow ở identity policy một mình không đủ dù cùng account: **trust policy của role** (phải nêu principal hoặc account được assume) và **KMS key policy** (key policy phải cho phép thì IAM policy mới có tác dụng, xem bài ch3-03).

> 📏 Nếu Organization bật **RCP** (Resource Control Policy), nó được xét ngay trước SCP ở bước 2. RCP là cái trần đặt lên *resource* của account, còn SCP là trần đặt lên *principal* của account. Chi tiết ở [[ch3-05-multi-account-governance]].

> 🪤 Bẫy thi: đề hay sắp bước "explicit DENY" xuống cuối để bạn tưởng deny được xét sau khi đã ALLOW. Thực tế **explicit DENY được đánh giá và thắng trước** — không tầng allow nào cứu được.

### 3.3 Khi caller và resource khác account

Cross-account nghĩa là principal thuộc account A gọi tới resource thuộc account B. Luật đổi một chữ: từ "một trong hai" thành **"cả hai"**.

- Bên B (chủ resource) phải có **resource-based policy** Allow cho account A hoặc một principal của A.
- Bên A (chủ principal) phải có **identity-based policy** Allow cho principal đó thực hiện action trên resource của B.

Nguyên nhân gốc: mỗi account là một vùng quản trị riêng, và **không bên nào được quyết định thay bên kia**. Admin của B không có quyền cấp quyền cho user của A, vì user đó do A quản. Admin của A không có quyền mở resource của B. Nên AWS chạy quy trình đánh giá hai lần, một lần trong mỗi account, và request chỉ qua khi cả hai lần đều ra Allow.

| Identity policy bên A | Resource policy bên B | Kết quả |
|-----------------------|-----------------------|---------|
| Allow | Allow | **ALLOW** |
| Allow | không nhắc tới | **DENY** — B chưa mở cửa |
| không nhắc tới | Allow | **DENY** — A chưa cho người của mình đi |

Dòng cuối là chỗ đề thi hay gài: bucket policy của B đã Allow account A, nhưng user trong A chưa có quyền S3 nào, vậy vẫn bị từ chối.

Còn một con đường khác để đi cross-account là **assume một role nằm sẵn trong account B**. Khi đó principal "trở thành" người của B và mọi thứ quay về luật cùng account. Hai cách được so sánh ở §6.

### Quy tắc vàng (nhớ thuộc lòng)

1. **Explicit DENY luôn thắng**. Nếu có DENY ở bất kỳ tầng nào thì request fail, và không Allow nào cứu được.
2. **Default là DENY** (implicit deny). Không có policy nào Allow thì bị từ chối.
3. **Cùng account**: identity-based **hoặc** resource-based Allow là đủ. **Cross-account**: cần Allow ở **cả** identity-based (account A) **và** resource-based (account B).
4. **SCP, Permission Boundary và session policy là TRẦN**, không cấp quyền. Bạn vẫn cần identity policy hoặc resource policy để có quyền.
5. **Resource-based policy cho phép cross-account mà không cần assume role**: principal của A giữ nguyên danh tính của mình và gọi thẳng resource của B. Thứ được miễn là bước assume role, **không phải** identity policy bên A. Quy tắc 3 vẫn áp dụng.

### Ví dụ tricky

User A có `AdministratorAccess`. Bucket policy có:
```json
{ "Effect": "Deny", "Principal": "*", "Action": "s3:*", "Resource": "arn:aws:s3:::secret/*" }
```
→ A có **đọc được** `secret/*` không? **Không.** Explicit deny ở resource thắng admin.

Đi từng bước theo §3.2 để thấy vì sao: ở bước 1, AWS quét mọi policy liên quan tới request và gặp statement Deny trong bucket policy. `Principal: "*"` khớp với A, `s3:*` khớp với `s3:GetObject`, resource khớp. Quyết định là DENY và quy trình dừng ở đó. `AdministratorAccess` nằm ở bước 4 nên không bao giờ được xét tới.

Thêm một ví dụ có trần: role `app-role` gắn `AmazonS3FullAccess`, và có permission boundary chỉ Allow `s3:GetObject`, `s3:ListBucket`. Role gọi `s3:DeleteObject`. Không có Deny nào (qua bước 1), identity policy Allow (qua bước 4), nhưng boundary không chứa `s3:DeleteObject` nên rơi ở bước 5. Kết quả DENY, loại implicit. Muốn role xoá được object thì phải nới boundary, thêm policy vào role không giải quyết được gì.

---

## 4. STS & AssumeRole — cốt lõi mọi kiến trúc IAM modern

### 4.1 STS (Security Token Service)

**STS** là dịch vụ phát **credential tạm thời**. Đầu ra của nó luôn là một bộ ba: `AccessKeyId`, `SecretAccessKey` và `SessionToken`, kèm thời điểm hết hạn. Access key dài hạn của IAM user chỉ có hai phần đầu. `SessionToken` là phần thêm vào để AWS biết bộ key này thuộc phiên nào và còn hạn hay không; thiếu nó thì hai phần kia vô dụng. Mẹo nhận diện khi đọc log: access key tạm bắt đầu bằng `ASIA`, access key dài hạn bắt đầu bằng `AKIA`.

Role không có mật khẩu hay access key của riêng nó, nên **mọi lần dùng role đều đi qua STS**: EC2 lấy quyền của instance role, Lambda chạy bằng execution role, nhân viên đăng nhập qua SSO, tất cả đều là STS phát credential tạm ở phía sau.

**Vì sao credential tạm an toàn hơn?** Không phải vì nó khó bị lộ hơn, mà vì lộ ra thì thiệt hại có giới hạn thời gian và không ai phải đi thu hồi.

```
Access key dài hạn bị lộ ngày 1, phát hiện ngày 90:
  kẻ tấn công dùng được 90 ngày × 24 = 2.160 giờ, và còn tiếp nếu chưa ai xoá key.

Credential tạm (phiên 1 giờ) bị lộ:
  dùng được tối đa 1 giờ rồi tự vô hiệu. Cửa sổ rủi ro nhỏ hơn 2.160 lần.
```

Ngoài ra credential tạm không cần lưu vào đâu cả. Không có file `.env`, không có secret trong CI, không có lịch xoay key 90 ngày. SDK tự xin bộ mới trước khi bộ cũ hết hạn.

Nói cho đúng với câu chuyện ở §1: credential tạm **không ngăn** được việc bị lấy cắp (kẻ tấn công ở đó lấy chính credential tạm qua SSRF và có thể lấy lại bộ mới chừng nào lỗ hổng còn). Thứ giới hạn thiệt hại trong tình huống đó là least privilege trên role. Hai thứ bổ sung cho nhau: credential tạm thu hẹp *thời gian*, least privilege thu hẹp *phạm vi*.

**Ai quyết định thời hạn?** Có hai nấc, và nấc thấp hơn thắng:

| Nấc | Ai đặt | Giá trị |
|-----|--------|---------|
| *Maximum session duration* của role | Admin của role | 1 giờ (mặc định) tới 12 giờ |
| `DurationSeconds` trong lời gọi `AssumeRole` | Bên gọi | 15 phút tới mức trần ở dòng trên; không truyền thì là 1 giờ |

Bên gọi xin 12 giờ trong khi admin đặt trần 6 giờ thì lời gọi **thất bại**, STS không tự hạ xuống. Một ngoại lệ đáng nhớ là **role chaining**: dùng credential của role này để assume tiếp role khác thì phiên thứ hai tối đa 1 giờ, bất kể role đó đặt trần bao nhiêu.

Con số "15 phút tới 12 giờ" mà đề thi hay nhắc chính là khoảng này.

### 4.2 AssumeRole flow

`AssumeRole` là lời gọi STS dùng để "mượn" một role. Bốn bước:

1. Principal A (user/role) gọi `sts:AssumeRole` với **Role ARN** của Role R, kèm một tên phiên (*role session name*) tự đặt.
2. Role R có **Trust Policy** quyết định ai được assume. STS đọc policy đó để xem A có trong danh sách không.
3. Nếu trust policy allow A + A có `sts:AssumeRole` permission → STS trả credential tạm.
4. A dùng credential này gọi AWS API. Trong suốt phiên, A **có quyền của R và chỉ của R**; quyền gốc của A tạm gác lại cho tới khi A quay về dùng credential của chính mình.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Luồng AssumeRole theo thời gian — Principal A nhận temporary credentials từ STS</title>
  <desc>Sơ đồ tuần tự ba cột: Principal A, STS, và Role R. A gọi sts:AssumeRole với Role ARN; STS kiểm tra Trust Policy của Role R xem ai được assume; nếu hợp lệ STS trả temporary credentials cho A; A dùng credential này gọi AWS API với danh nghĩa Role R. Thời gian đi từ trên xuống.</desc>
  <text x="16" y="22" font-size="14" font-weight="700" fill="currentColor">AssumeRole flow — thời gian đi xuống</text>
  <defs>
    <marker id="arSeq" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <rect x="40" y="38" width="150" height="40" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="115" y="63" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Principal A</text>
  <rect x="295" y="38" width="130" height="40" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="63" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">STS</text>
  <rect x="540" y="38" width="150" height="40" rx="9" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="615" y="58" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Role R</text>
  <text x="615" y="73" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">+ Trust Policy</text>
  <g stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="4 4">
    <line x1="115" y1="78" x2="115" y2="340"/>
    <line x1="360" y1="78" x2="360" y2="340"/>
    <line x1="615" y1="78" x2="615" y2="340"/>
  </g>
  <line x1="115" y1="108" x2="358" y2="108" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#arSeq)"/>
  <text x="118" y="102" font-size="11" fill="currentColor">1. sts:AssumeRole (Role R ARN)</text>
  <line x1="360" y1="150" x2="613" y2="150" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#arSeq)"/>
  <text x="365" y="144" font-size="11" fill="currentColor">2. Trust Policy cho phép A?</text>
  <line x1="615" y1="192" x2="362" y2="192" stroke="currentColor" stroke-opacity="0.6" stroke-dasharray="5 3" marker-end="url(#arSeq)"/>
  <text x="372" y="186" font-size="11" fill="currentColor">OK — A được assume</text>
  <line x1="358" y1="234" x2="117" y2="234" stroke="currentColor" stroke-opacity="0.6" stroke-dasharray="5 3" marker-end="url(#arSeq)"/>
  <text x="120" y="228" font-size="11" fill="currentColor">3. temporary credentials</text>
  <rect x="40" y="262" width="150" height="56" rx="9" fill="#3b82f6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="115" y="284" font-size="10.5" text-anchor="middle" fill="currentColor">A cầm cred</text>
  <text x="115" y="300" font-size="10.5" text-anchor="middle" fill="currentColor">tạm thời của R</text>
  <line x1="190" y1="290" x2="613" y2="290" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#arSeq)"/>
  <text x="210" y="284" font-size="11" fill="currentColor">4. gọi AWS API với danh nghĩa Role R</text>
</svg>

Bước 3 có hai điều kiện, và nó chính là luật ở §3 áp vào trường hợp này, vì trust policy là một resource-based policy gắn trên role:

- **A và R khác account:** cần **cả hai**. Trust policy của R phải nêu account A (hoặc principal cụ thể của A), và identity policy của A phải Allow `sts:AssumeRole` trên ARN của R.
- **A và R cùng account:** trust policy nêu đích danh A là đủ. Nếu trust policy chỉ nêu account (`:root`) thì A cần thêm identity policy Allow `sts:AssumeRole`.

Mọi lời gọi `AssumeRole` đều được ghi vào CloudTrail kèm danh tính gốc của A và tên phiên. Sau đó mỗi API call trong phiên mang ARN dạng `arn:aws:sts::<account>:assumed-role/R/<tên-phiên>`. Nhờ vậy dù 50 người cùng dùng một role, log vẫn chỉ ra được ai làm gì.

### 4.3 Trust policy vs Permission policy

Một role luôn có **hai** policy trả lời hai câu hỏi khác nhau, và người mới hay nhầm chúng với nhau:

- **Trust policy** trả lời *"ai được mượn role này?"*. Nó là resource-based policy (có trường `Principal`), và mỗi role có đúng một cái.
- **Permission policy** trả lời *"mượn được rồi thì làm được gì?"*. Nó là identity-based policy (không có `Principal`), và một role gắn được nhiều cái.

```json
// Trust policy (gắn trên Role) — ai được assume
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "ec2.amazonaws.com" },  // EC2 service được assume
    "Action": "sts:AssumeRole"
  }]
}

// Permission policy (cũng gắn trên Role) — role làm được gì
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::my-bucket/*"
  }]
}
```

Đọc hai policy trên: dịch vụ EC2 được mượn role, và ai mượn được thì chỉ đọc được object trong `my-bucket`. Sai một trong hai thì triệu chứng khác nhau. Trust policy sai thì lỗi xảy ra ngay lúc assume (`AccessDenied` trên `sts:AssumeRole`). Permission policy sai thì assume thành công nhưng lời gọi S3 sau đó bị từ chối.

Với EC2, role được gắn vào instance qua một lớp vỏ gọi là **instance profile**. Ứng dụng trên instance không tự gọi `AssumeRole`: dịch vụ EC2 làm việc đó, đặt credential tạm vào *instance metadata* (địa chỉ nội bộ `169.254.169.254`), và SDK tự đọc từ đó rồi tự lấy bộ mới khi sắp hết hạn. Đây là lý do code chạy trên EC2 không cần cấu hình access key nào.

### 4.4 Use cases

Trường `Principal` trong trust policy thay đổi tuỳ theo ai sẽ mượn role:

| Use case | Trust principal |
|----------|-----------------|
| EC2 instance profile | `ec2.amazonaws.com` |
| Lambda execution role | `lambda.amazonaws.com` |
| Cross-account access | `arn:aws:iam::<account>:root` hoặc principal cụ thể |
| Federated user | `cognito-identity.amazonaws.com`, IdP ARN cho SAML |
| Service role (AWS managed) | Service-specific principal |

Hai điểm hay gây hiểu nhầm trong bảng:

- `arn:aws:iam::<account>:root` trong trust policy **không có nghĩa là root user**. Nó nghĩa là "cả account đó": bạn tin account đó và để admin của họ quyết định user/role nào bên họ được assume (bằng identity policy bên họ). Muốn chặt hơn thì ghi ARN của một role cụ thể.
- Khi bên được tin là **bên thứ ba** (một SaaS giám sát, công cụ quản lý chi phí…), thêm điều kiện `sts:ExternalId`. Lý do: nhà cung cấp dùng cùng một account AWS của họ để assume role của hàng nghìn khách hàng. Nếu không có gì phân biệt, một khách hàng xấu có thể khai ARN role **của bạn** trong cấu hình của họ và khiến nhà cung cấp đọc dữ liệu của bạn giùm họ. Kiểu tấn công này gọi là *confused deputy*. External ID là một chuỗi riêng cho từng khách hàng mà nhà cung cấp phải gửi kèm khi assume; trust policy của bạn chỉ chấp nhận đúng chuỗi của bạn.

### 4.5 AssumeRole variants

STS có vài lời gọi khác nhau, phân biệt bởi **thứ bạn đưa ra để chứng minh mình là ai**:

- **AssumeRole**: bạn đã có sẵn credential AWS (của user hoặc của một role khác) và dùng nó để ký request. Dùng cho cross-account và same-account role.
- **AssumeRoleWithSAML**: bạn đưa ra một *SAML assertion* do hệ thống đăng nhập của công ty cấp (AD FS, Okta…). Chưa cần có credential AWS nào. Xem §5.2.
- **AssumeRoleWithWebIdentity**: bạn đưa ra một *token OIDC* (một JWT) do Cognito, Google, GitHub Actions, hay cluster EKS cấp. Cũng không cần credential AWS. Xem §5.3, §5.5 và §5.7.
- **GetSessionToken**: IAM user đổi access key dài hạn lấy credential tạm **của chính user đó**, thường kèm mã MFA. Không đổi sang role nào. Dùng cho MFA-protected operation: policy đặt điều kiện `aws:MultiFactorAuthPresent` và chỉ credential lấy bằng cách này mới thoả.

| Lời gọi | Bằng chứng đưa ra | Kết quả | Thời hạn |
|---------|-------------------|---------|----------|
| `AssumeRole` | Credential AWS sẵn có | Quyền của role | 15 phút tới trần của role (tối đa 12 giờ), mặc định 1 giờ |
| `AssumeRoleWithSAML` | SAML assertion | Quyền của role | Như trên |
| `AssumeRoleWithWebIdentity` | Token OIDC (JWT) | Quyền của role | Như trên |
| `GetSessionToken` | Access key của IAM user (+ MFA) | Quyền của chính user | 15 phút tới 36 giờ, mặc định 12 giờ |

> 🪤 Bẫy thi: thấy "corporate directory / Active Directory / SAML 2.0" thì nghĩ tới `AssumeRoleWithSAML` hoặc IAM Identity Center. Thấy "mobile app, đăng nhập bằng Google/Facebook" thì là web identity, mà đáp án đúng thường là **Cognito** (bọc `AssumeRoleWithWebIdentity` bên trong). Thấy "yêu cầu MFA trước khi gọi API nhạy cảm" với IAM user thì là `GetSessionToken`.

---

## 5. Federation patterns

**Federation** (liên kết danh tính) nghĩa là: người dùng được xác thực **ở một hệ thống ngoài AWS**, và AWS **tin** kết quả đó thay vì tự giữ username/mật khẩu. Lợi ích dễ thấy nhất: công ty 500 nhân viên không phải tạo 500 IAM user. Nhân viên nghỉ việc, IT khoá tài khoản ở thư mục công ty là quyền vào AWS mất theo.

Bốn thuật ngữ dùng suốt section này:

- **IdP (Identity Provider)**: hệ thống giữ danh sách người dùng và làm việc xác thực (kiểm tra mật khẩu, MFA). Ví dụ: Microsoft Entra ID (tên cũ Azure AD), Okta, AD FS, Google.
- **SAML 2.0**: một chuẩn để IdP báo cho hệ thống khác biết "người này đã đăng nhập, họ là ai, thuộc nhóm nào". Thông điệp đó là một tài liệu XML có chữ ký số của IdP, gọi là **SAML assertion**. SAML phổ biến trong doanh nghiệp, cho người đăng nhập bằng trình duyệt.
- **OIDC (OpenID Connect)**: chuẩn mới hơn làm cùng việc đó, nhưng thông điệp là một **JWT** (JSON Web Token), tức một chuỗi JSON nhỏ có chữ ký số. Web, mobile app và máy móc (CI/CD, pod Kubernetes) thường dùng OIDC.
- **Trust giữa AWS và IdP**: AWS kiểm tra chữ ký trên assertion hoặc token bằng khoá công khai của IdP. Bạn khai báo IdP với AWS một lần; sau đó AWS chấp nhận mọi assertion/token mang đúng chữ ký ấy.

Mọi pattern bên dưới đều có chung một dạng: *xác thực ở IdP, mang bằng chứng tới STS, nhận credential tạm của một role*. Chúng chỉ khác nhau ở chỗ IdP là gì và ai đứng ra làm trung gian.

### 5.1 IAM Identity Center (IdC, ex-AWS SSO)

**Nó giải quyết bài toán gì.** Công ty có 20 account AWS và 200 nhân viên. Bạn muốn mỗi người đăng nhập **một lần** vào một trang, thấy danh sách các account và vai trò mình được dùng, bấm vào là vào console hoặc lấy credential cho CLI. IAM Identity Center làm đúng việc đó, và là cách AWS khuyến nghị cho mọi tổ chức nhiều account.

**Ba mảnh ghép:**

- **Identity source** là nơi chứa user và group. Chọn một trong ba: thư mục có sẵn của Identity Center (tự tạo user trong đó), **Active Directory** (qua Managed Microsoft AD hoặc AD Connector, xem §5.6), hoặc một **IdP ngoài** như Entra ID/Azure AD, Okta (kết nối bằng SAML).
- **Permission set** là một **khuôn mẫu quyền**: một tập policy kèm thời hạn phiên. Ví dụ permission set `ReadOnly` chứa policy `ReadOnlyAccess`. Bản thân nó chưa phải role.
- **Assignment** là phép gán ba chiều: *group nào* nhận *permission set nào* ở *account nào*.

**Cơ chế phía sau.** Khi bạn gán một permission set vào một account, Identity Center **tự tạo một IAM role trong account đó** (tên bắt đầu bằng `AWSReservedSSO_`), gắn các policy của permission set vào, và đặt trust policy để chỉ người được gán mới assume được. Sửa permission set thì role ở mọi account được cập nhật theo. Khi nhân viên bấm vào một account trong cổng đăng nhập, Identity Center lấy credential tạm của role tương ứng cho họ.

```
3 permission set (Admin, Developer, ReadOnly) × 20 account = 60 IAM role

Tự làm bằng tay: tạo và giữ đồng bộ 60 role + 60 trust policy.
Identity Center: định nghĩa 3 permission set, còn lại nó tự sinh và tự cập nhật.
```

Thời hạn phiên của permission set mặc định 1 giờ, đặt được tối đa 12 giờ.

**Điều kiện:** Identity Center dựa trên AWS Organizations để nhìn thấy danh sách account. Nó dành cho **nhân viên** (workforce). Người dùng cuối của ứng dụng bạn viết thì dùng Cognito (§5.3).

> 🪤 Bẫy thi: "nhân viên dùng tài khoản công ty sẵn có để truy cập **nhiều account** AWS, quản lý quyền tập trung" → **IAM Identity Center**. Đáp án "tạo IAM user ở từng account" luôn sai.

### 5.2 SAML 2.0 federation (legacy / hybrid)

Đây là cách federation trực tiếp giữa một IdP và **một account** AWS, có từ trước khi Identity Center ra đời. Identity Center thực chất tự động hoá chính quy trình này cho nhiều account.

**Thiết lập một lần:** trong IAM của account, tạo một *SAML identity provider* (nạp file metadata chứa khoá công khai của IdP). Tạo các role có trust policy tin identity provider đó với action `sts:AssumeRoleWithSAML`. Bên IdP, cấu hình group nào ứng với role nào.

**Luồng mỗi lần đăng nhập:**

1. Nhân viên mở cổng đăng nhập của công ty (AD FS, Okta) và đăng nhập bằng tài khoản công ty. AWS không tham gia bước này và không bao giờ thấy mật khẩu.
2. IdP tạo một **SAML assertion** đã ký, trong đó ghi người dùng là ai và **được dùng role nào** (ARN của role).
3. Trình duyệt chuyển assertion tới AWS. AWS kiểm tra chữ ký bằng khoá công khai đã nạp.
4. STS thực hiện `AssumeRoleWithSAML` và trả credential tạm của role ghi trong assertion.
5. Nhân viên vào console (hoặc CLI dùng credential tạm đó).

**So với Identity Center:**

| | SAML federation trực tiếp | IAM Identity Center |
|--|---------------------------|---------------------|
| Phạm vi | Từng account một | Cả Organization |
| Ai tạo role và trust policy | Bạn, ở từng account | Identity Center tự sinh từ permission set |
| 20 account, 3 vai trò | 20 identity provider + 60 role tự quản | 3 permission set |
| Khi nào còn dùng | Hệ thống có sẵn từ trước, account đứng riêng lẻ không thuộc Organization | Mặc định cho thiết lập mới |

Setup phức tạp hơn IdC nhưng nhiều enterprise đã có sẵn, nên đề thi vẫn hỏi.

### 5.3 Cognito (user-facing app)

Cognito có **2 thành phần tách biệt** — đây là điểm SAA hay đánh tráo. Nhớ: **User Pool = "bạn là ai" (authentication), Identity Pool = "bạn được cầm AWS credential gì" (authorization/credential vending)**.

| | **User Pool** | **Identity Pool** (Federated Identities) |
|--|---------------|------------------------------------------|
| Trả lời câu hỏi | **Authentication** — "bạn là ai?" | **Authorization / credential vending** — "cho bạn quyền AWS nào?" |
| Chức năng | Directory cho app users: sign-up / sign-in, MFA, verify email/phone, hosted UI | Đổi token (đã xác thực) lấy **AWS credential tạm** để gọi AWS service trực tiếp |
| Nguồn identity | Bản thân là IdP; hoặc federate social (Google, Apple, Facebook) / SAML / OIDC | Nhận token từ User Pool **hoặc** IdP ngoài (Google, SAML, OIDC…) |
| Kết quả trả về | **JWT** (ID token + Access token + Refresh token) | **AWS credential tạm** (Access Key + Secret + Session Token) qua **STS** |
| Gọi được gì | Chỉ chứng minh danh tính; muốn gọi AWS phải qua Identity Pool | Gọi thẳng S3 / DynamoDB / các AWS API theo IAM role |

**Luồng token → AWS credential (mobile/web app):**

1. User đăng nhập vào **User Pool** (hoặc IdP ngoài) → nhận **JWT (ID token)**.
2. App gửi JWT cho **Identity Pool** (`GetId` + `GetCredentialsForIdentity`).
3. Identity Pool đổi token, gọi **STS AssumeRoleWithWebIdentity** → trả **AWS credential tạm** gắn với một **authenticated role**.
4. App dùng credential đó gọi thẳng **S3 / DynamoDB** — không qua backend server.

**Use case kinh điển: mobile app upload thẳng S3 = Identity Pool.** Người dùng sign-in (User Pool) → Identity Pool vend credential map vào IAM role chỉ cho `s3:PutObject` vào prefix riêng của user (dùng biến policy `${cognito-identity.amazonaws.com:sub}` để mỗi user chỉ ghi vào folder của mình). App upload trực tiếp, không cần EC2/Lambda làm proxy.

- **Unauthenticated identity**: Identity Pool có thể cấp credential cho **khách chưa đăng nhập** (guest), map vào một *unauthenticated role* quyền tối thiểu — vd cho phép đọc catalog công khai, ghi analytics trước khi user tạo tài khoản. Tắt được nếu không cần.

> 🪤 Bẫy thi: "app cần gọi AWS service trực tiếp / upload S3 từ mobile" → đáp án có **Identity Pool** (vending credential qua STS). Nếu chỉ hỏi "quản lý sign-up/sign-in, MFA, social login" → đó là **User Pool**. Nhìn thấy "AWS credential tạm cho client" = Identity Pool, không phải User Pool.

### 5.4 IAM Roles Anywhere

**Bài toán.** Một server trong data center của công ty (không phải EC2) cần gọi S3. Cách cũ là tạo IAM user, lấy access key rồi đặt vào file cấu hình trên server: một credential dài hạn nằm ngoài AWS, đúng thứ cần tránh. EC2 thoát được vấn đề này nhờ instance profile, còn server on-prem thì không có gì tương đương, cho tới khi có Roles Anywhere.

**Ý tưởng.** Server on-prem thường đã có sẵn một **chứng chỉ X.509** (loại chứng chỉ dùng cho TLS) do **CA** nội bộ của công ty cấp. CA (Certificate Authority) là hệ thống ký và phát hành chứng chỉ. Roles Anywhere cho phép dùng chính chứng chỉ đó làm bằng chứng danh tính để đổi lấy credential tạm của một role.

**Ba thứ cần khai báo:**

- **Trust anchor**: đăng ký CA của bạn (hoặc một CA tạo bằng AWS Private CA) với Roles Anywhere. Từ đó AWS tin các chứng chỉ do CA này ký.
- **Role**: trust policy tin service principal `rolesanywhere.amazonaws.com`. Nên thêm điều kiện giới hạn theo trust anchor và theo thông tin trong chứng chỉ, nếu không thì mọi chứng chỉ do CA đó cấp đều assume được role.
- **Profile**: liệt kê những role nào được cấp qua đường này, và có thể kèm session policy để thu hẹp thêm.

**Lúc chạy:** một công cụ nhỏ của AWS trên server (credential helper) dùng private key của chứng chỉ để ký một request gửi tới Roles Anywhere. Dịch vụ kiểm tra chứng chỉ có đúng do CA đã đăng ký cấp không, rồi trả credential tạm của role. SDK gọi công cụ này tự động mỗi khi cần bộ mới.

> 🪤 Bẫy thi: "workload **ngoài AWS** (on-prem, cloud khác) cần gọi AWS mà không lưu access key dài hạn" → **IAM Roles Anywhere**. Nếu workload ở trên EC2/Lambda/ECS thì chỉ cần role thường.

### 5.5 EKS IRSA / Pod Identity

**Bài toán.** Trong Kubernetes, **pod** là đơn vị chạy nhỏ nhất (một hoặc vài container), và nhiều pod của nhiều ứng dụng chạy chung trên một **node** (một EC2 instance). Nếu gắn quyền vào instance role của node thì **mọi pod trên node đó có cùng quyền**: pod báo cáo cần đọc S3, pod thanh toán cần ghi DynamoDB, và cả hai đều có cả hai quyền. Cần một cách cấp role **cho từng pod**.

Kubernetes có sẵn khái niệm **service account**: danh tính mà một pod chạy dưới tên đó. Cả hai cơ chế dưới đây đều gắn một IAM role vào một service account, nên chỉ pod dùng service account đó mới nhận được quyền.

**IRSA (IAM Roles for Service Accounts)** dựa trên OIDC, hoạt động như sau:

1. Mỗi cluster EKS tự là một **OIDC issuer**: nó ký được JWT và công bố khoá công khai ở một URL riêng của cluster. Bạn đăng ký URL đó làm *OIDC identity provider* trong IAM, một lần cho mỗi cluster.
2. Tạo IAM role có trust policy tin provider đó, với điều kiện ghi đúng namespace và tên service account.
3. Ghi ARN của role vào service account bằng annotation `eks.amazonaws.com/role-arn`.
4. Khi pod khởi động, EKS đặt vào pod một JWT do cluster ký, trong đó ghi pod thuộc service account nào. SDK trong pod mang JWT đó gọi `AssumeRoleWithWebIdentity` và nhận credential tạm.

```json
// Trust policy của role dùng cho IRSA
{
  "Effect": "Allow",
  "Principal": { "Federated": "arn:aws:iam::111122223333:oidc-provider/oidc.eks.ap-southeast-1.amazonaws.com/id/EXAMPLE1234" },
  "Action": "sts:AssumeRoleWithWebIdentity",
  "Condition": { "StringEquals": {
    "oidc.eks.ap-southeast-1.amazonaws.com/id/EXAMPLE1234:sub": "system:serviceaccount:payments:orders-api"
  }}
}
```

Dòng `sub` là thứ khoá role vào đúng một service account: chỉ pod chạy dưới service account `orders-api` trong namespace `payments` mới assume được.

**EKS Pod Identity** (2023+) làm cùng việc đó nhưng bỏ phần OIDC. "Đơn giản hơn" ở ba điểm cụ thể:

| | **IRSA** | **Pod Identity** |
|--|----------|------------------|
| Chuẩn bị cho mỗi cluster | Tạo OIDC identity provider trong IAM | Cài add-on *Pod Identity Agent* (chạy trên mỗi node) |
| Trust policy của role | Chứa URL OIDC **riêng của từng cluster** + tên service account | Một principal cố định `pods.eks.amazonaws.com`, giống nhau ở mọi cluster |
| Nơi khai báo role gắn với service account nào | Annotation trong Kubernetes + điều kiện trong trust policy | Một *association* tạo qua EKS API |
| Dùng lại role cho cluster thứ hai | Phải sửa trust policy, thêm URL OIDC mới | Không sửa gì ở IAM, chỉ tạo thêm association |
| Chạy được ở đâu | EC2 node và Fargate | Chỉ pod Linux trên EC2 node (không hỗ trợ Fargate, Windows) |

Cả hai đều kết thúc giống nhau: pod nhận credential tạm tự động qua SDK, code ứng dụng không phải làm gì.

### 5.6 AWS Directory Service — khi cần Active Directory

Directory Service là họ dịch vụ **Active Directory managed** (khác hẳn IAM). Dùng khi có app **AD-aware** (join domain, LDAP, Kerberos) hoặc muốn dùng AD làm nguồn danh tính. SAA hỏi chủ yếu để phân biệt 3 loại:

| | **Managed Microsoft AD** | **AD Connector** | **Simple AD** |
|--|--------------------------|------------------|---------------|
| Bản chất | AD **thật** do AWS quản lý (Windows Server AD) | **Proxy** chuyển tiếp auth về on-prem AD hiện có | **Samba 4** standalone, tương thích AD ở mức cơ bản |
| Lưu dữ liệu directory | Có (directory riêng trên AWS) | **Không** — chỉ redirect, không cache/lưu user | Có (nhỏ, độc lập) |
| Trust với on-prem AD | **Two-way / one-way forest trust** | Không tạo trust — *dùng chính* on-prem AD | **Không** trust được on-prem |
| App AD-aware hỗ trợ | Đầy đủ: RDS SQL Server, WorkSpaces, FSx for Windows, EC2 domain join, .NET app | Chủ yếu để join AWS app (WorkSpaces, WorkDocs) vào AD on-prem | Cơ bản: EC2 Linux/Windows join, LDAP app nhỏ |
| Quy mô / chi phí | Lớn, HA multi-AZ, giá cao nhất | Rẻ (chỉ proxy) nhưng cần kết nối tới on-prem | Rẻ nhất, cho môi trường nhỏ (&lt; 5.000 user) |

**Khi nào dùng cái nào:**

- Cần AD **riêng trên cloud**, có app Microsoft (RDS SQL Server, FSx Windows, WorkSpaces), muốn **trust 2 chiều** với on-prem → **Managed Microsoft AD**.
- **Đã có** AD on-prem, chỉ muốn AWS app xác thực qua nó mà **không copy user lên cloud** → **AD Connector**.
- Chỉ cần một directory **nhỏ, rẻ**, không cần liên kết on-prem, không cần tính năng Microsoft AD nâng cao → **Simple AD**.

**Tie-in với IAM Identity Center & domain join:**

- **IAM Identity Center** có thể dùng **Managed Microsoft AD (hoặc AD Connector)** làm **identity source** → nhân viên đăng nhập bằng tài khoản AD công ty để vào các AWS account/role. (Ngược lại với Cognito ở §5.3 vốn dành cho *end-user của app*, không phải nhân viên.)
- **EC2 domain join**: instance Windows join vào Managed Microsoft AD để login bằng tài khoản domain, chạy Group Policy — thường tự động hoá qua Seamless Domain Join / SSM.

> 💡 Directory Service ≠ IAM. IAM quản principal gọi AWS API; Directory Service cung cấp **Active Directory** cho workload và app cần Windows/LDAP/Kerberos, đồng thời có thể làm nguồn danh tính cho IAM Identity Center.

### 5.7 OIDC federation cho CI/CD (GitHub Actions)

Pipeline CI/CD chạy ngoài AWS nhưng cần quyền deploy. Cách cũ là tạo IAM user, lấy access key rồi dán vào secret của GitHub: lại một credential dài hạn nằm ngoài AWS. Cách đúng dùng cùng cơ chế với IRSA, chỉ đổi IdP thành GitHub.

1. **Phía AWS (một lần):** tạo OIDC identity provider trong IAM với URL `token.actions.githubusercontent.com` và audience `sts.amazonaws.com`.
2. **Phía AWS:** tạo role deploy với permission policy tối thiểu, và trust policy như dưới.
3. **Phía GitHub:** trong workflow, cấp quyền `id-token: write` để job xin được JWT từ GitHub, rồi dùng action `aws-actions/configure-aws-credentials` trỏ tới ARN của role. Action này mang JWT gọi `AssumeRoleWithWebIdentity`.
4. Job nhận credential tạm, deploy xong thì credential tự hết hạn. Không có secret nào được lưu ở GitHub.

```json
{
  "Effect": "Allow",
  "Principal": { "Federated": "arn:aws:iam::111122223333:oidc-provider/token.actions.githubusercontent.com" },
  "Action": "sts:AssumeRoleWithWebIdentity",
  "Condition": { "StringEquals": {
    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
    "token.actions.githubusercontent.com:sub": "repo:my-org/my-repo:ref:refs/heads/main"
  }}
}
```

Điều kiện `sub` là phần quan trọng nhất. GitHub là IdP **dùng chung cho mọi người trên thế giới**, nên nếu trust policy không giới hạn `sub` vào đúng organization/repo/branch của bạn thì workflow ở repo của bất kỳ ai cũng assume được role. Vì rủi ro đó, IAM hiện từ chối lưu trust policy cho GitHub nếu thiếu điều kiện này.

---

## 6. Cross-account access pattern

§3.3 đã nêu luật: cross-account cần hai bên cùng đồng ý. Section này là ba cách thực hiện trong thực tế. Hai cách đầu là IAM; cách thứ ba (RAM) dành cho những resource không gắn được policy.

### 6.1 Resource-based (đơn giản, ít object)

Chủ resource viết thẳng tên account kia vào resource-based policy. Account B share S3 bucket cho account A:
```json
// Bucket policy ở account B
{
  "Effect": "Allow",
  "Principal": { "AWS": "arn:aws:iam::AccountA:root" },
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::bucket-b/*"
}
```
Account A user còn cần identity policy allow `s3:GetObject` trên `bucket-b`.

`Principal` là `AccountA:root` nghĩa là B mở cửa cho **cả account A** và để admin của A chọn ai được đi. Chính vì vậy bước identity policy bên A là bắt buộc: nếu thiếu thì chưa ai trong A được chỉ định cả.

Đặc điểm của cách này: principal của A **giữ nguyên danh tính và quyền của mình** trong lúc truy cập. Một lời gọi duy nhất có thể đọc từ bucket của A rồi ghi sang bucket của B. Giới hạn của nó là chỉ dùng được với dịch vụ có resource-based policy (S3, SQS, SNS, KMS, Lambda, Secrets Manager, ECR… ; EC2 hay RDS instance thì không có).

### 6.2 AssumeRole cross-account (recommended cho nhiều case)

Thay vì mở từng resource, B tạo sẵn một role cho người của A mượn.

- Account B tạo role R, trust policy allow Account A assume. Permission policy của R ghi những gì người mượn được làm trong B.
- Account A cấp cho user của mình quyền `sts:AssumeRole` trên ARN của R.
- User gọi `AssumeRole` với role R ARN → nhận credential của B → gọi AWS API như "B".
- **Audit-friendly**: CloudTrail của B ghi lại ai (danh tính bên A) assume role nào, khi nào, và mọi việc làm trong phiên.

Đặc điểm: trong phiên, user **chỉ có quyền của R** và tạm mất quyền bên A. Muốn copy dữ liệu giữa hai account trong cùng một lời gọi thì cách này không làm được. Bù lại nó dùng được với **mọi** dịch vụ, vì từ góc nhìn của B đây chỉ là một role nội bộ đang gọi resource nội bộ.

**Chọn cách nào?**

| | **Resource-based policy** | **AssumeRole** |
|--|---------------------------|----------------|
| Danh tính khi truy cập | Vẫn là principal của A | Là role R của B |
| Quyền bên A trong lúc đó | Còn nguyên | Tạm gác |
| Dịch vụ dùng được | Chỉ loại có resource-based policy | Tất cả |
| Số chỗ phải cấu hình khi thêm resource | Mỗi resource một policy | Sửa một permission policy của R |
| Hợp khi | Chia sẻ một vài resource cụ thể; cần đọc/ghi qua hai account trong cùng thao tác | Truy cập thường xuyên, nhiều dịch vụ; cần một điểm cấp và thu hồi quyền |

Ví dụ ghép cả hai: Lambda ở account A cần đọc bảng DynamoDB ở account B. Execution role của Lambda (bên A) có quyền `sts:AssumeRole` trên role R của B. Trust policy của R tin execution role đó. Permission policy của R cho `dynamodb:GetItem` trên bảng. Trong code, Lambda gọi `AssumeRole` rồi dùng credential nhận được để đọc bảng.

### 6.3 RAM (Resource Access Manager)

Nhiều resource không có resource-based policy và cũng không phải thứ để "gọi API đọc dữ liệu": một subnet, một Transit Gateway, một cấu hình license. **RAM** là dịch vụ để chủ resource **chia sẻ chính resource đó** cho account khác dùng như thể nó nằm trong account của họ.

Ví dụ điển hình là *VPC sharing*: account network tạo một VPC và các subnet, rồi dùng RAM share subnet cho 10 account ứng dụng. Mỗi account ứng dụng thấy subnet đó trong console của mình và phóng EC2 vào được, nhưng không sửa hay xoá được subnet, route table hay NACL. Kết quả là một VPC được quản lý tập trung thay vì 10 VPC phải nối với nhau.

Cách dùng:

- Chủ resource tạo một **resource share**, chọn resource và chọn bên nhận: account cụ thể, một OU, hoặc cả Organization.
- Share **trong Organization** (sau khi bật tính năng này một lần) thì bên nhận có ngay, không cần chấp nhận lời mời. Share cho account ngoài Organization thì bên nhận phải accept.
- Chủ resource vẫn giữ toàn quyền sở hữu. Bên nhận chỉ làm được những thao tác mà RAM định sẵn cho loại resource đó, và IAM policy cùng SCP bên nhận vẫn áp dụng như thường.
- Bản thân RAM không tính phí; bạn trả tiền cho resource như bình thường.

RAM không phải IAM policy mà là sharing mechanism. Nó bổ sung chứ không thay thế hai cách trên.

> 🪤 Bẫy thi: "nhiều account dùng chung **subnet / Transit Gateway / Route 53 Resolver rule / License Manager**" → **RAM**. "account khác cần **đọc object S3 / gửi message SQS**" → resource-based policy hoặc AssumeRole.

---

## 7. Permission Boundary — delegation safety

### Use case

Bạn là admin và muốn dev tự tạo role cho Lambda của họ, để khỏi phải chờ bạn. Vấn đề: ai có quyền `iam:CreateRole` và `iam:AttachRolePolicy` thì tạo được một role gắn `AdministratorAccess` rồi dùng nó. Cấp quyền tạo role mà không rào gì thì chẳng khác gì cấp quyền admin. Đây gọi là *privilege escalation* (leo thang đặc quyền).

**Permission boundary** là cái rào đó: một policy gắn vào user/role với vai trò **trần**, không cấp quyền. "Delegation safety" trong tiêu đề nghĩa là uỷ quyền tạo role mà vẫn an toàn.

### Cách dùng
1. Tạo **Permission Boundary policy** P (quyền tối đa cho phép).
2. Cho Dev quyền tạo role/user **chỉ nếu** đính kèm boundary P.
3. Khi role/user mới ra đời, **quyền hiệu lực = intersection(identity policy, P)**.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" style="width:100%;max-width:560px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Permission Boundary là giao của identity policy và boundary policy</title>
  <desc>Biểu đồ Venn hai vòng tròn: vòng trái là Identity policy (quyền được cấp), vòng phải là Permission Boundary (trần quyền tối đa). Phần giao nhau ở giữa tô đậm là quyền hiệu lực thật sự — chỉ những quyền nằm trong CẢ HAI vòng mới có tác dụng.</desc>
  <text x="360" y="30" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Quyền hiệu lực = giao của 2 vòng</text>
  <circle cx="270" cy="200" r="150" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
  <circle cx="450" cy="200" r="150" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
  <path d="M360 80 A150 150 0 0 0 360 320 A150 150 0 0 0 360 80 Z" fill="#10b981" fill-opacity="0.28" stroke="none"/>
  <text x="195" y="120" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Identity policy</text>
  <text x="195" y="138" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">quyền được cấp</text>
  <text x="525" y="120" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Permission</text>
  <text x="525" y="138" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Boundary</text>
  <text x="525" y="156" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">trần tối đa</text>
  <text x="360" y="196" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">QUYỀN</text>
  <text x="360" y="214" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">HIỆU LỰC</text>
  <text x="360" y="234" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.8">(giao)</text>
  <text x="170" y="270" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">cấp nhưng vượt</text>
  <text x="170" y="284" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">trần → bị chặn</text>
  <text x="552" y="270" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">trần cho phép</text>
  <text x="552" y="284" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">nhưng chưa cấp</text>
</svg>

### Ví dụ đi hết một vòng

Boundary `DevBoundary` cho phép `s3:*`, `dynamodb:*`, `logs:*` và không có gì khác. Dev tạo role `app-orders` kèm boundary đó.

| Dev gắn vào role | Role gọi | Identity policy | Boundary | Kết quả |
|------------------|----------|-----------------|----------|---------|
| `AmazonS3ReadOnlyAccess` | `s3:GetObject` | Allow | Allow | **Được** |
| `AmazonS3ReadOnlyAccess` | `dynamodb:PutItem` | không có | Allow | **Không** — boundary cho phép nhưng chưa ai cấp |
| `AdministratorAccess` | `iam:CreateUser` | Allow | không có | **Không** — vượt trần |
| `AdministratorAccess` | `dynamodb:PutItem` | Allow | Allow | **Được** |

Dòng 2 cho thấy boundary không cấp quyền. Dòng 3 cho thấy dù dev gắn admin, role vẫn không ra khỏi ba dịch vụ trong boundary.

Bước 2 được viết thành statement trong identity policy **của Dev** như sau:

```json
{
  "Sid": "CreateRoleOnlyWithBoundary",
  "Effect": "Allow",
  "Action": ["iam:CreateRole", "iam:AttachRolePolicy", "iam:PutRolePolicy"],
  "Resource": "arn:aws:iam::123456789012:role/app-*",
  // Condition cho Dev khi tạo user/role
  "Condition": {
    "StringEquals": { "iam:PermissionsBoundary": "arn:aws:iam::123456789012:policy/DevBoundary" }
  }
}
```

Điều kiện `iam:PermissionsBoundary` đọc là: lời gọi chỉ được chấp nhận nếu role đang được tạo hoặc sửa có gắn đúng boundary `DevBoundary`. Tạo role không kèm boundary, hoặc kèm boundary khác, đều bị từ chối.

Cái rào chỉ kín khi chặn thêm hai lối thoát bằng explicit Deny trong policy của Dev:

```json
{
  "Sid": "NoRemovingBoundary",
  "Effect": "Deny",
  "Action": "iam:DeleteRolePermissionsBoundary",
  "Resource": "*"
},
{
  "Sid": "NoEditingBoundaryPolicy",
  "Effect": "Deny",
  "Action": ["iam:CreatePolicyVersion", "iam:DeletePolicy", "iam:DeletePolicyVersion", "iam:SetDefaultPolicyVersion"],
  "Resource": "arn:aws:iam::123456789012:policy/DevBoundary"
}
```

Statement đầu ngăn Dev gỡ boundary khỏi role sau khi tạo. Statement sau ngăn Dev sửa chính nội dung `DevBoundary` để tự nới trần.

→ Dev không thể tạo user "admin" được. Boundary trap.

> 🪤 Bẫy thi: "cho phép developer tự tạo IAM role nhưng role đó không được vượt quá một tập quyền" → **Permission Boundary**. SCP không phải đáp án ở đây vì SCP áp cho cả account (kể cả admin của account), còn yêu cầu chỉ nhắm vào các role do dev tạo.

---

## 8. SCP (Service Control Policy)

**SCP** là policy của AWS Organizations, gắn vào root của organization, một OU, hoặc một account. Nó đặt **trần quyền cho mọi principal của các account bên dưới**. Dùng SCP khi cần một luật mà ngay cả admin của account con cũng không tự gỡ được, ví dụ "không ai được dùng region ngoài danh sách" hay "không ai được tắt CloudTrail".

- Chỉ có trong AWS Organizations (và phải bật chế độ *all features*).
- Apply lên root, OU hoặc account; gắn ở trên thì mọi thứ bên dưới thừa hưởng.
- Là **trần quyền** — trong **member account** thì kể cả root user cũng bị giới hạn. Nhưng SCP **không áp dụng cho management account** (mọi user/role ở đó nằm ngoài tầm SCP) — đây là lý do best practice là không chạy workload trong management account.
- Không grant quyền. Giải thích ngay dưới đây.

### "Không grant quyền" nghĩa là gì

SCP dùng cùng cú pháp JSON với IAM policy, có cả `Allow` lẫn `Deny`, nên dễ tưởng `Allow` trong SCP là cấp quyền. Không phải. Hai effect trong SCP có nghĩa như sau:

- `Allow` trong SCP = *"action này nằm trong trần"*. Principal vẫn phải có identity policy cho phép thì mới làm được.
- `Deny` trong SCP = explicit deny, thắng mọi Allow ở mọi nơi trong account (bước 1 của §3.2).

Ví dụ: SCP của account ghi `Allow s3:*`, còn user Lan trong account không có identity policy nào. Lan đọc S3 được không? **Không**, vì SCP chỉ nói S3 nằm trong trần, chưa ai cấp quyền cho Lan. Ngược lại, Lan có `AdministratorAccess` nhưng SCP không chứa `ec2:*` thì Lan không chạm được EC2.

### FullAWSAccess và luật "Allow ở mọi tầng"

Khi bật SCP, Organizations tự gắn một SCP có sẵn tên **`FullAWSAccess`** (nội dung: Allow `*` trên `*`) vào **root, mọi OU và mọi account**. Nhờ nó, lúc chưa cấu hình gì thì trần là "tất cả" và SCP coi như trong suốt.

Luật đánh giá theo cây:

- Để một action nằm trong trần của account, phải có `Allow` cho nó ở **mọi tầng** trên đường từ root xuống account: root, từng OU, và chính account. Thiếu ở một tầng là bị implicit deny.
- Để một action bị cấm, chỉ cần `Deny` ở **một tầng bất kỳ** trên đường đó.

```
Root              [FullAWSAccess]
└─ OU Workloads   [FullAWSAccess] [Deny: region ngoài us-east-1, eu-west-1]
   ├─ OU Prod     [FullAWSAccess] [Deny: cloudtrail:StopLogging]
   │  └─ Account prod-app    [FullAWSAccess]
   └─ OU Sandbox  [Chỉ Allow: ec2:*, s3:*, cloudwatch:*]   ← đã gỡ FullAWSAccess
      └─ Account sandbox-1   [FullAWSAccess]
```

- Admin của `prod-app`: làm được mọi thứ trừ việc dùng region ngoài hai region cho phép (Deny thừa hưởng từ OU Workloads) và trừ `cloudtrail:StopLogging` (Deny ở OU Prod).
- Admin của `sandbox-1`: chỉ dùng được EC2, S3, CloudWatch trong hai region đó. `rds:CreateDBInstance` bị từ chối dù account vẫn gắn `FullAWSAccess`, vì tầng OU Sandbox không có Allow cho RDS.

### Hai chiến lược

- **Deny list (mặc định, nên dùng)**: giữ `FullAWSAccess` ở mọi tầng, rồi thêm các SCP `Deny` cho những thứ cần cấm. Dịch vụ mới AWS ra mắt tự động dùng được. Sai sót thường chỉ là cấm thiếu.
- **Allow list (restrictive)**: gỡ `FullAWSAccess` và thay bằng SCP chỉ Allow một danh sách dịch vụ, như OU Sandbox ở trên. Chặt hơn, nhưng nguy hiểm nếu sai: quên một dịch vụ phụ trợ là workload gãy, và gỡ `FullAWSAccess` ở một tầng mà không thay bằng gì thì mọi account bên dưới mất hết quyền.

### Patterns

```json
// Chỉ cho phép region us-east-1, eu-west-1
{
  "Effect": "Deny",
  "Action": "*",
  "Resource": "*",
  "Condition": {
    "StringNotEquals": {
      "aws:RequestedRegion": ["us-east-1", "eu-west-1"]
    }
  }
}

// Cấm tạo IAM user (chỉ dùng IdC)
{ "Effect": "Deny", "Action": "iam:CreateUser", "Resource": "*" }

// Cấm leave organization
{ "Effect": "Deny", "Action": "organizations:LeaveOrganization", "Resource": "*" }
```

Lưu ý với pattern khoá region: các dịch vụ **global** như IAM chỉ có một endpoint đặt ở `us-east-1`, nên mọi lời gọi IAM đều có `aws:RequestedRegion` là `us-east-1` dù người gọi đang "đứng" ở region nào trong console. Ví dụ trên giữ `us-east-1` trong danh sách nên IAM vẫn chạy. Nếu danh sách cho phép **không** có `us-east-1` thì IAM bị chặn hoàn toàn; khi đó phải đổi `"Action": "*"` thành `NotAction` liệt kê các dịch vụ global để chừa chúng ra.

### SCP không đụng tới những gì

- **Management account**: như đã nói ở trên.
- **Service-linked role**: loại role do chính dịch vụ AWS tạo để tự vận hành (ví dụ role của Auto Scaling). SCP không giới hạn chúng, nếu không thì một SCP viết ẩu có thể làm hỏng dịch vụ.
- **Principal ngoài organization**: SCP giới hạn *principal của account*. Một user ở account bên ngoài truy cập bucket của bạn qua bucket policy không bị SCP của bạn chặn. Muốn chặn hướng đó thì dùng RCP hoặc điều kiện `aws:PrincipalOrgID` trong bucket policy.

Phần chiến lược OU, RCP và Control Tower được đào sâu ở [[ch3-05-multi-account-governance]].

### Best practices
- **Default**: `FullAWSAccess` (allow tất cả) + selective deny.
- **Restrictive**: bắt đầu deny everything, allow từ từ. Nguy hiểm nếu sai.
- Thử SCP mới trên một OU test có một account trước khi gắn lên OU thật.

---

## 9. IAM Policy nâng cao

### 9.1 Conditions hay gặp

| Condition | Use case |
|-----------|----------|
| `aws:SourceIp` | Giới hạn IP range |
| `aws:SourceVpc` / `aws:SourceVpce` | Chỉ qua VPC/VPC endpoint cụ thể |
| `aws:RequestedRegion` | Region whitelist |
| `aws:PrincipalOrgID` | Chỉ principal trong Org |
| `aws:MultiFactorAuthPresent` | Bắt buộc MFA |
| `aws:CurrentTime` / `aws:EpochTime` | Time-based access |
| `aws:ResourceTag/...` / `aws:RequestTag/...` | Tag-based access (ABAC) |
| `aws:TagKeys` | Bắt buộc khai tag |
| `s3:prefix` | Chỉ access object có prefix |
| `kms:ViaService` | Chỉ encrypt/decrypt qua service cụ thể |

### 9.2 Wildcards & NotAction/NotResource

- `Action: "*"` = tất cả action. Hạn chế dùng.
- `NotAction`: trừ ra. Vd allow `*` ngoại trừ `iam:*` → vẫn nguy hiểm, prefer explicit list.
- `Resource: "*"`: tất cả resource. Restrict nếu có thể.

### 9.3 ABAC (Attribute-Based Access Control)

Thay vì 1000 role cho 1000 team, dùng **tag-based**:

```json
// Allow if resource tag "Team" == principal tag "Team"
{
  "Effect": "Allow",
  "Action": "ec2:*",
  "Resource": "*",
  "Condition": {
    "StringEquals": { "aws:ResourceTag/Team": "${aws:PrincipalTag/Team}" }
  }
}
```

→ 1 policy phục vụ N team. Tag-based scale tốt cho enterprise.

**ABAC vs RBAC — chọn cái nào?** **RBAC** = gán role/permission set truyền thống, mỗi vai trò một policy — trực quan khi số nhóm cố định và nhỏ, nhưng số policy phình theo số team (thêm team = thêm role). **ABAC** = tag-based (`aws:PrincipalTag` khớp `aws:ResourceTag`), **1 policy dùng chung**, thêm team chỉ cần gắn tag đúng — chọn khi số team/dự án tăng nhanh, cần scale mà không đẻ thêm policy.

---

## 10. Access Analyzer & policy debugging

Viết policy xong, có hai câu hỏi cần công cụ trả lời: *policy này có cho nhiều hơn mức cần không?* và *vì sao request này bị từ chối?* Bốn công cụ dưới đây mỗi cái trả lời một phần.

### IAM Access Analyzer

Access Analyzer **đọc policy và suy luận** xem policy đó cho phép những gì. Nó không dựa vào log truy cập, nên phát hiện được lỗ hổng ngay cả khi chưa ai khai thác. Có ba tính năng đề thi hay nhắc:

- **External access findings.** Bạn chọn một *zone of trust* (vùng tin cậy): account của bạn hoặc cả Organization. Analyzer quét resource-based policy của các resource hỗ trợ (S3 bucket, IAM role, KMS key, Lambda function, SQS queue, Secrets Manager secret, snapshot…) và báo một *finding* cho mỗi resource đang mở cho principal **ngoài** vùng tin cậy. Ví dụ: bucket policy có `Principal: "*"`, hoặc trust policy của một role tin một account lạ. Phải bật ở **từng region** vì nó chỉ phân tích resource trong region nơi nó được tạo.
- **Unused access findings.** Liệt kê role không ai dùng, access key và mật khẩu không dùng, cùng các quyền đã cấp nhưng không được dùng tới. Tính năng này tính phí theo số role/user được phân tích mỗi tháng.
- **Policy generation.** Analyzer đọc CloudTrail log của một role trong khoảng thời gian bạn chọn (tối đa **90 ngày**) và sinh ra một policy chỉ chứa những action role đó đã thực sự gọi. Đây là cách thực tế để thu hẹp cái `AdministratorAccess` ở §1: cho ứng dụng chạy vài tuần, sinh policy từ hoạt động thật, rồi thay vào. Hạn chế: nó không thấy được chi tiết data event (ví dụ từng lời gọi `s3:GetObject`), nên phần resource và các action dữ liệu bạn phải tự điền.

Ngoài ra còn **policy validation**: kiểm tra cú pháp và cảnh báo các thực hành kém an toàn ngay trong lúc bạn soạn policy trên console.

### Policy simulator

Công cụ để hỏi "nếu principal X gọi action Y trên resource Z thì kết quả là gì?" mà **không thực hiện request thật**. Bạn chọn user/role, chọn action, điền ARN của resource và giá trị các condition key (IP nguồn, có MFA hay không), rồi simulator trả về allowed hay denied, kèm statement nào dẫn tới kết quả đó. Dùng để thử policy trước khi gắn, hoặc để tìm xem trong mười policy của một role thì cái nào đang gây Deny.

### Last accessed info

Trong trang của mỗi user/role, IAM hiển thị từng dịch vụ mà principal đó có quyền và **lần cuối nó thử truy cập** dịch vụ ấy. (Tên cũ của tab này là *Access Advisor*.) Dữ liệu ở mức dịch vụ được giữ ít nhất **400 ngày**, và hoạt động mới xuất hiện trong vòng khoảng 4 giờ.

Cách dùng: role có quyền trên 30 dịch vụ nhưng suốt 400 ngày chỉ chạm 4 dịch vụ, vậy 26 dịch vụ còn lại là ứng viên để gỡ. Với một số dịch vụ, IAM còn cho biết tới mức từng action, nhưng chỉ cho action quản trị (tạo, sửa, xoá), không có action đọc/ghi dữ liệu.

### CloudTrail

CloudTrail ghi lại **mọi API call** vào account: ai gọi (`userIdentity`), gọi dịch vụ nào (`eventSource`), action gì (`eventName`), từ IP nào, lúc nào, và **có lỗi không** (`errorCode`). Khi debug quyền, lọc theo `errorCode = AccessDenied` cùng tên principal để tìm đúng lời gọi bị chặn.

*Event history* trên console có sẵn **90 ngày** gần nhất của management event, miễn phí, xem theo từng region. Muốn giữ lâu hơn hoặc muốn có data event thì tạo trail ghi ra S3 (xem [[ch3-04-detective-controls]]).

### Quy trình debug một lỗi AccessDenied

1. Đọc kỹ thông báo lỗi. AWS thường ghi rõ loại deny và loại policy gây ra, ví dụ *"no identity-based policy allows the s3:GetObject action"* (implicit deny, thiếu Allow) hoặc *"with an explicit deny in a service control policy"* (có Deny ở SCP).
2. **Implicit deny** thì đi tìm chỗ thiếu Allow theo thứ tự §3.2: identity policy, rồi boundary, session policy, SCP. Nếu là cross-account thì xem cả hai phía.
3. **Explicit deny** thì đi tìm statement Deny trong loại policy mà thông báo đã chỉ. Thêm Allow không giải quyết được.
4. Không đủ thông tin thì tìm sự kiện trong CloudTrail, hoặc dựng lại tình huống trong Policy simulator.

---

## 11. Best practices (đi thi & thực tế)

1. **Root account**: enable MFA hardware, không tạo access key, lock vào safe.
2. **Không tạo IAM user cho người** — dùng IdC + IdP.
3. **IAM Role cho mọi compute** (EC2, Lambda, ECS task role). Không hardcode credential.
4. **MFA mọi nơi có thể**: console login, AssumeRole nhạy cảm, S3 bucket delete.
5. **Permission Boundary** cho developer tạo role.
6. **SCP** cho org-wide guardrail (region whitelist, ngăn delete CloudTrail, …).
7. **Audit định kỳ**: Access Analyzer, IAM Access Advisor, credential report.
8. **Rotate access key** nếu vẫn còn (mỗi 90 ngày). Tốt hơn là **xóa hết**.
9. **Encryption at rest** với KMS, encryption in transit với TLS. Resource policy + KMS key policy.
10. **Tag mọi resource** → ABAC + cost allocation.

---

## 12. Cạm bẫy đề thi (SAA)

1. **"AdministratorAccess + SCP deny S3 → có truy cập S3?"** → **Không**, SCP deny thắng admin.
2. **"Bucket policy allow account A + user của A không có S3 permission → có truy cập?"** → **KHÔNG**. Đây là cross-account, phải có Allow ở **cả hai** phía: bucket policy bên account B VÀ identity policy của user bên account A. Thiếu identity policy bên caller là deny. Chỉ khi **cùng account** thì resource policy một mình mới đủ — đó đúng là chỗ đề SAA đánh tráo.
3. **"Cross-account: chỉ cần resource policy"** → **Sai**. Luôn cần cả resource policy bên chủ resource lẫn identity policy bên caller, kể cả khi bucket policy ghi đích danh ARN của user. Thứ resource policy giúp bạn bỏ qua là bước **assume role**, không phải identity policy (§3.3, quy tắc vàng số 5).
4. **"Permission Boundary thay thế IAM policy"** → **Sai**. Boundary là trần, vẫn cần identity policy grant quyền.
5. **"SCP grant quyền"** → **Sai**. `Allow` trong SCP chỉ có nghĩa action nằm trong trần (§8). Vẫn cần IAM policy.
6. **"IAM user trên EC2 thay vì instance profile"** → **Anti-pattern**. Luôn dùng role.
7. **"EKS pod cần access AWS service → IAM user trong secret"** → **Sai**. Dùng IRSA / Pod Identity.
8. **"Long-lived credential trên CI/CD"** → **Anti-pattern**. Dùng **OIDC federation** (GitHub Actions OIDC, GitLab OIDC) — không cần secret (§5.7).
9. **"`Resource: *` với `Action: s3:GetObject` là least privilege"** → **Sai**, scope down theo bucket/prefix.

---

## 13. Tóm tắt 1 dòng

> IAM = policy + principal + evaluation logic. **Explicit DENY thắng tất cả.** Default deny. **Role + STS** > **User + Access Key** cho mọi case. **SCP, Permission Boundary, IdC** là 3 trụ cột enterprise IAM.

---

## 14. Bài tập tự kiểm tra

1. EC2 trong VPC private subnet cần access S3 bucket. Bucket policy hiện chỉ allow `arn:aws:iam::123:role/EC2Role`. Yêu cầu: kết nối **không qua internet**. Liệt kê 3-4 thứ phải config (IAM, VPC, S3).
2. Dev team xin tạo role có quyền tự ý. Bạn (Admin) muốn họ tạo được role nhưng không có quyền IAM/Org. Design?
3. CI/CD GitHub Actions deploy vào AWS. Cách an toàn nhất là gì? Liệt kê đầy đủ steps (GitHub side + AWS side).
4. Cross-account: account A user cần `s3:PutObject` vào bucket ở account B. So sánh 2 cách (resource policy vs AssumeRole) — chọn cái nào cho 1 lần dùng vs sử dụng thường xuyên?
5. SCP có 2 rule: (a) Deny `*` outside us-east-1; (b) Allow `iam:*`. Account user trong us-east-1 có thể `iam:CreateUser` ở eu-west-1 không? Vì sao?
6. Lambda function gọi DynamoDB ở account khác. Mô tả flow IAM (trust policy, permission policy, cross-account).

Gợi ý chỗ tìm lời giải trong bài: bài 1 cần thêm VPC gateway endpoint ở [[ch3-02-network-security]]; bài 2 ở §7; bài 3 ở §5.7; bài 4 và 6 ở §6; bài 5 ở §3.2 và phần lưu ý về dịch vụ global trong §8.

---

## 15. Đọc thêm

- AWS Whitepaper — *AWS IAM Best Practices*.
- AWS Builder's Library — *Authenticating to AWS services*.
- AWS docs — *IAM JSON Policy Reference*, *Policy Evaluation Logic*.
- *AWS Security Maturity Model*.

---

**Bài tiếp theo**: [[ch3-02-network-security]] — VPC isolation, SG vs NACL deep, WAF, Shield, Network Firewall.
