# SAA Ch3.3 — Data Protection & Encryption

> Mục tiêu: Hiểu **KMS** thật sự (envelope encryption, key policy, grants), encryption ở từng service (S3, EBS, RDS, DynamoDB), khi nào dùng **CloudHSM** thay KMS, và quản lý **secret + certificate** đúng cách thay vì hardcode trong code.

Tiền đề: [[ch3-01-iam-deep-dive]] (policy), CLF [[05-s3]].

---

## 1. Câu chuyện mở đầu — Hardcoded password trên GitHub

Dev push code lên public GitHub repo. Hardcoded DB password trong `config.py`. Trong 3 phút, bot scanner phát hiện. Trong 5 phút, attacker access DB. Trong 10 phút, ransom note xuất hiện.

→ **Secret không bao giờ trong code, không bao giờ trong env file commit, không bao giờ trong S3 bucket public.** Câu chuyện đáng buồn này lặp đi lặp lại — và **AWS Secrets Manager / Parameter Store / KMS** giải quyết được, nếu bạn dùng.

---

## 2. Encryption — at rest vs in transit

| Loại | Bảo vệ | AWS service |
|------|--------|-------------|
| **At rest** | Data trên disk/storage | KMS, S3 encryption, EBS encryption, RDS encryption |
| **In transit** | Data đi trên network | TLS (ACM certificate), VPN, MACsec (DX) |
| **In use** | Data đang xử lý trong RAM | Nitro Enclaves (special) |

**Quy tắc**: bật cả 2. At rest mặc định ở 95% service AWS. In transit cần config TLS đúng.

### 2.1 In-transit: VPN vs Direct Connect — bẫy kinh điển

Nhiều người tưởng "kết nối riêng tư từ on-prem về AWS thì auto được mã hoá". **Sai** với Direct Connect.

| Kết nối | Mã hoá in-transit mặc định? | Bản chất |
|---------|------------------------------|----------|
| **Site-to-Site VPN** | ✓ Có — **IPsec** sẵn | Đi qua Internet public nhưng tunnel đã encrypt |
| **Direct Connect (DX)** | ✗ **Không** | Đường riêng (private) nhưng traffic là **plaintext** trên layer 2/3 |

- DX cho bạn băng thông ổn định, latency thấp, private — **nhưng không đồng nghĩa với encrypted**. "Private" ≠ "encrypted".
- Muốn encrypt in-transit trên DX, có 2 cách:
  1. **VPN over DX** (IPsec chạy đè lên DX) — dùng public VIF, chồng Site-to-Site VPN lên đường DX. Đơn giản, phổ biến.
  2. **MACsec** (IEEE 802.1AE) — mã hoá layer 2, chỉ hỗ trợ trên DX **dedicated connection** ở các location đủ điều kiện, chỉ với port **10 Gbps hoặc 100 Gbps** (không có ở 1 Gbps). Hiệu năng cao, độ trễ thấp hơn IPsec.

> Bẫy thi: đề yêu cầu "kết nối on-prem về AWS **phải mã hoá in-transit**" nhưng đáp án lại chọn Direct Connect trần → **Sai**. Phải là **VPN**, hoặc **VPN over Direct Connect**, hoặc **Direct Connect + MACsec**. Nếu đề nhấn "consistent low latency **và** encrypted" → DX + MACsec (hoặc VPN over DX).

---

## 3. KMS (Key Management Service)

### 3.1 Khái niệm core

**Nó là gì.** KMS là dịch vụ **giữ khoá mã hoá hộ bạn và thực hiện phép mã hoá/giải mã thay bạn**. Bạn không bao giờ cầm khoá trong tay; bạn chỉ gọi API "hãy mã hoá cái này bằng khoá X" và KMS trả kết quả. Vì khoá không nằm trong code, trong file cấu hình hay trên đĩa của bạn, nên lộ source code hay lộ ổ đĩa không kéo theo lộ khoá.

Bốn thuật ngữ dùng suốt bài:

- **KMS key** — khoá gốc nằm trong KMS. Tài liệu cũ và nhiều đề thi gọi là **CMK (Customer Master Key)**; hai tên chỉ cùng một thứ. Mỗi key có *key ID*, *ARN*, có thể gắn *alias* (tên dễ đọc như `alias/prod-db`).
- **Key material** — chuỗi bit bí mật thật sự của key (với key đối xứng là 256 bit). "Rotate key" nghĩa là sinh key material mới, còn key ID giữ nguyên (xem §3.6).
- **HSM (Hardware Security Module)** — thiết bị phần cứng chuyên dụng để sinh và giữ khoá, được thiết kế để **khoá không thể bị đọc ra ngoài**: mọi phép tính dùng khoá diễn ra bên trong thiết bị, cạy vỏ thì thiết bị tự xoá khoá. KMS chạy trên một đội HSM do AWS vận hành, dùng chung cho mọi khách hàng (multi-tenant) nhưng tách biệt về logic.
- **Data key** — một khoá *khác*, do KMS sinh ra theo yêu cầu và **giao cho bạn** để bạn tự mã hoá dữ liệu lớn. KMS key chỉ dùng để mã hoá chính data key này. Cơ chế hai tầng khoá đó là *envelope encryption* ở §3.4.

**Vì sao key "không bao giờ rời KMS"?** Key material chỉ tồn tại dạng plaintext bên trong HSM. Không có API nào trả nó về, kể cả cho root account hay nhân viên AWS. Thứ duy nhất đi ra ngoài là *kết quả* của phép tính (ciphertext, plaintext, chữ ký).

**FIPS 140 Level 3 là gì.** FIPS 140 là chuẩn của chính phủ Mỹ để kiểm định module mật mã, chia 4 cấp. **Level 3** đòi phần cứng **chống cạy phá vật lý** và xác thực theo danh tính người vận hành. Đề thi và hầu hết tài liệu ghi KMS đạt **FIPS 140-2 Level 3** (bài này trước đây cũng ghi vậy); trang FAQ hiện tại của AWS ghi HSM của KMS đã được kiểm định theo bản mới **FIPS 140-3 Level 3**. Điều cần nhớ cho đề: KMS và CloudHSM **cùng Level 3**, khác nhau ở chỗ CloudHSM là **single-tenant** (§4), không phải ở cấp FIPS.

**Bạn dùng key qua API**, bốn lệnh hay gặp:

| API | Làm gì | Ghi chú |
|-----|--------|---------|
| `Encrypt` | Gửi dữ liệu lên, KMS mã hoá bằng KMS key rồi trả ciphertext | Tối đa **4 KB** dữ liệu mỗi lần gọi |
| `Decrypt` | Gửi ciphertext lên, nhận lại plaintext | Ciphertext tự chứa thông tin key nào đã mã hoá nó |
| `GenerateDataKey` | KMS sinh một data key, trả **hai bản**: bản plaintext để dùng ngay và bản đã mã hoá bằng KMS key để lưu | Viên gạch của envelope encryption |
| `ReEncrypt` | Giải mã bằng key A rồi mã hoá lại bằng key B, tất cả **bên trong KMS** | Plaintext không lộ ra phía client |

### 3.2 Loại key

Câu hỏi phân loại là **ai sở hữu và ai điều khiển được key**. Có ba mức, đi từ "AWS lo hết" tới "bạn lo hết":

- **AWS owned key** — key nằm trong account **của AWS**, một key có thể phục vụ nhiều khách hàng. Bạn không thấy nó trong console KMS, không xem được policy, không có log CloudTrail về việc nó được dùng, và việc dùng nó **không tính vào quota request** của account bạn. Miễn phí. Ví dụ: mặc định của DynamoDB, SSE-S3, SSE-SQS.
- **AWS managed key** — key nằm trong account **của bạn** nhưng do một dịch vụ AWS tạo và quản lý thay bạn, alias dạng `aws/<service>` (`aws/ebs`, `aws/rds`, `aws/s3`…). Bạn **thấy** nó trong console, **đọc** được key policy, và CloudTrail **có ghi** mỗi lần nó được dùng. Nhưng bạn **không sửa** được key policy, không tự rotate, không xoá, và không cho account khác dùng được. Không mất phí giữ key; request thì vẫn tính tiền và tính quota như thường.
- **Customer managed key** — key do **bạn tạo**. Bạn viết key policy, bật/tắt rotation và chọn chu kỳ, disable hoặc xoá key, chia sẻ cho account khác. Trả **$1/key/tháng** (us-east-1) cộng tiền request.

Khác biệt giữa AWS owned và AWS managed trong thực tế gói lại ở hai câu hỏi: *"có log ai đã dùng key không?"* và *"request có ăn vào quota của tôi không?"*. AWS owned: không và không. AWS managed: có và có.

| Type | Nằm ở account | Bạn sửa policy / rotation | CloudTrail log | Cost | Use case |
|------|---------------|---------------------------|----------------|------|----------|
| **AWS owned key** | Của AWS (bạn không thấy) | Không | Không | Free | Mã hoá mặc định bên trong service, không cần audit |
| **AWS managed key** (`aws/s3`, `aws/rds`…) | Của bạn | Không (chỉ xem) | Có | Free tiền key; request vẫn tính | Mã hoá mặc định, muốn có log, không cần chia sẻ cross-account |
| **Customer managed key (CMK)** | Của bạn | **Có** | Có | ~$1/key/tháng + request | Cần custom policy, điều khiển rotation, audit, chia sẻ cross-account |

> Bẫy thi: đề cần **chia sẻ dữ liệu đã mã hoá sang account khác** (snapshot EBS/RDS, bucket SSE-KMS) → phải là **customer managed key**, vì key policy của AWS managed key không sửa được nên không thêm account kia vào được.

### 3.3 Symmetric vs Asymmetric

**Symmetric (đối xứng)**: một khoá duy nhất vừa mã hoá vừa giải mã. Trong KMS đó là khoá **AES 256-bit**, thuật toán AES-GCM. Ai muốn mã hoá hay giải mã đều phải **gọi API KMS** (và do đó phải có quyền IAM/key policy), vì khoá không bao giờ ra ngoài. Đây là loại mặc định và là loại duy nhất mà các dịch vụ AWS (S3, EBS, RDS, DynamoDB, SQS…) dùng để mã hoá at rest.

**Asymmetric (bất đối xứng)**: một **cặp** khoá. *Private key* nằm trong KMS và không rời đi; *public key* thì tải về được (`GetPublicKey`) và phát cho bất kỳ ai. Cặp khoá làm được hai việc:

- **Sign/verify**: KMS ký bằng private key, bên ngoài dùng public key để kiểm chữ ký. Ví dụ: ký JWT, ký bản build phần mềm, ký tài liệu.
- **Encrypt/decrypt**: bên ngoài mã hoá bằng public key, chỉ KMS giải mã được bằng private key.

**Khi nào thật sự cần asymmetric?** Khi có một bên **không gọi được API KMS** nhưng vẫn phải tham gia: đối tác không có tài khoản AWS, app mobile, thiết bị offline. Họ cầm public key và tự kiểm chữ ký hoặc tự mã hoá, không cần credential AWS. Nếu cả hai đầu đều ở trong AWS thì symmetric rẻ hơn và nhanh hơn:

| Type | Algorithm | Giá request (us-east-1) | Quota mặc định | Use case |
|------|-----------|--------------------------|----------------|----------|
| **Symmetric** (256-bit AES) | AES-GCM | ~$0.03 / 10.000 request | 10.000 req/s trở lên (xem §11) | Encrypt/decrypt data, default cho mọi case |
| **Asymmetric RSA / ECC** | RSA-2048/3072/4096, ECDSA | ~$0.15 / 10.000 request (gấp 5) | 1.000 req/s | Sign/verify, encrypt cho bên ngoài AWS cầm public key |

### 3.4 Envelope encryption — quan trọng nhất

Vấn đề: KMS giới hạn ~4KB cho `Encrypt` API. Encrypt 1GB không khả thi qua KMS trực tiếp.

**Giải pháp**: envelope encryption.

<step-flow>
<svg viewBox="0 0 760 560" role="img" aria-labelledby="sd303a-t sd303a-d" style="width:100%;max-width:760px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="sd303a-t">Envelope encryption với KMS: GenerateDataKey rồi Decrypt, 9 bước</title>
<desc id="sd303a-d">Sơ đồ tuần tự ba lifeline App (client), KMS, Lưu trữ. Encrypt: App gọi GenerateDataKey, KMS trả plaintext key và encrypted data key, App encrypt 1GB ở local bằng AES-GCM, lưu encrypted data kèm encrypted data key, rồi vứt plaintext key khỏi RAM. Decrypt: App đọc encrypted data và encrypted data key, gửi encrypted data key cho KMS Decrypt, KMS trả plaintext data key, App decrypt local rồi vứt plaintext key.</desc>
<defs>
<marker id="sd303a-arr" markerWidth="9" markerHeight="9" refX="7" refY="3.2" orient="auto"><path d="M0 0 L7 3.2 L0 6.4 z" fill="currentColor"/></marker>
</defs>
<rect x="50" y="14" width="160" height="50" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
<text x="130" y="44" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">App (client)</text>
<rect x="300" y="14" width="200" height="50" rx="9" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
<use href="#aws-kms" x="310" y="19" width="40" height="40"/>
<text x="424" y="35" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">KMS</text>
<text x="424" y="54" text-anchor="middle" font-size="12" fill="currentColor" opacity="0.75">key không rời KMS</text>
<rect x="580" y="14" width="140" height="50" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="650" y="44" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">Lưu trữ</text>
<line x1="130" y1="64" x2="130" y2="484" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 4"/>
<line x1="400" y1="64" x2="400" y2="484" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 4"/>
<line x1="650" y1="64" x2="650" y2="484" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 4"/>
<text x="16" y="92" font-size="14" font-weight="700" fill="currentColor">A · ENCRYPT (mã hoá 1GB)</text>
<g data-step="1">
<text x="265" y="115" text-anchor="middle" font-size="13" fill="currentColor">1 · GenerateDataKey</text>
<line x1="132" y1="124" x2="394" y2="124" stroke="currentColor" stroke-opacity="0.65" stroke-width="1.5" marker-end="url(#sd303a-arr)"/>
</g>
<g data-step="2">
<text x="265" y="151" text-anchor="middle" font-size="13" fill="currentColor">2 · plaintext key + encrypted data key</text>
<line x1="398" y1="160" x2="136" y2="160" stroke="currentColor" stroke-opacity="0.65" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#sd303a-arr)"/>
</g>
<g data-step="3">
<rect x="16" y="174" width="250" height="32" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
<text x="141" y="195" text-anchor="middle" font-size="13" fill="currentColor">3 · encrypt 1GB local (AES-GCM)</text>
</g>
<g data-step="4">
<text x="390" y="231" text-anchor="middle" font-size="13" fill="currentColor">4 · lưu encrypted data + encrypted data key</text>
<line x1="132" y1="240" x2="644" y2="240" stroke="currentColor" stroke-opacity="0.65" stroke-width="1.5" marker-end="url(#sd303a-arr)"/>
</g>
<g data-step="5">
<rect x="16" y="254" width="250" height="32" rx="8" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.3"/>
<text x="141" y="275" text-anchor="middle" font-size="13" fill="currentColor">5 · vứt plaintext key khỏi RAM</text>
</g>
<line x1="16" y1="302" x2="744" y2="302" stroke="currentColor" stroke-opacity="0.18"/>
<text x="16" y="326" font-size="14" font-weight="700" fill="currentColor">B · DECRYPT (giải mã)</text>
<g data-step="6">
<text x="390" y="349" text-anchor="middle" font-size="13" fill="currentColor">6 · đọc encrypted data + encrypted data key</text>
<line x1="648" y1="358" x2="136" y2="358" stroke="currentColor" stroke-opacity="0.65" stroke-width="1.5" marker-end="url(#sd303a-arr)"/>
</g>
<g data-step="7">
<text x="265" y="385" text-anchor="middle" font-size="13" fill="currentColor">7 · Decrypt(encrypted data key)</text>
<line x1="132" y1="394" x2="394" y2="394" stroke="currentColor" stroke-opacity="0.65" stroke-width="1.5" marker-end="url(#sd303a-arr)"/>
</g>
<g data-step="8">
<text x="265" y="421" text-anchor="middle" font-size="13" fill="currentColor">8 · plaintext data key</text>
<line x1="398" y1="430" x2="136" y2="430" stroke="currentColor" stroke-opacity="0.65" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#sd303a-arr)"/>
</g>
<g data-step="9">
<rect x="16" y="444" width="250" height="32" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
<text x="141" y="465" text-anchor="middle" font-size="13" fill="currentColor">9 · decrypt local → vứt plaintext key</text>
</g>
<text x="16" y="512" font-size="13" fill="currentColor" opacity="0.75">KMS chỉ xử lý data key 256-bit (nhẹ); heavy lifting 1GB nằm ở client.</text>
<text x="16" y="536" font-size="13" fill="currentColor" opacity="0.75">Mũi tên nét liền = request; nét đứt = response. Thứ tự 1→9 là thứ tự theo thời gian.</text>
</svg>
<step-note data-step="1">App xin KMS một data key mới. KMS key nằm yên trong KMS, nên app không thể lấy nó về để tự mã hoá dữ liệu.</step-note>
<step-note data-step="2">Một lần gọi trả về hai bản của <b>cùng</b> một data key: bản rõ để dùng ngay, bản đã mã hoá bằng KMS key để cất. Lúc ghi không cần gọi KMS thêm lần nào.</step-note>
<step-note data-step="3">Mã hoá chạy ở client nên không vướng giới hạn ~4KB của API <code>Encrypt</code>; 1GB không đi qua mạng tới KMS.</step-note>
<step-note data-step="4">Encrypted data key được cất ngay cạnh dữ liệu, đó chính là cái phong bì. Lộ nó cũng vô hại vì chỉ KMS mở được.</step-note>
<step-note data-step="5">Chỉ còn bản đã mã hoá tồn tại. Nếu lưu plaintext key cạnh dữ liệu thì KMS không còn bảo vệ gì nữa.</step-note>
<step-note data-step="6">Phong bì đi kèm dữ liệu nên app không cần tự nhớ key nào ứng với object nào.</step-note>
<step-note data-step="7">Chỉ data key nhỏ được gửi lên KMS. Đây là lúc key policy và IAM (§3.5) được kiểm: không có quyền <code>kms:Decrypt</code> thì dừng tại đây.</step-note>
<step-note data-step="8">KMS trả lại bản rõ của data key; KMS key vẫn không rời KMS.</step-note>
<step-note data-step="9">Giải mã 1GB chạy local, rồi vứt plaintext key giống bước 5.</step-note>
</step-flow>

→ KMS chỉ encrypt/decrypt 256-bit data key, nhẹ. Heavy lifting ở client. **S3, EBS, RDS, DynamoDB đều dùng pattern này internal.**

### 3.5 Key policy + grants + IAM

Với S3 hay DynamoDB, một IAM policy `Allow` là đủ để user trong cùng account dùng resource. **KMS thì không**: mỗi KMS key có một **key policy** riêng và key policy là nơi quyết định cuối cùng. Có ba cơ chế cấp quyền, đi qua từng cái.

**1. Key policy — policy gắn trên chính key.** Đây là resource-based policy, và là thứ **bắt buộc phải có**: không key nào tồn tại mà thiếu key policy. Nếu key policy không nhắc tới bạn (trực tiếp hoặc gián tiếp), bạn không dùng được key dù IAM policy của bạn ghi `kms:*`.

Khi tạo key bằng console, KMS chèn sẵn một statement mặc định:

```json
{
  "Sid": "Enable IAM User Permissions",
  "Effect": "Allow",
  "Principal": { "AWS": "arn:aws:iam::111122223333:root" },
  "Action": "kms:*",
  "Resource": "*"
}
```

Statement này **không** có nghĩa "chỉ root user được dùng". `arn:...:root` ở đây đại diện cho **cả account**, và ý nghĩa của nó là: *"key này uỷ quyền cho IAM của account 111122223333 quyết định tiếp"*. Chính statement này là thứ "phải có để IAM policy hoạt động". Xoá nó đi thì mọi IAM policy `kms:*` trong account trở nên vô dụng với key đó, và chỉ những principal được nêu đích danh trong key policy mới dùng được key.

**2. IAM policy — policy gắn trên user/role.** Chỉ có hiệu lực khi key policy đã mở cửa như trên. Hai lớp kết hợp như sau:

| Tình huống | Kết quả |
|-----------|---------|
| Key policy có statement uỷ quyền cho account **và** IAM policy của role `Allow kms:Decrypt` | Được |
| Key policy nêu đích danh ARN của role với `kms:Decrypt` (không cần IAM policy, cùng account) | Được |
| IAM policy `Allow kms:*` nhưng key policy không uỷ quyền cho account và không nêu role | **Bị từ chối** |
| **Cross-account**: role ở account B dùng key ở account A | Cần **cả hai**: key policy ở A cho phép account B (hoặc role đó), **và** IAM policy ở B cho phép role dùng key ARN của A |

> Trap: bạn `Allow kms:*` trong IAM policy cho user nhưng key policy không uỷ quyền cho account và không reference user → vẫn DENY. Key policy là **gateway**.

**Ví dụ cross-account** (cũng là lời giải bài tập 2 ở §14). Account A có bucket mã hoá SSE-KMS, user ở account B cần đọc. Đọc một object SSE-KMS gồm hai việc: S3 trả object đã mã hoá, và KMS giải mã data key. Nên phải mở **hai cánh cửa**, mỗi cửa hai phía:

```
Phía account A (chủ dữ liệu):
  1. Bucket policy: Allow s3:GetObject cho principal của account B
  2. Key policy:    Allow kms:Decrypt  cho principal của account B
                    (key phải là customer managed key — AWS managed key không sửa policy được)

Phía account B (người đọc):
  3. IAM policy của user: Allow s3:GetObject trên ARN bucket của A
  4. IAM policy của user: Allow kms:Decrypt  trên ARN key của A
```

Thiếu bước 2 hoặc 4 thì user B nhận `AccessDenied` dù đã thấy object trong danh sách. Đây là lỗi kinh điển khi chia sẻ dữ liệu mã hoá.

**3. Grants — "giấy uỷ quyền" cấp bằng API.** Policy là văn bản JSON bạn phải sửa tay. **Grant** là một bản ghi cấp quyền gắn vào key, tạo bằng lệnh `CreateGrant` và xoá bằng một lệnh khác, **không đụng tới key policy hay IAM policy**. Mỗi grant nói: *principal này* (grantee) được làm *các thao tác này* (ví dụ `Decrypt`, `GenerateDataKey`) trên *đúng một key này*. Grant khác policy ở ba điểm:

- **Chỉ cho phép, không cấm được.** Không có grant kiểu `Deny`.
- **Tạo và huỷ bằng code, theo từng việc.** Tạo khi cần, huỷ khi xong. Huỷ có hai cách: *retire* (chính bên được uỷ quyền tự trả lại khi xong việc) và *revoke* (admin của key thu hồi).
- **Ai tạo được?** Principal có quyền `kms:CreateGrant` trên key. Quyền này mạnh gần bằng quyền sửa key policy, nên chỉ cấp cho role cần thiết.

Người dùng grant nhiều nhất không phải bạn mà là **các dịch vụ AWS**. Ví dụ với EBS: khi bạn gắn một volume mã hoá vào EC2 instance, EC2 dùng quyền của bạn để tạo một grant trên KMS key, cho phép nó giải mã data key của volume đó. Grant chỉ tồn tại chừng nào còn cần; xong việc thì được retire. Tương tự, RDS tạo một grant lúc tạo DB instance và dùng nó suốt vòng đời instance; Auto Scaling cần grant trên CMK để tự launch instance có volume mã hoá.

> Bẫy thi: Auto Scaling group không launch được instance, lỗi liên quan tới KMS, volume dùng **customer managed key** → service-linked role của Auto Scaling chưa được phép dùng key. Sửa bằng cách thêm role đó vào key policy (cùng account) hoặc **tạo grant** cho nó (key ở account khác).

Một chi tiết vận hành: grant mới tạo cần vài giây (có khi vài phút) mới lan ra toàn hệ thống KMS. Muốn dùng ngay thì truyền kèm **grant token** mà `CreateGrant` trả về.

**Khi nào dùng cái nào:**

| Cần gì | Dùng |
|--------|------|
| Quy định dài hạn ai là admin, ai là user của key; cho phép account khác | **Key policy** |
| Cấp quyền cho user/role trong cùng account theo cách quản lý IAM quen thuộc | **IAM policy** (với điều kiện key policy đã uỷ quyền cho account) |
| Quyền tạm thời, theo từng resource, cấp và thu hồi bằng code; dịch vụ AWS dùng key thay bạn | **Grant** |

### 3.6 Rotation

Đây là mục hay bị nhớ sai nhất. Nhiều tài liệu cũ ghi "KMS rotate **mỗi năm, không đổi được**" — điều đó **không còn đúng**.

| Kiểu rotation | Cơ chế | Con số cần nhớ |
|---------------|--------|----------------|
| **Automatic rotation** (customer managed key) | KMS sinh key material mới, giữ lại toàn bộ material cũ | Chu kỳ **cấu hình được: 90 – 2560 ngày**, mặc định **365 ngày** |
| **On-demand rotation** | Gọi `RotateKeyOnDemand` để rotate ngay, không chờ hết chu kỳ | Tối đa **25 lần on-demand / key** (không tính lần tự động) |
| **AWS managed key** | AWS tự lo | Rotate tự động, bạn không chỉnh chu kỳ được |
| **Manual rotation** (alias swap) | Bạn tạo **key mới** rồi trỏ alias sang; muốn dữ liệu cũ dùng key mới thì phải **re-encrypt** (`ReEncrypt`) | Key ID **đổi** → mọi thứ tham chiếu key ID phải cập nhật |

Cơ chế của automatic/on-demand rotation:

- Key material mới chỉ dùng để **encrypt dữ liệu mới**. Material cũ **vẫn nằm trong key** để decrypt ciphertext cũ → **không phải re-encrypt gì cả**.
- **Key ID, key ARN, alias, key policy, grants đều không đổi** → app không phải sửa dòng code nào. Đây là lý do automatic rotation gần như luôn là đáp án khi đề nói "rotate key **without changing application**" / "without re-encrypting existing data".
- Ngược lại, khi đề nói "key material phải **hoàn toàn mới** và dữ liệu cũ phải được mã hoá lại bằng key mới" → đó là **manual rotation** (key mới + `ReEncrypt`), không phải automatic.

**Không rotate tự động được** (bẫy hay gặp): chỉ **symmetric encryption KMS key** hỗ trợ automatic rotation. Các loại sau **không**:

| Loại key | Vì sao không |
|----------|--------------|
| **Asymmetric** (RSA/ECC) | Public key đã phát ra ngoài; đổi material sẽ phá verify/encrypt phía client |
| **HMAC key** | Không hỗ trợ |
| **Imported key material (BYOK)** | Material do bạn cấp → bạn tự import material mới, KMS không sinh giúp |
| **Key trong custom key store** (CloudHSM / External Key Store) | Material nằm ngoài KMS |

> **Multi-Region key thì rotate được** (đừng nhầm): MRK symmetric origin `AWS_KMS` hỗ trợ cả automatic
> lẫn on-demand rotation. Chỉ khác ở chỗ bật/khởi tạo trên **primary key**, rồi KMS đồng bộ key material
> sang mọi replica trước khi dùng. Imported key material (`EXTERNAL`) thì không automatic nhưng **có**
> on-demand.

> Bẫy thi: "compliance bắt rotate key **mỗi 90 ngày**" → **được**, đặt chu kỳ automatic rotation = 90 ngày (cận dưới của dải 90–2560). Đáp án "phải viết Lambda tự tạo key mới mỗi 90 ngày" là đáp án lỗi thời.

> Bẫy thi 2: key đang dùng là **imported key material** mà đề đòi "enable automatic rotation" → không làm được; hoặc import material mới thủ công, hoặc chuyển sang KMS-generated key.

### 3.7 Multi-region keys

**Vấn đề.** KMS key bình thường là **single-Region**: key tạo ở `us-east-1` chỉ tồn tại ở `us-east-1`. Nếu bạn tự tạo "hai key giống nhau" ở hai Region thì thực ra đó là **hai key hoàn toàn khác nhau**, key material khác, key ID khác. Dữ liệu mã hoá ở Region A mang sang Region B thì key ở B không giải mã được. Muốn đọc ở B bạn phải gọi ngược về KMS ở A (thêm độ trễ, và A sập là hết đọc), hoặc giải mã rồi mã hoá lại bằng key của B.

**Multi-Region key (MRK) giải quyết thế nào.** Bạn tạo một **primary key** ở một Region rồi **replicate** nó sang Region khác thành **replica key**. Cả nhóm dùng **chung key material và chung key ID** (key ID có tiền tố `mrk-`), nên ciphertext mã hoá ở Region nào cũng giải mã được ở Region còn lại **ngay tại chỗ**, không gọi chéo Region, không mã hoá lại.

| | Hai key single-Region riêng | Multi-Region key |
|--|------------------------------|------------------|
| Key material | Khác nhau | **Giống nhau** |
| Key ID | Khác nhau | **Giống nhau** (`mrk-…`), chỉ khác phần Region trong ARN |
| Mã hoá ở A, giải mã ở B | Không được | **Được**, tại chỗ |
| Key policy, grants, alias, bật/tắt | Riêng từng key | **Vẫn riêng từng key** — KMS không đồng bộ các thứ này |
| Rotation | Riêng | Bật trên primary, KMS đồng bộ material mới sang replica |

Ba điều dễ hiểu sai:

- **MRK không phải key "global".** Nó chỉ có mặt ở những Region bạn chủ động replicate tới. AWS không tự replicate hộ.
- **Không convert được.** Key single-Region không đổi thành MRK được (và ngược lại); phải tạo MRK mới rồi mã hoá lại dữ liệu.
- **Đánh đổi bảo mật.** Cùng một key material nằm ở nhiều Region nghĩa là bề mặt tấn công rộng hơn và phá vỡ tính cô lập theo Region. AWS khuyên vẫn dùng single-Region key cho đa số trường hợp.

**Use case**: disaster recovery (Region dự phòng tự giải mã được dữ liệu sao lưu), ứng dụng active-active nhiều Region, và dữ liệu **mã hoá phía client** di chuyển giữa các Region.

> Bẫy thi: "S3 Cross-Region Replication với SSE-KMS bắt buộc phải dùng Multi-Region key" → **Sai**. S3 CRR giải mã bằng key Region nguồn rồi mã hoá lại bằng key Region đích, key đích là key single-Region bình thường cũng được (xem §10.2). MRK có giá trị nhất khi **chính ứng dụng** của bạn mã hoá/giải mã ở nhiều Region.

### 3.8 KMS pricing

Giá us-east-1, có hai khoản:

- **Tiền giữ key**: ~**$1 / key / tháng** cho mỗi customer managed key. Mỗi replica của MRK tính là một key. Bật rotation thì lần rotate thứ nhất và thứ hai mỗi lần cộng thêm $1/tháng, từ lần thứ ba trở đi không tăng nữa (tối đa $3/tháng/key). AWS managed key và AWS owned key không mất tiền giữ key.
- **Tiền request**: ~**$0.03 / 10.000 request** (`Encrypt`, `Decrypt`, `GenerateDataKey`…) với key đối xứng; ~$0.15 / 10.000 với RSA/ECC. Miễn phí 20.000 request đầu mỗi tháng.

Tiền giữ key hầu như không bao giờ là vấn đề. Thứ làm hoá đơn phình ra là **request**, vì các dịch vụ như S3 gọi KMS thay bạn mỗi lần đọc/ghi object:

```
3 key × $1                                  =  $3/tháng
5.000.000 request × $0.03 / 10.000          = $15/tháng     ← app nhỏ: không đáng kể

2.000 request/giây liên tục
  = 172.800.000 request/ngày × $0.03/10.000 = $518,40/ngày  ← ~$15.500/tháng
```

Cách hạ con số thứ hai xuống (S3 Bucket Keys, cache data key) nằm ở §11.

---

## 4. CloudHSM

**Nó là gì.** §3.1 đã nói KMS chạy trên một đội **HSM** (thiết bị phần cứng giữ khoá, không cho đọc khoá ra) mà AWS vận hành và **mọi khách hàng dùng chung**. **CloudHSM** là dịch vụ cho bạn thuê **HSM riêng**: thiết bị chỉ phục vụ một mình bạn (single-tenant), đặt trong VPC của bạn, và **chỉ bạn có tài khoản đăng nhập vào HSM**. AWS lo phần cứng, cấp phát, vá lỗi và backup, nhưng không có credential để dùng khoá bên trong.

Khác biệt gốc so với KMS là **ai kiểm soát lớp truy cập khoá**. Với KMS, AWS kiểm soát HSM và bạn điều khiển qua IAM/key policy. Với CloudHSM, bạn tự tạo user trên HSM, tự quản khoá, tự dựng cluster đủ số node; đổi lại nếu bạn làm mất credential thì AWS cũng không cứu được.

Ba thuật ngữ trong bảng bên dưới:

- **Single-tenant vs multi-tenant**: thiết bị dành riêng cho một khách hàng, so với thiết bị dùng chung nhiều khách hàng (tách nhau bằng phần mềm). Một số quy định hoặc hợp đồng ghi thẳng "khoá phải nằm trên HSM dành riêng"; khi đó KMS không đáp ứng được dù cùng cấp FIPS.
- **FIPS 140 Level 3**: xem §3.1. KMS và CloudHSM đều đạt Level 3 (CloudHSM: 140-2 hoặc 140-3 tuỳ loại HSM, khi cluster chạy FIPS mode).
- **PKCS#11, JCE, OpenSSL, CNG/KSP**: các **giao diện lập trình chuẩn của ngành** để phần mềm nói chuyện với HSM (PKCS#11 là chuẩn chung cho C; JCE cho Java; CNG/KSP cho Windows). Phần mềm có sẵn như Oracle Database TDE, web server cần offload TLS, hệ thống PKI on-prem đều nói các chuẩn này chứ **không biết gọi API KMS**. Đưa chúng lên AWS mà không viết lại thì cần CloudHSM.

### Khi nào CloudHSM thay KMS

| Yêu cầu | KMS | CloudHSM |
|---------|-----|----------|
| FIPS 140 Level 3 (HSM validated) | ✓ (140-2 Level 3 từ 2023 theo đề thi; nay là 140-3) | ✓ |
| **Single-tenant** HSM (dành riêng cho bạn) | ✗ (multi-tenant) | ✓ |
| Bạn quản lý key material 100% (AWS không thấy) | Chỉ một phần, qua BYOK (import key material) hoặc External Key Store | ✓ |
| Ai vận hành | AWS lo toàn bộ, không có gì để quản | AWS lo phần cứng, vá lỗi, backup; **bạn lo** user trên HSM, khoá, số HSM và phân bố AZ để có HA |
| Compliance | Đã nằm trong phạm vi PCI DSS, SOC, FedRAMP, HIPAA — đủ cho phần lớn yêu cầu | Khi quy định/hợp đồng ghi rõ **HSM dành riêng** (bài tập 6 lấy ví dụ PCI-DSS; Common Criteria cũng hay được nhắc) |
| PKCS#11 / JCE / OpenSSL standard API | ✗ (chỉ API của KMS) | ✓ |
| Tích hợp sẵn với S3, EBS, RDS… | ✓ Bấm chọn là xong | ✗ Không trực tiếp; phải đi qua *custom key store* bên dưới |

### Trade-off

- **Chi phí**: trả theo giờ cho từng HSM, chạy hay không cũng tính. Trang giá KMS lấy ví dụ **~$1,60/giờ/HSM** ở us-east-1 (các tài liệu cũ ghi ~$1,45–1,5). Một HSM đơn lẻ **không có HA**; cần **ít nhất 2 HSM ở 2 AZ**:

```
2 HSM × $1,60/giờ × 730 giờ ≈ $2.336/tháng   (mức sàn, chưa có request nào)
So với KMS: 1 key × $1/tháng + tiền request
```

- **Vận hành**: bạn quản user và khoá trên HSM, cài client SDK lên từng máy ứng dụng, tự thêm HSM khi tải tăng.
- **Không tích hợp sâu** với dịch vụ AWS như KMS.
- **Use case**: quy định bắt buộc HSM dành riêng; phần mềm cần PKCS#11/JCE; thuật toán hoặc loại khoá KMS không hỗ trợ; offload TLS cho web server; Oracle TDE.

### KMS custom key store

Muốn vừa có **khoá nằm trên HSM riêng** vừa dùng được **tích hợp sẵn của KMS** với S3/EBS/RDS thì dùng **custom key store**: bạn tạo KMS key như thường, nhưng key material của nó được sinh và cất trong **cluster CloudHSM của bạn** thay vì trong đội HSM chung của KMS. Ứng dụng và dịch vụ AWS vẫn gọi API KMS; KMS chuyển phép tính xuống cluster của bạn.

Cái giá: bạn vẫn trả tiền cluster CloudHSM, cluster sập thì mọi key trong store không dùng được, và thông lượng thấp hơn hẳn — mỗi custom key store bị giới hạn **1.800 request/giây** (không nâng được), so với 10.000 trở lên của KMS thường. Key trong custom key store cũng **không automatic rotation** được (§3.6).

Có một biến thể nữa là **External Key Store (XKS)**: key material nằm ở HSM **ngoài AWS** (on-prem hoặc nhà cung cấp khác), dành cho yêu cầu "khoá không được nằm trên hạ tầng AWS".

> Bẫy thi: "cần HSM **dành riêng** / single-tenant" hoặc "cần PKCS#11" → **CloudHSM**. "Cần HSM dành riêng **và** vẫn dùng SSE-KMS cho S3/EBS" → **KMS custom key store backed by CloudHSM**. Chỉ nói "FIPS 140-2 Level 3" mà không nhắc dành riêng → **KMS là đủ** và rẻ hơn cả nghìn lần.

---

## 5. Encryption ở từng service

Mọi dịch vụ dưới đây đều dùng envelope encryption của §3.4: dịch vụ xin KMS một data key, tự mã hoá dữ liệu bằng data key đó, và cất bản data key đã mã hoá bên cạnh dữ liệu. Thứ thay đổi giữa các dịch vụ chỉ là **bật lúc nào**, **dùng key nào** và **có bật sau được không**.

### 5.1 S3

S3 có bốn kiểu **server-side encryption** (SSE: bạn gửi dữ liệu thường lên, S3 mã hoá trước khi ghi đĩa và giải mã khi bạn đọc) và một kiểu **client-side** (bạn mã hoá trước khi gửi). Chúng khác nhau ở chỗ **ai giữ khoá**:

- **SSE-S3** (header `AES256`): S3 tự sinh và tự giữ khoá. Bạn không thấy khoá, không cấu hình gì, không tốn thêm tiền. Mặc định của mọi bucket.
- **SSE-KMS** (header `aws:kms`): khoá là một KMS key. Lợi ích so với SSE-S3 là **hai lớp quyền** và **log theo từng lần dùng khoá**. Muốn đọc object, người đọc cần cả `s3:GetObject` lẫn `kms:Decrypt`; lỡ bucket policy mở nhầm thì người ngoài vẫn không giải mã được. Và mỗi lần S3 gọi KMS để giải mã, CloudTrail ghi một event: *ai*, *lúc nào*, *dùng key nào*, *cho object nào*. "Audit per key access" nghĩa là vậy. Cái giá là mỗi request S3 kéo theo một request KMS (tiền và quota — xem §11).
- **DSSE-KMS** (header `aws:kms:dsse`): mã hoá **hai lớp AES-256 chồng nhau**. Lớp một dùng data key do KMS sinh; lớp hai mã hoá tiếp kết quả bằng một khoá riêng do S3 quản. Vẫn chỉ dùng **một KMS key** — "dual" là hai *lớp mã hoá*, không phải hai KMS key. Dùng khi quy định ghi rõ **"dữ liệu phải được mã hoá nhiều lớp"** (thường gặp ở khối chính phủ/quốc phòng Mỹ). Đắt hơn và chậm hơn SSE-KMS một chút, và **không dùng được S3 Bucket Keys**.
- **SSE-C** (customer-provided key): **bạn gửi khoá kèm theo từng request**. S3 dùng khoá đó mã hoá/giải mã rồi **vứt đi, không lưu**. Bạn tự giữ khoá ở đâu đó; mất khoá là mất dữ liệu. Bắt buộc HTTPS. Hiếm dùng.
- **Client-side**: bạn mã hoá bằng SDK trước khi upload. S3 chỉ nhận được ciphertext, AWS không bao giờ thấy plaintext.

| Method | Ai giữ khoá | Được gì | Mất gì |
|--------|-------------|---------|--------|
| **SSE-S3** (`AES256`) | S3 | Mặc định, không cấu hình, không phí KMS | Không có lớp quyền thứ hai, không log theo lần dùng khoá |
| **SSE-KMS** (`aws:kms`) | KMS key (AWS managed hoặc CMK) | Thêm lớp quyền `kms:Decrypt`, CloudTrail ghi từng lần dùng khoá, tự chọn rotation (với CMK) | Mỗi request S3 = 1 request KMS: ~$0.03/10.000 và ăn vào quota |
| **SSE-C** (customer-provided key) | Bạn, gửi theo từng request | Khoá không nằm ở AWS | Tự quản khoá, mất khoá = mất dữ liệu |
| **DSSE-KMS** (dual-layer) | 1 KMS key + 1 khoá do S3 quản (2 lớp mã hoá) | Đáp ứng quy định "mã hoá nhiều lớp" | Đắt/chậm hơn SSE-KMS, không có Bucket Keys |
| **Client-side** | Bạn (hoặc KMS qua SDK) | E2E, AWS không thấy plaintext | Tự viết code mã hoá, S3 không giúp được gì với nội dung |

- **2023+**: SSE-S3 bật mặc định cho mọi bucket mới. Không còn object "không mã hoá" trên S3; câu hỏi chỉ còn là mã hoá bằng khoá nào.
- Bucket policy bắt buộc mọi object upload phải dùng SSE-KMS (từ chối `PutObject` nào không khai header `aws:kms`):
```json
{
  "Effect": "Deny",
  "Action": "s3:PutObject",
  "Resource": "arn:aws:s3:::bucket/*",
  "Condition": { "StringNotEquals": { "s3:x-amz-server-side-encryption": "aws:kms" } }
}
```

#### 5.1.1 S3 Block Public Access (BPA) và Access Points

Encryption bảo vệ data at rest, nhưng data leak lớn nhất của S3 lịch sử là **bucket public vô tình**. **Block Public Access** là lớp chặn cứng, đứng **trên** mọi ACL và bucket policy.

**4 setting BPA** (2 nhóm — ACL và Policy):

| Setting | Chặn gì |
|---------|---------|
| **BlockPublicAcls** | Từ chối *request tạo/đặt* ACL public (chặn ngay lúc PUT) |
| **IgnorePublicAcls** | *Bỏ qua* mọi ACL public đang tồn tại (coi như không có) |
| **BlockPublicPolicy** | Từ chối *đặt* bucket policy cấp quyền public |
| **RestrictPublicBuckets** | Nếu policy đã public, *hạn chế* chỉ AWS service principal và authorized user trong **chính account chủ bucket** được access (chặn cross-account) |

- **Mặc định BẬT cả 4 từ tháng 4/2023** cho mọi bucket mới (kèm ACL disabled). Muốn public thật sự phải chủ động tắt.
- Có **account-level override**: bật BPA ở cấp account thì áp cho **toàn bộ bucket**, kể cả bucket bật public riêng — account-level thắng.
- Quan hệ với **Object Ownership 'Bucket owner enforced'**: setting này **disable ACL hoàn toàn** — mọi object thuộc bucket owner, ACL bị vô hiệu, quyền chỉ còn qua IAM/bucket policy. Đây là default khuyến nghị của AWS; khi ACL đã tắt thì 2 setting ACL của BPA gần như không còn tác dụng gì để lo.

> Bẫy thi: bucket policy `Allow` `s3:GetObject` cho `Principal: "*"` (public) nhưng **BlockPublicPolicy / RestrictPublicBuckets vẫn bật** → object **vẫn không public**. BPA đứng trên bucket policy; policy allow public không thắng được BPA.

**Khi nào dùng S3 Access Points** (thay vì mở bucket rộng): khi một bucket lớn được **nhiều ứng dụng/team share** và bạn muốn **least-privilege per-consumer**. Mỗi Access Point có hostname riêng + **access point policy** riêng, gắn network origin (VPC-only hoặc Internet). Thay vì nhồi một bucket policy khổng lồ khó audit, mỗi team dùng access point của mình với quyền hẹp. BPA cũng cấu hình được **per access point**.

> Chia sẻ an toàn theo thứ tự ưu tiên: Object Ownership *Bucket owner enforced* (tắt ACL) → BPA bật → cấp quyền hẹp qua **Access Point** thay vì bucket policy rộng.

### 5.2 EBS

**Mã hoá diễn ra ở đâu.** Trên **máy chủ vật lý chạy EC2 instance**, trước khi dữ liệu đi xuống hệ thống lưu trữ. Vì vậy bật mã hoá cho một volume là được cả bốn thứ cùng lúc: dữ liệu nằm trên volume, dữ liệu **đang chạy giữa instance và volume**, mọi snapshot chụp từ volume, và mọi volume tạo lại từ các snapshot đó. Hệ điều hành trong instance không biết gì và không phải cấu hình gì.

**"Snapshot follow volume"** nghĩa là trạng thái mã hoá **di truyền** và **một chiều**: snapshot của volume mã hoá thì luôn mã hoá (cùng KMS key); volume tạo từ snapshot mã hoá thì luôn mã hoá. **Không gỡ mã hoá được** khỏi volume hay snapshot đã mã hoá.

**Mã hoá một volume đang chạy thế nào?** Không bật tại chỗ được, vì dữ liệu cũ đã nằm trên đĩa dạng plaintext; muốn mã hoá phải ghi lại toàn bộ sang chỗ mới. Quy trình:

```
1. Chụp snapshot volume cũ (chưa mã hoá)
2. Tạo volume MỚI từ snapshot đó, tick "Encrypt" + chọn KMS key
   (hoặc: copy snapshot kèm tuỳ chọn mã hoá, rồi tạo volume từ bản copy)
3. Dừng instance → gỡ volume cũ → gắn volume mới vào đúng device name → chạy lại
```

Đổi KMS key của một volume cũng đi đường này: copy snapshot và chọn key khác lúc copy.

**Encryption by default.** Là một công tắc **theo từng Region của account**. Bật lên thì mọi volume **mới** và mọi bản copy snapshot ở Region đó tự mã hoá (mặc định bằng AWS managed key `aws/ebs`, đổi sang CMK được). Hai điều cần nhớ: nó **không đụng** tới volume và snapshot đã có, và phải bật **ở từng Region** bạn dùng.

**Boot (root) volume.** Root volume sinh ra từ snapshot nằm trong AMI. Muốn nó mã hoá thì có ba đường: bật encryption by default (mọi volume lúc launch đều mã hoá, kể cả khi AMI chưa mã hoá); chỉ định mã hoá cho root volume ngay lúc launch; hoặc **copy AMI kèm tuỳ chọn mã hoá** để có AMI mã hoá sẵn.

**Chia sẻ snapshot mã hoá sang account khác:**

- Snapshot mã hoá bằng **AWS managed key `aws/ebs` không chia sẻ được**. Lý do đã nói ở §3.2: key policy của AWS managed key không sửa được nên không thêm account kia vào.
- Phải mã hoá bằng **customer managed key**, rồi chia sẻ **cả hai thứ**: quyền trên snapshot **và** quyền dùng KMS key (qua key policy). Account nhận nên copy snapshot ra bằng key của chính họ để không phụ thuộc key của bạn.
- Snapshot mã hoá **không public được**; chỉ snapshot không mã hoá mới chia sẻ công khai được.

### 5.3 RDS / Aurora

**Mã hoá gì.** Bật mã hoá cho một DB instance là mã hoá storage bên dưới, log, **automated backup, snapshot và read replica** của nó — tất cả bằng cùng một KMS key (`aws/rds` hoặc CMK). Ứng dụng không phải đổi gì.

**Chỉ chọn được lúc tạo.** Lý do giống EBS: mã hoá nằm ở tầng storage, dữ liệu đã ghi dạng plaintext thì không "bật" tại chỗ được mà phải ghi lại sang storage mới. Một khi đã mã hoá thì cũng **không tắt được** và **không đổi key được**. Đường vòng chuẩn để mã hoá một instance đang chạy:

```
1. Chụp snapshot instance (snapshot này chưa mã hoá)
2. COPY snapshot, tick "Enable encryption" + chọn KMS key   → snapshot đã mã hoá
3. Restore snapshot đã mã hoá thành instance MỚI
4. Trỏ ứng dụng sang endpoint mới, xoá instance cũ
```

Cách này có **downtime ghi**: dữ liệu ghi vào instance cũ sau bước 1 sẽ không có ở instance mới, nên phải dừng ghi từ bước 1 tới bước 4. Muốn downtime ngắn (lời giải bài tập 3) thì giữ instance cũ chạy và đồng bộ liên tục sang instance mã hoá mới, rồi mới chuyển: dùng **AWS DMS** với change data capture, hoặc **RDS Blue/Green Deployment** (tài liệu RDS hiện ghi blue/green dùng được để mã hoá một instance chưa mã hoá). Không dùng read replica cho việc này được, vì quy tắc ngay dưới đây.

**Quy tắc replica và snapshot:**

- Replica **kế thừa** trạng thái mã hoá của primary: không có replica mã hoá của primary chưa mã hoá, và không có replica chưa mã hoá của primary đã mã hoá.
- Replica **cùng Region** dùng **cùng KMS key** với primary. Replica **khác Region** phải chỉ định một KMS key **ở Region đích**, vì KMS key là tài nguyên theo Region.
- Copy snapshot mã hoá sang Region khác: cũng phải chọn KMS key ở Region đích.
- Snapshot mã hoá bằng AWS managed key `aws/rds` **không chia sẻ cross-account được** (cùng lý do với EBS) → dùng CMK.

**In transit**: RDS hỗ trợ TLS cho kết nối từ app tới DB. Tải CA bundle của AWS về, cấu hình client bật SSL (ví dụ `sslmode=verify-full` với PostgreSQL). Muốn ép buộc thì đặt tham số phía DB như `rds.force_ssl`.

**Transparent Data Encryption (TDE)**: tính năng mã hoá **của chính database engine** (Oracle, SQL Server), mã hoá file dữ liệu ở tầng engine. Độc lập với mã hoá storage bằng KMS và dùng chồng lên nhau được. Chỉ chọn khi đề nêu rõ yêu cầu TDE của Oracle/SQL Server.

> Bẫy thi: nếu **disable hoặc xoá KMS key** của một DB instance, RDS mất quyền đọc storage và instance rơi vào trạng thái không truy cập được. Xoá key là xoá khả năng đọc mọi thứ đã mã hoá bằng nó — đó là lý do KMS bắt chờ 7–30 ngày trước khi xoá key thật.

### 5.4 DynamoDB

DynamoDB **luôn mã hoá at rest và không tắt được**: bảng, index, stream, backup, global table đều mã hoá. Bạn chỉ chọn **loại key**, và đổi qua lại bất cứ lúc nào mà không downtime:

| Loại key | Phí | Khi nào chọn |
|----------|-----|--------------|
| **AWS owned key** (mặc định) | Miễn phí | Chỉ cần "có mã hoá". Không có log dùng khoá |
| **AWS managed key** (`aws/dynamodb`) | Phí request KMS | Muốn thấy việc dùng khoá trong CloudTrail |
| **Customer managed key** | $1/tháng + phí request | Cần tự viết key policy, điều khiển rotation, hoặc khả năng thu hồi key |

Mã hoá trong suốt với ứng dụng: query, scan, độ trễ không đổi.

> Bài này trước đây ghi mặc định là "AWS managed key". Docs hiện tại ghi mặc định là **AWS owned key**. Trong đề thi, ý đúng cần nhớ vẫn là: *DynamoDB mã hoá at rest mặc định, không cần bật và không tắt được.*

### 5.5 EFS / FSx

- **EFS at rest**: chọn **lúc tạo** file system, sau đó **không đổi được**. Tạo bằng console thì mã hoá bật sẵn; tạo bằng CLI/API/SDK thì phải bật tường minh. Muốn mã hoá một file system chưa mã hoá: tạo file system mới có mã hoá rồi chuyển dữ liệu sang (EFS replication hoặc DataSync). Ép buộc toàn tổ chức bằng condition key `elasticfilesystem:Encrypted` trong IAM policy hoặc SCP.
- **EFS in transit**: không tự có. Bạn bật ở **phía client lúc mount**, dùng EFS mount helper với tuỳ chọn `-o tls`. Helper dựng một đường hầm TLS giữa EC2 và EFS.
- **FSx**: cũng mã hoá at rest bằng KMS key chọn lúc tạo file system.

> Bẫy thi: "EFS đã bật encryption at rest, vậy dữ liệu trên đường truyền cũng được mã hoá" → **Sai**. Hai thứ độc lập; in transit phải mount với `tls`.

### 5.6 SQS / SNS / Kinesis / MSK

Bốn dịch vụ messaging cùng một ý: **at rest là tuỳ chọn KMS** (trừ chỗ ghi khác bên dưới), **in transit là HTTPS/TLS của endpoint**. Khác nhau ở mặc định:

| Dịch vụ | At rest | Ghi chú |
|---------|---------|---------|
| **SQS** | Queue mới mặc định bật **SSE-SQS** (khoá do SQS quản, miễn phí). Đổi sang **SSE-KMS** nếu cần key policy riêng/audit | Chỉ mã hoá **thân message**; tên queue, message ID, attribute không mã hoá |
| **SNS** | **Tuỳ chọn**, bật bằng cách gán một KMS key cho topic | Cũng chỉ mã hoá thân message |
| **Kinesis Data Streams** | **Tuỳ chọn**, bật SSE với KMS key (`aws/kinesis` hoặc CMK) | Chỉ mã hoá record ghi vào **sau khi bật**; record cũ giữ nguyên |
| **MSK** | **Luôn mã hoá** at rest (AWS managed key nếu bạn không chỉ định CMK) | In transit: TLS giữa các broker bật mặc định; giữa client và broker mặc định chỉ nhận TLS, có thể nới ra cho phép plaintext |

Với SQS và SNS dùng SSE-KMS, dịch vụ **không gọi KMS cho từng message**. Nó giữ lại một data key và dùng lại trong một khoảng thời gian gọi là *data key reuse period* (SQS: mặc định **5 phút**, chỉnh được từ 1 phút tới 24 giờ). Đây chính là kỹ thuật "cache data key" của §11: kéo dài khoảng này thì ít request KMS hơn, đổi lại data key sống lâu hơn.

> Bẫy thi: SNS topic hoặc S3 event gửi vào một **SQS queue mã hoá SSE-KMS** mà message không tới → dịch vụ gửi không có quyền dùng key. AWS managed key `aws/sqs` không sửa policy được, nên phải dùng **CMK** và thêm service principal (ví dụ `sns.amazonaws.com`) vào key policy với `kms:GenerateDataKey` và `kms:Decrypt`.

### 5.7 Lambda

- **Environment variable luôn được mã hoá at rest.** Mặc định Lambda dùng AWS managed key (`aws/lambda`), không tốn phí và không cần cấu hình. Chọn **CMK** khi muốn kiểm soát ai xem được: lúc đó chỉ user có `kms:Decrypt` trên key mới đọc/sửa được biến trong console.
- **Mã hoá at rest không có nghĩa là bí mật.** Lambda giải mã biến lúc khởi động function, và bất kỳ ai có quyền xem cấu hình function (cùng quyền dùng key mặc định) đều thấy giá trị dạng chữ thường trong console. Giá trị cũng nằm trong mọi bản sao cấu hình: CloudFormation template, Terraform state, lịch sử deploy.
- **Best practice**: env var chỉ giữ **tên/ARN của secret**. Giá trị thật để ở **Secrets Manager** hoặc **Parameter Store**, function đọc lúc chạy bằng execution role và cache lại trong bộ nhớ (lời giải bài tập 4 — chi tiết ở §6).

---

## 6. Secrets Manager vs Parameter Store

Cả hai đều trả lời câu hỏi của §1: *secret để ở đâu nếu không để trong code?* Ý tưởng chung: secret nằm trong một dịch vụ AWS, **mã hoá bằng KMS**, và ứng dụng **gọi API lấy lúc chạy** bằng IAM role của nó. Trong code chỉ còn *tên* của secret. Đổi mật khẩu thì sửa một chỗ, không phải build lại app; và CloudTrail ghi ai đã đọc secret nào.

**SSM Parameter Store** là kho **cấu hình** dạng key–value có phân cấp theo đường dẫn (`/prod/db/host`, `/prod/feature/new-checkout`). Mỗi parameter là `String`, `StringList`, hoặc **`SecureString`** (giá trị được mã hoá bằng KMS). Nó chỉ *cất* giá trị; không biết giá trị đó là mật khẩu của hệ thống nào và không tự đổi được.

**Secrets Manager** là kho chuyên cho **secret**, hơn Parameter Store ở ba việc: **tự rotate** (tự đổi mật khẩu trên database rồi cập nhật secret), **tự sinh mật khẩu ngẫu nhiên**, và **replicate secret sang Region khác**.

### 6.1 Rotation chạy thế nào

"Rotate" một mật khẩu DB không chỉ là sửa giá trị trong kho: mật khẩu **trên database** cũng phải đổi theo, và hai việc phải khớp nhau. Secrets Manager làm việc đó bằng một **hàm Lambda rotation** (AWS có sẵn template cho RDS, Aurora, Redshift, DocumentDB), chạy theo lịch bạn đặt — thưa nhất 999 ngày một lần, dày nhất **4 giờ một lần**.

Mỗi secret có nhiều *version*, đánh dấu bằng nhãn: **`AWSCURRENT`** (bản app đang lấy), **`AWSPENDING`** (bản mới đang thử), **`AWSPREVIOUS`** (bản vừa bị thay). Một lần rotate đi bốn bước:

| Bước | Lambda làm gì |
|------|----------------|
| 1. `createSecret` | Sinh mật khẩu mới, lưu thành một version gắn nhãn `AWSPENDING`. App vẫn nhận bản `AWSCURRENT` cũ |
| 2. `setSecret` | Đăng nhập vào database và **đổi mật khẩu** của user thành giá trị `AWSPENDING` |
| 3. `testSecret` | Thử kết nối database bằng mật khẩu mới để chắc chắn nó chạy |
| 4. `finishSecret` | Chuyển nhãn `AWSCURRENT` sang version mới; bản cũ thành `AWSPREVIOUS` |

**App có bị đứt kết nối không?** Kết nối **đang mở** không bị ngắt; mật khẩu chỉ được kiểm lúc mở kết nối mới. Rủi ro nằm ở khe hẹp giữa bước 2 và bước 4: database đã nhận mật khẩu mới nhưng app hỏi Secrets Manager vẫn được trả mật khẩu cũ. Kết nối mới mở đúng lúc đó sẽ bị từ chối. Có hai cách xử lý:

- **Single user** (mặc định, đủ cho đa số): chấp nhận khe hẹp đó, app **retry** khi gặp lỗi xác thực và đọc lại secret.
- **Alternating users** (cho app cần sẵn sàng cao): secret luân phiên giữa **hai user** database có quyền như nhau (`app` và `app_clone`). Mỗi lần rotate chỉ đổi mật khẩu của user **đang không được dùng**, nên mật khẩu app đang cầm luôn còn hiệu lực. Cần thêm một secret chứa credential superuser để Lambda tạo/sửa user thứ hai.

Hai điều kiện hay bị quên: Lambda rotation phải **kết nối mạng được tới database** (cùng VPC/subnet và security group cho phép) và tới endpoint Secrets Manager (NAT hoặc VPC endpoint). Và app **không được cache secret vô thời hạn** — cache vài phút, gặp lỗi xác thực thì đọc lại.

Với master password của RDS/Aurora còn có **managed rotation**: bật "manage master user password in Secrets Manager" là RDS tự tạo secret và tự rotate, **không cần Lambda**.

### 6.2 Con số và chi phí

Giá us-east-1:

- **Secrets Manager**: ~**$0.40 / secret / tháng** + ~$0.05 / 10.000 lần gọi API. Giá trị tối đa **64 KB**.
- **Parameter Store Standard**: **miễn phí**, tối đa 10.000 parameter mỗi account mỗi Region, mỗi giá trị tối đa **4 KB**.
- **Parameter Store Advanced**: ~**$0.05 / parameter / tháng** + ~$0.05 / 10.000 lần gọi API; tối đa 100.000 parameter, giá trị tối đa **8 KB**; có thêm *parameter policy* (ví dụ tự hết hạn) và chia sẻ cross-account. Đã nâng lên Advanced thì không hạ về Standard được.

```
50 secret trong Secrets Manager:           50 × $0.40          = $20/tháng
50 parameter Standard:                                          = $0
50 parameter Advanced:                     50 × $0.05          = $2,50/tháng

Tiền gọi API phụ thuộc cách app đọc:
  20 instance, mỗi instance đọc lại 5 phút/lần
    = 20 × 12 × 730 = 175.200 call/tháng × $0.05/10.000        ≈ $0,88/tháng
  Đọc secret ở MỖI request, 200 request/giây
    = 518.400.000 call/tháng × $0.05/10.000                    ≈ $2.592/tháng
```

Dòng cuối là lý do phải **cache secret trong bộ nhớ** thay vì gọi API ở mỗi request.

### 6.3 Đặt cạnh nhau

| Feature | Secrets Manager | SSM Parameter Store |
|---------|----------------|---------------------|
| Rotation tự động | ✓ Built-in cho RDS, Aurora, Redshift, DocumentDB; secret khác thì tự viết Lambda | ✗ Không có. Phải tự viết Lambda/EventBridge đổi giá trị |
| Tự sinh mật khẩu ngẫu nhiên | ✓ | ✗ |
| Cross-region replication | ✓ | ✗ |
| Cost | ~$0.40 / secret / tháng + API | Free (Standard); ~$0.05 / parameter / tháng (Advanced) |
| Max size | 64 KB | 4 KB (Standard), 8 KB (Advanced) |
| Versioning | ✓ theo nhãn `AWSCURRENT` / `AWSPREVIOUS` | ✓ lưu lịch sử các version của parameter |
| KMS integration | ✓ luôn mã hoá | ✓ với kiểu `SecureString` |
| Use case | Production secret cần rotate | Config + secret không cần rotate |

Hai dịch vụ không loại trừ nhau: Parameter Store đọc được secret của Secrets Manager qua đường dẫn đặc biệt `/aws/reference/secretsmanager/<tên-secret>`, nên app có thể chỉ dùng một API.

### Patterns

- DB credential → **Secrets Manager** với auto-rotate Lambda (hoặc managed rotation của RDS).
- API token bên thứ 3 → Secrets Manager. Rotate được nếu bên thứ ba có API đổi token và bạn viết Lambda gọi nó.
- Feature flag, config → Parameter Store (`String`).
- License key → Parameter Store (`SecureString`): là secret nhưng không bao giờ đổi, nên không cần trả $0.40/tháng.

### Anti-pattern
- Env var hardcoded secret.
- Secret trong CloudFormation parameter (plaintext in template). Thay bằng *dynamic reference* `{{resolve:secretsmanager:...}}` để template chỉ chứa tên secret.
- Secret trong code repository (kể cả private).

> Bẫy thi: đề có chữ **"automatic rotation"** hoặc "rotate database credentials" → **Secrets Manager**. Đề nhấn **"lowest cost"** / "no additional charge" cho config hoặc secret không cần rotate → **Parameter Store** (SecureString).

---

## 7. Certificate Manager (ACM)

Một **TLS certificate** là tấm "chứng minh thư" của server: nó gắn một tên miền với một *public key*, và được một **CA (Certificate Authority)** ký xác nhận. Server giữ *private key* tương ứng. Trình duyệt tin certificate vì tin CA đã ký nó. ACM là dịch vụ cấp, cất và tự gia hạn certificate cho bạn.

### 7.1 ACM public

- Certificate do CA công khai của Amazon ký, **trình duyệt nào cũng tin**. **Miễn phí** khi dùng với các dịch vụ tích hợp:
  - CloudFront
  - ALB / NLB
  - API Gateway
  - App Runner
- **Auto-renew**: ACM tự gia hạn và tự thay certificate trên các dịch vụ trên, không ai phải nhớ ngày hết hạn.
- **Validation**: ACM phải kiểm bạn thật sự sở hữu tên miền. **DNS validation** (recommended) là thêm một bản ghi CNAME do ACM đưa; để yên bản ghi đó thì lần gia hạn sau tự qua. **Email validation** là bấm link trong email, và mỗi lần gia hạn phải bấm lại.
- **Không xuất được private key** — chỉ AWS service dùng. Đây là điều đề thi dựa vào: private key nằm trong ACM, bạn không tải về để cài lên EC2 hay server on-prem được.

> Docs hiện tại: từ **17/06/2025** ACM có thêm loại **exportable public certificate**. Bạn phải bật "Enable export" **lúc request** (certificate cấp trước ngày đó hoặc không bật thì vẫn không export được), và loại này **tính phí**: ~$7 cho mỗi tên miền, ~$79 cho mỗi tên wildcard, tính lúc cấp và mỗi lần gia hạn. Đề thi SAA-C03 và hầu hết tài liệu vẫn theo quy tắc cũ: **"ACM public certificate không export được → cần cert trên EC2/on-prem thì dùng Private CA hoặc import cert bên ngoài"**. Trả lời đề theo quy tắc cũ.

### 7.2 ACM Private CA

- **Bạn tự làm CA**: dựng một CA riêng của tổ chức và tự cấp certificate cho hệ thống nội bộ. Trình duyệt ngoài Internet **không tin** các certificate này; chỉ máy nào được cài root CA của bạn mới tin.
- Use case: **mTLS** giữa các microservice (hai phía cùng xuất trình certificate để xác thực lẫn nhau), thiết bị IoT, dịch vụ nội bộ không có tên miền công khai.
- Certificate do Private CA cấp **export được** kèm private key, nên cài được lên EC2, container, server on-prem.
- Cost (us-east-1): ~**$400 / CA / tháng** ở chế độ thường (~$50 ở chế độ short-lived certificate), cộng tiền từng certificate, ~$0.75 mỗi cái cho 1.000 cái đầu trong tháng.

```
1 Private CA + 200 certificate/tháng = $400 + 200 × $0.75 = $550/tháng
```

### 7.3 Import certificate
- Certificate mua từ CA bên ngoài (DigiCert, GoDaddy) → import vào ACM (kèm private key) để gắn lên ALB/CloudFront.
- AWS **không renew giúp**; bạn tự mua bản mới và re-import trước khi hết hạn. Nên đặt cảnh báo: ACM phát event sắp hết hạn qua EventBridge, và AWS Config có rule kiểm certificate sắp hết hạn.

### 7.4 Cert nằm ở Region nào — bẫy `us-east-1`

ACM là dịch vụ **theo Region**. Cert import/issue ở Region nào thì chỉ resource ở Region đó thấy được. Hai luật phải thuộc lòng:

| Resource dùng cert | Cert phải nằm ở đâu |
|--------------------|---------------------|
| **CloudFront** (alternate domain name / custom SSL) | **BẮT BUỘC `us-east-1`** (N. Virginia) — bất kể origin ở Region nào |
| **ALB / NLB** | **Cùng Region với load balancer** |
| **API Gateway — edge-optimized** | **`us-east-1`** (vì thực chất chạy trên CloudFront distribution do AWS quản) |
| **API Gateway — regional / private** | Cùng Region với API |
| **AWS Global Accelerator** | **Không dùng cert.** Listener của GA chỉ có TCP/UDP, không terminate TLS — cert nằm ở endpoint phía sau (ALB/NLB), đúng Region của endpoint đó |

> Bẫy thi kinh điển: team issue cert ACM ở `ap-southeast-1`, gắn vào CloudFront → **cert không xuất hiện trong dropdown**. Nguyên nhân không phải validation sai, mà là sai Region. Cách xử lý: **request lại cert (miễn phí) ở `us-east-1`** — ACM public cert không copy/move giữa Region được vì không export được private key. Cùng một domain có thể có nhiều cert ở nhiều Region, hoàn toàn hợp lệ.

### 7.5 TLS termination — terminate ở đâu, re-encrypt hay không

"Encryption in transit" trong đề thường không chỉ là "bật HTTPS", mà là **kết thúc TLS ở tầng nào** và **đoạn sau đó có còn mã hoá không**.

| Mô hình | TLS kết thúc ở | Đoạn LB → target | Cert nằm ở | Khi nào chọn |
|---------|----------------|------------------|-----------|--------------|
| **ALB HTTPS listener → HTTP target** | ALB | **Plaintext** trong VPC | ACM (cùng Region ALB) | Mặc định, đơn giản, offload CPU khỏi EC2. Đủ khi không có yêu cầu compliance end-to-end |
| **ALB HTTPS listener → HTTPS target** (re-encrypt) | ALB, rồi **mã hoá lại** tới target | **Encrypted** | ACM ở ALB + cert trên EC2/ECS task (self-signed **được chấp nhận**) | Đề nói "**end-to-end encryption**", "traffic phải mã hoá **kể cả bên trong VPC**", HIPAA/PCI |
| **NLB TLS listener** | NLB (TLS offload ở L4) | Plaintext hoặc TLS tuỳ target group protocol | ACM (cùng Region NLB) | Cần offload TLS nhưng giữ hiệu năng L4; cần **static IP** |
| **NLB TCP listener (passthrough)** | **Trên chính EC2/target** | **Encrypted suốt**, LB không giải mã | **Trên instance** — ACM **không** dùng được ở đây | Đề nói "LB **không được** giải mã traffic", "cert phải do app kiểm soát", mTLS tự triển khai ở app |
| **CloudFront → origin HTTPS** | CloudFront (viewer side), re-encrypt tới origin | Encrypted | Viewer cert ở **us-east-1**; origin cert do origin sở hữu (ALB dùng ACM Region của ALB) | Mọi kiến trúc CDN có yêu cầu mã hoá tới origin. Set *Origin Protocol Policy* = HTTPS Only |

Điểm bẫy quan trọng của re-encrypt trên ALB: ALB **không verify** cert của target (không kiểm CA, không kiểm hostname) → cert **self-signed hoặc hết hạn trên EC2 vẫn hoạt động**. Vì thế "end-to-end encryption" với ALB không đòi bạn phải mua cert public cho từng instance.

Khi bắt buộc **traffic không được ai giải mã giữa đường** (LB chỉ được forward byte): dùng **NLB TCP passthrough**, và lúc đó **không dùng được ACM public cert** (không export private key ra EC2 được) → phải dùng cert import lên instance, hoặc cert từ **ACM Private CA** (loại này export được).

**SNI — nhiều cert trên một listener**: ALB/NLB hỗ trợ **SNI**, cho phép gắn **nhiều cert** lên **một HTTPS/TLS listener** để phục vụ nhiều domain trên cùng IP/port. Một cert là **default certificate** (trả về cho client cũ không gửi SNI), phần còn lại chọn theo hostname client gửi. Đây là đáp án cho "host nhiều domain HTTPS mà **không muốn tạo thêm ALB / thêm IP**".

> Bẫy: cert **wildcard** `*.example.com` **không** phủ `example.com` trần, và **không** phủ `a.b.example.com` (chỉ một cấp). Đề mô tả "apex domain vẫn báo lỗi cert" → thêm cả `example.com` vào SAN của cert.

> Bẫy: "cần cert TLS cho **web server chạy on-prem**" → ACM public cert **không export được** → đáp án là **ACM Private CA** (cert export được, dùng cho internal/mTLS) hoặc mua cert bên ngoài. Xem lại §7.1–7.2.

---

## 8. S3 Object Lock — chống xoá, chống ransomware

Encryption chống **đọc trộm**. Object Lock chống **xoá/ghi đè** — kể cả bởi chính admin có quyền cao. Đây là cơ chế **WORM (Write Once Read Many)** của S3, là đáp án chuẩn cho đề nói "immutable", "cannot be deleted even by root", "WORM", "SEC 17a-4", "ransomware".

**Điều kiện bắt buộc**: bucket phải **bật Versioning**. Đề thi và tài liệu cũ ghi Object Lock chỉ bật được **lúc tạo bucket** (bật sau phải mở ticket AWS Support); docs hiện tại cho phép **bật trên bucket có sẵn** ngay trong console/API, miễn là bucket đã bật Versioning. Khi Object Lock đã bật thì **không tắt được nữa**, và versioning cũng **không suspend được nữa**.

Object Lock có **2 cơ chế độc lập, dùng chung hoặc riêng**: *retention period* và *legal hold*.

### 8.1 Retention mode — Governance vs Compliance

| Tiêu chí | **Governance mode** | **Compliance mode** |
|----------|---------------------|---------------------|
| Ai được rút ngắn/gỡ retention | User có quyền `s3:BypassGovernanceRetention` (kèm header `x-amz-bypass-governance-retention:true`) | **Không ai** — kể cả **root account** của chính AWS account đó |
| Xoá object version trong hạn | Được, nếu có quyền bypass | **Không**, tuyệt đối |
| Rút ngắn retention period | Được (có bypass) | **Không** — chỉ **kéo dài** được |
| Khi nào chọn | Bảo vệ khỏi **xoá nhầm**, vẫn muốn đội security có đường lùi; môi trường test compliance trước khi làm thật | **Compliance pháp lý thật sự**, chống insider threat / ransomware có credential admin |
| Bẫy | Đề nói "even the root user cannot delete" → **KHÔNG** phải Governance | Đặt nhầm retention 10 năm = **trả phí lưu trữ 10 năm** và không có cách nào gỡ trong account. AWS ghi rõ: **đóng AWS account là cách DUY NHẤT** xoá được object compliance-mode trước hạn |

- Retention đặt **per object version**, tính bằng `Retain Until Date`. Có thể đặt **default retention ở cấp bucket** (ví dụ 90 ngày) để mọi object mới tự kế thừa.
- Hết hạn retention → object trở lại bình thường, xoá được; muốn tự dọn thì kết hợp **lifecycle expiration**.

### 8.2 Legal hold

- Là cờ **bật/tắt**, **không có thời hạn** — giữ object cho tới khi ai đó có quyền `s3:PutObjectLegalHold` tắt đi.
- **Độc lập với retention**: object đã hết retention nhưng còn legal hold → vẫn không xoá được; và ngược lại.
- Use case điển hình: **litigation hold** — đang kiện tụng/điều tra, phải giữ bằng chứng nhưng chưa biết giữ tới bao giờ.

### 8.3 Dùng Object Lock chống ransomware

Kịch bản tấn công thật: attacker lấy được credential admin → xoá sạch backup trong S3 → đòi tiền chuộc. Lớp phòng thủ xếp chồng:

1. **Versioning** — ghi đè không mất bản cũ (nhưng vẫn **xoá version được** nếu có quyền → chưa đủ).
2. **Object Lock Compliance mode** + retention ≥ RPO/RTO yêu cầu — version trong hạn **không ai xoá được**, kể cả root.
3. **MFA Delete** — thêm rào cho thao tác xoá version / tắt versioning (chỉ root bucket owner bật được, phải dùng CLI).
4. **CRR sang account/Region khác** — attacker chiếm 1 account vẫn không chạm tới bản sao ở account kia.

> So sánh nhanh nhóm "chống xoá" hay bị lẫn: **Versioning** = giữ bản cũ; **MFA Delete** = thêm bước xác thực khi xoá; **Object Lock** = **cấm xoá** theo thời hạn; **S3 Glacier Vault Lock** = WORM cho **Vault kiểu Glacier cũ**, policy khoá vĩnh viễn sau khi lock. Đề mô tả "S3 bucket + immutable" → Object Lock, không phải Vault Lock.

> Bẫy thi: "bật Object Lock cho bucket **đang chạy**" → theo đề thi và tài liệu cũ, Object Lock chỉ bật được lúc tạo bucket, nên đáp án kiến trúc thường là **tạo bucket mới có Object Lock rồi copy/replicate dữ liệu sang**. Thực tế hiện nay bật được trên bucket có sẵn (cần Versioning), nhưng lưu ý: bật Object Lock **không tự khoá** các object đã có — phải đặt retention/legal hold cho chúng (ví dụ bằng S3 Batch Operations), default retention của bucket chỉ áp cho object mới.

---

## 9. Macie — discover sensitive data

**Bài toán.** Bạn có vài trăm bucket với hàng trăm triệu object tích lại qua nhiều năm. Câu hỏi của kiểm toán: *"dữ liệu cá nhân của khách hàng đang nằm ở những bucket nào?"* Không ai mở từng file ra xem được. Macie làm việc đó.

**Nó làm hai việc khác nhau:**

1. **Kiểm kê bucket** (chạy liên tục, tự động sau khi bật): liệt kê mọi bucket và đánh giá cấu hình bảo mật — bucket nào **public**, bucket nào **chưa mã hoá**, bucket nào **chia sẻ ra ngoài account/organization**. Phần này chỉ nhìn cấu hình, không đọc nội dung object.
2. **Tìm dữ liệu nhạy cảm** (sensitive data discovery): **mở object ra đọc nội dung** và tìm **PII** (personally identifiable information — thông tin định danh cá nhân) như số an sinh xã hội (SSN), số thẻ tín dụng, họ tên, địa chỉ, số hộ chiếu, cùng credential như AWS secret key. Macie nhận diện bằng machine learning kết hợp **pattern matching**: AWS có sẵn bộ *managed data identifier*, và bạn tự thêm *custom data identifier* bằng regex cho định dạng riêng (mã nhân viên, mã hồ sơ bệnh án…). Chạy theo hai kiểu: *automated discovery* lấy mẫu dần trên toàn bộ bucket, hoặc *discovery job* quét đúng các bucket bạn chỉ định.

**Kết quả** là các **finding** ("bucket X, object Y chứa 1.240 số thẻ tín dụng"). Finding được gửi sang **Security Hub** và **EventBridge**, từ đó nối vào Lambda/SNS để tự xử lý (ví dụ tự gắn tag, tự chặn public). Macie **chỉ phát hiện**; nó không tự mã hoá hay tự xoá gì.

**Pricing** (us-east-1): ~$0.10 / bucket / tháng cho phần kiểm kê, và ~**$1 / GB** dữ liệu được đọc để tìm dữ liệu nhạy cảm.

```
Quét toàn bộ 2 TB (≈ 2.000 GB) bằng discovery job ≈ 2.000 × $1 = $2.000 cho một lượt quét
```

Vì tính theo GB đã đọc, nên giới hạn phạm vi job (theo bucket, prefix, loại file) hoặc dùng automated discovery lấy mẫu thay vì quét hết.

**Use case**: kiểm toán compliance (GDPR, HIPAA, PCI-DSS), phân loại dữ liệu trước khi migrate hoặc mở quyền truy cập.

> Bẫy thi: "phát hiện **PII / dữ liệu nhạy cảm trong S3**" → **Macie**. Đừng lẫn với **GuardDuty** (phát hiện *hành vi* đáng ngờ từ log) và **Inspector** (quét *lỗ hổng phần mềm* trên EC2/container/Lambda). Macie chỉ làm việc với **S3**.

---

## 10. Patterns thực chiến

### 10.1 RDS password rotation
1. RDS dùng KMS encrypt at rest.
2. Secrets Manager lưu password, auto-rotate mỗi 30 ngày qua Lambda.
3. App đọc Secrets Manager mỗi connection (cache 5 phút).
4. Khi rotate: Secrets Manager update RDS password + secret value. App retry → connect bằng pass mới.

### 10.2 Cross-region S3 replication encrypted
1. Source bucket SSE-KMS với key A (region us-east-1).
2. Destination bucket SSE-KMS với key B (region eu-west-1).
3. Source CRR config: encrypt với key B at destination.
4. Replication role có quyền decrypt key A + encrypt key B.

### 10.3 mTLS giữa microservice
1. ACM Private CA issue cert cho mỗi service.
2. Cert nằm trong Secrets Manager hoặc mount qua sidecar (Envoy/AWS App Mesh).
3. Service-to-service traffic encrypt + mutual authentication.

### 10.4 Encrypted everywhere
- S3: SSE-KMS với CMK.
- EBS: encryption default ON.
- RDS: KMS.
- Secrets: Secrets Manager.
- Cert: ACM.
- Audit: CloudTrail KMS event để xem "ai decrypt cái gì".

---

## 11. KMS performance & cost

### 11.1 Quota: KMS chịu được bao nhiêu request

Mọi phép mã hoá đối xứng (`Encrypt`, `Decrypt`, `GenerateDataKey`, `ReEncrypt`…) trong **một account, một Region** dùng **chung một quota** tính theo request/giây. Vượt thì KMS trả `ThrottlingException`, và vì S3/EBS/SQS gọi KMS thay bạn nên lỗi hiện ra dưới dạng request S3 thất bại.

| Region | Quota mặc định theo docs hiện tại |
|--------|-----------------------------------|
| Phần lớn Region | **10.000** request/giây |
| us-east-2, ap-southeast-1 (Singapore), ap-southeast-2, ap-northeast-1, eu-central-1, eu-west-2, eu-south-2 | **20.000** request/giây |
| us-east-1, us-west-2, eu-west-1 | **100.000** request/giây |

> Tài liệu cũ và nhiều đề luyện (kể cả bản trước của bài này) ghi dải **5.500 / 10.000 / 30.000** request/giây. AWS đã nâng mặc định nhiều lần; con số chính xác không phải thứ đề thi hỏi. Thứ cần nhớ: quota **có tồn tại**, **dùng chung cho cả account trong Region** (mọi key, mọi dịch vụ gọi thay bạn), **xin nâng được** qua Service Quotas, và key bất đối xứng chỉ có **1.000** request/giây.

Request của **AWS owned key** không tính vào quota của bạn; AWS managed key và CMK thì có. Với request cross-account, account **gọi** bị tính quota, không phải account chủ key.

### 11.2 Vì sao S3 + SSE-KMS tốn request đến vậy

Không có tối ưu gì thì S3 dùng **một data key riêng cho mỗi object**, nên:

```
1 PutObject SSE-KMS  →  1 request KMS GenerateDataKey
1 GetObject SSE-KMS  →  1 request KMS Decrypt
```

Tính thử một bucket nhận 500 PUT/giây và 1.500 GET/giây:

```
500 + 1.500                       = 2.000 request KMS/giây
                                    → mới 20% quota 10.000, chưa bị throttle
2.000 × 86.400 giây               = 172.800.000 request/ngày
172.800.000 × $0.03 / 10.000      = $518,40/ngày  ≈ $15.552/tháng
```

Chưa chạm quota nhưng hoá đơn đã rất lớn. Và một job phân tích đọc 15.000 object/giây ở Region quota 10.000 sẽ bị throttle ngay, kéo theo mọi ứng dụng khác trong account dùng KMS ở Region đó.

### 11.3 "Cache data key" hoạt động thế nào

Nguyên tắc chung: **đừng xin KMS một data key mới cho mỗi lần mã hoá; xin một lần rồi dùng lại trong một khoảng thời gian.** Mỗi lần dùng lại là một request KMS không phải gọi. Có ba dạng:

**S3 Bucket Keys** (dùng cho SSE-KMS, bật bằng một tuỳ chọn trên bucket, không sửa code). Thay vì gọi KMS cho từng object, S3 xin KMS **một khoá cấp bucket** có thời hạn ngắn và giữ nó trong S3. Khoá này sinh ra data key cho các object mới, nên trong lúc nó còn hạn S3 không cần gọi KMS nữa. AWS công bố mức giảm **tới 99%** chi phí request KMS:

```
$518,40/ngày × (1 − 99%) ≈ $5,18/ngày      (trường hợp tốt nhất)
```

Mức giảm thực tế tuỳ số lượng "người gọi" khác nhau (mỗi role/account lấy bucket key riêng ít nhất một lần). Ba hệ quả phải biết: CloudTrail của KMS sẽ **ít event hơn và ghi ARN của bucket thay vì ARN từng object** (mất độ chi tiết audit theo object); policy nào dùng *encryption context* là ARN object phải sửa thành ARN bucket; và Bucket Key **chỉ áp dụng cho object ghi sau khi bật** — object cũ muốn hưởng phải copy lại. **DSSE-KMS không hỗ trợ** Bucket Keys.

**Data key caching trong AWS Encryption SDK** (dùng khi **code của bạn** tự mã hoá phía client). SDK giữ data key trong bộ nhớ và dùng lại cho nhiều message, theo ngưỡng bạn đặt: tối đa bao nhiêu giây, bao nhiêu message, bao nhiêu byte cho mỗi key. Đánh đổi: một data key bảo vệ nhiều dữ liệu hơn, nên nếu lộ thì lộ nhiều hơn.

**Data key reuse period của SQS/SNS** (§5.6): cùng ý tưởng, dịch vụ dùng lại một data key trong 5 phút mặc định.

### 11.4 Cost optimization

- **Bật S3 Bucket Keys** cho mọi bucket SSE-KMS có lưu lượng lớn. Đây là đáp án mặc định cho "giảm chi phí KMS của S3 mà vẫn giữ SSE-KMS".
- **Gom object nhỏ thành object lớn** trước khi ghi (ví dụ dùng Firehose gom log thành file vài chục MB): số request S3 giảm thì số request KMS giảm theo.
- **SSE-S3** cho bucket không có yêu cầu audit/kiểm soát khoá: không có request KMS nào.
- **AWS managed key hoặc AWS owned key** (miễn phí tiền key) cho trường hợp không cần audit riêng; **CMK** chỉ khi cần điều khiển rotation, audit, key policy, cross-account.
- **Data key caching** trong Encryption SDK cho code tự mã hoá.

**Áp vào bài tập 1** (10 TB log/ngày vào S3, SSE-KMS với CMK, hoá đơn KMS $500/ngày). Tính ngược từ hoá đơn:

```
$500 ÷ $0.03 × 10.000        ≈ 166.700.000 request KMS/ngày  ≈ 1.930 request/giây
10 TB ÷ 166.700.000 object   ≈ 60 KB mỗi object (nếu toàn bộ là PUT)
```

Kết luận rút ra từ phép tính: app đang ghi **hàng trăm triệu object nhỏ** (hoặc có một luồng đọc lại rất nhiều), mỗi object một request KMS. Cần xem trong CloudTrail/Cost Explorer tỉ lệ `GenerateDataKey` so với `Decrypt` để biết PUT hay GET chiếm phần lớn. Đề xuất theo thứ tự: bật **S3 Bucket Keys**; **gom log thành file lớn** (60 KB → 64 MB thì số object giảm khoảng 1.000 lần); và cân nhắc **SSE-S3** nếu log không cần audit theo khoá.

---

## 12. Cạm bẫy đề thi (SAA)

1. **"KMS encrypt 1 GB file trực tiếp"** → **Sai**, 4 KB limit. Dùng envelope.
2. **"AWS managed key có thể custom policy"** → **Sai**, chỉ CMK.
3. **"Bật encryption RDS sau khi tạo"** → **Sai**, phải snapshot → copy encrypt → restore.
4. **"Secrets Manager free"** → **Sai**, $0.40/secret/tháng + API.
5. **"ACM cert export để dùng on-prem server"** → **Sai** theo đề thi: ACM public cert không export được, ACM Private CA mới issue cert export được. (Thực tế từ 6/2025 có loại exportable public certificate trả phí, phải bật lúc request — xem §7.1.)
6. **"Cross-region KMS key tự động"** → **Sai**, cần Multi-region key explicit, hoặc encrypt với key region đích.
7. **"SSE-C: AWS lưu key"** → **Sai**, customer gửi key mỗi request, AWS không lưu.
8. **"CloudHSM cluster 1 node là HA"** → **Sai**, cần ≥2 HSM ở 2 AZ cho HA.
9. **"DynamoDB không encrypted"** → **Sai**, luôn mã hoá at rest, mặc định bằng AWS owned key, không tắt được.

---

## 13. Tóm tắt 1 dòng

> Encrypt at rest **mọi nơi** (KMS hoặc service-default), TLS in transit, secret trong **Secrets Manager/Parameter Store**, cert trong **ACM**. Envelope encryption là pattern cốt lõi của KMS. CMK khi cần rotate/audit control.

---

## 14. Bài tập tự kiểm tra

1. App ghi 10TB log/ngày vào S3, SSE-KMS với CMK. KMS bill $500/ngày. Bạn analyze gì và đề xuất giảm cost?
2. Cross-account: account A có S3 bucket SSE-KMS. Account B user cần read. Cấu hình IAM + KMS thế nào?
3. RDS Postgres production chưa encryption. Sếp yêu cầu encrypt all. Plan migration zero-downtime (hoặc downtime minimum)?
4. Lambda function gọi 3rd-party API cần API key. Best practice lưu key ở đâu, retrieve thế nào?
5. So sánh KMS CMK rotation tự động vs manual rotation. Lúc rotate, data cũ có decrypt được không?
6. Compliance PCI-DSS yêu cầu HSM dedicated. So sánh KMS custom key store vs CloudHSM standalone.

---

## 15. Đọc thêm

- AWS Whitepaper — *AWS KMS Cryptographic Details*, *Logical Separation on AWS*.
- AWS docs — *KMS Developer Guide*, *Secrets Manager User Guide*.
- AWS Builder's Library — *Encryption at rest*.

---

**Bài tiếp theo**: [[ch3-04-detective-controls]] — CloudTrail, Config, GuardDuty, Security Hub, incident response.
